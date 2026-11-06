import { describe, expect, it } from 'vitest';
import { addArc, addCircle, addLine, addPointParam, createSketch } from '../sketch/model';
import { createDocument, type ExtrudeFeature, type SketchFeature } from '../document/types';
import { rebuildDocument } from '../features/rebuild';
import { cleanLines, mergeLines, projectView, viewFrame } from './hlr';

function plate() {
  const doc = createDocument('Plate');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: -80 }, { x: 0, y: -80 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  s = addCircle(s, { x: 40, y: -40 }, 17.5)[0];
  doc.sketches.sk1 = s;
  const f1: SketchFeature = { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false };
  const f2: ExtrudeFeature = { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false };
  doc.features = [f1, f2];
  return rebuildDocument(doc, null).bodies;
}

describe('drawing projection', () => {
  const bodies = plate();

  it('top view: the outline and the hole circle are visible, nothing hidden', () => {
    const v = projectView(bodies, viewFrame('top'));
    expect(v.min[0]).toBeCloseTo(0, 1);
    expect(v.max[0]).toBeCloseTo(80, 1);
    // the plate lies at z = 0..80 (sketch y -> -z), so the top view shows it at v = -80..0
    expect(v.min[1]).toBeCloseTo(-80, 1);
    expect(v.max[1]).toBeCloseTo(0, 1);
    const clean = cleanLines(v.lines);
    const hiddenLen = clean.filter((l) => l.hidden).reduce((s, l) => s + Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]), 0);
    const visibleLen = clean.filter((l) => !l.hidden).reduce((s, l) => s + Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]), 0);
    // outline 320 + hole circumference ~110; the bottom edges coincide with the top ones and are not drawn hidden
    expect(visibleLen).toBeGreaterThan(400);
    expect(visibleLen).toBeLessThan(470);
    expect(hiddenLen).toBeLessThan(visibleLen * 0.05);
    // one line per outline side after merging
    expect(clean.filter((l) => !l.hidden && Math.abs(l.b[0] - l.a[0]) > 79).length).toBe(2);
    const circle = v.circles.find((c) => !c.hidden);
    expect(circle).toBeTruthy();
    expect(circle!.r).toBeCloseTo(17.5, 0);
    expect(circle!.c[0]).toBeCloseTo(40, 1);
    expect(circle!.c[1]).toBeCloseTo(-40, 1);
  });

  it('front view: an 80 x 10 rectangle with the hole as hidden lines', () => {
    const v = projectView(bodies, viewFrame('front'));
    expect(v.max[0] - v.min[0]).toBeCloseTo(80, 1);
    expect(v.max[1] - v.min[1]).toBeCloseTo(10, 1);
    const merged = mergeLines(v.lines);
    const hidden = merged.filter((l) => l.hidden);
    // the two hole walls at x = 22.5 and 57.5 appear as hidden vertical lines
    const xs = hidden.filter((l) => Math.abs(l.a[0] - l.b[0]) < 0.1 && Math.abs(l.a[1] - l.b[1]) > 9).map((l) => Math.round(l.a[0] * 10) / 10);
    expect(xs.some((x) => Math.abs(x - 22.5) < 0.3)).toBe(true);
    expect(xs.some((x) => Math.abs(x - 57.5) < 0.3)).toBe(true);
    // the outline is visible
    const visibleTop = merged.find((l) => !l.hidden && Math.abs(l.a[1] - 10) < 0.1 && Math.abs(l.b[1] - 10) < 0.1 && Math.abs(l.b[0] - l.a[0]) > 79);
    expect(visibleTop).toBeTruthy();
  });

  it('isometric view has visible silhouettes of the hole and no empty result', () => {
    const v = projectView(bodies, viewFrame('isometric'));
    expect(v.lines.length).toBeGreaterThan(10);
    expect(v.lines.some((l) => l.silhouette && !l.hidden)).toBe(true);
  });
  it('a rounded rectangular hole is not taken for a circle (only real circles get center marks)', () => {
    const doc = createDocument('Plate with slot');
    let s = createSketch('sk1', 'Sketch1', 'top');
    const c = [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: -300 }, { x: 0, y: -300 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    // 200 x 200 hole with R5 corners, centered at (150, -150): four lines and four tangent arcs sharing their end points;
    // its corner points lie within 1 % of one radius from the center, so only an exact roundness test rejects it
    const ids: string[] = [];
    const pts = [[55, -50], [245, -50], [250, -55], [250, -245], [245, -250], [55, -250], [50, -245], [50, -55]];
    for (const [x, y] of pts) { let id: string; [s, id] = addPointParam(s, { x, y }); ids.push(id); }
    const centers = [[245, -55], [245, -245], [55, -245], [55, -55]];
    for (let i = 0; i < 4; i++) {
      s = addLine(s, ids[2 * i], ids[2 * i + 1])[0];
      s = addArc(s, { x: centers[i][0], y: centers[i][1] }, ids[2 * i + 1], ids[(2 * i + 2) % 8], false)[0];
    }
    s = addCircle(s, { x: 280, y: -280 }, 4)[0];
    doc.sketches.sk1 = s;
    doc.features = [
      { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false } as SketchFeature,
      { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as ExtrudeFeature,
    ];
    const v = projectView(rebuildDocument(doc, null).bodies, viewFrame('top'));
    const visible = v.circles.filter((k) => !k.hidden);
    expect(visible.length).toBe(1);
    expect(visible[0].r).toBeCloseTo(4, 1);
  });
});
