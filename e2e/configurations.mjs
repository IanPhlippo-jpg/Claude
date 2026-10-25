// Configurations (ConfigurationManager, Modify Configurations, component configuration in an assembly, mass of all components).
import { chromium } from 'playwright';
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
const C = () => page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const cfgs = s.doc.configurations ?? [];
  const ex = s.doc.features.find((f) => f.type === 'extrude');
  return { names: cfgs.map((c) => c.name), active: cfgs.find((c) => c.id === s.doc.activeConfiguration)?.name ?? 'Default', depth: ex?.depth, suppressed: ex?.suppressed, dims: cfgs.map((c) => c.dims['D1@Boss-Extrude1']), sup: cfgs.map((c) => c.suppressed.length), bodies: s.rebuild.bodies.length, tab: s.managerTab, errors: s.rebuild.errors };
});

// Insert Component: the part follows the pointer; place it as a click beside the model would (first one at the origin)
const placeGhost = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); if (!s.insertGhost) return; const bs = s.rebuild.bodies; if (!bs.length) { s.placeInsertGhost(null); return; } let mx = -Infinity; for (const b of bs) { b.geometry.computeBoundingBox(); mx = Math.max(mx, b.geometry.boundingBox.max.x); } s.placeInsertGhost([mx + 20, 0, 0]); });
await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
// a 40 x 40 plate, 10 thick
await page.click('.k-tree-row:has-text("Top Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(cx, cy);
await page.mouse.click(cx + 200, cy - 200);
await page.keyboard.press('Escape');
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.mouse.click(cx + 100, cy);
await page.mouse.click(cx + 100, cy + 80);
await page.waitForTimeout(200);
await page.locator('.k-modify input.k-num').fill('40');
await page.locator('.k-modify input.k-num').press('Enter');
await page.waitForTimeout(200);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(400);
await page.locator('.k-pm-valuerow input.k-num').first().fill('10');
await page.locator('.k-pm-valuerow input.k-num').first().press('Enter');
await page.waitForTimeout(300);
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
let c = await C();
check('plate built', c.bodies === 1 && c.depth === 10, JSON.stringify(c));

// ---- ConfigurationManager tab
await page.click('.k-manager-tab[data-tip="ConfigurationManager"]');
await page.waitForTimeout(200);
const tree = (await page.locator('.k-tree').innerText()).replace(/\s+/g, ' ');
check('ConfigurationManager lists Part1 Configuration(s) (Default) and Default [ Part1 ]', /Part1 Configuration\(s\) \(Default\)/.test(tree) && /Default \[ Part1 \]/.test(tree) && /Tables/.test(tree), tree);
await shot('c1-configmanager');
// Add Configuration… via the right mouse button on the top node
await page.click('.k-tree-row:has-text("Configuration(s)")', { button: 'right' });
await page.click('.k-menu-item:has-text("Add Configuration")');
await page.waitForTimeout(200);
check('Add Configuration PropertyManager', (await page.locator('[data-testid="configuration-pm"]').count()) === 1 && (await page.locator('.k-pm-title').innerText()).includes('Add Configuration'));
await shot('c2-add-configuration-pm');
await page.locator('[data-testid="configuration-pm"] input.k-input').first().fill('210');
await page.locator('[data-testid="configuration-pm"] input.k-input').nth(1).fill('210 mm plate');
await page.click('.k-pm-ok');
await page.waitForTimeout(300);
c = await C();
check('configuration 210 added and active', c.names.join(',') === 'Default,210' && c.active === '210', JSON.stringify(c));
const tree2 = (await page.locator('.k-tree').innerText()).replace(/\s+/g, ' ');
check('tree shows (210) and the 210 row', /Configuration\(s\) \(210\)/.test(tree2) && /210 \[ Part1 \]/.test(tree2), tree2);
await shot('c3-two-configurations');

// ---- Modify Configurations table: depth 20 in "210", new row "270" with 27
await page.click('.k-tree-row:has-text("Configuration(s)")', { button: 'right' });
await page.click('.k-menu-item:has-text("Modify Configurations")');
await page.waitForTimeout(200);
check('Modify Configurations dialog opens', (await page.locator('.k-dialog:has-text("Modify Configurations")').count()) === 1);
await page.locator('.k-cfg-toolbar select').first().selectOption('D1@Boss-Extrude1');
await page.waitForTimeout(100);
const head = (await page.locator('.k-cfg-table thead').innerText()).replace(/\s+/g, ' ');
check('table has the Boss-Extrude1 ▾ / D1 column', /Boss-Extrude1/.test(head) && /D1/.test(head), head);
await page.locator('.k-cfg-table tr[data-config="210"] input[type=number]').fill('20');
await page.locator('.k-cfg-table tr.k-cfg-new input').fill('270');
await page.locator('.k-cfg-table tr.k-cfg-new input').press('Enter');
await page.waitForTimeout(100);
check('new row 270 (new) appears', (await page.locator('.k-cfg-table tr[data-config="270"]').count()) === 1);
await page.locator('.k-cfg-table tr[data-config="270"] input[type=number]').fill('27');
await shot('c4-modify-configurations');
await page.click('.k-dialog-actions button:has-text("OK")');
await page.waitForTimeout(600);
c = await C();
check('table applied: 210 active with depth 20, 270 stored with 27', c.names.join(',') === 'Default,210,270' && c.active === '210' && c.depth === 20 && c.dims[2] === 27, JSON.stringify(c));

// ---- show configurations by double-click
await page.dblclick('.k-tree-row:has-text("Default [ Part1 ]")');
await page.waitForTimeout(500);
c = await C();
check('Default shown: depth back to 10', c.active === 'Default' && c.depth === 10 && c.dims[1] === 20, JSON.stringify(c));
await page.dblclick('.k-tree-row:has-text("270 [ Part1 ]")');
await page.waitForTimeout(500);
c = await C();
check('270 shown: depth 27, one body', c.active === '270' && c.depth === 27 && c.bodies === 1, JSON.stringify(c));
await shot('c5-config-270');

// ---- Modify box: All Configurations writes the value into every configuration
await page.click('.k-manager-tab[data-tip="FeatureManager design tree"]');
await page.waitForTimeout(200);
await page.locator('.k-tree-row:has-text("Boss-Extrude1")').last().click({ button: 'right' });
await page.click('.k-menu-item:has-text("Edit Sketch")');
await page.waitForTimeout(400);
await page.keyboard.press('Control+5');
await page.waitForTimeout(400);
let scopeFound = false;
const nDim = await page.locator('.k-dim').count();
if (nDim) {
  await page.locator('.k-dim').first().dispatchEvent('dblclick');
  await page.waitForTimeout(300);
  scopeFound = (await page.locator('[data-testid="modify-scope"]').count()) === 1;
}
check('Modify box offers This/All/Specify Configuration(s)', scopeFound, 'dims on screen: ' + nDim);
if (scopeFound) {
  await page.locator('[data-testid="modify-scope"]').selectOption('all');
  await page.locator('.k-modify input.k-num').fill('50');
  await page.locator('.k-modify input.k-num').press('Enter');
  await page.waitForTimeout(400);
  const allDims = await page.evaluate(() => (window.__phlippoStore.getState().doc.configurations ?? []).map((c) => c.dims['D1@Sketch1']));
  check('All Configurations: D1@Sketch1 = 50 in every configuration', allDims.length === 3 && allDims.every((v) => v === 50), JSON.stringify(allDims));
}
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Exit Sketch") .k-cm-main').catch(() => page.keyboard.press('Escape'));
await page.waitForTimeout(500);

// ---- Configure Feature from the FeatureManager: suppress Boss-Extrude1 in Default only
await page.locator('.k-tree-row:has-text("Boss-Extrude1")').last().click({ button: 'right' });
await page.click('.k-menu-item:has-text("Configure Feature")');
await page.waitForTimeout(200);
check('Configure Feature opens the table with a Suppress column', (await page.locator('.k-cfg-table thead').innerText()).includes('Suppress'));
await page.locator('.k-cfg-table tr[data-config="Default"] select').selectOption('suppressed');
await page.click('.k-dialog-actions button:has-text("OK")');
await page.waitForTimeout(400);
c = await C();
check('Default has the feature suppressed, 270 (active) still built', c.sup[0] === 1 && c.bodies === 1 && !c.suppressed, JSON.stringify(c));

// ---- reload keeps configurations
await page.reload();
await page.waitForSelector('.k-viewport');
await page.locator('[data-testid="welcome-recent-0"]').click({ timeout: 4000 }).catch(() => {}); // the autosave waits under Recent Documents, as the original
await page.waitForTimeout(800);
c = await C();
check('configurations survive a reload', c.names.join(',') === 'Default,210,270' && c.active === '270' && c.depth === 27, JSON.stringify(c));
check('FeatureManager top node names the active configuration', (await page.locator('.k-tree-row').first().innerText()).includes('(270)'));

// ---- assembly: three instances with the configurations 210 / 270 / Default
const plateFile = await page.evaluate(() => JSON.stringify({ format: 'phlippo-cad', ...window.__phlippoStore.getState().doc }));
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("File")');
await page.click('.k-menu-item:has-text("New")');
await page.waitForTimeout(200);
await page.click('.k-doctype:has-text("Assembly")');
await page.click('.k-dialog-actions button:has-text("OK")');
await page.locator('[data-testid="ask-no"]').click({ timeout: 1500 }).catch(() => {}); // Save changes? → Don't Save
await page.waitForTimeout(500);
for (let i = 0; i < 3; i++) {
  if (i) await page.click('.k-cm-big:has-text("Insert Components") .k-cm-main');
  await page.waitForTimeout(200);
  await page.setInputFiles('#phlippo-open-file', { name: 'Part1.kcad', mimeType: 'application/json', buffer: Buffer.from(plateFile) });
  await page.waitForTimeout(300);
  await placeGhost();
  await page.waitForTimeout(500);
}
const A = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return { comps: (s.doc.components ?? []).map((c) => ({ name: c.name, cfg: c.configuration })), bodies: s.rebuild.bodies.map((b) => { b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox; return Math.round((bb.max.y - bb.min.y) * 100) / 100; }), errors: s.rebuild.errors }; });
let a = await A();
check('three instances inserted with configuration 270', a.comps.length === 3 && a.comps.every((x) => x.cfg === '270') && a.bodies.length === 3, JSON.stringify(a));
check('tree shows Part1<1> (270)', (await page.locator('.k-tree-row:has-text("Part1<1> (270)")').count()) === 1);
// change the configuration of instance 2 to 210 and of instance 3 to Default (suppressed extrude -> no body)
await page.click('.k-tree-row:has-text("Part1<2>")', { button: 'right' });
await page.click('.k-menu-item:has-text("210")');
await page.waitForTimeout(500);
await page.click('.k-tree-row:has-text("Part1<3>")', { button: 'right' });
await page.click('.k-menu-item:has-text("Default")');
await page.waitForTimeout(500);
a = await A();
check('instances show 270 / 210 / Default', a.comps.map((x) => x.cfg).join(',') === '270,210,Default', JSON.stringify(a.comps));
check('world bodies follow the configuration (27 and 20 thick; Default has no body)', a.bodies.length === 2 && a.bodies.includes(27) && a.bodies.includes(20), JSON.stringify(a.bodies));
check('tree shows Part1<2> (210)', (await page.locator('.k-tree-row:has-text("Part1<2> (210)")').count()) === 1);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('c6-assembly-configurations');
// Mass Properties of the assembly adds all components (50 x 40 x 27 + 50 x 40 x 20 = 94000 mm³)
await page.click('.k-cm-tab:has-text("Evaluate")');
await page.click('.k-cm-big:has-text("Mass Properties") .k-cm-main');
await page.waitForTimeout(500);
const report = await page.locator('.k-mass-report').innerText();
const mv = /Volume = ([\d.]+)/.exec(report);
const expectVol = await page.evaluate(() => window.__phlippoStore.getState().rebuild.bodies.reduce((sum, b) => { b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox; return sum + (bb.max.x - bb.min.x) * (bb.max.y - bb.min.y) * (bb.max.z - bb.min.z); }, 0));
check('assembly Mass Properties sums the components', !!mv && Math.abs(parseFloat(mv[1]) - expectVol) < 1, `${mv && mv[1]} vs ${expectVol.toFixed(1)}`);
check('report names the configuration', /Configuration: Default/.test(report));
await shot('c7-assembly-mass');
await page.click('.k-dialog-actions button:has-text("Close")');
// BOM: one row per configuration
await page.click('.k-cm-tab:has-text("Assembly")');
await page.click('.k-cm-big:has-text("Bill of Materials") .k-cm-main');
await page.waitForTimeout(400);
const bom = (await page.locator('.k-bom tbody').innerText()).replace(/\s+/g, ' ');
check('BOM lists a row per configuration', (bom.match(/Part1/g) || []).length === 3, bom);
await shot('c8-bom');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
