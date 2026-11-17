import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { Body } from '../features/rebuild';
import { silhouettePieces, tangentSegments } from './meshEdges';

export type ViewName = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'isometric' | 'trimetric' | 'dimetric';

/** Orthographic view frame: u (screen right), v (screen up), w (toward the viewer), all world unit vectors. */
export interface ViewFrame {
  u: THREE.Vector3;
  v: THREE.Vector3;
  w: THREE.Vector3;
}

const F = (u: number[], v: number[], w: number[]): ViewFrame => ({ u: new THREE.Vector3(...u).normalize(), v: new THREE.Vector3(...v).normalize(), w: new THREE.Vector3(...w).normalize() });

/** Standard views of a Y-up model with the front toward +Z, as the intended view orientations. */
export function viewFrame(name: ViewName): ViewFrame {
  switch (name) {
    case 'front': return F([1, 0, 0], [0, 1, 0], [0, 0, 1]);
    case 'back': return F([-1, 0, 0], [0, 1, 0], [0, 0, -1]);
    case 'top': return F([1, 0, 0], [0, 0, -1], [0, 1, 0]);
    case 'bottom': return F([1, 0, 0], [0, 0, 1], [0, -1, 0]);
    case 'right': return F([0, 0, -1], [0, 1, 0], [1, 0, 0]);
    case 'left': return F([0, 0, 1], [0, 1, 0], [-1, 0, 0]);
    case 'isometric':
    case 'dimetric':
    case 'trimetric': {
      const w = name === 'isometric' ? new THREE.Vector3(1, 1, 1) : name === 'dimetric' ? new THREE.Vector3(1, 0.6, 1) : new THREE.Vector3(0.9, 0.7, 1.3);
      w.normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const u = up.clone().cross(w).normalize();
      const v = w.clone().cross(u).normalize();
      return { u, v, w };
    }
  }
}

export interface Line2D {
  a: [number, number];
  b: [number, number];
  hidden: boolean;
  /** silhouette of a curved surface (drawn like a visible edge) */
  silhouette?: boolean;
  /** cosmetic thread (thin, dashed for an internal thread as ANSI; shown in every display style) */
  cosmetic?: boolean;
  /** a bend line of a flat pattern (phantom line) with its bend note */
  bend?: boolean;
  note?: string;
  /** a tangent edge: where two faces meet smoothly (drawn as the view's Tangent Edge setting says) */
  tangent?: boolean;
}

export interface Circle2D {
  c: [number, number];
  r: number;
  hidden: boolean;
  /** the edge appears as a circle only when its plane faces the viewer */
  axis: [number, number, number];
}

export interface View2D {
  lines: Line2D[];
  circles: Circle2D[];
  /** bounds in view units (mm) */
  min: [number, number];
  max: [number, number];
}

/**
 * The circle a polyline lies on (centre, radius, unit normal, the angle it sweeps), or null: a circle through three
 * of its points, spread along it, that every point lies on within a hundredth (and in its plane).
 */
export function circleFit(pts: THREE.Vector3[]): { c: THREE.Vector3; r: number; n: THREE.Vector3; sweep: number } | null {
  const a = pts[0], b = pts[Math.floor(pts.length / 3)], d = pts[Math.floor((2 * pts.length) / 3)];
  const ab = b.clone().sub(a), ad = d.clone().sub(a);
  const n = ab.clone().cross(ad);
  if (n.lengthSq() < 1e-12) return null;
  const toC = n.clone().cross(ab).multiplyScalar(ad.lengthSq()).add(ad.clone().cross(n).multiplyScalar(ab.lengthSq())).divideScalar(2 * n.lengthSq());
  const c = a.clone().add(toC), r = toC.length();
  n.normalize();
  if (r > 1e4) return null;
  const tol = Math.max(0.01, r * 0.002);
  let sweep = 0;
  for (let i = 0; i < pts.length; i++) {
    if (Math.abs(pts[i].distanceTo(c) - r) > tol || Math.abs(pts[i].clone().sub(c).dot(n)) > tol) return null;
    if (i) sweep += pts[i - 1].clone().sub(c).angleTo(pts[i].clone().sub(c));
  }
  return { c, r, n, sweep };
}

const COS_FACET = Math.cos((40 * Math.PI) / 180);
/** an edge between facets of the same named face, bent less than a facet of a coarse curved face is */
export const facetEdge = (e: Body['edges'][number]): boolean => e.segments.length > 0 && e.segments.every((s) => !!s.f1 && s.f1 === s.f2 && s.n1.dot(s.n2) > COS_FACET);

/** Silhouette segments of a mesh for a view direction: edges between a front- and a back-facing triangle. */
export function silhouetteSegments(g: THREE.BufferGeometry, w: THREE.Vector3): [THREE.Vector3, THREE.Vector3][] {
  return silhouettePieces(g, w);
}

/**
 * Project the bodies into a view: feature edges and silhouettes, each split into visible and
 * hidden runs by sampling against the meshes (BVH raycasts along the view direction). Where the visibility changes
 * between two samples the boundary is found by bisection, so an edge that runs behind an occluding face is split
 * where that face's outline crosses it (not half a sample step away). `tangent`: also the tangent edges.
 */
export function projectView(bodies: Body[], frame: ViewFrame, sampleStep = 0.75, opts: { tangent?: boolean } = {}): View2D {
  const geoms = bodies.map((b) => (b.geometry.index ? b.geometry.toNonIndexed() : b.geometry));
  const bvhs = geoms.map((g) => ({ g, bvh: new MeshBVH(g) }));
  // depth range for the ray origin
  const box = new THREE.Box3();
  for (const g of geoms) {
    g.computeBoundingBox();
    if (g.boundingBox) box.union(g.boundingBox);
  }
  const far = box.isEmpty() ? 1000 : box.getSize(new THREE.Vector3()).length() * 2 + 10;
  const ray = new THREE.Ray();
  const dirBack = frame.w.clone().negate();
  const eps = 0.05;
  const visibleAt = (p: THREE.Vector3): boolean => {
    ray.origin.copy(p).addScaledVector(frame.w, far);
    ray.direction.copy(dirBack);
    let nearest = Infinity;
    for (const { bvh } of bvhs) {
      const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
      if (hit && hit.distance < nearest) nearest = hit.distance;
    }
    // the point itself is at distance `far` along the ray: visible when nothing lies clearly in front of it
    return nearest === Infinity || nearest > far - eps;
  };
  const to2 = (p: THREE.Vector3): [number, number] => [p.dot(frame.u), p.dot(frame.v)];
  const lines: Line2D[] = [];
  const min: [number, number] = [Infinity, Infinity], max: [number, number] = [-Infinity, -Infinity];
  const grow = (q: [number, number]) => {
    min[0] = Math.min(min[0], q[0]); min[1] = Math.min(min[1], q[1]);
    max[0] = Math.max(max[0], q[0]); max[1] = Math.max(max[1], q[1]);
  };
  // offset the samples slightly toward the viewer so an edge on a face is not occluded by that face
  const lift = frame.w.clone().multiplyScalar(eps * 0.6);
  const emitSegment = (a: THREE.Vector3, b: THREE.Vector3, silhouette: boolean, tangent = false) => {
    const len = a.distanceTo(b);
    if (len < 1e-6) return;
    // an edge seen exactly edge-on projects to a point: skip
    const a2 = to2(a), b2 = to2(b);
    if (Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) < 1e-4) return;
    const n = Math.max(2, Math.ceil(len / sampleStep) + 1);
    const visAt = (t: number) => visibleAt(a.clone().lerp(b, t).add(lift));
    const flush = (t0: number, t1: number, vis: boolean) => {
      const la = to2(a.clone().lerp(b, t0)), lb = to2(a.clone().lerp(b, t1));
      lines.push(tangent ? { a: la, b: lb, hidden: !vis, tangent } : { a: la, b: lb, hidden: !vis, silhouette });
      grow(la); grow(lb);
    };
    let runStart = 0, runVisible = visAt(0), prev = 0;
    for (let i = 1; i < n; i++) {
      const t = i / (n - 1);
      const vis = visAt(t);
      if (vis !== runVisible) {
        // the boundary lies between the two samples: halve the interval down to about a micron
        let lo = prev, hi = t;
        for (let k = 0; k < 24 && (hi - lo) * len > 5e-4; k++) {
          const mid = (lo + hi) / 2;
          if (visAt(mid) === runVisible) lo = mid;
          else hi = mid;
        }
        const cut = (lo + hi) / 2;
        flush(runStart, cut, runVisible);
        runStart = cut;
        runVisible = vis;
      }
      prev = t;
    }
    flush(runStart, 1, runVisible);
  };
  const circles: Circle2D[] = [];
  for (const b of bodies) {
    // pieces of circles (a boolean can leave a hole's rim as two half arcs, or tessellated unevenly): one circle per
    // centre, radius and depth once the pieces go all the way round
    const parts: { c: THREE.Vector3; r: number; n: THREE.Vector3; sweep: number; probes: THREE.Vector3[] }[] = [];
    const same = (c: THREE.Vector3, r: number, c2: THREE.Vector3, r2: number) => c.distanceTo(c2) < Math.max(0.1, r * 0.02) && Math.abs(r - r2) < Math.max(0.1, r * 0.02);
    for (const e of b.edges) {
      // a crease between two facets of one curved face (a coarse cylinder, a hole whose boolean left a wide facet) is
      // no model edge: the face shows by its silhouette only
      if (facetEdge(e)) continue;
      // a closed non-straight edge is a circle when its plane faces the viewer: keep it as a circle for center marks / diameters
      if (e.closed && !e.straight && e.points.length > 6) {
        const c = e.centroid;
        const r = e.points.reduce((s, p) => s + p.distanceTo(c), 0) / e.points.length;
        const n = e.points[1].clone().sub(e.points[0]).cross(e.points[2].clone().sub(e.points[0])).normalize();
        // only a real circle: a closed tangent loop (a rounded rectangle, a slot) is not one, however smooth it is
        const rond = e.points.every((p) => Math.abs(p.distanceTo(c) - r) <= Math.max(0.01, r * 0.002));
        if (rond && Math.abs(n.dot(frame.w)) > 0.999) {
          // visible when the midpoints of a few samples are visible
          const probes = [0, Math.floor(e.points.length / 3), Math.floor((2 * e.points.length) / 3)].map((i) => visibleAt(e.points[i].clone().addScaledVector(frame.w, eps * 0.6)));
          circles.push({ c: to2(c), r, hidden: !probes.some(Boolean), axis: [n.x, n.y, n.z] });
          parts.push({ c, r, n, sweep: -Infinity, probes: [] });
          for (let i = 0; i + 1 < e.points.length; i++) emitSegment(e.points[i], e.points[i + 1], false);
          emitSegment(e.points[e.points.length - 1], e.points[0], false);
          continue;
        }
      }
      const k = !e.straight && e.points.length >= (e.closed ? 7 : 4) ? circleFit(e.points) : null;
      if (k && Math.abs(k.n.dot(frame.w)) > 0.999) {
        let g = parts.find((x) => same(x.c, x.r, k.c, k.r));
        if (!g) parts.push((g = { c: k.c, r: k.r, n: k.n, sweep: 0, probes: [] }));
        g.sweep += e.closed ? 2 * Math.PI : k.sweep;
        g.probes.push(...[0, Math.floor(e.points.length / 2), e.points.length - 1].map((i) => e.points[i]));
      }
      for (let i = 0; i + 1 < e.points.length; i++) emitSegment(e.points[i], e.points[i + 1], false);
      if (e.closed && e.points.length > 2) emitSegment(e.points[e.points.length - 1], e.points[0], false);
    }
    // (a closed round edge was a circle already: its entry has no sweep and takes no pieces into a second circle)
    for (const g of parts) {
      if (g.sweep < 2 * Math.PI - 0.1) continue;
      const hidden = !g.probes.some((p) => visibleAt(p.clone().addScaledVector(frame.w, eps * 0.6)));
      circles.push({ c: to2(g.c), r: g.r, hidden, axis: [g.n.x, g.n.y, g.n.z] });
    }
    for (const [p, q] of silhouetteSegments(b.geometry, frame.w)) emitSegment(p, q, true);
    if (opts.tangent) for (const [p, q] of tangentSegments(b.geometry)) emitSegment(p, q, false, true);
  }
  if (!lines.length) return { lines, circles, min: [0, 0], max: [0, 0] };
  return { lines, circles, min, max };
}

/** Merge collinear pieces with the same visibility into one line per span (duplicates and overlaps collapse). */
export function mergeLines(lines: Line2D[], tol = 0.02): Line2D[] {
  const out: Line2D[] = [];
  const used = new Array(lines.length).fill(false);
  const dirOf = (l: Line2D): [number, number] => {
    const dx = l.b[0] - l.a[0], dy = l.b[1] - l.a[1], len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  };
  for (let i = 0; i < lines.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const base = lines[i];
    const d = dirOf(base);
    const origin = base.a;
    const along = (p: [number, number]) => (p[0] - origin[0]) * d[0] + (p[1] - origin[1]) * d[1];
    const offLine = (p: [number, number]) => Math.abs((p[0] - origin[0]) * d[1] - (p[1] - origin[1]) * d[0]);
    // spans along the line, merged while they touch or overlap
    const spans: [number, number][] = [[Math.min(along(base.a), along(base.b)), Math.max(along(base.a), along(base.b))]];
    let grown = true;
    while (grown) {
      grown = false;
      for (let j = 0; j < lines.length; j++) {
        if (used[j] || lines[j].hidden !== base.hidden || !lines[j].tangent !== !base.tangent) continue;
        const e = dirOf(lines[j]);
        if (Math.abs(d[0] * e[0] + d[1] * e[1]) < 0.9999) continue;
        if (offLine(lines[j].a) > tol || offLine(lines[j].b) > tol) continue;
        const lo = Math.min(along(lines[j].a), along(lines[j].b)), hi = Math.max(along(lines[j].a), along(lines[j].b));
        const k = spans.findIndex(([a, b]) => lo <= b + tol && hi >= a - tol);
        if (k < 0) continue;
        spans[k] = [Math.min(spans[k][0], lo), Math.max(spans[k][1], hi)];
        used[j] = true;
        grown = true;
        // spans may now touch each other
        for (let m = spans.length - 1; m > 0; m--) {
          for (let q = 0; q < m; q++) {
            if (spans[m][0] <= spans[q][1] + tol && spans[m][1] >= spans[q][0] - tol) {
              spans[q] = [Math.min(spans[q][0], spans[m][0]), Math.max(spans[q][1], spans[m][1])];
              spans.splice(m, 1);
              break;
            }
          }
        }
      }
    }
    for (const [lo, hi] of spans) {
      if (hi - lo < 1e-6) continue;
      out.push({ ...base, a: [origin[0] + d[0] * lo, origin[1] + d[1] * lo], b: [origin[0] + d[0] * hi, origin[1] + d[1] * hi] });
    }
  }
  return out;
}

/**
 * Lines ready to draw: merged per span, and hidden lines that coincide with a visible line are
 * removed (the intended design draws no hidden line under a visible one); a tangent edge that runs along a model
 * edge or a silhouette (a fillet seen from the side: its tangent edge is the outline) is drawn once, as that edge.
 */
export function cleanLines(lines: Line2D[], tol = 0.05): Line2D[] {
  const merged = dropTwins(mergeLines(lines).filter((l) => Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]) > 1e-3));
  const visible = merged.filter((l) => !l.hidden);
  const solid = visible.filter((l) => !l.tangent);
  const out: Line2D[] = [...solid];
  for (const h of merged) {
    if (!h.hidden && !h.tangent) continue;
    for (const [a, b] of uncovered(h, h.hidden ? visible : solid, tol)) out.push({ ...h, a, b });
  }
  return out;
}

/**
 * A faceted curved face (and the slivers a boolean leaves on it) can turn from facing the viewer to facing away more
 * than once within a tenth of a millimetre: several silhouette lines side by side where the face has one. A
 * silhouette alongside a longer one of the same kind, less than 0.2 mm off and within its span, is that one.
 */
function dropTwins(ls: Line2D[], off = 0.2): Line2D[] {
  const L = (l: Line2D) => Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]);
  // the kept silhouettes by direction (0.02 rad) and distance from the origin (0.5 mm): a twin lies in a neighbour cell
  const N = Math.ceil(Math.PI / 0.02);
  const cells = new Map<string, Line2D[]>();
  const place = (l: Line2D): [number, number] => {
    let t = Math.atan2(l.b[1] - l.a[1], l.b[0] - l.a[0]);
    if (t < 0) t += Math.PI;
    if (t >= Math.PI) t -= Math.PI;
    return [Math.min(N - 1, Math.floor(t / 0.02)), -l.a[0] * Math.sin(t) + l.a[1] * Math.cos(t)];
  };
  const isTwin = (l: Line2D, k: Line2D) => {
    if (k.hidden !== l.hidden) return false;
    const len = L(k), d: [number, number] = [(k.b[0] - k.a[0]) / len, (k.b[1] - k.a[1]) / len];
    const along = (p: [number, number]) => (p[0] - k.a[0]) * d[0] + (p[1] - k.a[1]) * d[1];
    const offLine = (p: [number, number]) => Math.abs((p[0] - k.a[0]) * d[1] - (p[1] - k.a[1]) * d[0]);
    return offLine(l.a) < off && offLine(l.b) < off && Math.min(along(l.a), along(l.b)) > -off && Math.max(along(l.a), along(l.b)) < len + off;
  };
  const out = new Set<Line2D>();
  for (const l of [...ls].sort((p, q) => L(q) - L(p))) {
    if (!l.silhouette) { out.add(l); continue; }
    const [t, o] = place(l);
    let twin = false;
    for (let dt = -1; dt <= 1 && !twin; dt++) {
      // across the wrap of the direction the distance changes sign
      const ti = (t + dt + N) % N, oo = t + dt < 0 || t + dt >= N ? -o : o;
      for (let k = -1; k <= 1 && !twin; k++) twin = (cells.get(`${ti}|${Math.round(oo / 0.5) + k}`) ?? []).some((x) => isTwin(l, x));
    }
    if (twin) continue;
    const key = `${t}|${Math.round(o / 0.5)}`;
    (cells.get(key) ?? cells.set(key, []).get(key)!).push(l);
    out.add(l);
  }
  // the order of the input stays (callers and tests read the lines in projection order)
  return ls.filter((l) => out.has(l));
}

/** the spans of a line that no collinear line of the cover runs along */
function uncovered(h: Line2D, cover: Line2D[], tol: number): [[number, number], [number, number]][] {
  const dx = h.b[0] - h.a[0], dy = h.b[1] - h.a[1], len = Math.hypot(dx, dy);
  if (len < 1e-6) return [];
  const d: [number, number] = [dx / len, dy / len];
  const along = (p: [number, number]) => (p[0] - h.a[0]) * d[0] + (p[1] - h.a[1]) * d[1];
  const offLine = (p: [number, number]) => Math.abs((p[0] - h.a[0]) * d[1] - (p[1] - h.a[1]) * d[0]);
  let spans: [number, number][] = [[0, len]];
  for (const v of cover) {
    const vx = v.b[0] - v.a[0], vy = v.b[1] - v.a[1], vl = Math.hypot(vx, vy) || 1;
    if (Math.abs((vx / vl) * d[0] + (vy / vl) * d[1]) < 0.9999) continue;
    if (offLine(v.a) > tol || offLine(v.b) > tol) continue;
    const lo = Math.min(along(v.a), along(v.b)) - tol, hi = Math.max(along(v.a), along(v.b)) + tol;
    const next: [number, number][] = [];
    for (const [a, b] of spans) {
      if (hi <= a || lo >= b) { next.push([a, b]); continue; }
      if (lo > a) next.push([a, lo]);
      if (hi < b) next.push([hi, b]);
    }
    spans = next;
  }
  return spans.filter(([a, b]) => b - a > tol).map(([a, b]) => [[h.a[0] + d[0] * a, h.a[1] + d[1] * a], [h.a[0] + d[0] * b, h.a[1] + d[1] * b]]);
}
