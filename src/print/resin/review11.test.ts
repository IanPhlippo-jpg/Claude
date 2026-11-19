// docs/35 chapter 11 (Fable's review of phase 4): a negative test per finding R-1 to R-6; each fails on commit ee4565a
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildDatabase } from '../database';
import { box, calibrationCube, resinTestPiece } from '../shapes';
import { flipped, signedVolume } from '../mesh';
import { poly, UNITS, type Paths } from '../geom/polygons';
import { machineOf, resinAssumptions, resinSettings, settingsProblems } from './profile';
import { GooRle, rasterLayer } from './raster';
import { writeGoo } from './goo';
import { decodeLayer, readGoo } from './gooReader';
import { disc } from './analyze';
import { resinProblems, runResinSlice, type ResinJob } from './slice';
import type { PlateMesh } from '../types';
import type { ResinMachine, ResinSettings } from './types';

const db = buildDatabase(JSON.parse(readFileSync('src/print/printerDatabase.json', 'utf8')), JSON.parse(readFileSync('src/print/materialProfiles.json', 'utf8')));
const S4U = machineOf(db.printers.find((p) => p.id === 'elegoo-saturn-4-ultra')!)!;
const RESIN = db.resins[0];
const SMALL: ResinMachine = { id: 't', name: 'Test LCD', resolution: [400, 250], size: [20, 12.5], height: 40, pitch: [0.05, 0.05], origin: 'center', mirror: [false, false], status: 'released', assumptions: [] };
const mesh = (positions: Float32Array, name = 'part'): PlateMesh => ({ positions, name, filament: 0 });
const settings = (over: Partial<ResinSettings> = {}): ResinSettings => ({ ...resinSettings(RESIN, 0.05), ...over });
const job = (meshes: PlateMesh[], over: Partial<ResinSettings> = {}, machine = S4U): ResinJob => ({
  meshes, printer: db.printers.find((p) => p.id === 'elegoo-saturn-4-ultra')!, machine, settings: settings(over), resin: RESIN, name: 'test', appVersion: 'test',
});
const rect = (x0: number, y0: number, x1: number, y1: number) => [x0, y0, x1, y0, x1, y1, x0, y1].map((v) => Math.round(v * UNITS));

describe('R-1: a mesh turned inside out', () => {
  it('is turned outwards with a warning, and gives the volume of the cube', () => {
    const cube = flipped(calibrationCube(90, 50));
    expect(signedVolume(cube)).toBeLessThan(0);
    const out = runResinSlice(job([mesh(cube, 'Inside out')], { supports: 'none' }));
    expect(Math.abs(out.stats.volume - 8000) / 8000).toBeLessThan(0.005);
    expect(out.stats.warnings.join(' ')).toMatch(/Inside out: the faces pointed inwards/);
  });
  it('a slice without one lit pixel is refused', () => {
    // a single flat triangle: no volume, no layer
    const flat = Float32Array.from([90, 50, 5, 100, 50, 5, 90, 60, 5]);
    expect(() => runResinSlice(job([mesh(flat, 'Flat')], { supports: 'none' }))).toThrow(/no exposed pixel/);
  });
});

describe('R-2: mirroring per printer, and the asymmetric test piece', () => {
  it('every resin printer has a mirror field marked as an assumption', () => {
    for (const p of db.printers.filter((x) => x.technology === 'resin')) {
      const r = p.resin as { mirror?: { x: boolean; y: boolean } };
      expect(r.mirror, p.id).toEqual({ x: false, y: false });
      expect(p.assumptions?.some((a) => String(a).startsWith('mirror:') && /AANNAME/.test(String(a))), p.id).toBe(true);
    }
  });
  it('X and Y mirroring move the pixels and set the flags of the file', () => {
    const region = [rect(1, 1, 3, 2)];
    const plain = decodeLayer(rasterLayer(region, SMALL).data, 400, 250);
    for (const mirror of [[true, false], [false, true], [true, true]] as [boolean, boolean][]) {
      const m = { ...SMALL, mirror };
      const img = decodeLayer(rasterLayer(region, m).data, 400, 250);
      let diff = 0;
      for (let r = 0; r < 250; r++) for (let c = 0; c < 400; c++) {
        const rr = mirror[1] ? 249 - r : r, cc = mirror[0] ? 399 - c : c;
        if (img[rr * 400 + cc] !== plain[r * 400 + c]) diff++;
      }
      expect(diff, mirror.join()).toBe(0);
      const layers = [{ z: 0.05, data: rasterLayer(region, m).data, area: 2, exposure: 2 }];
      const g = readGoo(writeGoo({ machine: m, settings: settings(), resin: RESIN, layers, stats: { layers: 1, printTime: 1, volume: 1, grams: 1, cost: 1, issues: [], warnings: [],
        supportPoints: [] }, small: new Uint8Array(116 * 116 * 4), big: new Uint8Array(290 * 290 * 4), appVersion: 't', time: 't' }));
      expect([g.header.xMirror, g.header.yMirror]).toEqual(mirror);
    }
  });
  it('the test piece is asymmetric: its mirror image does not cover it', () => {
    const out = runResinSlice(job([mesh(resinTestPiece(90, 50), 'Test piece')], { supports: 'none' }));
    const img = decodeLayer(out.layers[10].data, S4U.resolution[0], S4U.resolution[1]);
    const W = S4U.resolution[0], H = S4U.resolution[1];
    let lit = 0, both = 0;
    // mirrored about the middle of the piece in X: the L turns the other way
    const c0 = Math.round(90 / S4U.pitch[0]), c1 = Math.round(130 / S4U.pitch[0]);
    for (let r = 0; r < H; r++) for (let c = c0; c < c1; c++) {
      if (!img[r * W + c]) continue;
      lit++;
      if (img[r * W + (c0 + c1 - 1 - c)]) both++;
    }
    expect(lit).toBeGreaterThan(1000);
    expect(both / lit).toBeLessThan(0.8);
  });
});

describe('R-3: anti-aliasing of a busy 12K layer within 150 ms, the grey values the covered share of each pixel', () => {
  /** the reference: 64 sub-rows per pixel row, the exact horizontal coverage added pixel by pixel (as ee4565a with aa 64) */
  function reference(region: Paths, m: ResinMachine, aa: number): Uint8Array {
    const [W, H] = m.resolution, img = new Uint8Array(W * H), cov = new Float32Array(W);
    const edges: { y0: number; y1: number; x0: number; dxdy: number; w: number }[] = [];
    for (const p of region) for (let i = 0; i < p.length; i += 2) {
      const j = (i + 2) % p.length;
      const ax = p[i] / UNITS / m.pitch[0], ay = (m.size[1] - p[i + 1] / UNITS) / m.pitch[1], bx = p[j] / UNITS / m.pitch[0], by = (m.size[1] - p[j + 1] / UNITS) / m.pitch[1];
      if (ay === by) continue;
      const up = by > ay;
      const [y0, y1, x0, x1] = up ? [ay, by, ax, bx] : [by, ay, bx, ax];
      edges.push({ y0, y1, x0, dxdy: (x1 - x0) / (y1 - y0), w: up ? -1 : 1 });
    }
    for (let r = 0; r < H; r++) {
      for (let sub = 0; sub < aa; sub++) {
        const y = r + (sub + 0.5) / aa;
        const xs = edges.filter((e) => e.y0 <= y && e.y1 > y).map((e) => ({ x: e.x0 + (y - e.y0) * e.dxdy, w: e.w })).sort((a, b) => a.x - b.x);
        let wind = 0, start = 0;
        for (const x of xs) {
          const before = wind;
          wind += x.w;
          if (before === 0 && wind !== 0) start = x.x;
          if (before !== 0 && wind === 0) {
            const xa = Math.max(0, start), xb = Math.min(W, x.x);
            for (let i = Math.floor(xa); i < Math.min(W, Math.ceil(xb)); i++) cov[i] += Math.min(i + 1, xb) - Math.max(i, xa);
          }
        }
      }
      for (let i = 0; i < W; i++) { const g = Math.round(cov[i] * (255 / aa)); img[r * W + i] = Math.max(0, Math.min(255, g)); cov[i] = 0; }
    }
    return img;
  }
  it('small LCD: the exact share against 64 sub-rows (within 4 of 255); AA n gives the n x n levels', () => {
    const region = poly.difference(poly.union([rect(2.02, 1.03, 8.97, 6.51), disc(15, 6, 3.3, 64), [3, 8, 12, 8.6, 9, 11.9].map((v) => Math.round(v * UNITS))]),
      [disc(5, 4, 1.2, 48)]);
    const exact = decodeLayer(rasterLayer(region, SMALL, 2, 255).data, 400, 250), ref = reference(region, SMALL, 64);
    let worst = 0;
    for (let i = 0; i < exact.length; i++) worst = Math.max(worst, Math.abs(exact[i] - ref[i]));
    expect(worst).toBeLessThanOrEqual(4);
    for (const aa of [2, 4, 8]) {
      const q = aa * aa, allowed = new Set(Array.from({ length: q + 1 }, (_, k) => Math.round((k * 255) / q)));
      const img = decodeLayer(rasterLayer(region, SMALL, aa).data, 400, 250);
      expect(img.every((v) => allowed.has(v)), `AA ${aa}`).toBe(true);
      let off = 0;
      for (let i = 0; i < img.length; i++) if (Math.abs(img[i] - exact[i]) > 255 / q / 2 + 1) off++;
      expect(off, `AA ${aa}`).toBe(0);
    }
    // the encoder is the one of the file: the same bytes again from the decoded pixels
    const data = rasterLayer(region, SMALL, 4).data, rle = new GooRle();
    for (const v of decodeLayer(data, 400, 250)) rle.push(v, 1);
    expect([...rle.finish()]).toEqual([...data]);
  });
  // a timing beside 180 other test files can lose the CPU: three tries, the best of seven in each
  it('Saturn 4 Ultra, 400 circles and a plate with 200 holes: AA 4 and AA 8 under 150 ms', { retry: 3 }, () => {
    const parts: Paths = [rect(10, 10, 110, 70)];
    for (let i = 0; i < 400; i++) parts.push(disc(115 + (i % 20) * 5, 5 + Math.floor(i / 20) * 5.8, 2.2, 48));
    const holes: Paths = [];
    for (let i = 0; i < 200; i++) holes.push(disc(15 + (i % 20) * 4.8, 15 + Math.floor(i / 20) * 5.5, 1.5, 32));
    const region = poly.difference(poly.union(parts), holes);
    const exact = poly.area(region) / UNITS / UNITS;
    for (const aa of [4, 8]) {
      const times: number[] = [];
      let r = rasterLayer(region, S4U, aa);
      // CPU time of this process (a build or another test file beside it does not count), best of five
      for (let k = 0; k < 7; k++) { const c0 = process.cpuUsage(); r = rasterLayer(region, S4U, aa); const c = process.cpuUsage(c0); times.push((c.user + c.system) / 1000); }
      expect(Math.min(...times), `AA ${aa}: ${times.map((t) => t.toFixed(0)).join(' ')} ms`).toBeLessThan(150);
      expect(Math.abs(r.area - exact) / exact).toBeLessThan(0.005);
    }
  });
});

describe('R-4 / R-5: every setting is bounded; per printer and resin', () => {
  it('negative or too large wait times, anti-aliasing 3, support sizes and the lift are refused', () => {
    const bad: [keyof ResinSettings, number][] = [['lightOffDelay', -1], ['lightOffDelay', 600], ['supportAngle', -5], ['supportSpacing', 0], ['tipDiameter', -0.4],
      ['supportDiameter', 9], ['liftHeight', -1], ['raftThickness', 0], ['exposure', -2.5], ['retractSpeed', -150]];
    for (const [k, v] of bad) expect(settingsProblems(settings({ [k]: v } as Partial<ResinSettings>), S4U).length, `${k} = ${v}`).toBeGreaterThanOrEqual(1);
    expect(settingsProblems(settings({ antiAliasing: 3 as 1 }), S4U)[0]).toMatch(/Anti-aliasing 3 is not one of 1, 2, 4, 8/);
    expect(settingsProblems(settings({ lightOffDelay: Number.NaN }), S4U).length).toBe(1);
    expect(settingsProblems(settings(), S4U)).toEqual([]);
  });
  it('the exposure not below half of the resin profile; the part and the lift within the build height', () => {
    expect(settingsProblems(settings({ exposure: RESIN.exposure.layerS / 3 }), S4U, RESIN)[0]).toMatch(/would not cure/);
    expect(settingsProblems(settings({ bottomExposure: RESIN.exposure.bottomS / 3 }), S4U, RESIN)[0]).toMatch(/would not stick/);
    expect(settingsProblems(settings(), S4U, RESIN)).toEqual([]);
    // 210 mm high on a 220 mm printer, lifted 5 mm on supports: a lift of 6 mm goes above the top
    expect(resinProblems(job([mesh(box(50, 50, 0, 60, 60, 210))], { supports: 'normal', liftDistance: 6 }))[0]).toMatch(/goes above the 220 mm/);
    expect(resinProblems(job([mesh(box(50, 50, 0, 60, 60, 210))], { supports: 'normal', liftDistance: 4 }))).toEqual([]);
  });
});

describe('R-6: the LCD fields in the export confirmation; the pixel pitch of a rounded LCD size', () => {
  it('the Saturn 4 Ultra names its LCD and mirror assumptions; the Saturn 8K its pixel pitch', () => {
    const named = resinAssumptions(S4U);
    expect(named).toEqual(expect.arrayContaining(['lcdSizeMm', 'mirror', 'fileFormat']));
    const s8k = machineOf(db.printers.find((p) => p.id === 'elegoo-saturn-8k')!)!;
    expect(s8k.assumptions.some((a) => a.startsWith('pixel pitch:'))).toBe(true);
    expect(resinAssumptions(s8k)).toContain('pixel pitch');
  });
});
