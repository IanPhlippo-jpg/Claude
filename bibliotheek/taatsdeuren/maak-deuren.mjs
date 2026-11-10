// Maakt de bibliotheek stalen taatsdeuren: per stijl op de standaardmaat (of één deur op maat) het model (.kcad),
// het werkblad (SVG), de DXF van de laserdelen en de ruiten, en één PDF per deur; daarna de bibliotheek-PDF.
// Gebruik: node bibliotheek/taatsdeuren/maak-deuren.mjs                     (alle 50, standaardmaat)
//          node bibliotheek/taatsdeuren/maak-deuren.mjs boog 1100 2500 [koker|systeem]   (één deur op maat)
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { STIJLEN, ontwerp } from './deuren.mjs';
import { samenstelling } from './model.mjs';
import { laserDxf, glasDxf } from './dxf.mjs';
import { bladen, CSS, eur } from './dossier.mjs';
import { kostprijs } from './prijzen.mjs';
import { losseTekening } from './teken.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATUM = '2026-11-10';
const [, , id, B, H, systeem = 'koker'] = process.argv;
for (const d of ['modellen', 'tekeningen', 'dxf', 'pdf']) mkdirSync(join(HERE, d), { recursive: true });
const lijst = id ? [{ s: STIJLEN.find((x) => x.id === id), B: +B, H: +H }] : STIJLEN.map((s) => ({ s, B: s.std.B, H: s.std.H }));
const pagina = (titel, inhoud) => `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>${titel}</title><style>
@page a3 { size: 420mm 297mm; margin: 0 } @page a4 { size: 210mm 297mm; margin: 14mm }
html, body { margin: 0 } .a3 { page: a3; width: 420mm; height: 297mm; overflow: hidden; page-break-after: always } .a3 svg { display: block; width: 420mm; height: 297mm }
.a4 { page: a4; page-break-after: always } ${CSS}
.voor { page: a4; page-break-after: always; font: 10pt Arial } .voor h1 { font-size: 22pt; margin: 0 0 2mm } .raster { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2.5mm 2.5mm; margin-top: 5mm } .voor + .voor h1 { display: none }
.raster figure { margin: 0; text-align: center; font-size: 6.5pt; line-height: 1.25 } .raster svg { width: 100%; height: auto; border: 0.2mm solid #ddd; box-sizing: border-box; display: block }
</style></head><body>${inhoud}</body></html>`;

const { chromium } = await import(pathToFileURL(join(HERE, '../../node_modules/playwright/index.mjs')).href);
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const pdf = async (html, uit) => { const f = join(HERE, 'pdf', '_tmp.html'); writeFileSync(f, html); const p = await browser.newPage(); await p.goto(pathToFileURL(f).href); await p.pdf({ path: uit, preferCSSPageSize: true, printBackground: true }); await p.close(); };
const alle = [], overzicht = [];
for (const { s, B: b, H: h } of lijst) {
  const o = ontwerp(s.id, b, h, { systeem });
  const nr = `TD-${String(STIJLEN.indexOf(s) + 1).padStart(2, '0')}`, naam = `${nr}-${s.id}-${b}x${h}`;
  writeFileSync(join(HERE, 'modellen', `${naam}.kcad`), JSON.stringify(samenstelling(o, `Taatsdeur ${s.naam} ${b} x ${h}`)) + '\n');
  const { a3, a4, kost } = bladen(o, { systeem }, { nr, datum: DATUM });
  writeFileSync(join(HERE, 'tekeningen', `${naam}.svg`), a3);
  writeFileSync(join(HERE, 'dxf', `${naam}-laser.dxf`), laserDxf(o));
  writeFileSync(join(HERE, 'dxf', `${naam}-glas.dxf`), glasDxf(o));
  const deel = `<div class="a3">${a3}</div>${a4}`;
  await pdf(pagina(`Taatsdeur ${s.naam}`, deel), join(HERE, 'pdf', `${naam}.pdf`));
  alle.push(deel);
  overzicht.push(`<figure>${losseTekening(o, 120, 200, { maten: false, assen: false })}<figcaption><b>${nr} ${s.naam}</b><br>${b} x ${h} · kost ${eur(kost.kostprijs)}</figcaption></figure>`);
  console.log(naam, 'kostprijs', kost.kostprijs, 'verkoop', kost.verkoop);
}
if (!id) {
  const blok = (i) => overzicht.slice(i, i + 28).join('');
  const voor = [0, 28].filter((i) => i < overzicht.length).map((i) => `<section class="voor"><h1>Bibliotheek stalen taatsdeuren</h1>${i ? '' : `<p>${overzicht.length} stijlen, maten aanpasbaar (configurator). Per deur: werkblad A3 met maten, zaaglijst, laserlijst en glaslijst; kostprijs met bronnen en de werkwijze. Standaardmaat per stijl; kostprijs met koker en strip, glas 44.2 helder, budgetscharnier, poedercoat, € 45/u, plaatsen inbegrepen, excl. btw.</p>`}<div class="raster">${blok(i)}</div></section>`).join('');
  await pdf(pagina('Bibliotheek stalen taatsdeuren', voor + alle.join('')), join(HERE, 'Taatsdeuren-bibliotheek.pdf'));
}
await browser.close();
