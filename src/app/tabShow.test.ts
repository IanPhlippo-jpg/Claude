import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addCircle, createSketch } from '../core/sketch/model';
import { createDocument, type Component, type Document, type ExtrudeFeature, type SketchFeature } from '../core/document/types';
import { hiddenComponentAt } from './tabShow';

/** a pin: Ø10 cylinder 30 high on the top plane (along +y) */
function pin(): Document {
  const doc = createDocument('Pin');
  doc.sketches.sk1 = addCircle(createSketch('sk1', 'Sketch1', 'top'), { x: 0, y: 0 }, 5)[0];
  const f1: SketchFeature = { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false };
  const f2: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 30, reverse: false };
  doc.features = [f1, f2];
  return doc;
}
const comp = (id: string, x: number, hidden: boolean): Component => ({ id, name: `Pin<${id}>`, part: pin(), position: [x, 0, 0], rotation: [0, 0, 0, 1], fixed: false, suppressed: false, hidden });
/** a ray straight down onto (x, z) from above */
const down = (x: number, z = 0) => new THREE.Ray(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));

describe('Shift+Tab shows the hidden component under the pointer (parity point 11)', () => {
  const comps = [comp('a', 0, true), comp('b', 50, true), comp('c', 100, false)];
  it('finds the hidden component the ray meets', () => {
    expect(hiddenComponentAt(comps, down(0))).toBe('a');
    expect(hiddenComponentAt(comps, down(51, 2))).toBe('b');
  });
  it('ignores shown components and empty space', () => {
    expect(hiddenComponentAt(comps, down(100))).toBeNull();
    expect(hiddenComponentAt(comps, down(25))).toBeNull();
  });
  it('the nearest of two hidden components along the ray wins', () => {
    const stacked = [comp('low', 0, true), { ...comp('high', 0, true), position: [0, 40, 0] as [number, number, number] }];
    expect(hiddenComponentAt(stacked, down(0))).toBe('high');
  });
});
