/**
 * One slice from start to end (the worker calls this; the tests too): checks, slicing, thumbnails, G-code. And the
 * export of the result as the file the printer takes (docs/33 eis 7) with the checks of docs/34 3.3 (negative tests).
 */
import { bounds, transformPositions } from './mesh';
import { buildGcode, type SlotInfo } from './build';
import { canWriteMultiMaterial, printableArea, thumbnailFormat } from './database';
import { slicePaths, type Progress } from './slice/slicer';
import { encodePng } from './pack/png';
import { renderThumbnail } from './pack/render';
import { colpicBlock, pngThumbnailBlock } from './pack/colpic';
import { bambuGcode3mf, projectThreeMf, type PackPart } from './pack/packages';
import { contains } from './geom/boolean';
import type { PlateMesh, Printer, ProcessSettings, SliceResult } from './types';

export interface SliceJob {
  meshes: PlateMesh[];
  printer: Printer;
  nozzle: number;
  process: ProcessSettings;
  slots: SlotInfo[];
  name: string;
  appVersion: string;
  startGcode?: string;
  endGcode?: string;
}

/** the reasons the plate cannot be sliced (empty = fine) */
export function plateProblems(job: Pick<SliceJob, 'meshes' | 'printer' | 'slots'>): string[] {
  const p = job.printer, out: string[] = [];
  if (!job.meshes.length || job.meshes.every((m) => !m.positions.length)) out.push('The plate is empty: add a part first.');
  const area = printableArea(p).flat();
  for (const m of job.meshes) {
    if (!m.positions.length) continue;
    const b = bounds(m.positions);
    const corners = [[b.min[0], b.min[1]], [b.max[0], b.min[1]], [b.max[0], b.max[1]], [b.min[0], b.max[1]]];
    const inside = corners.every(([x, y]) => x >= -1e-3 && y >= -1e-3 && x <= p.buildVolume[0] + 1e-3 && y <= p.buildVolume[1] + 1e-3 && (p.printableArea ? contains([area], x, y) : true));
    if (!inside) out.push(`${m.name} lies outside the bed of the ${p.brand} ${p.model} (${p.buildVolume[0]} x ${p.buildVolume[1]} mm).`);
    if (b.max[2] > p.buildVolume[2] + 1e-3) out.push(`${m.name} is ${b.max[2].toFixed(1)} mm high; the ${p.model} prints up to ${p.buildVolume[2]} mm.`);
    if (b.min[2] < -1e-3) out.push(`${m.name} reaches below the bed.`);
    for (const ex of p.excludeAreas ?? []) if (corners.some(([x, y]) => contains([ex.flat()], x, y))) out.push(`${m.name} touches an excluded zone of the bed.`);
  }
  const slotsUsed = new Set(job.meshes.map((m) => m.filament));
  if (slotsUsed.size > 1 && !canWriteMultiMaterial(p)) out.push(`The ${p.brand} ${p.model} prints one filament: give every part the same filament, or choose a printer with AMS.`);
  for (const s of slotsUsed) {
    const slot = job.slots[s];
    if (!slot) { out.push(`Filament slot ${s + 1} is not set up.`); continue; }
    if (slot.nozzleTemp > p.maxNozzleTemp) out.push(`${slot.material.name}: ${slot.nozzleTemp} °C is above the ${p.maxNozzleTemp} °C of the ${p.model}.`);
    if (slot.bedTemp > p.maxBedTemp) out.push(`${slot.material.name}: bed ${slot.bedTemp} °C is above the ${p.maxBedTemp} °C of the ${p.model}.`);
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

export interface SliceOutput extends SliceResult { plateImage: Uint8Array; plateSmall: Uint8Array }

export async function runSlice(job: SliceJob, progress: Progress = () => {}, cancelled: () => boolean = () => false): Promise<SliceOutput> {
  const problems = plateProblems(job);
  if (problems.length) throw new Error(problems.join('\n'));
  const outcome = slicePaths({ meshes: job.meshes, process: job.process, nozzle: job.nozzle }, progress, cancelled);
  progress('Thumbnails', 0.88);
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
    thumbnailBlock = colpicBlock(imgs) + '\n' + pngThumbnailBlock(await encodePng(renderThumbnail(rm, 160, 160), 160, 160), 160, 160);
  }
  progress('G-code', 0.92);
  const built = buildGcode(outcome.layers, { printer: job.printer, nozzle: job.nozzle, process: job.process, slots: job.slots, name: job.name, appVersion: job.appVersion,
    startGcode: job.startGcode, endGcode: job.endGcode, thumbnailBlock });
  built.stats.warnings.unshift(...outcome.warnings, ...plateWarnings(job));
  const plateImage = await encodePng(renderThumbnail(rm, 512, 512), 512, 512);
  const plateSmall = await encodePng(renderThumbnail(rm, 128, 128), 128, 128);
  progress('Done', 1);
  return { stats: built.stats, preview: built.preview, gcode: built.gcode, key: '', plateImage, plateSmall };
}

/** the printer file of a slice: .gcode.3mf for Bambu Lab, .gcode for the others */
export async function printerFile(out: SliceOutput, job: SliceJob): Promise<{ name: string; data: Uint8Array; mime: string }> {
  const base = job.name.replace(/[^\w.-]+/g, '_') || 'plate';
  if (job.printer.fileFormat === 'gcode.3mf' || job.printer.gcodeFlavor === 'bambu') {
    const data = await bambuGcode3mf({ gcode: out.gcode, printer: job.printer, nozzle: job.nozzle, process: job.process, slots: job.slots, stats: out.stats, plateImage: out.plateImage,
      plateSmall: out.plateSmall, appVersion: job.appVersion, objects: job.meshes.map((m) => m.name) });
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
