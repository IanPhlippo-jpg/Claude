import { describe, expect, it } from 'vitest';
import { createDocument, type ExtrudeFeature } from '../document/types';
import { addLine, createSketch } from '../sketch/model';
import { featureGeometry } from './rebuild';
import { fullyDefineSketch } from '../sketch/fullyDefine';

function docWithSquare() {
  let s = createSketch('s1', 'Sketch1', 'front');
  s = addLine(s, { x: -5, y: -5 }, { x: 5, y: -5 })[0];
  s = addLine(s, { x: 5, y: -5 }, { x: 5, y: 5 })[0];
  s = addLine(s, { x: 5, y: 5 }, { x: -5, y: 5 })[0];
  s = addLine(s, { x: -5, y: 5 }, { x: -5, y: -5 })[0];
  const doc = createDocument('Part1');
  return { ...doc, sketches: { s1: s }, features: [{ id: 'sk', type: 'sketch' as const, name: 'Sketch1', sketchId: 's1', suppressed: false }] };
}
const extrude = (patch: Partial<ExtrudeFeature>): ExtrudeFeature => ({ id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false, ...patch });

describe('Extrude From ▸ Offset', () => {
  it('starts the extrusion at the offset from the sketch plane', () => {
    const r = featureGeometry(docWithSquare(), extrude({ fromOffset: 5 }));
    r.geometry!.computeBoundingBox();
    expect(r.geometry!.boundingBox!.min.z).toBeCloseTo(5, 5);
    expect(r.geometry!.boundingBox!.max.z).toBeCloseTo(15, 5);
    const rev = featureGeometry(docWithSquare(), extrude({ fromOffset: 5, fromReverse: true }));
    rev.geometry!.computeBoundingBox();
    expect(rev.geometry!.boundingBox!.min.z).toBeCloseTo(-5, 5);
  });
});

describe('Fully Define Sketch ▸ Chain scheme', () => {
  it('chains the horizontal dimensions from point to point', () => {
    let s = createSketch('s', 'S');
    s = addLine(s, { x: 10, y: 0 }, { x: 30, y: 0 })[0];
    s = addLine(s, { x: 50, y: 5 }, { x: 80, y: 5 })[0];
    const base = fullyDefineSketch(s, { relations: false, dimensions: true, hScheme: 'baseline' });
    const chain = fullyDefineSketch(s, { relations: false, dimensions: true, hScheme: 'chain' });
    const hvals = (k: typeof s) => Object.values(k.constraints).filter((c) => c.kind === 'hDistance').map((c) => c.value).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(base.dof).toBeLessThanOrEqual(1);
    expect(Math.max(...(hvals(base.sketch) as number[]))).toBeGreaterThan(40);
    expect(Math.max(...(hvals(chain.sketch) as number[]))).toBeLessThan(40);
    expect(chain.dof).toBe(base.dof);
  });
});

describe('Extrude Direction 2 ends', () => {
  it('Up To Vertex and Up To Surface give the depth of the second direction', () => {
    const v = featureGeometry(docWithSquare(), extrude({ direction2: { end: 'upToVertex', depth: 0, vertex: { point: [3, 3, -7], label: 'Vertex<1>' } } }));
    v.geometry!.computeBoundingBox();
    expect(v.geometry!.boundingBox!.min.z).toBeCloseTo(-7, 4);
    const s = featureGeometry(docWithSquare(), extrude({ direction2: { end: 'offsetFromSurface', depth: 0, surface: { normal: [0, 0, 1], point: [0, 0, -12], label: 'Face<1>' }, offset: 2 } }));
    s.geometry!.computeBoundingBox();
    expect(s.geometry!.boundingBox!.min.z).toBeCloseTo(-14, 4);
    const bad = featureGeometry(docWithSquare(), extrude({ direction2: { end: 'upToVertex', depth: 0, vertex: { point: [0, 0, 7], label: 'V' } } }));
    expect(bad.error).toBeTruthy();
  });
});
