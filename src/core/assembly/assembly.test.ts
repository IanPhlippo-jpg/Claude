import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { createDocument, type Component, type Document, type ExtrudeFeature, type Mate, type SketchFeature } from '../document/types';
import { cylinderAxis, componentMatrix, localRef, rebuildAssembly, solveMates, worldRef } from './assembly';
import { planarFaces } from '../features/solid';

/** a plate 40 x 40 x 10 with a Ø10 hole in the middle (top plane sketch: y -> -z) */
function plate(name = 'Plate'): Document {
  const doc = createDocument(name);
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: -40 }, { x: 0, y: -40 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  s = addCircle(s, { x: 20, y: -20 }, 5)[0];
  doc.sketches.sk1 = s;
  const f1: SketchFeature = { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false };
  const f2: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false };
  doc.features = [f1, f2];
  return doc;
}

/** a pin: Ø10 cylinder 30 high on the top plane */
function pin(): Document {
  const doc = createDocument('Pin');
  let s = createSketch('sk1', 'Sketch1', 'top');
  s = addCircle(s, { x: 0, y: 0 }, 5)[0];
  doc.sketches.sk1 = s;
  const f1: SketchFeature = { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false };
  const f2: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 30, reverse: false };
  doc.features = [f1, f2];
  return doc;
}

const comp = (id: string, name: string, part: Document, fixed: boolean, position: [number, number, number] = [0, 0, 0]): Component => ({ id, name, part, position, rotation: [0, 0, 0, 1], fixed, suppressed: false });

describe('assembly transforms', () => {
  it('world and local references round-trip through a rotated transform', () => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 3);
    const c = { position: [5, -2, 7] as [number, number, number], rotation: [q.x, q.y, q.z, q.w] as [number, number, number, number] };
    const n = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(10, 10, 0);
    const l = localRef(n, p, c);
    const w = worldRef({ componentId: 'x', kind: 'face', label: '', normal: l.normal, point: l.point }, c);
    expect(w.n.distanceTo(n)).toBeLessThan(1e-9);
    expect(w.p.distanceTo(p)).toBeLessThan(1e-9);
    expect(componentMatrix(c).elements[12]).toBeCloseTo(5, 9);
  });

  it('finds the axis and radius of a cylindrical face', () => {
    const g = new THREE.CylinderGeometry(5, 5, 30, 48, 1, true).toNonIndexed().translate(20, 15, -20);
    const tris = [...Array(Math.floor(g.getAttribute('position').count / 3)).keys()];
    const ax = cylinderAxis(g, tris)!;
    expect(ax).not.toBeNull();
    expect(Math.abs(ax.dir.y)).toBeCloseTo(1, 4);
    expect(ax.point.x).toBeCloseTo(20, 2);
    expect(ax.point.z).toBeCloseTo(-20, 2);
    expect(ax.radius).toBeCloseTo(5, 1);
  });
});

describe('mates', () => {
  it('coincident top faces and concentric hole/pin place the pin in the hole', () => {
    const base = comp('c1', 'Plate<1>', plate(), true);
    const p = comp('c2', 'Pin<1>', pin(), false, [100, 50, 30]);
    // references in local frames: plate top face (y = 10 at the hole centre), hole axis; pin bottom face and pin axis
    const mates: Mate[] = [
      { id: 'm1', type: 'coincident', name: 'Coincident1', aligned: false, suppressed: false, refs: [
        { componentId: 'c1', kind: 'face', label: 'Face<1>@Plate<1>', normal: [0, 1, 0], point: [20, 10, -20] },
        { componentId: 'c2', kind: 'face', label: 'Face<1>@Pin<1>', normal: [0, -1, 0], point: [0, 0, 0] },
      ] },
      { id: 'm2', type: 'concentric', name: 'Concentric1', aligned: false, suppressed: false, refs: [
        { componentId: 'c1', kind: 'face', label: 'Face<2>@Plate<1>', normal: [0, 1, 0], point: [20, 5, -20], cylindrical: true, radius: 5 },
        { componentId: 'c2', kind: 'face', label: 'Face<2>@Pin<1>', normal: [0, 1, 0], point: [0, 15, 0], cylindrical: true, radius: 5 },
      ] },
    ];
    const solved = solveMates([base, p], mates);
    const pin1 = solved[1];
    expect(pin1.position[0]).toBeCloseTo(20, 4);
    expect(pin1.position[1]).toBeCloseTo(10, 4);
    expect(pin1.position[2]).toBeCloseTo(-20, 4);
    // the pin stands up (its local +y maps to world +y): anti-aligned bottom face normal (-y) against the top face (+y)
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(new THREE.Quaternion(...pin1.rotation));
    expect(up.y).toBeCloseTo(1, 6);
    // the fixed base never moves
    expect(solved[0].position).toEqual([0, 0, 0]);
  });

  it('distance mate leaves the gap and parallel only turns', () => {
    const a = comp('a', 'A<1>', plate(), true);
    const b = comp('b', 'B<1>', plate(), false, [0, 50, 0]);
    const mates: Mate[] = [
      { id: 'm', type: 'distance', name: 'Distance1', aligned: false, suppressed: false, value: 7, refs: [
        { componentId: 'a', kind: 'face', label: '', normal: [0, 1, 0], point: [20, 10, -20] },
        { componentId: 'b', kind: 'face', label: '', normal: [0, -1, 0], point: [20, 0, -20] },
      ] },
    ];
    const solved = solveMates([a, b], mates);
    expect(solved[1].position[1]).toBeCloseTo(17, 6);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.4);
    const tilted: Component = { ...b, rotation: [q.x, q.y, q.z, q.w] };
    const par = solveMates([a, tilted], [{ id: 'p', type: 'parallel', name: 'Parallel1', aligned: true, suppressed: false, refs: mates[0].refs }]);
    const n = new THREE.Vector3(0, -1, 0).applyQuaternion(new THREE.Quaternion(...par[1].rotation));
    expect(Math.abs(n.y)).toBeCloseTo(1, 6);
  });
});

describe('assembly rebuild', () => {
  it('produces a world body per component with transformed faces', () => {
    const doc = createDocument('Assem1', 'assembly');
    doc.components = [comp('c1', 'Plate<1>', plate(), true), comp('c2', 'Plate<2>', plate(), false, [100, 0, 0])];
    const r = rebuildAssembly(doc);
    expect(r.bodies).toHaveLength(2);
    expect(r.errors).toEqual({});
    const top2 = r.bodies[1].faces.find((f) => !f.curved && f.normal[1] > 0.99)!;
    expect(top2.centroid[0]).toBeCloseTo(120, 3);
    expect(top2.id.startsWith('c2:')).toBe(true);
    // faces of the world body agree with a fresh classification of the transformed geometry
    expect(planarFaces(r.bodies[1].geometry, 'x').filter((f) => !f.curved).length).toBe(r.bodies[1].faces.filter((f) => !f.curved).length);
  });
});
