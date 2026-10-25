import type { Document } from './types';
import { newId } from '../sketch/model';

export const FILE_EXTENSION = '.kcad';
/** the file format this build writes; older files pass through MIGRATIONS, newer ones are refused */
export const FILE_VERSION = 1;
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
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

/** format upgrades, one step per version: files written by an older build read like current ones */
const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {
  // files from before the versioned format (never shipped) only lack the version number
  0: (raw) => ({ ...raw, version: 1 }),
};

/** every field the app relies on is checked, so a damaged file is refused instead of opening empty or half */
export function validateDocument(raw: unknown): Document {
  if (!isObj(raw)) throw new DocumentFormatError('The file does not contain a document.');
  const d = raw;
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
    for (const [eid, e] of Object.entries(sk.entities)) if (!isObj(e) || typeof e.kind !== 'string') throw new DocumentFormatError(`Sketch "${id}": entity "${eid}" is damaged.`);
  }
  if (!Array.isArray(d.features)) throw new DocumentFormatError('The feature list is missing.');
  d.features.forEach((f, i) => {
    if (!isObj(f) || typeof f.id !== 'string' || typeof f.type !== 'string' || typeof f.name !== 'string') throw new DocumentFormatError(`Feature ${i + 1} is damaged.`);
    for (const k of ['depth', 'angle', 'size', 'thickness', 'radius', 'distance']) if (k in f && f[k] !== undefined && f[k] !== null && !isNum(f[k])) throw new DocumentFormatError(`Feature "${f.name}": ${k} is not a valid number.`);
  });
  if (d.planes !== undefined && !isObj(d.planes)) throw new DocumentFormatError('The reference planes are damaged.');
  if (d.variables !== undefined && !isObj(d.variables)) throw new DocumentFormatError('The global variables are damaged.');
  if (d.equations !== undefined && !Array.isArray(d.equations)) throw new DocumentFormatError('The equations are damaged.');
  if (d.kind === 'assembly') {
    if (!Array.isArray(d.components) || !Array.isArray(d.mates)) throw new DocumentFormatError('The assembly has no component or mate list.');
    for (const c of d.components) if (!isObj(c) || typeof c.id !== 'string' || !isObj(c.part)) throw new DocumentFormatError('A component is damaged.');
  }
  if (d.kind === 'drawing' && (!Array.isArray(d.sheets) || !d.sheets.length)) throw new DocumentFormatError('The drawing has no sheet.');
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
