import { fromWire, solveSketch, type SolveOptions, type SolveResult, type SolveResultWire } from './solver';
import type { Sketch } from '../sketch/types';

/**
 * Runs small solves synchronously (interactive dragging) and larger ones in a
 * web worker so the UI thread stays responsive.
 */
export class SolverClient {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, { resolve: (r: SolveResult) => void; reject: (e: Error) => void }>();
  /** parameter count above which a worker is used */
  workerThreshold = 300;

  private ensureWorker(): Worker | null {
    if (typeof Worker === 'undefined') return null;
    if (!this.worker) {
      this.worker = new Worker(new URL('../../workers/solver.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (ev: MessageEvent<{ id: number; result?: SolveResultWire; error?: string }>) => {
        const p = this.pending.get(ev.data.id);
        if (!p) return;
        this.pending.delete(ev.data.id);
        if (ev.data.error) p.reject(new Error(ev.data.error));
        else if (ev.data.result) p.resolve(fromWire(ev.data.result));
      };
    }
    return this.worker;
  }

  solveSync(sketch: Sketch, opts?: SolveOptions): SolveResult {
    return solveSketch(sketch, opts);
  }

  async solve(sketch: Sketch, opts?: SolveOptions): Promise<SolveResult> {
    const n = Object.keys(sketch.points).length * 2 + Object.keys(sketch.scalars).length;
    const w = n >= this.workerThreshold ? this.ensureWorker() : null;
    if (!w) return this.solveSync(sketch, opts);
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      w.postMessage({ id, sketch, opts });
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
