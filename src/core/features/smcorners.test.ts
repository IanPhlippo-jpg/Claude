import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createDocument } from '../document/types';
import { addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { csg, meshVolume } from './solid';
import { closedCornerTool } from './smcorners';
import { thickenSurface } from './surfaces';

describe('sheet metal corners and conversions', () => {
  it('Closed Corner extends an end face up to the flange beside it', () => {
    // flange A: x 0..3, y 0..20, z 5..40 ; flange B: x 5..40, y 0..20, z 0..3 -> A's end face (z = 5, normal -z) faces B with a 2 mm gap
    const a = new THREE.BoxGeometry(3, 20, 35).toNonIndexed(); a.translate(1.5, 10, 22.5);
    const b = new THREE.BoxGeometry(40, 20, 3).toNonIndexed(); b.translate(20, 10, 1.5);
    const g = csg(a, b, 'union');
    const r = closedCornerTool(g, { normal: [0, 0, -1], point: [1.5, 10, 5] }, 3, 0);
    expect('error' in r).toBe(false);
    if ('error' in r) return;
    const closed = csg(g, r.tool, 'union');
    // the gap was 2 x 3 x 20 (x 0..3, z 3..5): filled
    expect(Math.abs(meshVolume(closed))).toBeGreaterThan(Math.abs(meshVolume(g)) + 3 * 2 * 20 - 1);
  });

  it('thickening a flat strip gives a plate of that thickness', () => {
    const plane = new THREE.PlaneGeometry(40, 20).toNonIndexed();
    const solid = thickenSurface(plane, 2);
    expect(Math.abs(meshVolume(solid))).toBeCloseTo(40 * 20 * 2, 3);
    expect(meshVolume(solid)).toBeGreaterThan(0);
  });

  it('Lofted-Bend between two open profiles, Convert to Sheet Metal of a block', () => {
    const doc = createDocument();
    doc.sketches.a = addLine(createSketch('a', 'A', 'top'), { x: 0, y: 0 }, { x: 40, y: 0 })[0];
    doc.planes.p2 = { id: 'p2', name: 'Plane1', origin: [0, 30, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], kind: 'reference' };
    doc.sketches.b = addLine(createSketch('b', 'B', 'p2'), { x: 0, y: 10 }, { x: 40, y: 10 })[0];
    doc.features.push({ id: 'lb', type: 'loftedBend', name: 'Lofted-Bend1', suppressed: false, sketchId: 'a', sketchId2: 'b', thickness: 2 });
    let r = rebuildDocument(doc);
    expect(r.errors).toEqual({});
    expect(Math.abs(meshVolume(r.bodies[0].geometry))).toBeGreaterThan(40 * 30 * 2 * 0.9);

    const d2 = createDocument();
    let s = createSketch('s', 'S', 'top');
    const c = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 40 }, { x: 0, y: 40 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    d2.sketches.s = s;
    d2.features.push({ id: 'e', type: 'extrude', name: 'E', sketchId: 's', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false });
    d2.features.push({ id: 'c', type: 'convertSheet', name: 'Convert-Solid1', suppressed: false, fixedFace: { normal: [0, -1, 0], point: [30, 0, -20] }, thickness: 2, bendRadius: 2 });
    r = rebuildDocument(d2);
    expect(r.errors).toEqual({});
    const v = Math.abs(meshVolume(r.bodies[0].geometry));
    // an open tray: floor 60x40x2 + walls, far less than the block
    expect(v).toBeLessThan(60 * 40 * 20 * 0.4);
    expect(v).toBeGreaterThan(60 * 40 * 2);
  });
});
