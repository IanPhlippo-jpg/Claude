import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type DraftFeature, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';

describe('Draft (Neutral Plane)', () => {
  it('four sides of a 40 mm cube drafted 5 degrees from the bottom face make a frustum', () => {
    const doc = createDocument('Draft');
    let s = createSketch('sk1', 'Sketch1', 'top');
    const c = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: -40 }, { x: 0, y: -40 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    doc.sketches.sk1 = s;
    const box: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 40, reverse: false };
    const side = (n: [number, number, number], p: [number, number, number], i: number) => ({ normal: n, point: p, label: `Face<${i}>` });
    const draft: DraftFeature = {
      id: 'f3', type: 'draft', name: 'Draft1', suppressed: false, angle: 5,
      neutral: { normal: [0, -1, 0], point: [20, 0, 20], label: 'Face<1>' },
      faces: [side([1, 0, 0], [40, 20, 20], 2), side([-1, 0, 0], [0, 20, 20], 3), side([0, 0, 1], [20, 20, 40], 4), side([0, 0, -1], [20, 20, 0], 5)],
    };
    doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, box, draft];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    const top = 40 - 2 * 40 * Math.tan((5 * Math.PI) / 180);
    const expected = (40 / 3) * (1600 + top * top + 40 * top);
    const v = meshVolume(r.bodies[0].geometry);
    expect(Math.abs(v - expected) / expected).toBeLessThan(0.005);
  });
});
