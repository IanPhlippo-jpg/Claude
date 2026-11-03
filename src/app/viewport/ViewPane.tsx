import { bridge } from './bridge';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { VIEW_QUATERNIONS } from './camera';
import { disposeCanvasTarget, hasWebGL, renderToCanvas } from './glSetup';
import { setStudioView } from './studioLook';
import { SketchScene } from './sketchScene';
import { ErrorBoundary } from '../ErrorBoundary';
import type { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

type PaneView = 'front' | 'top' | 'right';
const title = (view: PaneView) => view[0].toUpperCase() + view.slice(1);

/** the background of the graphics area (Edit Scene), so a pane matches the large view and the theme */
const paneBackground = (sc?: { background: string; color?: string }): string =>
  !sc || sc.background === 'gradient' ? 'var(--bg-viewport-gradient)' : sc.background === 'white' ? '#ffffff' : sc.background === 'color' ? sc.color ?? '#ffffff' : 'linear-gradient(180deg, #5a5f66 0%, #c9ccd1 62%, #f2f2f2 100%)';

/**
 * Window ▸ Viewport ▸ Two View / Four View: an extra viewport showing the model in a standard orientation
 * (Front / Top / Right), fitted to the model; it redraws when the model changes. The large viewport stays the
 * interactive one; double-clicking a pane turns the main view to that orientation. A failing pane shows its own
 * message and leaves the other views alone (QA 0.5.10 F143).
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

/**
 * Draws the scene of the graphics area for this pane's orientation with the graphics area's own renderer (glSetup.ts
 * renderToCanvas): the same studio reflections, lights, black edges and silhouettes. The floor mirror image and the
 * shadow floor stay out (they belong under the large view's model), as does ambient occlusion.
 */
function drawPane(canvas: HTMLCanvasElement, view: PaneView): void {
  const r = bridge.renderer, scene = bridge.scene, bodies = bridge.bodies;
  if (!r || !scene) return;
  const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
  const hidden: THREE.Object3D[] = [];
  bodies?.group.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | undefined;
    if (o.visible && o !== bodies.group && (o.userData.afterAO || (m && !Array.isArray(m) && m.type === 'ShadowMaterial'))) hidden.push(o);
  });
  const box = new THREE.Box3();
  scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible && (o as THREE.Mesh).geometry) { (o as THREE.Mesh).geometry.computeBoundingBox(); const b = (o as THREE.Mesh).geometry.boundingBox; if (b && !b.isEmpty() && o.name && !o.name.startsWith('decal')) box.union(b.clone().applyMatrix4(o.matrixWorld)); } });
  const c = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
  const size = box.isEmpty() ? 100 : box.getSize(new THREE.Vector3()).length() * 0.65;
  const aspect = w / h;
  const cam = new THREE.OrthographicCamera(-size * aspect, size * aspect, size, -size, -100000, 100000);
  // sketches and planes may sit on layer 1 (the occlusion pass puts them there)
  cam.layers.enable(1);
  cam.quaternion.copy(VIEW_QUATERNIONS[view]);
  cam.position.copy(c).add(new THREE.Vector3(0, 0, 1000).applyQuaternion(cam.quaternion));
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
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
    setStudioView(2 * size);
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

function Pane({ view }: { view: PaneView }) {
  const st = useStore(useShallow((s) => ({ rebuild: s.rebuild, doc: s.doc, displayStyle: s.displayStyle, theme: s.theme })));
  const ref = useRef<HTMLCanvasElement>(null);
  // without WebGL the large view says so; each pane says it too instead of breaking the window (QA 0.5.10 F143)
  const [gl] = useState(hasWebGL);
  useEffect(() => {
    const canvas = ref.current;
    return () => { if (canvas) disposeCanvasTarget(canvas); };
  }, []);
  useEffect(() => {
    if (!gl) return;
    // drawn when something it shows changes, when its size changes, and twice shortly after (the studio environment
    // and an exact body swapped in a moment later); no drawing and no pixel read-back while nothing changes
    // (QA 0.5.11 F191: it redrew every 1.5 s)
    let raf = 0;
    const draw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { if (ref.current) drawPane(ref.current, view); }); };
    draw();
    const later = [setTimeout(draw, 400), setTimeout(draw, 1500)];
    const box = ref.current?.parentElement;
    const ro = box && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(draw) : null;
    if (box) ro?.observe(box);
    return () => { cancelAnimationFrame(raf); later.forEach(clearTimeout); ro?.disconnect(); };
  }, [gl, view, st.rebuild, st.doc, st.displayStyle, st.theme]);
  return (
    <div className="k-viewpane" data-testid={`viewpane-${view}`} style={{ background: paneBackground(st.doc.scene) }} onDoubleClick={() => bridge.camera?.setView(view)}>
      {gl ? <canvas ref={ref} /> : <div className="k-nogl" role="alert" data-testid="viewpane-nowebgl">This view needs WebGL, which this computer does not offer. The model is not shown here.</div>}
      <span className="k-viewpane-name">*{title(view)}</span>
    </div>
  );
}
