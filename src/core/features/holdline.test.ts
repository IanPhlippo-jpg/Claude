import { describe, expect, it } from 'vitest';
import { createDocument, type Feature } from '../document/types';
import { addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { edgeRef } from './edgesets';
import { faceFilletEdges, holdLineRadius } from './round';
import { meshVolume } from './solid';

/** a 60 × 20 × 6 bar (front plane profile 60 × 20, extruded 6 along Z) */
function bar() {
  const d = createDocument('Bar');
  let s = createSketch('s1', 'Sketch1', 'front');
  const c = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 20 }, { x: 0, y: 20 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  d.sketches = { s1: s };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 6, reverse: false }] as Feature[];
  return d;
}

describe('Face Fillet ▸ Hold line', () => {
  it('the radius ends the fillet on the hold line: r = d · tan(α / 2), 6 for a right angle 6 away', () => {
    const d = bar();
    const body = rebuildDocument(d).bodies[0];
    const top = body.faces.find((f) => f.normal[1] > 0.999)!;
    const front = body.faces.find((f) => f.normal[2] > 0.999)!;
    const [edge] = faceFilletEdges(body.edges, top, front);
    // the hold line: the other long edge of the top face (z = 0)
    const hold = body.edges.find((e) => e.straight && Math.abs(e.centroid.y - 20) < 1e-6 && Math.abs(e.centroid.z) < 1e-6)!;
    expect(holdLineRadius(edge, hold)).toBeCloseTo(6, 6);
    d.features.push({ id: 'r1', type: 'fillet', name: 'Fillet1', suppressed: false, size: 1, roundType: 'face', holdLineMode: true, edges: [edgeRef(edge)], holdLine: edgeRef(hold) } as Feature);
    const r = rebuildDocument(d);
    expect(r.errors.r1).toBeUndefined();
    const v = Math.abs(meshVolume(r.bodies[0].geometry));
    expect(Math.abs(v - (60 * 20 * 6 - (1 - Math.PI / 4) * 36 * 60))).toBeLessThan(15);
  });
  it('a hold line that is not parallel is said', () => {
    const d = bar();
    const body = rebuildDocument(d).bodies[0];
    const top = body.faces.find((f) => f.normal[1] > 0.999)!;
    const front = body.faces.find((f) => f.normal[2] > 0.999)!;
    const [edge] = faceFilletEdges(body.edges, top, front);
    const side = body.edges.find((e) => e.straight && Math.abs(e.centroid.x - 60) < 1e-6 && Math.abs(e.centroid.y - 20) < 1e-6)!;
    expect(holdLineRadius(edge, side)).toMatch(/parallel/);
  });
});
