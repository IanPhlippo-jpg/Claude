/**
 * A selected face found again on the other tessellation of the same body (mesh <-> exact, docs/32 SW-parity 2).
 * First by its name: the face tags (ftag) that every face of a feature carries and that the exact body copies from its
 * mesh twin. Then by place: the nearest face of the same kind, with a normal check that is strict for flat faces and
 * as loose as the face is curved (the mean normal of a curved face says little: a whole cylinder has none), and the
 * area as a tie-breaker (two coaxial cylinders share their centroid).
 */
import * as THREE from 'three';
import { FACE_TAG } from '../core/features/faceNames';
import type { PlanarFace } from '../core/features/solid';

export interface FaceBody { geometry: THREE.BufferGeometry; faces: PlanarFace[] }

/** the tag that covers most of a face (by area), 0 when it has none */
export function dominantTag(g: THREE.BufferGeometry, face: PlanarFace): number {
  const tags = g.getAttribute(FACE_TAG);
  const pos = g.getAttribute('position');
  if (!tags || !pos || g.index) return 0;
  const weight = new Map<number, number>();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const t of face.triangles) {
    if (t * 3 + 2 >= pos.count) continue;
    const tag = Math.round(tags.getX(t * 3));
    if (!tag) continue;
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1).sub(a);
    c.fromBufferAttribute(pos, t * 3 + 2).sub(a);
    weight.set(tag, (weight.get(tag) ?? 0) + b.cross(c).length() / 2 + 1e-12);
  }
  let best = 0, bw = 0;
  for (const [tag, w] of weight) if (w > bw) { bw = w; best = tag; }
  return best;
}

/**
 * How flat a face is: the length of its area-weighted mean normal over its area. 1 = flat, near 0 = closed all
 * around (a whole cylinder).
 */
export function flatness(g: THREE.BufferGeometry, face: PlanarFace): number {
  if (!face.curved) return 1;
  const pos = g.getAttribute('position');
  if (!pos || g.index) return 0;
  const sum = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let area = 0;
  for (const t of face.triangles) {
    if (t * 3 + 2 >= pos.count) continue;
    a.fromBufferAttribute(pos, t * 3);
    b.fromBufferAttribute(pos, t * 3 + 1).sub(a);
    c.fromBufferAttribute(pos, t * 3 + 2).sub(a);
    const n = b.cross(c);
    area += n.length() / 2;
    sum.addScaledVector(n, 0.5);
  }
  return area > 0 ? Math.min(1, sum.length() / area) : 0;
}

/**
 * The normal a candidate needs to have in common with the old face: 0.95 for a flat face (as before); for a curved
 * one it follows how far its normals spread, and a face that is (nearly) closed all around is not checked at all.
 */
export function normalThreshold(flat: number): number {
  if (flat >= 0.999) return 0.95;
  if (flat < 0.35) return -Infinity;
  return Math.min(0.95, flat * flat - 0.15);
}

const V = (p: [number, number, number]) => new THREE.Vector3(p[0], p[1], p[2]);

/** the face of `to` that is `face` of `from`, or null */
export function transferFace(from: FaceBody, face: PlanarFace, to: FaceBody): string | null {
  if (!to.faces.length) return null;
  const tag = dominantTag(from.geometry, face);
  let pool = to.faces;
  if (tag) {
    const named = to.faces.filter((f) => dominantTag(to.geometry, f) === tag);
    if (named.length === 1) return named[0].id;
    if (named.length) pool = named;
  }
  const sameKind = pool.filter((f) => f.curved === face.curved);
  if (sameKind.length) pool = sameKind;
  const minDot = normalThreshold(flatness(from.geometry, face));
  const n = V(face.normal), c = V(face.centroid);
  const size = Math.sqrt(Math.max(face.area, 1e-9));
  let best: string | null = null, bs = Infinity;
  for (const f of pool) {
    if (minDot > -Infinity && V(f.normal).dot(n) < minDot) continue;
    const d = V(f.centroid).distanceTo(c);
    // a curved face is also told by its size: the bore and the boss around it share their axis
    const areaMiss = face.curved && f.area > 0 && face.area > 0 ? Math.abs(Math.log(f.area / face.area)) * size : 0;
    const score = d + areaMiss;
    if (score < bs) { bs = score; best = f.id; }
  }
  return best;
}
