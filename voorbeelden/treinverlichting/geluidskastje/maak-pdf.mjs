// De werktekening van het geluidskastje (tekeningen/GLD-01-geluidskastje.svg, A3 liggend) als PDF en PNG, zoals
// e2e/tools/trein-pdf.mjs het voor de kabeldoos doet (Edge via Playwright).
// Eerst de SVG: KASTJE_TEKENING=1 npx vitest run src/qa/qaKastje.test.ts
// Gebruik (vanuit de map van de repo): node voorbeelden/treinverlichting/geluidskastje/maak-pdf.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const T = join(dirname(fileURLToPath(import.meta.url)), 'tekeningen');
const UIT = resolve('e2e-out/geluidskastje');
mkdirSync(UIT, { recursive: true });
const svg = readFileSync(join(T, 'GLD-01-geluidskastje.svg'), 'utf8').replace(/^<\?xml[^>]*>\s*/, '');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:420mm 297mm;margin:0}html,body{margin:0}.blad{width:420mm;height:297mm;overflow:hidden}</style></head><body><div class="blad">${svg.replace(/<svg /, '<svg style="display:block;width:420mm;height:297mm" ')}</div></body></html>`;
const tmp = join(UIT, 'GLD-01.html');
writeFileSync(tmp, html);
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage({ viewport: { width: 1587, height: 1123 }, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(tmp).href);
await page.pdf({ path: join(T, 'GLD-01-geluidskastje.pdf'), preferCSSPageSize: true, printBackground: true });
await page.locator('.blad').screenshot({ path: join(T, 'GLD-01-geluidskastje.png') });
await browser.close();
console.log('GLD-01: PDF en PNG in', T);
