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
import * as THREE from 'three';

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

/*
 * Topological naming over sweep, loft, pattern and shell (QA report 0.5.11, F47 / parity row 29):
 *
 *   T4  a 10 x 6 rectangle swept along a straight path of 50 (or 50 and a quarter arc); a fillet R1 on a long edge;
 *       then the straight part gets 70 long
 *   T5  a loft between two equal 20 x 10 rectangles 30 apart; a fillet R1 on a side edge; then the distance becomes 45
 *   T6  a 10 x 10 x 5 nub on a plate, patterned x3 at 20; a fillet R1 on a top edge of the 2nd nub (or of every nub);
 *       then the pattern gets 5 instances (the fillet stays on the same nubs, nothing extra)
 *   T7  a block 40 x 30 x 20 with a fillet R2 on a vertical edge, then a shell of 1 with the top face open
 */

/** the straight edges along this world axis whose centroid has these coordinates (to 0.01): a sharp edge still there */
export function edgesAt(edges: BodyEdge[], axis: 'x' | 'y' | 'z', at: { x?: number; y?: number; z?: number }): BodyEdge[] {
  const k = { x: 0, y: 1, z: 2 }[axis];
  return edges.filter((e) => {
    if (!e.straight || e.closed) return false;
    const d = e.points[e.points.length - 1].clone().sub(e.points[0]).normalize();
    if (Math.abs(d.getComponent(k)) < 0.999) return false;
    return (['x', 'y', 'z'] as const).every((c) => at[c] === undefined || Math.abs(e.centroid[c] - at[c]!) < 1e-2);
  });
}
/** the one edge `edgesAt` finds (picked by position, never by length); any other count throws */
export function edgeAt(edges: BodyEdge[], axis: 'x' | 'y' | 'z', at: { x?: number; y?: number; z?: number }): BodyEdge {
  const hits = edgesAt(edges, axis, at);
  if (hits.length !== 1) throw new Error(`edgeAt(${axis}, ${JSON.stringify(at)}): ${hits.length} edges`);
  return hits[0];
}
/** the edges whose polyline passes within 0.01 of the point */
export function edgesThrough(edges: BodyEdge[], p: [number, number, number]): BodyEdge[] {
  const q = new THREE.Vector3(...p), line = new THREE.Line3(), c = new THREE.Vector3();
  return edges.filter((e) => e.points.some((a, i) => i > 0 && line.set(e.points[i - 1], a).closestPointToPoint(q, true, c).distanceTo(q) < 1e-2));
}

/** the radius of the T4 path's arc (about world y, turning towards -x after the straight part) */
export const T4_ARC = 30;
/**
 * T4: the profile x -5..5, y -3..3 on the front plane, swept along a path on the top plane: a line from z = 0 to z = L,
 * with `arc` then a quarter arc of radius 30 turning towards -x (the edge at x = +5 is on its outside)
 */
export function t4(L = 50, arc = false): { doc: Document; edge: BodyEdge } {
  const doc = createDocument();
  doc.sketches.s1 = rect('s1', 'front', -5, -3, 5, 3);
  const [p, line] = addLine(createSketch('p1', 'p1', 'top'), { x: 0, y: 0 }, { x: 0, y: -L });
  doc.sketches.p1 = arc ? addArc(p, { x: -T4_ARC, y: -L }, { x: -T4_ARC, y: -L - T4_ARC }, line.p2, true)[0] : p;
  doc.features.push({ id: 'sw1', type: 'sweep', name: 'sw1', suppressed: false, sketchId: 's1', pathSketchId: 'p1', op: 'boss' } as never);
  const b = rebuildDocument(doc).bodies[0];
  if (!arc) return { doc, edge: edgeAt(b.edges, 'z', { x: 5, y: 3 }) };
  const hits = edgesThrough(b.edges, [5, 3, L / 2]);
  if (hits.length !== 1) throw new Error(`t4 arc: ${hits.length} edges through (5, 3, ${L / 2})`);
  return { doc, edge: hits[0] };
}
/** the T4 path from `from` to `to` long: everything after its start point moves along the line */
export function setPathLength(doc: Document, from: number, to: number): void {
  for (const p of Object.values(doc.sketches.p1.points)) if (p.y < -1e-9) p.y -= to - from;
}
/**
 * the swept block (Pappus over the arc) minus the round on the edge at x = +5, y = +3; on the arc that edge runs at
 * radius 30 + 5 and the corner section's centroid lies CORNER_K * R inside it
 */
export const T4_EXPECT = (L: number, arc = false, R = 1) =>
  10 * 6 * (L + (arc ? (PI / 2) * T4_ARC : 0)) - CORNER(R) * (L + (arc ? (PI / 2) * (T4_ARC + 5 - CORNER_K * R) : 0));

/** T5: two 20 x 10 rectangles (x -10..10, y -5..5) on the front plane and on a plane h in front of it, lofted */
export function t5(h = 30): { doc: Document; edge: BodyEdge } {
  const doc = createDocument();
  doc.planes.pl1 = { id: 'pl1', name: 'Plane1', origin: [0, 0, h], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], kind: 'reference' };
  doc.sketches.s1 = rect('s1', 'front', -10, -5, 10, 5);
  doc.sketches.s2 = rect('s2', 'pl1', -10, -5, 10, 5);
  doc.features.push({ id: 'lf1', type: 'loft', name: 'lf1', suppressed: false, sketchId: 's1', sketchId2: 's2', op: 'boss' } as never);
  const b = rebuildDocument(doc).bodies[0];
  return { doc, edge: edgeAt(b.edges, 'z', { x: 10, y: 5 }) };
}
export const setLoftDistance = (doc: Document, h: number) => { doc.planes.pl1.origin = [0, 0, h]; };
export const T5_EXPECT = (h: number, R = 1) => 20 * 10 * h - h * CORNER(R);

/** the plane of the top face of the 5 mm plate of T6 */
const T6_TOP = { ...TOP_FACE, origin: [0, 5, 0] };
/**
 * T6: plate 100 x 20 x 5 (top plane, world z 0..-20), a 10 x 10 x 5 nub at x 5..15, z -5..-15 on its top face, the nub
 * patterned along x at 20 (instances at x 5, 25, 45, ...); `nubs` are the instances (1 = the seed) whose top edge at
 * the +x side (x = 15, 35, 55 ..., y = 10) is returned
 */
export function t6(count = 3, nubs: number[] = [2]): { doc: Document; edges: BodyEdge[] } {
  const doc = createDocument();
  doc.sketches.s1 = rect('s1', 'top', 0, 0, 100, 20);
  doc.features.push(extrude('e1', 's1', 'boss', 5));
  doc.planes.f1 = T6_TOP as never;
  doc.sketches.s2 = rect('s2', 'f1', 5, 5, 15, 15);
  doc.features.push(extrude('e2', 's2', 'boss', 5));
  doc.features.push({ id: 'lp1', type: 'linearPattern', name: 'lp1', suppressed: false, featureIds: ['e2'], dir1: { axis: [1, 0, 0], spacing: 20, count } } as never);
  const b = rebuildDocument(doc).bodies[0];
  return { doc, edges: nubs.map((i) => edgeAt(b.edges, 'z', { x: 15 + 20 * (i - 1), y: 10 })) };
}
export function setPatternCount(doc: Document, count: number): void {
  const p = doc.features.find((f) => f.id === 'lp1') as unknown as { dir1: { count: number } };
  p.dir1.count = count;
}
export const T6_SHARP = (count: number) => 100 * 20 * 5 + count * 10 * 10 * 5;
export const T6_EXPECT = (count: number, filleted: number, R = 1) => T6_SHARP(count) - filleted * 10 * CORNER(R);

/** T7: block 40 x 30 x 20 (top plane: x 0..40, z 0..-30, y 0..20); the vertical edge at x = 40, z = -30 */
export function t7(): { doc: Document; edge: BodyEdge } {
  const doc = createDocument();
  doc.sketches.s1 = rect('s1', 'top', 0, 0, 40, 30);
  doc.features.push(extrude('e1', 's1', 'boss', 20));
  const b = rebuildDocument(doc).bodies[0];
  return { doc, edge: edgeAt(b.edges, 'y', { x: 40, z: -30 }) };
}
/** the shell of T7: wall t inward, the top face (y = 20) open */
export const shell = (id: string, t: number) =>
  ({ id, type: 'shell', name: id, suppressed: false, thickness: t, faces: [{ normal: [0, 1, 0], point: [20, 20, -15] }] }) as never;
/**
 * T7 after the shell: the rounded block minus its cavity; the cavity is the block offset inward by t (open at the top,
 * so h - t deep) and its corner under the fillet is rounded with R - t (the offset of the round)
 */
export const T7_EXPECT = (R = 2, t = 1) => 40 * 30 * 20 - 20 * CORNER(R) - ((40 - 2 * t) * (30 - 2 * t) * (20 - t) - (20 - t) * CORNER(R - t));
/** the same shell without the fillet */
export const T7_SHARP = (t = 1) => 40 * 30 * 20 - (40 - 2 * t) * (30 - 2 * t) * (20 - t);
