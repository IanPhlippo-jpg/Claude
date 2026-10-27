# QA-rapport v0.5.1 verwerkt (0.5.2)

Bron: `qa-rapporten/QA-rapport-0.5.1.md` (eindcontrole, Grok Bot + team, 6/10, NO-GO voor release, GO voor eigen
gebruik met back-ups). De online versie van het rapport staat in een afgeschermd frame dat niet uit te lezen is; dit
document volgt de lokale md, die dezelfde eindcontrole is.

Eerst correctheid, dan breedte (F130). De vier QA-tests M1, M2, T2 en T3 zijn nu vaste unit tests:
`src/core/assembly/mateStatus.test.ts` (M1, M2), `src/core/features/revolve2.test.ts` (T2) en
`src/core/features/edgesets.test.ts` (T3).

## Per bevinding

| ID | Ernst | Status 0.5.2 | Wat |
|---|---|---|---|
| F109 | Kritiek | opgelost | De mate-solver kiest per mate welke kant beweegt: de component die verder van een vaste component staat, ongeacht welke referentie eerst gekozen is. De mates dicht bij de vaste componenten worden eerst opgelost. Test M1: een vrij deel op refs[0] beweegt nu wel. |
| F108 | Kritiek | opgelost | `mateStatus` meet de vrijheidsgraden van elke component. Het probeert de zes kleine bewegingen (3 verschuivingen, 3 rotaties) en kijkt welke de mates terugduwen. De boom toont (f), (-), (+) of niets, zoals in de video's. Een mate die na het oplossen niet klopt, is rood met een !. De statusbalk zegt Under/Fully/Over Defined. Lock rotation bij concentric werkt nu echt (eerder deed de optie niets). Test M2: twee distance-mates van 10 en 20 → één rood, het deel (+). |
| F111 | Kritiek | opgelost | Een fillet- of chamferrand die door een later vóór de fillet ingevoegde feature in stukken valt, wordt in **alle** stukken afgerond (`matchEdges`): dezelfde lijn, dezelfde twee vlaknamen, binnen de oude rand. Valt een stuk helemaal weg, dan meldt de feature "Warning: n of the m edge references could not be found". Test T3 (plaat 80×40×10, R2, slot van 10 over de rand): het volume ligt binnen 3 mm³ van de theorie voor beide helften (30 939,9 mm³); voorheen was er 30 mm³ te veel, precies één helft. |
| F110 | Major | opgelost | De oorzaak was de mesh-kernel. Een gebogen rand kreeg één gereedschap per facet (87 booleans op bijna rakende vlakken), waarvan er enkele mislukten en een plak te veel of te weinig wegnamen: 923 mm³ in plaats van 356. Nu is het één gereedschap langs de hele rand (`chainTool`), dus één boolean: 359 mm³. Revolves krijgen ook vlaknamen (F47), zodat de rand na een maatwijziging bij naam gevonden wordt. Test T2: buis r 10–30 → 36, R3, volume binnen 10 % van de theorie, geen fout. |
| F112 | Kritiek | opgelost | Opties die het programma niet leest, staan grijs met de tip "Not available in this version". De lijst (`prefsWired.ts`) wordt in een unit test tegen de broncode gecontroleerd. Echt gemaakt: **Auto-Recover** (desktop: elke N minuten een kopie in de gekozen map, weg na opslaan, zichtbaar in Document Recovery), **Save notification**, **Length unit** (Custom), **Mass/Section Properties-eenheden** in Mass Properties. Back-upkopieën: Phlippo CAD houdt altijd .bak en .bak2 naast het document; die optiegroep staat grijs met die uitleg. |
| F113 | Major | opgelost | Reorder door slepen in de boom: de feature gaat met zijn eigen schets onder de feature waarop hij losgelaten wordt. Een zet boven een parent of onder een child mag niet (no-drop-cursor, geen lijn). Een zet waardoor een feature faalt, wordt geweigerd met een melding. Ongedaan maken kan met Undo. Unit `reorder.test.ts`, e2e `reorder.mjs` (10/10). |
| F114 | Major | grotendeels | File ▸ Save As ▸ **DXF** (R12, mm, verborgen lijnen op laag HIDDEN, Ø/±/° als %%c/%%p/%%d) en **Adobe PDF** (vector, één pagina op bladmaat, Helvetica) voor tekeningen. Het actieve blad wordt van het scherm gelezen, met arcering en zonder selectiekleur. e2e `sheetexport.mjs` (12/12, de PDF bekeken in Edge). **IGES-export kan niet**: de meegeleverde OpenCascade-build heeft alleen de IGES-reader. |
| F116 | Major | opgelost | De File Property heet nu `Density`; oude vergelijkingen met `SW-Density` blijven werken. `uiText.test` zoekt ook naar `SW-` en kijkt ook in `src/core`. |
| F131, F132 | Major | opgelost | "3D ContentCentral" → "online content library". `rename-trademarks.cjs` en `uiText.test` kennen de naam. |
| F50, F94 | Kritiek | beslist | "Weldments" blijft: het is een gewoon Engels vakwoord (lasconstructies), geen productnaam. Het rapport laat die keuze open ("mag blijven"). |
| F119 | Major | opgelost | De regressierunner telt `skip:`-regels per script en noemt ze in de slotregel. |
| F120 | Major | opgelost | De CI-B-rep-pass draait ook qa2 en facenames. Er is een worker-pass bijgekomen (`?rebuild=worker`: rebuildworker, features, full, doorhandle, facenames, bodies). |
| F125 | Major | opgelost | Met software-OpenGL (SwiftShader, llvmpipe) kostte de dikke randlijn van Shaded With Edges ~450 ms per frame. In software-modus tekent de viewport dunne lijnen: 133 ms. De rebuildworker-test meet nu eerst een gewone hertekening en legt de grens daarboven (max(250, hertekening + 150) ms). |
| F115 | Kritiek | deels | Zonder WebGL toont de viewport een nette melding in plaats van te crashen; de rest van de app werkt. Nog niet gedaan: SwiftShader aanzetten in de desktop-shell en de CI-stappen van self-test en desktop-nohooks. Die wijziging in `electron/main.cjs` werd door de beveiligingscontrole van de sessie tegengehouden en wacht op Ians akkoord. |
| F10, F54, F93, F128 | Kritiek/Major | deels | De drawing-test wacht nu tot de cirkel Ø35 er is en de zoom twee frames stil staat, en logt bij een fout welk element onder de klik ligt. Op Windows is hij 25/25 groen, ook met SwiftShader en een ander lettertype. Op Linux kan het hier niet gedraaid worden: er is geen WSL en geen Docker. De uitkomst moet uit een echte Actions-run komen. |
| F118 | Minor | opgelost | De hoofdbundel is van 919 naar 827 kB (gzip 250 → 227) gegaan. Motion study, Material-dialoog, Appearances-paneel en het Options-schema laden apart. |
| F122 | Major | opgelost | Document Properties ▸ Detailing ▸ **Auto insert on view creation ▸ Center marks-holes** (standaard aan): nieuwe aanzichten krijgen een centermark op elk zichtbaar gat, één per middelpunt. De weergavestijl van nieuwe aanzichten volgt Options ▸ Drawings ▸ Display Style, ook Hidden lines visible. Unit `autoMarks.test.ts`. |
| F123 | Minor | grotendeels | Nieuwe relaties **Intersection** (punt op het snijpunt van twee krommen), **Merge** (twee punten tot één) en **Equal Curvature** (G2 tussen spline en lijn of boog), met glyphs en een plek in Add Relations. Along X/Y/Z bestaat als oriëntatie tijdens het tekenen van een 3D-schets; als blijvende relatie in een 3D-schets nog niet. |
| F121 | Major | open | Dome, Indent, Mounting Boss, Snap Hook en Lip/Groove volgen in de volgende ronde. Instant3D bestaat onder de neutrale naam **Drag Handles** (merkregel), Smart Fasteners als **Auto Fasteners**. |
| F117, F49 | Major | bewust niet | Geen code-signing: Ian wil geen certificaten aanleveren. Windows SmartScreen waarschuwt dus bij de eerste start van de installer. |
| F98, F126 | Major | deels | Commits worden gepusht (op Ians vraag); de CI-uitslag zelf is van hieruit niet te lezen (private repo, geen `gh`). |
| F51, F46, F137, F47, F48, F99, F105 | Kritiek/Major | ongewijzigd | Mesh-kernel en UI-thread: het B-rep-pad en de rebuild-worker bestaan, maar ze zijn nog niet de standaard in de browser. |
| F135, F136 | Major/Minor | open | De statusbalkteksten worden in eigen woorden herschreven; dat gebeurt samen met een ronde over de neutral-comments-check. |
| F129, F133, F134, F38 | Minor | open | Docs en tellingen worden bij de release bijgewerkt. De ingeslikte catches in e2e (≈80) worden één voor één `skip()` met een reden. |
| F16, F21, F22, F24, F28, F124 | Minor | ongewijzigd | Visuele punten zonder nieuw bewijs; bewuste gaten uit docs/24. |
