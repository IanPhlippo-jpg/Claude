import { afterEach, describe, expect, it } from 'vitest';
import { createDocument, type ExtrudeFeature } from '../document/types';
import { addLine, createSketch } from '../sketch/model';
import { rebuildDocument, setRebuildBudget } from './rebuild';
import { MAX_PATTERN_INSTANCES, patternInstances } from './pattern';

function block() {
  let s = createSketch('s1', 'Sketch1', 'front');
  s = addLine(s, { x: -5, y: -5 }, { x: 5, y: -5 })[0];
  s = addLine(s, { x: 5, y: -5 }, { x: 5, y: 5 })[0];
  s = addLine(s, { x: 5, y: 5 }, { x: -5, y: 5 })[0];
  s = addLine(s, { x: -5, y: 5 }, { x: -5, y: -5 })[0];
  const e: ExtrudeFeature = { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false };
  return { ...createDocument('Blok'), sketches: { s1: s }, features: [{ id: 'k1', type: 'sketch' as const, name: 'Sketch1', sketchId: 's1', suppressed: false }, e] };
}

describe('rebuild limits (QA v0.3.3 F44, F46)', () => {
  afterEach(() => setRebuildBudget(45_000));

  it('builds normally within the budget', () => {
    const r = rebuildDocument(block());
    expect(r.bodies.length).toBe(1);
    expect(r.errors.e1).toBeUndefined();
  });

  it('marks the features after the wall-clock budget instead of computing them', () => {
    setRebuildBudget(0);
    const r = rebuildDocument(block());
    expect(r.bodies.length).toBe(0);
    expect(r.errors.e1).toMatch(/Not rebuilt: the rebuild stopped/);
  });

  it('never makes more pattern instances than the limit', () => {
    expect(MAX_PATTERN_INSTANCES).toBeLessThanOrEqual(250);
    const t = patternInstances({ type: 'linearPattern', dir1: { axis: [1, 0, 0], spacing: 20, count: 100 }, dir2: { axis: [0, 1, 0], spacing: 20, count: 100 } });
    expect(t.length).toBe(MAX_PATTERN_INSTANCES);
  });
});
