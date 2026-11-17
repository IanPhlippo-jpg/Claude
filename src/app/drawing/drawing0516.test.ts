// @vitest-environment jsdom
// Drawings 0.5.16: auto insert on view creation (center marks on fillets, centerlines, balloons), the tangent edges
// of new views, the Detailing display filter, dangling annotations, model colour, detailed preview, Replace Model.
import { afterEach, describe, expect, it } from 'vitest';
import { useStore } from '../store';
import { DEFAULT_PREFS, savePrefs, type PrefValue } from '../prefs';
import { addArc, addCircle, addLine, addPointParam, createSketch } from '../../core/sketch/model';
import { createDocument, type Component, type Document, type DrawingSheet, type DrawingSymbol, type Feature } from '../../core/document/types';
import { replaceViewModels } from '../../core/drawing/replaceModel';
import { viewGeometry } from '../../core/drawing/sheet';
import { replaceModelWith } from './replaceModelCommand';
import { centerMarkShown, cosmeticThreadsShown, detailedPreview, dimensionShown, lineColour, noteShown, symbolShown } from './drawingPrefs';
import { viewLines } from './viewLines';

const use = (o: Record<string, PrefValue> = {}) => savePrefs({ ...DEFAULT_PREFS, ...o });
afterEach(() => use());
const st = () => useStore.getState();
type S = ReturnType<typeof createSketch>;

/** a plate w x 40 x 10 with R6 corners and a hole of r 4 at (hx, -20) */
function plate(w = 80, hx = 20, name = 'Plate'): Document {
  const doc = createDocument(name);
  const r = 6;
  const pts: [number, number][] = [[r, 0], [w - r, 0], [w, -r], [w, -40 + r], [w - r, -40], [r, -40], [0, -40 + r], [0, -r]];
  const arcs: ([number, number] | null)[] = [null, [w - r, -r], null, [w - r, -40 + r], null, [r, -40 + r], null, [r, -r]];
  let s: S = createSketch('s1', 'S1', 'top');
  const ids: string[] = [];
  for (const [x, y] of pts) { let id: string; [s, id] = addPointParam(s, { x, y }); ids.push(id); }
  for (let i = 0; i < 8; i++) { const c = arcs[i]; s = c ? addArc(s, { x: c[0], y: c[1] }, ids[i], ids[(i + 1) % 8], false)[0] : addLine(s, ids[i], ids[(i + 1) % 8])[0]; }
  doc.sketches.s1 = s;
  doc.sketches.s2 = addCircle(createSketch('s2', 'S2', 'top'), { x: hx, y: -20 }, 4)[0];
  doc.features.push({ id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false } as Feature);
  doc.features.push({ id: 'c1', type: 'extrude', name: 'Cut-Extrude1', sketchId: 's2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false } as Feature);
  return doc;
}

/** a new drawing with one view of `model` (orientation `type`) placed at (150, 120) */
function drawingWith(model: Document, type: 'front' | 'top' = 'top', prefs: Record<string, PrefValue> = {}) {
  st().openDocument(createDocument('Drawing1', 'drawing'));
  // Document Properties live in the document: set after it is open
  use(prefs);
  st().startModelView();
  st().setModelViewSource(model);
  st().setDrawingEdit({ orientation: type });
  st().placeView([150, 120]);
  st().cancelDrawingEdit();
  return st().doc.sheets![0];
}

describe('auto insert on view creation', { timeout: 60000 }, () => {
  it('doc.autoCenterMarksFillets: the rounded corners get center marks in a new view', () => {
    let sheet = drawingWith(plate(), 'top');
    // Center marks-holes only (default): the hole
    expect(sheet.centerMarks.map((m) => Math.round(m.r))).toEqual([4]);
    sheet = drawingWith(plate(), 'top', { 'doc.autoCenterMarksFillets': true });
    expect(sheet.centerMarks.filter((m) => Math.abs(m.r - 6) < 0.1).length).toBe(4);
  });

  it('doc.autoCenterlines: a new front view gets the centerline of the hole', () => {
    expect((drawingWith(plate(), 'front').symbols ?? []).filter((s) => s.kind === 'centerline')).toEqual([]);
    const sheet = drawingWith(plate(), 'front', { 'doc.autoCenterlines': true });
    const cl = (sheet.symbols ?? []).filter((s) => s.kind === 'centerline');
    expect(cl.length).toBe(1);
    expect(cl[0].viewId).toBe(sheet.views[0].id);
    // vertical, over the plate thickness (10 at the sheet scale) and 2.5 mm beyond each end
    const s = sheet.views[0].scale ?? sheet.scale;
    expect(Math.abs(cl[0].a![0] - cl[0].b![0])).toBeLessThan(1e-6);
    expect(Math.abs(cl[0].b![1] - cl[0].a![1])).toBeCloseTo((10 * s[0]) / s[1] + 5, 1);
    // it moves with its view
    st().moveDrawingView(sheet.views[0].id, [160, 120]);
    const moved = (st().doc.sheets![0].symbols ?? []).find((x) => x.id === cl[0].id)!;
    expect(moved.a![0] - cl[0].a![0]).toBeCloseTo(10, 6);
  });

  it('doc.autoBalloons: a new view of an assembly gets one balloon per part', () => {
    const comp = (id: string, part: Document, x: number): Component => ({ id, name: `${part.name}<${id}>`, part, position: [x, 0, 0], rotation: [0, 0, 0, 1], fixed: x === 0, suppressed: false });
    const asm: Document = { ...createDocument('Asm', 'assembly'), components: [comp('c1', plate(80, 20, 'A'), 0), comp('c2', plate(40, 20, 'B'), 100), comp('c3', plate(40, 20, 'B'), 150)] };
    expect((drawingWith(asm, 'top').symbols ?? []).filter((s) => s.kind === 'balloon')).toEqual([]);
    const balloons = (drawingWith(asm, 'top', { 'doc.autoBalloons': true }).symbols ?? []).filter((s) => s.kind === 'balloon');
    expect(balloons.map((b) => b.text).sort()).toEqual(['1', '2']);
  });

  it('drawings.tangentEdges: new views take the option; Removed draws none', () => {
    const v = drawingWith(plate(), 'front').views[0];
    expect(v.tangentEdges).toBe('visible');
    // the plate's rounded corners meet its sides smoothly: tangent edges in the front view
    expect(viewLines(v, viewGeometry(v).lines).some((l) => l.tangent)).toBe(true);
    const w = drawingWith(plate(), 'front', { 'drawings.tangentEdges': 'Removed' }).views[0];
    expect(w.tangentEdges).toBe('removed');
    expect(viewGeometry(w).lines.some((l) => l.tangent)).toBe(false);
  });
});

describe('Detailing display filter and drawing options', () => {
  const dim = (model?: boolean): DrawingSheet['dimensions'][number] => ({ id: 'd', viewId: 'v', kind: 'linear', a: [0, 0], b: [1, 0], label: [0, 1], value: 1, ...(model ? { model } : {}) });
  const sym = (kind: DrawingSymbol['kind'], dangling = false): DrawingSymbol => ({ id: 's', kind, position: [0, 0], ...(dangling ? { dangling } : {}) });
  const note = { id: 'n', text: 'NOTE', position: [0, 0] as [number, number] };

  it('doc.detFeatureDims / doc.detRefDims: model dimensions and dimensions made on the sheet', () => {
    expect(dimensionShown(dim(true)) && dimensionShown(dim())).toBe(true);
    use({ 'doc.detFeatureDims': false });
    expect(dimensionShown(dim(true))).toBe(false);
    expect(dimensionShown(dim())).toBe(true);
    use({ 'doc.detRefDims': false });
    expect(dimensionShown(dim())).toBe(false);
  });

  it('doc.detDatums, doc.detDatumTargets, doc.detGtol, doc.detSurfaceFinish, doc.detWelds, doc.detNotes', () => {
    const map: [string, DrawingSymbol['kind']][] = [['doc.detDatums', 'datum'], ['doc.detDatumTargets', 'datumTarget'], ['doc.detGtol', 'gtol'], ['doc.detSurfaceFinish', 'surfaceFinish'], ['doc.detWelds', 'weld']];
    for (const [k, kind] of map) {
      use();
      expect(symbolShown(sym(kind)), k).toBe(true);
      use({ [k]: false });
      expect(symbolShown(sym(kind)), k).toBe(false);
      expect(symbolShown(sym('balloon')), k).toBe(true);
    }
    use();
    expect(noteShown(note)).toBe(true);
    use({ 'doc.detNotes': false });
    expect(noteShown(note)).toBe(false);
  });

  it('doc.detDisplayAll shows every type whatever its box says', () => {
    use({ 'doc.detNotes': false, 'doc.detGtol': false, 'doc.detCosmeticThreads': false, 'doc.detDisplayAll': true });
    expect(noteShown(note) && symbolShown(sym('gtol')) && cosmeticThreadsShown()).toBe(true);
  });

  it('doc.detCosmeticThreads: the cosmetic thread lines of a view', () => {
    const v = { id: 'v', name: 'v', type: 'front', position: [0, 0], displayStyle: 'hiddenRemoved', model: createDocument('P'), modelName: 'P<1>' } as Parameters<typeof viewLines>[0];
    const lines = [{ a: [0, 0], b: [1, 0], hidden: false, cosmetic: true }, { a: [0, 1], b: [1, 1], hidden: false }] as Parameters<typeof viewLines>[1];
    expect(viewLines(v, lines).length).toBe(2);
    use({ 'doc.detCosmeticThreads': false });
    expect(viewLines(v, lines).length).toBe(1);
  });

  it('doc.displayAnnotations: off hides dimensions, notes and annotations (an Area Hatch stays)', () => {
    use({ 'doc.displayAnnotations': false });
    expect([dimensionShown(dim()), noteShown(note), symbolShown(sym('balloon'))]).toEqual([false, false, false]);
    expect(symbolShown(sym('areaHatch'))).toBe(true);
  });

  it('doc.hideDanglingDims: dangling dimensions, marks and annotations are hidden', () => {
    const d = { ...dim(), dangling: true };
    const m = { id: 'm', viewId: 'v', c: [0, 0] as [number, number], r: 1, dangling: true };
    expect([dimensionShown(d), symbolShown(sym('balloon', true)), centerMarkShown(m)]).toEqual([true, true, true]);
    use({ 'doc.hideDanglingDims': true });
    expect([dimensionShown(d), symbolShown(sym('balloon', true)), centerMarkShown(m)]).toEqual([false, false, false]);
    expect(dimensionShown(dim())).toBe(true);
  });

  it('doc.useModelColor: the lines take the colour of the part', () => {
    const p = { ...createDocument('P'), appearance: '#c03030' };
    expect(lineColour(p)).toBe('#000');
    use({ 'doc.useModelColor': true });
    expect(lineColour(p)).toBe('#c03030');
    expect(lineColour(createDocument('Q'))).toBe('#000');
  });

  it('drawings.perf.detailedPreview: off places a new view with its frame only', () => {
    expect(detailedPreview()).toBe(true);
    use({ 'drawings.perf.detailedPreview': false });
    expect(detailedPreview()).toBe(false);
  });
});

describe('Replace Model', { timeout: 60000 }, () => {
  it('every view of the model gets the new one; annotations on geometry that is gone turn dangling', () => {
    const sheet = drawingWith(plate(), 'top');
    st().placeProjectedView('front', [150, 60], sheet.views[0].id);
    let sh = st().doc.sheets![0];
    const [top, front] = sh.views;
    // an outline dimension (the 80 long top edge), a diameter on the hole, a hole mark exists already
    const outline = { id: 'd1', viewId: top.id, kind: 'linear' as const, a: [6, 0] as [number, number], b: [74, 0] as [number, number], label: [40, 8] as [number, number], value: 68, orientation: 'h' as const };
    const hole = { id: 'd2', viewId: top.id, kind: 'diameter' as const, a: [20, -20] as [number, number], b: [24, -20] as [number, number], label: [30, -10] as [number, number], value: 8 };
    sh = { ...sh, dimensions: [outline, hole] };
    // the new model: the same plate with the hole moved to x = 50
    const r = replaceViewModels(sh, top.id, plate(80, 50, 'Plate rev B'));
    expect(r.views).toBe(2);
    expect(r.sheet.views.map((v) => v.modelName)).toEqual(['Plate rev B<1>', 'Plate rev B<1>']);
    // place, scale and orientation stay
    expect(r.sheet.views.map((v) => [v.position, v.type])).toEqual([[top.position, 'top'], [front.position, 'front']]);
    const d = Object.fromEntries(r.sheet.dimensions.map((x) => [x.id, x]));
    expect(d.d1.dangling).toBeUndefined();
    expect(d.d2.dangling).toBe(true);
    expect(r.sheet.centerMarks.find((m) => m.viewId === top.id)!.dangling).toBe(true);
    expect(r.dangling).toBe(2);
    // the model back: nothing dangles any more
    const back = replaceViewModels(r.sheet, top.id, plate());
    expect(back.dangling).toBe(0);
    expect(back.sheet.dimensions.every((x) => !x.dangling) && back.sheet.centerMarks.every((m) => !m.dangling)).toBe(true);
  });

  it('the command replaces the model of the selected view in one undoable step', () => {
    drawingWith(plate(), 'top');
    const before = st().doc;
    expect(replaceModelWith(plate(100, 20, 'Wider'))).toBe(true);
    expect(st().doc.sheets![0].views[0].modelName).toBe('Wider<1>');
    expect(st().doc.sheets![0].views[0].model.name).toBe('Wider');
    expect(replaceModelWith(createDocument('Dwg', 'drawing'))).toBe(false);
    st().undo();
    expect(st().doc.sheets![0].views[0].modelName).toBe(before.sheets![0].views[0].modelName);
  });
});
