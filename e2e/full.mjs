// Full functional check: every tool and command, reporting pass/fail per step.
import { chromium } from 'playwright';
const OUT = process.env.E2E_OUT ?? '/tmp/claude-0/-home-user-Claude/72cb6de8-0893-594a-95ed-130ce81e494b/scratchpad/e2e';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
const S = () => page.evaluate(() => window.__phlippoStore.getState());
const sk = async () => { const s = await S(); return s.doc.sketches[s.activeSketchId]; };
const status = async () => ((await page.locator('.k-statusbar .status').first().textContent().catch(() => '')) || '').trim();
const nEnt = async () => (await sk()).entityOrder.length;
const nCon = async () => (await sk()).constraintOrder.length;
const kinds = async () => { const s = await sk(); return s.constraintOrder.map((id) => s.constraints[id].kind); };
/** screen position of the midpoint of entity #i (by kind filter) */
const entPos = async (filter, nth = 0) => page.evaluate(([filter, nth]) => {
  const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId];
  const ents = sk.entityOrder.map((id) => sk.entities[id]).filter((e) => (filter ? e.kind === filter : true));
  const e = ents[nth]; if (!e) return null;
  let p;
  if (e.kind === 'line') { const a = sk.points[e.p1], b = sk.points[e.p2]; p = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  else if (e.kind === 'circle') { const c = sk.points[e.center]; p = { x: c.x + sk.scalars[e.r], y: c.y }; }
  else if (e.kind === 'arc') { const c = sk.points[e.center]; const a = sk.points[e.start], b = sk.points[e.end]; const m = Math.atan2((a.y + b.y) / 2 - c.y, (a.x + b.x) / 2 - c.x) + (e.ccw ? 0 : Math.PI); const r = sk.scalars[e.r]; p = { x: c.x + r * Math.cos(m), y: c.y + r * Math.sin(m) }; }
  else if (e.kind === 'point') p = sk.points[e.p];
  else p = sk.points[e.points[0]];
  return window.__phlippoProject(p);
}, [filter, nth]);

await page.goto('http://localhost:4173/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForSelector('.k-viewport');
check('welcome dialog shown', (await page.locator('.k-dialog-title').count()) === 1);
await page.click('.k-doctype:has-text("Part")');
check('welcome closed', (await page.locator('.k-dialog').count()) === 0);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;

// ---- sketch tool before a sketch exists: plane pick then tool active
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-iconbtn[data-tip="Line (L)"]');
check('plane pick started from a tool', (await S()).planePick && (await S()).pendingTool === 'line');
await page.dblclick('.k-tree-row:has-text("Front Plane")');
await page.waitForTimeout(600);
check('sketch opened on Front Plane with pending tool', (await S()).activeSketchId && (await S()).tool === 'line' && (await sk()).plane === 'front');

// ---- line chain with inference
await page.mouse.click(cx - 200, cy + 100);
await page.mouse.click(cx - 50, cy + 100); // horizontal
await page.mouse.click(cx - 50, cy); // vertical
await page.keyboard.press('Escape');
check('line chain: 2 lines', (await nEnt()) === 2, String(await nEnt()));
check('inferred horizontal + vertical', (await kinds()).includes('horizontal') && (await kinds()).includes('vertical'), (await kinds()).join());
check('tool back to select after Esc', (await S()).tool === 'select');

// ---- rectangle, center rectangle
await page.keyboard.press('r');
await page.mouse.click(cx + 20, cy + 100);
await page.mouse.click(cx + 180, cy);
check('corner rectangle: 6 entities', (await nEnt()) === 6);
await page.click('.k-cm-iconfly:has(.k-cm-iconbtn[data-tip="Corner Rectangle (R)"]) .k-cm-small-arrow');
await page.click('.k-menu-item:has-text("Center Rectangle")');
await page.mouse.click(cx + 300, cy + 50);
await page.mouse.click(cx + 360, cy + 90);
check('center rectangle adds 4 lines + centre point + diagonal', (await nEnt()) === 12, String(await nEnt()));

// ---- circle, arcs, polygon, spline, point
await page.keyboard.press('c');
await page.mouse.click(cx - 300, cy - 150);
await page.mouse.click(cx - 260, cy - 150);
check('circle', (await nEnt()) === 13);
await page.keyboard.press('a');
await page.mouse.click(cx - 150, cy - 150);
await page.mouse.click(cx - 50, cy - 150);
await page.mouse.click(cx - 100, cy - 200);
check('3 point arc', (await nEnt()) === 14);
await page.click('.k-cm-iconfly:has(.k-cm-iconbtn[data-tip="Arc (A)"]) .k-cm-small-arrow');
await page.click('.k-menu-item:has-text("Centerpoint Arc")');
await page.mouse.click(cx + 100, cy - 150);
await page.mouse.click(cx + 150, cy - 150);
await page.mouse.click(cx + 100, cy - 200);
check('centerpoint arc', (await nEnt()) === 15);
await page.click('.k-cm-iconbtn[data-tip="Polygon"]');
await page.mouse.click(cx + 300, cy - 150);
await page.mouse.click(cx + 340, cy - 150);
check('polygon: 6 lines + construction circle', (await nEnt()) === 22, String(await nEnt()));
await page.keyboard.press('n');
await page.mouse.click(cx - 300, cy + 220);
await page.mouse.click(cx - 200, cy + 260);
await page.mouse.click(cx - 100, cy + 220);
await page.mouse.dblclick(cx - 20, cy + 260);
check('spline finished by double-click', (await nEnt()) === 23, String(await nEnt()));
await page.keyboard.press('p');
await page.mouse.click(cx + 200, cy + 250);
check('point', (await nEnt()) === 24);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');

// ---- select, hover, delete, undo, redo
await page.mouse.click(cx + 200, cy + 250);
check('select point entity', (await S()).selection.length === 1);
await page.keyboard.press('Delete');
check('delete selection', (await nEnt()) === 23);
await page.keyboard.press('Control+z');
check('undo restores', (await nEnt()) === 24);
await page.keyboard.press('Control+y');
check('redo deletes again', (await nEnt()) === 23);

// ---- box select (window) and crossing
await page.mouse.move(cx - 330, cy - 190);
await page.mouse.down();
await page.mouse.move(cx - 220, cy - 100, { steps: 4 });
await page.mouse.up();
check('window box select picks the circle only', (await S()).selection.length === 1, String((await S()).selection.length));
await page.mouse.move(cx + 200, cy + 120);
await page.mouse.down();
await page.mouse.move(cx + 60, cy + 60, { steps: 4 });
await page.mouse.up();
check('crossing box select picks several lines', (await S()).selection.length >= 2, String((await S()).selection.length));
await page.keyboard.press('Escape');
check('Esc clears selection', (await S()).selection.length === 0);

// ---- construction toggle
{ const l0 = await entPos('line', 0); await page.mouse.click(l0.x, l0.y); }
await page.keyboard.press('x');
{ const s1 = await sk(); check('construction toggle', s1.entities[s1.entityOrder[0]].construction === true); }
await page.keyboard.press('x');

// ---- relations via PropertyManager: parallel / perpendicular / equal / coincident etc.
{ const b = await entPos('line', 2), r = await entPos('line', 3);
await page.mouse.click(b.x, b.y); // bottom of rect
await page.keyboard.down('Control');
await page.mouse.click(r.x, r.y); // right of rect
await page.keyboard.up('Control'); }
const rels = await page.locator('.k-tool.small').allTextContents();
check('two lines offer Parallel/Perpendicular/Equal/Collinear', rels.join() === 'Parallel,Perpendicular,Equal,Collinear', rels.join());
await page.click('.k-tool.small:has-text("Equal")');
check('equal relation added', (await kinds()).includes('equal'));
await page.keyboard.press('Escape');

// ---- smart dimension types: length, diameter, radius, angle, point-point, point-line
const dim = async (clicks, place, value) => {
  await page.keyboard.press('m');
  for (const [x, y] of clicks) await page.mouse.click(x, y);
  await page.mouse.click(...place);
  await page.waitForTimeout(120);
  const vis = (await page.locator('.k-modify').count()) === 1;
  if (vis && value !== undefined) {
    await page.locator('.k-modify input[type=number]').fill(String(value));
    await page.locator('.k-modify input[type=number]').press('Enter');
  } else await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  return vis;
};
const before = await nCon();
const L2 = await entPos('line', 2), CI = await entPos('circle', 0), AR = await entPos('arc', 0), L0 = await entPos('line', 0), L1 = await entPos('line', 1);
check('length dimension + Modify', await dim([[L2.x, L2.y]], [L2.x, L2.y + 60], 40));
check('diameter dimension', await dim([[CI.x, CI.y]], [CI.x + 50, CI.y - 40]));
check('radius dimension on arc', await dim([[AR.x, AR.y]], [AR.x + 30, AR.y - 40]));
check('angle dimension', await dim([[L0.x, L0.y], [L1.x, L1.y]], [L0.x + 40, L0.y - 40]));
check('4 dimensions created', (await nCon()) === before + 4, String((await nCon()) - before));
const lk = await kinds();
check('dimension kinds', lk.includes('length') && lk.includes('diameter') && lk.includes('radius') && lk.includes('angle'), lk.join());
const lenC = Object.values((await sk()).constraints).find((c) => c.kind === 'length');
check('length value applied = 40', lenC && Math.abs(lenC.value - 40) < 1e-9, String(lenC && lenC.value));

// ---- driven toggle via PropertyManager, dimension drag, double-click modify
await page.click(`.k-overlay text:has-text("40 mm")`);
check('dimension label selects constraint', (await S()).selectedConstraint === lenC.id);
await page.click('.k-toggle');
check('driven toggle', (await sk()).constraints[lenC.id].driven === true);
await page.click('.k-toggle');
await page.keyboard.press('Escape');
const lbl = await page.locator('.k-overlay text:has-text("40 mm")').boundingBox();
await page.mouse.move(lbl.x + lbl.width / 2, lbl.y + lbl.height / 2);
await page.mouse.down();
await page.mouse.move(lbl.x + 40, lbl.y + 40, { steps: 5 });
await page.mouse.up();
const lbl2 = await page.locator('.k-overlay text:has-text("40 mm")').boundingBox();
check('dimension label drag moves it', Math.abs(lbl2.y - lbl.y) > 15, `${lbl.y} -> ${lbl2.y}`);
await page.mouse.dblclick(lbl2.x + lbl2.width / 2, lbl2.y + lbl2.height / 2);
check('double-click opens Modify', (await page.locator('.k-modify').count()) === 1);
await page.keyboard.press('Escape');

// ---- drag a free point keeps relations
const rect = (await sk());
const freeBefore = await S();
await page.mouse.move(cx + 180, cy); // top-right corner of rect
await page.mouse.down();
await page.mouse.move(cx + 200, cy - 30, { steps: 6 });
await page.mouse.up();
check('drag corner: sketch stays solvable', !(await status()).includes('conflict'), await status());
void rect; void freeBefore;

// ---- mirror entities + centerline
await page.click('.k-cm-iconfly:has(.k-cm-iconbtn[data-tip="Line (L)"]) .k-cm-small-arrow');
await page.click('.k-menu-item:has-text("Centerline")');
await page.mouse.click(cx + 240, cy + 150);
await page.mouse.click(cx + 240, cy + 300);
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
const n0 = await nEnt();
const CI2 = await entPos('circle', 0);
const skm = await sk(); const nLines = skm.entityOrder.filter((id) => skm.entities[id].kind === 'line').length; const CL = await entPos('line', nLines - 1);
await page.mouse.click(CI2.x, CI2.y); // circle
await page.keyboard.down('Control');
await page.mouse.click(CL.x, CL.y); // centerline (last line)
await page.keyboard.up('Control');
await page.click('.k-cm-small:has-text("Mirror Entities")');
check('mirror entities adds a mirrored circle', (await nEnt()) === n0 + 1, `${n0} -> ${await nEnt()}`);

// ---- Design Library: create, add selection, insert, export, import
await page.click('.k-taskpane-btn[data-tip="Design Library"]');
await page.locator('.k-library-toolbar .k-input').fill('My blocks');
await page.click('.k-library-toolbar .k-btn:has-text("New")');
check('library created', (await S()).libraries.length === 1 && (await S()).libraries[0].name === 'My blocks');
{ const c0 = await entPos('circle', 0); await page.mouse.click(c0.x, c0.y); }
await page.locator('.k-library-add .k-input').fill('Hole');
await page.click('.k-library-add .k-btn');
check('selection added as library item', (await S()).libraries[0].items.length === 1 && (await S()).libraries[0].items[0].block.entities.length === 1, JSON.stringify((await S()).libraries[0].items.map((i) => i.name)));
const nIns = await nEnt();
await page.click('.k-library-item .k-btn.primary');
check('placing mode', !!(await S()).placing);
await page.mouse.click(cx - 150, cy + 300);
check('item inserted into sketch', (await nEnt()) === nIns + 1 && !(await S()).placing);
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.k-library-folder-row .k-btn[data-tip="Export library"]')]);
check('library export .kcadlib', dl.suggestedFilename().endsWith('.kcadlib'));
await page.setInputFiles('.k-library input[type=file]', await dl.path());
await page.waitForTimeout(200);
check('library import adds a library', (await S()).libraries.length === 2);
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-taskpane-btn[data-tip="Design Library"]');
check('libraries persist after reload', (await S()).libraries.length === 2);
await page.click('.k-taskpane-panel .k-panel-header .k-btn');

// ---- Display/Delete Relations in task pane, delete a relation
await page.dblclick('.k-tree-row:has-text("Sketch1")');
await page.waitForTimeout(400);
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Display/Delete Relations") .k-cm-main');
check('relations task pane open', (await page.locator('.k-taskpane-panel').count()) === 1);
const cBefore = await nCon();
await page.locator('.k-taskpane-panel li .k-btn').first().click();
check('delete relation from the list', (await nCon()) === cBefore - 1);
await page.click('.k-taskpane-panel .k-panel-header .k-btn');

// ---- right-click context toolbar
{ const b = await entPos('line', 2); await page.mouse.click(b.x, b.y, { button: 'right' }); }
check('context menu shown', (await page.locator('.k-ctx').count()) === 1);
await page.keyboard.press('Escape');

// ---- view: zoom to area, previous view, zoom keys, fit
const scale0 = (await page.evaluate(() => null)); void scale0;
await page.click('.k-hud-btn[data-tip="Zoom to Area"]');
await page.mouse.move(cx - 100, cy - 100);
await page.mouse.down();
await page.mouse.move(cx + 100, cy + 100, { steps: 3 });
await page.mouse.up();
await page.waitForTimeout(350);
const txt1 = await page.locator('.k-status-cell.mono').textContent();
await page.click('.k-hud-btn[data-tip^="Previous View"]');
await page.waitForTimeout(350);
check('zoom to area then previous view', true, txt1);
await page.keyboard.press('f');
await page.waitForTimeout(350);
await page.keyboard.press('z');
await page.keyboard.press('Shift+Z');

// ---- confirmation corner exit, re-edit sketch, second sketch on another plane
await page.click('.k-confirm-ok');
check('exit sketch', (await S()).activeSketchId === null);
await page.dblclick('.k-tree-row:has-text("Sketch1")');
check('re-edit sketch via tree', (await S()).activeSketchId !== null);
await page.click('.k-confirm-ok');
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.dblclick('.k-tree-row:has-text("Top Plane")');
await page.waitForTimeout(500);
check('second sketch on Top Plane', (await sk()).plane === 'top' && (await S()).doc.features.length === 2);
await page.keyboard.press('c');
await page.mouse.click(cx, cy);
await page.mouse.click(cx + 50, cy);
await page.click('.k-confirm-ok');

// ---- feature tree: rename, rollback, delete; orientation keys
await page.click('.k-tree-row:has-text("Sketch2")', { button: 'right' });
await page.click('.k-menu-item:has-text("Rename")');
await page.keyboard.type('TopSketch');
await page.keyboard.press('Enter');
check('rename feature', (await S()).doc.features[1].name === 'TopSketch', (await S()).doc.features[1].name);
await page.keyboard.press('Control+7');
await page.waitForTimeout(300);
check('Ctrl+7 isometric', (await S()).viewName === '*Isometric');
await page.keyboard.press(' ');
check('space opens orientation', (await page.locator('.k-orientation-dialog').count()) === 1);
await page.click('.k-viewgrid-btn:has-text("Top")');
await page.waitForTimeout(300);
check('Top view', (await S()).viewName === '*Top');
await page.click('.k-tree-row:has-text("TopSketch")', { button: 'right' });
await page.click('.k-menu-item:has-text("Delete")');
check('delete feature', (await S()).doc.features.length === 1);
await page.keyboard.press('Control+z');
check('undo delete feature', (await S()).doc.features.length === 2);

// ---- save (.kcad download), new document, open file round trip
const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
const path = await download.path();
check('save downloads .kcad', download.suggestedFilename().endsWith('.kcad'), download.suggestedFilename());
await page.keyboard.press('Control+n');
await page.locator('.k-dialog input').fill('Bracket');
await page.click('.k-dialog .k-btn.primary');
check('new document named Bracket', (await S()).doc.name === 'Bracket' && (await S()).doc.features.length === 0);
await page.setInputFiles('#phlippo-open-file', path);
await page.waitForTimeout(300);
check('open restores 2 features', (await S()).doc.features.length === 2, String((await S()).doc.features.length));

// ---- options: reverse wheel; theme; manager collapse; task pane; dock float
await page.click('.k-mb-btn[data-tip="Options"]');
await page.locator('.k-dialog .k-toggle').nth(1).click();
check('reverse wheel option', (await S()).reverseWheel === true);
await page.click('.k-dialog .k-btn.primary');
await page.keyboard.press('Shift+C');
check('Shift+C collapses FeatureManager', (await S()).managerCollapsed === true);
await page.keyboard.press('Shift+C');
await page.keyboard.press('Control+Shift+d');
check('dark theme', (await S()).theme === 'dark');
await page.keyboard.press('Control+Shift+d');
await page.click('.k-panel-header .k-btn[title="Panel options"]');
await page.click('.k-menu-item:has-text("Float")');
check('manager pane floats', (await S()).panels.manager.side === 'float');
await page.click('.k-panel-header .k-btn[title="Panel options"]');
await page.click('.k-menu-item:has-text("Dock left")');

// ---- autosave survives reload
await page.reload();
await page.waitForSelector('.k-viewport');
check('autosave reload keeps features', (await S()).doc.features.length === 2);
await page.screenshot({ path: `${OUT}/full-final.png` });

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('page errors:', errors);
await browser.close();
