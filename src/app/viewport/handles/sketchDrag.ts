import { solveSketch, type SolveResult } from '../../../core/solver/solver';
import type { Constraint, Id, Sketch, SketchPoint } from '../../../core/sketch/types';

/**
 * Dragging the sketch of a feature from the model (Drag Handles on a profile edge or a side face), by design: the
 * line under the dragged face moves along its normal, through the sketch solver. A dimension whose value the move
 * changes takes the new value (the length of the neighbouring lines of a rectangle, a distance to the line), so the
 * sketch stays defined the way it was; a line without such a dimension moves freely and its relations carry the rest.
 * A side of a regular polygon scales the polygon (its construction circle); a circle changes its radius (its radius
 * or diameter dimension when it has one).
 */
export type EdgeTarget = { kind: 'line'; id: Id; normal: SketchPoint } | { kind: 'circle'; id: Id };

export interface EdgeDrag {
  sketch: Sketch;
  status: SolveResult['status'];
  solve: SolveResult;
  /** the dimensions the drag changed, with their new values */
  changed: { id: Id; value: number }[];
}

const pointOf = (s: Sketch, id: Id): SketchPoint | null => {
  if (id in s.points) return s.points[id];
  const e = s.entities[id] as { kind?: string; p?: Id; center?: Id } | undefined;
  if (e?.p && e.p in s.points) return s.points[e.p];
  if (e?.center && e.center in s.points) return s.points[e.center];
  return null;
};
const lineOf = (s: Sketch, id: Id): [SketchPoint, SketchPoint] | null => {
  const e = s.entities[id];
  return e?.kind === 'line' ? [s.points[e.p1], s.points[e.p2]] : null;
};
/** distance of p to the infinite line ab */
const toLine = (p: SketchPoint, a: SketchPoint, b: SketchPoint) => {
  const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / l;
};

/** what a dimension measures on the sketch as it stands (null: not measured here, e.g. angles or arc conditions) */
export function measureDimension(s: Sketch, c: Constraint): number | null {
  if (c.arcCondition && Object.keys(c.arcCondition).length) return null;
  const k = c.doubled ? 2 : 1;
  if (c.kind === 'length') {
    const l = lineOf(s, c.refs[0]);
    return l ? Math.hypot(l[1].x - l[0].x, l[1].y - l[0].y) : null;
  }
  if (c.kind === 'radius' || c.kind === 'diameter') {
    const e = s.entities[c.refs[0]];
    if (e?.kind !== 'circle' && e?.kind !== 'arc') return null;
    return s.scalars[e.r] * (c.kind === 'diameter' ? 2 : 1);
  }
  if ((c.kind === 'hDistance' || c.kind === 'vDistance' || c.kind === 'distance') && c.refs.length === 2) {
    const [ra, rb] = c.refs;
    const la = lineOf(s, ra), lb = lineOf(s, rb);
    const pa = la ? null : pointOf(s, ra), pb = lb ? null : pointOf(s, rb);
    if (c.kind !== 'distance') {
      const a = pa ?? la?.[0], b = pb ?? lb?.[0];
      if (!a || !b) return null;
      return k * Math.abs(c.kind === 'hDistance' ? b.x - a.x : b.y - a.y);
    }
    if (pa && pb) return k * Math.hypot(pb.x - pa.x, pb.y - pa.y);
    if (pa && lb) return k * toLine(pa, lb[0], lb[1]);
    if (la && pb) return k * toLine(pb, la[0], la[1]);
    if (la && lb) return k * toLine({ x: (la[0].x + la[1].x) / 2, y: (la[0].y + la[1].y) / 2 }, lb[0], lb[1]);
  }
  return null;
}

/** the construction circle that keeps this line a side of a regular polygon (touching it, or through both ends) */
function polygonCircle(s: Sketch, lineId: Id): Id | null {
  const l = s.entities[lineId];
  if (l?.kind !== 'line') return null;
  for (const cid of s.constraintOrder) {
    const c = s.constraints[cid];
    if (c.kind === 'tangent' && c.refs[0] === lineId && s.entities[c.refs[1]]?.kind === 'circle') return c.refs[1];
  }
  const on = (p: Id) => s.constraintOrder.map((id) => s.constraints[id]).find((c) => c.kind === 'pointOnEntity' && c.refs[0] === p && s.entities[c.refs[1]]?.kind === 'circle')?.refs[1];
  const a = on(l.p1), b = on(l.p2);
  return a && a === b ? a : null;
}

/** the points that belong to the polygon of construction circle `cid` (sides touching it or ends on it) */
function polygonPoints(s: Sketch, cid: Id): Set<Id> {
  const out = new Set<Id>();
  for (const id of s.constraintOrder) {
    const c = s.constraints[id];
    if (c.kind === 'tangent' && c.refs[1] === cid) {
      const l = s.entities[c.refs[0]];
      if (l?.kind === 'line') { out.add(l.p1); out.add(l.p2); }
    }
    if (c.kind === 'pointOnEntity' && c.refs[1] === cid && c.refs[0] in s.points) out.add(c.refs[0]);
  }
  return out;
}

/** the geometry moved by `delta` (no solve): the line along its normal, a polygon scaled, a circle's radius */
export function movedGeometry(s: Sketch, t: EdgeTarget, delta: number): Sketch | null {
  const e = s.entities[t.id];
  if (t.kind === 'circle') {
    if (e?.kind !== 'circle') return null;
    const r = s.scalars[e.r] + delta;
    return r > 1e-6 ? { ...s, scalars: { ...s.scalars, [e.r]: r } } : null;
  }
  if (e?.kind !== 'line') return null;
  const cid = polygonCircle(s, t.id);
  const circle = cid ? s.entities[cid] : null;
  if (circle?.kind === 'circle') {
    // a polygon side: the whole polygon grows about the circle centre so this side moves by delta
    const C = s.points[circle.center];
    const m = { x: (s.points[e.p1].x + s.points[e.p2].x) / 2, y: (s.points[e.p1].y + s.points[e.p2].y) / 2 };
    const apothem = (m.x - C.x) * t.normal.x + (m.y - C.y) * t.normal.y;
    if (apothem > 1e-6) {
      const k = (apothem + delta) / apothem;
      if (k <= 1e-6) return null;
      const points = { ...s.points };
      for (const p of polygonPoints(s, cid!)) points[p] = { x: C.x + (s.points[p].x - C.x) * k, y: C.y + (s.points[p].y - C.y) * k };
      return { ...s, points, scalars: { ...s.scalars, [circle.r]: s.scalars[circle.r] * k } };
    }
  }
  const mv = (p: SketchPoint) => ({ x: p.x + t.normal.x * delta, y: p.y + t.normal.y * delta });
  return { ...s, points: { ...s.points, [e.p1]: mv(s.points[e.p1]), [e.p2]: mv(s.points[e.p2]) } };
}

/**
 * The sketch with the edge dragged by `delta` mm and solved. Null when the drag cannot be made (a dimension would go to
 * zero or below, or the geometry folds over).
 */
export function dragSketchEdge(s: Sketch, t: EdgeTarget, delta: number): EdgeDrag | null {
  const moved = movedGeometry(s, t, delta);
  if (!moved) return null;
  const changed: { id: Id; value: number }[] = [];
  let constraints = moved.constraints;
  for (const id of s.constraintOrder) {
    const c = s.constraints[id];
    if (c.driven || c.value === undefined || c.kind === 'angle') continue;
    const m0 = measureDimension(s, c), m1 = measureDimension(moved, c);
    if (m0 === null || m1 === null || Math.abs(m1 - m0) < 1e-9) continue;
    const value = Number((c.value + (m1 - m0)).toFixed(9));
    if (!(value > 1e-6)) return null;
    changed.push({ id, value });
    constraints = { ...constraints, [id]: { ...c, value } };
  }
  const next = { ...moved, constraints };
  // nothing dimensioned moves with it: the edge moves freely and is held where it was dragged while the rest solves
  const e = s.entities[t.id];
  const pin = !changed.length && e?.kind === 'line' ? { point: e.p1, target: next.points[e.p1] } : undefined;
  const r = solveSketch(next, pin ? { drag: pin } : {});
  return { sketch: r.sketch, status: r.status, solve: r, changed };
}
