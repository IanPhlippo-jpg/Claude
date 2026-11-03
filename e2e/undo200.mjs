// Undo/redo over 200 steps (QA 0.5.11 NAAR-100 P2-7, row 27; the stack keeps 200 steps, src/core/document/history.ts):
// a 60 x 40 block, 200 edits of its extrude depth (each one undoable step), 200 x undo gives the volume of the start,
// 200 x redo the volume of the end, a 201st undo or redo changes nothing; with 201 edits the oldest step falls off.
import { chromium } from 'playwright';
import { exitCode, track, checks, waitSettled } from './lib/check.mjs';

const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = track(page);
const { results, check } = checks();

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

const AREA = 60 * 40, START = 10;
/** a fresh block of the given depth (opening clears the undo stack) */
const open = (depth) => page.evaluate((depth) => {
  const K = window.__phlippoKit;
  const d = K.createDocument('Undo200', 'part');
  let a = K.createSketch('sa', 'Sketch1', 'top');
  const c = [{ x: -30, y: -20 }, { x: 30, y: -20 }, { x: 30, y: 20 }, { x: -30, y: 20 }];
  for (let i = 0; i < 4; i++) a = K.addLine(a, c[i], c[(i + 1) % 4])[0];
  d.sketches = { sa: a };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 'sa', suppressed: false }, { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 'sa', suppressed: false, op: 'boss', end: 'blind', depth, reverse: false }];
  window.__phlippoStore.getState().openDocument(d);
}, depth);
/** n edits: the depth of Boss-Extrude1 one millimetre deeper each time, every edit its own undoable step */
const edit = (n) => page.evaluate((n) => {
  const st = window.__phlippoStore;
  for (let i = 0; i < n; i++) {
    const doc = st.getState().doc;
    st.getState().applyDocument('Edit Boss-Extrude1', { ...doc, features: doc.features.map((f) => (f.id === 'e1' ? { ...f, depth: f.depth + 1 } : f)) });
  }
}, n);
const repeat = (what, n) => page.evaluate(([what, n]) => { const st = window.__phlippoStore; for (let i = 0; i < n; i++) st.getState()[what](); }, [what, n]);
const state = () => page.evaluate(() => { const s = window.__phlippoStore.getState(); return { depth: s.doc.features.find((f) => f.id === 'e1').depth, canUndo: s.canUndo, canRedo: s.canRedo, errors: Object.keys(s.rebuild.errors).length }; });
// volume of all bodies from the triangles (divergence theorem), after the rebuild has settled
const volume = async () => { await waitSettled(page); return page.evaluate(() => { let v = 0; for (const b of window.__phlippoStore.getState().rebuild.bodies) { const a = b.geometry.getAttribute('position'); for (let i = 0; i + 2 < a.count; i += 3) { const x0 = a.getX(i), y0 = a.getY(i), z0 = a.getZ(i), x1 = a.getX(i + 1), y1 = a.getY(i + 1), z1 = a.getZ(i + 1), x2 = a.getX(i + 2), y2 = a.getY(i + 2), z2 = a.getZ(i + 2); v += (x0 * (y1 * z2 - z1 * y2) - y0 * (x1 * z2 - z1 * x2) + z0 * (x1 * y2 - y1 * x2)) / 6; } } return Math.abs(v); }); };
const near = (v, depth) => Math.abs(v - AREA * depth) <= 1e-3 * AREA * depth;

await open(START);
const v0 = await volume();
let s = await state();
check('the block opens with nothing to undo', near(v0, START) && !s.canUndo && !s.canRedo, JSON.stringify({ v0, ...s }));

const t0 = Date.now();
await edit(200);
const v200 = await volume();
s = await state();
check('200 edits: depth 210 and its volume', s.depth === START + 200 && near(v200, START + 200) && s.canUndo && !s.canRedo && !s.errors, JSON.stringify({ v200, ...s }));

await repeat('undo', 200);
const vUndo = await volume();
s = await state();
check('200 x undo: the volume of the start', s.depth === START && near(vUndo, START) && Math.abs(vUndo - v0) <= 1e-3 * v0 && !s.canUndo && s.canRedo, JSON.stringify({ vUndo, v0, ...s }));

await repeat('undo', 1);
s = await state();
check('a 201st undo changes nothing', s.depth === START && !s.canUndo && s.canRedo, JSON.stringify(s));

await repeat('redo', 200);
const vRedo = await volume();
s = await state();
check('200 x redo: the volume of the end', s.depth === START + 200 && Math.abs(vRedo - v200) <= 1e-3 * v200 && s.canUndo && !s.canRedo, JSON.stringify({ vRedo, v200, ...s }));

await repeat('redo', 1);
s = await state();
check('a 201st redo changes nothing', s.depth === START + 200 && s.canUndo && !s.canRedo, JSON.stringify(s));

// the stack holds 200 steps: with 201 edits the oldest one falls off and 200 x undo ends one step after the start
await open(START);
await volume();
await edit(201);
await repeat('undo', 200);
const vLimit = await volume();
s = await state();
check('201 edits: 200 steps back, the oldest step is gone', s.depth === START + 1 && near(vLimit, START + 1) && !s.canUndo, JSON.stringify({ vLimit, ...s }));
console.log(`undo200: ${((Date.now() - t0) / 1000).toFixed(1)} s for 401 edits, 400 undos and 201 redos`);

await browser.close();
console.log(`${results.filter((r) => r.ok).length}/${results.length} checks passed`);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
process.exitCode = exitCode(results, errors);
