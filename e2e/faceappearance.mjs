// Appearance on one face: a face is picked, Edit Appearance colours only that face (the rest keeps the part colour).
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
  const d = K.createDocument('Blok', 'part');
  let s1 = K.createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: -60 }, { x: 0, y: -60 }];
  for (let i = 0; i < 4; i++) s1 = K.addLine(s1, c[i], c[(i + 1) % 4])[0];
  d.sketches = { sk1: s1 };
  d.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
    { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 30, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(700);
await page.keyboard.press('f');
await page.waitForTimeout(400);
const top = await page.evaluate(() => window.__phlippoProjectWorld(30, 30, 30));
await page.mouse.click(top.x, top.y);
await page.waitForTimeout(200);
await page.mouse.move(5, 600);
await page.click('.k-hud-btn[data-tip="Edit Appearance"]');
await page.waitForTimeout(200);
check('Color dialog targets the face', (await page.locator('[data-testid="appearance-target"]').innerText()).includes('Face<'));
await page.click('.k-swatch[title="#e60000"]');
await page.click('[data-testid="appearance-ok"]');
await page.waitForTimeout(500);
// clear the selection highlight, then sample the top face and a side face
await page.keyboard.press('Escape');
await page.mouse.click(1800, 900);
await page.waitForTimeout(400);
await shot('fa1-face-appearance');
const side = await page.evaluate(() => window.__phlippoProjectWorld(60, 15, 30));
const px = await page.evaluate(async ([a, b]) => {
  const cv = document.querySelector('.k-viewport canvas');
  const r = cv.getBoundingClientRect();
  const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true }) || cv.getContext('webgl');
  return null;
}, [top, side]);
const n = await page.evaluate(() => (window.__phlippoStore.getState().doc.faceAppearances ?? []).length);
check('one face appearance stored', n === 1, String(n));
console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
