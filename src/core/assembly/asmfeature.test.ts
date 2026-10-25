import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type Component, type Document, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { meshVolume } from '../features/solid';
import { rebuildAssembly } from './assembly';

function block(): Document {
  const doc = createDocument('Blok');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: -20, y: -20 }, { x: 20, y: -20 }, { x: 20, y: 20 }, { x: -20, y: 20 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  doc.sketches.sk1 = s;
  doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as ExtrudeFeature];
  return doc;
}

describe('Assembly Features ▸ Extruded Cut', () => {
  it('a 10 x 30 slot cut through all from the Front Plane removes material from both blocks, not from the parts', () => {
    const asm = createDocument('Asm', 'assembly');
    const comps: Component[] = [
      { id: 'a', name: 'Blok<1>', part: { ...block(), kind: 'part' }, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false },
      { id: 'b', name: 'Blok<2>', part: { ...block(), kind: 'part' }, position: [0, 10, 0], rotation: [0, 0, 0, 1], fixed: false, suppressed: false },
    ];
    asm.components = comps;
    asm.mates = [];
    let s = createSketch('ask', 'Sketch1', 'front');
    const c = [{ x: -5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 35 }, { x: -5, y: 35 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    asm.sketches = { ask: s };
    const cut: ExtrudeFeature = { id: 'ac', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'ask', suppressed: false, op: 'cut', end: 'throughAll', depth: 10, reverse: false };
    asm.features = [{ id: 'k', type: 'sketch', name: 'Sketch1', sketchId: 'ask', suppressed: false } as SketchFeature, cut];
    const before = rebuildAssembly({ ...asm, features: [] }).bodies.map((b) => meshVolume(b.geometry));
    const r = rebuildAssembly(asm);
    expect(r.errors).toEqual({});
    const after = r.bodies.map((b) => meshVolume(b.geometry));
    // through all one way from the Front Plane (z = 0 .. 20): block 1 loses 10 x 5 x 20, block 2 10 x 10 x 20
    expect(before[0] - after[0]).toBeCloseTo(10 * 5 * 20, -1);
    expect(before[1] - after[1]).toBeCloseTo(10 * 10 * 20, -1);
    expect(r.consumedSketches.has('ask')).toBe(true);
    expect(comps[0].part.features.length).toBe(2);
  });
});
