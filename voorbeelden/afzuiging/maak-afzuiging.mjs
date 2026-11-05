// Ingebouwde nagelstofafzuiging voor het bureau (versie 2, 2026-11-05), als Phlippo CAD-documenten.
//
// De module zakt van bovenaf in een rechthoekige uitsparing in het tafelblad (196 x 140 mm, hoekradius 5 = frees Ø10)
// en hangt aan haar afgeschuinde flens. Vier klauwen zoals bij een Niko-inbouwdoos zetten haar vast: draai je de schroef
// van bovenaf aan, dan zwaait de klauw door een venster in de zijwand naar buiten en trekt ze zich tegen de onderkant
// van het blad. Elke klauw zit in een gesloten toren: het luchtkanaal heeft geen opening naar buiten behalve het
// rooster bovenaan en het uitblaasrooster onderaan (het ladefront overlapt de voorwand en sluit af met schuimband).
//
// Luchtweg: RVS-rooster (lasergesneden, LB-monogram) -> filterlade met drie lagen (G4-voorfilter, M5-fijnstofmat,
// actieve koolmat tegen de geur van acryl) -> ventilator Delta PFR1212UHE-SP00 (120 x 38 mm, 300 Pa, PWM) binnen de
// behuizing -> uitblaasplaat met schuine lamellen die de lucht naar achteren sturen, weg van de benen.
//
// Assenstelsel van de module: oorsprong in het midden van de uitsparing op het bovenvlak van het blad, Y omhoog,
// +Z naar de voorkant van het bureau (de lade komt naar voren). Het blad is 34 mm dik (LAGKAPTEN).
// Alle PLA-delen passen op een printbed van 220 x 220 mm en printen zonder support.
// Gebruik: node voorbeelden/afzuiging/maak-afzuiging.mjs   (eerst logo/trace.py en logo/rooster.py)
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Onderdeel, TOP, component, vlak } from '../lib/schets.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const M = {
  blad: 34,
  rooster: { b: 196, d: 140, dikte: 1.5 },
  flens: { b: 214, d: 158, r: 6, dikte: 3, schuin: 45 }, // afgeschuind onder 45°
  kom: { b: 196.6, d: 140.6, r: 3.3, diepte: 1.6 }, // uitsparing in de flens voor het rooster
  romp: { b: 194, d: 138, r: 4, wand: 4, onder: -144 }, // buitenmaat onder de flens; onderaan de uitblaasplaat
  uitsparing: { b: 196, d: 140, r: 5 }, // te frezen in het blad
  klauw: { x: 89, z: 40, naaf: 6, arm: 17, breed: 7, hoog: 8 }, // schroefas op (±x, ±z), M4
  toren: { binnen: 80, voor: 8.5, achter: 20.5, onder: -53 }, // gesloten toren rond elke klauw
  lade: { notch: 91.5, boven: -52, top: -56, bodem: -98, breed: 91, achter: -64.5, uitschuif: 110 },
  front: { b: 97, onder: -144, boven: -50, dikte: 6 }, // overlapt de voorwand rondom (schuimband)
  richel: { binnen: 88, boven: -98, dikte: 3 },
  filters: [
    // lage weerstand voor veel zuigkracht: een vlakke F7-mat op 217 cm² zou de luchtstroom smoren
    { id: 'g4', naam: 'Voorfilter G4', dikte: 10, kleur: '#ebe8df' },
    { id: 'm5', naam: 'Fijnstoffilter M5', dikte: 15, kleur: '#f6f6f2' },
    { id: 'kool', naam: 'Actieve koolmat', dikte: 10, kleur: '#2f3033' },
  ],
  fan: { maat: 120, gat: 105, dikte: 38, top: -106 }, // Delta PFR1212UHE-SP00
  uitblaas: { dikte: 6, steek: 8, lamel: 2 },
  dial: { x: 250, z: 200, d: 51, hoogte: 32.3, gat: 60, vloer: -18.3 }, // M5Stack Dial, gatzaag Ø60
  // meetpunten voor de verschildrukmeter (Sensirion SDP810-500Pa) in de linker zijwand, boven en onder de filters;
  // siliconeslang 4 x 6 mm, van onderen in het gat gedrukt (niets steekt buiten de romp: de module zakt door het blad)
  meetpunt: { z: 0, boven: -45, onder: -125, gat: 6.2, naaf: 5, diep: 6 },
  ebox: { x: -170, b: 84, d: 54, h: 32 },
};

const PLA = { name: 'PLA, wit', density: 1240, color: '#f4f4f1' };
const RVS = { name: 'AISI 304', density: 8000, color: '#c9ccd1' };
const ZWART = { name: 'PBT, zwart', density: 1300, color: '#2c2c2e' };
const DIAL = { name: 'ABS, grijs', density: 1050, color: '#5a5e66' };
const PCB = { name: 'FR4', density: 1850, color: '#2f7d4a' };

const yv = (id, y, kind = 'face', name) => vlak(id, name ?? (kind === 'face' ? `Face ${id}` : `Plane ${id}`), [0, y, 0], [0, 1, 0], kind);
const zf = () => M.romp.d / 2; // voorvlak van de module (Z)
const assen = () => [M.klauw.x, -M.klauw.x].flatMap((x) => [M.klauw.z, -M.klauw.z].map((z) => [x, z]));
/** rechts ligt de arm ingetrokken naar achteren (-Z), links naar voren: aandraaien met de klok mee zwaait hem uit */
const intrek = (x) => (x > 0 ? -1 : 1);

/** de inbouwmodule (één print, flens naar beneden op het bed) */
export function inbouwmodule() {
  const { flens: F, kom: K, romp: R, klauw: C, toren: T, lade: L, richel: RI } = M;
  const o = new Onderdeel('Inbouwmodule', PLA);
  // flens op het blad (afgeschuind), romp door het blad heen (2 mm in de flens: één body)
  o.schets(TOP, (s) => s.rrect(-F.b / 2, -F.d / 2, F.b / 2, F.d / 2, F.r));
  o.extrude('boss', F.dikte, { naam: 'Flens', draft: F.schuin });
  o.schets(TOP, (s) => s.rrect(-R.b / 2, -R.d / 2, R.b / 2, R.d / 2, R.r));
  o.extrude('boss', -R.onder, { omkeren: true, terug: 2, naam: 'Romp' });
  const yk = F.dikte - K.diepte;
  o.schets(yv('flens', F.dikte), (s) => s.rrect(-K.b / 2, -K.d / 2, K.b / 2, K.d / 2, K.r));
  o.extrude('cut', K.diepte, { omkeren: true, naam: 'Kom rooster' });
  // luchtkanaal boven: de holte met vier gesloten torens voor de klauwen in de zijwanden
  const xi = R.b / 2 - R.wand, zi = R.d / 2 - R.wand;
  const toren = (x, z) => (intrek(x) < 0 ? [z - T.achter, z + T.voor] : [z - T.voor, z + T.achter]);
  const zij = (x) => [C.z, -C.z].map((z) => toren(x, z)).sort((a, b) => a[0] - b[0]);
  const rechts = [[xi, -zi], ...zij(1).flatMap(([a, b]) => [[xi, a], [T.binnen, a], [T.binnen, b], [xi, b]]), [xi, zi]];
  const links = [[-xi, zi], ...zij(-1).reverse().flatMap(([a, b]) => [[-xi, b], [-T.binnen, b], [-T.binnen, a], [-xi, a]]), [-xi, -zi]];
  o.schets(yv('kom', yk), (s) => s.lusW([...rechts, ...links].map(([x, z]) => [x, 0, z])));
  o.extrude('cut', yk - T.onder + 0.5, { omkeren: true, naam: 'Kanaal boven' });
  o.schets(yv('kanaal', T.onder, 'reference', 'Plane onder de torens'), (s) => s.rrectW([-xi, 0, -zi], [xi, 0, zi]));
  o.extrude('cut', T.onder - R.onder + 0.5, { omkeren: true, naam: 'Kanaal onder' });
  // schroeven M4 x 50 (DIN 912): de kop ligt verzonken onder het rooster en sluit het gat af
  o.schets(yv('kom', yk), (s) => assen().forEach(([x, z]) => s.cirkelW([x, 0, z], 4.25)));
  o.extrude('cut', 4.5, { omkeren: true, naam: 'Verzinking schroeven' });
  const yKanaal = -M.blad + 1;
  o.schets(yv('kom', yk), (s) => assen().forEach(([x, z]) => s.cirkelW([x, 0, z], 2.25)));
  o.extrude('cut', yk - yKanaal + 0.5, { omkeren: true, naam: 'Gaten schroeven' });
  // in elke toren: het kanaal waarin de naaf op en neer loopt en de kamer waar de arm ingetrokken ligt; de toren
  // blijft dicht naar het luchtkanaal (wand >= 2,5 mm) en heeft een vloer
  const yBodem = T.onder + 2;
  o.schets(yv('klauwtop', yKanaal, 'reference', 'Plane klauwen'), (s) =>
    assen().forEach(([x, z]) => s.rrectW([x - C.naaf - 0.3, 0, z - C.naaf - 0.3], [x + C.naaf + 0.3, 0, z + C.naaf + 0.3])));
  o.extrude('cut', yKanaal - yBodem, { omkeren: true, naam: 'Klauwkanalen' });
  const yIn = -M.blad - C.hoog + 1;
  o.schets(yv('klauwin', yIn, 'reference', 'Plane klauwen ingetrokken'), (s) =>
    assen().forEach(([x, z]) => {
      const k = Math.sign(x), d = intrek(x);
      s.rrectW([x - 4, 0, z], [k > 0 ? xi : -xi, 0, z + d * (C.arm + 0.5)]);
    }));
  o.extrude('cut', yIn - yBodem, { omkeren: true, naam: 'Klauwen ingetrokken' });
  // venster in de buitenwand: de klauw gaat er liggend in en zwaait er door naar buiten; sleuf voor de uitgeklapte arm
  for (const kant of [1, -1]) {
    const pl = vlak(kant > 0 ? 'wandR' : 'wandL', kant > 0 ? 'Face wand rechts' : 'Face wand links', [kant * R.b / 2, 0, 0], [kant, 0, 0]);
    o.schets(pl, (s) => [C.z, -C.z].forEach((z) => {
      const d = intrek(kant), b = 4, w = C.arm + 0.5, v = C.naaf + 0.5;
      const y0 = yBodem + 0.5, y1 = yKanaal, yw = yIn;
      const lus = [[z + d * w, y0], [z - d * v, y0], [z - d * v, yw], [z - d * b, yw], [z - d * b, y1], [z + d * b, y1], [z + d * b, yw], [z + d * w, yw]];
      s.lusW(lus.map(([zz, y]) => [kant * R.b / 2, y, zz]));
    }));
    o.extrude('cut', R.wand + 1, { omkeren: true, naam: kant > 0 ? 'Vensters rechts' : 'Vensters links' });
  }
  // opening voor de filterlade in de voorwand (het front van de lade overlapt haar rondom)
  o.schets(vlak('voor', 'Face voorwand', [0, 0, zf()], [0, 0, 1]), (s) => s.rrectW([-L.notch, R.onder - 0.5, 0], [L.notch, L.boven, 0]));
  o.extrude('cut', R.wand + 1, { omkeren: true, naam: 'Opening lade' });
  // richels waar de lade op loopt
  o.schets(vlak('richels', 'Plane richels', [0, 0, 64.5], [0, 0, 1], 'reference'), (s) => [1, -1].forEach((k) =>
    s.rrectW([k * RI.binnen, RI.boven - RI.dikte, 0], [k * (xi + 0.5), RI.boven, 0])));
  o.extrude('boss', 64.5 + zi + 1, { omkeren: true, naam: 'Richels' });
  // meetpunten voor de drukmeter: naaf aan de binnenkant van de linker zijwand, gat voor de slang van buiten
  const MP = M.meetpunt;
  o.schets(vlak('meetnaaf', 'Plane meetpunten', [-xi, 0, 0], [1, 0, 0], 'reference'), (s) =>
    [MP.boven, MP.onder].forEach((y) => s.cirkelW([-xi, y, MP.z], MP.naaf)));
  o.extrude('boss', MP.diep, { terug: 1, naam: 'Meetpunten' });
  o.schets(vlak('meetgat', 'Face wand links', [-R.b / 2, 0, 0], [-1, 0, 0]), (s) =>
    [MP.boven, MP.onder].forEach((y) => s.cirkelW([-R.b / 2, y, MP.z], MP.gat / 2)));
  o.extrude('cut', R.wand + MP.diep + 0.5, { omkeren: true, naam: 'Gaten meetslangen' });
  // hoekbussen voor de uitblaasplaat (M3 zelftappend), naast de ventilator
  const ho = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const yo = R.onder + 0.5;
  o.schets(yv('onder', yo, 'reference', 'Plane uitblaasplaat'), (s) => ho.forEach(([kx, kz]) =>
    s.rrectW([kx * 84, 0, kz * 55], [kx * (xi + 0.5), 0, kz > 0 ? zi : -(zi + 0.5)])));
  o.extrude('boss', 12, { naam: 'Hoekbussen' });
  o.schets(yv('onder', yo, 'reference', 'Plane uitblaasplaat'), (s) => ho.forEach(([kx, kz]) => s.cirkelW([kx * 88.75, 0, kz * 60], 1.4)));
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

/** de filterlade (stand 'dicht', in het assenstelsel van de module); print met het front op het bed */
export function filterlade() {
  const { lade: L, front: FR } = M;
  const o = new Onderdeel('Filterlade', PLA);
  const pv = vlak('ladefront', 'Plane ladefront', [0, 0, zf()], [0, 0, 1], 'reference');
  // front over de volle breedte en hoogte van de opening, 6 mm dik; het rust rondom op de voorwand (schuimband)
  o.schets(pv, (s) => s.rrectW([-FR.b, FR.onder, 0], [FR.b, FR.boven, 0], 3));
  o.extrude('boss', FR.dikte, { naam: 'Front' });
  // bak door de opening; hij steekt 1 mm in het front (één body)
  o.schets(pv, (s) => s.rrectW([-L.breed, L.bodem, 0], [L.breed, L.top, 0]));
  o.extrude('boss', zf() - L.achter, { omkeren: true, terug: 1, naam: 'Bak' });
  o.schets(yv('bak', L.top), (s) => s.rrectW([-(L.breed - 2), 0, L.achter + 2], [L.breed - 2, 0, zf() - 6]));
  o.extrude('cut', L.top - L.bodem - 2, { omkeren: true, naam: 'Holte bak' });
  // roosterbodem: vakjes van 18 mm met ribben van 3 mm; de randen die op de richels lopen blijven dicht
  o.schets(yv('bodem', L.bodem + 2), (s) => {
    const nx = 8, nz = 5, p = 21, c = 18;
    const x0 = -(nx * p - 3) / 2, z0 = -(nz * p - 3) / 2 + 0.25;
    // rechte hoeken: 40 afgeronde vakjes kosten de mesh-kernel 40 s
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) s.rrectW([x0 + i * p, 0, z0 + j * p], [x0 + i * p + c, 0, z0 + j * p + c]);
  });
  o.extrude('cut', 3, { omkeren: true, naam: 'Roosterbodem' });
  // greepsleuf bovenaan in het front
  o.schets(vlak('frontvoor', 'Face front', [0, 0, zf() + FR.dikte], [0, 0, 1]), (s) => s.rrectW([-50, FR.boven - 14, 0], [50, FR.boven - 2, 0], 4));
  o.extrude('cut', 3, { omkeren: true, naam: 'Greepsleuf' });
  return o.doc();
}

/** de drie filterlagen in de lade, van boven naar onder */
export function filterlaag(i) {
  const { lade: L } = M;
  const f = M.filters[i];
  const boven = L.top - M.filters.slice(0, i).reduce((a, q) => a + q.dikte, 0);
  const o = new Onderdeel(f.naam, { name: f.naam, density: 60, color: f.kleur });
  o.schets(yv(`laag${f.id}`, boven - f.dikte, 'reference', `Plane ${f.id}`), (s) => s.rrectW([-(L.breed - 2.2), 0, L.achter + 2.2], [L.breed - 2.2, 0, zf() - 6.2]));
  o.extrude('boss', f.dikte, { naam: 'Mat' });
  return o.doc();
}

/** uitblaasplaat onder de module: de ventilator staat erop, schuine lamellen sturen de lucht naar achteren */
export function uitblaasplaat() {
  const { romp: R, uitblaas: U, fan: V } = M;
  const o = new Onderdeel('Uitblaasplaat', PLA);
  const y1 = R.onder, y0 = R.onder - U.dikte;
  o.schets(yv('plaat', y1, 'reference', 'Plane uitblaasplaat'), (s) => {
    s.rrect(-R.b / 2, -R.d / 2, R.b / 2, R.d / 2, R.r);
    s.cirkel(0, 0, 58);
  });
  o.extrude('boss', U.dikte, { omkeren: true, naam: 'Plaat' });
  // lamellen onder 45°: boven op z, onder op z - dikte (lucht naar achteren)
  o.schets(vlak('lamellen', 'Plane lamellen', [-60, 0, 0], [1, 0, 0], 'reference'), (s) => {
    for (let z = -54; z <= 58; z += U.steek) s.lusW([[-60, y0, z - U.dikte], [-60, y0, z - U.dikte + U.lamel], [-60, y1, z + U.lamel], [-60, y1, z]]);
  });
  o.extrude('boss', 120, { naam: 'Lamellen' });
  o.schets(yv('plaat', y1, 'reference', 'Plane uitblaasplaat'), (s) => {
    for (const kx of [1, -1]) for (const kz of [1, -1]) {
      s.cirkel(kx * V.gat / 2, kz * V.gat / 2, 2.25);
      s.cirkel(kx * 88.75, kz * 60, 1.7);
    }
  });
  o.extrude('cut', U.dikte + 1, { omkeren: true, naam: 'Gaten' });
  return o.doc();
}

/** vereenvoudigde Delta PFR1212UHE-SP00 (120 x 120 x 38 mm): kader, motor, spaken aan de uitblaaskant, zeven schoepen */
export function ventilator() {
  const { fan: V } = M;
  const y0 = V.top - V.dikte;
  const o = new Onderdeel('Delta PFR1212UHE-SP00', ZWART);
  o.schets(yv('fan', y0, 'reference', 'Plane ventilator'), (s) => {
    s.rrect(-V.maat / 2, -V.maat / 2, V.maat / 2, V.maat / 2, 5);
    s.cirkel(0, 0, 57);
    for (const kx of [1, -1]) for (const kz of [1, -1]) s.cirkel(kx * V.gat / 2, kz * V.gat / 2, 2.15);
  });
  o.extrude('boss', V.dikte, { naam: 'Kader' });
  o.schets(yv('fan', y0, 'reference', 'Plane ventilator'), (s) => s.cirkel(0, 0, 24));
  o.extrude('boss', V.dikte - 4, { naam: 'Motor' });
  o.schets(yv('spaak', y0 + 0.5, 'reference', 'Plane spaken'), (s) => {
    s.rrect(22, -2, 58, 2); s.rrect(-58, -2, -22, 2); s.rrect(-2, 22, 2, 58); s.rrect(-2, -58, 2, -22);
  });
  o.extrude('boss', 4, { naam: 'Spaken' });
  o.schets(yv('schoep', y0 + 6, 'reference', 'Plane schoepen'), (s) => {
    for (let i = 0; i < 7; i++) {
      const a = (i * 2 * Math.PI) / 7, t = 1.4;
      const ca = Math.cos(a), sa = Math.sin(a);
      const p = (r, w) => [r * ca - w * sa, r * sa + w * ca];
      s.lus([p(22, -t), p(55, -t - 8), p(55, t - 8), p(22, t)]);
    }
  });
  o.extrude('boss', 28, { naam: 'Schoepen' });
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

/** ronde houder voor de M5Stack Dial (gatzaag Ø60); oorsprong in het midden van het gat op het bovenvlak van het blad */
export function dialhouder() {
  const { dial: D } = M;
  const o = new Onderdeel('Dialhouder', PLA);
  o.schets(TOP, (s) => s.cirkel(0, 0, 35));
  o.extrude('boss', 3, { naam: 'Flens', draft: 45 });
  o.schets(TOP, (s) => s.cirkel(0, 0, D.gat / 2 - 1));
  o.extrude('boss', -D.vloer + 2.7, { omkeren: true, terug: 2, naam: 'Kuip' });
  o.schets(yv('flens', 3), (s) => s.cirkel(0, 0, D.d / 2 + 0.5));
  o.extrude('cut', 3 - D.vloer, { omkeren: true, naam: 'Kom' });
  o.schets(yv('bodem', D.vloer), (s) => s.cirkel(0, 0, 7));
  o.extrude('cut', 4, { omkeren: true, naam: 'Kabelgat' });
  return o.doc();
}

/** M5Stack Dial (vereenvoudigd: rond, Ø51, 32,3 mm hoog); oorsprong onder in het midden */
export function m5dial() {
  const o = new Onderdeel('M5Stack Dial', DIAL);
  o.schets(TOP, (s) => s.cirkel(0, 0, M.dial.d / 2));
  o.extrude('boss', 22, { naam: 'Behuizing' });
  o.schets(yv('boven', 22), (s) => s.cirkel(0, 0, M.dial.d / 2 - 1));
  o.extrude('boss', M.dial.hoogte - 22, { terug: 1, naam: 'Draairing met scherm' });
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
  o.schets(vlak('dachter', 'Face achter', [0, 0, -z], [0, 0, -1]), (s) => [10, 22].forEach((xx) => s.cirkelW([xx, -23, -z], 3.3))); // op de hoogte van de poorten van de drukmeter
  o.extrude('cut', 3, { omkeren: true, naam: 'Slangen drukmeter' });
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

/** interfaceprint (gaatjesprint 60 x 40): P-MOSFET IRF4905 (aan/uit), BC547's, 3,3V-regelaar, schroefklemmen en de
 *  verschildrukmeter Sensirion SDP810-500Pa met zijn twee slangpoorten naar achteren; op tape op het deksel */
export function interfaceprint() {
  const { ebox: E } = M;
  const o = new Onderdeel('Interfaceprint', PCB);
  const yb = -E.h + 1;
  o.schets(yv('print', yb, 'reference', 'Plane print'), (s) => s.rrect(-30, -18, 30, 18));
  o.extrude('boss', 1.6, { naam: 'Print' });
  o.schets(yv('klem', yb + 1.2, 'reference', 'Plane klemmen'), (s) => { s.rrect(12, -16, 27, 16); s.rrect(-27, -6, -16, 6); s.rrect(-6, 8, 4, 12.5); });
  o.extrude('boss', 15, { naam: 'Klemmen en MOSFET' });
  // SDP810 (vereenvoudigd 22 x 10 x 12 mm) met twee poorten Ø5 naar achteren (-Z), richting de slangdoorvoeren
  o.schets(yv('sdp', yb + 1.2, 'reference', 'Plane drukmeter'), (s) => s.rrectW([5, 0, -4], [27, 0, 6]));
  o.extrude('boss', 12, { naam: 'Drukmeter SDP810' });
  o.schets(vlak('sdppoort', 'Plane poorten', [0, 0, 6], [0, 0, -1], 'reference'), (s) => [10, 22].forEach((xx) => s.cirkelW([xx, yb + 8, 6], 2.5)));
  o.extrude('boss', 16, { naam: 'Poorten drukmeter' });
  return o.doc();
}

/** de mates van de filterlade: op de richels, in het midden, tussen dicht en uitgetrokken; de filters schuiven mee */
export function ladeMates(moduleId, ladeId, filterIds, prefix = '') {
  const ref = (componentId, kind, label, normal, point) => ({ componentId, kind, label, normal, point });
  return [
    { id: `${prefix}ma`, type: 'coincident', name: 'Lade op richel', folder: 'Afzuiging', aligned: false, suppressed: false, refs: [
      ref(moduleId, 'face', 'Richel<1>@Inbouwmodule', [0, 1, 0], [90.5, M.richel.boven, 0]),
      ref(ladeId, 'face', 'Bodem@Filterlade', [0, -1, 0], [89.5, M.lade.bodem, 0]),
    ] },
    { id: `${prefix}mb`, type: 'coincident', name: 'Lade in het midden', folder: 'Afzuiging', aligned: true, suppressed: false, refs: [
      ref(moduleId, 'plane', 'Right Plane@Inbouwmodule', [1, 0, 0], [0, 0, 0]),
      ref(ladeId, 'plane', 'Right Plane@Filterlade', [1, 0, 0], [0, 0, 0]),
    ] },
    { id: `${prefix}mc`, type: 'distanceLimit', name: 'Uitschuif filterlade', folder: 'Afzuiging', aligned: false, suppressed: false, value: 0, min: 0, max: M.lade.uitschuif, refs: [
      ref(moduleId, 'face', 'Face voorwand@Inbouwmodule', [0, 0, 1], [0, -120, zf()]),
      ref(ladeId, 'face', 'Front achterkant@Filterlade', [0, 0, -1], [0, -120, zf()]),
    ] },
    ...filterIds.map((fid, i) => ({ id: `${prefix}md${i}`, type: 'lock', name: `${M.filters[i].naam} in de lade`, folder: 'Afzuiging', aligned: false, suppressed: false,
      relative: { position: [0, 0, 0], rotation: [0, 0, 0, 1] }, refs: [
        ref(ladeId, 'origin', 'Origin@Filterlade', [0, 1, 0], [0, 0, 0]),
        ref(fid, 'origin', `Origin@${M.filters[i].naam}`, [0, 1, 0], [0, 0, 0]),
      ] })),
  ];
}

/** alle componenten van de afzuiging, verschoven met `o` (de oorsprong van de module in de assemblage) */
export function afzuigingComponenten(o = [0, 0, 0], prefix = 'a') {
  const at = (p) => [o[0] + p[0], o[1] + p[1], o[2] + p[2]];
  const C = M.klauw;
  const yKlem = -M.blad - C.hoog; // klauw tegen de onderkant van het blad
  const halfY = [0, 1, 0, 0]; // 180° om Y: de arm wijst naar -X
  const filterIds = M.filters.map((_, i) => `${prefix}f${i + 1}`);
  const comps = [
    component(`${prefix}1`, 'Inbouwmodule<1>', inbouwmodule(), at([0, 0, 0])),
    component(`${prefix}2`, 'Rooster LB<1>', rooster(), at([0, 0, 0])),
    component(`${prefix}3`, 'Filterlade<1>', filterlade(), at([0, 0, 0]), { fixed: false }),
    ...M.filters.map((f, i) => component(filterIds[i], `${f.naam}<1>`, filterlaag(i), at([0, 0, 0]), { fixed: false })),
    component(`${prefix}4`, 'Uitblaasplaat<1>', uitblaasplaat(), at([0, 0, 0])),
    component(`${prefix}5`, 'Delta PFR1212UHE-SP00<1>', ventilator(), at([0, 0, 0])),
  ];
  const k = klauw();
  assen().forEach(([x, z], i) =>
    comps.push(component(`${prefix}k${i + 1}`, `Klauw<${i + 1}>`, k, at([x, yKlem, z]), { rotation: x > 0 ? [0, 0, 0, 1] : halfY })));
  const d = M.dial;
  comps.push(component(`${prefix}7`, 'Dialhouder<1>', dialhouder(), at([d.x, 0, d.z])));
  comps.push(component(`${prefix}8`, 'M5Stack Dial<1>', m5dial(), at([d.x, d.vloer, d.z])));
  const e = [M.ebox.x, -M.blad, 0];
  comps.push(component(`${prefix}9`, 'Elektronicabox<1>', elektronicabox(), at(e)));
  comps.push(component(`${prefix}10`, 'Deksel elektronicabox<1>', deksel(), at(e)));
  comps.push(component(`${prefix}11`, 'Interfaceprint<1>', interfaceprint(), at(e)));
  return { components: comps, mates: ladeMates(`${prefix}1`, `${prefix}3`, filterIds, `${prefix}m`) };
}

/** de assemblage van de afzuiging alleen */
export function afzuiging() {
  const { components, mates } = afzuigingComponenten();
  return { format: 'phlippo-cad', version: 1, name: 'Afzuiging', units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components, mates };
}

/** de uitsparingen in het tafelblad (assenstelsel van het blad: bovenvlak op Y = 34): frezen (Ø10) en gatzaag Ø60 */
export function bladUitsparingen(o, x0 = 0, z0 = 0) {
  const { uitsparing: U, dial: D } = M;
  o.schets(vlak('bladtop', 'Face bovenvlak', [0, M.blad, 0], [0, 1, 0]), (s) => {
    s.rrectW([x0 - U.b / 2, 0, z0 - U.d / 2], [x0 + U.b / 2, 0, z0 + U.d / 2], U.r);
    s.cirkelW([x0 + D.x, 0, z0 + D.z], D.gat / 2);
  });
  o.extrude('cut', M.blad + 1, { omkeren: true, naam: 'Uitsparingen afzuiging' });
}

export const ONDERDELEN = {
  'Inbouwmodule.kcad': inbouwmodule,
  'Rooster-LB.kcad': rooster,
  'Filterlade.kcad': filterlade,
  'Voorfilter-G4.kcad': () => filterlaag(0),
  'Fijnstoffilter-M5.kcad': () => filterlaag(1),
  'Actieve-koolmat.kcad': () => filterlaag(2),
  'Uitblaasplaat.kcad': uitblaasplaat,
  'Ventilator-Delta-PFR1212UHE.kcad': ventilator,
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
  // vervangen in versie 2
  for (const oud of ['Filtermat.kcad', 'Ventilatorplaat.kcad', 'Ventilator-NF-F12.kcad', 'print/Ventilatorplaat.stl']) if (existsSync(join(HERE, oud))) rmSync(join(HERE, oud));
  console.log('geschreven:', [...Object.keys(ONDERDELEN), 'Afzuiging.kcad'].join(', '));
}
