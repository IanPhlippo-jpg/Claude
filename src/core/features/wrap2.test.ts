import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type Feature, type WrapFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';

const rect = (id: string, plane: string, x0: number, y0: number, x1: number, y1: number) => {
  let s = createSketch(id, id, plane);
  const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  return s;
};

describe('Wrap > Spline Surface', () => {
  it('a 10 x 10 square projected onto the top face of a plate: emboss 2 adds 200, deboss 2 removes 200', () => {
    const doc = createDocument();
    doc.sketches = { a: rect('a', 'top', 0, 0, 40, -40), b: rect('b', 'front', 15, 20, 25, 30) };
    // the plate is 10 high (y 0..10); sketch b on the Front plane projects along z onto the front face (z = 40? or 0)
    const base: Feature[] = [
      { id: 'k1', type: 'sketch', name: 'S1', sketchId: 'a', suppressed: false } as Feature,
      { id: 'e1', type: 'extrude', name: 'B', sketchId: 'a', suppressed: false, op: 'boss', end: 'blind', depth: 40, reverse: false } as Feature,
      { id: 'k2', type: 'sketch', name: 'S2', sketchId: 'b', suppressed: false } as Feature,
    ];
    doc.features = base;
    const r0 = rebuildDocument(doc);
    const v0 = Math.abs(meshVolume(r0.bodies[0].geometry));
    const front = r0.bodies[0].faces.find((f) => !f.curved && Math.abs(f.normal[2]) > 0.99)!;
    const wrap = (kind: 'emboss' | 'deboss'): WrapFeature => ({ id: 'w', type: 'wrap', name: 'Wrap1', sketchId: 'b', suppressed: false, kind, depth: 2, face: null, method: 'spline', splineFace: { normal: front.normal, point: front.centroid, label: 'Face<1>' } });
    doc.features = [...base, wrap('emboss') as Feature];
    let r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(Math.abs(meshVolume(r.bodies[0].geometry)) - v0).toBeCloseTo(200, 0);
    doc.features = [...base, wrap('deboss') as Feature];
    r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(v0 - Math.abs(meshVolume(r.bodies[0].geometry))).toBeCloseTo(200, 0);
  });
});
