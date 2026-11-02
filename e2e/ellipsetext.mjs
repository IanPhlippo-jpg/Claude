// Ellipse and Sketch Text: drawn with the ribbon tools, a plate with an elliptical hole and raised text
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
const K = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return sk ? sk.entityOrder.map((id) => sk.entities[id].kind + (sk.entities[id].construction ? '*' : '')) : []; });
const count = async (kind) => (await K()).filter((k) => k === kind).length;

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
const kinds = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return sk ? sk.entityOrder.map((id) => sk.entities[id].kind) : []; });

// plate 120 x 60 with an ellipse 30 x 12 inside: a plate with an elliptical hole
let a = await P(-60, -30), b = await P(60, 30);
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(a.x, a.y);
await page.mouse.click(b.x, b.y);
await page.keyboard.press('Escape');
await page.click('.k-cm-iconbtn[data-tip="Ellipse"]');
await page.waitForTimeout(150);
check('Ellipse tool active with its message', await page.evaluate(() => window.__phlippoStore.getState().tool === 'ellipse'));
for (const [x, y] of [[-30, 0], [-5, 0], [-30, 12]]) {
  const q = await P(x, y);
  await page.mouse.move(q.x, q.y);
  await page.waitForTimeout(60);
  await page.mouse.click(q.x, q.y);
}
await page.waitForTimeout(200);
const el = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; const e = sk.entityOrder.map((id) => sk.entities[id]).find((x) => x.kind === 'ellipse'); if (!e) return null; const c = sk.points[e.center], m = sk.points[e.major]; return { c, a: Math.hypot(m.x - c.x, m.y - c.y), b: sk.scalars[e.r2] }; });
check('ellipse: centre (-30, 0), a = 25, b = 12', el && Math.abs(el.c.x + 30) < 0.6 && Math.abs(el.a - 25) < 0.6 && Math.abs(el.b - 12) < 0.6, JSON.stringify(el));
await page.keyboard.press('Escape');
// Sketch Text "PHLIPPO" right of the ellipse
await page.click('.k-cm-iconbtn[data-tip="Text"]');
await page.waitForTimeout(150);
check('Sketch Text Property Panel', (await page.locator('[data-testid="sketch-text-pm"]').count()) === 1);
await page.fill('[data-testid="sketch-text-pm"] textarea', 'CAD');
const tp = await P(8, -6);
await page.mouse.move(tp.x, tp.y);
await page.waitForTimeout(200);
await shot('et1-text-preview');
await page.mouse.click(tp.x, tp.y);
await page.waitForTimeout(200);
await page.keyboard.press('Escape');
const k = await kinds();
check('sketch has 4 lines, an ellipse and a text', k.filter((x) => x === 'line').length === 4 && k.includes('ellipse') && k.includes('text'), k.join(','));
await shot('et2-sketch');
// extrude: plate with an elliptical hole and letter-shaped holes (letters' counters stay as islands)
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(500);
await page.click('.k-pm-ok');
await page.waitForTimeout(900);
const r = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { bodies: s.rebuild.bodies.length, errors: s.rebuild.errors }; });
check('extrude builds without errors', r.bodies >= 1 && Object.keys(r.errors).length === 0, JSON.stringify(r));
await waitSettled(page); const vol = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const g = s.rebuild.bodies[0].geometry; const a = g.index ? g.toNonIndexed().getAttribute('position') : g.getAttribute('position'); let v = 0; for (let i = 0; i < a.count; i += 3) { const x0 = a.getX(i), y0 = a.getY(i), z0 = a.getZ(i), x1 = a.getX(i + 1), y1 = a.getY(i + 1), z1 = a.getZ(i + 1), x2 = a.getX(i + 2), y2 = a.getY(i + 2), z2 = a.getZ(i + 2); v += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6; } return v; });
// plate 120 x 60 x 10 = 72000 minus ellipse pi*30*12*10 = 11310 minus letter area
check('volume = plate - ellipse - letters', vol > 72000 - 9425 - 6000 && vol < 72000 - 9425 - 300, vol.toFixed(0));
await page.keyboard.press('f');
await page.waitForTimeout(500);
await shot('et3-extruded');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
