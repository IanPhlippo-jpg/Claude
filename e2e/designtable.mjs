// Design Table (Configurations panel): Insert Design Table… reads a CSV table (";" and decimal comma) into
// configurations with their own dimension values and $STATE suppression; an unknown parameter is reported and
// changes nothing; Export Design Table as CSV… writes the same table back. Export Design Table… writes an Excel
// workbook (.xlsx) that Insert reads back, and Insert reads a workbook as Excel writes it (deflate, shared strings).
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync } from 'node:fs';
import { settle } from './lib/wait.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light', acceptDownloads: true });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const C = () => page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const cfgs = s.doc.configurations ?? [];
  const ex = s.doc.features.find((f) => f.type === 'extrude');
  const size = s.rebuild.bodies.map((b) => { b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox; return [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z].map((v) => Math.round(v * 10) / 10).sort((a, b) => a - b); });
  return { names: cfgs.map((c) => c.name), active: cfgs.find((c) => c.id === s.doc.activeConfiguration)?.name ?? 'Default', depth: ex?.depth, suppressed: ex?.suppressed, bodies: s.rebuild.bodies.length, size, undo: s.undoLabel, messages: s.messages.map((m) => `${m.level}: ${m.text}`) };
});
const rightClickRoot = async (item) => {
  await page.click('.k-tree-row:has-text("Configuration(s)")', { button: 'right' });
  await page.click(`.k-menu-item:has-text("${item}")`);
};
const lastMessage = () => page.evaluate(() => JSON.stringify(window.__phlippoStore.getState().messages.slice(-2)));
/** Insert Design Table… with a file (CSV text or the bytes of a workbook); waits until the table is read */
const insertTable = async (name, text) => {
  const before = await lastMessage();
  const chooser = page.waitForEvent('filechooser');
  await rightClickRoot('Insert Design Table');
  const fc = await chooser;
  const accept = await fc.element().getAttribute('accept');
  const xlsx = name.endsWith('.xlsx');
  await fc.setFiles({ name, mimeType: xlsx ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv', buffer: Buffer.isBuffer(text) ? text : Buffer.from(text, 'utf8') });
  // the file is read asynchronously (a workbook is inflated): wait for the message of the table
  await page.waitForFunction((b) => JSON.stringify(window.__phlippoStore.getState().messages.slice(-2)) !== b, before, { timeout: 15000 }).catch(() => {});
  await settle(page);
  return accept;
};

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await settle(page);
await page.click('.k-doctype:has-text("Part")');
// a plate: one side dimensioned 40 (D1@Sketch1), extruded 10 (D1@Boss-Extrude1)
await page.click('.k-tree-row:has-text("Top Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await settle(page);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(cx, cy);
await page.mouse.click(cx + 200, cy - 200);
await page.keyboard.press('Escape');
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.mouse.click(cx + 100, cy);
await page.mouse.click(cx + 100, cy + 80);
await settle(page);
await page.locator('.k-modify input.k-num').fill('40');
await page.locator('.k-modify input.k-num').press('Enter');
await settle(page);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await settle(page);
await page.locator('.k-pm-valuerow input.k-num').first().fill('10');
await page.locator('.k-pm-valuerow input.k-num').first().press('Tab');
await settle(page);
await page.click('.k-pm-ok');
await settle(page);
let c = await C();
check('plate built', c.bodies === 1 && c.depth === 10 && c.size[0]?.includes(40), JSON.stringify(c));
const base = c.size[0];

// ---- Insert Design Table…: the menu of the top node of the Configurations panel
await page.click('.k-manager-tab[data-tip="Configurations"]');
await settle(page);
await page.click('.k-tree-row:has-text("Configuration(s)")', { button: 'right' });
const menu = (await page.locator('.k-menu').innerText()).replace(/\s+/g, ' ');
check('menu offers Insert Design Table… and Export Design Table…', /Insert Design Table/.test(menu) && /Export Design Table/.test(menu), menu);
await shot('dt1-menu');
await page.keyboard.press('Escape');
await settle(page);
const TABLE = ['Design Table for: Part1;;;', ';D1@Sketch1;D1@Boss-Extrude1;$STATE@Boss-Extrude1', 'Short;40;12,5;U', 'Long;80;20;U', 'Empty;;;S', ''].join('\r\n');
await insertTable('plate.csv', TABLE);
c = await C();
check('three configurations added, Default stays shown', c.names.join(',') === 'Default,Short,Long,Empty' && c.active === 'Default' && c.depth === 10, JSON.stringify(c));
check('one undo step "Insert Design Table"', c.undo === 'Insert Design Table', c.undo);
check('status names the table', c.messages.some((m) => /Design Table read from plate\.csv: 3 configurations \(3 added\)/.test(m)), JSON.stringify(c.messages));
const tree = (await page.locator('.k-tree').innerText()).replace(/\s+/g, ' ');
check('tree lists the configurations', /Short \[ Part1 \]/.test(tree) && /Long \[ Part1 \]/.test(tree) && /Empty \[ Part1 \]/.test(tree), tree);
await shot('dt2-configurations');

// each configuration rebuilds with its own values
await page.dblclick('.k-cfg-row:has-text("Long")');
await settle(page);
c = await C();
check('Long: 80 wide and 20 thick, the other side as drawn', c.active === 'Long' && c.depth === 20 && c.size[0]?.includes(80) && c.size[0]?.includes(20) && c.size[0]?.includes((base ?? []).find((v) => v !== 40 && v !== 10) ?? 40), JSON.stringify({ ...c, base }));
await page.keyboard.press('f');
await settle(page, { quiet: 300 });
await shot('dt3-long');
await page.dblclick('.k-cfg-row:has-text("Short")');
await settle(page);
c = await C();
check('Short: 12.5 thick (decimal comma)', c.active === 'Short' && c.depth === 12.5 && c.size[0]?.includes(40) && c.size[0]?.includes(12.5), JSON.stringify(c));
await page.dblclick('.k-cfg-row:has-text("Empty")');
await settle(page);
c = await C();
check('Empty: $STATE S suppresses the extrude', c.active === 'Empty' && c.suppressed === true && c.bodies === 0, JSON.stringify(c));
await page.dblclick('.k-cfg-row:has-text("Default")');
await settle(page);

// an unknown parameter is reported and changes nothing
await insertTable('bad.csv', ';D7@Sketch9;D1@Boss-Extrude1\nShort;1;abc\n');
c = await C();
check('unknown parameter reported', c.messages.some((m) => /^error: Design Table not applied: Unknown parameter "D7@Sketch9" \(column B\)/.test(m)) && c.messages.some((m) => /"abc" is not a number/.test(m)), JSON.stringify(c.messages));
check('a table with errors changes nothing', c.names.join(',') === 'Default,Short,Long,Empty' && c.undo === 'Show Configuration' && c.depth === 10, JSON.stringify(c));
await shot('dt4-error');

// ---- Export Design Table as CSV…: the same table back (";" and a decimal comma)
const download = page.waitForEvent('download');
await rightClickRoot('Export Design Table as CSV');
const dl = await download;
const path = await dl.path();
const { readFileSync } = await import('node:fs');
const csv = readFileSync(path, 'utf8').replace(/^﻿/, '');
const lines = csv.split(/\r\n/);
check('export file name', dl.suggestedFilename() === 'Part1 - Design Table.csv', dl.suggestedFilename());
check('export header', lines[0] === 'Design Table for: Part1' && lines[1] === ';D1@Sketch1;D1@Boss-Extrude1;$STATE@Boss-Extrude1', lines.slice(0, 2).join(' | '));
check('export rows', lines[3] === 'Short;40;12,5;U' && lines[4] === 'Long;80;20;U' && lines[5] === 'Empty;40;10;S', lines.slice(2).join(' | '));
// reading the exported table back changes no value
await insertTable('roundtrip.csv', csv);
c = await C();
check('round trip keeps the configurations', c.names.join(',') === 'Default,Short,Long,Empty' && c.messages.some((m) => /4 configurations \(0 added\)/.test(m)), JSON.stringify(c));

// ---- Excel: Export Design Table… writes a workbook (.xlsx), Insert Design Table… reads it and a workbook as Excel
// writes it (deflate entries, shared strings with a rich text run, empty cells, a formula with its cached value)
const zlib = await import('node:zlib');
const CRC = Array.from({ length: 256 }, (_, n) => { let x = n; for (let k = 0; k < 8; k++) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1; return x >>> 0; });
const crc32 = (b) => { let x = 0xffffffff; for (const v of b) x = CRC[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
/** the entries of a ZIP archive (stored or deflate) by name, from its central directory */
const unzip = (buf) => {
  const out = new Map();
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  let p = buf.readUInt32LE(e + 16);
  for (let i = 0; i < buf.readUInt16LE(e + 10); i++) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), nameLen = buf.readUInt16LE(p + 28), off = buf.readUInt32LE(p + 42);
    const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const raw = buf.subarray(start, start + size);
    out.set(buf.toString('utf8', p + 46, p + 46 + nameLen), { method, data: method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw) });
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return out;
};
/** a ZIP archive of deflate entries, as Excel writes one */
const zipDeflate = (files) => {
  const local = [], central = [];
  let off = 0;
  for (const [name, text] of files) {
    const data = Buffer.from(text, 'utf8'), comp = zlib.deflateRawSync(data), nm = Buffer.from(name, 'utf8'), crc = crc32(data);
    const h = Buffer.alloc(30), c = Buffer.alloc(46);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(8, 8); h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nm.length, 26);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10); c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nm.length, 28); c.writeUInt32LE(off, 42);
    local.push(h, nm, comp);
    central.push(c, nm);
    off += 30 + nm.length + comp.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...local, cd, end]);
};

await page.click('.k-tree-row:has-text("Configuration(s)")', { button: 'right' });
const menu2 = (await page.locator('.k-menu').innerText()).replace(/\s+/g, ' ');
check('menu offers Export Design Table… (Excel) and Export Design Table as CSV…', /Export Design Table\u2026/.test(menu2) && /Export Design Table as CSV\u2026/.test(menu2), menu2);
await shot('excel-1-menu');
await page.keyboard.press('Escape');
await settle(page);
const xDownload = page.waitForEvent('download');
await rightClickRoot('Export Design Table\u2026');
const xdl = await xDownload;
const xbuf = readFileSync(await xdl.path());
check('Excel export file name', xdl.suggestedFilename() === 'Part1 - Design Table.xlsx', xdl.suggestedFilename());
const parts = unzip(xbuf);
check('the workbook has its parts (content types, workbook, sheet1, shared strings, styles)', ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/sharedStrings.xml', 'xl/styles.xml'].every((n) => parts.has(n)), [...parts.keys()].join());
const sheetXml = parts.get('xl/worksheets/sheet1.xml')?.data.toString('utf8') ?? '';
const sstXml = parts.get('xl/sharedStrings.xml')?.data.toString('utf8') ?? '';
check('values are number cells (Short 12.5 in C4, Long 80 in B5), names and parameters shared strings', sheetXml.includes('<c r="C4"><v>12.5</v></c>') && sheetXml.includes('<c r="B5"><v>80</v></c>') && /<t>D1@Boss-Extrude1<\/t>/.test(sstXml) && /<t>Design Table for: Part1<\/t>/.test(sstXml), sheetXml.slice(0, 400));
const accept = await insertTable('Part1 - Design Table.xlsx', xbuf);
check('the Insert dialog offers .xlsx and .csv', /\.xlsx/.test(accept ?? '') && /\.csv/.test(accept ?? ''), accept);
c = await C();
check('the exported workbook read back changes nothing', c.names.join(',') === 'Default,Short,Long,Empty' && c.messages.some((m) => /Design Table read from Part1 - Design Table\.xlsx: 4 configurations \(0 added\)/.test(m)) && c.depth === 10, JSON.stringify(c));

// a workbook as Excel writes it: Long 100 wide (its thickness cell empty), a new configuration Wide 60 x =B5/4
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main', R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', PR = 'http://schemas.openxmlformats.org/package/2006/relationships';
const book = zipDeflate([
  ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>'],
  ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PR}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
  ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}" xmlns:r="${R}"><sheets><sheet name="Design Table" sheetId="1" r:id="rId3"/></sheets></workbook>`],
  ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${PR}"><Relationship Id="rId3" Type="${R}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId4" Type="${R}/sharedStrings" Target="sharedStrings.xml"/></Relationships>`],
  ['xl/sharedStrings.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="${NS}" count="6" uniqueCount="6"><si><t>Design Table for: Part1</t></si><si><t>D1@Sketch1</t></si><si><t>D1@Boss-Extrude1</t></si><si><t>Long</t></si><si><r><t>Wi</t></r><r><rPr><b/></rPr><t>de</t></r></si><si><t>$STATE@Boss-Extrude1</t></si></sst>`],
  ['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}"><dimension ref="A1:D5"/><sheetData>`
    + '<row r="1"><c r="A1" t="s"><v>0</v></c></row><row r="2"><c r="B2" t="s"><v>1</v></c><c r="C2" t="s"><v>2</v></c><c r="D2" t="s"><v>5</v></c></row>'
    + '<row r="3"><c r="A3" t="s"><v>3</v></c><c r="B3"><v>100</v></c><c r="D3" s="1"/></row>'
    + '<row r="5"><c r="A5" t="s"><v>4</v></c><c r="B5"><v>60</v></c><c r="C5"><f>B5/4</f><v>15</v></c></row></sheetData></worksheet>'],
]);
check('the Excel-style test workbook is deflate-compressed', [...unzip(book).values()].every((e) => e.method === 8));
await insertTable('excel-made.xlsx', book);
c = await C();
check('Excel workbook: Long updated, Wide added', c.names.join(',') === 'Default,Short,Long,Empty,Wide' && c.messages.some((m) => /Design Table read from excel-made\.xlsx: 2 configurations \(1 added\)/.test(m)), JSON.stringify(c));
await page.dblclick('.k-cfg-row:has-text("Wide")');
await settle(page);
c = await C();
check('Wide: 60 wide (B5) and 15 thick (the cached value of =B5/4)', c.active === 'Wide' && c.depth === 15 && c.size[0]?.includes(60) && c.size[0]?.includes(15), JSON.stringify(c));
await page.keyboard.press('f');
await settle(page, { quiet: 300 });
await shot('excel-2-wide');
await page.dblclick('.k-cfg-row:has-text("Long")');
await settle(page);
c = await C();
check('Long: 100 wide from the workbook, 20 thick kept (empty cell)', c.active === 'Long' && c.depth === 20 && c.size[0]?.includes(100) && c.size[0]?.includes(20), JSON.stringify(c));
// an Excel 97-2003 workbook is not read; the message says to save it as .xlsx or CSV
await insertTable('old.xls', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]));
c = await C();
check('an .xls file is reported and changes nothing', c.messages.some((m) => /^error: Design Table not applied: This is an Excel 97-2003 workbook \(\.xls\)/.test(m)) && c.names.length === 5, JSON.stringify(c.messages.slice(-2)));
await shot('excel-3-xls-message');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
