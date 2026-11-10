// Maakt het aanvraagdossier voor leveranciers (profielsysteem P1-P4) als PDF in het Nederlands en het Engels, en de
// bladen als SVG. Gebruik: node bibliotheek/taatsdeuren/maak-aanvraag.mjs [extra map]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { aanvraagBladen } from './aanvraag.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), UIT = join(HERE, 'aanvraag');
mkdirSync(UIT, { recursive: true });
const { chromium } = await import(pathToFileURL(join(HERE, '../../node_modules/playwright/index.mjs')).href);
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const mappen = [UIT, ...process.argv.slice(2)];
for (const [taal, naam] of [['nl', 'Profielaanvraag-taatsdeur-NL'], ['en', 'Profile-RFQ-pivot-door-EN']]) {
  const bladen = aanvraagBladen(taal);
  bladen.forEach((s, i) => writeFileSync(join(UIT, `${naam}-${i + 1}.svg`), s));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page { size: 420mm 297mm; margin: 0 } html, body { margin: 0 } .a3 { width: 420mm; height: 297mm; overflow: hidden; page-break-after: always } .a3 svg { display: block; width: 420mm; height: 297mm }</style></head><body>${bladen.map((s) => `<div class="a3">${s}</div>`).join('')}</body></html>`;
  const p = await browser.newPage(); await p.setContent(html); const buf = await p.pdf({ preferCSSPageSize: true, printBackground: true }); await p.close();
  for (const m of mappen) { mkdirSync(m, { recursive: true }); writeFileSync(join(m, `${naam}.pdf`), buf); }
  console.log(naam, Math.round(buf.length / 1024), 'kB');
}
await browser.close();
