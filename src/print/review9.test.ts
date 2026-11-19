// docs/35 chapter 9 (re-review by Fable 5.2): a negative test per finding H-1 to H-5; each fails on the code before it
import { describe, expect, it } from 'vitest';
import { FIXTURE_MATERIALS, FIXTURE_PRINTERS, processProfile } from './database';
import { box, calibrationCube, cylinder } from './shapes';
import { runSlice, type SliceJob } from './run';
import { detour, segmentTouches, slotFor } from './build';
import { slicePaths } from './slice/slicer';
import { poly, UNITS } from './geom/polygons';
import type { PlateMesh, Printer, ProcessSettings } from './types';

const P1S = FIXTURE_PRINTERS.find((p) => p.id === 'bambu-p1s')!;
const PLA = FIXTURE_MATERIALS.find((m) => m.id === 'pla')!;
const mesh = (positions: Float32Array, name = 'part'): PlateMesh => ({ positions, name, filament: 0 });
const proc = (over: Partial<ProcessSettings> = {}, printer = P1S): ProcessSettings => ({ ...processProfile('standard', 0.4, printer), skirtLoops: 0, ...over });
const job = (meshes: PlateMesh[], over: Partial<ProcessSettings> = {}, printer: Printer = P1S): SliceJob => ({
  meshes, printer, nozzle: 0.4, process: proc(over, printer), slots: [slotFor(PLA)], name: 'test', appVersion: 'test',
});
const text = (chunks: Uint8Array[]) => chunks.map((c) => new TextDecoder().decode(c)).join('');
const num = (l: string, k: string) => { const m = new RegExp(`\\s${k}(-?[\\d.]+)`).exec(l); return m ? Number(m[1]) : undefined; };

/** the moves after the start code, with the position carried */
function moves(g: string) {
  const lines = g.split('\n');
  const first = lines.findIndex((l) => l.startsWith(';LAYER_CHANGE') || l.startsWith('; CHANGE_LAYER'));
  const end = lines.findIndex((l, i) => i > first && /end G-code/.test(l));
  let x = NaN, y = NaN;
  return lines.slice(first, end > 0 ? end : undefined).filter((l) => /^G[014]\s/.test(l)).map((line) => {
    const nx = num(line, 'X'), ny = num(line, 'Y'), e = num(line, 'E');
    const m = { line, x0: x, y0: y, x: nx ?? x, y: ny ?? y, e, xy: nx !== undefined || ny !== undefined };
    x = m.x; y = m.y;
    return m;
  });
}

describe('H-1: the minimum layer time slows down first; no push-back in the air', () => {
  it('the 20 mm calibration cube has no G4 pause at all (it slows down instead)', async () => {
    const r = await runSlice(job([mesh(calibrationCube(118, 118), 'Cube')]));
    const g = text(r.gcode);
    expect(g.match(/^G4 /gm) ?? []).toEqual([]);
    expect(r.stats.timeByType.wait ?? 0).toBe(0);
  });
  it('a thin pen waits only at the slowest speed, and every push-back is followed directly by extrusion', async () => {
    const r = await runSlice(job([mesh(cylinder(100, 100, 0, 0.5, 10, 16), 'Pen')], { minLayerTime: 6, wallCount: 1 }));
    const g = text(r.gcode);
    expect(g).toMatch(/^G4 P\d+/m);
    const ms = moves(g);
    // before a pause, the extrusion of that layer runs at the slowest speed (10 mm/s = F600)
    const lines = g.split('\n');
    const pause = lines.findIndex((l) => /^G4 /.test(l));
    const before = lines.slice(0, pause).reverse().find((l) => /^G1 X.* E\d/.test(l) && /F\d/.test(l));
    expect(before, 'the last extrusion before the first pause').toMatch(/F600\b/);
    // a push-back (G1 E+ without XY) is directly followed by an extruding move, not by a travel
    ms.forEach((m, i) => {
      if (m.xy || !(m.e! > 0)) return;
      const next = ms[i + 1];
      expect(next && next.xy && (next.e ?? 0) > 0, `${m.line} then ${next?.line}`).toBe(true);
    });
    // the layer time is kept
    expect(r.stats.printTime).toBeGreaterThan((r.stats.layers - 1) * 6 * 0.99);
  });
});

describe('H-2: travel goes round the excluded zones', () => {
  // two cubes left and right of a zone in the middle of the bed
  const zoned: Printer = { ...P1S, id: 'zoned', excludeAreas: [[[110, 60], [146, 60], [146, 200], [110, 200]]] };
  const parts = [mesh(calibrationCube(70, 120), 'Left'), mesh(calibrationCube(166, 120), 'Right')];
  it('no move of the two-cube plate touches the zone; the detour goes round its corners', async () => {
    const r = await runSlice(job(parts, {}, zoned));
    const zone = zoned.excludeAreas![0].flat();
    const ms = moves(text(r.gcode)).filter((m) => m.xy && Number.isFinite(m.x0));
    const through = ms.filter((m) => segmentTouches(zone, m.x0, m.y0, m.x, m.y));
    expect(through.map((m) => m.line).slice(0, 3)).toEqual([]);
    expect(ms.length).toBeGreaterThan(100);
  });
  it('a zone across the whole bed has no way round: the slice is refused', async () => {
    const wall: Printer = { ...P1S, id: 'wall', excludeAreas: [[[130, -1], [146, -1], [146, 257], [130, 257]]] };
    await expect(runSlice(job(parts, {}, wall))).rejects.toThrow(/excluded zone/);
    expect(detour([[130, -1, 146, -1, 146, 257, 130, 257]], [0, 0, 256, 0, 256, 256, 0, 256], 90, 130, 170, 130)).toBeNull();
  });
});

describe('H-3: the time per line type adds up to the print time, waiting included', () => {
  it('pen with pauses: the rows (with Wait) are 100 %', async () => {
    const r = await runSlice(job([mesh(cylinder(100, 100, 0, 0.5, 10, 16), 'Pen')], { minLayerTime: 6, wallCount: 1 }));
    const sum = Object.values(r.stats.timeByType).reduce((a, b) => a + b, 0);
    expect(r.stats.timeByType.wait).toBeGreaterThan(0);
    expect(Math.abs(sum - r.stats.printTime) / r.stats.printTime).toBeLessThan(0.001);
  });
});

describe('H-4: gyroid inside the walls within ±5 % of the set density', () => {
  it('60 mm cube, 15 % gyroid: the mean over 50 layers inside the walls', () => {
    const s = proc({ infillPattern: 'gyroid', infillDensity: 0.15, topLayers: 0, bottomLayers: 0 });
    const out = slicePaths({ meshes: [mesh(box(20, 20, 0, 80, 80, 12))], process: s, nozzle: 0.4 });
    // inside the walls: the outline shrunk by the walls (half the outer line, then the line spacing per wall)
    const sp = s.lineWidth - s.layerHeight * (1 - Math.PI / 4);
    const inset = s.lineWidth / 2 + s.wallCount * sp - sp / 2;
    const inner = [[20 + inset, 20 + inset, 80 - inset, 20 + inset, 80 - inset, 80 - inset, 20 + inset, 80 - inset].map((v) => Math.round(v * UNITS))];
    const a = Math.abs(poly.area(inner)) / UNITS / UNITS;
    const per: number[] = [];
    for (const l of out.layers.slice(5, 55)) {
      let len = 0;
      for (const p of l.paths.filter((q) => q.type === 'infill')) {
        for (let i = 2; i + 1 < p.points.length; i += 2) {
          // the part of each segment inside the walls (the overlap into the walls is not counted)
          const ax = p.points[i - 2], ay = p.points[i - 1], bx = p.points[i], by = p.points[i + 1];
          const lo = 20 + inset, hi = 80 - inset, n = 8;
          for (let k = 0; k < n; k++) {
            const t0 = k / n, t1 = (k + 1) / n;
            const mx = ax + (bx - ax) * (t0 + t1) / 2, my = ay + (by - ay) * (t0 + t1) / 2;
            if (mx >= lo && mx <= hi && my >= lo && my <= hi) len += Math.hypot(bx - ax, by - ay) / n;
          }
        }
      }
      per.push((len * sp) / a);
    }
    const mean = per.reduce((x, y) => x + y, 0) / per.length;
    expect(Math.abs(mean - 0.15) / 0.15, `mean ${mean.toFixed(4)}`).toBeLessThan(0.05);
  });
});

describe('H-5: no fill stub shorter than a line width', () => {
  it('the calibration cube: every extrusion run is at least half a line width long', async () => {
    const r = await runSlice(job([mesh(calibrationCube(118, 118), 'Cube')]));
    const ms = moves(text(r.gcode));
    let run = 0, tiny: string[] = [];
    for (const m of ms) {
      if (m.xy && (m.e ?? 0) > 0) { run += Math.hypot(m.x - m.x0, m.y - m.y0); continue; }
      if (run > 0 && run < 0.2) tiny.push(`${run.toFixed(4)} mm before ${m.line}`);
      run = 0;
    }
    tiny = tiny.slice(0, 3);
    expect(tiny).toEqual([]);
  });
});

describe('H-3: the legend has a Wait row and adds up to 100 %', () => {
  it('legendRows of a slice with pauses', async () => {
    const { legendRows } = await import('../app/print/previewColors');
    const r = await runSlice(job([mesh(cylinder(100, 100, 0, 0.5, 10, 16), 'Pen')], { minLayerTime: 6, wallCount: 1 }));
    const rows = legendRows(r.stats.timeByType);
    expect(rows.some((x) => x.key === 'wait' && x.pct > 1)).toBe(true);
    expect(Math.abs(rows.reduce((a, x) => a + x.pct, 0) - 100)).toBeLessThan(0.1);
  });
});
