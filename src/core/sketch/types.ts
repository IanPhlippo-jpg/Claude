/** Sketch data model — plain JSON so it can be snapshotted, persisted and sent to workers. */

export type Id = string;

export interface SketchPoint {
  x: number;
  y: number;
}

export type EntityKind = 'point' | 'line' | 'circle' | 'arc' | 'spline';

interface EntityBase {
  id: Id;
  construction: boolean;
}

export interface PointEntity extends EntityBase {
  kind: 'point';
  p: Id;
}
export interface LineEntity extends EntityBase {
  kind: 'line';
  p1: Id;
  p2: Id;
}
export interface CircleEntity extends EntityBase {
  kind: 'circle';
  center: Id;
  /** id of the radius parameter */
  r: Id;
}
export interface ArcEntity extends EntityBase {
  kind: 'arc';
  center: Id;
  start: Id;
  end: Id;
  r: Id;
  /** counter-clockwise from start to end */
  ccw: boolean;
}
export interface SplineEntity extends EntityBase {
  kind: 'spline';
  /** through-points (Catmull-Rom) */
  points: Id[];
}

export type Entity = PointEntity | LineEntity | CircleEntity | ArcEntity | SplineEntity;

export type ConstraintKind =
  | 'coincident'
  | 'pointOnEntity'
  | 'horizontal'
  | 'vertical'
  | 'parallel'
  | 'perpendicular'
  | 'tangent'
  | 'equal'
  | 'concentric'
  | 'collinear'
  | 'midpoint'
  | 'symmetric'
  | 'fix'
  // dimensional
  | 'distance'
  | 'hDistance'
  | 'vDistance'
  | 'length'
  | 'radius'
  | 'diameter'
  | 'angle';

export interface Constraint {
  id: Id;
  kind: ConstraintKind;
  /** referenced point ids / entity ids, meaning depends on kind */
  refs: Id[];
  /** dimension value (mm / degrees) when dimensional */
  value?: number;
  /** driven = reference dimension, not solved */
  driven?: boolean;
  /** label placement offset for dimensions (sketch units) */
  labelOffset?: SketchPoint;
  /** for tangent circle-circle: internal tangency */
  internal?: boolean;
  /** fix: the locked position */
  target?: SketchPoint;
}

export interface Sketch {
  id: Id;
  name: string;
  plane: 'front' | 'top' | 'right';
  points: Record<Id, SketchPoint>;
  /** scalar parameters (radii) */
  scalars: Record<Id, number>;
  entities: Record<Id, Entity>;
  constraints: Record<Id, Constraint>;
  /** insertion order for deterministic rendering / solving */
  entityOrder: Id[];
  constraintOrder: Id[];
  /** id of the origin point, always fixed */
  origin: Id;
}

export const DIMENSION_KINDS: ReadonlySet<ConstraintKind> = new Set([
  'distance',
  'hDistance',
  'vDistance',
  'length',
  'radius',
  'diameter',
  'angle',
]);

export function isDimension(c: Constraint): boolean {
  return DIMENSION_KINDS.has(c.kind);
}
