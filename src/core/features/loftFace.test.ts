import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createDocument, type Feature } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { REFERENCE_PLANE_DEFS } from './planes';
import { faceTangents, rebuildDocument } from './rebuild';
import { meshVolume } from './solid';

/** a 40 × 40 × 20 block (top face at y = 20) and a Ø20 circle on a plane at y = 60 */
function doc(loft: Record<string, unknown>) {
  const d = createDocument('Loft to face');
  let a = createSketch('sa', 'Sketch1', 'top');
  const c = [{ x: -20, y: -20 }, { x: 20, y: -20 }, { x: 20, y: 20 }, { x: -20, y: 20 }];
  for (let i = 0; i < 4; i++) a = addLine(a, c[i], c[(i + 1) % 4])[0];
  d.planes.p60 = { ...REFERENCE_PLANE_DEFS.top, id: 'p60', name: 'Plane1', origin: [0, 60, 0], kind: 'reference' };
  const b = addCircle(createSketch('sb', 'Sketch2', 'p60'), { x: 0, y: 0 }, 10)[0];
  d.sketches = { sa: a, sb: b };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sa', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 'sb', suppressed: false },
    { id: 'l1', type: 'loft', name: 'Loft1', sketchId: 'sb', sketchId2: '', face2: { point: [0, 20, 0], normal: [0, 1, 0] }, suppressed: false, op: 'boss', ...loft },
  ] as Feature[];
  return d;
}

/** the half width (largest |x|) of the section of a body at height y, from the triangles crossing y */
function widthAt(g: THREE.BufferGeometry, y: number): number {
  const p = (g.index ? g.toNonIndexed() : g).getAttribute('position');
  let max = 0;
  for (let i = 0; i < p.count; i += 3) {
    for (let k = 0; k < 3; k++) {
      const a = k, b = (k + 1) % 3;
      const ya = p.getY(i + a), yb = p.getY(i + b);
      if ((ya - y) * (yb - y) > 0 || ya === yb) continue;
      const t = (y - ya) / (yb - ya);
      max = Math.max(max, Math.abs(p.getX(i + a) + t * (p.getX(i + b) - p.getX(i + a))));
    }
  }
  return max;
}

describe('Loft to a face of the model', () => {
  it('a planar face is the second profile: the loft runs from the circle down to the top of the block', () => {
    const r = rebuildDocument(doc({}));
    expect(r.errors.l1).toBeUndefined();
    expect(r.bodies).toHaveLength(1);
    const g = r.bodies[0].geometry;
    g.computeBoundingBox();
    expect(g.boundingBox!.max.y).toBeCloseTo(60, 1);
    // block 32000 + a loft between a 40 × 40 square and a Ø20 circle over 40 (prismatoid: about 34000)
    const v = Math.abs(meshVolume(g));
    expect(v).toBeGreaterThan(32000 + 25000);
    expect(v).toBeLessThan(32000 + 40000);
  });

  it('the face that moved or vanished is said, not guessed', () => {
    const r = rebuildDocument(doc({ face2: { point: [0, 90, 0], normal: [0, 1, 0] } }));
    expect(r.errors.l1).toMatch(/face of the second profile/);
  });

  // a heavy rebuild: ample time when the whole suite runs in parallel
  it('Tangency To Face: the block walls carry on into the loft (fuller just above the face)', { timeout: 30000 }, () => {
    const plain = rebuildDocument(doc({})).bodies[0].geometry;
    const tangent = rebuildDocument(doc({ endType: 'tangent', endNormal: 1 })).bodies[0].geometry;
    const curvature = rebuildDocument(doc({ endType: 'curvature', endNormal: 1 })).bodies[0].geometry;
    expect(widthAt(tangent, 24)).toBeGreaterThan(widthAt(plain, 24) + 0.5);
    expect(widthAt(curvature, 30)).toBeGreaterThan(widthAt(tangent, 30) - 0.01);
  });

  it('the faces next to the top face give one direction: straight up, along the loft', () => {
    const body = rebuildDocument(doc({ suppressed: true })).bodies[0];
    const outline = [[-20, 20, -20], [20, 20, -20], [20, 20, 20], [-20, 20, 20]].map((p) => new THREE.Vector3(...p));
    const dirs = faceTangents([body], outline, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
    expect(dirs).toHaveLength(1);
    expect(dirs[0].y).toBeCloseTo(-1, 6);
  });
});
