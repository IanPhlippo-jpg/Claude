/**
 * Moving a weld step (docs/36 L3.5) without the rest of the fabrication code (the FeatureManager tree uses it): the
 * joint `id` dropped below the joint `after`; step 1 is tacking, the welds become 2 … in the new order, all confirmed.
 */
import type { WeldJoint } from './types';

export function moveStep(welds: WeldJoint[], id: string, after: string): WeldJoint[] | null {
  const order = [...welds].filter((w) => w.status !== 'vervallen').sort((a, b) => a.stap - b.stap).map((w) => w.id);
  if (!order.includes(id) || !order.includes(after) || id === after) return null;
  const ids = order.filter((x) => x !== id);
  ids.splice(ids.indexOf(after) + 1, 0, id);
  return welds.map((w) => ({ ...w, bevestigd: true, stap: ids.includes(w.id) ? ids.indexOf(w.id) + 2 : w.stap }));
}
