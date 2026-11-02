// look-dev: Boss-Extrude Property Panel on an 80 x 80 plate with a Ø35 circle, like calibration frame 0111
import { chromium } from 'playwright';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'top');
  const pts = [[-40, -40], [40, -40], [40, 40], [-40, 40]];
  let first = null, prev = null;
  for (let i = 0; i < pts.length; i++) {
    const a = prev ?? { x: pts[i][0], y: pts[i][1] };
    const b = i + 1 < pts.length ? { x: pts[i + 1][0], y: pts[i + 1][1] } : first;
    const [n, l] = K.addLine(s, a, b);
    s = n; if (!first) first = l.p1; prev = l.p2;
  }
  s = K.addCircle(s, { x: 0, y: 0 }, 17.5)[0];
  const d = { ...K.createDocument('BasePlate'), sketches: { s1: s }, features: [{ id: 'k', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }] };
  window.__phlippoStore.getState().openDocument(d);
  window.__phlippoStore.getState().editSketch('s1');
});
await page.waitForTimeout(400);
await page.evaluate(() => window.__phlippoStore.getState().startFeature('extrude', 'boss'));
await page.waitForTimeout(400);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(700, 600);
await page.waitForTimeout(600);
await page.screenshot({ path: 'e2e-out/look-extrude.png' });
await browser.close();
