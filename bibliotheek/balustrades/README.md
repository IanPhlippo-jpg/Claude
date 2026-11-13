# Bibliotheek: balustrades (2026-11-13)

Het tweede product voor Ians laswerkbedrijf, opgebouwd zoals de [taatsdeuren](../taatsdeuren/README.md). Het is een
configurator voor balustrades (borstweringen) op maat, voor binnen (vide en trap) en buiten (terras en balkon).

De eisen en de keuzes staan in [EISEN.md](EISEN.md). De normwaarden en de bronnen staan in
[docs/Normen-en-bronnen.md](docs/Normen-en-bronnen.md).

## Wat het is

**Vier soorten, elk met een paar stijlen:**

| Soort | Opbouw | Stijlen |
|---|---|---|
| Spijlen | staanders, handregel en onderregel, met verticale spijlen ertussen; gelast en gepoedercoat | Ø12, Ø16 + ronde handregel, vierkant 12, plat 40x8, vierkant 14 dicht |
| Horizontaal of plaat | staanders met horizontale staven boven een dichte plint tot 450 mm, of met een plaat | staven Ø16 of 50x8, plaat vlak, geperforeerd, lasergesneden lamellen of cirkels |
| Glas met staanders | gehard-gelaagd glas (55.2 of 66.2) in 4 glasklemmen tussen stalen of inox staanders, met een handregel | koker + platte handregel, koker + inox handregel, inox Ø48,3 |
| Glas in een U-profiel | volglas geklemd in Q-railing Easy Glass Smart, 88.4 of 1010.4 | met of zonder inox U-handregel |

**Lijnen:**
- recht;
- met een hoek (L, 60-170°) of twee hoeken (U);
- schuin langs een trap (optrede en aantrede, met een vide erna);
- onder een schuin dak: het begin en/of het einde afgeschuind (zie hieronder).

**Bevestiging en afstand:**
- bovenop de vloer (voetplaat met 4 ankers) of tegen de zijkant (console met afstandhouders);
- chemisch anker (fischer FIS V Plus + FIS A) of keilbout (fischer FAZ II);
- de staanderafstand volgt uit de berekening, of je kiest hem zelf.

**Veiligheid (NBN B 03-004, EN 1991-1-1 + ANB, NBN S 23-002):**
- hoogte;
- openingen ≤ 110 mm;
- niet beklimbaar tussen 110 en 450 mm;
- de staander (buiging, doorbuiging, las);
- de voetplaat en de ankers (trek per anker);
- het glas.

Elke controle krijgt een oordeel groen, oranje of rood, met de formule en de bron.

## Onder een schuin dak (afschuining aan de uiteinden)

Op een zolder of vide onder een hellend dak zakt het dak aan het begin of het einde van de lijn zo laag dat de
balustrade het dak moet volgen. Per uiteinde (begin en einde apart):
- aan of uit, de **dakhelling** (15-60°, standaard 45), de **hoogte onder het dak aan de muur** (tegen het knieschot) en
  de **spleet** tot het dak (loodrecht op het dak, standaard 40 mm);
- de configurator rekent de horizontale **lengte van het schuine stuk** uit: xs = (H + spleet / cos θ − hmuur) / tan θ.
  Past het niet in de lijn (minstens 150 mm vlak tot het andere einde, de hoek of de andere knik), dan staat het op rood;
- bij een hoek of U geldt "begin" voor de eerste en "einde" voor de laatste lijn. Langs een trap kan alleen het einde
  (de vide na de trap).

Wat er verandert:
- **handregel:** loopt schuin onder het dak, met een knik (verstek de helft van de helling) op een knikstaander; aan de
  muur verticaal gezaagd;
- **staanders:** lager en bovenaan schuin gezaagd; de eindstaander staat met zijn voetplaat tegen het knieschot. Is de
  balustrade aan de muur lager dan 300 mm, dan komt er een **muurplaat** 80 x 8 met 2 ankers M10 in het knieschot;
- **spijlen** ingekort en bovenaan schuin; geen bovenregel in een schuin veld;
- **staven** eindigen schuin gezaagd tegen de schuine handregel; de **plint** en de **platen** worden schuin gelaserd;
- **glas:** trapezium (of vijfhoek op de knik), met de schuine zijde in de glasbestelling; met staanders 1 klem aan een
  lage kant (< 360 mm); in het U-profiel een voeg op de knik en een verbinder in de U-handregel;
- **berekening:** lengte past, opening dak-balustrade (spleet + 10 mm ≤ 110), lager dan H alleen onder het dak,
  hoogte aan de muur (≥ 150 mm), muurplaat (afschuiving van de ankers), klemmen aan een lage glaskant;
- **werkplaats:** stuklijst en zaaglijst met de schuine stukken en hun zaagsnede, A4 per schuin stuk met de helling,
  glasbestelling met hoogte links/rechts en schuine zijde, montage "Knik onder het dak", plaatsingsblad (helling en
  hoogte aan de muur eerst nameten);
- **prijs:** toeslag "Afschuining onder het dak" apart (uren voor knik, mal en schuine stukken, muurplaat, vormglas:
  omschreven rechthoek + 15 %, instelbaar);
- **3D en vooraanzicht:** het dak half doorzichtig met kepers, het knieschot, en in de bladen een streepstippellijn.

De regels onder het dak zijn **AANNAMES**: Buildwise en de Nederlandse Bbl zeggen er niets over (zie
`docs/Normen-en-bronnen.md`).

## Gebruiken

**Configurator** (`web/index.html` met de modules in `js/`) heeft drie pagina's:
- **Balustrade** (voor de klant):
  - de soort en de stijl, de lijn en de maten, plaats en gebruik, bevestiging, handregel, glas, RAL-kleur en structuur;
  - de balustrade in 3D (draaien en zoomen) of als vooraanzicht;
  - het oordeel over de veiligheid in één zin;
  - de prijs per strekkende meter met de toeslagen en de marktmeter.

  Hier staan geen werkplaatsschema's.
- **Werkplaats**:
  - berekening;
  - montage per verbinding (3D die je uit elkaar schuift, plus een A4-montageblad);
  - overzicht A3 (uitgeslagen vooraanzicht, bovenaanzicht, doorsnede);
  - stuk per stuk (A4 met lengte, zaagsnede en gaten);
  - stuklijst (ISO 7573);
  - lasdetails (ISO 2553);
  - boringen (ISO 15786);
  - bestellijst met zaagplan (6 m);
  - plaatsingsblad;
  - kostprijs met bronnen, werkwijze met uren, zaaglijst en de marktvergelijking.

  Downloads:
  - het dossier om af te drukken of als PDF te bewaren (HTML: A4 met prijs, werkwijze en berekening, dan alle bladen);
  - alle tekeningen (SVG in een ZIP, met de lijsten als CSV);
  - de lijsten (CSV).
- **Instellingen**:
  - uurloon, marge per soort, staalprijs, verzinkprijs, coatprijs, plaatsen per meter;
  - de standaarduren;
  - de glasprijzen;
  - wat de klant ziet (prijs excl. of incl. btw, of de kostprijs).

  Ze worden bewaard op het account (als de pagina gepubliceerd is), anders in de browser.

**Presentatie voor klanten** (los van de CAD, één bestand dat zonder internet werkt): `presentatie/uit/Balustrades.html`.

## Maken en testen

```bash
node bibliotheek/balustrades/maak-web.mjs <map>           # index.html + js/ (ook de gebruikte taatsdeuren-modules)
node bibliotheek/balustrades/maak-presentatie.mjs [map]   # presentatie/uit/Balustrades.html (esbuild, three gebundeld)
npx vitest run src/qa/qaBalustrades.test.ts               # 490 tests, ± 6 s (ook in npm run test:voorbeelden)
npm run typecheck
```

De test bouwt een rooster van 352 combinaties: soort x stijl x binnen/buiten x boven/zij x recht/hoek/U/schuine
hoek/trap x twee maten. Voor elke combinatie controleert hij:
- geen NaN in het model of de tekeningen;
- openingen ≤ 110 mm en niet beklimbaar waar het moet;
- hoogte ≥ de norm;
- de stuklijst sluit met de geometrie (handregel = lijn, velden + staanders = lijn, glas + voegen = lijn);
- het zaagplan klopt;
- de prijs en de berekening zijn eindig.

Onder een schuin dak bouwt de test 96 combinaties: soort x begin/einde/beide x recht/hoek/U x 15/45/60°, en de
andere stijlen met zijmontage. Hij controleert dat de bovenkant van de handregel het dak volgt met de spleet en er
nergens in komt, dat geen spijl, staander, staaf, plaat of glas door de handregel steekt, dat de stukken van de
handregel sluiten, de toeslag apart staat en de tekeningen geen NaN hebben. Randgevallen: te lang schuin stuk, lage muur
(muurplaat), heel lage muur (rood), 15° en 60°, spleet te groot of te klein, dak hoog genoeg, trap, glas in U-profiel.

Daarnaast zijn er tests die nakijken:
- dat de standaardprijs per soort in de marktband ligt;
- de veiligheidsregels (staven zonder plint, cirkels Ø60, te grote tussenruimte, te laag, de glaskeuze, een trap met
  verticale spijlen).

## Bestanden

| Bestand | Wat |
|---|---|
| `normen.mjs` | normwaarden met bron (hoogte, openingen, klimzone, lijnlast per categorie, γ, doorbuiging, glas) |
| `onderdelen.mjs` | profielen (I, W, kg/m), glasopbouw, kooponderdelen met artikel, prijs en winkel, ankers (N_Rd), de soorten en stijlen |
| `model.mjs` | de geometrie: lijn, staanders, regels, spijlen, staven, platen, glas, klemmen, U-profiel, voetplaten, consoles, ankers, openingen |
| `bereken.mjs` | staanderkeuze en -afstand, voetplaat, ankers, las, glas, handregel, oordeel |
| `stuklijst.mjs` | posities, kooponderdelen, zaagplan (6 m; U-profiel 2,5 m) |
| `prijzen.mjs`, `werkwijze.mjs` | kostprijs per categorie (toeslagen), uren per stap, `MARKT` en `MARKTBAND` |
| `tekeningen.mjs`, `blad.mjs` | alle bladen (ISO 5457, 7200, 128, 129, 5456-2 eerste hoek, 2553, 15786, 2768-m) |
| `montage.mjs` | scènes per verbinding en het A4-montageblad |
| `scene3d.mjs` | de 3D voor de klant (three.js 0.160) |
| `dossier.mjs` | het dossier (HTML) en de CSV |
| `web/index.html` | de configurator |
| `presentatie/` | de klantversie (één bestand) |
| `*.d.mts` | types voor de test |

## Prijzen per meter (voorbeelden, excl. btw)

Recht 4,5 m, binnen, bovenop de vloer, woning, standaardinstellingen (uurloon € 45):

| Balustrade | Staander / glas | Zonder plaatsen | Geplaatst | Markt (zonder plaatsen) |
|---|---|--:|--:|--:|
| Spijlen Ø12 | koker 40x40x3, 1115 h.o.h. | € 262 | € 349 | € 200-400 |
| Spijlen Ø16 + ronde handregel | koker 40x40x3 | € 288 | € 376 | € 200-400 |
| Horizontale staven Ø16 + plint | koker 40x40x3 | € 282 | € 370 | € 250-450 |
| Geperforeerde plaat | koker 40x40x3 | € 369 | € 457 | € 250-450 |
| Glas 55.2 tussen stalen kokers | koker 40x40x4, 1487 h.o.h. | € 361 | € 460 | € 300-450 |
| Glas tussen inox staanders | inox Ø48,3 | € 458 | € 568 | € 300-450 (premium) |
| Glas 88.4 in U-profiel + U-handregel | Q-railing Easy Glass Smart | € 544 | € 640 | € 340-600 |
| Glas 88.4 in U-profiel zonder handregel | idem | € 480 | € 576 | € 340-600 |

Bronnen van de marktprijzen:
- Urban Steel (BE);
- Rookton;
- Bouwplannen.be;
- Binnenbeglazing.be;
- eigen optelling van de kooponderdelen.

Alle links en de datum staan in `docs/Normen-en-bronnen.md`.

## Wat nog open is

- **Ankers:** de waarden zijn deels aangenomen. FIS V is niet nagekeken in de ETA, en de randafstand is vereenvoudigd.
  Reken het echte anker na met fischer FIXPERIENCE, zeker bij zijmontage en dicht bij de vloerrand.
- **Glas tussen klemmen:** vereenvoudigd berekend. Laat de klemfabrikant (Q-railing) de opbouw bevestigen.
- **Bij publieke gebouwen of een tribune (C5):** laat een ingenieur de berekening tekenen.
- **Q-railing:** Prime en Pro (zwaardere lasten) en de echte handelsprijzen (korting voor verwerkers) zijn op offerte.
  Vraag ook bij Q-railing na of de rubberset per 2,5 m of per meter verkocht wordt.
- **Trap met een vide:** de handregel heeft geen sprong. Over de hele lijn geldt 1100 mm, omdat de vide dat vraagt.
- **Onder een schuin dak:** geen bron gevonden; de regels zijn AANNAMES (opening tot het dak ≤ 110 mm). Het dak kan
  per uiteinde maar één helling hebben, en de afschuining kan niet over een hoek heen lopen. De vormtoeslag van het
  glas (15 %) is een SCHATTING: vraag de glasleverancier.
