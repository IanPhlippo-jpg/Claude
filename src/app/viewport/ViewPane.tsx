import { bridge } from './bridge';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { CadCamera, VIEW_QUATERNIONS } from './camera';
import { disposeCanvasTarget, hasWebGL, renderToCanvas } from './glSetup';
import { setStudioView } from './studioLook';
import { SketchScene } from './sketchScene';
import { ErrorBoundary } from '../ErrorBoundary';
import { filterAllows } from '../SelectionFilterBar';
import { TEST_HOOKS } from '../testHooks';
import { isRoundFeature } from '../../core/document/types';
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

type PaneView = 'front' | 'top' | 'right';
const title = (view: PaneView) => view[0].toUpperCase() + view.slice(1);

/** the background of the graphics area (Edit Scene), so a pane matches the large view and the theme */
const paneBackground = (sc?: { background: string; color?: string }): string =>
  !sc || sc.background === 'gradient' ? 'var(--bg-viewport-gradient)' : sc.background === 'white' ? '#ffffff' : sc.background === 'color' ? sc.color ?? '#ffffff' : 'linear-gradient(180deg, #5a5f66 0%, #c9ccd1 62%, #f2f2f2 100%)';

/**
 * Window ▸ Viewport ▸ Two View / Four View: an extra viewport showing the model in a standard orientation
 * (Front / Top / Right), fitted to the model; it redraws when the model or the selection changes. Every pane has a
 * camera of its own and is interactive like the large view (QA 0.5.11 F192): a click selects the edge or face under
 * the pointer, the middle button rotates (Ctrl pans, Shift zooms, Alt rolls, a double middle click fits), the wheel
 * zooms about the pointer. Double-clicking a pane turns the main view to that orientation. A failing pane shows its
 * own message and leaves the other views alone (QA 0.5.10 F143).
 */
export function ViewPane({ view }: { view: PaneView }) {
  return (
    <ErrorBoundary fallback={(e, retry) => (
      <div className="k-viewpane" data-testid={`viewpane-${view}`}>
        <div className="k-nogl" role="alert" data-testid="viewpane-error">This view could not be drawn: {e.message} <button className="k-btn" onClick={retry}>Retry</button></div>
        <span className="k-viewpane-name">*{title(view)}</span>
      </div>
    )}>
      <Pane view={view} />
    </ErrorBoundary>
  );
}

/** the cameras of the panes that are open, by orientation (read by the e2e scripts through __phlippoPanes) */
const paneCameras = new Map<PaneView, CadCamera>();
if (TEST_HOOKS) (globalThis as unknown as { __phlippoPanes?: typeof paneCameras }).__phlippoPanes = paneCameras;

/** the world box of what the graphics area shows (bodies, sketches, planes; not the decals) */
function sceneBox(scene: THREE.Scene): THREE.Box3 {
  const box = new THREE.Box3();
  scene.traverse((o) => {
    const g = (o as THREE.Mesh).isMesh && o.visible ? (o as THREE.Mesh).geometry : undefined;
    if (!g || !o.name || o.name.startsWith('decal')) return;
    g.computeBoundingBox();
    if (g.boundingBox && !g.boundingBox.isEmpty()) box.union(g.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });
  return box;
}

/** fits the model in a pane h pixels high: centred, the box diagonal at 1.3 times the height */
function fitPane(cam: CadCamera, h: number): void {
  const box = bridge.scene ? sceneBox(bridge.scene) : new THREE.Box3();
  const size = box.isEmpty() ? 100 : box.getSize(new THREE.Vector3()).length() * 0.65;
  cam.target.copy(box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3()));
  cam.scale = Math.min(50, Math.max(0.001, (2 * size) / Math.max(1, h)));
}

/**
 * Draws the scene of the graphics area with the pane's camera and the graphics area's own renderer (glSetup.ts
 * renderToCanvas): the same studio reflections, lights, black edges and silhouettes. The floor mirror image and the
 * shadow floor stay out (they belong under the large view's model), as does ambient occlusion.
 */
function drawPane(canvas: HTMLCanvasElement, pane: CadCamera): void {
  const r = bridge.renderer, scene = bridge.scene, bodies = bridge.bodies;
  if (!r || !scene) return;
  const w = pane.width, h = pane.height, cam = pane.camera;
  const hidden: THREE.Object3D[] = [];
  bodies?.group.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (o.visible && o !== bodies.group && (o.userData.afterAO || (m && !Array.isArray(m) && m.type === 'ShadowMaterial'))) hidden.push(o);
  });
  // sketches and planes may sit on layer 1 (the occlusion pass puts them there)
  cam.layers.enable(1);
  // wide lines are sized against the canvas they are drawn in
  const lines = new Map<LineMaterial, THREE.Vector2>();
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material as LineMaterial | undefined;
    if (m && !Array.isArray(m) && m.isLineMaterial && !lines.has(m)) lines.set(m, m.resolution.clone());
  });
  try {
    for (const o of hidden) o.visible = false;
    for (const m of lines.keys()) m.resolution.set(w, h);
    // the silhouettes of curved faces, the head light and the studio's eye for this pane's orientation and size
    bodies?.updateSilhouettes(cam);
    bodies?.updateLight(cam.quaternion);
    setStudioView(pane.scale * h);
    renderToCanvas(r, scene, cam, canvas, w, h);
  } finally {
    // ...then back to the main view's
    for (const o of hidden) o.visible = true;
    for (const [m, res] of lines) m.resolution.copy(res);
    if (bridge.camera) {
      bodies?.updateSilhouettes(bridge.camera.view);
      bodies?.updateLight(bridge.camera.rotation);
      setStudioView(bridge.camera.scale * SketchScene.resolution.y);
    }
  }
}

/**
 * The body edge within 6 px of a pane pixel, nearest first; an edge behind a face is not picked through it (the
 * large view's rule, Viewport.tsx edgeAt).
 */
function paneEdgeAt(cam: CadCamera, px: number, py: number): string | null {
  const s = useStore.getState();
  const ray = cam.pixelToRay(px, py);
  const hit = s.displayStyle === 'wireframe' || s.displayStyle === 'hiddenVisible' ? null : bridge.bodies?.pick(ray) ?? null;
  const hitDepth = hit ? hit.point.clone().sub(ray.origin).dot(ray.direction) : Infinity;
  const tol = Math.max(0.05, cam.scale * 3);
  let best: string | null = null, bestD = 6, bestPoint: THREE.Vector3 | null = null;
  for (const b of s.rebuild.bodies) for (const e of b.edges) {
    const pts = e.points.map((p) => cam.worldToPixel(p));
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], q = pts[i + 1];
      const dx = q.x - a.x, dy = q.y - a.y;
      const l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
      const d = Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
      if (d >= bestD) continue;
      const w = e.points[i].clone().lerp(e.points[i + 1], t);
      if (w.clone().sub(ray.origin).dot(ray.direction) > hitDepth + tol) continue;
      bestD = d; best = e.id; bestPoint = w;
    }
  }
  if (best && bestPoint) useStore.setState({ edgePick: [bestPoint.x, bestPoint.y, bestPoint.z] });
  return best;
}

/**
 * A left click in a pane, as in the large view: an edge under the pointer before a face; a click on nothing clears
 * the selection; while Sketch waits for a plane, a face starts the sketch on it. Inside an open sketch a pane click
 * selects nothing (the sketch tools work in the large view).
 */
function panePick(cam: CadCamera, px: number, py: number, additive: boolean): void {
  const s = useStore.getState();
  const bodies = bridge.bodies;
  if (s.activeSketchId || s.sketch3dEdit || !bodies) return;
  const face = s.rebuild.bodies.length ? bodies.pick(cam.pixelToRay(px, py)) : null;
  if (s.planePick) {
    if (face) s.sketchOnFace({ bodyId: face.bodyId, faceId: face.faceId });
    return;
  }
  const edge = filterAllows('edges') ? paneEdgeAt(cam, px, py) : null;
  if (edge) { s.toggleSelectedEdge(edge, additive); return; }
  if (s.featureEdit && isRoundFeature(s.featureEdit.draft)) return;
  if (face && filterAllows('faces')) {
    const f = { bodyId: face.bodyId, faceId: face.faceId };
    s.setSelectedFace(!additive && s.dialog !== 'measure' && s.selectedFace?.faceId === f.faceId && s.selectedFaces.length <= 1 ? null : f, additive);
    return;
  }
  if (s.selectedPlane) s.setSelectedPlane(null);
  if (s.selectedFace) s.setSelectedFace(null);
  if (s.selectedFeatureId) s.setSelectedFeature(null);
  if (s.selectedEdges.length && !s.featureEdit) s.toggleSelectedEdge(s.selectedEdges[0]);
}

function Pane({ view }: { view: PaneView }) {
  const st = useStore(useShallow((s) => ({ rebuild: s.rebuild, doc: s.doc, displayStyle: s.displayStyle, theme: s.theme, selectedFace: s.selectedFace, selectedFaces: s.selectedFaces, selectedEdges: s.selectedEdges })));
  const ref = useRef<HTMLCanvasElement>(null);
  // without WebGL the large view says so; each pane says it too instead of breaking the window (QA 0.5.10 F143)
  const [gl] = useState(hasWebGL);
  // the pane's own camera: fitted to the model in the pane's orientation until the user turns, pans or zooms in it
  const [cam] = useState(() => { const c = new CadCamera(); c.rotation.copy(VIEW_QUATERNIONS[view]); c.viewName = view; return c; });
  const moved = useRef(false);
  const nav = useRef<{ mode: 'orbit' | 'pan' | 'zoom' | 'roll'; x: number; y: number } | null>(null);
  const lastMiddle = useRef(0);
  const lastLeft = useRef({ t: 0, x: 0, y: 0 });
  const raf = useRef(0);
  const draw = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const canvas = ref.current;
      if (!canvas) return;
      const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      if (!moved.current) { cam.rotation.copy(VIEW_QUATERNIONS[view]); fitPane(cam, h); }
      cam.resize(w, h);
      drawPane(canvas, cam);
    });
  }, [cam, view]);
  useEffect(() => {
    const canvas = ref.current;
    paneCameras.set(view, cam);
    return () => {
      cancelAnimationFrame(raf.current);
      if (paneCameras.get(view) === cam) paneCameras.delete(view);
      if (canvas) disposeCanvasTarget(canvas);
    };
  }, [cam, view]);
  useEffect(() => {
    if (!gl) return;
    // drawn when something it shows changes (the model, the selection), when its size changes, and twice shortly
    // after (the studio environment and an exact body swapped in a moment later); no drawing and no pixel read-back
    // while nothing changes (QA 0.5.11 F191: it redrew every 1.5 s). Navigating in the pane draws it too (below).
    draw();
    const later = [setTimeout(draw, 400), setTimeout(draw, 1500)];
    const box = ref.current?.parentElement;
    const ro = box && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
    if (box) ro?.observe(box);
    return () => { later.forEach(clearTimeout); ro?.disconnect(); };
  }, [gl, draw, st.rebuild, st.doc, st.displayStyle, st.theme, st.selectedFace, st.selectedFaces, st.selectedEdges]);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (!gl || !ref.current) return;
    if (e.button === 1) {
      // middle: rotate; Ctrl+middle: pan; Shift+middle: zoom; Alt+middle: roll; double middle click: zoom to fit
      e.preventDefault();
      const now = performance.now();
      if (now - lastMiddle.current < 350) {
        lastMiddle.current = 0;
        fitPane(cam, cam.height);
        cam.update();
        draw();
        return;
      }
      lastMiddle.current = now;
      nav.current = { mode: e.ctrlKey ? 'pan' : e.shiftKey ? 'zoom' : e.altKey ? 'roll' : 'orbit', x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    // the second click of a double click (which turns the main view) does not undo the first click's selection
    const p = local(e), now = performance.now(), l = lastLeft.current;
    lastLeft.current = { t: now, x: p.x, y: p.y };
    if (now - l.t < 400 && Math.hypot(p.x - l.x, p.y - l.y) < 5) return;
    panePick(cam, p.x, p.y, e.ctrlKey || e.metaKey || e.shiftKey);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const n = nav.current;
    if (!n) return;
    const dx = e.clientX - n.x, dy = e.clientY - n.y;
    if (!dx && !dy) return;
    n.x = e.clientX;
    n.y = e.clientY;
    moved.current = true;
    if (n.mode === 'pan') cam.pan(dx, dy);
    else if (n.mode === 'zoom') cam.zoomStep(dy > 0 ? 1 + dy * 0.01 : 1 / (1 - dy * 0.01));
    else if (n.mode === 'roll') cam.roll(dx * 0.4);
    else cam.orbit(dx, dy);
    draw();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!nav.current) return;
    nav.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!gl || !ref.current) return;
    // as the large view: roll the wheel toward you to zoom in (reversible in Options), about the pointer
    const zoomIn = useStore.getState().reverseWheel ? e.deltaY < 0 : e.deltaY > 0;
    const p = local(e);
    moved.current = true;
    cam.zoomAt(p.x, p.y, zoomIn ? 1 / 1.12 : 1.12);
    draw();
  };
  return (
    <div className="k-viewpane" data-testid={`viewpane-${view}`} style={{ background: paneBackground(st.doc.scene) }}
      onDoubleClick={() => bridge.camera?.setView(view)} onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onWheel={onWheel} onAuxClick={(e) => e.preventDefault()}>
      {gl ? <canvas ref={ref} /> : <div className="k-nogl" role="alert" data-testid="viewpane-nowebgl">This view needs WebGL, which this computer does not offer. The model is not shown here.</div>}
      <span className="k-viewpane-name">*{title(view)}</span>
    </div>
  );
}
