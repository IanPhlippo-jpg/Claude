// quick look-dev: an L bracket like the SOLIDWORKS reference frame, trimetric, shaded with edges -> e2e-out/tune.png
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")').catch(() => undefined);
await page.evaluate(() => {
  const K = window.__phlippoKit;
  let s = K.createSketch('s1', 'Sketch1', 'front');
  const pts = [[0, 0], [80, 0], [80, 10], [10, 10], [10, 60], [0, 60]];
  let first = null, prev = null;
  for (let i = 0; i < pts.length; i++) {
    const a = prev ?? { x: pts[i][0], y: pts[i][1] };
    const b = i + 1 < pts.length ? { x: pts[i + 1][0], y: pts[i + 1][1] } : first;
    const [n, l] = K.addLine(s, a, b);
    s = n; if (!first) first = l.p1; prev = l.p2;
  }
  const d = { ...K.createDocument('Part1'), sketches: { s1: s }, features: [{ id: 'k', type: 'sketch', name: 'Sketch1', sketchId: 's1', suppressed: false }, { id: 'f1', type: 'extrude', name: 'Boss-Extrude1', sketchId: 's1', suppressed: false, op: 'boss', end: 'blind', depth: 80, reverse: false }] };
  window.__phlippoStore.getState().openDocument(d);
});
await page.waitForTimeout(400);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(100, 1000);
await page.waitForTimeout(500);
await page.screenshot({ path: 'e2e-out/tune.png' });
await page.click('.k-taskpane-btn[data-pane="appearances"]');
await page.waitForTimeout(300);
await page.locator('.k-swatch').nth(1).click();
await page.waitForTimeout(400);
await page.screenshot({ path: 'e2e-out/tune-pane.png' });
await browser.close();
