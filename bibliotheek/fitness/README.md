# Bibliotheek: fitnesstoestellen (2026-11-15)

Het derde product voor Ians laswerkbedrijf, opgebouwd zoals de [balustrades](../balustrades/README.md) en de
[taatsdeuren](../taatsdeuren/README.md). Het is een vaste catalogus van 150 fitnesstoestellen (50 in versie 1-4, 100 in versie 5 fase C) die Ian zelf kan maken.
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
| **Selectorized** (FS-01 .. FS-25) | nokstations (leg extension, leg curl, chest press, shoulder press, row, pec deck, abductor ...) en kabelstations (lat, row, high row, preacher, face pull ...) met eigen stapel en omkapte toren |
| **Multigyms en rigs** (FM-01 .. FM-25) | rigs met 1-4 vakken (vrijstaand of tegen de muur), monkey bars, ringen, dip, opslag; functional trainers met 2-3 torens |
| **Opslag en accessoires** (FO-01 .. FO-25) | halterrekken met V-goten, kettlebell-, ballen- en opbergrekken, schijvenbomen, wandstrips, parallettes, plyobox, schijvenkar |
| **Strongman en buiten** (FX-01 .. FX-25) | juk, farmers, frame carry, slee, log, axle, stenenplatform; buiten (EN 16630): optrek, brug, dip, monkey bars, wandrek, buikbank, ladder, combinaties |

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
| `vorm.mjs` | gebogen buis (buigpad, gestrekte lengte) en vrije contour (afrondingen, bulge voor de DXF, randafstand) |
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

## Versie 5 fase A2: vormtaal van pro-toestellen (2026-11-15)

Niet alleen de afwerking, ook de vormen: geen rechte kokers in rechthoekige kaders meer waar een merktoestel bogen heeft.

- **Nieuwe bouwtaal** (`vorm.mjs`, `model.mjs`):
  - `b.buis(naam, rol, hoekpunten, { R })`: een gebogen buis. Hoekpunten worden bogen met buigradius R ≥ 3 x de
    buishoogte in het buigvlak. De gestrekte lengte telt in de stuklijst, plus 2 x 150 mm klemlengte op de staaf van 6 m.
    Het stukblad toont de buigvorm met een buigtabel (hoekpunten, bochten, rechte benen).
  - `b.contour(naam, o, ex, ey, t, hoekpunten, { gaten, uitsparingen })`: een laserplaat met een vrije contour (hoeken
    met afrondingsstraal). De DXF is een polylijn met bogen (bulge) plus de uitsparingen. Het stukblad toont de vorm.
  - Lassen, eindkappen, botsingen, knelpunten en de gatcontrole werken op alle stukken van de gebogen buis en de
    contourplaat. De randafstand van een gat wordt tot de echte contour gemeten.
  - De prijs rekent buigen per bocht (€ 9 per bocht + € 25 instellen per positie) en lasersnijden per meter snijlijn
    (op dikte) + per insteek + de plaat per kg. Dat zijn AANNAMES. De werkwijze krijgt een stap 'Buigen'.
- **Plate-loaded** (FP-04/05/08/09 iso, FP-01):
  - voetframe als lus in vlakovaalbuis met ronde hoeken (twee helften, elk 2 bochten);
  - portaal met twee gebogen ovaalbuizen die naar de ligger boven de as buigen;
  - lagerschilden 8/10 mm met vrije contour en uitsparing;
  - hefboomarmen als één gebogen ovaalbuis;
  - schuine grepen.
  - De portaalboog is nagerekend als uitkrager, met een factor 1,3 aan de binnenkant van de bocht (Winkler, R/h = 3).
- **Kabel**:
  - elke stapeltoren is volledig omkapt: voor-, zij- en achterkap 1,5 mm met hoeken R25, een afgeronde bovenkap,
    een venster met sleuf voor de selectiepen en een instructieplaat;
  - ABS-voetkappen over de torenvoeten;
  - de lat-arm van FK-01 is een gebogen ovaalbuis.
- **Rekken**: kopplaat 8 mm met afgeschuinde hoeken op elke vrije staandertop, eindplaat 8 mm met ronde hoeken op de
  voetbalken, gelaserde zijplaat met naam (FR-01).
- **Banken** (FB-01, FB-02):
  - ligger in vlakovaalbuis;
  - gebogen achterpoot die overgaat in de vloerloper;
  - transportwielen aan de voorvoet en een handgreep aan het hoofdeinde;
  - taps kussen en een zitting met ronde neus.

## Versie 5 fase A3: vormtaal op alle toestellen (2026-11-15)

- **Iso-machines (FP-04/05/08/09):** één centrale rugboog in plaats van twee zijbogen. Het zijn twee identieke
  gebogen vlakovaalbuizen naast elkaar, over de hele lengte aan elkaar gelast. Ze staan op de middenligger, achter de
  rugleuning of vóór de gebruiker (iso-row), met de portaalligger midden erop. De ligger is nagerekend als uitkrager naar
  de draaipunten.
- **FP-01:** een zijschild 8 mm met vrije contour en twee uitsparingen tussen voorpaal, achterpaal en voetframe, 170 mm
  onder de rail (vrij van de tegenrollen).
- **Overige plate-loaded:** vloerrails als lus in koker met ronde hoeken waar de breedte het toelaat (FP-02/03/07/10,
  FP-06 thuis). FP-07 krijgt een gebogen hefboomarm, FP-11 krijgt kopplaten en eindplaten zoals de rekken.
- **Kabel:** de voorvoet onder de zitting is een gebogen koker in pijlvorm. De lat-arm van FK-06 buigt op zoals bij
  FK-01.
- **Banken:** alle voeten zijn gebogen kokers in pijlvorm (behalve de voorvoet met wielen van FB-01/02). Lange kussens
  zijn taps, met de bies langs de vorm.

## Versie 5 fase B: varianten (2026-11-15)

Elk toestel bestaat nu in varianten: `toestel(id, uitvoering, { maat, afwerking, opties })`.

- **Uitvoering:** thuis, semi-pro of pro.
  - thuis: EN ISO 20957 klasse H.
  - semi-pro: licht commercieel (hotel, kiné, PT-studio, bedrijfsfitness). Dat is commercieel gebruik en dus
    **klasse S**: de norm kent geen tussenklasse. Semi-pro heeft dezelfde maten als pro, maar:
    - wanden van 3 mm in plaats van 4 (koker 80x80x3, ovaal 120x60x3);
    - een maximale gebruiker van 135 kg in plaats van 150;
    - een maximale last van ± 80 % van pro;
    - een stapel van 18 platen in plaats van 20.

    De berekening en de proeflast volgen klasse S. De marktband is afgeleid uit het midden van thuis en pro (AFGELEID,
    geen eigen bron).
  - pro: klasse S.
- **Maat** compact / standaard / XL, waar dat zin heeft:
  - rekken FR-01/02/05: 200 mm lager of 150 mm hoger; bij FR-01 ook de diepte;
  - bank FB-01: 100 mm korter of langer;
  - kabelmachines met een stapel: 4 platen minder of meer.

  Bij de andere toestellen is de maat vast (standaard).
- **Afwerking:** frame-RAL en kussenkleur (in de 3D en de prijs), schijfhouders verchroomd of zwart gecoat, logoplaat
  ja of nee. Een RAL buiten 9005/7016/7021/9006 kost 20 % meer op het coaten (AANNAME).
- **Opties (`opties.mjs`):**
  - rek: extra schijvenopslag, bandpinnen;
  - bank: transportwielen;
  - kabel: grepenset, fijninstelling (bijleggewicht);
  - plate-loaded: schijvenopslag op het voetframe, snelsluitklemmen;
  - selectorized en multigym: grepenset, fijninstelling, schijvenopslag, bandpinnen;
  - buiten: valtegels (EN 1177) in de valruimte, snelsluitklemmen op de laadpennen (strongman).

  Een optie bouwt echte onderdelen, met botsingscontrole, of voegt kooponderdelen toe. Wat niet past, staat als
  "past niet op dit toestel" en is in de web uitgeschakeld.
- **Tekeningen:** het tekeningnummer en het titelblok tonen de variant (bv. `FR-01-SP-XL`, "Semi-pro · XL · 2 opties").
- **Web en presentatie:** per toestel de keuzes uitvoering, kleur, maat, afwerking en opties. Ze worden per toestel
  onthouden.

## Versie 5 fase C: 100 nieuwe toestellen (2026-11-15)

Vier nieuwe reeksen van 25 toestellen. Ze hebben elk een 3D-model, een berekening, bladen, gat- en botsingscontroles,
een bestellijst, een prijs en een marktband, net als de eerste 50. De catalogus telt nu 150 toestellen.

| Reeks | Module | Wat |
|---|---|---|
| **FS-01 .. FS-25** selectorized | `selectorized.mjs` | Nokstations met een hefboom, een nok R200 en een kabel via een vloerkatrol naar een omkapte toren. Kabelstations met een gebogen arm. Een nokkap over de nok en de kabel. Herkenbare stations: high row, preacher, knielende lat, seated row en face pull. |
| **FM-01 .. FM-25** multigyms en rigs | `rigs.mjs` | Rigs met 1 tot 4 vakken, vrijstaand of tegen de muur. De muur staat als context in de 3D, met muurplaten en keilbouten. Monkey bars, ringen, dip en opslag. Functional trainers met 2 of 3 torens. |
| **FO-01 .. FO-25** opslag en accessoires | `opslag.mjs` | Halterrekken, kettlebellrekken, ballenrekken en opbergrekken. Schijvenbomen en wandstrips. Parallettes, een plyobox en een schijvenkar. |
| **FX-01 .. FX-25** strongman en buiten | `buiten.mjs` | Strongman: juk, farmers, laadpaal, frame carry, deadlift-frame, slee, log, axle en een stenenplatform. Buiten volgens EN 16630: optrekstang, brug, dip, monkey bars, wandrek, buikbank, ladder, combinaties en opstap. |

**Opslag in pro-vormtaal (Rogue/Eleiko):**
- **Halterrekken.** Elke laag helt 15° naar de gebruiker en heeft een V-goot. De goot is één gezette plaat van 2-3 mm met een rubberen inleg van 3 mm, gelast op een gootligger over alle frames.
- **Eindframes.** Aan de buitenkant zit een gelaserde zijplaat van 3-4 mm met ronde hoeken en het logo als uitsparing. Erachter zit een plaatje in de accentkleur. De voeten hebben eindplaten met een halfronde bovenkant.
- **Kettlebell- en opbergrekken.** Een gezette bak met opstaande randen van 40 mm en een rubbermat. De opbergbank heeft een zitkussen.
- **Ballenrekken.** Een brede V-goot (300 x 100) met rubber.
- **Plyobox.** Een dichte doos: een mantel uit één gezette plaat met 4 ronde zettingen R30, een bodem en een deksel met antislip. In de zijkanten zitten handgrepen als uitsparing, onder het deksel een ribbe en eronder rubberstroken.
- **Schijvenbomen en bandenpaal.** Een gelaserde basisplaat met ronde hoeken op 4 rubberpads, een paal met 4 driehoekschotten en een kopplaat.
- **Houders.** Een buis Ø42,4 met een rubberen huls (Ø48, schijven Ø50 schuiven er vrij over) en een eindkap. Daarom worden ze niet verchroomd.

**Buiten (EN 16630, `en16630()` in `buiten.mjs`):**
- **Constructie.** Ronde palen: Ø76 voor thuis, Ø89 voor semi-pro en pro. Ze zitten 500 mm diep in een betonpoer van 400 x 400 x 600, met de bovenkant 300 mm onder het maaiveld. De poer staat als context in de 3D, zichtbaar door de halfdoorzichtige grond. Thermisch verzinkt plus poedercoat (duplex), met verzinken in de prijs (AANNAME € 0,75/kg).
- **Toetsen:**
  - de greepdiameter (Ø 16-45);
  - de vrije openingen tussen evenwijdige stangen, sporten en liggers: geen opening tussen 89 en 230 mm (hoofd en nek);
  - de vrije valhoogte: bij hangen de greephoogte min 1 m, bij klimmen de hoogste voetsteun, maximaal 3 m;
  - de valruimte X = 2/3·Y + 0,5 m, met een minimum van 1,5 m, en de ondergrond (valdempend boven 1 m).
- **Valruimte.** De valruimte staat als vlak in de 3D. De optie "valtegels" vervangt dat vlak door rubbertegels EN 1177 en zet ze in de prijs.
- **Infobord en stabiliteit.** Er is altijd een infobord. De stabiliteit is gerekend als passieve gronddruk op de poer (AANNAME).
- **Strongman.** Laadpennen Ø48,3 x 8 in S355 met een gelaserde kraag. Snelsluitklemmen zijn een optie. De proeflast is 2,5 x de last (AANNAME: strongman valt buiten EN ISO 20957). Losse werktuigen zoals de log en de axle krijgen geen kantelproef.
- **Prijs.** Bij kleine werktuigen (laadpaal, farmers, axle) ligt de thuisprijs ver boven de importprijzen. Dat komt door de vaste kosten per toestel: lakkerij, verpakking en handleiding. De buitentoestellen pro liggen onder of in de band van Kompan, Lappset en BarBarian.

## Testen: snel of volledig

`npx vitest run src/qa/qaFitness.test.ts` is de snelle standaardrun (± 30 s). De tests per toestel lopen op een
steekproef: per soort het eerste, het middelste en het laatste toestel. Na een wijziging aan bepaalde toestellen zet je
die erbij met `FITNESS_IDS=FM-05,FM-06`. De volledige run over alle toestellen (± 5 min) start je met
`FITNESS_VOLLEDIG=1`. Zo draait ook `npm run test:voorbeelden`. Draai de volledige run aan het einde van elk blok.

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
