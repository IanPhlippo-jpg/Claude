import { it } from 'vitest';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from '../features/rebuild';
import { mergeLines, projectView, viewFrame } from './hlr';

it('dbg top view', () => {
  const doc = createDocument('Plate');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: -80 }, { x: 0, y: -80 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  s = addCircle(s, { x: 40, y: -40 }, 17.5)[0];
  doc.sketches.sk1 = s;
  const f1: SketchFeature = { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false };
  const f2: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false };
  doc.features = [f1, f2];
  const body = rebuildDocument(doc, null).bodies[0];
  for (const e of body.edges) {
    const v = projectView([{ ...body, edges: [e] }], viewFrame('top'));
    const mine = v.lines.filter((l) => !l.silhouette);
    const vis = mine.filter((l) => !l.hidden).reduce((a, l) => a + Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]), 0);
    const hid = mine.filter((l) => l.hidden).reduce((a, l) => a + Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]), 0);
    console.log('edge', e.straight ? 'line' : 'curve', e.points[0].toArray().map((x) => x.toFixed(1)).join(','), '->', e.points[e.points.length - 1].toArray().map((x) => x.toFixed(1)).join(','), 'vis', vis.toFixed(1), 'hid', hid.toFixed(1));
  }
  const v = projectView([body], viewFrame('top'));
  const sil = v.lines.filter((l) => l.silhouette);
  console.log('silhouette vis', sil.filter((l) => !l.hidden).length, 'hid', sil.filter((l) => l.hidden).length, 'sample', sil.slice(0, 3).map((l) => (l.hidden ? 'H' : 'V') + l.a.map((x) => x.toFixed(1)) + '->' + l.b.map((x) => x.toFixed(1))));
  console.log('merged', mergeLines(v.lines).length);
});
