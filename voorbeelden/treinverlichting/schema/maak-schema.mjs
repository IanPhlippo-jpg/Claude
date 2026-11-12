// Aansluitschema van de kabeldoos (treinverlichting) zoals EPLAN Electric P8 het afdrukt, volgens IEC/EN 61082-1,
// 60617 en 81346 (zie voorbeelden/lib/eplan.mjs). Aanduidingen volgens ISO/IEC 81346-2: -T voeding en regelaar,
// -F zekeringen en polyfuses, -C condensator, -K besturing (ESP, PWM-print, optocouplers), -Q MOSFET's, -R weerstanden,
// -X klemmen en de DC-bus, -E de Modelbouwled-bordjes, -U de adapterprintjes, -W de kabel van de netadapter.
// Versie 2 (advies Fable 5.2, 2026-11-12): DC-bus in de wand, P-MOSFET tegen ompolen, polyfuse per groep (0,5 A) in
// plaats van per rij, MOSFET's AO3400A (gespecificeerd bij 2,5 V) op adapterprintjes in voetjes, eigen polyfuse voor de
// +12 V van de knoppen, ingangen met AC-optocouplers (LTV-844) en per 4 ingangen een COM-klem (contact, PNP en NPN),
// pull-up van OE 1 kΩ, de 0 V-retour van de uitgangen op een eigen klem (-X3:17).
// Potentialen: J+ (12 V van de DC-bus), L+ (12 V na zekering en ompoolbeveiliging), L5 (5 V), L3 (3,3 V), M (0 V).
// Kruisverwijzing /blad.kolom. De indeling van de gaatjesprints staat in ../opbouw.mjs (opbouwtekeningen TRN-10..13).
// Gebruik: node voorbeelden/treinverlichting/schema/maak-schema.mjs  (schrijft blad-N.svg en schema.html)
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  X0, X1, T, L, punt, rect, weerstand, condensator, zekering, ptc, klem, nmos, pmos, toestel, rail, onderbreking, ref,
  titelblad, inhoudsopgave, klemmenplan, stuklijst, project, schrijf, SOORT, NORMEN,
} from '../../lib/eplan.mjs';
import { INGANG_GPIO } from '../opbouw.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PROJECT = {
  naam: 'Treinbaan', omschrijving: 'kabeldoos verlichting, versie 2', eigenaar: 'Ian', tekeningnr: 'TRN-E01',
  installatie: '=TRN', installatieNaam: 'verlichting modelbaan', plaats: '+DOOS', plaatsNaam: 'onder de baan',
  datum: '2026-11-08', getekend: 'Phlippo CAD', gecontroleerd: 'Ian', norm: 'IEC 81346', revisie: { index: '2', datum: '2026-11-12', naam: 'PC' },
};
export { INGANG_GPIO };
// de bladen (nummers voor de kruisverwijzingen)
const B = { voeding: 3, uit: 4, in: 5, besturing: 6 };
const xGroep = (g) => 34 + (g - 1) * 23.2; // blad 4 en 5: de kolom van groep / ingang g
const xRij = (r) => 215 + (r - 1) * 22; // blad 3: de klem van rij r
const RECHTS = X1 - 5;
// LTV-844: kanaal n (1..4) led 2n-1 en 2n (AC: twee leds tegen elkaar), collector 18-2n, emitter 17-2n
const ltv = (n) => [String(2 * n - 1), String(2 * n), String(18 - 2 * n), String(17 - 2 * n)];
// de klemmen van de ingangsprint (opbouw.mjs): IN1..IN4, COM1, IN5..IN8, COM2, ..., +12 V, +12 V, 0 V, 0 V
export const X4 = [];
for (let k = 0; k < 4; k++) { for (let ch = 1; ch <= 4; ch++) X4.push(`IN${4 * k + ch}`); X4.push(`COM${k + 1}`); }
X4.push('+12V', '+12V', '0V', '0V');
const x4 = (naam, i = 0) => String(X4.indexOf(naam) + 1 + i);

/** optocoupler met AC-ingang (twee leds tegen elkaar, IEC 60617-05-04): zoals opto() in eplan.mjs */
function optoAC(x, y, code, pins) {
  const Z = '#000', led = (cx, op) => {
    const a = op ? [[cx - 1.6, y + 1.5], [cx + 1.6, y + 1.5], [cx, y - 1.5]] : [[cx - 1.6, y - 1.5], [cx + 1.6, y - 1.5], [cx, y + 1.5]];
    return `<polygon points="${a.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${Z}" stroke-width="0.35"/>` + L([[cx - 1.6, op ? y - 1.5 : y + 1.5], [cx + 1.6, op ? y - 1.5 : y + 1.5]], { w: 0.35 });
  };
  return [
    rect(x - 9, y - 6, 17, 12, { streep: '6 1 1 1', w2: 0.25 }),
    L([[x - 4, y - 8], [x - 4, y - 3.5], [x - 6, y - 3.5], [x - 6, y + 3.5], [x - 4, y + 3.5], [x - 4, y + 8]]), L([[x - 4, y - 3.5], [x - 2, y - 3.5], [x - 2, y + 3.5], [x - 4, y + 3.5]]),
    led(x - 6, false), led(x - 2, true),
    L([[x - 0.3, y - 1.5], [x + 1.3, y - 0.5]], { w: 0.25 }), L([[x - 0.3, y + 0.5], [x + 1.3, y + 1.5]], { w: 0.25 }),
    L([[x + 2.5, y - 3], [x + 2.5, y + 3]], { w: 0.5 }), L([[x + 2.5, y - 1.5], [x + 5, y - 4], [x + 5, y - 8]]), L([[x + 2.5, y + 1.5], [x + 5, y + 4], [x + 5, y + 8]]),
    code ? T(x - 10, y - 7, code, { size: 2.4, anchor: 'end' }) : '',
    T(x - 5, y - 6.6, pins[0], { size: 1.7, anchor: 'end' }), T(x - 5, y + 8.2, pins[1], { size: 1.7, anchor: 'end' }), T(x + 6, y - 6.6, pins[2], { size: 1.7 }), T(x + 6, y + 8.2, pins[3], { size: 1.7 }),
  ].join('');
}

function voeding() {
  const i = [], yp = 70, ym = 215;
  i.push(toestel(25, 50, 55, 60, '-T1', ['Netadapter (buiten de doos)', 'Mean Well GST90A12-P1M', '230 V AC / 12 V DC, 6,67 A', 'stekker 5,5 x 2,5, + in het midden'], [{ x: 55, y: 20, naam: '+' }, { x: 55, y: 45, naam: '−' }]));
  i.push(T(25, 120, '230 V AC alleen in de gekeurde adapter', { size: 2.5 }));
  // de kabel van de adapter met zijn stekker in de DC-bus -X5 (linkerwand)
  i.push(L([[80, yp], [92.8, yp]]), L([[80, 95], [86, 95], [86, ym], [92.8, ym]]), T(82, yp - 3, '-W1', { size: 2.8 }), T(82, yp + 4, 'kabel adapter', { size: 2.2 }));
  i.push(klem(94, yp, '-X5', '1 (pen)'), klem(94, ym, '-X5', '2 (huls)'), T(94, yp - 9, 'DC-bus 5,5 x 2,5, 8 A', { size: 2.2, anchor: 'middle' }));
  i.push(L([[95.2, yp], [118.8, yp]]), L([[95.2, ym], [118.8, ym]]), T(104, yp - 1.5, 'J+', { size: 2.2 }));
  i.push(klem(120, yp, '-X1', '1'), klem(120, ym, '-X1', '2'));
  i.push(L([[121.2, yp], [130, yp]]), zekering(130, yp, '-F1', 'ATO 7,5 A, 32 V DC'), L([[150, yp], [160, yp], [160, 98], [178, 98]]));
  // P-MOSFET in de + tegen ompolen: drain aan de ingang, source aan L+; de gate met 10 kΩ aan M (UGS = −12 V: aan)
  i.push(pmos(175, 86, '-Q17', 'IRF4905'), T(186, 105, 'ompoolbeveiliging', { size: 2.0 }));
  i.push(L([[178, 74], [178, yp], [200, yp]]), L([[163, 86], [155, 86], [155, 150]]), weerstand(155, 150, '-R34', '10 kΩ'), L([[155, 170], [155, ym]]), punt(155, ym));
  i.push(L([[121.2, ym], [200, ym]]));
  i.push(rail(yp, 200, RECHTS, 'L+', { naar: `${ref(B.uit, X0)}  ${ref(B.in, X0)}` }), rail(ym, 200, RECHTS, 'M', { naar: `${ref(B.uit, X0)}  ${ref(B.in, X0)}  ${ref(B.besturing, X0)}` }));
  i.push(punt(190, yp), L([[190, yp], [190, 132]]), condensator(190, 132, '-C1', '470 µF / 25 V'), L([[190, 148], [190, ym]]), punt(190, ym));
  // de + per rij bordjes (zonder polyfuse: elke groep heeft er nu een aan zijn −, blad 4)
  for (let r = 1; r <= 6; r++) {
    const x = xRij(r) + 18;
    i.push(punt(x, yp), L([[x, yp], [x, 118.8]]), klem(x, 120, '-X2', String(r)));
    i.push(L([[x, 121.2], [x, 136]]), onderbreking(x, 136, `R${r}+`, ref(B.uit, xGroep(3 * r - 2)), 'onder'));
  }
  i.push(T(233, 147, 'R1+..R6+: de + van de bordjes per rij (doorlussen met de eindklem)', { size: 2.3 }));
  // +12 V en 0 V naar de ingangsprint, 0 V-retour van de uitgangsprint
  i.push(punt(370, yp), L([[370, yp], [370, 98.8]]), klem(370, 100, '-X2', '7'), L([[370, 101.2], [370, 110]]), onderbreking(370, 110, 'L+ in', ref(B.in, 40), 'onder'));
  i.push(punt(390, ym), L([[390, ym], [390, 191.2]]), klem(390, 190, '-X2', '8'), L([[390, 188.8], [390, 180]]), onderbreking(390, 180, 'M in', ref(B.in, 40), 'boven'));
  i.push(punt(130, ym), L([[130, ym], [130, 196.2]]), klem(130, 195, '-X1', '3', { kant: 'links' }), L([[130, 193.8], [130, 186]]), onderbreking(130, 186, 'M retour', ref(B.uit, 395), 'boven'), T(134, 190, '0,75 mm², tot 5,2 A', { size: 2.0 }));
  // regelaar op de draagprint van de ESP
  i.push(punt(345, yp), L([[345, yp], [345, 155]]), toestel(335, 155, 40, 26, '-T2', ['', 'Pololu D24V10F5', '12 V → 5 V (draagprint)'], [{ x: 10, y: 0, naam: 'VIN' }, { x: 40, y: 13, naam: 'VOUT' }, { x: 20, y: 26, naam: 'GND' }]));
  i.push(L([[355, 181], [355, ym]]), punt(355, ym), L([[375, 168], [RECHTS, 168]], { w: 0.35 }), onderbreking(RECHTS, 168, 'L5', ref(B.besturing, X0), 'rechts'));
  i.push(T(25, 236, 'Stroom: hoogstens 16 x 0,32 A + 0,07 A = 5,2 A (bordjes van 0 Ω), met 1K-bordjes 2,4 A. -F1 7,5 A beschermt alleen de print en de draden tot -X2:', { size: 2.4 }));
  i.push(T(25, 241, 'een groep heeft zijn eigen polyfuse 0,5 A (-F2..-F17, blad 4), de knoppen en sensoren -F18 0,3 A (blad 5). -Q17: verkeerd om aangesloten = geen stroom.', { size: 2.4 }));
  return { titel: ['Voeding', '12 V en 5 V'], inhoud: i };
}

function uitgangen() {
  const i = [], ym = 230, yg = 160;
  i.push(rail(ym, X0 + 3, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  i.push(toestel(25, 28, 380, 18, '-K2', ['PWM-print PCA9685, 16 kanalen (I2C 0x40, 1 kHz, 12 bit), op 4 afstandsbussen boven de uitgangsprint', `VCC = L3 ${ref(B.besturing, 180)}, V+ niet gebruikt; OE ← GPIO10 ${ref(B.besturing, 300)}, 1 kΩ pull-up -R1`], []));
  for (let g = 1; g <= 16; g++) {
    const x = xGroep(g), r = Math.min(6, Math.ceil(g / 3));
    i.push(punt(x, 50), T(x + 1.2, 49, `LED${g - 1}`, { size: 1.9 }));
    i.push(L([[x, 50], [x, yg], [x + 1, yg]]));
    // gate: 100 kΩ naar M (1206 op de koperzijde, tussen G en S)
    i.push(punt(x, 176), L([[x, 176], [x - 5, 176], [x - 5, 184]]), rect(x - 6.2, 184, 2.4, 7, { w2: 0.3 }), L([[x - 5, 191], [x - 5, ym]]), punt(x - 5, ym));
    i.push(T(x - 7.2, 189, `-R${g + 1}`, { size: 1.8, anchor: 'end' }));
    i.push(nmos(x + 10, yg, `-Q${g}`, '', g === 1));
    i.push(L([[x + 12, yg + 9], [x + 12, ym]]), punt(x + 12, ym));
    // drain - polyfuse - klem - bordje - L+ van zijn rij
    i.push(L([[x + 12, yg - 9], [x + 12, 132]]), ptc(x + 12, 112, '', ''), T(x + 14, 128, `-F${g + 1}`, { size: 1.8 }));
    i.push(L([[x + 12, 112], [x + 12, 101.2]]), klem(x + 12, 100, '-X3', String(g)));
    i.push(L([[x + 12, 98.8], [x + 12, 88]]), toestel(x + 6, 68, 12, 20, `-E${g}`, [], [{ x: 6, y: 20, naam: '−' }, { x: 6, y: 0, naam: '+' }]));
    i.push(L([[x + 12, 68], [x + 12, 62]]), T(x + 12, 60.5, `R${r}+`, { anchor: 'middle', size: 2.0 }), T(x + 12, 57.5, ref(B.voeding, xRij(r) + 18), { anchor: 'middle', size: 1.8 }));
  }
  // de 0 V-retour van de uitgangsprint: eigen klem, 0,75 mm² naar -X1:3
  i.push(klem(400, 210, '-X3', '17', { kant: 'links' }), L([[400, 211.2], [400, ym]]), punt(400, ym), L([[400, 208.8], [400, 200]]), onderbreking(400, 200, 'M', ref(B.voeding, 130), 'boven'));
  i.push(T(25, 238, '-Q1..-Q16: AO3400A (N-MOSFET, R(on) ≤ 48 mΩ bij UGS = 2,5 V), per 2 op een adapterprintje -U1..-U8 (DA-SOT23-3-X2) in een IC-voet DIP-8. -R2..-R17: 100 kΩ (1206).', { size: 2.4 }));
  i.push(T(25, 243, '-F2..-F17: polyfuse 0,5 A (MF-MSMF050/24X) per groep: een kortsluiting op een bordje of zijn draad raakt de MOSFET niet. -E1..-E16: Modelbouwled-bordjes; de − nooit doorlussen.', { size: 2.4 }));
  i.push(T(25, 248, '-X3:17 (0 V-retour, tot 5,2 A) met 0,75 mm² naar -X1:3; op de print een blanke draad Ø1,0 (0,79 mm²) langs de sources. -X3:18 reserve (0 V).', { size: 2.4 }));
  return { titel: ['Uitgangen', '16 lichtgroepen'], inhoud: i };
}

// blad 5: elke klem van -X4 een eigen kolom, in de volgorde van de print (IN1..IN4, COM1, IN5, ...)
const xIn = (naam) => 34 + X4.indexOf(naam) * 19.2;
function ingangen() {
  const i = [], ym = 224;
  i.push(rail(ym, X0 + 3, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  // +12 V voor knoppen en sensoren met een eigen polyfuse; 0 V
  i.push(onderbreking(X0 + 3, 24, 'L+', ref(B.voeding, 370), 'links'), L([[X0 + 3, 24], [150, 24], [150, 26]]), ptc(150, 26, '-F18', '0,3 A'), L([[150, 46], [150, 48.8]]));
  i.push(klem(150, 50, '-X4', x4('+12V')), L([[150, 51.2], [150, 53], [168, 53], [168, 51.2]]), punt(150, 53), klem(168, 50, '-X4', x4('+12V', 1)), T(178, 47, '+12 V voor knoppen en sensoren', { size: 2.3 }));
  i.push(klem(250, 50, '-X4', x4('0V')), klem(268, 50, '-X4', x4('0V', 1)), L([[250, 51.2], [250, 53], [268, 53], [268, 51.2]]), punt(259, 53), L([[259, 53], [259, 43]]), onderbreking(259, 43, 'M', `${ref(B.voeding, 390)}`, 'boven'), T(278, 47, '0 V voor sensoren', { size: 2.3 }));
  for (let k = 0; k < 4; k++) {
    const xs = [1, 2, 3, 4].map((ch) => xIn(`IN${4 * k + ch}`)), xc = xIn(`COM${k + 1}`);
    for (let ch = 1; ch <= 4; ch++) {
      const n = 4 * k + ch, x = xs[ch - 1];
      i.push(klem(x, 64, '-X4', x4(`IN${n}`)), T(x, 59, `IN${String(n).padStart(2, '0')}`, { anchor: 'middle', size: 2.2 }));
      i.push(L([[x, 65.2], [x, 72]]), weerstand(x, 72, `-R${17 + n}`, n === 1 ? '2,2 kΩ' : ''), L([[x, 92], [x, 104]]));
      i.push(optoAC(x + 4, 112, ch === 1 ? `-K${k + 3}` : '', ltv(ch)));
      i.push(L([[x, 120], [x, 132]]), punt(x, 132));
      i.push(L([[x + 9, 104], [x + 9, 98], [x + 13, 98], [x + 13, 140]]), onderbreking(x + 13, 140, `GPIO${INGANG_GPIO[n - 1]}`, ref(B.besturing, 140), 'onder'));
      i.push(L([[x + 9, 120], [x + 9, ym]]), punt(x + 9, ym));
    }
    // de COM van deze 4 ingangen: aan 0 V (contacten, PNP) of aan +12 V (NPN), met een draadje aan de klemmen
    i.push(L([[xs[0], 132], [xc, 132], [xc, 65.2]]), klem(xc, 64, '-X4', x4(`COM${k + 1}`)), T(xc, 59, `COM${k + 1}`, { anchor: 'middle', size: 2.2 }));
  }
  i.push(T(25, 233, 'Contact of PNP-sensor (schakelt +12 V): COM aan 0 V (-X4:23/24), de knop tussen +12 V (-X4:21/22) en IN, de uitgang van de sensor aan IN.', { size: 2.4 }));
  i.push(T(25, 238, 'NPN-sensor, hall of reed naar 0 V (schakelt 0 V): COM aan +12 V, de uitgang van de sensor aan IN. Per 4 ingangen (één COM) één soort. Actief = de optocoupler', { size: 2.4 }));
  i.push(T(25, 243, 'trekt de GPIO naar 0 V (pull-up in de ESP). -K3..-K6: LTV-844 (4 x AC-ingang, twee leds tegen elkaar: ook tegen ompolen), -R18..-R33: 2,2 kΩ (1206).', { size: 2.4 }));
  return { titel: ['Ingangen', 'knoppen en sensoren'], inhoud: i };
}

function besturing() {
  const i = [], ym = 230;
  i.push(rail(30, X0 + 3, RECHTS, 'L5', { van: ref(B.voeding, RECHTS) }), rail(ym, X0 + 3, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  const pins = [{ x: 0, y: 15, naam: '5V' }, { x: 0, y: 150, naam: 'G' }, { x: 80, y: 15, naam: '3V3' }, { x: 80, y: 40, naam: 'GPIO8 SDA' }, { x: 80, y: 50, naam: 'GPIO9 SCL' }, { x: 80, y: 65, naam: 'GPIO10 OE' }, { x: 80, y: 85, naam: 'GPIO1..21, 40, 41' }, { x: 80, y: 105, naam: 'GPIO38 RGB-led' }, { x: 80, y: 120, naam: 'GPIO0 BOOT' }];
  i.push(toestel(60, 45, 80, 160, '-K1', ['ESP32-S3-DevKitC-1 v1.1 (N16R8)', 'op de draagprint, 2 x 22 pinnen', '2 x micro-USB "UART" en "USB"', 'in de rechterwand (flashen)', '', 'wifi-hotspot "Treinbaan"', '+ thuisnet (STA), treinbaan.local', 'dashboard: 192.168.4.1', '', 'statuslampje GPIO38:', 'groen = wifi aan,', 'rood = -K2 antwoordt niet', 'BOOT 5 s: wachtwoord terug'], pins));
  i.push(punt(45, 30), L([[45, 30], [45, 60], [60, 60]]), L([[60, 195], [45, 195], [45, ym]]), punt(45, ym));
  i.push(L([[140, 60], [175, 60], [175, 40], [RECHTS, 40]], { w: 0.35 }), onderbreking(RECHTS, 40, 'L3', ref(B.uit, 30), 'rechts'), T(180, 38.5, '3,3 V → VCC van -K2', { size: 2.3 }));
  i.push(L([[140, 85], [300, 85]]), L([[140, 95], [300, 95]]), onderbreking(300, 85, 'SDA', ref(B.uit, 30)), onderbreking(300, 95, 'SCL', ref(B.uit, 30)));
  i.push(L([[140, 110], [300, 110]]), onderbreking(300, 110, 'OE (actief laag)', ref(B.uit, 30)));
  i.push(punt(260, 40), L([[260, 40], [260, 62]]), weerstand(260, 62, '-R1', '1 kΩ'), L([[260, 82], [260, 110]]), punt(260, 110));
  i.push(T(200, 125, '-R1 houdt OE hoog bij reset of flashen: alle groepen uit tot de firmware de kanalen op 0 zet.', { size: 2.3 }));
  i.push(T(200, 130, '1 kΩ (niet 10 kΩ): de PCA9685-print trekt OE zelf laag (Adafruit: "pulled low by default"); met 10 kΩ', { size: 2.3 }));
  i.push(T(200, 135, 'tegen 10 kΩ zou OE op 1,65 V blijven hangen. Meetpunt in het meetblad: OE ≥ 2,5 V bij reset.', { size: 2.3 }));
  i.push(L([[140, 130], [170, 130]]), onderbreking(140, 130, 'IN01..IN16', `${ref(B.in, xIn('IN1'))} .. ${ref(B.in, xIn('IN16'))}`, 'links'));
  i.push(T(200, 160, 'Uitbreiden tot 32 groepen: een tweede PCA9685 op 0x41 (A0 aan 3,3 V), SDA, SCL, OE, VCC en GND parallel,', { size: 2.3 }));
  i.push(T(200, 165, 'en een tweede uitgangsprint; firmware bouwen met -DTREIN_GROEPEN=32 (firmware/README.md). Vrije GPIO: 11, 39, 42, 47, 48.', { size: 2.3 }));
  i.push(T(25, 244, 'I2C van -K1 naar -K2 met de pull-ups op de PCA9685-print (10 kΩ).', { size: 2.5 }));
  return { titel: ['Besturing', 'ESP32-S3'], inhoud: i };
}

export const STUKLIJST = [
  ['-T1', '1', 'Netadapter 12 V DC, 6,67 A (80 W), C14, stekker 5,5 x 2,5 (+ midden)', 'Mean Well GST90A12-P1M'],
  ['-X5', '1', 'DC-chassisbus 5,5 x 2,5, 50 V / 8 A, soldeerlippen', 'GlobTek JACK-L-PANEL-8A(R)'],
  ['-F1', '1', 'Steekzekering ATO 7,5 A, 32 V DC, met printhouder', 'Littelfuse 0287007.5 of gelijk'],
  ['-Q17', '1', 'P-MOSFET −55 V, 20 mΩ, TO-220 (tegen ompolen)', 'Infineon IRF4905PbF'],
  ['-R34', '1', 'Weerstand 10 kΩ 1206 (gate -Q17)', '—'],
  ['-C1', '1', 'Elco 470 µF / 25 V', '—'],
  ['-T2', '1', 'Regelaar 12 → 5 V, 1 A (op de draagprint)', 'Pololu D24V10F5'],
  ['-K1', '1', 'ESP32-S3-DevKitC-1 v1.1, N16R8', 'Espressif'],
  ['-K2', '1', 'PWM-print 16 kanalen, I2C, op 4 afstandsbussen M2,5 x 10', 'PCA9685-breakout'],
  ['-Q1..-Q16', '16', 'N-MOSFET 30 V, ≤ 48 mΩ bij 2,5 V, SOT-23', 'Alpha & Omega AO3400A'],
  ['-U1..-U8', '8', 'Adapterprintje 2 x SOT-23 naar DIP-8, met IC-voet DIP-8', 'Artekit DA-SOT23-3-X2'],
  ['-R2..-R17', '16', 'Weerstand 100 kΩ 1206 (gate naar source)', '—'],
  ['-F2..-F17', '16', 'Polyfuse 0,5 A, 24 V, 1812 (een per groep)', 'Bourns MF-MSMF050/24X'],
  ['-F18', '1', 'Polyfuse 0,3 A, 30 V, 1812 (+12 V voor de knoppen)', 'Bourns MF-MSMF030'],
  ['-K3..-K6', '4', 'Optocoupler 4-voudig met AC-ingang, DIP-16', 'Lite-On LTV-844'],
  ['-R18..-R33', '16', 'Weerstand 2,2 kΩ 1206, 0,25 W', '—'],
  ['-R1', '1', 'Weerstand 1 kΩ 1206 (pull-up OE)', '—'],
  ['-X1', '3', 'Printklem 5,08, tot 1,5 mm² (12 V in, 0 V in, 0 V naar -X3:17)', 'Phoenix MKDS 1,5/3-5,08'],
  ['-X2', '8', 'Printklem 2,54, 0,14 tot 0,5 mm² (R1+..R6+, +12 V en 0 V naar de ingangsprint)', 'Phoenix MPT 0,5/8-2,54'],
  ['-X3', '16 + 2', 'Printklem 2,54 (de − van de bordjes) en 5,08 (0 V-retour)', 'Phoenix MPT 0,5/16-2,54, MKDS 1,5/2-5,08'],
  ['-X4', '24', 'Printklem 2,54 (16 ingangen, 4 COM, 2 x +12 V, 2 x 0 V)', 'Phoenix MPT 0,5/24-2,54 (of 2 x 12)'],
  ['-E1..-E16', '16', 'Modelbouwled PCB met ingebouwde weerstand (1K voor 12 V)', 'Modelbouwled.nl'],
  ['-W1', '1', 'Kabel van de netadapter met stekker 5,5 x 2,5 (aan de adapter)', '—'],
];

// klemmenplannen: een rij per klem
const KLEMMEN = {
  '-X1': ['voedingsprint: 12 V in en 0 V-retour', [
    { klem: '1', functie: 'J+: +12 V in', kabel: '0,75 mm²', extern: '-X5', externAansl: '1 (pen)', intern: '-F1', internAansl: '1', verwijzing: ref(B.voeding, 120) },
    { klem: '2', functie: 'M: 0 V in', kabel: '0,75 mm²', extern: '-X5', externAansl: '2 (huls)', intern: 'M (-C1, -R34)', internAansl: '', brug: '2-3', verwijzing: ref(B.voeding, 120) },
    { klem: '3', functie: 'M: 0 V-retour uitgangen (5,2 A)', kabel: '0,75 mm²', extern: '-X3', externAansl: '17', intern: 'M', internAansl: '', brug: '2-3', verwijzing: ref(B.voeding, 130) },
  ]],
  '-X2': ['voedingsprint: + per rij bordjes, +12 V en 0 V naar de ingangsprint', [
    ...[1, 2, 3, 4, 5, 6].map((r) => ({ klem: String(r), functie: `L+: + rij ${r} (R${r}+)`, kabel: '0,5 mm²', extern: `-E${3 * r - 2}${r < 6 ? `..-E${3 * r}` : ''}`, externAansl: '+', intern: '-Q17', internAansl: 'S', verwijzing: ref(B.voeding, xRij(r) + 18) })),
    { klem: '7', functie: 'L+: +12 V naar de ingangsprint', kabel: '0,25 mm²', extern: '-F18', externAansl: '1', intern: 'L+', verwijzing: ref(B.voeding, 370) },
    { klem: '8', functie: 'M: 0 V naar de ingangsprint', kabel: '0,25 mm²', extern: '-X4', externAansl: '23', intern: 'M', verwijzing: ref(B.voeding, 390) },
  ]],
  '-X3': ['uitgangsprint: − per groep, 0 V-retour', [
    ...Array.from({ length: 16 }, (_, k) => ({ klem: String(k + 1), functie: `G${String(k + 1).padStart(2, '0')}−: groep ${k + 1}`, kabel: '0,25 mm²', extern: `-E${k + 1}`, externAansl: '−', intern: `-F${k + 2}`, internAansl: '1', verwijzing: ref(B.uit, xGroep(k + 1) + 12) })),
    { klem: '17', functie: 'M: 0 V-retour (tot 5,2 A)', kabel: '0,75 mm²', extern: '-X1', externAansl: '3', intern: 'M (sources)', internAansl: '', brug: '17-18', verwijzing: ref(B.uit, 400) },
    { klem: '18', functie: 'M: reserve', intern: 'M', brug: '17-18', verwijzing: ref(B.uit, 400) },
  ]],
  '-X4': ['ingangsprint: knoppen en sensoren', X4.map((f, k) => {
    const m = /^IN(\d+)$/.exec(f), c = /^COM(\d)$/.exec(f);
    if (m) return { klem: String(k + 1), functie: `IN${m[1].padStart(2, '0')}: ingang ${m[1]}`, extern: 'knop of sensor', intern: `-R${17 + +m[1]}`, internAansl: '2', verwijzing: ref(B.in, xIn(f)) };
    if (c) return { klem: String(k + 1), functie: `COM${c[1]}: ingang ${4 * c[1] - 3}..${4 * c[1]} (0 V of +12 V)`, extern: 'aan -X4:21..24', intern: `-K${+c[1] + 2}`, internAansl: '2, 4, 6, 8', verwijzing: ref(B.in, xIn(f)) };
    if (f === '+12V') return { klem: String(k + 1), functie: '+12 V voor knoppen (door -F18)', extern: 'knoppen, sensoren', intern: '-F18', internAansl: '2', brug: '21-22', verwijzing: ref(B.in, 150) };
    return { klem: String(k + 1), functie: '0 V voor sensoren', extern: 'sensoren', intern: 'M', brug: '23-24', verwijzing: ref(B.in, 259) };
  })],
};

const schema = [voeding(), uitgangen(), ingangen(), besturing()].map((b) => ({ ...b, soort: SOORT.schema[0], soortNaam: SOORT.schema[1] }));
const klemmen = Object.entries(KLEMMEN).map(([s, [oms, rijen]]) => ({ titel: ['Klemmenplan', s], soort: SOORT.klemmen[0], soortNaam: SOORT.klemmen[1], inhoud: klemmenplan(s, oms, rijen) }));
const stuk = { titel: 'Stuklijst', soort: SOORT.stuk[0], soortNaam: SOORT.stuk[1], inhoud: stuklijst(STUKLIJST) };
const voor = { titel: 'Titelblad', soort: SOORT.titel[0], soortNaam: SOORT.titel[1] };
const inhoud = { titel: 'Inhoudsopgave', soort: SOORT.inhoud[0], soortNaam: SOORT.inhoud[1] };
const alle = [voor, inhoud, ...schema, ...klemmen, stuk];
alle.forEach((b, k) => { b.nr = k + 1; });
export { KLEMMEN };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  voor.inhoud = titelblad(PROJECT, [
    ['Klant', 'eigen gebruik (modelbaan)'], ['Tekeningnummer', PROJECT.tekeningnr], ['Fabrikant', 'zelfbouw'], ['Projectverantwoordelijke', 'Ian'],
    ['Projectstart', '2026-11-08'], ['Projectnaam', 'Treinbaan, kabeldoos verlichting'], ['Revisie 2', '2026-11-12: advies Fable 5.2'],
  ], [
    ['Installatie', '=TRN verlichting modelbaan'], ['Plaats', '+DOOS kabeldoos onder de baan'], ['Voedingsspanning', '230 V AC (in de netadapter) → 12 V DC'],
    ['Stuurspanning', '5 V DC en 3,3 V DC'], ['Beschermingsgraad', 'IP20 (binnen)'], ['Potentialen', 'J+ en L+ 12 V, L5 5 V, L3 3,3 V, M 0 V'], ['Bouwjaar', '2026'],
  ], { normen: NORMEN, bladen: alle.length });
  inhoud.inhoud = inhoudsopgave(PROJECT, alle);
  const svgs = project(PROJECT, alle);
  await schrijf(HERE, 'Aansluitschema kabeldoos treinverlichting', svgs);
  console.log(`geschreven: blad-1..${svgs.length}.svg en schema.html`);
}
