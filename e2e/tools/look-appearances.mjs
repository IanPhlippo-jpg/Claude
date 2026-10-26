// look-dev: the Appearances, Scenes, and Decals task pane (SW fr. 250): Metal > Aluminum, right-click a swatch, apply
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
  for (let i = 0; i < 4; i++) s = K.addLine(s, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0];
  s = K.addCircle(s, { x: 40, y: 40 }, 17.5)[0];
  S.getState().openDocument({ ...K.createDocument('BasePlate'), sketches: { s1: s }, features: [
    { id: 'k1', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false },
    { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 10, reverse: false },
  ] });
});
await page.waitForTimeout(800);
await page.click('.k-taskpane-btn[data-pane="appearances"]');
await page.waitForTimeout(400);
const sw = page.locator('[data-testid="appearance-swatch"]').nth(7);
await sw.click({ button: 'right' });
await page.waitForTimeout(300);
await page.screenshot({ path: 'e2e-out/look-appearances.png' });
const menu = await page.locator('[data-testid="appearance-menu"]').count();
await page.click('.k-ap-menu-item:has-text("Add Appearance to part")');
await page.waitForTimeout(600);
const ap = await page.evaluate(() => window.__phlippoStore.getState().doc.appearance);
await page.screenshot({ path: 'e2e-out/look-appearances2.png' });
console.log(JSON.stringify({ menu, ap }), errors);
await browser.close();
