/**
 * OpenCascade in a worker of its own (QA F51): STEP import and export, and the rebuild with the B-rep kernel, without
 * blocking the window. The 23 MB WebAssembly module loads on the first request, not at start-up.
 */
import wasmUrl from 'replicad-opencascadejs/wasm?url';
import { meshesToStep, shapesToStep, stepToMeshes } from '../core/occt/step';
import { occtKernel } from '../core/occt/brep';
import { brepKernel, setBrepKernel } from '../core/features/brepKernel';
import { rebuildDocument } from '../core/features/rebuild';
import type { Document } from '../core/document/types';

export type OcctRequest =
  | { id: number; op: 'import'; bytes: Uint8Array; tolerance?: number }
  | { id: number; op: 'export'; bodies: { name: string; positions: Float32Array }[]; unit: 'mm' | 'cm' | 'm' | 'in' }
  | { id: number; op: 'rebuild'; doc: Document; upTo: number | null }
  | { id: number; op: 'exportDoc'; doc: Document; upTo: number | null; unit: 'mm' | 'cm' | 'm' | 'in' };

/** one body of a B-rep rebuild: the tessellation of the exact solid (only bodies that stayed exact carry it) */
export interface RefinedBody {
  id: string;
  exact: boolean;
  exactVolume?: number;
  positions?: Float32Array;
  normals?: Float32Array;
}

let ready: Promise<typeof import('replicad')> | null = null;
function load() {
  if (!ready) {
    ready = (async () => {
      const init = (await import('replicad-opencascadejs')).default as unknown as (o: { locateFile: () => string }) => Promise<unknown>;
      const OC = await init({ locateFile: () => wasmUrl });
      const replicad = await import('replicad');
      replicad.setOC(OC as never);
      setBrepKernel(occtKernel(OC, replicad));
      return replicad;
    })();
  }
  return ready;
}

const post = (msg: unknown, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);

self.onmessage = async (ev: MessageEvent<OcctRequest>) => {
  const req = ev.data;
  try {
    const replicad = await load();
    if (req.op === 'import') {
      const bodies = await stepToMeshes(replicad, req.bytes, req.tolerance ?? 0.02);
      post({ id: req.id, bodies }, bodies.map((b) => b.positions.buffer));
    } else if (req.op === 'export') {
      const r = await meshesToStep(replicad, req.bodies, req.unit);
      post({ id: req.id, bytes: r.bytes, volumes: r.volumes }, [r.bytes.buffer]);
    } else if (req.op === 'exportDoc') {
      // the part rebuilt with the B-rep kernel: exact bodies go out as their B-rep, the rest as sewn meshes
      const r = rebuildDocument(req.doc, req.upTo);
      try {
        const items = r.bodies.map((b, i) => (r.brep?.[b.id] ? { name: `Body${i + 1}`, shape: r.brep[b.id] } : { name: `Body${i + 1}`, positions: (b.geometry.index ? b.geometry.toNonIndexed() : b.geometry).getAttribute('position').array as Float32Array }));
        const out = await shapesToStep(replicad, items, req.unit);
        post({ id: req.id, bytes: out.bytes, volumes: out.volumes, exact: out.exact }, [out.bytes.buffer]);
      } finally {
        brepKernel()?.release();
      }
    } else {
      const r = rebuildDocument(req.doc, req.upTo);
      brepKernel()?.release();
      const transfer: Transferable[] = [];
      const bodies: RefinedBody[] = r.bodies.map((b) => {
        if (!b.exact) return { id: b.id, exact: false };
        const positions = new Float32Array(b.geometry.getAttribute('position').array);
        const nAttr = b.geometry.getAttribute('normal');
        const normals = nAttr ? new Float32Array(nAttr.array) : undefined;
        transfer.push(positions.buffer);
        if (normals) transfer.push(normals.buffer);
        return { id: b.id, exact: true, exactVolume: b.exactVolume, positions, normals };
      });
      post({ id: req.id, bodies }, transfer);
    }
  } catch (err) {
    post({ id: req.id, error: err instanceof Error ? err.message : String(err) });
  }
};
