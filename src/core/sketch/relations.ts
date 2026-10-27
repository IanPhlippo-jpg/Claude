import type { ConstraintKind, Entity, Id, Sketch } from './types';

export interface SelectionItem {
  kind: 'point' | 'entity';
  id: Id;
  /** Shift+click on an arc/circle: dimension to its edge (tangent) instead of its centre */
  tangent?: boolean;
}

export interface RelationOption {
  kind: ConstraintKind;
  label: string;
  refs: Id[];
  internal?: boolean;
  arcCondition?: Record<number, { entityId: Id; mode: 'min' | 'max' }>;
}

const LABELS: Record<ConstraintKind, string> = {
  coincident: 'Coincident',
  pointOnEntity: 'Coincident (on entity)',
  horizontal: 'Horizontal',
  vertical: 'Vertical',
  parallel: 'Parallel',
  perpendicular: 'Perpendicular',
  tangent: 'Tangent',
  equal: 'Equal',
  concentric: 'Concentric',
  coradial: 'Coradial',
  equalCurveLength: 'Equal Curve Length',
  collinear: 'Collinear',
  midpoint: 'Midpoint',
  symmetric: 'Symmetric',
  fix: 'Fix',
  pierce: 'Pierce',
  intersection: 'Intersection',
  merge: 'Merge',
  equalCurvature: 'Equal Curvature',
  distance: 'Distance',
  hDistance: 'Horizontal distance',
  vDistance: 'Vertical distance',
  length: 'Length',
  radius: 'Radius',
  diameter: 'Diameter',
  angle: 'Angle',
};

export function relationLabel(kind: ConstraintKind): string {
  return LABELS[kind];
}

/** A relation's name in Existing Relations, as the intended design numbers them per kind: Horizontal0, Tangent9 */
export function relationName(s: Sketch, id: Id): string {
  const c = s.constraints[id];
  if (!c) return '';
  const n = s.constraintOrder.filter((k) => s.constraints[k]?.kind === c.kind).indexOf(id);
  return `${LABELS[c.kind]}${Math.max(0, n)}`;
}

function isCircular(e: Entity): boolean {
  return e.kind === 'circle' || e.kind === 'arc';
}

/**
 * The relations that can be applied to a selection, mirroring the
 * context-sensitive "Add relations" list of desktop CAD.
 */
export function relationsForSelection(s: Sketch, sel: SelectionItem[]): RelationOption[] {
  const out: RelationOption[] = [];
  const points = sel.filter((i) => i.kind === 'point').map((i) => i.id);
  const ents = sel.filter((i) => i.kind === 'entity').map((i) => s.entities[i.id]).filter(Boolean);
  const lines = ents.filter((e) => e.kind === 'line');
  const circles = ents.filter(isCircular);
  const ptEnts = ents.filter((e) => e.kind === 'point');
  const allPoints = [...points, ...ptEnts.map((e) => e.id)];
  const push = (kind: ConstraintKind, refs: Id[], internal?: boolean) => out.push({ kind, label: LABELS[kind], refs, internal });

  if (allPoints.length === 1 && ents.length === ptEnts.length) {
    push('fix', [allPoints[0]]);
  }
  if (allPoints.length === 2 && ents.length === ptEnts.length) {
    push('coincident', allPoints);
    push('horizontal', allPoints);
    push('vertical', allPoints);
    push('merge', allPoints);
  }
  if (allPoints.length === 1 && lines.length === 1 && ents.length - ptEnts.length === 1) {
    push('pointOnEntity', [allPoints[0], lines[0].id]);
    push('midpoint', [allPoints[0], lines[0].id]);
  }
  if (allPoints.length === 1 && circles.length === 1 && ents.length - ptEnts.length === 1) {
    push('pointOnEntity', [allPoints[0], circles[0].id]);
  }
  // a point and two curves: the point at their crossing
  if (allPoints.length === 1 && lines.length + circles.length === 2 && ents.length - ptEnts.length === 2) {
    push('intersection', [allPoints[0], ...[...lines, ...circles].map((e) => e.id)]);
  }
  // a spline and a line or arc that meet: Equal Curvature at the common end
  const splines = ents.filter((e) => e.kind === 'spline');
  if (allPoints.length === 0 && splines.length === 1 && lines.length + circles.length === 1 && ents.length === 2) {
    push('equalCurvature', [splines[0].id, (lines[0] ?? circles[0]).id]);
  }
  if (allPoints.length === 0 && lines.length === 1 && ents.length === 1) {
    push('horizontal', [lines[0].id]);
    push('vertical', [lines[0].id]);
  }
  if (allPoints.length === 0 && lines.length === 2 && ents.length === 2) {
    push('parallel', [lines[0].id, lines[1].id]);
    push('perpendicular', [lines[0].id, lines[1].id]);
    push('equal', [lines[0].id, lines[1].id]);
    push('collinear', [lines[0].id, lines[1].id]);
  }
  if (allPoints.length === 0 && lines.length >= 2 && lines.length === ents.length) {
    // multi-line horizontal/vertical
    for (const l of lines) {
      if (lines.length > 2) {
        push('horizontal', [l.id]);
        break;
      }
    }
  }
  if (allPoints.length === 0 && lines.length === 1 && circles.length === 1 && ents.length === 2) {
    push('tangent', [lines[0].id, circles[0].id]);
    if (circles[0].kind === 'arc') push('equalCurveLength', [lines[0].id, circles[0].id]);
  }
  if (allPoints.length === 0 && circles.length === 2 && ents.length === 2) {
    const a = circles[0], b = circles[1];
    const ca = s.points[(a as { center: Id }).center], cb = s.points[(b as { center: Id }).center];
    const ra = s.scalars[(a as { r: Id }).r], rb = s.scalars[(b as { r: Id }).r];
    const d = Math.hypot(ca.x - cb.x, ca.y - cb.y);
    const internal = d < Math.max(ra, rb);
    push('tangent', [a.id, b.id], internal);
    push('equal', [a.id, b.id]);
    push('concentric', [a.id, b.id]);
    if (a.kind === 'arc' && b.kind === 'arc') {
      push('coradial', [a.id, b.id]);
      push('equalCurveLength', [a.id, b.id]);
    }
  }
  // symmetric: two items + a line (axis) — the axis is the construction line if present, else the last line
  if (sel.length === 3) {
    const axisCandidates = lines.filter((l) => l.construction);
    const axis = axisCandidates[0] ?? (lines.length ? lines[lines.length - 1] : undefined);
    if (axis) {
      const others = sel.filter((i) => i.id !== axis.id);
      if (others.length === 2) {
        const o1 = others[0], o2 = others[1];
        const e1 = s.entities[o1.id], e2 = s.entities[o2.id];
        const bothPoints = (o1.kind === 'point' || e1?.kind === 'point') && (o2.kind === 'point' || e2?.kind === 'point');
        const bothLines = e1?.kind === 'line' && e2?.kind === 'line';
        const bothCircles = e1 && e2 && isCircular(e1) && isCircular(e2);
        if (bothPoints || bothLines || bothCircles) push('symmetric', [o1.id, o2.id, axis.id]);
      }
    }
  }
  return out;
}

/** Smart-dimension: which dimensional constraint fits the selection. */
export function dimensionForSelection(s: Sketch, sel: SelectionItem[]): RelationOption | null {
  const points = sel.filter((i) => i.kind === 'point' || s.entities[i.id]?.kind === 'point').map((i) => i.id);
  const ents = sel.filter((i) => i.kind === 'entity').map((i) => s.entities[i.id]).filter((e) => e && e.kind !== 'point');
  if (points.length === 2 && ents.length === 0) return { kind: 'distance', label: LABELS.distance, refs: points };
  if (points.length === 1 && ents.length === 1 && ents[0].kind === 'line') return { kind: 'distance', label: LABELS.distance, refs: [points[0], ents[0].id] };
  if (points.length === 0 && ents.length === 1) {
    const e = ents[0];
    if (e.kind === 'line') return { kind: 'length', label: LABELS.length, refs: [e.id] };
    if (e.kind === 'circle') return { kind: 'diameter', label: LABELS.diameter, refs: [e.id] };
    if (e.kind === 'arc') return { kind: 'radius', label: LABELS.radius, refs: [e.id] };
  }
  if (points.length === 0 && ents.length === 2 && ents[0].kind === 'line' && ents[1].kind === 'line') {
    // a line parallel to a centerline: the distance to it (placed past the centerline: a doubled distance)
    const [l1, l2] = ents as [Entity & { kind: 'line' }, Entity & { kind: 'line' }];
    const dir = (l: typeof l1) => { const a = s.points[l.p1], b = s.points[l.p2]; const n = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: (b.x - a.x) / n, y: (b.y - a.y) / n }; };
    const par = Math.abs(dir(l1).x * dir(l2).y - dir(l1).y * dir(l2).x) < 1e-6;
    if (par && (l1.construction || l2.construction)) {
      const [line, centre] = l2.construction ? [l1, l2] : [l2, l1];
      return { kind: 'distance', label: LABELS.distance, refs: [line.p1, centre.id] };
    }
    return { kind: 'angle', label: LABELS.angle, refs: [ents[0].id, ents[1].id] };
  }
  if (points.length === 0 && ents.length === 2) {
    const [a, b] = ents;
    const tangentOf = (e: Entity) => sel.find((i) => i.kind === 'entity' && i.id === e.id)?.tangent;
    const cond = (idx: number, e: Entity): Record<number, { entityId: Id; mode: 'min' | 'max' }> | undefined => (tangentOf(e) ? { [idx]: { entityId: e.id, mode: 'min' } } : undefined);
    if (a.kind === 'line' && isCircular(b)) return { kind: 'distance', label: LABELS.distance, refs: [(b as { center: Id }).center, a.id], arcCondition: cond(0, b) };
    if (b.kind === 'line' && isCircular(a)) return { kind: 'distance', label: LABELS.distance, refs: [(a as { center: Id }).center, b.id], arcCondition: cond(0, a) };
    if (isCircular(a) && isCircular(b)) {
      const ac = { ...(cond(0, a) ?? {}), ...(cond(1, b) ?? {}) };
      return { kind: 'distance', label: LABELS.distance, refs: [(a as { center: Id }).center, (b as { center: Id }).center], arcCondition: Object.keys(ac).length ? ac : undefined };
    }
  }
  // a point and an arc/circle: distance to the centre, or to the edge with Shift
  if (points.length === 1 && ents.length === 1 && isCircular(ents[0])) {
    const e = ents[0];
    const t = sel.find((i) => i.kind === 'entity' && i.id === e.id)?.tangent;
    return { kind: 'distance', label: LABELS.distance, refs: [points[0], (e as { center: Id }).center], arcCondition: t ? { 1: { entityId: e.id, mode: 'min' } } : undefined };
  }
  return null;
}

/** Current measured value of a dimensional relation (used as initial value). */
export function measure(s: Sketch, opt: RelationOption): number {
  const P = (id: Id) => (id in s.points ? s.points[id] : s.points[(s.entities[id] as { p: Id }).p]);
  switch (opt.kind) {
    case 'distance': {
      // Arc Condition: the radius of the arc is taken off (Min) or added (Max) for refs measured to the edge
      const adj = (d: number) => {
        for (const [k, ac] of Object.entries(opt.arcCondition ?? {})) {
          void k;
          const r = s.scalars[(s.entities[ac.entityId] as { r: Id }).r] ?? 0;
          d += ac.mode === 'max' ? r : -r;
        }
        return Math.max(0, d);
      };
      const e = s.entities[opt.refs[1]];
      if (e && e.kind === 'line') {
        const p = P(opt.refs[0]), a = s.points[e.p1], b = s.points[e.p2];
        const dx = b.x - a.x, dy = b.y - a.y;
        return adj(Math.abs(dx * (p.y - a.y) - dy * (p.x - a.x)) / (Math.hypot(dx, dy) || 1));
      }
      const a = P(opt.refs[0]), b = P(opt.refs[1]);
      return adj(Math.hypot(a.x - b.x, a.y - b.y));
    }
    case 'hDistance':
      return Math.abs(P(opt.refs[0]).x - P(opt.refs[1]).x);
    case 'vDistance':
      return Math.abs(P(opt.refs[0]).y - P(opt.refs[1]).y);
    case 'length': {
      const e = s.entities[opt.refs[0]] as { p1: Id; p2: Id };
      const a = s.points[e.p1], b = s.points[e.p2];
      return Math.hypot(a.x - b.x, a.y - b.y);
    }
    case 'radius':
      return s.scalars[(s.entities[opt.refs[0]] as { r: Id }).r];
    case 'diameter':
      return 2 * s.scalars[(s.entities[opt.refs[0]] as { r: Id }).r];
    case 'angle': {
      const l1 = s.entities[opt.refs[0]] as { p1: Id; p2: Id };
      const l2 = s.entities[opt.refs[1]] as { p1: Id; p2: Id };
      const a = s.points[l1.p1], b = s.points[l1.p2], c = s.points[l2.p1], d = s.points[l2.p2];
      let deg = ((Math.atan2(d.y - c.y, d.x - c.x) - Math.atan2(b.y - a.y, b.x - a.x)) * 180) / Math.PI;
      while (deg < 0) deg += 360;
      while (deg >= 360) deg -= 360;
      return Math.round(deg * 1000) / 1000;
    }
    default:
      return 0;
  }
}
