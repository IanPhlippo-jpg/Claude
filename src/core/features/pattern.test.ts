import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createDocument } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { csg, isClosed, meshVolume } from './solid';
import { holeTool, mirrorGeometry, patternInstances, patternInstancePoints } from './pattern';
import { REFERENCE_PLANE_DEFS } from './planes';

const plate = () => {
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 40 }, { x: 0, y: 40 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  return s;
};

describe('mirror', () => {
  it('mirroring a box about the Right plane keeps the volume and outward winding', () => {
    const g = new THREE.BoxGeometry(10, 10, 10).toNonIndexed();
    g.translate(10, 0, 0);
    const m = mirrorGeometry(g, [0, 0, 0], [1, 0, 0]);
    expect(meshVolume(m)).toBeCloseTo(meshVolume(g), 3);
    m.computeBoundingBox();
    expect(m.boundingBox!.min.x).toBeCloseTo(-15, 5);
    expect(m.boundingBox!.max.x).toBeCloseTo(-5, 5);
  });

  it('mirror feature doubles the plate across the Right plane', () => {
    const doc = createDocument();
    doc.sketches.sk1 = plate();
    doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
    doc.features.push({ id: 'f2', type: 'mirror', name: 'Mirror1', suppressed: false, plane: 'right' });
    const r = rebuildDocument(doc);
    expect(Object.keys(r.errors)).toHaveLength(0);
    expect(Math.abs(meshVolume(r.bodies[0].geometry))).toBeCloseTo(2 * 80 * 40 * 10, -1);
  });
});

describe('patterns', () => {
  it('linear pattern of a cut hole makes 4 holes', () => {
    const doc = createDocument();
    doc.sketches.sk1 = plate();
    doc.sketches.sk2 = addCircle(createSketch('sk2', 'Sketch2', 'top'), { x: 10, y: 20 }, 3)[0];
    doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
    doc.features.push({ id: 'f2', type: 'extrude', name: 'C', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false });
    doc.features.push({ id: 'f3', type: 'linearPattern', name: 'LPattern1', suppressed: false, featureIds: ['f2'], dir1: { axis: [1, 0, 0], spacing: 20, count: 4 } });
    const r = rebuildDocument(doc);
    expect(Object.keys(r.errors)).toHaveLength(0);
    const vol = Math.abs(meshVolume(r.bodies[0].geometry));
    const expected = 80 * 40 * 10 - 4 * Math.PI * 9 * 10;
    expect(vol).toBeGreaterThan(expected * 0.99);
    expect(vol).toBeLessThan(expected * 1.01 + 50);
  });

  it('circular pattern instances are spread over the full circle', () => {
    const fns = patternInstances({ type: 'circularPattern', axis: { origin: [0, 0, 0], dir: [0, 1, 0] }, angle: 360, count: 4 });
    expect(fns).toHaveLength(3);
    const g = new THREE.BoxGeometry(2, 2, 2).toNonIndexed();
    g.translate(10, 0, 0);
    const g2 = fns[0](g);
    g2.computeBoundingBox();
    // 90° about Y: x=10 -> z=-10
    expect(g2.boundingBox!.getCenter(new THREE.Vector3()).z).toBeCloseTo(-10, 3);
  });
});

describe('hole wizard', () => {
  it('a simple through hole removes a cylinder', () => {
    const body = new THREE.BoxGeometry(40, 10, 40).toNonIndexed();
    body.translate(0, 5, 0);
    const plane = { ...REFERENCE_PLANE_DEFS.top, origin: [0, 10, 0] as [number, number, number] };
    const tool = holeTool({ holeType: 'simple', diameter: 6, depth: 0, cbDiameter: 10, cbDepth: 3, csDiameter: 10, csAngle: 90 }, plane, { x: 5, y: 5 }, 100);
    const cut = csg(body, tool, 'subtract');
    const removed = Math.abs(meshVolume(body)) - Math.abs(meshVolume(cut));
    expect(removed).toBeCloseTo(Math.PI * 9 * 10, -1);
  });

  it('a counterbore removes more than the plain hole', () => {
    const body = new THREE.BoxGeometry(40, 10, 40).toNonIndexed();
    body.translate(0, 5, 0);
    const plane = { ...REFERENCE_PLANE_DEFS.top, origin: [0, 10, 0] as [number, number, number] };
    const tool = holeTool({ holeType: 'counterbore', diameter: 6, depth: 0, cbDiameter: 10, cbDepth: 3, csDiameter: 10, csAngle: 90 }, plane, { x: 0, y: 0 }, 100);
    const cut = csg(body, tool, 'subtract');
    const removed = Math.abs(meshVolume(body)) - Math.abs(meshVolume(cut));
    const expected = Math.PI * 9 * 10 + Math.PI * (25 - 9) * 3;
    // 48-gon approximations of the circles take a little less than the exact cylinders
    expect(removed).toBeGreaterThan(expected * 0.96);
    expect(removed).toBeLessThan(expected * 1.01);
    // the mesh boolean leaves a crack where the counterbore floor meets the hole: flagged for a rebuild warning (F48)
    expect(isClosed(cut)).toBe(cut.userData.openArea === undefined);
  });
});

describe('instances to skip', () => {
  it('instance points follow the instance order and a circular pattern rotates about the axis', () => {
    const pts = patternInstancePoints({ type: 'linearPattern', dir1: { axis: [1, 0, 0], spacing: 10, count: 3 } }, new THREE.Vector3(1, 2, 3));
    expect(pts).toHaveLength(2);
    expect(pts[1].x).toBeCloseTo(21, 9);
    const circ = patternInstancePoints({ type: 'circularPattern', axis: { origin: [0, 0, 0], dir: [0, 1, 0] }, angle: 360, count: 4 }, new THREE.Vector3(10, 0, 0));
    expect(circ).toHaveLength(3);
    expect(Math.abs(circ[0].z)).toBeCloseTo(10, 6);
  });
});
