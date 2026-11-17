import { describe, expect, it } from 'vitest';
import { addArc, addCircle, addLine, addPointParam, createSketch } from '../sketch/model';
import { createDocument, type Document, type DrawingSheet, type DrawingView, type Feature } from '../document/types';
import { autoCenterMarks } from './autoMarks';
import { autoCenterlines } from './centerlines';
import { decompose, viewArcs } from './arcs';

// Auto insert on view creation (0.5.16): center marks on holes, slots, bolt circles, linear patterns and fillets;
// centerlines of the cylinders and holes seen from the side.

type S = ReturnType<typeof createSketch>;
type P = [number, number];

/** a closed outline of lines and arcs: each corner is [point, arc centre to the next point or none] */
function outline(s: S, pts: P[], arcs: (P | null)[]): S {
  const ids: string[] = [];
  for (const [x, y] of pts) { let id: string; [s, id] = addPointParam(s, { x, y }); ids.push(id); }
  for (let i = 0; i < pts.length; i++) {
    const c = arcs[i], a = ids[i], b = ids[(i + 1) % pts.length];
    s = c ? addArc(s, { x: c[0], y: c[1] }, a, b, false)[0] : addLine(s, a, b)[0];
  }
  return s;
}
const cut = (doc: Document, id: string, s: S) => {
  doc.sketches[s.id] = s;
  doc.features.push({ id, type: 'extrude', name: id, sketchId: s.id, suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false } as Feature);
};

/** a plate 120 x 60 x 10 with R8 corners, a slot, a bore with six holes on a bolt circle and a row of three holes */
function plate(): Document {
  const doc = createDocument('Plate');
  // clockwise from the top left: straight side, then the corner arc to the next side
  const r = 8;
  const s1 = outline(createSketch('s1', 'S1', 'top'),
    [[r, 0], [120 - r, 0], [120, -r], [120, -60 + r], [120 - r, -60], [r, -60], [0, -60 + r], [0, -r]],
    [null, [120 - r, -r], null, [120 - r, -60 + r], null, [r, -60 + r], null, [r, -r]]);
  doc.sketches.s1 = s1;
  doc.features.push({ id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as Feature);
  // a slot: centres (20, -30) and (40, -30), radius 5
  cut(doc, 'c1', outline(createSketch('s2', 'S2', 'top'), [[20, -25], [40, -25], [40, -35], [20, -35]], [null, [40, -30], null, [20, -30]]));
  // a bore of 12 with six holes of 4 on a circle of radius 15 around it
  let s3 = addCircle(createSketch('s3', 'S3', 'top'), { x: 85, y: -30 }, 6)[0];
  for (let i = 0; i < 6; i++) s3 = addCircle(s3, { x: 85 + 15 * Math.cos((i * Math.PI) / 3), y: -30 + 15 * Math.sin((i * Math.PI) / 3) }, 2)[0];
  cut(doc, 'c2', s3);
  // a hole of 3 at (55, -8), patterned along x: 3 instances 8 apart
  cut(doc, 'c3', addCircle(createSketch('s4', 'S4', 'top'), { x: 55, y: -8 }, 1.5)[0]);
  doc.features.push({ id: 'p1', type: 'linearPattern', name: 'LPattern1', suppressed: false, featureIds: ['c3'], dir1: { axis: [1, 0, 0], spacing: 8, count: 3 } } as Feature);
  return doc;
}
const view = (id: string, type: DrawingView['type'], model: Document): DrawingView => ({ id, name: id, type, position: [150, 100], displayStyle: 'hiddenRemoved', model, modelName: `${model.name}<1>` });

describe('lines and arcs of an outline', () => {
  it('a slot outline splits into two lines and two half circles', () => {
    const pts: P[] = [[20, -25], [40, -25]];
    for (let k = 0; k <= 16; k++) pts.push([40 + 5 * Math.sin((k * Math.PI) / 16), -30 + 5 * Math.cos((k * Math.PI) / 16)]);
    pts.push([20, -35]);
    for (let k = 1; k < 16; k++) pts.push([20 - 5 * Math.sin((k * Math.PI) / 16), -30 - 5 * Math.cos((k * Math.PI) / 16)]);
    const prims = decompose(pts, true);
    expect(prims.map((p) => p.kind).sort()).toEqual(['arc', 'arc', 'line', 'line']);
    for (const a of prims) if (a.kind === 'arc') expect(Math.abs(a.sweep)).toBeCloseTo(Math.PI, 2);
  });
});

describe('auto center marks and centerlines', { timeout: 60000 }, () => {
  const model = plate();

  it('the model has the slot, the four corner arcs and no other arcs', () => {
    const { arcs, slots } = viewArcs(model, 'top');
    expect(slots.length).toBe(1);
    expect([slots[0].c1, slots[0].c2].map((c) => c.map((x) => Math.round(x)))).toEqual(expect.arrayContaining([[20, -30], [40, -30]]));
    expect(slots[0].r).toBeCloseTo(5, 1);
    const corners = arcs.filter((a) => Math.abs(a.r - 8) < 0.1);
    expect(corners.length).toBeGreaterThanOrEqual(4);
    expect(arcs.every((a) => Math.abs(a.r - 8) < 0.1)).toBe(true);
  });

  it('Center marks-holes: a mark per hole, the slot mark, the bolt circle and the row of the linear pattern', () => {
    let n = 0;
    const marks = autoCenterMarks([view('t', 'top', model)], [], () => `m${++n}`, { holes: true, fillets: false });
    const plain = marks.filter((m) => !m.kind);
    // bore + 6 bolt holes + 3 patterned holes
    expect(plain.length).toBe(10);
    const slot = marks.filter((m) => m.kind === 'slot');
    expect(slot.length).toBe(1);
    expect(Math.abs(slot[0].c[0] - slot[0].c2![0])).toBeCloseTo(20, 1);
    const bolt = marks.filter((m) => m.kind === 'circular');
    expect(bolt.length).toBe(1);
    expect(bolt[0].c[0]).toBeCloseTo(85, 1);
    expect(bolt[0].c[1]).toBeCloseTo(-30, 1);
    expect(bolt[0].r).toBeCloseTo(15, 1);
    const row = marks.filter((m) => m.kind === 'linear');
    expect(row.length).toBe(1);
    expect(Math.abs(row[0].c2![0] - row[0].c[0])).toBeCloseTo(16, 1);
    // no fillet marks without the option, none in a view across the plate
    expect(marks.some((m) => !m.kind && Math.abs(m.r - 8) < 0.1)).toBe(false);
    expect(autoCenterMarks([view('f', 'front', model)], [], () => `m${++n}`, { holes: true, fillets: false })).toEqual([]);
  });

  it('Center marks-fillets: a mark at the centre of each rounded corner', () => {
    let n = 0;
    const marks = autoCenterMarks([view('t', 'top', model)], [], () => `m${++n}`, { holes: false, fillets: true });
    const corners = marks.filter((m) => Math.abs(m.r - 8) < 0.1).map((m) => m.c.map((x) => Math.round(Math.abs(x))).join(',')).sort();
    expect(corners).toEqual(['112,52', '112,8', '8,52', '8,8']);
    expect(marks.length).toBe(4);
  });

  it('Centerlines: one along each hole seen from the side, over the plate thickness and 2.5 mm beyond', () => {
    const sheet: DrawingSheet = { id: 's', name: 'Sheet1', size: 'A3', landscape: true, scale: [1, 1], showFormat: false, views: [], dimensions: [], notes: [], centerMarks: [] };
    const v = view('f', 'front', model);
    sheet.views.push(v);
    let n = 0;
    const lines = autoCenterlines(sheet, [v], () => `c${++n}`);
    // the front view sees the holes at x = 20..40 (slot: no circles), 55, 63, 71, 70, 77.5, 85, 92.5, 100 (some coincide)
    expect(lines.length).toBeGreaterThanOrEqual(6);
    for (const l of lines) {
      expect(l.kind).toBe('centerline');
      expect(l.viewId).toBe('f');
      expect(Math.abs(l.a![0] - l.b![0])).toBeLessThan(1e-6);
      expect(Math.abs(l.b![1] - l.a![1])).toBeCloseTo(15, 1);
    }
    // inserted once: a second call finds them there
    expect(autoCenterlines({ ...sheet, symbols: lines }, [v], () => `c${++n}`)).toEqual([]);
    // a view that looks down the holes has none
    expect(autoCenterlines(sheet, [view('t', 'top', model)], () => `c${++n}`)).toEqual([]);
  });
});
