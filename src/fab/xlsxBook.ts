/**
 * A workbook of several sheets (docs/36 L-11, O3.5): the saw list, the order list, the quote with its cost price and
 * parts list. Numbers stay numbers (inline strings for text), so Excel sums the amounts. The single-sheet writer of
 * the design tables (src/core/document/xlsx.ts) is left as it is.
 */
import { columnName, xmlEscape, type Cell } from '../core/document/xlsx';
import { writeZip } from '../core/document/zip';

const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NSR = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const name = (s: string) => s.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Blad';

export function writeBook(sheets: { name: string; rows: Cell[][] }[]): Uint8Array {
  const enc = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [];
  const sheetXml = (rows: Cell[][]) => {
    const widths: number[] = [];
    const body = rows.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => {
      if (v === null || v === '' || (typeof v === 'number' && !Number.isFinite(v))) return '';
      widths[c] = Math.max(widths[c] ?? 0, String(v).length);
      const ref = `${columnName(c)}${r + 1}`;
      if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
      if (typeof v === 'boolean') return `<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`;
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(v)}</t></is></c>`;
    }).join('')}</row>`).join('');
    const cols = widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${Math.min(60, Math.max(8, w + 2))}" customWidth="1"/>`).join('');
    return `${HEAD}<worksheet xmlns="${NS}" xmlns:r="${NSR}">${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${body}</sheetData></worksheet>`;
  };
  sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(sheetXml(s.rows)) }));
  const ct = `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels"` +
    ` ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
  const rootRels = `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1"` +
    ` Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const wb = `${HEAD}<workbook xmlns="${NS}"` +
    ` xmlns:r="${NSR}"><sheets>${sheets.map((s, i) => `<sheet name="${xmlEscape(name(s.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`;
  const wbRels = `${HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + `${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}`
    + `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const styles = `${HEAD}<styleSheet xmlns="${NS}"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill` +
    ` patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs` +
      ` count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`;
  return writeZip([
    { name: '[Content_Types].xml', data: enc.encode(ct) }, { name: '_rels/.rels', data: enc.encode(rootRels) },
    { name: 'xl/workbook.xml', data: enc.encode(wb) }, { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
    { name: 'xl/styles.xml', data: enc.encode(styles) }, ...files,
  ]);
}
