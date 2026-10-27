/**
 * Store slice "bodies": Insert ▸ Features ▸ Delete/Keep Body and Curves ▸ Composite Curve. Part of the zustand store of store.ts, split by subject;
 * store.ts spreads this slice into the one store.
 */
import type { Id } from '../../core/sketch/types';
import { newId } from '../../core/sketch/model';
import type { State, StoreSet, StoreGet } from '../store';

type BodiesKeys = 'deleteBodies' | 'startDeleteBody' | 'startCompositeCurve';

const nextName = (get: StoreGet) => `Body-Delete/Keep${get().doc.features.filter((f) => f.type === 'deleteBody').length + 1}`;

export const bodiesSlice = (set: StoreSet, get: StoreGet): Pick<State, BodiesKeys> => ({
  deleteBodies(ids) {
    const { doc } = get();
    const name = nextName(get);
    get().applyDocument(name, { ...doc, features: [...doc.features, { id: newId('f'), type: 'deleteBody', name, suppressed: false, bodies: ids }] });
  },
  // the Delete/Keep Body Property Panel: Delete Bodies or Keep Bodies, the bodies picked in the tree or the graphics area
  startDeleteBody(ids: Id[] = []) {
    if (!get().rebuild.bodies.length) {
      get().pushMessage('There are no bodies to delete or keep.', 'warn');
      return;
    }
    set({ featureEdit: { featureId: null, draft: { id: newId('f'), type: 'deleteBody', name: nextName(get), suppressed: false, bodies: ids } }, activeSketchId: null, tool: 'select', selection: [], managerTab: 'tree' });
  },
  // Curves ▸ Composite Curve: model edges and sketches joined end to end (the selected sketch is the first entity)
  startCompositeCurve() {
    const { doc, selectedFeatureId } = get();
    const sel = doc.features.find((f) => f.id === selectedFeatureId);
    const sketches = sel?.type === 'sketch' ? [sel.sketchId] : sel?.type === 'sketch3d' ? [sel.id] : [];
    const name = `CompCurve${doc.features.filter((f) => f.type === 'compositeCurve').length + 1}`;
    set({ featureEdit: { featureId: null, draft: { id: newId('f'), type: 'compositeCurve', name, suppressed: false, edges: [], sketches } }, activeSketchId: null, tool: 'select', selection: [], selectedEdges: [], managerTab: 'tree' });
  },
});
