/**
 * Store slice "weldments" (QA F36): part of the zustand store of store.ts, split by subject. The state and actions are
 * unchanged; store.ts spreads this slice into the one store, so `useStore` and every selector work as before.
 */
import { type StructuralMemberFeature, type TrimExtendFeature, type EndCapFeature, type WeldGussetFeature, type WeldBeadFeature } from '../../core/document/types';
import { newId } from '../../core/sketch/model';
import { addWeldmentConfigurations } from '../../core/document/configurations';
import type { State, StoreSet, StoreGet } from '../store';

type WeldmentsKeys =
  | 'startWeldment' | 'startStructuralMember' | 'startTrimExtend' | 'startEndCap' | 'startWeldGusset' | 'startWeldBead';

export const weldmentsSlice = (set: StoreSet, get: StoreGet): Pick<State, WeldmentsKeys> => ({
  startWeldment() {
    const { doc } = get();
    if (doc.weldment) {
      get().pushMessage('This part is already a frame.', 'info');
      set({ tab: 'weldments' });
      return;
    }
    get().applyDocument('Frame', addWeldmentConfigurations({ ...doc, weldment: true, features: [...doc.features, { id: newId('f'), type: 'weldment', name: 'Frame', suppressed: false }] }));
    set({ tab: 'weldments', managerTab: 'tree' });
  },
  startStructuralMember() {
    const { doc } = get();
    const paths = doc.features.filter((f) => f.type === 'sketch' || f.type === 'sketch3d');
    const sel = doc.features.find((f) => f.id === get().selectedFeatureId && (f.type === 'sketch' || f.type === 'sketch3d'));
    const last = sel ?? paths[paths.length - 1];
    const sketchId = last ? (last.type === 'sketch' ? last.sketchId : last.id) : '';
    const n = doc.features.filter((f) => f.type === 'structuralMember').length + 1;
    const draft: StructuralMemberFeature = { id: newId('f'), type: 'structuralMember', name: `Structural Member${n}`, suppressed: false, sketchId, standard: 'iso', profileType: 'square tube', size: '40 x 40 x 4', corner: 'endMiter', gap: 0, mergeArcs: false, rotation: 0, mirror: false, locate: { x: 0, y: 0 } };
    const d = doc.weldment ? doc : addWeldmentConfigurations({ ...doc, weldment: true, features: [...doc.features, { id: newId('f'), type: 'weldment' as const, name: 'Frame', suppressed: false }] });
    set({ doc: d, featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'weldments', managerTab: 'tree', planePick: false });
  },
  startTrimExtend() {
    const { doc, rebuild, selectedFace } = get();
    if (rebuild.bodies.length < 2) {
      get().pushMessage('Trim/Extend needs at least two bodies (structural members).', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'trimExtend').length + 1;
    const draft: TrimExtendFeature = { id: newId('f'), type: 'trimExtend', name: `Trim/Extend${n}`, suppressed: false, bodies: selectedFace ? [selectedFace.bodyId] : [], trimBy: 'bodies', trimBodies: [], face: null, allowExtension: true, weldGap: 0 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'weldments', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [], trimFocus: 'bodies' });
  },
  startEndCap() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('End Cap needs a structural member.', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'endCap').length + 1;
    const draft: EndCapFeature = { id: newId('f'), type: 'endCap', name: `End Cap${n}`, suppressed: false, faces: [], thickness: 5, outward: false, useRatio: true, ratio: 0.5, offset: 2, chamfer: 0 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'weldments', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startWeldGusset() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Gusset needs structural members that meet at a corner.', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'weldGusset').length + 1;
    const draft: WeldGussetFeature = { id: newId('f'), type: 'weldGusset', name: `Gusset${n}`, suppressed: false, faces: [], profile: 'triangular', d1: 30, d2: 30, thickness: 5, location: 'mid', offset: 0 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'weldments', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startWeldBead() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Weld Bead needs bodies that meet at a corner.', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'weldBead').length + 1;
    const draft: WeldBeadFeature = { id: newId('f'), type: 'weldBead', name: `Weld Bead${n}`, suppressed: false, faces: [], size: 5, intermittent: null, from: 0, to: 0, bothSides: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'weldments', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
});
