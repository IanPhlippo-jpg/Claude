// Gekochte onderdelen van de kabeldoos als Phlippo CAD-onderdelen (uit versie 1, ongewijzigd): het Modelbouwled-bordje,
// de ESP32-S3-DevKitC-1 op haar draagprint, de PCA9685, de gaatjesprints met hun onderdelen, tule, wartel en schroeven.
// Maten met bron: docs/Maten-en-bronnen.md. De stapels (espStapel, uitgangStapel, ...) zetten een print met alles erop
// in de assemblage, de onderkant van de print op M.voet boven de bodem.
import { vlak } from '../lib/schets.mjs';
import { M } from './maten.mjs';
import { deel, met, blokken, snede, cirkels, yv, PCB_ROOD, PCB_ZWART, PCB_BLAUW, PCB_BRUIN, KLEM_GROEN, KLEM_BLAUW, ZWART, METAAL, GOUD, WIT } from './hulp.mjs';
import { bordjeArt, weerstandenArt, espArt, kapArt, pcaArt, pcaChipArt, gaatjesArt, pololuArt, rijOpschrift, elcoArt, zekeringArt } from './printjes.mjs';

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
  for (let k = 0; k < 16; k++) for (let r = 0; r < 3; r++) gaten.push([-25.4 + k * 2.54 + Math.floor(k / 4) * 1.27, 3.5 + r * 2.54, 0.5]);
  for (const sx of [-1, 1]) for (let r = 0; r < 6; r++) gaten.push([sx * 29.2, -6.35 + r * 2.54, 0.5]);
  cirkels(o, P.pcb, P.pcb + 1, gaten, 'Gaten', 'cut');
  return met(o.doc(), pcaArt(P));
}
export function pcaChip() {
  const P = M.pca, o = deel('PCA9685 (TSSOP-28)', ZWART);
  blokken(o, [[-4.85, P.pcb, -7.6, 4.85, P.pcb + 1.1, -3.2], [-0.6, P.pcb, -2.6, 0.6, P.pcb + 0.6, -1.6], [2.0, P.pcb, -2.6, 3.2, P.pcb + 0.6, -1.6]], 'Chip en weerstanden');
  return met(o.doc(), pcaChipArt(P));
}

// ---------------------------------------------------------------- eigen gaatjesprints (oorsprong: midden, onderkant)
function gaatjesprint(naam, x, z) {
  const o = deel(naam, PCB_BRUIN);
  blokken(o, [[-x / 2, 0, -z / 2, x / 2, 1.6, z / 2, 0.5]], 'Print');
  // 4 gaten M2,5 in de hoeken
  cirkels(o, 1.6, 2.6, [[-x / 2 + 2.54, -z / 2 + 2.54, 1.35], [x / 2 - 2.54, -z / 2 + 2.54, 1.35], [-x / 2 + 2.54, z / 2 - 2.54, 1.35], [x / 2 - 2.54, z / 2 - 2.54, 1.35]], 'Bevestigingsgaten', 'cut');
  return met(o.doc(), gaatjesArt(x, z));
}
export const uitgangPcb = () => gaatjesprint('Uitgangsprint (gaatjesprint)', M.uitgang.x, M.uitgang.z);
export const ingangPcb = () => gaatjesprint('Ingangsprint (gaatjesprint)', M.ingang.x, M.ingang.z);
export const voedingPcb = () => gaatjesprint('Voedingsprint (gaatjesprint)', M.voeding.x, M.voeding.z);
export function dragerPcb() {
  const o = deel('Draagprint ESP (gaatjesprint)', PCB_BRUIN), D = M.drager;
  blokken(o, [[-D.x / 2, 0, -D.z / 2, D.x / 2, 1.6, D.z / 2, 0.5]], 'Print');
  cirkels(o, 1.6, 2.6, [[-D.x / 2 + 3, 0, 1.35], [D.x / 2 - 3, 0, 1.35]], 'Bevestigingsgaten', 'cut');
  return met(o.doc(), gaatjesArt(D.x, D.z, { schroeven: 'midden' }));
}
/** n DIP-behuizingen (4 of 16 pinnen) op een rij; l x b x h van het lichaam; de pootjes als dunne strips eronder */
export function dipRij(naam, n, steek, l, b, h, pootjes) {
  const o = deel(naam, ZWART), L = n * steek;
  blokken(o, Array.from({ length: n }, (_, i) => { const x = -L / 2 + steek * (i + 0.5); return [x - l / 2, 0.5, -b / 2, x + l / 2, 0.5 + h, b / 2, 0.3]; }), 'Behuizing');
  // pootjes: per behuizing 2 rijen van `pootjes` stuks, 0,5 breed
  const p = [];
  for (let i = 0; i < n; i++) {
    const x = -L / 2 + steek * (i + 0.5);
    for (let k = 0; k < pootjes; k++) for (const s of [-1, 1]) { const px = x - (pootjes - 1) * 1.27 + k * 2.54, z0 = s > 0 ? b / 2 : -b / 2 - 0.7; p.push([px - 0.25, 0, z0, px + 0.25, 1.4, z0 + 0.7]); }
  }
  const m = deel(`${naam} pootjes`, METAAL);
  blokken(m, p, 'Pootjes');
  return [o.doc(), m.doc()];
}
/** steekzekering (ATO) in een printhouder: houder zwart, zekering bruin (7,5 A) */
export function zekeringHouder() {
  const o = deel('Printhouder steekzekering ATO', ZWART);
  blokken(o, [[-9.8, 0, -3.6, 9.8, 7.5, 3.6, 0.5]], 'Houder');
  snede(o, 7.5, 5.5, [[-9.4, -2.6, 9.4, 2.6, 0.3]], 'Opening');
  return o.doc();
}
export function steekzekering() {
  const o = deel('Steekzekering ATO 7,5 A', { name: 'PA, lichtbruin', density: 1140, color: '#b5651d' });
  blokken(o, [[-9.25, 2.5, -2.6, 9.25, 15.0, 2.6, 0.6], [-9.25, 15.0 - 0.05, -1.9, 9.25, 15.8, 1.9, 0.4]], 'Zekering');
  return met(o.doc(), zekeringArt());
}
/** Pololu D24V10F5 (17,8 x 12,7) met de spoel en de pinrij */
export function pololu() {
  const o = deel('Pololu D24V10F5 (print)', { name: 'FR4, groen', density: 1850, color: '#1f6b3a' });
  blokken(o, [[-8.9, 0, -6.35, 8.9, 1.0, 6.35, 0.4]], 'Print');
  return met(o.doc(), pololuArt());
}
export function spoel() {
  const o = deel('Spoel 4 x 4', { name: 'ferriet', density: 4800, color: '#3b3b3e' });
  blokken(o, [[-2, 0.95, -2, 2, 3.0, 2, 0.6]], 'Spoel');
  return o.doc();
}
export function polyfuseRij(n, steek) {
  const o = deel(`${n} polyfuses 1,1 A (radiaal)`, { name: 'epoxy, geel', density: 1900, color: '#e3b505' }), L = n * steek;
  blokken(o, Array.from({ length: n }, (_, i) => { const x = -L / 2 + steek * (i + 0.5); return [x - 2.5, 3, -1.5, x + 2.5, 10, 1.5, 1.2]; }), 'Polyfuses');
  return o.doc();
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
/** wartel M12 x 1,5 (kabel Ø3 tot 6,5): buitenmoer en dop, oorsprong op de wand, langs +X naar buiten */
export function wartel() {
  const o = deel('Wartel M12 x 1,5', { name: 'PA, zwart', density: 1140, color: '#202124' });
  o.schets(vlak('w', 'Plane wartel', [0, 0, 0], [1, 0, 0], 'reference'), (s) => s.cirkelW([0, 0, 0], 7.5));
  o.extrude('boss', 8, { naam: 'Zeskant en dop' });
  o.schets(vlak('w2', 'Plane wartel 2', [-2.4, 0, 0], [1, 0, 0], 'reference'), (s) => s.cirkelW([-2.4, 0, 0], 6));
  o.extrude('boss', 2.5, { naam: 'Draad binnen' });
  o.schets(vlak('w3', 'Plane wartel kabel', [8, 0, 0], [1, 0, 0], 'reference'), (s) => s.cirkelW([8, 0, 0], 3));
  o.extrude('cut', 12, { omkeren: true, naam: 'Kabeldoorgang' });
  return o.doc();
}
/** de x van de draagprint: rechts in de rij, de USB-kant van de ESP 1 mm van de rechterwand */
const espDragerX = (d) => espX(d) - M.esp.x / 2 + M.esp.pin.eerste + ((M.esp.pin.n - 1) * M.esp.pin.steek) / 2;
/** de 2 schroeven van de draagprint (tussen de pinrijen, aan de uiteinden) */
const dragerGaten = () => [[-M.drager.x / 2 + 3, 0], [M.drager.x / 2 - 3, 0]];
/** de x van het midden van de ESP-print: de USB-kant (rand + 0,8 uitsteek) tot 1 mm van de binnenwand */
const espX = (d) => d.cx + d.x / 2 - 1.8 - M.esp.x / 2;
const espY = () => M.voet + 1.6 + 8.5 + 2.5; // onderkant van de ESP-print: draagprint, vrouwelijke pinrij 8,5, plastic van de pinnen 2,5
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
/** vrouwelijke pinrij (zwart, 8,5 hoog) met de gaatjes van boven; oorsprong midden onderaan */
function vrouwelijkeRij(n, steek = 2.54) {
  const o = deel(`Vrouwelijke pinrij ${n}-polig`, ZWART), L = n * steek;
  blokken(o, [[-L / 2, 0, -1.25, L / 2, 8.5, 1.25]], 'Huis');
  snede(o, 8.5, 6, Array.from({ length: n }, (_, i) => { const x = -L / 2 + steek * (i + 0.5); return [x - 0.5, -0.5, x + 0.5, 0.5]; }), 'Gaatjes');
  return o.doc();
}
/** de ESP op haar draagprint met 2 vrouwelijke pinrijen van 22 */
function espStapel(at, d) {
  const P = M.esp, y0 = M.voet, xd = espDragerX(d), xe = espX(d), ye = espY();
  at('e0', 'Draagprint ESP<1>', dragerPcb(), [xd, y0, d.cz]);
  schroeven(at, 'e', dragerGaten().map(([x, z]) => [xd + x, y0 + 1.6, d.cz + z]));
  const rijX = xe - P.x / 2 + P.pin.eerste + ((P.pin.n - 1) * P.pin.steek) / 2, zr = P.z / 2 - P.pin.rand;
  const vrouw = vrouwelijkeRij(P.pin.n);
  at('e1', 'Vrouwelijke pinrij 22-polig<1>', vrouw, [rijX, y0 + 1.6, d.cz - zr]);
  at('e2', 'Vrouwelijke pinrij 22-polig<2>', vrouw, [rijX, y0 + 1.6, d.cz + zr]);
  const strip = pinStrip('Pinrij 22-polig (plastic)', P.pin.n), pin = pinnen('Pinnen 22 (verguld)', P.pin.n);
  for (const [i, z] of [[1, -zr], [2, zr]]) {
    at(`e${2 + i}`, `Pinrij ESP<${i}>`, strip, [rijX, ye - 2.5, d.cz + z]);
    at(`e${4 + i}`, `Pinnen ESP<${i}>`, pin, [rijX, ye - 2.5, d.cz + z]);
  }
  at('e7', 'ESP32-S3-DevKitC-1 (print)<1>', espPrint(), [xe, ye, d.cz]);
  at('e8', 'ESP32-S3-WROOM-1 (module)<1>', espModule(), [xe, ye, d.cz]);
  at('e9', 'ESP32-S3-WROOM-1 (kap)<1>', espKap(), [xe, ye, d.cz]);
  at('e10', 'PCB-antenne<1>', espAntenne(), [xe, ye, d.cz]);
  at('e11', 'ESP-onderdelen<1>', espOnderdelen(), [xe, ye, d.cz]);
  at('e12', 'RGB-led<1>', rgbLed(), [xe, ye, d.cz]);
  const usb = microUsb(), knop = drukknop(), kn = knopje();
  for (const [i, b] of [[1, 6.2], [2, 19.5]]) at(`e${12 + i}`, `Micro-USB ${i === 1 ? 'UART' : 'USB'}<${i}>`, usb, [xe + P.x / 2 + 0.8, ye + P.pcb, d.cz + P.z / 2 - b]);
  for (const [i, b] of [[1, 7.7], [2, 18.1]]) {
    const [x, z] = [xe - P.x / 2 + 48.8, d.cz + P.z / 2 - b];
    at(`e${14 + i}`, `Drukknop ${i === 1 ? 'BOOT' : 'RESET'}<${i}>`, knop, [x, ye + P.pcb, z]);
    at(`e${16 + i}`, `Knopje ${i === 1 ? 'BOOT' : 'RESET'}<${i}>`, kn, [x, ye + P.pcb, z]);
  }
}
function uitgangStapel(at, d) {
  const U = M.uitgang, y = M.voet + 1.6;
  at('u0', 'Uitgangsprint<1>', uitgangPcb(), [d.cx, M.voet, d.cz]);
  schroeven(at, 'u', hoekGaten(U).map(([x, z]) => [d.cx + x, y, d.cz + z]));
  const [mos0, poot] = dipRij('8 x IRLD024 (MOSFET)', 8, 6.35, 6.0, 4.8, 3.3, 2);
  const mos = met(mos0, rijOpschrift(8, 6.35, 6.0, 4.8, 0.5 + 3.3, [['IRLD024', 0.62], ['2341', 0.5]]));
  for (const [i, z] of [[1, -5.6], [2, 0.6]]) { at(`u${i}`, `MOSFET's IRLD024 rij ${i}<${i}>`, mos, [d.cx + 1.5, y, d.cz + z]); at(`u${i + 2}`, `Pootjes rij ${i}<${i}>`, poot, [d.cx + 1.5, y, d.cz + z]); }
  const sip = deel('Weerstandsnetwerk SIP-9 100 kΩ', ZWART);
  blokken(sip, [[-11.43, 0, -1.25, 11.43, 6, 1.25]], 'SIP');
  const sd = sip.doc();
  at('u5', 'SIP-9 100 kΩ<1>', sd, [d.cx - 12.5, y, d.cz - 10.6]);
  at('u6', 'SIP-9 100 kΩ<2>', sd, [d.cx + 12.5, y, d.cz - 10.6]);
  at('u7', 'Klemstrook 16-polig 3,5 (uitgangen)<1>', klemstrook('Klemstrook 16-polig 3,5', 16, 3.5, 7, 8.5, KLEM_BLAUW), [d.cx, y, d.cz + U.z / 2 - 3.6], draaiY(180));
}
function ingangStapel(at, d) {
  const I = M.ingang, y = M.voet + 1.6;
  at('i0', 'Ingangsprint<1>', ingangPcb(), [d.cx, M.voet, d.cz]);
  schroeven(at, 'i', hoekGaten(I).map(([x, z]) => [d.cx + x, y, d.cz + z]));
  const [opto0, poot] = dipRij('2 x PC847 (4 optocouplers)', 2, 21, 19.8, 6.4, 3.5, 8);
  const [net0, npoot] = dipRij('Weerstandsnetwerk DIP-16 2,2 kΩ (8 x)', 1, 21, 19.8, 6.4, 3.0, 8);
  const opto = met(opto0, rijOpschrift(2, 21, 19.8, 6.4, 0.5 + 3.5, [['PC847', 1.1], ['2338  B', 0.75]], { kerf: false }));
  const net = met(net0, rijOpschrift(1, 21, 19.8, 6.4, 0.5 + 3.0, [['4116R-1-222', 0.9], ['2228', 0.7]], { kerf: false }));
  for (const [i, z] of [[1, -7.6], [2, 0.6]]) {
    at(`i${i}`, `PC847 rij ${i}<${i}>`, opto, [d.cx - 10.5, y, d.cz + z]);
    at(`i${i + 2}`, `Pootjes PC847 rij ${i}<${i}>`, poot, [d.cx - 10.5, y, d.cz + z]);
    at(`i${i + 4}`, `Weerstandsnetwerk 2,2 kΩ<${i}>`, net, [d.cx + 22, y, d.cz + z]);
    at(`i${i + 6}`, `Pootjes netwerk<${i}>`, npoot, [d.cx + 22, y, d.cz + z]);
  }
  at('i9', 'Klemstrook 20-polig 3,5 (ingangen)<1>', klemstrook('Klemstrook 20-polig 3,5', 20, 3.5, 7, 8.5, KLEM_BLAUW), [d.cx, y, d.cz + I.z / 2 - 3.6], draaiY(180));
}
function voedingStapel(at, d) {
  const V = M.voeding, y = M.voet + 1.6, x0 = d.cx - V.x / 2;
  at('v0', 'Voedingsprint<1>', voedingPcb(), [d.cx, M.voet, d.cz]);
  schroeven(at, 'v', hoekGaten(V).map(([x, z]) => [d.cx + x, y, d.cz + z]));
  at('v1', 'Klem 2-polig 5,08 (12 V in)<1>', klemstrook('Klem 2-polig 5,08', 2, 5.08, 7.6, 10, KLEM_GROEN), [x0 + 5.3, y, d.cz - 2.5], draaiY(90));
  at('v2', 'Printhouder steekzekering<1>', zekeringHouder(), [x0 + 22, y, d.cz - 7.2]);
  at('v3', 'Steekzekering 7,5 A<1>', steekzekering(), [x0 + 22, y, d.cz - 7.2]);
  at('v4', 'Pololu D24V10F5 (print)<1>', pololu(), [x0 + 46, y + 2.5, d.cz - 5.4]);
  at('v5', 'Pololu spoel<1>', spoel(), [x0 + 48, y + 2.5, d.cz - 5.4]);
  at('v6', 'Pinrij Pololu<1>', pinStrip('Pinrij 5-polig (Pololu)', 5), [x0 + 46, y, d.cz - 5.4 + 5.08]); // langs de lange rand (EN VIN GND VOUT PG)
  at('v7', '6 polyfuses<1>', polyfuseRij(6, 6.2), [x0 + 37, y - 3, d.cz + 3.4]);
  at('v8', 'Klemstrook 8-polig 3,5 (+12 V rijen en 0 V)<1>', klemstrook('Klemstrook 8-polig 3,5', 8, 3.5, 7, 8.5, KLEM_BLAUW), [x0 + 40, y, d.cz + V.z / 2 - 3.6], draaiY(180));
  at('v9', 'Elco 470 µF / 25 V<1>', elco(), [x0 + 14, y, d.cz + 6.5]);
}

export { espStapel, uitgangStapel, ingangStapel, voedingStapel, schroeven, espX, espY, espDragerX, dragerGaten, hoekGaten, draaiY };
