import { describe, expect, it } from 'vitest';
import { createDocument } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { sketchRegions } from './regions';
import { featureGeometry, rebuildDocument } from './rebuild';
import { meshVolume } from './solid';
import { planeOnFace } from './planes';

function basePlate() {
  // 80 x 80 plate with a Ø35 hole in the middle, like the BasePlate of the reference video
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [
    { x: -40, y: -40 },
    { x: 40, y: -40 },
    { x: 40, y: 40 },
    { x: -40, y: 40 },
  ];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  s = addCircle(s, { x: 0, y: 0 }, 17.5)[0];
  return s;
}

describe('sketch regions', () => {
  it('finds the plate as one region with the circle as a hole', () => {
    const r = sketchRegions(basePlate());
    expect(r).toHaveLength(1);
    expect(r[0].holes).toHaveLength(1);
    expect(r[0].area).toBeCloseTo(6400 - Math.PI * 17.5 * 17.5, -1);
  });
});

describe('extrude', () => {
  it('builds a plate with a through hole of the right volume', () => {
    const doc = createDocument();
    doc.sketches.sk1 = basePlate();
    doc.features.push({ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false });
    doc.features.push({ id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
    const r = rebuildDocument(doc);
    expect(Object.keys(r.errors)).toHaveLength(0);
    expect(r.bodies).toHaveLength(1);
    const vol = Math.abs(meshVolume(r.bodies[0].geometry));
    // the circle is sampled with 64 segments, so the hole is slightly smaller than a true circle
    expect(vol).toBeGreaterThan((6400 - Math.PI * 17.5 * 17.5) * 10 * 0.99);
    expect(vol).toBeLessThan(6400 * 10);
    // top and bottom faces at y = 10 and y = 0 (top plane normal is +Y)
    const big = r.bodies[0].faces.filter((f) => f.area > 1000 && !f.curved).map((f) => f.centroid[1].toFixed(1)).sort();
    expect(big).toEqual(['0.0', '10.0']);
    // the hole wall is one curved face (not 64 facets)
    const curved = r.bodies[0].faces.filter((f) => f.curved);
    expect(curved).toHaveLength(1);
    expect(curved[0].area).toBeCloseTo(2 * Math.PI * 17.5 * 10, -2);
  });

  it('mid plane extrusion is centred on the sketch plane', () => {
    const doc = createDocument();
    doc.sketches.sk1 = basePlate();
    const { geometry } = featureGeometry(doc, { id: 'x', type: 'extrude', name: 'E', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'midPlane', depth: 10, reverse: false });
    geometry!.computeBoundingBox();
    expect(geometry!.boundingBox!.min.y).toBeCloseTo(-5, 5);
    expect(geometry!.boundingBox!.max.y).toBeCloseTo(5, 5);
  });

  it('a cut removes material from the body', () => {
    const doc = createDocument();
    doc.sketches.sk1 = basePlate();
    let s2 = createSketch('sk2', 'Sketch2', 'top');
    const q = [{ x: 20, y: 20 }, { x: 35, y: 20 }, { x: 35, y: 35 }, { x: 20, y: 35 }];
    for (let i = 0; i < 4; i++) s2 = addLine(s2, q[i], q[(i + 1) % 4])[0];
    doc.sketches.sk2 = s2;
    doc.features.push({ id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
    doc.features.push({ id: 'f3', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false });
    const r = rebuildDocument(doc);
    expect(Object.keys(r.errors)).toHaveLength(0);
    const vol = Math.abs(meshVolume(r.bodies[0].geometry));
    const plate = (6400 - Math.PI * 17.5 * 17.5) * 10;
    expect(vol).toBeLessThan(plate - 15 * 15 * 10 * 0.95);
    expect(vol).toBeGreaterThan(plate - 15 * 15 * 10 * 1.05 - 100);
  });

  it('a cut without a body reports an error', () => {
    const doc = createDocument();
    doc.sketches.sk1 = basePlate();
    doc.features.push({ id: 'f2', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'sk1', suppressed: false, op: 'cut', end: 'blind', depth: 10, reverse: false });
    const r = rebuildDocument(doc);
    expect(r.errors.f2).toMatch(/existing solid/);
  });
});

describe('revolve', () => {
  it('revolves a rectangle next to a vertical axis into a ring', () => {
    let s = createSketch('sk1', 'Sketch1', 'front');
    const q = [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 5 }, { x: 10, y: 5 }];
    for (let i = 0; i < 4; i++) s = addLine(s, q[i], q[(i + 1) % 4])[0];
    const [s2, axis] = addLine(s, { x: 0, y: -10 }, { x: 0, y: 20 }, true);
    const doc = createDocument();
    doc.sketches.sk1 = s2;
    doc.features.push({ id: 'f2', type: 'revolve', name: 'Revolve1', sketchId: 'sk1', suppressed: false, op: 'boss', axisEntityId: axis.id, angle: 360, reverse: false });
    const r = rebuildDocument(doc);
    expect(Object.keys(r.errors)).toHaveLength(0);
    const vol = Math.abs(meshVolume(r.bodies[0].geometry));
    // ring: pi * (20^2 - 10^2) * 5 = 4712, minus faceting
    expect(vol).toBeGreaterThan(4712 * 0.97);
    expect(vol).toBeLessThan(4712 * 1.01);
  });
});

describe('plane on a face', () => {
  it('keeps X to the right on a top face and builds an orthonormal frame', () => {
    const p = planeOnFace('pl1', 'Face', [1, 10, 2], [0, 1, 0]);
    expect(p.u).toEqual([1, 0, 0]);
    expect(p.v.map((x) => Math.round(x))).toEqual([0, 0, -1]);
    expect(p.n).toEqual([0, 1, 0]);
  });
});

describe('selected contours', () => {
  it('extruding only the first of two separate squares gives half the volume', () => {
    const doc = createDocument();
    let s = createSketch('sk', 'Sketch1', 'top');
    for (const [ox, oy] of [[0, 0], [30, 0]] as [number, number][]) {
      const c = [{ x: ox, y: oy }, { x: ox + 10, y: oy }, { x: ox + 10, y: oy - 10 }, { x: ox, y: oy - 10 }];
      for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    }
    doc.sketches.sk = s;
    doc.features = [
      { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk', suppressed: false },
      { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk', suppressed: false, op: 'boss', end: 'blind', depth: 5, reverse: false, contours: [0] },
    ];
    const r = rebuildDocument(doc, null);
    expect(Object.keys(r.errors)).toEqual([]);
    expect(Math.abs(meshVolume(r.bodies[0].geometry))).toBeCloseTo(500, 3);
  });
});
