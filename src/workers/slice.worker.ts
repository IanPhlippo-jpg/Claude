/**
 * The slicer in a worker of its own (docs/34 2.1, 6.3; not the rebuild worker): the window stays responsive. Progress
 * goes back as messages; cancelling terminates the worker (the client starts a new one for the next slice).
 */
import { runSlice, type SliceJob } from '../print/run';

const post = (msg: unknown, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);

self.onmessage = async (ev: MessageEvent<{ id: number; job: SliceJob }>) => {
  const { id, job } = ev.data;
  try {
    const out = await runSlice(job, (stage, fraction) => post({ id, progress: { stage, fraction } }));
    const transfer: Transferable[] = [...out.gcode.map((c) => c.buffer), out.preview.segs.buffer, out.plateImage.buffer, out.plateSmall.buffer];
    post({ id, result: out }, transfer);
  } catch (err) {
    post({ id, error: (err as Error).message });
  }
};
