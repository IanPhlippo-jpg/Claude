import { describe, expect, it } from 'vitest';
import { addArc, addLine, createSketch } from '../sketch/model';
import { createDocument, type Feature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { facetPolyline } from './surfaces';

const rect = (id: string, plane: string, x0: number, y0: number, x1: number, y1: number) => {
  let s = createSketch(id, id, plane);
  const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  return s;
};
const box = () => {
  const doc = createDocument();
  doc.sketches = { a: rect('a', 'top', 0, 0, 40, -40) };
  doc.features = [
    { id: 'k1', type: 'sketch', name: 'S1', sketchId: 'a', suppressed: false } as Feature,
    { id: 'e1', type: 'extrude', name: 'B', sketchId: 'a', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false } as Feature,
  ];
  return doc;
};

describe('curve and split options of the intended design', () => {
  it('Split Line > Intersection: a plane at mid height splits the four side faces', () => {
    const doc = box();
    doc.planes.p10 = { id: 'p10', name: 'Plane1', origin: [0, 10, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], kind: 'reference' };
    const before = rebuildDocument(doc).bodies[0].faces.length;
    doc.features.push({ id: 's1', type: 'splitLine', name: 'Split Line1', suppressed: false, sketchId: '', splitType: 'intersection', plane: 'p10' } as Feature);
    const r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(r.bodies[0].faces.length).toBe(before + 4);
  });
  it('Split Line > Silhouette: a cylinder seen along an axis across it splits into two halves', () => {
    const doc = createDocument();
    let s = createSketch('c', 'c', 'top');
    s = addArc(s, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: -10, y: 0 }, true)[0];
    s = addArc(s, { x: 0, y: 0 }, { x: -10, y: 0 }, { x: 10, y: 0 }, true)[0];
    doc.sketches = { c: s };
    doc.features = [
      { id: 'k1', type: 'sketch', name: 'S1', sketchId: 'c', suppressed: false } as Feature,
      { id: 'e1', type: 'extrude', name: 'B', sketchId: 'c', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false } as Feature,
    ];
    const curvedBefore = rebuildDocument(doc).bodies[0].faces.filter((f) => f.curved).length;
    doc.features.push({ id: 's1', type: 'splitLine', name: 'Split Line1', suppressed: false, sketchId: '', splitType: 'silhouette', plane: 'front' } as Feature);
    const r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(r.bodies[0].faces.filter((f) => f.curved).length).toBe(curvedBefore + 1);
  });
  it('Projected Curve > Sketch on sketch: a line on Top and a line on Front meet in a 3D line', () => {
    const doc = createDocument();
    let a = createSketch('a', 'a', 'top');
    a = addLine(a, { x: 0, y: 0 }, { x: 40, y: -40 })[0];
    let b = createSketch('b', 'b', 'front');
    b = addLine(b, { x: 0, y: 0 }, { x: 40, y: 20 })[0];
    doc.sketches = { a, b };
    doc.features = [
      { id: 'k1', type: 'sketch', name: 'S1', sketchId: 'a', suppressed: false } as Feature,
      { id: 'k2', type: 'sketch', name: 'S2', sketchId: 'b', suppressed: false } as Feature,
      { id: 'p1', type: 'projectedCurve', name: 'Curve1', suppressed: false, sketchId: 'a', onSketch: true, sketchId2: 'b' } as Feature,
    ];
    const r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    const c = r.curves!.find((x) => x.id === 'p1')!;
    const end = c.points[c.points.length - 1];
    // at x = 40 the curve is at height 20 (front) and depth 40 (top)
    expect(end.x).toBeCloseTo(40, 3);
    expect(end.y).toBeCloseTo(20, 3);
    expect(Math.abs(end.z)).toBeCloseTo(40, 3);
  });
  it('Lofted-Bend > Bent: a curved profile becomes the number of flat facets', () => {
    const arc = Array.from({ length: 41 }, (_, i) => ({ x: 10 * Math.cos((i / 40) * Math.PI), y: 10 * Math.sin((i / 40) * Math.PI) }));
    const pts = [{ x: 30, y: 0 }, ...arc, { x: -30, y: 0 }];
    const f = facetPolyline(pts, 4);
    // the two straight ends stay, the half circle is 4 facets (5 points)
    expect(f.length).toBe(2 + 5);
  });
});
