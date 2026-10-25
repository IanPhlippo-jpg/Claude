import { describe, expect, it } from 'vitest';
import { createDocument } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { REFERENCE_PLANE_DEFS } from './planes';

describe('body edges after booleans', () => {
  it('a plate with two holes has 12 straight edges and 4 closed rims, no fragments', () => {
    const doc = createDocument();
    let s = createSketch('sk1', 'Sketch1', 'top');
    const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 80 }, { x: 0, y: 80 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    s = addCircle(s, { x: 40, y: 40 }, 17.5)[0];
    doc.sketches.sk1 = s;
    doc.planes.pl1 = { ...REFERENCE_PLANE_DEFS.top, id: 'pl1', name: 'Face1', origin: [40, 10, -40] };
    doc.sketches.sk2 = addCircle(createSketch('sk2', 'Sketch2', 'pl1'), { x: 20, y: 20 }, 5)[0];
    doc.features.push({ id: 'f1', type: 'extrude', name: 'B', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
    doc.features.push({ id: 'f2', type: 'extrude', name: 'C', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: true });
    const body = rebuildDocument(doc).bodies[0];
    const straight = body.edges.filter((e) => e.straight);
    const closed = body.edges.filter((e) => e.closed);
    expect(straight).toHaveLength(12);
    expect(closed).toHaveLength(4);
    expect(body.edges).toHaveLength(16);
    const rims = closed.map((e) => Math.round(e.length)).sort((a, b) => a - b);
    expect(rims).toEqual([31, 31, 110, 110]);
  });
});
