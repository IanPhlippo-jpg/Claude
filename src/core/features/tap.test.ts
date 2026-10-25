import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type HoleFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';
import { REFERENCE_PLANE_DEFS } from './planes';
import { projectedView } from '../drawing/sheet';

describe('Hole Wizard ▸ Straight Tap', () => {
  it('an M6 tapped hole drills the 5.0 mm tap drill and shows a 6 mm cosmetic thread', () => {
    const doc = createDocument('T');
    let s = createSketch('sk1', 'Sketch1', 'front');
    const c = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }, { x: 0, y: 40 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    doc.sketches.sk1 = s;
    // the hole sits on the face at z = 10 (normal +z, out of the material), as a face picked in the graphics area
    doc.planes.face = { ...REFERENCE_PLANE_DEFS.front, id: 'face', name: 'Face1', origin: [0, 0, 10], kind: 'face' };
    const plate: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false };
    const hole: HoleFeature = { id: 'f3', type: 'hole', name: 'M6x1.0 Tapped Hole1', suppressed: false, plane: 'face', points: [{ x: 20, y: 20 }], holeType: 'tap', diameter: 5, depth: 0, cbDiameter: 11, cbDepth: 6.8, csDiameter: 12.6, csAngle: 90, sizeName: 'M6', threadDiameter: 6, pitch: 1 };
    doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, plate, hole];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    const v = meshVolume(r.bodies[0].geometry);
    const expected = 40 * 40 * 10 - Math.PI * 2.5 * 2.5 * 10;
    expect(Math.abs(v - expected) / expected).toBeLessThan(0.005);
    const thread = (r.curves ?? []).find((x) => x.name === 'Cosmetic Thread');
    expect(thread).toBeTruthy();
    expect(thread!.points[0].distanceTo(thread!.points[24])).toBeCloseTo(6, 3);
    // drawing: a thin dashed circle of Ø6 in the front view, two dashed lines 6 apart and 10 long in the top view
    const front = projectedView(doc, 'front').lines.filter((l) => l.cosmetic);
    expect(front.length).toBe(48);
    const xs = front.map((l) => l.a[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(6, 1);
    const top = projectedView(doc, 'top').lines.filter((l) => l.cosmetic);
    expect(top.length).toBe(2);
    expect(Math.abs(top[0].a[0] - top[1].a[0])).toBeCloseTo(6, 3);
    expect(Math.hypot(top[0].a[0] - top[0].b[0], top[0].a[1] - top[0].b[1])).toBeCloseTo(10, 1);
  });
});
