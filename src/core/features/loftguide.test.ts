import { describe, expect, it } from 'vitest';
import { addCircle, addSpline, createSketch } from '../sketch/model';
import { createDocument, type LoftFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';
import { REFERENCE_PLANE_DEFS } from './planes';

function vaseDoc(withGuide: boolean) {
  const doc = createDocument('Vase');
  const top = REFERENCE_PLANE_DEFS.top;
  doc.planes.p100 = { ...top, id: 'p100', name: 'Plane1', origin: [0, 100, 0], kind: 'reference' };
  let a = createSketch('sa', 'Sketch1', 'top');
  a = addCircle(a, { x: 0, y: 0 }, 10)[0];
  let b = createSketch('sb', 'Sketch2', 'p100');
  b = addCircle(b, { x: 0, y: 0 }, 10)[0];
  // guide on the front plane (x right, y up): bulges out to x = 20 half way
  let g = createSketch('sg', 'Sketch3', 'front');
  g = addSpline(g, [{ x: 10, y: 0 }, { x: 20, y: 50 }, { x: 10, y: 100 }])[0];
  doc.sketches = { sa: a, sb: b, sg: g };
  const loft: LoftFeature = { id: 'f4', type: 'loft', name: 'Loft1', sketchId: 'sa', sketchId2: 'sb', suppressed: false, op: 'boss', guides: withGuide ? ['sg'] : [] };
  doc.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false } as SketchFeature,
    { id: 'f2', type: 'sketch', name: 'Sketch2', sketchId: 'sb', suppressed: false } as SketchFeature,
    { id: 'f3', type: 'sketch', name: 'Sketch3', sketchId: 'sg', suppressed: false } as SketchFeature,
    loft,
  ];
  return doc;
}

describe('Loft with guide curves', () => {
  it('without a guide the loft of two equal circles is a cylinder', () => {
    const r = rebuildDocument(vaseDoc(false), null);
    expect(r.errors).toEqual({});
    expect(Math.abs(meshVolume(r.bodies[0].geometry) - Math.PI * 100 * 100) / (Math.PI * 100 * 100)).toBeLessThan(0.005);
  });
  it('a guide curve makes the sections follow it (a vase, radius 20 half way)', () => {
    const r = rebuildDocument(vaseDoc(true), null);
    expect(r.errors).toEqual({});
    const g = r.bodies[0].geometry;
    g.computeBoundingBox();
    expect(g.boundingBox!.max.x).toBeGreaterThan(19.5);
    expect(g.boundingBox!.max.x).toBeLessThan(21);
    // the radius still ends at 10 on both profiles
    expect(g.boundingBox!.max.y).toBeCloseTo(100, 3);
    expect(meshVolume(g)).toBeGreaterThan(Math.PI * 100 * 100 * 1.8);
  });
});

describe('Loft Start/End Constraints', () => {
  const shifted = (normal: boolean) => {
    const doc = createDocument('S');
    const top = REFERENCE_PLANE_DEFS.top;
    doc.planes.p100 = { ...top, id: 'p100', name: 'Plane1', origin: [50, 100, 0], kind: 'reference' };
    let a = createSketch('sa', 'Sketch1', 'top');
    a = addCircle(a, { x: 0, y: 0 }, 10)[0];
    let b = createSketch('sb', 'Sketch2', 'p100');
    b = addCircle(b, { x: 0, y: 0 }, 10)[0];
    doc.sketches = { sa: a, sb: b };
    const loft: LoftFeature = { id: 'f3', type: 'loft', name: 'Loft1', sketchId: 'sa', sketchId2: 'sb', suppressed: false, op: 'boss', ...(normal ? { startNormal: 1, endNormal: 1 } : {}) };
    doc.features = [
      { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false } as SketchFeature,
      { id: 'f2', type: 'sketch', name: 'Sketch2', sketchId: 'sb', suppressed: false } as SketchFeature,
      loft,
    ];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    // centre of the section near y = 10
    const pos = r.bodies[0].geometry.getAttribute('position');
    let sx = 0, n = 0;
    for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - 10) < 2.2) { sx += pos.getX(i); n++; }
    return sx / n;
  };
  it('Normal To Profile leaves the profile straight up (S-shaped loft)', () => {
    // a straight (ruled) loft has its section centre at x = 5 at y = 10; with Normal To Profile it is ~1.4
    const normal = shifted(true);
    expect(normal).toBeGreaterThan(0.5);
    expect(normal).toBeLessThan(2.5);
  });
});
