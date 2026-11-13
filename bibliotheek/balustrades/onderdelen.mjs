// Onderdelen van een balustrade: de stalen profielen (met doorsnede, gewicht, I en W voor de berekening), de
// kooponderdelen (glas, U-profiel, klemmen, ankers, kappen) met artikel, prijs en bron, en de vier soorten met hun
// stijlen. Prijzen excl. btw, opgezocht op 2026-11-13; 'SCHATTING' = geen publieke prijs, vraag een offerte.
// Gewone gegevens, werkt in Node en in de browser.
import { RAL, RAL_BRON, METALLIC, AFWERKINGEN } from '../taatsdeuren/opties.mjs';

export { RAL, RAL_BRON, METALLIC, AFWERKINGEN };

const RHO = 7.85e-6; // kg/mm³
/** doorsnede: A (mm²), I (mm⁴, buiging dwars op de balustrade), W (mm³), omtrek (mm), kg/m */
function koker(b, h, t) { const A = b * h - (b - 2 * t) * (h - 2 * t), I = (b * h ** 3 - (b - 2 * t) * (h - 2 * t) ** 3) / 12; return { vorm: 'koker', b, h, t, A, I, W: I / (h / 2), omtrek: 2 * (b + h), kgm: A * RHO * 1000 }; }
function buis(D, t) { const d = D - 2 * t, A = (Math.PI / 4) * (D ** 2 - d ** 2), I = (Math.PI / 64) * (D ** 4 - d ** 4); return { vorm: 'buis', b: D, h: D, t, A, I, W: I / (D / 2), omtrek: Math.PI * D, kgm: A * RHO * 1000 }; }
function rond(d) { const A = (Math.PI / 4) * d * d, I = (Math.PI / 64) * d ** 4; return { vorm: 'rond', b: d, h: d, A, I, W: I / (d / 2), omtrek: Math.PI * d, kgm: A * RHO * 1000 }; }
function vol(b, h, vorm = 'plat') { const A = b * h, I = (b * h ** 3) / 12; return { vorm, b, h, A, I, W: I / (h / 2), omtrek: 2 * (b + h), kgm: A * RHO * 1000 }; }

const GH = 'SCHATTING groothandel: € 1,45-1,75/kg (Opdenvelde, rondstaal 01/2024) + prijsstijging; winkel metaalshopper.nl € 4-7/kg';
/**
 * stalen profielen (S235JR, zwart, staven van 6 m). h = maat dwars op de balustrade (in de richting van de last), b = de
 * andere maat (langs de lijn bij een staander, verticaal bij een regel). I en W gelden voor buiging door een last dwars op de
 * balustrade. Prijs: per kg (instelbare staalprijs); norm = maatnorm.
 */
export const PROFIEL = {
  koker40x40x3: { naam: 'koker 40x40x3', norm: 'EN 10219-2', ...koker(40, 40, 3) },
  koker40x40x4: { naam: 'koker 40x40x4', norm: 'EN 10219-2', ...koker(40, 40, 4) },
  koker50x50x3: { naam: 'koker 50x50x3', norm: 'EN 10219-2', ...koker(50, 50, 3) },
  koker50x50x4: { naam: 'koker 50x50x4', norm: 'EN 10219-2', ...koker(50, 50, 4) },
  koker60x60x4: { naam: 'koker 60x60x4', norm: 'EN 10219-2', ...koker(60, 60, 4) },
  koker80x80x5: { naam: 'koker 80x80x5', norm: 'EN 10219-2', ...koker(80, 80, 5) },
  koker40x20x2: { naam: 'koker 40x20x2', norm: 'EN 10219-2', ...koker(20, 40, 2) },
  plat40x8: { naam: 'platstaal 40x8', norm: 'EN 10058', ...vol(8, 40) },
  plat50x8: { naam: 'platstaal 50x8', norm: 'EN 10058', ...vol(8, 50) },
  plat50x12: { naam: 'platstaal 50x12', norm: 'EN 10058', ...vol(12, 50) },
  plat60x12: { naam: 'platstaal 60x12', norm: 'EN 10058', ...vol(12, 60) },
  plat3: { naam: 'plaat 3 mm', norm: 'EN 10029', vorm: 'plaat', t: 3, kgm2: 23.55 },
  buis42: { naam: 'buis Ø42,4x2,6', norm: 'EN 10219-2', ...buis(42.4, 2.6) },
  rond12: { naam: 'rond Ø12', norm: 'EN 10060', ...rond(12) },
  rond14: { naam: 'rond Ø14', norm: 'EN 10060', ...rond(14) },
  rond16: { naam: 'rond Ø16', norm: 'EN 10060', ...rond(16) },
  vkt12: { naam: 'vierkant 12', norm: 'EN 10059', ...vol(12, 12, 'vkt') },
  vkt14: { naam: 'vierkant 14', norm: 'EN 10059', ...vol(14, 14, 'vkt') },
  inox48: { naam: 'inox buis Ø48,3x2,6 (1.4301, geslepen K320)', norm: 'EN 10296-2', koop: true, eurM: 32.5, ...buis(48.3, 2.6), fy: 230, bron: 'SCHATTING: Ø42,4x2 geslepen € 20,92/m (metallshopper.de) naar gewicht' },
  inox42: { naam: 'inox buis Ø42,4x2 (1.4301, geslepen K320)', norm: 'EN 10296-2', koop: true, eurM: 20.92, ...buis(42.4, 2), fy: 230, bron: 'metallshopper.de, Ø42,4x2 geslepen € 20,92/m excl. btw (13/11/2026); metaalshopper.nl € 37,98/m' },
};
export const STAALPRIJS = { v: 2.2, bron: GH };
export const STAAFLENGTE_M = 6;

/**
 * glasopbouw (gelaagd veiligheidsglas, alle bladen thermisch gehard): dikte, bladen, folie, kg/m², prijs/m².
 * Webshop: glashandelonline.com (gehard gelaagd, vanaf-prijs, incl. btw / 1,21). Werkprijs = handelsprijs (SCHATTING:
 * werkspot.nl € 140-220/m² voor maatwerk), instelbaar.
 */
const GO = 'glashandelonline.com/veiligheidsglas/gehard-gelaagd-glas (vanaf-prijs, incl. btw / 1,21)';
export const GLASOPBOUW = {
  '55.2': { naam: '55.2 gehard-gelaagd (10,76 mm)', blad: 5, n: 2, folie: 0.76, dikte: 10.76, kgm2: 25.4, prijs: 140, webshop: 168.26, bron: `${GO}: € 168,26/m²; handelsprijs SCHATTING € 140` },
  '66.2': { naam: '66.2 gehard-gelaagd (12,76 mm)', blad: 6, n: 2, folie: 0.76, dikte: 12.76, kgm2: 30.4, prijs: 158, webshop: 191.32, bron: `${GO}: € 191,32/m²; handelsprijs SCHATTING € 158` },
  '88.4': { naam: '88.4 gehard-gelaagd (17,52 mm)', blad: 8, n: 2, folie: 1.52, dikte: 17.52, kgm2: 41.6, prijs: 190, webshop: 238.35, bron: `${GO}: € 238,35/m²; handelsprijs SCHATTING € 190` },
  '1010.4': { naam: '1010.4 gehard-gelaagd (21,52 mm)', blad: 10, n: 2, folie: 1.52, dikte: 21.52, kgm2: 51.6, prijs: 236, webshop: 295.12, bron: `${GO}: € 295,12/m²; handelsprijs SCHATTING € 236` },
};
export const GLASKANT = { v: 0, bron: 'AANNAME: gehard glas wordt altijd met geslepen kanten geleverd (in de m²-prijs); los slijpen € 7,75/m (glashandelonline.com)' };
/** tint van het glas: meerprijs (deel van de glasprijs) en de kleur in 3D */
export const GLASTINT = {
  helder: { naam: 'Helder', meer: 0, tint: '#dfeef1', dekking: 0.14, bron: '' },
  extrahelder: { naam: 'Extra helder', meer: 0.35, tint: '#f1f8f8', dekking: 0.08, bron: 'SCHATTING + 35 % (verhouding gehard extra helder / helder bij glasopmaat.be)' },
  grijs: { naam: 'Grijs (fumé)', meer: 0.45, tint: '#5d6366', dekking: 0.45, bron: 'SCHATTING + 45 % (gekleurde folie of getint glas)' },
  mat: { naam: 'Mat (satijn)', meer: 0.25, tint: '#eef2f2', dekking: 0.74, bron: 'SCHATTING + 25 % (matte PVB-folie)' },
};

const RVL = 'rvsland.nl (incl. btw / 1,21, 13/11/2026)';
/** kooponderdelen: artikel, prijs per eenheid, bron */
export const KOOP = {
  // ---- Q-railing Easy Glass Smart (aluminium U-bodemprofiel, geklemd glas 12-21,52 mm)
  qrTop: { naam: 'Q-railing Easy Glass Smart vloerprofiel topmontage MOD 8210, 2500 mm, alu geanodiseerd', artikel: '168210-025-00-18', eenheid: 'st (2,5 m)', lengte: 2500, prijs: 313.19, winkel: 'rvs-products.nl', bron: 'rvs-products.nl Easy Glass Smart MOD 8210 2500 mm: € 313,19-399,18 excl. btw (13/11/2026)' },
  qrZij: { naam: 'Q-railing Easy Glass Smart vloerprofiel zijmontage (Y) MOD 8240, 2500 mm, alu geanodiseerd', artikel: 'MOD 8240 2500', eenheid: 'st (2,5 m)', lengte: 2500, prijs: 528.88, winkel: 'rvs-products.nl', bron: 'rvs-products.nl/p/.../easy-glass-smart-vloerprofiel-zijmontage-2500-mm-model-8240: € 528,88 excl. btw' },
  qrRubber: { naam: 'Q-railing rubberset Easy Glass Smart MOD 8200 (per profiel van 2,5 m)', artikel: 'MOD 8200', eenheid: 'set', prijs: 65.76, winkel: 'rvsland.nl', bron: `${RVL}: vanaf € 65,76; AANNAME: één set per profiel van 2,5 m` },
  qrEindkap: { naam: 'Q-railing eindkap Easy Glass Smart MOD 8212', artikel: 'MOD 8212', eenheid: 'st', prijs: 37.21, winkel: 'rvsland.nl', bron: `${RVL}: € 37,21 (zwart € 43,64)` },
  qrHoek: { naam: 'Q-railing hoekstuk 90° Easy Glass Smart MOD 8211', artikel: 'MOD 8211', eenheid: 'st', prijs: 144.64, winkel: 'rvsland.nl', bron: `${RVL}: € 144,64` },
  qrDrain: { naam: 'Q-railing drainageprofiel MOD 8217 (buiten, per 2,5 m)', artikel: 'MOD 8217', eenheid: 'st', prijs: 26.57, winkel: 'rvsland.nl', bron: `${RVL}: € 26,57` },
  qrHandregel: { naam: 'Q-railing U-handregel (glasframebuis) Ø42,4x1,5 inox MOD 6920, op maat', artikel: '136920-042-50-12', eenheid: 'm', prijs: 39.24, winkel: 'rvsland.nl', bron: `${RVL}: € 39,24; AANNAME per meter (lengte op maat tot 5 m)` },
  qrHandRubber: { naam: 'Q-railing glasrubber voor de U-handregel MOD 5124 (8-21,52 mm), rol 5 m', artikel: 'MOD 5124', eenheid: 'rol 5 m', lengte: 5000, prijs: 54.29, winkel: 'rvsland.nl', bron: `${RVL}: vanaf € 54,29; AANNAME rol van 5 m` },
  qrHandKap: { naam: 'Q-railing eindkap handregel Ø42,4 MOD 6732', artikel: 'MOD 6732', eenheid: 'st', prijs: 11.43, winkel: 'rvsland.nl', bron: `${RVL}: € 11,43` },
  qrHandHoek: { naam: 'Q-railing verbinder/hoek handregel Ø42,4 MOD 6790', artikel: 'MOD 6790', eenheid: 'st', prijs: 15.0, winkel: 'rvsland.nl', bron: `${RVL}: € 15,00` },
  // ---- glas met staanders
  klemVlak: { naam: 'Q-railing glasklem MOD 2100 vlak (koker), RVS 304, glas 8,76-12,76', artikel: 'MOD 2100 vlak', eenheid: 'st', prijs: 11.14, winkel: 'rvsland.nl', bron: `${RVL}/q-railing-glasvullinghouders: € 11,14` },
  klemRond: { naam: 'Q-railing glasklem MOD 2100 Ø48,3/42,4, RVS 304, glas 8,76-12,76', artikel: 'MOD 2100 rond', eenheid: 'st', prijs: 11.14, winkel: 'rvsland.nl', bron: `${RVL}: € 11,14 (budget: Umakov A/2100-042 € 4,92, umakovshop.com)` },
  klinkmoer: { naam: 'Blindklinkmoer M8 RVS, platte kraag (voor de glasklem in de koker)', artikel: 'DIN EN ISO 15983 / M8', eenheid: 'st', prijs: 0.35, winkel: 'groothandel', bron: 'SCHATTING € 0,35/st (doos 100)' },
  bout8: { naam: 'Inbusbout M8x16 RVS A2 (ISO 7380, bolkop)', artikel: 'ISO 7380 M8x16 A2', eenheid: 'st', prijs: 0.25, winkel: 'groothandel', bron: 'SCHATTING' },
  handregeldrager: { naam: 'Handregeldrager voor Ø42,4, RVS, vlak voetje (op de koker gelast of geschroefd)', artikel: 'Q-railing MOD 0560 of gelijkwaardig', eenheid: 'st', prijs: 12, winkel: 'rvsland.nl', bron: 'SCHATTING € 12/st' },
  rozet: { naam: 'Afdekrozet Ø48,3 RVS 316 (voetplaatkap)', artikel: 'Umakov A14/0512-048', eenheid: 'st', prijs: 2.6, winkel: 'umakovshop.com', bron: 'umakovshop.com Ø42,4 € 2,29 excl. btw; Ø48,3 SCHATTING € 2,60' },
  inoxEindkap: { naam: 'Eindkap Ø42,4 RVS (handregel)', artikel: 'Q-railing MOD 6732', eenheid: 'st', prijs: 11.43, winkel: 'rvsland.nl', bron: `${RVL}: € 11,43` },
  // ---- ankers
  fisv: { naam: 'Injectiemortel fischer FIS V Plus 360 S', artikel: 'fischer 558752', eenheid: 'koker 360 ml', prijs: 18.51, winkel: 'klium.be', perKoker: 20, bron: 'klium.be fischer 558752: € 18,51 excl. btw; AANNAME ± 20 gaten Ø14 x 110 per koker' },
  fisa10: { naam: 'Ankerstang fischer FIS A M10x130, 5.8 verzinkt (moer + ring)', artikel: 'fischer FIS A M10x130', eenheid: 'st', prijs: 1.9, winkel: 'galaxus.be', bron: 'SCHATTING (M12x160 € 2,3-2,7 bij galaxus.be / sfs.ch)' },
  fisa12: { naam: 'Ankerstang fischer FIS A M12x160, 5.8 verzinkt (moer + ring)', artikel: 'fischer FIS A M12x160', eenheid: 'st', prijs: 2.5, winkel: 'galaxus.be', bron: 'galaxus.be / sfs.ch (CHF 270,50 per 100): ± € 2,3-2,7' },
  fisa12a4: { naam: 'Ankerstang fischer FIS A M12x160 A4 (RVS 316, buiten)', artikel: 'fischer FIS A M12x160 A4', eenheid: 'st', prijs: 5.8, winkel: 'galaxus.be', bron: 'SCHATTING € 5,80' },
  faz10: { naam: 'Keilbout fischer FAZ II 10/10 (M10, hef 60), verzinkt', artikel: 'fischer FAZ II 10/10', eenheid: 'st', prijs: 3.59, winkel: 'gamma.be', bron: 'gamma.be € 8,69 per 2 incl. btw (/ 1,21); doos 50 FAZ II Plus 10/10 K € 1,26/st (galaxus)' },
  faz12: { naam: 'Keilbout fischer FAZ II 12/20 (M12, hef 70), verzinkt', artikel: 'fischer FAZ II 12/20', eenheid: 'st', prijs: 4.9, winkel: 'gamma.be', bron: 'SCHATTING € 4,90' },
  faz12a4: { naam: 'Keilbout fischer FAZ II 12/20 A4 (RVS, buiten)', artikel: 'fischer FAZ II 12/20 A4', eenheid: 'st', prijs: 9.0, winkel: 'galaxus.be', bron: 'SCHATTING € 9,00' },
  vulplaat: { naam: 'Uitvulplaatjes kunststof (set 1-2-3-5 mm) onder de voetplaat', artikel: 'stelplaatjes', eenheid: 'set', prijs: 0.8, winkel: 'groothandel', bron: 'SCHATTING' },
};

/**
 * ankers: rekenwaarde trek N_Rd (kN) in gescheurd beton C20/25. FAZ II: N_perm uit de fischer-tabel (ETA-05/0069, γL
 * = 1,4 inbegrepen) x 1,4. FIS V + FIS A: AANNAME (ETA-02/0024 nakijken in fischer FIXPERIENCE). gat = boorgat in
 * beton, plaatgat = gat in de voetplaat (ISO 273 / ETA).
 */
export const ANKER = {
  keil10: { naam: 'keilbout fischer FAZ II 10/10', koop: 'faz10', koopA4: 'faz12a4', d: 10, hef: 60, gat: 10, diep: 75, plaatgat: 12, NRd: 8.7, VRd: 9.8, bron: 'fischer FAZ II-lasttabel (ETA-05/0069): N_perm 6,2 kN gescheurd, M10 hef 60 → N_Rd ≈ 6,2 x 1,4 = 8,7 kN' },
  keil12: { naam: 'keilbout fischer FAZ II 12/20', koop: 'faz12', koopA4: 'faz12a4', d: 12, hef: 70, gat: 12, diep: 90, plaatgat: 14, NRd: 13.3, VRd: 14.0, bron: 'fischer FAZ II-lasttabel (ETA-05/0069): N_perm 9,5 kN gescheurd, M12 hef 70 → N_Rd ≈ 13,3 kN' },
  chem10: { naam: 'fischer FIS V Plus + FIS A M10x130', koop: 'fisa10', koopA4: 'fisa12a4', mortel: true, d: 10, hef: 90, gat: 12, diep: 90, plaatgat: 12, NRd: 9.0, VRd: 8.5, bron: 'AANNAME N_Rd 9 kN (M10, hef 90, gescheurd C20/25), na te kijken in ETA-02/0024' },
  chem12: { naam: 'fischer FIS V Plus + FIS A M12x160', koop: 'fisa12', koopA4: 'fisa12a4', mortel: true, d: 12, hef: 110, gat: 14, diep: 110, plaatgat: 14, NRd: 14.0, VRd: 12.5, bron: 'AANNAME N_Rd 14 kN (M12, hef 110, gescheurd C20/25), na te kijken in ETA-02/0024' },
};
/** randafstand: een anker dicht bij de vloerrand draagt minder (AANNAME) */
export const RAND = { boven: 0.75, zij: 0.6, bron: 'AANNAME: reductie voor randafstand (boven: ± 100 mm van de vloerrand; zij: ± 60 mm onder de vloerpas). Reken het echte anker na met fischer FIXPERIENCE' };

/** de vier soorten met hun stijlen */
export const SOORTEN = {
  spijlen: {
    naam: 'Staal met verticale spijlen', kort: 'Spijlen', kleur: '#c2410c',
    uitleg: 'Staanders op een voetplaat of tegen de vloerrand, een handregel en een onderregel; daartussen verticale spijlen, alles gelast en gepoedercoat.',
    staanders: ['koker40x40x3', 'koker40x40x4', 'koker50x50x3', 'koker50x50x4', 'koker60x60x4', 'koker80x80x5'], maxAfstand: 1600, minAfstand: 600,
    handregels: ['plat', 'rond'],
    stijlen: [
      { id: 'S1', naam: 'Ronde spijl Ø12', spijl: 'rond12', handregel: 'plat', uitleg: 'klassiek en licht: ronde spijlen Ø12, platte handregel 50x8' },
      { id: 'S2', naam: 'Ronde spijl Ø16, ronde handregel', spijl: 'rond16', handregel: 'rond', uitleg: 'steviger spijl Ø16 met een ronde handregel Ø42,4 die goed in de hand ligt' },
      { id: 'S3', naam: 'Vierkante spijl 12', spijl: 'vkt12', handregel: 'plat', uitleg: 'strak: vierkant 12 met een platte handregel' },
      { id: 'S4', naam: 'Platte spijl 40x8 (lamellen)', spijl: 'plat40x8', handregel: 'plat', uitleg: 'lamellen 40x8 dwars op de balustrade: van opzij gezien bijna dicht' },
      { id: 'S5', naam: 'Industrieel, vierkant 14 dicht', spijl: 'vkt14', gat: 70, handregel: 'plat', uitleg: 'vierkant 14 met een kleine tussenruimte: zwaar en industrieel' },
    ],
  },
  staven: {
    naam: 'Staal horizontaal of plaat', kort: 'Horizontaal / plaat', kleur: '#9a3412',
    uitleg: 'Staanders met horizontale staven of een vlakke, geperforeerde of lasergesneden plaat ertussen. Horizontale staven zijn beklimbaar: in een woning komt onderaan een dichte plint tot 450 mm.',
    staanders: ['koker40x40x3', 'koker40x40x4', 'koker50x50x3', 'koker50x50x4', 'koker60x60x4', 'koker80x80x5'], maxAfstand: 1600, minAfstand: 600,
    handregels: ['plat', 'rond'],
    stijlen: [
      { id: 'H1', naam: 'Horizontale staven Ø16', vulling: 'staven', staaf: 'rond16', handregel: 'rond', uitleg: 'ronde staven Ø16; onderaan een plint (plaat 3 mm) tot 450 mm, zodat een kind er niet op klimt' },
      { id: 'H2', naam: 'Platte staven 50x8', vulling: 'staven', staaf: 'plat50x8', handregel: 'plat', uitleg: 'platte staven 50x8 liggend; onderaan de plint tot 450 mm' },
      { id: 'H3', naam: 'Vlakke plaat', vulling: 'plaat', patroon: 'vlak', handregel: 'plat', uitleg: 'een dichte plaat 3 mm tussen de staanders: privacy op een terras' },
      { id: 'H4', naam: 'Geperforeerde plaat Rv 10-15', vulling: 'plaat', patroon: 'perfo', handregel: 'plat', uitleg: 'geperforeerd (gaten Ø10 om de 15 mm): licht en niet beklimbaar' },
      { id: 'H5', naam: 'Lasergesneden lamellen', vulling: 'plaat', patroon: 'lamel', handregel: 'plat', uitleg: 'verticale sleuven 18 mm breed uit de plaat gelaserd' },
      { id: 'H6', naam: 'Lasergesneden cirkels Ø60', vulling: 'plaat', patroon: 'cirkel', handregel: 'plat', uitleg: 'een patroon van cirkels Ø60: mooi, maar de gaten zijn opstapjes (niet in een woning)' },
    ],
  },
  glasstaal: {
    naam: 'Glas met staal of inox', kort: 'Glas en staanders', kleur: '#0f766e',
    uitleg: 'Gelaagd veiligheidsglas (gehard-gelaagd) met 4 glasklemmen tussen stalen of inox staanders, met een handregel erover.',
    staanders: ['koker40x40x4', 'koker50x50x4', 'koker60x60x4', 'koker80x80x5'], staandersInox: ['inox48'], maxAfstand: 1500, minAfstand: 600,
    handregels: ['plat', 'rond'],
    stijlen: [
      { id: 'G1', naam: 'Stalen koker, platte handregel', staander: 'staal', handregel: 'plat', uitleg: 'stalen kokers in RAL, platte handregel 50x8 erover gelast' },
      { id: 'G2', naam: 'Stalen koker, inox handregel', staander: 'staal', handregel: 'rond', uitleg: 'stalen kokers in RAL met een inox handregel Ø42,4 op dragers' },
      { id: 'G3', naam: 'Inox staanders Ø48,3', staander: 'inox', handregel: 'rond', uitleg: 'alles in geslepen inox: staanders Ø48,3 op een voetplaat, ronde klemmen, handregel Ø42,4' },
    ],
  },
  glasU: {
    naam: 'Glas in een U-profiel', kort: 'Glas in U-profiel', kleur: '#2563a8',
    uitleg: 'Volglas: het glas staat geklemd in een aluminium bodemprofiel (Q-railing Easy Glass Smart), zonder staanders. Met of zonder inox U-handregel.',
    staanders: [], maxAfstand: 1200, minAfstand: 300,
    handregels: ['rond', 'geen'],
    stijlen: [
      { id: 'U1', naam: 'Volglas met U-handregel', handregel: 'rond', uitleg: 'het glas in het profiel, met een inox U-handregel op de glasrand' },
      { id: 'U2', naam: 'Volglas zonder handregel', handregel: 'geen', uitleg: 'enkel glas: het strakst; alle bladen gehard en de fabrikant moet de resttrouw na breuk aantonen' },
    ],
  },
};
export const STIJL = (soort, id) => SOORTEN[soort].stijlen.find((s) => s.id === id) ?? SOORTEN[soort].stijlen[0];
export const PATROON = {
  vlak: { naam: 'vlak', open: 0, klim: 0, bron: '' },
  perfo: { naam: 'geperforeerd Rv 10-15', open: 0.4, klim: 10, gewicht: 0.6, bron: 'gaten Ø10 < 20 mm: niet beklimbaar' },
  lamel: { naam: 'verticale sleuven 18 mm', open: 0.45, klim: 0, gewicht: 0.55, bron: 'verticale openingen zijn geen opstap' },
  cirkel: { naam: 'cirkels Ø60', open: 0.3, klim: 60, gewicht: 0.7, bron: 'een gat Ø60 is een opstap (> 20 mm) in de zone 110-450' },
};
