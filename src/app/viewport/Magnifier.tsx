import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { magnifiedSelection } from '../prefsEffects';
import { renderWithAO } from './ao';
import type { CadCamera } from './camera';

/** diameter of the magnifying glass in screen pixels */
const LENS = 240;

/**
 * Magnified Selection, by design: G shows a magnifying glass around the pointer with the graphics area under it
 * enlarged (3x; the wheel changes it from 2x to 8x while the glass is shown). The glass follows the pointer and lets
 * clicks through, so a click selects what lies under its centre with the normal selection rules (faces, edges, sketch
 * entities). G or Esc closes it. Options ▸ Performance ▸ Magnified selection turns the key off.
 *
 * The enlarged picture is the scene rendered again with the same renderer through a view offset of the camera (the
 * small window around the pointer, full resolution) into a corner of the canvas, copied to the glass and then
 * overdrawn by the normal view in the same task, so the graphics area never shows it.
 */
export function Magnifier({ camera, renderer, scene, host }: { camera: CadCamera; renderer: React.RefObject<THREE.WebGLRenderer | null>; scene: THREE.Scene; host: React.RefObject<HTMLDivElement | null> }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const zoom = useRef(3);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef(0);
  const posRef = useRef(pos);
  posRef.current = pos;

  // G toggles the glass, Esc closes it (before the graphics area's own Esc: the selection stays)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || t.isContentEditable)) return;
      if (open && e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        setOpen(false);
        return;
      }
      if (e.key.toLowerCase() !== 'g' || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const st = useStore.getState();
      if (!open && (!st.hasDocument || st.dialog || st.doc.kind === 'drawing' || !magnifiedSelection())) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setOpen(!open);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  // the glass follows the pointer over the graphics area; the wheel changes the enlargement while it is shown
  useEffect(() => {
    if (!open) return;
    const at = (e: { clientX: number; clientY: number }) => {
      const r = host.current?.getBoundingClientRect();
      return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : null;
    };
    const onMove = (e: PointerEvent) => setPos(at(e));
    const onWheel = (e: WheelEvent) => {
      const r = host.current?.getBoundingClientRect();
      if (!r || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      e.preventDefault();
      e.stopPropagation();
      zoom.current = Math.min(8, Math.max(2, zoom.current * (e.deltaY < 0 ? 1.25 : 0.8)));
      draw();
    };
    window.addEventListener('pointermove', onMove, true);
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    const unsub = useStore.subscribe(() => draw());
    const prev = camera.onChange;
    camera.onChange = () => { prev?.(); draw(); };
    if (!posRef.current && host.current) setPos({ x: host.current.clientWidth / 2, y: host.current.clientHeight / 2 });
    return () => {
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('wheel', onWheel, true);
      unsub();
      camera.onChange = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, camera, host]);

  useEffect(() => {
    if (open) draw();
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos]);

  function draw() {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(paint);
  }

  function paint() {
    const gl = renderer.current, out = canvas.current, p = posRef.current;
    if (!gl || !out || !p || !camera.width) return;
    const pr = gl.getPixelRatio();
    const W = camera.width, H = camera.height;
    const d = Math.min(LENS, W, H);
    const win = d / zoom.current;
    // the window of the view around the pointer, rendered at the full size of the glass in the lower left corner
    const cam = (camera.view as THREE.OrthographicCamera | THREE.PerspectiveCamera).clone();
    cam.setViewOffset(W, H, p.x - win / 2, p.y - win / 2, win, win);
    cam.updateProjectionMatrix();
    const vp = gl.getViewport(new THREE.Vector4());
    gl.setScissorTest(true);
    gl.setScissor(0, 0, d, d);
    gl.setViewport(0, 0, d, d);
    gl.render(scene, cam);
    const ctx = out.getContext('2d');
    const px = Math.round(d * pr);
    if (out.width !== px) { out.width = px; out.height = px; }
    if (ctx) {
      ctx.clearRect(0, 0, px, px);
      ctx.drawImage(gl.domElement, 0, gl.domElement.height - px, px, px, 0, 0, px, px);
      // where (screen pixel) and how far the glass was last painted, for the e2e scripts to wait on a fresh picture
      const hr = host.current?.getBoundingClientRect();
      out.dataset.at = `${Math.round(p.x + (hr?.left ?? 0))},${Math.round(p.y + (hr?.top ?? 0))},${zoom.current}`;
    }
    gl.setScissorTest(false);
    gl.setViewport(vp);
    // the normal view again over the corner (with ambient occlusion when the graphics area uses it)
    const st = useStore.getState();
    if (st.show.ambientOcclusion && st.displayStyle !== 'wireframe' && !st.activeSketchId) renderWithAO(gl, scene, camera.view);
    else gl.render(scene, camera.view);
  }

  if (!open || !pos) return null;
  return (
    <div className="k-magnifier" data-testid="magnifier" data-zoom={zoom.current} style={{ position: 'absolute', left: pos.x - LENS / 2, top: pos.y - LENS / 2, width: LENS, height: LENS, borderRadius: '50%', overflow: 'hidden', pointerEvents: 'none', zIndex: 30, border: '2px solid #3d3d3d', boxShadow: '0 2px 10px rgba(0,0,0,0.35)', background: '#fff' }}>
      <canvas ref={canvas} data-testid="magnifier-canvas" style={{ width: '100%', height: '100%', display: 'block' }} />
      <svg style={{ position: 'absolute', inset: 0 }} width={LENS} height={LENS}>
        <line x1={LENS / 2 - 8} y1={LENS / 2} x2={LENS / 2 + 8} y2={LENS / 2} stroke="#d01f1f" strokeWidth={1} />
        <line x1={LENS / 2} y1={LENS / 2 - 8} x2={LENS / 2} y2={LENS / 2 + 8} stroke="#d01f1f" strokeWidth={1} />
      </svg>
    </div>
  );
}
