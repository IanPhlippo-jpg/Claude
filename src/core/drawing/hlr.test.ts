import { describe, expect, it } from 'vitest';
import { addCircle, addLine, createSketch } from '../sketch/model';
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
});
