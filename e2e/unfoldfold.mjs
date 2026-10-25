// Sheet Metal ▸ Unfold → Extruded Cut across the bend → Fold, and Flatten showing the cut (as the original).
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
const state = () => page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  let v = 0;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const b of s.rebuild.bodies) {
    const p = b.geometry.attributes.position.array;
    for (let i = 0; i < p.length; i += 9) { const ax = p[i], ay = p[i + 1], az = p[i + 2], bx = p[i + 3], by = p[i + 4], bz = p[i + 5], cx = p[i + 6], cy = p[i + 7], cz = p[i + 8]; v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; }
    for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], p[i + k]); max[k] = Math.max(max[k], p[i + k]); }
  }
  return { v: Math.abs(v), size: max.map((x, k) => x - min[k]), errors: s.rebuild.errors, names: s.doc.features.map((f) => f.name) };
});

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');

// L bracket: base flange 60 deep from (0,0)-(40,0)-(40,30) on the Front plane (t = 3, R = 3, K = 0.5)
const build = (withFold) => page.evaluate((withFold) => {
  const K = window.__phlippoKit;
  let s1 = K.createSketch('s1', 'Sketch1', 'front');
  const [a, l1] = K.addLine(s1, { x: 0, y: 0 }, { x: 40, y: 0 });
  s1 = K.addLine(a, l1.p2, { x: 40, y: 30 })[0];
  // the slot across the bend, sketched on the Top Plane while the sheet is flat (x 30..50, z 25..35)
  let s2 = K.createSketch('s2', 'Sketch2', 'top');
  const c = [[30, -25], [50, -25], [50, -35], [30, -35]];
  let first = null, prev = null;
  for (let i = 0; i < 4; i++) {
    const p = prev ?? { x: c[i][0], y: c[i][1] };
    const q = i < 3 ? { x: c[i + 1][0], y: c[i + 1][1] } : first;
    const [n, l] = K.addLine(s2, p, q);
    s2 = n; if (!first) first = l.p1; prev = l.p2;
  }
  const d = { ...K.createDocument('Beugel'), sketches: { s1, s2 }, sheetMetal: { thickness: 3, bendRadius: 3, kFactor: 0.5 } };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'f1', type: 'baseFlange', name: 'Base-Flange1', sketchId: 's1', suppressed: false, depth: 60, midPlane: false, reverse: false, flipDir: false },
    { id: 'f2', type: 'unfold', name: 'Unfold1', suppressed: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false },
    { id: 'f3', type: 'extrude', name: 'Cut-Extrude1', sketchId: 's2', suppressed: false, op: 'cut', end: 'throughAll', depth: 10, reverse: false },
    ...(withFold ? [{ id: 'f4', type: 'fold', name: 'Fold1', suppressed: false }] : []),
    { id: 'fp', type: 'flatPattern', name: 'Flat-Pattern1', suppressed: true },
  ];
  window.__phlippoStore.getState().openDocument(d);
}, withFold);

await build(false);
await page.waitForTimeout(800);
let s = await state();
const L = 34 + 24 + (Math.PI / 2) * 4.5; // straight 40-6, 30-6, bend allowance 90° at R 3 + 0.5·3
check('Unfold1: the sheet lies flat (developed length, 3 mm thick)', Object.keys(s.errors).length === 0 && Math.abs(s.size[0] - L) < 0.3 && Math.abs(s.size[1] - 3) < 0.01, JSON.stringify(s));
const vFlatCut = s.v;
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(5, 900);
await page.waitForTimeout(400);
await shot('uf1-unfolded-cut');

await build(true);
await page.waitForTimeout(800);
s = await state();
const vFull = (34 + 24) * 3 * 60 + (Math.PI / 4) * (36 - 9) * 60;
check('Fold1: bent back with the slot across the bend (600 mm³ removed)', Object.keys(s.errors).length === 0 && Math.abs(s.size[1] - 30) < 0.5 && Math.abs(vFull - s.v - 600) < 25 && Math.abs(vFlatCut - s.v) < 25, `${(vFull - s.v).toFixed(1)} ${JSON.stringify(s)}`);
await page.keyboard.press('f');
await page.mouse.move(5, 900);
await page.waitForTimeout(400);
await shot('uf2-folded');

// Flatten shows the slot in the flat pattern
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-small:has-text("Flatten")');
await page.waitForTimeout(800);
s = await state();
const bendLines = await page.evaluate(() => (window.__phlippoStore.getState().rebuild.curves ?? []).filter((c) => c.name === 'Bend-Lines').length);
check('Flatten shows the bend line', bendLines === 1, String(bendLines));
check('Flatten: the flat pattern carries the slot', Object.keys(s.errors).length === 0 && Math.abs(s.size[1] - 3) < 0.01 && Math.abs(vFull - s.v - 600) < 25, JSON.stringify(s));
await page.keyboard.press('f');
await page.mouse.move(5, 900);
await page.waitForTimeout(400);
await shot('uf3-flat-pattern');
await page.click('.k-cm-small:has-text("Flatten")');

// the Unfold command from the ribbon: Property Panel with the fixed face and the bends
await page.click('.k-cm-small:has-text("Unfold")');
await page.waitForTimeout(300);
check('Unfold PM lists the bend of the base flange', (await page.locator('[data-testid="unfold-bends"] .k-selbox-row').count()) === 1);
await page.click('.k-pm-cancel');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
