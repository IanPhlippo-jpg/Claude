import { describe, expect, it } from 'vitest';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';

describe('Extruded Cut ▸ Flip side to cut', () => {
  it('a circle cut with the side flipped keeps only the cylinder inside the profile', () => {
    const doc = createDocument('Flip');
    let s1 = createSketch('sk1', 'Sketch1', 'top');
    const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: -80 }, { x: 0, y: -80 }];
    for (let i = 0; i < 4; i++) s1 = addLine(s1, c[i], c[(i + 1) % 4])[0];
    let s2 = createSketch('sk2', 'Sketch2', 'top');
    s2 = addCircle(s2, { x: 40, y: -40 }, 17.5)[0];
    doc.sketches = { sk1: s1, sk2: s2 };
    doc.features = [
      { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature,
      { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as ExtrudeFeature,
      { id: 'f3', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false } as SketchFeature,
      { id: 'f4', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 10, reverse: false, flipSide: true } as ExtrudeFeature,
    ];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    const v = meshVolume(r.bodies[0].geometry);
    expect(Math.abs(v - Math.PI * 17.5 * 17.5 * 10) / (Math.PI * 17.5 * 17.5 * 10)).toBeLessThan(0.01);
  });
});
