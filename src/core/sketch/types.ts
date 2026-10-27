/** Sketch data model — plain JSON so it can be snapshotted, persisted and sent to workers. */

export type Id = string;

export interface SketchPoint {
  x: number;
  y: number;
}

export type EntityKind = 'point' | 'line' | 'circle' | 'arc' | 'spline' | 'ellipse' | 'ellipseArc' | 'conic' | 'text';

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
  /** through-points (Catmull-Rom); for a Style Spline the control polygon of a Bezier curve */
  points: Id[];
  /** Style Spline: points are Bezier control points (the curve passes through the first and last only) */
  style?: boolean;
  /** Equation Driven Curve: the explicit equation y = f(x) and its range (the points are samples of it) */
  equation?: { expr: string; x1: number; x2: number };
}

/** Ellipse: centre, end point of the major axis, minor radius (scalar). */
export interface EllipseEntity extends EntityBase {
  kind: 'ellipse';
  center: Id;
  major: Id;
  r2: Id;
}
/** Partial Ellipse: an ellipse (centre, major axis end, minor radius) from start to end point. */
export interface EllipseArcEntity extends EntityBase {
  kind: 'ellipseArc';
  center: Id;
  major: Id;
  r2: Id;
  start: Id;
  end: Id;
  /** counter-clockwise from start to end */
  ccw: boolean;
}
/** Conic (and Parabola, rho = 0.5): a rational quadratic Bezier from start to end with its top vertex as control point. */
export interface ConicEntity extends EntityBase {
  kind: 'conic';
  start: Id;
  end: Id;
  control: Id;
  /** 0 < rho < 1: < 0.5 ellipse, 0.5 parabola, > 0.5 hyperbola */
  rho: number;
  /** created with the Parabola tool */
  parabola?: boolean;
}
/** Sketch Text: glyph outlines at an anchor point (lower left of the text), height in mm. */
export interface TextEntity extends EntityBase {
  kind: 'text';
  anchor: Id;
  text: string;
  height: number;
  bold?: boolean;
  /** rotation in degrees */
  angle?: number;
  /** width factor (100 = normal) and character spacing (100 = normal), as the Sketch Text Property Panel */
  widthFactor?: number;
  spacing?: number;
}

export type Entity = PointEntity | LineEntity | CircleEntity | ArcEntity | SplineEntity | EllipseEntity | EllipseArcEntity | ConicEntity | TextEntity;

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
  /** two arcs with the same centre and radius */
  | 'coradial'
  /** two curves (lines, arcs, circles) of the same length */
  | 'equalCurveLength'
  | 'midpoint'
  | 'symmetric'
  | 'fix'
  /** Pierce: a point held where a curve of another sketch passes through this sketch's plane */
  | 'pierce'
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
  /** Pierce: the curve (entity of another sketch) the point pierces */
  pierce?: { sketchId: Id; entityId: Id };
  /** driven = reference dimension, not solved */
  driven?: boolean;
  /** Mark For Drawing: the dimension is imported into a drawing by Model Items (absent = yes) */
  markForDrawing?: boolean;
  /** label placement offset for dimensions (sketch units) */
  labelOffset?: SketchPoint;
  /** for tangent circle-circle: internal tangency */
  internal?: boolean;
  /**
   * distance to an arc/circle measured to its edge instead of its centre (Shift+click on the arc,
   * "Arc Condition" Min / Max): keyed by the index in refs, the entity id of the arc that ref's centre belongs to
   */
  arcCondition?: Record<number, { entityId: Id; mode: 'min' | 'max' }>;
  /** Dimension Text of the Property Panel: <DIM> is the value, the rest is shown around it (2X <DIM>, <DIM> THRU) */
  dimText?: string;
  /** dimension Property Panel: own name (D1 when absent), tolerance, precision, dual display, arrows, units, font, justification */
  name?: string;
  tol?: { type: 'none' | 'basic' | 'bilateral' | 'limit' | 'symmetric' | 'min' | 'max'; plus?: number; minus?: number };
  precision?: number;
  dual?: boolean;
  /** Dimension Text ▸ All uppercase */
  uppercase?: boolean;
  arrows?: 'smart' | 'inside' | 'outside';
  arrowStyle?: 'filled' | 'open' | 'dot' | 'slash';
  unitOverride?: 'mm' | 'cm' | 'in';
  fontSize?: number;
  justify?: 'left' | 'center' | 'right';
  /** fix: the locked position */
  target?: SketchPoint;
}

export interface Sketch {
  /** Sketch Color: the colour of the sketch while it is not edited (a layout sketch in its own colour) */
  color?: string;
  id: Id;
  name: string;
  /** 'front' | 'top' | 'right' or the id of a plane on a body face (Document.planes) */
  plane: string;
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
