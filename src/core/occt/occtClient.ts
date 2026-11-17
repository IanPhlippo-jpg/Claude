import type { StepBody } from './step';
import { kernelLimitMs, refineWorkMs, shouldCancelStale, startLimitMs } from './kernelPolicy';

/**
 * The OpenCascade worker (src/workers/occt.worker.ts), started on first use. It works through its requests one at a
 * time and says when it begins one ("started"): the clock of a call runs from there, not while it waits behind another
 * (docs/32 P3-9).
 */
let worker: Worker | null = null;
let seq = 0;
/** the worker has answered a call: its module is loaded (the next limits leave the load out) */
let loaded = false;
/** how long the last load of the module took in the worker (ms): what stopping a stale rebuild costs */
let lastLoadMs = 3_000;
/** the call the worker is working on, and since when */
let running: { id: number; since: number } | null = null;

interface Pending {
  op: string;
  workMs: number;
  resolve: (v: never) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
}
const pending = new Map<number, Pending>();
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

interface Reply { id?: number; started?: boolean; error?: string; fatal?: boolean; dead?: boolean; loadMs?: number }

function ensure(): Worker {
  if (!worker) {
    worker = new Worker(new URL('../../workers/occt.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (ev: MessageEvent<Reply>) => onReply(ev.data);
    worker.onerror = (ev) => restart(new KernelFailed(ev.message || 'the geometry kernel could not start'));
    worker.onmessageerror = () => restart(new KernelFailed('a result of the geometry kernel could not be read'));
  }
  return worker;
}

function onReply(d: Reply) {
  // the module died after the call (a WASM abort): the answers so far stand, everything after needs a new worker
  if (d.dead) { restart(new KernelFailed('the geometry kernel stopped (out of memory?) and is restarted')); return; }
  const p = d.id === undefined ? undefined : pending.get(d.id);
  if (!p || d.id === undefined) return;
  if (d.started) {
    running = { id: d.id, since: now() };
    arm(d.id, p, kernelLimitMs(p.workMs, loaded));
    return;
  }
  pending.delete(d.id);
  if (running?.id === d.id) running = null;
  if (d.loadMs !== undefined) lastLoadMs = d.loadMs;
  if (d.error === undefined || !d.fatal) loaded = true;
  if (d.error !== undefined) {
    p.reject(new KernelFailed(d.error));
    if (d.fatal) restart(new KernelFailed(d.error));
  } else p.resolve(d as never);
}

function arm(id: number, p: Pending, ms: number) {
  if (p.timer) clearTimeout(p.timer);
  p.timer = setTimeout(() => { if (pending.has(id)) restart(new KernelTimeout(p.op, ms)); }, ms);
}

/** a kernel call that did not answer in time; the worker is restarted, the mesh result stays (QA F106) */
export class KernelTimeout extends Error {
  constructor(what: string, ms: number) {
    super(`the geometry kernel did not finish the ${what} within ${Math.round(ms / 1000)} s`);
    this.name = 'KernelTimeout';
  }
}

/** a kernel call that failed: an error in the kernel, or a worker that died (the next call starts a new one) */
export class KernelFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KernelFailed';
  }
}

/** an exact rebuild stopped because a newer one replaced it (not an error to show) */
export class KernelCancelled extends Error {
  constructor() {
    super('superseded by a newer exact rebuild');
    this.name = 'KernelCancelled';
  }
}

/** a hung WASM call blocks the worker for good: stop it, fail every waiting call and start a new one next time */
function restart(err: Error) {
  const waiting = [...pending.values()];
  pending.clear();
  for (const p of waiting) {
    if (p.timer) clearTimeout(p.timer);
    p.reject(err);
  }
  worker?.terminate();
  worker = null;
  running = null;
  loaded = false;
}

function call<T>(msg: Record<string, unknown>, transfer: Transferable[] = [], workMs = 60_000): Promise<T> {
  const w = ensure();
  const id = ++seq;
  const ahead = [...pending.values()].map((p) => kernelLimitMs(p.workMs, loaded));
  return new Promise<T>((resolve, reject) => {
    const p: Pending = {
      op: String(msg.op),
      workMs,
      timer: null,
      resolve: (v: never) => { if (p.timer) clearTimeout(p.timer); resolve(v); },
      reject: (e: Error) => { if (p.timer) clearTimeout(p.timer); reject(e); },
    };
    pending.set(id, p);
    // until the worker begins it, a call only waits for the calls ahead of it (a worker that never starts is caught)
    arm(id, p, startLimitMs(ahead));
    w.postMessage({ ...msg, id }, transfer);
  });
}

/**
 * A newer exact rebuild is wanted: stop the running one when that is cheaper than letting it finish (docs/32 P2-4).
 * Only when every waiting call is an exact rebuild (an export or import is never thrown away). Returns whether it did.
 */
export function cancelStaleRebuild(expectedMs?: number): boolean {
  if (!pending.size || [...pending.values()].some((p) => p.op !== 'rebuild')) return false;
  const elapsed = running ? now() - running.since : 0;
  if (!running || !shouldCancelStale(elapsed, expectedMs, lastLoadMs)) return false;
  restart(new KernelCancelled());
  return true;
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

/** what an exact rebuild returns: per body the exact tessellation, whether the budget stopped it, how long it took */
export interface RefineResult { bodies: import('../../workers/occt.worker').RefinedBody[]; stopped: boolean; ms: number }

/**
 * The rebuild of a part with the B-rep kernel: per body the exact tessellation (bodies that stayed exact). The rebuild
 * budget goes along: the worker stops there as the mesh rebuild does, and says so (stopped).
 */
export async function refineRebuild(doc: import('../document/types').Document, upTo: number | null, budgetMs = 45_000): Promise<RefineResult> {
  const r = await call<Partial<RefineResult>>({ op: 'rebuild', doc, upTo, budgetMs }, [], refineWorkMs(budgetMs));
  return { bodies: r.bodies ?? [], stopped: !!r.stopped, ms: r.ms ?? 0 };
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
