/**
 * Customer data and prices stay with Ian (docs/36 R9, O3.6): a copy of the model for a laser cutter, a colleague or a
 * public repository leaves out the quotes, the customer, the cost overrides and the series. The recognition overrides
 * and the weld joints (workshop data, no prices) stay. DXF, STEP and the workshop sheets never carry them.
 */
import type { Document } from '../core/document/types';
import type { FabDocData } from './types';

export function withoutCustomerData(doc: Document): Document {
  if (!doc.fab) return doc;
  const { quotes: _q, klant: _k, kosten: _c, reeks: _r, vrij: _v, ...keep } = doc.fab as FabDocData;
  void [_q, _k, _c, _r, _v];
  const fab = Object.keys(keep).length ? keep : undefined;
  const out: Document = { ...doc, ...(fab ? { fab } : {}) };
  if (!fab) delete out.fab;
  if (out.kind === 'assembly' && out.components) out.components = out.components.map((c) => ({ ...c, part: withoutCustomerData(c.part) }));
  return out;
}
