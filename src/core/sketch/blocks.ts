import type { Constraint, Entity, Id, Sketch, SketchPoint } from './types';
import { entityPoints, entityScalars, newId } from './model';

/**
 * Sketch blocks for the Design Library: a reusable set of entities with their
 * internal relations, stored relative to a reference point.
 */
export interface Block {
  points: Record<Id, SketchPoint>;
  scalars: Record<Id, number>;
  entities: Entity[];
  constraints: Constraint[];
}

/** Extract entities (and the relations fully inside the set) as a block centred on their centroid. */
export function extractBlock(s: Sketch, entityIds: Id[]): Block {
  const ents = entityIds.map((id) => s.entities[id]).filter(Boolean);
  const pointIds = new Set<Id>();
  const scalarIds = new Set<Id>();
  for (const e of ents) {
    for (const p of entityPoints(e)) pointIds.add(p);
    for (const sc of entityScalars(e)) scalarIds.add(sc);
  }
  let cx = 0, cy = 0;
  for (const p of pointIds) {
    cx += s.points[p].x;
    cy += s.points[p].y;
  }
  const n = pointIds.size || 1;
  cx /= n;
  cy /= n;
  const points: Record<Id, SketchPoint> = {};
  for (const p of pointIds) points[p] = { x: s.points[p].x - cx, y: s.points[p].y - cy };
  const scalars: Record<Id, number> = {};
  for (const sc of scalarIds) scalars[sc] = s.scalars[sc];
  const entSet = new Set(entityIds);
  const constraints = s.constraintOrder
    .map((id) => s.constraints[id])
    .filter((c) => c.refs.every((r) => pointIds.has(r) || entSet.has(r)))
    .map((c) => (c.kind === 'fix' && c.target ? { ...c, target: { x: c.target.x - cx, y: c.target.y - cy } } : c))
    .map((c) => (c.labelOffset ? { ...c, labelOffset: { x: c.labelOffset.x - cx, y: c.labelOffset.y - cy } } : c));
  return { points, scalars, entities: ents.map((e) => ({ ...e })), constraints };
}

/** Insert a block into a sketch at `at`, with fresh ids. Returns the new sketch and the inserted entity ids. */
export function insertBlock(s: Sketch, b: Block, at: SketchPoint): [Sketch, Id[]] {
  const pmap = new Map<Id, Id>();
  const smap = new Map<Id, Id>();
  const emap = new Map<Id, Id>();
  const points = { ...s.points };
  for (const [id, p] of Object.entries(b.points)) {
    const nid = newId('p');
    pmap.set(id, nid);
    points[nid] = { x: p.x + at.x, y: p.y + at.y };
  }
  const scalars = { ...s.scalars };
  for (const [id, v] of Object.entries(b.scalars)) {
    const nid = newId('s');
    smap.set(id, nid);
    scalars[nid] = v;
  }
  for (const e of b.entities) emap.set(e.id, newId(e.kind === 'line' ? 'ln' : e.kind === 'circle' ? 'ci' : e.kind === 'arc' ? 'ar' : e.kind === 'spline' ? 'sp' : e.kind === 'ellipse' ? 'el' : e.kind === 'ellipseArc' ? 'ea' : e.kind === 'conic' ? 'cn' : e.kind === 'text' ? 'tx' : 'pt'));
  const P = (id: Id) => pmap.get(id) ?? id;
  const entities = { ...s.entities };
  const entityOrder = [...s.entityOrder];
  for (const e of b.entities) {
    const id = emap.get(e.id)!;
    let ne: Entity;
    switch (e.kind) {
      case 'point':
        ne = { ...e, id, p: P(e.p) };
        break;
      case 'line':
        ne = { ...e, id, p1: P(e.p1), p2: P(e.p2) };
        break;
      case 'circle':
        ne = { ...e, id, center: P(e.center), r: smap.get(e.r) ?? e.r };
        break;
      case 'arc':
        ne = { ...e, id, center: P(e.center), start: P(e.start), end: P(e.end), r: smap.get(e.r) ?? e.r };
        break;
      case 'spline':
        ne = { ...e, id, points: e.points.map(P) };
        break;
      case 'ellipse':
        ne = { ...e, id, center: P(e.center), major: P(e.major), r2: smap.get(e.r2) ?? e.r2 };
        break;
      case 'ellipseArc':
        ne = { ...e, id, center: P(e.center), major: P(e.major), start: P(e.start), end: P(e.end), r2: smap.get(e.r2) ?? e.r2 };
        break;
      case 'conic':
        ne = { ...e, id, start: P(e.start), end: P(e.end), control: P(e.control) };
        break;
      case 'text':
        ne = { ...e, id, anchor: P(e.anchor) };
        break;
    }
    entities[id] = ne;
    entityOrder.push(id);
  }
  const constraints = { ...s.constraints };
  const constraintOrder = [...s.constraintOrder];
  for (const c of b.constraints) {
    const id = newId('c');
    const refs = c.refs.map((r) => emap.get(r) ?? pmap.get(r) ?? r);
    const nc: Constraint = { ...c, id, refs };
    if (c.target) nc.target = { x: c.target.x + at.x, y: c.target.y + at.y };
    if (c.labelOffset) nc.labelOffset = { x: c.labelOffset.x + at.x, y: c.labelOffset.y + at.y };
    constraints[id] = nc;
    constraintOrder.push(id);
  }
  return [{ ...s, points, scalars, entities, entityOrder, constraints, constraintOrder }, [...emap.values()]];
}
