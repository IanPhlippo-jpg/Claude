import './print.css';
/**
 * The graphics area of the 3D Print tab (docs/34 4.4, 4.5): the bed with a 10 / 50 mm grid and the printer name, the
 * build volume as a thin box, the parts (red outside the volume), Lay Flat with the face under the pointer lit, and
 * after slicing the layer preview with a two-handle layer slider, a move slider and the legend.
 * Mouse as in the rest of the program: middle button rotates (left on the empty bed too), Ctrl+middle or right pans,
 * the wheel zooms; left-drag on a part moves it on the bed.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { cancelSession, currentPrinter, dragItem, fmtTime, layFlatSelected, okSession, selectItem, usePrint, type ColorBy } from './printStore';
import { useStore } from '../store';
import { insideVolume, worldPositions } from '../../print/plate';
import { printerName } from '../../print/database';
import { buildPreview, indicesPerSegment } from './previewGeometry';
import { LINE_COLORS, LINE_LABELS, scaleColor } from './previewColors';
import { LINE_TYPES, SEG_STRIDE, type LineType } from '../../print/types';
import { NOT_PRINTED } from '../../print/gcode/dialects';
import { ResinMaskView, useResinScene } from './ResinView';

interface View { theta: number; phi: number; dist: number; target: THREE.Vector3 }

const TITLES: Record<ColorBy, string> = { type: 'Line Type', speed: 'Speed (mm/s)', height: 'Layer Height (mm)', width: 'Line Width (mm)', flow: 'Flow (mm³/s)', fan: 'Fan Speed (%)',
  filament: 'Filament' };
const DIGITS: Partial<Record<ColorBy, number>> = { speed: 0, fan: 0, flow: 1 };

function bedTexture(name: string, w: number, d: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  const s = 4;
  c.width = Math.min(2048, Math.round(w * s)); c.height = Math.min(2048, Math.round(d * s));
  const k = c.width / w;
  const g = c.getContext('2d')!;
  g.fillStyle = '#3b3f45'; g.fillRect(0, 0, c.width, c.height);
  for (let x = 0; x <= w; x += 10) { g.strokeStyle = x % 50 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.28)'; g.lineWidth = x % 50 ? 1 : 2; g.beginPath(); g.moveTo(x * k,
    0); g.lineTo(x * k, c.height); g.stroke(); }
  for (let y = 0; y <= d; y += 10) { g.strokeStyle = y % 50 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.28)'; g.lineWidth = y % 50 ? 1 : 2; g.beginPath(); g.moveTo(0,
    c.height - y * k); g.lineTo(c.width, c.height - y * k); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.font = `${Math.round(9 * k)}px Segoe UI, Arial, sans-serif`;
  g.fillText(name, 8 * k, c.height - 8 * k);
  // the origin: front left
  g.fillStyle = '#d9363e'; g.fillRect(0, c.height - 3 * k, 12 * k, 3 * k);
  g.fillStyle = '#3ba55d'; g.fillRect(0, c.height - 12 * k, 3 * k, 12 * k);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function PlateView() {
  const host = useRef<HTMLDivElement>(null);
  const s = usePrint(useShallow((x) => ({ plates: x.plates, plateIndex: x.plateIndex, selected: x.selected, printerId: x.printerId, db: x.db, slots: x.slots, tool: x.tool, pmTab: x.pmTab,
    result: x.result, colorBy: x.colorBy, hidden: x.hidden, layerLo: x.layerLo, layerHi: x.layerHi, move: x.move, slicing: x.slicing })));
  const printer = currentPrinter();
  const three = useRef<{ renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; view: View; parts: THREE.Group; bed: THREE.Group; preview: THREE.Mesh;
    hover: THREE.Mesh; nozzle: THREE.Mesh; render: () => void } | null>(null);
  const [, force] = useState(0);
  const items = s.plates[s.plateIndex]?.items ?? [];
  const previewOn = s.pmTab === 'preview' && !!s.result;
  const lastCount = useRef(0);
  /** frames the parts on the plate (or the whole bed) */
  const fit = () => {
    const t = three.current;
    if (!t || !printer) return;
    const box = new THREE.Box3();
    for (const c of t.parts.children) if (c instanceof THREE.Mesh) box.expandByObject(c);
    if (box.isEmpty()) { const [bx, by, bz] = printer.buildVolume; t.view.target.set(bx / 2, by / 2, 0); t.view.dist = Math.max(bx, by, bz) * 2.4; }
    else {
      const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      t.view.target.copy(c);
      t.view.dist = Math.max(90, Math.max(size.x, size.y, size.z) * 3.2);
    }
    t.render();
  };

  // set up once
  useEffect(() => {
    const el = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch { return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.7);
    sun.position.set(-150, -250, 400);
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 10000);
    camera.up.set(0, 0, 1);
    const parts = new THREE.Group(), bed = new THREE.Group();
    scene.add(bed, parts);
    const preview = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0 }));
    preview.frustumCulled = false;
    scene.add(preview);
    const hover = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x3fa9f5, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthTest: false }));
    hover.renderOrder = 5;
    scene.add(hover);
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(1.6, 5, 16).rotateX(-Math.PI / 2).translate(0, 0, 2.5), new THREE.MeshStandardMaterial({ color: 0xd9363e }));
    nozzle.visible = false;
    scene.add(nozzle);
    const view: View = { theta: -Math.PI / 2 + 0.55, phi: 1.05, dist: 600, target: new THREE.Vector3(128, 128, 0) };
    let raf = 0;
    const render = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { theta, phi, dist, target } = view;
        camera.position.set(target.x + dist * Math.sin(phi) * Math.cos(theta), target.y + dist * Math.sin(phi) * Math.sin(theta), target.z + dist * Math.cos(phi));
        camera.lookAt(target);
        renderer.render(scene, camera);
      });
    };
    const resize = () => { const r = el.getBoundingClientRect(); renderer.setSize(Math.max(1, r.width), Math.max(1, r.height)); camera.aspect = Math.max(1, r.width) / Math.max(1,
      r.height); camera.updateProjectionMatrix(); render(); };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    three.current = { renderer, scene, camera, view, parts, bed, preview, hover, nozzle, render };
    resize();
    force((n) => n + 1);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); renderer.dispose(); el.removeChild(renderer.domElement); three.current = null; };
  }, []);

  // bed, grid, build volume
  useEffect(() => {
    const t = three.current;
    if (!t || !printer) return;
    t.bed.clear();
    const [bx, by, bz] = printer.buildVolume;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(bx, by), new THREE.MeshStandardMaterial({ map: bedTexture(printerName(printer), bx, by), roughness: 0.9 }));
    plane.position.set(bx / 2, by / 2, -0.02);
    t.bed.add(plane);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(bx, by, bz)), new THREE.LineBasicMaterial({ color: 0x5b6573, transparent: true, opacity: 0.55 }));
    edge.position.set(bx / 2, by / 2, bz / 2);
    t.bed.add(edge);
    t.view.target.set(bx / 2, by / 2, 0);
    t.view.dist = Math.max(bx, by, bz) * 2.4;
    t.render();
  }, [printer?.id, three.current]);

  // parts
  useEffect(() => {
    const t = three.current;
    if (!t || !printer) return;
    t.parts.clear();
    for (const it of items) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(worldPositions(it), 3));
      g.computeVertexNormals();
      const out = !insideVolume(it, printer);
      const color = out ? '#e02020' : s.slots[it.filament]?.color ?? '#d0d4da';
      const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, transparent: previewOn, opacity: previewOn ? 0.12 : 1, depthWrite: !previewOn,
        emissive: it.id === s.selected && !out ? 0x1f4f9a : 0x000000, emissiveIntensity: 0.35 }));
      mesh.userData.id = it.id;
      t.parts.add(mesh);
      if (it.id === s.selected && !previewOn) {
        // the selected part: its bounding box in the selection colour (no mesh edges: a faceted mesh would show them all)
        g.computeBoundingBox();
        const bb = g.boundingBox!;
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z)),
          new THREE.LineBasicMaterial({ color: 0x3fa9f5 }));
        e.position.copy(bb.getCenter(new THREE.Vector3()));
        t.parts.add(e);
      }
    }
    t.render();
    // a part added to an empty plate: the view frames it
    if (items.length && items.length !== lastCount.current) fit();
    lastCount.current = items.length;
  }, [items, s.selected, s.slots, printer?.id, previewOn, three.current]);

  // preview geometry
  const pm = useMemo(() => (s.result ? buildPreview(s.result.preview, s.result.mesh, s.colorBy, s.hidden, s.slots.map((x) => x.color)) : null), [s.result, s.colorBy, s.hidden, s.slots]);
  const layers = s.result?.stats.layers ?? 0;
  useEffect(() => {
    const t = three.current;
    if (!t) return;
    t.preview.visible = previewOn && !!pm;
    t.nozzle.visible = false;
    if (pm && previewOn) {
      if (t.preview.geometry !== pm.geometry) { t.preview.geometry.dispose(); t.preview.geometry = pm.geometry; }
      const lo = Math.max(0, Math.min(s.layerLo, layers - 1)), hi = Math.max(lo, Math.min(s.layerHi, layers - 1));
      const a = pm.layerStart[lo], bEnd = pm.layerStart[hi + 1] ?? pm.count;
      const b = Math.min(bEnd, pm.layerStart[hi] + s.move);
      pm.geometry.setDrawRange(a * indicesPerSegment, Math.max(0, b - a) * indicesPerSegment);
      const last = b - 1;
      if (last >= 0 && last < pm.count) {
        const o = pm.segIndex[last] * SEG_STRIDE, sg = s.result!.preview.segs;
        t.nozzle.position.set(sg[o + 2], sg[o + 3], sg[o + 4]);
        t.nozzle.visible = true;
      }
    }
    t.render();
  }, [pm, previewOn, s.layerLo, s.layerHi, s.move, layers, three.current]);
  useEffect(() => { if (pm && previewOn) fit(); }, [s.result, previewOn]);

  // mouse
  useEffect(() => {
    const t = three.current;
    const el = host.current;
    if (!t || !el) return;
    const ray = new THREE.Raycaster();
    const ndc = (e: PointerEvent | MouseEvent) => { const r = el.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1); };
    const pick = (e: PointerEvent | MouseEvent) => { ray.setFromCamera(ndc(e), t.camera); return ray.intersectObjects(t.parts.children.filter((c) => c instanceof THREE.Mesh), false)[0] ?? null; };
    const bedPoint = (e: PointerEvent | MouseEvent) => { ray.setFromCamera(ndc(e),
      t.camera); const p = new THREE.Vector3(); return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), p) ? p : null; };
    /** the coplanar faces around the hit triangle (Lay Flat highlight) */
    const faceRegion = (hit: THREE.Intersection): { pos: Float32Array; n: THREE.Vector3 } | null => {
      if (!hit.face) return null;
      const g = (hit.object as THREE.Mesh).geometry;
      const p = g.getAttribute('position').array as Float32Array;
      const tri = hit.faceIndex ?? 0;
      const nOf = (i: number) => new THREE.Vector3(p[i * 9 + 3] - p[i * 9], p[i * 9 + 4] - p[i * 9 + 1], p[i * 9 + 5] - p[i * 9 + 2]).cross(new THREE.Vector3(p[i * 9 + 6] - p[i * 9],
        p[i * 9 + 7] - p[i * 9 + 1], p[i * 9 + 8] - p[i * 9 + 2])).normalize();
      const n = nOf(tri);
      const d = n.dot(new THREE.Vector3(p[tri * 9], p[tri * 9 + 1], p[tri * 9 + 2]));
      const out: number[] = [];
      for (let i = 0; i < p.length / 9; i++) {
        const ni = nOf(i);
        if (ni.dot(n) < 0.9998) continue;
        if (Math.abs(n.dot(new THREE.Vector3(p[i * 9], p[i * 9 + 1], p[i * 9 + 2])) - d) > 0.05) continue;
        for (let k = 0; k < 9; k++) out.push(p[i * 9 + k] + n.getComponent(k % 3) * 0.05);
      }
      return { pos: Float32Array.from(out), n };
    };
    let drag: { mode: 'rotate' | 'pan' | 'move'; x: number; y: number; id?: string; last?: THREE.Vector3; first?: boolean } | null = null;
    const down = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      const st = usePrint.getState();
      if (e.button === 0) {
        const hit = st.pmTab === 'preview' && st.result ? null : pick(e);
        if (hit && st.tool === 'layFlat') {
          const id = hit.object.userData.id as string;
          const fr = faceRegion(hit);
          selectItem(id);
          if (fr) layFlatSelected([fr.n.x, fr.n.y, fr.n.z]);
          usePrint.setState({ tool: 'select' });
          t.hover.visible = false;
          return;
        }
        if (hit) { selectItem(hit.object.userData.id as string); drag = { mode: 'move', x: e.clientX, y: e.clientY, id: hit.object.userData.id as string, last: bedPoint(e) ?? undefined,
          first: true }; return; }
        if (st.pmTab !== 'preview') selectItem(null);
        drag = { mode: 'rotate', x: e.clientX, y: e.clientY };
      } else if (e.button === 1) drag = { mode: e.ctrlKey ? 'pan' : 'rotate', x: e.clientX, y: e.clientY };
      else if (e.button === 2) drag = { mode: 'pan', x: e.clientX, y: e.clientY };
    };
    const move = (e: PointerEvent) => {
      if (!drag) {
        if (usePrint.getState().tool === 'layFlat') {
          const hit = pick(e), fr = hit && faceRegion(hit);
          t.hover.visible = !!fr;
          if (fr) { t.hover.geometry.dispose(); t.hover.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(fr.pos, 3)); }
          t.render();
        }
        return;
      }
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (drag.mode === 'rotate') { t.view.theta -= dx * 0.008; t.view.phi = Math.max(0.05, Math.min(Math.PI / 2 + 0.6, t.view.phi - dy * 0.008)); }
      else if (drag.mode === 'pan') {
        const k = t.view.dist * 0.0015;
        const right = new THREE.Vector3().setFromMatrixColumn(t.camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(t.camera.matrixWorld, 1);
        t.view.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
      } else if (drag.mode === 'move' && drag.id) {
        const p = bedPoint(e);
        if (p && drag.last) { dragItem(drag.id, p.x - drag.last.x, p.y - drag.last.y, !!drag.first); drag.first = false; drag.last = p; }
      }
      t.render();
    };
    const up = (e: PointerEvent) => { drag = null; try { el.releasePointerCapture(e.pointerId); } catch { /* released */ } };
    const wheel = (e: WheelEvent) => { e.preventDefault(); t.view.dist = Math.max(20, Math.min(5000, t.view.dist * (e.deltaY > 0 ? 1.12 : 1 / 1.12))); t.render(); };
    const ctx = (e: MouseEvent) => e.preventDefault();
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('contextmenu', ctx);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('wheel',
      wheel); el.removeEventListener('contextmenu', ctx); };
  }, [three.current]);

  // keys in the preview: arrows move a layer (Shift: ten) and a move
  useEffect(() => {
    if (!previewOn) return;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, select, textarea')) return;
      const st = usePrint.getState(), n = layers;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowUp') usePrint.setState({ layerHi: Math.min(n - 1, st.layerHi + step), move: Number.MAX_SAFE_INTEGER });
      else if (e.key === 'ArrowDown') usePrint.setState({ layerHi: Math.max(st.layerLo, st.layerHi - step), move: Number.MAX_SAFE_INTEGER });
      else if (e.key === 'ArrowLeft') usePrint.setState({ move: Math.max(0, Math.min(st.move, layerMoves(st.layerHi)) - step) });
      else if (e.key === 'ArrowRight') usePrint.setState({ move: Math.min(layerMoves(st.layerHi), st.move + step) });
      else return;
      e.preventDefault(); e.stopPropagation();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  });
  // F: zoom to the parts (the bed when it is empty)
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.key === 'f' || e.key === 'F') && !(e.target as HTMLElement)?.closest?.('input, select, textarea')) { fit(); e.stopPropagation(); } };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  });
  const layerMoves = (l: number) => (pm ? (pm.layerStart[l + 1] ?? pm.count) - pm.layerStart[l] : 0);

  const resin = printer?.technology === 'resin';
  useResinScene(resin ? three.current : null);
  const st = s.result?.stats;
  const zOf = (l: number) => s.result?.preview.layerZ[l] ?? 0;
  const hiMoves = layerMoves(s.layerHi);
  return (
    <div className="k-print-view" data-testid="print-view">
      <div ref={host} className="k-print-canvas" />
      {previewOn && st && (
        <>
          <div className="k-print-legend" data-testid="print-legend">
            <div className="k-print-legend-title">{TITLES[s.colorBy]}</div>
            {s.colorBy === 'type' && LINE_TYPES.filter((t) => (st.timeByType[t] ?? 0) > 0).map((t: LineType) => (
              // the eye: a click shows or hides the line type (docs/34 4.5)
              <button key={t} type="button" className={`k-print-legend-row ${s.hidden.includes(t) ? 'off' : ''}`} data-testid={`legend-${t}`}
                onClick={() => usePrint.setState({ hidden: s.hidden.includes(t) ? s.hidden.filter((x) => x !== t) : [...s.hidden, t] })}>
                <span className="k-print-eye">{s.hidden.includes(t) ? '○' : '◉'}</span><span className="k-print-swatch" style={{ background: LINE_COLORS[t] }} />
                <span>{LINE_LABELS[t]}</span><span className="grow" /><span>{fmtTime(st.timeByType[t])}</span>
              </button>
            ))}
            {s.colorBy === 'type' && (st.timeByType.wait ?? 0) > 0 && (
              // the minimum layer time spent waiting beside the part (docs/35 H-3): the rows add up to the print time
              <div className="k-print-legend-row" data-testid="legend-wait"><span className="k-print-eye" /><span className="k-print-swatch k-print-swatch-wait" />
                <span>Wait</span><span className="grow" /><span>{fmtTime(st.timeByType.wait)}</span></div>
            )}
            {s.colorBy !== 'type' && s.colorBy !== 'filament' && pm?.range && (
              <div className="k-print-scale"><div className="k-print-scalebar"
                style={{ background: `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1].map((v) => `rgb(${scaleColor(v).map((c) => Math.round(c * 255)).join(',')})`).join(',')})` }} /><div
                  className="k-print-scalelabels"><span>{pm.range[0].toFixed(DIGITS[s.colorBy] ?? 2)}</span><span>{pm.range[1].toFixed(DIGITS[s.colorBy] ?? 2)}</span></div></div>
            )}
            {s.colorBy === 'filament' && s.slots.map((sl,
              i) => <div key={i} className="k-print-legend-row"><span className="k-print-swatch" style={{ background: sl.color }} /><span>Filament {i + 1}</span></div>)}
            <div className="k-print-legend-sum">
              <div><span>Total time</span><b>{fmtTime(st.totalTime)}</b></div>
              <div><span>Filament</span><b>{st.filament.reduce((a, f) => a + f.grams, 0).toFixed(1)} g · {(st.filament.reduce((a, f) => a + f.length,
                0) / 1000).toFixed(2)} m · € {st.filament.reduce((a, f) => a + f.cost, 0).toFixed(2).replace('.', ',')}</b></div>
              <div><span>Layers</span><b>{st.layers}</b></div>
            </div>
          </div>
          <div className="k-print-vslider" data-testid="print-layer-slider">
            <div className="k-print-vlabel">{s.layerHi + 1}<br /><small>{zOf(s.layerHi).toFixed(2)}</small></div>
            <input type="range" min={0} max={Math.max(0, layers - 1)} value={s.layerHi} aria-label="Top layer" data-testid="print-layer-top"
              onChange={(e) => usePrint.setState({ layerHi: Math.max(s.layerLo, Number(e.target.value)), move: Number.MAX_SAFE_INTEGER })} />
            <input type="range" min={0} max={Math.max(0, layers - 1)} value={s.layerLo} aria-label="Bottom layer" className="k-print-lo"
              onChange={(e) => usePrint.setState({ layerLo: Math.min(s.layerHi, Number(e.target.value)) })} />
            <div className="k-print-vlabel">{s.layerLo + 1}</div>
          </div>
          <div className="k-print-hslider">
            <input type="range" min={0} max={hiMoves} value={Math.min(s.move, hiMoves)} aria-label="Moves of the top layer" data-testid="print-move-slider"
              onChange={(e) => usePrint.setState({ move: Number(e.target.value) })} />
            <span>{Math.min(s.move, hiMoves)} / {hiMoves}</span>
          </div>
        </>
      )}
      {resin && <ResinMaskView />}
      {s.slicing && <div className="k-print-progress" data-testid="print-progress"><div
        style={{ width: `${Math.round(s.slicing.fraction * 100)}%` }} /><span>{s.slicing.stage} {Math.round(s.slicing.fraction * 100)} %</span></div>}
      {/* the confirmation corner: OK keeps the plate and the settings, Cancel goes back (as Exit Sketch) */}
      <div className="k-print-corner">
        <button className="k-tip" data-tip="OK" onClick={() => { okSession(); useStore.getState().setTab(useStore.getState().doc.kind === 'assembly' ? 'assembly' : 'features'); }}>&#10003;</button>
        <button className="k-tip" data-tip="Cancel" onClick={() => { cancelSession(); useStore.getState().setTab(useStore.getState().doc.kind === 'assembly' ? 'assembly' : 'features');
          }}>&#10005;</button>
      </div>
      <div className="k-print-badge">{printer ? printerName(printer) : ''} · {NOT_PRINTED}</div>
      {s.plates.length > 1 && <div className="k-print-platetabs">{s.plates.map((p,
        i) => <button key={p.id} className={i === s.plateIndex ? 'active' : ''} onClick={() => usePrint.setState({ plateIndex: i, selected: null, result: null })}>{p.name}</button>)}</div>}
    </div>
  );
}
