import { describe, expect, it } from 'vitest';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { brokenOutGeometry, viewDepth, auxGeometry, breakGeometry, cropGeometry, detailGeometry, projectedView, sectionGeometry } from './sheet';

function plateDoc() {
  const doc = createDocument('Plate');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: -80 }, { x: 0, y: -80 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  s = addCircle(s, { x: 40, y: -40 }, 17.5)[0];
  doc.sketches.sk1 = s;
  const f1: SketchFeature = { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false };
  const f2: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false };
  doc.features = [f1, f2];
  return doc;
}

describe('section and detail views', () => {
  const doc = plateDoc();
  it('vertical section through the hole of the top view: two hatched cut faces, plate thickness tall', () => {
    const g = sectionGeometry(doc, { parentId: 'v', parentType: 'top', axis: 'v', at: 40, flip: true, label: 'A' });
    expect(g.lines.length).toBeGreaterThan(4);
    expect(g.max[0] - g.min[0]).toBeCloseTo(10, 0);
    expect(g.max[1] - g.min[1]).toBeCloseTo(80, 0);
    expect(g.hatch!.length).toBe(2);
    // hatched area: 2 x (80 - 35) / 2 ... = (80 - 35) x 10
    const area = g.hatch!.reduce((s, l) => s + l.reduce((a, p, i) => { const q = l[(i + 1) % l.length]; return a + (p[0] * q[1] - q[0] * p[1]) / 2; }, 0), 0);
    expect(area).toBeCloseTo(450, -1);
  });
  it('detail of the hole: lines clipped to the circle, the hole circle kept', () => {
    const top = projectedView(doc, 'top');
    const hole = top.circles.find((c) => c.r < 20)!;
    const g = detailGeometry(doc, { parentId: 'v', parentType: 'top', center: hole.c, radius: 20, label: 'B' });
    expect(g.circles.filter((c) => !c.hidden).length).toBe(1);
    expect(g.max[0] - g.min[0]).toBeCloseTo(40, 3);
  });
  it('crop view: everything outside the rectangle is clipped away', () => {
    const top = projectedView(doc, 'top');
    const g = cropGeometry(top, [top.min[0], top.min[1]], [top.min[0] + 30, top.max[1]]);
    expect(g.max[0] - g.min[0]).toBeCloseTo(30, 3);
    for (const l of g.lines) for (const p of [l.a, l.b]) expect(p[0]).toBeLessThanOrEqual(top.min[0] + 30 + 1e-6);
  });
  it('break: the region between the break lines is taken out, leaving the gap', () => {
    const top = projectedView(doc, 'top');
    const a = top.min[0] + 10, b = top.min[0] + 70;
    const g = breakGeometry(top, { axis: 'x', a, b, gap: 6 });
    expect(g.max[0] - g.min[0]).toBeCloseTo(80 - 60 + 6, 3);
    for (const l of g.lines) for (const p of [l.a, l.b]) expect(p[0] <= a + 1e-6 || p[0] >= a + 6 - 1e-6).toBe(true);
  });
  it('auxiliary view square to an edge of the top view equals the projection along that edge normal', () => {
    // edge along x in the top view, looked at from +v (third angle: placed above) = the back face side
    const g = auxGeometry(doc, { parentId: 'v', parentType: 'top', dir: [1, 0], side: 1, mid: [0, 0], label: 'A' });
    expect(g.max[0] - g.min[0]).toBeCloseTo(80, 1);
    expect(g.max[1] - g.min[1]).toBeCloseTo(10, 1);
    // a 45 degree edge: the plate seen along the diagonal is 80*sqrt2 wide
    const d = auxGeometry(doc, { parentId: 'v', parentType: 'top', dir: [1, 1], side: 1, mid: [0, 0], label: 'B' });
    const w = Math.hypot(d.max[0] - d.min[0], d.max[1] - d.min[1]);
    expect(w).toBeGreaterThan(80);
  });
  it('broken-out section: material inside the profile removed to the depth, cut face hatched inside the profile', () => {
    expect(viewDepth(doc, 'front')).toBeCloseTo(80, 3);
    const front = projectedView(doc, 'front');
    const cx = (front.min[0] + front.max[0]) / 2, cy = (front.min[1] + front.max[1]) / 2;
    const poly: [number, number][] = [[cx - 30, cy - 8], [cx + 30, cy - 8], [cx + 30, cy + 8], [cx - 30, cy + 8]];
    const g = brokenOutGeometry(doc, 'front', { poly, depth: 40 });
    expect(g.hatch!.length).toBeGreaterThan(0);
    expect(g.hatchClip!.length).toBe(40); // the closed spline through the 4 picked points
    // the hole is cut through at depth 40: its silhouettes become visible lines inside the profile
    const visibleVertical = g.lines.filter((l) => !l.hidden && Math.abs(l.a[0] - l.b[0]) < 1e-3 && Math.abs(l.a[0] - cx) > 15 && Math.abs(l.a[0] - cx) < 20);
    expect(visibleVertical.length).toBeGreaterThan(0);
  });
});
