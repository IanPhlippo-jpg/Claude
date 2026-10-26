import type * as THREE from 'three';
import type { PlaneDef } from '../document/types';
import type { Sketch } from '../sketch/types';
import type { ContourRegion } from './regions';
import type { BodyEdge } from './edgesets';

/**
 * The B-rep kernel the rebuild can use next to the mesh kernel (QA F51, docs/14). The rebuild only sees this interface;
 * the OpenCascade implementation (src/core/occt/brep.ts) registers itself where it is loaded (the OpenCascade worker and
 * the unit tests). Without a registered kernel every feature is built by the mesh kernel, as before.
 *
 * A body stays a B-rep solid as long as every feature that changes it has a B-rep implementation; the first feature
 * without one continues on the tessellation in the mesh kernel (the fallback), so every model keeps building.
 */
export type BrepShape = { readonly __brep: unique symbol };

export interface BrepKernel {
  /** prism of the regions of a sketch from zStart to zStart + total along the plane normal (sketch units = mm) */
  extrude(sketch: Sketch, plane: PlaneDef, regions: ContourRegion[], zStart: number, total: number): BrepShape | null;
  /** revolve the regions about the axis line of the sketch (points in sketch coordinates), angle in degrees from the plane */
  revolve(sketch: Sketch, plane: PlaneDef, regions: ContourRegion[], axis: [{ x: number; y: number }, { x: number; y: number }], angle: number, startAngle: number): BrepShape | null;
  /**
   * a solid of revolution about the axis through `origin` along `axis` (unit): stacked frustums, each from radius r0 at
   * t0 to r1 at t1 along the axis (a cylinder when r0 = r1, a cone to a point when one radius is 0); `ref` is any unit
   * vector perpendicular to the axis
   */
  axisymmetric(origin: [number, number, number], axis: [number, number, number], ref: [number, number, number], parts: { t0: number; t1: number; r0: number; r1: number }[]): BrepShape;
  /** sweep the profile regions along the open chain of lines, arcs and splines of the path sketch (profile moves with the path) */
  sweep(profile: Sketch, profilePlane: PlaneDef, regions: ContourRegion[], path: Sketch, pathPlane: PlaneDef): BrepShape | null;
  /** a rigid move (THREE.Matrix4 elements, column-major); null for a matrix that mirrors or scales */
  transform(shape: BrepShape, m: ArrayLike<number>): BrepShape | null;
  /** the mirror image about the plane through origin with this normal */
  mirror(shape: BrepShape, origin: [number, number, number], normal: [number, number, number]): BrepShape;
  /** a loft between the outer contours of two profile regions (one region each) */
  loft(s1: Sketch, p1: PlaneDef, r1: ContourRegion, s2: Sketch, p2: PlaneDef, r2: ContourRegion): BrepShape | null;
  /** the shape without what lies on the side of the plane the normal points to */
  clipByPlane(shape: BrepShape, point: [number, number, number], normal: [number, number, number]): BrepShape;
  /** the solids of `a` minus `b` that touch the plane (Up To Body: the piece from the sketch plane to the body) */
  cutKeepTouching(a: BrepShape, b: BrepShape, point: [number, number, number], normal: [number, number, number]): BrepShape | null;
  /** a closed mesh of planar faces as a B-rep solid (coplanar triangles merged into one face); null when it does not close */
  fromMesh(g: THREE.BufferGeometry): BrepShape | null;
  /** a prism of a closed loop of lines and arcs (through m) in sketch coordinates of the plane */
  extrudeLoop(plane: PlaneDef, loop: { a: { x: number; y: number }; b: { x: number; y: number }; m?: { x: number; y: number } }[], zStart: number, total: number): BrepShape | null;
  fuse(a: BrepShape, b: BrepShape): BrepShape;
  cut(a: BrepShape, b: BrepShape): BrepShape;
  /** what the two solids have in common */
  common(a: BrepShape, b: BrepShape): BrepShape;
  /** constant radius fillet / equal distance chamfer on the B-rep edges that lie on these mesh edges */
  fillet(shape: BrepShape, edges: BodyEdge[], radius: number): BrepShape;
  chamfer(shape: BrepShape, edges: BodyEdge[], distance: number): BrepShape;
  /** fillet with a radius per edge; r2 makes it vary linearly from r1 at the start of the mesh edge to r2 at its end */
  filletEach(shape: BrepShape, items: { edge: BodyEdge; r1: number; r2?: number }[]): BrepShape;
  /** hollow the solid: wall `thickness` inward (outward when set), the faces at these planes left open */
  shell(shape: BrepShape, openFaces: { normal: [number, number, number]; point: [number, number, number] }[], thickness: number, outward: boolean): BrepShape;
  /**
   * draft faces about a neutral plane: the faces at these planes, or 'sides' = every face parallel to the pull direction;
   * the angle in degrees (its sign follows OpenCascade's convention; the rebuild checks it against the mesh kernel)
   */
  draft(shape: BrepShape, faces: { normal: [number, number, number]; point: [number, number, number] }[] | 'sides', pull: [number, number, number], angle: number, neutral: { origin: [number, number, number]; normal: [number, number, number] }): BrepShape;
  /** triangles for the viewport and the mesh kernel (non-indexed, with the normals of the surfaces) */
  tessellate(shape: BrepShape): THREE.BufferGeometry;
  volume(shape: BrepShape): number;
  /** frees what the kernel made since the last call (OpenCascade objects live outside the JS heap), except `keep` */
  release(keep?: BrepShape[]): void;
}

let current: BrepKernel | null = null;

export function setBrepKernel(k: BrepKernel | null): void {
  current = k;
}

export function brepKernel(): BrepKernel | null {
  return current;
}
