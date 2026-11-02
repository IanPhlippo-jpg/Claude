/**
 * The strict QA models (QA report 0.5.10, F152): small parts whose exact volume is known in closed form, built the way
 * a user builds them, so a kernel that quietly rounds the wrong edge or adds material shows up as a wrong volume.
 *
 *   T1  a plate with a hole, a fillet on the rim of the hole; then the hole gets wider (the fillet must follow)
 *   T2  a revolved part with a fillet on a revolve edge; then the profile changes (the fillet must follow)
 *   T3  a fillet on the long top edge of a plate; then a slot is inserted *before* the fillet that splits that edge
 *       (both pieces must be rounded, nothing else)
 */
import { addArc, addCircle, addLine, createSketch } from '../core/sketch/model';
import { createDocument, type Document } from '../core/document/types';
import { rebuildDocument } from '../core/features/rebuild';
import { edgeRef, type BodyEdge } from '../core/features/edgesets';
import type { Sketch } from '../core/sketch/types';

export const PI = Math.PI;
/** the corner cross-section a round of radius R removes from a right-angled convex edge, per unit length */
export const CORNER = (R: number) => R * R * (1 - PI / 4);
/** the distance of that cross-section's centroid from the edge, along either face */
export const CORNER_K = (10 - 3 * PI) / (12 - 3 * PI);
/** a round of radius R on the rim of a hole of radius r (Pappus: the corner section swept around the hole) */
export const RIM_LOSS = (r: number, R: number) => CORNER(R) * 2 * PI * (r + CORNER_K * R);

export function rect(id: string, plane: string, x0: number, y0: number, x1: number, y1: number, circle?: { x: number; y: number; r: number }): Sketch {
  let s = createSketch(id, id, plane);
  const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  if (circle) s = addCircle(s, { x: circle.x, y: circle.y }, circle.r)[0];
  return s;
}
export const extrude = (id: string, sketchId: string, op: 'boss' | 'cut', depth: number, extra: Record<string, unknown> = {}) =>
  ({ id, type: 'extrude', name: id, sketchId, suppressed: false, op, end: 'blind', depth, reverse: false, ...extra }) as never;
export const fillet = (id: string, size: number, edges: BodyEdge[]) => ({ id, type: 'fillet', name: id, suppressed: false, size, edges: edges.map(edgeRef) }) as never;

/** sets the radius of the one circle of a sketch */
export function setCircleRadius(doc: Document, sketchId: string, r: number): void {
  const sk = doc.sketches[sketchId];
  const circle = Object.values(sk.entities).find((e) => e.kind === 'circle') as { r: string };
  sk.scalars[circle.r] = r;
}

/** T1: plate 80 x 80 x 10 (top plane) with a hole of radius r in the middle; the rim of the hole on the top face */
export function t1(r = 17.5): { doc: Document; rim: BodyEdge; sharp: number } {
  const doc = createDocument();
  doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 80, { x: 40, y: 40, r });
  doc.features.push(extrude('e1', 's1', 'boss', 10));
  const b = rebuildDocument(doc).bodies[0];
  const rim = b.edges.filter((e) => e.closed).reduce((a, x) => (x.centroid.y > a.centroid.y ? x : a));
  return { doc, rim, sharp: 80 * 80 * 10 - PI * r * r * 10 };
}
export const T1_EXPECT = (r: number, R = 2) => 80 * 80 * 10 - PI * r * r * 10 - RIM_LOSS(r, R);

/** T3: plate 80 x 40 x 10 (top plane); the long top edge at sketch y = 40 (world z = -40) */
export function t3(): { doc: Document; edge: BodyEdge } {
  const doc = createDocument();
  doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 40);
  doc.features.push(extrude('e1', 's1', 'boss', 10));
  const b = rebuildDocument(doc).bodies[0];
  const edge = b.edges.filter((e) => e.straight && Math.abs(e.length - 80) < 1e-3 && Math.abs(e.centroid.y - 10) < 1e-3).reduce((a, x) => (x.centroid.z < a.centroid.z ? x : a));
  return { doc, edge };
}
/** the plane of the top face of a 10 mm plate on the top plane (sketch x = world x, sketch y = -world z) */
export const TOP_FACE = { id: 'f1', name: 'Face', kind: 'face', u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], origin: [0, 10, 0] };
export type T3Slot = 'through' | 'throughFromFace' | 'blind5' | 'stadium';
/**
 * the slot of T3 across the long top edge, splitting it into 35 + 35: a 10 x 15 rectangle cut through from the top
 * plane, the same sketched on the top face, the same 5 mm deep, or a stadium slot (half rounds at both ends)
 */
export function t3Slot(doc: Document, slot: T3Slot = 'through'): void {
  if (slot === 'through') {
    doc.sketches.s2 = rect('s2', 'top', 35, 25, 45, 45);
    doc.features.push(extrude('c1', 's2', 'cut', 0, { end: 'throughAll' }));
  } else if (slot === 'stadium') {
    let s = createSketch('s2', 's2', 'top');
    s = addLine(s, { x: 35, y: 25 }, { x: 35, y: 45 })[0];
    s = addLine(s, { x: 45, y: 45 }, { x: 45, y: 25 })[0];
    s = addArc(s, { x: 40, y: 45 }, { x: 45, y: 45 }, { x: 35, y: 45 }, true)[0];
    s = addArc(s, { x: 40, y: 25 }, { x: 35, y: 25 }, { x: 45, y: 25 }, true)[0];
    doc.sketches.s2 = s;
    doc.features.push(extrude('c1', 's2', 'cut', 0, { end: 'throughAll' }));
  } else {
    doc.planes.f1 = TOP_FACE as never;
    doc.sketches.s2 = rect('s2', 'f1', 35, 25, 45, 45);
    doc.features.push(slot === 'blind5' ? extrude('c1', 's2', 'cut', 5, { reverse: true }) : extrude('c1', 's2', 'cut', 0, { end: 'throughAll', reverse: true }));
  }
}
export const T3_SHARP = 80 * 40 * 10;
export const T3_WITH_SLOT_EXPECT = (slot: T3Slot = 'through', R = 2) =>
  T3_SHARP - (slot === 'blind5' ? 10 * 15 * 5 : slot === 'stadium' ? (10 * 15 + (PI * 25) / 2) * 10 : 10 * 15 * 10) - 2 * 35 * CORNER(R);

/**
 * T1 made other ways: the hole as an extruded cut of a circle sketched on the top face, as a Hole Tool hole, or the
 * rim on the bottom face of the plate-sketch hole; the rim to fillet
 */
export function holeVariant(how: 'cut' | 'holeTool' | 'bottomRim'): { doc: Document; rim: BodyEdge } {
  const doc = createDocument();
  if (how === 'bottomRim') {
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 80, { x: 40, y: 40, r: 17.5 });
    doc.features.push(extrude('e1', 's1', 'boss', 10));
  } else {
    doc.sketches.s1 = rect('s1', 'top', 0, 0, 80, 80);
    doc.features.push(extrude('e1', 's1', 'boss', 10));
    doc.planes.f1 = TOP_FACE as never;
    if (how === 'cut') {
      let c = createSketch('s2', 's2', 'f1');
      c = addCircle(c, { x: 40, y: 40 }, 17.5)[0];
      doc.sketches.s2 = c;
      doc.features.push(extrude('c1', 's2', 'cut', 0, { end: 'throughAll', reverse: true }));
    } else {
      doc.features.push({ id: 'h1', type: 'hole', name: 'h1', suppressed: false, plane: 'f1', points: [{ x: 40, y: 40 }], diameter: 35, depth: 0, holeType: 'simple', cbDiameter: 40, cbDepth: 3, csDiameter: 40, csAngle: 90 } as never);
    }
  }
  const rims = rebuildDocument(doc).bodies[0].edges.filter((e) => e.closed);
  const rim = how === 'bottomRim' ? rims.reduce((a, x) => (x.centroid.y < a.centroid.y ? x : a)) : rims.reduce((a, x) => (x.centroid.y > a.centroid.y ? x : a));
  return { doc, rim };
}
