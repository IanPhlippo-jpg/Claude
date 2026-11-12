// Eén PDF om af te drukken met alles van de afzuiging: voorblad en inhoud, README (opbouw, bestellijst, printen,
// maken en monteren, onderhoud, firmware), bouwschema, werktekeningen, aansluitschema, freesmallen (1:1), knopschermen,
// materiaalstaat, rekenblad, meetplan, risicoanalyse en besparingen. Teksten op A4 staand, bouwschema A4 liggend, tekeningen en schema
// A3 liggend, freesmallen A4 op ware grootte. Eerst de andere uitvoer maken (tekeningen, schema-pdf, bouwschema).
// Gebruik: node e2e/tools/alles-afzuiging-pdf.mjs  ->  voorbeelden/afzuiging/Afzuiging-alles-afdrukken.pdf
import { chromium } from 'playwright';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { esc, dataUrl, mdDoc } from './mdhtml.mjs';
import { REVISIE_TEKST } from '../../voorbeelden/afzuiging/revisie.mjs';

const DIR = 'voorbeelden/afzuiging';
// ---- bladen ----
const svgUit = (html) => [...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].map((m) => m[0]);
const a3 = (svg) => `<div class="a3">${svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/<svg /, '<svg style="display:block;width:420mm;height:297mm" ')}</div>`;
const tekeningen = readdirSync(`${DIR}/tekeningen`).filter((f) => f.endsWith('.svg'))
  .sort((a, b) => { const v = (f) => (f.startsWith('AFZ-00-samen') ? '0' : f.startsWith('AFZ-00') ? '1' : f); return v(a).localeCompare(v(b)); })
  .map((f) => a3(readFileSync(`${DIR}/tekeningen/${f}`, 'utf8')));
const schema = svgUit(readFileSync(`${DIR}/schema/schema.html`, 'utf8')).map(a3);
const mallen = ['afzuiging', 'knop', 'voedingsbox', 'afdichtlip'].flatMap((d) => svgUit(readFileSync(`${DIR}/schema/mal-${d}.html`, 'utf8')))
  .map((s) => `<div class="mal">${s.replace(/<svg /, '<svg style="display:block;width:210mm;height:297mm" ')}</div>`);
// het bouwschema: de bladen uit e2e-out/bouwschema/bouwschema.html, met hun eigen stijl onder .bs
const bsHtml = readFileSync('e2e-out/bouwschema/bouwschema.html', 'utf8');
const bsStijl = bsHtml.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/@page\{[^}]*\}/, '')
  .replace(/(^|\})\s*([^{}@]+)\{/g, (_, a, sel) => `${a} ${sel.split(',').map((x) => (x.trim() === 'body' || x.trim() === '*' ? `.bs ${x.trim() === '*' ? '*' : ''}` : `.bs ${x.trim()}`)).join(',')}{`);
const bsBladen = [...bsHtml.matchAll(/<section class="blad[\s\S]*?<\/section>/g)].map((m) => `<div class="bs">${m[0]}</div>`);

const delen = [
  ['README: opbouw, bestellijst, printen, maken en monteren, onderhoud, firmware', 'A4'],
  [`Bouwschema (${bsBladen.length} bladen)`, 'A4 liggend'],
  [`Werktekeningen (${tekeningen.length} bladen)`, 'A3 liggend'],
  [`Aansluitschema (${schema.length} bladen)`, 'A3 liggend'],
  [`Freesmallen en snijmal op ware grootte (${mallen.length} bladen)`, 'A4, afdrukken op 100 %'],
  ['Schermen van de knop', 'A4'],
  ['Materiaalstaat', 'A4'],
  ['Rekenblad', 'A4'],
  ['Beschermingsconcept, meetplan en vrijgave', 'A4'],
  ['Risicoanalyse en CE', 'A4'],
  ['Goedkoper maken', 'A4'],
];
const voorblad = `<section class="voor">
  <p class="klein">Lush Beauty · ${REVISIE_TEKST}</p>
  <h1>Ingebouwde nagelstofafzuiging</h1>
  <p class="sub">Alles om af te drukken: bestellijst, bouwschema, werktekeningen, aansluitschema, freesmallen en documentatie</p>
  <img class="fig voorfoto" src="${dataUrl(`e2e-out/bouwschema/${readdirSync('e2e-out/bouwschema').filter((f) => /^stap-.*\.jpg$/.test(f)).sort().pop()}`)}">
  <h2>Inhoud</h2>
  <ol>${delen.map(([t, p]) => `<li>${esc(t)} <span class="klein">(${p})</span></li>`).join('')}</ol>
  <p class="klein"><b>Afdrukken:</b> kies "werkelijke grootte" of "100 %" (niet "passend maken"), anders kloppen de freesmallen
  niet: meet op elke mal de controlemaat van 100 mm na. De printer kiest per blad het formaat (A4 staand, A4 liggend, A3 liggend);
  zonder A3-printer: druk de A3-bladen af op A4 (verkleind) en gebruik de maten in de tabellen, niet de lineaal.</p>
</section>`;
const schermen = `<section class="tekst"><h1>Schermen van de knop</h1><img class="fig" src="${dataUrl(`${DIR}/firmware/ui/schermen.png`)}"></section>`;

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Afzuiging: alles afdrukken</title><style>
@page { size: 210mm 297mm; margin: 14mm 14mm 16mm }
@page liggend { size: 297mm 210mm; margin: 0 }
@page a3 { size: 420mm 297mm; margin: 0 }
@page mal { size: 210mm 297mm; margin: 0 }
html, body { margin: 0 }
body { font-family: Arial, Helvetica, sans-serif; color: #1d1d1f; font-size: 9.5pt; line-height: 1.38 }
.voor, .tekst { page-break-before: always }
.voor { page-break-before: auto }
.voor h1 { font-size: 26pt; margin: 6mm 0 3mm } .voorfoto { max-height: 95mm } .sub { font-size: 12pt; color: #555; margin: 0 0 8mm } .klein { font-size: 8.5pt; color: #555 }
.voor ol { font-size: 11pt; line-height: 1.7 }
.fig { max-width: 100%; max-height: 120mm; display: block; margin: 3mm auto }
h1 { font-size: 17pt; margin: 0 0 3mm; border-bottom: 0.4mm solid #1d1d1f; padding-bottom: 1.5mm }
h2 { font-size: 13pt; margin: 6mm 0 2mm; page-break-after: avoid } h3 { font-size: 11pt; margin: 4mm 0 1.5mm; page-break-after: avoid } h4 { font-size: 10pt; margin: 3mm 0 1mm }
table { border-collapse: collapse; width: 100%; margin: 2mm 0 3mm; font-size: 8pt; page-break-inside: auto }
tr { page-break-inside: avoid } th, td { border-bottom: 0.2mm solid #ccc; text-align: left; padding: 0.8mm 1.4mm; vertical-align: top } th { background: #f1ede8 }
code { font-family: Consolas, monospace; font-size: 8.5pt; background: #f4f4f4; padding: 0 0.6mm }
pre { font-family: Consolas, monospace; font-size: 8pt; background: #f4f4f4; padding: 2mm; white-space: pre-wrap }
li { margin-bottom: 1mm }
.bs { page: liggend } .a3 { page: a3; width: 420mm; height: 297mm; overflow: hidden; page-break-after: always }
.mal { page: mal; width: 210mm; height: 297mm; overflow: hidden; page-break-after: always }
${bsStijl}
</style></head><body>
${voorblad}
${mdDoc(`${DIR}/README.md`, 'readme')}
${bsBladen.join('\n')}
${tekeningen.join('\n')}
${schema.join('\n')}
${mallen.join('\n')}
${schermen}
${mdDoc(`${DIR}/docs/Materiaalstaat.md`, 'materiaal')}
${mdDoc(`${DIR}/docs/Berekeningen.md`, 'rekenblad')}
${mdDoc(`${DIR}/docs/Vrijgave-en-meetplan.md`, 'meetplan')}
${mdDoc(`${DIR}/docs/Risicoanalyse-en-CE.md`, 'risico')}
${mdDoc(`${DIR}/docs/Besparingen.md`, 'besparingen')}
</body></html>`;
mkdirSync('e2e-out/alles', { recursive: true });
const tmp = resolve('e2e-out/alles/alles.html');
writeFileSync(tmp, html);
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage();
await page.goto(pathToFileURL(tmp).href);
await page.waitForTimeout(1500);
await page.pdf({ path: `${DIR}/Afzuiging-alles-afdrukken.pdf`, preferCSSPageSize: true, printBackground: true });
console.log('alles in één pdf:', bsBladen.length, 'bouwschema,', tekeningen.length, 'tekeningen,', schema.length, 'schema,', mallen.length, 'mallen');
await browser.close();
