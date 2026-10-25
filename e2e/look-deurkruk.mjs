// look-dev: the door handle assembly (voorbeelden/deurkruk) in the current design -> e2e-out/look-deurkruk.png
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'msedge' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(process.env.E2E_URL ?? 'http://127.0.0.1:4173/');
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('phlippo.theme', 'light'); });
await page.reload();
await page.waitForSelector('.k-viewport');
await page.click('.k-doctype:has-text("Part")');
const asm = JSON.parse(readFileSync('voorbeelden/deurkruk/Deurkruk.kcad', 'utf8')); delete asm.format;
await page.evaluate((d) => window.__phlippoStore.getState().openDocument(d), asm);
await page.waitForTimeout(2500);
await page.keyboard.press('Control+7');
await page.keyboard.press('f');
await page.mouse.move(700, 1000);
await page.waitForTimeout(1200);
await page.screenshot({ path: 'e2e-out/look-deurkruk.png' });
await browser.close();
