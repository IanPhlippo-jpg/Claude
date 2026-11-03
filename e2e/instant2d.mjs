// Drag Dimensions (live dimension drag in a 2D sketch): the value follows the handle live (0.5 mm ruler steps), the
// geometry follows through the solver, also in a fully defined sketch; the release is one undo step.
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

await page.goto(process.env.E2E_URL ?? 'http://localhost:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.waitForTimeout(500);
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(300);

// a line of 50 mm on the Front plane: start fixed, horizontal, length 50 -> fully defined
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'front');
  const [s2, l] = K.addLine(s, { x: 0, y: 0 }, { x: 50, y: 0 });
  s = s2;
  const cs = { fx: { id: 'fx', kind: 'fix', refs: [l.p1] }, hz: { id: 'hz', kind: 'horizontal', refs: [l.id] }, dimL: { id: 'dimL', kind: 'length', refs: [l.id], value: 50, labelOffset: { x: 25, y: 10 } } };
  s = { ...s, constraints: { ...s.constraints, ...cs }, constraintOrder: [...s.constraintOrder, 'fx', 'hz', 'dimL'] };
  const d = { ...K.createDocument('Part1'), sketches: { s1: s } };
  d.features = [{ id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }];
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(500);
await page.evaluate(() => window.__phlippoStore.getState().editSketch('s1'));
await page.waitForTimeout(500);
const state = () => page.evaluate(() => {
  const s = window.__phlippoStore.getState();
  const sk = s.doc.sketches.s1;
  const l = Object.values(sk.entities).find((e) => e.kind === 'line');
  const a = sk.points[l.p1], b = sk.points[l.p2];
  return { len: Math.hypot(b.x - a.x, b.y - a.y), value: sk.constraints.dimL.value, status: s.solve.s1?.status };
});
const s0 = await state();
check('the sketch is fully defined with the line at 50', s0.status === 'full' && Math.abs(s0.len - 50) < 1e-6, JSON.stringify(s0));

await page.click('.k-cm-tab:has-text("Sketch")');
await page.click('.k-cm-big:has-text("Drag Dimensions")');
await page.evaluate(() => window.__phlippoStore.getState().selectConstraint('dimL'));
await page.waitForTimeout(300);
const grip = await page.locator('[data-testid="dragDimensions-grip"]').boundingBox();
check('the selected dimension has a drag handle', !!grip);
const P = (x, y) => page.evaluate(([x, y]) => window.__phlippoProject({ x, y }), [x, y]);
if (grip) {
  const g = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
  const p50 = await P(50, 0), p55 = await P(55.2, 0), p60 = await P(60, 0);
  check('the handle sits on the end of the line', Math.hypot(g.x - p50.x, g.y - p50.y) < 2, JSON.stringify({ g, p50 }));
  await page.mouse.move(g.x, g.y);
  await page.mouse.down();
  await page.mouse.move(p55.x, p55.y, { steps: 6 });
  await page.waitForTimeout(150);
  const mid = await state();
  const shown = await page.locator('[data-testid="dragDimensions-value"]').textContent();
  check('live while dragging: the line follows at 55.0 (0.5 mm steps)', Math.abs(mid.len - 55) < 1e-6 && mid.value === 55 && shown === '55.00', JSON.stringify({ mid, shown }));
  await page.screenshot({ path: `${OUT}/instant2d-drag.png` });
  await page.mouse.move(p60.x, p60.y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await state();
  check('dragging the dimension 50 -> 60: the line is 60 long and still fully defined', Math.abs(after.len - 60) < 1e-6 && after.value === 60 && after.status === 'full', JSON.stringify(after));
  const label = await page.evaluate(() => window.__phlippoStore.getState().undoLabel);
  check('the drag is one undo step (Modify dimension)', /Modify dimension/.test(String(label)), String(label));
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(300);
  const back = await state();
  check('Undo once: the line is 50 again', Math.abs(back.len - 50) < 1e-6 && back.value === 50, JSON.stringify(back));
  // the drag value rounds to the 0.5 mm ruler
  await page.evaluate(() => window.__phlippoStore.getState().selectConstraint('dimL'));
  await page.waitForTimeout(200);
  const g2 = await page.locator('[data-testid="dragDimensions-grip"]').boundingBox();
  const p = await P(47.8, 0);
  await page.mouse.move(g2.x + g2.width / 2, g2.y + g2.height / 2);
  await page.mouse.down();
  await page.mouse.move(p.x, p.y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const r = await state();
  check('a drag to 47.8 rounds to 48.0', r.value === 48 && Math.abs(r.len - 48) < 1e-6, JSON.stringify(r));
}

console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
process.exitCode = exitCode(results, errors);
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
