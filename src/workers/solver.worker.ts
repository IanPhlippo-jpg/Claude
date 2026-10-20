import { solveSketch, toWire, type SolveOptions } from '../core/solver/solver';
import type { Sketch } from '../core/sketch/types';

export interface SolveRequest {
  id: number;
  sketch: Sketch;
  opts?: SolveOptions;
}

self.onmessage = (ev: MessageEvent<SolveRequest>) => {
  const { id, sketch, opts } = ev.data;
  try {
    const result = solveSketch(sketch, opts);
    (self as unknown as Worker).postMessage({ id, result: toWire(result) });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
