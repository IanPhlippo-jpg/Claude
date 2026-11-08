// Schermafbeeldingen van het dashboard van de treinverlichting (voorbeeldmodus, zonder doos): gsm en tablet, elk tabblad,
// licht en donker. Schrijft naar voorbeelden/treinverlichting/firmware/ui/beelden/.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';

const DIR = 'voorbeelden/treinverlichting/firmware/ui';
const UIT = `${DIR}/beelden`;
mkdirSync(UIT, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const tabs = ['groepen', 'scenes', 'functies', 'ingangen', 'instellingen'];
const fouten = [];
for (const [naam, viewport, schema] of [['gsm', { width: 390, height: 844 }, 'light'], ['tablet', { width: 1024, height: 768 }, 'light'], ['gsm-donker', { width: 390, height: 844 }, 'dark']]) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, colorScheme: schema });
  page.on('pageerror', (e) => fouten.push(`${naam}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') fouten.push(`${naam}: ${m.text()}`); });
  await page.goto(pathToFileURL(resolve(`${DIR}/dashboard.html`)).href);
  await page.waitForTimeout(1500);
  for (const t of tabs) {
    if (naam === 'gsm-donker' && t !== 'groepen') continue;
    await page.click(`[data-tab="${t}"]`).catch(() => fouten.push(`${naam}: tab ${t} niet gevonden`));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${UIT}/${naam}-${t}.png`, fullPage: false });
  }
  await page.close();
}
await browser.close();
console.log('beelden in', UIT, 'fouten:', JSON.stringify(fouten));
