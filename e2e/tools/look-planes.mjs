// look-dev: the standard planes shown (Hide/Show ▸ Planes), one selected, and a reference plane over a part, at
// 1920 x 1080 like the reference screen -> e2e-out/look-planes*.png
import { chromium } from 'playwright';
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : { ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
await page.waitForTimeout(600);
await page.evaluate(() => window.__phlippoStore.getState().toggleShow('planes'));
await page.mouse.move(1500, 900);
await page.waitForTimeout(800);
await page.screenshot({ path: 'e2e-out/look-planes.png' });
await page.click('.k-tree-row:has-text("Top Plane")');
await page.mouse.move(1500, 900);
await page.waitForTimeout(800);
await page.screenshot({ path: 'e2e-out/look-planes-sel.png' });
// the pointer over Right Plane in the tree: only that plane shows, in the highlight colour; the others step away
await page.hover('.k-tree-row:has-text("Right Plane") span:text-is("Right Plane")');
await page.waitForTimeout(800);
await page.screenshot({ path: 'e2e-out/look-planes-hover.png' });
await page.mouse.move(1500, 900);
await page.waitForTimeout(800);
await page.screenshot({ path: 'e2e-out/look-planes-after.png' });
await browser.close();
