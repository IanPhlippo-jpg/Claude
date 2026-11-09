// Maakt van voorbeelden/afzuiging/schema/schema.html en voorbeelden/treinverlichting/schema/schema.html een PDF (A3
// liggend) en van mal-<doos>.html de freesmallen van de afzuiging op ware grootte, per doos een PDF (A4 staand,
// schaal 1), met een PNG van elk blad om te controleren.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
const DIR = 'voorbeelden/afzuiging/schema';
mkdirSync('e2e-out', { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage({ viewport: { width: 1587, height: 1123 } });
// de schemaset van de heftafel (lastafel); --alleen-lastafel stopt daarna
await page.goto(pathToFileURL(resolve('voorbeelden/lastafel/schema/schema.html')).href);
await page.pdf({ path: 'voorbeelden/lastafel/schema/Schemaset-heftafel.pdf', format: 'A3', landscape: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
const nl = await page.locator('.blad').count();
for (let i = 0; i < nl; i++) await page.locator('.blad').nth(i).screenshot({ path: `e2e-out/lastafel-schema-blad-${i + 1}.png` });
console.log('pdf heftafel', nl, 'bladen');
if (process.argv.includes('--alleen-lastafel')) { await browser.close(); process.exit(0); }
await page.goto(pathToFileURL(resolve(`${DIR}/schema.html`)).href);
await page.pdf({ path: `${DIR}/Aansluitschema-afzuiging.pdf`, format: 'A3', landscape: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
const n = await page.locator('.blad').count();
for (let i = 0; i < n; i++) await page.locator('.blad').nth(i).screenshot({ path: `e2e-out/schema-blad-${i + 1}.png` });
// het schema van de treinverlichting
await page.goto(pathToFileURL(resolve('voorbeelden/treinverlichting/schema/schema.html')).href);
await page.pdf({ path: 'voorbeelden/treinverlichting/schema/Aansluitschema-kabeldoos.pdf', format: 'A3', landscape: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
const nt = await page.locator('.blad').count();
for (let i = 0; i < nt; i++) await page.locator('.blad').nth(i).screenshot({ path: `e2e-out/trein-schema-blad-${i + 1}.png` });
// de schemaset van de robotcel
await page.goto(pathToFileURL(resolve('voorbeelden/robotarm/schema/schema.html')).href);
await page.pdf({ path: 'voorbeelden/robotarm/schema/Schemaset-robotcel.pdf', format: 'A3', landscape: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
const nr = await page.locator('.blad').count();
for (let i = 0; i < nr; i++) await page.locator('.blad').nth(i).screenshot({ path: `e2e-out/robot-schema-blad-${i + 1}.png` });
console.log('pdf robotcel', nr, 'bladen');
if (process.argv.includes('--alleen-robot')) { await browser.close(); process.exit(0); }
// freesmallen, apart per doos: A4, schaal 1 (1 mm in de SVG = 1 mm op papier)
await page.setViewportSize({ width: 794, height: 1123 });
const mallen = [];
for (const doos of ['afzuiging', 'knop', 'voedingsbox', 'afdichtlip']) {
  await page.goto(pathToFileURL(resolve(`${DIR}/mal-${doos}.html`)).href);
  await page.pdf({ path: `${DIR}/${doos === 'afdichtlip' ? 'Snijmal' : 'Freesmal'}-${doos}-1op1-A4.pdf`, width: '210mm', height: '297mm', scale: 1, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  const m = await page.locator('.blad').count();
  for (let i = 0; i < m; i++) await page.locator('.blad').nth(i).screenshot({ path: `e2e-out/mal-${doos}-${i + 1}.png` });
  mallen.push(`${doos} ${m}`);
}
console.log('pdf afzuiging', n, 'bladen, treinverlichting', nt, 'bladen; freesmallen:', mallen.join(', '));
await browser.close();
