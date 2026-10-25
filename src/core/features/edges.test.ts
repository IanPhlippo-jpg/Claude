import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { featureEdges } from './edges';
import { createDocument } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { REFERENCE_PLANE_DEFS } from './planes';

const totalLength = (g: THREE.BufferGeometry) => {
  const p = g.getAttribute('position');
  let l = 0;
  for (let i = 0; i + 1 < p.count; i += 2) l += Math.hypot(p.getX(i) - p.getX(i + 1), p.getY(i) - p.getY(i + 1), p.getZ(i) - p.getZ(i + 1));
  return l;
};

describe('feature edges', () => {
  it('draws only the 12 creases of a box, not the diagonals', () => {
    const g = featureEdges(new THREE.BoxGeometry(10, 20, 30));
    expect(totalLength(g)).toBeCloseTo(4 * (10 + 20 + 30), 3);
  });

  it('ignores T-junctions on a flat face split by a boolean cut', () => {
    const doc = createDocument();
    let s = createSketch('sk1', 'Sketch1', 'top');
    const c = [{ x: -40, y: -40 }, { x: 40, y: -40 }, { x: 40, y: 40 }, { x: -40, y: 40 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    doc.sketches.sk1 = s;
    doc.sketches.sk2 = addCircle(createSketch('sk2', 'Sketch2', 'top'), { x: 10, y: 10 }, 8)[0];
    doc.features.push({ id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
    doc.features.push({ id: 'f2', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false });
    const body = rebuildDocument(doc).bodies[0];
    const edges = featureEdges(body.geometry);
    // every drawn edge on the top face lies on the outer rectangle or on the rim of the hole:
    // no triangulation lines across the face
    const p = edges.getAttribute('position');
    const onBoundary = (x: number, z: number) => Math.abs(Math.abs(x) - 40) < 0.05 || Math.abs(Math.abs(z) - 40) < 0.05 || Math.abs(Math.hypot(x - 10, z + 10) - 8) < 0.1;
    let topEdges = 0, interior = 0;
    for (let i = 0; i + 1 < p.count; i += 2) {
      if (Math.abs(p.getY(i) - 10) > 1e-6 || Math.abs(p.getY(i + 1) - 10) > 1e-6) continue;
      topEdges++;
      const mx = (p.getX(i) + p.getX(i + 1)) / 2, mz = (p.getZ(i) + p.getZ(i + 1)) / 2;
      if (!onBoundary(p.getX(i), p.getZ(i)) || !onBoundary(p.getX(i + 1), p.getZ(i + 1)) || !onBoundary(mx, mz)) interior++;
    }
    expect(topEdges).toBeGreaterThan(10);
    expect(interior).toBe(0);
    // and the total stays in the right order of magnitude (creases may be drawn from both sides)
    const expected = 4 * (80 + 80 + 10) + 2 * 2 * Math.PI * 8;
    expect(totalLength(edges)).toBeGreaterThan(expected * 0.97);
    expect(totalLength(edges)).toBeLessThan(expected * 2.0);
  });

  it('keeps the top face clean with counterbores and patterned holes', () => {
    const doc = createDocument();
    let s = createSketch('sk1', 'Sketch1', 'top');
    const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 80 }, { x: 0, y: 80 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    s = addCircle(s, { x: 40, y: 40 }, 17.5)[0];
    doc.sketches.sk1 = s;
    doc.sketches.sk2 = addCircle(createSketch('sk2', 'Sketch2', 'top'), { x: 60, y: 15 }, 4)[0];
    doc.planes.pl1 = { ...REFERENCE_PLANE_DEFS.top, id: 'pl1', name: 'Face1', origin: [40, 10, -40] };
    doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
    doc.features.push({ id: 'f2', type: 'extrude', name: 'C', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false });
    doc.features.push({ id: 'f3', type: 'hole', name: 'H', suppressed: false, plane: 'pl1', points: [{ x: -25, y: -25 }, { x: -25, y: 25 }], holeType: 'counterbore', diameter: 6.6, depth: 0, cbDiameter: 11, cbDepth: 6.5, csDiameter: 12.6, csAngle: 90 });
    doc.features.push({ id: 'f4', type: 'linearPattern', name: 'LP', suppressed: false, featureIds: ['f2'], dir1: { axis: [1, 0, 0], spacing: 12, count: 3 } });
    const body = rebuildDocument(doc).bodies[0];
    const edges = featureEdges(body.geometry);
    const p = edges.getAttribute('position');
    let longTop = 0;
    for (let i = 0; i + 1 < p.count; i += 2) {
      if (Math.abs(p.getY(i) - 10) > 1e-6 || Math.abs(p.getY(i + 1) - 10) > 1e-6) continue;
      const len = Math.hypot(p.getX(i) - p.getX(i + 1), p.getZ(i) - p.getZ(i + 1));
      const onOuter = (x: number, z: number) => Math.abs(x) < 0.05 || Math.abs(x - 80) < 0.05 || Math.abs(z) < 0.05 || Math.abs(z + 80) < 0.05;
      // any top-face edge longer than a hole chord that is not on the outer rectangle is a stray line
      if (len > 3 && !(onOuter(p.getX(i), p.getZ(i)) && onOuter(p.getX(i + 1), p.getZ(i + 1)))) longTop++;
    }
    expect(longTop).toBe(0);
  });
});
