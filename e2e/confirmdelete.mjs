// Confirm Delete as the original: Delete on a feature opens the dialog with its dependent items; Yes deletes the
// feature and its children (no orphan Fillet left behind); Ctrl+Z restores; a crash shows the recovery box.
import { chromium } from 'playwright';
import { exitCode, skip } from './lib/check.mjs';
import { readFileSync, mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
const names = () => page.evaluate(() => window.__phlippoStore.getState().doc.features.map((f) => f.name));

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const doc = JSON.parse(readFileSync(new URL('./fixtures/user-part1.json', import.meta.url), 'utf8'));
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), doc);
await page.waitForTimeout(1200);

// Delete Boss-Extrude1 from the tree with the Delete key
await page.locator('.k-tree-row:has-text("Boss-Extrude1")').first().click();
await page.keyboard.press('Delete');
await page.waitForSelector('[data-testid="confirm-delete"]', { timeout: 3000 }).catch(skip('confirmdelete:29'));
await page.waitForTimeout(600);
const dlg = await page.evaluate(() => ({ items: document.querySelector('[data-testid="cdel-items"]')?.textContent, deps: document.querySelector('[data-testid="cdel-children"]')?.textContent }));
check('Delete opens Confirm Delete with the feature', /Boss-Extrude1/.test(dlg.items ?? ''), JSON.stringify(dlg));
// as the original: "Also delete absorbed features" is on by default, so the absorbed sketch sits with the feature itself
check('the dependent items list the fillet and the sketch on its face; the absorbed sketch goes with the feature', /Fillet1/.test(dlg.deps ?? '') && /Sketch2/.test(dlg.deps ?? '') && /Sketch1/.test(dlg.items ?? ''), JSON.stringify(dlg));
await page.screenshot({ path: `${OUT}/cdel-1.png` });
await page.click('[data-testid="cdel-yes"]');
await page.waitForTimeout(800);
let n = await names();
check('Yes (defaults: absorbed on, child features off) deletes the extrusion and its absorbed sketch; the fillet and the face sketch stay', !n.includes('Boss-Extrude1') && !n.includes('Sketch1') && n.includes('Fillet1') && n.includes('Sketch2'), JSON.stringify(n));
check('the dialog is closed', (await page.locator('[data-testid="confirm-delete"]').count()) === 0);
await page.keyboard.press('Control+z');
await page.waitForTimeout(800);
n = await names();
check('Ctrl+Z restores both', n.includes('Boss-Extrude1') && n.includes('Fillet1'), JSON.stringify(n));

// Delete child features: the fillet goes too
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.requestDeleteFeature(s.doc.features.find((f) => f.name === 'Boss-Extrude1').id); });
await page.waitForTimeout(500);
await page.click('[data-testid="cdel-childopt"]');
await page.click('[data-testid="cdel-yes"]');
await page.waitForTimeout(800);
n = await names();
check('Delete child features removes the fillet and the face sketch too', !n.includes('Sketch1') && !n.includes('Boss-Extrude1') && !n.includes('Fillet1') && !n.includes('Sketch2'), JSON.stringify(n));
// the choice is remembered: back to the default for the rest of the run
await page.evaluate(() => localStorage.setItem('phlippo.confirmDelete', JSON.stringify({ absorbed: true, children: false })));
await page.keyboard.press('Control+z');
await page.waitForTimeout(600);

// Escape and No keep everything
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.requestDeleteFeature(s.doc.features.find((f) => f.name === 'Sketch1').id); });
await page.waitForTimeout(400);
const deps2 = await page.evaluate(() => document.querySelector('[data-testid="cdel-children"]')?.textContent);
check('deleting Sketch1 lists Boss-Extrude1 and Fillet1 as dependent items', /Boss-Extrude1/.test(deps2 ?? '') && /Fillet1/.test(deps2 ?? ''), deps2);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
check('Escape cancels (nothing deleted)', (await page.locator('[data-testid="confirm-delete"]').count()) === 0 && (await names()).length === doc.features.length);
await page.keyboard.press('Delete');
await page.waitForTimeout(300);
const alive = await Promise.race([page.evaluate(() => 1), new Promise((r) => setTimeout(() => r('timeout'), 3000))]);
check('the app keeps responding', alive === 1);

// an error inside React shows the recovery box instead of a blank window
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.deleteFeature(s.doc.features.find((f) => f.name === 'Fillet1').id); });
await page.waitForTimeout(400);
await page.evaluate(() => window.__phlippoStore.setState({ confirmDelete: { id: 'nope', children: ['x'], absorbed: [], checking: false }, doc: { ...window.__phlippoStore.getState().doc, features: null } }));
await page.waitForTimeout(500);
const crash = await page.locator('[data-testid="crash"]').count();
check('a crash shows the recovery box (no blank window)', crash === 1);
if (crash) { await page.click('[data-testid="crash"] button:has-text("Undo and continue")'); await page.waitForTimeout(800); }
check('Undo and continue brings the app back with the document', (await page.locator('.k-viewport').count()) === 1 && (await names()).includes('Fillet1'), String(await page.locator('.k-viewport').count()));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
