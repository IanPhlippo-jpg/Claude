// Draft (neutral plane + faces picked in the graphics area), Evaluate ▸ Check and Section Properties, Intersect of two bodies.
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
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
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
  const d = K.createDocument('Mal', 'part');
  const rect = (id, x0) => { let s = K.createSketch(id, id, 'top'); const c = [{ x: x0, y: 0 }, { x: x0 + 40, y: 0 }, { x: x0 + 40, y: -40 }, { x: x0, y: -40 }]; for (let i = 0; i < 4; i++) s = K.addLine(s, c[i], c[(i + 1) % 4])[0]; return s; };
  d.sketches = { a: rect('a', 0) };
  d.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'a', suppressed: false },
    { id: 'f2', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'a', suppressed: false, op: 'boss', end: 'blind', depth: 40, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(700);
const vol = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return { errors: s.rebuild.errors, vols: s.rebuild.bodies.map((b) => { const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry; const a = g.getAttribute('position'); let v = 0; for (let i = 0; i < a.count; i += 3) { const x0 = a.getX(i), y0 = a.getY(i), z0 = a.getZ(i), x1 = a.getX(i + 1), y1 = a.getY(i + 1), z1 = a.getZ(i + 1), x2 = a.getX(i + 2), y2 = a.getY(i + 2), z2 = a.getZ(i + 2); v += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6; } return v; }) }; });
const W = (x, y, z) => page.evaluate(([x, y, z]) => window.__phlippoProjectWorld(x, y, z), [x, y, z]);

// ---- Draft: neutral plane = top face (y = 40), faces = the two visible sides; 5 degrees
await page.keyboard.press('f');
await page.waitForTimeout(300);
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-small:has-text("Draft")');
await page.waitForTimeout(300);
check('Draft Property Panel (Draft1)', (await page.locator('.k-pm-title:has-text("Draft1")').count()) === 1);
await page.locator('.k-section:has-text("Draft Angle") input.k-num').first().fill('5');
await page.locator('.k-section:has-text("Draft Angle") input.k-num').first().press('Tab');
let q = await W(20, 40, 20); await page.mouse.click(q.x, q.y); await page.waitForTimeout(200);
q = await W(40, 20, 20); await page.mouse.click(q.x, q.y); await page.waitForTimeout(200);
q = await W(20, 20, 40); await page.mouse.click(q.x, q.y); await page.waitForTimeout(200);
const dd = await page.evaluate(() => { const d = window.__phlippoStore.getState().featureEdit.draft; return { neutral: d.neutral?.label, faces: d.faces.length }; });
check('neutral plane and two faces picked', !!dd.neutral && dd.faces === 2, JSON.stringify(dd));
await shot('dc1-draft-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
let v = await vol();
check('Draft1 tapers the two faces (volume smaller than 64000)', Object.keys(v.errors).length === 0 && v.vols[0] < 64000 - 2000 && v.vols[0] > 64000 - 6000, JSON.stringify(v));

// ---- Evaluate ▸ Check and Section Properties of the bottom face... use the top face
await page.click('.k-cm-tab:has-text("Evaluate")');
await page.click('.k-cm-small:has-text("Check")');
await page.waitForTimeout(300);
{ const t = await page.locator('[data-testid="check-result"]').innerText(); check('Check Entity: no invalid faces or edges', t.includes('No invalid faces or edges found.'), t); }
await page.click('.k-check-dialog .k-btn:has-text("Close")');
q = await W(20, 40, 20); await page.mouse.click(q.x, q.y); await page.waitForTimeout(200);
await page.click('.k-cm-big:has-text("Section Properties") .k-cm-main');
await page.waitForTimeout(300);
const rep = await page.locator('[data-testid="section-report"]').innerText();
check('Section Properties of the top face (40 x 40 = 1600 mm^2)', /Area = 1600\.00 mm\^2/.test(rep), rep.slice(0, 80));
await shot('dc2-section-properties');
await page.click('.k-sectionprops-dialog .k-btn:has-text("Close")');

// ---- Draft Analysis (pull -Y, i.e. out of the top face: the drafted sides have positive draft) and Curvature
await page.click('.k-cm-small:has-text("Draft Analysis")');
await page.waitForTimeout(300);
await page.click('[data-testid="draft-analysis-pm"] .k-pm-stylebtn[data-tip="Reverse Direction"]');
await page.waitForTimeout(400);
const leg = await page.locator('[data-testid="draft-legend"]').innerText();
const nums = (leg.match(/\d+/g) ?? []).map(Number);
check('Draft Analysis classifies all 6 faces (2 drafted sides positive)', nums.reduce((a, b) => a + b, 0) === 6 && nums[0] >= 2, leg);
await page.mouse.move(5, 600);
await shot('dc4-draft-analysis');
await page.click('[data-testid="draft-analysis-pm"] .k-pm-ok');
await page.click('.k-cm-small:has-text("Curvature")');
await page.waitForTimeout(400);
check('Curvature display on', await page.evaluate(() => window.__phlippoStore.getState().analysis?.kind === 'curvature'));
await page.click('.k-cm-small:has-text("Curvature")');

// ---- Intersect: a second body overlapping the first, keep only the common region
await page.evaluate(() => {
  const st = window.__phlippoStore.getState();
  const K = window.__phlippoKit;
  let s = K.createSketch('b', 'Sketch2', 'top');
  const c = [{ x: 20, y: 0 }, { x: 60, y: 0 }, { x: 60, y: -40 }, { x: 20, y: -40 }];
  for (let i = 0; i < 4; i++) s = K.addLine(s, c[i], c[(i + 1) % 4])[0];
  const d = { ...st.doc, sketches: { ...st.doc.sketches, b: s }, features: [...st.doc.features, { id: 'f8', type: 'sketch', name: 'Sketch2', sketchId: 'b', suppressed: false }, { id: 'f9', type: 'extrude', name: 'Boss-Extrude2', sketchId: 'b', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false, merge: false }] };
  st.openDocument(d);
});
await page.waitForTimeout(700);
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-small:has-text("Intersect")');
await page.waitForTimeout(300);
check('Intersect Property Panel with both bodies', (await page.locator('[data-testid="intersect-bodies"] .k-selbox-row').count()) === 2);
await page.locator('.k-section:has-text("Regions to Exclude") .k-check').nth(1).click();
await page.locator('.k-section:has-text("Regions to Exclude") .k-check').nth(2).click();
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
v = await vol();
check('Intersect1 keeps the common region only (one body)', Object.keys(v.errors).length === 0 && v.vols.length === 1 && v.vols[0] > 10000 && v.vols[0] < 16000, JSON.stringify(v));
await shot('dc3-intersect');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
