// Extrude ▸ Up To Body: a block is edited to run up to a cylinder body (picked in the graphics area); its end follows the curved face.
import { chromium } from 'playwright';
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

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('UpToBody', 'part');
  let s1 = K.createSketch('sk1', 'Sketch1', 'front');
  s1 = K.addCircle(s1, { x: 40, y: 60 }, 10)[0];
  let s2 = K.createSketch('sk2', 'Sketch2', 'top');
  const c = [{ x: 32, y: -32 }, { x: 48, y: -32 }, { x: 48, y: -48 }, { x: 32, y: -48 }];
  for (let i = 0; i < 4; i++) s2 = K.addLine(s2, c[i], c[(i + 1) % 4])[0];
  d.sketches.sk1 = s1;
  d.sketches.sk2 = s2;
  d.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
    { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'midPlane', depth: 200, reverse: false },
    { id: 'f3', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false },
    { id: 'f4', type: 'extrude', name: 'Boss-Extrude2', sketchId: 'sk2', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false, merge: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);
const V = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return { errors: s.rebuild.errors, vols: s.rebuild.bodies.map((b) => { const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry; const a = g.getAttribute('position'); let v = 0; for (let i = 0; i < a.count; i += 3) { const x0 = a.getX(i), y0 = a.getY(i), z0 = a.getZ(i), x1 = a.getX(i + 1), y1 = a.getY(i + 1), z1 = a.getZ(i + 1), x2 = a.getX(i + 2), y2 = a.getY(i + 2), z2 = a.getZ(i + 2); v += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6; } return v; }) }; });
let v = await V();
check('start: cylinder and a separate 20 mm block', v.vols.length === 2 && Object.keys(v.errors).length === 0, JSON.stringify(v));
await page.locator('.k-tree-row:has-text("Boss-Extrude2")').last().dblclick();
await page.waitForTimeout(400);
await page.locator('.k-section:has-text("Direction 1") select.k-input').first().selectOption('upToBody');
await page.waitForTimeout(200);
check('Up To Body selection box', (await page.locator('[data-testid="up-to-body"]').count()) === 1);
await page.keyboard.press('f');
await page.waitForTimeout(400);
const q = await page.evaluate(() => window.__phlippoProjectWorld(40, 70, -70));
await page.mouse.click(q.x, q.y);
await page.waitForTimeout(500);
const label = await page.locator('[data-testid="up-to-body"]').innerText();
check('clicking the cylinder picks its body', label.includes('Boss-Extrude1'), label);
await shot('utb1-preview');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
v = await V();
const blk = v.vols.find((x) => x < 30000);
const expected = 16 * (960 - 2 * (24 + 50 * Math.asin(0.8)));
check('the block ends on the cylinder: volume of the block under the curve', Object.keys(v.errors).length === 0 && blk && Math.abs(blk - expected) / expected < 0.02, JSON.stringify({ v, expected }));
await page.mouse.move(5, 600);
await shot('utb2-result');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
