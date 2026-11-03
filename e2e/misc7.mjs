// The last greyed-out items: Lasso Selection, Select Other, Isolate, Delete Body, Add Derived Configuration,
// Animate collapse, sensor Notifications, Window ▸ Viewport ▸ Two / Four View.
import { chromium } from 'playwright';
import { exitCode, waitSettled } from './lib/check.mjs';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error' && !/WebGL|GL_/.test(m.text())) errors.push('console: ' + m.text()); });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');

// Lasso Selection in a sketch: two circles, the lasso takes only the left one
await page.click('.k-tree-row:has-text("Front Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(300);
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.commit('c', (k) => window.__phlippoKit.addCircle(window.__phlippoKit.addCircle(k, { x: 0, y: 0 }, 10)[0], { x: 60, y: 0 }, 10)[0]); });
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
// shortcut menu ▸ Selection Tools ▸ Lasso Selection
const vp = await page.locator('.k-viewport').boundingBox();
await page.mouse.click(vp.x + vp.width - 200, vp.y + vp.height - 120, { button: 'right' });
await page.waitForTimeout(200);
// Lasso Selection sits in the Selection Tools fly-out, by design
await page.locator('.k-menu-item:has-text("Selection Tools")').first().hover();
await page.waitForTimeout(150);
const lassoItem = page.locator('.k-menu-item:has-text("Lasso Selection")').first();
const hasLasso = await lassoItem.count();
if (hasLasso) await lassoItem.click(); else await page.keyboard.press('Escape');
const pts = [[-20, -20], [20, -22], [25, 20], [-22, 25], [-20, -20]];
let p = await P(...pts[0]);
await page.mouse.move(p.x, p.y);
await page.mouse.down();
for (const q of pts.slice(1)) { p = await P(...q); await page.mouse.move(p.x, p.y, { steps: 5 }); }
await page.mouse.up();
await page.waitForTimeout(300);
const sel = await page.evaluate(() => window.__phlippoStore.getState().selection.length);
check('Lasso Selection selects only what is inside the loop', hasLasso && sel === 1, `menu ${hasLasso} sel ${sel}`);
await page.keyboard.press('Escape');
await page.evaluate(() => window.__phlippoStore.getState().exitSketch());

// two bodies for Select Other / Isolate / Delete Body
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const rect = (id, x0) => { let s = K.createSketch(id, id, 'top'); const c = [[x0, 0], [x0 + 30, 0], [x0 + 30, 30], [x0, 30]]; for (let i = 0; i < 4; i++) s = K.addLine(s, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0]; return s; };
  const d = { ...K.createDocument('Two'), sketches: { a: rect('a', 0), b: rect('b', 50) }, features: [
    { id: 'ka', type: 'sketch', name: 'Sketch1', sketchId: 'a', suppressed: false }, { id: 'ea', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'a', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'kb', type: 'sketch', name: 'Sketch2', sketchId: 'b', suppressed: false }, { id: 'eb', type: 'extrude', name: 'Boss-Extrude2', sketchId: 'b', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
  ] };
  window.__phlippoStore.getState().openDocument(d);
});
await waitSettled(page);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.waitForTimeout(500);
// Select Other: right-click on the first body, then Select Other picks the face behind
// (a slow runner draws the fitted view later: click until a face is selected)
let c0 = await page.evaluate(() => window.__phlippoProjectWorld(15, 5, -15));
for (let k = 0; k < 10; k++) {
  c0 = await page.evaluate(() => window.__phlippoProjectWorld(15, 5, -15));
  await page.mouse.click(c0.x, c0.y);
  await page.waitForTimeout(200);
  if (await page.evaluate(() => !!window.__phlippoStore.getState().selectedFace)) break;
}
await page.mouse.click(c0.x, c0.y, { button: 'right' });
await page.waitForTimeout(200);
const before = await page.evaluate(() => JSON.stringify(window.__phlippoStore.getState().selectedFace));
const so = page.locator('.k-menu-item:has-text("Select Other")').first();
if (await so.count()) await so.click();
await page.waitForTimeout(200);
const after = await page.evaluate(() => JSON.stringify(window.__phlippoStore.getState().selectedFace));
check('Select Other picks another face under the pointer', (await so.count()) >= 0 && before !== after && after !== 'null', `${before} -> ${after}`);
await page.keyboard.press('Escape');

const bodies = await page.evaluate(() => window.__phlippoStore.getState().rebuild.bodies.map((b) => b.id));
await page.evaluate((id) => window.__phlippoStore.getState().setIsolated([id]), bodies[0]);
await page.waitForTimeout(400);
check('Isolate shows the Exit Isolate bar', (await page.locator('[data-testid="isolate-bar"]').count()) === 1);
await page.screenshot({ path: `${OUT}/m7-isolate.png` });
await page.click('[data-testid="isolate-bar"] button');
await page.evaluate((id) => window.__phlippoStore.getState().deleteBodies([id]), bodies[1]);
await page.waitForTimeout(600);
const left = await page.evaluate(() => ({ n: window.__phlippoStore.getState().rebuild.bodies.length, f: window.__phlippoStore.getState().doc.features.map((f) => f.name) }));
check('Delete Body adds Body-Delete/Keep1 and leaves one body', left.n === 1 && left.f.includes('Body-Delete/Keep1'), JSON.stringify(left));

// Sensor with a notification
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.addSensor('mass'); const sn = s.doc.sensors?.[0] ?? window.__phlippoStore.getState().doc.sensors[0]; const st2 = window.__phlippoStore.getState(); st2.applyDocument('n', { ...st2.doc, sensors: st2.doc.sensors.map((x) => ({ ...x, alert: { op: '>', value: 1 } })) }); });
await page.waitForTimeout(400);
await page.locator('.k-tree-row:has-text("Sensors") .caret').first().click();
await page.waitForTimeout(200);
check('a sensor above its notification limit shows the alarm', (await page.locator('.k-sensor-alarm').count()) === 1);

// Derived configuration
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.startAddConfiguration('cfg-default'); s.updateConfigDraft({ name: 'Short' }); s.commitConfiguration(); });
const cfg = await page.evaluate(() => (window.__phlippoStore.getState().doc.configurations ?? []).map((c) => ({ n: c.name, p: c.parentId })));
check('Add Derived Configuration makes a child of Default', cfg.some((c) => c.n === 'Short' && c.p === 'cfg-default'), JSON.stringify(cfg));

// Viewport ▸ Four View
await page.evaluate(() => window.__phlippoStore.getState().setViewportLayout('four'));
await page.waitForTimeout(1500);
check('Four View shows three extra panes beside the main viewport', (await page.locator('.k-viewpane').count()) === 3 && (await page.locator('.k-viewport').count()) === 1);
await page.screenshot({ path: `${OUT}/m7-fourview.png` });
await page.evaluate(() => window.__phlippoStore.getState().setViewportLayout('single'));

// Animate collapse on the door handle assembly
const asm = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk.kcad', 'utf8')); delete asm.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), asm);
await page.waitForTimeout(2000);
const hasSteps = await page.evaluate(() => (window.__phlippoStore.getState().doc.explodeSteps ?? []).length);
if (hasSteps) {
  await page.evaluate(() => window.__phlippoStore.getState().setExploded(true));
  await page.evaluate(() => window.__phlippoStore.getState().animateCollapse());
  await page.waitForTimeout(400);
  const mid = await page.evaluate(() => window.__phlippoStore.getState().doc.explodeFactor);
  // 1.2 s of requestAnimationFrame; a loaded machine starves the frames, so wait for the end instead of a fixed 1.5 s
  const end = await page.waitForFunction(() => window.__phlippoStore.getState().doc.exploded === false, null, { timeout: 15000 }).then(() => false, () => true);
  check('Animate collapse runs from exploded to collapsed', typeof mid === 'number' && mid > 0 && mid < 1 && end === false, JSON.stringify({ mid, end }));
} else check('Animate collapse (door handle has explode steps)', false, 'no steps');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
