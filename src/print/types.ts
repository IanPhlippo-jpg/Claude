/**
 * The data model of the 3D Print extension (docs/33, docs/34). Pure types: the slicer core (src/print) runs in a worker
 * and in vitest under Node, so nothing here imports three.js or the DOM.
 *
 * Coordinates on the plate are printer coordinates in mm: X right, Y to the back, Z up, origin at the front-left corner
 * of the bed (or the centre, see Printer.origin).
 */

/** one entry of src/print/printerDatabase.json (written by the database agent; extra fields are optional here) */
export interface Printer {
  id: string;
  brand: string;
  model: string;
  technology: 'fdm' | 'resin';
  /** 'released', 'announced' or 'discontinued' (announced printers export after a confirmation) */
  status: 'released' | 'announced' | 'discontinued' | string;
  /** date or text of the announcement */
  announced?: string | null;
  /** X, Y, Z in mm */
  buildVolume: [number, number, number];
  bedShape?: string;
  nozzles: { diameter: number; default?: boolean }[];
  toolheads?: number;
  maxNozzleTemp: number;
  maxBedTemp: number;
  enclosure?: boolean | string;
  /** AMS / multi-material: false, or a description such as "AMS (4-16)" */
  multiMaterial?: boolean | string | number;
  /** mm/s */
  maxSpeed: number;
  /** mm/s² */
  maxAccel: number;
  gcodeFlavor: 'bambu' | 'klipper' | 'marlin' | '';
  fileFormat: 'gcode.3mf' | 'gcode' | 'goo' | 'ctb';
  firmware?: string;
  sources?: (string | { url?: string; field?: string; title?: string })[];
  assumptions?: (string | { field?: string; note?: string })[];
  resin?: unknown;
  /** the area the model may use, as a polygon [[x, y], ...] (default: the bed rectangle) */
  printableArea?: [number, number][];
  /** zones the model must not touch (each a polygon) */
  excludeAreas?: [number, number][][];
  /** the box the start and end code may travel in, per axis [min, max] mm (default: the build volume) */
  travelLimits?: { x: [number, number]; y: [number, number]; z: [number, number] };
  /** where 0,0 is: the front-left corner (default) or the centre of the bed */
  origin?: 'front-left' | 'center';
  /**
   * the thumbnail the printer screen shows: 'bambu-png' (inside the .gcode.3mf), 'klipper-png' and 'elegoo-centauri'
   * (block "; thumbnail begin"), 'elegoo-gimage' (Elegoo ;gimage/;simage), 'goo-preview' / 'ctb-preview' (resin, phase 4)
   */
  thumbnailFormat?: 'bambu-png' | 'klipper-png' | 'elegoo-gimage' | 'elegoo-centauri' | 'goo-preview' | 'ctb-preview' | string;
  thumbnailSizes?: [number, number][];
  /** 'niet getest' | 'bestand geopend in fabrikantslicer' | 'geprint op <datum>' (docs/34 E16) */
  validatie?: string;
  notes?: string[];
}

/** one material profile of src/print/materialProfiles.json */
export interface Material {
  id: string;
  name: string;
  /** PLA, PETG, ABS, ... */
  type?: string;
  nozzleTemp: { min: number; max: number; default: number };
  bedTemp: number | { min?: number; max?: number; default: number };
  /** g/cm³ */
  density: number;
  /** € per kg */
  pricePerKg: number;
  /** mm³/s */
  maxVolumetricSpeed: number;
  /** part cooling fan in % */
  cooling: number;
  /** needs an enclosed printer */
  enclosure?: boolean;
  /** needs a hardened nozzle (fibre-filled) */
  hardenedNozzle?: boolean;
  color?: string;
  /** filament diameter, mm (default 1.75) */
  diameter?: number;
  /** the range the part cooling fan may take, % */
  coolingRange?: { min: number; max: number };
}

export type InfillPattern = 'rectilinear' | 'grid' | 'gyroid' | 'honeycomb';
export type SeamPosition = 'aligned' | 'rear' | 'nearest' | 'random';
export type SupportKind = 'none' | 'normal' | 'tree';
export type ProcessPreset = 'quality' | 'standard' | 'strong' | 'fast';

/** the process settings of one slice (the profile plus the user's changes) */
export interface ProcessSettings {
  preset: ProcessPreset;
  layerHeight: number;
  firstLayerHeight: number;
  lineWidth: number;
  firstLayerLineWidth: number;
  wallCount: number;
  topLayers: number;
  bottomLayers: number;
  /** 0..1 */
  infillDensity: number;
  infillPattern: InfillPattern;
  /** overlap of infill and skin onto the innermost wall, fraction of the line width */
  infillOverlap: number;
  speedOuterWall: number;
  speedInnerWall: number;
  speedInfill: number;
  speedSkin: number;
  speedFirstLayer: number;
  speedTravel: number;
  speedSupport: number;
  speedBridge: number;
  /** print acceleration, mm/s² (clamped to the printer's maximum) */
  accel: number;
  retractLength: number;
  retractSpeed: number;
  /** travel longer than this retracts, mm */
  retractMinTravel: number;
  zHop: number;
  skirtLoops: number;
  skirtDistance: number;
  brimWidth: number;
  support: SupportKind;
  /** overhangs flatter than this angle from the horizontal get support (degrees) */
  supportAngle: number;
  supportDensity: number;
  /** layers of gap between support and model, top and bottom */
  supportZGapLayers: number;
  supportXYGap: number;
  supportInterfaceLayers: number;
  seam: SeamPosition;
  variableLayerHeight: boolean;
  minLayerHeight: number;
  maxLayerHeight: number;
  /** a layer takes at least this long (s); faster layers slow down */
  minLayerTime: number;
  /** off by default (docs/34 R6, R7, R8) */
  arcFitting: boolean;
  firmwareRetraction: boolean;
  pressureAdvance: number | null;
  /** multi-material: purge volume per tool change, mm³ */
  flushVolume: number;
  primeTowerWidth: number;
  /** prime tower position (front-left corner on the bed), mm; placed free of the parts by the slicer */
  primeTowerX: number;
  primeTowerY: number;
  /** the build plate type (a Bambu start code reads it as curr_bed_type) */
  bedType: string;
}

/** one filament slot (AMS tray or the single spool): data model for multi-material (docs/34 E8) */
export interface FilamentSlot {
  materialId: string;
  color: string;
  /** nozzle temperature for this slot (default from the material) */
  nozzleTemp?: number;
  bedTemp?: number;
}

/** what is printed: the material, temperatures and slots */
export interface FilamentSettings {
  slots: FilamentSlot[];
}

/** a triangle mesh in plate coordinates: positions xyz per vertex, three vertices per triangle (no index) */
export interface PlateMesh {
  positions: Float32Array;
  /** which filament slot prints it (0-based) */
  filament: number;
  name: string;
}

/** one part on the plate: its mesh in its own coordinates and its placement */
export interface PlateItem {
  id: string;
  name: string;
  /** the source mesh, Z up, in part coordinates (mm) */
  positions: Float32Array;
  /** placement: column-major 4x4 matrix, part -> plate */
  matrix: number[];
  filament: number;
  /** where the mesh comes from: refreshed from the model after a rebuild, and how the plate is stored in the document */
  source?: ItemSource;
  /** a fingerprint of the mesh (a changed part makes the slice stale: docs/35 P2-8) */
  hash?: string;
}

/** the origin of a part on the plate */
export type ItemSource = { kind: 'part' } | { kind: 'body'; index: number } | { kind: 'component'; id: string } | { kind: 'assembly' } | { kind: 'mesh' };

/** the plates as stored in the document (file format 4, docs/35 P2-12): the meshes come back from the model by source */
export interface PrintDocData {
  printerId?: string;
  nozzle?: number;
  plates: { name: string; items: { name: string; source: ItemSource; matrix: number[]; filament: number }[] }[];
}

export interface Plate {
  id: string;
  name: string;
  items: PlateItem[];
}

/** the kinds of lines in the preview and the G-code */
export const LINE_TYPES = ['outerWall', 'innerWall', 'skin', 'bridge', 'infill', 'support', 'supportInterface', 'skirt', 'primeTower', 'travel'] as const;
export type LineType = (typeof LINE_TYPES)[number];
export const LINE_TYPE_ID: Record<LineType, number> = Object.fromEntries(LINE_TYPES.map((t, i) => [t, i])) as Record<LineType, number>;

/** a path of one kind on one layer, in mm */
export interface ToolPath {
  type: LineType;
  /** x, y pairs */
  points: number[];
  closed: boolean;
  width: number;
  /** mm/s, before the volumetric and layer-time limits */
  speed: number;
  filament: number;
}

export interface SliceLayer {
  /** top of the layer, mm */
  z: number;
  /** layer height, mm */
  height: number;
  paths: ToolPath[];
}

/** what the slicer reports besides the G-code */
export interface SliceStats {
  layers: number;
  /** seconds, model only (without heating and homing) */
  printTime: number;
  /** seconds including the start sequence estimate */
  totalTime: number;
  /** per filament slot: mm of filament, mm³, g, € */
  filament: { slot: number; length: number; volume: number; grams: number; cost: number }[];
  /** time per line type, s */
  timeByType: Record<string, number>;
  /** extruded volume per line type, mm³ */
  volumeByType: Record<string, number>;
  toolChanges: number;
  warnings: string[];
}

/**
 * Flat preview data (docs/34 2.1: no object per segment): per segment 11 floats
 * x0, y0, x1, y1, z, width, height, type, speed (mm/s), filament, fan (%); `layerStart[i]` is the first segment of layer i.
 */
export interface PreviewData {
  segs: Float32Array;
  layerStart: Uint32Array;
  layerZ: Float32Array;
  layerHeight: Float32Array;
}
export const SEG_STRIDE = 11;

/** start, end and filament-change G-code imported from the user's own Bambu Studio machine profile (docs/35 P1-4, P1-5) */
export interface MachineCode {
  start?: string;
  end?: string;
  change?: string;
  /** the printer the profile is for ("Bambu Lab P1S"); the code is only used on that model */
  printerModel: string;
  profileName: string;
}

/** the preview as a triangle mesh, built in the worker: 8 vertices and 18 indices per segment of PreviewData */
export interface PreviewMeshData { positions: Float32Array; normals: Int8Array; index: Uint32Array }

export interface SliceResult {
  stats: SliceStats;
  preview: PreviewData;
  mesh: PreviewMeshData;
  /** the G-code as chunks of ASCII bytes (docs/34 2.1: no single string) */
  gcode: Uint8Array[];
  /** a hash of the inputs (stale detection) */
  key: string;
}

/** progress of a running slice */
export interface SliceProgress {
  stage: string;
  /** 0..1 */
  fraction: number;
}
