import { describe, expect, it } from 'vitest';
import { createDocument, type Feature } from '../document/types';
import { addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';

/** a 40 × 20 × 40 block with a bevel along its bottom right edge, converted with the bottom face fixed */
function doc(ignoreBeveled: boolean) {
  const d = createDocument('Bevel');
  let s = createSketch('s1', 'Sketch1', 'front');
  const c = [{ x: 0, y: 0 }, { x: 35, y: 0 }, { x: 40, y: 5 }, { x: 40, y: 20 }, { x: 0, y: 20 }];
  for (let i = 0; i < c.length; i++) s = addLine(s, c[i], c[(i + 1) % c.length])[0];
  d.sketches = { s1: s };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 40, reverse: false },
    { id: 'c1', type: 'convertSheet', name: 'Process-Bends1', suppressed: false, insertBends: true, fixedFace: { normal: [0, -1, 0], point: [17.5, 0, 20] }, thickness: 1, bendRadius: 1, ignoreBeveled },
  ] as Feature[];
  return d;
}

describe('Insert Bends ▸ Ignore beveled faces', () => {
  it('the sharp edges along the fixed face become bends; with Ignore beveled faces not those of the bevel', () => {
    const all = rebuildDocument(doc(false));
    expect(all.errors.c1).toBeUndefined();
    // along Z: bottom-left, bottom-bevel, bevel-right; along X: the bottom front and back edges
    expect(all.bendCounts?.c1).toBe(5);
    const ignored = rebuildDocument(doc(true));
    expect(ignored.bendCounts?.c1).toBe(3);
  });
});
