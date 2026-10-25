import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { bodyCheck, sectionProperties } from './inspect';
import * as THREE from 'three';
import { csg } from './solid';

function plate() {
  const doc = createDocument('P');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: -40 }, { x: 0, y: -40 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  doc.sketches.sk1 = s;
  doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as ExtrudeFeature];
  return rebuildDocument(doc, null).bodies[0];
}

describe('Evaluate: Check and Section Properties', () => {
  const b = plate();
  it('an extruded plate is a closed, valid body', () => {
    const r = bodyCheck([b])[0];
    expect(r.openEdges).toBe(0);
    expect(r.nonManifold).toBe(0);
  });
  it('the 80 x 40 top face: area 3200, centroid (40, 10, 20), Ixx/Iyy of a rectangle', () => {
    const top = b.faces.find((f) => Math.abs(f.normal[1] - 1) < 1e-6)!;
    const p = sectionProperties(b.geometry, top.triangles, top.normal);
    expect(p.area).toBeCloseTo(3200, 3);
    expect(p.centroid.x).toBeCloseTo(40, 3);
    expect(p.centroid.y).toBeCloseTo(10, 3);
    expect(p.centroid.z).toBeCloseTo(20, 3);
    // b*h^3/12 in the two in-plane directions (80 x 40)
    const m = [p.ixx, p.iyy].sort((a, c) => a - c);
    expect(m[0]).toBeCloseTo((80 * 40 ** 3) / 12, 0);
    expect(m[1]).toBeCloseTo((40 * 80 ** 3) / 12, 0);
    expect(Math.abs(p.ixy)).toBeLessThan(1e-3);
  });
  it('a boolean result with T-junctions is still closed; a mesh with a missing triangle is not', () => {
    const cut = csg(b.geometry, new THREE.CylinderGeometry(10, 10, 40, 32).translate(40, 5, 20), 'subtract');
    expect(bodyCheck([{ ...b, geometry: cut }])[0].openEdges).toBe(0);
    const g = (b.geometry.index ? b.geometry.toNonIndexed() : b.geometry).clone();
    const pos = g.getAttribute('position');
    const holed = new THREE.BufferGeometry();
    holed.setAttribute('position', new THREE.Float32BufferAttribute(Array.from(pos.array as Float32Array).slice(9), 3));
    expect(bodyCheck([{ ...b, geometry: holed }])[0].openEdges).toBeGreaterThan(0);
  });
});
