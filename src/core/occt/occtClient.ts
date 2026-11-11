import type { StepBody } from './step';

/** The OpenCascade worker (src/workers/occt.worker.ts), started on first use. */
let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void }>();

function ensure(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../../workers/occt.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent<{ id: number; error?: string }>) => {
      const p = pending.get(ev.data.id);
      if (!p) return;
      pending.delete(ev.data.id);
      if (ev.data.error) p.reject(new Error(ev.data.error));
      else p.resolve(ev.data as never);
    };
    worker.onerror = (ev) => restart(new Error(ev.message || 'the geometry kernel could not start'));
  }
  return worker;
}

/** a kernel call that did not answer in time; the worker is restarted, the mesh result stays (QA F106) */
export class KernelTimeout extends Error {
  constructor(what: string, ms: number) {
    super(`the geometry kernel did not finish the ${what} within ${Math.round(ms / 1000)} s`);
    this.name = 'KernelTimeout';
  }
}

/** a hung WASM call blocks the worker for good: stop it, fail every waiting call and start a new one next time */
function restart(err: Error) {
  for (const p of pending.values()) p.reject(err);
  pending.clear();
  worker?.terminate();
  worker = null;
}

function call<T>(msg: Record<string, unknown>, transfer: Transferable[] = [], ms = 60_000): Promise<T> {
  const w = ensure();
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => { if (pending.has(id)) restart(new KernelTimeout(String(msg.op), ms)); }, ms);
    pending.set(id, { resolve: (v: never) => { clearTimeout(timer); resolve(v); }, reject: (e: Error) => { clearTimeout(timer); reject(e); } });
    w.postMessage({ ...msg, id }, transfer);
  });
}

/** STEP file -> one mesh per solid (mm) */
export async function importStep(bytes: Uint8Array): Promise<StepBody[]> {
  const r = await call<{ bodies: StepBody[] }>({ op: 'import', bytes }, [bytes.buffer], 120_000);
  return r.bodies;
}

/** bodies (triangle positions in mm) -> STEP AP214 bytes and the volume of each exported solid */
export async function exportStep(bodies: { name: string; positions: Float32Array }[], unit: 'mm' | 'cm' | 'm' | 'in'): Promise<{ bytes: Uint8Array; volumes: number[] }> {
  return call({ op: 'export', bodies, unit }, bodies.map((b) => b.positions.buffer), 120_000);
}

/** the rebuild of a part with the B-rep kernel: per body the exact tessellation (bodies that stayed exact) */
export async function refineRebuild(doc: import('../document/types').Document, upTo: number | null): Promise<import('../../workers/occt.worker').RefinedBody[]> {
  const r = await call<{ bodies: import('../../workers/occt.worker').RefinedBody[] }>({ op: 'rebuild', doc, upTo });
  return r.bodies;
}

/** what an IGES export returns: the bytes, per body its volume, how many bodies are exact, the trimmed surfaces */
export interface IgesResult { bytes: Uint8Array; volumes: number[]; exact: number; faces: number; approximated: number }

/** bodies (triangle positions in mm) -> IGES 5.3 trimmed surfaces of their sewn solids (none exact) */
export async function exportIges(bodies: { name: string; positions: Float32Array }[], unit: 'mm' | 'cm' | 'm' | 'in', fileName: string): Promise<IgesResult> {
  return call({ op: 'export', format: 'iges', bodies, unit, fileName }, bodies.map((b) => b.positions.buffer), 120_000);
}

/** a part as IGES 5.3 (trimmed NURBS surfaces), rebuilt with the B-rep kernel as for STEP */
export async function exportIgesDoc(doc: import('../document/types').Document, upTo: number | null, unit: 'mm' | 'cm' | 'm' | 'in', fileName: string): Promise<IgesResult> {
  return call({ op: 'exportDoc', format: 'iges', doc, upTo, unit, fileName }, [], 120_000);
}

/** a part as STEP, rebuilt with the B-rep kernel: exact bodies keep their true surfaces (exact = how many) */
export async function exportStepDoc(doc: import('../document/types').Document, upTo: number | null, unit: 'mm' | 'cm' | 'm' | 'in'): Promise<{ bytes: Uint8Array; volumes: number[]; exact: number }> {
  return call({ op: 'exportDoc', doc, upTo, unit }, [], 120_000);
}
