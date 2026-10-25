import { describe, expect, it } from 'vitest';
import { createDocument } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { faceOwner } from './faceOwner';

describe('face owner (hover tag)', () => {
  it('the top face of a plate belongs to Boss-Extrude1', () => {
    let s = createSketch('s1', 'Sketch1', 'top');
    const c = [[0, 0], [80, 0], [80, 80], [0, 80]];
    for (let i = 0; i < 4; i++) s = addLine(s, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
    s = addCircle(s, { x: 40, y: 40 }, 17.5)[0];
    const doc = { ...createDocument('P'), sketches: { s1: s }, features: [
      { id: 'k', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
      { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    ] } as never;
    const body = rebuildDocument(doc).bodies[0];
    const top = body.faces.filter((f) => !f.curved && f.normal[1] > 0.99)[0];
    // a point on the face (its centroid lies in the hole): the centre of one of its triangles
    const p = (body.geometry.index ? body.geometry.toNonIndexed() : body.geometry).getAttribute('position');
    const t = top.triangles[0] * 3;
    const ctr: [number, number, number] = [0, 1, 2].map((k) => (p.getComponent(t, k) + p.getComponent(t + 1, k) + p.getComponent(t + 2, k)) / 3) as [number, number, number];
    expect(faceOwner(doc, ctr, top.normal)?.name).toBe('Boss-Extrude1');
  });
});
