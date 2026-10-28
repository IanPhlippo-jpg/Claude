// look-dev: the beginners' quick-start part done with the mouse as in the reference video (02): sketch on the Front
// Plane from its context toolbar, an L of lines, Smart Dimension 62 / 30 / 65 / 15, Extruded Boss/Base Mid Plane 30,
// Fillet R14.5 on the outer edge. A screenshot at each moment the video shows -> e2e-out/walk-NN-*.png (1920 x 1080, the reference screen).
import { chromium } from 'playwright';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let n = 0;
const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: `e2e-out/walk-${String(++n).padStart(2, '0')}-${name}.png` }); };
const status = () => page.locator('.k-statusbar').innerText();
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await shot('new-part');
// 1. right-click Front Plane in the tree: context toolbar, Sketch
await page.click('.k-tree-row:has-text("Front Plane")', { button: 'right' });
await shot('front-plane-rmb');
await page.click('[data-testid="ctx-plane-sketch"]');
await page.waitForTimeout(800);
await shot('sketch-open');
// screen point of a sketch point (front plane: world x, y)
const at = (x, y) => page.evaluate(([x, y]) => window.__phlippoProjectWorld(x, y, 0), [x, y]);
// scale the L so it fills about half the view: the drawn sizes are rough, as by hand
const k = 0.9;
const L = [[0, 0], [0, 62 * k], [30 * k, 62 * k], [30 * k, 15 * k], [65 * k, 15 * k], [65 * k, 0], [0, 0]];
// 2. Line tool from the ribbon
await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-iconbtn[data-tip="Line"]').catch(async () => { await page.keyboard.press('l'); });
await shot('line-tool');
let p = await at(...L[0]);
await page.mouse.click(p.x, p.y);
const p1 = await at(...L[1]);
await page.mouse.move(p.x, p.y - 30, { steps: 4 });
await page.mouse.move(p1.x, p1.y, { steps: 8 });
await shot('line-drag');
for (const q of L.slice(1)) { const s = await at(...q); await page.mouse.move(s.x, s.y, { steps: 6 }); await page.mouse.click(s.x, s.y); }
await shot('l-drawn');
await page.keyboard.press('Escape');
await page.mouse.move(900, 600);
await shot('l-done');
// 3. Smart Dimension on each line, placed outside, value typed in the Modify box
await page.click('.k-cm-big:has-text("Smart Dimension") .k-cm-main');
// the lines of the active sketch as they are now (they move when a dimension changes them)
const lines = () => page.evaluate(() => {
  const st = window.__phlippoStore.getState(), sk = st.doc.sketches[st.activeSketchId];
  return Object.values(sk.entities).filter((e) => e.kind === 'line').map((e) => [sk.points[e.p1], sk.points[e.p2]].map((p) => [p.x, p.y]));
});
const pick = async (which) => {
  const ls = await lines();
  const mid = (l) => [(l[0][0] + l[1][0]) / 2, (l[0][1] + l[1][1]) / 2];
  const vert = ls.filter((l) => Math.abs(l[0][0] - l[1][0]) < 1e-6), hor = ls.filter((l) => Math.abs(l[0][1] - l[1][1]) < 1e-6);
  if (which === 'left') return vert.sort((a, b) => mid(a)[0] - mid(b)[0])[0];
  if (which === 'right') return vert.sort((a, b) => mid(b)[0] - mid(a)[0])[0];
  if (which === 'top') return hor.sort((a, b) => mid(b)[1] - mid(a)[1])[0];
  return hor.sort((a, b) => mid(a)[1] - mid(b)[1])[0];
};
const dim = async (which, off, value, name) => {
  const [a, b] = await pick(which);
  // a third along the line: the middle holds the relation glyph
  const m = await at(a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3);
  await page.mouse.move(m.x, m.y, { steps: 4 });
  await page.mouse.click(m.x, m.y);
  const o = await at((a[0] + b[0]) / 2 + off[0], (a[1] + b[1]) / 2 + off[1]);
  await page.mouse.move(o.x, o.y, { steps: 6 });
  if (name) await shot(name + '-place');
  await page.mouse.click(o.x, o.y);
  await page.waitForTimeout(250);
  if (name) await shot(name + '-modify');
  const input = page.locator('.k-modify input.k-num');
  if (await input.count()) { await input.fill(String(value)); await input.press('Enter'); }
  await page.waitForTimeout(250);
};
await dim('left', [-12, 0], 62, 'dim62');
await dim('top', [0, 10], 30, 'dim30');
console.log('after 30:', await page.evaluate(() => { const st = window.__phlippoStore.getState(); return JSON.stringify({ modify: !!st.modify, sel: st.selection, cons: Object.values(st.doc.sketches[st.activeSketchId].constraints).map((c) => c.kind + ':' + (c.value ?? '')).join(' ') }); }));
await dim('bottom', [0, -12], 65);
await dim('right', [12, 0], 15);
await page.keyboard.press('Escape');
await page.mouse.move(1100, 600);
await shot('dimensioned');
console.log('sketch status:', (await status()).replace(/\s+/g, ' '));
// 4. Features ▸ Extruded Boss/Base, Mid Plane, 30
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(800);
await shot('extrude-pm');
await page.locator('.k-pm-host select').nth(1).selectOption({ label: 'Mid Plane' });
const depth = page.locator('.k-pm-host input.k-num').first();
await depth.fill('30');
await page.waitForTimeout(600);
await shot('extrude-midplane');
// Enter in the field is OK, as in the video
await depth.press('Enter');
await page.waitForTimeout(1000);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(1100, 650);
await shot('extruded');
// 5. Fillet R14.5 on the outer bottom-right edge (x = 65, y = 0 runs along z)
await page.locator('.k-cm-big:has-text("Fillet") .k-cm-main, .k-cm-big:has-text("Fillet")').first().click();
await page.waitForTimeout(600);
// the radius first (the field has the focus), then the edge, as in the video
const rad = page.locator('.k-pm-host input.k-num').first();
await rad.fill('14.5');
const e = await page.evaluate(() => window.__phlippoProjectWorld(65, 0, 0));
await page.mouse.move(e.x, e.y, { steps: 5 });
await shot('fillet-hover');
console.log('fillet hover', JSON.stringify(e), await page.evaluate(() => { const st = window.__phlippoStore.getState(); const g = st.rebuild.bodies[0]?.geometry; g?.computeBoundingBox(); return JSON.stringify({ he: st.hoverEdge, box: g?.boundingBox, sk: Object.values(st.doc.sketches)[0] && Object.values(Object.values(st.doc.sketches)[0].constraints).map((c) => c.kind + ':' + (c.value ?? '')).join(' ') }); }));
await page.mouse.click(e.x, e.y);
await page.waitForTimeout(1000);
await shot('fillet-pm');
const state = () => page.evaluate(() => { const st = window.__phlippoStore.getState(); return JSON.stringify({ focus: document.activeElement?.tagName + '.' + document.activeElement?.className, fe: st.featureEdit?.draft.type ?? null, sketch: st.activeSketchId, features: st.doc.features.map((f) => f.name), undo: st.undoLabel }); });
console.log('before Enter', await state());
await page.keyboard.press('Enter');
await page.waitForTimeout(100);
console.log('after Enter', await state());
await page.waitForTimeout(1200);
console.log('1.2 s later', await state());
await page.waitForTimeout(1200);
await page.mouse.move(1100, 650);
await shot('done');
console.log('errors:', errors.slice(0, 3));
await browser.close();
