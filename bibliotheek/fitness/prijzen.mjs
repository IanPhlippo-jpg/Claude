// Kostprijs en verkoopprijs van een fitnesstoestel: staal per kg (staven + 15 % afval), laserdelen per kg,
// gewichtstapelplaten per kg, poedercoat per m², kooponderdelen (KOOP, aanpasbaar), bekleding, arbeid (uren uit de
// werkwijze x uurloon) en een marge per soort. De verkoopprijs (incl. btw) ligt naast de marktband van het toestel
// (docs/Marktprijzen.md). Node en browser.
import { KOOP } from './onderdelen.mjs';
import { stuklijst, zaagplan, totalen } from './stuklijst.mjs';
import { werkwijze, UREN } from './werkwijze.mjs';

/** standaardinstellingen (excl. btw) met hun bron */
export const STANDAARD = {
  uurloon: 45,
  marge: { rek: 35, bank: 35, kabel: 30, plate: 30 }, margePro: 25,
  staalKg: 1.8, laserKg: 4.5, stapelKg: 2.2, coatM2: 25, afval: 15, btw: 21,
  koopPrijs: {},
  // leercurve: factor op de uren voor het zoveelste stuk van een reeks (stuk 1 = prototype, stuk 20 = met lasmallen)
  reeks: 5, leercurve: { 1: 2.5, 5: 1.6, 20: 1.0 },
  // overhead per toestel (AANNAME, P2-17)
  overhead: { lakkerijRit: 100, perRit: 4, transport: 60, verpakking: { thuis: 25, pro: 45 }, handleiding: 10, mallen: 50, garantiePct: 3, verzekeringPct: 1.5 },
};
export const BRON = {
  uurloon: 'AANNAME: zelfde uurloon als de balustrades en taatsdeuren',
  staalKg: 'AANNAME: groothandel S235JRH ± € 1,50/kg (eHorst), winkelprijs koker 60x60x3 € 22,26/m ≈ € 4,30/kg (metallshopper.de): € 1,80/kg voor hele staven',
  laserKg: 'AANNAME: plaat 5 mm op maat ± € 5,30/kg incl. btw (metallshopper.de); lasersnijden met materiaal ± € 4,50/kg excl. btw',
  stapelKg: 'AANNAME: stapelplaat 300 x 112 x 20 gelaserd ± € 8-13 per plaat (geen losse platen te koop gevonden)',
  coatM2: 'AANNAME: poedercoat met stralen ± € 15-35/m² excl. btw (lakkerij BE)',
};
export const CAT = { staal: 'Staal (staven)', laser: 'Laserdelen', stapel: 'Gewichtstapel', coat: 'Poedercoat', koop: 'Kooponderdelen', bekleding: 'Bekleding', overhead: 'Overhead', arbeid: 'Arbeid' };
const BEKLEDING = new Set(['multiplex', 'schuim', 'leerThuis', 'leerPro', 'inslagmoer', 'nietjes']);

/** de kostprijs; inst = instellingen (STANDAARD + wijzigingen) */
export function kostprijs(o, inst = {}) {
  const I = { ...STANDAARD, ...inst, marge: { ...STANDAARD.marge, ...(inst.marge ?? {}) }, koopPrijs: { ...(inst.koopPrijs ?? {}) } };
  const U = { ...UREN, ...(inst.uren ?? {}) };
  const sl = stuklijst(o), zp = zaagplan(o, sl), t = totalen(o, sl), regels = [];
  const kgStaaf = zp.profielen.reduce((s, p) => s + p.kg, 0) * (1 + I.afval / 100), kgPrijs = zp.profielen.reduce((s, p) => s + p.kg * (p.prijsFactor ?? 1), 0) * (1 + I.afval / 100);
  regels.push({ cat: 'staal', wat: `Staal: ${zp.profielen.map((p) => `${p.naam} ${p.nodig.toFixed(1).replace('.', ',')} m`).join(', ')} (${Math.round(kgStaaf)} kg met ${I.afval} % afval${kgPrijs > kgStaaf + 0.5 ? '; vlakovaalbuis x 1,5' : ''})`, bedrag: kgPrijs * I.staalKg, bron: kgPrijs > kgStaaf + 0.5 ? `${BRON.staalKg}; AANNAME: vlakovaalbuis ± 1,5 x de prijs per kg van een koker` : BRON.staalKg });
  const kgStapel = sl.posities.filter((p) => p.soort === 'plaat' && p.voorbeeld.stapel).reduce((s, p) => s + p.kg * p.n, 0), kgLaser = t.kgPlaat - kgStapel;
  regels.push({ cat: 'laser', wat: `Laserdelen (${Math.round(kgLaser)} kg, ${sl.posities.filter((p) => p.soort === 'plaat' && !p.voorbeeld.stapel).reduce((s, p) => s + p.n, 0)} stuks)`, bedrag: kgLaser * I.laserKg, bron: BRON.laserKg });
  if (kgStapel) regels.push({ cat: 'stapel', wat: `Gewichtstapel (${Math.round(kgStapel)} kg, platen 20 mm)`, bedrag: kgStapel * I.stapelKg, bron: BRON.stapelKg });
  regels.push({ cat: 'coat', wat: `Poedercoat ${t.opp.toFixed(1).replace('.', ',')} m²`, bedrag: t.opp * I.coatM2, bron: BRON.coatM2 });
  const koop = sl.koop.map((x) => { const prijs = I.koopPrijs[x.key] ?? x.prijs; return { ...x, prijs, bedrag: x.bedrag - x.hoeveelheid * x.prijs + x.hoeveelheid * prijs }; });
  for (const x of koop) regels.push({ cat: BEKLEDING.has(x.key) ? 'bekleding' : 'koop', wat: `${x.naam} (${fmt(x.hoeveelheid)} ${x.eenheid})`, bedrag: x.bedrag, bron: /AANNAME/.test(x.winkel) && /^AANNAME/.test(x.bron) ? x.bron : `${x.winkel}${x.nagekeken || /AANNAME/.test(x.winkel + x.bron) ? '' : ' (AANNAME)'}: ${x.bron}`, key: x.key });
  const lc = I.leercurve ?? STANDAARD.leercurve, rk = Object.keys(lc).map(Number).filter((n) => n <= (I.reeks ?? 5)).sort((a, b) => b - a)[0] ?? 1, fLc = lc[rk];
  const stappen = werkwijze(o, U, sl), uren = stappen.reduce((s, x) => s + x.uren, 0) * fLc, arbeid = uren * I.uurloon;
  const OH = { ...STANDAARD.overhead, ...(I.overhead ?? {}) }, mat0 = regels.reduce((s, x) => s + x.bedrag, 0);
  regels.push({ cat: 'overhead', wat: `Lakkerij: minimum per rit € ${OH.lakkerijRit} gedeeld door ${OH.perRit} toestellen`, bedrag: OH.lakkerijRit / OH.perRit, bron: 'AANNAME: lakkerij-minimum per rit' });
  regels.push({ cat: 'overhead', wat: 'Transport heen en terug naar de lakkerij, levering', bedrag: OH.transport, bron: 'AANNAME' });
  regels.push({ cat: 'overhead', wat: 'Verpakking (pallet, hoeken, folie)', bedrag: OH.verpakking[o.versie] ?? 30, bron: 'AANNAME' });
  regels.push({ cat: 'overhead', wat: 'Handleiding NL/FR en montagefiche', bedrag: OH.handleiding, bron: 'AANNAME' });
  regels.push({ cat: 'overhead', wat: 'Afschrijving lasmallen en gereedschap', bedrag: OH.mallen, bron: 'AANNAME' });
  regels.push({ cat: 'overhead', wat: `Garantie (${OH.garantiePct} %) en productaansprakelijkheid (${OH.verzekeringPct} %) op materiaal + arbeid`, bedrag: (mat0 + arbeid) * (OH.garantiePct + OH.verzekeringPct) / 100, bron: 'AANNAME' });
  const materiaal = regels.reduce((s, x) => s + x.bedrag, 0), kp = materiaal + arbeid, marge = (I.marge[o.def.soort] ?? 30) + (o.versie === 'pro' ? I.margePro : 0), verkoop = kp * (1 + marge / 100), incl = verkoop * (1 + I.btw / 100);
  const perCat = {}; for (const x of regels) perCat[x.cat] = (perCat[x.cat] ?? 0) + x.bedrag; perCat.arbeid = arbeid;
  const band = o.def.markt[o.versie], status = incl < band[0] ? 'onder' : incl > band[1] ? 'boven' : 'in';
  return { regels, materiaal, uren, arbeid, kostprijs: kp, marge, verkoop, incl, perCat, stappen, stuklijst: sl, zaagplan: zp, totalen: t, koop, instellingen: I, markt: { band, status, bron: o.versie === 'pro' ? o.def.markt.bronP : o.def.markt.bronT, melding: status === 'in' ? '' : status === 'onder' ? `Onder de markt (${eur0(band[0])}-${eur0(band[1])}): ruimte voor een hogere marge.` : `Boven de markt (${eur0(band[0])}-${eur0(band[1])}): minder uren, een goedkoper profiel of verkopen als maatwerk.` } };
}
const fmt = (v) => (Math.round(v * 100) / 100).toString().replace('.', ',');
const eur0 = (v) => `€ ${Math.round(v).toLocaleString('nl-BE')}`;
export { KOOP };
