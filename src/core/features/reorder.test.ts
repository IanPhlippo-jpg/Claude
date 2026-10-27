import { describe, expect, it } from 'vitest';
import { createDocument, type Feature } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { edgeRef } from './edgesets';
import { meshVolume } from './solid';
import { reorderFeatures, reorderGroup } from './reorder';

// a plate (Sketch1 + Boss-Extrude1), a hole (Sketch2 + Cut-Extrude1) and a chamfer on a top edge of the plate
const part = () => {
  const doc = createDocument();
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 40 }, { x: 0, y: 40 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  doc.sketches.sk1 = s;
  doc.sketches.sk2 = addCircle(createSketch('sk2', 'Sketch2', 'top'), { x: 40, y: 20 }, 5)[0];
  doc.features.push({ id: 's1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as Feature);
  doc.features.push({ id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
  doc.features.push({ id: 's2', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false } as Feature);
  doc.features.push({ id: 'f2', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false });
  const edge = rebuildDocument(doc).bodies[0].edges.find((e) => e.straight && Math.abs(e.centroid.y - 10) < 1e-6 && Math.abs(e.length - 80) < 1e-6)!;
  doc.features.push({ id: 'c1', type: 'chamfer', name: 'Chamfer1', suppressed: false, size: 2, edges: [edgeRef(edge)] } as never);
  return doc;
};
const names = (fs: Feature[]) => fs.map((f) => f.name);

describe('feature reorder in the design tree (QA v0.5.1 F113)', () => {
  it('a feature moves with its absorbed sketch', () => {
    const doc = part();
    expect(reorderGroup(doc, 'f2')).toEqual(['s2', 'f2']);
    const r = reorderFeatures(doc, 'c1', 'f1');
    expect(r.error).toBeUndefined();
    expect(names(r.features!)).toEqual(['Sketch1', 'Boss-Extrude1', 'Chamfer1', 'Sketch2', 'Cut-Extrude1']);
    // the same body: the chamfer and the hole do not touch
    const before = meshVolume(rebuildDocument(doc).bodies[0].geometry);
    const after = rebuildDocument({ ...doc, features: r.features! });
    expect(after.errors).toEqual({});
    expect(meshVolume(after.bodies[0].geometry)).toBeCloseTo(before, 0);
    const up = reorderFeatures(doc, 'f2', 'f1');
    expect(names(up.features!)).toEqual(['Sketch1', 'Boss-Extrude1', 'Sketch2', 'Cut-Extrude1', 'Chamfer1']);
  });

  it('a feature cannot move above its parent nor below its child', () => {
    const doc = part();
    // the cut extrude above the plate it cuts is allowed by references (it does not name the plate) …
    expect(reorderFeatures(doc, 'f2', null).error).toBeUndefined();
    // … but the plate cannot move below its own sketch's users, and a sketch not above its feature
    const s = reorderFeatures({ ...doc, features: [...doc.features, { id: 'f3', type: 'extrude', name: 'Boss-Extrude2', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 5, reverse: true } as Feature] }, 's1', 'f3');
    expect(s.error).toMatch(/Sketch1 cannot be moved below Boss-Extrude1: Boss-Extrude1 is a child of Sketch1/);
    // the chamfer names no feature: by references it may go anywhere; the app refuses a move that fails the rebuild
    expect(reorderFeatures(doc, 'c1', null).error).toBeUndefined();
    expect(rebuildDocument({ ...doc, features: reorderFeatures(doc, 'c1', null).features! }).errors.c1).toBeTruthy();
  });
});
