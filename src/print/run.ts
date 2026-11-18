/**
 * One slice from start to end (the worker calls this; the tests too): checks, slicing, thumbnails, G-code. And the
 * export of the result as the file the printer takes (docs/33 eis 7) with the checks of docs/34 3.3 and docs/35:
 * nothing outside the printable area or in an excluded zone, the prime tower and the purge line placed where they
 * are free, imported machine code only on its own printer model, multi-colour on Bambu only with the user's own
 * filament-change code, no files for printers with more than one toolhead.
 */
import { bounds, transformPositions } from './mesh';
import { buildGcode, type BuildJob, type SlotInfo } from './build';
import { canWriteMultiMaterial, printableArea, thumbnailFormat } from './database';
import { slicePaths, type Progress } from './slice/slicer';
import { encodePng } from './pack/png';
import { renderThumbnail } from './pack/render';
import { colpicBlock, pngThumbnailBlock } from './pack/colpic';
import { bambuGcode3mf, projectThreeMf, type PackPart } from './pack/packages';
import { poly, UNITS, type Paths } from './geom/polygons';
import { sameModel } from './gcode/importTemplate';
import { previewMesh } from './previewMesh';
import type { MachineCode, PlateMesh, Printer, ProcessSettings, SliceResult } from './types';

export interface SliceJob {
  meshes: PlateMesh[];
  printer: Printer;
  nozzle: number;
  process: ProcessSettings;
  slots: SlotInfo[];
  name: string;
  appVersion: string;
  /** start, end and change code imported from the user's own Bambu Studio */
  machine?: MachineCode;
}

/** the slack at the edge of the bed: the same for the plate colour and for the refusal (docs/35 P3-7) */
export const EDGE = 0.01;
const rectPath = (x0: number, y0: number, x1: number, y1: number) => [x0, y0, x1, y0, x1, y1, x0, y1].map((v) => Math.round(v * UNITS));
/** the printable area minus the excluded zones (grid units), optionally inset by mm */
export function bedRegion(p: Printer, inset = 0): Paths {
  const area = [printableArea(p).flat().map((v) => Math.round(v * UNITS))];
  const zones = (p.excludeAreas ?? []).map((z) => z.flat().map((v) => Math.round(v * UNITS)));
  const free = zones.length ? poly.difference(area, poly.union(zones)) : poly.union(area);
  return inset ? poly.offset(free, -inset * UNITS) : free;
}
const overlaps = (a: Paths, b: Paths) => Math.abs(poly.area(poly.intersection(a, b))) > 1;

/** the reasons the plate cannot be sliced (empty = fine) */
export function plateProblems(job: Pick<SliceJob, 'meshes' | 'printer' | 'slots' | 'machine'>): string[] {
  const p = job.printer, out: string[] = [];
  if (!job.meshes.length || job.meshes.every((m) => !m.positions.length)) out.push('The plate is empty: add a part first.');
  if ((p.toolheads ?? 1) > 1) out.push(`The ${p.brand} ${p.model} has ${p.toolheads} toolheads: which nozzle prints cannot be set yet, so its files are not written.`);
  const area = [printableArea(p).flat().map((v) => Math.round(v * UNITS))];
  const zones = (p.excludeAreas ?? []).map((z) => [z.flat().map((v) => Math.round(v * UNITS))]);
  for (const m of job.meshes) {
    if (!m.positions.length) continue;
    const b = bounds(m.positions);
    const foot = [rectPath(b.min[0], b.min[1], b.max[0], b.max[1])];
    const inner = [rectPath(b.min[0] + EDGE, b.min[1] + EDGE, b.max[0] - EDGE, b.max[1] - EDGE)];
    if (b.min[0] < -EDGE || b.min[1] < -EDGE || b.max[0] > p.buildVolume[0] + EDGE || b.max[1] > p.buildVolume[1] + EDGE || poly.difference(inner, area).length) {
      out.push(`${m.name} lies outside the bed of the ${p.brand} ${p.model} (${p.buildVolume[0]} x ${p.buildVolume[1]} mm).`);
    }
    if (b.max[2] > p.buildVolume[2] + EDGE) out.push(`${m.name} is ${b.max[2].toFixed(1)} mm high; the ${p.model} prints up to ${p.buildVolume[2]} mm.`);
    if (b.min[2] < -EDGE) out.push(`${m.name} reaches below the bed.`);
    if (zones.some((z) => overlaps(foot, z))) out.push(`${m.name} lies over an excluded zone of the bed.`);
  }
  const slotsUsed = new Set(job.meshes.map((m) => m.filament));
  if (slotsUsed.size > 1 && !canWriteMultiMaterial(p)) out.push(`The ${p.brand} ${p.model} prints one filament: give every part the same filament, or choose a printer with AMS.`);
  // multi-colour on Bambu: only with the filament-change code of the user's own Bambu Studio (docs/35 P1-4)
  if (slotsUsed.size > 1 && canWriteMultiMaterial(p) && !job.machine?.change) {
    out.push('Multi-colour printing needs the start and filament-change G-code from your own Bambu Studio: Print Setup ▸ Machine G-code ▸ Import from Bambu Studio.');
  }
  // imported code only on the printer model it comes from (docs/35 P1-5)
  if (job.machine && !sameModel(job.machine.printerModel,
    p)) out.push(`The imported machine G-code is for the ${job.machine.printerModel}, not for the ${p.brand} ${p.model}: import the profile of this printer.`);
  for (const s of slotsUsed) {
    const slot = job.slots[s];
    if (!slot) { out.push(`Filament slot ${s + 1} is not set up.`); continue; }
    if (slot.nozzleTemp > p.maxNozzleTemp) out.push(`${slot.material.name}: ${slot.nozzleTemp} °C is above the ${p.maxNozzleTemp} °C of the ${p.model}.`);
    if (slot.bedTemp > p.maxBedTemp) out.push(`${slot.material.name}: bed ${slot.bedTemp} °C is above the ${p.maxBedTemp} °C of the ${p.model}.`);
    const r = slot.material.nozzleTemp;
    if (slot.nozzleTemp < r.min || slot.nozzleTemp > r.max) out.push(`${slot.material.name}: ${slot.nozzleTemp} °C is outside its range of ${r.min} to ${r.max} °C.`);
  }
  return out;
}

/** warnings that do not block (docs/34 R9) */
export function plateWarnings(job: Pick<SliceJob, 'meshes' | 'printer' | 'slots'>): string[] {
  const out: string[] = [];
  const enclosed = !!job.printer.enclosure && !/^(no|none|false)$/i.test(String(job.printer.enclosure));
  for (const s of new Set(job.meshes.map((m) => m.filament))) {
    const m = job.slots[s]?.material;
    if (m?.enclosure && !enclosed) out.push(`${m.name} warps easily on a printer without an enclosure.`);
    if (m?.hardenedNozzle) out.push(`${m.name} needs a hardened steel nozzle.`);
  }
  return out;
}

/** the footprints of the parts with the room the skirt and brim take (grid units) */
function keepOut(job: SliceJob): Paths {
  const s = job.process;
  const m = (s.skirtLoops > 0 ? s.skirtDistance : 0) + (s.skirtLoops + 1) * s.lineWidth + s.brimWidth + 3;
  return poly.union(job.meshes.filter((x) => x.positions.length).map((x) => { const b = bounds(x.positions); return rectPath(b.min[0] - m, b.min[1] - m, b.max[0] + m, b.max[1] + m); }));
}

/** the prime tower on a free spot of the bed, back right first (docs/35 P1-3); null when there is none */
export function placeTower(job: SliceJob): { x: number; y: number } | null {
  const W = job.process.primeTowerWidth, free = bedRegion(job.printer, 2), blocked = keepOut(job);
  const [bx, by] = job.printer.buildVolume;
  for (let y = by - W - 5; y >= 5; y -= 5) for (let x = bx - W - 5; x >= 5; x -= 5) {
    const t = [rectPath(x, y, x + W, y + W)];
    if (!poly.difference(t, free).length && !overlaps(t, blocked)) return { x, y };
  }
  return null;
}

/** the purge line of the own start code: along the front edge, else the back edge, free of parts and zones */
export function placePurge(job: SliceJob): { x0: number; x1: number; y: number } | null {
  const [bx, by] = job.printer.buildVolume, free = bedRegion(job.printer, 1), blocked = keepOut(job);
  const x0 = Math.min(20, bx * 0.1), x1 = Math.min(120, bx * 0.6);
  for (const y of [3, 6, by - 3, by - 6]) {
    const line = [rectPath(x0 - 1, y - 1, x1 + 1, y + 1)];
    if (!poly.difference(line, free).length && !overlaps(line, blocked)) return { x0, x1, y };
  }
  return null;
}

export interface SliceOutput extends SliceResult { plateImage: Uint8Array; plateSmall: Uint8Array }

export async function runSlice(job: SliceJob, progress: Progress = () => {}, cancelled: () => boolean = () => false): Promise<SliceOutput> {
  const problems = plateProblems(job);
  const multi = new Set(job.meshes.map((m) => m.filament)).size > 1;
  const tower = multi && !problems.length ? placeTower(job) : null;
  if (multi && !problems.length && !tower) problems.push('There is no free spot on the bed for the prime tower: move the parts together or make the tower smaller.');
  const purge = job.machine?.start || problems.length ? undefined : placePurge(job);
  if (purge === null) problems.push('There is no free strip along the front or back edge of the bed for the purge line: move the parts away from the edge.');
  if (problems.length) throw new Error(problems.join('\n'));
  const process = tower ? { ...job.process, primeTowerX: tower.x, primeTowerY: tower.y } : job.process;
  const outcome = slicePaths({ meshes: job.meshes, process, nozzle: job.nozzle, bed: bedRegion(job.printer, process.lineWidth / 2) }, progress, cancelled);
  progress('Thumbnails', 0.86);
  const rm = job.meshes.map((m) => ({ positions: m.positions, color: job.slots[m.filament]?.color ?? '#cfd3d8' }));
  const fmt = thumbnailFormat(job.printer);
  let thumbnailBlock: string | undefined;
  if (fmt === 'png') {
    const sizes = job.printer.thumbnailSizes ?? [[144, 144]];
    const blocks: string[] = [];
    for (const [w, h] of sizes) blocks.push(pngThumbnailBlock(await encodePng(renderThumbnail(rm, w, h), w, h), w, h));
    thumbnailBlock = blocks.join('\n');
  } else if (fmt === 'colpic') {
    const imgs = [[200, 200], [160, 160]].map(([w, h]) => ({ rgba: renderThumbnail(rm, w, h), width: w, height: h }));
    const maxLine = job.printer.gcodeFlavor === 'marlin' ? 96 : 0;
    thumbnailBlock = colpicBlock(imgs, maxLine) + '\n' + pngThumbnailBlock(await encodePng(renderThumbnail(rm, 160, 160), 160, 160), 160, 160);
  }
  progress('G-code', 0.9);
  const bj: BuildJob = { printer: job.printer, nozzle: job.nozzle, process, slots: job.slots, name: job.name, appVersion: job.appVersion, machine: job.machine, thumbnailBlock,
    purge: purge ?? undefined };
  const built = buildGcode(outcome.layers, bj);
  // every move is checked; a slice with a move outside the machine is refused (docs/35 P1-3)
  if (built.outside.length) throw new Error(`Moves leave the printable area of the ${job.printer.model}: ${built.outside.join('; ')}.`);
  built.stats.warnings.unshift(...outcome.warnings, ...plateWarnings(job));
  progress('Preview', 0.95);
  const mesh = previewMesh(built.preview);
  const plateImage = await encodePng(renderThumbnail(rm, 512, 512), 512, 512);
  const plateSmall = await encodePng(renderThumbnail(rm, 128, 128), 128, 128);
  progress('Done', 1);
  return { stats: built.stats, preview: built.preview, mesh, gcode: built.gcode, key: '', plateImage, plateSmall };
}

/** the printer file of a slice: .gcode.3mf for Bambu Lab, .gcode for the others */
export async function printerFile(out: SliceOutput, job: SliceJob): Promise<{ name: string; data: Uint8Array; mime: string }> {
  const base = job.name.replace(/[^\w.-]+/g, '_') || 'plate';
  if (job.printer.fileFormat === 'gcode.3mf' || job.printer.gcodeFlavor === 'bambu') {
    const data = await bambuGcode3mf({ gcode: out.gcode, printer: job.printer, nozzle: job.nozzle, process: job.process, slots: job.slots, stats: out.stats, plateImage: out.plateImage,
      plateSmall: out.plateSmall, appVersion: job.appVersion, objects: job.meshes.map((m) => m.name), meshes: job.meshes });
    return { name: `${base}.gcode.3mf`, data, mime: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml' };
  }
  const data = new Uint8Array(out.gcode.reduce((s, c) => s + c.length, 0));
  let o = 0;
  for (const c of out.gcode) { data.set(c, o); o += c.length; }
  return { name: `${base}.gcode`, data, mime: 'text/x.gcode' };
}

/** the plain .3mf project of the plate (no G-code) */
export async function projectFile(parts: PackPart[], settings: unknown, colors: string[], name: string): Promise<{ name: string; data: Uint8Array; mime: string }> {
  const rm = parts.map((p, i) => ({ positions: transformPositions(p.positions, p.matrix), color: colors[i] ?? '#cfd3d8' }));
  const thumb = await encodePng(renderThumbnail(rm, 256, 256), 256, 256);
  const data = await projectThreeMf(parts, settings, thumb);
  return { name: `${name.replace(/[^\w.-]+/g, '_') || 'plate'}.3mf`, data, mime: 'model/3mf' };
}
