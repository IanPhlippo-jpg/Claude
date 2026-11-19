/**
 * The slicer in a worker of its own (docs/34 2.1, 6.3; not the rebuild worker): the window stays responsive. Progress
 * goes back as messages; cancelling terminates the worker (the client starts a new one for the next slice). FDM jobs
 * give G-code, resin jobs (`resin: true`) the encoded pixel masks of the layers.
 */
import { runSlice, type SliceJob } from '../print/run';
import { runResinSlice, type ResinJob } from '../print/resin/slice';

const post = (msg: unknown, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);

self.onmessage = async (ev: MessageEvent<{ id: number; job: SliceJob } | { id: number; job: ResinJob; resin: true }>) => {
  const { id } = ev.data;
  const progress = (stage: string, fraction: number) => post({ id, progress: { stage, fraction } });
  try {
    if ('resin' in ev.data) {
      const out = runResinSlice(ev.data.job, progress);
      post({ id, result: out }, [...out.layers.map((l) => l.data.buffer), out.small.buffer, out.big.buffer, out.supports.buffer]);
      return;
    }
    const out = await runSlice(ev.data.job, progress);
    const transfer: Transferable[] = [...out.gcode.map((c) => c.buffer), out.preview.segs.buffer, out.mesh.positions.buffer, out.mesh.normals.buffer, out.mesh.index.buffer,
      out.plateImage.buffer, out.plateSmall.buffer];
    post({ id, result: out }, transfer);
  } catch (err) {
    post({ id, error: (err as Error).message });
  }
};
