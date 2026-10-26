import { useRef, useState } from 'react';
import * as THREE from 'three';
import { isCommandActive, useStore } from '../store';
import { resolvePlaneDef } from '../../core/features/planes';
import type { ExtrudeFeature } from '../../core/document/types';

/** The blind extrusion whose end face is the selected face, with that face's centre and outward normal (world). */
export function extrudeCapOf(st: ReturnType<typeof useStore.getState>): { f: ExtrudeFeature; c: THREE.Vector3; n: THREE.Vector3 } | null {
  const sel = st.selectedFace;
  if (!sel || st.doc.kind === 'assembly' || st.doc.kind === 'drawing') return null;
  const face = st.rebuild.bodies.find((b) => b.id === sel.bodyId)?.faces.find((x) => x.id === sel.faceId);
  if (!face || face.curved) return null;
  const fn = new THREE.Vector3(...face.normal).normalize();
  const fc = new THREE.Vector3(...face.centroid);
  for (const f of st.doc.features) {
    if (f.type !== 'extrude' || f.suppressed || f.end !== 'blind' || f.direction2 || f.thin) continue;
    const sk = st.doc.sketches[f.sketchId];
    if (!sk) continue;
    const pl = resolvePlaneDef(st.doc, sk.plane);
    const n = new THREE.Vector3(...pl.n).normalize().multiplyScalar(f.reverse ? -1 : 1);
    // a cut ends inside the material: its end face looks back toward the sketch
    const outward = f.op === 'cut' ? n.clone().negate() : n;
    if (fn.dot(outward) < 0.999) continue;
    const reach = new THREE.Vector3(...pl.origin).dot(n) + f.depth;
    if (Math.abs(fc.dot(n) - reach) > 1e-3) continue;
    return { f, c: fc, n };
  }
  return null;
}

/**
 * Instant3D, by design: the end face of a blind extrusion gets a drag arrow; dragging it along the
 * extrusion direction changes the depth (ruler readout while dragging, rounded to 0.5 mm).
 */
export function Instant3DHandle({ project }: { project: (v: THREE.Vector3) => { x: number; y: number } }) {
  const st = useStore();
  const [drag, setDrag] = useState<{ x: number; y: number; depth: number; value: number } | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  if (!st.instant3d || isCommandActive(st) || st.activeSketchId) return null;
  const cap = extrudeCapOf(st);
  if (!cap) return null;
  const sign = cap.f.op === 'cut' ? -1 : 1;
  const p0 = project(cap.c), p1 = project(cap.c.clone().addScaledVector(cap.n, sign * 10));
  const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  const pxPerMm = L / 10;
  const len = 48;
  const offset = drag ? (drag.value - cap.f.depth) * pxPerMm * sign : 0;
  const bx = p0.x + ux * offset, by = p0.y + uy * offset;
  const tip = { x: bx + ux * len, y: by + uy * len };
  const onDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({ x: e.clientX, y: e.clientY, depth: cap.f.depth, value: cap.f.depth });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const along = ((e.clientX - drag.x) * ux + (e.clientY - drag.y) * uy) / pxPerMm;
    const v = Math.max(0.5, Math.round((drag.depth + along * sign) * 2) / 2);
    setDrag({ ...drag, value: v });
  };
  const onUp = () => {
    if (drag && Math.abs(drag.value - cap.f.depth) > 1e-9) st.setFeatureDepth(cap.f.id, drag.value);
    setDrag(null);
  };
  const ticks = drag ? Array.from({ length: 11 }, (_, i) => i - 5) : [];
  return (
    <svg ref={ref} className="k-instant3d" data-testid="instant3d" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {drag && (
        <g className="k-instant3d-ruler">
          <line x1={p0.x - ux * 5 * pxPerMm * 2} y1={p0.y - uy * 5 * pxPerMm * 2} x2={p0.x + ux * 5 * pxPerMm * 2} y2={p0.y + uy * 5 * pxPerMm * 2} stroke="#2b2b2b" strokeWidth={1} />
          {ticks.map((k) => <line key={k} x1={p0.x + ux * k * 2 * pxPerMm - uy * 5} y1={p0.y + uy * k * 2 * pxPerMm + ux * 5} x2={p0.x + ux * k * 2 * pxPerMm + uy * 5} y2={p0.y + uy * k * 2 * pxPerMm - ux * 5} stroke="#2b2b2b" strokeWidth={1} />)}
          <rect x={tip.x + 8} y={tip.y - 10} width={64} height={18} fill="#ffffe1" stroke="#7a7a7a" />
          <text x={tip.x + 40} y={tip.y + 3} fontSize={11} textAnchor="middle" fill="#000" data-testid="instant3d-value">{drag.value.toFixed(2)}mm</text>
        </g>
      )}
      <line x1={bx} y1={by} x2={tip.x - ux * 9} y2={tip.y - uy * 9} stroke="#1f4fa8" strokeWidth={2.5} />
      <path d={`M${tip.x},${tip.y}L${tip.x - ux * 11 - uy * 5},${tip.y - uy * 11 + ux * 5}L${tip.x - ux * 11 + uy * 5},${tip.y - uy * 11 - ux * 5}Z`} fill="#1f4fa8" />
      <circle className="k-instant3d-grip" data-testid="instant3d-grip" cx={tip.x} cy={tip.y} r={7} fill="rgba(31,79,168,0.15)" stroke="none" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} />
    </svg>
  );
}
