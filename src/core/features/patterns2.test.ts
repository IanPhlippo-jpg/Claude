import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createDocument, type Document } from '../document/types';
import { addCircle, addConstraint, addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';
import { faceBoundary, fillPoints } from './patterns2';
import { refGeometryFrom } from './refgeom';

const plate = () => {
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 40 }, { x: 0, y: 40 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  return s;
};
const holeVol = (r: number, h: number) => Math.PI * r * r * h;
const base = (): Document => {
  const doc = createDocument();
  doc.sketches.sk1 = plate();
  doc.sketches.sk2 = addCircle(createSketch('sk2', 'Sketch2', 'top'), { x: 10, y: 20 }, 3)[0];
  doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
  doc.features.push({ id: 'f2', type: 'extrude', name: 'C', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false });
  return doc;
};
const volume = (doc: Document) => {
  const r = rebuildDocument(doc);
  expect(r.errors).toEqual({});
  return Math.abs(meshVolume(r.bodies[0].geometry));
};

describe('more patterns', () => {
  it('Table Driven Pattern: one hole per table row', () => {
    const doc = base();
    doc.features.push({ id: 'f3', type: 'tablePattern', name: 'TPattern1', suppressed: false, featureIds: ['f2'], table: [{ x: 20, y: 0 }, { x: 40, y: 0 }, { x: 60, y: 10 }] });
    const expected = 80 * 40 * 10 - 4 * holeVol(3, 10);
    expect(volume(doc)).toBeGreaterThan(expected * 0.99);
    expect(volume(doc)).toBeLessThan(expected * 1.01);
  });

  it('Curve Driven Pattern: equal spacing along a sketched line', () => {
    const doc = base();
    // the curve: a line from the seed toward +x on the top plane (top plane: sketch x = world x)
    doc.sketches.sk3 = addLine(createSketch('sk3', 'Sketch3', 'top'), { x: 10, y: 20 }, { x: 70, y: 20 })[0];
    doc.features.push({ id: 'k3', type: 'sketch', name: 'Sketch3', sketchId: 'sk3', suppressed: false });
    doc.features.push({ id: 'f3', type: 'curvePattern', name: 'CrvPattern1', suppressed: false, featureIds: ['f2'], curve: { sketchId: 'sk3', count: 4, spacing: 20, equal: true, tangent: false } });
    const expected = 80 * 40 * 10 - 4 * holeVol(3, 10);
    expect(volume(doc)).toBeGreaterThan(expected * 0.99);
    expect(volume(doc)).toBeLessThan(expected * 1.01);
  });

  it('Variable Pattern: instances with their own diameter', () => {
    const doc = base();
    let s = doc.sketches.sk2;
    const circle = Object.values(s.entities).find((e) => e.kind === 'circle')!;
    let c;
    [s, c] = addConstraint(s, 'diameter', [circle.id], { value: 6 });
    doc.sketches.sk2 = s;
    doc.features.push({ id: 'f3', type: 'variablePattern', name: 'VarPattern1', suppressed: false, featureIds: ['f2'], variable: { dir: [1, 0, 0], rows: [{ offset: 25, values: { [c.id]: 10 } }, { offset: 50, values: { [c.id]: 14 } }] } });
    const expected = 80 * 40 * 10 - holeVol(3, 10) - holeVol(5, 10) - holeVol(7, 10);
    expect(volume(doc)).toBeGreaterThan(expected * 0.98);
    expect(volume(doc)).toBeLessThan(expected * 1.02);
  });

  it('Fill Pattern: a square grid over the top face with margins', () => {
    const doc = createDocument();
    doc.sketches.sk1 = plate();
    doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
    const r = rebuildDocument(doc);
    const body = r.bodies[0];
    const top = body.faces.find((f) => !f.curved && f.normal[1] > 0.99)!;
    const fb = faceBoundary(body.geometry, top.triangles, top.normal, top.centroid);
    expect(fb.polygon.length).toBeGreaterThanOrEqual(4);
    const f = { id: 'p', type: 'fillPattern' as const, name: 'FillPattern1', suppressed: false, featureIds: [], fill: { ...fb, spacing: 10, margin: 4, layout: 'square' as const, label: 'Face<1>' } };
    // seed at (10, 20) on the top face (y = 10); grid every 10 mm, 4 mm from the edges -> x 10..70 (7), z 10..30 (3)
    const pts = fillPoints(f, new THREE.Vector3(10, 10, top.centroid[2]));
    expect(pts.length).toBe(7 * 3 - 1);
  });
});

describe('reference geometry', () => {
  it('an axis where two planes meet and a point at the centre of a face', () => {
    const doc = createDocument();
    const front = { id: 'front', name: 'Front Plane', origin: [0, 0, 0] as [number, number, number], u: [1, 0, 0] as [number, number, number], v: [0, 1, 0] as [number, number, number], n: [0, 0, 1] as [number, number, number] };
    const right = { id: 'right', name: 'Right Plane', origin: [0, 0, 0] as [number, number, number], u: [0, 0, -1] as [number, number, number], v: [0, 1, 0] as [number, number, number], n: [1, 0, 0] as [number, number, number] };
    const ax = refGeometryFrom('axis', { edges: [], faces: [], planes: [front, right] }, 'a', 'Axis1')!;
    expect(ax.how).toBe('Two Planes');
    expect(Math.abs(ax.dir![1])).toBeCloseTo(1, 9);
    void doc;
    const doc2 = createDocument();
    doc2.sketches.sk1 = plate();
    doc2.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
    const r = rebuildDocument(doc2);
    const top = r.bodies[0].faces.find((f) => !f.curved && f.normal[1] > 0.99)!;
    const pt = refGeometryFrom('point', { edges: [], faces: [{ face: top, geometry: r.bodies[0].geometry }], planes: [] }, 'p', 'Point1')!;
    expect(pt.how).toBe('Center of Face');
    expect(pt.origin[1]).toBeCloseTo(10, 6);
  });
});

describe('split line and projected curve', () => {
  const plateDoc = () => {
    const doc = createDocument();
    doc.sketches.sk1 = plate();
    doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
    doc.sketches.sk2 = addCircle(createSketch('sk2', 'Sketch2', 'top'), { x: 40, y: 20 }, 8)[0];
    doc.features.push({ id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false });
    return doc;
  };
  it('a split line splits the top and bottom faces and keeps the volume', () => {
    const doc = plateDoc();
    const before = rebuildDocument(doc).bodies[0];
    doc.features.push({ id: 'f3', type: 'splitLine', name: 'Split Line1', suppressed: false, sketchId: 'sk2' });
    const r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    const after = r.bodies[0];
    expect(Math.abs(meshVolume(after.geometry))).toBeCloseTo(Math.abs(meshVolume(before.geometry)), 0);
    expect(after.faces.length).toBe(before.faces.length + 2);
    expect(after.edges.length).toBeGreaterThan(before.edges.length);
  });
  it('a projected curve lies on the body', () => {
    const doc = plateDoc();
    doc.features.push({ id: 'f3', type: 'projectedCurve', name: 'Curve1', suppressed: false, sketchId: 'sk2' });
    const r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    const c = (r.curves ?? []).filter((x) => x.id === 'f3' || x.id.startsWith('f3:'));
    expect(c.length).toBeGreaterThan(0);
    expect(c[0].points.length).toBeGreaterThan(10);
  });
});
