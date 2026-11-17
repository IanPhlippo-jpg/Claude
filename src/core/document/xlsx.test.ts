import { describe, expect, it } from 'vitest';
import { crc32, isZip, listZip, readZip, writeZip } from './zip';
import { columnIndex, columnName, parseCellRef, parseSheet, readXlsx, writeXlsx, xmlEscape, xmlUnescape } from './xlsx';
import { exportDesignTableXlsx, importDesignTableFile } from './designTableFile';
import { exportDesignTable, importDesignTable } from './designTable';
import { createDocument, type Document } from './types';
import { addConstraint, addLine, createSketch } from '../sketch/model';
import { configurations } from './configurations';
import { dimensionTable } from './equations';

const enc = new TextEncoder();
const dec = new TextDecoder();

/** raw deflate with the platform's CompressionStream */
async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const buf = await new Response(new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
  return new Uint8Array(buf);
}

/**
 * A ZIP archive written here byte by byte as another program writes it: deflate entries (method 8), a data
 * descriptor after each entry (flag bit 3, the local header without sizes), an archive comment.
 */
async function deflateZip(files: [string, string][]): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const [name, text] of files) {
    const raw = enc.encode(text), comp = await deflateRaw(raw), nm = enc.encode(name), crc = crc32(raw);
    const loc = new DataView(new ArrayBuffer(30));
    loc.setUint32(0, 0x04034b50, true); loc.setUint16(4, 20, true); loc.setUint16(6, 0x0008, true); loc.setUint16(8, 8, true);
    loc.setUint16(26, nm.length, true);
    const desc = new DataView(new ArrayBuffer(16));
    desc.setUint32(0, 0x08074b50, true); desc.setUint32(4, crc, true); desc.setUint32(8, comp.length, true); desc.setUint32(12, raw.length, true);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0008, true); cen.setUint16(10, 8, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, comp.length, true); cen.setUint32(24, raw.length, true); cen.setUint16(28, nm.length, true);
    cen.setUint32(42, offset, true);
    for (const c of [new Uint8Array(loc.buffer), nm, comp, new Uint8Array(desc.buffer)]) { chunks.push(c); offset += c.length; }
    central.push(new Uint8Array(cen.buffer), nm);
  }
  const cdStart = offset, cdSize = central.reduce((n, c) => n + c.length, 0), comment = enc.encode('made by a test');
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, cdStart, true); end.setUint16(20, comment.length, true);
  const all = [...chunks, ...central, new Uint8Array(end.buffer), comment];
  const out = new Uint8Array(all.reduce((n, c) => n + c.length, 0));
  let p = 0;
  for (const c of all) { out.set(c, p); p += c.length; }
  return out;
}

/** a workbook as Excel writes it: shared strings (one rich text, one with a phonetic run), empty cells, a formula */
const EXCEL_FILES: [string, string][] = [
  ['[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'],
  ['_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
  ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="Design Table" sheetId="3" r:id="rId7"/><sheet name="Other" sheetId="1" r:id="rId1"/></sheets></workbook>'],
  ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet3.xml"/><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'],
  ['xl/sharedStrings.xml', '<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="7" uniqueCount="7">'
    + '<si><t>Design Table for: Plate</t></si><si><t>D1@Sketch1</t></si><si><r><rPr><b/></rPr><t>D1@Boss-</t></r><r><t>Extrude1</t></r></si>'
    + '<si><t>Short</t><rPh sb="0" eb="1"><t>ショート</t></rPh></si><si><t xml:space="preserve">Long &amp; wide</t></si><si><t>$STATE@Boss-Extrude1</t></si><si><t>S</t></si></sst>'],
  ['xl/worksheets/sheet1.xml', '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>not this sheet</t></is></c></row></sheetData></worksheet>'],
  ['xl/worksheets/sheet3.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:D5"/><sheetData>'
    + '<row r="1" spans="1:4"><c r="A1" t="s"><v>0</v></c><c r="B1" s="2"/></row>'
    + '<row r="2"><c r="B2" t="s"><v>1</v></c><c r="C2" t="s"><v>2</v></c><c r="D2" t="s"><v>5</v></c></row>'
    + '<row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3"><v>40</v></c><c r="C3" s="1"><f>B3/3.2</f><v>12.5</v></c></row>'
    + '<row r="5"><c r="A5" t="s"><v>4</v></c><c r="B5"><v>80</v></c><c r="D5" t="s"><v>6</v></c></row>'
    + '</sheetData></worksheet>'],
];

/** a part: a 40 x 30 rectangle with its dimensions D1@Sketch1 (40) and D2@Sketch1, extruded 10 (D1@Boss-Extrude1) */
function platePart(): Document {
  const doc = createDocument('Plate');
  let s = createSketch('sk1', 'Sketch1', 'top');
  const [s1, l1] = addLine(s, { x: 0, y: 0 }, { x: 40, y: 0 });
  const [s2, l2] = addLine(s1, l1.p2, { x: 40, y: 30 });
  const [s3, l3] = addLine(s2, l2.p2, { x: 0, y: 30 });
  s = addLine(s3, l3.p2, l1.p1)[0];
  s = addConstraint(s, 'fix', [l1.p1])[0];
  s = addConstraint(s, 'distance', [l1.p1, l1.p2], { value: 40 })[0];
  s = addConstraint(s, 'distance', [l2.p1, l2.p2], { value: 30 })[0];
  doc.sketches.sk1 = s;
  doc.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
    { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
  ];
  return doc;
}

describe('ZIP', () => {
  it('CRC-32 of the check string is CBF43926', () => {
    expect(crc32(enc.encode('123456789')).toString(16)).toBe('cbf43926');
  });

  it('writes stored entries and reads them back', async () => {
    const files = [{ name: 'a.txt', data: enc.encode('hello') }, { name: 'dir/ü.xml', data: enc.encode('<x>ü</x>') }, { name: 'empty', data: new Uint8Array() }];
    const zip = writeZip(files);
    expect(isZip(zip)).toBe(true);
    expect(listZip(zip).map((e) => [e.name, e.method, e.size])).toEqual([['a.txt', 0, 5], ['dir/ü.xml', 0, 9], ['empty', 0, 0]]);
    const back = await readZip(zip);
    expect(dec.decode(back.get('dir/ü.xml'))).toBe('<x>ü</x>');
    expect(back.get('empty')!.length).toBe(0);
  });

  it('reads deflate entries with data descriptors and a comment; a damaged entry is refused', async () => {
    const big = 'D1@Sketch1;'.repeat(2000);
    const zip = await deflateZip([['big.txt', big], ['small.txt', 'x']]);
    const entries = listZip(zip);
    expect(entries.map((e) => e.method)).toEqual([8, 8]);
    expect(entries[0].compressedSize).toBeLessThan(big.length / 10);
    const back = await readZip(zip);
    expect(dec.decode(back.get('big.txt'))).toBe(big);
    expect(dec.decode(back.get('small.txt'))).toBe('x');
    // a flipped byte in the compressed data fails the inflate or the checksum
    const bad = zip.slice();
    bad[30 + 'big.txt'.length + 5] ^= 0xff;
    await expect(readZip(bad)).rejects.toThrow();
    expect(() => listZip(enc.encode('not a zip at all, just text'))).toThrow(/Not a ZIP/);
  });
});

describe('XLSX', () => {
  it('cell references and XML text', () => {
    expect([columnIndex('A'), columnIndex('Z'), columnIndex('AA'), columnIndex('AZ'), columnIndex('XFD')]).toEqual([0, 25, 26, 51, 16383]);
    expect([0, 25, 26, 51, 16383].map(columnName)).toEqual(['A', 'Z', 'AA', 'AZ', 'XFD']);
    expect(parseCellRef('AA12')).toEqual([11, 26]);
    expect(parseCellRef('$B$3')).toEqual([2, 1]);
    expect(parseCellRef('12')).toBeNull();
    for (const s of ['a < b & "c"', 'tab\there', 'bell\u0007', 'literal _x0041_ stays']) expect(xmlUnescape(xmlEscape(s))).toBe(s);
    expect(xmlUnescape('&#x3A9;&#937;&apos;_x000D_')).toBe("ΩΩ'\r");
  });

  it('a worksheet with gaps, cells without a reference, inline strings, booleans, errors and cached formula values', () => {
    const rows = parseSheet('<x:worksheet xmlns:x="m"><x:sheetData>'
      + '<x:row r="2"><x:c t="inlineStr"><x:is><x:t>first</x:t></x:is></x:c><x:c><x:v>1.5</x:v></x:c><x:c r="E2" t="b"><x:v>1</x:v></x:c></x:row>'
      + '<x:row r="4"><x:c r="AA4" t="str"><x:f>"a"&amp;"b"</x:f><x:v>ab</x:v></x:c><x:c r="AB4" t="e"><x:v>#DIV/0!</x:v></x:c><x:c r="AC4"><x:f>1+1</x:f></x:c></x:row>'
      + '</x:sheetData></x:worksheet>');
    expect(rows.length).toBe(4);
    expect(rows[0]).toEqual([]);
    expect(rows[1]).toEqual(['first', 1.5, null, null, true]);
    expect(rows[2]).toEqual([]);
    expect(rows[3].length).toBe(28);
    expect(rows[3].slice(26)).toEqual(['ab', '#DIV/0!']); // a formula without a cached value stays empty
  });

  it('round trip: written cells read back the same (numbers, text, booleans, gaps)', async () => {
    const rows = [['Design Table for: Part1'], ['', 'D1@Sketch1', 'D1@Boss-Extrude1', '$STATE@Cut-Extrude1'], ['Default', 40, 12.5, 'U'], ['Long  ', 1e-7, -3, 'S'], [], ['<&>', null, true]];
    const data = writeXlsx(rows, 'Design/Table');
    expect(isZip(data)).toBe(true);
    const back = await readXlsx(data);
    expect(back.name).toBe('Design Table');
    expect(back.rows).toEqual([rows[0], [null, ...rows[1].slice(1)], rows[2], rows[3], [], ['<&>', null, true]]);
    // the parts Excel needs are in the archive
    expect(listZip(data).map((e) => e.name)).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/worksheets/sheet1.xml', 'xl/sharedStrings.xml', 'xl/styles.xml']);
  });

  it('an Excel file (deflate, shared strings, rich text, empty cells, a formula) reads its first sheet', async () => {
    const book = await readXlsx(await deflateZip(EXCEL_FILES));
    expect(book.name).toBe('Design Table');
    expect(book.rows).toEqual([
      ['Design Table for: Plate'],
      [null, 'D1@Sketch1', 'D1@Boss-Extrude1', '$STATE@Boss-Extrude1'],
      ['Short', 40, 12.5],
      [],
      ['Long & wide', 80, null, 'S'],
    ]);
  });
});

describe('Design Table in Excel', () => {
  it('Insert Design Table reads the Excel file into configurations as the CSV path does', async () => {
    const doc = platePart();
    const dims = dimensionTable(doc).map((d) => d.name);
    expect(dims).toContain('D1@Sketch1');
    const r = await importDesignTableFile(doc, await deflateZip(EXCEL_FILES));
    expect(r.errors).toEqual([]);
    expect(r.configurations).toEqual([{ name: 'Short', added: true }, { name: 'Long & wide', added: true }]);
    const csv = importDesignTable(doc, 'Design Table for: Plate\n;D1@Sketch1;D1@Boss-Extrude1;$STATE@Boss-Extrude1\nShort;40;12,5;\nLong & wide;80;;S\n');
    expect(csv.errors).toEqual([]);
    expect(configurations(r.doc)).toEqual(configurations(csv.doc).map((c, i) => ({ ...c, id: configurations(r.doc)[i].id })));
  });

  it('Export to Excel and back changes nothing; the CSV export holds the same table', async () => {
    const doc = platePart();
    const r = importDesignTable(doc, ';D1@Sketch1;D1@Boss-Extrude1;$STATE@Boss-Extrude1\nShort;40;12,5;U\nLong;80;20;U\nEmpty;;;S\n');
    expect(r.errors).toEqual([]);
    const xlsx = exportDesignTableXlsx(r.doc);
    const book = await readXlsx(xlsx);
    expect(book.rows[0]).toEqual(['Design Table for: Plate']);
    expect(book.rows[1]).toEqual([null, 'D1@Sketch1', 'D2@Sketch1', 'D1@Boss-Extrude1', '$STATE@Boss-Extrude1']);
    expect(book.rows.find((x) => x[0] === 'Short')).toEqual(['Short', 40, 30, 12.5, 'U']); // numbers, not text
    const again = await importDesignTableFile(r.doc, xlsx);
    expect(again.errors).toEqual([]);
    expect(again.configurations.every((c) => !c.added)).toBe(true);
    expect(configurations(again.doc)).toEqual(configurations(r.doc));
    // the CSV of the same document has the same cells (decimal comma)
    const csvRows = exportDesignTable(r.doc).trim().split('\r\n').map((l) => l.split(';'));
    expect(csvRows.map((row) => row.map((c) => c.replace(',', '.')))).toEqual(book.rows.map((row) => row.map((c) => (c === null ? '' : String(c)))));
  });

  it('an .xls (Excel 97-2003) or a damaged workbook is reported, the document unchanged', async () => {
    const doc = platePart();
    const xls = await importDesignTableFile(doc, new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0]));
    expect(xls.errors[0]).toMatch(/Excel 97-2003 workbook \(\.xls\)/);
    expect(xls.doc).toBe(doc);
    const broken = writeZip([{ name: 'hello.txt', data: enc.encode('no workbook') }]);
    const r = await importDesignTableFile(doc, broken);
    expect(r.errors[0]).toMatch(/^The workbook could not be read: The file is not an Excel workbook/);
  });
});
