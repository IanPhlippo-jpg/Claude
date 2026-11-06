// Ingebouwde nagelstofafzuiging voor het bureau (versie 4.2, 2026-11-06), als Phlippo CAD-documenten.
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
// DC-bus en de USB-C-bus voor de knop; aan/uit-schakelaar in de linkerzijwand. Een ESP32-C3 in de module stuurt de
// ventilator en leest de drukmeter; de knop praat er draadloos mee (ESP-NOW) en krijgt alleen 5 V over een gewone
// USB-C-kabel, die in een sleuf onder het blad loopt (elke lengte, niets knippen). De drukmeter meet via een tuitje in het plafond van het vak.
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
  frame: { b: 222, d: 222, r: 6, dikte: 2.5, opening: { x: 100.5, z: 100.5, r: 4 } },
  // vierkante romp rond de radiale ventilator: past op een printbed van 225 x 225
  romp: { b: 210, d: 210, r: 6, wand: 4, onder: -114 },
  uitsparing: { b: 212, d: 212, r: 6 }, // te frezen in het blad
  // klauwen in de hoeken (daar is ruimte naast de ronde waaier); RVS 4 mm, M5-draad
  klauw: { x: 96.5, z: 72, naaf: 6.5, arm: 18, breed: 8, dik: 4 }, // ingetrokken blijft de naaf 2 mm binnen de romp
  toren: { binnen: 87.5, top: -9, zwaai: -55, bodem: -61 }, // sleuf van top tot bodem, zwaaivenster onderaan
  // filtercassette in twee delen: de bak (rechtop geprint, de roosterbodem op het bed) en een vlakke rand die erop
  // gelijmd wordt; filters 170 x 190 mm (bijna dubbel zoveel oppervlak: minder weerstand)
  cassette: { x: 87, z: 97, rand: { x: 100.25, z: 100.25, dikte: 2.5 }, onder: -37, wand: 2, bodem: 2 },
  richel: { x: 99, z: 99, dikte: 1.5 }, // binnenrichel bovenaan de romp: de cassetterand rust er rondom op (geen omloop)
  lip: { x: 91, z: 6 }, // lippen van het bovenframe boven de torens, voor de kop van de M5-schroef
  filters: [
    // lage weerstand voor veel zuigkracht: een vlakke F7-mat zou de luchtstroom smoren
    { id: 'g4', naam: 'Voorfilter G4', dikte: 10, kleur: '#ebe8df' },
    { id: 'm5', naam: 'Fijnstoffilter M5', dikte: 15, kleur: '#f6f6f2' },
    { id: 'kool', naam: 'Actieve koolmat', dikte: 10, kleur: '#2f3033' },
  ],
  // radiale ventilator met achterwaarts gebogen schoepen: San Ace C175 9TG24P0S01 (Ø175 x 69, 24 V, 56 W, PWM 25 kHz);
  // waaier 60,5 hoog, instroomoog Ø131, motor 4 x M4 op Ø58 (schroefdiepte 4 tot 6 mm)
  fan: { d: 175, waaier: 60.5, h: 69, oog: 131, naaf: 36, gat: 29, top: -45 },
  // instroomplaat (los geprint, op een richel gelijmd) met een trechter boven het oog van de waaier, 2 mm erboven
  inlaat: { top: -40, dikte: 3, gat: 63.5, kraag: 66.5 },
  uitblaas: { dikte: 6, steek: 8, lamel: 2, schijf: 45 },
  magneten: { d: 8, h: 2, plaats: [[105.75, 30], [105.75, -30], [-105.75, 30], [-105.75, -30]] }, // verzonken in het frame, onder de plaat
  // in de achterwand (perszijde, onder het blad): de M8-bus voor de ventilator en het meetbuisje naar de drukmeter in de
  // voedingsbox; het meetpunt zelf is een messingbuisje in de instroomplaat (de onderdruk onder de filters)
  achter: { m8: { x: -60, y: -95 }, buis: { x: -75, y: -100 }, meet: [-85, -85] },
  // wipschakelaar KCD1-101 (21 x 15, inbouwgat 19 x 13) in een kom van 6 mm: de wip ligt 1 mm binnen de wand
  schakelaar: { diep: 6, paneel: 2 },
  // voedingsbox: 15 mm onderaan in het blad gefreesd, de rand drukt op de onderhuid (4 pluggen voor holle deuren); de
  // maten zijn t.o.v. de onderkant van het blad (Y = 0) en het midden van de box. Netadapter Mean Well GST90A24-P1M
  // (145 x 60 x 32, C14-inlaat); de C13-stekker zit onder het blad.
  box: { x: 0, z: -195, b: 200, d: 90, wand: 3, boven: 14, onder: -36, flens: 9, flensDik: 3, frees: { b: 202, d: 92, diep: 15, r: 5 },
    adapter: { x: [-96, 49], z: [-41, 19], h: 32, inlaat: { z: -11, y: -17 } },
    print: { x: [54, 94], z: [-12, 38], y: -28 },
    m8: { x: -60, y: -20 }, buis: { x: -75, y: -27 }, usb: { z: -29, y: -24.7 }, c3: { z: 9 }, schakelaar: { x: 74, y: -17 } },
  // sleuven onderaan het blad: box -> module (M8-kabel en slangetje, 29 x 7) en box -> knop (USB-C, 5 x 5)
  sleuven: { module: { x: [-82, -53], diep: 7 }, knop: { z: -30, breed: 5, diep: 5 } },
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
/** schroeven van de bodemplaat: onderaan in de vier torens en in een bus midden in elke wand */
const wandBussen = () => { const w = M.romp.b / 2 - M.romp.wand - 3; return [[w, 0], [-w, 0], [0, w], [0, -w]]; };
const plaatSchroeven = () => [...assen().map(([x, z]) => [Math.sign(x) * (M.romp.b / 2 - M.romp.wand - 3), z]), ...wandBussen()];
/** de vier M4-schroeven van de ventilator (Ø58, onder 45°) */
const fanGaten = () => [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([kx, kz]) => [kx, kz].map((k) => k * Math.round(M.fan.gat * Math.SQRT1_2 * 1000) / 1000));
/** de vorm van het luchtkanaal: binnenkant van de romp min de vier torens (m = speling naar binnen) */
const kanaalLus = (m = 0) => {
  const { romp: R, klauw: C, toren: T } = M;
  const xi = R.b / 2 - R.wand - m, zi = R.d / 2 - R.wand - m, tb = T.binnen - m;
  const zij = (k) => [C.z, -C.z].map((z) => toren(k * C.x, z)).sort((a, b) => a[0] - b[0]).map(([a, b]) => [a - m, b + m]);
  const rechts = [[xi, -zi], ...zij(1).flatMap(([a, b]) => [[xi, a], [tb, a], [tb, b], [xi, b]]), [xi, zi]];
  const links = [[-xi, zi], ...zij(-1).reverse().flatMap(([a, b]) => [[-xi, b], [-tb, b], [-tb, a], [-xi, a]]), [-xi, -zi]];
  return [...rechts, ...links];
};
/** de z-grenzen van een toren */
const toren = (x, z) => {
  const C = M.klauw, d = intrek(x), reik = C.arm + 0.5 + 2.5, voor = C.naaf + 0.5 + 2.5;
  return d < 0 ? [z - reik, z + voor] : [z - voor, z + reik];
};

/** de romp (rechtop geprint, onderkant op het bed): vierkant rond de radiale ventilator, vier gesloten torens met de
 *  klauwen in de hoeken, een richel bovenaan voor de cassette en een getrapte richel voor de instroomplaat */
export function romp() {
  const { romp: R, klauw: C, toren: T, inlaat: I, achter: A } = M;
  const o = new Onderdeel('Romp', PETG);
  o.schets(TOP, (s) => s.rrect(-R.b / 2, -R.d / 2, R.b / 2, R.d / 2, R.r));
  o.extrude('boss', -R.onder, { omkeren: true, naam: 'Romp' });
  // luchtkanaal over de volle hoogte, met de torens in de hoeken (ze staan op het bed: geen overhang)
  const xi = R.b / 2 - R.wand, zi = R.d / 2 - R.wand;
  o.schets(yv('boven', 0), (s) => s.lusW(kanaalLus().map(([x, z]) => [x, 0, z])));
  o.extrude('cut', -R.onder + 1, { omkeren: true, naam: 'Luchtkanaal' });
  // binnenrichel rondom bovenaan: de cassetterand ligt erop, zodat er geen lucht langs de filters glipt
  o.schets(yv('boven', 0), (s) => { s.rrect(-xi - 0.5, -zi - 0.5, xi + 0.5, zi + 0.5); s.rrect(-M.richel.x, -M.richel.z, M.richel.x, M.richel.z); });
  o.extrude('boss', M.richel.dikte, { omkeren: true, naam: 'Richel cassette' });
  // richel voor de instroomplaat: drie treden van 1 mm (45°: geen support); de plaat ligt erop en wordt gelijmd
  const yb = I.top - I.dikte;
  [3, 2, 1].forEach((w, i) => {
    o.schets(yv(`inlaatrichel${i}`, yb - i, 'reference', `Plane richel instroomplaat ${i + 1}`), (s) => {
      s.rrect(-xi - 0.5, -zi - 0.5, xi + 0.5, zi + 0.5); s.rrect(-(xi - w), -(zi - w), xi - w, zi - w);
    });
    o.extrude('boss', 1, { omkeren: true, naam: `Richel instroomplaat ${i + 1}` });
  });
  // bussen midden in de wanden voor de schroeven van de bodemplaat
  o.schets(yv('onderkant', R.onder, 'reference', 'Plane onderkant'), (s) => wandBussen().forEach(([x, z]) => {
    if (x) s.rrectW([Math.sign(x) * (xi - 8.5), 0, -4.5], [Math.sign(x) * (xi + 0.5), 0, 4.5]);
    else s.rrectW([-4.5, 0, Math.sign(z) * (zi - 8.5)], [4.5, 0, Math.sign(z) * (zi + 0.5)]);
  }));
  o.extrude('boss', 14, { naam: 'Bussen bodemplaat' });
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
  o.schets(vlak('onder', 'Face onderkant', [0, R.onder, 0], [0, -1, 0]), (s) => plaatSchroeven().forEach(([x, z]) => s.cirkelW([x, R.onder, z], 1.25)));
  o.extrude('cut', 12, { omkeren: true, naam: 'Gaten bodemplaat' });
  // achterwand: gat voor de M8-bus van de ventilator (PG7) en voor het messingbuisje van de drukmeting
  o.schets(vlak('achterwand', 'Face achterwand', [0, 0, -R.d / 2], [0, 0, -1]), (s) => {
    s.cirkelW([A.m8.x, A.m8.y, -R.d / 2], 6.35);
    s.cirkelW([A.buis.x, A.buis.y, -R.d / 2], 1.55);
  });
  o.extrude('cut', R.wand + 1, { omkeren: true, naam: 'Gaten achterwand' });
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

/** de bak van de filtercassette: rechtop geprint met de roosterbodem op het bed (geen bruggen), wanden van 2 mm; de
 *  rand wordt erop gelijmd */
export function cassette() {
  const { cassette: K } = M;
  const o = new Onderdeel('Filtercassette', PETG);
  o.schets(yv('rand', 0, 'reference', 'Plane rand'), (s) => s.rrect(-K.x, -K.z, K.x, K.z, 1.75));
  o.extrude('boss', -K.onder, { omkeren: true, naam: 'Bak' });
  const xi = K.x - K.wand, zi = K.z - K.wand;
  o.schets(yv('bovenvlak', 0), (s) => s.rrect(-xi, -zi, xi, zi));
  o.extrude('cut', -K.onder - K.bodem, { omkeren: true, naam: 'Holte' });
  o.schets(yv('bodem', K.onder + K.bodem), (s) => {
    // zoveel mogelijk vakken van 18 mm met ribben van 3 mm, minstens 3 mm van de wand
    const p = 21, c = 18, nx = Math.floor((2 * xi - 3) / p), nz = Math.floor((2 * zi - 3) / p);
    const x0 = -(nx * p - 3) / 2, z0 = -(nz * p - 3) / 2;
    // rechte hoeken: snel in de mesh-kernel
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) s.rrectW([x0 + i * p, 0, z0 + j * p], [x0 + i * p + c, 0, z0 + j * p + c]);
  });
  o.extrude('cut', K.bodem + 1, { omkeren: true, naam: 'Roosterbodem' });
  return o.doc();
}

/** de rand van de filtercassette (plat geprint, 2,5 mm): ligt op de torentoppen en de richel onder het rooster en is
 *  over de hele wandbovenkant van de bak gelijmd (luchtdichte naad); uitsparingen voor de lippen van het frame
 *  (M5-koppen) en twee greepuitsparingen in de vrije hoek van een toren (eronder is de toren dicht) */
export function cassetterand() {
  const { cassette: K } = M;
  const o = new Onderdeel('Cassetterand', PETG);
  const xi = K.x - K.wand, zi = K.z - K.wand;
  o.schets(yv('rand', 0, 'reference', 'Plane rand'), (s) => { s.rrect(-K.rand.x, -K.rand.z, K.rand.x, K.rand.z, M.frame.opening.r); s.rrect(-xi, -zi, xi, zi); });
  o.extrude('boss', K.rand.dikte, { naam: 'Rand' });
  o.schets(yv('bovenvlak', K.rand.dikte), (s) => assen().forEach(([x, z]) => {
    const k = Math.sign(x);
    // bij twee torens loopt de uitsparing door tot de greep (één uitsparing: geen dun strookje rand ertussen)
    const d = intrek(x), greep = x * z > 0 ? 11.5 : 0; // tot 3 mm binnen de toren (eronder is het dicht)
    const za = d < 0 ? z - M.lip.z - 0.5 - greep : z - M.lip.z - 0.5, zb = d < 0 ? z + M.lip.z + 0.5 : z + M.lip.z + 0.5 + greep;
    s.rrectW([k * (M.lip.x - 0.5), 0, za], [k * (K.rand.x + 1), 0, zb]);
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

/** bodemplaat over de hele onderkant (plat geprint): een rand rondom en schuine lamellen die de lucht naar achteren
 *  sturen, in het midden een schijf waarop de ventilator staat (4 x M4 x 10 verzonken van onderen in de motor);
 *  8 x M3 in de torens en de bussen in de wanden */
export function uitblaasplaat() {
  const { romp: R, uitblaas: U } = M;
  const o = new Onderdeel('Bodemplaat', PETG);
  const y1 = R.onder, y0 = R.onder - U.dikte, xi = R.b / 2 - R.wand, zi = R.d / 2 - R.wand;
  o.schets(yv('plaat', y1, 'reference', 'Plane bodemplaat'), (s) => { s.rrect(-R.b / 2, -R.d / 2, R.b / 2, R.d / 2, R.r); s.rrect(-xi, -zi, xi, zi); });
  o.extrude('boss', U.dikte, { omkeren: true, naam: 'Rand' });
  o.schets(vlak('lamellen', 'Plane lamellen', [-xi - 0.5, 0, 0], [1, 0, 0], 'reference'), (s) => {
    // 0,1 mm binnen de plaat: geen samenvallende vlakken met de rand en de schijf
    const a = y0 + 0.1, b = y1 - 0.1, h = b - a;
    for (let z = -zi + U.dikte; z <= zi - U.lamel; z += U.steek) s.lusW([[-xi - 0.5, a, z - h], [-xi - 0.5, a, z - h + U.lamel], [-xi - 0.5, b, z + U.lamel], [-xi - 0.5, b, z]]);
  });
  o.extrude('boss', 2 * xi + 1, { naam: 'Lamellen' });
  o.schets(yv('plaat', y1, 'reference', 'Plane bodemplaat'), (s) => { s.cirkel(0, 0, U.schijf); plaatSchroeven().forEach(([x, z]) => s.cirkelW([x, 0, z], 6)); });
  o.extrude('boss', U.dikte, { omkeren: true, naam: 'Schijf en ogen' });
  // verzonken schroeven (DIN 7991): de koppen liggen vlak in de onderkant, de verzinkingen zijn conisch (90°)
  const onder = vlak('plaatonder', 'Face onderkant bodemplaat', [0, y0, 0], [0, -1, 0]);
  o.schets(onder, (s) => fanGaten().forEach(([x, z]) => s.cirkelW([x, y0, z], 4.1)));
  o.extrude('cut', 2.3, { omkeren: true, naam: 'Verzinking M4', draft: 45 });
  o.schets(onder, (s) => plaatSchroeven().forEach(([x, z]) => s.cirkelW([x, y0, z], 3.1)));
  o.extrude('cut', 1.6, { omkeren: true, naam: 'Verzinking M3', draft: 45 });
  o.schets(yv('plaat', y1, 'reference', 'Plane bodemplaat'), (s) => {
    fanGaten().forEach(([x, z]) => s.cirkelW([x, 0, z], 2.25));
    plaatSchroeven().forEach(([x, z]) => s.cirkelW([x, 0, z], 1.7));
  });
  o.extrude('cut', U.dikte + 1, { omkeren: true, naam: 'Gaten' });
  return o.doc();
}

/** de instroomplaat (plat geprint, 3 mm): ligt op de getrapte richel in de romp en tussen de torens, gelijmd; een
 *  trechter (45°) boven het oog van de waaier en het messingbuisje van de drukmeting */
export function instroomplaat() {
  const { inlaat: I, achter: A } = M;
  const o = new Onderdeel('Instroomplaat', PETG);
  const yb = I.top - I.dikte;
  o.schets(yv('plaatonder', yb, 'reference', 'Plane onderkant instroomplaat'), (s) => s.lusW(kanaalLus(0.3).map(([x, z]) => [x, 0, z])));
  o.extrude('boss', I.dikte, { naam: 'Plaat' });
  // trechter in drie treden van 1 mm (samen 45°)
  // de snedes beginnen 0,5 mm boven de plaat (geen samenvallende vlakken)
  [I.kraag, (I.kraag + I.gat) / 2].forEach((r, i) => {
    o.schets(yv(`trechter${i}`, I.top + 0.5, 'reference', `Plane trechter ${i + 1}`), (s) => s.cirkel(0, 0, r));
    o.extrude('cut', i + 1.5, { omkeren: true, naam: `Trechter ${i + 1}` });
  });
  o.schets(yv('boven', I.top + 0.5, 'reference', 'Plane boven de plaat'), (s) => { s.cirkel(0, 0, I.gat); s.cirkelW([A.meet[0], 0, A.meet[1]], 1.55); });
  o.extrude('cut', I.dikte + 1.5, { omkeren: true, naam: 'Gaten' });
  return o.doc();
}

/** San Ace C175 9TG24P0S01 (vereenvoudigd): waaier Ø175 x 60,5 met het instroomoog Ø131 bovenaan, de motor onderaan
 *  (Ø72) met 4 draadgaten M4 op Ø58 */
export function ventilator() {
  const { fan: V } = M;
  const o = new Onderdeel('San Ace C175 9TG24P0S01', ZWART);
  const y2 = V.top - V.waaier, y3 = V.top - V.h;
  o.schets(yv('waaier', y2, 'reference', 'Plane waaier'), (s) => s.cirkel(0, 0, V.d / 2));
  o.extrude('boss', V.waaier, { naam: 'Waaier' });
  o.schets(yv('oog', V.top), (s) => s.cirkel(0, 0, V.oog / 2));
  o.extrude('cut', V.waaier - 8, { omkeren: true, naam: 'Instroomoog' });
  // achterwaarts gebogen schoepen tussen de dekschijf en de draagschijf (uitsparingen aan de buitenkant)
  o.schets(yv('schoepen', V.top - 3, 'reference', 'Plane schoepen'), (s) => {
    for (let i = 0; i < 9; i++) {
      const a = (i * 2 * Math.PI) / 9, p = (r, da) => [r * Math.cos(a + da), 0, r * Math.sin(a + da)];
      s.lusW([p(V.oog / 2 + 3, 0.12), p(V.d / 2 + 1, -0.25), p(V.d / 2 + 1, -0.02), p(V.oog / 2 + 3, 0.32)]);
    }
  });
  o.extrude('cut', V.waaier - 8, { omkeren: true, naam: 'Schoepkanalen' });
  o.schets(yv('motor', y3, 'reference', 'Plane motor'), (s) => s.cirkel(0, 0, V.naaf));
  o.extrude('boss', V.h - V.waaier + 0.5, { naam: 'Motor' });
  o.schets(vlak('motoronder', 'Face onderkant motor', [0, y3, 0], [0, -1, 0]), (s) => fanGaten().forEach(([x, z]) => s.cirkelW([x, y3, z], 1.75)));
  o.extrude('cut', 6, { omkeren: true, naam: 'Draadgaten M4' });
  return o.doc();
}

/** M8-inbouwbus 4-polig (vereenvoudigd, PG7): door de achterwand, de koppeling buiten, de aders binnen */
export function m8bus() {
  const { romp: R, achter: A } = M;
  const o = new Onderdeel('M8-inbouwbus 4-polig', { name: 'Messing vernikkeld', density: 8500, color: '#b9bcc0' });
  const z0 = -R.d / 2;
  o.schets(vlak('m8wand', 'Plane wand', [0, 0, z0 + R.wand + 0.1], [0, 0, -1], 'reference'), (s) => s.cirkelW([A.m8.x, A.m8.y, 0], 6.2));
  o.extrude('boss', R.wand + 0.2, { naam: 'Huis door de wand' });
  o.schets(vlak('m8moer', 'Plane moer', [0, 0, z0 + R.wand + 0.1], [0, 0, 1], 'reference'), (s) => s.cirkelW([A.m8.x, A.m8.y, 0], 8.5));
  o.extrude('boss', 3, { naam: 'Moer binnen' });
  o.schets(vlak('m8flens', 'Plane flens', [0, 0, z0 - 0.1], [0, 0, -1], 'reference'), (s) => s.cirkelW([A.m8.x, A.m8.y, 0], 8.5));
  o.extrude('boss', 2, { naam: 'Flens' });
  o.schets(vlak('m8kop', 'Plane koppeling', [0, 0, z0 - 2.1], [0, 0, -1], 'reference'), (s) => s.cirkelW([A.m8.x, A.m8.y, 0], 4));
  o.extrude('boss', 8, { terug: 0.3, naam: 'Koppeling M8' });
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

/** deksel onderaan de knophouder (plat geprint): 2 x M2,5 verzonken en de opening voor de USB-C-bus (de koppeling:
 *  5 V van de module, of de computer om de knop te flashen); los te schroeven voor de knop en de adapterprint */
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

/** adapterprint in de knophouder (-A3): FPC-bus 10-polig 0,5 mm bovenaan, onderaan de USB-C-bus -X7 (in het deksel:
 *  5 V van de module of de computer om te flashen); schuift van onderen in de groeven van de houder, onderdelen naar -X */
export function knopadapter() {
  const { dial: D } = M;
  const A = D.adapter;
  const o = new Onderdeel('Adapterprint knop', PCB);
  const pl = vlak('adapter', 'Plane adapterprint', [A.x, 0, 0], [1, 0, 0], 'reference');
  o.schets(pl, (s) => s.rrectW([A.x, A.top - A.h, -A.b / 2 + 0.1], [A.x, A.top, A.b / 2 - 0.1]));
  o.extrude('boss', 1.6, { naam: 'Print' });
  o.schets(vlak('adaptervoor', 'Plane onderdelen', [A.x + 0.3, 0, 0], [-1, 0, 0], 'reference'), (s) => {
    s.rrectW([A.x, A.top - 5, -7], [A.x, A.top - 1, 7]); // FPC-bus 10-polig, 0,5 mm
  });
  o.extrude('boss', 5, { naam: 'Onderdelen' });
  o.schets(vlak('adaptervoor', 'Plane onderdelen', [A.x + 0.3, 0, 0], [-1, 0, 0], 'reference'), (s) =>
    s.rrectW([A.x, A.top - A.h + 0.5, -4.45], [A.x, A.top - A.h + 7.5, 4.45])); // USB-C-bus, opening naar beneden
  o.extrude('boss', 3.5, { naam: 'USB-C-bus' });
  return o.doc();
}

/** messingbuisje Ø3 x 0,5 (meetpunt en doorvoer van de drukmeting); oorsprong bovenaan, buis langs -Y */
export function messingbuisje(L = 12) {
  const o = new Onderdeel(`Messingbuisje Ø3 x ${L}`, { name: 'Messing', density: 8500, color: '#c9a64b' });
  o.schets(TOP, (s) => { s.cirkel(0, 0, 1.5); s.cirkel(0, 0, 1); });
  o.extrude('boss', L, { omkeren: true, naam: 'Buis' });
  return o.doc();
}

/** de voedingsbox (rechtop geprint, de bodem op het bed): de bovenkant zit 14 mm in een gefreesde uitsparing onderaan
 *  het blad, de rand (met een afschuining van 45° eronder: geen support) drukt op de onderhuid en wordt met 4 pluggen
 *  voor holle deuren vastgezet; binnenin de netadapter, de print met de ESP32-C3 en de drukmeter; in de wanden de
 *  C13-opening, de M8-stekker naar de ventilator, het slangetje, de USB-C naar de knop en de verzonken schakelaar.
 *  Oorsprong: midden van de box op de onderkant van het blad. */
export function voedingsbox() {
  const { box: B } = M;
  const o = new Onderdeel('Voedingsbox', PETG);
  const bx = B.b / 2, bz = B.d / 2, ix = bx - B.wand, iz = bz - B.wand, fx = bx + B.flens, fz = bz + B.flens;
  o.schets(yv('boxtop', B.boven, 'reference', 'Plane bovenkant box'), (s) => s.rrect(-bx, -bz, bx, bz, 4));
  o.extrude('boss', B.boven - B.onder, { omkeren: true, naam: 'Kuip' });
  o.schets(yv('flens', 0, 'reference', 'Plane onderkant blad'), (s) => s.rrect(-fx, -fz, fx, fz, 6));
  o.extrude('boss', B.flensDik, { omkeren: true, naam: 'Rand' });
  // onder de rand vier treden van 2,25 mm (samen 45°): de rand print zonder support
  [0.75, 0.5, 0.25].forEach((f, i) => {
    o.schets(yv(`trede${i}`, -B.flensDik - i * 2.25, 'reference', `Plane trede ${i + 1}`), (s) => s.rrect(-bx - f * B.flens, -bz - f * B.flens, bx + f * B.flens, bz + f * B.flens, 4));
    o.extrude('boss', 2.25, { omkeren: true, terug: 0.1, naam: `Trede rand ${i + 1}` });
  });
  o.schets(yv('boxtop', B.boven, 'reference', 'Plane bovenkant box'), (s) => s.rrect(-ix, -iz, ix, iz, 2));
  o.extrude('cut', B.boven - B.onder - B.wand, { omkeren: true, naam: 'Binnenruimte' });
  // gaten voor de pluggen (holle deur, M4) in de hoeken van de rand
  o.schets(yv('flens', 0, 'reference', 'Plane onderkant blad'), (s) => [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([kx, kz]) => s.cirkelW([kx * (bx + B.flens / 2), 0, kz * (bz + B.flens / 2)], 2.5)));
  o.extrude('cut', B.flensDik + B.flens + 1, { omkeren: true, naam: 'Gaten pluggen' });
  // C13-opening voor het netsnoer (linkerkant), onder het blad
  const A = B.adapter;
  o.schets(vlak('boxlinks', 'Face linkerwand box', [-bx, 0, 0], [-1, 0, 0]), (s) => s.rrectW([-bx, A.inlaat.y - 12, A.inlaat.z - 16], [-bx, A.inlaat.y + 12, A.inlaat.z + 16], 3));
  o.extrude('cut', B.wand + 1, { omkeren: true, naam: 'Opening C13' });
  // voorkant (naar de module): M8-stekker van de ventilator en het slangetje van de drukmeter
  o.schets(vlak('boxvoor', 'Face voorkant box', [0, 0, bz], [0, 0, 1]), (s) => { s.cirkelW([B.m8.x, B.m8.y, bz], 6.35); s.cirkelW([B.buis.x, B.buis.y, bz], 1.55); });
  o.extrude('cut', B.wand + 1, { omkeren: true, naam: 'Gaten voorkant' });
  // rechterkant: USB-C naar de knop en de USB-C van de ESP32-C3 (flashen)
  o.schets(vlak('boxrechts', 'Face rechterwand box', [bx, 0, 0], [1, 0, 0]), (s) => {
    s.rrectW([bx, B.usb.y - 2, B.usb.z - 4.9], [bx, B.usb.y + 2, B.usb.z + 4.9], 1.2);
    s.rrectW([bx, B.print.y + 1.6 + 0.2, B.c3.z - 4.7], [bx, B.print.y + 1.6 + 3.8, B.c3.z + 4.7], 1.5);
  });
  o.extrude('cut', B.wand + 1, { omkeren: true, naam: 'Openingen USB-C' });
  // achterkant: verzonken wipschakelaar (verdikking binnen, kom van 6 mm buiten, paneel 2 mm)
  const S = B.schakelaar, zk = -bz + M.schakelaar.diep;
  o.schets(vlak('schakelbinnen', 'Plane verdikking schakelaar', [0, 0, -iz], [0, 0, 1], 'reference'), (s) => s.rrectW([S.x - 12.5, B.onder + B.wand, -iz], [S.x + 12.5, -4, -iz]));
  o.extrude('boss', M.schakelaar.diep + M.schakelaar.paneel - B.wand, { terug: 0.5, naam: 'Verdikking schakelaar' });
  o.schets(vlak('schakelkom', 'Face kom schakelaar', [0, 0, -bz], [0, 0, -1]), (s) => s.rrectW([S.x - 12.5, S.y - 9.5, -bz], [S.x + 12.5, S.y + 9.5, -bz], 3));
  o.extrude('cut', M.schakelaar.diep, { omkeren: true, naam: 'Kom schakelaar' });
  o.schets(vlak('schakelpaneel', 'Face paneel schakelaar', [0, 0, zk], [0, 0, -1]), (s) => s.rrectW([S.x - 9.5, S.y - 6.5, zk], [S.x + 9.5, S.y + 6.5, zk]));
  o.extrude('cut', M.schakelaar.paneel + 1, { omkeren: true, naam: 'Inbouwgat schakelaar' });
  // bussen voor de print (M2,5) en de USB-C-breakout, aanslagen voor de adapter
  const P = B.print, vloer = B.onder + B.wand;
  const pb = [[P.x[0] + 3, P.z[0] + 3], [P.x[1] - 3, P.z[0] + 3], [P.x[0] + 3, P.z[1] - 3], [P.x[1] - 3, P.z[1] - 3]];
  o.schets(yv('vloer', vloer), (s) => {
    pb.forEach(([x, z]) => s.cirkelW([x, 0, z], 3));
    [[ix - 8, B.usb.z - 6], [ix - 8, B.usb.z + 6]].forEach(([x, z]) => s.cirkelW([x, 0, z], 2.5));
    s.rrectW([A.x[1] + 0.5, 0, A.z[0]], [A.x[1] + 3, 0, A.z[1] - 20]); // aanslag einde adapter
    s.rrectW([A.x[0] + 10, 0, A.z[1] + 0.5], [A.x[0] + 40, 0, A.z[1] + 3]); // aanslag zijkant adapter
  });
  o.extrude('boss', P.y - vloer, { terug: 0.5, naam: 'Bussen en aanslagen' });
  o.schets(yv('busgat', P.y), (s) => { pb.forEach(([x, z]) => s.cirkelW([x, 0, z], 1.05)); [[ix - 8, B.usb.z - 6], [ix - 8, B.usb.z + 6]].forEach(([x, z]) => s.cirkelW([x, 0, z], 0.8)); });
  o.extrude('cut', 4.5, { omkeren: true, naam: 'Gaten bussen' });
  return o.doc();
}

/** netadapter Mean Well GST90A24-P1M (vereenvoudigd): 145 x 60 x 32, C14-inlaat aan de linkerkant */
export function netadapter() {
  const { adapter: A } = M.box;
  const o = new Onderdeel('Mean Well GST90A24-P1M', { name: 'PC, zwart', density: 1200, color: '#26272a' });
  const y0 = M.box.onder + M.box.wand;
  o.schets(yv('adapter', y0, 'reference', 'Plane adapter'), (s) => s.rrectW([A.x[0], 0, A.z[0]], [A.x[1], 0, A.z[1]], 4));
  o.extrude('boss', A.h, { naam: 'Behuizing' });
  o.schets(vlak('inlaat', 'Face inlaat', [A.x[0], 0, 0], [-1, 0, 0]), (s) => s.rrectW([A.x[0], A.inlaat.y - 9, A.inlaat.z - 12], [A.x[0], A.inlaat.y + 9, A.inlaat.z + 12], 2));
  o.extrude('cut', 10, { omkeren: true, naam: 'Inlaat C14' });
  return o.doc();
}

/** print in de voedingsbox (-A2, gaatjesprint 40 x 50): ESP32-C3 SuperMini (USB-C naar de rechterwand), drukmeter
 *  SDP810, 5V-regelaar, zekeringhouder, transistor en schroefklemmen */
export function voedingsprint() {
  const { print: P, c3 } = M.box;
  const o = new Onderdeel('Voedingsprint', PCB);
  o.schets(yv('print', P.y, 'reference', 'Plane print'), (s) => s.rrectW([P.x[0], 0, P.z[0]], [P.x[1], 0, P.z[1]], 1));
  o.extrude('boss', 1.6, { naam: 'Print' });
  const pb = [[P.x[0] + 3, P.z[0] + 3], [P.x[1] - 3, P.z[0] + 3], [P.x[0] + 3, P.z[1] - 3], [P.x[1] - 3, P.z[1] - 3]];
  o.schets(yv('printtop', P.y + 1.6), (s) => pb.forEach(([x, z]) => s.cirkelW([x, 0, z], 1.1)));
  o.extrude('cut', 1.6, { omkeren: true, naam: 'Gaten M2,5' });
  o.schets(yv('printtop', P.y + 1.6), (s) => {
    // naast elkaar, zonder overlap en weg van de schroeven in de hoeken
    s.rrectW([P.x[1] - 22, 0, c3.z - 9], [P.x[1] + 2.5, 0, c3.z + 9]); // ESP32-C3 SuperMini, USB-C tot tegen de wand
    s.rrectW([P.x[0] + 6, 0, P.z[1] - 18], [P.x[0] + 18, 0, P.z[1] - 6]); // SDP810
    s.rrectW([P.x[0] + 6, 0, P.z[0] + 6], [P.x[0] + 17, 0, P.z[0] + 22]); // 5V-regelaar D24V10F5
    s.rrectW([P.x[0] + 20, 0, P.z[1] - 16], [P.x[1] - 8, 0, P.z[1] - 4]); // zekering, transistor, schroefklemmen
  });
  o.extrude('boss', 4, { naam: 'Onderdelen' });
  return o.doc();
}

/** USB-C-breakout voor de knop (-X8) in de voedingsbox: liggend op twee bussen, de bus door de rechterwand */
export function usbBusBox() {
  const { box: B } = M;
  const o = new Onderdeel('USB-C-bus knop', PCB);
  const ix = B.b / 2 - B.wand, yb = M.box.print.y + 0.1; // 0,1 mm boven de bussen (geen samenvallende vlakken)
  o.schets(yv('usbprint', yb, 'reference', 'Plane print'), (s) => s.rrectW([ix - 14, 0, B.usb.z - 7], [ix - 3.4, 0, B.usb.z + 7]));
  o.extrude('boss', 1.6, { naam: 'Print' });
  o.schets(yv('usbbus', yb + 1.6, 'reference', 'Plane bus'), (s) => s.rrectW([ix - 7.4, 0, B.usb.z - 4.45], [ix + B.wand - 0.1, 0, B.usb.z + 4.45], 1));
  o.extrude('boss', 3.3, { terug: 0.1, naam: 'USB-C' });
  o.schets(yv('usbgat', yb + 1.6, 'reference', 'Plane gaten'), (s) => [[ix - 8, B.usb.z - 6], [ix - 8, B.usb.z + 6]].forEach(([x, z]) => s.cirkelW([x, 0, z], 1.1)));
  o.extrude('cut', 2, { omkeren: true, naam: 'Gaten M2' });
  return o.doc();
}

/** wipschakelaar KCD1-101 (vereenvoudigd) in de kom van de achterwand van de box */
export function schakelaar() {
  const { box: B, schakelaar: S0 } = M;
  const S = B.schakelaar, zk = -B.d / 2 + S0.diep;
  const o = new Onderdeel('Wipschakelaar KCD1-101', ZWART);
  o.schets(vlak('huis', 'Plane huis', [0, 0, zk - 0.1], [0, 0, 1], 'reference'), (s) => s.rrectW([S.x - 9.3, S.y - 6.3, 0], [S.x + 9.3, S.y + 6.3, 0]));
  o.extrude('boss', 19.1, { naam: 'Huis en stekers' });
  o.schets(vlak('rand', 'Plane rand', [0, 0, zk - 0.1], [0, 0, -1], 'reference'), (s) => s.rrectW([S.x - 10.5, S.y - 7.5, 0], [S.x + 10.5, S.y + 7.5, 0], 1));
  o.extrude('boss', 2, { terug: 0.05, naam: 'Rand' });
  o.schets(vlak('wip', 'Plane wip', [0, 0, zk - 2.1], [0, 0, -1], 'reference'), (s) => s.rrectW([S.x - 9, S.y - 6, 0], [S.x + 9, S.y + 6, 0], 1));
  o.extrude('boss', S0.diep - 3.1, { terug: 0.3, naam: 'Wip' });
  return o.doc();
}

/** M8-inbouwstekker 4-polig in de voorkant van de box (vereenvoudigd, PG7) */
export function m8stekker() {
  const { box: B } = M;
  const o = new Onderdeel('M8-inbouwstekker 4-polig', { name: 'Messing vernikkeld', density: 8500, color: '#b9bcc0' });
  const z0 = B.d / 2;
  o.schets(vlak('m8wand', 'Plane wand', [0, 0, z0 - B.wand - 0.1], [0, 0, 1], 'reference'), (s) => s.cirkelW([B.m8.x, B.m8.y, 0], 6.2));
  o.extrude('boss', B.wand + 0.2, { naam: 'Huis door de wand' });
  o.schets(vlak('m8moer', 'Plane moer', [0, 0, z0 - B.wand - 0.1], [0, 0, -1], 'reference'), (s) => s.cirkelW([B.m8.x, B.m8.y, 0], 8.5));
  o.extrude('boss', 3, { naam: 'Moer binnen' });
  o.schets(vlak('m8flens', 'Plane flens', [0, 0, z0 + 0.1], [0, 0, 1], 'reference'), (s) => s.cirkelW([B.m8.x, B.m8.y, 0], 8.5));
  o.extrude('boss', 2, { naam: 'Flens' });
  o.schets(vlak('m8kop', 'Plane koppeling', [0, 0, z0 + 2.1], [0, 0, 1], 'reference'), (s) => s.cirkelW([B.m8.x, B.m8.y, 0], 4));
  o.extrude('boss', 8, { terug: 0.3, naam: 'Koppeling M8' });
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
    component(`${prefix}3r`, 'Cassetterand<1>', cassetterand(), at([0, 0, 0])),
    ...M.filters.map((f, i) => component(`${prefix}f${i + 1}`, `${f.naam}<1>`, filterlaag(i), at([0, 0, 0]))),
    component(`${prefix}9`, 'Instroomplaat<1>', instroomplaat(), at([0, 0, 0])),
    component(`${prefix}4`, 'Bodemplaat<1>', uitblaasplaat(), at([0, 0, 0])),
    component(`${prefix}5`, 'San Ace C175 9TG24P0S01<1>', ventilator(), at([0, 0, 0])),
    component(`${prefix}10`, 'M8-inbouwbus 4-polig<1>', m8bus(), at([0, 0, 0])),
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
  const naarVoor = [-Math.SQRT1_2, 0, 0, Math.SQRT1_2]; // -90° om X: -Y wordt +Z
  const m5 = schroefVerzonken('M5 x 65 DIN 7991', 5, 4.2, 65);
  assen().forEach(([x, z], i) => comps.push(component(`${prefix}s5${i + 1}`, `M5 x 65 DIN 7991<${i + 1}>`, m5, at([x, M.frame.dikte, z]))));
  // van onderen: verzonken, de koppen liggen vlak in de bodemplaat
  const y0 = M.romp.onder - M.uitblaas.dikte;
  const m3p = schroefVerzonken('M3 x 16 DIN 7991', 3, 2.5, 16);
  plaatSchroeven().forEach(([x, z], i) => comps.push(component(`${prefix}s3${i + 1}`, `M3 x 16 DIN 7991<${i + 1}>`, m3p, at([x, y0, z]), { rotation: omhoog })));
  const m4 = schroefVerzonken('M4 x 10 DIN 7991', 4, 3.4, 10);
  fanGaten().forEach(([x, z], i) => comps.push(component(`${prefix}s4${i + 1}`, `M4 x 10 DIN 7991<${i + 1}>`, m4, at([x, y0, z]), { rotation: omhoog })));
  const m3d = schroefVerzonken('M3 x 60 DIN 7991', 3, 2.5, 60);
  [DC.x, -DC.x].forEach((x, i) => comps.push(component(`${prefix}sd${i + 1}`, `M3 x 60 DIN 7991<${i + 1}>`, m3d, at([d.x + x, d.plaat, d.z]))));
  // de knop met 2 x M2,5 x 6 van onderen in de naaf; het deksel met 2 x M2,5 x 8 verzonken
  const m25k = schroefCilinder('M2,5 x 6 cilinderkop', 4.5, 2, 2.2, 6);
  const vloerOnder = d.plaat - d.naaf.reduce((a2, [, dd]) => a2 + dd, 0) - d.vloer;
  d.schroeven.forEach(([x, z], i) => comps.push(component(`${prefix}sk${i + 1}`, `M2,5 x 6 cilinderkop<${i + 1}>`, m25k, at([d.x + x, vloerOnder, d.z + z]), { rotation: omhoog })));
  const m25d = schroefVerzonken('M2,5 x 8 DIN 7991', 2.5, 2, 8);
  [1, -1].forEach((k2, i) => comps.push(component(`${prefix}sdk${i + 1}`, `M2,5 x 8 DIN 7991<${i + 1}>`, m25d, at([d.x, d.onder - d.deksel, d.z + k2 * d.bus]), { rotation: omhoog })));
  // drukmeting: messingbuisje in de instroomplaat (meetpunt) en een door de achterwand (slang naar de voedingsbox)
  const A = M.achter;
  comps.push(component(`${prefix}18`, 'Messingbuisje Ø3 x 12<1>', messingbuisje(12), at([A.meet[0], M.inlaat.top, A.meet[1]])));
  comps.push(component(`${prefix}19`, 'Messingbuisje Ø3 x 12<2>', messingbuisje(12), at([A.buis.x, A.buis.y, -M.romp.d / 2 - 4]), { rotation: naarVoor }));
  // de voedingsbox onder het blad (vast aan het blad, dus mee met de bladdikte)
  const B = M.box, bo = [B.x, -blad, B.z], bat = (p) => at([bo[0] + p[0], bo[1] + p[1], bo[2] + p[2]]);
  const naarAchter = [Math.SQRT1_2, 0, 0, Math.SQRT1_2]; // +90° om X: -Y wordt -Z
  comps.push(component(`${prefix}20`, 'Voedingsbox<1>', voedingsbox(), bat([0, 0, 0])));
  comps.push(component(`${prefix}21`, 'Mean Well GST90A24-P1M<1>', netadapter(), bat([0, 0, 0])));
  comps.push(component(`${prefix}22`, 'Voedingsprint<1>', voedingsprint(), bat([0, 0, 0])));
  comps.push(component(`${prefix}23`, 'USB-C-bus knop<1>', usbBusBox(), bat([0, 0, 0])));
  comps.push(component(`${prefix}24`, 'Wipschakelaar KCD1-101<1>', schakelaar(), bat([0, 0, 0])));
  comps.push(component(`${prefix}25`, 'M8-inbouwstekker 4-polig<1>', m8stekker(), bat([0, 0, 0])));
  comps.push(component(`${prefix}26`, 'Messingbuisje Ø3 x 12<3>', messingbuisje(12), bat([B.buis.x, B.buis.y, B.d / 2 + 4]), { rotation: naarAchter }));
  const m25 = schroefCilinder('M2,5 x 6 zelftappend', 4.5, 2, 2, 6);
  const P = B.print;
  [[P.x[0] + 3, P.z[0] + 3], [P.x[1] - 3, P.z[0] + 3], [P.x[0] + 3, P.z[1] - 3], [P.x[1] - 3, P.z[1] - 3]].forEach(([x, z], i) =>
    comps.push(component(`${prefix}s25${i + 1}`, `M2,5 x 6 zelftappend<${i + 1}>`, m25, bat([x, P.y + 1.6, z]))));
  const m2 = schroefCilinder('M2 x 5 zelftappend', 3.8, 1.6, 1.6, 5);
  const ixb = B.b / 2 - B.wand;
  [-6, 6].forEach((dz, i) => comps.push(component(`${prefix}s2${i + 1}`, `M2 x 5 zelftappend<${i + 1}>`, m2, bat([ixb - 8, P.y + 0.1 + 1.6, B.usb.z + dz]))));
  return { components: comps, mates: [] };
}

/** de assemblage van de afzuiging alleen */
export function afzuiging() {
  const { components, mates } = afzuigingComponenten();
  return { format: 'phlippo-cad', version: 1, name: 'Afzuiging', units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components, mates };
}

/** de uitsparingen in het tafelblad (assenstelsel van het blad: bovenvlak op Y = blad): frezen (Ø10) en gatzaag Ø44 */
export function bladUitsparingen(o, x0 = 0, z0 = 0, blad = M.blad) {
  const { uitsparing: U, dial: D, box: B, sleuven: K } = M;
  o.schets(vlak('bladtop', 'Face bovenvlak', [0, blad, 0], [0, 1, 0]), (s) => {
    s.rrectW([x0 - U.b / 2, 0, z0 - U.d / 2], [x0 + U.b / 2, 0, z0 + U.d / 2], U.r);
    s.cirkelW([x0 + D.x, 0, z0 + D.z], D.gat / 2);
  });
  o.extrude('cut', blad + 1, { omkeren: true, naam: 'Uitsparingen afzuiging' });
  // onderaan: de uitsparing voor de voedingsbox (15 mm) en de kabelsleuven naar de module en naar de knop
  const onder = vlak('bladonder', 'Face ondervlak', [0, 0, 0], [0, -1, 0]);
  const F = B.frees, bx = x0 + B.x, bz = z0 + B.z;
  o.schets(onder, (s) => s.rrectW([bx - F.b / 2, 0, bz - F.d / 2], [bx + F.b / 2, 0, bz + F.d / 2], F.r));
  o.extrude('cut', F.diep, { omkeren: true, naam: 'Uitsparing voedingsbox' });
  o.schets(onder, (s) => s.rrectW([x0 + K.module.x[0], 0, bz + F.d / 2 - 2], [x0 + K.module.x[1], 0, z0 - U.d / 2 + 2]));
  o.extrude('cut', K.module.diep, { omkeren: true, naam: 'Sleuf naar de module' });
  // naar de knop: recht van de rechterkant van de box (bij de USB-C) naar het gat van de knop, rechts langs de module
  const [ax, az] = [bx + F.b / 2 - 2, bz + K.knop.z], [ex, ez] = [x0 + D.x, z0 + D.z];
  const l = Math.hypot(ex - ax, ez - az), nx = (-(ez - az) / l) * K.knop.breed / 2, nz = ((ex - ax) / l) * K.knop.breed / 2;
  o.schets(onder, (s) => s.lusW([[ax + nx, 0, az + nz], [ex + nx, 0, ez + nz], [ex - nx, 0, ez - nz], [ax - nx, 0, az - nz]]));
  o.extrude('cut', K.knop.diep, { omkeren: true, naam: 'Sleuf naar de knop' });
}

export const ONDERDELEN = {
  'Romp.kcad': romp,
  'Bovenframe.kcad': bovenframe,
  'Rooster-LB.kcad': rooster,
  'Filtercassette.kcad': cassette,
  'Cassetterand.kcad': cassetterand,
  'Voorfilter-G4.kcad': () => filterlaag(0),
  'Fijnstoffilter-M5.kcad': () => filterlaag(1),
  'Actieve-koolmat.kcad': () => filterlaag(2),
  'Instroomplaat.kcad': instroomplaat,
  'Bodemplaat.kcad': uitblaasplaat,
  'Ventilator-San-Ace-C175.kcad': ventilator,
  'M8-inbouwbus.kcad': m8bus,
  'Voedingsbox.kcad': voedingsbox,
  'Netadapter-GST90A24.kcad': netadapter,
  'Voedingsprint.kcad': voedingsprint,
  'USB-C-bus-knop.kcad': usbBusBox,
  'Wipschakelaar-KCD1.kcad': schakelaar,
  'M8-inbouwstekker.kcad': m8stekker,
  'Klauw.kcad': klauw,
  'Knophouder.kcad': knophouder,
  'Knopdeksel.kcad': knopdeksel,
  'Knopklauw.kcad': dialklauw,
  'VIEWE-knop-1.5.kcad': vieweKnop,
  'Adapterprint-knop.kcad': knopadapter,
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const schrijf = (naam, doc) => writeFileSync(join(HERE, naam), JSON.stringify(doc, null, 1) + '\n');
  for (const [naam, f] of Object.entries(ONDERDELEN)) schrijf(naam, f());
  schrijf('Afzuiging.kcad', afzuiging());
  // vervangen door versie 3
  for (const oud of ['Inbouwmodule.kcad', 'Filterlade.kcad', 'print/Inbouwmodule.stl', 'print/Filterlade.stl', 'Filtermat.kcad', 'Ventilatorplaat.kcad', 'Ventilator-NF-F12.kcad', 'print/Ventilatorplaat.stl', 'print/Klauw.stl',
    'Elektronicabox.kcad', 'Deksel-elektronicabox.kcad', 'print/Elektronicabox.stl', 'print/Deksel-elektronicabox.stl', 'Dialhouder.kcad', 'print/Dialhouder.stl',
    'Uitblaasplaat.kcad', 'print/Uitblaasplaat.stl', 'Deksel-elektronicavak.kcad', 'print/Deksel-elektronicavak.stl',
    'Dialkuip.kcad', 'Dialring.kcad', 'Dialklauw.kcad', 'M5Stack-Dial.kcad', 'print/Dialkuip.stl', 'print/Dialring.stl',
    'Ventilator-Delta-PFR1212UHE.kcad', 'Interfaceprint.kcad', 'ESP32-C3-SuperMini.kcad', 'USB-C-bus-module.kcad'])
    if (existsSync(join(HERE, oud))) rmSync(join(HERE, oud));
  console.log('geschreven:', [...Object.keys(ONDERDELEN), 'Afzuiging.kcad'].join(', '));
}
