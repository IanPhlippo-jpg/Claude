// Hole Tool ▸ Thread: an M14x2.0 cut thread on a Ø14 bolt shank.
import { chromium } from 'playwright';
import { exitCode, waitSettled } from './lib/check.mjs';
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
const volume = async () => { await waitSettled(page); return page.evaluate(() => { let v = 0; for (const b of window.__phlippoStore.getState().rebuild.bodies) { const p = b.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 9) { const ax = p[i], ay = p[i + 1], az = p[i + 2], bx = p[i + 3], by = p[i + 4], bz = p[i + 5], cx = p[i + 6], cy = p[i + 7], cz = p[i + 8]; v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } } return Math.abs(v); }); };

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
// socket head cap screw: head Ø21 x 14 on the Top Plane, shank Ø14 x 40 below it
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const s1 = K.addCircle(K.createSketch('s1', 'Sketch1', 'top'), { x: 0, y: 0 }, 7)[0];
  const s2 = K.addCircle(K.createSketch('s2', 'Sketch2', 'top'), { x: 0, y: 0 }, 10.5)[0];
  const d = { ...K.createDocument('Bout M14'), sketches: { s1, s2 } };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 40, reverse: true },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false },
    { id: 'f2', type: 'extrude', name: 'Boss-Extrude2', sketchId: 's2', suppressed: false, op: 'boss', end: 'blind', depth: 14, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);
const v0 = await volume();
// the circular edge at the end of the shank (y = -40)
await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const e = b.edges.find((x) => x.closed && !x.straight && Math.abs(x.centroid.y + 40) < 0.01);
  window.__phlippoStore.setState({ selectedEdges: [e.id] });
  s.startThread();
});
await page.waitForTimeout(300);
const pm = await page.evaluate(() => { const d = window.__phlippoStore.getState().featureEdit?.draft; return d && { size: d.size, internal: d.edge?.internal, label: d.edge?.label, name: d.name }; });
check('Thread PM takes the shank edge and proposes M14x2.0 (Metric Die)', pm && pm.size === 'M14x2.0' && pm.internal === false && /Edge</.test(pm.label), JSON.stringify(pm));
await page.locator('.k-pm-host input.k-num').nth(1).fill('30');
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
await page.mouse.move(5, 900);
await shot('th1-thread-pm');
await page.locator('.k-pm-host .k-pm-ok').click({ timeout: 5000 }).catch(async () => { await page.evaluate(() => window.__phlippoStore.getState().commitFeature()); });
await page.waitForTimeout(1500);
const v1 = await volume();
const st = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { names: s.doc.features.map((f) => f.name), errors: s.rebuild.errors }; });
const h = 0.6134 * 2;
const expected = h * h * Math.tan(Math.PI / 6) * 2 * Math.PI * (7 - h / 3) * 15;
check('M14x2.0 Thread1 cuts the helical groove over 30 mm', st.names.includes('M14x2.0 Thread1') && Object.keys(st.errors).length === 0 && Math.abs(v0 - v1 - expected) / expected < 0.15, `${(v0 - v1).toFixed(0)} vs ${expected.toFixed(0)} ${JSON.stringify(st)}`);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(5, 900);
await page.waitForTimeout(500);
await shot('th2-thread');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
