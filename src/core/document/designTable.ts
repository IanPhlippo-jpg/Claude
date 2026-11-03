import type { Document } from './types';
import type { Id } from '../sketch/types';
import { activateConfiguration, activeConfiguration, addConfiguration, configurations, setConfigurationDimension, setConfigurationSuppressed, updateConfiguration } from './configurations';
import { dimensionTable } from './equations';

/**
 * Design Table, by design: a table with one row per configuration and one column per parameter.
 *   Design Table for: Part1
 *            ; D1@Sketch1 ; D1@Boss-Extrude1 ; $STATE@Cut-Extrude1
 *   Default  ; 40         ; 10               ; U
 *   Long     ; 80         ; 12,5             ; S
 * Parameters are dimension names (D1@Sketch1), $STATE@<feature> (S / U, Suppressed / Unsuppressed),
 * $DESCRIPTION and $COMMENT. The table is read into the existing configurations (their per-configuration
 * dimension values and suppressed features); nothing else is stored. Text is CSV: ";", "," or tab between
 * cells, a decimal comma or point. A blank cell keeps the value the configuration already has (a new
 * configuration starts from the active one).
 */
export interface DesignTableExportOptions {
  /** ";" writes a decimal comma (spreadsheets with a comma as decimal sign), "," a decimal point (default ";") */
  separator?: ';' | ',';
  /** $STATE columns: only features suppressed in some configuration (default), or every feature */
  states?: 'used' | 'all';
}

export interface DesignTableResult {
  /** the document with the table applied; the input document when there are errors */
  doc: Document;
  /** problems that stop the table from being applied (unknown parameter, a value that is not a number) */
  errors: string[];
  /** the configurations in the table, in order, and whether each was added */
  configurations: { name: string; added: boolean }[];
}

const TITLE = 'Design Table for:';

function formatNumber(v: number, decimalComma: boolean): string {
  const s = String(Number(v.toFixed(6)));
  return decimalComma ? s.replace('.', ',') : s;
}

function quote(cell: string, sep: string): string {
  return /["\r\n]/.test(cell) || cell.includes(sep) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

/** The configurations of a document as a design table (CSV text). */
export function exportDesignTable(doc: Document, opts: DesignTableExportOptions = {}): string {
  const sep = opts.separator ?? ';';
  const comma = sep === ';';
  const list = configurations(doc);
  const active = activeConfiguration(doc);
  // every configuration as the document shows it: its own values, suppressed features and new-feature rules
  const shown = list.map((c) => (c.id === active.id ? doc : activateConfiguration(doc, c.id)));
  const dimNames = [...new Set(dimensionTable(doc).map((d) => d.name))];
  const stateFeatures = doc.features.filter((f) => opts.states === 'all' || shown.some((d) => d.features.some((g) => g.id === f.id && g.suppressed)));
  const withDesc = list.some((c) => c.description);
  const withComment = list.some((c) => c.comment);
  const header = ['', ...dimNames, ...stateFeatures.map((f) => `$STATE@${f.name}`), ...(withDesc ? ['$DESCRIPTION'] : []), ...(withComment ? ['$COMMENT'] : [])];
  const rows = list.map((c, i) => {
    const d = shown[i];
    const values = new Map(dimensionTable(d).map((x) => [x.name, x.value]));
    return [
      c.name,
      ...dimNames.map((n) => (values.has(n) ? formatNumber(values.get(n)!, comma) : '')),
      ...stateFeatures.map((f) => (d.features.find((g) => g.id === f.id)?.suppressed ? 'S' : 'U')),
      ...(withDesc ? [c.description ?? ''] : []),
      ...(withComment ? [c.comment ?? ''] : []),
    ];
  });
  return [[`${TITLE} ${doc.name}`], header, ...rows].map((r) => r.map((cell) => quote(cell, sep)).join(sep)).join('\r\n') + '\r\n';
}

/** CSV rows; quoted cells may hold the separator, quotes ("") and line breaks */
export function parseCsv(text: string, sep: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** the separator of a table: tab, ";" or "," (the first that occurs outside quotes on the header line) */
function detectSeparator(lines: string[]): string {
  const line = lines.find((l) => l.trim() && !l.trim().startsWith(TITLE) && !/^"?sep=/i.test(l.trim())) ?? '';
  const outside = line.replace(/"[^"]*"/g, '');
  if (outside.includes('\t')) return '\t';
  if (outside.includes(';')) return ';';
  return ',';
}

/** a number with a decimal comma or point (12,5 / 12.5 / -3 / 1e-3) */
export function parseDesignNumber(s: string): number | null {
  const t = s.trim().replace(/\s+/g, '');
  if (!/^[-+]?(\d+([.,]\d*)?|[.,]\d+)([eE][-+]?\d+)?$/.test(t)) return null;
  const v = Number(t.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

function parseState(s: string): boolean | null {
  const t = s.trim().toUpperCase();
  if (t === 'S' || t === 'SUPPRESSED' || t === '1') return true;
  if (t === 'U' || t === 'UNSUPPRESSED' || t === '0') return false;
  return null;
}

type Column =
  | { kind: 'dim'; name: string }
  | { kind: 'state'; featureId: Id; name: string }
  | { kind: 'description' | 'comment'; name: string }
  | { kind: 'skip' };

/** Insert Design Table: create or update the configurations of the table and set their values. */
export function importDesignTable(doc: Document, text: string): DesignTableResult {
  const clean = text.replace(/^﻿/, '');
  const sep = detectSeparator(clean.split(/\r?\n/));
  const all = parseCsv(clean, sep).filter((r) => r.some((c) => c.trim() !== ''));
  // the title row ("Design Table for: Part1") and a spreadsheet "sep=;" hint are not part of the table
  const rows = all.filter((r, i) => !(i <= 1 && (r[0].trim().startsWith(TITLE) || /^sep=/i.test(r[0].trim())) && r.slice(1).every((c) => !c.trim())));
  const errors: string[] = [];
  const fail = (): DesignTableResult => ({ doc, errors, configurations: [] });
  if (rows.length < 2) {
    errors.push('The design table has no rows: the first row names the parameters, every next row is a configuration.');
    return fail();
  }
  const [header, ...body] = rows;
  const dims = dimensionTable(doc);
  const dimByName = new Map(dims.map((d) => [d.name, d.name]));
  const dimByLower = new Map(dims.map((d) => [d.name.toLowerCase(), d.name]));
  const columns: Column[] = header.map((raw, i): Column => {
    const p = raw.trim();
    const col = colName(i);
    if (i === 0 || !p) return { kind: 'skip' };
    const state = /^\$STATE@(.+)$/i.exec(p);
    if (state) {
      const fname = state[1].trim();
      const f = doc.features.find((x) => x.name === fname) ?? doc.features.find((x) => x.name.toLowerCase() === fname.toLowerCase());
      if (f) return { kind: 'state', featureId: f.id, name: `$STATE@${f.name}` };
      errors.push(`Unknown parameter "${p}" (column ${col}): there is no feature named "${fname}".`);
      return { kind: 'skip' };
    }
    if (/^\$DESCRIPTION$/i.test(p)) return { kind: 'description', name: '$DESCRIPTION' };
    if (/^\$COMMENT$/i.test(p)) return { kind: 'comment', name: '$COMMENT' };
    const dim = dimByName.get(p) ?? dimByLower.get(p.toLowerCase());
    if (dim) return { kind: 'dim', name: dim };
    errors.push(p.startsWith('$')
      ? `Unsupported parameter "${p}" (column ${col}): use a dimension name, $STATE@<feature>, $DESCRIPTION or $COMMENT.`
      : `Unknown parameter "${p}" (column ${col}): the model has no dimension with this name.`);
    return { kind: 'skip' };
  });
  const seen = new Map<string, number>();
  columns.forEach((c, i) => {
    if (c.kind === 'skip') return;
    if (seen.has(c.name)) errors.push(`Parameter "${c.name}" is in the table twice (columns ${colName(seen.get(c.name)!)} and ${colName(i)}).`);
    else seen.set(c.name, i);
  });
  const names = new Set<string>();
  type Row = { name: string; dims: Record<string, number>; states: [Id, boolean][]; description?: string; comment?: string };
  const parsed: Row[] = [];
  body.forEach((r, ri) => {
    const name = (r[0] ?? '').trim();
    const line = ri + 2;
    if (!name) { errors.push(`Row ${line} has values but no configuration name in the first column.`); return; }
    if (names.has(name)) { errors.push(`Configuration "${name}" is in the table twice.`); return; }
    names.add(name);
    const row: Row = { name, dims: {}, states: [] };
    columns.forEach((c, i) => {
      const cell = (r[i] ?? '').trim();
      if (c.kind === 'skip' || !cell) return;
      if (c.kind === 'dim') {
        const v = parseDesignNumber(cell);
        if (v === null) errors.push(`Configuration "${name}", ${c.name}: "${cell}" is not a number.`);
        else row.dims[c.name] = v;
      } else if (c.kind === 'state') {
        const s = parseState(cell);
        if (s === null) errors.push(`Configuration "${name}", ${c.name}: "${cell}" is not S (suppressed) or U (unsuppressed).`);
        else row.states.push([c.featureId, s]);
      } else if (c.kind === 'description') row.description = cell;
      else row.comment = cell;
    });
    parsed.push(row);
  });
  if (!parsed.length && !errors.length) errors.push('The design table has no configuration rows.');
  if (errors.length) return fail();

  // apply: the active configuration stays shown; a new one starts as a copy of it
  const shownId = activeConfiguration(doc).id;
  let d = doc;
  const out: DesignTableResult['configurations'] = [];
  for (const row of parsed) {
    let cfg = configurations(d).find((c) => c.name === row.name);
    const added = !cfg;
    if (!cfg) {
      d = addConfiguration(d, row.name);
      cfg = activeConfiguration(d);
      d = activateConfiguration(d, shownId);
    }
    const id = cfg.id;
    for (const [n, v] of Object.entries(row.dims)) d = setConfigurationDimension(d, id, n, v);
    for (const [fid, s] of row.states) d = setConfigurationSuppressed(d, id, fid, s);
    if (row.description !== undefined || row.comment !== undefined) d = updateConfiguration(d, id, { ...(row.description !== undefined ? { description: row.description } : {}), ...(row.comment !== undefined ? { comment: row.comment } : {}) });
    out.push({ name: configurations(d).find((c) => c.id === id)?.name ?? row.name, added });
  }
  return { doc: d, errors: [], configurations: out };
}

/** spreadsheet column letter of a 0-based index (A, B, … Z, AA) */
function colName(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}
