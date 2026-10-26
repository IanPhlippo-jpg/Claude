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
    worker.onerror = (ev) => {
      for (const p of pending.values()) p.reject(new Error(ev.message || 'the geometry kernel could not start'));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  return worker;
}

function call<T>(msg: Record<string, unknown>, transfer: Transferable[] = []): Promise<T> {
  const w = ensure();
  const id = ++seq;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (v: never) => void, reject });
    w.postMessage({ ...msg, id }, transfer);
  });
}

/** STEP file -> one mesh per solid (mm) */
export async function importStep(bytes: Uint8Array): Promise<StepBody[]> {
  const r = await call<{ bodies: StepBody[] }>({ op: 'import', bytes }, [bytes.buffer]);
  return r.bodies;
}

/** bodies (triangle positions in mm) -> STEP AP214 bytes and the volume of each exported solid */
export async function exportStep(bodies: { name: string; positions: Float32Array }[], unit: 'mm' | 'cm' | 'm' | 'in'): Promise<{ bytes: Uint8Array; volumes: number[] }> {
  return call({ op: 'export', bodies, unit }, bodies.map((b) => b.positions.buffer));
}
