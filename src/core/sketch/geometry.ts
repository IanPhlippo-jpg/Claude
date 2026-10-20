import { arcAngles } from './model';
import type { Entity, Id, Sketch, SketchPoint } from './types';

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

/** Polyline approximation of an entity in sketch coordinates. */
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
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        out.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
      }
      return out;
    }
    case 'arc': {
      const c = s.points[e.center];
      const r = s.scalars[e.r];
      const { start, sweep } = arcAngles(s, e);
      const n = Math.max(4, Math.ceil((segments * sweep) / (Math.PI * 2)));
      const out: Pt[] = [];
      for (let i = 0; i <= n; i++) {
        const a = start + (e.ccw ? 1 : -1) * (sweep * i) / n;
        out.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) });
      }
      return out;
    }
    case 'spline':
      return sampleCatmullRom(e.points.map((p) => s.points[p]));
  }
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
    case 'spline': {
      const pts = sampleCatmullRom(e.points.map((id) => s.points[id]));
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
    const pts = e.kind === 'point' ? [e.p] : e.kind === 'line' ? [e.p1, e.p2] : e.kind === 'circle' ? [e.center] : e.kind === 'arc' ? [e.center, e.start, e.end] : e.points;
    for (const pid of pts) {
      if (excludePoints.has(pid)) continue;
      const d = dist(p, s.points[pid]);
      if (d <= tolerance) consider({ kind: 'point', id: pid, entityId: eid, distance: d });
    }
  }
  if (dist(p, s.points[s.origin]) <= tolerance) consider({ kind: 'point', id: s.origin, distance: dist(p, s.points[s.origin]) });
  if (best) return best;
  for (const eid of s.entityOrder) {
    const e = s.entities[eid];
    const d = distanceToEntity(s, e, p);
    if (d <= tolerance) consider({ kind: 'entity', id: eid, distance: d });
  }
  return best;
}

export type SnapKind = 'endpoint' | 'midpoint' | 'center' | 'on' | 'horizontal' | 'vertical' | 'origin' | 'quadrant';

export interface Snap {
  kind: SnapKind;
  point: Pt;
  /** point id when snapping to an existing point */
  pointId?: Id;
  /** entity id when snapping onto a curve */
  entityId?: Id;
}

/**
 * Inference snapping used while drawing: existing points, midpoints, curve
 * points and horizontal/vertical alignment relative to a reference point.
 */
export function snap(
  s: Sketch,
  cursor: Pt,
  tolerance: number,
  ref: Pt | null,
  excludePoints: Set<Id> = new Set(),
): Snap[] {
  const snaps: Snap[] = [];
  const hit = hitTest(s, cursor, tolerance, excludePoints);
  if (hit && hit.kind === 'point') {
    const e = hit.entityId ? s.entities[hit.entityId] : undefined;
    const kind: SnapKind = hit.id === s.origin ? 'origin' : e && (e.kind === 'circle' || e.kind === 'arc') && e.center === hit.id ? 'center' : 'endpoint';
    snaps.push({ kind, point: s.points[hit.id], pointId: hit.id, entityId: hit.entityId });
    return snaps;
  }
  // midpoints of lines
  for (const eid of s.entityOrder) {
    const e = s.entities[eid];
    if (e.kind === 'line') {
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
    }
    snaps.push({ kind: 'on', point: pt, entityId: hit.id });
    return snaps;
  }
  if (ref) {
    const out = { ...cursor };
    if (Math.abs(cursor.y - ref.y) <= tolerance && Math.abs(cursor.x - ref.x) > tolerance) {
      out.y = ref.y;
      snaps.push({ kind: 'horizontal', point: out });
    } else if (Math.abs(cursor.x - ref.x) <= tolerance && Math.abs(cursor.y - ref.y) > tolerance) {
      out.x = ref.x;
      snaps.push({ kind: 'vertical', point: out });
    }
  }
  return snaps;
}

/** Bounding box of all entities (for zoom-to-fit). */
export function sketchBounds(s: Sketch): { min: Pt; max: Pt } | null {
  let min: Pt | null = null, max: Pt | null = null;
  for (const eid of s.entityOrder) {
    for (const p of sampleEntity(s, s.entities[eid], 16)) {
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
