// Eén PDF om af te drukken met alles van de robotcel: voorblad, README (kosten, raad), beelden van de robot, de cel en
// de kast, de HMI, de schemaset (A3 liggend), het rekenblad, grijpen, veiligheid, besturing en de eisen.
// Eerst de andere uitvoer maken (maak-robotarm, maak-kast, maak-schema, look-robotarm, look-kast, hmi-robotarm).
// Gebruik: node e2e/tools/alles-robot-pdf.mjs  ->  voorbeelden/robotarm/Robotcel-alles-afdrukken.pdf
import { chromium } from 'playwright';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { esc, dataUrl, mdDoc } from './mdhtml.mjs';

const DIR = 'voorbeelden/robotarm';
const a3 = (svg) => `<div class="a3">${svg.replace(/^<\?xml[^>]*>\s*/, '').replace(/<svg /, '<svg style="display:block;width:420mm;height:297mm" ')}</div>`;
const schema = readdirSync(`${DIR}/schema`).filter((f) => /^blad-\d+\.svg$/.test(f)).sort((a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)))
  .map((f) => a3(readFileSync(`${DIR}/schema/${f}`, 'utf8')));
const beeld = (f, titel) => (existsSync(`${DIR}/beelden/${f}.png`) ? `<figure><img class="fig" src="${dataUrl(`${DIR}/beelden/${f}.png`)}"><figcaption>${esc(titel)}</figcaption></figure>` : '');
const beelden = `<section class="tekst"><h1>De robot en de cel</h1>
  ${beeld('robot-cel', 'De robotcel: robot, rollenbaan, camera-portaal, hek met lichtschermen, schakelkast en bedienpaneel')}
  ${beeld('robot-pols', 'De robot PR 120 R2700 met de vlakgrijper (3 zuigbalken, ejectors) en het slangenpakket')}
  ${beeld('robot-voor', 'Vooraanzicht: de robot neemt een deur van de band')}
  ${beeld('robot-achter', 'Van achteren: gewichtscompensatie, polsmotoren, aansluitpaneel op de voet')}</section>
<section class="tekst"><h1>De schakelkast</h1>
  ${beeld('kast-dicht', 'Dicht: HMI, noodstop en bediening links, hoofdschakelaar en ventilatie rechts')}
  ${beeld('kast-deur-bediening', 'Bediening van dichtbij')}
  ${beeld('kast-plaat', 'Montageplaat: rij 1 voeding 400 V, rij 2 servoversterkers, rij 3 24 V, veiligheid, I/O, PC, rij 4 relais, rij 5 klemmen')}
  ${beeld('kast-rij1', 'Rij 1: hoofdschakelaar, overspanning, netfilter, netmagneet, installatieautomaten')}
  ${beeld('kast-rij3', 'Rij 2 en 3: servoversterkers, voeding 24 V, buffer, beveiligingen, veiligheidsbesturing, EtherCAT-I/O, switch, PC')}
  ${beeld('kast-klemmen', 'Rij 5: klemmen -X1 tot -X4, Harting -X10, PE-rail')}
  ${beeld('kast-open', 'Deuren open')}</section>`;
const HMI = `${DIR}/hmi/beelden`;
const hmi = `<section class="tekst"><h1>De HMI (aanraakscherm -P10 in de kastdeur)</h1>
  ${['overzicht', 'stukken', 'hand', 'statistiek', 'alarmen', 'onderhoud', 'veiligheid'].map((s) => `<figure><img class="fig" src="${dataUrl(`${HMI}/hmi-${s}.png`)}"><figcaption>${s}</figcaption></figure>`).join('')}</section>`;
const delen = ['README: overzicht, kosten en raad', 'Beelden van de robot, de cel en de kast', 'De HMI', `Schemaset (${schema.length} bladen, A3 liggend)`, 'Berekeningen', 'Grijpen', 'Veiligheid', 'Besturing', 'Eisen'];
const voorblad = `<section class="voor"><p class="klein">Robotcel · versie 1 (2026-11-09)</p><h1>Robotcel: deuren, plinten en planken van de band</h1>
  <p class="sub">Industriële 6-assige robot PR 120 R2700 met vlakgrijper, camera, veiligheidshek en schakelkast met HMI.</p>
  ${existsSync(`${DIR}/beelden/robot-cel.png`) ? `<img class="fig voorfoto" src="${dataUrl(`${DIR}/beelden/robot-cel.png`)}">` : ''}
  <h2>Inhoud</h2><ol>${delen.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></section>`;
const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Robotcel: alles afdrukken</title><style>
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
${hmi}
${schema.join('\n')}
${mdDoc(`${DIR}/docs/Berekeningen.md`, 'rekenblad')}
${mdDoc(`${DIR}/docs/Grijpen.md`, 'grijpen')}
${mdDoc(`${DIR}/docs/Veiligheid.md`, 'veiligheid')}
${mdDoc(`${DIR}/docs/Besturing.md`, 'besturing')}
${mdDoc(`${DIR}/EISEN.md`, 'eisen')}
</body></html>`;
mkdirSync('e2e-out/alles-robot', { recursive: true });
const tmp = resolve('e2e-out/alles-robot/alles.html');
writeFileSync(tmp, html);
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const page = await browser.newPage();
await page.goto(pathToFileURL(tmp).href);
await page.waitForTimeout(1500);
await page.pdf({ path: `${DIR}/Robotcel-alles-afdrukken.pdf`, preferCSSPageSize: true, printBackground: true });
console.log('alles in één pdf:', schema.length, 'schemabladen');
await browser.close();
