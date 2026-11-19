// docs/37 ch. 11: the general unfolder against hand calculations (N-9 own flange radius, N-11 failed features,
// hems and jogs), each failing on the code of dd2ab32.
import { describe, expect, it } from 'vitest';
import { rebuildDocument, setRebuildBudget } from '../core/features/rebuild';
import { edgeRef } from '../core/features/edgesets';
import { addLine, createSketch } from '../core/sketch/model';
import { createDocument, type Document, type Feature } from '../core/document/types';
import { partBodies } from './bodies';
import { flatOfSheet } from './flat';
import { pp3Tab } from './fixtures';

setRebuildBudget(Infinity);
const F = (f: Record<string, unknown>) => f as unknown as Feature;
const BA = (deg: number, r: number, k: number, t: number) => ((deg * Math.PI) / 180) * (r + k * t);
const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);

/** tab 120 x 80, one edge flange of 30 (outer sharp) on a 120 edge */
export function tabWithFlange(t: number, r: number, extra: Record<string, unknown> = {}): Document {
  const d = pp3Tab();
  d.sheetMetal = { thickness: t, bendRadius: r, kFactor: 0.5 } as never;
  const long = rebuildDocument(d).bodies[0].edges.filter((x) => x.straight && Math.abs(x.length - 120) < 1e-3);
  const e = [...long].sort((a, b) => b.centroid.y - a.centroid.y || a.centroid.z - b.centroid.z)[0];
  d.features.push(F({ id: 'ef1', type: 'edgeFlange', name: 'ef1', suppressed: false, edge: edgeRef(e), angle: 90, length: 30, lengthMode: 'outerSharp', position: 'materialInside', flip: false, ...extra }));
  return d;
}
const flat = (d: Document) => flatOfSheet(d, partBodies(d)[0], 'x', 1, 'S235', 'model');
const long = (f: { bbox: { l: number; b: number } }) => Math.max(f.bbox.l, f.bbox.b);
/** the side across the bend: the one that is not the 120 of the tab */
const across = (f: { bbox: { l: number; b: number } }) => (Math.abs(f.bbox.l - 120) < 0.01 ? f.bbox.b : f.bbox.l);

describe('N-9 an edge flange with its own radius: the radius is measured on the facets of the bend', () => {
  it('tab 400 x 600 (t 2, default r 2), flange radius 6: 624.996 by hand, exact, bend 90 degrees with r 6', () => {
    const d = createDocument('Groot');
    d.material = { name: 'S235', density: 7850, color: '#888' } as never;
    d.sheetMetal = { thickness: 2, bendRadius: 2, kFactor: 0.5 } as never;
    let s = createSketch('s1', 's1', 'top');
    const c = [{ x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 600 }, { x: 0, y: 600 }];
    for (let i = 0; i < 4; i++) s = addLine(s, c[i], c[(i + 1) % 4])[0];
    d.sketches.s1 = s;
    d.features.push(F({ id: 'tb', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 0, midPlane: false, reverse: false }));
    const e = rebuildDocument(d).bodies[0].edges.filter((x) => x.straight && Math.abs(x.length - 400) < 1e-3).sort((a, b) => b.centroid.y - a.centroid.y || a.centroid.z - b.centroid.z)[0];
    d.features.push(F({ id: 'ef1', type: 'edgeFlange', name: 'ef1', suppressed: false, edge: edgeRef(e), angle: 90, length: 30, lengthMode: 'outerSharp', position: 'materialInside', flip: false, radius: 6 }));
    const f = flat(d);
    expect(f.fout).toBeUndefined();
    expect(f.betrouwbaar).toBe('exact');
    near(long(f), 600 - 8 + BA(90, 6, 0.5, 2) + 30 - 8, 0.05);
    expect(f.plooien.length).toBe(1);
    near(f.plooien[0].hoek, 90, 0.2);
    near(f.plooien[0].r, 6, 0.1);
  });
  it('tab with flange radius 5 and 0.5 (default 2): by hand, exact', () => {
    for (const [r, hand] of [[5, 80 - 7 + BA(90, 5, 0.5, 2) + 30 - 7], [0.5, 80 - 2.5 + BA(90, 0.5, 0.5, 2) + 30 - 2.5]]) {
      const f = flat(tabWithFlange(2, 2, { radius: r }));
      expect(f.fout, `r ${r}`).toBeUndefined();
      near(across(f), hand, 0.05);
      near(f.plooien[0].r, r, 0.1);
    }
  });
  it('the default radius still unfolds as before (t 2, r 2: 106.712 by hand)', () => {
    const f = flat(tabWithFlange(2, 2));
    near(across(f), 80 - 4 + BA(90, 2, 0.5, 2) + 30 - 4, 0.05);
  });
});

describe('N-11 a failed feature gives no flat', () => {
  it('a tab with an edge flange that does not build: rebuild error, no exact flat, the reason said', async () => {
    const d = pp3Tab();
    d.features.push(F({ id: 'bad', type: 'edgeFlange', name: 'Edge-Flange-kapot', suppressed: false, edge: { body: 'nope', a: [0, 0, 0], b: [1, 0, 0] }, angle: 90, length: 30,
      lengthMode: 'outerSharp', position: 'materialInside', flip: false }));
    expect(Object.keys(rebuildDocument(d).errors).length).toBeGreaterThan(0);
    const f = flat(d);
    expect(f.betrouwbaar).toBe('geen');
    expect(f.fout).toMatch(/geen uitslag: herbouw met fouten/);
    const { analyze } = await import('./analyze');
    const { defaultSettings } = await import('./settings');
    expect(analyze(d, defaultSettings()).flats.every((x) => x.betrouwbaar === 'geen')).toBe(true);
  });
});

describe('N-10 holes come as circles, with and without an edge flange', () => {
  const lWithHole = async (rr: number, flange: boolean) => {
    const { pp2 } = await import('./fixtures');
    const { addCircle } = await import('../core/sketch/model');
    const l = pp2();
    l.sketches.h = addCircle(createSketch('h', 'h', 'top'), { x: 40, y: -100 }, rr)[0];
    l.features.push(F({ id: 'hs', type: 'sketch', name: 'Sketch2', sketchId: 'h', suppressed: false }),
      F({ id: 'hc', type: 'extrude', name: 'Gat', sketchId: 'h', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false, direction2: { end: 'throughAll', depth: 0 } }));
    if (flange) {
      const ends = rebuildDocument(l).bodies[0].edges.filter((x) => x.straight && Math.abs(x.length - 200) < 1e-3).sort((a, b) => b.centroid.y - a.centroid.y);
      l.features.push(F({ id: 'ef', type: 'edgeFlange', name: 'ef', suppressed: false, edge: edgeRef(ends[0]), angle: 90, length: 30, lengthMode: 'outerSharp', position: 'materialInside', flip: false }));
    }
    return l;
  };
  for (const flange of [false, true]) for (const rr of [4, 4.5, 10]) {
    it(`L ${flange ? 'with' : 'without'} edge flange, hole diameter ${2 * rr}: one CIRCLE of that radius in the flat and the DXF`, async () => {
      const f = flat(await lWithHole(rr, flange));
      expect(f.fout).toBeUndefined();
      expect([f.gaten.length, f.binnen.length]).toEqual([1, 0]);
      near(f.gaten[0].r, rr, 0.02);
      const { plateDxf } = await import('./dxf');
      const dxf = plateDxf(f);
      expect(dxf.split('\n').filter((x) => x.trim() === 'CIRCLE').length).toBe(1);
    });
  }
});

describe('short welds: shown as "korte las, niet dragend", unticked, counted only when ticked (EN 1993-1-8, 4.5.1)', () => {
  const box = (key: string, lo: number[], hi: number[]) => {
    const [x0, y0, z0] = lo, [x1, y1, z1] = hi;
    const P = (x: number, y: number, z: number) => [x, y, z];
    const q = (a: number[], b: number[], c: number[], d: number[]) => [...a, ...b, ...c, ...a, ...c, ...d];
    const s = [
      ...q(P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), P(x1, y0, z0)), ...q(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)),
      ...q(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)), ...q(P(x0, y1, z0), P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0)),
      ...q(P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0)), ...q(P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)),
    ];
    return { key, naam: key, part: 'p', path: [], soup: Float64Array.from(s), faces: [], hash: key, materiaal: 'S235', dichtheid: 7850, exact: false } as never;
  };
  const recs = (t: number) => ['A', 'B'].map((key) => ({ key, soort: 'plaat', t, naam: key })) as never[];
  it('an edge contact of 20 mm is a short weld, unticked, not active; 60 mm is a normal two-sided seam', async () => {
    const { proposeJoints, activeJoints } = await import('./weld');
    const short = proposeJoints([box('A', [0, 0, 0], [100, 20, 20]), box('B', [0, 20, 20], [20, 40, 40])], recs(3));
    expect(short.map((j) => [j.kort, j.meetellen, j.lengte])).toEqual([[true, false, 20]]);
    expect(activeJoints(short)).toEqual([]);
    expect(activeJoints(short.map((j) => ({ ...j, meetellen: true }))).length).toBe(1);
    const long = proposeJoints([box('A', [0, 0, 0], [100, 20, 20]), box('B', [0, 20, 20], [60, 40, 40])], recs(3));
    expect(long.map((j) => [j.kort, j.tweezijdig, j.lengte])).toEqual([[undefined, true, 60]]);
  });
  it('6 a counts in code: walls of 10 give a = 7, so 40 mm (< 42) is short, 50 mm is not', async () => {
    const { proposeJoints } = await import('./weld');
    expect(proposeJoints([box('A', [0, 0, 0], [100, 20, 20]), box('B', [0, 20, 20], [40, 40, 40])], recs(10))[0].kort).toBe(true);
    expect(proposeJoints([box('A', [0, 0, 0], [100, 20, 20]), box('B', [0, 20, 20], [50, 40, 40])], recs(10))[0].kort).toBeUndefined();
  });
  it('N-12 stitches of 50 every 200 mm centre to centre are written with the gap: 6 x 50 (150)', async () => {
    const { proposeJoints, weldText } = await import('./weld');
    const j = proposeJoints([box('A', [0, 0, 0], [1120, 40, 40]), box('B', [0, 40, 40], [1120, 400, 43])], recs(3))[0];
    expect(j.onderbroken).toEqual({ n: 6, l: 50, e: 150 });
    expect(weldText(j)).toMatch(/6 x 50 \(150\)/);
  });
  it('an unticked short weld is not costed, ticked it is', async () => {
    const { costModel } = await import('./cost');
    const { proposeJoints } = await import('./weld');
    const { defaultSettings } = await import('./settings');
    const j = proposeJoints([box('A', [0, 0, 0], [100, 20, 20]), box('B', [0, 20, 20], [20, 40, 40])], recs(3));
    const cost = (joints: typeof j) => costModel({ recs: [], saw: [], plans: [], flats: [], joints, settings: defaultSettings() } as never).regels.filter((l) => /las|hecht/i.test(l.id)).length;
    expect(cost(j)).toBe(0);
    expect(cost(j.map((x) => ({ ...x, meetellen: true })))).toBeGreaterThan(0);
  });
});

describe('hems and jogs (docs/37 ch. 11, point 6)', () => {
  const hem = (hemType: string) => {
    const d = pp3Tab();
    const e = rebuildDocument(d).bodies[0].edges.filter((x) => x.straight && Math.abs(x.length - 120) < 1e-3).sort((a, b) => b.centroid.y - a.centroid.y || a.centroid.z - b.centroid.z)[0];
    d.features.push(F({ id: 'hm', type: 'hem', name: 'Hem1', suppressed: false, edge: edgeRef(e), hemType, length: 10, gap: 1, position: 'materialInside', flip: false, angle: 225, radius: 2 }));
    return d;
  };
  it('open hem (length 10, gap 1, t 2): inner radius gap / 2 = 0.5 measured; 80 + pi (r + K t) + (10 - (r + t)) by hand, exact', () => {
    const f = flat(hem('open'));
    expect(f.fout).toBeUndefined();
    expect(f.betrouwbaar).toBe('exact');
    // the hem of the core does not shorten the tab: the flat is the full 80 + the bend + the leg (measured 92.199)
    near(across(f), 80 + Math.PI * (0.5 + 0.5 * 2) + (10 - (0.5 + 2)), 0.05);
    expect(f.plooien.map((p) => [Math.round(p.hoek), p.r])).toEqual([[180, 0.5]]);
  });
  it('closed, teardrop and rolled hems and a jog are refused with the reason, never an exact flat', () => {
    for (const t of ['closed', 'teardrop', 'rolled']) {
      const f = flat(hem(t));
      expect(f.betrouwbaar, t).toBe('geen');
      expect(f.fout, t).toMatch(/ontvouwen: /);
    }
    const d = pp3Tab();
    d.sketches.j = addLine(createSketch('j', 'j', 'top'), { x: 0, y: 40 }, { x: 120, y: 40 })[0];
    d.features.push(F({ id: 'js', type: 'sketch', name: 'Sketch2', sketchId: 'j', suppressed: false }), F({ id: 'jg', type: 'jog', name: 'Jog1', sketchId: 'j', suppressed: false, offset: 10,
      flipSide: false, reverse: false }));
    const j = flat(d);
    expect(j.betrouwbaar).toBe('geen');
  });
});
