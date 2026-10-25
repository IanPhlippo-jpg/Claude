// look-dev: Boss-Extrude of a sketch with two regions: pick a region (Selected Contours, magenta) and drag the depth arrow (ruler)
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
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
  S.getState().newSketch('top');
  S.getState().commit('two rects', (sk) => {
    for (const [x0, y0] of [[0, 0], [50, 0]]) { const c = [[x0, y0], [x0 + 40, y0], [x0 + 40, y0 + 30], [x0, y0 + 30]]; for (let i = 0; i < 4; i++) sk = K.addLine(sk, { x: c[i][0], y: c[i][1] }, { x: c[(i + 1) % 4][0], y: c[(i + 1) % 4][1] })[0]; }
    return sk;
  });
});
await page.click('.k-cm-tab:has-text("Features")');
await page.click('.k-cm-big:has-text("Extruded Boss/Base") .k-cm-main');
await page.waitForTimeout(1200);
await page.click('.k-section-title:has-text("Selected Contours")');
await page.click('[data-testid="contour-box"]');
const r2 = await page.evaluate(() => window.__phlippoProjectWorld(70, 0, -15));
await page.mouse.click(r2.x, r2.y);
await page.waitForTimeout(600);
const contours = await page.evaluate(() => window.__phlippoStore.getState().featureEdit.draft.contours);
await page.screenshot({ path: 'e2e-out/look-contours.png' });
const grip = await page.locator('[data-testid="extrude-grip"]').boundingBox();
await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
await page.mouse.down();
await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2 - 120, { steps: 8 });
await page.waitForTimeout(400);
await page.screenshot({ path: 'e2e-out/look-extdrag.png' });
const ruler = await page.locator('[data-testid="extrude-ruler"]').count();
await page.mouse.up();
const depth = await page.evaluate(() => window.__phlippoStore.getState().featureEdit.draft.depth);
await page.mouse.move(5, 900);
await page.waitForTimeout(300);
await page.screenshot({ path: 'e2e-out/look-extdir2a.png' });
// the hollow Direction 2 arrow: dragging it turns Direction 2 on
const g2 = await page.locator('[data-testid="extrude-grip2"]').boundingBox();
await page.mouse.move(g2.x + g2.width / 2, g2.y + g2.height / 2);
await page.mouse.down();
await page.mouse.move(g2.x + g2.width / 2, g2.y + g2.height / 2 + 60, { steps: 6 });
await page.mouse.up();
await page.mouse.move(5, 900);
await page.waitForTimeout(500);
const dir2 = await page.evaluate(() => window.__phlippoStore.getState().featureEdit.draft.direction2);
await page.screenshot({ path: 'e2e-out/look-extdir2b.png' });
console.log(JSON.stringify({ contours, ruler, depth, dir2 }), errors);
await browser.close();
