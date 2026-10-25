import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type CrossBreakFeature, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';

describe('Sheet Metal ▸ Cross-Break', () => {
  it('draws the two diagonals of the picked 60 x 40 face', () => {
    const doc = createDocument('X');
    let s = createSketch('sk1', 'Sketch1', 'front');
    const c = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 40 }, { x: 0, y: 40 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    doc.sketches.sk1 = s;
    const plate: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 2, reverse: false };
    const xb: CrossBreakFeature = { id: 'f3', type: 'crossBreak', name: 'Cross-Break1', suppressed: false, face: { normal: [0, 0, 1], point: [30, 20, 2], label: 'Face<1>' }, radius: 1, angle: 2, reverse: false };
    doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, plate, xb];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    const lines = (r.curves ?? []).filter((x) => x.name === 'Cross-Break');
    expect(lines.length).toBe(2);
    for (const l of lines) expect(l.points[0].distanceTo(l.points[1])).toBeCloseTo(Math.hypot(60, 40), 3);
  });
});
