import { describe, expect, it } from 'vitest';
import { createDocument, type DrawingView } from '../document/types';
import { addCircle, addLine, createSketch } from '../sketch/model';
import { autoCenterMarks, newViewStyle } from './autoMarks';

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
  it('one mark per hole in the view that looks down the holes, the largest of a counterbore; none in the others', () => {
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

  it('new views take the display style of the options', () => {
    expect(newViewStyle('Hidden lines visible')).toBe('hiddenVisible');
    expect(newViewStyle('Hidden lines removed')).toBe('hiddenRemoved');
    expect(newViewStyle(undefined)).toBe('hiddenRemoved');
  });
});
