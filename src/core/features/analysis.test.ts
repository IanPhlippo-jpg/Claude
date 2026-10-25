import { describe, expect, it } from 'vitest';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { DRAFT_COLORS, curvatureAnalysis, curvatureColor, draftAnalysis } from './analysis';

function part(withHole: boolean) {
  const doc = createDocument('A');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: -40 }, { x: 0, y: -40 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  if (withHole) s = addCircle(s, { x: 20, y: -20 }, 5)[0];
  doc.sketches.sk1 = s;
  doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, { id: 'f2', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false } as ExtrudeFeature];
  return rebuildDocument(doc, null).bodies;
}

describe('Draft Analysis and Curvature', () => {
  it('a box pulled along +Y: top positive, bottom negative, four sides require draft', () => {
    const r = draftAnalysis(part(false), [0, 1, 0], 1);
    expect(r.counts).toEqual({ positive: 1, requires: 4, negative: 1 });
    expect(Object.values(r.colors[Object.keys(r.colors)[0]])).toContain(DRAFT_COLORS.requires);
  });
  it('curvature: planar faces dark, the 5 mm hole a curvature colour', () => {
    const bodies = part(true);
    const m = curvatureAnalysis(bodies)[bodies[0].id];
    const colors = new Set(Object.values(m));
    expect(colors.has(curvatureColor(0))).toBe(true);
    expect([...colors].some((c) => c !== curvatureColor(0))).toBe(true);
  });
});
