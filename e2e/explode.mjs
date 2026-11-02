// Exploded View: Explode PM, a step along Y for Plate<2>, ExplView1 in the Configurations, Collapse / Explode, reload.
// a coincident and a concentric mate stack the plates, the BOM lists the part, the file survives a reload.
import { chromium } from 'playwright';
import { exitCode, dontSave } from './lib/check.mjs';
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
const A = () => page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const boxes = s.rebuild.bodies.map((b) => { b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox; return { id: b.id, min: bb.min.toArray(), max: bb.max.toArray() }; });
  return { kind: s.doc.kind, components: (s.doc.components || []).map((c) => ({ id: c.id, name: c.name, fixed: c.fixed, position: c.position })), mates: (s.doc.mates || []).map((m) => ({ type: m.type, name: m.name })), bodies: boxes, errors: s.rebuild.errors, tab: s.tab, inserting: s.insertingComponent, mateEdit: s.mateEdit ? { type: s.mateEdit.draft.type, refs: s.mateEdit.draft.refs.map((r) => r.label) } : null };
});

const expandTree = async () => { for (let k = 0; k < 8; k++) { const n = await page.evaluate(() => { const c = [...document.querySelectorAll('.k-tree-row .caret[data-open="false"]')]; c.forEach((x) => x.click()); return c.length; }); if (!n) break; await page.waitForTimeout(80); } };
// Insert Component: the part follows the pointer; place it as a click beside the model would (first one at the origin)
const placeGhost = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); if (!s.insertGhost) return; const bs = s.rebuild.bodies; if (!bs.length) { s.placeInsertGhost(null); return; } let mx = -Infinity; for (const b of bs) { b.geometry.computeBoundingBox(); mx = Math.max(mx, b.geometry.boundingBox.max.x); } s.placeInsertGhost([mx + 20, 0, 0]); });
await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');

// ---- the plate: 80 x 80 x 10 with a Ø35 hole (as in the features check)
await page.click('.k-tree-row:has-text("Top Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;
await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
await page.mouse.click(cx, cy);
await page.mouse.click(cx + 300, cy - 300);
await page.keyboard.press('Escape');
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.mouse.click(cx + 150, cy);
await page.mouse.click(cx + 150, cy + 80);
await page.waitForTimeout(200);
await page.locator('.k-modify input.k-num').fill('80');
await page.locator('.k-modify input.k-num').press('Enter');
await page.waitForTimeout(200);
await page.mouse.click(cx, cy - 150);
await page.mouse.click(cx - 80, cy - 150);
await page.waitForTimeout(200);
await page.locator('.k-modify input.k-num').fill('80');
await page.locator('.k-modify input.k-num').press('Enter');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
const centre = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; const pts = Object.values(sk.points); const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); return window.__phlippoProject({ x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }); });
await page.click('.k-cm-iconbtn[data-tip="Circle"]');
await page.mouse.click(centre.x, centre.y);
await page.mouse.click(centre.x + 60, centre.y);
await page.keyboard.press('Escape');
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.mouse.click(centre.x + 60, centre.y);
await page.mouse.click(centre.x + 120, centre.y - 120);
await page.waitForTimeout(200);
await page.locator('.k-modify input.k-num').fill('35');
await page.locator('.k-modify input.k-num').press('Enter');
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(400);
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
await page.evaluate(() => window.__phlippoStore.getState().renameDocument('Plate'));
const plateFile = await page.evaluate(() => JSON.stringify({ format: 'phlippo-cad', ...window.__phlippoStore.getState().doc }));
check('plate part built', plateFile.includes('"Boss-Extrude1"'));

// ---- new assembly (File > New…, Assembly)
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("File")');
await page.click('.k-menu-item:has-text("New")');
await page.waitForTimeout(200);
await page.click('.k-doctype:has-text("Assembly")');
await page.click('.k-dialog-actions button:has-text("OK")');
await dontSave(page); // Save changes? → Don't Save, when it asks
await page.waitForTimeout(500);
let a = await A();
check('assembly document with the Assembly tab and Insert Component open', a.kind === 'assembly' && a.tab === 'assembly' && a.inserting, JSON.stringify({ kind: a.kind, tab: a.tab, inserting: a.inserting }));
await shot('e30-assembly-new');
// insert the plate twice through Browse… (file input)
await page.setInputFiles('#phlippo-open-file', { name: 'Plate.kcad', mimeType: 'application/json', buffer: Buffer.from(plateFile) });
await page.waitForTimeout(300);
await placeGhost();
await page.waitForTimeout(500);
a = await A();
check('first component inserted and fixed', a.components.length === 1 && a.components[0].fixed && a.components[0].name === 'Plate<1>', JSON.stringify(a.components));
check('assembly tree root', (await page.locator('.k-tree-row').first().innerText()).includes('Assem1'));
await page.click('.k-cm-big:has-text("Insert Components") .k-cm-main');
await page.waitForTimeout(200);
await page.setInputFiles('#phlippo-open-file', { name: 'Plate.kcad', mimeType: 'application/json', buffer: Buffer.from(plateFile) });
await page.waitForTimeout(300);
await placeGhost();
await page.waitForTimeout(500);
a = await A();
check('second instance Plate<2> placed next to the first', a.components.length === 2 && a.components[1].name === 'Plate<2>' && !a.components[1].fixed && a.components[1].position[0] >= 90, JSON.stringify(a.components));
check('two world bodies, no errors', a.bodies.length === 2 && Object.keys(a.errors).length === 0, JSON.stringify(a.errors));
check('tree shows (f) Plate<1> and (-) Plate<2>', (await page.locator('.k-tree-row:has-text("(f) Plate<1>")').count()) === 1 && (await page.locator('.k-tree-row:has-text("(-) Plate<2>")').count()) === 1);

const box = (id) => page.evaluate((id) => { const b = window.__phlippoStore.getState().rebuild.bodies.find((x) => x.id === id); b.geometry.computeBoundingBox(); return b.geometry.boundingBox.min.y; }, id);
const ids = await page.evaluate(() => window.__phlippoStore.getState().doc.components.map((c) => c.id));
const y0 = await box(ids[1]);
await page.click('.k-cm-tab:has-text("Assembly")');
await page.click('.k-cm-big:has-text("Exploded View") .k-cm-main');
await page.waitForTimeout(300);
check('Explode PM: Explode Steps, Add a Step', (await page.locator('[data-testid="explode-pm"]').count()) === 1 && (await page.locator('.k-section:has-text("Add a Step")').count()) === 1);
// click on the top face of Plate<2> in the graphics area
const pt = await page.evaluate((id) => { const b = window.__phlippoStore.getState().rebuild.bodies.find((x) => x.id === id); b.geometry.computeBoundingBox(); const bb = b.geometry.boundingBox; return window.__phlippoProjectWorld((bb.min.x + bb.max.x) / 2 + 5, bb.max.y, (bb.min.z + bb.max.z) / 2 + 5); }, ids[1]);
await page.mouse.click(pt.x, pt.y);
await page.waitForTimeout(200);
check('clicked component goes into the step', (await page.locator('[data-testid="explode-pm"] .k-selbox-row:has-text("Plate<2>")').count()) === 1);
await page.locator('[data-testid="explode-pm"] .k-pm-valuerow input.k-num').first().fill('60');
await page.locator('[data-testid="explode-pm"] .k-pm-valuerow input.k-num').first().press('Tab');
await page.waitForTimeout(300);
check('preview: Plate<2> moves 60 up', Math.abs((await box(ids[1])) - y0 - 60) < 0.01);
await page.click('[data-testid="explode-pm"] button:has-text("Add Step")');
await page.waitForTimeout(200);
check('Explode Step1 listed', (await page.locator('[data-step="Explode Step1"]').count()) === 1);
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('x1-explode-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(500);
const d = await page.evaluate(() => { const s = window.__phlippoStore.getState(); return { steps: (s.doc.explodeSteps ?? []).length, exploded: s.doc.exploded, pos: s.doc.components[1].position[1] }; });
check('doc stores one step, exploded, the real position unchanged', d.steps === 1 && d.exploded === true && Math.abs(d.pos - 0) < 1e-6, JSON.stringify(d));
check('exploded body 60 up after OK', Math.abs((await box(ids[1])) - y0 - 60) < 0.01);
check('an explode line runs from the assembled to the exploded position', await page.evaluate(() => { const c = (window.__phlippoStore.getState().rebuild.curves ?? []).filter((x) => x.dashed); return c.length === 1 && Math.abs(c[0].points[1].y - c[0].points[0].y - 60) < 0.01; }));
await page.click('.k-manager-tab[data-tip="Configurations"]');
await page.waitForTimeout(200);
await expandTree();
check('Configurations shows ExplView1 with Explode Step1', (await page.locator('.k-tree-row:has-text("ExplView1")').count()) === 1 && (await page.locator('.k-tree-row:has-text("Explode Step1")').count()) === 1);
await page.locator('.k-tree-row:has-text("ExplView1")').click({ button: 'right' });
await page.click('.k-menu-item:has-text("Collapse")');
await page.waitForTimeout(400);
check('Collapse puts Plate<2> back', Math.abs((await box(ids[1])) - y0) < 0.01);
await page.locator('.k-tree-row:has-text("ExplView1")').click({ button: 'right' });
await page.click('.k-menu-item:has-text("Explode")');
await page.waitForTimeout(400);
check('Explode again', Math.abs((await box(ids[1])) - y0 - 60) < 0.01);
await shot('x2-exploded');
await page.reload();
await page.waitForSelector('.k-viewport');
await page.locator('[data-testid="welcome-recent-0"]').click({ timeout: 10000 }); // the autosave waits under Recent Documents, by design
await page.waitForTimeout(800);
check('reload keeps the exploded view', (await page.evaluate(() => window.__phlippoStore.getState().doc.exploded)) === true && Math.abs((await box(ids[1])) - y0 - 60) < 0.01);

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
