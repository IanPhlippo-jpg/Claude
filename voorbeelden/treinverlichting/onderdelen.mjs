// Gekochte onderdelen van de kabeldoos als Phlippo CAD-onderdelen: het Modelbouwled-bordje, de ESP32-S3-DevKitC-1, de
// PCA9685, de kant-en-klare modules van versie 4 (opbouw.mjs: MOSFET-modules, optocouplerprints, regelaar, WAGO-klemmen,
// de schroefklemadapter van de ESP), tule, DC-bus en schroeven. Maten met bron: docs/Maten-en-bronnen.md. modulesOp()
// zet alle modules met alles erop op de moduleplaat in de assemblage.
import { vlak } from '../lib/schets.mjs';
import { M } from './maten.mjs';
import { deel, met, blokken, snede, cirkels, yv, PCB_ROOD, PCB_ZWART, PCB_BLAUW, KLEM_GROEN, KLEM_BLAUW, ZWART, METAAL, GOUD, WIT } from './hulp.mjs';
import { bordjeArt, weerstandenArt, espArt, kapArt, pcaArt, pcaChipArt, elcoArt, moduleArt } from './printjes.mjs';
import { MODULES, PLAATSING, naarDoos, moduleY, pcaX } from './opbouw.mjs';

// ---------------------------------------------------------------- het Modelbouwled-bordje (oorsprong: midden, onderkant print)
export function bordjePcb() {
  const B = M.bordje, o = deel('Modelbouwled PCB met weerstand (print)', PCB_ROOD);
  blokken(o, [[-B.x / 2, 0, -B.z / 2, B.x / 2, B.pcb, B.z / 2, 0.8]], 'Print');
  // 4 gaten in de hoeken (Ø2,2) zoals op de foto
  cirkels(o, B.pcb, B.pcb + 1, [[-B.x / 2 + 2.6, -B.z / 2 + 2.6, 1.1], [B.x / 2 - 2.6, -B.z / 2 + 2.6, 1.1], [-B.x / 2 + 2.6, B.z / 2 - 2.6, 1.1], [B.x / 2 - 2.6, B.z / 2 - 2.6, 1.1]], 'Gaten', 'cut');
  return met(o.doc(), bordjeArt(B));
}
/** een klemmenstrook (oorsprong: midden onderaan, draadingang naar -Z): n posities op steek p, diepte d, hoogte h */
export function klemstrook(naam, n, p, d, h, mat = KLEM_GROEN) {
  const o = deel(naam, mat), L = n * p;
  blokken(o, [[-L / 2, 0, -d / 2, L / 2, h, d / 2]], 'Huis');
  // per positie: schroefgat van boven en draadingang van voren
  const sr = Math.min(1.0, p * 0.36);
  cirkels(o, h, h * 0.45, Array.from({ length: n }, (_, i) => [-L / 2 + p * (i + 0.5), d * 0.12, sr]), 'Schroefgaten', 'cut');
  o.schets(vlak('ingang', 'Plane draadingang', [0, 0, -d / 2], [0, 0, -1], 'reference'), (s) => {
    for (let i = 0; i < n; i++) { const x = -L / 2 + p * (i + 0.5); s.rrectW([x - p * 0.3, h * 0.18, -d / 2], [x + p * 0.3, h * 0.5, -d / 2]); }
  });
  o.extrude('cut', d * 0.55, { omkeren: true, naam: 'Draadingangen' });
  // groefjes tussen de posities (bovenkant)
  if (n > 1) snede(o, h, 0.6, Array.from({ length: n - 1 }, (_, i) => [-L / 2 + p * (i + 1) - 0.15, -d / 2 + 0.6, -L / 2 + p * (i + 1) + 0.15, d / 2 - 0.6]), 'Groeven');
  return o.doc();
}
/** 16 SMD-weerstanden 0805 (zwart) op een rij, de waarde in het midden van het bordje */
export function smdRij(naam, n, steek, l = 2.0, b = 1.25, h = 0.5) {
  const o = deel(naam, ZWART), L = n * steek;
  blokken(o, Array.from({ length: n }, (_, i) => { const x = -L / 2 + steek * (i + 0.5); return [x - b / 2, 0, -l / 2, x + b / 2, h, l / 2]; }), 'Weerstanden');
  return met(o.doc(), weerstandenArt(n, steek, l, b, h));
}

// ---------------------------------------------------------------- ESP32-S3-DevKitC-1 v1.1 (oorsprong: midden van de print, onderkant print)
// lengte langs X: -X = antennekant, +X = USB-kant; z = breedte. Posities uit de maattekening (afgelezen, ± 0,3 mm).
const E = () => { const P = M.esp; return { P, x0: -P.x / 2, z0: -P.z / 2 }; };
/** van tekeningcoördinaten (a = vanaf de antennerand, b = vanaf de linkerrand op de tekening, die het bovenaanzicht is)
 * naar print-x/z: van boven gezien ligt de antenne links (-X) en de linkerrand van de tekening achteraan (-Z wordt +b) */
const ep = (a, b) => { const { x0, z0 } = E(); return [x0 + a, -z0 - b]; };
export function espPrint() {
  const { P, x0, z0 } = E(), o = deel('ESP32-S3-DevKitC-1 (print)', PCB_ZWART);
  blokken(o, [[x0, 0, z0, -x0, P.pcb, -z0, 0.6]], 'Print');
  // 44 doorgemetalliseerde gaten Ø1,0 voor de pinnen
  const gaten = [];
  for (let i = 0; i < P.pin.n; i++) for (const b of [P.pin.rand, P.z - P.pin.rand]) { const [x, z] = ep(P.pin.eerste + i * P.pin.steek, b); gaten.push([x, z, 0.5]); }
  cirkels(o, P.pcb, P.pcb + 1, gaten, 'Pingaten', 'cut');
  return met(o.doc(), espArt(P));
}
export function espModule() {
  const { P } = E(), o = deel('ESP32-S3-WROOM-1 (module-print)', PCB_ZWART), m = P.module;
  const [xa, za] = ep(-m.voorbij, m.van + m.z), xb = xa + m.x, zb = za + m.z;
  blokken(o, [[xa, P.pcb, za, xb, P.pcb + 0.8, zb, 0.3]], 'Modulepcb');
  return o.doc();
}
export function espKap() {
  const { P } = E(), o = deel('ESP32-S3-WROOM-1 (afschermkap)', METAAL), m = P.module;
  const [xa, za] = ep(-m.voorbij, m.van + m.z);
  // de kap bedekt de module behalve de antenne (6,4 + 0,4 mm aan de antennekant)
  blokken(o, [[xa + 7.2, P.pcb + 0.8, za + 0.5, xa + m.x - 0.5, P.pcb + m.h, za + m.z - 0.5, 0.4]], 'Kap');
  // het opschrift (lasergemarkeerd) als decal
  return met(o.doc(), kapArt(P));
}
export function espAntenne() {
  const { P } = E(), o = deel('PCB-antenne (koperbaan)', GOUD), m = P.module;
  const [xa, za] = ep(-m.voorbij, m.van + m.z), y = P.pcb + 0.8;
  // meanderende antennebaan (MINI-ANT-TYPE B, vereenvoudigd): 0,5 breed, 0,05 dik
  const banen = [];
  const zl = za + 1.5, zr = za + m.z - 1.5;
  for (let i = 0; i < 5; i++) {
    const x = xa + 0.8 + i * 1.1;
    banen.push([x, y, zl, x + 0.5, y + 0.1, zr]);
    if (i < 4) banen.push(i % 2 ? [x, y, zl, x + 1.6, y + 0.1, zl + 0.5] : [x, y, zr - 0.5, x + 1.6, y + 0.1, zr]);
  }
  blokken(o, banen, 'Antennebaan');
  return o.doc();
}
/** pinrij: zwarte plastic strip onder de print, vergulde pinnen 0,64 vierkant: 6 mm onder de strip, 1,2 boven de print */
export function pinStrip(naam, n, steek = 2.54) {
  const o = deel(naam, ZWART), L = n * steek;
  blokken(o, [[-L / 2, 0, -1.25, L / 2, 2.5, 1.25]], 'Strip');
  snede(o, 2.5, 3.5, Array.from({ length: n }, (_, i) => { const x = -L / 2 + steek * (i + 0.5); return [x - 0.34, -0.34, x + 0.34, 0.34]; }), 'Gaten pinnen');
  return o.doc();
}
export function pinnen(naam, n, steek = 2.54, onder = 6, boven = 2.5 + 1.6 + 1.2) {
  const o = deel(naam, GOUD), L = n * steek;
  blokken(o, Array.from({ length: n }, (_, i) => { const x = -L / 2 + steek * (i + 0.5); return [x - 0.32, -onder, -0.32, x + 0.32, boven, 0.32]; }), 'Pinnen');
  return o.doc();
}
/** micro-USB B (5-polig), 7,5 breed, 2,5 hoog, 5,6 diep; oorsprong: midden van de opening, onderkant */
export function microUsb() {
  const o = deel('Micro-USB-bus', METAAL);
  blokken(o, [[-5.6, 0, -3.75, 0, 2.5, 3.75, 0.6]], 'Huis');
  snede(o, 2.3, 1.9, [[-4.6, -3.1, 0.2, 3.1, 0.5]], 'Opening');
  return o.doc();
}
/** drukknopje 5,1 x 5,1 x 1,5 met rond knopje Ø2,6 (BOOT, RESET) */
export function drukknop() {
  const o = deel('Drukknop 5,1 x 5,1 (SMD)', METAAL);
  blokken(o, [[-2.55, 0, -2.55, 2.55, 1.5, 2.55, 0.2]], 'Huis');
  return o.doc();
}
export function knopje() {
  const o = deel('Knopje (zwart)', ZWART);
  cirkels(o, 1.45, 0.6, [[0, 0, 1.3]], 'Knopje');
  return o.doc();
}
/** de kleine onderdelen op de ESP-print (afgelezen op de maattekening): LDO, USB-UART-brug, condensatoren, weerstanden */
export function espOnderdelen() {
  const { P } = E(), o = deel('ESP32-S3-DevKitC-1 (onderdelen)', ZWART), y = P.pcb;
  const b = (a0, b0, a1, b1, h) => { const [x0, z0] = ep(a0, b0), [x1, z1] = ep(a1, b1); return [Math.min(x0, x1), y, Math.min(z0, z1), Math.max(x0, x1), y + h, Math.max(z0, z1)]; };
  blokken(o, [
    b(23.2, 9.4, 29.8, 16.0, 1.6), // LDO U2 (SOT-223), lichaam
    b(24.5, 16.2, 28.5, 17.9, 1.6), // koelvlak U2
    b(40.6, 11.4, 44.6, 15.4, 0.9), // USB-UART U3 (QFN 4 x 4)
    b(22.0, 6.0, 23.4, 7.4, 0.9), b(22.0, 7.8, 23.4, 9.2, 0.9), // C1, R24
    b(25.0, 6.0, 26.4, 7.4, 0.9), b(27.0, 6.0, 28.4, 7.4, 0.9), // C10 en C7
    b(21.5, 10.0, 22.2, 13.0, 0.6), b(21.5, 13.5, 22.2, 16.5, 0.6), // R5, C6
    b(31.5, 11.3, 34.5, 14.3, 1.0), // Q2 (SOT-23)
    b(31.5, 16.4, 34.5, 19.4, 1.0), // Q1
    b(36.7, 11.6, 37.5, 13.0, 0.5), b(36.7, 13.3, 37.5, 14.7, 0.5), b(36.7, 15.9, 37.5, 17.3, 0.5), b(36.7, 18.0, 37.5, 19.4, 0.5), // R13, R8, R10, R12
    b(41.0, 5.6, 43.5, 7.0, 0.6), b(43.8, 5.6, 46.0, 7.0, 0.6), // C11, R18
    b(51.2, 11.6, 52.8, 13.6, 1.0), b(53.4, 11.6, 55.0, 13.6, 1.0), // C15, C3
    b(54.6, 3.5, 55.4, 5.2, 0.5), b(54.6, 19.8, 55.4, 21.5, 0.5), // D2, D9 (TVS)
    b(54.6, 10.0, 55.6, 11.4, 0.5), b(54.6, 14.0, 55.6, 15.4, 0.5), // D1, D7
  ], 'SMD');
  return o.doc();
}
export function rgbLed() {
  const { P } = E(), o = deel('RGB-led WS2812 (GPIO38)', WIT), [x, z] = ep(33.6, 7.7);
  blokken(o, [[x - 1.75, P.pcb, z - 1.75, x + 1.75, P.pcb + 1.0, z + 1.75, 0.3]], 'Led');
  return o.doc();
}

// ---------------------------------------------------------------- PCA9685-breakout (oorsprong: midden, onderkant)
export function pcaPrint() {
  const P = M.pca, o = deel('PCA9685 16-kanaals PWM-print (print)', PCB_BLAUW);
  blokken(o, [[-P.x / 2, 0, -P.z / 2, P.x / 2, P.pcb, P.z / 2, 0.8]], 'Print');
  // 4 bevestigingsgaten M2,5 (56 x 19 hart op hart), 16 x 3 gaten voor de servo-uitgangen, 2 x 6 gaten aan de zijkanten
  const gaten = [[-28, -9.5, 1.3], [28, -9.5, 1.3], [-28, 9.5, 1.3], [28, 9.5, 1.3]];
  for (let k = 0; k < 16; k++) for (let r = 0; r < 3; r++) gaten.push([pcaX(k), 3.5 + r * 2.54, 0.5]);
  for (const sx of [-1, 1]) for (let r = 0; r < 6; r++) gaten.push([sx * 29.2, -6.35 + r * 2.54, 0.5]);
  cirkels(o, P.pcb, P.pcb + 1, gaten, 'Gaten', 'cut');
  return met(o.doc(), pcaArt(P));
}
export function pcaChip() {
  const P = M.pca, o = deel('PCA9685 (TSSOP-28)', ZWART);
  blokken(o, [[-4.85, P.pcb, -7.6, 4.85, P.pcb + 1.1, -3.2], [-0.6, P.pcb, -2.6, 0.6, P.pcb + 0.6, -1.6], [2.0, P.pcb, -2.6, 3.2, P.pcb + 0.6, -1.6]], 'Chip en weerstanden');
  return met(o.doc(), pcaChipArt(P));
}

export function elco(d = 6.3, h = 11, naam = 'Elco 470 µF / 25 V') {
  const o = deel(naam, { name: 'aluminium, zwarte huls', density: 2700, color: '#1c2b4a' });
  cirkels(o, 0, h, [[0, 0, d / 2]], 'Elco');
  return met(o.doc(), elcoArt(d, h));
}
/** membraantule Wiska EMT 16 LG (10062559): TPE, lichtgrijs RAL 7035, Ø21 x 11 lang, in een gat Ø16 tot 17,2; oorsprong
 *  op de buitenkant van de wand, langs +X naar buiten: flens van 2 buiten, de rest steekt naar binnen (6,6 bij een wand
 *  van 2,4); het vlies zit in de flens */
export function tule() {
  const T = M.doos.invoer.tule, o = deel('Membraantule Wiska EMT 16', { name: 'TPE, lichtgrijs (RAL 7035)', density: 1100, color: '#d7d6cf' });
  o.schets(vlak('t1', 'Plane flens', [0, 0, 0], [1, 0, 0], 'reference'), (s) => s.cirkelW([0, 0, 0], T.d / 2));
  o.extrude('boss', T.flens, { naam: 'Flens' });
  o.schets(vlak('t2', 'Plane lijf', [0.01, 0, 0], [-1, 0, 0], 'reference'), (s) => s.cirkelW([0.01, 0, 0], M.doos.invoer.gat / 2 - 0.4)); // lijf met ribbels: in het model 0,4 vrij (de mesh van het gat is een veelhoek)
  o.extrude('boss', T.l - T.flens + 0.01, { naam: 'Lijf' });
  o.schets(vlak('t3', 'Plane binnen', [-(T.l - T.flens), 0, 0], [-1, 0, 0], 'reference'), (s) => s.cirkelW([-(T.l - T.flens), 0, 0], M.doos.invoer.gat / 2 - 1.6));
  o.extrude('cut', T.l - T.flens - 0.6, { omkeren: true, naam: 'Holte' });
  return o.doc();
}
/** DC-chassisbus 5,5 x 2,5 (GlobTek JACK-L-PANEL-8A(R)): oorsprong op de buitenkant van de wand, langs +X naar buiten:
 *  flens Ø12,5 x 2,0 buiten, lijf Ø11,3 naar binnen, moer 14 sleutelwijdte tegen de binnenkant, de soldeerlippen */
export function dcBus() {
  const B = M.dcbus, w = M.doos.wand, o = deel('DC-chassisbus 5,5 x 2,5 (8 A)', { name: 'messing, vernikkeld', density: 8500, color: '#c9ccd1' });
  o.schets(vlak('j1', 'Plane flens', [0, 0, 0], [1, 0, 0], 'reference'), (s) => s.cirkelW([0, 0, 0], B.flens / 2));
  o.extrude('boss', B.flensDik, { naam: 'Flens' });
  o.schets(vlak('j2', 'Plane lijf', [0.01, 0, 0], [-1, 0, 0], 'reference'), (s) => s.cirkelW([0.01, 0, 0], B.draad / 2 - 0.05));
  o.extrude('boss', B.lijf - B.flensDik + 0.01, { naam: 'Lijf' });
  // de moer (zeskant) tegen de binnenkant van de wand
  const r = B.moer / Math.sqrt(3), x = -w - 0.05;
  o.schets(vlak('j3', 'Plane moer', [x, 0, 0], [-1, 0, 0], 'reference'), (s) => s.lusW(Array.from({ length: 6 }, (_, i) => [x, r * Math.sin((i * Math.PI) / 3), r * Math.cos((i * Math.PI) / 3)])));
  o.extrude('boss', B.moerDik, { naam: 'Moer' });
  // de opening voor de stekker (Ø5,7) en de 2 soldeerlippen achteraan
  o.schets(vlak('j4', 'Plane opening', [B.flensDik, 0, 0], [1, 0, 0], 'reference'), (s) => s.cirkelW([B.flensDik, 0, 0], 2.85));
  o.extrude('cut', 9, { omkeren: true, naam: 'Opening stekker' });
  const xl = -(B.lijf - B.flensDik);
  blokken(o, [[xl - B.lippen, -3.5, -2.0, xl + 0.01, 3.5, -1.6], [xl - B.lippen, -3.5, 1.6, xl + 0.01, 3.5, 2.0]], 'Soldeerlippen');
  return o.doc();
}

// ---------------------------------------------------------------- assemblage
/** verzonken schroef (90°): oorsprong boven op de kop, schacht langs -Y */
export function schroefVerzonken(naam, d, kern, L) {
  const o = deel(naam, METAAL), k = 2 * d;
  o.schets(yv(0, 'Plane kop'), (s) => s.cirkelW([0, 0, 0], k / 2));
  o.extrude('boss', d / 2, { omkeren: true, naam: 'Kop', draft: 45 });
  o.schets(yv(-d / 2 + 0.05, 'Plane schacht'), (s) => s.cirkelW([0, 0, 0], kern / 2));
  o.extrude('boss', L - d / 2, { omkeren: true, naam: 'Schacht' });
  snede(o, 0, 0.6, [[-k * 0.3, -0.3, k * 0.3, 0.3], [-0.3, -k * 0.3, 0.3, k * 0.3]], 'Kruiskop');
  return o.doc();
}
/** bolkopschroef d x L met kop Ø k en hoogte d * 0,7: oorsprong onder de kop, schacht langs -Y */
export function bolkopSchroef(naam, d, k, kern, L) {
  const o = deel(naam, METAAL);
  cirkels(o, 0, d * 0.7, [[0, 0, k / 2]], 'Kop');
  o.schets(yv(0.05, 'Plane schacht'), (s) => s.cirkelW([0, 0, 0], kern / 2));
  o.extrude('boss', L, { omkeren: true, naam: 'Schacht' });
  snede(o, d * 0.7, d * 0.3, [[-k * 0.3, -0.35, k * 0.3, 0.35], [-0.35, -k * 0.3, 0.35, k * 0.3]], 'Kruiskop');
  return o.doc();
}
/** bolkopschroef 2,5 x 6 (zelftappend) voor de prints: oorsprong onder de kop (op de print), schacht langs -Y */
let bolkop;
function bolkopDoc() {
  if (bolkop) return bolkop;
  const o = deel('Plaatschroef 2,5 x 6 bolkop', METAAL);
  cirkels(o, 0, 1.7, [[0, 0, 2.25]], 'Kop');
  o.schets(yv(0.05, 'Plane schacht'), (s) => s.cirkelW([0, 0, 0], 1.05));
  o.extrude('boss', 6, { omkeren: true, naam: 'Schacht' });
  snede(o, 1.7, 0.6, [[-1.2, -0.25, 1.2, 0.25], [-0.25, -1.2, 0.25, 1.2]], 'Kruiskop');
  bolkop = o.doc();
  return bolkop;
}
function schroeven(at, pre, lijst) {
  const doc = bolkopDoc();
  lijst.forEach((p, i) => at(`${pre}s${i + 1}`, `Plaatschroef 2,5 x 6 bolkop<${pre}${i + 1}>`, doc, p));
}
const hoekGaten = (b) => [[-b.x / 2 + 2.54, -b.z / 2 + 2.54], [b.x / 2 - 2.54, -b.z / 2 + 2.54], [-b.x / 2 + 2.54, b.z / 2 - 2.54], [b.x / 2 - 2.54, b.z / 2 - 2.54]];
const draaiY = (deg) => { const a = (deg * Math.PI) / 360; return [0, Math.sin(a), 0, Math.cos(a)]; };
function vrouwelijkeRij(n, steek = 2.54) {
  const o = deel(`Vrouwelijke pinrij ${n}-polig`, ZWART), L = n * steek;
  blokken(o, [[-L / 2, 0, -1.25, L / 2, 8.5, 1.25]], 'Huis');
  snede(o, 8.5, 6, Array.from({ length: n }, (_, i) => { const x = -L / 2 + steek * (i + 0.5); return [x - 0.5, -0.5, x + 0.5, 0.5]; }), 'Gaatjes');
  return o.doc();
}
// ---------------------------------------------------------------- versie 4: de kant-en-klare modules (opbouw.mjs)
const cache3d = new Map(), eenmaal = (k, f) => { if (!cache3d.has(k)) cache3d.set(k, f()); return cache3d.get(k); };
const PCB_MAT = { '#1f4fa3': PCB_BLAUW, '#1d1f22': PCB_ZWART };
const vlakBlok = (naam, mat, b) => eenmaal(`blok${naam}`, () => { const o = deel(naam, mat); blokken(o, [b], naam); return o.doc(); });

/** de print van een module met zijn gaten en de opdruk */
function modulePrint(ref) {
  const m = MODULES[ref];
  return eenmaal(`print${m.kort}`, () => {
    const o = deel(`${m.naam} (print)`, PCB_MAT[m.kleur] ?? PCB_BLAUW);
    blokken(o, [[-m.l / 2, 0, -m.b / 2, m.l / 2, m.pcb, m.b / 2, 1]], 'Print');
    if (m.gaten.length) cirkels(o, m.pcb, m.pcb + 1, m.gaten.map(([x, z]) => [x, z, m.gat / 2 + 0.1]), 'Gaten', 'cut');
    return met(o.doc(), moduleArt(m));
  });
}
/** de klemmen van een module in rijen: opeenvolgende klemmen van dezelfde soort op één lijn met dezelfde steek */
export function klemRijen(m) {
  const rijen = [];
  for (const k of m.klemmen) {
    const r = rijen[rijen.length - 1], vorige = r?.ks[r.ks.length - 1];
    let past = r && r.soort === k.soort && r.in === k.in;
    if (past) {
      const dx = k.x - vorige.x, dz = k.z - vorige.z, d = Math.hypot(dx, dz);
      const opLijn = Math.abs(dx) < 1e-6 || Math.abs(dz) < 1e-6, richting = Math.abs(dx) < 1e-6 ? 'z' : 'x';
      past = opLijn && (r.ks.length < 2 || (richting === r.richting && Math.abs(d - r.steek) < 1e-6));
      if (past && r.ks.length === 1) { r.steek = d; r.richting = richting; }
    }
    if (past) r.ks.push(k);
    else rijen.push({ soort: k.soort, in: k.in, ks: [k], steek: k.soort === 'schroef35' ? 3.5 : k.soort === 'pin' ? 2.54 : 5.0, richting: 'x' });
  }
  return rijen.map((r) => {
    const xs = r.ks.map((k) => k.x), zs = r.ks.map((k) => k.z);
    return { ...r, n: r.ks.length, x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2, langsZ: r.richting === 'z' };
  });
}
/** de draaiing (graden om +Y) van een klemmenstrook: de draadingang van klemstrook() wijst naar -Z */
const INGANG = { '-z': 0, '+z': 180, '-x': 90, '+x': -90 };
const klemDoc = (soort, n) => eenmaal(`klem${soort}${n}`, () => (soort === 'schroef'
  ? klemstrook(`Schroefklem ${n}-polig 5,0`, n, 5.0, 7.5, 10, KLEM_BLAUW)
  : klemstrook(`Schroefklem ${n}-polig 3,5`, n, 3.5, 7.0, 8.5, KLEM_GROEN)));
const pinDocs = (n) => eenmaal(`pin${n}`, () => [pinStrip(`Pinrij ${n}-polig`, n), pinnen(`Pinnen ${n} (verguld)`, n, 2.54, 0, 2.5 + 6)]);

/** de onderdelen op een module (in het modulestelsel, y vanaf de bovenkant van de print): [naam, doc, [x, y, z], graden] */
function moduleOnderdelen(m) {
  const uit = [], blk = (naam, mat, x, z, l, b, h, r = 0.2) => uit.push([naam, vlakBlok(`${naam} ${l}x${b}x${h}`, mat, [-l / 2, 0, -b / 2, l / 2, h, b / 2, r]), [x, 0, z], 0]);
  const LED = { name: 'led, rood', density: 1200, color: '#d62828' };
  if (m.kort === 'MOSFET-module') {
    for (let i = 0; i < 8; i++) {
      blk('MOSFET (TO-252)', ZWART, -35 + 10 * i, 5, 6.5, 6.1, 2.3);
      blk('Koellip', METAAL, -35 + 10 * i, 9.4, 5.2, 1.4, 0.6, 0);
      blk('Optocoupler PC817', ZWART, -35 + 10 * i, -8, 4.6, 6.5, 3.5);
      blk('Led', LED, -35 + 10 * i, -14, 1.6, 0.8, 0.6, 0);
    }
  } else if (m.kort === 'Optocouplerprint') {
    for (let i = 0; i < 8; i++) {
      blk('Optocoupler PC817', ZWART, -31.5 + 9 * i, 0, 4.6, 6.5, 3.5);
      blk('Led', LED, -31.5 + 9 * i, 6.5, 1.6, 0.8, 0.6, 0);
    }
    blk('Jumper', ZWART, 34.5, -6, 2.5, 5.1, 2.5, 0);
  } else if (m.kort === 'SBC-Buck02') {
    blk('Spoel', { name: 'ferriet', density: 4800, color: '#3b3b3e' }, 2, -5, 12, 12, 7.5, 0.6);
    const c = eenmaal('elcoBuck', () => elco(8, 13, 'Elco 470 µF / 35 V'));
    uit.push(['Elco 470 µF', c, [14, 0, 8], 0], ['Elco 470 µF', c, [14, 0, -6], 0]);
    blk('Regelaar-IC', ZWART, -6, 8, 5, 4, 1.5);
  } else if (m.wago) {
    // WAGO 221-415: transparant huis, 5 oranje hendels
    uit.push(['Huis', vlakBlok('WAGO 221-415 huis', { name: 'PA, transparant grijs', density: 1150, color: '#d9d6cf' }, [-m.l / 2, 0, -m.b / 2, m.l / 2, 6.3, m.b / 2, 0.8]), [0, 0, 0], 0]);
    for (let i = 0; i < 5; i++) uit.push(['Hendel', vlakBlok('WAGO hendel', { name: 'PA, oranje', density: 1150, color: '#f28c28' }, [-2.3, 0, -8.5, 2.3, 2.0, 6.5, 0.6]), [-11.9 + i * 5.95, 6.3, -0.5], 0]);
  }
  return uit;
}

/** een module met alles erop in de assemblage (id's m<code>_<n>); de ESP op haar klemmenadapter, de PCA9685 met zijn
 *  eigen print en pinnen */
function moduleOp(at, ref) {
  const m = MODULES[ref], p = PLAATSING[ref], y0 = moduleY(ref), code = ref.replace(/^-/, '').toLowerCase();
  let n = 0;
  const id = () => `m${code}_${++n}`, rot = (a) => draaiY(p.rot + a);
  const pos = (x, y, z) => { const [wx, wz] = naarDoos(ref, x, z); return [wx, y0 + y, wz]; };
  if (ref === '-K2') {
    at(id(), 'PCA9685 (print)<1>', pcaPrint(), pos(0, 0, 0), rot(0));
    at(id(), 'PCA9685 (chip)<1>', pcaChip(), pos(0, 0, 0), rot(0));
    // de pinnen: 2 x 6 aan de zijkanten (langs z), 3 rijen van 16 (PWM, V+, GND) met een spleet per 4
    for (const sx of [-1, 1]) { const [s, q] = pinDocs(6); at(id(), 'Pinrij 6-polig<PCA>', s, pos(sx * 29.2, m.pcb, -6.35 + 2.5 * 2.54), rot(90)); at(id(), 'Pinnen 6<PCA>', q, pos(sx * 29.2, m.pcb, -6.35 + 2.5 * 2.54), rot(90)); }
    for (const z of [3.5, 6.04, 8.58]) for (let g = 0; g < 4; g++) { const [s, q] = pinDocs(4); at(id(), 'Pinrij 4-polig<PCA>', s, pos(pcaX(4 * g) + 1.5 * 2.54, m.pcb, z), rot(0)); at(id(), 'Pinnen 4<PCA>', q, pos(pcaX(4 * g) + 1.5 * 2.54, m.pcb, z), rot(0)); }
  } else {
    if (!m.wago) at(id(), `${m.naam} (print)<${ref}>`, modulePrint(ref), pos(0, 0, 0), rot(0));
    for (const r of klemRijen(m)) {
      if (r.soort === 'wago') continue;
      if (r.soort === 'pin') { const [s, q] = pinDocs(r.n); at(id(), `Pinrij ${r.n}-polig<${ref}>`, s, pos(r.x, m.pcb, r.z), rot(r.langsZ ? 90 : 0)); at(id(), `Pinnen ${r.n}<${ref}>`, q, pos(r.x, m.pcb, r.z), rot(r.langsZ ? 90 : 0)); continue; }
      at(id(), `Schroefklem ${r.n}-polig<${ref}>`, klemDoc(r.soort, r.n), pos(r.x, m.pcb, r.z), rot(INGANG[r.in]));
    }
    for (const [naam, doc, [x, y, z], a] of moduleOnderdelen(m)) at(id(), `${naam}<${ref}>`, doc, pos(x, m.pcb + y, z), rot(a));
  }
  if (ref === '-X6') {
    // de ESP32-S3-DevKitC-1 in 2 vrouwelijke pinrijen van 22 (22,86 hart op hart), de USB-kant naar +x (de rechterwand)
    const E = M.esp, xe = 0, ye = m.pcb + 8.5 + 2.5, rijX = xe - E.x / 2 + E.pin.eerste + ((E.pin.n - 1) * E.pin.steek) / 2, zr = E.z / 2 - E.pin.rand;
    const vrouw = eenmaal('vrouw22', () => vrouwelijkeRij(E.pin.n)), strip = eenmaal('strip22', () => pinStrip('Pinrij 22-polig (plastic)', E.pin.n)), pin = eenmaal('pin22', () => pinnen('Pinnen 22 (verguld)', E.pin.n));
    for (const z of [-zr, zr]) {
      at(id(), 'Vrouwelijke pinrij 22-polig<ESP>', vrouw, pos(rijX, m.pcb, z), rot(0));
      at(id(), 'Pinrij ESP<ESP>', strip, pos(rijX, ye - 2.5, z), rot(0));
      at(id(), 'Pinnen ESP<ESP>', pin, pos(rijX, ye - 2.5, z), rot(0));
    }
    for (const [naam, f] of [['ESP32-S3-DevKitC-1 (print)', espPrint], ['ESP32-S3-WROOM-1 (module)', espModule], ['ESP32-S3-WROOM-1 (kap)', espKap], ['PCB-antenne', espAntenne], ['ESP-onderdelen', espOnderdelen], ['RGB-led', rgbLed]]) at(id(), `${naam}<1>`, eenmaal(naam, f), pos(xe, ye, 0), rot(0));
    const usb = eenmaal('usb', microUsb), knop = eenmaal('knop', drukknop), kn = eenmaal('knopje', knopje);
    for (const [i, b] of [[1, 6.2], [2, 19.5]]) at(id(), `Micro-USB ${i === 1 ? 'UART' : 'USB'}<${i}>`, usb, pos(xe + E.x / 2 + 0.8, ye + E.pcb, E.z / 2 - b), rot(0));
    for (const [i, b] of [[1, 7.7], [2, 18.1]]) {
      at(id(), `Drukknop ${i === 1 ? 'BOOT' : 'RESET'}<${i}>`, knop, pos(xe - E.x / 2 + 48.8, ye + E.pcb, E.z / 2 - b), rot(0));
      at(id(), `Knopje ${i === 1 ? 'BOOT' : 'RESET'}<${i}>`, kn, pos(xe - E.x / 2 + 48.8, ye + E.pcb, E.z / 2 - b), rot(0));
    }
  }
  // de schroeven op de paaltjes (plaatschroef bolkop)
  const doc = bolkopDoc();
  m.gaten.forEach(([x, z]) => at(id(), `Plaatschroef bolkop<${ref}>`, doc, pos(x, m.pcb, z)));
}
/** de USB-poorten van de ESP: hoogte (midden), x van de rand en de z-strook, voor de opening in de rechterwand */
export function espUsb() {
  const m = MODULES['-X6'], E = M.esp, y = moduleY('-X6') + m.pcb + 8.5 + 2.5 + E.pcb + 1.25;
  const [x] = naarDoos('-X6', E.x / 2 + 0.8, 0), za = naarDoos('-X6', 0, E.z / 2 - 19.5)[1], zb = naarDoos('-X6', 0, E.z / 2 - 6.2)[1];
  return { y, x, z0: Math.min(za, zb) - 5.5, z1: Math.max(za, zb) + 5.5 };
}
/** alle modules op de moduleplaat */
export function modulesOp(at) { for (const ref of Object.keys(MODULES)) moduleOp(at, ref); }

export { schroeven, bolkopDoc, hoekGaten, draaiY };
