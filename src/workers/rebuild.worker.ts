/**
 * The mesh-kernel rebuild of a part in a worker of its own (QA F46): heavy booleans, patterns and fillets no longer
 * freeze the window. The store sends the document, the result comes back packed (rebuildWire). An assembly sends the
 * parts it has no rebuild of yet (`docs`), and gets one result per part back.
 */
import { rebuildDocument, setRebuildBudget, type RebuildResult } from '../core/features/rebuild';
import { packRebuild } from '../core/features/rebuildWire';
import { displayOf } from '../core/features/edges';
import type { Document } from '../core/document/types';

export interface RebuildRequest { id: number; doc?: Document; docs?: Document[]; upTo: number | null; budgetMs: number }

const post = (msg: unknown, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);

function build(doc: Document, upTo: number | null): { r: RebuildResult; ms: number } {
  const t0 = performance.now();
  const r = rebuildDocument(doc, upTo);
  const ms = performance.now() - t0;
  // the smoothed geometry and the edges the viewport draws, here instead of in the window (QA 0.5.11 F46)
  for (const b of r.bodies) b.display = displayOf(b.geometry);
  return { r, ms };
}

self.onmessage = (ev: MessageEvent<RebuildRequest>) => {
  const req = ev.data;
  try {
    setRebuildBudget(req.budgetMs);
    if (req.docs) {
      const results: unknown[] = [], transfer: Transferable[] = [];
      let ms = 0;
      for (const d of req.docs) {
        const one = build(d, null);
        ms += one.ms;
        const packed = packRebuild(one.r);
        results.push(packed.wire);
        transfer.push(...packed.transfer);
      }
      post({ id: req.id, results, ms }, transfer);
      return;
    }
    const { r, ms } = build(req.doc!, req.upTo);
    const { wire, transfer } = packRebuild(r);
    post({ id: req.id, result: wire, ms }, transfer);
  } catch (err) {
    post({ id: req.id, error: err instanceof Error ? err.message : String(err) });
  }
};

// the module is loaded: the client counts this worker as warm (a spare that can take over at once, docs/32 P2-10)
post({ ready: true });
