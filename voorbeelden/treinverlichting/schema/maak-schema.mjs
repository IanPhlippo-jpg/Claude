// Aansluitschema van de kabeldoos (treinverlichting) zoals EPLAN Electric P8 het afdrukt, volgens IEC/EN 61082-1,
// 60617 en 81346 (zie voorbeelden/lib/eplan.mjs). Aanduidingen volgens ISO/IEC 81346-2, per module de klasse van zijn
// hoofdfunctie (de letter A "meer functies" gebruikt dit project niet: schemaNorm.test.ts): -T voeding en regelaar,
// -F zekeringen en polyfuses, -K besturing en signaalverwerking (ESP, PWM-print, optocouplerprints), -Q schakelen
// (MOSFET-modules), -R weerstand en diode, -X klemmen (WAGO-klemmen, DC-bus, de schroefklemadapter van de ESP),
// -E de Modelbouwled-bordjes, -W de kabel van de netadapter.
// Revisie 3 (versie 4, Ian 2026-11-13: kant-en-klare printjes): geen gaatjesprints meer. De modules staan als
// toestellen (streep-punt) met hun klemmen getekend; binnenin alleen wat nodig is om de werking te volgen. De bedrading
// en de klemmen komen uit ../opbouw.mjs (dezelfde bron als het montageblad TRN-10 en de draadlijst TRN-14).
// Potentialen: J+ (12 V van de DC-bus), L+ (12 V na de hoofdzekering), S12 (12 V voor sensoren en ingangen, na -F18),
// L5 (5 V), L3 (3,3 V), M (0 V).
// Gebruik: node voorbeelden/treinverlichting/schema/maak-schema.mjs  (schrijft blad-N.svg en schema.html)
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  X0, X1, T, L, punt, rect, weerstand, zekering, ptc, klem, nmos, opto, toestel, rail, onderbreking, ref, aansluiting,
  titelblad, inhoudsopgave, klemmenplan, stuklijst, project, schrijf, SOORT, NORMEN,
} from '../../lib/eplan.mjs';
import { INGANG_GPIO, MODULES, DRADEN, IN_KLEMMEN, J1, J3 } from '../opbouw.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PROJECT = {
  naam: 'Treinbaan', omschrijving: 'kabeldoos verlichting, versie 4', eigenaar: 'Ian', tekeningnr: 'TRN-E01',
  installatie: '=TRN', installatieNaam: 'verlichting modelbaan', plaats: '+DOOS', plaatsNaam: 'onder de baan',
  datum: '2026-11-08', getekend: 'Phlippo CAD', gecontroleerd: 'Ian', norm: 'IEC 81346', revisie: { index: '3', datum: '2026-11-13', naam: 'PC' },
};
export { INGANG_GPIO };
// de bladen (nummers voor de kruisverwijzingen)
const B = { voeding: 3, uit: 4, in: 5, besturing: 6 };
const xGroep = (g) => 34 + (g - 1) * 23.2; // blad 4 en 5: de kolom van groep / ingang g
const RECHTS = X1 - 5;
// een WAGO-klem (2 blokken van 5) als klem 1..10 van één strook
const wagoNr = (r, k) => (/b$/.test(r) ? 5 : 0) + +k;
const strook = (r) => r.replace(/[ab]$/, '');

/** diode verticaal met de kathode boven (x, y) en de anode onder (x, y + 14): stroom van onder naar boven */
function diodeOp(x, y, code, waarde) {
  return [L([[x, y], [x, y + 4.5]]), `<polygon points="${x - 3},${y + 9.5} ${x + 3},${y + 9.5} ${x},${y + 4.5}" fill="none" stroke="#000" stroke-width="0.35"/>`,
    L([[x - 3, y + 4.5], [x + 3, y + 4.5]], { w: 0.5 }), L([[x, y + 9.5], [x, y + 14]]), T(x + 5, y + 6, code, { size: 2.8 }), T(x + 5, y + 9.2, waarde, { size: 2.3 })].join('');
}
/** maakcontact verticaal van (x, y) naar (x, y + 14) (knop of sensor in het veld) */
function contact(x, y, tekst) {
  return [L([[x, y], [x, y + 4]]), L([[x, y + 4], [x - 3.2, y + 10]], { w: 0.35 }), L([[x, y + 10], [x, y + 14]]), T(x + 1.2, y + 18, tekst, { size: 1.8, anchor: 'middle' })].join('');
}

function voeding() {
  const i = [], yp = 70, ym = 215;
  i.push(toestel(25, 50, 55, 60, '-T1', ['Netadapter (buiten de doos)', 'Mean Well GST90A12-P1M', '230 V AC / 12 V DC, 6,67 A', 'stekker 5,5 x 2,5, + in het midden'], [{ x: 55, y: 20, naam: '+' }, { x: 55, y: 45, naam: '−' }]));
  i.push(T(25, 120, '230 V AC alleen in de gekeurde adapter', { size: 2.5 }));
  i.push(L([[80, yp], [92.8, yp]]), L([[80, 95], [86, 95], [86, ym], [92.8, ym]]), T(82, yp - 3, '-W1', { size: 2.8 }), T(82, yp + 4, 'kabel adapter', { size: 2.2 }));
  i.push(klem(94, yp, '-X5', 'pen'), klem(94, ym, '-X5', 'huls'), T(86, yp - 13, 'DC-bus 5,5 x 2,5, 8 A (2 soldeerlippen)', { size: 2.2 }));
  i.push(L([[95.2, yp], [118, yp]]), T(104, yp - 1.5, 'J+', { size: 2.2 }), zekering(118, yp, '-F1', 'ATO 7,5 A, houder met draden'));
  i.push(L([[138, yp], [148.8, yp]]), klem(150, yp, '-X1', '1'), L([[151.2, yp], [165, yp]]));
  i.push(L([[95.2, ym], [148.8, ym]]), klem(150, ym, '-X2', '1'), L([[151.2, ym], [165, ym]]));
  // ompoolbeveiliging: Schottkydiode SB560 tussen L+ en M (kathode aan L+): verkeerd om = de diode geleidt, de adapter
  // schakelt af of -F1 smelt; de modules zien hoogstens −0,6 V
  i.push(punt(175, yp), L([[175, yp], [175, 120.8]]), klem(175, 122, '-X1', '8', { kant: 'links' }), L([[175, 123.2], [175, 140]]), diodeOp(175, 140, '-R2', 'SB560'), L([[175, 154], [175, 186.8]]), klem(175, 188, '-X2', '8', { kant: 'links' }), L([[175, 189.2], [175, ym]]), punt(175, ym));
  i.push(T(181, 162, 'ompoolbeveiliging', { size: 2.0 }), T(181, 165, '(pootjes in de WAGO-klemmen)', { size: 1.9 }));
  i.push(rail(yp, 165, RECHTS, 'L+', { naar: `${ref(B.uit, X0)}  ${ref(B.in, X0)}` }), rail(ym, 165, RECHTS, 'M', { naar: `${ref(B.uit, X0)}  ${ref(B.in, X0)}  ${ref(B.besturing, X0)}` }));
  // aftakkingen naar de MOSFET-modules (VIN), de regelaar en de polyfuse van de ingangen
  const tak = (x, nr, nrM, naar, verw, tekst) => {
    i.push(punt(x, yp), L([[x, yp], [x, 92.8]]), klem(x, 94, '-X1', String(nr)), L([[x, 95.2], [x, 104]]), onderbreking(x, 104, naar, verw, 'onder'));
    if (nrM) i.push(punt(x + 9, ym), L([[x + 9, ym], [x + 9, 197.2]]), klem(x + 9, 196, '-X2', String(nrM)), L([[x + 9, 194.8], [x + 9, 186]]), onderbreking(x + 9, 186, 'M', verw, 'boven'));
    i.push(T(x - 2, 124, tekst, { size: 2.1 }));
  };
  tak(205, 2, 2, 'VIN+ -Q1', ref(B.uit, 40), 'MOSFET-module 1');
  tak(245, 3, 3, 'VIN+ -Q2', ref(B.uit, 230), 'MOSFET-module 2');
  // regelaar 12 -> 5 V (Joy-IT SBC-Buck02)
  i.push(punt(290, yp), L([[290, yp], [290, 92.8]]), klem(290, 94, '-X1', '4'), L([[290, 95.2], [290, 140]]));
  i.push(toestel(280, 140, 46, 30, '-T2', ['', 'Joy-IT SBC-Buck02', '9-35 V -> 5 V, 5 A'], [{ x: 10, y: 0, naam: 'VIN' }, { x: 20, y: 30, naam: 'GND' }, { x: 46, y: 15, naam: 'VOUT' }]));
  i.push(L([[300, 170], [300, 196.8]]), klem(300, 198, '-X2', '4', { kant: 'links' }), L([[300, 199.2], [300, ym]]), punt(300, ym));
  i.push(L([[326, 155], [RECHTS, 155]], { w: 0.35 }), onderbreking(RECHTS, 155, 'L5', ref(B.besturing, X0), 'rechts'));
  // +12 V voor de ingangen en de sensoren: eigen polyfuse
  i.push(punt(370, yp), L([[370, yp], [370, 80.8]]), klem(370, 82, '-X1', '7'), L([[370, 83.2], [370, 90]]), ptc(370, 90, '-F18', 'MF-R050'), L([[370, 110], [370, 118.8]]), klem(370, 120, '-X3', '1'), L([[370, 121.2], [370, 130]]), onderbreking(370, 130, 'S12', ref(B.in, X0), 'onder'));
  i.push(T(25, 236, 'Stroom: hoogstens 16 x 0,32 A + 0,32 A (regelaar, ingangen) = 5,4 A (bordjes van 0 Ω), met 1K-bordjes 2,7 A. -F1 7,5 A beschermt de draden tot de verdeelklemmen -X1/-X2;', { size: 2.4 }));
  i.push(T(25, 241, 'elke groep heeft een eigen polyfuse 0,5 A (-F2..-F17, blad 4), de ingangen en sensoren -F18 (0,5 A). -X1, -X2, -X3: WAGO 221-415 (2 x 5 klemmen voor -X1 en -X2: klem 1-5 en 6-10, brug 5-6).', { size: 2.4 }));
  return { titel: ['Voeding', '12 V en 5 V'], inhoud: i };
}

function uitgangen() {
  const i = [], ym = 236, y0 = 60, y1 = 150;
  i.push(toestel(25, 26, 380, 16, '-K2', ['PWM-print PCA9685, 16 kanalen (I2C 0x40, 1 kHz, 12 bit), pinnen PWM0..15 (dupont)', `VCC = L3 ${ref(B.besturing, 300)}; OE ← GPIO10 met -R1 1 kΩ naar 3,3 V ${ref(B.besturing, 300)}; V+ niet gebruikt`], []));
  for (const [q, g0, x0] of [['-Q1', 1, 25], ['-Q2', 9, 25 + 8 * 23.2]]) {
    i.push(toestel(x0 + 2, y0, 8 * 23.2 - 4, y1 - y0, q, [], []));
    i.push(T(x0 + 10, y0 - 1.6, `8-kanaals MOSFET-module met optocouplers (3,3 V) · VCC = L3 ${ref(B.besturing, 300)} · VIN+ = L+ (+) en VIN− = M ${ref(B.voeding, q === '-Q1' ? 205 : 245)}`, { size: 2.0 }));
    i.push(aansluiting(x0 + 2, y1 - 8, ''), T(x0 + 3.4, y1 - 9.4, 'VIN−', { size: 1.9 }));
    // VCC-rail (3,3 V, ingangskant) en VIN−-rail (0 V, sources) in de module
    i.push(aansluiting(x0 + 2, y0 + 6, ''), T(x0 + 3.4, y0 + 4.6, 'VCC', { size: 1.9 }), L([[x0 + 2, y0 + 6], [x0 + 8 * 23.2 - 4, y0 + 6]]));
    i.push(L([[x0 + 2, y1 - 8], [x0 + 8 * 23.2 - 4, y1 - 8]]));
    for (let n = 1; n <= 8; n++) {
      const g = g0 + n - 1, x = xGroep(g);
      // PWM van de PCA9685 naar IN n; de led van de optocoupler hangt tussen VCC en IN n (actief laag)
      i.push(L([[x - 5, 42], [x - 5, y0 + 27], [x, y0 + 27], [x, y0 + 25]]), T(x - 4, 45, `PWM${g - 1}`, { size: 1.7 }), aansluiting(x - 5, y0 + 2, `IN${n}`));
      i.push(punt(x, y0 + 6), L([[x, y0 + 6], [x, y0 + 9]]), opto(x + 4, y0 + 17, '', ['', '', '', '']), T(x + 10, y0 + 8, '+', { size: 1.8 }));
      // emitter naar de gate, drain naar de uitgang n−, source naar VIN−
      i.push(L([[x + 9, y0 + 25], [x + 9, y0 + 30], [x - 2, y0 + 30], [x - 2, y0 + 42]]), nmos(x + 7, y0 + 42, '', '', false));
      i.push(L([[x + 9, y0 + 33], [x + 13, y0 + 33], [x + 13, y1]]), L([[x + 9, y0 + 51], [x + 9, y1 - 8]]), punt(x + 9, y1 - 8));
      i.push(aansluiting(x + 13, y1, `${n}−`, 'end'));
      // − door de polyfuse en de WAGO-doorverbinder naar het bordje; de + van het bordje uit de klem n+ (= VIN+)
      i.push(L([[x + 13, y1], [x + 13, 155]]), ptc(x + 13, 155, '', ''), T(x + 15, 171, `-F${g + 1}`, { size: 1.8 }));
      i.push(L([[x + 13, 175], [x + 13, 180.8]]), klem(x + 13, 182, '-X8', String(g)));
      i.push(L([[x + 13, 183.2], [x + 13, 190]]), toestel(x + 7, 190, 12, 20, `-E${g}`, [], [{ x: 6, y: 0, naam: '−' }, { x: 6, y: 20, naam: '+' }]));
      i.push(L([[x + 13, 210], [x + 13, 218]]), T(x + 13, 222, `${q}:${n}+`, { size: 1.8, anchor: 'middle' }), T(x + 13, 225, '(L+)', { size: 1.8, anchor: 'middle' }));
    }
  }
  i.push(T(25, 238, '-Q1, -Q2: per kanaal optocoupler PC817 en N-MOSFET (low-side), uitgang n− = drain, n+ = VIN+ (L+). Ingang actief laag: de PCA9685 trekt IN n naar 0 V (firmware: OUTDRV, INVRT, OUTNE = 01).', { size: 2.3 }));
  i.push(T(25, 243, '-F2..-F17: polyfuse Bourns MF-R050 (0,5 A, trip 1,0 A) per groep, met één pootje in de klem n− en het andere in een WAGO 221-2411 (-X8) samen met de − van het bordje.', { size: 2.3 }));
  i.push(T(25, 248, '-E1..-E16: Modelbouwled-bordjes (1K voor 12 V); de + van het bordje uit de klem n+ van zijn module, de − nooit doorlussen. Gegevens van de modules (AANNAME): docs/Maten-en-bronnen.md.', { size: 2.3 }));
  return { titel: ['Uitgangen', '16 lichtgroepen'], inhoud: i };
}

function ingangen() {
  const i = [], y0 = 58, y1 = 140, ym = 236;
  i.push(onderbreking(X0 + 3, 30, 'S12', ref(B.voeding, 370), 'links'), L([[X0 + 3, 30], [RECHTS - 20, 30]], { w: 0.35 }));
  i.push(punt(RECHTS - 40, 30), L([[RECHTS - 40, 30], [RECHTS - 40, 38.8]]), klem(RECHTS - 40, 40, '-X3', '4/5'), T(RECHTS - 36, 47, '+12 V sensoren', { size: 2.2 }));
  i.push(rail(ym, X0 + 3, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  for (const [k, g0, x0] of [['-K3', 1, 25], ['-K4', 9, 25 + 8 * 23.2]]) {
    i.push(toestel(x0 + 2, y0, 8 * 23.2 - 4, y1 - y0, k, [], []));
    i.push(T(x0 + 10, y0 - 1.6, `Optocouplerprint PC817, 8 kanalen (3,6-24 V) · uitgang: VCC = L3 ${ref(B.besturing, 300)}, GND = M ${ref(B.besturing, 40)}, jumper op pull-up`, { size: 2.0 }));
    i.push(punt(x0 + 6, 30), L([[x0 + 6, 30], [x0 + 6, y0 + 8]]), aansluiting(x0 + 6, y0 + 1, ''), T(x0 + 7.4, y0 + 4.4, 'VCC', { size: 1.9 }), L([[x0 + 6, y0 + 8], [x0 + 8 * 23.2 - 6, y0 + 8]]));
    i.push(T(x0 + 9, 34, `-X3:${k === '-K3' ? 2 : 3}`, { size: 2.0 }));
    // uitgangskant: GND van de ESP (de emitters); OUT n naar de GPIO (blad 6)
    i.push(aansluiting(x0 + 2, y1 - 6, ''), T(x0 + 3.4, y1 - 7.4, 'GND', { size: 1.9 }));
    for (let n = 1; n <= 8; n++) {
      const g = g0 + n - 1, x = xGroep(g);
      // VCC (12 V) -> weerstand -> led -> IN n: de knop of een NPN-sensor trekt IN n naar 0 V
      i.push(punt(x, y0 + 8), L([[x, y0 + 8], [x, y0 + 10]]), weerstand(x, y0 + 10, '', n === 1 ? '1 kΩ' : ''));
      i.push(L([[x, y0 + 30], [x, y0 + 32]]), opto(x + 4, y0 + 40, '', ['', '', '', '']), L([[x, y0 + 48], [x, y1]]), aansluiting(x, y1, `IN${n}`, 'start'));
      // transistor: collector -> OUT n (pull-up naar 3,3 V met de jumper), emitter -> GND
      i.push(L([[x + 9, y0 + 32], [x + 9, y0 + 26], [x + 14, y0 + 26]]), T(x + 15, y0 + 27, `OUT${n}`, { size: 1.6 }), onderbreking(x + 14, y0 + 21, '', '', 'boven'));
      i.push(L([[x + 14, y0 + 26], [x + 14, y0 + 21]]), T(x + 9.5, y0 + 18, `GPIO${INGANG_GPIO[g - 1]}`, { size: 1.6 }), T(x + 9.5, y0 + 15.5, ref(B.besturing, 140), { size: 1.5 }));
      i.push(L([[x + 9, y0 + 48], [x + 9, y1 - 6]]), punt(x + 9, y1 - 6));
      // in het veld: knop, schakelaar, reed of NPN-sensor naar 0 V
      i.push(L([[x, y1], [x, 170]]), T(x + 1, y1 + 5, `IN${String(g).padStart(2, '0')}`, { size: 1.9 }), contact(x, 170, 'knop/NPN'), L([[x, 184], [x, ym]]), punt(x, ym));
    }
    i.push(L([[x0 + 2, y1 - 6], [x0 + 8 * 23.2 - 6, y1 - 6]]));
  }
  i.push(T(25, 244, '-K3, -K4: optocouplerprint PC817, 8 kanalen; VCC (ingang) = S12 +12 V, IN n naar 0 V = actief; uitgang met jumper op pull-up: OUT n laag = actief (GPIO met pull-up). Een +12 V op IN n: niets aan de hand (0 V over de led).', { size: 2.3 }));
  i.push(T(25, 249, 'Een sensor die zelf 12 V geeft (PNP) werkt niet rechtstreeks: neem een contact, reed of NPN-sensor (README). De ingangsweerstand (1 kΩ) en de pull-up zijn AANNAME: na te meten.', { size: 2.3 }));
  return { titel: ['Ingangen', 'knoppen en sensoren'], inhoud: i };
}

function besturing() {
  const i = [], ym = 230;
  i.push(rail(30, X0 + 3, RECHTS, 'L5', { van: ref(B.voeding, RECHTS) }), rail(ym, X0 + 3, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  const pins = [{ x: 0, y: 15, naam: '5V (J1:21)' }, { x: 0, y: 150, naam: 'G (J1:22, J3:1, 21, 22)' }, { x: 100, y: 15, naam: '3V3 (J1:1, 2)' }, { x: 100, y: 40, naam: 'GPIO8 SDA (J1:12)' }, { x: 100, y: 50, naam: 'GPIO9 SCL (J1:15)' }, { x: 100, y: 65, naam: 'GPIO10 OE (J1:16)' }, { x: 100, y: 85, naam: 'GPIO 1..21, 40, 41 (ingangen)' }, { x: 100, y: 105, naam: 'GPIO38 RGB-led' }, { x: 100, y: 120, naam: 'GPIO0 BOOT' }];
  i.push(toestel(60, 45, 100, 160, '-K1', ['', '', '', 'ESP32-S3-DevKitC-1 v1.1 (N16R8)', 'in de schroefklemadapter -X6', '(44 schroefklemmen, ESP in 2 pinrijen)', '2 x micro-USB "UART" en "USB"', 'in de rechterwand (flashen)', '', 'wifi-hotspot "Treinbaan"', '+ thuisnet (STA), treinbaan.local', 'dashboard: 192.168.4.1', '', 'statuslampje GPIO38:', 'groen = wifi aan,', 'rood = -K2 antwoordt niet', 'BOOT 5 s: wachtwoord terug'], pins));
  i.push(punt(45, 30), L([[45, 30], [45, 60], [60, 60]]), L([[60, 195], [45, 195], [45, ym]]), punt(45, ym));
  i.push(T(26, 52, '-T2 VOUT', { size: 2.0 }));
  i.push(L([[160, 60], [175, 60], [175, 40], [218.8, 40]], { w: 0.35 }), klem(220, 40, '-X7', '1'), L([[221.2, 40], [RECHTS, 40]], { w: 0.35 }), onderbreking(RECHTS, 40, 'L3', `${ref(B.uit, 30)}  ${ref(B.in, 30)}`, 'rechts'));
  i.push(T(230, 37.5, '3,3 V (WAGO 221-415): VCC van -K2 (uit J1:2), -Q1, -Q2, -K3, -K4', { size: 2.2 }));
  i.push(L([[160, 85], [300, 85]]), L([[160, 95], [300, 95]]), onderbreking(300, 85, 'SDA', ref(B.uit, 30)), onderbreking(300, 95, 'SCL', ref(B.uit, 30)));
  i.push(L([[160, 110], [300, 110]]), onderbreking(300, 110, 'OE (actief laag)', ref(B.uit, 30)));
  i.push(punt(260, 40), L([[260, 40], [260, 62]]), weerstand(260, 62, '-R1', '1 kΩ'), L([[260, 82], [260, 110]]), punt(260, 110));
  i.push(T(185, 125, '-R1 (pootjes in de klemmen J1:1 en J1:16, niet solderen) houdt OE hoog bij reset of flashen: alle groepen uit.', { size: 2.3 }));
  i.push(T(185, 130, '1 kΩ: de PCA9685-print trekt OE zelf laag (Adafruit: "pulled low by default"). Meetpunt: OE ≥ 2,5 V bij reset (TRN-20).', { size: 2.3 }));
  i.push(L([[160, 130], [178, 130]]), onderbreking(178, 130, 'IN01..IN16', `${ref(B.in, xGroep(1))} .. ${ref(B.in, xGroep(16))}`, 'rechts'));
  i.push(T(185, 160, 'Uitbreiden tot 32 groepen: een tweede PCA9685 op 0x41 (A0 dicht) met 2 MOSFET-modules, SDA, SCL, OE, VCC en GND parallel;', { size: 2.3 }));
  i.push(T(185, 165, 'firmware bouwen met -DTREIN_GROEPEN=32 (firmware/README.md). Vrije GPIO: 11, 39, 42, 47, 48.', { size: 2.3 }));
  i.push(T(185, 172, 'Firmware: uitgangen actief laag (MOSFET-modules met de led tussen VCC en IN) en ingangen actief laag; andersom: -DTREIN_UITGANG_ACTIEF_HOOG of', { size: 2.3 }));
  i.push(T(185, 177, '-DTREIN_INGANG_ACTIEF_HOOG (firmware/src/hw.h). Na te kijken bij de proefopstelling (meetblad TRN-20).', { size: 2.3 }));
  i.push(T(25, 244, 'I2C van -K1 naar -K2 met de pull-ups op de PCA9685-print (10 kΩ). Dupont-kabels op de pinnen van -K2, -Q1, -Q2; schroefklemmen op -X6, -K3, -K4, -T2.', { size: 2.5 }));
  return { titel: ['Besturing', 'ESP32-S3'], inhoud: i };
}

export const STUKLIJST = [
  ['-T1', '1', 'Netadapter 12 V DC, 6,67 A (80 W), C14, stekker 5,5 x 2,5 (+ midden)', 'Mean Well GST90A12-P1M'],
  ['-X5', '1', 'DC-chassisbus 5,5 x 2,5, 50 V / 8 A, soldeerlippen', 'GlobTek JACK-L-PANEL-8A(R)'],
  ['-F1', '1', 'Zekeringhouder steekzekering ATO met draden + zekering 7,5 A, 32 V DC', 'Littelfuse FHAC0001ZXJ of gelijk'],
  ['-R2', '1', 'Schottkydiode 5 A, 60 V (ompoolbeveiliging, pootjes in -X1:8 en -X2:8)', 'SB560'],
  ['-X1, -X2', '4', 'Verbindingsklem 5-voudig, 0,2 tot 4 mm² (L+ en 0 V, telkens 2 samen)', 'WAGO 221-415'],
  ['-X3, -X7', '2', 'Verbindingsklem 5-voudig (+12 V sensoren, 3,3 V)', 'WAGO 221-415'],
  ['-X8', '16', 'Doorverbinder 1 + 1, 0,2 tot 4 mm² (polyfuse aan de − van het bordje)', 'WAGO 221-2411'],
  ['-T2', '1', 'Regelaar 9-35 V -> 5 V, 5 A, 3-polige schroefklem', 'Joy-IT SBC-Buck02'],
  ['-K1', '1', 'ESP32-S3-DevKitC-1 v1.1, N16R8', 'Espressif'],
  ['-X6', '1', 'Schroefklemadapter ESP32-S3 44-pin (voor 23 en 25,5 mm brede borden)', 'ESP32-S3 Expansion Board 44P'],
  ['-K2', '1', 'PWM-print 16 kanalen, I2C, pinnen gesoldeerd', 'AZ-Delivery PCA9685'],
  ['-Q1, -Q2', '2', 'MOSFET-module 8 kanalen, optocouplers, 3,3 V-ingang, PWM', '8 Channel MOSFET PLC Amplifier (3,3 V-versie)'],
  ['-K3, -K4', '2', 'Optocouplerprint 8 kanalen PC817, 3,6-24 V, schroefklemmen 5,0', 'MakerMind RBS18122'],
  ['-F2..-F17', '16', 'Polyfuse 0,5 A, 60 V, radiaal (één per groep)', 'Bourns MF-R050'],
  ['-F18', '1', 'Polyfuse 0,5 A, 60 V, radiaal (+12 V ingangen en sensoren)', 'Bourns MF-R050'],
  ['-R1', '1', 'Weerstand 1 kΩ, 0,25 W, met draden (pull-up OE)', '—'],
  ['-E1..-E16', '16', 'Modelbouwled PCB met ingebouwde weerstand (1K voor 12 V)', 'Modelbouwled.nl'],
  ['-W1', '1', 'Kabel van de netadapter met stekker 5,5 x 2,5 (aan de adapter)', '—'],
];

// klemmenplannen: per strook de rijen; bron: [ref in opbouw.mjs, klem] om te controleren
const draadNaar = (r, k) => DRADEN.filter((d) => (d.van[0] === r && d.van[1] === k) || (d.naar[0] === r && d.naar[1] === k)).map((d) => (d.van[0] === r && d.van[1] === k ? d.naar : d.van));
const elementOp = (r, k) => IN_KLEMMEN.find((x) => (x.a[0] === r && x.a[1] === k) || (x.b[0] === r && x.b[1] === k));
const tekstEind = (e) => (e[0] === '-X5' ? `-X5 ${e[1] === '+' ? 'pen' : 'huls'}` : e[0] === '-F1' ? '-F1' : /^-X[12][ab]$/.test(e[0]) ? `${strook(e[0])}:${wagoNr(e[0], e[1])}` : `${e[0]}:${e[1]}`);
function wagoRijen(refs, functie, verw) {
  const uit = [];
  for (const r of refs) for (let k = 1; k <= 5; k++) {
    const naar = draadNaar(r, String(k)), el = elementOp(r, String(k)), nr = refs.length > 1 ? wagoNr(r, k) : k;
    const d = DRADEN.find((q) => naar.length && ((q.van[0] === r && q.van[1] === String(k)) || (q.naar[0] === r && q.naar[1] === String(k))));
    const brug = refs.length > 1 && (nr === 5 || nr === 6) ? '5-6' : '';
    uit.push({ klem: String(nr), functie: brug ? `${functie}: brug naar het andere blok` : naar.length ? functie : el ? `${functie}: ${el.ref}` : `${functie}: reserve (veld)`, kabel: d ? `${String(d.mm2).replace('.', ',')} mm²` : '', extern: naar.length && !brug ? tekstEind(naar[0]).split(':')[0] : el ? el.ref : '', externAansl: naar.length && !brug ? (tekstEind(naar[0]).split(':')[1] ?? '') : '', intern: functie.split(':')[0], brug, verwijzing: verw, bron: [r, String(k)] });
  }
  return uit;
}
const KLEMMEN = {
  '-X1': ['WAGO 221-415 (2 x): L+ na -F1', wagoRijen(['-X1a', '-X1b'], 'L+', ref(B.voeding, 205))],
  '-X2': ['WAGO 221-415 (2 x): 0 V (M)', wagoRijen(['-X2a', '-X2b'], 'M', ref(B.voeding, 205))],
  '-X3': ['WAGO 221-415: +12 V ingangen en sensoren (na -F18)', wagoRijen(['-X3'], 'S12', ref(B.voeding, 370))],
  '-X7': ['WAGO 221-415: 3,3 V van de ESP', wagoRijen(['-X7'], 'L3', ref(B.besturing, 220))],
  '-X8': ['WAGO 221-2411: polyfuse naar de − van het bordje', Array.from({ length: 16 }, (_, k) => ({ klem: String(k + 1), functie: `G${String(k + 1).padStart(2, '0')}−: groep ${k + 1}`, kabel: '0,25 mm²', extern: `-E${k + 1}`, externAansl: '−', intern: `-F${k + 2}`, internAansl: 'pootje', verwijzing: ref(B.uit, xGroep(k + 1) + 13) }))],
  ...Object.fromEntries(['-Q1', '-Q2'].map((q, j) => [q, [`MOSFET-module ${j + 1}: uitgangen groep ${8 * j + 1}..${8 * j + 8}`, [
    ...Array.from({ length: 8 }, (_, n) => [
      { klem: `${n + 1}+`, functie: `G${String(8 * j + n + 1).padStart(2, '0')}+: + van het bordje`, kabel: '0,25 mm²', extern: `-E${8 * j + n + 1}`, externAansl: '+', intern: 'VIN+ (L+)', verwijzing: ref(B.uit, xGroep(8 * j + n + 1) + 13), bron: [q, `${n + 1}+`] },
      { klem: `${n + 1}−`, functie: `drain groep ${8 * j + n + 1}`, kabel: 'pootje', extern: `-F${8 * j + n + 2}`, externAansl: '1', intern: 'MOSFET', verwijzing: ref(B.uit, xGroep(8 * j + n + 1) + 13), bron: [q, `${n + 1}−`] },
    ]).flat(),
    { klem: 'VIN+', functie: 'L+ (12 V)', kabel: '0,75 mm²', extern: '-X1', externAansl: String(2 + j), intern: 'optocouplers, +', verwijzing: ref(B.voeding, 205 + 40 * j), bron: [q, 'VIN+'] },
    { klem: 'VIN−', functie: `M: retour groep ${8 * j + 1}..${8 * j + 8} (2,6 A)`, kabel: '0,75 mm²', extern: '-X2', externAansl: String(2 + j), intern: 'sources', verwijzing: ref(B.voeding, 214 + 40 * j), bron: [q, 'VIN−'] },
  ]]])),
  ...Object.fromEntries(['-K3', '-K4'].map((k, j) => [k, [`Optocouplerprint ${j + 1}: ingangen ${8 * j + 1}..${8 * j + 8}`, [
    { klem: 'VCC', functie: 'S12: +12 V voor de leds', kabel: '0,25 mm²', extern: '-X3', externAansl: String(2 + j), intern: 'weerstanden', verwijzing: ref(B.in, 25 + 186 * j), bron: [k, 'VCC'] },
    ...Array.from({ length: 8 }, (_, n) => ({ klem: `IN${n + 1}`, functie: `IN${String(8 * j + n + 1).padStart(2, '0')}: knop of NPN-sensor naar 0 V`, kabel: '0,25 mm²', extern: 'knop of sensor', intern: 'led', verwijzing: ref(B.in, xGroep(8 * j + n + 1)), bron: [k, `IN${n + 1}`] })),
    { klem: 'VCC', functie: 'L3: 3,3 V (uitgangskant)', kabel: '0,14 mm²', extern: '-X7', externAansl: String(4 + j), intern: 'pull-up', verwijzing: ref(B.in, 25 + 186 * j), bron: [k, 'VCCo'] },
    ...Array.from({ length: 8 }, (_, n) => ({ klem: `OUT${n + 1}`, functie: `naar GPIO${INGANG_GPIO[8 * j + n]}`, kabel: '0,14 mm²', extern: '-X6', externAansl: tekstEind(DRADEN.find((d) => d.van[0] === k && d.van[1] === `OUT${n + 1}`).naar).split(':').slice(1).join(':'), intern: 'transistor', verwijzing: ref(B.besturing, 160), bron: [k, `OUT${n + 1}`] })),
    { klem: 'GND', functie: 'M: 0 V (uitgangskant)', kabel: '0,14 mm²', extern: '-X6', externAansl: 'J3:22', intern: 'emitters', verwijzing: ref(B.besturing, 40), bron: [k, 'GND'] },
  ]]])),
};
export { KLEMMEN };

const schema = [voeding(), uitgangen(), ingangen(), besturing()].map((b) => ({ ...b, soort: SOORT.schema[0], soortNaam: SOORT.schema[1] }));
const klemmen = Object.entries(KLEMMEN).map(([s, [oms, rijen]]) => ({ titel: ['Klemmenplan', s], soort: SOORT.klemmen[0], soortNaam: SOORT.klemmen[1], inhoud: klemmenplan(s, oms, rijen) }));
const stuk = { titel: 'Stuklijst', soort: SOORT.stuk[0], soortNaam: SOORT.stuk[1], inhoud: stuklijst(STUKLIJST) };
const voor = { titel: 'Titelblad', soort: SOORT.titel[0], soortNaam: SOORT.titel[1] };
const inhoud = { titel: 'Inhoudsopgave', soort: SOORT.inhoud[0], soortNaam: SOORT.inhoud[1] };
const alle = [voor, inhoud, ...schema, ...klemmen, stuk];
alle.forEach((b, k) => { b.nr = k + 1; });

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  voor.inhoud = titelblad(PROJECT, [
    ['Klant', 'eigen gebruik (modelbaan)'], ['Tekeningnummer', PROJECT.tekeningnr], ['Fabrikant', 'zelfbouw met kant-en-klare modules'], ['Projectverantwoordelijke', 'Ian'],
    ['Projectstart', '2026-11-08'], ['Projectnaam', 'Treinbaan, kabeldoos verlichting'], ['Revisie 3', '2026-11-13: kant-en-klare modules (versie 4)'],
  ], [
    ['Installatie', '=TRN verlichting modelbaan'], ['Plaats', '+DOOS kabeldoos onder de baan'], ['Voedingsspanning', '230 V AC (in de netadapter) → 12 V DC'],
    ['Stuurspanning', '5 V DC en 3,3 V DC'], ['Beschermingsgraad', 'IP20 (binnen)'], ['Potentialen', 'J+, L+ en S12 12 V, L5 5 V, L3 3,3 V, M 0 V'], ['Bouwjaar', '2026'],
  ], { normen: NORMEN, bladen: alle.length });
  inhoud.inhoud = inhoudsopgave(PROJECT, alle);
  const svgs = project(PROJECT, alle);
  await schrijf(HERE, 'Aansluitschema kabeldoos treinverlichting', svgs);
  console.log(`geschreven: blad-1..${svgs.length}.svg en schema.html`);
}
export { J1, J3, MODULES };
