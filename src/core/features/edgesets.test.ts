import { describe, expect, it } from 'vitest';
import { createDocument } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { edgeRef } from './edgesets';
import { meshVolume } from './solid';
import { REFERENCE_PLANE_DEFS } from './planes';

describe('body edges after booleans', () => {
  it('a plate with two holes has 12 straight edges and 4 closed rims, no fragments', () => {
    const doc = createDocument();
    let s = createSketch('sk1', 'Sketch1', 'top');
    const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 80 }, { x: 0, y: 80 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    s = addCircle(s, { x: 40, y: 40 }, 17.5)[0];
    doc.sketches.sk1 = s;
    doc.planes.pl1 = { ...REFERENCE_PLANE_DEFS.top, id: 'pl1', name: 'Face1', origin: [40, 10, -40] };
    doc.sketches.sk2 = addCircle(createSketch('sk2', 'Sketch2', 'pl1'), { x: 20, y: 20 }, 5)[0];
    doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
    doc.features.push({ id: 'f2', type: 'extrude', name: 'C', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: true });
    const body = rebuildDocument(doc).bodies[0];
    const straight = body.edges.filter((e) => e.straight);
    const closed = body.edges.filter((e) => e.closed);
    expect(straight).toHaveLength(12);
    expect(closed).toHaveLength(4);
    expect(body.edges).toHaveLength(16);
    const rims = closed.map((e) => Math.round(e.length)).sort((a, b) => a - b);
    expect(rims).toEqual([31, 31, 110, 110]);
  });
});

describe('edge references survive an edit of an earlier feature (F47)', () => {
  const plate = (depth: number) => {
    const doc = createDocument();
    let s = createSketch('sk1', 'Sketch1', 'top');
    const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 80 }, { x: 0, y: 80 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    doc.sketches.sk1 = s;
    doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth, reverse: false });
    return doc;
  };
  it('a fillet on a top edge follows the edge when the plate gets thicker', () => {
    const doc = plate(10);
    const body = rebuildDocument(doc).bodies[0];
    const top = body.edges.filter((e) => e.straight && Math.abs(e.centroid.y - 10) < 1e-6);
    expect(top).toHaveLength(4);
    const edge = top.reduce((a, b) => (b.centroid.x > a.centroid.x ? b : a));
    doc.features.push({ id: 'r1', type: 'fillet', name: 'Fillet1', suppressed: false, size: 3, edges: [edgeRef(edge)] } as never);
    const before = rebuildDocument(doc);
    expect(before.errors.r1).toBeUndefined();
    const lossPerMm = (1 - Math.PI / 4) * 9;
    expect(Math.abs(meshVolume(before.bodies[0].geometry) - (80 * 80 * 10 - lossPerMm * 80))).toBeLessThan(25);
    // the plate becomes 25 thick: the edge is now 15 higher, same direction, same two faces
    (doc.features[0] as { depth: number }).depth = 25;
    const after = rebuildDocument(doc);
    expect(after.errors.r1).toBeUndefined();
    expect(Math.abs(meshVolume(after.bodies[0].geometry) - (80 * 80 * 25 - lossPerMm * 80))).toBeLessThan(25);
  });
  it('a reference from an older file (no normals) still matches where the edge is', () => {
    const doc = plate(10);
    const body = rebuildDocument(doc).bodies[0];
    const edge = body.edges.filter((e) => e.straight && Math.abs(e.centroid.y - 10) < 1e-6)[0];
    const { dir: _d, normals: _n, ...old } = edgeRef(edge);
    void _d; void _n;
    doc.features.push({ id: 'r1', type: 'chamfer', name: 'Chamfer1', suppressed: false, size: 2, edges: [old] } as never);
    expect(rebuildDocument(doc).errors.r1).toBeUndefined();
  });

  it('a fillet keeps its edge by the names of its faces where an equal edge lies nearer (F47)', () => {
    // a step: two convex edges along Z with the same direction and the same two face normals (+X and +Y)
    const doc = createDocument();
    let s = createSketch('sk1', 'Sketch1', 'front');
    const c = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 20 }, { x: 0, y: 20 }];
    for (let i = 0; i < c.length; i++) s = addLine(s, c[i], c[(i + 1) % c.length])[0];
    doc.sketches.sk1 = s;
    doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false });
    const along = (b: { edges: import('./edgesets').BodyEdge[] }, x: number, y: number) => b.edges.find((e) => e.straight && Math.abs(e.centroid.x - x) < 0.01 && Math.abs(e.centroid.y - y) < 0.01 && Math.abs(e.points[0].z - e.points[e.points.length - 1].z) > 19);
    const body = rebuildDocument(doc).bodies[0];
    const step = along(body, 30, 20)!;
    expect(step).toBeTruthy();
    const ref = edgeRef(step);
    expect(ref.faces).toBeTruthy();
    doc.features.push({ id: 'r1', type: 'fillet', name: 'Fillet1', suppressed: false, size: 3, edges: [ref] } as never);
    // the tall part grows from 20 to 60: the step edge moves 40 up, the other convex edge (60, 10) is now nearer
    const sk = doc.sketches.sk1;
    doc.sketches.sk1 = { ...sk, points: Object.fromEntries(Object.entries(sk.points).map(([id, p]) => [id, Math.abs(p.y - 20) < 1e-9 ? { ...p, y: 60 } : p])) };
    const after = rebuildDocument(doc);
    expect(after.errors.r1).toBeUndefined();
    expect(along(after.bodies[0], 30, 60)).toBeUndefined(); // rounded
    expect(along(after.bodies[0], 60, 10)).toBeTruthy(); // still sharp
    // without the names the step edge is lost (the moved-edge guess does not find it)
    const { faces: _f, ...geometric } = ref;
    void _f;
    (doc.features[1] as { edges: unknown[] }).edges = [geometric];
    const oldR = rebuildDocument(doc);
    const old = oldR.bodies[0];
    expect(along(old, 30, 60)).toBeTruthy();
  });
});
