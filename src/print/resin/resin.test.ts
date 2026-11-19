import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildDatabase } from '../database';
import { box, calibrationCube, concat, cylinder, sphere } from '../shapes';
import { signedVolume } from '../mesh';
import { poly, UNITS, type Paths } from '../geom/polygons';
import { machineOf, resinSettings, resinsOf, settingsProblems, exposureOf, layerTime, LIMITS } from './profile';
import { GooRle, rasterLayer, toPixel } from './raster';
import { GOO_END, GOO_HEADER_SIZE, GOO_LAYER_DEF_SIZE, writeGoo } from './goo';
import { decodeLayer, decodePreview, decodeRuns, GOO_HEADER_FIELDS, readGoo } from './gooReader';
import { findCups, hollowLayers, disc, insidePoint } from './analyze';
import { gooFile, resinProblems, runResinSlice, type ResinJob } from './slice';
import { RayGrid, planSupports, supportPoints, supportSection } from './supports';
import { resinAutoOrient, resinScore } from './orient';
import { makeItem, worldPositions } from '../plate';
import type { PlateMesh } from '../types';
import type { ResinMachine, ResinSettings } from './types';

const db = buildDatabase(JSON.parse(readFileSync('src/print/printerDatabase.json', 'utf8')), JSON.parse(readFileSync('src/print/materialProfiles.json', 'utf8')));
const resinPrinters = db.printers.filter((p) => p.technology === 'resin');
const S4U = machineOf(db.printers.find((p) => p.id === 'elegoo-saturn-4-ultra')!)!;
const RESIN = db.resins[0];
/** a small LCD for exact pixel tests: 400 x 250 pixels of 0.05 mm */
const SMALL: ResinMachine = { id: 't', name: 'Test LCD', resolution: [400, 250], size: [20, 12.5], height: 40, pitch: [0.05, 0.05], origin: 'center', status: 'released', assumptions: [] };
const rect = (x0: number, y0: number, x1: number, y1: number) => [x0, y0, x1, y0, x1, y1, x0, y1].map((v) => Math.round(v * UNITS));
const mesh = (positions: Float32Array, name = 'part'): PlateMesh => ({ positions, name, filament: 0 });
const settings = (over: Partial<ResinSettings> = {}): ResinSettings => ({ ...resinSettings(RESIN, 0.05), ...over });
const job = (meshes: PlateMesh[], over: Partial<ResinSettings> = {}, machine = S4U): ResinJob => ({
  meshes, printer: db.printers.find((p) => p.id === 'elegoo-saturn-4-ultra')!, machine, settings: settings(over), resin: RESIN, name: 'test', appVersion: 'test',
});

/** a pixel is lit when its centre lies inside the region: the brute-force reference of the scan-line rasterizer */
function bruteForce(region: Paths, m: ResinMachine): Uint8Array {
  const [W, H] = m.resolution, img = new Uint8Array(W * H);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const x = (c + 0.5) * m.pitch[0], y = m.size[1] - (r + 0.5) * m.pitch[1];
    if (poly.contains(region, x * UNITS, y * UNITS)) img[r * W + c] = 255;
  }
  return img;
}

describe('resin: database and profiles', () => {
  it('every resin printer of the database has an LCD with resolution and pixel pitch', () => {
    expect(resinPrinters.length).toBe(21);
    for (const p of resinPrinters) {
      const m = machineOf(p)!;
      expect(m, p.id).not.toBeNull();
      expect(m.pitch[0]).toBeGreaterThan(0.01);
      expect(m.pitch[0]).toBeLessThan(0.06);
      expect(m.pitch[1]).toBeGreaterThan(0.01);
    }
    // Saturn 4 Ultra: 11520 x 5120 on 218.88 x 122.88 mm: 19 x 24 µm
    expect(S4U.pitch[0]).toBeCloseTo(0.019, 6);
    expect(S4U.pitch[1]).toBeCloseTo(0.024, 6);
    expect(machineOf(db.printers.find((p) => p.technology === 'fdm')!)).toBeNull();
  });
  it('the resins come from materialProfiles.json with exposure and price', () => {
    expect(db.resins.length).toBeGreaterThanOrEqual(3);
    for (const r of db.resins) { expect(r.exposure.layerS).toBeGreaterThan(0); expect(r.density).toBeGreaterThan(0.9); }
    expect(resinsOf({})[0].id).toBe('resin-standard');
  });
  it('exposure and lift outside the limits are refused (negative test)', () => {
    expect(settingsProblems(settings(), S4U)).toEqual([]);
    const bad: [keyof ResinSettings, number][] = [['exposure', 0], ['exposure', 61], ['bottomExposure', 400], ['bottomLayers', 0], ['liftDistance', 25], ['liftSpeed', 5],
      ['retractSpeed', 700], ['layerHeight', 0.3], ['lightPwm', 0], ['bottomLiftDistance', 0.5]];
    for (const [k, v] of bad) expect(settingsProblems(settings({ [k]: v } as Partial<ResinSettings>), S4U).length, `${k} = ${v}`).toBe(1);
    expect(() => runResinSlice(job([mesh(calibrationCube(50, 50))], { exposure: 90 }))).toThrow(/Exposure 90 s is outside/);
    expect(LIMITS.exposure[1]).toBe(60);
  });
  it('the exposure steps from the bottom value to the normal value over the transition layers', () => {
    const s = settings({ bottomLayers: 3, transitionLayers: 4, bottomExposure: 30, exposure: 2.5 });
    expect([0, 1, 2].map((i) => exposureOf(s, i))).toEqual([30, 30, 30]);
    const t = [3, 4, 5, 6].map((i) => exposureOf(s, i));
    expect(t[0]).toBeCloseTo(30 - 27.5 / 5, 6);
    for (let i = 1; i < 4; i++) expect(t[i]).toBeLessThan(t[i - 1]);
    expect(exposureOf(s, 7)).toBe(2.5);
    // one normal layer: 2.5 s light, 0.5 s off, 5 mm up at 60 mm/min (5 s), down at 150 mm/min (2 s)
    expect(layerTime(settings({ exposure: 2.5, liftDistance: 5, liftSpeed: 60, retractSpeed: 150, lightOffDelay: 0.5, bottomLayers: 1, transitionLayers: 0 }), 10)).toBeCloseTo(10, 6);
  });
});

describe('resin: rasterizing', () => {
  it('the scan line rasterizer lights exactly the pixels whose centre lies inside (against brute force)', () => {
    const region = poly.union([rect(2.02, 1.03, 8.97, 6.51), [3, 8, 12, 8.6, 9, 11.9].map((v) => Math.round(v * UNITS))], [disc(15, 6, 3.3)]);
    const hole = poly.difference(region, [disc(5, 4, 1.2)]);
    const r = rasterLayer(hole, SMALL);
    const img = decodeLayer(r.data, 400, 250), ref = bruteForce(hole, SMALL);
    let diff = 0;
    for (let i = 0; i < img.length; i++) if (img[i] !== ref[i]) diff++;
    expect(diff).toBe(0);
    expect(r.area).toBeCloseTo((ref.reduce((a, v) => a + (v ? 1 : 0), 0)) * 0.0025, 6);
  });
  it('row 0 is the back edge: a square at the back right lands at the top right of the image', () => {
    const img = decodeLayer(rasterLayer([rect(18, 11.5, 20, 12.5)], SMALL).data, 400, 250);
    expect(img[0 * 400 + 399]).toBe(255);
    expect(img[249 * 400 + 399]).toBe(0);
    expect(img[0]).toBe(0);
    expect(toPixel(SMALL, 0, 12.5)).toEqual([0, 0]);
  });
  it('anti-aliasing: the edge pixels are grey, the area stays within 0.5 % of the polygon', () => {
    const region = [disc(10, 6, 4.013, 96)];
    const exact = poly.area(region) / UNITS / UNITS;
    for (const aa of [1, 2, 4, 8]) {
      const r = rasterLayer(region, SMALL, aa);
      expect(Math.abs(r.area - exact) / exact, `AA ${aa}`).toBeLessThan(0.005);
      const img = decodeLayer(r.data, 400, 250);
      const grey = img.filter((v) => v > 0 && v < 255).length;
      if (aa === 1) expect(grey).toBe(0); else expect(grey).toBeGreaterThan(50);
    }
  });
  it('one 12K layer (Saturn 4 Ultra, 11520 x 5120) is rasterized in under 150 ms, without a full bitmap', () => {
    // a dense layer: 60 cylinders of 8 mm and a 100 x 60 mm plate with 200 holes
    const parts: Paths = [rect(10, 10, 110, 70)];
    for (let i = 0; i < 60; i++) parts.push(disc(120 + (i % 10) * 9, 10 + Math.floor(i / 10) * 18, 4, 64));
    const holes: Paths = [];
    for (let i = 0; i < 200; i++) holes.push(disc(15 + (i % 20) * 4.8, 15 + Math.floor(i / 20) * 5.5, 1.5, 32));
    const region = poly.difference(poly.union(parts), holes);
    const times: number[] = [];
    let r = rasterLayer(region, S4U);
    for (let k = 0; k < 5; k++) { const t0 = performance.now(); r = rasterLayer(region, S4U); times.push(performance.now() - t0); }
    expect(Math.min(...times)).toBeLessThan(150);
    // the encoded layer is small: runs, not 59 million pixels
    expect(r.data.length).toBeLessThan(2_000_000);
    expect(Math.abs(r.area - poly.area(region) / UNITS / UNITS) / (poly.area(region) / UNITS / UNITS)).toBeLessThan(0.005);
  });
});

describe('resin: the .goo file', () => {
  const small = new Uint8Array(116 * 116 * 4).fill(200), big = new Uint8Array(290 * 290 * 4).fill(100);
  const layersOf = (regions: Paths[], aa = 1) => regions.map((g, i) => { const r = rasterLayer(g, SMALL, aa); return { z: (i + 1) * 0.05, data: r.data, area: r.area, exposure: 2 + i }; });
  const stats = { layers: 3, printTime: 123, volume: 45.5, grams: 50.1, cost: 1.5, issues: [], warnings: [], supportPoints: [] };
  const file = (aa: 1 | 2 | 4 | 8 = 1) => {
    const regions = [[rect(1, 1, 19, 11)], poly.difference([rect(2, 2, 18, 10)], [disc(10, 6, 2)]), [disc(6, 6, 3.1), disc(14, 6, 2.2)]];
    const layers = layersOf(regions, aa);
    const s = settings({ antiAliasing: aa, bottomLayers: 1, transitionLayers: 1 });
    return { regions, layers, s, data: writeGoo({ machine: SMALL, settings: s, resin: RESIN, layers, stats, small, big, appVersion: '0.5.16', time: '2026-11-19 12:00:00' }) };
  };

  it('every header field sits at the offset and with the length of the spec; the file is the sum of its parts', () => {
    // offsets of the spec, summed by hand from the field table (Goo Format Spec V1.2)
    const want: Record<string, number> = { version: 0, magic: 4, softwareInfo: 12, softwareVersion: 44, fileTime: 68, printerName: 92, printerType: 124, profileName: 156,
      antiAliasing: 188, greyLevel: 190, blurLevel: 192, smallPreview: 194, delimiter1: 27106, bigPreview: 27108, delimiter2: 195308, totalLayers: 195310,
      xResolution: 195314, yResolution: 195316, xMirror: 195318, yMirror: 195319, xSize: 195320, ySize: 195324, zSize: 195328, layerThickness: 195332, exposure: 195336,
      exposureDelayMode: 195340, turnOffTime: 195341, bottomExposure: 195369, bottomLayers: 195373, bottomLiftDistance: 195377, retract2Speed: 195437,
      bottomLightPwm: 195441, lightPwm: 195443, advanceMode: 195445, printingTime: 195446, totalVolume: 195450, totalWeight: 195454, totalPrice: 195458, priceUnit: 195462,
      layerContentOffset: 195470, grayScaleLevel: 195474, transitionLayers: 195475 };
    expect(GOO_HEADER_FIELDS.reduce((a, f) => a + f[2], 0)).toBe(GOO_HEADER_SIZE);
    const { data, layers } = file();
    const g = readGoo(data);
    for (const [k, v] of Object.entries(want)) expect(g.offsets[k], k).toBe(v);
    // magic tag and delimiters byte for byte
    expect([...data.subarray(4, 12)]).toEqual([0x07, 0x00, 0x00, 0x00, 0x44, 0x4c, 0x50, 0x00]);
    expect([...data.subarray(27106, 27108)]).toEqual([0x0d, 0x0a]);
    expect([...data.subarray(195308, 195310)]).toEqual([0x0d, 0x0a]);
    // big-endian: 400 = 0x0190 at the X resolution
    expect([...data.subarray(195314, 195318)]).toEqual([0x01, 0x90, 0x00, 0xfa]);
    expect(new TextDecoder().decode(data.subarray(0, 4))).toBe('V3.0');
    expect(g.header.layerContentOffset).toBe(GOO_HEADER_SIZE);
    expect(data.length).toBe(GOO_HEADER_SIZE + layers.reduce((a, l) => a + GOO_LAYER_DEF_SIZE + 4 + l.data.length + 2, 0) + GOO_END.length);
    expect(g.endOk).toBe(true);
    expect([...data.subarray(data.length - 11)]).toEqual(GOO_END);
    expect(g.layers.every((l) => l.checksumOk)).toBe(true);
    expect(g.header).toMatchObject({ totalLayers: 3, xResolution: 400, yResolution: 250, printingTime: 123, priceUnit: 'EUR', transitionLayers: 1, bottomLayers: 1, advanceMode: true,
      grayScaleLevel: true, printerName: 'Test LCD', fileTime: '2026-11-19 12:00:00' });
    expect(g.header.layerThickness as number).toBeCloseTo(0.05, 6);
    expect(g.layers[2].def.exposure as number).toBeCloseTo(4, 6);
    expect(g.layers[1].def.z as number).toBeCloseTo(0.1, 6);
  });
  it('round trip: the independent reader decodes the same layers, pixel for pixel (with and without anti-aliasing)', () => {
    for (const aa of [1, 4] as const) {
      const { data, regions } = file(aa);
      const g = readGoo(data);
      g.layers.forEach((l, i) => {
        const img = decodeLayer(l.data, 400, 250);
        if (aa === 1) {
          const ref = bruteForce(regions[i], SMALL);
          let diff = 0;
          for (let k = 0; k < img.length; k++) if (img[k] !== ref[k]) diff++;
          expect(diff, `layer ${i}`).toBe(0);
        } else {
          // the reader against a pixel image of its own: encode the decoded image again, byte for byte the same data
          const rle = new GooRle();
          for (const v of img) rle.push(v, 1);
          expect([...rle.finish()]).toEqual([...l.data]);
        }
      });
    }
  });
  it('the reader follows the examples of the spec, diff chunks included, and refuses a broken checksum', () => {
    const runs: [number, number][] = [];
    // 0x05: 5 x 0x00; 0x41 0x80: 1 x 0x80; 0x81: +1 once; 0x92 0x03: +2 three times; 0xA1: -1 once; 0xC2: 2 x 0xff
    const data = Uint8Array.from([0x55, 0x05, 0x41, 0x80, 0x81, 0x92, 0x03, 0xa1, 0xc2, 0]);
    decodeRuns(data, 13, (v, _s, n) => runs.push([v, n]));
    expect(runs).toEqual([[0, 5], [0x80, 1], [0x81, 1], [0x83, 3], [0x82, 1], [0xff, 2]]);
    // the long runs of the spec: 0x3F 55 56 57 is 0x555657f zeros
    const long: number[] = [];
    decodeRuns(Uint8Array.from([0x55, 0x3f, 0x55, 0x56, 0x57, 0]), 0x555657f, (_v, _s, n) => long.push(n));
    expect(long).toEqual([0x555657f]);
    const { data: file1 } = file();
    const broken = file1.slice();
    broken[GOO_HEADER_SIZE + GOO_LAYER_DEF_SIZE + 4 + 3] ^= 0x01;
    expect(readGoo(broken).layers[0].checksumOk).toBe(false);
    expect(() => readGoo(file1.slice(0, 1000))).toThrow();
  });
  it('the preview decodes a reduced image (brightest pixel per block)', () => {
    const { data } = file();
    const l = readGoo(data).layers[0];
    const p = decodePreview(l.data, 400, 250, 4);
    expect([p.w, p.h]).toEqual([100, 63]);
    expect(p.img[30 * 100 + 50]).toBe(255);
    expect(p.img[0]).toBe(0);
  });
});

describe('resin: slicing parts', () => {
  const vol = (pos: Float32Array) => Math.abs(signedVolume(pos));
  const sliced = (pos: Float32Array, over: Partial<ResinSettings> = {}) => runResinSlice(job([mesh(pos)], { supports: 'none', ...over }));

  it('pixel volume against the mesh volume: T1 cube and T2 cylinder within 0.5 %, T3 sphere within 1.5 %', () => {
    const cases: [string, Float32Array, number][] = [
      ['T1', calibrationCube(90, 50), 0.005], ['T2', cylinder(100, 60, 0, 10, 20, 192), 0.005], ['T3', sphere(100, 60, 10, 10, 96), 0.015],
    ];
    for (const [name, pos, tol] of cases) {
      const out = sliced(pos);
      const v = vol(pos);
      expect(Math.abs(out.stats.volume - v) / v, name).toBeLessThan(tol);
      expect(out.stats.layers, name).toBe(400);
    }
  });
  it('print time, resin in ml, grams and cost follow from the layers', () => {
    const out = sliced(calibrationCube(90, 50));
    const s = settings({ supports: 'none' });
    let t = 0;
    for (let i = 0; i < 400; i++) t += layerTime(s, i);
    expect(out.stats.printTime).toBe(Math.round(t));
    expect(out.stats.grams).toBeCloseTo((out.stats.volume / 1000) * RESIN.density, 6);
    expect(out.stats.cost).toBeCloseTo((out.stats.grams / 1000) * RESIN.pricePerKg, 6);
    expect(out.layers[0].exposure).toBe(s.bottomExposure);
    expect(out.layers[399].exposure).toBe(s.exposure);
    const f = gooFile(out, job([mesh(calibrationCube(90, 50))]), '2026-11-19 12:00:00');
    expect(f.name).toBe('test.goo');
    expect(readGoo(f.data).layers.length).toBe(400);
  });
  it('islands are found on a test part: a block floating over a pillar, with nothing under one end', () => {
    // a pillar 0..10 and a bridge 10..12 that reaches out; a separate cube floating at 6..8 next to it
    const part = concat(box(50, 50, 0, 54, 54, 10), box(50, 50, 10, 70, 54, 12), box(60, 60, 6, 64, 64, 8));
    const out = sliced(part);
    const islands = out.stats.issues.filter((i) => i.kind === 'island');
    expect(islands.length).toBe(1);
    expect(islands[0].z).toBeCloseTo(6, 6);
    expect(islands[0].x).toBeCloseTo(62, 1);
    expect(islands[0].area).toBeCloseTo(16, 0);
    expect(out.stats.warnings.join(' ')).toMatch(/1 island/);
    // with supports the floating cube rests on struts: no island left
    const sup = runResinSlice(job([mesh(part)], { supports: 'normal' }));
    expect(sup.stats.issues.filter((i) => i.kind === 'island')).toEqual([]);
    expect(sup.stats.supportPoints.length).toBeGreaterThan(10);
  });
  it('a cup open towards the film is a suction cup; a closed hollow is a cavity; a drain hole opens it', () => {
    const z = (i: number) => i * 0.05;
    const ring = poly.difference([rect(0, 0, 10, 10)], [rect(3, 3, 7, 7)]);
    // on the plate: floor, then walls; the space is closed towards the plate, open upwards
    const cup = [[rect(0, 0, 10, 10)], ring, ring, ring];
    expect(findCups(cup, z).map((c) => c.kind)).toEqual(['suction']);
    expect(findCups([...cup, [rect(0, 0, 10, 10)]], z).map((c) => c.kind)).toEqual(['cavity']);
    // a tube open at both ends: nothing
    expect(findCups([[rect(20, 20, 21, 21)], ring, ring], z)).toEqual([]);
    // hollowed cube with no drain: one cavity; with a drain hole through the bottom: none
    const cube = calibrationCube(90, 50);
    const hollow = sliced(cube, { hollow: true, wallThickness: 2 });
    expect(hollow.stats.issues.filter((i) => i.kind === 'cavity').length).toBe(1);
    expect(hollow.stats.volume).toBeLessThan(vol(cube) * 0.5);
    const drained = runResinSlice(job([mesh(cube)], { supports: 'normal', hollow: true, wallThickness: 2, drainHoles: [{ x: 100, y: 60, r: 1.5 }] }));
    expect(drained.stats.issues.filter((i) => i.kind === 'cavity')).toEqual([]);
  });
  it('hollowing keeps a wall of the set thickness at the sides, the top and the bottom', () => {
    const layers = Array.from({ length: 200 }, () => [rect(0, 0, 20, 20)]);
    const h = hollowLayers(layers, 2, 0.05);
    const a = (i: number) => poly.area(h[i]) / UNITS / UNITS;
    expect(a(0)).toBeCloseTo(400, 3);
    expect(a(39)).toBeCloseTo(400, 3);
    expect(a(41)).toBeCloseTo(400 - 256, 0);
    expect(a(100)).toBeCloseTo(400 - 256, 0);
    expect(a(199)).toBeCloseTo(400, 3);
  });
  it('supports: points under flat overhangs, none under steep faces; struts stand on the raft or on the part', () => {
    const s = settings({ supports: 'normal', supportSpacing: 3 });
    const lifted = box(10, 10, 5, 22, 22, 15);
    const grid = new RayGrid(lifted);
    const pts = supportPoints(lifted, s, [], grid);
    expect(pts.length).toBe(16);
    expect(pts.every((p) => Math.abs(p[2] - 5) < 1e-6)).toBe(true);
    const plan = planSupports(pts, s, grid);
    expect(plan.struts.every((st) => !st.onModel && st.zBase === 1)).toBe(true);
    expect(plan.raft.length).toBe(1);
    // the section: a tip near the top, a full strut in the middle, the raft at the bottom
    const mid = supportSection(plan, 3, s);
    expect(mid.length).toBe(16);
    expect(Math.abs(poly.area(mid)) / UNITS / UNITS / 16).toBeCloseTo(Math.PI * 0.25, 1);
    expect(supportSection(plan, 0.5, s)).toEqual(plan.raft);
    // removed by hand and added by hand
    const fewer = supportPoints(lifted, { ...s, removedPoints: [[11.5, 11.5]], addedPoints: [[16, 16, 5]] }, [], grid);
    expect(fewer.length).toBe(16);
    expect(fewer.some((p) => p[0] === 16 && p[1] === 16)).toBe(true);
    // a part that hangs over itself: the strut stands on the part below
    const ledge = concat(box(10, 10, 0, 30, 30, 2), box(10, 10, 2, 12, 30, 10), box(10, 10, 10, 30, 30, 12));
    const g2 = new RayGrid(ledge);
    const p2 = supportPoints(ledge, s, [], g2).filter((p) => Math.abs(p[2] - 10) < 1e-6);
    const on = planSupports(p2, s, g2).struts;
    expect(on.length).toBeGreaterThan(0);
    expect(on.every((st) => st.onModel && Math.abs(st.zBase - 2) < 1e-6)).toBe(true);
  });
  it('tree supports join neighbouring struts into one trunk', () => {
    const s = settings({ supports: 'tree', supportSpacing: 3 });
    const lifted = box(10, 10, 15, 22, 22, 20);
    const grid = new RayGrid(lifted);
    const plan = planSupports(supportPoints(lifted, s, [], grid), s, grid);
    expect(plan.trunks.length).toBeGreaterThan(0);
    expect(plan.trunks.length).toBeLessThan(plan.struts.length);
    const lo = supportSection(plan, 5, s).length, hi = supportSection(plan, 14, s).length;
    expect(lo).toBeLessThan(hi);
  });
  it('resin auto orient tilts a flat plate off the LCD', () => {
    const it0 = makeItem('plate', box(0, 0, 0, 40, 2, 40), 100, 60);
    const before = resinScore(worldPositions(it0));
    expect(before.flat).toBeGreaterThan(1500);
    const after = resinScore(worldPositions(resinAutoOrient(it0)));
    expect(after.flat).toBeLessThan(1);
    expect(after.score).toBeLessThan(before.score);
  });
  it('a part outside the LCD or too tall is refused; the problems name the printer', () => {
    expect(resinProblems(job([mesh(calibrationCube(210, 50))]))[0]).toMatch(/outside the LCD of the Elegoo Saturn 4 Ultra/);
    expect(resinProblems(job([mesh(box(50, 50, 0, 60, 60, 218))]))[0]).toMatch(/prints up to 220 mm/);
    expect(resinProblems(job([]))[0]).toMatch(/empty/);
  });
});

describe('resin: memory', () => {
  it('3000 layers of a 12K printer stay far below 1 GB (the layers are kept run-length encoded)', () => {
    const before = process.memoryUsage().heapUsed;
    const out = runResinSlice(job([mesh(concat(box(20, 20, 0, 25, 25, 150), cylinder(150, 60, 0, 15, 150, 96)))], { supports: 'none' }));
    expect(out.stats.layers).toBe(3000);
    const encoded = out.layers.reduce((a, l) => a + l.data.length, 0);
    expect(encoded).toBeLessThan(200_000_000);
    expect(process.memoryUsage().heapUsed - before).toBeLessThan(1_000_000_000);
  }, 120_000);
});

describe('resin: support point of an island', () => {
  it('a crescent gets its point on material, not in the empty middle of its box', () => {
    const c: number[] = [];
    for (let i = 0; i <= 32; i++) { const a = Math.PI * (i / 32); c.push(Math.round(10 * Math.cos(a) * UNITS), Math.round(10 * Math.sin(a) * UNITS)); }
    for (let i = 32; i >= 0; i--) { const a = Math.PI * (i / 32); c.push(Math.round(8 * Math.cos(a) * UNITS), Math.round(8 * Math.sin(a) * UNITS)); }
    const [x, y] = insidePoint(c);
    expect(poly.contains([c], x * UNITS, y * UNITS)).toBe(true);
  });
});
