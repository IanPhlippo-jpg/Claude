/**
 * Printer database and material profiles (docs/33 eis 2 and 3). The JSON files (printerDatabase.json,
 * materialProfiles.json) are written by the database agent; until they are there the loader falls back to the small
 * fixture below, so the tab and the tests work without them. The loader is tolerant about field names of the material
 * file (min/max/default as an object, as a range or as separate fields) and checks the plausibility limits of docs/34.
 */
import type { Material, Printer, ProcessPreset, ProcessSettings } from './types';

/** the fixture printers (values from the manufacturer pages; the full database replaces them) */
export const FIXTURE_PRINTERS: Printer[] = [
  { id: 'bambu-p1s', brand: 'Bambu Lab', model: 'P1S', technology: 'fdm', status: 'released', buildVolume: [256, 256, 256], bedShape: 'rectangle', nozzles: [{ diameter: 0.4, default: true },
    { diameter: 0.2 }, { diameter: 0.6 }, { diameter: 0.8 }], toolheads: 1, maxNozzleTemp: 300, maxBedTemp: 100, enclosure: true, multiMaterial: 'AMS (optional)', maxSpeed: 500,
      maxAccel: 20000, gcodeFlavor: 'bambu', fileFormat: 'gcode.3mf', sources: ['https://bambulab.com/en/p1/features'], assumptions: [] },
  { id: 'bambu-a1-mini', brand: 'Bambu Lab', model: 'A1 mini', technology: 'fdm', status: 'released', buildVolume: [180, 180, 180], bedShape: 'rectangle', nozzles: [{ diameter: 0.4,
    default: true }, { diameter: 0.2 }, { diameter: 0.6 }, { diameter: 0.8 }], toolheads: 1, maxNozzleTemp: 300, maxBedTemp: 80, enclosure: false, multiMaterial: 'AMS lite (optional)',
      maxSpeed: 500, maxAccel: 10000, gcodeFlavor: 'bambu', fileFormat: 'gcode.3mf', sources: ['https://bambulab.com/en/a1-mini'], assumptions: [] },
  { id: 'elegoo-centauri-carbon', brand: 'Elegoo', model: 'Centauri Carbon', technology: 'fdm', status: 'released', buildVolume: [256, 256, 256], bedShape: 'rectangle',
    nozzles: [{ diameter: 0.4,
    default: true }], toolheads: 1, maxNozzleTemp: 320, maxBedTemp: 110, enclosure: true, multiMaterial: false, maxSpeed: 500, maxAccel: 20000, gcodeFlavor: 'klipper', fileFormat: 'gcode',
      thumbnailFormat: 'elegoo-centauri', thumbnailSizes: [[144, 144]], sources: ['https://www.elegoo.com/products/centauri-carbon'], assumptions: [] },
  { id: 'elegoo-neptune-4-pro', brand: 'Elegoo', model: 'Neptune 4 Pro', technology: 'fdm', status: 'released', buildVolume: [225, 225, 265], bedShape: 'rectangle',
    nozzles: [{ diameter: 0.4,
    default: true }], toolheads: 1, maxNozzleTemp: 300, maxBedTemp: 110, enclosure: false, multiMaterial: false, maxSpeed: 500, maxAccel: 10000, gcodeFlavor: 'klipper', fileFormat: 'gcode',
      thumbnailFormat: 'elegoo-gimage', sources: ['https://www.elegoo.com/products/elegoo-neptune-4-pro-fdm-3d-printer'], assumptions: [] },
];

export const FIXTURE_MATERIALS: Material[] = [
  { id: 'pla', name: 'PLA', type: 'PLA', nozzleTemp: { min: 190, max: 230, default: 220 }, bedTemp: 60, density: 1.24, pricePerKg: 20, maxVolumetricSpeed: 21, cooling: 100, enclosure: false,
    color: '#f2f2f2' },
  { id: 'petg', name: 'PETG', type: 'PETG', nozzleTemp: { min: 230, max: 260, default: 250 }, bedTemp: 70, density: 1.27, pricePerKg: 22, maxVolumetricSpeed: 13, cooling: 40,
    enclosure: false, color: '#3a7bd5' },
  { id: 'abs', name: 'ABS', type: 'ABS', nozzleTemp: { min: 240, max: 270, default: 260 }, bedTemp: 100, density: 1.04, pricePerKg: 22, maxVolumetricSpeed: 16, cooling: 20, enclosure: true,
    color: '#d94a3a' },
  { id: 'tpu', name: 'TPU 95A', type: 'TPU', nozzleTemp: { min: 210, max: 240, default: 225 }, bedTemp: 40, density: 1.21, pricePerKg: 30, maxVolumetricSpeed: 3.5, cooling: 100,
    enclosure: false, color: '#2b2b2b' },
];

type Json = Record<string, unknown>;
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
const pick = (o: Json, ...keys: string[]): unknown => { for (const k of keys) if (o[k] !== undefined) return o[k]; return undefined; };
const listOf = (raw: unknown, key: string): Json[] => (Array.isArray(raw) ? raw : raw && typeof raw === 'object' && Array.isArray((raw as Json)[key]) ? (raw as Json)[key] as Json[] : []) as Json[];

/** a range from {min, max, default}, [min, max], or separate fields */
function range(o: Json, base: string, fallback: { min: number; max: number; default: number }): { min: number; max: number; default: number } {
  const v = o[base];
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const r = v as Json;
    const min = num(pick(r, 'min', 'low'), fallback.min), max = num(pick(r, 'max', 'high'), fallback.max);
    return { min, max, default: num(pick(r, 'default', 'recommended', 'typical'), (min + max) / 2) };
  }
  if (Array.isArray(v) && v.length >= 2) return { min: num(v[0], fallback.min), max: num(v[1], fallback.max), default: num(o[`${base}Default`], (num(v[0], 0) + num(v[1], 0)) / 2) };
  const min = num(pick(o, `${base}Min`, `${base}_min`), fallback.min), max = num(pick(o, `${base}Max`, `${base}_max`), fallback.max);
  return { min, max, default: num(pick(o, `${base}Default`, `${base}_default`, typeof v === 'number' ? base : '__none'), Math.round((min + max) / 2)) };
}

/** a material entry as the loader understands it (tolerant field names) */
export function normalizeMaterial(o: Json): Material {
  const name = String(pick(o, 'name', 'id') ?? 'Filament');
  const nozzleTemp = range(o, 'nozzleTemp', { min: 190, max: 230, default: 210 });
  const bedRaw = pick(o, 'bedTemp', 'bedTemperature');
  const bedTemp = typeof bedRaw === 'number' ? bedRaw : range(o, 'bedTemp', { min: 50, max: 70, default: 60 }).default;
  const mvsRaw = pick(o, 'maxVolumetricSpeed', 'maxVolumetricFlow', 'maxFlow', 'volumetricSpeed');
  const mvs = mvsRaw && typeof mvsRaw === 'object' ? num(Object.values(mvsRaw as Json)[0], 12) : num(mvsRaw, 12);
  return {
    id: String(pick(o, 'id') ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
    name,
    type: String(pick(o, 'type', 'family') ?? name).toUpperCase(),
    nozzleTemp,
    bedTemp,
    density: num(pick(o, 'density'), 1.24),
    pricePerKg: num(pick(o, 'pricePerKg', 'price', 'pricePerKilo'), 20),
    maxVolumetricSpeed: mvs,
    cooling: num(pick(o, 'cooling', 'fan', 'coolingPercent'), 100),
    enclosure: !!pick(o, 'enclosure', 'needsEnclosure', 'enclosureRequired'),
    hardenedNozzle: !!pick(o, 'hardenedNozzle', 'abrasive'),
    color: typeof o.color === 'string' ? o.color : undefined,
    diameter: num(pick(o, 'diameter', 'filamentDiameter'), 1.75),
  };
}

/** the problems of one printer entry (docs/34 3.1 plausibility); empty = valid */
export function validatePrinter(p: Printer): string[] {
  const e: string[] = [];
  if (!p.id) e.push('no id');
  if (!Array.isArray(p.buildVolume) || p.buildVolume.length !== 3) e.push('no build volume');
  else if (p.technology === 'fdm' && p.buildVolume.some((v) => !(v >= 50 && v <= 1000))) e.push(`build volume ${p.buildVolume.join(' x ')} outside 50..1000 mm`);
  if (!['released', 'announced', 'discontinued'].includes(p.status)) e.push(`status "${p.status}"`);
  if (p.technology === 'resin' && !['goo', 'ctb'].includes(p.fileFormat)) e.push(`resin file format "${p.fileFormat}"`);
  if (p.technology === 'fdm') {
    if (!(p.maxNozzleTemp >= 200 && p.maxNozzleTemp <= 400)) e.push(`max nozzle temperature ${p.maxNozzleTemp}`);
    if (!(p.maxBedTemp > 0 && p.maxBedTemp <= 140)) e.push(`max bed temperature ${p.maxBedTemp}`);
    // 50..2000 mm/s: the plausibility range of the database (the Bambu H3C is specified at 1400 mm/s)
    if (!(p.maxSpeed >= 50 && p.maxSpeed <= 2000)) e.push(`max speed ${p.maxSpeed}`);
    if (!(p.maxAccel > 0 && p.maxAccel <= 30000)) e.push(`max acceleration ${p.maxAccel}`);
    if (!p.nozzles?.length) e.push('no nozzles');
    if (!['bambu', 'klipper', 'marlin'].includes(p.gcodeFlavor)) e.push(`G-code flavor "${p.gcodeFlavor}"`);
  }
  return e;
}

export interface PrintDatabase { printers: Printer[]; materials: Material[]; fromFixture: boolean; problems: string[] }

/** the database from parsed JSON (either file may be missing: the fixture fills in) */
export function buildDatabase(printersRaw: unknown, materialsRaw: unknown): PrintDatabase {
  const problems: string[] = [];
  const printers = listOf(printersRaw, 'printers') as unknown as Printer[];
  const valid = printers.filter((p) => { const e = validatePrinter(p); if (e.length) problems.push(`${p.id}: ${e.join(', ')}`); return !e.length; });
  const materials = listOf(materialsRaw, 'materials').map(normalizeMaterial);
  const fromFixture = !valid.length || !materials.length;
  return { printers: valid.length ? valid : FIXTURE_PRINTERS, materials: materials.length ? materials : FIXTURE_MATERIALS, fromFixture, problems };
}

let cached: Promise<PrintDatabase> | null = null;
/** loads the JSON files lazily (docs/34 6.8: not in the start-up bundle); a missing file falls back to the fixture */
export function loadDatabase(): Promise<PrintDatabase> {
  if (cached) return cached;
  const files = import.meta.glob<{ default: unknown }>('./*.json');
  const get = (name: string) => (files[`./${name}`] ? files[`./${name}`]().then((m) => m.default).catch(() => null) : Promise.resolve(null));
  cached = Promise.all([get('printerDatabase.json'), get('materialProfiles.json')]).then(([p, m]) => buildDatabase(p, m));
  return cached;
}

export const printerName = (p: Printer) => `${p.brand} ${p.model}`;
export const isAnnounced = (p: Printer) => p.status === 'announced';
export const isDiscontinued = (p: Printer) => p.status === 'discontinued';
/** the FDM printers the slicer offers (resin follows in phase 4) */
export const fdmPrinters = (db: PrintDatabase) => db.printers.filter((p) => p.technology === 'fdm');
export const defaultNozzle = (p: Printer) => (p.nozzles.find((n) => n.default) ?? p.nozzles[0] ?? { diameter: 0.4 }).diameter;
export function isMultiMaterial(p: Printer): boolean {
  const m = p.multiMaterial;
  if (typeof m === 'number') return m > 1;
  if ((p.toolheads ?? 1) > 1) return true;
  return !!m && !/^(no|none|false|nee|0)$/i.test(String(m).trim());
}
/** multi-material G-code is written for these printers (Bambu AMS tool changes); others refuse with a message */
export const canWriteMultiMaterial = (p: Printer) => isMultiMaterial(p) && p.gcodeFlavor === 'bambu';
export const bedTempOf = (m: Material) => (typeof m.bedTemp === 'number' ? m.bedTemp : m.bedTemp.default);
/** the printable area polygon of a printer (default: the bed rectangle) */
export const printableArea = (p: Printer): [number, number][] => p.printableArea ?? [[0, 0], [p.buildVolume[0], 0], [p.buildVolume[0], p.buildVolume[1]], [0, p.buildVolume[1]]];
/**
 * the thumbnail writer for the printer screen (docs/34 R5): Bambu inside the .gcode.3mf ('none' in the G-code), the
 * Elegoo Neptune screens ColPic (;gimage/;simage), Klipper and the Centauri the PNG block
 */
export function thumbnailFormat(p: Printer): 'none' | 'png' | 'colpic' {
  const f = p.thumbnailFormat ?? '';
  if (f === 'bambu-png' || p.gcodeFlavor === 'bambu') return 'none';
  if (f === 'elegoo-gimage' || (!f && /neptune/i.test(p.model))) return 'colpic';
  return 'png';
}

/** layer heights per nozzle (docs/33 eis 3: 0.08 to 0.28 for 0.4) */
export function layerHeightsFor(nozzle: number): number[] {
  const lo = Math.max(0.04, Math.round(nozzle * 0.2 * 100) / 100), hi = Math.round(nozzle * 0.7 * 100) / 100;
  const out: number[] = [];
  for (let h = lo; h <= hi + 1e-9; h += 0.04) out.push(Math.round(h * 100) / 100);
  if (!out.includes(Math.round(nozzle * 0.5 * 100) / 100)) out.push(Math.round(nozzle * 0.5 * 100) / 100);
  return out.sort((a, b) => a - b);
}

/** the process profile: quality / standard / strong / fast, scaled to the nozzle and limited by the printer */
export function processProfile(preset: ProcessPreset, nozzle: number, printer: Printer): ProcessSettings {
  const h = { quality: 0.3, standard: 0.5, strong: 0.5, fast: 0.7 }[preset];
  const layerHeight = Math.round(nozzle * h * 100) / 100;
  const sp = { quality: 0.6, standard: 1, strong: 0.8, fast: 1.2 }[preset];
  const vmax = printer.maxSpeed;
  const speed = (v: number) => Math.round(Math.min(vmax, v * sp));
  return {
    preset,
    layerHeight,
    firstLayerHeight: Math.round(Math.max(layerHeight, nozzle * 0.5) * 100) / 100,
    lineWidth: Math.round(nozzle * 1.125 * 100) / 100,
    firstLayerLineWidth: Math.round(nozzle * 1.25 * 100) / 100,
    wallCount: preset === 'strong' ? 4 : 2,
    topLayers: Math.max(3, Math.round(0.8 / layerHeight)),
    bottomLayers: Math.max(3, Math.round(0.6 / layerHeight)),
    infillDensity: preset === 'strong' ? 0.35 : 0.15,
    infillPattern: preset === 'strong' ? 'gyroid' : 'grid',
    infillOverlap: 0.15,
    speedOuterWall: speed(150),
    speedInnerWall: speed(250),
    speedInfill: speed(270),
    speedSkin: speed(180),
    speedFirstLayer: 50,
    speedTravel: Math.min(vmax, 500),
    speedSupport: speed(150),
    speedBridge: 50,
    accel: Math.min(printer.maxAccel, 10000),
    retractLength: printer.gcodeFlavor === 'marlin' ? 1.2 : 0.8,
    retractSpeed: 30,
    retractMinTravel: 1,
    zHop: 0.4,
    skirtLoops: 1,
    skirtDistance: 3,
    brimWidth: 0,
    support: 'none',
    supportAngle: 30,
    supportDensity: 0.15,
    supportZGapLayers: 1,
    supportXYGap: 0.35,
    supportInterfaceLayers: 2,
    seam: 'aligned',
    variableLayerHeight: false,
    minLayerHeight: Math.round(nozzle * 0.2 * 100) / 100,
    maxLayerHeight: Math.round(nozzle * 0.7 * 100) / 100,
    minLayerTime: 6,
    arcFitting: false,
    firmwareRetraction: false,
    pressureAdvance: null,
    flushVolume: 140,
    primeTowerWidth: 35,
    primeTowerX: Math.max(10, printer.buildVolume[0] - 60),
    primeTowerY: Math.max(10, printer.buildVolume[1] - 60),
  };
}
