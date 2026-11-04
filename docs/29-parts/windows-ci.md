# Windows-CI: vijf scripts rood in Edge met SwiftShader (run 41657122047, commit 4526c24)

De job `regression-windows` draait op windows-2025 zonder grafische kaart; Edge tekent WebGL daar met SwiftShader
(`NODE_OPTIONS="--import ./e2e/lib/launch-args.mjs"`, `E2E_BROWSER_ARGS="--use-angle=swiftshader
--enable-unsafe-swiftshader --ignore-gpu-blocklist"`). Eén frame van een gewoon onderdeel kost daar seconden. Op Linux
waren dezelfde scripts groen. Alles hieronder is lokaal nagespeeld op Windows met Edge, dezelfde preload en een eigen
bundel (`VITE_TEST_HOOKS=1 vite build --outDir %TEMP%/claude-dist-win`, `vite preview --port 5201`).

## rebuildworker: een fout in het programma (shaderprogramma's opnieuw gecompileerd)

- **Symptoom:** "the window kept drawing frames during the rebuild (no gap over 5338 ms) {gap: 9359, redraw: 5188}",
  daarna een time-out van `page.screenshot` (30 s). Lokaal met SwiftShader hetzelfde: gap 8781 ms bij redraw 4844 ms.
- **Oorzaak:** een CPU-profiel (CDP `Profiler`) van de rebuild toonde ~8,7 s in `getShaderInfoLog`,
  `getProgramInfoLog` en `getProgramParameter`, aangeroepen uit three.js `getUniforms`: het wachten op het compileren
  van nieuwe shaderprogramma's. `renderer.info.programs` voor en na een rebuild: drie programma's verdwenen en kwamen
  terug (de vloerschaduw `MeshBasicMaterial` en het gespiegelde lichaam `MeshStandardMaterial` 'floor-reflection|studio',
  dat laatste in twee varianten). `BodyScene.placeFloor` gooide bij elke rebuild de oude vloermaterialen weg vóór de
  nieuwe getekend waren; three.js ruimt een programma op zodra het laatste materiaal dat het gebruikt wordt
  weggegooid, dus de nieuwe materialen moesten exact dezelfde programma's opnieuw compileren. Met een grafische kaart
  kost dat weinig, met SwiftShader seconden, op de hoofdthread.
- **Fix:** `src/app/viewport/bodyScene.ts`, `placeFloor`: de vervangen vloermaterialen worden één aanroep later
  weggegooid (`retiredFloorMats`); tegen dan houden de nieuwere materialen de programma's vast. `dispose()` ruimt ze
  ook op. Na de fix: geen nieuw programma na een rebuild, gap 875 tot 1125 ms bij een redraw van 3,5 tot 5,5 s.
- **Test:** `e2e/rebuildworker.mjs` kreeg een check die op elke grafische kaart werkt: "the new model is drawn without
  compiling a shader program again" (de id's in `__phlippoRenderer.info.programs` voor en na de rebuild). De grens van
  de frame-check is ongewijzigd (redraw + 150 ms): de resterende pauze is één frame tekenen.
- **Screenshot-time-out:** na `f` (zoom to fit) vult de plaat het venster; één frame duurt dan met SwiftShader tot
  45 s terwijl de hoofdthread stil staat (profiel: 99 % idle, het GPU-proces tekent). Dat is de tekenkost van software-GL,
  geen werk dat naar de worker kan. De twee screenshots van het script wachten daarom tot 180 s (`SHOT_MS`).

## jogmiter: te vaste wachttijd in de test

- **Symptoom:** "Miter Flange1 built: a 20 mm wall on the top of the sheet {min: [0, -12, 0], max: [100, 3, 60]}".
- **Oorzaak:** geen richtingsfout. min/max zijn precies het exacte lichaam ná Jog1, zonder miter flange: op het
  releasepad (`?kernel=brep&rebuild=worker`) liep de rebuild nog (`rebuild.pending`, de vorige lichamen blijven
  getoond) toen het script na vaste 900 ms de bounding box las. Lokaal met SwiftShader eerst ook rood; een kopie die
  daarna elke 500 ms las, zag de flange wel (max y = 23, exact) zodra de rebuild klaar was.
- **Fix:** `e2e/jogmiter.mjs` wacht na elk `openDocument` en elke OK met `waitSettled` (geen rebuild meer bezig en
  de exacte lichamen binnen) in plaats van 700 tot 900 ms.

## misc7: te vaste wachttijden in de test

- **Select Other:** "{body1:0} -> {body1:0}", lokaal met SwiftShader op het releasepad twee keer op twee
  nagespeeld. Het menu-item stond er en werd geklikt, maar `bodies.pickAll` gaf geen enkel vlak (debugkopie): na
  Ctrl+7 en `f` liep de camera-overgang nog (frames van seconden), het lichaam werd aangeklikt in een tussenstand en
  Select Other wierp zijn straal vanaf de muis door het intussen verder gedraaide aanzicht. Fix in `e2e/misc7.mjs`:
  wachten tot `__phlippoCamera.animating === false` vóór het klikken; verder wachten op het menu-item en op de nieuwe
  selectie in plaats van vaste 200 ms, en de check eist dat het menu-item er was (de oude `(await so.count()) >= 0`
  was altijd waar). Daarna 2 op 2 groen (melding "Select Other: face 2 of 2 under the pointer").
  Mogelijke verbetering in het programma (niet gedaan): de straal bewaren op het moment van de rechtsklik in plaats
  van hem bij het kiezen van het menu-item opnieuw uit de pixel te rekenen (`Viewport.tsx`, `selectOther`).
- **Animate collapse** (lokaal onder belasting rood, niet op de CI): de explode-factor werd na vaste 400 ms gelezen,
  vóór het eerste animatieframe. Nu worden via een store-abonnement alle factoren van de animatie bijgehouden; de
  check eist een tussenstand (0 < f < 1) en dat de samenstelling daarna dicht is.

## gj: te vaste wachttijd in de test

- **Symptoom:** "Front view with Z up: the world Z axis points up the screen".
- **Oorzaak:** de overgang naar een standaardaanzicht (`CadCamera.animateTo`, 260 ms) loopt met
  `requestAnimationFrame`; met frames van seconden stond de camera na de vaste 600 ms nog tussen Top en Front.
- **Fix:** `CadCamera` kreeg een getter `animating`; `e2e/gj.mjs` wacht daarop (beide Up Axis-checks) en leest dan
  de projectie.

## motion: te vaste wachttijd in de test

- **Symptoom:** "Play runs the time bar, Stop holds it 0 2.72 2.72": na 1,2 s nog tijd 0, na Stop 2,72 s.
- **Oorzaak:** de tijdbalk loopt per getekend frame (echte tijd); het eerste frame van de deurkruk kwam met
  SwiftShader pas na meer dan 1,2 s (lokaal ook: 0 / 2,14 / 2,14). Stop werkt (t2 = t3).
- **Fix:** `e2e/motion.mjs` wacht tot de tijd voorbij 0,5 s is (`waitForFunction`, max 30 s) in plaats van 1,2 s.

## Uitkomst lokaal

Windows 11, Edge, eigen bundel op poort 5201 (met de fixes hierboven), machine tegelijk belast door andere e2e-runs:

| script | SwiftShader mesh | SwiftShader `?kernel=brep&rebuild=worker` | hardware-GL mesh / release | SwiftShader + CPU ×4 |
| --- | --- | --- | --- | --- |
| jogmiter | 2/2 (7/7) | 2/2 (7/7) | groen / groen | release groen |
| misc7 | 2/2 (8/8) | 2/2 (8/8) | groen / groen | release groen |
| gj | 2/2 (37/37) | 2/2 (37/37) | groen / groen | mesh groen |
| motion | 2/2 (5/5) | 2/2 (5/5) | groen / groen | mesh groen |
| rebuildworker | 2/2 (11/11) | 2/2 (11/11) | groen / groen | release groen, gap 1031 ms bij redraw 5297 ms |

Vóór de fixes lokaal met SwiftShader rood: jogmiter (release), misc7 Select Other (release, 2 op 2), motion (mesh),
rebuildworker (mesh, gap 8781 ms). gj werd lokaal niet rood, de oorzaak (camera halverwege de overgang) is dezelfde
als bij misc7 en is met de getter rechtstreeks afgewacht.

CPU-vertraging voor eigen proeven: een preload die na `browser.newPage` `Emulation.setCPUThrottlingRate` zet, naast
`e2e/lib/launch-args.mjs` (`NODE_OPTIONS="--import ./e2e/lib/launch-args.mjs --import <throttle-preload>"`).
