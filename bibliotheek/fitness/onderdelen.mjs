// Fitnesstoestellen: profielen (S235JR, EN 10219 / EN 10255), kooponderdelen met winkel, prijs (excl. btw) en bron,
// de twee versies (thuis klasse H, pro klasse S), de vier soorten en de kleuren. Node en browser.
// Prijzen opgezocht op 2026-11-15; 'nagekeken: false' = AANNAME (pagina niet leesbaar of geschat). Zie docs/Kooponderdelen.md.
import { RAL } from '../taatsdeuren/opties.mjs';

export { RAL };
export const DATUM = '2026-11-15';
const RHO = 7.85e-6; // kg/mm³

// ---------------------------------------------------------------- profielen
/** koker b x h x t (h = hoogte in de buigrichting) */
const koker = (b, h, t) => { const dA = (4 - Math.PI) * ((2 * t) ** 2 - t ** 2), rc = 0.22 * 1.5 * t; /* hoekradius ro = 2t, ri = t (EN 10219-2) */ const A = b * h - (b - 2 * t) * (h - 2 * t) - dA, I = (b * h ** 3 - (b - 2 * t) * (h - 2 * t) ** 3) / 12 - dA * (h / 2 - rc) ** 2, Iz = (h * b ** 3 - (h - 2 * t) * (b - 2 * t) ** 3) / 12 - dA * (b / 2 - rc) ** 2; return { vorm: 'koker', naam: `koker ${b}x${h}x${t}`, b, h, t, A, I, W: I / (h / 2), Iz, Wz: Iz / (b / 2), kgm: A * RHO * 1000, omtrek: 2 * (b + h), norm: 'EN 10219 S235JRH', gat: null }; };
/** ronde buis D x t */
const buis = (D, t, naam = `buis Ø${D}x${t}`, norm = 'EN 10219 S235JRH') => { const d = D - 2 * t, A = (Math.PI / 4) * (D ** 2 - d ** 2), I = (Math.PI / 64) * (D ** 4 - d ** 4); return { vorm: 'buis', naam, b: D, h: D, t, A, I, W: I / (D / 2), Iz: I, Wz: I / (D / 2), kgm: A * RHO * 1000, omtrek: Math.PI * D, norm }; };
/** massief rond D */
const rond = (D) => { const A = (Math.PI / 4) * D ** 2, I = (Math.PI / 64) * D ** 4; return { vorm: 'rond', naam: `rond Ø${D}`, b: D, h: D, t: D / 2, A, I, W: I / (D / 2), Iz: I, Wz: I / (D / 2), kgm: A * RHO * 1000, omtrek: Math.PI * D, norm: 'EN 10060 S235JR' }; };
/** platstaal b x t (b = breedte, buiging over de breedte) */
const strip = (b, t) => { const A = b * t, I = (t * b ** 3) / 12, Iz = (b * t ** 3) / 12; return { vorm: 'strip', naam: `platstaal ${b}x${t}`, b: t, h: b, t, A, I, W: I / (b / 2), Iz, Wz: Iz / (t / 2), kgm: A * RHO * 1000, omtrek: 2 * (b + t), norm: 'EN 10058 S235JR' }; };

export const PROFIEL = {
  k30x30x2: koker(30, 30, 2), k40x40x2: koker(40, 40, 2), k40x40x3: koker(40, 40, 3), k50x50x3: koker(50, 50, 3), k50x50x4: koker(50, 50, 4),
  k60x60x3: koker(60, 60, 3), k60x60x4: koker(60, 60, 4), k70x70x4: koker(70, 70, 4), k80x80x4: koker(80, 80, 4), k80x80x5: koker(80, 80, 5), k100x100x4: koker(100, 100, 4),
  k50x30x2: koker(30, 50, 2), k60x40x3: koker(40, 60, 3), k80x40x3: koker(40, 80, 3), k80x40x4: koker(40, 80, 4), k100x50x3: koker(50, 100, 3), k100x50x4: koker(50, 100, 4), k120x60x4: koker(60, 120, 4), k120x80x5: koker(80, 120, 5),
  b25x2: buis(25, 2), b32x3: buis(32, 3.2, 'buis Ø32x3,2 (optrekstang)'), b42x3: buis(42.4, 3.2, 'buis Ø42,4x3,2', 'EN 10255 S195T / EN 10219'), b48x3: buis(48.3, 3.2, 'buis Ø48,3x3,2 (schijfhouder)', 'EN 10255 / EN 10219 S235JRH'), b48x4: buis(48.3, 4, 'buis Ø48,3x4 (schijfhouder)'), b48x8: buis(48.3, 8, 'buis Ø48,3x8 naadloos (schijfhouder)', 'EN 10216-1 / DIN 2448 P235'),
  b60x3: buis(60.3, 3.6, 'buis Ø60,3x3,6'), b60x5: buis(60.3, 5, 'buis Ø60,3x5'), b60x8: buis(60.3, 8, 'buis Ø60,3x8 naadloos (lagerhuis)', 'EN 10216-1 P235'), b76x4: buis(76.1, 4, 'buis Ø76,1x4'), b76x8: buis(76.1, 8, 'buis Ø76,1x8 naadloos (lagerhuis)', 'EN 10216-1 P235'),
  r16: rond(16), r20: rond(20), r25: rond(25), r30: rond(30), r35: rond(35), r38: rond(38), r60: rond(60), r30s: { ...rond(30), fy: 355, naam: 'rond Ø30 S355J2 (optrekstang)' }, r35s: { ...rond(35), fy: 355, naam: 'rond Ø35 S355J2 (optrekstang)' }, r40: { ...rond(40), fy: 355, naam: 'rond Ø40 C45 / S355J2 (as)' },
  s40x8: strip(40, 8), pl10x300: strip(300, 10), pl12x450: strip(450, 12), pl12x600: strip(600, 12), s50x8: strip(50, 8), s60x10: strip(60, 10), s80x10: strip(80, 10), s30x10: strip(30, 10), s12x8: strip(12, 8), s30x8: strip(30, 8), s90x10: strip(90, 10), s100x10: strip(100, 10), s140x10: strip(140, 10), s180x10: strip(180, 10), s80x15: strip(80, 15), s24x8: strip(24, 8), b38x5: buis(38, 5, 'buis Ø38x5 uitgedraaid (lagerbus)', 'EN 10297-1 E355'), b44x5: buis(44.5, 5, 'buis Ø44,5x5 uitgedraaid (lagerbus)', 'EN 10297-1 E355'), b89x5: buis(88.9, 5, 'buis Ø88,9x5'), pl10x150: strip(150, 10),
};
for (const [k, P] of Object.entries(PROFIEL)) P.id = k;

// ---------------------------------------------------------------- de twee versies
/**
 * thuis = EN ISO 20957 klasse H (thuisgebruik), pro = klasse S (studio, commercieel). Per rol het profiel, het gat voor de
 * pennen, de kooponderdelen en de maximale belasting op het label.
 */
export const VERSIE = {
  thuis: {
    id: 'thuis', naam: 'Thuis', klasse: 'H', uitleg: 'EN ISO 20957 klasse H: thuisgebruik',
    gebruiker: 120, // kg op het label (norm: minstens 100)
    P: { staander: 'k60x60x3', ligger: 'k60x60x3', voet: 'k60x60x3', licht: 'k50x50x3', klein: 'k40x40x2', bank: 'k80x40x3', bankLicht: 'k50x30x2', arm: 'k50x50x3', hefboom: 'k80x40x3', optrek: 'r30s', sleeve: 'b48x3', stang: 'r35', greep: 'b32x3', as: 'r25', bus: 'b42x3', toren: 'k60x60x3', breed: 'k100x50x3', wagen: 'k80x80x4' },
    gat: 17, pin: 16, plaat: 8, voetplaat: 8, las: 3,
    katrol: 'katrol115', kabel: 'kabel6', stapelN: 16, stapelKg: 5, lager: 'glij25', lineair: 'lm25', selectiepen: 'selectiepen', pin25: 'pullpin16', leer: 'leerThuis', voetje: 'voetThuis', bout: 'boutM12', wiel: 'zwenkwiel50', handgreep: 'handgreep', latbar: 'latbarThuis', schuimrol: 'schuimrol100', kabeleind: 'kabelstop', wartel: 'wartelThuis',
  },
  pro: {
    id: 'pro', naam: 'Pro', klasse: 'S', uitleg: 'EN ISO 20957 klasse S: studio en commercieel gebruik',
    gebruiker: 150,
    P: { staander: 'k80x80x4', ligger: 'k80x80x4', voet: 'k80x80x4', licht: 'k60x60x3', klein: 'k50x50x3', bank: 'k100x50x3', bankLicht: 'k60x40x3', arm: 'k60x60x4', hefboom: 'k100x50x4', optrek: 'r35s', sleeve: 'b48x8', stang: 'r38', greep: 'b32x3', as: 'r30', bus: 'b48x4', toren: 'k80x80x4', breed: 'k120x60x4', wagen: 'k100x100x4' },
    gat: 26, pin: 25, plaat: 10, voetplaat: 12, las: 4,
    katrol: 'katrol115pro', kabel: 'kabel6', stapelN: 20, stapelKg: 5, lager: 'glij30', lineair: 'lm25pro', selectiepen: 'selectiepenPro', pin25: 'pullpin25', leer: 'leerPro', voetje: 'voetPro', bout: 'boutM16', wiel: 'zwenkwiel75', handgreep: 'vgrip', latbar: 'latbar', schuimrol: 'schuimrol100', kabeleind: 'kabeleind', wartel: 'wartel',
  },
};

// ---------------------------------------------------------------- kooponderdelen (prijs excl. btw)
const EX19 = (v) => Math.round((v / 1.19) * 100) / 100, EX21 = (v) => Math.round((v / 1.21) * 100) / 100;
/** k(naam, artikel, winkel, prijs excl. btw, eenheid, url, nagekeken, extra) */
const k = (naam, artikel, winkel, prijs, eenheid, bron, nagekeken = true, extra = {}) => ({ naam, artikel, winkel, prijs, eenheid, bron, nagekeken, ...extra });
export const KOOP = {
  katrol90: k('Katrol Ø90 kunststof met kogellager', 'Seilrolle Ø90 Z-SR-90, as Ø10,5, 160 kg', 'fitnessmarkt.com (Megafitness, DE)', 4.12, 'st', 'https://www.fitnessmarkt.com/detail/seilrolle-umlenkrolle-o-90-mm-250700', true, { D: 90, as: 10.5, kN: 1.57 }),
  katrol115: k('Katrol Ø115 kunststof met kogellager', 'Seilrolle Ø115 Z-SR-115, as Ø10,5, 160 kg', 'fitnessmarkt.com (Megafitness, DE)', 5.8, 'st', 'https://www.fitnessmarkt.com/detail/seilrolle-umlenkrolle-o-115-mm-250698', true, { D: 115, as: 10.5, kN: 1.57 }),
  katrol90pro: k('Katrol Ø90 aluminium met kogellagers', 'Seilrolle / Umlenkrolle aluminium Ø90', 'jk-sportvertrieb.de', 19.24, 'st', 'https://www.jk-sportvertrieb.de/seilrolle-/-umlenkrolle-aluminium-%C3%B8-90-mm/', true, { D: 90, as: 10.5, kN: 3 }),
  katrol115pro: k('Katrol Ø115 aluminium met kogellagers', 'Seilrolle / Umlenkrolle aluminium Ø115', 'jk-sportvertrieb.de', 22.61, 'st', 'https://www.jk-sportvertrieb.de/seilrolle-/-umlenkrolle-aluminium-%C3%B8-115-mm/', true, { D: 115, as: 10.5, kN: 3 }),
  kabel5: k('Staalkabel Ø5 met mantel, 7x19', 'Drahtseil für Fitnessgeräte 5 mm (kern 3,0 mm, breukkracht 539 kg)', 'gymparts.de', EX19(2.9), 'm', 'https://gymparts.de/Drahtseil-fuer-Fitnessgeraete--5-mm-6', true, { d: 5, kern: 3, MBL: 5.29 }),
  kabel6: k('Staalkabel Ø6 met mantel, 7x19 verzinkt', 'Drahtseil für Fitnessgeräte 6 mm (kern 4,0 mm, breukkracht 959 kg)', 'gymparts.de', EX19(3.2), 'm', 'https://gymparts.de/Drahtseil-fuer-Fitnessgeraete--6-mm-20', true, { d: 6, kern: 4, MBL: 9.41 }),
  kabelstop: k('Kabelstopper met kogel 40 mm', 'Kugelkopf-Seilstopper 40 mm', 'gymparts.de', EX19(3.4), 'st', 'https://gymparts.de/Kugelkopf---Seilstopper-40-mm-11', true),
  kabeleind: k('Kabeleindstuk met oog (geperst)', 'Endhülse mit Öse für 5 oder 6 mm', 'jk-sportvertrieb.de', 8.19, 'st', 'https://www.jk-sportvertrieb.de/endhuelse-mit-oese-fuer-5-oder-6-mm-huelse/', true),
  persklem: k('Persklem aluminium voor de kern 3-4 mm (EN 13411-3)', 'Stabilit Seilpressklemme 4 mm', 'Bauhaus.info', 0.45, 'st', 'https://www.bauhaus.info/seilklemmen/stabilit-seilpressklemme/p/10186223', false),
  kous: k('Kous (thimble) RVS 4 mm', 'Stabilit Kausche 4 mm', 'Bauhaus.info', EX19(3.25), 'st', 'https://www.bauhaus.info/kauschen/stabilit-kausche/p/10196842', false),
  karabijn: k('Karabijnhaak verzinkt 80 x 8', 'Karabinerhaken verzinkt 80x8 mm', 'jk-sportvertrieb.de', 1.6, 'st', 'https://www.jk-sportvertrieb.de/karabinerhaken-verzinkt-80-x-8-mm/', true),
  wartelThuis: k('Karabijn met draaiwartel 12 mm', 'karabijnhaak met wartel (eBay)', 'ebay.de', EX19(6.09), 'st', 'https://www.ebay.de/p/1255662453', false),
  wartel: k('Draaiwartel RVS 10 mm', 'Drehwirbel 10 mm Edelstahl', 'Hornbach.de', EX19(14.95), 'st', 'https://www.hornbach.de/p/drehwirbel-10-mm-edelstahl/6810224', false),
  lm25: k('Lineair kogellager LM25UU', 'LM25UU', 'motedis', 3.94, 'st', 'https://www.motedis.es/en/Linear-bearing-25mm-LM25UU', true),
  lm25pro: k('Lineaire glijbus igus drylin RJUM-01-25', 'igus drylin RJUM-01-25', 'RS Components NL', 32.81, 'st', 'https://nl.rs-online.com/web/p/linear-bearings/3113496', false),
  stang25: k('Geleidestang Ø25 h6 gehard en geslepen', 'precisie-as Ø25 C53 h6 (+ € 5 per zaagsnede)', 'Damen CNC (NL)', 37.5, 'm', 'https://damencnc.com/en/25mm-linear-motion-shaft-precision/a998', true),
  lager6204: k('Kogellager 6204-2RS', 'RS PRO 6204-2RS', 'RS Components NL', 5.49, 'st', 'https://nl.rs-online.com/web/p/products/6190339', false),
  lager6204pro: k('Kogellager SKF 6204-2RSH', 'SKF 6204-2RSH', 'RS Components BE', 8.31, 'st', 'https://benl.rs-online.com/web/p/ball-bearings/4420098', false),
  glij25: k('Flensglijlager iglidur GFM-2528-21 (as Ø25)', 'igus iglidur GFM-2528-21', 'RS Components BE', 1.93, 'st', 'https://benl.rs-online.com/web/p/plain-bearings/2724614', false),
  glij30: k('Flensglijlager iglidur GFM-3034-26 (as Ø30)', 'igus iglidur GFM-3034-26', 'RS Components BE', 2.79, 'st', 'https://benl.rs-online.com/web/p/plain-bearings/2724622', false),
  uhmw: k('UHMW-PE (PE 1000) plaat 10 mm, zwart, op maat', 'HMPE 1000 zwart 10 mm', 'Perlaplast kunststofshop (NL)', EX21(113.69), 'm²', 'https://perlaplast-kunststofshop.nl/hmpe-1000-plaat-zwart-dikte-10-mm', true),
  selectiepen: k('Selectiepen magnetisch Ø10 x 140', 'Magnet-Steckbolzen 10 mm, 140 mm', 'fitnessmarkt.com', 5.8, 'st', 'https://www.fitnessmarkt.com/detail/magnet-steckbolzen-10-mm-fuer-250697', true),
  selectiepenPro: k('Selectiepen aluminium magnetisch Ø10 met spiraalkabel', 'Alu Magnetsteckbolzen 10 x 100/140 mm', 'fitnessmarkt.com', 7.14, 'st', 'https://www.fitnessmarkt.com/detail/aluminium-magnetsteckbolzen-10-mm-x-250708', true),
  pullpin16: k('Veerpen / pull pin Ø16 x 80 met ring', 'pull pin 16 mm (generiek, fitness-onderdelen)', 'AANNAME (fitness-onderdelenshop)', EX21(10), 'st', 'AANNAME: vergelijkbaar met de pull pin Ø25 (Fruugo), niet nagekeken', false),
  pullpin25: k('Veerpen / pull pin Ø25 x 90', 'gym pull pin 25x90 met veer (generiek)', 'Fruugo', EX21(15), 'st', 'https://www.fruugo.us/gym-equipment-pull-pin-25x90mm-steel-with-spring-load-for-secure-and-tool-assembly/p-458968665', false),
  indexplunjer: k('Indexplunjer Ganter GN 817-10 (pen Ø10, M16x1,5)', 'GN 817-10', 'Galaxus', EX19(30), 'st', 'https://www.galaxus.de/en/s4/product/ganter-indexing-plunger-gn-817-d1-10-mm-d2-m-16-x-15-mm-l1-12-mm-steel-without-indexing-lock-with-lo-22189928', false),
  multiplex: k('Multiplex okoumé 18 mm (2500 x 1220)', 'JUMBO okoumé ongegrond 250x122x18', 'Hornbach NL', EX21(125), 'plaat', 'https://www.hornbach.nl/p/jumbo-okoume-ongegrond-250x122-cm-18-mm/12564463/', true, { m2: 3.05 }),
  schuim: k('Koudschuim RG40 50 mm (1000 x 2000)', 'Isopur schuimvulling 100x200x5 cm RG40', 'Hornbach NL', EX21(98.95), 'plaat', 'https://www.hornbach.nl/p/schuimvulling-isopur-100x200x5-cm/6225563/', true, { m2: 2 }),
  leerThuis: k('Kunstleer PVC zwart 140 cm breed', 'd-c-fix Noblessa Basic', 'Hornbach NL', EX21(12.95), 'm', 'https://www.hornbach.nl/p/d-c-fix-kunstleer-noblessa-basic-zwart-140-cm-breed-van-de-rol/5882728/', true, { breed: 1400 }),
  leerPro: k('Kunstleer Master Plus 140 cm, 150.000 Martindale, brandvertragend', 'Master Plus', 'moebelstoffparadies.de', EX19(54), 'm', 'https://www.moebelstoffparadies.de/?p=61698', true, { breed: 1400 }),
  inslagmoer: k('Inslagmoer M8 (in de multiplex)', 'Hettich stalen inslagmoer M8/10 mm, 50 st', 'Hornbach NL', EX21(8) / 50, 'st', 'https://www.hornbach.nl/p/hettich-stalen-inslagmoer-met-schroefdraad-m8-10-mm-50-stuks/8673670/', true),
  boutM8: k('Bout M8 x 30 met ring (kussen op het frame)', 'DIN 933 M8x30 8.8 verzinkt', 'AANNAME (bouwmarkt)', 0.18, 'st', 'AANNAME: doos van 100 ± € 18', false),
  nietjes: k('Tackernietjes 10 mm (doos 5000)', 'nietjes type 140', 'AANNAME (bouwmarkt)', 5, 'doos', 'AANNAME', false),
  voetThuis: k('Stelvoet M10 x 75, Ø60', 'Hettich stelvoet M10x75 Ø60 RVS', 'Hornbach NL', EX21(4.75), 'st', 'https://www.hornbach.nl/p/hettich-stelvoet-m10x75-mm-o-60-mm-rvs/4297032/', false),
  voetPro: k('Rubbervoet M10, Ø50 x 45 (Paulstra)', 'Paulstra rubbervoet M10 draadeind', 'RS Components NL', 11.18, 'st', 'https://nl.rs-online.com/web/p/dampers-stops/4088161/', false),
  borgveer: k('Borgveer (R-clip) Ø4 verzinkt', 'DIN 11024 Ø4', 'Hornbach NL', EX21(0.6), 'st', 'https://www.hornbach.nl', false),
  spanstift: k('Spanstift DIN 1481 Ø8 verzinkt', 'DIN 1481 8 x 50', 'Hornbach NL', EX21(0.8), 'st', 'https://www.hornbach.nl', false),
  stelring25: k('Stelring DIN 705 Ø25 met stelschroef', 'DIN 705 A 25', 'Eriks / Brammer', 3.2, 'st', 'AANNAME: prijs Eriks', false),
  stelring30: k('Stelring DIN 705 Ø30 met stelschroef', 'DIN 705 A 30', 'Eriks / Brammer', 3.9, 'st', 'AANNAME: prijs Eriks', false),
  borgring20: k('Borgring DIN 471 Ø20', 'DIN 471 20x1,2', 'Hornbach NL', EX21(0.25), 'st', 'https://www.hornbach.nl', false),
  veer: k('Trekveer Ø12 x 60 mm', 'trekveer 1,2 x 12 x 60', 'Hornbach NL', EX21(1.5), 'st', 'https://www.hornbach.nl', false),
  stopring: k('Stopring Ø25 met rubberbuffer, klembaar (M8)', 'klemring DIN 705 Ø25 + rubberring', 'Eriks / Brammer', 6.5, 'st', 'AANNAME: prijs Eriks', false),
  glij35: k('Flensglijlager iglidur GFM-3539-26 (stang Ø35)', 'igus iglidur GFM-3539-26', 'RS Components BE', 3.6, 'st', 'AANNAME: igus-prijslijst', false),
  glij38: k('Flensglijlager iglidur GFM-4044-30 (stang Ø38, uitgedraaid)', 'igus iglidur GFM-4044-30', 'RS Components BE', 4.4, 'st', 'AANNAME: igus-prijslijst', false),
  glij40: k('Flensglijlager iglidur GFM-4044-30 (as Ø40)', 'igus iglidur GFM-4044-30', 'RS Components BE', 4.4, 'st', 'AANNAME: igus-prijslijst', false),
  stelring40: k('Stelring DIN 705 Ø40 met stelschroef', 'DIN 705 A 40', 'Eriks / Brammer', 5.2, 'st', 'AANNAME: prijs Eriks', false),
  lager6206: k('Kogellager 6206-2RS', 'SKF 6206-2RS1', 'RS Components BE', 9.8, 'st', 'AANNAME: RS-prijs', false),
  stapelbus: k('Kunststof bus Ø25/32 x 20 (stapelplaat)', 'iglidur J flensbus 25/32', 'igus / RS Components', 1.1, 'st', 'AANNAME: igus-prijslijst', false),
  stapelsticker: k('Sticker gewicht stapelplaat (vinyl)', 'sticker 40 x 25', 'drukkerij', 0.4, 'st', 'AANNAME', false),
  lasmoerM10: k('Lasmoer M10 verzinkt', 'DIN 929 M10', 'Hornbach NL', EX21(0.45), 'st', 'https://www.hornbach.nl', false),
  looprolPU: k('Looprol Ø50 met PU-band op kogellager 6204-2RS', 'PU-rol 50 x 20, boring 20', 'Blickle / Wicke (AANNAME)', 7.5, 'st', 'AANNAME: Blickle-prijslijst', false),
  afstandsbus: k('Afstandsbus in doorgeboute koker (buis 20x2 op lengte)', 'buis Ø20x2 gezaagd', 'eigen werk', 0.6, 'st', 'AANNAME', false),
  griptape: k('Rubber handvat / griptape per greep', 'handvat 130 mm', 'gymparts.de', 3.5, 'st', 'AANNAME', false),
  antislip: k('Antislip (kwartszand-tape) op voetplaten', '3M Safety-Walk 50 mm', 'Hornbach NL', 18, 'm²', 'AANNAME', false),
  typeplaat: k('Typeplaatje alu 0,8 mm bedrukt + 4 blindklinknagels Ø3', 'typeplaat 105 x 74', 'graveerdienst', 6.5, 'st', 'AANNAME', false),
  waarschuwing: k('Waarschuwingsstickers (klempunt, pen-instructie) set', 'sticker ISO 7010 W001/W024', 'drukkerij', 4, 'set', 'AANNAME', false),
  maskeer: k('Maskeerdoppen en -pluggen voor poedercoat', 'siliconen pluggen set', 'Caswell / Tesa', 0.15, 'st', 'AANNAME', false),
  vet: k('Smeermiddel (lithiumvet) voor pennen en geleidingen', 'tube 100 g', 'Hornbach NL', 4, 'st', 'AANNAME', false),
  verpakking: k('Verpakking: pallet, hoekbeschermers, stretchfolie', 'europallet + folie', 'eigen', 22, 'st', 'AANNAME', false),
  handleiding: k('Handleiding NL/FR (druk) en montagefiche', 'A4 geniet', 'drukkerij', 6, 'st', 'AANNAME', false),
  moerM12: k('Moer M12 + ring (geleidestang boven)', 'DIN 934 M12 + DIN 125', 'Hornbach NL', EX21(0.4), 'st', 'https://www.hornbach.nl', false),
  buffer: k('Rubberbuffer onder de gewichtstapel', 'Paulstra rubberbuffer M10 Ø50x45', 'RS Components NL', 11.18, 'st', 'https://nl.rs-online.com/web/p/dampers-stops/4088161/', false),
  kap40: k('Eindkap koker 40x40 / 50x50', 'lamellenstop vierkant zwart', 'ebay.de', EX19(1.2), 'st', 'https://www.ebay.de/itm/405306593320', false),
  kap60: k('Eindkap koker 60x60', 'kokerdop 60x60', 'emfa-b2b.com', 0.8, 'st', 'https://emfa-b2b.com/square-end-caps/760-square-end-caps-for-steel-box-section-60x60-mm-grey.html', false),
  kap80: k('Eindkap koker 80x80 / 80x40 / 100x50', 'lamellenstop rechthoekig', 'ebay.de', EX19(4.52), 'st', 'https://www.ebay.de/itm/156964479197', false),
  kapBuis: k('Eindkap buis Ø48,3', 'Layher afwerkdop Ø48,3 (6494586)', 'Layher NL', 0.55, 'st', 'https://www.layher.nl/shop/product/6494586-afwerkdop-dia-48-3-mm-vlak-binnen-kunststof', false),
  latbarThuis: k('Latstang 120 cm, hol, rubber handgrepen', 'Lat bar 120 cm hollow', 'fitnessmarkt.com', 28.57, 'st', 'https://www.fitnessmarkt.com/detail/lat-bar-120-cm-hollow-246492', true),
  latbar: k('Latstang 120 cm met bumperuiteinden', 'Lat bar approx. 120 cm', 'fitnessmarkt.com', 34.45, 'st', 'https://www.fitnessmarkt.com/detail/lat-bar-approx-120-cm-246493', true),
  handgreep: k('Triceps/biceps-greep gecoat met draaigewricht', 'Triceps-Bizeps-Griff beschichtet', 'fitnessmarkt.com', 21.01, 'st', 'https://www.fitnessmarkt.com/detail/triceps-biceps-grip-coated-246442', true),
  vgrip: k('V-greep met antislip uiteinden', 'tricepsgreep V-vorm', 'Gorilla Sports NL', EX21(39.99), 'st', 'https://gorillasports.nl/en/products/tricepsgreep-vvorm-antislip-uiteinden', false),
  touw: k('Tricepstouw + roeigreep (set)', 'Gorilla Sports set', 'Kaufland.de', EX19(29.99), 'set', 'https://www.kaufland.de/product/140053231/', false),
  enkelband: k('Enkelband leder, verstelbaar', 'Fußschlaufe Leder verstellbar', 'fitnessmarkt.com', 20.92, 'st', 'https://www.fitnessmarkt.com/detail/fussschlaufe-leder-verstellbar-extra-weich-250559', true),
  schuimrol100: k('Schuimrol Ø100 x 200 voor as Ø25', 'Polsterrolle Ø100', 'fitnessmarkt.com', 12.52, 'st', 'https://www.fitnessmarkt.com/detail/devices-upholstery-roller-o-100-246375/print', true),
  boutM12: k('Bout M12 x 100 8.8 verzinkt + borgmoer + 2 ringen', 'DIN 931 M12x100 + DIN 985 + DIN 125', 'auto-service.be + Hornbach NL', EX21(16.2) / 10 + EX21(15) / 100 + (2 * EX21(6)) / 100, 'st', 'https://www.auto-service.be/en/fasteners/bolts/hex-bolts/hexagonal-bolt-88-din931-electrolitic-zinc-plated-m12x100-10pcs', true, { M: 12 }),
  boutM16: k('Bout M16 x 130 8.8 verzinkt + borgmoer + 2 ringen', 'DIN 931 M16x130 + DIN 985 + DIN 125', 'auto-service.be + Hornbach NL', EX21(83.99) / 25 + EX21(31.6) / 100 + 0.1, 'st', 'https://www.auto-service.be/en/fasteners/bolts/hex-bolts/hexagonal-bolt-88-din931-electrolitic-zinc-plated-m16x130-25pcs', true, { M: 16 }),
  boutM10: k('Bout M10 x 60 8.8 + borgmoer (katrolas)', 'DIN 931 M10x60 + DIN 985', 'AANNAME (bouwmarkt)', 0.35, 'st', 'AANNAME', false, { M: 10 }),
  anker: k('Keilbout M12 x 110 (vloer- of muuranker)', 'fischer FAZ II 12/10 (zoals bij de balustrades)', 'AANNAME (vakhandel)', 3.2, 'st', 'AANNAME: zie balustrades/onderdelen.mjs', false, { M: 12 }),
  zwenkwiel50: k('Zwenkwiel rubber 50 mm met plaat, 35 kg', 'zwenkwiel 50 mm', 'Gamma BE', EX21(5.79), 'st', 'https://www.gamma.be/nl/assortiment/zwenkwiel-rubber-met-plaatbevestiging-50-mm-tot-35-kg/p/B100075', false),
  zwenkwiel75: k('Zwenkwiel Tente 75 mm rubber met rem, 55 kg', 'Tente 75 mm', 'RS Components AT', 14.5, 'st', 'https://at.rs-online.com/web/p/lenkrollen/3222089', false),
  rubbermat: k('Rubberstrook 3 mm op de legplank (per m²)', 'rubbermat 3 mm', 'AANNAME (bouwmarkt)', 12, 'm²', 'AANNAME', false),
};

/** steunpunt voor het eindkapje van een profiel */
export const kapVoor = (P) => (P.vorm === 'buis' ? 'kapBuis' : P.vorm !== 'koker' ? null : Math.max(P.b, P.h) >= 80 ? 'kap80' : Math.max(P.b, P.h) >= 60 ? 'kap60' : 'kap40');

// ---------------------------------------------------------------- soorten en kleuren
export const SOORTEN = {
  rek: { id: 'rek', naam: 'Rekken en racks', kort: 'Rek', prefix: 'FR', accent: '#c2410c', uitleg: 'Power racks, squat stands, dipstation en opbergrekken voor schijven, halters en stangen.' },
  bank: { id: 'bank', naam: 'Banken', kort: 'Bank', prefix: 'FB', accent: '#0f766e', uitleg: 'Vlakke en verstelbare banken, bankdrukstations en banken voor rug, buik en heupen.' },
  kabel: { id: 'kabel', naam: 'Kabelmachines', kort: 'Kabel', prefix: 'FK', accent: '#2563a8', uitleg: 'Toestellen met katrollen en een staalkabel, met een gewichtstapel of met schijven.' },
  plate: { id: 'plate', naam: 'Plate-loaded machines', kort: 'Plate-loaded', prefix: 'FP', accent: '#7c3aed', uitleg: 'Machines met een hefboom of een slede waar je zelf schijven op legt.' },
};
export const BEKLEDING = [
  { code: 'zwart', naam: 'Zwart', hex: '#1b1c1e' }, { code: 'antraciet', naam: 'Antraciet', hex: '#3b3e42' }, { code: 'rood', naam: 'Rood', hex: '#9b1c1c' },
  { code: 'blauw', naam: 'Blauw', hex: '#1e3a8a' }, { code: 'bruin', naam: 'Cognac', hex: '#8a4b22' }, { code: 'grijs', naam: 'Lichtgrijs', hex: '#9aa0a6' },
];
/** de RAL-kleuren voor het frame: uit de taatsdeuren, aangevuld met de typische fitnesskleuren (hex bij benadering) */
export const RAL_FITNESS = [
  ...['9005', '7016', '7021', '9010', '7035', '9006'].map((c) => RAL.find((r) => r.code === c)).filter(Boolean),
  { code: '3020', naam: 'Verkeersrood', hex: '#bb1e10' }, { code: '5010', naam: 'Gentiaanblauw', hex: '#0e4c8c' }, { code: '1023', naam: 'Verkeersgeel', hex: '#f0b400' },
  { code: '2004', naam: 'Zuiver oranje', hex: '#e75b12' }, { code: '6018', naam: 'Geelgroen', hex: '#4c9a2a' },
];
