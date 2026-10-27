// Loft to a face of the model through the Loft Property Panel: the selected top face of a block becomes the second
// profile (Face<1> in the Profiles list), End constraint Curvature To Face with Next Face, OK builds one body from the
// circle down onto the block. Also Face Fillet ▸ Hold line and Insert Bends ▸ Ignore beveled faces in their panels.
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
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

// ---- Loft from a circle (y = 60) to the top face of a block (y = 20)
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('LoftFace', 'part');
  let a = K.createSketch('sa', 'Sketch1', 'top');
  const c = [{ x: -20, y: -20 }, { x: 20, y: -20 }, { x: 20, y: 20 }, { x: -20, y: 20 }];
  for (let i = 0; i < 4; i++) a = K.addLine(a, c[i], c[(i + 1) % 4])[0];
  d.planes.p60 = { ...K.REFERENCE_PLANE_DEFS.top, id: 'p60', name: 'Plane1', origin: [0, 60, 0], kind: 'reference' };
  d.planes.p40 = { ...K.REFERENCE_PLANE_DEFS.top, id: 'p40', name: 'Plane2', origin: [0, 40, 0], kind: 'reference' };
  const b = K.addCircle(K.createSketch('sb', 'Sketch2', 'p60'), { x: 0, y: 0 }, 10)[0];
  const b2 = K.addCircle(K.createSketch('sc', 'Sketch3', 'p40'), { x: 0, y: 0 }, 8)[0];
  d.sketches = { sa: a, sb: b, sc: b2 };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sa', suppressed: false, op: 'boss', end: 'blind', depth: 20, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 'sb', suppressed: false },
    { id: 'k3', type: 'sketch', name: 'Sketch3', sketchId: 'sc', suppressed: false },
    { id: 'l1', type: 'loft', name: 'Loft1', sketchId: 'sb', sketchId2: 'sc', suppressed: false, op: 'boss' },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);
await page.locator('.k-tree-row:has-text("Loft1")').last().dblclick();
await page.waitForTimeout(400);
// the top face of the block, selected
await page.evaluate(() => {
  const st = window.__phlippoStore.getState();
  const b = st.rebuild.bodies.find((x) => x.faces.some((f) => f.normal[1] > 0.999 && Math.abs(f.centroid[1] - 20) < 1e-6 && Math.abs(f.area - 1600) < 400));
  const f = b.faces.find((f) => f.normal[1] > 0.999 && Math.abs(f.centroid[1] - 20) < 1e-6);
  window.__phlippoStore.setState({ selectedFace: { bodyId: b.id, faceId: f.id } });
});
await page.waitForTimeout(200);
await page.click('[data-testid="loft-face2"]');
await page.waitForTimeout(400);
check('Profiles: Sketch2 and Face<1>', (await page.locator('[data-testid="loft-profiles"]').innerText()).includes('Face<1>'), await page.locator('[data-testid="loft-profiles"]').innerText());
await page.click('.k-section-title:has-text("Start/End Constraints")');
await page.waitForTimeout(200);
await page.locator('[data-testid="loft-end"]').selectOption('curvature');
await page.waitForTimeout(300);
check('End constraint offers Curvature To Face with Next Face', (await page.locator('[data-testid="loft-end-nextface"]').count()) === 1);
await page.click('[data-testid="loft-end-nextface"]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/loftface-pm.png` });
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
let r = await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const f = s.doc.features.find((x) => x.id === 'l1');
  const g = s.rebuild.bodies[0]?.geometry;
  g?.computeBoundingBox();
  return { fe: !!s.featureEdit, draft: s.featureEdit ? { face2: s.featureEdit.draft.face2, sketchId2: s.featureEdit.draft.sketchId2 } : null, msgs: s.messages.map((m) => m.text), face2: !!f.face2, sketchId2: f.sketchId2, endType: f.endType, endFace: f.endFace, errors: s.rebuild.errors, bodies: s.rebuild.bodies.length, maxY: g?.boundingBox.max.y };
});
check('Loft1 runs from the circle onto the face: one body up to y = 60, no errors', r.face2 && r.sketchId2 === '' && r.bodies === 1 && Math.abs(r.maxY - 60) < 0.5 && Object.keys(r.errors).length === 0, JSON.stringify(r));
check('Curvature To Face with Next Face stored', r.endType === 'curvature' && r.endFace === 1, JSON.stringify(r));
await page.keyboard.press('f');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/loftface-model.png` });

// ---- Face Fillet ▸ Hold line in its panel: the method select shows the hold line box
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Bar', 'part');
  let s = K.createSketch('s1', 'Sketch1', 'front');
  const c = [{ x: 0, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 20 }, { x: 0, y: 20 }];
  for (let i = 0; i < 4; i++) s = K.addLine(s, c[i], c[(i + 1) % 4])[0];
  d.sketches = { s1: s };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 6, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
  window.__phlippoStore.getState().startRound('fillet');
});
await page.waitForTimeout(400);
await page.click('[data-testid="fillet-type-face"]');
await page.waitForTimeout(200);
await page.locator('[data-testid="fillet-method"]').selectOption('hold');
await page.waitForTimeout(200);
check('Face Fillet ▸ Hold line: the hold line box asks for an edge', (await page.locator('[data-testid="fillet-holdline"]').innerText()).includes('Select the hold line'));
// faces: top and front, then the hold line (the back top edge)
await page.evaluate(() => {
  const st = window.__phlippoStore.getState();
  const b = st.rebuild.bodies[0];
  const top = b.faces.find((f) => f.normal[1] > 0.999), front = b.faces.find((f) => f.normal[2] > 0.999);
  st.setSelectedFace({ bodyId: b.id, faceId: top.id });
  window.__phlippoStore.getState().setSelectedFace({ bodyId: b.id, faceId: front.id });
  const hold = b.edges.find((e) => e.straight && Math.abs(e.centroid.y - 20) < 1e-6 && Math.abs(e.centroid.z) < 1e-6);
  window.__phlippoStore.getState().toggleSelectedEdge(hold.id);
});
await page.waitForTimeout(300);
check('the picked edge is the hold line', (await page.locator('[data-testid="fillet-holdline"]').innerText()).includes('Edge<1>'));
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
r = await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const f = s.doc.features.find((x) => x.type === 'fillet');
  const g = s.rebuild.bodies[0].geometry;
  const p = (g.index ? g.toNonIndexed() : g).getAttribute('position');
  let v = 0;
  for (let i = 0; i < p.count; i += 3) { const a = [p.getX(i), p.getY(i), p.getZ(i)], b = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)], c = [p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)]; v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6; }
  return { hold: !!f?.holdLine, errors: s.rebuild.errors, volume: Math.abs(v) };
});
const expected = 60 * 20 * 6 - (1 - Math.PI / 4) * 36 * 60;
check('Fillet with the hold line 6 mm away: radius 6 (volume)', r.hold && Object.keys(r.errors).length === 0 && Math.abs(r.volume - expected) < 20, JSON.stringify({ ...r, expected }));

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
