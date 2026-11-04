# Interactieve extra vensters in Two View / Four View (QA 0.5.11: F192 / P2-15)

## Wat er veranderd is

- `src/app/viewport/ViewPane.tsx` (enige broncode die wijzigt, 120 → 277 regels; `Viewport.tsx` niet aangeraakt):
  - Elk venster heeft een eigen `CadCamera` (dezelfde klasse als het hoofdvenster, `camera.ts`), aangemaakt bij het
    openen met de oriëntatie van het venster (`VIEW_QUATERNIONS[view]`). De tijdelijke orthografische camera die
    `drawPane` per tekening maakte, is weg; `drawPane(canvas, cam)` tekent met `cam.camera`.
  - Zolang de gebruiker in het venster niet navigeert, wordt bij elke tekening opnieuw gepast zoals vroeger
    (`fitPane`: middelpunt van de scènebox, diagonaal × 0,65 als halve hoogte; ook Up Axis volgt). Na de eerste
    draai/pan/zoom blijft de camera van de gebruiker staan, ook bij een wijziging van het model of een resize.
  - Navigatie, overgenomen van het hoofdvenster (`Viewport.tsx` onPointerDown/Move, onWheel) met de methodes van
    `CadCamera`: middelste knop draait (`orbit`), Ctrl+middelste pant (`pan`), Shift+middelste zoomt (`zoomStep`),
    Alt+middelste rolt (`roll`), dubbele middelklik past het model in het venster, het wiel zoomt rond de muis
    (`zoomAt`, met Options ▸ Reverse wheel). Pointer capture houdt een sleep vast buiten het venster.
  - Selecteren (`panePick`): dezelfde volgorde als in het hoofdvenster: eerst een rand binnen 6 px (zelfde regel: niet
    door een vlak heen, `paneEdgeAt`, een kopie van `edgeAt` met de camera van het venster), dan het vlak onder de muis
    via `bridge.bodies.pick(cam.pixelToRay(...))` (dezelfde raycast op de BodyScene). Ctrl/Shift voegt toe, een klik
    op hetzelfde vlak deselecteert, een klik op niets wist selectie van vlak, vlak (plane), feature en rand. Selection
    Filter (`filterAllows`) geldt. Bij Sketch die op een vlak wacht (`planePick`) start een klik op een vlak de schets.
  - Een dubbelklik zet het hoofdvenster nog steeds op de oriëntatie van het venster; de tweede klik van die dubbelklik
    selecteert niet opnieuw (anders zou hij de selectie van de eerste klik ongedaan maken).
  - Opnieuw tekenen: zoals na F191 (wijziging, resize, 400 ms en 1,5 s later) plus bij een selectiewijziging
    (`selectedFace`, `selectedFaces`, `selectedEdges`, zodat de markering ook in de vensters staat) en bij elke
    navigatiestap (één `requestAnimationFrame` per beeld). Geen timer zolang er niets gebeurt.
  - Testhaak (alleen met TEST_HOOKS): `window.__phlippoPanes`, een `Map` van oriëntatie naar `CadCamera`.
- Zonder WebGL: ongewijzigd, het venster toont de melding en reageert niet op de muis.

## Tests

- `e2e/viewpanes.mjs`: 35 → 45 checks. Nieuw (lichte thema, Four View): klik in het Top-venster selecteert een vlak
  (`selectedFace` gezet) en het venster tekent opnieuw; klik op leeg wist de selectie; middelste sleep in het
  Front-venster verandert de rotatie van dat venster, niet die van het hoofdvenster, en geeft een ander beeld; het
  wiel in het Right-venster verandert de schaal van dat venster, niet die van het hoofdvenster; Ctrl+middelste pant
  het Right-venster zonder te draaien; dubbelklik op het Top-venster zet het hoofdvenster op Top. Beeld:
  `e2e-out/viewpanes-interactive.png`.
- Gedraaid tegen een eigen bundel (`VITE_TEST_HOOKS=1 vite build --outDir %TEMP%/claude-dist-panes`, preview op 5193):
  viewpanes 45/45 (mesh) en 45/45 (`?kernel=brep&rebuild=worker`), smoke groen (exit 0), triad 5/5.
  `npm run typecheck` groen, `tools/neutral-comments.cjs` en `tools/line-budget.cjs` ok.

## Beperkingen

- Alleen klikken (vlak/rand) werkt in een venster. Wat in het hoofdvenster via een lopend commando naar een
  PropertyManager gaat (`pickForDraft`, hoekpunt-, contour- en flenspicks, Select Other, rechtermuismenu en
  muisgebaren, schetsgereedschappen in een open schets) blijft voorlopig alleen in het hoofdvenster.
- Geen dynamische markering onder de muis (hover) in een venster: dat zou bij elke muisbeweging een beeld plus
  pixel-read-back per venster kosten.
- Het venster is altijd orthografisch (View Settings ▸ Perspective geldt alleen voor het hoofdvenster) en het label
  blijft `*Front`/`*Top`/`*Right` ook na draaien. Navigatie wordt niet geanimeerd en heeft geen Previous View.
