// Geluidskastje voor de modelbaan (treinverlichting versie 6), als Phlippo CAD-documenten: een kleine bak met deksel voor
// een ESP32-S3-Zero, een MAX98357A-versterker, een 5 V-regelaar (MP1584EN) en een luidspreker van 40 mm.
// Ian (2026-11-15): "Geluiden: dit moeten kleine speakertjes zijn die ik ergens kan plaatsen."
//
// - Links de luidspreker in een ring (Ø37 binnen, de flens rust erop): achter de luidspreker een gesloten ruimte van
//   20 cm³ (beter geluid dan open); het rooster zit in het deksel, een foamring van 1 mm tussen flens en deksel.
// - Rechts de 3 printjes op steunrails, elk vastgezet met schroefpaaltjes: de printjes hebben geen gaten, dus een
//   plaatschroef 2,2 x 4,5 met een brede sluitring (DIN 9021, Ø8) naast de rand klemt de print (1 paaltje tussen de
//   regelaar en de versterker klemt ze allebei). De USB-C van de ESP in een opening in de rechterwand (flashen met het
//   deksel dicht), de DC-bus 5,5 x 2,1 (12 V) in de achterwand.
// - 2 oogjes (Ø4,2) aan de korte kanten om het kastje vast te schroeven, 4 schroeven 2,9 x 9,5 in het deksel.
// - Alles print zonder support in PETG: de bak rechtop (bodem op het bed: alleen staande wanden, de opening van de USB
//   met 45°-schuine bovenhoeken en een brug van 8,5, het gat van de DC-bus als druppel met een 45°-punt), het deksel plat
//   met de buitenkant op het bed. Wand 2,0, bodem 2,4, deksel 2,0.
// Assenstelsel: oorsprong in het midden van de binnenkant van de bodem, Y omhoog, X naar rechts, +Z = voorkant.
// Gebruik: node voorbeelden/treinverlichting/geluidskastje/maak-kastje.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { component, vlak } from '../../lib/schets.mjs';
import { yv, xv, zv, deel, blokken, snede, cirkels, veelhoeken, hoekRechthoek, PETG, PETG_DEKSEL, PCB_ZWART, PCB_BLAUW, KLEM_GROEN, ZWART, METAAL, GOUD } from '../hulp.mjs';
import { bolkopSchroef } from '../onderdelen.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- maten (mm); bronnen: README.md, "Onderdelen"
export const K = {
  wand: 2.0, bodem: 2.4, deksel: 2.0, r: 3, // buitenhoeken R3
  binnen: { x: 93.4, z: 47.0, h: 22.0 },
  // luidspreker 40 mm 4 ohm 3 W (Adafruit 3968: Ø40 x 20). Flens 2 dik en lijf Ø34: AANNAME (na te meten)
  speaker: { d: 40, h: 20, flens: 2, lijf: 34, u: 21.6, w: 23.5, foam: 1.0 },
  ring: { ri: 18.5, wand: 1.6, uitsparing: { b: 5, d: 3 } },
  // ESP32-S3-Zero (Waveshare): print 23,5 x 18, met de USB-C 24,8 lang; dikte 1,0 en USB-C 8,94 x 3,26: AANNAME
  esp: { x: 23.5, z: 18, pcb: 1.0, usb: { b: 8.94, h: 3.26, l: 7.35, uit: 1.3 }, rail: 3.0 },
  // MAX98357A (Adafruit 3006): 19,4 x 17,8 x 3,0 (print 1,6); klemmenblok voor de luidspreker (2-polig 3,5): AANNAME
  max: { x: 19.4, z: 17.8, pcb: 1.6, klem: { l: 7.0, d: 7.6, h: 8.5 }, rail: 3.0 },
  // MP1584EN-module: 22 x 17 x 4 (print 1,0: AANNAME); de 4 aansluitingen in de hoeken
  reg: { x: 17, z: 22, pcb: 1.0, h: 4, rail: 3.6 },
  // DC-bus 5,5 x 2,1 voor paneelmontage (DC-022B, Tinytronics): lijf 10 x 10 x 12, gat Ø8, paneel tot 4
  dc: { gat: 8.0, lijf: 10, diep: 12, draad: 7.6, uit: 3.0, moer: 11.0, moerDik: 2.0, y: 6.0 },
  // schroefpaaltjes van de printjes: Ø4,2, voorgat Ø1,8 (plaatschroef 2,2 x 4,5, 0,8 x d), hart 2,4 naast de rand; sluitring
  // DIN 9021 M2,5 (Ø8 x 0,8): ligt 1,6 op de print
  paal: { d: 4.2, voorgat: 1.8, rand: 2.4, schroef: { d: 2.2, l: 4.5, kern: 1.6, kop: 4.2 }, ring: { d: 8, gat: 2.7, dik: 0.8 } },
  // schroefbussen van het deksel in de 4 hoeken: Ø6,4, hart 3,0 van beide wanden, voorgat Ø2,4 (plaatschroef 2,9 x 9,5)
  bus: { r: 3.2, hart: 3.0, voorgat: 2.4, diep: 9 },
  // de opening voor de USB-C-stekker (overmold tot 13 x 7,5): 13,5 x 8 met 45°-hoeken van 2,5 bovenaan (brug 8,5)
  usbGat: { b: 13.5, h: 8.0, schuin: 2.5 },
  // oogjes: 3 dik op het bed, 9,5 uit de wand, 10 breed, gat Ø4,2 (schroef 3,5 of 4 x 16)
  oog: { dik: 3.0, l: 9.5, b: 10, gat: 4.2, wLinks: 23.5, wRechts: 38.0 },
  // rooster: gaten Ø2,5 in een zeshoekig raster van 3,8 binnen Ø33 (boven de conus)
  rooster: { d: 2.5, steek: 3.8, r: 16.5 },
};

// ---------------------------------------------------------------- indeling
// plaats in de bak: u vanaf de binnenkant van de linkerwand, w vanaf de binnenkant van de achterwand
const X = (u) => u - K.binnen.x / 2, Z = (w) => w - K.binnen.z / 2;
let cache;
export function indeling() {
  if (cache) return cache;
  const B = K.binnen, S = K.speaker, P = K.paal;
  const ringR = K.ring.ri + K.ring.wand;
  // de regelaar: rechts van de luidspreker, tegen de voorwand (0,3 vrij); de versterker en de ESP rechts daarvan
  const reg = { u0: 45.1, w1: B.z - 0.3 }; reg.u1 = reg.u0 + K.reg.x; reg.w0 = reg.w1 - K.reg.z;
  const wc = (reg.w0 + reg.w1) / 2; // de paaltjes van regelaar en versterker op één lijn
  const p1 = reg.u1 + P.rand; // het gedeelde paaltje tussen regelaar en versterker
  const max = { u0: p1 + P.rand, w0: wc - K.max.z / 2 }; max.u1 = max.u0 + K.max.x; max.w1 = max.w0 + K.max.z;
  const esp = { u1: B.x - K.esp.usb.uit - 0.2, w0: 7.0 }; esp.u0 = esp.u1 - K.esp.x; esp.w1 = esp.w0 + K.esp.z;
  const espW = (esp.w0 + esp.w1) / 2;
  const palen = [
    { naam: 'regelaar links', u: reg.u0 - P.rand, w: wc, top: K.reg.rail + K.reg.pcb },
    { naam: 'regelaar en versterker', u: p1, w: wc, top: K.max.rail + K.max.pcb },
    { naam: 'versterker rechts', u: max.u1 + P.rand, w: wc, top: K.max.rail + K.max.pcb },
    { naam: 'ESP (antennekant)', u: esp.u0 - P.rand, w: espW, top: K.esp.rail + K.esp.pcb },
  ];
  const h = K.bus.hart;
  const bussen = [[h, h], [h, B.z - h], [B.x - h, h], [B.x - h, B.z - h]];
  // steunrails onder de printjes (niet onder de hoeken van de regelaar: daar zitten de soldeerpunten)
  const rails = [
    [esp.u0 + 1.5, esp.w0 + 1.0, esp.u1 - 1.5, esp.w0 + 3.0, K.esp.rail], [esp.u0 + 1.5, esp.w1 - 3.0, esp.u1 - 1.5, esp.w1 - 1.0, K.esp.rail],
    [max.u0 + 1.5, max.w0 + 1.5, max.u1 - 1.5, max.w0 + 3.5, K.max.rail], [max.u0 + 1.5, max.w1 - 7.0, max.u1 - 1.5, max.w1 - 5.0, K.max.rail],
    [reg.u0 + 0.5, reg.w0 + 4.0, reg.u0 + 2.5, reg.w1 - 4.0, K.reg.rail], [reg.u1 - 2.5, reg.w0 + 4.0, reg.u1 - 0.5, reg.w1 - 4.0, K.reg.rail],
  ];
  // aanslagen: 2 achter de ESP, 2 voor de versterker (naast het klemmenblok)
  const aanslagen = [
    [esp.u0 + 4, esp.w0 - 1.5, esp.u0 + 5.2, esp.w0 - 0.3, K.esp.rail + K.esp.pcb + 1], [esp.u1 - 8, esp.w0 - 1.5, esp.u1 - 6.8, esp.w0 - 0.3, K.esp.rail + K.esp.pcb + 1],
    [max.u0 + 1, max.w1 + 0.3, max.u0 + 2.2, max.w1 + 1.5, K.max.rail + K.max.pcb + 1], [max.u1 - 2.2, max.w1 + 0.3, max.u1 - 1, max.w1 + 1.5, K.max.rail + K.max.pcb + 1],
  ];
  const dc = { u: 49.0, y: K.dc.y };
  const usb = { w: espW, y: K.esp.rail + K.esp.pcb + K.esp.usb.h / 2 };
  cache = { ringR, reg, max, esp, palen, bussen, rails, aanslagen, dc, usb, wc };
  return cache;
}

const XB = () => K.binnen.x / 2 + K.wand, ZB = () => K.binnen.z / 2 + K.wand;
/** de buitenmaat zonder en met de oogjes, en de hoogte met het deksel */
export function buitenmaat() {
  return { x: 2 * XB(), z: 2 * ZB(), h: K.bodem + K.binnen.h + K.deksel, xOog: 2 * XB() + 2 * K.oog.l, bak: K.bodem + K.binnen.h };
}
const acht = (x, z, r) => Array.from({ length: 8 }, (_, i) => { const a = Math.PI / 8 + (i * Math.PI) / 4, R = r / Math.cos(Math.PI / 8); return [x + R * Math.cos(a), z + R * Math.sin(a)]; });
/** een druppel (cirkel met een 45°-punt bovenaan) in (a, y) rond (ca, cy): print in een staande wand zonder support */
export function druppel(ca, cy, r, n = 28) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = ((135 + (270 * i) / n) * Math.PI) / 180; pts.push([ca + r * Math.cos(t), cy + r * Math.sin(t)]); }
  pts.push([ca, cy + r * Math.SQRT2]);
  return pts;
}
/** de opening van de USB-C in (w, y): rechthoek met 45°-hoeken bovenaan */
export function usbOpening() {
  const L = indeling(), G = K.usbGat, w0 = L.usb.w - G.b / 2, w1 = L.usb.w + G.b / 2, y0 = L.usb.y - G.h / 2, y1 = L.usb.y + G.h / 2, c = G.schuin;
  return [[w0, y0], [w1, y0], [w1, y1 - c], [w1 - c, y1], [w0 + c, y1], [w0, y1 - c]];
}
/** de 2 oogjes als [x, z] van het gat */
export function oogjes() {
  const o = K.oog, a = XB() + o.l - o.b / 2;
  return [[-a, Z(o.wLinks)], [a, Z(o.wRechts)]];
}

// ---------------------------------------------------------------- de bak
export function bak() {
  const L = indeling(), B = K.binnen, w = K.wand, xb = XB(), zb = ZB(), H = B.h;
  const o = deel('Geluidskastje (bak)', PETG);
  o.schets(yv(-K.bodem, 'Plane onderkant bodem'), (s) => hoekRechthoek(s, -xb, -zb, xb, zb, [K.r, K.r, K.r, K.r]));
  o.extrude('boss', K.bodem + H, { naam: 'Blok' });
  o.schets(yv(H, 'Plane bovenrand'), (s) => hoekRechthoek(s, -B.x / 2, -B.z / 2, B.x / 2, B.z / 2, [1, 1, 1, 1]));
  o.extrude('cut', H, { omkeren: true, naam: 'Binnenruimte' });
  // de opening voor de USB-C in de rechterwand en de DC-bus (druppel) in de achterwand
  o.schets(xv(xb, 'Plane opening USB'), (s) => s.lusW(usbOpening().map(([wq, y]) => [xb, y, Z(wq)])));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Opening USB-C' });
  o.schets(zv(-zb, 'Plane DC-bus', -1), (s) => s.lusW(druppel(X(L.dc.u), L.dc.y, K.dc.gat / 2).map(([x, y]) => [x, y, -zb])));
  o.extrude('cut', w + 1, { omkeren: true, naam: 'Gat DC-bus' });
  // de oogjes (op het bed, geen overhang), met hun gat
  const oo = K.oog;
  o.schets(yv(-K.bodem, 'Plane oogjes'), (s) => {
    for (const [k, wq] of [[-1, oo.wLinks], [1, oo.wRechts]]) {
      const z = Z(wq), x0 = k * (xb - 1), xe = k * (xb + oo.l - oo.b / 2), r = oo.b / 2;
      s.padW([[x0, z - r], [xe, z - r], { boog: [xe, z], naar: [xe + k * r, z] }, { boog: [xe, z], naar: [xe, z + r] }, [x0, z + r]]);
    }
  });
  o.extrude('boss', oo.dik, { naam: 'Oogjes' });
  cirkels(o, -K.bodem + oo.dik, oo.dik + 1, oogjes().map(([x, z]) => [x, z, oo.gat / 2]), 'Gaten oogjes', 'cut');
  // de ring van de luidspreker (de flens rust erop, 0,1 lucht in het model), met een uitsparing voor de draden
  const S = K.speaker, yRing = H - S.foam - S.flens - 0.1, cx = X(S.u), cz = Z(S.w);
  o.schets(yv(-0.5, 'Plane ring luidspreker'), (s) => { s.cirkelW([cx, 0, cz], L.ringR); s.cirkelW([cx, 0, cz], K.ring.ri); });
  o.extrude('boss', yRing + 0.5, { naam: 'Ring luidspreker' });
  const U = K.ring.uitsparing;
  snede(o, yRing + 0.01, U.d + 0.01, [[cx + K.ring.ri - 1, cz - U.b / 2, cx + L.ringR + 1, cz + U.b / 2]], 'Uitsparing draden');
  // steunrails en aanslagen van de printjes (per hoogte één schets), de schroefpaaltjes, de bussen van het deksel
  blokken(o, [...L.rails.map(([u0, w0, u1, w1, h]) => [X(u0), -0.5, Z(w0), X(u1), h, Z(w1)]), ...L.aanslagen.map(([u0, w0, u1, w1, h]) => [X(u0), -0.5, Z(w0), X(u1), h, Z(w1)])], 'Steun');
  const P = K.paal, hoogten = [...new Set(L.palen.map((p) => p.top))];
  for (const t of hoogten) cirkels(o, -0.5, t + 0.5, L.palen.filter((p) => p.top === t).map((p) => [X(p.u), Z(p.w), P.d / 2]), `Schroefpaaltjes ${t}`);
  cirkels(o, -0.5, H + 0.5, L.bussen.map(([u, wq]) => [X(u), Z(wq), K.bus.r]), 'Schroefbussen');
  for (const t of hoogten) veelhoeken(o, t, P.schroef.l - K.paal.ring.dik + 0.5, L.palen.filter((p) => p.top === t).map((p) => acht(X(p.u), Z(p.w), P.voorgat / 2)), `Voorgaten ${t}`, 'cut');
  veelhoeken(o, H, K.bus.diep, L.bussen.map(([u, wq]) => acht(X(u), Z(wq), K.bus.voorgat / 2)), 'Voorgaten deksel', 'cut');
  return o.doc();
}

/** de gaatjes van het rooster: zeshoekig raster binnen r rond het midden van de luidspreker */
export function roosterGaten() {
  const R = K.rooster, uit = [], dz = R.steek * Math.sqrt(3) / 2;
  for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) {
    const x = (i + (j % 2 ? 0.5 : 0)) * R.steek, z = j * dz;
    if (Math.hypot(x, z) + R.d / 2 <= R.r) uit.push([x, z]);
  }
  return uit;
}

// ---------------------------------------------------------------- het deksel
export function deksel() {
  const L = indeling(), B = K.binnen, xb = XB(), zb = ZB(), y0 = B.h, t = K.deksel, S = K.speaker;
  const o = deel('Geluidskastje (deksel)', PETG_DEKSEL);
  o.schets(yv(y0, 'Plane deksel'), (s) => hoekRechthoek(s, -xb, -zb, xb, zb, [K.r, K.r, K.r, K.r]));
  o.extrude('boss', t, { naam: 'Plaat' });
  cirkels(o, y0 + t, t + 1, roosterGaten().map(([x, z]) => [X(S.u) + x, Z(S.w) + z, K.rooster.d / 2]), 'Rooster', 'cut');
  cirkels(o, y0 + t, t + 1, L.bussen.map(([u, w]) => [X(u), Z(w), 1.6]), 'Gaten schroeven', 'cut');
  return o.doc();
}

// ---------------------------------------------------------------- gekochte onderdelen (eenvoudige blokken)
const ROOD = { name: 'TPE, rood', density: 1100, color: '#c8202f' };
const PAARS = { name: 'FR4, paars soldeermasker', density: 1850, color: '#5b3a8c' };
/** luidspreker: oorsprong boven op de flens in het midden; de conus naar boven */
export function luidspreker() {
  const S = K.speaker, o = deel('Luidspreker 40 mm 4 ohm 3 W', { name: 'staal en papier, zwart', density: 3000, color: '#25272b' });
  cirkels(o, -S.flens, S.flens, [[0, 0, S.d / 2]], 'Flens');
  o.schets(yv(-S.flens + 0.05, 'Plane lijf'), (s) => s.cirkelW([0, 0, 0], S.lijf / 2));
  o.extrude('boss', S.h - S.flens, { omkeren: true, naam: 'Lijf en magneet' });
  cirkels(o, 0, 1.2, [[0, 0, 15.5]], 'Conus', 'cut');
  return o.doc();
}
/** ESP32-S3-Zero: oorsprong midden onderkant print; de USB-C naar +X */
export function espZero() {
  const E = K.esp, o = deel('ESP32-S3-Zero (Waveshare)', PCB_ZWART);
  blokken(o, [[-E.x / 2, 0, -E.z / 2, E.x / 2, E.pcb, E.z / 2, 0.5]], 'Print');
  // de rand met 9 halve gaten per lange kant (steek 2,54)
  cirkels(o, E.pcb, E.pcb + 1, Array.from({ length: 18 }, (_, i) => [-E.x / 2 + 0.9 + 2.54 * (i % 9) + 0.4, (i < 9 ? -1 : 1) * (E.z / 2), 0.5]), 'Halve gaten', 'cut');
  return o.doc();
}
export function espOnderdelen() {
  const E = K.esp, U = E.usb, o = deel('ESP32-S3-Zero (chip, USB-C, antenne)', ZWART);
  blokken(o, [
    [-3.5, E.pcb, -3.5, 3.5, E.pcb + 0.9, 3.5, 0.2], // ESP32-S3FH4R2 (QFN 7 x 7)
    [-E.x / 2 + 2.0, E.pcb, -1.6, -E.x / 2 + 5.2, E.pcb + 1.2, 1.6, 0.2], // keramische antenne (2 van de rand: de sluitring ligt ervoor)
    [-7, E.pcb, -7.5, -5, E.pcb + 1.0, -5.5, 0.1], [5, E.pcb, 5.5, 7, E.pcb + 1.0, 7.5, 0.1], // LDO, led
  ], 'Chip');
  return o.doc();
}
export function usbC() {
  const E = K.esp, U = E.usb, o = deel('USB-C-bus', METAAL), x1 = E.x / 2 + U.uit;
  blokken(o, [[x1 - U.l, E.pcb, -U.b / 2, x1, E.pcb + U.h, U.b / 2, 1.2]], 'Huis');
  snede(o, E.pcb + U.h - 0.3, U.h - 0.6, [[x1 - 0.6, -U.b / 2 + 0.5, x1 + 0.1, U.b / 2 - 0.5, 0.8]], 'Opening');
  return o.doc();
}
/** MAX98357A-breakout: oorsprong midden onderkant print; het klemmenblok aan de +Z-rand (voor), de pinnen aan -Z */
export function maxPrint() {
  const A = K.max, o = deel('MAX98357A I2S-versterker (print)', PAARS);
  blokken(o, [[-A.x / 2, 0, -A.z / 2, A.x / 2, A.pcb, A.z / 2, 0.8]], 'Print');
  cirkels(o, A.pcb, A.pcb + 1, Array.from({ length: 7 }, (_, i) => [-7.62 + 2.54 * i, -A.z / 2 + 1.5, 0.5]), 'Gaten pinnen', 'cut');
  return o.doc();
}
export function maxOnderdelen() {
  const A = K.max, k = A.klem, o = deel('MAX98357A (chip)', ZWART);
  blokken(o, [[-1.5, A.pcb, -4.5, 1.5, A.pcb + 0.8, -1.5, 0.2], [3, A.pcb, -4, 5, A.pcb + 1.4, -2, 0.2]], 'Chip');
  return o.doc();
}
export function maxKlem() {
  const A = K.max, k = A.klem, o = deel('Klemmenblok 2-polig 3,5', KLEM_GROEN), z1 = A.z / 2 - 0.3;
  blokken(o, [[-k.l / 2, A.pcb, z1 - k.d, k.l / 2, A.pcb + k.h, z1]], 'Huis');
  cirkels(o, A.pcb + k.h, 3, [[-1.75, z1 - k.d * 0.4, 0.9], [1.75, z1 - k.d * 0.4, 0.9]], 'Schroeven', 'cut');
  return o.doc();
}
/** MP1584EN-module: oorsprong midden onderkant print; 22 lang langs Z */
export function regPrint() {
  const R = K.reg, o = deel('MP1584EN 12 V naar 5 V (print)', PCB_BLAUW);
  blokken(o, [[-R.x / 2, 0, -R.z / 2, R.x / 2, R.pcb, R.z / 2, 0.5]], 'Print');
  cirkels(o, R.pcb, R.pcb + 1, [[-R.x / 2 + 1.5, -R.z / 2 + 1.5, 0.6], [R.x / 2 - 1.5, -R.z / 2 + 1.5, 0.6], [-R.x / 2 + 1.5, R.z / 2 - 1.5, 0.6], [R.x / 2 - 1.5, R.z / 2 - 1.5, 0.6]], 'Aansluitingen', 'cut');
  return o.doc();
}
export function regOnderdelen() {
  const R = K.reg, o = deel('MP1584EN (spoel, IC, trimmer)', ZWART), y = R.pcb, t = R.h - R.pcb;
  blokken(o, [[-3, y, -3, 3, y + t, 3, 0.6], [3.8, y, -6, 6.8, y + 1.0, -3, 0.2], [-6.5, y, 4.5, -2, y + 2.5, 9, 0.3]], 'Onderdelen');
  return o.doc();
}
/** DC-bus 5,5 x 2,1 (paneelmontage): oorsprong op de buitenkant van de wand, de as langs +Z naar buiten */
export function dcBus() {
  const D = K.dc, w = K.wand, o = deel('DC-bus 5,5 x 2,1 (DC-022B)', ZWART);
  o.schets(vlak('j1', 'Plane lijf', [0, 0, -w - 0.05], [0, 0, -1], 'reference'), (s) => s.rrectW([-D.lijf / 2, -D.lijf / 2, -w - 0.05], [D.lijf / 2, D.lijf / 2, -w - 0.05], 1));
  o.extrude('boss', D.diep, { naam: 'Lijf' });
  o.schets(vlak('j2', 'Plane draad', [0, 0, -w - 0.1], [0, 0, 1], 'reference'), (s) => s.cirkelW([0, 0, -w - 0.1], D.draad / 2));
  o.extrude('boss', w + D.uit + 0.1, { naam: 'Draad' });
  o.schets(vlak('j3', 'Plane opening', [0, 0, D.uit], [0, 0, 1], 'reference'), (s) => s.cirkelW([0, 0, D.uit], 2.75));
  o.extrude('cut', 9, { omkeren: true, naam: 'Opening stekker' });
  return o.doc();
}
export function dcMoer() {
  const D = K.dc, o = deel('Moer DC-bus', METAAL), r = D.moer / 2;
  o.schets(vlak('m1', 'Plane moer', [0, 0, 0.05], [0, 0, 1], 'reference'), (s) => s.lusW(Array.from({ length: 6 }, (_, i) => [r * Math.cos((i * Math.PI) / 3), r * Math.sin((i * Math.PI) / 3), 0.05])));
  o.extrude('boss', D.moerDik, { naam: 'Moer' });
  o.schets(vlak('m2', 'Plane gat', [0, 0, 0.05 + D.moerDik], [0, 0, 1], 'reference'), (s) => s.cirkelW([0, 0, 0.05 + D.moerDik], D.draad / 2 + 0.2));
  o.extrude('cut', D.moerDik + 1, { omkeren: true, naam: 'Gat' });
  return o.doc();
}
export function sluitring() {
  const R = K.paal.ring, o = deel('Sluitring DIN 9021 M2,5 (Ø8)', METAAL);
  o.schets(yv(0, 'Plane ring'), (s) => { s.cirkelW([0, 0, 0], R.d / 2); s.cirkelW([0, 0, 0], R.gat / 2); });
  o.extrude('boss', R.dik, { naam: 'Ring' });
  return o.doc();
}
const draaiY = (deg) => { const a = (deg * Math.PI) / 360; return [0, Math.sin(a), 0, Math.cos(a)]; };

// ---------------------------------------------------------------- samenstelling
export function samenstelling() {
  const L = indeling(), B = K.binnen, S = K.speaker, P = K.paal, comps = [];
  const at = (id, naam, doc, p, rot) => comps.push(component(id, naam, doc, p, rot ? { rotation: rot } : {}));
  at('k1', 'Geluidskastje (bak)<1>', bak(), [0, 0, 0]);
  at('k2', 'Geluidskastje (deksel)<1>', deksel(), [0, 0, 0]);
  at('s1', 'Luidspreker 40 mm<1>', luidspreker(), [X(S.u), B.h - S.foam, Z(S.w)]);
  const e = L.esp, ep = [X((e.u0 + e.u1) / 2), K.esp.rail, Z((e.w0 + e.w1) / 2)];
  at('e1', 'ESP32-S3-Zero (print)<1>', espZero(), ep);
  at('e2', 'ESP32-S3-Zero (onderdelen)<1>', espOnderdelen(), ep);
  at('e3', 'USB-C<1>', usbC(), ep);
  const m = L.max, mp = [X((m.u0 + m.u1) / 2), K.max.rail, Z((m.w0 + m.w1) / 2)];
  at('a1', 'MAX98357A (print)<1>', maxPrint(), mp);
  at('a2', 'MAX98357A (chip)<1>', maxOnderdelen(), mp);
  at('a3', 'Klemmenblok luidspreker<1>', maxKlem(), mp);
  const r = L.reg, rp = [X((r.u0 + r.u1) / 2), K.reg.rail, Z((r.w0 + r.w1) / 2)];
  at('r1', 'MP1584EN (print)<1>', regPrint(), rp);
  at('r2', 'MP1584EN (onderdelen)<1>', regOnderdelen(), rp);
  const zb = ZB();
  at('j1', 'DC-bus 5,5 x 2,1<1>', dcBus(), [X(L.dc.u), L.dc.y, -zb], draaiY(180));
  at('j2', 'Moer DC-bus<1>', dcMoer(), [X(L.dc.u), L.dc.y, -zb], draaiY(180));
  // de klemschroeven met hun brede sluitring op de schroefpaaltjes
  const ring = sluitring(), schroef = bolkopSchroef('Plaatschroef 2,2 x 4,5 bolkop', P.schroef.d, P.schroef.kop, P.schroef.kern, P.schroef.l - P.ring.dik);
  L.palen.forEach((p, i) => {
    at(`ps${i + 1}`, `Sluitring DIN 9021 M2,5<${i + 1}>`, ring, [X(p.u), p.top, Z(p.w)]);
    at(`pk${i + 1}`, `Plaatschroef 2,2 x 4,5<${i + 1}>`, schroef, [X(p.u), p.top + P.ring.dik, Z(p.w)]);
  });
  const dekselSchroef = bolkopSchroef('Plaatschroef 2,9 x 9,5 bolkop', 2.9, 5.6, 2.1, 9.5);
  L.bussen.forEach(([u, w], i) => at(`ds${i + 1}`, `Plaatschroef 2,9 x 9,5<${i + 1}>`, dekselSchroef, [X(u), B.h + K.deksel, Z(w)]));
  return { format: 'phlippo-cad', version: 1, name: 'Geluidskastje', units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components: comps, mates: [] };
}

// ---------------------------------------------------------------- berekeningen (README, tekening)
/** stroom, warmte en geluid (zie README "Berekening") */
export function berekening() {
  const V = 5.0, R = 4, Pmax = 3.2, eta = 0.85, etaReg = 0.88, Vin = 12;
  const vPiek = Math.min(V, Math.sqrt(2 * Pmax * R)); // BTL: tot de voedingsspanning
  const iLsPiek = vPiek / R; // stroom door de luidspreker op de piek
  const iVersterkerPiek = (vPiek * iLsPiek) / (eta * V); // uit 5 V op de piek van de sinus
  const iVersterkerGem = Pmax / (eta * V); // bij een volle sinus (alleen een proeftoon; geluid gemiddeld veel minder)
  const iEspPiek = 0.35, iEspGem = 0.10; // wifi zenden; gewoon verbonden (AANNAME uit het datablad ESP32-S3: tot 340 mA zenden)
  const i5Piek = iVersterkerPiek + iEspPiek;
  const i12Piek = (V * i5Piek) / (etaReg * Vin);
  // gewoon geluid (spraak, klok, trein): gemiddeld 1/8 van het piekvermogen (crestfactor ~ 12 dB, AANNAME)
  const pGeluid = Pmax / 8;
  const p5Gem = pGeluid / eta + V * iEspGem;
  const i12Gem = p5Gem / (etaReg * Vin);
  const warmte = pGeluid * (1 / eta - 1) + p5Gem * (1 / etaReg - 1) + V * iEspGem; // de ESP zet alles om in warmte
  const m = buitenmaat(), A = 2 * (m.x * m.z + m.x * m.h + m.z * m.h) * 1e-6; // m²
  const dT = warmte / (7 * A); // natuurlijke convectie + straling ~7 W/m²K (AANNAME)
  const spl = 82 + 10 * Math.log10(Pmax); // 82 dB/1 W/1 m (AANNAME voor een 40 mm-luidspreker)
  return { vPiek, iLsPiek, iVersterkerPiek, iVersterkerGem, i5Piek, i12Piek, i12Gem, warmte, dT, A, spl, pGeluid };
}

export const ONDERDELEN = { 'Geluidskastje-bak.kcad': bak, 'Geluidskastje-deksel.kcad': deksel };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const schrijf = (naam, doc) => writeFileSync(join(HERE, naam), JSON.stringify(doc, null, 1) + '\n');
  for (const [naam, f] of Object.entries(ONDERDELEN)) schrijf(naam, f());
  schrijf('Geluidskastje.kcad', samenstelling());
  const m = buitenmaat(), b = berekening();
  console.log(`kastje: buiten ${m.x.toFixed(1)} x ${m.z.toFixed(1)} x ${m.h.toFixed(1)} (met de oogjes ${m.xOog.toFixed(1)} lang), binnen ${K.binnen.x} x ${K.binnen.z} x ${K.binnen.h}; ${roosterGaten().length} gaatjes in het rooster`);
  console.log(`stroom: 5 V piek ${b.i5Piek.toFixed(2)} A (versterker ${b.iVersterkerPiek.toFixed(2)} A + ESP 0,35 A), 12 V piek ${b.i12Piek.toFixed(2)} A, gemiddeld ${(b.i12Gem * 1000).toFixed(0)} mA; warmte ${b.warmte.toFixed(2)} W, ${b.dT.toFixed(1)} K warmer; ${b.spl.toFixed(0)} dB op 1 m`);
}
