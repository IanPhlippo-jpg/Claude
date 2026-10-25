import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type IntersectFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';

function twoBoxes(exclude: IntersectFeature['exclude'], merge = true) {
  const doc = createDocument('I');
  const rect = (id: string, x0: number) => {
    let s = createSketch(id, id, 'top');
    const c = [{ x: x0, y: 0 }, { x: x0 + 40, y: 0 }, { x: x0 + 40, y: -40 }, { x: x0, y: -40 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    return s;
  };
  doc.sketches = { a: rect('a', 0), b: rect('b', 20) };
  doc.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'a', suppressed: false } as SketchFeature,
    { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'a', suppressed: false, op: 'boss', end: 'blind', depth: 40, reverse: false } as ExtrudeFeature,
    { id: 'f3', type: 'sketch', name: 'Sketch2', sketchId: 'b', suppressed: false } as SketchFeature,
    { id: 'f4', type: 'extrude', name: 'Boss-Extrude2', sketchId: 'b', suppressed: false, op: 'boss', end: 'blind', depth: 40, reverse: false, merge: false } as ExtrudeFeature,
    { id: 'f5', type: 'intersect', name: 'Intersect1', suppressed: false, bodies: ['body1', 'body2'], exclude, merge } as IntersectFeature,
  ];
  const r = rebuildDocument(doc, null);
  expect(r.errors).toEqual({});
  return r.bodies.map((b) => meshVolume(b.geometry));
}

describe('Intersect', () => {
  it('keeping only the common region gives the overlap', () => {
    const v = twoBoxes(['a', 'b']);
    expect(v.length).toBe(1);
    expect(v[0]).toBeCloseTo(20 * 40 * 40, 0);
  });
  it('excluding the common region leaves the two outer parts (merged into one body, or separate)', () => {
    const merged = twoBoxes(['common']);
    expect(merged.reduce((a, b) => a + b, 0)).toBeCloseTo(2 * 20 * 40 * 40, 0);
    const apart = twoBoxes(['common'], false);
    expect(apart.length).toBe(2);
  });
});
