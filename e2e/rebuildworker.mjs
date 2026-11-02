// Rebuild worker (QA F46): a heavy part (a plate with a 8 × 8 pattern of cut holes) rebuilds in the worker. The window
// keeps drawing frames while it runs, the status bar says "Rebuilding…", the old model stays until the new one is
// there, and a newer edit makes the running rebuild void.
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
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

const base = new URL(process.env.E2E_URL ?? 'http://localhost:4173/');
base.searchParams.set('rebuild', 'worker');
await page.goto(base.href);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

const N = 8;
// a 300 × 300 × 10 plate with one Ø6 hole, patterned N × N
await page.evaluate((N) => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Zeef', 'part');
  d.id = 'zeef';
  let a = K.createSketch('sa', 'Sketch1', 'top');
  a = K.addLine(a, { x: 0, y: 0 }, { x: 300, y: 0 })[0];
  a = K.addLine(a, { x: 300, y: 0 }, { x: 300, y: 300 })[0];
  a = K.addLine(a, { x: 300, y: 300 }, { x: 0, y: 300 })[0];
  a = K.addLine(a, { x: 0, y: 300 }, { x: 0, y: 0 })[0];
  let h = K.createSketch('sh', 'Sketch2', 'top');
  h = K.addCircle(h, { x: 15, y: 15 }, 3)[0];
  d.sketches = { sa: a, sh: h };
  d.features = [
    { id: 'f1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sa', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'f2', type: 'sketch', name: 'Sketch2', sketchId: 'sh', suppressed: false },
    { id: 'c1', type: 'extrude', name: 'Cut-Extrude1', sketchId: 'sh', suppressed: false, op: 'cut', end: 'throughAll', depth: 10, reverse: false },
    { id: 'lp', type: 'linearPattern', name: 'LPattern1', suppressed: false, featureIds: ['c1'], dir1: { axis: [1, 0, 0], spacing: 20, count: N }, dir2: { axis: [0, 0, -1], spacing: 20, count: N } },
  ];
  window.__phlippoStore.getState().openDocument(d);
}, N);
const settled = () => page.waitForFunction(() => !window.__phlippoStore.getState().rebuild.pending, null, { timeout: 120_000 });
await settled();
const state = () => page.evaluate(() => {
  const r = window.__phlippoStore.getState().rebuild;
  let v = 0;
  for (const b of r.bodies) {
    const g = b.geometry.index ? b.geometry.toNonIndexed() : b.geometry;
    const a = g.getAttribute('position');
    for (let i = 0; i + 2 < a.count; i += 3) { const x0 = a.getX(i), y0 = a.getY(i), z0 = a.getZ(i), x1 = a.getX(i + 1), y1 = a.getY(i + 1), z1 = a.getZ(i + 1), x2 = a.getX(i + 2), y2 = a.getY(i + 2), z2 = a.getZ(i + 2); v += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6; }
  }
  return { bodies: r.bodies.length, errors: r.errors, volume: Math.abs(v), pending: !!r.pending };
});
// the polygonal hole of the mesh kernel is a little smaller than the circle: compare with a tolerance
const expected = (t) => 300 * 300 * t - N * N * Math.PI * 9 * t;
let s = await state();
check('the patterned plate is built (one body, no errors)', s.bodies === 1 && Object.keys(s.errors).length === 0, JSON.stringify({ ...s, volume: s.volume.toFixed(0) }));
check('its volume is the plate minus 64 holes', Math.abs(s.volume - expected(10)) / expected(10) < 0.01, `${s.volume.toFixed(0)} vs ${expected(10).toFixed(0)}`);

// frames while the next rebuild runs: the longest gap between two animation frames
const watchFrames = () => page.evaluate(() => {
  window.__gap = 0;
  window.__frames = 0;
  let last = performance.now();
  const tick = (t) => { window.__gap = Math.max(window.__gap, t - last); last = t; window.__frames++; if (window.__watching) requestAnimationFrame(tick); };
  window.__watching = true;
  requestAnimationFrame(tick);
});
const stopFrames = () => page.evaluate(() => { window.__watching = false; return { gap: window.__gap, frames: window.__frames }; });

// what one ordinary redraw of this part costs on this machine (a new document object, no rebuild): with software GL
// (a CI runner without graphics card) drawing alone takes a few hundred ms. The rebuild may add at most 150 ms on top
// of that; on a graphics card the limit stays 250 ms (QA v0.5.1 F125).
const redraw = await page.evaluate(() => new Promise((ok) => {
  let last = performance.now(), gap = 0, n = 0;
  const tick = (t) => { gap = Math.max(gap, t - last); last = t; if (++n < 10) requestAnimationFrame(tick); else ok(gap); };
  requestAnimationFrame((t) => { last = t; const s = window.__phlippoStore; s.setState({ doc: { ...s.getState().doc } }); requestAnimationFrame(tick); });
}));
const limit = Math.max(250, redraw + 150);
await watchFrames();
const t0 = Date.now();
const applied = await page.evaluate(() => {
  const st = window.__phlippoStore.getState();
  const t = performance.now();
  st.applyDocument('Depth', { ...st.doc, features: st.doc.features.map((f) => (f.id === 'e1' ? { ...f, depth: 12 } : f)) });
  return { ms: performance.now() - t, pending: !!window.__phlippoStore.getState().rebuild.pending, bodies: window.__phlippoStore.getState().rebuild.bodies.length };
});
check('the edit returns at once and the rebuild runs in the worker', applied.pending && applied.ms < 150, JSON.stringify(applied));
check('the old model stays shown meanwhile', applied.bodies === 1);
await page.waitForTimeout(200);
check('status bar: Rebuilding…', (await page.locator('[data-testid="status-rebuilding"]').count()) === 1);
await page.screenshot({ path: `${OUT}/rebuildworker-busy.png` });
await settled();
const worker = Date.now() - t0;
const frames = await stopFrames();
check(`the window kept drawing frames during the rebuild (no gap over ${Math.round(limit)} ms)`, frames.gap < limit, JSON.stringify({ ...frames, workerMs: worker, redraw: Math.round(redraw) }));
console.log('frames', JSON.stringify({ ...frames, workerMs: worker, redraw: Math.round(redraw) }));
s = await state();
check('the new model replaces the old one (depth 12)', s.bodies === 1 && Math.abs(s.volume - expected(12)) / expected(12) < 0.01 && Object.keys(s.errors).length === 0, `${s.volume.toFixed(0)} vs ${expected(12).toFixed(0)}`);
check('Rebuilding… is gone', (await page.locator('[data-testid="status-rebuilding"]').count()) === 0);

// two edits in a row: the first rebuild becomes void, the last one wins
await page.evaluate(() => {
  const st = window.__phlippoStore.getState();
  st.applyDocument('Depth', { ...st.doc, features: st.doc.features.map((f) => (f.id === 'e1' ? { ...f, depth: 14 } : f)) });
  const st2 = window.__phlippoStore.getState();
  st2.applyDocument('Depth', { ...st2.doc, features: st2.doc.features.map((f) => (f.id === 'e1' ? { ...f, depth: 8 } : f)) });
});
await settled();
await page.waitForTimeout(300);
s = await state();
check('two edits in a row: the last one is shown (depth 8)', !s.pending && Math.abs(s.volume - expected(8)) / expected(8) < 0.01, `${s.volume.toFixed(0)} vs ${expected(8).toFixed(0)}`);

// undo goes through the same path
await page.evaluate(() => window.__phlippoStore.getState().undo());
await settled();
s = await state();
check('Undo rebuilds in the worker too (depth 14)', Math.abs(s.volume - expected(14)) / expected(14) < 0.01, `${s.volume.toFixed(0)} vs ${expected(14).toFixed(0)}`);
await page.keyboard.press('f');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/rebuildworker-done.png` });

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
