// 0.5.16 (advice 5.2, item 4): options of Tools ▸ Options wired in this round, proved in the app.
// - Display: temporary axis of a cylindrical face, shaded face highlighting, highlight all edges of a selected feature,
//   breadcrumbs at the pointer, plane intersections, background appearance, transparent flyout tree
// - Sketch: single command per pick, use fully defined sketches, spline control polygon
// - Feature Tree: arrow key navigation, comments in the Property Panel; General: auto-show Property Panel
// - Options dialog: the rows that work are no longer greyed; Import ▸ File Format shows the options of that format
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { exitCode } from './lib/check.mjs';
import { settle, frames } from './lib/wait.mjs';

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
const setPref = (k, v) => S(([k, v]) => { const s = window.__phlippoStore.getState(); s.setPrefs({ ...s.prefs, [k]: v }); }, [k, v]);
const shot = (name) => page.screenshot({ path: `${OUT}/prefs0516-${name}.png` });
const overlays = () => S(() => window.__phlippoBodies.overlays.children.map((o) => o.name || o.type));
const toPx = (x, y, z) => S(([x, y, z]) => window.__phlippoProjectWorld(x, y, z), [x, y, z]);

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await settle(page);
await page.click('.k-doctype:has-text("Part")');
await settle(page);

// a cylinder: a circle of radius 10 on the Front plane, extruded 20
await S(() => {
  const s = window.__phlippoStore.getState();
  s.newSketch('front');
});
await settle(page);
await S(() => {
  const st = window.__phlippoStore.getState();
  st.commit('Circle', (sk) => window.__phlippoKit.addCircle(sk, { x: 0, y: 0 }, 10)[0]);
});
// Use fully defined sketches: the circle is under defined, so Extrude is refused with a message
await setPref('sketch.fullyDefined', true);
await S(() => window.__phlippoStore.getState().startFeature('extrude', 'boss'));
await settle(page);
const refused = await S(() => ({ edit: !!window.__phlippoStore.getState().featureEdit, msg: window.__phlippoStore.getState().messages.map((m) => m.text).join(' | ') }));
check('Use fully defined sketches: no Extrude on an under defined sketch', !refused.edit && /not fully defined/.test(refused.msg), JSON.stringify(refused));
await shot('fullydefined');
await setPref('sketch.fullyDefined', false);
await S(() => window.__phlippoStore.getState().startFeature('extrude', 'boss'));
await settle(page);
await S(() => window.__phlippoStore.getState().updateFeatureDraft({ depth: 20 }));
await page.click('.k-pm-ok');
await settle(page);
check('the cylinder is built', (await S(() => window.__phlippoStore.getState().rebuild.bodies.length)) === 1);
await S(() => window.__phlippoStore.getState().setSelectedFeature(null));
await S(() => window.__phlippoZoomFit?.());
await settle(page);

// Display temporary axes upon hover over cylindrical faces: the pointer on the side of the cylinder shows its axis
const sideAt = async () => {
  // a point on the side facing the viewer: the cylinder lies along z (Front plane), the view is isometric
  return toPx(7.07, 7.07, 10);
};
let side = await sideAt();
await page.mouse.move(side.x, side.y);
await frames(page, 4);
const hoverIsCurved = await S(() => { const s = window.__phlippoStore.getState(); const h = s.hoverFace; const b = h && s.rebuild.bodies.find((x) => x.id === h.bodyId); return !!b?.faces.find((f) => f.id === h.faceId)?.curved; });
check('the pointer is on the cylindrical face', hoverIsCurved);
check('Temporary axes: the axis shows on hover', (await overlays()).includes('temp-axis'), JSON.stringify(await overlays()));
await shot('tempaxis');
await setPref('display.tempAxes', false);
await page.mouse.move(side.x + 1, side.y + 1);
await frames(page, 4);
check('Temporary axes off: no axis', !(await overlays()).includes('temp-axis'));
await setPref('display.tempAxes', true);

// Use shaded face highlighting: a selected face filled (on) or only outlined (off)
const top = await toPx(0, 0, 20);
await page.mouse.move(10, 500);
await page.mouse.click(top.x, top.y);
await settle(page);
const selType = () => S(() => window.__phlippoBodies.overlays.children.map((o) => o.type));
check('a face is selected', !!(await S(() => window.__phlippoStore.getState().selectedFace)));
check('Shaded face highlighting on: the face is filled', (await selType()).includes('Mesh'), JSON.stringify(await selType()));
// Breadcrumbs at the pointer: off, the bar sits at the top left
const crumbsBox = async () => page.locator('[data-testid="breadcrumbs"]').boundingBox();
const vp = await page.locator('.k-viewport').boundingBox();
const c0 = await crumbsBox();
check('breadcrumbs at the top left by default', !!c0 && c0.x - vp.x < 60, JSON.stringify(c0));
await setPref('display.shadedFaceHighlighting', false);
await setPref('display.breadcrumbsAtCursor', true);
await S(() => window.__phlippoStore.getState().setSelectedFace(null));
await settle(page);
await page.mouse.move(10, 500);
await page.mouse.click(top.x, top.y);
await settle(page);
check('Shaded face highlighting off: only the outline', !(await selType()).includes('Mesh'), JSON.stringify(await selType()));
const c1 = await crumbsBox();
check('Breadcrumbs at mouse pointer: the bar opens at the pointer', !!c1 && Math.abs(c1.x - (top.x + 14)) < 4 && Math.abs(c1.y - (top.y + 14)) < 4, JSON.stringify({ c1, top }));
await shot('facehighlight-crumbs');
await setPref('display.shadedFaceHighlighting', true);
await setPref('display.breadcrumbsAtCursor', false);
await S(() => window.__phlippoStore.getState().setSelectedFace(null));

// Highlight all edges of features selected in graphics view: the boundaries of the feature's faces light up
await S(() => window.__phlippoStore.getState().setSelectedFeature(window.__phlippoStore.getState().doc.features.find((f) => f.type === 'extrude').id));
await settle(page);
const lines0 = (await overlays()).filter((t) => t === 'LineSegments2').length;
await setPref('display.highlightAllEdges', true);
await page.mouse.move(12, 600);
await frames(page, 4);
const lines1 = (await overlays()).filter((t) => t === 'LineSegments2').length;
check('Highlight all edges: more edge highlights on the selected feature', lines1 > lines0, `${lines0} -> ${lines1}`);
await shot('alledges');
await setPref('display.highlightAllEdges', false);
await S(() => window.__phlippoStore.getState().setSelectedFeature(null));

// Plane Display ▸ Show intersections: with the planes shown, the lines where they cross
await S(() => window.__phlippoStore.getState().toggleShow('planes'));
await settle(page);
const crossings = () => S(() => { let n = 0; window.__phlippoScene.traverse((o) => { if (o.name === 'plane-intersections') n++; }); return n; });
check('no plane intersections by default', (await crossings()) === 0);
await setPref('doc.planeIntersections', true);
await page.mouse.move(14, 600);
await frames(page, 4);
check('Show intersections: the plane crossings are drawn', (await crossings()) === 1);
await shot('planeintersections');
await setPref('doc.planeIntersections', false);
await S(() => window.__phlippoStore.getState().toggleShow('planes'));

// Colors ▸ Background appearance: Plain uses the Viewport Background colour
await setPref('colors.backgroundAppearance', 'Plain (Viewport Background color above)');
await frames(page);
const bg = await S(() => document.querySelector('.k-viewport').style.background);
check('Background appearance Plain: the plain viewport colour', /bg-viewport\)/.test(bg), bg);
await shot('background-plain');
await setPref('colors.backgroundAppearance', 'Use document scene background');

// Feature Tree ▸ Arrow key navigation: after a click in the tree, Down selects the next feature and the view stays
await setPref('fm.arrowKeyNav', true);
const firstRow = page.locator('.k-tree-row:has-text("Front Plane")').first();
await firstRow.click();
await S(() => window.__phlippoStore.getState().setSelectedFeature(window.__phlippoStore.getState().doc.features[0].id));
const pose = () => S(() => { const c = window.__phlippoCamera; return [c.rotation.x, c.rotation.y, c.rotation.z, c.rotation.w].map((v) => v.toFixed(5)).join(','); });
const p0 = await pose();
await page.keyboard.press('ArrowDown');
await settle(page);
const sel = await S(() => { const s = window.__phlippoStore.getState(); return s.doc.features.findIndex((f) => f.id === s.selectedFeatureId); });
check('Arrow key navigation: Down selects the next feature', sel === 1, String(sel));
check('Arrow key navigation: the view does not turn', (await pose()) === p0);
await setPref('fm.arrowKeyNav', false);

// Comments in the Property Panel: the comment of the extrusion shows when it is edited
const extrudeId = await S(() => window.__phlippoStore.getState().doc.features.find((f) => f.type === 'extrude').id);
await S((id) => { const s = window.__phlippoStore.getState(); s.applyDocument('Comment', { ...s.doc, comments: [{ id: 'cm1', featureId: id, text: 'Diameter from the customer drawing', author: 'User', date: '' }] }); }, extrudeId);
await S((id) => window.__phlippoStore.getState().editFeature(id), extrudeId);
await settle(page);
check('Show Comments in Property Panel: the comment shows', (await page.locator('[data-testid="pm-comments"]').count()) === 1);
// Use transparent flyout Feature Tree: the flyout tree beside the Property Panel has no panel
await page.click('.k-flyout-toggle');
await frames(page);
check('Transparent flyout: the flyout tree is see-through', await S(() => document.querySelector('.k-flyout-tree').classList.contains('transparent') && getComputedStyle(document.querySelector('.k-flyout-body')).backgroundColor === 'rgba(0, 0, 0, 0)'));
await shot('pmcomments-flyout');
await page.click('.k-flyout-toggle');
await page.click('.k-pm-cancel');
await settle(page);

// General ▸ Auto-show Property Panel off: a command leaves the tree in place
await setPref('general.autoShowPM', false);
await S((id) => window.__phlippoStore.getState().editFeature(id), extrudeId);
await settle(page);
check('Auto-show Property Panel off: the tree stays', (await page.locator('.k-pm-host').count()) === 0 && (await page.locator('.k-tree-row').count()) > 0);
await setPref('general.autoShowPM', true);
await frames(page);
check('Auto-show Property Panel on: the Property Panel shows', (await page.locator('.k-pm-host').count()) === 1);
await S(() => window.__phlippoStore.getState().cancelFeature());
await settle(page);

// General ▸ Single command per pick: the line tool ends after one line
await S(() => window.__phlippoStore.getState().newSketch('top'));
await settle(page);
const P = (x, y) => S(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
const click = async (x, y) => { const q = await P(x, y); await page.mouse.move(q.x, q.y); await frames(page, 2); await page.mouse.click(q.x, q.y); await frames(page); };
await setPref('general.singleCommandPerPick', true);
await S(() => window.__phlippoStore.getState().setTool('line'));
await click(2, 3); await click(6, 3);
await settle(page);
const after = await S(() => { const s = window.__phlippoStore.getState(); const k = s.doc.sketches[s.activeSketchId]; return { tool: s.tool, lines: k.entityOrder.filter((id) => k.entities[id].kind === 'line').length }; });
check('Single command per pick: one line, then the tool is cleared', after.tool === 'select' && after.lines === 1, JSON.stringify(after));
await setPref('general.singleCommandPerPick', false);
// Show spline control polygon by default: the poles of a spline, dashed
await S(() => window.__phlippoStore.getState().commit('Spline', (sk) => window.__phlippoKit.addSpline(sk, [{ x: 0, y: 40 }, { x: 20, y: 70 }, { x: 40, y: 40 }, { x: 60, y: 70 }])[0]));
await settle(page);
const dashed = () => S(() => { let n = 0; window.__phlippoScene.traverse((o) => { if (o.type === 'LineSegments' && o.material?.type === 'LineDashedMaterial') n += o.geometry.getAttribute('position').count; }); return n; });
const d0 = await dashed();
await setPref('sketch.splinePolygon', true);
await page.mouse.move(16, 600);
await frames(page, 4);
const d1 = await dashed();
check('Spline control polygon: the dashed poles are drawn', d1 > d0, `${d0} -> ${d1}`);
await shot('splinepolygon');
await setPref('sketch.splinePolygon', false);
await S(() => window.__phlippoStore.getState().exitSketch());
await settle(page);

// Tools ▸ Options: the wired rows are no longer greyed; Import ▸ File Format chooses the options shown
await S(() => window.__phlippoStore.getState().setDialog('options'));
await settle(page);
await page.locator('.k-opt-cat', { hasText: /^Display$/ }).click();
await frames(page);
const greyDisplay = await page.locator('.k-options-body .k-opt-check.disabled, .k-options-body .k-opt-row.disabled').count();
const liveDisplay = await page.locator('.k-options-body .k-opt-check:not(.disabled), .k-options-body .k-opt-row:not(.disabled)').count();
console.log('Options ▸ Display rows: working', liveDisplay, 'greyed', greyDisplay);
check('Options ▸ Display: the newly wired rows are not greyed', await S(() => ['Use shaded face highlighting', 'Highlight all edges of features selected in graphics view', 'Display temporary axes upon hover over cylindrical faces', 'Show open edges of surfaces in different color', 'Show breadcrumbs at mouse pointer'].every((t) => [...document.querySelectorAll('.k-opt-check')].some((l) => l.textContent === t && !l.classList.contains('disabled')))));
await page.locator('.k-opt-check', { hasText: 'Show breadcrumbs at mouse pointer' }).scrollIntoViewIfNeeded();
await frames(page);
await shot('options-display');
await page.locator('.k-opt-cat', { hasText: /^Import$/ }).click();
await frames(page);
const rows = async () => page.locator('.k-options-body').innerText();
const general = await rows();
check('Import ▸ General: Run Import Diagnostics shown, Unit not', /Run Import Diagnostics/.test(general) && !/Unit:/.test(general));
await page.selectOption('.k-opt-row:has-text("File Format") select', 'STL');
await frames(page);
const stl = await rows();
check('Import ▸ STL: Unit shown, Run Import Diagnostics not', /Unit:/.test(stl) && !/Run Import Diagnostics/.test(stl));
await shot('options-import-stl');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
