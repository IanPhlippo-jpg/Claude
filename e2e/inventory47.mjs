// Playlist inventory 39–52 (TASKS Vervolg 47): status bar prompts and Total Length, the context toolbar of a tree item,
// body names with [n], the sketch shortcut menu fly-outs and the dimension heading, Modify ▸ Reverse the sense,
// Equations ▸ Features (suppression), Section View ▸ Offset perpendicular to, View ▸ Tangent Edges choices and
// Import Diagnostics.
import { menuPath } from './lib/menu.mjs';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { checks, exitCode, track, skip, dontSave } from './lib/check.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = track(page);
const { results, check } = checks();
const S = (fn, arg) => page.evaluate(fn, arg);
const status = () => page.locator('.k-statusbar').innerText();

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

// a plate 80 × 60 with a horizontal dimension of 80
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('s1', 'Sketch1', 'top');
  let l0, l1, l2;
  [sk, l0] = K.addLine(sk, sk.origin, { x: 80, y: 0 });
  [sk, l1] = K.addLine(sk, l0.p2, { x: 80, y: 60 });
  [sk, l2] = K.addLine(sk, l1.p2, { x: 0, y: 60 });
  sk = K.addLine(sk, l2.p2, l0.p1)[0];
  sk = K.addConstraint(sk, 'hDistance', [l0.p1, l0.p2], { value: 80 })[0];
  const d = K.createDocument('Inventaris');
  d.sketches = { s1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(500);

// ---- status bar: the Smart Dimension prompt in a sketch, Total Length of two lines
await S(() => window.__phlippoStore.getState().editSketch('s1'));
await page.waitForTimeout(300);
await S(() => window.__phlippoStore.getState().setTool('dimension'));
await page.waitForTimeout(150);
check('Smart Dimension prompts "Pick one or two edges or points, then click where the dimension goes."', (await status()).includes('Pick one or two edges or points, then click where the dimension goes.'));
await S(() => { const s = window.__phlippoStore.getState(); s.setTool('select'); const sk = s.doc.sketches.s1; s.setSelection(sk.entityOrder.slice(0, 2).map((id) => ({ kind: 'entity', id }))); });
await page.waitForTimeout(150);
check('two lines selected: Total Length 140mm in the status bar', (await status()).includes('Total Length: 140mm'), await status());

// ---- a left-click on a line shows the relations toolbar beside the pointer ("Make Horizontal")
await S(() => window.__phlippoStore.getState().setSelection([]));
const mid = await S(() => window.__phlippoProject({ x: 40, y: 0 }));
// the toolbar follows the click after a short delay; a slow runner (software GL) needs a real wait, not a fixed one (F144),
// and a click that lands while the view still settles is tried again
let ctxShown = false;
for (let k = 0; k < 3 && !ctxShown; k++) {
  await page.mouse.click(mid.x, mid.y);
  ctxShown = await page.locator('[data-testid="sketch-ctxbar"] [data-tip="Make Horizontal"]').waitFor({ timeout: 6000 }).then(() => true, () => false);
}
check('a clicked line shows the context toolbar with Make Horizontal', ctxShown);
await page.keyboard.press('Escape');

// ---- the sketch shortcut menu: the dimension heading and the fly-outs
const dimId = await S(() => { const sk = window.__phlippoStore.getState().doc.sketches.s1; return sk.constraintOrder.find((id) => sk.constraints[id].kind === 'hDistance'); });
await S((id) => { window.__phlippoStore.getState().setSelection([]); window.__phlippoStore.getState().selectConstraint(id); }, dimId);
const vp = await page.locator('.k-viewport').boundingBox();
await page.mouse.click(vp.x + vp.width - 150, vp.y + vp.height - 120, { button: 'right' });
await page.waitForTimeout(200);
const head = await page.locator('.k-menu-header').first().innerText().catch(skip('inventory47.mjs:67', ''));
check('the shortcut menu starts with the dimension heading Dimension (D1@Sketch1(80.00))', head.includes('D1@Sketch1(80.00)'), head);
check('Link Values…, Driven and Mark For Drawing are offered for the dimension', (await page.locator('.k-menu-item:has-text("Link Values")').count()) === 1 && (await page.locator('.k-menu-item:has-text("Driven")').count()) === 1 && (await page.locator('.k-menu-item:has-text("Mark For Drawing")').count()) === 1);
await page.locator('.k-menu-item:has-text("Sketch Entities")').hover();
await page.waitForTimeout(150);
await page.locator('.k-menu-sub .k-menu-item:has-text("Circle")').first().click();
await page.waitForTimeout(150);
check('Sketch Entities ▸ Circle starts the Circle tool', (await S(() => window.__phlippoStore.getState().tool)) === 'circle');
await S(() => window.__phlippoStore.getState().setTool('select'));

// ---- Modify ▸ Reverse the sense of the dimension: the second point goes to the other side of the first
await S((id) => window.__phlippoStore.getState().setModify({ id, x: 600, y: 400 }), dimId);
await page.waitForTimeout(250);
const pointX = () => S(() => { const sk = window.__phlippoStore.getState().doc.sketches.s1; const c = Object.values(sk.constraints).find((k) => k.kind === 'hDistance'); return sk.points[c.refs[1]].x; });
const xBefore = await pointX();
await page.locator('[data-testid="modify-reverse"]').click();
await page.waitForTimeout(300);
const xAfter = await pointX();
check('Reverse the sense moves the point to the other side (80 → -80)', Math.round(xBefore) === 80 && Math.round(xAfter) === -80, `${xBefore} → ${xAfter}`);
await S(() => { const s = window.__phlippoStore.getState(); s.setModify(null); s.undo(); });
await page.waitForTimeout(200);
// ---- Segment: the top line cut into three segments through the Property Panel
const linesBefore = await S(() => { const sk = window.__phlippoStore.getState().doc.sketches.s1; return sk.entityOrder.filter((id) => sk.entities[id].kind === 'line').length; });
await S(() => window.__phlippoStore.getState().setTool('segment'));
await page.waitForTimeout(200);
const topMid = await S(() => window.__phlippoProject({ x: 40, y: 60 }));
await page.mouse.click(topMid.x, topMid.y);
await page.waitForTimeout(200);
await page.locator('[data-testid="segment-segments"]').check();
await page.locator('.k-pm-host .k-pm-valuerow:has(input) input').first().fill('3');
await page.locator('.k-pm-host .k-pm-valuerow:has(input) input').first().press('Tab');
await page.locator('[data-testid="segment-apply"]').click();
await page.waitForTimeout(300);
const linesAfter = await S(() => { const sk = window.__phlippoStore.getState().doc.sketches.s1; return sk.entityOrder.filter((id) => sk.entities[id].kind === 'line').length; });
check('Segment cuts the top line into three segments', linesAfter === linesBefore + 2, `${linesBefore} → ${linesAfter}`);
await S(() => { const s = window.__phlippoStore.getState(); s.undo(); s.setTool('select'); });
await S(() => window.__phlippoStore.getState().exitSketch());
await page.waitForTimeout(400);

// ---- the context toolbar of a tree item: shown after a short rest, Suppress through it
await page.locator('.k-tree-row:has-text("Boss-Extrude1")').first().click();
const bar = page.locator('[data-testid="tree-ctxbar"]');
await bar.waitFor({ timeout: 6000 }).catch(() => undefined);
check('a click on Boss-Extrude1 shows its context toolbar (Edit Feature, Edit Sketch, Suppress, Normal To)', (await bar.count()) === 1 && (await page.locator('[data-testid="ctx-edit-feature"]').count()) === 1 && (await page.locator('[data-testid="ctx-normal-to"]').count()) === 1);
const bb = await bar.boundingBox();
if (bb) {
  await page.mouse.move(bb.x + 50, bb.y + bb.height / 2);
  await page.waitForTimeout(150);
  await page.locator('[data-testid="ctx-suppress"]').click();
  await page.waitForTimeout(300);
}
check('Suppress on the context toolbar suppresses the feature', await S(() => window.__phlippoStore.getState().doc.features.find((f) => f.id === 'e1').suppressed));
await S(() => window.__phlippoStore.getState().undo());
await page.waitForTimeout(300);

// ---- bodies: [n] when one feature makes several
await S(() => { const s = window.__phlippoStore.getState(); s.startMoveBody(); s.updateFeatureDraft({ copy: true, copies: 2, translate: [100, 0, 0] }); s.commitFeature(); });
await page.waitForTimeout(600);
await page.locator('.k-tree-row:has-text("Solid Bodies") .caret').first().click();
await page.waitForTimeout(150);
const names = await page.locator('.k-tree-row[data-id^="body-"]').allInnerTexts();
check('two bodies of one feature are named Body-Move/Copy1[1] and [2]', names.some((n) => n.includes('Body-Move/Copy1[1]')) && names.some((n) => n.includes('Body-Move/Copy1[2]')), JSON.stringify(names));
await S(() => window.__phlippoStore.getState().undo());
await page.waitForTimeout(300);

// ---- Equations ▸ Features: a suppression equation
await S(() => window.__phlippoStore.getState().setDialog('equations'));
await page.waitForTimeout(300);
await page.selectOption('[data-testid="eq-add-suppression"]', { label: '"Boss-Extrude1"' });
await page.waitForTimeout(150);
check('Equations ▸ Features: "Boss-Extrude1" evaluates to Suppressed', (await page.locator('.k-eq-table tr:has-text("Boss-Extrude1")').first().innerText()).includes('Suppressed'));
await page.locator('.k-dialog button:has-text("OK")').click();
await page.waitForTimeout(400);
check('OK suppresses Boss-Extrude1 through the equation', await S(() => window.__phlippoStore.getState().doc.features.find((f) => f.id === 'e1').suppressed));
await S(() => window.__phlippoStore.getState().setEquations([]));
await S(() => window.__phlippoStore.getState().toggleSuppress('e1'));
await page.waitForTimeout(300);

// ---- Section View: Offset perpendicular to; View ▸ Tangent Edges as three choices
await S(() => window.__phlippoStore.getState().startSectionView());
await page.waitForTimeout(300);
check('Section View offers Offset perpendicular to and Section by Body', (await page.locator('[data-testid="section-offset-selected"]').count()) === 1 && (await page.locator('[data-testid="section-pm"]').innerText()).includes('Section by Body'));
await S(() => window.__phlippoStore.getState().cancelSectionView());
await page.waitForTimeout(200);
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("View")');
await page.waitForTimeout(150);
check('View offers Redraw, Full Screen and the three Tangent Edges choices', (await page.locator('.k-menu-item:has-text("Redraw")').count()) === 1 && (await page.locator('.k-menu-item:has-text("Full Screen")').count()) === 1 && (await menuPath(page, 'Display ▸ Tangent Edges Visible').count()) === 1 && (await page.locator('.k-menu-sub .k-menu-item:has-text("Tangent Edges")').count()) === 3);
await page.locator('.k-menu-sub .k-menu-item:has-text("Tangent Edges Removed")').click();
await page.waitForTimeout(150);
check('Tangent Edges Removed is stored', await S(() => window.__phlippoStore.getState().prefs['view.tangentEdges'] === 'removed'));

// ---- Import Diagnostics: a box of loose triangles with a hair gap is healed
await S(() => {
  const K = window.__phlippoKit;
  const tri = [];
  const q = [[0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0], [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10]];
  const faces = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5], [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7]];
  // one corner of the first triangle a hair off: a gap
  faces.forEach((f, i) => f.forEach((k, j) => { const p = q[k]; tri.push(p[0] + (i === 0 && j === 0 ? 1e-3 : 0), p[1], p[2]); }));
  const d = K.createDocument('Import');
  d.features = [{ id: 'im1', type: 'imported', name: 'Imported1', suppressed: false, positions: tri, source: 'box.stl' }];
  window.__phlippoStore.getState().openDocument(d);
});
await dontSave(page); // Save changes? → Don't Save, when it asks
await page.waitForTimeout(400);
await S(() => window.__phlippoStore.getState().setDialog('importDiagnostics'));
await page.waitForSelector('[data-testid="import-diagnostics"]', { timeout: 5000 }).catch(skip('inventory47.mjs:174'));
const gapsOf = () => page.locator('[data-testid="import-diagnostics"] tbody td').nth(2).innerText().catch(skip('inventory47.mjs:175', ''));
const gaps0 = await gapsOf();
await page.locator('[data-testid="import-heal"]').click();
await page.waitForTimeout(400);
const gaps1 = await gapsOf();
check('Import Diagnostics finds the gaps and Attempt to Heal All closes them', Number(gaps0) > 0 && Number(gaps1) === 0, `${gaps0} → ${gaps1}`);
await page.screenshot({ path: `${OUT}/inventory47.png` });
await page.locator('[data-testid="import-diagnostics"] button:has-text("Close")').click();

// ---- sheet metal: a base flange from an open U profile shows BaseBend1 and BaseBend2 under it
await S(() => {
  const K = window.__phlippoKit;
  let sk = K.createSketch('u1', 'Sketch1', 'front');
  let a, b;
  [sk, a] = K.addLine(sk, { x: 0, y: 30 }, { x: 0, y: 0 });
  [sk, b] = K.addLine(sk, a.p2, { x: 50, y: 0 });
  sk = K.addLine(sk, b.p2, { x: 50, y: 30 })[0];
  const d = K.createDocument('Goot');
  d.sketches = { u1: sk };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'u1', suppressed: false }, { id: 'bf1', type: 'baseFlange', name: 'Base-Flange1', sketchId: 'u1', suppressed: false, depth: 60, midPlane: true, reverse: false, flipDir: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await dontSave(page); // Save changes? → Don't Save, when it asks
await page.waitForTimeout(500);
await page.locator('.k-tree-row:has-text("Base-Flange1") .caret').first().click();
await page.waitForTimeout(200);
check('Base-Flange1 holds BaseBend1 and BaseBend2', (await page.locator('.k-tree-row:has-text("BaseBend1")').count()) === 1 && (await page.locator('.k-tree-row:has-text("BaseBend2")').count()) === 1);

await browser.close();
console.log(`${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
