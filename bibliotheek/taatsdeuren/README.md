# Bibliotheek: stalen taatsdeuren (2026-11-10)

Het eerste product voor Ians laswerkbedrijf: 50 stalen taatsdeuren met glas, met maten die je aanpast. De eisen en
de antwoorden staan in [EISEN.md](EISEN.md). Alles is te maken met een lastafel, MIG/MAG en TIG; de bogen en kleine
platen laat je lasersnijden.

**Configurator (pagina):** <https://claude.ai/artifact/6ex1en1dk19jj9Q1B1KfhN>. Drie pagina's:
- **Deur** (om aan de klant te tonen):
  - kies een van de 50 stijlen (filter per soort), de maat van de opening, het profiel, het glas, het scharnier, de
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
| Vleugels | 1 of 2 (dubbele deur), of 1 met een vast zijlicht met dezelfde roeden |

## De 50 stijlen

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

\* excl. btw, met koker en strip, glas 44.2 helder, budgetscharnier, poedercoat, € 45/u, plaatsen inbegrepen.

## Wat er per deur is

| Wat | Waar |
|---|---|
| 3D-model (Phlippo CAD) | `modellen/TD-xx-….kcad` |
| Werkblad A3: vooraanzicht met maten, zaaglijst, laserlijst, glaslijst, doorsnede, kostprijs, titelblok | `tekeningen/TD-xx-….svg` |
| Dossier: werkblad, kostprijs met bronnen, werkwijze met uren en lasproces, gewicht tegenover het scharnier | `pdf/TD-xx-….pdf` |
| DXF: laserdelen (bogen, panelen, taatsplaten, greephouders) en de ruiten (voor de glasleverancier) | `dxf/TD-xx-…-laser.dxf`, `-glas.dxf` |
| Alles samen | [Taatsdeuren-bibliotheek.pdf](Taatsdeuren-bibliotheek.pdf) |

## Opbouw

- **Koker en strip:**
  - kader en kozijn: koker 40x40x2, in verstek;
  - roeden: kern platstaal 20x10 met voor en achter een lat 30x3 over het glas;
  - glaslat 15x4 in het kader: voor gelast, achter geschroefd met M4;
  - glas 44.2 in het midden van de diepte.
- **Stalen deurprofielen:** Jansen Economy 50 (30.407, 30.006 en 30.007, met glaslat 402). Met glassponning, maar
  alleen op offerte via een verdeler; ik reken ze met hun gewicht uit de catalogus en een geschatte € 12/kg.
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
```

Eén deur op maat: geef de stijl, de breedte, de hoogte en het profielsysteem mee.

Testen: `npx cross-env VOORBEELDEN=1 vitest run src/qa/qaDeuren.test.ts` (50 stijlen x 3 maten, model en botsingen,
ongeveer 5 minuten). Beelden: `node e2e/tools/look-deuren.mjs`. De 3D-kamer staat in `kamer.mjs` (three.js 0.160).
