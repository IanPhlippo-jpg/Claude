// Drag Handles: the end face of an extrusion gets a drag arrow; dragging it changes the depth (ruler readout).
import { chromium } from 'playwright';
import { exitCode, waitSettled } from './lib/check.mjs';
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

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[0, 0], [80, 0], [80, -60], [0, -60]];
  let first = null, prev = null;
  for (let i = 0; i < 4; i++) {
    const p = prev ?? { x: c[i][0], y: c[i][1] };
    const q = i < 3 ? { x: c[i + 1][0], y: c[i + 1][1] } : first;
    const [n, l] = K.addLine(s, p, q);
    s = n; if (!first) first = l.p1; prev = l.p2;
  }
  const d = { ...K.createDocument('Plaat'), sketches: { s1: s } };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(600);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.waitForTimeout(400);
// select the top face (normal +Y at y = 10)
await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const f = b.faces.find((x) => x.normal[1] > 0.99 && Math.abs(x.centroid[1] - 10) < 1e-6);
  window.__phlippoStore.setState({ selectedFace: { bodyId: b.id, faceId: f.id } });
});
await page.waitForTimeout(300);
check('Drag Handles: the selected end face shows the drag arrow', (await page.locator('[data-testid="dragHandles-grip"]').count()) === 1);
const grip = await page.locator('[data-testid="dragHandles-grip"]').boundingBox();
// pixels per mm along +Y from the projection
const pxmm = await page.evaluate(() => { const a = window.__phlippoProjectWorld(40, 10, 30), b = window.__phlippoProjectWorld(40, 20, 30); return { dx: (b.x - a.x) / 10, dy: (b.y - a.y) / 10 }; });
const gx = grip.x + grip.width / 2, gy = grip.y + grip.height / 2;
await page.mouse.move(gx, gy);
await page.mouse.down();
await page.mouse.move(gx + pxmm.dx * 5, gy + pxmm.dy * 5, { steps: 5 });
await page.mouse.move(gx + pxmm.dx * 10, gy + pxmm.dy * 10, { steps: 5 });
const readout = await page.locator('[data-testid="dragHandles-value"]').textContent();
await page.mouse.move(5, 900, { steps: 1 });
await page.mouse.move(gx + pxmm.dx * 10, gy + pxmm.dy * 10);
await shot('i3-drag');
await page.mouse.up();
await page.waitForTimeout(600);
const depth = await page.evaluate(() => window.__phlippoStore.getState().doc.features.find((f) => f.id === 'f1').depth);
check('dragging 10 mm upward makes the extrusion 20 mm deep (readout 20.00mm)', Math.abs(depth - 20) <= 0.5 && /20\.00mm|19\.50mm|20\.50mm/.test(readout), `${depth} ${readout}`);
await page.keyboard.press('Control+z');
await page.waitForTimeout(400);
const back = await page.evaluate(() => window.__phlippoStore.getState().doc.features.find((f) => f.id === 'f1').depth);
check('Undo restores the depth', back === 10, String(back));

// the handle of a selected feature (QA 0.5.11 P2-6): Fillet radius, Chamfer distance, Revolve angle and the depth of a
// Cut (on its floor): dragging changes the value by exactly the dragged amount (snapped to the handle's step)
const vol = () => page.evaluate(() => {
  const r = window.__phlippoStore.getState().rebuild;
  let v = 0;
  for (const b of r.bodies) {
    const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
    const a = g.getAttribute('position');
    for (let i = 0; i + 2 < a.count; i += 3) { const x0 = a.getX(i), y0 = a.getY(i), z0 = a.getZ(i), x1 = a.getX(i + 1), y1 = a.getY(i + 1), z1 = a.getZ(i + 1), x2 = a.getX(i + 2), y2 = a.getY(i + 2), z2 = a.getZ(i + 2); v += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6; }
  }
  return { v: Math.abs(v), errors: Object.keys(r.errors).length, pending: !!r.pending };
});
const settle = async () => {
  await page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, undefined, { timeout: 30000 }).catch(() => undefined);
  await waitSettled(page);
};
/** selects a feature, drags its handle by `delta` units of its value, returns the value afterwards */
async function dragFeature(id, delta, label) {
  await page.evaluate((fid) => { const s = window.__phlippoStore.getState(); window.__phlippoStore.setState({ selectedFace: null, selectedFaces: [] }); s.setSelectedFeature(fid); }, id);
  const shown = await page.locator('[data-testid="featureHandles-grip"]').waitFor({ timeout: 10000 }).then(() => true, () => false);
  check(`${label}: selecting the feature shows its drag handle`, shown);
  if (!shown) return null;
  const meta = await page.evaluate(() => { const el = document.querySelector('[data-testid="featureHandles"]'); return { ux: Number(el.dataset.ux), uy: Number(el.dataset.uy), k: Number(el.dataset.pxPerUnit) }; });
  const grip = await page.locator('[data-testid="featureHandles-grip"]').boundingBox();
  const gx = grip.x + grip.width / 2, gy = grip.y + grip.height / 2;
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  const dx = meta.ux * meta.k * delta, dy = meta.uy * meta.k * delta;
  await page.mouse.move(gx + dx / 2, gy + dy / 2, { steps: 4 });
  await page.mouse.move(gx + dx, gy + dy, { steps: 4 });
  const text = await page.locator('[data-testid="featureHandles-value"]').textContent().catch(() => '');
  await shot(`i3-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`);
  await page.mouse.up();
  await settle();
  const value = await page.evaluate((fid) => { const f = window.__phlippoStore.getState().doc.features.find((x) => x.id === fid); return f.size ?? f.angle ?? f.depth; }, id);
  return { value, text };
}

// the plate with a fillet R2 and a chamfer 2 on two top edges and a 3 mm cut pocket sketched on its top face
await settle();
await page.evaluate(() => {
  const K = window.__phlippoKit, st = window.__phlippoStore.getState();
  const b = st.rebuild.bodies[0];
  const top = b.edges.filter((e) => e.straight && Math.abs(e.centroid.y - 10) < 1e-6);
  const long = top.filter((e) => Math.abs(e.length - 80) < 1e-3).sort((p, q) => p.centroid.z - q.centroid.z);
  // the chamfer on the vertical edge in the far corner, which the fillet on the near long edge does not touch
  const short = b.edges.filter((e) => e.straight && Math.abs(e.length - 10) < 1e-3).sort((p, q) => (q.centroid.x + q.centroid.z) - (p.centroid.x + p.centroid.z));
  let p = K.createSketch('s2', 'Sketch2', 'f1');
  const c = [[30, -20], [50, -20], [50, -40], [30, -40]];
  for (let i = 0; i < 4; i++) p = K.addLine(p, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  const d = st.doc;
  st.applyDocument('setup', { ...d, planes: { ...d.planes, f1: { id: 'f1', name: 'Face', kind: 'face', origin: [0, 10, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] } }, sketches: { ...d.sketches, s2: p }, features: [...d.features,
    { id: 'r1', type: 'fillet', name: 'Fillet1', suppressed: false, size: 2, edges: [K.edgeRef(long[0])] },
    { id: 'c1', type: 'chamfer', name: 'Chamfer1', suppressed: false, size: 2, edges: [K.edgeRef(short[0])] },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false },
    { id: 'x1', type: 'extrude', name: 'Cut-Extrude1', sketchId: 's2', suppressed: false, op: 'cut', end: 'blind', depth: 3, reverse: true }] });
});
await settle();
const v0 = await vol();
check('the plate with fillet, chamfer and cut rebuilds without errors', v0.errors === 0, JSON.stringify({ ...v0, e: await page.evaluate(() => window.__phlippoStore.getState().rebuild.errors) }));
const fil = await dragFeature('r1', 1, 'Fillet radius');
check('Fillet: dragging the handle 1 mm worth along it makes R2 into R3', !!fil && Math.abs(fil.value - 3) <= 0.01, JSON.stringify(fil));
const cha = await dragFeature('c1', 1.5, 'Chamfer distance');
check('Chamfer: dragging 1.5 mm worth makes the distance 3.5', !!cha && Math.abs(cha.value - 3.5) <= 0.01, JSON.stringify(cha));
check('fillet and chamfer rebuild without errors after the drags', (await vol()).errors === 0);

// the cut: its floor face selected, the depth handle (on the cut's end face) 3 -> 5
await page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const b = s.rebuild.bodies[0];
  const f = b.faces.find((x) => x.normal[1] > 0.99 && Math.abs(x.centroid[1] - 7) < 1e-3);
  window.__phlippoStore.setState({ selectedFeatureId: null, selectedFace: f ? { bodyId: b.id, faceId: f.id } : null });
});
const cutGrip = await page.locator('[data-testid="dragHandles-grip"]').waitFor({ timeout: 10000 }).then(() => true, () => false);
check('Cut: its floor shows the depth handle', cutGrip);
if (cutGrip) {
  const g = await page.locator('[data-testid="dragHandles-grip"]').boundingBox();
  const pm = await page.evaluate(() => { const a = window.__phlippoProjectWorld(40, 7, 30), b = window.__phlippoProjectWorld(40, 6, 30); return { dx: b.x - a.x, dy: b.y - a.y }; });
  const cx = g.x + g.width / 2, cy = g.y + g.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + pm.dx, cy + pm.dy, { steps: 4 });
  await page.mouse.move(cx + pm.dx * 2, cy + pm.dy * 2, { steps: 4 });
  await page.mouse.up();
  await settle();
  const cd = await page.evaluate(() => window.__phlippoStore.getState().doc.features.find((f) => f.id === 'x1').depth);
  check('Cut: dragging 2 mm deeper makes the pocket 5 mm deep', Math.abs(cd - 5) <= 0.01, String(cd));
}

// a revolve of 90 degrees: the handle on its end cap turns it to 120
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('r', 'Sketch1', 'front');
  s = K.addLine(s, { x: 0, y: 0 }, { x: 0, y: 40 })[0];
  const c = [[10, 0], [30, 0], [30, 20], [10, 20]];
  for (let i = 0; i < 4; i++) s = K.addLine(s, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  const axis = Object.values(s.entities).find((e) => e.kind === 'line' && s.points[e.p1].x === 0 && s.points[e.p2].x === 0);
  const d = { ...K.createDocument('Ring'), sketches: { r: s } };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'r', suppressed: false }, { id: 'rv', type: 'revolve', name: 'Revolve1', sketchId: 'r', suppressed: false, op: 'boss', axisEntityId: axis.id, angle: 90, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await settle();
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.waitForTimeout(500);
const v90 = await vol();
const rev = await dragFeature('rv', 30, 'Revolve angle');
const v120 = await vol();
check('Revolve: dragging the handle along the turn makes 90 degrees into 120', !!rev && Math.abs(rev.value - 120) <= 0.01, JSON.stringify(rev));
check('Revolve: the volume grows by a third (120/90)', v90.v > 0 && Math.abs(v120.v / v90.v - 4 / 3) < 0.01, `${v90.v.toFixed(1)} -> ${v120.v.toFixed(1)}`);

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
