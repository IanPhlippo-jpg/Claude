// Ingebouwde nagelstofafzuiging voor het bureau (2026-11-05), als Phlippo CAD-documenten.
//
// De module zakt van bovenaf in een rechthoekige uitsparing in het tafelblad (196 x 140 mm, hoekradius 5 = frees Ø10)
// en hangt aan haar flens. Vier klauwen zoals bij een Niko-inbouwdoos zetten haar vast: draai je de schroef van
// bovenaf aan, dan draait de klauw door een sleuf in de wand naar buiten en trekt ze zich tegen de onderkant van het
// blad. Het RVS-rooster (lasergesneden, met het LB-monogram) ligt bovenop in de flens en dekt de schroeven af.
// Onder het blad: een filterlade met een G4-filtermat die je vooraan uittrekt, daaronder een ventilator van 120 mm.
//
// Assenstelsel van de module: oorsprong in het midden van de uitsparing op het bovenvlak van het blad, Y omhoog,
// +Z naar de voorkant van het bureau (de lade komt naar voren). Het blad is 34 mm dik (LAGKAPTEN).
// Alle PLA-delen passen op een printbed van 220 x 220 mm.
// Gebruik: node voorbeelden/afzuiging/maak-afzuiging.mjs   (eerst logo/trace.py en logo/rooster.py)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Onderdeel, TOP, component, vlak } from '../lib/schets.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const M = {
  blad: 34,
  rooster: { b: 196, d: 140, dikte: 1.5 },
  flens: { b: 214, d: 158, r: 6, dikte: 3 },
  kom: { b: 196.6, d: 140.6, r: 3.3, diepte: 1.6 }, // uitsparing in de flens voor het rooster
  romp: { b: 194, d: 138, r: 4, wand: 4, onder: -100 }, // buitenmaat onder de flens; open onderkant
  uitsparing: { b: 196, d: 140, r: 5 }, // te frezen in het blad
  klauw: { x: 89, z: 40, naaf: 6, arm: 17, breed: 7, hoog: 8 }, // schroefas op (±x, ±z), M4
  lade: { notch: 91.5, boven: -52, onder: -80, top: -54, breed: 91, front: 91.2, achter: -64.5, uitschuif: 110 },
  richel: { binnen: 88, boven: -80, dikte: 3 },
  vplaat: { dikte: 3 },
  fan: { maat: 120, gat: 105, dikte: 25 }, // Noctua NF-F12 industrialPPC-3000 PWM
  dial: { x: 250, z: 200, maat: 51, hoogte: 32.3, uitsparing: 59 }, // M5Stack Dial
  ebox: { x: -170, b: 84, d: 54, h: 32 },
};

const PLA = { name: 'PLA, wit', density: 1240, color: '#f4f4f1' };
const RVS = { name: 'AISI 304', density: 8000, color: '#c9ccd1' };
const ZWART = { name: 'PBT, zwart', density: 1300, color: '#2c2c2e' };
const FILTER = { name: 'Filtermat G4', density: 60, color: '#ebe8df' };
const DIAL = { name: 'ABS, grijs', density: 1050, color: '#5a5e66' };
const PCB = { name: 'FR4', density: 1850, color: '#2f7d4a' };

const yv = (id, y, kind = 'face', name) => vlak(id, name ?? (kind === 'face' ? `Face ${id}` : `Plane ${id}`), [0, y, 0], [0, 1, 0], kind);

/** de inbouwmodule (één print, flens naar beneden op het bed) */
export function inbouwmodule() {
  const { flens: F, kom: K, romp: R, klauw: C, lade: L, richel: RI } = M;
  const o = new Onderdeel('Inbouwmodule', PLA);
  const zs = [C.z, -C.z];
  // flens op het blad en de romp door het blad heen (de romp steekt 2 mm in de flens: één body)
  o.schets(TOP, (s) => s.rrect(-F.b / 2, -F.d / 2, F.b / 2, F.d / 2, F.r));
  o.extrude('boss', F.dikte, { naam: 'Flens' });
  o.schets(TOP, (s) => s.rrect(-R.b / 2, -R.d / 2, R.b / 2, R.d / 2, R.r));
  o.extrude('boss', -R.onder, { omkeren: true, terug: 2, naam: 'Romp' });
  // kom voor het rooster
  const yk = F.dikte - K.diepte;
  o.schets(yv('flens', F.dikte), (s) => s.rrect(-K.b / 2, -K.d / 2, K.b / 2, K.d / 2, K.r));
  o.extrude('cut', K.diepte, { omkeren: true, naam: 'Kom rooster' });
  // holte, met in de zijwanden vier kolommen voor de klauwschroeven
  const xi = R.b / 2 - R.wand, zi = R.d / 2 - R.wand, xk = 84, hb = 8;
  const rechts = [[xi, -zi], [xi, -C.z - hb], [xk, -C.z - hb], [xk, -C.z + hb], [xi, -C.z + hb], [xi, C.z - hb], [xk, C.z - hb], [xk, C.z + hb], [xi, C.z + hb], [xi, zi]];
  const lus = [...rechts, ...rechts.slice().reverse().map(([x, z]) => [-x, z])].map(([x, z]) => [x, 0, z]);
  // boven: holte met de kolommen tot 50 mm onder het bovenvlak (daaronder lopen de klauwen niet meer)
  o.schets(yv('kom', yk), (s) => s.lusW(lus));
  o.extrude('cut', yk + 50.5, { omkeren: true, naam: 'Holte boven' });
  // onder: de volle holte (lade en ventilatorruimte), open aan de onderkant
  o.schets(yv('holte', -50, 'reference', 'Plane einde kolommen'), (s) => s.rrectW([-xi, 0, -zi], [xi, 0, zi]));
  o.extrude('cut', 50 - R.onder + 0.5, { omkeren: true, naam: 'Holte onder' });
  // schroeven M4: verzonken kop onder het rooster en een gat door de kolom
  const assen = [C.x, -C.x].flatMap((x) => zs.map((z) => [x, z]));
  o.schets(yv('kom', yk), (s) => assen.forEach(([x, z]) => s.cirkelW([x, 0, z], 4.25)));
  o.extrude('cut', 4.5, { omkeren: true, naam: 'Verzinking schroeven' }); // M4-cilinderkop (DIN 912) is 4 mm hoog
  o.schets(yv('kom', yk), (s) => assen.forEach(([x, z]) => s.cirkelW([x, 0, z], 2.25)));
  o.extrude('cut', yk + 50.6, { omkeren: true, naam: 'Gaten schroeven' });
  // klauwkanaal: de naaf schuift erin op en neer (van de onderkant van de kolom tot 1 mm boven de klemstand)
  o.schets(yv('klauwtop', -M.blad + 1, 'reference', 'Plane klauwen'), (s) =>
    assen.forEach(([x, z]) => s.rrectW([x - C.naaf - 0.3, 0, z - C.naaf - 0.3], [x + C.naaf + 0.3, 0, z + C.naaf + 0.3])));
  o.extrude('cut', 18, { omkeren: true, naam: 'Klauwkanalen' });
  // ingetrokken klauw: de arm ligt langs de wand (rechts naar achteren, links naar voren, zodat aandraaien
  // met de klok mee de arm naar buiten zwaait)
  const yIn = -M.blad - C.hoog + 1;
  o.schets(yv('klauwin', yIn, 'reference', 'Plane klauwen ingetrokken'), (s) =>
    assen.forEach(([x, z]) => (x > 0 ? s.rrectW([x - 4, 0, z - C.arm - 0.5], [x + 4, 0, z]) : s.rrectW([x - 4, 0, z], [x + 4, 0, z + C.arm + 0.5]))));
  o.extrude('cut', 10, { omkeren: true, naam: 'Klauwen ingetrokken' });
  // sleuf in de zijwand voor de uitgeklapte arm, met onderaan het venster waardoor de arm naar buiten zwaait
  for (const kant of [1, -1]) {
    const pl = vlak(kant > 0 ? 'wandR' : 'wandL', kant > 0 ? 'Face wand rechts' : 'Face wand links', [kant * R.b / 2, 0, 0], [kant, 0, 0]);
    o.schets(pl, (s) => zs.forEach((z) => {
      const b = 4, w = C.arm + 0.5;
      const y0 = -50.5, y1 = -M.blad + 1, yw = yIn;
      // L-vorm in (z, y): sleuf z ± b tot y1, venster tot z ∓ w (de kant waar de arm ingetrokken ligt)
      const zw = kant > 0 ? z - w : z + w;
      s.lusW([[0, y0, z - kant * -b], [0, y0, zw], [0, yw, zw], [0, yw, z + kant * -b], [0, y1, z + kant * -b], [0, y1, z - kant * -b]]
        .map(([, y, zz]) => [kant * R.b / 2, y, zz]));
    }));
    o.extrude('cut', R.wand + 1, { omkeren: true, naam: kant > 0 ? 'Sleuven rechts' : 'Sleuven links' });
  }
  // opening voor de filterlade in de voorwand, open tot de onderkant
  o.schets(vlak('voor', 'Face voorwand', [0, 0, R.d / 2], [0, 0, 1]), (s) => s.rrectW([-L.notch, R.onder - 0.5, 0], [L.notch, L.boven, 0]));
  o.extrude('cut', R.wand + 1, { omkeren: true, naam: 'Opening lade' });
  // richels waar de lade op loopt
  o.schets(vlak('richels', 'Plane richels', [0, 0, 64.5], [0, 0, 1], 'reference'), (s) => [1, -1].forEach((k) =>
    s.rrectW([k * RI.binnen, RI.boven - RI.dikte, 0], [k * (xi + 0.5), RI.boven, 0])));
  o.extrude('boss', 64.5 + zi + 1, { omkeren: true, naam: 'Richels' });
  // kolommetjes in de hoeken voor de ventilatorplaat (M3 zelftappend)
  const ho = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const yo = R.onder + 0.5;
  o.schets(yv('onder', yo, 'reference', 'Plane ventilatorplaat'), (s) => ho.forEach(([kx, kz]) =>
    s.rrectW([kx * 84, 0, kz * 55], [kx * (xi + 0.5), 0, kz > 0 ? zi : -(zi + 0.5)])));
  o.extrude('boss', 12, { naam: 'Hoekbussen' });
  o.schets(yv('onder', yo, 'reference', 'Plane ventilatorplaat'), (s) => ho.forEach(([kx, kz]) => s.cirkelW([kx * 88.75, 0, kz * 60], 1.4)));
  o.extrude('cut', 10, { naam: 'Gaten hoekbussen' });
  return o.doc();
}

/** het lasergesneden rooster, uit laser/rooster.loops (geschreven door logo/rooster.py) */
export function rooster() {
  const loops = JSON.parse(readFileSync(join(HERE, 'laser', 'rooster.loops'), 'utf8'));
  const yk = M.flens.dikte - M.kom.diepte;
  const o = new Onderdeel('Rooster LB', RVS);
  // vlak met normaal +Y: schets-x = X, schets-y = -Z; het monogram leest goed van voor het bureau
  o.schets(yv('kom', yk), (s) => { s.lus(loops.outer); loops.holes.forEach((h) => s.lus(h)); });
  o.extrude('boss', loops.dikte, { naam: 'Plaat' });
  return o.doc();
}

/** de filterlade (getekend in de stand 'dicht', in het assenstelsel van de module) */
export function filterlade() {
  const { lade: L } = M;
  const o = new Onderdeel('Filterlade', PLA);
  const zf = M.romp.d / 2 - M.romp.wand; // achterkant van het front = binnenkant van de voorwand
  const pv = vlak('ladefront', 'Plane ladefront', [0, 0, zf], [0, 0, 1], 'reference');
  o.schets(pv, (s) => s.rrectW([-L.front, -99.6, 0], [L.front, L.boven - 0.4, 0]));
  o.extrude('boss', M.romp.wand, { naam: 'Front' });
  // de bak steekt 2 mm in het front (één body); het front zelf blijft in de opening van de voorwand
  o.schets(pv, (s) => s.rrectW([-L.breed, L.onder, 0], [L.breed, L.top, 0]));
  o.extrude('boss', zf - L.achter, { omkeren: true, terug: 2, naam: 'Bak' });
  o.schets(yv('bak', L.top), (s) => s.rrectW([-(L.breed - 2), 0, L.achter + 2], [L.breed - 2, 0, zf - 2]));
  o.extrude('cut', L.top - L.onder - 2, { omkeren: true, naam: 'Holte bak' });
  // roosterbodem: vakjes van 18 mm met ribben van 3 mm; de randen die op de richels lopen blijven dicht
  o.schets(yv('bodem', L.onder + 2), (s) => {
    const nx = 8, nz = 5, p = 21, c = 18;
    const x0 = -(nx * p - 3) / 2, z0 = -(nz * p - 3) / 2 + 0.25;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) s.rrectW([x0 + i * p, 0, z0 + j * p], [x0 + i * p + c, 0, z0 + j * p + c]); // rechte hoeken: 40 afgeronde vakjes kosten de mesh-kernel 40 s
  });
  o.extrude('cut', 3, { omkeren: true, naam: 'Roosterbodem' });
  o.schets(vlak('frontvoor', 'Face front', [0, 0, zf + M.romp.wand], [0, 0, 1]), (s) => s.rrectW([-22, -99.6, 0], [22, -90, 0], 2));
  o.extrude('boss', 10, { terug: 1, naam: 'Handgreep' });
  // schot van 45° achter het stuk front onder de bak: de lade print op haar achterkant zonder support
  const h = L.onder - -99.6;
  o.schets(vlak('schot', 'Plane schot', [-80, 0, 0], [1, 0, 0], 'reference'), (s) =>
    s.lusW([[-80, L.onder + 0.5, zf + 0.5], [-80, -99.6, zf + 0.5], [-80, L.onder + 0.5, zf - h - 0.5]]));
  o.extrude('boss', 160, { naam: 'Steunschot' });
  return o.doc();
}

export function filtermat() {
  const { lade: L } = M;
  const o = new Onderdeel('Filtermat G4', FILTER);
  o.schets(yv('mat', L.onder + 2, 'reference', 'Plane mat'), (s) => s.rrectW([-(L.breed - 2.2), 0, L.achter + 2.2], [L.breed - 2.2, 0, 62.8]));
  o.extrude('boss', 10, { naam: 'Mat' });
  return o.doc();
}

/** plaat onder de module met de ventilator eraan (M4-bouten door ventilator en plaat) */
export function ventilatorplaat() {
  const { romp: R } = M;
  const o = new Onderdeel('Ventilatorplaat', PLA);
  o.schets(yv('plaat', R.onder, 'reference', 'Plane ventilatorplaat'), (s) => {
    s.rrect(-R.b / 2, -R.d / 2, R.b / 2, R.d / 2, R.r);
    s.cirkel(0, 0, 58);
    for (const kx of [1, -1]) for (const kz of [1, -1]) {
      s.cirkel(kx * M.fan.gat / 2, kz * M.fan.gat / 2, 2.25);
      s.cirkel(kx * 88.75, kz * 60, 1.7);
    }
  });
  o.extrude('boss', M.vplaat.dikte, { omkeren: true, naam: 'Plaat' });
  return o.doc();
}

/** vereenvoudigde Noctua NF-F12 industrialPPC-3000 PWM: kader, naaf, spaken en zeven schoepen */
export function ventilator() {
  const { fan: V } = M;
  const y0 = M.romp.onder - M.vplaat.dikte - V.dikte;
  const o = new Onderdeel('Noctua NF-F12 iPPC-3000 PWM', ZWART);
  o.schets(yv('fan', y0, 'reference', 'Plane ventilator'), (s) => {
    s.rrect(-V.maat / 2, -V.maat / 2, V.maat / 2, V.maat / 2, 5);
    s.cirkel(0, 0, 56.5);
    for (const kx of [1, -1]) for (const kz of [1, -1]) s.cirkel(kx * V.gat / 2, kz * V.gat / 2, 2.15);
  });
  o.extrude('boss', V.dikte, { naam: 'Kader' });
  o.schets(yv('fan', y0, 'reference', 'Plane ventilator'), (s) => s.cirkel(0, 0, 21));
  o.extrude('boss', 22, { naam: 'Naaf' });
  o.schets(yv('spaak', y0 + 0.5, 'reference', 'Plane spaken'), (s) => {
    s.rrect(19, -1.5, 57.5, 1.5); s.rrect(-57.5, -1.5, -19, 1.5); s.rrect(-1.5, 19, 1.5, 57.5); s.rrect(-1.5, -57.5, 1.5, -19);
  });
  o.extrude('boss', 3, { naam: 'Spaken' });
  o.schets(yv('schoep', y0 + 5, 'reference', 'Plane schoepen'), (s) => {
    for (let i = 0; i < 7; i++) {
      const a = (i * 2 * Math.PI) / 7, t = 1.2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const p = (r, w) => [r * ca - w * sa, r * sa + w * ca];
      s.lus([p(19, -t), p(54, -t - 6), p(54, t - 6), p(19, t)]);
    }
  });
  o.extrude('boss', 16, { naam: 'Schoepen' });
  return o.doc();
}

/** klauw: naaf met M4-moer (van onderen ingedrukt) en een arm; oorsprong op de schroefas, onderkant op Y = 0 */
export function klauw() {
  const { klauw: C } = M;
  const o = new Onderdeel('Klauw', PLA);
  const w = C.breed / 2, xr = Math.sqrt(C.naaf * C.naaf - w * w);
  o.schets(TOP, (s) => s.pad([[xr, -w], [C.arm, -w], [C.arm, w], [xr, w], { boog: [0, 0], naar: [xr, -w], ccw: true }]));
  o.extrude('boss', C.hoog, { naam: 'Klauw' });
  o.schets(yv('boven', C.hoog), (s) => s.cirkel(0, 0, 2.25));
  o.extrude('cut', C.hoog + 1, { omkeren: true, naam: 'Gat M4' });
  // zeskantmoer M4 (sleutelwijdte 7 mm, 0,2 speling), 3,4 diep van onderen
  const R = 7.2 / Math.sqrt(3);
  o.schets(TOP, (s) => s.lus(Array.from({ length: 6 }, (_, i) => [R * Math.cos((i * Math.PI) / 3 + Math.PI / 6), R * Math.sin((i * Math.PI) / 3 + Math.PI / 6)])));
  o.extrude('cut', 3.4, { naam: 'Moer M4' });
  return o.doc();
}

/** houder voor de M5Stack Dial in het blad; oorsprong in het midden van de uitsparing op het bovenvlak van het blad */
export function dialhouder() {
  const o = new Onderdeel('Dialhouder', PLA);
  o.schets(TOP, (s) => s.rrect(-33.5, -33.5, 33.5, 33.5, 8));
  o.extrude('boss', 3, { naam: 'Flens' });
  o.schets(TOP, (s) => s.rrect(-28.5, -28.5, 28.5, 28.5, 4));
  o.extrude('boss', 24, { omkeren: true, terug: 2, naam: 'Kuip' });
  o.schets(yv('flens', 3), (s) => s.rrect(-25.9, -25.9, 25.9, 25.9, 3));
  o.extrude('cut', 24, { omkeren: true, naam: 'Kom' });
  o.schets(yv('bodem', -21), (s) => s.cirkel(0, 0, 7));
  o.extrude('cut', 4, { omkeren: true, naam: 'Kabelgat' });
  return o.doc();
}

/** M5Stack Dial (vereenvoudigd: 51 x 51 x 32,3 mm); oorsprong onder in het midden */
export function m5dial() {
  const o = new Onderdeel('M5Stack Dial', DIAL);
  o.schets(TOP, (s) => s.rrect(-25.5, -25.5, 25.5, 25.5, 6));
  o.extrude('boss', 22, { naam: 'Behuizing' });
  o.schets(yv('boven', 22), (s) => s.cirkel(0, 0, 23));
  o.extrude('boss', 10.3, { terug: 1, naam: 'Draaiknop met scherm' });
  return o.doc();
}

/** doosje onder het blad voor de interfaceprint; oorsprong boven in het midden, tegen de onderkant van het blad */
export function elektronicabox() {
  const { ebox: E } = M;
  const o = new Onderdeel('Elektronicabox', PLA);
  const x = E.b / 2, z = E.d / 2;
  o.schets(TOP, (s) => s.lus([[-x, -z], [x, -z], [x, -10], [x + 12, -10], [x + 12, 10], [x, 10], [x, z], [-x, z], [-x, 10], [-x - 12, 10], [-x - 12, -10], [-x, -10]]));
  o.extrude('boss', 3, { omkeren: true, naam: 'Plaat met oren' });
  o.schets(yv('body', -1, 'reference', 'Plane doos'), (s) => s.rrect(-x, -z, x, z));
  o.extrude('boss', E.h - 1, { omkeren: true, terug: 0.5, naam: 'Doos' });
  o.schets(vlak('dbodem', 'Face onderkant', [0, -E.h, 0], [0, -1, 0]), (s) => s.rrectW([-(x - 2), -E.h, -(z - 2)], [x - 2, -E.h, z - 2]));
  o.extrude('cut', E.h - 3, { omkeren: true, naam: 'Holte' });
  o.schets(yv('doostop', 0), (s) => [1, -1].forEach((k) => s.cirkel(k * (x + 6), 0, 2)));
  o.extrude('cut', 4, { omkeren: true, naam: 'Gaten oren' });
  o.schets(vlak('links', 'Face links', [-x, 0, 0], [-1, 0, 0]), (s) => s.cirkelW([-x, -16, 0], 4));
  o.extrude('cut', 3, { omkeren: true, naam: 'DC-bus' });
  o.schets(vlak('rechts', 'Face rechts', [x, 0, 0], [1, 0, 0]), (s) => [12, -12].forEach((zz) => s.cirkelW([x, -16, zz], 3)));
  o.extrude('cut', 3, { omkeren: true, naam: 'Kabels ventilator en dial' });
  const bus = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([kx, kz]) => [kx * (x - 4.8), kz * (z - 4.8)]);
  o.schets(yv('bus', -E.h + 0.5, 'reference', 'Plane bussen'), (s) => bus.forEach(([bx, bz]) => s.cirkelW([bx, 0, bz], 3.2)));
  o.extrude('boss', E.h - 3, { naam: 'Schroefbussen' });
  o.schets(yv('bus', -E.h + 0.5, 'reference', 'Plane bussen'), (s) => bus.forEach(([bx, bz]) => s.cirkelW([bx, 0, bz], 1.1)));
  o.extrude('cut', 10, { naam: 'Gaten bussen' });
  return o.doc();
}

export function deksel() {
  const { ebox: E } = M;
  const o = new Onderdeel('Deksel elektronicabox', PLA);
  const x = E.b / 2, z = E.d / 2;
  o.schets(yv('deksel', -E.h, 'reference', 'Plane deksel'), (s) => {
    s.rrect(-x, -z, x, z);
    for (const [kx, kz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) s.cirkel(kx * (x - 4.8), kz * (z - 4.8), 1.4);
  });
  o.extrude('boss', 2, { omkeren: true, naam: 'Deksel' });
  return o.doc();
}

/** interfaceprint (gaatjesprint 50 x 30 met transistor, weerstanden en schroefklemmen), op dubbelzijdige tape op het deksel */
export function interfaceprint() {
  const { ebox: E } = M;
  const o = new Onderdeel('Interfaceprint', PCB);
  const yb = -E.h + 1;
  o.schets(yv('print', yb, 'reference', 'Plane print'), (s) => s.rrect(-25, -15, 25, 15));
  o.extrude('boss', 1.6, { naam: 'Print' });
  o.schets(yv('klem', yb + 1.2, 'reference', 'Plane klemmen'), (s) => { s.rrect(8, -14, 23, 14); s.rrect(-23, -6, -12, 6); });
  o.extrude('boss', 10, { naam: 'Klemmen' });
  return o.doc();
}

/** de mates van de filterlade: op de richels, in het midden, tussen dicht en uitgetrokken (zoals de bureaulades) */
export function ladeMates(moduleId, ladeId, matId, prefix = '') {
  const ref = (componentId, kind, label, normal, point) => ({ componentId, kind, label, normal, point });
  const zf = M.romp.d / 2 - M.romp.wand;
  return [
    { id: `${prefix}ma`, type: 'coincident', name: 'Lade op richel', folder: 'Afzuiging', aligned: false, suppressed: false, refs: [
      ref(moduleId, 'face', 'Richel<1>@Inbouwmodule', [0, 1, 0], [90.5, M.richel.boven, 0]),
      ref(ladeId, 'face', 'Bodem@Filterlade', [0, -1, 0], [89.5, M.lade.onder, 0]),
    ] },
    { id: `${prefix}mb`, type: 'coincident', name: 'Lade in het midden', folder: 'Afzuiging', aligned: true, suppressed: false, refs: [
      ref(moduleId, 'plane', 'Right Plane@Inbouwmodule', [1, 0, 0], [0, 0, 0]),
      ref(ladeId, 'plane', 'Right Plane@Filterlade', [1, 0, 0], [0, 0, 0]),
    ] },
    { id: `${prefix}mc`, type: 'distanceLimit', name: 'Uitschuif filterlade', folder: 'Afzuiging', aligned: false, suppressed: false, value: 0, min: 0, max: M.lade.uitschuif, refs: [
      ref(moduleId, 'face', 'Face voorwand binnen@Inbouwmodule', [0, 0, 1], [0, -90, zf]),
      ref(ladeId, 'face', 'Front achterkant@Filterlade', [0, 0, -1], [0, -90, zf]),
    ] },
    { id: `${prefix}md`, type: 'lock', name: 'Filtermat in de lade', folder: 'Afzuiging', aligned: false, suppressed: false,
      relative: { position: [0, 0, 0], rotation: [0, 0, 0, 1] }, refs: [
        ref(ladeId, 'origin', 'Origin@Filterlade', [0, 1, 0], [0, 0, 0]),
        ref(matId, 'origin', 'Origin@Filtermat G4', [0, 1, 0], [0, 0, 0]),
      ] },
  ];
}

/** alle componenten van de afzuiging, verschoven met `o` (de oorsprong van de module in de assemblage) */
export function afzuigingComponenten(o = [0, 0, 0], prefix = 'a') {
  const at = (p) => [o[0] + p[0], o[1] + p[1], o[2] + p[2]];
  const C = M.klauw;
  const yKlem = -M.blad - C.hoog; // klauw tegen de onderkant van het blad
  const halfY = [0, 1, 0, 0]; // 180° om Y: de arm wijst naar -X
  const comps = [
    component(`${prefix}1`, 'Inbouwmodule<1>', inbouwmodule(), at([0, 0, 0])),
    component(`${prefix}2`, 'Rooster LB<1>', rooster(), at([0, 0, 0])),
    component(`${prefix}3`, 'Filterlade<1>', filterlade(), at([0, 0, 0]), { fixed: false }),
    component(`${prefix}4`, 'Filtermat G4<1>', filtermat(), at([0, 0, 0]), { fixed: false }),
    component(`${prefix}5`, 'Ventilatorplaat<1>', ventilatorplaat(), at([0, 0, 0])),
    component(`${prefix}6`, 'Noctua NF-F12 iPPC-3000 PWM<1>', ventilator(), at([0, 0, 0])),
  ];
  const k = klauw();
  [[C.x, C.z], [C.x, -C.z], [-C.x, C.z], [-C.x, -C.z]].forEach(([x, z], i) =>
    comps.push(component(`${prefix}k${i + 1}`, `Klauw<${i + 1}>`, k, at([x, yKlem, z]), { rotation: x > 0 ? [0, 0, 0, 1] : halfY })));
  const d = M.dial;
  comps.push(component(`${prefix}7`, 'Dialhouder<1>', dialhouder(), at([d.x, 0, d.z])));
  comps.push(component(`${prefix}8`, 'M5Stack Dial<1>', m5dial(), at([d.x, -21, d.z])));
  const e = [M.ebox.x, -M.blad, 0];
  comps.push(component(`${prefix}9`, 'Elektronicabox<1>', elektronicabox(), at(e)));
  comps.push(component(`${prefix}10`, 'Deksel elektronicabox<1>', deksel(), at(e)));
  comps.push(component(`${prefix}11`, 'Interfaceprint<1>', interfaceprint(), at(e)));
  return { components: comps, mates: ladeMates(`${prefix}1`, `${prefix}3`, `${prefix}4`, `${prefix}m`) };
}

/** de assemblage van de afzuiging alleen (met een stuk tafelblad om haar in te zien zitten) */
export function afzuiging() {
  const { components, mates } = afzuigingComponenten();
  return { format: 'phlippo-cad', version: 1, name: 'Afzuiging', units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components, mates };
}

/** de uitsparingen die in het tafelblad gefreesd worden (in het assenstelsel van het blad: bovenvlak op Y = 34) */
export function bladUitsparingen(o, x0 = 0, z0 = 0) {
  const { uitsparing: U, dial: D } = M;
  o.schets(vlak('bladtop', 'Face bovenvlak', [0, M.blad, 0], [0, 1, 0]), (s) => {
    s.rrectW([x0 - U.b / 2, 0, z0 - U.d / 2], [x0 + U.b / 2, 0, z0 + U.d / 2], U.r);
    s.rrectW([x0 + D.x - D.uitsparing / 2, 0, z0 + D.z - D.uitsparing / 2], [x0 + D.x + D.uitsparing / 2, 0, z0 + D.z + D.uitsparing / 2], 5);
  });
  o.extrude('cut', M.blad + 1, { omkeren: true, naam: 'Uitsparingen afzuiging' });
}

export const ONDERDELEN = {
  'Inbouwmodule.kcad': inbouwmodule,
  'Rooster-LB.kcad': rooster,
  'Filterlade.kcad': filterlade,
  'Filtermat.kcad': filtermat,
  'Ventilatorplaat.kcad': ventilatorplaat,
  'Ventilator-NF-F12.kcad': ventilator,
  'Klauw.kcad': klauw,
  'Dialhouder.kcad': dialhouder,
  'M5Stack-Dial.kcad': m5dial,
  'Elektronicabox.kcad': elektronicabox,
  'Deksel-elektronicabox.kcad': deksel,
  'Interfaceprint.kcad': interfaceprint,
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const schrijf = (naam, doc) => writeFileSync(join(HERE, naam), JSON.stringify(doc, null, 1) + '\n');
  for (const [naam, f] of Object.entries(ONDERDELEN)) schrijf(naam, f());
  schrijf('Afzuiging.kcad', afzuiging());
  console.log('geschreven:', [...Object.keys(ONDERDELEN), 'Afzuiging.kcad'].join(', '));
}
