import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type Feature, type RevolveFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';

// a 10 x 20 rectangle beside a vertical centreline at x = 0 (radius 10..20, height 0..20)
const doc0 = () => {
  const doc = createDocument();
  let s = createSketch('s', 's', 'front');
  let axis;
  [s, axis] = addLine(s, { x: 0, y: -5 }, { x: 0, y: 30 }, true);
  const c = [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 10, y: 20 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  doc.sketches = { s };
  return { doc, axis: axis.id };
};
const full = Math.PI * (400 - 100) * 20;
const rev = (axis: string, o: Partial<RevolveFeature>): Feature => ({ id: 'r', type: 'revolve', name: 'Revolve1', sketchId: 's', suppressed: false, op: 'boss', axisEntityId: axis, angle: 90, reverse: false, ...o } as Feature);

describe('revolve options of the original', () => {
  it('Direction 2 adds its angle on the other side; Mid-Plane splits the angle', () => {
    const { doc, axis } = doc0();
    doc.features = [{ id: 'k', type: 'sketch', name: 'S', sketchId: 's', suppressed: false } as Feature, rev(axis, { direction2: { angle: 90 } })];
    let r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(Math.abs(Math.abs(meshVolume(r.bodies[0].geometry)) - full / 2) / (full / 2)).toBeLessThan(0.005);
    doc.features[1] = rev(axis, { end: 'midPlane', angle: 180 });
    r = rebuildDocument(doc);
    expect(Math.abs(Math.abs(meshVolume(r.bodies[0].geometry)) - full / 2) / (full / 2)).toBeLessThan(0.005);
  });
  it('Thin Feature: a 2 mm wall from the profile lines', () => {
    const { doc, axis } = doc0();
    doc.features = [{ id: 'k', type: 'sketch', name: 'S', sketchId: 's', suppressed: false } as Feature, rev(axis, { angle: 360, thin: { mode: 'mid', thickness: 2 } })];
    const r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    const v = Math.abs(meshVolume(r.bodies[0].geometry));
    // the 2 mm frame around the 10 x 20 profile (area 2 x 60 = 120) turned around a mean radius of 15
    expect(Math.abs(v - 2 * Math.PI * 15 * 120) / (2 * Math.PI * 15 * 120)).toBeLessThan(0.01);
  });
});
