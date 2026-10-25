import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type SketchFeature, type SurfaceFeature } from '../document/types';
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
const rect = (id: string, plane: string) => {
  let s = createSketch(id, id, plane);
  const c = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: -20 }, { x: 0, y: -20 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  return s;
};

describe('Surfaces', () => {
  it('extruded, planar and revolved surfaces are open surface bodies with the right area', () => {
    const doc = createDocument('S');
    let ax = createSketch('ax', 'Sketch3', 'front');
    ax = addLine(ax, { x: 0, y: 0 }, { x: 0, y: 30 }, true)[0];
    ax = addLine(ax, { x: 10, y: 0 }, { x: 10, y: 30 })[0];
    doc.sketches = { r: rect('r', 'top'), ax };
    doc.features = [
      { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'r', suppressed: false } as SketchFeature,
      { id: 's1', type: 'surface', name: 'Surface-Extrude1', suppressed: false, kind: 'extrude', sketchId: 'r', depth: 10 } as SurfaceFeature,
      { id: 's2', type: 'surface', name: 'Surface-Plane1', suppressed: false, kind: 'planar', sketchId: 'r' } as SurfaceFeature,
      { id: 'f3', type: 'sketch', name: 'Sketch3', sketchId: 'ax', suppressed: false } as SketchFeature,
      { id: 's3', type: 'surface', name: 'Surface-Revolve1', suppressed: false, kind: 'revolve', sketchId: 'ax', angle: 360 } as SurfaceFeature,
    ];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    expect(r.bodies.length).toBe(0);
    const sb = r.surfaceBodies!;
    expect(sb.length).toBe(3);
    expect(area(sb[0].geometry)).toBeCloseTo(120 * 10, 0);
    expect(area(sb[1].geometry)).toBeCloseTo(800, 0);
    expect(Math.abs(area(sb[2].geometry) - 2 * Math.PI * 10 * 30) / (2 * Math.PI * 10 * 30)).toBeLessThan(0.01);
  });
  it('Knit Surface with Create solid: bottom, walls and lid become a 40 x 20 x 10 solid', () => {
    const doc = createDocument('K');
    doc.planes.p10 = { ...REFERENCE_PLANE_DEFS.top, id: 'p10', name: 'Plane1', origin: [0, 10, 0], kind: 'reference' };
    doc.sketches = { a: rect('a', 'top'), b: rect('b', 'p10') };
    doc.features = [
      { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'a', suppressed: false } as SketchFeature,
      { id: 's1', type: 'surface', name: 'Surface-Plane1', suppressed: false, kind: 'planar', sketchId: 'a' } as SurfaceFeature,
      { id: 's2', type: 'surface', name: 'Surface-Extrude1', suppressed: false, kind: 'extrude', sketchId: 'a', depth: 10 } as SurfaceFeature,
      { id: 'f2', type: 'sketch', name: 'Sketch2', sketchId: 'b', suppressed: false } as SketchFeature,
      { id: 's3', type: 'surface', name: 'Surface-Plane2', suppressed: false, kind: 'planar', sketchId: 'b' } as SurfaceFeature,
      { id: 's4', type: 'surface', name: 'Surface-Knit1', suppressed: false, kind: 'knit', surfaces: ['s1', 's2', 's3'], createSolid: true } as SurfaceFeature,
    ];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    expect(r.surfaceBodies!.length).toBe(0);
    expect(r.bodies.length).toBe(1);
    expect(meshVolume(r.bodies[0].geometry)).toBeCloseTo(8000, 0);
  });
  it('swept and lofted surfaces: a 10 mm line along 50 mm, and a ruled face between two parallel 40 mm lines 20 apart', () => {
    const doc = createDocument('SL');
    doc.planes.p20 = { ...REFERENCE_PLANE_DEFS.top, id: 'p20', name: 'Plane1', origin: [0, 20, 0], kind: 'reference' };
    let prof = createSketch('prof', 'Sketch1', 'right');
    prof = addLine(prof, { x: 0, y: 0 }, { x: 0, y: 10 })[0];
    let path = createSketch('path', 'Sketch2', 'top');
    path = addLine(path, { x: 0, y: 0 }, { x: 50, y: 0 })[0];
    let l1 = createSketch('l1', 'Sketch3', 'top');
    l1 = addLine(l1, { x: 0, y: -60 }, { x: 40, y: -60 })[0];
    let l2 = createSketch('l2', 'Sketch4', 'p20');
    l2 = addLine(l2, { x: 0, y: -60 }, { x: 40, y: -60 })[0];
    doc.sketches = { prof, path, l1, l2 };
    doc.features = [
      { id: 'a', type: 'sketch', name: 'Sketch1', sketchId: 'prof', suppressed: false } as SketchFeature,
      { id: 'b', type: 'sketch', name: 'Sketch2', sketchId: 'path', suppressed: false } as SketchFeature,
      { id: 's1', type: 'surface', name: 'Surface-Sweep1', suppressed: false, kind: 'sweep', sketchId: 'prof', sketchId2: 'path' } as SurfaceFeature,
      { id: 'c', type: 'sketch', name: 'Sketch3', sketchId: 'l1', suppressed: false } as SketchFeature,
      { id: 'd', type: 'sketch', name: 'Sketch4', sketchId: 'l2', suppressed: false } as SketchFeature,
      { id: 's2', type: 'surface', name: 'Surface-Loft1', suppressed: false, kind: 'loft', sketchId: 'l1', sketchId2: 'l2' } as SurfaceFeature,
    ];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    expect(area(r.surfaceBodies![0].geometry)).toBeCloseTo(500, 0);
    expect(area(r.surfaceBodies![1].geometry)).toBeCloseTo(800, 0);
  });
  it('Trim Surface with a plane at x = 10 keeps 30 x 20 of the 40 x 20 planar surface (or 10 x 20 flipped)', () => {
    for (const [flip, want] of [[false, 600], [true, 200]] as const) {
      const doc = createDocument('T');
      doc.planes.px = { ...REFERENCE_PLANE_DEFS.right, id: 'px', name: 'Plane1', origin: [10, 0, 0], kind: 'reference' };
      doc.sketches = { a: rect('a', 'top') };
      doc.features = [
        { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'a', suppressed: false } as SketchFeature,
        { id: 's1', type: 'surface', name: 'Surface-Plane1', suppressed: false, kind: 'planar', sketchId: 'a' } as SurfaceFeature,
        { id: 's2', type: 'surface', name: 'Surface-Trim1', suppressed: false, kind: 'trim', trimPlane: 'px', target: 's1', flip } as SurfaceFeature,
      ];
      const r = rebuildDocument(doc, null);
      expect(r.errors).toEqual({});
      expect(area(r.surfaceBodies![0].geometry)).toBeCloseTo(want, 3);
    }
  });
});
