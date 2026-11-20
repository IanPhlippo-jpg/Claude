// Sheet Metal ▸ Jog Property Manager as SW 2025: the Fixed Face picked in the graphics area, Jog Offset Up To Surface on a
// face of a second body, Use default radius greys the radius out. A 100 x 60 tab (t 3), a jog line at x = 50, a block
// beside it whose top face lies 15 below the sketch face of the tab.
import { chromium } from 'playwright';
import { exitCode, waitSettled } from './lib/check.mjs';
import { mkdirSync } from 'node:fs';
import { settle } from './lib/wait.mjs';

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
const clickWorld = async (w) => {
  const q = await page.evaluate((w) => window.__phlippoProjectWorld(w[0], w[1], w[2]), w);
  await page.mouse.click(q.x, q.y);
  await settle(page);
};

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await settle(page);
await page.click('.k-doctype:has-text("Part")');

await page.evaluate(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('JogPM', 'part');
  let s1 = K.createSketch('sk1', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: -60 }, { x: 0, y: -60 }];
  for (let i = 0; i < 4; i++) s1 = K.addLine(s1, c[i], c[(i + 1) % 4])[0];
  const s2 = K.addLine(K.createSketch('sk2', 'Sketch2', 'top'), { x: 50, y: 5 }, { x: 50, y: -65 })[0];
  // the block: a rectangle on the front plane (x 120..150, y -30..-15), extruded 60 along z
  const P = K.REFERENCE_PLANE_DEFS.front;
  const toS = (w) => { const o = P.origin, u = P.u, v = P.v; const q = [w[0] - o[0], w[1] - o[1], w[2] - o[2]]; return { x: q[0] * u[0] + q[1] * u[1] + q[2] * u[2], y: q[0] * v[0] + q[1] * v[1] + q[2] * v[2] }; };
  let s3 = K.createSketch('sk3', 'Sketch3', 'front');
  const b = [[120, -30], [150, -30], [150, -15], [120, -15]].map(([x, y]) => toS([x, y, 0]));
  for (let i = 0; i < 4; i++) s3 = K.addLine(s3, b[i], b[(i + 1) % 4])[0];
  d.sketches = { sk1: s1, sk2: s2, sk3: s3 };
  d.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
    { id: 'f2', type: 'baseFlange', name: 'Base-Flange1', sketchId: 'sk1', suppressed: false, depth: 10, midPlane: false, reverse: false, flipDir: false },
    { id: 'f3', type: 'sketch', name: 'Sketch3', sketchId: 'sk3', suppressed: false },
    { id: 'f4', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk3', suppressed: false, op: 'boss', end: 'blind', depth: 60, reverse: false },
    { id: 'f5', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await waitSettled(page);
const info = () => page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  // the sheet: the body left of x = 110; z range of its vertices below the sketch face and on the fixed side
  const sheet = s.rebuild.bodies.find((b) => { b.geometry.computeBoundingBox(); return b.geometry.boundingBox.max.x < 110; });
  if (!sheet) return { errors: s.rebuild.errors, bodies: s.rebuild.bodies.length };
  const pos = sheet.geometry.getAttribute('position');
  let minY = Infinity, leftMaxY = -Infinity, rightMinY = Infinity;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    minY = Math.min(minY, y);
    if (x < 40) leftMaxY = Math.max(leftMaxY, y);
    if (x > 60) rightMinY = Math.min(rightMinY, y);
  }
  return { errors: s.rebuild.errors, bodies: s.rebuild.bodies.length, minY, leftMaxY, rightMinY, feats: s.doc.features.map((f) => f.name), jog: s.doc.features.find((f) => f.type === 'jog') };
});
let r = await info();
check('the tab and the block built (two bodies)', r.bodies === 2 && Object.keys(r.errors).length === 0, JSON.stringify(r));

// ---- Jog: select Sketch2, Sheet Metal ▸ Jog; the Fixed Face box is active first
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.locator('.k-tree-row:has-text("Sketch2")').last().click();
await page.click('.k-cm-small:has-text("Jog")');
await settle(page);
await page.keyboard.press('f');
await settle(page);
check('Jog Property Panel, the Fixed Face box active', (await page.locator('.k-pm-title:has-text("Jog1")').count()) === 1 && (await page.evaluate(() => window.__phlippoStore.getState().flangePick)) === 'fixedFace');
// Use default radius (checked) greys the radius field out
check('Use default radius greys the radius out', await page.locator('[data-testid="jog-radius"] input').first().isDisabled());
// the fixed face: the top face of the tab on the side x > 50
await clickWorld([80, 3, 30]);
const ff = await page.evaluate(() => window.__phlippoStore.getState().featureEdit?.draft?.fixedFace);
check('Fixed Face picked on the x > 50 side', ff && ff.point[0] > 50 && Math.abs(ff.normal[1]) > 0.99 && /Face<\d+>/.test(ff.label), JSON.stringify(ff));
check('the Fixed Face box shows the face', (await page.locator('[data-testid="jog-fixedface"]').innerText()).includes(ff?.label ?? '?'));

// ---- Jog Offset ▸ Up To Surface, then the top face of the block (y = -15)
await page.locator('[data-testid="jog-end"]').selectOption('upToSurface');
await settle(page);
check('Up To Surface makes the face box active', (await page.evaluate(() => window.__phlippoStore.getState().flangePick)) === 'surface');
await clickWorld([135, -15, 30]);
const sf = await page.evaluate(() => window.__phlippoStore.getState().featureEdit?.draft?.surface);
check('the face for Up To Surface picked (top face of the block)', sf && Math.abs(sf.point[1] + 15) < 1e-3 && sf.normal[1] > 0.99, JSON.stringify(sf));
await shot('jp1-jog-pm-up-to-surface');
await page.click('.k-pm-ok');
await waitSettled(page);
r = await info();
// outside offset: the far face of the moved part (x < 50) ends at the face of the block; the side x > 50 stays
check('Jog1 built Up To Surface: the moved side ends at y = -15', Object.keys(r.errors).length === 0 && r.feats.includes('Jog1') && Math.abs(r.minY + 15) < 0.05 && r.leftMaxY < -11.9, JSON.stringify({ ...r, jog: undefined }));
check('the fixed face side (x > 50) stayed in place', Math.abs(r.rightMinY) < 1e-3, String(r.rightMinY));
check('the jog stored Up To Surface and the fixed face', r.jog?.offsetEnd === 'upToSurface' && !!r.jog?.surface && !!r.jog?.fixedFace, JSON.stringify(r.jog));
await page.mouse.move(5, 600);
await page.keyboard.press('Escape');
await page.keyboard.press('f');
await settle(page);
await shot('jp2-jog-result');

console.log(`
${results.filter((x) => x.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const x of results.filter((x) => !x.ok)) console.log(' - ' + x.name + (x.info ? ' (' + x.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
