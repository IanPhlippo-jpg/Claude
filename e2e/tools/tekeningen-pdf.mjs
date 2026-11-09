// Bundelt de werktekeningen (voorbeelden/afzuiging/tekeningen/*.svg) tot één PDF (A3 liggend) en maakt van elk blad
// een PNG in e2e-out/tekeningen om te controleren. Gebruik: node e2e/tools/tekeningen-pdf.mjs [map] [pdf-naam]
// (standaard de afzuiging; de kabeldoos: node e2e/tools/tekeningen-pdf.mjs voorbeelden/treinverlichting/tekeningen Werktekeningen-kabeldoos.pdf)
import { chromium } from 'playwright';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const DIR = process.argv[2] ?? 'voorbeelden/afzuiging/tekeningen';
const PDF = process.argv[3] ?? 'Werktekeningen-afzuiging.pdf';
const volgorde = (f) => (/^[A-Z]+-00-samen/.test(f) ? '0' : /^[A-Z]+-00/.test(f) ? '1' : f);
const svgs = readdirSync(DIR).filter((f) => f.endsWith('.svg')).sort((a, b) => volgorde(a).localeCompare(volgorde(b)));
const bladen = svgs.map((f) => `<div class="blad">${readFileSync(`${DIR}/${f}`, 'utf8').replace(/^<\?xml[^>]*>\s*/, '').replace('width="420mm" height="297mm"', 'width="420mm" height="297mm" style="display:block"')}</div>`);
const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:420mm 297mm;margin:0}html,body{margin:0}.blad{width:420mm;height:297mm;overflow:hidden;page-break-after:always}</style></head><body>${bladen.join('\n')}</body></html>`;
mkdirSync('e2e-out/tekeningen', { recursive: true });
const tmp = resolve('e2e-out/tekeningen/tekeningen.html');
writeFileSync(tmp, html);
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage({ viewport: { width: 1587, height: 1123 }, deviceScaleFactor: 1.5 });
await page.goto(pathToFileURL(tmp).href);
await page.pdf({ path: `${DIR}/${PDF}`, width: '420mm', height: '297mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
for (let i = 0; i < svgs.length; i++) await page.locator('.blad').nth(i).screenshot({ path: `e2e-out/tekeningen/${svgs[i].replace('.svg', '.png')}` });
console.log('pdf met', svgs.length, 'bladen');
await browser.close();
