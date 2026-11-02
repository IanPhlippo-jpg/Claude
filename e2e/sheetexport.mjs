// File ▸ Save As ▸ DXF / Adobe PDF of a drawing (QA v0.5.1 F114): the Deurkruk drawing sheet as vectors, in mm,
// with the views, dimensions and the sheet format; no selection highlight in the file.
// skip-budget: 1 a headless Chromium (Linux CI) downloads a PDF instead of showing it; only the viewer screenshot needs it, the PDF checks read the file
import { menuPath } from './lib/menu.mjs';
import { chromium } from 'playwright';
import { exitCode, skip } from './lib/check.mjs';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light', acceptDownloads: true });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const tek = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk-tekening.kcad', 'utf8')); delete tek.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), tek);
await page.waitForTimeout(2500);
const info = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sh = s.doc.sheets[0]; return { views: sh.views.length, dims: sh.dimensions.length, size: sh.size, landscape: sh.landscape }; });
// a view selected: its blue frame must not end up in the file
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.selectDrawingView(s.doc.sheets[0].views[0].id); });
await page.waitForTimeout(200);

const save = async (label) => {
  await page.hover('.k-brand');
  await page.click('.k-mb-menu:has-text("File")');
  await page.waitForTimeout(200);
  const item = menuPath(page, label);
  const dl = page.waitForEvent('download', { timeout: 10000 });
  await item.click();
  const f = await dl;
  const buf = Buffer.concat(await (await f.createReadStream()).toArray());
  return { name: f.suggestedFilename(), buf };
};

// ---- DXF
const dxf = await save('Save As ▸ DXF (*.dxf)…');
writeFileSync(`${OUT}/sheet.dxf`, dxf.buf);
const g = dxf.buf.toString('latin1').split(/\r?\n/);
const ents = {};
for (let i = 0; i + 1 < g.length; i += 2) if (g[i].trim() === '0') ents[g[i + 1]] = (ents[g[i + 1]] ?? 0) + 1;
check('DXF downloads with the drawing name', /\.dxf$/.test(dxf.name), dxf.name);
check('DXF is R12 with ENTITIES and EOF', g.includes('AC1009') && g.includes('ENTITIES') && g[g.length - 2] === 'EOF');
check('DXF has lines and polylines of the views and the format', (ents.LINE ?? 0) + (ents.POLYLINE ?? 0) > 100, JSON.stringify(ents));
check('DXF has the texts (dimensions, title block)', (ents.TEXT ?? 0) > 10, JSON.stringify(ents));
const xs = [], ys = [];
for (let i = 0; i + 1 < g.length; i += 2) { if (g[i].trim() === '10') xs.push(Number(g[i + 1])); if (g[i].trim() === '20') ys.push(Number(g[i + 1])); }
const extMax = [Number(g[g.indexOf('$EXTMAX') + 2]), Number(g[g.indexOf('$EXTMAX') + 4])];
check('DXF extents are the sheet size in mm', extMax[0] > 200 && extMax[1] > 140, JSON.stringify(extMax));
check('every point lies on the sheet', xs.every((x) => x >= -0.5 && x <= extMax[0] + 0.5) && ys.every((y) => y >= -0.5 && y <= extMax[1] + 0.5), `${Math.min(...xs)}..${Math.max(...xs)} / ${Math.min(...ys)}..${Math.max(...ys)}`);
const texts = []; for (let i = 0; i + 1 < g.length; i += 2) if (g[i].trim() === '1') texts.push(g[i + 1]);
check('a dimension value is in the DXF texts', texts.some((t) => /\d/.test(t) && t.length <= 12), texts.slice(0, 15).join(' | '));

// ---- PDF
const pdf = await save('Save As ▸ Adobe PDF (*.pdf)…');
writeFileSync(`${OUT}/sheet.pdf`, pdf.buf);
const s = pdf.buf.toString('latin1');
check('PDF downloads', /\.pdf$/.test(pdf.name) && s.startsWith('%PDF-1.4') && s.trimEnd().endsWith('%%EOF'), pdf.name);
const box = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(s);
check('PDF page is the sheet size in points', !!box && Math.abs(Number(box[1]) - extMax[0] * 72 / 25.4) < 1 && Math.abs(Number(box[2]) - extMax[1] * 72 / 25.4) < 1, box?.[0]);
check('PDF draws vectors and text', (s.match(/ l /g) ?? []).length > 100 && (s.match(/\) Tj/g) ?? []).length > 10);
check('no selection blue in the file (black only)', !/0\.1\d* 0\.4\d* 0\.8\d* RG/.test(s));
// the PDF as Edge shows it
const viewer = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
// OUT is relative on Windows and absolute elsewhere: a proper file URL either way (QA F146)
await viewer.goto(pathToFileURL(resolve(OUT, 'sheet.pdf')).href).catch(skip('sheetexport: the PDF in the browser viewer'));
await viewer.waitForTimeout(2500);
await viewer.screenshot({ path: `${OUT}/sheet-pdf.png` });
await viewer.close();
await page.screenshot({ path: `${OUT}/sheet-screen.png` });
check('the drawing had views', info.views > 0, JSON.stringify(info));

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
