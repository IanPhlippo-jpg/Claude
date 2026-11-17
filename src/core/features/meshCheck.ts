/**
 * Checks on the result of a mesh boolean (QA 0.5.14 P2-8): is a triangle mesh closed, and did a cut or a union really
 * do something where the two bodies overlap. The volume check in `csg` only refuses impossible results (a cut that
 * grows); these two catch the possible but wrong ones (a cut that removed nothing, two opposite holes).
 */
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { TOL } from './tolerance';

function flat(g: THREE.BufferGeometry): THREE.BufferGeometry {
  return g.index ? g.toNonIndexed() : g;
}

/** the total area of a triangle mesh */
export function meshArea(g: THREE.BufferGeometry): number {
  const a = flat(g).getAttribute('position');
  let t = 0;
  for (let i = 0; i + 2 < a.count; i += 3) {
    const ux = a.getX(i + 1) - a.getX(i), uy = a.getY(i + 1) - a.getY(i), uz = a.getZ(i + 1) - a.getZ(i);
    const vx = a.getX(i + 2) - a.getX(i), vy = a.getY(i + 2) - a.getY(i), vz = a.getZ(i + 2) - a.getZ(i);
    t += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }
  return t;
}

/**
 * Vertex ids of a non-indexed position attribute, equal for points within q of each other: the same bits share an id
 * straight away, other points look in the 27 grid cells around them (a boolean computes a shared corner once per
 * triangle, a last bit may differ).
 */
function weld(a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, n: number, q: number): { ids: Int32Array; pts: number[] } {
  // numeric cell hashing (no string keys: this runs on every boolean result, QA 0.5.15 timing): one open hash table of
  // grid cells, each slot heads a chain of the points in it; a point is looked up in its own cell first (equal bits and
  // near points), only a new point looks in the 26 cells around it
  const ids = new Int32Array(n), pts: number[] = [];
  let size = 1024;
  while (size < 2 * n) size *= 2;
  const mask = size - 1, head = new Int32Array(size).fill(-1), next: number[] = [], q2 = q * q;
  const slot = (cx: number, cy: number, cz: number) => (Math.imul(cx | 0, 73856093) ^ Math.imul(cy | 0, 19349663) ^ Math.imul(cz | 0, 83492791)) & mask;
  const find = (h: number, x: number, y: number, z: number): number => {
    for (let j = head[h]; j >= 0; j = next[j]) {
      const dx = pts[j * 3] - x, dy = pts[j * 3 + 1] - y, dz = pts[j * 3 + 2] - z;
      if (dx * dx + dy * dy + dz * dz <= q2) return j;
    }
    return -1;
  };
  // the plain array when there is one (the accessors cost more than the rest of the loop)
  const raw = !(a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute && a.itemSize === 3 && !a.normalized ? (a.array as ArrayLike<number>) : null;
  for (let i = 0; i < n; i++) {
    const x = raw ? raw[i * 3] : a.getX(i), y = raw ? raw[i * 3 + 1] : a.getY(i), z = raw ? raw[i * 3 + 2] : a.getZ(i);
    const cx = Math.floor(x / q), cy = Math.floor(y / q), cz = Math.floor(z / q);
    const own = slot(cx, cy, cz);
    let id = find(own, x, y, z);
    for (let dx = -1; dx <= 1 && id < 0; dx++) {
      for (let dy = -1; dy <= 1 && id < 0; dy++) {
        for (let dz = -1; dz <= 1 && id < 0; dz++) if (dx || dy || dz) id = find(slot(cx + dx, cy + dy, cz + dz), x, y, z);
      }
    }
    if (id < 0) {
      id = pts.length / 3;
      pts.push(x, y, z);
      next.push(head[own]);
      head[own] = id;
    }
    ids[i] = id;
  }
  return { ids, pts };
}

const openCache = new WeakMap<THREE.BufferGeometry, { pos: unknown; version: number; index: unknown; value: number }>();

/**
 * The size of the openings of a triangle mesh (mm², 0 when closed). Vertices are merged by position and every edge is
 * counted with its direction: in a closed surface an edge is run as often one way as the other (also where four
 * triangles meet at one edge). The edges left over run round the openings; each connected set of them counts with the
 * length of its own vector area, so two opposite holes no longer cancel (QA 0.5.14 P2-8: the sum of the oriented
 * triangle areas over the whole mesh did). A T-junction of the boolean (one long edge on one side, collinear pieces on
 * the other) leaves edges that run along a line and back: whatever else they connect to, a closed set of collinear
 * edges has no vector area, so T-junctions do not count. Two openings that share a left-over vertex count as one.
 */
export function openArea(g: THREE.BufferGeometry): number {
  const pos = g.getAttribute('position');
  const hit = openCache.get(g);
  if (hit && hit.pos === pos && hit.version === (pos as THREE.BufferAttribute).version && hit.index === g.index) return hit.value;
  const value = computeOpenArea(g);
  if (pos) openCache.set(g, { pos, version: (pos as THREE.BufferAttribute).version, index: g.index, value });
  return value;
}

function computeOpenArea(g: THREE.BufferGeometry): number {
  const a = flat(g).getAttribute('position');
  const n = Math.floor((a?.count ?? 0) / 3) * 3;
  if (!n) return 0;
  const box = new THREE.Box3().setFromBufferAttribute(a as THREE.BufferAttribute);
  const centre = box.getCenter(new THREE.Vector3());
  const { ids, pts } = weld(a, n, Math.max(1e-5, 1e-6 * box.min.distanceTo(box.max)));
  const V = pts.length / 3;
  // net use of each edge: the edges run from the lower to the higher index and those run the other way, each sorted
  // (typed arrays, no hash map: this runs on every boolean result); a key in one list more often than in the other is
  // left over
  const fwd: number[] = [], back: number[] = [];
  for (let t = 0; t < n; t += 3) {
    const v0 = ids[t], v1 = ids[t + 1], v2 = ids[t + 2];
    if (v0 === v1 || v1 === v2 || v2 === v0) continue;
    if (v0 < v1) fwd.push(v0 * V + v1); else back.push(v1 * V + v0);
    if (v1 < v2) fwd.push(v1 * V + v2); else back.push(v2 * V + v1);
    if (v2 < v0) fwd.push(v2 * V + v0); else back.push(v0 * V + v2);
  }
  const F = Float64Array.from(fwd).sort(), B = Float64Array.from(back).sort();
  const net = new Map<number, number>();
  for (let x = 0, y = 0; x < F.length || y < B.length;) {
    const key = y >= B.length || (x < F.length && F[x] < B[y]) ? F[x] : B[y];
    let c = 0;
    while (x < F.length && F[x] === key) { c++; x++; }
    while (y < B.length && B[y] === key) { c--; y++; }
    if (c) net.set(key, c);
  }
  // the left-over edges, joined into connected sets (union-find over their vertices)
  const left: [number, number, number][] = [];
  const parent = new Map<number, number>();
  const root = (v: number): number => {
    let r = v;
    while (parent.get(r) !== r) r = parent.get(r)!;
    for (let x = v; x !== r;) { const nx = parent.get(x)!; parent.set(x, r); x = nx; }
    return r;
  };
  for (const [key, c] of net) {
    if (!c) continue;
    const lo = Math.floor(key / V), hi = key - lo * V;
    left.push([lo, hi, c]);
    for (const v of [lo, hi]) if (!parent.has(v)) parent.set(v, v);
    const ra = root(lo), rb = root(hi);
    if (ra !== rb) parent.set(ra, rb);
  }
  // every vertex has as many left-over edges in as out (each triangle is a loop), so each set is closed and its vector
  // area does not depend on the origin; the centre of the box keeps the products small
  const area = new Map<number, [number, number, number]>();
  for (const [u, w, c] of left) {
    const ax = pts[u * 3] - centre.x, ay = pts[u * 3 + 1] - centre.y, az = pts[u * 3 + 2] - centre.z;
    const bx = pts[w * 3] - centre.x, by = pts[w * 3 + 1] - centre.y, bz = pts[w * 3 + 2] - centre.z;
    const s = area.get(root(u)) ?? [0, 0, 0];
    s[0] += c * (ay * bz - az * by);
    s[1] += c * (az * bx - ax * bz);
    s[2] += c * (ax * by - ay * bx);
    area.set(root(u), s);
  }
  let total = 0;
  for (const s of area.values()) total += Math.hypot(...s) / 2;
  return total;
}

/** closed within round-off: the openings are below a thousandth of the area */
export function isClosed(g: THREE.BufferGeometry): boolean {
  const area = meshArea(g);
  return area > 0 && openArea(g) <= 1e-3 * area + 1e-6;
}

/**
 * Did the volume of a cut or union stay (nearly) the same? Then `booleanMissed` has to look whether that is right (the
 * tool lies outside the body, or inside it for a union) or the boolean silently did nothing. The margin is the volume
 * check's (a thousandth): a missed hole of Ø5 in a beam of 4 m lies within it.
 */
export function volumeUnchanged(op: 'union' | 'subtract' | 'intersect', va: number, vb: number, vr: number): boolean {
  if (op === 'intersect' || !(va > 0 && vb > 0)) return false;
  const tol = 1e-3 * Math.max(va, vb) + 1e-6;
  return Math.abs(vr - va) <= tol || (op === 'union' && Math.abs(vr - vb) <= tol);
}

/** skewed directions, so a ray does not run along an edge or through a vertex of an axis-aligned mesh */
const RAYS = [new THREE.Vector3(1, 1.618, 2.718), new THREE.Vector3(-2.236, 1, 1.414), new THREE.Vector3(1.732, -2.449, 0.577)].map((d) => d.normalize());
/** at most this many vertices of each body are tested (a regular stride over the rest) */
const MAX_POINTS = 20000;

function bvhOf(g: THREE.BufferGeometry): MeshBVH {
  // a geometry of its own: the BVH adds an index to the geometry it is built on, and the bodies must stay as they are
  const t = new THREE.BufferGeometry();
  t.setAttribute('position', flat(g).getAttribute('position'));
  return new MeshBVH(t);
}

/** where a point lies with respect to a closed mesh: on its surface (within m), inside or outside (ray parity, 2 of 3) */
function side(bvh: MeshBVH, p: THREE.Vector3, m: number): 'on' | 'in' | 'out' {
  const hit = bvh.closestPointToPoint(p);
  if (!hit || hit.distance <= m) return 'on';
  let odd = 0;
  for (const d of RAYS) if ((bvh.raycast(new THREE.Ray(p, d), THREE.DoubleSide) as unknown[]).length % 2) odd++;
  return odd >= 2 ? 'in' : 'out';
}

const thin = (pts: THREE.Vector3[]) =>
  pts.length <= MAX_POINTS ? pts : Array.from({ length: MAX_POINTS }, (_, k) => pts[Math.floor((k * pts.length) / MAX_POINTS)]);

/**
 * The points of a body to place against the other one: its vertices, and the middle of every stretch of its edges
 * between two crossings of the other body's surface. A tool that goes right through (a slot, a hole) has no vertex
 * inside the body and the body none inside the tool, but its edges run through the body. `inside`: only points within
 * the other body's box can count (a cut looks for points inside the other body), so the rest is never looked at.
 */
function samplePoints(g: THREE.BufferGeometry, other: MeshBVH, otherBox: THREE.Box3, inside: boolean): THREE.Vector3[] {
  const a = flat(g).getAttribute('position');
  const n = Math.floor((a?.count ?? 0) / 3) * 3;
  if (!n) return [];
  const { ids, pts } = weld(a, n, 1e-9);
  const V = pts.length / 3;
  const P = (v: number) => new THREE.Vector3(pts[v * 3], pts[v * 3 + 1], pts[v * 3 + 2]);
  const inBox = (v: number) => otherBox.containsPoint(P(v));
  const verts: THREE.Vector3[] = [], mids: THREE.Vector3[] = [];
  for (let v = 0; v < V; v++) if (!inside || inBox(v)) verts.push(P(v));
  const edges = new Set<number>(), seg = new THREE.Box3();
  for (let t = 0; t + 2 < n; t += 3) {
    for (let k = 0; k < 3; k++) {
      const u = ids[t + k], w = ids[t + ((k + 1) % 3)];
      if (u === w) continue;
      const key = Math.min(u, w) * V + Math.max(u, w);
      if (edges.has(key)) continue;
      edges.add(key);
      const p = P(u), q = P(w);
      if (!otherBox.intersectsBox(seg.setFromPoints([p, q]))) continue;
      const len = p.distanceTo(q);
      if (!(len > 0)) continue;
      const dir = q.clone().sub(p).divideScalar(len);
      const ts = (other.raycast(new THREE.Ray(p, dir), THREE.DoubleSide, 0, len) as { distance: number }[]).map((h) => h.distance);
      if (!ts.length) continue;
      ts.push(0, len);
      ts.sort((x, y) => x - y);
      for (let j = 0; j + 1 < ts.length; j++) if (ts[j + 1] - ts[j] > 0) mids.push(p.clone().addScaledVector(dir, (ts[j] + ts[j + 1]) / 2));
    }
  }
  return [...thin(verts), ...thin(mids)];
}

/**
 * A cut or union whose result is wrong where the bodies really overlap (QA 0.5.14 P2-8), or null when it is right.
 * The points of each body (`samplePoints`) are placed against the other body; a point that lies strictly inside it (a cut) or strictly
 * outside it (a union), by more than the point tolerance, lies on the surface of a correct result (a tool vertex
 * becomes a corner of the pocket, a boss vertex a corner of the boss) or outside it (a body vertex inside the tool is
 * cut away). Strictly inside the result after a cut, or strictly outside it after a union, the boolean missed. Bodies
 * that only touch (a shared face, coplanar faces) have no such point; a tool clear of the body neither. Meant for
 * results whose volume did not change (`volumeUnchanged`): elsewhere the volume tells.
 */
export function booleanMissed(
  op: 'union' | 'subtract', a: THREE.BufferGeometry, b: THREE.BufferGeometry, r: THREE.BufferGeometry, vol?: { va: number; vb: number; vr: number },
): string | null {
  const boxA = new THREE.Box3().setFromBufferAttribute(flat(a).getAttribute('position') as THREE.BufferAttribute);
  const boxB = new THREE.Box3().setFromBufferAttribute(flat(b).getAttribute('position') as THREE.BufferAttribute);
  const m = Math.max(TOL.point, 1e-6 * boxA.clone().union(boxB).getSize(new THREE.Vector3()).length());
  if (!boxA.clone().expandByScalar(m).intersectsBox(boxB)) return null;
  if (!(r.getAttribute('position')?.count > 0)) return null;
  // which body's points can show a miss: after a cut both (tool points in the body, body points in the tool, each only
  // within the other's box); after a union only the body whose volume the result lacks (a union that kept the volume
  // of the body can only have dropped the tool, and the other way round)
  const tolV = vol ? 1e-3 * Math.max(vol.va, vol.vb) + 1e-6 : 0;
  const checkB = op === 'subtract' || !vol || Math.abs(vol.vr - vol.va) <= tolV;
  const checkA = op === 'subtract' || !vol || Math.abs(vol.vr - vol.vb) <= tolV;
  const R = bvhOf(r);
  const wrong = op === 'subtract' ? 'in' : 'out';
  const sets: [THREE.Vector3[], MeshBVH, string][] = [];
  if (checkB) { const A = bvhOf(a); sets.push([samplePoints(b, A, boxA, op === 'subtract'), A, 'tool']); }
  if (checkA) { const B = bvhOf(b); sets.push([samplePoints(a, B, boxB, op === 'subtract'), B, 'body']); }
  for (const [pts, other, what] of sets) {
    for (const p of pts) {
      if (side(other, p, m) !== wrong || side(R, p, m) !== wrong) continue;
      const at = `(${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`;
      return op === 'subtract'
        ? `the cut left material where the tool overlaps the body: a ${what} point at ${at} lies inside both and is still inside the result`
        : `the union lost a body: a ${what} point at ${at} lies outside the other body and outside the result`;
    }
  }
  return null;
}
