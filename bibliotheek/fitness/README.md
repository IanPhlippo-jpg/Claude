# Bibliotheek: fitnesstoestellen (2026-11-15)

Het derde product voor Ians laswerkbedrijf, opgebouwd zoals de [balustrades](../balustrades/README.md) en de
[taatsdeuren](../taatsdeuren/README.md). Het is een vaste catalogus van 50 fitnesstoestellen die Ian zelf kan maken.
Elk toestel heeft een thuisversie (EN ISO 20957 klasse H) en een proversie (klasse S), met het volledige
werkplaatspakket.

- Eisen en keuzes: [EISEN.md](EISEN.md).
- Normwaarden en bronnen: [docs/Normen-en-bronnen.md](docs/Normen-en-bronnen.md).
- Kooponderdelen met winkel en prijs: [docs/Kooponderdelen.md](docs/Kooponderdelen.md).
- Marktprijzen naast onze prijzen: [docs/Marktprijzen.md](docs/Marktprijzen.md).

## De catalogus

| Soort | Toestellen |
|---|---|
| **Rekken en racks** (FR-01 .. FR-14) | power rack, half rack, squat stands, opklapbaar wandrek, squat rack met optrekstang, optrekstang voor de muur, dipstation, schijvenboom, schijvenrek op wielen, dumbbellrek, stangenhouder, stangenrek voor de muur, kettlebellrek, landmine |
| **Banken** (FB-01 .. FB-12) | vlakke bank, verstelbare bank (FID), bankdrukstation vlak en schuin, schouderdrukbank, zitbank 90°, preacher curl, hyperextension 45°, GHD, buikbank, hip thrust bank, reverse hyper |
| **Kabelmachines** (FK-01 .. FK-12) | lat pulldown, seated row, crossover, functional trainer (2:1), kabeltoren (2:1), lat met schijvenlader, katrolset voor het rack, leg extension, leg curl, pec deck, wandkatrol, glute kickback |
| **Plate-loaded** (FP-01 .. FP-12) | leg press 45°, hack squat, belt squat, chest press, seated row, T-bar row, seated calf, pulldown, schouderpers, hip thrust, smithmachine, leg extension/curl |

**Thuis en pro.** Dezelfde vorm, maar de proversie heeft:
- zwaardere profielen (60x60x3 wordt 80x80x4, banken 80x40x3 wordt 100x50x3);
- dikkere platen (8 wordt 10 mm, voetplaten 12 mm);
- pennen Ø25 in gaten Ø26 in plaats van Ø16 in Ø17;
- aluminium katrollen Ø115 en kabel Ø6;
- een stapel van 100 kg in plaats van 80 kg;
- igus-glijbussen, kunstleer van 150.000 Martindale en M16-bouten;
- een gebruiker tot 150 kg in plaats van 120 kg;
- hogere proeflasten (klasse S).

**Elk toestel heeft:**
- uitleg, spieren en oefeningen;
- buitenmaten en vloeroppervlak;
- gewicht en de maximale last;
- 3D (three.js) met de schijven en de stang als voorbeeld;
- de RAL-kleur van het frame en de kleur van de bekleding.

## Werkplaatspakket per toestel

**Bladen (SVG):**
- overzicht A3 in eerste hoekprojectie (vooraanzicht, linkerzijaanzicht rechts, bovenaanzicht onder) met de hoofdmaten,
  de isometrie en de gegevens;
- stuklijst (ISO 7573);
- lasdetails (ISO 2553, met de lijst van alle lassen per paar posities);
- boringen, met de Westside-boormal (50 mm, 25 mm in de bankzone van 400-1000 mm);
- kabelschema met de katrollen, de kabelloop, de lengte en de overbrenging 1:1 of 2:1;
- bekledingsblad met multiplex, schuim, snijmaat van het leer en inslagmoeren;
- bestellijst met het zaagplan op staven van 6 m, de grove plaatnesting (3000 x 1500) en de kooponderdelen per winkel;
- montage per verbinding: bout, pen, anker, katrol in de beugel en kussen op het frame. Op de pagina in 3D met een
  schuif om uit elkaar te halen, plus een A4-blad;
- een A4 per stuk: lengte, zaagsnede, gaten en de doorsnede.

**Berekening** (`bereken.mjs`). Elke controle heeft een formule, een bron en een oordeel: groen ≤ 90 %, oranje tot
100 % of een aanname, rood daarboven. De controles:
- proeflasten volgens EN ISO 20957-1/-2/-4: intrinsiek 2,5 x, extrinsiek (Gk + 1,5 G) x 2,5, plate-loaded S x (Wp + 1,5 Fa),
  schijfhouders 4/6 x, vanghaken 4/6 x;
- buiging, doorbuiging en knik van de belangrijkste ligger, uitkrager of staander;
- de lassen aan de voet;
- pennen en bouten op afschuiving en stuik;
- de staalkabel met factor 6;
- de katrollen (belasting en D/d ≥ 18);
- de vingerbescherming onder 1800 mm;
- de afscherming van de gewichtstapel;
- de knelpunten;
- de stabiliteit op een helling van 10° per belastinggeval, of de verankering.

Niets staat op rood. Oranje staat er bij:
- aannames die je ter plaatse moet nakijken (ankers, knelpunten van de hefbomen);
- stukken die op 90-100 % benut zijn.

**Kostprijs en verkoop** (`prijzen.mjs`, `werkwijze.mjs`). De kostprijs bestaat uit:
- staal per kg (staven + 15 % afval);
- laserdelen per kg;
- de gewichtstapel;
- poedercoat per m²;
- kooponderdelen;
- bekleding;
- uren per werkstap: zagen, boren, lassen per verbinding en per meter, afwerken, coaten, stapel, bekleding, kabel,
  montage en controle.

Daar komt de marge per soort bij, met extra marge voor de proversie. De verkoopprijs incl. btw staat naast de marktband
van het toestel.

**Downloads** (gepubliceerde pagina, `downloads`-capability):
- het dossier (HTML: A4 met prijs, kostprijs, werkwijze en berekening, daarna alle bladen);
- alle tekeningen (SVG in een ZIP, met de lijsten als CSV);
- de lijsten (CSV).

## Gebruiken

**Catalogus** (`web/index.html` met de modules in `js/`) heeft vier pagina's:
- **Catalogus:** raster met alle toestellen (miniatuur, nummer, soort, thuis- en proprijs, maten). Je kunt zoeken en
  filteren op soort, versie, vloeroppervlak en maximale prijs.
- **Toestel**, voor de klant: 3D of drie aanzichten, uitleg en oefeningen, keuze thuis/pro, RAL-kleur en bekleding,
  maten, het oordeel over de veiligheid in één zin, en de prijs met de marktmeter. Hier staan geen werkplaatsbladen.
- **Werkplaats:** de berekening, alle bladen, montage per verbinding, stuk per stuk, de kostprijs met de werkwijze, de
  bestellijst en de downloads.
- **Instellingen:** uurloon, marge per soort, extra marge pro, staal-, laser-, stapel- en coatprijs, afval, uren per
  werkstap en de prijs van elk kooponderdeel. Ze worden bewaard op het account (gepubliceerd) of in de browser.

**Presentatie voor klanten:** `presentatie/uit/Fitnesstoestellen.html`, één bestand dat zonder internet werkt. Een kopie
staat op het bureaublad in `Fitnesstoestellen/` met een LEESMIJ.

## Maken en testen

```bash
node bibliotheek/fitness/maak-web.mjs <map>            # index.html + js/ (met js/balustrades en js/taatsdeuren)
node bibliotheek/fitness/maak-presentatie.mjs [map]    # presentatie/uit/Fitnesstoestellen.html (esbuild, three gebundeld)
npx vitest run src/qa/qaFitness.test.ts                # 826 tests, ± 4 s (ook in npm run test:voorbeelden)
npm run typecheck
```

De test bouwt elk toestel in de thuis- en de proversie en controleert:
- geen NaN;
- elk stuk is langer dan 0 en past op 6 m;
- de gaten liggen binnen het stuk;
- de stuklijst, het zaagplan en de nesting tellen op tot het model;
- elke controle heeft een oordeel en niets staat op rood;
- kabelmachines hebben een gesloten kabelloop (stapel, anker, slede of laadpen → katrollen → greep of nok) en een
  overbrenging 1:1 of 2:1 (met een losse katrol);
- de prijs ligt in de band of er staat een melding;
- alle bladen zijn geldige SVG met een titelblok;
- geen rechte hoofdstukken die in elkaar steken (AABB, 0,5 mm speling);
- geen zwevende onderdelen: alles hangt samen met de vloer, de muur of het rack.

## Bestanden

| Bestand | Wat |
|---|---|
| `onderdelen.mjs` | profielen (A, I, W uit de maten), de twee versies, kooponderdelen met winkel, prijs en bron, soorten, kleuren |
| `normen.mjs` | normwaarden met bron (EN ISO 20957-1/-2/-4, EN 957-1, EN 1993-1-8) |
| `model.mjs` | de bouwtaal (staaf, plaat, koop, kussen, katrol, kabel met raakpunten, stapel, bout, pen), lassen, eindkappen, massa |
| `bouwstenen.mjs` | staander, ligger (gelast of met flenzen gebout), J-hook, safety, schijfhouder, kussen, katrolbeugel |
| `rekken.mjs`, `banken.mjs`, `kabel.mjs`, `plate.mjs` | de 50 toestellen |
| `catalogus.mjs` | alle toestellen en `toestel(id, versie, { stand })`; stand 0..1 = de stand van de beweging |
| `controle.mjs` | de controles: botsingen (OBB), zwevende delen, kabelloop, ergonomie, schijven vrij, gatfouten, Westside snoeien |
| `detail.mjs` | afwerkdetails voor 3D en bladen: gaten, eindkappen, grips, kartel, glijlagers, assen met borgring, naden, typeplaatje |
| `bereken.mjs` | de berekening en de stabiliteit |
| `stuklijst.mjs` | posities, kooponderdelen, bekleding, zaagplan, nesting, totalen |
| `werkwijze.mjs`, `prijzen.mjs` | uren per stap, kostprijs, verkoop en marktband |
| `aanzicht.mjs` | projecties zonder three (eerste hoek en iso), miniaturen |
| `tekeningen.mjs`, `blad.mjs` | alle bladen (titelblok ISO 7200, eerste hoek ISO 5456-2, ISO 129, 2553, 7573) |
| `montage.mjs` | scènes per verbinding en het A4-montageblad |
| `scene3d.mjs` | de 3D (three.js) |
| `dossier.mjs` | dossier (HTML) en CSV |
| `web/index.html` | de catalogus |
| `presentatie/` | de klantversie (één bestand) |
| `*.d.mts` | types voor de test |

## Versie 2: controles op elk toestel (2026-11-15)

Elk toestel wordt in de thuis- en de proversie en in 5 standen van de beweging (0, 25, 50, 75 en 100 %) gecontroleerd
(`controle.mjs`, test `src/qa/qaFitness.test.ts`):

- **Botsingen:** elk stalen deel en elk kussen als georiënteerde doos (scheidende-assenstelling); gelaste paren en delen
  die in elkaar schuiven (as in een bus) tellen niet. De schijven (Ø450) mogen nergens door het staal.
- **Samenhang:** alles hangt via lassen, bouten of contact aan de vloer, de muur of het rack, ook de bewegende delen.
- **Kabelloop:** elke katrol in het vlak van de kabel (|n·as| ≤ 0,2), tussen twee beugelplaten, geen kabelstuk door een
  profiel tenzij door een kabelgat Ø ≥ 15.
- **Bereik (1,60 - 1,95 m):** zitting 380-600 mm, vlak bankkussen 400-480 mm, grepen en stangen 250-2450 mm,
  schijfhouders ≤ 1800 mm.
- **Gaten** (zie [docs/Normen-en-bronnen.md](docs/Normen-en-bronnen.md#gaten-en-boutverbindingen)): elke bout en pen
  gaat door een gat op dezelfde as (≤ 0,5 mm) in elk stuk dat hij kruist, met de juiste speling; randafstand,
  hoekradius, brug en lasband. Een negatieve proef in de test bewijst dat de controle echte fouten vindt.

De bladen tonen elk gat met een ordinaatmaat en een boortabel per stuk (Ø, aantal, vlak, wanden, doel); het boorblad
geeft per stuk het doel van elk gat (bout, pen, glijlager, Westside, vrij) en de uitkomst van de gatcontrole. Er is een
blad voor het typeplaatje (EN ISO 20957-1) en het lasblad heeft een lasplan met een merkteken op elke las.

## Wat nog open is

- **Normen:** drie punten konden niet in een publieke bron nagekeken worden. Ze staan als AANNAME in de berekening; koop
  EN ISO 20957-1/-2/-4 bij NBN.
  - de hellingshoek van de stabiliteitsproef;
  - de afscherming van de gewichtstapel volgens 2020/2024;
  - of J-hooks en safety's onder de factor 4/6 vallen.
- **Prijzen:** de thuisversie van eenvoudige rekken en banken ligt boven de importprijzen (Gorilla, Taurus). Zie
  [docs/Marktprijzen.md](docs/Marktprijzen.md) voor wat je eraan kunt doen.
- **Kooponderdelen:** een deel van de prijzen is AANNAME (zie de lijst). Losse gewichtstapelplaten zijn niet te koop:
  laat ze lasersnijden.
- **Geometrie:** de toestellen zijn vereenvoudigd (kokers met hoekradius alleen in de 3D; gaten in de 3D als donkere
  schijf op het wandvlak, niet als echte boring). Knelafstanden (9,5-25 mm) nameten op het eerste toestel.
  - J-hooks en hefbomen zijn dozen, geen gebogen vormen.
  - Schuine stukken worden niet in de montage-3D getoond.
  - De verstelbare delen staan in één stand: bank op 30°, wagen op 1200 mm.
  - De wagen van de functional trainer heeft in werkelijkheid een kabelcompensatie (2 katrollen). Die is als opmerking
    aangegeven, niet getekend.
- **Eerste toestel:** maak per soort één toestel en meet de knelpunten, de vrije afstanden van de hefbomen en de
  doorbuiging na voor je in serie gaat.
