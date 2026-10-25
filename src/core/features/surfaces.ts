import * as THREE from 'three';
import type { Document, PlaneDef, SurfaceFeature } from '../document/types';
import { sketchChains } from './thin';
import { sketchRegions } from './regions';
import { resolvePlaneDef } from './planes';
import { planeMatrix } from './solid';
import { planarFaces, type PlanarFace } from './solid';
import type { Body } from './rebuild';
import { loftCurves, sketchPath, sweepCurves } from './sweep';

const V = (p: [number, number, number]) => new THREE.Vector3(...p);

function fromPositions(pos: number[]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Extruded Surface: every curve of the sketch swept along the sketch normal (no caps). */
export function extrudedSurface(doc: Document, f: SurfaceFeature): THREE.BufferGeometry | null {
  const sketch = f.sketchId ? doc.sketches[f.sketchId] : undefined;
  if (!sketch) return null;
  const plane = resolvePlaneDef(doc, sketch.plane);
  const m = planeMatrix(plane);
  const n = V(plane.n);
  const depth = f.depth ?? 10;
  const a = f.midPlane ? -depth / 2 : 0, b = f.midPlane ? depth / 2 : depth;
  const sgn = f.reverse ? -1 : 1;
  const pos: number[] = [];
  for (const ch of sketchChains(sketch)) {
    const pts = ch.points.map((p) => new THREE.Vector3(p.x, p.y, 0).applyMatrix4(m));
    if (ch.closed && pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) > 1e-9) pts.push(pts[0].clone());
    for (let i = 0; i + 1 < pts.length; i++) {
      const p0 = pts[i].clone().addScaledVector(n, sgn * a), p1 = pts[i + 1].clone().addScaledVector(n, sgn * a);
      const q0 = pts[i].clone().addScaledVector(n, sgn * b), q1 = pts[i + 1].clone().addScaledVector(n, sgn * b);
      pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, q1.x, q1.y, q1.z, p0.x, p0.y, p0.z, q1.x, q1.y, q1.z, q0.x, q0.y, q0.z);
    }
  }
  return pos.length ? fromPositions(pos) : null;
}

/** Revolved Surface: the sketch curves (not the construction axis) turned around the first construction line. */
export function revolvedSurface(doc: Document, f: SurfaceFeature): THREE.BufferGeometry | null {
  const sketch = f.sketchId ? doc.sketches[f.sketchId] : undefined;
  if (!sketch) return null;
  const axisE = sketch.entityOrder.map((id) => sketch.entities[id]).find((e) => e.kind === 'line' && e.construction);
  if (!axisE || axisE.kind !== 'line') return null;
  const plane = resolvePlaneDef(doc, sketch.plane);
  const m = planeMatrix(plane);
  const A = new THREE.Vector3(sketch.points[axisE.p1].x, sketch.points[axisE.p1].y, 0).applyMatrix4(m);
  const B = new THREE.Vector3(sketch.points[axisE.p2].x, sketch.points[axisE.p2].y, 0).applyMatrix4(m);
  const axis = B.clone().sub(A).normalize();
  const angle = ((f.angle ?? 360) * Math.PI) / 180;
  const segs = Math.max(8, Math.ceil((64 * angle) / (Math.PI * 2)));
  const pos: number[] = [];
  for (const ch of sketchChains(sketch)) {
    const pts = ch.points.map((p) => new THREE.Vector3(p.x, p.y, 0).applyMatrix4(m));
    const rings: THREE.Vector3[][] = [];
    for (let k = 0; k <= segs; k++) {
      const q = new THREE.Quaternion().setFromAxisAngle(axis, (angle * k) / segs);
      rings.push(pts.map((p) => p.clone().sub(A).applyQuaternion(q).add(A)));
    }
    for (let k = 0; k < segs; k++) {
      for (let i = 0; i + 1 < pts.length; i++) {
        const p0 = rings[k][i], p1 = rings[k][i + 1], q0 = rings[k + 1][i], q1 = rings[k + 1][i + 1];
        pos.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, q1.x, q1.y, q1.z, p0.x, p0.y, p0.z, q1.x, q1.y, q1.z, q0.x, q0.y, q0.z);
      }
    }
  }
  return pos.length ? fromPositions(pos) : null;
}

/** Planar Surface: the closed regions of the sketch as a flat face. */
export function planarSurface(doc: Document, f: SurfaceFeature): THREE.BufferGeometry | null {
  const sketch = f.sketchId ? doc.sketches[f.sketchId] : undefined;
  if (!sketch) return null;
  const plane: PlaneDef = resolvePlaneDef(doc, sketch.plane);
  const m = planeMatrix(plane);
  const pos: number[] = [];
  for (const r of sketchRegions(sketch)) {
    const shape = new THREE.Shape(r.outer.map((p) => new THREE.Vector2(p.x, p.y)));
    for (const h of r.holes) shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p.x, p.y))));
    const g = new THREE.ShapeGeometry(shape).toNonIndexed();
    g.applyMatrix4(m);
    const a = g.getAttribute('position');
    for (let i = 0; i < a.count; i++) pos.push(a.getX(i), a.getY(i), a.getZ(i));
  }
  return pos.length ? fromPositions(pos) : null;
}

/** Offset Surface: a copy of one face of a body, moved along its normals by the distance. */
export function offsetSurface(bodies: Body[], f: SurfaceFeature): THREE.BufferGeometry | null {
  if (!f.face) return null;
  let face: PlanarFace | null = null, body: Body | null = null;
  for (const b of bodies) {
    for (const fc of planarFaces(b.geometry, b.id)) {
      const d = Math.hypot(fc.centroid[0] - f.face.point[0], fc.centroid[1] - f.face.point[1], fc.centroid[2] - f.face.point[2]);
      const dot = fc.normal[0] * f.face.normal[0] + fc.normal[1] * f.face.normal[1] + fc.normal[2] * f.face.normal[2];
      if (d < 1e-2 && dot > 0.99) { face = fc; body = b; }
    }
  }
  if (!face || !body) return null;
  const g = body.geometry.index ? body.geometry.toNonIndexed() : body.geometry;
  const a = g.getAttribute('position');
  const pos: number[] = [];
  const t = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const dist = f.distance ?? 0;
  for (const tri of face.triangles) {
    for (let k = 0; k < 3; k++) t[k].fromBufferAttribute(a, tri * 3 + k);
    const n = t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])).normalize();
    for (let k = 0; k < 3; k++) { const p = t[k].clone().addScaledVector(face.curved ? n : V(face.normal), (f.reverse ? -1 : 1) * dist); pos.push(p.x, p.y, p.z); }
  }
  return pos.length ? fromPositions(pos) : null;
}

/**
 * Knit: one triangle soup from several surfaces, oriented consistently (neighbours across a shared edge run it in
 * opposite directions). Closed when every edge is shared by exactly two triangles.
 */
export function orientShell(g: THREE.BufferGeometry): { geometry: THREE.BufferGeometry; closed: boolean } {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const n = a.count / 3;
  const key = (i: number) => `${Math.round(a.getX(i) * 1e4)},${Math.round(a.getY(i) * 1e4)},${Math.round(a.getZ(i) * 1e4)}`;
  const vk: string[][] = [];
  for (let t = 0; t < n; t++) vk.push([key(t * 3), key(t * 3 + 1), key(t * 3 + 2)]);
  const edges = new Map<string, { t: number; from: string }[]>();
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) {
    const p = vk[t][k], q = vk[t][(k + 1) % 3];
    const e = p < q ? `${p}|${q}` : `${q}|${p}`;
    (edges.get(e) ?? edges.set(e, []).get(e)!).push({ t, from: p });
  }
  let closed = true;
  for (const list of edges.values()) if (list.length !== 2) { closed = false; break; }
  // breadth-first: a neighbour that runs the shared edge the same way is flipped
  const flip = new Array<boolean | undefined>(n);
  for (let seed = 0; seed < n; seed++) {
    if (flip[seed] !== undefined) continue;
    flip[seed] = false;
    const queue = [seed];
    while (queue.length) {
      const t = queue.shift()!;
      for (let k = 0; k < 3; k++) {
        const p = vk[t][k], q = vk[t][(k + 1) % 3];
        const dirT = flip[t] ? q : p; // the start of this edge as the triangle will be stored
        const e = p < q ? `${p}|${q}` : `${q}|${p}`;
        for (const o of edges.get(e)!) {
          if (o.t === t || flip[o.t] !== undefined) continue;
          // the other triangle must start the edge at the other end
          const oStart = o.from;
          flip[o.t] = oStart === dirT;
          queue.push(o.t);
        }
      }
    }
  }
  const pos: number[] = [];
  for (let t = 0; t < n; t++) {
    const ids = flip[t] ? [0, 2, 1] : [0, 1, 2];
    for (const k of ids) pos.push(a.getX(t * 3 + k), a.getY(t * 3 + k), a.getZ(t * 3 + k));
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.computeVertexNormals();
  return { geometry: out, closed };
}


/** Swept Surface: the profile sketch's curves along the path sketch. */
export function sweptSurface(doc: Document, f: SurfaceFeature): THREE.BufferGeometry | null {
  const prof = f.sketchId ? doc.sketches[f.sketchId] : undefined;
  const pathSk = f.sketchId2 ? doc.sketches[f.sketchId2] : undefined;
  if (!prof || !pathSk) return null;
  const path = sketchPath(pathSk, resolvePlaneDef(doc, pathSk.plane));
  if (!path) return null;
  return sweepCurves(sketchChains(prof).map((c) => c.points), resolvePlaneDef(doc, prof.plane), path);
}

/** Lofted Surface: ruled between the first curve of each of two sketches. */
export function loftedSurface(doc: Document, f: SurfaceFeature, facets?: number): THREE.BufferGeometry | null {
  const a = f.sketchId ? doc.sketches[f.sketchId] : undefined;
  const b = f.sketchId2 ? doc.sketches[f.sketchId2] : undefined;
  if (!a || !b) return null;
  const ca = sketchChains(a)[0], cb = sketchChains(b)[0];
  if (!ca || !cb) return null;
  const ma = planeMatrix(resolvePlaneDef(doc, a.plane)), mb = planeMatrix(resolvePlaneDef(doc, b.plane));
  const fa = facets ? facetPolyline(ca.points, facets) : ca.points, fb = facets ? facetPolyline(cb.points, facets) : cb.points;
  return loftCurves(fa.map((p) => new THREE.Vector3(p.x, p.y, 0).applyMatrix4(ma)), fb.map((p) => new THREE.Vector3(p.x, p.y, 0).applyMatrix4(mb)));
}

/**
 * Lofted-Bend > Bent: every curved run of a profile (gently turning vertices) becomes `facets` flat pieces; straight
 * runs and sharp corners stay.
 */
export function facetPolyline(pts: { x: number; y: number }[], facets: number): { x: number; y: number }[] {
  if (pts.length < 4) return pts;
  const turn = (i: number) => {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const u = { x: b.x - a.x, y: b.y - a.y }, v = { x: c.x - b.x, y: c.y - b.y };
    return Math.abs(Math.atan2(u.x * v.y - u.y * v.x, u.x * v.x + u.y * v.y));
  };
  const curved = pts.map((_, i) => i > 0 && i < pts.length - 1 && turn(i) > 0.002 && turn(i) < 0.6);
  const out: { x: number; y: number }[] = [];
  let i = 0;
  while (i < pts.length) {
    if (!curved[i]) { out.push(pts[i]); i++; continue; }
    // a curved run: from the vertex before it to the vertex after it
    let j = i;
    while (j < pts.length && curved[j]) j++;
    const run = pts.slice(i - 1, Math.min(pts.length, j + 1));
    if (out.length && out[out.length - 1] === run[0]) out.pop();
    const n = Math.max(1, Math.round(facets));
    for (let k = 0; k <= n; k++) out.push(run[Math.round((k * (run.length - 1)) / n)]);
    i = j + 1;
  }
  return out;
}


/** Trim Surface (standard trim with a plane): the triangles are clipped by the plane, one side is kept. */
export function trimSurface(g: THREE.BufferGeometry, plane: PlaneDef, flip: boolean): THREE.BufferGeometry | null {
  const n = V(plane.n).normalize().multiplyScalar(flip ? -1 : 1);
  const d = n.dot(V(plane.origin));
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const pos: number[] = [];
  const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let t = 0; t + 2 < a.count; t += 3) {
    for (let k = 0; k < 3; k++) P[k].fromBufferAttribute(a, t + k);
    // keep the part with n·p >= d (Sutherland-Hodgman on one triangle)
    const poly: THREE.Vector3[] = [];
    for (let k = 0; k < 3; k++) {
      const p = P[k], q = P[(k + 1) % 3];
      const sp = n.dot(p) - d, sq = n.dot(q) - d;
      if (sp >= 0) poly.push(p.clone());
      if ((sp >= 0) !== (sq >= 0)) poly.push(p.clone().lerp(q, sp / (sp - sq)));
    }
    for (let k = 1; k + 1 < poly.length; k++) pos.push(poly[0].x, poly[0].y, poly[0].z, poly[k].x, poly[k].y, poly[k].z, poly[k + 1].x, poly[k + 1].y, poly[k + 1].z);
  }
  return pos.length ? fromPositions(pos) : null;
}

/**
 * Thicken an open surface into a solid of thickness t: the surface moved along its (averaged) normals, the
 * original turned inside out, and walls along the open boundary. Used by Lofted-Bend and Thicken.
 */
export function thickenSurface(g: THREE.BufferGeometry, t: number): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position');
  const key = (x: number, y: number, z: number) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
  const vn = new Map<string, THREE.Vector3>();
  const tri = (i: number) => new THREE.Vector3().fromBufferAttribute(pos, i);
  for (let i = 0; i + 2 < pos.count; i += 3) {
    const a = tri(i), b = tri(i + 1), c = tri(i + 2);
    const n = b.clone().sub(a).cross(c.clone().sub(a));
    for (const p of [a, b, c]) {
      const k = key(p.x, p.y, p.z);
      (vn.get(k) ?? vn.set(k, new THREE.Vector3()).get(k)!).add(n);
    }
  }
  for (const v of vn.values()) v.normalize();
  const off = (p: THREE.Vector3) => p.clone().addScaledVector(vn.get(key(p.x, p.y, p.z)) ?? new THREE.Vector3(), t);
  const out: number[] = [];
  const push = (...ps: THREE.Vector3[]) => { for (const p of ps) out.push(p.x, p.y, p.z); };
  const edgeCount = new Map<string, number>();
  const ek = (p: THREE.Vector3, q: THREE.Vector3) => { const a = key(p.x, p.y, p.z), b = key(q.x, q.y, q.z); return a < b ? a + '|' + b : b + '|' + a; };
  for (let i = 0; i + 2 < pos.count; i += 3) {
    const a = tri(i), b = tri(i + 1), c = tri(i + 2);
    push(a, c, b); // the original, inside out
    push(off(a), off(b), off(c));
    for (const [p, q] of [[a, b], [b, c], [c, a]]) edgeCount.set(ek(p, q), (edgeCount.get(ek(p, q)) ?? 0) + 1);
  }
  for (let i = 0; i + 2 < pos.count; i += 3) {
    const a = tri(i), b = tri(i + 1), c = tri(i + 2);
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      if (edgeCount.get(ek(p, q)) !== 1) continue;
      const p2 = off(p), q2 = off(q);
      push(p, q, q2);
      push(p, q2, p2);
    }
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  if (meshVolumeOf(r) < 0) {
    const a = r.getAttribute('position');
    for (let i = 0; i + 2 < a.count; i += 3) {
      const x = a.getX(i + 1), y = a.getY(i + 1), z = a.getZ(i + 1);
      a.setXYZ(i + 1, a.getX(i + 2), a.getY(i + 2), a.getZ(i + 2));
      a.setXYZ(i + 2, x, y, z);
    }
  }
  r.computeVertexNormals();
  return r;
}

function meshVolumeOf(g: THREE.BufferGeometry): number {
  const p = g.getAttribute('position');
  let v = 0;
  for (let i = 0; i + 2 < p.count; i += 3) {
    const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i), bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1), cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2);
    v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return v;
}


/** the plane of a flat surface (all points within tol of it), or null when the surface is curved */
export function fitPlane(g: THREE.BufferGeometry, tol = 1e-3): { origin: [number, number, number]; n: [number, number, number] } | null {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  if (!a || a.count < 3) return null;
  const n = new THREE.Vector3();
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  for (let t = 0; t + 2 < a.count; t += 3) {
    p0.fromBufferAttribute(a, t); p1.fromBufferAttribute(a, t + 1); p2.fromBufferAttribute(a, t + 2);
    const tn = p1.clone().sub(p0).cross(p2.clone().sub(p0));
    if (n.lengthSq() && tn.dot(n) < 0) tn.negate();
    n.add(tn);
  }
  if (n.lengthSq() < 1e-18) return null;
  n.normalize();
  const c = new THREE.Vector3();
  for (let i = 0; i < a.count; i++) c.add(p0.fromBufferAttribute(a, i));
  c.multiplyScalar(1 / a.count);
  for (let i = 0; i < a.count; i++) if (Math.abs(p0.fromBufferAttribute(a, i).sub(c).dot(n)) > tol) return null;
  return { origin: [c.x, c.y, c.z], n: [n.x, n.y, n.z] };
}

/** the centroid of a surface's points */
export function surfaceCentroid(g: THREE.BufferGeometry): THREE.Vector3 {
  const a = g.getAttribute('position');
  const c = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < a.count; i++) c.add(p.fromBufferAttribute(a, i));
  return a.count ? c.multiplyScalar(1 / a.count) : c;
}

/** the open (boundary) edges of a surface: edges used by one triangle only, as point pairs */
export function openEdges(g: THREE.BufferGeometry): [THREE.Vector3, THREE.Vector3][] {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const key = (v: THREE.Vector3) => `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`;
  const count = new Map<string, { n: number; a: THREE.Vector3; b: THREE.Vector3 }>();
  const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let t = 0; t + 2 < a.count; t += 3) {
    for (let k = 0; k < 3; k++) P[k].fromBufferAttribute(a, t + k);
    for (let k = 0; k < 3; k++) {
      const p = P[k], q = P[(k + 1) % 3];
      const ka = key(p), kb = key(q);
      if (ka === kb) continue;
      const kk = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const e = count.get(kk);
      if (e) e.n++;
      else count.set(kk, { n: 1, a: p.clone(), b: q.clone() });
    }
  }
  return [...count.values()].filter((e) => e.n === 1).map((e) => [e.a, e.b]);
}
