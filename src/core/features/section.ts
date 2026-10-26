import * as THREE from 'three';
import { REFERENCE_PLANE_DEFS, type ReferencePlaneId } from './planes';

/** One section plane of a Section View: a reference plane, offset along its normal, tilted by two angles. */
export interface SectionPlane {
  plane: ReferencePlaneId;
  offset: number;
  flip: boolean;
  /** rotation about the plane's first / second in-plane axis (degrees) */
  rotX?: number;
  rotY?: number;
}

/** The cutting plane in world space: point and the normal pointing to the side that is removed. */
export function sectionPlaneOf(s: SectionPlane): { normal: THREE.Vector3; point: THREE.Vector3 } {
  const pl = REFERENCE_PLANE_DEFS[s.plane];
  const u = new THREE.Vector3(...pl.u), v = new THREE.Vector3(...pl.v);
  const n = new THREE.Vector3(...pl.n);
  if (s.rotX) n.applyAxisAngle(u, (s.rotX * Math.PI) / 180);
  if (s.rotY) n.applyAxisAngle(v.clone().applyAxisAngle(u, ((s.rotX ?? 0) * Math.PI) / 180), (s.rotY * Math.PI) / 180);
  n.normalize();
  const point = new THREE.Vector3(...pl.origin).addScaledVector(new THREE.Vector3(...pl.n), s.offset);
  // the intended design keeps the half behind the plane: the removed side is along the normal (flip: the other half)
  return { normal: s.flip ? n.negate() : n, point };
}

interface Cut { normal: THREE.Vector3; point: THREE.Vector3 }
/** a half-space test: keep = the side opposite the normal (d <= 0), remove = the normal side (d >= 0) */
interface Half { cut: Cut; keep: boolean }
interface V { p: THREE.Vector3; n: THREE.Vector3 }

const EPS = 1e-7;
const dist = (c: Cut, p: THREE.Vector3) => c.normal.x * (p.x - c.point.x) + c.normal.y * (p.y - c.point.y) + c.normal.z * (p.z - c.point.z);

/** Sutherland–Hodgman: the part of a convex polygon inside a half-space (position and normal interpolated) */
function clipPoly(poly: V[], h: Half): V[] {
  const out: V[] = [];
  const s = (v: V) => (h.keep ? -1 : 1) * dist(h.cut, v.p);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = s(a), db = s(b);
    if (da >= -EPS) out.push(a);
    if ((da >= -EPS) !== (db >= -EPS)) {
      const t = da / (da - db);
      out.push({ p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize() });
    }
  }
  return out;
}

function clipPolyAll(poly: V[], hs: Half[]): V[] {
  let p = poly;
  for (const h of hs) {
    if (p.length < 3) return [];
    p = clipPoly(p, h);
  }
  return p.length >= 3 ? p : [];
}

/** the cross-section of a closed mesh by a plane: loops of points (chained cut segments) */
function sectionLoops(pos: THREE.BufferAttribute, c: Cut): THREE.Vector3[][] {
  const segs: [THREE.Vector3, THREE.Vector3][] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i + 2 < pos.count; i += 3) {
    const P = [a.fromBufferAttribute(pos, i).clone(), b.fromBufferAttribute(pos, i + 1).clone(), d.fromBufferAttribute(pos, i + 2).clone()];
    const D = P.map((p) => { const x = dist(c, p); return Math.abs(x) < 1e-6 ? 0 : x; });
    const zeros = D.filter((x) => x === 0).length;
    // an edge lying in the plane counts once: from the triangle on the kept side
    if (zeros === 2 && D.some((x) => x < 0)) {
      const z = P.filter((_, k) => D[k] === 0);
      segs.push([z[0], z[1]]);
      continue;
    }
    if (D.every((x) => x >= 0) || D.every((x) => x <= 0)) continue;
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k < 3; k++) {
      const k2 = (k + 1) % 3;
      if (D[k] === 0) pts.push(P[k]);
      if (D[k] * D[k2] < 0) pts.push(P[k].clone().lerp(P[k2], D[k] / (D[k] - D[k2])));
    }
    if (pts.length === 2 && pts[0].distanceToSquared(pts[1]) > 1e-14) segs.push([pts[0], pts[1]]);
  }
  // chain the segments by their (rounded) end points
  const key = (p: THREE.Vector3) => `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)},${Math.round(p.z * 1e4)}`;
  const adj = new Map<string, number[]>();
  segs.forEach(([p, q], i) => {
    for (const k of [key(p), key(q)]) adj.set(k, [...(adj.get(k) ?? []), i]);
  });
  const used = new Uint8Array(segs.length);
  const loops: THREE.Vector3[][] = [];
  for (let s0 = 0; s0 < segs.length; s0++) {
    if (used[s0]) continue;
    used[s0] = 1;
    const loop = [segs[s0][0], segs[s0][1]];
    const startKey = key(segs[s0][0]);
    let cur = segs[s0][1];
    for (let guard = 0; guard < segs.length; guard++) {
      const ck = key(cur);
      if (ck === startKey) break;
      const next = (adj.get(ck) ?? []).find((j) => !used[j]);
      if (next === undefined) break;
      used[next] = 1;
      const [p, q] = segs[next];
      cur = key(p) === ck ? q : p;
      loop.push(cur);
    }
    if (key(loop[loop.length - 1]) === startKey) loop.pop();
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

/** the section face on a plane: the loops triangulated (outer loops with their holes) */
function capTriangles(loops: THREE.Vector3[][], c: Cut): THREE.Vector3[][] {
  const n = c.normal;
  const u = new THREE.Vector3(Math.abs(n.x) < 0.9 ? 1 : 0, Math.abs(n.x) < 0.9 ? 0 : 1, 0).cross(n).normalize();
  const v = n.clone().cross(u);
  const to2 = (p: THREE.Vector3) => new THREE.Vector2(p.clone().sub(c.point).dot(u), p.clone().sub(c.point).dot(v));
  const flat = loops.map((l) => l.map(to2));
  const inside = (pt: THREE.Vector2, poly: THREE.Vector2[]) => {
    let r = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      if ((poly[i].y > pt.y) !== (poly[j].y > pt.y) && pt.x < ((poly[j].x - poly[i].x) * (pt.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x) r = !r;
    }
    return r;
  };
  const depth = flat.map((l, i) => flat.filter((o, j) => j !== i && inside(l[0], o)).length);
  const tris: THREE.Vector3[][] = [];
  flat.forEach((outer, i) => {
    if (depth[i] % 2) return;
    const holes = flat.filter((h, j) => depth[j] === depth[i] + 1 && inside(h[0], outer));
    const o = THREE.ShapeUtils.isClockWise(outer) ? [...outer].reverse() : outer;
    const hs = holes.map((h) => (THREE.ShapeUtils.isClockWise(h) ? h : [...h].reverse()));
    const all = [...o, ...hs.flat()];
    for (const t of THREE.ShapeUtils.triangulateShape(o, hs)) {
      const P = t.map((k) => c.point.clone().addScaledVector(u, all[k].x).addScaledVector(v, all[k].y));
      // the cap faces out of the kept material: along the normal (towards the removed side)
      tris.push(P);
    }
  });
  return tris;
}

/**
 * Section of a body by one to three planes. Planar: the region on the removed side of all planes is cut away
 * (two planes cut a quarter out, by design). Zonal: only the zone on the kept side of every plane stays.
 * Plane clipping per triangle (no boolean), so a plane on a face of the model is no problem. Returns the cut
 * body (open) and the cap faces on the section planes separately.
 */
export function sectionBody(g: THREE.BufferGeometry, planes: SectionPlane[], method: 'planar' | 'zonal' = 'planar'): { body: THREE.BufferGeometry; cap: THREE.BufferGeometry | null } {
  const cuts: Cut[] = planes.map(sectionPlaneOf);
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position') as THREE.BufferAttribute;
  if (!ng.getAttribute('normal')) ng.computeVertexNormals();
  const nor = ng.getAttribute('normal') as THREE.BufferAttribute;
  // the kept region as pieces of convex regions: zonal = all keep sides; planar = keep_i with remove_1..i-1 (disjoint)
  const regions: Half[][] = method === 'zonal' ? [cuts.map((cut) => ({ cut, keep: true }))] : cuts.map((cut, i) => [...cuts.slice(0, i).map((c) => ({ cut: c, keep: false })), { cut, keep: true }]);
  const outP: number[] = [], outN: number[] = [];
  const emit = (poly: V[]) => {
    for (let k = 1; k + 1 < poly.length; k++) for (const v of [poly[0], poly[k], poly[k + 1]]) { outP.push(v.p.x, v.p.y, v.p.z); outN.push(v.n.x, v.n.y, v.n.z); }
  };
  for (let i = 0; i + 2 < pos.count; i += 3) {
    const tri: V[] = [0, 1, 2].map((k) => ({ p: new THREE.Vector3().fromBufferAttribute(pos, i + k), n: new THREE.Vector3().fromBufferAttribute(nor, i + k) }));
    for (const r of regions) emit(clipPolyAll(tri, r));
  }
  const body = new THREE.BufferGeometry();
  body.setAttribute('position', new THREE.Float32BufferAttribute(outP, 3));
  body.setAttribute('normal', new THREE.Float32BufferAttribute(outN, 3));
  // caps: the cross-section on every plane, limited to where that plane bounds the kept material
  const capP: number[] = [], capN: number[] = [];
  cuts.forEach((cut, i) => {
    const others: Half[] = cuts.filter((_, j) => j !== i).map((c) => ({ cut: c, keep: method === 'zonal' }));
    for (const t of capTriangles(sectionLoops(pos, cut), cut)) {
      const poly = clipPolyAll(t.map((p) => ({ p, n: cut.normal.clone() })), others);
      for (let k = 1; k + 1 < poly.length; k++) for (const v of [poly[0], poly[k], poly[k + 1]]) { capP.push(v.p.x, v.p.y, v.p.z); capN.push(cut.normal.x, cut.normal.y, cut.normal.z); }
    }
  });
  let cap: THREE.BufferGeometry | null = null;
  if (capP.length) {
    cap = new THREE.BufferGeometry();
    cap.setAttribute('position', new THREE.Float32BufferAttribute(capP, 3));
    cap.setAttribute('normal', new THREE.Float32BufferAttribute(capN, 3));
  }
  return { body, cap };
}
