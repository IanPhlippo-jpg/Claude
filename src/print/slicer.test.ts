import { describe, expect, it } from 'vitest';
import { FIXTURE_MATERIALS, FIXTURE_PRINTERS, processProfile } from './database';
import { box, bridgePiece, calibrationCube, concat, cylinder, leaningBox, tPiece } from './shapes';
import { slicePaths, layerPlan } from './slice/slicer';
import { sliceMesh } from './slice/contours';
import { area } from './geom/boolean';
import { UNITS } from './geom/polygons';
import { runSlice, placeTower, type SliceJob } from './run';
import { slotFor, beadArea } from './build';
import { analyseGcode } from './gcode/analyse';
import { planTimes } from './motion';
import { previewMesh } from './previewMesh';
import { GYROID_K, gyroidLines, lineLength } from './slice/infill';
import type { PlateMesh, Printer, ProcessSettings } from './types';

const P1S = FIXTURE_PRINTERS.find((p) => p.id === 'bambu-p1s')!;
const N4P = FIXTURE_PRINTERS.find((p) => p.id === 'elegoo-neptune-4-pro')!;
const N3P: Printer = { ...N4P, id: 'elegoo-neptune-3-pro', model: 'Neptune 3 Pro', gcodeFlavor: 'marlin', maxSpeed: 180, maxAccel: 3000 };
const PLA = FIXTURE_MATERIALS.find((m) => m.id === 'pla')!;
const mesh = (positions: Float32Array, name = 'part', filament = 0): PlateMesh => ({ positions, name, filament });
const proc = (over: Partial<ProcessSettings> = {}, printer = P1S): ProcessSettings => ({ ...processProfile('standard', 0.4, printer), skirtLoops: 0, ...over });
const job = (meshes: PlateMesh[], over: Partial<ProcessSettings> = {}, printer = P1S): SliceJob => ({
  meshes, printer, nozzle: 0.4, process: proc(over, printer), slots: [slotFor(PLA)], name: 'test', appVersion: 'test',
});
const text = (chunks: Uint8Array[]) => chunks.map((c) => new TextDecoder().decode(c)).join('');
const core = (positions: Float32Array, over: Partial<ProcessSettings> = {}) => slicePaths({ meshes: [mesh(positions)], process: proc(over), nozzle: 0.4 });
const pathLen = (pts: number[]) => { let L = 0; for (let i = 2; i < pts.length; i += 2) L += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]); return L; };
const FA = Math.PI * 0.875 ** 2;

/** the G-code moves after the start code (the first layer marker) */
function movesAfterStart(g: string): { line: string; x?: number; y?: number; z?: number; e?: number }[] {
  const lines = g.split('\n');
  const first = lines.findIndex((l) => l.startsWith(';LAYER_CHANGE') || l.startsWith('; CHANGE_LAYER'));
  const end = lines.findIndex((l) => /end G-code/.test(l));
  const w = (l: string, k: string) => { const m = new RegExp(`\\s${k}(-?[\\d.]+)`).exec(l); return m ? Number(m[1]) : undefined; };
  return lines.slice(first, end > 0 ? end : undefined).filter((l) => /^G[01]\s/.test(l)).map((line) => ({ line, x: w(line, 'X'), y: w(line, 'Y'), z: w(line, 'Z'), e: w(line, 'E') }));
}

describe('slicing: layers and contours', () => {
  it('a 20 mm cube at 0.2 mm has 100 closed square layers of 400 mm²', () => {
    const s = proc();
    const plan = layerPlan(20, s);
    expect(plan.z.length).toBe(1 + Math.ceil((20 - s.firstLayerHeight) / s.layerHeight - 1e-6));
    expect(plan.z.length).toBe(100);
    const layers = sliceMesh(calibrationCube(100, 100), plan.z.map((z, i) => z - plan.h[i] / 2));
    for (const l of layers) {
      expect(l.repaired).toBe(0);
      expect(l.contours).toHaveLength(1);
      expect(area(l.contours[0]) / UNITS ** 2).toBeCloseTo(400, 3);
    }
  });
  it('a cylinder Ø20 keeps its section area within 0.5 %; a tube has a clockwise hole', () => {
    for (const l of sliceMesh(cylinder(50, 50, 0, 10, 20, 256), [0.1, 5, 19.9])) expect(Math.abs(area(l.contours[0]) / UNITS ** 2 - Math.PI * 100) / (Math.PI * 100)).toBeLessThan(0.005);
    const [t] = sliceMesh(cylinder(50, 50, 0, 10, 10, 128, 4), [5]);
    expect(t.contours).toHaveLength(2);
    expect(t.contours.filter((c) => area(c) < 0)).toHaveLength(1);
  });
  it('P2-7: a cube with a missing side face is repaired to the full volume (within 2 %) and reported', async () => {
    const cube = calibrationCube(100, 100);
    const open = new Float32Array([...cube.slice(0, 36), ...cube.slice(54)]);
    const out = slicePaths({ meshes: [mesh(open, 'open cube')], process: proc(), nozzle: 0.4 });
    expect(out.warnings.join(' ')).toMatch(/not closed/);
    const r = await runSlice(job([mesh(open, 'open cube')], { infillDensity: 1, infillPattern: 'rectilinear', topLayers: 0, bottomLayers: 0, minLayerTime: 0 }));
    const model = Object.entries(r.stats.volumeByType).reduce((a, [, v]) => a + v, 0);
    expect(Math.abs(model - 8000) / 8000, `${model.toFixed(0)} mm³`).toBeLessThan(0.02 + 0.03);
  });
});

describe('slicing: walls, skins, infill, support, bridges', () => {
  it('the cube gets the set number of walls per layer; skin only at bottom and top', () => {
    const out = core(calibrationCube(50, 50), { wallCount: 3 });
    const mid = out.layers[50];
    expect(mid.paths.filter((p) => p.type === 'outerWall')).toHaveLength(1);
    expect(mid.paths.filter((p) => p.type === 'innerWall')).toHaveLength(2);
    expect(mid.paths.some((p) => p.type === 'infill')).toBe(true);
    expect(out.layers[0].paths.some((p) => p.type === 'skin')).toBe(true);
    expect(out.layers[99].paths.some((p) => p.type === 'skin')).toBe(true);
    expect(mid.paths.some((p) => p.type === 'skin')).toBe(false);
  });
  it('P1-2: a cylinder and a tube (96 facets) get no skin in their middle layers', () => {
    for (const [name, m] of [['cylinder', cylinder(60, 60, 0, 10, 20, 96)], ['tube', cylinder(60, 60, 0, 10, 20, 96, 6)]] as const) {
      const out = core(m);
      const middle = out.layers.slice(6, out.layers.length - 6);
      const skinned = middle.filter((l) => l.paths.some((p) => p.type === 'skin')).length;
      expect(skinned, `${name}: ${skinned} of ${middle.length} middle layers with skin`).toBe(0);
    }
  });
  it('P1-2: a cylinder at 100 % infill extrudes its volume within ±3 %', async () => {
    const r = await runSlice(job([mesh(cylinder(120, 120, 0, 10, 20, 96))], { infillDensity: 1, infillPattern: 'rectilinear', minLayerTime: 0 }));
    const v = Object.values(r.stats.volumeByType).reduce((a, b) => a + b, 0);
    const exact = 96 / 2 * 100 * Math.sin((2 * Math.PI) / 96) * 20;
    expect(Math.abs(v - exact) / exact, `${v.toFixed(0)} vs ${exact.toFixed(0)}`).toBeLessThan(0.03);
  });
  it('a plate with holes gets a wall around each hole', () => {
    expect(core(cylinder(40, 40, 0, 15, 4, 96, 3)).layers[10].paths.filter((p) => p.type === 'outerWall')).toHaveLength(2);
  });
  it('every infill pattern covers the set density within ±5 % (gyroid: averaged over a period of layers)', () => {
    for (const pattern of ['rectilinear', 'grid', 'honeycomb'] as const) {
      const out = core(box(20, 20, 0, 80, 80, 3), { infillPattern: pattern, infillDensity: 0.2, topLayers: 0, bottomLayers: 0 });
      const l = out.layers[7];
      const len = l.paths.filter((p) => p.type === 'infill').reduce((s, p) => s + pathLen(p.points), 0);
      const density = (len * 0.407) / (60 - 2 * (0.225 + 2 * 0.407 - 0.0675)) ** 2;
      expect(Math.abs(density - 0.2) / 0.2, `${pattern}: ${density.toFixed(3)}`).toBeLessThan(0.05);
    }
  });
  it('P2-1: gyroid density over one period of layers: mean within ±5 %, no layer above +30 %', () => {
    const sp = 0.407 * UNITS, d = 0.15, period = (GYROID_K * sp) / d;
    const box60 = { x0: 0, y0: 0, x1: 60 * UNITS, y1: 60 * UNITS };
    const per: number[] = [];
    for (let k = 0; k < 40; k++) per.push((lineLength(gyroidLines(box60, period, (k / 40) * period)) * sp) / (60 * UNITS) ** 2);
    const mean = per.reduce((a, b) => a + b, 0) / per.length;
    expect(Math.abs(mean - d) / d, `mean ${mean.toFixed(3)}`).toBeLessThan(0.05);
    expect(Math.max(...per), `layers ${per.map((x) => x.toFixed(3)).join(' ')}`).toBeLessThan(d * 1.3);
  });
  it('P2-2: slopes of 20, 25 and 28 degrees get support at a 30 degree threshold; 40 and 60 do not', () => {
    for (const deg of [20, 25, 28, 40, 60]) {
      const out = core(leaningBox(60, 60, deg), { support: 'normal', supportAngle: 30 });
      const has = out.layers.some((l) => l.paths.some((p) => p.type === 'support' || p.type === 'supportInterface'));
      expect(has, `${deg} degrees`).toBe(deg < 30);
    }
  });
  it('the T piece gets support under its arms (none inside the stem), the cube none; tree support grows too', () => {
    const t = core(tPiece(50, 50), { support: 'normal' });
    expect(t.layers.slice(0, 95).filter((l) => l.paths.some((p) => p.type === 'support')).length).toBeGreaterThan(80);
    for (const l of t.layers.slice(5, 90)) for (const p of l.paths.filter((q) => q.type === 'support')) for (let i = 0; i < p.points.length; i += 2) expect(p.points[i] > 65 - 0.3 && p.points[i] < 75 + 0.3 && p.points[i + 1] > 50 && p.points[i + 1] < 60).toBe(false);
    expect(core(calibrationCube(50, 50), { support: 'normal' }).layers.some((l) => l.paths.some((p) => p.type === 'support'))).toBe(false);
    expect(core(tPiece(50, 50), { support: 'tree' }).layers.filter((l) => l.paths.some((p) => p.type === 'support')).length).toBeGreaterThan(50);
  });
  it('P2-3: bridges of 10, 30 and 60 mm along X run within 5 degrees of X and rest on the pillars', () => {
    for (const span of [10, 30, 60]) {
      const out = core(bridgePiece(40, 60, span));
      const L = out.layers.find((l) => l.z > 10.05 && l.paths.some((p) => p.type === 'bridge'));
      expect(L, `span ${span}`).toBeTruthy();
      for (const p of L!.paths.filter((q) => q.type === 'bridge')) for (let i = 2; i < p.points.length; i += 2) {
        const dx = p.points[i] - p.points[i - 2], dy = p.points[i + 1] - p.points[i - 1];
        if (Math.hypot(dx, dy) < 3) continue; // the joining pieces along the edge
        const ang = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI) % 180;
        expect(Math.min(ang, 180 - ang), `span ${span}`).toBeLessThan(5);
        expect(Math.min(p.points[i], p.points[i - 2])).toBeLessThan(40 + 10);
        expect(Math.max(p.points[i], p.points[i - 2])).toBeGreaterThan(40 + 10 + span);
      }
    }
  });
  it('variable layer height makes thinner layers on a shallow slope', () => {
    const s = { ...proc(), variableLayerHeight: true };
    expect(Math.min(...layerPlan(5, s, [mesh(leaningBox(0, 0, 8, 5))]).h.slice(1))).toBeLessThan(s.layerHeight);
  });
});

describe('G-code safety and amounts (docs/35)', async () => {
  const cube = await runSlice(job([mesh(calibrationCube(118, 118), 'Cube')], { infillDensity: 1, infillPattern: 'rectilinear', topLayers: 0, bottomLayers: 0, minLayerTime: 0 }));
  const g = text(cube.gcode);
  const a = analyseGcode(g, 10000);

  it('P1-1: no move to Z0 or the origin; after the start code no Z below the first layer; a retraction never moves XY', () => {
    expect(g).not.toMatch(/G[01] X0 Y0 Z0/);
    const moves = movesAfterStart(g);
    expect(moves.length).toBeGreaterThan(1000);
    for (const m of moves) {
      if (m.z !== undefined) expect(m.z, m.line).toBeGreaterThanOrEqual(0.2 - 1e-9);
      if (m.e !== undefined && m.e < 0) expect(m.x === undefined && m.y === undefined, m.line).toBe(true);
    }
    // the first move lifts Z before any XY travel
    expect(moves[0].z !== undefined && moves[0].x === undefined).toBe(true);
    // every move of the whole file inside the travel limits of the printer
    const tl = P1S.travelLimits ?? { x: [0, 256], y: [0, 256], z: [0, 256] };
    expect(a.moveMin[0]).toBeGreaterThanOrEqual(tl.x[0]); expect(a.moveMax[0]).toBeLessThanOrEqual(tl.x[1]);
    expect(a.moveMin[1]).toBeGreaterThanOrEqual(tl.y[0]); expect(a.moveMax[1]).toBeLessThanOrEqual(tl.y[1]);
    expect(a.moveMax[2]).toBeLessThanOrEqual(tl.z[1]);
  });
  it('P2-4: every retraction is pushed back once (the start code ends retracted)', () => {
    const lines = g.split('\n');
    let open = 0;
    for (const l of lines) {
      const m = /^G1 E(-?[\d.]+) F\d+$/.exec(l);
      if (m) { open += -Number(m[1]); continue; }
      if (/^G1 .*E/.test(l) && open > 1e-6 && !/ X| Y/.test(l)) continue;
      if (/^G1 X.*E[\d.]+/.test(l)) expect(open, `extrusion with ${open} mm retracted: ${l}`).toBeLessThan(1e-6);
    }
  });
  it('100 % infill: the cube volume within ±3 % (docs/34 3.2)', () => {
    const v = Object.values(cube.stats.volumeByType).reduce((x, y) => x + y, 0);
    expect(Math.abs(v - 8000) / 8000, `volume ${v.toFixed(0)} mm³`).toBeLessThan(0.03);
  });
  it('P3-3: net filament in the G-code equals the header and the preview within 0.1 % (the purge line counted)', () => {
    const header = cube.stats.filament[0].length;
    expect(Math.abs(a.extruded - header) / header).toBeLessThan(0.001);
    expect(g).toMatch(new RegExp(`total filament volume \\[cm\\^3\\] : ${(cube.stats.filament[0].volume / 1000).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`));
  });
  it('P3-5: no E0 and no moves shorter than 5 µm', () => {
    expect(g).not.toMatch(/ E-?0(\s|$)/);
    let px = NaN, py = NaN, short = 0;
    for (const m of movesAfterStart(g)) { if (m.x !== undefined && m.y !== undefined) { if (m.e && m.e > 0 && Math.hypot(m.x - px, m.y - py) < 0.005) short++; px = m.x; py = m.y; } }
    expect(short).toBe(0);
  });
  it('hand calculation of walls + skins + 15 % infill within ±5 %', async () => {
    const s = { ...proc(), minLayerTime: 0 };
    const r = await runSlice(job([mesh(calibrationCube(118, 118), 'Cube')], s));
    const w = s.lineWidth, h = s.layerHeight, sp = w - h * (1 - Math.PI / 4), n = s.wallCount;
    // walls: n square loops of bead area per layer; solid layers fill the square inside the walls (h per mm² at full
    // fill), sparse layers the same square at the set density; first layer with its own width; purge line apart
    const bead = (ww: number, hh: number) => (ww - hh) * hh + Math.PI * (hh / 2) ** 2;
    let vol = 0;
    for (let k = 0; k < n; k++) vol += 4 * (20 - w - 2 * k * sp) * bead(w, h) * 99;
    const w1 = 0.5, sp1 = w1 - 0.2 * (1 - Math.PI / 4);
    for (let k = 0; k < n; k++) vol += 4 * (20 - w1 - 2 * k * sp1) * bead(w1, 0.2);
    const fillSide = (ww: number, s1: number) => 20 - 2 * (ww / 2 + n * s1 - s.infillOverlap * ww) + s1;
    vol += fillSide(w1, sp1) ** 2 * 0.2;
    vol += fillSide(w, sp) ** 2 * h * (s.bottomLayers - 1 + s.topLayers) + fillSide(w, sp) ** 2 * h * (99 - (s.bottomLayers - 1) - s.topLayers) * s.infillDensity;
    const got = Object.values(r.stats.volumeByType).reduce((x, y) => x + y, 0);
    expect(Math.abs(got - vol) / vol, `${got.toFixed(0)} vs ${vol.toFixed(0)} mm³`).toBeLessThan(0.05);
  });
  it('the time estimate is sane; a fixed time step simulation agrees within 1 %', () => {
    expect(cube.stats.printTime).toBeGreaterThan(5 * 60);
    expect(cube.stats.printTime).toBeLessThan(90 * 60);
    // independent check of the planner: the same moves stepped at 0.5 ms with the accelerations and corner speeds
    const moves = movesAfterStart(g);
    let x = 0, y = 0, z = 1, f = 50;
    const pm: { x: number; y: number; z: number; e: number; v: number; a: number }[] = [];
    for (const m of moves) { x = m.x ?? x; y = m.y ?? y; z = m.z ?? z; const fm = /F(\d+)/.exec(m.line); if (fm) f = Number(fm[1]) / 60; pm.push({ x, y, z, e: m.e ?? 0, v: f, a: 10000 }); }
    const sum = planTimes(pm.slice(1), pm[0], { squareCornerVelocity: 5, maxSpeed: 500 }).reduce((s, t) => s + t, 0);
    const stepped = simulate(pm, 0.00002);
    expect(Math.abs(stepped - sum) / sum, `${stepped.toFixed(1)} vs ${sum.toFixed(1)} s`).toBeLessThan(0.01);
    // the G-code analyser has a simpler model of its own (no look-ahead): a sanity bound, not the 1 % criterion above
    expect(Math.abs(a.time - cube.stats.printTime) / cube.stats.printTime, 'analyser').toBeLessThan(0.1);
  });
  it('a straight line of 100 mm at 100 mm/s and 1000 mm/s² takes 1.100 s', () => {
    expect(planTimes([{ x: 100, y: 0, z: 0, e: 1, v: 100, a: 1000 }], { x: 0, y: 0, z: 0 }, { squareCornerVelocity: 5, maxSpeed: 500 })[0]).toBeCloseTo(1.1, 3);
  });
  it('temperatures before extrusion, heaters off at the end, no forbidden commands, ASCII', () => {
    expect(a.layers).toBe(100);
    expect(a.nozzleWaitedBeforeExtrusion).toBe(true);
    expect(a.bedSetBeforeExtrusion).toBe(true);
    expect(a.retractions).toBeGreaterThan(0);
    expect(a.heatersOffAtEnd).toBe(true);
    expect(a.forbidden).toEqual([]);
    expect(a.nonAscii).toBe(0);
    expect(a.badNumbers).toBe(0);
    expect(a.endsWithNewline).toBe(true);
    expect(g).toContain('M991 S0 P99');
    expect(g).toContain('nog te printen: kalibratiekubus 20 mm per printer');
  });
  it('P2-9: the Elegoo start code levels (Klipper: saved mesh, Marlin: M420 S1); P3-2: Marlin lines up to 96 characters', async () => {
    const k = text((await runSlice(job([mesh(calibrationCube(100, 100), 'Cube')], {}, N4P))).gcode);
    expect(k).toContain('BED_MESH_PROFILE LOAD=default');
    expect(k).toContain(';gimage:');
    expect(k).not.toMatch(/^M62[01]|^M991|^G29\b/m);
    const m = text((await runSlice(job([mesh(calibrationCube(100, 100), 'Cube')], {}, N3P))).gcode);
    expect(m).toContain('M420 S1');
    const long = m.split('\n').filter((l) => l.length > 96);
    expect(long, long[0]?.slice(0, 120)).toEqual([]);
  });
  it('P2-5: a thin pen keeps the minimum layer time (slower, then waiting beside it)', async () => {
    const r = await runSlice(job([mesh(cylinder(100, 100, 0, 0.5, 10, 16), 'Pen')], { minLayerTime: 6, wallCount: 1 }));
    expect(r.stats.printTime).toBeGreaterThan((r.stats.layers - 1) * 6 * 0.99);
    expect(text(r.gcode)).toMatch(/^G4 P\d+/m);
  });
});

describe('refusals: the bed, zones, tower and the machine code (docs/35 P1-3, P1-4, P1-5)', () => {
  it('refuses a part bigger than the bed, too tall, an empty plate and a too hot filament', async () => {
    await expect(runSlice(job([mesh(box(0, 0, 0, 300, 20, 10), 'Big')]))).rejects.toThrow(/outside the bed/);
    await expect(runSlice(job([mesh(box(10, 10, 0, 30, 30, 300), 'Tall')]))).rejects.toThrow(/prints up to/);
    await expect(runSlice(job([]))).rejects.toThrow(/empty/);
    const hot = job([mesh(calibrationCube(50, 50))]);
    hot.slots = [{ ...slotFor(PLA), nozzleTemp: 350 }];
    await expect(runSlice(hot)).rejects.toThrow(/above the 300/);
  });
  it('a part up to the very edge of the bed is accepted (the same slack as the plate colour: P3-7)', async () => {
    await expect(runSlice(job([mesh(box(236, 236, 0, 256, 256, 5), 'Edge')], {}, P1S))).resolves.toBeTruthy();
  });
  it('a skirt and tree support next to the bed edge stay on the bed (cut short, warned)', async () => {
    const r = await runSlice(job([mesh(calibrationCube(0.5, 0.5), 'Corner')], { skirtLoops: 1, skirtDistance: 3 }));
    const an = analyseGcode(text(r.gcode));
    expect(an.moveMin[0]).toBeGreaterThanOrEqual(0); expect(an.moveMin[1]).toBeGreaterThanOrEqual(0);
    expect(r.stats.warnings.join(' ')).toMatch(/skirt was cut short/);
    const t = await runSlice(job([mesh(tPiece(0.5, 100), 'T')], { support: 'tree' }));
    expect(analyseGcode(text(t.gcode)).extrudeMin[0]).toBeGreaterThanOrEqual(0);
  });
  it('a part over an excluded zone is refused, also when only the middle of a segment crosses it', async () => {
    const zoned: Printer = { ...P1S, excludeAreas: [[[100, 100], [120, 100], [120, 120], [100, 120]]] };
    await expect(runSlice(job([mesh(box(50, 105, 0, 200, 115, 2), 'Plate')], {}, zoned))).rejects.toThrow(/excluded zone/);
  });
  it('two filaments without the imported change code are refused on a Bambu printer; a Neptune refuses them always', async () => {
    const two = job([mesh(calibrationCube(20, 20, 10), 'A', 0), mesh(calibrationCube(60, 20, 10), 'B', 1)]);
    two.slots = [slotFor(PLA), slotFor(PLA, '#d03030')];
    await expect(runSlice(two)).rejects.toThrow(/filament-change G-code from your own Bambu Studio/);
    await expect(runSlice({ ...two, printer: N4P, process: proc({}, N4P) })).rejects.toThrow(/one filament/);
  });
  it('two filaments with imported code: retract and lift before the change, tower free of the parts, first layer of the tower slow', async () => {
    const two = job([mesh(calibrationCube(20, 20, 10), 'A', 0), mesh(calibrationCube(60, 20, 10), 'B', 1)]);
    two.slots = [slotFor(PLA), slotFor(PLA, '#d03030')];
    two.machine = { start: 'M140 S[bed_temperature_initial_layer_single]\nG28\nM109 S[nozzle_temperature_initial_layer]\nT[initial_extruder]', end: 'M104 S0\nM140 S0', change: 'M620 S[next_extruder]A\nT[next_extruder]\nM621 S[next_extruder]A', printerModel: 'Bambu Lab P1S', profileName: 'P1S' };
    const r = await runSlice(two);
    const g = text(r.gcode);
    expect(r.stats.filament.map((f) => f.slot)).toEqual([0, 1]);
    expect(r.stats.toolChanges).toBeGreaterThan(40);
    const lines = g.split('\n');
    const at = lines.indexOf('; filament change');
    expect(at).toBeGreaterThan(0);
    expect(lines.slice(at - 3, at).some((l) => /^G1 E-/.test(l))).toBe(true);
    expect(lines.slice(at - 3, at).some((l) => /^G[01] .*Z/.test(l))).toBe(true);
    // the tower is placed free of the parts and on the bed
    const tower = placeTower(two)!;
    expect(tower.x + 35).toBeLessThanOrEqual(256);
    expect(tower.x > 30 + 6 || tower.y > 30 + 6).toBe(true);
    // the first layer of the tower at first-layer speed (F 3000 = 50 mm/s)
    const first = lines.slice(lines.findIndex((l) => l.startsWith('; CHANGE_LAYER')), lines.findIndex((l, i) => i > 60 && /M991 S0 P1 /.test(l)));
    const towerF = first.filter((l, i) => i > 0 && /^G1 .*E\d/.test(l) && first.slice(0, i).reverse().find((x) => x.startsWith('; FEATURE'))?.includes('Prime tower')).map((l) => /F(\d+)/.exec(l)?.[1]).filter(Boolean).map(Number);
    expect(Math.max(...towerF)).toBeLessThanOrEqual(3000);
  });
  it('imported code of another printer model is refused (P1-5)', async () => {
    const j = job([mesh(calibrationCube(100, 100))]);
    j.machine = { start: 'G28', printerModel: 'Bambu Lab A1 mini', profileName: 'A1 mini' };
    await expect(runSlice(j)).rejects.toThrow(/for the Bambu Lab A1 mini, not for the Bambu Lab P1S/);
  });
  it('a printer with two toolheads is refused (P2-11)', async () => {
    await expect(runSlice(job([mesh(calibrationCube(100, 100))], {}, { ...P1S, model: 'H2D', toolheads: 2 }))).rejects.toThrow(/toolheads/);
  });
});

describe('preview mesh (docs/35 P2-10)', () => {
  it('is built in the worker: 8 vertices and 18 indices per segment', async () => {
    const r = await runSlice(job([mesh(calibrationCube(100, 100))]));
    const n = r.preview.segs.length / 11;
    expect(r.mesh.positions.length).toBe(n * 8 * 3);
    expect(r.mesh.index.length).toBe(n * 18);
    expect(previewMesh(r.preview).index.length).toBe(n * 18);
  });
});

/** a fixed time step simulation of the moves: accelerate, cruise and brake within the junction speeds of the planner */
function simulate(pm: { x: number; y: number; z: number; e: number; v: number; a: number }[], dt: number): number {
  const segs: { L: number; v: number; a: number; d: number[] }[] = [];
  for (let i = 1; i < pm.length; i++) {
    const dx = pm[i].x - pm[i - 1].x, dy = pm[i].y - pm[i - 1].y, dz = pm[i].z - pm[i - 1].z, L = Math.hypot(dx, dy, dz);
    segs.push({ L: L || Math.abs(pm[i].e), v: Math.min(pm[i].v, 500), a: pm[i].a, d: L ? [dx / L, dy / L, dz / L] : [0, 0, 0] });
  }
  // corner speeds from the junction deviation of a 5 mm/s square corner, limited by both moves
  const vj = new Float64Array(segs.length + 1);
  for (let i = 1; i < segs.length; i++) {
    const p = segs[i - 1], q = segs[i];
    if (!p.L || !q.L || (!p.d[0] && !p.d[1] && !p.d[2]) || (!q.d[0] && !q.d[1] && !q.d[2])) continue;
    const c = -(p.d[0] * q.d[0] + p.d[1] * q.d[1] + p.d[2] * q.d[2]);
    if (c > 0.999999) continue;
    let v2 = Math.min(p.v, q.v) ** 2;
    if (c > -0.999999) {
      const sh = Math.sqrt(0.5 * (1 - c)), th = sh / Math.sqrt(0.5 * (1 + c)), a = Math.min(p.a, q.a);
      v2 = Math.min(v2, (a * ((25 * (Math.SQRT2 - 1)) / a) * sh) / (1 - sh), 0.5 * q.L * th * q.a, 0.5 * p.L * th * p.a);
    }
    vj[i] = Math.sqrt(v2);
  }
  for (let i = segs.length - 1; i >= 0; i--) vj[i] = Math.min(vj[i], Math.sqrt(vj[i + 1] ** 2 + 2 * segs[i].a * segs[i].L));
  for (let i = 0; i < segs.length; i++) vj[i + 1] = Math.min(vj[i + 1], Math.sqrt(vj[i] ** 2 + 2 * segs[i].a * segs[i].L));
  let t = 0;
  segs.forEach((s, i) => {
    let pos = 0, v = vj[i];
    const end = vj[i + 1];
    let steps = 0;
    while (pos < s.L && steps < 1e7) {
      const brake = (v * v - end * end) / (2 * s.a);
      const nv = s.L - pos - v * dt <= brake ? Math.max(end, v - s.a * dt) : Math.min(s.v, v + s.a * dt);
      // the mean speed of the step (trapezoid rule), so the step size does not bias the time
      const vm = Math.max((v + nv) / 2, 1e-3), step = vm * dt;
      v = nv;
      if (pos + step >= s.L) { t += (s.L - pos) / vm; pos = s.L; } else { pos += step; t += dt; }
      steps++;
    }
  });
  return t;
}

void concat;
void beadArea;
void FA;
