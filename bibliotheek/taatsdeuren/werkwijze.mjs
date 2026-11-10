// Werkwijze en uren van een taatsdeur (deuren.mjs): de stappen om hem zelf te maken met een lastafel, MIG/MAG en TIG,
// en het aantal uren per stap (voor de kostprijs). De uren zijn ervaringswaarden voor één lasser en instelbaar (UREN).
import { lijsten, lengte } from './deuren.mjs';

/** uren per handeling (instelbaar in de configurator) */
export const UREN = {
  voorbereiden: 0.5, // tekening lezen, materiaal klaarleggen
  zaagPerStuk: 0.06, // zagen, ontbramen, merken (verstek iets langer)
  opspannen: 0.6, // per vleugel / zijlicht: mal en klemmen op de lastafel
  hoekTig: 0.3, // verstekhoek: hechten, TIG doorlassen, vlak slijpen
  tVerbinding: 0.15, // roede op het kader of op een roede: hechten, MIG/TIG, slijpen
  boogVerbinding: 0.25, // boog op een staander of kalf: passen, hechten, lassen
  boogLagenPerM: 0.6, // boog van het kader: 4 lagen op elkaar lassen en vlak slijpen, per meter
  latPerM: 0.12, // glaslat of lat op de roede: hechten om de 150, per meter
  tappenPerGat: 0.03, // M4 tappen voor de losse latten
  taatsplaten: 0.6, // taatsplaten inlassen en boren, greephouders
  richten: 0.5, // per vleugel: richten op de lastafel, vlakheid nameten
  coatKlaar: 0.8, // ontvetten, maskeren, naar de coater (poedercoat)
  natlakken: 3.0, // zelf: ontvetten, primer, 2 lagen 2K, droogtijd niet meegeteld
  glasPerRuit: 0.35, // ruit plaatsen, kitten, latten schroeven
  paneel: 0.6, // stalen paneel passen, in het midden van de diepte hechten, rondom lassen en slijpen
  plaatsen: 3.0, // kozijn stellen en verankeren, taatspot boren en stellen, deur hangen (budget)
  plaatsenPremium: 4.0, // idem met FritsJurgens (frezen van de pot, afstellen)
};

/** aantal verbindingen en lengtes uit het ontwerp */
export function telling(o) {
  const L = lijsten(o);
  const alle = [...o.vleugels, ...o.vast];
  let hoeken = 0, tees = 0, boogV = 0, boogKaderM = 0;
  for (const v of o.vleugels) hoeken += v.delen.filter((d) => d.soort === 'kader').length; // 4 hoeken bij 4 kaderdelen
  hoeken += o.kozijn.delen.filter((d) => d.soort === 'kozijn' && d.a && Math.abs(d.a[1] - d.b[1]) < 1e-6).length * 2; // regel van het kozijn: 2 hoeken
  for (const v of alle) for (const d of v.delen) {
    if (d.soort === 'roede') tees += 2;
    if (d.soort === 'boog') boogV += 2;
    if (d.soort === 'boogkader') { boogV += 2; boogKaderM += lengte(d) / 1000; }
  }
  for (const d of o.kozijn.delen) if (d.soort === 'boogkozijn') { boogV += 2; boogKaderM += lengte(d) / 1000; }
  const latM = L.zaag.filter((r) => /lat/.test(r.wat)).reduce((s, r) => s + (r.l / 1000) * r.n, 0) + L.laser.filter((r) => /lat/.test(r.wat)).reduce((s, r) => s + ((r.hoek * Math.PI) / 180) * r.r / 1000 * r.n, 0);
  const stukken = L.zaag.reduce((s, r) => s + r.n, 0);
  const ruiten = alle.reduce((s, v) => s + v.ruiten.length, 0), panelen = alle.reduce((s, v) => s + (v.panelen?.length ?? 0), 0);
  return { hoeken, tees, boogV, boogKaderM, latM, stukken, ruiten, panelen, gaten: Math.ceil((latM * 1000) / 2 / 250) };
}

/** de stappen met hun uren; keuzes: { scharnier: 'budget'|'premium', afwerking: 'poedercoat'|'natlak' } */
export function stappen(o, keuzes = {}, U = UREN) {
  const t = telling(o), nv = o.vleugels.length + o.vast.length, premium = keuzes.scharnier === 'premium', nat = keuzes.afwerking === 'natlak';
  const heeftBoog = t.boogV > 0;
  const S = [];
  const stap = (titel, uren, tekst, proces = '') => S.push({ titel, uren: Math.round(uren * 100) / 100, tekst, proces });
  stap('Voorbereiden en zagen', U.voorbereiden + t.stukken * U.zaagPerStuk,
    [`Zaag de ${t.stukken} stukken volgens de zaaglijst; kader en kozijn in verstek 45°, roeden recht. Ontbramen en elk stuk merken.`,
      heeftBoog ? 'Laat de bogen en de taatsplaten lasersnijden (DXF uit de configurator); controleer de straal met de mal 1:1.' : 'Laat de taatsplaten en greephouders lasersnijden of zaag ze uit platstaal.'].join(' '));
  stap('Kader opspannen op de lastafel', U.opspannen * nv,
    'Leg de kaderdelen op de lastafel en zet ze vast met haakse aanslagen en klemmen in het Ø28-raster. Meet de diagonalen (gelijk tot 1 mm) voor je hecht.');
  stap('Kader hechten en lassen', t.hoeken * U.hoekTig,
    `${t.hoeken} verstekhoeken: hecht binnen en buiten, las de zichtkant met TIG (ER70S-6 Ø1,6, 90-110 A) en de binnenkant met MIG/MAG (G3Si1 Ø0,8, 18 V, Ar/CO₂). Las beurtelings tegenover elkaar, zodat het kader vlak blijft. Slijp de zichtkant vlak (korrel 80, daarna een fiberschijf 120).`, 'TIG zichtkant · MIG binnen');
  if (t.tees) stap('Roeden plaatsen', t.tees * U.tVerbinding,
    `${t.tees / 2} roeden: leg de kern 20x10 op afstandsblokken zodat ze in het midden van de diepte ligt (glas in het midden). Hecht ze en las ze rondom met TIG; slijp ze vlak.`, 'TIG');
  if (heeftBoog) stap('Bogen inlassen', t.boogV * U.boogVerbinding + t.boogKaderM * U.boogLagenPerM,
    `${t.boogV / 2 === 1 ? "1 boog" : `${t.boogV / 2} bogen`}. Leg de lasergesneden boog op de mal 1:1 en hecht hem op de poten, het kalf of de staanders.${t.boogKaderM ? ` De boog van het kader en het kozijn bestaat uit lagen van 10 mm: klem de lagen op elkaar, hecht ze om de 100 mm en las de naden aan de buitenkant met MIG. Slijp ze daarna rond tot één geheel (${(Math.round(t.boogKaderM * 10) / 10).toString().replace('.', ',')} m boog).` : ''}`, 'TIG zichtkant · MIG lagen');
  if (t.panelen) stap('Paneel inlassen', t.panelen * (U.paneel ?? 0.6),
    `${t.panelen === 1 ? 'Het paneel' : `De ${t.panelen} panelen`} (plaat 3 mm, 1 mm kleiner dan het vak): leg ${t.panelen === 1 ? 'het' : 'ze'} op afstandsblokken van ${String((o.sys.kader.diepte - 3) / 2).replace('.', ',')} mm, zodat ${t.panelen === 1 ? 'het' : 'ze'} in het midden van de diepte ligt. Hecht om de 100 mm aan beide kanten en las beurtelings, kort (MIG, 17 V), zodat de plaat niet trekt. Slijp de zichtkant vlak.`, 'MIG');
  stap('Taatsplaten en greephouders', U.taatsplaten * o.vleugels.length,
    `Las de taatsplaat onder in de onderregel en de taatsplaat boven in de bovenregel. Leg ze op het hart van de taatsas: ${'100'} mm uit de scharnierkant. Boor en tap de gaten volgens het scharnier. Las 2 greephouders op de staander aan de sluitkant (hart 20 uit de rand).`, 'MIG');
  stap('Glaslatten en latten op de roeden', t.latM * U.latPerM + t.gaten * U.tappenPerGat,
    `Hecht de vaste latten aan de voorkant om de 150 mm (${(Math.round(t.latM * 10) / 10).toString().replace('.', ',')} m lat). Boor de losse latten aan de achterkant Ø3,3 en verzink ze. Tap in de kern en het kader M4 om de 250 mm (${t.gaten} gaten).`, 'TIG punten');
  stap('Richten en nameten', U.richten * nv, 'Meet de vlakheid op de lastafel (ten hoogste 2 mm over de hoogte) en de diagonalen. Richt zo nodig koud of met een kleine vlam. Breek alle randen.');
  if (nat) stap('Zelf natlakken', U.natlakken, 'Ontvetten met siliconenverwijderaar, 2K-epoxyprimer, 2 lagen 2K-PU-lak zwart mat. Laat 24 uur drogen voor het glazen.');
  else stap('Klaarmaken voor de coater', U.coatKlaar, 'Ontvetten, de getapte gaten afstoppen (siliconenpluggen), merken. Laten stralen (SA 2½) en poedercoaten in RAL 9005 structuur.');
  stap('Glazen', 0.5 + t.ruiten * U.glasPerRuit,
    `${t.ruiten} ruiten 44.2. Leg glasblokjes (3 mm) onder elke ruit, kit tegen de vaste lat (transparante glaskit), zet de losse latten met M4 verzonken RVS.`);
  stap('Plaatsen', premium ? U.plaatsenPremium : U.plaatsen,
    `Stel het kozijn waterpas en loodrecht in de opening en veranker het (6 x 8 mm). Boor de taatspot in de vloer op het hart van de as, monteer de bovenpen in het kozijn, en hang en stel de deur. ${premium ? 'FritsJurgens: volgens de handleiding van het systeem frezen en de demping instellen.' : 'Budgetscharnier: de stelschroef op 1-2 mm speling onder de deur.'}`);
  return S;
}
