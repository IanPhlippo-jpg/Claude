// Dimension Property Panel as the 2026 reference (frame f_0241): value of the selected dimension, OK only, Dimension Text with symbols.
import { chromium } from 'playwright';
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok: !!ok, info }); if (!ok) console.log('FAIL', name, info); };
const errors = [];
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[0, 0], [80, 0], [80, -80], [0, -80]];
  let first = null, prev = null;
  for (let i = 0; i < 4; i++) {
    const p = prev ?? { x: c[i][0], y: c[i][1] };
    const q = i < 3 ? { x: c[i + 1][0], y: c[i + 1][1] } : first;
    const [n, l] = K.addLine(s, p, q);
    s = n; if (!first) first = l.p1; prev = l.p2;
  }
  let s2 = K.createSketch('s2', 'Sketch2', 'front');
  const [s3, circ] = K.addCircle(s2, { x: 50, y: 20 }, 7.5);
  s2 = s3;
  const id = 'dimA';
  s2 = { ...s2, constraints: { ...s2.constraints, [id]: { id, kind: 'diameter', refs: [circ.id], value: 15, labelOffset: { x: 62, y: 32 } } }, constraintOrder: [...s2.constraintOrder, id] };
  const d = { ...K.createDocument('Part9'), sketches: { s1: s, s2 } };
  d.features = [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
    { id: 'k2', type: 'sketch', name: 'Sketch2', sketchId: 's2', suppressed: false },
  ];
  const st = window.__phlippoStore.getState();
  st.openDocument(d);
});
await page.waitForTimeout(500);
await page.evaluate(() => { const st = window.__phlippoStore.getState(); st.editSketch?.('s2') ?? st.openSketch?.('s2'); });
await page.waitForTimeout(500);
await page.evaluate(() => window.__phlippoStore.setState({ selectedConstraint: 'dimA' }));
await page.keyboard.press('Control+7');
await page.waitForTimeout(500);
await page.screenshot({ path: 'e2e-out/look-dim.png' });
check('the selected dimension shows its value (15.00mm) in Primary Value', (await page.locator('.k-pm-host input.k-num').first().inputValue()) === '15.00mm');
check('the Dimension Property Panel has OK only, as the original', (await page.locator('.k-pm-host .k-pm-ok').count()) === 1 && (await page.locator('.k-pm-host .k-pm-cancel').count()) === 0);
await page.fill('[data-testid="dim-text"]', '2X <DIM>');
await page.waitForTimeout(300);
const label = await page.evaluate(() => document.body.innerText.includes('2X Ø15.00'));
check('Dimension Text 2X <DIM> shows on the dimension', label);
await page.screenshot({ path: 'e2e-out/look-dim.png' });
console.log(`
${results.filter((r) => r.ok).length}/${results.length} checks passed`);
const pageErrors = errors.filter((e) => e.startsWith('pageerror'));
if (pageErrors.length) console.log('FAIL page errors', pageErrors.slice(0, 5));
process.exitCode = results.every((r) => r.ok) && !pageErrors.length ? 0 : 1;
for (const r of results.filter((r) => !r.ok)) console.log(' - ' + r.name + (r.info ? ' (' + r.info + ')' : ''));
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
