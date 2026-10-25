import { describe, expect, it } from 'vitest';
import { addCircle, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { csg, meshVolume } from './solid';
import { nearestThread, threadTool } from './thread';

describe('Features ▸ Hole Wizard ▸ Thread', () => {
  const doc = createDocument('Bout');
  doc.sketches.sk1 = addCircle(createSketch('sk1', 'Sketch1', 'top'), { x: 0, y: 0 }, 7)[0];
  const f2: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 40, reverse: false };
  doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, f2];
  const rod = rebuildDocument(doc, null).bodies[0].geometry;

  it('picks M14x2.0 for a Ø14 rod and M16x2.0 for a Ø13.835 tap drill', () => {
    expect(nearestThread(14, false)[0]).toBe('M14x2.0');
    expect(nearestThread(13.835, true)[0]).toBe('M16x2.0');
  });

  it('a 30 mm M14x2.0 cut thread removes the V groove (about 540 mm³) along the helix', () => {
    const tool = threadTool({ center: [0, 40, 0], axis: [0, -1, 0], radius: 7, internal: false, pitch: 2, length: 30, method: 'cut', rightHand: true });
    expect(meshVolume(tool)).toBeGreaterThan(0);
    const v0 = meshVolume(rod);
    const v1 = meshVolume(csg(rod, tool, 'subtract'));
    const h = 0.6134 * 2;
    const expected = h * h * Math.tan(Math.PI / 6) * 2 * Math.PI * (7 - h / 3) * 15;
    expect(Math.abs(v0 - v1 - expected) / expected).toBeLessThan(0.12);
  });
});
