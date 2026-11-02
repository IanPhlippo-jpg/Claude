// Sheet Metal ▸ Cross-Break and Corners ▸ Break-Corner on an L-shaped base flange.
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
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const volume = async () => { await waitSettled(page); return page.evaluate(() => { let v = 0; for (const b of window.__phlippoStore.getState().rebuild.bodies) { const p = b.geometry.attributes.position.array; for (let i = 0; i < p.length; i += 9) { const ax = p[i], ay = p[i + 1], az = p[i + 2], bx = p[i + 3], by = p[i + 4], bz = p[i + 5], cx = p[i + 6], cy = p[i + 7], cz = p[i + 8]; v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } } return Math.abs(v); }); };

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.click('.k-tree-row:has-text("Front Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
const p0 = await P(0, 0), p1 = await P(40, 0), p2 = await P(40, 30);
await page.click('.k-cm-iconbtn[data-tip="Line (L)"]');
await page.mouse.click(p0.x, p0.y);
await page.mouse.click(p1.x, p1.y);
await page.mouse.click(p2.x, p2.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-big:has-text("Base Flange/Tab") .k-cm-main');
await page.waitForTimeout(500);
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
const v0 = await volume();

// Cross-Break on the largest flat face of the bottom leg
await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const f = b.faces.filter((x) => !x.curved && x.normal[1] > 0.99).sort((p, q) => q.area - p.area)[0];
  window.__phlippoStore.setState({ selectedFace: { bodyId: b.id, faceId: f.id } });
});
await page.click('.k-cm-tab:has-text("Sheet Metal")');
await page.click('.k-cm-small:has-text("Cross-Break")');
await page.waitForTimeout(300);
check('Cross-Break PM takes the selected face', /Face<\d+>/.test(await page.locator('[data-testid="xbreak-face"]').innerText()));
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
let st = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { names: s.doc.features.map((f) => f.name), curves: (s.rebuild.curves ?? []).filter((c) => c.name === 'Cross-Break').length, errors: s.rebuild.errors }; });
check('Cross-Break1 in the tree, two break lines, body unchanged', st.names.includes('Cross-Break1') && st.curves === 2 && Object.keys(st.errors).length === 0 && Math.abs((await volume()) - v0) < 1e-6, JSON.stringify(st));
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(5, 900);
await page.waitForTimeout(400);
await shot('co1-cross-break');

// Corners ▸ Break-Corner: collect all corners, chamfer 5
await page.click('.k-cm-big:has-text("Corners") .k-cm-main');
await page.waitForTimeout(300);
await page.click('[data-testid="collect-corners"]');
const nCorners = await page.locator('[data-testid="bcorner-edges"] .k-selbox-row').count();
check('Collect all corners finds the four corners of the sheet', nCorners === 4, String(nCorners));
await page.mouse.move(5, 900);
await shot('co2-break-corner-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
st = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { names: s.doc.features.map((f) => f.name), errors: s.rebuild.errors }; });
const v1 = await volume();
// four 5 x 5 chamfers through 3 mm: 4 * 12.5 * 3 = 150
check('Break-Corner1 chamfers the corners (150 mm³ less)', st.names.includes('Break-Corner1') && Object.keys(st.errors).length === 0 && Math.abs(v0 - v1 - 150) < 8, `${(v0 - v1).toFixed(1)} ${JSON.stringify(st)}`);
await page.mouse.move(5, 900);
await page.waitForTimeout(300);
await shot('co3-break-corner');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
