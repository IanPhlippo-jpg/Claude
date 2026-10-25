import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { addLine, createSketch } from '../sketch/model';
import { createDocument, type BaseFlangeFeature, type Document, type JogFeature, type MiterFlangeFeature, type SketchedBendFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { resolvePlaneDef } from './planes';
import { meshVolume } from './solid';
import { edgeRef } from './edgesets';
import { DEFAULT_SHEET_METAL } from './sheetmetal';

/** a 100 x 60 tab on the top plane (x 0..100, z 0..60, y 0..t) */
function tabDoc(): Document {
  const doc = createDocument('Sheet');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: -60 }, { x: 0, y: -60 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  doc.sketches.sk1 = s;
  const tab: BaseFlangeFeature = { id: 'f2', type: 'baseFlange', name: 'Base-Flange1', sketchId: 'sk1', suppressed: false, depth: 10, midPlane: false, reverse: false, flipDir: false };
  doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, tab];
  return doc;
}

const toSketch = (doc: Document, plane: string, w: THREE.Vector3) => {
  const p = resolvePlaneDef(doc, plane);
  const o = new THREE.Vector3(...p.origin);
  return { x: w.clone().sub(o).dot(new THREE.Vector3(...p.u)), y: w.clone().sub(o).dot(new THREE.Vector3(...p.v)) };
};

describe('Sheet metal Jog and Miter Flange', () => {
  const t = DEFAULT_SHEET_METAL.thickness;
  it('tab is a flat plate of the sheet thickness', () => {
    const r = rebuildDocument(tabDoc(), null);
    expect(r.errors).toEqual({});
    expect(meshVolume(r.bodies[0].geometry)).toBeCloseTo(100 * 60 * t, 0);
  });
  it('jog: a line across the bottom face moves one half down by the offset, with a web', () => {
    const doc = tabDoc();
    let s = createSketch('sk2', 'Sketch2', 'top');
    s = addLine(s, toSketch(doc, 'top', new THREE.Vector3(50, 0, -5)), toSketch(doc, 'top', new THREE.Vector3(50, 0, 65)))[0];
    doc.sketches.sk2 = s;
    const jog: JogFeature = { id: 'f4', type: 'jog', name: 'Jog1', sketchId: 'sk2', suppressed: false, offset: 10, flipSide: false, reverse: false };
    doc.features = [...doc.features, { id: 'f3', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false } as SketchFeature, jog];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    const g = r.bodies[0].geometry;
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    // one half moved 10 along the face normal of the bottom face (-y)
    expect(bb.min.y).toBeCloseTo(-10, 1);
    expect(bb.max.y).toBeCloseTo(t, 3);
    const v = meshVolume(g);
    expect(v).toBeGreaterThan(100 * 60 * t + 60 * t * 5);
    expect(v).toBeLessThan(100 * 60 * t + 60 * t * 14);
  });
  it('miter flange: a 20 mm wall along two edges meeting at a corner', () => {
    const doc = tabDoc();
    const body = rebuildDocument(doc, null).bodies[0];
    const along = (dir: THREE.Vector3, test: (m: THREE.Vector3) => boolean) =>
      body.edges.find((e) => e.straight && Math.abs(e.points[e.points.length - 1].clone().sub(e.points[0]).normalize().dot(dir)) > 0.999 && test(e.centroid))!;
    const e1 = along(new THREE.Vector3(1, 0, 0), (m) => Math.abs(m.y - t) < 1e-3 && Math.abs(m.z - 60) < 1e-3);
    const e2 = along(new THREE.Vector3(0, 0, 1), (m) => Math.abs(m.y - t) < 1e-3 && Math.abs(m.x - 100) < 1e-3);
    expect(e1 && e2).toBeTruthy();
    let s = createSketch('sk2', 'Sketch2', 'right');
    s = addLine(s, toSketch(doc, 'right', new THREE.Vector3(0, t, 60)), toSketch(doc, 'right', new THREE.Vector3(0, t + 20, 60)))[0];
    doc.sketches.sk2 = s;
    const mf: MiterFlangeFeature = { id: 'f4', type: 'miterFlange', name: 'Miter Flange1', sketchId: 'sk2', suppressed: false, edges: [edgeRef(e1), edgeRef(e2)], reverse: false, gap: 0.25 };
    doc.features = [...doc.features, { id: 'f3', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false } as SketchFeature, mf];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    const g = r.bodies[0].geometry;
    g.computeBoundingBox();
    expect(g.boundingBox!.max.y).toBeCloseTo(t + 20, 1);
    const wall = (100 + 60) * 20 * t;
    const v = meshVolume(g) - 100 * 60 * t;
    expect(Math.abs(v - wall) / wall).toBeLessThan(0.15);
  });
  it('sketched bend: a line across the bottom face turns one half 90 degrees down', () => {
    const doc = tabDoc();
    let s = createSketch('sk2', 'Sketch2', 'top');
    s = addLine(s, toSketch(doc, 'top', new THREE.Vector3(50, 0, -5)), toSketch(doc, 'top', new THREE.Vector3(50, 0, 65)))[0];
    doc.sketches.sk2 = s;
    const sb: SketchedBendFeature = { id: 'f4', type: 'sketchedBend', name: 'SketchBend1', sketchId: 'sk2', suppressed: false, angle: 90, flipSide: false, reverse: false };
    doc.features = [...doc.features, { id: 'f3', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false } as SketchFeature, sb];
    const r = rebuildDocument(doc, null);
    expect(r.errors).toEqual({});
    const g = r.bodies[0].geometry;
    g.computeBoundingBox();
    // one 50 mm half now hangs down along -y
    expect(g.boundingBox!.min.y).toBeLessThan(-45);
    expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeLessThan(60);
    const v = meshVolume(g);
    expect(Math.abs(v - 100 * 60 * t) / (100 * 60 * t)).toBeLessThan(0.06);
  });
});
