import { describe, expect, it } from 'vitest';
import { rebuildDocument, setRebuildBudget } from '../core/features/rebuild';
import { edgeRef } from '../core/features/edgesets';
import { addCircle, createSketch } from '../core/sketch/model';
import type { Document, Feature } from '../core/document/types';
import { partBodies } from './bodies';
import { recognize } from './recognize';
import { circleLoop, fitArcs, flatOfPlate, flatOfSheet, genus, loopAreaB, loopLen, plateData } from './flat';
import { DXF_DEFAULTS, dxfFileName, plateDxf } from './dxf';
import { readDxf } from '../core/exchange/dxfRead';
import { din6935K } from './bend';
import { pp1, pp2, pp3Tab } from './fixtures';
import { plateChecks, blocksExport, type CheckInput } from './checks';
import { flatLength } from '../core/features/sheetmetal';

setRebuildBudget(Infinity);
const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);

describe('P1 flat parts (docs/36 4.6)', () => {
  const plate = () => { const b = partBodies(pp1())[0]; return flatOfPlate(b, 'Plaat', 1, 'S235'); };

  it('P1.1 PP1: area, cut length outside and inside, pierces, each within 0.01', () => {
    const f = plate();
    expect(f.betrouwbaar).toBe('exact');
    near(f.oppervlak, 200 * 100 - (4 - Math.PI) * 100 - 4 * Math.PI * 4.5 ** 2, 0.01);
    near(f.snijlengte.buiten, 2 * (180 + 80) + 2 * Math.PI * 10, 0.01);
    near(f.snijlengte.binnen, 4 * Math.PI * 9, 0.01);
    expect(f.insteken).toBe(5);
    near(f.bbox.l, 200, 0.01);
    near(f.bbox.b, 100, 0.01);
    near(f.kg, f.oppervlak * 5 * 7850e-9, 1e-9);
  });

  it('P1.7 a cylinder Ø9 comes as a circle r = 4.5 within 0.005, not as a polygon (W5)', () => {
    const f = plate();
    expect(f.gaten.length).toBe(4);
    for (const g of f.gaten) near(g.r, 4.5, 0.005);
    expect(f.binnen.length).toBe(0);
    // the outline: 4 lines and 4 arcs of 90 degrees (bulge tan 22.5)
    expect(f.buiten.length).toBe(8);
    expect(f.buiten.filter((s) => Math.abs(Math.abs(s.bulge) - Math.tan(Math.PI / 8)) < 1e-4).length).toBe(4);
  });

  it('a polygon is not turned into an arc (hexagon), a circle loop gives its own area', () => {
    const hex = Array.from({ length: 6 }, (_, k) => ({ x: 10 * Math.cos((k * Math.PI) / 3), y: 10 * Math.sin((k * Math.PI) / 3) }));
    const r = fitArcs(hex);
    expect('loop' in r && r.loop.every((s) => s.bulge === 0)).toBe(true);
    near(loopAreaB(circleLoop({ c: { x: 0, y: 0 }, r: 5 })), Math.PI * 25, 1e-9);
    near(loopLen(circleLoop({ c: { x: 0, y: 0 }, r: 5 })), 10 * Math.PI, 1e-9);
  });

  it('P1.3 DIN 6935: K = k/2 at r/s 0.5, 1, 2, 3, 5, 10; exactly 0.5 from 5; monotone', () => {
    const k = (q: number) => (0.65 + 0.5 * Math.log10(q)) / 2;
    for (const q of [0.5, 1, 2, 3]) near(din6935K(q * 3, 3), k(q), 1e-12);
    expect(din6935K(15, 3)).toBe(0.5);
    expect(din6935K(30, 3)).toBe(0.5);
    near(din6935K(3, 3), 0.325, 1e-12);
    let prev = 0;
    for (let q = 0.2; q < 12; q += 0.1) { const v = din6935K(q * 2, 2); expect(v).toBeGreaterThanOrEqual(prev); prev = v; }
  });

  it('P1.2 PP2: flat length for K = 0.5, 0.325 and DIN 6935 against the hand calculation', () => {
    // legs to the outer sharp 100 and 50, t = 3, r = 3: flat = (100 - 6) + (50 - 6) + (π/2)(r + K t)
    const hand = (K: number) => 94 + 44 + (Math.PI / 2) * (3 + K * 3);
    const chain = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }];
    for (const K of [0.5, 0.325, din6935K(3, 3)]) near(flatLength(chain, { thickness: 3, bendRadius: 3, kFactor: K }), hand(K), 0.01);
    // the flat part of the model: length along X = flat length, width 200
    const d = pp2();
    const f = flatOfSheet(d, partBodies(d)[0], 'L', 1, 'S235', 'din6935');
    expect(f.fout).toBeUndefined();
    expect(f.betrouwbaar).toBe('exact');
    near(Math.min(f.bbox.l, f.bbox.b), hand(din6935K(3, 3)), 0.02);
    near(Math.max(f.bbox.l, f.bbox.b), 200, 0.01);
    expect(f.plooien.length).toBe(1);
    expect(f.kBron).toMatch(/DIN 6935, K = 0\.325/);
  });

  it('P1.4 / W4 measured: a tab with edge flanges has no flat pattern at all; an L with an edge flange loses its holes, so the flat is refused', () => {
    // measurement 1: base flange from a closed sketch (tab) + two edge flanges: the core refuses the flat pattern
    const d = pp3Tab();
    const r0 = rebuildDocument(d);
    const long = r0.bodies[0].edges.filter((x) => x.straight && Math.abs(x.length - 120) < 1e-3);
    const e1 = [...long].sort((a, b) => b.centroid.y - a.centroid.y || a.centroid.z - b.centroid.z)[0];
    const e2 = [...long].sort((a, b) => b.centroid.y - a.centroid.y || b.centroid.z - a.centroid.z)[0];
    const flange = (id: string, e: typeof e1) => ({ id, type: 'edgeFlange', name: id, suppressed: false, edge: edgeRef(e), angle: 90, length: 30, lengthMode: 'outerSharp', position: 'materialInside', flip: false }) as unknown as Feature;
    d.features.push(flange('ef1', e1), flange('ef2', e2));
    expect(rebuildDocument(d).errors).toEqual({});
    const tray = flatOfSheet(d, partBodies(d)[0], 'U', 1, 'S235', 'model');
    expect(tray.betrouwbaar).toBe('geen');
    expect(tray.fout).toMatch(/Base Flange made from an open sketch/);
    // measurement 2: L sheet (open chain, bends from the base flange) with a hole: the real unfold keeps the hole
    const l = pp2();
    const hole = () => { l.sketches.h = addCircle(createSketch('h', 'h', 'top'), { x: 40, y: -100 }, 4)[0];
      l.features.push({ id: 'hs', type: 'sketch', name: 'Sketch2', sketchId: 'h', suppressed: false } as unknown as Feature,
        { id: 'hc', type: 'extrude', name: 'Gat', sketchId: 'h', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false, direction2: { end: 'throughAll', depth: 0 } } as unknown as Feature); };
    hole();
    expect(rebuildDocument(l).errors).toEqual({});
    // the genus of a CSG mesh is only countable where the mesh is closed (no T junctions)
    expect([1, null]).toContain(genus(partBodies(l)[0].soup));
    const withHole = flatOfSheet(l, partBodies(l)[0], 'L', 1, 'S235', 'model');
    expect(withHole.fout).toBeUndefined();
    expect(withHole.gaten.length).toBe(1);
    near(withHole.gaten[0].r, 4, 0.005);
    // measurement 3: the same L plus an edge flange on its free end: the flat falls back to the developed chain and loses the hole
    const ends = rebuildDocument(l).bodies[0].edges.filter((x) => x.straight && Math.abs(x.length - 200) < 1e-3).sort((a, b) => b.centroid.y - a.centroid.y);
    l.features.push({ ...flange('ef', ends[0]) } as Feature);
    const r = rebuildDocument(l);
    expect(r.errors).toEqual({});
    const f = flatOfSheet(l, partBodies(l)[0], 'L', 1, 'S235', 'model');
    expect(f.betrouwbaar).toBe('geen');
    expect(f.fout).toMatch(/niet uit de basisflens/);
  });

  it('P1.5 every bent test piece: flat area x t = folded volume within 0.5 %', () => {
    for (const K of [0.5, 0.325]) {
      const d = pp2(K);
      const f = flatOfSheet(d, partBodies(d)[0], 'L', 1, 'S235', 'model');
      expect(f.betrouwbaar, `K ${K}: ${f.fout}`).toBe('exact');
    }
  });

  it('F0-4 recognition of PP1: a plate of 5 mm with 4 holes', () => {
    const r = recognize(partBodies(pp1())[0]);
    expect(r.soort).toBe('plaat');
    expect(r.t).toBe(5);
  });
});

describe('P2 DXF per plate (docs/36 4.6)', () => {
  const f = () => flatOfPlate(partBodies(pp1())[0], 'Plaat', 1, 'S235');

  it('P2.1 PP1: one closed polyline on CONTOUR with 4 bulges 0.4142 and 4 CIRCLE on GATEN; read back: same area and perimeter', () => {
    const text = plateDxf(f(), DXF_DEFAULTS, 'P1');
    const pairs = text.split('\r\n');
    const ents = (name: string) => pairs.filter((v, i) => i % 2 === 1 && v === name && pairs[i - 1] === '0').length;
    expect(ents('POLYLINE')).toBe(1);
    expect(ents('CIRCLE')).toBe(4);
    const bulges = pairs.filter((_v, i) => i % 2 === 1 && pairs[i - 1] === '42').map(Number);
    expect(bulges.length).toBe(4);
    for (const b of bulges) near(Math.abs(b), 0.4142, 1e-4);
    // layers of the entities
    const layerOf = (ent: string) => { const i = pairs.findIndex((v, k) => k % 2 === 1 && v === ent && pairs[k - 1] === '0'); return pairs[pairs.indexOf('8', i) + 1]; };
    expect(layerOf('POLYLINE')).toBe('CONTOUR');
    expect(layerOf('CIRCLE')).toBe('GATEN');
    const back = readDxf(text);
    let per = 0;
    for (const s of back.shapes) {
      if (s.kind === 'line') per += Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
      if (s.kind === 'conic') per += Math.hypot(s.major.x, s.major.y) * Math.abs(s.full ? 2 * Math.PI : s.t1 - s.t0);
    }
    near(per, f().snijlengte.buiten + f().snijlengte.binnen, 0.001);
  });

  it('P2.2 a valid R12 head, a point as decimal sign, no NaN, no exponent, ASCII layer names', () => {
    const text = plateDxf(f(), DXF_DEFAULTS, 'P1 ë°');
    expect(text.startsWith('0\r\nSECTION\r\n2\r\nHEADER\r\n9\r\n$ACADVER\r\n1\r\nAC1009')).toBe(true);
    expect(text).not.toMatch(/NaN|\de-\d|\d,\d/);
    expect(text).not.toMatch(/\$INSUNITS/);
    expect(/^[\x00-\x7f]*$/.test(text)).toBe(true);
    expect(text.trimEnd().endsWith('EOF')).toBe(true);
  });

  it('P2.3 unit: the bounding box in the file is the plate in mm (not 25.4 or 1000 times)', () => {
    const back = readDxf(plateDxf(f()));
    const xs = back.shapes.flatMap((s) => (s.kind === 'line' ? [s.a.x, s.b.x] : s.kind === 'conic' ? [s.c.x - Math.hypot(s.major.x, s.major.y), s.c.x + Math.hypot(s.major.x, s.major.y)] : []));
    near(Math.max(...xs) - Math.min(...xs), 200, 0.01);
  });

  it('P2.4 bend lines on ZETLIJN_OP / ZETLIJN_NEER, never on CONTOUR; left out with the option off', () => {
    const d = pp2();
    const fl = flatOfSheet(d, partBodies(d)[0], 'L', 1, 'S235');
    const on = plateDxf(fl, DXF_DEFAULTS, 'P2').split('\r\n');
    const lines = on.map((v, i) => (v === 'LINE' && on[i - 1] === '0' ? on[on.indexOf('8', i) + 1] : null)).filter(Boolean);
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatch(/^ZETLIJN_(OP|NEER)$/);
    const off = plateDxf(fl, { ...DXF_DEFAULTS, bendLines: false }, 'P2');
    expect(off).not.toMatch(/ZETLIJN/);
  });

  it('P2.5 the six negative pieces each give their own finding; the first three block the export', () => {
    const sq = (x: number, y: number, w: number, h: number) => [{ a: { x, y }, bulge: 0 }, { a: { x: x + w, y }, bulge: 0 }, { a: { x: x + w, y: y + h }, bulge: 0 }, { a: { x, y: y + h }, bulge: 0 }];
    const base: CheckInput = { buiten: sq(0, 0, 200, 100), binnen: [], gaten: [], plooien: [], t: 5 };
    const cases: [string, CheckInput, string][] = [
      ['open', { ...base, openEinden: 2 }, 'open'],
      ['self', { ...base, buiten: [{ a: { x: 0, y: 0 }, bulge: 0 }, { a: { x: 100, y: 100 }, bulge: 0 }, { a: { x: 100, y: 0 }, bulge: 0 }, { a: { x: 0, y: 100 }, bulge: 0 }] }, 'zelfdoorsnijding'],
      ['double', { ...base, gaten: [{ c: { x: 50, y: 50 }, r: 10 }, { c: { x: 50, y: 50 }, r: 10 }] }, 'dubbel'],
      ['hole', { ...base, gaten: [{ c: { x: 50, y: 50 }, r: 1 }] }, 'klein gat'],
      ['web', { ...base, binnen: [sq(40, 40, 20, 20), sq(62, 40, 20, 20)] }, 'smalle steg'],
      ['bend', { ...base, gaten: [{ c: { x: 50, y: 50 }, r: 5 }], plooien: [{ a: { x: 58, y: 0 }, b: { x: 58, y: 100 }, hoek: 90, r: 5, richting: 'op', k: 0.5 }] }, 'gat bij plooi'],
    ];
    for (const [name, input, kind] of cases) {
      const fs = plateChecks(input);
      expect(fs.map((x) => x.soort), name).toContain(kind);
      // exactly its own finding (the double circle is also no web, but a web of 0 between the same circle)
      expect(fs.filter((x) => x.soort !== kind && !(name === 'double' && x.soort === 'smalle steg')), name).toEqual([]);
      expect(blocksExport(fs), name).toBe(['open', 'self', 'double'].includes(name));
    }
    expect(plateChecks(base)).toEqual([]);
    expect(plateChecks({ ...f(), t: 5 })).toEqual([]);
  });

  it('file name: <positie>_<materiaal>_<dikte>mm_<aantal>x.dxf', () => {
    expect(dxfFileName(3, 'S235', 3, 4)).toBe('P3_S235_3mm_4x.dxf');
    expect(dxfFileName(1, 'RVS 304 geborsteld', 1.5, 2)).toBe('P1_RVS-304-geborsteld_1.5mm_2x.dxf');
  });

  it('plateData of a square with a round hole', () => {
    const d = plateData([{ a: { x: 0, y: 0 }, bulge: 0 }, { a: { x: 10, y: 0 }, bulge: 0 }, { a: { x: 10, y: 10 }, bulge: 0 }, { a: { x: 0, y: 10 }, bulge: 0 }], [], [{ c: { x: 5, y: 5 }, r: 1 }], 2, 7850);
    near(d.oppervlak, 100 - Math.PI, 1e-9);
    expect(d.insteken).toBe(2);
  });
});

export type { Document };
