// Block G-F (Evaluate): Performance Evaluation, Symmetry Check, Deviation Analysis, Parting Line Analysis, Compare
// (Body Compare / Compare Documents), Check Active Document in the menu, Quick Beam Estimate Analysis Wizard.
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
const S = (fn, arg) => page.evaluate(fn, arg);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const text = (sel) => page.locator(sel).innerText();

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');

// a 100 x 10 x 10 steel beam along X (two bodies for Body Compare: a second, shifted copy with Merge result off)
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'front');
  sk = K.addLine(sk, { x: 0, y: 0 }, { x: 100, y: 0 })[0];
  sk = K.addLine(sk, { x: 100, y: 0 }, { x: 100, y: 10 })[0];
  sk = K.addLine(sk, { x: 100, y: 10 }, { x: 0, y: 10 })[0];
  sk = K.addLine(sk, { x: 0, y: 10 }, { x: 0, y: 0 })[0];
  let sk2 = K.createSketch('s2', 'Sketch2', 'front');
  sk2 = K.addLine(sk2, { x: 0, y: 20 }, { x: 80, y: 20 })[0];
  sk2 = K.addLine(sk2, { x: 80, y: 20 }, { x: 80, y: 30 })[0];
  sk2 = K.addLine(sk2, { x: 80, y: 30 }, { x: 0, y: 30 })[0];
  sk2 = K.addLine(sk2, { x: 0, y: 30 }, { x: 0, y: 20 })[0];
  const d = K.createDocument('Balk');
  d.sketches = { s1: sk, s2: sk2 };
  d.material = { name: 'Plain Carbon Steel', density: 7800, color: '#b8bcc2' };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'midPlane', depth: 10, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false },
    { id: 'e2', type: 'extrude', name: 'Boss-Extrude2', sketchId: 's2', suppressed: false, op: 'boss', end: 'midPlane', depth: 10, reverse: false, merge: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);
check('two bodies', (await S(() => window.__phlippoStore.getState().rebuild.bodies.length)) === 2);

// ---- Evaluate tab has the new commands
await page.click('.k-cm-tab:has-text("Evaluate")');
for (const l of ['Performance Evaluation', 'Symmetry Check', 'Deviation Analysis', 'Parting Line Analysis', 'Compare', 'Quick Beam Estimate']) check(`Evaluate tab has ${l}`, (await page.locator(`.k-cm-group :text-is("${l}")`).count()) >= 1);
await shot('gf0-evaluate-tab');

// ---- Performance Evaluation
await page.click('.k-cm-big:has-text("Performance Evaluation") .k-cm-main');
await page.waitForTimeout(400);
check('Performance Evaluation lists the features with their rebuild time', (await page.locator('[data-testid="perf-table"] tbody tr').count()) === 2 && /Total rebuild time/.test(await text('[data-testid="perf-total"]')));
await page.locator('.k-pm-tabs button:has-text("Statistics")').click();
check('Statistics: 2 solid bodies', /Solid bodies\s*2/.test((await text('[data-testid="perf-stats"]')).replace(/\s+/g, ' ')));
await shot('gf1-performance');
await page.locator('[data-testid="performance-dialog"] .k-btn:has-text("Close")').click();

// ---- Symmetry Check: the beam (y 0..10, z -5..5) is symmetric about the Front plane, not about the Top plane
await page.click('.k-cm-small:has-text("Symmetry Check")');
await page.waitForTimeout(300);
await page.locator('[data-testid="symmetry-plane"]').selectOption('front');
await page.locator('[data-testid="symmetry-run"]').click();
await page.waitForTimeout(800);
check('Symmetry Check: symmetric about the Front plane', /is symmetric/.test(await text('[data-testid="symmetry-result"]')), await text('[data-testid="symmetry-result"]'));
await page.locator('[data-testid="symmetry-plane"]').selectOption('top');
await page.locator('[data-testid="symmetry-run"]').click();
await page.waitForTimeout(800);
check('Symmetry Check: not symmetric about the Top plane, asymmetric faces listed', /not symmetric/.test(await text('[data-testid="symmetry-result"]')) && /asymmetric face/.test(await text('[data-testid="symmetry-result"]')));
await shot('gf2-symmetry');
await page.locator('[data-testid="symmetry-dialog"] .k-btn:has-text("Close")').click();

// ---- Deviation Analysis on two edges of the beam
await page.click('.k-cm-small:has-text("Deviation Analysis")');
await page.waitForTimeout(400);
check('Deviation Analysis PM opens and asks for edges', (await page.locator('[data-testid="deviation-pm"]').count()) === 1);
// the edges are picked while the PM is open (opening an analysis clears the selection, as the original)
await S(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; s.toggleSelectedEdge(b.edges[0].id); s.toggleSelectedEdge(b.edges[1].id, true); });
await page.waitForTimeout(400);
check('Deviation Analysis PM lists the edges and 90 degree deviations', (await page.locator('[data-testid="deviation-edges"] .k-selbox-row').count()) === 2 && /Maximum deviation: 90\.00/.test(await text('[data-testid="deviation-result"]')), await text('[data-testid="deviation-result"]'));
await shot('gf3-deviation');
await page.locator('[data-testid="deviation-pm"] .k-pm-ok').click();

// ---- Parting Line Analysis along Y: top faces green, bottom red, the parting line around the sides
await page.click('.k-cm-small:has-text("Parting Line Analysis")');
await page.waitForTimeout(500);
const legend = await text('[data-testid="parting-legend"]');
check('Parting Line Analysis: positive and negative faces counted, straddle faces too', /2 faces with positive draft/.test(legend) && /2 faces with negative draft/.test(legend) && /8 straddle faces/.test(legend), legend.replace(/\n/g, ' '));
check('the parting line result is shown', /edge\(s\), total length/.test(await text('[data-testid="parting-result"]')));
await shot('gf4-partingline');
await page.locator('[data-testid="parting-pm"] .k-pm-ok').click();

// ---- Compare: Body Compare of the two beams, then Compare Documents against a saved copy
await page.click('.k-cm-big:has-text("Compare") .k-cm-main');
await page.waitForTimeout(300);
await page.locator('[data-testid="compare-run"]').click();
await page.waitForTimeout(800);
const cmp = await text('[data-testid="compare-result"]');
check('Body Compare: the bodies differ, common volume 0, only-in volumes 10000 and 8000', /bodies differ/.test(cmp) && /Common volume: 0/.test(cmp) && /10,000/.test(cmp) && /8,000/.test(cmp), cmp.replace(/\n/g, ' '));
await page.locator('.k-pm-tabs button:has-text("Compare Documents")').click();
// a modified copy of the document as the file to compare with
const other = await S(() => { const s = window.__phlippoStore.getState(); const d = JSON.parse(JSON.stringify(s.doc)); d.format = 'phlippo-cad'; d.name = 'Balk-v2'; d.features[1].depth = 12; d.features.push({ id: 'f9', type: 'fillet', name: 'Fillet1', suppressed: false, edges: [], radius: 1 }); return JSON.stringify(d); });
await page.locator('[data-testid="compare-file"]').setInputFiles({ name: 'Balk-v2.kcad', mimeType: 'application/json', buffer: Buffer.from(other) });
await page.waitForTimeout(800);
const docs = await text('[data-testid="compare-docs"]');
const lastMsg = await S(() => window.__phlippoStore.getState().messages.map((m) => m.text).join(' | '));
check('Compare Documents: Boss-Extrude1 modified, Fillet1 added, name differs', /Modified: Boss-Extrude1/.test(docs) && /Added: Fillet1/.test(docs) && /Name: Balk → Balk-v2/.test(docs), docs.replace(/\n/g, ' '));
await shot('gf5-compare');
await page.locator('[data-testid="compare-dialog"] .k-btn:has-text("Close")').click();

// ---- Tools ▸ Evaluate menu has Check Active Document and the new entries
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("Tools")');
await page.waitForTimeout(150);
for (const l of ['Evaluate ▸ Check Active Document…', 'Evaluate ▸ Performance Evaluation…', 'Evaluate ▸ Symmetry Check…', 'Evaluate ▸ Compare ▸ Body Compare…', 'Evaluate ▸ Quick Beam Estimate…']) check(`Tools menu has ${l}`, (await page.locator(`.k-menu-item:has-text("${l}")`).count()) === 1);
await page.keyboard.press('Escape');

// ---- Quick Beam Estimate: fix the left end face, 100 N on the top face of the 100 mm beam
await page.click('.k-cm-big:has-text("Quick Beam Estimate") .k-cm-main');
await page.waitForTimeout(300);
check('Quick Beam Estimate wizard: six steps, Welcome first', (await page.locator('[data-testid="beam-steps"] span').count()) === 6);
await page.locator('[data-testid="beam-next"]').click();
// fixture: the face at x = 0 of the first beam
await S(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies.find((x) => x.faces.some((f) => Math.abs(f.centroid[0]) < 0.1 && Math.abs(f.centroid[1] - 5) < 0.1)); const f = b.faces.find((x) => Math.abs(x.centroid[0]) < 0.1 && Math.abs(x.centroid[1] - 5) < 0.1); s.setSelectedFace({ bodyId: b.id, faceId: f.id }); });
await page.locator('[data-testid="beam-addfixture"]').click();
check('fixture added', /Fixed-1/.test(await text('[data-testid="beam-fixture"]')));
await page.locator('[data-testid="beam-next"]').click();
// load: the top face (y = 10) of the first beam
await S(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies.find((x) => x.faces.some((f) => Math.abs(f.centroid[1] - 10) < 0.1 && Math.abs(f.centroid[0] - 50) < 0.1)); const f = b.faces.find((x) => Math.abs(x.centroid[1] - 10) < 0.1 && Math.abs(x.centroid[0] - 50) < 0.1); s.setSelectedFace({ bodyId: b.id, faceId: f.id }); });
await page.locator('[data-testid="beam-addforce"]').click();
check('force added', /Force-1: 100 N/.test(await text('[data-testid="beam-load"]')));
await page.locator('[data-testid="beam-next"]').click();
check('material page shows the part material (Plain Carbon Steel)', (await page.locator('[data-testid="beam-material"]').inputValue()) === 'Plain Carbon Steel');
await page.locator('[data-testid="beam-next"]').click();
await page.locator('[data-testid="beam-run"]').click();
await page.waitForTimeout(300);
await page.locator('[data-testid="beam-next"]').click();
await page.waitForTimeout(300);
const res = (await text('[data-testid="beam-results"]')).replace(/\s+/g, ' ');
// the load acts at the top face centre (x 50): M = 100 · 50 = 5000 N·mm, σ = 5000 · 5 / 833 = 30 MPa, FOS = 220 / 30 ≈ 7
check('Quick Beam Estimate results: FOS ≈ 7, stress ≈ 30 MPa, displacement, beam model', /Indicative ratio yield \/ stress 7\.\d+/.test(res) && /von Mises stress \(max\) 3\d\.\d+ MPa/.test(res) && /span 50\.\d mm/.test(res), res);
const dlgText = await text('[data-testid="beamEstimate-dialog"]');
check('Quick Beam Estimate is marked indicative and makes no safety claim, no green safety colour (F56)', /Indicative estimate/.test(dlgText) && /Not for design decisions/.test(dlgText) && !/Factor of safety/i.test(dlgText) && !(await page.locator('[data-testid="beamEstimate-dialog"] [style*="#e6f4ea"], [data-testid="beamEstimate-dialog"] [style*="rgb(31, 122, 55)"]').count()) && !/should be safe/i.test(dlgText) && /does not show that the part is safe|not a safety assessment/.test(dlgText), dlgText.slice(-200));
await shot('gf6-beamEstimate');
await page.locator('[data-testid="beamEstimate-dialog"] .k-btn:has-text("Close")').click();

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
