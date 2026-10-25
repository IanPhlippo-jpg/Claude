import { describe, expect, it } from 'vitest';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type Component, type Document, type ExtrudeFeature, type HoleFeature, type SketchFeature } from '../document/types';
import { REFERENCE_PLANE_DEFS } from '../features/planes';
import { rebuildDocument } from '../features/rebuild';
import { meshVolume } from '../features/solid';
import { rebuildAssembly } from './assembly';
import { assemblyHoles, fastenerPart, fastenerSlots, placeFasteners } from './fasteners';

/** a 40 x 40 x 10 plate (Top Plane, extruded up) with an M6 clearance hole Ø6.6 in the middle from the top face */
function plate(name: string): Document {
  const doc = createDocument(name);
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: -20, y: -20 }, { x: 20, y: -20 }, { x: 20, y: 20 }, { x: -20, y: 20 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  doc.sketches.sk1 = s;
  doc.planes.face = { ...REFERENCE_PLANE_DEFS.top, id: 'face', name: 'Face', origin: [0, 10, 0], kind: 'face' };
  const ex: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false };
  const hole: HoleFeature = { id: 'f3', type: 'hole', name: 'Ø6.6 (6.6) Diameter Hole1', suppressed: false, plane: 'face', points: [{ x: 0, y: 0 }], holeType: 'simple', diameter: 6.6, depth: 0, cbDiameter: 11, cbDepth: 6.4, csDiameter: 12.4, csAngle: 90 };
  doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, ex, hole];
  return doc;
}

describe('Assembly ▸ Smart Fasteners', () => {
  it('toolbox parts rebuild: socket head cap screw, countersunk screw, hex bolt', () => {
    for (const t of ['shcs', 'csk', 'hex'] as const) {
      const p = fastenerPart(t, 'M6', 30);
      const r = rebuildDocument(p, null);
      expect(r.errors).toEqual({});
      expect(meshVolume(r.bodies[0].geometry)).toBeGreaterThan(Math.PI * 9 * 25);
    }
    // the socket is cut: less material than the plain head
    const plain = fastenerPart('shcs', 'M6', 30);
    plain.features = plain.features.slice(0, 2);
    const withSocket = meshVolume(rebuildDocument(fastenerPart('shcs', 'M6', 30), null).bodies[0].geometry);
    const without = meshVolume(rebuildDocument(plain, null).bodies[0].geometry);
    const s = 5, hexArea = (3 * Math.sqrt(3) / 2) * (s / Math.sqrt(3)) ** 2;
    expect(without - withSocket).toBeCloseTo(hexArea * 3.6, 0);
  });

  it('two stacked plates with a Ø6.6 hole get an ISO 4762 M6 x 30 through both, mated concentric and on the top face', () => {
    const asm = createDocument('Asm', 'assembly');
    const comps: Component[] = [
      { id: 'a', name: 'Plaat<1>', part: { ...plate('Plaat'), kind: 'part' }, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false },
      { id: 'b', name: 'Plaat<2>', part: { ...plate('Plaat'), kind: 'part' }, position: [0, 10, 0], rotation: [0, 0, 0, 1], fixed: false, suppressed: false },
    ];
    asm.components = comps;
    asm.mates = [];
    const r = rebuildAssembly(asm);
    const holes = assemblyHoles(asm, r.bodies);
    expect(holes.length).toBe(2);
    const slots = fastenerSlots(holes);
    expect(slots.length).toBe(1);
    expect(slots[0].size).toBe('M6');
    expect(slots[0].grip).toBeCloseTo(20, 1);
    expect(slots[0].length).toBe(30);
    expect(slots[0].top.componentId).toBe('b');
    const placed = placeFasteners(asm, slots);
    expect(placed.components[0].name).toBe('ISO 4762 M6 x 30<1>');
    expect(placed.components[0].position[1]).toBeCloseTo(20, 3);
    expect(placed.mates.map((m) => m.type)).toEqual(['concentric', 'coincident']);
  });
});
