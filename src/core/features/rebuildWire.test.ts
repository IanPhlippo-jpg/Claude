import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createDocument, type ExtrudeFeature } from '../document/types';
import { addLine, createSketch } from '../sketch/model';
import { rebuildDocument } from './rebuild';
import { packRebuild, unpackRebuild } from './rebuildWire';

function block() {
  let s = createSketch('s1', 'Sketch1', 'front');
  s = addLine(s, { x: -5, y: -5 }, { x: 5, y: -5 })[0];
  s = addLine(s, { x: 5, y: -5 }, { x: 5, y: 5 })[0];
  s = addLine(s, { x: 5, y: 5 }, { x: -5, y: 5 })[0];
  s = addLine(s, { x: -5, y: 5 }, { x: -5, y: -5 })[0];
  const e: ExtrudeFeature = { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false };
  return { ...createDocument('Blok'), sketches: { s1: s }, features: [{ id: 'k1', type: 'sketch' as const, name: 'Sketch1', sketchId: 's1', suppressed: false }, e] };
}

describe('rebuild result over the worker boundary (QA F46)', () => {
  it('packs, clones with transfer and unpacks to the same bodies, edges and sets', () => {
    const r = rebuildDocument(block());
    const positions = Array.from(r.bodies[0].geometry.getAttribute('position').array);
    const { wire, transfer } = packRebuild(r);
    expect(transfer.length).toBeGreaterThan(0);
    const back = unpackRebuild(structuredClone(wire, { transfer }));
    expect(back.bodies).toHaveLength(r.bodies.length);
    const a = r.bodies[0], b = back.bodies[0];
    expect(b.geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(Array.from(b.geometry.getAttribute('position').array)).toEqual(positions);
    // the arrays moved to the other side (transferred, not copied)
    expect(a.geometry.getAttribute('position').array.length).toBe(0);
    expect(b.faces).toEqual(a.faces);
    expect(b.edges[0].centroid).toBeInstanceOf(THREE.Vector3);
    expect(b.edges[0].segments[0].a).toBeInstanceOf(THREE.Vector3);
    expect(b.edges.map((e) => e.length)).toEqual(a.edges.map((e) => e.length));
    expect(back.consumedSketches).toBeInstanceOf(Set);
    expect([...back.consumedSketches]).toEqual([...r.consumedSketches]);
    expect(back.errors).toEqual(r.errors);
  });
});
