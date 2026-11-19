import { describe, expect, it } from 'vitest';
import { nestRects, nestDxf, validateNest, defaultNestSettings, nestPieces, type NestPiece } from './nest';
import type { FlatPart } from './flat';
import { readDxf } from '../core/exchange/dxfRead';
import { chainBends, collisions, pressForce, proposeSequence, bendChecks, vOpening, minFlange } from './bend';
import { setRebuildBudget } from '../core/features/rebuild';
import { analyze } from './analyze';
import { defaultSettings } from './settings';
import { pp1 } from './fixtures';

setRebuildBudget(Infinity);
const rectFlat = (key: string, l: number, b: number, n: number): FlatPart => ({
  key, naam: key, n, materiaal: 'S235', t: 3, dichtheid: 7850, buiten: [{ a: { x: 0, y: 0 }, bulge: 0 }, { a: { x: l, y: 0 }, bulge: 0 }, { a: { x: l, y: b }, bulge: 0 }, { a: { x: 0, y: b }, bulge: 0 }],
  binnen: [], gaten: [], plooien: [], bbox: { l, b, draai: 0 }, oppervlak: l * b, snijlengte: { buiten: 2 * (l + b), binnen: 0 }, insteken: 1, kg: 0, betrouwbaar: 'exact',
});
const S = { afstand: 10, rand: 10, draaien: true, vlakken: [{ id: '1500x3000', l: 3000, b: 1500 }] };

describe('P3 nesting (rectangles)', () => {
  it('P3.2 20 rectangles 500 x 300 on 1500 x 3000, 10 mm spacing and border: 1 sheet; 31: 2 sheets', () => {
    for (const [n, sheets] of [[20, 1], [31, 2]] as const) {
      const flats = [rectFlat('r', 500, 300, n)];
      const nest = nestRects('S235', 3, nestPieces(flats), S);
      expect(nest.bladen.length, `${n}`).toBe(sheets);
      expect(validateNest(nest, flats, new Map([[1, n]]))).toEqual([]);
      expect(nest.bladen.length).toBeGreaterThanOrEqual(nest.ondergrens);
    }
  });

  it('P3.1 the independent check finds a piece moved into its neighbour, one over the border and a missing piece', () => {
    const flats = [rectFlat('r', 500, 300, 4)];
    const nest = nestRects('S235', 3, nestPieces(flats), S);
    const bad = JSON.parse(JSON.stringify(nest));
    Object.assign(bad.bladen[0].stukken[1], { x: bad.bladen[0].stukken[0].x + 5, y: bad.bladen[0].stukken[0].y, draai: bad.bladen[0].stukken[0].draai });
    bad.bladen[0].stukken[2].x = -5;
    bad.bladen[0].stukken.pop();
    const msgs = validateNest(bad, flats, new Map([[1, 4]]));
    expect(msgs.some((m) => /uit elkaar/.test(m))).toBe(true);
    expect(msgs.some((m) => /buiten de rand/.test(m))).toBe(true);
    expect(msgs.some((m) => /3 keer genest/.test(m))).toBe(true);
  });

  it('P3.5 / P3.7 never under the lower bound, on average within 1 sheet above it; the same input gives the same nest', () => {
    let seed = 7, over = 0;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let k = 0; k < 10; k++) {
      const pieces: NestPiece[] = Array.from({ length: 30 }, (_, i) => { const l = 100 + Math.round(rnd() * 900), b = 50 + Math.round(rnd() * 500); return { key: `p${i}`, pos: i + 1, l, b, oppervlak: l * b }; });
      const a = nestRects('S235', 3, pieces, S), b = nestRects('S235', 3, pieces, S);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(a.bladen.length).toBeGreaterThanOrEqual(a.ondergrens);
      over += a.bladen.length - a.ondergrens;
    }
    expect(over / 10).toBeLessThanOrEqual(1);
  });

  it('P3.6 100 pieces of 10 kinds nest as rectangles within 1 s', () => {
    const flats = Array.from({ length: 10 }, (_, i) => rectFlat(`k${i}`, 150 + 40 * i, 80 + 25 * i, 10));
    const t0 = performance.now();
    const n = nestRects('S235', 3, nestPieces(flats), S);
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(validateNest(n, flats, new Map(flats.map((_, i) => [i + 1, 10])))).toEqual([]);
  });

  it('P3.8 a piece larger than the sheet gives an error on that piece; the rest is nested', () => {
    const flats = [rectFlat('big', 3500, 400, 1), rectFlat('small', 200, 100, 3)];
    const n = nestRects('S235', 3, nestPieces(flats), S);
    expect(n.fouten.map((f) => f.pos)).toEqual([1]);
    expect(n.bladen[0].stukken.length).toBe(3);
  });

  it('P3.10 the nested DXF: each piece its own contour, the position on TEKST, the sheet edge on its own layer; read back', () => {
    const f = analyze(pp1(), defaultSettings()).flats;
    const flats = [{ ...f[0], n: 6 }];
    const nest = nestRects('S235', 5, nestPieces(flats), defaultNestSettings(5));
    expect(validateNest(nest, flats, new Map([[1, 6]]))).toEqual([]);
    const text = nestDxf(nest.bladen[0], flats);
    const pairs = text.split('\r\n');
    const layers = pairs.map((v, i) => (v === 'POLYLINE' && pairs[i - 1] === '0' ? pairs[pairs.indexOf('8', i) + 1] : null)).filter(Boolean);
    expect(layers.filter((l) => l === 'CONTOUR').length).toBe(6);
    expect(layers.filter((l) => l === 'BLADRAND').length).toBe(1);
    expect(pairs.filter((v, i) => v === 'TEXT' && pairs[i - 1] === '0').length).toBe(6);
    expect(readDxf(text).shapes.length).toBeGreaterThan(6 * 8);
  });
});

describe('P4 bend sequence', () => {
  it('P4.1 PP2: one step, direction and angle right, the stop at the flange length to the bend line within 0.05', () => {
    const { bends, width } = chainBends([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }], 3, 3, 0.5, 200);
    expect(bends.length).toBe(1);
    expect(bends[0].hoek).toBe(90);
    const flat1 = 100 - 6, ba = (Math.PI / 2) * (3 + 1.5);
    expect(Math.abs(bends[0].s - (flat1 + ba / 2))).toBeLessThan(0.05);
    const r = proposeSequence(bends, width, 3, 450);
    expect(r.steps.length).toBe(1);
    expect(Math.abs(Math.min(r.steps[0].aanslag, width - r.steps[0].aanslag) - Math.min(bends[0].s, width - bends[0].s))).toBeLessThan(0.05);
  });

  it('P4.2 Z profile (two bends opposite): the proposal turns the part over once', () => {
    const { bends, width } = chainBends([{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 40 }, { x: 120, y: 40 }], 3, 3, 0.5, 200);
    expect(bends.map((b) => b.richting)).toEqual(['op', 'neer']);
    const r = proposeSequence(bends, width, 3, 450);
    expect(r.steps.filter((s) => s.omkeren).length).toBe(1);
  });

  // finding against docs/36 P4.3: in the 2D check the two inner bends of a hat made one after the other close the U round
  // the punch; the collision-free proposal makes the brims (outer bends) first, as is usual on a press brake
  it('P4.3 hat profile (four bends): the proposal has no collision; the two inner bends one after the other collide', () => {
    const chain = [{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 15, y: 40 }, { x: 75, y: 40 }, { x: 75, y: 0 }, { x: 90, y: 0 }];
    const { bends, width } = chainBends(chain, 2, 2, 0.5, 300);
    const r = proposeSequence(bends, width, 2, 450);
    expect(r.gecontroleerd).toBe(true);
    expect(r.botsing).toEqual([]);
    expect(collisions(bends, r.steps.map((x) => x.plooi), width, 2)).toEqual([]);
    expect(collisions(bends, [2, 3, 1, 4], width, 2)).toEqual([2]);
    expect(collisions(bends, [1, 4, 3, 2], width, 2)).toEqual([]);
  });

  it('P4.4 press force PP2: 1.42 x 450 x 9 / 24 x 0.2 = 47.9 kN within 1 %', () => {
    expect(vOpening(3)).toBe(24);
    expect(Math.abs(pressForce(450, 3, 24, 200) - 47.925) / 47.925).toBeLessThan(0.01);
  });

  it('P4.5 a flange shorter than 0.7 x V gives a message with the name of the bend', () => {
    const { bends, width } = chainBends([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 12 }], 3, 3, 0.5, 200);
    const msgs = bendChecks(bends[0], width, 3, 3, { rm: 450, werklengte: 3000, maxKracht: 1000 }, bends);
    expect(msgs.some((m) => m.startsWith('Plooi 1:') && /korter dan 0,7 x V/.test(m))).toBe(true);
    expect(minFlange(24)).toBeCloseTo(16.8, 9);
  });

  it('P4.6 a part that is not prismatic: the sequence is marked as not checked for collisions', () => {
    const { bends, width } = chainBends([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }], 3, 3, 0.5, 200);
    expect(proposeSequence(bends, width, 3, 450, false).gecontroleerd).toBe(false);
  });
});

describe('P3.4 shape nesting (pairs along the no-fit polygon)', () => {
  const tri = (n: number): FlatPart => ({ ...rectFlat('tri', 400, 300, n), buiten: [{ a: { x: 0, y: 0 }, bulge: 0 }, { a: { x: 400, y: 0 }, bulge: 0 }, { a: { x: 0, y: 300 }, bulge: 0 }], oppervlak: 60000 });
  it('40 right triangles 400 x 300: pairs fill their boxes above 70 % where single rectangles stay at 50 %; the nest is valid on the exact contours', async () => {
    const { nestPiecesShape } = await import('./nest');
    const flats = [tri(40)];
    const rect = nestRects('S235', 3, nestPieces(flats), S), shape = nestRects('S235', 3, nestPiecesShape(flats, S.afstand), S);
    const fill = (n: typeof rect) => (40 * 60000) / n.bladen.reduce((t, b) => t + b.stukken.reduce((u, p) => u + (p.tx === undefined ? p.l * p.b : (p.draai === 0 ? p.l * p.b : 0)), 0), 0);
    expect(fill(rect)).toBeLessThan(0.55);
    expect(fill(shape)).toBeGreaterThan(0.7);
    expect(shape.status).toBe('vorm');
    expect(validateNest(shape, flats, new Map([[1, 40]]))).toEqual([]);
    expect(shape.bladen.flatMap((b) => b.stukken).length).toBe(40);
  });
});
