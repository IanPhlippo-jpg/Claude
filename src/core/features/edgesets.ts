import { FACE_TAG } from './faceNames';
import * as THREE from 'three';
import { referenceTol } from './tolerance';

/** One crease segment of a body with the normals of the two faces it joins. */
export interface CreaseSegment {
  a: THREE.Vector3;
  b: THREE.Vector3;
  n1: THREE.Vector3;
  n2: THREE.Vector3;
  /** the names (face tags) of the two faces, where the body carries them (F47) */
  f1?: number;
  f2?: number;
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
  /**
   * the tangent chain the edge is a part of (SW: a straight edge, the arc of a bend and the next straight edge are three
   * edges; Tangent propagation selects them together). Set when the chain has more than one edge; `chainRot`: the
   * segment the chain was cut open at (a closed chain), so the whole chain comes back in its own order (joinedOf).
   */
  chain?: string;
  chainRot?: number;
}

/**
 * Reference to an edge that survives a rebuild: matched by centroid, length and shape. Since 0.3.7 (QA F47) also the
 * direction of a straight edge and the normals of the two faces it joins, so an edge that an earlier feature moved
 * (a deeper extrude, a longer plate) is found again by what it is instead of where it was.
 */
export interface EdgeRef {
  centroid: [number, number, number];
  length: number;
  closed: boolean;
  straight: boolean;
  /** unit direction of a straight edge */
  dir?: [number, number, number];
  /** normals of the two faces the edge joins (at its middle) */
  normals?: [[number, number, number], [number, number, number]];
  /** the names of the two faces the edge joins (face tags, smallest first; F47) */
  faces?: [number, number];
  /** where the edge was clicked (Fillet / Chamfer) */
  pick?: [number, number, number];
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
  const tagAttr = ng.getAttribute(FACE_TAG);
  const tag = (t: number) => (tagAttr ? Math.round(tagAttr.getX(t * 3)) : 0);
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
      out.push({ a: e.a.clone().addScaledVector(e.dir, lo), b: e.a.clone().addScaledVector(e.dir, hi), n1: normals[e.tri].clone(), n2: normals[o.tri].clone(), ...(tagAttr ? { f1: tag(e.tri), f2: tag(o.tri) } : {}) });
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
        out.push({ a: o.clone().addScaledVector(d, cur.lo), b: o.clone().addScaledVector(d, cur.hi), n1: cur.s.n1, n2: cur.s.n2, f1: cur.s.f1, f2: cur.s.f2 });
        if (nx) cur = nx;
      }
    }
  }
  return out;
}

// end points of crease segments within this distance are one point (chaining snaps them)
const SNAP = 0.05;
const key = (p: THREE.Vector3) => `${Math.round(p.x / SNAP)},${Math.round(p.y / SNAP)},${Math.round(p.z / SNAP)}`;

/** an edge from its chain of segments (in order); straight when no join turns by more than about 1.8 degrees */
function makeEdge(id: string, chain: CreaseSegment[], closed: boolean, link?: { chain: string; chainRot: number }): BodyEdge {
  const points = [chain[0].a, ...chain.map((s) => s.b)];
  const length = chain.reduce((a, s) => a + s.a.distanceTo(s.b), 0);
  const centroid = new THREE.Vector3();
  for (const s of chain) centroid.addScaledVector(s.a.clone().add(s.b).multiplyScalar(0.5), s.a.distanceTo(s.b));
  centroid.divideScalar(length || 1);
  const dir = (s: CreaseSegment) => s.b.clone().sub(s.a).normalize();
  const straight = chain.every((s, i) => i === 0 || dir(chain[i - 1]).dot(dir(s)) >= 0.9995);
  return { id, segments: chain, points, closed, straight, length, centroid, ...(link ?? {}) };
}

/**
 * Where a tangent chain of crease segments splits into SW edges (QA: one curved edge along a bent side, SW shows three):
 * a straight run and an arc, two arcs of a different radius or axis. breaks[i]: a new edge starts at segment i (i = 0
 * is the join of the last and the first segment of a closed chain). The shape decides on the mesh: collinear segments
 * are one line piece; two pieces belong to one arc when they are about as long and turn by at most 20 degrees, unless
 * the join turns by about half of what the next join does at about twice its radius (the tangent point of a line and
 * an arc: the line runs along the tangent, half a facet angle off the first chord). Named faces (F47) split as well:
 * an edge joins the same two faces along its whole length.
 */
function chainBreaks(chain: CreaseSegment[], closed: boolean): boolean[] {
  const n = chain.length;
  const brk = new Array<boolean>(n).fill(false);
  const pair = (s: CreaseSegment) => (s.f1 && s.f2 && s.f1 !== s.f2 ? (s.f1 < s.f2 ? `${s.f1}/${s.f2}` : `${s.f2}/${s.f1}`) : null);
  for (let i = closed ? 0 : 1; i < n; i++) {
    const p = pair(chain[(i - 1 + n) % n]), q = pair(chain[i]);
    if (p && q && p !== q) brk[i] = true;
  }
  const dir = (s: CreaseSegment) => s.b.clone().sub(s.a).normalize();
  // line pieces: consecutive collinear segments (a boolean sliver within 1e-3 of the line counts as on it)
  const pieces: { from: number; a: THREE.Vector3; b: THREE.Vector3 }[] = [];
  for (let i = 0; i < n; i++) {
    const p = pieces[pieces.length - 1], s = chain[i];
    if (p) {
      const d = p.b.clone().sub(p.a), L = d.length();
      if (L > 1e-9 && d.dot(dir(s)) > 0 && (d.dot(dir(s)) / L > 0.99999 || s.b.clone().sub(p.a).cross(d).length() / L < 1e-3)) { p.b = s.b; continue; }
    }
    pieces.push({ from: i, a: s.a, b: s.b });
  }
  const m = pieces.length;
  if (m < 2) return brk;
  const len = pieces.map((p) => p.a.distanceTo(p.b)), pd = pieces.map((p) => p.b.clone().sub(p.a).normalize());
  // joint k: between piece k - 1 and piece k (k = 0: the last and the first piece of a closed chain)
  const joint = (k: number) => {
    const a = (k - 1 + m) % m;
    const th = Math.acos(Math.max(-1, Math.min(1, pd[a].dot(pd[k]))));
    const ratio = Math.max(len[a], len[k]) / Math.max(1e-9, Math.min(len[a], len[k]));
    return { th, line: th < 0.0045, arc: th > 0 && th <= (20 * Math.PI) / 180 && ratio <= 1.3, R: (len[a] + len[k]) / 4 / Math.max(1e-12, Math.sin(th / 2)) };
  };
  const J = Array.from({ length: m }, (_, k) => (k > 0 || closed ? joint(k) : null));
  const at = (k: number) => (closed ? J[(k + m) % m] : k > 0 && k < m ? J[k] : null);
  for (let k = closed ? 0 : 1; k < m; k++) {
    const j = J[k]!;
    const tangentPoint = [at(k - 1), at(k + 1)].some((nb) => !!nb && nb.arc && j.th < 0.75 * nb.th && j.R > 1.3 * nb.R);
    if (!(j.line || (j.arc && !tangentPoint))) brk[pieces[k].from] = true;
  }
  return brk;
}

/** the runs of a chain between its breaks; a closed chain is cut open at its first break (rot: that segment) */
function chainRuns(chain: CreaseSegment[], brk: boolean[], closed: boolean): { runs: CreaseSegment[][]; rot: number } {
  const n = chain.length;
  const start = closed ? brk.findIndex((b) => b) : 0;
  if (start < 0) return { runs: [chain], rot: 0 };
  const order = [...chain.slice(start), ...chain.slice(0, start)], bo = [...brk.slice(start), ...brk.slice(0, start)];
  const runs: CreaseSegment[][] = [[order[0]]];
  for (let i = 1; i < n; i++) {
    if (bo[i]) runs.push([]);
    runs[runs.length - 1].push(order[i]);
  }
  // a run shorter than 0.05 (a boolean sliver at a join) belongs to its neighbour
  const L = (r: CreaseSegment[]) => r.reduce((a, s) => a + s.a.distanceTo(s.b), 0);
  for (let i = 0; i < runs.length && runs.length > 1;) {
    if (L(runs[i]) >= 0.05) { i++; continue; }
    if (i > 0) runs[i - 1].push(...runs[i]);
    else runs[1].unshift(...runs[0]);
    runs.splice(i, 1);
  }
  return runs.length > 1 ? { runs, rot: start } : { runs: [chain], rot: 0 };
}

/**
 * Group crease segments into edges: collinear runs become straight edges, smooth turns become curves. A tangent chain
 * (a line, the arc of a bend, the next line) is split into its SW edges (chainBreaks); its parts carry the chain's id.
 */
export function bodyEdges(g: THREE.BufferGeometry, bodyId: string, thresholdDeg = 20, extra: CreaseSegment[] = []): BodyEdge[] {
  // extra: imprinted edges between coplanar faces (Split Line)
  let segs = mergeCollinear([...creaseSegments(g, thresholdDeg), ...extra]);
  // slivers that booleans leave at chord junctions are dropped; chaining then snaps end points within SNAP
  segs = segs.filter((x) => x.a.distanceTo(x.b) >= 0.005);
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
          const oriented = key(s.a) === key(end) ? s : { ...s, a: s.b, b: s.a };
          const d0 = dirOf(last), d1 = dirOf(oriented);
          // `oriented` starts at the end point; walking backwards the chain's first segment starts there too, so a
          // smooth join runs the opposite way (the sign was the same both ways: an open curve walked backwards from a
          // segment in its middle stopped there, QA 0.5.11 T4)
          const turn = forward ? d0.dot(d1) : -d1.dot(d0);
          if (turn > best && sameFaces(last, oriented)) {
            best = turn;
            j = cj;
            seg = oriented;
          }
        }
        if (j < 0 || !seg) return;
        const turn = best;
        if (turn < Math.cos((40 * Math.PI) / 180)) return; // sharp corner: a different edge
        used[j] = true;
        if (forward) chain.push(seg);
        else chain.unshift(forward ? seg : { ...seg, a: seg.b, b: seg.a });
      }
    };
    extend(true);
    extend(false);
    const closed = key(chain[0].a) === key(chain[chain.length - 1].b) && chain.length > 2;
    const { runs, rot } = chain.length > 1 ? chainRuns(chain, chainBreaks(chain, closed), closed) : { runs: [chain], rot: 0 };
    const link = runs.length > 1 ? { chain: `${bodyId}:t${i}`, chainRot: rot } : undefined;
    for (const run of runs) edges.push(makeEdge(`${bodyId}:e${edges.length}`, run, link ? false : closed, link));
  }
  return edges;
}

/**
 * The whole tangent chain an edge is part of, as one edge (as bodyEdges gave it before the SW edge split): Tangent
 * propagation, and the edge an old reference to a joined chain points to. An edge that is no part of a chain is itself.
 */
export function joinedOf(edges: BodyEdge[], e: BodyEdge): BodyEdge {
  return e.chain ? joinParts(edges.filter((x) => x.chain === e.chain)) : e;
}

/** the parts of one chain (in order) as one edge, in the chain's own order (a closed chain was cut open at chainRot) */
function joinParts(parts: BodyEdge[]): BodyEdge {
  const cat = parts.flatMap((x) => x.segments);
  const n = cat.length, rot = (parts[0].chainRot ?? 0) % Math.max(1, n);
  const chain = rot ? [...cat.slice(n - rot), ...cat.slice(0, n - rot)] : cat;
  return makeEdge(parts[0].chain!, chain, key(chain[0].a) === key(chain[n - 1].b) && n > 2);
}

/** The edges with each tangent chain as one edge (an outline read whole: a slot of two lines and two half circles). */
export function tangentChains(edges: BodyEdge[]): BodyEdge[] {
  const joined = new Map(joinedChains(edges).map((c) => [c.joined.id, c.joined]));
  const seen = new Set<string>();
  return edges.flatMap((e) => (!e.chain || !joined.has(e.chain) ? [e] : seen.has(e.chain) ? [] : (seen.add(e.chain), [joined.get(e.chain)!])));
}

/** the tangent chains of more than one edge: the joined edge and its parts (in order); once per list of edges */
const chainCache = new WeakMap<BodyEdge[], { joined: BodyEdge; parts: BodyEdge[] }[]>();
function joinedChains(edges: BodyEdge[]): { joined: BodyEdge; parts: BodyEdge[] }[] {
  const hit = chainCache.get(edges);
  if (hit) return hit;
  const by = new Map<string, BodyEdge[]>();
  for (const e of edges) if (e.chain) (by.get(e.chain) ?? by.set(e.chain, []).get(e.chain)!).push(e);
  const out = [...by.values()].filter((p) => p.length > 1).map((parts) => ({ joined: joinParts(parts), parts }));
  chainCache.set(edges, out);
  return out;
}

const v3 = (v: THREE.Vector3): [number, number, number] => [round6(v.x), round6(v.y), round6(v.z)];
const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

/** the segment in the middle of the chain (its normals stand for the faces the edge joins) */
function midSegment(e: BodyEdge): CreaseSegment {
  let best = e.segments[0], bd = Infinity;
  for (const s of e.segments) {
    const d = s.a.clone().add(s.b).multiplyScalar(0.5).distanceTo(e.centroid);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

function edgeDir(e: BodyEdge): THREE.Vector3 {
  return e.points[e.points.length - 1].clone().sub(e.points[0]).normalize();
}

/** the names of the two faces of an edge (smallest first), when both faces have one */
export function edgeFaces(e: BodyEdge): [number, number] | null {
  const m = midSegment(e);
  if (!m.f1 || !m.f2 || m.f1 === m.f2) return null;
  return m.f1 < m.f2 ? [m.f1, m.f2] : [m.f2, m.f1];
}

export function edgeRef(e: BodyEdge): EdgeRef {
  const m = midSegment(e);
  const faces = edgeFaces(e);
  return {
    centroid: [e.centroid.x, e.centroid.y, e.centroid.z], length: e.length, closed: e.closed, straight: e.straight,
    ...(e.straight && !e.closed ? { dir: v3(edgeDir(e)) } : {}),
    normals: [v3(m.n1.clone().normalize()), v3(m.n2.clone().normalize())],
    ...(faces ? { faces } : {}),
  };
}

/** both face normals agree (in either order); for a curved edge one of them is enough (the other turns along it) */
function sameNormals(e: BodyEdge, ref: EdgeRef): boolean {
  if (!ref.normals) return true;
  const m = midSegment(e);
  const [r1, r2] = ref.normals.map((n) => new THREE.Vector3(...n));
  const a = m.n1.clone().normalize(), b = m.n2.clone().normalize();
  const eq = (x: THREE.Vector3, y: THREE.Vector3) => x.dot(y) > 0.995;
  if (e.straight) return (eq(a, r1) && eq(b, r2)) || (eq(a, r2) && eq(b, r1));
  return eq(a, r1) || eq(a, r2) || eq(b, r1) || eq(b, r2);
}

/** Find the edge of a body that a reference points to (after a rebuild). */
function matchEdgeIn(edges: BodyEdge[], ref: EdgeRef, tol: number): BodyEdge | null {
  let best: BodyEdge | null = null, bestD = Infinity;
  const c = new THREE.Vector3(...ref.centroid);
  // by name first (F47): the edge between the same two named faces; where they meet more than once (a pattern, a
  // face crossed twice) the nearest of those
  if (ref.faces) {
    const named = edges.filter((e) => e.closed === ref.closed && e.straight === ref.straight && edgeFaces(e)?.[0] === ref.faces![0] && edgeFaces(e)?.[1] === ref.faces![1]);
    if (named.length === 1) return named[0];
    if (named.length > 1) {
      // the nearest, unless two lie about equally far and neither is where the edge was: then the reference is not
      // guessed (QA 0.5.11 F177/F179: a silent pick of one of two pieces); the feature says an edge was lost instead
      const byD = named.map((e) => ({ e, d: e.centroid.distanceTo(c) })).sort((x, y) => x.d - y.d);
      if (byD[0].d > tol && byD[1].d - byD[0].d < Math.max(0.5, byD[0].d * 0.1)) return null;
      return byD[0].e;
    }
  }
  for (const e of edges) {
    if (e.closed !== ref.closed || e.straight !== ref.straight) continue;
    if (Math.abs(e.length - ref.length) > Math.max(0.5, ref.length * 0.05)) continue;
    const d = e.centroid.distanceTo(c);
    if (d < tol && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  if (best) return best;
  return matchMovedEdge(edges, ref);
}

/**
 * What a reference points to: an edge, or a whole tangent chain (a reference saved before the SW edge split, when one
 * curved edge ran along a line, a bend and a line): the chain answers it when it matches the reference better than any
 * one edge does (its length nearer the stored one).
 */
function resolveRef(edges: BodyEdge[], ref: EdgeRef, tol: number): BodyEdge | { joined: BodyEdge; parts: BodyEdge[] } | null {
  const d = matchEdgeIn(edges, ref, tol);
  const off = (e: BodyEdge) => Math.abs(e.length - ref.length);
  if (d && off(d) <= 1e-6 * Math.max(1, ref.length)) return d;
  const chains = joinedChains(edges);
  if (!chains.length) return d;
  const j = matchEdgeIn(chains.map((c) => c.joined), ref, tol);
  const c = j && chains.find((x) => x.joined.id === j.id);
  return c && (!d || off(c.joined) < off(d)) ? c : d;
}

/** the point halfway along an edge */
function midpointOf(e: BodyEdge): THREE.Vector3 {
  let left = e.length / 2;
  for (const s of e.segments) {
    const l = s.a.distanceTo(s.b);
    if (left <= l) return s.a.clone().lerp(s.b, l > 0 ? left / l : 0);
    left -= l;
  }
  return e.points[e.points.length - 1].clone();
}

/** the edge of a list nearest to a point (distance to its polyline) */
function nearestEdge(list: BodyEdge[], p: THREE.Vector3): BodyEdge {
  const seg = new THREE.Line3(), q = new THREE.Vector3();
  const dist = (e: BodyEdge) => Math.min(...e.segments.map((s) => { seg.set(s.a, s.b); seg.closestPointToPoint(p, true, q); return q.distanceTo(p); }));
  return list.reduce((a, b) => (dist(b) < dist(a) ? b : a));
}

/** the notes of the running feature: references to a joined chain that now point to one of its edges (a guess) */
let splitNotes: Map<EdgeRef, string> | null = null;

/** Find the edge of a body that a reference points to (after a rebuild). */
export function matchEdge(edges: BodyEdge[], ref: EdgeRef, tol: number = referenceTol(ref.length)): BodyEdge | null {
  const r = resolveRef(edges, ref, tol);
  if (!r || !('parts' in r)) return r;
  // an old reference to a joined chain, for a feature on one edge: the edge where it was clicked, else the straight
  // edge nearest the middle of the old edge (said on the feature: the choice is a guess)
  if (ref.pick) return nearestEdge(r.parts, new THREE.Vector3(...ref.pick));
  const straight = r.parts.filter((e) => e.straight);
  const e = nearestEdge(straight.length ? straight : r.parts, midpointOf(r.joined));
  const kind = e.straight ? 'straight' : 'curved';
  splitNotes?.set(ref, `now matches ${r.parts.length} edges after the SW edge split (a line, the bend and a line are separate edges); `
    + `picked the ${kind} edge nearest its old midpoint (${e.length.toFixed(2)} mm long): check the selection`);
  return e;
}

/** The edge a reference points to; an old reference to a joined tangent chain gives that chain as one edge (a path). */
export function matchEdgeChain(edges: BodyEdge[], ref: EdgeRef, tol: number = referenceTol(ref.length)): BodyEdge | null {
  const r = resolveRef(edges, ref, tol);
  return r && 'parts' in r ? r.joined : r;
}

/**
 * The edges a fillet or chamfer rounds for one reference. Tangent propagation (SW, a selection behaviour): each edge
 * with the edges tangent to it, as one chain (the edge bodyEdges gave before the SW split, so old files keep their
 * volume). Off: the edge itself; an old reference to a joined chain gives the edge where it was clicked (as subEdgeAt
 * did), or the whole chain when no click was stored.
 */
export function roundEdges(edges: BodyEdge[], ref: EdgeRef, tangent: boolean, tol: number = referenceTol(ref.length)): BodyEdge[] {
  const pieces = splitPieces(edges, ref);
  const found = pieces.length > 1 ? pieces.map((e) => alongRef(e, ref)) : null;
  if (found) return tangent ? found.map((e) => joinedOf(edges, e)) : found;
  const r = resolveRef(edges, ref, tol);
  if (!r) return [];
  if ('parts' in r) return !tangent && ref.pick ? [nearestEdge(r.parts, new THREE.Vector3(...ref.pick))] : [r.joined];
  const e = alongRef(r, ref);
  return [tangent ? joinedOf(edges, e) : e];
}

/** roundEdges for every reference of a feature, each edge once (two picks on one tangent chain), and how many are lost */
export function roundEdgeSets(edges: BodyEdge[], refs: EdgeRef[], tangent: boolean): { found: BodyEdge[][]; lost: number } {
  const all = refs.map((r) => roundEdges(edges, r, tangent));
  const seen = new Set<string>();
  return { found: all.map((x) => x.filter((e) => !seen.has(e.id) && !!seen.add(e.id))), lost: all.filter((x) => !x.length).length };
}

/** start collecting the edge split notes of one feature (the rebuild, around each feature) */
export function beginEdgeNotes(): void {
  splitNotes = new Map();
}

/** the warning of the feature for its references that now point to one edge of a split chain (null: none) */
export function endEdgeNotes(f: object): string | null {
  const notes = splitNotes;
  splitNotes = null;
  if (!notes?.size) return null;
  const x = f as { edges?: unknown; edge?: unknown; holdLine?: unknown };
  const refs = [...(Array.isArray(x.edges) ? x.edges : []), x.edge, x.holdLine].filter(Boolean) as EdgeRef[];
  const same = (a: EdgeRef, b: EdgeRef) => a === b || (a.length === b.length && a.centroid.every((v, i) => v === b.centroid[i]));
  const text = [...notes].map(([ref, msg]) => {
    const i = refs.findIndex((r) => same(r, ref));
    return `edge reference ${i >= 0 ? i + 1 : '?'}${refs.length > 1 ? ` of ${refs.length}` : ''} ${msg}`;
  });
  return `Warning: ${text.join('; ')}.`;
}

/**
 * The edges a reference points to after a rebuild. A straight edge that a feature inserted before it split into pieces
 * (a slot across it) gives all of its pieces: the edges of the same kind on the same line, with the same faces, that
 * overlap the old edge (QA v0.5.1 F111: only the nearest piece was rounded). A piece may reach beyond the old edge
 * when an earlier dimension made the part longer (QA 0.5.11 F177: plate 80 -> 100, the far piece 45-100 was left out
 * and the fillet silently rounded one piece). The same edge of another pattern instance does not overlap the old one.
 * Otherwise the one edge `matchEdge` finds.
 */
export function matchEdges(edges: BodyEdge[], ref: EdgeRef, tol: number = referenceTol(ref.length)): BodyEdge[] {
  const pieces = splitPieces(edges, ref);
  if (pieces.length > 1) return pieces.map((e) => alongRef(e, ref));
  const r = resolveRef(edges, ref, tol);
  return !r ? [] : 'parts' in r ? r.parts : [alongRef(r, ref)];
}

/**
 * A straight edge as it ran when it was picked (the direction in its reference): the mesh body and the B-rep body list
 * the points of the same edge in either order, and a Variable Size fillet put its start size at the other end on one
 * kernel (QA F172). Other edges are given as found.
 */
function alongRef(e: BodyEdge, ref: EdgeRef): BodyEdge {
  if (!ref.dir || !e.straight || e.closed || edgeDir(e).dot(new THREE.Vector3(...ref.dir)) >= 0) return e;
  return { ...e, points: e.points.slice().reverse(), segments: e.segments.slice().reverse().map((x) => ({ ...x, a: x.b, b: x.a })) };
}

function splitPieces(edges: BodyEdge[], ref: EdgeRef): BodyEdge[] {
  if (!ref.straight || ref.closed || !ref.dir) return [];
  const c = new THREE.Vector3(...ref.centroid), dir = new THREE.Vector3(...ref.dir).normalize();
  const half = ref.length / 2;
  const onLine = (q: THREE.Vector3) => { const d = q.clone().sub(c); return d.addScaledVector(dir, -d.dot(dir)).length() < 1e-3; };
  // the piece's stretch along the line overlaps the old edge by more than a hair
  const overlaps = (e: BodyEdge) => {
    const ts = e.points.map((q) => q.clone().sub(c).dot(dir));
    return Math.min(half, Math.max(...ts)) - Math.max(-half, Math.min(...ts)) > 1e-3;
  };
  const pieces = edges.filter((e) => {
    if (!e.straight || e.closed) return false;
    if (Math.abs(edgeDir(e).dot(dir)) < 0.9999 || !e.points.every(onLine) || !overlaps(e)) return false;
    if (ref.faces) {
      const f = edgeFaces(e);
      return !!f && f[0] === ref.faces[0] && f[1] === ref.faces[1];
    }
    return sameNormals(e, ref);
  });
  return pieces.length > 1 ? pieces : [];
}

/**
 * The edge moved or changed length (an earlier feature was edited): the edge of the same kind with the same direction
 * and the same two faces, nearest to where it was. Ambiguous cases (two equally near candidates) are not guessed.
 */
function matchMovedEdge(edges: BodyEdge[], ref: EdgeRef): BodyEdge | null {
  if (!ref.normals) return null;
  const c = new THREE.Vector3(...ref.centroid);
  const dir = ref.dir ? new THREE.Vector3(...ref.dir) : null;
  const cands: { e: BodyEdge; d: number }[] = [];
  for (const e of edges) {
    if (e.closed !== ref.closed || e.straight !== ref.straight) continue;
    if (dir && Math.abs(edgeDir(e).dot(dir)) < 0.999) continue;
    // a curved edge keeps its size unless its own sketch changed: allow a moderate change only
    if (!e.straight && Math.abs(e.length - ref.length) > Math.max(1, ref.length * 0.25)) continue;
    if (!sameNormals(e, ref)) continue;
    cands.push({ e, d: e.centroid.distanceTo(c) });
  }
  if (!cands.length) return null;
  cands.sort((x, y) => x.d - y.d);
  if (cands.length > 1 && cands[1].d - cands[0].d < Math.max(0.5, cands[0].d * 0.1)) return null;
  return cands[0].e;
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
