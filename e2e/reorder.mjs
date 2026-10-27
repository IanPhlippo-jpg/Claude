// Reorder in the design tree (QA v0.5.1 F113): drag a feature onto another and it goes right below it, with its
// sketch; a move above a parent (a pattern above the feature it copies) is not allowed; a move that makes a feature
// fail is refused with a message; Undo puts the order back.
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
const S = (fn, arg) => page.evaluate(fn, arg);
const order = () => S(() => window.__phlippoStore.getState().doc.features.map((f) => f.id).join(' '));

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await S(() => {
  const K = window.__phlippoKit;
  const rect = (id, name, x0, y0, x1, y1) => {
    let sk = K.createSketch(id, name, 'top');
    const c = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
    for (let i = 0; i < 4; i++) sk = K.addLine(sk, c[i], c[(i + 1) % 4])[0];
    return sk;
  };
  const d = K.createDocument('Plaat');
  d.sketches = { s1: rect('s1', 'Sketch1', -40, -20, 40, 20), s2: K.addCircle(K.createSketch('s2', 'Sketch2', 'top'), { x: -25, y: 0 }, 4)[0], s3: rect('s3', 'Sketch3', 10, -5, 20, 5) };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'e1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false },
    { id: 'e2', type: 'extrude', name: 'Cut-Extrude1', sketchId: 's2', suppressed: false, op: 'cut', end: 'throughAll', depth: 0, reverse: false },
    { id: 'p1', type: 'linearPattern', name: 'LPattern1', suppressed: false, featureIds: ['e2'], dir1: { axis: [0, 0, 1], spacing: 10, count: 2 } },
    { id: 'k3', type: 'sketch', name: 'Sketch3', sketchId: 's3', suppressed: false },
    { id: 'e3', type: 'extrude', name: 'Boss-Extrude2', sketchId: 's3', suppressed: false, op: 'boss', end: 'blind', depth: 15, reverse: false },
  ];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(800);
const row = (id) => page.locator(`.k-tree-row[data-depth="1"][data-id="${id}"]`);
const start = await order();
check('the part opens without errors', JSON.stringify(await S(() => window.__phlippoStore.getState().rebuild.errors)) === '{}');

// 1. Boss-Extrude2 dragged onto Boss-Extrude1: it goes right below it, its sketch along
await row('e3').dragTo(row('e1'));
await page.waitForTimeout(500);
check('Boss-Extrude2 with Sketch3 moved below Boss-Extrude1', (await order()) === 'k1 e1 k3 e3 k2 e2 p1', `${await order()} :: ${await S(() => window.__phlippoStore.getState().messages.map((m) => m.text).join(' | '))}`);
check('the tree shows the new order', (await page.locator('.k-tree-row[data-depth="1"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-id')).filter((x) => /^(e|p)\d$/.test(x)).join(' '))) === 'e1 e3 e2 p1');
check('the moved part still rebuilds without errors', JSON.stringify(await S(() => window.__phlippoStore.getState().rebuild.errors)) === '{}');
check('the document has unsaved changes', await S(() => window.__phlippoStore.getState().dirty));
// Undo puts the order back
await S(() => window.__phlippoStore.getState().undo());
await page.waitForTimeout(400);
check('Undo puts the order back', (await order()) === start, await order());

// 2. the pattern above the feature it copies, the cut below the pattern of it: not allowed, nothing moves
await row('p1').hover();
const before2 = await order();
await row('p1').dragTo(row('e1'));
await page.waitForTimeout(400);
check('LPattern1 cannot go above Cut-Extrude1 (its parent)', (await order()) === before2, await order());
await row('e2').dragTo(row('e3'));
await page.waitForTimeout(400);
check('Cut-Extrude1 cannot go below LPattern1 (its child)', (await order()) === before2, await order());
check('no drop line is left on the row', (await page.locator('.k-tree-row.drop-below').count()) === 0);

// 3. a move that makes a feature fail is refused with a message: Boss-Extrude1 below the cut it is cut by
await row('e1').dragTo(row('e3'));
await page.waitForTimeout(600);
const msgs = await S(() => window.__phlippoStore.getState().messages.map((m) => m.text).join(' | '));
const o3 = await order();
check('Boss-Extrude1 below the cut is refused or rebuilds clean', o3 === start ? /cannot be moved there/.test(msgs) : JSON.stringify(await S(() => window.__phlippoStore.getState().rebuild.errors)) === '{}', `${o3} :: ${msgs}`);
await page.screenshot({ path: `${OUT}/reorder.png` });

console.log(results.filter((r) => r.ok).length + '/' + results.length + ' passed');
process.exitCode = exitCode(results, errors);
if (errors.length) console.log('ERRORS', errors.slice(0, 5));
await browser.close();
