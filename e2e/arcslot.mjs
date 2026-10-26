// 3 Point Arc Slot drawn with clicks (closed slot, extrudes), Repair Sketch, Boundary Boss and the Sensor Property Panel.
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
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const K = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return sk ? sk.entityOrder.map((id) => sk.entities[id].kind + (sk.entities[id].construction ? '*' : '')) : []; });
const count = async (kind) => (await K()).filter((k) => k === kind).length;

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.click('.k-tree-row:has-text("Front Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
await page.click('.k-cm-iconbtn[data-tip="3 Point Arc Slot"]');
await page.waitForTimeout(150);
for (const [x, y] of [[-40, 0], [40, 0], [0, 40], [0, 48]]) {
  const q = await P(x, y);
  await page.mouse.move(q.x, q.y);
  await page.waitForTimeout(60);
  await page.mouse.click(q.x, q.y);
}
await page.waitForTimeout(200);
let k = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return sk.entityOrder.map((id) => sk.entities[id].kind + (sk.entities[id].construction ? '*' : '')); });
check('arc slot: two concentric arcs, two end caps, a construction centre arc', k.filter((x) => x === 'arc').length === 4 && k.includes('arc*'), k.join(','));
await page.keyboard.press('Escape');
await shot('as1-arc-slot');
// Repair Sketch: no problems in the slot
await page.click('.k-cm-big:has-text("Repair Sketch") .k-cm-main');
await page.waitForTimeout(200);
{ const t = await page.locator('[data-testid="repair-list"]').innerText(); check('Repair Sketch finds no problems', t.includes('No problems found'), t); }
await page.click('.k-repair-dialog .k-btn:has-text("Close")');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(400);
await page.click('.k-pm-ok');
await page.waitForTimeout(700);
let r = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { bodies: s.rebuild.bodies.length, errors: s.rebuild.errors }; });
check('the arc slot extrudes to a curved bar (closed profile, no thin feature)', r.bodies === 1 && Object.keys(r.errors).length === 0 && !(await page.evaluate(() => window.__phlippoStore.getState().doc.features.some((f) => f.type === 'extrude' && f.thin))), JSON.stringify(r));
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('as2-arc-slot-extruded');
// Sensor PM: Volume sensor in the Sensors folder
await page.click('.k-cm-tab:has-text("Evaluate")');
await page.click('.k-cm-big:has-text("Sensor") .k-cm-main');
await page.waitForTimeout(200);
await page.locator('[data-testid="sensor-property"]').selectOption('volume');
await page.click('[data-testid="sensor-pm"] .k-pm-ok');
await page.waitForTimeout(300);
const sensors = await page.evaluate(() => (window.__phlippoStore.getState().doc.sensors ?? []).map((s) => s.kind ?? s.name));
check('Sensor PM adds a volume sensor', sensors.length === 1, JSON.stringify(sensors));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
