// Maakt van voorbeelden/afzuiging/schema/schema.html een PDF (A3 liggend) en een PNG van elk blad om te controleren.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const html = resolve('voorbeelden/afzuiging/schema/schema.html');
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage({ viewport: { width: 1587, height: 1123 } });
await page.goto(pathToFileURL(html).href);
await page.pdf({ path: 'voorbeelden/afzuiging/schema/Aansluitschema-afzuiging.pdf', format: 'A3', landscape: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
const n = await page.locator('.blad').count();
for (let i = 0; i < n; i++) await page.locator('.blad').nth(i).screenshot({ path: `e2e-out/schema-blad-${i + 1}.png` });
console.log('pdf en', n, 'bladen');
await browser.close();
