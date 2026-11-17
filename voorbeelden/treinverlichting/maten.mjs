// Alle maten van de kabeldoos (mm). De gekochte onderdelen met hun bron: docs/Maten-en-bronnen.md.

export const M = {
  // Modelbouwled "PCB met ingebouwde weerstand": print 61,1 x 20,9 x 1,6, hoogste punt 14 (Ian, 2026-11-08); 16 klemmen
  // per rij (steek 2,54) langs beide lange randen, aan elk uiteinde een 2-polige klem (steek 5,0) voor + en -.
  bordje: { x: 61.1, z: 20.9, pcb: 1.6, h: 14, klem: { steek: 2.54, n: 16, diep: 6.2, h: 8.5 }, eind: { steek: 5.0, diep: 7.6 } },
  // ESP32-S3-DevKitC-1 v1.1 (Espressif, DXF_ESP32-S3-DevKitC-1_V1.1_20220429): 62,74 x 25,40; 2 x 22 pinnen, steek 2,54,
  // 1,27 van de lange rand; laatste pin 8,00 van de rand bij de USB; module 18 x 25,5 x 3,1 met de antenne 6,4 voorbij de print
  esp: { x: 62.74, z: 25.4, pcb: 1.6, pin: { n: 22, steek: 2.54, rand: 1.27, eerste: 1.5 }, module: { x: 25.5, z: 18.1, h: 3.1, voorbij: 6.4, van: 3.83 } },
  // PCA9685-breakout (AZ-Delivery, Adafruit-maat): 62,5 x 25,4, 4 gaten M2,5 op 56 x 19; de pinnen zijn al gesoldeerd
  pca: { x: 62.5, z: 25.4, pcb: 1.6 },
  // de diepte van rij 6 en rij 7 (de rijen staan op dezelfde plaatsen als in versie 3 en 4); rij 6 heeft alleen
  // bordje 16, rij 7 is vrij (kabelruimte vooraan in de linkerhelft)
  rij6: 25.4, rij7: 25.4,
  voet: 3, // de bordjes liggen 3 mm boven de bodem (op de steunrail)
  // versie 5 (Ian, 2026-11-15: "Als je met 2 lagen werkt is het te moeilijk om de kabels aan te sluiten"): één langwerpige
  // doos op één laag, geprint in 2 helften. Linkerhelft: de 16 bordjes (zoals versie 4, zonder kabelgoten), binnen 225 diep (Z);
  // rechterhelft: alle modules op palen in de bodem. Binnenhoogte 47,0: de hoogte van de MOSFET-module is niet
  // gepubliceerd (getekend 15, AANNAME), één verkoper noemt 87 x 47 x 39: veilig gekozen voor een module tot 39 hoog op
  // palen van 5 met 3 mm vrij tot het deksel (5 + 39 + 3 = 47). Boven de bordjes (17) blijft 30 vrij. Deksel 3,2
  // (overlap aan de naad: 1,6 + 0,2 + 1,4). Samen 2,4 + 47,0 + 3,2 = 52,6 hoog (eis: hoogstens 80).
  doos: { binnen: 225, wand: 2.4, bodem: 2.4, h: 47.0, deksel: 3.2, r: 4, voor: 7.8, sleutelgat: { kop: 9.2, schacht: 4.6, slag: 6 },
    sleuf: { b: 4, l: 40, zij: { b: 6, l: 20 } }, bus: { r: 3.5, hart: 3.2 },
    invoer: { gat: 16.5, y: 13.5, tule: { d: 21, flens: 2, l: 11 } } },
  // tussen de bordjes van een rij; eind: tussen het laatste bordje en de rand van het vak (de plaatsen van versie 4)
  rij: { paal: 0.3, tussen6: 4.0, rand7: 3, eind: 1.8 },
  // de naad tussen de helften (Ian, 2026-11-15: "De doos moet in elkaar kunnen klikken en nog kunnen lijmen"): het naadvlak
  // van de linkerhelft op x = 110, de rechterhelft begint 0,2 verder (lijmspleet, overal 0,2). Alles print rechtop zonder
  // support: alleen staande vlakken en 45° (docs/Berekeningen.md, hoofdstuk "Naad").
  //  - lippen: 5 bodemlippen van de rechterhelft (16 breed, 5 lang) in uitsparingen in de bodem van de linkerhelft (0,3
  //    rondom, Fable 5.2 D1: PETG krimpt 0,3 tot 0,5 %, over de 230 mm van een helft tot 1 mm): uitlijnen in Z en lijmvlak;
  //  - haken: 2 klikhaken (achter en voor) van de rechterhelft, 14 lang en 1,6 dik, langs de binnenkant van de wand van de
  //    linkerhelft; onderkant 45° (print zonder support); een nok van 0,6 klikt in een kuiltje van 0,8 in de wand
  //    (inklikken: de haak buigt 0,6 naar binnen); bovenkant 26;
  //  - pilaren: in de rechterhelft tegen de achter- en voorwand aan de naad (9,8 x 7, tot het deksel), dragen de haken en een
  //    schroefbus voor het deksel;
  //  - deksel: de naad 2 verder (x = 112), de rechterhelft heeft een lip van 12 x 1,4 onder de linkerhelft (die daar 1,6 dik
  //    is), in 4 vingers met een nok van 0,5 die in een groef van 0,6 klikt; de linkerhelft print met de buitenkant op het
  //    bed, de rechterhelft met de binnenkant op het bed (zo liggen lip en sponning allebei op het bed of erboven)
  naad: { x: 110, spleet: 0.2,
    lip: { l: 5, b: 16, speling: 0.3, z: [-92, -52, -12, 28, 58] },
    haak: { l: 14, t: 1.6, top: 26, kuil: 0.8, nok: { d: 0.6, ramp: 1.2, l: 3.0, y0: 15, y1: 25 } },
    pilaar: { l: 9.8, d: 7.0 },
    deksel: { x: 112, lap: 12, buiten: 1.6, lip: 1.4, sleuven: [-111, -55.5, 0, 55.5, 111], sleuf: 1.5, nok: { h: 0.5, ramp: 1.2, l: 2.0, b: 20 }, groef: 0.6 } },
  // de rechterhelft: binnen van de naad (110,2) tot x = 323,6 (de modules, opbouw.mjs); buiten 326,0: de doos is van
  // -114,9 tot 326,0 = 440,9 lang. Elke helft blijft binnen 230: links 224,9, rechts 229,8 (met de haken tot 96,2)
  // de membraantules van de rechterhelft: vooraan 3 (naast de MOSFET-modules), achteraan 2 (naast de DC-bus), rechts 4
  // (bij de ingangen van de optocouplerprints); de linkerhelft houdt er 5 links en krijgt er 4 vooraan (samen 18)
  // sleutelgaten rechts op dezelfde z als links (ring 1 en ring 6), 6 mm van de zijwand vrij
  rechts: { x1: 323.6, sleutelgatX: 317, sleutelgatZ: [-95.35, 57.4], modulePaal: { r: 3, h: 5 },
    // versie 6 fase B: een 5de tule rechts (z 88) voor de servokabels van de servoprint -K7
    tules: { voor: [129, 151, 173], achter: [282, 304], rechts: [-80, -36, 10, 54, 88] } },
  // versie 6 fase B: de IR-leerontvanger Vishay TSMP58000 (-B1) achter een venstertje in de voorwand van de rechterhelft,
  // zodat Ian zijn eigen IR-zender ervoor kan houden: venster Ø6 (bovenaan een punt van 45°: print zonder support) op
  // x 262 (tussen de ESP en de regelaar), 25 boven de bodem; de ontvanger staat met de lens naar het venster in een vakje
  // van een blokje tegen de wand (behuizing 5,6 x 6,95 x 5,6 en de lens in het midden: AANNAME, na te meten), de pootjes
  // naar boven (dupont van boven)
  tsmp: { x: 262, y: 25, venster: 6, lichaam: [5.6, 6.95, 5.6], vak: [6.2, 6.0], blok: [9.4, 7.5] },
  links: { tulesVoor: [-80, -52, -24, 4] },
  // DC-chassisbus 5,5 x 2,5 (GlobTek JACK-L-PANEL-8A(R), 50 V / 8 A): flens Ø12,5 x 2,0, lijf 14,4 achter de flens,
  // soldeerlippen 9,7, moer 14 sleutelwijdte; draad afgelezen Ø11,3 -> gat Ø11,5 (AANNAME, na te meten); versie 5: in de
  // achterwand van de rechterhelft boven de WAGO-klemmen (x 223, y 26)
  // Fable 5.2 D9: de 2 zekeringen (-F1 hoofdzekering, -F19 servo's) in een zekeringhouder 5 x 20 voor paneelmontage in de
  // achterwand naast de DC-bus: van buiten te vervangen zonder de doos los te maken. Gat Ø12,5, flens Ø16 x 2 en kap Ø12
  // x 12 buiten, lijf Ø12 x 24 binnen met 2 vlaksteeklippen 4,8 (AANNAME: gangbare houder, na te meten), op y 26 boven
  // de WAGO-klemmen. Fable 5.2 DN2 (2026-11-17): steek 22 (de moeren: tot 17 over de vlakken, 19,6 over de hoeken; op 18
  // raakten ze elkaar) en 6 hoger (y 32): het lijf en de vlakstekers blijven 12 boven de WAGO-klemmen, de hendels gaan open.
  // Een houder voor 10 A (er bestaan versies van 6,3 A), vlaksteekhulzen 4,8 in de bestellijst
  zekering: { gat: 12.5, x: [241, 263], y: 32, moer: 17, flens: 16, flensDik: 2, kap: 12, kapL: 12, lijf: 12, lijfL: 24, lip: 6 },
  dcbus: { gat: 11.5, flens: 12.5, flensDik: 2.0, lijf: 14.4, draad: 11.3, lippen: 9.7, moer: 14, moerDik: 2.0, x: 223, y: 26 },
  // kader van een bordje: de ringwanden zelf (0,3 speling); bordje 16 heeft in zijn bredere ring 2 lage stroken
  kader: { speling: 0.3, h: 3 + 1.6 + 0.3 },
  // het raster van de bordjes (versie 5 zonder kabelgoten, Ian 2026-11-15: "Kabel goten mogen weg"): de rijen staan op
  // dezelfde plaatsen als in versie 4 (de vrije stroken tussen de rijen zijn 9,2 breed: plaats voor de draden en een
  // schroevendraaier); achter 4,8 vrij, links 11 (de sleutelgaten en de tules), rechts 11 tot de naad
  raster: { b: 5.4, achter: 4.8, zij: 11.0, wand: 1.6, speling: 0.3 },
  // de bordjes zijn vastgeschroefd (Ian, 2026-11-15: "ik wil ze geschroefd hebben. Gaten zitten op 2mm op 2mm van de
  // hoeken van het bordje"): per bordje 4 paaltjes Ø5 onder de gaten (hart 2,0 van beide randen; gat in de print Ø2,2:
  // AANNAME, na te meten), schroef 2,0 x 6 zelftappend voor kunststof met bolkop Ø4 x 1,4 (AANNAME); voorgat Ø1,6 (0,8 x d)
  // tot 0,4 boven de onderkant van de bodem: de schroef grijpt 6 - 1,6 = 4,4 diep, het paaltje heeft (5 - 1,6) / 2 = 1,7
  // wand (4 lijnen van 0,4)
  schroefpaal: { rand: 2.0, gat: 2.2, d: 5.0, voorgat: 1.6, schroef: { d: 2.0, l: 6, kern: 1.5, kop: 4.0, kopH: 1.4 } },
  // Fable 5.2 D2/D8 (2026-11-16): oogjes voor een kabelbinder 2,5 x 100 (dikte tot 1,1) als trekontlasting, bij elke tule
  // aan de binnenkant en bij elke module met dupont: 2 sleuven door de bodem (3,0 breed, 1,6 lang) met een brugje van 3,2
  // ertussen en eronder een kanaal van 1,4 diep (de binder ligt verzonken: de bodem ligt tegen de baan). Plat: geen
  // hindernis voor de draden; het kanaal is een brug van 3,0 (print zonder support)
  oog: { sleuf: { b: 3.0, l: 1.6 }, brug: 3.2, kanaal: 1.4, binder: '2,5 x 100' },
  // elk geprint deel hoogstens 230 x 230 (het bed is 256 x 256, rechtsvoor 10 x 20 vrij voor het filamentmes, plus skirt)
  bed: { max: 230, hoog: 80 },
};
