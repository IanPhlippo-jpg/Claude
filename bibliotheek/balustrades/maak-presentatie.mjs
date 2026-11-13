// Bouwt de balustradeconfigurator voor klanten tot één HTML-bestand (three.js en alle code erin), los van de CAD:
// dubbelklikken opent hem in de browser, ook zonder internet. Schrijft naar presentatie/uit/ en, als die map
// meegegeven wordt, naar een eigen map. Gebruik: node bibliotheek/balustrades/maak-presentatie.mjs ["C:\...\Balustrades"]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const HERE = dirname(fileURLToPath(import.meta.url));
const r = await build({ entryPoints: [join(HERE, 'presentatie/app.mjs')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none', logLevel: 'warning' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync(join(HERE, 'presentatie/sjabloon.html'), 'utf8').replace('<script>/*APP*/</script>', () => `<script>${js}</script>`);
const LEESMIJ = `Balustrades
===========

Dubbelklik op Balustrades.html: hij opent in je browser (Edge, Chrome, Firefox of Safari). Er is geen internet nodig.

1. Soort: staal met verticale spijlen, staal horizontaal of plaat, glas met staanders, of glas in een U-profiel; en de stijl.
2. Plaats en vorm: binnen of buiten, recht, met een hoek, U-vorm of langs een trap; de lengtes en de hoogte; het gebruik
   (woning, kantoor, publiek) voor de berekening.
3. Bevestiging: bovenop de vloer of tegen de zijkant, en de handregel.
4. Glas en kleur: het glas, de RAL-kleur en de structuur.
Rechts: of het voldoet aan de norm (NBN B 03-004) en de prijs per strekkende meter naast de marktprijs.
Instellingen: de naam van je zaak, je contact, welke prijs de klant ziet, je uurloon en je marge (op dit toestel bewaard).

Prijzen opgezocht op ${new Date().toISOString().slice(0, 10)}.
`;
const uitMappen = [join(HERE, 'presentatie/uit'), ...process.argv.slice(2)];
for (const d of uitMappen) { mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'Balustrades.html'), html); writeFileSync(join(d, 'LEESMIJ.txt'), LEESMIJ); }
console.log('Balustrades.html', Math.round(html.length / 1024), 'kB ->', uitMappen.join(', '));
