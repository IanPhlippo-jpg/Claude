import { describe, expect, it } from 'vitest';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from './rebuild';
import { REFERENCE_PLANE_DEFS } from './planes';
import { csg, meshVolume } from './solid';
import { sketchRegions } from './regions';
import { fitCylinder, wrapTool } from './wrap';

describe('Features ▸ Wrap', () => {
  const doc = createDocument('Cyl');
  doc.sketches.sk1 = addCircle(createSketch('sk1', 'Sketch1', 'top'), { x: 0, y: 0 }, 20)[0];
  const f2: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 60, reverse: false };
  doc.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature, f2];
  const body = rebuildDocument(doc, null).bodies[0];
  let s = createSketch('sk2', 'Sketch2', 'front');
  const c = [{ x: -5, y: 25 }, { x: 5, y: 25 }, { x: 5, y: 35 }, { x: -5, y: 35 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  const regions = sketchRegions(s);

  it('fits the cylinder of the side face (R 20, axis along Y)', () => {
    // the side facets: normals across the axis
    const g = body.geometry.index ? body.geometry.toNonIndexed() : body.geometry;
    const pa = g.getAttribute('position');
    const tris: number[] = [];
    for (let t = 0; t * 3 + 2 < pa.count; t++) {
      const ay = pa.getY(t * 3), by = pa.getY(t * 3 + 1), cy = pa.getY(t * 3 + 2);
      if (Math.max(ay, by, cy) - Math.min(ay, by, cy) > 1) tris.push(t);
    }
    const cyl = fitCylinder(body.geometry, tris)!;
    expect(cyl.radius).toBeCloseTo(20, 0);
    expect(Math.abs(cyl.axis[1])).toBeCloseTo(1, 3);
  });

  it('emboss adds and deboss removes a 10 x 10 patch wrapped on the cylinder', () => {
    const cyl = { center: [0, 0, 0] as [number, number, number], axis: [0, 1, 0] as [number, number, number], radius: 20 };
    const plane = REFERENCE_PLANE_DEFS.front;
    const v0 = meshVolume(body.geometry);
    const emb = wrapTool(regions, plane, cyl, 'emboss', 2)!;
    const v1 = meshVolume(csg(body.geometry, emb, 'union'));
    const expectedAdd = (10 / 20) * ((22 * 22 - 20 * 20) / 2) * 10;
    expect(Math.abs(v1 - v0 - expectedAdd) / expectedAdd).toBeLessThan(0.05);
    const deb = wrapTool(regions, plane, cyl, 'deboss', 2)!;
    const v2 = meshVolume(csg(body.geometry, deb, 'subtract'));
    const expectedCut = (10 / 20) * ((20 * 20 - 18 * 18) / 2) * 10;
    expect(Math.abs(v0 - v2 - expectedCut) / expectedCut).toBeLessThan(0.05);
  });
});
