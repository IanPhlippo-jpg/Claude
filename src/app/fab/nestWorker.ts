// The Nest command off the main thread (docs/36 P3.6): the window stays responsive and Cancel Nesting stops the worker.
import { nestAll, type NestSettings } from '../../fab/nest';
import type { FlatPart } from '../../fab/flat';

self.onmessage = (e: MessageEvent<{ id: number; flats: FlatPart[]; settings: NestSettings | null }>) => {
  const { id, flats, settings } = e.data;
  try {
    (self as unknown as Worker).postMessage({ id, nests: nestAll(flats, settings) });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id, error: (err as Error).message });
  }
};
