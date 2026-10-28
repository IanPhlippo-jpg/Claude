// Differences from playlist videos 46–58 made good (third part): the slot is one entity (Trim asks first, with
// Don't show again), the on-screen numeric input while drawing a line, the menus with real fly-outs (Insert ▸ Features
// ▸ …), the 3D sketch with Sketch Fillet and line lengths, Curve Through XYZ Points as a sweep path, Override default
// parameters when editing Base-Flange1 and the Zoom/Pan/Rotate fly-out in the right-click menu of a feature.
import { chromium } from 'playwright';
import { exitCode, skip } from './lib/check.mjs';
import { menuPath } from './lib/menu.mjs';
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
let r;

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); localStorage.setItem('phlippo.prefs', JSON.stringify({ 'sketch.numericInput': true })); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(400);
await page.click('.k-doctype:has-text("Part")');
await page.click('.k-tree-row:has-text("Front Plane")');
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Sketch") .k-cm-main');
await page.waitForTimeout(400);
const vp = await page.locator('.k-viewport').boundingBox();
const cx = vp.x + vp.width / 2, cy = vp.y + vp.height / 2;

// ---- a slot, then Trim on one of its lines: the warning with Don't show again
await page.click('.k-cm-iconbtn[data-tip="Straight Slot"]');
await page.mouse.click(cx - 150, cy);
await page.mouse.move(cx + 150, cy);
await page.waitForTimeout(80);
await page.mouse.click(cx + 150, cy);
await page.mouse.move(cx, cy - 40);
await page.waitForTimeout(80);
await page.mouse.click(cx, cy - 40);
await page.waitForTimeout(300);
r = await S(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return Object.values(sk.entities).filter((e) => e.slot).length; });
check('the slot is one entity: its two lines, two arcs and centreline belong together', r === 5, String(r));
await S(() => window.__phlippoStore.getState().setTool('trim'));
await page.waitForTimeout(100);
// the top line of the slot lies 40 px above the centre
await page.mouse.click(cx, cy - 40);
await page.waitForTimeout(300);
check('Trim on a slot line asks "This trim operation will destroy the slot entity"', (await page.locator('[data-testid="ask"]').innerText().catch(skip('videos54.mjs:52', ''))).includes('destroy the slot entity') && (await page.locator('[data-testid="ask-dontshow"]').count()) === 1);
await page.screenshot({ path: `${OUT}/videos54-slottrim.png` });
await page.click('[data-testid="ask-no"]');
r = await S(() => { const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId]; return Object.values(sk.entities).filter((e) => e.slot).length; });
check('No keeps the slot as it was', r === 5, String(r));

// ---- the on-screen numeric input: a line typed to 50
await S(() => { const s = window.__phlippoStore.getState(); s.setTool('line'); });
await page.mouse.click(cx - 200, cy + 150);
await page.mouse.move(cx - 100, cy + 150);
await page.waitForTimeout(150);
check('the numeric input box shows beside the pointer while drawing', (await page.locator('[data-testid="numeric-input"]').count()) === 1);
await page.keyboard.press('5');
await page.waitForTimeout(80);
await page.keyboard.type('0');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
r = await S(() => {
  const s = window.__phlippoStore.getState(); const sk = s.doc.sketches[s.activeSketchId];
  const ls = Object.values(sk.entities).filter((e) => e.kind === 'line' && !e.slot);
  return ls.map((l) => Math.hypot(sk.points[l.p2].x - sk.points[l.p1].x, sk.points[l.p2].y - sk.points[l.p1].y));
});
check('typing 50 makes the line 50 long', r.some((l) => Math.abs(l - 50) < 1e-6), JSON.stringify(r));
await page.keyboard.press('Escape');
await page.keyboard.press('Escape');
await S(() => { const s = window.__phlippoStore.getState(); s.setTool('select'); s.exitSketch(); });
await page.waitForTimeout(300);

// ---- the menus nest their groups: Insert ▸ Features ▸ Delete/Keep Body…
await page.hover('.k-brand');
await page.click('.k-mb-menu:has-text("Insert")');
await page.waitForTimeout(150);
check('Insert shows Features as a fly-out (not "Features ▸ …" rows)', (await page.locator('.k-menu-flyhost .k-menu-item:has-text("Features")').count()) >= 1 && (await page.locator('.k-menu-item:has-text("Features ▸")').count()) === 0);
check('Insert ▸ Features ▸ Delete/Keep Body… is in the fly-out', (await menuPath(page, 'Features ▸ Delete/Keep Body…').count()) === 1);
await page.screenshot({ path: `${OUT}/videos54-menu.png` });
await page.keyboard.press('Escape');
await page.mouse.click(cx, cy + 300);

// ---- a 3D sketch: two lines, a typed length and a Sketch Fillet at the corner
await S(() => {
  const st = window.__phlippoStore.getState();
  st.start3DSketch();
  window.__phlippoStore.setState({ sketch3dEdit: { ...window.__phlippoStore.getState().sketch3dEdit, segments: [[[0, 0, 0], [50, 0, 0]], [[50, 0, 0], [50, 0, 40]]], last: [50, 0, 40] } });
});
await page.waitForTimeout(200);
const len0 = page.locator('[data-testid="sketch3d-length-0"] input');
await len0.fill('60');
await len0.press('Enter');
await page.waitForTimeout(150);
r = await S(() => window.__phlippoStore.getState().sketch3dEdit.segments);
check('Line1 typed to 60: its end and the line after it move along', r[0][1][0] === 60 && r[1][0][0] === 60 && r[1][1][0] === 60 && r[1][1][2] === 40, JSON.stringify(r));
await page.click('.k-section-title:has-text("Sketch Fillet")').catch(skip('videos54.mjs:103'));
await page.waitForTimeout(100);
await page.click('[data-testid="sketch3d-fillet-all"]');
await page.waitForTimeout(150);
check('Fillet all corners adds SketchFillet1 at the corner', (await page.locator('[data-testid="sketch3d-fillet-row"]').count()) === 1);
await page.screenshot({ path: `${OUT}/videos54-sketch3d.png` });
await S(() => window.__phlippoStore.getState().commit3DSketch());
await page.waitForTimeout(400);
r = await S(() => { const s = window.__phlippoStore.getState(); const f = s.doc.features.find((x) => x.type === 'sketch3d'); const c = s.rebuild.curves?.find((x) => x.id === f.id); return { fillets: f.fillets?.length, n: c?.points.length }; });
check('the 3D sketch keeps the fillet and its curve runs round the corner', r.fillets === 1 && r.n > 6, JSON.stringify(r));

// ---- Curves ▸ Curve Through XYZ Points: the Curve File table
await S(() => window.__phlippoStore.getState().setDialog('curveXYZ'));
await page.waitForTimeout(200);
const cell = (i, k) => page.locator(`[data-testid="curve-${i}-${k}"]`);
await cell(0, 0).fill('0'); await cell(0, 1).fill('0'); await cell(0, 2).fill('0');
await cell(1, 0).fill('30'); await cell(1, 1).fill('20'); await cell(1, 2).fill('0');
await cell(2, 0).fill('60'); await cell(2, 1).fill('0'); await cell(2, 2).fill('20');
check('the Curve File table grows a row as the last one is filled', (await page.locator('[data-testid="curve-table"] tbody tr').count()) === 4);
await page.screenshot({ path: `${OUT}/videos54-curvefile.png` });
await page.click('[data-testid="curve-ok"]');
await page.waitForTimeout(400);
r = await S(() => { const s = window.__phlippoStore.getState(); const f = s.doc.features.find((x) => x.type === 'curvePoints'); return { name: f?.name, pts: f?.points?.length, curve: !!s.rebuild.curves?.find((c) => c.id === f?.id) }; });
check('OK adds Curve1 through the three points', r.name === 'Curve1' && r.pts === 3 && r.curve, JSON.stringify(r));

// ---- Base-Flange1 edited: Override default parameters unlocks thickness and radius
await S(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Override', 'part');
  let a = K.createSketch('sa', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 40 }, { x: 0, y: 40 }];
  for (let i = 0; i < 4; i++) a = K.addLine(a, c[i], c[(i + 1) % 4])[0];
  d.sketches = { sa: a };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false }, { id: 'b1', type: 'baseFlange', name: 'Base-Flange1', sketchId: 'sa', suppressed: false, depth: 10, reverse: false }];
  d.sheetMetal = { thickness: 2, bendRadius: 2, kFactor: 0.5 };
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(500);
await S(() => window.__phlippoStore.getState().editFeature('b1'));
await page.waitForTimeout(300);
check('editing Base-Flange1 shows Override default parameters, the thickness locked', (await page.locator('[data-testid="bf-override"]').count()) === 1 && (await page.locator('.k-pm-host .k-number.disabled').count()) >= 2);
await page.click('[data-testid="bf-override"]');
await page.waitForTimeout(150);
check('Override default parameters unlocks them', (await page.locator('.k-pm-host .k-number.disabled').count()) === 0);
await S(() => window.__phlippoStore.getState().cancelFeature());

// ---- Edit Flange Profile: the flange's outline as a sketch on its face, the Profile Sketch dialog, a hole in the tab
await S(() => window.__phlippoStore.getState().cancelFeature());
await S(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Profile', 'part');
  let a = K.createSketch('sa', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 40 }, { x: 0, y: 40 }];
  for (let i = 0; i < 4; i++) a = K.addLine(a, c[i], c[(i + 1) % 4])[0];
  d.sketches = { sa: a };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false }, { id: 'b1', type: 'baseFlange', name: 'Base-Flange1', sketchId: 'sa', suppressed: false, depth: 10, reverse: false }];
  d.sheetMetal = { thickness: 2, bendRadius: 2, kFactor: 0.5 };
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
const vol0 = await S(() => { const g = window.__phlippoStore.getState().rebuild.bodies[0].geometry; const p = (g.index ? g.toNonIndexed() : g).getAttribute('position'); let v = 0; for (let i = 0; i < p.count; i += 3) { const a = [p.getX(i), p.getY(i), p.getZ(i)], b = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)], c = [p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)]; v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6; } return Math.abs(v); });
await S(() => {
  const st = window.__phlippoStore.getState();
  st.startEdgeFlange();
  const b = window.__phlippoStore.getState().rebuild.bodies[0];
  // a long top edge of the plate (60 mm, along x)
  const e = b.edges.filter((x) => x.straight && Math.abs(x.length - 60) < 1e-6).sort((p, q) => q.centroid.y - p.centroid.y)[0];
  window.__phlippoStore.getState().updateFeatureDraft({ edge: window.__phlippoKit.edgeRef(e), length: 25, lengthMode: 'tangentBend' });
});
await page.waitForTimeout(300);
await page.click('[data-testid="flange-editprofile"]');
await page.waitForTimeout(400);
check('Edit Flange Profile opens the profile sketch with the Profile Sketch dialog: "The sketch is valid."', (await page.locator('[data-testid="profile-msg"]').innerText().catch(skip('videos54.mjs:175', ''))) === 'The sketch is valid.' && await S(() => !!window.__phlippoStore.getState().activeSketchId));
// an open line makes the profile invalid, a circle inside the outline is a hole
await S(() => {
  const st = window.__phlippoStore.getState();
  st.commit('line', (k) => window.__phlippoKit.addLine(k, { x: 5, y: 30 }, { x: 15, y: 40 })[0]);
});
await page.waitForTimeout(150);
check('an open line: "The sketch has both open and closed contours." and Finish greyed', (await page.locator('[data-testid="profile-msg"]').innerText()) === 'The sketch has both open and closed contours.' && await page.locator('[data-testid="profile-finish"]').isDisabled());
await page.screenshot({ path: `${OUT}/videos54-profile-invalid.png` });
await S(() => window.__phlippoStore.getState().undo());
await S(() => {
  const st = window.__phlippoStore.getState();
  st.commit('hole', (k) => window.__phlippoKit.addCircle(k, { x: 30, y: 12 }, 4)[0]);
});
await page.waitForTimeout(150);
check('a circle inside: valid again', (await page.locator('[data-testid="profile-msg"]').innerText()) === 'The sketch is valid.');
await page.screenshot({ path: `${OUT}/videos54-profile.png` });
await page.click('[data-testid="profile-finish"]');
await page.waitForTimeout(800);
r = await S(() => {
  const s = window.__phlippoStore.getState();
  const f = s.doc.features.find((x) => x.type === 'edgeFlange');
  const g = s.rebuild.bodies[0].geometry; const p = (g.index ? g.toNonIndexed() : g).getAttribute('position'); let v = 0;
  for (let i = 0; i < p.count; i += 3) { const a = [p.getX(i), p.getY(i), p.getZ(i)], b = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)], c = [p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)]; v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6; }
  return { profile: !!f?.profileSketchId, errors: s.rebuild.errors, vol: Math.abs(v), active: s.activeSketchId };
});
// the flange 60 wide, leg 25, a Ø8 hole: about ring·60 + 60·25·2 − π·16·2 more than the plate
const ring = (Math.PI / 4) * (16 - 4);
const expected = ring * 60 + 60 * 25 * 2 - Math.PI * 16 * 2;
check('Finish makes Edge-Flange1 with the profile and the hole', r.profile && !Object.keys(r.errors).length && !r.active && Math.abs(r.vol - vol0 - expected) < 40, JSON.stringify({ ...r, vol0, expected }));
await page.screenshot({ path: `${OUT}/videos54-flange.png` });

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
