/**
 * The geometric tolerances of the kernel, in model units (mm), in one place so every check uses the same numbers.
 * The mesh kernel welds points, finds references after a rebuild and tests planarity against these.
 */
export const TOL = {
  /** two points are the same point */
  point: 1e-3,
  /** a point lies in a plane / two parallel planes are the same plane */
  plane: 1e-3,
  /** an edge or face reference still matches after a rebuild (distance between centroids): the most it may be, see referenceTol */
  reference: 0.5,
  /** the least a reference margin may be, however small the edge or face */
  referenceMin: 0.01,
  /** two directions are parallel (dot product of unit vectors) */
  parallel: 0.999,
} as const;

/**
 * How far the centroid of an edge or face may lie from where its reference was taken and still be the same one (QA
 * 0.5.14 P3-6): a quarter of its size (the length of an edge, the square root of a face's area), at most TOL.reference
 * and at least TOL.referenceMin. A fixed 0.5 mm let the neighbour of a small edge stand in for it (the edges of a 0.3 mm
 * chamfer lie 0.3 to 0.42 mm apart); from 2 mm upwards nothing changes.
 */
export function referenceTol(size: number): number {
  if (!(size > 0)) return TOL.reference;
  return Math.min(TOL.reference, Math.max(TOL.referenceMin, size / 4));
}
