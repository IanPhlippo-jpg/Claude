// Multi-body (videos 11/44/45/52): a second boss away from the first becomes its own body; Solid Bodies folder,
// Hide/Show Body, Material per body, Merge result off, Feature Scope, Combine.
import { menuPath } from './lib/menu.mjs';
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
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const B = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return { bodies: s.rebuild.bodies.map((b) => b.id), hidden: s.doc.hiddenBodies ?? [], mats: s.doc.bodyMaterials ?? {}, errors: s.rebuild.errors, features: s.doc.features.map((f) => f.name) }; });

const expandTree = async () => { for (let k = 0; k < 8; k++) { const n = await page.evaluate(() => { const c = [...document.querySelectorAll('.k-tree-row .caret[data-open="false"]')]; c.forEach((x) => x.click()); return c.length; }); if (!n) break; await page.waitForTimeout(80); } };
await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;

const boxOnTop = async (x0, y0, x1, y1, depth, merge = true) => {
  await page.keyboard.press('Escape');
  await page.click('.k-tree-row:has-text("Top Plane")', { clickCount: 2 });
  await page.waitForTimeout(600);
  // the same zoom for every sketch: 4 px per mm around the viewport centre
  await page.evaluate(() => { const c = window.__phlippoCamera; const vp = document.querySelector('.k-viewport').getBoundingClientRect(); c.zoomAt(vp.width / 2, vp.height / 2, 0.25 / c.scale); });
  await page.waitForTimeout(200);
  // corners in sketch millimetres, projected to the screen (zoom to fit changes the scale per sketch)
  const pa = await page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x0, y0]);
  const pb = await page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x1, y1]);
  // a slow runner drops a click now and then: draw until the four lines of the rectangle are in the sketch
  for (let k = 0; k < 3; k++) {
    await page.click('.k-cm-iconbtn[data-tip="Corner Rectangle"]');
    await page.mouse.click(pa.x, pa.y);
    await page.mouse.click(pb.x, pb.y);
    const drawn = await page.waitForFunction(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return !!sk && Object.values(sk.entities).filter((e) => e.kind === 'line').length >= 4; }, undefined, { timeout: 5000 }).then(() => true, () => false);
    if (drawn) break;
  }
  const sketchId = await page.evaluate(() => window.__phlippoStore.getState().activeSketchId);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  // a slow runner: the sketch must be closed before the Features tab, and the PM takes a moment
  await page.waitForFunction(() => !window.__phlippoStore.getState().activeSketchId, undefined, { timeout: 15000 }).catch(() => undefined);
  // the sketch just left is the one to extrude: said explicitly, so a lost selection on a slow runner does not matter
  await page.evaluate((id) => { const s = window.__phlippoStore.getState(); const f = s.doc.features.find((x) => x.type === 'sketch' && x.sketchId === id); if (f) s.setSelectedFeature(f.id); }, sketchId);
  await page.click('.k-cm-tab:has-text("Features")');
  await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
  await page.locator('.k-pm-valuerow input.k-num').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(400);
  await page.locator('.k-pm-valuerow input.k-num').first().fill(String(depth));
  await page.locator('.k-pm-valuerow input.k-num').first().press('Tab');
  if (!merge) await page.locator('.k-check:has-text("Merge result") input').uncheck();
  await page.waitForTimeout(300);
  await page.click('.k-pm-ok');
  await page.waitForTimeout(700);
};

// body 1 at the left, body 2 at the right (no contact)
await boxOnTop(-60, -20, -20, 20, 10);
await boxOnTop(20, -20, 60, 20, 10);
let b = await B();
check('two separate bosses give Solid Bodies(2)', b.bodies.length === 2 && Object.keys(b.errors).length === 0, JSON.stringify(b));
check('tree shows Solid Bodies(2)', (await page.locator('.k-tree-row:has-text("Solid Bodies(2)")').count()) === 1);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('m1-two-bodies');

await expandTree();
// Hide Body on the second body
await page.locator('.k-tree-row[data-id^="body-"]:has-text("Boss-Extrude2")').first().click({ button: 'right' });
await page.click('.k-menu-item:has-text("Hide Body")');
await page.waitForTimeout(400);
b = await B();
check('Hide Body stores the hidden body', b.hidden.length === 1);
const drawn = await page.evaluate(() => { const bs = window.__phlippoBodyScene; return bs && bs.group ? bs.group.children.filter((o) => o.type === 'Mesh' && o.name).length : -1; });
check('hidden body is not drawn', drawn === 1 || drawn === -1, String(drawn));
await shot('m2-hidden-body');
await page.locator('.k-tree-row[data-id^="body-"]:has-text("Boss-Extrude2")').first().click({ button: 'right' });
await page.click('.k-menu-item:has-text("Show Body")');
await page.waitForTimeout(400);
check('Show Body', (await B()).hidden.length === 0);

// Material per body: 1060 Alloy on body 2
await page.locator('.k-tree-row[data-id^="body-"]:has-text("Boss-Extrude2")').first().click({ button: 'right' });
await page.click('.k-menu-item:has-text("Material")');
await page.waitForTimeout(400);
await page.click('.k-material-cat:has-text("Aluminium Alloys")');
await page.click('.k-material-item:has-text("1060 Alloy")');
await page.click('.k-material .k-dialog-actions button:has-text("Apply")');
await page.click('.k-material .k-dialog-actions button:has-text("Close")');
await page.waitForTimeout(400);
b = await B();
check('material stored for body2 only', Object.keys(b.mats).length === 1 && Object.values(b.mats)[0].name === '1060 Alloy' && !(await page.evaluate(() => window.__phlippoStore.getState().doc.material)), JSON.stringify(b.mats));
// the body's material is a row of its own under the body, by design
await page.locator('.k-tree-row[data-id^="body-"]:has-text("Boss-Extrude2") .caret').first().click();
await page.waitForTimeout(150);
check('tree shows the material as a row under the body', (await page.locator('.k-tree-row[data-id^="bodymat-"]:has-text("1060 Alloy")').count()) === 1);
await shot('m3-body-material');

// Merge result off: a third boss overlapping body 1 stays separate
await boxOnTop(-50, -10, -30, 10, 20, false);
b = await B();
check('Merge result off keeps the overlapping boss as body 3', b.bodies.length === 3, JSON.stringify(b.bodies));
check('tree shows Solid Bodies(3)', (await page.locator('.k-tree-row:has-text("Solid Bodies(3)")').count()) === 1);

// Combine ▸ Add body 1 and body 3 via Insert ▸ Features ▸ Combine…
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("Insert")');
await menuPath(page, 'Features ▸ Combine…').click();
await page.waitForTimeout(300);
check('Combine PM with Operation Type and Bodies to Combine', (await page.locator('.k-pm-title').innerText()).includes('Combine1') && (await page.locator('.k-section:has-text("Bodies to Combine")').count()) === 1);
// keep only body1 and body3 ticked
const boxes = page.locator('.k-section:has-text("Bodies to Combine") input[type=checkbox]');
const n = await boxes.count();
for (let i = 0; i < n; i++) {
  const label = (await boxes.nth(i).locator('..').innerText()).trim();
  if (label.startsWith('Boss-Extrude2')) await boxes.nth(i).uncheck();
}
await shot('m4-combine-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
b = await B();
check('Combine1 adds body1 + body3 -> two bodies left, no errors', b.bodies.length === 2 && Object.keys(b.errors).length === 0 && b.features.includes('Combine1'), JSON.stringify(b));
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('m5-combined');

// Feature Scope: a cut through everything only touches the body it reaches
await page.keyboard.press('Escape');
await page.click('.k-tree-row:has-text("Top Plane")', { clickCount: 2 });
await page.waitForTimeout(600);
await page.evaluate(() => window.__phlippoZoomFit());
await page.waitForTimeout(300);
const cc = await page.evaluate(() => window.__phlippoProject({ x: 40, y: 0 }));
const cr = await page.evaluate(() => window.__phlippoProject({ x: 45, y: 0 }));
await page.click('.k-cm-iconbtn[data-tip="Circle"]');
await page.mouse.click(cc.x, cc.y);
await page.mouse.click(cr.x, cr.y);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Cut") .k-cm-main');
await page.waitForTimeout(400);
await page.locator('.k-section:has-text("Direction 1") select.k-input').first().selectOption('throughAll');
check('Feature Scope section appears with several bodies', (await page.locator('.k-section:has-text("Feature Scope")').count()) === 1);
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
b = await B();
check('cut applied without errors; bodies unchanged', b.bodies.length === 2 && Object.keys(b.errors).length === 0, JSON.stringify(b.errors));

// reload keeps hidden bodies / materials / combine
await page.reload();
await page.waitForSelector('.k-viewport');
await page.locator('[data-testid="welcome-recent-0"]').click({ timeout: 10000 }); // the autosave waits under Recent Documents, by design
await page.waitForTimeout(800);
b = await B();
check('reload keeps the bodies, the material and Combine1', b.bodies.length === 2 && Object.keys(b.mats).length === 1 && b.features.includes('Combine1'), JSON.stringify(b));

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
