// Alleen de afzuiging uit e2e/tools/schema-pdf.mjs: het aansluitschema (A3 liggend) en de freesmallen en de snijmal op
// ware grootte (A4), met een PNG van elk blad in e2e-out. Zo hoeven de schema's van de andere projecten niet opnieuw.
// Gebruik: node e2e/tools/schema-afzuiging-pdf.mjs   (eerst schema/maak-schema.mjs en schema/maak-mallen.mjs)
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
const DIR = 'voorbeelden/afzuiging/schema';
mkdirSync('e2e-out', { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage({ viewport: { width: 1587, height: 1123 } });
await page.goto(pathToFileURL(resolve(`${DIR}/schema.html`)).href);
await page.pdf({ path: `${DIR}/Aansluitschema-afzuiging.pdf`, format: 'A3', landscape: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
const n = await page.locator('.blad').count();
for (let i = 0; i < n; i++) await page.locator('.blad').nth(i).screenshot({ path: `e2e-out/schema-blad-${i + 1}.png` });
await page.setViewportSize({ width: 794, height: 1123 });
const mallen = [];
for (const doos of ['afzuiging', 'knop', 'voedingsbox', 'afdichtlip']) {
  await page.goto(pathToFileURL(resolve(`${DIR}/mal-${doos}.html`)).href);
  await page.pdf({ path: `${DIR}/${doos === 'afdichtlip' ? 'Snijmal' : 'Freesmal'}-${doos}-1op1-A4.pdf`, width: '210mm', height: '297mm', scale: 1, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  const m = await page.locator('.blad').count();
  for (let i = 0; i < m; i++) await page.locator('.blad').nth(i).screenshot({ path: `e2e-out/mal-${doos}-${i + 1}.png` });
  mallen.push(`${doos} ${m}`);
}
// het typeplaatje (docs/typeplaatje.svg) als PNG voor de afdruk-PDF
await page.setViewportSize({ width: 800, height: 420 });
await page.goto(pathToFileURL(resolve('voorbeelden/afzuiging/docs/typeplaatje.svg')).href);
await page.locator('svg').screenshot({ path: 'voorbeelden/afzuiging/docs/typeplaatje.png', scale: 'device' });
console.log('pdf afzuiging', n, 'bladen; mallen:', mallen.join(', '), '; typeplaatje.png');
await browser.close();
