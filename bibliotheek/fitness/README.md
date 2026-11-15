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
| `pro.mjs` | pro-uiterlijk per soort: stijl, ovaalbuis, logoplaat, stapelkap met venster, katrol- en naafkappen, touch points |
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

## Versie 3: de adviezen van Fable 5.2 (2026-11-15)

Alle 40 bevindingen uit [docs/Advies-Fable-5.2.md](docs/Advies-Fable-5.2.md) zijn nagelopen. De belangrijkste wijzigingen:

- **Rekken:** J-cup als U-beugel met pen door beide wanden (S355); safety als pin-pipe (stang door alle vier de wanden, buis
  erover, borgveer); spotterarm met U-beugel, 2 pennen en een haaklip achter de staander.
- **Hefboom-bouwsteen:** as als staaf (stuklijst), naaf met eindschijven en spanstift, flensglijlagers in lagerbussen op
  de oren, stelringen, begin- en eindaanslag (nok op de as tegen rubberbuffers), schetsplaten aan de voet.
- **Slede (leg press, hack squat):** tegenrollen onder de rail, veiligheidsgrendel (getande strip, pallen, hendels),
  noodstop, ribben achter de voetplaat; Smith met draaibare stang in lagerblokken, haken op een haakstrip, stopringen;
  belt squat met de hefboom tussen de voeten en de schijven vóór het platform.
- **Kabel:** functional trainer en kabeltoren met een gesloten lus (kabellengte constant over de verstelweg), dubbele
  zwenkkatrol; beenmachines met een as Ø40 in twee lagerhuizen en een nok R200; lat pulldown met één kabel en een losse
  katrol (2:1); stapel met lagerbussen, klemblokken, bussen in de platen en de echte massa in de kabelcontrole; kabel Ø6
  op lengte met geperste eindstukken; diepe voeten en een kantelcontrole onder horizontale trek.
- **Berekening en controles:** evenwicht van losse haken, pen op buiging, as op buiging, plaat tussen ribben, slede-evenwicht,
  horizontale trek, netto doorsnede, vermoeiing, verwisselbare pennen, knelpunten gemeten over de slag, anker per ondergrond,
  boutlengte per verbinding met afstandsbussen, steek tussen boutgaten, boutgaten Ø14/Ø18.
- **Tekeningen:** lassamenstelling per lasgroep (positienummers, plaatsmaten vanaf R, diagonaal, lassymbolen), stukbladen
  met Ø bij het gat, dwarsmaat, tolerantie, passing en verstek; titelblok met getekend/goedgekeurd/documentsoort.
- **Typeplaatje en dossier:** "ontworpen volgens" en "PROTOTYPE: proeflast nodig"; technisch dossier met een proeflasttabel.
- **Prijzen:** realistischere uren (0,12 u per lasverbinding, leercurve stuk 1/5/20), overhead (lakkerij, transport,
  verpakking, handleiding, mallen, garantie, verzekering); het uurloon blijft een instelling (standaard € 45).
- **Web:** badge "berekend" (geen "voldoet"), klantweergave met `?klant` (zonder werkplaats en kostprijs), open punten per
  toestel in de werkplaats.

Elke P1 heeft een test met een negatieve proef (`src/qa/qaFitness.test.ts`, blok "Fable 5.2").

## Versie 4: de deels-punten van Fable 5.2 afgewerkt (2026-11-15)

FB-12 op de hefboom-bouwsteen; pec deck 40 % (nok R100, kussen op 250 mm); lat pulldown met verstelbare zitting;
row met de schijfhouder op een tak (± 350 mm achter de as, boven de ellebogen); zijstroken aan de stapelafscherming;
controles op sleutelruimte, gaten in gezette delen en bouten op trek en trek + afschuiving; DXF per plaat en laserdeel
(`dxf.mjs`, downloads in de werkplaats); halve V (flare) als lassymbool; een lassamenstellingsblad per lasgroep;
montageset, kabelgeleiders en traanplaat in de bestellijst.

## Versie 5 fase A: pro-uiterlijk (2026-11-15)

Ian: "Nu zien ze er nog echt te selfmade uit en niet zoals pro toestellen." Per soort een stijl (`pro.mjs`, `STIJL`),
gebaseerd op de vormtaal van merktoestellen zonder hun logo's of ontwerpen na te maken:

- **Rekken** (zoals Rogue/Eleiko): mat zwart (RAL 9005), gelaserde logoplaat 3 mm op de bovenligger, gatnummers naast de
  Westside-gaten, UHMW in de J-cups, eindkappen.
- **Plate-loaded** (zoals Hammer Strength): hefboomarmen in vlakovaalbuis (thuis 100x50x3, pro 120x60x4; de berekening
  volgt het profiel), zwart frame, naafkappen Ø90 in de accentkleur (rood) op de draaipunten, verchroomde schijfhouders.
  Het portaal van de iso-machines staat hoger als de arm hoger is (spleet arm-ligger ≥ 25 mm).
- **Kabel/selectorized** (zoals Life Fitness/Technogym): antraciet frame (RAL 7016), zilveren stapelkap (gezet plaatwerk
  1,5 mm) met kijkvenster in polycarbonaat en een sleuf voor de selectiepen, instructieplaat op de kap, ABS-katrolkappen.
- **Overal:** knop van elke popper-pin en selectiepen in de accentkleur, verborgen rubbervoeten, kussens met bies en
  bekleed multiplex, grepen met eindkap, instructieplaat (oefeningen, spieren) naast het typeplaatje.
- **Weergave** (`scene3d.mjs`): poedercoat met korrel en toplaag, chroom, leer met nerf (PBR), studiolicht (sleutel-,
  vul- en strijklicht) met omgevingsreflectie, zachte schaduwen, ambient occlusion (GTAO, zonder als de GPU het niet kan),
  hoekloze studiovloer, camera die het toestel vult.
- Alles staat in de stuklijst, de DXF, de bestellijst en de prijs: logoplaat (laserdeel, VHB-tape, geen gaten),
  vlakovaalbuis (prijs per kg x 1,5, AANNAME), eindkap ovaal, katrolkap, naafkap, polycarbonaat, verchromen,
  instructieplaat. De nieuwe kooponderdelen zijn AANNAME (prijs nog op te vragen).

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
