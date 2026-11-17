import { describe, expect, it } from 'vitest';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { createDocument, type Component, type Document, type Feature } from '../document/types';
import { rebuildDocument } from '../features/rebuild';
import { edgeRef } from '../features/edgesets';
import { cleanLines, projectView, viewFrame, type Line2D } from './hlr';
import { projectedView } from './sheet';

// Hidden-line removal (0.5.16): silhouettes of curved faces, edges split exactly where an occluding face's outline
// crosses them, tangent edges, hidden edges between the parts of an assembly.

type S = ReturnType<typeof createSketch>;
const rect = (s: S, x0: number, y0: number, x1: number, y1: number) => {
  const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  return s;
};
const extrude = (doc: Document, id: string, s: S, depth: number, op: 'boss' | 'cut' = 'boss') => {
  doc.sketches[s.id] = s;
  doc.features.push({ id, type: 'extrude', name: id, sketchId: s.id, suppressed: false, op, end: op === 'cut' ? 'throughAll' : 'blind', depth, reverse: false } as Feature);
  return doc;
};
const len = (l: Line2D) => Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]);
const vertical = (ls: Line2D[], x: number, tol = 0.02) => ls.filter((l) => Math.abs(l.a[0] - x) < tol && Math.abs(l.b[0] - x) < tol && len(l) > 0.1).map((l) => ({ lo: Math.min(l.a[1], l.b[1]), hi: Math.max(l.a[1], l.b[1]), hidden: l.hidden, silhouette: !!l.silhouette, tangent: !!l.tangent }));
const horizontal = (ls: Line2D[], y: number) => ls.filter((l) => Math.abs(l.a[1] - y) < 0.05 && Math.abs(l.b[1] - y) < 0.05);

describe('hidden-line removal', () => {
  it('a block with a through hole, seen from the side: the hole walls are hidden silhouette lines over the full thickness', () => {
    const doc = extrude(createDocument('Block'), 'e1', rect(createSketch('s1', 'S1', 'top'), 0, 0, 80, -40), 10);
    extrude(doc, 'e2', addCircle(createSketch('s2', 'S2', 'top'), { x: 40, y: -20 }, 6)[0], 0, 'cut');
    const ls = cleanLines(projectView(rebuildDocument(doc, null).bodies, viewFrame('front')).lines);
    for (const x of [34, 46]) {
      // a silhouette of the faceted wall lies on its facets: within a chord height of the true radius
      const v = vertical(ls, x, 0.15);
      expect(v.length, `x = ${x}`).toBe(1);
      expect(v[0]).toMatchObject({ hidden: true, silhouette: true });
      expect(v[0].hi - v[0].lo).toBeCloseTo(10, 1);
    }
    // nothing of the hole shows as a visible line
    expect(ls.filter((l) => !l.hidden && l.a[0] > 30 && l.a[0] < 50 && l.b[0] > 30 && l.b[0] < 50 && Math.abs(l.a[0] - l.b[0]) < 0.1)).toEqual([]);
  });

  it('a cylinder seen side-on has two visible silhouette lines over its height', () => {
    const doc = extrude(createDocument('Cyl'), 'e1', addCircle(createSketch('s1', 'S1', 'top'), { x: 0, y: 0 }, 10)[0], 30);
    const ls = cleanLines(projectView(rebuildDocument(doc, null).bodies, viewFrame('front')).lines);
    for (const x of [-10, 10]) expect(vertical(ls, x)).toEqual([{ lo: expect.closeTo(0, 3), hi: expect.closeTo(30, 3), hidden: false, silhouette: true, tangent: false }]);
    expect(ls.filter((l) => l.hidden)).toEqual([]);
    expect(ls.length).toBe(4);
  });

  it('a step: the rear edge that the low front step partly covers is split exactly at the step', () => {
    // rear block x 20..80, 40 high, z 0..20; front step x 0..100, 20 high, z 20..40
    const doc = extrude(createDocument('Step'), 'e1', rect(createSketch('s1', 'S1', 'top'), 20, 0, 80, -20), 40);
    extrude(doc, 'e2', rect(createSketch('s2', 'S2', 'top'), 0, -20, 100, -40), 20);
    const ls = cleanLines(projectView(rebuildDocument(doc, null).bodies, viewFrame('front')).lines);
    for (const x of [20, 80]) {
      const v = vertical(ls, x).sort((a, b) => a.lo - b.lo);
      expect(v.map((s) => s.hidden), `x = ${x}`).toEqual([true, false]);
      // hidden below the step, visible above it: the split is at y = 20 (the hidden piece stops a hair short of it)
      expect(v[0].lo).toBeCloseTo(0, 3);
      expect(v[0].hi).toBeGreaterThan(19.9);
      expect(v[1].lo).toBeCloseTo(20, 3);
      expect(v[1].hi).toBeCloseTo(40, 3);
    }
  });

  it('a silhouette partly behind a wall is split at the wall, with no stray pieces along the wall edge', () => {
    // a cylinder r 8 at x = 50, 40 high; in front of it a wall x 0..50, 25 high
    const doc = extrude(createDocument('Wall'), 'e1', addCircle(createSketch('s1', 'S1', 'top'), { x: 50, y: -10 }, 8)[0], 40);
    extrude(doc, 'e2', rect(createSketch('s2', 'S2', 'top'), 0, -25, 50, -35), 25);
    const ls = cleanLines(projectView(rebuildDocument(doc, null).bodies, viewFrame('front')).lines);
    const v = vertical(ls, 42).sort((a, b) => a.lo - b.lo);
    expect(v.map((s) => [s.hidden, s.silhouette])).toEqual([[true, true], [false, true]]);
    expect(v[0].hi).toBeGreaterThan(24.9);
    expect(v[1].lo).toBeCloseTo(25, 3);
    // the one hidden line is that silhouette piece (the bottom edges along the wall are visible, not dashed)
    expect(ls.filter((l) => l.hidden).length).toBe(1);
    expect(horizontal(ls, 0).every((l) => !l.hidden)).toBe(true);
  });

  it('tangent edges of a fillet: one line where the fillet runs into each face, only when asked for', () => {
    const doc = extrude(createDocument('Fillet'), 'e1', rect(createSketch('s1', 'S1', 'top'), 0, 0, 60, -40), 20);
    const edge = rebuildDocument(doc, null).bodies[0].edges.find((e) => e.straight && Math.abs(e.centroid.y - 20) < 1e-6 && Math.abs(e.centroid.z - 40) < 1e-6)!;
    doc.features.push({ id: 'r1', type: 'fillet', name: 'Fillet1', suppressed: false, size: 5, edges: [edgeRef(edge)] } as Feature);
    const bodies = rebuildDocument(doc, null).bodies;
    const tangentOf = (view: 'front' | 'top') => cleanLines(projectView(bodies, viewFrame(view), 0.75, { tangent: true }).lines).filter((l) => l.tangent);
    // front: the fillet meets the front face 5 below the top; top: it meets the top face 5 behind the front
    const front = tangentOf('front');
    expect(front.length).toBe(1);
    expect(front[0].a[1]).toBeCloseTo(15, 0);
    expect(len(front[0])).toBeCloseTo(60, 1);
    const top = tangentOf('top');
    expect(top.length).toBe(1);
    expect(top[0].a[1]).toBeCloseTo(-35, 0);
    // the other tangent edge of each view lies on the outline: drawn once, as the outline
    expect(cleanLines(projectView(bodies, viewFrame('front')).lines).some((l) => l.tangent)).toBe(false);
    expect(horizontal(cleanLines(projectView(bodies, viewFrame('front')).lines), 15)).toEqual([]);
  });

  it('an assembly: the edges of a part behind another part are hidden where it covers them', () => {
    const big = extrude(createDocument('Big'), 'e1', rect(createSketch('s1', 'S1', 'top'), 0, 0, 100, -40), 40);
    const bar = extrude(createDocument('Bar'), 'e1', rect(createSketch('s1', 'S1', 'top'), -10, 0, 110, -10), 20);
    const comp = (id: string, part: Document, position: [number, number, number]): Component => ({ id, name: `${part.name}<1>`, part, position, rotation: [0, 0, 0, 1], fixed: id === 'c1', suppressed: false });
    const asm: Document = { ...createDocument('Asm'), kind: 'assembly', components: [comp('c1', big, [0, 0, 0]), comp('c2', bar, [0, 10, 50])] };
    const ls = projectedView(asm, 'front').lines;
    // the big block's side edges: visible below and above the bar (y 10..30), hidden behind it
    for (const x of [0, 100]) {
      const v = vertical(ls, x).sort((a, b) => a.lo - b.lo);
      expect(v.map((s) => s.hidden), `x = ${x}`).toEqual([false, true, false]);
      expect(v[0].hi).toBeCloseTo(10, 1);
      expect(v[2].lo).toBeCloseTo(30, 1);
    }
  });
});
