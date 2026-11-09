// Eén PDF om af te drukken met alles van de lastafel op de heftafel: voorblad, README (bronnen, bestellijst), beelden,
// de werktekeningen en de schemaset (A3 liggend), de berekeningen en de eisen.
// Eerst de andere uitvoer maken (maak-lastafel, berekeningen.py, maak-schema, look-lastafel, tekeningenLastafel).
// Gebruik: node e2e/tools/alles-lastafel-pdf.mjs  ->  voorbeelden/lastafel/Lastafel-alles-afdrukken.pdf
import { chromium } from 'playwright';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { esc, dataUrl, mdDoc } from './mdhtml.mjs';

const DIR = 'voorbeelden/lastafel';
const a3 = (svg) => `<div class="a3">${svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/<svg /, '<svg style="display:block;width:420mm;height:297mm" ')}</div>`;
const schema = readdirSync(`${DIR}/schema`).filter((f) => /^blad-\d+\.svg$/.test(f)).sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)))
  .map((f) => a3(readFileSync(`${DIR}/schema/${f}`, 'utf8')));
const tekeningen = readdirSync(`${DIR}/tekeningen`).filter((f) => f.endsWith('.svg')).sort().map((f) => a3(readFileSync(`${DIR}/tekeningen/${f}`, 'utf8')));
const beeld = (f, titel) => (existsSync(`${DIR}/beelden/${f}.png`) ? `<figure><img class="fig" src="${dataUrl(`${DIR}/beelden/${f}.png`)}"><figcaption>${esc(titel)}</figcaption></figure>` : '');
const beelden = `<section class="tekst"><h1>De lastafel op de heftafel</h1>
  ${beeld('tafel-zij', 'Lastafel 2400 x 1200 Ø28 DG op de heftafel (bovenkant lift 825 mm)')}
  ${beeld('tafel-iso', 'Isometrie met het voetpedaal')}
  ${beeld('laag', 'Laagste stand: bovenkant lift 370, werkhoogte 570')}
  ${beeld('hoog', 'Hoogste stand: bovenkant lift 1425, werkhoogte 1625')}
  ${beeld('badge', 'De wand met de drie rijen gaten en de eigen badge')}</section>
<section class="tekst"><h1>De heftafel zonder tafel</h1>
  ${beeld('lift-zij', 'Schaar met twee armparen, opvanglade en 6 gefreesde steunvlakken')}
  ${beeld('valbeveiliging', 'Valbeveiliging: gele kap met zaagtand en de pal op de cilinder')}
  ${beeld('steunvlak', 'Gefreesd steunvlak met boring M16 op de hoek van het bovenframe')}
  ${beeld('onderframe', 'Onderframe: UNP 100, aggregaat, rollen, aanslagpennen, bedienkast')}</section>`;
const delen = ['README: bronnen, wat er is, bestellijst', 'Beelden', `Tekeningen (${tekeningen.length} bladen, A3 liggend)`, `Schemaset (${schema.length} bladen, A3 liggend)`, 'Berekeningen', 'Eisen'];
const voorblad = `<section class="voor"><p class="klein">Lastafel op heftafel · versie 1 (2026-11-09)</p><h1>Lastafel 2400 x 1200 op een schaarheftafel van 4 ton</h1>
  <p class="sub">Nagemaakt van de DCT-video: 3D-lastafel Ø28 DG op een elektrohydraulische heftafel, 570 tot 1625 mm werkhoogte.</p>
  ${existsSync(`${DIR}/beelden/tafel-zij.png`) ? `<img class="fig voorfoto" src="${dataUrl(`${DIR}/beelden/tafel-zij.png`)}">` : ''}
  <h2>Inhoud</h2><ol>${delen.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></section>`;
const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Lastafel: alles afdrukken</title><style>
@page { size: 210mm 297mm; margin: 14mm 14mm 16mm }
@page a3 { size: 420mm 297mm; margin: 0 }
html, body { margin: 0 }
body { font-family: Arial, Helvetica, sans-serif; color: #1d1d1f; font-size: 9.5pt; line-height: 1.38 }
.voor, .tekst { page-break-before: always } .voor { page-break-before: auto }
.voor h1 { font-size: 22pt; margin: 6mm 0 3mm } .voorfoto { max-height: 100mm } .sub { font-size: 12pt; color: #555; margin: 0 0 8mm } .klein { font-size: 8.5pt; color: #555 }
.voor ol { font-size: 11pt; line-height: 1.7 }
figure { margin: 0 0 4mm; page-break-inside: avoid } figcaption { font-size: 8.5pt; color: #555; text-align: center }
.fig { max-width: 100%; max-height: 110mm; display: block; margin: 2mm auto; border: 0.2mm solid #ddd }
h1 { font-size: 17pt; margin: 0 0 3mm; border-bottom: 0.4mm solid #1d1d1f; padding-bottom: 1.5mm }
h2 { font-size: 13pt; margin: 6mm 0 2mm; page-break-after: avoid } h3 { font-size: 11pt; margin: 4mm 0 1.5mm }
table { border-collapse: collapse; width: 100%; margin: 2mm 0 3mm; font-size: 8pt } tr { page-break-inside: avoid }
th, td { border-bottom: 0.2mm solid #ccc; text-align: left; padding: 0.8mm 1.4mm; vertical-align: top } th { background: #eef3ee }
code { font-family: Consolas, monospace; font-size: 8.5pt; background: #f4f4f4; padding: 0 0.6mm }
pre { font-family: Consolas, monospace; font-size: 8pt; background: #f4f4f4; padding: 2mm; white-space: pre-wrap }
.a3 { page: a3; width: 420mm; height: 297mm; overflow: hidden; page-break-after: always }
</style></head><body>
${voorblad}
${mdDoc(`${DIR}/README.md`, 'readme')}
${beelden}
${tekeningen.join('\n')}
${schema.join('\n')}
${mdDoc(`${DIR}/docs/Berekeningen.md`, 'rekenblad')}
${mdDoc(`${DIR}/EISEN.md`, 'eisen')}
</body></html>`;
mkdirSync('e2e-out/alles-lastafel', { recursive: true });
const tmp = resolve('e2e-out/alles-lastafel/alles.html');
writeFileSync(tmp, html);
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage();
await page.goto(pathToFileURL(tmp).href);
await page.waitForTimeout(1500);
await page.pdf({ path: `${DIR}/Lastafel-alles-afdrukken.pdf`, preferCSSPageSize: true, printBackground: true });
console.log('alles in één pdf:', tekeningen.length, 'tekeningen,', schema.length, 'schemabladen');
await browser.close();
