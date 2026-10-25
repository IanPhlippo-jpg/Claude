import { describe, expect, it } from 'vitest';
import type * as THREE from 'three';
import { createDocument, type CombineFeature, type Document, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';

/** a square sketch on the Front plane, side s centred at (cx, cy) */
function square(id: string, name: string, cx: number, cy: number, s: number) {
  let sk = createSketch(id, name, 'front');
  const h = s / 2;
  sk = addLine(sk, { x: cx - h, y: cy - h }, { x: cx + h, y: cy - h })[0];
  sk = addLine(sk, { x: cx + h, y: cy - h }, { x: cx + h, y: cy + h })[0];
  sk = addLine(sk, { x: cx + h, y: cy + h }, { x: cx - h, y: cy + h })[0];
  sk = addLine(sk, { x: cx - h, y: cy + h }, { x: cx - h, y: cy - h })[0];
  return sk;
}

const sketchF = (id: string, sketchId: string, name: string): SketchFeature => ({ id, type: 'sketch', name, sketchId, suppressed: false });
const extrudeF = (id: string, sketchId: string, name: string, patch: Partial<ExtrudeFeature> = {}): ExtrudeFeature => ({ id, type: 'extrude', name, sketchId, suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false, ...patch });

function twoBlocks(merge: boolean): Document {
  const doc = createDocument('Part1');
  // two 10 x 10 squares 30 apart: the second never touches the first
  return {
    ...doc,
    sketches: { s1: square('s1', 'Sketch1', 0, 0, 10), s2: square('s2', 'Sketch2', 30, 0, 10), s3: square('s3', 'Sketch3', 30, 0, 4) },
    features: [sketchF('k1', 's1', 'Sketch1'), extrudeF('e1', 's1', 'Boss-Extrude1'), sketchF('k2', 's2', 'Sketch2'), extrudeF('e2', 's2', 'Boss-Extrude2', { merge })],
  };
}

const vol = (g: THREE.BufferGeometry) => Math.abs(meshVolume(g));

describe('multi-body', () => {
  it('a boss that touches nothing becomes a second body (even with Merge result on)', () => {
    const r = rebuildDocument(twoBlocks(true));
    expect(Object.keys(r.errors)).toHaveLength(0);
    expect(r.bodies.map((b) => b.id)).toEqual(['body1', 'body2']);
    expect(vol(r.bodies[1].geometry)).toBeCloseTo(1000, 0);
  });

  it('Merge result off keeps overlapping material as a separate body; on merges it', () => {
    const doc = twoBlocks(true);
    const overlapping = { ...doc, sketches: { ...doc.sketches, s2: square('s2', 'Sketch2', 5, 0, 10) } };
    const merged = rebuildDocument(overlapping);
    expect(merged.bodies).toHaveLength(1);
    expect(vol(merged.bodies[0].geometry)).toBeCloseTo(1500, 0);
    const separate = rebuildDocument({ ...overlapping, features: overlapping.features.map((f) => (f.id === 'e2' ? { ...f, merge: false } : f)) });
    expect(separate.bodies).toHaveLength(2);
  });

  it('a cut only touches the bodies in its reach (Auto-select) or the Feature Scope', () => {
    const doc = twoBlocks(false);
    const cut = extrudeF('c1', 's3', 'Cut-Extrude1', { op: 'cut', end: 'throughAll' });
    const r = rebuildDocument({ ...doc, features: [...doc.features, sketchF('k3', 's3', 'Sketch3'), cut] });
    expect(Object.keys(r.errors)).toHaveLength(0);
    expect(vol(r.bodies[0].geometry)).toBeCloseTo(1000, 0);
    expect(vol(r.bodies[1].geometry)).toBeCloseTo(1000 - 160, 0);
    // Feature Scope: only body1 selected -> the cut misses it and reports that
    const scoped = rebuildDocument({ ...doc, features: [...doc.features, sketchF('k3', 's3', 'Sketch3'), { ...cut, scope: ['body1'] }] });
    expect(scoped.errors['c1']).toMatch(/Feature Scope/);
  });

  it('hidden bodies are not used for Merge result', () => {
    const doc = twoBlocks(true);
    const overlapping: Document = { ...doc, sketches: { ...doc.sketches, s2: square('s2', 'Sketch2', 5, 0, 10) }, hiddenBodies: ['body1'] };
    const r = rebuildDocument(overlapping);
    expect(r.bodies).toHaveLength(2);
  });

  it('Combine adds, subtracts and keeps the common part', () => {
    const doc = twoBlocks(false);
    const overlapping = { ...doc, sketches: { ...doc.sketches, s2: square('s2', 'Sketch2', 5, 0, 10) } };
    const combine = (op: CombineFeature['op']): CombineFeature => ({ id: 'cb', type: 'combine', name: 'Combine1', suppressed: false, op, mainBody: 'body1', bodies: ['body1', 'body2'] });
    const add = rebuildDocument({ ...overlapping, features: [...overlapping.features, combine('add')] });
    expect(add.bodies).toHaveLength(1);
    expect(vol(add.bodies[0].geometry)).toBeCloseTo(1500, 0);
    const sub = rebuildDocument({ ...overlapping, features: [...overlapping.features, combine('subtract')] });
    expect(sub.bodies).toHaveLength(1);
    expect(vol(sub.bodies[0].geometry)).toBeCloseTo(500, 0);
    const common = rebuildDocument({ ...overlapping, features: [...overlapping.features, combine('common')] });
    expect(common.bodies).toHaveLength(1);
    expect(vol(common.bodies[0].geometry)).toBeCloseTo(500, 0);
  });
});
