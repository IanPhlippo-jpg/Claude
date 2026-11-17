/**
 * A minimal Office Open XML workbook (.xlsx) reader and writer for the design tables; no package.
 *
 * Reader: the first worksheet of the workbook (xl/workbook.xml and its relationships), its cells by reference (A1,
 * AA12; a cell without a reference follows the one before it) with gaps left empty: shared strings (plain or rich text),
 * inline strings, numbers, booleans, formula strings and errors; a formula gives its cached value (the value Excel saved
 * with the file). Styles, number formats and dates as numbers are not interpreted.
 * Writer: one worksheet, strings as shared strings, numbers as numbers; the minimal parts Excel and LibreOffice need
 * ([Content_Types].xml, the relationships, workbook, sheet1, sharedStrings, styles).
 *
 * Excel's own embedding of a design table (an OLE workbook edited in place inside the model) is not possible here: the
 * table goes out to a file and is read back with Insert Design Table.
 */
import { readZip, writeZip } from './zip';

export type Cell = string | number | boolean | null;

const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

// ---- XML in and out (the small subset the workbook parts use)

/** XML text of a value: &, <, > and quotes escaped, control characters as the _xHHHH_ escape of Office */
export function xmlEscape(s: string): string {
  return s
    .replace(/_x[0-9A-Fa-f]{4}_/g, (m) => `_x005F_${m.slice(1)}`)
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, (c) => `_x${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}_`);
}

/** the text of XML character data: entities and character references, then the _xHHHH_ escapes of Office */
export function xmlUnescape(s: string): string {
  return s
    .replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|amp|quot|apos);/g, (_, e: string) => {
      if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
      return ({ lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" } as Record<string, string>)[e];
    })
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

interface Tag { close: boolean; name: string; attrs: string; selfClose: boolean; start: number; end: number }

/** the tags of an XML text in order (namespace prefixes dropped), comments and processing instructions skipped */
function* tags(xml: string): Generator<Tag> {
  const re = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<(\/?)(?:[\w.-]+:)?([\w.-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  for (let m = re.exec(xml); m; m = re.exec(xml)) {
    if (m[2] === undefined) continue;
    yield { close: m[1] === '/', name: m[2], attrs: m[3], selfClose: m[4] === '/', start: m.index, end: re.lastIndex };
  }
}

/** an attribute of a tag (any namespace prefix) */
function attr(attrs: string, name: string): string | undefined {
  const m = new RegExp(`(?:^|\\s)(?:[\\w.-]+:)?${name}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(attrs);
  return m ? xmlUnescape(m[2] ?? m[3]) : undefined;
}

/** the character data between two positions (CDATA kept as is) */
const textOf = (xml: string) => xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>|<[^>]*>/g, (_m, cdata?: string) => (cdata !== undefined ? cdata : ''));

/** the text of the <t> elements inside a string item (<si> or <is>), the phonetic runs (<rPh>) left out */
function stringItem(xml: string): string {
  let out = '';
  let skip = 0;
  let from = -1;
  for (const t of tags(xml)) {
    if (t.name === 'rPh') { if (t.close) skip--; else if (!t.selfClose) skip++; continue; }
    if (t.name !== 't') continue;
    if (!t.close && !t.selfClose) from = t.end;
    else if (t.close && from >= 0) { if (!skip) out += xmlUnescape(textOf(xml.slice(from, t.start))); from = -1; }
  }
  return out;
}

// ---- cell references

/** 0-based column of a column name (A -> 0, Z -> 25, AA -> 26) */
export function columnIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** the column name of a 0-based index */
export function columnName(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** a cell reference (A1, $B$12) as 0-based [row, column] */
export function parseCellRef(ref: string): [number, number] | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(ref.trim());
  return m ? [Number(m[2]) - 1, columnIndex(m[1])] : null;
}

// ---- reading

const decode = (b: Uint8Array) => new TextDecoder('utf-8').decode(b).replace(/^﻿/, '');

/** a part path relative to the folder of the part that names it (Target="worksheets/sheet1.xml" from xl/workbook.xml) */
function resolvePart(base: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/').slice(0, -1);
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

/** the relationships of a part: id -> { target path, type } */
function relationships(files: Map<string, Uint8Array>, part: string): Map<string, { target: string; type: string }> {
  const slash = part.lastIndexOf('/');
  const relsPath = `${part.slice(0, slash + 1)}_rels/${part.slice(slash + 1)}.rels`;
  const out = new Map<string, { target: string; type: string }>();
  const bytes = files.get(relsPath);
  if (!bytes) return out;
  for (const t of tags(decode(bytes))) {
    if (t.close || t.name !== 'Relationship') continue;
    const id = attr(t.attrs, 'Id'), target = attr(t.attrs, 'Target');
    if (id && target && attr(t.attrs, 'TargetMode') !== 'External') out.set(id, { target: resolvePart(part, target), type: attr(t.attrs, 'Type') ?? '' });
  }
  return out;
}

/** the first worksheet's part path and name, and the shared strings part */
function workbookParts(files: Map<string, Uint8Array>): { sheet: string; name: string; shared?: string } {
  const wbPath = files.has('xl/workbook.xml') ? 'xl/workbook.xml' : [...files.keys()].find((k) => /(^|\/)workbook\.xml$/.test(k));
  if (!wbPath) throw new Error('The file is not an Excel workbook (.xlsx): it has no workbook part.');
  const rels = relationships(files, wbPath);
  let sheetRel: string | undefined, name = 'Sheet1';
  for (const t of tags(decode(files.get(wbPath)!))) {
    if (!t.close && t.name === 'sheet') { sheetRel = attr(t.attrs, 'id'); name = attr(t.attrs, 'name') ?? name; break; }
  }
  const sheet = (sheetRel && rels.get(sheetRel)?.target) || 'xl/worksheets/sheet1.xml';
  const shared = [...rels.values()].find((r) => /\/sharedStrings$/.test(r.type))?.target ?? (files.has('xl/sharedStrings.xml') ? 'xl/sharedStrings.xml' : undefined);
  return { sheet, name, shared };
}

function sharedStrings(xml: string): string[] {
  const out: string[] = [];
  let from = -1;
  for (const t of tags(xml)) {
    if (t.name !== 'si') continue;
    if (t.selfClose) out.push('');
    else if (!t.close) from = t.end;
    else if (from >= 0) { out.push(stringItem(xml.slice(from, t.start))); from = -1; }
  }
  return out;
}

/** the value of one <c> element: its type, the <v> text and the inline string */
function cellValue(type: string | undefined, v: string | null, inline: string | null, shared: string[]): Cell {
  if (type === 'inlineStr') return inline ?? '';
  if (v === null) return type === 'str' ? '' : null;
  if (type === 's') return shared[Number(v)] ?? '';
  if (type === 'b') return v.trim() === '1' || v.trim().toLowerCase() === 'true';
  if (type === 'str' || type === 'e' || type === 'd') return v;
  const n = Number(v);
  return v.trim() !== '' && Number.isFinite(n) ? n : v;
}

/** the cells of a worksheet as rows of values; missing cells and rows are null / empty rows */
export function parseSheet(xml: string, shared: string[] = []): Cell[][] {
  const rows: Cell[][] = [];
  let row = -1, col = -1;
  let cell: { r: number; c: number; type?: string } | null = null;
  let v: string | null = null, inline: string | null = null, mark = -1, isMark = -1;
  const put = () => {
    if (!cell) return;
    const value = cellValue(cell.type, v, inline, shared);
    if (value !== null && value !== '') {
      while (rows.length <= cell.r) rows.push([]);
      const r = rows[cell.r];
      while (r.length < cell.c) r.push(null);
      r[cell.c] = value;
    }
    cell = null;
  };
  for (const t of tags(xml)) {
    if (t.name === 'row' && !t.close) {
      const r = Number(attr(t.attrs, 'r'));
      row = Number.isFinite(r) && r > 0 ? r - 1 : row + 1;
      col = -1;
    } else if (t.name === 'c' && !t.close) {
      const ref = attr(t.attrs, 'r');
      const rc = ref ? parseCellRef(ref) : null;
      if (rc) { row = rc[0]; col = rc[1]; } else col++;
      cell = { r: Math.max(row, 0), c: col, type: attr(t.attrs, 't') };
      v = null; inline = null;
      if (t.selfClose) put();
    } else if (t.name === 'c' && t.close) put();
    else if (t.name === 'v' && cell) {
      if (t.selfClose) v = '';
      else if (!t.close) mark = t.end;
      else if (mark >= 0) { v = xmlUnescape(textOf(xml.slice(mark, t.start))); mark = -1; }
    } else if (t.name === 'is' && cell) {
      if (t.selfClose) inline = '';
      else if (!t.close) isMark = t.end;
      else if (isMark >= 0) { inline = stringItem(xml.slice(isMark, t.start)); isMark = -1; }
    }
  }
  return rows;
}

/** the first worksheet of an .xlsx file: its name and its rows */
export async function readXlsx(data: Uint8Array): Promise<{ name: string; rows: Cell[][] }> {
  const files = await readZip(data, (n) => n.endsWith('.xml') || n.endsWith('.rels'));
  const { sheet, name, shared } = workbookParts(files);
  const sheetBytes = files.get(sheet);
  if (!sheetBytes) throw new Error(`The workbook has no worksheet part (${sheet}).`);
  const strings = shared && files.get(shared) ? sharedStrings(decode(files.get(shared)!)) : [];
  return { name, rows: parseSheet(decode(sheetBytes), strings) };
}

// ---- writing

const CONTENT_TYPES = `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
  + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
  + '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
  + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
  + '</Types>';
const ROOT_RELS = `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}">`
  + `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
const WORKBOOK_RELS = `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}">`
  + `<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/>`
  + `<Relationship Id="rId2" Type="${NS_REL}/sharedStrings" Target="sharedStrings.xml"/>`
  + `<Relationship Id="rId3" Type="${NS_REL}/styles" Target="styles.xml"/></Relationships>`;
const STYLES = `${XML_HEAD}<styleSheet xmlns="${NS_MAIN}">`
  + '<fonts count="1"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>'
  + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + '</styleSheet>';

/** a sheet name Excel accepts: at most 31 characters, none of []:*?/\ */
const sheetName = (s: string) => s.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Sheet1';

/** an .xlsx file of one worksheet with the rows (null and '' are empty cells) */
export function writeXlsx(rows: Cell[][], name = 'Sheet1'): Uint8Array {
  const strings: string[] = [];
  const index = new Map<string, number>();
  let refs = 0;
  const sid = (s: string) => {
    refs++;
    let i = index.get(s);
    if (i === undefined) { i = strings.length; strings.push(s); index.set(s, i); }
    return i;
  };
  const widths: number[] = [];
  const body = rows.map((row, r) => {
    const cells = row.map((v, c) => {
      if (v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '';
      const ref = `${columnName(c)}${r + 1}`;
      widths[c] = Math.max(widths[c] ?? 0, String(v).length);
      if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
      if (typeof v === 'boolean') return `<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`;
      return `<c r="${ref}" t="s"><v>${sid(v)}</v></c>`;
    }).join('');
    return cells ? `<row r="${r + 1}">${cells}</row>` : '';
  }).join('');
  const lastCol = Math.max(0, ...rows.map((r) => r.length)) - 1;
  const dim = rows.length && lastCol >= 0 ? `A1:${columnName(lastCol)}${rows.length}` : 'A1';
  // the column widths fit the longest value (the title row left out: it may run over the next columns)
  const cols = widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${Math.min(60, Math.max(8, w + 2))}" customWidth="1"/>`).join('');
  const sheet = `${XML_HEAD}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><dimension ref="${dim}"/>`
    + `${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${body}</sheetData></worksheet>`;
  const sst = `${XML_HEAD}<sst xmlns="${NS_MAIN}" count="${refs}" uniqueCount="${strings.length}">`
    + strings.map((s) => `<si><t${/^\s|\s$|\n/.test(s) ? ' xml:space="preserve"' : ''}>${xmlEscape(s)}</t></si>`).join('') + '</sst>';
  const workbook = `${XML_HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><sheets>`
    + `<sheet name="${xmlEscape(sheetName(name))}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const enc = new TextEncoder();
  return writeZip([
    { name: '[Content_Types].xml', data: enc.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: enc.encode(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: enc.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(WORKBOOK_RELS) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheet) },
    { name: 'xl/sharedStrings.xml', data: enc.encode(sst) },
    { name: 'xl/styles.xml', data: enc.encode(STYLES) },
  ]);
}
