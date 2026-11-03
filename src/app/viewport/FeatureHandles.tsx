import { useState } from 'react';
import * as THREE from 'three';
import { isCommandActive, useStore } from '../store';
import { resolvePlaneDef } from '../../core/features/planes';
import { revolveAxis } from '../../core/features/solid';
import { sketchRegions } from '../../core/features/regions';
import type { Feature, RevolveFeature, RoundFeature } from '../../core/document/types';
import { DragHandlesHandle } from './DragHandles';

/**
 * Drag Handles on more features (QA 0.5.11, parity row 17 / P2-6): with a feature selected in the tree, a handle on
 * the model changes its main value by dragging, with the same ruler and readout as the extrude depth handle
 * (DragHandles.tsx):
 * - Fillet radius and Chamfer distance: the handle sits on the round (or the chamfer face) in the middle of the first
 *   straight edge and moves with it, so the surface follows the pointer (0.1 mm steps);
 * - Revolve angle: the handle sits on the end cap and points along the turn (1° steps).
 */
export interface ValueHandle {
  /** the feature, the value now, and what one millimetre of travel along `dir` changes it by */
  f: Feature;
  value: number;
  anchor: THREE.Vector3;
  dir: THREE.Vector3;
  perMm: number;
  step: number;
  min: number;
  max: number;
  unit: string;
  apply: (f: Feature, v: number) => Feature;
}

const v3 = (a: [number, number, number]) => new THREE.Vector3(...a);

/** fillet / chamfer: the first straight, open edge; the round's middle lies d(R) inside the corner along the bisector */
function roundHandle(f: RoundFeature): ValueHandle | null {
  const ref = f.edges.find((e) => e.straight && !e.closed && (e as { normals?: unknown }).normals) as (RoundFeature['edges'][number] & { normals: [number, number, number][] }) | undefined;
  if (!ref) return null;
  const n1 = v3(ref.normals[0]).normalize(), n2 = v3(ref.normals[1]).normalize();
  const b = n1.clone().add(n2);
  if (b.lengthSq() < 1e-6) return null;
  b.normalize();
  const half = n1.angleTo(n2) / 2;
  // how far the middle of the round (chamfer face) lies from the sharp corner per unit of size
  const k = f.type === 'fillet' ? 1 / Math.cos(half) - 1 : Math.sin(half);
  if (!(k > 1e-3)) return null;
  const corner = v3(ref.centroid);
  return {
    f, value: f.size, anchor: corner.clone().addScaledVector(b, -k * f.size), dir: b.clone().negate(), perMm: 1 / k, step: 0.1, min: 0.1, max: Infinity, unit: 'mm',
    apply: (x, v) => ({ ...(x as RoundFeature), size: v }),
  };
}

/** revolve: the centre of the profile turned to the end of the sweep; the handle points along the turn */
function revolveHandle(st: ReturnType<typeof useStore.getState>, f: RevolveFeature): ValueHandle | null {
  if (f.end === 'midPlane' || f.direction2 || f.angle >= 360) return null;
  const sk = st.doc.sketches[f.sketchId];
  const axis = sk ? revolveAxis(sk, f.axisEntityId) : null;
  const regions = sk ? sketchRegions(sk) : [];
  if (!sk || !axis || !regions.length) return null;
  const pl = resolvePlaneDef(st.doc, sk.plane);
  const world = (p: { x: number; y: number }) => v3(pl.origin).addScaledVector(v3(pl.u), p.x).addScaledVector(v3(pl.v), p.y);
  const outer = regions[0].outer;
  const c2 = outer.reduce((s, p) => ({ x: s.x + p.x / outer.length, y: s.y + p.y / outer.length }), { x: 0, y: 0 });
  const a = world(axis.a), dir = world(axis.b).sub(a).normalize();
  const p0 = world(c2);
  const radial = p0.clone().sub(a).sub(dir.clone().multiplyScalar(p0.clone().sub(a).dot(dir)));
  const r = radial.length();
  if (r < 1e-3) return null;
  // the end of the sweep is the start turned by ± the angle: the one next to a face of the body
  const body = st.rebuild.bodies.find((x) => x.featureIds.includes(f.id));
  const turned = (sign: number) => {
    const q = new THREE.Quaternion().setFromAxisAngle(dir, (sign * f.angle * Math.PI) / 180);
    return { p: a.clone().add(p0.clone().sub(a).applyQuaternion(q)), tangent: dir.clone().cross(radial.clone().applyQuaternion(q)).normalize().multiplyScalar(sign) };
  };
  const near = (p: THREE.Vector3) => Math.min(...(body?.faces ?? []).map((x) => v3(x.centroid).distanceTo(p)));
  const plus = turned(1), minus = turned(-1);
  const end = near(plus.p) <= near(minus.p) ? plus : minus;
  return {
    f, value: f.angle, anchor: end.p, dir: end.tangent, perMm: 180 / (Math.PI * r), step: 1, min: 1, max: 360, unit: '°',
    apply: (x, v) => ({ ...(x as RevolveFeature), angle: v }),
  };
}

/** the handle of the selected feature, if it has one */
export function featureHandleOf(st: ReturnType<typeof useStore.getState>): ValueHandle | null {
  const f = st.doc.features.find((x) => x.id === st.selectedFeatureId);
  if (!f || f.suppressed || st.doc.kind === 'assembly' || st.doc.kind === 'drawing') return null;
  if (f.type === 'fillet' || f.type === 'chamfer') return roundHandle(f as RoundFeature);
  if (f.type === 'revolve') return revolveHandle(st, f);
  return null;
}

export function FeatureHandles({ project }: { project: (v: THREE.Vector3) => { x: number; y: number } }) {
  const st = useStore();
  const [drag, setDrag] = useState<{ x: number; y: number; value: number } | null>(null);
  if (!st.dragHandles || isCommandActive(st) || st.activeSketchId) return null;
  const h = featureHandleOf(st);
  if (!h) return null;
  const p0 = project(h.anchor), p1 = project(h.anchor.clone().addScaledVector(h.dir, 10));
  const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  const pxPerMm = L / 10;
  const len = 48;
  // while dragging, the handle follows the value (the surface it sits on moves by the same amount)
  const offset = drag ? ((drag.value - h.value) / h.perMm) * pxPerMm : 0;
  const bx = p0.x + ux * offset, by = p0.y + uy * offset;
  const tip = { x: bx + ux * len, y: by + uy * len };
  const snap = (v: number) => Math.min(h.max, Math.max(h.min, Math.round(v / h.step) * h.step));
  const onDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({ x: e.clientX, y: e.clientY, value: h.value });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const along = ((e.clientX - drag.x) * ux + (e.clientY - drag.y) * uy) / pxPerMm;
    setDrag({ ...drag, value: snap(h.value + along * h.perMm) });
  };
  const onUp = () => {
    if (drag && Math.abs(drag.value - h.value) > 1e-9) {
      const doc = st.doc;
      st.applyDocument('Drag Handles', { ...doc, features: doc.features.map((x) => (x.id === h.f.id ? h.apply(x, Number(drag.value.toFixed(6))) : x)) });
    }
    setDrag(null);
  };
  return (
    <svg className="k-dragHandles" data-testid="featureHandles" data-feature={h.f.type} data-ux={ux} data-uy={uy} data-px-per-unit={pxPerMm / h.perMm} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
      {drag && (
        <g className="k-dragHandles-ruler">
          <line x1={p0.x - ux * 10 * pxPerMm} y1={p0.y - uy * 10 * pxPerMm} x2={p0.x + ux * 10 * pxPerMm} y2={p0.y + uy * 10 * pxPerMm} stroke="#2b2b2b" strokeWidth={1} />
          <rect x={tip.x + 8} y={tip.y - 10} width={64} height={18} fill="#ffffe1" stroke="#7a7a7a" />
          <text x={tip.x + 40} y={tip.y + 3} fontSize={11} textAnchor="middle" fill="#000" data-testid="featureHandles-value">{h.unit === '°' ? `${drag.value.toFixed(0)}°` : `${drag.value.toFixed(2)}mm`}</text>
        </g>
      )}
      <line x1={bx} y1={by} x2={tip.x - ux * 9} y2={tip.y - uy * 9} stroke="#1f4fa8" strokeWidth={2.5} />
      <path d={`M${tip.x},${tip.y}L${tip.x - ux * 11 - uy * 5},${tip.y - uy * 11 + ux * 5}L${tip.x - ux * 11 + uy * 5},${tip.y - uy * 11 - ux * 5}Z`} fill="#1f4fa8" />
      <circle className="k-dragHandles-grip" data-testid="featureHandles-grip" cx={tip.x} cy={tip.y} r={7} fill="rgba(31,79,168,0.15)" stroke="none" style={{ pointerEvents: 'all', cursor: 'move' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} />
    </svg>
  );
}

/** every drag handle on the model: the extrude depth on a selected end face, and the value of a selected feature */
export function ModelHandles({ project }: { project: (v: THREE.Vector3) => { x: number; y: number } }) {
  return (
    <>
      <DragHandlesHandle project={project} />
      <FeatureHandles project={project} />
    </>
  );
}
