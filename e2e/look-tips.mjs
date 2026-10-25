// rich tooltips of the Command Ribbon at Ian's DPI -> e2e-out/ian-tip-*.png
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 672 }, deviceScaleFactor: 1.5 });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
for (const [tab, label] of [['Features', 'Extruded Boss/Base'], ['Features', 'Fillet'], ['Features', 'Hole Wizard'], ['Features', 'Linear Pattern'], ['Sketch', 'Smart Dimension'], ['Sketch', 'Trim Entities']]) {
  await page.click(`.k-cm-tab:has-text("${tab}")`);
  await page.mouse.move(640, 500);
  await page.waitForTimeout(200);
  await page.hover(`.k-cm-body button[data-tip^="${label}"]`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `e2e-out/ian-tip-${label.replace(/[^a-z]/gi, '')}.png`, clip: { x: 0, y: 0, width: 900, height: 420 } });
}
await browser.close();
