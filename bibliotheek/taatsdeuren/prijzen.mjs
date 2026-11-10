// Prijzen en kostprijs van een taatsdeur (excl. btw). Elke prijs heeft een bron; 'schatting' = geen prijs gevonden,
// vraag een offerte. Opgezocht op 2026-11-10. Werkt in Node en in de browser.
import { lijsten, laserKg, gewicht } from './deuren.mjs';
import { stappen, UREN } from './werkwijze.mjs';
import { GLAS, OPBOUW, SCHARNIEREN, RAL, METALLIC } from './opties.mjs';

const MS = 'https://www.metallshopper.de/p/';
/** staven: kg/m, prijs per m, omtrek (mm, voor de coating), bron */
export const STAAF = {
  koker40x40x2: { naam: 'koker 40x40x2', kgm: 2.31, prijs: 10.13, omtrek: 160, bron: `${MS}stahlrohr-vierkant-schwarz-40x40x2-mm-736015/` },
  koker40x20x2: { naam: 'koker 40x20x2', kgm: 1.68, prijs: 7.33, omtrek: 120, bron: `${MS}stahlrohr-vierkant-schwarz-40x20x2-mm-386628/` },
  koker60x40x2: { naam: 'koker 60x40x2', kgm: 3.01, prijs: 14.41, omtrek: 200, bron: 'metallshopper.de: 60x40x2 € 14,41/m (10/11/2026); 3,01 kg/m (bauhaus.at)' },
  koker60x60x2: { naam: 'koker 60x60x2', kgm: 3.64, prijs: 17.43, omtrek: 240, bron: 'schatting: € 4,79/kg zoals koker 60x40x2' },
  koker30x20x2: { naam: 'koker 30x20x2', kgm: 1.44, prijs: 6.9, omtrek: 100, bron: 'schatting: € 4,79/kg zoals koker 60x40x2' },
  plat20x10: { naam: 'platstaal 20x10', kgm: 1.57, prijs: 8.64, omtrek: 60, bron: 'schatting: € 5,50/kg zoals platstaal 30x8 bij metallshopper.de' },
  plat30x3: { naam: 'platstaal 30x3', kgm: 0.71, prijs: 3.9, omtrek: 66, bron: 'schatting: € 5,50/kg' },
  plat15x4: { naam: 'platstaal 15x4', kgm: 0.47, prijs: 2.6, omtrek: 38, bron: 'schatting: € 5,50/kg' },
  rond25: { naam: 'rond Ø25', kgm: 3.85, prijs: 21.2, omtrek: 79, bron: 'schatting: € 5,50/kg' },
  jansen30407: { naam: 'Jansen Economy 50, 30.407', kgm: 3.45, prijs: 41.4, omtrek: 200, bron: 'gewicht: Jansen-catalogus (feon.fi); prijs: schatting € 12/kg, offerte via een Jansen-verdeler' },
  jansen30006: { naam: 'Jansen Economy 50, 30.006', kgm: 2.33, prijs: 28, omtrek: 150, bron: 'idem' },
  jansen30007: { naam: 'Jansen Economy 50, 30.007', kgm: 2.96, prijs: 35.5, omtrek: 200, bron: 'idem' },
  jansen402: { naam: 'Jansen glaslat 402', kgm: 0.8, prijs: 9.6, omtrek: 60, bron: 'gewicht 0,55-1,05 kg/m (Jansen-catalogus); prijs: schatting' },
};
export const PRIJS = {
  laserPerKg: { v: 4.5, bron: 'schatting (geen publieke prijs gevonden): plaat S235 + snijden' },
  laserPerDeel: { v: 3, bron: 'schatting: opstart en snijtijd per onderdeel' },
  glas: Object.fromEntries(Object.entries(GLAS).map(([k, g]) => [k, { v: g.prijs, naam: g.soort, bron: g.bron }])),
  dubbelGlas: { v: OPBOUW.dubbel.meer.v, bron: OPBOUW.dubbel.meer.bron },
  metallic: METALLIC,
  glasVorm: { v: 0.4, bron: 'schatting: + 40 % voor een ruit met een boog (gesneden op een DXF)' },
  glasMin: { v: 0.3, bron: 'schatting: kleinste aangerekende ruit 0,3 m²' },
  glasKant: { v: 7.75, bron: 'kanten slijpen per m: https://www.glashandelonline.com/gekleurd-gelaagd-glas-44.2-grijs/Grijs/44.2/' },
  scharnier: Object.fromEntries(Object.entries(SCHARNIEREN).map(([k, s]) => [k, { v: s.prijs, naam: s.naam, bron: s.bron }])),
  poedercoat: { v: 50, bron: 'structuurlak, 1 laag, per m²: https://www.betuwe-poedercoating.nl/prijzen' },
  stralen: { v: 15, bron: 'per m²: https://smederijpapendrecht.nl/blog/staal-poedercoaten-kosten' },
  coatMin: { v: 140, bron: 'kleinste prijs voor een deur van ± 4 m²: https://smederijpapendrecht.nl/blog/staal-poedercoaten-kosten' },
  natlakPerM2: { v: 10.8, bron: 'CROP 2K-epoxyprimer € 43/l voor 5 m² (nonpaints.com) + Wixx 2K-PU € 14,24/l voor 6,5 m² (brico.be)' },
  lasdraad: { v: 4.1, bron: 'G3Si1 Ø0,8, 15 kg € 61,50: https://www.weldingshop.nl/en/products/lasdraad-mig-staal-d300-sg2-0-8mm-15kg' },
  gasMenggasPerL: { v: 40.5 / 4000, bron: 'K15 20 l (± 4000 l gas) € 49 incl. btw: https://www.weld-toorts.be/category/55/Gasflessen' },
  gasArgonPerL: { v: 44.5 / 4000, bron: 'argon 20 l € 53,85 incl. btw: https://www.weld-toorts.be/category/55/Gasflessen' },
  tigDraad: { v: 7.14, bron: 'SG2 Ø2,4, 5 kg € 35,70: https://www.valkenpower.com/de_DE/shop/inetig24m5-schweißstab-tig-stahl-sg2-24mm-1-meter-5kg-51470' },
  klein: { v: 25, bron: 'schatting: glaskit, glasblokjes, RVS-schroeven M4, ankers voor het kozijn' },
  schijven: { v: 10, bron: 'schatting: slijp- en fiberschijven, wolfraam' },
};
export const STANDAARD_KEUZES = { systeem: 'auto', opbouw: 'enkel', glas: 'helder', scharnier: 'budget', afwerking: 'poedercoat', ral: '9005', lak: 'fijnstructuur', uurloon: 45, marge: 35 };

const r2 = (x) => Math.round(x * 100) / 100;
/** staaloppervlak (m²) voor de coating: staven (omtrek x lengte) en laserdelen (2 x vlak) */
export function oppervlak(L) {
  return L.zaag.reduce((s, r) => s + ((STAAF[r.prof]?.omtrek ?? 120) * r.l * r.n) / 1e6, 0) + L.laser.reduce((s, r) => s + (2 * laserKg(r) / (r.t * 7.85e-6)) / 1e6 / (r.n ? 1 : 1), 0);
}

/** de kostprijs: regels [omschrijving, bedrag, bron], uren, kostprijs, verkoopprijs */
export function kostprijs(o, k = {}) {
  const K = { ...STANDAARD_KEUZES, ...k }, L = lijsten(o), regels = [];
  const regel = (wat, bedrag, bron = '') => regels.push({ wat, bedrag: r2(bedrag), bron });
  // staal: 10 % zaagverlies
  const staven = L.zaag.reduce((s, r) => s + (STAAF[r.prof]?.prijs ?? 0) * (r.l / 1000) * r.n, 0) * 1.1;
  regel('Staven (zaaglijst, + 10 % zaagverlies)', staven, 'metallshopper.de en schattingen per staaf');
  const lkg = L.laser.reduce((s, r) => s + laserKg(r), 0), ldelen = L.laser.reduce((s, r) => s + r.n, 0);
  regel(`Lasersnijden (${r2(lkg)} kg, ${ldelen} delen)`, lkg * PRIJS.laserPerKg.v + ldelen * PRIJS.laserPerDeel.v, PRIJS.laserPerKg.bron);
  const g = PRIJS.glas[K.glas] ?? PRIJS.glas.helder;
  let glas = 0, kant = 0;
  for (const r of L.glas) {
    const m2 = Math.max(PRIJS.glasMin.v, r.m2);
    glas += m2 * (g.v + (o.opbouw === 'dubbel' ? PRIJS.dubbelGlas.v : 0)) * (r.vorm === 'rechthoek' ? 1 : 1 + PRIJS.glasVorm.v) * r.n;
    kant += (2 * (r.b + r.h) / 1000) * PRIJS.glasKant.v * r.n;
  }
  regel(`Glas: ${o.opbouw === 'dubbel' ? `dubbel glas, ${g.naam} | 14 | 6 gehard` : g.naam} (${L.glas.reduce((s, r) => s + r.n, 0)} ruiten)`, glas, o.opbouw === 'dubbel' ? `${g.bron}; ${PRIJS.dubbelGlas.bron}` : g.bron);
  if (K.glasKant) regel('Glas: kanten geslepen', kant, PRIJS.glasKant.bron); // niet nodig: de latten dekken de kanten af
  // scharnier: een pivot per vleugel, of verdekte scharnieren (3 per vleugel); te zwaar voor de Neo -> Tectus
  const G0 = gewicht(o, STAAF), zwaarste = Math.max(...G0.vleugels);
  let sk = SCHARNIEREN[K.scharnier] ? K.scharnier : 'budget';
  if (sk === 'verdekt' && zwaarste > SCHARNIEREN.verdekt.maxKg) sk = 'verdektZwaar';
  const sch = PRIJS.scharnier[sk], aantal = (SCHARNIEREN[sk].aantal ?? 1) * o.vleugels.length;
  regel(`Scharnier: ${sch.naam}${SCHARNIEREN[sk].aantal ? ` (${aantal} stuks)` : ` x ${o.vleugels.length}`}`, sch.v * aantal, sch.bron);
  const m2 = oppervlak(L);
  if (K.afwerking === 'natlak') regel(`Natlak zelf (${r2(m2)} m², primer + 2K)`, m2 * PRIJS.natlakPerM2.v + 15, PRIJS.natlakPerM2.bron);
  else {
    const kleur = RAL.find((c) => c.code === K.ral) ?? RAL[0], meer = kleur.metallic ? 1 + PRIJS.metallic.v : 1;
    regel(`Stralen en poedercoaten RAL ${kleur.code} ${kleur.naam} (${r2(m2)} m²)`, Math.max(PRIJS.coatMin.v, m2 * (PRIJS.poedercoat.v * meer + PRIJS.stralen.v)), kleur.metallic ? `${PRIJS.poedercoat.bron}; ${PRIJS.metallic.bron}` : PRIJS.poedercoat.bron);
  }
  // lassen: draad ± 1 % van het staalgewicht, gas en wolfraam/TIG-draad naar de lasuren
  // K.uren: eigen standaarduren per handeling (instellingen), anders die uit werkwijze.mjs
  const G = G0, S = stappen(o, { ...K, scharnierModel: sk }, { ...UREN, ...(K.uren ?? {}) }), lasUren = S.filter((s) => /lassen|Roeden|Bogen|Taats|latten/i.test(s.titel)).reduce((t, s) => t + s.uren, 0);
  regel('Lasdraad, gas, TIG-draad', G.staal * 0.012 * PRIJS.lasdraad.v + lasUren * 0.5 * 60 * 12 * PRIJS.gasMenggasPerL.v + lasUren * 0.5 * 60 * 8 * PRIJS.gasArgonPerL.v + lasUren * 0.1 * PRIJS.tigDraad.v, `${PRIJS.lasdraad.bron}; ${PRIJS.gasMenggasPerL.bron}`);
  regel('Kit, blokjes, schroeven, schijven', PRIJS.klein.v + PRIJS.schijven.v, 'schatting');
  const materiaal = regels.reduce((s, r) => s + r.bedrag, 0);
  const uren = S.reduce((t, s) => t + s.uren, 0);
  const arbeid = uren * K.uurloon;
  const kost = materiaal + arbeid;
  return { regels, materiaal: r2(materiaal), uren: r2(uren), arbeid: r2(arbeid), kostprijs: r2(kost), verkoop: r2(kost * (1 + K.marge / 100)), gewicht: G, stappen: S, keuzes: K, oppervlak: r2(m2), scharnier: sk, maxKg: o.sys.kader.diepte >= 50 && SCHARNIEREN[sk].maxKgDiep ? SCHARNIEREN[sk].maxKgDiep : SCHARNIEREN[sk].maxKg };
}

/** vergelijk: verkoopprijzen van stalen taatsdeuren in BE/NL (2026) */
export const MARKT = [
  { wat: 'Zelfbouwmarkt.be: pivoterende stalen deur 3W Tirza 880 x 2040 (4 mm glas)', prijs: 899, bron: 'https://zelfbouwmarkt.be/nl/pivoterende-stalen-binnendeur-3w-tirza-880-x-2040-mm/a/132899' },
  { wat: 'Zelfbouwmarkt.be: op maat tot 1200 x 2300, vanaf', prijs: 1200, bron: 'https://www.zelfbouwmarkt.be/nl/stalen-binnendeur-glas-enkel-pivot-4w-tirza-maatwerk/a/134069' },
  { wat: 'Stalen Deuren Centrum (NL): enkele taatsdeur vanaf (incl. btw, zonder plaatsen; plaatsen € 450)', prijs: 1350, bron: 'https://stalendeurencentrum.nl/taatsdeuren' },
  { wat: 'De Rooy Steel Doors: taatsdeur met FritsJurgens, geplaatst, vanaf', prijs: 2195, bron: 'https://www.derooysteeldoors.com/stalen-deuren/taatsdeuren/' },
];
