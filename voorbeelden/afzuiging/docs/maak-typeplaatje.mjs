// Typeplaatje van de afzuiging (advies Fable 5.2, P2-15): 90 x 45 mm, de versie uit revisie.mjs. Alle tekst blijft binnen
// het label (test: src/qa/typeplaatjeAfzuiging.test.ts schat de breedte ruim: 0,6 x de lettergrootte per teken, vet 0,66).
// Symbolen in SVG getekend: doorgestreepte container (WEEE, EN 50419) en "lees de handleiding" (boek, ISO 7000-0790).
// Geen CE-markering: het is een prototype zonder vrijgave.
// Gebruik: node voorbeelden/afzuiging/docs/maak-typeplaatje.mjs   (schrijft docs/typeplaatje.svg; de PNG maakt
// e2e/tools/schema-afzuiging-pdf.mjs)
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REVISIE } from '../revisie.mjs';

export const LABEL = { b: 90, h: 45, rand: 1.5 }; // mm; rand = de vrije strook langs de kant die de test eist
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** de tekstregels: [x, y, grootte, tekst, { anchor, vet }] */
export const REGELS = [
  [3, 6.2, 3.4, 'Nagelstofafzuiging LB-AFZ', { vet: true }],
  [87, 6.2, 2.6, `versie ${REVISIE.versie}`, { anchor: 'end' }],
  // links van de symbolen (die staan rechts van x = 68, tot y = 23,5)
  [3, 11.8, 2.3, 'Fabrikant: .................................'],
  [3, 15.3, 2.3, 'Adres: .....................................'],
  [3, 18.8, 2.3, 'Serienummer: ..........  Bouwjaar: 20..'],
  [3, 22.3, 2.3, '230 V AC, 50 Hz, 0,6 A (net)'],
  // over de hele breedte
  [3, 25.8, 2.3, '24 V DC, max. 2,6 A, 61 W (ventilator + besturing)'],
  [3, 29.3, 2.3, 'Netadapter klasse I (Mean Well GST90A24-P1M)'],
  [3, 32.8, 2.3, 'Radio 2,4 GHz (ESP-NOW). IP20. Alleen binnen, droog.'],
  [3, 38.2, 2.3, 'PROTOTYPE: niet met klanten gebruiken voor de vrijgave', { vet: true }],
  [3, 42, 2.1, 'Stekker eruit voor het openen van de box. Nooit zonder filter.'],
];

/** de vakken van de symbolen [x, y, b, h] (de test kijkt dat geen tekst erin valt) */
export const SYMBOLEN = { weee: [68, 9.5, 9, 14], handleiding: [78.5, 9.5, 9, 14] };

/** doorgestreepte verrijdbare container met de balk eronder (EN 50419) in het vak [x, y, b, h] */
function weee([x, y, b]) {
  const m = x + b / 2, s = 'stroke="#111" stroke-width="0.4" fill="none"';
  return `<g data-vak="${SYMBOLEN.weee.join(' ')}">
    <path d="M${m - 3},${y + 2.6} L${m + 3},${y + 2.6} L${m + 2.4},${y + 10.2} L${m - 2.4},${y + 10.2} Z" ${s}/>
    <line x1="${m - 3.5}" y1="${y + 1.9}" x2="${m + 3.5}" y2="${y + 1.9}" stroke="#111" stroke-width="0.5"/>
    <path d="M${m - 0.9},${y + 1.9} L${m - 0.9},${y + 1.1} L${m + 0.9},${y + 1.1} L${m + 0.9},${y + 1.9}" ${s}/>
    <circle cx="${m - 1.7}" cy="${y + 10.9}" r="0.65" ${s}/><circle cx="${m + 1.7}" cy="${y + 10.9}" r="0.65" ${s}/>
    <line x1="${m - 4}" y1="${y + 0.7}" x2="${m + 4}" y2="${y + 11.7}" stroke="#111" stroke-width="0.5"/>
    <line x1="${m + 4}" y1="${y + 0.7}" x2="${m - 4}" y2="${y + 11.7}" stroke="#111" stroke-width="0.5"/>
    <rect x="${m - 3.6}" y="${y + 12.4}" width="7.2" height="1.3" fill="#111"/>
  </g>`;
}

/** open boek (ISO 7000-0790, "lees de handleiding") in het vak [x, y, b, h] */
function boek([x, y, b]) {
  const m = x + b / 2, s = 'stroke="#111" stroke-width="0.4" fill="none" stroke-linejoin="round"';
  const lijnen = [0, 1, 2, 3].map((n) => {
    const yy = y + 4.4 + n * 1.6;
    return `<line x1="${m - 3.3}" y1="${yy}" x2="${m - 0.9}" y2="${yy + 0.25}" stroke="#111" stroke-width="0.25"/><line x1="${m + 0.9}" y1="${yy + 0.25}" x2="${m + 3.3}" y2="${yy}" stroke="#111" stroke-width="0.25"/>`;
  }).join('');
  return `<g data-vak="${SYMBOLEN.handleiding.join(' ')}">
    <path d="M${m},${y + 3.4} L${m - 4.2},${y + 2.4} L${m - 4.2},${y + 11.6} L${m},${y + 12.6} Z" ${s}/>
    <path d="M${m},${y + 3.4} L${m + 4.2},${y + 2.4} L${m + 4.2},${y + 11.6} L${m},${y + 12.6} Z" ${s}/>
    ${lijnen}
  </g>`;
}

export function maakTypeplaatje() {
  const { b, h } = LABEL;
  const tekst = REGELS.map(([x, y, size, s, { anchor = 'start', vet = false } = {}]) =>
    `  <text x="${x}" y="${y}" font-size="${size}"${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''}${vet ? ' font-weight="bold"' : ''}>${esc(s)}</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${b}mm" height="${h}mm" viewBox="0 0 ${b} ${h}" font-family="Arial, Helvetica, sans-serif">
  <rect x="0.3" y="0.3" width="${b - 0.6}" height="${h - 0.6}" rx="2" fill="#fff" stroke="#111" stroke-width="0.5"/>
  <line x1="2" y1="8" x2="${b - 2}" y2="8" stroke="#111" stroke-width="0.25"/>
  <line x1="2" y1="34.8" x2="${b - 2}" y2="34.8" stroke="#111" stroke-width="0.25"/>
${tekst.join('\n')}
  ${weee(SYMBOLEN.weee)}
  ${boek(SYMBOLEN.handleiding)}
</svg>
`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const uit = join(dirname(fileURLToPath(import.meta.url)), 'typeplaatje.svg');
  writeFileSync(uit, maakTypeplaatje());
  console.log(`geschreven: ${uit} (versie ${REVISIE.versie})`);
}
