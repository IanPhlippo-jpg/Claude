// Magnified Selection: G shows the magnifying glass around the pointer (the graphics area enlarged 3x), a click in it
// selects the face under its centre, the wheel changes the enlargement, Esc closes it (the selection stays).
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

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);
// a block 80 x 80 x 30
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[0, 0], [80, 0], [80, -80], [0, -80]];
  let first = null, prev = null;
  for (let i = 0; i < 4; i++) {
    const p = prev ?? { x: c[i][0], y: c[i][1] };
    const q = i < 3 ? { x: c[i + 1][0], y: c[i + 1][1] } : first;
    const [n, l] = K.addLine(s, p, q);
    s = n; if (!first) first = l.p1; prev = l.p2;
  }
  const d = { ...K.createDocument('Part1'), sketches: { s1: s } };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 30, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(1200);
await page.keyboard.press('Control+7');
await page.waitForTimeout(600);

// the point on the top face (40, 30, 40): its pixel, and the face the graphics area finds there
const q = await page.evaluate(() => window.__phlippoProjectWorld(40, 30, 40));
const under = await page.evaluate(([x, y]) => {
  const r = document.querySelector('.k-viewport').getBoundingClientRect();
  const hit = window.__phlippoBodies.pick(window.__phlippoCamera.pixelToRay(x - r.left, y - r.top));
  return hit ? { bodyId: hit.bodyId, faceId: hit.faceId } : null;
}, [q.x, q.y]);
check('a face lies under the test point', !!under, JSON.stringify(q));
await page.mouse.move(q.x, q.y);
await page.waitForTimeout(100);
check('no magnifying glass before G', (await page.locator('[data-testid="magnifier"]').count()) === 0);
await page.keyboard.press('g');
await page.mouse.move(q.x + 1, q.y);
await page.mouse.move(q.x, q.y);
await page.waitForTimeout(400);
const lens = await page.locator('[data-testid="magnifier"]').boundingBox();
check('G shows the magnifying glass centred on the pointer', !!lens && Math.abs(lens.x + lens.width / 2 - q.x) < 2 && Math.abs(lens.y + lens.height / 2 - q.y) < 2, JSON.stringify({ lens, q }));
const pixels = await page.evaluate(() => {
  const c = document.querySelector('[data-testid="magnifier-canvas"]');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let painted = 0;
  const colors = new Set();
  for (let i = 0; i < d.length; i += 16) { if (d[i + 3] > 0) painted++; colors.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`); }
  return { painted, total: d.length / 16, colors: colors.size, w: c.width };
});
check('the glass shows the enlarged model (painted, several shades)', pixels.painted > pixels.total * 0.9 && pixels.colors >= 2, JSON.stringify(pixels));
await page.screenshot({ path: `${OUT}/magnify.png` });
check('enlargement 3x', (await page.locator('[data-testid="magnifier"]').getAttribute('data-zoom')) === '3');

await page.mouse.click(q.x, q.y);
await page.waitForTimeout(300);
const sel = await page.evaluate(() => window.__phlippoStore.getState().selectedFace);
check('a click in the glass selects the face under its centre', !!sel && !!under && sel.faceId === under.faceId && sel.bodyId === under.bodyId, JSON.stringify({ sel, under }));
check('the glass stays open after the click', (await page.locator('[data-testid="magnifier"]').count()) === 1);

await page.mouse.wheel(0, -100);
await page.waitForTimeout(200);
const z = Number(await page.locator('[data-testid="magnifier"]').getAttribute('data-zoom'));
await page.mouse.move(q.x + 2, q.y);
await page.waitForTimeout(150);
const z2 = Number(await page.locator('[data-testid="magnifier"]').getAttribute('data-zoom'));
check('the wheel enlarges the glass, not the view', (z > 3 || z2 > 3), JSON.stringify({ z, z2 }));

await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const after = await page.evaluate(() => window.__phlippoStore.getState().selectedFace);
check('Esc closes the glass and keeps the selection', (await page.locator('[data-testid="magnifier"]').count()) === 0 && !!after && after.faceId === sel?.faceId);
await page.keyboard.press('g');
await page.waitForTimeout(150);
check('G opens it again', (await page.locator('[data-testid="magnifier"]').count()) === 1);
// over a corner of the block: the edges show in the glass, three times as far apart from its centre as on screen
const v = await page.evaluate(() => window.__phlippoProjectWorld(80, 30, 80));
await page.mouse.move(v.x + 10, v.y + 6);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/magnify-corner.png` });
const dark = await page.evaluate(() => {
  const c = document.querySelector('[data-testid="magnifier-canvas"]');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 200) n++;
  return n;
});
check('the edges of the corner show in the glass', dark > 50, String(dark));
await page.keyboard.press('g');
await page.waitForTimeout(150);
check('G closes it', (await page.locator('[data-testid="magnifier"]').count()) === 0);

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
