# Supervisie 3D-print-extensie (Fable 5.2, 2026-11-18)

Dit is het toezichtsdocument bij `docs/33-eisen-3d-print-extensie.md`. Het is geschreven vóór en tijdens de bouw van fase 1. Op het moment van schrijven bestond `src/print/` nog niet; de waarschuwingen in hoofdstuk 6 gaan daarom over de bestaande code waar de extensie op gaat leunen.

Leeswijzer voor de zekerheid van wat hier staat:

- **Zeker**: volgt uit een openbare specificatie of uit de code in deze repo.
- **Te verifiëren**: uit mijn kennis van Bambu Studio, OrcaSlicer en Elegoo-firmware, niet nagekeken tegen een echt bestand of een echte printer. Die punten zijn telkens zo gemarkeerd. De bouwagent moet ze nakijken tegen een referentiebestand dat Ian zelf uit Bambu Studio of ElegooSlicer exporteert.

---

## 1. Beoordeling van de eisen (docs/33)

### 1.1 Wat ontbreekt

| Nr | Onderwerp | Wat ontbreekt | Advies |
|---|---|---|---|
| E1 | Fijnheid van het mesh | De rebuild-meshes zijn schermtessellaties. Een cilinder met 32 segmenten geeft zichtbare facetten en een volumefout van ongeveer 0,6 %. | De slicer vraagt een eigen tessellatie op met koordefout ≤ 0,01 mm en hoek ≤ 5°, zoals STL-export "Fine". Eis toevoegen. |
| E2 | Assenstelsel | Niet vastgelegd hoe het CAD-assenstelsel naar de printer gaat (Z omhoog, oorsprong linksvoor op het bed). | Eén functie `naarPlaat()` met test. Oorsprong per printer in de database (`origin`: linksvoor of midden). |
| E3 | Bereik van de machine | "Nooit buiten het bed" is te grof. Bambu-startcode rijdt bewust buiten het bed (afveegzone, afvoerkoker). | Twee gebieden per printer: `printableArea` (met `excludeAreas`) voor het model, en `travelLimits` voor start- en eindcode. |
| E4 | Volumetrische limiet | Geen eis voor maximale doorstroming (mm³/s) per filament. Zonder die grens geeft 300 mm/s onderextrusie. | Verplicht veld per materiaal en nozzle; snelheid = min(ingesteld, Qmax / (breedte × hoogte)). |
| E5 | Koeling | Minimale laagtijd, ventilator per laag, ventilator bij overhang en brug ontbreken. | Toevoegen aan eis 5; koelvertraging moet vóór de tijdschatting gebeuren. |
| E6 | Eerste laag | Eigen hoogte, breedte, snelheid, bedtemperatuur en olifantenpootcompensatie ontbreken. | Toevoegen. |
| E7 | Dunne wanden | Geen keuze tussen klassieke wanden en variabele breedte (Arachne). | v1: klassiek plus gap fill. Arachne uitdrukkelijk buiten bereik. |
| E8 | Meerkleuren | Eis 2 noemt AMS alleen als databaseveld. Meerkleurig slicen (toolwissels, spoeltoren, spoelvolumes) is niet beschreven. | Besluit van Ian nodig. Advies: v1 één filament, het datamodel wel met `filamentIndex` per body. Zie 1.2 M3. |
| E9 | Opslag | Niet vastgelegd waar plaat en instellingen bewaard worden. | In het document, met formaatversie en migratie; oude bestanden moeten blijven openen. |
| E10 | Associativiteit | Wat gebeurt er als het part wijzigt na het slicen? | De slice krijgt een rebuild-vlag (zoals een verouderde feature); exporteren van een verouderde slice is geblokkeerd. |
| E11 | Prestaties | Geen tijd- of geheugenbudget. | Zie hoofdstuk 3, fase 2. |
| E12 | Annuleren en voortgang | Niet genoemd. | Slicen in een eigen worker, annuleren binnen 200 ms, voortgang per stap in de statusbalk. |
| E13 | Tekens in G-code | Partnamen met ë of é komen in commentaar. Sommige firmware breekt daarop. | Alleen ASCII 32–126 in G-code. Marlin: regels ≤ 96 tekens. |
| E14 | Getallen | JavaScript schrijft `1e-7` en `-0`; `toLocaleString` geeft een komma. | Eén formatter (`toFixed`, nullen afkappen), test op `e`, `NaN`, `Infinity`, `,`. |
| E15 | MD5 en PNG | `.gcode.3mf` vraagt een MD5 en PNG-afbeeldingen. Web Crypto heeft geen MD5. | Eigen MD5 met de testvectoren uit RFC 1321. PNG via canvas in de renderer, of eigen encoder met `CompressionStream('deflate')`. |
| E16 | Status per printer | Eis 10 zegt "nog te printen", maar er is geen veld voor. | Databaseveld `validatie`: `niet getest` / `bestand geopend in fabrikantslicer` / `geprint op <datum>`. Zichtbaar in de PropertyManager. |
| E17 | Hars | Fase 4 noemt alleen `.goo`. Hars vraagt een ander traject: rasteren, anti-aliasing, belichtingstijden, steunen met punten, uithollen, afvoergaten. | Aparte eisenlijst vóór fase 4 start. |
| E18 | Sequentieel printen, pauze, kleurwissel op hoogte | Niet genoemd. | Buiten bereik verklaren voor v1. |

### 1.2 Wat dubbelzinnig is

- **M1 "Alle printers, ook aangekondigd."** Voor aangekondigde printers bestaan geen betrouwbare waarden. Advies: de database draagt per printer `status` (`leverbaar` / `aangekondigd` / `uit productie`) en per waarde een bron of `AANNAME`. Exporteren voor een printer met een AANNAME op een veiligheidsveld (bedmaat, travel, maximale temperaturen, G-code-soort) geeft een waarschuwing die de gebruiker moet bevestigen, en de eerste regel van het bestand vermeldt het.
- **M2 "Uitvoer die zo op de printer kan."** Dat is zonder proefprint niet te bewijzen. Formuleer het als: het bestand doorstaat de G-code-analyse, opent in de slicer van de fabrikant, en is daarna per printer vrijgegeven door een proefprint.
- **M3 AMS met één filament.** Ook met één kleur moet een Bambu-printer met AMS het filament laden. Dat gebeurt in de startcode (`M620`/`M621`, te verifiëren) en via de filamentlijst in `slice_info.config`. Dit hoort dus al in fase 3, ook als meerkleuren later komt.
- **M4 "Eigen start- en eind-G-code."** Zie risico R1 hieronder. Dit is de zwaarste dubbelzinnigheid in het document.
- **M5 "Vergelijking met een handberekening."** Leg vast welke: kubus 20 mm bij 100 % infill (volume), en een rechte lijn van 100 mm bij bekende versnelling (tijd).
- **M6 `.ctb`** staat bij Ians antwoorden maar niet in fase 4. Nieuwere CTB-versies zijn versleuteld (te verifiëren). Advies: alleen `.goo`, en `.ctb` pas na een besluit.
- **M7 Taal van de interface.** De bestaande tabs zijn Engels ("Sheet Metal", "Evaluate"). Het tabblad heet "3D Print" en de labels volgen de bestaande taal van de app.

### 1.3 Risico's

**R1. Startcode voor Bambu Lab (hoogste risico).** De startcode van Bambu-printers gebruikt niet-gedocumenteerde commando's (onder meer `M1002`, `G29.1`, `M620`/`M621`, `M622`, `M975`; te verifiëren). Ze regelt homing, bednivellering, afvegen van de nozzle, laden uit de AMS en de spoellijn. Eis 7 verbiedt letterlijk overnemen uit AGPL-profielen. Een zelfgeschreven reeks zonder kennis van de machine kan de kop tegen de filamentsnijder (X1/P1) of de afveger (A1) sturen. Drie routes:

1. De gebruiker wijst zijn eigen Bambu Studio-installatie aan en Phlippo CAD leest de startcode daar op zijn eigen pc uit. Er wordt niets verspreid. Dit is de veiligste route voor de machine.
2. Een eigen, minimale startcode op basis van gedocumenteerd gedrag (`G28`, `M140`/`M190`, `M104`/`M109`, `G29`, eigen spoellijn binnen het bed). Werkt mogelijk, maar zonder AMS-laden en zonder afvegen. Per printer te bewijzen met een proefprint.
3. Combinatie: route 2 als standaard met de status "nog te printen", route 1 als knop "Machine G-code importeren".

Advies: route 3. Dit is een besluit voor Ian.

**R2. Licentie.** BambuStudio, OrcaSlicer, ElegooSlicer, PrusaSlicer en UVtools zijn AGPL-3.0; Klipper en Marlin zijn GPL-3.0. Regels voor alle agenten:

- Geen broncode, geen profiel-JSON en geen start-G-code overnemen of vertalen, ook niet "herschreven regel voor regel".
- Feiten mogen: bedmaat, maximale temperatuur, snelheid. De bron is de fabrikantpagina, niet de profielmap van de slicer.
- Bestandsformaten en firmwaregedrag beschrijven mag; het algoritme opnieuw ontwerpen uit de specificatie of uit de wiskunde ook.
- Referentiebestanden uit Bambu Studio bevatten de startcode uit het AGPL-profiel. Ze komen niet in de publieke repo. Bewaar ze in een map die in `.gitignore` staat en leg alleen meetwaarden vast (laagaantal, tijd, gram).
- Het documentbestand `docs/33-printers-bronnen.md` moet voor elke waarde een fabrikant-URL noemen. Een verwijzing naar een GitHub-profiel is geen geldige bron.

**R3. Polygon-offset zonder bibliotheek.** Dit is de moeilijkste bouwsteen (zie 2.3). Een fout hier geeft ontbrekende wanden of crashes op bepaalde lagen. Alternatief dat Ian kan goedkeuren: Clipper2 heeft een permissieve licentie (Boost Software License 1.0) en bestaat als TypeScript-port zonder afhankelijkheden. Eis 8 vraagt daarvoor zijn akkoord. Zonder akkoord: zelf schrijven, met de fuzz- en rasterproeven uit hoofdstuk 3 als harde poort.

**R4. Metadata die de Bambu-firmware controleert.** Niet openbaar gespecificeerd. Zie 2.9 voor de lijst die tegen een referentiebestand gecontroleerd moet worden.

**R5. Elegoo is niet één firmware.** Te verifiëren per model:

| Groep | Firmware | Bijzonderheden |
|---|---|---|
| Neptune 2, 3 (Pro/Plus/Max) | Marlin | Eigen miniatuurformaat voor het scherm (`;gimage:` / `;simage:`, in OrcaSlicer "ColPic"), geen PNG. |
| Neptune 4 (Pro/Plus/Max) | Klipper met Elegoo-scherm | Zelfde miniatuurfamilie; leest `;TIME:`. |
| OrangeStorm Giga | Klipper | Bed 800 × 800 mm; meerdere bedzones. |
| Centauri, Centauri Carbon, Centauri Carbon 2 | Eigen firmware op Klipper-basis | PNG-miniaturen in het blok `; thumbnail begin`; CC2 heeft een meerkleurensysteem. |

De database heeft daarom naast `gcodeFlavor` ook `thumbnailFormat` en `thumbnailSizes` nodig. Een verkeerd miniatuurformaat is onschadelijk (geen plaatje), een verkeerde G-code-soort niet.

**R6. Bogen (G2/G3).** Klipper voert bogen alleen uit met `[gcode_arcs]` in de configuratie; Marlin alleen met `ARC_SUPPORT`. Bambu ondersteunt ze. Advies: standaard uit voor Klipper en Marlin, instelbaar per printer, en pas aan na de poort van fase 3. De analyse, de tijdschatting en de preview moeten bogen kennen, en de boog moet zelf binnen het bed blijven (niet alleen begin en eind).

**R7. Pressure advance.** Klipper: `SET_PRESSURE_ADVANCE ADVANCE=`. Marlin: `M900 K` (alleen met `LIN_ADVANCE`). Bambu: `M900 K.. L.. M..` plus eigen kalibratie (te verifiëren). Advies: standaard niets uitsturen, zodat de waarde van de printer blijft gelden; optioneel veld per filament.

**R8. Firmware-retractie.** `G10`/`G11` werkt in Klipper alleen met `[firmware_retraction]` en in Marlin alleen met `FWRETRACT`. Advies: standaard retractie door de slicer (`G1 E-.. F..`), firmware-retractie als optie per printer, nooit standaard.

**R9. Veiligheid.** Harde regels voor de generator, elk met een negatieve proef:

- Nozzle- en bedtemperatuur ≤ maximum van de printer en binnen het bereik van het materiaal. Overschrijding blokkeert de export.
- Geen `M302` (koud extruderen), geen `M211 S0` (softwaregrenzen uit), geen `M500`/`M502` (EEPROM).
- Geen extrusie voordat `M109` de doeltemperatuur heeft bevestigd.
- Alle XY van het model binnen `printableArea` min `excludeAreas`, inclusief skirt, brim, spoellijn, support, verplaatsingen en bogen.
- Z ≤ bouwhoogte, ook de terugtrekbeweging in de eindcode.
- Snelheid en versnelling ≤ machinegrenzen.
- Eindcode zet nozzle, bed en ventilator uit.
- Waarschuwingen (geen blokkade): ABS/ASA zonder behuizing, PA-CF en andere vezelgevulde materialen zonder geharde nozzle, TPU via AMS.

**R10. Wat zonder printer wel en niet te valideren is.**

| Wel | Niet |
|---|---|
| Geometrie van de lagen tegen analytische vormen | Hechting, warping, stringing |
| Volumebehoud: extrusie tegen modelvolume | Of de firmware het bestand accepteert |
| Grenzen: bed, Z, temperatuur, snelheid | Werkelijke printtijd |
| Syntaxis per G-code-soort | AMS-gedrag en filamentkoppeling op het scherm |
| ZIP- en XML-opbouw, MD5, PNG | Miniaturen op het printerscherm |
| Tijdschatter tegen een onafhankelijke eigen planner | Maatvoering en gewicht van het stuk |
| Bestand openen in Bambu Studio of ElegooSlicer (door Ian) | Belichting en hechting bij hars |

Alles in de rechterkolom blijft "nog te printen" tot de proefprint.

---

## 2. Architectuuradvies

### 2.1 Opbouw en worker

```
src/print/
  types.ts          gegevensmodel: Printer, Filament, Process, Plate, SliceResult
  database/         json + schema + validatie
  plate/            plaatsen, plat op vlak, oriënteren, schikken
  geom/             int-rooster, polygoon-boolean, offset, scanline (zonder three.js)
  slice/            mesh herstellen, lagen, wanden, vlakken, infill, support, naad, volgorde
  motion/           planner en tijdschatting (ook bruikbaar op vreemde G-code)
  gcode/            schrijver per soort (bambu, klipper, marlin), analyser
  pack/             3mf, md5, png, miniaturen
src/workers/slice.worker.ts
```

- **Eigen worker.** Gebruik niet de rebuild-worker: die werkt met "nieuwste verzoek wint" en een reserve-worker voor het model. Slicen krijgt een eigen worker met voortgangsberichten en annuleren.
- **`geom/`, `slice/`, `motion/` en `gcode/` importeren geen three.js en geen DOM.** Dan draaien ze in de worker en in vitest onder Node zonder omwegen.
- **Overdracht met transferables.** Mesh erin als `Float32Array` + `Uint32Array`. Resultaat eruit als platte arrays: per segment x0, y0, x1, y1, breedte, hoogte, soort, snelheid; plus een index per laag. Geen objecten per segment (miljoenen objecten kosten seconden en honderden MB).
- **Pijplijn in stappen met cache.** mesh → lagen → wanden → vlakken → infill/support → paden → G-code. Een wijziging van de infilldichtheid herrekent alleen vanaf "infill". Sleutel per stap: hash van de relevante instellingen.
- **Lagen zijn onafhankelijk** na de stap "vlakken" (die buurlagen nodig heeft). Dat maakt later een verdeling over meerdere workers mogelijk; ontwerp de gegevens per laag daarom zonder gedeelde toestand.
- **G-code als blokken bytes.** Bouw geen ene string (V8 houdt op rond 512 MB en samenvoegen is traag). Schrijf per laag een `Uint8Array` en geef de lijst door aan de zip-schrijver.
- **Determinisme.** Zelfde invoer geeft byte-identieke uitvoer (behalve het tijdstempel). Geen `Math.random` zonder vaste seed, geen volgorde uit `Map`-iteratie over objectsleutels.
- **Variabele laaghoogte** is een optie voor later, maar elke stap moet nu al een hoogte per laag aannemen (`z[i]`, `h[i]`), geen globale constante.

### 2.2 Robuust snijden van het mesh

1. **Geheeltallig rooster.** Reken in eenheden van 0,1 µm (1 mm = 10 000). Bij een bed van 800 mm blijven kruisproducten onder 2^53, dus oriëntatietests zijn exact in een `number`. Een fijner rooster (1 nm) is dat niet meer.
2. **Hoekpunten lassen** op het rooster met een hashtabel. Verwijder daarna driehoeken met twee gelijke hoekpunten of oppervlakte nul.
3. **Topologie.** Bouw rand → driehoeken. Markeer open randen (1 driehoek) en niet-manifold randen (> 2). Controleer de oriëntatie door het getekende volume; negatief volume betekent omgekeerde normalen.
4. **Snijvlak nooit door een hoekpunt.** Zet Z van de hoekpunten op het rooster en snijd op een hoogte die er een halve eenheid naast ligt. Dan raakt geen hoekpunt het vlak en vervallen alle randgevallen (punt op vlak, rand in vlak, horizontale driehoek).
5. **Snijhoogte = midden van de laag** (z_onder + h/2). Dat geeft het beste volumebehoud op schuine vlakken.
6. **Veeg over Z.** Sorteer driehoeken op z_min, houd een actieve lijst bij. Kosten: O(driehoeken + snijpunten), niet O(driehoeken × lagen).
7. **Ketenen via de rand-id**, niet via coördinaten: elk snijsegment loopt van meshrand A naar meshrand B, het volgende segment begint op B. Dat is exact voor een manifold mesh.
8. **Herstel voor open en niet-manifold meshes.** Losse einden koppelen op afstand (eerst ≤ 1 µm, dan oplopend tot 2 mm), daarna de rest melden. De gebruiker krijgt een waarschuwing met het aantal herstelde openingen, in de stijl van What's Wrong.
9. **Vereniging per laag met de vulregel "niet nul"** (positief). Dat lost overlappende bodies en zelfdoorsnijdingen op. Dit vraagt de boolean uit 2.3.
10. **Vereenvoudigen.** Verwijder collineaire punten en punten binnen 2 µm van de vorige; meer vereenvoudiging (Douglas–Peucker 10–20 µm) pas ná de offsets, anders ontstaan doorsnijdingen.

### 2.3 Polygon-offset zonder bibliotheek

**Valkuilen**

- De "ruwe" offsetkromme (elke rand verschuiven, hoeken verbinden) snijdt zichzelf bij holle hoeken en bij smalle delen. Zonder opruimstap blijven lussen met omgekeerde oriëntatie staan.
- Een negatieve offset moet smalle delen laten verdwijnen en een polygoon in stukken kunnen splitsen. Een positieve offset moet gaten laten dichtgroeien en eilanden laten samensmelten.
- Bijna-samenvallende punten, collineaire overlappende randen en snijpunten vlak bij een hoekpunt breken elke implementatie met zwevende komma.
- Verstekhoeken worden oneindig lang bij scherpe hoeken: verstekgrens nodig (bijvoorbeeld 3 × afstand), daarboven afschuinen.
- Ronde hoeken: het aantal boogsegmenten volgt uit een koordefout (10–25 µm), niet uit een vast aantal.
- Naïeve snijpuntzoekers zijn O(n²). Bij een gyroid-achtige contour met 50 000 punten per laag is dat onbruikbaar.

**Aanbevolen algoritme**

Eén robuuste bouwsteen die zowel boolean als offset bedient: een veeglijn-arrangement met windinggetallen op het geheeltallige rooster.

1. Verzamel alle randen. Zoek snijpunten met een veeglijn (Bentley–Ottmann) of, eenvoudiger en goed genoeg, met een uniform rooster van emmers plus exacte oriëntatietests.
2. Rond snijpunten af op het rooster (snap rounding) en splits de randen daar. Herhaal tot er geen nieuwe snijpunten bijkomen; dat is na één of twee rondes het geval.
3. Voeg samenvallende randen samen en tel hun windingbijdrage op.
4. Bereken per vlak het windinggetal en houd de randen over waar het aan één zijde aan de regel voldoet (vereniging: > 0; doorsnede: ≥ 2; verschil: A > 0 en B = 0).
5. Rijg de overgebleven randen tot gesloten contouren; buitencontouren tegen de klok in, gaten met de klok mee.

Offset wordt dan: maak de ruwe offsetkromme per contour (ook de zelfdoorsnijdende), en neem de vereniging met de regel "windinggetal > 0". Lussen met omgekeerde oriëntatie krijgen windinggetal ≤ 0 en vallen vanzelf weg. Voor een negatieve offset: verschuif naar binnen en gebruik dezelfde regel. Dit is hetzelfde principe als in Clipper, opnieuw afgeleid; neem geen code over.

Voorzieningen daarbij:

- "Openen" (−d, dan +d) verwijdert te smalle delen; "sluiten" (+d, dan −d) dicht kieren. Gebruik openen met d = 0,1 × lijnbreedte na elke wandoffset.
- Contouren kleiner dan een drempel (oppervlak < breedte²) weg.
- Elke offset controleert achteraf: geen zelfdoorsnijding, juiste oriëntatie, gaten binnen hun buitencontour.

**Orakel voor de tests.** Reken dezelfde offset uit op een raster (afstandsveld, cel 20 µm) en vergelijk het oppervlak. Een rasteroffset is traag en onnauwkeurig maar faalt nooit, en is daarmee een onafhankelijke controle.

**Open lijnen knippen** (infill, support) heeft geen boolean nodig: snijd de lijn met alle randen, sorteer de snijpunten, en houd de stukken met een even/oneven-telling. Dat is robuust en snel.

### 2.4 Wanden, vlakken en infill

- **Stromingsmodel.** Doorsnede van een rups = rechthoek met halve cirkels: A = (b − h) × h + π × (h/2)². Hartafstand tussen rupsen = b − h × (1 − π/4). Filamentlengte E = A × L / (π × d²/4) × flowfactor. Leg dit in één functie vast; de handberekening in de tests gebruikt dezelfde formule onafhankelijk uitgeschreven.
- **Wanden.** Buitenwand op −b/2, volgende op telkens één hartafstand. Na elke stap de resten zoeken (oorspronkelijk gebied min de teruggegroeide wand) voor gap fill.
- **Boven- en ondervlakken.** Bovenvlak van laag i = binnengebied(i) − binnengebied(i+1). Projecteer over N lagen naar beneden en verenig. Ondervlak omgekeerd. Massief gebied iets vergroten (1 × lijnbreedte) zodat het op de wanden van de buurlaag steunt.
- **Bruggen.** Ondervlak zonder materiaal eronder. Richting: loodrecht op de langste steunrand, of de richting met de kortste vrije overspanning. Eigen snelheid, ventilator 100 %, ronde draad met diameter = nozzle.
- **Rechtlijnig en raster.** Evenwijdige lijnen op afstand b / dichtheid, geknipt volgens 2.3. Rechtlijnig wisselt per laag 45°/135°; raster legt beide in elke laag. Verbind lijneinden langs de wand om retracties te sparen.
- **Gyroid.** Niveaulijn van sin x cos y + sin y cos z + sin z cos x = 0 op hoogte z. Maak de golflijnen analytisch per periode (richting wisselt afhankelijk van z), niet met marching squares op een fijn raster. Dichtheid kalibreren: lijnlengte per oppervlak moet dezelfde zijn als bij rechtlijnig van dezelfde dichtheid.
- **Honingraat.** Zigzaglijnen in zeshoekpatroon, twee fasen die per laag wisselen; de gedeelde zijden vallen samen en krijgen dus dubbele extrusie tenzij de breedte daar gehalveerd wordt.
- **Overlap** infill op wand: 15–25 % van de lijnbreedte.
- **Naad.** Standaard uitgelijnd op de meest holle hoek, anders achterzijde; opties dichtstbij en willekeurig (met vaste seed).
- **Volgorde.** Dichtstbijzijnde buur met een ruimtelijk rooster; binnenwand vóór buitenwand als standaard. Retractie bij verplaatsing boven een drempel of over een wand; Z-hop als optie.

### 2.5 Support

**Normaal**

1. Overhang van laag i = gebied(i) − offset(gebied(i−1), +h × tan(drempelhoek)). Kleine stukjes (< 2 × lijnbreedte) weglaten.
2. Projecteer naar beneden tot het bed of tot het model.
3. Trek het model af, vergroot met de XY-afstand (0,35 × nozzle tot 0,5 mm).
4. Z-afstand boven: één laag (bij 0,2 mm). Onder: idem.
5. Tussenlagen (interface) dicht, de rest rechtlijnig 15–20 %.

**Boom** (zwaarste onderdeel; plan als fase 2b)

1. Bemonster de overhang in steunpunten (afstand 2–3 mm).
2. Elke punt daalt per laag en mag hoogstens h × tan(takhoek) opzij.
3. Bouw per laag een botsingskaart: model vergroot met takstraal + XY-afstand. Een raster (0,2–0,4 mm) is hier goed genoeg en veel eenvoudiger dan polygonen.
4. Takken bewegen weg van het model en naar elkaar toe; binnen elkaars straal smelten ze samen. De straal groeit naar beneden.
5. Per laag worden de takken cirkels (of veelhoeken) met één of twee wanden.

Poort: geen tak snijdt het model, elke tak eindigt op het bed of op het model, elk steunpunt is gedragen.

### 2.6 Tijdschatting

De schatter is een aparte module die op G-code werkt (eigen of vreemd). Dan is hij los te toetsen tegen de koptekst van een referentiebestand.

**Gemeenschappelijk: trapeziumplanner met vooruitkijken**

1. Per beweging: afstand, gevraagde snelheid, versnelling (afhankelijk van soort: print, verplaatsing, buitenwand, eerste laag).
2. Knoopsnelheid tussen twee bewegingen uit de hoek.
3. Voorwaartse en achterwaartse doorloop: v_eind² ≤ v_begin² + 2 × a × d, in beide richtingen.
4. Per beweging: versnellen, kruisen, vertragen; tijd optellen. Als de afstand te kort is voor de kruissnelheid: driehoeksprofiel.

**Klipper**

- Hoeksnelheid uit `square_corner_velocity` (standaard 5 mm/s): jd = scv² × (√2 − 1) / a, en v² = a × jd × sin(θ/2) / (1 − sin(θ/2)), met θ de hoek tussen de segmenten. Ook begrensd door de centripetale versnelling over de korte segmenten.
- `minimum_cruise_ratio` (standaard 0,5; in oudere versies `max_accel_to_decel`) dempt het versnellen en remmen bij korte zigzagbewegingen. Dit weglaten geeft een te korte tijd bij infill.
- Versnelling komt uit `SET_VELOCITY_LIMIT` of uit de printerconfiguratie; de database moet de fabriekswaarde hebben.
- Bron: https://www.klipper3d.org/Kinematics.html en https://www.klipper3d.org/Config_Reference.html#printer

**Marlin**

- Klassieke jerk (sprong per as) of junction deviation, afhankelijk van de build. `M204 P/T` versnelling, `M203` maximale snelheid, `M201` versnelling per as, `M205` jerk.
- Bron: https://marlinfw.org/docs/gcode/M204.html, https://marlinfw.org/docs/gcode/M205.html, https://marlinfw.org/docs/configuration/configuration.html

**Bambu**

- De firmware is gesloten. Bambu Studio schat met een planner in Marlin-stijl en machinegrenzen (versnelling en jerk per as). Reken zo, en kalibreer tegen de tijd in de koptekst van referentiebestanden.
- Bambu meldt twee tijden: modeltijd en totale tijd. Het verschil is de voorbereiding (opwarmen, homing, nivelleren, laden), enkele minuten. Leg die als vaste post per printer in de database, gemarkeerd AANNAME tot gemeten.

**Verder**

- Opwarmtijd, homing en nivelleren als aparte posten; toon "printen" en "totaal" apart.
- Retractie en Z-hop tellen mee (bij veel retracties al snel 5 %).
- De volumetrische grens en de koelvertraging worden in de slicer toegepast, niet in de schatter. De schatter leest alleen wat in de G-code staat.
- Bogen: lengte = straal × hoek; knoopsnelheid uit de raaklijnen.

### 2.7 G-code-opbouw

```
; kop: Phlippo CAD <versie>, printer, filament, proces, instellingenhash, waarschuwingen
; miniaturen (Elegoo, formaat per printer)
; startcode (per printer, met ingevulde temperaturen)
M83                      ; relatieve extrusie (advies: geen G92 E0 per laag nodig, geen afrondingsdrift)
per laag:
  ; laagmarkering + Z + hoogte
  M73 P.. R..            ; voortgang
  ventilator, temperatuurwissel na laag 1
  per pad: ; soortmarkering, G1 ...
; eindcode
; staart: tijd, filament (mm, cm3, g), aantal lagen
```

| Onderdeel | Bambu | Klipper (Elegoo) | Marlin (Elegoo) |
|---|---|---|---|
| Laagmarkering | `; CHANGE_LAYER`, `; Z_HEIGHT:`, `; LAYER_HEIGHT:` (te verifiëren) | `;LAYER_CHANGE`, `;Z:`, `;HEIGHT:` | idem |
| Soort lijn | `; FEATURE: Outer wall` (te verifiëren) | `;TYPE:External perimeter` | idem |
| Koptekst | `; HEADER_BLOCK_START … END`, daarna `; CONFIG_BLOCK_START … END` (te verifiëren) | vrij; `;TIME:` voor het Elegoo-scherm | idem |
| Versnelling | `M204 S..` | `SET_VELOCITY_LIMIT ACCEL=..` of `M204 S..` | `M204 P.. T..` |
| Pressure advance | `M900 K..` | `SET_PRESSURE_ADVANCE ADVANCE=..` | `M900 K..` |
| Ventilator | `M106 P1/P2/P3 S..` (onderdeel, hulp, kamer) | `M106 S..` | `M106 S..` |
| Bogen | toegestaan | alleen met `[gcode_arcs]` | alleen met `ARC_SUPPORT` |
| Objecten | — | `EXCLUDE_OBJECT_DEFINE` (optioneel) | `M486` (optioneel) |

Regels voor de schrijver:

- XY en Z met 3 decimalen, E met 5, F als geheel getal. Eén formatter, geen exponent, geen `-0`.
- Alleen ASCII, regeleinde `\n`, bestand eindigt op een regeleinde. Marlin: regel ≤ 96 tekens.
- Eén schrijver met drie "dialecten" achter één interface; geen `if (bambu)` verspreid door de slicer.
- Sjablonen voor start- en eindcode met benoemde variabelen (`{nozzle_temp}`, `{bed_temp}`, `{first_layer_bbox}`). Een onbekende variabele is een fout, geen lege tekst.
- De **analyser** (`gcode/analyse.ts`) is de tegenhanger: hij leest elk dialect terug en levert lagen, extrusie, grenzen, temperaturen en tijd. Hij deelt geen code met de schrijver, anders bewijst de test niets.

### 2.8 3MF en ZIP

**Kern (zeker, uit de specificatie)**

- 3MF is een OPC-pakket (ZIP). Verplicht: `[Content_Types].xml`, `_rels/.rels` met een relatie van het type `http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel` naar het modeldeel, en dat modeldeel (gebruikelijk `3D/3dmodel.model`).
- Model-XML: namespace `http://schemas.microsoft.com/3dmanufacturing/core/2015/02`, `unit`, `<resources>` met `<object>`/`<mesh>`, `<build>` met `<item objectid transform>`. De transform is een 3 × 4-matrix in rijvolgorde.
- Driehoeken tegen de klok in van buiten gezien; een object van het type `model` moet manifold zijn.
- Miniatuur: relatie van het type `http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail`.
- ZIP: opslaan of deflate, geen andere methodes; namen in UTF-8; geen ZIP64 nodig onder 4 GB.

**Advies voor de schrijver**

- G-code van 50–150 MB hoort gecomprimeerd in het pakket. Gebruik `CompressionStream('deflate-raw')`; die bestaat in Chromium, in workers en in Node (vitest). De bestaande schrijvers slaan alleen op (zie 6.1).
- Schrijf `[Content_Types].xml` als eerste vermelding.
- Bouw de model-XML in blokken bytes, niet als één string.

**`.3mf`-project** (zonder G-code): de kern hierboven plus eigen instellingen in `Metadata/phlippo_print.json` met een eigen relatie- en inhoudstype. Probeer niet het projectformaat van Bambu Studio na te maken; een geldig kern-3MF opent daar gewoon als geometrie.

### 2.9 Bambu `.gcode.3mf` (alles te verifiëren tegen een referentiebestand)

Verwachte inhoud van het pakket:

```
[Content_Types].xml            (ook png en gcode als type)
_rels/.rels
3D/3dmodel.model               (mag minimaal zijn)
Metadata/plate_1.gcode
Metadata/plate_1.gcode.md5     (MD5 van de G-code, hex)
Metadata/plate_1.png           (plaatafbeelding)
Metadata/plate_1_small.png
Metadata/plate_no_light_1.png, top_1.png, pick_1.png
Metadata/plate_1.json
Metadata/slice_info.config     (XML)
Metadata/model_settings.config (XML)
Metadata/project_settings.config (JSON)
Metadata/_rels/model_settings.config.rels
```

Wat de printer of de app vermoedelijk leest en dus moet kloppen:

1. `slice_info.config`: `printer_model_id`, `nozzle_diameters`, `prediction` (seconden), `weight` (gram), en per filament `id`, `type`, `color`, `used_m`, `used_g`, `tray_info_idx`. De filamentlijst bepaalt de AMS-koppeling op het scherm.
2. De MD5 moet overeenkomen met de G-code, byte voor byte.
3. De koptekst van de G-code: totaal aantal lagen, tijd, filament; de printer toont voortgang uit `M73 P/R` en de laagteller uit `M73 L` of `M991` (te verifiëren).
4. `printer_model` en `nozzle_diameter` in het configuratieblok; een verkeerd model geeft een weigering of een waarschuwing.
5. Het type bouwplaat (`curr_bed_type`).

Werkwijze: Ian exporteert één kubus van 20 mm uit Bambu Studio voor zijn printer. De bouwagent legt de structuur daarvan naast de onze (namen, verplichte sleutels, volgorde), zonder de inhoud van profielen of startcode over te nemen. Het verschil komt als tabel in het faseverslag.

Let op: Bambu heeft in 2025 de toegang van software van derden via netwerk en cloud beperkt. Dat raakt deze extensie niet, omdat er alleen een bestand via SD-kaart of USB gaat. Of elke printerreeks een `.gcode.3mf` van een vreemde slicer vanaf de kaart aanneemt, is pas na een proefprint zeker.

### 2.10 Hars (fase 4, kort)

- Elegoo heeft het `.goo`-formaat openbaar beschreven (te verifiëren: https://github.com/elegooofficial/GOO). Opbouw: kop met machine- en belichtingsgegevens, voorbeeldafbeeldingen in RGB565, daarna per laag een definitie en RLE-gecodeerde pixels, big-endian.
- Rasteren rechtstreeks uit de laagcontouren met scanlijnen naar RLE-reeksen. Bouw nooit een volledige bitmap: een 12K-scherm heeft bijna 60 miljoen pixels per laag.
- Anti-aliasing: dekking per pixel uit de exacte doorsnede van de contour met de pixelrij (grijswaarden).
- Per printer in de database: resolutie, pixelmaat in X en Y (niet altijd vierkant), bouwhoogte, bestandsformaat en -versie.
- Harssteunen, uithollen en afvoergaten zijn een eigen ontwerp; zonder die functies is hars alleen bruikbaar voor stukken die plat op de plaat kunnen.

### 2.11 Bronnen

| Onderwerp | URL |
|---|---|
| 3MF-kernspecificatie | https://3mf.io/spec/ en https://github.com/3MFConsortium/spec_core/blob/master/3MF%20Core%20Specification.md |
| 3MF Production-extensie | https://github.com/3MFConsortium/spec_production |
| OPC (ECMA-376 deel 2) | https://ecma-international.org/publications-and-standards/standards/ecma-376/ |
| ZIP (APPNOTE) | https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT |
| MD5 (RFC 1321) | https://www.rfc-editor.org/rfc/rfc1321 |
| PNG-specificatie | https://www.w3.org/TR/png/ |
| Bambu Lab wiki | https://wiki.bambulab.com/en/home (zoek daar: "3MF", "custom G-code", "third-party integration"; exacte paden nagaan) |
| Bambu G-code, onofficieel overzicht van de gemeenschap | https://forum.bambulab.com/t/bambu-lab-x1-specific-g-code/666 |
| Bambu Studio (AGPL, alleen als gedrag, geen code) | https://github.com/bambulab/BambuStudio |
| Klipper G-codes | https://www.klipper3d.org/G-Codes.html |
| Klipper kinematica en planner | https://www.klipper3d.org/Kinematics.html |
| Klipper pressure advance | https://www.klipper3d.org/Pressure_Advance.html |
| Klipper en slicers | https://www.klipper3d.org/Slicers.html |
| Klipper exclude object | https://www.klipper3d.org/Exclude_Object.html |
| Klipper configuratie (`gcode_arcs`, `firmware_retraction`) | https://www.klipper3d.org/Config_Reference.html |
| Marlin G-code-index | https://marlinfw.org/meta/gcode/ |
| Marlin linear advance | https://marlinfw.org/docs/features/lin_advance.html en https://marlinfw.org/docs/gcode/M900.html |
| Marlin bogen | https://marlinfw.org/docs/gcode/G002-G003.html |
| Marlin firmware-retractie | https://marlinfw.org/docs/gcode/G010.html |
| Marlin voortgang | https://marlinfw.org/docs/gcode/M073.html |
| Elegoo wiki en downloads | https://wiki.elegoo.com/ en https://www.elegoo.com/pages/download |
| ElegooSlicer (AGPL, alleen als gedrag) | https://github.com/ELEGOO-3D/ElegooSlicer |
| Elegoo GOO-formaat | https://github.com/elegooofficial/GOO (te verifiëren) |

---

## 3. Acceptatiecriteria per fase

Een fase is pas klaar als elke regel aantoonbaar slaagt (test of foto). "Nog te printen" is een toegestane status voor wat alleen een printer kan bewijzen, maar moet dan zo in de interface en in het verslag staan.

### 3.0 Proefstukken

| Nr | Stuk | Waarvoor |
|---|---|---|
| T1 | Kalibratiekubus 20 mm | volume, tijd, vrijgave per printer |
| T2 | Cilinder Ø20 × 20 | tessellatie, oppervlak per laag |
| T3 | Bol Ø20 | schuine boven- en ondervlakken, support onderaan |
| T4 | Doos 40 × 40 × 20, wand 0,8 / 0,45 / 0,3 mm | dunne wanden, verdwijnende offset |
| T5 | Overhangtrap 20° tot 70° | overhangdetectie, drempelhoek |
| T6 | Brug 10 tot 60 mm | brugdetectie en -richting |
| T7 | Plaat met gaten Ø2 tot Ø10, liggend en staand | gaten, naad |
| T8 | Kegel en piramide | laagaantal, toplagen op een helling |
| T9 | T-vorm met uitkraging 30 mm | normaal en boomsupport |
| T10 | Pen Ø1 × 20 en toren 5 × 5 × 80 | minimale laagtijd, kleine contouren |
| T11 | Vlakke plaat 250 × 250 × 2 | bedgrenzen, uitsluitzones, eerste laag |
| T12 | Deurkruk (het vaste voorbeeld van Ian) | echt onderdeel, oriënteren, support |
| T13 | Rooster van de inbouwafzuiging (`voorbeelden/`) | echt onderdeel met veel gaten |
| T14 | Assembly met twee bodies die elkaar overlappen | vereniging per laag |
| T15 | Kapotte meshes: gat, omgekeerde normalen, dubbele vlakken, ontaarde driehoeken, dikte nul | herstel en waarschuwingen |
| T16 | Zwaar: ± 250 000 driehoeken, 150 mm hoog | prestaties |

### 3.1 Fase 1: tabblad, database, plaat

**Database**

- Schema-validatie slaagt voor elke printer en elk materiaal; geen dubbele id's.
- Elke waarde heeft een fabrikant-URL of de markering AANNAME. Geen bron die naar een slicerprofiel op GitHub wijst.
- Telling per reeks tegen een controlelijst in `docs/33-printers-bronnen.md`. Minimaal verwacht (door de database-agent te bevestigen): Bambu X1, X1 Carbon, X1E, P1P, P1S, P2S, A1 mini, A1, H2D, H2D Pro, H2S, H2C; Elegoo Neptune 2/3/4-reeksen met Pro/Plus/Max, OrangeStorm Giga, Centauri, Centauri Carbon, Centauri Carbon 2; harsreeksen Mars, Saturn, Jupiter.
- Plausibiliteit: bed 100–1000 mm per as; nozzle maximaal 200–400 °C; bed maximaal ≤ 140 °C; snelheid ≤ 1000 mm/s; versnelling ≤ 30 000 mm/s². Buiten die grenzen faalt de test.
- Elke printer heeft `gcodeFlavor`, `printableArea`, `travelLimits`, `excludeAreas`, `origin`, `thumbnailFormat`, `status`, `validatie`.
- Aangekondigde printers hebben `status: aangekondigd` en een datum.
- Elk materiaal heeft dichtheid, temperatuurbereik nozzle en bed, maximale doorstroming per nozzle, en de vlaggen "behuizing nodig" en "geharde nozzle nodig".

**Plaat**

- Tessellatie voor de slicer: volume van het mesh wijkt ≤ 0,1 % af van het volume uit de kernel (T1, T2, T3).
- Plat op vlak: de normaal van het gekozen vlak wijkt ≤ 0,01° af van −Z; laagste punt op z = 0 ± 0,001 mm.
- Automatisch schikken: geen overlap; onderlinge afstand ≥ de ingestelde tussenruimte; alles binnen `printableArea` min `excludeAreas`; 20 kubussen in < 1 s; zelfde invoer geeft zelfde uitkomst.
- Automatisch oriënteren: T1 blijft staan; T9 komt op de rug; T12 krijgt een oriëntatie met minder overhangoppervlak dan de beginstand. Het criterium (overhangoppervlak, hoogte, contactvlak) staat in het verslag.
- Buiten het bouwvolume: het stuk kleurt rood, er verschijnt een waarschuwing, slicen en exporteren zijn geblokkeerd (negatieve proef, ook voor een stuk dat 0,1 mm uitsteekt en voor een stuk in een uitsluitzone).
- Verplaatsen, draaien en schalen zijn ongedaan te maken; opslaan en heropenen geeft dezelfde plaat (matrix gelijk tot 1e-9).
- Meerdere platen: toevoegen, wisselen, verwijderen; een stuk hoort bij precies één plaat.
- Een bestand zonder printgegevens opent ongewijzigd; een bestand met printgegevens opent in de vorige programmaversie zonder fout, of weigert met een duidelijke melding.

**Tabblad**

- e2e: tabblad zichtbaar bij part en assembly, niet bij een tekening; elke knop opent zijn PropertyManager; OK en Annuleren werken; Esc annuleert.
- Bestaande poorten blijven groen: typecheck, vitest, regelbudget, `prefsWired`, `uiText`, `testGroups`, documenttellingen.
- Foto's: tabblad, PropertyManager, plaat met T1 en met T12, een stuk buiten het volume.

### 3.2 Fase 2: slicerkern en preview

**Lagen**

- Aantal lagen exact: 1 + afgerond naar boven((H − h_eerste) / h), met een tolerantie van 1 µm op H.
- Oppervlak per laag tegen de analytische waarde: ≤ 0,2 % voor T1, ≤ 0,5 % voor T2 en T3.
- Som van oppervlak × laaghoogte tegen het meshvolume: ≤ 0,5 % (T1, T2, T12), ≤ 1,5 % voor T3 en T8 (trapvorming).
- T14: het oppervlak van de vereniging is gelijk aan dat van het in CAD verenigde stuk, ≤ 0,2 %.
- T15: geen uitzondering, geen NaN; elk gebrek wordt geteld en gemeld; het herstelde stuk wijkt ≤ 2 % in volume af van het hele origineel.

**Offset en boolean**

- 10 000 willekeurige polygonen (ook zelfdoorsnijdend, met gaten, met samenvallende punten): geen uitzondering, geen NaN, uitkomst zonder zelfdoorsnijding, oriëntatie juist.
- Oppervlak tegen het rasterorakel: ≤ 0,5 % of ≤ 0,05 mm², de grootste van de twee.
- Convexe polygoon: +d dan −d geeft het origineel binnen 2 µm (verstekhoeken).
- T4: de wand van 0,3 mm verdwijnt bij een offset van −0,225 mm zonder restjes; die van 0,8 mm geeft precies twee contouren.
- Snelheid: offset van een contour met 10 000 punten in < 50 ms.

**Paden**

- Elke hartlijn van een rups ligt binnen de laagcontour, verkleind met b/2, met 0,02 mm speling.
- Buurwanden overlappen ≤ 10 % van de breedte en laten ≤ 5 % kier.
- Extrusievolume bij 100 % infill tegen het modelvolume: binnen ±3 % (T1, T2), ±5 % (T12).
- Extrusievolume bij 15 % infill tegen de handberekening (wanden + boven/onder + infill, uitgeschreven in de test): ±5 % voor T1.
- Infilldichtheid: lijnlengte × breedte per oppervlak binnen ±5 % relatief van de ingestelde waarde, voor alle vier de patronen.
- Gram = volume × dichtheid, meter = volume / (π d²/4); onderling consistent tot 0,1 %.
- Tegen Bambu Studio met dezelfde instellingen (T1 en T12, door Ian aangeleverd): gram binnen ±10 %, aantal lagen exact. Afwijkingen daarboven worden verklaard, niet weggemoffeld.
- Skirt en brim binnen het bed; de brim sluit aan op de eerste laag (afstand ≤ 0,05 mm).
- Eerste laag: eigen hoogte, breedte en snelheid aantoonbaar in de uitvoer.
- Snelheid × breedte × hoogte ≤ maximale doorstroming van het filament, voor elk segment.

**Support**

- T5: vlakken steiler dan de drempel krijgen support, vlakkere niet (per trede gecontroleerd).
- T9 en T3: elk bemonsterd overhangpunt heeft support binnen 1,5 × lijnafstand, op de ingestelde Z-afstand ±1 laag.
- Support snijdt het model nergens; XY-afstand ≥ 80 % van de instelling.
- Boom: elke tak eindigt op het bed of op het model; geen zwevende delen; takhoek ≤ instelling.
- T6: bruggen tot de ingestelde lengte krijgen geen support; de brugrichting ligt binnen 5° van de overspanning.

**Tijd**

- Rechte lijn van 100 mm, 100 mm/s, 1000 mm/s²: 1,100 s ± 0,001 (handberekening).
- De schatter tegen een tweede, eenvoudige eigen simulatie met vaste tijdstap: ≤ 1 % (T1, T12).
- De schatter op een referentie-G-code uit Bambu Studio tegen de tijd in de koptekst daarvan: ≤ 5 % (modeltijd). Idem voor een referentie uit ElegooSlicer in Klipper- en Marlin-dialect.
- Tegen een echte print: ≤ 10 %. Status "nog te printen".

**Prestaties** (hardware-GL, de pc van Ian; software-GL telt alleen voor de functionele proeven)

- T1 bij 0,2 mm: < 1 s. T12: < 10 s. T16: < 60 s.
- Tijdens het slicen geen taak op de hoofdthread langer dan 50 ms; annuleren binnen 200 ms.
- Geheugen van de worker < 1,5 GB bij T16.
- Preview: laagschuif reageert binnen 50 ms; ≥ 30 beelden per seconde bij 2 miljoen segmenten.
- Twee keer slicen geeft identieke uitvoer.

**Preview**

- Het aantal lagen, de tijd en het gewicht in de preview zijn dezelfde getallen als in de G-code (één bron).
- Elke soort lijn heeft een eigen kleur en is afzonderlijk aan en uit te zetten; de legenda toont tijd en aandeel per soort en de som is 100 % ± 0,1.
- Foto's: T1 en T12 in de kleurmodi soort, snelheid, laaghoogte; een laag halverwege; support zichtbaar bij T9.

### 3.3 Fase 3: uitvoer

**G-code-analyse** (voor elk dialect, op T1, T9, T11, T12)

- Elke XY van het model binnen `printableArea` min `excludeAreas`; start- en eindcode binnen `travelLimits`; bogen meegerekend.
- Z per laag niet dalend (behalve Z-hop), Z ≤ bouwhoogte.
- Temperaturen ≤ maximum van de printer en binnen het materiaalbereik.
- Geen extrusie vóór `M109`; geen `M302`, `M211 S0`, `M500`, `M502`.
- Snelheden en versnellingen ≤ machinegrenzen.
- Retractie in balans: som terugtrekken = som terugduwen ± 0,01 mm per laag.
- Netto filament in de G-code = de waarde in de koptekst en in de preview ± 0,1 %.
- Eindcode zet nozzle, bed en ventilator uit.
- Alleen ASCII; geen `e`, `NaN`, `Infinity` of komma in getallen; Marlin-regels ≤ 96 tekens; bestand eindigt op een regeleinde.
- Kruisproef: geen Klipper-commando's in Marlin-uitvoer en omgekeerd; geen Bambu-commando's in Elegoo-uitvoer.
- Bogen aan: maximale afwijking van de oorspronkelijke lijn ≤ 0,05 mm; analyse en tijd blijven binnen de grenzen hierboven.

**Negatieve proeven** (elk moet de export weigeren of een bevestiging vragen)

- Stuk buiten het bed of in een uitsluitzone; stuk hoger dan de bouwhoogte.
- Temperatuur boven het maximum; materiaal dat de printer niet aankan.
- Verouderde slice na een wijziging van het part.
- Printer met AANNAME op een veiligheidsveld of status "aangekondigd": bevestiging en vermelding in de kop.
- Onbekende variabele in een startcode-sjabloon.
- Lege plaat.

**Pakketten**

- De ZIP opent met de eigen lezer (`readZip`) en met `Expand-Archive` van Windows; CRC's kloppen.
- `[Content_Types].xml` is de eerste vermelding; alle XML is welgevormd; elke relatie wijst naar een bestaand deel.
- `.3mf`-project: heen en terug geeft dezelfde driehoeken en transforms (≤ 1 µm); eenheid millimeter.
- `.gcode.3mf`: de MD5 komt overeen; PNG's hebben een geldige signatuur en de afmetingen uit het referentiebestand; `prediction` en `weight` zijn gelijk aan de waarden in de G-code; alle sleutels uit de vergelijkingstabel met het referentiebestand aanwezig.
- Elegoo-miniaturen: het blok decodeert terug naar dezelfde pixels.
- G-code van 100 MB: pakket schrijven in < 10 s, gecomprimeerd.
- Handmatig door Ian: het bestand opent in Bambu Studio respectievelijk ElegooSlicer en toont hetzelfde aantal lagen en een tijd binnen ±5 %. Foto in het verslag.

**Vrijgave per printer** (status "nog te printen" tot dit gedaan is)

- T1 geprint: 20,00 ± 0,15 mm in X en Y, ± 0,10 mm in Z; gewicht binnen ±5 % van de voorspelling; tijd binnen ±10 %; geen botsing, geen foutmelding op de printer; miniatuur en voortgang zichtbaar.
- Daarna T12 als echt stuk.

### 3.4 Fase 4: hars

- Database: resolutie, pixelmaat X en Y, bouwvolume, formaat en versie per printer, met bron.
- Volume: aantal belichte pixels (gewogen met grijswaarde) × pixeloppervlak × laaghoogte tegen het meshvolume: ≤ 0,5 % (T1, T2), ≤ 1,5 % (T3).
- Heen en terug: het geschreven `.goo` wordt door een eigen, losse lezer gedecodeerd tot dezelfde lagen, pixel voor pixel.
- Kop: elk veld op de plaats en met de lengte uit de specificatie; bestandsgrootte gelijk aan de som van de delen; controlesommen kloppen.
- Rasteren van één 12K-laag in < 150 ms; geheugen < 1 GB bij 3000 lagen.
- Belichtingstijden en heftafstanden binnen de grenzen van de printer; negatieve proef bij overschrijding.
- Handmatig door Ian: het bestand opent in de slicer van Elegoo of in een onafhankelijke viewer en toont dezelfde lagen.
- Vrijgave: proefprint per printer; tot dan "nog te printen".

---

## 4. Controle van de interface in SOLIDWORKS-stijl

Uitgangspunt: SOLIDWORKS heeft zelf een Print3D-PropertyManager (Bestand ▸ Print3D) met de tabbladen Settings en Preview. Die is het referentiepunt voor de vorm. De werkvolgorde komt van Bambu Studio: voorbereiden, slicen, bekijken, exporteren.

### 4.1 Tabblad "3D Print"

- Staat rechts van Evaluate, bij part en assembly; niet bij een tekening. Te verbergen via Customize, zoals de andere tabbladen.
- Groepen van links naar rechts, met scheidingslijnen: **Printer** (Printer, Filament, Process) · **Plate** (Add to Plate, Lay Flat, Auto Orient, Arrange, Move/Rotate/Scale, Add Plate) · **Slice** (Slice Plate, Slice All) · **Preview** (Layer Preview, Color By) · **Export** (Export G-code, Export 3MF Project).
- Grote knop met tekst eronder voor de hoofdactie per groep, kleine knoppen voor de rest; uitklappijl voor varianten. Zelfde afmetingen, lettertype en hover-kleur als de bestaande tabbladen.
- Iconen in de bestaande lijnstijl en kleurtaal; geen iconen uit Bambu Studio.
- Knoppen die nog niet kunnen, zijn grijs met een tooltip die zegt waarom ("Slice the plate first").
- Tooltip met naam, korte uitleg en sneltoets, in de bestaande opmaak.
- Slice en Export tonen een rebuild-teken zodra de slice verouderd is.

### 4.2 PropertyManager

- Vervangt de FeatureManager links, met tabje in de managerbalk.
- Kop: icoon, titel, groen vinkje en rood kruis; punaise waar herhalen zinvol is (Add to Plate).
- Gele berichtbalk bovenaan voor de volgende stap of een waarschuwing.
- Tabbladen **Settings** en **Preview**, zoals in Print3D.
- Inklapbare groepen: Printer · Filament · Quality (laaghoogte, wanden) · Strength (boven/onder, infill) · Speed · Support · Others (skirt, brim, naad).
- Invoervelden zijn de bestaande getalvelden met eenheid en pijltjes, komma of punt volgens de documentinstelling, en ze nemen vergelijkingen aan zoals elders.
- Selectievakken (voor Lay Flat het vlak, voor Add to Plate de bodies) in de bestaande kleuren, met de bestaande vlak-kiesmethode.
- Keuzelijsten voor printer en filament met een zoekveld; aangekondigde printers dragen het label "announced", niet-geteste printers "not print-tested".
- Elke wijziging werkt de plaat direct bij; OK bewaart, Annuleren herstelt, Esc is Annuleren, Enter is OK.
- Standaardwaarden komen uit het procesprofiel; een gewijzigde waarde is herkenbaar en heeft "terug naar profiel".

### 4.3 FeatureManager

- Een map "3D Print" in de boom met daaronder Printer, Filament, en per plaat een knoop met de stukken.
- Rechtsklik: Edit, Suppress (stuk niet printen), Delete, Move to Plate.
- Fouten en waarschuwingen met de bestaande rode en gele tekens en via What's Wrong.

### 4.4 Plaatweergave

- Eigen omgeving, te verlaten met de bevestigingshoek rechtsboven (zoals Exit Sketch).
- Het bed als vlak met rooster (10 mm fijn, 50 mm vet), de oorsprong gemarkeerd, de naam van de printer op het bed.
- Bouwvolume als dunne draadkubus; uitsluitzones gearceerd.
- Z wijst omhoog in de triade; de standaardaanzichten (Ctrl+1 tot 7, spatiebalk) werken ten opzichte van de printer.
- Muis en toetsen identiek aan de rest: middelste knop draaien, Ctrl+middelste verschuiven, wiel zoomen, F zoomt op de plaat.
- Stukken slepen met de bestaande triade; draaien in stappen met Shift; getallen intypen in de PropertyManager.
- Een stuk buiten het volume of in een uitsluitzone kleurt rood; overlappende stukken oranje.
- Lay Flat: het vlak onder de muis licht op in de selectiekleur; een klik legt het neer.
- Meerdere platen als tabjes onder in het venster (zoals de tabjes Model en Motion Study).
- Statusbalk rechtsonder: toestand ("Editing Plate 1", "Slicing 43 %", "Sliced") en eenheden.

### 4.5 Preview

- Verticale laagschuif rechts met twee grepen (onder- en bovengrens) en het laagnummer met hoogte; horizontale bewegingsschuif onder voor de bewegingen binnen de bovenste laag.
- Pijl omhoog en omlaag verzetten één laag, Shift maakt er tien van; pijl links en rechts verzetten de beweging.
- Legenda in de hoek van het grafische gebied: soort lijn met kleur, tijd, aandeel, en een oogje om de soort te verbergen. Verplaatsingen, retracties en naden als afzonderlijke opties.
- Kleurmodi: Line Type, Speed, Layer Height, Line Width, Flow, Fan. Bij de doorlopende modi een schaal met minimum en maximum.
- Samenvatting in de PropertyManager (tab Preview): totale tijd en printtijd apart, filament in gram, meter en euro, aantal lagen, waarschuwingen.
- De prijs per kilo is per filament in te stellen; bedragen in euro met het decimaalteken van de documentinstelling.
- De kop van de nozzle als eenvoudige markering op de laatste zichtbare beweging.
- Slicen toont voortgang per stap in de statusbalk en is met Esc te onderbreken; de interface blijft intussen bruikbaar.

### 4.6 Wat ik bij elke foto controleer

- Geen vreemd element: geen donkere Bambu-balk, geen groene accentkleur, geen andere knopvorm.
- Lettertype, grootte, marges en groepskoppen gelijk aan een bestaande PropertyManager ernaast.
- Elke tekst in de taal van de rest van de app en door `uiText` gedekt.
- De deurkruk als voorbeeld op elke foto van een update.

---

## 5. Reviewritme

Na elke fase, vóór de commit, controleer ik in deze volgorde. Een rode regel houdt de fase tegen.

**Altijd**

1. `TASKS.md`: stappen aangevinkt, niets geschrapt.
2. Diff gelezen op: nieuwe pakketten (verboden zonder akkoord), overgenomen AGPL-tekst (steekproef op kenmerkende commentaarregels en variabelenamen uit Bambu Studio en OrcaSlicer), bestanden buiten het eigen gebied.
3. Poorten: typecheck, vitest per groep, regelbudget, `prefsWired`, `uiText`, `testGroups`, documenttellingen. Uitvoer zelf gelezen, niet de samenvatting van de agent.
4. Elke bewering in het faseverslag heeft een test of een foto; het platform staat erbij.
5. De lijst "nog te printen" is bijgewerkt en zichtbaar in de interface.
6. `graphify update .` is gedraaid.

**Na fase 1**

- Steekproef van tien printers: elke waarde nagelopen bij de genoemde bron. Bij meer dan één fout: de hele database opnieuw na.
- Alle aangekondigde printers afzonderlijk: status, datum, bron.
- De acceptatieregels uit 3.1; foto's volgens hoofdstuk 4 naast een bestaande PropertyManager gelegd.
- Opslagformaat: oud bestand openen, nieuw bestand in de vorige versie.

**Na fase 2**

- De fuzz- en rasterproeven uit 3.2 zelf gedraaid met een andere seed dan die van de agent.
- Handberekening van T1 (volume en tijd) zelf uitgeschreven en ernaast gelegd.
- De preview van T1, T9 en T12 laag voor laag bekeken op ontbrekende wanden, zwevende lijnen en support door het model.
- Prestatiemeting op hardware-GL, met de meetwijze in het verslag.
- Hoofdthread: geen lange taken tijdens het slicen.

**Na fase 3**

- De analyser gedraaid op elk dialect, en op een referentiebestand van de fabrikantslicer om te bewijzen dat de analyser zelf klopt.
- Alle negatieve proeven.
- De vergelijkingstabel van de `.gcode.3mf` met het referentiebestand, sleutel voor sleutel.
- Start- en eindcode per printerreeks regel voor regel gelezen: elke regel verklaard uit openbare documentatie, of gemarkeerd als niet te onderbouwen.
- Ian opent de bestanden in Bambu Studio en ElegooSlicer; daarna de proefprint van T1 op zijn printer. Pas dan verandert de status van die printer.

**Na fase 4**

- Losse lezer voor `.goo` door een andere agent geschreven dan de schrijver.
- Kop byte voor byte naast de specificatie.
- Volumeproef en geheugenmeting.
- Ian opent het bestand in de Elegoo-software; proefprint.

**Tijdens de bouw**

- Bij elke tussenmelding van een agent kijk ik naar de zes punten onder "Altijd" voor het gewijzigde deel.
- Besluiten die bij Ian horen, leg ik voor en neem ik niet zelf (zie hoofdstuk 7).

---

## 6. Vroege waarschuwingen uit de bestaande code

`src/print/` bestond nog niet toen ik keek (18 november, tijdens fase 1). Dit zijn de punten in de bestaande code waar de bouwagenten tegenaan lopen.

### 6.1 Twee ZIP-schrijvers, allebei zonder compressie

- `src/core/document/zip.ts` heeft `writeZip` (opslaan, UTF-8-vlag) en een lezer die deflate aankan.
- `src/core/document/export3d.ts` heeft een tweede schrijver, `zipStore`, met een eigen kopie van `crc32`.
- Geen van beide comprimeert. Een `.gcode.3mf` met 100 MB G-code wordt dan 100 MB.
- `MAX_ENTRY_BYTES` in `zip.ts` is 64 MB. Als die grens ook bij schrijven of bij het teruglezen in de tests geldt, faalt een groot bestand.

Advies: de printmodule gebruikt één schrijver, uitgebreid met deflate via `CompressionStream('deflate-raw')` (asynchroon), en maakt geen derde kopie. De grens van 64 MB bewust kiezen voor G-code.

### 6.2 De bestaande 3MF-export is te licht als basis

- `threeMfModelXml` bouwt de hele XML als één lijst van strings. Bij een groot mesh kost dat veel geheugen.
- `<item>` heeft geen `transform`; de plaat heeft die nodig voor elk stuk.
- Namen worden ontdaan van `<>&"` in plaats van ge-escaped.
- Er is geen miniatuur en geen metadata.

Advies: de printmodule krijgt een eigen 3MF-schrijver in `src/print/pack/` die de kern deelt, of de bestaande functie wordt uitgebreid met transform en blokken. Niet stilzwijgend het gedrag van de bestaande export wijzigen: daar hangen tests aan.

### 6.3 De rebuild-worker is niet geschikt voor slicen

`rebuildWorker.ts` annuleert een lopend verzoek als er een nieuwer komt en bewaakt een tijdsbudget voor "hangen". Een slice van een minuut zou als vastgelopen gelden. Eigen worker, eigen client.

### 6.4 Het lint is één groot bestand

`Ribbon.tsx` telt 633 regels en de tabbladen voor assembly en tekening staan al in eigen bestanden die na de start worden geladen. Het tabblad "3D Print" hoort als `PrintTab.tsx` in dezelfde vorm, lui geladen, zodat de slicer de starttijd niet raakt en het regelbudget heel blijft.

### 6.5 Tabbladen per documentsoort

Er zijn drie lijsten (`TABS`, `ASSEMBLY_TABS`, `DRAWING_TABS`). Het nieuwe tabblad moet in de eerste twee en mag niet in de derde. De voorkeur `customize.tabs.hidden` moet het ook kennen.

### 6.6 Bestaande poorten die nieuw werk raken

Uit eerdere QA-rondes: `prefsWired` (elke nieuwe voorkeur moet aangesloten zijn), `uiText`, het regelbudget per bestand, `test-groups.json` met zijn eigen test, en de documenttellingen. Een nieuwe map met tests die niet in `test-groups.json` staat, maakt de CI rood.

### 6.7 Afhankelijkheden

`package.json` heeft geen polygoonbibliotheek. `three-bvh-csg` werkt in 3D en helpt niet bij 2D-offsets. OpenCascade kan 2D-offsets maken, maar is per laag veel te traag en zit in een andere worker. Dit bevestigt dat 2.3 het kritieke pad is.

### 6.8 JSON-database in de bundel

`printerDatabase.json` en `materialProfiles.json` komen via een import in de bundel. Laad ze lui met het tabblad. De schema-validatie draait in de test, niet bij elke start.

---

## 7. Besluiten voor Ian

1. **Startcode Bambu** (R1): importeren uit de eigen Bambu Studio-installatie, een eigen minimale code, of beide. Advies: beide.
2. **Polygoonbibliotheek** (R3): Clipper2-port met Boost-licentie toelaten, of zelf schrijven. Advies: zelf schrijven is haalbaar maar kost de meeste tijd en draagt het grootste foutrisico; een akkoord op Clipper2 haalt dat risico weg.
3. **Meerkleuren** (E8): in v1 of later. Advies: later, met het datamodel er nu al op voorbereid.
4. **Referentiebestanden**: per printer die Ian bezit één kubus van 20 mm uit Bambu Studio of ElegooSlicer, buiten de repo bewaard.
5. **Welke printers heeft Ian zelf?** Die krijgen voorrang bij de vrijgave; de rest blijft "nog te printen".
6. **`.ctb`** (M6): wel of niet.
7. **Aangekondigde printers**: exporteren toestaan met een bevestiging, of blokkeren tot de printer leverbaar is. Advies: toestaan met bevestiging.
