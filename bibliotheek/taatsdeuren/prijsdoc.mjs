// Het prijsdocument van één taatsdeur (werkplaats, tabblad Prijzen): alle prijzen van de deur samen, opgemaakt voor
// werkdoc.mjs (scherm en PDF). Rekent niets opnieuw: de bedragen komen uit kostprijs() (prijzen.mjs) en het zaagplan
// (bestel.mjs), zoals de vroegere tabellen Kostprijs en Ter vergelijking en de prijzen op de bestellijst.
import { STAAF, PRIJS, MARKT, MARKTBAND } from './prijzen.mjs';
import { SCHARNIEREN, RAL } from './opties.mjs';
import { zaagplan } from './bestel.mjs';

const eur = (v) => `€ ${(Math.round(v * 100) / 100).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const eur0 = (v) => `€ ${Math.round(v).toLocaleString('nl-BE')}`;
const g = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('nl-BE');

/**
 * h: { o, k, L, s, kk, meta } van de werkplaats; mat 'staal' | 'alu'; inst: de instellingen (uurloon, marge, margeAlu,
 * prijzen); std: de standaardprijzen (om een eigen prijs te herkennen)
 */
export function prijsDocument(h, mat, inst, std = {}) {
  const { o, k, L, s, kk, meta } = h, pl = k.plaatsen, marge = mat === 'alu' ? inst.margeAlu : inst.marge, uurloon = inst.uurloon;
  const delen = [];
  // 1. kostprijs: dezelfde regels en totalen als de vroegere tabel Kostprijs
  delen.push({ id: 'kostprijs', titel: 'Kostprijs', sub: 'materiaal per regel met de bron, arbeid en het totaal (excl. btw)', kol: [{ t: 'Wat', w: 5 }, { t: 'Bedrag', w: 1.4, n: 1 }, { t: 'Bron', w: 4, k: 1 }],
    rijen: [...k.regels.map((r) => [r.wat, eur(r.bedrag), r.bron]),
      { c: ['Materiaal', eur(k.materiaal), ''], soort: 'tot', id: 'materiaal' },
      { c: [`Arbeid ${g(k.uren, 2)} u x ${eur(uurloon)}${pl.inbegrepen ? ' (met plaatsen)' : ''}`, eur(k.arbeid), 'standaarduren uit de instellingen'], soort: 'tot', id: 'arbeid' },
      { c: ['Kostprijs', eur(k.kostprijs), ''], soort: 'tot', id: 'kostprijs' }] });
  // 2. kooponderdelen: de staven uit het zaagplan (bestellijst) en het beslag, met prijs per eenheid
  const z = zaagplan(o, kk), sk = k.scharnier, sch = PRIJS.scharnier[sk], aantal = (SCHARNIEREN[sk].aantal ?? 1) * o.vleugels.length;
  const koop = z.profielen.map((p) => [`${p.artikel ? `${p.artikel} · ` : ''}${p.naam}`, `${p.n} x ${g(p.lengte / 1000, 1)} m (${g(p.m, 1)} m)`, `${eur(p.prijsM)}/m`, eur(p.prijs), p.bron]);
  koop.push([`Scharnier: ${sch.naam.replace(/^Pivot: |^Verdekt: /, '')}`, `${aantal} st`, eur(sch.v), eur(sch.v * aantal), sch.bron]);
  if (o.sys.alu) koop.push(['Deurgreep 800 mm, rug aan rug', `${o.vleugels.length} paar`, eur(PRIJS.greepAlu.v), eur(PRIJS.greepAlu.v * o.vleugels.length), PRIJS.greepAlu.bron]);
  delen.push({ id: 'koop', titel: 'Kooponderdelen en bestelling', sub: 'staven van de handel (zaagplan) en beslag', kol: [{ t: 'Onderdeel', w: 4 }, { t: 'Aantal', w: 2.2 }, { t: 'Prijs', w: 1.3, n: 1 }, { t: 'Bedrag', w: 1.3, n: 1 }, { t: 'Bron', w: 3.4, k: 1 }],
    rijen: [...koop, { c: ['Totaal profielen in hele staven', '', '', eur(z.totaal), ''], soort: 'tot' }],
    noot: o.sys.koop ? (o.sys.alu ? 'De kostprijs rekent de aluminiumprofielen per meter + 10 % zaagverlies; de bestelwaarde in hele staven staat hier ter info.' : 'De kostprijs rekent de koopprofielen in hele staven, zoals hier.') : 'De kostprijs rekent de staven per meter uit de zaaglijst + 10 % zaagverlies; de bestelwaarde in hele staven staat hier ter info.' });
  // 3. uren x uurloon
  delen.push({ id: 'arbeid', titel: 'Uren x uurloon', sub: `${eur(uurloon)} per uur`, kol: [{ t: 'Stap', w: 4.5 }, { t: 'Proces', w: 2.5 }, { t: 'Uren', w: 1, n: 1 }, { t: 'Bedrag', w: 1.4, n: 1 }],
    rijen: [...k.stappen.map((x) => ({ c: [x.titel + (x.apart ? ' (apart, niet in de prijs)' : ''), x.proces ?? '', g(x.uren, 2), eur(x.uren * uurloon)], soort: x.apart ? 'apart' : '' })),
      { c: [`Arbeid ${g(k.uren, 2)} u x ${eur(uurloon)}`, '', g(k.uren, 2), eur(k.arbeid)], soort: 'tot', id: 'arbeid' }] });
  // 4. marge en verkoopprijs
  delen.push({ id: 'verkoop', titel: 'Marge en verkoopprijs', kol: [{ t: 'Wat', w: 5 }, { t: 'Bedrag', w: 1.5, n: 1 }],
    rijen: [['Kostprijs', eur(k.kostprijs)], [`Marge ${marge} %`, eur(k.verkoop - k.kostprijs)],
      { c: [`Verkoop excl. btw (${pl.inbegrepen ? 'geplaatst' : 'zonder plaatsen'})`, eur(k.verkoop)], soort: 'tot', id: 'verkoop' },
      ['Btw 21 %', eur(k.verkoop * 0.21)], { c: ['Verkoop incl. btw', eur(k.verkoop * 1.21)], soort: 'tot', id: 'incl' },
      ...(pl.inbegrepen ? [] : [{ c: [`Plaatsen, apart (${g(pl.uren, 1)} u), verkoop excl. btw als de klant het vraagt`, `+ ${eur(pl.verkoop)}`], soort: 'apart' }])] });
  // 5. de markt: dezelfde tabel als vroeger Ter vergelijking
  delen.push({ id: 'markt', titel: 'Ter vergelijking', sub: MARKTBAND[mat].tekst, kol: [{ t: 'Verkoopprijs elders', w: 4.5 }, { t: 'Excl. btw', w: 1.3, n: 1 }, { t: 'Plaatsen', w: 1.8 }, { t: 'Bron', w: 3, k: 1 }],
    rijen: [...MARKT.filter((m) => m.mat === mat).map((m) => [m.wat, eur0(m.prijs), m.montage ? 'inbegrepen' : 'niet inbegrepen', m.bron]),
      { c: ['Deze deur', eur0(k.verkoop - (pl.inbegrepen ? pl.verkoop : 0)), `niet inbegrepen (+ ${eur0(pl.verkoop)})`, `marge ${marge} %`], soort: 'tot', id: 'markt' }] });
  // 6. tarieven en materiaalprijzen die deze deur gebruikt
  const eigen = (sleutel, v) => (typeof std[sleutel] === 'number' && Math.abs(std[sleutel] - v) > 0.004 ? 'eigen prijs (instellingen)' : '');
  const t = [['Uurloon', `${eur(uurloon)}/u`, 'instellingen'], [`Marge ${mat === 'alu' ? 'aluminium' : 'staal'}`, `${marge} %`, 'instellingen']];
  for (const prof of new Set([...L.zaag.map((r) => r.prof), ...z.profielen.map((p) => p.prof)])) { const x = STAAF[prof]; if (x) t.push([x.naam, `${eur(x.prijs)}/m`, eigen(`staaf.${prof}`, x.prijs) || x.bron]); }
  const gl = PRIJS.glas[kk.glas] ?? PRIJS.glas.helder;
  t.push([`Glas ${gl.naam}`, `${eur(gl.v)}/m²`, eigen(`glas.${kk.glas}`, gl.v) || gl.bron]);
  if (o.opbouw === 'dubbel') t.push(['Dubbel glas: meerprijs', `${eur(PRIJS.dubbelGlas.v)}/m²`, eigen('dubbelGlas', PRIJS.dubbelGlas.v) || PRIJS.dubbelGlas.bron]);
  t.push([`Scharnier ${sch.naam.replace(/^Pivot: |^Verdekt: /, '')}`, eur(sch.v), eigen(`scharnier.${sk}`, sch.v) || sch.bron]);
  if (L.laser.length) t.push(['Lasersnijden', `${eur(PRIJS.laserPerKg.v)}/kg + ${eur(PRIJS.laserPerDeel.v)}/deel`, eigen('laserPerKg', PRIJS.laserPerKg.v) || PRIJS.laserPerKg.bron]);
  if (o.sys.alu) t.push(['Poedercoaten aluminium (volle staven)', `${eur(PRIJS.poedercoatAlu.v)}/m²`, eigen('poedercoatAlu', PRIJS.poedercoatAlu.v) || PRIJS.poedercoatAlu.bron]);
  else if (kk.afwerking === 'natlak') t.push(['Natlak (primer + 2K)', `${eur(PRIJS.natlakPerM2.v)}/m²`, eigen('natlakPerM2', PRIJS.natlakPerM2.v) || PRIJS.natlakPerM2.bron]);
  else if (!o.sys.gecoat) t.push(['Poedercoaten + stralen staal', `${eur(PRIJS.poedercoat.v)} + ${eur(PRIJS.stralen.v)}/m², min. ${eur(PRIJS.coatMin.v)}`, eigen('poedercoat', PRIJS.poedercoat.v) || PRIJS.poedercoat.bron]);
  if ((RAL.find((c) => c.code === kk.ral) ?? {}).metallic) t.push(['Metallic RAL: meerprijs', `${g(PRIJS.metallic.v * 100)} %`, PRIJS.metallic.bron]);
  t.push(['Kit, blokjes, schroeven + schijven', eur(PRIJS.klein.v + PRIJS.schijven.v), 'schatting']);
  delen.push({ id: 'tarieven', titel: 'Tarieven en materiaalprijzen', sub: 'gebruikt voor deze deur, excl. btw', kol: [{ t: 'Wat', w: 3.6 }, { t: 'Prijs', w: 2.4, n: 1 }, { t: 'Bron en datum', w: 5, k: 1 }], rijen: t,
    noot: 'Materiaalprijzen opgezocht op 10-11-2026, marktprijzen op 12-11-2026; de datum per bron staat erbij waar de bron er een geeft. "schatting" = geen publieke prijs gevonden: vraag een offerte.' });
  return {
    kleur: mat === 'alu' ? '#2563a8' : '#c2410c', product: mat === 'alu' ? 'Taatsdeur · aluminium' : 'Taatsdeur · staal',
    titel: `${meta.nr} ${s.naam}`, sub: `${o.sys.naam}, opening ${o.B} x ${o.H} mm, ${o.vleugels.length} vleugel${o.vleugels.length > 1 ? 's' : ''}${pl.inbegrepen ? ', met plaatsen' : ', zonder plaatsen'}`, datum: meta.datum,
    kern: [{ t: 'Kostprijs', v: eur(k.kostprijs), id: 'kostprijs' }, { t: `Verkoop excl. btw (${marge} %)`, v: eur(k.verkoop), id: 'verkoop', hoofd: true }, { t: 'Verkoop incl. 21 % btw', v: eur(k.verkoop * 1.21), id: 'incl' }, { t: pl.inbegrepen ? 'Plaatsen' : 'Plaatsen, apart', v: pl.inbegrepen ? 'inbegrepen' : `+ ${eur0(pl.verkoop)}`, id: 'plaatsen' }],
    delen, voet: 'Alle bedragen excl. btw tenzij anders vermeld. Prijzen met een bron; de eigen prijzen komen uit de instellingen.',
  };
}
