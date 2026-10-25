import { describe, expect, it } from 'vitest';
import { addCircle, addLine, addPoint, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type PatternFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';

describe('Sketch Driven Pattern', () => {
  it('a hole repeated at the points of a reference sketch', () => {
    const doc = createDocument('SkPat');
    let s1 = createSketch('sk1', 'Sketch1', 'top');
    const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: -80 }, { x: 0, y: -80 }];
    for (let i = 0; i < 4; i++) s1 = addLine(s1, c[i], c[(i + 1) % 4])[0];
    let s2 = createSketch('sk2', 'Sketch2', 'top');
    s2 = addCircle(s2, { x: 20, y: -20 }, 5)[0];
    let s3 = createSketch('sk3', 'Sketch3', 'top');
    for (const p of [{ x: 20, y: -20 }, { x: 60, y: -20 }, { x: 20, y: -60 }, { x: 60, y: -60 }]) s3 = addPoint(s3, p)[0];
    doc.sketches = { sk1: s1, sk2: s2, sk3: s3 };
    const pat: PatternFeature = { id: 'f6', type: 'sketchPattern', name: 'Sketch-Pattern1', suppressed: false, featureIds: ['f4'], sketchId: 'sk3' };
    doc.features = [
      { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature,
      { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as ExtrudeFeature,
      { id: 'f3', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false } as SketchFeature,
      { id: 'f4', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 10, reverse: false } as ExtrudeFeature,
      { id: 'f5', type: 'sketch', name: 'Sketch3', sketchId: 'sk3', suppressed: false } as SketchFeature,
      pat,
    ];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    const v = meshVolume(r.bodies[0].geometry);
    const expected = 80 * 80 * 10 - 4 * Math.PI * 25 * 10;
    expect(Math.abs(v - expected) / expected).toBeLessThan(0.005);
  });
});
