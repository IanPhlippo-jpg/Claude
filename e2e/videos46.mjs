// Differences from playlist videos 08–55 made good (second part): Σ in a field driven by an equation, the Equations
// folder with Σ, the context toolbar of a plane, renaming a body and a plane, Delete/Keep Body as a Property Panel,
// Base Flange on sheet metal as Tab1, the Selection Filter (F5), the sketch tool prompts, Normal Distance between two
// parallel faces, Diameter of a cylindrical face, Mass Properties of selected bodies and a doubled distance.
import { chromium } from 'playwright';
import { exitCode, skip } from './lib/check.mjs';
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
const status = () => page.locator('.k-statusbar').innerText();
let r;
const readout = () => page.locator('[data-testid="status-readout"]').innerText().catch(skip('videos46.mjs:21', ''));

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

// two plates side by side (two bodies) with a Ø20 hole in the first; the depth of Boss-Extrude1 = "T" * 2
await S(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Videos46', 'part');
  let a = K.createSketch('sa', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 40 }, { x: 0, y: 40 }];
  for (let i = 0; i < 4; i++) a = K.addLine(a, c[i], c[(i + 1) % 4])[0];
  a = K.addCircle(a, { x: 30, y: 20 }, 10)[0];
  let b = K.createSketch('sb', 'Sketch2', 'top');
  const e = [{ x: 100, y: 0 }, { x: 140, y: 0 }, { x: 140, y: 40 }, { x: 100, y: 40 }];
  for (let i = 0; i < 4; i++) b = K.addLine(b, e[i], e[(i + 1) % 4])[0];
  d.sketches = { sa: a, sb: b };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sa', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 'sb', suppressed: false },
    { id: 'e2', type: 'extrude', name: 'Boss-Extrude2', sketchId: 'sb', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false, merge: false },
  ];
  d.equations = [{ id: 'q1', target: 'T', expression: '6' }, { id: 'q2', target: 'D1@Boss-Extrude1', expression: '"T" * 2' }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(900);

// ---- Σ in the field and in the tree
check('the Equations folder shows its equations', /"T" = 6/.test(await page.locator('.k-tree').first().innerText()) || (await page.locator('.k-tree-row:has-text("Equations") .caret').first().click().then(() => page.waitForTimeout(150)).then(() => page.locator('.k-tree').first().innerText())).includes('"T" = 6'));
await page.locator('.k-tree-row[data-id="e1"]').first().dblclick();
await page.waitForTimeout(400);
check('the Depth driven by "T" * 2 shows Σ', (await page.locator('[data-testid="field-sigma"]').count()) >= 1);
const dep = page.locator('.k-number-eq input').first();
await dep.click();
await page.waitForTimeout(150);
check('a click into the field shows its equation', (await page.locator('[data-testid="eq-input"]').inputValue().catch(skip('videos46.mjs:61', ''))).includes('"T" * 2'));
await page.keyboard.press('Escape');
await S(() => window.__phlippoStore.getState().cancelFeature());
await page.waitForTimeout(200);

// ---- status bar: Normal Distance between the top faces of the two plates (0), the hole's Diameter
await S(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const f = b.faces.find((x) => x.curved); s.setSelectedFace({ bodyId: b.id, faceId: f.id }); });
await page.waitForTimeout(200);
check('a cylindrical face shows its Diameter (20mm)', /Diameter: 20mm/.test(await readout()), await readout());
await S(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const top = b.faces.find((x) => !x.curved && x.normal[1] > 0.999), bot = b.faces.find((x) => !x.curved && x.normal[1] < -0.999); s.setSelectedFace({ bodyId: b.id, faceId: top.id }); s.setSelectedFace({ bodyId: b.id, faceId: bot.id }, true); });
await page.waitForTimeout(200);
check('two parallel faces show the Normal Distance (12mm)', /Normal Distance: 12mm/.test(await readout()), await readout());
await S(() => window.__phlippoStore.getState().setSelectedFace(null));

// ---- the context toolbar of Top Plane; F2 renames it
await page.locator('.k-tree-row:has-text("Top Plane")').first().click();
await page.waitForTimeout(700);
check('Top Plane: context toolbar Sketch, Show, Zoom to Selection, Normal To', (await page.locator('[data-testid="ctx-plane-sketch"]').count()) === 1 && (await page.locator('[data-testid="ctx-plane-show"]').count()) === 1 && (await page.locator('[data-testid="ctx-zoom-selection"]').count()) === 1 && (await page.locator('[data-testid="ctx-normal-to"]').count()) === 1);
const pb = await page.locator('[data-testid="tree-ctxbar"]').boundingBox();
if (pb) { await page.mouse.move(pb.x + 30, pb.y + pb.height / 2); await page.waitForTimeout(150); }
await page.locator('[data-testid="ctx-plane-show"]').click();
await page.waitForTimeout(200);
check('Show makes Top Plane visible on its own', await S(() => window.__phlippoStore.getState().doc.planeVisibility?.top === true));
await page.locator('.k-tree-row:has-text("Top Plane")').first().click();
await page.keyboard.press('Escape');
await page.keyboard.press('F2');
await page.waitForTimeout(150);
await page.locator('[data-testid="tree-rename"]').fill('Top Plane-FLOOR PLANE');
await page.locator('[data-testid="tree-rename"]').press('Enter');
await page.waitForTimeout(200);
check('F2 renames Top Plane', (await page.locator('.k-tree').first().innerText()).includes('Top Plane-FLOOR PLANE'));

// ---- a body renamed through its menu
await page.locator('.k-tree-row:has-text("Solid Bodies") .caret').first().click().catch(skip('videos46.mjs:94'));
await page.waitForTimeout(150);
await page.locator('.k-tree-row[data-id^="body-"]').first().click({ button: 'right' });
await page.waitForTimeout(150);
await page.locator('.k-menu-item:has-text("Rename")').first().click();
await page.locator('[data-testid="tree-rename"]').fill('MAIN ROD');
await page.locator('[data-testid="tree-rename"]').press('Enter');
await page.waitForTimeout(200);
check('a body renamed to MAIN ROD', (await page.locator('.k-tree').first().innerText()).includes('MAIN ROD'));

// ---- Mass Properties of a selected body
await S(() => window.__phlippoStore.getState().setDialog('mass'));
await page.waitForTimeout(400);
const massAll = await page.locator('.k-panel-body').last().innerText();
await page.locator('[data-testid="mass-bodies"] input').first().check();
await page.waitForTimeout(300);
check('Mass Properties lists the picked body in Selected items', (await page.locator('[data-testid="mass-selected"]').inputValue()) === 'MAIN ROD');
check('the report changes to that body only', (await page.locator('.k-panel-body').last().innerText()) !== massAll);
await S(() => window.__phlippoStore.getState().setDialog(null));

// ---- Delete/Keep Body as a Property Panel
await page.locator('.k-tree-row[data-id^="body-"]').nth(1).click({ button: 'right' });
await page.waitForTimeout(150);
await page.locator('.k-menu-item:has-text("Delete/Keep Body")').first().click();
await page.waitForTimeout(300);
check('Delete/Keep Body opens its Property Panel with Delete Bodies / Keep Bodies', (await page.locator('.k-pm-host').innerText()).includes('Keep Bodies') && (await page.locator('[data-testid="dkb-bodies"] input:checked').count()) === 1);
await page.click('[data-testid="dkb-keep"]');
await page.click('.k-pm-ok');
await page.waitForTimeout(600);
r = await S(() => { const s = window.__phlippoStore.getState(); return { n: s.rebuild.bodies.length, f: s.doc.features.find((f) => f.type === 'deleteBody') }; });
check('Keep Bodies keeps only the picked body', r.n === 1 && r.f?.keep === true && r.f?.name === 'Body-Delete/Keep1', JSON.stringify(r));

// ---- Selection Filter: F5 shows it; Filter Faces lets no edge through
await page.mouse.click(1000, 600);
await page.keyboard.press('F5');
await page.waitForTimeout(150);
check('F5 shows the Selection Filter toolbar', (await page.locator('[data-testid="selection-filter"]').count()) === 1);
await page.click('[data-testid="selfilter-faces"]');
check('Filter Faces is checked', await S(() => window.__phlippoStore.getState().selFilter.types.join() === 'faces'));
await page.screenshot({ path: `${OUT}/videos46-selfilter.png` });
await page.click('[data-testid="selfilter-faces"]');
await page.keyboard.press('F5');

// ---- sketch tool prompts
await S(() => { const s = window.__phlippoStore.getState(); s.newSketch('front'); s.setTool('rectangle'); });
await page.waitForTimeout(300);
check('Corner Rectangle prompt "Click one corner, then the opposite corner"', (await status()).includes('Click one corner, then the opposite corner'), await status());
await S(() => window.__phlippoStore.getState().setTool('circle'));
await page.waitForTimeout(150);
check('Circle prompt "Click the centre, then a point on the circle (or drag from the centre)."', (await status()).includes('Click the centre, then a point on the circle (or drag from the centre).'));

// ---- a doubled distance: a point and a centerline, the text past the centerline
await S(() => {
  const st = window.__phlippoStore.getState();
  st.setTool('select');
  st.commit('test', (k) => {
    const K = window.__phlippoKit;
    let s = K.addLine(k, { x: 0, y: -30 }, { x: 0, y: 30 }, true)[0];
    s = K.addPoint(s, { x: 20, y: 0 })[0];
    return s;
  });
});
await page.waitForTimeout(200);
r = await S(() => {
  const st = window.__phlippoStore.getState();
  const sk = st.doc.sketches[st.activeSketchId];
  const cl = Object.values(sk.entities).find((e) => e.kind === 'line' && e.construction);
  const pt = Object.values(sk.entities).find((e) => e.kind === 'point');
  st.commit('dim', (k) => window.__phlippoKit.addConstraint(k, 'distance', [pt.id, cl.id], { value: 50, doubled: true })[0]);
  const s2 = window.__phlippoStore.getState();
  const k2 = s2.doc.sketches[s2.activeSketchId];
  const q = k2.points[pt.p], a = k2.points[cl.p1], b = k2.points[cl.p2];
  return { d: Math.abs((b.x - a.x) * (q.y - a.y) - (b.y - a.y) * (q.x - a.x)) / Math.hypot(b.x - a.x, b.y - a.y) };
});
check('a doubled distance of 50 puts the point 25 from the centerline', Math.abs(r.d - 25) < 1e-6, JSON.stringify(r));
await page.screenshot({ path: `${OUT}/videos46-doubled.png` });
await S(() => window.__phlippoStore.getState().exitSketch());
await page.waitForTimeout(300);

// ---- a Base Flange on a part that is sheet metal already: Tab1 with the shortened panel
await S(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Tab', 'part');
  let a = K.createSketch('sa', 'Sketch1', 'top');
  const c = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 40 }, { x: 0, y: 40 }];
  for (let i = 0; i < 4; i++) a = K.addLine(a, c[i], c[(i + 1) % 4])[0];
  let b = K.createSketch('sb', 'Sketch2', 'top');
  const e = [{ x: 60, y: 10 }, { x: 80, y: 10 }, { x: 80, y: 30 }, { x: 60, y: 30 }];
  for (let i = 0; i < 4; i++) b = K.addLine(b, e[i], e[(i + 1) % 4])[0];
  d.sketches = { sa: a, sb: b };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false }, { id: 'b1', type: 'baseFlange', name: 'Base-Flange1', sketchId: 'sa', suppressed: false, depth: 10, reverse: false }, { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 'sb', suppressed: false }];
  d.sheetMetal = { thickness: 2, bendRadius: 2, kFactor: 0.5 };
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
await S(() => { const s = window.__phlippoStore.getState(); s.setSelectedFeature('k2'); s.startBaseFlange(); });
await page.waitForTimeout(300);
r = await S(() => window.__phlippoStore.getState().featureEdit?.draft.name);
check('a Base Flange on sheet metal is named Tab1', r === 'Tab1', String(r));
check('the Tab panel shows only Sheet Metal Parameters with Merge result', (await page.locator('[data-testid="tab-merge"]').count()) === 1 && (await page.locator('.k-pm-host').innerText()).includes('Reverse direction') && !(await page.locator('.k-pm-host').innerText()).includes('Bend Allowance'));
await S(() => window.__phlippoStore.getState().cancelFeature());

// ---- Sketch/Curve Color as a Property Panel
await page.locator('.k-tree-row:has-text("Sketch2")').last().click({ button: 'right' });
await page.waitForTimeout(150);
await page.locator('.k-menu-item:has-text("Sketch Color")').first().click();
await page.waitForTimeout(300);
check('Sketch Color opens the Sketch/Curve Color panel (Remove Color, standard palette, configurations)', /Remove Color[\s\S]*standard[\s\S]*All configurations/.test(await page.locator('[data-testid="curvecolor-pm"]').innerText().catch(skip('videos46.mjs:201', ''))));
await page.locator('[data-testid="curvecolor-grid"] button[title="#ff0000"]').click();
await page.screenshot({ path: `${OUT}/videos46-curvecolor.png` });
await page.click('[data-testid="curvecolor-ok"]');
await page.waitForTimeout(200);
check('OK gives Sketch2 the picked colour', await S(() => window.__phlippoStore.getState().doc.sketches.sb.color === '#ff0000'));

// ---- Curves ▸ Composite Curve: two top edges of the plate joined, then a circular sweep along it
await S(() => window.__phlippoStore.getState().cancelFeature());
await S(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Comp', 'part');
  let a = K.createSketch('sa', 'Sketch1', 'top');
  const c = [{ x: -20, y: -20 }, { x: 20, y: -20 }, { x: 20, y: 20 }, { x: -20, y: 20 }];
  for (let i = 0; i < 4; i++) a = K.addLine(a, c[i], c[(i + 1) % 4])[0];
  d.sketches = { sa: a };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sa', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
await page.click('.k-ribbon-tab:has-text("Features")').catch(skip('videos46.mjs:221'));
await S(() => window.__phlippoStore.getState().startCompositeCurve());
await page.waitForTimeout(200);
check('Composite Curve opens its panel (Entities to Join)', (await page.locator('.k-pm-host').innerText()).includes('Entities to Join'));
await S(() => {
  const st = window.__phlippoStore.getState();
  const top = st.rebuild.bodies[0].edges.filter((e) => e.straight && Math.abs(e.centroid.y - 20) < 1e-6);
  const e1 = top.find((e) => Math.abs(e.centroid.x - 20) < 1e-6);
  const end = e1.points[e1.points.length - 1];
  const e2 = top.find((e) => e !== e1 && e.points.some((p) => p.distanceTo(end) < 1e-6));
  st.updateFeatureDraft({ edges: [window.__phlippoKit.edgeRef(e1), window.__phlippoKit.edgeRef(e2)] });
});
check('the two edges are listed as Edge<1> and Edge<2>', /Edge<1>[\s\S]*Edge<2>/.test(await page.locator('[data-testid="comp-entities"]').innerText()));
await page.click('.k-pm-ok');
await page.waitForTimeout(500);
r = await S(() => { const s = window.__phlippoStore.getState(); const c = s.rebuild.curves?.find((x) => x.name === 'CompCurve1'); return { n: c?.points.length, errors: s.rebuild.errors, tree: s.doc.features.map((f) => f.name) }; });
check('CompCurve1 is one curve of the two edges', r.n === 3 && !Object.keys(r.errors).length && r.tree.includes('CompCurve1'), JSON.stringify(r));
await page.screenshot({ path: `${OUT}/videos46-compcurve.png` });

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
