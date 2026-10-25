/**
 * The geometric tolerances of the kernel, in model units (mm), in one place so every check uses the same numbers.
 * The mesh kernel welds points, finds references after a rebuild and tests planarity against these.
 */
export const TOL = {
  /** two points are the same point */
  point: 1e-3,
  /** a point lies in a plane / two parallel planes are the same plane */
  plane: 1e-3,
  /** an edge or face reference still matches after a rebuild (distance between centroids) */
  reference: 0.5,
  /** two directions are parallel (dot product of unit vectors) */
  parallel: 0.999,
} as const;
