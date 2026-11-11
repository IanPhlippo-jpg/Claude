// Phase 5 check: a plate part is built, a drawing is created (Sheet Format/Size), the plate is inserted as a
// Model View, projected views are placed, a dimension, a center mark and a note are added, the drawing reloads.
import { chromium } from 'playwright';
import { exitCode, skip, dontSave } from './lib/check.mjs';
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
const D = () => page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const sh = s.doc.sheets && s.doc.sheets[0];
  return { kind: s.doc.kind, tab: s.tab, edit: s.drawingEdit ? { mode: s.drawingEdit.mode, hasModel: !!s.drawingEdit.model, dimStart: !!s.drawingEdit.dimStart } : null, sheet: sh ? { size: sh.size, scale: sh.scale, views: sh.views.map((v) => ({ name: v.name, type: v.type, position: v.position, parent: !!v.parentId })), dims: sh.dimensions.map((d) => ({ kind: d.kind, value: d.value, orientation: d.orientation })), marks: sh.centerMarks.length, notes: sh.notes.map((n) => n.text) } : null };
});
const px = (p) => page.evaluate((q) => window.__phlippoSheet.toPx(q), p);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');

// ---- the plate 80 x 80 x 10 with a Ø35 hole
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

// ---- new drawing: File > New…, Drawing -> Sheet Format/Size -> OK -> Model View
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("File")');
await page.click('.k-menu-item:has-text("New")');
await page.waitForTimeout(200);
await page.click('.k-doctype:has-text("Drawing")');
await page.click('.k-dialog-actions button:has-text("OK")');
// Save changes? → Don't Save, when it asks. On a slow runner the question came after the 300 ms dontSave waits, and
// stood open next to Sheet Format/Size (two dialog titles, release-3of3 on 307d4d0): wait for one of the two first
const sheetTitle = page.locator('.k-dialog-title:has-text("Sheet Format/Size")');
await page.locator('[data-testid="ask-no"]').or(sheetTitle).first().waitFor({ timeout: 30000 });
await dontSave(page);
await sheetTitle.waitFor({ timeout: 30000 });
check('Sheet Format/Size dialog', (await sheetTitle.count()) === 1 && (await page.locator('[data-testid="ask-no"]').count()) === 0);
await page.click('.k-sheetfmt-list .k-selbox-row:has-text("A3 (ISO)")');
await shot('e40-sheet-format');
await page.click('.k-dialog-actions button:has-text("OK")');
await page.waitForTimeout(500);
let d = await D();
check('drawing document with View Layout tab and Model View open', d.kind === 'drawing' && d.tab === 'viewLayout' && d.edit && d.edit.mode === 'modelView' && !d.edit.hasModel, JSON.stringify({ kind: d.kind, tab: d.tab, edit: d.edit }));
check('sheet A3 landscape, scale 1:1', d.sheet && d.sheet.size === 'A3' && d.sheet.scale[0] === 1 && d.sheet.scale[1] === 1, JSON.stringify(d.sheet));
check('Model View Property Panel', (await page.locator('.k-pm-title').innerText()).includes('Model View'));
check('status bar Editing Sheet1', (await page.locator('.k-statusbar').innerText()).includes('Editing Sheet1'));
// Browse… -> the plate file
await page.setInputFiles('#phlippo-open-file', { name: 'Plate.kcad', mimeType: 'application/json', buffer: Buffer.from(plateFile) });
await page.waitForTimeout(500);
d = await D();
check('model chosen, orientation step', d.edit && d.edit.hasModel, JSON.stringify(d.edit));
// Automatic scaling of new drawing views: the 80 mm plate gets a larger standard scale; the rest of this test measures at 1 : 1
const autoScale = await page.evaluate(() => window.__phlippoStore.getState().doc.sheets[0].scale);
check('automatic scaling picks a standard scale for the first view', JSON.stringify(autoScale) !== '[1,1]' && [[2, 1], [5, 1]].some((x) => x[0] === autoScale[0] && x[1] === autoScale[1]), JSON.stringify(autoScale));
await page.evaluate(() => window.__phlippoStore.getState().setSheet({ scale: [1, 1] }));
check('Orientation section with standard views', (await page.locator('.k-orient-grid .k-pm-typebtn').count()) === 9);
// place the front view at (120, 150) mm, then the right view to the right, the top view above
const p1 = await px([120, 150]);
await page.mouse.move(p1.x, p1.y);
await page.waitForTimeout(200);
await shot('e41-model-view-preview');
await page.mouse.click(p1.x, p1.y);
await page.waitForTimeout(500);
d = await D();
check('Drawing View1 (front) placed, Projected View continues', d.sheet.views.length === 1 && d.sheet.views[0].type === 'front' && d.edit && d.edit.mode === 'projected', JSON.stringify({ views: d.sheet.views, edit: d.edit }));
const p2 = await px([260, 150]);
await page.mouse.move(p2.x, p2.y);
await page.waitForTimeout(150);
await page.mouse.click(p2.x, p2.y);
await page.waitForTimeout(400);
const p3 = await px([120, 240]);
await page.mouse.move(p3.x, p3.y);
await page.waitForTimeout(150);
await page.mouse.click(p3.x, p3.y);
await page.waitForTimeout(400);
await page.keyboard.press('Escape');
await page.waitForTimeout(200);
d = await D();
const types = d.sheet.views.map((v) => v.type);
check('projected right and top views placed and aligned (first angle: top view below? no — ISO first angle puts the top view below; here third angle by default)', d.sheet.views.length === 3 && types.includes('front') && (types.includes('right') || types.includes('left')) && (types.includes('top') || types.includes('bottom')), JSON.stringify(d.sheet.views));
check('projected views share the parent row/column', d.sheet.views[1].position[1] === d.sheet.views[0].position[1] && d.sheet.views[2].position[0] === d.sheet.views[0].position[0], JSON.stringify(d.sheet.views.map((v) => v.position)));
check('tree lists Sheet1 and the drawing views', (await page.locator('.k-tree-row:has-text("Drawing View1")').count()) === 1 && (await page.locator('.k-tree-row:has-text("Sheet Format1")').count()) === 1);
await shot('e42-three-views');
// the standard views carry what the intended design inserts on view creation (QA F122): a centre mark on the hole in
// the view that looks down it, and the hole's hidden lines (dashed) in the views that look across it
// (the default display style is Hidden Lines Removed, as in the intended design; Hidden Lines Visible shows them dashed)
const hlr = await page.evaluate(async () => {
  const s = window.__phlippoStore.getState();
  const sheet = s.doc.sheets[0];
  const dashedRemoved = document.querySelectorAll('.k-sheet-svg line[stroke-dasharray="5 3"]').length;
  s.applyDocument('Hidden Lines Visible', { ...s.doc, sheets: [{ ...sheet, views: sheet.views.map((v) => ({ ...v, displayStyle: 'hiddenVisible' })) }, ...s.doc.sheets.slice(1)] });
  await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)));
  const dashed = document.querySelectorAll('.k-sheet-svg line[stroke-dasharray="5 3"]').length;
  return { marks: sheet.centerMarks.length, markViews: [...new Set(sheet.centerMarks.map((m) => sheet.views.find((v) => v.id === m.viewId)?.type))], dashedRemoved, dashed };
});
check('the view down the hole got a centre mark; Hidden Lines Visible draws the hole dashed in the views across it', hlr.marks >= 1 && hlr.dashedRemoved === 0 && hlr.dashed >= 2, JSON.stringify(hlr));
await page.keyboard.press('Control+z');
await page.waitForTimeout(300);

// ---- Smart Dimension on the front view's top edge (80 mm): the edge lies at y = 150 + 5 (half of 10 mm) on the sheet
await page.click('.k-cm-tab:has-text("Annotation")');
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.waitForTimeout(200);
const topEdge = await px([120, 155]);
await page.mouse.click(topEdge.x, topEdge.y);
await page.waitForTimeout(200);
d = await D();
check('edge picked for the dimension', d.edit && d.edit.dimStart, JSON.stringify(d.edit));
const labelAt = await px([120, 170]);
await page.mouse.move(labelAt.x, labelAt.y);
await page.waitForTimeout(150);
await page.mouse.click(labelAt.x, labelAt.y);
await page.waitForTimeout(300);
d = await D();
check('dimension 80 mm placed (horizontal)', d.sheet.dims.length === 1 && Math.abs(d.sheet.dims[0].value - 80) < 0.05 && d.sheet.dims[0].orientation === 'h', JSON.stringify(d.sheet.dims));
await page.keyboard.press('Escape');
// diameter of the hole in the top view. Every step waits for the app's state instead of a fixed time: on a slow CI
// runner (software GL) 200 ms was not always enough (F10).
const waitState = (fn, arg, ms = 8000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
await waitState(() => !window.__phlippoStore.getState().drawingEdit);
// the tool click can be lost while the sheet still settles (Linux CI: drawingEdit stayed null): click until the mode is on
let dimMode = false;
for (let k = 0; k < 4 && !dimMode; k++) {
  await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
  dimMode = await waitState(() => window.__phlippoStore.getState().drawingEdit?.mode === 'dimension', undefined, 4000);
}
check('Smart Dimension is on for the hole', dimMode);
const topView = d.sheet.views.find((v) => v.type === 'top' || v.type === 'bottom');
// the hole as the view draws it (sheet coordinates), so the click lands on the drawn circle on every platform (F10)
const topId = await page.evaluate(() => window.__phlippoStore.getState().doc.sheets[0].views.find((v) => v.type === 'top' || v.type === 'bottom').id);
// on a slow runner the view's circles and the sheet's zoom may still be settling: wait for the hole, then for two
// frames in which the sheet does not move, before the click point is taken (F10)
await waitState((id) => !!window.__phlippoSheet.circles(id).find((c) => Math.abs(c.r - 17.5) < 1), topId);
await page.evaluate(() => new Promise((ok) => { let last = '', same = 0; const tick = () => { const now = JSON.stringify([window.__phlippoSheet.zoom(), window.__phlippoSheet.toPx([0, 0])]); same = now === last ? same + 1 : 0; last = now; if (same >= 2) ok(); else requestAnimationFrame(tick); }; tick(); }));
const hole = await page.evaluate((id) => window.__phlippoSheet.circles(id).find((c) => Math.abs(c.r - 17.5) < 1), topId);
// on the rim at 45 degrees: at 0 degrees the centre mark's extension line crosses the circle and a pick there can land on
// that line instead of the circle (Linux CI, F10)
const D45 = Math.SQRT1_2;
const circlePt = await px(hole ? [hole.c[0] + hole.r * D45, hole.c[1] + hole.r * D45] : [topView.position[0] + 17.5 * D45, topView.position[1] + 17.5 * D45]);
// what lies under the click, for the report when the pick fails
const under = await page.evaluate((q) => { const e = document.elementFromPoint(q.x, q.y); return e ? `${e.tagName.toLowerCase()}.${String(e.getAttribute('class') ?? '').slice(0, 40)}` : null; }, circlePt);
if (!(await page.evaluate(() => window.__phlippoStore.getState().drawingEdit?.mode === 'dimension'))) await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
await page.mouse.move(circlePt.x, circlePt.y);
await page.waitForTimeout(100);
await page.mouse.click(circlePt.x, circlePt.y);
const picked = await waitState(() => !!window.__phlippoStore.getState().drawingEdit?.dimStart || (window.__phlippoStore.getState().doc.sheets?.[0]?.dimensions.length ?? 0) >= 2, undefined, 5000);
const dl = await px([topView.position[0] + 45, topView.position[1] + 30]);
await page.mouse.move(dl.x, dl.y);
await page.waitForTimeout(100);
await page.mouse.click(dl.x, dl.y);
await waitState(() => (window.__phlippoStore.getState().doc.sheets?.[0]?.dimensions.length ?? 0) >= 2, undefined, 5000);
d = await D();
const dimOk = d.sheet.dims.length === 2 && d.sheet.dims[1].kind === 'diameter' && Math.abs(d.sheet.dims[1].value - 35) < 0.3;
if (!dimOk) await shot('e43-fail-diameter');
check('diameter Ø35 placed', dimOk, JSON.stringify({ picked, under, message: await page.evaluate(() => window.__phlippoStore.getState().messages.slice(-1)[0]?.text), edit: d.edit, dims: d.sheet.dims, circlePt, hole, zoom: await page.evaluate(() => window.__phlippoSheet.zoom()), topView: topView.position }));
await page.keyboard.press('Escape');
// center mark
await page.click('.k-cm-small:has-text("Center Mark")');
await page.waitForTimeout(200);
await page.mouse.click(circlePt.x, circlePt.y);
await page.waitForTimeout(300);
d = await D();
check('center mark added', d.sheet.marks === 1);
await page.keyboard.press('Escape');
// note
await page.click('.k-cm-big:has-text("Note") .k-cm-main');
await page.waitForTimeout(200);
await page.fill('.k-pm textarea', 'ALL DIMENSIONS IN MM');
const np = await px([40, 40]);
await page.mouse.click(np.x, np.y);
await page.waitForTimeout(300);
d = await D();
check('note placed', d.sheet.notes.length === 1 && d.sheet.notes[0] === 'ALL DIMENSIONS IN MM');
await page.keyboard.press('f');
await page.waitForTimeout(300);
await shot('e43-drawing');

// ---- reload: the drawing with its embedded model, views, dimensions and notes is restored
await page.reload();
await page.waitForSelector('.k-viewport');
await page.locator('[data-testid="welcome-recent-0"]').click({ timeout: 10000 }); // the autosave waits under Recent Documents, by design
await page.waitForSelector('.k-sheet-host');
// wait for the restored drawing itself, not a fixed time (F10)
await page.waitForFunction(() => { const s = window.__phlippoStore.getState(); return s.doc.kind === 'drawing' && (s.doc.sheets?.[0]?.views.length ?? 0) === 3; }, undefined, { timeout: 10000 }).catch(skip('drawing: restored drawing'));
d = await D();
check('drawing restored after reload (views, note)', d.kind === 'drawing' && d.sheet.views.length === 3 && d.sheet.notes.length === 1, JSON.stringify({ k: d.kind, v: d.sheet && d.sheet.views.length, notes: d.sheet && d.sheet.notes.length }));
// the dimensions come back as they were placed: a failed Ø35 above is not counted a second time here (F102)
check('dimensions restored after reload', d.sheet && d.sheet.dims.length === (dimOk ? 2 : 1), JSON.stringify({ dims: d.sheet && d.sheet.dims, dimOk }));

// ---- Section View: vertical cutting line through the hole of the top view, section placed right of it
await page.click('.k-cm-tab:has-text("Drawing")');
await page.click('.k-cm-big:has-text("Section View")');
await page.waitForTimeout(200);
check('Section View Property Panel', (await page.locator('[data-testid="section-view-pm"]').count()) === 1);
const tv = d.sheet.views.find((v) => v.type === 'top' || v.type === 'bottom');
const cutPt = await px([tv.position[0], tv.position[1]]);
await page.mouse.move(cutPt.x, cutPt.y);
await page.waitForTimeout(150);
await page.mouse.click(cutPt.x, cutPt.y);
await page.waitForTimeout(200);
const secPt = await px([240, tv.position[1] + 20]);
await page.mouse.move(secPt.x, secPt.y);
await page.waitForTimeout(400);
await shot('e45-section-preview');
await page.mouse.click(secPt.x, secPt.y);
await page.waitForTimeout(600);
let sv = await page.evaluate(() => window.__phlippoStore.getState().doc.sheets[0].views.filter((v) => v.section).map((v) => ({ name: v.name, pos: v.position, sec: v.section })));
check('Section View A-A placed, aligned with its parent', sv.length === 1 && sv[0].name === 'Section View A-A' && Math.abs(sv[0].pos[1] - tv.position[1]) < 1e-6 && Math.abs(sv[0].sec.at - 40) < 2, JSON.stringify(sv));
check('section hatched, cutting line on the parent, label SECTION A-A', (await page.locator('path[fill="url(#k-hatch)"]').count()) === 1 && (await page.locator('.k-section-line').count()) === 1 && (await page.locator('text:has-text("SECTION A-A")').count()) === 1);
// ---- Detail View of the hole: centre, radius, place
await page.click('.k-cm-big:has-text("Detail View")');
await page.waitForTimeout(200);
check('Detail View Property Panel', (await page.locator('[data-testid="detail-view-pm"]').count()) === 1);
const dc = await px([tv.position[0] + 17.5, tv.position[1]]);
await page.mouse.click(dc.x, dc.y);
await page.waitForTimeout(150);
const dr2 = await px([tv.position[0] + 17.5 + 10, tv.position[1]]);
await page.mouse.move(dr2.x, dr2.y);
await page.mouse.click(dr2.x, dr2.y);
await page.waitForTimeout(150);
const dp = await px([340, 100]);
await page.mouse.move(dp.x, dp.y);
await page.waitForTimeout(300);
await page.mouse.click(dp.x, dp.y);
await page.waitForTimeout(600);
sv = await page.evaluate(() => window.__phlippoStore.getState().doc.sheets[0].views.filter((v) => v.detail).map((v) => ({ name: v.name, scale: v.scale, det: v.detail })));
check('Detail View B (2 : 1) placed, radius 10', sv.length === 1 && sv[0].name === 'Detail View B (2 : 1)' && Math.abs(sv[0].det.radius - 10) < 0.5, JSON.stringify(sv));
check('detail circle with letter on the parent, label DETAIL B', (await page.locator('.k-detail-circle').count()) === 1 && (await page.locator('text:has-text("DETAIL B")').count()) === 1);
// the detail view shows the hole whole, so it gets its own centre mark on creation (QA F122)
// (this detail circle cuts the hole into an arc: no whole circle, so no mark; a detail that shows a hole whole gets one, see doorhandle.mjs)
const detMarks = await page.evaluate(() => { const sh = window.__phlippoStore.getState().doc.sheets[0]; const dv = sh.views.find((v) => v.detail); const whole = dv ? window.__phlippoSheet.circles(dv.id).length : 0; return { marks: dv ? sh.centerMarks.filter((m) => m.viewId === dv.id).length : -1, whole }; });
check('a detail view gets a centre mark for every hole it shows whole', detMarks.marks === detMarks.whole, JSON.stringify(detMarks));
await page.mouse.move(5, 500);
await shot('e46-section-detail');

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
for (const r of results) if (!r.ok) console.log(' -', r.name, r.info);
console.log('errors:', errors.length ? errors.join('\n') : 'none');
await browser.close();
process.exit(exitCode(results, errors));
