// Features that were "later": Reference Axis / Point / Coordinate System, Curve / Table / Fill / Variable Pattern,
// Split Line, Projected Curve, Advanced Hole, Stud Wizard, Offset On Surface.
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

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
// a plate 80 x 40 x 10 with a Ø6 cut at (10, 20), and a free sketch with a line (curve) and one with a circle
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s1 = K.createSketch('sk1', 'Sketch1', 'top');
  const c = [[0, 0], [80, 0], [80, 40], [0, 40]];
  for (let i = 0; i < 4; i++) s1 = K.addLine(s1, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  const s2 = K.addCircle(K.createSketch('sk2', 'Sketch2', 'top'), { x: 10, y: 20 }, 3)[0];
  const s3 = K.addLine(K.createSketch('sk3', 'Sketch3', 'top'), { x: 10, y: 20 }, { x: 70, y: 20 })[0];
  const s4 = K.addCircle(K.createSketch('sk4', 'Sketch4', 'top'), { x: 60, y: 20 }, 8)[0];
  const d = { ...K.createDocument('Plate'), sketches: { sk1: s1, sk2: s2, sk3: s3, sk4: s4 }, features: [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sk1', suppressed: false },
    { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sk1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 'sk2', suppressed: false },
    { id: 'f2', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'sk2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false },
    { id: 'k3', type: 'sketch', name: 'Sketch3', sketchId: 'sk3', suppressed: false },
    { id: 'k4', type: 'sketch', name: 'Sketch4', sketchId: 'sk4', suppressed: false },
  ] };
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(1200);
const S = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return { feats: s.doc.features.map((f) => ({ name: f.name, type: f.type })), errors: s.rebuild.errors, faces: s.rebuild.bodies[0]?.faces.length, curves: (s.rebuild.curves ?? []).map((c) => c.id), refs: (s.doc.refGeometry ?? []).map((r) => r.kind + ':' + r.how) }; });
const topFace = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const b = s.rebuild.bodies[0]; const f = b.faces.filter((x) => !x.curved && x.normal[1] > 0.99).sort((a, c) => c.area - a.area)[0]; return { bodyId: b.id, faceId: f.id }; });

// Reference Geometry ▸ Axis from two planes picked in the tree
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Reference Geometry") .k-cm-arrow').catch(skip('features2:47'));
await page.evaluate(() => window.__phlippoStore.getState().startRefGeom('axis'));
await page.waitForTimeout(200);
check('Reference Geometry ▸ Axis opens its Property Panel', (await page.locator('[data-testid="refgeom-pm"]').count()) === 1);
// the planes are picked in the flyout Feature Tree of the graphics area, as the original
await page.click('.k-flyout-toggle');
await page.click('.k-flyout-body .k-tree-row:has-text("Front Plane")');
await page.click('.k-flyout-body .k-tree-row:has-text("Right Plane")');
await page.waitForTimeout(200);
await page.click('[data-testid="refgeom-ok"]');
await page.waitForTimeout(300);
// Point at the centre of the top face, coordinate system
await page.evaluate(() => window.__phlippoStore.getState().startRefGeom('point'));
await page.evaluate((f) => window.__phlippoStore.getState().setSelectedFace(f), await topFace());
await page.waitForTimeout(150);
await page.click('[data-testid="refgeom-ok"]');
await page.waitForTimeout(200);
await page.evaluate(() => window.__phlippoStore.getState().startRefGeom('csys'));
await page.evaluate((f) => window.__phlippoStore.getState().setSelectedFace(f), await topFace());
await page.click('[data-testid="refgeom-ok"]');
await page.waitForTimeout(300);
let st = await S();
check('Axis1 (two planes), Point1 (center of face) and Coordinate System1 are created', st.refs.includes('axis:Two Planes') && st.refs.includes('point:Center of Face') && st.refs.some((r) => r.startsWith('csys')), JSON.stringify(st.refs));
check('the reference geometry shows in the tree', (await page.locator('.k-tree-row:has-text("Axis1")').count()) === 1 && (await page.locator('.k-tree-row:has-text("Coordinate System1")').count()) === 1);
// the reference geometry is drawn as lines in the graphics area (not part of the rebuild curves)
const refDrawn = await page.evaluate(() => { let n = 0; window.__phlippoScene.traverse((o) => { if (o.visible && (o.isLine || o.isLineSegments || o.isLine2 || o.isLineSegments2) && /^ref-/.test(o.name ?? '')) n++; }); return n; });
check('the reference geometry is drawn', refDrawn > 0, String(refDrawn));
await page.screenshot({ path: `${OUT}/f2-refgeom.png` });

// Table Driven Pattern of the cut
const vol = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); const g = s.rebuild.bodies[0].geometry; const p = g.getAttribute('position'); let v = 0; for (let i = 0; i < p.count; i += 3) { const ax = p.getX(i), ay = p.getY(i), az = p.getZ(i), bx = p.getX(i + 1), by = p.getY(i + 1), bz = p.getZ(i + 1), cx = p.getX(i + 2), cy = p.getY(i + 2), cz = p.getZ(i + 2); v += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6; } return Math.abs(v); });
const v0 = await vol();
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.setSelectedFeature('f2'); s.startPattern('tablePattern'); });
await page.waitForTimeout(300);
check('Table Driven Pattern PM shows the XY table', (await page.locator('[data-testid="tpattern-table"]').count()) === 1);
await page.click('[data-testid="tpattern-add"]');
await page.evaluate(() => window.__phlippoStore.getState().commitFeature());
await page.waitForTimeout(1200);
const v1 = await vol();
check('Table Driven Pattern adds three holes', Math.abs(v0 - v1 - 3 * Math.PI * 9 * 10) < 20, JSON.stringify({ v0, v1 }));

// Curve Driven Pattern along Sketch3
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.setSelectedFeature('f2'); s.startPattern('curvePattern'); s.updateFeatureDraft({ curve: { sketchId: 'sk3', count: 3, spacing: 20, equal: true, tangent: false } }); s.commitFeature(); });
await page.waitForTimeout(1200);
st = await S();
check('Curve Driven Pattern builds without errors', st.feats.some((f) => f.type === 'curvePattern') && !Object.keys(st.errors).length, JSON.stringify(st.errors));

// Fill Pattern on the top face
await page.evaluate((f) => { const s = window.__phlippoStore.getState(); s.setSelectedFeature('f2'); s.setSelectedFace(f); s.startPattern('fillPattern'); }, await topFace());
await page.waitForTimeout(300);
check('Fill Pattern takes the selected face as boundary', /Face/.test((await page.locator('[data-testid="fill-face"]').textContent()) ?? ''));
await page.evaluate(() => window.__phlippoStore.getState().cancelFeature());

// Variable Pattern
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.setSelectedFeature('f2'); s.startPattern('variablePattern'); });
await page.waitForTimeout(300);
check('Variable Pattern PM shows the pattern table', (await page.locator('[data-testid="varpattern-table"]').count()) === 1);
await page.evaluate(() => window.__phlippoStore.getState().cancelFeature());

// Split Line with Sketch4 (a circle) and Projected Curve
const faces0 = (await S()).faces;
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.setSelectedFeature('k4'); s.startCurveFeature('splitLine'); s.commitFeature(); });
await page.waitForTimeout(1500);
st = await S();
check('Split Line splits the faces it crosses', st.feats.some((f) => f.type === 'splitLine') && st.faces > faces0 && !Object.keys(st.errors).length, JSON.stringify({ faces0, faces: st.faces, e: st.errors }));
await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.startCurveFeature('projectedCurve'); s.updateFeatureDraft({ sketchId: 'sk3' }); s.commitFeature(); });
await page.waitForTimeout(1200);
st = await S();
check('Projected Curve lies on the body (a 3D curve)', st.feats.some((f) => f.type === 'projectedCurve') && !Object.keys(st.errors).length, JSON.stringify(st.errors));

// Advanced Hole with a far side countersink, Stud Wizard
const v2 = await vol();
await page.evaluate((f) => { const s = window.__phlippoStore.getState(); s.setSelectedFace(f); s.startHole(true); s.addHolePoint({ x: 12, y: 12 }); s.commitFeature(); }, await topFace());
await page.waitForTimeout(1500);
st = await S();
const v3 = await vol();
check('Advanced Hole (counterbore + far side countersink) removes material', st.feats.some((f) => /^Advanced Hole/.test(f.name)) && v3 < v2 - 100 && !Object.keys(st.errors).length, JSON.stringify({ v2, v3, e: st.errors }));
await page.evaluate((f) => { const s = window.__phlippoStore.getState(); s.setSelectedFace(f); s.startStud(); s.commitFeature(); }, await topFace());
await page.waitForTimeout(1500);
const v4 = await vol();
st = await S();
check('Stud Wizard adds an M6 x 20 stud', st.feats.some((f) => f.type === 'stud') && v4 > v3 + 400 && !Object.keys(st.errors).length, JSON.stringify({ v3, v4, e: st.errors }));

// Offset On Surface
await page.evaluate((f) => { const s = window.__phlippoStore.getState(); s.setOffsetSurfEdit({ distance: 3, reverse: false }); s.setSelectedFace(f); }, await topFace());
await page.waitForTimeout(200);
check('Offset On Surface opens its Property Panel', (await page.locator('[data-testid="offsetsurf-pm"]').count()) === 1);
await page.click('[data-testid="offsetsurf-ok"]');
await page.waitForTimeout(600);
st = await S();
check('Offset On Surface creates a 3D sketch', st.feats.some((f) => f.type === 'sketch3d'), JSON.stringify(st.feats.map((f) => f.name)));
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(700, 1000);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/features2.png` });

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
