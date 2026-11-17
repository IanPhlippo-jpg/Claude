import * as THREE from 'three';
import type { Document, DrawingViewType } from '../document/types';
import { circleFit, facetEdge, viewFrame } from './hlr';
import { modelBodies } from './sheet';

type P = [number, number];

/** A circular arc of a model edge seen end-on (its plane faces the viewer), in view coordinates. */
export interface Arc2D {
  c: P;
  r: number;
  /** signed sweep (radians) */
  sweep: number;
  /** the point halfway along the arc */
  mid: P;
}

/** A slot outline (two half circles joined by two lines) seen end-on: the two arc centres. */
export interface Slot2D {
  c1: P;
  c2: P;
  r: number;
  mids: [P, P];
}

/** A full circle edge seen side-on (a cylinder or hole across the view): its centre and axis in the view. */
export interface AxisCircle2D {
  c: P;
  dir: P;
  r: number;
}

type Prim = { kind: 'line'; a: P; b: P } | ({ kind: 'arc' } & Arc2D);

const dist = (a: P, b: P) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

function circleThrough(a: P, b: P, c: P): { c: P; r: number } | null {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-9) return null;
  const s = (p: P) => p[0] * p[0] + p[1] * p[1];
  const x = (s(a) * (b[1] - c[1]) + s(b) * (c[1] - a[1]) + s(c) * (a[1] - b[1])) / d;
  const y = (s(a) * (c[0] - b[0]) + s(b) * (a[0] - c[0]) + s(c) * (b[0] - a[0])) / d;
  return { c: [x, y], r: dist([x, y], a) };
}

/**
 * Points i..j on one circle, turning one way, no step wider than 30° (a polygon corner is no arc) and the chords of a
 * tessellated arc: about equally long (a straight side running into an arc is no part of it).
 */
function fitArc(pts: P[], i: number, j: number): Arc2D | null {
  const k = circleThrough(pts[i], pts[(i + j) >> 1], pts[j]);
  if (!k || k.r > 1e4) return null;
  const tol = 0.005 + Math.min(k.r, 50) * 0.001;
  let lo = Infinity, hi = 0;
  let sweep = 0, sign = 0;
  for (let q = i; q <= j; q++) {
    if (Math.abs(dist(pts[q], k.c) - k.r) > tol) return null;
    if (q === i) continue;
    const ch = dist(pts[q - 1], pts[q]);
    lo = Math.min(lo, ch);
    hi = Math.max(hi, ch);
    if (hi > 3 * lo) return null;
    const a0 = Math.atan2(pts[q - 1][1] - k.c[1], pts[q - 1][0] - k.c[0]), a1 = Math.atan2(pts[q][1] - k.c[1], pts[q][0] - k.c[0]);
    let da = a1 - a0;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    if (Math.abs(da) > Math.PI / 6 || Math.abs(da) < 1e-9) return null;
    const s = Math.sign(da);
    if (sign && s !== sign) return null;
    sign = s;
    sweep += da;
  }
  const a0 = Math.atan2(pts[i][1] - k.c[1], pts[i][0] - k.c[0]) + sweep / 2;
  return { c: k.c, r: k.r, sweep, mid: [k.c[0] + k.r * Math.cos(a0), k.c[1] + k.r * Math.sin(a0)] };
}

const collinear = (pts: P[], i: number, j: number) => {
  const L = dist(pts[i], pts[j]);
  if (L < 1e-9) return false;
  for (let q = i + 1; q < j; q++) if (Math.abs(cross(pts[i], pts[j], pts[q])) / L > 0.005) return false;
  return true;
};

/** A polyline split into straight runs and circular arcs (greedy: the longer of the two at each point). */
export function decompose(points: P[], closed: boolean): Prim[] {
  let pts = points.filter((p, i) => i === 0 || dist(p, points[i - 1]) > 1e-6);
  if (closed && pts.length > 2) {
    // start at the longest segment: in a slot or a rounded outline that is a straight side, so no arc is cut in two
    let best = 0, bl = -1;
    for (let i = 0; i < pts.length; i++) {
      const L = dist(pts[i], pts[(i + 1) % pts.length]);
      if (L > bl) { bl = L; best = i; }
    }
    pts = [...pts.slice(best), ...pts.slice(0, best), pts[best]];
  }
  const out: Prim[] = [];
  let i = 0;
  while (i < pts.length - 1) {
    let jArc = -1, arc: Arc2D | null = null;
    for (let j = i + 3; j < pts.length; j++) {
      const f = fitArc(pts, i, j);
      if (!f) break;
      jArc = j;
      arc = f;
    }
    let jLine = i + 1;
    while (jLine + 1 < pts.length && collinear(pts, i, jLine + 1)) jLine++;
    if (arc && jArc > jLine) {
      out.push({ kind: 'arc', ...arc });
      i = jArc;
    } else {
      out.push({ kind: 'line', a: pts[i], b: pts[jLine] });
      i = jLine;
    }
  }
  return out;
}

/**
 * Arcs of one outline that belong together: a sliver of a line on an arc's circle next to it (a chord a boolean left)
 * is part of that arc, and neighbours on the same circle become one arc (round a closed outline, also the last and
 * the first; an open outline that ends where it starts counts as closed).
 */
export function mergeArcs(prims: Prim[], closed: boolean): Prim[] {
  const sameCircle = (a: Arc2D, b: Arc2D) => dist(a.c, b.c) < Math.max(0.1, a.r * 0.02) && Math.abs(a.r - b.r) < Math.max(0.1, a.r * 0.02);
  const join = (a: Arc2D, b: Arc2D, gap = 0): Arc2D => {
    const sweep = a.sweep + b.sweep + Math.sign(a.sweep) * gap;
    const a0 = Math.atan2(a.mid[1] - a.c[1], a.mid[0] - a.c[0]) - a.sweep / 2 + sweep / 2;
    return { c: a.c, r: a.r, sweep, mid: [a.c[0] + a.r * Math.cos(a0), a.c[1] + a.r * Math.sin(a0)] };
  };
  const chordOf = (l: Prim, a: Prim): a is Extract<Prim, { kind: 'arc' }> =>
    l.kind === 'line' && a.kind === 'arc' && dist(l.a, l.b) < Math.min(1, 0.6 * a.r) && [l.a, l.b].every((q) => Math.abs(dist(q, a.c) - a.r) < Math.max(0.02, a.r * 0.005));
  if (!closed && prims.length > 1) {
    const s = prims[0], e = prims[prims.length - 1];
    const start = s.kind === 'line' ? s.a : null, end = e.kind === 'line' ? e.b : null;
    if (start && end && dist(start, end) < 0.05) closed = true;
  }
  const list = [...prims];
  for (let i = 0; i < list.length; i++) {
    const l = list[i];
    if (l.kind !== 'line') continue;
    const n = list.length, prev = list[(i - 1 + n) % n], next = list[(i + 1) % n];
    const host = (closed || i > 0) && chordOf(l, prev) ? prev : (closed || i + 1 < n) && chordOf(l, next) ? next : null;
    if (!host || host.kind !== 'arc') continue;
    const k = list.indexOf(host);
    list[k] = { kind: 'arc', ...join(host, { ...host, sweep: 0 }, 2 * Math.asin(Math.min(1, dist(l.a, l.b) / (2 * host.r)))) };
    list.splice(i, 1);
    i = -1;
  }
  const out: Prim[] = [];
  for (const p of list) {
    const last = out[out.length - 1];
    if (p.kind === 'arc' && last?.kind === 'arc' && sameCircle(last, p)) out[out.length - 1] = { kind: 'arc', ...join(last, p) };
    else out.push(p);
  }
  if (closed && out.length > 1) {
    const f = out[0], l = out[out.length - 1];
    if (f.kind === 'arc' && l.kind === 'arc' && sameCircle(f, l)) {
      out.pop();
      out[0] = { kind: 'arc', ...join(l, f) };
    }
  }
  return out;
}

const cache = new WeakMap<Document, Map<DrawingViewType, { arcs: Arc2D[]; slots: Slot2D[]; axes: AxisCircle2D[] }>>();

/**
 * The arcs, slots and side-on circles of a model's edges in a standard view: the end-on edges (their plane faces the
 * viewer) split into lines and arcs; a closed outline of two half circles and two lines is a slot, every other arc
 * short of a full circle a fillet arc. Full circles seen end-on are the holes (hlr.ts); full circles seen side-on
 * give the axes of cylinders and holes across the view.
 */
export function viewArcs(model: Document, type: DrawingViewType): { arcs: Arc2D[]; slots: Slot2D[]; axes: AxisCircle2D[] } {
  let m = cache.get(model);
  if (!m) cache.set(model, (m = new Map()));
  const hit = m.get(type);
  if (hit) return hit;
  const fr = viewFrame(type);
  const to2 = (p: THREE.Vector3): P => [p.dot(fr.u), p.dot(fr.v)];
  const arcs: Arc2D[] = [], slots: Slot2D[] = [], axes: AxisCircle2D[] = [];
  for (const b of modelBodies(model)) {
    // edges that lie on one circle, per circle (a rim a boolean cut in two halves is one full circle)
    const rings: { c: THREE.Vector3; r: number; n: THREE.Vector3; sweep: number; pieces: { mid: P; sweep: number; c: P }[] }[] = [];
    for (const e of b.edges) {
      if (e.straight || e.points.length < 4 || facetEdge(e)) continue;
      const k = circleFit(e.points);
      if (k) {
        let ring = rings.find((x) => x.c.distanceTo(k.c) < Math.max(0.1, k.r * 0.02) && Math.abs(x.r - k.r) < Math.max(0.1, k.r * 0.02));
        if (!ring) rings.push((ring = { c: k.c, r: k.r, n: k.n, sweep: 0, pieces: [] }));
        const sweep = e.closed ? 2 * Math.PI : k.sweep;
        ring.sweep += sweep;
        // the angle halfway along the piece, signed in the view
        const pm = to2(e.points[Math.floor(e.points.length / 2)]);
        ring.pieces.push({ mid: pm, sweep, c: to2(k.c) });
        continue;
      }
      const w0 = e.points[0].dot(fr.w);
      if (!e.points.every((p) => Math.abs(p.dot(fr.w) - w0) < 0.01)) continue;
      // an outline that ends where it starts is closed (a boolean can leave the loop as one open chain)
      const loop = e.closed || e.points[0].distanceTo(e.points[e.points.length - 1]) < 0.05;
      const prims = mergeArcs(decompose(e.points.map(to2), loop), loop);
      const arcPrims = prims.filter((p): p is Extract<Prim, { kind: 'arc' }> => p.kind === 'arc');
      const linePrims = prims.filter((p) => p.kind === 'line' && dist(p.a, p.b) > 0.2);
      const halves = arcPrims.length === 2 && arcPrims.every((a) => Math.abs(Math.abs(a.sweep) - Math.PI) < 0.1);
      if (loop && halves && linePrims.length === 2 && Math.abs(arcPrims[0].r - arcPrims[1].r) < Math.max(0.02, arcPrims[0].r * 0.01)) {
        // the same slot on the far face (a through slot) projects onto this one
        const [c1, c2] = [arcPrims[0].c, arcPrims[1].c];
        if (!slots.some((x) => (dist(x.c1, c1) < 0.05 && dist(x.c2, c2) < 0.05) || (dist(x.c1, c2) < 0.05 && dist(x.c2, c1) < 0.05)))
          slots.push({ c1, c2, r: (arcPrims[0].r + arcPrims[1].r) / 2, mids: [arcPrims[0].mid, arcPrims[1].mid] });
        continue;
      }
      for (const a of arcPrims) if (Math.abs(a.sweep) < 2 * Math.PI - 0.1 && a.r > 0.2) arcs.push(a);
    }
    for (const ring of rings) {
      const endOn = Math.abs(ring.n.dot(fr.w)) > 0.999;
      if (ring.sweep >= 2 * Math.PI - 0.1) {
        // a full circle: across the view it is the axis of a cylinder or hole
        if (Math.abs(ring.n.dot(fr.w)) < 1e-3) {
          const d = to2(ring.n), L = Math.hypot(d[0], d[1]);
          axes.push({ c: to2(ring.c), dir: [d[0] / L, d[1] / L], r: ring.r });
        }
        continue;
      }
      if (!endOn || ring.r <= 0.2) continue;
      for (const p of ring.pieces) arcs.push({ c: p.c, r: ring.r, sweep: p.sweep, mid: p.mid });
    }
  }
  const out = { arcs, slots, axes };
  m.set(type, out);
  return out;
}
