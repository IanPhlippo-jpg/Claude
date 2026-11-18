/**
 * Tool paths -> moves -> G-code, time and filament (docs/34 2.4 order, 2.6 time, 2.7 writer; docs/35 P1-1, P1-3, P1-4,
 * P2-4, P2-5).
 *
 * Order per layer: the filament still loaded first; per filament support, then island by island inner walls before the
 * outer wall, then skins, bridges and infill, nearest first. Seams per loop (aligned, rear, nearest, random with a
 * fixed seed). Retraction (by the slicer, not the firmware) on travels longer than retractMinTravel, with Z hop.
 *
 * Safety (docs/35 P1-1): the slicer starts with an unknown position; its first move lifts Z, then travels in XY, then
 * lowers to the layer; a retraction is E only, never with coordinates. The own start code ends retracted, so the first
 * travel does not retract again (P2-4). Every move is checked against the printable area, the excluded zones and the
 * travel limits (checkMoves); a slice with a move outside is refused.
 */
import { contains, area as pathArea } from './geom/boolean';
import { planTimes, type PlanMove } from './motion';
import { dialectFor, type Dialect } from './gcode/dialects';
import { writeGcode } from './gcode/writer';
import { fillTemplate } from './gcode/format';
import { bambuVars, fillBambuTemplate } from './gcode/importTemplate';
import { LINE_TYPE_ID, SEG_STRIDE, type LineType, type MachineCode, type Material, type PreviewData, type Printer, type ProcessSettings, type SliceLayer,
  type SliceStats, type ToolPath } from './types';
import { bedTempOf, printableArea } from './database';

export interface SlotInfo { material: Material; color: string; nozzleTemp: number; bedTemp: number }

export interface BuildJob {
  printer: Printer;
  nozzle: number;
  process: ProcessSettings;
  slots: SlotInfo[];
  name: string;
  appVersion: string;
  /** start, end and change code imported from the user's Bambu Studio (only for the matching printer model) */
  machine?: MachineCode;
  /** thumbnail blocks for the header (Klipper/Marlin), already formatted */
  thumbnailBlock?: string;
  /** where the own start code lays its purge line (free of the parts and the excluded zones) */
  purge?: { x0: number; x1: number; y: number };
}

export type Item =
  | { k: 'move'; x: number; y: number; z: number; e: number; v: number; type: number; w: number; h: number; fil: number; fan: number }
  | { k: 'e'; e: number; v: number }
  | { k: 'wait'; s: number }
  | { k: 'raw'; text: string };

const filamentArea = (m: Material) => Math.PI * ((m.diameter ?? 1.75) / 2) ** 2;
/** cross-section of a bead: a rectangle with half circles (docs/34 2.4) */
export const beadArea = (w: number, h: number) => (w > h ? (w - h) * h + Math.PI * (h / 2) ** 2 : Math.PI * (w / 2) ** 2);
/** the maximum volumetric speed for a nozzle: the material value is for 0.4 mm; other nozzles scale with the bore area
 * (an assumption until per-nozzle values are in the database, docs/35 P3-13) */
export const maxFlow = (m: Material, nozzle: number) => m.maxVolumetricSpeed * Math.min(2.5, Math.max(0.3, (nozzle / 0.4) ** 2));

export interface BuildResult { gcode: Uint8Array[]; stats: SliceStats; preview: PreviewData; outside: string[] }

const rotateTo = (pts: number[], k: number) => [...pts.slice(2 * k), ...pts.slice(0, 2 * k)];
const FILL = new Set<LineType>(['skin', 'infill', 'support', 'supportInterface', 'bridge', 'primeTower']);

export function buildGcode(layers: SliceLayer[], job: BuildJob): BuildResult {
  const s = job.process, P = job.printer;
  const D: Dialect = dialectFor(P);
  const accel = Math.min(s.accel, P.maxAccel);
  const travelV = Math.min(s.speedTravel, P.maxSpeed);
  const zv = Math.min(travelV, 20);
  const items: Item[][] = [];
  const own = !job.machine?.start;
  // after any start code the position counts as unknown (the first move lifts Z, then travels); the own start code
  // ends retracted, so the first travel does not retract again (P2-4)
  let cx = NaN, cy = NaN, cz = NaN;
  let retracted = own, curFil = -1, rngSeed = 1, fanNow = 0;
  let lastType: LineType | null = null;
  const rnd = () => ((rngSeed = (rngSeed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let seamsPrev = new Map<string, number[]>(), seamsNow = new Map<string, number[]>();
  const used = new Set<number>();
  for (const l of layers) for (const p of l.paths) used.add(p.filament);
  const slotsUsed = [...used].sort((a, b) => a - b);
  const multi = slotsUsed.length > 1;
  const slot0 = job.slots[slotsUsed[0] ?? 0] ?? job.slots[0];
  const maxZ = layers.length ? layers[layers.length - 1].z : 0;
  let lastChangeLayer = -1;
  if (multi) layers.forEach((l, i) => { if (new Set(l.paths.map((p) => p.filament)).size > 1) lastChangeLayer = i; });
  const warnings: string[] = [];
  let toolChanges = 0;

  const pickSeam = (pts: number[], key: string): number => {
    const n = pts.length / 2;
    const nearest = (rx: number, ry: number) => { let b = 0, bd = Infinity; for (let i = 0; i < n; i++) { const d = Math.hypot(pts[2 * i] - rx, pts[2 * i + 1] - ry); if (d < bd) { bd = d;
      b = i; } } return b; };
    if (s.seam === 'rear') { let b = 0; for (let i = 1; i < n; i++) if (pts[2 * i + 1] > pts[2 * b + 1]) b = i; return b; }
    if (s.seam === 'random') return Math.floor(rnd() * n);
    if (s.seam === 'nearest' && Number.isFinite(cx)) return nearest(cx, cy);
    // aligned: the seam of the previous layer nearest to this loop (one per loop, not per filament: docs/35 P3-6)
    const prev = seamsPrev.get(key);
    if (prev?.length) {
      let best = -1, bd = Infinity;
      for (let q = 0; q < prev.length; q += 2) for (let i = 0; i < n; i++) { const d = Math.hypot(pts[2 * i] - prev[q], pts[2 * i + 1] - prev[q + 1]); if (d < bd) { bd = d; best = i; } }
      if (bd < 2) return best;
    }
    // a new loop: the sharpest corner, else the rear
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
    seamsPrev = seamsNow; seamsNow = new Map();
    const move = (x: number, y: number, zz: number, v: number) => { out.push({ k: 'move', x, y, z: zz, e: 0, v, type: -1, w: 0, h, fil: curFil, fan: fanNow }); cx = x; cy = y; cz = zz; };
    const retract = () => { if (!retracted && s.retractLength > 0) { out.push({ k: 'e', e: -s.retractLength, v: s.retractSpeed }); retracted = true; } };
    const unretract = () => { if (retracted && s.retractLength > 0) { out.push({ k: 'e', e: s.retractLength, v: s.retractSpeed }); } retracted = false; };
    const hop = z + Math.max(s.zHop, 0.2);
    const travel = (x: number, y: number, next?: LineType) => {
      if (!Number.isFinite(cx) || !Number.isFinite(cz)) {
        // unknown position: up first (Z only), then XY above the layer, then down
        retract();
        out.push({ k: 'move', x: NaN, y: NaN, z: hop, e: 0, v: zv, type: -1, w: 0, h, fil: curFil, fan: fanNow });
        cz = hop;
        move(x, y, hop, travelV);
        move(x, y, z, zv);
        return;
      }
      const d = Math.hypot(x - cx, y - cy);
      if (d < 1e-4 && Math.abs(cz - z) < 1e-6) return;
      // a short hop from one fill line to the next of the same kind stays inside that area: no retraction, no Z hop
      const inside = !!next && next === lastType && FILL.has(next) && d < 5;
      if (!inside && d > s.retractMinTravel) {
        retract();
        if (s.zHop > 0) move(cx, cy, Math.max(cz, z + s.zHop), zv);
        move(x, y, cz, travelV);
        if (Math.abs(cz - z) > 1e-6) move(x, y, z, zv);
      } else {
        if (cz > z + 1e-6) move(x, y, cz, travelV);
        move(x, y, z, cz !== z ? zv : travelV);
      }
    };
    const setFan = (pct: number) => { if (pct !== fanNow) { out.push({ k: 'raw', text: D.fan(pct) }); fanNow = pct; } };
    const extrudePath = (p: ToolPath) => {
      const mat = job.slots[p.filament]?.material ?? job.slots[0].material;
      const bridge = p.type === 'bridge';
      const A = beadArea(p.width, bridge ? p.width : h);
      const vlim = maxFlow(mat, job.nozzle) / A;
      let v = Math.max(1, Math.min(p.speed, vlim, P.maxSpeed));
      if (li === 0) v = Math.min(v, s.speedFirstLayer);
      let pts = p.points;
      if (p.closed) {
        const key = `${p.type}:${p.filament}`;
        pts = rotateTo(pts, pickSeam(pts, key));
        if (p.type === 'outerWall' || p.type === 'innerWall') seamsNow.set(key, [...(seamsNow.get(key) ?? []), pts[0], pts[1]]);
        pts = [...pts, pts[0], pts[1]];
      }
      travel(pts[0], pts[1], p.type);
      lastType = p.type;
      out.push({ k: 'raw', text: D.feature(p.type) });
      const baseFan = li === 0 ? 0 : mat.cooling;
      setFan(bridge ? 100 : baseFan);
      unretract();
      for (let i = 2; i + 1 < pts.length; i += 2) {
        const d = Math.hypot(pts[i] - cx, pts[i + 1] - cy);
        // points closer than 5 µm are merged (no E0 lines, no micro moves: docs/35 P3-5)
        if (d < 0.005 && i + 2 < pts.length) continue;
        if (d < 1e-6) continue;
        out.push({ k: 'move', x: pts[i], y: pts[i + 1], z, e: (d * A) / filamentArea(mat), v, type: LINE_TYPE_ID[p.type], w: p.width, h, fil: p.filament, fan: fanNow });
        cx = pts[i]; cy = pts[i + 1]; cz = z;
      }
      if (bridge) setFan(baseFan);
    };
    // the prime tower (multi-material, up to the last tool change): a wall loop and sparse lines on every layer, and
    // after a tool change dense lines until the flush volume is purged; on the first layer at first-layer speed
    const tower = (fil: number, purge: boolean) => {
      if (!multi || li > lastChangeLayer) return;
      const W = s.primeTowerWidth, X = s.primeTowerX, Y = s.primeTowerY, w = s.lineWidth;
      extrudePath({ type: 'primeTower', points: [X, Y, X + W, Y, X + W, Y + W, X, Y + W], closed: true, width: w, speed: s.speedInnerWall, filament: fil });
      const need = purge ? s.flushVolume / beadArea(w, h) : 0;
      const gap = purge || li === 0 ? w * 0.9 : w / 0.15;
      let got = 0;
      const pts: number[] = [];
      for (let y = Y + w, k = 0; y < Y + W - w / 2 && (!purge || got < need || li === 0); y += gap, k++) {
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
      if (fil !== curFil && curFil >= 0) {
        // tool change: retract, lift, then the change code of the user's own Bambu Studio (it moves to the cutter and the
        // chute, cuts, purges and wipes); afterwards the position is unknown (docs/35 P1-4)
        toolChanges++;
        retract();
        if (Number.isFinite(cz)) move(cx, cy, Math.min(P.buildVolume[2], cz + 2), zv);
        out.push({ k: 'raw', text: '; filament change' });
        for (const t of changeCode(curFil, fil, li, z)) out.push({ k: 'raw', text: t });
        cx = NaN; cy = NaN; cz = NaN; retracted = false;
        curFil = fil;
        tower(fil, true);
      } else {
        curFil = fil;
        if (fil === fils[0]) tower(fil, false);
      }
      ordered(L.paths.filter((p) => p.filament === fil)).forEach(extrudePath);
    }
  }

  function changeCode(from: number, to: number, layer: number, z: number): string[] {
    if (!job.machine?.change) throw new Error('Multi-colour printing needs the filament change G-code from your own Bambu Studio (Import from Bambu Studio).');
    const sl = (i: number) => job.slots[i] ?? job.slots[0];
    const vars = { ...bambuVarsFor(), previous_extruder: from, next_extruder: to, new_filament_temp: sl(to).nozzleTemp, old_filament_temp: sl(from).nozzleTemp,
      nozzle_temperature_range_high: [sl(to).material.nozzleTemp.max], toolchange_count: toolChanges, layer_num: layer, layer_z: z, max_layer_z: z,
      flush_length: s.flushVolume / filamentArea(sl(to).material), x_after_toolchange: s.primeTowerX, y_after_toolchange: s.primeTowerY, z_after_toolchange: z };
    return fillBambuTemplate(job.machine.change, vars).split('\n');
  }

  function ordered(paths: ToolPath[]): ToolPath[] {
    const out: ToolPath[] = [];
    const rank = (t: LineType) => (t === 'skirt' ? 0 : t === 'support' || t === 'supportInterface' ? 1 : t === 'innerWall' || t === 'outerWall' ? 2 : 3);
    let px = Number.isFinite(cx) ? cx : 0, py = Number.isFinite(cy) ? cy : 0;
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

  // time per layer; the minimum layer time: slow down (to 10 mm/s at most), then wait away from the part (P2-5)
  let pos = { x: job.purge?.x1 ?? P.buildVolume[0] / 2, y: job.purge?.y ?? P.buildVolume[1] / 2, z: 1 };
  const plan = (list: Item[], from: { x: number; y: number; z: number }) => {
    const moves: PlanMove[] = [], idx: number[] = [];
    let x = from.x, y = from.y, zz = from.z;
    list.forEach((it, i) => {
      if (it.k === 'move') { x = Number.isFinite(it.x) ? it.x : x; y = Number.isFinite(it.y) ? it.y : y; zz = it.z; moves.push({ x, y, z: zz, e: it.e, v: it.v, a: accel }); idx.push(i); }
      else if (it.k === 'e') { moves.push({ x, y, z: zz, e: it.e, v: it.v, a: accel }); idx.push(i); }
    });
    const t = planTimes(moves, from, { squareCornerVelocity: 5, maxSpeed: P.maxSpeed });
    const waits = list.reduce((a, it) => a + (it.k === 'wait' ? it.s : 0), 0);
    return { t, idx, end: { x, y, z: zz }, total: t.reduce((a, b) => a + b, 0) + waits };
  };
  const layerTimes: number[] = [];
  const timeByType: Record<string, number> = {};
  const volumeByType: Record<string, number> = {};
  const names = Object.keys(LINE_TYPE_ID);
  for (let li = 0; li < items.length; li++) {
    let r = plan(items[li], pos);
    if (r.total < s.minLayerTime && r.total > 0 && li > 0) {
      const f = Math.max(0.05, Math.min(1, r.total / s.minLayerTime));
      for (const it of items[li]) if (it.k === 'move' && it.type >= 0) it.v = Math.max(10, it.v * f);
      r = plan(items[li], pos);
      if (r.total < s.minLayerTime - 0.05) waitAway(items[li], layers[li].z, s.minLayerTime - r.total, r.end);
      r = plan(items[li], pos);
    }
    r.idx.forEach((i, k) => {
      const it = items[li][i];
      const name = it.k === 'move' && it.type >= 0 ? names[it.type] : 'travel';
      timeByType[name] = (timeByType[name] ?? 0) + r.t[k];
      if (it.k === 'move' && it.type >= 0) volumeByType[name] = (volumeByType[name] ?? 0) + it.e * filamentArea(job.slots[it.fil]?.material ?? job.slots[0].material);
    });
    const waits = items[li].reduce((a, it) => a + (it.k === 'wait' ? it.s : 0), 0);
    if (waits) timeByType.wait = (timeByType.wait ?? 0) + waits;
    layerTimes.push(r.total);
    pos = r.end;
  }
  /** a layer still too short: retract, lift, move beside the part, wait the rest with the fan at full speed */
  function waitAway(list: Item[], z: number, sec: number, at: { x: number; y: number; z: number }) {
    let maxX = -Infinity;
    for (const it of list) if (it.k === 'move' && it.type >= 0) maxX = Math.max(maxX, it.x);
    const [bx] = P.buildVolume;
    const x = maxX + 10 <= bx - 5 ? maxX + 10 : Math.max(5, at.x - 20);
    const zz = Math.min(P.buildVolume[2], z + Math.max(1, s.zHop));
    if (s.retractLength > 0) list.push({ k: 'e', e: -s.retractLength, v: s.retractSpeed });
    list.push({ k: 'move', x: at.x, y: at.y, z: zz, e: 0, v: zv, type: -1, w: 0, h: 0, fil: 0, fan: 100 });
    list.push({ k: 'move', x, y: at.y, z: zz, e: 0, v: travelV, type: -1, w: 0, h: 0, fil: 0, fan: 100 });
    list.push({ k: 'raw', text: D.fan(100) }, { k: 'wait', s: Math.ceil(sec * 10) / 10 }, { k: 'raw', text: D.fan(fanNowOf(list)) });
    if (s.retractLength > 0) list.push({ k: 'e', e: s.retractLength, v: s.retractSpeed });
    // the next layer's first travel starts from here
    list.push({ k: 'raw', text: '; minimum layer time' });
  }
  function fanNowOf(list: Item[]): number { for (let i = list.length - 1; i >= 0; i--) { const it = list[i]; if (it.k === 'move') return it.fan; } return 0; }
  const printTime = layerTimes.reduce((a, b) => a + b, 0);
  // heating, homing and levelling: a fixed allowance per printer family (an assumption until measured, docs/34 2.6)
  const prepTime = P.gcodeFlavor === 'bambu' ? 300 : 180;

  // the start code (own or imported) and its purge line: counted in the filament (docs/35 P3-3)
  const [bx, by, bz] = P.buildVolume;
  const purgeLen = job.purge ? job.purge.x1 - job.purge.x0 : 0;
  const purgeE = (purgeLen * beadArea(s.firstLayerLineWidth * 1.2, Math.max(0.2, s.firstLayerHeight))) / filamentArea(slot0.material);
  const tl = P.travelLimits;
  const vars: Record<string, string | number> = {
    nozzle_temp: slot0.nozzleTemp, bed_temp: slot0.bedTemp, first_layer_height: s.firstLayerHeight,
    purge_x0: job.purge?.x0 ?? 0, purge_x1: job.purge?.x1 ?? 0, purge_y: job.purge?.y ?? 0, purge_z: Math.max(0.2, s.firstLayerHeight), purge_e: purgeE,
    retract: s.retractLength, park_z: Math.min(bz, tl?.z[1] ?? bz, maxZ + 10), park_x: Math.min(bx - 10, bx / 2, tl?.x[1] ?? bx),
    park_y: Math.min(by - 10, (tl?.y[1] ?? by) - 10), print_minutes: Math.round((printTime + prepTime) / 60), max_z: maxZ, bed_x: bx, bed_y: by,
  };
  function bambuVarsFor() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const it of items[0] ?? []) if (it.k === 'move' && it.type >= 0) { x0 = Math.min(x0, it.x); x1 = Math.max(x1, it.x); y0 = Math.min(y0, it.y); y1 = Math.max(y1, it.y); }
    const w = s.lineWidth, hh = s.layerHeight;
    return bambuVars({ nozzle_temp: slot0.nozzleTemp, bed_temp: slot0.bedTemp, first_layer_height: s.firstLayerHeight, max_z: maxZ, nozzle: job.nozzle,
      layer_height: hh, filament_type: slot0.material.type ?? slot0.material.name, printer_model: `${P.brand} ${P.model}`, layers: layers.length,
      first_layer_min: [x0, y0], first_layer_size: [x1 - x0, y1 - y0], initial_extruder: slotsUsed[0] ?? 0, bed_type: s.bedType,
      outer_wall_volumetric_speed: Math.min(s.speedOuterWall, maxFlow(slot0.material, job.nozzle) / beadArea(w, hh)) * beadArea(w, hh) });
  }
  const start = job.machine?.start ? fillBambuTemplate(job.machine.start, bambuVarsFor()) : fillTemplate(D.startTemplate, vars);
  const end = job.machine?.end ? fillBambuTemplate(job.machine.end, bambuVarsFor()) : fillTemplate(D.endTemplate, vars);

  // filament per slot (the purge line of the own start code belongs to the first filament)
  const eBySlot = new Map<number, number>();
  if (job.purge && own) eBySlot.set(slotsUsed[0] ?? 0, purgeE);
  for (const list of items) for (const it of list) if (it.k === 'move' && it.type >= 0) eBySlot.set(it.fil, (eBySlot.get(it.fil) ?? 0) + it.e);
  const filament = [...eBySlot.entries()].sort((a, b) => a[0] - b[0]).map(([slot, len]) => {
    const m = job.slots[slot]?.material ?? job.slots[0].material;
    const volume = len * filamentArea(m);
    const grams = (volume / 1000) * m.density;
    return { slot, length: len, volume, grams, cost: (grams / 1000) * m.pricePerKg };
  });
  const stats: SliceStats = { layers: layers.length, printTime, totalTime: printTime + prepTime, filament, timeByType, volumeByType, toolChanges, warnings };
  if (P.gcodeFlavor === 'bambu' && own && !multi) warnings.push('The own start code does not load filament from the AMS: load the filament by hand, or import the start code from your Bambu Studio.');
  const gcode = writeGcode({ items, layers, D, accel, start, end, stats, job, slotsUsed, multi, own, layerTimes });
  return { gcode, stats, preview: previewOf(items, layers), outside: checkMoves(items, P, s.firstLayerHeight, job.purge) };
}

/**
 * Every move against the machine (docs/35 P1-1, P1-3): XY inside the printable area and outside every excluded zone
 * (the whole segment, not only its ends), Z between the first layer and the build height, everything inside the travel
 * limits. Returns what is wrong, named by the kind of line.
 */
export function checkMoves(items: Item[][], P: Printer, firstLayer: number, purge?: { x0: number; x1: number; y: number }): string[] {
  const area = printableArea(P).flat();
  const zones = (P.excludeAreas ?? []).map((z) => z.flat());
  const tl = P.travelLimits ?? { x: [0, P.buildVolume[0]] as [number, number], y: [0, P.buildVolume[1]] as [number, number], z: [0, P.buildVolume[2]] as [number, number] };
  const bad = new Map<string, number>();
  const report = (what: string) => bad.set(what, (bad.get(what) ?? 0) + 1);
  const names = Object.keys(LINE_TYPE_ID);
  const eps = 1e-3;
  const inArea = (x: number, y: number) => contains([area], x, y) || onEdge(area, x, y);
  let px = purge?.x1 ?? NaN, py = purge?.y ?? NaN;
  for (const list of items) for (const it of list) {
    if (it.k !== 'move') continue;
    const what = it.type >= 0 ? names[it.type] : 'travel';
    if (it.z < firstLayer - eps && it.type !== -1) report(`${what} below the first layer`);
    if (it.z < firstLayer - eps && it.type === -1) report('a move below the first layer height');
    if (it.z > Math.min(P.buildVolume[2], tl.z[1]) + eps) report(`${what} above the build height`);
    if (!Number.isFinite(it.x) || !Number.isFinite(it.y)) continue;
    if (it.x < tl.x[0] - eps || it.x > tl.x[1] + eps || it.y < tl.y[0] - eps || it.y > tl.y[1] + eps) report(`${what} outside the travel limits`);
    if (!inArea(it.x, it.y)) report(`${what} outside the printable area`);
    if (it.type >= 0 && Number.isFinite(px)) for (const zone of zones) if (segmentTouches(zone, px, py, it.x, it.y)) report(`${what} in an excluded zone`);
    px = it.x; py = it.y;
  }
  return [...bad.entries()].map(([w, n]) => `${n} x ${w}`);
}

const onEdge = (p: number[], x: number, y: number) => {
  for (let i = 0; i < p.length; i += 2) {
    const j = (i + 2) % p.length, dx = p[j] - p[i], dy = p[j + 1] - p[i + 1], L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - p[i]) * dx + (y - p[i + 1]) * dy) / L));
    if (Math.hypot(p[i] + dx * t - x, p[i + 1] + dy * t - y) < 1e-3) return true;
  }
  return false;
};

/** a segment touches a polygon: an end inside, or a crossing with one of its edges */
export function segmentTouches(poly: number[], ax: number, ay: number, bx: number, by: number): boolean {
  if (contains([poly], ax, ay) || contains([poly], bx, by)) return true;
  const o = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) => Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  for (let i = 0; i < poly.length; i += 2) {
    const j = (i + 2) % poly.length;
    if (o(ax, ay, bx, by, poly[i], poly[i + 1]) * o(ax, ay, bx, by, poly[j], poly[j + 1]) < 0 && o(poly[i], poly[i + 1], poly[j], poly[j + 1], ax, ay) * o(poly[i], poly[i + 1], poly[j],
      poly[j + 1], bx, by) < 0) return true;
  }
  return false;
}

/** the flat preview arrays (docs/34 2.1) */
function previewOf(items: Item[][], layers: SliceLayer[]): PreviewData {
  let count = 0;
  for (const l of items) for (const it of l) if (it.k === 'move' && Number.isFinite(it.x)) count++;
  const segs = new Float32Array(count * SEG_STRIDE);
  const layerStart = new Uint32Array(items.length + 1);
  let k = 0, px = NaN, py = NaN;
  items.forEach((l, li) => {
    layerStart[li] = k;
    for (const it of l) {
      if (it.k !== 'move' || !Number.isFinite(it.x)) continue;
      const o = k * SEG_STRIDE;
      segs[o] = Number.isFinite(px) ? px : it.x; segs[o + 1] = Number.isFinite(py) ? py : it.y; segs[o + 2] = it.x; segs[o + 3] = it.y; segs[o + 4] = it.z;
      segs[o + 5] = it.w; segs[o + 6] = it.h; segs[o + 7] = it.type < 0 ? LINE_TYPE_ID.travel : it.type; segs[o + 8] = it.v; segs[o + 9] = Math.max(0, it.fil); segs[o + 10] = it.fan;
      px = it.x; py = it.y; k++;
    }
  });
  layerStart[items.length] = k;
  return { segs, layerStart, layerZ: Float32Array.from(layers.map((l) => l.z)), layerHeight: Float32Array.from(layers.map((l) => l.height)) };
}

/** the slot data from a material (temperatures from the profile) */
export const slotFor = (m: Material, color?: string): SlotInfo => ({ material: m, color: color ?? m.color ?? '#f2f2f2', nozzleTemp: m.nozzleTemp.default, bedTemp: bedTempOf(m) });
