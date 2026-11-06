// Aansluitschema van de afzuiging in EPLAN-stijl (2026-11-05): A3-bladen met kader, kolommen 1-8, rijen A-F en een
// titelblok; apparaatcodes volgens IEC 81346 (-T netadapter, -F zekering, -Q schakelaars, -R weerstanden, -C
// condensatoren, -M motor, -A besturing, -B sensor, -X klemmen); potentialen L+ (12 V), L3 (3,3 V) en M (0 V) met
// kruisverwijzingen /blad.kolom. Daarna een klemmenplan en een stuklijst.
// Gebruik: node voorbeelden/afzuiging/schema/maak-schema.mjs   (schrijft blad-1..6.svg en schema.html; de PDF maakt
// e2e/tools/schema-pdf.mjs)
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 420, H = 297; // A3 liggend, mm
const X0 = 20, X1 = 410, Y0 = 12, Y1 = 250; // tekenvlak
const KOL = (X1 - X0) / 8;
const BLADEN = 6;
const kol = (n) => X0 + KOL * (n - 0.5); // midden van kolom n

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const T = (x, y, s, { size = 3, anchor = 'start', bold = false, kleur = '#111' } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="${kleur}"${bold ? ' font-weight="700"' : ''}>${esc(s)}</text>`;
const L = (pts, { w = 0.35, kleur = '#111', streep = '' } = {}) =>
  `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${kleur}" stroke-width="${w}"${streep ? ` stroke-dasharray="${streep}"` : ''}/>`;
const punt = (x, y) => `<circle cx="${x}" cy="${y}" r="0.8" fill="#111"/>`;
const rect = (x, y, w, h, { streep = '', w2 = 0.35, vul = 'none' } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${vul}" stroke="#111" stroke-width="${w2}"${streep ? ` stroke-dasharray="${streep}"` : ''}/>`;

// ---- symbolen (IEC 60617) ----
/** weerstand verticaal van (x, y) naar (x, y + 20) */
const weerstand = (x, y, code, waarde) => [L([[x, y], [x, y + 6]]), rect(x - 1.5, y + 6, 3, 8), L([[x, y + 14], [x, y + 20]]), T(x - 3, y + 9, code, { anchor: 'end', size: 2.6 }), T(x - 3, y + 12.5, waarde, { anchor: 'end', size: 2.4, kleur: '#444' })].join('');
/** weerstand horizontaal van (x, y) naar (x + 20, y) */
const weerstandH = (x, y, code, waarde) => [L([[x, y], [x + 6, y]]), rect(x + 6, y - 1.5, 8, 3), L([[x + 14, y], [x + 20, y]]), T(x + 10, y - 3, code, { anchor: 'middle', size: 2.6 }), T(x + 10, y + 5, waarde, { anchor: 'middle', size: 2.4, kleur: '#444' })].join('');
/** condensator verticaal van (x, y) naar (x, y + 16) */
const condensator = (x, y, code, waarde) => [L([[x, y], [x, y + 7]]), L([[x - 3.5, y + 7], [x + 3.5, y + 7]], { w: 0.6 }), L([[x - 3.5, y + 9], [x + 3.5, y + 9]], { w: 0.6 }), L([[x, y + 9], [x, y + 16]]), T(x + 5, y + 7.5, code, { size: 2.6 }), T(x + 5, y + 11, waarde, { size: 2.4, kleur: '#444' })].join('');
/** zekering horizontaal van (x, y) naar (x + 20, y) */
const zekering = (x, y, code, waarde) => [L([[x, y], [x + 5, y]]), rect(x + 5, y - 2, 10, 4), L([[x + 5, y], [x + 15, y]], { w: 0.25 }), L([[x + 15, y], [x + 20, y]]), T(x + 10, y - 3.5, code, { anchor: 'middle', size: 2.6 }), T(x + 10, y + 6, waarde, { anchor: 'middle', size: 2.4, kleur: '#444' })].join('');
/** klem: rondje met nummer */
const klem = (x, y, code, nr) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#fff" stroke="#111" stroke-width="0.35"/>${T(x + 2.2, y - 1.6, `${code}:${nr}`, { size: 2.2, kleur: '#333' })}`;
/** NPN-transistor: basis links (x - 10, y), collector boven (x + 3, y - 10), emitter onder (x + 3, y + 10) */
const npn = (x, y, code, type) => [
  `<circle cx="${x + 0.5}" cy="${y}" r="6" fill="none" stroke="#111" stroke-width="0.35"/>`,
  L([[x - 10, y], [x - 2, y]]), L([[x - 2, y - 4], [x - 2, y + 4]], { w: 0.6 }),
  L([[x - 2, y - 1.5], [x + 3, y - 5], [x + 3, y - 10]]), L([[x - 2, y + 1.5], [x + 3, y + 5], [x + 3, y + 10]]),
  `<polygon points="${x + 3},${y + 5} ${x + 0.4},${y + 4.6} ${x + 1.6},${y + 2.9}" fill="#111"/>`,
  T(x + 8, y - 1, code, { size: 2.8, bold: true }), T(x + 8, y + 2.6, type, { size: 2.4, kleur: '#444' }),
].join('');
/** P-MOSFET: gate links (x - 12, y), source boven (x + 3, y - 12), drain onder (x + 3, y + 12) */
const pmos = (x, y, code, type) => [
  `<circle cx="${x}" cy="${y}" r="8" fill="none" stroke="#111" stroke-width="0.35"/>`,
  L([[x - 12, y], [x - 5, y]]), L([[x - 5, y - 4], [x - 5, y + 4]], { w: 0.6 }),
  L([[x - 3, y - 5], [x - 3, y - 2.5]], { w: 0.6 }), L([[x - 3, y - 1], [x - 3, y + 1]], { w: 0.6 }), L([[x - 3, y + 2.5], [x - 3, y + 5]], { w: 0.6 }),
  L([[x - 3, y - 4], [x + 3, y - 4], [x + 3, y - 12]]), L([[x - 3, y + 4], [x + 3, y + 4], [x + 3, y + 12]]), L([[x - 3, y], [x + 3, y], [x + 3, y - 4]]),
  `<polygon points="${x - 0.2},${y} ${x - 2.4},${y - 1.3} ${x - 2.4},${y + 1.3}" fill="#111" transform="rotate(180 ${x - 1.3} ${y})"/>`,
  T(x + 10, y - 1, code, { size: 2.8, bold: true }), T(x + 10, y + 2.6, type, { size: 2.4, kleur: '#444' }),
].join('');
/** motor: cirkel met M en = */
const motor = (x, y, code, tekst) => [`<circle cx="${x}" cy="${y}" r="9" fill="#fff" stroke="#111" stroke-width="0.45"/>`, T(x, y + 1.2, 'M', { anchor: 'middle', size: 5, bold: true }), L([[x - 3, y + 4.2], [x + 3, y + 4.2]], { w: 0.35 }), T(x + 12, y - 2, code, { size: 3, bold: true }), ...tekst.map((r, i) => T(x + 12, y + 2 + i * 3.4, r, { size: 2.4, kleur: '#444' }))].join('');
/** toestel als gestreepte kader met aansluitingen; pins: [{ x, y, naam }] relatief, de naam binnen de kader */
const toestel = (x, y, w, h, code, regels, pins = []) => [
  rect(x, y, w, h, { streep: '2 1.2', vul: '#fbfaf7' }), T(x + 2, y - 2, code, { size: 3.2, bold: true }),
  ...regels.map((r, i) => T(x + 2.5, y + 5 + i * 3.6, r, { size: 2.5, kleur: '#333' })),
  ...pins.map((p) => `<circle cx="${x + p.x}" cy="${y + p.y}" r="0.9" fill="#111"/>${T(x + p.x + (p.x < w / 2 ? 2 : -2), y + p.y + (p.y < h / 2 ? 4 : -2), p.naam, { size: 2.2, anchor: p.x < w / 2 ? 'start' : 'end', kleur: '#222' })}`),
].join('');
/** potentiaalrail met naam en kruisverwijzingen aan beide uiteinden */
const rail = (y, xa, xb, naam, links, rechts, kleur = '#b42318') => [
  L([[xa, y], [xb, y]], { w: 0.5, kleur }), T(xa, y - 1.5, links ? `${naam}  ← ${links}` : naam, { size: 2.6, kleur }), rechts ? T(xb, y - 1.5, `${naam}  → ${rechts}`, { size: 2.6, anchor: 'end', kleur }) : '',
].join('');
const ref = (x, y, s, anchor = 'start') => T(x, y, s, { size: 2.4, anchor, kleur: '#1d4ed8' });

// ---- kader en titelblok ----
function kader(nr, titel, inhoud) {
  const k = [];
  k.push(rect(5, 5, W - 10, H - 10, { w2: 0.7 }), rect(X0 - 5, Y0 - 5, X1 - X0 + 5, Y1 - Y0 + 5, { w2: 0.25 }));
  for (let i = 1; i <= 8; i++) {
    const x = X0 + KOL * (i - 1);
    k.push(L([[x, 5], [x, Y0 - 5]], { w: 0.25 }), T(x + KOL / 2, 9.5, String(i), { anchor: 'middle', size: 3 }));
  }
  'ABCDEF'.split('').forEach((r, i) => {
    const y = Y0 + ((Y1 - Y0) / 6) * i;
    k.push(L([[5, y], [X0 - 5, y]], { w: 0.25 }), T(10, y + (Y1 - Y0) / 12 + 1, r, { anchor: 'middle', size: 3 }));
  });
  // titelblok
  const ty = Y1 + 3;
  k.push(rect(X0 - 5, ty, X1 - X0 + 5, H - 5 - ty, { w2: 0.5 }));
  const vak = (x, w, kop, waarde, groot = false) => [L([[x, ty], [x, H - 5]], { w: 0.25 }), T(x + 2, ty + 5, kop, { size: 2.2, kleur: '#666' }), T(x + 2, ty + (groot ? 16 : 13), waarde, { size: groot ? 5.5 : 3.2, bold: groot })].join('');
  k.push(vak(X0 - 5, 70, 'Project', 'Afzuiging Lush Beauty'), T(X0 - 3, ty + 20, 'inbouw nagelstofafzuiging, versie 4.1', { size: 2.4, kleur: '#444' }));
  k.push(vak(X0 + 65, 120, 'Bladtitel', titel, true));
  k.push(vak(X0 + 185, 60, 'Installatie / plaats', '=AFZ +ROMP'), T(X0 + 187, ty + 20, 'elektronicavak in de romp', { size: 2.4, kleur: '#444' }));
  k.push(vak(X0 + 245, 50, 'Norm', 'IEC 81346 / 60617'), T(X0 + 247, ty + 20, 'EPLAN-stijl', { size: 2.4, kleur: '#444' }));
  k.push(vak(X0 + 295, 50, 'Datum / getekend', '2026-11-06'), T(X0 + 297, ty + 20, 'Phlippo CAD', { size: 2.4, kleur: '#444' }));
  k.push(vak(X0 + 345, 45, 'Blad', `${nr} / ${BLADEN}`, true));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-family="Arial, Helvetica, sans-serif">
<rect width="${W}" height="${H}" fill="#fff"/>
${k.join('\n')}
${inhoud.join('\n')}
</svg>`;
}

// ---- blad 1: titelblad en inhoud ----
function blad1() {
  const i = [];
  i.push(T(W / 2, 60, 'Afzuiging Lush Beauty', { anchor: 'middle', size: 12, bold: true }));
  i.push(T(W / 2, 74, 'Aansluitschema elektronica', { anchor: 'middle', size: 7 }));
  i.push(T(W / 2, 84, 'Ventilator Delta PFR1212UHE-SP00 · module ESP32-C3 · knop VIEWE 1,5" (draadloos) · verschildrukmeting Sensirion SDP810-500Pa', { anchor: 'middle', size: 3.6, kleur: '#444' }));
  const inhoud = [['1', 'Titelblad en inhoud'], ['2', 'Voeding 12 V en 5 V: netadapter, DC-bus, schakelaar, zekering, regelaar'], ['3', 'Ventilator: aan/uit (-Q3) en snelheid PWM (-Q1)'], ['4', 'Besturing -A4, verschildrukmeter -B1 en de knop -A1 (5 V over USB-C, draadloos gestuurd)'], ['5', 'Klemmenplan en bedrading'], ['6', 'Stuklijst']];
  i.push(T(120, 115, 'Inhoud', { size: 5, bold: true }));
  inhoud.forEach(([n, t], k) => { i.push(T(120, 127 + k * 9, `Blad ${n}`, { size: 4 }), T(150, 127 + k * 9, t, { size: 4 })); });
  i.push(T(120, 195, 'Leeswijzer', { size: 4, bold: true }));
  ['Codes volgens IEC 81346: -T netadapter, -F zekering, -Q schakelaars, -R weerstanden, -C condensatoren,', '-M motor, -A besturing, -B sensor, -X klemmen en connectoren.', 'Potentialen: L+ = +12 V, L5 = +5 V (-A4 en de knop), L3 = +3,3 V (uit -A4, voor de drukmeter), M = 0 V. /3.2 = blad 3, kolom 2.',
    'Alles behalve de netadapter en de knop zit in het elektronicavak van de romp (gaatjesprint -A2 van 30 x 70 mm en -A4).',
    'De knop -A1 zit in de knophouder in het blad; hij krijgt 5 V over een USB-C-kabel -W1 (-X8 -> -X7) en stuurt -A4 draadloos (ESP-NOW).']
    .forEach((r, k) => i.push(T(120, 205 + k * 6.5, r, { size: 3.2, kleur: '#333' })));
  return kader(1, 'Titelblad', i);
}

// ---- blad 2: voeding ----
function blad2() {
  const i = [];
  const yp = 80, ym = 200;
  i.push(toestel(30, 60, 62, 70, '-T1', ['Netadapter', 'Mean Well GST60A12-P1J', '230 V AC / 12 V DC, 5 A', 'stekker in het stopcontact,', 'kabel met plug 5,5 x 2,1'], [{ x: 62, y: 20, naam: '+' }, { x: 62, y: 60, naam: '-' }]));
  i.push(T(30, 145, '230 V AC blijft buiten het bureau', { size: 2.6, kleur: '#b42318' }));
  // DC-bus
  i.push(L([[92, yp], [130, yp]], { w: 0.5, kleur: '#b42318' }), L([[92, ym - 0], [92, 120], [92, 120]], { w: 0 }), L([[92, 120], [110, 120], [110, ym], [130, ym]], { w: 0.5 }));
  i.push(klem(130, yp, '-X1', '1'), klem(130, ym, '-X1', '2'), T(124, yp - 8, '-X1  DC-inbouwbus 5,5 x 2,1', { size: 2.6 }), T(124, yp - 4.5, '(bodemplaat)', { size: 2.4, kleur: '#444' }));
  // zekering
  // aan/uit-schakelaar in de zijwand (maakcontact, getekend in de stand uit)
  i.push(L([[131.3, yp], [140, yp]], { w: 0.5, kleur: '#b42318' }), punt(140, yp), L([[140, yp], [149, yp - 5]], { w: 0.5 }), L([[150, yp], [160, yp]], { w: 0.5, kleur: '#b42318' }), punt(150, yp),
    L([[144.5, yp - 2.5], [144.5, yp - 9]], { w: 0.3, streep: '1.2 1' }), L([[142.5, yp - 9], [146.5, yp - 9]], { w: 0.35 }),
    T(145, yp + 6, '-S1', { anchor: 'middle', size: 2.6 }), T(145, yp + 9.5, 'aan/uit, zijwand', { anchor: 'middle', size: 2.4, kleur: '#444' }));
  i.push(zekering(160, yp, '-F1', '4 A traag (5 x 20)'), L([[180, yp], [205, yp]], { w: 0.5, kleur: '#b42318' }));
  i.push(L([[131.3, ym], [205, ym]], { w: 0.5 }));
  // rails
  i.push(rail(yp, 205, X1 - 5, 'L+ 12 V', '', '/3.1  /4.1'), rail(ym, 205, X1 - 5, 'M 0 V', '', '/3.1  /4.1', '#111'));
  // buffercondensator
  i.push(punt(250, yp), L([[250, yp], [250, 132]]), condensator(250, 132, '-C1', '470 µF / 25 V'), L([[250, 148], [250, ym]]), punt(250, ym));
  i.push(T(270, 120, 'buffert de stroomstoot van de ventilator', { size: 2.4, kleur: '#444' }));
  // 5V-regelaar voor de knop en de 3,3V-regelaar
  i.push(punt(320, yp), L([[320, yp], [320, 140]]), toestel(310, 140, 40, 26, '-T3', ['Pololu D24V10F5', '12 V -> 5 V, 1 A'], [{ x: 10, y: 0, naam: 'VIN' }, { x: 40, y: 13, naam: 'VOUT' }, { x: 20, y: 26, naam: 'GND' }]));
  i.push(L([[330, 166], [330, ym]], { w: 0.45 }), punt(330, ym));
  i.push(L([[350, 153], [X1 - 5, 153]], { kleur: '#d97706', w: 0.5 }), T(358, 151, 'L5 5 V', { size: 2.6, kleur: '#d97706' }), ref(X1 - 6, 158, '/4.1', 'end'));
  i.push(T(30, 230, 'Stroom: ventilator max. 2,7 A; op 5 V de knop ca. 0,1 A en -A4 tot 0,35 A (zenden). Draad naar de ventilator minstens 0,5 mm².', { size: 3, kleur: '#333' }));
  return kader(2, 'Voeding 12 V', i);
}

// ---- blad 3: ventilator ----
function blad3() {
  const i = [];
  const yp = 30, ym = 225;
  i.push(rail(yp, X0, X1 - 5, 'L+ 12 V', '/2.8', ''), rail(ym, X0, X1 - 5, 'M 0 V', '/2.8', '', '#111'));
  // aan/uit: Q3 P-MOSFET hoog in de plus
  const xq3 = 175, yq3 = 80;
  i.push(punt(xq3 + 3, yp), L([[xq3 + 3, yp], [xq3 + 3, yq3 - 12]]), pmos(xq3, yq3, '-Q3', 'IRF4905 (P-MOSFET)'));
  // R4 gate pull-up naar L+
  const xg = 140;
  i.push(punt(xg, yp), L([[xg, yp], [xg, 45]]), weerstand(xg, 45, '-R4', '10 kΩ'), L([[xg, 65], [xg, yq3], [xq3 - 12, yq3]]), punt(xg, yq3));
  // Q2 trekt de gate laag
  const xq2 = 137, yq2 = 125;
  i.push(L([[xg, yq3], [xg, yq2 - 10]]), npn(xq2, yq2, '-Q2', 'BC547'), L([[xq2 + 3, yq2 + 10], [xq2 + 3, ym]]), punt(xq2 + 3, ym));
  i.push(weerstandH(xq2 - 40, yq2, '-R5', '1 kΩ'), L([[xq2 - 20, yq2], [xq2 - 10, yq2]]));
  i.push(L([[xq2 - 40, yq2], [X0 + 5, yq2]], { kleur: '#d98a1c', w: 0.45 }), T(X0 + 5, yq2 - 2, 'aan/uit  GPIO4 (-A4) ← /4.3', { size: 2.6, kleur: '#d98a1c' }));
  i.push(punt(xq2 - 13, yq2), L([[xq2 - 13, yq2], [xq2 - 13, 150]]), weerstand(xq2 - 13, 150, '-R6', '10 kΩ'), L([[xq2 - 13, 170], [xq2 - 13, ym]]), punt(xq2 - 13, ym));
  // drain -> klem X3:1
  const xk = 330;
  i.push(L([[xq3 + 3, yq3 + 12], [xq3 + 3, 105], [xk, 105]], { kleur: '#b42318', w: 0.45 }), T(xq3 + 6, 102, '+12 V geschakeld', { size: 2.4, kleur: '#b42318' }));
  // PWM: Q1 trekt de PWM-draad laag
  const xq1 = 262, yq1 = 175;
  i.push(L([[xq1 + 3, yq1 - 10], [xq1 + 3, 145], [xk, 145]], { kleur: '#2a6fd6', w: 0.45 }), npn(xq1, yq1, '-Q1', 'BC547'), L([[xq1 + 3, yq1 + 10], [xq1 + 3, ym]]), punt(xq1 + 3, ym));
  i.push(weerstandH(xq1 - 40, yq1, '-R1', '1 kΩ'), L([[xq1 - 20, yq1], [xq1 - 10, yq1]]));
  i.push(L([[xq1 - 40, yq1], [205, yq1]], { kleur: '#2a6fd6', w: 0.45 }), T(205, yq1 - 6, 'PWM  GPIO3 (-A4) ← /4.3', { size: 2.6, kleur: '#2a6fd6' }));
  i.push(punt(xq1 - 13, yq1), L([[xq1 - 13, yq1], [xq1 - 13, 185]]), weerstand(xq1 - 13, 185, '-R2', '10 kΩ'), L([[xq1 - 13, 205], [xq1 - 13, ym]]), punt(xq1 - 13, ym));
  i.push(T(xq1 + 8, 200, 'Q1 keert het signaal om: de firmware rekent dat om', { size: 2.3, kleur: '#444' }));
  // klemmen X3 en de motor
  i.push(L([[xk, 125], [xk - 15, 125], [xk - 15, ym]], { w: 0.45 }), punt(xk - 15, ym));
  [[105, '1'], [125, '2'], [145, '3'], [165, '4']].forEach(([y, n]) => i.push(klem(xk, y, '-X3', n)));
  i.push(T(xk + 3, 170, 'toerental: niet aangesloten', { size: 2.2, kleur: '#777' }));
  const xm = 368;
  i.push(L([[xk + 1.3, 105], [xm - 6, 105], [xm - 6, 118]], { kleur: '#b42318', w: 0.45 }), L([[xk + 1.3, 125], [xm - 9, 125]], { w: 0.45 }), L([[xk + 1.3, 145], [xm, 145], [xm, 134]], { kleur: '#2a6fd6', w: 0.45 }));
  i.push(motor(xm, 125, '-M1', []), T(xm - 12, 143, 'Delta PFR1212UHE-SP00', { size: 2.4, kleur: '#444' }), T(xm - 12, 146.5, '12 V, 32 W, PWM', { size: 2.4, kleur: '#444' }));
  i.push(T(X1 - 8, 215, 'draden: + / GND / PWM / toerental (kleuren volgens het blad van Delta)', { size: 2.3, anchor: 'end', kleur: '#444' }));
  return kader(3, 'Ventilator: aan/uit en snelheid', i);
}

// ---- blad 4: besturing en drukmeter ----
function blad4() {
  const i = [];
  const y5 = 30, ym = 225, y3 = 40;
  i.push(rail(y5, X0, X1 - 5, 'L5 5 V', '/2.8', '', '#d97706'), rail(ym, X0, X1 - 5, 'M 0 V', '/2.8', '', '#111'));
  // -A4: ESP32-C3 in de module
  const ax = 40, ay = 60;
  i.push(toestel(ax, ay, 70, 120, '-A4', ['ESP32-C3 SuperMini', 'in het elektronicavak', 'USB-C onderaan', '(module flashen)'], [
    { x: 0, y: 20, naam: '5V' }, { x: 0, y: 100, naam: 'GND' }, { x: 70, y: 20, naam: '3V3' },
    { x: 70, y: 50, naam: 'GPIO5  SDA' }, { x: 70, y: 60, naam: 'GPIO6  SCL' },
    { x: 70, y: 85, naam: 'GPIO4  aan/uit' }, { x: 70, y: 95, naam: 'GPIO3  PWM' },
  ]));
  i.push(punt(30, y5), L([[30, y5], [30, ay + 20], [ax, ay + 20]], { kleur: '#d97706', w: 0.45 }));
  i.push(L([[ax, ay + 100], [30, ay + 100], [30, ym]], { w: 0.45 }), punt(30, ym));
  // 3V3 van -A4 -> L3
  const px = ax + 70;
  i.push(L([[px, ay + 20], [125, ay + 20], [125, y3], [300, y3]], { kleur: '#7c3aed', w: 0.5 }), T(130, y3 - 1.5, 'L3 3,3 V (uit -A4)', { size: 2.6, kleur: '#7c3aed' }));
  // aan/uit en PWM naar blad 3
  i.push(L([[px, ay + 85], [150, ay + 85]], { kleur: '#d98a1c', w: 0.45 }), T(152, ay + 86, 'aan/uit → /3.2 (-R5)', { size: 2.5, kleur: '#d98a1c' }));
  i.push(L([[px, ay + 95], [150, ay + 95]], { kleur: '#2a6fd6', w: 0.45 }), T(152, ay + 96, 'PWM → /3.5 (-R1)', { size: 2.5, kleur: '#2a6fd6' }));
  // I2C met pull-ups naar L3 en de drukmeter
  i.push(punt(140, y3), L([[140, y3], [140, 55]]), weerstand(140, 55, '-R7', '4,7 kΩ'), L([[140, 75], [140, ay + 50]]), punt(140, ay + 50));
  i.push(punt(155, y3), L([[155, y3], [155, 55]]), weerstand(155, 55, '-R8', '4,7 kΩ'), L([[155, 75], [155, ay + 60]]), punt(155, ay + 60));
  i.push(L([[px, ay + 50], [190, ay + 50]], { kleur: '#7c3aed', w: 0.45 }), T(165, ay + 48, 'SDA', { size: 2.4, kleur: '#7c3aed' }));
  i.push(L([[px, ay + 60], [190, ay + 60]], { kleur: '#7c3aed', w: 0.45 }), T(165, ay + 58, 'SCL', { size: 2.4, kleur: '#7c3aed' }));
  const bx = 190, by = ay - 10;
  i.push(toestel(bx, by, 62, 72, '-B1', ['Sensirion SDP810-500Pa', 'verschildruk ±500 Pa', 'I2C-adres 0x25'], [
    { x: 0, y: 30, naam: 'VDD' }, { x: 0, y: 60, naam: 'SDA' }, { x: 0, y: 70, naam: 'SCL' }, { x: 62, y: 66, naam: 'GND' },
  ]));
  i.push(L([[180, y3], [180, by + 30], [bx, by + 30]], { kleur: '#7c3aed', w: 0.45 }), punt(180, y3));
  i.push(L([[bx + 62, by + 66], [262, by + 66], [262, ym]], { w: 0.45 }), punt(262, ym));
  const poort = (y, tekst1, tekst2) => [L([[bx + 62, y], [bx + 74, y]], { w: 1.4, kleur: '#9aa0a6', streep: '3 2' }), `<circle cx="${bx + 75.5}" cy="${y}" r="1.5" fill="#fff" stroke="#9aa0a6" stroke-width="0.6"/>`, T(bx + 3, y - 1, tekst1, { size: 2.2, kleur: '#555' }), T(bx + 3, y + 2.6, tekst2, { size: 2.2, kleur: '#555' })].join('');
  i.push(poort(by + 22, 'poort "+": open in het vak', '(kamerdruk)'), poort(by + 44, 'poort "-": slang naar het messingbuisje', 'in het plafond (onder de filters)'));
  // USB-C-koppeling naar de knop: -X8 in de module, kabel -W1, -X7 in de knophouder, knop -A1
  const xu = 290, yu = 150;
  i.push(rect(xu, yu, 22, 40, { w2: 0.45 }), T(xu + 11, yu - 3, '-X8', { anchor: 'middle', size: 2.8, bold: true }), T(xu + 11, yu + 46, 'USB-C-bus', { anchor: 'middle', size: 2.2, kleur: '#555' }), T(xu + 11, yu + 49.5, 'in de bodemplaat', { anchor: 'middle', size: 2.2, kleur: '#555' }));
  [['VBUS', 8], ['CC1', 18], ['CC2', 26], ['GND', 34]].forEach(([n, dy]) => i.push(T(xu + 2, yu + dy + 1, n, { size: 2.2 })));
  i.push(punt(282, y5), L([[282, y5], [282, yu + 8], [xu, yu + 8]], { kleur: '#d97706', w: 0.45 }));
  i.push(punt(276, y5), L([[276, y5], [276, yu - 12]]), weerstand(276, yu - 12, '-R9', '56 kΩ'), L([[276, yu + 8], [276, yu + 18], [xu, yu + 18]]));
  i.push(punt(270, y5), L([[270, y5], [270, yu - 30]]), weerstand(270, yu - 30, '-R10', '56 kΩ'), L([[270, yu - 10], [270, yu + 26], [xu, yu + 26]]));
  i.push(L([[xu, yu + 34], [285, yu + 34], [285, ym]], { w: 0.45 }), punt(285, ym));
  // kabel en knop
  i.push(L([[xu + 22, yu + 8], [340, yu + 8]], { kleur: '#d97706', w: 0.6 }), L([[xu + 22, yu + 34], [340, yu + 34]], { w: 0.6 }));
  i.push(T(326, yu + 4, '-W1', { anchor: 'middle', size: 2.6, bold: true }), T(326, yu + 42, 'USB-C-kabel, C-C', { anchor: 'middle', size: 2.2, kleur: '#555' }), T(326, yu + 45.5, '0,5 m, in de sleuf', { anchor: 'middle', size: 2.2, kleur: '#555' }));
  i.push(rect(340, yu, 18, 40, { w2: 0.45 }), T(349, yu - 3, '-X7', { anchor: 'middle', size: 2.8, bold: true }), T(349, yu + 49.5, 'op -A3', { anchor: 'middle', size: 2.2, kleur: '#555' }));
  i.push(toestel(366, yu - 6, 40, 56, '-A1', ['VIEWE-knop 1,5"', 'ESP32-S3, AMOLED', 'in de knophouder'], [
    { x: 0, y: 14, naam: 'FPC 1 +5V' }, { x: 0, y: 26, naam: 'FPC 9/10 USB' }, { x: 0, y: 40, naam: 'FPC 3 GND' },
  ]));
  i.push(L([[358, yu + 8], [366, yu + 8]], { kleur: '#d97706', w: 0.45 }), L([[358, yu + 20], [366, yu + 20]], { w: 0.45 }), L([[358, yu + 34], [366, yu + 34]], { w: 0.45 }));
  // draadloos
  i.push(L([[ax + 35, ay + 120], [ax + 35, 206], [386, 206], [386, yu + 50]], { kleur: '#0ea5e9', w: 0.4, streep: '2.5 1.5' }));
  i.push(T(160, 204, 'ESP-NOW (2,4 GHz): opdrachten van -A1 naar -A4, status terug', { anchor: 'middle', size: 2.5, kleur: '#0ea5e9' }));
  i.push(T(30, 213, '-A3: adapterprint in de knophouder; USB-C -X7 met 5,1 kΩ op CC (op de breakout): VBUS -> FPC 1, GND -> FPC 3, D+ -> FPC 9, D- -> FPC 10.', { size: 2.3, kleur: '#444' }));
  i.push(T(30, 219, 'Met de kabel naar -X8 krijgt de knop 5 V; op een computer aangesloten wordt hij geflasht. D+/D- van -X8 blijven los.', { size: 2.3, kleur: '#444' }));
  return kader(4, 'Besturing, drukmeter en de knop', i);
}

// ---- blad 5: klemmenplan ----
const KLEMMEN = [
  ['-X1', '1', 'DC-bus +', '-S1:1 (draad)', 'rood 0,75 mm²', 'netadapter -T1 (plug)'],
  ['-S1', '2', '+12 V na schakelaar', '-F1', 'rood 0,75 mm²', 'vlakstekers 4,8 mm'],
  ['-X1', '2', 'DC-bus -', 'M', 'zwart 0,75 mm²', 'netadapter -T1 (plug)'],
  ['-X3', '1', '+12 V geschakeld', '-Q3 drain', 'ventilatordraad', '-M1 +12 V'],
  ['-X3', '2', '0 V', 'M', 'ventilatordraad', '-M1 GND'],
  ['-X3', '3', 'PWM', '-Q1 collector', 'ventilatordraad', '-M1 PWM'],
  ['-X3', '4', 'toerental', '—', '(niet aangesloten)', '-M1 toerental'],
  ['-X8', 'VBUS', '+5 V', 'L5 (-T3)', 'draad 0,5 mm²', '-W1 -> knop'],
  ['-X8', 'CC1/2', 'bron 5 V', '-R9/-R10 56 kΩ naar L5', '—', '-W1'],
  ['-X8', 'GND', '0 V', 'M', 'draad 0,5 mm²', '-W1 -> knop'],
  ['-A4', '5V', '+5 V', 'L5 (-T3)', 'draad 0,25 mm²', '—'],
  ['-A4', '3V3', '+3,3 V', 'L3: -B1 VDD, -R7, -R8', 'draad 0,25 mm²', '—'],
  ['-A4', 'GPIO5/6', 'SDA / SCL', '-B1', 'draad 0,25 mm²', '—'],
  ['-A4', 'GPIO3', 'PWM', '-R1', 'draad 0,25 mm²', '—'],
  ['-A4', 'GPIO4', 'aan/uit', '-R5', 'draad 0,25 mm²', '—'],
];
function tabel(x, y, kolommen, rijen) {
  const r = [];
  const h = 7;
  let cx = x;
  kolommen.forEach(([kop, w]) => { r.push(rect(cx, y, w, h, { vul: '#efece6' }), T(cx + 2, y + 4.8, kop, { size: 2.8, bold: true })); cx += w; });
  rijen.forEach((rij, j) => {
    let xx = x;
    rij.forEach((cel, k) => { r.push(rect(xx, y + h * (j + 1), kolommen[k][1], h), T(xx + 2, y + h * (j + 1) + 4.8, cel, { size: 2.6 })); xx += kolommen[k][1]; });
  });
  return r.join('');
}
function blad5() {
  const i = [tabel(X0, 20, [['Klem', 18], ['Nr', 20], ['Functie', 34], ['Intern (print -A2)', 46], ['Draad', 45], ['Extern', 50]], KLEMMEN)];
  i.push(T(250, 30, 'Bedrading', { size: 4, bold: true }));
  ['Alle klemmen zitten op de gaatjesprint -A2 (30 x 70 mm) in het elektronicavak.', 'Schroefklem -X3 (ventilator) met steek 3,5 mm. -A4 en -X8 met draadjes op -A2.', 'De ventilatorkabel gaat door de doorvoer in de tussenwand (dichten met een tule).',
    '-X8 en de USB-C van -A4 zitten onderaan de module, in de bodemplaat.', 'De USB-C-kabel -W1 (C-C, 0,5 m, liefst haaks) loopt in de sleuf onder het blad naar het', 'deksel van de knophouder (-X7). Een andere lengte = een andere kabel: niets knippen.', 'Op -A3: FPC-bus 10-polig 0,5 mm voor de knop en de USB-C-bus -X7.', 'Draadkleuren van de ventilator vóór het solderen nameten.']
    .forEach((s, k) => i.push(T(250, 40 + k * 6, s, { size: 2.8, kleur: '#333' })));
  return kader(5, 'Klemmenplan', i);
}

// ---- blad 6: stuklijst ----
export const STUKLIJST = [
  ['-T1', '1', 'Netadapter 12 V DC, 5 A, plug 5,5 x 2,1 mm', 'Mean Well GST60A12-P1J'],
  ['-X1', '1', 'DC-inbouwbus 5,5 x 2,1 mm met moer (gat Ø8)', 'inbouwmodel, schroefmoer'],
  ['-S1', '1', 'Wipschakelaar 1-polig aan/uit, 21 x 15 mm, inbouwgat 19 x 13 mm', 'KCD1-101 (6 A)'],
  ['-F1', '1', 'Zekering 4 A traag 5 x 20 mm + printzekeringhouder', '—'],
  ['-C1', '1', 'Elco 470 µF / 25 V', '—'],
  ['-Q3', '1', 'P-MOSFET IRF4905 (TO-220)', 'Infineon IRF4905PbF'],
  ['-Q1, -Q2', '2', 'NPN-transistor BC547B (TO-92)', '—'],
  ['-R1, -R5', '2', 'Weerstand 1 kΩ 0,25 W', '—'],
  ['-R2, -R4, -R6', '3', 'Weerstand 10 kΩ 0,25 W', '—'],
  ['-R7, -R8', '2', 'Weerstand 4,7 kΩ 0,25 W', '—'],
  ['-T3', '1', 'Schakelende regelaar 12 V -> 5 V, 1 A', 'Pololu D24V10F5'],
  ['-A4', '1', 'ESP32-C3 SuperMini (22,5 x 18 mm, USB-C)', '—'],
  ['-X8', '1', 'USB-C-bus (breakout, 6-polig: VBUS, GND, CC1, CC2)', '—'],
  ['-R9, -R10', '2', 'Weerstand 56 kΩ 0,25 W (USB-C-bron)', '—'],
  ['-B1', '1', 'Verschildrukmeter ±500 Pa, I2C', 'Sensirion SDP810-500PA'],
  ['-A1', '1', 'Knop 1,5" met rond AMOLED-scherm, ESP32-S3', 'VIEWE UEDX46460015-MD50E (zwart)'],
  ['-A3', '1', 'Adapterprint FPC 10-polig 0,5 mm naar 2,54 mm, 23 x 47 mm', 'FPC/FFC-breakout 10P'],
  ['-X7', '1', 'USB-C-bus (breakout 16-polig, USB 2.0, 5,1 kΩ op CC)', '—'],
  ['-W1', '1', 'USB-C-kabel C-C, 0,5 m, haaks (USB 2.0 volstaat)', '—'],
  ['-M1', '1', 'Ventilator 120 x 38 mm, 12 V, PWM', 'Delta PFR1212UHE-SP00'],
  ['-A2', '1', 'Gaatjesprint 30 x 70 mm (gaten 2 mm)', '—'],
  ['-X3', '1', 'Printschroefklem 4-polig steek 3,5 mm', '—'],
  ['—', '1 m', 'Siliconeslang 3 x 5 mm (drukmeter)', '—'],
];
function blad6() {
  return kader(6, 'Stuklijst elektronica', [tabel(X0, 20, [['Code', 34], ['Aantal', 16], ['Omschrijving', 140], ['Type / bestelnummer', 95]], STUKLIJST)]);
}

const bladen = [blad1(), blad2(), blad3(), blad4(), blad5(), blad6()];
bladen.forEach((svg, k) => writeFileSync(join(HERE, `blad-${k + 1}.svg`), svg));
writeFileSync(join(HERE, 'schema.html'), `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Aansluitschema afzuiging Lush Beauty</title>
<style>@page { size: A3 landscape; margin: 0 } body { margin: 0 } .blad { width: 420mm; height: 297mm; page-break-after: always; overflow: hidden } .blad svg { width: 420mm; height: 297mm; display: block }</style></head>
<body>${bladen.map((s) => `<div class="blad">${s.replace(/width="420mm" height="297mm" /, '')}</div>`).join('\n')}</body></html>`);
console.log(`geschreven: blad-1..${bladen.length}.svg en schema.html`);
