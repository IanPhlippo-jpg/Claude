import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createDocument, type ExtrudeFeature } from '../document/types';
import { addLine, createSketch } from '../sketch/model';
import { featureGeometry } from './rebuild';
import { meshVolume } from './solid';

/** a 10 x 10 square on the Front plane (z = 0) extruded along +z */
function docWithSquare() {
  let s = createSketch('s1', 'Sketch1', 'front');
  s = addLine(s, { x: -5, y: -5 }, { x: 5, y: -5 })[0];
  s = addLine(s, { x: 5, y: -5 }, { x: 5, y: 5 })[0];
  s = addLine(s, { x: 5, y: 5 }, { x: -5, y: 5 })[0];
  s = addLine(s, { x: -5, y: 5 }, { x: -5, y: -5 })[0];
  const doc = createDocument('Part1');
  return { ...doc, sketches: { s1: s }, features: [{ id: 'sk', type: 'sketch' as const, name: 'Sketch1', sketchId: 's1', suppressed: false }] };
}

const extrude = (patch: Partial<ExtrudeFeature>): ExtrudeFeature => ({ id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false, ...patch });

/** a slab from z = 20 to z = 30 (the "next" face is at z = 20) */
const slab = () => new THREE.BoxGeometry(100, 100, 10).translate(0, 0, 25);

describe('extrude end conditions', () => {
  it('Up To Next stops at the first face of the body', () => {
    const r = featureGeometry(docWithSquare(), extrude({ end: 'upToNext' }), 1e4, slab());
    expect(r.error).toBeUndefined();
    expect(Math.abs(meshVolume(r.geometry!))).toBeCloseTo(100 * 20, 0);
    r.geometry!.computeBoundingBox();
    expect(r.geometry!.boundingBox!.max.z).toBeCloseTo(20, 1);
  });

  it('Up To Surface ends at the selected planar face (also a slanted one)', () => {
    const flat = featureGeometry(docWithSquare(), extrude({ end: 'upToSurface', surface: { normal: [0, 0, -1], point: [0, 0, 20], label: 'Face<1>' } }), 1e4, slab());
    expect(flat.error).toBeUndefined();
    expect(Math.abs(meshVolume(flat.geometry!))).toBeCloseTo(2000, 0);
    // a plane tilted 45 degrees through (0, 0, 20): the end face is slanted, mean height still 20
    const n = new THREE.Vector3(1, 0, -1).normalize();
    const slanted = featureGeometry(docWithSquare(), extrude({ end: 'upToSurface', surface: { normal: [n.x, n.y, n.z], point: [0, 0, 20], label: 'Face<2>' } }), 1e4, slab());
    expect(slanted.error).toBeUndefined();
    expect(Math.abs(meshVolume(slanted.geometry!))).toBeCloseTo(2000, 0);
    slanted.geometry!.computeBoundingBox();
    expect(slanted.geometry!.boundingBox!.max.z).toBeCloseTo(25, 1);
  });

  it('Offset From Surface stops before the face, Reverse offset goes past it', () => {
    const before = featureGeometry(docWithSquare(), extrude({ end: 'offsetFromSurface', offset: 5, surface: { normal: [0, 0, -1], point: [0, 0, 20], label: 'Face<1>' } }), 1e4, slab());
    expect(Math.abs(meshVolume(before.geometry!))).toBeCloseTo(1500, 0);
    const past = featureGeometry(docWithSquare(), extrude({ end: 'offsetFromSurface', offset: 5, reverseOffset: true, surface: { normal: [0, 0, -1], point: [0, 0, 20], label: 'Face<1>' } }), 1e4, slab());
    expect(Math.abs(meshVolume(past.geometry!))).toBeCloseTo(2500, 0);
  });

  it('reports what is missing', () => {
    expect(featureGeometry(docWithSquare(), extrude({ end: 'upToNext' }), 1e4, null).error).toMatch(/solid body/);
    expect(featureGeometry(docWithSquare(), extrude({ end: 'upToSurface' }), 1e4, slab()).error).toMatch(/Select the face/);
    expect(featureGeometry(docWithSquare(), extrude({ end: 'upToNext', reverse: true }), 1e4, slab()).error).toMatch(/no face/);
  });

  it('Up To Vertex ends at the height of the vertex along the sketch normal (either side)', () => {
    const up = featureGeometry(docWithSquare(), extrude({ end: 'upToVertex', vertex: { point: [50, 7, 25], label: 'Vertex<1>' } }), 1e4, slab());
    expect(up.error).toBeUndefined();
    expect(Math.abs(meshVolume(up.geometry!))).toBeCloseTo(100 * 25, 0);
    const down = featureGeometry(docWithSquare(), extrude({ end: 'upToVertex', vertex: { point: [0, 0, -12], label: 'Vertex<1>' } }), 1e4, slab());
    down.geometry!.computeBoundingBox();
    expect(down.geometry!.boundingBox!.min.z).toBeCloseTo(-12, 3);
    expect(featureGeometry(docWithSquare(), extrude({ end: 'upToVertex' }), 1e4, slab()).error).toMatch(/Select a vertex/);
  });
});

