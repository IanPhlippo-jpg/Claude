/**
 * The window side of the slice worker: one slice at a time, progress callbacks, cancel within a frame (the worker is
 * terminated and replaced; docs/34 E12: cancel under 200 ms).
 */
import type { SliceJob, SliceOutput } from '../../print/run';
import type { ResinJob, ResinOutput } from '../../print/resin/slice';
import type { PlateMesh, SliceProgress } from '../../print/types';

let worker: Worker | null = null;
let seq = 0;
let pending: { id: number; reject: (e: Error) => void } | null = null;

const spawn = () => new Worker(new URL('../../workers/slice.worker.ts', import.meta.url), { type: 'module' });

export function cancelSlice(): boolean {
  if (!pending) return false;
  worker?.terminate();
  worker = null;
  pending.reject(new Error('Slicing was cancelled.'));
  pending = null;
  return true;
}

function inWorker<T>(job: { meshes: PlateMesh[] }, extra: Record<string, unknown>, onProgress: (p: SliceProgress) => void): Promise<T> {
  cancelSlice();
  if (!worker) worker = spawn();
  const id = ++seq;
  const w = worker;
  return new Promise<T>((resolve, reject) => {
    pending = { id, reject };
    w.onmessage = (ev: MessageEvent<{ id: number; progress?: SliceProgress; result?: T; error?: string }>) => {
      const m = ev.data;
      if (m.id !== id) return;
      if (m.progress) { onProgress(m.progress); return; }
      pending = null;
      if (m.error) reject(new Error(m.error)); else resolve(m.result!);
    };
    w.onerror = (e) => { pending = null; worker = null; reject(new Error(e.message || 'The slicer stopped.')); };
    const transfer = job.meshes.map((m) => m.positions.slice().buffer);
    w.postMessage({ id, ...extra, job: { ...job, meshes: job.meshes.map((m, i) => ({ ...m, positions: new Float32Array(transfer[i]) })) } }, transfer);
  });
}

export const sliceInWorker = (job: SliceJob, onProgress: (p: SliceProgress) => void) => inWorker<SliceOutput>(job, {}, onProgress);
export const sliceResinInWorker = (job: ResinJob, onProgress: (p: SliceProgress) => void) => inWorker<ResinOutput>(job, { resin: true }, onProgress);
