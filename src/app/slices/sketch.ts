/**
 * Store slice "sketch" (QA F36): part of the zustand store of store.ts, split by subject. The state and actions are
 * unchanged; store.ts spreads this slice into the one store, so `useStore` and every selector work as before.
 */
import { piercePoints } from '../../core/sketch/pierce';
import { sketchDimensionName } from '../../core/document/equations';
import { type Document, type Sketch3DFeature, type SolidFeature } from '../../core/document/types';
import { planeOnFace } from '../../core/features/planes';
import { registerPlanes } from '../viewport/camera';
import { autosave } from '../../core/document/persistence';
import { fullyDefineSketch } from '../../core/sketch/fullyDefine';
import { addLine as addLineModel } from '../../core/sketch/model';
import { createSketch, mirrorEntities, newId, ownerOfPoint, removeConstraint, removeEntity, updateConstraint, addConstraint, toggleConstruction } from '../../core/sketch/model';
import type { SketchPoint } from '../../core/sketch/types';
import { dimensionTable, setDimensionValues } from '../../core/document/equations';
import { resolvePlaneDef } from '../../core/features/planes';
import { circularSketchPattern, convertPolylines, copyEntities, linearSketchPattern, offsetEntities, rotateAbout, scaleAbout, transformEntities, translate, chainOf, dropOutsideRelations, copyEntitiesKeep } from '../../core/sketch/edit';
import { planeMatrix } from '../../core/features/solid';
import * as THREE from 'three';
import { type RefSelection } from '../../core/features/refgeom';
import { faceBoundary, offsetPolygon } from '../../core/features/patterns2';
import type { State, StoreSet, StoreGet } from '../store';
import { initialSolve, history, rebuildFor, historyFlags, pointLineDistance, withSpacingDimension, solveAll } from '../store';

type SketchKeys =
  | 'activeSketchId' | 'solve' | 'offsetSurfEdit' | 'contourPick' | 'selectionToolbar' | 'sketch3dEdit'
  | 'sketchTool' | 'selection' | 'selectedConstraint' | 'hover' | 'tool' | 'planePick'
  | 'pendingTool' | 'lastTool' | 'confirmAtCursor' | 'modify' | 'placing' | 'cursor'
  | 'showRelations' | 'setOffsetSurfEdit' | 'commitOffsetOnSurface' | 'addHolePoint' | 'setContourPick' | 'toggleContour'
  | 'dragHandles' | 'dragDimensions' | 'rapidSketch' | 'toggleDragDimensions' | 'toggleRapidSketch' | 'rapidSwitch'
  | 'toggleDragHandles' | 'sketchOnFace' | 'trimFocus' | 'setTrimFocus' | 'setSketchTool' | 'addPierce'
  | 'fullyDefine' | 'applySketchTool' | 'convertEntities' | 'start3DSketch' | 'edit3DSketch' | 'add3DPoint'
  | 'end3DChain' | 'cycle3DPlane' | 'undo3DSegment' | 'commit3DSketch' | 'cancel3DSketch' | 'refSelection'
  | 'setDimensionEquation' | 'setDimensionValue' | 'newSketch' | 'editSketch' | 'exitSketch' | 'discardSketch'
  | 'repeatLastTool' | 'startPlacing' | 'cancelPlacing' | 'mirrorSelection' | 'setTool' | 'setSelection'
  | 'selectConstraint' | 'setHover' | 'deleteSelection' | 'addRelation' | 'updateDimension' | 'renameDimension'
  | 'removeRelation' | 'toggleConstructionSelection' | 'setCursor' | 'startPlanePick' | 'cancelPlanePick' | 'setConfirmAtCursor'
  | 'setModify';

export const sketchSlice = (set: StoreSet, get: StoreGet): Pick<State, SketchKeys> => ({
  activeSketchId: null,
  solve: initialSolve.solve,
  offsetSurfEdit: null,
  contourPick: false,
  selectionToolbar: true,
  sketch3dEdit: null,
  sketchTool: { filletKeepCorners: true, offsetChain: true, keepRelations: true, circEqual: true, infiniteLength: false, lineOrientation: 'sketched', lineAngle: 45, midpointLine: false, addDimensions: false, circleDiameter: true, filletRadius: 5, chamferD1: 5, chamferD2: 5, chamferEqual: true, offsetDistance: 10, offsetReverse: false, offsetConstruction: false, dx: 10, dy: 0, angle: 90, scale: 2, cx: 0, cy: 0, spacing: 20, count: 3, direction: 0, spacing2: 20, count2: 1, direction2: 90, circAngle: 360, circCount: 4, trimMode: 'closest', trimKeep: false, trimIgnore: false, filletDimension: false, chamferMode: 'distance', chamferAngle: 45, offsetBidirectional: false, offsetCapEnds: false, offsetBaseConstruction: false, offsetDimensions: false, forConstruction: false, slotDimensions: false, slotOverall: false, patternDimensions: false, moveMode: 'xy', fromX: 0, fromY: 0, toX: 10, toY: 0 },
  selection: [],
  selectedConstraint: null,
  hover: null,
  tool: 'select',
  planePick: false,
  pendingTool: null,
  lastTool: 'line',
  confirmAtCursor: null,
  modify: null,
  placing: null,
  cursor: null,
  showRelations: true,
  setOffsetSurfEdit(offsetSurfEdit) {
    set({ offsetSurfEdit });
  },
  commitOffsetOnSurface() {
    const { doc, rebuild, selectedFace, selectedFaces, offsetSurfEdit } = get();
    if (!offsetSurfEdit) return;
    const refs = selectedFaces.length ? selectedFaces : selectedFace ? [selectedFace] : [];
    const segments: [[number, number, number], [number, number, number]][] = [];
    for (const r of refs) {
      const b = rebuild.bodies.find((x) => x.id === r.bodyId);
      const f = b?.faces.find((x) => x.id === r.faceId);
      if (!b || !f || f.curved) continue;
      const fb = faceBoundary(b.geometry, f.triangles, f.normal, f.centroid);
      const poly = offsetPolygon(fb.polygon, offsetSurfEdit.reverse ? -offsetSurfEdit.distance : offsetSurfEdit.distance);
      const W = (p: [number, number]): [number, number, number] => [0, 1, 2].map((k) => fb.origin[k] + fb.u[k] * p[0] + fb.v[k] * p[1]) as [number, number, number];
      poly.forEach((p, i) => segments.push([W(p), W(poly[(i + 1) % poly.length])]));
    }
    if (!segments.length) {
      get().pushMessage('Select a planar face to offset its edges on.', 'warn');
      return;
    }
    history.push('Offset On Surface', doc);
    const n = doc.features.filter((f) => f.type === 'sketch3d').length + 1;
    const feat: Sketch3DFeature = { id: newId('f'), type: 'sketch3d', name: `3DSketch${n}`, suppressed: false, segments };
    const d: Document = { ...doc, features: [...doc.features, feat] };
    set({ doc: d, offsetSurfEdit: null, rebuild: rebuildFor(d, get().rollbackIndex), selectedFace: null, selectedFaces: [], dirty: true, ...historyFlags() });
    autosave(d);
  },
  addHolePoint(p) {
    const fe = get().featureEdit;
    if (!fe || fe.draft.type !== 'hole') return;
    set({ featureEdit: { ...fe, draft: { ...fe.draft, points: [...fe.draft.points, p] } } });
  },
  setContourPick(contourPick) {
    set({ contourPick });
  },
  toggleContour(index) {
    const fe = get().featureEdit;
    if (!fe || (fe.draft.type !== 'extrude' && fe.draft.type !== 'revolve')) return;
    const cur = (fe.draft as { contours?: number[] }).contours ?? [];
    const next = cur.includes(index) ? cur.filter((k) => k !== index) : [...cur, index];
    set({ featureEdit: { ...fe, draft: { ...fe.draft, contours: next.length ? next : undefined } as SolidFeature } });
  },
  dragHandles: true,
  dragDimensions: false,
  rapidSketch: false,
  toggleDragDimensions() {
    set({ dragDimensions: !get().dragDimensions });
  },
  toggleRapidSketch() {
    set({ rapidSketch: !get().rapidSketch });
  },
  rapidSwitch(target) {
    const tool = get().tool;
    const { activeSketchId, doc } = get();
    if (activeSketchId) {
      const sk = doc.sketches[activeSketchId];
      if (sk && sk.entityOrder.length === 0) get().discardSketch();
      else get().exitSketch();
    }
    set({ pendingTool: tool !== 'select' ? tool : null });
    if (target.face) get().sketchOnFace(target.face);
    else if (target.plane) get().newSketch(target.plane);
  },
  toggleDragHandles() {
    set({ dragHandles: !get().dragHandles });
  },
  sketchOnFace(ref) {
    const { doc, rebuild } = get();
    const body = rebuild.bodies.find((b) => b.id === ref.bodyId);
    const face = body?.faces.find((f) => f.id === ref.faceId);
    if (!face) return;
    if (face.curved) {
      get().pushMessage('Select a planar face: a sketch cannot be placed on a curved face.', 'warn');
      return;
    }
    const n = Object.keys(doc.planes).length + 1;
    const plane = { ...planeOnFace(newId('pl'), `Face${n}`, face.centroid, face.normal), kind: 'face' as const };
    const d: Document = { ...doc, planes: { ...doc.planes, [plane.id]: plane } };
    registerPlanes(d.planes);
    set({ doc: d, selectedFace: null, hoverFace: null });
    get().newSketch(plane.id);
  },
  trimFocus: 'bodies',
  setTrimFocus(trimFocus) {
    set({ trimFocus });
  },
  setSketchTool(patch) {
    set({ sketchTool: { ...get().sketchTool, ...patch } });
  },
  addPierce(pointId) {
    const { activeSketchId, doc } = get();
    if (!activeSketchId) return;
    const sk = doc.sketches[activeSketchId];
    const p = sk?.points[pointId];
    if (!sk || !p) return;
    const pts = piercePoints(doc, sk);
    if (!pts.length) return get().pushMessage('No curve of another sketch passes through this sketch plane.', 'warn');
    const best = pts.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
    get().commit('Pierce', (k) => {
      const id = newId('c');
      return { ...k, constraints: { ...k.constraints, [id]: { id, kind: 'pierce', refs: [pointId], target: { x: best.x, y: best.y }, pierce: { sketchId: best.sketchId, entityId: best.entityId } } }, constraintOrder: [...k.constraintOrder, id] };
    });
  },
  fullyDefine(opts) {
    const { activeSketchId, doc } = get();
    if (!activeSketchId) return;
    let added = 0, dof = 0;
    get().commit('Fully Define Sketch', (k) => {
      const r = fullyDefineSketch(k, { ...opts, entityIds: opts.selected ? get().selection.filter((x) => x.kind === 'entity').map((x) => x.id) : undefined });
      added = r.added;
      dof = r.dof;
      return r.added ? r.sketch : k;
    });
    void doc;
    get().pushMessage(dof === 0 ? `Fully Define Sketch: ${added} relations and dimensions added; the sketch is fully defined.` : `Fully Define Sketch: ${added} added, ${dof} degrees of freedom left.`, dof === 0 ? 'info' : 'warn');
  },
  applySketchTool() {
    const { tool, selection, sketchTool: p } = get();
    const ids = selection.filter((x) => x.kind === 'entity').map((x) => x.id);
    if (!ids.length && tool !== 'select') {
      get().pushMessage('Select the sketch entities first.', 'warn');
      return;
    }
    const rad = (deg: number) => (deg * Math.PI) / 180;
    if (tool === 'offset') get().commit('Offset Entities', (s) => {
      // one side, or both (Bi-directional); Cap ends joins the open ends; Base geometry turns the originals to construction
      const sides = p.offsetBidirectional ? [false, true] : [p.offsetReverse];
      let k = s;
      const before = new Set(s.entityOrder);
      // Select chain: the whole chain joined to the picked entities is offset
      const oids = p.offsetChain ? chainOf(s, ids) : ids;
      for (const rev of sides) k = offsetEntities(k, oids, p.offsetDistance, rev, p.offsetConstruction);
      const added = k.entityOrder.filter((id) => !before.has(id));
      if (p.offsetBidirectional && p.offsetCapEnds) {
        // the two new end points nearest to each free end of the intended design chain are joined with a line
        const ends: SketchPoint[] = [];
        const count = new Map<string, number>();
        const key = (q: SketchPoint) => `${q.x.toFixed(6)},${q.y.toFixed(6)}`;
        for (const id of ids) {
          const e = s.entities[id];
          if (e?.kind !== 'line' && e?.kind !== 'arc') continue;
          for (const pid of e.kind === 'line' ? [e.p1, e.p2] : [e.start, e.end]) count.set(key(s.points[pid]), (count.get(key(s.points[pid])) ?? 0) + 1);
        }
        for (const [kk, n] of count) if (n === 1) { const [x, y] = kk.split(',').map(Number); ends.push({ x, y }); }
        const newEnds: SketchPoint[] = [];
        for (const id of added) {
          const e = k.entities[id];
          if (e?.kind === 'line') newEnds.push(k.points[e.p1], k.points[e.p2]);
          else if (e?.kind === 'arc') newEnds.push(k.points[e.start], k.points[e.end]);
        }
        for (const end of ends) {
          const near = [...newEnds].sort((a, b) => Math.hypot(a.x - end.x, a.y - end.y) - Math.hypot(b.x - end.x, b.y - end.y)).slice(0, 2);
          if (near.length === 2) k = addLineModel(k, near[0], near[1])[0];
        }
      }
      // Add dimensions: the offset distance of each new line to its original
      if (p.offsetDimensions) {
        for (const id of added) {
          const e = k.entities[id];
          if (e?.kind !== 'line') continue;
          const q = k.points[e.p1];
          const orig = ids.map((o) => s.entities[o]).find((o) => o?.kind === 'line' && Math.abs(pointLineDistance(q, s.points[(o as { p1: string }).p1], s.points[(o as { p2: string }).p2]) - p.offsetDistance) < 1e-6);
          if (orig) k = addConstraint(k, 'distance', [e.p1, orig.id], { value: p.offsetDistance })[0];
          break;
        }
      }
      if (p.offsetBaseConstruction) k = toggleConstruction(k, ids.filter((id) => !k.entities[id]?.construction));
      return k;
    });
    // Keep relations: off, the moved entities let go of the rest; Copy keeps the relations among the copies
    else if (tool === 'moveEntities') get().commit('Move Entities', (s) => transformEntities(p.keepRelations ? s : dropOutsideRelations(s, ids), ids, p.moveMode === 'fromTo' ? translate(p.toX - p.fromX, p.toY - p.fromY) : translate(p.dx, p.dy)));
    else if (tool === 'copyEntities') get().commit('Copy Entities', (s) => (p.keepRelations ? copyEntitiesKeep : copyEntities)(s, ids, p.moveMode === 'fromTo' ? translate(p.toX - p.fromX, p.toY - p.fromY) : translate(p.dx, p.dy)));
    else if (tool === 'rotateEntities') get().commit('Rotate Entities', (s) => transformEntities(p.keepRelations ? s : dropOutsideRelations(s, ids), ids, rotateAbout({ x: p.cx, y: p.cy }, p.angle)));
    else if (tool === 'scaleEntities') get().commit('Scale Entities', (s) => transformEntities(p.keepRelations ? s : dropOutsideRelations(s, ids), ids, scaleAbout({ x: p.cx, y: p.cy }, p.scale)));
    else if (tool === 'linearSketchPattern') get().commit('Linear Sketch Pattern', (s) => withSpacingDimension(s, linearSketchPattern(s, ids, p.spacing * Math.cos(rad(p.direction)), p.spacing * Math.sin(rad(p.direction)), p.count, p.count2, p.spacing2 * Math.cos(rad(p.direction2)), p.spacing2 * Math.sin(rad(p.direction2))), ids, p.patternDimensions));
    else if (tool === 'circularSketchPattern') get().commit('Circular Sketch Pattern', (s) => withSpacingDimension(s, circularSketchPattern(s, ids, { x: p.cx, y: p.cy }, p.circAngle, p.circCount, p.circEqual), ids, p.patternDimensions));
    else return;
    set({ tool: 'select', selection: [] });
  },
  convertEntities() {
    const { doc, activeSketchId, rebuild, selectedEdges, selectedFace } = get();
    const sketch = activeSketchId ? doc.sketches[activeSketchId] : null;
    if (!sketch) {
      get().pushMessage('Convert Entities works inside a sketch: open a sketch and select model edges or a face.', 'warn');
      return;
    }
    const plane = resolvePlaneDef(doc, sketch.plane);
    const M = planeMatrix(plane).invert();
    const toSketch = (v: THREE.Vector3) => { const q = v.clone().applyMatrix4(M); return { x: q.x, y: q.y }; };
    const polylines: { points: { x: number; y: number }[]; closed: boolean }[] = [];
    const edges = rebuild.bodies.flatMap((b) => b.edges);
    for (const id of selectedEdges) {
      const e = edges.find((x) => x.id === id);
      if (e) polylines.push({ points: e.points.map(toSketch), closed: e.closed });
    }
    if (selectedFace) {
      // the boundary of a face: every edge of its body that lies in the face plane
      const body = rebuild.bodies.find((b) => b.id === selectedFace.bodyId);
      const face = body?.faces.find((f) => f.id === selectedFace.faceId);
      if (body && face) {
        const n = new THREE.Vector3(...face.normal), c = new THREE.Vector3(...face.centroid);
        for (const e of body.edges) {
          if (selectedEdges.includes(e.id)) continue;
          if (e.points.every((pt) => Math.abs(pt.clone().sub(c).dot(n)) < 1e-3)) polylines.push({ points: e.points.map(toSketch), closed: e.closed });
        }
      }
    }
    if (!polylines.length) {
      get().pushMessage('Select model edges or a face to convert.', 'warn');
      return;
    }
    get().commit('Convert Entities', (s) => convertPolylines(s, polylines));
    set({ selectedEdges: [], selectedFace: null, selectedFaces: [] });
    get().pushMessage(`${polylines.length} entit${polylines.length === 1 ? 'y' : 'ies'} converted.`);
  },
  start3DSketch() {
    const { doc } = get();
    const n = doc.features.filter((f) => f.type === 'sketch3d').length + 1;
    set({ sketch3dEdit: { featureId: null, name: `3DSketch${n}`, segments: [], plane: 'xy', last: null }, featureEdit: null, activeSketchId: null, planePick: false, tool: 'select', tab: 'sketch', managerTab: 'tree' });
    get().pushMessage('3D Sketch: click points in space; Tab switches the plane (XY, YZ, ZX), double-click ends the chain.');
  },
  edit3DSketch(id) {
    const f = get().doc.features.find((x) => x.id === id);
    if (!f || f.type !== 'sketch3d') return;
    set({ sketch3dEdit: { featureId: id, name: f.name, segments: f.segments.map((s) => [[...s[0]], [...s[1]]] as Sketch3DFeature['segments'][number]), fillets: f.fillets, plane: 'xy', last: null }, featureEdit: null, activeSketchId: null, tab: 'sketch', managerTab: 'tree' });
  },
  add3DPoint(p) {
    const e = get().sketch3dEdit;
    if (!e) return;
    if (!e.last) {
      set({ sketch3dEdit: { ...e, last: p } });
      return;
    }
    if (Math.hypot(p[0] - e.last[0], p[1] - e.last[1], p[2] - e.last[2]) < 1e-6) return;
    set({ sketch3dEdit: { ...e, segments: [...e.segments, [e.last, p]], last: p } });
  },
  end3DChain() {
    const e = get().sketch3dEdit;
    if (e) set({ sketch3dEdit: { ...e, last: null } });
  },
  cycle3DPlane() {
    const e = get().sketch3dEdit;
    if (!e) return;
    const next = e.plane === 'xy' ? 'yz' : e.plane === 'yz' ? 'zx' : 'xy';
    set({ sketch3dEdit: { ...e, plane: next } });
  },
  undo3DSegment() {
    const e = get().sketch3dEdit;
    if (!e || !e.segments.length) return;
    const segs = e.segments.slice(0, -1);
    set({ sketch3dEdit: { ...e, segments: segs, last: segs.length ? segs[segs.length - 1][1] : null } });
  },
  commit3DSketch() {
    const e = get().sketch3dEdit;
    if (!e) return;
    const { doc } = get();
    if (!e.segments.length) {
      set({ sketch3dEdit: null });
      return;
    }
    history.push('3D Sketch', doc);
    const f: Sketch3DFeature = { id: e.featureId ?? newId('f'), type: 'sketch3d', name: e.name, suppressed: false, segments: e.segments, ...(e.fillets?.length ? { fillets: e.fillets } : {}) };
    const features = e.featureId ? doc.features.map((x) => (x.id === e.featureId ? f : x)) : [...doc.features, f];
    const d: Document = { ...doc, features };
    set({ doc: d, sketch3dEdit: null, rebuild: rebuildFor(d, null), selectedFeatureId: f.id, dirty: true, ...historyFlags() });
    autosave(d);
  },
  cancel3DSketch() {
    set({ sketch3dEdit: null });
  },
  refSelection() {
    const { selectedEdges, selectedFaces, selectedFace, rebuild, refEdit, doc } = get();
    const bodies = rebuild.bodies;
    const edges = selectedEdges.map((id) => bodies.flatMap((b) => b.edges).find((e) => e.id === id)).filter(Boolean) as RefSelection['edges'];
    const refs = selectedFaces.length ? selectedFaces : selectedFace ? [selectedFace] : [];
    const faces = refs.map((r) => {
      const b = bodies.find((x) => x.id === r.bodyId);
      const f = b?.faces.find((x) => x.id === r.faceId);
      return b && f ? { face: f, geometry: b.geometry } : null;
    }).filter(Boolean) as RefSelection['faces'];
    const planes = (refEdit?.planes ?? []).map((p) => resolvePlaneDef(doc, p));
    return { edges, faces, planes };
  },
  setDimensionEquation(constraintId, expression) {
    const { doc } = get();
    const dim = dimensionTable(doc).find((d) => d.ref.kind === 'sketch' && d.ref.constraintId === constraintId);
    if (!dim) return;
    const rest = doc.equations.filter((e) => e.target !== dim.name);
    const equations = expression === null || !expression.trim() ? rest : [...rest, { id: newId('eq'), target: dim.name, expression: expression.trim() }];
    get().setEquations(equations);
  },
  setDimensionValue(name, value) {
    const { doc } = get();
    history.push(`Change ${name}`, doc);
    const r = solveAll(setDimensionValues(doc, { [name]: value }), {});
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), dirty: true, ...historyFlags() });
    autosave(r.doc);
  },
  newSketch(plane) {
    const { doc } = get();
    history.push('New sketch', doc);
    const n = doc.features.filter((f) => f.type === 'sketch').length + 1;
    const sketch = createSketch(newId('sk'), `Sketch${n}`, plane);
    const d: Document = {
      ...doc,
      sketches: { ...doc.sketches, [sketch.id]: sketch },
      features: [...doc.features, { id: newId('f'), type: 'sketch', name: sketch.name, sketchId: sketch.id, suppressed: false }],
    };
    const r = solveAll(d, get().solve, sketch.id);
    const tool = get().pendingTool ?? 'select';
    set({ doc: r.doc, solve: r.solve, rebuild: rebuildFor(r.doc, get().rollbackIndex), activeSketchId: sketch.id, tab: 'sketch', tool, lastTool: tool !== 'select' ? tool : get().lastTool, selection: [], dirty: true, planePick: false, pendingTool: null, hoverPlane: null, selectedPlane: null, selectedFace: null, hoverFace: null, featureEdit: null, managerTab: 'tree', messages: [], ...historyFlags() });
    autosave(r.doc);
  },
  editSketch(id) {
    if (!get().doc.sketches[id]) return;
    // Lock Sketch Focus: the open sketch keeps the focus
    if (get().sketchFocusLocked && get().activeSketchId && get().activeSketchId !== id) { get().pushMessage('The sketch focus is locked: right-click ▸ Unlock Sketch Focus first.', 'warn'); return; }
    set({ activeSketchId: id, tab: 'sketch', tool: 'select', selection: [], selectedConstraint: null, planePick: false, featureEdit: null, selectedFace: null, managerTab: 'tree' });
  },
  exitSketch() {
    // leaving a sketch rebuilds the features that use it
    const { doc, rollbackIndex, activeSketchId } = get();
    // the sketch just closed stays selected, so Extruded Boss/Base (or Cut, Revolve…) takes it straight away
    const closed = doc.features.find((f) => f.type === 'sketch' && f.sketchId === activeSketchId && doc.sketches[f.sketchId]?.entityOrder.length);
    set({ activeSketchId: null, sketchFocusLocked: false, tab: 'features', tool: 'select', selection: [], selectedConstraint: null, hover: null, modify: null, managerTab: 'tree', rebuild: rebuildFor(doc, rollbackIndex), ...(closed ? { selectedFeatureId: closed.id } : {}) });
  },
  discardSketch() {
    // undo everything back to the moment the sketch was opened is not tracked; discard = delete if empty, else keep
    const { doc, activeSketchId } = get();
    if (!activeSketchId) return;
    const sk = doc.sketches[activeSketchId];
    if (sk && sk.entityOrder.length === 0) {
      const f = doc.features.find((x) => x.type === 'sketch' && x.sketchId === activeSketchId);
      if (f) get().deleteFeature(f.id);
    }
    get().exitSketch();
  },
  repeatLastTool() {
    if (get().activeSketchId) get().setTool(get().lastTool);
  },
  startPlacing(libraryId, itemId) {
    if (!get().activeSketchId) {
      get().pushMessage('Open a sketch first, then insert the library item.', 'warn');
      return;
    }
    set({ placing: { libraryId, itemId }, tool: 'select', selection: [] });
    get().pushMessage('Click in the graphics area to place the item (Esc cancels).');
  },
  cancelPlacing() {
    set({ placing: null });
  },
  mirrorSelection() {
    const { selection, activeSketchId, doc } = get();
    if (!activeSketchId) return;
    const sk = doc.sketches[activeSketchId];
    const ents = selection.filter((s) => s.kind === 'entity').map((s) => sk.entities[s.id]).filter(Boolean);
    const axis = ents.find((e) => e.kind === 'line' && e.construction) ?? [...ents].reverse().find((e) => e.kind === 'line');
    if (!axis) {
      get().pushMessage('Select the entities to mirror and a (construction) line as the mirror axis.', 'warn');
      return;
    }
    const ids = ents.filter((e) => e.id !== axis.id).map((e) => e.id);
    if (!ids.length) return;
    get().commit('Mirror entities', (s) => mirrorEntities(s, ids, axis.id));
    set({ selection: [] });
  },
  setTool(tool) {
    if (!get().activeSketchId) {
      // by design: picking a sketch tool first asks for a plane
      if (tool !== 'select') {
        set({ pendingTool: tool });
        get().startPlanePick();
      }
      return;
    }
    set({ tool, selectedConstraint: null, modify: null });
    if (tool !== 'select') set({ selection: [], lastTool: tool });
  },
  setSelection(selection) {
    set({ selection, selectedConstraint: null });
  },
  selectConstraint(id) {
    set({ selectedConstraint: id, selection: [] });
  },
  setHover(hover) {
    const cur = get().hover;
    if (cur?.id === hover?.id && cur?.kind === hover?.kind) return;
    set({ hover });
  },
  deleteSelection() {
    const { selection, selectedConstraint } = get();
    if (selectedConstraint) {
      get().removeRelation(selectedConstraint);
      return;
    }
    const { activeSketchId, doc } = get();
    if (!activeSketchId && get().selectedFeatureId) {
      get().requestDeleteFeature(get().selectedFeatureId!);
      return;
    }
    const sk = activeSketchId ? doc.sketches[activeSketchId] : null;
    const ids = new Set(selection.filter((s) => s.kind === 'entity').map((s) => s.id));
    // a selected point deletes the entity that owns it (by design)
    if (sk) for (const s of selection) if (s.kind === 'point' && s.id !== sk.origin) { const o = ownerOfPoint(sk, s.id); if (o) ids.add(o.id); }
    if (!ids.size) return;
    get().commit('Delete', (s) => {
      let out = s;
      for (const id of ids) out = removeEntity(out, id);
      return out;
    });
    set({ selection: [] });
  },
  addRelation(kind, refs, extra = {}) {
    get().commit(`Add relation: ${kind}`, (s) => addConstraint(s, kind, refs, extra)[0]);
  },
  updateDimension(id, patch) {
    get().commit('Modify dimension', (s) => updateConstraint(s, id, patch));
  },
  renameDimension(id, name) {
    const sk = get().activeSketchId ? get().doc.sketches[get().activeSketchId!] : undefined;
    const clean = name.replace(/@.*$/, '').trim();
    if (!sk || !clean || /["@]/.test(clean)) return;
    const old = sketchDimensionName(sk, id);
    get().commit('Rename dimension', (s) => updateConstraint(s, id, { name: clean }));
    const nk = get().doc.sketches[sk.id];
    const fresh = sketchDimensionName(nk, id);
    if (fresh === old || !get().doc.equations.length) return;
    const swap = (t: string) => t.split(`"${old}"`).join(`"${fresh}"`);
    set({ doc: { ...get().doc, equations: get().doc.equations.map((e) => ({ ...e, target: e.target === old ? fresh : e.target, expression: swap(e.expression) })) } });
  },
  removeRelation(id) {
    get().commit('Delete relation', (s) => removeConstraint(s, id));
    set({ selectedConstraint: null });
  },
  toggleConstructionSelection() {
    const ids = get().selection.filter((s) => s.kind === 'entity').map((s) => s.id);
    if (!ids.length) return;
    get().commit('Construction geometry', (s) => toggleConstruction(s, ids));
  },
  setCursor(cursor) {
    set({ cursor });
  },
  startPlanePick() {
    // a plane or face selected beforehand opens the sketch at once (original workflow)
    const pre = get().selectedPlane;
    if (pre) {
      get().newSketch(pre);
      return;
    }
    const face = get().selectedFace;
    if (face) {
      get().sketchOnFace(face);
      return;
    }
    set({ planePick: true, tab: 'sketch', featureEdit: null });
  },
  cancelPlanePick() {
    set({ planePick: false, hoverPlane: null, pendingTool: null });
  },
  setConfirmAtCursor(confirmAtCursor) {
    set({ confirmAtCursor });
  },
  setModify(modify) {
    set({ modify });
  },
});
