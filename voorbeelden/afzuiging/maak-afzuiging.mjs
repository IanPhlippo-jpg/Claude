// Ingebouwde nagelstofafzuiging voor het bureau (versie 7.4, 2026-11-17; zie revisie.mjs), als Phlippo CAD-documenten.
// Versie 7.4 (advies Fable 5.2 v1): M8-bus verticaal in een console onderaan de romp, M8-stekker in de linkerwand van de
// box, instroomtuit naar de vorm van de Sanyo-nozzle 109-1073, ventilator star op bussen in een geribde kuip, aders in een
// goot in de wand van de kuip, schakelaar in de achterwand van de box, bovenframe uit 4 latten (printbed 230 x 230).
// Versie 7.2 (advies Fable 5.2 en wens Ian): onder het blad ronde vormen. De vierkante romp stopt 70 mm onder het
// bovenvlak (filter, verdeelruimte, instroomplaat en de klauwtorens); de ventilator hangt eronder in een ronde, bolle kuip
// (Ø189) (7.2 op 4 rubberbuffers; 7.4 star op een geribde naaf), met schuine lamellen opzij en ringsleuven in de bodem. De kuip hangt met 4 oren aan de romp.
//
// Opbouw (van boven naar onder):
// - RVS-plaat (AISI 430, magnetisch, lasergesneden, LB-monogram) ligt op het bovenframe en is er even groot als het:
//   van boven zie je alleen staal; ze klikt vast op 4 magneten die verzonken in het frame zitten;
// - bovenframe (PETG, 2,5 mm, plat geprint): een smalle omranding op het blad, op de romp gelijmd;
// - een gewoon interieurfilter van een auto (pollenfilter MANN CU 20 013, 195 x 145 x 30, ook Bosch, Valeo, Purflux):
//   plaat eraf, filter eruit tillen, nieuw erin (niets te knippen). Het ligt op een zachte foamband op een steunrand van
//   de instroomplaat; de onderdruk trekt het erop (geen lucht langs het filter);
// - romp (PETG, rechtop geprint, vierkant 210 x 210) met de instroomplaat; de radiale ventilator San Ace C175
//   (24 V, PWM, tacho) hangt eronder in de ronde kuip (lamellen opzij, ringsleuven in de bodem).
// Bevestiging: vier klauwen in PETG (6 mm, 100 % vulling) met een M5-moer in een zeskantkamer, in gesloten torens. De
// kop van de M5-schroef zit in een lip van het bovenframe (onder de RVS-plaat) en drukt het hele frame op het blad;
// draai hem aan, de klauw zwaait door het venster naar buiten en schuift in een lange sleuf omhoog tot het rubberkussen
// op de arm het blad raakt; daarna nog een halve slag (het rubber begrenst de kracht, docs/Berekeningen.md 6). Bladdikte 10 tot 50 mm
// (LAGKAPTEN: 34 mm). Alle schroefkoppen zitten in een conische zitting.
// Luchtdicht: de torens zijn alleen naar buiten open, de naad frame/romp is gelijmd; lucht kan er alleen in langs het
// rooster en uit langs de bodemplaat.
// De VIEWE-knop 1,5" staat op een houder die niet breder is dan de knop, met twee kleine klauwen in PETG (M4-moer):
// geen enkele schroef in het blad. Alle schroeven, bouten en moeren staan als onderdelen in de assemblage.
// Elektronica: in een aparte voedingsbox die onder het blad is ingefreesd (netadapter 24 V, ESP32-C3, drukmeter,
// schakelaar); een haakse M8-kabel en een slangetje naar de module (vrij onder het blad, 7.4), een USB-C-kabel in een
// sleuf naar de knop, met een koppeling aan beide kanten. De knop praat draadloos met de box (ESP-NOW).
//
// Assenstelsel van de module: oorsprong in het midden van de uitsparing op het bovenvlak van het blad, Y omhoog,
// +Z naar de voorkant van het bureau. Alle PETG-delen passen op het bed van de Elegoo Centauri Carbon (256 x 256) en printen zonder support.
// Alle PETG-delen passen op een printbed van 230 x 230 (opdracht; de Centauri Carbon heeft 256 x 256).
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
  romp: { b: 210, d: 210, r: 6, wand: 4, onder: -70 }, // 7.2: de romp stopt hier, de ventilator zit in de kuip (M.kuip)
  uitsparing: { b: 212, d: 212, r: 6 }, // te frezen in het blad
  // klauwen in de hoeken (daar is ruimte naast de ronde waaier); geprint in PETG (100 % vulling), 6 mm dik, met een
  // M5-moer (DIN 934) die van onderen in een zeskantkamer gaat: de moer draait niet, dus de klauw draait mee
  // rubber: neopreen (CR) Shore A 40, 4 mm, 7,5 x 8 op de arm buiten de romp (tot het rubber het blad raakt, dan een halve slag)
  klauw: { x: 96.5, z: 72, naaf: 6.5, arm: 18, breed: 8, dik: 6, moer: { s: 8, m: 4, speling: 0.3 }, rubber: { x: [9.5, 17], h: 4 } }, // ingetrokken blijft de naaf 2 mm binnen de romp
  toren: { binnen: 87.5, top: -9, zwaai: -49, bodem: -61 }, // sleuf van top tot bodem, zwaaivenster onderaan (klauw + rubber)
  lip: { x: 91, z: 6 }, // lippen van het bovenframe boven de torens, voor de kop van de M5-schroef
  // filter (keuze Ian, 2026-11-08): interieurfilter MANN CU 20 013 (Toyota Aygo II, Peugeot 108, Citroën C1 II), 195 x 145 x 30,
  // geplooid deeltjesfilter; gelijk: Bosch 1 987 435 066, Valeo 715828, Purflux AH495, Filtron K 1347A (196 x 145 x 30).
  // Langs Z (195), tussen de torens (x 87,5). Het ligt op een zachte foamband (6 x 4) op een steunrand van 6 mm van de
  // instroomplaat; een geleiderand houdt het op zijn plaats (1 mm speling). In rust 1 mm onder de RVS-plaat; draait de
  // ventilator, dan trekt de onderdruk het filter in de foam (de afdichting) en komt er ruimte boven het filter.
  // Afdichting (versie 7.1): een lip van zelfklevend siliconenrubber (0,5 mm) op de geleiderand, 2,5 mm over de rand van
  // het filter: het filter buigt hem bij het inleggen naar onder en hij ligt rondom tegen de zijkant (getekend in die
  // stand). De foamband draagt het filter alleen nog zacht; de onderdruk drukt de lip in de spleet (zelfversterkend).
  // 7.2: 3 mm lager (steun -35,5): bovenkant -1,5, dus 4 mm (3 tot 5 bij een filter van 29 tot 31) onder de RVS-plaat
  filter: { naam: 'Interieurfilter MANN CU 20 013', x: 72.5, z: 97.5, h: 30, speling: 1, foam: { b: 6, h: 4 },
    steun: -35.5, rand: 3.5, gids: { dik: 1.5, h: 6 }, plooi: 4.2, lip: { dik: 0.5, over: 2.5, neer: 2.5 } },
  // radiale ventilator met achterwaarts gebogen schoepen: San Ace C175 9TG24P0S01 (Ø175 x 69, 24 V, 56 W, PWM 25 kHz);
  // waaier 60,5 hoog, instroomoog Ø131, motor 4 x M4 op Ø58 (schroefdiepte 4 tot 6 mm)
  // datasheet (Sanyo Denki-catalogus C1111B002, Farnell 2003019): 3900 min-1 bij 100 %, 0 % PWM = stilstand, 750 g, tacho 2 pulsen/omw
  // 7.4 (P1-4): de waaier hangt 4 mm onder de instroomplaat (was 2): hoogte 69 ± 1 mm (datasheet) plus printtoleranties,
  // maatketen in docs/Berekeningen.md 6b
  fan: { d: 175, waaier: 60.5, h: 69, oog: 131, naaf: 36, gat: 29, top: -55 },
  // instroomplaat (los geprint, op een richel gelijmd); verdeelruimte 12,5 + 3 = 15,5 mm onder het filter.
  // 7.4 (P1-3): een losse instroomtuit (instroomtuit()) naar de vorm van de Sanyo-nozzle 109-1073 (waarmee de curve gemeten
  // is): keel Ø125, afronding R6, wand 1,2 mm, 2 mm in het oog (Ø131) van de waaier; radiaal 1,8 mm speling; ze ligt met een
  // kraag van 45° in een verzonken zitting van de plaat. Vingerrooster in de tuit: 18 ribben 1,6 op steek 7,2 (spleten 5,6,
  // met de printtolerantie hoogstens 5,9), tot 21 mm boven de waaier: de
  // bovenkant ligt 21 mm boven de waaier (EN ISO 13857 tabel 5, vanaf 3 jaar, sleuf 4 < e <= 6 mm: 20 mm, AANNAME na te
  // kijken in de norm; docs/Berekeningen.md 6b)
  inlaat: { top: -48, dikte: 3, gat: 63.5, tuit: { keel: 62.5, wand: 1.2, R: 6 }, vinger: { rib: 1.6, steek: 7.2, n: 9, h: 23, ringen: [24, 44] } }, // h: van 2 mm in het oog tot 21 mm erboven
  // de ronde kuip onder de romp (PETG, rechtop geprint, de bodem op het bed): binnen Ø183, wand 3; rand tegen de onderkant
  // van de instroomplaat (een celband 6 x 2 dicht af, getekend 1,5 ingedrukt), wand recht tot -110, dan een bolle rand
  // (boog R30 tot 45°, dan 45° naar de bodem: print zonder support), bodem 4 dik op -136. 4 oren op de wandbussen van de
  // romp (M3 x 12 cilinderkop van onderen). Uitblaas: lamellen onder 45° naar onder in 12 sectoren opzij (+-15, 37,5 en 60
  // graden rond de X-as: vooral naar de ladekasten; de buitenste sectoren wijzen schuin naar voor en achter, alles 45°
  // naar onder, zodat de lucht onder de voedingsbox door gaat) en 4 ringsleuven in de bodem.
  // 7.4: lamellen 2,5 mm dik (sleuf 3,5 op steek 6, P2-11); 8 spaken met daarop 8 ribben (stijve bodem, P2-2); de
  // ventilator staat star op 4 bussen Ø12 x 8 op de ribben (M4 x 16 verzonken van onderen, 4 mm in de motor); de aders
  // lopen in een goot in de wand achteraan (hoek -100°) naar de dode ruimte van de romp (P2-5)
  kuip: { binnen: 91.5, wand: 3, rand: -52.5, recht: -110, boog: 30, bodem: -136, vloer: 4,
    oor: { r: [92, 103], b: 10, top: -70, schroef: 98.25, kom: 6.5 },
    lamel: { hoeken: [15, 37.5, 60], breed: 32, rijen: 10, steek: 6, sleuf: 3.5, boven: -57.5 },
    ringen: [[46, 50], [54, 58], [62, 66], [70, 74]], spaken: 8, spaak: 6,
    rib: { r: 84, naaf: 37.5, laag: 7.5, hoog: 15 }, bus: { d: 12, h: 8 },
    goot: { hoek: -100, r: [88, 97.5], b: 10, kanaal: { r: [92.5, 95.5], b: 5 }, onder: -127, boven: -53, uit: [-62, -57], in: [-127, -121] } },
  // rubberbuffer Ø15 x 10 M4 (7.2 en de ronde variant): in 7.4 niet meer gebruikt (dwars en kantelend eigenfrequenties in het
  // werkgebied 13 tot 65 Hz, docs/Berekeningen.md 3d)
  buffer: { d: 15, h: 10, draad: 4 },
  // RVS-persbouten PEM FH4-M3-6 in de plaat (zie logo/rooster.py): wereldcoordinaten [x, z]
  persbouten: [[98.7, 0], [-98.7, 0], [85, 98.7], [-85, -98.7]],
  // Ø8 x 1,5 in een gat van 1,6 diep: 0,9 mm bodem onder de magneet (4 lagen van 0,2 plus marge); gat Ø8,2 voor de lijm
  magneten: { d: 8, h: 1.5, plaats: [[105.75, 30], [105.75, -30], [-105.75, 30], [-105.75, -30]] }, // verzonken in het frame, onder de plaat
  // onder de instroomplaat staat de ruimte op kamerdruk (buiten de luchtweg). 7.4 (P1-1, P1-2): de M8-bus zit verticaal
  // naar onder in een console onderaan de romp, achter links (binnen 210 x 210: de module zakt door de uitsparing); het
  // slangetje gaat door een gat Ø6 in de achterwand; het meetpunt is een messingbuisje in de instroomplaat
  achter: { m8: { x: -60, z: -91.5, console: { x: [-70, -50], z: -82, dik: 3 } }, slang: { x: -78, y: -62, r: 3 }, meet: [-55, -85] },
  // 7.4: haakse M8-kabelstekkers, AANNAME (de gekochte maat is niet gekend): lengte vanaf het paneel 20 tot 32 mm, doorsnede
  // 12 x 12 mm, kabel Ø4,5, buigstraal statisch 5 x Ø; gemodelleerd met de bovengrens
  m8kabel: { lengte: [20, 32], b: 12, kabel: 4.5, buig: 5, l: 300 },
  // wipschakelaar C&K D502J12S215PQA (10 A bij 30 V DC; rand 20,83 x 15; inbouwgat 19,41 x 12,90 voor een paneel van
  // 1,24 tot 2,01 mm) in een kom van 6 mm: de wip ligt 1 mm binnen de wand
  schakelaar: { diep: 6, paneel: 2 },
  // voedingsbox: een bak die 14 mm in een gefreesde uitsparing onderaan het blad zit, met een vlakke rand op de
  // onderkant van het blad (eronder één schuine kant van 45°: print zonder support) en 4 spaanplaatschroeven 4 x 16 verzonken in
  // de onderhuid van het blad; bovenin een los deksel op 4 paaltjes (4 x M3 x 8 verzonken), apart af te nemen.
  // Ventilatie: sleuven in de bodem onder de netadapter (die op twee ribben staat) en bovenaan in de achterwand.
  // Maten t.o.v. de onderkant van het blad (Y = 0) en het midden van de box. Netadapter Mean Well GST90A24-P1M
  // (145 x 60 x 32, C14-inlaat); de C13-stekker zit onder het blad.
  // 7.2: hoeken R10 en onderaan een afschuining van 3 mm (45°): ronder en print zonder support; uitsparing R6 (frees Ø12)
  box: { x: 0, z: -195, b: 210, d: 100, wand: 3, boven: 14, onder: -36, frees: { b: 212, d: 102, diep: 15, r: 6 }, hoek: 10, schuin: 3,
    // rand onder het blad: opzij 5 (7.4: de box is 220 breed op een printbed van 230), voor en achter 12 met de 4 schroeven;
    // 4 spaanplaatschroeven 4 x 16 verzonken in de onderhuid van het blad (voorboren Ø2,5 x 14, 2 mm naast de
    // uitsparing); geen pluggen: de box weegt 0,7 kg (docs/Berekeningen.md, hoofdstuk 6)
    flens: { x: 5, z: 12 }, flensDik: 3, plug: { gat: 2.5, diep: 14, x: 85, z: 57 },
    buis_r: 5.2, deksel: 2, // paaltjes in de hoeken voor het deksel
    // 7.4: de adapter 10 mm naar rechts, zodat de M8-stekker in de linkerwand ernaast past (de C13-stekker gaat 14 mm de box in)
    adapter: { x: [-91, 54], z: [-36, 24], h: 32, voet: 2, inlaat: { z: -6, y: -15 } },
    print: { x: [60, 100], z: [-13.5, 36.5], y: -28 }, // 0,3 mm vrij van het paaltje van het deksel (R5,2 rond [97, 42])
    klem: { x: [-60, -5], b: 9, d: 8 }, // paaltjes en klemmen voor de adapter
    // 7.4: de M8-stekker in de linkerwand (kopse wand)
    m8: { z: 29, y: -21 }, buis: { x: -75, y: -27 }, usb: { z: -29, y: -24.7, b: 20.3, d: 12.7, over: 1.3 }, c3: { z: 10, hoog: 3.5 },
    schakelaar: { x: 70, y: -17 } }, // 7.4: de aan/uit-schakelaar in de achterwand (de achterrand van het bureau, 55 mm)
  // 7.2: freesmal uit MDF 12 mm (laser) voor een bovenfrees met kopieerring Ø17 (Bosch 2 609 200 139) en een frees Ø12:
  // de opening is (17 - 12) / 2 = 2,5 mm groter rondom (schema/maak-mallen.mjs, laser/freesmal-mdf.dxf, tekening AFZ-21)
  mdf: { dikte: 12, ring: 17, frees: 12, plaat: { afzuiging: [400, 400], voedingsbox: [400, 260] } },
  // 7.2: houten latten tussen de huiden van LAGKAPTEN (AANNAME huiden 3 mm, kern 28 mm): rond de uitsparing van de module
  // 4 x 28 x 44 x 212 (vuren, geschaafd), rond die van de box 2 x 10 x 30 x 200 (multiplex of beuken) tegen de onderhuid
  latten: { huid: 3, module: { h: 28, b: 44, l: 212 }, box: { h: 10, b: 30, l: 200 } },
  // sleuf onderaan het blad: box -> knop (USB-C, 5 x 5). 7.4: de sleuf naar de module (29 x 7) vervalt: de M8-kabel en het
  // slangetje lopen vrij onder het blad (de connectoren zitten 21 tot 47 mm onder het blad)
  sleuven: { knop: { z: -30, breed: 5, diep: 5 } },
  // VIEWE-knop 1,5" (UEDX46460015-MD50E, Ø51,6 x 14, naaf achteraan, FPC 10-polig) op een houder die niet breder is
  // dan de knop: plaat Ø51,6 x 2 op het blad, buis Ø43 in een gat van Ø44 (gatzaag), 2 klauwen in PETG (M4) en een
  // dicht deksel onderaan. De USB-C zit in de achterwand van de buis (de kant waar de sleuf van de box aankomt), op een
  // printje (-X7) op 2 palen net boven het deksel. Maten van de knop uit de maattekening van VIEWE.
  dial: { x: 250, z: 200, d: 51.6, hoogte: 14, voet: 2.5, gat: 44, plaat: 2, buis: 21.5, wand: 2, onder: -60, deksel: 2,
    naaf: [[12.2, 4.9], [10.9, 3]], vloer: 2.5, // kom voor de naaf (straal, diepte) en de vloer eronder
    schroeven: [[-2.9, 5.2], [-2.9, -5.2]], pennen: [[2.77, 7.05], [2.77, -7.05]], fpc: { x: -5.9, b: 5.5 },
    klauw: { x: 16.5, naaf: 5.5, arm: 15, breed: 6, dik: 5, top: -10, bodem: -60, moer: { s: 7, m: 3.2, speling: 0.2 }, rubber: { x: [7.5, 13.5], h: 3 } },
    adapter: { x: 1, b: 20, h: 26, top: -12 }, rib: 13, bus: [[13, 13], [-13, -13]], // FPC-adapter 20 x 26
    // USB-C-printje 12 x 15 (zonder gaten): de bus 1 mm voorbij de print; geklemd tussen 2 palen en 2 pennetjes op het deksel
    usb: { voor: -19.4, print: [-18.4, -3.4], b: 12, y: -57, paal: { x: 6, z: -10, r: 1.8 }, pen: { x: 4, z: -8 }, gat: { b: 9.5, y: [-55.7, -51.8] }, zak: { b: 13, h: 8, z: -19.7 } } },
};

const PETG = { name: 'PETG, wit', density: 1270, color: '#f4f4f1' };
const PETG_ZWART = { name: 'PETG, zwart', density: 1270, color: '#232325' };
const RVS430 = { name: 'AISI 430', density: 7700, color: '#c9ccd1' };
const RVS304 = { name: 'AISI 304', density: 8000, color: '#b8bcc2' };
const ZWART = { name: 'PBT, zwart', density: 1300, color: '#2c2c2e' };
// de ventilator: motorhuis aluminium, waaier kunststof UL94 V-0 (datasheet San Ace C175)
const FAN_MAT = { name: 'Alu-motor, waaier UL94 V-0', density: 1300, color: '#2c2c2e' };
const PA_CF = { name: 'PA12-CF, zwart', density: 1100, color: '#2b2b2d' };
const DIAL = { name: 'ABS, grijs', density: 1050, color: '#5a5e66' };
const PCB = { name: 'FR4', density: 1850, color: '#2f7d4a' };

const yv = (id, y, kind = 'face', name) => vlak(id, name ?? (kind === 'face' ? `Face ${id}` : `Plane ${id}`), [0, y, 0], [0, 1, 0], kind);
const assen = () => [M.klauw.x, -M.klauw.x].flatMap((x) => [M.klauw.z, -M.klauw.z].map((z) => [x, z]));
/** rechts ligt de arm ingetrokken naar achteren (-Z), links naar voren: aandraaien met de klok mee zwaait hem uit */
const intrek = (x) => (x > 0 ? -1 : 1);
/** de vier schroeven van de kuip (M3 x 12 cilinderkop van onderen): in een bus midden in elke wand van de romp */
const kuipSchroeven = () => { const w = M.kuip.oor.schroef; return [[w, 0], [-w, 0], [0, w], [0, -w]]; };
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
 *  klauwen in de hoeken en een getrapte richel voor de instroomplaat */
export function romp() {
  const { romp: R, klauw: C, toren: T, inlaat: I, achter: A } = M;
  const o = new Onderdeel('Romp', PETG);
  o.schets(TOP, (s) => s.rrect(-R.b / 2, -R.d / 2, R.b / 2, R.d / 2, R.r));
  o.extrude('boss', -R.onder, { omkeren: true, naam: 'Romp' });
  // luchtkanaal over de volle hoogte, met de torens in de hoeken (ze staan op het bed: geen overhang)
  const xi = R.b / 2 - R.wand, zi = R.d / 2 - R.wand;
  o.schets(yv('boven', 0, 'reference', 'Plane boven'), (s) => s.lusW(kanaalLus().map(([x, z]) => [x, 0, z])));
  o.extrude('cut', -R.onder + 1, { omkeren: true, naam: 'Luchtkanaal' });
  // richel voor de instroomplaat: drie treden van 1 mm (45°: geen support); de plaat ligt erop en wordt rondom gelijmd.
  // Versie 7.2: de richel loopt ook langs de torens (onder de plaat is het buiten de luchtweg: de naad moet overal dicht)
  const yb = I.top - I.dikte;
  [3, 2, 1].forEach((w, i) => {
    o.schets(yv(`inlaatrichel${i}`, yb - i, 'reference', `Plane richel instroomplaat ${i + 1}`), (s) => {
      s.lusW(kanaalLus(-0.5).map(([x, z]) => [x, 0, z])); s.lusW(kanaalLus(w).map(([x, z]) => [x, 0, z]));
    });
    o.extrude('boss', 1, { omkeren: true, naam: `Richel instroomplaat ${i + 1}` });
  });
  // bussen midden in de wanden voor de oren van de kuip (van de onderkant tot 0,5 mm onder de richel); ze staan buiten
  // de luchtweg (onder de instroomplaat, naast de kuip)
  const kb = M.kuip.binnen + M.kuip.wand + 1; // 1 mm vrij van de kuip
  o.schets(yv('onderkant', R.onder, 'reference', 'Plane onderkant'), (s) => kuipSchroeven().forEach(([x, z]) => {
    if (x) s.rrectW([Math.sign(x) * kb, 0, -4.5], [Math.sign(x) * (xi + 0.5), 0, 4.5]);
    else s.rrectW([-4.5, 0, Math.sign(z) * kb], [4.5, 0, Math.sign(z) * (zi + 0.5)]);
  }));
  o.extrude('boss', yb - 3.5 - R.onder, { naam: 'Bussen kuip' });
  // M5 x 70 verzonken (DIN 7991) van bovenaf: de kop zit in het bovenframe, de schacht door de toren en het klauwkanaal.
  // Gat Ø5,4 (7.3, vraag van Ian: "gaan de vijzen niet te veel naar links en rechts bij het aandraaien?"): 9 mm geleiding
  // boven het kanaal en een blind gat onder het kanaal tot 1 mm boven de onderkant, de punt zit er 6,5 mm in
  o.schets(yv('boven', 0, 'reference', 'Plane boven'), (s) => assen().forEach(([x, z]) => s.cirkelW([x, 0, z], 2.7)));
  o.extrude('cut', -M.romp.onder - 1, { omkeren: true, naam: 'Gaten M5' });
  // klauwkanaal: de klauw schuift van het zwaaivenster omhoog tot tegen het blad (bladdikte 10 tot 50 mm)
  o.schets(yv('kanaal', T.top, 'reference', 'Plane top klauwkanaal'), (s) =>
    assen().forEach(([x, z]) => s.rrectW([x - C.naaf - 0.5, 0, z - C.naaf - 0.5], [x + C.naaf + 0.5, 0, z + C.naaf + 0.5])));
  o.extrude('cut', T.top - T.bodem, { omkeren: true, naam: 'Klauwkanalen' });
  assen().forEach(([x, z], i) => zwaaikamer(o, `romp${i}`, { ...C, dik: C.dik + C.rubber.h }, x, z, Math.sign(x) * (R.b / 2 + 1), T.bodem));
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
  // gaten voor de schroeven van de kuip: 7.4 (P3-9) een messing inzetmoer M3 (Ø4,0 x 7, met de soldeerbout ingeperst) en
  // daarboven Ø3,2 voor de punt van de M3 x 12
  o.schets(vlak('onder', 'Face onderkant', [0, R.onder, 0], [0, -1, 0]), (s) => kuipSchroeven().forEach(([x, z]) => s.cirkelW([x, R.onder, z], 1.6)));
  o.extrude('cut', 12, { omkeren: true, naam: 'Gaten kuip' });
  o.schets(vlak('onder', 'Face onderkant', [0, R.onder, 0], [0, -1, 0]), (s) => kuipSchroeven().forEach(([x, z]) => s.cirkelW([x, R.onder, z], 2)));
  o.extrude('cut', 7, { omkeren: true, naam: 'Gaten inzetmoeren' });
  // achterwand, onder de instroomplaat: het gat voor het slangetje van de drukmeting
  o.schets(vlak('achterwand', 'Face achterwand', [0, 0, -R.d / 2], [0, 0, -1]), (s) => s.cirkelW([A.slang.x, A.slang.y, -R.d / 2], A.slang.r));
  o.extrude('cut', R.wand + 1, { omkeren: true, naam: 'Gat slangetje' });
  // 7.4: console onderaan tegen de achterwand (op het bed: geen overhang) met het gat Ø10,2 voor de M8-bus (binder 718,
  // M10 x 0,75), verticaal naar onder; binnen de omtrek van de romp
  const Cn = A.m8.console;
  o.schets(yv('console', R.onder, 'reference', 'Plane onderkant console'), (s) => s.rrectW([Cn.x[0], 0, -(R.d / 2 - R.wand + 0.5)], [Cn.x[1], 0, Cn.z], 1));
  o.extrude('boss', Cn.dik, { naam: 'Console M8' });
  o.schets(yv('consolegat', R.onder + Cn.dik, 'reference', 'Plane bovenkant console'), (s) => s.cirkelW([A.m8.x, 0, A.m8.z], 5.1));
  o.extrude('cut', Cn.dik + 1, { omkeren: true, naam: 'Gat M8' });
  return o.doc();
}

/** het bovenframe: een smalle omranding van 2,5 mm (plat geprint, op de romp gelijmd); de RVS-plaat ligt erop en is
 *  even groot, de magneten zitten verzonken onder de plaat */
export function bovenframe() {
  const o = new Onderdeel('Bovenframe', PETG);
  bovenframeBouw(o);
  return o.doc();
}

/** de features van het bovenframe op onderdeel o */
function bovenframeBouw(o) {
  const { frame: F } = M;
  o.schets(TOP, (s) => { s.rrect(-F.b / 2, -F.d / 2, F.b / 2, F.d / 2, F.r); s.rrect(-F.opening.x, -F.opening.z, F.opening.x, F.opening.z, F.opening.r); });
  o.extrude('boss', F.dikte, { naam: 'Omranding' });
  // lippen boven de vier torens: daarin zit de kop van de M5-schroef (conische zitting, 90°), zodat de schroef het frame
  // over zijn hele vlak op het blad drukt
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
}

/** 7.4 (P2-8, printbed 230 x 230): het bovenframe wordt geprint als 4 latten en op de romp gelijmd (rondom, luchtdicht).
 *  'zij' = de rechterlat (x > 100,4, over de hele diepte, met de lippen van de M5 en de magneten; links is dezelfde lat 180°
 *  gedraaid), 'dwars' = de voorste lat (z > 100,4, tussen de zijlatten; achter is dezelfde lat 180° gedraaid). De sneden
 *  beginnen 0,1 mm in de opening (geen samenvallende vlakken, geen verloren strook). */
export function bovenframeLat(soort = 'zij') {
  const F = M.frame, X = F.opening.x - 0.1, Zd = F.opening.z - 0.1, G = 115, H = F.opening.x - F.opening.r - 0.1; // H: de hoeken (met de afronding van de opening) gaan mee met de zijlat
  const naam = soort === 'zij' ? 'Bovenframe zijlat' : 'Bovenframe dwarslat';
  const b = new Onderdeel(naam, PETG);
  bovenframeBouw(b);
  b.schets(yv('latsnede', F.dikte * 2 + 1, 'reference', 'Plane boven het frame'), (sk) => {
    if (soort === 'zij') {
      const l = M.lip, lx = l.x - 0.1;
      const n = [...assen()].filter(([x]) => x > 0).map(([, z]) => z).sort((p, q) => p - q);
      const pts = [[-G, -G], [H, -G], [H, -H], [X, -H]];
      for (const z of n) pts.push([X, z - l.z - 0.1], [lx, z - l.z - 0.1], [lx, z + l.z + 0.1], [X, z + l.z + 0.1]);
      pts.push([X, H], [H, H], [H, G], [-G, G]);
      sk.lusW(pts.map(([x, z]) => [x, 0, z]));
    } else {
      sk.rrectW([-G, 0, -G], [G, 0, G]);
      sk.rrectW([-H, 0, Zd], [H, 0, G - 1]);
    }
  });
  b.extrude('cut', F.dikte * 2 + 2, { omkeren: true, naam: 'Andere latten weg' });
  return b.doc();
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

/** het interieurfilter MANN CU 20 013 (195 x 145 x 30), in rust op de foamband: een geplooid pakket met smalle
 *  zijstroken; de plooien lopen langs X (vereenvoudigd: groeven van boven en van onder) */
export function interieurfilter() {
  const F = M.filter, y0 = F.steun + F.foam.h, y1 = y0 + F.h;
  const o = new Onderdeel(F.naam, { name: 'Polyester-vlies, wit', density: 120, color: '#ecebe4' });
  o.schets(yv('filteronder', y0, 'reference', 'Plane onderkant filter'), (s) => s.rrect(-F.x, -F.z, F.x, F.z, 2));
  o.extrude('boss', F.h, { naam: 'Pakket' });
  // plooien: om de F.plooi mm een groef van 1,2 breed en 4 diep, afwisselend van boven en van onder, 2 mm van de zijkant
  const n = Math.floor((2 * F.z - 8) / F.plooi);
  const groef = (y, kant) => o.schets(yv(`plooi${kant}`, y, 'reference', `Plane plooien ${kant}`), (s) => {
    for (let i = 0; i < n; i++) {
      const z = -F.z + 4 + (i + (kant === 'boven' ? 0 : 0.5)) * F.plooi;
      s.rrectW([-F.x + 2, 0, z - 0.6], [F.x - 2, 0, z + 0.6]);
    }
  });
  groef(y1, 'boven');
  o.extrude('cut', 4, { omkeren: true, naam: 'Plooien boven' });
  groef(y0, 'onder');
  o.extrude('cut', 4, { naam: 'Plooien onder' });
  return o.doc();
}

/** zachte zelfklevende foamband 6 x 4 (PE- of EPDM-cel) op de steunrand van de instroomplaat, rondom onder de rand van
 *  het filter */
export function foamband() {
  const F = M.filter, xo = F.x + F.speling, zo = F.z + F.speling;
  const o = new Onderdeel('Foamband 6 x 4', { name: 'EPDM-cel, zwart', density: 150, color: '#2a2a2c' });
  o.schets(yv('foam', F.steun, 'reference', 'Plane steunrand'), (s) => { s.rrect(-xo, -zo, xo, zo, 2); s.rrect(-(xo - F.foam.b), -(zo - F.foam.b), xo - F.foam.b, zo - F.foam.b, 1); });
  o.extrude('boss', F.foam.h, { naam: 'Band' });
  return o.doc();
}

/** afdichtlip: zelfklevend siliconenrubber 0,5 mm (Shore A 60) op de geleiderand, 2,5 mm over de rand van het filter.
 *  Getekend zoals hij ligt met het filter erin: plat op de geleiderand en 2,5 mm naar onder geplooid tegen de zijkant
 *  van het filter (0,05 mm getekende speling). Uitgesneden met de snijmal (schema/Snijmal-afdichtlip.pdf). */
export function afdichtlip() {
  const F = M.filter, P = F.lip, xg = F.x + F.speling + F.gids.dik, zg = F.z + F.speling + F.gids.dik;
  const y = F.steun + F.foam.h + F.gids.h, xi = F.x + 0.05, zi = F.z + 0.05;
  const o = new Onderdeel('Afdichtlip', { name: 'Siliconenrubber Shore A 60', density: 1150, color: '#d9534f' });
  o.schets(yv('lip', y, 'reference', 'Plane bovenkant geleiderand'), (s) => { s.rrect(-xg, -zg, xg, zg, 2 + F.gids.dik); s.rrect(-(xi + 0.1), -(zi + 0.1), xi + 0.1, zi + 0.1, 2); });
  o.extrude('boss', P.dik, { naam: 'Lip op de rand' });
  o.schets(yv('plooi', y + P.dik / 2, 'reference', 'Plane plooi'), (s) => { s.rrect(-(xi + P.dik), -(zi + P.dik), xi + P.dik, zi + P.dik, 2 + P.dik); s.rrect(-xi, -zi, xi, zi, 2); });
  o.extrude('boss', P.neer + P.dik / 2, { omkeren: true, naam: 'Lip tegen het filter' });
  return o.doc();
}

/** de punten van het profiel van de kuip (r, y): buitenkant en binnenkant, met de bolle rand (boog tot 45°, dan 45°) */
export function kuipProfiel() {
  const K = M.kuip, Ro = K.binnen + K.wand, C = [Ro - K.boog, K.recht], a = Math.SQRT1_2, ri = K.boog - K.wand, yv0 = K.bodem + K.vloer;
  const pO = [C[0] + K.boog * a, C[1] - K.boog * a], bO = [pO[0] - (pO[1] - K.bodem), K.bodem];
  const pI = [C[0] + ri * a, C[1] - ri * a], bI = [pI[0] - (pI[1] - yv0), yv0];
  return { Ro, C, pO, bO, pI, bI, yv0 };
}

/** de ronde kuip onder de romp (rechtop geprint, de bodem op het bed): een omwenteling van het profiel, 4 oren op de
 *  wandbussen van de romp, lamellen onder 45° opzij (12 sectoren) en 4 ringsleuven in de bodem; in het midden zitten de
 *  de naaf met 8 ribben en 4 bussen voor de ventilator (4 x M4 x 16 verzonken van onderen) en achteraan de goot voor de aders */
export function kuip() {
  const K = M.kuip, O = K.oor, L = K.lamel, Ri = K.binnen;
  const { Ro, C, pO, bO, pI, bI, yv0 } = kuipProfiel();
  const o = new Onderdeel('Ventilatorkuip', PETG);
  let as;
  o.schets(vlak('kuipprofiel', 'Plane profiel kuip', [0, 0, 0], [0, 0, 1], 'reference'), (s) => {
    // de bolle rand als veelhoek van 8 stukjes per boog (de B-rep-kernel draait een profiel met bogen niet goed rond)
    const boog = (r, a0, a1) => Array.from({ length: 9 }, (_, k) => { const t = ((a0 + (a1 - a0) * k / 8) * Math.PI) / 180; return [C[0] + r * Math.cos(t), C[1] + r * Math.sin(t)]; });
    s.lus([[0, K.bodem], bO, ...boog(K.boog, -45, 0), [Ro, K.rand], [Ri, K.rand], ...boog(K.boog - K.wand, 0, -45), bI, [0, yv0]]);
    as = s.as(0, K.bodem - 10, 0, K.rand + 10);
  });
  o.revolve('boss', as, 360, { naam: 'Kuip' });
  // 4 oren: een console onder 45° (print zonder support), bovenaan vlak tegen de bus van de romp
  kuipSchroeven().forEach(([x, z], i) => {
    const kx = Math.sign(x), kz = Math.sign(z), dx = kx || 0, dz = kz || 0;
    const p = (r, y, t) => (dx ? [dx * r, y, t] : [t, y, dz * r]);
    const pl = dx ? vlak(`oor${i}`, `Plane oor ${i + 1}`, [0, 0, -O.b / 2], [0, 0, 1], 'reference') : vlak(`oor${i}`, `Plane oor ${i + 1}`, [-O.b / 2, 0, 0], [1, 0, 0], 'reference');
    o.schets(pl, (s) => s.lusW([p(O.r[0], O.top, -O.b / 2), p(O.r[1], O.top, -O.b / 2), p(O.r[0], O.top - (O.r[1] - O.r[0]), -O.b / 2)]));
    o.extrude('boss', O.b, { naam: `Oor ${i + 1}` });
  });
  // kom voor de kop (Ø6,5, van onderen tot 4 mm onder de bovenkant van het oor) en het gat M3
  o.schets(yv('oorkom', O.top - 11, 'reference', 'Plane kom oren'), (s) => kuipSchroeven().forEach(([x, z]) => s.cirkelW([x, 0, z], O.kom / 2)));
  o.extrude('cut', 7, { naam: 'Kom kop M3' });
  o.schets(yv('oorgat', O.top - 4.5, 'reference', 'Plane gat oren'), (s) => kuipSchroeven().forEach(([x, z]) => s.cirkelW([x, 0, z], 1.7)));
  o.extrude('cut', 5, { naam: 'Gat M3' });
  // lamellen: per sector een snede loodrecht op de straal, banden van 4 mm (verticaal) onder 45° naar buiten-onder
  const hoeken = [...L.hoeken, ...L.hoeken.map((h) => -h)].flatMap((h) => [h, 180 + h]);
  hoeken.forEach((h, i) => {
    const a = (h * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a);
    const pl = { id: `lamel${i}`, name: `Plane lamellen ${i + 1}`, origin: [0, 0, 0], u: [c, 0, sn], v: [0, 1, 0], n: [-sn, 0, c], kind: 'reference' };
    o.schets(pl, (s) => {
      for (let k = 0; k < L.rijen; k++) {
        const y0 = L.boven - k * L.steek + 9; // de bovenkant van de band op r = 84 (op de wand, r = 93: L.boven - k * steek)
        s.lus([[84, y0], [100, y0 - 16], [100, y0 - 16 - L.sleuf], [84, y0 - L.sleuf]]);
      }
    });
    o.extrude('cut', L.breed / 2, { terug: L.breed / 2, naam: `Lamellen ${i + 1}` });
  });
  // bodem: 4 ringsleuven met 6 spaken, het gat voor de aders, de verzinkingen en gaten M4 van de buffers
  const bodemR = vlak('kuipbodem', 'Plane onder de bodem', [0, K.bodem - 0.5, 0], [0, 1, 0], 'reference');
  o.schets(bodemR, (s) => {
    for (const [r1, r2] of K.ringen) {
      for (let k = 0; k < K.spaken; k++) {
        const t0 = (k * 2 * Math.PI) / K.spaken, t1 = ((k + 1) * 2 * Math.PI) / K.spaken;
        const d = (r) => K.spaak / 2 / r, P = (r, t) => [r * Math.cos(t), r * Math.sin(t)];
        // bogen als veelhoek (16 stukjes): de B-rep-kernel snijdt een lus met bogen hier niet volledig
        const boog = (r, a0, a1) => Array.from({ length: 17 }, (_, j) => P(r, a0 + ((a1 - a0) * j) / 16));
        s.lusW([...boog(r2, t0 + d(r2), t1 - d(r2)), ...boog(r1, t1 - d(r1), t0 + d(r1))].map(([x, z]) => [x, 0, z]));
      }
    }
  });
  o.extrude('cut', K.vloer + 1, { naam: 'Ringsleuven' });
  // 7.4 (P2-2): een massieve naaf onder de motor (r 37,5, tot 0,5 mm onder de motor) en 8 ribben op de spaken onder de
  // waaier (1,5 mm vrij), tot in de bolle rand: een stijve bodem, de ventilator staat er star op (4 bussen Ø12 op de naaf).
  // In de naaf een groef 6 x 4 voor de aders, naar de goot achteraan
  const Rb = K.rib, ribLus = (r0, r1, k) => {
    const a = (k * 2 * Math.PI) / K.spaken, c = Math.cos(a), sn = Math.sin(a), w = K.spaak / 2 - 0.1; // 0,1 mm smaller dan de spaak
    return [[r0, -w], [r1, -w], [r1, w], [r0, w]].map(([r, t]) => [r * c - t * sn, 0, r * sn + t * c]);
  };
  o.schets(yv('naaf', yv0 - 0.05, 'reference', 'Plane naaf'), (s) => s.cirkel(0, 0, Rb.naaf));
  o.extrude('boss', Rb.laag + 0.05, { naam: 'Naaf' });
  o.schets(yv('ribben', yv0 - 0.05, 'reference', 'Plane ribben'), (s) => { for (let k = 0; k < K.spaken; k++) s.lusW(ribLus(Rb.naaf - 0.5, Rb.r, k)); });
  o.extrude('boss', Rb.hoog + 0.05, { naam: 'Ribben' });
  o.schets(yv('bussen', yv0 - 0.05, 'reference', 'Plane bussen'), (s) => fanGaten().forEach(([x, z]) => s.cirkelW([x, 0, z], K.bus.d / 2)));
  o.extrude('boss', K.bus.h + 0.05, { naam: 'Bussen ventilator' });
  const onderR = vlak('kuiponderR', 'Plane onderkant kuip', [0, K.bodem, 0], [0, -1, 0], 'reference');
  o.schets(onderR, (s) => fanGaten().forEach(([x, z]) => s.cirkelW([x, K.bodem, z], 4.1)));
  o.extrude('cut', 2, { omkeren: true, naam: 'Verzinking M4', draft: 45 });
  o.schets(yv('kuipgat', yv0 + K.bus.h + 0.5, 'reference', 'Plane gaten M4'), (s) => fanGaten().forEach(([x, z]) => s.cirkelW([x, 0, z], 2.2)));
  o.extrude('cut', K.bus.h + K.vloer + 1, { omkeren: true, naam: 'Gaten M4' });
  {
    const ga0 = (K.goot.hoek * Math.PI) / 180, c0 = Math.cos(ga0), s0 = Math.sin(ga0), q = (r, t) => [r * c0 - t * s0, 0, r * s0 + t * c0];
    o.schets(yv('groef', yv0 + Rb.laag + 0.5, 'reference', 'Plane groef naaf'), (s) => s.lusW([q(-2, -3), q(Rb.naaf + 1, -3), q(Rb.naaf + 1, 3), q(-2, 3)]));
    o.extrude('cut', 4.5, { omkeren: true, naam: 'Groef aders' });
  }
  // 7.4 (P2-5): goot voor de aders in de wand achteraan (hoek -100°, de dichte wand tussen de lamellen): een kolom van het
  // bed tot onder de rand, met binnenin een kanaal 5 x 3; onderaan (onder de waaier) een opening naar binnen, bovenaan (in de
  // dode ruimte van de romp) een opening naar buiten, dicht te zetten met kit
  const Gt = K.goot, ga = (Gt.hoek * Math.PI) / 180, gc = Math.cos(ga), gs = Math.sin(ga);
  const gp = (r, t) => [r * gc - t * gs, 0, r * gs + t * gc];
  const blok = (r0, r1, b) => [gp(r0, -b / 2), gp(r1, -b / 2), gp(r1, b / 2), gp(r0, b / 2)];
  o.schets(yv('gootvoet', K.bodem, 'reference', 'Plane voet goot'), (s) => s.lusW(blok(Gt.r[0], Gt.r[1], Gt.b)));
  o.extrude('boss', Gt.boven - K.bodem, { naam: 'Goot aders' });
  // het kanaal begint 1 mm onder de bovenkant van de kolom (dicht dak) en loopt tot onder de waaier
  o.schets(yv('gootkanaal', Gt.boven - 1, 'reference', 'Plane kanaal goot'), (s) => s.lusW(blok(Gt.kanaal.r[0], Gt.kanaal.r[1], Gt.kanaal.b)));
  o.extrude('cut', Gt.boven - 1 - Gt.onder, { omkeren: true, naam: 'Kanaal aders' });
  const radiaal = (id, naam, r0, r1, y0, y1) => {
    o.schets(yv(id, y1, 'reference', `Plane ${naam}`), (s) => s.lusW(blok(r0, r1, Gt.kanaal.b)));
    o.extrude('cut', y1 - y0, { omkeren: true, naam });
  };
  radiaal('gootin', 'Opening goot binnen', Gt.r[0] - 4, Gt.kanaal.r[0] + 0.5, Gt.in[0], Gt.in[1]);
  radiaal('gootuit', 'Opening goot buiten', Gt.kanaal.r[1] - 0.5, Gt.r[1] + 1, Gt.uit[0], Gt.uit[1]);
  return o.doc();
}

/** zelfklevende celband 6 x 2 (EPDM of neopreen) midden op de rand van de kuip (3 mm wand: 1,5 mm steekt aan elke kant
 *  uit; getekend 1,5 mm ingedrukt): dicht de kuip af tegen de onderkant van de instroomplaat */
export function kuipdichting() {
  const K = M.kuip, rm = K.binnen + K.wand / 2;
  const o = new Onderdeel('Kuipdichting', { name: 'EPDM-cel, zwart', density: 150, color: '#2a2a2c' });
  o.schets(yv('kuiprand', K.rand, 'reference', 'Plane rand kuip'), (s) => { s.cirkel(0, 0, rm + 3); s.cirkel(0, 0, rm - 3); });
  o.extrude('boss', M.inlaat.top - M.inlaat.dikte - K.rand, { naam: 'Band' });
  return o.doc();
}

/** rubberbuffer Ø15 x 10, M4 binnendraad aan beide kanten (Halder EH 25150.0008); oorsprong onder in het midden */
export function rubberbuffer() {
  const B = M.buffer;
  const o = new Onderdeel('Rubberbuffer Ø15 x 10 M4', { name: 'NR 55 Shore A', density: 1100, color: '#202022' });
  o.schets(TOP, (s) => s.cirkel(0, 0, B.d / 2));
  o.extrude('boss', B.h, { naam: 'Buffer' });
  o.schets(yv('buffertop', B.h, 'reference', 'Plane bovenkant buffer'), (s) => s.cirkel(0, 0, 1.75));
  o.extrude('cut', B.draad + 0.2, { omkeren: true, naam: 'Draad boven' });
  o.schets(vlak('bufferonder', 'Plane onderkant buffer', [0, 0, 0], [0, -1, 0], 'reference'), (s) => s.cirkel(0, 0, 1.75));
  o.extrude('cut', B.draad + 0.2, { omkeren: true, naam: 'Draad onder' });
  return o.doc();
}

/** RVS-persbout PEM FH4-M3-6 (vereenvoudigd): de kop vult het gat Ø3 in de plaat (vlak met de bovenkant), de bout steekt
 *  6 mm uit de onderkant; oorsprong op de onderkant van de plaat */
export function persbout() {
  const o = new Onderdeel('Persbout PEM FH4-M3-6', { name: 'RVS 400-reeks', density: 7700, color: '#c9ccd1' });
  o.schets(TOP, (s) => s.cirkel(0, 0, 1.48));
  o.extrude('boss', 1.5, { naam: 'Kop' });
  o.schets(TOP, (s) => s.cirkel(0, 0, 1.3));
  o.extrude('boss', 6, { omkeren: true, terug: 0.5, naam: 'Bout' });
  return o.doc();
}

/** de instroomplaat (plat geprint, 3 mm): ligt op de getrapte richel in de romp en tussen de torens, gelijmd; een
 *  verzonken zitting voor de instroomtuit, het messingbuisje van de drukmeting, en bovenop de steunrand voor het
 *  filter (6 mm breed, de foamband erop) met daarbuiten een geleiderand (1 mm speling rond het filter) */
export function instroomplaat() {
  const { inlaat: I, achter: A, filter: F } = M;
  const o = new Onderdeel('Instroomplaat', PETG);
  const yb = I.top - I.dikte;
  o.schets(yv('plaatonder', yb, 'reference', 'Plane onderkant instroomplaat'), (s) => s.lusW(kanaalLus(0.3).map(([x, z]) => [x, 0, z])));
  o.extrude('boss', I.dikte, { naam: 'Plaat' });
  const xo = F.x + F.speling, zo = F.z + F.speling, xg = xo + F.gids.dik, zg = zo + F.gids.dik;
  // de steunrand loopt 0,5 mm in de geleiderand (overlap: geen samenvallende zijvlakken, dat maakt de mesh-kernel traag)
  o.schets(yv('plaattop', I.top), (s) => { s.rrect(-(xo + 0.5), -(zo + 0.5), xo + 0.5, zo + 0.5, 2.5); s.rrect(-(xo - F.foam.b), -(zo - F.foam.b), xo - F.foam.b, zo - F.foam.b, 1); });
  o.extrude('boss', F.steun - I.top, { terug: 0.5, naam: 'Steunrand filter' });
  o.schets(yv('plaattop', I.top), (s) => { s.rrect(-xg, -zg, xg, zg, 2 + F.gids.dik); s.rrect(-xo, -zo, xo, zo, 2); });
  o.extrude('boss', F.steun + F.foam.h + F.gids.h - I.top, { terug: 0.5, naam: 'Geleiderand filter' });
  // 7.4 (P1-3): een verzonken gat (45°) waarin de losse instroomtuit zit (gelijmd, MMA); het messingbuisje
  o.schets(yv('boven', I.top + 0.5, 'reference', 'Plane boven de plaat'), (s) => s.cirkelW([A.meet[0], 0, A.meet[1]], 1.55));
  o.extrude('cut', I.dikte + 1.5, { omkeren: true, naam: 'Gat buisje' });
  o.schets(yv('tuitzitting', I.top, 'reference', 'Plane bovenkant plaat'), (s) => s.cirkel(0, 0, tuitMaten().kraag));
  o.extrude('cut', I.dikte + 0.5, { omkeren: true, naam: 'Zitting instroomtuit', draft: 45 });
  return o.doc();
}

/** de maten van de instroomtuit (versie 7.4): keel, buitenkant van de wand, de kraag (45°) die in de verzonken zitting van
 *  de instroomplaat ligt, en de afronding */
export function tuitMaten() {
  const I = M.inlaat, T = I.tuit, onder = M.fan.top - 2, buiten = T.keel + T.wand;
  const kegel = onder + 1.5; // vanaf hier loopt de buitenkant onder 45° naar buiten (print zonder support)
  return { onder, buiten, kegel, kraag: buiten + (I.top - kegel), R: T.R, keel: T.keel, top: I.top };
}

/** het profiel (r, y) van de instroomtuit: binnen recht vanaf de keel, dan een afronding R tot de bovenkant van de plaat;
 *  buiten recht en dan 45° naar buiten tot de kraag (ligt in de verzonken zitting van de instroomplaat) */
export function tuitProfiel() {
  const t = tuitMaten(), c = [t.keel + t.R, t.top - t.R];
  // de boog van (keel, top - R) tot (keel + R, top), middelpunt (keel + R, top - R)
  const boog = Array.from({ length: 13 }, (_, k) => { const a = (Math.PI / 2) * (1 - k / 12); return [c[0] - t.R * Math.cos(Math.PI / 2 - a), c[1] + t.R * Math.sin(Math.PI / 2 - a)]; });
  return [[t.keel, t.onder], ...boog.map(([r, y]) => [r, y]), [t.kraag, t.top], [t.buiten, t.kegel], [t.buiten, t.onder]];
}

/** 7.4 (P1-3): de instroomtuit, los geprint (de keel op het bed: de afronding en de kraag van 45° printen zonder support)
 *  en in de verzonken zitting van de instroomplaat gelijmd. Vorm van de Sanyo-nozzle 109-1073 (waarmee de curve gemeten
 *  is): keel Ø125, afronding R6 (plaats: 9 mm van de plaat tot 2 mm in het oog), 2 mm in het oog Ø131. Binnenin het
 *  vingerrooster: 18 ribben 1,6 mm (steek 7,2, spleten 5,6) langs Z, één dwarsrib langs X en twee ringen (r 24 en 44),
 *  van de onderkant van de keel tot 21 mm boven de waaier (EN ISO 13857 tabel 5, AANNAME). Oorsprong zoals de module. */
export function instroomtuit() {
  const { inlaat: I } = M, t = tuitMaten();
  const o = new Onderdeel('Instroomtuit', PETG);
  let as;
  o.schets(vlak('tuitprofiel', 'Plane profiel tuit', [0, 0, 0], [0, 0, 1], 'reference'), (s) => {
    s.lus(tuitProfiel());
    as = s.as(0, t.onder - 10, 0, t.top + 10);
  });
  o.revolve('boss', as, 360, { naam: 'Tuit' });
  const V = I.vinger, R0 = t.keel + 0.5, y0 = t.onder + 0.05, h = M.fan.top + 21 - y0;
  o.schets(yv('ribben', y0, 'reference', 'Plane ribben'), (s) => {
    for (let k = -V.n; k < V.n; k++) {
      const x = (k + 0.5) * V.steek, zl = Math.sqrt(R0 * R0 - (Math.abs(x) + V.rib / 2) ** 2);
      s.rrectW([x - V.rib / 2, 0, -zl], [x + V.rib / 2, 0, zl]);
    }
  });
  o.extrude('boss', h, { naam: 'Vingerrooster ribben' });
  o.schets(yv('dwarsrib', y0 + 0.05, 'reference', 'Plane dwarsrib'), (s) => s.rrectW([-R0, 0, -V.rib / 2], [R0, 0, V.rib / 2]));
  o.extrude('boss', h - 0.1, { naam: 'Vingerrooster dwarsrib' });
  o.schets(yv('ringen', y0 + 0.1, 'reference', 'Plane ringen'), (s) => V.ringen.forEach((r) => { s.cirkel(0, 0, r + V.rib / 2); s.cirkel(0, 0, r - V.rib / 2); }));
  o.extrude('boss', h - 0.2, { naam: 'Vingerrooster ringen' });
  return o.doc();
}

/** San Ace C175 9TG24P0S01 (vereenvoudigd): waaier Ø175 x 60,5 met het instroomoog Ø131 bovenaan, de motor onderaan
 *  (Ø72) met 4 draadgaten M4 op Ø58 */
export function ventilator() {
  const { fan: V } = M;
  const o = new Onderdeel('San Ace C175 9TG24P0S01', FAN_MAT);
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

/** een vlak door `origin` met normaal `n` en u loodrecht erop (voor vlakken langs een willekeurige as) */
function vlakN(id, name, origin, n, u) {
  const v = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]];
  return { id, name, origin, u, v, n, kind: 'reference' };
}
/** twee eenheidsvectoren loodrecht op een as langs X, Y of Z: [e1, e2] (bij een as langs X: e1 = Y, e2 = Z) */
const loodrecht = (a) => (Math.abs(a[0]) > 0.5 ? [[0, 1, 0], [0, 0, 1]] : Math.abs(a[1]) > 0.5 ? [[1, 0, 0], [0, 0, 1]] : [[1, 0, 0], [0, 1, 0]]);

/** M8-inbouwconnector 4-polig, binder 718 voor achterwandmontage: binnen een zeskantflens SW12 en het huis met 4
 *  soldeerbekers, door de wand de schroefdraad M10 x 0,75, buiten de moer SW10 en de koppeling M8 x 1.
 *  c = punt op de as aan de binnenkant van de wand, a = richting naar buiten (langs X, Y of Z), wand = dikte,
 *  bus = true: bus (koppeling met gaatjes), anders stekker (koppeling met pennen in een kraag) */
export function m8connector(naam, c, a, wand, bus) {
  const o = new Onderdeel(naam, { name: 'Messing vernikkeld', density: 8500, color: '#b9bcc0' });
  const [e1, e2] = loodrecht(a);
  const at = (t, p = 0, q = 0) => [0, 1, 2].map((i) => c[i] + a[i] * t + e1[i] * p + e2[i] * q);
  const vl = (t, id, inw) => vlakN(`m8${id}`, `Plane ${id}`, at(t), inw ? a.map((x) => -x || 0) : a, e1);
  const zesW = (sw, t) => zeskant(sw).map(([p, q]) => at(t, p, q));
  const bekers = [[-1.7, -0.98], [1.7, -0.98], [-1.7, 0.98], [1.7, 0.98]];
  // binnen: flens SW12 (2 mm) en het huis Ø9 x 5 met 4 soldeerbekers
  o.schets(vl(-0.1, 'flens', true), (s) => s.lusW(zesW(12, -0.1)));
  o.extrude('boss', 2, { naam: 'Flens SW12' });
  o.schets(vl(-2, 'huis', true), (s) => s.cirkelW(at(-2), 4.5));
  o.extrude('boss', 5, { terug: 0.2, naam: 'Huis' });
  o.schets(vl(-7, 'bekers', true), (s) => bekers.forEach(([p, q]) => s.cirkelW(at(-7, p, q), 0.65)));
  o.extrude('boss', 3, { terug: 0.2, naam: 'Soldeerbekers' });
  // door de wand: M10 x 0,75 (kern Ø9,9)
  o.schets(vl(-0.2, 'draad'), (s) => s.cirkelW(at(-0.2), 4.95));
  o.extrude('boss', wand + 0.3, { naam: 'Schroefdraad M10' });
  // buiten: moer SW10 (3 mm) en de koppeling M8 x 1 (8 mm)
  const tb = wand + 0.1;
  o.schets(vl(tb, 'moer'), (s) => s.lusW(zesW(10, tb)));
  o.extrude('boss', 3, { naam: 'Moer SW10' });
  o.schets(vl(tb + 3, 'koppeling'), (s) => s.cirkelW(at(tb + 3), 4));
  o.extrude('boss', 8, { terug: 0.2, naam: 'Koppeling M8' });
  o.schets(vl(tb + 11, 'front'), (s) => {
    if (bus) bekers.forEach(([p, q]) => s.cirkelW(at(tb + 11, p, q), 0.45));
    else s.cirkelW(at(tb + 11), 3);
  });
  o.extrude('cut', bus ? 4 : 5, { omkeren: true, naam: bus ? 'Contactgaten' : 'Kraag' });
  if (!bus) {
    o.schets(vl(tb + 6, 'pennen'), (s) => bekers.forEach(([p, q]) => s.cirkelW(at(tb + 6, p, q), 0.5)));
    o.extrude('boss', 4.5, { terug: 0.2, naam: 'Pennen' });
  }
  return o.doc();
}

/** 7.4: M8-inbouwbus 4-polig van de module (binder 718, M10 x 0,75), verticaal naar onder in de console onderaan de romp */
export function m8bus() {
  return m8connector('M8-inbouwbus 4-polig', m8busAs(), [0, -1, 0], M.achter.m8.console.dik, true);
}
/** de as van de M8-bus aan de bovenkant van de console */
export const m8busAs = () => [M.achter.m8.x, M.romp.onder + M.achter.m8.console.dik, M.achter.m8.z];

/** 7.4 (P1-1): de haakse M8-kabel (stekker - bus, 0,3 m) tussen de box en de module, met beide kabelstekkers, in het
 *  assenstelsel van de module (blad = dikte; de box hangt onder het blad). Gemodelleerd met de grootste AANNAME van
 *  M.m8kabel (32 mm vanaf het paneel, 12 x 12): elke stekker is een moerbus rond de koppeling en een blok; de kabel (Ø4,5)
 *  loopt van de stekker van de box naar onder en dan schuin naar de stekker van de module (de rest van de 0,3 m als lus
 *  onder het blad, met een kabelbinder). Eén body: de stukken overlappen. */
export function m8kabel(blad = M.blad) {
  const K = M.m8kabel, L = K.lengte[1], h = K.b / 2, rk = K.kabel / 2;
  const o = new Onderdeel('M8-kabel haaks 0,3 m', { name: 'PUR, zwart (stekkers PA)', density: 1300, color: '#26282b' });
  const stekker = (id, c, a, wand, paneel) => {
    // c = as aan de binnenkant van de wand, a = naar buiten; paneel = afstand van c tot de buitenkant van het paneel
    const [e1, e2] = loodrecht(a);
    const at = (t, p = 0, q = 0) => [0, 1, 2].map((i) => c[i] + a[i] * t + e1[i] * p + e2[i] * q);
    const tb = wand + 0.1;
    o.schets(vlakN(`${id}buis`, `Plane moerbus ${id}`, at(tb + 3), a, e1), (s) => { s.cirkelW(at(tb + 3), 5.5); s.cirkelW(at(tb + 3), 4.05); });
    o.extrude('boss', 8.5, { naam: `Moerbus ${id}` });
    o.schets(vlakN(`${id}blok`, `Plane blok ${id}`, at(tb + 11), a, e1), (s) => s.lusW([[-h, -h], [h, -h], [h, h], [-h, h]].map(([p, q]) => at(tb + 11, p, q))));
    o.extrude('boss', paneel + L - (tb + 11), { naam: `Stekker ${id}` });
  };
  const B = M.box, bo = [B.x, -blad, B.z];
  const cm = m8busAs(), cb = m8stekkerAs().map((v, i) => v + bo[i]);
  stekker('module', cm, [0, -1, 0], M.achter.m8.console.dik, M.achter.m8.console.dik);
  stekker('box', cb, [-1, 0, 0], B.wand, B.wand);
  // kabel: uit de onderkant van de stekker van de box naar onder, dan schuin naar de achterkant van de stekker van de module
  const xb = cb[0] - B.wand - L + h, A0 = [xb, cb[1] - h + 3, cb[2]], A1 = [xb, cm[1] - 29, cb[2]], A2 = [cm[0], cm[1] - 29, cm[2] - h + 3];
  const stuk = (id, p, q) => {
    const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], l = Math.hypot(...d), n = d.map((x) => x / l);
    const u = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const uu = (() => { const k = u[0] * n[0] + u[1] * n[1] + u[2] * n[2]; const w = u.map((x, i) => x - k * n[i]); const m = Math.hypot(...w); return w.map((x) => x / m); })();
    o.schets(vlakN(`kabel${id}`, `Plane kabel ${id}`, p, n, uu), (s) => s.cirkelW(p, rk));
    o.extrude('boss', l + rk, { terug: rk, naam: `Kabel ${id}` });
  };
  stuk('1', A0, A1);
  stuk('2', A1, A2);
  return o.doc();
}

/** 7.4 (P1-1): de ruimte (mm) die elke haakse kabelstekker heeft, vanaf het paneel langs de as tot het eerste obstakel,
 *  en de vrije afstand tussen de twee koppelingen als ze recht tegenover elkaar staan (7.3). De test vergelijkt dat met
 *  de lengte van de stekker (AANNAME 20 tot 32 mm). */
export function m8Ruimte() {
  const R = M.romp, Kp = M.kuip, B = M.box;
  return {
    // module: van de onderkant van de console naar onder, tot de bodem van de kuip (laagste punt van de module)
    module: (R.onder) - Kp.bodem,
    // box: van de linkerwand naar links, tot de ALEX-kast (bureau: x = -340; de box staat in het midden)
    box: 340 - (B.x + B.b / 2),
    // 7.3: de bus in de achterwand van de romp (z = -105) en de stekker in de voorwand van de box (z = -145), op één lijn;
    // beide koppelingen steken 11 mm uit: dit bleef er over voor twee stekkers
    oud: (-R.d / 2) - (B.z + B.d / 2) - 2 * 11.1,
  };
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

/** rubberkussen op de arm van de klauw (neopreen Shore A 40, 4 mm, met secondelijm), buiten de romp onder het blad; oorsprong
 *  zoals de klauw (schroefas, onderkant van de klauw) */
export function klauwrubber(C = M.klauw, naam = 'Klauwrubber') {
  const w = C.breed / 2;
  const o = new Onderdeel(naam, { name: 'Neopreen (CR) Shore A 40', density: 1230, color: '#3a3a3c' });
  o.schets(yv('arm', C.dik, 'reference', 'Plane bovenkant arm'), (s) => s.rrectW([C.rubber.x[0], 0, -w], [C.rubber.x[1], 0, w], 1));
  o.extrude('boss', C.rubber.h, { naam: 'Kussen' });
  return o.doc();
}

/** houder voor de VIEWE-knop (zwart PETG, ondersteboven geprint, de plaat op het bed): plaat Ø51,6 onder de knop
 *  (even groot, van boven zie je alleen de knop), buis door het gat van Ø44, kom voor de naaf met de 2 schroefgaten
 *  M2,5 en de 2 pennen, een sleuf voor de FPC; twee klauwen in PETG (M4 x 65 verzonken van bovenaf, de koppen onder de
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
  // Ø4,3 over 12 mm: de M4 staat recht, ook bij het eerste aandraaien (7.3)
  o.schets(yv('plaattop', D.plaat, 'reference', 'Plane plaattop'), (s) => as.forEach(([x, z]) => s.cirkelW([x, 0, z], 2.15)));
  o.extrude('cut', D.plaat - C.top + 1, { omkeren: true, naam: 'Gaten M4' });
  o.schets(yv('dkanaal', C.top, 'reference', 'Plane top klauwkanaal'), (s) => as.forEach(([x, z]) => s.rrectW([x - C.naaf - 0.5, 0, z - C.naaf - 0.5], [x + C.naaf + 0.5, 0, z + C.naaf + 0.5])));
  o.extrude('cut', C.top - C.bodem, { omkeren: true, naam: 'Klauwkanalen' });
  // ingetrokken ligt de arm onderaan langs de buis (de klauw schuift er van onderen in)
  as.forEach(([x, z], i) => zwaaikamer(o, `knop${i}`, { ...C, dik: C.dik + C.rubber.h }, x, z, Math.sign(x) * (R + 1.5), C.bodem));
  for (const kant of [1, -1]) {
    const pl = vlak(kant > 0 ? 'dwandR' : 'dwandL', kant > 0 ? 'Plane wand rechts' : 'Plane wand links', [kant * (R + 1), 0, 0], [kant, 0, 0], 'reference');
    o.schets(pl, (s) => {
      const z = 0, d = intrek(kant), b = C.breed / 2 + 0.5, a = z + d * (C.arm + 0.5), c = z - d * (C.naaf + 1);
      const lo = Math.min(a, c), hi = Math.max(a, c), y0 = C.bodem - 0.5, yw = C.bodem + C.dik + C.rubber.h + 6, y1 = C.top;
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
    [1, -1].forEach((k) => s.cirkelW([k * D.klauw.x, y0, 0], 2.2)); // de punten van de M4 x 65 in een gat Ø4,4: geleiding onderaan (7.3)
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

/** adapterprint in de knophouder (-X11): FPC-bus 10-polig 0,5 mm bovenaan, onderaan 4 draden naar het USB-C-printje
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

/** 7.4 (P3-17): neodymiummagneet Ø8 x 1,5 (N42); oorsprong onder in het midden */
export function magneet() {
  const o = new Onderdeel('Neodymiummagneet Ø8 x 1,5', { name: 'NdFeB N42, vernikkeld', density: 7500, color: '#b0b3b8' });
  o.schets(TOP, (s) => s.cirkel(0, 0, M.magneten.d / 2));
  o.extrude('boss', M.magneten.h, { naam: 'Magneet' });
  return o.doc();
}

/** 7.4 (P3-9): messing inzetmoer M3 (warm ingeperst, Ø4,0 x 5,7, bv. Ruthex RX-M3x5.7); oorsprong onder, langs +Y */
export function inzetmoer() {
  const o = new Onderdeel('Inzetmoer M3 x 5,7 messing', { name: 'Messing', density: 8500, color: '#c9a64b' });
  o.schets(TOP, (s) => { s.cirkel(0, 0, 2); s.cirkel(0, 0, 1.25); });
  o.extrude('boss', 5.7, { naam: 'Inzetmoer' });
  return o.doc();
}

/** stift (draadeind, vereenvoudigd tot de kerndiameter); oorsprong bovenaan, langs -Y */
export function stift(naam, d, L) {
  const o = new Onderdeel(naam, { name: 'Staal A2', density: 7900, color: '#8d939a' });
  o.schets(TOP, (s) => s.cirkel(0, 0, d / 2));
  o.extrude('boss', L, { omkeren: true, naam: 'Stift' });
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
  // 7.2: hoeken R10 en onderaan een afschuining van 3 mm onder 45° (ronder; de afschuining print zonder support)
  o.schets(yv('boxtop', B.boven, 'reference', 'Plane bovenkant box'), (s) => s.rrect(-bx, -bz, bx, bz, B.hoek));
  o.extrude('boss', B.boven - B.onder - B.schuin, { omkeren: true, naam: 'Kuip' });
  o.schets(yv('boxschuin', B.onder + B.schuin, 'reference', 'Plane afschuining box'), (s) => s.rrect(-bx, -bz, bx, bz, B.hoek));
  o.extrude('boss', B.schuin, { omkeren: true, naam: 'Afschuining onder', draft: 45 });
  // rand op de onderkant van het blad, eronder één schuine kant van 45° tot tegen de kuip (print zonder support)
  const fx = bx + B.flens.x, fz = bz + B.flens.z;
  // hoeken R12,5: de schuine kant krimpt 11,9 mm in, de afronding blijft dan positief (R0,6)
  o.schets(yv('rand', 0, 'reference', 'Plane onderkant blad'), (s) => s.rrect(-fx, -fz, fx, fz, 12.5));
  o.extrude('boss', B.flensDik, { omkeren: true, naam: 'Rand' });
  o.schets(yv('schuin', -B.flensDik + 0.1, 'reference', 'Plane onder de rand'), (s) => s.rrect(-fx, -fz, fx, fz, 12.5));
  o.extrude('boss', B.flens.z - 0.1, { omkeren: true, naam: 'Schuine kant', draft: 45 });
  // uitsparingen in de schuine kant voor de C13 (links) en de schakelaar (achter, 7.4): de rand loopt daar als korte
  // brug (hooguit 38 mm); 0,5 mm schuine kant blijft tegen de wand, de openingen snijden er van buiten doorheen. De M8 in
  // de linkerwand zit onder de schuine kant (die stopt 8 mm onder het blad)
  {
    const Ai = B.adapter.inlaat, Sw = B.schakelaar, yo = -B.flensDik;
    o.schets(yv('uitsparing', yo, 'reference', 'Plane onder de rand'), (s) => {
      s.rrectW([-fx - 1, 0, Ai.z - 19], [-bx - 0.5, 0, Ai.z + 19]);
      s.rrectW([Sw.x - 15, 0, -fz - 1], [Sw.x + 15, 0, -bz - 0.5]);
    });
    o.extrude('cut', B.flens.z + 1, { omkeren: true, naam: 'Uitsparingen schuine kant' });
  }
  o.schets(yv('boxtop', B.boven, 'reference', 'Plane bovenkant box'), (s) => s.rrect(-ix, -iz, ix, iz, B.hoek - B.wand));
  o.extrude('cut', B.boven - B.onder - B.wand, { omkeren: true, naam: 'Binnenruimte' });
  // 4 gaten Ø4,5 in de rand, van onderen een vlakke zitting tot onder de rand en een verzinking voor de schroef 4 x 16 (90°)
  o.schets(yv('rand', 0, 'reference', 'Plane onderkant blad'), (s) => boxPluggen().forEach(([x, z]) => s.cirkelW([x, 0, z], 2.25)));
  o.extrude('cut', B.flensDik + B.flens.z + 1, { omkeren: true, naam: 'Gaten schroeven' });
  const randOnder = vlak('randonder', 'Plane onderkant rand', [0, -B.flensDik, 0], [0, -1, 0], 'reference');
  o.schets(randOnder, (s) => boxPluggen().forEach(([x, z]) => s.cirkelW([x, -B.flensDik, z], 4.5)));
  o.extrude('cut', B.flens.z + 1, { naam: 'Zitting schroeven' });
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
  // voorkant (naar de module): het buisje van het slangetje van de drukmeter
  o.schets(vlak('boxvoor', 'Face voorkant box', [0, 0, bz], [0, 0, 1]), (s) => s.cirkelW([B.buis.x, B.buis.y, bz], 1.55));
  o.extrude('cut', B.wand + 1, { omkeren: true, terug: 1, naam: 'Gat voorkant' });
  // 7.4 (P1-1): linkerwand (kopse wand): de M8-stekker naar de module (binder 718, M10 x 0,75)
  o.schets(vlak('boxm8', 'Face linkerwand M8', [-bx, 0, 0], [-1, 0, 0]), (s) => s.cirkelW([-bx, B.m8.y, B.m8.z], 5.1));
  o.extrude('cut', B.wand + 1, { omkeren: true, terug: 1, naam: 'Gat M8' });
  // rechterkant: USB-C naar de knop en de USB-C van de ESP32-C3 (flashen), buiten met een zak voor de stekker
  o.schets(vlak('boxrechts', 'Face rechterwand box', [bx, 0, 0], [1, 0, 0]), (s) => {
    s.rrectW([bx, B.usb.y - 2, B.usb.z - 4.9], [bx, B.usb.y + 2, B.usb.z + 4.9], 1.2);
    // de bus is een rechte balk (8,94 x 3,26): hoeken R0,5, anders snijden de afgeronde hoeken van de opening in de bus
    s.rrectW([bx, c3y - 0.3, B.c3.z - 4.75], [bx, c3y + 3.56, B.c3.z + 4.75], 0.5);
  });
  o.extrude('cut', B.wand + 1, { omkeren: true, naam: 'Openingen USB-C' });
  o.schets(vlak('boxrechts', 'Face rechterwand box', [bx, 0, 0], [1, 0, 0]), (s) => {
    s.rrectW([bx, B.usb.y - 4, B.usb.z - 6.5], [bx, B.usb.y + 4, B.usb.z + 6.5], 1.5);
    s.rrectW([bx, c3y + 1.63 - 4, B.c3.z - 6.5], [bx, c3y + 1.63 + 4, B.c3.z + 6.5], 1.5);
  });
  o.extrude('cut', 1.5, { omkeren: true, naam: 'Zakken USB-C-stekkers' });
  // 7.4 (P2-4): achterwand (de achterrand van het bureau, aan de kant van de klant): verzonken wipschakelaar (verdikking
  // binnen, kom van 6 mm buiten, paneel 2 mm)
  const S = B.schakelaar, zk = -(bz - M.schakelaar.diep);
  o.schets(vlak('schakelbinnen', 'Plane verdikking schakelaar', [0, 0, -iz], [0, 0, 1], 'reference'), (s) => s.rrectW([S.x - 12.5, vloer, -iz], [S.x + 12.5, -4, -iz]));
  o.extrude('boss', M.schakelaar.diep + M.schakelaar.paneel - B.wand, { terug: 0.5, naam: 'Verdikking schakelaar' });
  o.schets(vlak('schakelkom', 'Face kom schakelaar', [0, 0, -bz], [0, 0, -1]), (s) => s.rrectW([S.x - 12.5, S.y - 9.5, -bz], [S.x + 12.5, S.y + 9.5, -bz], 3));
  o.extrude('cut', M.schakelaar.diep, { omkeren: true, terug: 1, naam: 'Kom schakelaar' });
  o.schets(vlak('schakelpaneel', 'Face paneel schakelaar', [0, 0, zk], [0, 0, -1]), (s) => s.rrectW([S.x - 9.705, S.y - 6.45, zk], [S.x + 9.705, S.y + 6.45, zk]));
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
  o.schets(yv('dekselonder', B.boven - B.deksel, 'reference', 'Plane onderkant deksel'), (s) => s.rrect(-ix, -iz, ix, iz, B.hoek - B.wand - 0.2));
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
  const o = new Onderdeel('Adapterklem', PA_CF); // 7.4 (P2-7): PA12-CF, de adapter wordt 55 tot 70 °C aan het oppervlak
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
  o.schets(vlak('dcuit', 'Plane DC-kabel', [A.x[1] - 0.2, 0, 0], [1, 0, 0], 'reference'), (s) => s.cirkelW([A.x[1], y0 + A.h / 2, A.z[1] - 12], 3.5));
  o.extrude('boss', 3.5, { naam: 'Trekontlasting' });
  o.schets(yv('label', y0 + A.h, 'reference', 'Plane label'), (s) => s.rrectW([A.x[0] + 25, 0, A.z[0] + 10], [A.x[1] - 25, 0, A.z[1] - 10], 2));
  o.extrude('cut', 0.3, { omkeren: true, naam: 'Label' });
  return o.doc();
}

/** print in de voedingsbox (-U1, gaatjesprint 40 x 50) met de echte maten van de onderdelen: ESP32-C3 SuperMini
 *  (USB-C naar de rechterwand), drukmeter SDP810 (poorten naar boven), 5V-regelaar D24V10F5, zekering Bel 0697W
 *  (TE5), Schottky-diode naar de ESP32-C3, elco,
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
  // zekering Bel 0697W3150-01 (TE5, 8,35 x 4,0 x 7,8, 72 V DC), Schottky 1N5819 (DO-41, Ø2,7 x 5,2, liggend: de 5 V
  // naar de ESP32-C3, zodat een computer aan haar USB-C niet terugvoedt in de regelaar en de knop), elco 470 µF
  // (Ø10 x 20), schroefklem 2-polig, transistor TO-92
  blok('te5', 'Zekering Bel 0697W', ox + 25.3, oz + 4, ox + 33.65, oz + 8, y0, 7.8, 0.5);
  o.schets(vlak('diode', 'Plane diode', [ox + 34.2, 0, 0], [1, 0, 0], 'reference'), (s) => s.cirkelW([ox + 34.2, y0 + 1.15, oz + 6.5], 1.35)); // 0,2 mm in de print: geen raaklijn (anders een los lichaam)
  o.extrude('boss', 5.2, { naam: 'Schottky 1N5819' });
  // -C1 (470 µF) is in 7.4 geschrapt (P3-6)
  blok('klem', 'Schroefklem', ox + 30, oz + 34, ox + 39.5, oz + 41.5, y0, 10);
  o.schets(yv('klemtop', y0 + 10, 'reference', 'Plane klemtop'), (s) => [ox + 32.5, ox + 37].forEach((x) => s.cirkelW([x, 0, oz + 37.75], 1.4)));
  o.extrude('cut', 2, { omkeren: true, naam: 'Schroefjes klem' });
  blok('to92', 'Transistor', ox + 6, oz + 45.5, ox + 10.6, oz + 49.1, y0, 4.6);
  // versie 7.1: schakelaar -Q2 (IRF4905, TO-220 staand) in de 24 V naar de ventilator met zijn driver -Q3 (BC547):
  // valt de besturing weg (5 V, reset, flashen), dan is de ventilator spanningsloos; elco -C2 47 µF / 50 V aan VIN
  // van de regelaar (Pololu: minstens 33 µF boven 20 V)
  blok('q2', 'MOSFET IRF4905', ox + 22.5, oz + 44.5, ox + 32.9, oz + 49.1, y0, 18);
  blok('q3', 'Transistor -Q3', ox + 12, oz + 45.5, ox + 16.6, oz + 49.1, y0, 4.6);
  cil('c2', 'Elco 47 µF', ox + 3.5, oz + 9, 3.15, y0, 11);
  // versie 7.2: RC-filter van de tacho: -R14 1 kΩ (staand) en -C3 10 nF (keramisch, steek 5) bij GPIO4. De
  // ompolingsdiode -R13 staat naast de print (diodeSB560()); 7.4: de tachoklem -R15/-R16 (2 x BAT85) zit op de print (schema)
  cil('rtacho', 'Weerstand 1 kΩ', ox + 35.5, oz + 11.5, 1.25, y0, 6.5);
  blok('ctacho', 'Condensator 10 nF', ox + 37.5, oz + 10.2, ox + 39.5, oz + 13.2, y0, 5, 0.3);
  return o.doc();
}

/** ompolingsbeveiliging -R13 (Schottky SB560, 5 A / 60 V, DO-201AD Ø5,3 x 9,5) liggend op de bodem van de box naast de
 *  print, met twee korte draden op -X1 (7.4: elektrisch vóór -Q4 en -F1), in sperrichting (de ring aan +): verkeerd om
 *  aangesloten geleidt ze en blijft de adapter in hiccup tot de stekker eruit gaat. Oorsprong zoals de box */
export function diodeSB560() {
  const B = M.box, o = new Onderdeel('Schottky SB560', { name: 'Epoxy, zwart', density: 1800, color: '#1e1e20' });
  const y = B.onder + B.wand + 2.65;
  o.schets(vlak('sb560', 'Plane diode', [57.5, 0, 0], [1, 0, 0], 'reference'), (s) => s.cirkelW([57.5, y, -20], 2.65));
  o.extrude('boss', 9.5, { naam: 'Diode' });
  return o.doc();
}

/** elco -C1 470 µF (7.2 en 7.3): in 7.4 geschrapt (P3-6, laadpiek over de schakelaar); blijft voor de oude bestanden */
export function elco470() {
  const B = M.box, o = new Onderdeel('Elco 470 µF', { name: 'Aluminium, blauw', density: 1500, color: '#2d4f8f' });
  o.schets(yv('elcobodem', B.onder + B.wand, 'reference', 'Plane bodem box'), (s) => s.cirkelW([50, 0, 20], 5));
  o.extrude('boss', 20, { naam: 'Elco' });
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

/** wipschakelaar C&K D502J12S215PQA in de kom van de voorwand van de box: huis met twee vlakstekers 4,75, rand en wip */
export function schakelaar() {
  const { box: B, schakelaar: S0 } = M;
  // 7.4: in de achterwand: alles gespiegeld in z (k = -1, buiten is -Z)
  const S = B.schakelaar, k = -1, zk = k * (B.d / 2 - S0.diep);
  const Z = (z) => [0, 0, z], nz = (d) => [0, 0, d * k];
  const o = new Onderdeel('Wipschakelaar C&K D502', ZWART);
  o.schets(vlak('huis', 'Plane huis', Z(zk + k * 0.1), nz(-1), 'reference'), (s) => s.rrectW([S.x - 9.3, S.y - 6.3, zk], [S.x + 9.3, S.y + 6.3, zk]));
  o.extrude('boss', 12.5, { naam: 'Huis' });
  o.schets(vlak('stekers', 'Plane stekers', Z(zk - k * 12.3), nz(-1), 'reference'), (s) => [-4, 4].forEach((dx) => s.rrectW([S.x + dx - 2.4, S.y - 0.4, zk], [S.x + dx + 2.4, S.y + 0.4, zk])));
  o.extrude('boss', 6.8, { naam: 'Vlakstekers 4,75' });
  o.schets(vlak('rand', 'Plane rand', Z(zk + k * 0.1), nz(1), 'reference'), (s) => s.rrectW([S.x - 10.415, S.y - 7.5, zk], [S.x + 10.415, S.y + 7.5, zk], 1));
  o.extrude('boss', 2, { terug: 0.05, naam: 'Rand' });
  o.schets(vlak('wip', 'Plane wip', Z(zk + k * 2.1), nz(1), 'reference'), (s) => s.rrectW([S.x - 9, S.y - 6, zk], [S.x + 9, S.y + 6, zk], 1));
  o.extrude('boss', S0.diep - 3.1, { terug: 0.3, naam: 'Wip' });
  const top = zk + k * (2.1 + (S0.diep - 3.1));
  o.schets(vlak('wiptop', 'Plane bovenkant wip', Z(top), nz(1), 'reference'), (s) => s.rrectW([S.x - 9, S.y - 6, top], [S.x, S.y + 6, top]));
  o.extrude('cut', 0.8, { omkeren: true, naam: 'Helling wip' });
  o.schets(vlak('wiptop', 'Plane bovenkant wip', Z(top), nz(1), 'reference'), (s) => s.rrectW([S.x + 4, S.y - 2.5, top], [S.x + 4.6, S.y + 2.5, top]));
  o.extrude('cut', 0.3, { omkeren: true, naam: 'Teken I' });
  return o.doc();
}

/** 7.4: M8-inbouwstekker 4-polig in de linkerwand (kopse wand) van de box (binder 718, M10 x 0,75): naar de M8-kabel.
 *  Oorsprong zoals de box */
export function m8stekker() {
  return m8connector('M8-inbouwstekker 4-polig', m8stekkerAs(), [-1, 0, 0], M.box.wand, false);
}
/** de as van de M8-stekker aan de binnenkant van de linkerwand (assenstelsel van de box) */
export const m8stekkerAs = () => [-(M.box.b / 2 - M.box.wand), M.box.m8.y, M.box.m8.z];

/** alle componenten van de afzuiging, verschoven met `o` (de oorsprong van de module in de assemblage); blad = dikte */
export function afzuigingComponenten(o = [0, 0, 0], prefix = 'a', blad = M.blad) {
  const at = (p) => [o[0] + p[0], o[1] + p[1], o[2] + p[2]];
  const halfY = [0, 1, 0, 0]; // 180° om Y: de arm wijst naar -X
  const comps = [
    component(`${prefix}1`, 'Romp<1>', romp(), at([0, 0, 0])),
    component(`${prefix}6`, 'Bovenframe<1>', bovenframe(), at([0, 0, 0])),
    component(`${prefix}2`, 'Rooster LB<1>', rooster(), at([0, 0, 0])),
    component(`${prefix}3`, `${M.filter.naam}<1>`, interieurfilter(), at([0, 0, 0])),
    component(`${prefix}3f`, 'Foamband 6 x 4<1>', foamband(), at([0, 0, 0])),
    component(`${prefix}3l`, 'Afdichtlip<1>', afdichtlip(), at([0, 0, 0])),
    component(`${prefix}9`, 'Instroomplaat<1>', instroomplaat(), at([0, 0, 0])),
    component(`${prefix}9t`, 'Instroomtuit<1>', instroomtuit(), at([0, 0, 0])),
    component(`${prefix}4`, 'Ventilatorkuip<1>', kuip(), at([0, 0, 0])),
    component(`${prefix}4d`, 'Kuipdichting<1>', kuipdichting(), at([0, 0, 0])),
    component(`${prefix}5`, 'San Ace C175 9TG24P0S01<1>', ventilator(), at([0, 0, 0])),
    component(`${prefix}10`, 'M8-inbouwbus 4-polig<1>', m8bus(), at([0, 0, 0])),
    component(`${prefix}11`, 'M8-kabel haaks 0,3 m<1>', m8kabel(blad), at([0, 0, 0])),
  ];
  // 7.4: de magneten in het bovenframe (vlak met de bovenkant) en de inzetmoeren M3 in de bussen van de romp
  const mg = magneet();
  M.magneten.plaats.forEach(([x, z], i) => comps.push(component(`${prefix}6m${i + 1}`, `Neodymiummagneet Ø8 x 1,5<${i + 1}>`, mg, at([x, M.frame.dikte - M.magneten.h, z]))));
  const im = inzetmoer();
  kuipSchroeven().forEach(([x, z], i) => comps.push(component(`${prefix}1i${i + 1}`, `Inzetmoer M3 x 5,7 messing<${i + 1}>`, im, at([x, M.romp.onder, z]))));
  // de RVS-plaat met 4 persbouten (de kop vlak in de plaat)
  const pb = persbout();
  M.persbouten.forEach(([x, z], i) => comps.push(component(`${prefix}2p${i + 1}`, `Persbout PEM FH4-M3-6<${i + 1}>`, pb, at([x, M.frame.dikte, z]))));
  // de klauwen met het rubber tegen het blad (onbelast getekend)
  const k = klauw(), kr = klauwrubber(), C5 = M.klauw, yk = -blad - C5.rubber.h - C5.dik;
  assen().forEach(([x, z], i) => {
    const rot = { rotation: x > 0 ? [0, 0, 0, 1] : halfY };
    comps.push(component(`${prefix}k${i + 1}`, `Klauw<${i + 1}>`, k, at([x, yk, z]), rot));
    comps.push(component(`${prefix}kr${i + 1}`, `Klauwrubber<${i + 1}>`, kr, at([x, yk, z]), rot));
  });
  // de M5-moeren in de klauwen, tegen het plafond van hun kamer
  const m5n = moer('M5 zeskantmoer DIN 934', C5.moer.s, C5.moer.m, 4.3);
  assen().forEach(([x, z], i) => comps.push(component(`${prefix}n${i + 1}`, `M5 zeskantmoer DIN 934<${i + 1}>`, m5n, at([x, yk + 0.2, z]))));
  const d = M.dial, DC = d.klauw;
  comps.push(component(`${prefix}7`, 'Knophouder<1>', knophouder(), at([d.x, 0, d.z])));
  comps.push(component(`${prefix}12`, 'Knopdeksel<1>', knopdeksel(), at([d.x, 0, d.z])));
  comps.push(component(`${prefix}8`, 'VIEWE-knop 1,5"<1>', vieweKnop(), at([d.x, d.plaat, d.z])));
  comps.push(component(`${prefix}14`, 'Adapterprint knop<1>', knopadapter(), at([d.x, 0, d.z])));
  comps.push(component(`${prefix}15`, 'USB-C-bus knophouder<1>', usbBusKnop(), at([d.x, 0, d.z])));
  // de knopklauwen met hun rubber tegen het blad (onbelast getekend)
  const dk = dialklauw(), dkr = klauwrubber(DC, 'Knopklauwrubber'), ydk = -blad - DC.rubber.h - DC.dik;
  [DC.x, -DC.x].forEach((x, i) => {
    const rot = { rotation: x > 0 ? [0, 0, 0, 1] : halfY };
    comps.push(component(`${prefix}dk${i + 1}`, `Knopklauw<${i + 1}>`, dk, at([d.x + x, ydk, d.z]), rot));
    comps.push(component(`${prefix}dkr${i + 1}`, `Knopklauwrubber<${i + 1}>`, dkr, at([d.x + x, ydk, d.z]), rot));
  });
  const m4n = moer('M4 zeskantmoer DIN 934', DC.moer.s, DC.moer.m, 3.5);
  [DC.x, -DC.x].forEach((x, i) => comps.push(component(`${prefix}dn${i + 1}`, `M4 zeskantmoer DIN 934<${i + 1}>`, m4n, at([d.x + x, ydk + 0.2, d.z]))));
  // normdelen
  const omhoog = [1, 0, 0, 0]; // 180° om X: schroef van onderen
  const m5 = schroefVerzonken('M5 x 70 DIN 7991', 5, 4.2, 70);
  assen().forEach(([x, z], i) => comps.push(component(`${prefix}s5${i + 1}`, `M5 x 70 DIN 7991<${i + 1}>`, m5, at([x, M.frame.dikte, z]))));
  // de kuip: 4 x M3 x 12 cilinderkop van onderen door de oren in de bussen van de romp (de kop in een kom van Ø6,5)
  const m3p = schroefCilinder('M3 x 12 DIN 912', 5.5, 3, 2.5, 12);
  kuipSchroeven().forEach(([x, z], i) => comps.push(component(`${prefix}s3${i + 1}`, `M3 x 12 DIN 912<${i + 1}>`, m3p, at([x, M.kuip.oor.top - 4, z]), { rotation: omhoog })));
  // 7.4: de ventilator star op de 4 bussen van de kuip: M4 x 16 verzonken van onderen door bodem en bus, 4 mm in de motor
  const m4 = schroefVerzonken('M4 x 16 DIN 7991', 4, 3.4, 16);
  fanGaten().forEach(([x, z], i) => comps.push(component(`${prefix}s4${i + 1}`, `M4 x 16 DIN 7991<${i + 1}>`, m4, at([x, M.kuip.bodem, z]), { rotation: omhoog })));
  const m4d = schroefVerzonken('M4 x 65 DIN 7991', 4, 3.4, 65);
  [DC.x, -DC.x].forEach((x, i) => comps.push(component(`${prefix}sd${i + 1}`, `M4 x 65 DIN 7991<${i + 1}>`, m4d, at([d.x + x, d.plaat, d.z]))));
  // de knop met 2 x M2,5 x 6 verzonken van onderen in de naaf; het deksel met 2 x M2,5 x 8 verzonken
  const m25k = schroefVerzonken('M2,5 x 6 DIN 7991', 2.5, 2, 6);
  const vloerOnder = d.plaat - d.naaf.reduce((a2, [, dd]) => a2 + dd, 0) - d.vloer;
  d.schroeven.forEach(([x, z], i) => comps.push(component(`${prefix}sk${i + 1}`, `M2,5 x 6 DIN 7991<${i + 1}>`, m25k, at([d.x + x, vloerOnder, d.z + z]), { rotation: omhoog })));
  const m25d = schroefVerzonken('M2,5 x 8 DIN 7991', 2.5, 2, 8);
  d.bus.forEach(([x, z], i) => comps.push(component(`${prefix}sdk${i + 1}`, `M2,5 x 8 DIN 7991<${i + 1}>`, m25d, at([d.x + x, d.onder - d.deksel, d.z + z]), { rotation: omhoog })));
  // drukmeting: messingbuisje in de instroomplaat (meetpunt onder het filter); het slangetje loopt eronder, buiten de
  // luchtweg, door een gat in de achterwand naar de voedingsbox
  const A = M.achter;
  comps.push(component(`${prefix}18`, 'Messingbuisje Ø3 x 12<1>', messingbuisje(12), at([A.meet[0], M.inlaat.top, A.meet[1]])));
  // de voedingsbox onder het blad (vast aan het blad, dus mee met de bladdikte)
  const B = M.box, bo = [B.x, -blad, B.z], bat = (p) => at([bo[0] + p[0], bo[1] + p[1], bo[2] + p[2]]);
  const naarAchter = [Math.SQRT1_2, 0, 0, Math.SQRT1_2]; // +90° om X: -Y wordt -Z
  comps.push(component(`${prefix}20`, 'Voedingsbox<1>', voedingsbox(), bat([0, 0, 0])));
  comps.push(component(`${prefix}28`, 'Deksel voedingsbox<1>', boxdeksel(), bat([0, 0, 0])));
  // het deksel met 4 x M3 x 8 verzonken op de paaltjes; de box met 4 spaanplaatschroeven 4 x 16 verzonken van onderen in de onderhuid
  const m3dk = schroefVerzonken('M3 x 8 DIN 7991', 3, 2.5, 8), m4b = schroefVerzonken('Spaanplaatschroef 4 x 16 verzonken', 4, 2.4, 16);
  boxBuizen().forEach(([x, z], i) => comps.push(component(`${prefix}sbd${i + 1}`, `M3 x 8 DIN 7991<${i + 1}>`, m3dk, bat([x, B.boven, z]))));
  boxPluggen().forEach(([x, z], i) => comps.push(component(`${prefix}sb${i + 1}`, `Spaanplaatschroef 4 x 16 verzonken<${i + 1}>`, m4b, bat([x, -B.flensDik, z]), { rotation: omhoog })));
  comps.push(component(`${prefix}21`, 'Mean Well GST90A24-P1M<1>', netadapter(), bat([0, 0, 0])));
  comps.push(component(`${prefix}22`, 'Voedingsprint<1>', voedingsprint(), bat([0, 0, 0])));
  comps.push(component(`${prefix}29b`, 'Schottky SB560<1>', diodeSB560(), bat([0, 0, 0])));
  comps.push(component(`${prefix}23`, 'USB-C-bus knop<1>', usbBusBox(), bat([0, 0, 0])));
  comps.push(component(`${prefix}24`, 'Wipschakelaar C&K D502<1>', schakelaar(), bat([0, 0, 0])));
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

/** de uitsparingen in het tafelblad (assenstelsel van het blad: bovenvlak op Y = blad): frezen (MDF-mal, kopieerring Ø17,
 *  frees Ø12; de sleuf naar de knop met een frees Ø5) en gatzaag Ø44 */
export function bladUitsparingen(o, x0 = 0, z0 = 0, blad = M.blad) {
  const { uitsparing: U, dial: D, box: B, sleuven: K } = M;
  o.schets(vlak('bladtop', 'Face bovenvlak', [0, blad, 0], [0, 1, 0]), (s) => {
    s.rrectW([x0 - U.b / 2, 0, z0 - U.d / 2], [x0 + U.b / 2, 0, z0 + U.d / 2], U.r);
    s.cirkelW([x0 + D.x, 0, z0 + D.z], D.gat / 2);
  });
  o.extrude('cut', blad + 1, { omkeren: true, naam: 'Uitsparingen afzuiging' });
  // onderaan: de uitsparing voor de voedingsbox (15 mm) en de kabelsleuf naar de knop (7.4: geen sleuf meer naar de module)
  const onder = vlak('bladonder', 'Face ondervlak', [0, 0, 0], [0, -1, 0]);
  const F = B.frees, bx = x0 + B.x, bz = z0 + B.z;
  o.schets(onder, (s) => s.rrectW([bx - F.b / 2, 0, bz - F.d / 2], [bx + F.b / 2, 0, bz + F.d / 2], F.r));
  o.extrude('cut', F.diep, { omkeren: true, naam: 'Uitsparing voedingsbox' });
  // 4 voorboorgaten Ø2,5 naast de uitsparing voor de schroeven van de rand van de box (door de onderhuid in de honingraat)
  o.schets(onder, (s) => boxPluggen().forEach(([x, z]) => s.cirkelW([bx + x, 0, bz + z], B.plug.gat / 2)));
  o.extrude('cut', B.plug.diep, { omkeren: true, naam: 'Voorboorgaten box' });
  // naar de knop: recht van de rechterkant van de box (bij de USB-C) naar het gat van de knop, rechts langs de module
  const [ax, az] = [bx + F.b / 2 - 2, bz + K.knop.z], [ex, ez] = [x0 + D.x, z0 + D.z];
  const l = Math.hypot(ex - ax, ez - az), nx = (-(ez - az) / l) * K.knop.breed / 2, nz = ((ex - ax) / l) * K.knop.breed / 2;
  o.schets(onder, (s) => s.lusW([[ax + nx, 0, az + nz], [ex + nx, 0, ez + nz], [ex - nx, 0, ez - nz], [ax - nx, 0, az - nz]]));
  o.extrude('cut', K.knop.diep, { omkeren: true, naam: 'Sleuf naar de knop' });
}

/** versie 7.2: een stuk LAGKAPTEN rond de afzuiging met de twee huiden (3 mm, AANNAME) en de houten latten ertussen,
 *  zonder de honingraat (zo zie je de latten); voor het bouwschema, de schermafdrukken en tekening AFZ-20.
 *  Assenstelsel zoals de module: bovenvlak van het blad op Y = 0. */
export function tafelbladDetail(blad = M.blad) {
  const { uitsparing: U, box: B, latten: T } = M, F = B.frees, h = T.huid;
  const X = 260, Z0 = -320, Z1 = 170, bz = B.z;
  const huid = (naam, y0, onder) => {
    const o = new Onderdeel(naam, { name: 'Vezelplaat (hardboard)', density: 900, color: '#f2f2ef' });
    o.schets(yv(`huid${y0}`, y0, 'reference', `Plane ${naam}`), (sk) => {
      sk.rrectW([-X, 0, Z0], [X, 0, Z1]);
      sk.rrectW([-U.b / 2, 0, -U.d / 2], [U.b / 2, 0, U.d / 2], U.r);
      if (onder) sk.rrectW([B.x - F.b / 2, 0, bz - F.d / 2], [B.x + F.b / 2, 0, bz + F.d / 2], F.r);
    });
    o.extrude('boss', h, { naam });
    return o.doc();
  };
  const lat = (naam, x0, z0, x1, z1, y0, hh) => {
    const o = new Onderdeel(naam, { name: 'Vurenhout, geschaafd', density: 450, color: '#d9b77e' });
    o.schets(yv(`lat${y0}`, y0, 'reference', `Plane ${naam}`), (sk) => sk.rrectW([x0, 0, z0], [x1, 0, z1]));
    o.extrude('boss', hh, { naam });
    return o.doc();
  };
  const ym = -blad + h, Lm = T.module, Lb = T.box, u = U.b / 2, w = U.d / 2;
  const achter = -(bz + F.d / 2) ; // de achterste lat van de module vult de strook tot de uitsparing van de box (38 mm)
  const comps = [
    component('h1', 'Bovenhuid<1>', huid('Bovenhuid', -h, false), [0, 0, 0]),
    component('h2', 'Onderhuid<1>', huid('Onderhuid', -blad, true), [0, 0, 0]),
    component('l1', 'Lat 28 x 44 rechts<1>', lat('Lat 28 x 44', u, -w, u + Lm.b, w, ym, Lm.h), [0, 0, 0]),
    component('l2', 'Lat 28 x 44 links<1>', lat('Lat 28 x 44', -u - Lm.b, -w, -u, w, ym, Lm.h), [0, 0, 0]),
    component('l3', 'Lat 28 x 44 voor<1>', lat('Lat 28 x 44', -u, w, u, w + Lm.b, ym, Lm.h), [0, 0, 0]),
    component('l4', 'Lat 28 x 38 achter<1>', lat('Lat 28 x 38', -u, -w - (achter - w), u, -w, ym, Lm.h), [0, 0, 0]),
    component('l5', 'Lat 10 x 30 box<1>', lat('Lat 10 x 30', -Lb.l / 2, bz - F.d / 2 - Lb.b, Lb.l / 2, bz - F.d / 2, ym, Lb.h), [0, 0, 0]),
  ];
  const knop = /^a(7|8|12|14|15|dkr?\d|dn\d|sd\d|sk\d|sdk\d)$/;
  comps.push(...afzuigingComponenten([0, 0, 0], 'a', blad).components.filter((c) => !knop.test(c.id)));
  return { format: 'phlippo-cad', version: 1, name: 'Tafelblad met latten', units: 'mm', sketches: {}, features: [], planes: {}, variables: {}, equations: [], kind: 'assembly', components: comps, mates: [] };
}

export const ONDERDELEN = {
  'Romp.kcad': romp,
  'Bovenframe.kcad': bovenframe,
  'Rooster-LB.kcad': rooster,
  'Interieurfilter-CU20013.kcad': interieurfilter,
  'Foamband.kcad': foamband,
  'Klauwrubber.kcad': klauwrubber,
  'Knopklauwrubber.kcad': () => klauwrubber(M.dial.klauw, 'Knopklauwrubber'),
  'Afdichtlip.kcad': afdichtlip,
  'Instroomplaat.kcad': instroomplaat,
  'Instroomtuit.kcad': instroomtuit,
  'Ventilatorkuip.kcad': kuip,
  'Kuipdichting.kcad': kuipdichting,
  'M8-kabel-haaks.kcad': () => m8kabel(),
  'Neodymiummagneet.kcad': magneet,
  'Inzetmoer-M3.kcad': inzetmoer,
  'Bovenframe-zijlat.kcad': () => bovenframeLat('zij'),
  'Bovenframe-dwarslat.kcad': () => bovenframeLat('dwars'),
  'Persbout-FH4-M3-6.kcad': persbout,
  'Ventilator-San-Ace-C175.kcad': ventilator,
  'M8-inbouwbus.kcad': m8bus,
  'Voedingsbox.kcad': voedingsbox,
  'Netadapter-GST90A24.kcad': netadapter,
  'Voedingsprint.kcad': voedingsprint,
  'Diode-SB560.kcad': diodeSB560,
  'USB-C-bus-knop.kcad': usbBusBox,
  'USB-C-bus-knophouder.kcad': usbBusKnop,
  'Adapterklem.kcad': () => adapterklem(0),
  'Deksel-voedingsbox.kcad': boxdeksel,
  'Wipschakelaar-D502.kcad': schakelaar,
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
  writeFileSync(join(HERE, '..', 'bureau', 'Tafelblad-detail.kcad'), JSON.stringify(tafelbladDetail(), null, 1) + '\n');
  // vervangen door versie 3
  for (const oud of ['Filtercassette.kcad', 'Cassetterand.kcad', 'Filtermat-SK3171.kcad', 'print/Filtercassette.stl', 'print/Cassetterand.stl', 'Wipschakelaar-KCD1.kcad', 'Inlijmmoer-M4.kcad', 'Filtermat-G4.kcad', 'Fijnstoffilter-M5.kcad', 'Voorfilter-G4.kcad', 'Actieve-koolmat.kcad', 'Inbouwmodule.kcad', 'Filterlade.kcad', 'print/Inbouwmodule.stl', 'print/Filterlade.stl', 'Filtermat.kcad', 'Ventilatorplaat.kcad', 'Ventilator-NF-F12.kcad', 'print/Ventilatorplaat.stl',
    'Elektronicabox.kcad', 'Deksel-elektronicabox.kcad', 'print/Elektronicabox.stl', 'print/Deksel-elektronicabox.stl', 'Dialhouder.kcad', 'print/Dialhouder.stl',
    'Uitblaasplaat.kcad', 'print/Uitblaasplaat.stl', 'Deksel-elektronicavak.kcad', 'print/Deksel-elektronicavak.stl',
    'Dialkuip.kcad', 'Dialring.kcad', 'Dialklauw.kcad', 'M5Stack-Dial.kcad', 'print/Dialkuip.stl', 'print/Dialring.stl',
    'Ventilator-Delta-PFR1212UHE.kcad', 'Interfaceprint.kcad', 'ESP32-C3-SuperMini.kcad', 'USB-C-bus-module.kcad',
    'Bodemplaat.kcad', 'print/Bodemplaat.stl', 'Rubberbuffer.kcad', 'Elco-470uF.kcad', 'print/Bovenframe.stl'])
    if (existsSync(join(HERE, oud))) rmSync(join(HERE, oud));
  console.log('geschreven:', [...Object.keys(ONDERDELEN), 'Afzuiging.kcad'].join(', '));
}
