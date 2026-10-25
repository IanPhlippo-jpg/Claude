import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { planarFaces } from './solid';
import { thicknessAnalysis, undercutAnalysis } from './analysis';

function plate() {
  const doc = createDocument('P');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: -80 }, { x: 0, y: -80 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  doc.sketches.sk1 = s;
  const f2: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false };
  doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, f2];
  const b = rebuildDocument(doc, null).bodies[0];
  return [{ ...b, faces: planarFaces(b.geometry, b.id) }];
}

describe('Evaluate ▸ Thickness / Undercut Analysis', () => {
  const bodies = plate();
  it('a 10 mm plate against a 12 mm target: top and bottom are thin regions, minimum 10', () => {
    const r = thicknessAnalysis(bodies, 12);
    expect(r.thin).toBe(2);
    expect(r.minimum).toBeCloseTo(10, 1);
  });
  it('a plain plate pulled along Y has no undercuts', () => {
    const r = undercutAnalysis(bodies, [0, 1, 0]);
    expect(r.counts.none).toBe(6);
  });
});
