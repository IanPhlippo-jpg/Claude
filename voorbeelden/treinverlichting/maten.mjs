// Alle maten van de kabeldoos (mm). De gekochte onderdelen met hun bron: docs/Maten-en-bronnen.md.
import { GOOT } from './goten.mjs';

export const M = {
  // Modelbouwled "PCB met ingebouwde weerstand": print 61,1 x 20,9 x 1,6, hoogste punt 14 (Ian, 2026-11-08); 16 klemmen
  // per rij (steek 2,54) langs beide lange randen, aan elk uiteinde een 2-polige klem (steek 5,0) voor + en -.
  bordje: { x: 61.1, z: 20.9, pcb: 1.6, h: 14, klem: { steek: 2.54, n: 16, diep: 6.2, h: 8.5 }, eind: { steek: 5.0, diep: 7.6 } },
  // ESP32-S3-DevKitC-1 v1.1 (Espressif, DXF_ESP32-S3-DevKitC-1_V1.1_20220429): 62,74 x 25,40; 2 x 22 pinnen, steek 2,54,
  // 1,27 van de lange rand; laatste pin 8,00 van de rand bij de USB; module 18 x 25,5 x 3,1 met de antenne 6,4 voorbij de print
  esp: { x: 62.74, z: 25.4, pcb: 1.6, pin: { n: 22, steek: 2.54, rand: 1.27, eerste: 1.5 }, module: { x: 25.5, z: 18.1, h: 3.1, voorbij: 6.4, van: 3.83 } },
  // PCA9685-breakout (de gangbare 16-kanaalsprint): 62,5 x 25,4 volgens de verkopers (na te meten); zonder pinnen gebruikt:
  // de draden gesoldeerd in de gaten. Advies Fable 5.2: hij zit op 4 afstandsbussen M2,5 x 10 boven de uitgangsprint
  pca: { x: 62.5, z: 25.4, pcb: 1.6 },
  // eigen gaatjesprints (raster 2,54), indeling in opbouw.mjs. Fable 5.2: de uitgangsprint vult rij 6 naast bordje 16
  // (16 MOSFET's op adapterprintjes in voetjes, 16 polyfuses, de klemmen en de PCA9685 erboven), de ingangsprint 88
  // breed (4 x LTV-844, 24 klemmen)
  uitgang: { x: 132, z: 25.4 },
  ingang: { x: 88, z: 25.4 },
  voeding: { x: 61, z: 25.4 },
  // draagprint van de ESP: 2 x 22 vrouwelijke pinrijen (22,86 hart op hart, 1,27 van de rand), 2 schroeven tussen de
  // rijen; versie 2: 25,4 diep (10 gaten) in plaats van 27,94, zodat de rij even diep is als de andere prints
  drager: { x: 68, z: 25.4 },
  voet: 3, // alle prints liggen 3 mm boven de bodem (op paaltjes of op de steunrail)
  // de doos: binnen 225 x 225 (buiten 229,8: eis hoogstens 230 per geprint deel), 44,4 hoog met het deksel (eis: hoogstens
  // 80); de goten zijn 28 hoog, het deksel van een goot 1,6; erboven 10 speling tot het deksel van de doos (Ian)
  doos: { binnen: 225, wand: 2.4, bodem: 2.4, h: 39.6, deksel: 2.4, r: 4, voor: 7.8, sleutelgat: { kop: 9.2, schacht: 4.6, slag: 6 },
    sleuf: { b: 4, l: 40, zij: { b: 6, l: 20 } }, bus: { r: 3.5, hart: 3.2 },
    invoer: { gat: 16.5, y: 13.5, tule: { d: 21, flens: 2, l: 11 } } },
  // tussen de bordjes van een rij en tussen de prints van rij 7; eind: tussen het laatste bordje en de zijwand van de
  // ring (plaats voor de klemlip en zijn veerweg)
  rij: { paal: 0.3, tussen6: 4.0, rand7: 3, eind: 1.8 },
  // klemlippen (Fable 5.2): per bordje 4 PETG-lippen aan de korte kanten, haak 0,75 over de rand van de print (0,15
  // speling: 0,6 grip), 0,1 boven de print; de lip is 0,8 dik en 2,0 breed en staat in een kuiltje van 1,8 diep in de
  // bodem (veerlengte 6,5). Rek bij het inklikken: 1,5 t d / L² = 1,70 % (docs/Berekeningen.md, hfst. 8)
  lip: { t: 0.8, b: 2.0, z0: 8.0, speling: 0.15, haak: 0.75, boven: 0.1, kuil: 1.8, rondom: 0.4, achter: 0.6 },
  // DC-chassisbus 5,5 x 2,5 (GlobTek JACK-L-PANEL-8A(R), 50 V / 8 A): flens Ø12,5 x 2,0, lijf 14,4 achter de flens,
  // soldeerlippen 9,7, moer 14 sleutelwijdte; draad afgelezen Ø11,3 -> gat Ø11,5 (AANNAME, na te meten); in de
  // linkerwand boven de voedingsprint
  dcbus: { gat: 11.5, flens: 12.5, flensDik: 2.0, lijf: 14.4, draad: 11.3, lippen: 9.7, moer: 14, moerDik: 2.0, y: 28, dz: 3 },
  // kader van een bordje: de ringwanden zelf (0,3 speling); bordje 16 heeft in zijn bredere ring 2 lage stroken
  kader: { speling: 0.3, h: 3 + 1.6 + 0.3 },
  goot: GOOT,
  // elk geprint deel hoogstens 230 x 230 (het bed is 256 x 256, rechtsvoor 10 x 20 vrij voor het filamentmes, plus skirt)
  bed: { max: 230, hoog: 80 },
};
