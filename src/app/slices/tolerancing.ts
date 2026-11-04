/**
 * Store slice "tolerancing" (QA F36): part of the zustand store of store.ts, split by subject. The state and actions are
 * unchanged; store.ts spreads this slice into the one store, so `useStore` and every selector work as before.
 */
import { autoDimensionScheme, faceDistance, GTOL_SYMBOLS, type AutoToleranceData } from '../../core/document/autoTolerance';
import { newId } from '../../core/sketch/model';
import type { State, StoreSet, StoreGet } from '../store';
import { blockTolerances } from '../prefsEffects';

type TolerancingKeys =
  | 'autoToleranceEdit' | 'startAutoTolerance' | 'updateAutoTolerance' | 'cancelAutoTolerance' | 'setAutoToleranceData' | 'deleteAllTolerances'
  | 'commitAutoTolerance';

export const tolerancingSlice = (set: StoreSet, get: StoreGet): Pick<State, TolerancingKeys> => ({
  autoToleranceEdit: null,
  startAutoTolerance(kind) {
    const { rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Product Dimensions need a solid body.', 'warn');
      return;
    }
    const blockMinor = blockTolerances(get().prefs).length2;
    const n = (get().doc.autoTolerance?.datums.length ?? 0);
    set({ autoToleranceEdit: { kind, faces: [], partType: 'prismatic', toleranceType: 'plusMinus', label: String.fromCharCode(65 + Math.min(25, n)), basic: false, plus: blockMinor, minus: blockMinor, symbol: 'position', value: 2 * blockMinor, datums: [] }, featureEdit: null, activeSketchId: null, tool: 'select', selection: [], tab: 'mbd', managerTab: 'autoTolerance', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  updateAutoTolerance(patch) {
    const e = get().autoToleranceEdit;
    if (e) set({ autoToleranceEdit: { ...e, ...patch } });
  },
  cancelAutoTolerance() {
    set({ autoToleranceEdit: null, selectedFace: null, selectedFaces: [] });
  },
  setAutoToleranceData(autoTolerance) {
    get().applyDocument('Product Dimensions', { ...get().doc, autoTolerance });
  },
  deleteAllTolerances() {
    const { doc } = get();
    if (!doc.autoTolerance) return;
    get().applyDocument('Delete All Tolerances', { ...doc, autoTolerance: undefined });
    set({ analysis: get().analysis?.kind === 'tolerance' ? null : get().analysis });
    get().pushMessage('All Auto Tolerancing dimensions and tolerances deleted.', 'info');
  },
  commitAutoTolerance() {
    const e = get().autoToleranceEdit;
    if (!e) return;
    const { doc, rebuild, prefs } = get();
    const block = blockTolerances(prefs);
    const cur: AutoToleranceData = doc.autoTolerance ?? { partType: e.partType ?? 'prismatic', toleranceType: e.toleranceType ?? 'plusMinus', datums: [], dims: [], gtols: [] };
    const id = newId('dx');
    const r2 = (v: number) => Math.round(v * 100) / 100;
    let next: AutoToleranceData;
    if (e.kind === 'auto') {
      next = autoDimensionScheme(rebuild.bodies, { partType: e.partType ?? 'prismatic', toleranceType: e.toleranceType ?? 'plusMinus', block, datums: e.faces.slice(0, 3) });
      if (!next.dims.length && !next.datums.length) return get().pushMessage('No planar faces to dimension.', 'warn');
    } else if (e.kind === 'datum') {
      if (!e.faces.length) return get().pushMessage('Select the datum face.', 'warn');
      const label = (e.label || 'A').toUpperCase();
      next = { ...cur, datums: [...cur.datums.filter((d) => d.label !== label), { id, label, face: e.faces[0] }] };
    } else if (e.kind === 'gtol') {
      if (!e.faces.length) return get().pushMessage('Select the face the tolerance applies to.', 'warn');
      const symbol = e.symbol ?? 'position';
      const value = e.value ?? 2 * block.length2;
      const datums = e.datums ?? [];
      next = { ...cur, gtols: [...cur.gtols, { id, symbol, value, datums, face: e.faces[0], label: `${GTOL_SYMBOLS[symbol]} ${r2(value)}${datums.length ? ' | ' + datums.join(' | ') : ''}` }] };
    } else {
      if (e.faces.length < 2) return get().pushMessage(e.kind === 'size' ? 'Select the two opposite faces.' : 'Select the two faces of the dimension.', 'warn');
      const value = faceDistance(e.faces[0], e.faces[1]);
      if (value < 1e-6) return get().pushMessage('The faces lie in the same plane: pick two faces apart from each other.', 'warn');
      const plus = e.basic ? 0 : e.plus ?? block.length2, minus = e.basic ? 0 : e.minus ?? block.length2;
      const datum = cur.datums.find((d) => Math.hypot(d.face.point[0] - e.faces[0].point[0], d.face.point[1] - e.faces[0].point[1], d.face.point[2] - e.faces[0].point[2]) < 0.5)?.label;
      next = { ...cur, dims: [...cur.dims, { id, kind: e.kind, faces: e.faces.slice(0, 2), value, plus, minus, basic: !!e.basic, label: `${r2(value)}`, datum }] };
    }
    get().applyDocument(e.kind === 'auto' ? 'Auto Dimension Scheme' : 'Product Dimension', { ...doc, autoTolerance: next });
    set({ autoToleranceEdit: null, selectedFace: null, selectedFaces: [], managerTab: 'autoTolerance' });
  },
});
