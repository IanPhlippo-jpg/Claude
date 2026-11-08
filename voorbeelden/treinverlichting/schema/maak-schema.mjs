// Aansluitschema van de kabeldoos (treinverlichting) in EPLAN-stijl: A3-bladen met kader en titelblok, codes volgens
// IEC 81346 (-T voeding, -F zekeringen, -C condensatoren, -A printen, -Q MOSFET's, -U optocouplers, -R weerstanden,
// -X klemmen, -E de Modelbouwled-bordjes); potentialen L+ (12 V, na de hoofdzekering), L+1..L+6 (12 V per rij, na de
// polyfuse), L5 (5 V), L3 (3,3 V) en M (0 V).
// Gebruik: node voorbeelden/treinverlichting/schema/maak-schema.mjs  (schrijft blad-1..6.svg en schema.html)
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { X0, X1, Y1, T, L, punt, rect, weerstand, condensator, zekering, ptc, klem, nmos, opto, toestel, rail, tabel, kader } from '../../lib/eplan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT = { naam: 'Treinbaan', onder: 'kabeldoos verlichting', plaats: '=TREIN +DOOS', plaatsOnder: 'kabeldoos onder de baan', versie: '1', datum: '2026-11-08', bladen: 6 };
const blad = (nr, titel, inhoud) => kader(nr, titel, inhoud, PROJECT);
// de ingangen op de ESP32-S3 (firmware/src/hw.h, INGANG_PINNEN)
export const INGANG_GPIO = [1, 2, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 21, 40, 41];
// de rij (1..6) van elk bordje (groep): rij 1 tot 5 drie bordjes, rij 6 één (maak-kabeldoos.mjs, indeling)
const rijVan = (g) => Math.min(6, Math.ceil(g / 3));

function blad1() {
  const i = [];
  i.push(T(215, 60, 'Treinbaan: kabeldoos verlichting', { anchor: 'middle', size: 12, bold: true }));
  i.push(T(215, 74, 'Aansluitschema', { anchor: 'middle', size: 7 }));
  i.push(T(215, 84, '16 lichtgroepen (Modelbouwled-bordjes) · 16 ingangen · ESP32-S3 met eigen wifi en dashboard · 12 V', { anchor: 'middle', size: 3.6, kleur: '#444' }));
  const inhoud = [['1', 'Titelblad en inhoud'], ['2', 'Voeding: netadapter, hoofdzekering, 6 polyfuses (een per rij), 5 V-regelaar'], ['3', 'Uitgangen: PCA9685, 16 MOSFET\'s, de 16 bordjes'], ['4', 'Ingangen: 16 optocouplers naar de ESP'], ['5', 'Besturing: ESP32-S3, I2C, statuslampje'], ['6', 'Klemmenplan en stuklijst']];
  i.push(T(120, 115, 'Inhoud', { size: 5, bold: true }));
  inhoud.forEach(([n, t], k) => i.push(T(120, 127 + k * 9, `Blad ${n}`, { size: 4 }), T(150, 127 + k * 9, t, { size: 4 })));
  i.push(T(120, 195, 'Leeswijzer', { size: 4, bold: true }));
  ['Codes volgens IEC 81346: -T voeding, -F zekeringen, -C condensatoren, -A printen, -Q MOSFET\'s, -U optocouplers,', '-R weerstanden, -X klemmen, -E de bordjes van Modelbouwled (16 leds elk, met een weerstand per led).',
    'Potentialen: L+ = 12 V na de hoofdzekering, L+1..L+6 = 12 V per rij bordjes (na de polyfuse), L5 = 5 V, L3 = 3,3 V, M = 0 V.',
    'Een groep schakelt de min van zijn bordje (MOSFET naar M); de plus komt van de rail van zijn rij.']
    .forEach((r, k) => i.push(T(120, 205 + k * 6.5, r, { size: 3.2, kleur: '#333' })));
  return blad(1, 'Titelblad', i);
}

function blad2() {
  const i = [], yp = 70, ym = 215;
  i.push(toestel(25, 50, 60, 60, '-T1', ['Netadapter (buiten de doos)', 'Mean Well GST90A12-P1M', '230 V AC / 12 V DC, 6,67 A', 'C14-inlaat: netsnoer C13'], [{ x: 60, y: 20, naam: '+' }, { x: 60, y: 45, naam: '-' }]));
  i.push(T(25, 120, '230 V AC alleen in de gekeurde adapter', { size: 2.6, kleur: '#b42318' }));
  i.push(L([[85, yp], [118, yp]], { w: 0.5, kleur: '#b42318' }), L([[85, 95], [100, 95], [100, ym], [118, ym]], { w: 0.5 }), T(92, yp - 3, '-W1 DC-kabel door de wartel', { size: 2.4 }));
  i.push(klem(120, yp, '-X1', '1'), klem(120, ym, '-X1', '2'));
  i.push(L([[121.3, yp], [135, yp]], { w: 0.5, kleur: '#b42318' }), zekering(135, yp, '-F1', 'steekzekering 7,5 A, 32 V DC'), L([[155, yp], [170, yp]], { w: 0.5, kleur: '#b42318' }));
  i.push(L([[121.3, ym], [170, ym]], { w: 0.5 }));
  i.push(rail(yp, 170, X1 - 5, 'L+ 12 V', '', '/3.1 /4.1'), rail(ym, 170, X1 - 5, 'M 0 V', '', '/3.1 /4.1 /5.1', '#111'));
  i.push(punt(180, yp), L([[180, yp], [180, 132]]), condensator(180, 132, '-C1', '470 µF / 25 V'), L([[180, 148], [180, ym]]), punt(180, ym));
  // 6 polyfuses naar de rijen
  for (let r = 1; r <= 6; r++) {
    const x = 215 + (r - 1) * 22;
    i.push(punt(x, yp), L([[x, yp], [x, 92]]), ptc(x, 92, `-F${r + 1}`, '1,1 A'), L([[x, 112], [x, 128]], { kleur: '#b42318' }), klem(x, 130, '-X2', String(r)));
    i.push(T(x, 140, `L+${r}`, { anchor: 'middle', size: 2.6, kleur: '#b42318' }), T(x, 144, `rij ${r}`, { anchor: 'middle', size: 2.2, kleur: '#444' }), T(x, 148, '/3', { anchor: 'middle', size: 2.2, kleur: '#1d4ed8' }));
  }
  i.push(T(215, 160, 'naar de + van de bordjes van die rij (doorlussen met de + van de eindklem)', { size: 2.4, kleur: '#444' }));
  // regelaar
  i.push(punt(350, yp), L([[350, yp], [350, 150]]), toestel(340, 150, 40, 26, '-T2', ['', 'Pololu D24V10F5', '12 V -> 5 V, 1 A'], [{ x: 10, y: 0, naam: 'VIN' }, { x: 40, y: 13, naam: 'VOUT' }, { x: 20, y: 26, naam: 'GND' }]));
  i.push(L([[360, 176], [360, ym]], { w: 0.45 }), punt(360, ym), L([[380, 163], [X1 - 5, 163]], { kleur: '#d97706', w: 0.5 }), T(384, 161, 'L5 5 V  → /5.1', { size: 2.6, kleur: '#d97706' }));
  i.push(klem(250, ym, '-X2', '7'), klem(262, ym, '-X2', '8'), T(256, ym + 8, '0 V voor ingangen en sensoren', { anchor: 'middle', size: 2.2, kleur: '#444' }));
  i.push(T(25, 235, 'Stroom: hoogstens 16 x 0,32 A + 0,07 A = 5,2 A bij bordjes van 0 Ω (docs/Berekeningen.md); met bordjes van 1K: 2,4 A.', { size: 3, kleur: '#333' }));
  return blad(2, 'Voeding 12 V en 5 V', i);
}

function blad3() {
  const i = [], yp = 25, ym = 230, yg = 150;
  i.push(rail(ym, X0, X1 - 5, 'M 0 V', '/2.8', '', '#111'));
  i.push(toestel(25, 35, 380, 22, '-A2', ['PCA9685 16-kanaals PWM-print (I2C 0x40, 1 kHz, 12 bit)', 'VCC = L3, V+ niet gebruikt; OE ← GPIO10 /5'], []));
  for (let g = 1; g <= 16; g++) {
    const x = 34 + (g - 1) * 23.2;
    i.push(`<circle cx="${x}" cy="57" r="0.9" fill="#111"/>`, T(x + 1.2, 54.5, `LED${g - 1}`, { size: 1.9, kleur: '#222' }));
    // gate: 100 kΩ naar M (weerstandsnetwerk -RN1/-RN2), dan de MOSFET
    i.push(L([[x, 57], [x, yg]], { kleur: '#2a6fd6' }), L([[x, yg], [x + 1, yg]], { kleur: '#2a6fd6' }));
    i.push(punt(x, 120), L([[x, 120], [x - 5, 120], [x - 5, 175]]), `<rect x="${x - 6.2}" y="160" width="2.4" height="7" fill="none" stroke="#111" stroke-width="0.3"/>`, L([[x - 5, 175], [x - 5, ym]]), punt(x - 5, ym));
    i.push(nmos(x + 10, yg, `-Q${g}`, ''));
    // drain naar de klem en het bordje, source naar M
    i.push(L([[x + 12, yg + 9], [x + 12, ym]]), punt(x + 12, ym));
    i.push(L([[x + 12, yg - 9], [x + 12, 108]]), klem(x + 12, 106.7, '-X3', String(g)));
    i.push(L([[x + 12, 105.4], [x + 12, 96]]), rect(x + 6, 76, 12, 20, { streep: '1.5 1', vul: '#fdf4f4' }), T(x + 12, 87, `-E${g}`, { anchor: 'middle', size: 2.4, bold: true }));
    i.push(T(x + 7, 99, '−', { size: 3 }), T(x + 7, 75, '+', { size: 3 }), L([[x + 12, 76], [x + 12, 66]], { kleur: '#b42318' }), T(x + 12, 64.5, `L+${rijVan(g)}`, { anchor: 'middle', size: 2.0, kleur: '#b42318' }));
  }
  i.push(T(25, 236, '-Q1..-Q16: IRLD024 (logic-level N-MOSFET). Weerstanden naar M: -RN1, -RN2 (8 x 100 kΩ, SIP-9): de groep blijft uit zolang de PCA9685 de uitgang niet stuurt.', { size: 2.6, kleur: '#333' }));
  i.push(T(25, 242, '-E1..-E16: Modelbouwled "PCB met ingebouwde weerstand" (16 leds, elk met een weerstand in de +). De − van het bordje aan -X3:n, de + aan L+ van zijn rij (/2). De − nooit doorlussen.', { size: 2.6, kleur: '#333' }));
  return blad(3, 'Uitgangen: 16 lichtgroepen', i);
}

function blad4() {
  const i = [], ym = 230;
  i.push(rail(ym, X0, X1 - 5, 'M 0 V', '/2.8', '', '#111'));
  i.push(rail(32, X0, X1 - 5, 'L+ 12 V', '/2.1', '', '#b42318'));
  i.push(klem(30, 45, '-X4', '17'), klem(42, 45, '-X4', '18'), L([[30, 32], [30, 43.7]], { kleur: '#b42318' }), L([[42, 32], [42, 43.7]], { kleur: '#b42318' }), punt(30, 32), punt(42, 32), T(48, 47, '+12 V voor drukknoppen en sensoren', { size: 2.4, kleur: '#444' }));
  for (let n = 1; n <= 16; n++) {
    const x = 34 + (n - 1) * 23.2;
    i.push(klem(x, 62, '-X4', String(n)), T(x, 56, `in ${n}`, { anchor: 'middle', size: 2.2, bold: true }));
    i.push(L([[x, 63.3], [x, 70]]), weerstand(x, 70, n === 1 ? '-RN3' : '', n === 1 ? '2,2 kΩ' : ''), L([[x, 90], [x, 104]]));
    i.push(opto(x + 4, 112, `-U${Math.ceil(n / 4)}${'abcd'[(n - 1) % 4]}`));
    i.push(L([[x, 120], [x, ym]]), punt(x, ym));
    i.push(L([[x + 9, 104], [x + 9, 96], [x + 14, 96], [x + 14, 140]], { kleur: '#16a34a' }), T(x + 15, 150, `GPIO${INGANG_GPIO[n - 1]}`, { size: 2.2, kleur: '#16a34a', hoek: 90 }));
    i.push(L([[x + 9, 120], [x + 9, ym]]), punt(x + 9, ym));
  }
  i.push(T(25, 242, 'Een drukknop tussen +12 V (-X4:17/18) en een ingang; een sensor met een uitgang op 12 V rechtstreeks op de ingang. Actief = de optocoupler trekt de GPIO naar 0 V (pull-up in de ESP).', { size: 2.6, kleur: '#333' }));
  i.push(T(25, 247, '-U1..-U4: PC847 (4 optocouplers per behuizing); -RN3, -RN4: 8 x 2,2 kΩ (DIP-16). De GPIO\'s naar -A1 /5.', { size: 2.6, kleur: '#333' }));
  return blad(4, 'Ingangen: knoppen en sensoren', i);
}

function blad5() {
  const i = [], ym = 230;
  i.push(rail(30, X0, X1 - 5, 'L5 5 V', '/2.8', '', '#d97706'), rail(ym, X0, X1 - 5, 'M 0 V', '/2.8', '', '#111'));
  const pins = [{ x: 0, y: 15, naam: '5V' }, { x: 0, y: 150, naam: 'G' }, { x: 80, y: 15, naam: '3V3' }, { x: 80, y: 40, naam: 'GPIO8  SDA' }, { x: 80, y: 50, naam: 'GPIO9  SCL' }, { x: 80, y: 65, naam: 'GPIO10  OE' }, { x: 80, y: 85, naam: 'GPIO 1..21, 40, 41: ingangen /4' }, { x: 80, y: 105, naam: 'GPIO38  RGB-led (status)' }];
  i.push(toestel(60, 45, 80, 160, '-A1', ['ESP32-S3-DevKitC-1 v1.1 (N16R8)', 'op de draagprint, 2 x 22 pinnen', 'micro-USB "UART" en "USB"', 'in de rechterwand (flashen)', '', 'wifi-hotspot "Treinbaan"', 'dashboard: 192.168.4.1'], pins));
  i.push(punt(45, 30), L([[45, 30], [45, 60], [60, 60]], { kleur: '#d97706', w: 0.45 }), L([[60, 195], [45, 195], [45, ym]], { w: 0.45 }), punt(45, ym));
  i.push(L([[140, 60], [175, 60], [175, 40], [X1 - 5, 40]], { kleur: '#7c3aed', w: 0.5 }), T(180, 38.5, 'L3 3,3 V → VCC -A2 /3', { size: 2.6, kleur: '#7c3aed' }));
  i.push(L([[140, 85], [300, 85]], { kleur: '#7c3aed' }), L([[140, 95], [300, 95]], { kleur: '#7c3aed' }), T(305, 86, 'SDA → -A2 /3', { size: 2.5, kleur: '#7c3aed' }), T(305, 96, 'SCL → -A2 /3', { size: 2.5, kleur: '#7c3aed' }));
  i.push(L([[140, 110], [300, 110]], { kleur: '#2a6fd6' }), T(305, 111, 'OE → -A2 /3 (actief laag)', { size: 2.5, kleur: '#2a6fd6' }));
  i.push(punt(260, 40), L([[260, 40], [260, 62]]), weerstand(260, 62, '-R1', '10 kΩ'), L([[260, 82], [260, 110]]), punt(260, 110));
  i.push(T(200, 125, '-R1 houdt OE hoog bij reset of flashen: alle groepen uit tot de firmware de kanalen op 0 zet.', { size: 2.4, kleur: '#444' }));
  i.push(T(25, 242, 'I2C van -A1 naar -A2 met de pull-ups op de PCA9685-print (10 kΩ). Statuslampje GPIO38: groen = wifi aan, rood = -A2 antwoordt niet.', { size: 2.6, kleur: '#333' }));
  return blad(5, 'Besturing: ESP32-S3', i);
}

export const STUKLIJST = [
  ['-T1', '1', 'Netadapter 12 V DC, 6,67 A (90 W), C14', 'Mean Well GST90A12-P1M'],
  ['-F1', '1', 'Steekzekering ATO 7,5 A, 32 V DC, met printhouder', 'Littelfuse 0287007.5 of gelijk'],
  ['-F2..-F7', '6', 'Polyfuse 1,1 A (een per rij bordjes)', 'Bourns MF-R110'],
  ['-C1', '1', 'Elco 470 µF / 25 V', '—'],
  ['-T2', '1', 'Regelaar 12 -> 5 V, 1 A', 'Pololu D24V10F5'],
  ['-A1', '1', 'ESP32-S3-DevKitC-1 v1.1, N16R8', 'Espressif'],
  ['-A2', '1', 'PWM-print 16 kanalen, I2C', 'PCA9685-breakout'],
  ['-Q1..-Q16', '16', 'N-MOSFET logic-level, HVMDIP-4', 'Vishay IRLD024PBF'],
  ['-RN1, -RN2', '2', 'Weerstandsnetwerk 8 x 100 kΩ, SIP-9', 'Bourns 4609X-101-104'],
  ['-U1..-U4', '4', 'Optocoupler 4-voudig, DIP-16', 'Sharp PC847'],
  ['-RN3, -RN4', '2', 'Weerstandsnetwerk 8 x 2,2 kΩ los, DIP-16', 'Bourns 4116R-1-222'],
  ['-R1', '1', 'Weerstand 10 kΩ 0,25 W (pull-up OE)', '—'],
  ['-X1', '1', 'Printklem 2-polig 5,08 (12 V in)', '—'],
  ['-X2', '8', 'Printklem 3,5 (L+1..L+6, 2 x 0 V)', '—'],
  ['-X3', '16', 'Printklem 3,5 (de − van de bordjes)', '—'],
  ['-X4', '20', 'Printklem 3,5 (16 ingangen, 2 x +12 V, 2 x 0 V)', '—'],
  ['-E1..-E16', '16', 'Modelbouwled PCB met ingebouwde weerstand (1K voor 12 V)', 'Modelbouwled.nl'],
  ['-W1', '1', 'Wartel M12 x 1,5 voor de DC-kabel', '—'],
];
export const KLEMMEN = [
  ['-X1', '1', '+12 V', '-F1', 'DC-kabel adapter (rood)'],
  ['-X1', '2', '0 V', 'M', 'DC-kabel adapter (zwart)'],
  ...[1, 2, 3, 4, 5, 6].map((r) => ['-X2', String(r), `L+${r}`, `-F${r + 1}`, `+ van de bordjes in rij ${r}`]),
  ['-X2', '7, 8', '0 V', 'M', 'reserve'],
  ['-X3', '1..16', '− van groep n', '-Q1..-Q16 drain', '− van bordje -E1..-E16'],
  ['-X4', '1..16', 'ingang n', '-RN3/-RN4, -U1..-U4', 'knop of sensor'],
  ['-X4', '17, 18', '+12 V', 'L+', 'de andere kant van de knoppen, voeding sensoren'],
  ['-X4', '19, 20', '0 V', 'M', 'voeding sensoren'],
];
function blad6() {
  return blad(6, 'Klemmenplan en stuklijst', [
    T(X0, 22, 'Klemmenplan', { size: 4, bold: true }), tabel(X0, 26, [['Klem', 18], ['Pool', 16], ['Wat', 30], ['Intern', 40], ['Extern', 70]], KLEMMEN, 6),
    T(X0 + 185, 22, 'Stuklijst', { size: 4, bold: true }), tabel(X0 + 185, 26, [['Code', 22], ['Aantal', 14], ['Omschrijving', 105], ['Type', 60]], STUKLIJST, 6),
  ]);
}

const bladen = [blad1(), blad2(), blad3(), blad4(), blad5(), blad6()];
bladen.forEach((svg, k) => writeFileSync(join(HERE, `blad-${k + 1}.svg`), svg));
writeFileSync(join(HERE, 'schema.html'), `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Aansluitschema kabeldoos treinverlichting</title>
<style>@page { size: A3 landscape; margin: 0 } body { margin: 0 } .blad { width: 420mm; height: 297mm; page-break-after: always; overflow: hidden } .blad svg { width: 420mm; height: 297mm; display: block }</style></head>
<body>${bladen.map((s) => `<div class="blad">${s.replace(/width="420mm" height="297mm" /, '')}</div>`).join('\n')}</body></html>`);
console.log(`geschreven: blad-1..${bladen.length}.svg en schema.html`);
