// Ronde vergelijkingsvariant van de inbouwafzuiging (2026-11-13, naast versie 7.3; vraag van Ian: "maak ook eens een
// helemaal rond model van de afzuiging dat ik kan vergelijken"). Het ontwerp 7.3 zelf blijft ongewijzigd.
//
// Wat anders is dan 7.3 (zie README.md in deze map):
// - van boven rond: bovenframe Ø228 en een ronde RVS-plaat Ø228 met het LB-monogram (rooster_rond.py), uitsparing Ø218;
// - het filter is een RINGFILTER (luchtfilter met radiale stroming, Ø175 / Ø120 x 55, papier, PU-eindkappen): de lucht gaat
//   van buiten naar binnen door de plooien en valt door de kern recht in het oog van de ventilator. Een dekseltje (PETG)
//   sluit de kern bovenaan af, onder het logo. Het rechthoekige CU 20 013 (195 x 145) vraagt binnen Ø245 en een frame
//   van ongeveer Ø265: dan past geen enkel deel nog op het bed (≤ 230), daarom niet;
// - ronde romp Ø216 (ondersteboven geprint, het bovenvlak op het bed), 4 klauwen op 45°, 135°, 225° en 315° in gesloten
//   torens die op de instroomplaat eindigen; de wand stopt onder de instroomplaat, 4 pootjes dragen de kuip;
// - de kuip, de ventilator op de rubberbuffers, de kuipdichting en alle normdelen zijn die van 7.3, 18 mm lager;
// - de knop, de voedingsbox en de elektronica komen ongewijzigd uit 7.3.
// Assenstelsel zoals 7.3: oorsprong midden op het bovenvlak van het blad, Y omhoog, +Z naar de voorkant van het bureau.
// Een hoek a ligt op (x, z) = r (cos a, sin a): 0° = rechts, 90° = voor, 270° = achter (naar de voedingsbox).
// Gebruik: python voorbeelden/afzuiging/rond/rooster_rond.py && node voorbeelden/afzuiging/rond/maak-rond.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Onderdeel, TOP, component } from '../../lib/schets.mjs';
import {
  M, kuip, kuipdichting, ventilator, rubberbuffer, persbout, klauw, klauwrubber, moer, schroefVerzonken,
  schroefCilinder, stift, messingbuisje, afzuigingComponenten,
} from '../maak-afzuiging.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/** maten van de ronde variant (mm) */
export const R = {
  blad: M.blad,
  frame: { r: 114, dikte: 2.5, opening: 103.5 },
  uitsparing: 109, // straal: Ø218, te frezen met een MDF-mal (opening Ø223, kopieerring Ø17, frees Ø12)
  romp: { r: 108, wand: 4, onder: -69, poot: -88 }, // de wand stopt onder de instroomplaat, de pootjes tot -88
  // klauwen: dezelfde klauw als 7.3 (PETG 6 mm, M5-moer, rubber 4 mm); de as 8,5 mm binnen de buitenwand
  klauw: { r: 99.5, hoeken: [45, 135, 225, 315] },
  // toren rond de klauw in lokale coördinaten (u = straal, t = langs de omtrek; de ingetrokken arm wijst naar -t)
  toren: { u: 90, t: [-21, 9.5], top: -9, zwaai: -49, bodem: -61, onder: -64 },
  lip: { u: 91, t: 6 }, // lippen van het frame boven de torens (kop van de M5)
  nok: { hoek: 270, u: [95, 104], t: 5, gat: 99.5 }, // nok achteraan met het gat voor de persbout: het logo staat altijd recht
  persbouten: [[101.8, 30], [101.8, 150], [99.5, 270]], // [straal, hoek]
  magneten: { r: 108.75, hoeken: [0, 90, 180, 270] },
  // ringfilter Ø175 / Ø120 x 55 (zie README): bovenkant 5 mm onder het blad, onderkant op een foamband 6 x 4
  filter: { ro: 87.5, ri: 60, h: 55, top: -5, kap: 4, plooien: 72 },
  foam: { r: [61, 67], h: 4 },
  // deksel op de kern: schijf Ø150 x 2 op een celband 6 x 2, een kraag 7 mm in de kern; 3,5 mm onder de RVS-plaat
  deksel: { r: 75, dik: 2, kraag: [57.5, 59.5], diep: 7, band: 2 },
  // instroomplaat 5 mm (een meetkanaal 2 x 2 erin), ligt tegen de onderkant van de torens en een richel langs de wand
  inlaat: { top: -64, dikte: 5, gat: 53, kraag: { r: 59.4, top: -56 }, meet: { hoek: 262, r: 101, kanaal: [-67, -65.5] },
    // vingerrooster van 7.3, 14 ribben: de buitenste spleet (rib tot de rand van het gat Ø106) is 5,4 mm
    vinger: { ...M.inlaat.vinger, n: 7 } },
  dy: -18, // de kuip, de ventilator en hun normdelen: 18 mm lager dan in 7.3
};

const PETG = { name: 'PETG, wit', density: 1270, color: '#f4f4f1' };
const RVS430 = { name: 'AISI 430', density: 7700, color: '#c9ccd1' };
const rad = (a) => (a * Math.PI) / 180;
const yv = (id, y, name) => ({ id, name, origin: [0, y, 0], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], kind: 'reference' });
const yvOnder = (id, y, name) => ({ id, name, origin: [0, y, 0], u: [1, 0, 0], v: [0, 0, 1], n: [0, -1, 0], kind: 'reference' });
/** lokaal (u, t) rond hoek a naar wereld [x, z] */
const W = (a, u, t) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); return [u * c - t * s, u * s + t * c]; };
/** een verticaal vlak door de as, langs de straal op hoek a (schets-x = straal, schets-y = Y), verschoven met `t` langs de omtrek */
const straalvlak = (id, name, a, t = 0) => {
  const c = Math.cos(rad(a)), s = Math.sin(rad(a));
  return { id, name, origin: [-t * s, 0, t * c], u: [c, 0, s], v: [0, 1, 0], n: [-s, 0, c], kind: 'reference' };
};
/** een verticaal vlak raakt de buitenwand op hoek a (schets-x = -t, schets-y = Y, normaal naar buiten) */
const raakvlak = (id, name, a, u) => {
  const c = Math.cos(rad(a)), s = Math.sin(rad(a));
  return { id, name, origin: [u * c, 0, u * s], u: [s, 0, -c], v: [0, 1, 0], n: [c, 0, s], kind: 'reference' };
};
const N = 180; // de ronde wanden als veelhoek van 180 hoeken (afwijking 0,016 mm)

/** de hoeken (rad) waar de cirkel r de zijkanten van de torens (met marge m) snijdt */
function torenHoeken(r, m) {
  const T = R.toren;
  return R.klauw.hoeken.map((a) => {
    const [t0, t1] = [T.t[0] - m, T.t[1] + m];
    return { a, t0, t1, in: rad(a) + Math.atan2(t0, Math.sqrt(r * r - t0 * t0)), uit: rad(a) + Math.atan2(t1, Math.sqrt(r * r - t1 * t1)) };
  });
}
/** de cirkel r als veelhoek [x, z], met dezelfde hoekpunten als kanaalLus (geen spleetjes tussen de twee) */
function cirkelLus(r) {
  const H = torenHoeken(r, 0);
  const hoeken = [...Array.from({ length: N }, (_, k) => (2 * Math.PI * k) / N), ...H.flatMap((h) => [h.in, h.uit])].sort((a, b) => a - b);
  return hoeken.map((h) => [r * Math.cos(h), r * Math.sin(h)]);
}
/** de binnenkant van de romp (r 104 - m) min de vier torens (met marge m naar binnen) */
function kanaalLus(m = 0) {
  const r = R.romp.r - R.romp.wand - m, H = torenHoeken(r, m), uit = [];
  const binnen = (h) => H.some((t) => h > t.in + 1e-9 && h < t.uit - 1e-9);
  for (let k = 0; k < N; k++) {
    const h = (2 * Math.PI * k) / N;
    const hier = H.filter((t) => t.in >= h - 1e-12 && t.in < h + (2 * Math.PI) / N - 1e-12);
    if (!binnen(h)) uit.push([r * Math.cos(h), r * Math.sin(h)]);
    for (const t of hier) {
      uit.push([r * Math.cos(t.in), r * Math.sin(t.in)], W(t.a, R.toren.u - m, t.t0), W(t.a, R.toren.u - m, t.t1), [r * Math.cos(t.uit), r * Math.sin(t.uit)]);
    }
  }
  return uit;
}
const lus3 = (pts, y = 0) => pts.map(([x, z]) => [x, y, z]);
const polar = (r, a) => [r * Math.cos(rad(a)), r * Math.sin(rad(a))];

/** de ronde romp (ondersteboven geprint, het bovenvlak op het bed): wand Ø216 x 4 tot onder de instroomplaat, 4 gesloten
 *  torens met de klauwen (ze eindigen op de instroomplaat), een richel boven de instroomplaat en 4 pootjes voor de kuip */
export function rompRond() {
  const { romp: RO, toren: T, klauw: K, inlaat: I } = R, C = M.klauw;
  const o = new Onderdeel('Romp rond', PETG);
  o.schets(TOP, (s) => s.cirkel(0, 0, RO.r));
  o.extrude('boss', -RO.onder, { omkeren: true, naam: 'Romp' });
  o.schets(yv('boven', 0, 'Plane boven'), (s) => s.lusW(lus3(kanaalLus())));
  o.extrude('cut', -RO.onder + 1, { omkeren: true, naam: 'Luchtkanaal' });
  // onder de torens: de torens eindigen op de instroomplaat (-64); in de druk staan ze bovenaan, dus zonder overhang
  o.schets(yv('torenonder', T.onder, 'Plane onderkant torens'), (s) => s.lusW(lus3(cirkelLus(RO.r - RO.wand))));
  o.extrude('cut', T.onder - RO.onder + 1, { omkeren: true, naam: 'Onder de torens' });
  // richel boven de instroomplaat: 3 treden van 1 mm (3, 2, 1 breed van onder naar boven: in de druk 45°); de plaat wordt
  // er van onderen tegen gelijmd, ook tegen de onderkant van de torens
  [3, 2, 1].forEach((w, i) => {
    o.schets(yv(`richel${i}`, I.top + i, `Plane richel ${i + 1}`), (s) => {
      s.lusW(lus3(cirkelLus(RO.r - RO.wand + 0.5))); s.lusW(lus3(cirkelLus(RO.r - RO.wand - w)));
    });
    o.extrude('boss', 1, { naam: `Richel instroomplaat ${i + 1}` });
  });
  // 4 pootjes voor de oren van de kuip (0°, 90°, 180°, 270°), met een schuine binnenkant (45°: geen support)
  [0, 90, 180, 270].forEach((a, i) => {
    o.schets(straalvlak(`poot${i}`, `Plane pootje ${i + 1}`, a, -4.5), (s) =>
      s.lus([[95.5, RO.poot], [107.8, RO.poot], [107.8, RO.onder + 0.5], [103.8, RO.onder + 0.5], [103.8, RO.onder - 0.5], [95.5, RO.onder - 8.8]]));
    o.extrude('boss', 9, { naam: `Pootje kuip ${i + 1}` });
  });
  // gaten M3 (Ø2,5 x 10) voor de oren van de kuip, van onderen
  o.schets(yvOnder('pootonder', RO.poot, 'Plane onderkant pootjes'), (s) => [0, 90, 180, 270].forEach((a) => { const [x, z] = polar(M.kuip.oor.schroef, a); s.cirkelW([x, RO.poot, z], 1.25); }));
  o.extrude('cut', 10, { omkeren: true, naam: 'Gaten kuip' });
  // M5 x 65 van bovenaf: gat Ø5,4 tot 1 mm boven de onderkant van de toren (9 mm geleiding boven het klauwkanaal)
  o.schets(yv('m5', 0, 'Plane boven M5'), (s) => K.hoeken.forEach((a) => { const [x, z] = polar(K.r, a); s.cirkelW([x, 0, z], 2.7); }));
  o.extrude('cut', -T.onder - 1, { omkeren: true, naam: 'Gaten M5' });
  // klauwkanalen (draaien mee met de hoek)
  const kw = C.naaf + 0.5;
  o.schets(yv('kanaal', T.top, 'Plane top klauwkanaal'), (s) => K.hoeken.forEach((a) =>
    s.lusW(lus3([[-kw, -kw], [kw, -kw], [kw, kw], [-kw, kw]].map(([du, t]) => W(a, K.r + du, t))))));
  o.extrude('cut', T.top - T.bodem, { omkeren: true, naam: 'Klauwkanalen' });
  // zwaaikamers: de ingetrokken arm ligt langs -t; het plafond loopt onder 45° op naar de buitenwand
  K.hoeken.forEach((a, i) => {
    const xi = K.r - (C.breed / 2 + 0.5), xw = RO.r + 1, yi = T.bodem + C.dik + C.rubber.h + 0.5, yw = yi + (xw - xi);
    o.schets(straalvlak(`zwaai${i}`, `Plane zwaaikamer ${i + 1}`, a), (s) => s.lus([[xi, T.bodem - 0.5], [xw, T.bodem - 0.5], [xw, yw], [xi, yi]]));
    o.extrude('cut', C.arm + 0.5, { omkeren: true, naam: `Zwaaikamer klauw ${i + 1}` });
  });
  // in de wand: het venster onderaan (klauw erin schuiven en uitzwaaien) en de sleuf voor de arm
  K.hoeken.forEach((a, i) => {
    const b = C.breed / 2 + 0.5, lo = -(C.arm + 0.5), hi = C.naaf + 1, y0 = T.bodem - 0.5, yw = T.zwaai, y1 = T.top;
    o.schets(raakvlak(`wand${i}`, `Plane wand klauw ${i + 1}`, a, RO.r), (s) =>
      s.lus([[lo, y0], [hi, y0], [hi, yw], [b, yw], [b, y1], [-b, y1], [-b, yw], [lo, yw]].map(([t, y]) => [-t, y])));
    o.extrude('cut', 7, { omkeren: true, naam: `Sleuven klauw ${i + 1}` });
  });
  return o.doc();
}

/** het ronde bovenframe (plat geprint, 2,5 mm): ring Ø228 / Ø207 op de romp gelijmd, lippen boven de 4 torens met de
 *  verzinking voor de M5, 4 magneten en de nok met het gat voor de achterste persbout */
export function bovenframeRond() {
  const { frame: F, klauw: K, lip: L, nok: NK } = R;
  const o = new Onderdeel('Bovenframe rond', PETG);
  o.schets(TOP, (s) => { s.cirkel(0, 0, F.r); s.cirkel(0, 0, F.opening); });
  o.extrude('boss', F.dikte, { naam: 'Ring' });
  o.schets(TOP, (s) => {
    K.hoeken.forEach((a) => s.lusW(lus3([[L.u, -L.t], [F.opening + 0.5, -L.t], [F.opening + 0.5, L.t], [L.u, L.t]].map(([u, t]) => W(a, u, t)))));
    s.lusW(lus3([[NK.u[0], -NK.t], [NK.u[1], -NK.t], [NK.u[1], NK.t], [NK.u[0], NK.t]].map(([u, t]) => W(NK.hoek, u, t))));
  });
  o.extrude('boss', F.dikte, { naam: 'Lippen en nok' });
  const asW = K.hoeken.map((a) => polar(K.r, a));
  o.schets(yv('bovenvlak', F.dikte, 'Plane bovenkant frame'), (s) => asW.forEach(([x, z]) => s.cirkelW([x, 0, z], 5.2)));
  o.extrude('cut', 2, { omkeren: true, naam: 'Verzinking M5', draft: 45 });
  o.schets(yv('bovenvlak', F.dikte, 'Plane bovenkant frame'), (s) => {
    asW.forEach(([x, z]) => s.cirkelW([x, 0, z], 3));
    const [x, z] = polar(NK.gat, NK.hoek);
    s.cirkelW([x, 0, z], 1.6); // de persbout (Ø2,6) met 0,3 mm speling: de plaat ligt maar in één stand
  });
  o.extrude('cut', F.dikte + 1, { omkeren: true, naam: 'Gaten' });
  o.schets(yv('bovenvlak', F.dikte, 'Plane bovenkant frame'), (s) => R.magneten.hoeken.forEach((a) => { const [x, z] = polar(R.magneten.r, a); s.cirkelW([x, 0, z], M.magneten.d / 2 + 0.1); }));
  o.extrude('cut', M.magneten.h + 0.1, { omkeren: true, naam: 'Magneten' });
  return o.doc();
}

/** de ronde RVS-plaat (laser/rooster-rond.loops, uit rooster_rond.py), op het frame */
export function roosterRond() {
  const loops = JSON.parse(readFileSync(join(HERE, 'laser', 'rooster-rond.loops'), 'utf8'));
  const o = new Onderdeel('Rooster LB rond', RVS430);
  o.schets(yv('frametop', R.frame.dikte, 'Plane bovenkant frame'), (s) => { s.lus(loops.outer); loops.holes.forEach((h) => s.lus(h)); });
  o.extrude('boss', loops.dikte, { naam: 'Plaat' });
  return o.doc();
}

/** ringfilter Ø175 / Ø120 x 55 (vereenvoudigd): twee eindkappen van 4 mm en daartussen het geplooide papier (72 plooien
 *  aan de buitenkant getekend) */
export function ringfilter() {
  const F = R.filter, y0 = F.top - F.h;
  const o = new Onderdeel('Ringfilter Ø175 x Ø120 x 55', { name: 'Filterpapier en PU', density: 250, color: '#ece6cf' });
  o.schets(yv('filteronder', y0, 'Plane onderkant filter'), (s) => { s.cirkel(0, 0, F.ro); s.cirkel(0, 0, F.ri); });
  o.extrude('boss', F.h, { naam: 'Filter' });
  o.schets(yv('plooien', F.top - F.kap, 'Plane plooien'), (s) => {
    for (let k = 0; k < F.plooien; k++) {
      const a = (360 * k) / F.plooien;
      s.lusW(lus3([[F.ro - 6, 0], [F.ro + 1, -0.9], [F.ro + 1, 0.9]].map(([u, t]) => W(a, u, t))));
    }
  });
  o.extrude('cut', F.h - 2 * F.kap, { omkeren: true, naam: 'Plooien' });
  return o.doc();
}

/** zachte foamband 6 x 4 (EPDM-cel, zoals in 7.3) als ring op de instroomplaat, onder de onderste eindkap van het filter */
export function foamRing() {
  const o = new Onderdeel('Foamband 6 x 4 (ring)', { name: 'EPDM-cel, zwart', density: 150, color: '#2a2a2c' });
  o.schets(yv('foam', R.inlaat.top, 'Plane bovenkant instroomplaat'), (s) => { s.cirkel(0, 0, R.foam.r[1]); s.cirkel(0, 0, R.foam.r[0]); });
  o.extrude('boss', R.foam.h, { naam: 'Band' });
  return o.doc();
}

/** celband 6 x 2 (zoals de kuipdichting) onder het filterdeksel, op de bovenste eindkap */
export function dekselband() {
  const o = new Onderdeel('Celband 6 x 2 (deksel)', { name: 'EPDM-cel, zwart', density: 150, color: '#2a2a2c' });
  o.schets(yv('band', R.filter.top, 'Plane bovenkant filter'), (s) => { s.cirkel(0, 0, R.foam.r[1]); s.cirkel(0, 0, R.foam.r[0]); });
  o.extrude('boss', R.deksel.band, { naam: 'Band' });
  return o.doc();
}

/** filterdeksel (PETG, plat geprint): sluit de kern van het ringfilter bovenaan af, onder het logo; een kraag in de kern
 *  houdt het in het midden. De onderdruk trekt het op het filter (en het filter op de foamband). */
export function filterdeksel() {
  const D = R.deksel, y = R.filter.top + D.band;
  const o = new Onderdeel('Filterdeksel', PETG);
  o.schets(yv('deksel', y, 'Plane onderkant deksel'), (s) => s.cirkel(0, 0, D.r));
  o.extrude('boss', D.dik, { naam: 'Schijf' });
  o.schets(yv('kraag', y, 'Plane onderkant deksel'), (s) => { s.cirkel(0, 0, D.kraag[1]); s.cirkel(0, 0, D.kraag[0]); });
  o.extrude('boss', D.diep, { omkeren: true, terug: 0.5, naam: 'Kraag' });
  return o.doc();
}

/** de ronde instroomplaat (plat geprint, 5 mm): schijf Ø207,4 tegen de richel en de torens gelijmd; een kraag in de kern van
 *  het filter, het gat Ø106 met het vingerrooster van 7.3, en een meetkanaal 2 x 2 in de plaat van de kern naar het
 *  messingbuisje (r 101, achteraan) onder de plaat, buiten de kuip */
export function instroomplaatRond() {
  const I = R.inlaat, yb = I.top - I.dikte, V = I.vinger, R0 = I.gat;
  const o = new Onderdeel('Instroomplaat rond', PETG);
  o.schets(yv('plaatonder', yb, 'Plane onderkant instroomplaat'), (s) => s.cirkel(0, 0, R.romp.r - R.romp.wand - 0.3));
  o.extrude('boss', I.dikte, { naam: 'Plaat' });
  o.schets(yv('plaattop', I.top, 'Plane bovenkant plaat'), (s) => { s.cirkel(0, 0, I.kraag.r); s.cirkel(0, 0, R0 + 0.5); });
  o.extrude('boss', I.kraag.top - I.top, { terug: 0.5, naam: 'Kraag filter' });
  o.schets(yv('gat', I.kraag.top + 0.5, 'Plane boven de kraag'), (s) => s.cirkel(0, 0, R0));
  o.extrude('cut', I.kraag.top - yb + 1.5, { omkeren: true, naam: 'Gat' });
  // vingerrooster (EN ISO 13857, zoals 7.3): 18 ribben 1,6 op steek 7,2, een dwarsrib en twee ringen, 12 hoog
  o.schets(yv('ribben', yb + 0.05, 'Plane ribben'), (s) => {
    for (let k = -V.n; k < V.n; k++) {
      const x = (k + 0.5) * V.steek, zl = Math.sqrt(R0 * R0 - (Math.abs(x) - V.rib / 2) ** 2) + 1.5;
      s.rrectW([x - V.rib / 2, 0, -zl], [x + V.rib / 2, 0, zl]);
    }
  });
  o.extrude('boss', V.h, { naam: 'Vingerrooster ribben' });
  o.schets(yv('dwarsrib', yb + 0.1, 'Plane dwarsrib'), (s) => s.rrectW([-(R0 + 1.5), 0, -V.rib / 2], [R0 + 1.5, 0, V.rib / 2]));
  o.extrude('boss', V.h - 0.1, { naam: 'Vingerrooster dwarsrib' });
  o.schets(yv('ringen', yb + 0.15, 'Plane ringen'), (s) => V.ringen.forEach((r) => { s.cirkel(0, 0, r + V.rib / 2); s.cirkel(0, 0, r - V.rib / 2); }));
  o.extrude('boss', V.h - 0.2, { naam: 'Vingerrooster ringen' });
  // meetkanaal 2 x 2 in de plaat, van het gat (de kern: schone kant) tot boven het messingbuisje
  const MK = I.meet;
  o.schets(straalvlak('meetkanaal', 'Plane meetkanaal', MK.hoek, -1), (s) => s.lus([[R0 - 2, MK.kanaal[0]], [MK.r + 1, MK.kanaal[0]], [MK.r + 1, MK.kanaal[1]], [R0 - 2, MK.kanaal[1]]]));
  o.extrude('cut', 2, { naam: 'Meetkanaal' });
  o.schets(yvOnder('meetgat', yb, 'Plane onderkant meetpunt'), (s) => { const [x, z] = polar(MK.r, MK.hoek); s.cirkelW([x, yb, z], 1.55); });
  o.extrude('cut', MK.kanaal[1] - yb, { omkeren: true, naam: 'Gat messingbuisje' });
  return o.doc();
}

const box = /^a(2\db?|s25\d|s2\d|sa\d|sbd?\d)$/;
const knop = /^a(7|8|12|14|15|dkr?\d|dn\d|sd\d|sk\d|sdk\d)$/;

/** alle componenten van de ronde afzuiging (met de knop en de voedingsbox van 7.3) */
export function afzuigingRondComponenten(blad = R.blad, { metBoxEnKnop = true } = {}) {
  const dy = R.dy, C = M.klauw;
  const comps = [
    component('r1', 'Romp rond<1>', rompRond()),
    component('r6', 'Bovenframe rond<1>', bovenframeRond()),
    component('r2', 'Rooster LB rond<1>', roosterRond()),
    component('r3', 'Ringfilter Ø175 x Ø120 x 55<1>', ringfilter()),
    component('r3f', 'Foamband 6 x 4 (ring)<1>', foamRing()),
    component('r3d', 'Filterdeksel<1>', filterdeksel()),
    component('r3b', 'Celband 6 x 2 (deksel)<1>', dekselband()),
    component('r9', 'Instroomplaat rond<1>', instroomplaatRond()),
    component('r4', 'Ventilatorkuip<1>', kuip(), [0, dy, 0]),
    component('r4d', 'Kuipdichting<1>', kuipdichting(), [0, dy, 0]),
    component('r5', 'San Ace C175 9TG24P0S01<1>', ventilator(), [0, dy, 0]),
  ];
  const gat = (r) => Math.round(r * Math.SQRT1_2 * 1000) / 1000;
  const fanGaten = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [a * gat(M.fan.gat), b * gat(M.fan.gat)]);
  const rb = rubberbuffer(), yBuf = M.fan.top - M.fan.h - M.buffer.h + dy;
  fanGaten.forEach(([x, z], i) => comps.push(component(`r4b${i + 1}`, `Rubberbuffer Ø15 x 10 M4<${i + 1}>`, rb, [x, yBuf, z])));
  const pb = persbout();
  R.persbouten.forEach(([r, a], i) => { const [x, z] = polar(r, a); comps.push(component(`r2p${i + 1}`, `Persbout PEM FH4-M3-6<${i + 1}>`, pb, [x, R.frame.dikte, z])); });
  // klauwen: de arm van het onderdeel wijst naar +X; gedraaid om Y over -a wijst hij naar buiten (uitgezwaaid)
  const k = klauw(), kr = klauwrubber(), yk = -blad - C.rubber.h - C.dik;
  const m5n = moer('M5 zeskantmoer DIN 934', C.moer.s, C.moer.m, 4.3);
  const m5 = schroefVerzonken('M5 x 65 DIN 7991', 5, 4.2, 65);
  R.klauw.hoeken.forEach((a, i) => {
    const [x, z] = polar(R.klauw.r, a), h = rad(-a) / 2, rot = { rotation: [0, Math.sin(h), 0, Math.cos(h)] };
    comps.push(component(`rk${i + 1}`, `Klauw<${i + 1}>`, k, [x, yk, z], rot));
    comps.push(component(`rkr${i + 1}`, `Klauwrubber<${i + 1}>`, kr, [x, yk, z], rot));
    comps.push(component(`rn${i + 1}`, `M5 zeskantmoer DIN 934<${i + 1}>`, m5n, [x, yk + 0.2, z], rot)); // zelfde draai als de klauw: de zeskant past in de kamer
    comps.push(component(`rs5${i + 1}`, `M5 x 65 DIN 7991<${i + 1}>`, m5, [x, R.frame.dikte, z]));
  });
  const omhoog = [1, 0, 0, 0];
  const m3p = schroefCilinder('M3 x 12 DIN 912', 5.5, 3, 2.5, 12);
  [0, 90, 180, 270].forEach((a, i) => { const [x, z] = polar(M.kuip.oor.schroef, a); comps.push(component(`rs3${i + 1}`, `M3 x 12 DIN 912<${i + 1}>`, m3p, [x, M.kuip.oor.top - 4 + dy, z], { rotation: omhoog })); });
  const m4 = schroefVerzonken('M4 x 8 DIN 7991', 4, 3.4, 8), de = stift('Draadeind M4 x 8 DIN 913', 3.4, 8);
  fanGaten.forEach(([x, z], i) => comps.push(component(`rs4${i + 1}`, `M4 x 8 DIN 7991<${i + 1}>`, m4, [x, M.kuip.bodem + dy, z], { rotation: omhoog })));
  fanGaten.forEach(([x, z], i) => comps.push(component(`rs6${i + 1}`, `Draadeind M4 x 8 DIN 913<${i + 1}>`, de, [x, yBuf + M.buffer.h + 4, z])));
  const [mx, mz] = polar(R.inlaat.meet.r, R.inlaat.meet.hoek);
  comps.push(component('r18', 'Messingbuisje Ø3 x 12<1>', messingbuisje(12), [mx, R.inlaat.meet.kanaal[0], mz])); // tot onder in het kanaal
  if (metBoxEnKnop) comps.push(...afzuigingComponenten([0, 0, 0], 'a', blad).components.filter((c) => box.test(c.id) || knop.test(c.id)));
  return comps;
}

/** de assemblage: de ronde afzuiging met de knop en de voedingsbox van 7.3 */
export function afzuigingRond() {
  return { format: 'phlippo-cad', version: 1, name: 'Afzuiging rond', units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components: afzuigingRondComponenten(), mates: [] };
}

export const ONDERDELEN_ROND = {
  'Romp-rond.kcad': rompRond,
  'Bovenframe-rond.kcad': bovenframeRond,
  'Rooster-LB-rond.kcad': roosterRond,
  'Instroomplaat-rond.kcad': instroomplaatRond,
  'Filterdeksel.kcad': filterdeksel,
  'Ringfilter-175x120x55.kcad': ringfilter,
  'Foamband-ring.kcad': foamRing,
  'Celband-deksel.kcad': dekselband,
  // ongewijzigd uit 7.3 (in de assemblage 18 mm lager): hier ook, zodat de map volledig is
  'Ventilatorkuip.kcad': kuip,
  'Klauw.kcad': klauw,
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const schrijf = (naam, doc) => writeFileSync(join(HERE, naam), JSON.stringify(doc, null, 1) + '\n');
  for (const [naam, f] of Object.entries(ONDERDELEN_ROND)) schrijf(naam, f());
  schrijf('Afzuiging-rond.kcad', afzuigingRond());
  console.log('geschreven:', [...Object.keys(ONDERDELEN_ROND), 'Afzuiging-rond.kcad'].join(', '));
}
