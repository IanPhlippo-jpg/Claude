/**
 * Test pieces of docs/36 built with the app's own model (used by the tests and the e2e script through the test hooks):
 * LF1 test frame, PP1 flat plate, PP2 L profile, PP3 U tray with edge flanges and a hole in a flange.
 */
import { addArc, addCircle, addLine, addPointParam, createSketch } from '../core/sketch/model';
import { createDocument, type Document, type Feature } from '../core/document/types';
import type { Sketch } from '../core/sketch/types';

const F = (f: Record<string, unknown>) => f as unknown as Feature;

/** a closed outline of lines with rounded corners (radius r) and optional circles, as one sketch */
export function roundedRect(id: string, plane: string, w: number, h: number, r: number, holes: { x: number; y: number; r: number }[] = []): Sketch {
  let s = createSketch(id, id, plane as never);
  const ids: string[] = [];
  const pt = (x: number, y: number) => { const [s1, pid] = addPointParam(s, { x, y }); s = s1; ids.push(pid); return pid; };
  const a = pt(r, 0), b = pt(w - r, 0), c = pt(w, r), d = pt(w, h - r), e = pt(w - r, h), f = pt(r, h), g = pt(0, h - r), k = pt(0, r);
  s = addLine(s, a, b)[0]; s = addArc(s, { x: w - r, y: r }, b, c, true)[0];
  s = addLine(s, c, d)[0]; s = addArc(s, { x: w - r, y: h - r }, d, e, true)[0];
  s = addLine(s, e, f)[0]; s = addArc(s, { x: r, y: h - r }, f, g, true)[0];
  s = addLine(s, g, k)[0]; s = addArc(s, { x: r, y: r }, k, a, true)[0];
  for (const hl of holes) s = addCircle(s, { x: hl.x, y: hl.y }, hl.r)[0];
  return s;
}

const box = (id: string, plane: string, x0: number, y0: number, x1: number, y1: number, circle?: { x: number; y: number; r: number }) => {
  let s = createSketch(id, id, plane as never);
  const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  if (circle) s = addCircle(s, { x: circle.x, y: circle.y }, circle.r)[0];
  return s;
};
const extrude = (id: string, sketchId: string, op: 'boss' | 'cut', depth: number, extra: Record<string, unknown> = {}) =>
  F({ id, type: 'extrude', name: id, sketchId, suppressed: false, op, end: 'blind', depth, reverse: false, ...extra });

/** PP1: plate 200 x 100 x 5, corners R10, four holes Ø9 */
export function pp1(): Document {
  const d = createDocument('PP1 Vlakke plaat');
  d.material = { name: 'S235', density: 7850, color: '#888888' };
  d.sketches.s1 = roundedRect('s1', 'top', 200, 100, 10, [{ x: 20, y: 20, r: 4.5 }, { x: 180, y: 20, r: 4.5 }, { x: 20, y: 80, r: 4.5 }, { x: 180, y: 80, r: 4.5 }]);
  d.features.push(F({ id: 's1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }), { ...extrude('e1', 's1', 'boss', 5), name: 'Plaat' } as Feature);
  return d;
}

/** PP2: L profile, base flange legs 100 and 50 (to the outer sharp), 200 deep, t = 3, r = 3, one 90 degree bend */
export function pp2(k = 0.5): Document {
  const d = createDocument('PP2 L-profiel');
  d.material = { name: 'S235', density: 7850, color: '#888888' };
  d.sheetMetal = { thickness: 3, bendRadius: 3, kFactor: k } as never;
  d.sketches.s1 = addLine(addLine(createSketch('s1', 's1', 'front'), { x: 0, y: 0 }, { x: 100, y: 0 })[0], { x: 100, y: 0 }, { x: 100, y: 50 })[0];
  d.features.push(F({ id: 'bf', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 200, midPlane: false, reverse: false }));
  return d;
}

/** a Z profile (two bends in opposite directions) and a hat profile (four bends) for the bend sequence */
export function chainSheet(name: string, pts: { x: number; y: number }[], depth = 200): Document {
  const d = createDocument(name);
  d.material = { name: 'S235', density: 7850, color: '#888888' };
  d.sheetMetal = { thickness: 3, bendRadius: 3, kFactor: 0.5 } as never;
  let s = createSketch('s1', 's1', 'front');
  for (let i = 0; i + 1 < pts.length; i++) s = addLine(s, pts[i], pts[i + 1])[0];
  d.sketches.s1 = s;
  d.features.push(F({ id: 'bf', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth, midPlane: false, reverse: false }));
  return d;
}

/** PP3 base: a 120 x 80 x 2 tab; the tray gets two edge flanges and a hole in one flange in the test (edges come from a rebuild) */
export function pp3Tab(): Document {
  const d = createDocument('PP3 U-bak');
  d.material = { name: 'S235', density: 7850, color: '#888888' };
  d.sheetMetal = { thickness: 2, bendRadius: 2, kFactor: 0.5 } as never;
  d.sketches.s1 = box('s1', 'top', 0, 0, 120, 80);
  d.features.push(F({ id: 'tb', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 0, midPlane: false, reverse: false }));
  return d;
}

/** LF1 test frame: 1000 x 600 outside in tube 40 x 40 x 3, four miters, one post square between the rails (520) */
export function lf1(): Document {
  const d = createDocument('LF1 Proefraam');
  d.material = { name: 'S235JRH', density: 7850, color: '#888888' };
  let s = createSketch('s1', 's1', 'front');
  const c = [{ x: 20, y: 20 }, { x: 980, y: 20 }, { x: 980, y: 580 }, { x: 20, y: 580 }];
  for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
  d.sketches.s1 = s;
  d.sketches.s2 = addLine(createSketch('s2', 's2', 'front'), { x: 500, y: 40 }, { x: 500, y: 560 })[0];
  const sm = (id: string, sketchId: string, corner: string) => F({ id, type: 'structuralMember', name: id === 'sm1' ? 'Structural Member1' : 'Structural Member2', suppressed: false, sketchId,
    standard: 'iso', profileType: 'square tube', size: '40 x 40 x 3', corner, gap: 0, mergeArcs: false, rotation: 0, mirror: false, locate: { x: 0, y: 0 } });
  d.features.push(F({ id: 's1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }), sm('sm1', 's1', 'endMiter'), F({ id: 's2', type: 'sketch', name: 'Sketch2', sketchId: 's2',
    suppressed: false }), sm('sm2', 's2', 'none'));
  return d;
}
