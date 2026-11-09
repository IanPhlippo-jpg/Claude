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
import {
  X0, X1, T, L, punt, rect, weerstand, weerstandH, condensator, zekering, schakelaar, diode, klem, npn, pmos, motor, toestel,
  rail, onderbreking, ref, titelblad, inhoudsopgave, klemmenplan, stuklijst, project, schrijf, SOORT, NORMEN,
} from '../../lib/eplan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PROJECT = {
  naam: 'Afzuiging Lush Beauty', omschrijving: `inbouw nagelstofafzuiging, versie ${REVISIE.versie}`, eigenaar: 'Ian', tekeningnr: 'AFZ-E01',
  installatie: '=AFZ', installatieNaam: 'nagelstofafzuiging', plaats: '+BOX', plaatsNaam: 'voedingsbox onder het blad',
  datum: REVISIE.datum, getekend: 'Phlippo CAD', gecontroleerd: 'Ian', norm: 'IEC 81346', revisie: { index: REVISIE.versie, datum: '2026-11-09', naam: 'PC' },
};
const B = { voeding: 3, ventilator: 4, besturing: 5 };
const RECHTS = X1 - 5;
const DUN = { w: 0.25 }, DIK = { w: 0.35 };

function voeding() {
  const i = [];
  const yp = 80, ym = 200;
  i.push(toestel(30, 60, 62, 70, '-T1', ['Netadapter (in de box)', 'Mean Well GST90A24-P1M', '230 V AC / 24 V DC, 3,75 A', 'C14-inlaat: netsnoer C13', 'naar het stopcontact'], [{ x: 62, y: 20, naam: '+' }, { x: 62, y: 60, naam: '−' }]));
  i.push(T(30, 145, '230 V AC alleen in de gekeurde adapter', { size: 2.5 }), T(30, 149, '(geen eigen bedrading op 230 V)', { size: 2.3 }));
  // DC-kabel van de adapter op de schroefklem -X1
  i.push(L([[92, yp], [128.8, yp]], DIK), L([[92, 120], [110, 120], [110, ym], [128.8, ym]], DIK));
  i.push(klem(130, yp, '-X1', '1'), klem(130, ym, '-X1', '2'), T(100, yp - 12, 'DC-kabel adapter (ingekort)', { size: 2.3 }));
  // hoofdschakelaar in de voorwand van de box (maakcontact, getekend in rust)
  i.push(L([[131.2, yp], [137, yp]], DIK), schakelaar(137, yp, '-Q4', 'aan/uit, box'), L([[157, yp], [160, yp]], DIK));
  i.push(zekering(160, yp, '-F1', 'T 3,15 A, 72 V DC'), L([[180, yp], [205, yp]], DIK));
  i.push(L([[131.2, ym], [205, ym]], DIK));
  i.push(rail(yp, 205, RECHTS, 'L+', { naar: `${ref(B.ventilator, X0)}  ${ref(B.besturing, X0)}` }), rail(ym, 205, RECHTS, 'M', { naar: `${ref(B.ventilator, X0)}  ${ref(B.besturing, X0)}` }));
  i.push(punt(250, yp), L([[250, yp], [250, 132]]), condensator(250, 132, '-C1', '470 µF / 50 V'), L([[250, 148], [250, ym]]), punt(250, ym));
  i.push(T(255, 152, 'buffert de aanloopstroom', { size: 2.3 }), T(255, 155.5, 'van de ventilator', { size: 2.3 }));
  // -C2 vlak bij VIN van -T3 (Pololu: minstens 33 µF boven 20 V)
  i.push(punt(285, yp), L([[285, yp], [285, 152]]), condensator(285, 152, '-C2', '47 µF / 50 V'), L([[285, 168], [285, ym]]), punt(285, ym));
  i.push(punt(320, yp), L([[320, yp], [320, 140]]), toestel(310, 140, 40, 26, '-T3', ['Pololu D24V10F5', '24 V → 5 V, 1 A'], [{ x: 10, y: 0, naam: 'VIN' }, { x: 40, y: 13, naam: 'VOUT' }, { x: 20, y: 26, naam: 'GND' }]));
  i.push(L([[330, 166], [330, ym]]), punt(330, ym));
  i.push(L([[350, 153], [RECHTS, 153]], DIK), onderbreking(RECHTS, 153, 'L5', ref(B.besturing, X0), 'rechts'));
  i.push(T(30, 236, 'Stroom: ventilator max. 2,35 A bij 24 V; op 5 V de knop tot 0,45 A en -K1 tot 0,34 A (pieken bij het zenden), samen hoogstens 0,8 A van de 1 A van -T3.', { size: 2.5 }));
  i.push(T(30, 242, 'Alle onderdelen behalve -T1 en -Q4 zitten op de gaatjesprint -U1 (40 x 50 mm) in de voedingsbox. Draad naar de ventilator 0,5 mm².', { size: 2.5 }));
  return { titel: ['Voeding', '24 V en 5 V'], inhoud: i };
}

function ventilator() {
  const i = [];
  const yp = 30, ym = 225, y3 = 45;
  i.push(rail(yp, X0 + 3, RECHTS, 'L+', { van: ref(B.voeding, RECHTS) }), rail(ym, X0 + 3, RECHTS, 'M', { van: ref(B.voeding, RECHTS) }));
  i.push(rail(y3, X0 + 3, 230, 'L3', { van: ref(B.besturing, 125) }));
  // PWM: -Q1 trekt de PWM-draad laag; -R2 naar 3,3 V houdt -Q1 aan bij het opstarten (ventilator stil)
  const xq1 = 160, yq1 = 150;
  i.push(npn(xq1, yq1, '-Q1', 'BC547'), L([[xq1 + 3, yq1 + 10], [xq1 + 3, ym]]), punt(xq1 + 3, ym));
  i.push(weerstandH(xq1 - 40, yq1, '-R1', '1 kΩ'), L([[xq1 - 20, yq1], [xq1 - 10, yq1]]));
  i.push(L([[xq1 - 40, yq1], [X0 + 5, yq1]]), onderbreking(X0 + 5, yq1, 'PWM GPIO3', ref(B.besturing, 110), 'links'));
  i.push(punt(xq1 - 13, yq1), L([[xq1 - 13, yq1], [xq1 - 13, 120]]), weerstand(xq1 - 13, 100, '-R2', '10 kΩ'), L([[xq1 - 13, 100], [xq1 - 13, y3]]), punt(xq1 - 13, y3));
  ['-Q1 keert het signaal om:', 'de firmware rekent dat om.', '-R2 naar 3,3 V: bij het', 'opstarten staat hij stil.'].forEach((r, n) => i.push(T(xq1 + 8, 172 + n * 3.6, r, { size: 2.3 })));
  // tacho: open collector, -R3 naar 3,3 V, naar GPIO4
  const xt = 215;
  i.push(punt(xt, y3), L([[xt, y3], [xt, 60]]), weerstand(xt, 60, '-R3', '10 kΩ'), L([[xt, 80], [xt, 125]]), punt(xt, 125));
  i.push(L([[xt, 125], [X0 + 5, 125]]), onderbreking(X0 + 5, 125, 'tacho GPIO4', ref(B.besturing, 110), 'links'));
  // -Q2 (P-FET) schakelt de 24 V naar de ventilator; -Q3 trekt de gate laag als GPIO7 hoog is. Zonder besturing
  // (5 V weg, reset, flashen) houdt -R11 de basis laag: -Q2 open, de ventilator spanningsloos
  const xk = 270, xk2 = 330, xs = 256;
  i.push(punt(xs, yp), L([[xs, yp], [xs, 46]], DIK), pmos(253, 58, '-Q2', 'IRF4905'));
  i.push(L([[xs, 70], [xs, 95], [xk - 1.2, 95]], DIK));
  const xg = 238, yg = 58;
  i.push(punt(xg, yp), L([[xg, yp], [xg, 34]]), weerstand(xg, 34, '-R4', '10 kΩ'), L([[xg, 54], [xg, yg], [241, yg]]), punt(xg, yg));
  i.push(weerstand(xg, yg, '-R5', '10 kΩ'), L([[xg, yg + 20], [xg, 82]]));
  const xq3 = 235, yq3 = 92;
  i.push(npn(xq3, yq3, '-Q3', 'BC547'), L([[xq3 + 3, yq3 + 10], [xq3 + 3, ym]]), punt(xq3 + 3, ym));
  i.push(weerstandH(xq3 - 32, yq3, '-R6', '1 kΩ'), L([[xq3 - 12, yq3], [xq3 - 10, yq3]]));
  i.push(punt(xq3 - 12, yq3), L([[xq3 - 12, yq3], [xq3 - 12, 96]]), weerstand(xq3 - 12, 96, '-R11', '10 kΩ'), L([[xq3 - 12, 116], [xq3 - 12, ym]]), punt(xq3 - 12, ym));
  i.push(L([[xq3 - 32, yq3], [X0 + 5, yq3]]), onderbreking(X0 + 5, yq3, 'aan/uit GPIO7', ref(B.besturing, 110), 'links'));
  i.push(T(268, 64, 'zonder besturing (5 V weg, reset,', { size: 2.2 }), T(268, 67.5, 'flashen): -Q2 open, ventilator stil', { size: 2.2 }));
  i.push(L([[xk - 1.2, 110], [xk - 30, 110], [xk - 30, ym]], DIK), punt(xk - 30, ym));
  i.push(L([[xq1 + 3, yq1 - 10], [xq1 + 3, 140], [xk - 1.2, 140], [xk - 1.2, 125]]));
  i.push(L([[xt, 125], [xt, 155], [xk - 1.2, 155]]));
  // M8-stekker in de box (-X9), kabel -W2, M8-bus in de afzuiging (-X10), ventilator
  [[95, '1', '+24 V'], [110, '3', '0 V'], [125, '4', 'PWM'], [155, '2', 'tacho']].forEach(([y, n, f]) => {
    i.push(klem(xk, y, '-X9', n, { kant: 'links' }), klem(xk2, y, '-X10', n), L([[xk + 1.2, y], [xk2 - 1.2, y]], DIK), T((xk + xk2) / 2, y - 1.5, f, { anchor: 'middle', size: 2.2 }));
  });
  i.push(T(xk, 172, '-X9 M8-stekker', { anchor: 'middle', size: 2.3 }), T(xk, 175.5, '(box)', { anchor: 'middle', size: 2.3 }));
  i.push(T(xk2, 172, '-X10 M8-bus', { anchor: 'middle', size: 2.3 }), T(xk2, 175.5, '(afzuiging)', { anchor: 'middle', size: 2.3 }));
  i.push(T((xk + xk2) / 2, 86, '-W2', { anchor: 'middle', size: 2.8 }), T((xk + xk2) / 2, 89.5, 'M8-kabel 4-polig, in de sleuf', { anchor: 'middle', size: 2.2 }));
  const xm = 375;
  i.push(L([[xk2 + 1.2, 95], [xm - 6, 95], [xm - 6, 118]], DIK), L([[xk2 + 1.2, 110], [xm - 9, 110], [xm - 9, 125]], DIK));
  i.push(L([[xk2 + 1.2, 125], [xm - 12, 125]]), L([[xk2 + 1.2, 155], [xm, 155], [xm, 133]]));
  i.push(motor(xm, 125, '-M1', []), T(xm - 14, 145, 'San Ace C175', { size: 2.3 }), T(xm - 14, 148.5, '9TG24P0S01', { size: 2.3 }), T(xm - 14, 152, '24 V, 56 W', { size: 2.3 }));
  i.push(T(RECHTS - 3, 215, 'aders van de ventilator: rood +, zwart −, bruin PWM (25 kHz, 0 % = stil), geel tacho', { size: 2.3, anchor: 'end' }));
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
  i.push(L([[px, ay + 85], [150, ay + 85]]), onderbreking(150, ay + 85, 'tacho (-R3)', ref(B.ventilator, 215), 'rechts'));
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
  i.push(poort(by + 22, 'poort "+": open in het vak', '(kamerdruk)'), poort(by + 44, 'poort "−": slang naar de afzuiging', '(ruimte onder het filter)'));
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

// klemmenplannen: een rij per klem of pin
const KLEMMEN = {
  '-X1': ['schroefklem op -U1: 24 V van de netadapter', [
    { klem: '1', functie: '+24 V van de adapter', kabel: 'DC-kabel', extern: '-T1', externAansl: '+', intern: '-Q4', internAansl: '1', verwijzing: ref(B.voeding, 130) },
    { klem: '2', functie: '0 V van de adapter', kabel: 'DC-kabel', extern: '-T1', externAansl: '−', intern: 'M (-C1, -C2, -T3)', verwijzing: ref(B.voeding, 130) },
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
  '-X9': ['M8-inbouwstekker 4-polig in de voedingsbox', [
    { klem: '1', functie: '+24 V ventilator', kabel: '-W2', extern: '-X10', externAansl: '1', intern: '-Q2', internAansl: 'D', verwijzing: ref(B.ventilator, 270) },
    { klem: '2', functie: 'tacho', kabel: '-W2', extern: '-X10', externAansl: '2', intern: '-R3, GPIO4', verwijzing: ref(B.ventilator, 270) },
    { klem: '3', functie: '0 V', kabel: '-W2', extern: '-X10', externAansl: '3', intern: 'M', verwijzing: ref(B.ventilator, 270) },
    { klem: '4', functie: 'PWM', kabel: '-W2', extern: '-X10', externAansl: '4', intern: '-Q1', internAansl: 'C', verwijzing: ref(B.ventilator, 270) },
  ]],
  '-X10': ['M8-inbouwbus 4-polig in de afzuiging', [
    { klem: '1', functie: '+24 V ventilator', kabel: '-W2', extern: '-X9', externAansl: '1', intern: '-M1', internAansl: 'rood', verwijzing: ref(B.ventilator, 330) },
    { klem: '2', functie: 'tacho', kabel: '-W2', extern: '-X9', externAansl: '2', intern: '-M1', internAansl: 'geel', verwijzing: ref(B.ventilator, 330) },
    { klem: '3', functie: '0 V', kabel: '-W2', extern: '-X9', externAansl: '3', intern: '-M1', internAansl: 'zwart', verwijzing: ref(B.ventilator, 330) },
    { klem: '4', functie: 'PWM', kabel: '-W2', extern: '-X9', externAansl: '4', intern: '-M1', internAansl: 'bruin', verwijzing: ref(B.ventilator, 330) },
  ]],
};
const OPMERKINGEN = ['Opmerkingen bij de bedrading',
  '-X1 is een schroefklem 2-polig op -U1; de DC-kabel van de adapter wordt ingekort.', 'In de afzuiging: de ventilatordraden op de M8-bus -X10 (solderen, krimpkous).',
  'Kabels in de sleuven onder het blad: -W2 (M8, 0,5 m) en het slangetje naar de module, -W1 (USB-C, 1 m) naar de knop.', 'Een andere lengte = een andere kabel: niets knippen.',
  'De adapterprint -X11 (FPC-bus 10-polig 0,5 mm) zit in de knophouder; -X7 apart in de zijwand.', 'Draadkleuren van de ventilator vóór het solderen nameten (datasheet San Ace).'];

export const STUKLIJST = [
  ['-T1', '1', 'Netadapter 24 V DC, 3,75 A (90 W), C14-inlaat', 'Mean Well GST90A24-P1M'],
  ['—', '1', 'Netsnoer C13 naar stopcontact (randaarde), 1,5 m', '—'],
  ['-Q4', '1', 'Wipschakelaar 1-polig aan/uit, 10 A bij 30 V DC, inbouwgat 19,41 x 12,90 (paneel 2 mm)', 'C&K D502J12S215PQA'],
  ['-F1', '1', 'Zekering traag 3,15 A, 350 V AC / 72 V DC, TE5 8,35 x 4,0 (op de print)', 'Bel Fuse 0697W3150-01'],
  ['-R12', '1', 'Schottky-diode 1 A, 40 V (DO-41), in de 5 V naar -K1', '1N5819'],
  ['-C1', '1', 'Elco 470 µF / 50 V (buffer 24 V)', '—'],
  ['-C2', '1', 'Elco 47 µF / 50 V, vlak bij VIN van -T3', '—'],
  ['-Q2', '1', 'P-kanaal-MOSFET 55 V, 74 A, 20 mΩ (TO-220), schakelt de 24 V naar de ventilator', 'Infineon IRF4905PBF'],
  ['-Q1, -Q3', '2', 'NPN-transistor BC547B (TO-92)', '—'],
  ['-R1, -R6', '2', 'Weerstand 1 kΩ 0,25 W', '—'],
  ['-R2, -R3, -R4, -R5, -R11', '5', 'Weerstand 10 kΩ 0,25 W', '—'],
  ['-R7, -R8', '2', 'Weerstand 4,7 kΩ 0,25 W', '—'],
  ['-R9, -R10', '2', 'Weerstand 56 kΩ 0,25 W (USB-C-bron)', '—'],
  ['-T3', '1', 'Schakelende regelaar 24 V → 5 V, 1 A', 'Pololu D24V10F5'],
  ['-K1', '1', 'ESP32-C3 SuperMini (22,5 x 18 mm, USB-C)', '—'],
  ['-B1', '1', 'Verschildrukmeter ±500 Pa, I2C', 'Sensirion SDP810-500PA'],
  ['-X8', '1', 'USB-C-bus (breakout 6-polig, 20,3 x 12,7, 2 gaten M2)', '—'],
  ['-X9', '1', 'M8-inbouwstekker 4-polig, binder 718, achterwandmontage (M10 x 0,75)', '—'],
  ['-X10', '1', 'M8-inbouwbus 4-polig, binder 718, achterwandmontage (M10 x 0,75)', '—'],
  ['-W2', '1', 'M8-kabel 4-polig stekker-bus, 0,5 m (verlengkabel)', '—'],
  ['-M1', '1', 'Radiale ventilator Ø175, 24 V, 56 W, PWM, tacho', 'San Ace C175 9TG24P0S01'],
  ['-S1', '1', 'Knop 1,5" met rond AMOLED-scherm, ESP32-S3', 'VIEWE UEDX46460015-MD50E (zwart)'],
  ['-X11', '1', 'Adapterprint FPC 10-polig 0,5 mm naar 2,54 mm, 23 x 47 mm', 'FPC/FFC-breakout 10P'],
  ['-X7', '1', 'USB-C-bus (breakout 16-polig, 12 x 15, USB 2.0, 5,1 kΩ op CC)', '—'],
  ['-W1', '1', 'USB-C-kabel C-C, 1 m, haaks (USB 2.0 volstaat)', '—'],
  ['-U1', '1', 'Gaatjesprint 40 x 50 mm (gaten 2 mm)', '—'],
  ['-X1', '1', 'Printschroefklem 2-polig steek 5 mm', '—'],
  ['—', '1 m', 'Siliconeslang 3 x 5 mm (drukmeter)', '—'],
];

const schema = [voeding(), ventilator(), besturing()].map((b) => ({ ...b, soort: SOORT.schema[0], soortNaam: SOORT.schema[1] }));
const klemmen = Object.entries(KLEMMEN).map(([s, [oms, rijen]], k) => ({
  titel: ['Klemmenplan', s], soort: SOORT.klemmen[0], soortNaam: SOORT.klemmen[1],
  inhoud: [...klemmenplan(s, oms, rijen), ...(k === 0 ? OPMERKINGEN.map((r, n) => T(X0 + 3, 120 + n * 6, r, { size: n ? 2.5 : 3.2, bold: !n })) : [])],
}));
const stuk = { titel: 'Stuklijst', soort: SOORT.stuk[0], soortNaam: SOORT.stuk[1], inhoud: stuklijst(STUKLIJST) };
const voor = { titel: 'Titelblad', soort: SOORT.titel[0], soortNaam: SOORT.titel[1] };
const inhoud = { titel: 'Inhoudsopgave', soort: SOORT.inhoud[0], soortNaam: SOORT.inhoud[1] };
const alle = [voor, inhoud, ...schema, ...klemmen, stuk];
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
