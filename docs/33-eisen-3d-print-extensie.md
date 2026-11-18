# Eisen: 3D-print-extensie in Phlippo CAD (2026-11-18)

Ian wil extensies die SOLIDWORKS niet heeft, maar wel in SOLIDWORKS-stijl. De eerste is een volledige slicer in het programma, zoals Bambu Studio, zodat hij vanuit een part of assembly meteen een printbestand maakt.

## Antwoorden van Ian
- Printers: **alle printers van Elegoo en Bambu Lab**, ook de allernieuwste die nog niet uit zijn (aangekondigd). Elegoo maakt ook harsprinters (Saturn, Mars): die horen er in een latere fase bij.
- Niveau: **volledig slicen** in Phlippo CAD (lagen, wanden, infill, support, laagpreview, tijd en gram), uitvoer die zo op de printer kan.
- Versturen: **een bestand is genoeg** (.gcode.3mf voor Bambu Lab, .gcode voor Elegoo FDM, later .goo/.ctb voor Elegoo hars). Geen LAN-verzending.
- Daarna nog drie extensies: **Lasconstructies+**, **Lasersnijden/plooien**, **Offerte uit model**.

## Eisen
1. **SOLIDWORKS-stijl:** een eigen CommandManager-tabblad "3D Print", een PropertyManager links voor de instellingen, onderdelen in de FeatureManager-stijl, dezelfde iconen- en kleurtaal als de rest van Phlippo CAD.
2. **Printerdatabase:** elke printer van Bambu Lab en Elegoo (FDM, en hars in fase 4) met bouwvolume, nozzle(s), maximale snelheden en versnellingen, verwarmd bed, behuizing, AMS/meerkleuren, G-code-soort (Bambu, Klipper, Marlin). Elke waarde met bron (fabrikantpagina of datasheet). Aangekondigde printers met "aangekondigd" en datum; ontbrekende waarden als AANNAME.
3. **Filament- en procesprofielen:** PLA, PETG, ABS, ASA, TPU, PA/PA-CF, PC; laaghoogtes 0,08 tot 0,28 per nozzle; kwaliteit/standaard/sterk/snel.
4. **Plaat:** parts uit het open document (of meerdere parts/bodies) op de plaat zetten, met verplaatsen, draaien, schalen, "plat op vlak", automatisch oriënteren, automatisch schikken, meerdere platen, controle binnen het bouwvolume.
5. **Slicen:** doorsnede per laag, wanden, boven- en onderlagen, infill (rechtlijnig, raster, gyroid, honingraat), naad, skirt/brim, support (normaal en boom), brug- en overhangdetectie, variabele laaghoogte als optie.
6. **Preview:** laagschuif en bewegingsschuif, kleur per soort lijn, snelheid of laaghoogte, printtijd en filament (gram, meter, prijs).
7. **Uitvoer:** Bambu `.gcode.3mf` (met plaatafbeelding en metadata), Elegoo `.gcode` (Klipper of Marlin), ook een `.3mf`-project zonder G-code. Eigen start- en eind-G-code, niet letterlijk overgenomen uit AGPL-profielen.
8. **Geen nieuwe pakketten zonder akkoord van Ian.** Polygon-offset, infill en G-code worden zelf geschreven in TypeScript. three.js en de bestaande kernels mogen gebruikt worden.
9. **Tests:** G-code-analyse (lagen, extrusie, temperaturen, geen bewegingen buiten het bed), negatieve proeven, vergelijking van tijd en gram met een handberekening, e2e van het tabblad.
10. **Eerlijk:** wat niet op een echte printer getest is, staat als "nog te printen". Een proefprint (kalibratiekubus 20 mm) is de vrijgave per printer.

## Fasen
1. Tabblad, printerdatabase, plaat (plaatsen, oriënteren, schikken).
2. Slicerkern en laagpreview, tijd en gram.
3. G-code en bestanden voor Bambu Lab en Elegoo FDM.
4. Elegoo-harsprinters (.goo).
5. Daarna: Lasconstructies+, Lasersnijden/plooien, Offerte uit model.

## Besluiten van Ian op de vragen van Fable (2026-11-18)
- Startcode Bambu: allebei. Een eigen minimale start- en eindcode ("nog te printen") en een knop die de code uit zijn eigen Bambu Studio-installatie inleest. Wat ingelezen wordt, komt alleen in zijn instellingen, nooit in de repo.
- Polygon-offset: Clipper2 mag (een JS/TS-port met Boost- of MIT-licentie).
- Printers: Ian heeft er nog geen. Elke printer blijft "nog te printen" tot een proefkubus geslaagd is.
- Meerkleurig (AMS): meteen in v1, met een kleur per part, gereedschapswissels, een prime tower, spoelvolumes en het verbruik per slot.
- Hars: alleen .goo, geen .ctb.

## Stand fase 1 tot 3 (2026-11-18)

**Nog te printen: kalibratiekubus 20 mm per printer.** Niets is op een echte printer geprint. Elke printer staat in de interface en in de G-code als "nog te printen"; de proefprint per printer is de stap van Ian.

### Wat er is
- Tabblad **3D Print** (part en assembly, niet bij een tekening), lui geladen (`src/app/print/`): Print Setup, Add to Plate (part, elke body, elke component, assembly als één stuk), Lay Flat (vlak onder de muis licht op), Auto Orient, Arrange, Scale, New Plate, Slice Plate / Cancel Slicing, Preview, Export (printbestand of .3mf-project).
- Property Panel links met tabbladen Settings en Preview; plaatweergave met bed, raster 10/50 mm, printernaam, bouwvolume, rood buiten het volume, laagschuif met twee grepen, bewegingsschuif, legenda met tijd, gram, meter en euro.
- Slicerkern in `src/print/` (puur TypeScript, draait in `src/workers/slice.worker.ts` met voortgang en annuleren): eigen polygoon-boolean en offset op een geheeltallig rooster van 0,1 µm met windinggetallen (`geom/`, achter één interface `geom/polygons.ts`), lagen met ketenen via meshranden en een vereniging van losse segmenten voor meshes die niet waterdicht zijn, wanden, boven/onder, bruggen, infill (rechtlijnig, raster, gyroid, honingraat), skirt/brim, naad, support normaal en boom, variabele laaghoogte, minimale laagtijd, volumetrische snelheidsgrens, meerdere filamenten met toolwissel en prime tower.
- Tijd met een trapeziumplanner met vooruitkijken (`motion.ts`), los nagerekend door de G-code-analyser (`gcode/analyse.ts`).
- Uitvoer: Bambu `.gcode.3mf` (G-code, MD5, plaatafbeeldingen, slice_info met de AMS-filamentlijst, model_settings, project_settings), Elegoo `.gcode` in Klipper- of Marlin-dialect met miniaturen (PNG-blok; ColPic `;gimage:`/`;simage:` voor de Neptune-schermen), `.3mf`-project zonder G-code. Eén ZIP-schrijver met deflate (`src/core/document/zip.ts`).
- Eigen start- en eindcode per dialect; knop **Import from Bambu Studio…** leest het machineprofiel van de gebruiker (alleen in zijn instellingen, nooit in de repo).

### Gedeeltelijk of open
- **Clipper2 (bijgewerkt na de review, docs/35):** `clipper2-ts` 2.0.1-18 is geïnstalleerd met akkoord van Ian. Licentie: Boost Software License 1.0 (Angus Johnson, Clipper2; TypeScript-port countertype/clipper2-ts). Alle booleans en offsets van de slicer lopen erdoor, achter `src/print/geom/polygons.ts`. De eigen kern (`geom/boolean.ts`, `geom/offset.ts`) blijft alleen als onafhankelijk orakel in de tests, naast het rasterorakel.
- Mesh: de slicer neemt de body uit de rebuild; een exact (B-rep) body is getesselleerd met koordefout 0,01 mm en hoektolerantie 0,1 rad (5,7°, iets boven de gevraagde 5°). Een gefacetteerde body (mesh-kern) geeft een melding.
- Bambu: printermodel-id's en de verplichte sleutels van slice_info/project_settings komen uit openbare beschrijvingen; te vergelijken met een referentiebestand uit Bambu Studio. Bambu-specifieke commando's (`G29`, `M620/M621`, `M991`, `M73 L`) zijn uit gemeenschapsbronnen.
- ColPic: oriëntatie en regelsplitsing op het Neptune-scherm onbekend tot een printer het toont.
- De plaat wordt nog niet in het document bewaard (alleen in de sessie); instellingen wel (per gebruiker).
- Niet gebouwd: gap fill, Arachne, ironing, bogen (G2/G3 standaard uit), firmware-retractie en pressure advance standaard uit, schilderen per vlak voor meerkleuren, harsprinters (fase 4).
