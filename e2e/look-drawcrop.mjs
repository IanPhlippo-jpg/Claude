// the drawing's title block and border at Ian's DPI, zoomed like a user would -> e2e-out/ian-tb.png
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 672 }, deviceScaleFactor: 1.5 });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:5173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const d = JSON.parse(readFileSync('voorbeelden/deurkruk/Kruk-tekening.kcad', 'utf8')); delete d.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), d);
await page.waitForTimeout(2500);
await page.screenshot({ path: 'e2e-out/ian-kruk-drawing.png' });
// zoom on the title block (bottom right of the sheet)
const p = await page.evaluate(() => window.__phlippoSheet.toPx([330, 30]));
for (let i = 0; i < 6; i++) { await page.mouse.move(p.x, p.y); await page.mouse.wheel(0, 120); await page.waitForTimeout(60); }
await page.waitForTimeout(400);
await page.screenshot({ path: 'e2e-out/ian-tb.png' });
await browser.close();
