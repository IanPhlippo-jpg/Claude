import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { Body } from '../features/rebuild';

export type ViewName = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'isometric' | 'trimetric' | 'dimetric';

/** Orthographic view frame: u (screen right), v (screen up), w (toward the viewer), all world unit vectors. */
export interface ViewFrame {
  u: THREE.Vector3;
  v: THREE.Vector3;
  w: THREE.Vector3;
}

const F = (u: number[], v: number[], w: number[]): ViewFrame => ({ u: new THREE.Vector3(...u).normalize(), v: new THREE.Vector3(...v).normalize(), w: new THREE.Vector3(...w).normalize() });

/** Standard views of a Y-up model with the front toward +Z, as the original's view orientations. */
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

const key = (p: THREE.Vector3) => `${Math.round(p.x * 1e3)},${Math.round(p.y * 1e3)},${Math.round(p.z * 1e3)}`;

/** Silhouette segments of a mesh for a view direction: edges between a front- and a back-facing triangle. */
export function silhouetteSegments(g: THREE.BufferGeometry, w: THREE.Vector3): [THREE.Vector3, THREE.Vector3][] {
  const ng = g.index ? g.toNonIndexed() : g;
  const a = ng.getAttribute('position');
  const P = (i: number) => new THREE.Vector3().fromBufferAttribute(a, i);
  const edges = new Map<string, { a: THREE.Vector3; b: THREE.Vector3; front: number; back: number }>();
  for (let t = 0; t * 3 + 2 < a.count; t++) {
    const p0 = P(t * 3), p1 = P(t * 3 + 1), p2 = P(t * 3 + 2);
    const n = p1.clone().sub(p0).cross(p2.clone().sub(p0));
    if (n.lengthSq() < 1e-14) continue;
    const front = n.dot(w) > 0;
    for (const [x, y] of [[p0, p1], [p1, p2], [p2, p0]] as [THREE.Vector3, THREE.Vector3][]) {
      const kx = key(x), ky = key(y);
      const k = kx < ky ? kx + '|' + ky : ky + '|' + kx;
      const e = edges.get(k) ?? edges.set(k, { a: x, b: y, front: 0, back: 0 }).get(k)!;
      if (front) e.front++;
      else e.back++;
    }
  }
  const out: [THREE.Vector3, THREE.Vector3][] = [];
  const open: { a: THREE.Vector3; b: THREE.Vector3; front: number; back: number }[] = [];
  for (const e of edges.values()) {
    if (e.front === 1 && e.back === 1) out.push([e.a, e.b]);
    else if (e.front + e.back === 1) open.push(e);
  }
  if (!open.length) return out;
  // CSG meshes have T-junctions: an edge on one side meets several shorter edges on the other. Split the
  // unmatched edges at every vertex lying on them, then pair the pieces again.
  const pts = new Map<string, THREE.Vector3>();
  for (const e of open) {
    pts.set(key(e.a), e.a);
    pts.set(key(e.b), e.b);
  }
  const box = new THREE.Box3();
  for (const p of pts.values()) box.expandByPoint(p);
  const cell = Math.max(box.getSize(new THREE.Vector3()).length() / 64, 1e-3);
  const grid = new Map<string, THREE.Vector3[]>();
  const ck = (x: number, y: number, z: number) => `${x},${y},${z}`;
  for (const p of pts.values()) {
    const k = ck(Math.floor(p.x / cell), Math.floor(p.y / cell), Math.floor(p.z / cell));
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(p);
  }
  const pieces = new Map<string, { a: THREE.Vector3; b: THREE.Vector3; front: number; back: number }>();
  const d = new THREE.Vector3(), q = new THREE.Vector3();
  for (const e of open) {
    d.subVectors(e.b, e.a);
    const L2 = d.lengthSq();
    if (L2 < 1e-14) continue;
    const ts: { t: number; p: THREE.Vector3 }[] = [{ t: 0, p: e.a }, { t: 1, p: e.b }];
    const lo = new THREE.Vector3().copy(e.a).min(e.b), hi = new THREE.Vector3().copy(e.a).max(e.b);
    for (let x = Math.floor(lo.x / cell); x <= Math.floor(hi.x / cell); x++)
      for (let y = Math.floor(lo.y / cell); y <= Math.floor(hi.y / cell); y++)
        for (let z = Math.floor(lo.z / cell); z <= Math.floor(hi.z / cell); z++) {
          for (const p of grid.get(ck(x, y, z)) ?? []) {
            const t = q.subVectors(p, e.a).dot(d) / L2;
            if (t <= 1e-6 || t >= 1 - 1e-6) continue;
            const foot = e.a.clone().addScaledVector(d, t);
            if (foot.distanceToSquared(p) < 1e-8) ts.push({ t, p });
          }
        }
    ts.sort((u, v) => u.t - v.t);
    for (let i = 0; i + 1 < ts.length; i++) {
      const x = ts[i].p, y = ts[i + 1].p;
      const kx = key(x), ky = key(y);
      if (kx === ky) continue;
      const k = kx < ky ? kx + '|' + ky : ky + '|' + kx;
      const pc = pieces.get(k) ?? pieces.set(k, { a: x, b: y, front: 0, back: 0 }).get(k)!;
      pc.front += e.front;
      pc.back += e.back;
    }
  }
  for (const pc of pieces.values()) if (pc.front >= 1 && pc.back >= 1) out.push([pc.a, pc.b]);
  return out;
}

/**
 * Project the bodies into a view: feature edges and silhouettes, each split into visible and
 * hidden runs by sampling against the meshes (BVH raycasts along the view direction).
 */
export function projectView(bodies: Body[], frame: ViewFrame, sampleStep = 0.75): View2D {
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
  const emitSegment = (a: THREE.Vector3, b: THREE.Vector3, silhouette: boolean) => {
    const len = a.distanceTo(b);
    if (len < 1e-6) return;
    // an edge seen exactly edge-on projects to a point: skip
    const a2 = to2(a), b2 = to2(b);
    if (Math.hypot(b2[0] - a2[0], b2[1] - a2[1]) < 1e-4) return;
    const n = Math.max(2, Math.ceil(len / sampleStep) + 1);
    // offset the samples slightly toward the viewer so an edge on a face is not occluded by that face
    const lift = frame.w.clone().multiplyScalar(eps * 0.6);
    let runStart = 0, runVisible: boolean | null = null;
    const flush = (endIdx: number, vis: boolean) => {
      const t0 = runStart / (n - 1), t1 = endIdx / (n - 1);
      const pa = a.clone().lerp(b, t0), pb = a.clone().lerp(b, t1);
      const la = to2(pa), lb = to2(pb);
      lines.push({ a: la, b: lb, hidden: !vis, silhouette });
      grow(la); grow(lb);
    };
    for (let i = 0; i < n; i++) {
      const p = a.clone().lerp(b, i / (n - 1)).add(lift);
      const vis = visibleAt(p);
      if (runVisible === null) { runVisible = vis; runStart = 0; continue; }
      if (vis !== runVisible) {
        flush(i - 0.5, runVisible);
        runStart = i - 0.5;
        runVisible = vis;
      }
    }
    flush(n - 1, runVisible ?? true);
  };
  const circles: Circle2D[] = [];
  for (const b of bodies) {
    for (const e of b.edges) {
      // a closed non-straight edge is a circle when its plane faces the viewer: keep it as a circle for center marks / diameters
      if (e.closed && !e.straight && e.points.length > 6) {
        const c = e.centroid;
        const r = e.points.reduce((s, p) => s + p.distanceTo(c), 0) / e.points.length;
        const n = e.points[1].clone().sub(e.points[0]).cross(e.points[2].clone().sub(e.points[0])).normalize();
        if (Math.abs(n.dot(frame.w)) > 0.999) {
          // visible when the midpoints of a few samples are visible
          const probes = [0, Math.floor(e.points.length / 3), Math.floor((2 * e.points.length) / 3)].map((i) => visibleAt(e.points[i].clone().addScaledVector(frame.w, eps * 0.6)));
          circles.push({ c: to2(c), r, hidden: !probes.some(Boolean), axis: [n.x, n.y, n.z] });
        }
      }
      for (let i = 0; i + 1 < e.points.length; i++) emitSegment(e.points[i], e.points[i + 1], false);
      if (e.closed && e.points.length > 2) emitSegment(e.points[e.points.length - 1], e.points[0], false);
    }
    for (const [p, q] of silhouetteSegments(b.geometry, frame.w)) emitSegment(p, q, true);
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
        if (used[j] || lines[j].hidden !== base.hidden) continue;
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
 * removed (the original draws no hidden line under a visible one).
 */
export function cleanLines(lines: Line2D[], tol = 0.05): Line2D[] {
  const merged = mergeLines(lines);
  const visible = merged.filter((l) => !l.hidden);
  const out: Line2D[] = [...visible];
  for (const h of merged.filter((l) => l.hidden)) {
    const dx = h.b[0] - h.a[0], dy = h.b[1] - h.a[1], len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const d: [number, number] = [dx / len, dy / len];
    const along = (p: [number, number]) => (p[0] - h.a[0]) * d[0] + (p[1] - h.a[1]) * d[1];
    const offLine = (p: [number, number]) => Math.abs((p[0] - h.a[0]) * d[1] - (p[1] - h.a[1]) * d[0]);
    // spans of the hidden line still uncovered by visible collinear lines
    let spans: [number, number][] = [[0, len]];
    for (const v of visible) {
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
    for (const [a, b] of spans) if (b - a > tol) out.push({ ...h, a: [h.a[0] + d[0] * a, h.a[1] + d[1] * a], b: [h.a[0] + d[0] * b, h.a[1] + d[1] * b] });
  }
  return out;
}
