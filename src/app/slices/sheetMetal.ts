/**
 * Store slice "sheetMetal" (QA F36): part of the zustand store of store.ts, split by subject. The state and actions are
 * unchanged; store.ts spreads this slice into the one store, so `useStore` and every selector work as before.
 */
import { type Document, type ExtrudeFeature, type BaseFlangeFeature, type EdgeFlangeFeature, type HemFeature, type MiterFlangeFeature, type JogFeature, type SketchedBendFeature, type CrossBreakFeature, type UnfoldFeature, type RoundFeature, type VentFeature, type FormToolFeature, type GussetFeature, type TabSlotFeature, type RipFeature, type SweptFlangeFeature } from '../../core/document/types';
import { FORM_TOOL_LIBRARY } from '../../core/features/sheetmetal4';
import { edgeRef } from '../../core/features/edgesets';
import { planeOnFace } from '../../core/features/planes';
import { registerPlanes } from '../viewport/camera';
import { autosave } from '../../core/document/persistence';
import { newId } from '../../core/sketch/model';
import type { ClosedCornerFeature, CornerReliefFeature, LoftedBendFeature, ConvertSheetFeature } from '../../core/document/types';
import type { Id } from '../../core/sketch/types';
import { DEFAULT_SHEET_METAL } from '../../core/features/sheetmetal';
import type { State, StoreSet, StoreGet } from '../store';
import { history, rebuildFor, historyFlags, featureName } from '../store';

type SheetMetalKeys =
  | 'flangePick' | 'sheetMetalEdit' | 'startBreakCorner' | 'collectAllCorners' | 'startClosedCorner' | 'startCornerRelief'
  | 'startLoftedBend' | 'startConvertSheet' | 'toggleNoBends' | 'startBaseFlange' | 'startMiterFlange' | 'startSketchedBend'
  | 'startJog' | 'startEdgeFlange' | 'startUnfold' | 'startCrossBreak' | 'startHem' | 'applyNormalCut'
  | 'startVent' | 'startFormTool' | 'addFormToolPoint' | 'startGusset' | 'startTabSlot' | 'startRip'
  | 'startSweptFlange' | 'toggleFlatten' | 'setSheetMetalEdit' | 'setSheetMetal';

export const sheetMetalSlice = (set: StoreSet, get: StoreGet): Pick<State, SheetMetalKeys> => ({
  flangePick: null,
  sheetMetalEdit: false,
  startBreakCorner() {
    const { doc, rebuild, selectedEdges } = get();
    const body = rebuild.bodies[0];
    if (!body) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    const edges = selectedEdges.map((id) => body.edges.find((e) => e.id === id)).filter((e) => !!e).map((e) => edgeRef(e!));
    const n = doc.features.filter((f) => (f.type === 'fillet' || f.type === 'chamfer') && f.breakCorner).length + 1;
    const draft: RoundFeature = { id: newId('f'), type: 'chamfer', name: `Break-Corner${n}`, suppressed: false, size: 5, edges, breakCorner: true };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedFace: null });
  },
  collectAllCorners() {
    const { doc, rebuild, featureEdit } = get();
    const body = rebuild.bodies[0];
    if (!body || !featureEdit || (featureEdit.draft.type !== 'fillet' && featureEdit.draft.type !== 'chamfer')) return;
    const t = doc.sheetMetal?.thickness ?? 3;
    // corner edges run straight through the thickness of the sheet
    const corners = body.edges.filter((e) => e.straight && Math.abs(e.length - t) < 1e-3).map((e) => edgeRef(e));
    set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edges: corners } } });
  },
  startClosedCorner(weld = false) {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Create a sheet metal part first.', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'closedCorner' && !!f.weld === weld).length + 1;
    const draft: ClosedCornerFeature = { id: newId('f'), type: 'closedCorner', name: `${weld ? 'Welded Corner' : 'Closed Corner'}${n}`, suppressed: false, faces: [], gap: 0.1, cornerType: 'butt', weld };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startCornerRelief() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Create a sheet metal part first.', 'warn');
      return;
    }
    const n = doc.features.filter((f) => f.type === 'cornerRelief').length + 1;
    const draft: CornerReliefFeature = { id: newId('f'), type: 'cornerRelief', name: `Corner Relief${n}`, suppressed: false, bends: [], kind: 'rectangular', size: 6 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startLoftedBend() {
    const { doc } = get();
    const sk = doc.features.filter((f) => f.type === 'sketch').map((f) => (f as { sketchId: Id }).sketchId);
    const n = doc.features.filter((f) => f.type === 'loftedBend').length + 1;
    const draft: LoftedBendFeature = { id: newId('f'), type: 'loftedBend', name: `Lofted-Bend${n}`, suppressed: false, sketchId: sk[sk.length - 2] ?? '', sketchId2: sk[sk.length - 1] ?? '', thickness: (doc.sheetMetal ?? DEFAULT_SHEET_METAL).thickness };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startConvertSheet(insertBends = false) {
    const { doc, rebuild, selectedFace } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage(insertBends ? 'Insert Bends needs a (shelled) solid body.' : 'Convert to Sheet Metal needs a solid body.', 'warn');
      return;
    }
    const b = selectedFace ? rebuild.bodies.find((x) => x.id === selectedFace.bodyId) : undefined;
    const fc = b?.faces.find((x) => x.id === selectedFace?.faceId);
    const draft: ConvertSheetFeature = { id: newId('f'), type: 'convertSheet', name: insertBends ? `Process-Bends${doc.features.filter((f) => f.type === 'convertSheet' && f.insertBends).length + 1}` : `Convert-Solid${doc.features.filter((f) => f.type === 'convertSheet' && !f.insertBends).length + 1}`, suppressed: false, ...(insertBends ? { insertBends: true } : {}), fixedFace: fc && !fc.curved ? { normal: fc.normal, point: fc.centroid } : null, thickness: (doc.sheetMetal ?? DEFAULT_SHEET_METAL).thickness, bendRadius: (doc.sheetMetal ?? DEFAULT_SHEET_METAL).bendRadius };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  toggleNoBends() {
    const { doc } = get();
    const fp = doc.features.find((f) => f.type === 'flatPattern');
    if (!fp || fp.type !== 'flatPattern') {
      get().pushMessage('No Bends needs a sheet metal part (Base Flange/Tab from an open sketch).', 'warn');
      return;
    }
    history.push('No Bends', doc);
    const on = !(fp.noBendLines && !fp.suppressed);
    const features = doc.features.map((f) => (f.id === fp.id ? { ...f, suppressed: !on, noBendLines: on } : f)) as Document['features'];
    const d: Document = { ...doc, features };
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(d);
  },
  startBaseFlange() {
    const { doc, activeSketchId, selectedFeatureId } = get();
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) get().pushMessage('Open or select the sketch of the flange (an open profile bends, a closed one becomes a tab).', 'warn');
    const draft: BaseFlangeFeature = { id: newId('f'), type: 'baseFlange', name: featureName(doc, 'baseFlange'), sketchId: sketchId ?? '', suppressed: false, depth: 60, midPlane: true, reverse: false, flipDir: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startMiterFlange() {
    const { doc, rebuild, selectedEdges, activeSketchId, selectedFeatureId } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) get().pushMessage('Select the sketch of the profile (an open chain on a plane across the first edge).', 'warn');
    const body = rebuild.bodies.find((b) => b.edges.some((e) => selectedEdges.includes(e.id))) ?? rebuild.bodies[0];
    const edges = selectedEdges.map((id) => body.edges.find((x) => x.id === id)).filter((x) => x && x.straight).map((e) => edgeRef(e!));
    const draft: MiterFlangeFeature = { id: newId('f'), type: 'miterFlange', name: featureName(doc, 'miterFlange'), sketchId: sketchId ?? '', suppressed: false, edges, reverse: false, gap: 0.25 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startSketchedBend() {
    const { doc, rebuild, activeSketchId, selectedFeatureId } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) get().pushMessage('Select the sketch with the bend line (one line on a face of the sheet).', 'warn');
    const draft: SketchedBendFeature = { id: newId('f'), type: 'sketchedBend', name: featureName(doc, 'sketchedBend'), sketchId: sketchId ?? '', suppressed: false, angle: 90, flipSide: false, reverse: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startJog() {
    const { doc, rebuild, activeSketchId, selectedFeatureId } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) get().pushMessage('Select the sketch with the jog line (one line on a face of the sheet).', 'warn');
    const draft: JogFeature = { id: newId('f'), type: 'jog', name: featureName(doc, 'jog'), sketchId: sketchId ?? '', suppressed: false, offset: 10, flipSide: false, reverse: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startEdgeFlange() {
    const { doc, rebuild, selectedEdges } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    const body = rebuild.bodies.find((b) => b.edges.some((e) => selectedEdges.includes(e.id))) ?? rebuild.bodies[0];
    const e = selectedEdges.map((id) => body.edges.find((x) => x.id === id)).find((x) => x && x.straight);
    const draft: EdgeFlangeFeature = { id: newId('f'), type: 'edgeFlange', name: featureName(doc, 'edgeFlange'), suppressed: false, edge: e ? edgeRef(e) : null, angle: 90, length: 32, lengthMode: 'outerSharp', position: 'materialOutside', flip: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedEdges: e ? [e.id] : [] });
  },
  startUnfold(kind) {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length || !doc.features.some((f) => f.type === 'baseFlange' && !f.suppressed)) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    const draft: UnfoldFeature = { id: newId('f'), type: kind, name: featureName(doc, kind), suppressed: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startCrossBreak() {
    const { doc, rebuild, selectedFace } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    let face: CrossBreakFeature['face'] = null;
    if (selectedFace) {
      const b = rebuild.bodies.find((x) => x.id === selectedFace.bodyId);
      const fc = b?.faces.find((x) => x.id === selectedFace.faceId);
      if (b && fc && !fc.curved) face = { normal: [...fc.normal] as [number, number, number], point: [...fc.centroid] as [number, number, number], label: `Face<${b.faces.indexOf(fc) + 1}>` };
    }
    const draft: CrossBreakFeature = { id: newId('f'), type: 'crossBreak', name: featureName(doc, 'crossBreak'), suppressed: false, face, radius: 1, angle: 2, reverse: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startHem() {
    const { doc, rebuild, selectedEdges } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    const body = rebuild.bodies.find((b) => b.edges.some((e) => selectedEdges.includes(e.id))) ?? rebuild.bodies[0];
    const e = selectedEdges.map((id) => body.edges.find((x) => x.id === id)).find((x) => x && x.straight);
    const draft: HemFeature = { id: newId('f'), type: 'hem', name: featureName(doc, 'hem'), suppressed: false, edge: e ? edgeRef(e) : null, hemType: 'closed', length: 10, gap: 2, position: 'materialInside', flip: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedEdges: e ? [e.id] : [] });
  },
  applyNormalCut() {
    const { doc, selectedFeatureId } = get();
    const cuts = doc.features.filter((f): f is ExtrudeFeature => f.type === 'extrude' && f.op === 'cut');
    const target = cuts.find((f) => f.id === selectedFeatureId) ?? (selectedFeatureId ? null : cuts[cuts.length - 1]);
    if (!target) {
      get().pushMessage(cuts.length ? 'Select the Cut-Extrude feature to convert in the Feature Tree.' : 'Normal Cut needs an Extruded Cut on the sheet.', 'warn');
      return;
    }
    const on = target.normalCut === false;
    get().applyDocument('Normal Cut', { ...doc, features: doc.features.map((f) => (f.id === target.id ? { ...f, normalCut: on, optimizeGeometry: on } : f)) });
    get().pushMessage(`${target.name}: Normal cut ${on ? 'on' : 'off'}${on ? ' (optimize geometry)' : ''}.`, 'info');
  },
  startVent() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    const sk = doc.features.filter((f) => f.type === 'sketch') as { sketchId: Id }[];
    const sel = get().selectedFeatureId;
    const selSk = doc.features.find((f) => f.id === sel && f.type === 'sketch') as { sketchId: Id } | undefined;
    const draft: VentFeature = { id: newId('f'), type: 'vent', name: `Vent${doc.features.filter((f) => f.type === 'vent').length + 1}`, suppressed: false, sketchId: selSk?.sketchId ?? sk[sk.length - 1]?.sketchId ?? '', ribWidth: 3, sparWidth: 3, fillIn: false, radius: 0, draft: 0 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startFormTool(shape = 'embossRound') {
    const { doc, rebuild, selectedFace } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    let plane = '';
    let d = doc;
    if (selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (face && !face.curved) {
        const def = { ...planeOnFace(newId('pl'), `Face${Object.keys(doc.planes).length + 1}`, face.centroid, face.normal), kind: 'face' as const };
        d = { ...doc, planes: { ...doc.planes, [def.id]: def } };
        registerPlanes(d.planes);
        plane = def.id;
      }
    }
    if (!plane) get().pushMessage('Select the placement face of the sheet first, then the forming tool.', 'warn');
    const lib = FORM_TOOL_LIBRARY.find((x) => x.id === shape) ?? FORM_TOOL_LIBRARY[0];
    const draft: FormToolFeature = { id: newId('f'), type: 'formTool', name: `${lib.label}${doc.features.filter((f) => f.type === 'formTool' && f.shape === lib.id).length + 1}`, suppressed: false, plane, points: [], shape: lib.id, width: lib.width, length: lib.length, height: lib.height, rotation: 0, flip: false, linkToThickness: true };
    set({ doc: d, featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  addFormToolPoint(p) {
    const fe = get().featureEdit;
    if (!fe || fe.draft.type !== 'formTool') return;
    set({ featureEdit: { ...fe, draft: { ...fe.draft, points: [...fe.draft.points, p] } } });
  },
  startGusset() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body with a bend first.', 'warn');
      return;
    }
    const draft: GussetFeature = { id: newId('f'), type: 'gusset', name: `Sheet Metal Gusset${doc.features.filter((f) => f.type === 'gusset').length + 1}`, suppressed: false, faces: [], depth: 10, width: 6, offset: null, flip: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startTabSlot() {
    const { doc, rebuild, selectedEdges } = get();
    if (rebuild.bodies.length < 2) {
      get().pushMessage('Tab and Slot needs two sheet metal bodies: the tabs on one, the slots in the other.', 'warn');
      return;
    }
    const body = rebuild.bodies.find((b) => b.edges.some((e) => selectedEdges.includes(e.id)));
    const e = selectedEdges.map((id) => body?.edges.find((x) => x.id === id)).find((x) => x && x.straight);
    const draft: TabSlotFeature = { id: newId('f'), type: 'tabSlot', name: `Tab and Slot${doc.features.filter((f) => f.type === 'tabSlot').length + 1}`, suppressed: false, edge: e ? edgeRef(e) : null, slotFace: null, tabLength: 10, tabHeight: (doc.sheetMetal ?? DEFAULT_SHEET_METAL).thickness, linkToThickness: true, count: 3, edgeOffset: 5, clearance: 0.1 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false, selectedEdges: e ? [e.id] : [], selectedFace: null, selectedFaces: [] });
  },
  startRip() {
    const { doc, rebuild, selectedEdges } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Rip needs a (shelled) solid body.', 'warn');
      return;
    }
    const edges = selectedEdges.map((id) => rebuild.bodies.flatMap((b) => b.edges).find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x && x.straight).map((e) => edgeRef(e));
    const draft: RipFeature = { id: newId('f'), type: 'rip', name: `Rip${doc.features.filter((f) => f.type === 'rip').length + 1}`, suppressed: false, edges, gap: 0.1, direction: 'both' };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  startSweptFlange() {
    const { doc, rebuild, selectedEdges } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Make a sheet metal body first (Base Flange/Tab).', 'warn');
      return;
    }
    const sk = doc.features.filter((f) => f.type === 'sketch') as { sketchId: Id }[];
    const edges = selectedEdges.map((id) => rebuild.bodies.flatMap((b) => b.edges).find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x && x.straight).map((e) => edgeRef(e));
    const draft: SweptFlangeFeature = { id: newId('f'), type: 'sweptFlange', name: `Swept Flange${doc.features.filter((f) => f.type === 'sweptFlange').length + 1}`, suppressed: false, sketchId: sk[sk.length - 1]?.sketchId ?? '', pathSketchId: '', edges, reverse: false, merge: true };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'sheetmetal', managerTab: 'tree', planePick: false });
  },
  toggleFlatten() {
    const { doc } = get();
    const fp = doc.features.find((f) => f.type === 'flatPattern');
    if (!fp) {
      get().pushMessage('Flatten needs a sheet metal part (Base Flange/Tab from an open sketch).', 'warn');
      return;
    }
    get().toggleSuppress(fp.id);
  },
  setSheetMetalEdit(sheetMetalEdit) {
    set({ sheetMetalEdit, featureEdit: sheetMetalEdit ? null : get().featureEdit, managerTab: 'tree' });
  },
  setSheetMetal(params) {
    const { doc } = get();
    history.push('Sheet-Metal', doc);
    const d: Document = { ...doc, sheetMetal: params };
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, sheetMetalEdit: false, ...historyFlags() });
    autosave(d);
  },
});
