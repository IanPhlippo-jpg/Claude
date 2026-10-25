import { bridge } from './bridge';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { VIEW_QUATERNIONS } from './camera';

/**
 * Window ▸ Viewport ▸ Two View / Four View: an extra viewport showing the model in a standard orientation
 * (Front / Top / Right), fitted to the model; it redraws when the model changes. The large viewport stays the
 * interactive one; double-clicking a pane turns the main view to that orientation.
 */
export function ViewPane({ view }: { view: 'front' | 'top' | 'right' }) {
  const st = useStore();
  const ref = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = r;
    return () => { r.dispose(); rendererRef.current = null; };
  }, []);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = ref.current, r = rendererRef.current;
      const scene = bridge.scene;
      if (!canvas || !r || !scene) return;
      const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      r.setSize(w, h, false);
      const box = new THREE.Box3();
      scene.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.visible && (o as THREE.Mesh).geometry) { (o as THREE.Mesh).geometry.computeBoundingBox(); const b = (o as THREE.Mesh).geometry.boundingBox; if (b && !b.isEmpty() && o.name && !o.name.startsWith('decal')) box.union(b.clone().applyMatrix4(o.matrixWorld)); } });
      const c = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
      const size = box.isEmpty() ? 100 : box.getSize(new THREE.Vector3()).length() * 0.65;
      const aspect = w / h;
      const cam = new THREE.OrthographicCamera(-size * aspect, size * aspect, size, -size, -100000, 100000);
      cam.quaternion.copy(VIEW_QUATERNIONS[view]);
      cam.position.copy(c).add(new THREE.Vector3(0, 0, 1000).applyQuaternion(cam.quaternion));
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      // the silhouettes of curved faces for this pane's orientation, then back to the main view's
      bridge.bodies?.updateSilhouettes(cam);
      r.render(scene, cam);
      if (bridge.camera) bridge.bodies?.updateSilhouettes(bridge.camera.view);
    };
    raf = requestAnimationFrame(draw);
    const t = setInterval(draw, 1500);
    return () => { cancelAnimationFrame(raf); clearInterval(t); };
  }, [view, st.rebuild, st.doc, st.displayStyle]);
  return (
    <div className="k-viewpane" data-testid={`viewpane-${view}`} onDoubleClick={() => bridge.camera?.setView(view)}>
      <canvas ref={ref} />
      <span className="k-viewpane-name">*{view[0].toUpperCase() + view.slice(1)}</span>
    </div>
  );
}
