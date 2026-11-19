/**
 * The resin preview on the plate (docs/33 phase 4): the pixel mask of one layer as the LCD shows it, decoded from the
 * .goo layer data by the independent reader, with a layer slider; in 3D the parts lifted onto their supports and the
 * raft, and a plane at the height of the layer.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { decodePreview } from '../../print/resin/gooReader';
import { currentResinSettings, resinStale, useResin } from './resinStore';
import { liftOf } from '../../print/resin/slice';
import { usePrint } from './printStore';

/** the 3D part of the resin preview: supports, raft and the lifted parts; undone when the preview closes */
export function useResinScene(t: { scene: THREE.Scene; parts: THREE.Group; render: () => void } | null) {
  const r = useResin(useShallow((x) => ({ result: x.result, layer: x.layer })));
  const on = usePrint((x) => x.pmTab === 'preview') && !!r.result;
  const lh = r.result && r.result.stats.layers ? r.result.layers[0].z : 0.05;
  useEffect(() => {
    if (!t || !on || !r.result) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(r.result.supports, 3));
    g.computeVertexNormals();
    const sup = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.7, side: THREE.DoubleSide }));
    const m = useResin.getState().machine;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(m?.size[0] ?? 100, m?.size[1] ?? 100), new THREE.MeshBasicMaterial({ color: 0x3fa9f5, transparent: true, opacity: 0.18,
      side: THREE.DoubleSide, depthWrite: false }));
    plane.position.set((m?.size[0] ?? 100) / 2, (m?.size[1] ?? 100) / 2, (r.layer + 1) * lh);
    t.scene.add(sup, plane);
    t.parts.position.z = r.result.lift;
    t.render();
    return () => { t.scene.remove(sup, plane); g.dispose(); t.parts.position.z = 0; t.render(); };
  }, [t, on, r.result, r.layer, lh]);
}

/** the pixel mask panel with its layer slider */
export function ResinMaskView() {
  const r = useResin(useShallow((x) => ({ result: x.result, layer: x.layer, machine: x.machine })));
  const on = usePrint((x) => x.pmTab === 'preview');
  const canvas = useRef<HTMLCanvasElement>(null);
  // the LCD the layers were sliced for
  const m = r.machine;
  const n = r.result?.stats.layers ?? 0;
  const layer = Math.max(0, Math.min(r.layer, n - 1));
  const img = useMemo(() => {
    if (!r.result || !m || !n) return null;
    const f = Math.max(1, Math.ceil(m.resolution[0] / 640));
    try { return decodePreview(r.result.layers[layer].data, m.resolution[0], m.resolution[1], f); } catch { return null; }
  }, [r.result, layer, m]);
  useEffect(() => {
    const c = canvas.current;
    if (!c || !img) return;
    c.width = img.w; c.height = img.h;
    const g = c.getContext('2d')!;
    const data = g.createImageData(img.w, img.h);
    for (let i = 0; i < img.img.length; i++) {
      const v = img.img[i];
      data.data[4 * i] = v; data.data[4 * i + 1] = v; data.data[4 * i + 2] = v; data.data[4 * i + 3] = 255;
    }
    g.putImageData(data, 0, 0);
  }, [img]);
  // arrows: a layer up or down (Shift: ten)
  useEffect(() => {
    if (!on || !n) return;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, select, textarea')) return;
      const step = e.shiftKey ? 10 : 1, cur = useResin.getState().layer;
      if (e.key === 'ArrowUp') useResin.setState({ layer: Math.min(n - 1, cur + step) });
      else if (e.key === 'ArrowDown') useResin.setState({ layer: Math.max(0, cur - step) });
      else return;
      e.preventDefault(); e.stopPropagation();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [on, n]);
  if (!on || !r.result || !m) return null;
  const l = r.result.layers[layer];
  const pct = (l.area / (m.size[0] * m.size[1])) * 100;
  return (
    <>
      <div className="k-print-mask" data-testid="print-resin-mask">
        <div className="k-print-legend-title">Layer {layer + 1} of {n} · Z {l.z.toFixed(2)} mm · {l.exposure.toFixed(1)} s{resinStale() ? ' · out of date' : ''}</div>
        <canvas ref={canvas} style={{ aspectRatio: `${m.size[0]} / ${m.size[1]}` }} />
        <div className="k-muted">{m.name} · LCD {m.resolution.join(' x ')} px · lit {l.area.toFixed(1)} mm² ({pct.toFixed(2)} %)</div>
      </div>
      <div className="k-print-vslider" data-testid="print-layer-slider">
        <div className="k-print-vlabel">{layer + 1}<br /><small>{l.z.toFixed(2)}</small></div>
        <input type="range" min={0} max={Math.max(0, n - 1)} value={layer} aria-label="Layer" data-testid="print-resin-layer-slider"
          onChange={(e) => useResin.setState({ layer: Number(e.target.value) })} />
        <div className="k-print-vlabel">1</div>
      </div>
    </>
  );
}

/**
 * The support points set by hand on the plate (red: added, grey: where points were taken away), at the height of the
 * part as it is shown: on the plate, or lifted onto its supports in the preview.
 */
export function useSupportMarkers(t: { scene: THREE.Scene; render: () => void } | null) {
  const r = useResin(useShallow((x) => ({ overrides: x.overrides, result: x.result, layerHeight: x.layerHeight, resinId: x.resinId })));
  const preview = usePrint((x) => x.pmTab === 'preview');
  useEffect(() => {
    if (!t) return;
    const s = currentResinSettings();
    const shown = preview && r.result ? r.result.lift : 0;
    const g = new THREE.Group();
    const ball = new THREE.SphereGeometry(0.6, 12, 8);
    const red = new THREE.MeshBasicMaterial({ color: 0xd9363e, depthTest: false }), grey = new THREE.MeshBasicMaterial({ color: 0x6b7280, depthTest: false });
    for (const [x, y, z] of s.addedPoints) { const b = new THREE.Mesh(ball, red); b.position.set(x, y, z - liftOf(s) + shown); b.renderOrder = 6; g.add(b); }
    for (const [x, y] of s.removedPoints) { const b = new THREE.Mesh(ball, grey); b.position.set(x, y, 0.3); b.renderOrder = 6; g.add(b); }
    g.userData.supportMarkers = s.addedPoints.length;
    t.scene.add(g);
    t.render();
    return () => { t.scene.remove(g); ball.dispose(); red.dispose(); grey.dispose(); t.render(); };
  }, [t, r.overrides, r.result, preview]);
}
