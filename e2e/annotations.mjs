// Drawing annotations on the door handle: Hole Callout, Centerline, Surface Finish, Geometric Tolerance, Datum Feature on the lever drawing; Auto Balloon on an assembly view.
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
const tek = JSON.parse(readFileSync('voorbeelden/deurkruk/Kruk-tekening.kcad', 'utf8')); delete tek.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), tek);
await page.waitForTimeout(1200);
const toPx = (p) => page.evaluate((q) => window.__phlippoSheet.toPx(q), p);
const views = await page.evaluate(() => window.__phlippoStore.getState().doc.sheets[0].views.map((v) => ({ id: v.id, type: v.type, pos: v.position, section: !!v.section, detail: !!v.detail })));
const front = views.find((v) => v.type === 'front' && !v.section && !v.detail);
const S = () => page.evaluate(() => (window.__phlippoStore.getState().doc.sheets[0].symbols ?? []).map((s) => ({ kind: s.kind, text: s.text, symbol: s.symbol })));
await page.click('.k-cm-tab:has-text("Annotation")');
// Hole Callout on the collar circle of the front view (circle centre is the view position, radius 13 at 1:1)
const collar = await page.evaluate((id) => { const st = window.__phlippoStore.getState(); const v = st.doc.sheets[0].views.find((x) => x.id === id); const f = window.__phlippoKit.projectedView(v.model, 'front'); const c = f.circles.filter((x) => !x.hidden).sort((a, b) => b.r - a.r)[0]; return window.__phlippoSheet.viewToSheet(id, c.c); }, front.id);
await page.click('.k-cm-small:has-text("Hole Callout")');
let q = await toPx([collar[0] + 13, collar[1]]); await page.mouse.click(q.x, q.y);
q = await toPx([collar[0] + 30, collar[1] + 25]); await page.mouse.click(q.x, q.y);
await page.waitForTimeout(200);
let s = await S();
check('Hole Callout reads the diameter (Ø26.00 THRU ALL)', s.some((x) => x.kind === 'holeCallout' && /Ø26\.00/.test(x.text)), JSON.stringify(s));
await page.keyboard.press('Escape');
// Surface Finish, Geometric Tolerance (flatness 0.05 A), Datum Feature: leader to the top edge of the lever, then place
for (const [label, kind] of [['Surface Finish', 'surfaceFinish'], ['Geometric Tolerance', 'gtol'], ['Datum Feature', 'datum']]) {
  await page.click(`.k-cm-small:has-text("${label}")`);
  await page.waitForTimeout(150);
  if (kind === 'gtol') { await page.locator('[data-testid="gtol-datum"]').fill('A'); }
  q = await toPx([collar[0] + 60, collar[1] + 8]); await page.mouse.click(q.x, q.y);
  q = await toPx([collar[0] + 60 + (kind === 'gtol' ? 20 : kind === 'datum' ? -10 : 0), collar[1] + 30 + (kind === 'datum' ? 10 : 0)]); await page.mouse.click(q.x, q.y);
  await page.waitForTimeout(150);
  await page.keyboard.press('Escape');
}
s = await S();
check('Surface Finish, Geometric Tolerance (with datum A) and Datum Feature A placed', s.some((x) => x.kind === 'surfaceFinish' && x.text === '3.2') && s.some((x) => x.kind === 'gtol' && x.symbol === '⏥') && s.some((x) => x.kind === 'datum' && x.text === 'A'), JSON.stringify(s));
await page.mouse.move(5, 900);
await shot('an1-annotations');
// Auto Balloon on an isometric view of the assembly
const asm = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk.kcad', 'utf8')); delete asm.format;
await page.evaluate((model) => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Deurkruk-samenstelling', 'drawing', { size: 'A3', landscape: true, scale: [1, 5], showFormat: true });
  d.sheets[0].views = [{ id: 'v1', name: 'Drawing View1', type: 'isometric', position: [200, 160], displayStyle: 'hiddenRemoved', model: { ...model, kind: 'assembly' }, modelName: 'Deurkruk' }];
  window.__phlippoStore.getState().openDocument(d);
}, asm);
await page.waitForTimeout(1500);
await page.click('.k-cm-tab:has-text("Annotation")');
await page.click('.k-cm-small:has-text("Auto Balloon")');
q = await toPx([200, 160]); await page.mouse.click(q.x, q.y);
await page.waitForTimeout(500);
s = await S();
const items = [...new Set(s.filter((x) => x.kind === 'balloon').map((x) => x.text))];
check('Auto Balloon: one balloon per part (6 parts incl. the screws, items 1-6)', items.length === 6, JSON.stringify(items));
await page.mouse.move(5, 900);
await shot('an2-auto-balloon');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
