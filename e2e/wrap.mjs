// Features ▸ Wrap: a 10 x 10 patch on the Front Plane wrapped onto a Ø40 cylinder (Emboss, Deboss, Scribe).
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
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const volume = async () => { await waitSettled(page); return page.evaluate(() => { let v = 0; for (const b of window.__phlippoStore.getState().rebuild.bodies) { const p = b.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 9) { const ax = p[i], ay = p[i + 1], az = p[i + 2], bx = p[i + 3], by = p[i + 4], bz = p[i + 5], cx = p[i + 6], cy = p[i + 7], cz = p[i + 8]; v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } } return Math.abs(v); }); };

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const s1 = K.addCircle(K.createSketch('s1', 'Sketch1', 'top'), { x: 0, y: 0 }, 20)[0];
  let s2 = K.createSketch('s2', 'Sketch2', 'front');
  const c = [[-5, 25], [5, 25], [5, 35], [-5, 35]];
  let first = null, prev = null;
  for (let i = 0; i < 4; i++) {
    const p = prev ?? { x: c[i][0], y: c[i][1] };
    const q = i < 3 ? { x: c[i + 1][0], y: c[i + 1][1] } : first;
    const [n, l] = K.addLine(s2, p, q);
    s2 = n; if (!first) first = l.p1; prev = l.p2;
  }
  const d = { ...K.createDocument('Rol'), sketches: { s1, s2 } };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 60, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);
const v0 = await volume();
// pick the cylindrical face, then Wrap
await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const f = b.faces.filter((x) => x.curved).sort((p, q) => q.area - p.area)[0];
  window.__phlippoStore.setState({ selectedFace: { bodyId: b.id, faceId: f.id } });
});
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-small:has-text("Wrap")');
await page.waitForTimeout(300);
check('Wrap PM: Wrap Type, Wrap Method, the cylindrical face and Sketch2', /Face<\d+>/.test(await page.locator('[data-testid="wrap-face"]').innerText()) && (await page.locator('.k-section:has-text("Wrap Method")').count()) === 1 && (await page.locator('[data-testid="wrap-sketch"]').inputValue()) === 's2');
await page.locator('.k-pm-host input.k-num').first().fill('2');
await page.keyboard.press('Tab');
await page.waitForTimeout(200);
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const v1 = await volume();
const add = (10 / 20) * ((22 * 22 - 20 * 20) / 2) * 10;
let st = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { names: s.doc.features.map((f) => f.name), errors: s.rebuild.errors }; });
check('Wrap1 (Emboss 2 mm) adds the wrapped patch', st.names.includes('Wrap1') && Object.keys(st.errors).length === 0 && Math.abs(v1 - v0 - add) / add < 0.06, `${(v1 - v0).toFixed(0)} vs ${add.toFixed(0)} ${JSON.stringify(st)}`);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(5, 900);
await page.waitForTimeout(400);
await shot('wr1-emboss');
// Deboss: edit the feature
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const f = s.doc.features.find((x) => x.name === 'Wrap1'); s.editFeature(f.id); });
await page.waitForTimeout(300);
await page.click('[data-testid="wrap-deboss"]');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const v2 = await volume();
const cut = (10 / 20) * ((20 * 20 - 18 * 18) / 2) * 10;
check('Deboss cuts the patch into the cylinder', Math.abs(v0 - v2 - cut) / cut < 0.06, `${(v0 - v2).toFixed(0)} vs ${cut.toFixed(0)}`);
await page.mouse.move(5, 900);
await page.waitForTimeout(300);
await shot('wr2-deboss');
// Scribe: split lines only
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const f = s.doc.features.find((x) => x.name === 'Wrap1'); s.editFeature(f.id); });
await page.waitForTimeout(300);
await page.click('[data-testid="wrap-scribe"]');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const split = await page.evaluate(() => (window.__phlippoStore.getState().rebuild.curves ?? []).filter((c) => c.name === 'Split Line').length);
check('Scribe draws the split line and keeps the volume', split === 1 && Math.abs((await volume()) - v0) < 1, String(split));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
