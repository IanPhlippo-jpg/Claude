// Assembly ▸ Edit Component: the pin is opened from the assembly, its length changed, Return to Assembly updates the instance.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');

const pin = JSON.parse(readFileSync('voorbeelden/deurkruk/Vierkantstift.kcad', 'utf8'));
delete pin.format;
await page.evaluate((part) => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Pennen', 'assembly');
  d.components = [{ id: 'c1', name: 'Vierkantstift<1>', part, position: [0, 0, 0], rotation: [0, 0, 0, 1], fixed: true, suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
}, pin);
await page.waitForTimeout(600);
const len = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const g = s.rebuild.bodies[0].geometry; g.computeBoundingBox(); const b = g.boundingBox; return Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z); });
const before = await len();
await page.click('.k-cm-tab:has-text("Assembly")');
await page.click('.k-tree-row:has-text("Vierkantstift<1>")');
await page.click('.k-cm-big:has-text("Edit Component") .k-cm-main');
await page.waitForTimeout(600);
let st = await page.evaluate(() => ({ kind: window.__phlippoStore.getState().doc.kind, ctx: !!window.__phlippoStore.getState().editContext }));
check('Edit Component opens the part with the in-context banner', st.kind === 'part' && st.ctx && (await page.locator('[data-testid="edit-context"]').count()) === 1, JSON.stringify(st));
await shot('ec1-edit-component');
// change the extrusion depth of the pin: 100 -> 120 (first extrude of the part)
const feat = await page.evaluate(() => window.__phlippoStore.getState().doc.features.find((f) => f.type === 'extrude')?.name);
await page.locator(`.k-tree-row:has-text("${feat}")`).last().dblclick();
await page.waitForTimeout(400);
const depthField = page.locator('.k-section:has-text("Direction 1") .k-pm-valuerow input.k-num').first();
const oldDepth = await page.evaluate(() => window.__phlippoStore.getState().featureEdit?.draft?.depth);
await depthField.fill(String(oldDepth + 20));
await depthField.press('Tab');
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
await page.click('[data-testid="edit-context"] .k-btn');
await page.waitForTimeout(800);
st = await page.evaluate(() => ({ kind: window.__phlippoStore.getState().doc.kind, ctx: !!window.__phlippoStore.getState().editContext }));
const after = await len();
check('Return to Assembly: the instance is 20 mm longer', st.kind === 'assembly' && !st.ctx && Math.abs(after - before - 20) < 0.01, JSON.stringify({ st, before, after }));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
