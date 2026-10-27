import type { Id } from '../sketch/types';
import type { EdgeRef } from '../features/edgesets';

/* the curve features (Features ▸ Curves), kept beside types.ts */

/**
 * Curves ▸ Curve Through XYZ Points / Curve Through Reference Points: a smooth curve (Curve1) through points typed in a
 * table (or read from a file), or through Reference Geometry ▸ Points in the order picked.
 */
export interface CurvePointsFeature {
  id: Id;
  type: 'curvePoints';
  name: string;
  suppressed: boolean;
  points?: [number, number, number][];
  refPoints?: Id[];
}

/**
 * Composite Curve (Features ▸ Curves ▸ Composite Curve): model edges, sketches and curves joined end to end into one
 * curve (CompCurve1), for instance the path of a sweep along the edges of a body.
 */
export interface CompositeCurveFeature {
  id: Id;
  type: 'compositeCurve';
  name: string;
  suppressed: boolean;
  /** model edges, found again after a rebuild like the edges of a fillet */
  edges: EdgeRef[];
  /** sketches and curve features (3D sketch) whose curves join in */
  sketches: Id[];
}
