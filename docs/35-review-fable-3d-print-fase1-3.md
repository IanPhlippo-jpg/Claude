# Review 3D Print-extensie fase 1 tot 3 (Fable 5.2, 2026-11-18)

Beoordeeld: commit `199af38` tegen de acceptatiecriteria van `docs/34-supervisie-fable-3d-print.md` (3.1, 3.2, 3.3) en de eisen en besluiten in `docs/33-eisen-3d-print-extensie.md`. Er is geen code gewijzigd en niets gecommit.

## Oordeel in het kort

| Fase | Oordeel |
|---|---|
| 1 Tabblad, database, plaat | **Niet vrijgegeven.** Dicht bij vrijgave; voorwaarden in hoofdstuk 5. |
| 2 Slicerkern en preview | **Niet vrijgegeven.** De polygoonkern geeft foute lagen op elk stuk met ronde staande wanden (P1-2). |
| 3 G-code en bestanden | **Niet vrijgegeven.** De eerste beweging na de startcode rijdt de nozzle op Z0 naar X0 Y0 (P1-1), en skirt, support en spoeltoren kunnen buiten het bed komen (P1-3). **Geen van de bestanden mag nu naar een printer.** |

Telling over 80 criteria: **32 gehaald, 25 deels, 15 niet gehaald, 8 niet te meten** (geen referentiebestand, geen printer, geen hardware-GL-meting).

Bevindingen: **5 × P1, 14 × P2, 15 × P3.**

Wat goed is: de laagdoorsnede zelf (aantal lagen, oppervlak, volume: afwijking 0,000 tot 0,005 %), determinisme, de snelheid op de kubus (53 tot 135 ms), de ZIP-, MD5- en PNG-schrijvers, de zuiverheid van de drie dialecten, de temperatuurvolgorde, de eindcode, en de opbouw van tabblad en PropertyManager in SOLIDWORKS-stijl.

## 1. Hoe ik gemeten heb

- Platform: Windows 11, Node (vitest en eigen scripts), geen hardware-GL. De volledige e2e is niet gedraaid en er is niets geïnstalleerd.
- Tests van de bouwer: `npx vitest run src/print` → 5 bestanden, 50 tests, alle groen (11,4 s). Poorten: `tsc -b` exit 0, `tools/line-budget.cjs` ok, `uiText`/`testGroups`/`prefsWired` 7 van 7 groen.
- Eigen meetscripts (TypeScript, gebundeld met de esbuild uit `node_modules`), in `C:\Users\ianph\AppData\Local\Temp\claude\db4b568e22bf3a28\89d8d793-f0ea-4467-813d-a66f7610fca6\scratchpad\review-scripts\`:
  - `m1.ts`: lagen, volumes, kapotte meshes, fuzz van boolean en offset met een andere seed (987654321) en een eigen rasterorakel, paden binnen de contour, infilldichtheid, support, overhangtrap, bruggen.
  - `m2.ts`: snelheid, determinisme, extrusievolume, tijd, grenzen aan de bedrand, alle 30 FDM-printers, Marlin-regellengte, meerkleuren, gyroid per laag, minimale laagtijd, ZIP van 100 MB.
  - `m3.ts`, `m4.ts`, `m5.ts`: oorzaak van de ontbrekende vulling op een cilinder; boolean op bijna gelijke veelhoeken.
  - `m6.ts`: zwaar stuk T16 en de opbouw van de preview.
  - `gc.mjs`: eigen G-code-lezer (deelt geen code met de repo) op `Kruk.gcode` en `plate_1.gcode`.
- `Kruk.gcode.3mf` uitgepakt in een lege map (`...\scratchpad\review-unzip\`), elk deel met de hand gelezen; ook uitgepakt met `Expand-Archive` van Windows.
- Foto's 01 tot 09 bekeken naast hoofdstuk 4 van docs/34.

## 2. Bevindingen

### P1: onveilige of foute uitvoer (kan een printer beschadigen of een print bederven)

**P1-1. De eerste beweging van elke print rijdt de nozzle naar X0 Y0 Z0.**
- Waar: `src/print/build.ts:55` (startpositie `cx = cy = cz = 0`), `:101` (de terugtrekregel krijgt `x: cx, y: cy, z: cz`), `:306-308` (de schrijver zet X, Y en Z erbij omdat de vorige positie nog onbekend is).
- Bewijs: `Kruk.gcode.3mf`, `Metadata/plate_1.gcode` regel 49, direct na de spoellijn: `G1 X0 Y0 Z0 E-0.8 F1800`. Idem in `Kruk.gcode` (Klipper) regel 100, bij de Marlin-uitvoer en bij elke toolwissel op laag 1. De nozzle staat dan op X120 Y3 Z1.
- Waarom fout: de hete nozzle zakt naar Z0 en schraapt 120 mm over de plaat, door de verse spoellijn, naar de hoek linksvoor. Op de X1- en P1-reeks ligt daar de zone van de filamentsnijder. Gevolg: beschadigde plaat of nozzle, of een botsing.
- Waarom de tests het niet zien: `slicer.test.ts:133-139` eist alleen `moveMin >= 0`; nul telt als "op het bed" en Z wordt niet gecontroleerd.
- Oplossing: een terugtrekregel schrijft alleen `G1 E-… F…`, nooit coördinaten. De slicer begint met een onbekende positie en maakt de eerste verplaatsing in twee stappen: eerst `G1 Z{z + hop}`, dan XY. Analyser en test: geen beweging met Z < eerste laaghoogte na de startcode, en geen extrusie- of terugtrekregel met XY-verplaatsing.

**P1-2. De eigen polygoon-boolean faalt op bijna samenvallende randen; daardoor klopt de laagopbouw niet op elk stuk met ronde staande wanden.**
- Waar: `src/print/geom/boolean.ts:276-302` (`resolve`: hoogstens drie splitsrondes, daarna een windingmonster op 0,273 roostereenheid naast elke rand, `:293`), gebruikt door `src/print/slice/slicer.ts:124-131` (welk deel is afgedekt door de lagen erboven en eronder).
- Bewijs (m4, m5):
  - Cilinder Ø20, 96 segmenten: de contouren van opeenvolgende lagen verschillen een enkele roostereenheid (0,1 µm). De doorsnede van vier zulke lagen geeft 313,9 → 326,8 → 324,4 → 67,0 mm² (hoort 313,9 te blijven), in 10 tot 63 lussen.
  - Gevolg in de slicer: 89 van de 93 tussenlagen krijgen "top/bottom"-vulling waar infill hoort (buis: 89 van 93; cilinder met 360 segmenten: 7 van 93; rechte en gedraaide kubus: 0).
  - Bij 100 % infill mist 42 % van het volume op de cilinder (3632 tegen 6279 mm³); per laag is de vulgraad 18 tot 97 %.
  - 300 willekeurige paren van bijna gelijke veelhoeken (verschil ≤ 1 roostereenheid): 300 van 300 geven een fout oppervlak in doorsnede, vereniging of verschil (ergste 307 mm² op 314).
  - Zichtbaar op foto 04 (laag 118 van de kruk): de doorsnede van de staande cilinder is helemaal rood (Top and bottom). In het bestand: 17 450 stukken "Top surface" tegen 5 302 stukken infill.
- Waarom fout: gaten in dichte lagen op de ene plaats, massieve vulling op de andere; gewicht en tijd kloppen niet; een print kan mislukken. De test op de deurkruk haalt ±5 % bij toeval (`deurkruk.test.ts:33`).
- Oplossing: Clipper2 achter `geom/polygons.ts` zetten. Ian heeft dat goedgekeurd; alleen de installatie is geweigerd, dus dat is een stap voor Ian of de hoofdsessie. Zonder Clipper2: samenvallende en bijna samenvallende randen eerst samenvoegen (snap rounding op "hot pixels" tot er niets meer splitst, geen vaste drie rondes) en de winding per rand optellen in plaats van naast de rand te bemonsteren. In beide gevallen een harde test erbij: bijna gelijke veelhoeken, en "geen skin in de tussenlagen van een cilinder".

**P1-3. Bewegingen buiten het bed en in uitsluitzones worden niet tegengehouden.**
- Waar: `src/print/run.ts:29-42` (controleert alleen de vier hoekpunten van de omhullende van het model), `src/print/slice/slicer.ts:172-181` (skirt en brim), `src/print/slice/support.ts:118-126` (boomtakken), `src/print/build.ts:139-154` (spoeltoren), `src/print/gcode/dialects.ts:43-46` (spoellijn), `src/print/printerDatabase.json` (`excludeAreas: []` bij alle 30 FDM-printers, als AANNAME).
- Bewijs (m2):
  - Kubus op 0..20 mm met de standaard-skirt: geen melding, G-code loopt van x = −3,25 tot 23,25 en y = −3,25.
  - T-stuk tegen x = 0 met boomsupport: x = −0,475.
  - Spoeltoren op 240,240 met breedte 35: bewegingen tot x = 275 op een bed van 256. Een stuk op de plaats van de toren (196..231): geen melding, de toren wordt door het stuk geprint.
  - Synthetische uitsluitzone 100..120 onder een plaat van 50..200: geen melding (de hoekpunten liggen erbuiten).
  - De spoellijn (X20..120, Y3) wordt niet getoetst tegen het model, de skirt of een uitsluitzone.
- Waarom fout: Klipper breekt af met "move out of range", Marlin en Bambu rijden tegen de eindstop of het frame. De database kent geen enkele uitsluitzone, terwijl bijvoorbeeld de X1- en P1-reeks linksvoor een bekende niet-bedrukbare hoek hebben (te verifiëren tegen een referentiebestand).
- Oplossing: één functie `checkToolpaths` die ná het slicen elke XY van elke beweging (model, skirt, brim, support, toren, spoellijn) toetst tegen `printableArea` min `excludeAreas`, en de export weigert met de naam van het onderdeel dat buiten valt. Skirt, brim en support afknippen op het bed. De uitsluitproef op de doorsnede van de contour met de zone, niet op hoekpunten. De spoellijn alleen leggen waar ze vrij ligt. Zolang `excludeAreas` en `travelLimits` AANNAME zijn: bevestiging bij export (zie P2-11).

**P1-4. Meerkleuren op Bambu: de filamentwissel gebeurt boven het werkstuk en zonder de reeks die de machine nodig heeft.**
- Waar: `src/print/gcode/dialects.ts:118` (`M620 S{n}A`, `T{n}`, `M621 S{n}A`), `src/print/build.ts:159-169` en `:139-154`.
- Bewijs (m2, twee kubussen op de P1S): de wissel wordt uitgestuurd op de plek waar de vorige extrusie eindigde, zonder terugtrekken, zonder wegrijden, zonder snijden en zonder spoelen naar de afvoerkoker. Daarna gaat het spoelen op de toren met `F13333` (222 mm/s), ook op de eerste laag (`build.ts:142` gebruikt `speedInnerWall` en slaat de eerste-laagsnelheid over). Het spoelvolume is vast 140 mm³, voor elk kleurenpaar gelijk.
- Verder: bij één kleur wordt er nooit geladen uit de AMS (geen `M620`/`T` in de startcode). Een P1S met AMS en lege nozzle print dan lucht.
- Waarom fout: een wissel duurt op de machine tientallen seconden met een hete nozzle boven het stuk (klodder, brandplek), en of de firmware zonder de snijbeweging überhaupt wisselt, is niet te onderbouwen uit openbare bronnen. Dit is precies risico R1 uit docs/34.
- Oplossing: de export van meerkleuren-G-code met de eigen minimale code blokkeren tot een proefprint ze vrijgeeft, of alleen toelaten met een door Ian geïmporteerde wisselcode (`change_filament_gcode` uit zijn eigen Bambu Studio, naast de startcode). In elk geval: vóór de wissel terugtrekken en naar de toren rijden, de toren op de eerste laag op eerste-laagsnelheid, toren toetsen op overlap met stukken en op het bed (P1-3). Bij één kleur met AMS: slot kiezen in de interface en laden in de startcode, of een duidelijke melding "laad het filament zelf".

**P1-5. Geïmporteerde Bambu-startcode wordt op elke Bambu-printer toegepast en met verzonnen waarden gevuld.**
- Waar: `src/app/print/printStore.ts:236` (elke printer met `gcodeFlavor === 'bambu'` krijgt `bambuStart`), `src/print/gcode/importTemplate.ts:14-26`.
- Wat er fout is: de naam van het geïmporteerde profiel wordt niet vergeleken met de gekozen printer. Startcode van een A1 (afveger achter het bed) op een P1S (afveger en koker achterin, snijder links), of omgekeerd, stuurt de kop naar plekken die op de andere machine iets anders zijn. Daarnaast krijgen variabelen vaste waarden die niet uit de slice komen: `total_layer_count: 0`, `first_layer_print_min: [0, 0]`, `first_layer_print_size` = het hele bed, `outer_wall_volumetric_speed: 10`, `curr_bed_type: 'Textured PEI Plate'`, `initial_extruder: 0` (ook als slot 2 begint).
- Oplossing: bij import de printernaam uit het profiel (`printer_model` of `name`) bewaren en de code alleen gebruiken als die bij de gekozen printer hoort; anders weigeren met uitleg. De variabelen uit de echte slice vullen (aantal lagen, omhullende van de eerste laag, eerste filament, bedtype als instelling). Een variabele zonder echte waarde is een weigering, geen vaste gok.

### P2: fout of risico dat een print kan bederven, zonder direct gevaar voor de machine

**P2-1. Gyroid legt op een deel van de lagen 2,4 keer te veel materiaal.** `src/print/slice/infill.ts:40-70`, de begrenzing op `:60`. Meting (kubus 60 mm, ingesteld 0,15): per laag 0,13 tot 0,38; 18 van 50 lagen boven 0,16; bij 0,40 loopt het op tot 0,95. De test meet één laag (`slicer.test.ts:74`). Het profiel "strong" gebruikt gyroid standaard. Oplossing: de niveaulijn niet afkappen met `clamp`, maar de lijn daar onderbreken, en de richting kiezen per kolom; test over alle lagen van één periode.

**P2-2. Support onder hellingen ontbreekt: de drempel werkt in de praktijk op ongeveer 9° in plaats van 30°.** `src/print/slice/support.ts:44`: `poly.opening(..., lineWidth)` haalt alles weg wat smaller is dan 2 × de lijnbreedte (0,9 mm), terwijl de overhangstrook per laag bij 20° maar 0,2 mm breed is. Meting (geschoren doos): 20°, 25° en 28° krijgen geen support. Oplossing: geen opening op de strook per laag; de overhang bepalen op het ondervlak (of stroken over de lagen optellen) en pas daarna kleine eilanden op oppervlak weglaten.

**P2-3. Bruglijnen lopen in de verkeerde richting en zijn niet verankerd.** `src/print/slice/slicer.ts:186-199` kiest de richting met de kortste gemiddelde lijn; dat is de smalle kant van de brug, niet de overspanning. Meting: brug van 30 en 60 mm langs X krijgt lijnen op 105° (eis: binnen 5° van 0°), brug van 10 mm op 60°. De lijnen eindigen exact op de rand van de pijlers (`slicer.ts:134`), dus zonder oplegging. Oplossing: de richting bepalen uit de randen waar de brug op materiaal van de laag eronder rust (loodrecht op de langste steunrand) en het bruggebied 1 tot 2 lijnbreedten over de steun laten doorlopen.

**P2-4. Dubbele terugtrek na de startcode: de print begint met 0,8 mm filament tekort.** `dialects.ts:47` trekt terug na de spoellijn; `build.ts:99-101` trekt bij de eerste verplaatsing nog eens terug en duwt maar één keer terug. Eigen lezer: 148 323 extrusieregels met een openstaande terugtrek van 0,8 mm (Marlin: 1,2 mm). Zonder skirt mist het begin van de eerste wand. Oplossing: de slicer weet dat de startcode teruggetrokken eindigt en slaat de eerste terugtrek over.

**P2-5. De minimale laagtijd wordt niet gehaald.** `build.ts:236-242`: alleen vertragen, met een ondergrens van 10 mm/s. Meting: pen Ø1 × 20 → 0,13 s per laag, toren 5 × 5 → 2,2 s per laag bij een instelling van 6 s. Kleine doorsneden smelten weg. Oplossing: na het vertragen de rest van de tijd wegrijden van het stuk (of wachten boven de toren of de skirt), en de ventilator dan op maximum.

**P2-6. Offset is niet volledig robuust.** Eigen fuzz: 2 van 1432 gevallen buiten de eis, 1 met een zelfdoorsnijding in de uitkomst; ergste geval 15,04 tegen 15,72 mm² (−4,3 %) bij −0,2 mm, bevestigd met een fijner raster (cel 0,01 mm). Bij −0,19 en −0,21 klopt het wel. In een print is dat een ontbrekend stuk wand op een enkele laag. `geom/offset.ts` heeft geen controle achteraf (docs/34 2.3 vroeg die). Valt samen met P1-2.

**P2-7. Herstel van kapotte meshes: een ontbrekend zijvlak geeft −50 % volume, en de meeste gebreken worden niet gemeld.** `src/print/slice/contours.ts:117-124` en `slicer.ts:102-106`. Meting T15: zijvlak weg → 4000 in plaats van 8000 mm³ (eis: ≤ 2 %). Gat in de bodem, dubbele vlakken, een los vlak met dikte nul en half omgekeerde normalen: geen enkele melding, omdat `topology()` alleen wordt aangeroepen als een laag open bleef. Oplossing: `topology()` altijd draaien bij Add to Plate en tellen (open randen, niet-manifold, ontaard, omgekeerd); open ketens sluiten op het kortste pad tussen de losse einden.

**P2-8. Een gewijzigd part maakt de slice niet verouderd.** `printStore.ts:109-111`: de sleutel bevat matrix en instellingen, niet het mesh. Een stuk op de plaat is een momentopname; na een wijziging in het model slicet en exporteert de extensie het oude stuk, zonder teken. Oplossing: per stuk de herkomst (body of component) en een hash van het mesh bewaren; bij elke rebuild vergelijken, het stuk verversen en de slice als verouderd tonen.

**P2-9. Elegoo: geen bednivellering in de startcode.** `dialects.ts:81-91`: `G28` zonder iets erna. In Marlin zet `G28` het mesh uit (er hoort `M420 S1` of `G29` na); in Klipper wordt geen `BED_MESH_PROFILE LOAD` gedaan. Gevolg: een slechte eerste laag op een bed van 225 tot 800 mm. Per printer vast te leggen in de database (te verifiëren per model).

**P2-10. De preview wordt op de hoofdthread opgebouwd.** `src/app/print/PlateView.tsx:166` → `previewGeometry.ts`. Meting: 426 ms voor 217 000 segmenten (de kruk), 2,9 s en 549 MB buffers voor 2 miljoen. De eis is geen taak langer dan 50 ms. Elke wissel van kleurmodus of soort lijn bouwt alles opnieuw. Oplossing: de buffers in de worker maken en overdragen; kleur als losse buffer die alleen bij een moduswissel verandert; verbergen via een indexbereik per soort.

**P2-11. Geen bevestiging voor printers met een AANNAME op een veiligheidsveld.** `printStore.ts:293` vraagt alleen bevestiging bij `status: announced`. Alle 30 FDM-printers hebben AANNAME op `travelLimits` en `excludeAreas`; de kop van het bestand noemt alleen "nog te printen". Dit geldt extra voor printers met twee koppen of een gereedschapswisselaar (H2D, H2D Pro, H2C, X2D, H3C, Centauri X Ultra): daar is met `G28`/`G29` en zonder `T` niet te zeggen welke nozzle print. Oplossing: bevestiging met de lijst van aannames, dezelfde lijst als commentaar in de kop, en export voor printers met `toolheads > 1` geblokkeerd tot er een referentie is.

**P2-12. De plaat wordt niet in het document bewaard.** Gemeld door de bouwer; het criterium "opslaan en heropenen geeft dezelfde plaat" is niet gehaald (docs/34 E9). Nodig vóór vrijgave van fase 1.

**P2-13. Verplaatsing kost ongeveer een derde van de tijd.** Foto 03: Travel 32,6 %. Oorzaak: elke vullijn is een los pad (`slicer.ts:139-140`) met een verplaatsing op 500 mm/s ertussen; de lijnen worden niet aan elkaar geregen langs de wand (docs/34 2.4). Samen met P1-2 (alles is "skin") is de kruk daardoor veel trager dan nodig. Oplossing: zigzag verbinden binnen een gebied; daarna pas "avoid crossing walls".

**P2-14. Tests zijn verruimd tot ze slaagden.** Dit verbergt drie van de bevindingen hierboven.
- `geom.test.ts:130`: de rastertolerantie is `max(0,5 %, 0,05) + 0,4` mm².
- `geom.test.ts:139`: offset van 10 000 punten `< 2000` ms (eis 50; gemeten 128 tot 155 ms).
- `geom.test.ts:73-91`: 300 willekeurige polygonen, alleen vereniging, geen proef op zelfdoorsnijding (eis: 10 000).
- `slicer.test.ts:114`: ±5 % in plaats van ±3 %; `:154`: 5 % in plaats van 1 % en tegen de analyser in plaats van een simulatie met vaste tijdstap; `:74`: infilldichtheid op één laag.
- `plate.test.ts`/`database.ts:103`: snelheidsgrens 2000 in plaats van 1000 mm/s.
Elke verruiming hoort in het faseverslag met de reden, of terug naar de eis.

### P3: kleiner, of afwerking

1. **Eenheid in de Bambu-kop.** `build.ts:331`: `total filament volume [cm^3] : 19411.29` is mm³ (hoort 19,41).
2. **Marlin-regels langer dan 96 tekens.** Neptune 3-reeks: `;gimage:` 1476, `;simage:` 1180 en het startcommentaar 109 tekens. Het zijn commentaarregels, maar het criterium zegt ≤ 96 en geen test bewaakt het. Splitsen zoals het scherm het verwacht (te verifiëren), commentaar inkorten.
3. **Netto filament in de G-code tegen de kop: 0,28 % verschil bij de kubus** (eis 0,1 %): de spoellijn (4,6 mm) telt niet mee in kop en preview.
4. **Convexe veelhoek +0,4 dan −0,4 mm: 4,2 tot 4,8 µm afwijking** (eis 2 µm), door `arcTol` 50 eenheden in `geom/polygons.ts:31`.
5. **14 773 regels met `E0`** en 5 254 bewegingen korter dan 5 µm in de kruk (bijvoorbeeld `G1 Y113.079 E0`): punten samenvoegen vóór het schrijven.
6. **Naad "aligned".** `build.ts:119-121`: één sleutel per filament, niet per lus. Met gaten of meerdere stukken verspringt de naad naar de laatst geprinte lus.
7. **Rand van het bed.** `run.ts:37` weigert een stuk dat exact tot 256 mm reikt ("outside the bed"), terwijl `plate.ts:141` het met speling goedkeurt en het stuk dus niet rood kleurt.
8. **Arrange** (`plate.ts:117-133`) kent geen uitsluitzones (1 van 20 kubussen in een zone) en verdeelt niet over platen: 200 kubussen → 100 buiten het bed.
9. **OK en Annuleren doen hetzelfde.** `PrintPM.tsx:46-53`: beide sluiten; Annuleren herstelt niets en Esc is niet aangesloten (docs/34 4.2).
10. **`readZip` weigert een eigen pakket met meer dan 64 MB G-code** (`zip.ts:23`, `:108`); schrijven gaat goed (100 MB in 0,93 s).
11. **Tijdschatter.** `build.ts:227` rekent verplaatsingen met de maximale versnelling van de printer, terwijl de G-code één versnelling zet (`M204 S10000`); `minimum_cruise_ratio` ontbreekt; de voorbereidingstijd is vast 300 of 180 s. De analyser wijkt 3,6 % af.
12. **Benaming.** De G-code noemt alle dichte vulling `; FEATURE: Top surface`, de preview "Top and bottom". De knop Slice Plate toont op de foto's de tooltip "Cancel Slicing".
13. **Database.** De Centauri zonder Carbon ontbreekt zonder vermelding in `docs/33-printers-bronnen.md` (Neptune 2 is daar wel verantwoord). Maximale doorstroming is één getal per materiaal, niet per nozzle. Bij de P1S staat Wikipedia als bron.
14. **Bambu-pakket.** `plate_1.json`, `top_1.png`, `pick_1.png` en `plate_no_light_1.png` ontbreken, `3D/3dmodel.model` is leeg, `tray_info_idx` is leeg, model-id's bestaan voor 8 van de 15 Bambu-printers (`packages.ts:82`). Of de printer dat aanneemt is alleen met een referentiebestand en een proef te zeggen.
15. **Interface tegenover hoofdstuk 4.** Ontbreekt: de map "3D Print" in de FeatureManager, getallen intypen voor verplaatsen en draaien (nu knoppen ±10 en 90°), kleurmodi Line Width, Flow en Fan, het oogje in de legenda (staat als vinkje in de PropertyManager), de bevestigingshoek rechtsboven, en de toestand "Editing Plate 1" rechts in de statusbalk (er staat "Editing Part").

## 3. Criteria fase voor fase

Status: gehaald, deels, niet gehaald, niet te meten. "Meting" verwijst naar de scripts uit hoofdstuk 1.

### 3.1 Fase 1: tabblad, database, plaat

| Nr | Criterium | Status | Bewijs |
|---|---|---|---|
| 1.1 | Schema-validatie, geen dubbele id's | gehaald | `plate.test.ts` "every entry of the real database passes validation (51 printers)"; eigen telling: 0 dubbel |
| 1.2 | Elke waarde een fabrikant-URL of AANNAME; geen GitHub-profiel | gehaald | 102 bronnen, 0 naar GitHub; hosts bambulab.com, elegoo.com, prnewswire, 1 × Wikipedia |
| 1.3 | Telling per reeks tegen de controlelijst | deels | 51 printers (30 FDM). Neptune 2 bewust weggelaten (`33-printers-bronnen.md:122`); Centauri zonder Carbon ontbreekt zonder vermelding |
| 1.4 | Plausibiliteitsgrenzen | deels | Grens snelheid verruimd naar 2000 mm/s (`database.ts:103`) voor de H3C (1400) |
| 1.5 | Verplichte velden per printer | gehaald | Meting: geen veld ontbreekt. Inhoud is overal AANNAME: `excludeAreas: []`, `travelLimits` = bouwvolume (zie P1-3) |
| 1.6 | Aangekondigd: status en datum | gehaald | Centauri X Ultra en Saturn 5 Ultra, 2026-11 |
| 1.7 | Materiaal: dichtheid, temperaturen, doorstroming per nozzle, vlaggen | deels | 10 materialen; doorstroming is één getal, niet per nozzle |
| 1.8 | Tessellatie: volume ≤ 0,1 % van de kernel | niet gehaald | Geen test. De plaat neemt het rebuild-mesh (`printStore.ts:182-191`; `occt/brep.ts:629`: 0,01 mm en 0,1 rad). 0,1 rad geeft op een cilinder ongeveer 0,13 tot 0,17 % volumeverlies (berekend). De kruk is een gefacetteerd lichaam met 1655 open randen (foto 03) |
| 1.9 | Plat op vlak: ≤ 0,01°, laagste punt op 0 | gehaald | `plate.test.ts:19` |
| 1.10 | Schikken: geen overlap, tussenruimte, binnen het gebied, 20 kubussen < 1 s, deterministisch | deels | `plate.test.ts:38` slaagt; uitsluitzones genegeerd en geen overloop naar een volgende plaat (P3-8) |
| 1.11 | Oriënteren: T1 blijft, T9 op de rug, T12 minder overhang; criterium in het verslag | deels | `plate.test.ts:28` voor T1 en T9; geen proef voor T12; het criterium staat alleen in de code (`plate.ts:84-106`) |
| 1.12 | Buiten het volume: rood, waarschuwing, slicen en export geblokkeerd; 0,1 mm; uitsluitzone | deels | `plate.test.ts:52`, foto 09, e2e-stap "refused". Uitsluitzone alleen op hoekpunten (P1-3); Slice Plate is niet grijs, weigert bij de klik |
| 1.13 | Ongedaan maken; opslaan en heropenen geeft dezelfde plaat | niet gehaald | Ongedaan maken bestaat (`printStore.ts:144-153`); de plaat wordt niet bewaard (P2-12) |
| 1.14 | Meerdere platen: toevoegen, wisselen, verwijderen | deels | `printStore.ts:219-227`, tabjes in `PlateView.tsx:349`; geen "Move to Plate", geen test |
| 1.15 | Bestand zonder printgegevens opent ongewijzigd | gehaald | Er wordt niets in het document geschreven; het formaat is niet gewijzigd |
| 1.16 | e2e: tab bij part en assembly, niet bij tekening; knoppen; OK, Annuleren, Esc | deels | `e2e/print3d.mjs` dekt alleen een part (niet door mij gedraaid). Code voor assembly en tekening: `Ribbon.tsx:44`, `:57`, `:611`. OK = Annuleren, Esc ontbreekt (P3-9) |
| 1.17 | Bestaande poorten groen | gehaald | `tsc -b` exit 0; vitest `src/print` 50 van 50; `uiText`, `testGroups`, `prefsWired` 7 van 7; `line-budget` ok |
| 1.18 | Foto's: tabblad, PropertyManager, plaat met T1 en T12, stuk buiten het volume | deels | Foto's 01, 02, 09 met de kruk; geen foto met de kubus |

### 3.2 Fase 2: slicerkern en preview

| Nr | Criterium | Status | Bewijs |
|---|---|---|---|
| 2.1 | Aantal lagen exact | gehaald | Meting m1: 100, 100, 101, 166, 46 lagen, gelijk aan de formule (1 µm tolerantie) |
| 2.2 | Oppervlak per laag: T1 ≤ 0,2 %, T2 en T3 ≤ 0,5 % | deels | T1 0,000 %, T2 0,07 % (96 segmenten). T3: mijn gefacetteerde bol wijkt bij de polen zelf 2,7 % af van de analytische bol; niet zuiver te beoordelen |
| 2.3 | Som oppervlak × hoogte tegen meshvolume | gehaald | Kubus 0,000 %, cilinder 0,000 %, bol 0,005 %, kegel −0,003 % |
| 2.4 | T14 vereniging van overlappende bodies ≤ 0,2 % | gehaald | 700,00 mm² op elke laag, één lus |
| 2.5 | T15: geen uitzondering, elk gebrek gemeld, volume ≤ 2 % | niet gehaald | Geen uitzondering, geen NaN. Zijvlak weg: −50 %. Vijf van de zeven gebreken zonder melding (P2-7) |
| 2.6 | 10 000 willekeurige polygonen zonder fout | niet gehaald | Vereniging: 10 000 zonder uitzondering, NaN of zelfdoorsnijding. Bijna gelijke veelhoeken: 300 van 300 fout (P1-2). Offset: 1 uitkomst met zelfdoorsnijding. De test in de repo doet er 300 |
| 2.7 | Oppervlak tegen het rasterorakel | niet gehaald | 2 van 1432 buiten de eis, ergste −4,3 % (P2-6); test verruimd met +0,4 mm² |
| 2.8 | Convex +d dan −d binnen 2 µm | niet gehaald | 4,2 tot 4,8 µm (P3-4) |
| 2.9 | T4: wand 0,3 verdwijnt, wand 0,8 geeft twee contouren | gehaald | 0 en 2 lussen; `geom.test.ts:105`. Wand 0,45 laat vier restjes van samen 0,05 mm² |
| 2.10 | Offset van 10 000 punten in < 50 ms | niet gehaald | 128 tot 155 ms; test staat op 2000 ms |
| 2.11 | Hartlijn binnen de contour − b/2 (speling 0,02 mm) | deels | Kubus, cilinder, T-stuk, plaat: 0 punten buiten. Bol: 33 van 46 955 buiten (wanden en infill) |
| 2.12 | Buurwanden: overlap ≤ 10 %, kier ≤ 5 % | gehaald | Breedte 0,45, hartafstand 0,407: overlap 9,5 % (`slicer.ts:113-119`) |
| 2.13 | Extrusie bij 100 %: ±3 % (T1, T2), ±5 % (T12) | niet gehaald | T1 −2,90 %. T2 −42 % (P1-2). T12 binnen 5 % in `deurkruk.test.ts` |
| 2.14 | 15 % infill tegen handberekening ±5 % (T1) | gehaald | `slicer.test.ts:117`. De berekening gebruikt `beadArea` uit de slicer en een factor 0,98; niet volledig onafhankelijk |
| 2.15 | Infilldichtheid ±5 % voor vier patronen | niet gehaald | Rechtlijnig, raster, honingraat binnen 2 %. Gyroid 0,13 tot 0,38 bij 0,15 (P2-1) |
| 2.16 | Gram, meter en volume onderling ≤ 0,1 % | gehaald | 3,262 g uit lengte en uit volume gelijk; `slicer.test.ts:155-156` |
| 2.17 | Tegen Bambu Studio: gram ±10 %, lagen exact | niet te meten | Geen referentiebestand |
| 2.18 | Skirt en brim binnen het bed; brim sluit aan | niet gehaald | Skirt op −3,25 mm (P1-3). Aansluiting volgt uit `slicer.ts:176` (eerste lus op een halve breedte), niet gemeten |
| 2.19 | Eerste laag: eigen hoogte, breedte, snelheid | gehaald | Meting: hoogste snelheid 50 mm/s, breedte 0,50 tegen 0,45 daarna. Uitzondering: de spoeltoren (P1-4) |
| 2.20 | Snelheid × breedte × hoogte ≤ Qmax per segment | gehaald | Hoogste waarde 20,00 mm³/s bij Qmax 20 |
| 2.21 | T5: support per trede volgens de drempel | niet gehaald | 20°, 25°, 28°: geen support (P2-2) |
| 2.22 | T9 en T3: elk overhangpunt gedragen, Z-afstand ±1 laag | deels | T9: support op laag 0 tot 98, arm begint op laag 100. Ronde onderkanten vallen onder P2-2 |
| 2.23 | Support snijdt het model niet; XY ≥ 80 % | gehaald | T9, normaal en boom: 0 punten in het model, 0 dichter dan 80 % |
| 2.24 | Boom: tak eindigt op bed of model, niets zweeft, takhoek | deels | Uit de code (`support.ts:92-110`) eindigt een tak op het bed of in het model. Geen Z-afstand boven het model, geen proef op zwevende delen, takken kunnen buiten het bed komen (−0,475 mm) |
| 2.25 | T6: geen support onder korte bruggen; richting binnen 5° | niet gehaald | Richting 60° en 105° (P2-3); geen instelling voor bruglengte, support onder elke brug |
| 2.26 | 100 mm, 100 mm/s, 1000 mm/s²: 1,100 s | gehaald | `slicer.test.ts:159` |
| 2.27 | Schatter tegen een tweede simulatie ≤ 1 % | niet gehaald | Analyser +3,57 % op de kubus; test op 5 % (P2-14) |
| 2.28 | Schatter op referentie-G-code ≤ 5 % | niet te meten | Geen referentiebestand |
| 2.29 | Tegen een echte print ≤ 10 % | niet te meten | Nog te printen |
| 2.30 | T1 < 1 s, T12 < 10 s, T16 < 60 s | deels | T1 53 tot 135 ms. T12 9,0 s inclusief rebuild (vitest). T16 (249 000 driehoeken, 750 lagen) 64 s. Alles onder Node, geen hardware-GL |
| 2.31 | Geen hoofdthread-taak > 50 ms; annuleren < 200 ms | deels | Annuleren beëindigt de worker (`sliceClient.ts:17-23`). Preview-opbouw op de hoofdthread 426 ms tot 2,9 s (P2-10) |
| 2.32 | Geheugen worker < 1,5 GB bij T16 | niet te meten | Node: +736 MB na afloop; de piek is niet gemeten |
| 2.33 | Laagschuif binnen 50 ms; ≥ 30 beelden/s bij 2 miljoen segmenten | niet te meten | Geen hardware-GL-meting. De schuif is een tekenbereik (goed ontwerp); 2 miljoen segmenten vragen 549 MB buffers |
| 2.34 | Twee keer slicen is identiek | gehaald | Vier keer dezelfde MD5; ook boomsupport en willekeurige naad |
| 2.35 | Lagen, tijd, gewicht: één bron | gehaald | Foto 03 (234, 57m 52s, 24,1 g) = kop van de G-code = `slice_info` (3472 s, 24.07) |
| 2.36 | Kleur per soort, aan en uit, tijd en aandeel, som 100 % | gehaald | Foto 03: som 100,0 % |
| 2.37 | Foto's: T1 en T12 in drie kleurmodi, laag halverwege, support bij T9 | deels | Alleen de kruk, modi soort en snelheid, laag 118 |

### 3.3 Fase 3: uitvoer

| Nr | Criterium | Status | Bewijs |
|---|---|---|---|
| 3.1 | XY binnen het bedrukbare gebied; start- en eindcode binnen `travelLimits` | niet gehaald | P1-1 en P1-3. Kubus in het midden: alle 30 FDM-printers binnen `travelLimits` |
| 3.2 | Z niet dalend, Z ≤ bouwhoogte | deels | 0 dalingen over 234 lagen, hoogste Z 56,8. Wel `Z0` aan het begin (P1-1) |
| 3.3 | Temperaturen ≤ printermaximum en binnen het materiaalbereik | deels | Maximum getoetst (`run.ts:48-49`, test 350 °C). Het bereik van het materiaal wordt niet getoetst |
| 3.4 | Geen extrusie vóór `M109`; geen verboden commando's | gehaald | 30 printers; eigen lezer: eerste extrusie na `M109 S220` |
| 3.5 | Snelheid en versnelling ≤ machinegrenzen | gehaald | 30 printers: hoogste F ≤ `maxSpeed`; versnelling begrensd (`build.ts:52`) |
| 3.6 | Retractie in balans per laag | deels | Per laag 0 afwijkingen. Over de hele print staat 0,8 mm open (P2-4) |
| 3.7 | Netto filament = kop = preview ± 0,1 % | deels | Kruk 0,037 %, kubus 0,277 % (P3-3); eenheid cm³ fout (P3-1) |
| 3.8 | Eindcode zet nozzle, bed en ventilator uit | gehaald | `M104 S0`, `M140 S0`, `M106 P1/P2/P3 S0` of `M107` in beide bestanden |
| 3.9 | ASCII, getallen, Marlin ≤ 96, afsluitende regel | deels | ASCII 0 fouten (ook met "Krük é ñ 日本"), getallen 0 fouten, eindigt op een regeleinde. Marlin: 3 regels te lang (P3-2) |
| 3.10 | Kruisproef tussen de dialecten | gehaald | 30 printers: geen vreemd commando. De test in de repo dekt alleen Klipper |
| 3.11 | Bogen | niet te meten | Niet gebouwd; de instelling `arcFitting` bestaat en doet niets |
| 3.12 | Weigert: buiten het bed, uitsluitzone, te hoog | deels | `slicer.test.ts:177`. Uitsluitzone op hoekpunten (P1-3) |
| 3.13 | Weigert: temperatuur boven het maximum | gehaald | `slicer.test.ts:181-183` |
| 3.14 | Weigert: verouderde slice na wijziging van het part | niet gehaald | Instellingen en plaat wel (`printStore.ts:289`, e2e); het part niet (P2-8) |
| 3.15 | AANNAME of aangekondigd: bevestiging en vermelding in de kop | deels | Alleen "announced" (P2-11) |
| 3.16 | Weigert een onbekende variabele | gehaald | `pack.test.ts:39` en `:116` |
| 3.17 | Weigert een lege plaat | gehaald | `slicer.test.ts:179` |
| 3.18 | ZIP opent met `readZip` en `Expand-Archive`; CRC's kloppen | gehaald | `unzip -t`: geen fouten; `Expand-Archive`: 11 bestanden; `pack.test.ts:76` |
| 3.19 | `[Content_Types].xml` eerst; XML welgevormd; relaties bestaan | gehaald | Lijst van het pakket; elk XML-deel gelezen; alle doelen bestaan |
| 3.20 | `.3mf`-project heen en terug ≤ 1 µm | deels | `pack.test.ts:62` toetst de tekst van de transform en de aantallen; er is geen lezer die de driehoeken terug vergelijkt |
| 3.21 | `.gcode.3mf`: MD5, PNG, `prediction`, `weight`, sleutels uit de referentie | deels | MD5 `8DEDD254…EE94` gelijk aan de G-code; PNG 512 × 512 en 128 × 128 geldig; 3472 s en 24.07 g gelijk aan de kop. Referentievergelijking niet te meten (P3-14) |
| 3.22 | Elegoo-miniaturen decoderen terug | gehaald | `pack.test.ts:46`. Formaat en maat op het scherm: nog te printen |
| 3.23 | 100 MB in < 10 s, gecomprimeerd | gehaald | 0,93 s (proefdata comprimeert zeer goed); zie P3-10 |
| 3.24 | Ian opent het bestand in Bambu Studio en ElegooSlicer | niet te meten | Stap van Ian |
| 3.25 | Vrijgave per printer: T1 en T12 geprint | niet te meten | Nog te printen; staat zo in de interface en in het bestand |

## 4. G-code en pakket, met de hand gelezen

**Startcode Bambu** (`dialects.ts:50-62`), regel voor regel:

| Regel | Oordeel |
|---|---|
| `M204 S10000`, `M73 P0 R58` | Onschadelijk. |
| `M140 S60`, `M104 S140`, `G90`, `M83`, `G28`, `M190 S60` | Gedocumenteerd gedrag; volgorde goed (nozzle lauw tijdens het homen). |
| `G29` | Gemeenschapsbron; of elke reeks hiermee nivelleert is niet te onderbouwen. Geen afvegen van de nozzle ervoor. |
| `M109 S220` | Goed: wachten vóór de eerste extrusie. |
| `G1 Z5`, `G1 X20 Y3`, `G1 Z0.2`, `G1 X120 E4.632 F1200` | Spoellijn op het bed, niet getoetst tegen uitsluitzones of het model (P1-3). Bij de X1/P1 ligt X20 net naast de vermoedelijke hoek linksvoor. |
| `G1 E-0.8`, `G1 Z1` | Leidt tot de dubbele terugtrek (P2-4). |
| daarna `G1 X0 Y0 Z0 E-0.8` | **P1-1.** |

- Geen afveger, geen afvoerkoker, geen AMS: dat is de afgesproken minimale route, maar daarmee print een machine met AMS niets (P1-4).
- Temperaturen: 220/60 vóór de extrusie, `M104 S220` op laag 2 (overbodig, onschadelijk), alles uit aan het eind.
- Eindcode: terugtrekken, `Z56.8` (hoogste laag + 10), parkeren op X128 Y246, binnen het bouwvolume.
- AMS: alleen bij meer dan één kleur; zie P1-4. Op laag 1 komt `M620 S0A / T0 / M621 S0A` ná de spoellijn, dus de spoellijn wordt gelegd voordat er filament geladen is.
- Getallen: XY en Z drie decimalen, E vijf, F geheel; geen exponent, geen komma, geen `-0`.
- Miniaturen: twee PNG's in het pakket, relaties aanwezig. Klipper-bestand: `;gimage:` 200 × 200, `;simage:` 160 × 160 en een PNG-blok van 160 × 160; of het Neptune-scherm die maten toont, is nog te printen.
- `slice_info.config`: `printer_model_id` C12, `prediction` 3472, `weight` 24.07, één filament met `used_m` 8.07 en `used_g` 24.07, `tray_info_idx` leeg.
- Klipper en Marlin: geen enkel Bambu-commando, Marlin zonder Klipper-commando's (`M204 P3000 T3000`), Klipper met `SET_VELOCITY_LIMIT`. Geen nivellering (P2-9).
- Niet gevonden: `M302`, `M211 S0`, `M500`, `M502`, `G91`, bogen.

## 5. Voorwaarden voor vrijgave

**Fase 3 (eerst, want hier zit het gevaar)**
1. P1-1 opgelost, met een proef die een beweging naar Z < eerste laag en een terugtrek met XY afkeurt.
2. P1-3 opgelost: elke beweging getoetst, export geweigerd bij een overschrijding; negatieve proeven voor skirt, brim, support, toren en een zone midden onder een stuk.
3. P1-4: meerkleurenexport geblokkeerd of achter een geïmporteerde wisselcode; melding bij één kleur met AMS.
4. P1-5: geïmporteerde startcode alleen bij de printer waar ze vandaan komt, met echte waarden.
5. P2-4, P2-9, P2-11 en P3-1, P3-2.
6. Een referentiebestand van Ian uit Bambu Studio en ElegooSlicer voor de vergelijkingstabel (3.21), en uitsluitzones en bewegingsgrenzen in de database op basis daarvan.
7. Daarna pas de proefkubus; tot dan blijft elke printer "nog te printen".

**Fase 2**
1. P1-2 opgelost (Clipper2, of de eigen kern robuust), met de proef "bijna gelijke veelhoeken" en "geen skin in de tussenlagen van een cilinder en een buis".
2. P2-1, P2-2, P2-3, P2-5, P2-7 opgelost, elk met de proef uit hoofdstuk 3 van docs/34.
3. De verruimde tests terug naar de eis of verantwoord (P2-14).
4. P2-10: preview-opbouw van de hoofdthread af.
5. Foto's: kubus en T-stuk met support, kleurmodus laaghoogte, een laag halverwege per stuk.

**Fase 1**
1. De plaat in het document, met formaatversie en een proef "opslaan en heropenen" (P2-12).
2. Verouderd-vlag bij een gewijzigd part (P2-8).
3. Tessellatie voor de slicer aantoonbaar binnen 0,1 % (hoek 5° of fijner) en een melding met telling voor een mesh dat niet gesloten is (1.8, P2-7).
4. Uitsluitzones in de controle en in Arrange (P1-3, P3-8); OK, Annuleren en Esc (P3-9).
5. e2e ook voor een assembly en een tekening; foto met de kubus.

## 6. Besluiten voor Ian

1. **Clipper2 installeren.** Het akkoord is er; de installatie moet door Ian of in een sessie waar het mag. Dit haalt P1-2 en P2-6 in één keer weg.
2. **Referentiebestanden.** Zonder een kubus uit Bambu Studio en uit ElegooSlicer blijven de uitsluitzones, de pakketsleutels en de tijdschatting ongetoetst.
3. **Meerkleuren.** Eerst één kleur vrijgeven en meerkleuren pas na de wisselcode uit de eigen Bambu Studio-installatie, of meteen doorzetten met het risico uit P1-4. Mijn advies: eerst één kleur.

## 7. Opmerking over de werkmap

Tijdens de review stond `voorbeelden/afzuiging/tekeningen/Bouwschema-afzuiging.pdf` als gewijzigd in `git status`. Dat bestand is door deze review niet aangeraakt. Door de review gewijzigd: alleen dit document en `TASKS.md`.

## 8. Stand na verwerking (bouwer, 2026-11-19)

Platform: Windows 11, Node 24, vitest 5 (1149 tests groen, typecheck schoon), e2e `node e2e/print3d.mjs` 26 van 26 (Edge, software-GL). Niet gecommit. Foto's: `scratchpad/print-fase1-3b/`. Er is nog steeds niets op een printer geprint: elke printer blijft "nog te printen: kalibratiekubus 20 mm per printer".

Elke P1 en P2 heeft een negatieve proef die zonder de oplossing faalt (testnaam tussen haakjes).

| Nr | Stand | Wat er veranderd is | Bewijs |
|---|---|---|---|
| P1-1 | opgelost | Beginpositie onbekend; eerste beweging alleen Z, dan XY, dan omlaag; terugtrekken alleen `G1 E-.. F..`; `checkMoves` toetst elke beweging (Z niet onder de eerste laag, binnen travelLimits) | slicer.test "P1-1: no move to Z0 …"; e2e "no move to Z0 or the origin" |
| P1-2 | opgelost | Clipper2 achter `geom/polygons.ts`; eigen kern alleen nog orakel | geom.test "P1-2: 300 pairs of near-equal polygons"; slicer.test "P1-2: a cylinder and a tube … no skin", "a cylinder at 100 % infill … ±3 %" |
| P1-3 | opgelost (database-aannames blijven) | Skirt, brim en support afgeknipt op printableArea min excludeAreas; spoeltoren en spoellijn op een vrije plek; elke beweging getoetst, ook het midden van een segment in een zone; export geweigerd | slicer.test "a skirt and tree support next to the bed edge …", "a part over an excluded zone …", "… tower free of the parts" |
| P1-4 | opgelost volgens het advies | Meerkleuren op Bambu alleen met geïmporteerde wisselcode; daarvoor terugtrekken en optillen; toren eerste laag op eerste-laagsnelheid; één kleur met eigen startcode: melding "laad het filament zelf" (PropertyManager, waarschuwing) | slicer.test "two filaments without the imported change code are refused …", "… retract and lift before the change …" |
| P1-5 | opgelost | Profiel moet een printermodel noemen; alleen gebruikt op dat model; variabelen uit de echte slice (lagen, eerste laag, eerste filament, plaattype); onbekend = weigering | pack.test "refuses what it cannot fill …", "reads a machine profile with its printer …"; slicer.test "imported code of another printer model is refused" |
| P2-1 | opgelost | Gyroid met marching squares, geen afgekapte oplossing; periode gekalibreerd over z | slicer.test "P2-1: gyroid density over one period …" |
| P2-2 | opgelost | Geen opening met de lijnbreedte; de hele nieuwe strook rond de te steile rand krijgt support | slicer.test "P2-2: slopes of 20, 25 and 28 degrees …" |
| P2-3 | opgelost | Richting = de hoek met de meeste aan beide kanten opgelegde lijnen; brug 1,5 lijnbreedte over de pijlers | slicer.test "P2-3: bridges of 10, 30 and 60 mm …" |
| P2-4 | opgelost | Eigen startcode eindigt teruggetrokken; geen tweede terugtrek | slicer.test "P2-4: every retraction is pushed back once" |
| P2-5 | opgelost | Eerst vertragen, dan wachten (`G4`) naast het stuk met ventilator op 100 %; de analyser leest `G4` | slicer.test "P2-5: a thin pen keeps the minimum layer time" |
| P2-6 | opgelost | Clipper2; fuzz op offset zonder zelfdoorsnijding | geom.test "P2-6: 1500 random regions offset …" |
| P2-7 | opgelost | Open ketens behouden hun eindpunt (de oorzaak van −50 %) en sluiten op het kortste pad; `topology()` bij Add to Plate met telling | slicer.test "P2-7: a cube with a missing side face …" |
| P2-8 | opgelost | Elk stuk kent zijn bron (part, body, component) en een hash; elke rebuild ververst het en maakt de slice verouderd | printDoc.test "P2-8: a rebuild that changes the part …" |
| P2-9 | deels | Klipper `BED_MESH_PROFILE LOAD=default`, Marlin `M420 S1`, Centauri zonder (nivelleert zelf); per printer te bevestigen | slicer.test "P2-9: the Elegoo start code levels …" |
| P2-10 | opgelost | Posities, normalen en indexen in de worker; het venster vult alleen kleuren en bij verbergen een kortere indexlijst | slicer.test "preview mesh … built in the worker" |
| P2-11 | opgelost | Bevestiging met de lijst van aannames op veiligheidsvelden; dezelfde aannames in de kop; printers met meer koppen geweigerd | printDoc.test "P2-11 …"; slicer.test "a printer with two toolheads is refused"; e2e bevestigt de vraag bij export |
| P2-12 | opgelost | Bestandsformaat 4 met `print3d` (plaat, matrix, filament, bron, geen mesh); migratie 3 → 4; beschadigde plaat geweigerd | printDoc.test "P2-12 …", "a damaged plate in a file is refused …"; e2e "the plate is stored in the document" |
| P2-13 | deels | Skin, brug en support als zigzag; korte sprongen tussen vullijnen zonder terugtrek; dunne infill-lijnen niet verbonden (dat zou de dichtheid verhogen). Kubus: verplaatsing nog 37 % van de tijd, kruk 29 % | foto 03, 08 |
| P2-14 | opgelost, één verantwoording | Raster ±max(0,5 %, 0,05 mm²) met cel 0,01; 10 000 punten < 50 ms (beste van vijf CPU-metingen, tot 3 herhalingen bij drukte); 10 000 willekeurige veelhoeken met zelfdoorsnijdingsproef; kubus 100 % ±3 %; schatter tegen een simulatie met vaste tijdstap ≤ 1 %; gyroid over een periode. De analyser (eigen, eenvoudiger model) blijft een ruime controle (10 %). De snelheidsgrens 2000 mm/s volgt de database (H3C 1400 mm/s) | geom.test, slicer.test |
| P3-1 | opgelost | cm³ in de Bambu-kop | slicer.test "P3-3 …" |
| P3-2 | opgelost | Marlin-commentaar korter, ColPic per regel van 96 tekens met herhaald voorvoegsel (scherm: nog te printen) | slicer.test "… P3-2: Marlin lines up to 96 characters" |
| P3-3 | opgelost | Spoellijn telt mee in kop en preview | slicer.test "P3-3 …" |
| P3-4 | opgelost | Boogtolerantie 0,5 µm | geom.test "a convex polygon grown then shrunk …" |
| P3-5 | opgelost | Punten < 5 µm samengevoegd, geen `E0` | slicer.test "P3-5 …" |
| P3-6 | opgelost | Naad per lus: de dichtstbijzijnde naad van de vorige laag | `build.ts` pickSeam |
| P3-7 | opgelost | Eén speling (0,01 mm) voor kleur en weigering | slicer.test "a part up to the very edge …" |
| P3-8 | opgelost | Arrange om uitsluitzones heen en over extra platen | printDoc.test "P3-8 …" |
| P3-9 | opgelost | OK bewaart, Annuleren en Esc herstellen de stand van het openen | printDoc.test "P3-9 …"; e2e OK en Esc |
| P3-10 | opgelost | `readZip` neemt een grens als parameter | pack.test "P3-10 …" |
| P3-11 | deels | Verplaatsingen met dezelfde versnelling als de G-code; `minimum_cruise_ratio` en een gemeten voorbereidingstijd ontbreken nog | — |
| P3-12 | opgelost | "Internal solid infill" / "Solid infill" in G-code en preview; foto's zonder blijvende tooltip | foto's |
| P3-13 | deels | Doorstroming schaalt met de nozzle (AANNAME tot de database waarden per nozzle heeft); databasepunten (Centauri zonder Carbon, Wikipedia-bron) horen bij de database-agent | — |
| P3-14 | deels | `3dmodel.model` met de stukken, `plate_1.json`, `top_1.png`, `pick_1.png`, `plate_no_light_1.png`, generieke `tray_info_idx`; model-id's nog voor 8 printers; alles te vergelijken met een referentiebestand van Ian | pack.test |
| P3-15 | deels | Getallen voor X, Y en draaien; Move to Plate; kleurmodi lijnbreedte, doorstroming, ventilator; oogje in de legenda; bevestigingshoek; "Editing Plate". De map "3D Print" in de FeatureManager ontbreekt (de PropertyManager toont de stukken) | e2e, foto's 01 tot 16 |

**Fase-1-voorwaarden:** plaat in het document (P2-12) gehaald; verouderd-vlag bij een gewijzigd part (P2-8) gehaald; tessellatie: B-rep-hoektolerantie 0,1 → 0,07 rad, volume binnen 0,1 % voor cilinders van 4, 20 en 80 mm (`tessellation.test.ts`); uitsluitzones in de controle en in Arrange gehaald; OK/Annuleren/Esc gehaald; e2e voor part, assembly en tekening (geen tab bij een tekening) gehaald; foto's met de kubus (01 tot 06).

**Blijft open (niet zonder Ian of een printer):** referentiebestanden uit Bambu Studio en ElegooSlicer (pakketsleutels, model-id's, tijd), echte uitsluitzones en bewegingsgrenzen in de database, de proefkubus per printer. Geen enkele printer is vrijgegeven.
