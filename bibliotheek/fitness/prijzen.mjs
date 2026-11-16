// Kostprijs en verkoopprijs van een fitnesstoestel: staal per kg (staven + 15 % afval), laserdelen per kg,
// gewichtstapelplaten per kg, poedercoat per m², kooponderdelen (KOOP, aanpasbaar), bekleding, arbeid (uren uit de
// werkwijze x uurloon) en een marge per soort. De verkoopprijs (incl. btw) ligt naast de marktband van het toestel
// (docs/Marktprijzen.md). Node en browser.
import { KOOP } from './onderdelen.mjs';
import { stuklijst, zaagplan, totalen } from './stuklijst.mjs';
import { werkwijze, UREN } from './werkwijze.mjs';
import { RAL_STANDAARD } from './opties.mjs';

/** standaardinstellingen (excl. btw) met hun bron */
export const STANDAARD = {
  uurloon: 45,
  marge: { rek: 35, bank: 35, kabel: 30, plate: 30, selectorized: 30, multigym: 30, opslag: 35, buiten: 30 }, margePro: 25,
  // vaste overhead per grootteklasse (P2-25 v6): klein < 30 kg, middel < 120 kg, groot (factor op lakkerij, transport, verpakking, mallen)
  grootte: { klein: 0.3, middel: 0.65, groot: 1 },
  // buiten (EN 16630): plaatsing door 2 man (AANNAME 3 u + 1 u per poer) en een rit, keuring per type verdeeld over de reeks
  plaatsing: { basisU: 3, perPoerU: 1, man: 2, rit: 120 }, keuringType: 2000,
  staalKg: 1.8, laserKg: 4.5, stapelKg: 2.2, plaatKg: 1.6, snijM: { 3: 0.9, 6: 1.4, 10: 2.2, 99: 3.2 }, insteek: 0.25, bocht: 25, buigInstel: 100, coatM2: 25, verzinkKg: 0.75, buislaserGat: 0.4, afval: 15, btw: 21,
  koopPrijs: {},
  // leercurve: factor op de uren voor het zoveelste stuk van een reeks (stuk 1 = prototype, stuk 20 = met lasmallen)
  reeks: 5, leercurve: { 1: 2.5, 5: 1.6, 20: 1.0 },
  // overhead per toestel (AANNAME, P2-17)
  overhead: { lakkerijRit: 100, perRit: 4, transport: 60, verpakking: { thuis: 25, semi: 40, pro: 45 }, handleiding: 10, mallen: 50, garantiePct: 3, verzekeringPct: 1.5 },
};
export const BRON = {
  uurloon: 'AANNAME: zelfde uurloon als de balustrades en taatsdeuren',
  staalKg: 'AANNAME: groothandel S235JRH ± € 1,50/kg (eHorst), winkelprijs koker 60x60x3 € 22,26/m ≈ € 4,30/kg (metallshopper.de): € 1,80/kg voor hele staven',
  laserKg: 'AANNAME: plaat 5 mm op maat ± € 5,30/kg incl. btw (metallshopper.de); lasersnijden met materiaal ± € 4,50/kg excl. btw',
  stapelKg: 'AANNAME: stapelplaat 300 x 112 x 20 gelaserd ± € 8-13 per plaat (geen losse platen te koop gevonden)',
  laser: 'AANNAME: plaat S235 ± € 1,60/kg + lasersnijden per meter snijlijn (≤ 3 mm € 0,90, ≤ 6 mm € 1,40, ≤ 10 mm € 2,20, dikker € 3,20) + € 0,25 per insteek (BE-loonsnijders, op te vragen)',
  buigen: 'AANNAME (v6, P2-15): buizenbuigerij € 20-35 per bocht + € 75-150 instellen per positie tot een offerte het anders zegt; vlakovaal over de hoge kant vraagt een eigen matrijs (€ 1.500-3.000 eenmalig)',
  coatM2: 'AANNAME: poedercoat met stralen ± € 15-35/m² excl. btw (lakkerij BE)',
};
export const CAT = { staal: 'Staal (staven)', buigen: 'Buigen (uitbesteed)', laser: 'Laserdelen', stapel: 'Gewichtstapel', coat: 'Poedercoat', koop: 'Kooponderdelen', bekleding: 'Bekleding', overhead: 'Overhead', arbeid: 'Arbeid' };
const BEKLEDING = new Set(['multiplex', 'schuim', 'leerThuis', 'leerPro', 'inslagmoer', 'nietjes']);

/** de kostprijs; inst = instellingen (STANDAARD + wijzigingen) */
export function kostprijs(o, inst = {}) {
  const I = { ...STANDAARD, ...inst, marge: { ...STANDAARD.marge, ...(inst.marge ?? {}) }, koopPrijs: { ...(inst.koopPrijs ?? {}) } };
  const U = { ...UREN, ...(inst.uren ?? {}), ...(inst.buislaser ? { gat: 0 } : {}) }; // buislaser (P2-19): geen booruren, wel een prijs per gat
  const sl = stuklijst(o), zp = zaagplan(o, sl), t = totalen(o, sl), regels = [];
  const kgStaaf = zp.profielen.reduce((s, p) => s + p.kg, 0) * (1 + I.afval / 100), kgPrijs = zp.profielen.reduce((s, p) => s + p.kg * (p.prijsFactor ?? 1), 0) * (1 + I.afval / 100);
  regels.push({ cat: 'staal', wat: `Staal: ${zp.profielen.map((p) => `${p.naam} ${p.nodig.toFixed(1).replace('.', ',')} m`).join(', ')} (${Math.round(kgStaaf)} kg met ${I.afval} % afval${kgPrijs > kgStaaf + 0.5 ? '; vlakovaalbuis x 1,5' : ''})`, bedrag: kgPrijs * I.staalKg, bron: kgPrijs > kgStaaf + 0.5 ? `${BRON.staalKg}; AANNAME: vlakovaalbuis ± 1,5 x de prijs per kg van een koker` : BRON.staalKg });
  const kgStapel = sl.posities.filter((p) => p.soort === 'plaat' && p.voorbeeld.stapel).reduce((s, p) => s + p.kg * p.n, 0), kgLaser = t.kgPlaat - kgStapel;
  if (inst.buislaser && t.gaten) regels.push({ cat: 'laser', wat: `Buislaser: ${t.gaten} gaten in kokers en buizen (in plaats van boren met de mal)`, bedrag: t.gaten * (I.buislaserGat ?? 0.4), bron: 'AANNAME: buislaseren € 0,30-0,50 per gat (incl. de snede), v6 P2-19' });
  // instellen per positie: ronde buis tot Ø60 op een standaardmatrijs (AANNAME € 30), koker en vlakovaal I.buigInstel
  const instel = sl.posities.filter((p) => p.soort === 'staaf' && p.voorbeeld.buig).reduce((s2, p) => s2 + (p.voorbeeld.P.vorm === 'buis' && p.voorbeeld.P.b <= 61 ? 30 : I.buigInstel), 0);
  if (t.bochten) regels.push({ cat: 'buigen', wat: `Buigen: ${t.bochten} bochten in ${t.buigPos} positie${t.buigPos > 1 ? 's' : ''}`, bedrag: t.bochten * I.bocht + instel, bron: BRON.buigen });
  const snijPrijs = (tt) => { const k = Object.keys(I.snijM).map(Number).sort((a, b) => a - b).find((x) => tt <= x) ?? 99; return I.snijM[k]; };
  const laserP = sl.posities.filter((p) => p.soort === 'plaat' && !p.voorbeeld.stapel), snijBedrag = laserP.reduce((s2, p) => s2 + p.n * (p.snij.m * snijPrijs(p.t) + p.snij.insteken * I.insteek), 0);
  regels.push({ cat: 'laser', wat: `Laserdelen (${Math.round(kgLaser)} kg, ${laserP.reduce((s2, p) => s2 + p.n, 0)} stuks, ${(t.snijM).toFixed(1).replace('.', ',')} m snijlijn, ${t.insteken} insteken)`, bedrag: kgLaser * I.plaatKg + snijBedrag, bron: BRON.laser });
  if (kgStapel) regels.push({ cat: 'stapel', wat: `Gewichtstapel (${Math.round(kgStapel)} kg, platen 20 mm)`, bedrag: kgStapel * I.stapelKg, bron: BRON.stapelKg });
  regels.push({ cat: 'coat', wat: `Poedercoat ${t.opp.toFixed(1).replace('.', ',')} m² in RAL ${o.afwerking?.ral ?? '9005'}`, bedrag: t.opp * I.coatM2, bron: BRON.coatM2 });
  if (o.verzinkt) regels.push({ cat: 'coat', wat: `Thermisch verzinken ${Math.round(kgStaaf + kgLaser)} kg (EN ISO 1461), duplex onder de poedercoat`, bedrag: (kgStaaf + kgLaser) * I.verzinkKg, bron: 'AANNAME: thermisch verzinken ± € 0,60-0,90/kg excl. btw (verzinkerij BE/NL)' });
  if (o.afwerking && !RAL_STANDAARD.includes(o.afwerking.ral)) regels.push({ cat: 'coat', wat: `Kleur RAL ${o.afwerking.ral} buiten de standaardkleuren (kleine reeks, + 20 %)`, bedrag: t.opp * I.coatM2 * 0.2, bron: 'AANNAME: meerprijs lakkerij voor een kleur die niet in de vaste reeks zit' });
  const koop = sl.koop.map((x) => { const prijs = I.koopPrijs[x.key] ?? x.prijs; return { ...x, prijs, bedrag: x.bedrag - x.hoeveelheid * x.prijs + x.hoeveelheid * prijs }; });
  for (const x of koop) regels.push({ cat: BEKLEDING.has(x.key) ? 'bekleding' : 'koop', wat: `${x.naam} (${fmt(x.hoeveelheid)} ${x.eenheid})`, bedrag: x.bedrag, bron: /AANNAME/.test(x.winkel) && /^AANNAME/.test(x.bron) ? x.bron : `${x.winkel}${x.nagekeken || /AANNAME/.test(x.winkel + x.bron) ? '' : ' (AANNAME)'}: ${x.bron}`, key: x.key });
  const lc = I.leercurve ?? STANDAARD.leercurve, rk = Object.keys(lc).map(Number).filter((n) => n <= (I.reeks ?? 5)).sort((a, b) => b - a)[0] ?? 1, fLc = lc[rk];
  const stappen = werkwijze(o, U, sl), uren = stappen.reduce((s, x) => s + x.uren, 0) * fLc, arbeid = uren * I.uurloon;
  const OH = { ...STANDAARD.overhead, ...(I.overhead ?? {}) }, mat0 = regels.reduce((s, x) => s + x.bedrag, 0);
  const kl = o.massa < 30 ? 'klein' : o.massa < 120 ? 'middel' : 'groot', fk = (I.grootte ?? STANDAARD.grootte)[kl], kt = kl === 'groot' ? '' : ` (${kl}: x ${String(fk).replace('.', ',')})`;
  regels.push({ cat: 'overhead', wat: `Lakkerij: minimum per rit € ${OH.lakkerijRit} gedeeld door ${OH.perRit} toestellen${kt}`, bedrag: (OH.lakkerijRit / OH.perRit) * fk, bron: 'AANNAME: lakkerij-minimum per rit; kleine stukken gaan met meer tegelijk' });
  regels.push({ cat: 'overhead', wat: `Transport heen en terug naar de lakkerij, levering${kt}`, bedrag: OH.transport * fk, bron: 'AANNAME' });
  regels.push({ cat: 'overhead', wat: `Verpakking (pallet of doos, hoeken, folie)${kt}`, bedrag: (OH.verpakking[o.versie] ?? 30) * fk, bron: 'AANNAME' });
  regels.push({ cat: 'overhead', wat: 'Handleiding NL/FR en montagefiche', bedrag: OH.handleiding, bron: 'AANNAME' });
  regels.push({ cat: 'overhead', wat: `Afschrijving lasmallen en gereedschap${kt}`, bedrag: OH.mallen * fk, bron: 'AANNAME' });
  if (o.grond) {
    const pl = { ...STANDAARD.plaatsing, ...(I.plaatsing ?? {}) }, np = o.context.filter((g) => g.kleur === 'beton').length, u = (pl.basisU + pl.perPoerU * np) * pl.man;
    regels.push({ cat: 'overhead', wat: `Plaatsing ter plaatse: uitzetten, graven, storten, stellen (${np} poeren, ${pl.man} man, ${String(u).replace('.', ',')} u) en ${pl.rit > 0 ? 'een rit met de aanhangwagen' : ''}`, bedrag: u * I.uurloon + pl.rit, bron: 'AANNAME (v6 P2-25): € 150-250 per poer alles inbegrepen' });
    regels.push({ cat: 'overhead', wat: `Keuring EN 16630 door een erkende instelling (€ ${I.keuringType ?? STANDAARD.keuringType} per type, verdeeld over ${I.reeks ?? 5} stuks)`, bedrag: (I.keuringType ?? STANDAARD.keuringType) / (I.reeks ?? 5), bron: 'AANNAME (v6 P2-27): € 1.500-3.000 per type; gemeenten vragen het certificaat' });
  }
  regels.push({ cat: 'overhead', wat: `Garantie (${OH.garantiePct} %) en productaansprakelijkheid (${OH.verzekeringPct} %) op materiaal + arbeid`, bedrag: (mat0 + arbeid) * (OH.garantiePct + OH.verzekeringPct) / 100, bron: 'AANNAME' });
  const materiaal = regels.reduce((s, x) => s + x.bedrag, 0), kp = materiaal + arbeid, marge = (I.marge[o.def.soort] ?? 30) + (o.versie === 'pro' ? I.margePro : o.versie === 'semi' ? I.margePro / 2 : 0), verkoop = kp * (1 + marge / 100), incl = verkoop * (1 + I.btw / 100);
  const perCat = {}; for (const x of regels) perCat[x.cat] = (perCat[x.cat] ?? 0) + x.bedrag; perCat.arbeid = arbeid;
  const band = o.def.markt[o.versie], status = incl < band[0] ? 'onder' : incl > band[1] ? 'boven' : 'in';
  return { regels, materiaal, uren, arbeid, kostprijs: kp, marge, verkoop, incl, perCat, stappen, stuklijst: sl, zaagplan: zp, totalen: t, koop, instellingen: I, markt: { band, status, bron: o.versie === 'pro' ? o.def.markt.bronP : o.versie === 'semi' ? o.def.markt.bronS : o.def.markt.bronT, melding: status === 'in' ? '' : status === 'onder' ? `Onder de markt (${eur0(band[0])}-${eur0(band[1])}): ruimte voor een hogere marge.` : `Boven de markt (${eur0(band[0])}-${eur0(band[1])}): minder uren, een goedkoper profiel of verkopen als maatwerk.` } };
}
const fmt = (v) => (Math.round(v * 100) / 100).toString().replace('.', ',');
const eur0 = (v) => `€ ${Math.round(v).toLocaleString('nl-BE')}`;
export { KOOP };
