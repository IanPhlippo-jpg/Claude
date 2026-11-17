// Drawings 0.5.16: hidden lines split where an occluding face crosses them, tangent edges per view, center marks on
// fillets, slots, bolt circles and linear patterns, auto centerlines and balloons on view creation, Replace Model.
import { chromium } from 'playwright';
import { exitCode } from './lib/check.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { frames, settle } from './lib/wait.mjs';

const OUT = process.env.E2E_OUT ?? (process.platform === 'win32' ? 'e2e-out' : '/tmp/phlippo-e2e');
const SHOTS = process.env.E2E_SHOTS ?? OUT;
mkdirSync(OUT, { recursive: true });
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light' });
const errors = [];
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (e.stack ? ' | ' + String(e.stack).split(/\r?\n/).slice(1, 3).join(' <- ').replace(/\s+/g, ' ') : '')));
page.on('console', (m) => { if (m.type() === 'error' && !/WebGL|GL_/.test(m.text())) errors.push('console: ' + m.text()); });

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');

// the models, built with the kit in the page: window.__models
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let n = 0;
  const pt = (s, x, y) => { const id = `q${++n}`; return [{ ...s, points: { ...s.points, [id]: { x, y } } }, id]; };
  const outline = (s, pts, arcs) => {
    const ids = [];
    for (const [x, y] of pts) { let id; [s, id] = pt(s, x, y); ids.push(id); }
    for (let i = 0; i < pts.length; i++) s = arcs[i] ? K.addArc(s, { x: arcs[i][0], y: arcs[i][1] }, ids[i], ids[(i + 1) % pts.length], false)[0] : K.addLine(s, ids[i], ids[(i + 1) % pts.length])[0];
    return s;
  };
  const rect = (s, x0, y0, x1, y1) => outline(s, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], [null, null, null, null]);
  const ext = (doc, id, s, depth, op = 'boss', end = 'blind') => { doc.sketches[s.id] = s; doc.features.push({ id, type: 'extrude', name: id, sketchId: s.id, suppressed: false, op, end, depth, reverse: false }); };
  /** a plate 120 x 60 x 10, R8 corners, a slot, a bore with 6 holes on a bolt circle, a linear pattern of 3 holes */
  const plate = (name, holeY = -8) => {
    const d = K.createDocument(name);
    const r = 8;
    ext(d, 'e1', outline(K.createSketch('s1', 'S1', 'top'), [[r, 0], [120 - r, 0], [120, -r], [120, -60 + r], [120 - r, -60], [r, -60], [0, -60 + r], [0, -r]], [null, [120 - r, -r], null, [120 - r, -60 + r], null, [r, -60 + r], null, [r, -r]]), 10);
    ext(d, 'c1', outline(K.createSketch('s2', 'S2', 'top'), [[20, -25], [40, -25], [40, -35], [20, -35]], [null, [40, -30], null, [20, -30]]), 0, 'cut', 'throughAll');
    let s3 = K.addCircle(K.createSketch('s3', 'S3', 'top'), { x: 85, y: -30 }, 6)[0];
    for (let i = 0; i < 6; i++) s3 = K.addCircle(s3, { x: 85 + 15 * Math.cos((i * Math.PI) / 3), y: -30 + 15 * Math.sin((i * Math.PI) / 3) }, 2)[0];
    ext(d, 'c2', s3, 0, 'cut', 'throughAll');
    ext(d, 'c3', K.addCircle(K.createSketch('s4', 'S4', 'top'), { x: 55, y: holeY }, 1.5)[0], 0, 'cut', 'throughAll');
    d.features.push({ id: 'p1', type: 'linearPattern', name: 'LPattern1', suppressed: false, featureIds: ['c3'], dir1: { axis: [1, 0, 0], spacing: 8, count: 3 } });
    return d;
  };
  /** a step: a tall rear block (x 20..80) behind a low front step, a hole through the rear block above the step */
  const step = () => {
    const d = K.createDocument('Step');
    ext(d, 'e1', rect(K.createSketch('s1', 'S1', 'top'), 20, 0, 80, -20), 40);
    ext(d, 'e2', rect(K.createSketch('s2', 'S2', 'top'), 0, -20, 100, -40), 20);
    ext(d, 'c1', K.addCircle(K.createSketch('s3', 'S3', 'front'), { x: 50, y: 30 }, 5)[0], 0, 'cut', 'throughAllBoth');
    return d;
  };
  const comp = (id, part, x) => ({ id, name: `${part.name}<${id}>`, part, position: [x, 0, 0], rotation: [0, 0, 0, 1], fixed: x === 0, suppressed: false });
  const asm = { ...K.createDocument('Bracket assembly', 'assembly'), components: [comp('c1', plate('Base plate'), 0), comp('c2', step(), 10), comp('c3', step(), 130)] };
  window.__models = { plate: plate('Plate'), plateB: plate('Plate rev B', -14), step: step(), asm };
});

const st = (fn, arg) => page.evaluate(fn, arg);
/** a new A3 drawing at 1:1 with the given Document Properties / Options */
const newDrawing = async (prefs = {}) => {
  await st((p) => {
    const s = window.__phlippoStore.getState();
    s.openDocument(window.__phlippoKit.createDocument('Drawing1', 'drawing'));
    const t = window.__phlippoStore.getState();
    // the views keep 1:1 (no automatic sheet scale), so they sit where they are placed
    t.setPrefs({ ...t.prefs, 'drawings.autoScale': false, 'drawings.displayStyle': 'Hidden lines removed', 'drawings.tangentEdges': 'Visible', ...p }, t.prefs);
    const sh = t.doc.sheets[0];
    t.applyDocument('Sheet', { ...t.doc, sheets: [{ ...sh, size: 'A3', scale: [1, 1] }] });
  }, prefs);
  await settle(page);
};
const place = async (model, type, at, prefs) => {
  const id = await st(({ model, type, at, prefs }) => {
    const s = window.__phlippoStore.getState();
    if (prefs) s.setPrefs({ ...s.prefs, ...prefs }, s.prefs);
    s.startModelView();
    s.setModelViewSource(window.__models[model]);
    s.setDrawingEdit({ orientation: type });
    s.placeView(at);
    s.cancelDrawingEdit();
    const sh = window.__phlippoStore.getState().doc.sheets[0];
    return sh.views[sh.views.length - 1].id;
  }, { model, type, at, prefs });
  await settle(page);
  return id;
};
const sheet = () => st(() => window.__phlippoStore.getState().doc.sheets[0]);
const shot = async (name, ids, pad = 18) => {
  await page.evaluate(() => { const s = window.__phlippoStore.getState(); s.selectDrawingView(null); });
  await frames(page, 3);
  const box = await page.evaluate(({ ids, pad }) => {
    const S = window.__phlippoSheet;
    const bs = ids.map((id) => S.bounds(id)).filter(Boolean);
    const x0 = Math.min(...bs.map((b) => b.x)) - pad, x1 = Math.max(...bs.map((b) => b.x + b.w)) + pad;
    const y0 = Math.min(...bs.map((b) => b.y)) - pad, y1 = Math.max(...bs.map((b) => b.y + b.h)) + pad;
    const a = S.toPx([x0, y1]), b = S.toPx([x1, y0]);
    return { x: Math.max(0, a.x), y: Math.max(0, a.y), width: b.x - a.x, height: b.y - a.y };
  }, { ids, pad });
  await page.screenshot({ path: join(SHOTS, name), clip: box });
};
const zoomSheet = async () => { await page.keyboard.press('f'); await frames(page, 3); };

// 1. hidden lines: the step in Hidden Lines Visible; the rear block's side edges are hidden below the step only
await newDrawing({ 'drawings.displayStyle': 'Hidden lines visible' });
const front = await place('step', 'front', [90, 130]);
const top = await place('step', 'top', [90, 210]);
const right = await place('step', 'right', [200, 130]);
await zoomSheet();
const split = await st((id) => {
  const s = window.__phlippoStore.getState();
  const v = s.doc.sheets[0].views.find((x) => x.id === id);
  const g = window.__phlippoKit.projectedView(v.model, 'front');
  return g.lines.filter((l) => Math.abs(l.a[0] - 20) < 0.02 && Math.abs(l.b[0] - 20) < 0.02).map((l) => [Math.min(l.a[1], l.b[1]), Math.max(l.a[1], l.b[1]), l.hidden]).sort((a, b) => a[0] - b[0]);
}, front);
check('hidden lines: the rear edge behind the step is hidden up to the step and visible above it', split.length === 2 && split[0][2] && !split[1][2] && Math.abs(split[1][0] - 20) < 0.01 && split[0][1] > 19.9, JSON.stringify(split));
const dashed = await page.locator(`[data-view-id="${front}"] line[stroke-dasharray="5 3"]`).count();
check("hidden lines are drawn dashed in Hidden Lines Visible", dashed >= 2, String(dashed));
const holeHidden = await st((id) => {
  const v = window.__phlippoStore.getState().doc.sheets[0].views.find((x) => x.id === id);
  return window.__phlippoKit.projectedView(v.model, 'top').lines.filter((l) => l.hidden && l.silhouette).length;
}, top);
check('the hole through the rear block shows as hidden silhouette lines from above', holeHidden >= 2, String(holeHidden));
await shot('tekening-verborgen-lijnen.png', [front, top, right]);

// 2. tangent edges: the plate's rounded corners, Removed (as before 0.5.16) and Visible (new views)
await newDrawing({ 'drawings.tangentEdges': 'Removed' });
const tBefore = await place('plate', 'front', [100, 180]);
const tAfter = await place('plate', 'front', [260, 180], { 'drawings.tangentEdges': 'Visible' });
await zoomSheet();
const tCount = async (id) => page.locator(`[data-view-id="${id}"] .k-tangent-edge`).count();
check('tangent edges: none with Removed, drawn with Visible', (await tCount(tBefore)) === 0 && (await tCount(tAfter)) >= 2, `${await tCount(tBefore)} / ${await tCount(tAfter)}`);
await shot('tekening-raaklijnen-voor-na.png', [tBefore, tAfter], 8);
// the view's Property Panel: Tangent edges with font
await st((id) => { const s = window.__phlippoStore.getState(); s.selectDrawingView(id); s.setManagerTab('properties'); }, tAfter);
await settle(page);
await page.selectOption('[data-testid="dv-tangent"]', 'font');
await settle(page);
const font = await page.locator(`[data-view-id="${tAfter}"] .k-tangent-edge[data-tangent="font"]`).count();
check('Property Panel ▸ Tangent edges with font: drawn in the tangent edge font', font >= 2, String(font));

// 3. center marks: holes only (default) versus holes and fillets; slot, bolt circle and pattern sets
await newDrawing();
const mBefore = await place('plate', 'top', [100, 180]);
const mAfter = await place('plate', 'top', [260, 180], { 'doc.autoCenterMarksFillets': true });
await zoomSheet();
const marks = await sheet().then((s) => ({ before: s.centerMarks.filter((m) => m.viewId === mBefore), after: s.centerMarks.filter((m) => m.viewId === mAfter) }));
const kinds = (ms) => ms.reduce((o, m) => ({ ...o, [m.kind ?? (Math.abs(m.r - 8) < 0.1 ? 'fillet' : 'hole')]: (o[m.kind ?? (Math.abs(m.r - 8) < 0.1 ? 'fillet' : 'hole')] ?? 0) + 1 }), {});
check('Center marks-holes: 10 holes, a slot mark, the bolt circle and the pattern row; no fillet marks', JSON.stringify(kinds(marks.before)) === JSON.stringify({ hole: 10, slot: 1, circular: 1, linear: 1 }), JSON.stringify(kinds(marks.before)));
check('Center marks-fillets: also a mark on each of the four rounded corners', kinds(marks.after).fillet === 4, JSON.stringify(kinds(marks.after)));
for (const k of ['slot', 'circular', 'linear']) check(`the ${k} center mark is drawn`, (await page.locator(`[data-view-id="${mAfter}"] .k-center-mark[data-kind="${k}"]`).count()) === 1);
await shot('tekening-centermarks-voor-na.png', [mBefore, mAfter], 8);

// 4. centerlines: a front view without and with Auto insert ▸ Centerlines
await newDrawing();
const cBefore = await place('plate', 'front', [100, 180]);
const cAfter = await place('plate', 'front', [260, 180], { 'doc.autoCenterlines': true });
await zoomSheet();
const cl = await sheet().then((s) => (s.symbols ?? []).filter((x) => x.kind === 'centerline'));
check('Centerlines: none before, one per hole axis seen from the side after', cl.every((x) => x.viewId === cAfter) && cl.length >= 6, String(cl.length));
check('the centerlines are drawn', (await page.locator('.k-centerline').count()) === cl.length);
await shot('tekening-centerlijnen-voor-na.png', [cBefore, cAfter], 8);

// 5. auto balloons on a view of an assembly
await newDrawing({ 'doc.autoBalloons': true });
const iso = await place('asm', 'isometric', [200, 160]);
await zoomSheet();
const balloons = await sheet().then((s) => (s.symbols ?? []).filter((x) => x.kind === 'balloon' && x.viewId === iso).map((x) => x.text).sort());
check('Auto insert ▸ Balloons: one balloon per part of the assembly', JSON.stringify(balloons) === JSON.stringify(['1', '2']), JSON.stringify(balloons));
await shot('tekening-ballonnen-auto.png', [iso], 30);

// 6. Replace Model: the top and front views of the plate get rev B (the patterned holes moved); the marks on the old
// holes turn dangling, the rest stays
await newDrawing();
const rTop = await place('plate', 'top', [150, 200]);
const rFront = await place('plate', 'front', [150, 140]);
await zoomSheet();
await shot('tekening-replace-model-voor.png', [rTop, rFront]);
const file = join(OUT, 'Plate rev B.kcad');
// a .kcad file: the document with the format header (version 1)
writeFileSync(file, await page.evaluate(() => JSON.stringify({ format: 'phlippo-cad', version: 1, ...window.__models.plateB })));
await st((id) => window.__phlippoStore.getState().selectDrawingView(id), rTop);
await page.click('.k-cm-tab:text-is("Drawing")');
const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('.k-cm-small:has-text("Replace Model")')]);
await chooser.setFiles(file);
await page.waitForFunction(() => window.__phlippoStore.getState().doc.sheets[0].views.every((v) => v.modelName === 'Plate rev B<1>'), null, { timeout: 30000 }).catch((e) => console.log('skip: drawing0516 replace (' + e.message + ')'));
await settle(page);
const after = await sheet();
check('Replace Model: both views show the new model, in place', after.views.every((v) => v.modelName === 'Plate rev B<1>') && after.views.find((v) => v.id === rTop).position.join() === '150,200', JSON.stringify(after.views.map((v) => [v.modelName, v.position])));
const dangling = after.centerMarks.filter((m) => m.dangling);
check('Replace Model: the marks of the moved holes are dangling, the others not', dangling.length >= 3 && after.centerMarks.some((m) => !m.dangling), `${dangling.length} of ${after.centerMarks.length}`);
const msg = await page.evaluate(() => window.__phlippoStore.getState().messages?.slice(-1)[0]?.text ?? '');
check('Replace Model says what happened', /Replace Model: 2 views now show Plate rev B/.test(msg), msg);
await shot('tekening-replace-model-na.png', [rTop, rFront]);
await st(() => window.__phlippoStore.getState().undo());
await settle(page);
check('Replace Model is one undo step', (await sheet()).views.every((v) => v.modelName === 'Plate<1>'));

console.log(JSON.stringify(results, null, 1));
console.log('errors', errors);
await browser.close();
process.exitCode = exitCode(results, errors);
