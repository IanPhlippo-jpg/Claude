// Insert ▸ Features ▸ Move/Copy (Body-Move/Copy Property Panel: copies and ΔX) and Bodies to Keep (a cut that splits
// a plate opens the dialog; Selected bodies keeps one), through the menu, the Property Panel and the dialog.
import { menuPath } from './lib/menu.mjs';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { checks, exitCode, track, dontSave } from './lib/check.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = track(page);
const { results, check } = checks();
const S = (fn, arg) => page.evaluate(fn, arg);
const menuItem = (label) => menuPath(page, label);
const bodies = () => S(() => window.__phlippoStore.getState().rebuild.bodies.map((b) => { b.geometry.computeBoundingBox(); return Math.round(b.geometry.boundingBox.min.x); }).sort((a, c) => a - c));

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

const plate = (withSlot) => S((slot) => {
  const K = window.__phlippoKit;
  const rect = (id, x0, y0, x1, y1) => { let s = K.createSketch(id, id, 'top'); const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; for (let i = 0; i < 4; i++) s = K.addLine(s, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0]; return s; };
  const d = K.createDocument(slot ? 'Gesplitst' : 'Plaat');
  d.sketches = { s1: rect('Sketch1', 0, 0, 80, 60) };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  if (slot) {
    d.sketches.s2 = rect('Sketch2', 20, -5, 30, 65);
    d.features.push({ id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false });
  }
  window.__phlippoStore.getState().openDocument(d);
}, withSlot);

// ---- Move/Copy through the menu and the Property Panel
await plate(false);
await page.waitForTimeout(300);
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("Insert")');
await page.waitForTimeout(150);
check('Insert menu offers Features ▸ Move/Copy…', (await menuItem('Features ▸ Move/Copy…').count()) === 1);
await menuItem('Features ▸ Move/Copy…').click();
await page.waitForTimeout(300);
check('the Body-Move/Copy1 Property Panel opens with Translate and Rotate', (await page.locator('.k-pm-host').innerText()).includes('Body-Move/Copy1') && (await page.locator('[data-testid="move-translate-0"]').count()) === 1 && (await page.locator('[data-testid="move-rotate-1"]').count()) === 1);
await page.locator('[data-testid="move-copy"]').check();
await page.waitForTimeout(150);
await page.locator('[data-testid="move-copies"] input').fill('2');
await page.locator('[data-testid="move-copies"] input').press('Tab');
await page.locator('[data-testid="move-translate-0"] input').fill('100');
await page.locator('[data-testid="move-translate-0"] input').press('Tab');
await page.waitForTimeout(200);
await page.screenshot({ path: `${OUT}/bodies-move-pm.png` });
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(500);
const xs = await bodies();
check('two copies 100 mm apart: three bodies at x = 0, 100, 200', JSON.stringify(xs) === JSON.stringify([0, 100, 200]), JSON.stringify(xs));
check('Body-Move/Copy1 is in the tree', (await page.locator('.k-tree-row:has-text("Body-Move/Copy1")').count()) === 1);

// ---- Bodies to Keep: a through cut splits the plate
await plate(true);
await dontSave(page); // Save changes? → Don't Save, when it asks
await page.waitForTimeout(300);
await S(() => { window.__phlippoStore.setState({ selectedFeatureId: 'k2' }); window.__phlippoStore.getState().startFeature('extrude', 'cut'); });
await page.waitForTimeout(200);
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ end: 'throughAll' }));
await S(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(500);
check('the cut that splits the plate opens Bodies to Keep', await page.locator('[data-testid="keep-ok"]').waitFor({ timeout: 5000 }).then(() => true, () => false));
check('two bodies until the choice is made', (await bodies()).length === 2);
await page.screenshot({ path: `${OUT}/bodies-to-keep.png` });
await page.locator('[data-testid="keep-selected"]').check();
await page.locator('[data-testid="keep-body-1"]').uncheck();
await page.locator('[data-testid="keep-ok"]').click();
await page.waitForTimeout(500);
const after = await S(() => { const s = window.__phlippoStore.getState(); const c = s.doc.features.find((f) => f.type === 'extrude' && f.op === 'cut'); return { keep: c?.keepBodies, n: s.rebuild.bodies.length, dialog: s.dialog }; });
check('Selected bodies keeps the largest piece only (stored in the cut)', after.n === 1 && JSON.stringify(after.keep) === '[0]' && after.dialog === null, JSON.stringify(after));

await browser.close();
console.log(`${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
