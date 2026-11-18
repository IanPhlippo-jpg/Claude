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
