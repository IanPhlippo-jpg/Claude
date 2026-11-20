// The jog unfolds exactly (docs/37 ch. 11 point 6): two real bends of the sheet radius, the flat against a hand
// calculation. Each case failed on 339f8d1, where the jog was built of overlapping blocks (6 skin pieces, refused).
import { describe, expect, it } from 'vitest';
import { setRebuildBudget } from '../core/features/rebuild';
import { addLine, createSketch } from '../core/sketch/model';
import type { Document, Feature } from '../core/document/types';
import { din6935K } from './bend';
import { partBodies } from './bodies';
import { flatOfSheet } from './flat';
import { pp3Tab } from './fixtures';

setRebuildBudget(Infinity);
const F = (f: Record<string, unknown>) => f as unknown as Feature;
const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);
/** bend allowance of a 90 degree bend */
const BA = (r: number, k: number, t: number) => (Math.PI / 2) * (r + k * t);

/** pp3Tab (120 x 80, t 2, r 2) with a jog line across the 80 at its middle */
function jogDoc(jog: Record<string, unknown>, k = 0.5): Document {
  const d = pp3Tab();
  d.sheetMetal = { thickness: 2, bendRadius: 2, kFactor: k } as never;
  d.sketches.j = addLine(createSketch('j', 'j', 'top'), { x: 0, y: 40 }, { x: 120, y: 40 })[0];
  d.features.push(F({ id: 'js', type: 'sketch', name: 'Sketch2', sketchId: 'j', suppressed: false }),
    F({ id: 'jg', type: 'jog', name: 'Jog1', sketchId: 'j', suppressed: false, offset: 10, flipSide: false, reverse: false, ...jog }));
  return d;
}
const flat = (d: Document, kBron: 'model' | 'din6935' = 'model') => flatOfSheet(d, partBodies(d)[0], 'x', 1, 'S235', kBron);
/** the side across the jog: the one that is not the 120 of the tab */
const across = (f: { bbox: { l: number; b: number } }) => (Math.abs(f.bbox.l - 120) < 0.01 ? f.bbox.b : f.bbox.l);

/**
 * By hand (t 2, r 2, 90 degree bends): the top face rises D (outside offset D, inside offset D - t, overall D + t);
 * the bend zone runs from the tangent line of bend 1 to that of bend 2 over 2r + t = 6 with a straight leg
 * h = D - (2r + t). Bend Centerline: bend 1 starts BA/2 before the line (BA with the model's K).
 * Fix projected length on: the far part keeps its place, so the straight lengths are 40 - BA/2 and 40 - (6 - BA/2);
 * off: no material is added, so the far straight is 80 - (40 - BA/2) - 2 BA - h.
 * flat = the straights + h + 2 BA (BA with the K of the unfold).
 */
function hand(D: number, fixProjected: boolean, kModel: number, kFlat: number): number {
  const t = 2, r = 2, baM = BA(r, kModel, t), h = D - (2 * r + t);
  const s1 = 40 - baM / 2;
  const s2 = fixProjected ? 40 - (2 * r + t - baM / 2) : 80 - s1 - 2 * baM - h;
  return s1 + h + s2 + 2 * BA(r, kFlat, t);
}

describe('jog: two real bends, unfolded exactly against the hand calculation', () => {
  const cases: [string, Record<string, unknown>, number][] = [
    ['outside offset 10', { offsetType: 'outside' }, 10],
    ['inside offset 10', { offsetType: 'inside' }, 12],
    ['overall dimension 10', { offsetType: 'overall' }, 8],
  ];
  for (const [name, o, D] of cases) {
    for (const fix of [true, false]) {
      it(`${name}, fix projected length ${fix ? 'on' : 'off'}, K 0.5: ${hand(D, fix, 0.5, 0.5).toFixed(3)} by hand`, () => {
        const f = flat(jogDoc({ ...o, fixProjected: fix }));
        expect(f.fout).toBeUndefined();
        expect(f.betrouwbaar).toBe('exact');
        near(across(f), hand(D, fix, 0.5, 0.5), 0.05);
        expect(f.plooien.map((p) => [Math.round(p.hoek), Math.round(p.r * 10) / 10])).toEqual([[90, 2], [90, 2]]);
      });
    }
  }
  it('fix projected length off adds no material: the flat is the 80 of the tab (K of the model 0.5 and 0.4)', () => {
    for (const k of [0.5, 0.4]) {
      const f = flat(jogDoc({ fixProjected: false }, k));
      expect(f.betrouwbaar, `K ${k}`).toBe('exact');
      near(across(f), 80, 0.05);
    }
  });
  it('the flat with DIN 6935 (K 0.325 for r = t): the straights of the model + 2 BA with the DIN K', () => {
    const kd = din6935K(2, 2);
    expect(kd).toBeCloseTo(0.325, 3);
    for (const fix of [true, false]) {
      const f = flat(jogDoc({ fixProjected: fix }), 'din6935');
      expect(f.fout, `fix ${fix}`).toBeUndefined();
      expect(f.betrouwbaar).toBe('exact');
      near(across(f), hand(10, fix, 0.5, kd), 0.05);
    }
  });
  it('a model K of 0.4: the flat with the model K by hand', () => {
    const f = flat(jogDoc({}, 0.4));
    expect(f.betrouwbaar).toBe('exact');
    near(across(f), hand(10, true, 0.4, 0.4), 0.05);
  });
});
