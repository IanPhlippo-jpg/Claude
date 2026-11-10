// Maakt de werktekeningen per profiel (P1-P4) voor de extrudeur: PDF (4 bladen A4), PNG per profiel (voor de chat) en
// DXF per profiel, in het Engels en het Nederlands. Gebruik: node bibliotheek/taatsdeuren/maak-profieltekening.mjs [map]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { profielBlad, profielDxf } from './profieltekening.mjs';
import { schrijver } from './dxf.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const { chromium } = await import(pathToFileURL(join(HERE, '../../node_modules/playwright/index.mjs')).href);
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const codes = ['P1', 'P2', 'P3', 'P4'];
for (const [taal, map, naam] of [['en', 'Drawings-EN', 'Profile-drawings-P1-P4-EN'], ['nl', 'Tekeningen-NL', 'Profieltekeningen-P1-P4-NL']]) {
  const doelen = [join(HERE, 'aanvraag', map), ...process.argv.slice(2).map((m) => join(m, map))];
  const bladen = codes.map((c, i) => profielBlad(c, taal, i + 1, codes.length));
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page { size: 297mm 210mm; margin: 0 } html, body { margin: 0 } .a4 { width: 297mm; height: 210mm; overflow: hidden; page-break-after: always } .a4 svg { display: block; width: 297mm; height: 210mm }</style></head><body>${bladen.map((s) => `<div class="a4">${s}</div>`).join('')}</body></html>`;
  const p = await browser.newPage({ viewport: { width: 2079, height: 1470 } });
  await p.setContent(html); const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true });
  const png = [];
  for (const s of bladen) { await p.setContent(`<body style="margin:0">${s.replace(/width="297mm" height="210mm"/, 'width="2079" height="1470"')}</body>`); png.push(await p.screenshot({ type: 'png' })); }
  await p.close();
  for (const d of doelen) {
    mkdirSync(d, { recursive: true });
    writeFileSync(join(d, `${naam}.pdf`), pdf);
    codes.forEach((c, i) => { writeFileSync(join(d, `${c}-${taal}.png`), png[i]); writeFileSync(join(d, `${c}.dxf`), profielDxf(c, schrijver)); });
  }
  console.log(naam, Math.round(pdf.length / 1024), 'kB');
}
await browser.close();
