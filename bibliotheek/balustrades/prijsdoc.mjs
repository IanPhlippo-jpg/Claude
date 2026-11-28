// Het prijsdocument van één balustrade (werkplaats, tabblad Prijzen): alle prijzen samen, opgemaakt voor
// werkplaats/werkdoc.mjs (scherm en PDF). Rekent niets opnieuw: de bedragen komen uit kostprijs() (prijzen.mjs), zoals de
// vroegere tabellen Kostprijs en Ter vergelijking en de prijzen op de bestellijst.
import { CAT, MARKT, MARKTBAND, PRIJS, STANDAARD } from './prijzen.mjs';
import { SOORTEN, STIJL, GLASOPBOUW } from './onderdelen.mjs';
import { btwFactor } from './dossier.mjs';

const eur = (v) => `€ ${(Math.round(v * 100) / 100).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const eur0 = (v) => `€ ${Math.round(v).toLocaleString('nl-BE')}`;
const g = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('nl-BE');

/** h: { o, kp, meta } van de werkplaats; inst: de instellingen */
export function prijsDocument(h, inst) {
  const { o, kp, meta } = h, k = o.k, S = SOORTEN[k.soort], sty = STIJL(k.soort, k.stijl), btw = btwFactor(inst), bp = Math.round((btw - 1) * 100), I = kp.instellingen, pl = kp.plaatsen;
  const delen = [];
  // 1. kostprijs: dezelfde regels en totalen als de vroegere tabel Kostprijs
  delen.push({ id: 'kostprijs', titel: 'Kostprijs', sub: 'materiaal per regel met de bron, arbeid en het totaal (excl. btw)', kol: [{ t: 'Wat', w: 4.6 }, { t: 'Deel', w: 2 }, { t: 'Bedrag', w: 1.4, n: 1 }, { t: 'Bron', w: 3.6, k: 1 }],
    rijen: [...kp.regels.map((r) => [r.wat, CAT[r.cat], eur(r.bedrag), r.bron]),
      { c: ['Materiaal', '', eur(kp.materiaal), ''], soort: 'tot', id: 'materiaal' },
      { c: [`Arbeid ${g(kp.uren, 2)} u x ${eur(inst.uurloon)}`, '', eur(kp.arbeid), 'uren uit de werkwijze (instellingen)'], soort: 'tot', id: 'arbeid' },
      { c: ['Kostprijs', '', eur(kp.kostprijs), ''], soort: 'tot', id: 'kostprijs' }] });
  // 2. per deel: de toeslagen (hoeken, trap, glas, buiten, plaatsen) met de prijs per meter
  delen.push({ id: 'delen', titel: 'Per deel', sub: `toeslagen op ${g(kp.meter, 2)} m, met ${kp.marge} % marge`, kol: [{ t: 'Deel', w: 3.6 }, { t: 'Materiaal', w: 1.4, n: 1 }, { t: 'Uren', w: 0.9, n: 1 }, { t: 'Kost', w: 1.4, n: 1 }, { t: 'Verkoop', w: 1.4, n: 1 }, { t: 'Per meter', w: 1.3, n: 1 }],
    rijen: Object.entries(kp.perCat).filter(([, x]) => x.kost > 0.5).map(([c, x]) => ({ c: [`${CAT[c]}${c === 'plaatsen' && !pl.inbegrepen ? ' (apart)' : ''}`, eur(x.materiaal), g(x.uren, 2), eur(x.kost), eur(x.verkoop), `${eur0(x.verkoop / kp.meter)}/m`], soort: c === 'plaatsen' && !pl.inbegrepen ? 'apart' : '' })) });
  // 3. kooponderdelen met prijs per stuk (de bestellijst)
  const koop = kp.stuklijst.koop;
  delen.push({ id: 'koop', titel: 'Kooponderdelen', sub: 'bestellijst met prijs per eenheid', kol: [{ t: 'Artikel', w: 1.8 }, { t: 'Benaming', w: 4 }, { t: 'Aantal', w: 1.3, n: 1 }, { t: 'Prijs', w: 1.2, n: 1 }, { t: 'Bedrag', w: 1.3, n: 1 }, { t: 'Winkel en bron', w: 3, k: 1 }],
    rijen: [...koop.map((x) => [x.artikel, x.naam, `${x.n} ${x.eenheid}`, eur(x.prijs), eur(x.bedrag), `${x.winkel}: ${x.bron}`]), { c: ['', 'Totaal kooponderdelen (bestelwaarde)', '', '', eur(koop.reduce((t, x) => t + x.bedrag, 0)), ''], soort: 'tot' }],
    noot: 'U-profielen en rubbers rekent de kostprijs per meter + 10 % zaagverlies (de rest gaat naar de volgende opdracht); de bestelwaarde in hele stuks staat hier ter info.' });
  // 4. uren x uurloon
  delen.push({ id: 'arbeid', titel: 'Uren x uurloon', sub: `${eur(inst.uurloon)} per uur`, kol: [{ t: 'Stap', w: 4.5 }, { t: 'Proces', w: 2.5 }, { t: 'Uren', w: 1, n: 1 }, { t: 'Bedrag', w: 1.4, n: 1 }],
    rijen: [...kp.stappen.map((x) => ({ c: [x.titel + (x.apart ? ' (apart)' : ''), x.proces ?? '', g(x.uren, 2), eur(x.uren * inst.uurloon)], soort: x.apart ? 'apart' : '' })),
      { c: [`Arbeid ${g(kp.uren, 2)} u x ${eur(inst.uurloon)}`, '', g(kp.uren, 2), eur(kp.arbeid)], soort: 'tot', id: 'arbeid' }] });
  // 5. marge en verkoopprijs
  delen.push({ id: 'verkoop', titel: 'Marge en verkoopprijs', kol: [{ t: 'Wat', w: 5 }, { t: 'Bedrag', w: 1.5, n: 1 }],
    rijen: [['Kostprijs', eur(kp.kostprijs)], [`Marge ${kp.marge} %`, eur(kp.verkoop - kp.kostprijs)],
      { c: [`Verkoop excl. btw (${pl.inbegrepen ? 'geplaatst' : 'zonder plaatsen'})`, eur(kp.verkoop)], soort: 'tot', id: 'verkoop' },
      ['Per strekkende meter excl. btw', `${eur(kp.perMeter)}/m`], [`Btw ${bp} %`, eur(kp.verkoop * (btw - 1))],
      { c: ['Verkoop incl. btw', eur(kp.verkoop * btw)], soort: 'tot', id: 'incl' },
      ...(pl.inbegrepen ? [] : [{ c: [`Plaatsen, apart (${g(pl.uren, 1)} u), als de klant het vraagt`, `+ ${eur(pl.verkoop)}`], soort: 'apart' }])] });
  // 6. de markt: dezelfde tabel als vroeger Ter vergelijking
  delen.push({ id: 'markt', titel: 'Ter vergelijking', sub: MARKTBAND[k.soort].tekst, kol: [{ t: 'Verkoopprijs elders', w: 4.5 }, { t: '€/m excl. btw', w: 1.6, n: 1 }, { t: 'Plaatsen', w: 1.8 }, { t: 'Bron', w: 3, k: 1 }],
    rijen: [...MARKT.filter((m) => m.soort === k.soort).map((m) => [m.wat, `${eur0(m.prijs)}${m.prijsHoog ? ` – ${eur0(m.prijsHoog)}` : ''}`, m.montage ? 'inbegrepen' : 'niet inbegrepen', m.bron]),
      { c: ['Deze balustrade', eur0(kp.perMeterZonder), `niet inbegrepen (+ ${eur0(pl.perMeter)}/m)`, `marge ${kp.marge} %`], soort: 'tot', id: 'markt' }] });
  // 7. tarieven en materiaalprijzen die deze balustrade gebruikt
  const eigen = (v, std, bron) => (Math.abs((v ?? std) - std) > 0.004 ? 'eigen waarde (instellingen)' : bron);
  const t = [['Uurloon', `${eur(I.uurloon)}/u`, 'instellingen'], [`Marge ${S.kort.toLowerCase()}`, `${kp.marge} %`, 'instellingen'],
    ['Staal', `${eur(I.staal)}/kg`, eigen(I.staal, STANDAARD.staal, PRIJS.staal.bron)], ['Zaagverlies', `${g(PRIJS.zaagverlies.v * 100)} %`, PRIJS.zaagverlies.bron]];
  if (k.soort === 'glasstaal') t.push(['Poedercoaten staanders en handregel', `${eur(I.coatLfm)}/m`, eigen(I.coatLfm, STANDAARD.coatLfm, PRIJS.coatLfm.bron)]);
  else if (k.soort !== 'glasU' && sty.staander !== 'inox') t.push(['Poedercoaten hekwerk', `${eur(I.coat)}/m² aanzicht, min. ${eur(PRIJS.coatMin.v)}`, eigen(I.coat, STANDAARD.coat, PRIJS.coat.bron)]);
  if (k.plaats === 'buiten' && k.soort !== 'glasU') t.push(['Thermisch verzinken', `${eur(I.verzinken)}/kg + ${eur(PRIJS.verputzen.v)}/kg klaarmaken`, eigen(I.verzinken, STANDAARD.verzinken, PRIJS.verzinken.bron)]);
  if (o.glas) {
    const gb = o.glas.opbouw, v = I.glasPrijs[gb] ?? o.glas.prijs;
    t.push([`Glas ${GLASOPBOUW[gb]?.naam ?? o.glas.naam}`, `${eur(v)}/m²`, eigen(v, STANDAARD.glasPrijs[gb] ?? v, o.glas.bron)]);
    t.push(['Heat-soak-test', `${eur(I.heatsoak)}/m²`, eigen(I.heatsoak, STANDAARD.heatsoak, PRIJS.heatsoak.bron)], ['Risico glasbreuk', `${g(I.risicoGlas)} % van het glas`, eigen(I.risicoGlas, STANDAARD.risicoGlas, PRIJS.risicoGlas.bron)]);
  }
  t.push(['Lasersnijden', `${eur(PRIJS.laserPerKg.v)}/kg + ${eur(PRIJS.laserPerDeel.v)}/deel`, PRIJS.laserPerKg.bron], ['Lasdraad en gas', `${eur(PRIJS.lassen.v)}/lasuur`, PRIJS.lassen.bron],
    ['Bestelwagen', `${g(I.km)} km per rit x ${eur(I.kmPrijs)}/km`, eigen(I.kmPrijs, STANDAARD.kmPrijs, PRIJS.km.bron)], ['Plaatsen', `${g(I.plaatsenPerM, 2)} u per meter`, 'instellingen'], ['Btw', `${bp} %`, 'instellingen']);
  delen.push({ id: 'tarieven', titel: 'Tarieven en materiaalprijzen', sub: 'gebruikt voor deze balustrade, excl. btw', kol: [{ t: 'Wat', w: 3.4 }, { t: 'Prijs', w: 2.8, n: 1 }, { t: 'Bron en datum', w: 5, k: 1 }], rijen: t,
    noot: 'Prijzen en marktprijzen opgezocht op 13-11-2026; de datum per bron staat erbij waar de bron er een geeft. "SCHATTING" = geen publieke prijs gevonden.' });
  return {
    kleur: S.kleur ?? '#c2410c', product: `Balustrade · ${S.kort.toLowerCase()}`, titel: `${sty.id} ${sty.naam}`,
    sub: `${o.segs.map((x) => Math.round(x.Lh)).join(' + ')} mm (${g(kp.meter, 2)} m), H ${k.H}, ${k.plaats}, ${k.bevestiging === 'zij' ? 'zijmontage' : 'bovenop de vloer'}${pl.inbegrepen ? ', geplaatst' : ', zonder plaatsen'}`, datum: meta.datum,
    kern: [{ t: 'Kostprijs', v: eur(kp.kostprijs), id: 'kostprijs' }, { t: `Verkoop excl. btw (${kp.marge} %)`, v: eur(kp.verkoop), id: 'verkoop', hoofd: true }, { t: `Verkoop incl. ${bp} % btw`, v: eur(kp.verkoop * btw), id: 'incl' }, { t: 'Per meter excl. btw', v: `${eur0(kp.perMeter)}/m`, id: 'meter' }],
    delen, voet: 'Alle bedragen excl. btw tenzij anders vermeld. Prijzen met een bron; de eigen waarden komen uit de instellingen.',
  };
}
