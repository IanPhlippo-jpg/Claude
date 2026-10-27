# QA-rapport v0.4.8 verwerkt (0.4.9)

Bron: `qa-rapporten/QA-rapport-0.4.8.md` (Grok Bot + teamreview, 7/10, NO-GO voor release, GO voor eigen gebruik).

## Eerlijk over de regressie (F93, F38)

De commits en docs van 0.3.5 tot en met 0.4.8 melden "regressie 86/86". Dat klopt alleen voor **Windows**
(msedge, `node e2e/run-regression.mjs` op de ontwikkelmachine). Op Linux (headless Chromium, swiftshader) faalde
`drawing.mjs` in elke QA-ronde op twee checks: de Ø35-maat en het herstel na reload. Er is geen remote CI-run, omdat de
branch niet gepusht wordt (F98). Vanaf 0.4.9 vermelden de commits het platform: "regressie Windows n/n".

## Per bevinding

| ID | Ernst | Status 0.4.9 | Wat |
|---|---|---|---|
| F10, F54, F31 | Kritiek/Major | aangepakt, Linux nog te bewijzen | De maat pakte een cirkel binnen 2 px, de centermark binnen 3 px. Op Linux slaagde de centermark wel en de maat niet: de klik viel tussen 2 en 3 px. Alle pick-toleranties van het blad zijn nu 4 px (`PICK_PX`). De test klikt op de cirkel zoals de view hem tekent (`__phlippoSheet.circles`) en logt bij een fout de zoom en de cirkel. Op Windows lukt het met msedge, met swiftshader en met een ander lettertype. Linux zelf kon hier niet draaien: er is geen WSL-distributie en geen Docker. |
| F102 | Minor | opgelost | De reload-check is gesplitst: views en notitie apart, en de maten tellen alleen mee als Ø35 eerst lukte. |
| F93, F38 | Kritiek | opgelost | docs/12 is gecorrigeerd en deze pagina toegevoegd. Commits noemen voortaan het platform. |
| F95 | Major | opgelost | `engines.node >=22`, `.nvmrc` 22, CI leest `node-version-file`. |
| F50, F94 | Kritiek/Major | opgelost | Pack and Go → **Package Files**, MBD Dimensions → **Product Dimensions**, ook in commentaren en de Options-pagina. LifecycleTab → ShareTab. `uiText.test` en `rename-trademarks.cjs` controleren beide namen. "Weldments" blijft: dat is een gewoon woord. |
| F96 | Minor | opgelost | De tooltip van Tolerance Sum zegt wat de dialoog doet: alle maten, worst case en RSS, geen maatketen. |
| F101 | Minor | opgelost | `clickall` geeft exit 1 bij fouten. De desktop-hulpscripts zonder checks staan in `e2e/tools/`. |
| F106 | Major | opgelost | Elke kernel-oproep heeft een time-out: 60 s voor rebuild, 120 s voor STEP. Na een time-out start de worker opnieuw en zegt de statusbalk "Exact geometry timed out; showing the faceted (mesh) result." Unit test `occtClient.test.ts`. |
| F107 | Major | opgelost | De ongebruikte solver-worker en `SolverClient` zijn geschrapt. De schetssolver draait synchroon, zoals hij altijd deed. |
| F99 | Major | opgelost | De statusbalk toont "Faceted n/m" zolang er bodies niet exact zijn. Een body-rij in de boom heeft de tooltip "Exact surfaces (B-rep)" of "Faceted (mesh kernel)". STEP-export en STEP Info melden hoeveel solids gefacetteerd zijn. |
| F97 | Kritiek | opgelost | `Phlippo CAD.exe --self-test` laadt app:// en de OpenCascade-WASM-worker, bouwt een plaat, maakt hem exact, voegt een exacte fillet toe, schrijft STEP en slaat atomisch op met .bak. Dat gebeurt in een wegwerpprofiel, het resultaat komt in `%TEMP%\phlippo-self-test.json`. `desktop-installed.mjs` draait dit op het geïnstalleerde programma. |
| F100 | Major | opgelost (CI niet gedraaid) | De CI draait `desktop-nohooks.mjs` en `electron . --self-test` onder xvfb op de release-build. |
| F105 | Major | opgelost (CI niet gedraaid) | `?kernel=brep` in het adres zet de B-rep-kern aan voor een heel script. De CI draait features, features2, filletopts, endconditions, multibody, full, doorhandle, step en bodies een tweede keer op de B-rep-kern. Lokaal is dat 9/9 groen; filletopts duurt dan 23 s in plaats van 291 s. |
| F104 | Minor | opgelost | De eenmalige file://-migratie uit 0.3.4 is weg, net als `electron/blank.html`. De app laadt direct app://. |
| F98 | Major | open (beslissing Ian) | Commits blijven lokaal; pushen gebeurt alleen op vraag van Ian. |
| F46 | Major | open | Mesh-booleans draaien nog op de UI-thread, met een budget van 45 s. Een worker vraagt een grote ombouw. De B-rep-kern neemt steeds meer features over en is veel sneller. |
| F47, F48, F51 | | deels | Ongewijzigd in deze ronde. |
| F103 | Minor | open | PropertyPanel splitsen staat gepland voor een volgende ronde. |
