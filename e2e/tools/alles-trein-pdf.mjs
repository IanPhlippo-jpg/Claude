// Eén PDF om af te drukken met alles van de kabeldoos (treinverlichting): voorblad en inhoud, README (opbouw, aansluiten,
// labels, bediening, bestellijst, printen), bouwschema, werktekeningen (boormal 1:1), aansluitschema, het dashboard,
// de handleiding van de firmware, het rekenblad, de maten met bronnen en de eisen. Teksten A4 staand, bouwschema A4
// liggend, tekeningen en schema A3 liggend. Eerst de andere uitvoer maken (tekeningen, schema, bouwschema-trein).
// Gebruik: node e2e/tools/alles-trein-pdf.mjs  ->  voorbeelden/treinverlichting/Kabeldoos-alles-afdrukken.pdf
import { chromium } from 'playwright';
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { esc, dataUrl, mdDoc } from './mdhtml.mjs';

const DIR = 'voorbeelden/treinverlichting';
const VERSIE = `versie 4 (${/\((\d{4}-\d{2}-\d{2})\)/.exec(readFileSync(`${DIR}/README.md`, 'utf8'))?.[1] ?? ''})`;

const a3 = (svg) => `<div class="a3">${svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/<svg /, '<svg style="display:block;width:420mm;height:297mm" ')}</div>`;
// de tekeningen: A3 liggend, het meetblad en het invulblad A4 staand (volgens de maat in de SVG)
const blad = (svg) => (/width="210mm"/.test(svg) ? `<div class="a4b">${svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/<svg /, '<svg style="display:block;width:210mm;height:297mm" ')}</div>` : a3(svg));
const tekeningen = readdirSync(`${DIR}/tekeningen`).filter((f) => f.endsWith('.svg')).sort().map((f) => blad(readFileSync(`${DIR}/tekeningen/${f}`, 'utf8')));
const schema = readdirSync(`${DIR}/schema`).filter((f) => /^blad-\d+\.svg$/.test(f)).sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)))
  .map((f) => a3(readFileSync(`${DIR}/schema/${f}`, 'utf8')));
// het bouwschema: de bladen uit e2e-out/bouwschema-trein/bouwschema.html, met hun eigen stijl onder .bs
const bsHtml = readFileSync('e2e-out/bouwschema-trein/bouwschema.html', 'utf8');
const bsStijl = bsHtml.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/@page\{[^}]*\}/, '')
  .replace(/(^|\})\s*([^{}@]+)\{/g, (_, a, sel) => `${a} ${sel.split(',').map((x) => (x.trim() === 'body' || x.trim() === '*' ? `.bs ${x.trim() === '*' ? '*' : ''}` : `.bs ${x.trim()}`)).join(',')}{`);
const bsBladen = [...bsHtml.matchAll(/<section class="blad[\s\S]*?<\/section>/g)].map((m) => `<div class="bs">${m[0]}</div>`);

const UI = `${DIR}/firmware/ui/beelden`;
const dashboard = `<section class="tekst"><h1>Het dashboard</h1>
  <p>Op de gsm (wifi <b>Treinbaan</b>, dan opent het dashboard vanzelf, anders <code>http://192.168.4.1</code>):</p>
  <div class="rij">${['gsm-groepen', 'gsm-scenes', 'gsm-functies', 'gsm-ingangen'].map((f) => `<img class="gsm" src="${dataUrl(`${UI}/${f}.png`)}">`).join('')}</div>
  <p>Instellingen: wachtwoord, thuis-wifi, testmodus (looplicht, groep vast) en firmware bijwerken:</p>
  <div class="rij"><img class="gsm" src="${dataUrl(`${UI}/gsm-instellingen.png`)}"></div>
  <p>Op de tablet:</p><img class="fig" src="${dataUrl(`${UI}/tablet-groepen.png`)}"></section>`;

const delen = [
  ['README: opbouw, aansluiten, draden labelen, bediening, bestellijst, printen', 'A4'],
  [`Bouwschema (${bsBladen.length} bladen)`, 'A4 liggend'],
  [`Werktekeningen, montageblad van de modules, draadlijst, meetblad en invulblad (${tekeningen.length} bladen, de boormal op ware grootte)`, 'A3 liggend en A4 staand, afdrukken op 100 %'],
  [`Aansluitschema (${schema.length} bladen)`, 'A3 liggend'],
  ['Het dashboard', 'A4'],
  ['Firmware: werking en instellingen', 'A4'],
  ['Rekenblad', 'A4'],
  ['Maten en bronnen', 'A4'],
  ['Eisen', 'A4'],
];
const voorblad = `<section class="voor">
  <p class="klein">Treinverlichting · ${esc(VERSIE)}</p>
  <h1>Kabeldoos voor de verlichting van de modelbaan</h1>
  <p class="sub">16 lichtgroepen, 16 ingangen voor knoppen en sensoren (contact, reed en NPN), een eigen wifi met dashboard, kant-en-klare modules. Alles om af te drukken.</p>
  <img class="fig voorfoto" src="${dataUrl('e2e-out/trein-doos-open.png')}">
  <h2>Inhoud</h2>
  <ol>${delen.map(([t, p]) => `<li>${esc(t)} <span class="klein">(${p})</span></li>`).join('')}</ol>
  <p class="klein"><b>Afdrukken:</b> kies "werkelijke grootte" of "100 %" (niet "passend maken"), anders klopt de boormal niet:
  meet de controlemaat van 100 mm na. De printer kiest per blad het formaat (A4 staand, A4 liggend, A3 liggend). Zonder
  A3-printer: de boormal op twee A4-bladen afdrukken (posterfunctie van de printer) en aan elkaar plakken.</p>
</section>`;

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Kabeldoos: alles afdrukken</title><style>
@page { size: 210mm 297mm; margin: 14mm 14mm 16mm }
@page liggend { size: 297mm 210mm; margin: 0 }
@page a3 { size: 420mm 297mm; margin: 0 }
@page a4b { size: 210mm 297mm; margin: 0 }
html, body { margin: 0 }
body { font-family: Arial, Helvetica, sans-serif; color: #1d1d1f; font-size: 9.5pt; line-height: 1.38 }
.voor, .tekst { page-break-before: always }
.voor { page-break-before: auto }
.voor h1 { font-size: 24pt; margin: 6mm 0 3mm } .voorfoto { max-height: 95mm } .sub { font-size: 12pt; color: #555; margin: 0 0 8mm } .klein { font-size: 8.5pt; color: #555 }
.voor ol { font-size: 11pt; line-height: 1.7 }
.fig { max-width: 100%; max-height: 120mm; display: block; margin: 3mm auto }
.rij { display: flex; gap: 3mm } .gsm { width: 24%; border: 0.3mm solid #ccc }
h1 { font-size: 17pt; margin: 0 0 3mm; border-bottom: 0.4mm solid #1d1d1f; padding-bottom: 1.5mm }
h2 { font-size: 13pt; margin: 6mm 0 2mm; page-break-after: avoid } h3 { font-size: 11pt; margin: 4mm 0 1.5mm; page-break-after: avoid } h4 { font-size: 10pt; margin: 3mm 0 1mm }
table { border-collapse: collapse; width: 100%; margin: 2mm 0 3mm; font-size: 8pt; page-break-inside: auto }
tr { page-break-inside: avoid } th, td { border-bottom: 0.2mm solid #ccc; text-align: left; padding: 0.8mm 1.4mm; vertical-align: top } th { background: #eef3ee }
code { font-family: Consolas, monospace; font-size: 8.5pt; background: #f4f4f4; padding: 0 0.6mm }
pre { font-family: Consolas, monospace; font-size: 8pt; background: #f4f4f4; padding: 2mm; white-space: pre-wrap }
li { margin-bottom: 1mm }
.bs { page: liggend } .a3 { page: a3; width: 420mm; height: 297mm; overflow: hidden; page-break-after: always }
.a4b { page: a4b; width: 210mm; height: 297mm; overflow: hidden; page-break-after: always }
${bsStijl}
</style></head><body>
${voorblad}
${mdDoc(`${DIR}/README.md`, 'readme')}
${bsBladen.join('\n')}
${tekeningen.join('\n')}
${schema.join('\n')}
${dashboard}
${mdDoc(`${DIR}/firmware/README.md`, 'firmware')}
${mdDoc(`${DIR}/docs/Berekeningen.md`, 'rekenblad')}
${mdDoc(`${DIR}/docs/Maten-en-bronnen.md`, 'maten')}
${mdDoc(`${DIR}/EISEN.md`, 'eisen')}
</body></html>`;
mkdirSync('e2e-out/alles-trein', { recursive: true });
const tmp = resolve('e2e-out/alles-trein/alles.html');
writeFileSync(tmp, html);
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage();
await page.goto(pathToFileURL(tmp).href);
await page.waitForTimeout(1500);
await page.pdf({ path: `${DIR}/Kabeldoos-alles-afdrukken.pdf`, preferCSSPageSize: true, printBackground: true });
console.log('alles in één pdf:', bsBladen.length, 'bouwschema,', tekeningen.length, 'tekeningen,', schema.length, 'schema');
await browser.close();
