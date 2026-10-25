import { describe, expect, it } from 'vitest';
import { createDocument, type Feature, type PatternFeature } from '../document/types';
import { addCircle, addConstraint, addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import * as THREE from 'three';
import { meshVolume } from './solid';
import { patternInstances } from './pattern';
import { REFERENCE_PLANE_DEFS } from './planes';

const plate = () => {
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 40 }, { x: 0, y: 40 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  return s;
};
const holeDoc = () => {
  const doc = createDocument();
  doc.sketches.sk1 = plate();
  doc.sketches.sk2 = addCircle(createSketch('sk2', 'Sketch2', 'top'), { x: 10, y: 20 }, 3)[0];
  doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as Feature);
  doc.features.push({ id: 'f2', type: 'extrude', name: 'C', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false } as Feature);
  return doc;
};
const holeVol = Math.PI * 9 * 10;
const lp = (o: Partial<PatternFeature>): PatternFeature => ({ id: 'p1', type: 'linearPattern', name: 'LPattern1', suppressed: false, featureIds: ['f2'], dir1: { axis: [1, 0, 0], spacing: 20, count: 3 }, ...o });

describe('pattern options of the original', () => {
  it('Up to reference: four holes from x = 10 up to a plane at x = 70 (spacing 20)', () => {
    const doc = holeDoc();
    doc.planes.p70 = { ...REFERENCE_PLANE_DEFS.right, id: 'p70', name: 'Plane1', origin: [70, 0, 0], kind: 'reference' };
    doc.features.push(lp({ dir1: { axis: [1, 0, 0], spacing: 1, count: 4 }, upTo1: { plane: 'p70', offset: 0 } }));
    const r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(Math.abs(meshVolume(r.bodies[0].geometry))).toBeCloseTo(80 * 40 * 10 - 4 * holeVol, -1);
  });
  it('Bodies to pattern: two more copies of the plate body', () => {
    const doc = createDocument();
    doc.sketches.sk1 = plate();
    doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as Feature);
    const id = rebuildDocument(doc).bodies[0].id;
    doc.features.push(lp({ featureIds: [], bodies: [id], dir1: { axis: [0, 1, 0], spacing: 20, count: 3 } }));
    const r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(r.bodies.length).toBe(3);
  });
  it('Instances to Vary: each instance hole grows by the increment', () => {
    const doc = holeDoc();
    let s = doc.sketches.sk2;
    const circle = s.entityOrder.find((e) => s.entities[e].kind === 'circle')!;
    let c;
    [s, c] = addConstraint(s, 'diameter', [circle], { value: 6 });
    doc.sketches.sk2 = s;
    doc.features.push(lp({ varyDims: [{ constraintId: c.id, increment: 2 }] }));
    const r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    // diameters 6, 8, 10
    const exp = 80 * 40 * 10 - Math.PI * 10 * (9 + 16 + 25);
    expect(Math.abs(meshVolume(r.bodies[0].geometry))).toBeCloseTo(exp, -1);
  });
  it('Circular > Instance spacing: the angle is the step between the instances', () => {
    const probe = new THREE.BufferGeometry();
    probe.setAttribute('position', new THREE.Float32BufferAttribute([10, 0, 0], 3));
    const xs = (o: object) => patternInstances({ type: 'circularPattern', axis: { origin: [0, 0, 0], dir: [0, 1, 0] }, angle: 90, count: 5, ...o }).map((i) => Math.round(i(probe).getAttribute("position").getX(0) * 1000) / 1000 + 0);
    // step 90: 90, 180, 270, 360 degrees; equal spacing: 22.5 ... 90 degrees
    expect(xs({ instanceSpacing: true })).toEqual([0, -10, 0, 10]);
    expect(xs({})[3]).toBeCloseTo(0, 3);
    expect(xs({})[0]).toBeCloseTo(10 * Math.cos(Math.PI / 8), 3);
  });
});
