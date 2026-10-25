import { describe, expect, it } from 'vitest';
import { addCircle, addConstraint, addLine, createSketch } from '../../core/sketch/model';
import { createDocument, type DrawingView, type ExtrudeFeature, type SketchFeature } from '../../core/document/types';
import { modelItems } from './modelItems';

/** 80 x 50 plate on the Top Plane with a Ø20 hole, dimensioned, extruded 10 mm. */
function plate() {
  const doc = createDocument('Plate');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: -50 }, { x: 0, y: -50 }];
  const lines: string[] = [];
  for (let i = 0; i < 4; i++) { const [s2, l] = addLine(s, c[i], c[(i + 1) % 4]); s = s2; lines.push(l.id); }
  const [s3, hole] = addCircle(s, { x: 40, y: -25 }, 10);
  s = s3;
  s = addConstraint(s, 'length', [lines[0]], { value: 80 })[0];
  s = addConstraint(s, 'length', [lines[1]], { value: 50 })[0];
  s = addConstraint(s, 'diameter', [hole.id], { value: 20 })[0];
  doc.sketches.sk1 = s;
  const f1: SketchFeature = { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false };
  const f2: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false };
  doc.features = [f1, f2];
  return doc;
}

describe('Model Items', () => {
  const model = plate();
  const view = (id: string, type: DrawingView['type']): DrawingView => ({ id, name: id, type, position: [0, 0], displayStyle: 'hiddenRemoved', model, modelName: 'Plate' });
  const views = [view('v1', 'front'), view('v2', 'top'), view('v3', 'right')];
  const all = { sketchDims: true, featureDims: true, holeDims: true };

  it('sketch dimensions go to the view parallel to the sketch, the depth to the first edge-on view, each once', () => {
    const dims = modelItems(views, all);
    const top = dims.filter((d) => d.viewId === 'v2');
    expect(top.map((d) => d.value).sort((a, b) => a - b)).toEqual([20, 50, 80]);
    expect(top.find((d) => d.value === 20)!.kind).toBe('diameter');
    const depth = dims.filter((d) => d.value === 10);
    expect(depth.length).toBe(1);
    expect(depth[0].viewId).toBe('v1');
    expect(depth[0].orientation).toBe('v');
    // measured along the view: the two ends are 10 apart
    expect(Math.hypot(depth[0].a[0] - depth[0].b[0], depth[0].a[1] - depth[0].b[1])).toBeCloseTo(10, 6);
  });

  it('the 80 length is horizontal in the top view and spans the plate', () => {
    const d80 = modelItems(views, all).find((d) => d.value === 80)!;
    expect(d80.orientation).toBe('h');
    expect(Math.abs(d80.a[0] - d80.b[0])).toBeCloseTo(80, 6);
  });

  it('a second run adds nothing (eliminate duplicates) and the type filters work', () => {
    const first = modelItems(views, all);
    expect(modelItems(views, all, first).length).toBe(0);
    expect(modelItems(views, { sketchDims: false, featureDims: false, holeDims: true }).map((d) => d.value)).toEqual([20]);
  });
});
