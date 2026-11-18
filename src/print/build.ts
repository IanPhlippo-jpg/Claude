/**
 * Tool paths -> moves -> G-code, time and filament (docs/34 2.4 order, 2.6 time, 2.7 writer).
 *
 * Order per layer: the filament still loaded first; per filament support, then island by island inner walls before the
 * outer wall, then skins, bridges and infill, nearest first. Seams per loop (aligned, rear, nearest, random with a
 * fixed seed). Retraction (by the slicer, not the firmware) on travels longer than retractMinTravel, with Z hop.
 * Speeds are limited by the maximum volumetric speed of the filament and slowed down for the minimum layer time.
 * Tool changes (multi-material) go over the prime tower, which purges the flush volume.
 */
import { contains, area as pathArea } from './geom/boolean';
import { planTimes, type PlanMove } from './motion';
import { dialectFor, type Dialect } from './gcode/dialects';
import { ascii, fe, ff, fillTemplate, fmt, fx } from './gcode/format';
import { bambuVars, fillBambuTemplate } from './gcode/importTemplate';
import { LINE_TYPE_ID, SEG_STRIDE, type LineType, type Material, type PreviewData, type Printer, type ProcessSettings, type SliceLayer, type SliceStats, type ToolPath } from './types';
import { bedTempOf } from './database';

export interface SlotInfo { material: Material; color: string; nozzleTemp: number; bedTemp: number }

export interface BuildJob {
  printer: Printer;
  nozzle: number;
  process: ProcessSettings;
  slots: SlotInfo[];
  name: string;
  appVersion: string;
  /** imported start/end code (Bambu Studio installation of the user), replaces the own templates */
  startGcode?: string;
  endGcode?: string;
  /** thumbnail blocks for the header (Klipper/Marlin), already formatted */
  thumbnailBlock?: string;
}

type Item =
  | { k: 'move'; x: number; y: number; z: number; e: number; v: number; type: number; w: number; h: number; fil: number }
  | { k: 'raw'; text: string };

const filamentArea = (m: Material) => Math.PI * ((m.diameter ?? 1.75) / 2) ** 2;
/** cross-section of a bead: a rectangle with half circles (docs/34 2.4) */
export const beadArea = (w: number, h: number) => (w > h ? (w - h) * h + Math.PI * (h / 2) ** 2 : Math.PI * (w / 2) ** 2);

export interface BuildResult { gcode: Uint8Array[]; stats: SliceStats; preview: PreviewData }

/** the loop turned to start at the seam vertex */
function rotateTo(pts: number[], k: number): number[] {
  return [...pts.slice(2 * k), ...pts.slice(0, 2 * k)];
}

export function buildGcode(layers: SliceLayer[], job: BuildJob): BuildResult {
  const s = job.process, P = job.printer;
  const D: Dialect = dialectFor(P);
  const accel = Math.min(s.accel, P.maxAccel);
  const travelV = Math.min(s.speedTravel, P.maxSpeed);
  const items: Item[][] = [];
  let cx = 0, cy = 0, cz = 0, curFil = -1, rngSeed = 1;
  let lastType: LineType | null = null;
  const rnd = () => ((rngSeed = (rngSeed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const lastSeam = new Map<string, [number, number]>();
  const used = new Set<number>();
  for (const l of layers) for (const p of l.paths) used.add(p.filament);
  const slotsUsed = [...used].sort((a, b) => a - b);
  const multi = slotsUsed.length > 1;
  let lastChangeLayer = -1;
  if (multi) layers.forEach((l, i) => { if (new Set(l.paths.map((p) => p.filament)).size > 1) lastChangeLayer = i; });
  const warnings: string[] = [];
  let toolChanges = 0;

  const pickSeam = (pts: number[], key: string): number => {
    const n = pts.length / 2;
    if (s.seam === 'rear') { let b = 0; for (let i = 1; i < n; i++) if (pts[2 * i + 1] > pts[2 * b + 1]) b = i; return b; }
    if (s.seam === 'random') return Math.floor(rnd() * n);
    const ref = s.seam === 'nearest' ? [cx, cy] : lastSeam.get(key);
    if (ref) { let b = 0, bd = Infinity; for (let i = 0; i < n; i++) { const d = Math.hypot(pts[2 * i] - ref[0], pts[2 * i + 1] - ref[1]); if (d < bd) { bd = d; b = i; } } return b; }
    // aligned, first layer: the sharpest corner, else the rear
    let b = -1, best = 0.3;
    for (let i = 0; i < n; i++) {
      const a = (i + n - 1) % n, c = (i + 1) % n;
      const ux = pts[2 * i] - pts[2 * a], uy = pts[2 * i + 1] - pts[2 * a + 1], vx = pts[2 * c] - pts[2 * i], vy = pts[2 * c + 1] - pts[2 * i + 1];
      const turn = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
      if (turn > best) { best = turn; b = i; }
    }
    if (b >= 0) return b;
    b = 0; for (let i = 1; i < n; i++) if (pts[2 * i + 1] > pts[2 * b + 1]) b = i;
    return b;
  };

  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    const out: Item[] = [];
    items.push(out);
    const z = L.z, h = L.height;
    // a short hop from one fill line to the next of the same kind stays inside that area: no retraction, no Z hop
    // (an approximation of "retract only when crossing a wall"; walls and longer travels always retract)
    const FILL = new Set<LineType>(['skin', 'infill', 'support', 'supportInterface', 'bridge', 'primeTower']);
    const travel = (x: number, y: number, next?: LineType) => {
      const d = Math.hypot(x - cx, y - cy);
      if (d < 1e-4) return;
      const inside = !!next && next === lastType && FILL.has(next) && d < 5;
      const retract = !inside && d > s.retractMinTravel && s.retractLength > 0;
      if (retract) {
        out.push({ k: 'move', x: cx, y: cy, z: cz, e: -s.retractLength, v: s.retractSpeed, type: -2, w: 0, h, fil: curFil });
        if (s.zHop > 0) out.push({ k: 'move', x: cx, y: cy, z: z + s.zHop, e: 0, v: Math.min(travelV, 20), type: -1, w: 0, h, fil: curFil });
      }
      out.push({ k: 'move', x, y, z: retract && s.zHop > 0 ? z + s.zHop : z, e: 0, v: travelV, type: -1, w: 0, h, fil: curFil });
      if (retract) {
        if (s.zHop > 0) out.push({ k: 'move', x, y, z, e: 0, v: Math.min(travelV, 20), type: -1, w: 0, h, fil: curFil });
        out.push({ k: 'move', x, y, z, e: s.retractLength, v: s.retractSpeed, type: -3, w: 0, h, fil: curFil });
      }
      cx = x; cy = y; cz = z;
    };
    const extrudePath = (p: ToolPath) => {
      const mat = job.slots[p.filament]?.material ?? job.slots[0].material;
      const ph = p.type === 'bridge' ? Math.max(h, p.width) : h;
      const A = beadArea(p.width, p.type === 'bridge' ? p.width : h);
      const vlim = mat.maxVolumetricSpeed / (p.width * Math.min(ph, h));
      const v = Math.max(1, Math.min(p.speed, vlim, P.maxSpeed));
      let pts = p.points;
      if (p.closed) {
        const k = pickSeam(pts, `${p.type}:${p.filament}`);
        pts = rotateTo(pts, k);
        if (p.type === 'outerWall') lastSeam.set(`${p.type}:${p.filament}`, [pts[0], pts[1]]);
        pts = [...pts, pts[0], pts[1]];
      }
      travel(pts[0], pts[1], p.type);
      lastType = p.type;
      out.push({ k: 'raw', text: D.feature(p.type) });
      if (p.type === 'bridge') out.push({ k: 'raw', text: D.fan(100) });
      for (let i = 2; i + 1 < pts.length; i += 2) {
        const d = Math.hypot(pts[i] - cx, pts[i + 1] - cy);
        if (d < 1e-5) continue;
        out.push({ k: 'move', x: pts[i], y: pts[i + 1], z, e: (d * A) / filamentArea(mat), v, type: LINE_TYPE_ID[p.type], w: p.width, h, fil: p.filament });
        cx = pts[i]; cy = pts[i + 1]; cz = z;
      }
      if (p.type === 'bridge') out.push({ k: 'raw', text: D.fan(li === 0 ? 0 : mat.cooling) });
    };
    const fanFor = (fil: number) => (li === 0 ? 0 : job.slots[fil]?.material.cooling ?? 100);
    // the prime tower (multi-material, up to the last tool change): a wall loop and sparse lines on every layer, and
    // after a tool change dense lines until the flush volume is purged
    const tower = (fil: number, purge: boolean) => {
      if (!multi || li > lastChangeLayer) return;
      const W = s.primeTowerWidth, X = s.primeTowerX, Y = s.primeTowerY, w = s.lineWidth;
      extrudePath({ type: 'primeTower', points: [X, Y, X + W, Y, X + W, Y + W, X, Y + W], closed: true, width: w, speed: s.speedInnerWall, filament: fil });
      const need = purge ? s.flushVolume / beadArea(w, h) : 0;
      const gap = purge ? w * 0.9 : w / 0.15;
      let got = 0;
      const pts: number[] = [];
      for (let y = Y + w, k = 0; y < Y + W - w / 2 && (!purge || got < need); y += gap, k++) {
        const [a, b] = k % 2 ? [X + W - w, X + w] : [X + w, X + W - w];
        pts.push(a, y, b, y);
        got += W - 2 * w;
      }
      if (purge && got < need) warnings.push(`Layer ${li + 1}: the prime tower is too small for the flush volume; make it wider.`);
      if (pts.length >= 4) extrudePath({ type: 'primeTower', points: pts, closed: false, width: w, speed: s.speedInfill, filament: fil });
    };
    // group by filament, the loaded one first
    const fils = [...new Set(L.paths.map((p) => p.filament))].sort((a, b) => (a === curFil ? -1 : b === curFil ? 1 : a - b));
    if (!fils.length && li <= lastChangeLayer && curFil >= 0) fils.push(curFil);
    for (const fil of fils) {
      if (fil !== curFil) {
        if (curFil >= 0) toolChanges++;
        if (multi) {
          for (const t of D.toolChange(fil)) out.push({ k: 'raw', text: t });
          const temp = job.slots[fil]?.nozzleTemp;
          if (curFil >= 0 && temp) out.push({ k: 'raw', text: `M109 S${Math.round(temp)}` });
        }
        const changed = curFil >= 0;
        curFil = fil;
        out.push({ k: 'raw', text: D.fan(fanFor(fil)) });
        tower(fil, changed);
      } else {
        out.push({ k: 'raw', text: D.fan(fanFor(fil)) });
        if (fil === fils[0]) tower(fil, false);
      }
      const mine = L.paths.filter((p) => p.filament === fil);
      ordered(mine).forEach(extrudePath);
    }
  }

  function ordered(paths: ToolPath[]): ToolPath[] {
    const out: ToolPath[] = [];
    const rank = (t: LineType) => (t === 'skirt' ? 0 : t === 'support' || t === 'supportInterface' ? 1 : t === 'innerWall' || t === 'outerWall' ? 2 : 3);
    let px = cx, py = cy;
    const nn = (list: ToolPath[], allowReverse: boolean) => {
      const left = list.slice();
      while (left.length) {
        let bi = 0, bd = Infinity, rev = false;
        for (let i = 0; i < left.length; i++) {
          const p = left[i].points;
          const d0 = Math.hypot(p[0] - px, p[1] - py);
          if (d0 < bd) { bd = d0; bi = i; rev = false; }
          if (allowReverse && !left[i].closed) { const d1 = Math.hypot(p[p.length - 2] - px, p[p.length - 1] - py); if (d1 < bd) { bd = d1; bi = i; rev = true; } }
        }
        let p = left.splice(bi, 1)[0];
        if (rev) { const r: number[] = []; for (let i = p.points.length - 2; i >= 0; i -= 2) r.push(p.points[i], p.points[i + 1]); p = { ...p, points: r }; }
        out.push(p);
        px = p.points[p.points.length - 2]; py = p.points[p.points.length - 1];
      }
    };
    nn(paths.filter((p) => rank(p.type) === 0), false);
    nn(paths.filter((p) => rank(p.type) === 1), true);
    // walls island by island: the counter-clockwise outer walls are the islands; the rest go with the smallest around them
    const walls = paths.filter((p) => rank(p.type) === 2);
    const anchors = walls.filter((p) => p.type === 'outerWall' && pathArea(p.points) > 0).sort((a, b) => pathArea(a.points) - pathArea(b.points));
    const groups = new Map<ToolPath, ToolPath[]>(anchors.map((a) => [a, []]));
    const loose: ToolPath[] = [];
    for (const w of walls) {
      if (groups.has(w)) continue;
      const a = anchors.find((x) => contains([x.points], w.points[0], w.points[1]));
      if (a) groups.get(a)!.push(w); else loose.push(w);
    }
    const isl = anchors.map((a) => ({ a, rest: groups.get(a)! }));
    while (isl.length) {
      let bi = 0, bd = Infinity;
      isl.forEach((g, i) => { const d = Math.hypot(g.a.points[0] - px, g.a.points[1] - py); if (d < bd) { bd = d; bi = i; } });
      const g = isl.splice(bi, 1)[0];
      nn(g.rest.filter((p) => p.type === 'innerWall'), false);
      nn([g.a, ...g.rest.filter((p) => p.type === 'outerWall')], false);
    }
    nn(loose, false);
    nn(paths.filter((p) => rank(p.type) === 3), true);
    return out;
  }

  // minimum layer time: slow the extrusion of fast layers down (not below 10 mm/s)
  const plan = (list: Item[], from: { x: number; y: number; z: number }) => {
    const moves = list.filter((i): i is Extract<Item, { k: 'move' }> => i.k === 'move');
    return { moves, t: planTimes(moves.map((m): PlanMove => ({ x: m.x, y: m.y, z: m.z, e: m.e, v: m.v, a: m.type === -1 ? P.maxAccel : accel })), from, { squareCornerVelocity: 5,
      maxSpeed: P.maxSpeed }) };
  };
  const layerTimes: number[] = [];
  const timeByType: Record<string, number> = {};
  const volumeByType: Record<string, number> = {};
  let pos = { x: 0, y: 0, z: 0 };
  for (let li = 0; li < items.length; li++) {
    let { moves, t } = plan(items[li], pos);
    let total = t.reduce((a, b) => a + b, 0);
    if (total < s.minLayerTime && total > 0 && li > 0) {
      const f = Math.max(0.1, Math.min(1, total / s.minLayerTime));
      for (const m of moves) if (m.type >= 0) m.v = Math.max(10, m.v * f);
      ({ moves, t } = plan(items[li], pos));
      total = t.reduce((a, b) => a + b, 0);
    }
    moves.forEach((m, i) => {
      const name = m.type >= 0 ? Object.keys(LINE_TYPE_ID)[m.type] : 'travel';
      timeByType[name] = (timeByType[name] ?? 0) + t[i];
      if (m.type >= 0) volumeByType[name] = (volumeByType[name] ?? 0) + m.e * filamentArea(job.slots[m.fil]?.material ?? job.slots[0].material);
    });
    layerTimes.push(total);
    const last = moves[moves.length - 1];
    if (last) pos = { x: last.x, y: last.y, z: last.z };
  }
  const printTime = layerTimes.reduce((a, b) => a + b, 0);
  // heating, homing and levelling: a fixed allowance per printer family (an assumption until measured, docs/34 2.6)
  const prepTime = P.gcodeFlavor === 'bambu' ? 300 : 180;

  // filament per slot
  const eBySlot = new Map<number, number>();
  for (const list of items) for (const it of list) if (it.k === 'move' && it.type >= 0) eBySlot.set(it.fil, (eBySlot.get(it.fil) ?? 0) + it.e);
  const filament = [...eBySlot.entries()].sort((a, b) => a[0] - b[0]).map(([slot, len]) => {
    const m = job.slots[slot]?.material ?? job.slots[0].material;
    const volume = len * filamentArea(m);
    const grams = (volume / 1000) * m.density;
    return { slot, length: len, volume, grams, cost: (grams / 1000) * m.pricePerKg };
  });
  const stats: SliceStats = { layers: layers.length, printTime, totalTime: printTime + prepTime, filament, timeByType, volumeByType, toolChanges, warnings };

  // G-code text
  const slot0 = job.slots[slotsUsed[0] ?? 0] ?? job.slots[0];
  const maxZ = layers.length ? layers[layers.length - 1].z : 0;
  const [bx, by, bz] = P.buildVolume;
  const purgeY = Math.min(3, by / 50);
  const vars: Record<string, string | number> = {
    nozzle_temp: slot0.nozzleTemp, bed_temp: slot0.bedTemp, first_layer_height: s.firstLayerHeight,
    purge_x0: Math.min(20, bx * 0.1), purge_x1: Math.min(120, bx * 0.6), purge_y: purgeY, purge_z: Math.max(0.2, s.firstLayerHeight),
    purge_e: (Math.min(120, bx * 0.6) - Math.min(20, bx * 0.1)) * beadArea(s.firstLayerLineWidth * 1.2, Math.max(0.2, s.firstLayerHeight)) / filamentArea(slot0.material),
    retract: s.retractLength, park_z: Math.min(bz, P.travelLimits?.z[1] ?? bz, maxZ + 10), park_x: Math.min(bx - 10, bx / 2, P.travelLimits?.x[1] ?? bx), park_y: Math.min(by - 10,
      (P.travelLimits?.y[1] ?? by) - 10),
    print_minutes: Math.round((printTime + prepTime) / 60), max_z: maxZ, bed_x: bx, bed_y: by,
  };
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const lines: string[] = [];
  const flush = () => { if (lines.length) { chunks.push(enc.encode(lines.join('\n') + '\n')); lines.length = 0; } };
  // imported start/end code (the user's Bambu Studio installation) is filled with the Bambu names of our values
  const bv = bambuVars({ nozzle_temp: slot0.nozzleTemp, bed_temp: slot0.bedTemp, first_layer_height: s.firstLayerHeight, max_z: maxZ, bed_x: bx, bed_y: by, nozzle: job.nozzle,
    layer_height: s.layerHeight, filament_type: slot0.material.type ?? slot0.material.name, printer_model: `${P.brand} ${P.model}` });
  const start = job.startGcode ? fillBambuTemplate(job.startGcode, bv) : fillTemplate(D.startTemplate, vars);
  const end = job.endGcode ? fillBambuTemplate(job.endGcode, bv) : fillTemplate(D.endTemplate, vars);
  if (D.flavor === 'bambu') lines.push('; EXECUTABLE_BLOCK_START');
  lines.push(D.accel(accel), ...start.split('\n'), 'M83', 'G90');
  if (s.pressureAdvance != null) lines.push(D.flavor === 'klipper' ? `SET_PRESSURE_ADVANCE ADVANCE=${fmt(s.pressureAdvance, 4)}` : `M900 K${fmt(s.pressureAdvance, 4)}`);
  let elapsed = 0;
  const total = printTime;
  let lx = NaN, ly = NaN, lz = NaN, lf = NaN;
  for (let li = 0; li < items.length; li++) {
    lines.push(...D.layerChange(li, layers[li].z, layers[li].height, layers.length));
    lines.push(D.progress((100 * elapsed) / Math.max(1, total), (total - elapsed) / 60));
    if (li === 1) {
      // after the first layer: the printing temperature of the loaded filament
      const t = job.slots[curFilAt(li)]?.nozzleTemp;
      if (t) lines.push(`M104 S${Math.round(t)}`);
    }
    for (const it of items[li]) {
      if (it.k === 'raw') { lines.push(it.text); continue; }
      let g = it.type === -1 ? 'G0' : 'G1';
      if (it.x !== lx) g += ` X${fx(it.x)}`;
      if (it.y !== ly) g += ` Y${fx(it.y)}`;
      if (it.z !== lz) g += ` Z${fx(it.z)}`;
      if (it.e !== 0) g += ` E${fe(it.e)}`;
      if (it.v !== lf) g += ` F${ff(it.v)}`;
      if (g === 'G0' || g === 'G1') continue;
      lines.push(g);
      lx = it.x; ly = it.y; lz = it.z; lf = it.v;
    }
    elapsed += layerTimes[li];
    if (lines.length > 20000) flush();
  }
  lines.push(...end.split('\n'));
  if (D.flavor === 'bambu') lines.push('; EXECUTABLE_BLOCK_END');
  flush();
  function curFilAt(li: number): number { const p = layers[li]?.paths[0]; return p ? p.filament : slotsUsed[0] ?? 0; }

  // header (written last, placed first: it carries the time and the filament)
  const grams = filament.reduce((a, f) => a + f.grams, 0), meters = filament.reduce((a, f) => a + f.length, 0) / 1000;
  const cm3 = filament.reduce((a, f) => a + f.volume, 0) / 1000;
  const hms = (sec: number) => `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m ${Math.round(sec % 60)}s`;
  const head: string[] = [];
  if (D.flavor === 'bambu') {
    head.push('; HEADER_BLOCK_START', `; Phlippo CAD ${ascii(job.appVersion)}`, `; model printing time: ${hms(printTime)}; total estimated time: ${hms(printTime + prepTime)}`,
      `; total layer number: ${layers.length}`, `; total filament length [mm] : ${filament.map((f) => fmt(f.length, 2)).join(',')}`,
      `; total filament volume [cm^3] : ${filament.map((f) => fmt(f.volume, 2)).join(',')}`, `; total filament weight [g] : ${filament.map((f) => fmt(f.grams, 2)).join(',')}`,
      `; filament_density: ${job.slots.map((x) => fmt(x.material.density, 2)).join(',')}`, `; filament_diameter: ${job.slots.map((x) => fmt(x.material.diameter ?? 1.75, 2)).join(',')}`,
      `; max_z_height: ${fmt(maxZ, 2)}`, '; HEADER_BLOCK_END', '', '; CONFIG_BLOCK_START',
      `; printer_model = ${ascii(`${P.brand} ${P.model}`)}`, `; nozzle_diameter = ${fmt(job.nozzle, 2)}`, `; layer_height = ${fmt(s.layerHeight, 2)}`,
      `; filament_type = ${job.slots.map((x) => ascii(x.material.type ?? x.material.name)).join(';')}`, `; filament_colour = ${job.slots.map((x) => x.color).join(';')}`,
      `; ${NOTE}`, '; CONFIG_BLOCK_END', '');
  } else {
    head.push(`; generated by Phlippo CAD ${ascii(job.appVersion)}`, `;FLAVOR:${D.flavor === 'marlin' ? 'Marlin' : 'Klipper'}`, `;TIME:${Math.round(printTime + prepTime)}`,
      `;Filament used: ${fmt(meters, 4)}m`, `;Layer height: ${fmt(s.layerHeight, 2)}`, `;LAYER_COUNT:${layers.length}`,
      `; estimated printing time (normal mode) = ${hms(printTime + prepTime)}`, `; filament used [mm] = ${fmt(meters * 1000, 2)}`, `; filament used [cm3] = ${fmt(cm3, 2)}`,
      `; filament used [g] = ${fmt(grams, 2)}`, `; printer: ${ascii(`${P.brand} ${P.model}`)}, nozzle ${fmt(job.nozzle, 2)} mm`, `; ${NOTE}`);
    if (job.thumbnailBlock) head.push(job.thumbnailBlock);
  }
  chunks.unshift(enc.encode(head.join('\n') + '\n'));

  return { gcode: chunks, stats, preview: previewOf(items, layers) };
}

const NOTE = 'Phlippo CAD: nog te printen: kalibratiekubus 20 mm per printer';

/** the flat preview arrays (docs/34 2.1) */
function previewOf(items: Item[][], layers: SliceLayer[]): PreviewData {
  let count = 0;
  for (const l of items) for (const it of l) if (it.k === 'move' && it.type !== -2 && it.type !== -3) count++;
  const segs = new Float32Array(count * SEG_STRIDE);
  const layerStart = new Uint32Array(items.length + 1);
  let k = 0, px = 0, py = 0;
  items.forEach((l, li) => {
    layerStart[li] = k;
    for (const it of l) {
      if (it.k !== 'move') continue;
      if (it.type === -2 || it.type === -3) continue;
      const o = k * SEG_STRIDE;
      segs[o] = px; segs[o + 1] = py; segs[o + 2] = it.x; segs[o + 3] = it.y; segs[o + 4] = it.z;
      segs[o + 5] = it.w; segs[o + 6] = it.h; segs[o + 7] = it.type < 0 ? LINE_TYPE_ID.travel : it.type; segs[o + 8] = it.v; segs[o + 9] = Math.max(0, it.fil);
      px = it.x; py = it.y; k++;
    }
  });
  layerStart[items.length] = k;
  return { segs, layerStart, layerZ: Float32Array.from(layers.map((l) => l.z)), layerHeight: Float32Array.from(layers.map((l) => l.height)) };
}

/** the slot data from a material (temperatures from the profile) */
export const slotFor = (m: Material, color?: string): SlotInfo => ({ material: m, color: color ?? m.color ?? '#f2f2f2', nozzleTemp: m.nozzleTemp.default, bedTemp: bedTempOf(m) });
