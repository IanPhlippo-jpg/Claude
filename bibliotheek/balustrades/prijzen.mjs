// Kostprijs en verkoopprijs van een balustrade (excl. btw): materiaal uit de stuklijst, kooponderdelen, coaten of
// verzinken, en de uren uit de werkwijze. Elke regel hoort bij een categorie (basis, hoek, trap, glas, zij, buiten,
// plaatsen), zodat de klant de toeslagen ziet en de prijs per strekkende meter naast de markt ligt. Elke prijs heeft een
// bron; 'SCHATTING' = geen publieke prijs gevonden. Opgezocht op 2026-11-13. Node en browser.
import { PROFIEL, KOOP, STAALPRIJS, GLASOPBOUW, GLASTINT, PATROON, RAL, METALLIC } from './onderdelen.mjs';
import { PRIJS as DEUR } from '../taatsdeuren/prijzen.mjs';
import { stuklijst, totalen, zaagplan } from './stuklijst.mjs';
import { stappen, UREN } from './werkwijze.mjs';

export const CAT = { basis: 'Balustrade', hoek: 'Hoeken', trap: 'Trap (schuin)', glas: 'Glas en klemmen', zij: 'Zijmontage', buiten: 'Buiten: thermisch verzinken', plaatsen: 'Plaatsen' };
export const PRIJS = {
  staal: STAALPRIJS,
  zaagverlies: { v: 0.1, bron: 'SCHATTING: 10 % zaagverlies; restlengtes gaan naar de volgende opdracht' },
  laserPerKg: DEUR.laserPerKg, laserPerDeel: DEUR.laserPerDeel,
  inoxPlaatPerKg: { v: 12, bron: 'SCHATTING: RVS 1.4301 plaat lasergesneden € 12/kg' },
  plaat: {
    vlak: { v: 50, bron: 'SCHATTING: plaat 3 mm 23,6 kg/m² x € 1,6 + snijden contour (metaalshopper.nl plaat 3 mm € 171/m² winkelprijs)' },
    perfo: { v: 75, bron: 'SCHATTING: geperforeerd Rv 10-15 2-3 mm € 45-90/m² + op maat knippen' },
    lamel: { v: 110, bron: 'SCHATTING: plaat + lasersnijden van het patroon € 60-150/m² (± € 1,4 per m snijlengte)' },
    cirkel: { v: 100, bron: 'SCHATTING: plaat + lasersnijden van het patroon' },
  },
  coat: { v: 30, bron: 'Coatinc Rhein-Main prijslijst 09/2025: hekwerk € 32,95/m², palen en rails € 13,45/lfm (coatinc.com); hier € 30 per m² staaloppervlak incl. voorbehandeling' },
  coatMin: { v: 150, bron: 'Coatinc: kleinste factuur € 150' },
  verzinken: { v: 1.1, bron: 'SCHATTING België € 0,80-1,40/kg (hausjournal.net: vanaf € 0,70/kg, kleine opdrachten € 1,50/kg)' },
  verzinkMin: { v: 120, bron: 'SCHATTING: minimum per opdracht € 75-150' },
  verputzen: { v: 0.66, bron: 'Coatinc: verzinkt staal klaarmaken voor de poedercoat (Feinverputzen) € 0,66/kg' },
  lassen: { v: 3, bron: 'SCHATTING: lasdraad G3Si1 en menggas ± € 3 per lasuur (taatsdeuren: weldingshop.nl, weld-toorts.be)' },
  klein: { v: 3, bron: 'SCHATTING: schijven, ontvetter, kit, merkers per meter' },
  metallic: METALLIC,
};
/** instellingen (pagina Instellingen): uurloon, marge per soort, verzinkprijs, coatprijs, plaatsen per meter */
export const STANDAARD = { uurloon: 45, marge: { spijlen: 30, staven: 30, glasstaal: 25, glasU: 15 }, verzinken: PRIJS.verzinken.v, coat: PRIJS.coat.v, staal: PRIJS.staal.v, plaatsenPerM: UREN.plaatsenPerM, glasPrijs: Object.fromEntries(Object.entries(GLASOPBOUW).map(([k, g]) => [k, g.prijs])), toon: 'verkoop' };

const r2 = (x) => Math.round(x * 100) / 100;
const gw = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ',');

/** de kostprijs: regels { wat, bedrag, bron, cat }, stappen met uren, totalen en de prijs per meter */
export function kostprijs(o, inst = {}) {
  const I = { ...STANDAARD, ...inst, marge: { ...STANDAARD.marge, ...(inst.marge ?? {}) }, glasPrijs: { ...STANDAARD.glasPrijs, ...(inst.glasPrijs ?? {}) } };
  const k = o.k, sl = stuklijst(o), T = totalen(o, sl), regels = [], buiten = k.plaats === 'buiten', inox = o.st?.staander === 'inox';
  const regel = (wat, bedrag, bron, cat = 'basis') => { if (bedrag > 0.004) regels.push({ wat, bedrag: r2(bedrag), bron, cat }); };
  // ---- staal en inox per positie (+ zaagverlies)
  const staalKat = {};
  for (const p of sl.posities) {
    if (p.soort !== 'staaf') continue;
    const P = PROFIEL[p.prof], bedrag = (P.koop ? (P.eurM * p.L) / 1000 : p.kg * I.staal) * p.n * (1 + PRIJS.zaagverlies.v), cat = p.cat === 'trap' ? 'basis' : p.cat;
    staalKat[cat] = (staalKat[cat] ?? 0) + bedrag;
  }
  for (const [cat, b] of Object.entries(staalKat)) regel(cat === 'zij' ? 'Afstandhouders koker 40x40x3' : `Staven staal${inox ? ' en inox' : ''} (zaaglijst, ${Math.round(T.kg)} kg, + 10 % zaagverlies)`, b, `${PRIJS.staal.bron}; inox: ${PROFIEL.inox42.bron}`, cat);
  // ---- laser: voetplaten, consoles, platen
  for (const p of sl.posities.filter((x) => x.soort === 'laser')) {
    if (p.rol === 'voetplaat' || p.rol === 'console') regel(`${p.naam} ${p.maat} (${p.n} st, lasergesneden${inox && p.rol === 'voetplaat' ? ', RVS' : ''})`, p.n * (p.kg * (inox && p.rol === 'voetplaat' ? PRIJS.inoxPlaatPerKg.v : PRIJS.laserPerKg.v) + PRIJS.laserPerDeel.v), inox ? PRIJS.inoxPlaatPerKg.bron : PRIJS.laserPerKg.bron, p.rol === 'console' ? 'zij' : 'basis');
    else { const pr = PRIJS.plaat[p.patroon] ?? PRIJS.plaat.vlak; regel(`${p.naam} ${p.maat} (${p.n} st)`, p.n * (p.b * p.l) / 1e6 * pr.v + p.n * PRIJS.laserPerDeel.v, pr.bron, 'basis'); }
  }
  // ---- glas
  if (T.glasM2) {
    const g = o.glas, tint = GLASTINT[k.glasTint] ?? GLASTINT.helder, pm2 = I.glasPrijs[g.opbouw] ?? g.prijs;
    regel(`Glas ${g.naam}, ${tint.naam.toLowerCase()} (${gw(T.glasM2, 2)} m², ${sl.posities.filter((p) => p.soort === 'glas').reduce((t, p) => t + p.n, 0)} platen)`, T.glasM2 * pm2 * (1 + tint.meer) * (o.knikken || k.vorm === 'trap' ? 1.08 : 1), `${g.bron}${tint.bron ? `; ${tint.bron}` : ''}${k.vorm === 'trap' ? '; parallellogram + 8 % (SCHATTING)' : ''}`, 'glas');
  }
  // ---- kooponderdelen
  const uM = o.delen.filter((d) => d.rol === 'uprofiel').reduce((t, d) => t + d.L, 0) / 1000;
  for (const x of sl.koop) {
    let cat = x.cat, bedrag = x.bedrag;
    // U-profiel en rubbers: per meter + 10 % zaagverlies (de rest gaat naar de volgende opdracht), zoals de aluminium deuren
    if (['qrTop', 'qrZij', 'qrRubber'].includes(x.key)) {
      const st = (uM * (1 + PRIJS.zaagverlies.v)) / 2.5, per = `${gw(uM, 2)} m + 10 % = ${gw(st, 2)} x 2,5 m; bestellen: ${x.n} ${x.eenheid}`;
      if (x.key === 'qrRubber') { regel(`${x.naam} (${per})`, st * x.prijs, `${x.winkel}: ${x.bron}; ${PRIJS.zaagverlies.bron}`, 'basis'); continue; }
      regel(`${KOOP.qrTop.naam.replace(', 2500 mm', '')} (${per})`, st * KOOP.qrTop.prijs, `${KOOP.qrTop.bron}; ${PRIJS.zaagverlies.bron}`, 'basis');
      if (x.key === 'qrZij') regel(`Meerprijs zijmontageprofiel MOD 8240 (${gw(st, 2)} x 2,5 m)`, st * (KOOP.qrZij.prijs - KOOP.qrTop.prijs), x.bron, 'zij');
      continue;
    }
    if (buiten && /A4/.test(x.naam)) { const gewoon = x.key === 'faz12a4' ? KOOP.faz12 : KOOP.fisa12; regel(`${x.naam} (${x.n} ${x.eenheid})`, x.n * gewoon.prijs, gewoon.bron, 'basis'); regel(`Meerprijs RVS A4-ankers buiten (${x.n} st)`, x.n * (x.prijs - gewoon.prijs), x.bron, 'buiten'); continue; }
    regel(`${x.naam} (${x.n} ${x.eenheid})`, bedrag, `${x.winkel}: ${x.bron}`, cat);
  }
  // ---- afwerking: binnen poedercoat; buiten thermisch verzinken + poedercoat (duplex); inox geen coating
  const kleur = RAL.find((c) => c.code === k.ral) ?? RAL[0], meer = kleur.metallic ? 1 + PRIJS.metallic.v : 1;
  const coatOpp = inox ? 0 : T.opp;
  if (coatOpp > 0 || k.soort === 'glasU') {
    if (k.soort !== 'glasU') regel(`Poedercoaten RAL ${kleur.code} ${kleur.naam} (${gw(coatOpp, 2)} m² staal)`, Math.max(PRIJS.coatMin.v, coatOpp * I.coat * meer), PRIJS.coat.bron, 'basis');
    if (buiten && k.soort !== 'glasU') {
      const kgZ = T.kg;
      regel(`Thermisch verzinken (${Math.round(kgZ)} kg) en klaarmaken voor de poedercoat`, Math.max(PRIJS.verzinkMin.v, kgZ * I.verzinken) + kgZ * PRIJS.verputzen.v, `${PRIJS.verzinken.bron}; ${PRIJS.verputzen.bron}`, 'buiten');
    }
  }
  // ---- uren
  const S = stappen(o, sl, { ...UREN, plaatsenPerM: I.plaatsenPerM ?? UREN.plaatsenPerM });
  const lasUren = S.filter((s) => /lassen|Spijlen|staven|Platen|Handregel|Staanders/i.test(s.titel)).reduce((t, s) => t + s.uren, 0);
  if (lasUren) regel(`Lasdraad en gas (${gw(lasUren)} lasuren)`, lasUren * PRIJS.lassen.v, PRIJS.lassen.bron, 'basis');
  regel('Klein materiaal (schijven, ontvetter, kit)', (o.lengte / 1000) * PRIJS.klein.v, PRIJS.klein.bron, 'basis');
  // ---- per categorie
  const marge = (I.marge[k.soort] ?? 25) / 100;
  const perCat = Object.fromEntries(Object.keys(CAT).map((c) => [c, { materiaal: 0, uren: 0 }]));
  for (const r of regels) perCat[r.cat].materiaal += r.bedrag;
  for (const s of S) for (const [c, u] of Object.entries(s.cats)) perCat[c].uren += u;
  for (const c of Object.values(perCat)) { c.arbeid = r2(c.uren * I.uurloon); c.kost = r2(c.materiaal + c.arbeid); c.verkoop = r2(c.kost * (1 + marge)); c.materiaal = r2(c.materiaal); c.uren = r2(c.uren); }
  const som = (f, zonder = []) => r2(Object.entries(perCat).filter(([c]) => !zonder.includes(c)).reduce((t, [, x]) => t + x[f], 0));
  const metPl = !!k.plaatsen, uit = metPl ? [] : ['plaatsen'];
  const m = o.lengte / 1000;
  const materiaal = som('materiaal'), uren = som('uren', uit), arbeid = som('arbeid', uit), kostprijs = som('kost', uit), verkoop = som('verkoop', uit);
  const zonderPl = som('verkoop', ['plaatsen']);
  return {
    regels, stappen: S.map((s) => ({ ...s, apart: s.cats.plaatsen && !metPl })), perCat, materiaal, uren, arbeid, kostprijs, verkoop, marge: marge * 100, meter: r2(m),
    perMeter: r2(verkoop / m), perMeterZonder: r2(zonderPl / m), basisPerMeter: r2(perCat.basis.verkoop / m),
    plaatsen: { uren: perCat.plaatsen.uren, kost: perCat.plaatsen.kost, verkoop: perCat.plaatsen.verkoop, perMeter: r2(perCat.plaatsen.verkoop / m), inbegrepen: metPl },
    gewicht: r2(T.kg), glas: r2(T.glasM2), oppervlak: r2(T.opp), stuklijst: sl, instellingen: I,
  };
}

/** verkoopprijzen per strekkende meter in BE/NL (opgezocht 2026-11-13), excl. btw; montage = plaatsen inbegrepen */
export const MARKT = [
  { soort: 'spijlen', wat: 'Urban Steel (BE) LANCO, stalen spijlen, voorbeeld 5 m', prijs: 385, montage: false, bron: 'https://www.urbansteel.be/categorieen/borstweringen-voor-buiten' },
  { soort: 'spijlen', wat: 'Urban Steel (BE) LANCO, geplaatst', prijs: 568, montage: true, bron: 'https://www.urbansteel.be/categorieen/borstweringen-voor-buiten' },
  { soort: 'spijlen', wat: 'Rookton: stalen balustrade eenvoudig tot maatwerk', prijs: 150, prijsHoog: 600, montage: false, bron: 'https://www.rookton.com/stalen-balustrade-prijs-kosten-opties-en-bespaartips-uitgelegd/' },
  { soort: 'spijlen', wat: 'Bouwplannen.be: balustrade voor een trap, geplaatst', prijs: 250, prijsHoog: 500, montage: true, bron: 'https://bouwplannen.be/balustrade-voor-trap/' },
  { soort: 'staven', wat: 'Urban Steel (BE) PAXAL plat 10x40 horizontaal, geplaatst', prijs: 520, montage: true, bron: 'https://www.urbansteel.be/categorieen/borstweringen-voor-buiten' },
  { soort: 'staven', wat: 'Urban Steel (BE) SENZO koker 30x30, geplaatst', prijs: 594, montage: true, bron: 'https://www.urbansteel.be/categorieen/borstweringen-voor-buiten' },
  { soort: 'staven', wat: 'Rookton: maatwerk staal', prijs: 300, prijsHoog: 600, montage: false, bron: 'https://www.rookton.com/stalen-balustrade-prijs-kosten-opties-en-bespaartips-uitgelegd/' },
  { soort: 'glasstaal', wat: 'Urban Steel (BE) GRELA, glas met stalen staanders', prijs: 412, montage: false, bron: 'https://www.urbansteel.be/categorieen/borstweringen-voor-buiten' },
  { soort: 'glasstaal', wat: 'Urban Steel (BE) LUVA, glas met staal', prijs: 426, montage: false, bron: 'https://www.urbansteel.be/categorieen/borstweringen-voor-buiten' },
  { soort: 'glasstaal', wat: 'Urban Steel (BE) GRELA / LUVA, geplaatst', prijs: 561, prijsHoog: 567, montage: true, bron: 'https://www.urbansteel.be/categorieen/borstweringen-voor-buiten' },
  { soort: 'glasstaal', wat: 'Binnenbeglazing.be: glas met stalen glasklem (88.2), geplaatst ± € 500/m²', prijs: 550, montage: true, bron: 'https://www.binnenbeglazing.be/glazen-balustrades/prijs-glazen-balustrades/' },
  { soort: 'glasstaal', wat: 'Bouwplannen.be: glazen balustrade, geplaatst', prijs: 450, prijsHoog: 700, montage: true, bron: 'https://bouwplannen.be/balustrade-voor-trap/' },
  { soort: 'glasU', wat: 'Urban Steel (BE) GAMBRA, glas in U-profiel', prijs: 337, montage: false, bron: 'https://www.urbansteel.be/categorieen/borstweringen-voor-buiten' },
  { soort: 'glasU', wat: 'Urban Steel (BE) RIDRAS, glas in U-profiel', prijs: 364, montage: false, bron: 'https://www.urbansteel.be/categorieen/borstweringen-voor-buiten' },
  { soort: 'glasU', wat: 'Urban Steel (BE) GAMBRA / RIDRAS, geplaatst', prijs: 544, prijsHoog: 546, montage: true, bron: 'https://www.urbansteel.be/categorieen/borstweringen-voor-buiten' },
  { soort: 'glasU', wat: 'Kit uit losse onderdelen (profiel € 125-160/m, glas € 240-300/m², rubbers en kappen)', prijs: 420, prijsHoog: 520, montage: false, bron: 'eigen optelling van rvs-products.nl, rvsland.nl en glashandelonline.com (13/11/2026)' },
];
/** marktband per soort, € per strekkende meter excl. btw, zonder en met plaatsen (SCHATTING uit de bronnen hierboven) */
export const MARKTBAND = {
  spijlen: { laag: 200, hoog: 400, laagPl: 300, hoogPl: 580, tekst: 'stalen spijlen op maat: € 200-400/m zonder plaatsen, € 300-580/m geplaatst' },
  staven: { laag: 250, hoog: 450, laagPl: 380, hoogPl: 650, tekst: 'staal horizontaal of plaat: € 250-450/m zonder plaatsen, € 380-650/m geplaatst' },
  glasstaal: { laag: 300, hoog: 450, laagPl: 450, hoogPl: 650, tekst: 'glas met stalen staanders of klemmen: € 300-450/m zonder plaatsen, € 450-650/m geplaatst' },
  glasU: { laag: 340, hoog: 600, laagPl: 500, hoogPl: 750, tekst: 'glas in een aluminium U-profiel: € 340-600/m zonder plaatsen (kit alleen al € 420-520/m materiaal, met U-handregel ± € 60/m meer), € 500-750/m geplaatst' },
};
