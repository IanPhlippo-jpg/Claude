/**
 * Customer data and prices stay with Ian (docs/36 R9, O3.6, docs/37 B-4): a copy of the model for a laser cutter, a
 * colleague or a public repository leaves out the quotes, the customer, the cost overrides, the free lines and the
 * series, in the document itself and in every part of an assembly (the components first: a part can carry a quote while
 * the assembly carries none). The recognition overrides and the weld joints (workshop data, no prices) stay.
 */
import type { Document } from '../core/document/types';
import type { FabDocData } from './types';

export function withoutCustomerData(doc: Document): Document {
  let out: Document = doc;
  if (doc.components?.length) out = { ...doc, components: doc.components.map((c) => ({ ...c, part: withoutCustomerData(c.part) })) };
  if (!doc.fab) return out;
  const { quotes: _q, klant: _k, kosten: _c, reeks: _r, vrij: _v, regelBtw: _b, ...keep } = doc.fab as FabDocData;
  void [_q, _k, _c, _r, _v, _b];
  out = { ...out, fab: keep };
  if (!Object.keys(keep).length) delete out.fab;
  return out;
}

/** true when the document or one of its parts carries customer data or prices */
export function hasCustomerData(doc: Document): boolean {
  const f = doc.fab;
  if (f && (f.quotes?.length || f.klant || f.kosten || f.vrij?.length || f.regelBtw)) return true;
  return (doc.components ?? []).some((c) => hasCustomerData(c.part));
}
