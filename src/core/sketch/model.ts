import type {
  ArcEntity,
  CircleEntity,
  Constraint,
  ConstraintKind,
  Entity,
  Id,
  LineEntity,
  PointEntity,
  Sketch,
  SketchPoint,
  SplineEntity,
} from './types';

let counter = 0;
export function newId(prefix = 'e'): Id {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`;
}
/** test helper: deterministic ids */
export function resetIds(): void {
  counter = 0;
}

export function createSketch(id: Id, name: string, plane: Sketch['plane'] = 'front'): Sketch {
  const origin = 'origin_' + id;
  return {
    id,
    name,
    plane,
    points: { [origin]: { x: 0, y: 0 } },
    scalars: {},
    entities: {},
    constraints: {},
    entityOrder: [],
    constraintOrder: [],
    origin,
  };
}

/** All mutators return a new sketch object (structural sharing for untouched maps). */

export function addPointParam(s: Sketch, p: SketchPoint, id = newId('p')): [Sketch, Id] {
  return [{ ...s, points: { ...s.points, [id]: { x: p.x, y: p.y } } }, id];
}

export function addScalar(s: Sketch, v: number, id = newId('s')): [Sketch, Id] {
  return [{ ...s, scalars: { ...s.scalars, [id]: v } }, id];
}

function pushEntity<E extends Entity>(s: Sketch, e: E): [Sketch, E] {
  return [
    { ...s, entities: { ...s.entities, [e.id]: e }, entityOrder: [...s.entityOrder, e.id] },
    e,
  ];
}

export function addPoint(s: Sketch, p: SketchPoint, construction = false): [Sketch, PointEntity] {
  const [s1, pid] = addPointParam(s, p);
  return pushEntity(s1, { id: newId('pt'), kind: 'point', p: pid, construction });
}

export function addLine(
  s: Sketch,
  a: SketchPoint | Id,
  b: SketchPoint | Id,
  construction = false,
): [Sketch, LineEntity] {
  let s1 = s;
  let p1: Id, p2: Id;
  if (typeof a === 'string') p1 = a;
  else [s1, p1] = addPointParam(s1, a);
  if (typeof b === 'string') p2 = b;
  else [s1, p2] = addPointParam(s1, b);
  return pushEntity(s1, { id: newId('ln'), kind: 'line', p1, p2, construction });
}

export function addCircle(
  s: Sketch,
  center: SketchPoint | Id,
  r: number,
  construction = false,
): [Sketch, CircleEntity] {
  let s1 = s;
  let c: Id;
  if (typeof center === 'string') c = center;
  else [s1, c] = addPointParam(s1, center);
  const [s2, rid] = addScalar(s1, r);
  return pushEntity(s2, { id: newId('ci'), kind: 'circle', center: c, r: rid, construction });
}

/** Arc defined by centre, start and end points; radius parameter derived from start. */
export function addArc(
  s: Sketch,
  center: SketchPoint,
  start: SketchPoint | Id,
  end: SketchPoint | Id,
  ccw = true,
  construction = false,
): [Sketch, ArcEntity] {
  let s1 = s;
  let c: Id, a: Id, b: Id;
  [s1, c] = addPointParam(s1, center);
  if (typeof start === 'string') a = start;
  else [s1, a] = addPointParam(s1, start);
  if (typeof end === 'string') b = end;
  else [s1, b] = addPointParam(s1, end);
  const sp = s1.points[a];
  const r = Math.hypot(sp.x - center.x, sp.y - center.y);
  const [s2, rid] = addScalar(s1, r);
  return pushEntity(s2, { id: newId('ar'), kind: 'arc', center: c, start: a, end: b, r: rid, ccw, construction });
}

export function addSpline(s: Sketch, pts: (SketchPoint | Id)[], construction = false): [Sketch, SplineEntity] {
  let s1 = s;
  const ids: Id[] = [];
  for (const p of pts) {
    if (typeof p === 'string') ids.push(p);
    else {
      let id: Id;
      [s1, id] = addPointParam(s1, p);
      ids.push(id);
    }
  }
  return pushEntity(s1, { id: newId('sp'), kind: 'spline', points: ids, construction });
}

export function addConstraint(
  s: Sketch,
  kind: ConstraintKind,
  refs: Id[],
  extra: Partial<Omit<Constraint, 'id' | 'kind' | 'refs'>> = {},
): [Sketch, Constraint] {
  const c: Constraint = { id: newId('c'), kind, refs, ...extra };
  return [
    { ...s, constraints: { ...s.constraints, [c.id]: c }, constraintOrder: [...s.constraintOrder, c.id] },
    c,
  ];
}

export function updateConstraint(s: Sketch, id: Id, patch: Partial<Constraint>): Sketch {
  const c = s.constraints[id];
  if (!c) return s;
  return { ...s, constraints: { ...s.constraints, [id]: { ...c, ...patch } } };
}

export function removeConstraint(s: Sketch, id: Id): Sketch {
  if (!s.constraints[id]) return s;
  const constraints = { ...s.constraints };
  delete constraints[id];
  return { ...s, constraints, constraintOrder: s.constraintOrder.filter((x) => x !== id) };
}

/** Points owned by an entity (shared points are kept if another entity still uses them). */
export function entityPoints(e: Entity): Id[] {
  switch (e.kind) {
    case 'point':
      return [e.p];
    case 'line':
      return [e.p1, e.p2];
    case 'circle':
      return [e.center];
    case 'arc':
      return [e.center, e.start, e.end];
    case 'spline':
      return e.points;
  }
}

export function entityScalars(e: Entity): Id[] {
  return e.kind === 'circle' || e.kind === 'arc' ? [e.r] : [];
}

export function removeEntity(s: Sketch, id: Id): Sketch {
  const e = s.entities[id];
  if (!e) return s;
  const entities = { ...s.entities };
  delete entities[id];
  const entityOrder = s.entityOrder.filter((x) => x !== id);
  // points still referenced by other entities stay
  const used = new Set<Id>([s.origin]);
  for (const oid of entityOrder) for (const p of entityPoints(entities[oid])) used.add(p);
  const points = { ...s.points };
  for (const p of entityPoints(e)) if (!used.has(p)) delete points[p];
  const scalars = { ...s.scalars };
  for (const sc of entityScalars(e)) delete scalars[sc];
  // drop constraints that reference removed ids
  const removedIds = new Set<Id>([id, ...entityScalars(e), ...entityPoints(e).filter((p) => !used.has(p))]);
  const constraints = { ...s.constraints };
  const constraintOrder = s.constraintOrder.filter((cid) => {
    const c = constraints[cid];
    const dead = c.refs.some((r) => removedIds.has(r));
    if (dead) delete constraints[cid];
    return !dead;
  });
  return { ...s, entities, entityOrder, points, scalars, constraints, constraintOrder };
}

export function setPoint(s: Sketch, id: Id, p: SketchPoint): Sketch {
  return { ...s, points: { ...s.points, [id]: { x: p.x, y: p.y } } };
}

export function toggleConstruction(s: Sketch, ids: Id[]): Sketch {
  const entities = { ...s.entities };
  for (const id of ids) if (entities[id]) entities[id] = { ...entities[id], construction: !entities[id].construction };
  return { ...s, entities };
}

/** Which entity (if any) owns a point id — used to resolve refs. */
export function ownerOfPoint(s: Sketch, pid: Id): Entity | undefined {
  for (const id of s.entityOrder) {
    const e = s.entities[id];
    if (entityPoints(e).includes(pid)) return e;
  }
  return undefined;
}

export function isPointId(s: Sketch, id: Id): boolean {
  return id in s.points;
}

export function lineLength(s: Sketch, l: LineEntity): number {
  const a = s.points[l.p1];
  const b = s.points[l.p2];
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function distance(a: SketchPoint, b: SketchPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function arcAngles(s: Sketch, a: ArcEntity): { start: number; end: number; sweep: number } {
  const c = s.points[a.center];
  const p1 = s.points[a.start];
  const p2 = s.points[a.end];
  const start = Math.atan2(p1.y - c.y, p1.x - c.x);
  const end = Math.atan2(p2.y - c.y, p2.x - c.x);
  let sweep = a.ccw ? end - start : start - end;
  while (sweep < 0) sweep += Math.PI * 2;
  while (sweep > Math.PI * 2) sweep -= Math.PI * 2;
  if (sweep === 0) sweep = Math.PI * 2;
  return { start, end, sweep };
}
