/**
 * The mesh-kernel rebuild of a part in a worker of its own (QA F46): heavy booleans, patterns and fillets no longer
 * freeze the window. The store sends the document, the result comes back packed (rebuildWire).
 */
import { rebuildDocument, setRebuildBudget } from '../core/features/rebuild';
import { packRebuild } from '../core/features/rebuildWire';
import { displayOf } from '../core/features/edges';
import type { Document } from '../core/document/types';

export interface RebuildRequest { id: number; doc: Document; upTo: number | null; budgetMs: number }

self.onmessage = (ev: MessageEvent<RebuildRequest>) => {
  const req = ev.data;
  try {
    setRebuildBudget(req.budgetMs);
    const t0 = performance.now();
    const r = rebuildDocument(req.doc, req.upTo);
    const ms = performance.now() - t0;
    // the smoothed geometry and the edges the viewport draws, here instead of in the window (QA 0.5.11 F46)
    for (const b of r.bodies) b.display = displayOf(b.geometry);
    const { wire, transfer } = packRebuild(r);
    (self as unknown as Worker).postMessage({ id: req.id, result: wire, ms }, transfer);
  } catch (err) {
    (self as unknown as Worker).postMessage({ id: req.id, error: err instanceof Error ? err.message : String(err) });
  }
};
