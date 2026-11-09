// Aansluitschema van de kabeldoos (treinverlichting) zoals EPLAN Electric P8 het afdrukt, volgens IEC/EN 61082-1,
// 60617 en 81346 (zie voorbeelden/lib/eplan.mjs). Aanduidingen volgens ISO/IEC 81346-2: -T voeding en regelaar,
// -F zekeringen, -C condensator, -K besturing (ESP, PWM-print, optocouplers), -Q MOSFET's, -R weerstanden en
// weerstandsnetwerken, -X klemmenstroken, -E de Modelbouwled-bordjes, -W de DC-kabel.
// Potentialen: L+ (12 V na de hoofdzekering), L+1..L+6 (12 V per rij bordjes, na de polyfuse), L5 (5 V), L3 (3,3 V),
// M (0 V). Kruisverwijzing /blad.kolom.
// Gebruik: node voorbeelden/treinverlichting/schema/maak-schema.mjs  (schrijft blad-N.svg en schema.html)
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  X0, X1, T, L, punt, rect, weerstand, condensator, zekering, ptc, klem, nmos, opto, toestel, rail, onderbreking, ref,
  titelblad, inhoudsopgave, klemmenplan, stuklijst, project, schrijf, SOORT, NORMEN,
} from '../../lib/eplan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PROJECT = {
  naam: 'Treinbaan', omschrijving: 'kabeldoos verlichting, versie 1', eigenaar: 'Ian', tekeningnr: 'TRN-E01',
  installatie: '=TRN', installatieNaam: 'verlichting modelbaan', plaats: '+DOOS', plaatsNaam: 'onder de baan',
  datum: '2026-11-08', getekend: 'Phlippo CAD', gecontroleerd: 'Ian', norm: 'IEC 81346', revisie: { index: '1', datum: '2026-11-09', naam: 'PC' },
};
// de bladen (nummers voor de kruisverwijzingen)
const B = { voeding: 3, uit: 4, in: 5, besturing: 6 };
// de ingangen op de ESP32-S3 (firmware/src/hw.h, INGANG_PINNEN)
export const INGANG_GPIO = [1, 2, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 21, 40, 41];
// de rij (1..6) van elk bordje (groep): rij 1 tot 5 drie bordjes, rij 6 één (maak-kabeldoos.mjs, indeling)
const rijVan = (g) => Math.min(6, Math.ceil(g / 3));
const xGroep = (g) => 34 + (g - 1) * 23.2; // blad 4 en 5: de kolom van groep / ingang g
const xRij = (r) => 215 + (r - 1) * 22; // blad 3: de polyfuse van rij r
const RECHTS = X1 - 5;
// PC847: kanaal n (1..4) anode 2n-1, kathode 2n, collector 18-2n, emitter 17-2n
const pc847 = (n) => [String(2 * n - 1), String(2 * n), String(18 - 2 * n), String(17 - 2 * n)];

function voeding() {
  const i = [], yp = 70, ym = 215;
  i.push(toestel(25, 50, 60, 60, '-T1', ['Netadapter (buiten de doos)', 'Mean Well GST90A12-P1M', '230 V AC / 12 V DC, 6,67 A', 'C14-inlaat: netsnoer C13'], [{ x: 60, y: 20, naam: '+' }, { x: 60, y: 45, naam: '−' }]));
  i.push(T(25, 120, '230 V AC alleen in de gekeurde adapter', { size: 2.5 }));
  i.push(L([[85, yp], [118.8, yp]]), L([[85, 95], [100, 95], [100, ym], [118.8, ym]]), T(92, yp - 3, '-W1', { size: 2.8 }), T(92, yp + 4, 'DC-kabel, door de wartel', { size: 2.3 }));
  i.push(klem(120, yp, '-X1', '1'), klem(120, ym, '-X1', '2'));
  i.push(L([[121.2, yp], [135, yp]]), zekering(135, yp, '-F1', 'ATO 7,5 A, 32 V DC'), L([[155, yp], [170, yp]]));
  i.push(L([[121.2, ym], [170, ym]]));
  i.push(rail(yp, 170, RECHTS, 'L+', { naar: `${ref(B.uit, X0)}  ${ref(B.in, X0)}` }), rail(ym, 170, RECHTS, 'M', { naar: `${ref(B.uit, X0)}  ${ref(B.in, X0)}  ${ref(B.besturing, X0)}` }));
  i.push(punt(180, yp), L([[180, yp], [180, 132]]), condensator(180, 132, '-C1', '470 µF / 25 V'), L([[180, 148], [180, ym]]), punt(180, ym));
  // 6 polyfuses naar de rijen
  for (let r = 1; r <= 6; r++) {
    const x = xRij(r);
    i.push(punt(x, yp), L([[x, yp], [x, 92]]), ptc(x, 92, `-F${r + 1}`, '1,1 A'), L([[x, 112], [x, 128.8]]), klem(x, 130, '-X2', String(r)));
    i.push(L([[x, 131.2], [x, 142]]), onderbreking(x, 142, `L+${r}`, ref(B.uit, xGroep(3 * r - 2)), 'onder'));
  }
  i.push(T(215, 160, 'L+1..L+6: naar de + van de bordjes van die rij (doorlussen met de + van de eindklem)', { size: 2.3 }));
  // regelaar
  i.push(punt(350, yp), L([[350, yp], [350, 150]]), toestel(340, 150, 40, 26, '-T2', ['', 'Pololu D24V10F5', '12 V → 5 V, 1 A'], [{ x: 10, y: 0, naam: 'VIN' }, { x: 40, y: 13, naam: 'VOUT' }, { x: 20, y: 26, naam: 'GND' }]));
  i.push(L([[360, 176], [360, ym]]), punt(360, ym), L([[380, 163], [RECHTS, 163]], { w: 0.35 }), onderbreking(RECHTS, 163, 'L5', ref(B.besturing, X0), 'rechts'));
  i.push(punt(250, ym), L([[250, ym], [250, ym - 10], [262, ym - 10], [262, ym]]), punt(262, ym));
  i.push(klem(250, ym - 10, '-X2', '7', { kant: 'links' }), klem(262, ym - 10, '-X2', '8'), T(256, ym + 8, '0 V voor ingangen en sensoren', { anchor: 'middle', size: 2.3 }));
  i.push(T(25, 238, 'Stroom: hoogstens 16 x 0,32 A + 0,07 A = 5,2 A bij bordjes van 0 Ω (docs/Berekeningen.md); met bordjes van 1K: 2,4 A.', { size: 2.5 }));
  return { titel: ['Voeding', '12 V en 5 V'], inhoud: i };
}

function uitgangen() {
  const i = [], ym = 230, yg = 150;
  i.push(rail(ym, X0 + 3, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  i.push(toestel(25, 35, 380, 22, '-K2', ['PWM-print PCA9685, 16 kanalen (I2C 0x40, 1 kHz, 12 bit)', `VCC = L3 ${ref(B.besturing, 180)}, V+ niet gebruikt; OE ← GPIO10 ${ref(B.besturing, 300)}`], []));
  for (let g = 1; g <= 16; g++) {
    const x = xGroep(g);
    i.push(punt(x, 57), T(x + 1.2, 54.5, `LED${g - 1}`, { size: 1.9 }));
    i.push(L([[x, 57], [x, yg], [x + 1, yg]]));
    // gate: 100 kΩ naar M (weerstandsnetwerk -R2 voor de groepen 1..8, -R3 voor 9..16, gemeenschappelijke pin 1)
    const net = g <= 8 ? '-R2' : '-R3';
    i.push(punt(x, 120), L([[x, 120], [x - 5, 120], [x - 5, 160]]), rect(x - 6.2, 160, 2.4, 7, { w2: 0.3 }), L([[x - 5, 167], [x - 5, ym]]), punt(x - 5, ym));
    if (g === 1 || g === 9) i.push(T(x - 7.5, 162, net, { size: 2.4, anchor: 'end' }), T(x - 7.5, 165.4, '100 kΩ', { size: 2.0, anchor: 'end' }));
    i.push(T(x - 3.4, 172, String(((g - 1) % 8) + 2), { size: 1.7 }));
    i.push(nmos(x + 10, yg, `-Q${g}`, '', g === 1));
    // drain naar de klem en het bordje, source naar M
    i.push(L([[x + 12, yg + 9], [x + 12, ym]]), punt(x + 12, ym));
    i.push(L([[x + 12, yg - 9], [x + 12, 107.9]]), klem(x + 12, 106.7, '-X3', String(g)));
    i.push(L([[x + 12, 105.5], [x + 12, 96]]), toestel(x + 6, 76, 12, 20, `-E${g}`, [], [{ x: 6, y: 20, naam: '−' }, { x: 6, y: 0, naam: '+' }]));
    i.push(L([[x + 12, 76], [x + 12, 68]]), T(x + 12, 66.5, `L+${rijVan(g)}`, { anchor: 'middle', size: 2.0 }), T(x + 12, 63.5, ref(B.voeding, xRij(rijVan(g))), { anchor: 'middle', size: 1.8 }));
  }
  i.push(T(25, 238, '-Q1..-Q16: IRLD024 (logic-level N-MOSFET). -R2, -R3: 8 x 100 kΩ (SIP-9) naar M: de groep blijft uit zolang -K2 de uitgang niet stuurt.', { size: 2.5 }));
  i.push(T(25, 244, '-E1..-E16: Modelbouwled "PCB met ingebouwde weerstand" (16 leds, elk met een weerstand in de +). De − van het bordje aan -X3:n, de + aan L+ van zijn rij. De − nooit doorlussen.', { size: 2.5 }));
  return { titel: ['Uitgangen', '16 lichtgroepen'], inhoud: i };
}

function ingangen() {
  const i = [], ym = 230;
  i.push(rail(ym, X0 + 3, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  i.push(rail(32, X0 + 3, RECHTS, 'L+', { van: ref(B.voeding, RECHTS) }));
  i.push(klem(30, 45, '-X4', '17', { kant: 'links' }), klem(42, 45, '-X4', '18'), L([[30, 32], [30, 43.8]]), L([[42, 32], [42, 43.8]]), punt(30, 32), punt(42, 32), T(50, 47, '+12 V voor drukknoppen en sensoren', { size: 2.3 }));
  for (let n = 1; n <= 16; n++) {
    const x = xGroep(n);
    const k = Math.ceil(n / 4), kanaal = ((n - 1) % 4) + 1;
    i.push(klem(x, 62, '-X4', String(n)), T(x, 56, `IN${String(n).padStart(2, '0')}`, { anchor: 'middle', size: 2.2 }));
    i.push(L([[x, 63.2], [x, 70]]), weerstand(x, 70, n === 1 ? '-R4' : n === 9 ? '-R5' : '', n === 1 || n === 9 ? '2,2 kΩ' : ''), L([[x, 90], [x, 104]]));
    i.push(opto(x + 4, 112, kanaal === 1 ? `-K${k + 2}` : '', pc847(kanaal)));
    i.push(L([[x, 120], [x, ym]]), punt(x, ym));
    i.push(L([[x + 9, 104], [x + 9, 96], [x + 14, 96], [x + 14, 132]]), onderbreking(x + 14, 132, `GPIO${INGANG_GPIO[n - 1]}`, ref(B.besturing, 140), 'onder'));
    i.push(L([[x + 9, 120], [x + 9, ym]]), punt(x + 9, ym));
  }
  i.push(T(25, 238, 'Een drukknop tussen +12 V (-X4:17/18) en een ingang; een sensor met een uitgang op 12 V rechtstreeks op de ingang. Actief = de optocoupler trekt de GPIO naar 0 V (pull-up in de ESP).', { size: 2.5 }));
  i.push(T(25, 244, '-K3..-K6: PC847 (4 optocouplers per behuizing, pinnummers bij het symbool); -R4, -R5: 8 x 2,2 kΩ (DIP-16).', { size: 2.5 }));
  return { titel: ['Ingangen', 'knoppen en sensoren'], inhoud: i };
}

function besturing() {
  const i = [], ym = 230;
  i.push(rail(30, X0 + 3, RECHTS, 'L5', { van: ref(B.voeding, RECHTS) }), rail(ym, X0 + 3, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  const pins = [{ x: 0, y: 15, naam: '5V' }, { x: 0, y: 150, naam: 'G' }, { x: 80, y: 15, naam: '3V3' }, { x: 80, y: 40, naam: 'GPIO8 SDA' }, { x: 80, y: 50, naam: 'GPIO9 SCL' }, { x: 80, y: 65, naam: 'GPIO10 OE' }, { x: 80, y: 85, naam: 'GPIO1..21, 40, 41' }, { x: 80, y: 105, naam: 'GPIO38 RGB-led' }];
  i.push(toestel(60, 45, 80, 160, '-K1', ['ESP32-S3-DevKitC-1 v1.1 (N16R8)', 'op de draagprint, 2 x 22 pinnen', 'micro-USB "UART" en "USB"', 'in de rechterwand (flashen)', '', 'wifi-hotspot "Treinbaan"', 'dashboard: 192.168.4.1', '', 'statuslampje GPIO38:', 'groen = wifi aan,', 'rood = -K2 antwoordt niet'], pins));
  i.push(punt(45, 30), L([[45, 30], [45, 60], [60, 60]]), L([[60, 195], [45, 195], [45, ym]]), punt(45, ym));
  i.push(L([[140, 60], [175, 60], [175, 40], [RECHTS, 40]], { w: 0.35 }), onderbreking(RECHTS, 40, 'L3', ref(B.uit, 30), 'rechts'), T(180, 38.5, '3,3 V → VCC van -K2', { size: 2.3 }));
  i.push(L([[140, 85], [300, 85]]), L([[140, 95], [300, 95]]), onderbreking(300, 85, 'SDA', ref(B.uit, 30)), onderbreking(300, 95, 'SCL', ref(B.uit, 30)));
  i.push(L([[140, 110], [300, 110]]), onderbreking(300, 110, 'OE (actief laag)', ref(B.uit, 30)));
  i.push(punt(260, 40), L([[260, 40], [260, 62]]), weerstand(260, 62, '-R1', '10 kΩ'), L([[260, 82], [260, 110]]), punt(260, 110));
  i.push(T(200, 125, '-R1 houdt OE hoog bij reset of flashen: alle groepen uit tot de firmware de kanalen op 0 zet.', { size: 2.3 }));
  i.push(L([[140, 130], [170, 130]]), onderbreking(140, 130, 'IN01..IN16', `${ref(B.in, xGroep(1))} .. ${ref(B.in, xGroep(16))}`, 'links'));
  i.push(T(25, 244, 'I2C van -K1 naar -K2 met de pull-ups op de PCA9685-print (10 kΩ).', { size: 2.5 }));
  return { titel: ['Besturing', 'ESP32-S3'], inhoud: i };
}

export const STUKLIJST = [
  ['-T1', '1', 'Netadapter 12 V DC, 6,67 A (90 W), C14', 'Mean Well GST90A12-P1M'],
  ['-F1', '1', 'Steekzekering ATO 7,5 A, 32 V DC, met printhouder', 'Littelfuse 0287007.5 of gelijk'],
  ['-F2..-F7', '6', 'Polyfuse 1,1 A (een per rij bordjes)', 'Bourns MF-R110'],
  ['-C1', '1', 'Elco 470 µF / 25 V', '—'],
  ['-T2', '1', 'Regelaar 12 → 5 V, 1 A', 'Pololu D24V10F5'],
  ['-K1', '1', 'ESP32-S3-DevKitC-1 v1.1, N16R8', 'Espressif'],
  ['-K2', '1', 'PWM-print 16 kanalen, I2C', 'PCA9685-breakout'],
  ['-Q1..-Q16', '16', 'N-MOSFET logic-level, HVMDIP-4', 'Vishay IRLD024PBF'],
  ['-R2, -R3', '2', 'Weerstandsnetwerk 8 x 100 kΩ, gemeenschappelijk, SIP-9', 'Bourns 4609X-101-104'],
  ['-K3..-K6', '4', 'Optocoupler 4-voudig, DIP-16', 'Sharp PC847'],
  ['-R4, -R5', '2', 'Weerstandsnetwerk 8 x 2,2 kΩ los, DIP-16', 'Bourns 4116R-1-222'],
  ['-R1', '1', 'Weerstand 10 kΩ 0,25 W (pull-up OE)', '—'],
  ['-X1', '1', 'Printklem 2-polig 5,08 (12 V in)', '—'],
  ['-X2', '8', 'Printklem 3,5 (L+1..L+6, 2 x 0 V)', '—'],
  ['-X3', '16', 'Printklem 3,5 (de − van de bordjes)', '—'],
  ['-X4', '20', 'Printklem 3,5 (16 ingangen, 2 x +12 V, 2 x 0 V)', '—'],
  ['-E1..-E16', '16', 'Modelbouwled PCB met ingebouwde weerstand (1K voor 12 V)', 'Modelbouwled.nl'],
  ['-W1', '1', 'DC-kabel van de netadapter, door de wartel M12 x 1,5', '—'],
];

// klemmenplannen: een rij per klem
const KLEMMEN = {
  '-X1': ['voedingsprint: 12 V in', [
    { klem: '1', functie: '+12 V in', kabel: '-W1', extern: '-T1', externAansl: '+', intern: '-F1', internAansl: '1', verwijzing: ref(B.voeding, 120) },
    { klem: '2', functie: '0 V in', kabel: '-W1', extern: '-T1', externAansl: '−', intern: 'M (-C1, -T2)', internAansl: '', verwijzing: ref(B.voeding, 120) },
  ]],
  '-X2': ['voedingsprint: + per rij bordjes', [
    ...[1, 2, 3, 4, 5, 6].map((r) => ({ klem: String(r), functie: `L+${r}: + rij ${r} (R${r}+)`, extern: `-E${3 * r - 2}${r < 6 ? `..-E${3 * r}` : ''}`, externAansl: '+', intern: `-F${r + 1}`, internAansl: '2', verwijzing: ref(B.voeding, xRij(r)) })),
    { klem: '7', functie: '0 V reserve', intern: 'M', verwijzing: ref(B.voeding, 250) },
    { klem: '8', functie: '0 V reserve', intern: 'M', verwijzing: ref(B.voeding, 262) },
  ]],
  '-X3': ['uitgangsprint: − per groep', Array.from({ length: 16 }, (_, k) => ({ klem: String(k + 1), functie: `G${String(k + 1).padStart(2, '0')}−: groep ${k + 1}`, extern: `-E${k + 1}`, externAansl: '−', intern: `-Q${k + 1}`, internAansl: 'D', verwijzing: ref(B.uit, xGroep(k + 1) + 12) }))],
  '-X4': ['ingangsprint: knoppen en sensoren', [
    ...Array.from({ length: 16 }, (_, k) => ({ klem: String(k + 1), functie: `IN${String(k + 1).padStart(2, '0')}: ingang ${k + 1}`, extern: 'knop of sensor', intern: k < 8 ? '-R4' : '-R5', internAansl: String((k % 8) + 1), verwijzing: ref(B.in, xGroep(k + 1)) })),
    { klem: '17', functie: '+12 V voor knoppen', extern: 'knoppen, sensoren', intern: 'L+', verwijzing: ref(B.in, 30) },
    { klem: '18', functie: '+12 V voor knoppen', extern: 'knoppen, sensoren', intern: 'L+', verwijzing: ref(B.in, 42) },
    { klem: '19', functie: '0 V voor sensoren', extern: 'sensoren', intern: 'M', verwijzing: ref(B.in, X0) },
    { klem: '20', functie: '0 V voor sensoren', extern: 'sensoren', intern: 'M', verwijzing: ref(B.in, X0) },
  ]],
};

const schema = [voeding(), uitgangen(), ingangen(), besturing()].map((b) => ({ ...b, soort: SOORT.schema[0], soortNaam: SOORT.schema[1] }));
const klemmen = Object.entries(KLEMMEN).map(([s, [oms, rijen]]) => ({ titel: ['Klemmenplan', s], soort: SOORT.klemmen[0], soortNaam: SOORT.klemmen[1], inhoud: klemmenplan(s, oms, rijen) }));
const stuk = { titel: 'Stuklijst', soort: SOORT.stuk[0], soortNaam: SOORT.stuk[1], inhoud: stuklijst(STUKLIJST) };
const voor = { titel: 'Titelblad', soort: SOORT.titel[0], soortNaam: SOORT.titel[1] };
const inhoud = { titel: 'Inhoudsopgave', soort: SOORT.inhoud[0], soortNaam: SOORT.inhoud[1] };
const alle = [voor, inhoud, ...schema, ...klemmen, stuk];
alle.forEach((b, k) => { b.nr = k + 1; });
voor.inhoud = titelblad(PROJECT, [
  ['Klant', 'eigen gebruik (modelbaan)'], ['Tekeningnummer', PROJECT.tekeningnr], ['Fabrikant', 'zelfbouw'], ['Projectverantwoordelijke', 'Ian'],
  ['Projectstart', '2026-11-08'], ['Projectnaam', 'Treinbaan, kabeldoos verlichting'],
], [
  ['Installatie', '=TRN verlichting modelbaan'], ['Plaats', '+DOOS kabeldoos onder de baan'], ['Voedingsspanning', '230 V AC (in de netadapter) → 12 V DC'],
  ['Stuurspanning', '5 V DC en 3,3 V DC'], ['Beschermingsgraad', 'IP20 (binnen)'], ['Potentialen', 'L+ 12 V, L+1..L+6, L5 5 V, L3 3,3 V, M 0 V'], ['Bouwjaar', '2026'],
], { normen: NORMEN, bladen: alle.length });
inhoud.inhoud = inhoudsopgave(PROJECT, alle);

const svgs = project(PROJECT, alle);
await schrijf(HERE, 'Aansluitschema kabeldoos treinverlichting', svgs);
console.log(`geschreven: blad-1..${svgs.length}.svg en schema.html`);
