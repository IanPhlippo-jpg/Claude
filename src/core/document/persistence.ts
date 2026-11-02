import type { Document } from './types';
import { newId } from '../sketch/model';
import { ENTITY_POINT_FIELDS, ENTITY_SCALAR_FIELDS, FEATURE_TYPES } from './featureTypes';

export const FILE_EXTENSION = '.kcad';
/** the file format this build writes; older files pass through MIGRATIONS, newer ones are refused */
export const FILE_VERSION = 2;
const AUTOSAVE_KEY = 'phlippo.autosave';
const AUTOSAVE_INDEX = 'phlippo.autosave.index';
const AUTOSAVE_DOC_PREFIX = 'phlippo.autosave.doc.';
/** per-document recovery copies kept (Document Recovery / Welcome ▸ Recent) */
const AUTOSAVE_KEEP = 5;
/** a per-document copy is skipped above this size so the main autosave never runs out of storage */
const AUTOSAVE_COPY_MAX = 1_000_000;
/** files above this size are refused (a .kcad of a normal part is well under 10 MB) */
export const MAX_FILE_BYTES = 64 * 1024 * 1024;

/** a file that is not a Phlippo CAD document, or a damaged one; the message says what is wrong */
export class DocumentFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentFormatError';
  }
}

/** Own file format: versioned JSON. */
export function serializeDocument(doc: Document): string {
  return JSON.stringify({ format: 'phlippo-cad', ...doc }, null, 2);
}

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => !!v && typeof v === 'object' && !Array.isArray(v);
/** the largest length a field accepts (mm), as the input fields of the app */
export const MAX_FIELD_LENGTH = 1e6;
/** the largest magnitude any number in a file may have (material constants such as E in Pa need more than lengths) */
export const MAX_FILE_NUMBER = 1e12;
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= MAX_FILE_NUMBER;
const isVec = (v: unknown, n: number) => Array.isArray(v) && v.length === n && v.every(isNum);
const isBool = (v: unknown) => typeof v === 'boolean';
/** nesting a file may have (an assembly in a drawing in … ); deeper is refused before anything recurses on it */
export const MAX_FILE_DEPTH = 64;
/** nodes (objects + arrays + values) a file may have; a 64 MB file of a real part stays well under it */
export const MAX_FILE_NODES = 20_000_000;

/**
 * Structural limits over the whole tree, before any field is looked at: nesting depth, node count, finite numbers
 * within range, and no string longer than 16 MB. A file that fails here is refused with the path of the problem.
 */
export function checkStructure(raw: unknown): void {
  let nodes = 0;
  const walk = (v: unknown, depth: number, where: string): void => {
    if (++nodes > MAX_FILE_NODES) throw new DocumentFormatError('The file has more content than this version reads.');
    if (depth > MAX_FILE_DEPTH) throw new DocumentFormatError(`The file is nested too deeply at ${where}.`);
    if (typeof v === 'number') {
      if (!Number.isFinite(v) || Math.abs(v) > MAX_FILE_NUMBER) throw new DocumentFormatError(`${where} holds a number out of range (${String(v)}).`);
    } else if (typeof v === 'string') {
      if (v.length > 16 * 1024 * 1024) throw new DocumentFormatError(`${where} holds a text that is too long.`);
    } else if (Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) walk(v[i], depth + 1, `${where}[${i}]`);
    } else if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') throw new DocumentFormatError(`${where} holds a forbidden key "${k}".`);
        walk((v as Raw)[k], depth + 1, where ? `${where}.${k}` : k);
      }
    }
  };
  walk(raw, 0, '');
}

/** assembly component: an embedded part (checked like a document), a placement and the flags */
function validateComponent(c: unknown, i: number, depth: number): void {
  if (!isObj(c) || typeof c.id !== 'string' || typeof c.name !== 'string') throw new DocumentFormatError(`Component ${i + 1} is damaged.`);
  if (!isObj(c.part)) throw new DocumentFormatError(`Component "${c.name}" has no part.`);
  try {
    validateDocument(c.part, depth + 1);
  } catch (err) {
    throw new DocumentFormatError(`Component "${c.name}": ${(err as Error).message}`);
  }
  if (!isVec(c.position, 3)) throw new DocumentFormatError(`Component "${c.name}" has no valid position.`);
  if (!isVec(c.rotation, 4)) throw new DocumentFormatError(`Component "${c.name}" has no valid rotation.`);
  if (!isBool(c.fixed) || !isBool(c.suppressed)) throw new DocumentFormatError(`Component "${c.name}" has no valid flags.`);
  if (c.hidden !== undefined && !isBool(c.hidden)) throw new DocumentFormatError(`Component "${c.name}": hidden is not a flag.`);
  if (c.configuration !== undefined && typeof c.configuration !== 'string') throw new DocumentFormatError(`Component "${c.name}": configuration is not a name.`);
}

function validateMate(m: unknown, i: number, componentIds: Set<string>): void {
  if (!isObj(m) || typeof m.id !== 'string' || typeof m.type !== 'string' || typeof m.name !== 'string') throw new DocumentFormatError(`Mate ${i + 1} is damaged.`);
  if (!Array.isArray(m.refs) || m.refs.length !== 2 || !m.refs.every((r) => isObj(r) && typeof r.componentId === 'string')) throw new DocumentFormatError(`Mate "${m.name}" has no two references.`);
  for (const r of m.refs as Raw[]) if (!componentIds.has(r.componentId as string)) throw new DocumentFormatError(`Mate "${m.name}" refers to a component that is not in the assembly.`);
  if (!isBool(m.aligned)) throw new DocumentFormatError(`Mate "${m.name}" has no alignment.`);
  if (m.value !== undefined && !isNum(m.value)) throw new DocumentFormatError(`Mate "${m.name}" has no valid value.`);
  if (m.suppressed !== undefined && !isBool(m.suppressed)) throw new DocumentFormatError(`Mate "${m.name}": suppressed is not a flag.`);
}

function validateSheet(sh: unknown, i: number, depth: number): void {
  if (!isObj(sh) || typeof sh.id !== 'string' || typeof sh.name !== 'string') throw new DocumentFormatError(`Sheet ${i + 1} is damaged.`);
  if (typeof sh.size !== 'string' || !isBool(sh.landscape) || !isVec(sh.scale, 2) || !isBool(sh.showFormat)) throw new DocumentFormatError(`Sheet "${sh.name}" has no valid format.`);
  if ((sh.scale as number[]).some((x) => x <= 0)) throw new DocumentFormatError(`Sheet "${sh.name}" has a scale of zero.`);
  // lists that older drawings may not have start empty; a list of the wrong type is damage
  for (const k of ['dimensions', 'notes', 'centerMarks'] as const) if (sh[k] === undefined) sh[k] = [];
  if (!Array.isArray(sh.views) || !Array.isArray(sh.dimensions) || !Array.isArray(sh.notes) || !Array.isArray(sh.centerMarks)) throw new DocumentFormatError(`Sheet "${sh.name}" misses its view, dimension or note list.`);
  const viewIds = new Set<string>();
  sh.views.forEach((v, j) => {
    if (!isObj(v) || typeof v.id !== 'string' || typeof v.name !== 'string' || typeof v.type !== 'string') throw new DocumentFormatError(`Sheet "${sh.name}": view ${j + 1} is damaged.`);
    if (!isVec(v.position, 2)) throw new DocumentFormatError(`View "${v.name}" has no valid position.`);
    if (v.scale !== undefined && (!isVec(v.scale, 2) || (v.scale as number[]).some((x) => x <= 0))) throw new DocumentFormatError(`View "${v.name}" has no valid scale.`);
    if (typeof v.displayStyle !== 'string') throw new DocumentFormatError(`View "${v.name}" has no display style.`);
    if (!isObj(v.model)) throw new DocumentFormatError(`View "${v.name}" has no model.`);
    try {
      validateDocument(v.model, depth + 1);
    } catch (err) {
      throw new DocumentFormatError(`View "${v.name}": ${(err as Error).message}`);
    }
    viewIds.add(v.id);
  });
  for (const v of sh.views as Raw[]) if (v.parentId !== undefined && !viewIds.has(v.parentId as string)) throw new DocumentFormatError(`View "${v.name}" refers to a parent view that is not on the sheet.`);
  sh.dimensions.forEach((d, j) => { if (!isObj(d) || typeof d.id !== 'string') throw new DocumentFormatError(`Sheet "${sh.name}": dimension ${j + 1} is damaged.`); if (d.value !== undefined && !isNum(d.value)) throw new DocumentFormatError(`Sheet "${sh.name}": dimension ${j + 1} has no valid value.`); });
  sh.notes.forEach((n, j) => { if (!isObj(n) || typeof n.id !== 'string' || typeof n.text !== 'string' || !isVec(n.position, 2)) throw new DocumentFormatError(`Sheet "${sh.name}": note ${j + 1} is damaged.`); });
  sh.centerMarks.forEach((m, j) => { if (!isObj(m) || typeof m.viewId !== 'string' || !isVec(m.c, 2) || !isNum(m.r)) throw new DocumentFormatError(`Sheet "${sh.name}": centre mark ${j + 1} is damaged.`); });
  if (sh.tables !== undefined && !Array.isArray(sh.tables)) throw new DocumentFormatError(`Sheet "${sh.name}": the tables are damaged.`);
}

/** format upgrades, one step per version: files written by an older build read like current ones */
const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {
  // files from before the versioned format (never shipped) only lack the version number
  0: (raw) => ({ ...raw, version: 1 }),
  // format 2 (0.3.6): the tolerancing data has a neutral field name; validateDocument renames it, in nested parts too
  1: (raw) => ({ ...raw, version: 2 }),
};

/** the field names of format 1 that format 2 renamed (QA F50) */
function renameOldFields(d: Raw): void {
  if ('dimxpert' in d) {
    if (d.autoTolerance === undefined) d.autoTolerance = d.dimxpert;
    delete d.dimxpert;
  }
  if (d.version === 1) d.version = FILE_VERSION;
  // QA v0.5.10 F165: files of 0.5.1 wrote the density file property with a vendor prefix; the equations are rewritten
  if (Array.isArray(d.equations)) for (const e of d.equations) if (isObj(e) && typeof e.expression === 'string') e.expression = e.expression.replace(/\bSW-Density\b/g, 'Density');
  // QA v0.5.10 F50: the frame feature had a program-specific default name; a name the user typed stays
  if (Array.isArray(d.features)) for (const f of d.features) if (isObj(f) && f.type === 'weldment' && typeof f.name === 'string' && /^Weldment$/.test(f.name)) f.name = 'Frame';
}

/** every field the app relies on is checked, so a damaged file is refused instead of opening empty or half */
export function validateDocument(raw: unknown, depth = 0): Document {
  if (!isObj(raw)) throw new DocumentFormatError('The file does not contain a document.');
  if (depth === 0) checkStructure(raw);
  if (depth > 8) throw new DocumentFormatError('Documents are nested more than eight levels deep.');
  const d = raw;
  renameOldFields(d);
  if (typeof d.name !== 'string' || !d.name.trim()) throw new DocumentFormatError('The document has no name.');
  if (!['mm', 'cm', 'm', 'in'].includes(d.units as string)) throw new DocumentFormatError(`Unknown units "${String(d.units)}".`);
  if (d.kind !== undefined && !['part', 'assembly', 'drawing'].includes(d.kind as string)) throw new DocumentFormatError(`Unknown document kind "${String(d.kind)}".`);
  if (!isObj(d.sketches)) throw new DocumentFormatError('The sketches are missing.');
  for (const [id, sk] of Object.entries(d.sketches)) {
    if (!isObj(sk) || !isObj(sk.entities) || !isObj(sk.points) || !isObj(sk.constraints) || !Array.isArray(sk.entityOrder) || !Array.isArray(sk.constraintOrder)) throw new DocumentFormatError(`Sketch "${id}" is damaged.`);
    for (const [pid, p] of Object.entries(sk.points)) if (!isObj(p) || !isNum(p.x) || !isNum(p.y)) throw new DocumentFormatError(`Sketch "${id}": point "${pid}" has no valid coordinates.`);
    for (const [cid, c] of Object.entries(sk.constraints)) {
      if (!isObj(c) || typeof c.kind !== 'string') throw new DocumentFormatError(`Sketch "${id}": relation "${cid}" is damaged.`);
      if (c.value !== undefined && !isNum(c.value)) throw new DocumentFormatError(`Sketch "${id}": dimension "${cid}" has no valid value.`);
    }
    const scalars = isObj(sk.scalars) ? sk.scalars : {};
    for (const [eid, e] of Object.entries(sk.entities)) {
      if (!isObj(e) || typeof e.kind !== 'string') throw new DocumentFormatError(`Sketch "${id}": entity "${eid}" is damaged.`);
      // every point and radius an entity refers to must exist (F80): a dangling id otherwise breaks the rebuild silently
      const pts = ENTITY_POINT_FIELDS[e.kind];
      if (!pts) throw new DocumentFormatError(`Sketch "${id}": entity "${eid}" has an unknown kind "${e.kind}".`);
      for (const k of pts) if (typeof e[k] !== 'string' || !(e[k] as string in sk.points)) throw new DocumentFormatError(`Sketch "${id}": entity "${eid}" refers to a point that does not exist.`);
      if (e.kind === 'spline' && (!Array.isArray(e.points) || e.points.some((p) => typeof p !== 'string' || !(p in (sk.points as Raw))))) throw new DocumentFormatError(`Sketch "${id}": spline "${eid}" refers to a point that does not exist.`);
      for (const k of ENTITY_SCALAR_FIELDS[e.kind] ?? []) if (typeof e[k] !== 'string' || !isNum(scalars[e[k] as string])) throw new DocumentFormatError(`Sketch "${id}": entity "${eid}" has no valid radius.`);
    }
    for (const [cid, c] of Object.entries(sk.constraints) as [string, Raw][]) {
      if (Array.isArray(c.refs) && c.refs.some((r) => typeof r !== 'string' || (!(r in (sk.points as Raw)) && !(r in (sk.entities as Raw))))) throw new DocumentFormatError(`Sketch "${id}": relation "${cid}" refers to geometry that does not exist.`);
    }
    for (const list of ['entityOrder', 'constraintOrder'] as const) for (const x of sk[list] as unknown[]) if (typeof x !== 'string' || !(x in (list === 'entityOrder' ? sk.entities : sk.constraints))) throw new DocumentFormatError(`Sketch "${id}": the ${list === 'entityOrder' ? 'entity' : 'relation'} list refers to an item that does not exist.`);
  }
  if (!Array.isArray(d.features)) throw new DocumentFormatError('The feature list is missing.');
  d.features.forEach((f, i) => {
    if (!isObj(f) || typeof f.id !== 'string' || typeof f.type !== 'string' || typeof f.name !== 'string') throw new DocumentFormatError(`Feature ${i + 1} is damaged.`);
    // size is a designation on some features (M6, 40 x 40 x 4), so it is not checked as a number here
    for (const k of ['depth', 'angle', 'thickness', 'radius', 'distance']) if (k in f && f[k] !== undefined && f[k] !== null && !isNum(f[k])) throw new DocumentFormatError(`Feature "${f.name}": ${k} is not a valid number.`);
    // only the types this version knows (F80): an unknown type would load as a feature that never builds
    if (!FEATURE_TYPES.has(f.type)) throw new DocumentFormatError(`Feature "${f.name}" has an unknown type "${f.type}"; it was made by another program or a newer version.`);
    // the same limits as the input fields (F80): a length is never negative and at most 1 000 000 mm (0 stays allowed:
    // an unused depth of a Through All cut or hole is stored as 0)
    for (const k of ['depth', 'thickness', 'radius'] as const) if (isNum(f[k]) && ((f[k] as number) < 0 || (f[k] as number) > MAX_FIELD_LENGTH)) throw new DocumentFormatError(`Feature "${f.name}": ${k} ${f[k]} is outside 0 … ${MAX_FIELD_LENGTH} mm.`);
    for (const k of ['distance', 'angle'] as const) if (isNum(f[k]) && Math.abs(f[k] as number) > MAX_FIELD_LENGTH) throw new DocumentFormatError(`Feature "${f.name}": ${k} ${f[k]} is out of range.`);
    // the sketches a feature is built from must exist (a path or guide may also be a 3D sketch or helix feature)
    const known = (id: string, orFeature: boolean) => (isObj(d.sketches) && id in (d.sketches as Raw)) || (orFeature && (d.features as Raw[]).some((x) => isObj(x) && x.id === id));
    for (const k of ['sketchId', 'sketchId2', 'pathSketchId'] as const) if (typeof f[k] === 'string' && !known(f[k] as string, k === 'pathSketchId')) throw new DocumentFormatError(`Feature "${f.name}" refers to a sketch that does not exist.`);
    if (Array.isArray(f.guides)) for (const g of f.guides) if (typeof g === 'string' && !known(g, true)) throw new DocumentFormatError(`Feature "${f.name}" refers to a guide sketch that does not exist.`);
  });
  const ids = new Set<string>();
  for (const f of d.features as Raw[]) {
    if (ids.has(f.id as string)) throw new DocumentFormatError(`Two features share the id "${f.id}".`);
    ids.add(f.id as string);
  }
  if (d.planes !== undefined && !isObj(d.planes)) throw new DocumentFormatError('The reference planes are damaged.');
  if (d.variables !== undefined && !isObj(d.variables)) throw new DocumentFormatError('The global variables are damaged.');
  if (d.equations !== undefined && !Array.isArray(d.equations)) throw new DocumentFormatError('The equations are damaged.');
  if (d.kind === 'assembly') {
    if (!Array.isArray(d.components) || !Array.isArray(d.mates)) throw new DocumentFormatError('The assembly has no component or mate list.');
    d.components.forEach((c, i) => validateComponent(c, i, depth));
    const ids = new Set((d.components as Raw[]).map((c) => c.id as string));
    d.mates.forEach((m, i) => validateMate(m, i, ids));
  } else if (d.components !== undefined && d.components !== null && (!Array.isArray(d.components) || d.components.length)) throw new DocumentFormatError('Only an assembly has components.');
  if (d.kind === 'drawing') {
    if (!Array.isArray(d.sheets) || !d.sheets.length) throw new DocumentFormatError('The drawing has no sheet.');
    d.sheets.forEach((sh, i) => validateSheet(sh, i, depth));
    if (d.otherSheets !== undefined) {
      if (!Array.isArray(d.otherSheets)) throw new DocumentFormatError('The other sheets are damaged.');
      d.otherSheets.forEach((sh, i) => validateSheet(sh, i + 1, depth));
    }
  }
  if (d.configurations !== undefined && !Array.isArray(d.configurations)) throw new DocumentFormatError('The configurations are damaged.');
  if (d.scene !== undefined && !isObj(d.scene)) throw new DocumentFormatError('The scene is damaged.');
  // decals: only embedded images (data:) are allowed; a file:// or http URL would read other files or call home
  if (Array.isArray(d.decals)) d.decals = d.decals.filter((x) => isObj(x) && typeof x.image === 'string' && /^data:image\//i.test(x.image));
  return d as unknown as Document;
}

export function parseDocument(text: string): Document {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new DocumentFormatError(`The file is not valid JSON (${(err as Error).message}).`);
  }
  if (!isObj(raw)) throw new DocumentFormatError('The file does not contain a Phlippo CAD document.');
  let r: Raw = raw;
  if (r.format !== 'phlippo-cad') throw new DocumentFormatError('Unknown file format: expected a Phlippo CAD (.kcad) file.');
  let v = isNum(r.version) ? (r.version as number) : 0;
  if (v > FILE_VERSION) throw new DocumentFormatError(`The file was saved by a newer Phlippo CAD (format ${v}); this version reads format ${FILE_VERSION}.`);
  while (v < FILE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new DocumentFormatError(`No upgrade path from format ${v}.`);
    r = m(r);
    v = isNum(r.version) ? (r.version as number) : FILE_VERSION;
  }
  const { format: _f, ...doc } = r;
  void _f;
  // fields added in later phases default when missing (files saved by phase 1); every document gets an id
  const d = validateDocument({ planes: {}, variables: {}, equations: [], ...doc });
  if (!d.id) d.id = newId('doc');
  return d;
}

// ---- autosave: the main copy after every change, plus a per-document copy for Document Recovery ----

let onAutosaveError: ((message: string) => void) | null = null;
let lastError = '';
/** the app shows autosave failures (storage full, storage blocked) as a message */
export function setAutosaveErrorHandler(cb: ((message: string) => void) | null): void {
  onAutosaveError = cb;
}

export interface AutosaveEntry {
  key: string;
  id: string;
  name: string;
  kind: 'part' | 'assembly' | 'drawing';
  time: number;
}

function readIndex(): AutosaveEntry[] {
  try {
    const list = JSON.parse(localStorage.getItem(AUTOSAVE_INDEX) ?? '[]');
    return Array.isArray(list) ? list.filter((e) => isObj(e) && typeof e.key === 'string') : [];
  } catch {
    return [];
  }
}

export function autosave(doc: Document): boolean {
  try {
    const text = serializeDocument(doc);
    localStorage.setItem(AUTOSAVE_KEY, text);
    if (text.length <= AUTOSAVE_COPY_MAX) {
      const id = doc.id ?? doc.name;
      const key = AUTOSAVE_DOC_PREFIX + id;
      localStorage.setItem(key, text);
      const rest = readIndex().filter((e) => e.key !== key);
      const index: AutosaveEntry[] = [{ key, id, name: doc.name, kind: doc.kind ?? 'part', time: Date.now() }, ...rest];
      for (const old of index.slice(AUTOSAVE_KEEP)) localStorage.removeItem(old.key);
      localStorage.setItem(AUTOSAVE_INDEX, JSON.stringify(index.slice(0, AUTOSAVE_KEEP)));
    }
    lastError = '';
    return true;
  } catch (err) {
    const quota = (err as Error)?.name === 'QuotaExceededError' || /quota/i.test(String((err as Error)?.message));
    const msg = quota ? 'Autosave failed: the browser storage is full. Save your work with Ctrl+S.' : `Autosave failed: ${(err as Error)?.message ?? 'storage unavailable'}. Save your work with Ctrl+S.`;
    if (msg !== lastError) {
      lastError = msg;
      onAutosaveError?.(msg);
    }
    return false;
  }
}

export function loadAutosave(): Document | null {
  try {
    const t = localStorage.getItem(AUTOSAVE_KEY);
    return t ? parseDocument(t) : null;
  } catch {
    return null;
  }
}

/** the recovery copies, newest first */
export function listAutosaves(): AutosaveEntry[] {
  return readIndex().sort((a, b) => b.time - a.time);
}

export function loadAutosaveEntry(key: string): Document | null {
  try {
    const t = localStorage.getItem(key);
    return t ? parseDocument(t) : null;
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
    for (const e of readIndex()) localStorage.removeItem(e.key);
    localStorage.removeItem(AUTOSAVE_INDEX);
  } catch {
    /* ignore */
  }
}
