import { describe, expect, it } from 'vitest';
import { createDocument, type DrawingView } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { autoCenterMarks, newViewStyle } from './autoMarks';
import { viewGeometry } from './sheet';

// a plate 80 x 40 x 10 with a hole of 10 and a hole of 6 with a counterbore of 11 on the underside (concentric circles)
const plate = () => {
  const doc = createDocument('Plaat');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 40 }, { x: 0, y: 40 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  s = addCircle(s, { x: 20, y: 20 }, 5)[0];
  doc.sketches.sk1 = s;
  doc.features.push({ id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false });
  doc.sketches.sk2 = addCircle(createSketch('sk2', 'Sketch2', 'top'), { x: 60, y: 20 }, 3)[0];
  doc.features.push({ id: 'f2', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false });
  doc.sketches.sk3 = addCircle(createSketch('sk3', 'Sketch3', 'top'), { x: 60, y: 20 }, 5.5)[0];
  doc.features.push({ id: 'f3', type: 'extrude', name: 'Cut-Extrude2', sketchId: 'sk3', suppressed: false, op: 'cut', end: 'blind', depth: 4, reverse: false });
  return doc;
};
const view = (id: string, type: DrawingView['type'], model = plate()): DrawingView => ({ id, name: id, type, position: [100, 100], displayStyle: 'hiddenRemoved', model, modelName: 'Plaat<1>' });

describe('auto insert center marks on view creation (QA v0.5.1 F122)', () => {
  // a heavy view (hidden-line pass): ample time when the whole suite runs in parallel
  it('one mark per hole in the view that looks down the holes, the largest of a counterbore; none in the others', { timeout: 30000 }, () => {
    let n = 0;
    const id = () => `cm${++n}`;
    const top = autoCenterMarks([view('t', 'top')], [], id);
    expect(top).toHaveLength(2);
    // from above: the hole of 10 and the hole of 6 (its counterbore is hidden underneath): one mark each
    expect(top.map((m) => Math.round(m.r * 10) / 10).sort((a, b) => a - b)).toEqual([3, 5]);
    expect(autoCenterMarks([view('f', 'front')], [], id)).toHaveLength(0);
    expect(autoCenterMarks([view('i', 'isometric')], [], id)).toHaveLength(0);
    // a view that has its marks already gets no second set
    expect(autoCenterMarks([view('t', 'top')], top, id)).toHaveLength(0);
  });

  // QA 0.5.13 F122: every standard view of a part with holes in two directions, as a drawing view gets it by default
  it('every standard view: a mark on each hole seen end-on (none on the others), the holes seen across as hidden lines', { timeout: 60000 }, () => {
    const model = plate();
    // a hole of 4 through the 40 mm depth, from the front plane, at x = 40 and 5 mm up the 10 mm thickness
    model.sketches.sk4 = addCircle(createSketch('sk4', 'Sketch4', 'front'), { x: 40, y: 5 }, 2)[0];
    model.features.push({ id: 'f4', type: 'extrude', name: 'Cut-Extrude3', sketchId: 'sk4', suppressed: false, op: 'cut', end: 'throughAllBoth', depth: 0, reverse: false });
    // per view: the radii of the marks (one per centre, the largest circle there) and the least length of hidden lines
    const want: Record<string, { marks: number[]; hidden: number }> = {
      front: { marks: [2], hidden: 2 * 10 + 2 * 6 },
      back: { marks: [2], hidden: 2 * 10 + 2 * 6 },
      top: { marks: [3, 5], hidden: 2 * 40 },
      bottom: { marks: [5, 5.5], hidden: 2 * 40 },
      left: { marks: [], hidden: 2 * 40 },
      right: { marks: [], hidden: 2 * 40 },
      isometric: { marks: [], hidden: 0 },
    };
    let n = 0;
    for (const [type, w] of Object.entries(want)) {
      const v = view(type, type as DrawingView['type'], model);
      const g = viewGeometry(v);
      const marks = autoCenterMarks([v], [], () => `cm${++n}`);
      expect({ type, marks: marks.map((m) => Math.round(m.r * 10) / 10).sort((a, b) => a - b) }).toEqual({ type, marks: w.marks });
      // every circle drawn in the view (seen end-on, not hidden) has its mark at its centre
      if (type !== 'isometric') for (const c of g.circles.filter((x) => !x.hidden && x.r > 0.05)) expect(marks.some((m) => Math.hypot(m.c[0] - c.c[0], m.c[1] - c.c[1]) < 0.05), `${type}: circle r ${c.r} at ${c.c}`).toBe(true);
      const hidden = g.lines.filter((l) => l.hidden && !l.cosmetic).reduce((s, l) => s + Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]), 0);
      expect(hidden, `${type}: hidden length`).toBeGreaterThanOrEqual(w.hidden * 0.95);
    }
  });

  it('new views take the display style of the options', () => {
    expect(newViewStyle('Hidden lines visible')).toBe('hiddenVisible');
    expect(newViewStyle('Hidden lines removed')).toBe('hiddenRemoved');
    expect(newViewStyle(undefined)).toBe('hiddenRemoved');
  });
});
