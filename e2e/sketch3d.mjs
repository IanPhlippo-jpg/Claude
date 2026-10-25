// 3D Sketch and Loft guide curves through the UI: a bent pipe path drawn in space (Tab switches the plane),
// a circle swept along it; then a vase loft with a guide curve picked in the Loft PropertyManager.
import { chromium } from 'playwright';
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
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

// ---- 3D Sketch from the Sketch flyout
await page.click('.k-cm-tab:has-text("Sketch")');
await page.locator('.k-cm-big:has-text("Sketch") .k-cm-arrow').first().click();
await page.click('.k-menu-item:has-text("3D Sketch")');
await page.waitForTimeout(300);
check('3D Sketch PropertyManager (3DSketch1, XY plane)', (await page.locator('[data-testid="sketch3d-pm"]').count()) === 1 && (await page.locator('[data-testid="sketch3d-pm"] .k-pm-stylebtn.active').innerText()) === 'XY');
const W = (x, y, z) => page.evaluate(([x, y, z]) => window.__phlippoProjectWorld(x, y, z), [x, y, z]);
// origin -> (60, 0, 0) -> (60, 40, 0) on XY; Tab twice (ZX) -> (60, 40, 50)
let q = await W(0, 0, 0); await page.mouse.click(q.x, q.y);
q = await W(60, 0, 0); await page.mouse.move(q.x, q.y); await page.mouse.click(q.x, q.y);
q = await W(60, 40, 0); await page.mouse.move(q.x, q.y); await page.mouse.click(q.x, q.y);
await page.keyboard.press('Tab');
await page.keyboard.press('Tab');
await page.waitForTimeout(150);
check('Tab switches the space handle to ZX', (await page.locator('[data-testid="sketch3d-pm"] .k-pm-stylebtn.active').innerText()) === 'ZX');
q = await W(60, 40, 50); await page.mouse.move(q.x, q.y); await page.waitForTimeout(150);
await shot('s3d1-drawing');
await page.mouse.click(q.x, q.y);
await page.waitForTimeout(200);
const segs = await page.evaluate(() => window.__phlippoStore.getState().sketch3dEdit.segments);
const near = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.6;
check('three lines in space, the last one along Z', segs.length === 3 && near(segs[0][1], [60, 0, 0]) && near(segs[1][1], [60, 40, 0]) && near(segs[2][1], [60, 40, 50]), JSON.stringify(segs));
await page.click('.k-cm-big:has-text("Exit Sketch") .k-cm-main');
await page.waitForTimeout(400);
check('3DSketch1 in the tree', (await page.locator('.k-tree-row:has-text("3DSketch1")').count()) === 1);

// ---- a circle on the right plane at the origin, swept along the 3D sketch
await page.evaluate(() => {
  const st = window.__phlippoStore.getState();
  const K = window.__phlippoKit;
  let s = K.createSketch('skc', 'Sketch1', 'right');
  s = K.addCircle(s, { x: 0, y: 0 }, 5)[0];
  const f3d = st.doc.features.find((f) => f.type === 'sketch3d');
  const d = { ...st.doc, sketches: { ...st.doc.sketches, skc: s }, features: [...st.doc.features, { id: 'fc', type: 'sketch', name: 'Sketch1', sketchId: 'skc', suppressed: false }, { id: 'fsw', type: 'sweep', name: 'Sweep1', sketchId: 'skc', pathSketchId: f3d.id, suppressed: false, op: 'boss' }] };
  st.openDocument(d);
});
await page.waitForTimeout(800);
let r = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const g = s.rebuild.bodies[0]?.geometry; if (!g) return { errors: s.rebuild.errors }; g.computeBoundingBox(); return { errors: s.rebuild.errors, max: g.boundingBox.max.toArray() }; });
check('Sweep1 along the 3D sketch reaches (65, 45, 50)', r.max && Object.keys(r.errors).length === 0 && Math.abs(r.max[0] - 65) < 0.6 && Math.abs(r.max[1] - 45) < 0.6 && Math.abs(r.max[2] - 50) < 0.6, JSON.stringify(r));
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('s3d2-sweep');

// ---- Loft with a guide curve through the Loft PropertyManager
await page.evaluate(() => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Vaas', 'part');
  const top = K.REFERENCE_PLANE_DEFS.top;
  d.planes.p100 = { ...top, id: 'p100', name: 'Plane1', origin: [0, 100, 0], kind: 'reference' };
  let a = K.createSketch('sa', 'Sketch1', 'top'); a = K.addCircle(a, { x: 0, y: 0 }, 10)[0];
  let b = K.createSketch('sb', 'Sketch2', 'p100'); b = K.addCircle(b, { x: 0, y: 0 }, 10)[0];
  let g = K.createSketch('sg', 'Sketch3', 'front');
  g = K.addArc(g, { x: -40, y: 50 }, { x: 10, y: 0 }, { x: 10, y: 100 }, true)[0];
  d.sketches = { sa: a, sb: b, sg: g };
  d.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false },
    { id: 'f2', type: 'sketch', name: 'Sketch2', sketchId: 'sb', suppressed: false },
    { id: 'f3', type: 'sketch', name: 'Sketch3', sketchId: 'sg', suppressed: false },
    { id: 'f4', type: 'loft', name: 'Loft1', sketchId: 'sa', sketchId2: 'sb', suppressed: false, op: 'boss' },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);
await page.locator('.k-tree-row:has-text("Loft1")').last().dblclick();
await page.waitForTimeout(400);
await page.locator('[data-testid="loft-add-guide"]').selectOption('sg');
await page.waitForTimeout(300);
check('guide curve listed in the Loft PropertyManager', (await page.locator('[data-testid="loft-guides"]').innerText()).includes('Sketch3'));
await page.click('.k-pm-ok');
await page.waitForTimeout(800);
r = await page.evaluate(() => { const s = window.__phlippoStore.getState(); const g = s.rebuild.bodies[0]?.geometry; if (!g) return { errors: s.rebuild.errors }; g.computeBoundingBox(); return { errors: s.rebuild.errors, max: g.boundingBox.max.toArray() }; });
// the arc through (10,0), (10,100) around (-40,50): x at the middle = -40 + sqrt(50^2+50^2) = 30.7
check('the loft bulges to the guide (x ≈ 30.7 half way)', r.max && Object.keys(r.errors).length === 0 && Math.abs(r.max[0] - 30.7) < 1.2, JSON.stringify(r));
await page.keyboard.press('f');
await page.waitForTimeout(400);
await shot('s3d3-vase');

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = results.every((r) => r.ok) ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
