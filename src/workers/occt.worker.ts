/**
 * OpenCascade in a worker of its own (QA F51): STEP import and export, IGES export, and the B-rep rebuild, without
 * blocking the window. The 23 MB WebAssembly module loads on the first request, not at start-up.
 */
import { displayOf } from '../core/features/edges';
import wasmUrl from 'replicad-opencascadejs/wasm?url';
import { meshesToStep, shapesToStep, stepItems, stepToMeshes } from '../core/occt/step';
import { shapesToIges } from '../core/occt/iges';
import { occtKernel } from '../core/occt/brep';
import { brepKernel, PRINT_ANGULAR_TOLERANCE, setBrepKernel } from '../core/features/brepKernel';
import { rebuildDocument, setRebuildBudget } from '../core/features/rebuild';
import { isFatalKernelError } from '../core/occt/kernelPolicy';
import type { Document } from '../core/document/types';

/** the exchange formats written here: STEP AP214 through OpenCascade, IGES 5.3 by src/core/occt/iges.ts */
export type ExchangeFormat = 'step' | 'iges';

export type OcctRequest =
  | { id: number; op: 'import'; bytes: Uint8Array; tolerance?: number }
  | { id: number; op: 'export'; bodies: { name: string; positions: Float32Array }[]; unit: 'mm' | 'cm' | 'm' | 'in'; format?: ExchangeFormat; fileName?: string }
  | { id: number; op: 'rebuild'; doc: Document; upTo: number | null; budgetMs?: number }
  | { id: number; op: 'exportDoc'; doc: Document; upTo: number | null; unit: 'mm' | 'cm' | 'm' | 'in'; format?: ExchangeFormat; fileName?: string }
  | { id: number; op: 'printMesh'; doc: Document };

/** one body of a B-rep rebuild: the tessellation of the exact solid (only bodies that stayed exact carry it) */
export interface RefinedBody {
  id: string;
  exact: boolean;
  exactVolume?: number;
  positions?: Float32Array;
  normals?: Float32Array;
  /** what the viewport draws of the exact body, worked out here instead of in the window (QA 0.5.11 F46) */
  display?: { positions: Float32Array; normals: Float32Array; edges: Float32Array; tangentEdges: Float32Array };
  /** the B-rep shape carries a faceted part (a wrapped patch): drawn from the shape, but not called exact; the warning */
  approximate?: { featureId: string; warning: string };
}

let ready: Promise<typeof import('replicad')> | null = null;
/** how long loading the module took (ms), sent along with the first answer after it */
let loadMs: number | undefined;
function load() {
  if (!ready) {
    ready = (async () => {
      const t0 = performance.now();
      const init = (await import('replicad-opencascadejs')).default as unknown as (o: { locateFile: () => string }) => Promise<unknown>;
      const OC = await init({ locateFile: () => wasmUrl });
      const replicad = await import('replicad');
      replicad.setOC(OC as never);
      setBrepKernel(occtKernel(OC, replicad));
      loadMs = performance.now() - t0;
      return replicad;
    })();
    // a load that failed is tried again by the next request (not a rejected promise for good)
    ready.catch(() => { ready = null; });
  }
  return ready;
}

const post = (msg: unknown, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);

/** a WASM abort leaves the module dead while `ready` stays resolved: a small shape tells (docs/32 P2-4) */
function alive(replicad: typeof import('replicad')): boolean {
  try {
    replicad.makeBaseBox(1, 1, 1).delete();
    return true;
  } catch {
    return false;
  }
}

// one request at a time, in order: the client starts the clock of a call when it begins here ("started", P3-9)
let chain: Promise<void> = Promise.resolve();
self.onmessage = (ev: MessageEvent<OcctRequest>) => {
  const req = ev.data;
  chain = chain.then(() => handle(req));
};

async function handle(req: OcctRequest) {
  post({ id: req.id, started: true });
  let replicad: typeof import('replicad') | null = null;
  try {
    replicad = await load();
    if (req.op === 'import') {
      const bodies = await stepToMeshes(replicad, req.bytes, req.tolerance ?? 0.02);
      post({ id: req.id, bodies }, bodies.map((b) => b.positions.buffer));
    } else if (req.op === 'export' && req.format === 'iges') {
      const r = await shapesToIges(replicad, req.bodies, req.unit, req.fileName);
      post({ id: req.id, bytes: r.bytes, volumes: r.volumes, exact: r.exact, faces: r.stats.faces, approximated: r.stats.approximatedSurfaces }, [r.bytes.buffer]);
    } else if (req.op === 'export') {
      const r = await meshesToStep(replicad, req.bodies, req.unit);
      post({ id: req.id, bytes: r.bytes, volumes: r.volumes }, [r.bytes.buffer]);
    } else if (req.op === 'printMesh') {
      // the exact bodies tessellated finer for the slicer (the 3D Print tab); the others are null (the mesh body is used)
      try {
        const r = rebuildDocument(req.doc, null);
        const K = brepKernel();
        const bodies = r.bodies.map((b) => {
          const shape = r.brep?.[b.id];
          if (!b.exact || !shape || !K) return { id: b.id, positions: null };
          const g = K.tessellate(shape, PRINT_ANGULAR_TOLERANCE);
          return { id: b.id, positions: new Float32Array(g.getAttribute('position').array) };
        });
        post({ id: req.id, bodies }, bodies.flatMap((b) => (b.positions ? [b.positions.buffer] : [])));
      } finally {
        brepKernel()?.release();
      }
    } else if (req.op === 'exportDoc') {
      // the part rebuilt with the B-rep kernel: exact bodies go out as their B-rep, the rest as sewn meshes
      try {
        const r = rebuildDocument(req.doc, req.upTo);
        if (req.format === 'iges') {
          const out = await shapesToIges(replicad, stepItems(r), req.unit, req.fileName);
          post({ id: req.id, bytes: out.bytes, volumes: out.volumes, exact: out.exact, faces: out.stats.faces, approximated: out.stats.approximatedSurfaces }, [out.bytes.buffer]);
        } else {
          const out = await shapesToStep(replicad, stepItems(r), req.unit);
          post({ id: req.id, bytes: out.bytes, volumes: out.volumes, exact: out.exact }, [out.bytes.buffer]);
        }
      } finally {
        brepKernel()?.release();
      }
    } else {
      // the rebuild budget of the window goes along: the B-rep rebuild stops where the mesh rebuild stops (P2-4)
      if (req.budgetMs !== undefined) setRebuildBudget(req.budgetMs);
      const t0 = performance.now();
      let r: ReturnType<typeof rebuildDocument>;
      try {
        r = rebuildDocument(req.doc, req.upTo);
      } finally {
        // the OCCT objects of this rebuild are freed even when it throws (P3-4)
        brepKernel()?.release();
      }
      const ms = performance.now() - t0;
      const transfer: Transferable[] = [];
      const bodies: RefinedBody[] = r.bodies.map((b) => {
        // a body whose B-rep carries a faceted part is sent too (its shape is closer than the mesh kernel's), not exact
        const shape = r.brep?.[b.id];
        const hit = b.exact ? undefined : Object.entries(r.warnings ?? {}).find(([fid, w]) => b.featureIds.includes(fid) && /made of flat facets/.test(w));
        const note = hit ? { featureId: hit[0], warning: hit[1] } : undefined;
        if (!b.exact && !(shape && note)) return { id: b.id, exact: false };
        const positions = new Float32Array(b.geometry.getAttribute('position').array);
        const nAttr = b.geometry.getAttribute('normal');
        const normals = nAttr ? new Float32Array(nAttr.array) : undefined;
        transfer.push(positions.buffer);
        if (normals) transfer.push(normals.buffer);
        const d = displayOf(b.geometry);
        const arr = (g: import('three').BufferGeometry, name: string) => new Float32Array(g.getAttribute(name).array);
        const display = { positions: arr(d.geometry, 'position'), normals: arr(d.geometry, 'normal'), edges: arr(d.edges, 'position'), tangentEdges: arr(d.tangentEdges, 'position') };
        transfer.push(display.positions.buffer, display.normals.buffer, display.edges.buffer, display.tangentEdges.buffer);
        return { id: b.id, exact: !!b.exact, exactVolume: b.exactVolume, positions, normals, display, approximate: note };
      });
      post({ id: req.id, bodies, stopped: !!r.stopped, ms, loadMs: took() }, transfer);
    }
  } catch (err) {
    post({ id: req.id, error: err instanceof Error ? err.message : String(err), fatal: isFatalKernelError(err), loadMs: took() });
    return;
  }
  if (replicad && !alive(replicad)) post({ dead: true });
}

/** the load time, once */
function took(): number | undefined {
  const t = loadMs;
  loadMs = undefined;
  return t;
}
