// Sheet metal commands that were "later": No Bends, Convert to Sheet Metal, Lofted-Bend, Closed / Welded Corner, Corner Relief.
import { chromium } from 'playwright';
import { exitCode, skip } from './lib/check.mjs';
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
const volume = () => page.evaluate(() => { let v = 0; for (const b of window.__phlippoStore.getState().rebuild.bodies) { const p = b.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 9) { const ax = p[i], ay = p[i + 1], az = p[i + 2], bx = p[i + 3], by = p[i + 4], bz = p[i + 5], cx = p[i + 6], cy = p[i + 7], cz = p[i + 8]; v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } } return Math.abs(v); });
const S = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return { names: s.doc.features.map((f) => f.name), errors: s.rebuild.errors, curves: (s.rebuild.curves ?? []).map((c) => c.name) }; });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');

// an L base flange (open line chain on the Front Plane)
await page.click('.k-tree-row:has-text("Front Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
await page.click('.k-cm-iconbtn[data-tip="Line (L)"]');
for (const [x, y] of [[0, 0], [40, 0], [40, 30]]) { const p = await P(x, y); await page.mouse.click(p.x, p.y); }
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-big:has-text("Base Flange/Tab") .k-cm-main');
await page.waitForTimeout(500);
await page.click('.k-pm-ok');
await page.waitForTimeout(800);

// No Bends: the flat state without bend lines; again: folded
await page.click('.k-cm-small:has-text("No Bends")');
await page.waitForTimeout(800);
let st = await S();
const flatOn = await page.evaluate(() => window.__phlippoStore.getState().doc.features.some((f) => f.type === 'flatPattern' && !f.suppressed && f.noBendLines));
check('No Bends shows the flat sheet without bend lines', flatOn && !st.curves.includes('Bend-Lines'), JSON.stringify(st.curves));
await page.screenshot({ path: `${OUT}/sm2-nobends.png` });
await page.click('.k-cm-small:has-text("No Bends")');
await page.waitForTimeout(800);
const flatOff = await page.evaluate(() => window.__phlippoStore.getState().doc.features.some((f) => f.type === 'flatPattern' && !f.suppressed));
check('No Bends again folds the sheet back', !flatOff);

// Closed Corner and Corner Relief PropertyManagers take their faces
await page.click('.k-cm-big:has-text("Corners") .k-cm-arrow').catch(skip('sheetmetal2:53'));
await page.evaluate(() => window.__phlippoStore.getState().startClosedCorner());
await page.waitForTimeout(200);
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const f = b.faces.filter((x) => !x.curved).sort((p, q) => p.area - q.area)[0]; s.setSelectedFace({ bodyId: b.id, faceId: f.id }); });
await page.waitForTimeout(200);
check('Closed Corner: the picked end face is listed', (await page.locator('[data-testid="cc-faces"] .k-selbox-row').count()) === 1);
await page.evaluate(() => window.__phlippoStore.getState().cancelFeature());
await page.evaluate(() => window.__phlippoStore.getState().startCornerRelief());
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const f = b.faces.find((x) => x.curved); if (f) s.setSelectedFace({ bodyId: b.id, faceId: f.id }); });
await page.waitForTimeout(200);
check('Corner Relief: the picked bend is listed', (await page.locator('[data-testid="cr-bends"] .k-selbox-row').count()) === 1);
await page.evaluate(() => window.__phlippoStore.getState().cancelFeature());

// a new part: Convert to Sheet Metal of a block
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s', 'Sketch1', 'top');
  const c = [[0, 0], [60, 0], [60, 40], [0, 40]];
  for (let i = 0; i < 4; i++) s = K.addLine(s, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  const d = { ...K.createDocument('Block'), sketches: { s }, features: [{ id: 'k', type: 'sketch', name: 'Sketch1', sketchId: 's', suppressed: false }, { id: 'e', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false }] };
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);
const vBlock = await volume();
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const f = b.faces.find((x) => !x.curved && x.normal[1] < -0.99); s.setSelectedFace({ bodyId: b.id, faceId: f.id }); });
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-small:has-text("Convert to Sheet Metal")');
await page.waitForTimeout(300);
check('Convert to Sheet Metal takes the selected face as fixed face', /fixed/.test((await page.locator('[data-testid="conv-fixed"]').textContent()) ?? ''));
await page.click('.k-pm-ok');
await page.waitForTimeout(1200);
st = await S();
const vConv = await volume();
check('Convert-Solid1 hollows the block into an open sheet tray', st.names.includes('Convert-Solid1') && !Object.keys(st.errors).length && vConv < vBlock * 0.4, JSON.stringify({ vBlock, vConv, e: st.errors }));
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(5, 900);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/sm2-convert.png` });

// Lofted-Bend between two parallel open lines
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const a = K.addLine(K.createSketch('a', 'Sketch1', 'top'), { x: 0, y: 0 }, { x: 40, y: 0 })[0];
  const b = K.addLine(K.createSketch('b', 'Sketch2', 'p2'), { x: 0, y: 10 }, { x: 40, y: 10 })[0];
  const d = { ...K.createDocument('Transition'), planes: { p2: { id: 'p2', name: 'Plane1', origin: [0, 30, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], kind: 'reference' } }, sketches: { a, b }, features: [{ id: 'ka', type: 'sketch', name: 'Sketch1', sketchId: 'a', suppressed: false }, { id: 'kb', type: 'sketch', name: 'Sketch2', sketchId: 'b', suppressed: false }] };
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-small:has-text("Lofted-Bend")');
await page.waitForTimeout(300);
await page.click('.k-pm-ok');
await page.waitForTimeout(1000);
st = await S();
check('Lofted-Bend1 builds a sheet between the two profiles', st.names.includes('Lofted-Bend1') && !Object.keys(st.errors).length && (await volume()) > 40 * 30 * 3 * 0.9, JSON.stringify({ v: await volume(), e: st.errors }));
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(5, 900);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/sm2-loftedbend.png` });

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
