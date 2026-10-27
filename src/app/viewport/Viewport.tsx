import { combineMassProperties, massProperties, withExactVolume } from '../../core/features/measure';
import { activeConfiguration, configurationByName } from '../../core/document/configurations';
import { sectionBody, sectionPlaneOf, type SectionPlane } from '../../core/features/section';
import { rebuildAssembly } from '../../core/assembly/assembly';
import { sketchDimensionName } from '../../core/document/equations';
import { getPref } from '../prefs';
import { referencePlane, resolvePlaneDef } from '../../core/features/planes';
import { helixPath, sketch3DChains } from '../../core/features/sweep';
import { matchFaceAppearances } from '../../core/features/faceAppearance';
import { MatePopup } from './MatePopup';
import { DragHandlesHandle } from './DragHandles';
import { ExtrudeHandle } from './ExtrudeHandle';
import { SelectionToolbar } from './SelectionToolbar';
import { Breadcrumbs } from './Breadcrumbs';
import { InsertRotateBar } from './InsertRotateBar';
import { DragDimensionsHandle } from './DragDimensions';
import { renderWithAO } from './ao';
import { MarkupLayer } from '../lifecycleDialogs';
import { refGeometryFrom, refGeometryLines } from '../../core/features/refgeom';
import { curvatureAnalysis, draftAnalysis, thicknessAnalysis, undercutAnalysis } from '../../core/features/analysis';
import { partingLineAnalysis } from '../../core/features/evaluate2';
import { toleranceStatus } from '../../core/document/autoTolerance';
import { commandById, gestureBindings } from '../commands';
import { MATERIAL_LIBRARY } from '../../core/document/materials';

const WOODS = new Set((MATERIAL_LIBRARY.find((c) => c.name === 'Woods')?.materials ?? []).map((m) => m.name));
const isWood = (name?: string) => !!name && WOODS.has(name);
/** Edit Scene: the CSS background of the graphics area (undefined = the default gradient of the theme) */
const sceneBackground = (sc?: { background: string; color?: string }): string | undefined =>
  !sc || sc.background === 'gradient' ? undefined : sc.background === 'white' ? '#ffffff' : sc.background === 'color' ? sc.color ?? '#ffffff' : 'linear-gradient(180deg, #5a5f66 0%, #c9ccd1 62%, #f2f2f2 100%)';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { registerPlanes } from './camera';
import { patternInstancePoints } from '../../core/features/pattern';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { lastRectangle } from '../../core/sketch/lastShape';
import { bodyEdges, matchEdge, subEdgeAt } from '../../core/features/edgesets';
import { roundPreviewShapes } from '../../core/features/round';
import { faceOwner } from '../../core/features/faceOwner';
import { threadPreviewCurves, threadTool } from '../../core/features/thread';
import { isCommandActive, useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { bridge } from './bridge';
import { FeatureTreeBody } from '../panels/FeatureTreeBody';
import { CadCamera, getPlane, planeLabel, REFERENCE_PLANES, sketchToWorld, type PlaneId } from './camera';
import { readColors, SketchScene } from './sketchScene';
import { motionTransforms } from '../../core/assembly/motion';
import { MotionTimeline } from './MotionTimeline';
import { BodyScene } from './bodyScene';
import { mergeGeometries } from '../../core/features/solid';
import { edgeFlangeOnBody, featureGeometry, hemAsFlange, jogOnBody, miterFlangeOnBody, rebuildDocument, sketchedBendOnBody, threadSpecOf } from '../../core/features/rebuild';
import { baseFlangeGeometry, DEFAULT_SHEET_METAL, tabGeometry } from '../../core/features/sheetmetal';
import { sketchChains } from '../../core/features/thin';
import { sketchRegions } from '../../core/features/regions';
import { ribGeometry } from '../../core/features/rib';
import { isRoundFeature, isSketchBased } from '../../core/document/types';
import { ToolController, type ToolContext, type ToolRender } from './tools';
import { Overlay } from './Overlay';
import { Triad } from './ViewCube';
import { MoveTriad } from './MoveTriad';
import { ConfirmationCorner, Hud, ViewSelector, viewDisplayName } from './Hud';
import { Icon, RelationGlyph } from '../../ui/icons';
import { Menu, type MenuItem } from '../../ui/components';
import type { SketchPoint } from '../../core/sketch/types';
import { updateConstraint } from '../../core/sketch/model';
import { hitTest, sketchBounds } from '../../core/sketch/geometry';
import { relationsForSelection } from '../../core/sketch/relations';

let sharedCamera: CadCamera | null = null;
export function getCamera(): CadCamera {
  if (!sharedCamera) sharedCamera = new CadCamera();
  return sharedCamera;
}

const FEEDBACK_ICON: Record<string, React.ReactNode> = {
  point: <Icon.Point size={12} />,
  line: <Icon.Line size={12} />,
  circle: <Icon.Circle size={12} />,
  arc: <Icon.Arc size={12} />,
  spline: <Icon.Spline size={12} />,
  dimension: <Icon.Dimension size={12} />,
  plane: <Icon.Plane size={12} />,
  relation: <Icon.Lock size={12} />,
};

export function Viewport({ onEditDimension }: { onEditDimension: (id: string) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useMemo(() => getCamera(), []);
  const scene = useMemo(() => new SketchScene(), []);
  const bodies = useMemo(() => {
    const b = new BodyScene();
    return b;
  }, []);
  const tools = useMemo(() => new ToolController(), []);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const envCache = useRef<Record<string, THREE.Texture>>({});
  const envRef = useRef<THREE.Texture | null>(null);
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [, bump] = useState(0);
  const [hoverConstraint, setHoverConstraint] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [zoomArea, setZoomArea] = useState<{ active: boolean; a?: { x: number; y: number }; b?: { x: number; y: number } }>({ active: false });
  const [cursorPx, setCursorPx] = useState<{ x: number; y: number } | null>(null);
  const [flyout, setFlyout] = useState(false);
  const labelBoxes = useRef<{ id: string; x: number; y: number; w: number; h: number }[]>([]);
  const toolRenderRef = useRef<ToolRender | null>(null);
  const nav = useRef<{ mode: 'orbit' | 'pan' | 'zoom' | 'roll'; x: number; y: number } | null>(null);
  const lastMiddleDown = useRef(0);

  const st = useStore(useShallow((s) => ({ activeSketchId: s.activeSketchId, doc: s.doc, solve: s.solve, theme: s.theme, openSeq: s.openSeq, tool: s.tool, featureEdit: s.featureEdit, hoverFace: s.hoverFace, rebuild: s.rebuild, mateEdit: s.mateEdit, insertGhost: s.insertGhost, selectedFeatureId: s.selectedFeatureId, hoverFeatureId: s.hoverFeatureId, show: s.show, rollbackIndex: s.rollbackIndex, analysis: s.analysis, sketch3dEdit: s.sketch3dEdit, refEdit: s.refEdit, refSelection: s.refSelection, detailedPreview: s.detailedPreview, sectionEdit: s.sectionEdit, sectionView: s.sectionView, planePick: s.planePick, hoverPlane: s.hoverPlane, selectedPlane: s.selectedPlane, planeEdit: s.planeEdit, selection: s.selection, hover: s.hover, shadedContours: s.shadedContours, displayStyle: s.displayStyle, selectedFace: s.selectedFace, selectedFaces: s.selectedFaces, interferenceHighlight: s.interferenceHighlight, handleDrag: s.handleDrag, dialog: s.dialog, interferenceOpts: s.interferenceOpts, hoverEdge: s.hoverEdge, selectedEdges: s.selectedEdges, isolated: s.isolated, decalEdit: s.decalEdit, motionOpen: s.motionOpen, motionSim: s.motionSim, motionTime: s.motionTime, snapGrid: s.snapGrid, gridSize: s.gridSize, commit: s.commit, setSelection: s.setSelection, toggleSelect: s.toggleSelect, selectConstraint: s.selectConstraint, setHover: s.setHover, dragPoint: s.dragPoint, setModify: s.setModify, pushMessage: s.pushMessage, sketchTool: s.sketchTool, setSelectedFace: s.setSelectedFace, placeInsertGhost: s.placeInsertGhost, sketchOnFace: s.sketchOnFace, newSketch: s.newSketch, rapidSketch: s.rapidSketch, rapidSwitch: s.rapidSwitch, placing: s.placing, placeItem: s.placeItem, add3DPoint: s.add3DPoint, asmTool: s.asmTool, selectComponent: s.selectComponent, addHolePoint: s.addHolePoint, addFormToolPoint: s.addFormToolPoint, contourPick: s.contourPick, toggleContour: s.toggleContour, flangePick: s.flangePick, dir2Pick: s.dir2Pick, updateFeatureDraft: s.updateFeatureDraft, toggleSelectedEdge: s.toggleSelectedEdge, setSelectedPlane: s.setSelectedPlane, setSelectedFeature: s.setSelectedFeature, moveComponent: s.moveComponent, rotateComponent: s.rotateComponent, setHoverFace: s.setHoverFace, setHoverPlane: s.setHoverPlane, setFeedback: s.setFeedback, setCursor: s.setCursor, setHoverEdge: s.setHoverEdge, reverseWheel: s.reverseWheel, end3DChain: s.end3DChain, cycle3DPlane: s.cycle3DPlane, toggleShow: s.toggleShow, cancelPlanePick: s.cancelPlanePick, cancelFeature: s.cancelFeature, cancelPlacing: s.cancelPlacing, insertingComponent: s.insertingComponent, cancelInsertComponent: s.cancelInsertComponent, modify: s.modify, setTool: s.setTool, selectedConstraint: s.selectedConstraint, repeatLastTool: s.repeatLastTool, setConfirmAtCursor: s.setConfirmAtCursor, confirmAtCursor: s.confirmAtCursor, commitFeature: s.commitFeature, setDialog: s.setDialog, startPlanePick: s.startPlanePick, setIsolated: s.setIsolated, addRelation: s.addRelation, toggleConstructionSelection: s.toggleConstructionSelection, mirrorSelection: s.mirrorSelection, deleteSelection: s.deleteSelection, openConfigure: s.openConfigure, setTaskPane: s.setTaskPane, exitSketch: s.exitSketch, feedback: s.feedback, setAppearance: s.setAppearance, editContext: s.editContext, returnToAssembly: s.returnToAssembly, discardSketch: s.discardSketch, triadComponentId: s.triadComponentId, viewName: s.viewName, togglePatternSkip: s.togglePatternSkip, dirty: s.dirty, setAsk: s.setAsk, newDocument: s.newDocument, commandActive: isCommandActive(s) })));
  const sketch = st.activeSketchId ? st.doc.sketches[st.activeSketchId] : null;
  const solve = st.activeSketchId ? st.solve[st.activeSketchId] ?? null : null;
  const plane: PlaneId = sketch?.plane ?? 'front';
  const theme = st.theme;

  // renderer setup
  useEffect(() => {
    const canvas = canvasRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    scene.scene.add(bodies.group, bodies.lights);
    const host = hostRef.current!;
    const ro = new ResizeObserver(() => {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.resize(w, h);
      SketchScene.resolution.set(w, h);
      setSize({ w, h });
    });
    ro.observe(host);
    camera.resize(host.clientWidth, host.clientHeight);
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    SketchScene.resolution.set(host.clientWidth, host.clientHeight);
    setSize({ w: host.clientWidth, h: host.clientHeight });
    camera.onViewName = (n) => useStore.getState().setViewName(viewDisplayName(n));
    // a lost graphics context (driver reset, too much GPU memory) is reported and the scene drawn again when it returns
    const onLost = (e: Event) => { e.preventDefault(); useStore.getState().pushMessage('The graphics context was lost; the graphics area is redrawn as soon as it is back.', 'warn'); };
    const onRestored = () => camera.update();
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    return () => {
      ro.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      // GPU resources go with the graphics area (the renderer may be recreated on the same canvas, so the context stays)
      bodies.dispose();
      renderer.dispose();
    };
  }, [camera, scene, bodies]);

  // a newly opened document is shown whole (Zoom to Fit), by design
  useEffect(() => {
    if (!st.openSeq) return;
    const t = setTimeout(() => zoomFit(), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.openSeq]);

  // orientation: normal to the sketch plane when a sketch opens
  const lastSketch = useRef<string | null>(null);
  useEffect(() => {
    if (st.activeSketchId && st.activeSketchId !== lastSketch.current) {
      camera.normalTo(plane);
      setTimeout(() => zoomFit(), 280);
    }
    lastSketch.current = st.activeSketchId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.activeSketchId]);

  useEffect(() => {
    tools.setTool(st.tool);
    toolRenderRef.current = null;
    bump((n) => n + 1);
  }, [st.tool, tools]);

  // starting a solid feature from a view normal to the sketch rotates to trimetric so the preview is visible (by design)
  const featureEditId = st.featureEdit?.draft.id ?? null;
  useEffect(() => {
    if (featureEditId && ['front', 'top', 'right', 'back', 'bottom', 'left', 'normalTo'].includes(camera.viewName)) camera.setView('trimetric');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [featureEditId]);

  // hovering a face shows the name of the feature that made it, in a small grey tag, by design
  const hoverTag = useMemo(() => {
    const h = st.hoverFace;
    if (!h || st.activeSketchId || st.doc.kind === 'assembly' || st.doc.kind === 'drawing') return null;
    const body = st.rebuild.bodies.find((b) => b.id === h.bodyId);
    const face = body?.faces.find((f) => f.id === h.faceId);
    if (!body || !face || !face.triangles.length) return null;
    const src = body.geometry.index ? body.geometry.toNonIndexed() : body.geometry;
    const p = src.getAttribute('position'), t = face.triangles[0] * 3;
    const a = new THREE.Vector3().fromBufferAttribute(p, t), b = new THREE.Vector3().fromBufferAttribute(p, t + 1), c = new THREE.Vector3().fromBufferAttribute(p, t + 2);
    const ctr = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    try { return faceOwner(st.doc, [ctr.x, ctr.y, ctr.z], [n.x, n.y, n.z])?.name ?? null; } catch { return null; }
  }, [st.hoverFace, st.doc, st.rebuild, st.activeSketchId]);
  // the faces made by a feature, for the tree highlight (selected: blue, pointed at: orange outline)
  const facesOfFeature = useCallback((fid: string | null) => {
    // a component (assembly): all faces of its bodies
    if (fid && st.doc.kind === 'assembly' && !st.mateEdit && !st.insertGhost) return st.rebuild.bodies.filter((b) => b.id === fid).flatMap((b) => b.faces.map((f) => ({ bodyId: b.id, faceId: f.id })));
    if (!fid || st.doc.kind === 'assembly' || st.doc.kind === 'drawing' || st.activeSketchId || st.featureEdit) return [];
    const out: { bodyId: string; faceId: string }[] = [];
    for (const b of st.rebuild.bodies) {
      const src = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
      const p = src.getAttribute('position');
      for (const f of b.faces) {
        if (!f.triangles.length) continue;
        const t = f.triangles[0] * 3;
        const a = new THREE.Vector3().fromBufferAttribute(p, t), bb = new THREE.Vector3().fromBufferAttribute(p, t + 1), c = new THREE.Vector3().fromBufferAttribute(p, t + 2);
        const ctr = a.clone().add(bb).add(c).multiplyScalar(1 / 3);
        const n = bb.clone().sub(a).cross(c.clone().sub(a)).normalize();
        try { if (faceOwner(st.doc, [ctr.x, ctr.y, ctr.z], [n.x, n.y, n.z])?.id === fid) out.push({ bodyId: b.id, faceId: f.id }); } catch { /* not a feature face */ }
      }
    }
    return out;
  }, [st.doc, st.rebuild, st.activeSketchId, st.featureEdit, st.mateEdit, st.insertGhost]);
  const featureFaces = useMemo(() => facesOfFeature(st.selectedFeatureId), [facesOfFeature, st.selectedFeatureId]);
  // a mate selected in the tree (or just made): the faces it joins, found again on the placed components
  const mateFaces = useMemo(() => {
    const mate = st.doc.kind === 'assembly' && !st.mateEdit ? (st.doc.mates ?? []).find((m) => m.id === st.selectedFeatureId) : undefined;
    if (!mate) return [];
    const comps = (st.rebuild as unknown as { components?: import('../../core/document/types').Component[] }).components ?? st.doc.components ?? [];
    const out: { bodyId: string; faceId: string }[] = [];
    for (const r of mate.refs) {
      const c = comps.find((x) => x.id === r.componentId);
      const b = st.rebuild.bodies.find((x) => x.id === r.componentId);
      if (!c || !b || r.kind !== 'face') continue;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(...c.position), new THREE.Quaternion(...c.rotation), new THREE.Vector3(1, 1, 1));
      const n = new THREE.Vector3(...r.normal).applyMatrix3(new THREE.Matrix3().setFromMatrix4(m)).normalize();
      const p = new THREE.Vector3(...r.point).applyMatrix4(m);
      const pos = (b.geometry.index ? b.geometry.toNonIndexed() : b.geometry).getAttribute('position');
      const face = b.faces.find((f) => {
        if (r.cylindrical) {
          if (!f.curved || !f.triangles.length) return false;
          const q = new THREE.Vector3().fromBufferAttribute(pos, f.triangles[0] * 3).sub(p);
          const across = q.addScaledVector(n, -q.dot(n)).length();
          return Math.abs(across - (r.radius ?? across)) < Math.max(0.01, (r.radius ?? 1) * 0.02);
        }
        return !f.curved && Math.abs(new THREE.Vector3(...f.normal).dot(n)) > 0.999 && Math.abs(new THREE.Vector3(...f.centroid).sub(p).dot(n)) < 1e-3;
      });
      if (face) out.push({ bodyId: b.id, faceId: face.id });
    }
    return out;
  }, [st.doc, st.rebuild, st.selectedFeatureId, st.mateEdit]);
  // Insert Component: the chosen part follows the pointer (in the plane through the origin facing the screen)
  const ghostPart = st.insertGhost?.part ?? null;
  const ghostBodies = useMemo(() => {
    if (!ghostPart) return null;
    try { return ghostPart.kind === 'assembly' ? rebuildAssembly(ghostPart).bodies : rebuildDocument(ghostPart, null).bodies; } catch { return null; }
  }, [ghostPart]);
  const [ghostPos, setGhostPos] = useState<THREE.Vector3 | null>(null);
  const hoverFeatureFaces = useMemo(() => (st.hoverFeatureId && st.hoverFeatureId !== st.selectedFeatureId ? facesOfFeature(st.hoverFeatureId) : []), [facesOfFeature, st.hoverFeatureId, st.selectedFeatureId]);
  // a feature selected in the tree shows the dimensions of its sketch on the model, by design
  const selFeature = st.selectedFeatureId ? st.doc.features.find((f) => f.id === st.selectedFeatureId) : undefined;
  const dimSketch = !st.activeSketchId && !st.featureEdit && selFeature && selFeature.type !== 'sketch' && isSketchBased(selFeature) ? st.doc.sketches[(selFeature as { sketchId: string }).sketchId] ?? null : null;
  const regionKeyRef = useRef('');
  const [regionKey, setRegionKey] = useState('');
  const profileSketch = !st.activeSketchId && st.featureEdit && isSketchBased(st.featureEdit.draft) && ['extrude', 'revolve'].includes(st.featureEdit.draft.type) ? st.doc.sketches[(st.featureEdit.draft as { sketchId: string }).sketchId] ?? null : null;
  const otherSketches = useMemo(
    () =>
      st.show.sketches
        ? st.doc.features
            // sketches used by a feature are hidden once the feature exists (by design), except while that feature is edited
            .filter((f, i) => f.type === 'sketch' && f.sketchId !== profileSketch?.id && !f.suppressed && (st.rollbackIndex === null || i < st.rollbackIndex) && f.sketchId !== st.activeSketchId && st.doc.sketches[f.sketchId] && (!st.rebuild.consumedSketches.has(f.sketchId) || (st.featureEdit && isSketchBased(st.featureEdit.draft) && st.featureEdit.draft.sketchId === f.sketchId)))
            .map((f) => { const sid = (f as { sketchId: string }).sketchId; return { sketch: st.doc.sketches[sid], plane: st.doc.sketches[sid].plane }; })
        : [],
    [st.doc, st.activeSketchId, st.show.sketches, st.rollbackIndex, st.rebuild, st.featureEdit, profileSketch],
  );

  // yellow preview of the feature being created / edited (sketch based), or the rounded body (fillet / chamfer)
  // reference curves: the rebuilt helixes plus the one being edited (yellow preview is a curve here)
  // 3D Sketch: the point under the pointer on the active plane through the last point (end points snap)
  const [cursor3d, setCursor3d] = useState<[number, number, number] | null>(null);
  const pick3D = (px: number, py: number): [number, number, number] | null => {
    const e3 = useStore.getState().sketch3dEdit;
    if (!e3) return null;
    for (const seg of e3.segments) for (const end of seg) {
      const q = camera.worldToPixel(new THREE.Vector3(...end));
      if (Math.hypot(q.x - px, q.y - py) < 8) return [...end] as [number, number, number];
    }
    const anchor = new THREE.Vector3(...(e3.last ?? [0, 0, 0]));
    const n = e3.plane === 'xy' ? new THREE.Vector3(0, 0, 1) : e3.plane === 'yz' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const ray = camera.pixelToRay(px, py);
    if (Math.abs(ray.direction.dot(n)) < 0.05) return null;
    const hit = ray.intersectPlane(new THREE.Plane(n, -n.dot(anchor)), new THREE.Vector3());
    if (!hit) return null;
    const r = (v: number) => Math.round(v * 100) / 100;
    return [r(hit.x), r(hit.y), r(hit.z)];
  };
  const previewCurves0 = useMemo(() => {
    // Parting Line Analysis: the parting line drawn as a thick blue curve
    const base = st.analysis?.kind === 'parting' ? [...(st.rebuild.curves ?? []), ...partingLineAnalysis(st.rebuild.bodies, st.analysis.pull, st.analysis.angle).lines.map((pts, i) => ({ id: `parting-${i}`, name: 'Parting Line', points: pts, color: '#1f5fd0' }))] : st.rebuild.curves ?? [];
    const d = st.featureEdit?.draft;
    if (d && d.type === 'helix') {
      const sk = st.doc.sketches[d.sketchId];
      const pts = sk ? helixPath(sk, resolvePlaneDef(st.doc, sk.plane), d) : null;
      return pts ? [...base.filter((c) => c.id !== d.id), { id: d.id, name: d.name, points: pts }] : base;
    }
    const e3 = st.sketch3dEdit;
    if (e3) {
      const out = base.filter((c) => !e3.featureId || !c.id.startsWith(e3.featureId));
      sketch3DChains(e3.segments).forEach((chain, i) => out.push({ id: `s3d-draft-${i}`, name: e3.name, points: chain }));
      const anchor = new THREE.Vector3(...(e3.last ?? [0, 0, 0]));
      if (e3.last && cursor3d) out.push({ id: 's3d-rubber', name: '', points: [anchor.clone(), new THREE.Vector3(...cursor3d)] });
      // the space handle: a square of the active plane around the last point
      const h = 15 * Math.max(0.2, camera.scale * 4);
      const [a, b] = e3.plane === 'xy' ? [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)] : e3.plane === 'yz' ? [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)] : [new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)];
      const sq = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]].map(([x, y]) => anchor.clone().addScaledVector(a, x * h).addScaledVector(b, y * h));
      out.push({ id: 's3d-handle', name: '', points: sq, dashed: true } as (typeof out)[number]);
      return out;
    }
    return base;
  }, [st.rebuild, st.featureEdit, st.doc, st.sketch3dEdit, cursor3d, camera.scale]);
  // Reference Geometry (axes, points, coordinate systems) and the one being defined
  const refSel = st.refEdit ? st.refSelection() : null;
  const refDraft = st.refEdit && refSel ? refGeometryFrom(st.refEdit.kind, refSel, 'refdraft', st.refEdit.name) : null;
  // Fillet / Chamfer: the yellow see-through rounded faces and their cross-section lines, by design
  const roundShapes = useMemo(() => {
    const fe = st.featureEdit;
    const body = st.rebuild.bodies[0];
    if (!fe || !body || !isRoundFeature(fe.draft) || !fe.draft.edges.length || fe.draft.size <= 0) return null;
    const edges = bodyEdges(body.geometry, 'pv');
    // Tangent propagation off: the run that was clicked; Partial preview: the last edge only; No preview: nothing
    const mode = fe.draft.previewMode ?? 'full';
    if (mode === 'none') return null;
    const all = fe.draft.edges.map((r) => { const e = matchEdge(edges, r); return e && fe.draft.type && (fe.draft as { tangentPropagation?: boolean }).tangentPropagation === false && r.pick ? subEdgeAt(e, new THREE.Vector3(...r.pick)) : e; }).filter((e): e is NonNullable<typeof e> => !!e);
    const matched = mode === 'partial' ? all.slice(-1) : all;
    return matched.length ? roundPreviewShapes(matched, fe.draft.type, fe.draft.size) : null;
  }, [st.featureEdit, st.rebuild]);
  const comPoint = useMemo(() => {
    if (!st.doc.centerOfMass || !st.rebuild.bodies.length) return null;
    const list = st.rebuild.bodies.map((b) => withExactVolume(massProperties(b.geometry, 0.001), b.exactVolume));
    return combineMassProperties(list)?.centroid ?? null;
  }, [st.doc.centerOfMass, st.rebuild.bodies]);
  const previewCurves = useMemo(() => {
    const size = Math.max(20, camera.scale * 160);
    const out = [...previewCurves0];
    // Center of Mass feature: a small circle with a cross, as the intended marker
    if (comPoint) {
      const r = Math.max(1, camera.scale * 8);
      const ring = Array.from({ length: 33 }, (_, i) => { const t = (i / 32) * Math.PI * 2; return comPoint.clone().add(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0)); });
      const ring2 = Array.from({ length: 33 }, (_, i) => { const t = (i / 32) * Math.PI * 2; return comPoint.clone().add(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r)); });
      out.push({ id: 'com-ring', name: 'Center of Mass', points: ring, color: '#2b2b2b' } as (typeof out)[number]);
      out.push({ id: 'com-ring2', name: 'Center of Mass', points: ring2, color: '#2b2b2b' } as (typeof out)[number]);
      for (const [k, d] of [['x', new THREE.Vector3(1, 0, 0)], ['y', new THREE.Vector3(0, 1, 0)], ['z', new THREE.Vector3(0, 0, 1)]] as const) out.push({ id: 'com-' + k, name: 'Center of Mass', points: [comPoint.clone().addScaledVector(d, -r * 1.4), comPoint.clone().addScaledVector(d, r * 1.4)], color: '#2b2b2b' } as (typeof out)[number]);
    }
    roundShapes?.lines.forEach((l, i) => out.push({ id: `round-pv-${i}`, name: '', points: l, color: '#eef51c' } as (typeof out)[number]));
    // Thread: the helical paths of the profile in cyan until OK, by design
    const td = st.featureEdit?.draft;
    if (td && td.type === 'thread' && !st.detailedPreview) {
      const spec = threadSpecOf(td);
      // Partial preview: the first three turns only; Shaded: the thread body itself (see preview)
      if (spec && td.previewMode !== 'shaded') threadPreviewCurves(td.previewMode === 'partial' ? { ...spec, length: Math.min(spec.length, spec.pitch * 3) } : spec).forEach((l, i) => out.push({ id: `thread-pv-${i}`, name: '', points: l, color: '#74fbf0' } as (typeof out)[number]));
    }
    const list = [...(st.doc.refGeometry ?? []).filter((r) => r.id !== st.refEdit?.id), ...(refDraft ? [refDraft] : [])];
    for (const r of list) refGeometryLines(r, size).forEach((l, i) => out.push({ id: `ref-${r.id}-${i}`, name: r.name, points: l.points, dashed: l.dashed, color: r.id === 'refdraft' ? '#e8a33a' : l.color } as (typeof out)[number]));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewCurves0, st.doc.refGeometry, JSON.stringify(refDraft), camera.scale, roundShapes, st.featureEdit, st.detailedPreview, comPoint]);
  // Detailed Preview (the eye in a feature Property Panel): the model rebuilt with the feature being edited
  const detailedBodies = useMemo(() => {
    const fe = st.featureEdit;
    if (!st.detailedPreview || !fe) return null;
    const features = fe.featureId ? st.doc.features.map((f) => (f.id === fe.featureId ? fe.draft : f)) : [...st.doc.features, fe.draft];
    try {
      return rebuildDocument({ ...st.doc, features }, null).bodies;
    } catch {
      return null;
    }
  }, [st.detailedPreview, st.featureEdit, st.doc]);
  // Section View: the bodies cut by the section plane (display only; the real bodies stay for picking)
  const section = st.sectionEdit ?? st.sectionView;
  const sectionPlanes = useMemo((): SectionPlane[] => (section ? [{ plane: section.plane, offset: section.offset, flip: section.flip, rotX: section.rotX, rotY: section.rotY }, ...(section.s2 ? [section.s2] : []), ...(section.s3 ? [section.s3] : [])] : []), [section]);
  // Graphics-only section: one plane (or a zonal section) is clipped on the graphics card, without cap
  const gpuSection = !!section?.graphicsOnly && (sectionPlanes.length === 1 || section.method === 'zonal');
  const sectionedBodies = useMemo(() => {
    if (!section || gpuSection) return st.rebuild.bodies;
    const out: typeof st.rebuild.bodies = [];
    for (const b of st.rebuild.bodies) {
      if (section.selectedOnly && section.bodies?.length && !section.bodies.includes(b.id)) {
        out.push(b);
        continue;
      }
      try {
        const r = sectionBody(b.geometry, sectionPlanes, section.method ?? 'planar');
        out.push({ ...b, geometry: r.body, faces: [], edges: [] });
        // the section cap as its own body, so it can have its own colour (Edit Color)
        if (r.cap && section.cap && !section.graphicsOnly) out.push({ ...b, id: b.id + '~cap', geometry: r.cap, faces: [], edges: [] });
      } catch {
        out.push(b);
      }
    }
    return out;
  }, [st.rebuild.bodies, section, sectionPlanes, gpuSection]);
  // one array per change of the bodies, so the body scene keeps its edges between hovers and selections
  const shownBodies = useMemo(() => [...(detailedBodies ?? sectionedBodies), ...(st.rebuild.surfaceBodies ?? [])], [detailedBodies, sectionedBodies, st.rebuild.surfaceBodies]);
  const preview = useMemo(() => {
    if (!st.featureEdit) return null;
    const d = st.featureEdit.draft;
    // the intended design shows no filled preview for a fillet / chamfer, only its yellow lines
    if (isRoundFeature(d)) return null;
    if (d.type === 'rib') {
      // against the body as it is before the rib (editing: rebuild up to the feature)
      const sk = st.doc.sketches[d.sketchId];
      const idx = st.featureEdit.featureId ? st.doc.features.findIndex((f) => f.id === st.featureEdit!.featureId) : -1;
      const body = idx >= 0 ? rebuildDocument(st.doc, idx).bodies[0] : st.rebuild.bodies[0];
      if (!sk || !body) return null;
      return ribGeometry(sk, resolvePlaneDef(st.doc, sk.plane), body.geometry, d).geometry;
    }
    if (d.type === 'baseFlange') {
      const sk = st.doc.sketches[d.sketchId];
      if (!sk) return null;
      const params = st.doc.sheetMetal ?? DEFAULT_SHEET_METAL;
      const plane = resolvePlaneDef(st.doc, sk.plane);
      const open = sketchChains(sk).find((c) => !c.closed && c.points.length >= 2);
      if (open) return baseFlangeGeometry(open.points, plane, params, d.depth, d.midPlane, d.reverse, d.flipDir);
      const regions = sketchRegions(sk);
      return regions.length ? tabGeometry(regions, plane, params, d.reverse) : null;
    }
    if (d.type === 'edgeFlange' || d.type === 'hem') {
      const idx = st.featureEdit.featureId ? st.doc.features.findIndex((f) => f.id === st.featureEdit!.featureId) : -1;
      const bodies = idx >= 0 ? rebuildDocument(st.doc, idx).bodies : st.rebuild.bodies;
      for (const b of bodies) {
        const r = edgeFlangeOnBody(b.geometry, b.id, d.type === 'hem' ? hemAsFlange(d) : d, st.doc.sheetMetal ?? DEFAULT_SHEET_METAL);
        if (r.geometry) return r.geometry;
      }
      return null;
    }
    if (d.type === 'miterFlange' || d.type === 'jog' || d.type === 'sketchedBend') {
      for (const b of st.rebuild.bodies) {
        try {
          const r = d.type === 'jog' ? jogOnBody(st.doc, b.geometry, b.id, d, st.doc.sheetMetal ?? DEFAULT_SHEET_METAL) : d.type === 'sketchedBend' ? sketchedBendOnBody(st.doc, b.geometry, b.id, d, st.doc.sheetMetal ?? DEFAULT_SHEET_METAL) : miterFlangeOnBody(st.doc, b.geometry, b.id, d, st.doc.sheetMetal ?? DEFAULT_SHEET_METAL);
          if (r.geometry) return d.type !== 'miterFlange' ? (r as { region?: THREE.BufferGeometry }).region ?? r.geometry : r.geometry;
        } catch {
          return null;
        }
      }
      return null;
    }
    // Thread > Shaded preview: the thread body in the light preview colour
    if (d.type === 'thread') {
      const spec = d.previewMode === 'shaded' ? threadSpecOf(d) : null;
      return spec ? threadTool(spec) : null;
    }
    if (!isSketchBased(d)) return null;
    // Up To Next / Up To Surface look at the body as it is before the feature
    const idx = st.featureEdit.featureId ? st.doc.features.findIndex((f) => f.id === st.featureEdit!.featureId) : -1;
    const body = idx >= 0 ? rebuildDocument(st.doc, idx).bodies[0] : st.rebuild.bodies[0];
    return featureGeometry(st.doc, d, 200, body?.geometry).geometry;
  }, [st.featureEdit, st.doc, st.rebuild]);
  const roundPreview = useMemo(() => {
    const fe = st.featureEdit;
    const body = st.rebuild.bodies[0];
    if (!fe || !body) return null;
    // a fillet / chamfer is only previewed (yellow) until OK, by design; the eye (Detailed Preview) shows the result
    if (isRoundFeature(fe.draft)) return null;
    if (fe.draft.type === 'mirror' || fe.draft.type === 'linearPattern' || fe.draft.type === 'circularPattern' || fe.draft.type === 'hole' || fe.draft.type === 'shell' || fe.draft.type === 'moveBody') {
      // preview = the document rebuilt with the draft appended (or replacing the edited feature)
      // Partial preview (patterns): only every second instance is shown
      const pd = fe.draft as { partialPreview?: boolean; skip?: number[] };
      const draft = pd.partialPreview ? { ...fe.draft, skip: [...(pd.skip ?? []), ...Array.from({ length: 200 }, (_, i) => 2 * i)] } as typeof fe.draft : fe.draft;
      const features = fe.featureId ? st.doc.features.map((f) => (f.id === fe.featureId ? draft : f)) : [...st.doc.features, draft];
      try {
        const r = rebuildDocument({ ...st.doc, features }, st.rollbackIndex === null ? null : st.rollbackIndex + 1);
        // Move/Copy: every body where it lands (the moved ones and their copies) in one preview
        if (fe.draft.type === 'moveBody' && r.bodies.length > 1) return mergeGeometries(r.bodies.map((b) => { const g = (b.geometry.index ? b.geometry.toNonIndexed() : b.geometry).clone(); for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k); return g; }));
        return r.bodies[0]?.geometry ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }, [st.featureEdit, st.rebuild, st.doc, st.rollbackIndex]);

  const planesToDraw = useMemo(() => {
    const refIds = Object.values(st.doc.planes).filter((p) => p.kind === 'reference').map((p) => p.id);
    const ids: PlaneId[] = [...REFERENCE_PLANES, ...refIds];
    if (st.planePick) return ids.map((id) => ({ id, highlight: st.hoverPlane === id || st.selectedPlane === id }));
    const out: { id: PlaneId; highlight: boolean }[] = [];
    for (const id of ids) {
      const hl = st.hoverPlane === id || st.selectedPlane === id || st.planeEdit?.planeId === id;
      if (st.show.planes || hl) out.push({ id, highlight: hl });
    }
    // preview of the plane being defined
    if (st.planeEdit) {
      const d = st.planeEdit.draft;
      const base = resolvePlaneDef(st.doc, d.ref);
      const e = d.edgeId ? st.rebuild.bodies.flatMap((b) => b.edges).find((x) => x.id === d.edgeId) : undefined;
      const axis = e && e.straight ? { origin: [e.points[0].x, e.points[0].y, e.points[0].z] as [number, number, number], dir: [e.points[e.points.length - 1].x - e.points[0].x, e.points[e.points.length - 1].y - e.points[0].y, e.points[e.points.length - 1].z - e.points[0].z] as [number, number, number] } : undefined;
      if (d.mode !== 'angle' || axis) {
        const prev = referencePlane('__planePreview', d.name, base, { ref: d.ref, mode: d.mode, distance: d.distance, angle: d.angle, flip: d.flip, axis });
        registerPlanes({ ...st.doc.planes, __planePreview: prev });
        out.push({ id: '__planePreview', highlight: true });
      }
    }
    return out;
  }, [st.planePick, st.hoverPlane, st.selectedPlane, st.show.planes, st.doc.planes, st.planeEdit, st.rebuild.bodies]);

  /** half-size of the drawn reference planes in world units (about a fifth of the graphics area) */
  const planeHalf = useCallback(() => Math.max(40, camera.scale * Math.min(size.w, size.h) * 0.19), [camera, size]);

  const draw = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer || !hostRef.current) return;
    const colors = readColors(hostRef.current);
    const tr = toolRenderRef.current;
    const selection = new Set(st.selection.filter((s) => s.kind === 'entity').map((s) => s.id));
    // a rectangle just drawn stays selected (light blue) while its Property Panel is open, by design
    if (sketch && !tr?.preview?.length && ['rectangle', 'centerRectangle', 'rect3Corner', 'rect3Center', 'parallelogram'].includes(st.tool)) for (const id of lastRectangle(sketch) ?? []) selection.add(id);
    const selectedPoints = new Set(st.selection.filter((s) => s.kind === 'point').map((s) => s.id));
    scene.update({
      // while a sketch based feature is defined, its profile sketch is shown in full (lines, shaded contour), by design
      sketch: sketch ?? profileSketch,
      plane: sketch ? plane : profileSketch?.plane ?? plane,
      solve: sketch ? solve : profileSketch ? st.solve[profileSketch.id] ?? null : null,
      selection,
      selectedPoints,
      hover: st.hover,
      hoverIds: new Set(regionKey ? regionKey.split(',') : []),
      pickedRegions: profileSketch && (st.featureEdit?.draft as { contours?: number[] } | undefined)?.contours ? sketchRegions(profileSketch).filter((_, i) => (st.featureEdit!.draft as { contours?: number[] }).contours!.includes(i)) : [],
      preview: tr?.preview ?? [],
      previewPoints: tr?.previewPoints ?? [],
      showGrid: st.show.grid && !!sketch,
      scale: camera.scale,
      colors,
      otherSketches,
      planes: planesToDraw,
      showOrigin: st.show.origin,
      planeSize: planeHalf(),
      shadedContours: st.shadedContours,
    });
    bodies.updateLight(camera.rotation);
    const faceColors = st.analysis?.kind === 'draft' ? draftAnalysis(st.rebuild.bodies, st.analysis.pull, st.analysis.angle, st.analysis.classify !== false).colors : st.analysis?.kind === 'parting' ? partingLineAnalysis(st.rebuild.bodies, st.analysis.pull, st.analysis.angle).colors : st.analysis?.kind === 'tolerance' ? toleranceStatus(st.rebuild.bodies, st.doc.autoTolerance).colors : st.analysis?.kind === 'thickness' ? thicknessAnalysis(st.rebuild.bodies, st.analysis.target, st.analysis.mode, st.analysis.resolution).colors : st.analysis?.kind === 'undercut' ? undercutAnalysis(st.rebuild.bodies, st.analysis.pull).colors : st.analysis?.kind === 'curvature' ? curvatureAnalysis(st.rebuild.bodies) : st.doc.faceAppearances?.length ? matchFaceAppearances({ faceAppearances: [...(st.doc.faceAppearances ?? []), ...(st.rebuild.extraAppearances ?? [])] }, st.rebuild.bodies) : undefined;
    bodies.update({ zebra: st.show.zebra, faceColors, bodies: shownBodies, displayStyle: st.displayStyle, hoverFace: st.hoverFace, selectedFace: st.selectedFace, selectedFaces: st.selectedFaces, preview: st.interferenceHighlight ?? (detailedBodies ? null : preview), previewOnTop: !!st.featureEdit && isRoundFeature(st.featureEdit.draft) && !detailedBodies, previewWire: st.handleDrag, featureFaces, mateFaces, featureHot: !!st.hoverFeatureId && st.hoverFeatureId === st.selectedFeatureId, hoverFeatureFaces, transparentBodies: [...(st.doc.transparentBodies ?? []), ...(st.mateEdit && st.mateEdit.draft.refs.length && getPref('assembly.mateFirstTransparent') !== false ? [st.mateEdit.draft.refs[0].componentId] : st.interferenceHighlight && st.dialog === 'interference' && st.interferenceOpts.transparent ? st.rebuild.bodies.map((b) => b.id) : []), ...(st.doc.components ?? []).filter((c) => c.envelope).map((c) => c.id)], replaceBody: detailedBodies ? null : roundPreview, hoverEdge: st.hoverEdge, selectedEdges: st.selectedEdges, scale: camera.scale, bodyColor: activeConfiguration(st.doc).color ?? st.doc.appearance ?? st.doc.material?.color, bodyColors: { ...Object.fromEntries((st.doc.components ?? []).map((c) => [c.id, (configurationByName(c.part, c.configuration)?.color ?? c.part.appearance ?? c.part.material?.color) as string | undefined]).filter((x) => !!x[1])), ...Object.fromEntries(Object.entries(st.doc.bodyMaterials ?? {}).map(([k, m]) => [k, m.color])), ...(st.doc.bodyAppearances ?? {}), ...(section?.capColor ? Object.fromEntries(st.rebuild.bodies.map((b) => [b.id + '~cap', section.capColor!])) : {}) }, hiddenBodies: st.isolated ? [...(st.doc.hiddenBodies ?? []), ...(st.rebuild.autoHidden ?? []), ...st.rebuild.bodies.map((b) => b.id).filter((id) => !st.isolated!.includes(id))] : [...(st.doc.hiddenBodies ?? []), ...(st.rebuild.autoHidden ?? [])], decals: [...(st.doc.decals ?? []).filter((x) => x.id !== st.decalEdit?.id), ...(st.decalEdit?.face ? [{ ...st.decalEdit, id: 'draft', face: st.decalEdit.face }] : [])], realisticShading: st.show.realisticShading, shadows: st.show.shadows, floor: { reflections: st.doc.scene?.floorReflections, align: st.doc.scene?.floorAlign, offset: st.doc.scene?.floorOffset }, woodBodies: (st.doc.components ?? []).filter((c) => isWood(c.part.material?.name)).map((c) => c.id), wooden: isWood(st.doc.material?.name), shinyBodies: (st.doc.components ?? []).filter((c) => (c.part.material?.density ?? 0) > 2500).map((c) => c.id), metallic: (st.doc.material?.density ?? 0) > 2500, curves: previewCurves, colors: { hover: colors.hover, selected: colors.selected } });
    // Motion Study playback: the motors turn their components (display only)
    const ms = st.doc.motionStudy;
    bodies.setMotion(st.motionOpen && st.doc.kind === 'assembly' && ms && (ms.motors.length || ms.keys?.length || ms.wizard?.length || st.motionSim) ? motionTransforms(st.doc, (st.rebuild as { components?: import('../../core/document/types').Component[] }).components ?? st.doc.components ?? [], ms, st.motionTime, st.motionSim) : null);
    // Realistic Shading Graphics: a studio environment for reflections, filmic tone mapping
    // Edit Scene ▸ Environment: the studio room, or a sky / hall made of a colour gradient
    const envName = st.doc.scene?.environment ?? 'studio';
    if (st.show.realisticShading && envName !== 'none' && !envCache.current[envName]) {
      const pm = new THREE.PMREMGenerator(renderer);
      envCache.current[envName] = pm.fromScene(envName === 'studio' ? new RoomEnvironment() : gradientEnvironment(envName), 0.04).texture;
      pm.dispose();
    }
    envRef.current = envName === 'none' ? null : envCache.current[envName] ?? null;
    scene.scene.environment = st.show.realisticShading ? envRef.current : null;
    scene.scene.environmentRotation.set(0, ((st.doc.scene?.envRotation ?? 0) * Math.PI) / 180, 0);
    scene.scene.environmentIntensity = st.doc.scene?.reflectivity ?? 1;
    bodies.brightness = st.doc.scene?.brightness ?? 1;
    // Graphics-only section: clipping planes keep the side behind every section plane
    renderer.clippingPlanes = gpuSection ? sectionPlanes.map((sp) => { const p = sectionPlaneOf(sp); return new THREE.Plane(p.normal.clone().negate(), p.normal.dot(p.point) + 1e-3); }) : []; // a hair past the plane: a model face on the plane stays whole
    renderer.toneMapping = st.show.realisticShading ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    renderer.toneMappingExposure = (st.show.realisticShading ? 0.8 : 1) * (st.doc.scene?.brightness ?? 1);
    bodies.setGhost(getPref('assembly.graphicsPreview') === false ? null : ghostBodies, (ghostPart?.appearance ?? ghostPart?.material?.color) as string | undefined, ghostPos, new THREE.Quaternion(...(st.insertGhost?.rotation ?? [0, 0, 0, 1])));
    bodies.updateSilhouettes(camera.view);
    if (st.show.ambientOcclusion && st.displayStyle !== 'wireframe' && !sketch) renderWithAO(renderer, scene.scene, camera.view);
    else renderer.render(scene.scene, camera.view);
  }, [st.show.ambientOcclusion, st.show.zebra, scene, bodies, camera, sketch, plane, solve, profileSketch, st.solve, regionKey, st.handleDrag, featureFaces, hoverFeatureFaces, st.hoverFeatureId, st.selection, st.hover, st.show.grid, st.show.origin, st.shadedContours, otherSketches, planesToDraw, size, planeHalf, st.rebuild, st.displayStyle, st.hoverFace, st.selectedFace, st.selectedFaces, preview, roundPreview, st.hoverEdge, st.selectedEdges, st.interferenceHighlight, st.doc.material, sectionedBodies, st.doc.bodyMaterials, st.doc.hiddenBodies, st.doc.appearance, st.doc.bodyAppearances, previewCurves, st.doc.components, st.show.realisticShading, st.show.shadows, detailedBodies, st.doc.faceAppearances, st.analysis, st.doc.decals, st.decalEdit, st.isolated, ghostBodies, ghostPos, st.insertGhost, st.mateEdit, st.interferenceOpts, st.dialog, st.motionSim, mateFaces, gpuSection, sectionPlanes, section?.capColor, st.doc.scene]);
  // View Settings ▸ Perspective
  useEffect(() => {
    camera.setPerspective(st.show.perspective);
  }, [camera, st.show.perspective]);

  useEffect(() => {
    draw();
  }, [draw, size, theme]);

  // a decal image that finishes loading redraws the graphics area
  useEffect(() => {
    bodies.onDecalLoaded = () => draw();
    return () => { bodies.onDecalLoaded = null; };
  }, [bodies, draw]);

  useEffect(() => {
    const prev = camera.onChange;
    camera.onChange = () => {
      prev?.();
      draw();
      bump((n) => n + 1);
    };
    return () => {
      camera.onChange = prev;
    };
  }, [camera, draw]);

  const zoomFit = useCallback(() => {
    // fit to sketch geometry only (never to the origin glyph or reference planes)
    const box = new THREE.Box3();
    const addSketch = (sk: typeof sketch, pl: PlaneId) => {
      if (!sk) return;
      const b = sketchBounds(sk);
      if (!b) return;
      box.expandByPoint(sketchToWorld(pl, b.min.x, b.min.y));
      box.expandByPoint(sketchToWorld(pl, b.max.x, b.max.y));
      box.expandByPoint(sketchToWorld(pl, b.min.x, b.max.y));
      box.expandByPoint(sketchToWorld(pl, b.max.x, b.min.y));
    };
    if (sketch) addSketch(sketch, plane);
    else for (const o of otherSketches) addSketch(o.sketch, o.plane);
    const bb = bodies.bounds();
    if (bb) box.union(bb);
    camera.fit(box.isEmpty() ? null : box, 1.4);
  }, [camera, sketch, plane, otherSketches, bodies]);

  // Render Tools ▸ Final Render: the graphics area at twice the resolution, with Realistic Shading and shadows, on the scene background
  useEffect(() => {
    // Render Tools ▸ Preview Window: a snapshot of the graphics area on the scene background (no state changes)
    bridge.snapshot = (only?: string) => {
      const renderer = rendererRef.current;
      if (!renderer) return null;
      // Component Preview Window: only that component's body
      const hidden: THREE.Object3D[] = [];
      if (only) scene.scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.name && o.name !== only && !o.name.startsWith('decal:') && o.visible && (useStore.getState().rebuild.bodies.some((b) => b.id === o.name))) { o.visible = false; hidden.push(o); } });
      renderer.render(scene.scene, camera.view);
      for (const o of hidden) o.visible = true;
      const src = renderer.domElement;
      const out = document.createElement('canvas');
      out.width = src.width;
      out.height = src.height;
      const g = out.getContext('2d')!;
      const bg = useStore.getState().doc.scene?.background ?? 'gradient';
      const grad = g.createLinearGradient(0, 0, 0, out.height);
      if (bg === 'studio') { grad.addColorStop(0, '#5a5f66'); grad.addColorStop(0.62, '#c9ccd1'); grad.addColorStop(1, '#f2f2f2'); }
      else { grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.7, '#ffffff'); grad.addColorStop(1, '#f1f2f4'); }
      g.fillStyle = bg === 'white' ? '#ffffff' : bg === 'color' ? useStore.getState().doc.scene?.color ?? '#ffffff' : grad;
      g.fillRect(0, 0, out.width, out.height);
      g.drawImage(src, 0, 0);
      return out.toDataURL('image/jpeg', 0.85);
    };
    bridge.finalRender = async () => {
      const renderer = rendererRef.current;
      const host = hostRef.current;
      if (!renderer || !host) return null;
      const st0 = useStore.getState();
      const prevRV = st0.show.realisticShading, prevSh = st0.show.shadows;
      if (!prevRV) st0.toggleShow('realisticShading');
      if (!prevSh) useStore.getState().toggleShow('shadows');
      // a render shows the model only: no origin, planes or sketches
      const hideKeys = (['origin', 'planes', 'sketches'] as const).filter((k) => useStore.getState().show[k]);
      for (const k of hideKeys) useStore.getState().toggleShow(k);
      // nor the selection or the pointer's highlight (F79): cleared for the render and put back afterwards
      const s0 = useStore.getState();
      const kept = { selectedFace: s0.selectedFace, selectedFaces: s0.selectedFaces, hoverFace: s0.hoverFace, selectedEdges: s0.selectedEdges, hoverEdge: s0.hoverEdge, hoverFeatureId: s0.hoverFeatureId, selectedFeatureId: s0.selectedFeatureId, selection: s0.selection, hover: s0.hover };
      useStore.setState({ selectedFace: null, selectedFaces: [], hoverFace: null, selectedEdges: [], hoverEdge: null, hoverFeatureId: null, selectedFeatureId: null, selection: [], hover: null });
      // let the graphics area apply Realistic Shading and the floor shadow first
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const ratio = renderer.getPixelRatio();
      renderer.setPixelRatio(ratio * 2);
      const r = host.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false);
      renderer.render(scene.scene, camera.view);
      const src = renderer.domElement;
      const out = document.createElement('canvas');
      out.width = src.width;
      out.height = src.height;
      const g = out.getContext('2d')!;
      const bg = useStore.getState().doc.scene?.background ?? 'gradient';
      const color = useStore.getState().doc.scene?.color ?? '#ffffff';
      if (bg === 'white') g.fillStyle = '#ffffff';
      else if (bg === 'color') g.fillStyle = color;
      else {
        const grad = g.createLinearGradient(0, 0, 0, out.height);
        if (bg === 'studio') { grad.addColorStop(0, '#5a5f66'); grad.addColorStop(0.62, '#c9ccd1'); grad.addColorStop(1, '#f2f2f2'); }
        else { grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.7, '#ffffff'); grad.addColorStop(1, '#f1f2f4'); }
        g.fillStyle = grad;
      }
      g.fillRect(0, 0, out.width, out.height);
      g.drawImage(src, 0, 0);
      const url = out.toDataURL('image/png');
      renderer.setPixelRatio(ratio);
      renderer.setSize(r.width, r.height, false);
      if (!prevRV) useStore.getState().toggleShow('realisticShading');
      if (!prevSh) useStore.getState().toggleShow('shadows');
      for (const k of hideKeys) useStore.getState().toggleShow(k);
      useStore.setState(kept);
      return url;
    };
    return () => { bridge.snapshot = undefined; bridge.finalRender = undefined; };
  }, [scene, camera]);

  useEffect(() => {
    camera.fitRequest = zoomFit;
    bridge.zoomFit = zoomFit;
    bridge.renderer = rendererRef.current;
    bridge.camera = camera;
    bridge.scene = scene.scene;
    bridge.bodies = bodies;
    bridge.tools = tools;
    bridge.projectWorld = (x, y, z) => {
      const r = hostRef.current?.getBoundingClientRect();
      const q = camera.worldToPixel(new THREE.Vector3(x, y, z));
      return { x: q.x + (r?.left ?? 0), y: q.y + (r?.top ?? 0) };
    };
    bridge.project = (p: SketchPoint) => {
      const r = hostRef.current?.getBoundingClientRect();
      const q = camera.worldToPixel(sketchToWorld(plane, p.x, p.y));
      return { x: q.x + (r?.left ?? 0), y: q.y + (r?.top ?? 0) };
    };
    return () => { if (bridge.zoomFit === zoomFit) bridge.zoomFit = undefined; };
  }, [zoomFit, camera, plane, scene, bodies, tools]);

  // ---- tool context ---------------------------------------------------------
  const ctx = (): ToolContext | null => {
    if (!sketch) return null;
    const o = bridge.sketchOptions;
    if (o.rectConstruction) tools.rectConstruction = o.rectConstruction;
    tools.polygonSides = o.polygonSides;
    tools.polygonInscribed = o.polygonInscribed;
    if (o.textOptions) tools.textOptions = o.textOptions;
    return {
      sketch,
      tolerance: 8 * camera.scale,
      snapGrid: st.snapGrid,
      gridSize: st.gridSize,
      commit: st.commit,
      select: st.setSelection,
      toggleSelect: st.toggleSelect,
      selectConstraint: st.selectConstraint,
      setHover: st.setHover,
      dragPoint: st.dragPoint,
      onDimensionCreated: (id) => {
        // Modify dialog at the pointer, like the manual describes
        const p = cursorPxRef.current ?? { x: size.w / 2, y: size.h / 2 };
        const r = hostRef.current!.getBoundingClientRect();
        if (getPref('general.inputDimensionValue')) st.setModify({ id, x: r.left + p.x + 16, y: r.top + p.y + 16 });
        onEditDimension(id);
      },
      message: (t) => st.pushMessage(t, 'warn'),
      selection: st.selection,
      freePoints: solve?.freePoints ?? new Set(),
      filletRadius: st.sketchTool.filletRadius,
      sketchTool: st.sketchTool,
      chamfer: { d1: st.sketchTool.chamferD1, d2: st.sketchTool.chamferEqual ? st.sketchTool.chamferD1 : st.sketchTool.chamferD2 },
      hitAnnotation: (px, py) => {
        for (const b of labelBoxes.current) if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b.id;
        return null;
      },
    };
  };
  const cursorPxRef = useRef<{ x: number; y: number } | null>(null);

  tools.onAnnotationDrag = (id, delta, phase) => {
    const s = sketch;
    if (!s) return;
    const c = s.constraints[id];
    if (!c) return;
    const base = c.labelOffset ?? (() => {
      const pts = c.refs.map((r) => (r in s.points ? s.points[r] : null)).filter(Boolean) as SketchPoint[];
      if (pts.length) return { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
      return { x: 0, y: 0 };
    })();
    if (phase === 'end' && (Math.abs(delta.x) > 1e-6 || Math.abs(delta.y) > 1e-6)) {
      st.commit('Move dimension', (sk) => updateConstraint(sk, id, { labelOffset: { x: base.x + delta.x, y: base.y + delta.y } }));
    }
  };

  const toPointer = (e: React.PointerEvent | React.MouseEvent) => {
    const r = hostRef.current!.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const p = camera.pixelToPlane(px, py, plane) ?? { x: 0, y: 0 };
    return { p, px, py, shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, button: e.button };
  };

  const refreshTool = () => {
    const c = ctx();
    toolRenderRef.current = c ? tools.render(c) : null;
    draw();
    bump((n) => n + 1);
  };

  /** body edge near the pixel (within 6 px), nearest first */
  const edgeAt = (px: number, py: number): string | null => {
    // only edges the viewer can see (by design): an edge behind a face is not picked through it
    const ray = camera.pixelToRay(px, py);
    const hit = st.displayStyle === 'wireframe' || st.displayStyle === 'hiddenVisible' ? null : bodies.pick(ray);
    const hitDepth = hit ? hit.point.clone().sub(ray.origin).dot(ray.direction) : Infinity;
    const tol = Math.max(0.05, camera.scale * 3);
    let best: string | null = null, bestD = 6;
    let bestPoint: THREE.Vector3 | null = null;
    for (const b of st.rebuild.bodies) {
      for (const e of b.edges) {
        const pts = e.points.map((p) => camera.worldToPixel(p));
        for (let i = 0; i + 1 < pts.length; i++) {
          const a = pts[i], q = pts[i + 1];
          const dx = q.x - a.x, dy = q.y - a.y;
          const l2 = dx * dx + dy * dy || 1;
          const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
          const d = Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
          if (d < bestD) {
            const w = e.points[i].clone().lerp(e.points[i + 1], t);
            // Fillet > Select through faces: hidden edges can be picked too
            const through = !!st.featureEdit && isRoundFeature(st.featureEdit.draft) && !!st.featureEdit.draft.selectThroughFaces;
            if (!through && w.clone().sub(ray.origin).dot(ray.direction) > hitDepth + tol) continue;
            bestD = d;
            best = e.id;
            bestPoint = w;
          }
        }
      }
    }
    if (best && bestPoint) useStore.setState({ edgePick: [bestPoint.x, bestPoint.y, bestPoint.z] });
    return best;
  };

  /** planar body face under the pixel */
  /** Select Other: the next face along the ray of the last right-click (behind the selected one) */
  const selectOther = () => {
    if (!ctxMenu) return;
    const hits = bodies.pickAll(camera.pixelToRay(ctxMenu.x, ctxMenu.y));
    if (!hits.length) return;
    const cur = st.selectedFace ? hits.findIndex((h) => h.bodyId === st.selectedFace!.bodyId && h.faceId === st.selectedFace!.faceId) : -1;
    const next = hits[(cur + 1) % hits.length];
    st.setSelectedFace({ bodyId: next.bodyId, faceId: next.faceId });
    st.pushMessage(`Select Other: face ${((cur + 1) % hits.length) + 1} of ${hits.length} under the pointer.`);
  };
  // the pointer is on a plane's name label: that plane is picked, whatever lies behind the label (F66)
  const labelPlane = useRef<PlaneId | null>(null);
  const faceAt = (px: number, py: number): { bodyId: string; faceId: string } | null => {
    if (labelPlane.current) return null;
    if (!st.rebuild.bodies.length) return null;
    const hit = bodies.pick(camera.pixelToRay(px, py));
    return hit ? { bodyId: hit.bodyId, faceId: hit.faceId } : null;
  };

  /** which reference plane is under the pixel (plane-pick mode) */
  const planeAt = (px: number, py: number): PlaneId | null => {
    if (labelPlane.current) return labelPlane.current;
    const ray = camera.pixelToRay(px, py);
    const sizeW = planeHalf();
    let best: { id: PlaneId; d: number } | null = null;
    for (const id of ['front', 'top', 'right'] as PlaneId[]) {
      const b = getPlane(id);
      const hit = ray.intersectPlane(new THREE.Plane(b.n, -b.n.dot(b.o)), new THREE.Vector3());
      if (!hit) continue;
      const rel = hit.clone().sub(b.o); const u = rel.dot(b.u), v = rel.dot(b.v);
      if (Math.abs(u) <= sizeW && Math.abs(v) <= sizeW * 0.75) {
        // nearest hit along the ray wins (the plane in front)
        const d = hit.distanceTo(ray.origin);
        if (!best || d < best.d) best = { id, d };
      }
    }
    return best?.id ?? null;
  };

  const compDrag = useRef<{ id: string; x: number; y: number; mode: 'move' | 'rotate' } | null>(null);
  // ---- mouse gestures, by design: right-drag shows the guide, the tool in the drag direction runs on release
  type GestureDir = 'up' | 'down' | 'left' | 'right';
  const gesture = useRef<{ x: number; y: number; dir: GestureDir | null } | null>(null);
  const rightPress = useRef<{ x: number; y: number } | null>(null);
  const rightReleasedAt = useRef(-1e9);
  const [gestureUi, setGestureUi] = useState<{ x: number; y: number; dir: GestureDir | null } | null>(null);
  // Customize ▸ Mouse Gestures: the four directions bind to commands of the catalog (defaults by design)
  const gestureCommands = (): Record<GestureDir, { label: string; run: () => void }> => {
    const g = gestureBindings(getPref('customize.gestures'));
    const ctx = sketch ? g.sketch : g.part;
    const mk = (id: string) => { const c = commandById(id); return { label: c?.label ?? id, run: () => c?.run(useStore.getState(), camera) }; };
    return { up: mk(ctx.up), down: mk(ctx.down), left: mk(ctx.left), right: mk(ctx.right) };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    hostRef.current?.focus();
    setCtxMenu(null);
    // the fly-out Feature Tree collapses as soon as the graphics area is used (by design)
    if (flyout && !(e.target as HTMLElement).closest?.('.k-flyout-tree')) setFlyout(false);
    if (e.button === 1) {
      // middle: rotate; Ctrl+middle: pan; Shift+middle: zoom; Alt+middle: roll; double-click: zoom to fit
      const now = performance.now();
      if (now - lastMiddleDown.current < 350) {
        lastMiddleDown.current = 0;
        zoomFit();
        e.preventDefault();
        return;
      }
      lastMiddleDown.current = now;
      nav.current = { mode: e.ctrlKey ? 'pan' : e.shiftKey ? 'zoom' : e.altKey ? 'roll' : 'orbit', x: e.clientX, y: e.clientY };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      e.preventDefault();
      return;
    }
    if (e.button === 2) {
      // a right-drag becomes a mouse gesture; a plain right-click opens the context menu when the button comes up.
      // The menu is not opened on the browser's contextmenu event: Linux fires that on the press, before a drag (F54).
      const r0 = hostRef.current!.getBoundingClientRect();
      rightPress.current = { x: e.clientX, y: e.clientY };
      if (getPref('customize.gestures.enabled') !== false) gesture.current = { x: e.clientX - r0.left, y: e.clientY - r0.top, dir: null };
      return;
    }
    // Insert Component: a click places the part on the pointer there
    if (st.insertGhost) {
      if (ghostPos) st.placeInsertGhost([ghostPos.x, ghostPos.y, ghostPos.z]);
      return;
    }
    const info = toPointer(e);
    if (zoomArea.active) {
      setZoomArea({ active: true, a: { x: info.px, y: info.py }, b: { x: info.px, y: info.py } });
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      return;
    }
    if (st.planePick) {
      // a planar face of a body or one of the reference planes
      const face = faceAt(info.px, info.py);
      if (face) {
        st.sketchOnFace(face);
        return;
      }
      const p = planeAt(info.px, info.py);
      if (p) st.newSketch(p);
      return;
    }
    // Rapid Sketch: with a drawing tool and nothing under the pointer in the sketch, another face or plane starts a sketch there
    if (st.rapidSketch && sketch && st.tool !== 'select' && !tools.busy && !st.sketch3dEdit && !hitTest(sketch, info.p, (camera.scale * 6))) {
      const face = faceAt(info.px, info.py);
      const fdef = face ? st.rebuild.bodies.find((b) => b.id === face.bodyId)?.faces.find((f) => f.id === face.faceId) : undefined;
      const cur = resolvePlaneDef(st.doc, sketch.plane);
      const coplanar = (n: number[], o: number[]) => Math.abs(n[0] * cur.n[0] + n[1] * cur.n[1] + n[2] * cur.n[2]) > 0.999 && Math.abs((o[0] - cur.origin[0]) * cur.n[0] + (o[1] - cur.origin[1]) * cur.n[1] + (o[2] - cur.origin[2]) * cur.n[2]) < 1e-3;
      if (face && fdef && !fdef.curved && !coplanar(fdef.normal, fdef.centroid)) {
        st.rapidSwitch({ face });
        return;
      }
      const pl = face ? null : planeAt(info.px, info.py);
      if (pl && pl !== sketch.plane) {
        st.rapidSwitch({ plane: pl });
        return;
      }
    }
    if (st.placing) {
      st.placeItem(info.p);
      return;
    }
    if (st.sketch3dEdit) {
      const q = pick3D(info.px, info.py);
      if (q) st.add3DPoint(q);
      else st.pushMessage('The active plane is seen edge-on: press Tab to switch the plane.', 'warn');
      return;
    }
    // assembly: Move / Rotate Component drags the component under the pointer (a fixed one stays)
    if (st.doc.kind === 'assembly' && st.asmTool !== 'select' && !st.mateEdit) {
      const face = faceAt(info.px, info.py);
      const comp = face ? st.doc.components?.find((c) => c.id === face.bodyId) : undefined;
      if (comp && !comp.fixed) {
        st.selectComponent(comp.id);
        compDrag.current = { id: comp.id, x: e.clientX, y: e.clientY, mode: st.asmTool };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        return;
      }
      if (comp?.fixed) st.pushMessage(`${comp.name} is fixed; Float it (right-click in the tree) to move it.`, 'warn');
    }
    const c = ctx();
    if (!c) {
      // Hole Tool: clicks on the hole plane place hole positions
      if (st.featureEdit?.draft.type === 'hole' && st.featureEdit.draft.plane) {
        const q = camera.pixelToPlane(info.px, info.py, st.featureEdit.draft.plane);
        if (q) st.addHolePoint(q);
        return;
      }
      // Forming Tool: clicks on the placement face place the form
      if (st.featureEdit?.draft.type === 'formTool' && st.featureEdit.draft.plane) {
        const q = camera.pixelToPlane(info.px, info.py, st.featureEdit.draft.plane);
        if (q) st.addFormToolPoint(q);
        return;
      }
      // Selected Contours box active: a click on a region of the profile picks it, by design
      if (st.contourPick && profileSketch && (st.featureEdit?.draft.type === 'extrude' || st.featureEdit?.draft.type === 'revolve')) {
        const q = camera.pixelToPlane(info.px, info.py, profileSketch.plane);
        const regs = sketchRegions(profileSketch);
        const inside = (poly: { x: number; y: number }[], p: { x: number; y: number }) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c; } return c; };
        const idx = q ? regs.findIndex((r) => inside(r.outer, q) && !r.holes.some((h) => inside(h, q))) : -1;
        if (idx >= 0) { st.toggleContour(idx); return; }
      }
      // Up To Vertex: the end point of a model edge closest to the click (within 14 px)
      if ((st.featureEdit?.draft.type === 'chamfer' && st.featureEdit.draft.roundType === 'vertex') || (st.featureEdit?.draft.type === 'extrude' && st.featureEdit.draft.end === 'upToVertex') || (st.featureEdit?.draft.type === 'edgeFlange' && st.flangePick === 'vertex') || (st.featureEdit?.draft.type === 'jog' && st.flangePick === 'vertex') || (st.featureEdit?.draft.type === 'extrude' && st.dir2Pick === 'vertex')) {
        let best: THREE.Vector3 | null = null, bestD = 14;
        for (const b of st.rebuild.bodies) for (const ed of b.edges) {
          if (ed.closed || ed.points.length < 2) continue;
          for (const q of [ed.points[0], ed.points[ed.points.length - 1]]) {
            const px = camera.worldToPixel(q);
            const dd = Math.hypot(px.x - info.px, px.y - info.py);
            if (dd < bestD) { bestD = dd; best = q; }
          }
        }
        const fd = st.featureEdit?.draft;
        if (best && fd?.type === 'extrude' && st.dir2Pick === 'vertex' && fd.direction2) { st.updateFeatureDraft({ direction2: { ...fd.direction2, vertex: { point: [best.x, best.y, best.z], label: 'Vertex<1>' } } }); useStore.setState({ dir2Pick: null }); }
        else if (best) { st.updateFeatureDraft({ vertex: { point: [best.x, best.y, best.z], label: 'Vertex<1>' } }); useStore.setState({ flangePick: null }); }
        else st.pushMessage('Click on a corner (end point of a model edge).', 'warn');
        return;
      }
      // part mode: select an edge or a face of a body; a click on nothing clears plane / face / feature selection
      const edge = edgeAt(info.px, info.py);
      if (edge) {
        st.toggleSelectedEdge(edge, info.ctrl || info.shift);
        return;
      }
      if (st.featureEdit && isRoundFeature(st.featureEdit.draft)) return;
      const face = faceAt(info.px, info.py);
      if (face) st.setSelectedFace(!info.ctrl && !info.shift && st.dialog !== 'measure' && st.selectedFace?.faceId === face.faceId && st.selectedFaces.length <= 1 ? null : face, info.ctrl || info.shift);
      else {
        if (st.selectedPlane) st.setSelectedPlane(null);
        if (st.selectedFace) st.setSelectedFace(null);
        if (st.selectedFeatureId) st.setSelectedFeature(null);
        if (st.selectedEdges.length && !st.featureEdit) st.toggleSelectedEdge(st.selectedEdges[0]);
      }
      return;
    }
    // inside a sketch, a click on a model edge (no sketch entity under the pointer) selects the edge for Convert Entities
    if (st.tool === 'select' && !hitTest(c.sketch, info.p, c.tolerance) && !c.hitAnnotation(info.px, info.py)) {
      const edge = edgeAt(info.px, info.py);
      if (edge) {
        st.toggleSelectedEdge(edge, info.ctrl || info.shift);
        return;
      }
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    tools.pointerDown(c, info);
    refreshTool();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const r = hostRef.current!.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    cursorPxRef.current = { x: px, y: py };
    setCursorPx({ x: px, y: py });
    if (gesture.current && e.buttons & 2) {
      const dx = px - gesture.current.x, dy = py - gesture.current.y;
      const dist = Math.hypot(dx, dy);
      const dir: GestureDir | null = dist < 14 ? null : Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
      if (dist > 6 || gestureUi) {
        gesture.current.dir = dir;
        setGestureUi({ x: gesture.current.x, y: gesture.current.y, dir });
      }
      return;
    }
    if (st.insertGhost && !nav.current) {
      const ray = camera.pixelToRay(px, py);
      const hit = ray.intersectPlane(new THREE.Plane(ray.direction.clone().negate(), 0), new THREE.Vector3());
      if (hit) setGhostPos(hit);
      return;
    }
    if (compDrag.current) {
      const dx = e.clientX - compDrag.current.x, dy = e.clientY - compDrag.current.y;
      compDrag.current.x = e.clientX;
      compDrag.current.y = e.clientY;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.rotation), up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.rotation);
      if (compDrag.current.mode === 'move') {
        const d = right.multiplyScalar(dx * camera.scale).add(up.multiplyScalar(-dy * camera.scale));
        st.moveComponent(compDrag.current.id, [d.x, d.y, d.z]);
      } else {
        if (Math.abs(dx) > Math.abs(dy)) st.rotateComponent(compDrag.current.id, [up.x, up.y, up.z], dx * 0.5);
        else st.rotateComponent(compDrag.current.id, [right.x, right.y, right.z], dy * 0.5);
      }
      return;
    }
    if (nav.current) {
      const dx = e.clientX - nav.current.x, dy = e.clientY - nav.current.y;
      nav.current.x = e.clientX;
      nav.current.y = e.clientY;
      if (nav.current.mode === 'pan') camera.pan(dx, dy);
      else if (nav.current.mode === 'zoom') camera.zoomStep(dy > 0 ? 1 + dy * 0.01 : 1 / (1 - dy * 0.01));
      else if (nav.current.mode === 'roll') camera.roll(dx * 0.4);
      else camera.orbit(dx, dy);
      return;
    }
    if (zoomArea.active && zoomArea.a) {
      setZoomArea({ ...zoomArea, b: { x: px, y: py } });
      return;
    }
    if (st.sketch3dEdit) {
      setCursor3d(pick3D(px, py));
      return;
    }
    if (st.planePick) {
      const face = faceAt(px, py);
      st.setHoverFace(face);
      const pl = face ? null : planeAt(px, py);
      st.setHoverPlane(pl);
      st.setFeedback(face || pl ? 'plane' : null);
      return;
    }
    const info = toPointer(e);
    st.setCursor(info.p);
    const c = ctx();
    if (!c) {
      // part mode: dynamic highlight of body edges and faces
      const edge = st.featureEdit && !isRoundFeature(st.featureEdit.draft) && st.featureEdit.draft.type !== 'edgeFlange' && st.featureEdit.draft.type !== 'hem' && st.featureEdit.draft.type !== 'tabSlot' && st.featureEdit.draft.type !== 'rip' && st.featureEdit.draft.type !== 'sweptFlange' ? null : edgeAt(px, py);
      st.setHoverEdge(edge);
      const face = edge || (st.featureEdit && st.featureEdit.draft.type !== 'shell' && st.featureEdit.draft.type !== 'draft') ? null : faceAt(px, py);
      st.setHoverFace(face);
      st.setFeedback(edge ? 'line' : face ? 'plane' : null);
      return;
    }
    tools.pointerMove(c, info);
    const rk = (tools.hoverRegion ?? []).join(',');
    if (rk !== regionKeyRef.current) { regionKeyRef.current = rk; setRegionKey(rk); }
    let hc: string | null = null;
    for (const b of labelBoxes.current) if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) hc = b.id;
    setHoverConstraint(hc);
    // system feedback symbol next to the cursor
    if (hc) st.setFeedback(sketch && sketch.constraints[hc]?.value !== undefined ? 'dimension' : 'relation');
    else {
      const h = hitTest(c.sketch, info.p, c.tolerance);
      st.setFeedback(h ? (h.kind === 'point' ? 'point' : c.sketch.entities[h.id]?.kind ?? null) : null);
    }
    refreshTool();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.button === 2) {
      const g = gesture.current, press = rightPress.current;
      gesture.current = null;
      rightPress.current = null;
      rightReleasedAt.current = performance.now();
      setGestureUi(null);
      if (g?.dir) {
        gestureCommands()[g.dir].run();
        return;
      }
      // a click (no drag) opens the context menu; a right-drag without gestures does nothing
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) < 6) openContextMenu(e);
      return;
    }
    if (compDrag.current) {
      compDrag.current = null;
      return;
    }
    if (nav.current) {
      nav.current = null;
      return;
    }
    if (zoomArea.active && zoomArea.a && zoomArea.b) {
      camera.zoomToArea(zoomArea.a.x, zoomArea.a.y, zoomArea.b.x, zoomArea.b.y);
      setZoomArea({ active: false });
      return;
    }
    const c = ctx();
    if (!c) return;
    tools.pointerUp(c, toPointer(e));
    refreshTool();
  };
  const onWheel = (e: React.WheelEvent) => {
    const r = hostRef.current!.getBoundingClientRect();
    // manual: roll the wheel toward you to zoom in (reversible in Options)
    const zoomIn = st.reverseWheel ? e.deltaY < 0 : e.deltaY > 0;
    camera.zoomAt(e.clientX - r.left, e.clientY - r.top, zoomIn ? 1 / 1.12 : 1.12);
  };
  const onDoubleClick = () => {
    if (st.sketch3dEdit) {
      st.end3DChain();
      return;
    }
    const c = ctx();
    if (!c) return;
    tools.doubleClick(c);
    refreshTool();
  };
  const onContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // the right button is handled on press / release (pointer events); only the keyboard's menu key (no press) opens it here
    if (rightPress.current || performance.now() - rightReleasedAt.current < 800) return;
    openContextMenu(e);
  };
  const openContextMenu = (e: React.MouseEvent | React.PointerEvent) => {
    const r = hostRef.current!.getBoundingClientRect();
    setCtxMenu({ x: e.clientX - r.left, y: e.clientY - r.top });
    if (sketch && !st.selection.length) {
      const info = toPointer(e);
      const h = hitTest(sketch, info.p, 8 * camera.scale);
      if (h) st.setSelection([{ kind: h.kind, id: h.id }]);
    }
  };

  // keyboard: Escape / Enter handled here (needs tool state)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (st.sketch3dEdit && e.key === 'Tab') {
        e.preventDefault();
        st.cycle3DPlane();
        return;
      }
      if (st.sketch3dEdit && e.key === 'Escape') {
        st.end3DChain();
        return;
      }
      if (e.key === 'Escape') {
        if (zoomArea.active) setZoomArea({ active: false });
        if (st.show.viewSelector) st.toggleShow('viewSelector');
        if (st.planePick) st.cancelPlanePick();
        if (st.featureEdit) st.cancelFeature();
        if (st.placing) st.cancelPlacing();
        // Insert Component: Esc ends the command, the part on the pointer is not inserted (by design)
        if (st.insertingComponent) st.cancelInsertComponent();
        if (st.modify) st.setModify(null);
        if (ctxMenu) setCtxMenu(null);
        const c = ctx();
        if (!c) return;
        if (tools.cancel()) {
          // Esc ends the entity in progress and releases the tool (official behaviour; double-click keeps the tool)
          e.stopPropagation();
          st.setTool('select');
        } else if (st.tool !== 'select') st.setTool('select');
        else if (st.selection.length || st.selectedConstraint) st.setSelection([]);
        refreshTool();
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement)) {
        const c = ctx();
        if (!c) return;
        if (tools.busy) tools.enter(c);
        else st.repeatLastTool();
        refreshTool();
      } else if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && !(e.target instanceof HTMLInputElement)) {
        // D: move the confirmation corner (OK/Cancel) to the pointer
        if (sketch) st.setConfirmAtCursor(st.confirmAtCursor ? null : cursorPxRef.current);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const project = useCallback((p: SketchPoint) => camera.worldToPixel(sketchToWorld(plane, p.x, p.y)), [camera, plane]);

  // context toolbar items (relations for the selection) + shortcut menu
  const ctxItems = (): { toolbar: MenuItem[]; menu: MenuItem[] } => {
    if (!sketch && st.featureEdit && st.featureEdit.draft.type === 'extrude') {
      // by design: the shortcut menu of an extrude offers the end conditions of both directions
      const d = st.featureEdit.draft;
      const end = (id: import('../../core/document/types').EndCondition, label: string): MenuItem => ({ label: `${d.end === id ? '✓ ' : ''}${label}`, onSelect: () => st.updateFeatureDraft({ end: id }) });
      const end2 = (id: 'blind' | 'throughAll' | 'upToVertex' | 'upToSurface' | null, label: string): MenuItem => ({ label: `${(d.direction2?.end ?? null) === id ? '✓ ' : ''}${label}`, onSelect: () => { st.updateFeatureDraft({ direction2: id ? { ...d.direction2, end: id, depth: d.direction2?.depth ?? 10 } : undefined }); useStore.setState({ dir2Pick: id === 'upToVertex' ? 'vertex' : id === 'upToSurface' ? 'surface' : null }); } });
      return {
        toolbar: [],
        menu: [
          { label: `${tools.lassoMode ? '' : '✓ '}Box Selection`, icon: <Icon.Select />, onSelect: () => { tools.lassoMode = false; } },
          { label: `${tools.lassoMode ? '✓ ' : ''}Lasso Selection`, icon: <Icon.Select />, onSelect: () => { tools.lassoMode = true; } },
          { label: 'Select Other', onSelect: selectOther },
          { label: 'Clear Selections', onSelect: () => st.setSelectedFace(null) },
          { label: 'Zoom/Pan/Rotate ▸ Zoom to Fit', icon: <Icon.Fit />, shortcut: 'F', onSelect: zoomFit },
          { separator: true },
          { label: 'OK', icon: <Icon.Check />, onSelect: st.commitFeature },
          { label: 'Cancel', icon: <Icon.Close />, onSelect: st.cancelFeature },
          { separator: true },
          { label: 'Direction 1', disabled: true },
          { label: `${d.reverse ? '✓ ' : ''}Reverse Direction`, onSelect: () => st.updateFeatureDraft({ reverse: !d.reverse }) },
          end('blind', 'Blind'),
          end('throughAll', 'Through All'),
          end('throughAllBoth', 'Through All - Both Directions'),
          end('upToNext', 'Up To Next'),
          end('upToVertex', 'Up To Vertex'),
          end('upToSurface', 'Up To Surface'),
          end('offsetFromSurface', 'Offset From Surface'),
          end('upToBody', 'Up To Body'),
          end('midPlane', 'Mid Plane'),
          { separator: true },
          { label: 'Direction 2', disabled: true },
          end2(null, 'Direction 2 Off'),
          end2('blind', 'Blind'),
          end2('upToVertex', 'Up To Vertex'),
          end2('upToSurface', 'Up To Surface'),
          end2('throughAll', 'Through All'),
          { separator: true },
          { label: 'Customize Menu', onSelect: () => st.setDialog('customize') },
        ],
      };
    }
    if (!sketch) {
      return {
        toolbar: [],
        menu: [
          { label: 'Sketch', icon: <Icon.Sketch />, onSelect: st.startPlanePick },
          ...(st.doc.kind === 'assembly' && (st.selectedFace || (st.doc.components ?? []).some((c) => c.id === st.selectedFeatureId)) ? [{ label: 'Move with Triad', icon: <Icon.MoveComponent />, onSelect: () => useStore.setState({ triadComponentId: st.selectedFace?.bodyId ?? st.selectedFeatureId }) } as MenuItem] : []),
          ...(st.rebuild.bodies.length ? [{ label: 'Select Other', icon: <Icon.Select />, onSelect: selectOther } as MenuItem, ...(st.selectedFace && st.doc.kind !== 'drawing' ? [{ label: 'Isolate', icon: <Icon.Eye />, onSelect: () => st.setIsolated([st.selectedFace!.bodyId]) } as MenuItem] : [])] : []),
          { label: 'Zoom to fit', icon: <Icon.Fit />, shortcut: 'F', onSelect: zoomFit },
          { label: 'View Orientation…', icon: <Icon.Orientation />, shortcut: 'Space', onSelect: () => st.setDialog('orientation') },
          { separator: true },
          { label: `${st.show.planes ? '✓ ' : ''}Show Planes`, icon: <Icon.Plane />, onSelect: () => st.toggleShow('planes') },
        ],
      };
    }
    const rel = relationsForSelection(sketch, st.selection);
    const toolbar: MenuItem[] = rel.map((o) => {
      const G = RelationGlyph[o.kind];
      return { label: o.label, icon: G ? <G size={14} /> : undefined, onSelect: () => st.addRelation(o.kind, o.refs, { internal: o.internal }) };
    });
    const hasEnt = st.selection.some((s) => s.kind === 'entity');
    const menu: MenuItem[] = [
      { label: 'Select', icon: <Icon.Select />, shortcut: 'Esc', onSelect: () => st.setTool('select') },
      { label: `${tools.lassoMode ? '' : '✓ '}Box Selection`, icon: <Icon.Select />, onSelect: () => { tools.lassoMode = false; } },
      { label: `${tools.lassoMode ? '✓ ' : ''}Lasso Selection`, icon: <Icon.Select />, onSelect: () => { tools.lassoMode = true; } },
      { label: 'Smart Dimension', icon: <Icon.Dimension />, onSelect: () => st.setTool('dimension') },
      { separator: true },
      ...(hasEnt
        ? [
            { label: 'Construction Geometry', icon: <Icon.Construction />, onSelect: st.toggleConstructionSelection },
            { label: 'Mirror Entities', icon: <Icon.Mirror />, onSelect: st.mirrorSelection },
            { label: 'Delete', icon: <Icon.Trash />, shortcut: 'Del', onSelect: st.deleteSelection },
            { separator: true },
          ]
        : []),
      ...(st.selectedConstraint && sketch && sketch.constraints[st.selectedConstraint]?.value !== undefined
        ? [
            { label: 'Configure Dimension', icon: <Icon.Config />, onSelect: () => { st.openConfigure({ dims: [sketchDimensionName(sketch, st.selectedConstraint!)] }); } },
            { separator: true },
          ]
        : []),
      { label: 'Display/Delete Relations', icon: <Icon.Lock />, onSelect: () => st.setTaskPane('relations') },
      { label: 'Exit Sketch', icon: <Icon.Exit />, onSelect: st.exitSketch },
      { separator: true },
      { label: 'Zoom to fit', icon: <Icon.Fit />, shortcut: 'F', onSelect: zoomFit },
      { label: 'Normal To', icon: <Icon.Plane />, shortcut: 'Ctrl+8', onSelect: () => camera.normalTo(plane) },
    ];
    return { toolbar, menu };
  };

  const unit = st.doc.units;
  const feedback = st.feedback;
  return (
    <div
      ref={hostRef}
      className={`k-viewport ${sketch ? 'sketching tool-' + st.tool : ''} ${st.planePick || zoomArea.active ? 'picking' : ''} ${feedback ? 'has-feedback' : ''}`}
      style={sceneBackground(st.doc.scene) ? { background: sceneBackground(st.doc.scene) } : undefined}
      data-scene={st.doc.scene?.background ?? 'gradient'}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      // an appearance swatch dragged from the task pane onto the model: applied to the part (as the intended default)
      onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-phlippo-appearance')) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } }}
      onDrop={(e) => { const c = e.dataTransfer.getData('application/x-phlippo-appearance'); if (c) { e.preventDefault(); st.setAppearance(c, null); } }}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { setCursorPx(null); st.setFeedback(null); }}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <Overlay
        sketch={sketch ?? profileSketch ?? dimSketch}
        solve={sketch ? solve : profileSketch ? st.solve[profileSketch.id] ?? null : dimSketch ? st.solve[dimSketch.id] ?? null : null}
        unit={unit}
        dimsOnly={!sketch && !profileSketch && !!dimSketch}
        project={sketch ? project : profileSketch ? (p) => camera.worldToPixel(sketchToWorld(profileSketch.plane, p.x, p.y)) : dimSketch ? (p) => camera.worldToPixel(sketchToWorld(dimSketch.plane, p.x, p.y)) : project}
        toolRender={toolRenderRef.current}
        showRelations={st.show.relations}
        selectedConstraint={st.selectedConstraint}
        hoverConstraint={hoverConstraint}
        onConstraintClick={(id) => st.selectConstraint(id)}
        onConstraintDoubleClick={(id) => {
          const p = cursorPxRef.current ?? { x: 0, y: 0 };
          const r = hostRef.current!.getBoundingClientRect();
          st.selectConstraint(id);
          if (getPref('general.inputDimensionValue')) st.setModify({ id, x: r.left + p.x + 16, y: r.top + p.y + 16 });
          onEditDimension(id);
        }}
        width={size.w}
        height={size.h}
        pxPerUnit={1 / camera.scale}
        registerLabels={(b) => {
          labelBoxes.current = b;
        }}
      />
      {/* plane labels in plane-pick mode / hover */}
      {(() => {
        // each label sits at the plane's corner that is highest on screen; labels that would overlap move down a line
        const sizeW = planeHalf();
        const placed: { id: PlaneId; x: number; y: number; hl: boolean; text: string }[] = [];
        for (const pl of planesToDraw) {
          const b = getPlane(pl.id);
          const corners = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([a, c]) => camera.worldToPixel(b.o.clone().addScaledVector(b.u, a * sizeW * 0.95).addScaledVector(b.v, c * sizeW * 0.72)));
          const p = corners.reduce((m, q) => (q.y < m.y - 0.5 || (Math.abs(q.y - m.y) <= 0.5 && q.x < m.x) ? q : m));
          const text = planeLabel(pl.id);
          let y = p.y;
          const w = text.length * 7.2 + 8;
          for (let guard = 0; guard < 6 && placed.some((o) => Math.abs(o.y - y) < 17 && p.x < o.x + o.text.length * 7.2 + 8 && o.x < p.x + w); guard++) y += 17;
          placed.push({ id: pl.id, x: p.x, y, hl: !!pl.highlight, text });
        }
        return placed.map((l) => (
          <span key={l.id} className={`k-plane-label ${l.hl ? 'hl' : ''}`} data-testid={`plane-label-${l.id}`} style={{ left: l.x, top: l.y }}
            onPointerEnter={() => { labelPlane.current = l.id; }} onPointerLeave={() => { labelPlane.current = null; }}>
            {l.text}
          </span>
        ));
      })()}
      {zoomArea.a && zoomArea.b && (
        <div className="k-zoom-rect" style={{ left: Math.min(zoomArea.a.x, zoomArea.b.x), top: Math.min(zoomArea.a.y, zoomArea.b.y), width: Math.abs(zoomArea.a.x - zoomArea.b.x), height: Math.abs(zoomArea.a.y - zoomArea.b.y) }} />
      )}
      {gestureUi && (
        <div className="k-gesture" data-testid="gesture-guide" style={{ left: gestureUi.x, top: gestureUi.y }}>
          {(['up', 'right', 'down', 'left'] as const).map((d) => <div key={d} className={`k-gesture-item ${d} ${gestureUi.dir === d ? 'active' : ''}`}>{gestureCommands()[d].label}</div>)}
        </div>
      )}
      <Hud camera={camera} zoomFit={zoomFit} onZoomArea={() => setZoomArea({ active: !zoomArea.active })} zoomAreaActive={zoomArea.active} />
      <MatePopup at={cursorPxRef.current} />
      {hoverTag && cursorPxRef.current && <div className="k-face-tag" data-testid="face-tag" style={{ left: cursorPxRef.current.x + 26, top: cursorPxRef.current.y + 30 }}>{hoverTag}</div>}
      <DragHandlesHandle project={(v) => camera.worldToPixel(v)} />
      <ExtrudeHandle project={(v) => camera.worldToPixel(v)} />
      <SelectionToolbar project={(v) => camera.worldToPixel(v)} />
      <Breadcrumbs />
      {st.insertGhost && getPref('assembly.rotateToolbar') !== false && <InsertRotateBar />}
      <MarkupLayer />
      {st.isolated && <div className="k-isolate-bar" data-testid="isolate-bar"><span>Isolate</span><button className="k-btn" onClick={() => st.setIsolated(null)}>Exit Isolate</button></div>}
      {sketch && plane && <DragDimensionsHandle project={(p) => camera.worldToPixel(sketchToWorld(plane, p.x, p.y))} />}
      {st.editContext && (
        <div className="k-editcontext" data-testid="edit-context">
          <span>Editing <b>{st.editContext.componentName}</b> in {st.editContext.assembly.name}</span>
          <button className="k-btn" onClick={st.returnToAssembly}>Return to Assembly</button>
        </div>
      )}
      {sketch && <ConfirmationCorner sketch onOk={st.exitSketch} onCancel={st.discardSketch} />}
      {st.planePick && <ConfirmationCorner sketch={false} onOk={() => st.hoverPlane && st.newSketch(st.hoverPlane)} onCancel={st.cancelPlanePick} />}
      {st.featureEdit && <ConfirmationCorner sketch={false} onOk={st.commitFeature} onCancel={st.cancelFeature} />}
      {st.show.viewSelector && <ViewSelector camera={camera} onClose={() => st.toggleShow('viewSelector')} />}
      {st.triadComponentId && <MoveTriad camera={camera} width={size.w} height={size.h} />}
      <div className="k-triad-wrap">
        <Triad camera={camera} />
        <span className="k-viewname">{st.viewName}</span>
      </div>
      {feedback && cursorPx && (
        <span className="k-feedback" style={{ left: cursorPx.x + 14, top: cursorPx.y + 10 }}>
          {FEEDBACK_ICON[feedback]}
        </span>
      )}
      {st.featureEdit && (st.featureEdit.draft.type === 'linearPattern' || st.featureEdit.draft.type === 'circularPattern') && (() => {
        // instance markers by design: yellow rings per instance, click to add it to Instances to Skip
        const d = st.featureEdit.draft;
        const seed = d.featureIds.map((id) => st.doc.features.find((f) => f.id === id)).find((f) => f && isSketchBased(f) && f.type !== 'sketch');
        if (!seed || !isSketchBased(seed) || seed.type === 'sketch') return null;
        const g = featureGeometry(st.doc, seed, 200).geometry;
        if (!g) return null;
        g.computeBoundingBox();
        const c = g.boundingBox!.getCenter(new THREE.Vector3());
        const pts = patternInstancePoints(d, c);
        return pts.map((p, i) => {
          const q = camera.worldToPixel(p);
          const skipped = d.skip?.includes(i);
          return <div key={i} className={`k-pattern-marker ${skipped ? 'skipped' : ''}`} style={{ left: q.x, top: q.y }} title={skipped ? `Restore instance (${i + 2})` : `Skip instance (${i + 2})`} onPointerDown={(e) => { e.stopPropagation(); st.togglePatternSkip(i); }} />;
        });
      })()}
      {st.featureEdit && (st.featureEdit.draft.type === 'sweep' || st.featureEdit.draft.type === 'loft') && (() => {
        // callouts by design: Profile(Sketch3), Path(Sketch4) / Profile 2(Sketch5) at the sketches
        const d = st.featureEdit.draft;
        const items: { label: string; sketchId: string }[] = [{ label: 'Profile', sketchId: d.sketchId }];
        if (d.type === 'sweep' && d.pathSketchId) items.push({ label: 'Path', sketchId: d.pathSketchId });
        if (d.type === 'loft' && d.sketchId2) items.push({ label: 'Profile 2', sketchId: d.sketchId2 });
        return items.map((it, i) => {
          const sk = st.doc.sketches[it.sketchId];
          if (!sk) return null;
          const pts = Object.values(sk.points);
          if (!pts.length) return null;
          const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
          const q = camera.worldToPixel(sketchToWorld(sk.plane, cx, cy));
          return (
            <div key={i} className="k-callout" style={{ left: q.x + 30, top: q.y - 12 + i * 22 }}>
              <span className="k-callout-leader" style={{ width: 30, left: -30 }} />
              {it.label}({sk.name})
            </div>
          );
        });
      })()}
      {st.doc.autoTolerance && !st.activeSketchId && (() => {
        // MBD Dimensions: the datums, dimensions and tolerances as callouts at their faces
        const dx = st.doc.autoTolerance!;
        const P = (p: [number, number, number]) => camera.worldToPixel(new THREE.Vector3(...p));
        const mid = (a: [number, number, number], b: [number, number, number]): [number, number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
        return (
          <>
            {dx.datums.map((d) => { const q = P(d.face.point); return <div key={d.id} className="k-callout k-dx-datum" data-testid="dx-callout-datum" style={{ left: q.x - 10, top: q.y - 10 }}>{d.label}</div>; })}
            {dx.dims.map((d) => { const q = P(d.faces.length > 1 ? mid(d.faces[0].point, d.faces[1].point) : d.faces[0].point); return <div key={d.id} className={`k-callout k-dx-dim${d.basic ? ' basic' : ''}`} data-testid="dx-callout-dim" style={{ left: q.x + 8, top: q.y - 10 }}>{d.label}{d.basic ? '' : d.plus === d.minus ? ` ±${d.plus}` : ` +${d.plus} −${d.minus}`}</div>; })}
            {dx.gtols.map((g) => { const q = P(g.face.point); return <div key={g.id} className="k-callout k-dx-gtol" data-testid="dx-callout-gtol" style={{ left: q.x + 8, top: q.y + 12 }}>{g.label}</div>; })}
          </>
        );
      })()}
      {st.featureEdit && isRoundFeature(st.featureEdit.draft) && st.featureEdit.draft.edges.length > 0 && (() => {
        const body = st.rebuild.bodies[0];
        const ref = st.featureEdit.draft.edges[0];
        const e = body?.edges.find((x) => Math.hypot(x.centroid.x - ref.centroid[0], x.centroid.y - ref.centroid[1], x.centroid.z - ref.centroid[2]) < 0.5);
        if (!e) return null;
        const q = camera.worldToPixel(e.centroid);
        const d = st.featureEdit.draft;
        return (
          // the callout of the intended design: a leader from the edge to a box with the label and an editable value
          <>
            <svg className="k-callout-line" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              <line x1={q.x} y1={q.y} x2={q.x + 48} y2={q.y + 112} stroke="#000" strokeWidth={1} />
              <circle cx={q.x} cy={q.y} r={3} fill="#fff" stroke="#000" strokeWidth={1} />
              <circle cx={q.x + 48} cy={q.y + 112} r={3} fill="#fff" stroke="#000" strokeWidth={1} />
            </svg>
            <div className="k-callout k-callout-edit" data-testid="round-callout" style={{ left: q.x + 48 - 48, top: q.y + 112 }} onPointerDown={(e) => e.stopPropagation()}>
              <span className="k-callout-label">{d.type === 'fillet' ? 'Radius' : 'Distance'}:</span>
              <input
                className="k-callout-input"
                data-testid="round-callout-input"
                key={d.size}
                defaultValue={`${+d.size.toFixed(2)}${st.doc.units}`}
                onKeyDown={(ev) => {
                  ev.stopPropagation();
                  if (ev.key === 'Enter') { const v = parseFloat((ev.target as HTMLInputElement).value.replace(',', '.')); if (v > 0) st.updateFeatureDraft({ size: v }); }
                }}
                onBlur={(ev) => { const v = parseFloat(ev.target.value.replace(',', '.')); if (v > 0 && Math.abs(v - d.size) > 1e-9) st.updateFeatureDraft({ size: v }); }}
              />
            </div>
          </>
        );
      })()}
      {ctxMenu && (() => {
        const { toolbar, menu } = ctxItems();
        return (
          <div className="k-ctx" style={{ left: ctxMenu.x, top: ctxMenu.y }} onPointerDown={(e) => e.stopPropagation()}>
            {toolbar.length > 0 && (
              <div className="k-ctx-toolbar">
                {toolbar.map((t, i) => (
                  <button key={i} className="k-btn ghost icon k-tip" data-tip={t.label} onClick={() => { t.onSelect?.(); setCtxMenu(null); }}>
                    {t.icon}
                  </button>
                ))}
              </div>
            )}
            <Menu items={menu} onClose={() => setCtxMenu(null)} style={{ position: 'static' }} />
          </div>
        );
      })()}
      {st.motionOpen && <MotionTimeline />}
      <div className="k-docwin" data-testid="doc-window-buttons">
        <button className="k-tip" data-tip="Tile Horizontally" onClick={() => st.pushMessage('One document is open: nothing to tile.')}><svg width="12" height="12" viewBox="0 0 12 12"><rect x="0.5" y="0.5" width="11" height="11" fill="none" stroke="currentColor" /><path d="M0.5 3.5h11M6 3.5v8" stroke="currentColor" /></svg></button>
        <button className="k-tip" data-tip="Tile Vertically" onClick={() => st.pushMessage('One document is open: nothing to tile.')}><svg width="12" height="12" viewBox="0 0 12 12"><rect x="0.5" y="0.5" width="11" height="11" fill="none" stroke="currentColor" /><path d="M0.5 3.5h11M0.5 7.5h11" stroke="currentColor" /></svg></button>
        <button className="k-tip" data-tip="Minimize" onClick={() => st.pushMessage('The document window stays open: it is the only one.')}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 9.5h8" stroke="currentColor" /></svg></button>
        <button className="k-tip" data-tip="Restore Down" onClick={() => st.pushMessage('The document window fills the graphics area.')}><svg width="12" height="12" viewBox="0 0 12 12"><rect x="0.5" y="2.5" width="8" height="8" fill="none" stroke="currentColor" /><path d="M3 2.5V0.5h8v8H8.5" fill="none" stroke="currentColor" /></svg></button>
        <button className="k-tip tip-right" data-tip="Close" onClick={() => (st.dirty ? st.setAsk({ title: 'Phlippo CAD', text: 'Close the document? Unsaved changes are lost.', yes: () => st.newDocument() }) : st.newDocument())}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" /></svg></button>
      </div>
      {st.commandActive && (
        <div className={`k-flyout-tree ${flyout ? 'open' : ''}`}>
          <button className="k-flyout-toggle" onClick={() => setFlyout((f) => !f)}>
            {flyout ? <Icon.ChevronDown size={11} /> : <Icon.ChevronRight size={11} />} <Icon.Part size={14} /> <span>{st.doc.name} (Default) {'<<Def…'}</span>
          </button>
          {flyout && (
            <div className="k-flyout-body" onDoubleClick={() => setFlyout(false)} onPointerDown={(e) => e.stopPropagation()}>
              <FeatureTreeBody />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** an environment for reflections: a sphere with a sky / ground (Courtyard) or a dim hall (Warehouse) gradient */
function gradientEnvironment(kind: 'courtyard' | 'warehouse'): THREE.Scene {
  const scene = new THREE.Scene();
  const g = new THREE.SphereGeometry(100, 32, 16);
  const top = new THREE.Color(kind === 'courtyard' ? 0x9cc8f0 : 0x8a8478), horizon = new THREE.Color(kind === 'courtyard' ? 0xf4f1e6 : 0xd8cfbf), ground = new THREE.Color(kind === 'courtyard' ? 0x6f7a55 : 0x4a4640);
  const pos = g.getAttribute('position');
  const col: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 100;
    const c = y >= 0 ? horizon.clone().lerp(top, Math.pow(y, 0.6)) : horizon.clone().lerp(ground, Math.pow(-y, 0.4));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  scene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  return scene;
}
