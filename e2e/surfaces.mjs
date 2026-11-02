// Surfaces tab: Extruded Surface, Planar Surface x2 and Knit Surface with Create solid -> a closed 40 x 20 x 10 solid.
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

const expandTree = async () => { for (let k = 0; k < 8; k++) { const n = await page.evaluate(() => { const c = [...document.querySelectorAll('.k-tree-row .caret[data-open="false"]')]; c.forEach((x) => x.click()); return c.length; }); if (!n) break; await page.waitForTimeout(80); } };
await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Oppervlak', 'part');
  d.planes.p10 = { ...K.REFERENCE_PLANE_DEFS.top, id: 'p10', name: 'Plane1', origin: [0, 10, 0], kind: 'reference' };
  const rect = (id, name, plane) => { let s = K.createSketch(id, name, plane); const c = [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: -20 }, { x: 0, y: -20 }]; for (let i = 0; i < 4; i++) s = K.addLine(s, c[i], c[(i + 1) % 4])[0]; return s; };
  d.sketches = { a: rect('a', 'Sketch1', 'top'), b: rect('b', 'Sketch2', 'p10') };
  d.features = [{ id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'a', suppressed: false }, { id: 'f2', type: 'sketch', name: 'Sketch2', sketchId: 'b', suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
const R = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return { solids: s.rebuild.bodies.length, surfaces: (s.rebuild.surfaceBodies ?? []).length, errors: s.rebuild.errors, feats: s.doc.features.map((f) => f.name) }; });
await page.click('.k-cm-tab:has-text("Surfaces")');
await page.locator('.k-tree-row:has-text("Sketch1")').last().click();
await page.click('.k-cm-big:has-text("Extruded Surface") .k-cm-main');
await page.waitForTimeout(300);
check('Surface-Extrude Property Panel with Sketch1', (await page.locator('[data-testid="surface-sketch"]').inputValue()) === 'a');
await page.click('.k-pm-ok');
await page.waitForTimeout(500);
let r = await R();
check('Surface-Extrude1: one surface body, no solid', r.surfaces === 1 && r.solids === 0 && Object.keys(r.errors).length === 0, JSON.stringify(r));
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('sf1-extruded-surface');
check('tree shows Surface Bodies(1)', (await page.locator('.k-tree-row:has-text("Surface Bodies(1)")').count()) === 1);
for (const sk of ['Sketch1', 'Sketch2']) {
  await expandTree();
  await page.locator(`.k-tree-row:has-text("${sk}")`).last().click();
  await page.click('.k-cm-tab:has-text("Surfaces")');
  await page.click('.k-cm-big:has-text("Planar Surface") .k-cm-main');
  await page.waitForTimeout(250);
  await page.click('.k-pm-ok');
  await page.waitForTimeout(400);
}
r = await R();
check('two planar surfaces added (3 surface bodies)', r.surfaces === 3, JSON.stringify(r));
await page.click('.k-cm-tab:has-text("Surfaces")');
await page.click('.k-cm-big:has-text("Knit Surface") .k-cm-main');
await page.waitForTimeout(300);
await page.locator('.k-section:has-text("Selections") .k-check:has-text("Create solid") input').check();
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
r = await R();
await waitSettled(page); const vol = await page.evaluate(() => { const g = window.__phlippoStore.getState().rebuild.bodies[0]?.geometry; if (!g) return 0; const a = (g.index ? g.toNonIndexed() : g).getAttribute('position'); let v = 0; for (let i = 0; i < a.count; i += 3) { const x0 = a.getX(i), y0 = a.getY(i), z0 = a.getZ(i), x1 = a.getX(i + 1), y1 = a.getY(i + 1), z1 = a.getZ(i + 1), x2 = a.getX(i + 2), y2 = a.getY(i + 2), z2 = a.getZ(i + 2); v += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6; } return v; });
check('Surface-Knit1 with Create solid: a 8000 mm^3 solid, no surfaces left', r.solids === 1 && r.surfaces === 0 && Math.abs(vol - 8000) < 1, JSON.stringify({ r, vol }));
await shot('sf2-knit-solid');

// ---- Swept Surface of a line along a path, then Trim Surface with a plane through the middle
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Sweep', 'part');
  d.planes.px = { ...K.REFERENCE_PLANE_DEFS.right, id: 'px', name: 'Plane1', origin: [25, 0, 0], kind: 'reference' };
  let prof = K.createSketch('prof', 'Sketch1', 'right'); prof = K.addLine(prof, { x: 0, y: 0 }, { x: 0, y: 10 })[0];
  let path = K.createSketch('path', 'Sketch2', 'top'); path = K.addLine(path, { x: 0, y: 0 }, { x: 50, y: 0 })[0];
  d.sketches = { prof, path };
  d.features = [{ id: 'a', type: 'sketch', name: 'Sketch1', sketchId: 'prof', suppressed: false }, { id: 'b', type: 'sketch', name: 'Sketch2', sketchId: 'path', suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
await page.click('.k-cm-tab:has-text("Surfaces")');
await page.locator('.k-tree-row:has-text("Sketch1")').last().click();
await page.click('.k-cm-big:has-text("Swept Surface") .k-cm-main');
await page.waitForTimeout(250);
await page.locator('[data-testid="surface-sketch2"]').selectOption('path');
await page.click('.k-pm-ok');
await page.waitForTimeout(500);
const area = async () => { await waitSettled(page); return page.evaluate(() => { const g = window.__phlippoStore.getState().rebuild.surfaceBodies?.[0]?.geometry; if (!g) return 0; const a = (g.index ? g.toNonIndexed() : g).getAttribute('position'); let s = 0; for (let i = 0; i < a.count; i += 3) { const ux = a.getX(i + 1) - a.getX(i), uy = a.getY(i + 1) - a.getY(i), uz = a.getZ(i + 1) - a.getZ(i), vx = a.getX(i + 2) - a.getX(i), vy = a.getY(i + 2) - a.getY(i), vz = a.getZ(i + 2) - a.getZ(i); s += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2; } return s; }); };
let ar = await area();
check('Surface-Sweep1: 10 x 50 = 500 mm^2', Math.abs(ar - 500) < 1, String(ar));
await page.click('.k-cm-tab:has-text("Surfaces")');
await page.click('.k-cm-small:has-text("Trim Surface")');
await page.waitForTimeout(250);
await page.locator('[data-testid="trim-plane"]').selectOption('px');
await page.click('.k-pm-ok');
await page.waitForTimeout(500);
ar = await area();
check('Surface-Trim1 with Plane1 at x = 25 keeps half (250 mm^2)', Math.abs(ar - 250) < 1, String(ar));
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('sf3-trim');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
