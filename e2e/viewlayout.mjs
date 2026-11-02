// Drawing View Layout and Tables on the door handle: Crop View, Break, Auxiliary View on the lever drawing; Bill of Materials on the assembly drawing.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
const tek = JSON.parse(readFileSync('voorbeelden/deurkruk/Kruk-tekening.kcad', 'utf8')); delete tek.format;
// keep the three standard views and the isometric; section / detail views come from the other tests
tek.sheets[0].views = tek.sheets[0].views.filter((v) => !v.section && !v.detail);
tek.sheets[0].dimensions = [];
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), tek);
await page.waitForTimeout(1200);
const toPx = (p) => page.evaluate((q) => window.__phlippoSheet.toPx(q), p);
const V = () => page.evaluate(() => window.__phlippoStore.getState().doc.sheets[0].views.map((v) => ({ id: v.id, type: v.type, pos: v.position, crop: v.crop, brk: v.break, aux: v.aux })));
const bounds = (id) => page.evaluate((vid) => { const st = window.__phlippoStore.getState(); const v = st.doc.sheets[0].views.find((x) => x.id === vid); const g = window.__phlippoKit.projectedView(v.model, v.type); return { min: g.min, max: g.max }; }, id);
const v2s = (id, p) => page.evaluate(([vid, q]) => window.__phlippoSheet.viewToSheet(vid, q), [id, p]);
const click = async (sheetPt) => { const q = await toPx(sheetPt); await page.mouse.click(q.x, q.y); await page.waitForTimeout(150); };
await page.click('.k-cm-tab:has-text("Drawing")');

// clicking a view on the sheet opens its Property Panel; Display Style changes the view
{
  const iso = await page.evaluate(() => window.__phlippoStore.getState().doc.sheets[0].views.find((x) => x.id === 'v4').position);
  await click(iso);
  await page.mouse.up();
  check('clicking a view opens the Drawing View Property Panel', (await page.locator('[data-testid="drawingview-pm"]').count()) === 1 && /Drawing View4/.test(await page.locator('[data-testid="drawingview-pm"] .k-pm-title').innerText()));
  await page.click('[data-testid="drawingview-pm"] [data-style="hiddenVisible"]');
  const ds = await page.evaluate(() => window.__phlippoStore.getState().doc.sheets[0].views.find((x) => x.id === 'v4').displayStyle);
  check('Display Style in the Drawing View PM changes the view', ds === 'hiddenVisible', ds);
  check('status bar shows the sheet scale and the view being edited', /1 : 1/.test(await page.locator('[data-testid="sheet-scale"]').innerText()) && (await page.locator('.k-statusbar:has-text("Editing Drawing View4")').count()) === 1);
  await page.mouse.move(5, 900);
  await shot('vl0-drawing-view-pm');
  await page.click('[data-testid="drawingview-pm"] .k-pm-ok');
}

// Crop View on the top view (v2): keep the middle of the lever
let b = await bounds('v2');
await page.evaluate(() => window.__phlippoStore.getState().selectDrawingView('v2'));
const before = await v2s('v2', [b.min[0] + 5, b.min[1] + 2]);
await page.click('.k-cm-small:has-text("Crop View")');
check('Crop View opens its Property Panel', await page.locator('[data-testid="viewtool-pm"]').count() === 1);
const cx0 = b.min[0] + (b.max[0] - b.min[0]) * 0.1, cx1 = b.min[0] + (b.max[0] - b.min[0]) * 0.55;
await click(await v2s('v2', [cx0, b.min[1] - 1]));
await click(await v2s('v2', [cx1, b.max[1] + 1]));
let vs = await V();
let top = vs.find((v) => v.id === 'v2');
const after = await v2s('v2', [b.min[0] + 5, b.min[1] + 2]);
check('Crop View keeps the remaining geometry in place on the sheet', Math.hypot(after[0] - before[0], after[1] - before[1]) < 0.01, JSON.stringify([before, after]));
check('Crop View stores the rectangle on the view', top.crop && Math.abs(top.crop.max[0] - top.crop.min[0] - (cx1 - cx0)) < 1, JSON.stringify(top.crop));

// Break on the front view (v1): take out the middle of the lever along x
b = await bounds('v1');
await page.evaluate(() => window.__phlippoStore.getState().selectDrawingView('v1'));
await page.click('.k-cm-small:has-text("Break")');
const bx0 = b.min[0] + (b.max[0] - b.min[0]) * 0.35, bx1 = b.min[0] + (b.max[0] - b.min[0]) * 0.75;
const cy = (b.min[1] + b.max[1]) / 2;
await click(await v2s('v1', [bx0, cy]));
await click(await v2s('v1', [bx1, cy]));
vs = await V();
const front = vs.find((v) => v.id === 'v1');
const w2 = await page.evaluate(() => { const st = window.__phlippoStore.getState(); const v = st.doc.sheets[0].views.find((x) => x.id === 'v1'); return document.querySelectorAll('.k-break-lines path').length; });
check('Break stores the region and draws two zigzag break lines', front.brk && front.brk.axis === 'x' && w2 === 2, JSON.stringify(front.brk) + ' lines ' + w2);
await page.mouse.move(5, 900);
await shot('vl1-crop-break');

// Auxiliary View: perpendicular to the longest slanted (else longest) visible edge of the right view (v3)
await page.evaluate(() => window.__phlippoStore.getState().selectDrawingView('v3'));
await page.click('.k-cm-big:has-text("Auxiliary View") .k-cm-main');
check('Auxiliary View opens its Property Panel', await page.locator('[data-testid="aux-pm"]').count() === 1);
const edge = await page.evaluate(() => {
  const st = window.__phlippoStore.getState();
  const v = st.doc.sheets[0].views.find((x) => x.id === 'v3');
  const g = window.__phlippoKit.projectedView(v.model, v.type);
  const vis = g.lines.filter((l) => !l.hidden).map((l) => ({ l, len: Math.hypot(l.b[0] - l.a[0], l.b[1] - l.a[1]), slant: Math.abs(l.b[0] - l.a[0]) > 0.5 && Math.abs(l.b[1] - l.a[1]) > 0.5 }));
  vis.sort((a, b) => (b.slant - a.slant) || (b.len - a.len));
  const l = vis[0].l;
  return { mid: [(l.a[0] + l.b[0]) / 2, (l.a[1] + l.b[1]) / 2], a: l.a, b: l.b };
});
const em = await v2s('v3', edge.mid);
await click(em);
const nrm = [-(edge.b[1] - edge.a[1]), edge.b[0] - edge.a[0]]; const nl = Math.hypot(...nrm);
await click([em[0] + (nrm[0] / nl) * 80, em[1] + (nrm[1] / nl) * 80]);
vs = await V();
const aux = vs.find((v) => v.aux);
const auxLines = aux ? await page.evaluate((id) => { const st = window.__phlippoStore.getState(); const v = st.doc.sheets[0].views.find((x) => x.id === id); return document.querySelectorAll('.k-aux-arrow').length; }, aux.id) : 0;
check('Auxiliary View placed with its label and viewing arrow', aux && aux.aux.parentId === 'v3' && auxLines === 1, JSON.stringify(aux?.aux));
check('Auxiliary View label reads VIEW A', (await page.locator('.k-sheet-host text', { hasText: /^VIEW [A-Z]$/ }).count()) >= 1);
await page.mouse.move(5, 900);
await shot('vl2-auxiliary');

// Broken-out Section in the right view (v3): a closed profile around the collar, cut to half the depth
await page.click('.k-cm-tab:has-text("Drawing")');
b = await bounds('v3');
await page.evaluate(() => window.__phlippoStore.getState().selectDrawingView('v3'));
await page.click('.k-cm-small:has-text("Broken-out Section")');
check('Broken-out Section opens its Property Panel', await page.locator('[data-testid="brokenout-pm"]').count() === 1);
{
  const mx = (b.min[0] + b.max[0]) / 2, my = (b.min[1] + b.max[1]) / 2, hx = (b.max[0] - b.min[0]) * 0.3, hy = (b.max[1] - b.min[1]) * 0.6;
  const prof = [[mx - hx, my - hy], [mx + hx, my - hy * 0.8], [mx + hx * 1.1, my + hy], [mx - hx * 0.9, my + hy * 0.9], [mx - hx, my - hy]];
  for (const pt of prof) await click(await v2s('v3', pt));
}
await page.click('[data-testid="brokenout-pm"] .k-pm-ok');
await page.waitForTimeout(800);
const bo = await page.evaluate(() => { const v = window.__phlippoStore.getState().doc.sheets[0].views.find((x) => x.id === 'v3'); return { poly: v.brokenOut?.poly.length, depth: v.brokenOut?.depth, clipped: document.querySelectorAll('path[clip-path^="url(#k-boclip"]').length }; });
check('Broken-out Section cuts the view and hatches the exposed material inside the profile', bo.poly === 4 && bo.depth > 0 && bo.clipped === 1, JSON.stringify(bo));
await page.mouse.move(5, 900);
await shot('vl5-broken-out');

// Model Items: the lever's sketch and feature dimensions into the views (entire model)
await page.click('.k-cm-tab:has-text("Annotation")');
await page.click('.k-cm-big:has-text("Model Items") .k-cm-main');
check('Model Items opens its Property Panel', await page.locator('[data-testid="modelitems-pm"]').count() === 1);
await page.click('[data-testid="modelitems-pm"] .k-pm-ok');
await page.waitForTimeout(400);
const mi = await page.evaluate(() => { const sh = window.__phlippoStore.getState().doc.sheets[0]; return { n: sh.dimensions.length, views: [...new Set(sh.dimensions.map((d) => d.viewId))] }; });
check('Model Items inserts the model dimensions into the views', mi.n >= 3, JSON.stringify(mi));
await page.mouse.move(5, 900);
await shot('vl4-model-items');

// Bill of Materials on an assembly drawing of the door handle
const asm = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk.kcad', 'utf8')); delete asm.format;
await page.evaluate((model) => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Deurkruk-samenstelling', 'drawing', { size: 'A3', landscape: true, scale: [1, 5], showFormat: true });
  d.sheets[0].views = [{ id: 'v1', name: 'Drawing View1', type: 'isometric', position: [180, 150], displayStyle: 'hiddenRemoved', model: { ...model, kind: 'assembly' }, modelName: 'Deurkruk' }];
  window.__phlippoStore.getState().openDocument(d);
}, asm);
await page.waitForTimeout(1500);
await page.click('.k-cm-tab:has-text("Annotation")');
await page.click('.k-cm-big:has-text("Tables") .k-cm-main');
await page.waitForTimeout(300);
const rows = await page.evaluate(() => [...document.querySelectorAll('[data-testid="bom-table"] text')].map((t) => t.textContent));
check('Bill of Materials table: header ITEM NO. / PART NUMBER / DESCRIPTION / QTY.', rows.slice(0, 4).join('|') === 'ITEM NO.|PART NUMBER|DESCRIPTION|QTY.', rows.slice(0, 4).join('|'));
check('Bill of Materials lists every part once with its quantity (6 rows incl. the screws)', rows.length === 4 * 7, rows.join('|'));
await page.click('.k-cm-small:has-text("Auto Balloon")');
await click([180, 150]);
await page.keyboard.press('Escape');
await page.mouse.move(5, 900);
await shot('vl3-bom');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
