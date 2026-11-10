// Bouwt de deurenconfigurator voor klanten tot één HTML-bestand (three.js en alle code erin), dat los van de CAD
// werkt: dubbelklikken opent hem in de browser, ook zonder internet. Schrijft naar presentatie/uit/ en, als die map
// meegegeven wordt, naar een eigen map (bv. Bureaublad\Deurenconfigurator).
// Gebruik: node bibliotheek/taatsdeuren/maak-presentatie.mjs ["C:\Users\...\Deurenconfigurator"]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const HERE = dirname(fileURLToPath(import.meta.url));
const r = await build({ entryPoints: [join(HERE, 'presentatie/app.mjs')], bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none', logLevel: 'warning' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync(join(HERE, 'presentatie/sjabloon.html'), 'utf8').replace('<script>/*APP*/</script>', () => `<script>${js}</script>`);
const LEESMIJ = `Deurenconfigurator
==================

Dubbelklik op Deurenconfigurator.html: hij opent in je browser (Edge, Chrome, Firefox of Safari). Er is geen
internet nodig en er hoeft niets geïnstalleerd te worden. Werkt ook op een laptop of tablet: kopieer dit ene bestand.

Wat je kan doen:
1. Model: 100 stalen deuren, per soort te filteren.
2. Deurgat: breedte, hoogte en de dikte van de muur. De deur en de kamer passen zich meteen aan.
3. Openen: pivot (taats) of verdekte scharnieren, met de scharnierkant links of rechts.
4. Glas: enkel of dubbel glas, altijd veiligheidsglas; helder, extra helder, grijs, brons, mat, geribd, kathedraal of chinchilla.
5. Kleur: de bekendste RAL-kleuren om te poedercoaten, in fijnstructuur, glad mat of zijdeglans.
6. Profiel: automatisch het slankste profiel dat past, of zelf kiezen.

Bovenaan: 3D in de kamer (slepen om rond te kijken, de deur open draaien, muur en vloer kiezen) of de tekening in 2D
met de maten. Onderaan rechts: afdrukken of als PDF bewaren voor de klant, en het beeld opslaan.

Instellingen (knop rechtsboven): de naam van je zaak, je contact, welke prijs de klant ziet (geen, kostprijs, of
prijs excl. of incl. btw), je uurloon en je marge. Ze worden op dit toestel bewaard.

Prijzen: opgezocht op ${new Date().toISOString().slice(0, 10)}; "schatting" in de bronnen betekent dat er geen publieke prijs was.
`;
const uitMappen = [join(HERE, 'presentatie/uit'), ...process.argv.slice(2)];
for (const d of uitMappen) { mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'Deurenconfigurator.html'), html); writeFileSync(join(d, 'LEESMIJ.txt'), LEESMIJ); }
console.log('Deurenconfigurator.html', Math.round(html.length / 1024), 'kB ->', uitMappen.join(', '));
