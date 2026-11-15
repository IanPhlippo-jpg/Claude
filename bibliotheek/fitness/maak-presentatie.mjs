// Bouwt de fitnesscatalogus voor klanten tot één HTML-bestand (three.js en alle code erin), los van de CAD:
// dubbelklikken opent hem in de browser, ook zonder internet. Schrijft naar presentatie/uit/ en, als die map meegegeven
// wordt, naar een eigen map. Gebruik: node bibliotheek/fitness/maak-presentatie.mjs ["C:\...\Fitnesstoestellen"]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { TOESTELLEN } from './catalogus.mjs';
import { SOORTEN } from './onderdelen.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const r = await build({ entryPoints: [join(HERE, 'presentatie/app.mjs')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none', logLevel: 'warning' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync(join(HERE, 'presentatie/sjabloon.html'), 'utf8').replace('<script>/*APP*/</script>', () => `<script>${js}</script>`);
const LEESMIJ = `Fitnesstoestellen
=================

Dubbelklik op Fitnesstoestellen.html: hij opent in je browser (Edge, Chrome, Firefox of Safari). Er is geen internet nodig.

Links staan de ${TOESTELLEN.length} toestellen: ${Object.values(SOORTEN).map((s) => `${TOESTELLEN.filter((t) => t.soort === s.id).length} ${s.naam.toLowerCase()}`).join(', ')}.
Zoek op een naam of een oefening (squat, rug, leg press ...) of kies een soort.

1. Kies een toestel: in het midden zie je het in 3D (slepen = draaien, scrollen = zoomen) of in drie aanzichten.
2. Versie: thuis (EN ISO 20957 klasse H) of pro (klasse S, zwaardere profielen).
3. Kleur van het frame (RAL) en van de bekleding.
Rechts: de maten, het oordeel over de veiligheid en de prijs naast de prijs van vergelijkbare toestellen in de winkel.
Instellingen: de naam van je zaak, je contact, welke prijs de klant ziet, je uurloon en je marge (op dit toestel bewaard).
Afdrukken / PDF: een blad voor de klant.

De werkplaatstekeningen, de berekening en de kostprijs staan niet in dit bestand: die vind je in de werkplaatsversie
(de gepubliceerde catalogus, pagina Werkplaats).

Prijzen opgezocht op ${new Date().toISOString().slice(0, 10)}.
`;
const uitMappen = [join(HERE, 'presentatie/uit'), ...process.argv.slice(2)];
for (const d of uitMappen) { mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'Fitnesstoestellen.html'), html); writeFileSync(join(d, 'LEESMIJ.txt'), LEESMIJ); }
console.log('Fitnesstoestellen.html', Math.round(html.length / 1024), 'kB ->', uitMappen.join(', '));
