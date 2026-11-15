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
  if (naam === 'gsm') {
    // firmware 1.3.0: een hallsensor instellen (ingang 7 van het voorbeeld) en een scène per groep aan/uit kiezen
    try {
      await page.click('[data-tab="ingangen"]');
      await page.locator('#ingangen-lijst .ingang').nth(6).getByRole('button', { name: 'Instellen' }).click();
      await page.waitForTimeout(400);
      await page.evaluate(() => { document.querySelectorAll('#ingangen-lijst .ingang')[6].scrollIntoView({ block: 'start' }); window.scrollBy(0, -96); });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${UIT}/${naam}-ingang-hallsensor.png`, fullPage: false });
      await page.click('[data-tab="scenes"]');
      await page.click('#scene-beheer');
      await page.waitForTimeout(300);
      await page.locator('#scenes-beheer .groep-rij').nth(2).getByRole('button', { name: 'Groepen kiezen' }).click();
      await page.waitForTimeout(300);
      await page.evaluate(() => { document.querySelectorAll('#scenes-beheer .groep-rij')[2].scrollIntoView({ block: 'start' }); window.scrollBy(0, -96); });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${UIT}/${naam}-scene-kiezen.png`, fullPage: false });
    } catch (e) {
      fouten.push(`${naam}: extra beelden: ${e.message}`);
    }
  }
  await page.close();
}
await browser.close();
console.log('beelden in', UIT, 'fouten:', JSON.stringify(fouten));
