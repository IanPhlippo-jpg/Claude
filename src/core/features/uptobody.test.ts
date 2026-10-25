import { describe, expect, it } from 'vitest';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';

describe('Extrude Up To Body', () => {
  it('a block runs up to a cylinder and ends on its curved underside', () => {
    const doc = createDocument('UTB');
    // cylinder r 10 along z, axis at (40, 60), 200 long (mid plane)
    let s1 = createSketch('sk1', 'Sketch1', 'front');
    s1 = addCircle(s1, { x: 40, y: 60 }, 10)[0];
    // block 16 x 16 under it, on the top plane (sketch y = -z)
    let s2 = createSketch('sk2', 'Sketch2', 'top');
    const c = [{ x: 32, y: -32 }, { x: 48, y: -32 }, { x: 48, y: -48 }, { x: 32, y: -48 }];
    for (let i = 0; i < 4; i++) s2 = addLine(s2, c[i], c[(i + 1) % 4])[0];
    doc.sketches.sk1 = s1;
    doc.sketches.sk2 = s2;
    const cyl: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'midPlane', depth: 200, reverse: false };
    const blk: ExtrudeFeature = { id: 'f4', type: 'extrude', name: 'Boss-Extrude2', sketchId: 'sk2', suppressed: false, op: 'boss', end: 'upToBody', depth: 10, reverse: false, upToBody: { bodyId: 'body1', label: 'Boss-Extrude1' } };
    doc.features = [
      { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature,
      cyl,
      { id: 'f3', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false } as SketchFeature,
      blk,
    ];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    expect(r.bodies.length).toBe(1);
    const v = meshVolume(r.bodies[0].geometry);
    const expected = Math.PI * 100 * 200 + 16 * (960 - 2 * (24 + 50 * Math.asin(0.8)));
    expect(Math.abs(v - expected) / expected).toBeLessThan(0.01);
  });
  it('without a body selected it reports what to do', () => {
    const doc = createDocument('UTB2');
    let s = createSketch('sk', 'Sketch1', 'top');
    s = addCircle(s, { x: 0, y: 0 }, 5)[0];
    doc.sketches.sk = s;
    doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk', suppressed: false } as SketchFeature, { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk', suppressed: false, op: 'boss', end: 'upToBody', depth: 10, reverse: false } as ExtrudeFeature];
    expect(rebuildDocument(doc, null).errors.f2).toMatch(/Select the solid body/);
  });
});
