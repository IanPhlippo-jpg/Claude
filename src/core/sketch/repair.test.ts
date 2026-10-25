import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from './model';
import { findSketchProblems, repairSketch } from './repair';
import { sketchRegions } from '../features/regions';

describe('Repair Sketch', () => {
  it('closes a small gap and removes an overlapping line; the rectangle becomes a closed region', () => {
    let s = createSketch('s', 'Sketch1', 'front');
    s = addLine(s, { x: 0, y: 0 }, { x: 40, y: 0 })[0];
    s = addLine(s, { x: 40, y: 0 }, { x: 40, y: 20 })[0];
    s = addLine(s, { x: 40, y: 20 }, { x: 0, y: 20 })[0];
    s = addLine(s, { x: 0, y: 20 }, { x: 0.02, y: 0.01 })[0]; // a 0.02 gap at the start
    s = addLine(s, { x: 40, y: 20 }, { x: 0, y: 20 })[0]; // drawn twice
    const p = findSketchProblems(s);
    expect(p.some((x) => x.kind === 'gap')).toBe(true);
    expect(p.some((x) => x.kind === 'overlap')).toBe(true);
    const r = repairSketch(s);
    expect(Object.values(r.sketch.entities).filter((e) => e.kind === 'line').length).toBe(4);
    expect(sketchRegions(r.sketch).length).toBe(1);
    expect(findSketchProblems(r.sketch).length).toBe(0);
  });
});
