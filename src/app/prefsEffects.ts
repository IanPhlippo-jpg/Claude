/**
 * What the options of Tools ▸ Options do outside the number format and the snaps (QA v0.5.11 F112): small pure
 * functions of the options that the viewport, the tree, the dialogs and the store call where the option takes effect.
 * prefsEffects.test.ts proves each one; the list of options that do something is prefsWired.ts.
 */
import { getPref } from './prefs';

const on = (key: string) => getPref(key) !== false;
const num = (key: string, def: number) => { const v = Number(getPref(key)); return Number.isFinite(v) ? v : def; };

/* ---------- View ---------------------------------------------------------------- */

/** View ▸ View rotation ▸ Mouse speed: the orbit factor (50 = the normal speed, 0 a quarter, 100 double) */
export function orbitSpeed(): number {
  const v = Math.min(100, Math.max(0, num('view.mouseSpeed', 50)));
  return v <= 50 ? 0.25 + (0.75 * v) / 50 : 1 + (v - 50) / 50;
}

/** View ▸ Transitions ▸ View transition: the time of a view change (Off = at once, Fast = half the normal time) */
export function viewTransitionMs(normal: number): number {
  const v = Math.min(100, Math.max(0, num('view.transitionView', 50)));
  return v === 0 ? 0 : Math.round(normal * (1.5 - v / 100));
}

/** Display ▸ Display reference triad */
export const showRefTriad = (): boolean => on('display.refTriad');

/** Display ▸ Dynamic highlight from graphics view: the face / edge under the pointer lights up, or nothing does */
export const hoverHighlight = <T,>(hover: T | null): T | null => (on('display.dynamicHighlight') ? hover : null);

/** Display ▸ Display shaded planes and Document Properties ▸ Plane Display ▸ Transparency: the fill of a plane */
export function planeFillOpacity(base: number): number {
  if (!on('display.shadedPlanes')) return 0;
  // 75 % transparency is the look of the planes by default; 0 % four times as dense, 100 % no fill
  return Math.min(1, base * ((100 - Math.min(100, Math.max(0, num('doc.planeTransparency', 75)))) / 25));
}

/** Colors ▸ Envelopes: envelope components are drawn see-through unless the option says Opaque */
export const envelopeTransparent = (): boolean => String(getPref('colors.envelopes')) !== 'Opaque';

/** Display ▸ Anti-aliasing: None draws the edges without it (takes effect when the graphics area is made) */
export const rendererAntialias = (): boolean => String(getPref('display.antialias')) !== 'None';

/** Performance ▸ Use shaded preview: the preview of a feature as a shaded body, or only its edges */
export const shadedPreview = (): boolean => on('perf.shadedPreview');

/** Document Properties ▸ Grid/Snap ▸ Dash: the grid in dashed lines */
export const gridDashed = (): boolean => getPref('doc.gridDash') === true;

/** Display ▸ Part/Assembly tangent edge display */
export const tangentEdgeMode = (): 'visible' | 'phantom' | 'removed' => (({ 'As visible': 'visible', 'As phantom': 'phantom', Removed: 'removed' } as const)[String(getPref('display.tangentEdges')) as 'Removed'] ?? 'visible');

/** Display ▸ Hidden edges displayed as Dashed (Hidden Lines Visible) */
export const hiddenEdgesDashed = (): boolean => getPref('display.hiddenEdges') === 'Dashed';

/** Display ▸ Show breadcrumbs on selection */
export const showBreadcrumbs = (): boolean => on('display.breadcrumbs');

/** View ▸ Zoom to fit when changing to standard views */
export const zoomFitOnStandardView = (): boolean => getPref('view.zoomFitStandard') === true;

/** View ▸ View rotation ▸ Arrow keys: the turn of one arrow key press (Shift: 90°) */
export const arrowKeyStep = (shift: boolean): number => (shift ? 90 : num('view.arrowKeys', 15) || 15);

/** Performance ▸ Magnified selection (the G key) */
export const magnifiedSelection = (): boolean => on('perf.magnifiedSelection');

/** Document Properties ▸ Grid/Snap: the spacing of the minor grid lines (automatic: 40 … 100 px apart) and the minor lines per major */
export function gridSpacing(scale: number): { spacing: number; minorPerMajor: number } {
  const target = 60 * scale;
  const step = Math.pow(10, Math.floor(Math.log10(target)));
  const minorPerMajor = Math.max(1, Math.round(num('doc.gridMinor', 4) || 4));
  const spacing = getPref('doc.gridAutoScale') === false ? Math.max(0.01, (num('doc.gridMajor', 10) || 10) / minorPerMajor) : target / step >= 5 ? step * 5 : target / step >= 2 ? step * 2 : step;
  return { spacing, minorPerMajor };
}

/* ---------- Sketch -------------------------------------------------------------- */

/** Sketch ▸ Display entity points in part/assembly sketches */
export const showEntityPoints = (): boolean => on('sketch.entityPoints');

/** Sketch ▸ Enable on screen numeric input on entity creation */
export const numericInputOn = (): boolean => getPref('sketch.numericInput') === true;

/** General ▸ Input dimension value: a new dimension opens its Modify box */
export const promptDimensionValue = (): boolean => getPref('general.inputDimensionValue') === true;

/** Spin Box Increments: the step of the Modify box of a dimension (angle, or a length in English / metric units) */
export const spinIncrement = (prefs: Record<string, unknown>, angle: boolean, english: boolean): number => (angle ? Number(prefs['spin.angle']) || 1 : english ? Number(prefs['spin.lengthEnglish']) || 0.1 : Number(prefs['spin.lengthMetric']) || 10);

/** Sketch ▸ Auto-rotate view normal to sketch plane on sketch creation and sketch edit */
export const sketchAutoRotate = (): boolean => on('sketch.autoRotate');

/** Sketch ▸ Display arc centerpoints: the centre point of an arc or circle is drawn */
export const showSketchPoint = (e: { kind: string; center?: string }, pointId: string): boolean => on('sketch.arcCenterpoints') || !((e.kind === 'arc' || e.kind === 'circle') && e.center === pointId);

/** Selection ▸ Default bulk selection method: a drag in empty space draws a lasso instead of a box */
export const defaultLasso = (): boolean => String(getPref('selection.bulk')) === 'Lasso';

/* ---------- Feature tree --------------------------------------------------------- */

/** Feature Tree ▸ Dynamic highlight: pointing at a tree item lights up its geometry */
export const treeHoverHighlight = (): boolean => on('fm.dynamicHighlight');

/** Feature Tree ▸ Scroll selected item into view: the tree row of a selection made in the graphics area is scrolled to */
export function scrollTreeSelection(id: string | null, root: ParentNode | null = typeof document === 'undefined' ? null : document): boolean {
  if (!id || !root || !on('fm.scrollIntoView')) return false;
  const row = root.querySelector(`.k-tree-row[data-id="${id.replace(/["\\]/g, '\\$&')}"]`) as HTMLElement | null;
  row?.scrollIntoView?.({ block: 'nearest' });
  return !!row;
}

/** Messages/Errors/Warnings ▸ Display Feature Tree warnings (Always / Never / All but top level) */
export function showTreeWarning(topLevel = false): boolean {
  if (!on('msg.displayOverDefined')) return false;
  const v = String(getPref('msg.treeWarnings'));
  return v !== 'Never' && !(v === 'All but top level' && topLevel);
}

/** Feature Tree ▸ Comments ▸ Automatically add timestamp to comments: the time a new comment carries (or none) */
export const commentStamp = (now: Date = new Date()): string => (on('fm.commentTimestamp') ? now.toISOString().slice(0, 16).replace('T', ' ') : '');

/** Spin Box Increments ▸ Time increments: the step of the time boxes (Motion Study) */
export const timeStep = (): number => (num('spin.time', 0.1) > 0 ? num('spin.time', 0.1) : 0.1);

/** Feature Tree ▸ Enable Feature Tree filter */
export const treeFilterShown = (prefs: Record<string, unknown>): boolean => prefs['fm.treeFilter'] !== false;

/* ---------- General ---------------------------------------------------------------- */

/** General ▸ Enable Confirmation Corner */
export const confirmationCornerOn = (prefs: Record<string, unknown>): boolean => prefs['general.confirmationCorner'] !== false;

/**
 * Backup/Recover ▸ Save auto-recover info every … minutes and Show reminder if document has not been saved for …
 * minutes (dismissed after … seconds): what is due at `now` for a document changed since `since`.
 */
export function recoverSchedule(now: number, since: number, lastRecover: number, lastReminder: number): { recover: boolean; remind: boolean; dismissMs: number } {
  const minutes = (key: string) => Math.max(1, Number(getPref(key)) || 1) * 60_000;
  return {
    recover: on('backup.autoRecover') && now - Math.max(since, lastRecover) >= minutes('backup.autoRecoverMinutes'),
    remind: getPref('backup.saveNotify') === true && now - Math.max(since, lastReminder) >= minutes('backup.saveNotifyMinutes'),
    dismissMs: Math.max(1, Number(getPref('backup.saveNotifySeconds')) || 5) * 1000,
  };
}

/** General ▸ Maximum recent documents displayed */
export const recentDocuments = <T,>(list: T[]): T[] => list.slice(0, Math.max(1, Math.round(num('general.recentMax', 50))));

/** General ▸ Show latest Technical Alerts and News in Welcome dialog: the tabs of the Welcome dialog */
export const welcomeTabs = (): ('home' | 'recent' | 'learn' | 'alerts')[] => (on('general.technicalAlerts') ? ['home', 'recent', 'learn', 'alerts'] : ['home', 'recent', 'learn']);

/** File Explorer ▸ Show in File Explorer view ▸ Recent Documents */
export const explorerRecent = (): boolean => on('fe.recent');

/** General ▸ Open last used document(s) at startup */
export const openLastAtStartup = (hasLast: boolean): boolean => hasLast && String(getPref('general.openLastAtStartup')) === 'Always';

/* ---------- Assemblies ------------------------------------------------------------- */

/** Document Properties ▸ Mates ▸ Default mate alignment: the Aligned state a new mate starts with */
export const defaultMateAligned = (): boolean => String(getPref('doc.mateAlignment')) === 'Aligned';

/** Document Properties ▸ Mates ▸ Make first component fixed */
export const fixFirstComponent = (): boolean => on('doc.mateMakeFirstFixed');

/** Document Properties ▸ Mates: the Options of the Mate Property Panel a new mate starts with */
export const mateOptionDefaults = (): { popup: boolean; preview: boolean; positionOnly: boolean } => ({ popup: on('doc.mateShowPopup'), preview: on('doc.mateShowPreview'), positionOnly: getPref('doc.mateUseForPositioning') === true });

/** the option key that a Mate Property Panel box writes back to */
export const MATE_OPTION_KEYS = { popup: 'doc.mateShowPopup', preview: 'doc.mateShowPreview', positionOnly: 'doc.mateUseForPositioning' } as const;

/** Assemblies ▸ Use Large Assembly Settings when an assembly has more than this number of components */
export const largeAssemblyDue = (count: number): boolean => on('asm.largeAssembly') && count > Math.max(1, num('asm.largeThreshold', 500));

/** Large Assembly Settings: no shadows or Realistic Shading; Hide all planes, axes, sketches …; Do not display edges */
export function largeAssemblyLook<S extends { planes: boolean; origin: boolean; sketches: boolean; shadows: boolean; realisticShading: boolean }>(show: S): { show: S; displayStyle?: 'shaded' } {
  const s: S = { ...show, shadows: false, realisticShading: false };
  if (on('asm.largeHideAll')) Object.assign(s, { planes: false, origin: false, sketches: false });
  return { show: s, ...(on('asm.largeNoEdges') ? { displayStyle: 'shaded' as const } : {}) };
}

/* ---------- Saving ----------------------------------------------------------------- */

/**
 * Backup/Recover ▸ Number of backup copies per document and Remove backups older than: what the desktop shell keeps
 * next to a saved document (electron/backups.cjs). Off: the two previous versions (.bak, .bak2), kept without age.
 */
export function backupPolicy(): { copies: number; removeDays: number } {
  if (getPref('backup.enabled') !== true) return { copies: 2, removeDays: 0 };
  return { copies: Math.max(1, Math.min(10, Math.round(num('backup.copies', 1)))), removeDays: on('backup.removeOld') ? Math.max(1, Math.round(num('backup.removeDays', 7))) : 0 };
}

/** Messages/Errors/Warnings ▸ Warn before saving documents with update errors */
export const warnSaveWithErrors = (): boolean => on('msg.warnRebuild');

/* ---------- Import / Export -------------------------------------------------------- */

/** System Options ▸ Import ▸ Unit: an STL file has no unit, its numbers are read in this one (to millimetres) */
export function importScale(positions: number[]): number[] {
  const k = ({ Millimeters: 1, Centimeters: 10, Meters: 1000, Inches: 25.4, Feet: 304.8 } as Record<string, number>)[String(getPref('import.units'))] ?? 1;
  return k === 1 ? positions : positions.map((v) => v * k);
}

const EXPORT_UNITS = { Millimeters: 'mm', Centimeters: 'cm', Meters: 'm', Inches: 'in' } as const;
type ExportUnit = (typeof EXPORT_UNITS)[keyof typeof EXPORT_UNITS];

/** System Options ▸ Export: the STL format, unit, resolution and "Show STL info" the Export Options page starts with */
export function exportDefaults(): { ascii: boolean; unit: ExportUnit; resolution: 'coarse' | 'fine' | 'custom'; showInfo: boolean; single: boolean } {
  const res = String(getPref('export.resolution')).toLowerCase();
  return {
    ascii: String(getPref('export.stlFormat')) === 'ASCII',
    unit: EXPORT_UNITS[String(getPref('export.units')) as keyof typeof EXPORT_UNITS] ?? 'mm',
    resolution: res === 'coarse' || res === 'custom' ? res : 'fine',
    showInfo: on('export.showPreview'),
    single: on('export.singleFile'),
  };
}

/** the choices of the Export Options page written back as the System Options ▸ Export settings */
export function exportPrefs(o: { ascii: boolean; unit: string; resolution: string; showInfo: boolean }): Record<string, string | boolean> {
  const unit = (Object.keys(EXPORT_UNITS) as (keyof typeof EXPORT_UNITS)[]).find((k) => EXPORT_UNITS[k] === o.unit) ?? 'Millimeters';
  return { 'export.stlFormat': o.ascii ? 'ASCII' : 'Binary', 'export.units': unit, 'export.resolution': o.resolution.charAt(0).toUpperCase() + o.resolution.slice(1), 'export.showPreview': o.showInfo };
}

/* ---------- Drawings --------------------------------------------------------------- */

/** Drafting Standard: ISO and DIN project in first angle, the others in third angle */
export const firstAngleStandard = (std: unknown): boolean => std === 'ISO' || std === 'DIN';


/** Detailing ▸ Auto insert on view creation ▸ Center marks-holes */
export const autoCenterMarksOn = (): boolean => on('doc.autoCenterMarks');

/** Auto Tolerancing ▸ Block tolerance: the ± of 1, 2 and 3 decimal lengths and of angles */
export const blockTolerances = (prefs: Record<string, unknown>): { length1: number; length2: number; length3: number; angle: number } => ({ length1: Number(prefs['doc.blockLength1'] ?? 0.5), length2: Number(prefs['doc.blockLength2'] ?? 0.25), length3: Number(prefs['doc.blockLength3'] ?? 0.1), angle: Number(prefs['doc.blockAngle'] ?? 0.5) });

/** Drawings ▸ Display Style ▸ Display quality for new views: Draft quality */
export const newViewDraft = (): boolean => String(getPref('drawings.quality')) === 'Draft quality';

/** Drawings ▸ Automatically scale new drawing views */
export const autoScaleNewViews = (): boolean => on('drawings.autoScale');

/** Drawings ▸ Eliminate duplicate model dimensions on insert */
export const eliminateDuplicateDims = (): boolean => on('drawings.eliminateDuplicate');
