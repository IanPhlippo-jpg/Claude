import { arcAngles } from './model';
import type { EllipseArcEntity, EllipseEntity, Entity, Id, Sketch, SketchPoint } from './types';
import { textOutlines } from './text';

export type Pt = SketchPoint;

export function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}
export function add(a: Pt, b: Pt): Pt {
  return { x: a.x + b.x, y: a.y + b.y };
}
export function scale(a: Pt, k: number): Pt {
  return { x: a.x * k, y: a.y * k };
}
export function len(a: Pt): number {
  return Math.hypot(a.x, a.y);
}
export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
export function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Catmull-Rom spline through points, `seg` samples per segment. */
export function sampleCatmullRom(pts: Pt[], seg = 12): Pt[] {
  if (pts.length < 2) return pts.slice();
  if (pts.length === 2) return [pts[0], pts[1]];
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Single-span Bezier through its control polygon (Style Spline), de Casteljau. */
export function sampleBezier(ctrl: Pt[], n = 64): Pt[] {
  if (ctrl.length < 2) return ctrl.slice();
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let q = ctrl.slice();
    while (q.length > 1) {
      const r: Pt[] = [];
      for (let k = 0; k < q.length - 1; k++) r.push({ x: q[k].x + (q[k + 1].x - q[k].x) * t, y: q[k].y + (q[k + 1].y - q[k].y) * t });
      q = r;
    }
    out.push(q[0]);
  }
  return out;
}

/** Rational quadratic Bezier of a Conic: weight of the control point w = rho / (1 - rho). */
export function sampleConic(a: Pt, c: Pt, b: Pt, rho: number, n = 48): Pt[] {
  const w = rho / (1 - rho);
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const k0 = u * u, k1 = 2 * u * t * w, k2 = t * t;
    const d = k0 + k1 + k2;
    out.push({ x: (k0 * a.x + k1 * c.x + k2 * b.x) / d, y: (k0 * a.y + k1 * c.y + k2 * b.y) / d });
  }
  return out;
}

/** Ellipse parameter (eccentric angle) of a point, in the frame of the ellipse. */
export function ellipseParamOf(c: Pt, a: number, b: number, rot: number, p: Pt): number {
  const dx = p.x - c.x, dy = p.y - c.y;
  const x = dx * Math.cos(rot) + dy * Math.sin(rot), y = -dx * Math.sin(rot) + dy * Math.cos(rot);
  return Math.atan2(y / (b || 1e-9), x / (a || 1e-9));
}

/** Start parameter and signed sweep of a Partial Ellipse. */
export function ellipseArcRange(s: Sketch, e: EllipseArcEntity): { c: Pt; a: number; b: number; rot: number; t0: number; sweep: number } {
  const { c, a, b, rot } = ellipseParams(s, e as unknown as EllipseEntity);
  const t0 = ellipseParamOf(c, a, b, rot, s.points[e.start]);
  const t1 = ellipseParamOf(c, a, b, rot, s.points[e.end]);
  let sw = e.ccw ? t1 - t0 : t0 - t1;
  while (sw <= 1e-9) sw += Math.PI * 2;
  return { c, a, b, rot, t0, sweep: e.ccw ? sw : -sw };
}

/** Polyline approximation of an entity in sketch coordinates. */
/**
 * Segments for a full circle of radius r: at least `base`, more for large radii so the chord deviation stays
 * under 0.02 mm (the intended image quality adapts the tessellation to the size the same way). At most 256.
 */
export function circleSegments(r: number, base: number): number {
  if (!(r > 0.02)) return base;
  const n = Math.ceil(Math.PI / Math.acos(1 - 0.02 / r));
  return Math.max(base, Math.min(256, n));
}

export function sampleEntity(s: Sketch, e: Entity, segments = 48): Pt[] {
  switch (e.kind) {
    case 'point':
      return [s.points[e.p]];
    case 'line':
      return [s.points[e.p1], s.points[e.p2]];
    case 'circle': {
      const c = s.points[e.center];
      const r = s.scalars[e.r];
      const out: Pt[] = [];
      const nC = circleSegments(r, segments);
      for (let i = 0; i <= nC; i++) {
        const a = (i / nC) * Math.PI * 2;
        out.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
      }
      return out;
    }
    case 'arc': {
      const c = s.points[e.center];
      const r = s.scalars[e.r];
      const { start, sweep } = arcAngles(s, e);
      const n = Math.max(4, Math.ceil((circleSegments(r, segments) * sweep) / (Math.PI * 2)));
      const out: Pt[] = [];
      for (let i = 0; i <= n; i++) {
        const a = start + (e.ccw ? 1 : -1) * (sweep * i) / n;
        out.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
      }
      return out;
    }
    case 'spline':
      return e.style ? sampleBezier(e.points.map((p) => s.points[p])) : sampleCatmullRom(e.points.map((p) => s.points[p]));
    case 'conic':
      return sampleConic(s.points[e.start], s.points[e.control], s.points[e.end], e.rho, segments);
    case 'ellipseArc': {
      const { c, a, b, rot, t0, sweep } = ellipseArcRange(s, e);
      const n = Math.max(8, Math.ceil((segments * Math.abs(sweep)) / (Math.PI * 2)));
      const out: Pt[] = [];
      for (let i = 0; i <= n; i++) {
        const t = t0 + (sweep * i) / n;
        const x = a * Math.cos(t), y = b * Math.sin(t);
        out.push({ x: c.x + x * Math.cos(rot) - y * Math.sin(rot), y: c.y + x * Math.sin(rot) + y * Math.cos(rot) });
      }
      // the end points exactly on the sketch points (profiles chain through them)
      out[0] = s.points[e.start];
      out[out.length - 1] = s.points[e.end];
      return out;
    }
    case 'ellipse': {
      const { c, a, b, rot } = ellipseParams(s, e);
      const out: Pt[] = [];
      for (let i = 0; i <= segments; i++) {
        const t = (i / segments) * Math.PI * 2;
        const x = a * Math.cos(t), y = b * Math.sin(t);
        out.push({ x: c.x + x * Math.cos(rot) - y * Math.sin(rot), y: c.y + x * Math.sin(rot) + y * Math.cos(rot) });
      }
      return out;
    }
    case 'text': {
      // the outline of the first glyph loop (all loops: entityLoops)
      return entityLoops(s, e)[0] ?? [s.points[e.anchor]];
    }
  }
}

/** Centre, semi-axes and rotation of an ellipse entity. */
export function ellipseParams(s: Sketch, e: EllipseEntity): { c: Pt; a: number; b: number; rot: number } {
  const c = s.points[e.center], m = s.points[e.major];
  return { c, a: Math.hypot(m.x - c.x, m.y - c.y), b: Math.abs(s.scalars[e.r2]), rot: Math.atan2(m.y - c.y, m.x - c.x) };
}

/** Closed and open polylines of an entity: one for curves, every glyph outline (and hole) for Sketch Text. */
export function entityLoops(s: Sketch, e: Entity, segments = 48): Pt[][] {
  if (e.kind !== 'text') return [sampleEntity(s, e, segments)];
  const o = s.points[e.anchor];
  const rot = ((e.angle ?? 0) * Math.PI) / 180;
  const wf = (e.widthFactor ?? 100) / 100;
  const out: Pt[][] = [];
  for (const loop of textOutlines(e.text, e.height, !!e.bold, e.spacing ?? 100)) {
    out.push(loop.map((p) => {
      const x = p.x * wf, y = p.y;
      return { x: o.x + x * Math.cos(rot) - y * Math.sin(rot), y: o.y + x * Math.sin(rot) + y * Math.cos(rot) };
    }));
  }
  return out;
}

function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const ab = sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y;
  if (l2 === 0) return dist(p, a);
  let t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
}

/** Distance from p to an entity's curve. */
export function distanceToEntity(s: Sketch, e: Entity, p: Pt): number {
  switch (e.kind) {
    case 'point':
      return dist(p, s.points[e.p]);
    case 'line':
      return distToSegment(p, s.points[e.p1], s.points[e.p2]);
    case 'circle':
      return Math.abs(dist(p, s.points[e.center]) - s.scalars[e.r]);
    case 'arc': {
      const c = s.points[e.center];
      const r = s.scalars[e.r];
      const { start, sweep } = arcAngles(s, e);
      let a = Math.atan2(p.y - c.y, p.x - c.x);
      let rel = e.ccw ? a - start : start - a;
      while (rel < 0) rel += Math.PI * 2;
      if (rel <= sweep) return Math.abs(dist(p, c) - r);
      return Math.min(dist(p, s.points[e.start]), dist(p, s.points[e.end]));
    }
    case 'ellipse':
    case 'ellipseArc':
    case 'conic':
    case 'text': {
      let best = Infinity;
      for (const pts of entityLoops(s, e, 64)) for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, distToSegment(p, pts[i], pts[i + 1]));
      return best;
    }
    case 'spline': {
      const pts = sampleEntity(s, e);
      let best = Infinity;
      for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, distToSegment(p, pts[i], pts[i + 1]));
      return best;
    }
  }
}

export interface Hit {
  kind: 'point' | 'entity';
  id: Id;
  /** owning entity when a point was hit */
  entityId?: Id;
  distance: number;
}

/** Hit-test points first (they take priority), then curves. */
export function hitTest(s: Sketch, p: Pt, tolerance: number, excludePoints: Set<Id> = new Set()): Hit | null {
  let best: Hit | null = null;
  const consider = (h: Hit) => {
    if (!best || h.distance < best.distance) best = h;
  };
  // points
  for (const eid of s.entityOrder) {
    const e = s.entities[eid];
    const pts = e.kind === 'point' ? [e.p] : e.kind === 'line' ? [e.p1, e.p2] : e.kind === 'circle' ? [e.center] : e.kind === 'arc' ? [e.center, e.start, e.end] : e.kind === 'ellipse' ? [e.center, e.major] : e.kind === 'ellipseArc' ? [e.center, e.major, e.start, e.end] : e.kind === 'conic' ? [e.start, e.end, e.control] : e.kind === 'text' ? [e.anchor] : e.equation ? [e.points[0], e.points[e.points.length - 1]] : e.points;
    for (const pid of pts) {
      if (excludePoints.has(pid)) continue;
      const d = dist(p, s.points[pid]);
      if (d <= tolerance) consider({ kind: 'point', id: pid, entityId: eid, distance: d });
    }
  }
  if (!excludePoints.has(s.origin) && dist(p, s.points[s.origin]) <= tolerance) consider({ kind: 'point', id: s.origin, distance: dist(p, s.points[s.origin]) });
  if (best) return best;
  for (const eid of s.entityOrder) {
    const e = s.entities[eid];
    const d = distanceToEntity(s, e, p);
    if (d <= tolerance) consider({ kind: 'entity', id: eid, distance: d });
  }
  return best;
}

export type SnapKind = 'endpoint' | 'midpoint' | 'center' | 'on' | 'horizontal' | 'vertical' | 'origin' | 'quadrant' | 'align' | 'intersection' | 'angle' | 'parallel' | 'perpendicular';

export interface Snap {
  kind: SnapKind;
  point: Pt;
  /** point id when snapping to an existing point */
  pointId?: Id;
  /** entity id when snapping onto a curve */
  entityId?: Id;
  /** existing points the snapped point lines up with (shown as dotted inference lines; no relation is added) */
  align?: Pt[];
  /** angle / parallel / perpendicular: the point the inferred direction starts from (drawn as a dotted line) */
  from?: Pt;
}

/**
 * Inference snapping used while drawing: existing points, midpoints, curve
 * points and horizontal/vertical alignment relative to a reference point.
 * `kinds`: only these snaps (System Options ▸ Sketch ▸ Relations/Snaps); absent = all.
 */
export function snap(
  s: Sketch,
  cursor: Pt,
  tolerance: number,
  ref: Pt | null,
  excludePoints: Set<Id> = new Set(),
  kinds?: ReadonlySet<SnapKind>,
): Snap[] {
  const ok = (k: SnapKind) => !kinds || kinds.has(k);
  const snaps: Snap[] = [];
  const hit = hitTest(s, cursor, tolerance, excludePoints);
  if (hit && hit.kind === 'point') {
    const e = hit.entityId ? s.entities[hit.entityId] : undefined;
    const kind: SnapKind = hit.id === s.origin ? 'origin' : e && (e.kind === 'circle' || e.kind === 'arc') && e.center === hit.id ? 'center' : 'endpoint';
    if (ok(kind)) {
      snaps.push({ kind, point: s.points[hit.id], pointId: hit.id, entityId: hit.entityId });
      return snaps;
    }
  }
  // intersections of two lines near the pointer (no relation; the point lands exactly on both)
  if (ok('intersection') && hit && hit.kind === 'entity') {
    const x = lineIntersectionNear(s, cursor, tolerance);
    if (x) return [{ kind: 'intersection', point: x }];
  }
  // midpoints of lines
  for (const eid of s.entityOrder) {
    const e = s.entities[eid];
    if (e.kind === 'line' && ok('midpoint')) {
      const m = mid(s.points[e.p1], s.points[e.p2]);
      if (dist(m, cursor) <= tolerance) {
        snaps.push({ kind: 'midpoint', point: m, entityId: eid });
        return snaps;
      }
    }
  }
  if (hit && hit.kind === 'entity') {
    const e = s.entities[hit.id];
    let pt = cursor;
    if (e.kind === 'line') {
      const a = s.points[e.p1], b = s.points[e.p2];
      const ab = sub(b, a);
      const l2 = ab.x * ab.x + ab.y * ab.y || 1;
      const t = Math.max(0, Math.min(1, ((cursor.x - a.x) * ab.x + (cursor.y - a.y) * ab.y) / l2));
      pt = add(a, scale(ab, t));
    } else if (e.kind === 'circle' || e.kind === 'arc') {
      const c = s.points[e.center];
      const r = s.scalars[e.r];
      const d = sub(cursor, c);
      const l = len(d) || 1;
      pt = add(c, scale(d, r / l));
      // the quadrant points of a circle or arc (0°, 90°, 180°, 270°) catch the pointer first
      if (ok('quadrant')) {
        for (const q of [{ x: c.x + r, y: c.y }, { x: c.x, y: c.y + r }, { x: c.x - r, y: c.y }, { x: c.x, y: c.y - r }]) {
          if (dist(q, cursor) <= tolerance && distanceToEntity(s, e, q) <= tolerance * 0.05) return [{ kind: 'quadrant', point: q, entityId: hit.id }];
        }
      }
    }
    if (ok('on')) {
      snaps.push({ kind: 'on', point: pt, entityId: hit.id });
      return snaps;
    }
  }
  const out = { ...cursor };
  let fixedX = false, fixedY = false;
  if (ref && ok('horizontal')) {
    if (Math.abs(cursor.y - ref.y) <= tolerance && Math.abs(cursor.x - ref.x) > tolerance) {
      out.y = ref.y;
      fixedY = true;
      snaps.push({ kind: 'horizontal', point: out });
    } else if (Math.abs(cursor.x - ref.x) <= tolerance && Math.abs(cursor.y - ref.y) > tolerance) {
      out.x = ref.x;
      fixedX = true;
      snaps.push({ kind: 'vertical', point: out });
    }
  }
  // inference lines: the cursor lines up horizontally or vertically with another existing point (an end point, a
  // centre, the origin) and takes over its exact coordinate, by design; only a dotted line shows it, no relation
  const align: Pt[] = [];
  let bestX: Pt | null = null, bestY: Pt | null = null;
  for (const id of ok('align') ? inferencePoints(s) : []) {
    if (excludePoints.has(id)) continue;
    const q = s.points[id];
    if (!q || (ref && Math.abs(q.x - ref.x) < 1e-9 && Math.abs(q.y - ref.y) < 1e-9)) continue;
    if (!fixedX && Math.abs(cursor.x - q.x) <= tolerance && Math.abs(cursor.y - q.y) > tolerance && (!bestX || Math.abs(cursor.x - q.x) < Math.abs(cursor.x - bestX.x))) bestX = q;
    if (!fixedY && Math.abs(cursor.y - q.y) <= tolerance && Math.abs(cursor.x - q.x) > tolerance && (!bestY || Math.abs(cursor.y - q.y) < Math.abs(cursor.y - bestY.y))) bestY = q;
  }
  if (bestX) { out.x = bestX.x; align.push(bestX); }
  if (bestY) { out.y = bestY.y; align.push(bestY); }
  if (align.length) {
    if (snaps.length) snaps[0] = { ...snaps[0], point: out, align };
    else snaps.push({ kind: 'align', point: out, align });
  }
  return snaps;
}

/** the crossing of two sketch lines within `tolerance` of p (both segments, a little beyond their ends), if any */
export function lineIntersectionNear(s: Sketch, p: Pt, tolerance: number): Pt | null {
  const lines = s.entityOrder.map((id) => s.entities[id]).filter((e): e is Extract<Entity, { kind: 'line' }> => e.kind === 'line');
  let best: Pt | null = null, bestD = tolerance;
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const a = s.points[lines[i].p1], b = s.points[lines[i].p2], c = s.points[lines[j].p1], d = s.points[lines[j].p2];
      const r = sub(b, a), q = sub(d, c), den = r.x * q.y - r.y * q.x;
      if (Math.abs(den) < 1e-12) continue;
      const t = ((c.x - a.x) * q.y - (c.y - a.y) * q.x) / den, u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
      const x = add(a, scale(r, t));
      // a shared end point is an end point snap, not an intersection
      if ([a, b, c, d].some((e) => dist(e, x) < 1e-9)) continue;
      const lr = len(r) || 1, lq = len(q) || 1;
      if (t < -tolerance / lr || t > 1 + tolerance / lr || u < -tolerance / lq || u > 1 + tolerance / lq) continue;
      const dd = dist(x, p);
      if (dd <= bestD) { bestD = dd; best = x; }
    }
  }
  return best;
}

/** the points a drawn point may line up with: the origin and the end points and centres of the entities */
function inferencePoints(s: Sketch): Id[] {
  const ids = new Set<Id>(s.origin ? [s.origin] : []);
  for (const eid of s.entityOrder) {
    const e = s.entities[eid] as { p1?: Id; p2?: Id; center?: Id; start?: Id; end?: Id };
    for (const k of ['p1', 'p2', 'center', 'start', 'end'] as const) if (e[k]) ids.add(e[k]!);
  }
  return [...ids];
}

/** Bounding box of all entities (for zoom-to-fit). */
export function sketchBounds(s: Sketch): { min: Pt; max: Pt } | null {
  let min: Pt | null = null, max: Pt | null = null;
  for (const eid of s.entityOrder) {
    for (const p of entityLoops(s, s.entities[eid], 16).flat()) {
      if (!min || !max) {
        min = { ...p };
        max = { ...p };
      } else {
        min.x = Math.min(min.x, p.x);
        min.y = Math.min(min.y, p.y);
        max.x = Math.max(max.x, p.x);
        max.y = Math.max(max.y, p.y);
      }
    }
  }
  return min && max ? { min, max } : null;
}
