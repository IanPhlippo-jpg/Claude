// Het prijsdocument van één fitnesstoestel (werkplaats, tabblad Prijzen): alle prijzen samen, opgemaakt voor
// werkplaats/werkdoc.mjs (scherm en PDF). Rekent niets opnieuw: de bedragen komen uit kostprijs() (prijzen.mjs), zoals de
// vroegere tabellen Kostprijs en Bestellijst.
import { CAT, STANDAARD, BRON } from './prijzen.mjs';
import { SOORTEN, VERSIE } from './onderdelen.mjs';

const eur = (v) => `€ ${(Math.round(v * 100) / 100).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const eur0 = (v) => `€ ${Math.round(v).toLocaleString('nl-BE')}`;
const g = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('nl-BE');

/** o: het toestel, k: kostprijs(o, inst), meta: { datum } */
export function prijsDocument(o, k, meta = {}) {
  const I = k.instellingen, S = SOORTEN[o.def.soort], V = VERSIE[o.versie], delen = [];
  // 1. kostprijs: dezelfde regels en totalen als de vroegere tabel Kostprijs
  delen.push({ id: 'kostprijs', titel: 'Kostprijs', sub: 'per regel met de bron, arbeid en het totaal (excl. btw)', kol: [{ t: 'Wat', w: 4.6 }, { t: 'Deel', w: 1.7 }, { t: 'Bedrag', w: 1.4, n: 1 }, { t: 'Bron', w: 3.6, k: 1 }],
    rijen: [...k.regels.map((r) => [r.wat, CAT[r.cat] ?? r.cat, eur(r.bedrag), r.bron]),
      { c: ['Materiaal en overhead', '', eur(k.materiaal), ''], soort: 'tot', id: 'materiaal' },
      { c: [`Arbeid ${g(k.uren, 2)} u x ${eur(I.uurloon)}`, '', eur(k.arbeid), 'uren uit de werkwijze (instelbaar)'], soort: 'tot', id: 'arbeid' },
      { c: ['Kostprijs', '', eur(k.kostprijs), ''], soort: 'tot', id: 'kostprijs' }] });
  // 2. kooponderdelen: de vroegere bestellijst met winkel, prijs en bedrag
  delen.push({ id: 'koop', titel: 'Kooponderdelen', sub: 'bestellijst met winkel (excl. btw); AANNAME = nog na te kijken', kol: [{ t: 'Onderdeel', w: 3.8 }, { t: 'Artikel', w: 2.2 }, { t: 'Aantal', w: 1.3, n: 1 }, { t: 'Prijs', w: 1.2, n: 1 }, { t: 'Bedrag', w: 1.3, n: 1 }, { t: 'Winkel en bron', w: 2.6, k: 1 }],
    rijen: [...k.koop.map((x) => [`${x.naam}${x.nagekeken ? '' : ' (AANNAME)'}`, x.artikel ?? '', `${g(x.hoeveelheid, 2)} ${x.eenheid}`, eur(x.prijs), eur(x.bedrag), `${x.winkel}${x.bron ? `: ${x.bron}` : ''}`]),
      { c: ['Totaal kooponderdelen', '', '', '', eur(k.koop.reduce((t, x) => t + x.bedrag, 0)), ''], soort: 'tot' }] });
  // 3. uren x uurloon (de werkwijze, met de leercurve van de reeks)
  const som = k.stappen.reduce((t, x) => t + x.uren, 0), f = som ? k.uren / som : 1;
  delen.push({ id: 'arbeid', titel: 'Uren x uurloon', sub: `${eur(I.uurloon)} per uur`, kol: [{ t: 'Stap', w: 4.5 }, { t: 'Proces', w: 2.5 }, { t: 'Uren', w: 1, n: 1 }],
    rijen: [...k.stappen.map((x) => [x.titel, x.proces ?? '', g(x.uren, 2)]),
      ...(Math.abs(f - 1) > 0.001 ? [[`Leercurve: stuk uit een reeks van ${I.reeks ?? STANDAARD.reeks} (x ${g(f, 2)})`, '', `${f > 1 ? '+' : '−'} ${g(Math.abs(k.uren - som), 2)}`]] : []),
      { c: [`Arbeid ${g(k.uren, 2)} u x ${eur(I.uurloon)} = ${eur(k.arbeid)}`, '', g(k.uren, 2)], soort: 'tot', id: 'arbeid' }] });
  // 4. marge en verkoopprijs
  delen.push({ id: 'verkoop', titel: 'Marge en verkoopprijs', kol: [{ t: 'Wat', w: 5 }, { t: 'Bedrag', w: 1.5, n: 1 }],
    rijen: [['Kostprijs', eur(k.kostprijs)], [`Marge ${g(k.marge, 1)} % (${S.naam.toLowerCase()}${o.versie !== 'thuis' ? `, ${V.naam.toLowerCase()}` : ''})`, eur(k.verkoop - k.kostprijs)],
      { c: ['Verkoop excl. btw', eur(k.verkoop)], soort: 'tot', id: 'verkoop' }, [`Btw ${I.btw} %`, eur(k.incl - k.verkoop)], { c: ['Verkoop incl. btw', eur(k.incl)], soort: 'tot', id: 'incl' }] });
  // 5. de markt
  const [lo, hi] = k.markt.band;
  delen.push({ id: 'markt', titel: 'Ter vergelijking', sub: 'marktband van dit toestel, incl. btw', kol: [{ t: 'Wat', w: 4 }, { t: 'Incl. btw', w: 2, n: 1 }, { t: 'Bron', w: 4.5, k: 1 }],
    rijen: [[`Marktband ${V.naam.toLowerCase()}`, `${eur0(lo)} – ${eur0(hi)}`, k.markt.bron],
      { c: ['Dit toestel', eur0(k.incl), k.markt.status === 'in' ? 'in de marktband' : k.markt.status === 'onder' ? 'onder de markt' : `boven de markt${k.markt.melding ? `: ${k.markt.melding}` : ''}`], soort: 'tot', id: 'markt' }] });
  // 6. tarieven en materiaalprijzen
  const eigen = (v, std, bron) => (typeof std === 'number' && Math.abs(v - std) > 0.004 ? 'eigen waarde (instellingen)' : bron);
  const eigenKoop = Object.keys(I.koopPrijs ?? {}).length;
  const t = [['Uurloon', `${eur(I.uurloon)}/u`, eigen(I.uurloon, STANDAARD.uurloon, BRON.uurloon)], [`Marge ${S.naam.toLowerCase()}`, `${g(I.marge[o.def.soort] ?? 30)} %`, 'instellingen'], ['Extra marge proversie', `${g(I.margePro)} % (semi-pro de helft)`, 'instellingen'],
    ['Staal (kokers, buizen)', `${eur(I.staalKg)}/kg`, eigen(I.staalKg, STANDAARD.staalKg, BRON.staalKg)], ['Zaagafval staal', `${g(I.afval)} %`, 'instellingen'],
    ['Plaat voor laserdelen', `${eur(I.plaatKg)}/kg + snijden per meter`, BRON.laser], ['Gewichtstapel (20 mm)', `${eur(I.stapelKg)}/kg`, eigen(I.stapelKg, STANDAARD.stapelKg, BRON.stapelKg)],
    ['Poedercoat met stralen', `${eur(I.coatM2)}/m²`, eigen(I.coatM2, STANDAARD.coatM2, BRON.coatM2)], ['Buigen (uitbesteed)', `${eur(I.bocht)} per bocht + ${eur(I.buigInstel)} instellen`, BRON.buigen], ['Btw', `${I.btw} %`, 'instellingen']];
  if (eigenKoop) t.push(['Kooponderdelen', `${eigenKoop} eigen prijs${eigenKoop > 1 ? 'zen' : ''}`, 'instellingen (zie de kooponderdelen hierboven)']);
  delen.push({ id: 'tarieven', titel: 'Tarieven en materiaalprijzen', sub: 'gebruikt voor dit toestel, excl. btw', kol: [{ t: 'Wat', w: 3.4 }, { t: 'Prijs', w: 2.8, n: 1 }, { t: 'Bron en datum', w: 5, k: 1 }], rijen: t,
    noot: 'Prijzen opgezocht op 15-11-2026 (zie de bron per regel). AANNAME = geen publieke prijs gevonden, na te kijken met een offerte.' });
  return {
    kleur: S.accent ?? '#c2410c', product: `Fitness · ${S.naam.toLowerCase()} · ${V.naam.toLowerCase()}`, titel: `${o.def.id} ${o.naam}`,
    sub: `${o.maten.B} x ${o.maten.D} x ${o.maten.H} mm, ${g(o.massa)} kg${o.maat && o.maat !== 'standaard' ? `, maat ${o.maat}` : ''}${o.gekozenOpties?.filter((x) => x.gelukt).length ? `, opties: ${o.gekozenOpties.filter((x) => x.gelukt).map((x) => x.naam.toLowerCase()).join(', ')}` : ''}`, datum: meta.datum,
    kern: [{ t: 'Kostprijs', v: eur(k.kostprijs), id: 'kostprijs' }, { t: 'Verkoop excl. btw', v: eur(k.verkoop), id: 'verkoop' }, { t: `Verkoop incl. ${I.btw} % btw`, v: eur(k.incl), id: 'incl', hoofd: true }, { t: 'Uren', v: `${g(k.uren, 1)} u`, id: 'uren' }],
    delen, voet: 'Alle bedragen excl. btw tenzij anders vermeld. Prijzen met een bron; de eigen waarden komen uit de instellingen.',
  };
}
