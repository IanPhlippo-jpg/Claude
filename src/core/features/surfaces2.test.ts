import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type Feature, type SketchFeature, type SurfaceFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { meshVolume } from './solid';
import { REFERENCE_PLANE_DEFS } from './planes';

const area = (g: THREE.BufferGeometry) => {
  const a = (g.index ? g.toNonIndexed() : g).getAttribute('position');
  let s = 0;
  const p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (let i = 0; i + 2 < a.count; i += 3) { for (let k = 0; k < 3; k++) p[k].fromBufferAttribute(a, i + k); s += p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).length() / 2; }
  return s;
};
const rect = (id: string, plane: string, x0: number, y0: number, x1: number, y1: number) => {
  let s = createSketch(id, id, plane);
  const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  return s;
};
const sk = (id: string, sketchId: string) => ({ id, type: 'sketch', name: id, sketchId, suppressed: false }) as SketchFeature;

describe('surface options of the original', () => {
  it('Trim Surface > Mutual: a flat surface trims the other, the side where most of it lies is kept', () => {
    const doc = createDocument('M');
    doc.sketches = { a: rect('a', 'top', 0, 0, 40, -20), b: rect('b', 'front', 0, -5, 40, 15) };
    doc.features = [
      sk('k1', 'a'), { id: 's1', type: 'surface', name: 'Surface-Plane1', suppressed: false, kind: 'planar', sketchId: 'a' } as SurfaceFeature,
      sk('k2', 'b'), { id: 's2', type: 'surface', name: 'Surface-Plane2', suppressed: false, kind: 'planar', sketchId: 'b' } as SurfaceFeature,
      { id: 't1', type: 'surface', name: 'Surface-Trim1', suppressed: false, kind: 'trim', mutual: true, targets: ['s1', 's2'] } as SurfaceFeature,
    ];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    const areas = r.surfaceBodies!.map((b) => Math.round(area(b.geometry)));
    expect(areas).toContain(800);
    expect(areas).toContain(600);
  });
  it('Knit > Show open edges draws the boundary; Merge entities off keeps the surfaces apart', () => {
    const doc = createDocument('K');
    doc.sketches = { a: rect('a', 'top', 0, 0, 40, -20), b: rect('b', 'top', 40, 0, 80, -20) };
    const base: Feature[] = [
      sk('k1', 'a'), { id: 's1', type: 'surface', name: 'P1', suppressed: false, kind: 'planar', sketchId: 'a' } as SurfaceFeature,
      sk('k2', 'b'), { id: 's2', type: 'surface', name: 'P2', suppressed: false, kind: 'planar', sketchId: 'b' } as SurfaceFeature,
    ];
    doc.features = [...base, { id: 'kn', type: 'surface', name: 'Knit', suppressed: false, kind: 'knit', surfaces: ['s1', 's2'], showOpenEdges: true } as SurfaceFeature];
    const r = rebuildDocument(doc, null);
    expect(r.surfaceBodies!.length).toBe(1);
    const open = (r.curves ?? []).filter((c) => c.id.startsWith('kn:open'));
    // the outer boundary of the 80 x 20 rectangle (the shared edge is not open)
    const len = open.reduce((s, c) => s + c.points[0].distanceTo(c.points[1]), 0);
    expect(len).toBeCloseTo(200, 3);
    doc.features = [...base, { id: 'kn', type: 'surface', name: 'Knit', suppressed: false, kind: 'knit', surfaces: ['s1', 's2'], mergeEntities: false } as SurfaceFeature];
    expect(rebuildDocument(doc, null).surfaceBodies!.length).toBe(2);
  });
  it('Intersect > Cap planar openings: a flat surface splits a solid into two closed bodies', () => {
    const doc = createDocument('I');
    doc.planes.p5 = { ...REFERENCE_PLANE_DEFS.top, id: 'p5', name: 'Plane1', origin: [0, 5, 0], kind: 'reference' };
    doc.sketches = { a: rect('a', 'top', 0, 0, 40, -20), c: rect('c', 'p5', -10, 10, 60, -40) };
    doc.features = [
      sk('k1', 'a'), { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'a', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as Feature,
      sk('k2', 'c'), { id: 's1', type: 'surface', name: 'Surface-Plane1', suppressed: false, kind: 'planar', sketchId: 'c' } as SurfaceFeature,
    ];
    const r0 = rebuildDocument(doc, null);
    const solidId = r0.bodies[0].id, surfId = r0.surfaceBodies![0].id;
    doc.features = [...doc.features, { id: 'i1', type: 'intersect', name: 'Intersect1', suppressed: false, bodies: [solidId, surfId], exclude: [], merge: false, capPlanar: true, consumeSurfaces: true } as Feature];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    expect(r.bodies.length).toBe(2);
    for (const b of r.bodies) expect(Math.abs(meshVolume(b.geometry))).toBeCloseTo(40 * 20 * 5, 0);
    expect(r.surfaceBodies!.length).toBe(0);
  });
});
