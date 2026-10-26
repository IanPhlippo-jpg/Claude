/**
 * OpenCascade in a worker of its own (QA F51): STEP import and export without blocking the window. The 23 MB
 * WebAssembly module loads on the first request, not at start-up.
 */
import wasmUrl from 'replicad-opencascadejs/wasm?url';
import { meshesToStep, stepToMeshes } from '../core/occt/step';

export type OcctRequest =
  | { id: number; op: 'import'; bytes: Uint8Array; tolerance?: number }
  | { id: number; op: 'export'; bodies: { name: string; positions: Float32Array }[]; unit: 'mm' | 'cm' | 'm' | 'in' };

let ready: Promise<typeof import('replicad')> | null = null;
function load() {
  if (!ready) {
    ready = (async () => {
      const init = (await import('replicad-opencascadejs')).default as unknown as (o: { locateFile: () => string }) => Promise<unknown>;
      const OC = await init({ locateFile: () => wasmUrl });
      const replicad = await import('replicad');
      replicad.setOC(OC as never);
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
    } else {
      const r = await meshesToStep(replicad, req.bodies, req.unit);
      post({ id: req.id, bytes: r.bytes, volumes: r.volumes }, [r.bytes.buffer]);
    }
  } catch (err) {
    post({ id: req.id, error: err instanceof Error ? err.message : String(err) });
  }
};
