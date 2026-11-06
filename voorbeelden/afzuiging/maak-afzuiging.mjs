// Ingebouwde nagelstofafzuiging voor het bureau (versie 4, 2026-11-05), als Phlippo CAD-documenten.
//
// Opbouw (van boven naar onder):
// - RVS-plaat (AISI 430, magnetisch, lasergesneden, LB-monogram) ligt op het bovenframe en is er even groot als het:
//   van boven zie je alleen staal; ze klikt vast op 4 magneten die verzonken in het frame zitten;
// - bovenframe (PETG, 2,5 mm, plat geprint): een smalle omranding op het blad, op de romp gelijmd;
// - filtercassette (PETG) met drie lagen (G4-voorfilter, M5-fijnstofmat, actieve koolmat): rooster eraf, cassette eruit
//   tillen aan de twee greepuitsparingen, filters uitkloppen of vervangen;
// - romp (PETG, rechtop geprint) in de uitsparing van het blad, met de ventilator (Delta PFR1212UHE-SP00, 300 Pa)
//   direct onder de cassette; onderaan één bodemplaat over de hele onderkant, met schuine lamellen onder de ventilator
//   (lucht naar achteren) en de DC-bus onder het elektronicavak.
// Bevestiging: vier stalen klauwen (RVS 4 mm, lasergesneden, M5-draad) in gesloten torens. De kop van de M5-schroef
// zit in een lip van het bovenframe (onder de RVS-plaat) en drukt het hele frame op het blad; draai hem aan, de klauw
// zwaait door het venster naar buiten en schuift in een lange sleuf omhoog tot tegen de onderkant van het blad.
// Bladdikte 10 tot 50 mm (LAGKAPTEN: 34 mm). Alle schroefkoppen zitten in een conische zitting (90°).
// Luchtdicht: de torens zijn alleen naar buiten open, de naad frame/romp is gelijmd; lucht kan er alleen in langs het
// rooster en uit langs de bodemplaat.
// De VIEWE-knop 1,5" staat op een houder die niet breder is dan de knop, met twee kleine stalen klauwen: geen enkele
// schroef in het blad. Alle schroeven, bouten en moeren staan als onderdelen in de assemblage.
// Elektronica: in een eigen vak links in de romp (naast de ventilator, onder de cassette), afgesloten van het
// luchtkanaal; een staande gaatjesprint van 30 x 70 mm op vier bussen; van onderen bereikbaar via de bodemplaat met de
// DC-bus en de kabeldoorvoer naar de knop; aan/uit-schakelaar in de linkerzijwand. De drukmeter meet via een tuitje in het plafond van het vak.
//
// Assenstelsel van de module: oorsprong in het midden van de uitsparing op het bovenvlak van het blad, Y omhoog,
// +Z naar de voorkant van het bureau. Alle PETG-delen passen op een printbed van 220 x 220 mm en printen zonder support.
// Gebruik: node voorbeelden/afzuiging/maak-afzuiging.mjs   (eerst logo/trace.py en logo/rooster.py)
import { readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Onderdeel, TOP, component, vlak } from '../lib/schets.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const M = {
  blad: 34, // LAGKAPTEN; de klauwen werken van 10 tot 50 mm
  bladMin: 10,
  bladMax: 50,
  // bovenframe: smalle omranding van 2,5 mm (5 mm voorbij de uitsparing), de RVS-plaat ligt erop en is even groot
  frame: { b: 206, d: 150, r: 4, dikte: 2.5, opening: { x: 92.5, z: 67, r: 3 } },
  romp: { b: 194, d: 138, r: 4, wand: 4, onder: -79 },
  uitsparing: { b: 196, d: 140, r: 5 }, // te frezen in het blad
  klauw: { x: 88.5, z: 40, naaf: 6.5, arm: 18, breed: 8, dik: 4 }, // RVS 4 mm, M5-draad
  toren: { binnen: 79.5, top: -9, zwaai: -55, bodem: -61 }, // sleuf van top tot bodem, zwaaivenster onderaan
  cassette: { x: 79, z: 62.5, rand: { x: 92.25, z: 66.75, dikte: 2.5 }, onder: -37, wand: 1.5, bodem: 2 },
  richel: { x: 91, z: 63, dikte: 1.5 },
  lip: { x: 83, z: 6 }, // lippen van het bovenframe boven de torens, voor de kop van de M5-schroef // binnenrichel bovenaan de romp: de cassetterand rust er rondom op (geen omloop)
  filters: [
    // lage weerstand voor veel zuigkracht: een vlakke F7-mat zou de luchtstroom smoren
    { id: 'g4', naam: 'Voorfilter G4', dikte: 10, kleur: '#ebe8df' },
    { id: 'm5', naam: 'Fijnstoffilter M5', dikte: 15, kleur: '#f6f6f2' },
    { id: 'kool', naam: 'Actieve koolmat', dikte: 10, kleur: '#2f3033' },
  ],
  fan: { maat: 120, gat: 105, dikte: 38, top: -41 }, // Delta PFR1212UHE-SP00
  uitblaas: { dikte: 6, steek: 8, lamel: 2 },
  magneten: { d: 8, h: 2, plaats: [[97.75, 45], [97.75, -45], [-97.75, 45], [-97.75, -45]] }, // verzonken in het frame, onder de plaat
  // elektronicavak links in de romp: van de buitenwand tot de tussenwand naast de ventilator, onder het plafond
  vak: { binnen: -60.5, wand: 1.5, plafond: -41, dikte: 1.5, tuit: { x: -72, z: -50 }, kabel: { y: -70, z: 50 } },
  print: { b: 70, h: 30, gat: [66, 26], bus: 5, z: 0, y: -60 }, // gaatjesprint 30 x 70 mm, staand op de tussenwand
  // wipschakelaar KCD1-101 (21 x 15 mm, inbouwgat 19 x 13) in een kom in de linkerzijwand: de wip ligt 1 mm dieper dan
  // de wand, zodat hij niet per ongeluk omgaat; de kom zit onder het blad (ook bij 50 mm) en naast de print
  schakelaar: { z: 20, y: -65, gat: [13, 19], kom: [19, 25, 3], diep: 6, paneel: 2 },
  // VIEWE-knop 1,5" (UEDX46460015-MD50E, Ø51,6 x 14, naaf achteraan, FPC 10-polig) op een houder die niet breder is
  // dan de knop: plaat Ø51,6 x 2 op het blad, buis Ø43 in een gat van Ø44 (gatzaag), 2 stalen klauwen (M3) en een
  // deksel onderaan met de USB-C-bus en de kabeltule. Maten van de knop uit de maattekening van VIEWE.
  dial: { x: 250, z: 200, d: 51.6, hoogte: 14, voet: 2.5, gat: 44, plaat: 2, buis: 21.5, wand: 2, onder: -60, deksel: 2,
    naaf: [[12.2, 4.9], [10.9, 3]], vloer: 2.5, // kom voor de naaf (straal, diepte) en de vloer eronder
    schroeven: [[-2.9, 5.2], [-2.9, -5.2]], pennen: [[2.77, 7.05], [2.77, -7.05]], fpc: { x: -5.9, b: 5.5 },
    klauw: { x: 16, naaf: 4.5, arm: 15, breed: 6, dik: 3, top: -10, bodem: -60 },
    adapter: { x: 1, b: 23, h: 47.5, top: -12 }, rib: 13, bus: 17 },
};

const PETG = { name: 'PETG, wit', density: 1270, color: '#f4f4f1' };
const PETG_ZWART = { name: 'PETG, zwart', density: 1270, color: '#232325' };
const RVS430 = { name: 'AISI 430', density: 7700, color: '#c9ccd1' };
const RVS304 = { name: 'AISI 304', density: 8000, color: '#b8bcc2' };
const ZWART = { name: 'PBT, zwart', density: 1300, color: '#2c2c2e' };
const DIAL = { name: 'ABS, grijs', density: 1050, color: '#5a5e66' };
const PCB = { name: 'FR4', density: 1850, color: '#2f7d4a' };

const yv = (id, y, kind = 'face', name) => vlak(id, name ?? (kind === 'face' ? `Face ${id}` : `Plane ${id}`), [0, y, 0], [0, 1, 0], kind);
const assen = () => [M.klauw.x, -M.klauw.x].flatMap((x) => [M.klauw.z, -M.klauw.z].map((z) => [x, z]));
/** rechts ligt de arm ingetrokken naar achteren (-Z), links naar voren: aandraaien met de klok mee zwaait hem uit */
const intrek = (x) => (x > 0 ? -1 : 1);
/** schroeven van de bodemplaat (onderaan in de torens) */
const m3onder = () => assen().map(([x, z]) => [Math.sign(x) * 86, z]);
/** bussen onderaan de tussenwand (schroeven van de bodemplaat) */
const bussenTussenwand = () => [[M.vak.binnen - M.vak.wand - 1.5, 50], [M.vak.binnen - M.vak.wand - 1.5, -50]];
/** de z-grenzen van een toren */
const toren = (x, z) => {
  const C = M.klauw, d = intrek(x), reik = C.arm + 0.5 + 2.5, voor = C.naaf + 0.5 + 2.5;
  return d < 0 ? [z - reik, z + voor] : [z - voor, z + reik];
};

/** de romp (rechtop geprint, onderkant op het bed): wanden, vier gesloten torens met de klauwen, ventilatorruimte */
export function romp() {
  const { romp: R, klauw: C, toren: T } = M;
  const o = new Onderdeel('Romp', PETG);
  o.schets(TOP, (s) => s.rrect(-R.b / 2, -R.d / 2, R.b / 2, R.d / 2, R.r));
  o.extrude('boss', -R.onder, { omkeren: true, naam: 'Romp' });
  // luchtkanaal over de volle hoogte, met de torens in de zijwanden (ze staan op het bed: geen overhang)
  const xi = R.b / 2 - R.wand, zi = R.d / 2 - R.wand;
  const zij = (k) => [C.z, -C.z].map((z) => toren(k * C.x, z)).sort((a, b) => a[0] - b[0]);
  const rechts = [[xi, -zi], ...zij(1).flatMap(([a, b]) => [[xi, a], [T.binnen, a], [T.binnen, b], [xi, b]]), [xi, zi]];
  const links = [[-xi, zi], ...zij(-1).reverse().flatMap(([a, b]) => [[-xi, b], [-T.binnen, b], [-T.binnen, a], [-xi, a]]), [-xi, -zi]];
  o.schets(yv('boven', 0), (s) => s.lusW([...rechts, ...links].map(([x, z]) => [x, 0, z])));
  o.extrude('cut', -R.onder + 1, { omkeren: true, naam: 'Luchtkanaal' });
  // elektronicavak (vóór de torens uitgesneden worden, zodat de klauwkanalen door het plafond lopen): tussenwand naast de ventilator en een plafond onder de cassette; open aan de onderkant (bodemplaat)
  const V = M.vak, xw = V.binnen - V.wand;
  o.schets(yv('vakplafond', V.plafond, 'reference', 'Plane plafond elektronicavak'), (s) => s.rrectW([-xi - 0.5, 0, -zi - 0.5], [V.binnen, 0, zi + 0.5]));
  o.extrude('boss', V.dikte, { omkeren: true, naam: 'Plafond elektronicavak' });
  o.schets(yv('vakplafond', V.plafond, 'reference', 'Plane plafond elektronicavak'), (s) => s.rrectW([xw, 0, -zi - 0.5], [V.binnen, 0, zi + 0.5]));
  o.extrude('boss', V.plafond - R.onder, { omkeren: true, naam: 'Tussenwand' });
  // bussen onderaan de tussenwand voor de bodemplaat
  o.schets(yv('onderkant', R.onder, 'reference', 'Plane onderkant'), (s) => bussenTussenwand().forEach(([x, z]) => s.rrectW([xw - 4.5, 0, z - 4], [V.binnen, 0, z + 4])));
  o.extrude('boss', 14, { naam: 'Bussen tussenwand' });
  // tuitje in het plafond: de drukmeter meet de onderdruk onder de filters (slang 3 x 5 mm)
  o.schets(yv('ondplafond', V.plafond - V.dikte, 'reference', 'Plane onder het plafond'), (s) => s.cirkelW([V.tuit.x, 0, V.tuit.z], 2.2));
  o.extrude('boss', 7, { omkeren: true, terug: 0.5, naam: 'Tuitje drukmeter' });
  o.schets(yv('bovplafond', V.plafond + 1, 'reference', 'Plane boven het plafond'), (s) => s.cirkelW([V.tuit.x, 0, V.tuit.z], 1.1));
  o.extrude('cut', V.dikte + 9, { omkeren: true, naam: 'Gat tuitje' });
  // doorvoer voor de ventilatorkabel in de tussenwand (dichten met een tule of lijm)
  o.schets(vlak('tussenwand', 'Face tussenwand', [V.binnen, 0, 0], [1, 0, 0]), (s) => s.cirkelW([V.binnen, V.kabel.y, V.kabel.z], 3));
  o.extrude('cut', V.wand + 1, { omkeren: true, naam: 'Doorvoer ventilatorkabel' });
  // bussen voor de staande print (M2,5 x 6 zelftappend), op de tussenwand naar het vak toe
  const P = M.print;
  const pbus = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([kz, ky]) => [P.z + kz * P.gat[0] / 2, P.y + ky * P.gat[1] / 2]);
  o.schets(vlak('busvlak', 'Plane bussen print', [xw, 0, 0], [-1, 0, 0], 'reference'), (s) => pbus.forEach(([z, y]) => s.cirkelW([xw, y, z], 3)));
  o.extrude('boss', P.bus, { terug: 0.5, naam: 'Bussen print' });
  o.schets(vlak('busgat', 'Plane gaten print', [xw - P.bus, 0, 0], [-1, 0, 0], 'reference'), (s) => pbus.forEach(([z, y]) => s.cirkelW([xw - P.bus, y, z], 1.05)));
  o.extrude('cut', P.bus, { omkeren: true, naam: 'Gaten print' });
  // kom voor de aan/uit-schakelaar in de linkerzijwand: binnen een verdikking, buiten een kom van 6 mm diep, daarin
  // het inbouwgat door een paneel van 2 mm (bruggen bovenaan de kom en het gat: geen support)
  const S = M.schakelaar, xk = -R.b / 2 + S.diep;
  o.schets(vlak('schakelbinnen', 'Plane verdikking schakelaar', [-xi, 0, 0], [1, 0, 0], 'reference'), (s) =>
    s.rrectW([-xi, R.onder, S.z - S.kom[0] / 2 - 2], [-xi, S.y + S.kom[1] / 2 + 3, S.z + S.kom[0] / 2 + 2]));
  o.extrude('boss', S.diep + S.paneel - R.wand, { terug: 0.5, naam: 'Verdikking schakelaar' });
  const wandL = vlak('schakelkom', 'Face kom schakelaar', [-R.b / 2, 0, 0], [-1, 0, 0]);
  o.schets(wandL, (s) => s.rrectW([-R.b / 2, S.y - S.kom[1] / 2, S.z - S.kom[0] / 2], [-R.b / 2, S.y + S.kom[1] / 2, S.z + S.kom[0] / 2], S.kom[2]));
  o.extrude('cut', S.diep, { omkeren: true, naam: 'Kom schakelaar' });
  o.schets(vlak('schakelpaneel', 'Face paneel schakelaar', [xk, 0, 0], [-1, 0, 0]), (s) =>
    s.rrectW([xk, S.y - S.gat[1] / 2, S.z - S.gat[0] / 2], [xk, S.y + S.gat[1] / 2, S.z + S.gat[0] / 2]));
  o.extrude('cut', S.paneel + 1, { omkeren: true, naam: 'Inbouwgat schakelaar' });
  // binnenrichel rondom bovenaan: de cassetterand ligt erop, zodat er geen lucht langs de filters glipt
  o.schets(yv('boven', 0), (s) => { s.rrect(-xi - 0.5, -zi - 0.5, xi + 0.5, zi + 0.5); s.rrect(-M.richel.x, -M.richel.z, M.richel.x, M.richel.z); });
  o.extrude('boss', M.richel.dikte, { omkeren: true, naam: 'Richel cassette' });
  // M5 x 65 verzonken (DIN 7991) van bovenaf: de kop zit in het bovenframe, de schacht door de toren en het klauwkanaal
  o.schets(yv('boven', 0), (s) => assen().forEach(([x, z]) => s.cirkelW([x, 0, z], 2.9)));
  o.extrude('cut', 67, { omkeren: true, naam: 'Gaten M5' });
  // klauwkanaal: de klauw schuift van het zwaaivenster omhoog tot tegen het blad (bladdikte 10 tot 50 mm)
  o.schets(yv('kanaal', T.top, 'reference', 'Plane top klauwkanaal'), (s) =>
    assen().forEach(([x, z]) => s.rrectW([x - C.naaf - 0.5, 0, z - C.naaf - 0.5], [x + C.naaf + 0.5, 0, z + C.naaf + 0.5])));
  o.extrude('cut', T.top - T.bodem, { omkeren: true, naam: 'Klauwkanalen' });
  o.schets(yv('zwaai', T.zwaai, 'reference', 'Plane zwaaivenster'), (s) =>
    assen().forEach(([x, z]) => {
      const d = intrek(x), k = Math.sign(x);
      s.rrectW([x - k * (C.breed / 2 + 0.5), 0, z], [k * xi, 0, z + d * (C.arm + 0.5)]);
    }));
  o.extrude('cut', T.zwaai - T.bodem, { omkeren: true, naam: 'Klauwen ingetrokken' });
  // in de buitenwand: venster onderaan (klauw erin schuiven en uitzwaaien) en de lange sleuf voor de arm
  for (const kant of [1, -1]) {
    const pl = vlak(kant > 0 ? 'wandR' : 'wandL', kant > 0 ? 'Face wand rechts' : 'Face wand links', [kant * R.b / 2, 0, 0], [kant, 0, 0]);
    o.schets(pl, (s) => [C.z, -C.z].forEach((z) => {
      const d = intrek(kant), b = C.breed / 2 + 0.5;
      const a = z + d * (C.arm + 0.5), c = z - d * (C.naaf + 1);
      const lo = Math.min(a, c), hi = Math.max(a, c);
      const y0 = T.bodem - 0.5, yw = T.zwaai, y1 = T.top;
      s.lusW([[lo, y0], [hi, y0], [hi, yw], [z + b, yw], [z + b, y1], [z - b, y1], [z - b, yw], [lo, yw]].map(([zz, y]) => [kant * R.b / 2, y, zz]));
    }));
    o.extrude('cut', R.wand + 1, { omkeren: true, naam: kant > 0 ? 'Sleuven rechts' : 'Sleuven links' });
  }
  // gaten voor de schroeven van de bodemplaat, van onderen in de torens en de bussen
  o.schets(vlak('onder', 'Face onderkant', [0, R.onder, 0], [0, -1, 0]), (s) => [...m3onder(), ...bussenTussenwand()].forEach(([x, z]) => s.cirkelW([x, R.onder, z], 1.25)));
  o.extrude('cut', 12, { omkeren: true, naam: 'Gaten bodemplaat' });
  return o.doc();
}

/** het bovenframe: een smalle omranding van 2,5 mm (plat geprint, op de romp gelijmd); de RVS-plaat ligt erop en is
 *  even groot, de magneten zitten verzonken onder de plaat; in de opening de cassetterand */
export function bovenframe() {
  const { frame: F } = M;
  const o = new Onderdeel('Bovenframe', PETG);
  o.schets(TOP, (s) => { s.rrect(-F.b / 2, -F.d / 2, F.b / 2, F.d / 2, F.r); s.rrect(-F.opening.x, -F.opening.z, F.opening.x, F.opening.z, F.opening.r); });
  o.extrude('boss', F.dikte, { naam: 'Omranding' });
  // lippen boven de vier torens: daarin zit de kop van de M5-schroef (conische zitting, 90°), zodat de schroef het frame
  // over zijn hele vlak op het blad drukt; de cassetterand heeft daar een uitsparing
  o.schets(TOP, (s) => assen().forEach(([x, z]) => {
    const k = Math.sign(x);
    s.rrectW([k * M.lip.x, 0, z - M.lip.z], [k * (F.opening.x + 0.5), 0, z + M.lip.z]);
  }));
  o.extrude('boss', F.dikte, { naam: 'Lippen M5' });
  o.schets(yv('bovenvlak', F.dikte), (s) => assen().forEach(([x, z]) => s.cirkelW([x, 0, z], 5.2)));
  o.extrude('cut', F.dikte, { omkeren: true, naam: 'Verzinking M5', draft: 45 });
  o.schets(yv('bovenvlak', F.dikte), (s) => assen().forEach(([x, z]) => s.cirkelW([x, 0, z], 2.9)));
  o.extrude('cut', F.dikte + 1, { omkeren: true, naam: 'Gaten M5' });
  o.schets(yv('bovenvlak', F.dikte), (s) => M.magneten.plaats.forEach(([x, z]) => s.cirkelW([x, 0, z], M.magneten.d / 2 + 0.1)));
  o.extrude('cut', M.magneten.h + 0.1, { omkeren: true, naam: 'Magneten' });
  return o.doc();
}

/** het lasergesneden rooster, uit laser/rooster.loops (geschreven door logo/rooster.py); ligt op het frame */
export function rooster() {
  const loops = JSON.parse(readFileSync(join(HERE, 'laser', 'rooster.loops'), 'utf8'));
  const o = new Onderdeel('Rooster LB', RVS430);
  // vlak met normaal +Y: schets-x = X, schets-y = -Z; het monogram leest goed van voor het bureau
  o.schets(yv('frametop', M.frame.dikte), (s) => { s.lus(loops.outer); loops.holes.forEach((h) => s.lus(h)); });
  o.extrude('boss', loops.dikte, { naam: 'Plaat' });
  return o.doc();
}

/** de filtercassette: rand (1,5 mm) op de torentoppen onder het rooster, bak in het kanaal; print met de rand op het
 *  bed; greepuitsparingen boven twee torens (eronder is het dicht: geen lucht langs de filters) */
export function cassette() {
  const { cassette: K } = M;
  const o = new Onderdeel('Filtercassette', PETG);
  o.schets(yv('rand', 0, 'reference', 'Plane rand'), (s) => s.rrect(-K.rand.x, -K.rand.z, K.rand.x, K.rand.z, 2.75));
  o.extrude('boss', K.rand.dikte, { naam: 'Rand' });
  o.schets(yv('rand', 0, 'reference', 'Plane rand'), (s) => s.rrect(-K.x, -K.z, K.x, K.z, 1.75));
  o.extrude('boss', -K.onder, { omkeren: true, terug: 0.5, naam: 'Bak' });
  const xi = K.x - K.wand, zi = K.z - K.wand;
  o.schets(yv('bovenvlak', K.rand.dikte), (s) => s.rrect(-xi, -zi, xi, zi));
  o.extrude('cut', K.rand.dikte - K.onder - K.bodem, { omkeren: true, naam: 'Holte' });
  o.schets(yv('bodem', K.onder + K.bodem), (s) => {
    const nx = 7, nz = 5, p = 21, c = 18;
    const x0 = -(nx * p - 3) / 2, z0 = -(nz * p - 3) / 2;
    // rechte hoeken: snel in de mesh-kernel
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) s.rrectW([x0 + i * p, 0, z0 + j * p], [x0 + i * p + c, 0, z0 + j * p + c]);
  });
  o.extrude('cut', K.bodem + 1, { omkeren: true, naam: 'Roosterbodem' });
  // uitsparingen voor de lippen van het frame (M5-koppen) en twee greepuitsparingen in de vrije hoek van een toren;
  // eronder is de toren dicht en de rand rust er nog 3 mm breed op: geen lucht langs de filters
  o.schets(yv('bovenvlak', K.rand.dikte), (s) => assen().forEach(([x, z]) => {
    const k = Math.sign(x);
    s.rrectW([k * (M.lip.x - 0.5), 0, z - M.lip.z - 0.5], [k * (K.rand.x + 1), 0, z + M.lip.z + 0.5]);
    if (x * z > 0) s.rrectW([k * 84, 0, z + intrek(x) * 13 - 5], [k * (K.rand.x + 1), 0, z + intrek(x) * 13 + 5]);
  }));
  o.extrude('cut', K.rand.dikte + 0.5, { omkeren: true, naam: 'Uitsparingen lippen en greep' });
  return o.doc();
}

/** de drie filterlagen in de cassette, van boven naar onder */
export function filterlaag(i) {
  const { cassette: K } = M;
  const f = M.filters[i];
  const boven = -M.filters.slice(0, i).reduce((a, q) => a + q.dikte, 0); // de G4 begint onder de rand (Y = 0)
  const xi = K.x - K.wand - 0.25, zi = K.z - K.wand - 0.25;
  const o = new Onderdeel(f.naam, { name: f.naam, density: 60, color: f.kleur });
  o.schets(yv(`laag${f.id}`, boven - f.dikte, 'reference', `Plane ${f.id}`), (s) => s.rrect(-xi, -zi, xi, zi));
  o.extrude('boss', f.dikte, { naam: 'Mat' });
  return o.doc();
}

/** bodemplaat over de hele onderkant (één vorm): onder de ventilator de lamellen die de lucht naar achteren sturen,
 *  onder het elektronicavak de DC-bus en de kabeldoorvoer naar de draaiknop; 6 schroeven in de torens en de bussen
 *  van de tussenwand. Losschroeven geeft toegang tot de elektronica (de ventilator zit op de plaat). */
const plaatSchroeven = () => [...m3onder(), ...bussenTussenwand()];
const fanGaten = () => [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([kx, kz]) => [kx * M.fan.gat / 2, kz * M.fan.gat / 2]);
export function uitblaasplaat() {
  const { romp: R, uitblaas: U, fan: V } = M;
  const o = new Onderdeel('Bodemplaat', PETG);
  const y1 = R.onder, y0 = R.onder - U.dikte;
  o.schets(yv('plaat', y1, 'reference', 'Plane bodemplaat'), (s) => {
    s.rrect(-R.b / 2, -R.d / 2, R.b / 2, R.d / 2, R.r);
    s.cirkel(0, 0, 58);
  });
  o.extrude('boss', U.dikte, { omkeren: true, naam: 'Plaat' });
  o.schets(vlak('lamellen', 'Plane lamellen', [-60, 0, 0], [1, 0, 0], 'reference'), (s) => {
    for (let z = -54; z <= 58; z += U.steek) s.lusW([[-60, y0, z - U.dikte], [-60, y0, z - U.dikte + U.lamel], [-60, y1, z + U.lamel], [-60, y1, z]]);
  });
  o.extrude('boss', 120, { naam: 'Lamellen' });
  // verzonken schroeven (DIN 7991): de koppen liggen vlak in de onderkant, de verzinkingen zijn conisch (90°)
  const onder = vlak('plaatonder', 'Face onderkant bodemplaat', [0, y0, 0], [0, -1, 0]);
  o.schets(onder, (s) => fanGaten().forEach(([x, z]) => s.cirkelW([x, y0, z], 4.1)));
  o.extrude('cut', 2.3, { omkeren: true, naam: 'Verzinking M4', draft: 45 });
  o.schets(onder, (s) => plaatSchroeven().forEach(([x, z]) => s.cirkelW([x, y0, z], 3.1)));
  o.extrude('cut', 1.6, { omkeren: true, naam: 'Verzinking M3', draft: 45 });
  o.schets(yv('plaat', y1, 'reference', 'Plane bodemplaat'), (s) => {
    fanGaten().forEach(([x, z]) => s.cirkelW([x, 0, z], 2.25));
    plaatSchroeven().forEach(([x, z]) => s.cirkelW([x, 0, z], 1.7));
    s.cirkelW([-86, 0, 2], 4); // DC-bus 5,5 x 2,1 (inbouw, moer), naast de print
    s.cirkelW([-86, 0, -13], 5); // kabeldoorvoer naar de draaiknop (kabeltule)
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

/** klauw: RVS 4 mm, lasergesneden, gat Ø4,2 getapt M5; oorsprong op de schroefas, onderkant op Y = 0 */
export function klauw() {
  const { klauw: C } = M;
  const o = new Onderdeel('Klauw', RVS304);
  const w = C.breed / 2, xr = Math.sqrt(C.naaf * C.naaf - w * w), e = C.arm - w;
  o.schets(TOP, (s) => s.pad([[xr, -w], [e, -w], { boog: [e, 0], naar: [e, w], ccw: true }, [xr, w], { boog: [0, 0], naar: [xr, -w], ccw: true }]));
  o.extrude('boss', C.dik, { naam: 'Klauw' });
  o.schets(yv('boven', C.dik), (s) => s.cirkel(0, 0, 2.1));
  o.extrude('cut', C.dik + 1, { omkeren: true, naam: 'Gat M5 (tappen)' });
  return o.doc();
}

/** houder voor de VIEWE-knop (zwart PETG, ondersteboven geprint, de plaat op het bed): plaat Ø51,6 onder de knop
 *  (even groot, van boven zie je alleen de knop), buis door het gat van Ø44, kom voor de naaf met de 2 schroefgaten
 *  M2,5 en de 2 pennen, een sleuf voor de FPC; twee stalen klauwen (M3 x 60 verzonken van bovenaf, de koppen onder de
 *  knop) die door een venster uitzwaaien en tegen de onderkant van het blad trekken (blad 10 tot 50 mm); binnenin
 *  geleiders voor de adapterprint. Onderaan het deksel. Oorsprong: midden van het gat, bovenvlak van het blad. */
export function knophouder() {
  const { dial: D } = M;
  const C = D.klauw;
  const o = new Onderdeel('Knophouder', PETG_ZWART);
  const R = D.buis, Ri = R - D.wand;
  o.schets(TOP, (s) => s.cirkel(0, 0, D.d / 2));
  o.extrude('boss', D.plaat, { naam: 'Plaat' });
  o.schets(TOP, (s) => s.cirkel(0, 0, R));
  o.extrude('boss', -D.onder, { omkeren: true, terug: 0.5, naam: 'Buis' });
  // kom voor de naaf in twee trappen, daaronder de vloer
  let y = D.plaat;
  D.naaf.forEach(([r, d], i) => {
    o.schets(yv(`kom${i}`, y), (s) => s.cirkel(0, 0, r));
    o.extrude('cut', d, { omkeren: true, naam: `Kom naaf ${i + 1}` });
    y -= d;
  });
  const yv0 = y, yv1 = y - D.vloer; // vloer
  o.schets(yv('vloer', yv0), (s) => {
    D.schroeven.forEach(([x, z]) => s.cirkelW([x, 0, z], 1.4));
    D.pennen.forEach(([x, z]) => s.cirkelW([x, 0, z], 0.85));
    s.rrectW([D.fpc.x - 1.3, 0, -D.fpc.b / 2 - 0.75], [D.fpc.x + 1.3, 0, D.fpc.b / 2 + 0.75]);
  });
  o.extrude('cut', D.vloer + 1, { omkeren: true, naam: 'Gaten vloer' });
  // holte onder de vloer, met behuizingen voor de klauwkanalen, geleiders voor de print en bussen voor het deksel
  o.schets(yv('holte', yv1, 'reference', 'Plane holte'), (s) => s.cirkel(0, 0, Ri));
  o.extrude('cut', yv1 - D.onder + 1, { omkeren: true, naam: 'Holte' });
  o.schets(yv('holte', yv1, 'reference', 'Plane holte'), (s) => {
    for (const k of [1, -1]) s.rrectW([k * (C.x - C.naaf - 2), 0, -C.naaf - 2], [k * (Ri + 0.5), 0, C.naaf + 2]);
    for (const k of [1, -1]) s.rrectW([D.adapter.x - 1.5, 0, k * (D.adapter.b / 2 - 0.9)], [D.adapter.x + 3.1, 0, k * D.rib]);
    for (const k of [1, -1]) s.cirkelW([0, 0, k * D.bus], 3);
  });
  o.extrude('boss', yv1 - D.onder, { omkeren: true, terug: 0.5, naam: 'Behuizingen' });
  // geleidegroeven voor de adapterprint (1,6 mm, van onderen inschuiven)
  o.schets(yv('onderkant', D.onder, 'reference', 'Plane onderkant'), (s) => {
    for (const k of [1, -1]) s.rrectW([D.adapter.x - 0.1, 0, k * (D.adapter.b / 2 - 1.6)], [D.adapter.x + 1.7, 0, k * (D.adapter.b / 2 + 0.1)]);
  });
  o.extrude('cut', D.adapter.top - D.onder, { naam: 'Groeven adapterprint' });
  // schroefgaten voor het deksel (M2,5 zelftappend)
  o.schets(yv('onderkant', D.onder, 'reference', 'Plane onderkant'), (s) => [1, -1].forEach((k) => s.cirkelW([0, 0, k * D.bus], 1.05)));
  o.extrude('cut', 8, { naam: 'Gaten deksel' });
  // klauwen: verzonken M3 van bovenaf door de plaat (conische zitting, de koppen liggen onder de voet van de knop)
  const as = [[C.x, 0], [-C.x, 0]];
  o.schets(yv('plaattop', D.plaat), (s) => as.forEach(([x, z]) => s.cirkelW([x, 0, z], 3.2)));
  o.extrude('cut', 1.7, { omkeren: true, naam: 'Verzinking M3', draft: 45 });
  o.schets(yv('plaattop', D.plaat), (s) => as.forEach(([x, z]) => s.cirkelW([x, 0, z], 1.7)));
  o.extrude('cut', D.plaat - C.top + 1, { omkeren: true, naam: 'Gaten M3' });
  o.schets(yv('dkanaal', C.top, 'reference', 'Plane top klauwkanaal'), (s) => as.forEach(([x, z]) => s.rrectW([x - C.naaf - 0.5, 0, z - C.naaf - 0.5], [x + C.naaf + 0.5, 0, z + C.naaf + 0.5])));
  o.extrude('cut', C.top - C.bodem, { omkeren: true, naam: 'Klauwkanalen' });
  // ingetrokken ligt de arm onderaan langs de buis (de klauw schuift er van onderen in)
  o.schets(yv('dzwaai', C.bodem + C.dik + 6, 'reference', 'Plane zwaaivenster'), (s) => as.forEach(([x, z]) => {
    const k = Math.sign(x), d = intrek(x);
    s.rrectW([x - k * (C.breed / 2 + 0.5), 0, z], [k * (R + 1), 0, z + d * (C.arm + 0.5)]);
  }));
  o.extrude('cut', C.dik + 6, { omkeren: true, naam: 'Klauwen ingetrokken' });
  for (const kant of [1, -1]) {
    const pl = vlak(kant > 0 ? 'dwandR' : 'dwandL', kant > 0 ? 'Plane wand rechts' : 'Plane wand links', [kant * (R + 1), 0, 0], [kant, 0, 0], 'reference');
    o.schets(pl, (s) => {
      const z = 0, d = intrek(kant), b = C.breed / 2 + 0.5, a = z + d * (C.arm + 0.5), c = z - d * (C.naaf + 1);
      const lo = Math.min(a, c), hi = Math.max(a, c), y0 = C.bodem - 0.5, yw = C.bodem + C.dik + 6, y1 = C.top;
      s.lusW([[lo, y0], [hi, y0], [hi, yw], [z + b, yw], [z + b, y1], [z - b, y1], [z - b, yw], [lo, yw]].map(([zz, y]) => [kant * (R + 1), y, zz]));
    });
    o.extrude('cut', 12, { omkeren: true, naam: kant > 0 ? 'Sleuf rechts' : 'Sleuf links' });
  }
  return o.doc();
}

/** deksel onderaan de knophouder (plat geprint): 2 x M2,5 verzonken, de USB-C-bus om de knop te flashen en de tule
 *  voor de kabel naar de module; los te schroeven voor de schroeven van de knop en de adapterprint */
export function knopdeksel() {
  const { dial: D } = M;
  const o = new Onderdeel('Knopdeksel', PETG_ZWART);
  const y0 = D.onder - D.deksel;
  o.schets(yv('deksel', D.onder, 'reference', 'Plane deksel'), (s) => s.cirkel(0, 0, D.buis));
  o.extrude('boss', D.deksel, { omkeren: true, naam: 'Deksel' });
  const onder = vlak('dekselonder', 'Face onderkant deksel', [0, y0, 0], [0, -1, 0]);
  o.schets(onder, (s) => [1, -1].forEach((k) => s.cirkelW([0, y0, k * D.bus], 2.6)));
  o.extrude('cut', 1.25, { omkeren: true, naam: 'Verzinking M2,5', draft: 45 });
  o.schets(onder, (s) => {
    [1, -1].forEach((k) => s.cirkelW([0, y0, k * D.bus], 1.4));
    s.rrectW([D.adapter.x - 3.6, y0, -4.8], [D.adapter.x + 0.3, y0, 4.8], 1.5); // USB-C-bus onderaan de adapterprint
    s.cirkelW([-6, y0, -11.5], 5); // kabeltule Ø10 voor de kabel naar de module
  });
  o.extrude('cut', D.deksel + 1, { omkeren: true, naam: 'Gaten' });
  return o.doc();
}

/** kleine klauw voor de knophouder: RVS 3 mm, lasergesneden, gat Ø2,5 getapt M3 */
export function dialklauw() {
  const C = M.dial.klauw;
  const o = new Onderdeel('Knopklauw', RVS304);
  const w = C.breed / 2, xr = Math.sqrt(C.naaf * C.naaf - w * w), e = C.arm - w;
  o.schets(TOP, (s) => s.pad([[xr, -w], [e, -w], { boog: [e, 0], naar: [e, w], ccw: true }, [xr, w], { boog: [0, 0], naar: [xr, -w], ccw: true }]));
  o.extrude('boss', C.dik, { naam: 'Klauw' });
  o.schets(yv('boven', C.dik), (s) => s.cirkel(0, 0, 1.25));
  o.extrude('cut', C.dik + 1, { omkeren: true, naam: 'Gat M3 (tappen)' });
  return o.doc();
}

// ---- normdelen: schroeven, bouten en moeren (vereenvoudigd; de schacht met de kerndiameter) ----

/** verzonken schroef (DIN 7991): oorsprong boven op de kop, schacht langs -Y */
export function schroefVerzonken(naam, d, kern, L) {
  const o = new Onderdeel(naam, { name: 'Staal A2', density: 7900, color: '#8d939a' });
  const D = 2 * d, hk = (D - d) / 2;
  o.schets(TOP, (s) => s.cirkel(0, 0, D / 2));
  o.extrude('boss', hk, { omkeren: true, naam: 'Kop', draft: 45 });
  o.schets(yv('schacht', -hk + 0.2, 'reference', 'Plane schacht'), (s) => s.cirkel(0, 0, kern / 2));
  o.extrude('boss', L - hk + 0.2, { omkeren: true, naam: 'Schacht' });
  return o.doc();
}

/** cilinderkopschroef (DIN 912/7985): oorsprong onder de kop, kop langs +Y, schacht langs -Y */
export function schroefCilinder(naam, D, h, kern, L) {
  const o = new Onderdeel(naam, { name: 'Staal verzinkt', density: 7850, color: '#9aa0a8' });
  o.schets(TOP, (s) => s.cirkel(0, 0, D / 2));
  o.extrude('boss', h, { naam: 'Kop' });
  o.schets(TOP, (s) => s.cirkel(0, 0, kern / 2));
  o.extrude('boss', L, { omkeren: true, terug: 0.5, naam: 'Schacht' });
  return o.doc();
}

/** zeskantmoer: oorsprong onder in het midden, hoogte langs +Y */
export function moer(naam, s0, h, gat) {
  const o = new Onderdeel(naam, { name: 'Staal verzinkt', density: 7850, color: '#9aa0a8' });
  const R = s0 / Math.sqrt(3);
  o.schets(TOP, (s) => { s.lus(Array.from({ length: 6 }, (_, i) => [R * Math.cos((i * Math.PI) / 3), R * Math.sin((i * Math.PI) / 3)])); s.cirkel(0, 0, gat / 2); });
  o.extrude('boss', h, { naam: 'Moer' });
  return o.doc();
}

/** VIEWE-knop 1,5" (vereenvoudigd uit de maattekening): Ø51,6 x 14 (voet 2,5 + draaiknop met scherm), achteraan de
 *  naaf (Ø24 x 4,9 en Ø21,3 x 3) met 2 schroefgaten M2,5 en 2 pennen Ø1,5, en de FPC (5,5 breed) naar beneden;
 *  oorsprong onder in het midden (onderkant van de voet) */
export function vieweKnop() {
  const { dial: D } = M;
  const o = new Onderdeel('VIEWE-knop 1,5"', { name: 'Aluminium, zwart', density: 2700, color: '#1d1d1f' });
  o.schets(TOP, (s) => s.cirkel(0, 0, D.d / 2));
  o.extrude('boss', D.voet, { naam: 'Voet' });
  o.schets(yv('voet', D.voet), (s) => s.cirkel(0, 0, D.d / 2 - 0.3));
  o.extrude('boss', D.hoogte - D.voet, { terug: 0.5, naam: 'Draaiknop met scherm' });
  let y = 0;
  [[12, 4.9], [10.65, 3]].forEach(([r, d], i) => {
    o.schets(yv(`naaf${i}`, y, 'reference', `Plane naaf ${i + 1}`), (s) => s.cirkel(0, 0, r));
    o.extrude('boss', d, { omkeren: true, terug: 0.5, naam: `Naaf ${i + 1}` });
    y -= d;
  });
  o.schets(yv('naafachter', y, 'reference', 'Plane achterkant naaf'), (s) => D.pennen.forEach(([x, z]) => s.cirkelW([x, 0, z], 0.75)));
  o.extrude('boss', 2.05, { omkeren: true, terug: 0.5, naam: 'Pennen' });
  o.schets(yv('naafachter', y, 'reference', 'Plane achterkant naaf'), (s) => s.rrectW([D.fpc.x - 0.15, 0, -D.fpc.b / 2], [D.fpc.x + 0.15, 0, D.fpc.b / 2]));
  o.extrude('boss', 14, { omkeren: true, terug: 0.5, naam: 'FPC' });
  o.schets(yv('naafachter', y, 'reference', 'Plane achterkant naaf'), (s) => D.schroeven.forEach(([x, z]) => s.cirkelW([x, 0, z], 1.25)));
  o.extrude('cut', 5, { naam: 'Schroefgaten M2,5' });
  return o.doc();
}

/** adapterprint in de knophouder (-A3): FPC-bus 10-polig 0,5 mm bovenaan, schroefklem 6-polig voor de kabel naar de
 *  module, onderaan een USB-C-bus (in het deksel: flashen zonder iets los te maken); schuift van onderen in de groeven
 *  van de houder, onderdelen naar -X (naar de FPC toe) */
export function knopadapter() {
  const { dial: D } = M;
  const A = D.adapter;
  const o = new Onderdeel('Adapterprint knop', PCB);
  const pl = vlak('adapter', 'Plane adapterprint', [A.x, 0, 0], [1, 0, 0], 'reference');
  o.schets(pl, (s) => s.rrectW([A.x, A.top - A.h, -A.b / 2 + 0.1], [A.x, A.top, A.b / 2 - 0.1]));
  o.extrude('boss', 1.6, { naam: 'Print' });
  o.schets(vlak('adaptervoor', 'Plane onderdelen', [A.x + 0.3, 0, 0], [-1, 0, 0], 'reference'), (s) => {
    s.rrectW([A.x, A.top - 5, -7], [A.x, A.top - 1, 7]); // FPC-bus 10-polig, 0,5 mm
    s.rrectW([A.x, A.top - 33, -10.5], [A.x, A.top - 25.5, 10.5]); // schroefklem 6-polig, steek 3,5 mm
  });
  o.extrude('boss', 5, { naam: 'Onderdelen' });
  o.schets(vlak('adaptervoor', 'Plane onderdelen', [A.x + 0.3, 0, 0], [-1, 0, 0], 'reference'), (s) =>
    s.rrectW([A.x, A.top - A.h + 0.5, -4.45], [A.x, A.top - A.h + 7.5, 4.45])); // USB-C-bus, opening naar beneden
  o.extrude('boss', 3.5, { naam: 'USB-C-bus' });
  return o.doc();
}

/** interfaceprint: gaatjesprint 30 x 70 mm staand op de bussen van de tussenwand, onderdelen naar het vak toe:
 *  IRF4905 plat, 2 x BC547, MCP1700 (3,3 V), zekeringhouder, schroefklemmen (-X3, -X4), 5V-regelaar D24V5F5 en de drukmeter SDP810
 *  (poort "-" met een slangetje naar het tuitje in het plafond, poort "+" open in het vak = kamerdruk) */
export function interfaceprint() {
  const { vak: V, print: P } = M;
  const o = new Onderdeel('Interfaceprint', PCB);
  const xp = V.binnen - V.wand - P.bus; // de print ligt tegen de bussen
  o.schets(vlak('printvlak', 'Plane print', [xp, 0, 0], [-1, 0, 0], 'reference'), (s) =>
    s.rrectW([xp, P.y - P.h / 2, P.z - P.b / 2], [xp, P.y + P.h / 2, P.z + P.b / 2], 1));
  o.extrude('boss', 1.6, { naam: 'Print' });
  o.schets(vlak('printgat', 'Plane gaten print', [xp - 1.6, 0, 0], [-1, 0, 0], 'reference'), (s) =>
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([kz, ky]) => s.cirkelW([xp - 1.6, P.y + ky * P.gat[1] / 2, P.z + kz * P.gat[0] / 2], 1.1)));
  o.extrude('cut', 3, { omkeren: true, naam: 'Gaten M2,5' });
  o.schets(vlak('onderdelenvlak', 'Plane onderdelen', [xp - 1.2, 0, 0], [-1, 0, 0], 'reference'), (s) => {
    // de hoek z 13..30, onderaan, blijft vrij voor de achterkant van de schakelaar
    s.rrectW([xp, P.y + 6, P.z + 13.5], [xp, P.y + 14, P.z + 30]); // schroefklemmen 3,5 mm en de 5V-regelaar
    s.rrectW([xp, P.y - 2, P.z - 8], [xp, P.y + 13, P.z + 12]); // IRF4905 plat, transistors, regelaar
    s.rrectW([xp, P.y - 13, P.z - 30], [xp, P.y + 2, P.z - 12]); // SDP810
    s.rrectW([xp, P.y - 13, P.z - 10], [xp, P.y - 5, P.z + 10]); // zekeringhouder
  });
  o.extrude('boss', 11, { naam: 'Onderdelen' });
  return o.doc();
}

/** wipschakelaar KCD1-101 (vereenvoudigd) in de kom van de linkerzijwand: rand 21 x 15 op het paneel, de wip 1 mm
 *  binnen de wand, het huis met de vlakstekers achter het paneel in het vak */
export function schakelaar() {
  const { schakelaar: S, romp: R } = M;
  const o = new Onderdeel('Wipschakelaar KCD1-101', ZWART);
  const xk = -R.b / 2 + S.diep; // buitenkant van het paneel
  o.schets(vlak('huis', 'Plane huis', [xk - 0.1, 0, 0], [1, 0, 0], 'reference'), (s) =>
    s.rrectW([xk - 0.1, S.y - S.gat[1] / 2 + 0.2, S.z - S.gat[0] / 2 + 0.2], [xk - 0.1, S.y + S.gat[1] / 2 - 0.2, S.z + S.gat[0] / 2 - 0.2]));
  o.extrude('boss', 19.1, { naam: 'Huis en stekers' });
  o.schets(vlak('rand', 'Plane rand', [xk - 0.1, 0, 0], [-1, 0, 0], 'reference'), (s) =>
    s.rrectW([xk - 0.1, S.y - 10.5, S.z - 7.5], [xk - 0.1, S.y + 10.5, S.z + 7.5], 1));
  o.extrude('boss', 2, { terug: 0.05, naam: 'Rand' });
  o.schets(vlak('wip', 'Plane wip', [xk - 2.1, 0, 0], [-1, 0, 0], 'reference'), (s) =>
    s.rrectW([xk - 2.1, S.y - 9, S.z - 6], [xk - 2.1, S.y + 9, S.z + 6], 1));
  o.extrude('boss', S.diep - 3.1, { terug: 0.3, naam: 'Wip' });
  return o.doc();
}

/** alle componenten van de afzuiging, verschoven met `o` (de oorsprong van de module in de assemblage); blad = dikte */
export function afzuigingComponenten(o = [0, 0, 0], prefix = 'a', blad = M.blad) {
  const at = (p) => [o[0] + p[0], o[1] + p[1], o[2] + p[2]];
  const halfY = [0, 1, 0, 0]; // 180° om Y: de arm wijst naar -X
  const comps = [
    component(`${prefix}1`, 'Romp<1>', romp(), at([0, 0, 0])),
    component(`${prefix}6`, 'Bovenframe<1>', bovenframe(), at([0, 0, 0])),
    component(`${prefix}2`, 'Rooster LB<1>', rooster(), at([0, 0, 0])),
    component(`${prefix}3`, 'Filtercassette<1>', cassette(), at([0, 0, 0])),
    ...M.filters.map((f, i) => component(`${prefix}f${i + 1}`, `${f.naam}<1>`, filterlaag(i), at([0, 0, 0]))),
    component(`${prefix}4`, 'Bodemplaat<1>', uitblaasplaat(), at([0, 0, 0])),
    component(`${prefix}5`, 'Delta PFR1212UHE-SP00<1>', ventilator(), at([0, 0, 0])),
  ];
  const k = klauw();
  assen().forEach(([x, z], i) =>
    comps.push(component(`${prefix}k${i + 1}`, `Klauw<${i + 1}>`, k, at([x, -blad - M.klauw.dik, z]), { rotation: x > 0 ? [0, 0, 0, 1] : halfY })));
  const d = M.dial, DC = d.klauw;
  comps.push(component(`${prefix}7`, 'Knophouder<1>', knophouder(), at([d.x, 0, d.z])));
  comps.push(component(`${prefix}12`, 'Knopdeksel<1>', knopdeksel(), at([d.x, 0, d.z])));
  comps.push(component(`${prefix}8`, 'VIEWE-knop 1,5"<1>', vieweKnop(), at([d.x, d.plaat, d.z])));
  comps.push(component(`${prefix}14`, 'Adapterprint knop<1>', knopadapter(), at([d.x, 0, d.z])));
  const dk = dialklauw();
  [DC.x, -DC.x].forEach((x, i) => comps.push(component(`${prefix}dk${i + 1}`, `Knopklauw<${i + 1}>`, dk, at([d.x + x, -blad - DC.dik, d.z]), { rotation: x > 0 ? [0, 0, 0, 1] : halfY })));
  // normdelen
  const omhoog = [1, 0, 0, 0]; // 180° om X: schroef van onderen
  const opzij = [0, 0, Math.SQRT1_2, Math.SQRT1_2]; // 90° om Z: schacht naar +X
  const m5 = schroefVerzonken('M5 x 65 DIN 7991', 5, 4.2, 65);
  assen().forEach(([x, z], i) => comps.push(component(`${prefix}s5${i + 1}`, `M5 x 65 DIN 7991<${i + 1}>`, m5, at([x, M.frame.dikte, z]))));
  // van onderen: verzonken, de koppen liggen vlak in de bodemplaat
  const m3p = schroefVerzonken('M3 x 16 DIN 7991', 3, 2.5, 16);
  plaatSchroeven().map(([x, z]) => [x, M.romp.onder - M.uitblaas.dikte, z])
    .forEach(([x, y, z], i) => comps.push(component(`${prefix}s3${i + 1}`, `M3 x 16 DIN 7991<${i + 1}>`, m3p, at([x, y, z]), { rotation: omhoog })));
  const m4 = schroefVerzonken('M4 x 45 DIN 7991', 4, 3.4, 45);
  const m4m = moer('M4 moer DIN 934', 7, 3.2, 4);
  fanGaten().forEach(([x, z], i) => {
    comps.push(component(`${prefix}s4${i + 1}`, `M4 x 45 DIN 7991<${i + 1}>`, m4, at([x, M.romp.onder - M.uitblaas.dikte, z]), { rotation: omhoog }));
    comps.push(component(`${prefix}m4${i + 1}`, `M4 moer DIN 934<${i + 1}>`, m4m, at([x, M.fan.top, z])));
  });
  const m25 = schroefCilinder('M2,5 x 6 zelftappend', 4.5, 2, 2, 6);
  const m25k = schroefCilinder('M2,5 x 6 cilinderkop', 4.5, 2, 2.2, 6);
  const P = M.print, xp = M.vak.binnen - M.vak.wand - P.bus - 1.6;
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([kz, ky], i) =>
    comps.push(component(`${prefix}s25${i + 1}`, `M2,5 x 6 zelftappend<${i + 1}>`, m25, at([xp, P.y + ky * P.gat[1] / 2, P.z + kz * P.gat[0] / 2]), { rotation: opzij })));
  const m3d = schroefVerzonken('M3 x 60 DIN 7991', 3, 2.5, 60);
  [DC.x, -DC.x].forEach((x, i) => comps.push(component(`${prefix}sd${i + 1}`, `M3 x 60 DIN 7991<${i + 1}>`, m3d, at([d.x + x, d.plaat, d.z]))));
  // de knop met 2 x M2,5 x 6 van onderen in de naaf; het deksel met 2 x M2,5 x 8 verzonken
  const vloerOnder = d.plaat - d.naaf.reduce((a2, [, dd]) => a2 + dd, 0) - d.vloer;
  d.schroeven.forEach(([x, z], i) => comps.push(component(`${prefix}sk${i + 1}`, `M2,5 x 6 cilinderkop<${i + 1}>`, m25k, at([d.x + x, vloerOnder, d.z + z]), { rotation: omhoog })));
  const m25d = schroefVerzonken('M2,5 x 8 DIN 7991', 2.5, 2, 8);
  [1, -1].forEach((k, i) => comps.push(component(`${prefix}sdk${i + 1}`, `M2,5 x 8 DIN 7991<${i + 1}>`, m25d, at([d.x, d.onder - d.deksel, d.z + k * d.bus]), { rotation: omhoog })));
  comps.push(component(`${prefix}11`, 'Interfaceprint<1>', interfaceprint(), at([0, 0, 0])));
  comps.push(component(`${prefix}13`, 'Wipschakelaar KCD1-101<1>', schakelaar(), at([0, 0, 0])));
  return { components: comps, mates: [] };
}

/** de assemblage van de afzuiging alleen */
export function afzuiging() {
  const { components, mates } = afzuigingComponenten();
  return { format: 'phlippo-cad', version: 1, name: 'Afzuiging', units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components, mates };
}

/** de uitsparingen in het tafelblad (assenstelsel van het blad: bovenvlak op Y = blad): frezen (Ø10) en gatzaag Ø44 */
export function bladUitsparingen(o, x0 = 0, z0 = 0, blad = M.blad) {
  const { uitsparing: U, dial: D } = M;
  o.schets(vlak('bladtop', 'Face bovenvlak', [0, blad, 0], [0, 1, 0]), (s) => {
    s.rrectW([x0 - U.b / 2, 0, z0 - U.d / 2], [x0 + U.b / 2, 0, z0 + U.d / 2], U.r);
    s.cirkelW([x0 + D.x, 0, z0 + D.z], D.gat / 2);
  });
  o.extrude('cut', blad + 1, { omkeren: true, naam: 'Uitsparingen afzuiging' });
}

export const ONDERDELEN = {
  'Romp.kcad': romp,
  'Bovenframe.kcad': bovenframe,
  'Rooster-LB.kcad': rooster,
  'Filtercassette.kcad': cassette,
  'Voorfilter-G4.kcad': () => filterlaag(0),
  'Fijnstoffilter-M5.kcad': () => filterlaag(1),
  'Actieve-koolmat.kcad': () => filterlaag(2),
  'Bodemplaat.kcad': uitblaasplaat,
  'Ventilator-Delta-PFR1212UHE.kcad': ventilator,
  'Klauw.kcad': klauw,
  'Knophouder.kcad': knophouder,
  'Knopdeksel.kcad': knopdeksel,
  'Knopklauw.kcad': dialklauw,
  'VIEWE-knop-1.5.kcad': vieweKnop,
  'Adapterprint-knop.kcad': knopadapter,
  'Interfaceprint.kcad': interfaceprint,
  'Wipschakelaar-KCD1.kcad': schakelaar,
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const schrijf = (naam, doc) => writeFileSync(join(HERE, naam), JSON.stringify(doc, null, 1) + '\n');
  for (const [naam, f] of Object.entries(ONDERDELEN)) schrijf(naam, f());
  schrijf('Afzuiging.kcad', afzuiging());
  // vervangen door versie 3
  for (const oud of ['Inbouwmodule.kcad', 'Filterlade.kcad', 'print/Inbouwmodule.stl', 'print/Filterlade.stl', 'Filtermat.kcad', 'Ventilatorplaat.kcad', 'Ventilator-NF-F12.kcad', 'print/Ventilatorplaat.stl', 'print/Klauw.stl',
    'Elektronicabox.kcad', 'Deksel-elektronicabox.kcad', 'print/Elektronicabox.stl', 'print/Deksel-elektronicabox.stl', 'Dialhouder.kcad', 'print/Dialhouder.stl',
    'Uitblaasplaat.kcad', 'print/Uitblaasplaat.stl', 'Deksel-elektronicavak.kcad', 'print/Deksel-elektronicavak.stl',
    'Dialkuip.kcad', 'Dialring.kcad', 'Dialklauw.kcad', 'M5Stack-Dial.kcad', 'print/Dialkuip.stl', 'print/Dialring.stl'])
    if (existsSync(join(HERE, oud))) rmSync(join(HERE, oud));
  console.log('geschreven:', [...Object.keys(ONDERDELEN), 'Afzuiging.kcad'].join(', '));
}
