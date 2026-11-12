# Bibliotheek: stalen taatsdeuren (2026-11-10)

Het eerste product voor Ians laswerkbedrijf: 100 stalen deuren met glas (pivot of verdekte scharnieren), met maten die je aanpast. De eisen en
de antwoorden staan in [EISEN.md](EISEN.md). Alles is te maken met een lastafel, MIG/MAG en TIG; de bogen en kleine
platen laat je lasersnijden.

**Presentatietool voor klanten (los van de CAD):** `Bureaublad\Deurenconfigurator\Deurenconfigurator.html`
(dubbelklikken, werkt zonder internet) en online <https://claude.ai/artifact/GgVQKsS5dJiSdMFEW6GxKT>.
- Kies het model, het deurgat (met de muurdikte), pivot of verdekte scharnieren, enkel of dubbel glas met kleur en
  structuur, en de RAL-kleur met de afwerking.
- Je ziet de deur in 2D met maten en in een 3D-kamer.
- Afdrukken of als PDF bewaren voor de klant.
- Bouwen: `node bibliotheek/taatsdeuren/maak-presentatie.mjs "C:\Users\ianph\OneDrive\Bureaublad\Deurenconfigurator"`.

**Configurator "Taatsdeuren op maat":** <https://claude.ai/artifact/6ex1en1dk19jj9Q1B1KfhN> (bron: `web/index.html` met de
modules in `js/`). Sinds 2026-11-12 zijn **staal en aluminium twee aparte pagina's** (Ian: "dat ik het onderscheid heel goed kan zien"):
- **Staal** (oranje, `#staal`): 100 stijlen, kokers of Jansen/Janisol/Forster, verstek gelast (TIG/MIG), pivot, FritsJurgens of
  verdekte scharnieren, binnen of buiten.
- **Aluminium** (blauw, `#alu`): de 56 stijlen zonder boog, profiel op maat P1-P4 of Du Pont, geschroefd met hoekverbinders,
  stelschroeven en verzonken bouten (niet gelast), altijd een pivot, enkel veiligheidsglas.
- Elk materiaal heeft zijn eigen **werkplaats** (`#staal-werkplaats`, `#alu-werkplaats`) met bovenaan de **montage**: per
  verbinding (hoek, roede, glas, pivot onder en boven of verdekte scharnieren) een 3D-model dat je uit elkaar en samen schuift en
  een montageblad A4 (`montage.mjs`, scènes in `verbinding.mjs`, 3D in `verbinding3d.mjs`): genummerde onderdelen,
  bevestigingsmiddelen met norm (ISO 10642 verzonken, ISO 4026 stelschroef, ISO 7050, DIN 7504-O), en de stappen.
- RAL-kleuren en glas als kleurstalen; de deur draait in 3D bij een pivot naar beide kanten (verdekt naar één kant), met de
  vloerpot en de bovenpen zichtbaar.
- Prijs = verkoop excl. btw met een marktmeter (staal € 750-2 300, aluminium € 450-880, zonder plaatsen); plaatsen is een
  aparte keuze. Marge staal 35 %, aluminium 20 % (instelbaar).

De vroegere opbouw (drie pagina's):
- **Deur** (om aan de klant te tonen):
  - kies een van de 100 stijlen (filter per soort), de maat van de opening, het profiel, het glas, het scharnier, de
    afwerking en de kleur;
  - je ziet de deur **in een 3D-kamer**: rondkijken, de deur open draaien, muur en vloer kiezen, en het beeld opslaan;
  - er staat één prijs bij: standaard de kostprijs om te maken; in de instellingen kies je ook verkoop excl. of incl. btw.
- **Werkplaats:**
  - het werkblad A3, de kostprijs per regel met bronnen, de werkwijze met uren, en de zaag-, laser- en glaslijst;
  - downloads: werkblad (SVG), dossier (HTML om af te drukken), lijsten (CSV) en de DXF's.
- **Instellingen:**
  - de standaarduren per handeling, je uurloon en marge, en je eigen materiaalprijzen;
  - ze worden bewaard op je account, en anders in de browser.

## Bouwstenen

Elke stijl is een combinatie van bouwstenen in `deuren.mjs` (STIJLEN). Een nieuwe stijl is één regel.

| Bouwsteen | Mogelijkheden |
|---|---|
| Bovenkant | recht, boog met poten (zoals de foto), boog op een kalf, volle boog (deur rond bovenaan) |
| Roeden | verticaal en horizontaal, als breuk van de breedte en de hoogte |
| In de boog | leeg, verticale roeden die doorlopen, of een zon met 3, 5 of 7 stralen |
| Paneel | het onderste vak als stalen paneel (plaat 3 mm, in het midden van de diepte ingelast) |
| Vrije verdeling | vakken splitsen in vakken (Mondriaan, trap, kader in kader, lambrisering) |
| Vleugels | 1 of 2 (dubbele deur, de tweede gespiegeld), een vast zijlicht links of aan beide kanten, of een vast bovenlicht |

## Keuzes (opties.mjs)

| Keuze | Mogelijkheden |
|---|---|
| Openen | pivot (Argenta Pivotica Pro 150 tot 150 kg, of FritsJurgens), of verdekte scharnieren: 3 x Argenta Invisible Neo L-7 met RVS-lasbak (tot 145 kg), zwaarder Simonswerk Tectus TE 640 |
| Glas | altijd veiligheidsglas: glad gelaagd 44.2 (helder, extra helder, grijs, brons, mat) of structuur gehard 8 mm (geribd, kathedraal, chinchilla); dubbel glas 44.2 / 14 / 6 gehard |
| Gebruik | binnen of buiten; buiten = geïsoleerde deurprofielen (Janisol Arte 2.0 of Forster unico) met isolerend glas; een stijl met een boog kan niet buiten (een geïsoleerd profiel buigen kan alleen de fabrikant) |
| Profiel | automatisch het slankste dat past: koker 40 x 40 (enkel glas, pivot), 40 x 60 (dubbel glas), 60 x 40 (verdekte scharnieren, die 36 mm in de stijl gaan), 60 x 60 (beide); of gekochte deurprofielen: Jansen Economy 50 (binnen), Janisol Arte 2.0 of Forster unico (buiten). De deurprofielen zijn altijd een taatsdeur (pivot) |
| Kleur | 20 RAL-kleuren en brons metallic; fijnstructuur mat, glad mat of zijdeglans |

## De 100 stijlen

| Nr | Stijl | Soort | Standaardopening | Kostprijs* | Verkoop* (35 %) |
|---|---|---|---|--:|--:|
| TD-01 | Strak | Recht | 1000 x 2400 | € 1 321 | € 1 784 |
| TD-02 | Drie vakken | Recht | 1000 x 2400 | € 1 480 | € 1 998 |
| TD-03 | Raster acht | Raster | 1000 x 2400 | € 1 854 | € 2 503 |
| TD-04 | Japandi | Recht | 1000 x 2600 | € 1 834 | € 2 476 |
| TD-05 | Boog | Boog | 1000 x 2400 | € 1 768 | € 2 387 |
| TD-06 | Boog met raster | Boog | 1000 x 2400 | € 2 025 | € 2 734 |
| TD-07 | Volle boog | Volle boog | 1000 x 2500 | € 1 907 | € 2 575 |
| TD-08 | Art deco | Art deco | 1000 x 2400 | € 2 099 | € 2 834 |
| TD-09 | Dubbele deur met boog | Dubbel | 1700 x 2600 | € 2 825 | € 3 814 |
| TD-10 | Deur met zijlicht | Zijlicht | 1450 x 2400 | € 1 993 | € 2 690 |
| TD-11 | Twee vakken | Recht | 1000 x 2400 | € 1 400 | € 1 890 |
| TD-12 | Vier vakken | Recht | 1000 x 2400 | € 1 559 | € 2 105 |
| TD-13 | Vijf vakken | Recht | 1000 x 2400 | € 1 638 | € 2 211 |
| TD-14 | Ladder | Recht | 1000 x 2400 | € 1 719 | € 2 321 |
| TD-15 | Bovenlicht | Recht | 1000 x 2400 | € 1 400 | € 1 890 |
| TD-16 | Laag kalf | Recht | 1000 x 2400 | € 1 400 | € 1 890 |
| TD-17 | Japandi twee | Recht | 1000 x 2600 | € 1 675 | € 2 262 |
| TD-18 | Japandi vijf | Recht | 1000 x 2600 | € 1 993 | € 2 690 |
| TD-19 | Kruis | Raster | 1000 x 2400 | € 1 587 | € 2 142 |
| TD-20 | Raster zes | Raster | 1000 x 2400 | € 1 706 | € 2 303 |
| TD-21 | Raster tien | Raster | 1000 x 2400 | € 2 002 | € 2 703 |
| TD-22 | Raster twaalf | Raster | 1000 x 2400 | € 2 179 | € 2 942 |
| TD-23 | Fabriek | Raster | 1000 x 2400 | € 2 584 | € 3 488 |
| TD-24 | Paneel onderaan | Paneel | 1000 x 2400 | € 1 456 | € 1 966 |
| TD-25 | Paneel en twee vakken | Paneel | 1000 x 2400 | € 1 535 | € 2 072 |
| TD-26 | Paneel met raster | Paneel | 1000 x 2400 | € 1 834 | € 2 476 |
| TD-27 | Paneel Japandi | Paneel | 1000 x 2600 | € 1 864 | € 2 517 |
| TD-28 | Paneel met ladder | Paneel | 1000 x 2400 | € 1 694 | € 2 287 |
| TD-29 | Boog met roeden | Boog | 1000 x 2400 | € 2 127 | € 2 872 |
| TD-30 | Boog met paneel | Boog | 1000 x 2400 | € 1 999 | € 2 699 |
| TD-31 | Boog op kalf | Boog | 1000 x 2400 | € 1 566 | € 2 114 |
| TD-32 | Boog met middenroede | Boog | 1000 x 2400 | € 1 646 | € 2 222 |
| TD-33 | Boog en drie vakken | Boog | 1000 x 2400 | € 1 725 | € 2 329 |
| TD-34 | Kathedraal | Boog | 1000 x 2600 | € 2 248 | € 3 035 |
| TD-35 | Boog op kalf met paneel | Boog | 1000 x 2400 | € 1 777 | € 2 399 |
| TD-36 | Boog met raster twaalf | Boog | 1000 x 2400 | € 2 557 | € 3 452 |
| TD-37 | Zon met drie stralen | Art deco | 1000 x 2400 | € 1 874 | € 2 529 |
| TD-38 | Zon met zeven stralen | Art deco | 1000 x 2400 | € 2 547 | € 3 438 |
| TD-39 | Art deco met paneel | Art deco | 1000 x 2400 | € 2 142 | € 2 892 |
| TD-40 | Volle boog strak | Volle boog | 1000 x 2500 | € 1 619 | € 2 186 |
| TD-41 | Volle boog met roeden | Volle boog | 1000 x 2500 | € 1 832 | € 2 473 |
| TD-42 | Volle boog raster | Volle boog | 1000 x 2500 | € 2 279 | € 3 077 |
| TD-43 | Volle boog met zon | Volle boog | 1000 x 2500 | € 2 208 | € 2 980 |
| TD-44 | Volle boog met paneel | Volle boog | 1000 x 2500 | € 1 954 | € 2 637 |
| TD-45 | Dubbele deur strak | Dubbel | 1700 x 2400 | € 2 197 | € 2 966 |
| TD-46 | Dubbele deur, drie vakken | Dubbel | 1700 x 2400 | € 2 494 | € 3 367 |
| TD-47 | Dubbele deur raster | Dubbel | 1700 x 2400 | € 3 255 | € 4 394 |
| TD-48 | Dubbele deur, twee bogen | Dubbel | 1700 x 2600 | € 3 186 | € 4 301 |
| TD-49 | Zijlicht met raster | Zijlicht | 1450 x 2400 | € 2 433 | € 3 284 |
| TD-50 | Zijlicht met paneel | Zijlicht | 1450 x 2400 | € 2 061 | € 2 782 |
| TD-51 | Mondriaan | Asymmetrisch | 1000 x 2400 | € 1 652 | € 2 230 |
| TD-52 | Hoekvakken | Asymmetrisch | 1000 x 2400 | € 1 475 | € 1 991 |
| TD-53 | Bovenlicht in drie | Asymmetrisch | 1000 x 2400 | € 1 550 | € 2 093 |
| TD-54 | Drie onderaan | Asymmetrisch | 1000 x 2400 | € 1 557 | € 2 101 |
| TD-55 | Ladder opzij | Asymmetrisch | 1000 x 2400 | € 1 723 | € 2 327 |
| TD-56 | Venster | Asymmetrisch | 1000 x 2400 | € 1 568 | € 2 116 |
| TD-57 | Trap | Asymmetrisch | 1000 x 2400 | € 1 721 | € 2 324 |
| TD-58 | Kader in kader | Asymmetrisch | 1000 x 2400 | € 1 740 | € 2 349 |
| TD-59 | Paneel Mondriaan | Paneel | 1000 x 2400 | € 1 630 | € 2 201 |
| TD-60 | Paneel en venster | Paneel | 1000 x 2400 | € 1 610 | € 2 173 |
| TD-61 | Paneel met trap | Paneel | 1000 x 2400 | € 1 835 | € 2 477 |
| TD-62 | Lambrisering | Paneel | 1000 x 2400 | € 1 572 | € 2 122 |
| TD-63 | Raster boven | Raster | 1000 x 2400 | € 1 776 | € 2 397 |
| TD-64 | Smalle vakken | Raster | 1000 x 2400 | € 2 216 | € 2 991 |
| TD-65 | Drie hoog | Raster | 1000 x 2400 | € 1 776 | € 2 397 |
| TD-66 | Raster zestien | Raster | 1000 x 2400 | € 2 506 | € 3 383 |
| TD-67 | Raster twintig | Raster | 1000 x 2400 | € 2 762 | € 3 729 |
| TD-68 | Japandi met bovenlicht | Recht | 1000 x 2600 | € 1 839 | € 2 483 |
| TD-69 | Boog met paneel en roeden | Boog | 1000 x 2400 | € 2 179 | € 2 942 |
| TD-70 | Boog met vier vakken | Boog | 1000 x 2400 | € 2 320 | € 3 132 |
| TD-71 | Boog met één roede | Boog | 1000 x 2400 | € 1 943 | € 2 623 |
| TD-72 | Boog met Japandi | Boog | 1000 x 2400 | € 1 950 | € 2 633 |
| TD-73 | Boog met kruis | Boog | 1000 x 2400 | € 1 891 | € 2 552 |
| TD-74 | Boog en Mondriaan | Boog | 1000 x 2400 | € 1 815 | € 2 451 |
| TD-75 | Kathedraal met paneel | Boog | 1000 x 2600 | € 2 294 | € 3 096 |
| TD-76 | Boog met ladder | Boog | 1000 x 2400 | € 1 981 | € 2 674 |
| TD-77 | Zon met raster twaalf | Art deco | 1000 x 2400 | € 2 855 | € 3 855 |
| TD-78 | Zon met negen stralen | Art deco | 1000 x 2400 | € 2 393 | € 3 231 |
| TD-79 | Zon met Japandi | Art deco | 1000 x 2400 | € 2 405 | € 3 246 |
| TD-80 | Zon met paneel en raster | Art deco | 1000 x 2400 | € 2 224 | € 3 002 |
| TD-81 | Volle boog kathedraal | Volle boog | 1000 x 2600 | € 2 336 | € 3 154 |
| TD-82 | Volle boog Japandi | Volle boog | 1000 x 2500 | € 2 092 | € 2 825 |
| TD-83 | Volle boog ladder | Volle boog | 1000 x 2500 | € 2 078 | € 2 805 |
| TD-84 | Volle boog, zon en paneel | Volle boog | 1000 x 2500 | € 2 183 | € 2 947 |
| TD-85 | Volle boog Mondriaan | Volle boog | 1000 x 2500 | € 1 903 | € 2 569 |
| TD-86 | Dubbele deur Japandi | Dubbel | 1700 x 2600 | € 2 896 | € 3 909 |
| TD-87 | Dubbele deur met paneel | Dubbel | 1700 x 2400 | € 2 585 | € 3 490 |
| TD-88 | Dubbele deur met zon | Dubbel | 1700 x 2600 | € 3 769 | € 5 088 |
| TD-89 | Dubbele kathedraal | Dubbel | 1700 x 2600 | € 3 599 | € 4 859 |
| TD-90 | Dubbele Mondriaan | Dubbel | 1700 x 2400 | € 2 857 | € 3 857 |
| TD-91 | Dubbele deur, boog met roeden | Dubbel | 1700 x 2600 | € 3 308 | € 4 466 |
| TD-92 | Dubbele deur ladder | Dubbel | 1700 x 2400 | € 2 963 | € 4 000 |
| TD-93 | Dubbele deur raster twaalf | Dubbel | 1700 x 2400 | € 3 907 | € 5 275 |
| TD-94 | Zijlicht strak | Zijlicht | 1450 x 2400 | € 1 710 | € 2 309 |
| TD-95 | Zijlicht met boog | Zijlicht | 1450 x 2400 | € 2 395 | € 3 233 |
| TD-96 | Twee zijlichten | Zijlicht | 1900 x 2400 | € 2 505 | € 3 381 |
| TD-97 | Twee zijlichten raster | Zijlicht | 1900 x 2400 | € 3 012 | € 4 066 |
| TD-98 | Deur met vast bovenlicht | Bovenlicht | 1000 x 3000 | € 1 729 | € 2 335 |
| TD-99 | Bovenlicht en raster | Bovenlicht | 1000 x 3000 | € 2 175 | € 2 937 |
| TD-100 | Boog met vast bovenlicht | Bovenlicht | 1000 x 3000 | € 2 054 | € 2 773 |

\* excl. btw, profiel automatisch (koker 40 x 40), enkel glas 44.2 helder, pivot Pivotica, poedercoat RAL 9005, € 45/u, plaatsen inbegrepen.

## Wat er per deur is

| Wat | Waar |
|---|---|
| 3D-model (Phlippo CAD) | `modellen/TD-xx-….kcad` |
| Werkblad A3: vooraanzicht met maten, zaaglijst, laserlijst, glaslijst, doorsnede, kostprijs, titelblok | `tekeningen/TD-xx-….svg` |
| Opengewerkte tekening A3 (exploded): alle stalen delen uit elkaar in hun echte vorm, verstekken in rood, bij elke verbinding een code (V verstek, T T-stuk, S schuin tegen de boog, B boog op kalf/poot/kader) met een stippellijn, en de verbindingentabel met naad en lasproces | `tekeningen/TD-xx-…-opengewerkt.svg` |
| Stuklijst A3 (ISO 7573) met de kolom Zagen (hoek van beide uiteinden) met de samenstelling en positieballonnen (ISO 6433), en bladen Onderdelen met een schets per positie: staven in hun echte vorm (verstek, schuin volgens de boog) met lengte en doorsnede, bogen met stralen, platen met gaten, ruiten met hun vorm | `tekeningen/TD-xx-…-stuklijst-n.svg` |
| Deurprofielen en verbindingen (`profielen.mjs`): per profiel (kozijn, vleugel, roede, glaslat) de doorsnede met sponning, glas, glaslat en isolatie, het artikel, kg/m en de posities; hoe de stukken samenkomen (vleugelhoek in verstek, roede stomp tegen het kader, kozijn boven verstek en onder recht op de vloer) | blad 3 in `pdf/TD-xx-….pdf`, `tekeningen/TD-xx-…-profielen.svg` |
| Bestellijst en zaagplan (`bestel.mjs`): per profiel (artikel) hoeveel staven van 6 m, en welke stukken uit elke staaf | laatste A3-blad, `tekeningen/TD-xx-…-bestellijst.svg` |
| Plannen in deurprofielen: elke stijl in Jansen Economy 50 (100), Janisol Arte 2.0 en Forster unico (elk 56, zonder bogen), met alle bladen en stuk per stuk | `pdf-koop/<systeem>/` (niet in git: `maak-deuren.mjs --koop`) |
| Stuk per stuk (`detail.mjs`): een A4 per positie met het hele stuk op schaal, beide uiteinden vergroot (hoek, verschil lange en korte kant), de doorsnede, gaten, waar het stuk in de deur zit en zijn verbindingen. Op de pagina Werkplaats: klik op een stuk voor een venster met zoomen en de 3D-vorm (holle koker met verstek; naar elk uiteinde springen) | `pdf/TD-xx-…-stukken.pdf` |
| Dossier: werkblad, opengewerkte tekening, stuklijst, onderdelen, kostprijs met bronnen, werkwijze met uren en lasproces, gewicht tegenover het scharnier | `pdf/TD-xx-….pdf` |
| DXF: laserdelen (bogen, panelen, taatsplaten, greephouders) en de ruiten (voor de glasleverancier) | `dxf/TD-xx-…-laser.dxf`, `-glas.dxf` |
| Alles samen | [Taatsdeuren-bibliotheek.pdf](Taatsdeuren-bibliotheek.pdf) |

## Opbouw

- **Koker en strip:**
  - kader en kozijn: koker 40x40x2, in verstek;
  - roeden: kern platstaal 20x10 met voor en achter een lat 30x3 over het glas;
  - glaslat 15x4 in het kader: voor gelast, achter geschroefd met M4;
  - glas 44.2 in het midden van de diepte.
- **Gekochte deurprofielen** (staven van 6 m, wand 1,5 mm; doorsneden vereenvoudigd, de echte vorm staat in de catalogus):

  | Systeem | Kozijn | Vleugel | Roede | Glaslat | Glas | Bron |
  |---|---|---|---|---|---|---|
  | Jansen Economy 50 (binnen) | 30.007 Z, 50 x 50 | 30.407 Z, 50 x 50 | 30.006 Z, 25 x 50 | 402.120 Z | 5-27 mm | Feon-profiellijst 08/2020, heinze.de |
  | Janisol Arte 2.0 (buiten) | 602.611 Z, 40 x 60 | 603.611 Z, 40 x 60 | T 601.615 Z, 40 x 60 | 405.022 + clip 450.026 | 20-47 mm | Janisol Arte 2.0-catalogus, Feon |
  | Forster unico (buiten) | 531.755, 90 x 70 | 533.751, 65 x 70 | T 531.722, 60 x 70 | 901227 + clip 906577 | 20-54,5 mm | Forster 988320 (03/21) |
  | Aluminium Du Pont / Darby Doors (binnen, geschroefd) | koker 60x30x2 alu, 0709 RH603020A | koker 50x25x2 alu, 0709 RH502520A | dezelfde koker 50x25x2 | L 20x10x2 alu, 0709 L201020A, voor en achter | 44.2 (8,8 mm) | webshop.du-pont.be (lijstprijs per meter, 10/11/2026) |

  Prijs per meter is nergens publiek: gerekend met het gewicht en een geschatte € 12/kg (Economy) en € 18/kg
  (geïsoleerd), in hele staven volgens het zaagplan. Offerte: Jansen (Breda) info.belgium@jansen.com, Forster Belux
  (Reynaers, Duffel) info.belux@forstersystems.com. Hoeken in verstek gelast (Forster: lasmal 989210); bij een
  geïsoleerd profiel enkel de stalen schalen lassen. De uiteinden van de roeden passend uitzagen rond de sponning.
- **Profielsysteem op maat P1-P4 (aanvraag bij een leverancier of extrudeur):** P1 vleugelprofiel 30 x 45 met glasgleuf
  12,4 x 12 (glas 44.2 loopt 10 mm in, glasmaat = daglicht + 8 rondom), P2 roede H 30 x 45 met 2 schroefkanalen,
  P3 kozijn 40 x 50, P4 U-glasrubber EPDM, C1 hoekverbinder, C2 schroeven RVS 4,8 x 50, pivot tot 150 kg. Het
  aanvraagdossier (NL en EN, 4 bladen A3: overzicht, doorsneden 2:1, verbindingen, offerteaanvraag met meters per deur)
  maakt `node bibliotheek/taatsdeuren/maak-aanvraag.mjs` in `aanvraag/`. In de configurator: profiel "Profiel op maat".
- **Aluminium uit de webshop van Du Pont (Darby Doors, Grobbendonk):** Darby verkoopt zijn deurprofielen (SAS-001,
  SAS-007, SAS-020) niet los, enkel afgewerkte deuren; daarom een geschroefde deur uit hun losse aluminium profielen
  (kokers en L-profielen per meter, staven van 6 m): verstek met hoekverbinders en 2K-lijm, roeden met T-verbinders,
  het glas tussen twee L-profielen. Pivot van Du Pont: Revolta SLIM tot 100 kg (REV.100.ZWART.ALU, € 134), daarboven
  Revolta 120 kg of Argenta Pivotica PRO 150 kg. Hoek- en T-verbinders verkoopt Du Pont niet: schatting € 3,50 en € 3.
  Aluminium wordt voorbehandeld (niet gestraald) en gepoedercoat. Geen bogen.
- **Bogen:** lasergesneden uit plaat 10 mm (kern 20 breed) met latten van 3 mm; de boog van het kader en het kozijn
  is 4 lagen van 10 mm op elkaar gelast.
- **Paneel:** plaat 3 mm, 1 mm kleiner dan het vak, op afstandsblokken in het midden van de diepte, gehecht om de
  100 mm en kort gelast zodat de plaat niet trekt. Langs een paneel komt geen glaslat.
- **Taatsas:** 100 mm uit de scharnierkant; taatsplaten van 8 mm in de onder- en de bovenregel.
- **Greep:** rond Ø25 x 800, voor en achter, op het hart van de staander.
- **Bij de volle boog** is er boven geen plaats voor een bovenpen in het rond: het scharnier komt daar in een beugel.

## Prijzen

Elke prijs in `prijzen.mjs` heeft een bron. "Schatting" betekent dat ik geen prijs vond. Vraag daarvoor een
offerte; het gaat vooral om lasersnijden, de Jansen-profielen en FritsJurgens.

Bronnen:
- staal (koker en strip): metallshopper.de;
- glas: glasopmaat.be en glashandelonline.com;
- scharnier: beslist.be (Argenta Pivotica Pro 150);
- poedercoaten: betuwe-poedercoating.nl en smederijpapendrecht.nl;
- lakken: brico.be en nonpaints.com;
- lasdraad, gas en TIG-draad: weldingshop.nl, weld-toorts.be en valkenpower.com.

Ter vergelijking, verkoopprijzen elders:
- Zelfbouwmarkt.be: vanaf € 899;
- Stalen Deuren Centrum: vanaf € 1 350, plus € 450 voor het plaatsen;
- De Rooy Steel Doors: vanaf € 2 195.

## Opnieuw maken

```bash
node bibliotheek/taatsdeuren/maak-deuren.mjs
node bibliotheek/taatsdeuren/maak-deuren.mjs boog 1100 2500 systeem
node bibliotheek/taatsdeuren/maak-deuren.mjs --koop
```

Eén deur op maat: geef de stijl, de breedte, de hoogte en het profielsysteem mee.

Testen: `npx cross-env VOORBEELDEN=1 vitest run src/qa/qaDeuren.test.ts` (100 stijlen x 3 maten, model en botsingen,
ongeveer 10 minuten). Beelden: `node e2e/tools/look-deuren.mjs`. De 3D-kamer staat in `kamer.mjs` (three.js 0.160).
