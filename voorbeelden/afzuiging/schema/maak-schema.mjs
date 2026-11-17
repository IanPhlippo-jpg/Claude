// Aansluitschema van de afzuiging zoals EPLAN Electric P8 het afdrukt, volgens IEC/EN 61082-1, 60617 en 81346 (zie
// voorbeelden/lib/eplan.mjs). Aanduidingen volgens ISO/IEC 81346-2: -T netadapter en regelaar, -F zekering,
// -Q schakelen (hoofdschakelaar -Q4, transistoren, MOSFET), -R weerstanden en de diode, -C condensatoren, -M ventilator,
// -K besturing (ESP32-C3), -B drukmeter, -S de knop, -U de print in de voedingsbox, -X klemmen, stekkers en de
// adapterprint, -W kabels. Potentialen L+ (24 V), L5 (5 V), L3 (3,3 V) en M (0 V); kruisverwijzing /blad.kolom.
// Gebruik: node voorbeelden/afzuiging/schema/maak-schema.mjs   (schrijft blad-N.svg en schema.html; de PDF maakt
// e2e/tools/schema-pdf.mjs)
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REVISIE } from '../revisie.mjs';
import { PRINT, ONDERDELEN as PRINTDELEN, DRADEN, NETTEN, VAST, OP_PENNEN, cel, gx, gz, controleer } from './print-u1.mjs';
import {
  X0, X1, T, L, punt, rect, weerstand, weerstandH, condensator, zekering, schakelaar, diode, klem, npn, pmos, motor, toestel,
  rail, onderbreking, ref, tabel, titelblad, inhoudsopgave, klemmenplan, stuklijst, project, schrijf, SOORT, NORMEN,
} from '../../lib/eplan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PROJECT = {
  naam: 'Afzuiging Lush Beauty', omschrijving: `inbouw nagelstofafzuiging, versie ${REVISIE.versie}`, eigenaar: 'Ian', tekeningnr: 'AFZ-E01',
  installatie: '=AFZ', installatieNaam: 'nagelstofafzuiging', plaats: '+BOX', plaatsNaam: 'voedingsbox onder het blad',
  datum: REVISIE.datum, getekend: 'Phlippo CAD', gecontroleerd: 'Ian', norm: 'IEC 81346', revisie: { index: REVISIE.versie, datum: REVISIE.datum, naam: 'PC' },
};
const B = { voeding: 3, ventilator: 4, besturing: 5 };
/** diode in sperrichting (de kathode boven): van y tot y + 14 */
const diodeOp = (x, y, code, waarde) => [L([[x, y], [x, y + 4.5]]), L([[x - 3, y + 4.5], [x + 3, y + 4.5]], { w: 0.5 }),
  `<polygon points="${x},${y + 4.5} ${x - 3},${y + 9.5} ${x + 3},${y + 9.5}" fill="none" stroke="#000" stroke-width="0.35"/>`, L([[x, y + 9.5], [x, y + 14]]),
  T(x + 5, y + 6, code, { size: 2.8 }), T(x + 5, y + 9.3, waarde, { size: 2.3 })].join('');
const RECHTS = X1 - 5;
/** weerstand verticaal van (x, y) naar (x, y + 20), de aanduiding rechts (waar links een andere lijn loopt) */
const weerstandR = (x, y, code, waarde) => [L([[x, y], [x, y + 6]]), rect(x - 1.5, y + 6, 3, 8), L([[x, y + 14], [x, y + 20]]), T(x + 3, y + 9, code, { size: 2.8 }), T(x + 3, y + 12.2, waarde, { size: 2.3 })].join('');
const DUN = { w: 0.25 }, DIK = { w: 0.35 };

/** beschermingsaarde (IEC 60417-5019): aardteken in een cirkel, met de aansluiting bovenaan op (x, y) */
const aarde = (x, y) => [L([[x, y], [x, y + 3]]), L([[x - 2.2, y + 3], [x + 2.2, y + 3]], { w: 0.35 }), L([[x - 1.4, y + 4], [x + 1.4, y + 4]], { w: 0.35 }),
  L([[x - 0.6, y + 5], [x + 0.6, y + 5]], { w: 0.35 }), `<circle cx="${x}" cy="${y + 3.8}" r="3.4" fill="none" stroke="#000" stroke-width="0.3"/>`].join('');
/** draadlabel boven een verbinding: doorsnede en kleur (IEC 61082-1: de gegevens bij de verbinding zelf) */
const draad = (x, y, s, anchor = 'start') => T(x, y - 1.3, s, { size: 2.0, anchor, italic: true });

function voeding() {
  const i = [];
  const yp = 80, ym = 200;
  // 7.4 (P2-18): de netzijde. Stopcontact (randaarde) -> netsnoer -W3 (C13, vergrendeld) -> C14-inlaat van -T1 (klasse I)
  i.push(toestel(25, 62, 25, 45, '', ['stopcontact', '230 V AC', '50 Hz', 'randaarde'], [{ x: 25, y: 10, naam: 'L' }, { x: 25, y: 20, naam: 'N' }, { x: 25, y: 35, naam: 'PE' }]));
  for (const [y, t] of [[72, 'L  bruin  1,0 mm²'], [82, 'N  blauw  1,0 mm²'], [97, 'PE  groen/geel  1,0 mm²']]) i.push(L([[50, y], [92, y]], DIK), draad(52, y, t));
  i.push(L([[80.5, 101], [86.5, 68]], { w: 0.25 }), T(79.5, 66.5, '-W3', { size: 2.8, anchor: 'end' }));
  i.push(toestel(92, 55, 50, 80, '-T1', ['Netadapter (in de box)', 'Mean Well GST90A24-P1M', 'klasse I, C14-inlaat', '230 V AC, 50 Hz', '24 V DC, 3,75 A (90 W)'],
    [{ x: 0, y: 17, naam: 'L' }, { x: 0, y: 27, naam: 'N' }, { x: 0, y: 42, naam: 'PE' }, { x: 50, y: 25, naam: '+' }, { x: 50, y: 65, naam: '−' }]));
  i.push(L([[92, 97], [101, 97], [101, 101]]), aarde(101, 101), T(106, 104, 'FG: behuizing', { size: 2.1 }));
  i.push(T(101, 117, '−V niet aan FG:', { size: 2.1 }), T(101, 120.4, '24 V-zijde zwevend', { size: 2.1 }), T(101, 123.8, '(SELV)', { size: 2.1 }));
  i.push(T(25, 146, '-W3: netsnoer randaardestekker naar C13, vergrendeld (IEC-lock), 3 x 1,0 mm², 1,5 m', { size: 2.3 }));
  i.push(T(25, 150.5, '230 V AC alleen in -W3 en in de gekeurde adapter -T1 (klasse I): geen eigen bedrading op 230 V.', { size: 2.3 }));
  i.push(T(25, 155, 'PE alleen aan de behuizing van -T1; de 24 V-zijde (L+, M) blijft zwevend en wordt nergens geaard.', { size: 2.3 }));
  // DC-kabel van de adapter op de schroefklem -X1
  const xx = 180, xr = 190, xq = 200, xf = 228, xa = 252;
  i.push(L([[142, yp], [xx - 1.2, yp]], DIK), L([[142, 120], [150, 120], [150, ym], [xx - 1.2, ym]], DIK));
  i.push(T(146, yp - 6.5, '+ en − nameten', { size: 2.1 }), draad(146, yp, 'DC-kabel -T1, ingekort'));
  i.push(klem(xx, yp, '-X1', '1'), klem(xx, ym, '-X1', '2'));
  // 7.4: -R13 direct op de pennen van -X1 (soldeerzijde), dus vóór -Q4 en -F1: bij ompoling loopt de stroom alleen door
  // de adapter en -R13 (P3-5); de kathode (ring) aan +
  i.push(L([[xx + 1.2, yp], [xq, yp]], DIK), punt(xr, yp), L([[xr, yp], [xr, 120]]), diodeOp(xr, 120, '-R13', 'SB560'), L([[xr, 134], [xr, ym]]), punt(xr, ym));
  ['op de pennen van -X1', 'ompoling: -R13 geleidt,', 'de adapter gaat in hiccup', 'en blijft daar tot de', 'stekker eruit gaat;', '-F1 ziet die stroom niet'].forEach((r, n) => i.push(T(xr + 5, 136.5 + n * 3.4, r, { size: 2.2 })));
  // hoofdschakelaar -Q4 in de achterwand van de box (7.4), maakcontact, getekend in rust; twee draden 0,5 mm² rood
  i.push(schakelaar(xq, yp, '-Q4', 'aan/uit, achterwand box'), L([[xq + 20, yp], [xf, yp]], DIK));
  i.push(T(xq + 10, yp - 13.5, '-Q4: 2 draden 0,5 mm² rood', { size: 2.0, anchor: 'middle', italic: true }));
  i.push(zekering(xf, yp, '-F1', 'T 3,15 A, 72 V DC'), L([[xf + 20, yp], [xa, yp]], DIK));
  i.push(L([[xx + 1.2, ym], [xa, ym]], DIK));
  i.push(rail(yp, xa, RECHTS, 'L+', { naar: `${ref(B.ventilator, X0)}  ${ref(B.besturing, X0)}` }), rail(ym, xa, RECHTS, 'M', { naar: `${ref(B.ventilator, X0)}  ${ref(B.besturing, X0)}` }));
  i.push(draad(262, yp, 'L+ op -U1: draadbrug 0,5 mm²'), draad(262, ym, 'M op -U1: draadbrug 0,5 mm²'));
  // -C2 vlak bij VIN van -T3 (Pololu: minstens 33 µF boven 20 V); geen grote elco achter -Q4 (7.4, P3-6)
  i.push(punt(285, yp), L([[285, yp], [285, 152]]), condensator(285, 152, '-C2', '47 µF / 50 V'), L([[285, 168], [285, ym]]), punt(285, ym));
  i.push(punt(320, yp), L([[320, yp], [320, 140]]), toestel(310, 140, 40, 26, '-T3', ['Pololu D24V10F5', '24 V → 5 V, 1 A'], [{ x: 10, y: 0, naam: 'VIN' }, { x: 40, y: 13, naam: 'VOUT' }, { x: 20, y: 26, naam: 'GND' }]));
  i.push(L([[330, 166], [330, ym]]), punt(330, ym));
  i.push(L([[350, 153], [RECHTS, 153]], DIK), onderbreking(RECHTS, 153, 'L5', ref(B.besturing, X0), 'rechts'), draad(354, 153, '0,25 mm²'));
  i.push(T(30, 232, 'Stroom: ventilator max. 2,35 A bij 24 V; op 5 V de knop tot 0,45 A en -K1 tot 0,34 A (pieken bij het zenden), samen hoogstens 0,8 A van de 1 A van -T3.', { size: 2.5 }));
  i.push(T(30, 237, `Behalve -T1, -W3 en -Q4 zit alles op de gaatjesprint -U1 (40 x 50, blad ${BLAD_OPBOUW}); -R13 naast de print, met 2 korte draden op de pennen van -X1. Geen grote elco achter -Q4: de ventilator heeft eigen buffering.`, { size: 2.5 }));
  i.push(T(30, 242, 'Draad: 24 V en M in de box 0,5 mm² (rood +, zwart −), signalen 0,25 mm²; M8-kabel -W2 4 x 0,25 mm²; ventilator AWG 24 (blad 4).', { size: 2.5 }));
  return { titel: ['Voeding', '24 V en 5 V, netzijde'], inhoud: i };
}

function ventilator() {
  const i = [];
  const yp = 30, ym = 225, y3 = 45;
  i.push(rail(yp, X0 + 3, RECHTS, 'L+', { van: ref(B.voeding, RECHTS) }), rail(ym, X0 + 3, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  i.push(rail(y3, X0 + 3, 195, 'L3', { van: ref(B.besturing, 125) }));
  // PWM: -Q1 trekt de PWM-draad laag; -R2 naar 3,3 V houdt -Q1 aan bij het opstarten (ventilator stil)
  const xq1 = 160, yq1 = 150;
  i.push(npn(xq1, yq1, '-Q1', 'BC547'), L([[xq1 + 3, yq1 + 10], [xq1 + 3, ym]]), punt(xq1 + 3, ym));
  i.push(weerstandH(xq1 - 40, yq1, '-R1', '1 kΩ'), L([[xq1 - 20, yq1], [xq1 - 10, yq1]]));
  i.push(L([[xq1 - 40, yq1], [X0 + 5, yq1]]), onderbreking(X0 + 5, yq1, 'PWM GPIO3', ref(B.besturing, 110), 'links'));
  i.push(punt(xq1 - 13, yq1), L([[xq1 - 13, yq1], [xq1 - 13, 120]]), weerstand(xq1 - 13, 100, '-R2', '10 kΩ'), L([[xq1 - 13, 100], [xq1 - 13, y3]]), punt(xq1 - 13, y3));
  ['-Q1 keert het signaal om:', 'de firmware rekent dat om.', '-R2 naar 3,3 V: bij het', 'opstarten staat hij stil.'].forEach((r, n) => i.push(T(xq1 + 8, 172 + n * 3.6, r, { size: 2.3 })));
  // tacho: open collector, -R3 naar 3,3 V, naar GPIO4
  const xt = 195; // 7.4: links van -R6 (de lijn liep door -R6)
  i.push(punt(xt, y3), L([[xt, y3], [xt, 60]]), weerstand(xt, 60, '-R3', '10 kΩ'), L([[xt, 80], [xt, 125]]), punt(xt, 125));
  // RC-filter bij GPIO4 (sinds 7.2: -R14 1 kΩ in serie, -C3 10 nF naar M): de tachodraad loopt naast de PWM van 25 kHz.
  // 7.4 (P3-7): tachoklem na -R14, -R15 naar L3 en -R16 naar M (2 x BAT85): een sluiting tussen pen 1 (24 V) en pen 2
  // in de M8 duwt dan 20 mA via -R14 in -R15, niet in de beschermdiode van GPIO4; -R14 is daarom 0,6 W (0,42 W bij 20 mA)
  const xr14 = 100, xr15 = 84, xr16 = 66;
  i.push(L([[xt, 125], [xr14 + 20, 125]]), weerstandH(xr14, 125, '-R14', '1 kΩ, 0,6 W'), L([[xr14, 125], [X0 + 5, 125]]), onderbreking(X0 + 5, 125, 'tacho GPIO4', ref(B.besturing, 110), 'links'));
  i.push(T(xr14 + 10, 133.5, 'RC τ = 10 µs', { size: 2.2, anchor: 'middle' }));
  i.push(punt(48, 125), condensator(48, 125, '-C3', '10 nF', false), L([[48, 141], [48, ym]]), punt(48, ym));
  i.push(punt(xr16, 125), L([[xr16, 125], [xr16, 132]]), diodeOp(xr16, 132, '-R16', 'BAT85'), L([[xr16, 146], [xr16, ym]]), punt(xr16, ym));
  i.push(punt(xr15, y3), L([[xr15, y3], [xr15, 100]]), diodeOp(xr15, 100, '-R15', 'BAT85'), L([[xr15, 114], [xr15, 125]]), punt(xr15, 125));
  ['tachoklem -R15/-R16 (7.4): een sluiting tussen pen 1 (24 V) en pen 2', 'in de M8 duwt 20 mA via -R14 in -R15 naar 3,3 V, niet in GPIO4;',
    '-K1 trekt meer dan 20 mA uit 3,3 V, dus L3 stijgt niet.'].forEach((r, n) => i.push(T(72, 190 + n * 3.6, r, { size: 2.2 })));
  // -Q2 (P-FET) schakelt de 24 V naar de ventilator; -Q3 trekt de gate laag als GPIO7 hoog is. Zonder besturing
  // (5 V weg, reset, flashen) houdt -R11 de basis laag: -Q2 open, de ventilator spanningsloos
  const xk = 270, xk2 = 315, xs = 256;
  i.push(punt(xs, yp), L([[xs, yp], [xs, 46]], DIK), pmos(253, 58, '-Q2', 'IRF4905'));
  i.push(L([[xs, 70], [xs, 95], [xk - 1.2, 95]], DIK));
  const xg = 238, yg = 58;
  i.push(punt(xg, yp), L([[xg, yp], [xg, 34]]), weerstand(xg, 34, '-R4', '10 kΩ'), L([[xg, 54], [xg, yg], [241, yg]]), punt(xg, yg));
  i.push(weerstand(xg, yg, '-R5', '10 kΩ'), L([[xg, yg + 20], [xg, 82]]));
  const xq3 = 235, yq3 = 92;
  i.push(npn(xq3, yq3, '-Q3', 'BC547'), L([[xq3 + 3, yq3 + 10], [xq3 + 3, ym]]), punt(xq3 + 3, ym));
  i.push(weerstandH(xq3 - 32, yq3, '-R6', '1 kΩ'), L([[xq3 - 12, yq3], [xq3 - 10, yq3]]));
  i.push(punt(xq3 - 12, yq3), L([[xq3 - 12, yq3], [xq3 - 12, 96]]), weerstandR(xq3 - 12, 96, '-R11', '10 kΩ'), L([[xq3 - 12, 116], [xq3 - 12, ym]]), punt(xq3 - 12, ym));
  i.push(L([[xq3 - 32, yq3], [X0 + 5, yq3]]), onderbreking(X0 + 5, yq3, 'aan/uit GPIO7', ref(B.besturing, 110), 'links'));
  i.push(T(268, 64, 'zonder besturing (5 V weg, reset,', { size: 2.2 }), T(268, 67.5, 'flashen): -Q2 open, ventilator stil', { size: 2.2 }));
  i.push(L([[xk - 1.2, 110], [xk - 30, 110], [xk - 30, ym]], DIK), punt(xk - 30, ym));
  i.push(L([[xq1 + 3, yq1 - 10], [xq1 + 3, 140], [xk - 1.2, 140], [xk - 1.2, 125]]));
  i.push(L([[xt, 125], [xt, 155], [xk - 1.2, 155]]));
  // 7.4: M8-stekker -X9 in de linkerwand van de box, haakse kabel -W2 (0,3 m), M8-bus -X10 verticaal in de console onderaan
  // de romp, korte draden naar de tussenstekker -X12 in de dode ruimte van de romp, de aders van de ventilator (AWG 24)
  // door de wand van de kuip: de ventilator gaat eruit zonder solderen (P3-12)
  const xx12 = 350, xm = 385;
  const W2 = { 1: 'bruin', 2: 'wit', 3: 'blauw', 4: 'zwart' }; // aderkleuren M8 4-polig (IEC 60947-5-2)
  const FAN = { 1: 'rood', 2: 'geel', 3: 'zwart', 4: 'bruin' }; // aders San Ace (datasheet)
  [[95, '1', '+24 V'], [110, '3', '0 V'], [125, '4', 'PWM'], [155, '2', 'tacho']].forEach(([y, n, f]) => {
    i.push(klem(xk, y, '-X9', n, { kant: 'links' }), klem(xk2, y, '-X10', n), klem(xx12, y, '-X12', n), L([[xk + 1.2, y], [xk2 - 1.2, y]], DIK), L([[xk2 + 1.2, y], [xx12 - 1.2, y]], DIK));
    i.push(T((xk + xk2) / 2, y - 1.3, `${f} (${W2[n]})`, { anchor: 'middle', size: 2.1 }));
    i.push(draad((xk2 + xx12) / 2 + 2, y, `${FAN[n]}, 0,25 mm²`, 'middle'), draad(xm - 18, y, `${FAN[n]}, AWG 24`, 'middle'));
  });
  i.push(T(xk, 172, '-X9 M8-stekker', { anchor: 'middle', size: 2.3 }), T(xk, 175.5, '(box, linkerwand)', { anchor: 'middle', size: 2.3 }));
  i.push(T(xk2, 172, '-X10 M8-bus', { anchor: 'middle', size: 2.3 }), T(xk2, 175.5, '(console romp,', { anchor: 'middle', size: 2.3 }), T(xk2, 179, 'naar onder)', { anchor: 'middle', size: 2.3 }));
  i.push(T(xx12, 172, '-X12', { anchor: 'middle', size: 2.3 }), T(xx12, 175.5, 'tussenstekker', { anchor: 'middle', size: 2.3 }), T(xx12, 179, '(dode ruimte)', { anchor: 'middle', size: 2.3 }));
  i.push(T((xk + xk2) / 2, 86, '-W2', { anchor: 'middle', size: 2.8 }), T((xk + xk2) / 2, 89.5, 'M8 0,3 m, haaks, 4 x 0,25 mm²', { anchor: 'middle', size: 2.1, italic: true }));
  // de ventilator: 4 aders naar de rand van de cirkel
  i.push(L([[xx12 + 1.2, 95], [xm + 3, 95], [xm + 3, 117.6]], DIK), L([[xx12 + 1.2, 110], [xm - 3, 110], [xm - 3, 117.6]], DIK));
  i.push(L([[xx12 + 1.2, 125], [xm - 8, 125]]), L([[xx12 + 1.2, 155], [xm, 155], [xm, 133]]));
  i.push(motor(xm, 125, '-M1', []), T(xm + 3, 142, 'San Ace C175', { size: 2.3 }), T(xm + 3, 145.5, '9TG24P0S01', { size: 2.3 }), T(xm + 3, 149, '24 V, 56 W', { size: 2.3 }));
  ['aders -M1 (datasheet San Ace, AWG 24): rood +, zwart −, bruin PWM (25 kHz; 0 % = stil), geel tacho (2 pulsen/omw);',
    'door de wand van de kuip naar -X12 in de dode ruimte van de romp: de ventilator gaat eruit zonder solderen.',
    '-W2: M8-kabel 0,3 m, haakse stekker en bus; aders 1 bruin, 2 wit, 3 blauw, 4 zwart (IEC 60947-5-2).',
    'In de box 0,5 mm² voor 24 V en M, 0,25 mm² voor tacho en PWM.',
    'PWM-draad los = vol toerental (datasheet): uitzetten gebeurt daarom met -Q2 (24 V weg).'].forEach((r, n) => i.push(T(250, 194 + n * 4, r, { size: 2.2 })));
  return { titel: ['Ventilator', 'M8-kabel, PWM en tacho'], inhoud: i };
}

function besturing() {
  const i = [];
  const y5 = 30, ym = 225, y3 = 40;
  i.push(rail(y5, X0 + 3, RECHTS, 'L5', { van: ref(B.voeding, RECHTS) }), rail(ym, X0 + 3, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  // -K1: ESP32-C3 in de voedingsbox
  const ax = 40, ay = 60;
  i.push(toestel(ax, ay, 70, 120, '-K1', ['ESP32-C3 SuperMini', 'in de voedingsbox', 'USB-C rechts', '(flashen)'], [
    { x: 0, y: 20, naam: '5V' }, { x: 0, y: 100, naam: 'GND' }, { x: 70, y: 20, naam: '3V3' },
    { x: 70, y: 50, naam: 'GPIO5 SDA' }, { x: 70, y: 60, naam: 'GPIO6 SCL' },
    { x: 70, y: 85, naam: 'GPIO4 tacho' }, { x: 70, y: 95, naam: 'GPIO3 PWM' }, { x: 70, y: 107, naam: 'GPIO7 aan/uit' },
  ]));
  // -R12: Schottky-diode in de 5 V naar -K1; een computer aan de USB-C van -K1 voedt zo niet terug in -T3 en de knop
  i.push(punt(30, y5), L([[30, y5], [30, 44]], DIK), diode(30, 44, '-R12', '1N5819'), L([[30, 58], [30, ay + 20], [ax, ay + 20]], DIK));
  i.push(L([[ax, ay + 100], [30, ay + 100], [30, ym]], DIK), punt(30, ym));
  // 3V3 van -K1 -> L3
  const px = ax + 70;
  i.push(L([[px, ay + 20], [125, ay + 20], [125, y3], [300, y3]], DIK), onderbreking(300, y3, 'L3', ref(B.ventilator, X0)), T(130, y3 - 1.5, '3,3 V uit -K1', { size: 2.3 }));
  // aan/uit, PWM en tacho naar blad 4
  i.push(L([[px, ay + 85], [150, ay + 85]]), onderbreking(150, ay + 85, 'tacho (-R3)', ref(B.ventilator, 195), 'rechts'));
  i.push(L([[px, ay + 95], [150, ay + 95]]), onderbreking(150, ay + 95, 'PWM (-R1)', ref(B.ventilator, 120), 'rechts'));
  i.push(L([[px, ay + 107], [150, ay + 107]]), onderbreking(150, ay + 107, 'aan/uit (-R6)', ref(B.ventilator, 203), 'rechts'));
  // I2C met pull-ups naar L3 en de drukmeter
  i.push(punt(140, y3), L([[140, y3], [140, 55]]), weerstand(140, 55, '-R7', '4,7 kΩ'), L([[140, 75], [140, ay + 50]]), punt(140, ay + 50));
  i.push(punt(155, y3), L([[155, y3], [155, 55]]), weerstand(155, 55, '-R8', '4,7 kΩ'), L([[155, 75], [155, ay + 60]]), punt(155, ay + 60));
  i.push(L([[px, ay + 50], [190, ay + 50]]), T(165, ay + 48.5, 'SDA', { size: 2.3 }));
  i.push(L([[px, ay + 60], [190, ay + 60]]), T(165, ay + 58.5, 'SCL', { size: 2.3 }));
  const bx = 190, by = ay - 10;
  i.push(toestel(bx, by, 62, 72, '-B1', ['Sensirion SDP810-500Pa', 'verschildruk ±500 Pa', 'I2C-adres 0x25'], [
    { x: 0, y: 30, naam: 'VDD' }, { x: 0, y: 60, naam: 'SDA' }, { x: 0, y: 70, naam: 'SCL' }, { x: 62, y: 66, naam: 'GND' },
  ]));
  i.push(L([[180, y3], [180, by + 30], [bx, by + 30]]), punt(180, y3));
  i.push(L([[bx + 62, by + 66], [262, by + 66], [262, ym]]), punt(262, ym));
  // drukpoorten (pneumatisch, geen elektrische verbinding): streepjeslijn
  const poort = (y, t1, t2) => [L([[bx + 62, y], [bx + 74, y]], { w: 0.5, streep: '2 1.5' }), `<circle cx="${bx + 75.5}" cy="${y}" r="1.5" fill="#fff" stroke="#000" stroke-width="0.35"/>`, T(bx + 3, y - 1, t1, { size: 2.1 }), T(bx + 3, y + 2.6, t2, { size: 2.1 })].join('');
  i.push(poort(by + 22, 'poort "+": kamerdruk, afgeschermd', '(slangetje 10 cm, propje vlies)'), poort(by + 44, 'poort "−": slang naar de afzuiging', '(ruimte onder het filter)'));
  // USB-C-koppeling naar de knop: -X8 in de voedingsbox, kabel -W1, -X7 in de knophouder, knop -S1
  const xu = 290, yu = 150;
  i.push(toestel(xu, yu, 22, 40, '-X8', [], [{ x: 0, y: 8, naam: 'VBUS' }, { x: 0, y: 18, naam: 'CC1' }, { x: 0, y: 26, naam: 'CC2' }, { x: 0, y: 34, naam: 'GND' }, { x: 22, y: 8, naam: 'VBUS' }, { x: 22, y: 34, naam: 'GND' }]),
    T(xu + 11, yu + 46, 'USB-C-bus', { anchor: 'middle', size: 2.2 }), T(xu + 11, yu + 49.5, 'in de voedingsbox', { anchor: 'middle', size: 2.2 }));
  i.push(punt(282, y5), L([[282, y5], [282, yu + 8], [xu, yu + 8]]));
  i.push(punt(276, y5), L([[276, y5], [276, yu - 12]]), weerstand(276, yu - 12, '-R9', '56 kΩ'), L([[276, yu + 8], [276, yu + 18], [xu, yu + 18]]));
  i.push(punt(270, y5), L([[270, y5], [270, yu - 30]]), weerstand(270, yu - 30, '-R10', '56 kΩ'), L([[270, yu - 10], [270, yu + 26], [xu, yu + 26]]));
  i.push(L([[xu, yu + 34], [285, yu + 34], [285, ym]]), punt(285, ym));
  // kabel en knop
  i.push(L([[xu + 22, yu + 8], [340, yu + 8]], DIK), L([[xu + 22, yu + 34], [340, yu + 34]], DIK));
  i.push(T(326, yu + 4, '-W1', { anchor: 'middle', size: 2.8 }), T(326, yu + 42, 'USB-C-kabel C-C', { anchor: 'middle', size: 2.2 }), T(326, yu + 45.5, '1 m, in de sleuf', { anchor: 'middle', size: 2.2 }));
  i.push(toestel(340, yu, 18, 40, '-X7', [], [{ x: 0, y: 8, naam: '' }, { x: 0, y: 34, naam: '' }, { x: 18, y: 8, naam: 'VBUS' }, { x: 18, y: 20, naam: 'D+/D−' }, { x: 18, y: 34, naam: 'GND' }]),
    T(349, yu + 46, 'zijwand onder', { anchor: 'middle', size: 2.2 }), T(349, yu + 49.5, 'knophouder', { anchor: 'middle', size: 2.2 }));
  i.push(toestel(366, yu - 6, 40, 56, '-S1', ['VIEWE-knop 1,5"', 'ESP32-S3, AMOLED', 'in de knophouder', 'via -X11 (FPC)'], [
    { x: 0, y: 14, naam: '1 +5V' }, { x: 0, y: 26, naam: '9/10 USB' }, { x: 0, y: 40, naam: '3 GND' },
  ]));
  i.push(L([[358, yu + 8], [366, yu + 8]]), L([[358, yu + 20], [366, yu + 20]]), L([[358, yu + 34], [366, yu + 34]]));
  // draadloos (geen draad): streep-stippellijn
  i.push(L([[ax + 35, ay + 120], [ax + 35, 206], [386, 206], [386, yu + 50]], { w: 0.25, streep: '2.5 1.5' }));
  i.push(T(160, 204, 'ESP-NOW (2,4 GHz): opdrachten van -S1 naar -K1, status terug', { anchor: 'middle', size: 2.3 }));
  i.push(T(30, 236, '-X7: USB-C-printje (5,1 kΩ op CC) in de zijwand onderaan de knophouder, 4 draden naar de adapterprint -X11: VBUS -> FPC 1, GND -> FPC 3, D+ -> FPC 9, D− -> FPC 10.', { size: 2.3 }));
  i.push(T(30, 241, 'Met de kabel naar -X8 krijgt de knop 5 V; op een computer aangesloten wordt hij geflasht. D+/D− van -X8 blijven los.', { size: 2.3 }));
  return { titel: ['Besturing', 'drukmeter en de knop'], inhoud: i };
}

/** opbouwblad (sinds versie 7.2): opbouw van de gaatjesprint -U1, schaal 4:1, onderdeelzijde, met de draadbruggen (soldeerzijde,
 *  gestreept) per net en de netlijst ernaast */
function opbouw() {
  const tel = controleer();
  const i = [];
  const S = 4, ox = 40, oy = 36; // schaal en de linkerbovenhoek van de print op het blad
  const P = (x, z) => [ox + S * x, oy + S * z];
  const [pw, ph] = [PRINT.b * S, PRINT.h * S];
  i.push(rect(ox, oy, pw, ph, { w2: 0.5, vul: '#f3efe6' }));
  for (const [hx, hz] of PRINT.hoekgaten) { const [x, y] = P(hx, hz); i.push(`<circle cx="${x}" cy="${y}" r="${S}" fill="#fff" stroke="#000" stroke-width="0.3"/>`); }
  for (let a = 0; a < PRINT.ni; a++) for (let b = 0; b < PRINT.nj; b++) { const [x, y] = P(gx(a), gz(b)); i.push(`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="0.9" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="0.2"/>`); }
  // draadbruggen per net (soldeerzijde): telkens het goedkoopste paar (verbonden pen, nog niet verbonden pen). De weg loopt
  // langs het raster met één of twee knikken (L of Z); kost = lengte + W_PEN per pen waar ze over loopt + W_SAMEN per stuk
  // dat samenvalt met een brug van een ander net, + 20 mm per gaatje naast een hoekgat, + 500 mm voor een knik op een pen (7.4;
  // gewichten vergeleken van 0/0 (zoals tot 7.3: 68 keer over een pen, 52 stukken samen) tot 100/300; met de vaste bruggen
  // van VAST geeft 20/30 13 keer over een pen en 9 stukken samen; hogere gewichten ruilen het ene voor het andere). Over een pen van een ander net tekent pad()
  // een boogje; onderaan (transistoren en weerstanden dicht opeen) is dat niet te vermijden zonder de opstelling te herzien.
  const pennen = new Set([...PRINTDELEN.flatMap((o) => Object.values(o.pennen)), ...DRADEN.filter((d) => !d.op).map((d) => d.cel)].map((c) => c.join(',')));
  const ogen = new Set(DRADEN.filter((d) => !d.op).map((d) => d.cel.join(','))); // soldeerogen: een brug erover leest als een verbinding
  const brug = { n: 0, over: 0, samen: 0 };
  const netVan = new Map(Object.entries(NETTEN).flatMap(([n, refs]) => refs.map((r) => [cel(r).join(','), n])));
  const [W_PEN, W_SAMEN] = (process.env.BRUG_GEWICHT ?? '20,30').split(',').map(Number);
  const gebruikt = new Map(); // rasterstuk 'i,j|i,j' -> net
  const stukken = (k) => {
    const r = [];
    for (let n = 0; n < k.length - 1; n++) {
      const [p, q] = [k[n], k[n + 1]], [di, dj] = [Math.sign(q[0] - p[0]), Math.sign(q[1] - p[1])];
      for (let c = p; c[0] !== q[0] || c[1] !== q[1];) { const d = [c[0] + di, c[1] + dj]; r.push([c, d].map((x) => x.join(',')).sort().join('|')); c = d; }
    }
    return r;
  };
  const weg = (a, b, net) => {
    const kandidaten = [[a, [b[0], a[1]], b], [a, [a[0], b[1]], b]];
    if (a[0] !== b[0]) for (let r = 0; r < PRINT.nj; r++) kandidaten.push([a, [a[0], r], [b[0], r], b]); // geen weg die op zichzelf terugloopt
    if (a[1] !== b[1]) for (let c = 0; c < PRINT.ni; c++) kandidaten.push([a, [c, a[1]], [c, b[1]], b]);
    let best = null;
    for (const k of kandidaten) {
      const bezocht = new Set();
      let lengte = 0;
      for (let n = 0; n < k.length - 1; n++) {
        const [p, q] = [k[n], k[n + 1]], [di, dj] = [Math.sign(q[0] - p[0]), Math.sign(q[1] - p[1])];
        lengte += Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]);
        for (let c = [p[0] + di, p[1] + dj]; c[0] !== q[0] || c[1] !== q[1]; c = [c[0] + di, c[1] + dj]) bezocht.add(c.join(','));
        if (n < k.length - 2) bezocht.add(q.join(','));
      }
      bezocht.delete(a.join(',')); bezocht.delete(b.join(','));
      const samen = stukken(k).filter((e) => gebruikt.has(e) && gebruikt.get(e) !== net).length;
      const vreemd = [...bezocht].filter((c) => pennen.has(c) && netVan.get(c) !== net);
      const over = vreemd.length + 3 * vreemd.filter((c) => ogen.has(c)).length;
      const hoek = [...bezocht].filter((c) => { const [ci, cj] = c.split(',').map(Number); return PRINT.hoekgaten.some(([hx, hz]) => Math.hypot(gx(ci) - hx, gz(cj) - hz) < 3.5); }).length;
      const knikOpPen = k.slice(1, -1).filter((c) => pennen.has(c.join(',')) && netVan.get(c.join(',')) !== net).length; // een knik op een pen leest als verbinding
      const kost = lengte * PRINT.steek + W_PEN * over + W_SAMEN * samen + 20 * hoek + 500 * knikOpPen + (k.length - 3) * 0.5;
      if (!best || kost < best.kost) best = { kost, k, over, samen };
    }
    return best;
  };
  // een brug die over de pen van een ander net loopt, krijgt daar een boogje (geen verbinding)
  const pad = (k, net) => {
    const R = 2;
    const xy = (c) => P(gx(c[0]), gz(c[1]));
    let d = `M${xy(k[0]).map((v) => v.toFixed(2)).join(',')}`;
    for (let n = 0; n < k.length - 1; n++) {
      const [p, q] = [k[n], k[n + 1]], [di, dj] = [Math.sign(q[0] - p[0]), Math.sign(q[1] - p[1])];
      for (let c = [p[0] + di, p[1] + dj]; c[0] !== q[0] || c[1] !== q[1]; c = [c[0] + di, c[1] + dj]) {
        const sleutel = c.join(',');
        if (!pennen.has(sleutel) || netVan.get(sleutel) === net) continue;
        const [x, y] = xy(c);
        d += ` L${(x - di * R).toFixed(2)},${(y - dj * R).toFixed(2)} A${R},${R} 0 0 1 ${(x + di * R).toFixed(2)},${(y + dj * R).toFixed(2)}`;
      }
      d += ` L${xy(q).map((v) => v.toFixed(2)).join(',')}`;
    }
    return d;
  };
  for (const [net, refs] of Object.entries(NETTEN)) {
    const cs = refs.map((r) => cel(r));
    // zwart-wit (IEC 61082-1): de soort net uit de lijn: L+ dik doorgetrokken, M dik gestreept, voedingen streep-stip, signalen dun
    const stijl = ['L+', 'X1+', 'Q4', 'FAN+'].includes(net) ? 'stroke-width="0.8"' : net === 'M' ? 'stroke-width="0.8" stroke-dasharray="2.5 1.2"'
      : ['L5', '5V K1', 'L3'].includes(net) ? 'stroke-width="0.5" stroke-dasharray="3 1 0.8 1"' : 'stroke-width="0.35" stroke-dasharray="1.5 1"';
    // eerst de vaste bruggen (VAST): hun pennen gelden als verbonden, elke rastercel erop als aansluitpunt
    const vast = VAST[net] ?? [];
    const opVast = new Set(vast.flatMap((k) => stukken(k).flatMap((e) => e.split('|'))));
    for (const k of vast) {
      i.push(`<path d="${pad(k, net)}" fill="none" stroke="#000" ${stijl} stroke-opacity="0.75"/>`);
      for (const e of stukken(k)) gebruikt.set(e, net);
    }
    const in_ = vast.length ? [...opVast].map((c) => c.split(',').map(Number)) : [cs[0]];
    const uit = cs.filter((c) => !in_.some((x) => x[0] === c[0] && x[1] === c[1])).filter((c, n, a) => a.findIndex((x) => x.join(',') === c.join(',')) === n);
    while (uit.length) {
      let best = null;
      in_.forEach((a) => uit.forEach((b, ib) => { const w = weg(a, b, net); if (!best || w.kost < best.kost) best = { ...w, ib }; }));
      const b = uit.splice(best.ib, 1)[0];
      for (const e of stukken(best.k)) gebruikt.set(e, net);
      brug.over += best.over; brug.samen += best.samen; brug.n++;
      if (process.env.BRUG_GEWICHT && (best.over || best.samen)) console.log(net, JSON.stringify(best.k), 'over', best.over, 'samen', best.samen);
      i.push(`<path d="${pad(best.k, net)}" fill="none" stroke="#000" ${stijl} stroke-opacity="0.75"/>`);
      in_.push(b);
    }
  }
  // onderdelen: omtrek, aanduiding en de pennen
  for (const o of PRINTDELEN) {
    const [i0, j0, i1, j1] = o.omtrek;
    const [x0, y0] = P(gx(i0) - 1.1, gz(j0) - 1.1), [x1, y1] = P(gx(i1) + 1.1, gz(j1) + 1.1);
    if (o.rond) { const [cx, cy] = P((gx(i0) + gx(i1)) / 2, (gz(j0) + gz(j1)) / 2); i.push(`<circle cx="${cx}" cy="${cy}" r="${o.rond * S}" fill="none" stroke="#000" stroke-width="0.45"/>`); }
    else i.push(rect(x0, y0, x1 - x0, y1 - y0, { w2: 0.45 }));
    const groot = (x1 - x0) > 20;
    // 7.4: een onderdeel op één rij (transistoren): aanduiding en type samen onder de pennen, niet over de middelste pen
    if (groot && j0 === j1) i.push(T((x0 + x1) / 2, (y0 + y1) / 2 + 3.7, `${o.code}  ${o.naam}`, { anchor: 'middle', size: 2.2, bold: true }));
    else {
      i.push(T((x0 + x1) / 2, (y0 + y1) / 2 + (groot ? 0 : -0.5), o.code, { anchor: 'middle', size: groot ? 3.2 : 2.2, bold: true }));
      if (groot && o.naam) i.push(T((x0 + x1) / 2, (y0 + y1) / 2 + 4, o.naam, { anchor: 'middle', size: 2.4 }));
    }
    for (const [pn, [a, b]] of Object.entries(o.pennen)) {
      const [x, y] = P(gx(a), gz(b));
      i.push(`<circle cx="${x}" cy="${y}" r="1.3" fill="#000"/>`, o.stil ? '' : T(x + 1.6, y - 1.2, pn, { size: 1.7 }));
    }
  }
  for (const d of DRADEN.filter((x) => !x.op)) { const [x, y] = P(gx(d.cel[0]), gz(d.cel[1])); i.push(`<rect x="${x - 1.4}" y="${y - 1.4}" width="2.8" height="2.8" fill="#fff" stroke="#000" stroke-width="0.4"/>`, T(x + 1.8, y + 3.4, d.code, { size: 1.8 })); }
  // 7.4: diodes aan de soldeerzijde op twee pennen (gestreept: onder de print), de ring (kathode) aan de kant van 'ring'
  for (const d of OP_PENNEN) {
    const [a, b] = [cel(d.van), cel(d.naar)].map((c) => P(gx(c[0]), gz(c[1])));
    const hoek = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const r = d.ring === d.van ? 3.6 : len - 3.6;
    i.push(`<g transform="translate(${a[0].toFixed(2)} ${a[1].toFixed(2)}) rotate(${hoek.toFixed(2)})">${rect(2, -2.6, len - 4, 5.2, { streep: '1.2 0.8', w2: 0.4 })}${L([[r, -2.6], [r, 2.6]], { w: 0.9 })}</g>`);
    const [dx, dy, anchor] = d.label ?? [0, 0.8, 'middle'];
    i.push(T((a[0] + b[0]) / 2 + dx, (a[1] + b[1]) / 2 + dy, d.code, { size: 2.2, anchor, bold: true }));
  }
  i.push(T(ox, oy - 5, 'Gaatjesprint -U1, 40 x 50 mm, raster 2,54 (15 x 19 gaatjes), schaal 4:1, van boven (onderdeelzijde); achterkant van de box (met -Q4) boven', { size: 2.6, bold: true }));
  i.push(T(ox, oy + ph + 6, 'Zwarte stip = pen; vierkant = soldeeroog voor een draad naar buiten; lijn = draadbrug aan de soldeerzijde: dik = L+ en 24 V, dik gestreept = M, streep-stip = 5 V en 3,3 V, dun gestreept = signaal; boogje = loopt over een pen zonder verbinding.', { size: 2.2 }));
  i.push(T(ox, oy + ph + 10, `Controle door maak-schema.mjs: ${tel.gaatjes} gaatjes, geen dubbel, niets bij de hoekgaten, ${tel.netten} netten, elke pen in precies één net.`, { size: 2.2 }));
  i.push(T(ox, oy + ph + 14, 'Draadbruggen in geïsoleerd draad (ze kruisen elkaar en lopen over soldeerpunten): 0,25 mm² voor signalen; L+, M en de draad naar -X9:1 met 0,5 mm² (2,35 A).', { size: 2.2 }));
  i.push(T(ox, oy + ph + 18, 'Gestreept = aan de soldeerzijde op twee pennen: -R13 (SB560, naast de print: 2 korte draden) op -X1, ring aan pen 1 (+), daar ook de draad naar -Q4:1; -R12 (1N5819) van -T3.VOUT naar -K1.5V, ring aan -K1.', { size: 2.2 }));
  // netlijst
  const nx = 225;
  let y = 40;
  i.push(T(nx, y, 'Netlijst (zoals de bladen 3 tot 5)', { size: 3, bold: true }));
  y += 5;
  for (const [net, refs] of Object.entries(NETTEN)) {
    i.push(T(nx, y, net, { size: 2.3, bold: true }), T(nx + 18, y, refs.join('  '), { size: 2.1 }));
    y += 4.6;
  }
  y += 3;
  i.push(T(nx, y, 'Draden naar buiten', { size: 3, bold: true }));
  y += 5;
  for (const d of DRADEN) { i.push(T(nx, y, `${d.code}`, { size: 2.2, bold: true }), T(nx + 22, y, `net ${d.net}, ${d.draad}${d.op ? `, op de pen ${d.op} (soldeerzijde)` : ''}`, { size: 2.2 })); y += 4; }
  y += 3;
  for (const r of ['Opbouw: eerst de draadbruggen en de lage onderdelen (weerstanden, diodes), dan de transistoren, de klem,',
    'de elco, de zekering en de regelaar; -K1 en -B1 op pinheaders (zo kunnen ze eruit). Na het solderen elke net met de',
    'multimeter doormeten tegen deze lijst, en tussen L+ en M meten (geen kortsluiting) vóór de eerste keer aan.',
    `Een echte print (PCB) maakt dit eenvoudiger en betrouwbaarder: niet ontworpen in ${REVISIE.versie} (zie Besparingen, Na te gaan).`]) { i.push(T(nx, y, r, { size: 2.2 })); y += 3.8; }
  if (process.env.BRUG_GEWICHT) console.log('bruggen', brug);
  return { titel: ['Opbouw', 'gaatjesprint -U1'], inhoud: i };
}

// klemmenplannen: een rij per klem of pin
const KLEMMEN = {
  '-X1': ['schroefklem op -U1: 24 V van de netadapter; -R13 op de pennen (soldeerzijde)', [
    { klem: '1', functie: '+24 V van de adapter', kabel: 'DC-kabel -T1', extern: '-T1', externAansl: '+', intern: '-Q4 (0,5 mm² rood), -R13 K', internAansl: '1', verwijzing: ref(B.voeding, 180) },
    { klem: '2', functie: '0 V van de adapter', kabel: 'DC-kabel -T1', extern: '-T1', externAansl: '−', intern: 'M (-R13 A, -C2, -T3)', verwijzing: ref(B.voeding, 180) },
  ]],
  '-X7': ['USB-C-bus in de knophouder', [
    { klem: 'VBUS', functie: '+5 V naar de knop', kabel: '-W1', extern: '-X8', externAansl: 'VBUS', intern: '-X11', internAansl: '1', verwijzing: ref(B.besturing, 349) },
    { klem: 'D+', functie: 'USB (flashen)', kabel: '-W1', extern: '-X8', externAansl: 'D+ (los)', intern: '-X11', internAansl: '9', verwijzing: ref(B.besturing, 349) },
    { klem: 'D−', functie: 'USB (flashen)', kabel: '-W1', extern: '-X8', externAansl: 'D− (los)', intern: '-X11', internAansl: '10', verwijzing: ref(B.besturing, 349) },
    { klem: 'GND', functie: '0 V', kabel: '-W1', extern: '-X8', externAansl: 'GND', intern: '-X11', internAansl: '3', verwijzing: ref(B.besturing, 349) },
  ]],
  '-X8': ['USB-C-bus in de voedingsbox', [
    { klem: 'VBUS', functie: '+5 V naar de knop', kabel: '-W1', extern: '-X7', externAansl: 'VBUS', intern: 'L5 (-T3)', verwijzing: ref(B.besturing, 290) },
    { klem: 'CC1', functie: 'bron 5 V (56 kΩ naar L5)', intern: '-R9', internAansl: '2', verwijzing: ref(B.besturing, 290) },
    { klem: 'CC2', functie: 'bron 5 V (56 kΩ naar L5)', intern: '-R10', internAansl: '2', verwijzing: ref(B.besturing, 290) },
    { klem: 'GND', functie: '0 V', kabel: '-W1', extern: '-X7', externAansl: 'GND', intern: 'M', verwijzing: ref(B.besturing, 290) },
  ]],
  '-X9': ['M8-inbouwstekker 4-polig in de linkerwand (kopse wand) van de box', [
    { klem: '1', functie: '+24 V ventilator (0,5 mm² rood)', kabel: '-W2 bruin', extern: '-X10', externAansl: '1', intern: '-Q2', internAansl: 'D', verwijzing: ref(B.ventilator, 270) },
    { klem: '2', functie: 'tacho (0,25 mm² geel)', kabel: '-W2 wit', extern: '-X10', externAansl: '2', intern: '-R3, -R14', verwijzing: ref(B.ventilator, 270) },
    { klem: '3', functie: '0 V (0,5 mm² zwart)', kabel: '-W2 blauw', extern: '-X10', externAansl: '3', intern: 'M', verwijzing: ref(B.ventilator, 270) },
    { klem: '4', functie: 'PWM (0,25 mm² bruin)', kabel: '-W2 zwart', extern: '-X10', externAansl: '4', intern: '-Q1', internAansl: 'C', verwijzing: ref(B.ventilator, 270) },
  ]],
  '-X10': ['M8-inbouwbus 4-polig, verticaal in de console onderaan de romp', [
    { klem: '1', functie: '+24 V ventilator', kabel: '-W2 bruin', extern: '-X9', externAansl: '1', intern: '-X12 (0,25 mm² rood)', internAansl: '1', verwijzing: ref(B.ventilator, 315) },
    { klem: '2', functie: 'tacho', kabel: '-W2 wit', extern: '-X9', externAansl: '2', intern: '-X12 (0,25 mm² geel)', internAansl: '2', verwijzing: ref(B.ventilator, 315) },
    { klem: '3', functie: '0 V', kabel: '-W2 blauw', extern: '-X9', externAansl: '3', intern: '-X12 (0,25 mm² zwart)', internAansl: '3', verwijzing: ref(B.ventilator, 315) },
    { klem: '4', functie: 'PWM', kabel: '-W2 zwart', extern: '-X9', externAansl: '4', intern: '-X12 (0,25 mm² bruin)', internAansl: '4', verwijzing: ref(B.ventilator, 315) },
  ], {
    // 7.4 (P3-12): tussenstekker in de dode ruimte van de romp; op hetzelfde blad als -X10
    strook: '-X12', omschrijving: 'tussenstekker 4-polig in de dode ruimte van de romp', rijen: [
      { klem: '1', functie: '+24 V ventilator', kabel: 'draad 0,25 mm² rood', extern: '-X10', externAansl: '1', intern: '-M1 (AWG 24)', internAansl: 'rood', verwijzing: ref(B.ventilator, 350) },
      { klem: '2', functie: 'tacho', kabel: 'draad 0,25 mm² geel', extern: '-X10', externAansl: '2', intern: '-M1 (AWG 24)', internAansl: 'geel', verwijzing: ref(B.ventilator, 350) },
      { klem: '3', functie: '0 V', kabel: 'draad 0,25 mm² zwart', extern: '-X10', externAansl: '3', intern: '-M1 (AWG 24)', internAansl: 'zwart', verwijzing: ref(B.ventilator, 350) },
      { klem: '4', functie: 'PWM', kabel: 'draad 0,25 mm² bruin', extern: '-X10', externAansl: '4', intern: '-M1 (AWG 24)', internAansl: 'bruin', verwijzing: ref(B.ventilator, 350) },
    ] }],
};
const BLAD_OPBOUW = 2 + 3 + Object.keys(KLEMMEN).length + 1;
const OPMERKINGEN = ['Opmerkingen bij de bedrading',
  '-X1 is een schroefklem 2-polig op -U1; de DC-kabel van de adapter wordt ingekort: + en − nameten. -R13 (SB560) zit aan de soldeerzijde op de pennen van -X1, de ring aan pen 1 (+).',
  'Ompoling: -R13 geleidt, de adapter gaat in hiccup en blijft daar tot de stekker eruit gaat. Niets wordt warm; -F1 ziet die stroom niet.',
  'In de afzuiging: korte draden 0,25 mm² op de M8-bus -X10 gesoldeerd (krimpkous) naar de tussenstekker -X12; de ventilator steekt erin en gaat eruit zonder solderen.',
  'Kabels onder het blad: -W2 (M8, 0,3 m, haakse stekkers) van de linkerwand van de box naar de console van de romp, het slangetje naar de module, -W1 (USB-C, 1 m) naar de knop.',
  'Een andere lengte = een andere kabel: niets knippen. -W3 (netsnoer C13, vergrendeld) van het stopcontact naar de C14-inlaat van -T1.',
  'De adapterprint -X11 (FPC-bus 10-polig 0,5 mm) zit in de knophouder; -X7 apart in de zijwand.',
  'Aders van de ventilator (AWG 24): rood +, zwart −, geel tacho, bruin PWM (datasheet San Ace); vóór het krimpen nameten.'];

export const STUKLIJST = [
  ['-T1', '1', 'Netadapter 24 V DC, 3,75 A (90 W), klasse I, C14-inlaat, 230 V AC 50 Hz', 'Mean Well GST90A24-P1M'],
  ['-W3', '1', 'Netsnoer randaardestekker (CEE 7/7) naar C13, vergrendeld (IEC-lock), 3 x 1,0 mm², 1,5 m', 'IEC-Lock C13'],
  ['-Q4', '1', 'Wipschakelaar 1-polig aan/uit, 10 A bij 30 V DC, inbouwgat 19,41 x 12,90 (paneel 2 mm), in de achterwand van de box', 'C&K D502J12S215PQA'],
  ['-F1', '1', 'Zekering traag 3,15 A, 350 V AC / 72 V DC, TE5 8,35 x 4,0 (op de print)', 'Bel Fuse 0697W3150-01'],
  ['-R12', '1', 'Schottky-diode 1 A, 40 V (DO-41), in de 5 V naar -K1, aan de soldeerzijde van -T3.VOUT naar -K1.5V (ring aan -K1)', '1N5819'],
  ['-R13', '1', 'Schottky-diode 5 A, 60 V (DO-201AD), ompolingsbeveiliging, aan de soldeerzijde op de pennen van -X1 (ring aan +)', 'SB560'],
  ['-R15, -R16', '2', 'Schottky-diode 30 V, 200 mA (DO-35), tachoklem naar 3,3 V en M (past in het raster, de BAT54S niet)', 'BAT85'],
  ['-C3', '1', 'Keramische condensator 10 nF, 50 V, steek 5 (RC-filter tacho)', '—'],
  ['-C2', '1', 'Elco 47 µF / 50 V, vlak bij VIN van -T3', '—'],
  ['-Q2', '1', 'P-kanaal-MOSFET 55 V, 74 A, 20 mΩ (TO-220), schakelt de 24 V naar de ventilator', 'Infineon IRF4905PBF'],
  ['-Q1, -Q3', '2', 'NPN-transistor BC547B (TO-92)', '—'],
  ['-R1, -R6', '2', 'Weerstand 1 kΩ 0,25 W', '—'],
  ['-R14', '1', 'Weerstand 1 kΩ 0,6 W metaalfilm (0207): 0,42 W bij een sluiting tussen pen 1 en 2 van de M8', '—'],
  ['-R2, -R3, -R4, -R5, -R11', '5', 'Weerstand 10 kΩ 0,25 W', '—'],
  ['-R7, -R8', '2', 'Weerstand 4,7 kΩ 0,25 W', '—'],
  ['-R9, -R10', '2', 'Weerstand 56 kΩ 0,25 W (USB-C-bron)', '—'],
  ['-T3', '1', 'Schakelende regelaar 24 V → 5 V, 1 A', 'Pololu D24V10F5'],
  ['-K1', '1', 'ESP32-C3 SuperMini (22,5 x 18 mm, USB-C)', '—'],
  ['-B1', '1', 'Verschildrukmeter ±500 Pa, I2C', 'Sensirion SDP810-500PA'],
  ['-X8', '1', 'USB-C-bus (breakout 6-polig, 20,3 x 12,7, 2 gaten M2)', '—'],
  ['-X9', '1', 'M8-inbouwstekker 4-polig, binder 718, achterwandmontage (M10 x 0,75), in de linkerwand van de box', '—'],
  ['-X10', '1', 'M8-inbouwbus 4-polig, binder 718, achterwandmontage (M10 x 0,75), verticaal in de console onderaan de romp', '—'],
  ['-W2', '1', 'M8-kabel 4-polig, haakse stekker - haakse bus, 0,3 m, 4 x 0,25 mm²', '—'],
  ['-X12', '1', 'Tussenstekker 4-polig draad-op-draad (bushuis, stekkerhuis, 4 + 4 krimpcontacten AWG 20 tot 24)', 'Molex Micro-Fit 3.0: 43025-0400, 43020-0400, 43030-0007, 43031-0007'],
  ['-M1', '1', 'Radiale ventilator Ø175, 24 V, 56 W, PWM, tacho, aders AWG 24', 'San Ace C175 9TG24P0S01'],
  ['-S1', '1', 'Knop 1,5" met rond AMOLED-scherm, ESP32-S3', 'VIEWE UEDX46460015-MD50E (zwart)'],
  ['-X11', '1', 'Adapterprint FPC 10-polig 0,5 mm naar 2,54 mm, 23 x 47 mm', 'FPC/FFC-breakout 10P'],
  ['-X7', '1', 'USB-C-bus (breakout 16-polig, 12 x 15, USB 2.0, 5,1 kΩ op CC)', '—'],
  ['-W1', '1', 'USB-C-kabel C-C, 1 m, haaks (USB 2.0 volstaat)', '—'],
  ['-U1', '1', 'Gaatjesprint 40 x 50 mm (gaten 2 mm)', '—'],
  ['-X1', '1', 'Printschroefklem 2-polig steek 5 mm', '—'],
  ['—', '1 m', 'Siliconeslang 3 x 5 mm (drukmeter)', '—'],
];

const schema = [voeding(), ventilator(), besturing()].map((b) => ({ ...b, soort: SOORT.schema[0], soortNaam: SOORT.schema[1] }));
const klemmen = Object.entries(KLEMMEN).map(([s, [oms, rijen, extra]], k) => ({
  titel: ['Klemmenplan', extra ? `${s} en ${extra.strook}` : s], soort: SOORT.klemmen[0], soortNaam: SOORT.klemmen[1],
  inhoud: [...klemmenplan(s, oms, rijen), ...(k === 0 ? OPMERKINGEN.map((r, n) => T(X0 + 3, 120 + n * 6, r, { size: n ? 2.5 : 3.2, bold: !n })) : []),
    ...(extra ? [T(X0 + 75, 120, `Klemmenstrook ${extra.strook}`, { size: 4.5, bold: true }), T(X0 + 150, 120, extra.omschrijving, { size: 3 }),
      tabel(X0 + 3, 132, [['Functietekst', 80], ['Kabel', 40], ['Doelaanduiding', 62], ['Aansl.', 16], ['Klem', 18], ['Brug', 12], ['Aansl.', 18], ['Doelaanduiding', 104], ['Blad/kolom', 30]],
        extra.rijen.map((r) => [r.functie, r.kabel ?? '', r.extern ?? '', r.externAansl ?? '', r.klem, r.brug ?? '', r.internAansl ?? '', r.intern ?? '', r.verwijzing ?? '']), { h: 6.2 })] : [])],
}));
const stuk = { titel: 'Stuklijst', soort: SOORT.stuk[0], soortNaam: SOORT.stuk[1], inhoud: stuklijst(STUKLIJST) };
const voor = { titel: 'Titelblad', soort: SOORT.titel[0], soortNaam: SOORT.titel[1] };
const inhoud = { titel: 'Inhoudsopgave', soort: SOORT.inhoud[0], soortNaam: SOORT.inhoud[1] };
const opb = { ...opbouw(), soort: '&ELU', soortNaam: 'Opstellingsplan (opbouw print)' };
const alle = [voor, inhoud, ...schema, ...klemmen, opb, stuk];
alle.forEach((b, k) => { b.nr = k + 1; });
voor.inhoud = titelblad(PROJECT, [
  ['Klant', 'Lush Beauty'], ['Tekeningnummer', PROJECT.tekeningnr], ['Fabrikant', 'zelfbouw'], ['Projectverantwoordelijke', 'Ian'],
  ['Projectstart', '2026-11-05'], ['Projectnaam', 'Afzuiging Lush Beauty'],
], [
  ['Installatie', '=AFZ nagelstofafzuiging in de tafel'], ['Plaats', '+BOX voedingsbox onder het blad'], ['Voedingsspanning', '230 V AC (in de netadapter) → 24 V DC'],
  ['Stuurspanning', '5 V DC en 3,3 V DC'], ['Beschermingsgraad', 'IP20 (binnen)'], ['Potentialen', 'L+ 24 V, L5 5 V, L3 3,3 V, M 0 V'], ['Bouwjaar', '2026'],
], { normen: NORMEN, bladen: alle.length });
inhoud.inhoud = inhoudsopgave(PROJECT, alle);

const svgs = project(PROJECT, alle);
await schrijf(HERE, 'Aansluitschema afzuiging Lush Beauty', svgs);
console.log(`geschreven: blad-1..${svgs.length}.svg en schema.html`);
