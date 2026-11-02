// Sketch Driven Pattern from the Linear Pattern flyout: a hole repeated at the points of a reference sketch.
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
  const d = K.createDocument('Gatenplaat', 'part');
  let s1 = K.createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 80, y: -80 }, { x: 0, y: -80 }];
  for (let i = 0; i < 4; i++) s1 = K.addLine(s1, c[i], c[(i + 1) % 4])[0];
  let s2 = K.createSketch('sk2', 'Sketch2', 'top');
  s2 = K.addCircle(s2, { x: 20, y: -20 }, 5)[0];
  let s3 = K.createSketch('sk3', 'Sketch3', 'top');
  for (const p of [{ x: 20, y: -20 }, { x: 60, y: -20 }, { x: 20, y: -60 }, { x: 60, y: -60 }]) s3 = K.addPoint(s3, p)[0];
  d.sketches = { sk1: s1, sk2: s2, sk3: s3 };
  d.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
    { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'f3', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false },
    { id: 'f4', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 10, reverse: false },
    { id: 'f5', type: 'sketch', name: 'Sketch3', sketchId: 'sk3', suppressed: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(700);
await page.locator('.k-tree-row:has-text("Cut-Extrude1")').last().click();
await page.locator('.k-cm-big:has-text("Linear Pattern") .k-cm-arrow').first().click();
await page.click('.k-menu-item:has-text("Sketch Driven Pattern")');
await page.waitForTimeout(300);
check('Sketch Driven Pattern Property Panel with the seed', (await page.locator('.k-pm-title:has-text("Sketch Driven Pattern")').count()) === 1 && (await page.locator('.k-section:has-text("Features and Faces")').innerText()).includes('Cut-Extrude1'));
await page.locator('[data-testid="skpattern-sketch"]').selectOption('sk3');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const r = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { errors: s.rebuild.errors, feats: s.doc.features.map((f) => f.name) }; });
check('Sketch-Pattern1 built without errors', Object.keys(r.errors).length === 0 && r.feats.includes('Sketch-Pattern1'), JSON.stringify(r));
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('sp1-sketch-pattern');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
