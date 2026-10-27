// Differences from playlist videos 55–58 made good: an equation typed in a Property Panel value field (= opens Global
// Variables / Functions / File Properties) drives the feature dimension; Rib ▸ Type Linear/Natural, Draft On/Off and
// Rib Thickness At wall interface; Delete Face ▸ Show selection toolbar / Show preview; the status bar prompts and the
// Radius / Area + Perimeter readouts; the tree context toolbar of a sketch (Show/Hide, Zoom to Selection, Normal To);
// the mass sensor with 9 significant digits.
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
const status = () => page.locator('.k-statusbar').innerText();

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

// a plate 80 x 60 x 10 with the global variable "Width" = 40 and a steel material
await S(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Videos56', 'part');
  let s = K.createSketch('s1', 'Sketch1', 'top');
  const c = [{ x: -40, y: -30 }, { x: 40, y: -30 }, { x: 40, y: 30 }, { x: -40, y: 30 }];
  for (let i = 0; i < 4; i++) s = K.addLine(s, c[i], c[(i + 1) % 4])[0];
  d.sketches = { s1: s };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  d.equations = [{ id: 'q1', target: 'Width', expression: '40' }];
  d.material = { name: 'Plain Carbon Steel', density: 7800, color: '#888888' };
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);

// ---- = in the Depth field of Boss-Extrude1
await page.locator('.k-tree-row:has-text("Boss-Extrude1")').first().dblclick();
await page.waitForTimeout(400);
check('Boss-Extrude1 ▸ status prompt "Select a handle to modify parameters"', (await status()).includes('Select a handle to modify parameters'), await status());
const depth = page.locator('.k-pm-host input.k-num').first();
await depth.focus();
await depth.press('=');
await page.waitForTimeout(150);
check('= turns the field into an equation with Global Variables / Functions / File Properties', (await page.locator('[data-testid="eq-input"]').count()) === 1 && /Global Variables ▸[\s\S]*Functions ▸[\s\S]*File Properties ▸/.test(await page.locator('[data-testid="eq-menu"]').innerText()));
await page.hover('[data-testid="eq-globals"]');
await page.waitForTimeout(150);
check('Global Variables ▸ lists "Width"', (await page.locator('[data-testid="eq-globals"]').innerText()).includes('Width'));
await page.locator('[data-testid="eq-globals"] .k-eq-subitems .k-menu-item:has-text("Width")').dispatchEvent('mousedown');
await page.locator('[data-testid="eq-input"]').press('End');
await page.locator('[data-testid="eq-input"]').type(' / 2');
await page.screenshot({ path: `${OUT}/videos56-equation.png` });
await page.locator('[data-testid="eq-input"]').press('Enter');
await page.waitForTimeout(200);
if (await page.locator('.k-pm-ok').count()) await page.click('.k-pm-ok');
await page.waitForTimeout(600);
let r = await S(() => { const s = window.__phlippoStore.getState(); return { depth: s.doc.features.find((f) => f.id === 'e1').depth, eqs: s.doc.equations.map((e) => `${e.target}=${e.expression}`) }; });
check('the Depth is driven by the equation: D1@Boss-Extrude1 = "Width" / 2 (20 mm)', r.depth === 20 && r.eqs.includes('D1@Boss-Extrude1="Width" / 2'), JSON.stringify(r));
await S(() => { const s = window.__phlippoStore.getState(); s.setEquations(s.doc.equations.map((e) => (e.target === 'Width' ? { ...e, expression: '60' } : e))); });
await page.waitForTimeout(500);
r = await S(() => window.__phlippoStore.getState().doc.features.find((f) => f.id === 'e1').depth);
check('changing "Width" to 60 makes the depth 30', r === 30, String(r));
// a file property: SW-Density of the material (g/mm³)
r = await S(() => window.__phlippoKit.evaluateFieldExpression(window.__phlippoStore.getState().doc, '"SW-Density@Videos56" * 1000'));
check('File Properties: "SW-Density" is the material density (7.8 g/cm³)', Math.abs(r - 7.8) < 1e-9, String(r));

// ---- status bar readouts on model geometry: a face (Area + Perimeter)
await S(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const f = b.faces.find((x) => x.normal[1] > 0.999); s.setSelectedFace({ bodyId: b.id, faceId: f.id }); });
await page.waitForTimeout(200);
const ro = await page.locator('[data-testid="status-readout"]').innerText().catch(() => '');
check('a face shows "Area: 4800mm^2   Perimeter: 280mm"', /Area: 4800mm\^2\s+Perimeter: 280mm/.test(ro), ro);
await S(() => window.__phlippoStore.getState().setSelectedFace(null));

// ---- the tree context toolbar of a sketch: Show/Hide, Zoom to Selection, Normal To
await page.locator('.k-tree-row:has-text("Boss-Extrude1") .caret').first().click().catch(() => undefined);
await page.waitForTimeout(200);
await page.locator('.k-tree-row:has-text("Sketch1")').first().click();
await page.waitForTimeout(700);
check('a sketch in the tree: context toolbar Show, Zoom to Selection, Normal To (no Edit Sketch)', (await page.locator('[data-testid="ctx-show"]').count()) === 1 && (await page.locator('[data-testid="ctx-zoom-selection"]').count()) === 1 && (await page.locator('[data-testid="ctx-normal-to"]').count()) === 1 && (await page.locator('[data-testid="ctx-edit-sketch"]').count()) === 0);
check('the used sketch offers "Show"', (await page.locator('[data-testid="ctx-show"]').getAttribute('data-tip')) === 'Show');
await page.screenshot({ path: `${OUT}/videos56-ctxbar.png` });
const bb = await page.locator('[data-testid="tree-ctxbar"]').boundingBox();
if (bb) { await page.mouse.move(bb.x + 10, bb.y + bb.height / 2); await page.waitForTimeout(150); }
await page.locator('[data-testid="ctx-show"]').click();
await page.waitForTimeout(300);
check('Show makes the used sketch visible', await S(() => window.__phlippoStore.getState().doc.sketches.s1.visible === true));

// ---- Rib: Type Linear / Natural (Normal to Sketch), Draft On/Off, Rib Thickness
await S(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Rib', 'part');
  let a = K.createSketch('sa', 'Sketch1', 'top');
  const c = [{ x: -40, y: -30 }, { x: 40, y: -30 }, { x: 40, y: 30 }, { x: -40, y: 30 }];
  for (let i = 0; i < 4; i++) a = K.addLine(a, c[i], c[(i + 1) % 4])[0];
  d.planes.p20 = { ...K.REFERENCE_PLANE_DEFS.top, id: 'p20', name: 'Plane1', origin: [0, 20, 0], kind: 'reference' };
  const b = K.addLine(K.createSketch('sb', 'Sketch2', 'p20'), { x: -20, y: 0 }, { x: 20, y: 0 })[0];
  d.sketches = { sa: a, sb: b };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sa', suppressed: false, op: 'boss', end: 'blind', depth: 5, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 'sb', suppressed: false },
    { id: 'r1', type: 'rib', name: 'Rib1', sketchId: 'sb', suppressed: false, thickness: 4, side: 'both', direction: 'normal', flip: false, draft: 0 },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);
await page.locator('.k-tree-row:has-text("Rib1")').last().dblclick();
await page.waitForTimeout(400);
check('Rib1 ▸ status prompt "Set direction, thickness and other parameters to create the rib."', (await status()).includes('Set direction, thickness and other parameters to create the rib.'), await status());
check('Rib (Normal to Sketch) ▸ Type: Linear / Natural', /Type:[\s\S]*Linear[\s\S]*Natural/.test(await page.locator('[data-testid="rib-type"]').innerText().catch(() => '')));
check('without draft no Rib Thickness choice', (await page.locator('[data-testid="rib-thickness-at"]').count()) === 0);
await page.click('[data-testid="rib-draft-toggle"]');
await page.waitForTimeout(200);
check('Draft On/Off turns the draft on (1°) and shows At sketch plane / At wall interface', (await page.locator('[data-testid="rib-thickness-at"]').innerText()).includes('At wall interface') && await S(() => window.__phlippoStore.getState().featureEdit.draft.draft === 1));
await page.click('[data-testid="rib-at-wall"]');
await page.click('[data-testid="rib-natural"]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/videos56-rib.png` });
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
r = await S(() => { const s = window.__phlippoStore.getState(); const f = s.doc.features.find((x) => x.id === 'r1'); return { t: f.thicknessAt, type: f.ribType, draft: f.draft, errors: s.rebuild.errors, bodies: s.rebuild.bodies.length }; });
check('Rib1 stored with At wall interface, Natural and 1° draft; it builds', r.t === 'wall' && r.type === 'natural' && r.draft === 1 && !Object.keys(r.errors).length && r.bodies === 1, JSON.stringify(r));

// ---- Delete Face: Show selection toolbar and Show preview
await S(() => window.__phlippoStore.getState().startDeleteFace());
await page.waitForTimeout(300);
check('Delete Face ▸ Show selection toolbar and Show preview', (await page.locator('[data-testid="deleteface-seltoolbar"]').count()) === 1 && (await page.locator('[data-testid="deleteface-preview"]').count()) === 1);
await page.click('[data-testid="deleteface-preview"]');
await page.waitForTimeout(200);
check('Show preview turns the detailed preview on', await S(() => window.__phlippoStore.getState().detailedPreview));
await page.click('[data-testid="deleteface-preview"]');
await S(() => window.__phlippoStore.getState().cancelFeature());

// ---- the mass sensor: 9 significant digits
await S(() => window.__phlippoStore.getState().addSensor?.('mass'));
await page.waitForTimeout(400);
await page.locator('.k-tree-row:has-text("Sensors") .caret').first().click().catch(() => undefined);
await page.waitForTimeout(200);
const tree = await page.locator('.k-tree').first().innerText();
const m = /Mass1\((\d+)\.(\d+) g\)/.exec(tree);
check('Mass1 shows 9 significant digits', !!m && m[1].length + m[2].length === 9, m?.[0] ?? tree.slice(0, 200));

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
