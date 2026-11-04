// Magnified Selection: G shows the magnifying glass around the pointer (the graphics area enlarged 3x), a click in it
// selects the face under its centre, the wheel changes the enlargement, Esc closes it (the selection stays).
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
await waitSettled(page);
await page.keyboard.press('Control+7');
// the view turns with an animation: wait until the test point stands still on screen
const W = (x, y, z) => page.evaluate(([x, y, z]) => window.__phlippoProjectWorld(x, y, z), [x, y, z]);
for (let i = 0, prev = null; i < 40; i++) {
  await page.waitForTimeout(150);
  const now = await W(40, 30, 40);
  if (prev && Math.hypot(now.x - prev.x, now.y - prev.y) < 0.5) break;
  prev = now;
}
// the exact bodies of the B-rep kernel replace the mesh ones (other face ids): settle before asking what lies where
await waitSettled(page);

// the face the graphics area finds under a pixel
const faceUnder = (x, y) => page.evaluate(([x, y]) => {
  const r = document.querySelector('.k-viewport').getBoundingClientRect();
  const hit = window.__phlippoBodies.pick(window.__phlippoCamera.pixelToRay(x - r.left, y - r.top));
  return hit ? { bodyId: hit.bodyId, faceId: hit.faceId } : null;
}, [x, y]);
// the glass painted at this pointer position (software GL paints late: wait for the picture of this position)
const glassAt = (x, y) => page.waitForFunction(([x, y]) => {
  const c = document.querySelector('[data-testid="magnifier-canvas"]');
  const [ax, ay] = (c?.dataset.at ?? '').split(',').map(Number);
  return Math.abs(ax - x) <= 1 && Math.abs(ay - y) <= 1;
}, [x, y], { timeout: 10000 }).then(() => true, () => false);
// the pixels of the glass: painted share, shades, and the edges (neighbours that differ clearly; anti-aliasing and
// software GL soften a line, they do not remove the step between two faces)
const glassPixels = () => page.evaluate(() => {
  const c = document.querySelector('[data-testid="magnifier-canvas"]');
  const { width: w, height: h } = c;
  const d = c.getContext('2d').getImageData(0, 0, w, h).data;
  const r = w / 2 - 4;
  let painted = 0, inside = 0, edges = 0;
  const colors = new Set();
  const at = (x, y) => (y * w + x) * 4;
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
    if (Math.hypot(x - w / 2, y - h / 2) > r) continue;
    inside++;
    const i = at(x, y), j = at(x + 1, y), k = at(x, y + 1);
    if (d[i + 3] > 0) painted++;
    if ((x + y) % 4 === 0) colors.add(`${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`);
    const diff = (a, b) => Math.abs(d[a] - d[b]) + Math.abs(d[a + 1] - d[b + 1]) + Math.abs(d[a + 2] - d[b + 2]);
    if (Math.max(diff(i, j), diff(i, k)) > 45) edges++;
  }
  return { painted, inside, colors: colors.size, edges, w };
});

// the point on the top face (40, 30, 40): its pixel
const q = await W(40, 30, 40);
await page.mouse.move(q.x, q.y);
await page.waitForTimeout(100);
check('no magnifying glass before G', (await page.locator('[data-testid="magnifier"]').count()) === 0);
await page.keyboard.press('g');
await page.mouse.move(q.x + 1, q.y);
await page.mouse.move(q.x, q.y);
const painted0 = await glassAt(q.x, q.y);
const lens = await page.locator('[data-testid="magnifier"]').boundingBox();
check('G shows the magnifying glass centred on the pointer', !!lens && Math.abs(lens.x + lens.width / 2 - q.x) < 2 && Math.abs(lens.y + lens.height / 2 - q.y) < 2, JSON.stringify({ lens, q }));
const flat = await glassPixels();
check('the glass is painted at the pointer with the model under it', painted0 && flat.painted > flat.inside * 0.95 && flat.colors >= 2, JSON.stringify({ painted0, ...flat }));
await page.screenshot({ path: `${OUT}/magnify.png` });
check('enlargement 3x', (await page.locator('[data-testid="magnifier"]').getAttribute('data-zoom')) === '3');

// a click in the glass: the face under its centre, asked just before the click (after the rebuild has settled)
await waitSettled(page);
const under = await faceUnder(q.x, q.y);
check('a face lies under the centre of the glass', !!under, JSON.stringify(q));
await page.mouse.click(q.x, q.y);
await page.waitForFunction(() => !!window.__phlippoStore.getState().selectedFace, undefined, { timeout: 5000 }).catch(() => undefined);
const sel = await page.evaluate(() => window.__phlippoStore.getState().selectedFace);
check('a click in the glass selects the face under its centre', !!sel && !!under && sel.faceId === under.faceId && sel.bodyId === under.bodyId, JSON.stringify({ sel, under }));
check('the glass stays open after the click', (await page.locator('[data-testid="magnifier"]').count()) === 1);

await page.mouse.wheel(0, -100);
await page.waitForTimeout(200);
await page.mouse.move(q.x + 2, q.y);
const zoomed = await page.waitForFunction(() => Number((document.querySelector('[data-testid="magnifier-canvas"]')?.dataset.at ?? '').split(',')[2]) > 3, undefined, { timeout: 10000 }).then(() => true, () => false);
check('the wheel enlarges the glass, not the view', zoomed, await page.locator('[data-testid="magnifier-canvas"]').getAttribute('data-at'));

await page.keyboard.press('Escape');
await page.waitForTimeout(200);
const after = await page.evaluate(() => window.__phlippoStore.getState().selectedFace);
check('Esc closes the glass and keeps the selection', (await page.locator('[data-testid="magnifier"]').count()) === 0 && !!after && after.faceId === sel?.faceId);
await page.keyboard.press('g');
await page.waitForTimeout(150);
check('G opens it again', (await page.locator('[data-testid="magnifier"]').count()) === 1);
// over a corner of the block the glass shows the edges between the faces; on the flat face it showed (next to) none
const v = await W(80, 30, 80);
await page.mouse.move(v.x + 10, v.y + 6);
const painted1 = await glassAt(v.x + 10, v.y + 6);
await page.screenshot({ path: `${OUT}/magnify-corner.png` });
const corner = await glassPixels();
check('the edges of the corner show in the glass (far more edge pixels than on the flat face)', painted1 && corner.edges > 150 && corner.edges > 4 * flat.edges + 50, JSON.stringify({ painted1, corner: corner.edges, flat: flat.edges }));
await page.keyboard.press('g');
await page.waitForTimeout(150);
check('G closes it', (await page.locator('[data-testid="magnifier"]').count()) === 0);

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
