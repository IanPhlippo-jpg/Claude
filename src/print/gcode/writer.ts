/**
 * The G-code text of a slice (docs/34 2.7): header, start code, the layers, end code; as chunks of ASCII bytes.
 * A coordinate is written only when it is known and changed; a retraction is E only (docs/35 P1-1).
 */
import type { Dialect } from './dialects';
import { NOT_PRINTED } from './dialects';
import { ascii, fe, ff, fmt, fx } from './format';
import type { BuildJob, Item } from '../build';
import type { SliceLayer, SliceStats } from '../types';

export interface WriteInput {
  items: Item[][];
  layers: SliceLayer[];
  D: Dialect;
  accel: number;
  start: string;
  end: string;
  stats: SliceStats;
  job: BuildJob;
  slotsUsed: number[];
  multi: boolean;
  own: boolean;
  layerTimes: number[];
}

const NOTE = `Phlippo CAD: ${NOT_PRINTED}`;

export function writeGcode(w: WriteInput): Uint8Array[] {
  const { items, layers, D, stats, job } = w;
  const s = job.process, P = job.printer;
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const lines: string[] = [];
  const flush = () => { if (lines.length) { chunks.push(enc.encode(lines.join('\n') + '\n')); lines.length = 0; } };
  if (D.flavor === 'bambu') lines.push('; EXECUTABLE_BLOCK_START');
  lines.push(D.accel(w.accel), ...w.start.split('\n'), 'M83', 'G90');
  if (s.pressureAdvance != null) lines.push(D.flavor === 'klipper' ? `SET_PRESSURE_ADVANCE ADVANCE=${fmt(s.pressureAdvance, 4)}` : `M900 K${fmt(s.pressureAdvance, 4)}`);
  let elapsed = 0;
  const total = stats.printTime;
  let lx = NaN, ly = NaN, lz = NaN, lf = NaN;
  const perLayer = w.layerTimes;
  for (let li = 0; li < items.length; li++) {
    lines.push(...D.layerChange(li, layers[li].z, layers[li].height, layers.length));
    lines.push(D.progress((100 * elapsed) / Math.max(1, total), (total - elapsed) / 60));
    if (li === 1 && !w.multi) {
      // after the first layer: the printing temperature of the loaded filament
      const t = job.slots[w.slotsUsed[0] ?? 0]?.nozzleTemp;
      if (t) lines.push(`M104 S${Math.round(t)}`);
    }
    for (const it of items[li]) {
      if (it.k === 'raw') {
        lines.push(it.text);
        // after code we did not write (a filament change) the position is unknown: write every coordinate again
        if (!it.text.startsWith(';') && !/^M10[67]/.test(it.text)) { lx = NaN; ly = NaN; lz = NaN; lf = NaN; }
        continue;
      }
      if (it.k === 'e') { lines.push(`G1 E${fe(it.e)} F${ff(it.v)}`); lf = NaN; continue; }
      if (it.k === 'wait') { lines.push(`G4 P${Math.round(it.s * 1000)}`); continue; }
      let g = it.type === -1 ? 'G0' : 'G1';
      if (Number.isFinite(it.x) && it.x !== lx) g += ` X${fx(it.x)}`;
      if (Number.isFinite(it.y) && it.y !== ly) g += ` Y${fx(it.y)}`;
      if (it.z !== lz) g += ` Z${fx(it.z)}`;
      if (it.e !== 0) g += ` E${fe(it.e)}`;
      if (g === 'G0' || g === 'G1') continue;
      if (it.v !== lf) g += ` F${ff(it.v)}`;
      lines.push(g);
      if (Number.isFinite(it.x)) lx = it.x;
      if (Number.isFinite(it.y)) ly = it.y;
      lz = it.z; lf = it.v;
    }
    elapsed += perLayer[li];
    if (lines.length > 20000) flush();
  }
  lines.push(...w.end.split('\n'));
  if (D.flavor === 'bambu') lines.push('; EXECUTABLE_BLOCK_END');
  flush();

  // header (written last, placed first: it carries the time and the filament)
  const f = stats.filament;
  const grams = f.reduce((a, x) => a + x.grams, 0), meters = f.reduce((a, x) => a + x.length, 0) / 1000;
  const cm3 = f.reduce((a, x) => a + x.volume, 0) / 1000;
  const hms = (sec: number) => `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m ${Math.round(sec % 60)}s`;
  const assumptions = (P.assumptions ?? []).map((a) => (typeof a === 'string' ? a : `${a.field ?? ''}: ${a.note ?? ''}`)).filter((a) => /AANNAME|assum/i.test(a)).slice(0, 12);
  const head: string[] = [];
  if (D.flavor === 'bambu') {
    head.push('; HEADER_BLOCK_START', `; Phlippo CAD ${ascii(job.appVersion)}`, `; model printing time: ${hms(stats.printTime)}; total estimated time: ${hms(stats.totalTime)}`,
      `; total layer number: ${layers.length}`, `; total filament length [mm] : ${f.map((x) => fmt(x.length, 2)).join(',')}`,
      `; total filament volume [cm^3] : ${f.map((x) => fmt(x.volume / 1000, 2)).join(',')}`, `; total filament weight [g] : ${f.map((x) => fmt(x.grams, 2)).join(',')}`,
      `; filament_density: ${job.slots.map((x) => fmt(x.material.density, 2)).join(',')}`, `; filament_diameter: ${job.slots.map((x) => fmt(x.material.diameter ?? 1.75, 2)).join(',')}`,
      `; max_z_height: ${fmt(layers.length ? layers[layers.length - 1].z : 0, 2)}`, '; HEADER_BLOCK_END', '', '; CONFIG_BLOCK_START',
      `; printer_model = ${ascii(`${P.brand} ${P.model}`)}`, `; nozzle_diameter = ${fmt(job.nozzle, 2)}`, `; layer_height = ${fmt(s.layerHeight, 2)}`,
      `; filament_type = ${job.slots.map((x) => ascii(x.material.type ?? x.material.name)).join(';')}`, `; filament_colour = ${job.slots.map((x) => x.color).join(';')}`,
      `; ${NOTE}`, '; CONFIG_BLOCK_END', '');
  } else {
    head.push(`; generated by Phlippo CAD ${ascii(job.appVersion)}`, `;FLAVOR:${D.flavor === 'marlin' ? 'Marlin' : 'Klipper'}`, `;TIME:${Math.round(stats.totalTime)}`,
      `;Filament used: ${fmt(meters, 4)}m`, `;Layer height: ${fmt(s.layerHeight, 2)}`, `;LAYER_COUNT:${layers.length}`,
      `; estimated printing time (normal mode) = ${hms(stats.totalTime)}`, `; filament used [mm] = ${fmt(meters * 1000, 2)}`, `; filament used [cm3] = ${fmt(cm3, 2)}`,
      `; filament used [g] = ${fmt(grams, 2)}`, `; printer: ${ascii(`${P.brand} ${P.model}`)}, nozzle ${fmt(job.nozzle, 2)} mm`, `; ${NOTE}`);
  }
  // the assumptions of the printer data go along in the file (docs/35 P2-11)
  for (const a of assumptions) head.push(`; assumption: ${ascii(a)}`.slice(0, D.maxLine));
  if (D.flavor !== 'bambu' && job.thumbnailBlock) head.push(job.thumbnailBlock);
  chunks.unshift(enc.encode(head.join('\n') + '\n'));
  return chunks;
}
