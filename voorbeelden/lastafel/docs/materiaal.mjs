// Materiaallijsten van de lastafel op de heftafel, uit de maten van maak-lastafel.mjs: zaaglijst (profielen), plaatlijst
// (lasersnijden), draai- en freesdelen, normdelen, kooponderdelen en verbruik, met gewichten en wat je moet bestellen
// (staven van 6 m, platen 3000 x 1500). Schrijft docs/Materiaallijst.md en docs/materiaal.json (voor de pagina).
// Gebruik: node voorbeelden/lastafel/docs/materiaal.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { M, stand, STANDEN } from '../maak-lastafel.mjs';
import { STUKLIJST } from '../schema/maak-schema.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RHO = 7.85e-6; // kg/mm³ staal
const r1 = (x) => Math.round(x * 10) / 10;

// ---------------------------------------------------------------- profielen (kg/m)
const koker = (b, h, t) => (2 * (b + h) - 4 * t) * t * RHO * 1000;
const buis = (d, t) => Math.PI * (d - t) * t * RHO * 1000;
const plat = (b, t) => b * t * RHO * 1000;
const rond = (d) => (Math.PI * d * d / 4) * RHO * 1000;
const PROFIEL = {
  'UNP 100': 10.6,
  'Koker 110 x 50 x 5': koker(110, 50, 5),
  'Koker 110 x 60 x 5': koker(110, 60, 5),
  'Buis Ø80 x 5': buis(80, 5),
  'Buis Ø90 x 6': buis(90, 6),
  'Platstaal 40 x 20': plat(40, 20),
  'Platstaal 40 x 10': plat(40, 10),
  'Platstaal 30 x 8': plat(30, 8),
  'Platstaal 45 x 10': plat(45, 10),
  'Buis Ø60 x 8 (lagerbus)': buis(60, 8),
  'Buis Ø50 x 8 (lagerbus)': buis(50, 8),
  'Rond Ø40 (42CrMo4)': rond(40),
  'Draadeind M20 (8.8, verzinkt)': 2.0,
};
const { arm, cil, tafel: TF } = M;
const S0 = stand(STANDEN.laag);

/** zaaglijst: [groep, positie, profiel, lengte mm, aantal, bewerking] */
const ZAAG = [
  ['Onderframe', 'Langsligger', 'UNP 100', 2390, 2, 'recht, open naar buiten'],
  ['Onderframe', 'Kopligger', 'UNP 100', 1100, 2, 'recht, tussen de langsliggers (in het lijf)'],
  ['Onderframe', 'Rolbaan onder (paar B)', 'Platstaal 40 x 20', 737, 2, 'bovenkant vlak, ontbramen'],
  ['Bovenframe', 'Langsligger boven', 'Koker 110 x 50 x 5', 2390, 2, 'recht'],
  ['Bovenframe', 'Kopligger boven', 'Koker 110 x 60 x 5', 1092, 2, 'recht, tussen de langsliggers'],
  ['Bovenframe', 'Rolbaan boven (paar A)', 'Platstaal 40 x 10', 686, 2, 'onderkant vlak'],
  ['Bovenframe', 'Ophanging rolbaan', 'Platstaal 30 x 8', 686, 2, ''],
  ['Schaar A', 'Buis onder en boven', 'Buis Ø80 x 5', 2 * (M.A[0] + 2), 2, 'tussen de armen, 2 mm in de wang'],
  ['Schaar B', 'Buis boven en onder', 'Buis Ø80 x 5', 2 * (M.Bx[0] + 2), 2, ''],
  ['Schaar B', 'Cilinderbuis', 'Buis Ø90 x 6', 2 * (M.Bx[0] + 2), 1, `op ${cil.s} van het vaste scharnier`],
  ['Schaar', 'Omtrekband arm', 'Platstaal 45 x 10', 4600, 4, 'rond zetten op de wangen (R58 aan de kop)'],
  ['Schaar', 'Lagerbus koppen (dwars door de koker)', 'Buis Ø60 x 8 (lagerbus)', 45, 8, 'na het lassen boren Ø44 H7 voor het glijlager'],
  ['Schaar', 'Lagerbus middenpen', 'Buis Ø50 x 8 (lagerbus)', 45, 4, 'na het lassen boren Ø34 H7'],
  ['Scharnieren', 'Pennen Ø40 (scharnier A, B, cilinders, stangogen)', 'Rond Ø40 (42CrMo4)', 120, 8, 'draaien, inductiegehard, borggroef'],
  ['Scharnieren', 'Astappen rollen B', 'Rond Ø40 (42CrMo4)', 45, 2, 'draaien, slijpen h6'],
  ['Onderframe', 'Aanslagpennen', 'Draadeind M20 (8.8, verzinkt)', 140, 6, 'met dopmoer en contramoer'],
];

/** plaatlijst (lasersnijden): [groep, positie, materiaal, dikte, breed, lang, aantal, opmerking] */
const ARMWANG = [arm + 116, M.ahMid]; // lengte over de koppen, breedte in het midden
const PLAAT = [
  ['Onderframe', 'Vloerplaat', 'S355', 10, 1190, 2390, 1, '8 ankergaten Ø18'],
  ['Onderframe', 'Scharnierbok A', 'S355', 10, 120, 130, 2, 'boring Ø40 H8'],
  ['Onderframe', 'Hijsoog', 'S355', 16, 80, 70, 4, 'R40, gat Ø30'],
  ['Cilinderbok', 'Dwarsplaat', 'S355', 8, 100, 620, 1, ''],
  ['Cilinderbok', 'Lipplaat', 'S355', 12, 80, 108, 4, `boring Ø40 H8 op ${cil.p0[0]} hoogte`],
  ['Bovenframe', 'Scharnierblok B', 'S355', 20, 120, 127, 6, '3 platen per blok, gelast, boring Ø40 H8'],
  ['Bovenframe', 'Steunvlak (na lassen vlakfrezen)', 'S355', 15, 100, 100, 6, 'boring M16, frezen tot 10'],
  ['Opvanglade', 'Bodem', 'DX51D+Z275 (sendzimir)', 3, 1090, 2270, 1, 'randen 6 omzetten'],
  ['Opvanglade', 'Tussenstrip', 'DX51D+Z275 (sendzimir)', 3, 40, 980, 3, ''],
  ['Schaar', 'Armwang (taps 116 tot 180)', 'S355', 10, ARMWANG[1], ARMWANG[0], 8, '2 per arm; gaten Ø60 / Ø50 voor de lagerbussen'],
  ['Schaar B', 'Oog cilinder', 'S355', 12, 80, 154, 4, 'boring Ø40 H8'],
  ['Valbeveiliging', 'Kapzijde met zaagtand', 'S355', 8, 128, 500, 4, 'zaagtand steek 30, diepte 14'],
  ['Valbeveiliging', 'Kapdak', 'S355', 6, 162, 503, 2, ''],
  ['Valbeveiliging', 'Kopplaat', 'S355', 6, 162, 130, 2, 'doorvoer Ø57'],
  ['Valbeveiliging', 'Palplaat', 'S355 (C45 gehard voor de tanden)', 8, 38, 360, 4, 'zaagtand, scharniergat Ø16'],
  ['Lastafel', 'Blad 2400 x 1200', 'S690QL', 25, 1200, 2400, 1, `${TF.raster === 100 ? '541' : '?'} gaten Ø28 na lassen boren`],
  ['Lastafel', 'Langswand', 'S690QL', 12, 175, 2400, 2, '71 gaten Ø28'],
  ['Lastafel', 'Kopwand', 'S690QL', 12, 175, 1176, 2, '35 gaten Ø28'],
  ['Lastafel', 'Langsrib', 'S355', 12, 175, 2376, 2, ''],
  ['Lastafel', 'Dwarsrib midden', 'S355', 12, 175, 1039, 2, ''],
  ['Lastafel', 'Dwarsrib buiten', 'S355', 12, 175, 58, 4, ''],
];

/** draai- en normdelen: [groep, omschrijving, norm/type, aantal] */
const NORM = [
  ['Schaar', 'Middenpen M30 x 140 met kop, moer en sluitring', 'ISO 4014 8.8 + ISO 4032 + ISO 7089, verzinkt', 2],
  ['Schaar', 'Glijlager Ø40/44 x 30 (in elke scharnierboring)', 'iglidur G of brons CuSn8 met smeergroef', 12],
  ['Schaar', 'Glijlager Ø30/34 x 20 (middenpen, per arm)', 'iglidur G of CuSn8', 4],
  ['Schaar', 'Rol Ø90 x 38 met naaldlager', 'INA NUTR 40 (steunrol met as) of gelijkwaardig', 4],
  ['Scharnieren', 'Borgplaat met bout M8 per pen', 'S235 6 mm + ISO 4017 M8 x 16', 10],
  ['Scharnieren', 'Smeernippel M8 x 1', 'DIN 71412 A', 12],
  ['Valbeveiliging', 'Scharnierbout pal M16 x 30 + veer', 'ISO 7379 Ø16 + drukveer 1,6 x 12 x 30', 4],
  ['Bovenframe', 'Bout M16 x 45 (tafel op steunvlakken)', 'ISO 4017 8.8 + sluitring', 6],
  ['Montage', 'Ankerbout M16 (vloer, optioneel)', 'Fischer FAZ II 16/25', 8],
  ['Montage', 'Ringogen M20 (heffen)', 'DIN 580', 4],
];

/** kooponderdelen hydrauliek en elektro (de elektro uit de stuklijst van het schema) */
const KOOP = [
  ['Hydrauliek', 'Hydraulisch aggregaat 230 V 2,2 kW, enkelwerkend, 210 bar, tank 8-12 l, met zak- en overdrukventiel', 'Hansa-Flex HKK 230V 2.2 of gelijkwaardig', 1],
  ['Hydrauliek', `Cilinder enkelwerkend Ø${cil.boring}/${cil.stang} slag 360, oog-oog ${Math.round(S0.d)}, met leidingbreukventiel`, 'op maat (offerte)', 2],
  ['Hydrauliek', 'Slang 2SN DN10 met DKOL-koppelingen, ± 1,4 m', 'EN 853 2SN', 4],
  ['Hydrauliek', 'Olie HLP 32', 'DIN 51524-2', '15 l'],
  ...STUKLIJST.filter((r) => !/^-M1|^-MM/.test(r[0])).map((r) => ['Elektro', `${r[2]} (${r[0]})`, r[3], r[1]]),
];

const VERBRUIK = [
  ['Lasdraad G3Si1 Ø1,0 (MAG)', '± 8 kg'],
  ['Menggas Ar/CO₂ 82/18', '1 fles 20 l'],
  ['Stralen SA 2½ + poedercoat RAL 9005 mat (frames, armen)', '± 22 m²'],
  ['Poedercoat RAL 1032 (kappen valbeveiliging)', '± 0,6 m²'],
  ['Vet lithium EP2 (scharnieren, rollen)', '1 patroon 400 g'],
  ['Schroefdraadborging Loctite 243', '1 flesje'],
];

// ---------------------------------------------------------------- berekenen
const zaag = ZAAG.map(([groep, pos, prof, l, n, bew]) => ({ groep, pos, prof, l: Math.round(l), n, bew, kg: r1((PROFIEL[prof] * l * n) / 1000) }));
const plaat = PLAAT.map(([groep, pos, mat, t, b, l, n, opm]) => ({ groep, pos, mat, t, b, l, n, opm, kg: r1(t * b * l * n * RHO * (pos === 'Blad 2400 x 1200' ? 1 - 541 * Math.PI * 196 / (2400 * 1200) : 1)) }));
// bestellen: staven van 6 m (first-fit-decreasing per profiel, zaagsnede 3 mm), platen per materiaal en dikte
const staven = Object.keys(PROFIEL).map((prof) => {
  const stukken = zaag.filter((z) => z.prof === prof).flatMap((z) => Array(z.n).fill(z.l)).sort((a, b) => b - a);
  if (!stukken.length) return null;
  const bars = [];
  for (const s of stukken) { const b = bars.find((x) => x + s + 3 <= 6000); if (b !== undefined) bars[bars.indexOf(b)] += s + 3; else bars.push(s + 3); }
  const totaal = stukken.reduce((a, b) => a + b, 0);
  return { prof, stukken: stukken.length, totaal: Math.round(totaal), staven: bars.length, kgm: r1(PROFIEL[prof]), kg: r1((bars.length * 6000 * PROFIEL[prof]) / 1000) };
}).filter(Boolean);
const platen = [...new Set(plaat.map((p) => `${p.mat}|${p.t}`))].map((k) => {
  const [mat, t] = k.split('|'), rij = plaat.filter((p) => p.mat === mat && p.t === +t);
  const m2 = rij.reduce((a, p) => a + (p.b * p.l * p.n) / 1e6, 0);
  return { mat, t: +t, m2: Math.round(m2 * 100) / 100, kg: r1(rij.reduce((a, p) => a + p.kg, 0)), posities: rij.map((p) => p.pos).join(', ') };
}).sort((a, b) => a.mat.localeCompare(b.mat) || a.t - b.t);
const som = (a) => r1(a.reduce((x, y) => x + y.kg, 0));
const tot = { zaag: som(zaag), plaat: som(plaat) };
const lift = r1(som(zaag) + som(plaat.filter((p) => p.groep !== 'Lastafel')));
const tafel = som(plaat.filter((p) => p.groep === 'Lastafel'));

const data = { zaag, plaat, staven, platen, norm: NORM.map(([groep, oms, type, n]) => ({ groep, oms, type, n })), koop: KOOP.map(([groep, oms, type, n]) => ({ groep, oms, type, n })), verbruik: VERBRUIK.map(([oms, n]) => ({ oms, n })), gewicht: { lift, tafel, totaal: r1(lift + tafel) } };
writeFileSync(join(HERE, 'materiaal.json'), JSON.stringify(data, null, 1) + '\n');

// ---------------------------------------------------------------- markdown
const g = (x) => (typeof x === 'number' ? String(x).replace('.', ',') : String(x));
const tabel = (kop, rijen) => [`| ${kop.join(' | ')} |`, `|${kop.map((k) => (/kg|mm|Aantal|Dikte|Breed|Lang|m²|Staven|Stuks/.test(k) ? '--:' : '---')).join('|')}|`, ...rijen.map((r) => `| ${r.map(g).join(' | ')} |`)].join('\n');
const md = `# Materiaallijsten lastafel op heftafel

Gemaakt met \`docs/materiaal.mjs\` uit de maten van \`maak-lastafel.mjs\`. Gewichten zijn netto, zonder snijverlies.
Staal ${g(data.gewicht.totaal)} kg: de lift ${g(lift)} kg en de tafel ${g(tafel)} kg. Daarbij komen het aggregaat en de
cilinders, ± 120 kg.

## 1. Bestellen: staven en platen

Staven van 6 m. De stukken zijn zo verdeeld dat er zo weinig mogelijk overblijft (zaagsnede 3 mm).

${tabel(['Profiel', 'Stuks', 'Totaal mm', 'Staven 6 m', 'kg/m', 'kg (staven)'], staven.map((s) => [s.prof, s.stukken, s.totaal, s.staven, s.kgm, s.kg]))}

Plaat voor het lasersnijden, per materiaal en dikte (netto oppervlak; bestel ± 15 % extra voor het nesten):

${tabel(['Materiaal', 'Dikte', 'm²', 'kg', 'Posities'], platen.map((p) => [p.mat, p.t, p.m2, p.kg, p.posities]))}

## 2. Zaaglijst (profielen)

${tabel(['Groep', 'Positie', 'Profiel', 'Lang mm', 'Aantal', 'kg', 'Bewerking'], zaag.map((z) => [z.groep, z.pos, z.prof, z.l, z.n, z.kg, z.bew]))}

## 3. Plaatlijst (lasersnijden)

${tabel(['Groep', 'Positie', 'Materiaal', 'Dikte', 'Breed', 'Lang', 'Aantal', 'kg', 'Opmerking'], plaat.map((p) => [p.groep, p.pos, p.mat, p.t, p.b, p.l, p.n, p.kg, p.opm]))}

## 4. Draai- en normdelen

${tabel(['Groep', 'Omschrijving', 'Norm / type', 'Aantal'], data.norm.map((n) => [n.groep, n.oms, n.type, n.n]))}

## 5. Kooponderdelen (hydrauliek en elektro)

${tabel(['Groep', 'Omschrijving', 'Type', 'Aantal'], data.koop.map((n) => [n.groep, n.oms, n.type, n.n]))}

## 6. Verbruik

${tabel(['Wat', 'Hoeveel'], data.verbruik.map((v) => [v.oms, v.n]))}
`;
writeFileSync(join(HERE, 'Materiaallijst.md'), md);
console.log('staal', data.gewicht, 'staven', staven.map((s) => `${s.prof}: ${s.staven}`).join('; '));
