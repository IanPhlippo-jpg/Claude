/**
 * Store slice "features" (QA F36): part of the zustand store of store.ts, split by subject. The state and actions are
 * unchanged; store.ts spreads this slice into the one store, so `useStore` and every selector work as before.
 */
import { MAX_PATTERN_INSTANCES } from '../../core/features/pattern';
import { faceOwner } from '../../core/features/faceOwner';
import { isRoundFeature, isSketchBased, isSolidFeature, type Document, type ExtrudeFeature, type HoleFeature, type MirrorFeature, type PatternFeature, type RibFeature, type CombineFeature, type FlatPatternFeature, type HelixFeature, type DraftFeature, type IntersectFeature, type SurfaceFeature, type WrapFeature, type ThreadFeature, type RoundFeature, type ShellFeature, type SolidFeature, type SweepFeature, type StructuralMemberFeature, type DeformFeature, type MoveBodyFeature } from '../../core/document/types';
import { type FaceRef as DxFaceRef } from '../../core/document/autoTolerance';
import { edgeRef } from '../../core/features/edgesets';
import { isReferencePlane, planeOnFace } from '../../core/features/planes';
import { registerPlanes } from '../viewport/camera';
import { autosave } from '../../core/document/persistence';
import { faceFilletEdges, fullRoundEdges } from '../../core/features/round';
import { newId, addSpline } from '../../core/sketch/model';
import type { StudFeature, DeleteFaceFeature } from '../../core/document/types';
import type { Id, SketchPoint } from '../../core/sketch/types';
import { applyEquations, evaluateExpression } from '../../core/document/equations';

import { draftEquations, withFieldEquations } from './fieldEquations'; import { plasticsFacePick } from './plastics';
import { activateConfiguration, activeConfiguration, addConfiguration as addConfig, configurations, deleteConfiguration as deleteConfig, setConfigurationDimension as setCfgDim, setConfigurationSuppressed as setCfgSup, updateConfiguration } from '../../core/document/configurations';
import { sketchChains } from '../../core/features/thin';
import { sketchRegions } from '../../core/features/regions';
import { applyColorScheme, DEFAULT_PREFS, getPref, loadPrefs, savePrefs, type PrefValue } from '../prefs';
import { cylinderAxis, localRef } from '../../core/assembly/assembly';
import { curveEndNormal, referencePlane, resolvePlaneDef } from '../../core/features/planes';
import { DEFAULT_SHEET_METAL } from '../../core/features/sheetmetal';
import { isAssembly, type MateRef } from '../../core/document/types';
import { fitCylinder } from '../../core/features/wrap';
import { METRIC_THREADS, nearestThread } from '../../core/features/thread';
import * as THREE from 'three';
import { featureDependents, geometricChildren } from '../../core/features/dependents';
import { refGeometryFrom } from '../../core/features/refgeom';
import { faceBoundary } from '../../core/features/patterns2';
import type { State, StoreSet, StoreGet, FaceRef, PatternEdit, UnitSystem } from '../store';
import { history, historyFlags, initialDoc, featureName, DEFAULT_DECAL, threadEdge, rebuildFor, rebuildNow, whenRebuilt, mateRefCount, STANDARD_MATES, refreshMatePreview, previewPattern, solveAll, cfgOpts, DRAW_TOOLS } from '../store';

type FeaturesKeys =
  | 'featureEdit' | 'planeEdit' | 'refEdit' | 'decalEdit' | 'hoverFeatureId' | 'edgePick'
  | 'threadFacePick' | 'shellPick' | 'shellMultiThickness' | 'mirrorPick' | 'fullRoundPick' | 'configEdit'
  | 'configure' | 'sectionView' | 'sectionEdit' | 'sceneEdit' | 'setSceneEdit' | 'setScene'
  | 'patternEdit' | 'analysis' | 'setAnalysis' | 'draftFocus' | 'setDraftFocus' | 'selectedFeatureId'
  | 'hoverFace' | 'selectedFace' | 'hoverEdge' | 'selectedEdges' | 'selectedFaces' | 'hoverPlane'
  | 'selectedPlane' | 'prefs' | 'dialogFeatureId' | 'rollbackIndex' | 'startFeature' | 'startRound'
  | 'startMirror' | 'startPattern' | 'startHole' | 'startDecal' | 'updateDecalEdit' | 'commitDecal'
  | 'deleteDecal' | 'startStud' | 'startRib' | 'startShell' | 'setHoverEdge'
  | 'toggleSelectedEdge' | 'updateFeatureDraft' | 'commitFeature' | 'cancelFeature' | 'editFeature' | 'setFeatureDepth'
  | 'toggleSuppress' | 'setSelectedFeature' | 'setHoverFace' | 'setSelectedFace' | 'setBodyHidden' | 'startCurveFeature'
  | 'startHelix' | 'startSurface' | 'startIntersect' | 'startDeleteFace' | 'startDraft' | 'startThread'
  | 'startWrap' | 'startDeform' | 'setAppearance' | 'setAppearanceProps' | 'setFaceAppearance' | 'addEquationCurve' | 'updatePatternDraft'
  | 'startSectionView' | 'updateSectionView' | 'commitSectionView' | 'saveSectionView' | 'cancelSectionView' | 'startCombine' | 'startMoveBody'
  | 'startRefGeom' | 'cancelRefGeom' | 'commitRefGeom' | 'deleteRefGeom' | 'startPlane' | 'showConfiguration'
  | 'startAddConfiguration' | 'editConfigurationProperties' | 'updateConfigDraft' | 'commitConfiguration' | 'cancelConfiguration' | 'deleteConfiguration'
  | 'setConfigurationDimension' | 'setConfigurationSuppressed' | 'openConfigure' | 'closeConfigure' | 'setDimensionInConfigurations' | 'updatePlaneDraft'
  | 'commitPlane' | 'cancelPlane' | 'editPlane' | 'deletePlane' | 'togglePatternSkip' | 'setEquations'
  | 'deleteFeature' | 'requestDeleteFeature' | 'renameFeature' | 'commit' | 'setRollback' | 'setHoverPlane'
  | 'setSelectedPlane' | 'setPrefs';

export const featuresSlice = (set: StoreSet, get: StoreGet): Pick<State, FeaturesKeys> => ({
  featureEdit: null,
  planeEdit: null,
  refEdit: null,
  decalEdit: null,
  hoverFeatureId: null,
  edgePick: null,
  threadFacePick: false,
  shellPick: null,
  shellMultiThickness: 2,
  mirrorPick: null,
  fullRoundPick: 'side1',
  configEdit: null,
  configure: null,
  sectionView: null,
  sectionEdit: null,
  sceneEdit: false,
  setSceneEdit(sceneEdit) {
    set({ sceneEdit, managerTab: 'tree' });
  },
  setScene(patch) {
    const { doc } = get();
    history.push('Edit Scene', doc);
    const d: Document = { ...doc, scene: { background: 'gradient', ...(doc.scene ?? {}), ...patch } };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  patternEdit: null,
  analysis: null,
  setAnalysis(analysis) {
    // the analysis colours show on every face: no selection tint on top
    set(analysis ? { analysis, selectedFace: null, selectedFaces: [], selectedEdges: [] } : { analysis });
  },
  draftFocus: 'neutral',
  setDraftFocus(draftFocus) {
    set({ draftFocus });
  },
  selectedFeatureId: null,
  hoverFace: null,
  selectedFace: null,
  hoverEdge: null,
  selectedEdges: [],
  selectedFaces: [],
  hoverPlane: null,
  selectedPlane: null,
  prefs: typeof localStorage !== 'undefined' ? { ...loadPrefs(), ...(initialDoc.properties ?? {}) } : { ...DEFAULT_PREFS },
  dialogFeatureId: null,
  rollbackIndex: null,
  startFeature(type, op, boundary = false) {
    const { doc, activeSketchId, selectedFeatureId } = get();
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    void isSolidFeature;
    const sketch = sketchId ? doc.sketches[sketchId] : null;
    if (!sketch) {
      get().pushMessage('Select a sketch in the Feature Tree (or open one) before adding the feature.', 'warn');
    }
    // an empty sketch gives no feature: the intended design refuses with "no closed contours"
    if (sketch && (type === 'extrude' || type === 'revolve') && sketchRegions(sketch).length === 0 && sketchChains(sketch).length === 0) {
      get().pushMessage('The sketch is empty: draw a closed contour (or an open chain for a thin feature) first.', 'warn');
      return;
    }
    const id = newId('f');
    const name = featureName(doc, type, op);
    let draft: SolidFeature;
    // a cut on a face of the body goes into the material by default (the face normal points outward), by design
    const intoMaterial = op === 'cut' && !!sketch && !isReferencePlane(sketch.plane);
    // an open profile becomes a thin feature automatically, by design proposes
    const openProfile = !!sketch && type === 'extrude' && sketchRegions(sketch).length === 0 && sketchChains(sketch).length > 0;
    if (type === 'sweep') draft = { id, type: 'sweep', name, sketchId: sketchId ?? '', pathSketchId: '', suppressed: false, op };
    else if (type === 'loft') draft = boundary ? { id, type: 'loft', name: `${op === 'boss' ? 'Boundary-Boss' : 'Boundary-Cut'}${doc.features.filter((f) => f.type === 'loft' && f.boundary && f.op === op).length + 1}`, sketchId: sketchId ?? '', sketchId2: '', suppressed: false, op, boundary: true } : { id, type: 'loft', name, sketchId: sketchId ?? '', sketchId2: '', suppressed: false, op };
    else if (type === 'extrude') draft = { id, type: 'extrude', name: openProfile && op === 'boss' ? featureName(doc, 'extrude', 'boss', true) : name, sketchId: sketchId ?? '', suppressed: false, op, end: 'blind', depth: 10, reverse: intoMaterial, thin: openProfile ? { mode: 'one', thickness: 2 } : undefined };
    else {
      const axis = sketch ? sketch.entityOrder.map((eid) => sketch.entities[eid]).find((e) => e.kind === 'line' && e.construction) ?? sketch.entityOrder.map((eid) => sketch.entities[eid]).find((e) => e.kind === 'line') : undefined;
      draft = { id, type: 'revolve', name, sketchId: sketchId ?? '', suppressed: false, op, axisEntityId: axis?.id ?? '', angle: 360, reverse: false };
    }
    // the sketch stays as it is; the feature Property Panel replaces the sketch tools (by design)
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: isAssembly(doc) ? 'assembly' : 'features', managerTab: 'tree', planePick: false });
  },
  startRound(type) {
    const { doc, rebuild, selectedEdges } = get();
    const body = rebuild.bodies[0];
    if (!body) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    const edges = selectedEdges.map((id) => body.edges.find((e) => e.id === id)).filter((e) => !!e).map((e) => edgeRef(e!));
    const draft: RoundFeature = { id: newId('f'), type, name: featureName(doc, type), suppressed: false, size: 10, edges };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null });
  },
  startMirror() {
    const { doc, rebuild, selectedPlane, selectedFace } = get();
    if (!rebuild.bodies[0]) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    let plane = selectedPlane ?? 'right';
    if (!selectedPlane && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (face && face.curved) {
        get().pushMessage('Select a planar face: a sketch cannot be placed on a curved face.', 'warn');
        return;
      }
      if (face) {
        const def = { ...planeOnFace(newId('pl'), `Face${Object.keys(doc.planes).length + 1}`, face.centroid, face.normal), kind: 'face' as const };
        const d: Document = { ...doc, planes: { ...doc.planes, [def.id]: def } };
        registerPlanes(d.planes);
        set({ doc: d });
        plane = def.id;
      }
    }
    const draft: MirrorFeature = { id: newId('f'), type: 'mirror', name: featureName(doc, 'mirror'), suppressed: false, plane };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null });
  },
  startPattern(type) {
    const { doc, rebuild, selectedFeatureId } = get();
    if (!rebuild.bodies[0]) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    const sel = selectedFeatureId ? doc.features.find((f) => f.id === selectedFeatureId) : undefined;
    const seed = sel && isSketchBased(sel) && sel.type !== 'sketch' ? [sel.id] : sel?.type === 'sketch' ? doc.features.filter((f) => isSketchBased(f) && f.type !== 'sketch' && (f as ExtrudeFeature).sketchId === sel.sketchId).map((f) => f.id) : [];
    // Fill Pattern: the selected planar face is the fill boundary
    let fill: PatternFeature['fill'];
    if (type === 'fillPattern' && get().selectedFace) {
      const sf = get().selectedFace!;
      const b = rebuild.bodies.find((x) => x.id === sf.bodyId);
      const fc = b?.faces.find((x) => x.id === sf.faceId);
      if (b && fc && !fc.curved) fill = { ...faceBoundary(b.geometry, fc.triangles, fc.normal, fc.centroid), spacing: 10, margin: 2, layout: 'square', label: `Face<${b.faces.indexOf(fc) + 1}>` };
    }
    const seedSk = seed.length ? (doc.features.find((f) => f.id === seed[0]) as ExtrudeFeature | undefined)?.sketchId : undefined;
    const seedDims = seedSk && doc.sketches[seedSk] ? doc.sketches[seedSk].constraintOrder.map((id) => doc.sketches[seedSk].constraints[id]).filter((c) => c && c.value !== undefined && !c.driven) : [];
    const curveSk = doc.features.filter((f) => f.type === 'sketch').map((f) => (f as { sketchId: string }).sketchId).find((id) => id !== seedSk) ?? '';
    const draft: PatternFeature =
      type === 'curvePattern'
        ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, curve: { sketchId: curveSk, count: 4, spacing: 20, equal: true, tangent: false } }
        : type === 'tablePattern'
        ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, table: [{ x: 20, y: 0 }, { x: 40, y: 0 }] }
        : type === 'fillPattern'
        ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, fill }
        : type === 'variablePattern'
        ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, variable: { dir: [1, 0, 0], rows: [{ offset: 25, values: Object.fromEntries(seedDims.map((c) => [c.id, c.value!])) }] } }
        : type === 'sketchPattern'
        ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, sketchId: '' }
        : type === 'linearPattern'
        ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, dir1: { axis: [1, 0, 0], spacing: 20, count: 3 } }
        : { id: newId('f'), type, name: featureName(doc, type), suppressed: false, featureIds: seed, axis: { origin: [0, 0, 0], dir: [0, 1, 0] }, angle: 360, count: 4 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false });
  },
  startHole(advanced = false, simple = false) {
    const { doc, rebuild, selectedFace } = get();
    if (!rebuild.bodies[0]) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
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
    if (!plane) get().pushMessage('Select a planar face of the body first, then click Hole Tool.', 'warn');
    const draft: HoleFeature = advanced
      ? { id: newId('f'), type: 'hole', name: `Advanced Hole${doc.features.filter((f) => f.type === 'hole' && f.advanced).length + 1}`, suppressed: false, plane, points: [], holeType: 'counterbore', diameter: 6.6, depth: 0, cbDiameter: 11, cbDepth: 6.5, csDiameter: 12.6, csAngle: 90, advanced: true, farSide: { kind: 'countersink', diameter: 10, depth: 2, angle: 90 } }
      : { id: newId('f'), type: 'hole', name: simple ? `Hole${doc.features.filter((f) => f.type === 'hole' && f.simple).length + 1}` : featureName(doc, 'hole'), suppressed: false, plane, points: [], holeType: 'simple', diameter: 6.6, depth: 0, cbDiameter: 11, cbDepth: 6.5, csDiameter: 12.6, csAngle: 90, ...(simple ? { simple: true } : {}) };
    set({ doc: d, featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startDecal(id) {
    const { doc, selectedFace, rebuild } = get();
    const ex = id ? (doc.decals ?? []).find((d) => d.id === id) : undefined;
    let face = ex?.face ?? null;
    if (!face && selectedFace) {
      const f = rebuild.bodies.find((b) => b.id === selectedFace.bodyId)?.faces.find((x) => x.id === selectedFace.faceId);
      if (f && !f.curved) face = { normal: f.normal, point: f.centroid };
    }
    set({ decalEdit: { id, name: ex?.name ?? `Decal${(doc.decals ?? []).length + 1}`, face, image: ex?.image ?? DEFAULT_DECAL, width: ex?.width ?? 40, rotation: ex?.rotation ?? 0, height: ex?.height, lighting: ex?.lighting, brightness: ex?.brightness, shininess: ex?.shininess }, featureEdit: null, managerTab: 'tree', tab: 'render', selectedFace: null, selectedFaces: [] });
  },
  updateDecalEdit(patch) {
    const e = get().decalEdit;
    if (e) set({ decalEdit: { ...e, ...patch } });
  },
  commitDecal() {
    const { decalEdit: e, doc } = get();
    if (!e) return;
    if (!e.face) {
      get().pushMessage('Select the planar face to put the decal on.', 'warn');
      return;
    }
    history.push(e.id ? `Edit ${e.name}` : e.name, doc);
    const dec = { id: e.id ?? newId('dc'), name: e.name, face: e.face, image: e.image, width: e.width, rotation: e.rotation, ...(e.height !== undefined ? { height: e.height } : {}), ...(e.lighting === 'custom' ? { lighting: e.lighting, brightness: e.brightness, shininess: e.shininess } : {}) };
    const d: Document = { ...doc, decals: [...(doc.decals ?? []).filter((x) => x.id !== dec.id), dec] };
    set({ doc: d, decalEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  deleteDecal(id) {
    const { doc } = get();
    history.push('Delete decal', doc);
    const d: Document = { ...doc, decals: (doc.decals ?? []).filter((x) => x.id !== id) };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startStud() {
    const { doc, rebuild, selectedFace } = get();
    if (!rebuild.bodies[0]) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    const body = selectedFace ? rebuild.bodies.find((b) => b.id === selectedFace.bodyId) : undefined;
    const face = body?.faces.find((f) => f.id === selectedFace?.faceId);
    if (!face || face.curved) {
      get().pushMessage('Select a planar face of the body first, then click Stud Tool.', 'warn');
      return;
    }
    const def = { ...planeOnFace(newId('pl'), `Face${Object.keys(doc.planes).length + 1}`, face.centroid, face.normal), kind: 'face' as const };
    const d = { ...doc, planes: { ...doc.planes, [def.id]: def } };
    registerPlanes(d.planes);
    const n = doc.features.filter((f) => f.type === 'stud').length + 1;
    const draft: StudFeature = { id: newId('f'), type: 'stud', name: `Stud${n}`, suppressed: false, plane: def.id, point: { x: 0, y: 0 }, size: 'M6', diameter: 6, length: 20, threadLength: 15, pitch: 1 };
    set({ doc: d, featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startRib() {
    const { doc, rebuild, activeSketchId, selectedFeatureId } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base); a rib grows from a sketch until it meets the body.', 'warn');
      return;
    }
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) {
      get().pushMessage('Open or select the sketch (a line, arc or chain) that the rib grows from.', 'warn');
    }
    const draft: RibFeature = { id: newId('f'), type: 'rib', name: featureName(doc, 'rib'), sketchId: sketchId ?? '', suppressed: false, thickness: 10, side: 'both', direction: 'parallel', flip: false, draft: 0 };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: 'features', managerTab: 'tree', planePick: false });
  },
  startShell() {
    const { doc, rebuild, selectedFaces, selectedFace } = get();
    const body = rebuild.bodies[0];
    if (!body) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    const refs = [...selectedFaces, ...(selectedFace && !selectedFaces.some((f) => f.faceId === selectedFace.faceId) ? [selectedFace] : [])]
      .map((r) => body.faces.find((f) => f.id === r.faceId))
      .filter((f) => !!f)
      .map((f) => ({ normal: f!.normal, point: f!.centroid }));
    const draft: ShellFeature = { id: newId('f'), type: 'shell', name: featureName(doc, 'shell'), suppressed: false, thickness: 2, faces: refs };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false });
  },
  setHoverEdge(hoverEdge) {
    if (get().hoverEdge !== hoverEdge) set({ hoverEdge });
  },
  toggleSelectedEdge(id, additive = false) {
    const { selectedEdges, featureEdit, rebuild, dialog, planeEdit } = get();
    if (planeEdit && (planeEdit.draft.mode === 'angle' || planeEdit.draft.mode === 'perpendicular')) {
      set({ planeEdit: { ...planeEdit, draft: { ...planeEdit.draft, edgeId: id } }, selectedEdges: [id] });
      return;
    }
    const has = selectedEdges.includes(id);
    const measuring = dialog === 'measure';
    const next = has ? selectedEdges.filter((x) => x !== id) : additive || featureEdit || measuring || get().refEdit ? [...selectedEdges, id] : [id];
    // while measuring, edges and faces are selected together
    set(measuring ? { selectedEdges: next, selectedPlane: null, selectedFeatureId: null } : { selectedEdges: next, selectedFace: null, selectedPlane: null, selectedFeatureId: null });
    // Draft > Parting line / Step draft: the picked edge is the parting line (its middle fixes the hinge plane)
    if (featureEdit && featureEdit.draft.type === 'draft' && get().draftFocus === 'parting' && !has) {
      const edge = rebuild.bodies.flatMap((b) => b.edges).find((e) => e.id === id);
      if (edge) {
        const c = edge.centroid;
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, parting: { point: [c.x, c.y, c.z], label: `Edge<${(rebuild.bodies.flatMap((b) => b.edges).indexOf(edge)) + 1}>` } } }, selectedEdges: [id], draftFocus: 'faces' });
        return;
      }
    }
    // Face Fillet ▸ Hold line: the picked edge is the hold line
    if (featureEdit && featureEdit.draft.type === 'fillet' && featureEdit.draft.roundType === 'face' && featureEdit.draft.holdLineMode && !has) {
      const edge = rebuild.bodies.flatMap((b) => b.edges).find((e) => e.id === id);
      if (edge) {
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, holdLine: edgeRef(edge) } }, selectedEdges: [id] });
        return;
      }
    }
    // Ruled Surface: the picked edge is the edge to rule from
    if (featureEdit && featureEdit.draft.type === 'surface' && featureEdit.draft.kind === 'ruled' && !has) {
      const edge = rebuild.bodies.flatMap((b) => b.edges).find((e) => e.id === id);
      if (edge) {
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edge: edgeRef(edge) } }, selectedEdges: [id] });
        return;
      }
    }
    // Thread: the picked circular edge (rod or hole), the size follows its diameter
    if (featureEdit && featureEdit.draft.type === 'thread') {
      const body = rebuild.bodies.find((b) => b.edges.some((e) => e.id === id));
      const e = body?.edges.find((x) => x.id === id);
      const te = body && e && e.closed && !e.straight ? threadEdge(body.geometry, e.points, body.edges.indexOf(e) + 1) : null;
      if (te) {
        const [size, diameter, pitch] = nearestThread(te.radius * 2, te.internal);
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edge: te, size, diameter, pitch, name: featureEdit.draft.name.replace(/^M[\d.x]+ /, `${size} `) } }, selectedEdges: [id] });
      } else get().pushMessage('Select a circular edge of a cylinder or hole.', 'warn');
      return;
    }
    // Tab and Slot: the picked straight edge gets the tabs
    if (featureEdit && featureEdit.draft.type === 'tabSlot') {
      const body = rebuild.bodies.find((b) => b.edges.some((e) => e.id === id));
      const e = body?.edges.find((x) => x.id === id);
      if (e && e.straight) set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edge: edgeRef(e) } }, selectedEdges: [id] });
      else get().pushMessage('Select a straight edge of the sheet.', 'warn');
      return;
    }
    // Rip / Swept Flange: the picked straight edges
    if (featureEdit && (featureEdit.draft.type === 'rip' || featureEdit.draft.type === 'sweptFlange')) {
      const all = rebuild.bodies.flatMap((b) => b.edges);
      const edges = next.map((eid) => all.find((e) => e.id === eid)).filter((e): e is NonNullable<typeof e> => !!e && e.straight).map((e) => edgeRef(e));
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edges } } });
      return;
    }
    // Edge Flange: the picked straight edge
    if (featureEdit && (featureEdit.draft.type === 'edgeFlange' || featureEdit.draft.type === 'hem')) {
      const body = rebuild.bodies.find((b) => b.edges.some((e) => e.id === id));
      const e = body?.edges.find((x) => x.id === id);
      if (e && e.straight) set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edge: edgeRef(e) } }, selectedEdges: [id] });
      else get().pushMessage('Select a straight edge of the sheet.', 'warn');
      return;
    }
    // Miter Flange: the picked straight edges form the chain
    if (featureEdit && featureEdit.draft.type === 'miterFlange') {
      const body = rebuild.bodies.find((b) => b.edges.some((e) => e.id === id));
      const edges = next.map((eid) => body?.edges.find((e) => e.id === eid)).filter((e) => !!e && e.straight).map((e) => edgeRef(e!));
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edges } } });
      return;
    }
    // while a fillet/chamfer is being defined, the selection is its edge list (with the click point of each)
    if (featureEdit && isRoundFeature(featureEdit.draft)) {
      const body = rebuild.bodies[0];
      const prev = featureEdit.draft.edges;
      const pick = get().edgePick;
      const edges = next.map((eid) => body?.edges.find((e) => e.id === eid)).filter((e) => !!e).map((e) => {
        const ref = edgeRef(e!);
        const old = prev.find((p) => Math.hypot(p.centroid[0] - ref.centroid[0], p.centroid[1] - ref.centroid[1], p.centroid[2] - ref.centroid[2]) < 1e-6);
        return { ...ref, pick: e!.id === id && pick ? pick : old?.pick };
      });
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, edges } } });
    }
  },
  updateFeatureDraft(patch) {
    const fe = get().featureEdit;
    if (!fe) return;
    // a number that is not finite (NaN, ∞ from a bad input) never reaches the draft: the preview would draw NaN
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => typeof v !== 'number' || Number.isFinite(v)));
    const draft = { ...fe.draft, ...clean } as SolidFeature;
    const equations = draftEquations(fe, draft, clean, get().doc);
    set({ featureEdit: { ...fe, draft, ...(equations ? { equations } : {}) } });
  },
  commitFeature() {
    const fe = get().featureEdit;
    if (!fe) return;
    const { doc } = get();
    if (isSketchBased(fe.draft) && !doc.sketches[fe.draft.sketchId]) {
      get().pushMessage('Select a sketch for the feature first.', 'warn');
      return;
    }
    if (fe.draft.type === 'chamfer' && fe.draft.roundType === 'vertex') {
      if (!fe.draft.vertex) {
        get().pushMessage('Select the vertex to chamfer.', 'warn');
        return;
      }
    } else if (isRoundFeature(fe.draft) && !fe.draft.edges.length) {
      get().pushMessage(fe.draft.roundType === 'offsetFace' || fe.draft.roundType === 'faceFace' ? 'Select two faces that share an edge.' : 'Select at least one edge.', 'warn');
      return;
    }
    if (fe.draft.type === 'hole' && (!fe.draft.plane || !fe.draft.points.length)) {
      get().pushMessage('Select a face and place at least one hole position.', 'warn');
      return;
    }
    if (fe.draft.type === 'formTool' && (!fe.draft.plane || !fe.draft.points.length)) {
      get().pushMessage('Select the placement face and place at least one position for the forming tool.', 'warn');
      return;
    }
    if (fe.draft.type === 'vent' && !doc.sketches[fe.draft.sketchId]) {
      get().pushMessage('Select the sketch of the vent.', 'warn');
      return;
    }
    if (fe.draft.type === 'gusset' && fe.draft.faces.length < 2) {
      get().pushMessage('Select the two faces on both sides of the bend.', 'warn');
      return;
    }
    if (fe.draft.type === 'tabSlot' && (!fe.draft.edge || !fe.draft.slotFace)) {
      get().pushMessage(!fe.draft.edge ? 'Select the edge that gets the tabs.' : 'Select the face that gets the slots.', 'warn');
      return;
    }
    if (fe.draft.type === 'structuralMember' && !doc.sketches[fe.draft.sketchId] && !doc.features.some((f) => f.id === (fe.draft as StructuralMemberFeature).sketchId && f.type === 'sketch3d')) {
      get().pushMessage('Select the path sketch of the structural members.', 'warn');
      return;
    }
    if (fe.draft.type === 'trimExtend' && (!fe.draft.bodies.length || (fe.draft.trimBy === 'bodies' ? !fe.draft.trimBodies.length : !fe.draft.face))) {
      get().pushMessage(!fe.draft.bodies.length ? 'Select the bodies to be trimmed.' : 'Select the trimming boundary.', 'warn');
      return;
    }
    if (fe.draft.type === 'endCap' && !fe.draft.faces.length) {
      get().pushMessage('Select the end faces to cap.', 'warn');
      return;
    }
    if ((fe.draft.type === 'weldGusset' || fe.draft.type === 'weldBead') && fe.draft.faces.length < 2) {
      get().pushMessage('Select the two faces that meet at the corner.', 'warn');
      return;
    }
    if (fe.draft.type === 'deform' && !fe.draft.point) {
      get().pushMessage('Select the face (its centre is the deform point).', 'warn');
      return;
    }
    if (fe.draft.type === 'rip' && !fe.draft.edges.length) {
      get().pushMessage('Select the edges to rip.', 'warn');
      return;
    }
    if (fe.draft.type === 'sweptFlange' && (!doc.sketches[fe.draft.sketchId] || (!doc.sketches[fe.draft.pathSketchId] && !fe.draft.edges.length))) {
      get().pushMessage('Select the profile sketch and the path (a sketch or edges) of the swept flange.', 'warn');
      return;
    }
    if (fe.draft.type === 'sweep' && !doc.sketches[fe.draft.pathSketchId] && !doc.features.some((f) => f.id === (fe.draft as SweepFeature).pathSketchId && f.type === 'helix')) {
      get().pushMessage('Select the path sketch for the sweep.', 'warn');
      return;
    }
    if (fe.draft.type === 'loft' && !doc.sketches[fe.draft.sketchId2] && !fe.draft.face2) {
      get().pushMessage('Select the second profile for the loft (a sketch or a planar face).', 'warn');
      return;
    }
    if (fe.draft.type === 'shell' && fe.draft.thickness <= 0) {
      get().pushMessage('The wall thickness must be larger than zero.', 'warn');
      return;
    }
    // numbers: a depth / angle / size is a positive finite number (the intended design refuses 0, negative, NaN and ∞)
    const bad = (v: unknown) => typeof v === 'number' && !(Number.isFinite(v) && v > 0);
    if (fe.draft.type === 'extrude' && (((fe.draft.end === 'blind' || fe.draft.end === 'midPlane') && bad(fe.draft.depth)) || (fe.draft.direction2 && fe.draft.direction2.end === 'blind' && bad(fe.draft.direction2.depth)))) {
      get().pushMessage('The depth must be a positive number.', 'warn');
      return;
    }
    if (fe.draft.type === 'revolve' && !(Number.isFinite(fe.draft.angle) && fe.draft.angle > 0 && fe.draft.angle <= 360)) {
      get().pushMessage('The angle must lie between 0 and 360 degrees.', 'warn');
      return;
    }
    if (isRoundFeature(fe.draft) && bad(fe.draft.size)) {
      get().pushMessage('The size must be a positive number.', 'warn');
      return;
    }
    // an extrude / revolve needs a closed contour (or an open chain for a thin feature)
    if ((fe.draft.type === 'extrude' || fe.draft.type === 'revolve') && doc.sketches[fe.draft.sketchId] && sketchRegions(doc.sketches[fe.draft.sketchId]).length === 0 && sketchChains(doc.sketches[fe.draft.sketchId]).length === 0) {
      get().pushMessage('The sketch is empty: draw a closed contour first.', 'warn');
      return;
    }
    // instance count: beyond this the rebuild takes minutes (the intended design warns as well)
    const instances = fe.draft.type === 'linearPattern' ? (fe.draft.dir1?.count ?? 1) * (fe.draft.dir2?.count ?? 1) : fe.draft.type === 'circularPattern' ? (fe.draft.count ?? 1) * (fe.draft.dir2?.count ?? 1) : 0;
    if (instances > MAX_PATTERN_INSTANCES) {
      get().pushMessage(`Too many instances (${instances}); the limit is ${MAX_PATTERN_INSTANCES}.`, 'warn');
      return;
    }
    if ((fe.draft.type === 'linearPattern' || fe.draft.type === 'circularPattern' || fe.draft.type === 'sketchPattern' || fe.draft.type === 'curvePattern' || fe.draft.type === 'tablePattern' || fe.draft.type === 'fillPattern' || fe.draft.type === 'variablePattern') && !fe.draft.featureIds.length) {
      get().pushMessage('Select the features to pattern in the Feature Tree.', 'warn');
      return;
    }
    if (fe.draft.type === 'hole' && !fe.featureId && !fe.draft.advanced && !fe.draft.simple && /^Hole\d+$/.test(fe.draft.name)) {
      const size = fe.draft.sizeName ?? 'M6';
      const base = fe.draft.holeType === 'counterbore' ? `CBORE for ${size} Hex Head Bolt` : fe.draft.holeType === 'countersink' ? `CSK for ${size} Flat Head Machine Screw` : fe.draft.holeType === 'tap' ? `${size}x${(fe.draft.pitch ?? 1).toFixed(1)} Tapped Hole` : `${size} Clearance Hole`;
      fe.draft.name = `${base}${doc.features.filter((f) => f.type === 'hole' && f.name.startsWith(base)).length + 1}`;
    }
    history.push(fe.featureId ? `Edit ${fe.draft.name}` : fe.draft.name, doc);
    let features = fe.featureId ? doc.features.map((f) => (f.id === fe.featureId ? fe.draft : f)) : [...doc.features, fe.draft];
    let docIn = doc;
    if (fe.draft.type === 'baseFlange' && !fe.featureId && !doc.features.some((f) => f.type === 'flatPattern')) {
      // the first base flange makes the part sheet metal: Sheet-Metal1 parameters and a suppressed Flat-Pattern1 at the end
      const flat: FlatPatternFeature = { id: newId('f'), type: 'flatPattern', name: 'Flat-Pattern1', suppressed: true };
      features = [...features, flat];
      docIn = { ...doc, sheetMetal: doc.sheetMetal ?? DEFAULT_SHEET_METAL };
    } else if (!fe.featureId && features.some((f) => f.type === 'flatPattern')) {
      // Flat-Pattern1 always stays the last feature, by design
      const flat = features.find((f) => f.type === 'flatPattern')!;
      features = [...features.filter((f) => f !== flat), flat];
    }
    docIn = withFieldEquations(docIn, fe);
    const d: Document = applyEquations({ ...docIn, features }).doc;
    const rebuild = rebuildFor(d, get().rollbackIndex);
    set({ contourPick: false, doc: d, rebuild, featureEdit: null, selectedFeatureId: null, selectedEdges: [], selectedFaces: [], selectedFace: null, hoverEdge: null, dirty: true, tab: get().tab === 'surfaces' || get().tab === 'sheetmetal' || get().tab === 'evaluate' ? get().tab : 'features', ...historyFlags() });
    autosave(d);
    whenRebuilt(rebuild, (rebuild) => {
      const err = rebuild.errors[fe.draft.id];
      if (err) get().pushMessage(`${fe.draft.name}: ${err}`, 'error');
      // Bodies to Keep: the cut split a body (and no choice was made yet): ask which pieces to keep
      if ((rebuild.splitCounts?.[fe.draft.id] ?? 0) > 1 && !(fe.draft as { keepBodies?: number[] }).keepBodies) set({ dialog: 'bodiesToKeep', dialogFeatureId: fe.draft.id });
    });
    // Keep Visible (the pushpin): the Property Panel opens again for the next one
    if (get().pmPinned && !fe.featureId && isRoundFeature(fe.draft)) get().startRound(fe.draft.type);
  },
  cancelFeature() {
    set({ contourPick: false, featureEdit: null, selectedEdges: [], selectedFaces: [], selectedFace: null, hoverEdge: null });
  },
  editFeature(id) {
    const f = get().doc.features.find((x) => x.id === id);
    if (!f || !isSolidFeature(f)) return;
    const body = get().rebuild.bodies[0];
    const selectedEdges = isRoundFeature(f) && body ? f.edges.map((r) => body.edges.find((e) => Math.hypot(e.centroid.x - r.centroid[0], e.centroid.y - r.centroid[1], e.centroid.z - r.centroid[2]) < 0.5)?.id).filter((x): x is string => !!x) : [];
    set({ featureEdit: { featureId: id, draft: { ...f } }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', selectedEdges });
  },
  setFeatureDepth(id, depth) {
    const { doc } = get();
    history.push('Drag Handles', doc);
    const d: Document = { ...doc, features: doc.features.map((f) => (f.id === id && f.type === 'extrude' ? { ...f, depth } : f)) };
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(d);
  },
  toggleSuppress(id) {
    const { doc } = get();
    history.push('Suppress', doc);
    const d: Document = { ...doc, features: doc.features.map((f) => (f.id === id ? { ...f, suppressed: !f.suppressed } : f)) };
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(d);
  },
  setSelectedFeature(selectedFeatureId) {
    set({ selectedFeatureId, selectedFace: null });
  },
  setHoverFace(hoverFace) {
    const cur = get().hoverFace;
    if (cur?.bodyId === hoverFace?.bodyId && cur?.faceId === hoverFace?.faceId) return;
    set({ hoverFace });
  },
  setSelectedFace(selectedFace, additive = false) {
    const { selectedFaces, featureEdit, rebuild, dialog, mateEdit, doc } = get();
    // a click on empty space ends Move with Triad
    if (!selectedFace && get().triadComponentId) set({ triadComponentId: null });
    // Section View ▸ Selected Bodies: a pick adds / removes the body
    const sv = get().sectionEdit;
    if (sv?.pickBodies && selectedFace) {
      const id = selectedFace.bodyId;
      const list = sv.bodies ?? [];
      set({ sectionEdit: { ...sv, bodies: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] } });
      return;
    }
    const de = get().decalEdit;
    if (de && selectedFace) {
      const f = rebuild.bodies.find((b) => b.id === selectedFace.bodyId)?.faces.find((x) => x.id === selectedFace.faceId);
      if (!f || f.curved) return get().pushMessage('A decal goes on a planar face.', 'warn');
      set({ decalEdit: { ...de, face: { normal: f.normal, point: f.centroid } }, selectedFace, selectedFaces: [selectedFace] });
      return;
    }
    // Edge Flange > Angle: the face the flange is perpendicular / parallel to
    if (featureEdit && selectedFace && featureEdit.draft.type === 'edgeFlange' && get().flangePick === 'face') {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const f = body?.faces.find((x) => x.id === selectedFace.faceId);
      if (!f || f.curved) return get().pushMessage('Select a planar face.', 'warn');
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, angleFace: { normal: f.normal, mode: featureEdit.draft.angleFace?.mode ?? 'perpendicular', label: `Face<${body!.faces.indexOf(f) + 1}>` } } }, flangePick: null, selectedFace });
      return;
    }
    // Thread > optional start face
    if (featureEdit && selectedFace && featureEdit.draft.type === 'thread' && get().threadFacePick) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const f = body?.faces.find((x) => x.id === selectedFace.faceId);
      if (!f || f.curved) return get().pushMessage('The start face must be planar.', 'warn');
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, startFace: { normal: f.normal, point: f.centroid, label: `Face<${body!.faces.indexOf(f) + 1}>` } } }, threadFacePick: false, selectedFace });
      return;
    }
    if (featureEdit && selectedFace && featureEdit.draft.type === 'deform') {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!body || !face) return;
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, point: [...face.centroid] as [number, number, number], direction: [...face.normal] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>` } }, selectedFace, selectedFaces: [selectedFace] });
      return;
    }
    const dx = get().autoToleranceEdit;
    if (dx && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!body || !face) return;
      if (face.curved) return get().pushMessage('Product Dimensions work on planar faces in this build.', 'warn');
      const r: DxFaceRef = { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number] };
      const max = dx.kind === 'auto' ? 3 : dx.kind === 'datum' || dx.kind === 'gtol' ? 1 : dx.kind === 'pattern' ? 32 : 2;
      const has = dx.faces.some((x) => Math.hypot(x.point[0] - r.point[0], x.point[1] - r.point[1], x.point[2] - r.point[2]) < 1e-6);
      const faces = has ? dx.faces.filter((x) => Math.hypot(x.point[0] - r.point[0], x.point[1] - r.point[1], x.point[2] - r.point[2]) > 1e-6) : [...dx.faces, r].slice(-max);
      set({ autoToleranceEdit: { ...dx, faces }, selectedFace, selectedFaces: has ? selectedFaces.filter((f) => f.faceId !== selectedFace.faceId) : [...selectedFaces, selectedFace].slice(-max) });
      return;
    }
    if (featureEdit && selectedFace && (featureEdit.draft.type === 'endCap' || featureEdit.draft.type === 'weldGusset' || featureEdit.draft.type === 'weldBead' || featureEdit.draft.type === 'trimExtend')) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!body || !face) return;
      const d = featureEdit.draft;
      if (d.type === 'trimExtend') {
        if (get().trimFocus === 'trimming' && d.trimBy === 'face') {
          if (face.curved) return get().pushMessage('Select a planar face as the trimming boundary.', 'warn');
          set({ featureEdit: { ...featureEdit, draft: { ...d, face: { normal: face.normal, point: face.centroid } } }, selectedFace, selectedFaces: [selectedFace] });
          return;
        }
        const key = get().trimFocus === 'trimming' ? 'trimBodies' : 'bodies';
        const list = d[key];
        const next = list.includes(body.id) ? list.filter((x) => x !== body.id) : [...list, body.id];
        set({ featureEdit: { ...featureEdit, draft: { ...d, [key]: next } }, selectedFace, selectedFaces: [...selectedFaces.filter((f) => f.bodyId !== body.id), ...(list.includes(body.id) ? [] : [selectedFace])] });
        return;
      }
      if (face.curved) return get().pushMessage('Select a planar face.', 'warn');
      const ref = { normal: face.normal, point: face.centroid };
      const same = (r: { point: [number, number, number] }) => Math.hypot(r.point[0] - ref.point[0], r.point[1] - ref.point[1], r.point[2] - ref.point[2]) < 1e-6;
      const has = d.faces.some(same);
      const max = d.type === 'endCap' ? 64 : 2;
      const faces = has ? d.faces.filter((r) => !same(r)) : [...d.faces, ref].slice(-max);
      set({ featureEdit: { ...featureEdit, draft: { ...d, faces } }, selectedFace, selectedFaces: has ? selectedFaces.filter((f) => f.faceId !== selectedFace.faceId) : [...selectedFaces, selectedFace].slice(-max) });
      return;
    }
    if (featureEdit && selectedFace && (featureEdit.draft.type === 'gusset' || featureEdit.draft.type === 'tabSlot')) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!face) return;
      if (face.curved) return get().pushMessage('Select a planar face of the sheet.', 'warn');
      const ref = { normal: face.normal, point: face.centroid };
      const d = featureEdit.draft;
      if (d.type === 'tabSlot') {
        set({ featureEdit: { ...featureEdit, draft: { ...d, slotFace: ref } }, selectedFace, selectedFaces: [selectedFace] });
        return;
      }
      const has = d.faces.some((r) => Math.hypot(r.point[0] - ref.point[0], r.point[1] - ref.point[1], r.point[2] - ref.point[2]) < 1e-6);
      const faces = has ? d.faces.filter((r) => Math.hypot(r.point[0] - ref.point[0], r.point[1] - ref.point[1], r.point[2] - ref.point[2]) > 1e-6) : [...d.faces, ref].slice(-2);
      set({ featureEdit: { ...featureEdit, draft: { ...d, faces } }, selectedFace, selectedFaces: has ? selectedFaces.filter((f) => f.faceId !== selectedFace.faceId) : [...selectedFaces, selectedFace].slice(-2) });
      return;
    }
    if (featureEdit && selectedFace && (featureEdit.draft.type === 'closedCorner' || featureEdit.draft.type === 'cornerRelief' || featureEdit.draft.type === 'convertSheet')) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!face) return;
      const ref = { normal: face.normal, point: face.centroid };
      const d = featureEdit.draft;
      if (d.type === 'convertSheet') {
        if (face.curved) return get().pushMessage('Select a planar face as the fixed face.', 'warn');
        set({ featureEdit: { ...featureEdit, draft: { ...d, fixedFace: ref } }, selectedFace, selectedFaces: [selectedFace] });
        return;
      }
      if (d.type === 'closedCorner' && face.curved) return get().pushMessage('Select the planar end face of a flange.', 'warn');
      if (d.type === 'cornerRelief' && !face.curved) return get().pushMessage('Select the curved faces of the two bends.', 'warn');
      const list = d.type === 'closedCorner' ? d.faces : d.bends;
      const has = selectedFaces.some((f) => f.faceId === selectedFace.faceId);
      const nextFaces = has ? selectedFaces.filter((f) => f.faceId !== selectedFace.faceId) : [...selectedFaces, selectedFace];
      const nextList = has ? list.filter((r) => Math.hypot(r.point[0] - ref.point[0], r.point[1] - ref.point[1], r.point[2] - ref.point[2]) > 1e-6) : [...list, ref];
      set({ featureEdit: { ...featureEdit, draft: d.type === 'closedCorner' ? { ...d, faces: nextList } : { ...d, bends: nextList } }, selectedFace, selectedFaces: nextFaces });
      return;
    }
    // Face Fillet (two faces) / Full Round Fillet (the center face): the faces define the edges
    if (featureEdit && selectedFace && isRoundFeature(featureEdit.draft) && (featureEdit.draft.roundType === 'face' || featureEdit.draft.roundType === 'fullRound' || featureEdit.draft.roundType === 'offsetFace' || featureEdit.draft.roundType === 'faceFace')) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!body || !face) return;
      if (face.curved) return get().pushMessage('Select a planar face.', 'warn');
      const d = featureEdit.draft;
      if (d.roundType === 'fullRound') {
        // Side Face Set 1 / Center Face Set / Side Face Set 2: the center face gives the two edges, the sides confirm them
        const which = get().fullRoundPick;
        const ref = { label: `Face<${body.faces.indexOf(face) + 1}>`, normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number] };
        const sets = { ...(d.fullRound ?? {}), [which]: ref };
        const next: 'side1' | 'center' | 'side2' = which === 'side1' ? 'center' : which === 'center' ? 'side2' : 'side2';
        const centerFace = sets.center ? body.faces.find((x) => new THREE.Vector3(...x.centroid).distanceTo(new THREE.Vector3(...sets.center!.point)) < 1e-6) : undefined;
        const fr = centerFace ? fullRoundEdges(body.edges, centerFace) : null;
        if (sets.center && !fr) return get().pushMessage('The center face needs two parallel edges.', 'warn');
        set({ featureEdit: { ...featureEdit, draft: { ...d, fullRound: sets, ...(fr ? { edges: fr.edges.map((e) => edgeRef(e)), size: fr.size } : {}) } }, fullRoundPick: next, selectedFace, selectedFaces: [selectedFace], selectedEdges: fr ? fr.edges.map((e) => e.id) : [] });
        return;
      }
      const prev = selectedFaces.filter((f) => f.faceId !== selectedFace.faceId && f.bodyId === selectedFace.bodyId).slice(-1);
      const nextFaces = [...prev, selectedFace];
      if (nextFaces.length === 2) {
        const f1 = body.faces.find((f) => f.id === nextFaces[0].faceId)!;
        const shared = faceFilletEdges(body.edges, f1, face);
        if (!shared.length) get().pushMessage('The two faces do not share an edge.', 'warn');
        set({ featureEdit: { ...featureEdit, draft: { ...d, edges: shared.map((e) => edgeRef(e)) } }, selectedFace, selectedFaces: nextFaces, selectedEdges: shared.map((e) => e.id) });
      } else set({ selectedFace, selectedFaces: nextFaces });
      return;
    }
    const pe = get().patternEdit;
    if (pe && selectedFace) {
      // Pattern Direction / Pattern Axis box: a planar face gives its normal, a cylindrical face its axis
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      const isComp = (doc.components ?? []).some((c) => c.id === selectedFace.bodyId);
      if (pe.focus === 'direction' && body && face) {
        const n = body.faces.indexOf(face) + 1;
        const owner = (doc.components ?? []).find((c) => c.id === selectedFace.bodyId)?.name ?? '';
        if (face.curved) {
          const ax = cylinderAxis(body.geometry, face.triangles);
          if (!ax) {
            get().pushMessage('Select a planar face, or a cylindrical face for its axis.', 'warn');
            return;
          }
          get().updatePatternDraft({ dir: [ax.dir.x, ax.dir.y, ax.dir.z], axisPoint: [ax.point.x, ax.point.y, ax.point.z], dirLabel: `Face<${n}>@${owner}` }, 'seeds');
        } else get().updatePatternDraft({ dir: [...face.normal], dirLabel: `Face<${n}>@${owner}` }, 'seeds');
        return;
      }
      // Instances to Skip: a click on an instance of this pattern leaves it out
      if (pe.focus === 'skip') {
        const m = new RegExp(`^${pe.draft.id}~[^~]+~(\\d+)$`).exec(selectedFace.bodyId);
        if (m) get().updatePatternDraft({ skip: [...new Set([...(pe.draft.skip ?? []), Number(m[1])])].sort((x, y) => x - y) }, 'skip');
        return;
      }
      if (isComp) {
        const id = selectedFace.bodyId;
        const has = pe.draft.seeds.includes(id);
        get().updatePatternDraft({ seeds: has ? pe.draft.seeds.filter((x) => x !== id) : [...pe.draft.seeds, id] }, 'seeds');
      }
      return;
    }
    const ex = get().explodeEdit;
    if (ex && selectedFace) {
      const id = selectedFace.bodyId;
      const has = ex.current.componentIds.includes(id);
      get().updateExplodeDraft({ componentIds: has ? ex.current.componentIds.filter((x) => x !== id) : [...ex.current.componentIds, id] });
      return;
    }
    let faces: FaceRef[] = [];
    const measuring = dialog === 'measure';
    if (selectedFace && plasticsFacePick(get, set, selectedFace)) return;
    // Stud > Apply to cylindrical body: the picked cylinder (fitted)
    if (featureEdit && featureEdit.draft.type === 'stud' && featureEdit.draft.onCylinder !== undefined && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      const cyl = body && face && face.curved ? fitCylinder(body.geometry, face.triangles) : null;
      if (!cyl) return get().pushMessage('Select a cylindrical face.', 'warn');
      const near = METRIC_THREADS.reduce((a, t) => (Math.abs(t[1] / 2 - cyl.radius) < Math.abs(a[1] / 2 - cyl.radius) ? t : a), METRIC_THREADS[0]);
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, onCylinder: { ...cyl, label: `Face<${body!.faces.indexOf(face!) + 1}>` }, size: near[0].split('x')[0], diameter: near[1], pitch: near[2] } }, selectedFace });
      return;
    }
    // Wrap > Spline Surface: any face
    if (featureEdit && featureEdit.draft.type === 'wrap' && featureEdit.draft.method === 'spline' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, splineFace: { normal: face.normal, point: face.centroid, label: `Face<${body.faces.indexOf(face) + 1}>` } } }, selectedFace });
        return;
      }
    }
    // Wrap: the picked cylindrical face (fitted once)
    if (featureEdit && featureEdit.draft.type === 'wrap' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      const cyl = body && face && face.curved ? fitCylinder(body.geometry, face.triangles) : null;
      if (body && face && cyl) {
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, face: { ...cyl, label: `Face<${body.faces.indexOf(face) + 1}>` } } }, selectedFace });
        return;
      }
    }
    // Cross-Break: the picked planar face
    if (featureEdit && featureEdit.draft.type === 'crossBreak' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face && !face.curved) {
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, face: { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>` } } }, selectedFace });
        return;
      }
    }
    // Offset Surface: the picked face
    if (featureEdit && featureEdit.draft.type === 'surface' && featureEdit.draft.kind === 'offset' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, face: { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>` } } }, selectedFace });
        return;
      }
    }
    // Patterns > Faces to Pattern: a face picks the feature that made it (toggles it in the seeds)
    if (featureEdit && ['linearPattern', 'circularPattern', 'sketchPattern', 'curvePattern', 'tablePattern', 'fillPattern', 'variablePattern'].includes(featureEdit.draft.type) && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      const d = featureEdit.draft as PatternFeature;
      if (face && !(d.type === 'fillPattern' && !d.fill)) {
        const owner = faceOwner(doc, face.centroid, face.normal);
        if (owner && isSketchBased(owner) && owner.type !== 'sketch' && !doc.features.slice(doc.features.indexOf(owner)).some((x) => x.id === d.id)) {
          const has = d.featureIds.includes(owner.id);
          set({ featureEdit: { ...featureEdit, draft: { ...d, featureIds: has ? d.featureIds.filter((x) => x !== owner.id) : [...d.featureIds, owner.id] } }, selectedFace });
          return;
        }
      }
    }
    // Draft: the Neutral Plane box takes one planar face, then Faces to Draft collects faces
    // Shell ▸ Multi-thickness Faces: a pick adds the face with the thickness of the box
    if (featureEdit && featureEdit.draft.type === 'shell' && get().shellPick === 'multi' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face && !face.curved) {
        const d = featureEdit.draft;
        const t = get().shellMultiThickness;
        const has = (d.multi ?? []).some((m) => new THREE.Vector3(...m.point).distanceTo(new THREE.Vector3(...face.centroid)) < 1e-6);
        set({ featureEdit: { ...featureEdit, draft: { ...d, multi: has ? (d.multi ?? []).filter((m) => new THREE.Vector3(...m.point).distanceTo(new THREE.Vector3(...face.centroid)) >= 1e-6) : [...(d.multi ?? []), { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number], thickness: t }] } }, selectedFace });
        return;
      }
    }
    // Mirror ▸ Faces to Mirror
    if (featureEdit && featureEdit.draft.type === 'mirror' && get().mirrorPick === 'faces' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        const d = featureEdit.draft;
        const ref = { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>@${body.id}` };
        const has = (d.faces ?? []).some((x) => x.label === ref.label);
        set({ featureEdit: { ...featureEdit, draft: { ...d, faces: has ? (d.faces ?? []).filter((x) => x.label !== ref.label) : [...(d.faces ?? []), ref], featureIds: undefined } }, selectedFace });
        return;
      }
    }
    // Replace Face: a face pick adds / removes the face to replace
    if (featureEdit && featureEdit.draft.type === 'surface' && featureEdit.draft.kind === 'replaceFace' && selectedFace) {
      const b = rebuild.bodies.find((x) => x.id === selectedFace.bodyId);
      const fc = b?.faces.find((x) => x.id === selectedFace.faceId);
      if (b && fc) {
        const ref = { normal: [...fc.normal] as [number, number, number], point: [...fc.centroid] as [number, number, number], label: `Face<${b.faces.indexOf(fc) + 1}>` };
        const cur = featureEdit.draft.faces ?? [];
        const has = cur.some((x) => x.label === ref.label);
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, faces: has ? cur.filter((x) => x.label !== ref.label) : [...cur, ref] } }, selectedFace });
        return;
      }
    }
    // Fill Pattern: a planar face pick becomes the fill boundary
    if (featureEdit && featureEdit.draft.type === 'fillPattern' && selectedFace) {
      const b = rebuild.bodies.find((x) => x.id === selectedFace.bodyId);
      const fc = b?.faces.find((x) => x.id === selectedFace.faceId);
      if (!b || !fc || fc.curved) return get().pushMessage('Select a planar face as the fill boundary.', 'warn');
      const prev = featureEdit.draft.fill;
      const fill: PatternFeature['fill'] = { ...faceBoundary(b.geometry, fc.triangles, fc.normal, fc.centroid), spacing: prev?.spacing ?? 10, margin: prev?.margin ?? 2, layout: prev?.layout ?? 'square', sides: prev?.sides, seedCut: prev?.seedCut, label: `Face<${b.faces.indexOf(fc) + 1}>` };
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, fill } }, selectedFace });
      return;
    }
    // Delete Face: a pick adds / removes the face
    if (featureEdit && featureEdit.draft.type === 'deleteFace' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        const ref = { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>` };
        const d = featureEdit.draft;
        const has = d.faces.some((x) => x.label === ref.label);
        set({ featureEdit: { ...featureEdit, draft: { ...d, faces: has ? d.faces.filter((x) => x.label !== ref.label) : [...d.faces, ref] } }, selectedFace });
        return;
      }
    }
    if (featureEdit && featureEdit.draft.type === 'draft' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        if (face.curved) {
          get().pushMessage('Select planar faces for the draft.', 'warn');
          return;
        }
        const ref = { normal: [...face.normal] as [number, number, number], point: [...face.centroid] as [number, number, number], label: `Face<${body.faces.indexOf(face) + 1}>` };
        const d = featureEdit.draft;
        if (get().draftFocus === 'neutral') {
          set({ featureEdit: { ...featureEdit, draft: { ...d, neutral: ref } }, draftFocus: d.draftType === 'parting' || d.draftType === 'step' ? 'parting' : 'faces', selectedFace, selectedFaces: [selectedFace] });
        } else {
          const has = d.faces.some((x) => x.label === ref.label);
          set({ featureEdit: { ...featureEdit, draft: { ...d, faces: has ? d.faces.filter((x) => x.label !== ref.label) : [...d.faces, ref] } }, selectedFace });
        }
        return;
      }
    }
    // Up To Body: a face picks its solid body
    if (featureEdit && featureEdit.draft.type === 'extrude' && featureEdit.draft.end === 'upToBody' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      if (body) {
        const owner = doc.features.find((x) => x.id === body.featureIds[0]);
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, upToBody: { bodyId: body.id, label: owner?.name ?? body.id } } }, selectedFace, selectedFaces: [selectedFace] });
        return;
      }
    }
    // Direction 2 ▸ Up To Surface: the picked planar face ends the second direction
    if (featureEdit && featureEdit.draft.type === 'extrude' && featureEdit.draft.direction2 && get().dir2Pick === 'surface' && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (!face || face.curved) return get().pushMessage('Select a planar face.', 'warn');
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, direction2: { ...featureEdit.draft.direction2, surface: { normal: face.normal, point: face.centroid, label: `Face<${body!.faces.indexOf(face) + 1}>` } } } }, dir2Pick: null, selectedFace, selectedFaces: [selectedFace] });
      return;
    }
    // Up To Surface / Offset From Surface: the picked planar face ends the extrusion
    if (featureEdit && featureEdit.draft.type === 'extrude' && (featureEdit.draft.end === 'upToSurface' || featureEdit.draft.end === 'offsetFromSurface') && selectedFace) {
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        if (face.curved) {
          get().pushMessage('Select a planar face for Up To Surface.', 'warn');
          return;
        }
        const n = body.faces.indexOf(face) + 1;
        set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, surface: { normal: face.normal, point: face.centroid, label: `Face<${n}>` } } }, selectedFace, selectedFaces: [selectedFace] });
        return;
      }
    }
    if (mateEdit && selectedFace) {
      // a face of a component becomes a mate reference (local frame of the component)
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      const comp = (doc.components ?? []).find((c) => c.id === selectedFace.bodyId);
      if (body && face && comp) {
        let normal = new THREE.Vector3(...face.normal), point = new THREE.Vector3(...face.centroid), cylindrical = false, radius: number | undefined;
        if (face.curved) {
          const ax = cylinderAxis(body.geometry, face.triangles);
          if (!ax) {
            get().pushMessage('This curved face is not cylindrical; select a planar or cylindrical face.', 'warn');
            return;
          }
          normal = ax.dir;
          point = ax.point;
          cylindrical = true;
          radius = ax.radius;
        }
        const loc = localRef(normal, point, comp);
        const n = body.faces.indexOf(face) + 1;
        const ref: MateRef = { componentId: comp.id, kind: 'face', label: `Face<${n}>@${comp.name}`, normal: loc.normal, point: loc.point, cylindrical, radius };
        const refs = [...mateEdit.draft.refs.filter((r) => r.label !== ref.label), ref].slice(-mateRefCount(mateEdit.draft.type)) as unknown as [MateRef, MateRef];
        const draft = { ...mateEdit.draft, refs };
        // a sensible default type for the pair
        if (refs.length === 2 && mateRefCount(draft.type) === 2 && STANDARD_MATES.has(draft.type)) {
          const bothCyl = refs.every((r) => r.cylindrical);
          if (bothCyl && draft.type !== 'concentric') draft.type = 'concentric';
          else if (!bothCyl && (draft.type === 'concentric' || draft.type === 'tangent') && !refs.some((r) => r.cylindrical)) draft.type = 'coincident';
          if (!mateEdit.mateId) {
            const base = ({ coincident: 'Coincident', parallel: 'Parallel', perpendicular: 'Perpendicular', tangent: 'Tangent', concentric: 'Concentric', lock: 'Lock', distance: 'Distance', angle: 'Angle', profileCenter: 'ProfileCenter', symmetric: 'Symmetric', width: 'Width', path: 'PathMate', linearCoupler: 'LinearCoupler', distanceLimit: 'LimitDistance', angleLimit: 'LimitAngle', cam: 'CamMate', slot: 'SlotMate', hinge: 'Hinge', gear: 'GearMate', rackPinion: 'RackPinionMate', screw: 'Screw', universalJoint: 'UniversalJoint' } as Record<string, string>)[draft.type];
            draft.name = `${base}${(doc.mates ?? []).filter((m) => m.type === draft.type).length + 1}`;
          }
        }
        set({ mateEdit: { ...mateEdit, draft }, selectedFaces: refs.length === 2 ? [...selectedFaces.slice(-1), selectedFace] : [selectedFace], selectedFace, selectedEdges: [] });
        refreshMatePreview();
        return;
      }
    }
    if (selectedFace) {
      const has = selectedFaces.some((f) => f.faceId === selectedFace.faceId);
      faces = additive || measuring || !!get().refEdit || (featureEdit && featureEdit.draft.type === 'shell') ? (has ? selectedFaces.filter((f) => f.faceId !== selectedFace.faceId) : [...selectedFaces, selectedFace]) : [selectedFace];
    }
    set(measuring ? { selectedFace: faces[faces.length - 1] ?? null, selectedFaces: faces, selectedPlane: null, selectedFeatureId: null } : { selectedFace: faces[faces.length - 1] ?? null, selectedFaces: faces, selectedPlane: null, selectedFeatureId: null, selectedEdges: [] });
    if (featureEdit && featureEdit.draft.type === 'shell') {
      const body = rebuild.bodies[0];
      const refs = faces.map((r) => body?.faces.find((f) => f.id === r.faceId)).filter((f) => !!f).map((f) => ({ normal: f!.normal, point: f!.centroid }));
      set({ featureEdit: { ...featureEdit, draft: { ...featureEdit.draft, faces: refs } } });
    }
  },
  setBodyHidden(id, hidden) {
    const { doc } = get();
    history.push(hidden ? 'Hide Body' : 'Show Body', doc);
    const rest = (doc.hiddenBodies ?? []).filter((x) => x !== id);
    const d: Document = { ...doc, hiddenBodies: hidden ? [...rest, id] : rest };
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, selectedFace: null, selectedFaces: [], ...historyFlags() });
    autosave(d);
  },
  startCurveFeature(type) {
    const { doc, activeSketchId, selectedFeatureId, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Create a solid body first: the sketch is projected onto it.', 'warn');
      return;
    }
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) {
      const used = new Set(doc.features.filter((f) => f.type !== 'sketch' && 'sketchId' in f).map((f) => (f as { sketchId: Id }).sketchId));
      const free = [...doc.features].reverse().find((f) => f.type === 'sketch' && !used.has(f.sketchId));
      if (free && free.type === 'sketch') sketchId = free.sketchId;
    }
    const draft = type === 'splitLine'
      ? { id: newId('f'), type, name: featureName(doc, type), suppressed: false, sketchId: sketchId ?? '' }
      : { id: newId('f'), type, name: featureName(doc, type), suppressed: false, sketchId: sketchId ?? '', reverse: false };
    set({ featureEdit: { featureId: null, draft: draft as SolidFeature }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: 'features', managerTab: 'tree', planePick: false });
  },
  startHelix() {
    const { doc, activeSketchId, selectedFeatureId } = get();
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) get().pushMessage('Open or select a sketch with a circle: the helix starts on that circle.', 'warn');
    const draft: HelixFeature = { id: newId('f'), type: 'helix', name: featureName(doc, 'helix'), sketchId: sketchId ?? '', suppressed: false, definedBy: 'pitchRevolution', pitch: 10, revolutions: 3, height: 30, startAngle: 0, clockwise: true, reverse: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, tab: 'features', managerTab: 'tree', planePick: false });
  },
  startSurface(kind) {
    const { doc, activeSketchId, selectedFeatureId, selectedFace, rebuild } = get();
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    const base = { extrude: 'Surface-Extrude', revolve: 'Surface-Revolve', planar: 'Surface-Plane', offset: 'Surface-Offset', knit: 'Surface-Knit', sweep: 'Surface-Sweep', loft: 'Surface-Loft', trim: 'Surface-Trim', filled: 'Surface-Fill', ruled: 'Surface-Ruled', extend: 'Surface-Extend', untrim: 'Surface-Untrim', deleteHole: 'DeleteHole', flatten: 'Surface-Flatten', thicken: 'Thicken', thickenCut: 'Thicken-Cut', cutWithSurface: 'SurfaceCut', replaceFace: 'Replace Face', boundary: 'Boundary-Surface' }[kind];
    const n = doc.features.filter((f) => f.type === 'surface' && f.kind === kind).length + 1;
    let face: SurfaceFeature['face'] = null;
    if (kind === 'offset' && selectedFace) {
      const b = rebuild.bodies.find((x) => x.id === selectedFace.bodyId);
      const fc = b?.faces.find((x) => x.id === selectedFace.faceId);
      if (b && fc) face = { normal: [...fc.normal] as [number, number, number], point: [...fc.centroid] as [number, number, number], label: `Face<${b.faces.indexOf(fc) + 1}>` };
    }
    const SURFACE_TOOLS: SurfaceFeature['kind'][] = ['filled', 'ruled', 'extend', 'untrim', 'deleteHole', 'flatten', 'thicken', 'thickenCut', 'cutWithSurface', 'replaceFace'];
    // the surface tools work on the selected surface feature (else the last one)
    const surfFeatures = doc.features.filter((f): f is SurfaceFeature => f.type === 'surface' && f.kind !== 'knit');
    const selSurf = surfFeatures.find((f) => f.id === selectedFeatureId) ?? surfFeatures[surfFeatures.length - 1];
    const target = SURFACE_TOOLS.includes(kind) ? selSurf?.id : undefined;
    const draft: SurfaceFeature = { id: newId('f'), type: 'surface', name: `${base}${n}`, suppressed: false, kind, target, thickness: 2, ruledMode: 'tangent', vector: [0, 1, 0], faces: [], fillWhich: 'outer', sketchId: kind === 'offset' || kind === 'knit' || (SURFACE_TOOLS.includes(kind) && kind !== 'filled') ? undefined : sketchId ?? '', depth: 10, angle: 360, distance: 5, face, surfaces: kind === 'knit' ? doc.features.filter((f) => f.type === 'surface' && !f.suppressed && f.kind !== 'knit' && f.kind !== 'trim').map((f) => f.id) : undefined, createSolid: false, ...(kind === 'trim' ? { trimPlane: get().selectedPlane ?? 'front', target: (rebuild.surfaceBodies ?? [])[0]?.featureIds[0], flip: false } : {}) };
    if ((kind === 'extrude' || kind === 'revolve' || kind === 'planar' || kind === 'sweep' || kind === 'loft' || kind === 'boundary') && !sketchId) get().pushMessage('Select the sketch in the Feature Tree (or open it) first.', 'warn');
    if (SURFACE_TOOLS.includes(kind) && kind !== 'ruled' && kind !== 'replaceFace' && !target && !(kind === 'filled' && sketchId)) get().pushMessage('Create a surface first (Extruded, Revolved, Planar … Surface); the tool works on it.', 'warn');
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'surfaces', managerTab: 'tree', planePick: false });
  },
  startIntersect() {
    const { doc, rebuild } = get();
    if (rebuild.bodies.length < 2) {
      get().pushMessage('Intersect needs two solid bodies (Boss-Extrude with Merge result off, or an imported body).', 'warn');
      return;
    }
    const draft: IntersectFeature = { id: newId('f'), type: 'intersect', name: featureName(doc, 'intersect'), suppressed: false, bodies: rebuild.bodies.slice(0, 2).map((b) => b.id), exclude: [], merge: true };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false });
  },
  startDeleteFace() {
    const { doc, rebuild, selectedFace, selectedFaces } = get();
    if (!rebuild.bodies.length) return get().pushMessage('Delete Face needs a body.', 'warn');
    // faces picked beforehand are taken in
    const refs = [...new Map([...selectedFaces, ...(selectedFace ? [selectedFace] : [])].map((r) => [r.faceId, r])).values()].flatMap((r) => {
      const b = rebuild.bodies.find((x) => x.id === r.bodyId);
      const f = b?.faces.find((x) => x.id === r.faceId);
      return f && b ? [{ normal: [...f.normal] as [number, number, number], point: [...f.centroid] as [number, number, number], label: `Face<${b.faces.indexOf(f) + 1}>` }] : [];
    });
    const n = doc.features.filter((f) => f.type === 'deleteFace').length + 1;
    const draft: DeleteFaceFeature = { id: newId('f'), type: 'deleteFace', name: `DeleteFace${n}`, suppressed: false, faces: refs, option: 'patch' };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startDraft() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    const draft: DraftFeature = { id: newId('f'), type: 'draft', name: featureName(doc, 'draft'), suppressed: false, angle: 1, neutral: null, faces: [] };
    set({ featureEdit: { featureId: null, draft }, draftFocus: 'neutral', activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startThread() {
    const { doc, rebuild, selectedEdges } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('A thread needs a solid body with a cylinder or a hole.', 'warn');
      return;
    }
    let edge: ThreadFeature['edge'] = null;
    for (const b of rebuild.bodies) {
      const e = b.edges.find((x) => selectedEdges.includes(x.id) && x.closed && !x.straight);
      if (e) { edge = threadEdge(b.geometry, e.points, b.edges.indexOf(e) + 1); break; }
    }
    const [size, dia, pitch] = edge ? nearestThread(edge.radius * 2, edge.internal) : METRIC_THREADS[7];
    const draft: ThreadFeature = { id: newId('f'), type: 'thread', name: `${size} Thread${doc.features.filter((f) => f.type === 'thread').length + 1}`, suppressed: false, edge, size, diameter: dia, pitch, length: 10, method: 'cut', rightHand: true, angle: 0, offset: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false });
  },
  startWrap() {
    const { doc, rebuild, activeSketchId, selectedFeatureId, selectedFace } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Wrap needs a solid body with a cylindrical face.', 'warn');
      return;
    }
    let sketchId: Id | null = activeSketchId;
    if (!sketchId && selectedFeatureId) {
      const f = doc.features.find((x) => x.id === selectedFeatureId);
      if (f?.type === 'sketch') sketchId = f.sketchId;
    }
    if (!sketchId) sketchId = [...doc.features].reverse().find((f) => f.type === 'sketch' && !doc.features.some((g) => g !== f && 'sketchId' in g && g.type !== 'sketch' && (g as { sketchId?: Id }).sketchId === (f as { sketchId: Id }).sketchId))?.['sketchId' as never] ?? null;
    let face: WrapFeature['face'] = null;
    if (selectedFace) {
      const b = rebuild.bodies.find((x) => x.id === selectedFace.bodyId);
      const fc = b?.faces.find((x) => x.id === selectedFace.faceId);
      const cyl = b && fc && fc.curved ? fitCylinder(b.geometry, fc.triangles) : null;
      if (cyl && b && fc) face = { ...cyl, label: `Face<${b.faces.indexOf(fc) + 1}>` };
    }
    const draft: WrapFeature = { id: newId('f'), type: 'wrap', name: featureName(doc, 'wrap'), sketchId: sketchId ?? '', suppressed: false, kind: 'emboss', depth: 1, face };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false });
  },
  startDeform() {
    const { doc, rebuild, selectedFace } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Deform needs a solid body.', 'warn');
      return;
    }
    const b = selectedFace ? rebuild.bodies.find((x) => x.id === selectedFace.bodyId) : undefined;
    const fc = b?.faces.find((x) => x.id === selectedFace?.faceId);
    const n = doc.features.filter((f) => f.type === 'deform').length + 1;
    const draft: DeformFeature = { id: newId('f'), type: 'deform', name: `Deform${n}`, suppressed: false, kind: 'point', point: fc ? [...fc.centroid] as [number, number, number] : null, direction: fc ? [...fc.normal] as [number, number, number] : [0, 1, 0], label: fc && b ? `Face<${b.faces.indexOf(fc) + 1}>` : undefined, distance: 5, radius: 20, stiffness: 'medium', reverse: false };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  setAppearance(color, bodyId = null) {
    const { doc } = get();
    history.push('Appearance', doc);
    let d: Document;
    if (bodyId) {
      const bodyAppearances = { ...(doc.bodyAppearances ?? {}) };
      if (color) bodyAppearances[bodyId] = color;
      else delete bodyAppearances[bodyId];
      d = { ...doc, bodyAppearances };
    } else d = { ...doc, appearance: color ?? undefined };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setAppearanceProps(target, props) {
    const { doc } = get();
    history.push('Appearance', doc);
    const all = { ...(doc.appearanceProps ?? {}) };
    if (props) all[target ?? ''] = props;
    else delete all[target ?? ''];
    const d: Document = { ...doc, appearanceProps: Object.keys(all).length ? all : undefined };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  setFaceAppearance(face, color) {
    const { doc, rebuild } = get();
    const body = rebuild.bodies.find((b) => b.id === face.bodyId);
    const f = body?.faces.find((x) => x.id === face.faceId);
    if (!f) return;
    history.push('Appearance', doc);
    const same = (a: { normal: number[]; point: number[] }) => Math.hypot(a.point[0] - f.centroid[0], a.point[1] - f.centroid[1], a.point[2] - f.centroid[2]) < 1e-3 && a.normal[0] * f.normal[0] + a.normal[1] * f.normal[1] + a.normal[2] * f.normal[2] > 0.999;
    const list = (doc.faceAppearances ?? []).filter((a) => !same(a));
    if (color) list.push({ normal: [...f.normal] as [number, number, number], point: [...f.centroid] as [number, number, number], color });
    const d: Document = { ...doc, faceAppearances: list };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  addEquationCurve(expr, x1, x2, yexpr) {
    if (!get().activeSketchId) return false;
    if (!(x2 > x1)) {
      get().pushMessage('x2 must be larger than x1.', 'error');
      return false;
    }
    const n = 24;
    const pts: SketchPoint[] = [];
    try {
      for (let i = 0; i <= n; i++) {
        const t = x1 + ((x2 - x1) * i) / n;
        if (yexpr !== undefined) {
          // Parametric: x(t), y(t)
          const look = (name: string) => (name === 't' ? t : name === 'pi' ? Math.PI : name === 'e' ? Math.E : undefined);
          const px = evaluateExpression(expr, look, { radians: true }), py = evaluateExpression(yexpr, look, { radians: true });
          if (!Number.isFinite(px) || !Number.isFinite(py)) throw new Error('the equations have no value at t = ' + t.toFixed(2));
          pts.push({ x: px, y: py });
          continue;
        }
        const x = t;
        const y = evaluateExpression(expr, (name) => (name === 'x' ? x : name === 'pi' ? Math.PI : name === 'e' ? Math.E : undefined), { radians: true });
        if (!Number.isFinite(y)) throw new Error('the equation has no value at x = ' + x.toFixed(2));
        pts.push({ x, y });
      }
    } catch (err) {
      get().pushMessage('Equation Driven Curve: ' + (err as Error).message, 'error');
      return false;
    }
    get().commit('Equation Driven Curve', (s) => addSpline(s, pts, false, { equation: { expr: yexpr !== undefined ? `x=${expr}; y=${yexpr}` : expr, x1, x2 } })[0]);
    return true;
  },
  updatePatternDraft(patch, focus) {
    const pe = get().patternEdit;
    if (!pe) return;
    const next: PatternEdit = { ...pe, draft: { ...pe.draft, ...patch }, focus: focus ?? pe.focus };
    set({ patternEdit: next });
    previewPattern(next);
  },
  startSectionView() {
    const { sectionView, sectionEdit } = get();
    if (sectionEdit) return;
    if (sectionView) {
      set({ sectionView: null });
      return;
    }
    // Keep cap color: the last cap colour comes back
    const kept = getPref<string>('section.capColor');
    set({ sectionEdit: { plane: 'front', offset: 0, flip: false, cap: true, ...(kept ? { capColor: kept, keepCapColor: true } : {}) }, featureEdit: null, managerTab: 'tree' });
  },
  updateSectionView(patch) {
    const se = get().sectionEdit;
    if (se) set({ sectionEdit: { ...se, ...patch } });
  },
  commitSectionView() {
    const se = get().sectionEdit;
    if (!se) return;
    savePrefs({ ...loadPrefs(), 'section.capColor': se.keepCapColor && se.capColor ? se.capColor : '' });
    set({ sectionView: { ...se, pickBodies: false }, sectionEdit: null });
  },
  saveSectionView() {
    // Drawing Section View ▸ Save: the section is kept with the document (a named view for drawings)
    const { sectionEdit: se, doc } = get();
    if (!se) return;
    const list = doc.sectionViews ?? [];
    const name = `Section View${list.length + 1}`;
    const d: Document = { ...doc, sectionViews: [...list, { name, view: { ...se, pickBodies: false } }] };
    set({ doc: d, dirty: true });
    autosave(d);
    get().pushMessage(`${name} saved.`);
  },
  cancelSectionView() {
    set({ sectionEdit: null });
  },
  startCombine() {
    const { doc, rebuild } = get();
    if (rebuild.bodies.length < 2) {
      get().pushMessage('Combine needs at least two solid bodies (Boss-Extrude with Merge result off, or an imported body).', 'warn');
      return;
    }
    const draft: CombineFeature = { id: newId('f'), type: 'combine', name: featureName(doc, 'combine'), suppressed: false, op: 'add', bodies: rebuild.bodies.map((b) => b.id) };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startMoveBody() {
    const { doc, rebuild } = get();
    if (!rebuild.bodies.length) {
      get().pushMessage('Create a solid body first (Extruded Boss/Base).', 'warn');
      return;
    }
    const draft: MoveBodyFeature = { id: newId('f'), type: 'moveBody', name: featureName(doc, 'moveBody'), suppressed: false, bodies: rebuild.bodies.map((b) => b.id), copy: false, copies: 1, translate: [0, 0, 0], rotate: [0, 0, 0], origin: [0, 0, 0] };
    set({ featureEdit: { featureId: null, draft }, activeSketchId: null, tool: 'select', selection: [], tab: 'features', managerTab: 'tree', planePick: false, selectedFace: null, selectedFaces: [] });
  },
  startRefGeom(kind, editId) {
    const { doc } = get();
    const all = doc.refGeometry ?? [];
    const prefix = kind === 'axis' ? 'Axis' : kind === 'point' ? 'Point' : 'Coordinate System';
    const n = all.filter((r) => r.kind === kind).length + 1;
    const ex = editId ? all.find((r) => r.id === editId) : undefined;
    set({ refEdit: { kind, name: ex?.name ?? `${prefix}${n}`, planes: get().selectedPlane ? [get().selectedPlane!] : [], id: editId }, featureEdit: null, mateEdit: null, planeEdit: null, managerTab: 'tree', tab: get().doc.kind === 'assembly' ? 'assembly' : 'features' });
  },
  cancelRefGeom() {
    set({ refEdit: null, selectedEdges: [], selectedFaces: [], selectedFace: null });
  },
  commitRefGeom() {
    const { refEdit, doc } = get();
    if (!refEdit) return;
    const r = refGeometryFrom(refEdit.kind, get().refSelection(), refEdit.id ?? newId('rg'), refEdit.name);
    if (!r) {
      get().pushMessage(refEdit.kind === 'axis' ? 'Select a straight edge, a circular edge, a cylindrical face, or two planes.' : refEdit.kind === 'point' ? 'Select a circular edge (arc center), a face (center of face) or an edge.' : 'Select a point reference (circular edge or face) and directions.', 'warn');
      return;
    }
    history.push(refEdit.id ? `Edit ${r.name}` : r.name, doc);
    const list = (doc.refGeometry ?? []).filter((x) => x.id !== r.id);
    const d: Document = { ...doc, refGeometry: [...list, r] };
    set({ doc: d, refEdit: null, selectedEdges: [], selectedFaces: [], selectedFace: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  deleteRefGeom(id) {
    const { doc } = get();
    history.push('Delete reference geometry', doc);
    const d: Document = { ...doc, refGeometry: (doc.refGeometry ?? []).filter((r) => r.id !== id) };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  startPlane() {
    const { doc } = get();
    const n = Object.values(doc.planes).filter((p) => p.kind === 'reference').length + 1;
    set({ planeEdit: { planeId: null, draft: { name: `Plane${n}`, ref: get().selectedPlane ?? 'front', mode: 'offset', distance: 10, angle: 45, flip: false, count: 1 } }, featureEdit: null, mateEdit: null, selectedEdges: [], managerTab: 'tree', tab: 'features', show: { ...get().show, planes: true } });
  },
  showConfiguration(id) {
    const { doc } = get();
    if (!configurations(doc).some((c) => c.id === id)) return;
    history.push('Show Configuration', doc);
    const r = solveAll(activateConfiguration(doc, id), {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), dirty: true, featureEdit: null, selectedFace: null, selectedFaces: [], selectedEdges: [], ...historyFlags() });
    autosave(r.doc);
  },
  startAddConfiguration(parentId) {
    set({ configEdit: { configId: null, draft: { name: '', description: '', comment: '', parentId } }, featureEdit: null, mateEdit: null, planeEdit: null, managerTab: 'configurations' });
  },
  editConfigurationProperties(id) {
    const c = configurations(get().doc).find((x) => x.id === id);
    if (!c) return;
    set({ configEdit: { configId: id, draft: { name: c.name, description: c.description ?? '', comment: c.comment ?? '', descriptionInBom: c.descriptionInBom, bomName: c.bomName, bomUserName: c.bomUserName, hideChildrenInBom: c.hideChildrenInBom, suppressNew: c.suppressNew, color: c.color } }, featureEdit: null, mateEdit: null, planeEdit: null, managerTab: 'configurations' });
  },
  updateConfigDraft(patch) {
    const ce = get().configEdit;
    if (ce) set({ configEdit: { ...ce, draft: { ...ce.draft, ...patch } } });
  },
  commitConfiguration() {
    const ce = get().configEdit;
    if (!ce) return;
    const { doc } = get();
    if (!ce.draft.name.trim()) {
      get().pushMessage('Enter a configuration name.', 'warn');
      return;
    }
    history.push(ce.configId ? 'Configuration Properties' : 'Add Configuration', doc);
    const d = ce.configId
      ? updateConfiguration(doc, ce.configId, { name: ce.draft.name, description: ce.draft.description, comment: ce.draft.comment, ...cfgOpts(ce.draft) })
      : addConfig(doc, ce.draft.name, { description: ce.draft.description, comment: ce.draft.comment, parentId: ce.draft.parentId, ...cfgOpts(ce.draft) });
    set({ doc: d, configEdit: null, dirty: true, ...historyFlags() });
    autosave(d);
    if (!ce.configId) get().pushMessage(`Configuration "${activeConfiguration(d).name}" added and shown.`);
  },
  cancelConfiguration() {
    set({ configEdit: null });
  },
  deleteConfiguration(id) {
    const { doc } = get();
    if (configurations(doc).length <= 1) {
      get().pushMessage('The last configuration cannot be deleted.', 'warn');
      return;
    }
    history.push('Delete Configuration', doc);
    const r = solveAll(deleteConfig(doc, id), {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), dirty: true, configEdit: null, ...historyFlags() });
    autosave(r.doc);
  },
  setConfigurationDimension(cfgId, name, value) {
    const { doc } = get();
    history.push('Modify Configurations', doc);
    const r = solveAll(setCfgDim(doc, cfgId, name, value), {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
  setConfigurationSuppressed(cfgId, featureId, suppressed) {
    const { doc } = get();
    history.push('Modify Configurations', doc);
    const d = setCfgSup(doc, cfgId, featureId, suppressed);
    set({ doc: d, rebuild: rebuildFor(d, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(d);
  },
  openConfigure(target) {
    set({ configure: { dims: target.dims ?? [], features: target.features ?? [] }, dialog: 'configure', modify: null });
  },
  closeConfigure() {
    set({ configure: null, dialog: null });
  },
  setDimensionInConfigurations(name, value, cfgIds) {
    const { doc } = get();
    history.push('Modify dimension', doc);
    let d = doc;
    const ids = cfgIds === 'all' ? configurations(doc).map((c) => c.id) : cfgIds;
    for (const id of ids) d = setCfgDim(d, id, name, value);
    const r = solveAll(d, {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), dirty: true, modify: null, ...historyFlags() });
    autosave(r.doc);
  },
  updatePlaneDraft(patch) {
    const pe = get().planeEdit;
    if (pe) set({ planeEdit: { ...pe, draft: { ...pe.draft, ...patch } } });
  },
  commitPlane() {
    const { doc, planeEdit, rebuild } = get();
    if (!planeEdit) return;
    const d = planeEdit.draft;
    const base = resolvePlaneDef(doc, d.ref);
    let axis: { origin: [number, number, number]; dir: [number, number, number] } | undefined;
    let mid: { origin: [number, number, number]; n: [number, number, number] } | undefined;
    let normalAt: { origin: [number, number, number]; n: [number, number, number] } | undefined;
    if (d.mode === 'mid') {
      const other = d.ref2 ? resolvePlaneDef(doc, d.ref2) : null;
      const cos = other ? Math.abs(other.n[0] * base.n[0] + other.n[1] * base.n[1] + other.n[2] * base.n[2]) : 0;
      if (!other || d.ref2 === d.ref || cos < 0.9999) {
        get().pushMessage('Mid Plane: select a second plane parallel to the first reference.', 'warn');
        return;
      }
      mid = { origin: other.origin, n: other.n };
    }
    if (d.mode === 'perpendicular' && d.edgeId) {
      const e = rebuild.bodies.flatMap((b) => b.edges).find((x) => x.id === d.edgeId);
      if (e?.straight) {
        const a = e.points[0], b = e.points[e.points.length - 1];
        axis = { origin: [a.x, a.y, a.z], dir: [b.x - a.x, b.y - a.y, b.z - a.z] };
      } else if (e && !e.closed) normalAt = curveEndNormal(e.points, d.flip);
    }
    if (d.mode === 'angle') {
      const e = d.edgeId ? rebuild.bodies.flatMap((b) => b.edges).find((x) => x.id === d.edgeId) : undefined;
      if (!e || !e.straight) {
        get().pushMessage('Select a straight edge as the second reference for the angle.', 'warn');
        return;
      }
      const a = e.points[0], b = e.points[e.points.length - 1];
      axis = { origin: [a.x, a.y, a.z], dir: [b.x - a.x, b.y - a.y, b.z - a.z] };
    }
    history.push(planeEdit.planeId ? `Edit ${d.name}` : d.name, doc);
    const planes = { ...doc.planes };
    const count = d.mode === 'offset' ? Math.max(1, d.count) : 1;
    const existing = Object.values(doc.planes).filter((p) => p.kind === 'reference').length;
    for (let i = 0; i < count; i++) {
      const id = i === 0 && planeEdit.planeId ? planeEdit.planeId : newId('pl');
      const name = i === 0 ? d.name : `Plane${existing + i + 1}`;
      planes[id] = referencePlane(id, name, base, { ref: d.ref, mode: d.mode, distance: d.distance * (i + 1), angle: d.angle, flip: d.flip, axis, ...(mid ? { mid, ref2: d.ref2 } : {}), ...(normalAt ? { normalAt } : {}), ...(d.flipNormal ? { flipNormal: true } : {}) });
    }
    const nd: Document = { ...doc, planes };
    registerPlanes(nd.planes);
    set({ doc: nd, planeEdit: null, selectedEdges: [], dirty: true, ...historyFlags() });
    autosave(nd);
  },
  cancelPlane() {
    set({ planeEdit: null, selectedEdges: [] });
  },
  editPlane(id) {
    const pl = get().doc.planes[id];
    if (!pl?.def) return;
    set({ planeEdit: { planeId: id, draft: { name: pl.name, ref: pl.def.ref, mode: pl.def.mode, distance: pl.def.distance, angle: pl.def.angle, flip: pl.def.flip, count: 1, edgeId: undefined, ref2: pl.def.ref2, flipNormal: pl.def.flipNormal } }, featureEdit: null, managerTab: 'tree', tab: 'features' });
  },
  deletePlane(id) {
    const { doc } = get();
    if (Object.values(doc.sketches).some((s) => s.plane === id)) {
      get().pushMessage('The plane is used by a sketch and cannot be deleted.', 'warn');
      return;
    }
    history.push('Delete plane', doc);
    const planes = { ...doc.planes };
    delete planes[id];
    const nd: Document = { ...doc, planes };
    registerPlanes(nd.planes);
    set({ doc: nd, selectedPlane: null, dirty: true, ...historyFlags() });
    autosave(nd);
  },
  togglePatternSkip(index) {
    const fe = get().featureEdit;
    if (!fe || (fe.draft.type !== 'linearPattern' && fe.draft.type !== 'circularPattern')) return;
    const skip = fe.draft.skip ?? [];
    set({ featureEdit: { ...fe, draft: { ...fe.draft, skip: skip.includes(index) ? skip.filter((i) => i !== index) : [...skip, index] } } });
  },
  setEquations(equations) {
    const { doc } = get();
    history.push('Equations', doc);
    const r = solveAll({ ...doc, equations }, {});
    const rebuild = rebuildFor(r.doc, get().rollbackIndex);
    set({ doc: r.doc, solve: r.solve, rebuild, dirty: true, ...historyFlags() });
    const errs = Object.values(applyEquations(r.doc).result.errors);
    if (errs.length) get().pushMessage(`Equations: ${errs[0]}`, 'warn');
    autosave(r.doc);
  },
  deleteFeature(id, opts = {}) {
    const { doc, activeSketchId } = get();
    const f = doc.features.find((x) => x.id === id);
    if (!f) return;
    const withChildren = opts.children ?? true;
    history.push('Delete feature', doc);
    const sketches = { ...doc.sketches };
    const solve = { ...get().solve };
    const remove = new Set<Id>([id]);
    const deps = featureDependents(doc, id);
    if (withChildren) {
      for (const c of deps.children) remove.add(c.id);
      for (const c of geometricChildren(doc, remove, get().rebuild.errors, (d) => rebuildNow(d, null))) remove.add(c.id);
    }
    if (opts.absorbed) for (const a of deps.absorbed) remove.add(a.id);
    // a sketch that goes also takes its sketch data along
    for (const x of doc.features) if (remove.has(x.id) && x.type === 'sketch') { delete sketches[x.sketchId]; delete solve[x.sketchId]; }
    const d: Document = { ...doc, sketches, features: doc.features.filter((x) => !remove.has(x.id)) };
    const goneSketch = activeSketchId && !d.sketches[activeSketchId];
    set({ doc: d, solve, rebuild: rebuildFor(d, get().rollbackIndex), activeSketchId: goneSketch ? null : activeSketchId, tab: goneSketch ? 'features' : get().tab, selection: [], selectedFeatureId: null, featureEdit: null, confirmDelete: null, dirty: true, ...historyFlags() });
    autosave(d);
  },
  requestDeleteFeature(id) {
    const { doc } = get();
    if (!doc.features.some((x) => x.id === id)) {
      // an assembly component or mate: no children to list
      if ((doc.components ?? []).some((c) => c.id === id) || (doc.mates ?? []).some((m) => m.id === id) || (doc.refGeometry ?? []).some((r) => r.id === id)) set({ confirmDelete: { id, children: [], absorbed: [], checking: false } });
      return;
    }
    const deps = featureDependents(doc, id);
    set({ confirmDelete: { id, children: deps.children.map((c) => c.id), absorbed: deps.absorbed.map((a) => a.id), checking: true } });
    // the geometric children need a trial rebuild: done after the dialog has been drawn
    setTimeout(() => {
      const cd = get().confirmDelete;
      if (!cd || cd.id !== id) return;
      let extra: Id[] = [];
      try {
        extra = geometricChildren(get().doc, new Set([id, ...cd.children]), get().rebuild.errors, (d) => rebuildNow(d, null)).map((c) => c.id);
      } catch {
        /* the dialog still works with the reference children */
      }
      const now = get().confirmDelete;
      if (now && now.id === id) set({ confirmDelete: { ...now, children: [...now.children, ...extra], checking: false } });
    }, 30);
  },
  renameFeature(id, name) {
    const { doc } = get();
    const features = doc.features.map((f) => (f.id === id ? { ...f, name } : f)) as Document['features'];
    const sketches = { ...doc.sketches };
    const f = doc.features.find((x) => x.id === id);
    if (f && f.type === 'sketch') sketches[f.sketchId] = { ...sketches[f.sketchId], name };
    if (!f || f.name === name) return;
    history.push(`Rename ${f.name}`, doc);
    const d: Document = { ...doc, features, sketches };
    set({ doc: d, dirty: true, ...historyFlags() });
    autosave(d);
  },
  commit(label, fn) {
    const { doc, activeSketchId } = get();
    if (!activeSketchId) return;
    const sketch = doc.sketches[activeSketchId];
    if (!sketch) return;
    let next = fn(sketch);
    if (next === sketch) return;
    // Options ▸ For construction of a drawing tool: what it draws becomes construction geometry
    if (get().sketchTool.forConstruction && DRAW_TOOLS.has(get().tool)) {
      const fresh = next.entityOrder.filter((id) => !sketch.entities[id] && next.entities[id] && next.entities[id].kind !== 'point');
      if (fresh.length) next = { ...next, entities: { ...next.entities, ...Object.fromEntries(fresh.map((id) => [id, { ...next.entities[id], construction: true }])) } };
    }
    history.push(label, doc);
    const d = { ...doc, sketches: { ...doc.sketches, [activeSketchId]: next } };
    const r = solveAll(d, get().solve, activeSketchId);
    const res = r.solve[activeSketchId];
    set({ doc: r.doc, solve: r.solve, dirty: true, ...historyFlags() });
    if (res.status === 'conflict') get().pushMessage('The sketch is over defined: conflicting relations are shown in red.', 'error');
    else if (res.status === 'over') get().pushMessage('The sketch is over defined: redundant relations are shown in red.', 'warn');
    autosave(r.doc);
  },
  setRollback(rollbackIndex) {
    if (get().rollbackIndex === rollbackIndex) return;
    set({ rollbackIndex, rebuild: rebuildFor(get().doc, rollbackIndex) });
  },
  setHoverPlane(hoverPlane) {
    if (get().hoverPlane !== hoverPlane) set({ hoverPlane });
  },
  setSelectedPlane(selectedPlane) {
    const re = get().refEdit;
    if (re && selectedPlane) {
      const planes = re.planes.includes(selectedPlane) ? re.planes.filter((p) => p !== selectedPlane) : [...re.planes, selectedPlane].slice(-2);
      set({ refEdit: { ...re, planes }, selectedPlane });
      return;
    }
    const fe = get().featureEdit;
    // Up To Surface / Offset From Surface also accept a reference plane as the end surface
    if (fe && fe.draft.type === 'extrude' && (fe.draft.end === 'upToSurface' || fe.draft.end === 'offsetFromSurface') && selectedPlane) {
      const pl = resolvePlaneDef(get().doc, selectedPlane);
      set({ featureEdit: { ...fe, draft: { ...fe.draft, surface: { normal: pl.n, point: pl.origin, label: pl.name } } }, selectedPlane });
      return;
    }
    if (get().selectedPlane !== selectedPlane) set({ selectedPlane });
  },
  setPrefs(prefs) {
    const system: Record<string, PrefValue> = {}, docProps: Record<string, PrefValue> = {};
    for (const [k, v] of Object.entries(prefs)) (k.startsWith('doc.') ? docProps : system)[k] = v;
    savePrefs({ ...system, ...docProps });
    // options that drive existing settings
    const theme = prefs['colors.background'] === 'Dark' ? 'dark' : 'light';
    if (theme !== get().theme) get().setTheme(theme);
    applyColorScheme(prefs);
    if (!!prefs['view.reverseWheel'] !== get().reverseWheel) get().setReverseWheel(!!prefs['view.reverseWheel']);
    const unitSys = String(prefs['doc.unitSystem']).split(' ')[0] as UnitSystem;
    if (['MKS', 'CGS', 'MMGS', 'IPS'].includes(unitSys) && unitSys !== get().unitSystem) get().setUnitSystem(unitSys);
    // Custom: the Length unit of the Units page is the document unit (QA v0.5.1 F112)
    const lenUnit = ({ millimeters: 'mm', centimeters: 'cm', meters: 'm', inches: 'in' } as const)[String(prefs['doc.lengthUnit']) as 'millimeters'];
    if (String(prefs['doc.unitSystem']).startsWith('Custom') && lenUnit && lenUnit !== get().doc.units) get().setUnits(lenUnit);
    const doc = get().doc;
    const d: Document = { ...doc, properties: docProps };
    set({ prefs, doc: d, gridSize: Math.max(0.1, Number(prefs['doc.gridMajor']) || 10), show: { ...get().show, grid: !!prefs['doc.displayGrid'] }, dirty: get().dirty || JSON.stringify(docProps) !== JSON.stringify(doc.properties ?? {}) });
    autosave(d);
  },
});
