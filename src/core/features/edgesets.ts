import * as THREE from 'three';
import { TOL } from './tolerance';

/** One crease segment of a body with the normals of the two faces it joins. */
export interface CreaseSegment {
  a: THREE.Vector3;
  b: THREE.Vector3;
  n1: THREE.Vector3;
  n2: THREE.Vector3;
}

/** A selectable edge of a body: a straight line or a chain of segments (circle, arc). */
export interface BodyEdge {
  id: string;
  segments: CreaseSegment[];
  /** polyline for drawing / picking */
  points: THREE.Vector3[];
  closed: boolean;
  straight: boolean;
  length: number;
  centroid: THREE.Vector3;
}

/** Reference to an edge that survives a rebuild: matched by centroid, length and shape. */
export interface EdgeRef {
  centroid: [number, number, number];
  length: number;
  closed: boolean;
  straight: boolean;
}

const Q = 1e-3;

/**
 * Crease segments of a mesh: parts of triangle edges where the neighbouring triangle
 * (found by collinear overlap, so T-junctions are fine) makes an angle above the threshold.
 * Each crease is reported once.
 */
export function creaseSegments(g: THREE.BufferGeometry, thresholdDeg = 20): CreaseSegment[] {
  const ng = g.index ? g.toNonIndexed() : g;
  const pos = ng.getAttribute('position');
  const triCount = Math.floor(pos.count / 3);
  const P = (i: number) => new THREE.Vector3().fromBufferAttribute(pos, i);
  const normals: THREE.Vector3[] = [];
  interface E {
    tri: number;
    a: THREE.Vector3;
    b: THREE.Vector3;
    dir: THREE.Vector3;
    len: number;
  }
  const lines = new Map<string, E[]>();
  const r = (v: number) => Math.round(v / 0.02);
  // grouped by canonical direction; collinearity by distance to the line (tolerant to boolean noise)
  // a line: its canonical direction and the foot point of the origin on it (cell 0.5 mm), so only edges on the
  // same line meet (grouping by direction alone is quadratic for the many parallel edges of cylinders and threads)
  const CELL = 0.5;
  const dirKey = (e: E): string => {
    const d = e.dir.clone();
    const f = Math.abs(d.x) > 1e-6 ? d.x : Math.abs(d.y) > 1e-6 ? d.y : d.z;
    if (f < 0) d.negate();
    return `${r(d.x)},${r(d.y)},${r(d.z)}`;
  };
  const foot = (e: E) => e.a.clone().addScaledVector(e.dir, -e.a.dot(e.dir));
  const lineKey = (e: E, dx = 0, dy = 0, dz = 0): string => {
    const q = foot(e);
    return `${dirKey(e)}|${Math.round(q.x / CELL) + dx},${Math.round(q.y / CELL) + dy},${Math.round(q.z / CELL) + dz}`;
  };
  const distToLine = (p: THREE.Vector3, e: E) => p.clone().sub(e.a).cross(e.dir).length();
  const collinear = (o: E, e: E) => distToLine(o.a, e) < 0.02 && distToLine(o.b, e) < 0.02;
  void Q;
  const all: E[] = [];
  for (let t = 0; t < triCount; t++) {
    const p0 = P(t * 3), p1 = P(t * 3 + 1), p2 = P(t * 3 + 2);
    const n = p1.clone().sub(p0).cross(p2.clone().sub(p0));
    const l = n.length();
    normals.push(l > 1e-12 ? n.divideScalar(l) : n);
    if (l <= 1e-12) continue;
    for (const [a, b] of [[p0, p1], [p1, p2], [p2, p0]] as [THREE.Vector3, THREE.Vector3][]) {
      const dir = b.clone().sub(a);
      const len = dir.length();
      if (len < 1e-9) continue;
      dir.divideScalar(len);
      const e: E = { tri: t, a, b, dir, len };
      all.push(e);
      const k = lineKey(e);
      (lines.get(k) ?? lines.set(k, []).get(k)!).push(e);
    }
  }
  const cosT = Math.cos((thresholdDeg * Math.PI) / 180);
  const out: CreaseSegment[] = [];
  const near: [number, number, number][] = [];
  for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) for (const dz of [-1, 0, 1]) near.push([dx, dy, dz]);
  for (const e of all) {
    const group: E[] = [];
    for (const [dx, dy, dz] of near) { const g2 = lines.get(lineKey(e, dx, dy, dz)); if (g2) group.push(...g2); }
    for (const o of group) {
      if (o.tri <= e.tri || !collinear(o, e)) continue; // each pair once
      const t0 = o.a.clone().sub(e.a).dot(e.dir), t1 = o.b.clone().sub(e.a).dot(e.dir);
      const lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(e.len, Math.max(t0, t1));
      if (hi - lo < 1e-4) continue;
      // the neighbour must run the opposite way (shared edge of two faces), not be the same face's twin on top
      if (o.dir.dot(e.dir) > 0) continue;
      const dot = normals[o.tri].dot(normals[e.tri]);
      if (dot > cosT) continue;
      out.push({ a: e.a.clone().addScaledVector(e.dir, lo), b: e.a.clone().addScaledVector(e.dir, hi), n1: normals[e.tri].clone(), n2: normals[o.tri].clone() });
    }
  }
  return out;
}

/** Merge collinear, overlapping crease segments that join the same two faces (booleans leave T-junction splits). */
export function mergeCollinear(segs: CreaseSegment[]): CreaseSegment[] {
  const r = (v: number) => Math.round(v / 0.02);
  const byDir = new Map<string, CreaseSegment[]>();
  for (const s of segs) {
    const d = s.b.clone().sub(s.a).normalize();
    const f = Math.abs(d.x) > 1e-6 ? d.x : Math.abs(d.y) > 1e-6 ? d.y : d.z;
    if (f < 0) d.negate();
    const fx = (v: number) => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2));
    const nk = [s.n1, s.n2].map((n) => `${fx(n.x)},${fx(n.y)},${fx(n.z)}`).sort().join('/');
    const k = `${r(d.x)},${r(d.y)},${r(d.z)}|${nk}`;
    (byDir.get(k) ?? byDir.set(k, []).get(k)!).push(s);
  }
  // within a direction group, cluster the segments that lie on the same line
  const clusters: CreaseSegment[][] = [];
  for (const list of byDir.values()) {
    const local: CreaseSegment[][] = [];
    for (const s of list) {
      const d = s.b.clone().sub(s.a).normalize();
      let placed = false;
      for (const cl of local) {
        const ref = cl[0];
        const dist = (p: THREE.Vector3) => p.clone().sub(ref.a).cross(d).length();
        if (dist(ref.a) < 0.02 && dist(ref.b) < 0.02 && dist(s.a) < 0.02 && dist(s.b) < 0.02) {
          cl.push(s);
          placed = true;
          break;
        }
      }
      if (!placed) local.push([s]);
    }
    clusters.push(...local);
  }
  const out: CreaseSegment[] = [];
  for (const list of clusters) {
    if (list.length === 1) {
      out.push(list[0]);
      continue;
    }
    const d = list[0].b.clone().sub(list[0].a).normalize();
    const o = list[0].a;
    const iv = list.map((s) => {
      const t0 = s.a.clone().sub(o).dot(d), t1 = s.b.clone().sub(o).dot(d);
      return { lo: Math.min(t0, t1), hi: Math.max(t0, t1), s };
    }).sort((x, y) => x.lo - y.lo);
    let cur = iv[0];
    for (let i = 1; i <= iv.length; i++) {
      const nx = iv[i];
      if (nx && nx.lo <= cur.hi + 0.05) cur = { lo: cur.lo, hi: Math.max(cur.hi, nx.hi), s: cur.s };
      else {
        out.push({ a: o.clone().addScaledVector(d, cur.lo), b: o.clone().addScaledVector(d, cur.hi), n1: cur.s.n1, n2: cur.s.n2 });
        if (nx) cur = nx;
      }
    }
  }
  return out;
}

/** Group crease segments into edges: collinear runs become straight edges, smooth turns become curves. */
export function bodyEdges(g: THREE.BufferGeometry, bodyId: string, thresholdDeg = 20, extra: CreaseSegment[] = []): BodyEdge[] {
  // extra: imprinted edges between coplanar faces (Split Line)
  let segs = mergeCollinear([...creaseSegments(g, thresholdDeg), ...extra]);
  // slivers that booleans leave at chord junctions are dropped; chaining then snaps end points within `tol`
  const tol = 0.05;
  segs = segs.filter((x) => x.a.distanceTo(x.b) >= 0.005);
  const key = (p: THREE.Vector3) => `${Math.round(p.x / tol)},${Math.round(p.y / tol)},${Math.round(p.z / tol)}`;
  const atPoint = new Map<string, number[]>();
  segs.forEach((s, i) => {
    for (const p of [s.a, s.b]) {
      const k = key(p);
      (atPoint.get(k) ?? atPoint.set(k, []).get(k)!).push(i);
    }
  });
  const used = new Array(segs.length).fill(false);
  const dirOf = (s: CreaseSegment) => s.b.clone().sub(s.a).normalize();
  const sameFaces = (s: CreaseSegment, t: CreaseSegment) => {
    const pairs = [[s.n1, t.n1, s.n2, t.n2], [s.n1, t.n2, s.n2, t.n1]];
    return pairs.some(([a, b, c, d]) => a.dot(b) > 0.95 && c.dot(d) > 0.95) || (s.n1.dot(t.n1) > 0.95 || s.n1.dot(t.n2) > 0.95);
  };
  const edges: BodyEdge[] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    // walk both directions
    const chain: CreaseSegment[] = [segs[i]];
    let straight = true;
    const extend = (forward: boolean) => {
      for (;;) {
        const last = forward ? chain[chain.length - 1] : chain[0];
        const end = forward ? last.b : last.a;
        const cands = (atPoint.get(key(end)) ?? []).filter((j) => !used[j]);
        if (!cands.length) return;
        // several candidates (boolean slivers): take the one that continues most smoothly
        let j = -1, best = -Infinity, seg: CreaseSegment | null = null;
        for (const cj of cands) {
          const s = segs[cj];
          const oriented = key(s.a) === key(end) ? s : { a: s.b, b: s.a, n1: s.n1, n2: s.n2 };
          const d0 = dirOf(last), d1 = dirOf(oriented);
          const turn = forward ? d0.dot(d1) : d1.dot(d0);
          if (turn > best && sameFaces(last, oriented)) {
            best = turn;
            j = cj;
            seg = oriented;
          }
        }
        if (j < 0 || !seg) return;
        const turn = best;
        if (turn < Math.cos((40 * Math.PI) / 180)) return; // sharp corner: a different edge
        if (turn < 0.9995) straight = false;
        used[j] = true;
        if (forward) chain.push(seg);
        else chain.unshift(forward ? seg : { a: seg.b, b: seg.a, n1: seg.n1, n2: seg.n2 });
      }
    };
    extend(true);
    extend(false);
    const points = [chain[0].a, ...chain.map((s) => s.b)];
    const closed = key(points[0]) === key(points[points.length - 1]) && chain.length > 2;
    const length = chain.reduce((a, s) => a + s.a.distanceTo(s.b), 0);
    const centroid = new THREE.Vector3();
    for (const s of chain) centroid.addScaledVector(s.a.clone().add(s.b).multiplyScalar(0.5), s.a.distanceTo(s.b));
    centroid.divideScalar(length || 1);
    edges.push({ id: `${bodyId}:e${edges.length}`, segments: chain, points, closed, straight, length, centroid });
  }
  return edges;
}

export function edgeRef(e: BodyEdge): EdgeRef {
  return { centroid: [e.centroid.x, e.centroid.y, e.centroid.z], length: e.length, closed: e.closed, straight: e.straight };
}

/** Find the edge of a body that a reference points to (after a rebuild). */
export function matchEdge(edges: BodyEdge[], ref: EdgeRef, tol: number = TOL.reference): BodyEdge | null {
  let best: BodyEdge | null = null, bestD = Infinity;
  for (const e of edges) {
    if (e.closed !== ref.closed || e.straight !== ref.straight) continue;
    if (Math.abs(e.length - ref.length) > Math.max(0.5, ref.length * 0.05)) continue;
    const d = e.centroid.distanceTo(new THREE.Vector3(...ref.centroid));
    if (d < tol && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}


/**
 * The run of an edge chain around a point: its straight part or its curved part (an edge chain is merged through
 * tangent joins). Used when Tangent propagation is off.
 */
export function subEdgeAt(e: BodyEdge, point: THREE.Vector3): BodyEdge {
  const segs = e.segments;
  if (segs.length < 2) return e;
  const dir = (s: CreaseSegment) => s.b.clone().sub(s.a).normalize();
  // runs: a facet of an arc is short next to its neighbours; a line in a tangent chain is a long segment (or
  // collinear segments). Consecutive segments of the same kind form one run.
  const len = (s: CreaseSegment) => s.a.distanceTo(s.b);
  const straightPair = (a: CreaseSegment, b: CreaseSegment) => dir(a).dot(dir(b)) > 0.9999;
  const isLine = segs.map((s, i) => {
    const nb = [segs[i - 1], segs[i + 1]].filter(Boolean) as CreaseSegment[];
    if (nb.some((n) => straightPair(n, s))) return true;
    return nb.length > 0 && len(s) > 2 * Math.min(...nb.map(len));
  });
  const runs: CreaseSegment[][] = [];
  let cur: CreaseSegment[] = [segs[0]];
  for (let i = 1; i < segs.length; i++) {
    if (isLine[i] === isLine[i - 1] && !(isLine[i] && !straightPair(segs[i - 1], segs[i]))) cur.push(segs[i]);
    else { runs.push(cur); cur = [segs[i]]; }
  }
  runs.push(cur);
  // a closed chain: the last run continues into the first when they are of the same kind
  if (e.closed && runs.length > 2 && isLine[0] === isLine[segs.length - 1] && !isLine[0]) runs[0] = [...runs.pop()!, ...runs[0]];
  if (runs.length < 2) return e;
  let best = runs[0], bestD = Infinity;
  for (const r of runs) for (const s of r) {
    const ab = s.b.clone().sub(s.a);
    const t = Math.max(0, Math.min(1, point.clone().sub(s.a).dot(ab) / (ab.lengthSq() || 1)));
    const d = s.a.clone().addScaledVector(ab, t).distanceTo(point);
    if (d < bestD) { bestD = d; best = r; }
  }
  const pts = [best[0].a.clone(), ...best.map((s) => s.b.clone())];
  const length = best.reduce((a, s) => a + s.a.distanceTo(s.b), 0);
  const centroid = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
  return { id: `${e.id}~${runs.indexOf(best)}`, segments: best, points: pts, closed: false, straight: best.every((x, i) => i === 0 || straightPair(best[0], x)), length, centroid };
}
