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
  /** Offset perpendicular to: the reference plane (the default) or the tilted (selected) plane */
  offsetAlong?: 'reference' | 'selected';
}

/** The cutting plane in world space: point and the normal pointing to the side that is removed. */
export function sectionPlaneOf(s: SectionPlane): { normal: THREE.Vector3; point: THREE.Vector3 } {
  const pl = REFERENCE_PLANE_DEFS[s.plane];
  const u = new THREE.Vector3(...pl.u), v = new THREE.Vector3(...pl.v);
  const n = new THREE.Vector3(...pl.n);
  if (s.rotX) n.applyAxisAngle(u, (s.rotX * Math.PI) / 180);
  if (s.rotY) n.applyAxisAngle(v.clone().applyAxisAngle(u, ((s.rotX ?? 0) * Math.PI) / 180), (s.rotY * Math.PI) / 180);
  n.normalize();
  const point = new THREE.Vector3(...pl.origin).addScaledVector(s.offsetAlong === 'selected' ? n : new THREE.Vector3(...pl.n), s.offset);
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
export function sectionLoops(pos: THREE.BufferAttribute, c: Cut): THREE.Vector3[][] {
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
  return chainLoops(segs);
}

/**
 * Chains cut segments into closed loops. A tessellated B-rep or a CSG result is rarely watertight: faces meet at
 * T-junctions and float32 positions differ in the last bits, so the end points are welded within `tol` (mm), a segment
 * that occurs twice cancels out (a face touching the plane from the kept side), and chains that stay open are joined
 * end to nearest end. An open chain must never reach the triangulator: it closes it with one straight line across the
 * section, a wedge of cap over a hole (the diagonal in the section of the fan housing, 0.5.14).
 */
export function chainLoops(segs: [THREE.Vector3, THREE.Vector3][], tol = 1e-3): THREE.Vector3[][] {
  // weld the end points: a grid of cells of size tol, a point merges with a point within tol in a neighbouring cell
  const pts: THREE.Vector3[] = [];
  const grid = new Map<string, number[]>();
  const weld = (p: THREE.Vector3) => {
    const cx = Math.floor(p.x / tol), cy = Math.floor(p.y / tol), cz = Math.floor(p.z / tol);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) {
      for (const n of grid.get(`${cx + i},${cy + j},${cz + k}`) ?? []) if (pts[n].distanceToSquared(p) <= tol * tol) return n;
    }
    const n = pts.push(p) - 1, key = `${cx},${cy},${cz}`;
    grid.set(key, [...(grid.get(key) ?? []), n]);
    return n;
  };
  const edgeMap = new Map<string, [number, number]>();
  for (const [p, q] of segs) {
    const a = weld(p), b = weld(q);
    if (a === b) continue;
    const k = a < b ? `${a},${b}` : `${b},${a}`;
    if (edgeMap.has(k)) edgeMap.delete(k); else edgeMap.set(k, [a, b]);
  }
  const E = [...edgeMap.values()];
  const adj = new Map<number, number[]>();
  E.forEach(([a, b], i) => { for (const v of [a, b]) adj.set(v, [...(adj.get(v) ?? []), i]); });
  const used = new Uint8Array(E.length);
  const extend = (ch: number[]) => {
    for (let cur = ch[ch.length - 1]; ;) {
      const e = adj.get(cur)!.find((j) => !used[j]);
      if (e === undefined) return;
      used[e] = 1;
      cur = E[e][0] === cur ? E[e][1] : E[e][0];
      ch.push(cur);
      if (cur === ch[0]) return;
    }
  };
  // walks from the points of odd degree first (they end at an open end), then the rest (they close on their start)
  const closed: number[][] = [], open: number[][] = [];
  const starts = [...adj.keys()].sort((p, q) => (adj.get(q)!.length % 2) - (adj.get(p)!.length % 2));
  for (const s of starts) {
    while (adj.get(s)!.some((j) => !used[j])) {
      const ch = [s];
      extend(ch);
      if (ch.length > 1 && ch[ch.length - 1] === s) { ch.pop(); closed.push(ch); } else open.push(ch);
    }
  }
  // stitch the open chains: the end to the nearest end of another open chain, or to its own start
  while (open.length) {
    const ch = open.pop()!;
    for (;;) {
      const end = pts[ch[ch.length - 1]];
      let best = pts[ch[0]].distanceToSquared(end), bi = -1, rev = false;
      open.forEach((o, i) => {
        const ds = pts[o[0]].distanceToSquared(end), de = pts[o[o.length - 1]].distanceToSquared(end);
        if (ds < best) { best = ds; bi = i; rev = false; }
        if (de < best) { best = de; bi = i; rev = true; }
      });
      if (bi < 0) break;
      const o = open.splice(bi, 1)[0];
      if (rev) o.reverse();
      ch.push(...(o[0] === ch[ch.length - 1] ? o.slice(1) : o));
    }
    if (ch.length > 1 && ch[0] === ch[ch.length - 1]) ch.pop();
    closed.push(ch);
  }
  return closed.filter((l) => l.length >= 3).map((l) => l.map((n) => pts[n]));
}

/** the section face on a plane: the loops triangulated (outer loops with their holes) */
export function capTriangles(loops: THREE.Vector3[][], c: Cut): THREE.Vector3[][] {
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
