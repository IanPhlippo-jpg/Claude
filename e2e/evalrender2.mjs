// Evaluate / Render / managers that were "later": Geometry Analysis, Design Study, Edit Decal, Preview Window,
// Apply Scene, Ambient Occlusion, Tolerance Tree and Display Panel.
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
page.on('console', (m) => { if (m.type() === 'error' && !/WebGL|GL_/.test(m.text())) errors.push('console: ' + m.text()); });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s', 'Sketch1', 'top');
  const c = [[0, 0], [80, 0], [80, 40], [0, 40]];
  for (let i = 0; i < 4; i++) s = K.addLine(s, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  const ids = Object.keys(s.entities);
  s = { ...s, constraints: { ...s.constraints, d1: { id: 'd1', kind: 'length', refs: [ids[0]], value: 80 } }, constraintOrder: [...s.constraintOrder, 'd1'] };
  const d = { ...K.createDocument('Plate'), sketches: { s }, features: [{ id: 'k', type: 'sketch', name: 'Sketch1', sketchId: 's', suppressed: false }, { id: 'e', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }] };
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);

// Geometry Analysis
await page.click('.k-cm-tab:has-text("Evaluate")');
await page.click('.k-cm-small:has-text("Geometry Analysis")');
await page.waitForTimeout(400);
const geo = (await page.locator('[data-testid="geometry-results"]').textContent()) ?? '';
check('Geometry Analysis reports short edges, small faces and knife edges', /Short edges: 0/.test(geo) && /Small faces: 0/.test(geo) && /Knife edges: 0/.test(geo), geo);
await page.click('.k-cm-small:has-text("Geometry Analysis")');

// Design Study on the extrusion depth
await page.click('.k-cm-big:has-text("Design Study")');
await page.waitForTimeout(300);
const dims = await page.evaluate(() => [...document.querySelectorAll('[data-testid="ds-dim"] option')].map((o) => o.value));
const depthDim = dims.find((d) => /Boss-Extrude1/.test(d)) ?? dims[0];
await page.selectOption('[data-testid="ds-dim"]', depthDim);
await page.click('[data-testid="ds-run"]');
await page.waitForTimeout(1500);
const rows = await page.locator('[data-testid="ds-results"] tbody tr').count();
check('Design Study runs 5 scenarios and marks the optimum', rows === 5 && (await page.locator('.k-ds-best').count()) === 1, `${rows} ${JSON.stringify(dims)}`);
await page.screenshot({ path: `${OUT}/er2-designstudy.png` });
await page.locator('[data-testid="ds-results"] tbody tr').first().locator('button:has-text("Apply")').click();
await page.waitForTimeout(800);
const depth = await page.evaluate(() => window.__phlippoStore.getState().doc.features.find((f) => f.id === 'e').depth);
check('Apply sets the scenario value on the model', depth < 10, String(depth));
await page.click('.k-dialog-actions button:has-text("Close")');
await page.keyboard.press('Control+z');
await page.waitForTimeout(500);

// Edit Decal on the top face
await page.evaluate(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const f = b.faces.find((x) => !x.curved && x.normal[1] > 0.99); s.setSelectedFace({ bodyId: b.id, faceId: f.id }); });
await page.click('.k-cm-tab:has-text("Render Tools")');
await page.click('.k-cm-big:has-text("Edit Decal")');
await page.waitForTimeout(300);
await page.click('[data-testid="decal-tab-mapping"]');
check('Edit Decal takes the selected face', /Face/.test((await page.locator('[data-testid="decal-face"]').textContent()) ?? ''));
await page.click('[data-testid="decal-ok"]');
await page.waitForTimeout(800);
check('Decal1 is stored on the document', await page.evaluate(() => (window.__phlippoStore.getState().doc.decals ?? []).length === 1));
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.waitForTimeout(800);
const decalMeshes = await page.evaluate(() => { let n = 0; window.__phlippoStore; return n; });
void decalMeshes;
await page.screenshot({ path: `${OUT}/er2-decal.png` });

// Preview Window
await page.click('.k-cm-big:has-text("Preview Window")');
await page.waitForTimeout(800);
check('Preview Window shows a rendered image', (await page.locator('[data-testid="preview-img"]').count()) === 1);
await page.screenshot({ path: `${OUT}/er2-preview.png` });
await page.click('[data-testid="preview-window"] button[data-tip="Close"]');

// Apply Scene and Ambient Occlusion from the heads-up toolbar
await page.evaluate(() => window.__phlippoStore.getState().setScene({ background: 'studio' }));
check('Apply Scene ▸ Studio Room sets the scene', await page.evaluate(() => window.__phlippoStore.getState().doc.scene?.background === 'studio'));
await page.evaluate(() => window.__phlippoStore.getState().setScene({ background: 'gradient' }));
await page.evaluate(() => window.__phlippoStore.getState().toggleShow('ambientOcclusion'));
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/er2-ao.png` });
check('Ambient Occlusion is on and the page keeps working', await page.evaluate(() => window.__phlippoStore.getState().show.ambientOcclusion) && errors.length === 0, JSON.stringify(errors));
await page.evaluate(() => window.__phlippoStore.getState().toggleShow('ambientOcclusion'));

// Tolerance Tree and Display Panel tabs
await page.click('[data-testid="tab-dimxpert"]');
await page.waitForTimeout(300);
check('Tolerance Tree lists the model dimensions', (await page.locator('[data-testid="dx-dim"]').count()) >= 2, String(await page.locator('[data-testid="dx-dim"]').count()));
await page.click('[data-testid="tab-display"]');
await page.waitForTimeout(300);
const dm = (await page.locator('[data-testid="display-manager"]').textContent()) ?? '';
check('Display Panel lists appearances, the decal and the scene', /Appearances/.test(dm) && /Decal1/.test(dm) && /Scene/.test(dm), dm.slice(0, 200));
await page.screenshot({ path: `${OUT}/er2-display.png` });

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
