/**
 * Mesh measurements for the recognition of profiles and plates (docs/36 2.3): triangle soup, volume, area, the
 * area-weighted normal scatter (its smallest eigenvector is the axis of a bar), sections across an axis, convex hull and
 * the smallest enclosing rectangle, boundary loops of a planar face, and a geometry hash (F0-6).
 */
import type * as THREE from 'three';

export type V3 = [number, number, number];
export interface P2 { x: number; y: number }

/** the triangles as a flat list of coordinates (9 per triangle), indexed or not */
export function soup(g: THREE.BufferGeometry): Float64Array {
  const pos = g.getAttribute('position');
  const idx = g.getIndex();
  const n = idx ? idx.count : pos.count;
  const out = new Float64Array(n * 3);
  for (let i = 0; i < n; i++) {
    const k = idx ? idx.getX(i) : i;
    out[i * 3] = pos.getX(k); out[i * 3 + 1] = pos.getY(k); out[i * 3 + 2] = pos.getZ(k);
  }
  return out;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const tri = (s: Float64Array, i: number): [V3, V3, V3] => [[s[i * 9], s[i * 9 + 1], s[i * 9 + 2]], [s[i * 9 + 3], s[i * 9 + 4], s[i * 9 + 5]], [s[i * 9 + 6], s[i * 9 + 7], s[i * 9 + 8]]];
export const triCount = (s: Float64Array) => s.length / 9;

/** the triangle with its (area-scaled) normal */
export function triangle(s: Float64Array, i: number): { p: [V3, V3, V3]; n: V3; area: number } {
  const p = tri(s, i);
  const c = cross(sub(p[1], p[0]), sub(p[2], p[0]));
  const l = len(c);
  return { p, n: l ? [c[0] / l, c[1] / l, c[2] / l] : [0, 0, 0], area: l / 2 };
}

export function volume(s: Float64Array): number {
  let v = 0;
  for (let i = 0; i < triCount(s); i++) { const [a, b, c] = tri(s, i); v += dot(a, cross(b, c)) / 6; }
  return Math.abs(v);
}

export function surface(s: Float64Array): number {
  let a = 0;
  for (let i = 0; i < triCount(s); i++) a += triangle(s, i).area;
  return a;
}

/** sum of area * n nᵀ over the triangles (symmetric 3 x 3, row major) */
export function normalScatter(s: Float64Array): number[] {
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < triCount(s); i++) {
    const { n, area } = triangle(s, i);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m[r * 3 + c] += area * n[r] * n[c];
  }
  return m;
}

/** eigenvalues (ascending) and eigenvectors of a symmetric 3 x 3 matrix (Jacobi rotations) */
export function eigenSym3(m0: number[]): { values: number[]; vectors: V3[] } {
  const a = [...m0];
  const v = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (let sweep = 0; sweep < 50; sweep++) {
    const off = Math.abs(a[1]) + Math.abs(a[2]) + Math.abs(a[5]);
    if (off < 1e-12 * (Math.abs(a[0]) + Math.abs(a[4]) + Math.abs(a[8]) + 1e-30)) break;
    for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
      const apq = a[p * 3 + q];
      if (Math.abs(apq) < 1e-300) continue;
      const theta = (a[q * 3 + q] - a[p * 3 + p]) / (2 * apq);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), sn = t * c;
      for (let k = 0; k < 3; k++) {
        const akp = a[k * 3 + p], akq = a[k * 3 + q];
        a[k * 3 + p] = c * akp - sn * akq; a[k * 3 + q] = sn * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p * 3 + k], aqk = a[q * 3 + k];
        a[p * 3 + k] = c * apk - sn * aqk; a[q * 3 + k] = sn * apk + c * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k * 3 + p], vkq = v[k * 3 + q];
        v[k * 3 + p] = c * vkp - sn * vkq; v[k * 3 + q] = sn * vkp + c * vkq;
      }
    }
  }
  const items = [0, 1, 2].map((i) => ({ value: a[i * 4], vector: [v[i], v[3 + i], v[6 + i]] as V3 })).sort((x, y) => x.value - y.value);
  return { values: items.map((x) => x.value), vectors: items.map((x) => unit(x.vector)) };
}

/** min and max of the vertices along a direction */
export function extent(s: Float64Array, d: V3): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < s.length; i += 3) { const w = s[i] * d[0] + s[i + 1] * d[1] + s[i + 2] * d[2]; if (w < lo) lo = w; if (w > hi) hi = w; }
  return [lo, hi];
}

/** two unit vectors completing d to a right-handed frame (u, v, d) */
export function frameOf(d: V3): { u: V3; v: V3 } {
  const ref: V3 = Math.abs(d[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(cross(ref, d));
  return { u, v: cross(d, u) };
}

export interface Section { segs: [P2, P2][]; area: number; u: V3; v: V3 }

/**
 * The section of a closed mesh by the plane x·d = s: segments in the (u, v) frame, oriented so the material lies on
 * the left (outer loops counter-clockwise), and the net area (holes subtracted).
 */
export function section(s: Float64Array, d: V3, at: number, frame = frameOf(d)): Section {
  const { u, v } = frame;
  const segs: [P2, P2][] = [];
  let area = 0;
  const w0 = at + 1e-7 * (Math.abs(at) + 1);
  for (let i = 0; i < triCount(s); i++) {
    const t = triangle(s, i);
    const w = t.p.map((p) => dot(p, d) - w0);
    if ((w[0] > 0 && w[1] > 0 && w[2] > 0) || (w[0] < 0 && w[1] < 0 && w[2] < 0)) continue;
    const pts: V3[] = [];
    for (let k = 0; k < 3; k++) {
      const a = t.p[k], b = t.p[(k + 1) % 3], wa = w[k], wb = w[(k + 1) % 3];
      if ((wa < 0) !== (wb < 0)) { const f = wa / (wa - wb); pts.push([a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2])]); }
    }
    if (pts.length !== 2) continue;
    let p: P2 = { x: dot(pts[0], u), y: dot(pts[0], v) }, q: P2 = { x: dot(pts[1], u), y: dot(pts[1], v) };
    const nu = dot(t.n, u), nv = dot(t.n, v);
    // the outward normal of a counter-clockwise boundary is the right-hand normal of its direction
    if ((q.y - p.y) * nu - (q.x - p.x) * nv < 0) [p, q] = [q, p];
    segs.push([p, q]);
    area += (p.x * q.y - q.x * p.y) / 2;
  }
  return { segs, area, u, v };
}

/** segments chained into closed loops (endpoints matched within tol); open chains are dropped */
export function chain(segs: [P2, P2][], tol = 1e-3): P2[][] {
  const key = (p: P2) => `${Math.round(p.x / tol)},${Math.round(p.y / tol)}`;
  const from = new Map<string, number[]>();
  segs.forEach((sg, i) => { const k = key(sg[0]); (from.get(k) ?? from.set(k, []).get(k)!).push(i); });
  const used = new Uint8Array(segs.length);
  const loops: P2[][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    const loop: P2[] = [segs[i][0]];
    let cur = i;
    let closed = false;
    for (let guard = 0; guard <= segs.length; guard++) {
      used[cur] = 1;
      const end = segs[cur][1];
      if (key(end) === key(loop[0])) { closed = true; break; }
      loop.push(end);
      const next = (from.get(key(end)) ?? []).find((j) => !used[j]);
      if (next === undefined) break;
      cur = next;
    }
    if (closed && loop.length >= 3) loops.push(loop);
  }
  return loops;
}

export const loopArea = (l: P2[]) => l.reduce((s, p, i) => { const q = l[(i + 1) % l.length]; return s + (p.x * q.y - q.x * p.y) / 2; }, 0);
export const loopLength = (l: P2[]) => l.reduce((s, p, i) => s + Math.hypot(l[(i + 1) % l.length].x - p.x, l[(i + 1) % l.length].y - p.y), 0);

/** convex hull (monotone chain), counter-clockwise */
export function hull(pts: P2[]): P2[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cr = (o: P2, a: P2, b: P2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: P2[] = [], upper: P2[] = [];
  for (const q of p) { while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], q) <= 1e-12) lower.pop(); lower.push(q); }
  for (const q of [...p].reverse()) { while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], q) <= 1e-12) upper.pop(); upper.push(q); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** the smallest enclosing rectangle (rotating the hull edges): sides a >= b, the angle of side a, and its centre */
export function minRect(pts: P2[]): { a: number; b: number; angle: number; c: P2 } {
  const h = hull(pts);
  let best = { area: Infinity, a: 0, b: 0, angle: 0, c: { x: 0, y: 0 } };
  for (let i = 0; i < Math.max(1, h.length); i++) {
    const p = h[i], q = h[(i + 1) % h.length];
    const ang = h.length > 1 ? Math.atan2(q.y - p.y, q.x - p.x) : 0;
    const cs = Math.cos(ang), sn = Math.sin(ang);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const r of h) { const x = r.x * cs + r.y * sn, y = -r.x * sn + r.y * cs; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const w = x1 - x0, hh = y1 - y0;
    if (w * hh < best.area - 1e-9) {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const c = { x: cx * cs - cy * sn, y: cx * sn + cy * cs };
      best = w >= hh ? { area: w * hh, a: w, b: hh, angle: ang, c } : { area: w * hh, a: hh, b: w, angle: ang + Math.PI / 2, c };
    }
  }
  return { a: best.a, b: best.b, angle: best.angle, c: best.c };
}

/** a hash of the geometry (positions rounded to 1 µm), FNV-1a 32 bit, as 8 hex digits (F0-6) */
export function geometryHash(s: Float64Array, extra = ''): string {
  let h = 0x811c9dc5;
  const mix = (x: number) => { h ^= x & 0xff; h = Math.imul(h, 0x01000193); h ^= (x >>> 8) & 0xff; h = Math.imul(h, 0x01000193); h ^= (x >>> 16) & 0xff; h = Math.imul(h,
    0x01000193); h ^= (x >>> 24) & 0xff; h = Math.imul(h, 0x01000193); };
  // order independent within a triangle list would cost a sort; the rebuild is deterministic, so the order is stable
  for (let i = 0; i < s.length; i++) mix(Math.round(s[i] * 1000) | 0);
  for (let i = 0; i < extra.length; i++) mix(extra.charCodeAt(i));
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface PlaneGroup { n: V3; d: number; tris: number[]; area: number; centroid: V3 }

/**
 * Triangles grouped by their plane (normal within 0.001, offset within 0.01 mm), straight from the triangle list: the
 * face list of a body marks the small facets of a tube end as curved, so the end and miter faces are taken from here.
 */
export function planeGroups(s: Float64Array, minArea = 0): PlaneGroup[] {
  const map = new Map<string, PlaneGroup>();
  for (let i = 0; i < triCount(s); i++) {
    const t = triangle(s, i);
    if (t.area < 1e-9) continue;
    const d = dot(t.p[0], t.n);
    const key = `${Math.round(t.n[0] * 500)},${Math.round(t.n[1] * 500)},${Math.round(t.n[2] * 500)},${Math.round(d * 50)}`;
    let g = map.get(key);
    if (!g) { g = { n: t.n, d, tris: [], area: 0, centroid: [0, 0, 0] }; map.set(key, g); }
    const c: V3 = [(t.p[0][0] + t.p[1][0] + t.p[2][0]) / 3, (t.p[0][1] + t.p[1][1] + t.p[2][1]) / 3, (t.p[0][2] + t.p[1][2] + t.p[2][2]) / 3];
    g.centroid = [(g.centroid[0] * g.area + c[0] * t.area) / (g.area + t.area), (g.centroid[1] * g.area + c[1] * t.area) / (g.area + t.area),
      (g.centroid[2] * g.area + c[2] * t.area) / (g.area + t.area)];
    g.area += t.area;
    g.tris.push(i);
  }
  return [...map.values()].filter((g) => g.area >= minArea);
}
