// Schemaset van de robotcel zoals EPLAN Electric P8 hem afdrukt, volgens IEC/EN 61082-1, 60617, 81346-1/-2, 61355,
// ISO 7200 en ISO 5457 (voorbeelden/lib/eplan.mjs); pneumatiek volgens ISO 1219-1. =ROB is de installatie, +KAST de
// schakelkast, +CEL de cel (veld). Aanduidingen volgens ISO/IEC 81346-2: -Q schakelen (hoofdschakelaar, netmagneet,
// ventielen), -F beveiligen, -R begrenzen (netfilter, remweerstand), -T omvormen (voedingen, servoversterkers),
// -K informatie verwerken (PC, veiligheidsbesturing, I/O, relais, switch), -M motoren, -B sensoren (lichtschermen,
// deurschakelaar, vacuümschakelaars, camera, laser, fotocel), -S bediening, -P tonen (HMI, toren, lampen),
// -E ventilatie en licht, -G buffer, -X klemmen en stekkers, -W kabels.
// Gebruik: node voorbeelden/robotarm/schema/maak-schema.mjs  (schrijft blad-N.svg en schema.html)
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  X0, X1, Y0, Y1, T, L, punt, rect, toestel, rail, onderbreking, ref, klem, motor,
  titelblad, inhoudsopgave, klemmenplan, stuklijst, project, schrijf, SOORT, NORMEN, tabel,
} from '../../lib/eplan.mjs';
import { KAST, GOTEN, RAILS, TOESTELLEN, DEUR, WARMTE, warmteTotaal } from '../kast/indeling.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PROJECT = {
  naam: 'Robotcel deuren', omschrijving: 'robot PR 120 R2700 met vlakgrijper en camera', eigenaar: 'Ian', tekeningnr: 'ROB-E01',
  installatie: '=ROB', installatieNaam: 'robotcel', plaats: '+KAST', plaatsNaam: 'schakelkast VX25',
  datum: '2026-11-09', getekend: 'Phlippo CAD', gecontroleerd: 'Ian', norm: 'IEC 81346', revisie: { index: '1', datum: '2026-11-09', naam: 'PC' },
};
const B = { net: 3, servo1: 4, servo2: 5, v24: 6, veilig: 7, net2: 8, in: 9, uit: 10, pneu: 11, opst: 12, deur: 13 };
const R = X1 - 4;
const STREEP = '3 1.5';

// ---------------------------------------------------------------- symbolen (IEC 60617), verticaal van y tot y + 16
/** contact: NO (maak), NC (verbreek); kop: 'x' vermogensschakelaar, '-' lastscheider, 'o' magneetschakelaar */
function contact(x, y, { nc = false, kop = '' } = {}) {
  const r = [L([[x, y], [x, y + 5]]), L([[x, y + 11], [x, y + 16]])];
  r.push(nc ? L([[x, y + 11], [x + 4, y + 4.2]], { w: 0.35 }) : L([[x, y + 11], [x - 4, y + 4.8]], { w: 0.35 }));
  if (nc) r.push(L([[x, y + 5], [x + 4.6, y + 5]], { w: 0.35 }));
  if (kop === 'x') r.push(L([[x - 1.1, y + 3.9], [x + 1.1, y + 6.1]], { w: 0.35 }), L([[x - 1.1, y + 6.1], [x + 1.1, y + 3.9]], { w: 0.35 }));
  if (kop === '-') r.push(L([[x - 1.4, y + 5], [x + 1.4, y + 5]], { w: 0.35 }));
  if (kop === 'o') r.push(`<path d="M ${x - 1.3} ${y + 5} a 1.3 1.3 0 0 0 2.6 0" fill="none" stroke="#000" stroke-width="0.35"/>`);
  return r.join('');
}
/** n polen naast elkaar (steek 10) met een gestippelde mechanische koppeling en de aanduiding links */
function polen(x, y, n, code, regels, opts) {
  const r = [];
  for (let k = 0; k < n; k++) r.push(contact(x + k * 10, y, opts));
  r.push(L([[x - 2.6, y + 8], [x + (n - 1) * 10 - 1, y + 8]], { w: 0.25, streep: STREEP }));
  r.push(T(x - 6, y + 6.5, code, { size: 2.8, anchor: 'end' }), ...regels.map((t, i) => T(x - 6, y + 9.7 + i * 3, t, { size: 2.2, anchor: 'end' })));
  return r.join('');
}
/** spoel (relais, magneetschakelaar, ventiel) van y tot y + 16, A1 boven en A2 onder */
function spoel(x, y, code, regels = [], { ventiel = false } = {}) {
  const r = [L([[x, y], [x, y + 5]]), rect(x - 5, y + 5, 10, 6, { w2: 0.35 }), L([[x, y + 11], [x, y + 16]])];
  if (ventiel) r.push(L([[x - 5, y + 11], [x + 5, y + 5]], { w: 0.35 }));
  r.push(T(x + 1, y + 4.2, 'A1', { size: 1.8 }), T(x + 1, y + 14.6, 'A2', { size: 1.8 }), T(x + 7, y + 8, code, { size: 2.8 }), ...regels.map((t, i) => T(x + 7, y + 11 + i * 2.9, t, { size: 2.1 })));
  return r.join('');
}
/** signaallamp (cirkel met kruis) van y tot y + 16 */
function lamp(x, y, code, kleur) {
  return [L([[x, y], [x, y + 4]]), `<circle cx="${x}" cy="${y + 8}" r="4" fill="none" stroke="#000" stroke-width="0.35"/>`, L([[x - 2.8, y + 5.2], [x + 2.8, y + 10.8]], { w: 0.35 }), L([[x - 2.8, y + 10.8], [x + 2.8, y + 5.2]], { w: 0.35 }), L([[x, y + 12], [x, y + 16]]), T(x + 6, y + 7, code, { size: 2.8 }), T(x + 6, y + 10, kleur, { size: 2.1 })].join('');
}
/** drukknop (NO of NC) van y tot y + 16 met de bedieningskop links */
function knop(x, y, code, regels, nc = false, paddestoel = false) {
  return [contact(x, y, { nc }), L([[x - 2.4, y + 8], [x - 8, y + 8]], { w: 0.25, streep: STREEP }), paddestoel ? `<path d="M ${x - 10} ${y + 5} a 3 3 0 0 0 0 6 z" fill="none" stroke="#000" stroke-width="0.35"/>` : L([[x - 9, y + 6], [x - 9, y + 10], [x - 8, y + 10], [x - 8, y + 6], [x - 9, y + 6]], { w: 0.35 }),
    T(x + 6, y + 7, code, { size: 2.8 }), ...regels.map((t, i) => T(x + 6, y + 10 + i * 2.9, t, { size: 2.1 }))].join('');
}
const draad = (pts) => L(pts);
const kruisRef = (x, y, tekst) => T(x, y, tekst, { size: 2.1 });

// ---------------------------------------------------------------- blad 3: voeding 400 V
function net() {
  const i = [], y0 = 40, xs = [70, 80, 90];
  i.push(T(X0 + 4, 26, 'Netaansluiting 3 x 400 V / N / PE, 50 Hz, 32 A (CEE 32 A 5-polig of vaste aansluiting); Icc ≤ 10 kA', { size: 2.6 }));
  ['L1', 'L2', 'L3', 'N'].forEach((n, k) => { const x = 70 + k * 10; i.push(klem(x, y0, '-X1', String(k + 1)), T(x, y0 - 4, n, { size: 2.3, anchor: 'middle' })); });
  i.push(klem(110, y0, '-X1', 'PE'), T(110, y0 - 4, 'PE', { size: 2.3, anchor: 'middle' }));
  i.push(T(40, y0 - 4, '-W1  H07RN-F 5G6', { size: 2.3, anchor: 'end' }));
  xs.forEach((x) => i.push(draad([[x, y0 + 1.2], [x, 55]])));
  i.push(polen(70, 55, 3, '-Q1', ['Hoofdschakelaar 40 A', 'ABB OT40FT3', 'afsluitbaar, deurgreep'], { kop: '-' }));
  i.push(draad([[100, y0 + 1.2], [100, 104]]));
  // overspanningsbeveiliging
  xs.forEach((x) => i.push(draad([[x, 71], [x, 100]])));
  // overspanningsbeveiliging -F1 rechts van de fasen, naar PE
  i.push(draad([[70, 76], [120, 76], [120, 82]]), draad([[80, 79], [126, 79], [126, 82]]), draad([[90, 82], [132, 82]]), punt(70, 76), punt(80, 79), punt(90, 82));
  i.push(rect(116, 82, 22, 12, { w2: 0.35 }), T(127, 89.5, 'SPD T2', { size: 2.1, anchor: 'middle' }), T(140, 86, '-F1', { size: 2.8 }), T(140, 89, 'VAL-MS 230/3+1', { size: 2.1 }), draad([[127, 94], [127, 100], [110, 100]]), punt(110, 100));
  // netfilter en netmagneet
  i.push(rect(64, 100, 32, 14, { w2: 0.35, streep: '4 1 0.6 1' }), T(80, 108, '≈ EMC', { size: 2.4, anchor: 'middle' }), T(62, 104, '-R1', { size: 2.8, anchor: 'end' }), T(62, 107.5, 'FN3258-35', { size: 2.1, anchor: 'end' }));
  xs.forEach((x) => i.push(draad([[x, 114], [x, 122]])));
  i.push(polen(70, 122, 3, '-Q2', ['Netmagneet 18,5 kW', '3RT2026, 24 V DC', `spoel ${ref(B.veilig, 330)}`], { kop: 'o' }));
  i.push(draad([[110, y0 + 1.2], [110, 245]]), T(112, 240, 'PE', { size: 2.3 }));
  xs.forEach((x, k) => i.push(draad([[x, 138], [x, 150 + k * 9], [R, 150 + k * 9]]), onderbreking(R, 150 + k * 9, `${['L1', 'L2', 'L3'][k]} na -Q2`, k === 0 ? `${ref(B.servo1, X0)}  ${ref(B.servo2, X0)}` : '', 'rechts')));
  // takken: 24 V primair, ventilatie en licht, servicestopcontact (L1, L2, L3 verdeeld) — vóór -Q2 (blijven onder spanning)
  const tak = (x, fase, code, regels, doel, naar) => {
    i.push(punt(xs[fase], 92 + fase * 2), draad([[xs[fase], 92 + fase * 2], [x, 92 + fase * 2], [x, 196]]));
    i.push(polen(x, 196, 1, code, regels, { kop: 'x' }), draad([[x, 212], [x, 228]]), onderbreking(x, 228, doel, naar, 'onder'));
  };
  tak(170, 0, '-F2', ['C6, 1P', 'voeding 24 V'], 'L1/N -T1', ref(B.v24, 40));
  tak(225, 1, '-F3', ['C6, 1P', 'ventilatie, licht'], 'L2/N -E1 -E2 -E5', ref(B.deur, 300));
  tak(280, 2, '-F4', ['C10 30 mA', 'stopcontact'], 'L3/N -X9', '');
  i.push(punt(100, 104), draad([[100, 104], [330, 104], [330, 228]]), T(332, 110, 'N', { size: 2.3 }));
  i.push(T(330, 236, 'N naar -T1, -E1, -E2, -E5, -X9', { size: 2.1, anchor: 'middle' }));
  i.push(T(X0 + 4, 252, 'Takken -F2, -F3, -F4 zitten vóór -Q2: kastlicht, ventilatie, 24 V en stopcontact blijven aan na een noodstop (stopcategorie 1 schakelt alleen de servoversterkers af).', { size: 2.3 }));
  i.push(T(X0 + 4, 256, `Warmte in de kast bij volle belasting: ${warmteTotaal().toFixed(0)} W -> filterventilator ${Math.round(3.1 * warmteTotaal() / 10)} m³/h nodig bij ΔT 10 K; gekozen 2 x 500 m³/h (-E1, -E2).`, { size: 2.3 }));
  return { titel: ['Voeding 400 V', 'netaansluiting, hoofdschakelaar, netmagneet'], inhoud: i };
}

// ---------------------------------------------------------------- bladen 4 en 5: servoversterkers en motoren
const SERVO = [
  { as: 'A1', T: '-T11', F: '-F11', M: '-M1', kw: '2,9 kW', type: 'SV660NT017I', mot: 'MS1H3-29C15CD-A334R', rv: 'RV-320C', c: 'C16' },
  { as: 'A2', T: '-T12', F: '-F12', M: '-M2', kw: '2,9 kW', type: 'SV660NT017I', mot: 'MS1H3-29C15CD-A334R', rv: 'RV-320C', c: 'C16' },
  { as: 'A3', T: '-T13', F: '-F13', M: '-M3', kw: '4,4 kW', type: 'SV660NT021I', mot: 'MS1H3-44C15CD-A334R', rv: 'RV-320C', c: 'C16' },
  { as: 'A4', T: '-T14', F: '-F14', M: '-M4', kw: '1,3 kW', type: 'SV660NT5R4I', mot: 'MS1H3-13C15CD-A334R', rv: 'RV-100C', c: 'C10' },
  { as: 'A5', T: '-T15', F: '-F15', M: '-M5', kw: '1,3 kW', type: 'SV660NT5R4I', mot: 'MS1H3-13C15CD-A334R', rv: 'RV-100C', c: 'C10' },
  { as: 'A6', T: '-T16', F: '-F16', M: '-M6', kw: '1,3 kW', type: 'SV660NT5R4I', mot: 'MS1H3-13C15CD-A334R', rv: 'RV-50C', c: 'C10' },
];
function servoBlad(vanaf, blad) {
  const i = [], ys = [46, 52, 58];
  ys.forEach((y, k) => { i.push(rail(y, X0 + 2, R, ['L1', 'L2', 'L3'][k], { van: k === 0 ? ref(B.net, 350) : '' })); });
  i.push(rail(244, X0 + 2, R, 'PE'));
  SERVO.slice(vanaf, vanaf + 3).forEach((s, n) => {
    const x = 70 + n * 120;
    [0, 1, 2].forEach((k) => i.push(punt(x + k * 10, ys[k]), draad([[x + k * 10, ys[k]], [x + k * 10, 64]])));
    i.push(polen(x, 64, 3, s.F, [`${s.c}, 3P`, `servo ${s.as}`], { kop: 'x' }));
    [0, 1, 2].forEach((k) => i.push(draad([[x + k * 10, 80], [x + k * 10, 92]])));
    i.push(toestel(x - 12, 92, 66, 72, s.T, ['', `Servoversterker ${s.as}`, `Inovance ${s.type}`, '400 V, EtherCAT, STO', `rem 24 V, encoder 23 bit`],
      [{ x: 12, y: 0, naam: 'L1' }, { x: 22, y: 0, naam: 'L2' }, { x: 32, y: 0, naam: 'L3' }, { x: 12, y: 72, naam: 'U' }, { x: 22, y: 72, naam: 'V' }, { x: 32, y: 72, naam: 'W' }, { x: 42, y: 72, naam: 'PE' },
        { x: 66, y: 14, naam: 'STO1' }, { x: 66, y: 20, naam: 'STO2' }, { x: 66, y: 32, naam: 'ECAT IN' }, { x: 66, y: 38, naam: 'ECAT OUT' }, { x: 66, y: 50, naam: 'BK+' }, { x: 66, y: 56, naam: 'CN2 enc.' }]));
    i.push(kruisRef(x + 58, 104, ref(B.veilig, 360)), kruisRef(x + 58, 122, ref(B.net2, 200)));
    // naar de robot via de Harting-stekker -X10 en de motorkabel -W1n
    [0, 1, 2, 3].forEach((k) => i.push(draad([[x + k * 10, 164], [x + k * 10, 186]]), klem(x + k * 10, 186, '-X10', String(n * 4 + k + 1 + vanaf * 4))));
    i.push(punt(x + 30, 244), draad([[x + 30, 244], [x + 30, 237], [x + 30, 237]]));
    i.push(T(x - 8, 196, `-W1${vanaf + n + 1}`, { size: 2.6, anchor: 'end' }), T(x - 8, 199, 'motor 4G1,5 + 2x1', { size: 2.0, anchor: 'end' }));
    [0, 1, 2].forEach((k) => i.push(draad([[x + k * 10, 187.2], [x + k * 10, 200], [x + 10, 206]])));
    i.push(motor(x + 10, 214, s.M, [`${s.kw}, 3~, 400 V`, `Inovance ${s.mot}`, `rem 24 V, ${s.rv}`]));
    i.push(T(x + 6, 230, `As ${s.as}`, { size: 3.2, bold: true }));
    i.push(draad([[x + 30, 187.2], [x + 30, 244]]));
  });
  i.push(T(X0 + 4, 30, 'Elke servoversterker: eigen installatieautomaat, STO tweekanalig van de veiligheidsbesturing -K2, EtherCAT in een lijn (IPC -K1 -> -T11 -> ... -> -T16 -> -K3).', { size: 2.4 }));
  i.push(T(X0 + 4, 34, 'Motorkabels afgeschermd (afscherming 360° op de PE-rail en in de Harting-kap); encoder- en remaders in de hybride kabel (één kabel per as).', { size: 2.4 }));
  return { titel: [`Servoversterkers ${SERVO[vanaf].as} tot ${SERVO[vanaf + 2].as}`, 'vermogen, motor, rem'], inhoud: i };
}

// ---------------------------------------------------------------- blad 6: 24 V DC
function v24() {
  const i = [];
  i.push(onderbreking(40, 34, 'L1/N', ref(B.net, 170), 'boven'), draad([[40, 34], [40, 50]]), draad([[50, 34], [50, 50]]));
  i.push(toestel(30, 50, 40, 36, '-T1', ['', 'Voeding 24 V', 'SDR-480-24', '20 A'], [{ x: 10, y: 0, naam: 'L' }, { x: 20, y: 0, naam: 'N' }, { x: 10, y: 36, naam: '+' }, { x: 30, y: 36, naam: '−' }]));
  i.push(draad([[40, 86], [40, 100], [80, 100]]), draad([[60, 86], [60, 230]]));
  i.push(toestel(80, 92, 34, 26, '-G1', ['', 'Buffer 24 V', 'DRB-480-24'], [{ x: 0, y: 8, naam: 'IN+' }, { x: 34, y: 8, naam: 'OUT+' }]));
  i.push(draad([[114, 100], [130, 100]]), rail(100, 130, R, 'L+', {}));
  const groepen = [['-F21', '24 V IPC -K1', B.net2], ['-F22', '24 V veiligheid -K2', B.veilig], ['-F23', '24 V I/O en sensoren -K3', B.in], ['-F24', '24 V ventielen', B.uit], ['-F25', '24 V camera, switch', B.net2], ['-F26', '24 V HMI, kastlicht', B.net2]];
  groepen.forEach(([c, t, b], k) => {
    const x = 150 + k * 40;
    i.push(punt(x, 100), draad([[x, 100], [x, 120]]), rect(x - 4, 120, 8, 14, { w2: 0.35 }), T(x - 6, 125, c, { size: 2.6, anchor: 'end' }), T(x - 6, 128, 'CBM E4', { size: 2.0, anchor: 'end' }), T(x, 129.5, 'e', { size: 2.4, anchor: 'middle' }));
    i.push(draad([[x, 134], [x, 160]]), klem(x, 160, '-X2', String(k + 1)), draad([[x, 161.2], [x, 176]]), onderbreking(x, 176, `L+${k + 1}`, ref(b, 60), 'onder'));
    i.push(T(x, 188, t, { size: 2.0, anchor: 'middle' }));
  });
  i.push(rail(230, 60, R, 'M', { naar: `${ref(B.veilig, X0)}  ${ref(B.in, X0)}  ${ref(B.uit, X0)}` }));
  // aparte voeding voor de remmen
  i.push(onderbreking(40, 200, 'L1/N', ref(B.net, 170), 'boven'));
  i.push(T(X0 + 4, 246, 'Remmen: aparte voeding -T2 (SDR-240-24) op dezelfde tak, zodat een kortsluiting in een remkabel de besturing niet stillegt; de servoversterkers schakelen BK+.', { size: 2.3 }));
  i.push(T(X0 + 4, 251, 'Stroombudget 24 V: IPC 2 A, -K2 0,5 A, I/O en sensoren 3 A, ventielen 4 A, camera en switch 1,5 A, HMI 1,5 A = 12,5 A van 20 A (63 %).', { size: 2.3 }));
  return { titel: ['Voeding 24 V DC', 'verdeling met elektronische beveiligingen'], inhoud: i };
}

// ---------------------------------------------------------------- blad 7: veiligheid
function veilig() {
  const i = [];
  i.push(rail(40, X0 + 2, R, 'L+2', { van: ref(B.v24, 190) }), rail(240, X0 + 2, R, 'M', { van: ref(B.v24, 60) }));
  i.push(toestel(150, 96, 110, 96, '-K2', ['', 'Veiligheidsbesturing PL d, cat. 3', 'Pilz PNOZmulti 2 772100', '+ PNOZ m EF 16DI 772140', 'programma: docs/Veiligheid.md'],
    [{ x: 0, y: 12, naam: 'I0/I1' }, { x: 0, y: 24, naam: 'I2/I3' }, { x: 0, y: 36, naam: 'I4/I5' }, { x: 0, y: 48, naam: 'I6/I7' }, { x: 0, y: 60, naam: 'I8/I9' }, { x: 0, y: 72, naam: 'I10' }, { x: 0, y: 84, naam: 'I11' },
      { x: 110, y: 12, naam: 'O0/O1' }, { x: 110, y: 30, naam: 'O2' }, { x: 110, y: 48, naam: 'O3' }, { x: 110, y: 66, naam: 'O4' }, { x: 110, y: 84, naam: 'T0/T1' }]));
  // ingangen (tweekanalig, getest met T0/T1)
  const ing = [['-S1', 'Noodstop bedienpaneel', 2, 'NC', 'paddestoel'], ['-S2', 'Noodstop kastdeur', 2, 'NC', 'paddestoel'], ['-B10', 'Toegangsdeur, vergrendeling AZM201', 2, 'NC'], ['-B11', 'Lichtscherm ingang (OSSD)', 2, 'OSSD'], ['-B12', 'Lichtscherm uitgang (OSSD)', 2, 'OSSD'], ['-B13..-B16', 'Muting-sensoren band', 1, 'NO'], ['-S3', 'Reset (blauw)', 1, 'NO']];
  ing.forEach(([c, t, k, soort, p], n) => {
    const y = 108 + n * 12 - 6;
    i.push(draad([[60, y], [150, y]]), T(62, y - 1.2, `${c}  ${t}`, { size: 2.2 }), T(140, y + 3, `${soort}${k === 2 ? ', 2 kanalen' : ''}`, { size: 1.9, anchor: 'end' }));
  });
  i.push(T(60, 92, 'Ingangen (veld via -X3, tweekanalig, kortsluitbewaking met testpulsen T0/T1)', { size: 2.3, bold: true }));
  // uitgangen
  const uit = [['STO A1..A6', `-T11..-T16 STO1/STO2 ${ref(B.servo1, 120)} ${ref(B.servo2, 120)}`], ['-Q2 netmagneet (stop cat. 1, na 1 s)', ref(B.net, 70)], ['-Q30 veilig ontluchten (ISO 4414)', ref(B.pneu, 120)], ['-P2 muting-lamp (wit)', ''], ['testpulsen naar de ingangen', '']];
  uit.forEach(([t, r], n) => { const y = 108 + n * 18 - 6; i.push(draad([[260, y], [340, y]]), T(262, y - 1.2, t, { size: 2.2 }), T(262, y + 3, r, { size: 2.0 })); });
  i.push(spoel(330, 200, '-Q2', ['3RT2026', `${ref(B.net, 70)}`]), draad([[330, 216], [330, 240]]), punt(330, 240));
  i.push(lamp(370, 200, '-P2', 'wit (muting)'), draad([[370, 216], [370, 240]]), punt(370, 240));
  i.push(T(X0 + 4, 30, 'Veiligheidsfuncties (risicobeoordeling EN ISO 12100 / EN ISO 10218-2, PLr d): SF1 noodstop (stop cat. 1), SF2 deur open -> STO, SF3 lichtscherm onderbroken zonder muting -> STO,', { size: 2.3 }));
  i.push(T(X0 + 4, 34, 'SF4 vacuüm wegvallend tijdens dragen -> stop cat. 1 + vergrendelen, SF5 handbediening met 250 mm/s en vrijgaveknop (T1). Validatie met SISTEMA; deze bladen tonen de bedrading.', { size: 2.3 }));
  return { titel: ['Veiligheid', 'noodstop, deur, lichtschermen, STO'], inhoud: i };
}

// ---------------------------------------------------------------- blad 8: besturing en netwerk
function net2() {
  const i = [];
  i.push(rail(40, X0 + 2, R, 'L+1', { van: ref(B.v24, 150) }), rail(240, X0 + 2, R, 'M', { van: ref(B.v24, 60) }));
  i.push(toestel(40, 70, 90, 70, '-K1', ['', 'Industriële PC (fanloos)', 'Linux + PREEMPT_RT, LinuxCNC', 'EtherCAT-master (IgH)', 'HMI-server, grijpplanner', 'camera-software (OpenCV)'],
    [{ x: 90, y: 14, naam: 'LAN1 EtherCAT' }, { x: 90, y: 28, naam: 'LAN2 GigE' }, { x: 90, y: 42, naam: 'HDMI' }, { x: 90, y: 50, naam: 'USB' }, { x: 45, y: 70, naam: '24 V' }]));
  i.push(draad([[85, 140], [85, 240]]));
  // EtherCAT-lijn
  const xs = [170, 200, 230, 260, 290, 320, 360];
  i.push(draad([[130, 84], [xs[0], 84]]));
  ['-T11', '-T12', '-T13', '-T14', '-T15', '-T16', '-K3'].forEach((c, k) => {
    i.push(rect(xs[k] - 8, 76, 16, 16, { w2: 0.35, streep: '4 1 0.6 1' }), T(xs[k], 73, c, { size: 2.4, anchor: 'middle' }), T(xs[k], 86, k < 6 ? `A${k + 1}` : 'I/O', { size: 2.2, anchor: 'middle' }));
    if (k < 6) i.push(draad([[xs[k] + 8, 84], [xs[k + 1] - 8, 84]]));
  });
  i.push(T(250, 66, 'EtherCAT (CAT5e afgeschermd, -W30..-W36), cyclus 1 ms', { size: 2.3, anchor: 'middle' }));
  // switch en camera
  i.push(draad([[130, 98], [170, 98], [170, 120]]));
  i.push(toestel(150, 120, 60, 36, '-K4', ['', 'Switch 5 poorten', 'FL SWITCH 1001T-4POE-GT'], [{ x: 20, y: 0, naam: 'P1' }, { x: 60, y: 12, naam: 'P2 PoE' }, { x: 60, y: 24, naam: 'P3' }]));
  i.push(draad([[210, 132], [250, 132]]), toestel(250, 120, 54, 26, '-B30', ['', 'Camera Basler ace 2', 'a2A2448-23gmBAS, GigE'], [{ x: 0, y: 12, naam: 'PoE' }]));
  i.push(draad([[210, 144], [330, 144], [330, 160]]), toestel(310, 160, 60, 30, '-K5', ['', 'Netwerk fabriek', '(optioneel, VPN-router)'], [{ x: 20, y: 0, naam: 'LAN' }]));
  // HMI
  i.push(draad([[130, 112], [140, 112], [140, 200], [170, 200]]), draad([[130, 120], [136, 120], [136, 206], [170, 206]]));
  i.push(toestel(170, 190, 60, 30, '-P10', ['', 'HMI 15,6" aanraak', 'FPM-215W-P4BE'], [{ x: 0, y: 10, naam: 'HDMI' }, { x: 0, y: 16, naam: 'USB' }, { x: 30, y: 30, naam: '24 V' }]));
  i.push(onderbreking(200, 232, 'L+6', ref(B.v24, 350), 'boven'));
  i.push(T(X0 + 4, 30, 'De IPC rekent de kinematica (6 assen), de baan en de grijpplanning; de HMI is een webpagina op de IPC (voorbeelden/robotarm/hmi). De veiligheid zit niet in de IPC maar in -K2.', { size: 2.3 }));
  return { titel: ['Besturing en netwerk', 'IPC, EtherCAT, camera, HMI'], inhoud: i };
}

// ---------------------------------------------------------------- bladen 9 en 10: ingangen en uitgangen (-K3)
const DI = [['-B21', 'Vacuüm zone 1 ok (FA-M)'], ['-B22', 'Vacuüm zone 2 ok (FMP-60)'], ['-B23', 'Vacuüm zone 3 ok (FA-M)'], ['-B24', 'Perslucht ≥ 5 bar'], ['-B32', 'Fotocel ingang band (stuk aanwezig)'], ['-B33', 'Stuk tegen de stopper'], ['-B34', 'Stopper omhoog'], ['-B35', 'Stopper omlaag'],
  ['-S4', 'Keuze automaat (sleutel)'], ['-S4', 'Keuze hand (sleutel)'], ['-S5', 'Start cyclus'], ['-S6', 'Stop cyclus'], ['-K2', 'Veiligheid in orde (O4)'], ['-B10', 'Deur dicht (meldcontact)'], ['-B36', 'Afleg: stapel A vol'], ['-B37', 'Afleg: rek B vol']];
const DO = [['-Q21', 'Zone 1 zuigen'], ['-Q22', 'Zone 2 zuigen'], ['-Q23', 'Zone 3 zuigen'], ['-Q24', 'Afblazen (alle zones)'], ['-Q25', 'Stopper omhoog'], ['-K11', 'Toren rood'], ['-K12', 'Toren oranje'], ['-K13', 'Toren groen'],
  ['-K14', 'Band stoppen (naar de bandbesturing)'], ['-P11', 'Zoemer toren'], ['-P12', 'Lamp start (groen)'], ['-P13', 'Lamp reset (blauw)'], ['-Q26', 'Perslucht grijper aan'], ['-E3', 'Ledbalken camera'], ['', 'reserve'], ['', 'reserve']];
function ioBlad(ingangen) {
  const i = [], lijst = ingangen ? DI : DO;
  i.push(rail(40, X0 + 2, R, ingangen ? 'L+3' : 'L+4', { van: ref(B.v24, ingangen ? 230 : 270) }), rail(240, X0 + 2, R, 'M', { van: ref(B.v24, 60) }));
  i.push(toestel(30, 112, R - 40, 22, '-K3', ['', ingangen ? 'EtherCAT-I/O: EL1809, 16 digitale ingangen 24 V (in de kast, na EK1100)' : 'EtherCAT-I/O: EL2809, 16 digitale uitgangen 24 V, 0,5 A; EL3002 2 x 0..10 V (laser -B31)'], []));
  lijst.forEach(([c, t], k) => {
    const x = 40 + k * 23.5;
    if (ingangen) {
      i.push(punt(x, 40), draad([[x, 40], [x, 56]]), klem(x, 56, '-X4', String(k + 1)), draad([[x, 57.2], [x, 64]]));
      if (c) i.push(knop(x, 64, c, [], false));
      i.push(draad([[x, 80], [x, 100]]), klem(x, 100, '-X4', String(k + 17)), draad([[x, 101.2], [x, 112]]), T(x, 136, `I${k + 1}`, { size: 2.2, anchor: 'middle' }));
      i.push(T(x + 1, 156, t, { size: 2.0, hoek: 90 }));
    } else {
      i.push(T(x, 110, `O${k + 1}`, { size: 2.2, anchor: 'middle' }), draad([[x, 134], [x, 148]]), klem(x, 148, '-X4', String(k + 33)), draad([[x, 149.2], [x, 156]]));
      if (c && /^-(Q|K1)/.test(c)) i.push(spoel(x, 156, c, [], { ventiel: c.startsWith('-Q') }));
      else if (c) i.push(lamp(x, 156, c, ''));
      i.push(draad([[x, 172], [x, 240]]), punt(x, 240), T(x + 1, 176, t, { size: 2.0, hoek: 90 }));
    }
  });
  if (ingangen) i.push(T(X0 + 4, 30, 'Sensoren PNP, 24 V; vacuümschakelaars Schmalz/SMC ZSE20A met schakelpunt -400 mbar (zone niet bedekt = niet gebruikt). Laser -B31 en de analoge waarden op blad 10.', { size: 2.3 }));
  else i.push(T(X0 + 4, 30, 'Ventielspoelen 24 V DC met led en vrijloopdiode; -Q21..-Q24 zitten in de FA-Mc-balken en het ventieleiland op de grijper (kabel in het slangenpakket).', { size: 2.3 }));
  return { titel: ingangen ? ['Ingangen', '-K3 EL1809, 16 x 24 V'] : ['Uitgangen', '-K3 EL2809, 16 x 24 V / 0,5 A'], inhoud: i };
}

// ---------------------------------------------------------------- blad 11: pneumatiek (ISO 1219-1)
function pneu() {
  const i = [];
  const bron = (x, y) => [`<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="#000" stroke-width="0.35"/>`, `<path d="M ${x} ${y - 2.6} L ${x - 2} ${y + 1.4} L ${x + 2} ${y + 1.4} Z" fill="#000"/>`].join('');
  const ventiel32 = (x, y, code, tekst) => [rect(x, y, 12, 10), rect(x + 12, y, 12, 10), L([[x + 3, y + 10], [x + 9, y]], { w: 0.3 }), L([[x + 21, y + 10], [x + 21, y]], { w: 0.3 }), L([[x + 15, y + 2], [x + 18, y + 2]], { w: 0.3 }),
    rect(x - 8, y + 2, 8, 6), L([[x - 8, y + 8], [x, y + 2]], { w: 0.3 }), L([[x + 24, y + 5], [x + 28, y + 2], [x + 28, y + 8], [x + 32, y + 5]], { w: 0.3 }), T(x + 12, y - 2, code, { size: 2.6, anchor: 'middle' }), T(x + 12, y + 14, tekst, { size: 2.0, anchor: 'middle' })].join('');
  const ejector = (x, y, code, tekst) => [rect(x - 9, y, 18, 14), L([[x - 9, y + 4], [x - 2, y + 7], [x - 9, y + 10]], { w: 0.3 }), L([[x + 9, y + 4], [x + 2, y + 7], [x + 9, y + 10]], { w: 0.3 }), L([[x, y + 14], [x, y + 20]]), T(x + 11, y + 6, code, { size: 2.6 }), T(x + 11, y + 9.5, tekst, { size: 2.0 })].join('');
  const vac = (x, y, code) => [`<circle cx="${x}" cy="${y}" r="3.5" fill="none" stroke="#000" stroke-width="0.35"/>`, T(x, y + 1, 'P', { size: 2.2, anchor: 'middle' }), T(x + 5, y + 1, code, { size: 2.4 })].join('');
  i.push(bron(40, 60), T(40, 70, 'perslucht 6 bar', { size: 2.2, anchor: 'middle' }), draad([[44, 60], [70, 60]]));
  i.push(rect(70, 52, 20, 16), L([[80, 52], [80, 68]], { w: 0.3, streep: '1 1' }), T(80, 49, '-Q29', { size: 2.6, anchor: 'middle' }), T(80, 74, 'filter-regelaar 5 µm, 6 bar', { size: 2.0, anchor: 'middle' }));
  i.push(draad([[90, 60], [110, 60]]), ventiel32(118, 55, '-Q30', 'veilig ontluchten + zachte start (ISO 4414), van -K2'), draad([[150, 60], [176, 60]]), vac(180, 60, '-B24'), draad([[184, 60], [210, 60], [210, 100]]));
  i.push(T(212, 80, 'slangenpakket robot (PU 12 x 8)', { size: 2.2 }));
  // drie zones + afblazen
  const zones = [['-Q21', 'zone 1 FA-M', '-B21'], ['-Q22', 'zone 2 FMP-60', '-B22'], ['-Q23', 'zone 3 FA-M', '-B23']];
  i.push(draad([[60, 100], [360, 100]]));
  zones.forEach(([q, t, b], k) => {
    const x = 90 + k * 110;
    i.push(punt(x, 100), draad([[x, 100], [x, 112]]), ventiel32(x - 12, 112, q, t), draad([[x, 122], [x, 140]]), ejector(x, 140, k === 1 ? '-K23' : `-K2${k + 1}`, k === 1 ? '1 x SBPL 100 HV' : '2 x SBPL 100 HV'));
    i.push(draad([[x, 160], [x, 180]]), vac(x + 14, 170, b), draad([[x, 170], [x + 10.5, 170]]), rect(x - 30, 180, 60, 10), T(x, 187, `zuigbalk ${t}`, { size: 2.2, anchor: 'middle' }));
  });
  i.push(punt(360, 100), draad([[360, 100], [360, 112]]), ventiel32(348, 112, '-Q24', 'afblazen'), draad([[360, 122], [360, 176], [330, 176]]), T(362, 160, 'naar de 3 balken', { size: 2.0 }));
  // stopper
  i.push(punt(60, 100), draad([[60, 100], [60, 200]]), ventiel32(48, 200, '-Q25', 'stopper'), draad([[60, 210], [60, 222]]), rect(48, 222, 24, 10), L([[60, 222], [60, 216]], { w: 0.5 }), T(76, 228, 'stopper Festo DFST-50-30 (enkelwerkend, veer)', { size: 2.2 }));
  i.push(T(X0 + 4, 30, 'Pneumatiekschema volgens ISO 1219-1. Lucht: 5 x SBPL 100 HV = 1975 l/min (±119 m³/h) zolang er gezogen wordt; compressor ±15 kW of zijkanaalblazer voor het vacuüm (docs/Berekeningen.md).', { size: 2.3 }));
  i.push(T(X0 + 4, 34, 'Bij stroom- of luchtuitval: terugslagkleppen in de balken houden het vacuüm kort vast, -Q30 ontlucht de rest veilig; de robot remt (stop cat. 1) en laat het stuk niet los.', { size: 2.3 }));
  return { titel: ['Pneumatiek', 'vacuüm, afblazen, stopper (ISO 1219-1)'], inhoud: i };
}

// ---------------------------------------------------------------- bladen 12 en 13: opstelling (schaal)
function opstelling() {
  const i = [], s = 0.118, ox = 34, oy = 30; // 1:8,5 ongeveer -> schaal 1:8,5 op A3; we vermelden 1:8,5
  const P = KAST.plaat;
  const X = (x) => ox + x * s, Y = (y) => oy + y * s;
  i.push(rect(X(0), Y(0), P.b * s, P.h * s, { w2: 0.5 }), T(X(P.b / 2), oy - 3, `Montageplaat ${P.b} x ${P.h} (Rittal VX25 8206.000), schaal 1:8,5`, { size: 2.6, anchor: 'middle', bold: true }));
  GOTEN.forEach((g) => i.push(`<rect x="${X(g.x)}" y="${Y(g.y)}" width="${g.b * s}" height="${g.h * s}" fill="#e6e6e6" stroke="#000" stroke-width="0.2"/>`));
  RAILS.forEach((r) => i.push(`<rect x="${X(r.x)}" y="${Y(r.y)}" width="${r.b * s}" height="${35 * s}" fill="none" stroke="#000" stroke-width="0.15" stroke-dasharray="1 0.6"/>`));
  TOESTELLEN.forEach((t) => {
    i.push(`<rect x="${X(t.x)}" y="${Y(t.y)}" width="${t.b * s}" height="${t.h * s}" fill="#fff" stroke="#000" stroke-width="0.3"/>`);
    const smal = t.b * s < 6;
    i.push(T(X(t.x + t.b / 2) + (smal ? 0.8 : 0), Y(t.y + t.h / 2) + (smal ? 0 : 0.8), t.code, { size: smal ? 1.6 : 2.1, anchor: 'middle', hoek: smal ? -90 : 0 }));
  });
  // maten: plaat, rijen
  const maat = (x1, y1, x2, y2, tekst, verticaal = false) => [L([[x1, y1], [x2, y2]], { w: 0.18 }), `<path d="M ${x1} ${y1} l ${verticaal ? -0.8 : 1.6} ${verticaal ? 1.6 : -0.8} l ${verticaal ? 1.6 : 0} ${verticaal ? 0 : 1.6} z" fill="#000"/>`, `<path d="M ${x2} ${y2} l ${verticaal ? -0.8 : -1.6} ${verticaal ? -1.6 : -0.8} l ${verticaal ? 1.6 : 0} ${verticaal ? 0 : 1.6} z" fill="#000"/>`,
    T((x1 + x2) / 2 + (verticaal ? -1.2 : 0), (y1 + y2) / 2 - 1, tekst, { size: 2.1, anchor: 'middle', hoek: verticaal ? -90 : 0 })].join('');
  i.push(maat(X(0), Y(P.h) + 6, X(P.b), Y(P.h) + 6, String(P.b)), maat(X(0) - 6, Y(0), X(0) - 6, Y(P.h), String(P.h), true));
  [[140, 'rij 1: voeding 400 V'], [470, 'rij 2: servoversterkers'], [980, 'rij 3: 24 V, veiligheid, I/O, PC'], [1320, 'rij 4: relais, remvoeding'], [1630, 'rij 5: klemmen, PE']].forEach(([y, t]) => i.push(T(X(P.b) + 3, Y(y) + 2, t, { size: 2.1 })));
  // legende rechts
  const rijen = TOESTELLEN.map((t) => [t.code, t.naam.length > 58 ? t.naam.slice(0, 58) + '…' : t.naam, t.type.length > 44 ? t.type.slice(0, 44) + '…' : t.type, `${t.b} x ${t.h} x ${t.d}${t.indicatief ? ' *' : ''}`]);
  i.push(tabel(205, 22, [['Aand.', 14], ['Benaming', 86], ['Type', 66], ['B x H x D', 28]], rijen.slice(0, 33), { h: 6.15, kop: 6, size: 1.85 }));
  i.push(T(205, 252, '* maat indicatief: nameten bij levering (10 mm marge op de plaat). Goten 60 x 80 grijs, DIN-rails 35 x 7,5. Reserve op de plaat: ±25 %.', { size: 2.1 }));
  return { titel: ['Opstelling montageplaat', 'schaal 1:8,5, met legende'], inhoud: i, soort: ['&ELU', 'Opstellingsplan'] };
}
function opstellingDeur() {
  const i = [], s = 0.105, ox = 30, oy = 34, H = KAST.h, Bb = KAST.b;
  const X = (x) => ox + x * s, Y = (y) => oy + y * s;
  i.push(T(X(Bb / 2), oy - 6, 'Vooraanzicht deuren (schaal 1:9,5)', { size: 2.8, anchor: 'middle', bold: true }));
  i.push(rect(X(0), Y(0), 600 * s, H * s, { w2: 0.5 }), rect(X(600), Y(0), 600 * s, H * s, { w2: 0.5 }), rect(X(0), Y(H), Bb * s, 100 * s, { w2: 0.35, vul: '#ddd' }));
  for (const e of DEUR) {
    const x0 = e.deur === 'links' ? e.x : 600 + e.x;
    if (e.rond) i.push(`<circle cx="${X(x0)}" cy="${Y(e.y)}" r="${(e.b / 2) * s}" fill="none" stroke="#000" stroke-width="0.35"/>`);
    else i.push(rect(X(x0 - e.b / 2), Y(e.y - e.h / 2), e.b * s, e.h * s, { w2: 0.35 }));
    i.push(T(X(x0), Y(e.y + (e.rond ? e.b / 2 + 40 : e.h / 2 + 30)), e.code, { size: 2.2, anchor: 'middle' }));
  }
  const maat = (x1, y1, x2, y2, tekst, v = false) => [L([[x1, y1], [x2, y2]], { w: 0.18 }), T((x1 + x2) / 2 + (v ? -1.2 : 0), (y1 + y2) / 2 - 1, tekst, { size: 2.0, anchor: 'middle', hoek: v ? -90 : 0 })].join('');
  i.push(maat(X(0), Y(H + 100) + 5, X(Bb), Y(H + 100) + 5, '1200'), maat(X(0) - 5, Y(0), X(0) - 5, Y(H), '2000', true), maat(X(0) - 9, Y(H), X(0) - 9, Y(H + 100), '100', true));
  i.push(maat(X(Bb) + 5, Y(650), X(Bb) + 5, Y(H + 100), 'HMI op 1450 boven de vloer', true));
  // zijaanzicht
  const zx = 200, D = KAST.d, sz = 0.105;
  i.push(T(zx + (D * sz) / 2, oy - 6, 'Zijaanzicht (schaal 1:9,5)', { size: 2.8, anchor: 'middle', bold: true }));
  i.push(rect(zx, oy, D * sz, H * sz, { w2: 0.5 }), rect(zx + 32 * sz, oy + 52 * sz, 3 * sz, 1896 * sz, { w2: 0.3, vul: '#ccc' }));
  i.push(T(zx + 4, oy + H * sz / 2, 'montageplaat 32 mm voor de achterwand; diepste toestel 220 (servo) + klemmen 15', { size: 1.9, hoek: -90 }));
  i.push(maat(zx, Y(H + 100) + 5, zx + D * sz, Y(H + 100) + 5, '600'));
  // legende deur
  i.push(tabel(280, 26, [['Aand.', 14], ['Benaming', 64], ['Type', 46]], DEUR.map((e) => [e.code, e.naam.length > 42 ? e.naam.slice(0, 42) + '…' : e.naam, e.type.length > 32 ? e.type.slice(0, 32) + '…' : e.type]), { h: 6.4, size: 1.9 }));
  const w = WARMTE;
  i.push(tabel(280, 100, [['Warmte in de kast', 70], ['W', 20]], [['servoversterkers (4 % van 14,1 kW)', w.servo.toFixed(0)], ['voeding 24 V', String(w.voeding)], ['IPC', String(w.pc)], ['I/O', String(w.io)], ['netfilter', String(w.filter)], ['rest', String(w.rest)], ['totaal', warmteTotaal().toFixed(0)]], { h: 6, size: 2.0 }));
  i.push(T(280, 160, `Luchtdebiet nodig bij ΔT 10 K: ${Math.round((3.1 * warmteTotaal()) / 10)} m³/h; gekozen filterventilator -E1 500 m³/h + uitblaasfilter -E2.`, { size: 2.0 }));
  i.push(T(280, 165, 'Kast IP54 met filters; omgevingstemperatuur hoogstens 35 °C (anders koelaggregaat Rittal Blue e+).', { size: 2.0 }));
  return { titel: ['Opstelling deuren en zijaanzicht', 'HMI, bediening, ventilatie'], inhoud: i, soort: ['&ELU', 'Opstellingsplan'] };
}

// ---------------------------------------------------------------- klemmenplannen en stuklijst
const KLEMMEN = {
  '-X1': { oms: 'voeding 400 V', rijen: [['1', 'L1 net', '-W1', 'net', 'L1', '-Q1', '1'], ['2', 'L2 net', '-W1', 'net', 'L2', '-Q1', '3'], ['3', 'L3 net', '-W1', 'net', 'L3', '-Q1', '5'], ['4', 'N net', '-W1', 'net', 'N', '-F2/-F3/-F4', 'N'], ['PE', 'PE net', '-W1', 'net', 'PE', '-PE', '']] },
  '-X2': { oms: '24 V verdeling', rijen: [1, 2, 3, 4, 5, 6].map((k) => [String(k), `L+${k}`, '', '', '', `-F2${k}`, '2']) },
  '-X3': { oms: 'veiligheid (veld)', rijen: [['1', 'Noodstop -S1 kanaal 1', '-W40', '-S1', '11', '-K2', 'I0'], ['2', 'Noodstop -S1 kanaal 2', '-W40', '-S1', '21', '-K2', 'I1'], ['3', 'Noodstop -S2 kanaal 1', '', '-S2', '11', '-K2', 'I2'], ['4', 'Noodstop -S2 kanaal 2', '', '-S2', '21', '-K2', 'I3'],
    ['5', 'Deur -B10 kanaal 1', '-W41', '-B10', '1', '-K2', 'I4'], ['6', 'Deur -B10 kanaal 2', '-W41', '-B10', '3', '-K2', 'I5'], ['7', 'Lichtscherm -B11 OSSD1', '-W42', '-B11', '4', '-K2', 'I6'], ['8', 'Lichtscherm -B11 OSSD2', '-W42', '-B11', '5', '-K2', 'I7'],
    ['9', 'Lichtscherm -B12 OSSD1', '-W43', '-B12', '4', '-K2', 'I8'], ['10', 'Lichtscherm -B12 OSSD2', '-W43', '-B12', '5', '-K2', 'I9'], ['11', 'Muting -B13..-B16', '-W44', '-B13', '4', '-K2', 'I10'], ['12', 'Reset -S3', '', '-S3', '13', '-K2', 'I11'],
    ['13', 'Testpuls T0', '', '', '', '-K2', 'T0'], ['14', 'Testpuls T1', '', '', '', '-K2', 'T1'], ['15', 'Muting-lamp -P2', '-W44', '-P2', 'X1', '-K2', 'O4']] },
  '-X4': { oms: 'I/O (sensoren, ventielen, toren)', rijen: [...DI.map(([c, t], k) => [String(k + 17), t, c.startsWith('-S') ? '' : '-W5' + String(k).padStart(1, '0'), c, '4', '-K3', `I${k + 1}`]), ...DO.map(([c, t], k) => [String(k + 33), t, c ? '-W6' + k : '', c, 'A1', '-K3', `O${k + 1}`])] },
};
function klemRijen(strook, v) {
  return v.rijen.map(([klem, functie, kabel, extern, externAansl, intern, internAansl]) => ({ klem, functie, kabel, extern, externAansl, intern, internAansl, verwijzing: strook === '-X3' ? ref(B.veilig, 60) : strook === '-X4' ? ref(Number(klem) > 32 ? B.uit : B.in, 40) : strook === '-X1' ? ref(B.net, 70) : ref(B.v24, 150) }));
}
export const STUKLIJST = [
  ...TOESTELLEN.map((t) => [t.code, '1', t.naam, t.type]),
  ...DEUR.map((e) => [e.code, '1', e.naam, e.type]),
  ['-M1..-M6', '6', 'Servomotoren 400 V met rem en multiturn-encoder', 'Inovance MS1H3 (2 x 2,9, 1 x 4,4, 3 x 1,3 kW)'],
  ['-B10', '1', 'Deurvergrendeling met sleutel (toegangsdeur hek)', 'Schmersal AZM201B-ST-T-AS-P'],
  ['-B11, -B12', '2', 'Lichtscherm type 4, 1500 mm, 30 mm resolutie (zender + ontvanger)', 'Sick deTec4 Core C4C-SA/EA15030A10000'],
  ['-B13..-B16', '4', 'Muting-sensoren (reflectie)', 'ifm O5P500'],
  ['-B21..-B24', '4', 'Vacuüm- en drukschakelaars', 'SMC ZSE20A-V-01-J / ISE20A'],
  ['-B30', '1', 'Camera 5 MP GigE + lens 6 mm', 'Basler ace 2 a2A2448-23gmBAS'],
  ['-B31', '1', 'Laserafstandsmeter (dikte)', 'Baumer OM70 of ifm O1D (na te kiezen)'],
  ['-B32', '1', 'Fotocel ingang', 'ifm O5P500'],
  ['-Q21..-Q24', '4', 'Ventielen zones en afblazen (in FA-Mc / ventieleiland grijper)', 'Schmalz FA-Mc + SMC SY3000'],
  ['-Q25', '1', 'Ventiel stopper', 'Festo VUVG-L14-M52 (24 V)'],
  ['-Q29, -Q30', '2', 'Filter-regelaar en veilig ontluchten met zachte start', 'Festo MS6-LFR + MS6-SV-E'],
  ['-K21..-K23', '5', 'Meertraps-ejectors', 'Schmalz SBPL 100 HV'],
  ['-S1', '1', 'Noodstop bedienpaneel (2 NC)', 'Schneider XB5AS8445'],
  ['-P20', '1', 'Signaaltoren rood/oranje/groen + zoemer', 'Werma KombiSIGN 72'],
];
function stuk(vanaf, tot) { return stuklijst(STUKLIJST.slice(vanaf, tot)); }

// ---------------------------------------------------------------- het project
const s = (k) => ({ soort: SOORT[k][0], soortNaam: SOORT[k][1] });
const bladen = [
  { titel: ['Titelblad'], ...s('titel'), inhoud: [] },
  { titel: ['Inhoudsopgave'], ...s('inhoud'), inhoud: [] },
  { ...net(), ...s('schema') },
  { ...servoBlad(0, B.servo1), ...s('schema') },
  { ...servoBlad(3, B.servo2), ...s('schema') },
  { ...v24(), ...s('schema') },
  { ...veilig(), ...s('schema') },
  { ...net2(), ...s('schema') },
  { ...ioBlad(true), ...s('schema') },
  { ...ioBlad(false), ...s('schema') },
  { ...pneu(), ...s('schema') },
  (() => { const o = opstelling(); return { titel: o.titel, inhoud: o.inhoud, soort: o.soort[0], soortNaam: o.soort[1] }; })(),
  (() => { const o = opstellingDeur(); return { titel: o.titel, inhoud: o.inhoud, soort: o.soort[0], soortNaam: o.soort[1] }; })(),
  ...Object.entries(KLEMMEN).map(([strook, v]) => ({ titel: ['Klemmenplan', `${strook} ${v.oms}`], ...s('klemmen'), inhoud: klemmenplan(strook, v.oms, klemRijen(strook, v).slice(0, 34)) })),
  { titel: ['Stuklijst', 'blad 1'], ...s('stuk'), inhoud: stuk(0, 30) },
  { titel: ['Stuklijst', 'blad 2'], ...s('stuk'), inhoud: stuk(30, 60) },
];
bladen[0].inhoud = titelblad(PROJECT,
  [['Project', PROJECT.naam], ['Omschrijving', PROJECT.omschrijving], ['Eigenaar', PROJECT.eigenaar], ['Tekeningnr.', PROJECT.tekeningnr], ['Revisie', `${PROJECT.revisie.index} (${PROJECT.revisie.datum})`]],
  [['Installatie', `${PROJECT.installatie} robotcel`], ['Plaats', '+KAST schakelkast, +CEL cel'], ['Voeding', '3 x 400 V / N / PE, 50 Hz, 32 A'], ['Besturing', '24 V DC'], ['Schakelkast', `${KAST.type}, ${KAST.b} x ${KAST.h} x ${KAST.d}`]],
  { normen: [...NORMEN, 'EN 60204-1', 'ISO 1219-1', 'EN ISO 13849-1'], bladen: bladen.length });
bladen[1].inhoud = inhoudsopgave(PROJECT, bladen.map((b, k) => ({ ...b, nr: k + 1 })));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const svgs = project(PROJECT, bladen);
  await schrijf(HERE, 'Schemaset robotcel', svgs);
  console.log(`geschreven: ${svgs.length} bladen`);
}
