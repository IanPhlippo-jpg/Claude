// Sheet Metal ▸ Jog and Miter Flange through the ribbon: a 100 x 60 tab, a jog line on its bottom face, then a miter flange along two top edges.
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

// the tab and two sketches: a jog line on the top plane (bottom face, x = 50) and a miter profile on the right plane at the far edge
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Plaatwerk', 'part');
  let s1 = K.createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: -60 }, { x: 0, y: -60 }];
  for (let i = 0; i < 4; i++) s1 = K.addLine(s1, c[i], c[(i + 1) % 4])[0];
  let s2 = K.createSketch('sk2', 'Sketch2', 'top');
  s2 = K.addLine(s2, { x: 50, y: 5 }, { x: 50, y: -65 })[0];
  d.sketches.sk1 = s1;
  d.sketches.sk2 = s2;
  d.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
    { id: 'f2', type: 'baseFlange', name: 'Base-Flange1', sketchId: 'sk1', suppressed: false, depth: 10, midPlane: false, reverse: false, flipDir: false },
    { id: 'f3', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(700);
const B = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const g = s.rebuild.bodies[0]?.geometry; if (!g) return null; g.computeBoundingBox(); return { errors: s.rebuild.errors, min: g.boundingBox.min.toArray(), max: g.boundingBox.max.toArray(), feats: s.doc.features.map((f) => f.name) }; });

// ---- Jog: select Sketch2, Sheet Metal ▸ Jog, offset 12, OK
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.locator('.k-tree-row:has-text("Sketch2")').last().click();
await page.click('.k-cm-small:has-text("Jog")');
await page.waitForTimeout(300);
check('Jog Property Panel with the sketch', (await page.locator('.k-pm-title:has-text("Jog1")').count()) === 1 && (await page.locator('[data-testid="jog-sketch"]').inputValue()) === 'sk2');
await page.locator('.k-section:has-text("Jog Offset") input.k-num').first().fill('12');
await page.locator('.k-section:has-text("Jog Offset") input.k-num').first().press('Tab');
await page.waitForTimeout(300);
await shot('jm1-jog-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
let b = await B();
check('Jog1 built: half of the tab 12 mm lower', b && Object.keys(b.errors).length === 0 && Math.abs(b.min[1] + 12) < 0.05 && b.feats.includes('Jog1'), JSON.stringify(b));

// ---- Miter Flange: a profile sketch on the right plane (x = 0) at the near top edge (z = 60), then pick two top edges
const t = await page.evaluate(() => (window.__phlippoStore.getState().doc.sheetMetal ?? { thickness: 0 }).thickness || window.__phlippoStore.getState().rebuild.bodies[0].geometry.boundingBox.max.y);
await page.evaluate((t) => {
  const st = window.__phlippoStore.getState();
  const K = window.__phlippoKit;
  // right plane sketch coordinates: find them from the plane definition
  const P = K.REFERENCE_PLANE_DEFS.right;
  const toS = (w) => { const o = P.origin, u = P.u, v = P.v; const d = [w[0] - o[0], w[1] - o[1], w[2] - o[2]]; return { x: d[0] * u[0] + d[1] * u[1] + d[2] * u[2], y: d[0] * v[0] + d[1] * v[1] + d[2] * v[2] }; };
  let s3 = K.createSketch('sk3', 'Sketch3', 'right');
  s3 = K.addLine(s3, toS([0, t, 60]), toS([0, t + 20, 60]))[0];
  const d = { ...st.doc, sketches: { ...st.doc.sketches, sk3: s3 }, features: [...st.doc.features, { id: 'f9', type: 'sketch', name: 'Sketch3', sketchId: 'sk3', suppressed: false }] };
  st.openDocument(d);
}, t);
await page.waitForTimeout(700);
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.locator('.k-tree-row:has-text("Sketch3")').last().click();
await page.click('.k-cm-small:has-text("Miter Flange")');
await page.waitForTimeout(300);
check('Miter Flange Property Panel with the profile sketch', (await page.locator('[data-testid="miter-sketch"]').inputValue()) === 'sk3');
await page.keyboard.press('f');
await page.waitForTimeout(400);
// click the two top edges of the fixed half (x 50..100): along x at z = 60 and the end x = 100 along z
for (const w of [[75, t, 60], [100, t, 30]]) {
  const q = await page.evaluate((w) => window.__phlippoProjectWorld(w[0], w[1], w[2]), w);
  await page.mouse.click(q.x, q.y);
  await page.waitForTimeout(250);
}
const picked = await page.evaluate(() => window.__phlippoStore.getState().featureEdit?.draft?.edges?.length ?? 0);
check('two edges picked in the graphics area', picked === 2, String(picked));
await shot('jm2-miter-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
b = await B();
check('Miter Flange1 built: a 20 mm wall on the top of the sheet', b && Object.keys(b.errors).length === 0 && Math.abs(b.max[1] - (t + 20)) < 0.1 && b.feats.includes('Miter Flange1'), JSON.stringify(b));
await page.mouse.move(5, 600);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);
await shot('jm3-result');

// ---- Sketched Bend: a new tab, a line across it, bend 90 degrees through the ribbon
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Buiging', 'part');
  let s1 = K.createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: -60 }, { x: 0, y: -60 }];
  for (let i = 0; i < 4; i++) s1 = K.addLine(s1, c[i], c[(i + 1) % 4])[0];
  let s2 = K.createSketch('sk2', 'Sketch2', 'top');
  s2 = K.addLine(s2, { x: 60, y: 5 }, { x: 60, y: -65 })[0];
  d.sketches = { sk1: s1, sk2: s2 };
  d.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
    { id: 'f2', type: 'baseFlange', name: 'Base-Flange1', sketchId: 'sk1', suppressed: false, depth: 10, midPlane: false, reverse: false, flipDir: false },
    { id: 'f3', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(700);
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.locator('.k-tree-row:has-text("Sketch2")').last().click();
await page.click('.k-cm-small:has-text("Sketched Bend")');
await page.waitForTimeout(300);
check('Sketched Bend Property Panel (SketchBend1, 90.00deg)', (await page.locator('.k-pm-title:has-text("SketchBend1")').count()) === 1 && (await page.locator('.k-section:has-text("Bend Parameters") input.k-num').first().inputValue()) === '90.00deg');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
b = await B();
check('SketchBend1 built: the 40 mm side hangs 90 degrees down', b && Object.keys(b.errors).length === 0 && b.min[1] < -35 && b.feats.includes('SketchBend1'), JSON.stringify(b));
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('jm4-sketched-bend');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
