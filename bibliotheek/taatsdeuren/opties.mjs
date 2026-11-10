// Keuzes voor de klant: RAL-kleuren om te poedercoaten, de afwerking, het glas (altijd veiligheidsglas: gelaagd of
// gehard), enkel of dubbel glas, en het scharnier (pivot of verdekt). Met prijs (excl. btw) en bron; 'schatting' = geen
// prijs gevonden, vraag een offerte. Opgezocht op 2026-11-10. Gewone gegevens, werkt in Node en in de browser.

/** de bekendste RAL-kleuren voor stalen deuren (BE/NL); hex bij benadering (en.wikipedia.org/wiki/List_of_RAL_colours) */
export const RAL = [
  { code: '9005', naam: 'Gitzwart', hex: '#0a0a0d' },
  { code: '9004', naam: 'Signaalzwart', hex: '#2e3032' },
  { code: '7021', naam: 'Zwartgrijs', hex: '#2e3234' },
  { code: '7016', naam: 'Antracietgrijs', hex: '#373f43' },
  { code: '7024', naam: 'Grafietgrijs', hex: '#474a50' },
  { code: '7022', naam: 'Ombergrijs', hex: '#4b4d46' },
  { code: '7015', naam: 'Leigrijs', hex: '#51565c' },
  { code: '7039', naam: 'Kwartsgrijs', hex: '#6b695f' },
  { code: '7035', naam: 'Lichtgrijs', hex: '#cbd0cc' },
  { code: '9010', naam: 'Zuiverwit', hex: '#f7f9ef' },
  { code: '9016', naam: 'Verkeerswit', hex: '#f7fbf5' },
  { code: '9001', naam: 'Crèmewit', hex: '#efebdc' },
  { code: '1013', naam: 'Parelwit', hex: '#e3d9c6' },
  { code: '8019', naam: 'Grijsbruin', hex: '#3f3a3a' },
  { code: '8014', naam: 'Sepiabruin', hex: '#49392d' },
  { code: '6009', naam: 'Dennengroen', hex: '#26392f' },
  { code: '5011', naam: 'Staalblauw', hex: '#232c3f' },
  { code: '3004', naam: 'Purperrood', hex: '#701f29' },
  { code: '9006', naam: 'Blank aluminium', hex: '#a5a8a6', metallic: true },
  { code: '9007', naam: 'Grijs aluminium', hex: '#8f8f8c', metallic: true },
  { code: 'brons', naam: 'Brons (Anodic Bronze)', hex: '#6b5843', metallic: true },
];
export const RAL_BRON = 'kleuren: en.wikipedia.org/wiki/List_of_RAL_colours; standaard bij stalen binnendeuren 9005, 7021 (structuur), 9010 (mat) en Anodic Bronze: toeleveringonline.nl (brochure binnendeuren 2024)';
export const METALLIC = { v: 0.2, bron: 'schatting + 20 %: metallic op aanvraag (coatinc.com prijslijst CBO 10/2025); andere RAL + 15 % (JU, 2017)' };

/** afwerking van de poedercoat; ruw = ruwheid in 3D */
export const AFWERKINGEN = {
  fijnstructuur: { naam: 'Fijnstructuur mat', uitleg: 'licht korrelig, verbergt vingers en kleine krassen; het meest gekozen voor stalen deuren', ruw: 0.82, korrel: true },
  mat: { naam: 'Glad mat', uitleg: 'glad en mat', ruw: 0.62, korrel: false },
  zijdeglans: { naam: 'Zijdeglans', uitleg: 'glad met een zachte glans', ruw: 0.36, korrel: false },
};

/** opbouw: enkel of dubbel glas; dikte (mm) en gewicht (kg/m²) */
export const OPBOUW = {
  enkel: { naam: 'Enkel glas', uitleg: 'één ruit veiligheidsglas', dikte: 8.8, kgm2: 20.8 },
  dubbel: {
    naam: 'Dubbel glas', uitleg: 'isolerend glas 44.2 | 14 | 6 gehard: aan beide kanten veiligheidsglas, beter tegen geluid; het profiel wordt 60 diep', dikte: 28.8, kgm2: 35.8,
    meer: { v: 70.74, bron: 'tweede ruit gehard 6 mm € 40,74/m² (glasopmaat.be/veiligheidsglas-op-maat/gehard-glas) + afstandhouder en samenstellen ± € 30/m² (schatting uit HR++ 4/x/4 € 53,31/m², glasopmaat.be/dubbel-glas-hr)' },
  },
};

/**
 * glas: kleur en structuur. Glad glas is gelaagd 44.2 (breekt niet uit elkaar); structuurglas is gehard 8 mm (breekt in
 * kleine korrels). Beide zijn veiligheidsglas voor deuren (NBN S 23-002). prijs per m² excl. btw.
 * 3D: tint, dekking (0 = doorzichtig), ruw, patroon (ribbel, kathedraal, chinchilla)
 */
const GO = 'https://www.glasopmaat.be/veiligheidsglas-op-maat/';
export const GLAS = {
  helder: { naam: 'Helder', groep: 'Kleur', soort: 'gelaagd 44.2 helder', prijs: 51.16, bron: 'https://www.glasopmaat.be/gelaagd-helder-glas/44.2/', tint: '#e6f1f3', dekking: 0.16, ruw: 0.03, kgm2: 20.8 },
  extrahelder: { naam: 'Extra helder', groep: 'Kleur', soort: 'gelaagd 44.2 extra helder', prijs: 82, bron: `schatting: gehard extra helder € 83,64 tegenover helder € 40,74 (${GO}gehard-glas)`, tint: '#f3f8f8', dekking: 0.1, ruw: 0.02, kgm2: 20.8 },
  grijs: { naam: 'Grijs (fumé)', groep: 'Kleur', soort: 'gelaagd 44.2 grijs', prijs: 170.17, bron: `${GO}gelaagd-glas/ (gekleurd € 170,17)`, tint: '#5d6366', dekking: 0.5, ruw: 0.03, kgm2: 20.8 },
  brons: { naam: 'Brons', groep: 'Kleur', soort: 'gelaagd 44.2 brons', prijs: 170.17, bron: `${GO}gelaagd-glas/ (gekleurd € 170,17, brons op aanvraag)`, tint: '#7a6146', dekking: 0.48, ruw: 0.03, kgm2: 20.8 },
  mat: { naam: 'Mat (satijn)', groep: 'Structuur', soort: 'gelaagd 44.2 met matte folie', prijs: 73.31, bron: `${GO}gelaagd-glas/ (matte folie € 73,31)`, tint: '#eef2f2', dekking: 0.78, ruw: 0.9, kgm2: 20.8 },
  geribd: { naam: 'Geribd (flutes)', groep: 'Structuur', soort: 'gehard 8 mm geribd', prijs: 165, bron: 'schatting: figuurglas Raywall 90 € 136,45/m² (glasopmaat.be/enkel-glas-op-maat/figuurglas) + harden ± € 30', tint: '#e8f0f1', dekking: 0.45, ruw: 0.25, patroon: 'ribbel', kgm2: 20 },
  kathedraal: { naam: 'Kathedraal', groep: 'Structuur', soort: 'gehard 8 mm kathedraal fijn', prijs: 101.98, bron: `${GO}gehard-glas/ (kathedraal fijn € 101,98)`, tint: '#e9f0ef', dekking: 0.5, ruw: 0.3, patroon: 'kathedraal', kgm2: 20 },
  chinchilla: { naam: 'Chinchilla', groep: 'Structuur', soort: 'gehard 8 mm chinchilla', prijs: 105, bron: 'schatting: zoals kathedraal gehard € 101,98; chinchilla 4-8 mm (AGC Imagin factsheet 11/2025)', tint: '#edf2f2', dekking: 0.58, ruw: 0.4, patroon: 'chinchilla', kgm2: 20 },
};

/**
 * scharnieren: pivot (taats, draait om een as 100 mm uit de rand, de deur draait naar beide kanten) of verdekt (een
 * draaideur; de scharnieren zitten in de stijl en het kozijn en zijn niet te zien als de deur dicht is). Opbouwscharnieren
 * worden niet gebruikt. maxKg = per vleugel.
 */
export const SCHARNIEREN = {
  budget: { soort: 'pivot', naam: 'Pivot: Argenta Pivotica Pro 150', kort: 'Pivot', maxKg: 150, prijs: 242.37, per: 'vleugel', bron: 'https://www.beslist.be/products/klussen/klussen_486170_6356938/r/*_set/page_8; tot 150 kg: arlu.be/nl/producten/pivotica' },
  premium: { soort: 'pivot', naam: 'Pivot: FritsJurgens System M+ (System One bij 60 diep)', kort: 'Pivot premium', maxKg: 150, maxKgDiep: 500, prijs: 800, per: 'vleugel', bron: 'schatting: alleen via partners (fritsjurgens.com, 80-150 kg bij 40 mm); Galaxus.be toonde € 559 (System M 32)' },
  verdekt: { soort: 'verdekt', naam: 'Verdekt: 3 x Argenta Invisible Neo L-7 met RVS-lasbak', kort: 'Verdekte scharnieren', maxKg: 145, aantal: 3, prijs: 75 + 35, per: 'scharnier', bron: 'Neo vanaf € 51,58 (bricozor.com), L-7 schatting € 75; lasbak voor staal (Argenta) schatting € 35; 145 kg met 3 bij 1030 breed (santens.be, technische fiche Neo L7)' },
  verdektZwaar: { soort: 'verdekt', naam: 'Verdekt: 3 x Simonswerk Tectus TE 640 3D met stalen delen', kort: 'Verdekt zwaar', maxKg: 250, aantal: 3, prijs: 260, per: 'scharnier', bron: 'schatting: TE 540 3D £ 122-199 (priceandoliver.co.uk); TE 640 200 kg met 2 (schreuderenco.nl productblad)' },
};
export const SCHARNIER_UITLEG = {
  pivot: 'Pivot (taats): de deur draait om een as in de vloer en bovenaan, 100 mm uit de rand, en gaat naar beide kanten open.',
  verdekt: 'Verdekte scharnieren: een draaideur; de scharnieren zitten in de stijl en het kozijn en zijn onzichtbaar als de deur dicht is. Het profiel wordt 60 breed.',
};
