import { describe, expect, it } from 'vitest';
import { FIXTURE_MATERIALS, FIXTURE_PRINTERS, processProfile } from './database';
import { box, calibrationCube, concat, cylinder, tPiece } from './shapes';
import { slicePaths, layerPlan } from './slice/slicer';
import { sliceMesh } from './slice/contours';
import { area } from './geom/boolean';
import { UNITS } from './geom/polygons';
import { runSlice, type SliceJob } from './run';
import { slotFor, beadArea } from './build';
import { analyseGcode } from './gcode/analyse';
import { planTimes } from './motion';
import type { PlateMesh, ProcessSettings } from './types';

const P1S = FIXTURE_PRINTERS.find((p) => p.id === 'bambu-p1s')!;
const N4P = FIXTURE_PRINTERS.find((p) => p.id === 'elegoo-neptune-4-pro')!;
const PLA = FIXTURE_MATERIALS.find((m) => m.id === 'pla')!;
const mesh = (positions: Float32Array, name = 'part', filament = 0): PlateMesh => ({ positions, name, filament });
const job = (meshes: PlateMesh[], over: Partial<ProcessSettings> = {}, printer = P1S): SliceJob => ({
  meshes, printer, nozzle: 0.4, process: { ...processProfile('standard', 0.4, printer), skirtLoops: 0, ...over }, slots: [slotFor(PLA)], name: 'test', appVersion: 'test',
});
const text = (chunks: Uint8Array[]) => chunks.map((c) => new TextDecoder().decode(c)).join('');

describe('slicing: layers and contours', () => {
  it('a 20 mm cube at 0.2 mm has 100 closed square layers of 400 mm²', () => {
    const s = processProfile('standard', 0.4, P1S);
    const plan = layerPlan(20, s);
    expect(plan.z).toHaveLength(1 + Math.ceil((20 - s.firstLayerHeight) / s.layerHeight - 1e-6));
    expect(plan.z.length).toBe(100);
    const layers = sliceMesh(calibrationCube(100, 100), plan.z.map((z, i) => z - plan.h[i] / 2));
    for (const l of layers) {
      expect(l.repaired).toBe(0);
      expect(l.contours).toHaveLength(1);
      expect(area(l.contours[0]) / UNITS ** 2).toBeCloseTo(400, 3);
    }
  });
  it('a cylinder Ø20 keeps its section area within 0.5 %', () => {
    const layers = sliceMesh(cylinder(50, 50, 0, 10, 20, 256), [0.1, 5, 19.9]);
    for (const l of layers) expect(Math.abs(area(l.contours[0]) / UNITS ** 2 - Math.PI * 100) / (Math.PI * 100)).toBeLessThan(0.005);
  });
  it('a tube has an outer loop and a hole (clockwise)', () => {
    const [l] = sliceMesh(cylinder(50, 50, 0, 10, 10, 128, 4), [5]);
    expect(l.contours).toHaveLength(2);
    expect(l.contours.filter((c) => area(c) < 0)).toHaveLength(1);
  });
  it('a mesh with a missing triangle is repaired and reported', () => {
    const cube = calibrationCube(10, 10);
    const open = cube.slice(0, cube.length - 9);
    const out = slicePaths({ meshes: [mesh(open, 'open cube')], process: processProfile('standard', 0.4, P1S), nozzle: 0.4 });
    expect(out.warnings.join(' ')).toMatch(/not closed/);
    expect(out.layers.length).toBe(100);
  });
});

describe('slicing: walls, skins, infill, support', () => {
  it('the cube gets the set number of walls per layer', () => {
    const out = slicePaths({ meshes: [mesh(calibrationCube(50, 50))], process: { ...processProfile('standard', 0.4, P1S), wallCount: 3, skirtLoops: 0 }, nozzle: 0.4 });
    const mid = out.layers[50];
    expect(mid.paths.filter((p) => p.type === 'outerWall')).toHaveLength(1);
    expect(mid.paths.filter((p) => p.type === 'innerWall')).toHaveLength(2);
    expect(mid.paths.some((p) => p.type === 'infill')).toBe(true);
    expect(out.layers[0].paths.some((p) => p.type === 'skin')).toBe(true);
    expect(out.layers[99].paths.some((p) => p.type === 'skin')).toBe(true);
    expect(mid.paths.some((p) => p.type === 'skin')).toBe(false);
  });
  it('a plate with holes gets a wall around each hole', () => {
    const plate = concat(cylinder(40, 40, 0, 15, 4, 96, 3));
    const out = slicePaths({ meshes: [mesh(plate)], process: { ...processProfile('standard', 0.4, P1S), skirtLoops: 0 }, nozzle: 0.4 });
    const walls = out.layers[10].paths.filter((p) => p.type === 'outerWall');
    expect(walls).toHaveLength(2);
  });
  it('every infill pattern covers about the set density', () => {
    for (const pattern of ['rectilinear', 'grid', 'gyroid', 'honeycomb'] as const) {
      const out = slicePaths({ meshes: [mesh(box(20, 20, 0, 80, 80, 3))], process: { ...processProfile('standard', 0.4, P1S), infillPattern: pattern, infillDensity: 0.2, topLayers: 0, bottomLayers: 0, skirtLoops: 0 }, nozzle: 0.4 });
      const l = out.layers[7];
      const len = l.paths.filter((p) => p.type === 'infill').reduce((s, p) => { let L = 0; for (let i = 2; i < p.points.length; i += 2) L += Math.hypot(p.points[i] - p.points[i - 2], p.points[i + 1] - p.points[i - 1]); return s + L; }, 0);
      const inner = (60 - 2 * 2 * 0.41) ** 2;
      const density = (len * 0.41) / inner;
      expect(Math.abs(density - 0.2) / 0.2, `${pattern}: ${density.toFixed(3)}`).toBeLessThan(0.05);
    }
  });
  it('the T piece gets support under its arms, the cube none', () => {
    const t = slicePaths({ meshes: [mesh(tPiece(50, 50))], process: { ...processProfile('standard', 0.4, P1S), support: 'normal', skirtLoops: 0 }, nozzle: 0.4 });
    const sup = t.layers.slice(0, 95).filter((l) => l.paths.some((p) => p.type === 'support'));
    expect(sup.length).toBeGreaterThan(80);
    // no support line lies inside the stem
    for (const l of t.layers.slice(5, 90)) for (const p of l.paths.filter((q) => q.type === 'support')) for (let i = 0; i < p.points.length; i += 2) expect(p.points[i] > 65 - 0.3 && p.points[i] < 75 + 0.3 && p.points[i + 1] > 50 && p.points[i + 1] < 60).toBe(false);
    const c = slicePaths({ meshes: [mesh(calibrationCube(50, 50))], process: { ...processProfile('standard', 0.4, P1S), support: 'normal', skirtLoops: 0 }, nozzle: 0.4 });
    expect(c.layers.some((l) => l.paths.some((p) => p.type === 'support'))).toBe(false);
    const tree = slicePaths({ meshes: [mesh(tPiece(50, 50))], process: { ...processProfile('standard', 0.4, P1S), support: 'tree', skirtLoops: 0 }, nozzle: 0.4 });
    expect(tree.layers.filter((l) => l.paths.some((p) => p.type === 'support')).length).toBeGreaterThan(50);
  });
  it('the bottom of the T arms is printed as a bridge or on support interface', () => {
    const t = slicePaths({ meshes: [mesh(tPiece(50, 50))], process: { ...processProfile('standard', 0.4, P1S), skirtLoops: 0 }, nozzle: 0.4 });
    const armLayer = t.layers.findIndex((l) => l.z > 20.05);
    expect(t.layers[armLayer].paths.some((p) => p.type === 'bridge')).toBe(true);
  });
  it('variable layer height makes thinner layers on a shallow slope', () => {
    // a wedge: 40 long, rising 5 over its length
    const w = new Float32Array([0, 0, 0, 40, 0, 5, 40, 10, 5, 0, 0, 0, 40, 10, 5, 0, 10, 0, 0, 0, 0, 0, 10, 0, 40, 10, 0, 0, 0, 0, 40, 10, 0, 40, 0, 0, 40, 0, 0, 40, 10, 0, 40, 10, 5, 40, 0, 0, 40, 10, 5, 40, 0, 5, 0, 0, 0, 40, 0, 0, 40, 0, 5, 0, 10, 0, 40, 10, 5, 40, 10, 0]);
    const s = { ...processProfile('standard', 0.4, P1S), variableLayerHeight: true };
    const plan = layerPlan(5, s, [mesh(w)]);
    expect(Math.min(...plan.h.slice(1))).toBeLessThan(s.layerHeight);
  });
});

describe('G-code: the cube on a P1S and on a Neptune 4 Pro', async () => {
  const cube = await runSlice(job([mesh(calibrationCube(118, 118), 'Cube')], { infillDensity: 1, infillPattern: 'rectilinear', topLayers: 0, bottomLayers: 0, minLayerTime: 0, skirtLoops: 0 }));
  const g = text(cube.gcode);
  const a = analyseGcode(g, 10000);

  it('extrudes the cube volume at 100 % infill within ±5 %', () => {
    const filamentArea = Math.PI * 0.875 ** 2;
    const purge = (Math.min(120, 256 * 0.6) - Math.min(20, 256 * 0.1)) * beadArea(0.5 * 1.2, 0.2) / filamentArea;
    const volume = (a.extruded - purge) * filamentArea;
    expect(Math.abs(volume - 8000) / 8000, `volume ${volume.toFixed(0)} mm³`).toBeLessThan(0.05);
  });
  it('hand calculation of walls + skins + 15 % infill within ±5 %', async () => {
    const s = { ...processProfile('standard', 0.4, P1S), skirtLoops: 0, minLayerTime: 0 };
    const r = await runSlice(job([mesh(calibrationCube(118, 118), 'Cube')], s));
    const w = s.lineWidth, h = s.layerHeight, sp = w - h * (1 - Math.PI / 4), n = s.wallCount;
    // walls: n square loops per layer at the bead centre lines
    let vol = 0;
    const layers = 100;
    for (let k = 0; k < n; k++) vol += 4 * (20 - w - 2 * k * sp) * beadArea(w, h) * (layers - 1);
    vol += 4 * (20 - 0.5) * beadArea(0.5, 0.2) + (n > 1 ? 4 * (20 - 0.5 - 2 * (0.5 - 0.2 * (1 - Math.PI / 4))) * beadArea(0.5, 0.2) : 0);
    // inside the walls: solid for bottom + top layers, the set density elsewhere
    const inner = (20 - 2 * (w / 2 + n * sp - s.infillOverlap * w)) ** 2;
    const solidLayers = s.bottomLayers + s.topLayers;
    vol += inner * h * solidLayers * 0.98 + inner * h * (layers - solidLayers) * s.infillDensity * (beadArea(w, h) / (w * h));
    const got = r.stats.filament[0].volume - (Math.min(120, 256 * 0.6) - Math.min(20, 256 * 0.1)) * beadArea(0.6, 0.2) * 0;
    expect(Math.abs(got - vol) / vol, `${got.toFixed(0)} vs ${vol.toFixed(0)} mm³`).toBeLessThan(0.05);
  });
  it('100 layers, all moves on the bed, temperatures before extrusion, retractions, heaters off at the end', () => {
    expect(a.layers).toBe(100);
    expect(a.extrudeMin[0]).toBeGreaterThanOrEqual(0); expect(a.extrudeMin[1]).toBeGreaterThanOrEqual(0);
    expect(a.moveMax[0]).toBeLessThanOrEqual(256); expect(a.moveMax[1]).toBeLessThanOrEqual(256); expect(a.moveMax[2]).toBeLessThanOrEqual(256);
    expect(a.moveMin[0]).toBeGreaterThanOrEqual(0); expect(a.moveMin[1]).toBeGreaterThanOrEqual(0);
    expect(a.nozzleWaitedBeforeExtrusion).toBe(true);
    expect(a.bedSetBeforeExtrusion).toBe(true);
    expect(a.retractions).toBeGreaterThan(0);
    expect(a.heatersOffAtEnd).toBe(true);
    expect(a.forbidden).toEqual([]);
    expect(a.nonAscii).toBe(0);
    expect(a.badNumbers).toBe(0);
    expect(a.endsWithNewline).toBe(true);
    expect(a.maxNozzleTemp).toBeLessThanOrEqual(P1S.maxNozzleTemp);
    expect(g).toContain('; HEADER_BLOCK_START');
    expect(g).toContain('M991 S0 P99');
    expect(g).toContain('nog te printen: kalibratiekubus 20 mm per printer');
  });
  it('the time estimate is sane and agrees with the independent analyser', () => {
    expect(cube.stats.printTime).toBeGreaterThan(5 * 60);
    expect(cube.stats.printTime).toBeLessThan(90 * 60);
    expect(Math.abs(a.time - cube.stats.printTime) / cube.stats.printTime, `${a.time.toFixed(0)} vs ${cube.stats.printTime.toFixed(0)} s`).toBeLessThan(0.05);
    const grams = cube.stats.filament[0].grams;
    expect(grams).toBeCloseTo((cube.stats.filament[0].volume / 1000) * PLA.density, 6);
    expect(cube.stats.filament[0].cost).toBeCloseTo((grams / 1000) * PLA.pricePerKg, 6);
  });
  it('a straight line of 100 mm at 100 mm/s and 1000 mm/s² takes 1.100 s', () => {
    const t = planTimes([{ x: 100, y: 0, z: 0, e: 1, v: 100, a: 1000 }], { x: 0, y: 0, z: 0 }, { squareCornerVelocity: 5, maxSpeed: 500 });
    expect(t[0]).toBeCloseTo(1.1, 3);
  });
  it('Klipper flavour for the Neptune 4 Pro: own markers, ColPic and PNG thumbnails, no Bambu commands', async () => {
    const r = await runSlice(job([mesh(calibrationCube(100, 100), 'Cube')], {}, N4P));
    const t = text(r.gcode);
    expect(t).toContain(';LAYER_CHANGE');
    expect(t).toContain(';gimage:');
    expect(t).toContain('; thumbnail begin 160x160');
    expect(t).not.toMatch(/^M62[01]|^M991|^G29\b/m);
    const an = analyseGcode(t);
    expect(an.layers).toBe(100);
    expect(an.moveMax[0]).toBeLessThanOrEqual(225);
  });
});

describe('refusals and warnings', () => {
  it('refuses a part bigger than the bed, an empty plate and a too hot filament', async () => {
    await expect(runSlice(job([mesh(box(0, 0, 0, 300, 20, 10), 'Big')]))).rejects.toThrow(/outside the bed/);
    await expect(runSlice(job([mesh(box(10, 10, 0, 30, 30, 300), 'Tall')]))).rejects.toThrow(/prints up to/);
    await expect(runSlice(job([]))).rejects.toThrow(/empty/);
    const hot = job([mesh(calibrationCube(50, 50))]);
    hot.slots = [{ ...slotFor(PLA), nozzleTemp: 350 }];
    await expect(runSlice(hot)).rejects.toThrow(/above the 300/);
  });
  it('refuses two filaments on a printer without multi-material', async () => {
    const j = job([mesh(calibrationCube(20, 20), 'A', 0), mesh(calibrationCube(60, 20), 'B', 1)], {}, N4P);
    j.slots = [slotFor(PLA), slotFor(PLA, '#ff0000')];
    await expect(runSlice(j)).rejects.toThrow(/one filament/);
  });
  it('two filaments on a P1S: tool changes over the prime tower and the use per slot', async () => {
    const j = job([mesh(calibrationCube(20, 20, 10), 'A', 0), mesh(calibrationCube(60, 20, 10), 'B', 1)]);
    j.slots = [slotFor(PLA), slotFor(PLA, '#d03030')];
    const r = await runSlice(j);
    expect(r.stats.filament.map((f) => f.slot)).toEqual([0, 1]);
    expect(r.stats.toolChanges).toBeGreaterThan(40);
    const t = text(r.gcode);
    expect(t).toContain('M620 S1A');
    expect(t).toContain('; FEATURE: Prime tower');
  });
});
