// schermafdrukken van de HMI van de robotcel (voorbeelden/robotarm/hmi/index.html) op 1366 x 768, de resolutie van het
// aanraakscherm -P10 (Advantech FPM-215W). Gebruik: node e2e/tools/hmi-robotarm.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const uit = 'voorbeelden/robotarm/hmi/beelden';
mkdirSync(uit, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const fouten = [];
page.on('pageerror', (e) => fouten.push(e.message));
const url = pathToFileURL(resolve('voorbeelden/robotarm/hmi/index.html')).href;
for (const s of ['overzicht', 'stukken', 'hand', 'statistiek', 'alarmen', 'onderhoud', 'veiligheid']) {
  await page.goto(`${url}?scherm=${s}&auto=1&stil=1`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${uit}/hmi-${s}.png` });
}
console.log('fouten', fouten);
await browser.close();
