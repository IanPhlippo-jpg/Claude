import * as THREE from 'three';
import type { Document, ExtrudeFeature } from '../../../core/document/types';
import type { SketchPoint } from '../../../core/sketch/types';
import { resolvePlaneDef } from '../../../core/features/planes';
import { sketchRegions } from '../../../core/features/regions';
import { linearMap, type ModelHandle } from './handleMath';
import { dragSketchEdge, type EdgeTarget } from './sketchDrag';

/**
 * Handles on the sketch of a selected extrusion, by design: every line of the profile (rectangles, polygons, any
 * closed outline) and every circle gets a small arrow on the end face (a cut: on the face it was sketched on), pointing
 * out of the profile. Dragging it moves that line (the side face over it) or the circle's radius through the sketch
 * solver (sketchDrag.ts). Arcs, splines, ellipses and slots are not dragged this way (their dimensions are dragged in
 * the sketch with Drag Dimensions).
 */
function inPoly(p: SketchPoint, poly: SketchPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** the profile handles of an extrusion (`only`: just the edge under this side face) */
export function profileHandles(doc: Document, f: ExtrudeFeature, only?: { normal: THREE.Vector3; point: THREE.Vector3 }): ModelHandle[] {
  const sk = doc.sketches[f.sketchId];
  if (!sk || f.thin) return [];
  const pl = resolvePlaneDef(doc, sk.plane);
  const o = new THREE.Vector3(...pl.origin), u = new THREE.Vector3(...pl.u), v = new THREE.Vector3(...pl.v), n = new THREE.Vector3(...pl.n).normalize();
  const regions = sketchRegions(sk).filter((_, i) => !f.contours?.length || f.contours.includes(i));
  if (!regions.length) return [];
  const inside = (p: SketchPoint) => regions.some((r) => inPoly(p, r.outer) && !r.holes.some((h) => inPoly(p, h)));
  const s = f.reverse ? -1 : 1;
  const k = f.fromOffset ? (f.fromReverse ? -f.fromOffset : f.fromOffset) : 0;
  // the face the arrows stand on: the end face of a boss, the sketched face of a cut
  const z = k + (f.op === 'cut' ? 0 : f.end === 'midPlane' ? f.depth / 2 : f.end === 'blind' ? s * f.depth : 0);
  const world = (p: SketchPoint) => o.clone().addScaledVector(u, p.x).addScaledVector(v, p.y).addScaledVector(n, z);
  const out: ModelHandle[] = [];
  const add = (key: string, at: SketchPoint, d: SketchPoint, target: EdgeTarget) => {
    const dir = u.clone().multiplyScalar(d.x).addScaledVector(v, d.y).normalize();
    let anchor = world(at);
    if (only) {
      // a side face picked: the edge whose swept face it is (same normal, the face's plane through the edge)
      if (only.normal.dot(dir) < 0.999 || Math.abs(only.point.clone().sub(anchor).dot(dir)) > 1e-3) return;
      anchor = only.point.clone();
    }
    out.push({
      key, featureId: f.id, value: 0, anchor, dir, ...linearMap(0, 1), step: 0.5, fine: 0.1, min: -1e6, max: 1e6, unit: 'mm', linear: true, kind: 'profile',
      sketchId: sk.id, snap: { plane: { point: anchor.clone(), normal: dir.clone() } },
      apply: (doc0, val) => {
        const s0 = doc0.sketches[sk.id];
        if (!s0) return null;
        const r = dragSketchEdge(s0, target, val);
        if (!r || r.status === 'conflict' || r.status === 'invalid') return null;
        const text = r.changed.length ? `${r.changed[0].value.toFixed(2)}mm` : `${val >= 0 ? '+' : ''}${val.toFixed(2)}mm`;
        return { doc: { ...doc0, sketches: { ...doc0.sketches, [sk.id]: r.sketch } }, text };
      },
    });
  };
  for (const id of sk.entityOrder) {
    const e = sk.entities[id];
    if (!e || (e as { construction?: boolean }).construction) continue;
    if (e.kind === 'line') {
      const a = sk.points[e.p1], b = sk.points[e.p2];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1e-6) continue;
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const nrm = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
      const eps = Math.min(0.05, len / 10);
      const plus = inside({ x: m.x + nrm.x * eps, y: m.y + nrm.y * eps }), minus = inside({ x: m.x - nrm.x * eps, y: m.y - nrm.y * eps });
      if (plus === minus) continue;
      const outN = plus ? { x: -nrm.x, y: -nrm.y } : nrm;
      add(`line:${id}`, m, outN, { kind: 'line', id, normal: outN });
    } else if (e.kind === 'circle') {
      const c = sk.points[e.center], r = sk.scalars[e.r];
      const at = { x: c.x + r, y: c.y };
      const eps = Math.min(0.05, r / 10);
      if (inside({ x: at.x - eps, y: at.y }) === inside({ x: at.x + eps, y: at.y })) continue;
      add(`circle:${id}`, at, { x: 1, y: 0 }, { kind: 'circle', id });
    }
  }
  return out;
}
