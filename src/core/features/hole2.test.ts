import { describe, expect, it } from 'vitest';
import { createDocument, type Feature } from '../document/types';
import { addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { holeTool } from './pattern';
import { meshVolume } from './solid';
import { REFERENCE_PLANE_DEFS } from './planes';

const vol = (g: Parameters<typeof meshVolume>[0]) => Math.abs(meshVolume(g));
const base = { holeType: 'counterbore' as const, diameter: 6.6, depth: 10, cbDiameter: 11, cbDepth: 6.5, csDiameter: 13, csAngle: 90 };

describe('Hole Tool options of the intended design', () => {
  it('Head clearance makes the counterbore deeper; the countersinks add cones', () => {
    const plain = vol(holeTool(base, REFERENCE_PLANE_DEFS.top, { x: 0, y: 0 }, 100));
    const clear = vol(holeTool({ ...base, headClearance: 1 }, REFERENCE_PLANE_DEFS.top, { x: 0, y: 0 }, 100));
    // the tool parts are summed (not unioned): the counterbore cylinder is 1 mm longer
    expect(clear - plain).toBeCloseTo(Math.PI * 5.5 * 5.5 * 1, -1);
    expect(vol(holeTool({ ...base, nearCs: { diameter: 13, angle: 90 } }, REFERENCE_PLANE_DEFS.top, { x: 0, y: 0 }, 100))).toBeGreaterThan(plain);
    expect(vol(holeTool({ ...base, underHeadCs: { diameter: 8, angle: 90 } }, REFERENCE_PLANE_DEFS.top, { x: 0, y: 0 }, 100))).toBeGreaterThan(plain);
  });
  it('Mirror > Merge solids off keeps the mirrored half as its own body', () => {
    const doc = createDocument();
    let s = createSketch('s', 's', 'top');
    const c = [{ x: 10, y: 0 }, { x: 40, y: 0 }, { x: 40, y: -20 }, { x: 10, y: -20 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    doc.sketches = { s };
    doc.features = [
      { id: 'k', type: 'sketch', name: 'S', sketchId: 's', suppressed: false } as Feature,
      { id: 'e', type: 'extrude', name: 'B', sketchId: 's', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as Feature,
      { id: 'm', type: 'mirror', name: 'Mirror1', suppressed: false, plane: 'right', mergeSolids: false } as Feature,
    ];
    const r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(r.bodies.length).toBe(2);
  });
});
