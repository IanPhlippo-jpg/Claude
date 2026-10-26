import { useState } from 'react';
import * as THREE from 'three';
import { useStore } from '../store';
import { getPlane, sketchToWorld } from './camera';
import { sketchBounds } from '../../core/sketch/geometry';
import { sketchRegions } from '../../core/features/regions';
import type { ExtrudeFeature } from '../../core/document/types';

/**
 * The drag arrow of the Boss-Extrude / Cut-Extrude PropertyManager, by design: a grey arrow from the middle
 * of the profile to the end of the extrusion; dragging its head along the direction sets the depth (Blind).
 */
export function ExtrudeHandle({ project }: { project: (v: THREE.Vector3) => { x: number; y: number } }) {
  const st = useStore();
  const [drag, setDrag] = useState<{ x: number; y: number; depth: number; dir: 1 | 2 } | null>(null);
  const [hot, setHot] = useState<0 | 1 | 2>(0);
  const d = st.featureEdit?.draft;
  if (!d || d.type !== 'extrude' || st.activeSketchId) return null;
  const f = d as ExtrudeFeature;
  if (f.end !== 'blind' && f.end !== 'midPlane') return null;
  const sk = st.doc.sketches[f.sketchId];
  const b = sk && sketchBounds(sk);
  if (!sk || !b) return null;
  const pl = getPlane(sk.plane);
  const sign = (f.reverse ? -1 : 1) * (f.op === 'cut' ? -1 : 1);
  const n = pl.n.clone().normalize().multiplyScalar(sign);
  // the arrow stands in the middle of the picked regions (Selected Contours), else of the whole profile
  let mid = { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2 };
  if (f.contours?.length) {
    const pts = sketchRegions(sk).filter((_, i) => f.contours!.includes(i)).flatMap((r) => r.outer);
    if (pts.length) mid = { x: (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2, y: (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2 };
  }
  const c = sketchToWorld(sk.plane, mid.x, mid.y);
  const start = f.end === 'midPlane' ? c.clone().addScaledVector(n, -f.depth / 2) : c;
  const end = start.clone().addScaledVector(n, f.end === 'midPlane' ? f.depth : f.depth);
  const p0 = project(start), p1 = project(end);
  const pRef = project(start.clone().addScaledVector(n, 10));
  const pxPerMm = Math.hypot(pRef.x - p0.x, pRef.y - p0.y) / 10;
  if (pxPerMm < 1e-6) return null;
  const ux = (pRef.x - p0.x) / (pxPerMm * 10), uy = (pRef.y - p0.y) / (pxPerMm * 10);
  const d2 = f.end === 'blind' && f.direction2?.end === 'blind' ? f.direction2 : undefined;
  const onDown = (dir: 1 | 2) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({ x: e.clientX, y: e.clientY, depth: dir === 1 ? f.depth : d2?.depth ?? 0, dir });
    useStore.setState({ handleDrag: true });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const along = ((e.clientX - drag.x) * ux + (e.clientY - drag.y) * uy) / pxPerMm;
    if (drag.dir === 2) {
      // the hollow arrow of Direction 2: dragging it switches Direction 2 on (Blind) with that depth, by design
      const v = Math.round((drag.depth - along) * 2) / 2;
      if (v >= 0.5 && Math.abs(v - (d2?.depth ?? 0)) > 1e-9) st.updateFeatureDraft({ direction2: { end: d2?.end ?? 'blind', depth: v } });
      return;
    }
    const v = Math.max(0.5, Math.round((drag.depth + along * (f.end === 'midPlane' ? 2 : 1)) * 2) / 2);
    if (Math.abs(v - f.depth) > 1e-9) st.updateFeatureDraft({ depth: v });
  };
  const onUp = () => { setDrag(null); useStore.setState({ handleDrag: false }); };
  const head = 12, w = 5;
  // while dragging, the arrow is magenta and a ruler along it shows the depth (marks every 5, numbers every 10), by design
  // pointed at: orange (as the intended preselection), dragged: magenta, else grey
  const drag1 = drag?.dir === 1, drag2 = drag?.dir === 2;
  const col = drag1 ? '#c623c6' : hot === 1 ? '#e8771c' : '#8d8d8d', fill = drag1 ? '#d63bd6' : hot === 1 ? '#f08a2c' : '#9a9a9a';
  // Direction 2: a solid arrow at its depth once on, else a short hollow double chevron on the other side
  const L2 = d2 ? d2.depth * pxPerMm : 64;
  const q2 = { x: p0.x - ux * L2, y: p0.y - uy * L2 };
  const col2 = drag2 ? '#c623c6' : hot === 2 ? '#e8771c' : d2 ? '#8d8d8d' : '#c9c9c9';
  const chev = (t: number) => `M${q2.x + ux * t - uy * w},${q2.y + uy * t + ux * w}L${q2.x + ux * (t - 9)},${q2.y + uy * (t - 9)}L${q2.x + ux * t + uy * w},${q2.y + uy * t - ux * w}`;
  const nx = -uy, ny = ux;
  const span = Math.ceil((f.depth + 20) / 5) * 5;
  const ticks = drag ? Array.from({ length: span / 5 + 1 }, (_, i) => i * 5) : [];
  return (
    <svg className="k-extrude-handle" data-testid="extrude-handle" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {drag1 && (
        <g data-testid="extrude-ruler">
          <line x1={p0.x + nx * 6} y1={p0.y + ny * 6} x2={p0.x + nx * 6 + ux * span * pxPerMm} y2={p0.y + ny * 6 + uy * span * pxPerMm} stroke="#555" strokeWidth={0.8} />
          {ticks.map((t) => {
            const bx = p0.x + nx * 6 + ux * t * pxPerMm, by = p0.y + ny * 6 + uy * t * pxPerMm, L = t % 10 === 0 ? 7 : 4;
            return (
              <g key={t}>
                <line x1={bx} y1={by} x2={bx + nx * L} y2={by + ny * L} stroke="#555" strokeWidth={0.8} />
                {t % 10 === 0 && t > 0 && <text x={bx + nx * 16} y={by + ny * 16 + 4} fontSize={11} textAnchor="middle" fill="#555">{t}</text>}
              </g>
            );
          })}
        </g>
      )}
      {f.end === 'blind' && (!f.direction2 || f.direction2.end === 'blind') && (
        <g data-testid="extrude-handle2">
          <line x1={p0.x} y1={p0.y} x2={q2.x + ux * (d2 ? head : 9)} y2={q2.y + uy * (d2 ? head : 9)} stroke={col2} strokeWidth={3} strokeLinecap="round" />
          {!drag2 && hot !== 2 && <line x1={p0.x} y1={p0.y} x2={q2.x + ux * (d2 ? head : 9)} y2={q2.y + uy * (d2 ? head : 9)} stroke={d2 ? '#d9d9d9' : '#ececec'} strokeWidth={1} />}
          {d2
            ? <path d={`M${q2.x},${q2.y}L${q2.x + ux * head - uy * w},${q2.y + uy * head + ux * w}L${q2.x + ux * head + uy * w},${q2.y + uy * head - ux * w}Z`} fill={drag2 ? '#d63bd6' : hot === 2 ? '#f08a2c' : '#9a9a9a'} stroke={drag2 ? '#9a1a9a' : '#6e6e6e'} strokeWidth={0.8} />
            : <>
                <path d={chev(9)} fill="none" stroke={col2} strokeWidth={2} strokeLinejoin="round" />
                <path d={chev(1)} fill="none" stroke={col2} strokeWidth={2} strokeLinejoin="round" />
              </>}
          <circle data-testid="extrude-grip2" cx={q2.x + ux * 5} cy={q2.y + uy * 5} r={8} fill="transparent" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerEnter={() => setHot(2)} onPointerLeave={() => setHot(0)} onPointerDown={onDown(2)} onPointerMove={onMove} onPointerUp={onUp} />
        </g>
      )}
      <line x1={p0.x} y1={p0.y} x2={p1.x - ux * head} y2={p1.y - uy * head} stroke={col} strokeWidth={3} strokeLinecap="round" />
      {!drag1 && hot !== 1 && <line x1={p0.x} y1={p0.y} x2={p1.x - ux * head} y2={p1.y - uy * head} stroke="#d9d9d9" strokeWidth={1} />}
      <path d={`M${p1.x},${p1.y}L${p1.x - ux * head - uy * w},${p1.y - uy * head + ux * w}L${p1.x - ux * head + uy * w},${p1.y - uy * head - ux * w}Z`} fill={fill} stroke={drag1 ? '#9a1a9a' : '#6e6e6e'} strokeWidth={0.8} />
      <circle data-testid="extrude-grip" cx={p1.x - ux * 5} cy={p1.y - uy * 5} r={8} fill="transparent" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerEnter={() => setHot(1)} onPointerLeave={() => setHot(0)} onPointerDown={onDown(1)} onPointerMove={onMove} onPointerUp={onUp} />
      {drag1 && <text x={p1.x + 12} y={p1.y - 6} fontSize={11} fill="#000" stroke="#fff" strokeWidth={3} paintOrder="stroke">{f.depth.toFixed(2)}mm</text>}
    </svg>
  );
}
