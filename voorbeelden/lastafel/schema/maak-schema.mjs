// Schemaset van de schaarheftafel zoals EPLAN Electric P8 hem afdrukt, volgens IEC/EN 61082-1, 60617, 81346-1/-2,
// 61355, ISO 7200 en ISO 5457 (voorbeelden/lib/eplan.mjs); hydrauliek volgens ISO 1219-1/-2. =LFT is de installatie,
// +KAST de bedienkast op het onderframe, +LFT de lift zelf. Aanduidingen volgens ISO/IEC 81346-2: -Q schakelen
// (hoofdschakelaar, magneetschakelaar, ventielen), -F beveiligen, -T omvormen (voeding), -K noodstoprelais, -M motor,
// -B sensoren (eindschakelaars), -S bediening (noodstop, pedaal, reset), -P tonen, -C condensator, -X klemmen en
// stekkers; hydrauliek: -GP pomp, -MM cilinders, -QM ventielen, -RM/-RN terugslag- en smoorkleppen, -CM tank,
// -HQ filter, -PG manometer.
// Gebruik: node voorbeelden/lastafel/schema/maak-schema.mjs  (schrijft blad-N.svg en schema.html)
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  X0, X1, T, L, punt, rect, toestel, rail, onderbreking, ref, klem, motor,
  titelblad, inhoudsopgave, klemmenplan, stuklijst, project, schrijf, SOORT, NORMEN,
} from '../../lib/eplan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PROJECT = {
  naam: 'Heftafel lastafel', omschrijving: 'schaarheftafel 4 t met lastafel 2400 x 1200 Ø28', eigenaar: 'Ian', tekeningnr: 'LFT-E01',
  installatie: '=LFT', installatieNaam: 'heftafel', plaats: '+KAST', plaatsNaam: 'bedienkast onderframe',
  datum: '2026-11-09', getekend: 'Phlippo CAD', gecontroleerd: 'Ian', norm: 'IEC 81346', revisie: { index: '1', datum: '2026-11-09', naam: 'PC' },
};
const B = { net: 3, stuur: 4, hydr: 5, klem: 6 };
const R = X1 - 4;
const STREEP = '3 1.5';

// ---------------------------------------------------------------- symbolen (IEC 60617), verticaal van y tot y + 16
function contact(x, y, { nc = false, kop = '' } = {}) {
  const r = [L([[x, y], [x, y + 5]]), L([[x, y + 11], [x, y + 16]])];
  r.push(nc ? L([[x, y + 11], [x + 4, y + 4.2]], { w: 0.35 }) : L([[x, y + 11], [x - 4, y + 4.8]], { w: 0.35 }));
  if (nc) r.push(L([[x, y + 5], [x + 4.6, y + 5]], { w: 0.35 }));
  if (kop === 'x') r.push(L([[x - 1.1, y + 3.9], [x + 1.1, y + 6.1]], { w: 0.35 }), L([[x - 1.1, y + 6.1], [x + 1.1, y + 3.9]], { w: 0.35 }));
  if (kop === '-') r.push(L([[x - 1.4, y + 5], [x + 1.4, y + 5]], { w: 0.35 }));
  if (kop === 'o') r.push(`<path d="M ${x - 1.3} ${y + 5} a 1.3 1.3 0 0 0 2.6 0" fill="none" stroke="#000" stroke-width="0.35"/>`);
  return r.join('');
}
function polen(x, y, n, code, regels, opts) {
  const r = [];
  for (let k = 0; k < n; k++) r.push(contact(x + k * 10, y, opts));
  r.push(L([[x - 2.6, y + 8], [x + (n - 1) * 10 - 1, y + 8]], { w: 0.25, streep: STREEP }));
  r.push(T(x - 6, y + 6.5, code, { size: 2.8, anchor: 'end' }), ...regels.map((t, i) => T(x - 6, y + 9.7 + i * 3, t, { size: 2.2, anchor: 'end' })));
  return r.join('');
}
function spoel(x, y, code, regels = [], { ventiel = false } = {}) {
  const r = [L([[x, y], [x, y + 5]]), rect(x - 5, y + 5, 10, 6, { w2: 0.35 }), L([[x, y + 11], [x, y + 16]])];
  if (ventiel) r.push(L([[x - 5, y + 11], [x + 5, y + 5]], { w: 0.35 }));
  r.push(T(x + 1, y + 4.2, 'A1', { size: 1.8 }), T(x + 1, y + 14.6, 'A2', { size: 1.8 }), T(x + 7, y + 8, code, { size: 2.8 }), ...regels.map((t, i) => T(x + 7, y + 11 + i * 2.9, t, { size: 2.1 })));
  return r.join('');
}
function lamp(x, y, code, kleur) {
  return [L([[x, y], [x, y + 4]]), `<circle cx="${x}" cy="${y + 8}" r="4" fill="none" stroke="#000" stroke-width="0.35"/>`, L([[x - 2.8, y + 5.2], [x + 2.8, y + 10.8]], { w: 0.35 }), L([[x - 2.8, y + 10.8], [x + 2.8, y + 5.2]], { w: 0.35 }), L([[x, y + 12], [x, y + 16]]), T(x + 6, y + 7, code, { size: 2.8 }), T(x + 6, y + 10, kleur, { size: 2.1 })].join('');
}
function knop(x, y, code, regels, { nc = false, kop = 'druk' } = {}) {
  const bed = kop === 'paddestoel' ? `<path d="M ${x - 10} ${y + 5} a 3 3 0 0 0 0 6 z" fill="none" stroke="#000" stroke-width="0.35"/>`
    : kop === 'voet' ? L([[x - 11, y + 10], [x - 8, y + 6], [x - 8, y + 10]], { w: 0.35 })
      : kop === 'rol' ? `<circle cx="${x - 9.5}" cy="${y + 8}" r="1.5" fill="none" stroke="#000" stroke-width="0.35"/>`
        : L([[x - 9, y + 6], [x - 9, y + 10], [x - 8, y + 10], [x - 8, y + 6], [x - 9, y + 6]], { w: 0.35 });
  return [contact(x, y, { nc }), L([[x - 2.4, y + 8], [x - 8, y + 8]], { w: 0.25, streep: STREEP }), bed, T(x + 6, y + 7, code, { size: 2.8 }), ...regels.map((t, i) => T(x + 6, y + 10 + i * 2.9, t, { size: 2.1 }))].join('');
}
const draad = (pts) => L(pts);

// ---------------------------------------------------------------- blad 3: voeding 230 V en motor
function net() {
  const i = [];
  i.push(T(X0 + 4, 30, 'Aansluiting: CEE-stekker 230 V 16 A (3-polig, blauw) op een groep C16 of D16 met aardlekschakelaar 30 mA in de werkplaats. Hydraulisch aggregaat 2,2 kW (docs/Berekeningen.md).', { size: 2.3 }));
  // stekker en hoofdschakelaar
  i.push(toestel(36, 40, 30, 14, '-X0', ['', 'CEE 230 V 16 A'], [{ x: 6, y: 14, naam: 'L' }, { x: 16, y: 14, naam: 'N' }, { x: 26, y: 14, naam: 'PE' }]));
  i.push(draad([[42, 54], [42, 66]]), draad([[52, 54], [52, 66]]), draad([[62, 54], [62, 240]]));
  i.push(polen(42, 66, 2, '-Q1', ['hoofdschakelaar', '25 A, afsluitbaar', 'rood/geel'], { kop: '-' }));
  i.push(draad([[42, 82], [42, 96], [330, 96]]), draad([[52, 82], [52, 104], [330, 104]]), T(332, 97, 'L', { size: 2.4 }), T(332, 105, 'N', { size: 2.4 }));
  i.push(rail(240, 62, R, 'PE', {}));
  // motortak
  i.push(punt(90, 96), punt(100, 104), draad([[90, 96], [90, 116]]), draad([[100, 104], [100, 116]]));
  i.push(polen(90, 116, 2, '-F1', ['motorbeveiliging', '3RV2021-4BA10', '13-20 A, ingesteld 14 A'], { kop: 'x' }));
  i.push(draad([[90, 132], [90, 146]]), draad([[100, 132], [100, 146]]));
  i.push(polen(90, 146, 2, '-Q2', ['magneetschakelaar motor', '3RT2025-1BB40 (24 V DC)', `spoel ${ref(B.stuur, 255)}`], { kop: 'o' }));
  i.push(draad([[90, 162], [90, 196]]), draad([[100, 162], [100, 186], [116, 186]]));
  i.push(klem(90, 196, '-X1', '1'), klem(100, 196, '-X1', '2'));
  i.push(draad([[90, 197.2], [90, 214]]), draad([[100, 197.2], [100, 206]]));
  i.push(motor(95, 222, '-M1', ['hydraulisch aggregaat', '2,2 kW 230 V 1~, 2800 /min', 'met bedrijfscondensator -C1 50 µF']), draad([[90, 214], [92, 216]]), draad([[100, 206], [98, 216]]));
  i.push(draad([[95, 230], [95, 240]]), punt(95, 240));
  i.push(T(122, 186, 'warmtecontact motor (PTO 150 °C) naar', { size: 2.1 }), T(122, 189.5, `de veiligheidsketen ${ref(B.stuur, 60)}`, { size: 2.1 }));
  // voeding 24 V
  i.push(punt(220, 96), punt(230, 104), draad([[220, 96], [220, 116]]), draad([[230, 104], [230, 116]]));
  i.push(polen(220, 116, 2, '-F2', ['installatieautomaat', '5SY6202-7 C2'], { kop: 'x' }));
  i.push(draad([[220, 132], [220, 150]]), draad([[230, 132], [230, 150]]));
  i.push(toestel(210, 150, 40, 30, '-T1', ['', 'Voeding 24 V DC 2,5 A', 'Mean Well HDR-60-24'], [{ x: 10, y: 0, naam: 'L' }, { x: 20, y: 0, naam: 'N' }, { x: 10, y: 30, naam: '+V' }, { x: 30, y: 30, naam: '-V' }]));
  i.push(draad([[220, 180], [220, 200]]), onderbreking(220, 200, 'L+', ref(B.stuur, X0), 'onder'), draad([[240, 180], [240, 214]]), onderbreking(240, 214, 'M', ref(B.stuur, X0), 'onder'));
  // signaallamp spanning
  i.push(punt(300, 96), punt(310, 104), draad([[300, 96], [300, 140]]), lamp(300, 140, '-P1', 'wit, spanning aan (230 V)'), draad([[300, 156], [300, 170], [310, 170], [310, 104]]));
  return { titel: ['Voeding 230 V', 'hoofdschakelaar, motor, voeding 24 V'], inhoud: i };
}

// ---------------------------------------------------------------- blad 4: besturing 24 V
function stuur() {
  const i = [];
  i.push(rail(40, X0 + 2, R, 'L+', { van: ref(B.net, 220) }), rail(238, X0 + 2, R, 'M', { van: ref(B.net, 240) }));
  i.push(T(X0 + 4, 30, 'Besturing zonder PLC, zoals een heftafel volgens EN 1570-1: omhoog en omlaag alleen zolang het pedaal is ingedrukt (dodemansbediening); de noodstop schakelt via -K1 (PL c) de motor en het zakventiel af.', { size: 2.3 }));
  // noodstopketen naar -K1
  i.push(punt(50, 40), draad([[50, 40], [50, 56]]), klem(50, 56, '-X1', '11'), draad([[50, 57.2], [50, 66]]));
  i.push(knop(50, 66, '-S1', ['noodstop op voetpedaal', '2 NC'], { nc: true, kop: 'paddestoel' }));
  i.push(draad([[50, 82], [50, 90]]), klem(50, 90, '-X1', '12'), draad([[50, 91.2], [50, 100]]));
  i.push(knop(50, 100, '-S5', ['warmtecontact motor', `-M1 ${ref(B.net, 95)}`], { nc: true, kop: 'druk' }), draad([[50, 116], [50, 124], [80, 124]]));
  i.push(toestel(80, 116, 60, 42, '-K1', ['', '', 'Noodstoprelais PL c', 'Pilz PNOZ s3 750103', 'automatische start uit,', 'reset met -S4'], [{ x: 0, y: 8, naam: 'S11/S12' }, { x: 0, y: 34, naam: 'S33/S34' }, { x: 60, y: 8, naam: '13/14' }, { x: 60, y: 34, naam: '23/24' }]));
  i.push(punt(66, 40), draad([[66, 40], [66, 166]]), knop(66, 166, '-S4', ['reset (blauw)', 'op de kast']), draad([[66, 182], [66, 188], [74, 188], [74, 150], [80, 150]]));
  i.push(draad([[140, 124], [150, 124], [150, 40]]), punt(150, 40), draad([[140, 150], [170, 150]]), T(142, 154, 'K1 vrij (13/14 en 23/24)', { size: 2.0 }));
  // op: pedaal op, eindschakelaar boven, magneetschakelaar motor
  i.push(draad([[170, 150], [190, 150], [190, 160]]));
  i.push(punt(190, 150), draad([[190, 150], [255, 150], [255, 160]]));
  i.push(knop(190, 160, '-S2', ['pedaal OP'], { kop: 'voet' }), draad([[190, 176], [190, 186]]), klem(190, 186, '-X1', '13'), draad([[190, 187.2], [190, 196]]));
  i.push(knop(190, 196, '-B1', ['eindschakelaar boven', 'Schmersal PS116'], { nc: true, kop: 'rol' }), draad([[190, 212], [190, 222]]), spoel(190, 222, '-Q2', [ref(B.net, 90)]));
  i.push(draad([[190, 238], [190, 238]]), punt(190, 238));
  // neer: pedaal neer, ventiel en ontgrendeling
  i.push(knop(255, 160, '-S3', ['pedaal NEER'], { kop: 'voet' }), draad([[255, 176], [255, 186]]), klem(255, 186, '-X1', '14'), draad([[255, 187.2], [255, 200], [345, 200]]));
  i.push(punt(270, 200), draad([[270, 200], [270, 214]]), spoel(270, 214, '-QM1', ['zakventiel 2/2', `${ref(B.hydr, 230)}`], { ventiel: true }), draad([[270, 230], [270, 238]]), punt(270, 238));
  i.push(punt(310, 200), draad([[310, 200], [310, 214]]), spoel(310, 214, '-Q12', ['ontgrendeling', 'valbeveiliging 1'], { ventiel: true }), draad([[310, 230], [310, 238]]), punt(310, 238));
  i.push(draad([[345, 200], [345, 214]]), spoel(345, 214, '-Q13', ['ontgrendeling', 'valbeveiliging 2'], { ventiel: true }), draad([[345, 230], [345, 238]]), punt(345, 238));
  i.push(T(250, 250, 'Neer: eerst trekken -Q12/-Q13 de pallen weg (0,3 s), dan opent -QM1. Pedaal los = ventiel dicht en pallen vallen in de tanden.', { size: 2.1 }));
  i.push(T(250, 254, 'Bij een slangbreuk sluiten de leidingbreukventielen -RM2/-RM3 in de cilinders.', { size: 2.1 }));
  return { titel: ['Besturing 24 V DC', 'noodstop, pedaal op en neer, ventielen'], inhoud: i };
}

// ---------------------------------------------------------------- blad 5: hydrauliek (ISO 1219-1)
function hydr() {
  const i = [];
  const lijn = (pts) => L(pts, { w: 0.35 });
  const tank = (x, y, code, tekst) => [L([[x - 8, y - 5], [x - 8, y], [x + 8, y], [x + 8, y - 5]], { w: 0.35 }), T(x + 11, y - 1, code, { size: 2.6 }), T(x + 11, y + 2.2, tekst, { size: 2 })].join('');
  const pomp = (x, y) => [`<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="#000" stroke-width="0.35"/>`, `<path d="M ${x} ${y - 6} L ${x - 2.4} ${y - 2} L ${x + 2.4} ${y - 2} Z" fill="#000"/>`, T(x - 9, y + 1, '-GP1', { size: 2.6, anchor: 'end' }), T(x - 9, y + 4.2, '2,5 cm³, 7 l/min', { size: 2, anchor: 'end' })].join('');
  const mot = (x, y) => [`<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#000" stroke-width="0.35"/>`, T(x, y + 1.2, 'M', { size: 3.4, anchor: 'middle' }), T(x + 8, y + 1, `-M1 ${ref(B.net, 95)}`, { size: 2.4 })].join('');
  const terug = (x, y, code, tekst) => [`<circle cx="${x}" cy="${y + 1.5}" r="1.8" fill="none" stroke="#000" stroke-width="0.35"/>`, L([[x - 2.6, y - 1.5], [x, y + 1.5 - 1.8], [x + 2.6, y - 1.5]], { w: 0.35 }), T(x + 5, y + 1, code, { size: 2.6 }), T(x + 5, y + 4, tekst, { size: 2 })].join('');
  const overdruk = (x, y, code, tekst) => [rect(x - 5, y - 6, 10, 12), L([[x, y + 4], [x, y - 4]], { w: 0.3 }), `<path d="M ${x} ${y - 4} l -1.2 2.5 l 2.4 0 z" fill="#000"/>`, L([[x + 5, y], [x + 8, y - 2], [x + 8, y + 2], [x + 11, y]], { w: 0.3 }), T(x + 13, y - 1, code, { size: 2.6 }), T(x + 13, y + 2.4, tekst, { size: 2 })].join('');
  const ventiel22 = (x, y) => [rect(x - 6, y, 12, 10), rect(x - 6, y + 10, 12, 10), L([[x, y + 1], [x, y + 9]], { w: 0.3 }), `<path d="M ${x} ${y + 1} l -1.2 2.5 l 2.4 0 z" fill="#000"/>`, L([[x - 2, y + 15], [x + 2, y + 15]], { w: 0.3 }), L([[x, y + 13], [x, y + 15]], { w: 0.3 }),
    rect(x + 6, y + 2, 7, 6), L([[x + 6, y + 8], [x + 13, y + 2]], { w: 0.3 }), L([[x - 6, y + 13], [x - 9, y + 15], [x - 6, y + 17]], { w: 0.3 }), T(x - 11, y + 8, '-QM1', { size: 2.6, anchor: 'end' }), T(x - 11, y + 11.2, 'zitklep 2/2, lekvrij, 24 V', { size: 2, anchor: 'end' }), T(x - 11, y + 14.4, `spoel ${ref(B.stuur, 270)}`, { size: 2, anchor: 'end' })].join('');
  const smoor = (x, y, code, tekst) => [rect(x - 5, y - 6, 10, 12), `<path d="M ${x - 2} ${y - 6} q 2 6 0 12 M ${x + 2} ${y - 6} q -2 6 0 12" fill="none" stroke="#000" stroke-width="0.3"/>`, L([[x - 4, y + 5], [x + 4, y - 5]], { w: 0.3 }), T(x + 8, y - 1, code, { size: 2.6 }), T(x + 8, y + 2.4, tekst, { size: 2 })].join('');
  const cilinder = (x, y, code, tekst) => [rect(x - 9, y, 18, 40), rect(x - 7, y + 30, 14, 3, { vul: '#000', w2: 0 }), L([[x, y + 30], [x, y - 12]], { w: 0.7 }), T(x + 12, y + 14, code, { size: 2.6 }), T(x + 12, y + 17.4, tekst, { size: 2 })].join('');
  i.push(T(X0 + 4, 30, 'Hydraulisch schema volgens ISO 1219-1/-2. Enkelwerkende cilinders: omhoog met de pomp, omlaag door het eigen gewicht via -QM1 en de drukgecompenseerde smoorklep -RN1.', { size: 2.3 }));
  i.push(T(X0 + 4, 34, 'Overdruk -RN2 op 140 bar (hoogste werkdruk 119 bar bij 4 t in de laagste stand). Olie HLP 32, 12 l. Alle slangen 2SN DN10, 250 bar.', { size: 2.3 }));
  // aggregaat (streep-punt kader)
  i.push(rect(40, 120, 175, 120, { streep: '4 1 0.6 1', w2: 0.25 }), T(42, 125, '-GP1 hydraulisch aggregaat 230 V 2,2 kW (één blok: motor, pomp, tank, ventielblok)', { size: 2.2 }));
  i.push(tank(80, 230, '-CM1', 'tank 12 l'), lijn([[80, 225], [80, 214]]), rect(76, 204, 8, 10), L([[76, 209], [84, 209]], { w: 0.3, streep: '1 1' }), T(87, 210, '-HQ1 zuigfilter', { size: 2 }), lijn([[80, 204], [80, 196]]));
  i.push(pomp(80, 190), mot(110, 190), L([[86, 190], [105, 190]], { w: 0.3, streep: '1.5 1' }));
  i.push(lijn([[80, 184], [80, 170]]), terug(80, 166, '-RM1', 'terugslagklep'), lijn([[80, 164], [80, 140], [190, 140]]));
  i.push(punt(120, 140), lijn([[120, 140], [120, 152]]), overdruk(120, 158, '-RN2', '140 bar'), lijn([[120, 164], [120, 170]]), tank(120, 175, '', ''));
  i.push(punt(150, 140), lijn([[150, 140], [150, 132]]), `<circle cx="150" cy="128" r="4" fill="none" stroke="#000" stroke-width="0.35"/>`, L([[147.5, 130.5], [152.5, 125.5]], { w: 0.3 }), T(156, 129, '-PG1 manometer 0-250 bar', { size: 2 }));
  // zakken
  i.push(punt(175, 140), lijn([[175, 140], [175, 150]]), ventiel22(175, 150), lijn([[175, 170], [175, 180]]), smoor(175, 186, '-RN1', '9 l/min, drukgecompenseerd'), lijn([[175, 192], [175, 205]]), tank(175, 210, '', ''));
  // naar de cilinders
  i.push(lijn([[190, 140], [215, 140]]), T(196, 137, 'P', { size: 2.2 }), lijn([[215, 140], [300, 140]]), punt(270, 140), T(222, 137, 'slang 2SN DN10', { size: 2 }));
  i.push(lijn([[270, 140], [270, 110]]), terug(270, 106, '-RM2', 'leidingbreukventiel'), lijn([[270, 104], [270, 92]]), cilinder(270, 52, '-MM1', 'cilinder 1 Ø100/56 x 360'));
  i.push(lijn([[300, 140], [340, 140], [340, 110]]), terug(340, 106, '-RM3', 'leidingbreukventiel'), lijn([[340, 104], [340, 92]]), cilinder(340, 52, '-MM2', 'cilinder 2 Ø100/56 x 360'));
  i.push(T(250, 160, 'Leidingbreukventielen in het aansluitblok op de cilinder: sluiten bij ± 1,5 x de zakstroom (EN 1570-1).', { size: 2.1 }));
  i.push(T(250, 164, 'Valbeveiliging: mechanische pal per cilinder, ontgrendeld door -Q12/-Q13 ' + ref(B.stuur, 310) + '.', { size: 2.1 }));
  return { titel: ['Hydrauliek', 'aggregaat, zakventiel, cilinders (ISO 1219-1)'], inhoud: i };
}

// ---------------------------------------------------------------- klemmen en stuklijst
const KLEMMEN = [
  { klem: '1', functie: 'Motor L', extern: '-M1', externAansl: 'U1', kabel: '-W1 3G2,5', intern: '-Q2', internAansl: '2', verwijzing: ref(B.net, 90) },
  { klem: '2', functie: 'Motor N', extern: '-M1', externAansl: 'U2', kabel: '-W1 3G2,5', intern: '-Q2', internAansl: '4', verwijzing: ref(B.net, 100) },
  { klem: 'PE', functie: 'Motor PE', extern: '-M1', externAansl: 'PE', kabel: '-W1 3G2,5', intern: 'PE-rail', internAansl: '', verwijzing: ref(B.net, 62) },
  { klem: '11', functie: 'Noodstop kanaal 1', extern: '-S1', externAansl: '11', kabel: '-W2 7G0,75', intern: '-K1', internAansl: 'S11', verwijzing: ref(B.stuur, 50) },
  { klem: '12', functie: 'Noodstop kanaal 1 terug', extern: '-S1', externAansl: '12', kabel: '-W2 7G0,75', intern: '-K1', internAansl: 'S12', verwijzing: ref(B.stuur, 50) },
  { klem: '13', functie: 'Pedaal OP', extern: '-S2', externAansl: '14', kabel: '-W2 7G0,75', intern: '-B1', internAansl: '11', verwijzing: ref(B.stuur, 190) },
  { klem: '14', functie: 'Pedaal NEER', extern: '-S3', externAansl: '14', kabel: '-W2 7G0,75', intern: '-QM1', internAansl: 'A1', verwijzing: ref(B.stuur, 255) },
  { klem: '15', functie: 'L+ naar pedaal', extern: '-S2/-S3', externAansl: '13', kabel: '-W2 7G0,75', intern: '-K1', internAansl: '14', verwijzing: ref(B.stuur, 170) },
  { klem: '16', functie: 'Eindschakelaar boven', extern: '-B1', externAansl: '12', kabel: '-W3 3G0,75', intern: '-Q2', internAansl: 'A1', verwijzing: ref(B.stuur, 190) },
  { klem: '17', functie: 'Zakventiel', extern: '-QM1', externAansl: 'A1', kabel: '-W4 3G1', intern: '-X1', internAansl: '14', verwijzing: ref(B.stuur, 270) },
  { klem: '18', functie: 'Ontgrendeling 1', extern: '-Q12', externAansl: 'A1', kabel: '-W5 3G1', intern: '-X1', internAansl: '14', verwijzing: ref(B.stuur, 310) },
  { klem: '19', functie: 'Ontgrendeling 2', extern: '-Q13', externAansl: 'A1', kabel: '-W6 3G1', intern: '-X1', internAansl: '14', verwijzing: ref(B.stuur, 345) },
  { klem: '20', functie: 'Warmtecontact motor', extern: '-M1', externAansl: 'TB1', kabel: '-W1', intern: '-K1', internAansl: 'S12', verwijzing: ref(B.stuur, 50) },
  { klem: '21..24', functie: 'M (0 V) veld', extern: '-QM1/-Q12/-Q13/-B1', externAansl: 'A2', kabel: '', intern: '-T1', internAansl: '-V', verwijzing: ref(B.stuur, 300) },
];
export const STUKLIJST = [
  ['-X0', '1', 'CEE-stekker 230 V 16 A 3-polig met 5 m kabel H07RN-F 3G2,5', 'Mennekes 13001'],
  ['-Q1', '1', 'Hoofdschakelaar 2-polig 25 A, rood/geel, afsluitbaar', 'Siemens 3LD2003-0TK53'],
  ['-F1', '1', 'Motorbeveiligingsschakelaar 13-20 A', 'Siemens 3RV2021-4BA10'],
  ['-F2', '1', 'Installatieautomaat 2-polig C2', 'Siemens 5SY6202-7'],
  ['-Q2', '1', 'Magneetschakelaar 7,5 kW, spoel 24 V DC', 'Siemens 3RT2025-1BB40'],
  ['-T1', '1', 'Voeding 24 V DC 2,5 A DIN-rail', 'Mean Well HDR-60-24'],
  ['-K1', '1', 'Noodstoprelais 24 V DC, 3 NO', 'Pilz PNOZ s3 750103'],
  ['-P1', '1', 'Signaallamp wit 230 V', 'Siemens 3SU1156-6AA60-1AA0'],
  ['-S4', '1', 'Drukknop blauw (reset)', 'Siemens 3SU1150-0AB50-1BA0'],
  ['-S1/-S2/-S3', '1', 'Dubbele voetschakelaar met beschermkap en noodstop, kabel 5 m', 'Herga 6226 / Steute GFSI 2 VD (gelijkwaardig)'],
  ['-B1', '1', 'Eindschakelaar boven, rolhefboom, 1 NO + 1 NC', 'Schmersal PS116-T11-RMS'],
  ['-M1, -GP1', '1', 'Hydraulisch aggregaat 230 V 2,2 kW, pomp 2,5 cm³, tank 12 l, ventielblok met -QM1, -RN1, -RN2, -RM1, -PG1', 'offerte (bv. Hydro-Leduc / Bucher Mini Power Pack)'],
  ['-MM1, -MM2', '2', 'Hydraulische cilinder enkelwerkend Ø100/56 slag 360, oog-oog 675, met leidingbreukventiel', 'offerte (cilinder op maat)'],
  ['-Q12, -Q13', '2', 'Trekmagneet 24 V DC 50 N (ontgrendeling pal)', 'Kuhnke H 3.2 of gelijkwaardig'],
  ['-W1..-W6', '1', 'Kabels: 3G2,5 motor, 7G0,75 pedaal, 3G1 ventielen (H07RN-F / ÖLFLEX)', 'Lapp'],
  ['-X1', '24', 'Doorgangsklemmen 2,5 mm² + PE-klemmen', 'Phoenix Contact UT 2,5 / UT 2,5-PE'],
  ['+KAST', '1', 'Bedienkast staalplaat 265 x 135 x 85 RAL 7035, IP55, 2 x wartel M20', 'Rittal KX 1528.000 of gelijkwaardig'],
];

// ---------------------------------------------------------------- het project
const s = (k) => ({ soort: SOORT[k][0], soortNaam: SOORT[k][1] });
const bladen = [
  { titel: ['Titelblad'], ...s('titel'), inhoud: [] },
  { titel: ['Inhoudsopgave'], ...s('inhoud'), inhoud: [] },
  { ...net(), ...s('schema') },
  { ...stuur(), ...s('schema') },
  { ...hydr(), ...s('schema') },
  { titel: ['Klemmenplan', '-X1 bedienkast'], ...s('klemmen'), inhoud: klemmenplan('-X1', 'bedienkast op het onderframe', KLEMMEN) },
  { titel: ['Stuklijst'], ...s('stuk'), inhoud: stuklijst(STUKLIJST) },
];
bladen[0].inhoud = titelblad(PROJECT,
  [['Project', PROJECT.naam], ['Omschrijving', PROJECT.omschrijving], ['Eigenaar', PROJECT.eigenaar], ['Tekeningnr.', PROJECT.tekeningnr], ['Revisie', `${PROJECT.revisie.index} (${PROJECT.revisie.datum})`]],
  [['Installatie', `${PROJECT.installatie} heftafel`], ['Plaats', '+KAST bedienkast, +LFT lift'], ['Voeding', '230 V / N / PE, 50 Hz, 16 A'], ['Besturing', '24 V DC, zonder PLC'], ['Hydrauliek', '140 bar, 2 cilinders Ø100']],
  { normen: [...NORMEN, 'EN 60204-1', 'ISO 1219-1', 'EN 1570-1'], bladen: bladen.length });
bladen[1].inhoud = inhoudsopgave(PROJECT, bladen.map((b, k) => ({ ...b, nr: k + 1 })));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const svgs = project(PROJECT, bladen);
  await schrijf(HERE, 'Schemaset heftafel', svgs);
  console.log(`geschreven: ${svgs.length} bladen`);
}
