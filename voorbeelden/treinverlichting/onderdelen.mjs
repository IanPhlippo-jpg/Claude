// Gekochte onderdelen van de kabeldoos als Phlippo CAD-onderdelen (uit versie 1, ongewijzigd): het Modelbouwled-bordje,
// de ESP32-S3-DevKitC-1 op haar draagprint, de PCA9685, de gaatjesprints met hun onderdelen, tule, wartel en schroeven.
// Maten met bron: docs/Maten-en-bronnen.md. De stapels (espStapel, uitgangStapel, ...) zetten een print met alles erop
// in de assemblage, de onderkant van de print op M.voet boven de bodem.
import { vlak } from '../lib/schets.mjs';
import { M } from './maten.mjs';
import { deel, met, blokken, snede, cirkels, yv, PCB_ROOD, PCB_ZWART, PCB_BLAUW, PCB_BRUIN, KLEM_GROEN, KLEM_BLAUW, ZWART, METAAL, GOUD, WIT } from './hulp.mjs';
import { bordjeArt, weerstandenArt, espArt, kapArt, pcaArt, pcaChipArt, gaatjesArt, pololuArt, rijOpschrift, elcoArt, zekeringArt } from './printjes.mjs';
import { PRINTS, vormen, vrijeGaten, gatXY } from './opbouw.mjs';

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
// de indeling (onderdelen, gaten, schroeven, bijgeboorde gaten) komt uit opbouw.mjs
function gaatjesprint(P) {
  const o = deel(`${P.naam} (gaatjesprint)`, PCB_BRUIN);
  blokken(o, [[-P.w / 2, 0, -P.h / 2, P.w / 2, 1.6, P.h / 2, 0.5]], 'Print');
  const gaten = [...P.schroeven, ...P.boringen].map(([x, y]) => [x - P.w / 2, y - P.h / 2, 1.35]);
  cirkels(o, 1.6, 2.6, gaten, 'Bevestigingsgaten', 'cut');
  return met(o.doc(), gaatjesArt(P, vrijeGaten(P)));
}
export const uitgangPcb = () => gaatjesprint(PRINTS.uitgang);
export const ingangPcb = () => gaatjesprint(PRINTS.ingang);
export const voedingPcb = () => gaatjesprint(PRINTS.voeding);
export const dragerPcb = () => gaatjesprint(PRINTS.drager);
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
  // de regelaar 12 -> 5 V onder de ESP en de pull-up van OE (opbouw.mjs, de pinrijen staan hierboven al)
  printStapel(at, 'eo', PRINTS.drager, { cx: xd, cz: d.cz }, null, { zonder: ['pinrij'] });
  for (const [i, b] of [[1, 6.2], [2, 19.5]]) at(`e${12 + i}`, `Micro-USB ${i === 1 ? 'UART' : 'USB'}<${i}>`, usb, [xe + P.x / 2 + 0.8, ye + P.pcb, d.cz + P.z / 2 - b]);
  for (const [i, b] of [[1, 7.7], [2, 18.1]]) {
    const [x, z] = [xe - P.x / 2 + 48.8, d.cz + P.z / 2 - b];
    at(`e${14 + i}`, `Drukknop ${i === 1 ? 'BOOT' : 'RESET'}<${i}>`, knop, [x, ye + P.pcb, z]);
    at(`e${16 + i}`, `Knopje ${i === 1 ? 'BOOT' : 'RESET'}<${i}>`, kn, [x, ye + P.pcb, z]);
  }
}
// ---------------------------------------------------------------- de onderdelen van de gaatjesprints (opbouw.mjs)
const cache3d = new Map(), eenmaal = (k, f) => { if (!cache3d.has(k)) cache3d.set(k, f()); return cache3d.get(k); };
const adapterDocs = () => eenmaal('adapter', () => {
  const v = deel('IC-voet DIP-8', ZWART);
  blokken(v, [[-1.3, 0, -1.3, 8.92, 4.2, 8.92, 0.3]], 'Voet');
  snede(v, 4.2, 1.5, [[1.0, 1.0, 6.62, 6.62]], 'Midden');
  const a = deel('Adapter DA-SOT23-3-X2 (print)', PCB_BLAUW);
  blokken(a, [[-2.225, 4.2, -2.54, 9.845, 5.8, 10.16, 0.3]], 'Print');
  const q = deel('2 x AO3400A (SOT-23)', ZWART);
  blokken(q, [[1.55, 5.8, 2.36, 2.85, 6.9, 5.26, 0.1], [4.77, 5.8, 2.36, 6.07, 6.9, 5.26, 0.1]], 'SOT-23');
  return [['voet', v.doc()], ['print', a.doc()], ['mosfets', q.doc()]];
});
const smdDoc = (soort, rot) => eenmaal(`${soort}${rot}`, () => {
  const [l, b, h] = soort === 'r1206' ? [3.2, 1.6, 0.6] : [4.5, 3.2, 0.9];
  const o = deel(soort === 'r1206' ? 'Weerstand 1206' : 'Polyfuse 1812', soort === 'r1206' ? ZWART : { name: 'epoxy, geel', density: 1900, color: '#e3b505' });
  blokken(o, [rot === 'v' ? [-b / 2, -h, -l / 2, b / 2, 0, l / 2] : [-l / 2, -h, -b / 2, l / 2, 0, b / 2]], 'Lichaam');
  return o.doc();
});
const bus = () => eenmaal('bus', () => {
  const B = PRINTS.uitgang.pca.bus, o = deel(`Afstandsbus M2,5 x ${B.h} rond Ø${B.d}`, { name: 'PA66, wit', density: 1140, color: '#e8e6dd' });
  cirkels(o, 0, B.h, [[0, 0, B.d / 2]], 'Bus');
  cirkels(o, B.h, B.h + 0.1, [[0, 0, 1.3]], 'Draad', 'cut');
  return o.doc();
});
const to220 = () => eenmaal('to220', () => {
  const q = deel('IRF4905 (TO-220, plat)', ZWART);
  blokken(q, [[3.0, 0, -2.54, 12.2, 4.5, 7.62, 0.3]], 'Lichaam');
  const t = deel('IRF4905 lip', METAAL);
  blokken(t, [[12.2, 0, -2.54, 19.5, 1.3, 7.62]], 'Lip');
  cirkels(t, 1.3, 1.4, [[16.3, 2.54, 1.8]], 'Gat', 'cut');
  const p = deel('IRF4905 pootjes', METAAL);
  blokken(p, [0, 1, 2].map((k) => [-0.4, 0, k * 2.54 - 0.25, 3.0, 0.5, k * 2.54 + 0.25]), 'Pootjes');
  return [['lichaam', met(q.doc(), rijOpschrift(1, 9.2, 9.2, 10.16, 4.5, [['IRF4905', 1.0]], { kerf: false }))], ['lip', t.doc()], ['pootjes', p.doc()]];
});

/** een gaatjesprint met alles erop zoals in opbouw.mjs; pre: de letter van de id's (u, i, v, e) */
function printStapel(at, pre, P, d, pcb, { zonder = [] } = {}) {
  const ox = d.cx - P.w / 2, oz = d.cz - P.h / 2, y = M.voet + 1.6;
  let n = 0;
  const id = () => `${pre}${++n}`, pos = (x, z, yy = y) => [ox + x, yy, oz + z];
  if (pcb) {
    at(id(), `${P.naam}<1>`, pcb, [d.cx, M.voet, d.cz]);
    schroeven(at, pre, P.schroeven.map(([x, z]) => pos(x, z)));
  }
  for (const v of vormen(P)) {
    const o = v.o, [gx, gz] = gatXY(P, o.c, o.r), nm = `${v.ref}${v.waarde ? ' ' + v.waarde : ''}`;
    if (zonder.includes(o.soort)) continue;
    if (o.soort === 'adapter') for (const [k, doc] of adapterDocs()) at(id(), `${o.naam} (${k})<${o.ref}>`, doc, pos(gx, gz));
    else if (o.soort === 'dip16') {
      const [body, poot] = eenmaal('dip16', () => dipRij('LTV-844 (DIP-16)', 1, 21, 19.8, 6.4, 3.5, 8));
      const b = eenmaal('dip16b', () => met(body, rijOpschrift(1, 21, 19.8, 6.4, 0.5 + 3.5, [['LTV-844', 1.1], ['2346  B', 0.75]], { kerf: false })));
      at(id(), `${nm}<${o.ref}>`, b, pos(gx + 3.5 * 2.54, gz + 3.81));
      at(id(), `${o.ref} pootjes<${o.ref}>`, poot, pos(gx + 3.5 * 2.54, gz + 3.81));
    } else if (o.soort === 'mpt' || o.soort === 'mkds') {
      const mkds = o.soort === 'mkds', st = mkds ? 5.08 : 2.54;
      const doc = eenmaal(`${o.soort}${o.n}`, () => klemstrook(mkds ? `Printklem MKDS 1,5/${o.n}-5,08` : `Printklem MPT 0,5/${o.n}-2,54`, o.n, st, mkds ? 7.6 : 6.2, mkds ? 10 : 8.5, mkds ? KLEM_GROEN : KLEM_BLAUW));
      at(id(), `Klem ${o.naam}<${o.naam}>`, doc, pos(gx + ((o.n - 1) * st) / 2, gz), draaiY(180));
    } else if (o.soort === 'to220plat') for (const [k, doc] of to220()) at(id(), `${nm} (${k})<${o.ref}>`, doc, pos(gx, gz));
    else if (o.soort === 'ato') {
      at(id(), `Printhouder steekzekering<${o.ref}>`, eenmaal('atoh', zekeringHouder), pos(gx + 5.08, gz));
      at(id(), `Steekzekering 7,5 A<${o.ref}>`, eenmaal('atoz', steekzekering), pos(gx + 5.08, gz));
    } else if (o.soort === 'elco') at(id(), `${nm}<${o.ref}>`, eenmaal('elco', () => elco()), pos(gx + 1.27, gz));
    else if (o.soort === 'pololu') {
      at(id(), `Pololu D24V10F5 (print)<${o.ref}>`, eenmaal('pol', pololu), pos(gx + 5.08, gz - 5.08, y + 2.5));
      at(id(), `Pololu spoel<${o.ref}>`, eenmaal('spoel', spoel), pos(gx + 7.08, gz - 5.08, y + 2.5));
      at(id(), `Pinrij Pololu<${o.ref}>`, eenmaal('polpin', () => pinStrip('Pinrij 5-polig (Pololu)', 5)), pos(gx + 5.08, gz));
    } else if (o.soort === 'r1206' || o.soort === 'ptc1812') {
      const rot = o.rot ?? 'h', [dx, dz] = rot === 'v' ? [0, 1.27] : [1.27, 0];
      at(id(), `${nm}<${o.ref}>`, smdDoc(o.soort, rot), pos(gx + dx, gz + dz, M.voet));
    }
  }
  return { id, pos };
}
function uitgangStapel(at, d) {
  const P = PRINTS.uitgang, { id, pos } = printStapel(at, 'u', P, d, uitgangPcb()), B = P.pca.bus, y = M.voet + 1.6;
  // de PCA9685 op 4 afstandsbussen boven de rechterhelft (de adapters A5 tot A8 eronder)
  P.boringen.forEach(([x, z]) => { const k = id(); at(k, `Afstandsbus M2,5 x ${B.h}<${k}>`, bus(), pos(x, z)); });
  const yp = y + B.h;
  at('p1', 'PCA9685 (print)<1>', pcaPrint(), pos(P.pca.cx, P.pca.cy, yp));
  at('p2', 'PCA9685 (chip)<1>', pcaChip(), pos(P.pca.cx, P.pca.cy, yp));
  schroeven(at, 'p', P.boringen.map(([x, z]) => pos(x, z, yp + M.pca.pcb)));
  // en van onderen in de bussen (de kop onder de print, tussen de print en de bodem)
  const doc = bolkopDoc();
  P.boringen.forEach(([x, z], i) => at(`pb${i + 1}`, `Plaatschroef 2,5 x 6 bolkop<pb${i + 1}>`, doc, pos(x, z, M.voet), [1, 0, 0, 0]));
}
const ingangStapel = (at, d) => printStapel(at, 'i', PRINTS.ingang, d, ingangPcb());
const voedingStapel = (at, d) => printStapel(at, 'v', PRINTS.voeding, d, voedingPcb());

export { espStapel, uitgangStapel, ingangStapel, voedingStapel, schroeven, espX, espY, espDragerX, dragerGaten, hoekGaten, draaiY };
