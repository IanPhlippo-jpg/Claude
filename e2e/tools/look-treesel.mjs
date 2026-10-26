// look-dev: the BasePlate with a fillet; hover a feature in the tree (orange outline) and select one (blue faces + its dimensions)
import { chromium } from 'playwright';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const S = window.__phlippoStore, K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'top');
  const c = [[0, 0], [80, 0], [80, 80], [0, 80]];
  const lines = [];
  for (let i = 0; i < 4; i++) { const r = K.addLine(s, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] }); s = r[0]; lines.push(r[1]); }
  const ci = K.addCircle(s, { x: 40, y: 40 }, 17.5); s = ci[0];
  s = K.addConstraint(s, 'length', [lines[0].id], { value: 80 })[0];
  s = K.addConstraint(s, 'length', [lines[1].id], { value: 80 })[0];
  s = K.addConstraint(s, 'diameter', [ci[1].id], { value: 35 })[0];
  const d = { ...K.createDocument('BasePlate'), sketches: { s1: s }, features: [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
  ] };
  S.getState().openDocument(d);
});
await page.waitForTimeout(1500);
await page.hover('.k-tree-row:has-text("Boss-Extrude1")');
await page.waitForTimeout(600);
await page.screenshot({ path: 'e2e-out/look-treehover.png' });
await page.click('.k-tree-row:has-text("Boss-Extrude1")');
await page.waitForTimeout(800);
await page.screenshot({ path: 'e2e-out/look-treesel-hot.png' });
const crumbs = await page.locator('[data-testid="breadcrumbs"]').count();
const crumbText = crumbs ? await page.locator('[data-testid="breadcrumbs"]').innerText() : '';
await page.mouse.move(900, 600, { steps: 8 });
await page.mouse.move(1500, 900, { steps: 8 });
await page.waitForTimeout(800);
await page.screenshot({ path: 'e2e-out/look-treesel.png' });
const crumbsAfter = await page.locator('[data-testid="breadcrumbs"]').count();
console.log('crumbs', crumbs, JSON.stringify(crumbText), 'after move (stays)', crumbsAfter);
console.log('errors', errors);
await browser.close();
