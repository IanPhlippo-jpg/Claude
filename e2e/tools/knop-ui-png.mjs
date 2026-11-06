// Maakt een PNG van voorbeelden/afzuiging/firmware/ui/schermen.html (alle schermen van de knop) naast de HTML.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const html = resolve('voorbeelden/afzuiging/firmware/ui/schermen.html');
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(html).href);
await page.screenshot({ path: 'voorbeelden/afzuiging/firmware/ui/schermen.png', fullPage: true });
console.log('schermen.png');
await browser.close();
