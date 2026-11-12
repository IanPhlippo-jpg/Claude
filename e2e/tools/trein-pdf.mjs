// De PDF's van de kabeldoos (treinverlichting) zonder de andere voorbeelden aan te raken: het aansluitschema
// (schema/schema.html, A3 liggend) en de werktekeningen (tekeningen/*.svg: A3 liggend of A4 staand, volgens de maat in
// de SVG), met een PNG van elk blad in e2e-out/trein-pdf om na te kijken.
// Gebruik: node e2e/tools/trein-pdf.mjs [schema] [tekeningen]   (zonder argument: allebei)
import { chromium } from 'playwright';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const DIR = 'voorbeelden/treinverlichting';
const UIT = 'e2e-out/trein-pdf';
mkdirSync(UIT, { recursive: true });
const wat = process.argv.slice(2);
const doe = (n) => !wat.length || wat.includes(n);
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage({ viewport: { width: 1587, height: 1123 } });
if (doe('schema')) {
  await page.goto(pathToFileURL(resolve(`${DIR}/schema/schema.html`)).href);
  await page.pdf({ path: `${DIR}/schema/Aansluitschema-kabeldoos.pdf`, format: 'A3', landscape: true, printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  const n = await page.locator('.blad').count();
  for (let i = 0; i < n; i++) await page.locator('.blad').nth(i).screenshot({ path: `${UIT}/schema-blad-${i + 1}.png` });
  console.log('schema:', n, 'bladen');
}
if (doe('tekeningen')) {
  // volgorde: boormal eerst, dan de rest op naam
  const svgs = readdirSync(`${DIR}/tekeningen`).filter((f) => f.endsWith('.svg')).sort((a, b) => (/-00-/.test(a) ? '0' : a).localeCompare(/-00-/.test(b) ? '0' : b));
  const maat = (s) => { const m = /width="(\d+)mm" height="(\d+)mm"/.exec(s); return m ? [+m[1], +m[2]] : [420, 297]; };
  const bladen = svgs.map((f) => {
    const s = readFileSync(`${DIR}/tekeningen/${f}`, 'utf8').replace(/^<\?xml[^>]*>\s*/, ''), [w, h] = maat(s);
    return `<div class="blad ${w > h ? 'a3' : 'a4'}" style="width:${w}mm;height:${h}mm">${s.replace(/<svg /, `<svg style="display:block;width:${w}mm;height:${h}mm" `)}</div>`;
  });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page a3{size:420mm 297mm;margin:0}@page a4{size:210mm 297mm;margin:0}html,body{margin:0}.blad{overflow:hidden;page-break-after:always}.a3{page:a3}.a4{page:a4}</style></head><body>${bladen.join('\n')}</body></html>`;
  const tmp = resolve(`${UIT}/tekeningen.html`);
  writeFileSync(tmp, html);
  await page.goto(pathToFileURL(tmp).href);
  await page.pdf({ path: `${DIR}/tekeningen/Werktekeningen-kabeldoos.pdf`, preferCSSPageSize: true, printBackground: true });
  for (let i = 0; i < svgs.length; i++) await page.locator('.blad').nth(i).screenshot({ path: `${UIT}/${svgs[i].replace('.svg', '.png')}` });
  console.log('tekeningen:', svgs.length, 'bladen');
}
await browser.close();
