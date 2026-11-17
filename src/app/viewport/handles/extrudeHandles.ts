import * as THREE from 'three';
import type { Document, ExtrudeFeature, PlaneDef } from '../../../core/document/types';
import { resolvePlaneDef } from '../../../core/features/planes';
import { sketchBounds } from '../../../core/sketch/geometry';
import { sketchRegions } from '../../../core/features/regions';
import { linearMap, type ModelHandle, type SnapFace } from './handleMath';

/**
 * The ends of an extrusion that a drag handle can move, by design:
 * - Blind: the end face of direction 1 (and of direction 2 when it is Blind), each its own depth;
 * - Mid Plane: both end faces, each moving half of the total (the total changes by twice the drag, symmetrically);
 * - Offset From Surface (direction 1 or 2): the end face, and the dragged value is the offset;
 * - thin features and cuts the same way (the end face of a cut is its floor inside the material).
 * A Blind end dropped on a planar face parallel to it becomes Up To Surface with that face.
 */
export interface ExtrudeEnd {
  key: 'd1' | 'd2' | 'mid+' | 'mid-';
  /** the end on the line through the profile centre, and the way the end moves as the value grows */
  point: THREE.Vector3;
  dir: THREE.Vector3;
  /** the normal of the end face as seen from outside the part (a cut's floor faces back toward the sketch) */
  outward: THREE.Vector3;
  value: number;
  perMm: number;
  min: number;
  /** Up To Surface on a drop: only Blind ends */
  surface: boolean;
  apply: (f: ExtrudeFeature, v: number, face?: SnapFace | null) => ExtrudeFeature;
}

const V = (a: readonly number[]) => new THREE.Vector3(a[0], a[1], a[2]);

/** the centre of the profile (the picked contours, else the whole sketch), in sketch coordinates */
export function profileCentre(doc: Document, f: Pick<ExtrudeFeature, 'sketchId' | 'contours'>): { x: number; y: number } | null {
  const sk = doc.sketches[f.sketchId];
  const b = sk && sketchBounds(sk);
  if (!sk || !b) return null;
  let mid = { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2 };
  if (f.contours?.length) {
    const pts = sketchRegions(sk).filter((_, i) => f.contours!.includes(i)).flatMap((r) => r.outer);
    if (pts.length) mid = { x: (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2, y: (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2 };
  }
  return mid;
}

/** the ends of the extrusion `f` on the plane `pl`, with the profile centre `c2` (sketch coordinates) */
export function extrudeEnds(f: ExtrudeFeature, pl: PlaneDef, c2: { x: number; y: number }): ExtrudeEnd[] {
  const n = V(pl.n).normalize();
  const s = f.reverse ? -1 : 1;
  const k = f.fromOffset ? (f.fromReverse ? -f.fromOffset : f.fromOffset) : 0;
  // the profile centre on the sketch plane; From: Offset moves the whole result along the normal afterwards
  const c0 = V(pl.origin).addScaledVector(V(pl.u), c2.x).addScaledVector(V(pl.v), c2.y);
  const shift = (p: THREE.Vector3) => p.addScaledVector(n, k);
  const cut = f.op === 'cut';
  const out = (travel: THREE.Vector3) => (cut ? travel.clone().negate() : travel.clone());
  const ends: ExtrudeEnd[] = [];
  if (f.end === 'midPlane') {
    for (const sg of [1, -1] as const) {
      const dir = n.clone().multiplyScalar(sg);
      ends.push({ key: sg > 0 ? 'mid+' : 'mid-', point: shift(c0.clone().addScaledVector(dir, f.depth / 2)), dir, outward: out(dir), value: f.depth, perMm: 2, min: 0.1, surface: false,
        apply: (x, v) => ({ ...x, depth: v }) });
    }
    return ends;
  }
  const d1 = n.clone().multiplyScalar(s);
  if (f.end === 'blind') {
    ends.push({ key: 'd1', point: shift(c0.clone().addScaledVector(d1, f.depth)), dir: d1, outward: out(d1), value: f.depth, perMm: 1, min: 0.1, surface: true,
      apply: (x, v, face) => (face ? { ...x, end: 'upToSurface', surface: { normal: face.normal, point: face.point, label: face.label } } : { ...x, depth: v }) });
  } else if (f.end === 'offsetFromSurface' && f.surface) {
    // the offset surface: the face moved toward the sketch by the offset (Reverse offset: past it), as clipToSurface does
    const sn = V(f.surface.normal).normalize();
    const sp = V(f.surface.point);
    if (V(pl.origin).sub(sp).dot(sn) > 0) sn.negate();
    const off = f.offset ?? 0;
    const cos = Math.abs(sn.dot(d1));
    if (cos > 1e-3) {
      const along = f.translateSurface ? off : off / cos;
      const z = sp.clone().sub(c0).dot(sn) / d1.dot(sn) + (f.reverseOffset ? along : -along);
      const perMm = (f.reverseOffset ? 1 : -1) * (f.translateSurface ? 1 : cos);
      ends.push({ key: 'd1', point: shift(c0.clone().addScaledVector(d1, z)), dir: d1, outward: cut ? sn.clone().negate() : sn, value: off, perMm, min: 0, surface: false, apply: (x,
        v) => ({ ...x, offset: v }) });
    }
  }
  const e2 = f.direction2;
  const dir2 = d1.clone().negate();
  if (e2?.end === 'blind') {
    ends.push({ key: 'd2', point: shift(c0.clone().addScaledVector(dir2, e2.depth)), dir: dir2, outward: out(dir2), value: e2.depth, perMm: 1, min: 0.1, surface: true,
      apply: (x, v, face) => ({ ...x, direction2: face ? { ...x.direction2!, end: 'upToSurface', surface: { normal: face.normal, point: face.point,
        label: face.label } } : { ...x.direction2!, depth: v } }) });
  } else if (e2?.end === 'offsetFromSurface' && e2.surface) {
    // Direction 2: the depth to the face along the second direction plus the offset (resolveExtrudeEnds)
    const sn = V(e2.surface.normal);
    const den = sn.dot(dir2);
    if (Math.abs(den) > 1e-6) {
      const depth = V(e2.surface.point).sub(c0).dot(sn) / den + (e2.offset ?? 0);
      ends.push({ key: 'd2', point: shift(c0.clone().addScaledVector(dir2, depth)), dir: dir2, outward: out(dir2), value: e2.offset ?? 0, perMm: 1, min: 0, surface: false, apply: (x,
        v) => ({ ...x, direction2: { ...x.direction2!, offset: v } }) });
    }
  }
  return ends;
}

/** an end as a drag handle; `at` puts the arrow on a point of the end face (the picked face's centre) */
export function endHandle(f: ExtrudeFeature, e: ExtrudeEnd, at?: THREE.Vector3): ModelHandle {
  const anchor = at ? at.clone().addScaledVector(e.dir, e.point.clone().sub(at).dot(e.dir)) : e.point;
  return {
    key: e.key, featureId: f.id, value: e.value, anchor, dir: e.dir, ...linearMap(e.value, e.perMm),
    step: 0.5, fine: 0.1, min: e.min, max: Infinity, unit: 'mm', linear: true, kind: 'end',
    snap: { plane: { point: anchor.clone(), normal: e.dir.clone() }, surface: e.surface },
    apply: (doc, v, face) => ({ doc: { ...doc, features: doc.features.map((x) => (x.id === f.id && x.type === 'extrude' ? e.apply(x, v, face) : x)) } }),
  };
}

/** all ends of the extrusion as handles (null: no sketch or no profile) */
export function extrudeEndsOf(doc: Document, f: ExtrudeFeature): ExtrudeEnd[] {
  const sk = doc.sketches[f.sketchId];
  const c2 = sk ? profileCentre(doc, f) : null;
  if (!sk || !c2) return [];
  return extrudeEnds(f, resolvePlaneDef(doc, sk.plane), c2);
}

/** the extrusion end whose face is this face (normal and plane), newest feature first */
export function endOfFace(doc: Document, normal: [number, number, number], centroid: [number, number, number]): { f: ExtrudeFeature; e: ExtrudeEnd; ends: ExtrudeEnd[] } | null {
  const fn = V(normal).normalize(), fc = V(centroid);
  for (let i = doc.features.length - 1; i >= 0; i--) {
    const f = doc.features[i];
    if (f.type !== 'extrude' || f.suppressed) continue;
    const ends = extrudeEndsOf(doc, f);
    const e = ends.find((x) => fn.dot(x.outward) > 0.999 && Math.abs(fc.clone().sub(x.point).dot(x.outward)) < 1e-3);
    if (e) return { f, e, ends };
  }
  return null;
}
