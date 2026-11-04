import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type Feature, type RevolveFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';
import { edgeRef } from './edgesets';

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

describe('revolve options of the intended design', () => {
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

describe('a fillet on a revolved edge after a change of the profile (QA v0.5.1 F110, T2)', () => {
  // a tube r 10..30, h 40: R3 on the outer top rim; the outer radius becomes 36
  const tube = (outer: number) => {
    const doc = createDocument();
    let s = createSketch('s', 's', 'front');
    let axis;
    [s, axis] = addLine(s, { x: 0, y: -5 }, { x: 0, y: 50 }, true);
    const c = [{ x: 10, y: 0 }, { x: outer, y: 0 }, { x: outer, y: 40 }, { x: 10, y: 40 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    doc.sketches = { s };
    doc.features = [{ id: 'k', type: 'sketch', name: 'S', sketchId: 's', suppressed: false } as Feature, rev(axis.id, { angle: 360 })];
    return doc;
  };
  // the spandrel (1 - pi/4) r^2 turned about the axis at its centroid radius R - 0.2234 r
  const filletLoss = (R: number, r: number) => (1 - Math.PI / 4) * r * r * 2 * Math.PI * (R - 0.2234 * r);
  it('the rim stays rounded with the right volume when the outer radius changes', { timeout: 30000 }, () => {
    const doc = tube(30);
    const sharp30 = Math.abs(meshVolume(rebuildDocument(doc).bodies[0].geometry));
    const rim = rebuildDocument(doc).bodies[0].edges.find((e) => e.closed && Math.abs(e.centroid.y - 40) < 1e-3 && e.length > 2 * Math.PI * 25)!;
    expect(rim).toBeTruthy();
    // the rim is known by the names of its two faces, as an extruded edge (F47)
    expect(edgeRef(rim).faces).toBeTruthy();
    doc.features.push({ id: 'f', type: 'fillet', name: 'Fillet1', suppressed: false, size: 3, edges: [edgeRef(rim)] } as never);
    let r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(Math.abs(sharp30 - Math.abs(meshVolume(r.bodies[0].geometry)) - filletLoss(30, 3)) / filletLoss(30, 3)).toBeLessThan(0.1);
    const sk = doc.sketches.s;
    doc.sketches.s = { ...sk, points: Object.fromEntries(Object.entries(sk.points).map(([id, p]) => [id, Math.abs(p.x - 30) < 1e-9 ? { ...p, x: 36 } : p])) };
    const sharp36 = Math.abs(meshVolume(rebuildDocument({ ...doc, features: doc.features.slice(0, 2) }).bodies[0].geometry));
    r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(Math.abs(sharp36 - Math.abs(meshVolume(r.bodies[0].geometry)) - filletLoss(36, 3)) / filletLoss(36, 3)).toBeLessThan(0.1);
  });
});
