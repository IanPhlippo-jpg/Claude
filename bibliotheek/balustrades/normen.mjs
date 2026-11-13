// De normwaarden voor balustrades (borstweringen) in België, met hun bron. Opgezocht op 2026-11-13; de normteksten zelf
// zijn betalend: de waarden komen uit de artikels van Buildwise (WTCB) die de norm samenvatten. 'AANNAME' = niet letterlijk
// in een bron gevonden of een eigen, voorzichtige keuze. Zie docs/Normen-en-bronnen.md. Werkt in Node en in de browser.

const C2016 = 'Buildwise (WTCB), Contact 2016/4 p. 16-17: herziening NBN B 03-004 (buildwise.be/media/3hxnsgd0/contact_nl_04_2016.pdf)';
const C2018 = 'Buildwise, Artikel 2018/4 nr. 5: dimensionering van borstweringen (buildwise.be)';
const M2023 = 'Buildwise Magazine 2023/2 p. 16-17: glazen borstweringen (buildwise.be/media/m5nkqvre)';
const ANB = 'Buildwise-fiche NBN EN 1991-1-1 + ANB (12/2015), tabel 6.12 (buildwise.be/media/td4ltgij/nbn-en-1991-1-1.pdf)';

export const NORM = {
  hoogte: { v: 1100, bron: `NBN B 03-004:2017, dunne borstwering H ≥ 1100 mm (${C2016})` },
  hoogteHoog: { v: 1200, valhoogte: 12, bron: `vanaf 12 m valhoogte H ≥ 1200 mm (${C2016})` },
  hoogteTrap: { v: 900, bron: 'AANNAME (secundaire bron: bouwenaanvlaanderen.be, podcast borstweringen): trap ≥ 900 mm verticaal boven de trapneus' },
  tolerantie: { v: 15, bron: `uitvoeringstolerantie -15 mm op H (${M2023})` },
  valhoogteMin: { v: 1000, bron: 'borstwering verplicht vanaf 1 m valhoogte (GO!-standpuntenfiche Balustrades, pro.g-o.be)' },
  opening: { v: 110, bron: `openingen ≤ 110 mm (bol/kubus), ook tussen vloer en onderrand (${C2016}, figuur)` },
  openingTrap: { v: 50, bron: 'AANNAME (secundaire bron: bouwenaanvlaanderen.be): ≤ 50 mm tussen trapneus en onderste regel zonder trapboom' },
  klimZone: { van: 110, tot: 450, max: 20, bron: `niet beklimbaar: tussen 110 en 450 mm hoogte openingen tussen niet-verticale elementen < 20 mm (kubus 20 mm) (${C2016})` },
  horizontaalBoven: { v: 180, bron: 'AANNAME (Homegrade, homegrade.brussels): horizontale elementen boven 450 mm ≤ 180 mm; hier strenger ≤ 110 mm (bol)' },
  lijnlast: {
    A: { q: 0.5, Q: 0.5, naam: 'A · woning' },
    B: { q: 1.0, Q: 1.0, naam: 'B · kantoor' },
    C: { q: 1.0, Q: 1.0, naam: 'C1-C4 · publiek (school, restaurant, zaal)' },
    D: { q: 1.0, Q: 1.0, naam: 'D · winkel' },
    E: { q: 2.0, Q: 1.0, naam: 'E · opslag en industrie' },
    C5: { q: 5.0, Q: 2.0, naam: 'C5 · mensenmassa (tribune, zaal)' },
    bron: `${ANB}: qk A 0,5, B/C1-C4/D 1,0, E 2,0, C5 5,0 (3,0 als de borstweringen ≤ 2 m uit elkaar staan) kN/m; puntlast A 0,5 kN (NBN B 03-004:2017, ${C2016})`,
  },
  aangrijping: { v: 1000, bron: `de lijnlast grijpt aan op 1000 mm hoogte (${C2016}); hier voorzichtig op de volle hoogte H` },
  gammaQ: { v: 1.5, bron: 'γQ = 1,5 (Buildwise-fiche NBN EN 1990 + ANB)' },
  gammaM0: { v: 1.0, bron: 'γM0 = 1,0 (EN 1993-1-1, aanbevolen waarde; AANNAME dat de Belgische ANB dezelfde is)' },
  gammaM2: { v: 1.25, bron: 'γM2 = 1,25 (EN 1993-1-1/-1-8, aanbevolen waarde)' },
  fy: { v: 235, bron: 'S235JR (EN 10025-2), fy = 235 N/mm²' },
  fu: { v: 360, bron: 'S235JR, fu = 360 N/mm²' },
  E: { v: 210000, bron: 'E = 210 000 N/mm² (staal)' },
  doorbuigingStaal: { v: 25, bron: `doorbuiging < 25 mm op 1 m hoogte (${C2016}); AANNAME: dezelfde grens bij een berekening` },
  doorbuigingGlas: { v: 15, bron: `ingeklemd glas: 15 mm bij berekening op 1 m hoogte (${M2023})` },
  glas: {
    bron: `enkel gelaagd glas in borstweringen; ingeklemd glas minstens gehard-gelaagd 88.2, meestal 1010.2, inklemdiepte ± 100 mm (${M2023}; Buildwise Contact 2013/4); zonder leuning alleen als alle bladen gehard zijn en de borstwering blijft staan na breuk (${C2016})`,
    Eglas: 70000, fgd: 80, omega: 0.3,
    bronSterkte: 'AANNAME: rekenwaarde gehard glas 80 N/mm² voor kortdurende last (formule EN 16612: kmod·fg,k/γM;A + (fb,k − fg,k)/γM;v met fb,k = 120); NBN S 23-002-2:2020 is de Belgische rekenmethode',
  },
  // ---- onder een schuin dak (afschuining aan het begin of het einde van de lijn). Buildwise (Contact 2016/4, Magazine
  // 2023/2, Artikel 2025-05.07) en de Nederlandse Bbl (iplo.nl, vloerafscheidingen) zeggen niets over een borstwering
  // onder een hellend dak: de regels hieronder zijn AANNAMES, afgeleid uit de bol van 110 mm en de hoogte H.
  dakOpening: { v: 110, bron: `AANNAME: de spleet tussen het dak en de bovenkant van de balustrade is een opening zoals elke andere: ≤ 110 mm (bol), loodrecht op het dak gemeten (${C2016}, figuur openingen); geen bron over borstweringen onder een hellend dak gevonden (Buildwise, iplo.nl)` },
  dakTolerantie: { v: 10, bron: 'AANNAME: + 10 mm voor de oneffenheid van de dakafwerking (gipsplaat, latten) en het meten op de werf' },
  dakSpleetMin: { v: 20, bron: 'AANNAME: spleet ≥ 20 mm, zodat de balustrade het dak niet raakt als het dak doorbuigt of werkt (hout)' },
  dakVolleHoogte: { v: 110, bron: `AANNAME: lager dan H mag alleen waar de opening tot het dak ≤ 110 mm blijft; zodra het dak hoger staat dan H + 110 mm geldt de volle hoogte H (${C2016})` },
  dakWand: { v: 150, bron: 'AANNAME: de balustrade is aan de muur minstens 150 mm hoog (onderregel 70-90 mm + handregel + ruimte om te lassen); lager kan niet gemaakt worden' },
  dakStaander: { v: 300, bron: 'AANNAME: een eindstaander lager dan 300 mm op een voetplaat met 4 ankers is onpraktisch: daaronder een muurplaat 80 x 8 met 2 ankers M10 in het knieschot' },
  dakVlak: { v: 150, bron: 'AANNAME: tussen de knik van de handregel en het andere einde (of de hoek, of de andere knik) blijft minstens 150 mm vlak, voor de staander en het verstek' },
  dakMuurAnker: { v: 0.5, bron: 'AANNAME: in het knieschot (vaak metselwerk of een houten stijl) rekenen met 50 % van de afschuifweerstand in beton; nakijken met de ankerfabrikant voor de echte ondergrond' },
  lassen: { bron: 'ISO 2553 (symbolen), EN 1993-1-8 vereenvoudigde methode: fvw,d = fu / (√3 · βw · γM2), βw = 0,8 (S235)' },
  toleranties: { bron: 'ISO 2768-m (maten zonder tolerantie), lassen ISO 5817-C' },
};
export const BRONNEN = { C2016, C2018, M2023, ANB };

/** de vereiste hoogte (mm) voor deze plaats */
export function vereisteHoogte(k) {
  if (k.vorm === 'trap') return NORM.hoogteTrap.v;
  return (k.valhoogte ?? 3) >= NORM.hoogteHoog.valhoogte ? NORM.hoogteHoog.v : NORM.hoogte.v;
}
/** moet de balustrade niet-beklimbaar zijn? (alle categorieën behalve E, waar geen kinderen komen) */
export const nietBeklimbaar = (k) => (k.cat ?? 'A') !== 'E';
