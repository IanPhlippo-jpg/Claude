// Block G-J: the remaining inventory items: status bar readouts, Line Properties title + Insert Line message,
// Display/Delete Relations filters / Delete All / Entities, Hole Tool ANSI Inch, View ▸ Display submenu, Up Axis,
// Deform (point), Save As options, Publish to Phlippo Viewer (.html), drawing bend lines / notes.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light', acceptDownloads: true });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const S = (fn, arg) => page.evaluate(fn, arg);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const vol = () => S(() => { const s = window.__phlippoStore.getState(); return s.rebuild.bodies.reduce((a, b) => { const p = b.geometry.getAttribute('position'); let v = 0; for (let i = 0; i < p.count; i += 3) { const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i), bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1), cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2); v += (ax * (by * cz - bz * cy) + bx * (cy * az - cz * ay) + cx * (ay * bz - az * by)) / 6; } return a + Math.abs(v); }, 0); });
const errs = () => S(() => window.__phlippoStore.getState().rebuild.errors);
const menuItem = (label) => page.locator(`.k-menu-item:has-text("${label}")`).first();

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  sk = K.addLine(sk, { x: -30, y: -20 }, { x: 30, y: -20 })[0];
  sk = K.addLine(sk, { x: 30, y: -20 }, { x: 30, y: 20 })[0];
  sk = K.addLine(sk, { x: 30, y: 20 }, { x: -30, y: 20 })[0];
  sk = K.addLine(sk, { x: -30, y: 20 }, { x: -30, y: -20 })[0];
  sk = K.addCircle(sk, { x: 0, y: 0 }, 5)[0];
  const d = K.createDocument('Blok');
  d.sketches = { s1: sk };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);

// ---- status bar readouts in the sketch and on the body
await S(() => window.__phlippoStore.getState().editSketch('s1'));
await page.waitForTimeout(400);
const lineId = await S(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches.s1; const id = sk.entityOrder.find((e) => sk.entities[e].kind === 'line'); s.setSelection([{ kind: 'entity', id }]); return id; });
await page.waitForTimeout(300);
check('status bar: Length of the selected line (60)', /Length: 60mm/.test(await page.locator('[data-testid="status-readout"]').innerText().catch(() => '')), await page.locator('[data-testid="status-readout"]').innerText().catch(() => '?'));
check('Line Properties PM title', /Line Properties/.test(await page.locator('.k-pm-title').innerText()));
await S(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches.s1; const id = sk.entityOrder.find((e) => sk.entities[e].kind === 'circle'); s.setSelection([{ kind: 'entity', id }]); });
await page.waitForTimeout(300);
check('status bar: Diameter and Center of the circle', /Diameter: 10mm/.test(await page.locator('[data-testid="status-readout"]').innerText()) && /Center: 0mm, 0mm/.test(await page.locator('[data-testid="status-readout"]').innerText()));
check('Circle Properties PM title', /Circle Properties/.test(await page.locator('.k-pm-title').innerText()));
await S(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches.s1; const ids = Object.keys(sk.points).slice(0, 2); s.setSelection([{ kind: 'point', id: ids[0] }, { kind: 'point', id: ids[1] }]); });
await page.waitForTimeout(300);
check('status bar: Distance with dX dY dZ for two points', /Distance: .*dX: .*dY: .*dZ: 0mm/.test(await page.locator('[data-testid="status-readout"]').innerText()));
// Insert Line message box
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-iconbtn[data-tip="Line (L)"]');
await page.waitForTimeout(200);
check('Insert Line PM has the Message box of the original', (await page.locator('[data-testid="line-message"]').innerText()) === 'Edit the settings of the next new line or sketch a new line.');
await page.keyboard.press('Escape');
await shot('gj0-line-properties');
// Display/Delete Relations: filters, Delete All, Entities
await S(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches.s1; const l1 = sk.entityOrder[0], l2 = sk.entityOrder[1]; s.setSelection([{ kind: 'entity', id: l1 }, { kind: 'entity', id: l2 }]); s.addRelation('perpendicular', [l1, l2]); });
await page.waitForTimeout(300);
await S(() => window.__phlippoStore.getState().setTaskPane('relations'));
await page.waitForTimeout(300);
check('Display/Delete Relations pane with the filter list', (await page.locator('[data-testid="relations-filter"] option').count()) === 8);
const relCount = await page.locator('[data-testid="relations-pane"] .k-list li').count();
check('relations listed', relCount >= 1, String(relCount));
await page.locator('[data-testid="relations-pane"] .k-list li').first().click();
await page.waitForTimeout(200);
check('Entities of the selected relation listed', (await page.locator('[data-testid="relations-entities"] .k-selbox-row').count()) >= 1);
await page.locator('[data-testid="relations-filter"]').selectOption('Locked');
await page.waitForTimeout(200);
check('the Locked filter shows no relations here', /No relations match/.test(await page.locator('[data-testid="relations-pane"] .k-list').innerText()));
await page.locator('[data-testid="relations-filter"]').selectOption('All in this sketch');
await shot('gj1-relations');
await page.locator('[data-testid="relations-deleteall"]').click();
await page.waitForTimeout(300);
check('Delete All removes the relations', (await S(() => window.__phlippoStore.getState().doc.sketches.s1.constraintOrder.length)) === 0);
await S(() => window.__phlippoStore.getState().setTaskPane(null));
await S(() => window.__phlippoStore.getState().exitSketch());
await page.waitForTimeout(400);
// body edge readout
await S(() => { const s = window.__phlippoStore.getState(); const e = s.rebuild.bodies[0].edges.find((x) => x.straight && Math.abs(x.length - 60) < 0.5); s.toggleSelectedEdge(e.id); });
await page.waitForTimeout(300);
check('status bar: Length of a body edge', /Length: 60mm/.test(await page.locator('[data-testid="status-readout"]').innerText()));
await S(() => window.__phlippoStore.getState().toggleSelectedEdge(window.__phlippoStore.getState().selectedEdges[0]));

// ---- Hole Tool: ANSI Inch standard with its sizes
await S(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const f = b.faces.find((x) => !x.curved && x.normal[1] > 0.99); s.setSelectedFace({ bodyId: b.id, faceId: f.id }); s.startHole(); });
await page.waitForTimeout(400);
await page.locator('[data-testid="hole-standard"]').selectOption('ANSI Inch');
await page.waitForTimeout(200);
check('ANSI Inch sizes (#4 … 1/2) and the fit list', (await page.locator('[data-testid="hole-size"] option').count()) === 8 && (await page.locator('[data-testid="hole-size"]').inputValue()) === '#4');
await page.locator('[data-testid="hole-size"]').selectOption('1/4');
await page.waitForTimeout(200);
check('1/4 Normal fit sets the diameter to 7.1', Math.abs((await S(() => window.__phlippoStore.getState().featureEdit.draft.diameter)) - 7.1) < 1e-6);
await shot('gj2-hole-ansi');
await page.click('.k-pm-cancel');

// ---- View ▸ Display submenu and Up Axis
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("View")');
await page.waitForTimeout(150);
for (const l of ['Display ▸ ✓ Shaded With Edges', 'Display ▸ Shaded', 'Display ▸ Hidden Lines Visible', 'Display ▸ Wireframe', 'Display ▸ Zebra Stripes', 'Display ▸ Perspective', 'Display ▸ Shadows In Shaded Mode', 'Display ▸ Tangent Edges ▸ ✓ Tangent Edges Visible', 'Modify ▸ Up Axis ▸ ✓ Y up', 'Modify ▸ Up Axis ▸ Z up']) check(`View menu has ${l}`, (await menuItem(l).count()) === 1);
await menuItem('Display ▸ Zebra Stripes').click();
await page.waitForTimeout(200);
check('Display ▸ Zebra Stripes toggles the zebra display', await S(() => window.__phlippoStore.getState().show.zebra));
await S(() => window.__phlippoStore.getState().toggleShow('zebra'));
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("View")');
await menuItem('Modify ▸ Up Axis ▸ Z up').click();
await page.waitForTimeout(600);
const qZ = await S(() => { const c = window.__phlippoCamera; c.setView('top'); return window.__phlippoStore.getState().prefs['view.upAxis']; });
await page.waitForTimeout(500);
check('Up Axis Z stored in the preferences', qZ === 'Z');
check('Front view with Z up: the world Z axis points up the screen', await S(() => { const c = window.__phlippoCamera; c.setView('front'); return new Promise((r) => setTimeout(() => { const THREE_V = window.__phlippoScene.position.constructor; const p0 = c.worldToPixel(new THREE_V(0, 0, 0)), p1 = c.worldToPixel(new THREE_V(0, 0, 10)); r(p1.y < p0.y - 1 && Math.abs(p1.x - p0.x) < 1); }, 600)); }));
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("View")');
await menuItem('Modify ▸ Up Axis ▸ Y up').click();
await page.waitForTimeout(600);
check('Front view with Y up again: the world Y axis points up the screen', await S(() => { const c = window.__phlippoCamera; c.setView('front'); return new Promise((r) => setTimeout(() => { const THREE_V = window.__phlippoScene.position.constructor; const p0 = c.worldToPixel(new THREE_V(0, 0, 0)), p1 = c.worldToPixel(new THREE_V(0, 10, 0)); r(p1.y < p0.y - 1); }, 500)); }));

// ---- Deform (point) on the top face
await page.keyboard.press('Control+7');
await page.waitForTimeout(400);
const v0 = await vol();
await S(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const f = b.faces.find((x) => !x.curved && x.normal[1] > 0.99); s.setSelectedFace({ bodyId: b.id, faceId: f.id }); s.startDeform(); });
await page.waitForTimeout(400);
check('Deform PM: Deform Type (Point), Deform Point, Deform Region, Shape Options', (await page.locator('.k-pm-title:has-text("Deform")').count()) >= 1 && (await page.locator('[data-testid="deform-point"] .k-selbox-row').count()) === 1 && (await page.locator('[data-testid="deform-rigid"]').count()) === 1);
await page.locator('[data-testid="deform-flexible"]').click();
await page.waitForTimeout(600);
await shot('gj3-deform-pm');
await page.click('.k-pm-ok');
await page.waitForTimeout(1200);
const v1 = await vol();
check('Deform1 presses a dent into the top (volume drops, no error)', v0 - v1 > 200 && v0 - v1 < 4000 && !Object.keys(await errs()).length, `${(v0 - v1).toFixed(0)} ${JSON.stringify(await errs())}`);
check('tree: Deform1', await S(() => window.__phlippoStore.getState().doc.features.some((f) => f.name === 'Deform1')));
await shot('gj4-deform');

// ---- Publish to Phlippo Viewer (.html)
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("File")');
await page.waitForTimeout(150);
check('File menu has Publish to Phlippo Viewer', (await menuItem('Publish to Phlippo Viewer (*.html)…').count()) === 1);
const dl = page.waitForEvent('download', { timeout: 8000 });
await menuItem('Publish to Phlippo Viewer (*.html)…').click();
const file = await dl;
const html = await (await file.createReadStream()).toArray().then((b) => Buffer.concat(b).toString('utf8'));
check('Blok.html downloads with the embedded model and the viewer script', file.suggestedFilename() === 'Blok.html' && html.includes('window.__PHLIPPO_MODEL__=') && html.includes('"name":"Deform1"') && html.includes('Phlippo Viewer') && !/https?:\/\//.test(html), file.suggestedFilename());
// the published page works on its own
const viewer = await browser.newPage({ viewport: { width: 1000, height: 700 } });
await viewer.setContent(html, { waitUntil: 'load' });
await viewer.waitForTimeout(500);
check('the viewer page lists the body and draws the canvas', (await viewer.locator('#bodies label').count()) === 1 && (await viewer.evaluate(() => { const c = document.getElementById('v'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let dark = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 200) dark++; return dark > 500; })));
await viewer.screenshot({ path: `${OUT}/gj5-viewer.png` });
await viewer.close();

// ---- Save As options (browser): save as copy keeps the open document
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("File")');
await menuItem('Save As…').click();
await page.waitForTimeout(300);
check('Save As dialog: file name, Save as copy and continue / and open, Include all referenced components', (await page.locator('[data-testid="saveas-dialog"]').count()) === 1 && (await page.locator('[data-testid="saveas-copy"]').count()) === 1);
await page.locator('[data-testid="saveas-name"]').fill('Blok-v2');
await page.locator('[data-testid="saveas-copy"]').check();
const dl2 = page.waitForEvent('download', { timeout: 8000 });
await page.locator('[data-testid="saveas-ok"]').click();
const f2 = await dl2;
check('Save as copy downloads Blok-v2.kcad and the open document keeps its name', f2.suggestedFilename() === 'Blok-v2.kcad' && (await S(() => window.__phlippoStore.getState().doc.name)) === 'Blok');

// ---- drawing: bend lines and bend notes of a flat pattern view
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('p', 'Profile', 'front');
  sk = K.addLine(sk, { x: 0, y: 0 }, { x: 40, y: 0 })[0];
  sk = K.addLine(sk, { x: 40, y: 0 }, { x: 40, y: 30 })[0];
  const part = K.createDocument('Hoek');
  part.sketches = { p: sk };
  part.sheetMetal = { thickness: 3, bendRadius: 3, kFactor: 0.5 };
  part.features = [
    { id: 'k', type: 'sketch', name: 'Profile', sketchId: 'p', suppressed: false },
    { id: 'bf', type: 'baseFlange', name: 'Base-Flange1', sketchId: 'p', suppressed: false, depth: 60, midPlane: true, reverse: false, flipDir: false, merge: true },
    { id: 'fp', type: 'flatPattern', name: 'Flat-Pattern1', suppressed: false },
  ];
  const d = K.createDocument('Tekening', 'drawing');
  d.sheets[0].views = [{ id: 'v1', name: 'Drawing View1', type: 'top', position: [120, 120], displayStyle: 'hiddenRemoved', model: part, modelName: 'Hoek<1>', bendLines: true, bendNotes: true }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(1200);
check('drawing view of the flat pattern shows the bend line with its note', (await page.locator('[data-testid="bend-line"]').count()) >= 1 && /UP 90° R 3/.test(await page.locator('[data-testid="bend-note"]').first().evaluate((e) => e.textContent ?? '')), String(await page.locator('[data-testid="bend-line"]').count()));
await shot('gj6-drawing-bendlines');

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
