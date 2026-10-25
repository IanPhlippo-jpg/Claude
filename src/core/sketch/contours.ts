import type { Id, Sketch, SketchPoint } from './types';
import { entityLoops, sampleEntity } from './geometry';

/**
 * Closed-contour detection for "shaded sketch contours": builds a planar
 * graph from lines/arcs (points merged through coincident relations and shared
 * ids), walks the faces with the classic smallest-turn rule and returns every
 * bounded face as a polygon. Circles are faces on their own.
 */
export interface Contour {
  /** polygon in sketch coordinates */
  points: SketchPoint[];
  area: number;
  entityIds: Id[];
}

class DSU {
  private p = new Map<Id, Id>();
  find(a: Id): Id {
    let r = a;
    while (this.p.has(r) && this.p.get(r) !== r) r = this.p.get(r)!;
    // path compression
    let x = a;
    while (this.p.has(x) && this.p.get(x) !== r) {
      const n = this.p.get(x)!;
      this.p.set(x, r);
      x = n;
    }
    return r;
  }
  union(a: Id, b: Id): void {
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.p.set(ra, rb);
  }
}

interface Edge {
  id: Id;
  a: Id;
  b: Id;
  /** polyline from a to b (sketch coords) */
  poly: SketchPoint[];
}

function polygonArea(pts: SketchPoint[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}

export function findContours(s: Sketch, tol = 1e-6): Contour[] {
  const out: Contour[] = [];
  const dsu = new DSU();
  for (const cid of s.constraintOrder) {
    const c = s.constraints[cid];
    if (c.kind === 'coincident') {
      const ids = c.refs.map((r) => (r in s.points ? r : (s.entities[r] as { p?: Id } | undefined)?.p)).filter(Boolean) as Id[];
      if (ids.length === 2) dsu.union(ids[0], ids[1]);
    }
  }
  // also merge points that sit at the same position (snapped without relation)
  const byPos = new Map<string, Id>();
  for (const [id, p] of Object.entries(s.points)) {
    const key = `${Math.round(p.x / tol)},${Math.round(p.y / tol)}`;
    const other = byPos.get(key);
    if (other) dsu.union(id, other);
    else byPos.set(key, id);
  }

  const edges: Edge[] = [];
  for (const eid of s.entityOrder) {
    const e = s.entities[eid];
    if (e.construction) continue;
    if (e.kind === 'circle' || e.kind === 'ellipse') {
      const poly = sampleEntity(s, e, 64).slice(0, -1);
      out.push({ points: poly, area: Math.abs(polygonArea(poly)), entityIds: [eid] });
    } else if (e.kind === 'text') {
      // every glyph outline and counter (the hole of an O) is a closed contour; nesting makes the holes
      for (const loop of entityLoops(s, e)) {
        const poly = loop.slice(0, -1);
        if (poly.length >= 3) out.push({ points: poly, area: Math.abs(polygonArea(poly)), entityIds: [eid] });
      }
    } else if (e.kind === 'line') {
      edges.push({ id: eid, a: dsu.find(e.p1), b: dsu.find(e.p2), poly: [s.points[e.p1], s.points[e.p2]] });
    } else if (e.kind === 'arc' || e.kind === 'ellipseArc' || e.kind === 'conic') {
      edges.push({ id: eid, a: dsu.find(e.start), b: dsu.find(e.end), poly: sampleEntity(s, e, 64) });
    } else if (e.kind === 'spline' && e.points.length >= 2) {
      const a = dsu.find(e.points[0]), b = dsu.find(e.points[e.points.length - 1]);
      const poly = sampleEntity(s, e, 64);
      // a spline closed on itself is a contour of its own
      if (a === b) out.push({ points: poly.slice(0, -1), area: Math.abs(polygonArea(poly.slice(0, -1))), entityIds: [eid] });
      else edges.push({ id: eid, a, b, poly });
    }
  }
  // half-edges
  interface Half {
    edge: Edge;
    from: Id;
    to: Id;
    poly: SketchPoint[];
    angleOut: number;
    angleIn: number;
    twin: number;
    used: boolean;
  }
  const halves: Half[] = [];
  const outgoing = new Map<Id, number[]>();
  const ang = (p: SketchPoint, q: SketchPoint) => Math.atan2(q.y - p.y, q.x - p.x);
  for (const e of edges) {
    if (e.a === e.b) continue;
    const fwd = e.poly, rev = e.poly.slice().reverse();
    const i = halves.length;
    halves.push({ edge: e, from: e.a, to: e.b, poly: fwd, angleOut: ang(fwd[0], fwd[1]), angleIn: ang(fwd[fwd.length - 2], fwd[fwd.length - 1]), twin: i + 1, used: false });
    halves.push({ edge: e, from: e.b, to: e.a, poly: rev, angleOut: ang(rev[0], rev[1]), angleIn: ang(rev[rev.length - 2], rev[rev.length - 1]), twin: i, used: false });
    (outgoing.get(e.a) ?? outgoing.set(e.a, []).get(e.a)!).push(i);
    (outgoing.get(e.b) ?? outgoing.set(e.b, []).get(e.b)!).push(i + 1);
  }
  for (let start = 0; start < halves.length; start++) {
    if (halves[start].used) continue;
    const face: number[] = [];
    let cur = start;
    let guard = 0;
    while (!halves[cur].used && guard++ < halves.length + 1) {
      halves[cur].used = true;
      face.push(cur);
      const h = halves[cur];
      const cands = (outgoing.get(h.to) ?? []).filter((i) => i !== h.twin);
      if (!cands.length) {
        // dead end (dangling edge): walk back along the twin
        cur = h.twin;
        if (cur === start) break;
        continue;
      }
      // next = the outgoing edge with the smallest clockwise turn from the incoming direction (keeps face on the left)
      const inDir = h.angleIn + Math.PI;
      let best = -1, bestTurn = Infinity;
      for (const i of cands) {
        let turn = halves[i].angleOut - inDir;
        while (turn <= 0) turn += Math.PI * 2;
        while (turn > Math.PI * 2) turn -= Math.PI * 2;
        if (turn < bestTurn) {
          bestTurn = turn;
          best = i;
        }
      }
      cur = best;
      if (cur === start) break;
    }
    if (cur !== start) continue; // open chain, not a loop
    let pts: SketchPoint[] = [];
    for (const i of face) pts.push(...halves[i].poly.slice(0, -1));
    // remove spurs (out-and-back runs) so the polygon is simple
    const same = (a: SketchPoint, b: SketchPoint) => Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol;
    let changed = true;
    while (changed && pts.length > 3) {
      changed = false;
      for (let i = 0; i < pts.length; i++) {
        const prev = pts[(i - 1 + pts.length) % pts.length], next = pts[(i + 1) % pts.length];
        if (same(prev, next)) {
          const j = (i + 1) % pts.length;
          pts = pts.filter((_, k) => k !== i && k !== j);
          changed = true;
          break;
        }
      }
    }
    const area = polygonArea(pts);
    if (area > tol) out.push({ points: pts, area, entityIds: [...new Set(face.map((i) => halves[i].edge.id))] });
  }
  return out;
}
