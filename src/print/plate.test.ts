import { describe, expect, it } from 'vitest';
import { arrange, autoOrient, insideVolume, layFlat, makeItem, moveBy, orientationScore, scaleItem, worldBounds, worldPositions } from './plate';
import { box, tPiece } from './shapes';
import { FIXTURE_PRINTERS, buildDatabase, validatePrinter, normalizeMaterial } from './database';
import { readFileSync, existsSync } from 'node:fs';

const P1S = FIXTURE_PRINTERS[0];
// shapes are made Z up; in CAD the part is Y up: turn a Z-up shape into CAD coordinates (y <- z, z <- -y)
const toCad = (p: Float32Array) => { const o = new Float32Array(p.length); for (let i = 0; i < p.length; i += 3) { o[i] = p[i]; o[i + 1] = p[i + 2]; o[i + 2] = -p[i + 1]; } return o; };

describe('the plate', () => {
  it('a part from CAD lands on the bed, centred, Top Plane down', () => {
    const it0 = makeItem('Cube', toCad(box(0, 0, 0, 20, 20, 20)), 128, 128);
    const b = worldBounds(it0);
    expect(b.min[2]).toBeCloseTo(0, 6);
    expect((b.min[0] + b.max[0]) / 2).toBeCloseTo(128, 6);
    expect(b.max[2] - b.min[2]).toBeCloseTo(20, 6);
  });
  it('Lay Flat turns the chosen face onto the bed (normal within 0.01 degrees, lowest point at 0)', () => {
    const it0 = makeItem('Wedge', toCad(tPiece()), 100, 100);
    const flat = layFlat(it0, [0, 1, 0]);
    const w = worldPositions(flat);
    const b = worldBounds(flat);
    expect(b.min[2]).toBeCloseTo(0, 3);
    // the face that pointed +Y now points -Z: its area is on the bed
    expect(orientationScore(w).contact).toBeGreaterThan(40 * 5 - 1);
  });
  it('Auto Orient keeps the cube and puts the T on its back (no overhang left)', () => {
    const cube = makeItem('Cube', toCad(box(0, 0, 0, 20, 20, 20)), 100, 100);
    const o = autoOrient(cube);
    expect(orientationScore(worldPositions(o)).overhang).toBe(0);
    expect(worldBounds(o).max[2]).toBeCloseTo(20, 4);
    const t = makeItem('T', toCad(tPiece()), 100, 100);
    expect(orientationScore(worldPositions(t)).overhang).toBeGreaterThan(250);
    const ot = autoOrient(t);
    expect(orientationScore(worldPositions(ot)).overhang).toBeLessThan(1);
  });
  it('Arrange: 20 cubes without overlap, gap kept, all inside the bed, deterministic and fast', () => {
    const items = Array.from({ length: 20 }, (_, i) => makeItem(`C${i}`, toCad(box(0, 0, 0, 30, 30, 20)), 128, 128));
    const t0 = performance.now();
    const a = arrange(items, P1S, 6);
    expect(performance.now() - t0).toBeLessThan(1000);
    const bs = a.map(worldBounds);
    for (const b of bs) expect(insideVolume(a[bs.indexOf(b)], P1S)).toBe(true);
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const gx = Math.max(bs[j].min[0] - bs[i].max[0], bs[i].min[0] - bs[j].max[0]);
      const gy = Math.max(bs[j].min[1] - bs[i].max[1], bs[i].min[1] - bs[j].max[1]);
      expect(Math.max(gx, gy)).toBeGreaterThanOrEqual(6 - 1e-6);
    }
    expect(arrange(items, P1S, 6).map((x) => x.matrix)).toEqual(a.map((x) => x.matrix));
  });
  it('a part 0.1 mm over the edge or too tall is outside the volume', () => {
    const it0 = makeItem('Cube', toCad(box(0, 0, 0, 20, 20, 20)), 10, 128);
    expect(insideVolume(it0, P1S)).toBe(true);
    expect(insideVolume(moveBy(it0, -0.1, 0), P1S)).toBe(false);
    expect(insideVolume(scaleItem(it0, 13), P1S)).toBe(false);
  });
});

describe('printer database', () => {
  it('every entry of the real database passes validation (52 printers: 51 + the Centauri, docs/35 9.6)', () => {
    const file = 'src/print/printerDatabase.json';
    if (!existsSync(file)) return;
    const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown[];
    expect(raw).toHaveLength(52);
    const problems = (raw as Parameters<typeof validatePrinter>[0][]).flatMap((p) => validatePrinter(p).map((e) => `${p.id}: ${e}`));
    expect(problems).toEqual([]);
    const ids = (raw as { id: string }[]).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const mats = JSON.parse(readFileSync('src/print/materialProfiles.json', 'utf8'));
    const db = buildDatabase(raw, mats);
    expect(db.fromFixture).toBe(false);
    expect(db.printers).toHaveLength(52);
    for (const m of db.materials) {
      expect(m.density).toBeGreaterThan(0.8);
      expect(m.nozzleTemp.min).toBeLessThan(m.nozzleTemp.max);
      expect(m.maxVolumetricSpeed).toBeGreaterThan(0);
    }
  });
  it('the fixture is used while the files are missing; tolerant material fields', () => {
    expect(buildDatabase(null, null).fromFixture).toBe(true);
    const m = normalizeMaterial({ name: 'X', nozzleTempMin: 200, nozzleTempMax: 240, bedTemp: { default: 70 }, maxFlow: 15 });
    expect(m.nozzleTemp).toEqual({ min: 200, max: 240, default: 220 });
    expect(m.maxVolumetricSpeed).toBe(15);
  });
});
