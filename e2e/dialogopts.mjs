// Dialog options (Block D): Mass Properties (options, override, center of mass), Check (selected items), Edit Scene
// (environment, reflections, tabs), Material (custom library, units, config), Plane (Mid Plane, Flip normal),
// Configuration properties (BOM name, colour), Sensor (dimension + alert), Equations (radians), Appearances (back /
// forward, new folder, add to library), colour schemes.
import { chromium } from 'playwright';
import { exitCode, skip } from './lib/check.mjs';
import { mkdirSync, readFileSync } from 'node:fs';

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

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const part = JSON.parse(readFileSync('voorbeelden/deurkruk/Kruk.kcad', 'utf8')); delete part.format;
await S((d) => window.__phlippoStore.getState().openDocument(d), part);
await page.waitForTimeout(1500);

// ---- Mass Properties
await S(() => window.__phlippoStore.getState().setDialog('mass'));
await page.waitForTimeout(400);
const rep0 = await page.locator('.k-mass-report').innerText();
await page.click('[data-testid="mass-options"]');
await page.click('[data-testid="mass-custom"]');
await page.selectOption('[data-testid="mass-mass"]', 'kg');
await page.waitForTimeout(300);
const rep1 = await page.locator('.k-mass-report').innerText();
check('Mass options: kilograms', /kilograms/.test(rep1) && /grams/.test(rep0), rep1.slice(0, 200));
await page.click('[data-testid="mass-override"]');
await page.click('[data-testid="mass-ov-mass"]');
await page.fill('[data-testid="mass-ov-value"]', '500');
await page.waitForTimeout(300);
const rep2 = await page.locator('.k-mass-report').innerText();
check('Override mass: 500 g = 0.50 kg (user overridden)', /Mass = 0\.50 kilograms \(user overridden\)/.test(rep2), rep2.match(/Mass = [^\n]*/)?.[0]);
await page.click('[data-testid="mass-com"]');
await page.waitForTimeout(400);
check('Create Center of Mass feature: tree node', (await page.locator('.k-tree-row:has-text("Center of Mass")').count()) === 1);
await page.screenshot({ path: `${OUT}/dlg-mass.png` });
await S(() => { const s = window.__phlippoStore.getState(); s.applyDocument('x', { ...s.doc, massOverride: undefined }); s.setDialog(null); });

// ---- Check: selected items
await S(() => window.__phlippoStore.getState().setDialog('check'));
await page.waitForTimeout(300);
await page.click('[data-testid="check-selected"]');
await page.waitForTimeout(300);
check('Check ▸ Selected items with nothing selected checks no body', /Bodies checked: 0/.test(await page.locator('[data-testid="check-dialog"]').innerText()));
await S(() => window.__phlippoStore.getState().setDialog(null));

// ---- Edit Scene
await S(() => { const s = window.__phlippoStore.getState(); s.setSceneEdit(true); });
await page.waitForTimeout(300);
await page.selectOption('[data-testid="scene-env"]', 'courtyard');
// floor reflections are on by default; the click turns them off
check('Floor reflections are on by default', await page.locator('[data-testid="scene-reflect"]').isChecked());
await page.click('[data-testid="scene-reflect"]');
await page.click('[data-testid="scene-tab-illumination"]');
await page.fill('[data-testid="scene-brightness"]', '1.4').catch(async () => { await page.locator('[data-testid="scene-brightness"]').evaluate((el) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(el, '1.4'); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }); });
await page.waitForTimeout(400);
const sc = await S(() => window.__phlippoStore.getState().doc.scene);
check('Scene: courtyard, reflections off, brightness', sc.environment === 'courtyard' && sc.floorReflections === false && Math.abs((sc.brightness ?? 1) - 1.4) < 0.01, JSON.stringify(sc));
await page.screenshot({ path: `${OUT}/dlg-scene.png` });
await S(() => window.__phlippoStore.getState().setSceneEdit(false));

// ---- Material: custom library
await S(() => window.__phlippoStore.getState().setDialog('material'));
await page.waitForTimeout(300);
await page.fill('.k-material-search input', 'AISI 1020');
await page.locator('.k-material-item').first().click();
await page.click('[data-testid="mat-copy"]');
await page.fill('[data-testid="mat-density"]', '7000');
await page.click('[data-testid="mat-save"]');
await page.waitForTimeout(200);
const custom = await S(() => JSON.parse(JSON.parse(localStorage.getItem('phlippo.prefs'))['material.custom']));
check('Material copied to Custom Materials and edited', custom.length === 1 && custom[0].density === 7000, JSON.stringify(custom.map((m) => [m.name, m.density])));
await page.selectOption('[data-testid="mat-units"]', 'mpa');
check('Material units MPa', (await page.locator('.k-material-props').innerText()).includes('N/mm^2'));
await page.click('.k-dialog-actions button:has-text("Apply")');
await page.waitForTimeout(200);
check('custom material applied', (await S(() => window.__phlippoStore.getState().doc.material?.density)) === 7000);
await S(() => window.__phlippoStore.getState().setDialog(null));

// ---- Plane: Mid Plane between Top and an offset plane, Flip normal
await S(() => window.__phlippoStore.getState().startPlane());
await page.waitForTimeout(200);
await S(() => window.__phlippoStore.getState().updatePlaneDraft({ ref: 'top', mode: 'offset', distance: 40 }));
await S(() => window.__phlippoStore.getState().commitPlane());
await page.waitForTimeout(200);
const p1 = await S(() => Object.values(window.__phlippoStore.getState().doc.planes).find((p) => p.kind === 'reference'));
await S(() => window.__phlippoStore.getState().startPlane());
await S((id) => window.__phlippoStore.getState().updatePlaneDraft({ ref: 'top', mode: 'mid', ref2: id, flipNormal: true }), p1.id);
await S(() => window.__phlippoStore.getState().commitPlane());
await page.waitForTimeout(200);
const planes = await S(() => Object.values(window.__phlippoStore.getState().doc.planes).filter((p) => p.kind === 'reference'));
const mid = planes.find((p) => p.def?.mode === 'mid');
check('Mid Plane halfway (y = 20), normal flipped', mid && Math.abs(mid.origin[1] - 20) < 1e-6 && mid.n[1] === -1, JSON.stringify(mid && [mid.origin, mid.n]));

// ---- Configuration: BOM name and colour
await S(() => window.__phlippoStore.getState().startAddConfiguration());
await page.waitForTimeout(200);
await page.click('.k-section-title:has-text("Bill of Materials Options")');
await page.selectOption('[data-testid="cfg-bom-mode"]', 'configuration');
await page.click('.k-section-title:has-text("Advanced Options")');
await page.click('[data-testid="cfg-color-on"]');
await S(() => window.__phlippoStore.getState().updateConfigDraft({ name: 'Long' }));
await S(() => window.__phlippoStore.getState().commitConfiguration());
await page.waitForTimeout(400);
const cfgs = await S(() => window.__phlippoStore.getState().doc.configurations);
const newCfg = cfgs[cfgs.length - 1];
check('Configuration with BOM name and own colour', newCfg.bomName === 'configuration' && !!newCfg.color, JSON.stringify(newCfg));
await page.screenshot({ path: `${OUT}/dlg-config-color.png` });

// ---- Sensor: dimension with alert
await S(() => window.__phlippoStore.getState().setSensorEdit({ kind: 'mass' }));
await page.waitForTimeout(200);
await page.selectOption('[data-testid="sensor-type"]', 'dimension');
await page.click('[data-testid="sensor-pm"] .k-section-title:has-text("Alert") .k-section-check');
await page.click('[data-testid="sensor-ok"]');
await page.waitForTimeout(300);
const sensors = await S(() => window.__phlippoStore.getState().doc.sensors);
check('Dimension sensor with alert', sensors?.length === 1 && sensors[0].kind === 'dimension' && !!sensors[0].dim && !!sensors[0].alert, JSON.stringify(sensors));

// ---- Equations: radians
await S(() => window.__phlippoStore.getState().setDialog('equations'));
await page.waitForTimeout(300);
await page.selectOption('[data-testid="eq-angle"]', 'rad');
await page.click('.k-dialog button:has-text("OK")');
await page.waitForTimeout(300);
check('Equations angle units radians', (await S(() => window.__phlippoStore.getState().doc.equationAngleUnits)) === 'rad');

// ---- Appearances pane: back / forward, new folder
await S(() => window.__phlippoStore.getState().setTaskPane?.('appearances'));
await page.waitForTimeout(400);
if ((await page.locator('[data-testid="ap-newfolder"]').count()) === 1) {
  await page.click('.k-ap-row:has-text("Chrome")').catch(skip('dialogopts:142'));
  await page.click('[data-testid="ap-back"]');
  check('Appearances Back works', (await page.locator('[data-testid="ap-forward"]').isEnabled()));
  await page.click('[data-testid="ap-newfolder"]');
  await page.waitForTimeout(200);
  check('New Folder in My Appearances', (await page.locator('.k-ap-row:has-text("New Folder1")').count()) === 1);
  await page.screenshot({ path: `${OUT}/dlg-appearances.png` });
} else check('Appearances pane open', false);

// ---- Colour scheme: Green changes the selection colour token
await S(() => { const s = window.__phlippoStore.getState(); s.setPrefs({ ...s.prefs, 'colors.scheme': 'Green' }); });
await page.waitForTimeout(200);
const tok = await S(() => getComputedStyle(document.documentElement).getPropertyValue('--sk-selected').trim());
check('Green scheme sets the selection colour', tok.toLowerCase() === '#2f9e44', tok);
await S(() => { const s = window.__phlippoStore.getState(); s.setPrefs({ ...s.prefs, 'colors.scheme': 'Blue' }); });

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
