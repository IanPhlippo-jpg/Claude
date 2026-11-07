// Ingebouwde nagelstofafzuiging voor het bureau (versie 6, 2026-11-06), als Phlippo CAD-documenten.
//
// Opbouw (van boven naar onder):
// - RVS-plaat (AISI 430, magnetisch, lasergesneden, LB-monogram) ligt op het bovenframe en is er even groot als het:
//   van boven zie je alleen staal; ze klikt vast op 4 magneten die verzonken in het frame zitten;
// - bovenframe (PETG, 2,5 mm, plat geprint): een smalle omranding op het blad, op de romp gelijmd;
// - filtercassette (PETG) met één standaard filtermat Rittal SK 3171.100 (173 x 173 x 17, G3, per 5 of 50): plaat eraf,
//   cassette eruit tillen aan de twee greepuitsparingen, mat vervangen (niets te knippen);
// - romp (PETG, rechtop geprint, vierkant 210 x 210) met de instroomplaat en de radiale ventilator San Ace C175
//   (24 V, PWM, tacho) direct onder de cassette; onderaan één bodemplaat met schuine lamellen (lucht naar achteren).
// Bevestiging: vier klauwen in PETG (6 mm, 100 % vulling) met een M5-moer in een zeskantkamer, in gesloten torens. De
// kop van de M5-schroef zit in een lip van het bovenframe (onder de RVS-plaat) en drukt het hele frame op het blad;
// draai hem aan, de klauw zwaait door het venster naar buiten en schuift in een lange sleuf omhoog tot tegen de
// onderkant van het blad. Bladdikte 10 tot 50 mm (LAGKAPTEN: 34 mm). Alle schroefkoppen zitten in een conische zitting.
// Luchtdicht: de torens zijn alleen naar buiten open, de naad frame/romp is gelijmd; lucht kan er alleen in langs het
// rooster en uit langs de bodemplaat.
// De VIEWE-knop 1,5" staat op een houder die niet breder is dan de knop, met twee kleine klauwen in PETG (M3-moer):
// geen enkele schroef in het blad. Alle schroeven, bouten en moeren staan als onderdelen in de assemblage.
// Elektronica: in een aparte voedingsbox die onder het blad is ingefreesd (netadapter 24 V, ESP32-C3, drukmeter,
// schakelaar); een M8-kabel en een slangetje naar de module, een USB-C-kabel naar de knop, allemaal in sleuven onder
// het blad en met een koppeling aan beide kanten (elke lengte, niets knippen). De knop praat draadloos met de box (ESP-NOW).
//
// Assenstelsel van de module: oorsprong in het midden van de uitsparing op het bovenvlak van het blad, Y omhoog,
// +Z naar de voorkant van het bureau. Alle PETG-delen passen op het bed van de Elegoo Centauri Carbon (256 x 256) en printen zonder support.
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
  romp: { b: 210, d: 210, r: 6, wand: 4, onder: -96 },
  uitsparing: { b: 212, d: 212, r: 6 }, // te frezen in het blad
  // klauwen in de hoeken (daar is ruimte naast de ronde waaier); geprint in PETG (100 % vulling), 6 mm dik, met een
  // M5-moer (DIN 934) die van onderen in een zeskantkamer gaat: de moer draait niet, dus de klauw draait mee
  klauw: { x: 96.5, z: 72, naaf: 6.5, arm: 18, breed: 8, dik: 6, moer: { s: 8, m: 4, speling: 0.3 } }, // ingetrokken blijft de naaf 2 mm binnen de romp
  toren: { binnen: 87.5, top: -9, zwaai: -53, bodem: -61 }, // sleuf van top tot bodem, zwaaivenster onderaan
  // filtercassette in twee delen: de bak (rechtop geprint, de roosterbodem op het bed) en een vlakke rand die erop
  // gelijmd wordt; vak 171 x 171 voor de standaardmat Rittal SK 3171.100 van 173 x 173 x 17: de mat zit rondom 1 mm aangedrukt
  // (geen lucht langs de mat); wand 1,6 zodat de bak 0,4 mm vrij blijft van de torens (x 87,5)
  cassette: { x: 87.1, z: 87.1, rand: { x: 100.25, z: 100.25, dikte: 2.5 }, onder: -19, wand: 1.6, bodem: 2 },
  richel: { x: 99, z: 99, dikte: 1.5 }, // binnenrichel bovenaan de romp: de cassetterand rust er rondom op (geen omloop)
  lip: { x: 91, z: 6 }, // lippen van het bovenframe boven de torens, voor de kop van de M5-schroef
  filters: [
    // één filter (keuze Ian, 2026-11-07): een kant-en-klare standaardmat, zonder knippen te vervangen: Rittal SK 3171.100
    // (173 x 173 x 17, G3 / ISO coarse 50 %, EAN 4028177038059, per 5 of 50). Ze beschermt de ventilator tegen vijlsel
    // en grof stof en laat veel lucht door. Geen luchtreiniger: fijn stof gaat erdoor (docs/Vrijgave-en-meetplan.md)
    { id: 'sk3171', naam: 'Filtermat Rittal SK 3171.100', dikte: 17, kleur: '#f6f6f2' },
  ],
  // radiale ventilator met achterwaarts gebogen schoepen: San Ace C175 9TG24P0S01 (Ø175 x 69, 24 V, 56 W, PWM 25 kHz);
  // waaier 60,5 hoog, instroomoog Ø131, motor 4 x M4 op Ø58 (schroefdiepte 4 tot 6 mm)
  fan: { d: 175, waaier: 60.5, h: 69, oog: 131, naaf: 36, gat: 29, top: -27 },
  // instroomplaat (los geprint, op een richel gelijmd) met een trechter boven het oog van de waaier, 2 mm erboven
  inlaat: { top: -22, dikte: 3, gat: 63.5, kraag: 66.5 },
  uitblaas: { dikte: 6, steek: 8, lamel: 2, schijf: 45 },
  // Ø8 x 1,5 in een gat van 1,6 diep: 0,9 mm bodem onder de magneet (4 lagen van 0,2 plus marge); gat Ø8,2 voor de lijm
  magneten: { d: 8, h: 1.5, plaats: [[105.75, 30], [105.75, -30], [-105.75, 30], [-105.75, -30]] }, // verzonken in het frame, onder de plaat
  // in de achterwand (perszijde, onder het blad): de M8-bus voor de ventilator en het meetbuisje naar de drukmeter in de
  // voedingsbox; het meetpunt zelf is een messingbuisje in de instroomplaat (de onderdruk onder de filters)
  achter: { m8: { x: -60, y: -80 }, buis: { x: -75, y: -85 }, meet: [-85, -85] },
  // wipschakelaar KCD1-101 (21 x 15, inbouwgat 19 x 13) in een kom van 6 mm: de wip ligt 1 mm binnen de wand
  schakelaar: { diep: 6, paneel: 2 },
  // voedingsbox: een bak die 14 mm in een gefreesde uitsparing onderaan het blad zit, met een vlakke rand op de
  // onderkant van het blad (eronder één schuine kant van 45°: print zonder support) en 4 x M4 verzonken in pluggen voor
  // holle deuren; bovenin een los deksel op 4 paaltjes (4 x M3 x 8 verzonken), apart af te nemen.
  // Ventilatie: sleuven in de bodem onder de netadapter (die op twee ribben staat) en bovenaan in de achterwand.
  // Maten t.o.v. de onderkant van het blad (Y = 0) en het midden van de box. Netadapter Mean Well GST90A24-P1M
  // (145 x 60 x 32, C14-inlaat); de C13-stekker zit onder het blad.
  box: { x: 0, z: -195, b: 210, d: 100, wand: 3, boven: 14, onder: -36, frees: { b: 212, d: 102, diep: 15, r: 5 },
    // rand onder het blad: opzij 7,5 (de box past zo op een printbed van 225), voor en achter 12 met de 4 schroeven;
    // de pluggaten Ø8 houden 2 mm hout naast de uitsparing; 28 diep zodat de M4 x 30 vrij in de holte draait
    flens: { x: 7.5, z: 12 }, flensDik: 3, plug: { gat: 8, diep: 28, x: 85, z: 57 },
    buis_r: 5.2, deksel: 2, // paaltjes in de hoeken voor het deksel
    adapter: { x: [-101, 44], z: [-36, 24], h: 32, voet: 2, inlaat: { z: -6, y: -15 } },
    print: { x: [60, 100], z: [-13, 37], y: -28 },
    klem: { x: [-60, -5], b: 9, d: 8 }, // paaltjes en klemmen voor de adapter
    m8: { x: -60, y: -20 }, buis: { x: -75, y: -27 }, usb: { z: -29, y: -24.7, b: 20.3, d: 12.7, over: 1.3 }, c3: { z: 10, hoog: 3.5 },
    schakelaar: { x: 40, y: -17 } }, // de aan/uit-schakelaar in de voorwand (naar de gebruiker)
  // sleuven onderaan het blad: box -> module (M8-kabel en slangetje, 29 x 7) en box -> knop (USB-C, 5 x 5)
  sleuven: { module: { x: [-82, -53], diep: 7 }, knop: { z: -30, breed: 5, diep: 5 } },
  // VIEWE-knop 1,5" (UEDX46460015-MD50E, Ø51,6 x 14, naaf achteraan, FPC 10-polig) op een houder die niet breder is
  // dan de knop: plaat Ø51,6 x 2 op het blad, buis Ø43 in een gat van Ø44 (gatzaag), 2 stalen klauwen (M3) en een
  // dicht deksel onderaan. De USB-C zit in de achterwand van de buis (de kant waar de sleuf van de box aankomt), op een
  // printje (-X7) op 2 palen net boven het deksel. Maten van de knop uit de maattekening van VIEWE.
  dial: { x: 250, z: 200, d: 51.6, hoogte: 14, voet: 2.5, gat: 44, plaat: 2, buis: 21.5, wand: 2, onder: -60, deksel: 2,
    naaf: [[12.2, 4.9], [10.9, 3]], vloer: 2.5, // kom voor de naaf (straal, diepte) en de vloer eronder
    schroeven: [[-2.9, 5.2], [-2.9, -5.2]], pennen: [[2.77, 7.05], [2.77, -7.05]], fpc: { x: -5.9, b: 5.5 },
    klauw: { x: 16.5, naaf: 5.5, arm: 15, breed: 6, dik: 5, top: -10, bodem: -60, moer: { s: 7, m: 3.2, speling: 0.2 } },
    adapter: { x: 1, b: 20, h: 26, top: -12 }, rib: 13, bus: [[13, 13], [-13, -13]], // FPC-adapter 20 x 26
    // USB-C-printje 12 x 15 (zonder gaten): de bus 1 mm voorbij de print; geklemd tussen 2 palen en 2 pennetjes op het deksel
    usb: { voor: -19.4, print: [-18.4, -3.4], b: 12, y: -57, paal: { x: 6, z: -10, r: 1.8 }, pen: { x: 4, z: -8 }, gat: { b: 9.5, y: [-55.7, -51.8] }, zak: { b: 13, h: 8, z: -19.7 } } },
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
  o.schets(yv('boven', 0, 'reference', 'Plane boven'), (s) => s.lusW(kanaalLus().map(([x, z]) => [x, 0, z])));
  o.extrude('cut', -R.onder + 1, { omkeren: true, naam: 'Luchtkanaal' });
  // binnenrichel rondom bovenaan: de cassetterand ligt erop, zodat er geen lucht langs de filters glipt
  o.schets(yv('boven', 0, 'reference', 'Plane boven'), (s) => { s.rrect(-xi - 0.5, -zi - 0.5, xi + 0.5, zi + 0.5); s.rrect(-M.richel.x, -M.richel.z, M.richel.x, M.richel.z); });
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
  o.schets(yv('boven', 0, 'reference', 'Plane boven'), (s) => assen().forEach(([x, z]) => s.cirkelW([x, 0, z], 2.9)));
  o.extrude('cut', 67, { omkeren: true, naam: 'Gaten M5' });
  // klauwkanaal: de klauw schuift van het zwaaivenster omhoog tot tegen het blad (bladdikte 10 tot 50 mm)
  o.schets(yv('kanaal', T.top, 'reference', 'Plane top klauwkanaal'), (s) =>
    assen().forEach(([x, z]) => s.rrectW([x - C.naaf - 0.5, 0, z - C.naaf - 0.5], [x + C.naaf + 0.5, 0, z + C.naaf + 0.5])));
  o.extrude('cut', T.top - T.bodem, { omkeren: true, naam: 'Klauwkanalen' });
  assen().forEach(([x, z], i) => zwaaikamer(o, `romp${i}`, C, x, z, Math.sign(x) * (R.b / 2 + 1), T.bodem));
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
  // tegen de achterwand: twee ringen voor het slangetje van het meetbuisje naar de doorvoer en een voor de draden van de
  // ventilator naar de M8-bus (niets kan in de waaier komen)
  wandring(o, 'slang1', A.buis.x, -(R.d / 2 - R.wand), 1, -45, 5.6);
  wandring(o, 'slang2', A.buis.x, -(R.d / 2 - R.wand), 1, -62, 5.6);
  wandring(o, 'draden', A.m8.x + 15, -(R.d / 2 - R.wand), 1, -58, 7);
  // gaten voor de schroeven van de bodemplaat, van onderen in de torens en de bussen
  o.schets(vlak('onder', 'Face onderkant', [0, R.onder, 0], [0, -1, 0]), (s) => plaatSchroeven().forEach(([x, z]) => s.cirkelW([x, R.onder, z], 1.25)));
  o.extrude('cut', 12, { omkeren: true, naam: 'Gaten bodemplaat' });
  // achterwand: gat voor de M8-bus van de ventilator (PG7) en voor het messingbuisje van de drukmeting
  o.schets(vlak('achterwand', 'Face achterwand', [0, 0, -R.d / 2], [0, 0, -1]), (s) => {
    s.cirkelW([A.m8.x, A.m8.y, -R.d / 2], 5.1); // binder 718: M10 x 0,75
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
  o.schets(yv('bovenvlak', F.dikte, 'reference', 'Plane bovenkant frame'), (s) => assen().forEach(([x, z]) => s.cirkelW([x, 0, z], 5.2)));
  // verzinking 2,0 diep (niet tot de onderkant: geen samenvallende vlakken), daaronder een gat Ø6: de kop (Ø10, 90°)
  // ligt vlak met de bovenkant
  o.extrude('cut', 2, { omkeren: true, naam: 'Verzinking M5', draft: 45 });
  o.schets(yv('bovenvlak', F.dikte, 'reference', 'Plane bovenkant frame'), (s) => assen().forEach(([x, z]) => s.cirkelW([x, 0, z], 3)));
  o.extrude('cut', F.dikte + 1, { omkeren: true, naam: 'Gaten M5' });
  o.schets(yv('bovenvlak', F.dikte, 'reference', 'Plane bovenkant frame'), (s) => M.magneten.plaats.forEach(([x, z]) => s.cirkelW([x, 0, z], M.magneten.d / 2 + 0.1)));
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

/** de filtermat(ten) in de cassette, van boven naar onder */
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
  // fanschroeven: de kop 1 mm dieper (kamer Ø8,4 x 1), dan draait de M4 x 10 5 mm in de motor (fabrikant: 4 tot 6 mm;
  // met de toleranties van plaat en schroef 4,6 tot 5,4 mm)
  o.schets(onder, (s) => fanGaten().forEach(([x, z]) => s.cirkelW([x, y0, z], 4.3)));
  o.extrude('cut', 1, { omkeren: true, naam: 'Kamer kop M4' });
  // de kegel begint 0,1 mm in de kamer (geen samenvallende vlakken): Ø8,4 daar is Ø8,2 op de bodem van de kamer
  const onder1 = vlak('plaatonder1', 'Plane verzinking M4', [0, y0 + 0.9, 0], [0, -1, 0], 'reference');
  o.schets(onder1, (s) => fanGaten().forEach(([x, z]) => s.cirkelW([x, y0 + 0.9, z], 4.2)));
  o.extrude('cut', 2.4, { omkeren: true, naam: 'Verzinking M4', draft: 45 });
  // een snede met tapsheid heeft alleen op een referentievlak een exacte (B-rep) versie
  const onderR = vlak('plaatonderR', 'Plane onderkant bodemplaat', [0, y0, 0], [0, -1, 0], 'reference');
  o.schets(onderR, (s) => plaatSchroeven().forEach(([x, z]) => s.cirkelW([x, y0, z], 3.1)));
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

/** M8-inbouwconnector 4-polig, binder 718 voor achterwandmontage: binnen een zeskantflens SW12 en het huis met 4
 *  soldeerbekers, door de wand de schroefdraad M10 x 0,75, buiten de moer SW10 en de koppeling M8 x 1.
 *  c = [x, y] van de as, zi = binnenkant van de wand, d = richting naar buiten (-1: naar -Z), wand = dikte,
 *  bus = true: bus (koppeling met gaatjes), anders stekker (koppeling met pennen in een kraag) */
function m8connector(naam, c, zi, d, wand, bus) {
  const o = new Onderdeel(naam, { name: 'Messing vernikkeld', density: 8500, color: '#b9bcc0' });
  const [cx, cy] = c, zk = (z) => [cx, cy, z];
  const pz = (z, n) => vlak(`m8${n}`, `Plane ${n}`, [0, 0, z], [0, 0, d], 'reference');
  const pzi = (z, n) => vlak(`m8${n}`, `Plane ${n}`, [0, 0, z], [0, 0, -d], 'reference');
  const zeskantW = (sw, z) => zeskant(sw).map(([a, b]) => [cx + a, cy + b, z]);
  // binnen: flens SW12 (2 mm) en het huis Ø9 x 5 met 4 soldeerbekers
  o.schets(pzi(zi - d * 0.1, 'flens'), (s) => s.lusW(zeskantW(12, 0)));
  o.extrude('boss', 2, { naam: 'Flens SW12' });
  o.schets(pzi(zi - d * 2, 'huis'), (s) => s.cirkelW(zk(0), 4.5));
  o.extrude('boss', 5, { terug: 0.2, naam: 'Huis' });
  o.schets(pzi(zi - d * 7, 'bekers'), (s) => [[-1.7, -0.98], [1.7, -0.98], [-1.7, 0.98], [1.7, 0.98]].forEach(([a, b]) => s.cirkelW([cx + a, cy + b, 0], 0.65)));
  o.extrude('boss', 3, { terug: 0.2, naam: 'Soldeerbekers' });
  // door de wand: M10 x 0,75 (kern Ø9,9)
  o.schets(pz(zi - d * 0.2, 'draad'), (s) => s.cirkelW(zk(0), 4.95));
  o.extrude('boss', wand + 0.3, { naam: 'Schroefdraad M10' });
  // buiten: moer SW10 (3 mm) en de koppeling M8 x 1 (8 mm)
  const zb = zi + d * (wand + 0.1);
  o.schets(pz(zb, 'moer'), (s) => { s.lusW(zeskantW(10, 0)); });
  o.extrude('boss', 3, { naam: 'Moer SW10' });
  o.schets(pz(zb + d * 3, 'koppeling'), (s) => s.cirkelW(zk(0), 4));
  o.extrude('boss', 8, { terug: 0.2, naam: 'Koppeling M8' });
  o.schets(pz(zb + d * 11, 'front'), (s) => {
    if (bus) [[-1.7, -0.98], [1.7, -0.98], [-1.7, 0.98], [1.7, 0.98]].forEach(([a, b]) => s.cirkelW([cx + a, cy + b, 0], 0.45));
    else s.cirkelW(zk(0), 3);
  });
  o.extrude('cut', bus ? 4 : 5, { omkeren: true, naam: bus ? 'Contactgaten' : 'Kraag' });
  if (!bus) {
    o.schets(pz(zb + d * 6, 'pennen'), (s) => [[-1.7, -0.98], [1.7, -0.98], [-1.7, 0.98], [1.7, 0.98]].forEach(([a, b]) => s.cirkelW([cx + a, cy + b, 0], 0.5)));
    o.extrude('boss', 4.5, { terug: 0.2, naam: 'Pennen' });
  }
  return o.doc();
}

/** M8-inbouwbus 4-polig in de achterwand van de module (binder 718, M10 x 0,75): naar de ventilator */
export function m8bus() {
  const { romp: R, achter: A } = M;
  return m8connector('M8-inbouwbus 4-polig', [A.m8.x, A.m8.y], -R.d / 2 + R.wand, -1, R.wand, true);
}

/** ring tegen de binnenkant van een wand op z = zw (d = +1: de wand ligt aan de -Z-kant): een blok van 9 x 9 met een
 *  afschuining van 45° eronder (print zonder support) en een verticaal gat met diameter gat, bovenkant op ytop */
function wandring(o, naam, cx, zw, d, ytop, gat) {
  const x0 = cx - 4.5;
  o.schets(vlak(`ring${naam}`, `Plane ring ${naam}`, [x0, 0, 0], [1, 0, 0], 'reference'), (s) =>
    s.lusW([[zw - d * 0.5, ytop], [zw + d * 9, ytop], [zw + d * 9, ytop - 6], [zw - d * 0.5, ytop - 15.5]].map(([z, y]) => [x0, y, z])));
  o.extrude('boss', 9, { naam: `Ring ${naam}` });
  o.schets(yv(`ringgat${naam}`, ytop, 'reference', `Plane gat ring ${naam}`), (s) => s.cirkelW([cx, 0, zw + d * 4.5], gat / 2));
  o.extrude('cut', 16, { omkeren: true, naam: `Gat ring ${naam}` });
}

/** de kamer waarin een klauw ingeklapt ligt (de arm langs de wand van de toren): het plafond loopt onder 45° op naar de
 *  buitenwand. Draai je de schroef aan, dan kruipt de klauw omhoog, de bovenrand van de arm schuift langs die helling en
 *  de klauw zwaait vanzelf naar buiten door het venster; daarna gaat hij in de smalle sleuf alleen nog omhoog.
 *  C = maten van de klauw, (x, z) = de schroefas, xw = x van de buitenkant van de wand, bodem = onderkant van de kamer */
function zwaaikamer(o, id, C, x, z, xw, bodem) {
  const k = Math.sign(x), d = intrek(x);
  const xi = x - k * (C.breed / 2 + 0.5), yi = bodem + C.dik + 0.5, yw = yi + Math.abs(xw - xi);
  o.schets(vlak(`zwaai${id}`, `Plane zwaaikamer ${id}`, [0, 0, z], [0, 0, d], 'reference'), (s) =>
    s.lusW([[xi, bodem - 0.5], [xw, bodem - 0.5], [xw, yw], [xi, yi]].map(([xx, y]) => [xx, y, z]))); // 0,5 onder de bodem: geen samenvallend vlak met het kanaal
  o.extrude('cut', C.arm + 0.5, { naam: `Zwaaikamer klauw ${id}` });
}

/** zeskant (hoeken op de X-as, zoals moer()) met sleutelwijdte s */
const zeskant = (s) => Array.from({ length: 6 }, (_, i) => [(s / Math.sqrt(3)) * Math.cos((i * Math.PI) / 3), (s / Math.sqrt(3)) * Math.sin((i * Math.PI) / 3)]);

/** klauw in kunststof: naaf en arm, een gat voor de schroef en van onderen een zeskantkamer voor de moer; de moer
 *  steunt tegen het plafond van de kamer en trekt de klauw omhoog. Plat geprint (de kamer op het bed), 100 % vulling.
 *  Oorsprong op de schroefas, onderkant op Y = 0 */
function klauwMetMoer(naam, C, gat, kleur = PETG) {
  const o = new Onderdeel(naam, kleur);
  const w = C.breed / 2, xr = Math.sqrt(C.naaf * C.naaf - w * w), e = C.arm - w;
  o.schets(TOP, (s) => s.pad([[xr, -w], [e, -w], { boog: [e, 0], naar: [e, w], ccw: true }, [xr, w], { boog: [0, 0], naar: [xr, -w], ccw: true }]));
  o.extrude('boss', C.dik, { naam: 'Klauw' });
  o.schets(yv('boven', C.dik, 'reference', 'Plane boven'), (s) => s.cirkel(0, 0, gat / 2));
  o.extrude('cut', C.dik + 1, { omkeren: true, naam: 'Gat schroef' });
  o.schets(vlak('onder', 'Face onderkant', [0, 0, 0], [0, -1, 0]), (s) => s.lusW(zeskant(C.moer.s + C.moer.speling).map(([x, z]) => [x, 0, z])));
  o.extrude('cut', C.moer.m + 0.2, { omkeren: true, naam: 'Kamer moer' });
  return o.doc();
}

/** klauw van de module: PETG 6 mm, M5-moer van onderen */
export function klauw() {
  return klauwMetMoer('Klauw', M.klauw, 5.5);
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
    o.schets(yv(`kom${i}`, y, 'reference', `Plane kom ${i + 1}`), (s) => s.cirkel(0, 0, r));
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
  o.schets(vlak('vloeronder', 'Plane onderkant vloer', [0, yv1, 0], [0, -1, 0], 'reference'), (s) => D.schroeven.forEach(([x, z]) => s.cirkelW([x, yv1, z], 2.6)));
  o.extrude('cut', 1.25, { omkeren: true, naam: 'Verzinking M2,5', draft: 45 });
  // holte onder de vloer, met behuizingen voor de klauwkanalen, geleiders voor de print en bussen voor het deksel
  o.schets(yv('holte', yv1, 'reference', 'Plane holte'), (s) => s.cirkel(0, 0, Ri));
  o.extrude('cut', yv1 - D.onder + 1, { omkeren: true, naam: 'Holte' });
  o.schets(yv('holte', yv1, 'reference', 'Plane holte'), (s) => {
    for (const k of [1, -1]) s.rrectW([k * (C.x - C.naaf - 2), 0, -C.naaf - 2], [k * (Ri + 0.5), 0, C.naaf + 2]);
    D.bus.forEach(([x, z]) => s.cirkelW([x, 0, z], 3));
  });
  o.extrude('boss', yv1 - D.onder, { omkeren: true, terug: 0.5, naam: 'Behuizingen' });
  // ribben met de groeven voor de adapterprint, tot net onder de print (eronder zit het USB-C-printje)
  const U = D.usb, printOnder = D.adapter.top - D.adapter.h;
  o.schets(yv('holte', yv1, 'reference', 'Plane holte'), (s) => {
    for (const k of [1, -1]) s.rrectW([D.adapter.x - 1.5, 0, k * (D.adapter.b / 2 - 0.9)], [D.adapter.x + 3.1, 0, k * D.rib]);
  });
  o.extrude('boss', yv1 - printOnder + 0.5, { omkeren: true, terug: 0.5, naam: 'Ribben adapterprint' });
  // 2 palen van de vloer tot op het USB-C-printje (achter de bus): het deksel drukt het printje er met 2 pennetjes tegen
  const paalOnder = U.y + 1.6;
  o.schets(yv('holte', yv1, 'reference', 'Plane holte'), (s) => [1, -1].forEach((k) => s.cirkelW([k * U.paal.x, 0, U.paal.z], U.paal.r)));
  o.extrude('boss', yv1 - paalOnder, { omkeren: true, terug: 0.5, naam: 'Palen USB-C-printje' });
  // opening voor de USB-C in de achterwand (naar de box), net boven het deksel
  const achter = vlak('dusb', 'Plane achterwand USB-C', [0, 0, -(R + 1)], [0, 0, -1], 'reference');
  o.schets(achter, (s) => s.rrectW([-U.gat.b / 2, U.gat.y[0], -(R + 1)], [U.gat.b / 2, U.gat.y[1], -(R + 1)], 1));
  o.extrude('cut', 4, { omkeren: true, naam: 'Opening USB-C' });
  // buiten een vlakke zak rond de opening: de stekker gaat er tot tegen de bus in
  const ym = (U.gat.y[0] + U.gat.y[1]) / 2;
  o.schets(achter, (s) => s.rrectW([-U.zak.b / 2, ym - U.zak.h / 2, -(R + 1)], [U.zak.b / 2, ym + U.zak.h / 2, -(R + 1)], 1.5));
  o.extrude('cut', R + 1 + U.zak.z, { omkeren: true, naam: 'Zak USB-C-stekker' });
  // geleidegroeven voor de adapterprint (1,6 mm, van onderen inschuiven)
  o.schets(yv('onderkant', D.onder, 'reference', 'Plane onderkant'), (s) => {
    for (const k of [1, -1]) s.rrectW([D.adapter.x - 0.1, 0, k * (D.adapter.b / 2 - 1.6)], [D.adapter.x + 1.7, 0, k * (D.adapter.b / 2 + 0.1)]);
  });
  o.extrude('cut', D.adapter.top - D.onder, { naam: 'Groeven adapterprint' });
  // schroefgaten voor het deksel (M2,5 zelftappend)
  o.schets(yv('onderkant', D.onder, 'reference', 'Plane onderkant'), (s) => D.bus.forEach(([x, z]) => s.cirkelW([x, 0, z], 1.05)));
  o.extrude('cut', 8, { naam: 'Gaten deksel' });
  // klauwen: verzonken M3 van bovenaf door de plaat (conische zitting, de koppen liggen onder de voet van de knop)
  const as = [[C.x, 0], [-C.x, 0]];
  o.schets(yv('plaattop', D.plaat, 'reference', 'Plane plaattop'), (s) => as.forEach(([x, z]) => s.cirkelW([x, 0, z], 4.2)));
  o.extrude('cut', 1.9, { omkeren: true, naam: 'Verzinking M4', draft: 45 });
  o.schets(yv('plaattop', D.plaat, 'reference', 'Plane plaattop'), (s) => as.forEach(([x, z]) => s.cirkelW([x, 0, z], 2.25)));
  o.extrude('cut', D.plaat - C.top + 1, { omkeren: true, naam: 'Gaten M4' });
  o.schets(yv('dkanaal', C.top, 'reference', 'Plane top klauwkanaal'), (s) => as.forEach(([x, z]) => s.rrectW([x - C.naaf - 0.5, 0, z - C.naaf - 0.5], [x + C.naaf + 0.5, 0, z + C.naaf + 0.5])));
  o.extrude('cut', C.top - C.bodem, { omkeren: true, naam: 'Klauwkanalen' });
  // ingetrokken ligt de arm onderaan langs de buis (de klauw schuift er van onderen in)
  as.forEach(([x, z], i) => zwaaikamer(o, `knop${i}`, C, x, z, Math.sign(x) * (R + 1.5), C.bodem));
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

/** deksel onderaan de knophouder (plat geprint): dicht, 2 x M2,5 verzonken; los te schroeven voor de knop, de
 *  adapterprint en het USB-C-printje (de USB-C zelf zit in de achterwand van de houder) */
export function knopdeksel() {
  const { dial: D } = M;
  const o = new Onderdeel('Knopdeksel', PETG_ZWART);
  const y0 = D.onder - D.deksel;
  o.schets(yv('deksel', D.onder, 'reference', 'Plane deksel'), (s) => s.cirkel(0, 0, D.buis));
  o.extrude('boss', D.deksel, { omkeren: true, naam: 'Deksel' });
  const onder = vlak('dekselonder', 'Face onderkant deksel', [0, y0, 0], [0, -1, 0]);
  // een snede met tapsheid heeft alleen op een referentievlak een exacte (B-rep) versie
  const onderR = vlak('dekselonderR', 'Plane onderkant deksel', [0, y0, 0], [0, -1, 0], 'reference');
  o.schets(onderR, (s) => D.bus.forEach(([x, z]) => s.cirkelW([x, y0, z], 2.6)));
  o.extrude('cut', 1.6, { omkeren: true, naam: 'Verzinking M2,5', draft: 45 }); // eindigt 0,4 mm binnen het gat Ø2,8
  o.schets(onder, (s) => {
    D.bus.forEach(([x, z]) => s.cirkelW([x, y0, z], 1.4));
    [1, -1].forEach((k) => s.cirkelW([k * D.klauw.x, y0, 0], 2.4)); // de punten van de M4 x 65 (1 mm uit de klauw) in een gat Ø4,8 met speling
  });
  o.extrude('cut', D.deksel + 1, { omkeren: true, naam: 'Gaten' });
  // 2 pennetjes die het USB-C-printje tegen de palen van de houder drukken (0,1 mm speling)
  const U = D.usb;
  o.schets(yv('dekseltop', D.onder, 'reference', 'Plane bovenkant deksel'), (s) => [1, -1].forEach((k) => s.cirkelW([k * U.pen.x, 0, U.pen.z], 1.5)));
  o.extrude('boss', U.y - D.onder - 0.1, { terug: 0.2, naam: 'Pennetjes printje' });
  return o.doc();
}

/** kleine klauw voor de knophouder: PETG 5 mm (zwart), M4-moer van onderen */
export function dialklauw() {
  return klauwMetMoer('Knopklauw', M.dial.klauw, 4.5, PETG_ZWART);
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
  // inbus in de kop (sleutelwijdte volgens ISO 10642)
  const sw = { 2: 1.3, 2.5: 1.5, 3: 2, 4: 2.5, 5: 3 }[d] ?? d * 0.6;
  o.schets(TOP, (s) => s.lus(zeskant(sw)));
  o.extrude('cut', Math.min(hk + 0.4, d * 0.5), { omkeren: true, naam: 'Inbus' });
  return o.doc();
}

/** cilinderkopschroef (DIN 912/7985): oorsprong onder de kop, kop langs +Y, schacht langs -Y */
export function schroefCilinder(naam, D, h, kern, L) {
  const o = new Onderdeel(naam, { name: 'Staal verzinkt', density: 7850, color: '#9aa0a8' });
  o.schets(TOP, (s) => s.cirkel(0, 0, D / 2));
  o.extrude('boss', h, { naam: 'Kop' });
  o.schets(TOP, (s) => s.cirkel(0, 0, kern / 2));
  o.extrude('boss', L, { omkeren: true, terug: 0.5, naam: 'Schacht' });
  // kruiskop
  const a = D * 0.32, w = D * 0.08;
  o.schets(yv('kopboven', h, 'reference', 'Plane kopboven'), (s) => s.lus([[w, a], [-w, a], [-w, w], [-a, w], [-a, -w], [-w, -w], [-w, -a], [w, -a], [w, -w], [a, -w], [a, w], [w, w]]));
  o.extrude('cut', h * 0.6, { omkeren: true, naam: 'Kruiskop' });
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
  // grip: 36 groefjes rond de draairing, en het ronde scherm (glas) iets verzonken in de ring
  o.schets(yv('grip', D.hoogte - 1, 'reference', 'Plane grip'), (s) => {
    const R0 = D.d / 2 - 0.3;
    for (let i = 0; i < 36; i++) {
      const a = (i * 2 * Math.PI) / 36, c = Math.cos(a), sn = Math.sin(a), w = 0.6;
      const p = (r1, t) => [r1 * c - t * sn, 0, r1 * sn + t * c];
      s.lusW([p(R0 - 0.5, -w), p(R0 + 1, -w), p(R0 + 1, w), p(R0 - 0.5, w)]);
    }
  });
  o.extrude('cut', D.hoogte - D.voet - 2, { omkeren: true, naam: 'Grip' });
  o.schets(yv('scherm', D.hoogte, 'reference', 'Plane scherm'), (s) => s.cirkel(0, 0, D.d / 2 - 4.5));
  o.extrude('cut', 0.6, { omkeren: true, naam: 'Scherm' });
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

/** adapterprint in de knophouder (-A3): FPC-bus 10-polig 0,5 mm bovenaan, onderaan 4 draden naar het USB-C-printje
 *  -X7 (5 V van de box of de computer om te flashen); schuift van onderen in de groeven van de houder, onderdelen naar -X */
export function knopadapter() {
  const { dial: D } = M;
  const A = D.adapter;
  const o = new Onderdeel('Adapterprint knop', PCB);
  const pl = vlak('adapter', 'Plane adapterprint', [A.x, 0, 0], [1, 0, 0], 'reference');
  o.schets(pl, (s) => s.rrectW([A.x, A.top - A.h, -A.b / 2 + 0.1], [A.x, A.top, A.b / 2 - 0.1]));
  o.extrude('boss', 1.6, { naam: 'Print' });
  o.schets(vlak('adaptervoor', 'Plane onderdelen', [A.x + 0.3, 0, 0], [-1, 0, 0], 'reference'), (s) => {
    s.rrectW([A.x, A.top - 5, -6], [A.x, A.top - 1, 6]); // FPC-bus 10-polig, 0,5 mm
  });
  o.extrude('boss', 2.4, { naam: 'FPC-bus' });
  // 10 soldeereilandjes (2,54 mm) onderaan, voor de draden naar het USB-C-printje
  o.schets(vlak('adaptervoor', 'Plane onderdelen', [A.x + 0.3, 0, 0], [-1, 0, 0], 'reference'), (s) => {
    for (let i = 0; i < 5; i++) s.cirkelW([A.x, A.top - A.h + 3, -5.08 + i * 2.54], 0.8);
  });
  o.extrude('boss', 0.6, { naam: 'Soldeereilanden' });
  return o.doc();
}

/** USB-C-bus (receptacle 8,94 x 3,26 x 7,35) liggend op een print: o = onderdeel, c = [x, y] (x midden, y bovenkant
 *  print), voor = z van de mond, d = richting van de mond (-1: naar -Z, +1 naar +Z); of langs X met as = 'x' */
function usbC(o, id, c, voor, d, as = 'z') {
  const [cx, yb] = c, L = 7.35, a = voor, b = voor - d * L;
  const pl = yv(`${id}bus`, yb, 'reference', `Plane bus ${id}`);
  o.schets(pl, (s) => (as === 'z' ? s.rrectW([cx - 4.47, 0, Math.min(a, b)], [cx + 4.47, 0, Math.max(a, b)], 1) : s.rrectW([Math.min(a, b), 0, cx - 4.47], [Math.max(a, b), 0, cx + 4.47], 1)));
  o.extrude('boss', 3.26, { terug: 0.05, naam: `USB-C ${id}` });
  // de mond: 8,34 x 2,56, 6 mm diep, met de tong in het midden
  const mond = vlak(`${id}mond`, `Plane mond ${id}`, as === 'z' ? [0, 0, voor] : [voor, 0, 0], as === 'z' ? [0, 0, d] : [d, 0, 0], 'reference');
  o.schets(mond, (s) => (as === 'z' ? s.rrectW([cx - 4.17, yb + 0.35, voor], [cx + 4.17, yb + 2.91, voor], 1) : s.rrectW([voor, yb + 0.35, cx - 4.17], [voor, yb + 2.91, cx + 4.17], 1)));
  o.extrude('cut', 6, { omkeren: true, naam: `Mond ${id}` });
  o.schets(mond, (s) => (as === 'z' ? s.rrectW([cx - 3.3, yb + 1.33, voor - d * 0.8], [cx + 3.3, yb + 1.93, voor - d * 0.8]) : s.rrectW([voor - d * 0.8, yb + 1.33, cx - 3.3], [voor - d * 0.8, yb + 1.93, cx + 3.3])));
  // de tong loopt tot 0,3 mm in de achterkant van de mond (anders zweeft ze los: een tweede body)
  o.extrude('boss', 6.3, { omkeren: true, naam: `Tong ${id}` });
}

/** USB-C-printje in de knophouder (-X7, breakout 16-polig, 12 x 15, zonder gaten): de bus door de achterwand naar de
 *  sleuf; het printje zit geklemd tussen 2 palen van de houder en 2 pennetjes op het deksel. Oorsprong zoals de
 *  knophouder (midden van het gat, bovenvlak van het blad) */
export function usbBusKnop() {
  const U = M.dial.usb;
  const o = new Onderdeel('USB-C-bus knophouder', PCB);
  o.schets(yv('kusbprint', U.y, 'reference', 'Plane print'), (s) => s.rrectW([-U.b / 2, 0, U.print[0]], [U.b / 2, 0, U.print[1]]));
  o.extrude('boss', 1.6, { naam: 'Print' });
  usbC(o, 'kusb', [0, U.y + 1.6], U.voor, -1); // de mond naar de achterwand (-Z)
  // de 16 soldeereilandjes achteraan
  o.schets(yv('kusbpads', U.y + 1.6), (s) => { for (let i = 0; i < 6; i++) s.rrectW([-4.6 + i * 1.84 - 0.5, 0, U.print[1] - 3], [-4.6 + i * 1.84 + 0.5, 0, U.print[1] - 1]); });
  o.extrude('boss', 0.1, { terug: 0.05, naam: 'Soldeereilanden' });
  return o.doc();
}

/** messingbuisje Ø3 x 0,5 (meetpunt en doorvoer van de drukmeting); oorsprong bovenaan, buis langs -Y */
export function messingbuisje(L = 12) {
  const o = new Onderdeel(`Messingbuisje Ø3 x ${L}`, { name: 'Messing', density: 8500, color: '#c9a64b' });
  o.schets(TOP, (s) => { s.cirkel(0, 0, 1.5); s.cirkel(0, 0, 1); });
  o.extrude('boss', L, { omkeren: true, naam: 'Buis' });
  return o.doc();
}

/** de voedingsbox (rechtop geprint, de bodem op het bed): een rechte bak waarvan de bovenkant 14 mm in een gefreesde
 *  uitsparing onderaan het blad zit, bovenaan dicht met een deksel; 4 schroefbuizen in de hoeken (M4 x 60 verzonken van
 *  onderen); binnenin de netadapter op twee ribben, de print met de ESP32-C3 en de drukmeter; ventilatiesleuven in de
 *  bodem en bovenaan in de achterwand; in de wanden de C13-opening (links), de M8-stekker, het slangetje en de
 *  verzonken aan/uit-schakelaar (voor), de USB-C naar de knop en die van de ESP32-C3 (rechts).
 *  Oorsprong: midden van de box op de onderkant van het blad. */
export function voedingsbox() {
  const { box: B } = M;
  const o = new Onderdeel('Voedingsbox', PETG);
  const bx = B.b / 2, bz = B.d / 2, ix = bx - B.wand, iz = bz - B.wand;
  const c3y = B.print.y + 1.6 + B.c3.hoog; // bovenkant van de print van de ESP32-C3
  o.schets(yv('boxtop', B.boven, 'reference', 'Plane bovenkant box'), (s) => s.rrect(-bx, -bz, bx, bz, 4));
  o.extrude('boss', B.boven - B.onder, { omkeren: true, naam: 'Kuip' });
  // rand op de onderkant van het blad, eronder één schuine kant van 45° tot tegen de kuip (print zonder support)
  const fx = bx + B.flens.x, fz = bz + B.flens.z;
  // hoeken R12,5: de schuine kant krimpt 11,9 mm in, de afronding blijft dan positief (R0,6)
  o.schets(yv('rand', 0, 'reference', 'Plane onderkant blad'), (s) => s.rrect(-fx, -fz, fx, fz, 12.5));
  o.extrude('boss', B.flensDik, { omkeren: true, naam: 'Rand' });
  o.schets(yv('schuin', -B.flensDik + 0.1, 'reference', 'Plane onder de rand'), (s) => s.rrect(-fx, -fz, fx, fz, 12.5));
  o.extrude('boss', B.flens.z - 0.1, { omkeren: true, naam: 'Schuine kant', draft: 45 });
  // uitsparingen in de schuine kant voor de C13 (links), de M8 en de schakelaar (voor): de rand loopt daar als korte
  // brug (hooguit 38 mm); 0,5 mm schuine kant blijft tegen de wand, de openingen snijden er van buiten doorheen
  {
    const Ai = B.adapter.inlaat, Sw = B.schakelaar, yo = -B.flensDik;
    o.schets(yv('uitsparing', yo, 'reference', 'Plane onder de rand'), (s) => {
      s.rrectW([-fx - 1, 0, Ai.z - 19], [-bx - 0.5, 0, Ai.z + 19]);
      s.rrectW([B.m8.x - 9, 0, bz + 0.5], [B.m8.x + 9, 0, fz + 1]);
      s.rrectW([Sw.x - 15, 0, bz + 0.5], [Sw.x + 15, 0, fz + 1]);
    });
    o.extrude('cut', B.flens.z + 1, { omkeren: true, naam: 'Uitsparingen schuine kant' });
  }
  o.schets(yv('boxtop', B.boven, 'reference', 'Plane bovenkant box'), (s) => s.rrect(-ix, -iz, ix, iz, 2));
  o.extrude('cut', B.boven - B.onder - B.wand, { omkeren: true, naam: 'Binnenruimte' });
  // 4 pluggaten Ø4,5 in de rand, van onderen een vlakke zitting tot onder de rand en een verzinking voor M4 verzonken
  o.schets(yv('rand', 0, 'reference', 'Plane onderkant blad'), (s) => boxPluggen().forEach(([x, z]) => s.cirkelW([x, 0, z], 2.25)));
  o.extrude('cut', B.flensDik + B.flens.z + 1, { omkeren: true, naam: 'Gaten pluggen' });
  const randOnder = vlak('randonder', 'Plane onderkant rand', [0, -B.flensDik, 0], [0, -1, 0], 'reference');
  o.schets(randOnder, (s) => boxPluggen().forEach(([x, z]) => s.cirkelW([x, -B.flensDik, z], 4.5)));
  o.extrude('cut', B.flens.z + 1, { naam: 'Zitting pluggen' });
  o.schets(randOnder, (s) => boxPluggen().forEach(([x, z]) => s.cirkelW([x, -B.flensDik, z], 4.4)));
  o.extrude('cut', 2.1, { omkeren: true, naam: 'Verzinking M4', draft: 45 });
  const A = B.adapter, P = B.print, vloer = B.onder + B.wand;
  // ventilatie: sleuven van 2,5 mm in de bodem onder de adapter, en bovenaan in de achterwand (warme lucht eruit)
  const xs = []; for (let x = A.x[0] + 7; x < A.x[1] - 5; x += 6) xs.push(x);
  o.schets(yv('bodem', B.onder, 'reference', 'Plane onderkant box'), (s) => xs.forEach((x) => s.rrectW([x - 1.25, 0, A.z[0] + 5], [x + 1.25, 0, A.z[1] - 5], 1.2)));
  o.extrude('cut', B.wand + 1, { naam: 'Ventilatie bodem' });
  // achterwand: onder de schuine kant van de rand (die loopt tot 14,9 mm onder het blad), weg van de paaltjes
  o.schets(vlak('boxachter', 'Plane achterwand box', [0, 0, -bz], [0, 0, -1], 'reference'), (s) => xs.filter((x) => x > -90).forEach((x) => s.rrectW([x - 1.25, -30, -bz], [x + 1.25, -18, -bz], 1.2)));
  o.extrude('cut', B.wand + 1, { omkeren: true, naam: 'Ventilatie achterwand' });
  // 2 ribben onder de adapter (de lucht stroomt eronder door de sleuven)
  o.schets(yv('vloer', vloer), (s) => [A.z[0] + 2, A.z[1] - 5].forEach((z) => s.rrectW([A.x[0] + 3, 0, z], [A.x[1] - 3, 0, z + 3])));
  o.extrude('boss', A.voet, { terug: 0.5, naam: 'Ribben adapter' });
  // 4 paaltjes in de hoeken tot onder het deksel, met een gat Ø2,5 voor de M3-schroefjes van het deksel
  o.schets(yv('vloer', vloer), (s) => boxBuizen().forEach(([x, z]) => s.cirkelW([x, 0, z], B.buis_r)));
  o.extrude('boss', B.boven - B.deksel - vloer, { terug: 0.5, naam: 'Paaltjes deksel' });
  o.schets(yv('paaltop', B.boven - B.deksel, 'reference', 'Plane bovenkant paaltjes'), (s) => boxBuizen().forEach(([x, z]) => s.cirkelW([x, 0, z], 1.25)));
  o.extrude('cut', 10, { omkeren: true, naam: 'Gaten deksel' });
  // C13-opening voor het netsnoer (linkerkant), onder het blad
  o.schets(vlak('boxlinks', 'Face linkerwand box', [-bx, 0, 0], [-1, 0, 0]), (s) => s.rrectW([-bx, A.inlaat.y - 12, A.inlaat.z - 16], [-bx, A.inlaat.y + 12, A.inlaat.z + 16], 3));
  o.extrude('cut', B.wand + 1, { omkeren: true, terug: 1, naam: 'Opening C13' });
  // voorkant (naar de module en de gebruiker): M8-stekker van de ventilator en het slangetje van de drukmeter
  o.schets(vlak('boxvoor', 'Face voorkant box', [0, 0, bz], [0, 0, 1]), (s) => { s.cirkelW([B.m8.x, B.m8.y, bz], 5.1); s.cirkelW([B.buis.x, B.buis.y, bz], 1.55); });
  o.extrude('cut', B.wand + 1, { omkeren: true, terug: 1, naam: 'Gaten voorkant' });
  // rechterkant: USB-C naar de knop en de USB-C van de ESP32-C3 (flashen), buiten met een zak voor de stekker
  o.schets(vlak('boxrechts', 'Face rechterwand box', [bx, 0, 0], [1, 0, 0]), (s) => {
    s.rrectW([bx, B.usb.y - 2, B.usb.z - 4.9], [bx, B.usb.y + 2, B.usb.z + 4.9], 1.2);
    s.rrectW([bx, c3y - 0.3, B.c3.z - 4.75], [bx, c3y + 3.56, B.c3.z + 4.75], 1.2);
  });
  o.extrude('cut', B.wand + 1, { omkeren: true, naam: 'Openingen USB-C' });
  o.schets(vlak('boxrechts', 'Face rechterwand box', [bx, 0, 0], [1, 0, 0]), (s) => {
    s.rrectW([bx, B.usb.y - 4, B.usb.z - 6.5], [bx, B.usb.y + 4, B.usb.z + 6.5], 1.5);
    s.rrectW([bx, c3y + 1.63 - 4, B.c3.z - 6.5], [bx, c3y + 1.63 + 4, B.c3.z + 6.5], 1.5);
  });
  o.extrude('cut', 1.5, { omkeren: true, naam: 'Zakken USB-C-stekkers' });
  // voorkant: verzonken wipschakelaar (verdikking binnen, kom van 6 mm buiten, paneel 2 mm)
  const S = B.schakelaar, zk = bz - M.schakelaar.diep;
  o.schets(vlak('schakelbinnen', 'Plane verdikking schakelaar', [0, 0, iz], [0, 0, -1], 'reference'), (s) => s.rrectW([S.x - 12.5, vloer, iz], [S.x + 12.5, -4, iz]));
  o.extrude('boss', M.schakelaar.diep + M.schakelaar.paneel - B.wand, { terug: 0.5, naam: 'Verdikking schakelaar' });
  o.schets(vlak('schakelkom', 'Face kom schakelaar', [0, 0, bz], [0, 0, 1]), (s) => s.rrectW([S.x - 12.5, S.y - 9.5, bz], [S.x + 12.5, S.y + 9.5, bz], 3));
  o.extrude('cut', M.schakelaar.diep, { omkeren: true, terug: 1, naam: 'Kom schakelaar' });
  o.schets(vlak('schakelpaneel', 'Face paneel schakelaar', [0, 0, zk], [0, 0, 1]), (s) => s.rrectW([S.x - 9.5, S.y - 6.5, zk], [S.x + 9.5, S.y + 6.5, zk]));
  o.extrude('cut', M.schakelaar.paneel + 1, { omkeren: true, naam: 'Inbouwgat schakelaar' });
  // bussen voor de print (M2,5) en de USB-C-breakout, aanslagen voor de adapter
  const pb = [[P.x[0] + 3, P.z[0] + 3], [P.x[1] - 3, P.z[0] + 3], [P.x[0] + 3, P.z[1] - 3], [P.x[1] - 3, P.z[1] - 3]];
  o.schets(yv('vloer', vloer), (s) => {
    pb.forEach(([x, z]) => s.cirkelW([x, 0, z], 3));
    usbGaten().forEach(([x, z]) => s.cirkelW([x, 0, z], 2.5));
    s.rrectW([A.x[1] + 0.5, 0, A.z[0]], [A.x[1] + 3, 0, A.z[1] - 20]); // aanslag einde adapter
    s.rrectW([A.x[0] + 10, 0, A.z[1] + 0.5], [A.x[0] + 30, 0, A.z[1] + 3]); // aanslag zijkant adapter
  });
  o.extrude('boss', P.y - vloer, { terug: 0.5, naam: 'Bussen en aanslagen' });
  // twee paaltjes naast de adapter tot zijn bovenkant: de adapterklemmen worden erop geschroefd (M3 verzonken)
  const K = B.klem;
  o.schets(yv('vloer', vloer), (s) => K.x.forEach((x) => s.rrectW([x - K.b / 2, 0, A.z[1] + 0.5], [x + K.b / 2, 0, A.z[1] + 0.5 + K.d])));
  o.extrude('boss', klemY() - vloer, { terug: 0.5, naam: 'Paaltjes adapterklemmen' });
  o.schets(yv('klemtop', klemY(), 'reference', 'Plane klemtop'), (s) => K.x.forEach((x) => s.cirkelW([x, 0, A.z[1] + 0.5 + K.d / 2], 1.25)));
  o.extrude('cut', 10, { omkeren: true, naam: 'Gaten adapterklemmen' });
  // ring tegen de voorwand voor het slangetje van de doorvoer naar de drukmeter
  wandring(o, 'slang', 0, iz, -1, B.buis.y + 13, 5.6);
  o.schets(yv('busgat', P.y, 'reference', 'Plane gaten bussen'), (s) => { pb.forEach(([x, z]) => s.cirkelW([x, 0, z], 1.05)); usbGaten().forEach(([x, z]) => s.cirkelW([x, 0, z], 0.8)); });
  o.extrude('cut', 4.5, { omkeren: true, naam: 'Gaten bussen' });
  return o.doc();
}

/** deksel van de voedingsbox (plat geprint, 2 mm): valt bovenin de bak op de 4 paaltjes en zit mee in de uitsparing
 *  van het blad; 4 x M3 x 8 verzonken in de paaltjes, apart af te nemen */
export function boxdeksel() {
  const { box: B } = M;
  const o = new Onderdeel('Deksel voedingsbox', PETG);
  const ix = B.b / 2 - B.wand - 0.2, iz = B.d / 2 - B.wand - 0.2;
  o.schets(yv('dekselonder', B.boven - B.deksel, 'reference', 'Plane onderkant deksel'), (s) => s.rrect(-ix, -iz, ix, iz, 1.8));
  o.extrude('boss', B.deksel, { naam: 'Deksel' });
  o.schets(yv('dekseltop', B.boven, 'reference', 'Plane bovenkant deksel', 'reference', 'Plane dekseltop'), (s) => boxBuizen().forEach(([x, z]) => s.cirkelW([x, 0, z], 3.2)));
  o.extrude('cut', 1.6, { omkeren: true, naam: 'Verzinking M3', draft: 45 });
  o.schets(yv('dekseltop', B.boven, 'reference', 'Plane bovenkant deksel', 'reference', 'Plane dekseltop'), (s) => boxBuizen().forEach(([x, z]) => s.cirkelW([x, 0, z], 1.7)));
  o.extrude('cut', B.deksel + 1, { omkeren: true, naam: 'Gaten M3' });
  return o.doc();
}

/** klem voor de netadapter (plat geprint, 3 mm): ligt op een paaltje van de box en drukt met een lip van 8 mm op de
 *  bovenkant van de adapter; M3 x 10 verzonken in het paaltje. Oorsprong: midden van de box op de onderkant van het blad,
 *  zoals de box; i = 0 of 1 (het paaltje) */
export function adapterklem(i = 0) {
  const { box: B } = M, A = B.adapter, K = { ...B.klem, y: klemY() }, x = K.x[i], zc = A.z[1] + 0.5 + K.d / 2;
  const o = new Onderdeel('Adapterklem', PETG);
  o.schets(yv('klem', K.y, 'reference', 'Plane klem'), (s) => s.rrectW([x - K.b / 2, 0, A.z[1] - 8], [x + K.b / 2, 0, A.z[1] + 0.5 + K.d], 1.5));
  o.extrude('boss', 3, { naam: 'Klem' });
  o.schets(yv('klemtop', K.y + 3, 'reference', 'Plane klemtop'), (s) => s.cirkelW([x, 0, zc], 3.2));
  o.extrude('cut', 1.6, { omkeren: true, naam: 'Verzinking M3', draft: 45 });
  o.schets(yv('klemtop', K.y + 3, 'reference', 'Plane klemtop'), (s) => s.cirkelW([x, 0, zc], 1.7));
  o.extrude('cut', 4, { omkeren: true, naam: 'Gat M3' });
  return o.doc();
}

/** netadapter Mean Well GST90A24-P1M (vereenvoudigd): 145 x 60 x 32, C14-inlaat aan de linkerkant */
export function netadapter() {
  const { adapter: A } = M.box;
  const o = new Onderdeel('Mean Well GST90A24-P1M', { name: 'PC, zwart', density: 1200, color: '#26272a' });
  const y0 = M.box.onder + M.box.wand + A.voet; // op de twee ribben
  o.schets(yv('adapter', y0, 'reference', 'Plane adapter'), (s) => s.rrectW([A.x[0], 0, A.z[0]], [A.x[1], 0, A.z[1]], 4));
  o.extrude('boss', A.h, { naam: 'Behuizing' });
  o.schets(vlak('inlaat', 'Face inlaat', [A.x[0], 0, 0], [-1, 0, 0]), (s) => s.rrectW([A.x[0], A.inlaat.y - 9, A.inlaat.z - 12], [A.x[0], A.inlaat.y + 9, A.inlaat.z + 12], 2));
  o.extrude('cut', 10, { omkeren: true, naam: 'Inlaat C14' });
  o.schets(vlak('inlaatbodem', 'Plane bodem inlaat', [A.x[0] + 10, 0, 0], [-1, 0, 0], 'reference'), (s) => [[-4, -3], [0, 3], [4, -3]].forEach(([dz, dy]) => s.rrectW([A.x[0] + 10, A.inlaat.y + dy - 2, A.inlaat.z + dz - 1], [A.x[0] + 10, A.inlaat.y + dy + 2, A.inlaat.z + dz + 1])));
  o.extrude('boss', 7, { terug: 0.2, naam: 'Pennen C14' });
  // trekontlasting van de DC-kabel aan de andere kant, en het label bovenop
  o.schets(vlak('dcuit', 'Plane DC-kabel', [A.x[1] - 0.2, 0, 0], [1, 0, 0], 'reference'), (s) => s.cirkelW([A.x[1], y0 + A.h / 2, 12], 3.5));
  o.extrude('boss', 3.5, { naam: 'Trekontlasting' });
  o.schets(yv('label', y0 + A.h, 'reference', 'Plane label'), (s) => s.rrectW([A.x[0] + 25, 0, A.z[0] + 10], [A.x[1] - 25, 0, A.z[1] - 10], 2));
  o.extrude('cut', 0.3, { omkeren: true, naam: 'Label' });
  return o.doc();
}

/** print in de voedingsbox (-A2, gaatjesprint 40 x 50) met de echte maten van de onderdelen: ESP32-C3 SuperMini
 *  (USB-C naar de rechterwand), drukmeter SDP810 (poorten naar boven), 5V-regelaar D24V10F5, zekering TR5, elco,
 *  schroefklem en transistor */
export function voedingsprint() {
  const { print: P, c3 } = M.box;
  const o = new Onderdeel('Voedingsprint', PCB);
  o.schets(yv('print', P.y, 'reference', 'Plane print'), (s) => s.rrectW([P.x[0], 0, P.z[0]], [P.x[1], 0, P.z[1]], 1));
  o.extrude('boss', 1.6, { naam: 'Print' });
  const pb = [[P.x[0] + 3, P.z[0] + 3], [P.x[1] - 3, P.z[0] + 3], [P.x[0] + 3, P.z[1] - 3], [P.x[1] - 3, P.z[1] - 3]];
  o.schets(yv('printtop', P.y + 1.6), (s) => pb.forEach(([x, z]) => s.cirkelW([x, 0, z], 1.1)));
  o.extrude('cut', 1.6, { omkeren: true, naam: 'Gaten M2,5' });
  const y0 = P.y + 1.6, ix = M.box.b / 2 - M.box.wand;
  const blok = (id, naam, x0, z0, x1, z1, yb, h, r = 0) => {
    o.schets(yv(id, yb, 'reference', `Plane ${naam}`), (s) => s.rrectW([x0, 0, z0], [x1, 0, z1], r));
    o.extrude('boss', h, { terug: 0.05, naam });
  };
  const cil = (id, naam, x, z, rr, yb, h) => {
    o.schets(yv(id, yb, 'reference', `Plane ${naam}`), (s) => s.cirkelW([x, 0, z], rr));
    o.extrude('boss', h, { terug: 0.05, naam });
  };
  // ESP32-C3 SuperMini (22,52 x 18) op twee pinheaders van 2,5 mm, de USB-C 1,9 mm voorbij de rand tegen de wand
  const cx1 = ix - 0.1, cx0 = cx1 - 22.52, ch = y0 + c3.hoog;
  blok('c3h1', 'Pinheader 1', cx0 + 1, c3.z + 7.62 - 1.25, cx1 - 1, c3.z + 7.62 + 1.25, y0, 2.5);
  blok('c3h2', 'Pinheader 2', cx0 + 1, c3.z - 7.62 - 1.25, cx1 - 1, c3.z - 7.62 + 1.25, y0, 2.5);
  blok('c3', 'ESP32-C3 SuperMini', cx0, c3.z - 9, cx1, c3.z + 9, ch - 1, 1, 0.8);
  blok('c3chip', 'ESP32-C3', cx0 + 7, c3.z - 2.5, cx0 + 12, c3.z + 2.5, ch, 0.9);
  blok('c3ant', 'Antenne', cx0 + 1, c3.z - 3, cx0 + 2.6, c3.z + 3, ch, 1.1);
  blok('c3knop', 'Knopjes BOOT en RST', cx1 - 12, c3.z - 7, cx1 - 9, c3.z - 4, ch, 1.5);
  usbC(o, 'c3usb', [c3.z, ch], cx1 + 1.9, 1, 'x');
  // Sensirion SDP810 (18 x 29 x 10,25) met de twee poorten (flens Ø8, tuit Ø5,2) naar boven, 12,6 uit elkaar
  const ox = P.x[0], oz = P.z[0]; // posities t.o.v. de linkerachterhoek van de print
  const sx = ox + 9.5, sz = oz + 29.5;
  blok('sdp', 'SDP810', sx - 9, sz - 14.5, sx + 9, sz + 14.5, y0, 10.25, 1.5);
  [-6.3, 6.3].forEach((dz, i) => {
    cil(`sdpf${i}`, `Poortflens ${i + 1}`, sx, sz + dz, 4, y0 + 10.25, 2.6);
    cil(`sdpt${i}`, `Poort ${i + 1}`, sx, sz + dz, 2.6, y0 + 12.85, 10.9);
  });
  // Pololu D24V10F5 (17,8 x 12,7) op een header van 2,5 mm, met de spoel
  blok('ppoh', 'Header regelaar', P.x[0] + 7.5, P.z[0] + 1.5, P.x[0] + 9.5, P.z[0] + 13.7, y0, 2.5);
  blok('ppo', 'D24V10F5', P.x[0] + 7, P.z[0] + 1, P.x[0] + 24.8, P.z[0] + 13.7, y0 + 2.5, 1, 0.5);
  blok('ppol', 'Spoel', P.x[0] + 16, P.z[0] + 4.5, P.x[0] + 21, P.z[0] + 9.5, y0 + 3.5, 2.2);
  // zekering TR5 (Ø8,4 x 7,6), elco 470 µF (Ø10 x 20), schroefklem 2-polig, transistor TO-92
  cil('tr5', 'Zekering TR5', ox + 29.5, oz + 6, 4.2, y0, 7.6);
  cil('elco', 'Elco 470 µF', ox + 24, oz + 39, 5, y0, 20);
  blok('klem', 'Schroefklem', ox + 30, oz + 34, ox + 39.5, oz + 41.5, y0, 10);
  o.schets(yv('klemtop', y0 + 10, 'reference', 'Plane klemtop'), (s) => [ox + 32.5, ox + 37].forEach((x) => s.cirkelW([x, 0, oz + 37.75], 1.4)));
  o.extrude('cut', 2, { omkeren: true, naam: 'Schroefjes klem' });
  blok('to92', 'Transistor', ox + 6, oz + 45.5, ox + 10.6, oz + 49.1, y0, 4.6);
  return o.doc();
}

/** de 2 gaten M2 achteraan het USB-C-breakoutje in de box (2,5 mm van de rand) */
/** de bovenkant van de adapter (hij staat op twee ribben van 2 mm) en de hoogte van de klemmen */
const adapterBoven = () => M.box.onder + M.box.wand + M.box.adapter.voet + M.box.adapter.h;
const klemY = () => adapterBoven() + 0.1;
/** de vier pluggaten in de rand van de box */
const boxPluggen = () => { const { x, z } = M.box.plug; return [[x, z], [x, -z], [-x, z], [-x, -z]]; };
/** de vier paaltjes in de hoeken van de box (voor het deksel) */
const boxBuizen = () => { const B = M.box, x = B.b / 2 - B.wand - 5, z = B.d / 2 - B.wand - 5; return [[x, z], [x, -z], [-x, z], [-x, -z]]; };
const usbGaten = () => { const U = M.box.usb, x0 = M.box.b / 2 - M.box.wand - U.b + 2.5; return [[x0, U.z - U.d / 2 + 2.5], [x0, U.z + U.d / 2 - 2.5]]; };

/** USB-C-breakout voor de knop (-X8) in de voedingsbox (6-polig, 20,3 x 12,7, 2 gaten M2): op twee bussen, de voorkant
 *  van de print tegen de rechterwand, de bus 1,3 mm verder in de opening */
export function usbBusBox() {
  const { box: B } = M, U = B.usb;
  const o = new Onderdeel('USB-C-bus knop', PCB);
  const ix = B.b / 2 - B.wand, yb = M.box.print.y + 0.1; // 0,1 mm boven de bussen (geen samenvallende vlakken)
  o.schets(yv('usbprint', yb, 'reference', 'Plane print'), (s) => s.rrectW([ix - U.b, 0, U.z - U.d / 2], [ix - 0.1, 0, U.z + U.d / 2]));
  o.extrude('boss', 1.6, { naam: 'Print' });
  usbC(o, 'busb', [U.z, yb + 1.6], ix - 0.1 + U.over, 1, 'x');
  o.schets(yv('usbgat', yb + 1.6, 'reference', 'Plane gaten'), (s) => usbGaten().forEach(([x, z]) => s.cirkelW([x, 0, z], 1.1)));
  o.extrude('cut', 2, { omkeren: true, naam: 'Gaten M2' });
  // 6 eilandjes (VBUS, GND, CC1, CC2) in het midden
  o.schets(yv('usbpads', yb + 1.6), (s) => { for (let i = 0; i < 4; i++) s.rrectW([ix - U.b + 7, 0, U.z - 3.81 + i * 2.54 - 0.6], [ix - U.b + 9, 0, U.z - 3.81 + i * 2.54 + 0.6]); });
  o.extrude('boss', 0.1, { terug: 0.05, naam: 'Soldeereilanden' });
  return o.doc();
}

/** wipschakelaar KCD1-101 in de kom van de voorwand van de box: huis met twee vlakstekers 4,8, rand en wip */
export function schakelaar() {
  const { box: B, schakelaar: S0 } = M;
  const S = B.schakelaar, zk = B.d / 2 - S0.diep;
  const o = new Onderdeel('Wipschakelaar KCD1-101', ZWART);
  o.schets(vlak('huis', 'Plane huis', [0, 0, zk + 0.1], [0, 0, -1], 'reference'), (s) => s.rrectW([S.x - 9.3, S.y - 6.3, 0], [S.x + 9.3, S.y + 6.3, 0]));
  o.extrude('boss', 12.5, { naam: 'Huis' });
  o.schets(vlak('stekers', 'Plane stekers', [0, 0, zk - 12.3], [0, 0, -1], 'reference'), (s) => [-4, 4].forEach((dx) => s.rrectW([S.x + dx - 2.4, S.y - 0.4, 0], [S.x + dx + 2.4, S.y + 0.4, 0])));
  o.extrude('boss', 6.8, { naam: 'Vlakstekers 4,8' });
  o.schets(vlak('rand', 'Plane rand', [0, 0, zk + 0.1], [0, 0, 1], 'reference'), (s) => s.rrectW([S.x - 10.5, S.y - 7.5, 0], [S.x + 10.5, S.y + 7.5, 0], 1));
  o.extrude('boss', 2, { terug: 0.05, naam: 'Rand' });
  o.schets(vlak('wip', 'Plane wip', [0, 0, zk + 2.1], [0, 0, 1], 'reference'), (s) => s.rrectW([S.x - 9, S.y - 6, 0], [S.x + 9, S.y + 6, 0], 1));
  o.extrude('boss', S0.diep - 3.1, { terug: 0.3, naam: 'Wip' });
  const top = zk + 2.1 + (S0.diep - 3.1);
  o.schets(vlak('wiptop', 'Plane bovenkant wip', [0, 0, top], [0, 0, 1], 'reference'), (s) => s.rrectW([S.x - 9, S.y - 6, 0], [S.x, S.y + 6, 0]));
  o.extrude('cut', 0.8, { omkeren: true, naam: 'Helling wip' });
  o.schets(vlak('wiptop', 'Plane bovenkant wip', [0, 0, top], [0, 0, 1], 'reference'), (s) => s.rrectW([S.x + 4, S.y - 2.5, 0], [S.x + 4.6, S.y + 2.5, 0]));
  o.extrude('cut', 0.3, { omkeren: true, naam: 'Teken I' });
  return o.doc();
}

/** M8-inbouwstekker 4-polig in de voorkant van de box (binder 718, M10 x 0,75): naar de M8-kabel */
export function m8stekker() {
  const { box: B } = M;
  return m8connector('M8-inbouwstekker 4-polig', [B.m8.x, B.m8.y], B.d / 2 - B.wand, 1, B.wand, false);
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
  const k = klauw(), C5 = M.klauw;
  assen().forEach(([x, z], i) =>
    comps.push(component(`${prefix}k${i + 1}`, `Klauw<${i + 1}>`, k, at([x, -blad - C5.dik, z]), { rotation: x > 0 ? [0, 0, 0, 1] : halfY })));
  // de M5-moeren in de klauwen, tegen het plafond van hun kamer
  const m5n = moer('M5 zeskantmoer DIN 934', C5.moer.s, C5.moer.m, 4.3);
  assen().forEach(([x, z], i) => comps.push(component(`${prefix}n${i + 1}`, `M5 zeskantmoer DIN 934<${i + 1}>`, m5n, at([x, -blad - C5.dik + 0.2, z]))));
  const d = M.dial, DC = d.klauw;
  comps.push(component(`${prefix}7`, 'Knophouder<1>', knophouder(), at([d.x, 0, d.z])));
  comps.push(component(`${prefix}12`, 'Knopdeksel<1>', knopdeksel(), at([d.x, 0, d.z])));
  comps.push(component(`${prefix}8`, 'VIEWE-knop 1,5"<1>', vieweKnop(), at([d.x, d.plaat, d.z])));
  comps.push(component(`${prefix}14`, 'Adapterprint knop<1>', knopadapter(), at([d.x, 0, d.z])));
  comps.push(component(`${prefix}15`, 'USB-C-bus knophouder<1>', usbBusKnop(), at([d.x, 0, d.z])));
  const dk = dialklauw();
  [DC.x, -DC.x].forEach((x, i) => comps.push(component(`${prefix}dk${i + 1}`, `Knopklauw<${i + 1}>`, dk, at([d.x + x, -blad - DC.dik, d.z]), { rotation: x > 0 ? [0, 0, 0, 1] : halfY })));
  const m4n = moer('M4 zeskantmoer DIN 934', DC.moer.s, DC.moer.m, 3.5);
  [DC.x, -DC.x].forEach((x, i) => comps.push(component(`${prefix}dn${i + 1}`, `M4 zeskantmoer DIN 934<${i + 1}>`, m4n, at([d.x + x, -blad - DC.dik + 0.2, d.z]))));
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
  fanGaten().forEach(([x, z], i) => comps.push(component(`${prefix}s4${i + 1}`, `M4 x 10 DIN 7991<${i + 1}>`, m4, at([x, y0 + 1, z]), { rotation: omhoog })));
  const m4d = schroefVerzonken('M4 x 65 DIN 7991', 4, 3.4, 65);
  [DC.x, -DC.x].forEach((x, i) => comps.push(component(`${prefix}sd${i + 1}`, `M4 x 65 DIN 7991<${i + 1}>`, m4d, at([d.x + x, d.plaat, d.z]))));
  // de knop met 2 x M2,5 x 6 verzonken van onderen in de naaf; het deksel met 2 x M2,5 x 8 verzonken
  const m25k = schroefVerzonken('M2,5 x 6 DIN 7991', 2.5, 2, 6);
  const vloerOnder = d.plaat - d.naaf.reduce((a2, [, dd]) => a2 + dd, 0) - d.vloer;
  d.schroeven.forEach(([x, z], i) => comps.push(component(`${prefix}sk${i + 1}`, `M2,5 x 6 DIN 7991<${i + 1}>`, m25k, at([d.x + x, vloerOnder, d.z + z]), { rotation: omhoog })));
  const m25d = schroefVerzonken('M2,5 x 8 DIN 7991', 2.5, 2, 8);
  d.bus.forEach(([x, z], i) => comps.push(component(`${prefix}sdk${i + 1}`, `M2,5 x 8 DIN 7991<${i + 1}>`, m25d, at([d.x + x, d.onder - d.deksel, d.z + z]), { rotation: omhoog })));
  // drukmeting: messingbuisje in de instroomplaat (meetpunt) en een door de achterwand (slang naar de voedingsbox)
  const A = M.achter;
  comps.push(component(`${prefix}18`, 'Messingbuisje Ø3 x 12<1>', messingbuisje(12), at([A.meet[0], M.inlaat.top, A.meet[1]])));
  comps.push(component(`${prefix}19`, 'Messingbuisje Ø3 x 12<2>', messingbuisje(12), at([A.buis.x, A.buis.y, -M.romp.d / 2 - 4]), { rotation: naarVoor }));
  // de voedingsbox onder het blad (vast aan het blad, dus mee met de bladdikte)
  const B = M.box, bo = [B.x, -blad, B.z], bat = (p) => at([bo[0] + p[0], bo[1] + p[1], bo[2] + p[2]]);
  const naarAchter = [Math.SQRT1_2, 0, 0, Math.SQRT1_2]; // +90° om X: -Y wordt -Z
  comps.push(component(`${prefix}20`, 'Voedingsbox<1>', voedingsbox(), bat([0, 0, 0])));
  comps.push(component(`${prefix}28`, 'Deksel voedingsbox<1>', boxdeksel(), bat([0, 0, 0])));
  // het deksel met 4 x M3 x 8 verzonken op de paaltjes; de box met 4 x M4 x 30 verzonken van onderen in pluggen
  const m3dk = schroefVerzonken('M3 x 8 DIN 7991', 3, 2.5, 8), m4b = schroefVerzonken('M4 x 30 DIN 7991', 4, 3.4, 30);
  boxBuizen().forEach(([x, z], i) => comps.push(component(`${prefix}sbd${i + 1}`, `M3 x 8 DIN 7991<${i + 1}>`, m3dk, bat([x, B.boven, z]))));
  boxPluggen().forEach(([x, z], i) => comps.push(component(`${prefix}sb${i + 1}`, `M4 x 30 DIN 7991<${i + 1}>`, m4b, bat([x, -B.flensDik, z]), { rotation: omhoog })));
  comps.push(component(`${prefix}21`, 'Mean Well GST90A24-P1M<1>', netadapter(), bat([0, 0, 0])));
  comps.push(component(`${prefix}22`, 'Voedingsprint<1>', voedingsprint(), bat([0, 0, 0])));
  comps.push(component(`${prefix}23`, 'USB-C-bus knop<1>', usbBusBox(), bat([0, 0, 0])));
  comps.push(component(`${prefix}24`, 'Wipschakelaar KCD1-101<1>', schakelaar(), bat([0, 0, 0])));
  comps.push(component(`${prefix}25`, 'M8-inbouwstekker 4-polig<1>', m8stekker(), bat([0, 0, 0])));
  [0, 1].forEach((i) => comps.push(component(`${prefix}27${i ? 'b' : ''}`, `Adapterklem<${i + 1}>`, adapterklem(i), bat([0, 0, 0]))));
  const m3k = schroefVerzonken('M3 x 10 DIN 7991', 3, 2.5, 10);
  B.klem.x.forEach((x, i) => comps.push(component(`${prefix}sa${i + 1}`, `M3 x 10 DIN 7991<${i + 1}>`, m3k, bat([x, klemY() + 3, B.adapter.z[1] + 0.5 + B.klem.d / 2]))));
  comps.push(component(`${prefix}26`, 'Messingbuisje Ø3 x 12<3>', messingbuisje(12), bat([B.buis.x, B.buis.y, B.d / 2 + 4]), { rotation: naarAchter }));
  const m25 = schroefCilinder('M2,5 x 6 zelftappend', 4.5, 2, 2, 6);
  const P = B.print;
  [[P.x[0] + 3, P.z[0] + 3], [P.x[1] - 3, P.z[0] + 3], [P.x[0] + 3, P.z[1] - 3], [P.x[1] - 3, P.z[1] - 3]].forEach(([x, z], i) =>
    comps.push(component(`${prefix}s25${i + 1}`, `M2,5 x 6 zelftappend<${i + 1}>`, m25, bat([x, P.y + 1.6, z]))));
  const m2 = schroefCilinder('M2 x 5 zelftappend', 3.8, 1.6, 1.6, 5);
  const ixb = B.b / 2 - B.wand;
  usbGaten().forEach(([x, z], i) => comps.push(component(`${prefix}s2${i + 1}`, `M2 x 5 zelftappend<${i + 1}>`, m2, bat([x, P.y + 0.1 + 1.6, z]))));

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
  // 4 gaten Ø8 naast de uitsparing voor de pluggen voor holle deuren (de rand van de box)
  o.schets(onder, (s) => boxPluggen().forEach(([x, z]) => s.cirkelW([bx + x, 0, bz + z], B.plug.gat / 2)));
  o.extrude('cut', B.plug.diep, { omkeren: true, naam: 'Gaten pluggen box' });
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
  'Filtermat-SK3171.kcad': () => filterlaag(0),
  'Instroomplaat.kcad': instroomplaat,
  'Bodemplaat.kcad': uitblaasplaat,
  'Ventilator-San-Ace-C175.kcad': ventilator,
  'M8-inbouwbus.kcad': m8bus,
  'Voedingsbox.kcad': voedingsbox,
  'Netadapter-GST90A24.kcad': netadapter,
  'Voedingsprint.kcad': voedingsprint,
  'USB-C-bus-knop.kcad': usbBusBox,
  'USB-C-bus-knophouder.kcad': usbBusKnop,
  'Adapterklem.kcad': () => adapterklem(0),
  'Deksel-voedingsbox.kcad': boxdeksel,
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
  for (const oud of ['Inlijmmoer-M4.kcad', 'Filtermat-G4.kcad', 'Fijnstoffilter-M5.kcad', 'Voorfilter-G4.kcad', 'Actieve-koolmat.kcad', 'Inbouwmodule.kcad', 'Filterlade.kcad', 'print/Inbouwmodule.stl', 'print/Filterlade.stl', 'Filtermat.kcad', 'Ventilatorplaat.kcad', 'Ventilator-NF-F12.kcad', 'print/Ventilatorplaat.stl',
    'Elektronicabox.kcad', 'Deksel-elektronicabox.kcad', 'print/Elektronicabox.stl', 'print/Deksel-elektronicabox.stl', 'Dialhouder.kcad', 'print/Dialhouder.stl',
    'Uitblaasplaat.kcad', 'print/Uitblaasplaat.stl', 'Deksel-elektronicavak.kcad', 'print/Deksel-elektronicavak.stl',
    'Dialkuip.kcad', 'Dialring.kcad', 'Dialklauw.kcad', 'M5Stack-Dial.kcad', 'print/Dialkuip.stl', 'print/Dialring.stl',
    'Ventilator-Delta-PFR1212UHE.kcad', 'Interfaceprint.kcad', 'ESP32-C3-SuperMini.kcad', 'USB-C-bus-module.kcad'])
    if (existsSync(join(HERE, oud))) rmSync(join(HERE, oud));
  console.log('geschreven:', [...Object.keys(ONDERDELEN), 'Afzuiging.kcad'].join(', '));
}
