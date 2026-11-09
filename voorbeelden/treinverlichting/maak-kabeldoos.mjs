// Kabeldoos voor de verlichting van de modelbaan (versie 1, 2026-11-08), als Phlippo CAD-documenten.
//
// Eén doos met alles erin (keuze Ian: zo compact mogelijk, de bordjes in de doos, alles tot in detail getekend):
// - 16 Modelbouwled-bordjes "PCB met ingebouwde weerstand" (61,1 x 20,9, 14 hoog: gemeten door Ian), één per lichtgroep;
// - de ESP32-S3-DevKitC-1 v1.1 (maten uit de officiële maattekening van Espressif, docs/Maten-en-bronnen.md) op een
//   draagprint met vrouwelijke pinrijen, de USB-poorten tegen de rechterwand (flashen zonder de doos te openen);
// - een PWM-print PCA9685 (16 kanalen, I2C) en een uitgangsprint met 16 logic-level MOSFET's (IRLD024) die de min van
//   elk bordje schakelen;
// - een ingangsprint met 4 x PC847 (16 optocouplers) en 20 klemmen voor knoppen en sensoren;
// - een voedingsprint: 12 V in (wartel in de linkerwand), steekzekering 5 A, 6 polyfuses (een per rij bordjes) en de
//   regelaar 12 -> 5 V (Pololu D24V10F5) voor de ESP.
// Indeling (van boven gezien, +Z = voorkant): rij 1 tot 5 telkens 3 bordjes; rij 6: bordje 16, uitgangsprint, PCA9685;
// rij 7: voedingsprint, ingangsprint, ESP. Tussen de rijen 13 mm voor de draden (die komen van boven door sleuven in de
// bodem: de doos hangt ondersteboven onder de baan, het deksel is onderaan).
// Assenstelsel: oorsprong in het midden van de binnenkant van de bodem, Y omhoog (in de doos), X naar rechts.
// Alle geprinte delen passen op de Elegoo Centauri Carbon (256 x 256) en printen zonder support (PETG).
// Gebruik: node voorbeelden/treinverlichting/maak-kabeldoos.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Onderdeel, component, vlak } from '../lib/schets.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- maten (mm)
export const M = {
  // Modelbouwled "PCB met ingebouwde weerstand": print 61,1 x 20,9 x 1,6, hoogste punt 14 (Ian, 2026-11-08); 16 klemmen
  // per rij (steek 2,54) langs beide lange randen, aan elk uiteinde een 2-polige klem (steek 5,0) voor + en -.
  bordje: { x: 61.1, z: 20.9, pcb: 1.6, h: 14, klem: { steek: 2.54, n: 16, diep: 6.2, h: 8.5 }, eind: { steek: 5.0, diep: 7.6 } },
  // ESP32-S3-DevKitC-1 v1.1 (Espressif, DXF_ESP32-S3-DevKitC-1_V1.1_20220429): 62,74 x 25,40; 2 x 22 pinnen, steek 2,54,
  // 1,27 van de lange rand; laatste pin 8,00 van de rand bij de USB; module 18 x 25,5 x 3,1 met de antenne 6,4 voorbij de print
  esp: { x: 62.74, z: 25.4, pcb: 1.6, pin: { n: 22, steek: 2.54, rand: 1.27, eerste: 1.5 }, module: { x: 25.5, z: 18.1, h: 3.1, voorbij: 6.4, van: 3.83 } },
  // PCA9685-breakout (de gangbare 16-kanaalsprint): 62,5 x 25,4 volgens de verkopers (na te meten); zonder pinnen gebruikt:
  // de draden gesoldeerd in de gaten (laag blijven in de doos)
  pca: { x: 62.5, z: 25.4, pcb: 1.6 },
  // eigen gaatjesprints (raster 2,54)
  uitgang: { x: 68, z: 25.4 }, // de gaten blijven naast de klemstrook van 56
  ingang: { x: 80, z: 25.4 }, // klemstrook van 70
  voeding: { x: 61, z: 25.4 },
  drager: { x: 68, z: 27.94 }, // draagprint van de ESP: 2 x 22 vrouwelijke pinrijen (22,86 hart op hart), 2 schroeven tussen de rijen
  // de doos
  rij: { tussen: 12, kolom: 8, rand: 3, zij: 6 }, // zij: extra links en rechts, voor de schroefbussen van het deksel // ruimte tussen de rijen (draden), tussen de kolommen, tot de wand
  voet: 3, // alle prints liggen 3 mm boven de bodem (op paaltjes of richels)
  doos: { wand: 2.4, bodem: 2.4, h: 24, deksel: 2.4, r: 4, sleutelgat: { kop: 9.2, schacht: 4.6, slag: 6 }, sleuf: { b: 6, l: 40 }, invoer: { b: 8, diep: 11 },
    goot: { x: 8, dik: 1.2, h: 14, open: 10 } },
  // kader per rij bordjes: 2,2 rondom, tot 0,6 boven de print (onder de draadingangen van de klemmen); lip voor de draden
  kader: { rand: 2.2, speling: 0.3, h: 3 + 1.6 + 0.6, lip: { b: 1.6, h: 1.2 } },
};

// ---------------------------------------------------------------- materialen
const PETG = { name: 'PETG, zwart', density: 1270, color: '#2b2d31' };
const PETG_DEKSEL = { name: 'PETG, grijs', density: 1270, color: '#9aa0a6' };
const PCB_ROOD = { name: 'FR4, rode soldeermasker', density: 1850, color: '#c8202f' };
const PCB_ZWART = { name: 'FR4, zwart soldeermasker', density: 1850, color: '#1d1f22' };
const PCB_BLAUW = { name: 'FR4, blauw soldeermasker', density: 1850, color: '#1f4fa3' };
const PCB_BRUIN = { name: 'FR2, gaatjesprint', density: 1400, color: '#b98a4b' };
const KLEM_GROEN = { name: 'PA66, groen', density: 1140, color: '#2e9e4f' };
const KLEM_BLAUW = { name: 'PA66, blauw', density: 1140, color: '#2c6fd1' };
const ZWART = { name: 'epoxy, zwart (IC)', density: 1900, color: '#151617' };
const METAAL = { name: 'vertind staal', density: 7800, color: '#c9ccd1' };
const GOUD = { name: 'messing, verguld', density: 8500, color: '#d4af37' };
const WIT = { name: 'siliconen, wit', density: 1100, color: '#f2f2ee' };
const KOPER = { name: 'koper', density: 8900, color: '#c47a3c' };

// ---------------------------------------------------------------- hulpjes
let tel = 0;
const yv = (y, naam) => vlak(`y${++tel}`, naam ?? `Plane ${tel}`, [0, y, 0], [0, 1, 0], 'reference');
/** blokken (x0,y0,z0,x1,y1,z1) als boss op één onderdeel; mag uit losse lichamen bestaan (een rij pinnen) */
function blokken(o, lijst, naam) {
  // per hoogte één schets: alle rechthoeken met dezelfde y0 en hoogte samen
  const groepen = new Map();
  for (const [x0, y0, z0, x1, y1, z1, r = 0] of lijst) {
    const k = `${y0.toFixed(3)}|${(y1 - y0).toFixed(3)}`;
    if (!groepen.has(k)) groepen.set(k, []);
    groepen.get(k).push([x0, z0, x1, z1, r]);
  }
  for (const [k, rs] of groepen) {
    const [y0, h] = k.split('|').map(Number);
    o.schets(yv(y0, `Plane ${naam} ${y0}`), (s) => rs.forEach(([x0, z0, x1, z1, r]) => s.rrectW([x0, y0, z0], [x1, y0, z1], r)));
    o.extrude('boss', h, { naam: `${naam} ${o.features.length}` });
  }
  return o;
}
/** snede van rechthoeken van bovenaf (y = boven, diepte d) */
function snede(o, y, d, rs, naam) {
  o.schets(yv(y, `Plane ${naam}`), (s) => rs.forEach(([x0, z0, x1, z1, r = 0]) => s.rrectW([x0, y, z0], [x1, y, z1], r)));
  o.extrude('cut', d, { omkeren: true, naam });
  return o;
}
function cirkels(o, y, h, cs, naam, op = 'boss') {
  o.schets(yv(y, `Plane ${naam}`), (s) => cs.forEach(([x, z, r]) => s.cirkelW([x, y, z], r)));
  o.extrude(op, h, { omkeren: op === 'cut', naam });
  return o;
}
const deel = (naam, mat) => new Onderdeel(naam, mat);

// ---------------------------------------------------------------- het Modelbouwled-bordje (oorsprong: midden, onderkant print)
export function bordjePcb() {
  const B = M.bordje, o = deel('Modelbouwled PCB met weerstand (print)', PCB_ROOD);
  blokken(o, [[-B.x / 2, 0, -B.z / 2, B.x / 2, B.pcb, B.z / 2, 0.8]], 'Print');
  // 4 gaten in de hoeken (Ø2,2) zoals op de foto
  cirkels(o, B.pcb, B.pcb + 1, [[-B.x / 2 + 2.6, -B.z / 2 + 2.6, 1.1], [B.x / 2 - 2.6, -B.z / 2 + 2.6, 1.1], [-B.x / 2 + 2.6, B.z / 2 - 2.6, 1.1], [B.x / 2 - 2.6, B.z / 2 - 2.6, 1.1]], 'Gaten', 'cut');
  return o.doc();
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
  return o.doc();
}

// ---------------------------------------------------------------- ESP32-S3-DevKitC-1 v1.1 (oorsprong: midden van de print, onderkant print)
// lengte langs X: -X = antennekant, +X = USB-kant; z = breedte. Posities uit de maattekening (afgelezen, ± 0,3 mm).
const E = () => { const P = M.esp; return { P, x0: -P.x / 2, z0: -P.z / 2 }; };
/** van tekeningcoördinaten (a = vanaf de antennerand, b = vanaf de linkerrand op de tekening) naar print-x/z */
const ep = (a, b) => { const { x0, z0 } = E(); return [x0 + a, z0 + b]; };
export function espPrint() {
  const { P, x0, z0 } = E(), o = deel('ESP32-S3-DevKitC-1 (print)', PCB_ZWART);
  blokken(o, [[x0, 0, z0, -x0, P.pcb, -z0, 0.6]], 'Print');
  // 44 doorgemetalliseerde gaten Ø1,0 voor de pinnen
  const gaten = [];
  for (let i = 0; i < P.pin.n; i++) for (const b of [P.pin.rand, P.z - P.pin.rand]) { const [x, z] = ep(P.pin.eerste + i * P.pin.steek, b); gaten.push([x, z, 0.5]); }
  cirkels(o, P.pcb, P.pcb + 1, gaten, 'Pingaten', 'cut');
  return o.doc();
}
export function espModule() {
  const { P } = E(), o = deel('ESP32-S3-WROOM-1 (module-print)', PCB_ZWART), m = P.module;
  const [xa, za] = ep(-m.voorbij, m.van), xb = xa + m.x, zb = za + m.z;
  blokken(o, [[xa, P.pcb, za, xb, P.pcb + 0.8, zb, 0.3]], 'Modulepcb');
  return o.doc();
}
export function espKap() {
  const { P } = E(), o = deel('ESP32-S3-WROOM-1 (afschermkap)', METAAL), m = P.module;
  const [xa, za] = ep(-m.voorbij, m.van);
  // de kap bedekt de module behalve de antenne (6,4 + 0,4 mm aan de antennekant)
  blokken(o, [[xa + 7.2, P.pcb + 0.8, za + 0.5, xa + m.x - 0.5, P.pcb + m.h, za + m.z - 0.5, 0.4]], 'Kap');
  // ingeperst logo-vlak (0,05 diep) en de twee ronde uitwerpputjes
  snede(o, P.pcb + m.h, 0.08, [[xa + 10, za + 3, xa + 18, za + 15, 0.5]], 'Opschrift');
  return o.doc();
}
export function espAntenne() {
  const { P } = E(), o = deel('PCB-antenne (koperbaan)', GOUD), m = P.module;
  const [xa, za] = ep(-m.voorbij, m.van), y = P.pcb + 0.8;
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
  return o.doc();
}
export function pcaChip() {
  const P = M.pca, o = deel('PCA9685 (TSSOP-28)', ZWART);
  blokken(o, [[-4.85, P.pcb, -7.6, 4.85, P.pcb + 1.1, -3.2], [-0.6, P.pcb, -2.6, 0.6, P.pcb + 0.6, -1.6], [2.0, P.pcb, -2.6, 3.2, P.pcb + 0.6, -1.6]], 'Chip en weerstanden');
  return o.doc();
}

// ---------------------------------------------------------------- eigen gaatjesprints (oorsprong: midden, onderkant)
function gaatjesprint(naam, x, z) {
  const o = deel(naam, PCB_BRUIN);
  blokken(o, [[-x / 2, 0, -z / 2, x / 2, 1.6, z / 2, 0.5]], 'Print');
  // 4 gaten M2,5 in de hoeken
  cirkels(o, 1.6, 2.6, [[-x / 2 + 2.54, -z / 2 + 2.54, 1.35], [x / 2 - 2.54, -z / 2 + 2.54, 1.35], [-x / 2 + 2.54, z / 2 - 2.54, 1.35], [x / 2 - 2.54, z / 2 - 2.54, 1.35]], 'Bevestigingsgaten', 'cut');
  return o.doc();
}
export const uitgangPcb = () => gaatjesprint('Uitgangsprint (gaatjesprint)', M.uitgang.x, M.uitgang.z);
export const ingangPcb = () => gaatjesprint('Ingangsprint (gaatjesprint)', M.ingang.x, M.ingang.z);
export const voedingPcb = () => gaatjesprint('Voedingsprint (gaatjesprint)', M.voeding.x, M.voeding.z);
export function dragerPcb() {
  const o = deel('Draagprint ESP (gaatjesprint)', PCB_BRUIN), D = M.drager;
  blokken(o, [[-D.x / 2, 0, -D.z / 2, D.x / 2, 1.6, D.z / 2, 0.5]], 'Print');
  cirkels(o, 1.6, 2.6, [[-D.x / 2 + 3, 0, 1.35], [D.x / 2 - 3, 0, 1.35]], 'Bevestigingsgaten', 'cut');
  return o.doc();
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
  return o.doc();
}
/** Pololu D24V10F5 (17,8 x 12,7) met de spoel en de pinrij */
export function pololu() {
  const o = deel('Pololu D24V10F5 (print)', { name: 'FR4, groen', density: 1850, color: '#1f6b3a' });
  blokken(o, [[-8.9, 0, -6.35, 8.9, 1.0, 6.35, 0.4]], 'Print');
  return o.doc();
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

// ---------------------------------------------------------------- de doos
/** indeling: per rij de onderdelen met hun x-midden, z-midden, breedte (x) en diepte (z) */
export function indeling() {
  const { bordje: B, rij: R } = M;
  const rijen = [];
  const breed = (xs) => xs.reduce((a, b) => a + b, 0) + (xs.length - 1) * R.kolom;
  const plaats = (soorten) => { const ws = soorten.map((s) => s.x); let x = -breed(ws) / 2; return soorten.map((s) => { const c = x + s.x / 2; x += s.x + R.kolom; return { ...s, cx: c }; }); };
  const b = (nr) => ({ soort: 'bordje', nr, x: B.x, z: B.z });
  let nr = 1;
  for (let r = 0; r < 5; r++) rijen.push(plaats([b(nr++), b(nr++), b(nr++)]));
  rijen.push(plaats([b(nr++), { soort: 'uitgang', x: M.uitgang.x, z: M.uitgang.z }, { soort: 'pca', x: M.pca.x, z: M.pca.z }]));
  // de ESP met haar antenne (6,4 voorbij de print) en de draagprint: plaats op de breedste van beide
  rijen.push(plaats([{ soort: 'voeding', x: M.voeding.x, z: M.voeding.z }, { soort: 'ingang', x: M.ingang.x, z: M.ingang.z }, { soort: 'esp', x: Math.max(M.esp.x + M.esp.module.voorbij, M.drager.x), z: M.drager.z }]));
  const diep = rijen.map((rij) => Math.max(...rij.map((d) => d.z)));
  const binnenZ = diep.reduce((a, b) => a + b, 0) + (rijen.length - 1) * R.tussen + 2 * R.rand;
  const binnenX = Math.max(...rijen.map((rij) => breed(rij.map((d) => d.x)))) + 2 * (R.rand + R.zij);
  let z = -binnenZ / 2 + R.rand;
  rijen.forEach((rij, i) => { const cz = z + diep[i] / 2; rij.forEach((d) => { d.cz = cz; }); z += diep[i] + R.tussen; });
  return { rijen, diep, binnenX, binnenZ };
}
/** de bak (rechtop geprint: de bodem op het bed, de open kant naar boven): bodem, wanden, paaltjes, klemlipjes, sleuven */
export function bak() {
  const D = M.doos, { rijen, binnenX: bx, binnenZ: bz } = indeling(), w = D.wand;
  const o = deel('Kabeldoos (bak)', PETG);
  const X = bx / 2 + w, Z = bz / 2 + w;
  // bodem en wanden
  o.schets(yv(-D.bodem, 'Plane onderkant bodem'), (s) => s.rrectW([-X, 0, -Z], [X, 0, Z], D.r));
  o.extrude('boss', D.bodem + D.h, { naam: 'Blok' });
  o.schets(yv(D.h, 'Plane bovenrand'), (s) => s.rrectW([-bx / 2, 0, -bz / 2], [bx / 2, 0, bz / 2], Math.max(D.r - w, 0.6)));
  o.extrude('cut', D.h, { omkeren: true, naam: 'Binnenruimte' });
  // bevestiging onder de baan met 4 sleutelgaten (keuze Ian: monteren met alle prints erin): 4 bolkopschroeven 4 x 20 half in
  // de baan draaien, de doos met de grote gaten over de koppen hangen en 6 mm naar links schuiven (de schroeven komen rechts in de sleuf). De gaten liggen in de
  // draadgangen tegen de zijwanden, buiten de draadsleuven: daar zit geen print boven
  const SG = D.sleutelgat;
  const sleutel = bevestigingsGaten(rijen, bx);
  o.schets(yv(0.01, 'Plane sleutelgaten'), (s) => sleutel.forEach(([x, z]) => {
    s.cirkelW([x, 0, z], SG.kop / 2);
  }));
  o.extrude('cut', D.bodem + 1, { omkeren: true, naam: 'Sleutelgaten (kop)' });
  o.schets(yv(0.01, 'Plane sleutelgaten sleuf'), (s) => sleutel.forEach(([x, z]) => s.rrectW([x, 0, z - SG.schacht / 2], [x + SG.slag + SG.schacht / 2, 0, z + SG.schacht / 2], SG.schacht / 2 - 0.01)));
  o.extrude('cut', D.bodem + 1, { omkeren: true, naam: 'Sleutelgaten (sleuf)' });
  // de bordjes: per rij één kader (een plaat met een uitsparing per bordje, 0,3 mm speling) en één steunrail eronder; zo
  // ligt elk bordje vast in X en Z. Omdat de doos ondersteboven hangt, houden ribben aan het deksel de bordjes op hun
  // plaats (op de eindklemmen). Eén kader per rij in plaats van 4 paaltjes per bordje: veel lichter om te rekenen.
  const schroefpalen = [];
  for (const rij of rijen) for (const d of rij) {
    if (d.soort === 'bordje') continue;
    const b = { uitgang: M.uitgang, ingang: M.ingang, voeding: M.voeding, pca: M.pca, esp: M.drager }[d.soort];
    const off = d.soort === 'pca' ? [[-28, -9.5], [28, -9.5], [-28, 9.5], [28, 9.5]] : d.soort === 'esp' ? dragerGaten() : [[-b.x / 2 + 2.54, -b.z / 2 + 2.54], [b.x / 2 - 2.54, -b.z / 2 + 2.54], [-b.x / 2 + 2.54, b.z / 2 - 2.54], [b.x / 2 - 2.54, b.z / 2 - 2.54]];
    const cx = d.soort === 'esp' ? espDragerX(d) : d.cx;
    off.forEach(([ox, oz]) => schroefpalen.push([cx + ox, d.cz + oz]));
  }
  const kaders = rijKaders(rijen), KD = M.kader;
  o.schets(yv(-0.5, 'Plane kaders bordjes'), (s) => kaders.forEach((k) => { s.rrectW([k.x0, 0, k.z0], [k.x1, 0, k.z1], 1.5); k.gaten.forEach(([x0, z0, x1, z1]) => s.rrectW([x0, 0, z0], [x1, 0, z1], 1)); }));
  o.extrude('boss', KD.h + 0.5, { naam: 'Kaders bordjes' });
  o.schets(yv(-0.5, 'Plane steunrails'), (s) => kaders.forEach((k) => s.rrectW([k.x0 + 1, 0, k.cz - 3], [k.x1 - 1, 0, k.cz + 3], 1)));
  o.extrude('boss', M.voet + 0.5, { naam: 'Steunrails' });
  // kabellip: rond elk kader 1,6 mm overhang naar de draadgang, op 4 mm hoogte: de draden schuif je eronder
  o.schets(yv(KD.h - KD.lip.h, 'Plane kabellippen'), (s) => kaders.forEach((k) => { s.rrectW([k.x0 - KD.lip.b, 0, k.z0 - KD.lip.b], [k.x1 + KD.lip.b, 0, k.z1 + KD.lip.b], 2.5); s.rrectW([k.x0 + 0.4, 0, k.z0 + 0.4], [k.x1 - 0.4, 0, k.z1 - 0.4], 1.2); }));
  o.extrude('boss', KD.lip.h, { naam: 'Kabellippen' });
  // schroefpaaltjes Ø6 met een gat Ø2,2 (M2,5 zelftappend in PETG)
  cirkels(o, -0.5, M.voet + 0.5, schroefpalen.map(([x, z]) => [x, z, 3]), 'Schroefpaaltjes');
  // schroefbussen voor het deksel (6 stuks: hoeken en midden van de lange wanden), Ø8 tot 1 mm onder de rand, gat Ø2,6
  const bussen = dekselBussen(bx, bz);
  cirkels(o, -0.5, D.h + 0.5, bussen.map(([x, z]) => [x, z, 4]), 'Schroefbussen');
  // alle schroefgaten in één snede van boven: Ø2,2 in de printpaaltjes (M2,5 zelftappend), Ø2,6 in de dekselbussen; tot
  // 0,4 mm boven de onderkant van de bodem (boven de paaltjes is het lucht)
  cirkels(o, D.h, D.h + D.bodem - 0.4, [...schroefpalen.map(([x, z]) => [x, z, 1.1]), ...bussen.map(([x, z]) => [x, z, 1.3])], 'Schroefgaten', 'cut');
  // draadsleuven in de bodem: tussen de rijen, per kolom één (de draden komen van de baan naar beneden)
  const sl = [];
  const { rijen: rs } = indeling();
  for (let i = 0; i < rs.length - 1; i++) {
    const zm = (rs[i][0].cz + M.bordje.z / 2 + rs[i + 1][0].cz - Math.max(...rs[i + 1].map((d) => d.z)) / 2) / 2;
    for (const d of rs[i]) sl.push([d.cx - D.sleuf.l / 2, zm - D.sleuf.b / 2, d.cx + D.sleuf.l / 2, zm + D.sleuf.b / 2, D.sleuf.b / 2 - 0.01]);
  }
  // sleuven langs de achterwand voor rij 1
  for (const d of rs[0]) sl.push([d.cx - D.sleuf.l / 2, -bz / 2 + 0.6, d.cx + D.sleuf.l / 2, -bz / 2 + 0.6 + D.sleuf.b, D.sleuf.b / 2 - 0.01]);
  snede(o, 0.01, D.bodem + 1, sl, 'Draadsleuven');
  // wartel M12 in de linkerwand (bij de voedingsprint) en de opening voor de USB van de ESP in de rechterwand
  const vp = rs[6][0], ep = rs[6][2];
  o.schets(vlak('wl', 'Plane linkerwand', [-X, 0, 0], [-1, 0, 0], 'reference'), (s) => s.cirkelW([-X, wartelY(), vp.cz], 6.1));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Gat wartel M12' });
  // kabels ordenen (Ian: geen rommel in de doos)
  // - kabelgoten langs de linker- en rechterwand (rij 1 tot 6): een tussenwand op 8 mm van de wand, met een opening bij elke
  //   draadgang; de draden van de uitgangs- en voedingsprint lopen erin naar de bordjes
  // - de kabellippen langs de kaders van de bordjes (hierboven): de leddraden liggen eronder in de draadgang
  // - kabelbinderspleten bij elke kabelinvoer in de zijwanden (trekontlasting)
  const G = D.goot;
  const zTop = rs[0][0].cz - Math.max(...rs[0].map((d) => d.z)) / 2 - M.rij.rand + 0.5, zOnder = rs[5][0].cz + Math.max(...rs[5].map((d) => d.z)) / 2 + M.rij.tussen / 2;
  const gangen = rs.slice(0, 6).map((_, i) => gang(rs, i)).filter((z) => z < zOnder);
  const gootStukken = [];
  let z0 = zTop;
  for (const z of [...gangen, zOnder + G.open / 2]) { if (z - G.open / 2 > z0 + 1) gootStukken.push([z0, z - G.open / 2]); z0 = z + G.open / 2; }
  o.schets(yv(-0.5, 'Plane kabelgoten'), (s) => gootStukken.forEach(([za, zb]) => [-1, 1].forEach((k) => {
    const xw = k * (bx / 2 - G.x);
    s.rrectW([Math.min(xw, xw - k * G.dik), 0, za], [Math.max(xw, xw - k * G.dik), 0, zb]);
  })));
  o.extrude('boss', G.h + 0.5, { naam: 'Kabelgoten' });
  // kabelbinders: per kabelinvoer in de zijwanden twee spleten (1,8 x 3) in de wand van de kabelgoot, naast de opening
  const Kv = kabelInvoer(rs, bx, bz);
  for (const k of [-1, 1]) {
    const xw = k * (bx / 2 - G.x);
    o.schets(vlak(`kb${k > 0 ? 'r' : 'l'}`, `Plane binderspleten ${k > 0 ? 'rechts' : 'links'}`, [xw - k * G.dik - k * 0.5, 0, 0], [k, 0, 0], 'reference'), (s) => Kv.zijkant.forEach((z) => {
      for (const dz of [G.open / 2 + 2, G.open / 2 + 8]) s.rrectW([xw, 2, z + dz - 0.9], [xw, 5, z + dz + 0.9], 0.4);
    }));
    o.extrude('cut', G.dik + 1, { naam: `Binderspleten ${k > 0 ? 'rechts' : 'links'}` });
  }
  // kabelinvoer langs de zijkanten (Ian): open aan de kant van het deksel
  const K = kabelInvoer(rs, bx, bz), yb = D.h - K.diep;
  o.schets(vlak('kl', 'Plane kabelinvoer links', [-X, 0, 0], [-1, 0, 0], 'reference'), (s) => K.zijkant.forEach((z) => s.rrectW([-X, yb, z - K.b / 2], [-X, D.h + 2, z + K.b / 2], K.b / 2 - 0.01)));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Kabelinvoer links' });
  o.schets(vlak('kr', 'Plane kabelinvoer rechts', [X, 0, 0], [1, 0, 0], 'reference'), (s) => K.zijkant.forEach((z) => s.rrectW([X, yb, z - K.b / 2], [X, D.h + 2, z + K.b / 2], K.b / 2 - 0.01)));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Kabelinvoer rechts' });
  o.schets(vlak('ka', 'Plane kabelinvoer achter', [0, 0, -Z], [0, 0, -1], 'reference'), (s) => K.achter.forEach((x) => s.rrectW([x - K.b / 2, yb, -Z], [x + K.b / 2, D.h + 2, -Z], K.b / 2 - 0.01)));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Kabelinvoer achter' });
  o.schets(vlak('kv', 'Plane kabelinvoer voor', [0, 0, Z], [0, 0, 1], 'reference'), (s) => K.voor.forEach((x) => s.rrectW([x - K.b / 2, yb, Z], [x + K.b / 2, D.h + 2, Z], K.b / 2 - 0.01)));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Kabelinvoer voor' });
  const u = usbOpening(ep);
  o.schets(vlak('wr', 'Plane rechterwand', [X, 0, 0], [1, 0, 0], 'reference'), (s) => s.rrectW([X, u.y0, u.z0], [X, u.y1, u.z1], 1));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Opening USB' });
  // volgorde: eerst alles met rechte vlakken, de ronde paaltjes, bussen en gaten op het einde. Elke bewerking kost meer
  // naarmate het lichaam meer driehoeken heeft; zo blijft de rebuild ruim binnen het budget van de app
  // volgorde: eerst de sneden in de wanden en de bodem terwijl de bak nog eenvoudig is, dan de binnenkant, de ronde delen en
  // tot slot alle schroefgaten in één keer. Elke bewerking kost meer naarmate het lichaam meer driehoeken heeft (de
  // mesh-kernel); zo blijft de rebuild binnen het budget van de app
  const VOLGORDE = ['Blok', 'Binnenruimte', 'Kabelinvoer links', 'Kabelinvoer rechts', 'Kabelinvoer achter', 'Kabelinvoer voor', 'Opening USB',
    'Gat wartel M12', 'Sleutelgaten (kop)', 'Sleutelgaten (sleuf)', 'Kabelgoten', 'Binderspleten links', 'Binderspleten rechts', 'Draadsleuven',
    'Kaders bordjes', 'Steunrails', 'Kabellippen', 'Schroefpaaltjes', 'Schroefbussen', 'Schroefgaten'];
  const paren = [];
  for (let i = 0; i < o.features.length; i += 2) paren.push(o.features.slice(i, i + 2));
  const plaats = (f) => { const k = VOLGORDE.indexOf(f.name); if (k < 0) throw new Error(`volgorde: ${f.name} ontbreekt`); return k; };
  o.features = paren.sort((a, b) => plaats(a[1]) - plaats(b[1])).flat();
  return o.doc();
}
const wartelY = () => 10;
/** per rij met bordjes het kader: buitenmaat rond de bordjes en een gat per bordje */
function rijKaders(rijen) {
  const B = M.bordje, K = M.kader, uit = [];
  for (const rij of rijen) {
    const bs = rij.filter((d) => d.soort === 'bordje');
    if (!bs.length) continue;
    const cz = bs[0].cz;
    uit.push({ cz, x0: Math.min(...bs.map((d) => d.cx)) - B.x / 2 - K.rand, x1: Math.max(...bs.map((d) => d.cx)) + B.x / 2 + K.rand,
      z0: cz - B.z / 2 - K.rand, z1: cz + B.z / 2 + K.rand,
      gaten: bs.map((d) => [d.cx - B.x / 2 - K.speling, cz - B.z / 2 - K.speling, d.cx + B.x / 2 + K.speling, cz + B.z / 2 + K.speling]), bordjes: bs });
  }
  return uit;
}
/** het midden van de draadgang tussen rij i en i + 1 (z) */
const gang = (rijen, i) => (rijen[i][0].cz + Math.max(...rijen[i].map((d) => d.z)) / 2 + rijen[i + 1][0].cz - Math.max(...rijen[i + 1].map((d) => d.z)) / 2) / 2;
/** 4 sleutelgaten (het grote gat): in de draadgang tussen rij 1 en 2 en tussen rij 5 en 6; links 12 mm van de wand, rechts
 *  18 mm, zodat na het schuiven (+6 mm) de schroef links op 18 en rechts op 12 mm van de wand zit, naast de draadsleuven */
export function bevestigingsGaten(rijen, bx) {
  return [0, 4].flatMap((i) => [[-bx / 2 + 12, gang(rijen, i)], [bx / 2 - 18, gang(rijen, i)]]);
}
/** kabelinvoer in de wanden: uitsparingen van 8 breed en 11 diep vanaf de rand (de kant van het deksel): je legt de draden
 *  erin en het deksel sluit ze af. Links en rechts bij elke draadgang, achter tussen de kolommen, voor de ingangsprint */
function kabelInvoer(rijen, bx, bz) {
  const D = M.doos, bussen = dekselBussen(bx, bz), vrij = (x, z) => bussen.every(([bx2, bz2]) => Math.hypot(bx2 - x, bz2 - z) > 9);
  const zijkant = [];
  for (let i = 0; i < rijen.length - 1; i++) { const z = gang(rijen, i); if (vrij(-bx / 2, z)) zijkant.push(z); }
  const achter = [-1.5, -0.5, 0.5, 1.5].map((k) => k * (M.bordje.x + M.rij.kolom) / 1.0).filter((x) => Math.abs(x) < bx / 2 - 10 && vrij(x, -bz / 2));
  const ing = rijen[6].find((d) => d.soort === 'ingang');
  const voor = [-24, -8, 8, 24].map((dx) => ing.cx + dx);
  return { zijkant, achter, voor, b: D.invoer.b, diep: D.invoer.diep };
}
/** de x van de draagprint: rechts in de rij, de USB-kant van de ESP 1 mm van de rechterwand */
const espDragerX = (d) => espX(d) - M.esp.x / 2 + M.esp.pin.eerste + ((M.esp.pin.n - 1) * M.esp.pin.steek) / 2;
/** de 2 schroeven van de draagprint (tussen de pinrijen, aan de uiteinden) */
const dragerGaten = () => [[-M.drager.x / 2 + 3, 0], [M.drager.x / 2 - 3, 0]];
/** de x van het midden van de ESP-print: de USB-kant (rand + 0,8 uitsteek) tot 1 mm van de binnenwand */
const espX = (d) => d.cx + d.x / 2 - 1.8 - M.esp.x / 2;
const espY = () => M.voet + 1.6 + 8.5 + 2.5; // onderkant van de ESP-print: draagprint, vrouwelijke pinrij 8,5, plastic van de pinnen 2,5
function usbOpening(d) {
  const y = espY() + M.esp.pcb;
  return { y0: y - 2.5, y1: y + 6.5, z0: d.cz - M.esp.z / 2 + 0.5, z1: d.cz + M.esp.z / 2 - 0.5 }; // ruim genoeg voor de stekker (11 x 7)
}
function dekselBussen(bx, bz) {
  const x = bx / 2 - 3, z = bz / 2 - 3;
  return [[-x, -z], [x, -z], [-x, z], [x, z], [-x, 0], [x, 0]];
}
/** het deksel (plat geprint): plaat met een rand die 1,5 mm in de bak valt, 6 verzonken gaten, opschrift */
export function deksel() {
  const D = M.doos, { binnenX: bx, binnenZ: bz } = indeling(), w = D.wand;
  const X = bx / 2 + w, Z = bz / 2 + w, o = deel('Kabeldoos (deksel)', PETG_DEKSEL), y0 = D.h;
  o.schets(yv(y0, 'Plane deksel'), (s) => s.rrectW([-X, 0, -Z], [X, 0, Z], D.r));
  o.extrude('boss', D.deksel, { naam: 'Plaat' });
  o.schets(yv(y0 + 0.05, 'Plane rand'), (s) => { s.rrectW([-bx / 2 + 0.3, 0, -bz / 2 + 0.3], [bx / 2 - 0.3, 0, bz / 2 - 0.3], 1.6); s.rrectW([-bx / 2 + 2.3, 0, -bz / 2 + 2.3], [bx / 2 - 2.3, 0, bz / 2 - 2.3], 0.6); });
  o.extrude('boss', 1.55, { omkeren: true, naam: 'Centreerrand' });
  // drukribben: per kolom bordjes een rib (4 breed) boven de eindklemmen, tot 0,3 mm boven de klemmen: de doos hangt
  // ondersteboven, het deksel houdt de bordjes in hun kader
  const { rijen } = indeling(), B = M.bordje, ribX = new Map();
  for (const rij of rijen) for (const d of rij) if (d.soort === 'bordje') for (const k of [-1, 1]) {
    const x = Math.round((d.cx + k * (B.x / 2 - 0.2 - B.eind.diep / 2)) * 100) / 100;
    if (!ribX.has(x)) ribX.set(x, [d.cz, d.cz]);
    const r = ribX.get(x); r[0] = Math.min(r[0], d.cz); r[1] = Math.max(r[1], d.cz);
  }
  const yr = M.voet + B.h + 0.3;
  o.schets(yv(y0 + 0.05, 'Plane drukribben'), (s) => [...ribX].forEach(([x, [za, zb]]) => s.rrectW([x - 2, 0, za - 5], [x + 2, 0, zb + 5], 1)));
  o.extrude('boss', y0 + 0.05 - yr, { omkeren: true, naam: 'Drukribben' });
  const bussen = dekselBussen(bx, bz);
  // de rand rond de bussen weg (de bussen staan tegen de wand)
  snede(o, y0 + 0.05, 1.6, bussen.map(([x, z]) => [x - 4.6, z - 4.6, x + 4.6, z + 4.6, 4.6]), 'Ruimte bussen');
  cirkels(o, y0 + D.deksel, D.deksel + 1, bussen.map(([x, z]) => [x, z, 1.6]), 'Gaten', 'cut');
  o.schets(yv(y0 + D.deksel, 'Plane verzinking'), (s) => bussen.forEach(([x, z]) => s.cirkelW([x, 0, z], 3.1)));
  o.extrude('cut', 1.5, { omkeren: true, naam: 'Verzinking', draft: 45 });
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
  for (const [i, b] of [[1, 6.2], [2, 19.5]]) at(`e${12 + i}`, `Micro-USB ${i === 1 ? 'UART' : 'USB'}<${i}>`, usb, [xe + P.x / 2 + 0.8, ye + P.pcb, d.cz - P.z / 2 + b]);
  for (const [i, b] of [[1, 7.7], [2, 18.1]]) {
    const [x, z] = [xe - P.x / 2 + 48.8, d.cz - P.z / 2 + b];
    at(`e${14 + i}`, `Drukknop ${i === 1 ? 'BOOT' : 'RESET'}<${i}>`, knop, [x, ye + P.pcb, z]);
    at(`e${16 + i}`, `Knopje ${i === 1 ? 'BOOT' : 'RESET'}<${i}>`, kn, [x, ye + P.pcb, z]);
  }
}
function uitgangStapel(at, d) {
  const U = M.uitgang, y = M.voet + 1.6;
  at('u0', 'Uitgangsprint<1>', uitgangPcb(), [d.cx, M.voet, d.cz]);
  schroeven(at, 'u', hoekGaten(U).map(([x, z]) => [d.cx + x, y, d.cz + z]));
  const [mos, poot] = dipRij('8 x IRLD024 (MOSFET)', 8, 6.35, 6.0, 4.8, 3.3, 2);
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
  const [opto, poot] = dipRij('2 x PC847 (4 optocouplers)', 2, 21, 19.8, 6.4, 3.5, 8);
  const [net, npoot] = dipRij('Weerstandsnetwerk DIP-16 2,2 kΩ (8 x)', 1, 21, 19.8, 6.4, 3.0, 8);
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
  at('v6', 'Pinrij Pololu<1>', pinStrip('Pinrij 5-polig (Pololu)', 5), [x0 + 46, y, d.cz - 5.4]);
  at('v7', '6 polyfuses<1>', polyfuseRij(6, 6.2), [x0 + 37, y - 3, d.cz + 3.4]);
  at('v8', 'Klemstrook 8-polig 3,5 (+12 V rijen en 0 V)<1>', klemstrook('Klemstrook 8-polig 3,5', 8, 3.5, 7, 8.5, KLEM_BLAUW), [x0 + 40, y, d.cz + V.z / 2 - 3.6], draaiY(180));
  at('v9', 'Elco 470 µF / 25 V<1>', elco(), [x0 + 14, y, d.cz + 6.5]);
}
export function kabeldoos() {
  const { rijen } = indeling(), comps = [];
  const at = (id, naam, doc, p, rot) => comps.push(component(id, naam, doc, p, rot ? { rotation: rot } : {}));
  at('d1', 'Kabeldoos (bak)<1>', bak(), [0, 0, 0]);
  at('d2', 'Kabeldoos (deksel)<1>', deksel(), [0, 0, 0]);
  // de 16 bordjes: print, 2 klemstroken van 16 (draadingang naar buiten), 2 eindklemmen (5,0, 2-polig), 16 weerstanden
  const B = M.bordje, pcb = bordjePcb(), strook = klemstrook('Klemstrook 16-polig 2,54', B.klem.n, B.klem.steek, B.klem.diep, B.klem.h);
  const eind = klemstrook('Klem 2-polig 5,0', 2, B.eind.steek, B.eind.diep, B.h - B.pcb), smd = smdRij('16 SMD-weerstanden 0805', 16, 2.54);
  const draai = (deg) => { const a = (deg * Math.PI) / 360; return [0, Math.sin(a), 0, Math.cos(a)]; };
  let n = 0;
  for (const rij of rijen) for (const d of rij) {
    const y = M.voet;
    if (d.soort === 'bordje') {
      n++;
      at(`b${n}`, `Bordje ${n} (print)<${n}>`, pcb, [d.cx, y, d.cz]);
      at(`b${n}k1`, `Bordje ${n} klemstrook achter<${n}>`, strook, [d.cx, y + B.pcb, d.cz - B.z / 2 + B.klem.diep / 2 + 0.2]);
      at(`b${n}k2`, `Bordje ${n} klemstrook voor<${n}>`, strook, [d.cx, y + B.pcb, d.cz + B.z / 2 - B.klem.diep / 2 - 0.2], draai(180));
      at(`b${n}e1`, `Bordje ${n} klem links<${n}>`, eind, [d.cx - B.x / 2 + B.eind.diep / 2 + 0.2, y + B.pcb, d.cz], draai(90));
      at(`b${n}e2`, `Bordje ${n} klem rechts<${n}>`, eind, [d.cx + B.x / 2 - B.eind.diep / 2 - 0.2, y + B.pcb, d.cz], draai(-90));
      at(`b${n}r`, `Bordje ${n} weerstanden<${n}>`, smd, [d.cx, y + B.pcb, d.cz]);
    }
    else if (d.soort === 'esp') espStapel(at, d);
    else if (d.soort === 'pca') {
      at('p1', 'PCA9685 (print)<1>', pcaPrint(), [d.cx, M.voet, d.cz]);
      at('p2', 'PCA9685 (chip)<1>', pcaChip(), [d.cx, M.voet, d.cz]);
      schroeven(at, 'p', [[-28, -9.5], [28, -9.5], [-28, 9.5], [28, 9.5]].map(([x, z]) => [d.cx + x, M.voet + M.pca.pcb, d.cz + z]));
    } else if (d.soort === 'uitgang') uitgangStapel(at, d);
    else if (d.soort === 'ingang') ingangStapel(at, d);
    else if (d.soort === 'voeding') voedingStapel(at, d);
  }
  // de wartel M12 in de linkerwand, de schroeven van het deksel en de bevestiging onder de baan
  const { binnenX: bx, binnenZ: bz } = indeling(), X = bx / 2 + M.doos.wand;
  at('w1', 'Wartel M12 x 1,5<1>', wartel(), [-X, wartelY(), rijen[6][0].cz], draai(180));
  const kop3 = schroefVerzonken('Plaatschroef 3 x 12 verzonken', 3, 2.4, 12);
  dekselBussen(bx, bz).forEach(([x, z], i) => at(`sd${i + 1}`, `Plaatschroef 3 x 12 verzonken<${i + 1}>`, kop3, [x, M.doos.h + M.doos.deksel, z]));
  // de 4 bolkopschroeven 4 x 20 in de sleutelgaten, in de vergrendelde stand (aan het eind van de sleuf): de kop ligt op de bodem
  const hout = bolkopSchroef('Bolkopschroef 4 x 20 (hout)', 4, 8, 2.8, 20);
  bevestigingsGaten(rijen, bx).forEach(([x, z], i) => at(`sv${i + 1}`, `Bolkopschroef 4 x 20<${i + 1}>`, hout, [x + M.doos.sleutelgat.slag, 0, z]));
  return { format: 'phlippo-cad', version: 1, name: 'Kabeldoos treinverlichting', units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components: comps, mates: [] };
}

export const ONDERDELEN = {
  'Kabeldoos-bak.kcad': bak,
  'Kabeldoos-deksel.kcad': deksel,
  'Bordje-PCB.kcad': bordjePcb,
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(HERE, { recursive: true });
  const schrijf = (naam, doc) => writeFileSync(join(HERE, naam), JSON.stringify(doc, null, 1) + '\n');
  for (const [naam, f] of Object.entries(ONDERDELEN)) schrijf(naam, f());
  schrijf('Kabeldoos.kcad', kabeldoos());
  const { binnenX, binnenZ } = indeling();
  console.log(`geschreven; binnenmaat ${binnenX.toFixed(1)} x ${binnenZ.toFixed(1)}, buiten ${(binnenX + 2 * M.doos.wand).toFixed(1)} x ${(binnenZ + 2 * M.doos.wand).toFixed(1)} x ${(M.doos.bodem + M.doos.h + M.doos.deksel).toFixed(1)}`);
}
