// Normwaarden voor de fitnesstoestellen met hun bron. EN ISO 20957 is betalend: de waarden komen uit de gratis
// voorbeelden (iTeh), testrapporten die de clausules letterlijk citeren en de oude EN 957. Wat niet in een publieke bron
// stond, staat als AANNAME. Zie docs/Normen-en-bronnen.md voor de links. Node en browser.
const A = 'ISO 20957-1:2024, voorbeeld (iTeh, cdn.standards.iteh.ai/samples/81908)';
const B = 'EN ISO 20957-1:2013 zoals geciteerd in het V-Trust-testrapport (align-pilates.com) en het TÜV-rapport (levarecura.nl)';
const D = 'ISO 20957-2:2020, voorbeeld (iTeh, samples/77100) §5.3.2';
const F2005 = 'ISO 20957-2:2005, voorbeeld (iTeh, samples/39904) §5.4';
const G = 'EN 957-1:1996+A1 (volledige tekst, oud)';
const H4 = 'ISO 20957-4:2016, voorbeeld (iTeh, samples/66870) en samenvatting fitgearsource.com';
const EC = 'EN 1993-1-8 (Eurocode 3, verbindingen); ArcelorMittal Orange Book';

export const NORM = {
  gebruikerMin: { v: 100, bron: `${A} §3.6: maximale gebruikersmassa uit de handleiding of 100 kg, de grootste` },
  intrinsiek: { v: 2.5, bron: `${B} §5.14.1/6.16: F = 2,5 x lichaamsmassa, 5 min, op 300 x 300 mm; daarna niet gebroken en nog werkend` },
  extrinsiek: { v: 2.5, dyn: 1.5, bron: `${B} §5.14.2: F = (Gk + 1,5·G) · 2,5 · 9,81 N, 5 min (Gk = lichaam op de steun, G = maximale trainingslast)` },
  plateLoaded: { H: 2.5, S: 4, bron: `${D}: F = S·(Wp + 1,5·Fa), S = 4 (klasse S/I) of 2,5 (klasse H), Wp = 100 kg of de maximale gebruikersmassa` },
  schijfhouder: { H: 4, S: 6, bron: `${D}: plaathouder voor training 6x (S/I) of 4x (H) de maximale last` },
  opslagpen: { H: 2.5, S: 4, bron: `${D}: opslagpen voor schijven 4x (S/I) of 2,5x (H)` },
  vanghaak: { H: 4, S: 6, bron: `${D} §5.3.2.5: vanghaken bij geleide toestellen 6x (S/I) of 4x (H); voor de J-hooks en safety's van een rack AANNAME dezelfde factor (ISO/FDIS 20957-2:2024 noemt het 'rack station')` },
  kabel: { v: 6, bron: `${B} §5.6.1/6.6: veiligheidsfactor 6 op de maximaal mogelijke trekkracht van kabels, riemen en hun bevestiging` },
  katrolD: { v: 18, bron: `${G} §5.5.2: katrol ≥ 18 x de kabeldiameter (de huidige norm verwijst naar de kabelfabrikant; ter vergelijking)` },
  knelVrij: { v: 60, vinger: 25, spleetMin: 9.5, spleetMax: 25, zone: 1800, bron: `${B} §5.3.3/5.3.4/5.7: afgeschermd of ≥ 60 mm vrij (25 mm als alleen vingers gevaar lopen); een vaste spleet tussen 9,5 en 25 mm mag niet; zone tot 1800 mm` },
  katrolKap: { v: 1800, bron: `${B} §5.6.3/5.7: intrekpunten bij katrollen tot 1800 mm afschermen; kabelgeleiding tegen afspringen` },
  stapelKap: { opening: 75, vrij: 60, bron: `${F2005}: stapel ≥ 60 mm van onderdelen; klasse H omkasting of opening ≤ 75 mm; klasse S achter de gebruiker volledig omkast tot 60 mm boven het blok (AANNAME: in 2020/2024 gelijkaardig)` },
  stabiliteit: { v: 10, bron: `${B} §6.2.1: stabiel op een hellend vlak met een proefpersoon van 100 kg in de ongunstigste stand; AANNAME 10° in alle richtingen (EN 957-1:1996 §6.3: 10° in de bewegingsrichting, 5° in de andere)` },
  randen: { v: 2.5, bron: `${A} §5.3.2/5.3.3: lichaamsdragende randen r ≥ 2,5 mm, buisuiteinden afgesloten (dop ≥ 20 N uittrekkracht)` },
  doorbuiging: { ligger: 100, uitkrager: 150, bron: 'ISO 20957-2:2005 §5.2: doorbuiging ≤ L/100, uitkragers ≤ L/150 (AANNAME: als gebruiksgrens behouden)' },
  bankHaak: { lipMin: 20, lipMax: 40, achter: 80, bron: `${H4} §5.4: voorlip 20-40 mm (stang Ø30), achterkant ≥ 80 mm hoger dan de voorlip` },
  bankKantel: { H: 40, S: 50, bron: `${H4} §6.3: kantelen van de bank met vaste steunen: 40 kg (H) of 50 kg (S/I), of de helft van de maximale last` },
  duur: { H: 12000, S: 100000, bron: `${B} §6.12: duurproef 12 000 (H) of 100 000 cycli (S) bij maximale last` },
  // staal
  fy: { v: 235, bron: 'EN 10025-2 / EN 10219-1: S235JR(H), t ≤ 16 mm' },
  fu: { v: 360, bron: 'EN 10025-2 / EN 10219-1: S235JR(H)' },
  E: { v: 210000, bron: 'EN 1993-1-1 §3.2.6' },
  gM0: { v: 1.0, bron: 'EN 1993-1-1 §6.1 (NBN ANB: 1,0)' },
  gM1: { v: 1.0, bron: 'EN 1993-1-1 §6.1' },
  gM2: { v: 1.25, bron: `${EC}` },
  betaW: { v: 0.8, bron: `${EC} tabel 4.1: βw = 0,8 voor S235` },
  bout88: { fub: 800, av: 0.6, bron: `${EC} tabel 3.4: Fv,Rd = αv·fub·As / γM2, αv = 0,6 (8.8)` },
  pen: { bron: `${EC} §3.13 tabel 3.10: pen op afschuiving Fv,Rd = 0,6·A·fup / γM2` },
};
export const BRONNEN_NORM = { A, B, D, F2005, G, H4, EC };
