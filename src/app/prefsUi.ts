/**
 * What the General, Feature Tree, Default Templates, Import/Export and Units options of Tools ▸ Options do in the
 * panels and dialogs (0.5.16, advice 5.2 item 4): small functions the Manager pane, the Feature Tree, the New dialogs,
 * the Options dialog and the import call. prefsView.test.ts proves each one; prefsWired.ts lists them.
 */
import { getPref, type PrefValue } from './prefs';

const on = (key: string) => getPref(key) !== false;

/* ---------- General ---------------------------------------------------------------- */

/**
 * General ▸ Auto-show Property Panel: a command started from the Feature Tree (or the Tolerance / Display tab) shows
 * its Property Panel at once; off, the tree stays and the Property Panel tab shows it.
 */
export const autoShowPropertyPanel = (tab: string, commandActive: boolean): boolean =>
  tab === 'properties' || (commandActive && on('general.autoShowPM') && (tab === 'tree' || tab === 'autoTolerance' || tab === 'display'));

/* ---------- Feature Tree ----------------------------------------------------------- */

/**
 * Feature Tree ▸ Hide/show tree items: Automatic shows a folder as the intended design does (Equations only once
 * there are equations), Hide and Show force it. The value of a folder is stored under `fm.tree.<folder>`.
 */
const TREE_ITEMS_KEY = 'fm.tree';
export function treeItemShown(prefs: Record<string, PrefValue | undefined>, item: string, automatic: boolean): boolean {
  const how = String(prefs[`${TREE_ITEMS_KEY}.${item}`] ?? 'Automatic');
  return how === 'Show' || (how !== 'Hide' && automatic);
}

let lastTreeClick = { id: '', t: -Infinity };
/**
 * Feature Tree ▸ Edit name with slow double click: a second click on the selected item, a moment after the first
 * (0.5 to 2 s, slower than a double-click), opens its name for typing. Called on every click of a tree item.
 */
export function slowDoubleClick(id: string, wasSelected: boolean, now: number): boolean {
  const prev = lastTreeClick;
  lastTreeClick = { id, t: now };
  return on('fm.slowDoubleClick') && wasSelected && prev.id === id && now - prev.t >= 500 && now - prev.t <= 2000;
}

let treeFocus = false;
/** the Feature Tree was clicked last (Arrow key navigation): set by a pointer press inside or outside the tree */
export const setTreeFocus = (v: boolean): void => { treeFocus = v; };
/** Feature Tree ▸ Arrow key navigation: the arrow keys walk the tree (not the view) after a click in the tree */
export const treeArrowKeys = (): boolean => treeFocus && getPref('fm.arrowKeyNav') === true;

/** the item Up / Down moves to in the tree (the list of items in tree order), or null at an end */
export function treeArrowTarget(ids: readonly string[], current: string | null, key: string): string | null {
  if (key !== 'ArrowUp' && key !== 'ArrowDown') return null;
  if (!ids.length) return null;
  const i = current ? ids.indexOf(current) : -1;
  if (i < 0) return key === 'ArrowDown' ? ids[0] : ids[ids.length - 1];
  const j = key === 'ArrowDown' ? i + 1 : i - 1;
  return j >= 0 && j < ids.length ? ids[j] : null;
}

/** Feature Tree ▸ Show Comments in Property Panel: the comments of the feature being edited (none when off) */
export function commentsForPropertyPanel<C extends { featureId?: string }>(comments: readonly C[] | undefined, featureId: string | null | undefined): C[] {
  if (!featureId || !on('fm.commentsInPM')) return [];
  return (comments ?? []).filter((c) => c.featureId === featureId);
}

/* ---------- Default Templates ------------------------------------------------------ */

/**
 * Default Templates ▸ Parts / Assemblies: the template a new part or assembly is made from (matched by name, with or
 * without folder and .prtdot / .asmdot), the first template of that kind when the name is unknown.
 */
export function defaultTemplate<T extends { name: string; kind: string }>(list: readonly T[], kind: 'part' | 'assembly'): T | undefined {
  const want = String(getPref(kind === 'part' ? 'templates.part' : 'templates.assembly')).replace(/^.*[\\/]/, '').replace(/\.(prtdot|asmdot|drwdot)$/i, '').trim().toLowerCase();
  return list.find((t) => t.kind === kind && t.name.toLowerCase() === want) ?? list.find((t) => t.kind === kind);
}

/** Default Templates ▸ Prompt user to select document template: a new document opens the New dialog's template list */
export const promptForTemplate = (): boolean => String(getPref('templates.mode')).startsWith('Prompt');

/* ---------- Import / Export -------------------------------------------------------- */

/** Import ▸ Run Import Diagnostics (Healing): Import Diagnostics opens after a file is imported */
export const runImportDiagnostics = (): boolean => getPref('import.runDiagnostics') === true;

/** the options of each file format on the Import and Export pages (the File Format box chooses which are shown) */
const FORMAT_OPTIONS: Record<string, Record<string, string[]>> = {
  'import.format': { General: ['import.runDiagnostics'], STL: ['import.units'], STEP: ['import.runDiagnostics'] },
  'export.format': {
    STL: ['export.stlFormat', 'export.units', 'export.resolution', 'export.showPreview', 'export.singleFile'],
    '3MF': ['export.units', 'export.resolution', 'export.singleFile'],
    AMF: ['export.units', 'export.resolution', 'export.singleFile'],
    STEP: ['export.units'],
    IGES: ['export.units'],
    DXF: [],
    PDF: [],
  },
};

/**
 * Import / Export ▸ File Format: whether an option of the page belongs to the chosen format (options of other pages,
 * and the File Format box itself, are always shown).
 */
export function shownForFormat(key: string, values: Record<string, PrefValue | undefined>): boolean {
  const box = key.startsWith('import.') ? 'import.format' : key.startsWith('export.') ? 'export.format' : null;
  if (!box || key === box) return true;
  const per = FORMAT_OPTIONS[box];
  if (!Object.values(per).some((keys) => keys.includes(key))) return true;
  return (per[String(values[box] ?? '')] ?? Object.values(per)[0]).includes(key);
}

/* ---------- Units ------------------------------------------------------------------ */

const FORCE: Record<string, { label: string; perNewton: number }> = {
  newton: { label: 'N', perNewton: 1 },
  kilonewton: { label: 'kN', perNewton: 0.001 },
  'pound-force': { label: 'lbf', perNewton: 1 / 4.4482216152605 },
};
/** Document Properties ▸ Units ▸ Force: the unit forces are shown and typed in (values stay in newton inside) */
export const forceUnit = (): { label: string; perNewton: number } => FORCE[String(getPref('doc.forceUnit'))] ?? FORCE.newton;

/** Document Properties ▸ Units ▸ Time: the unit times are shown and typed in (values stay in seconds inside) */
export const timeUnit = (): { label: string; perSecond: number } => (String(getPref('doc.timeUnit')) === 'minute' ? { label: 'min', perSecond: 1 / 60 } : { label: 'sec', perSecond: 1 });
