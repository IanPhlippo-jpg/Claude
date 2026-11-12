// Bibliotheek stalen taatsdeuren (Ian, 2026-11-10; eisen in EISEN.md). Eén bron voor alles: de stijlen, de maten,
// de profielen, de staven (zaaglijst), de lasergesneden delen (bogen, taatsplaten), de ruiten (glaslijst) en het
// gewicht. Werkt in Node (model, tekeningen, PDF) en in de browser (configurator). Importeert alleen opties.mjs (gegevens).
// Assen: x naar rechts, y omhoog, mm. Een vleugel heeft zijn oorsprong linksonder; het kozijn ook (op de vloer).

import { OPBOUW, SCHARNIEREN } from './opties.mjs';

// ---------------------------------------------------------------- profielsystemen
// zicht = breedte van voren, diepte = dikte. 'staaf' verwijst naar een staaf in prijzen.mjs (kg/m en prijs per m).
export const SYSTEMEN = {
  koker: {
    naam: 'Koker en strip',
    kader: { zicht: 40, diepte: 40, staaf: 'koker40x40x2', uitleg: 'koker 40x40x2, hoeken in verstek (45°)' },
    roede: { zicht: 30, diepte: 16, staaf: 'plat20x10', lat: 'plat30x3', uitleg: 'kern platstaal 20x10 met voor en achter een lat 30x3 over het glas' },
    glaslat: { staaf: 'plat15x4', achter: 'hoek15x15x3', uitleg: 'glaslat voor: platstaal 15x4, gehecht en gelast; achter: hoeklijn 15x15x3, met M4 verzonken (ISO 10642) om de 250 in de binnenwand van de koker (vloeiboren Ø3,7 en rolltappen M4)' },
    kozijn: { zicht: 40, diepte: 40, staaf: 'koker40x40x2', uitleg: 'koker 40x40x2' },
    boog: { kern: 10, lagenKader: 4, uitleg: 'lasergesneden uit plaat 10 mm; boogroede 20 breed met latten 30x3, boog van het kader 4 lagen = 40 diep' },
    glasMax: 10, kort: '40 x 40',
  },
  systeem: {
    naam: 'Jansen Economy 50 (koopprofielen, binnen, niet geïsoleerd)',
    kader: { zicht: 50, diepte: 50, staaf: 'jansen30407', uitleg: 'Jansen Economy 50, vleugel 30.407 Z (50 x 50, wand 1,5) met glassponning en aanslag' },
    roede: { zicht: 25, diepte: 50, staaf: 'jansen30006', lat: null, uitleg: 'Jansen Economy 50, 30.006 Z (25 x 50) als roede, glaslat aan de andere kant' },
    glaslat: { staaf: 'jansen402', uitleg: 'stalen glaslat Jansen 402.120 Z (20 hoog), vast met tapeinden 450.009' },
    kozijn: { zicht: 50, diepte: 50, staaf: 'jansen30007', uitleg: 'Jansen Economy 50, kozijn 30.007 Z (50 x 50)' },
    boog: { kern: 10, lagenKader: 5, uitleg: 'bogen lasergesneden uit plaat 10 mm met latten (profielen buigen kan alleen bij een walserij)' },
    glasMax: 27, geenVerdekt: true, kort: 'Jansen Economy 50', koop: true, gebruik: 'binnen', Uf: '5,1',
    maxVleugel: { B: 2440, H: 2500, kg: 230 }, leverancier: 'Jansen (Breda): info.belgium@jansen.com',
    verwerking: { zagen: 'Zaag de profielen op een koude cirkelzaag of lintzaag (verstek 45°), ontbramen.', lassen: 'Las de verstekken op de lastafel met MAG of puls-TIG (± 40-60 A, wand 1,5 mm), kort en beurtelings; gebruik een koperen lasmal tegen doorzakken. Slijp de zichtkant vlak.', roeden: 'Las de roeden 30.006 Z stomp tegen het kader (rondom, MAG of puls-TIG), op dezelfde diepte als de sponning.', glas: 'Leg het glas op blokjes in de sponning, glaslatten 402.120 Z op de tapeinden 450.009, dichting 455.027-029.' },
    // Economy 50: glas 5-27 mm bij deuren, 5-35 mm bij ramen; vleugel tot 230 kg, 530-2440 x 1915-2500 (heinze.de); Uf 5,1
  },
  darby: {
    naam: 'Aluminium Du Pont (Darby Doors), geschroefd',
    kader: { zicht: 25, diepte: 50, staaf: 'dupontKoker5025', uitleg: 'koker 50x25x2 alu (0709 RH502520A), 25 in zicht en 50 diep, hoeken in verstek met hoekverbinders' },
    roede: { zicht: 25, diepte: 50, staaf: 'dupontKoker5025', lat: null, uitleg: 'dezelfde koker 50x25x2 als roede, met T-verbinders' },
    glaslat: { staaf: 'dupontL2010', uitleg: 'L-profiel 20x10x2 alu (0709 L201020A) voor en achter rond elke ruit, met kleefkit en RVS-boorschroefjes' },
    kozijn: { zicht: 30, diepte: 60, staaf: 'dupontKoker6030', uitleg: 'koker 60x30x2 alu (0709 RH603020A)' },
    boog: { kern: 10, lagenKader: 5, uitleg: 'geen bogen: aluminiumprofiel buigen kan alleen bij een walserij' },
    glasMax: 10, kort: 'Alu Du Pont', koop: true, alu: true, gebruik: 'binnen', geenBoog: true, geenVerdekt: true, glaslatRondom: 2, pivot: true,
    maxVleugel: { B: 1250, H: 2700, kg: 150 }, leverancier: 'Du Pont bv (Darby Doors), Grobbendonk: webshop.du-pont.be, info@du-pont.be, 03 464 00 91',
    verwerking: {
      zagen: 'Zaag de kokers en L-profielen op een afkortzaag met een aluminiumblad (negatieve spaanhoek), verstek 45°; ontbramen en de zaagsnede ontvetten.',
      lassenTitel: 'Kader samenbouwen (hoekverbinders)', uurHoek: 0.2, proces: 'geschroefd',
      lassen: 'Steek in elke hoek een hoekverbinder in beide kokers, smeer de verstekvlakken in met 2K-lijm of MS-kit, druk de hoek dicht op de lastafel (haakse aanslagen) en zet de stelschroeven vast. Diagonalen gelijk (± 1 mm).',
      roedenTitel: 'Roeden plaatsen (T-verbinders)', uurTee: 0.12,
      roeden: 'Zaag de roede recht op de daglichtmaat. Schuif een T-verbinder in elk uiteinde en zet hem vast met de stelschroef M5 (van de glaszijde). Boor in de stijl een toegangsgat Ø13 in de buitenwand en Ø6,6 in de binnenwand; trek de roede aan met een cilinderkopbout M6 x 30 (ISO 4762) die alleen de binnenwand klemt, en druk een afdekdop Ø13 in het toegangsgat; kit de naad.',
      uurRuit: 0.3,
      glas: 'Kit de vaste L-profielen voor rond elke ruit, leg het glas op blokjes, zet de achterste L-profielen met kit en RVS-boorschroefjes 3,5 mm om de 300 mm.',
      coat: 'Laat de staven in volle lengte coaten vóór het zagen (voorbehandeling voor aluminium: beitsen en conversielaag, dan poedercoat in RAL), samen met andere opdrachten. Na het zagen de zaagsneden bijwerken met de lakstift.',
      taats: 'Monteer de Revolta-pivot: het bovenplaatje in de bovenregel van de vleugel, het bodemplaatje op de vloer; as 100 mm uit de scharnierkant.',
    },
    // geschroefd aluminium (Ian: hoekverbinders en schroeven); profielen en pivots van webshop.du-pont.be
  },
  aanvraag: {
    naam: 'Profielsysteem op maat P1-P4 (aanvraag bij een extrudeur)',
    kader: { zicht: 30, diepte: 45, staaf: 'aanvraagP1', uitleg: 'P1 vleugelprofiel 30 x 45 met glasgleuf 12,4 x 12 diep, hoeken in verstek met hoekverbinder C1' },
    roede: { zicht: 30, diepte: 45, staaf: 'aanvraagP2', lat: null, uitleg: 'P2 roede H 30 x 45 met glasgleuf aan beide kanten en 2 schroefkanalen' },
    glaslat: { staaf: 'aanvraagP4', uitleg: 'P4 U-glasrubber EPDM rond de rand van elke ruit (geen glaslatten)' },
    kozijn: { zicht: 40, diepte: 50, staaf: 'aanvraagP3', uitleg: 'P3 kozijnprofiel 40 x 50' },
    boog: { kern: 10, lagenKader: 5, uitleg: 'geen bogen' },
    glasMin: 8, glasMax: 10, kort: 'Profiel op maat (P1-P4)', koop: true, alu: true, gecoat: true, inloop: 10, gebruik: 'binnen', geenBoog: true, geenVerdekt: true, glaslatRondom: 1, pivot: true, tPrijs: 0.6,
    maxVleugel: { B: 1250, H: 3000, kg: 150 }, leverancier: 'extrudeur volgens het aanvraagdossier (P1-P4, C1, C2)',
    verbinders: { titel: 'Hoekverbinders C1 en schroeven C2 (RVS 4,8 x 50 in het schroefkanaal van P2)', hoek: 'C1 hoekverbinder voor P1 (holte 14,4 x 41,4), aluminium, 2 x 60 mm, 2 stelschroeven M6 per been', tee: 'C2: RVS-schroef 4,8 x 38 met bolkop (ISO 7049) door de gleufbodem van P1 in het schroefkanaal van P2', schroef: null },
    verwerking: {
      zagen: 'Zaag P1 en P3 in verstek 45°, P2 recht op de daglichtmaat; afkortzaag met aluminiumblad. Werk de zaagsneden bij met de lakstift in de RAL-kleur.',
      lassenTitel: 'Kader samenbouwen (hoekverbinder C1)', uurHoek: 0.2, proces: 'geschroefd',
      lassen: 'Steek hoekverbinder C1 in beide stukken P1, 2K-lijm op het verstek, druk de hoek dicht op de lastafel en zet de stelschroeven vast. Diagonalen gelijk (± 1 mm).',
      roedenTitel: 'Roeden plaatsen (schroefkanaal C2)', uurTee: 0.08,
      roeden: 'Boor in de buitenwand van P1 een toegangsgat Ø10 en in de gleufbodem Ø5,5 op de plaats van elke roede; draai een RVS-schroef 4,8 x 38 met bolkop door de gleufbodem in het schroefkanaal van P2 en druk een afdekdop Ø10 in het toegangsgat; kit de naad.',
      uurRuit: 0.2,
      glas: 'Trek het U-glasrubber P4 rond de rand van elke ruit, schuif de ruiten in de gleuven van P1 en P2 voor het laatste kaderstuk sluit (glas mee inbouwen).',
      coat: 'De profielen komen gepoedercoat van de extrudeur: enkel ontvetten, beschermfolie verwijderen en de zaagsneden bijwerken.',
      taats: 'Monteer de pivot: het bovenplaatje in de bovenregel P1, het bodemplaatje op de vloer; as 100 mm uit de scharnierkant.',
    },
  },
  janisol: {
    naam: 'Jansen Janisol Arte 2.0 (koopprofielen, buiten, geïsoleerd)',
    kader: { zicht: 40, diepte: 60, staaf: 'janisol603611', uitleg: 'Janisol Arte 2.0, vleugel 603.611 Z (40 x 60, geïsoleerd)' },
    roede: { zicht: 40, diepte: 60, staaf: 'janisol601615', lat: null, uitleg: 'Janisol Arte 2.0, T-profiel 601.615 Z (40 x 60) als roede' },
    glaslat: { staaf: 'janisol405022', uitleg: 'glaslat 405.022 (15 x 20) met clip 450.026, dichting 455.046' },
    kozijn: { zicht: 40, diepte: 60, staaf: 'janisol602611', uitleg: 'Janisol Arte 2.0, deurkozijn 602.611 Z (40 x 60)' },
    boog: { kern: 10, lagenKader: 6, uitleg: 'geen bogen: een geïsoleerd profiel buigen kan alleen bij Jansen of een walserij' },
    glasMin: 20, glasMax: 47, kort: 'Janisol Arte 2.0', koop: true, gebruik: 'buiten', geenBoog: true, geenVerdekt: true, Uf: '1,9', iso: true,
    maxVleugel: { B: 1250, H: 2500, kg: 150 }, leverancier: 'Jansen (Breda): info.belgium@jansen.com',
    verwerking: { zagen: 'Zaag de profielen op een koude cirkelzaag (verstek 45°); de isolatiekern niet verhitten.', lassen: 'Las enkel de stalen schalen in verstek (de ZF-laag is lasbaar), met puls-TIG of MAG op lage stroom, korte naden en koelen tussendoor zodat de isolatiekern niet smelt. Slijp de zichtkant vlak.', roeden: 'Las de T-profielen 601.615 Z stomp tegen het kader, op de stalen schalen.', glas: 'Isolerend glas (20-47 mm) op blokjes, glaslatten 405.022 met clips 450.026 en schroeven 557.162, dichting 455.046.' },
    // Janisol Arte 2.0: glas 20-47 mm, vleugel tot 1250 x 2500 en 150 kg, scharnieren 3D opschroef; Uf vanaf 1,9 (jansen.com)
  },
  forster: {
    naam: 'Forster unico (koopprofielen, buiten, geïsoleerd)',
    kader: { zicht: 65, diepte: 70, staaf: 'forster533751', uitleg: 'Forster unico, vleugel 533.751 (65 x 70, geïsoleerd)' },
    roede: { zicht: 60, diepte: 70, staaf: 'forster531722', lat: null, uitleg: 'Forster unico, T-profiel 531.722 (60 x 70) als roede' },
    glaslat: { staaf: 'forster901227', uitleg: 'glaslat 901227 (20 hoog) met clips 906577, droog beglazen' },
    kozijn: { zicht: 90, diepte: 70, staaf: 'forster531755', uitleg: 'Forster unico, deurkozijn 531.755 (90 x 70)' },
    boog: { kern: 10, lagenKader: 7, uitleg: 'geen bogen: een geïsoleerd profiel buigen kan alleen bij Forster of een walserij' },
    glasMin: 20, glasMax: 54.5, kort: 'Forster unico', koop: true, gebruik: 'buiten', geenBoog: true, geenVerdekt: true, Uf: '2,4', iso: true,
    maxVleugel: { B: 1440, H: 3040, kg: 150 }, leverancier: 'Forster Belux (Reynaers, Duffel): info.belux@forstersystems.com',
    verwerking: { zagen: 'Zaag de profielen op een koude cirkelzaag of lintzaag (verstek 45°), schuin afkanten (45°) voor het lassen.', lassen: 'Las de verstekken met de Forster-lasmal (989210 met afstandsplaat 909215) op schragen of de lastafel: MAG of puls-TIG ± 40 A (wand 1,5 mm), enkel de stalen schalen, daarna vlak slijpen.', roeden: 'Las de T-profielen 531.722 stomp tegen het kader, op de stalen schalen.', glas: 'Isolerend glas (20-54,5 mm) droog beglazen: glaslat 901227 met clips 906577 en de dichtingen uit het systeem.' },
    // Forster unico: glas 20-54,5 mm, vleugel tot 1440 x 3040, hoeken in verstek gelast (forster-profile.ch, 988320); Uf deur 2,4
  },
  koker60: {
    naam: 'Koker 40 x 60 (diep, voor dubbel glas)',
    kader: { zicht: 40, diepte: 60, staaf: 'koker60x40x2', uitleg: 'koker 60x40x2, 40 in zicht en 60 diep, hoeken in verstek (45°)' },
    roede: { zicht: 30, diepte: 16, staaf: 'plat20x10', lat: 'plat30x3', uitleg: 'kern platstaal 20x10 met voor en achter een lat 30x3 over het glas' },
    glaslat: { staaf: 'plat15x4', achter: 'hoek15x15x3', uitleg: 'glaslat voor: platstaal 15x4, gehecht en gelast; achter: hoeklijn 15x15x3, met M4 verzonken (ISO 10642) om de 250 in de binnenwand van de koker (vloeiboren Ø3,7 en rolltappen M4)' },
    kozijn: { zicht: 40, diepte: 60, staaf: 'koker60x40x2', uitleg: 'koker 60x40x2, 60 diep' },
    boog: { kern: 10, lagenKader: 6, uitleg: 'lasergesneden uit plaat 10 mm; boog van het kader 6 lagen = 60 diep' },
    glasMax: 30, kort: '40 x 60',
  },
  breed: {
    naam: 'Koker 60 x 40 (breed, voor verdekte scharnieren)',
    kader: { zicht: 60, diepte: 40, staaf: 'koker60x40x2', uitleg: 'koker 60x40x2, 60 in zicht en 40 diep: plaats voor het verdekte scharnier (36 mm in de stijl)' },
    roede: { zicht: 30, diepte: 16, staaf: 'plat20x10', lat: 'plat30x3', uitleg: 'kern platstaal 20x10 met voor en achter een lat 30x3 over het glas' },
    glaslat: { staaf: 'plat15x4', achter: 'hoek15x15x3', uitleg: 'glaslat voor: platstaal 15x4, gehecht en gelast; achter: hoeklijn 15x15x3, met M4 verzonken (ISO 10642) om de 250 in de binnenwand van de koker (vloeiboren Ø3,7 en rolltappen M4)' },
    kozijn: { zicht: 60, diepte: 40, staaf: 'koker60x40x2', uitleg: 'koker 60x40x2, 60 in zicht: plaats voor het kozijndeel van het scharnier (33 mm)' },
    boog: { kern: 10, lagenKader: 4, uitleg: 'lasergesneden uit plaat 10 mm; boog van het kader 4 lagen = 40 diep, 60 breed' },
    glasMax: 10, kort: '60 x 40',
  },
  breeddiep: {
    naam: 'Koker 60 x 60 (breed en diep)',
    kader: { zicht: 60, diepte: 60, staaf: 'koker60x60x2', uitleg: 'koker 60x60x2: verdekte scharnieren en dubbel glas' },
    roede: { zicht: 30, diepte: 16, staaf: 'plat20x10', lat: 'plat30x3', uitleg: 'kern platstaal 20x10 met voor en achter een lat 30x3 over het glas' },
    glaslat: { staaf: 'plat15x4', achter: 'hoek15x15x3', uitleg: 'glaslat voor: platstaal 15x4, gehecht en gelast; achter: hoeklijn 15x15x3, met M4 verzonken (ISO 10642) om de 250 in de binnenwand van de koker (vloeiboren Ø3,7 en rolltappen M4)' },
    kozijn: { zicht: 60, diepte: 60, staaf: 'koker60x60x2', uitleg: 'koker 60x60x2' },
    boog: { kern: 10, lagenKader: 6, uitleg: 'lasergesneden uit plaat 10 mm; boog van het kader 6 lagen = 60 diep, 60 breed' },
    glasMax: 30, kort: '60 x 60',
  },
};

/** roede voor dubbel glas (eigen kokers): de kern is zo diep als het glas */
const ROEDE_DUBBEL = { zicht: 30, diepte: 36, staaf: 'koker30x20x2', lat: 'plat30x3', uitleg: 'kern koker 30x20x2 (30 diep, zo dik als het dubbel glas) met voor en achter een lat 30x3' };
export const scharnierSoort = (k) => SCHARNIEREN[k]?.soort ?? 'pivot';
/** past het glas in het profiel, en is er plaats voor het scharnier? */
export function systeemPast(key, { opbouw = 'enkel', scharnier = 'budget', stijl = null } = {}) {
  const s = SYSTEMEN[key];
  if (!s) return false;
  const dikte = OPBOUW[opbouw].dikte;
  if (dikte > s.glasMax || dikte < (s.glasMin ?? 0)) return false;
  if (s.geenBoog && stijl && heeftBoog(stijl)) return false;
  // verdekt vraagt een stijl van 60 breed; de koopprofielen zijn taatsdeuren (pivot)
  return scharnierSoort(scharnier) !== 'verdekt' || (s.kader.zicht >= 60 && !s.geenVerdekt);
}
export const heeftBoog = (s) => s.boven !== 'recht' || s.vorm === 'volleBoog' || !!s.zon;

/** het profiel: het gekozen als het past, anders het lichtste dat past (koker 40x40, 40x60, 60x40, 60x60) */
export function kiesSysteem(k = {}) {
  if (k.systeem && k.systeem !== 'auto' && systeemPast(k.systeem, k)) return k.systeem;
  // buiten: een geïsoleerd koopprofiel (als de stijl kan: geen bogen); anders of binnen: de lichtste koker die past
  if (k.gebruik === 'buiten') { const b = ['janisol', 'forster'].find((x) => systeemPast(x, k)); if (b) return b; }
  return ['koker', 'koker60', 'breed', 'breeddiep'].find((x) => systeemPast(x, k)) ?? 'breeddiep';
}

// ---------------------------------------------------------------- de stijlen
// Een stijl is een combinatie van bouwstenen (alle breuken binnen de dagmaat van het kader):
//   boven: 'recht' | 'poten' (boog met poten binnen het kader) | 'kalf' (boog die op een kalf aanzet) | 'vol' (deur rond bovenaan)
//   v: verticale roeden (breuken van de breedte), h: horizontale roeden (breuken van de hoogte onder het kalf of de boog)
//   boogV: verticale roeden in de boog, zon: aantal stralen in de boog (art deco), kalf: false = volle boog zonder kalf
//   paneel: het onderste vak is een stalen paneel (plaat 3 mm) in plaats van glas; vleugels: 1 of 2; zijlicht: vast zijlicht
const D3 = [1 / 3, 2 / 3], D4 = [0.25, 0.5, 0.75], D5 = [0.2, 0.4, 0.6, 0.8], D6 = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6];
const S = (id, naam, groep, uitleg, def = {}) => ({ id, naam, groep, uitleg, vleugels: 1, boven: 'recht', v: [], h: [], boogV: [], zon: 0, paneel: false, vak: null, ...def, std: def.std ?? { B: def.vleugels === 2 ? 1700 : def.zijlicht ? 1450 : 1000, H: def.vorm === 'volleBoog' ? 2500 : 2400 } });
const VOL = { boven: 'vol', vorm: 'volleBoog' };
// vrije vakverdeling (vak): V = verticaal splitsen (links -> rechts), Hs = horizontaal (onder -> boven); kinderen: null =
// glas, 'P' = paneel, of weer een verdeling. Breuken gelden binnen het vak dat gesplitst wordt.
const V = (f, k) => ({ r: 'v', f, k }), Hs = (f, k) => ({ r: 'h', f, k }), Pn = 'P';
export const STIJLEN = [
  S('strak', 'Strak', 'Recht', 'Eén groot glasvlak in een slank kader. Minimalistisch en het snelst te maken.'),
  S('drievak', 'Drie vakken', 'Recht', 'Twee horizontale roeden: de klassieke industriële deur.', { h: D3 }),
  S('raster', 'Raster acht', 'Raster', 'Eén verticale en drie horizontale roeden: acht vakken.', { v: [0.5], h: D4 }),
  S('japandi', 'Japandi', 'Recht', 'Drie smalle verticale roeden: rustig, hoog en slank.', { v: D4, std: { B: 1000, H: 2600 } }),
  S('boog', 'Boog', 'Boog', 'Een boog met poten binnen het kader en een kalf op de aanzet, zoals de deur op de foto.', { boven: 'poten' }),
  S('boograster', 'Boog met raster', 'Boog', 'Een boog die op het kader aanzet, met een middenroede en horizontale roeden.', { boven: 'kalf', v: [0.5], h: D3, boogV: [0.5] }),
  S('volleboog', 'Volle boog', 'Volle boog', 'De deur is rond bovenaan, met een rond kozijn, voor een boogvormige opening.', { ...VOL, h: D3, boogV: [0.5] }),
  S('artdeco', 'Art deco', 'Art deco', 'Een halve zon bovenaan: boog, een kleine binnenboog en vijf stralen.', { boven: 'kalf', h: [0.38], zon: 5 }),
  S('dubbelboog', 'Dubbele deur met boog', 'Dubbel', 'Twee taatsvleugels met één grote boog over beide, zoals de foto.', { vleugels: 2, boven: 'poten', std: { B: 1700, H: 2600 } }),
  S('zijlicht', 'Deur met zijlicht', 'Zijlicht', 'Een deur met drie vakken en een vast zijlicht met dezelfde roeden.', { zijlicht: true, h: D3 }),
  // ---- recht
  S('tweevak', 'Twee vakken', 'Recht', 'Eén roede op halve hoogte: eenvoudig en evenwichtig.', { h: [0.5] }),
  S('viervak', 'Vier vakken', 'Recht', 'Drie horizontale roeden op gelijke afstand.', { h: D4 }),
  S('vijfvak', 'Vijf vakken', 'Recht', 'Vier horizontale roeden: een hoge, ritmische deur.', { h: D5 }),
  S('ladder', 'Ladder', 'Recht', 'Vijf horizontale roeden: zes lage vakken, zoals een ladder.', { h: D6 }),
  S('bovenlicht', 'Bovenlicht', 'Recht', 'Eén roede hoog in de deur: een groot vak met een bovenlicht.', { h: [0.8] }),
  S('kalflaag', 'Laag kalf', 'Recht', 'Eén roede op een derde: een hoog glasvlak boven een laag vak.', { h: [0.3] }),
  S('japandi2', 'Japandi twee', 'Recht', 'Twee verticale roeden: drie hoge, smalle vakken.', { v: D3, std: { B: 1000, H: 2600 } }),
  S('japandi5', 'Japandi vijf', 'Recht', 'Vier verticale roeden: vijf slanke vakken, als een kamerscherm.', { v: D5, std: { B: 1000, H: 2600 } }),
  // ---- raster
  S('kruis', 'Kruis', 'Raster', 'Eén verticale en één horizontale roede: vier grote vakken.', { v: [0.5], h: [0.5] }),
  S('raster6', 'Raster zes', 'Raster', 'Eén verticale en twee horizontale roeden: zes vakken.', { v: [0.5], h: D3 }),
  S('raster10', 'Raster tien', 'Raster', 'Eén verticale en vier horizontale roeden: tien vakken.', { v: [0.5], h: D5 }),
  S('raster12', 'Raster twaalf', 'Raster', 'Twee verticale en drie horizontale roeden: twaalf vakken.', { v: D3, h: D4 }),
  S('fabriek', 'Fabriek', 'Raster', 'Twee verticale en vijf horizontale roeden: achttien kleine vakken, zoals oude fabrieksramen.', { v: D3, h: D6 }),
  // ---- paneel onderaan
  S('paneel', 'Paneel onderaan', 'Paneel', 'Een stalen paneel onderaan en één groot glasvlak erboven: stevig tegen stoten.', { h: [0.3], paneel: true }),
  S('paneeldrie', 'Paneel en twee vakken', 'Paneel', 'Een stalen paneel onderaan en twee glasvakken erboven.', { h: [0.3, 0.65], paneel: true }),
  S('paneelraster', 'Paneel met raster', 'Paneel', 'Een stalen paneel onderaan en een raster van zes vakken erboven.', { v: [0.5], h: [0.3, 0.53, 0.77], paneel: true }),
  S('paneeljapandi', 'Paneel Japandi', 'Paneel', 'Een stalen paneel onderaan met drie smalle verticale vakken erboven.', { v: D4, h: [0.3], paneel: true, std: { B: 1000, H: 2600 } }),
  S('paneelladder', 'Paneel met ladder', 'Paneel', 'Een stalen paneel onderaan en vier lage glasvakken erboven.', { h: [0.3, 0.475, 0.65, 0.825], paneel: true }),
  // ---- boog met poten
  S('boogroeden', 'Boog met roeden', 'Boog', 'De boog met poten, en twee horizontale roeden die over de hele breedte lopen.', { boven: 'poten', h: D3 }),
  S('boogpaneel', 'Boog met paneel', 'Boog', 'De boog met poten boven een stalen paneel.', { boven: 'poten', h: [0.3], paneel: true }),
  // ---- boog op een kalf
  S('kalfboog', 'Boog op kalf', 'Boog', 'Een boog die op een kalf aanzet, met daaronder één groot glasvlak.', { boven: 'kalf' }),
  S('kalfmidden', 'Boog met middenroede', 'Boog', 'Een boog op een kalf, met een middenroede in de boog.', { boven: 'kalf', boogV: [0.5] }),
  S('kalfdrievak', 'Boog en drie vakken', 'Boog', 'Een boog op een kalf boven drie horizontale vakken.', { boven: 'kalf', h: D3 }),
  S('kathedraal', 'Kathedraal', 'Boog', 'Drie verticale roeden die doorlopen tot in de boog, zoals een kerkraam.', { boven: 'kalf', v: D4, boogV: D4, std: { B: 1000, H: 2600 } }),
  S('kalfpaneel', 'Boog op kalf met paneel', 'Boog', 'Een boog op een kalf met middenroede, boven een stalen paneel.', { boven: 'kalf', h: [0.35], boogV: [0.5], paneel: true }),
  S('kalfraster', 'Boog met raster twaalf', 'Boog', 'Een boog op een kalf met twee roeden erin, boven een raster van twaalf vakken.', { boven: 'kalf', v: D3, h: D4, boogV: D3 }),
  // ---- art deco (zon)
  S('zon3', 'Zon met drie stralen', 'Art deco', 'Een halve zon met drie stralen boven een groot glasvlak.', { boven: 'kalf', zon: 3 }),
  S('zon7', 'Zon met zeven stralen', 'Art deco', 'Een halve zon met zeven stralen boven een raster van zes vakken.', { boven: 'kalf', zon: 7, v: [0.5], h: D3 }),
  S('zonpaneel', 'Art deco met paneel', 'Art deco', 'Een halve zon met vijf stralen boven een stalen paneel.', { boven: 'kalf', zon: 5, h: [0.3], paneel: true }),
  // ---- volle boog
  S('volstrak', 'Volle boog strak', 'Volle boog', 'Een ronde deur zonder roeden: één glasvlak tot in de boog.', { ...VOL, kalf: false }),
  S('volroeden', 'Volle boog met roeden', 'Volle boog', 'Een ronde deur met drie horizontale roeden; het bovenste vak loopt door in de boog.', { ...VOL, kalf: false, h: D4 }),
  S('volraster', 'Volle boog raster', 'Volle boog', 'Een ronde deur met een raster van acht vakken en een middenroede in de boog.', { ...VOL, v: [0.5], h: D4, boogV: [0.5] }),
  S('volzon', 'Volle boog met zon', 'Volle boog', 'Een ronde deur met een halve zon van vijf stralen in de boog.', { ...VOL, zon: 5, h: [0.5] }),
  S('volpaneel', 'Volle boog met paneel', 'Volle boog', 'Een ronde deur met een stalen paneel onderaan.', { ...VOL, h: [0.3, 0.65], boogV: [0.5], paneel: true }),
  // ---- dubbel
  S('dubbelstrak', 'Dubbele deur strak', 'Dubbel', 'Twee taatsvleugels met elk één groot glasvlak.', { vleugels: 2 }),
  S('dubbeldrievak', 'Dubbele deur, drie vakken', 'Dubbel', 'Twee taatsvleugels met elk twee horizontale roeden.', { vleugels: 2, h: D3 }),
  S('dubbelraster', 'Dubbele deur raster', 'Dubbel', 'Twee taatsvleugels met elk een raster van acht vakken.', { vleugels: 2, v: [0.5], h: D4 }),
  S('dubbelkalf', 'Dubbele deur, twee bogen', 'Dubbel', 'Twee taatsvleugels met elk een boog op een kalf en drie vakken.', { vleugels: 2, boven: 'kalf', boogV: [0.5], h: D3, std: { B: 1700, H: 2600 } }),
  // ---- zijlicht
  S('zijlichtraster', 'Zijlicht met raster', 'Zijlicht', 'Een deur met een raster van acht vakken en een zijlicht met dezelfde roeden.', { zijlicht: true, v: [0.5], h: D4 }),
  S('zijlichtpaneel', 'Zijlicht met paneel', 'Zijlicht', 'Een deur met een stalen paneel onderaan; het zijlicht heeft het paneel en de roeden mee.', { zijlicht: true, h: [0.3, 0.65], paneel: true }),
  // ======== TD-51 tot TD-100
  // ---- asymmetrisch (vrije vakverdeling)
  S('mondriaan', 'Mondriaan', 'Asymmetrisch', 'Vakken van verschillende grootte, zoals een schilderij van Mondriaan.', { vak: Hs([0.3], [V([0.6]), V([0.35], [Hs([0.55]), null])]) }),
  S('hoekvakken', 'Hoekvakken', 'Asymmetrisch', 'Eén groot glasvlak met bovenaan twee kleine vakken.', { vak: Hs([0.75], [null, V([0.5])]) }),
  S('bovendrie', 'Bovenlicht in drie', 'Asymmetrisch', 'Een groot glasvlak met een bovenlicht in drie vakken.', { vak: Hs([0.8], [null, V(D3)]) }),
  S('onderdrie', 'Drie onderaan', 'Asymmetrisch', 'Drie kleine vakken onderaan, daarboven één groot glasvlak.', { vak: Hs([0.25], [V(D3), null]) }),
  S('ladderzij', 'Ladder opzij', 'Asymmetrisch', 'Een smalle strook met vijf vakjes naast een groot glasvlak.', { vak: V([0.3], [Hs(D5), null]) }),
  S('venster', 'Venster', 'Asymmetrisch', 'Drie zones: een groot vak, een middenband in twee, en een bovenlicht.', { vak: Hs([0.3, 0.75], [null, V([0.5]), null]) }),
  S('trap', 'Trap', 'Asymmetrisch', 'Drie banden met de verticale roede telkens verder naar rechts, zoals een trap.', { vak: Hs(D3, [V([0.25]), V([0.5]), V([0.75])]) }),
  S('kaderinkader', 'Kader in kader', 'Asymmetrisch', 'Een groot middenvak met een smalle rand van glasvakken errond.', { vak: Hs([0.12, 0.88], [null, V([0.15, 0.85]), null]) }),
  // ---- paneel met vrije verdeling
  S('paneelmondriaan', 'Paneel Mondriaan', 'Paneel', 'Een stalen paneel onderaan met vakken van verschillende grootte erboven.', { vak: Hs([0.3], [Pn, V([0.6], [null, Hs([0.5])])]) }),
  S('paneelvenster', 'Paneel en venster', 'Paneel', 'Een stalen paneel, een middenband in twee en een groot bovenvak.', { vak: Hs([0.3, 0.6], [Pn, V([0.5]), null]) }),
  S('paneeltrap', 'Paneel met trap', 'Paneel', 'Een stalen paneel met drie banden erboven, de roede telkens verder opzij.', { vak: Hs([0.3, 0.53, 0.77], [Pn, V([0.25]), V([0.5]), V([0.75])]) }),
  S('lambrisering', 'Lambrisering', 'Paneel', 'Twee stalen panelen boven elkaar onderaan en een groot glasvlak erboven.', { vak: Hs([0.2, 0.4], [Pn, Pn, null]) }),
  // ---- recht en raster
  S('hoograster', 'Raster boven', 'Raster', 'Onderaan één glasvlak, bovenaan een raster van zes vakken.', { vak: Hs([0.5], [null, V([0.5], [Hs(D3), Hs(D3)])]) }),
  S('smallevakken', 'Smalle vakken', 'Raster', 'Vier verticale roeden en één horizontale: tien smalle vakken.', { v: D5, h: [0.5] }),
  S('drievert', 'Drie hoog', 'Raster', 'Twee verticale roeden en één horizontale: zes hoge vakken.', { v: D3, h: [0.5] }),
  S('raster16', 'Raster zestien', 'Raster', 'Drie verticale en drie horizontale roeden: zestien vakken.', { v: D4, h: D4 }),
  S('raster20', 'Raster twintig', 'Raster', 'Drie verticale en vier horizontale roeden: twintig kleine vakken.', { v: D4, h: D5 }),
  S('japandiboven', 'Japandi met bovenlicht', 'Recht', 'Drie smalle verticale roeden met een open bovenlicht.', { vak: Hs([0.8], [V(D4), null]), std: { B: 1000, H: 2600 } }),
  // ---- boog met poten
  S('boogpaneelroeden', 'Boog met paneel en roeden', 'Boog', 'De boog met poten, een stalen paneel onderaan en een roede erboven.', { boven: 'poten', h: [0.3, 0.6], paneel: true }),
  S('boogvier', 'Boog met vier vakken', 'Boog', 'De boog met poten en drie horizontale roeden.', { boven: 'poten', h: D4 }),
  S('booglaag', 'Boog met één roede', 'Boog', 'De boog met poten en één roede op halve hoogte.', { boven: 'poten', h: [0.5] }),
  // ---- boog op een kalf
  S('kalfjapandi', 'Boog met Japandi', 'Boog', 'Een boog op een kalf boven drie smalle verticale vakken.', { boven: 'kalf', v: D4 }),
  S('kalfkruis', 'Boog met kruis', 'Boog', 'Een boog op een kalf met middenroede, boven vier grote vakken.', { boven: 'kalf', v: [0.5], h: [0.5], boogV: [0.5] }),
  S('kalfmondriaan', 'Boog en Mondriaan', 'Boog', 'Een boog op een kalf boven vakken van verschillende grootte.', { boven: 'kalf', vak: Hs([0.4], [null, V([0.6])]), boogV: [0.6] }),
  S('kathedraalpaneel', 'Kathedraal met paneel', 'Boog', 'De kathedraal: roeden tot in de boog, boven een stalen paneel.', { boven: 'kalf', v: D4, boogV: D4, h: [0.25], paneel: true, std: { B: 1000, H: 2600 } }),
  S('kalfladder', 'Boog met ladder', 'Boog', 'Een boog op een kalf boven zes lage vakken.', { boven: 'kalf', h: D6 }),
  S('zonraster12', 'Zon met raster twaalf', 'Art deco', 'Een halve zon met vijf stralen boven een raster van twaalf vakken.', { boven: 'kalf', zon: 5, v: D3, h: D4 }),
  // ---- art deco
  S('zon9', 'Zon met negen stralen', 'Art deco', 'Een halve zon met negen fijne stralen boven twee vakken.', { boven: 'kalf', zon: 9, h: [0.4] }),
  S('zonjapandi', 'Zon met Japandi', 'Art deco', 'Een halve zon boven drie smalle verticale vakken.', { boven: 'kalf', zon: 5, v: D4 }),
  S('zonpaneelraster', 'Zon met paneel en raster', 'Art deco', 'Een halve zon met drie stralen, een raster en een stalen paneel.', { boven: 'kalf', zon: 3, v: [0.5], h: [0.3, 0.65], paneel: true }),
  // ---- volle boog
  S('volkathedraal', 'Volle boog kathedraal', 'Volle boog', 'Een ronde deur met drie roeden die doorlopen tot in de boog.', { ...VOL, v: D4, boogV: D4, std: { B: 1000, H: 2600 } }),
  S('voljapandi', 'Volle boog Japandi', 'Volle boog', 'Een ronde deur met twee verticale roeden, ook in de boog.', { ...VOL, v: D3, boogV: D3 }),
  S('volladder', 'Volle boog ladder', 'Volle boog', 'Een ronde deur met zes lage vakken onder de boog.', { ...VOL, h: D6 }),
  S('volzonpaneel', 'Volle boog, zon en paneel', 'Volle boog', 'Een ronde deur met een kleine zon in de boog en een stalen paneel.', { ...VOL, zon: 3, h: [0.3, 0.65], paneel: true }),
  S('volmondriaan', 'Volle boog Mondriaan', 'Volle boog', 'Een ronde deur met vakken van verschillende grootte.', { ...VOL, vak: Hs([0.35], [V([0.6]), null]), boogV: [0.6] }),
  // ---- dubbel
  S('dubbeljapandi', 'Dubbele deur Japandi', 'Dubbel', 'Twee taatsvleugels met elk twee smalle verticale roeden.', { vleugels: 2, v: D3, std: { B: 1700, H: 2600 } }),
  S('dubbelpaneel', 'Dubbele deur met paneel', 'Dubbel', 'Twee taatsvleugels met een stalen paneel onderaan en twee glasvakken.', { vleugels: 2, h: [0.3, 0.65], paneel: true }),
  S('dubbelzon', 'Dubbele deur met zon', 'Dubbel', 'Twee taatsvleugels met elk een halve zon in art deco.', { vleugels: 2, boven: 'kalf', zon: 5, h: [0.38], std: { B: 1700, H: 2600 } }),
  S('dubbelkathedraal', 'Dubbele kathedraal', 'Dubbel', 'Twee taatsvleugels met roeden die doorlopen tot in hun boog.', { vleugels: 2, boven: 'kalf', v: D3, boogV: D3, std: { B: 1700, H: 2600 } }),
  S('dubbelmondriaan', 'Dubbele Mondriaan', 'Dubbel', 'Twee taatsvleugels met vrije vakken, de ene het spiegelbeeld van de andere.', { vleugels: 2, spiegel: true, vak: Hs([0.3], [V([0.6]), V([0.35], [Hs([0.55]), null])]) }),
  S('dubbelboogroeden', 'Dubbele deur, boog met roeden', 'Dubbel', 'Twee taatsvleugels met één grote boog en twee roeden over de hele breedte.', { vleugels: 2, boven: 'poten', h: D3, std: { B: 1700, H: 2600 } }),
  S('dubbelladder', 'Dubbele deur ladder', 'Dubbel', 'Twee taatsvleugels met elk zes lage vakken.', { vleugels: 2, h: D6 }),
  S('dubbelraster12', 'Dubbele deur raster twaalf', 'Dubbel', 'Twee taatsvleugels met elk een raster van twaalf vakken.', { vleugels: 2, v: D3, h: D4 }),
  // ---- zijlichten
  S('zijlichtstrak', 'Zijlicht strak', 'Zijlicht', 'Een strakke deur met een vast zijlicht in één glasvlak.', { zijlicht: true }),
  S('zijlichtkalf', 'Zijlicht met boog', 'Zijlicht', 'Een deur met een boog op een kalf; het zijlicht heeft het kalf en de roeden mee.', { zijlicht: true, boven: 'kalf', boogV: [0.5], h: D3 }),
  S('tweezijlichten', 'Twee zijlichten', 'Zijlicht', 'Een deur met drie vakken tussen twee vaste zijlichten.', { zijlicht: 'beide', h: D3, std: { B: 1900, H: 2400 } }),
  S('tweezijlichtenraster', 'Twee zijlichten raster', 'Zijlicht', 'Een deur met een raster van acht vakken tussen twee zijlichten.', { zijlicht: 'beide', v: [0.5], h: D4, std: { B: 1900, H: 2400 } }),
  // ---- vast bovenlicht (hoge openingen)
  S('bovenlichtvast', 'Deur met vast bovenlicht', 'Bovenlicht', 'Een deur met drie vakken onder een vast bovenlicht in het kozijn: voor hoge openingen.', { bovenlicht: 500, h: D3, std: { B: 1000, H: 3000 } }),
  S('bovenlichtraster', 'Bovenlicht en raster', 'Bovenlicht', 'Een deur met een raster van acht vakken; het vaste bovenlicht heeft de middenroede mee.', { bovenlicht: 500, v: [0.5], h: D4, std: { B: 1000, H: 3000 } }),
  S('bovenlichtboog', 'Boog met vast bovenlicht', 'Bovenlicht', 'Een deur met een boog op een kalf onder een vast bovenlicht.', { bovenlicht: 500, boven: 'kalf', boogV: [0.5], h: D3, std: { B: 1000, H: 3000 } }),
];
export const GROEPEN = [...new Set(STIJLEN.map((s) => s.groep))];
export const GRENZEN = { B: [700, 2400], H: [1900, 3200] };
/** kleinste breedte en hoogte van de opening voor een stijl */
export const minMaat = (s) => ({ B: s.vleugels === 2 ? 1300 : s.zijlicht === 'beide' ? 1500 : s.zijlicht ? 1100 : GRENZEN.B[0], H: s.bovenlicht ? 2600 : GRENZEN.H[0] });

// ---------------------------------------------------------------- vaste maten (mm)
export const MATEN = {
  montage: 5, // speling opening - kozijn (zijkanten en boven)
  speling: 4, // vleugel - kozijn (zijkant en boven) en tussen twee vleugels
  vloer: 10, // vrij onder de vleugel (taatspot in de vloer)
  taats: 100, // hart taatsas tot de scharnierkant van de vleugel
  zijlicht: 400, // zijlicht: buitenkant kozijn tot hart tussenstijl
  greep: { lengte: 800, hoogte: 1050, afstand: 20, d: 25, voet: 40 }, // greep Ø25 op het hart van de staander (20 uit de sluitkant), 2 voeten van 40
  poot: 110, // boog: afstand van de poten tot het kader
  topBoog: 110, // boog: vrije ruimte boven de boog
  inloop: 6, // glas loopt 6 mm onder de lat of in de sponning, 2 mm speling rondom
};

// ---------------------------------------------------------------- vlakke meetkunde
const rad = (g) => (g * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const opp2 = (p) => p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0) / 2;
export const opp = (p) => Math.abs(opp2(p));
export const kaderVan = (p) => p.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);
export const rechthoek = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
export const cirkelVh = (c, r, n, g0, g1) => Array.from({ length: n + 1 }, (_, i) => { const a = rad(g0 + ((g1 - g0) * i) / n); return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; });
/** Sutherland-Hodgman: veelhoek p knippen met een convexe veelhoek k (tegen de klok) */
function knipConvex(p, k) {
  let uit = p;
  const zijde = (a, b, q) => (b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]);
  for (let i = 0; i < k.length && uit.length; i++) {
    const a = k[i], b = k[(i + 1) % k.length], inp = uit;
    uit = [];
    for (let j = 0; j < inp.length; j++) {
      const c = inp[j], d = inp[(j + 1) % inp.length], zc = zijde(a, b, c), zd = zijde(a, b, d);
      const snij = () => { const t = zc / (zc - zd); return [c[0] + t * (d[0] - c[0]), c[1] + t * (d[1] - c[1])]; };
      if (zd >= -1e-9) { if (zc < -1e-9) uit.push(snij()); uit.push(d); } else if (zc >= -1e-9) uit.push(snij());
    }
  }
  return uit;
}
/** het deel van p binnen de schijf (c, r) */
const binnenSchijf = (p, c, r) => knipConvex(p, cirkelVh(c, r, 240, 0, 360).slice(0, -1));
function puntIn(q, p) {
  let c = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > q[1]) !== (p[j][1] > q[1]) && q[0] < ((p[j][0] - p[i][0]) * (q[1] - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
  return c;
}
/**
 * het deel van een convexe p buiten de schijf (c, r): de rand van p fijn bemonsterd, en de punten binnen de schijf
 * naar de cirkel geprojecteerd (werkt ook waar de cirkel een hoek of een zijde raakt)
 */
function buitenSchijf(p, c, r, stap = 3) {
  const uit = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / stap));
    for (let k = 0; k < n; k++) {
      const q = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n], d = Math.hypot(q[0] - c[0], q[1] - c[1]);
      uit.push(d < r ? [c[0] + ((q[0] - c[0]) * r) / d, c[1] + ((q[1] - c[1]) * r) / d] : q);
    }
  }
  // dubbele en rechte tussenpunten weg
  const schoon = [];
  for (const q of uit) { const v = schoon[schoon.length - 1]; if (!v || Math.hypot(q[0] - v[0], q[1] - v[1]) > 0.05) schoon.push(q); }
  const dun = schoon.filter((q, i) => { const a = schoon[(i - 1 + schoon.length) % schoon.length], b = schoon[(i + 1) % schoon.length]; return Math.abs((q[0] - a[0]) * (b[1] - a[1]) - (q[1] - a[1]) * (b[0] - a[0])) > 1e-3 * Math.hypot(b[0] - a[0], b[1] - a[1]) ** 2 || Math.hypot(b[0] - a[0], b[1] - a[1]) > 40; });
  return dun.length >= 3 ? dun : [];
}
/** halfvlak links van de straal uit c onder hoek g (tegen de klok), d/2 opzij geschoven als 'schuif' */
function halfvlak(c, g, d, links) {
  const u = [Math.cos(rad(g)), Math.sin(rad(g))], n = links ? [-u[1], u[0]] : [u[1], -u[0]];
  const o = [c[0] + n[0] * d / 2 - u[0] * 5000, c[1] + n[1] * d / 2 - u[1] * 5000], e = [c[0] + n[0] * d / 2 + u[0] * 5000, c[1] + n[1] * d / 2 + u[1] * 5000];
  const v = [o, e, [e[0] + n[0] * 9000, e[1] + n[1] * 9000], [o[0] + n[0] * 9000, o[1] + n[1] * 9000]];
  return opp2(v) > 0 ? v : v.reverse();
}
/** één ruit: een rechthoek [x0,x1] x [y0,ys] met erboven het deel van de schijf (c, r) tussen x0 en x1 */
function rechtMetBoog(x0, x1, y0, ys, c, r) {
  const top = binnenSchijf(rechthoek(x0, ys, x1, ys + r + 10), c, r), n = top.length;
  // vanaf het hoekpunt rechts op de aanzet tegen de klok tot het hoekpunt links op de aanzet
  const op = top.map((q, i) => [q, i]).filter(([q]) => Math.abs(q[1] - ys) < 1e-6);
  const iR = op.reduce((b, x) => (x[0][0] > b[0][0] ? x : b))[1], iL = op.reduce((b, x) => (x[0][0] < b[0][0] ? x : b))[1];
  const pad = [];
  for (let i = iR; ; i = (i + 1) % n) { pad.push(top[i]); if (i === iL) break; }
  return [[x0, y0], [x1, y0], ...pad];
}

// ---------------------------------------------------------------- één vleugel
// delen: { soort: 'kader'|'roede'|'boog'|'boogkader', a, b } (recht, op de hartlijn) of { soort, c, r, g0, g1 } (boog,
// op de hartlijn, graden tegen de klok). ruiten: veelhoeken van het daglicht (wat je van het glas ziet). panelen: idem
// voor een stalen paneel (plaat 3 mm) in plaats van glas.
function vleugel(stijl, B, H, sys, opts = {}) {
  const k = sys.kader.zicht, w = sys.roede.zicht, delen = [], ruiten = [], panelen = [];
  const xi0 = k, xi1 = B - k, yi0 = k, yi1 = H - k, Bi = xi1 - xi0, midX = B / 2;
  const R = (a, b, soort = 'roede') => delen.push({ soort, a, b });
  const A = (c, r, g0, g1, soort = 'boog') => delen.push({ soort, c, r, g0, g1 });
  const fx = (f) => xi0 + Bi * f;
  const fy = (y0, y1, fs = []) => fs.map((f) => y0 + (y1 - y0) * f);
  const vlak = (p, paneel) => { if (p.length > 2) (paneel ? panelen : ruiten).push(p); };
  /** vakken met horizontale roeden op ys (doorlopend) en verticale op xs (tussen de horizontale); paneel: het onderste vak */
  const raster = (x0, x1, y0, y1, xs = [], ys = [], paneel = false) => {
    const hy = [y0 - w / 2, ...ys, y1 + w / 2], vx = [x0 - w / 2, ...xs, x1 + w / 2];
    for (const y of ys) R([x0, y], [x1, y]);
    for (let i = 0; i < hy.length - 1; i++) {
      if (paneel && i === 0 && ys.length) { vlak(rechthoek(x0, y0, x1, hy[1] - w / 2), true); continue; }
      for (const x of xs) R([x, hy[i] + w / 2], [x, hy[i + 1] - w / 2]);
      for (let j = 0; j < vx.length - 1; j++) ruiten.push(rechthoek(vx[j] + w / 2, hy[i] + w / 2, vx[j + 1] - w / 2, hy[i + 1] - w / 2));
    }
  };
  /** vrije vakverdeling (stijl.vak): roeden tussen de randen van het vak, dan elk deelvak verder */
  const boom = (n, x0, x1, y0, y1) => {
    if (!n || n === 'P') { vlak(rechthoek(x0, y0, x1, y1), n === 'P'); return; }
    const v = n.r === 'v', a0 = v ? x0 : y0, a1 = v ? x1 : y1, ps = n.f.map((f) => a0 + (a1 - a0) * f), gr = [a0 - w / 2, ...ps, a1 + w / 2];
    for (const q of ps) v ? R([q, y0], [q, y1]) : R([x0, q], [x1, q]);
    for (let i = 0; i < gr.length - 1; i++) { const kind = n.k?.[i] ?? null, b0 = gr[i] + w / 2, b1 = gr[i + 1] - w / 2; v ? boom(kind, b0, b1, y0, y1) : boom(kind, x0, x1, b0, b1); }
  };
  const spiegel = (n) => (!n || n === 'P' ? n : n.r === 'v' ? { r: 'v', f: n.f.map((f) => 1 - f).reverse(), k: Array.from({ length: n.f.length + 1 }, (_, i) => spiegel(n.k?.[n.f.length - i] ?? null)) } : { ...n, k: n.k?.map(spiegel) });
  const vak = opts.spiegel ? spiegel(stijl.vak) : stijl.vak;
  /** het vak onder de boog of het hele vak: vrije verdeling of raster */
  const onder = (y1) => (vak ? boom(vak, xi0, xi1, yi0, y1) : raster(xi0, xi1, yi0, y1, stijl.v.map(fx), fy(yi0, y1, stijl.h), stijl.paneel));
  /** de boog boven een kalf op hoogte ys (middelpunt c, binnenstraal rIn): leeg, met verticale roeden, of een zon */
  const boogVak = (c, rIn, ys) => {
    if (stijl.zon) {
      const rk = Math.max(90, (rIn + w / 2) * 0.28), hoeken = Array.from({ length: stijl.zon }, (_, i) => (180 * (i + 1)) / (stijl.zon + 1));
      const gk = deg(Math.asin(w / 2 / rk));
      A(c, rk, gk, 180 - gk);
      const rE = Math.sqrt(rIn ** 2 - (w / 2) ** 2); // het einde zo dat ook de hoeken van de straal binnen de boog blijven
      for (const gg of hoeken) R([c[0] + (rk + w / 2) * Math.cos(rad(gg)), ys + (rk + w / 2) * Math.sin(rad(gg))], [c[0] + rE * Math.cos(rad(gg)), ys + rE * Math.sin(rad(gg))]);
      ruiten.push(binnenSchijf(rechthoek(xi0, ys + w / 2, xi1, ys + rk), c, rk - w / 2));
      const grens = [0, ...hoeken, 180];
      for (let i = 0; i < grens.length - 1; i++) {
        let p = binnenSchijf(rechthoek(xi0, ys + w / 2, xi1, ys + rIn + 10), c, rIn);
        p = knipConvex(p, halfvlak(c, grens[i], i > 0 ? w : 0, true));
        p = knipConvex(p, halfvlak(c, grens[i + 1], i < grens.length - 2 ? w : 0, false));
        p = buitenSchijf(p, c, rk + w / 2);
        if (p.length > 2 && opp(p) > 100) ruiten.push(p);
      }
      return;
    }
    const xs = stijl.boogV.map(fx), gr = [xi0 - w / 2, ...xs, xi1 + w / 2];
    // de roede loopt tot de boog; het uiteinde is schuin gezaagd volgens de binnenkant van de boog ('tot')
    for (const x of xs) delen.push({ soort: 'roede', a: [x, ys + w / 2], b: [x, ys + Math.sqrt(rIn ** 2 - (x - c[0]) ** 2)], tot: { c, r: rIn } });
    for (let i = 0; i < gr.length - 1; i++) vlak(binnenSchijf(rechthoek(gr[i] + w / 2, ys + w / 2, gr[i + 1] - w / 2, ys + rIn + 10), c, rIn));
  };

  if (stijl.vorm === 'volleBoog') {
    const ys = H - B / 2, c = [B / 2, ys], rin = B / 2 - k;
    R([k / 2, 0], [k / 2, ys], 'kader'); R([B - k / 2, 0], [B - k / 2, ys], 'kader'); R([0, k / 2], [B, k / 2], 'kader');
    A(c, B / 2 - k / 2, 0, 180, 'boogkader');
    if (stijl.kalf === false) {
      // geen kalf: het bovenste vak loopt door tot in de boog
      const hs = fy(yi0, ys, stijl.h), gr = [yi0 - w / 2, ...hs];
      for (const y of hs) R([xi0, y], [xi1, y]);
      for (let i = 0; i < hs.length; i++) vlak(rechthoek(xi0, gr[i] + w / 2, xi1, gr[i + 1] - w / 2), stijl.paneel && i === 0);
      ruiten.push(rechtMetBoog(xi0, xi1, gr[gr.length - 1] + w / 2, ys, c, rin));
    } else {
      onder(ys - w / 2);
      R([xi0, ys], [xi1, ys]);
      boogVak(c, rin, ys);
    }
    return { delen, ruiten, panelen, vorm: [[0, 0], [B, 0], ...cirkelVh(c, B / 2, 90, 0, 180)], aanzet: ys };
  }

  // kader in verstek
  R([k / 2, 0], [k / 2, H], 'kader'); R([B - k / 2, 0], [B - k / 2, H], 'kader');
  R([0, k / 2], [B, k / 2], 'kader'); R([0, H - k / 2], [B, H - k / 2], 'kader');
  if (stijl.boven === 'poten') {
    const m = MATEN.poot, t = MATEN.topBoog;
    const xL = opts.xL ?? xi0 + m + w / 2, xR = opts.xR ?? xi1 - m - w / 2, cx = opts.cx ?? (xL + xR) / 2, rc = (xR - xL) / 2;
    const ys = yi1 - t - rc - w / 2, c = [cx, ys], rIn = rc - w / 2, rUit = rc + w / 2;
    const binnen = (x) => x > xi0 + 1 && x < xi1 - 1, hs = fy(yi0, ys - w / 2, stijl.h);
    // de stroken naast de poten: kalf op de aanzet, dezelfde roeden als het midden
    if (binnen(xL)) { R([xL, yi0], [xL, ys]); R([xi0, ys], [xL - w / 2, ys]); raster(xi0, xL - w / 2, yi0, ys - w / 2, [], hs, stijl.paneel); }
    if (binnen(xR)) { R([xR, yi0], [xR, ys]); R([xR + w / 2, ys], [xi1, ys]); raster(xR + w / 2, xi1, yi0, ys - w / 2, [], hs, stijl.paneel); }
    // het stuk van de boog in deze vleugel: tot waar de hartlijn het kader raakt
    // de band moet helemaal binnen het kader blijven: de binnenstraal bepaalt de eindhoek
    const g = (x) => deg(Math.acos(Math.max(-1, Math.min(1, (x - cx) / rIn))));
    const g0 = binnen(xR) ? 0 : g(xi1), g1 = binnen(xL) ? 180 : g(xi0);
    A(c, rc, g0, g1);
    // het midden: vakken onder de aanzet, het bovenste loopt door in de boog
    const xa = Math.max(xi0, xL + w / 2), xb = Math.min(xi1, xR - w / 2), gr = [yi0 - w / 2, ...hs];
    for (const y of hs) R([xa, y], [xb, y]);
    for (let i = 0; i < hs.length; i++) vlak(rechthoek(xa, gr[i] + w / 2, xb, gr[i + 1] - w / 2), stijl.paneel && i === 0);
    ruiten.push(rechtMetBoog(xa, xb, gr[gr.length - 1] + w / 2, ys, c, rIn));
    const kroon = buitenSchijf(rechthoek(xi0, ys + w / 2, xi1, yi1), c, rUit);
    if (kroon.length > 2 && opp(kroon) > 100) ruiten.push(kroon);
  } else if (stijl.boven === 'kalf') {
    const rc = Bi / 2 - w / 2, ys = yi1 - Bi / 2, c = [midX, ys], rUit = rc + w / 2;
    // de boog zet aan op de bovenkant van het kalf
    const ga = deg(Math.asin(w / 2 / rc));
    A(c, rc, ga, 180 - ga);
    for (const [x0, x1] of [[xi0, midX], [midX, xi1]]) { const p = buitenSchijf(rechthoek(x0, ys + w / 2, x1, yi1), c, rUit); if (p.length > 2 && opp(p) > 100) ruiten.push(p); }
    R([xi0, ys], [xi1, ys]);
    onder(ys - w / 2);
    boogVak(c, rc - w / 2, ys);
  } else onder(yi1);
  return { delen, ruiten, panelen, vorm: rechthoek(0, 0, B, H) };
}

// ---------------------------------------------------------------- de hele deur: opening -> kozijn, vleugel(s), zijlicht
/**
 * B x H = dagmaat van de opening in de muur. opts: { systeem: 'auto'|sleutel van SYSTEMEN, opbouw: 'enkel'|'dubbel',
 * scharnier: sleutel van SCHARNIEREN, draai: 'links'|'rechts' (scharnierkant van een enkele deur), zijlicht: breedte }
 */
export function ontwerp(id, B, H, opts = {}) {
  const r = ontwerpRuw(id, B, H, opts);
  // de scharnierkant van een enkele deur omkeren: alles spiegelen kan niet (zijlicht), dus enkel de vleugel
  if (opts.draai && r.vleugels.length === 1 && !r.stijl.zijlicht) r.vleugels[0].taats = opts.draai;
  return r;
}
function ontwerpRuw(id, B, H, opts = {}) {
  const stijl = STIJLEN.find((s) => s.id === id);
  if (!stijl) throw new Error(`onbekende stijl ${id}`);
  // buiten: altijd isolerend (dubbel) glas
  const opbouw = opts.opbouw === 'dubbel' || opts.gebruik === 'buiten' || (SYSTEMEN[opts.systeem]?.glasMin ?? 0) > OPBOUW.enkel.dikte ? 'dubbel' : 'enkel', sysKey = kiesSysteem({ ...opts, opbouw, stijl }), basis = SYSTEMEN[sysKey];
  const sys = opbouw === 'dubbel' && !basis.koop ? { ...basis, roede: ROEDE_DUBBEL, boog: { ...basis.boog, roedeLagen: 3 } } : basis;
  const extra = { sysKey, opbouw, gebruik: opts.gebruik === 'buiten' ? 'buiten' : 'binnen', scharnier: scharnierSoort(opts.scharnier), glasDikte: OPBOUW[opbouw].dikte, glasKgm2: OPBOUW[opbouw].kgm2 };
  const kz = sys.kozijn.zicht, M = MATEN;
  const KB = B - 2 * M.montage, KH = H - M.montage;
  const kozijn = [], vleugels = [], vast = [];
  const P = (a, b) => kozijn.push({ soort: 'kozijn', a, b });
  if (stijl.vorm === 'volleBoog') {
    const ys = KH - KB / 2;
    P([kz / 2, 0], [kz / 2, ys]); P([KB - kz / 2, 0], [KB - kz / 2, ys]);
    kozijn.push({ soort: 'boogkozijn', c: [KB / 2, ys], r: KB / 2 - kz / 2, g0: 0, g1: 180 });
    const VB = KB - 2 * kz - 2 * M.speling, vH = ys - M.vloer + VB / 2;
    vleugels.push({ x: kz + M.speling, y: M.vloer, B: VB, H: vH, taats: 'links', ...vleugel(stijl, VB, vH, sys) });
    return { stijl, B, H, sys, ...extra, kozijn: { B: KB, H: KH, delen: kozijn, vorm: [[0, 0], [KB, 0], ...cirkelVh([KB / 2, ys], KB / 2, 90, 0, 180)] }, vleugels, vast };
  }
  P([kz / 2, 0], [kz / 2, KH]); P([KB - kz / 2, 0], [KB - kz / 2, KH]); P([0, KH - kz / 2], [KB, KH - kz / 2]);
  let x0 = kz, binnenB = KB - 2 * kz;
  // vast bovenlicht: een kalf in het kozijn op hoogte yb (hart), het glas erboven
  const bl = stijl.bovenlicht ?? 0, yb = KH - kz - bl - kz / 2, topV = bl ? yb - kz / 2 : KH - kz;
  if (bl) { P([kz, yb], [KB - kz, yb]); vast.push({ x: kz, y: yb + kz / 2, B: KB - 2 * kz, H: bl, delen: [], ruiten: [], panelen: [], soort: 'bovenlicht' }); }
  if (stijl.zijlicht) {
    const xz = opts.zijlicht ?? M.zijlicht;
    P([xz, 0], [xz, topV]); P([kz, kz / 2], [xz - kz / 2, kz / 2]);
    x0 = xz + kz / 2; binnenB = KB - kz - x0;
    vast.push({ x: kz, y: kz, B: xz - kz / 2 - kz, H: topV - kz, delen: [], ruiten: [], panelen: [], soort: 'zijlicht' });
    if (stijl.zijlicht === 'beide') {
      P([KB - xz, 0], [KB - xz, topV]); P([KB - xz + kz / 2, kz / 2], [KB - kz, kz / 2]);
      binnenB = KB - xz - kz / 2 - x0;
      vast.push({ x: KB - xz + kz / 2, y: kz, B: xz - kz / 2 - kz, H: topV - kz, delen: [], ruiten: [], panelen: [], soort: 'zijlicht' });
    }
  }
  const VH = topV - M.speling - M.vloer;
  if (stijl.vleugels === 2) {
    const VB = (binnenB - 3 * M.speling) / 2, k = sys.kader.zicht, w = sys.roede.zicht;
    const xA = x0 + M.speling, xB = xA + VB + M.speling, cxG = KB / 2;
    const xLg = xA + k + M.poot + w / 2, xRg = xB + VB - k - M.poot - w / 2;
    for (const [i, xv] of [[0, xA], [1, xB]]) vleugels.push({ x: xv, y: M.vloer, B: VB, H: VH, taats: i ? 'rechts' : 'links', ...vleugel(stijl, VB, VH, sys, { xL: xLg - xv, xR: xRg - xv, cx: cxG - xv, spiegel: i === 1 && stijl.spiegel }) });
  } else {
    const VB = binnenB - 2 * M.speling;
    vleugels.push({ x: x0 + M.speling, y: M.vloer, B: VB, H: VH, taats: stijl.zijlicht ? 'rechts' : 'links', ...vleugel(stijl, VB, VH, sys) });
  }
  const w = sys.roede.zicht, v = vleugels[0];
  for (const z of vast.filter((x) => x.soort === 'zijlicht')) {
    // dezelfde hoogtes als de roeden van de deur
    const ys = [...new Set(v.delen.filter((d) => d.soort === 'roede' && d.a && Math.abs(d.a[1] - d.b[1]) < 1e-6).map((d) => Math.round((d.a[1] + v.y - z.y) * 1000) / 1000))].filter((y) => y > w && y < z.H - w).sort((a, b) => a - b);
    const grens = [-w / 2, ...ys, z.H + w / 2];
    for (const y of ys) z.delen.push({ soort: 'roede', a: [0, y], b: [z.B, y] });
    for (let i = 0; i < grens.length - 1; i++) (stijl.paneel && i === 0 && ys.length ? z.panelen : z.ruiten).push(rechthoek(0, grens[i] + w / 2, z.B, grens[i + 1] - w / 2));
  }
  for (const z of vast.filter((x) => x.soort === 'bovenlicht')) {
    // de verticale roeden van de deur lopen door in het bovenlicht (op dezelfde plaats)
    const xs = [...new Set(vleugels.flatMap((g) => g.delen.filter((d) => d.soort === 'roede' && d.a && Math.abs(d.a[0] - d.b[0]) < 1e-6 && d.a[1] < g.H / 2).map((d) => Math.round((d.a[0] + g.x - z.x) * 1000) / 1000)))].filter((x) => x > w && x < z.B - w).sort((a, b) => a - b);
    const grens = [-w / 2, ...xs, z.B + w / 2];
    for (const x of xs) z.delen.push({ soort: 'roede', a: [x, 0], b: [x, z.H] });
    for (let i = 0; i < grens.length - 1; i++) z.ruiten.push(rechthoek(grens[i] + w / 2, 0, grens[i + 1] - w / 2, z.H));
  }
  return { stijl, B, H, sys, ...extra, kozijn: { B: KB, H: KH, delen: kozijn, vorm: rechthoek(0, 0, KB, KH) }, vleugels, vast };
}

// ---------------------------------------------------------------- de vorm van een staafdeel (voor het model en de tekening)
/**
 * de veelhoek van een recht deel met zichtbreedte w. Een kader- of kozijndeel langs de rand van zijn vorm [0,B] x
 * [0,H] krijgt een verstek (45°) waar het in een hoek eindigt; de rest is een rechthoek rond de hartlijn.
 */
export function veelhoek(d, w, B, H) {
  const dx = d.b[0] - d.a[0], dy = d.b[1] - d.a[1], l = Math.hypot(dx, dy) || 1, u = [dx / l, dy / l], n = [-u[1] * (w / 2), u[0] * (w / 2)];
  let p = [[d.a[0] + n[0], d.a[1] + n[1]], [d.b[0] + n[0], d.b[1] + n[1]], [d.b[0] - n[0], d.b[1] - n[1]], [d.a[0] - n[0], d.a[1] - n[1]]];
  if ((d.soort === 'kader' || d.soort === 'kozijn') && B) {
    // het kozijn heeft geen onderregel: daar staat de stijl recht op de vloer
    const t = w / 2 + 1, hoek = (q) => (Math.abs(q[0]) <= t || Math.abs(q[0] - B) <= t) && ((Math.abs(q[1]) <= t && d.soort === 'kader') || Math.abs(q[1] - H) <= t);
    // de zijde die naar binnen ligt (verder van de rand) korter maken met w aan een hoek-uiteinde
    const mid = [(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2], binnen = (q) => Math.abs(q[0] - B / 2) + Math.abs(q[1] - H / 2);
    const iz = binnen([mid[0] + n[0], mid[1] + n[1]]) < binnen([mid[0] - n[0], mid[1] - n[1]]) ? [0, 1] : [3, 2];
    if (hoek(d.a)) p[iz[0]] = [p[iz[0]][0] + u[0] * w, p[iz[0]][1] + u[1] * w];
    if (hoek(d.b)) p[iz[1]] = [p[iz[1]][0] - u[0] * w, p[iz[1]][1] - u[1] * w];
  }
  // een uiteinde schuin op een boog (d.tot): de twee hoeken langs de roede tot op de cirkel schuiven
  if (d.tot) for (const i of [1, 2]) {
    const f = [p[i][0] - d.tot.c[0], p[i][1] - d.tot.c[1]], fu = f[0] * u[0] + f[1] * u[1], s = fu * fu - (f[0] * f[0] + f[1] * f[1]) + d.tot.r ** 2;
    if (s >= 0) { const k = -fu + Math.sqrt(s); p[i] = [p[i][0] + u[0] * k, p[i][1] + u[1] * k]; }
  }
  return p;
}

// ---------------------------------------------------------------- lijsten
export const lengte = (d) => (d.a ? Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]) : Math.abs(rad(d.g1 - d.g0)) * d.r);
/**
 * zaaglijst (staven), laserlijst (bogen en platen), glaslijst. Kaderstaven in verstek: lengte = buitenmaat (hartlijn
 * + zicht, de hartlijn loopt hier al van rand tot rand). Roeden passen tussen het kader of de roeden.
 */
export function lijsten(o) {
  const { sys } = o, zaag = [], laser = [], glas = [];
  const voeg = (lijst, sleutel, rij) => { const r = lijst.find((x) => x.sleutel === sleutel); if (r) r.n += rij.n; else lijst.push({ sleutel, ...rij }); };
  const staaf = (wat, prof, l, n, bew) => voeg(zaag, `${prof}|${Math.round(l)}|${wat}`, { wat, prof, l: Math.round(l), n, bew });
  const boog = (wat, d, zicht, t, n, opm) => voeg(laser, `${wat}|${Math.round(d.r)}|${Math.round(d.g1 - d.g0)}|${t}`, { wat, vorm: 'boog', r: Math.round(d.r * 10) / 10, zicht, hoek: Math.round((d.g1 - d.g0) * 10) / 10, t, n, mat: `S235, plaat ${t} mm`, opm });
  const groepen = [['kozijn', o.kozijn.delen], ...o.vleugels.map((v, i) => [o.vleugels.length > 1 ? `vleugel ${i + 1}` : 'vleugel', v.delen]), ...o.vast.map((v) => [v.soort ?? 'zijlicht', v.delen])];
  for (const [deel, delen] of groepen) for (const d of delen) {
    const staand = d.a && Math.abs(d.a[0] - d.b[0]) < 1e-6, liggend = d.a && Math.abs(d.a[1] - d.b[1]) < 1e-6;
    if (d.soort === 'kader') staaf(`${deel}: ${staand ? 'staander' : 'regel'}`, sys.kader.staaf, lengte(d), 1, 'verstek 45° aan beide kanten');
    else if (d.soort === 'kozijn') staaf(`kozijn: ${staand ? 'stijl' : 'regel'}`, sys.kozijn.staaf, lengte(d), 1, staand && d.a[1] === 0 ? 'onder recht (op de vloer), boven verstek' : 'verstek of stomp tegen de stijl');
    else if (d.soort === 'roede') {
      staaf(`${deel}: roede`, sys.roede.staaf, lengte(d), 1, d.tot ? 'onder recht, boven schuin volgens de boog (aftekenen op de mal 1:1)' : staand || liggend ? 'recht, tussen kader en roeden' : 'straal: uiteinden schuin op de boog');
      if (sys.roede.lat) staaf(`${deel}: lat op de roede`, sys.roede.lat, lengte(d), 2, 'voor gelast, achter geschroefd');
    } else if (d.soort === 'boog') {
      boog(`${deel}: boogroede (kern${sys.boog.roedeLagen > 1 ? `, ${sys.boog.roedeLagen} lagen` : ''})`, d, 20, sys.boog.kern, sys.boog.roedeLagen ?? 1, sys.boog.roedeLagen > 1 ? `${sys.boog.roedeLagen} lagen op elkaar gelast (zo dik als het glas); de latten apart` : 'lasergesneden; de latten 30 breed apart');
      if (sys.roede.lat) boog(`${deel}: lat op de boog`, d, 30, 3, 2, 'voor gelast, achter geschroefd');
    } else if (d.soort === 'boogkader' || d.soort === 'boogkozijn') boog(`${d.soort === 'boogkader' ? deel : 'kozijn'}: boog (${sys.boog.lagenKader} lagen op elkaar)`, d, d.soort === 'boogkader' ? sys.kader.zicht : sys.kozijn.zicht, sys.boog.kern, sys.boog.lagenKader, `${sys.boog.lagenKader} lagen van ${sys.boog.kern} mm op elkaar gelast`);
  }
  for (const [soort, groep] of [['vleugel', o.vleugels], ['vast', o.vast]]) for (const v of groep) {
    const deel = soort === 'vleugel' ? 'vleugel' : (v.soort ?? 'zijlicht');
    // glaslatten langs de binnenkant van het kader (de roeden hebben hun eigen latten); bij een ronde deur is het
    // ronde stuk lasergesneden
    const k = soort === 'vast' ? 0 : sys.kader.zicht, rond = v.aanzet !== undefined;
    const recht = rond ? 2 * (v.aanzet - k) + (v.B - 2 * k) : 2 * (v.B - 2 * k + v.H - 2 * k);
    // langs een paneel geen glaslat: de delen van zijn omtrek die op de binnenkant van het kader liggen
    const xi1 = v.B - k, langsPaneel = (v.panelen ?? []).reduce((s, p) => s + p.reduce((t, a, i) => { const b = p[(i + 1) % p.length], op = (q) => Math.abs(q[0] - k) < 0.01 || Math.abs(q[0] - xi1) < 0.01 || Math.abs(q[1] - k) < 0.01;
      const zelfde = (Math.abs(a[0] - b[0]) < 0.01 && (Math.abs(a[0] - k) < 0.01 || Math.abs(a[0] - xi1) < 0.01)) || (Math.abs(a[1] - b[1]) < 0.01 && Math.abs(a[1] - k) < 0.01);
      return t + (op(a) && op(b) && zelfde ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0); }, 0), 0);
    // koopprofielen: één glaslat rondom elke ruit (de andere kant is de sponning van het profiel, ook bij de roeden)
    if (sys.koop) staaf(`${deel}: glaslatten rondom elke ruit`, sys.glaslat.staaf, v.ruiten.reduce((s, p) => s + p.reduce((t, a, i) => { const b = p[(i + 1) % p.length]; return t + (Math.abs(a[0] - b[0]) < 0.01 || Math.abs(a[1] - b[1]) < 0.01 ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0); }, 0), 0), sys.glaslatRondom ?? 1, sys.glaslat.uitleg);
    else if (sys.glaslat.achter) { staaf(`${deel}: glaslatten voor (gelast)`, sys.glaslat.staaf, recht - langsPaneel, 1, 'in stukken op maat zagen bij het glazen'); staaf(`${deel}: glaslatten achter (hoeklijn, geschroefd)`, sys.glaslat.achter, recht - langsPaneel, 1, 'op maat zagen; Ø4,5 boren en 90° verzinken om de 250'); }
    else staaf(`${deel}: glaslatten in het kader (voor en achter)`, sys.glaslat.staaf, recht - langsPaneel, 2, 'in stukken op maat zagen bij het glazen');
    for (const p of v.panelen ?? []) { const [x0, y0, x1, y1] = kaderVan(p); voeg(laser, `paneel|${deel}|${Math.round(x1 - x0)}|${Math.round(y1 - y0)}`, { wat: `${deel}: paneel (ingelast)`, vorm: 'plaat', b: Math.round(y1 - y0 - 2), l: Math.round(x1 - x0 - 2), t: 3, n: 1, mat: 'S235, plaat 3 mm', opm: '1 mm speling rondom, hechten om de 100' }); }
    if (rond) voeg(laser, `glaslat boog|${deel}`, { wat: `${deel}: glaslat in de boog van het kader`, vorm: 'boog', r: v.B / 2 - k - 7.5, zicht: 15, hoek: 180, t: 4, n: 2, mat: 'S235, plaat 4 mm', opm: 'voor gelast, achter geschroefd' });
    for (const p of v.ruiten) {
      const [x0, y0, x1, y1] = kaderVan(p), recht = p.length === 4, ex = 2 * (o.sys.inloop ?? MATEN.inloop) - 4;
      voeg(glas, `${deel}|${recht ? 'r' : 'v'}|${Math.round(x1 - x0)}|${Math.round(y1 - y0)}|${Math.round(opp(p) / 100)}`, { deel, vorm: recht ? 'rechthoek' : 'vorm (DXF)', b: Math.round(x1 - x0 + ex), h: Math.round(y1 - y0 + ex), m2: (opp(p) + ex * (x1 - x0 + y1 - y0)) / 1e6, n: 1 });
    }
  }
  for (const v of o.vleugels) {
    if (!sys.alu) staaf('greep voor en achter', 'rond25', MATEN.greep.lengte, 2, 'uiteinden rond slijpen; 2 gaten M8 per greep');
    if (o.scharnier === 'verdekt' && !sys.koop) staaf('kozijn: aanslag (boven en 2 zijden)', 'plat15x4', 2 * v.H + v.B, 1, 'op het kozijn gelast, de deur valt ertegen');
    else if (o.scharnier !== 'verdekt' && !sys.pivot) voeg(laser, 'taatsplaat onder', { wat: 'taatsplaat onder (in de onderregel)', vorm: 'plaat', b: 36, l: 220, t: 8, n: 1, mat: 'S235, plaat 8 mm', opm: '2 x M8 tappen (boor Ø6,8) op 40 en 180' });
    if (o.scharnier !== 'verdekt' && !sys.pivot) voeg(laser, 'taatsplaat boven', { wat: 'taatsplaat boven (in de bovenregel)', vorm: 'plaat', b: 36, l: 140, t: 8, n: 1, mat: 'S235, plaat 8 mm', opm: 'boring Ø20 voor de bovenpen' });
    if (o.scharnier !== 'verdekt' && !sys.pivot) voeg(laser, 'lasring bovenpen', { wat: 'lasring bovenpen (bus in het kozijn)', vorm: 'plaat', b: 30, l: 30, t: 8, n: 1, mat: 'S235, plaat 8 mm', opm: 'rond Ø30 met boring Ø21' });
    if (!sys.alu) voeg(laser, 'greephouder', { wat: 'greephouder (afstandsstuk)', vorm: 'plaat', b: 25, l: 40, t: 10, n: o.stijl.vleugels === 2 ? 2 : 2, mat: 'S235, plaat 10 mm', opm: 'boring M8 voor de greep' });
  }
  return { zaag, laser, glas };
}

export const laserKg = (r) => (r.vorm === 'boog' ? rad(r.hoek) * r.r * r.zicht : r.b * r.l) * r.t * r.n * 7.85e-6;
/** gewicht in kg: staal uit de staven (kg/m uit STAAF), laserdelen, glas 44.2 (22 kg/m²); per vleugel voor het scharnier */
export function gewicht(o, STAAF) {
  const reken = (L) => ({ staal: L.zaag.reduce((s, r) => s + (STAAF[r.prof]?.kgm ?? 0) * (r.l / 1000) * r.n, 0) + L.laser.reduce((s, r) => s + laserKg(r), 0), glas: L.glas.reduce((s, r) => s + r.m2 * r.n * (o.glasKgm2 ?? 22), 0) });
  const alles = reken(lijsten(o));
  const vleugels = o.vleugels.map((v) => { const g = reken(lijsten({ ...o, vleugels: [v], vast: [], kozijn: { delen: [] } })); return g.staal + g.glas; });
  return { ...alles, totaal: alles.staal + alles.glas, vleugels };
}
