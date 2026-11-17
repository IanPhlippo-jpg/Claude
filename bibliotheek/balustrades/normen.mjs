// De normwaarden voor balustrades (borstweringen) in België, met hun bron. Opgezocht op 2026-11-13; de normteksten zelf
// zijn betalend: de waarden komen uit de artikels van Buildwise (WTCB) die de norm samenvatten. 'AANNAME' = niet letterlijk
// in een bron gevonden of een eigen, voorzichtige keuze. Zie docs/Normen-en-bronnen.md. Werkt in Node en in de browser.

const C2016 = 'Buildwise (WTCB), Contact 2016/4 p. 16-17: herziening NBN B 03-004 (buildwise.be/media/3hxnsgd0/contact_nl_04_2016.pdf)';
const C2018 = 'Buildwise, Artikel 2018/4 nr. 5: dimensionering van borstweringen (buildwise.be)';
const M2023 = 'Buildwise Magazine 2023/2 p. 16-17: glazen borstweringen (buildwise.be/media/m5nkqvre)';
const ANB = 'Buildwise-fiche NBN EN 1991-1-1 + ANB (12/2015), tabel 6.12 (buildwise.be/media/td4ltgij/nbn-en-1991-1-1.pdf)';
const C2018B = 'Buildwise, Contact 2018/4 nr. 5 "Dimensionering van borstweringen: meer dan alleen maar schokproeven" (buildwise.be, pdf wtcb_artonline_2018_4_nr5)';
const WANB = 'NBN EN 1991-1-4 + ANB: vb,0 volgens postcode 23, 24, 25 of 26 m/s (Buildwise WInt-handleiding 2023: "tussen 23 en 26 m/s"; KU Leuven/Odisee, lirias.kuleuven.be/retrieve/526288); terreincategorieën 0-IV met z0 en zmin zoals EN (Buildwise-fiche NBN EN 1991-1-4, 04/2012, buildwise.be/media/d3vj3ghx)';
const EN1990 = 'Buildwise-fiche NBN EN 1990 + ANB:2013 (buildwise.be/media/0a3lmptz/nbn-en-1990.pdf): ψ0 wind 0,6; nuttige last A-D 0,7; E 1,0';

export const NORM = {
  hoogte: { v: 1100, bron: `NBN B 03-004:2017, dunne borstwering H ≥ 1100 mm (${C2016})` },
  hoogteHoog: { v: 1200, valhoogte: 12, bron: `vanaf 12 m valhoogte H ≥ 1200 mm (${C2016})` },
  hoogteTrap: { v: 900, bron: 'AANNAME (secundaire bron: bouwenaanvlaanderen.be, podcast borstweringen): trap ≥ 900 mm verticaal boven de trapneus; bij een valhoogte van 12 m of meer ook langs de trap 1200 mm (voorzichtig)' },
  tolerantie: { v: 15, bron: `uitvoeringstolerantie -15 mm op H (${M2023})` },
  valhoogteMin: { v: 1000, bron: 'borstwering verplicht vanaf 1 m valhoogte (GO!-standpuntenfiche Balustrades, pro.g-o.be)' },
  opening: { v: 110, bron: 'openingen ≤ 110 mm (bol), ook tussen de vloer en de onderrand: gangbare waarde uit NBN B 03-004 volgens secundaire bronnen (homegrade.brussels, Aluminium Center Belgium); Contact 2016/4 noemt 110 mm alleen als onderkant van de klimzone. AANNAME tot de normtekst ingezien is' },
  openingTrapDriehoek: { v: 110, bron: 'AANNAME: de driehoek tussen trede, stootbord en onderregel is een opening zoals elke andere (bol 110 mm); geen aparte regel gevonden in Contact 2016/4 of 2018/4' },
  trapPlintSpeling: { v: 30, bron: 'AANNAME: de trapplint volgt de treden op 30 mm boven de trede en 30 mm voor het stootbord' },
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
  // NBN B 03-004:2017 volgens Contact 2018/4: drie horizontale lasten apart (lijnlast qk,h, puntlast Qk,h1 op de
  // beschermingshoogte, puntlast Qk,h2 op de meest ongunstige plaats eronder), een omgekeerde last en een verticale last
  puntVulling: { Q: 0.5, bron: `puntlast Qk,h2 = 0,5 kN onder de beschermingshoogte, op de meest ongunstige plaats van de vulling (${ANB}, voetnoot 3; ${C2018B}: "op de meest ongunstige plaats onder de beschermingshoogte")` },
  verticaal: { Q: 1.0, bron: `verticale puntlast Qk,v = 1 kN op de handgreep of de meest ongunstige plaats, alle categorieën; volglas alleen met een gedecentreerde regel op het glas (${C2018B}; ${C2016})` },
  omgekeerd: { q: 0.5, bron: `0,5 kN/m in de omgekeerde richting, alle categorieën, als dat ongunstiger is (${C2018B})` },
  schokproef: { bron: `schokproeven NBN B 03-004: zacht lichaam 50 kg (dubbele band) van 300 mm (A), 450 mm (B), 700 mm (C, D); hard lichaam stalen bol 0,5 kg van 750 mm; niet op glazen borstweringen (${C2018B})` },
  wind: { bron: `wind volgens NBN EN 1991-1-4 + ANB (${WANB}); de wind wordt enkel gecombineerd met de lineaire horizontale belasting qk,h (${C2016}; ${C2018B}); combinatie met ψ0 volgens EN 1990 (${EN1990}): AANNAME dat de ψ0-waarden van EN 1990 gelden, Buildwise noemt ze niet` },
  windSnelheid: [23, 24, 25, 26],
  terrein: {
    0: { z0: 0.003, zmin: 1, naam: '0 · zee of kust' },
    I: { z0: 0.01, zmin: 1, naam: 'I · meer, vlak zonder hindernissen' },
    II: { z0: 0.05, zmin: 2, naam: 'II · open land, enkele bomen of gebouwen' },
    III: { z0: 0.3, zmin: 5, naam: 'III · dorp, voorstad, bos' },
    IV: { z0: 1.0, zmin: 10, naam: 'IV · stad (≥ 15 % bebouwd, gem. ≥ 15 m)' },
  },
  windRho: { v: 1.25, bron: 'ρ = 1,25 kg/m³ (EN 1991-1-4 §4.5; KU Leuven-cursus ANB: qb 423 N/m² bij 26 m/s); kI = 1 (EN-aanbeveling; AANNAME: de Belgische ANB-formule voor kI niet ingezien); cdir = cseason = c0 = 1' },
  psi0: { wind: 0.6, A: 0.7, B: 0.7, C: 0.7, D: 0.7, C5: 0.7, E: 1.0, bron: EN1990 },
  aangrijping: { v: 1000, bron: `de lijnlast grijpt aan op 1000 mm hoogte (${C2016}); hier voorzichtig op de volle hoogte H` },
  gammaQ: { v: 1.5, bron: 'γQ = 1,5 (Buildwise-fiche NBN EN 1990 + ANB)' },
  gammaM0: { v: 1.0, bron: 'γM0 = 1,0 (EN 1993-1-1, aanbevolen waarde; AANNAME dat de Belgische ANB dezelfde is)' },
  gammaM2: { v: 1.25, bron: 'γM2 = 1,25 (EN 1993-1-1/-1-8, aanbevolen waarde)' },
  fy: { v: 235, bron: 'S235JR (EN 10025-2), fy = 235 N/mm²' },
  fu: { v: 360, bron: 'S235JR, fu = 360 N/mm²' },
  E: { v: 210000, bron: 'E = 210 000 N/mm² (staal)' },
  doorbuigingStaal: { v: 25, bron: `doorbuiging < 25 mm op 1 m hoogte (${C2016}); AANNAME: dezelfde grens bij een berekening` },
  omega: { v: 0.1, bron: 'AANNAME ω = 0,1 voor gewone PVB bij een persoonslast (was 0,3; volgens Fable 5.2 geeft EN 16612 voor PVB lager dan 0,3: nakijken per folie en lastduur); een stijve folie (ionoplast) mag hoger, op attest' },
  glasKlem: { breed: 1200, hoog: 1000, m2: 1.2, bron: 'AANNAME tot de montagehandleiding van Q-railing (MOD 2500; download vraagt een account) ingezien is: ruit tussen 4 klemmen ten hoogste 1200 breed, 1000 hoog en 1,2 m²; Q-railing noemt voor de MOD 28 "tot 2 m breed" (glassonweb.com), hier bewust voorzichtiger' },
  glasU: { hoog: 1100, bron: 'AANNAME: Q-railing Easy Glass Smart tot 1100 mm glas boven het profiel (brochure noemt geen hoogte; fiche nakijken)' },
  doorbuigingGlas: { v: 15, bron: `ingeklemd glas: 15 mm bij berekening op 1 m hoogte (${M2023})` },
  glas: {
    bron: `enkel gelaagd glas in borstweringen; ingeklemd glas minstens gehard-gelaagd 88.2, meestal 1010.2, inklemdiepte ± 100 mm (${M2023}; Buildwise Contact 2013/4); zonder leuning alleen als alle bladen gehard zijn en de borstwering blijft staan na breuk (${C2016})`,
    Eglas: 70000, fgd: 80, omega: 0.1,
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
  toleranties: { bron: 'ISO 2768-m voor losse zaagstukken en laserdelen; gelaste samenstellingen ISO 13920-BF (B voor lengtes, F voor rechtheid); lassen ISO 5817-C' },
  uitvoering: { bron: 'lasproces 135 (MAG), kwaliteitsniveau ISO 5817-C, lasser gekwalificeerd volgens ISO 9606-1 (hoeklas, 135), 100 % visuele controle (ISO 17637). Geen uitvoeringsklasse EN 1090-2 vermeld: of een borstwering onder EN 1090-1 valt, navragen bij Buildwise of het BIL' },
};
export const BRONNEN = { C2016, C2018, C2018B, M2023, ANB, WANB, EN1990 };

/** de vereiste hoogte (mm) voor deze plaats; vanaf 12 m valhoogte overal 1200, ook langs de trap */
export function vereisteHoogte(k) {
  if ((k.valhoogte ?? 3) >= NORM.hoogteHoog.valhoogte) return NORM.hoogteHoog.v;
  if (k.vorm === 'trap') return NORM.hoogteTrap.v;
  return NORM.hoogte.v;
}

/**
 * piekstuwdruk qp(z) in kN/m² (EN 1991-1-4 §4.5 met de ANB): vb = vb,0 (cdir = cseason = 1), kr = 0,19 (z0 / 0,05)^0,07,
 * cr = kr ln(z / z0), Iv = 1 / ln(z / z0) (c0 = kI = 1), qp = (1 + 7 Iv) · ½ ρ (cr vb)²; z ≥ zmin
 */
export function piekstuwdruk(vb0, terrein, zM) {
  const T = NORM.terrein[terrein] ?? NORM.terrein.II, z = Math.max(T.zmin, zM), kr = 0.19 * (T.z0 / 0.05) ** 0.07, ln = Math.log(z / T.z0);
  const cr = kr * ln, Iv = 1 / ln, vm = cr * vb0, qp = ((1 + 7 * Iv) * 0.5 * NORM.windRho.v * vm * vm) / 1000;
  return { qp, z, kr, cr, Iv, vm, qb: (0.5 * NORM.windRho.v * vb0 * vb0) / 1000, T };
}
/**
 * netto drukcoëfficiënt cp,net van een vrijstaande wand of borstwering (EN 1991-1-4 tabel 7.9, volheid φ = 1) per zone
 * A (0-0,3h), B (0,3-2h), C (2-4h), D (> 4h) vanaf het vrije einde; lineair tussen l/h = 3, 5 en 10
 */
export function cpNet(lh) {
  const rij = [[3, [2.3, 1.4, 1.2, 1.2]], [5, [2.9, 1.8, 1.4, 1.2]], [10, [3.4, 2.1, 1.7, 1.2]]], x = Math.min(10, Math.max(3, lh));
  let w = rij[2][1];
  for (let i = 0; i < rij.length - 1; i++) if (x <= rij[i + 1][0]) { const f = (x - rij[i][0]) / (rij[i + 1][0] - rij[i][0]); w = rij[i][1].map((v, j) => v + f * (rij[i + 1][1][j] - v)); break; }
  return { A: w[0], B: w[1], C: w[2], D: w[3] };
}
/** inschreven cirkel (diameter, mm) van de driehoek trede / stootbord / onderregel; v = hoogte van de onderkant van de regel boven de neuslijn (verticaal) */
export function trapDriehoek(optrede, aantrede, v) {
  if (v <= -optrede) return 0;
  const a = aantrede * (1 + v / optrede), b = optrede + v, c = Math.hypot(a, b);
  return a + b - c; // 2ρ = a + b − c voor een rechthoekige driehoek
}
/** moet de balustrade niet-beklimbaar zijn? (alle categorieën behalve E, waar geen kinderen komen) */
export const nietBeklimbaar = (k) => (k.cat ?? 'A') !== 'E';
