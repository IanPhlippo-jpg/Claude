// Drag Handles: the end face of an extrusion gets a drag arrow; dragging it changes the depth (ruler readout).
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
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[0, 0], [80, 0], [80, -60], [0, -60]];
  let first = null, prev = null;
  for (let i = 0; i < 4; i++) {
    const p = prev ?? { x: c[i][0], y: c[i][1] };
    const q = i < 3 ? { x: c[i + 1][0], y: c[i + 1][1] } : first;
    const [n, l] = K.addLine(s, p, q);
    s = n; if (!first) first = l.p1; prev = l.p2;
  }
  const d = { ...K.createDocument('Plaat'), sketches: { s1: s } };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.waitForTimeout(400);
// select the top face (normal +Y at y = 10)
await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const f = b.faces.find((x) => x.normal[1] > 0.99 && Math.abs(x.centroid[1] - 10) < 1e-6);
  window.__phlippoStore.setState({ selectedFace: { bodyId: b.id, faceId: f.id } });
});
await page.waitForTimeout(300);
check('Drag Handles: the selected end face shows the drag arrow', (await page.locator('[data-testid="dragHandles-grip"]').count()) === 1);
const grip = await page.locator('[data-testid="dragHandles-grip"]').boundingBox();
// pixels per mm along +Y from the projection
const pxmm = await page.evaluate(() => { const a = window.__phlippoProjectWorld(40, 10, 30), b = window.__phlippoProjectWorld(40, 20, 30); return { dx: (b.x - a.x) / 10, dy: (b.y - a.y) / 10 }; });
const gx = grip.x + grip.width / 2, gy = grip.y + grip.height / 2;
await page.mouse.move(gx, gy);
await page.mouse.down();
await page.mouse.move(gx + pxmm.dx * 5, gy + pxmm.dy * 5, { steps: 5 });
await page.mouse.move(gx + pxmm.dx * 10, gy + pxmm.dy * 10, { steps: 5 });
const readout = await page.locator('[data-testid="dragHandles-value"]').textContent();
await page.mouse.move(5, 900, { steps: 1 });
await page.mouse.move(gx + pxmm.dx * 10, gy + pxmm.dy * 10);
await shot('i3-drag');
await page.mouse.up();
await page.waitForTimeout(600);
const depth = await page.evaluate(() => window.__phlippoStore.getState().doc.features.find((f) => f.id === 'f1').depth);
check('dragging 10 mm upward makes the extrusion 20 mm deep (readout 20.00mm)', Math.abs(depth - 20) <= 0.5 && /20\.00mm|19\.50mm|20\.50mm/.test(readout), `${depth} ${readout}`);
await page.keyboard.press('Control+z');
await page.waitForTimeout(400);
const back = await page.evaluate(() => window.__phlippoStore.getState().doc.features.find((f) => f.id === 'f1').depth);
check('Undo restores the depth', back === 10, String(back));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
