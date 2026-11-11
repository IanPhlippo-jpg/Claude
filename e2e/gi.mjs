// Block G-I: Material dialog fields (Compressive Strength, Description, Source, Environmental Class, Favorites + the tree
// material menu) and the Product Dimensions tab (Auto Dimension Scheme, Datum, Size Dimension, Geometric Tolerance,
// Show Tolerance Status, Delete All Tolerances, Tolerance Tree, callouts).
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const S = (fn, arg) => page.evaluate(fn, arg);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const dx = () => S(() => window.__phlippoStore.getState().doc.autoTolerance ?? null);
const pickFace = (pred, additive = false) => S(({ pred, additive }) => {
  const s = window.__phlippoStore.getState();
  const fn = new Function('f', `return ${pred}`);
  for (const b of s.rebuild.bodies) { const f = b.faces.find((f) => !f.curved && fn(f)); if (f) { s.setSelectedFace({ bodyId: b.id, faceId: f.id }, additive); return true; } }
  return false;
}, { pred, additive });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  sk = K.addLine(sk, { x: -30, y: -20 }, { x: 30, y: -20 })[0];
  sk = K.addLine(sk, { x: 30, y: -20 }, { x: 30, y: 20 })[0];
  sk = K.addLine(sk, { x: 30, y: 20 }, { x: -30, y: 20 })[0];
  sk = K.addLine(sk, { x: -30, y: 20 }, { x: -30, y: -20 })[0];
  const d = K.createDocument('Blok');
  d.sketches = { s1: sk };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);

// ---- Material dialog: the extra fields and Favorites
await page.locator('.k-tree-row[data-id="material"]').dblclick();
await page.waitForTimeout(400);
await page.locator('.k-material-item:has-text("AISI 1020")').click();
await page.waitForTimeout(200);
check('Properties table has a Compressive Strength row', (await page.locator('.k-material-props tr:has-text("Compressive Strength")').count()) === 1);
check('Description / Source / Environmental Class shown for the library material', /Low carbon steel/.test(await page.locator('[data-testid="mat-description"]').inputValue()) && /Phlippo CAD Materials/.test(await page.locator('[data-testid="mat-source"]').inputValue()) && /Carbon steel/.test(await page.locator('[data-testid="mat-sustainability"]').inputValue()));
await page.locator('.k-material-cat:has-text("Iron")').first().click();
await page.locator('.k-material-item:has-text("Gray Cast Iron")').click();
await page.waitForTimeout(200);
check('Gray Cast Iron has a compressive strength value', /5\.72/.test(await page.locator('.k-material-props tr:has-text("Compressive Strength") td:nth-child(2)').innerText()));
await shot('gi0-material-properties');
// the seven tabs fit on one line, no scroll bar and no tab cut short (QA 0.5.13 F193)
const tabs = await page.evaluate(() => {
  const row = document.querySelector('.k-material-tabs');
  const b = [...row.querySelectorAll('button')];
  return { n: b.length, rowFits: row.scrollWidth <= row.clientWidth, overflowX: getComputedStyle(row).overflowX, cut: b.filter((x) => x.scrollWidth > x.clientWidth).map((x) => x.textContent), tops: [...new Set(b.map((x) => Math.round(x.getBoundingClientRect().top)))].length };
});
check('Material tabs: all seven on one line without a scroll bar, none cut short', tabs.n === 7 && tabs.rowFits && tabs.overflowX === 'visible' && tabs.cut.length === 0 && tabs.tops === 1, JSON.stringify(tabs));
await page.locator('.k-material-tabs button:has-text("Favorites")').click();
await page.waitForTimeout(200);
await page.locator('[data-testid="mat-fav-add"]').click();
await page.locator('.k-material-item:has-text("AISI 1020")').click();
await page.locator('[data-testid="mat-fav-add"]').click();
await page.waitForTimeout(200);
check('Favorites lists Gray Cast Iron and AISI 1020', (await page.locator('[data-testid="mat-favorites"] .k-selbox-row').count()) === 2);
await shot('gi1-material-favorites');
await page.locator('.k-dialog-actions .k-btn:has-text("Close")').click();
await page.waitForTimeout(200);
await page.locator('.k-tree-row[data-id="material"]').click({ button: 'right' });
await page.waitForTimeout(200);
check('the tree material menu lists the favorites and Edit Material…', (await page.locator('.k-menu-item:has-text("AISI 1020")').count()) === 1 && (await page.locator('.k-menu-item:has-text("Gray Cast Iron")').count()) === 1 && (await page.locator('.k-menu-item:has-text("Edit Material…")').count()) === 1);
await shot('gi2-material-menu');
await page.locator('.k-menu-item:has-text("AISI 1020")').click();
await page.waitForTimeout(300);
check('a favorite applies the material', (await S(() => window.__phlippoStore.getState().doc.material?.name)) === 'AISI 1020');

// ---- Product Dimensions tab
check('Command Ribbon has an Product Dimensions tab', (await page.locator('.k-cm-tab:has-text("Product Dimensions")').count()) === 1);
await page.click('.k-cm-tab:has-text("Product Dimensions")');
for (const l of ['Auto Dimension Scheme', 'Location Dimension', 'Size Dimension', 'Pattern Feature', 'Datum', 'Geometric Tolerance', 'Show Tolerance Status', 'Copy Scheme', 'Import Scheme', 'Delete All Tolerances', 'Tolerance Sum']) check(`MBD tab has ${l}`, (await page.locator(`.k-cm-group :text-is("${l}")`).count()) >= 1);
await shot('gi3-mbd-tab');
// Auto Dimension Scheme
await page.click('.k-cm-big:has-text("Auto Dimension Scheme") .k-cm-main');
await page.waitForTimeout(300);
check('Auto Dimension Scheme PM: Settings (Prismatic/Turned, Plus and Minus/Geometric), Datum Selection, Scope', (await page.locator('[data-testid="autoTolerance-pm"]').count()) === 1 && (await page.locator('[data-testid="dx-plusminus"]').isChecked()) && (await page.locator('.k-section-name:text-is("Datum Selection")').count()) === 1);
await page.locator('[data-testid="dx-ok"]').click();
await page.waitForTimeout(500);
const d1 = await dx();
check('the scheme has datums A B C and size dimensions 60 / 40 / 20', d1 && d1.datums.length === 3 && d1.dims.filter((x) => x.kind === 'size').map((x) => x.value).sort((a, b) => a - b).join(',') === '20,40,60', JSON.stringify(d1?.dims.map((x) => x.value)));
check('Tolerance Tree shows the datums and dimensions', (await page.locator('[data-testid="dx-datum"]').count()) === 3 && (await page.locator('[data-testid="dx-size"]').count()) === 3);
check('callouts in the graphics area: 3 datums and 3 dimensions with ± tolerance', (await page.locator('[data-testid="dx-callout-datum"]').count()) === 3 && (await page.locator('[data-testid="dx-callout-dim"]').count()) === 3 && /±0\.25/.test(await page.locator('[data-testid="dx-callout-dim"]').first().innerText()));
await shot('gi4-auto-scheme');
// Show Tolerance Status
await page.click('.k-cm-big:has-text("Show Tolerance Status") .k-cm-main');
await page.waitForTimeout(400);
check('Show Tolerance Status: 6 faces fully constrained', /6 fully constrained/.test(await page.locator('[data-testid="dx-status-legend"]').innerText()));
await shot('gi5-tolerance-status');
await page.click('.k-cm-big:has-text("Show Tolerance Status") .k-cm-main');
// Datum D on the top face
await page.click('.k-cm-big:has-text("Datum") .k-cm-main');
await page.waitForTimeout(300);
await pickFace('f.normal[1] > 0.99');
await page.locator('[data-testid="dx-label"]').fill('D');
await page.locator('[data-testid="dx-ok"]').click();
await page.waitForTimeout(400);
check('Datum D added', (await dx()).datums.map((x) => x.label).join('') === 'ABCD');
// Size Dimension between the two X faces, basic
await page.click('.k-cm-big:has-text("Size Dimension") .k-cm-main');
await page.waitForTimeout(300);
await pickFace('f.normal[0] > 0.99');
await pickFace('f.normal[0] < -0.99', true);
await page.waitForTimeout(200);
check('two faces picked for the size dimension', (await page.locator('[data-testid="dx-faces"] .k-selbox-row').count()) === 2);
await page.locator('[data-testid="dx-ok"]').click();
await page.waitForTimeout(400);
const d2 = await dx();
check('Size Dimension 60 added (4 size dimensions)', d2.dims.filter((x) => x.kind === 'size').length === 4 && d2.dims[d2.dims.length - 1].value === 60);
// Geometric Tolerance: flatness on the top face with datum A
await page.click('.k-cm-big:has-text("Geometric Tolerance") .k-cm-main');
await page.waitForTimeout(300);
await pickFace('f.normal[1] > 0.99');
await page.locator('[data-testid="dx-sym-flatness"]').click();
await page.locator('[data-testid="dx-datum-A"]').click();
await page.locator('[data-testid="dx-ok"]').click();
await page.waitForTimeout(400);
const d3 = await dx();
check('Geometric Tolerance ⏥ with datum A added', d3.gtols.length === 1 && d3.gtols[0].symbol === 'flatness' && d3.gtols[0].datums.join('') === 'A' && (await page.locator('[data-testid="dx-callout-gtol"]').count()) === 1, JSON.stringify(d3.gtols));
await shot('gi6-autoTolerance');
// Tolerance Stack-up Study message and Delete All Tolerances
await page.click('.k-cm-small:has-text("Tolerance Sum")');
await page.waitForTimeout(300);
check('Tolerance Sum: worst case and RSS over all dimensions, said so (F90)', /not the stack-up of one dimension chain/.test(await page.locator('[data-testid="ask"]').innerText()) && /worst case/.test(await page.locator('[data-testid="ask"]').innerText()) && /RSS/.test(await page.locator('[data-testid="ask"]').innerText()));
await page.locator('[data-testid="ask"] .k-btn.primary').click();
await page.waitForTimeout(200);
await page.click('.k-cm-small:has-text("Delete All Tolerances")');
await page.waitForTimeout(400);
check('Delete All Tolerances clears the scheme and the callouts', (await dx()) === null && (await page.locator('[data-testid="dx-callout-dim"]').count()) === 0);

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
