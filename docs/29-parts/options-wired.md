# Options die echt werken (QA 0.5.11: F112 Major / plan P2-2)

Acceptatie volgens `qa-rapporten/NAAR-100-0.5.11.md`: elke getoonde optie heeft een effecttest, of ze is weg.

| | voor | na |
|---|---|---|
| sleutels in Tools ▸ Options (`prefsSchema.ts`) | 380 | 346 |
| bedraad (`WIRED_PREFS`, `prefsWired.ts`) | 46 | 148 (+102) |
| verwijderd (geen betekenis in deze app) | – | 34 |
| nog grijs ("Not available in this version") | 334 | 198 |

## Bewaking

- `src/app/prefsWired.test.ts`
  - (bestond) `WIRED_PREFS` = precies de sleutels die de code buiten schema/standaardwaarden leest.
  - (nieuw) **elke** sleutel uit `WIRED_PREFS` komt voor in een test (`src/**/*.test.ts`). Een nieuwe bedrade optie
    zonder test laat deze test falen.
- Effecttests (elk zet de optie om en controleert dat het resultaat verandert; pure functie of store-actie):
  - `src/app/prefsFormat.test.ts` (24): maattekst, getalnotatie, eenheden, Mass Properties, tabellen, notities, arcering.
  - `src/app/sketchSnaps.test.ts` (15): Relations/Snaps en Grid/Snap op `snapPoint` (de functie die de schetstools gebruiken).
  - `src/app/prefsEffects.test.ts` (46, jsdom): de kleine optiefuncties die viewport, boom, dialogen en store aanroepen.
  - `src/app/prefsStore.test.ts` (13, jsdom): `setPrefs`, `startMate`, `insertComponent`, `setLargeAssembly`,
    `startModelView`, `addComment`, `brepEnabled`, `rebuildWorkerEnabled`, `applySoftwareGL`.
  - `src/app/prefsTables.test.ts` (6): BOM-omschrijving, cut list, en `electron/backups.cjs` op echte bestanden.
  - `src/app/recover.test.ts`: de bestaande map-test noemt nu `backup.autoRecoverFolder`.

## Nieuwe modules (Viewport.tsx, store.ts en features.ts zitten op hun regelbudget)

- `src/app/prefsFormat.ts` — getallen en maattekst: `formatNumber`, `roundValue`, `formatAngle`, `withDual`,
  `uppercaseDims`, `arrowSize`, `dimFontFamily`, `massDocUnits`, `tableFont/tableLine/tableText`, `noteText`,
  `annotationFont`, `hatchSpec`. Gebruikt door `viewport/annotations.ts`, `viewport/Overlay.tsx`,
  `drawing/DrawingSheetView.tsx`, `drawing/sheetExport.ts` (PDF/DXF-arcering), `evaluate.tsx`.
- `src/app/sketchSnaps.ts` — `snapPoint` vervangt de oude `applySnap` in `viewport/tools.ts`; `core/sketch/geometry.ts`
  `snap()` kreeg een optionele `kinds`-filter en de snaps `quadrant` en `intersection` (nieuw: `lineIntersectionNear`).
- `src/app/prefsEffects.ts` — kleine functies per optie (view, display, boom, mates, tekeningen, export, back-up).
- `src/app/prefsTables.ts` — BOM-omschrijving en cut list (apart zodat prefsEffects geen tabel-/framecode meetrekt).
- `src/app/drawing/HatchPattern.tsx` — het SVG-patroon van een doorsnede (`k-hatch`) en van Area Hatch (`k-hatch-area`).
- `electron/backups.cjs` — `rotateBackups(file, copies, removeDays)`; `electron/main.cjs` gebruikt het in `atomicWrite`.

## Bedrade sleutels (148)

Nieuw in deze ronde (102):

- **Document Properties ▸ Dimensions/Annotations/Units (maattekst, ook in tekeningen):** `doc.leadingZeroes`,
  `doc.trailingZeroes`, `doc.showUnits`, `doc.addParentheses`, `doc.toleranceDecimals`, `doc.dualDims`,
  `doc.dualLengthUnit`, `doc.dualUnitsInPlace`, `doc.dualPosition`, `doc.upperDims`, `doc.exclusionList`,
  `doc.arrowStyle`, `doc.arrowHeight`, `doc.arrowWidth`, `doc.arrowLength`, `doc.dimFont`, `doc.angleUnit`,
  `doc.angleDecimals`, `doc.rounding`, `doc.roundingOnlyDims`, `general.systemSeparator`, `general.separator`.
- **Mass Properties:** `doc.density` (dichtheid zonder materiaal), `doc.volumeUnit` (dichtheidsregel).
- **Relations/Snaps, Grid/Snap:** `snaps.enableSnapping`, `snaps.endPoints`, `snaps.centerPoints`, `snaps.midPoints`,
  `snaps.quadrantPoints`, `snaps.intersections`, `snaps.nearest`, `snaps.hv`, `snaps.hvPoints`, `snaps.parallel`,
  `snaps.perpendicular`, `snaps.angle`, `snaps.snapAngle`, `snaps.grid`, `snaps.gridOnlyWhenDisplayed`,
  `doc.gridSnapPoints`, `doc.gridDash`. (`snaps.automaticRelations` stond al in de lijst maar deed niets buiten het
  menuvinkje; nu slaat `inferredRelations` in tools.ts de relatie over als ze uit staat.)
- **View/Display/Sketch/Selection:** `view.mouseSpeed`, `view.transitionView`, `display.refTriad`,
  `display.dynamicHighlight`, `display.shadedPlanes`, `display.antialias`, `doc.planeTransparency`, `colors.envelopes`,
  `perf.shadedPreview`, `sketch.autoRotate`, `sketch.arcCenterpoints`, `selection.bulk`, `spin.time`.
- **Feature Tree / Messages:** `fm.dynamicHighlight`, `fm.scrollIntoView`, `fm.commentTimestamp`,
  `msg.displayOverDefined`, `msg.treeWarnings`, `msg.warnRebuild`.
- **General / File Explorer:** `general.recentMax`, `general.openLastAtStartup`, `general.technicalAlerts`,
  `general.componentDescription`, `fe.recent`.
- **Assemblies / Mates:** `doc.mateAlignment`, `doc.mateMakeFirstFixed`, `doc.mateShowPopup`, `doc.mateShowPreview`,
  `doc.mateUseForPositioning` (de vakjes van de Mate-PM schrijven terug naar deze opties), `asm.largeAssembly`,
  `asm.largeThreshold`, `asm.largeHideAll`, `asm.largeNoEdges`.
- **Drawings / tabellen / arcering:** `drawings.quality`, `drawings.autoScale`, `drawings.eliminateDuplicate`,
  `drawings.hatch`, `drawings.hatchPattern`, `drawings.hatchScale`, `drawings.hatchAngle`, `doc.hatchKind`,
  `doc.hatchPattern`, `doc.hatchScale`, `doc.hatchAngle`, `doc.tableFont`, `doc.tableBorder`, `doc.tableGrid`,
  `doc.upperTables`, `doc.upperNotes`, `doc.annotationFont`.
- **Frames:** `doc.weldCreateCutLists`, `doc.weldCollectIdentical`, `doc.weldSort`.
- **Import/Export:** `import.units` (STL-schaal), `export.stlFormat`, `export.units`, `export.showPreview` (de
  Export Options-pagina las eerder eigen sleutels `export.ascii/unit/showInfo` die niet in Options stonden;
  `export.resolution` 'Fine' vinkte daardoor geen keuzerondje aan — ook opgelost).
- **Backup/Recover:** `backup.enabled`, `backup.copies`, `backup.removeOld`, `backup.removeDays` (desktop: aantal
  .bak-kopieën en hun leeftijd; uit = zoals voorheen .bak en .bak2).

Al bedraad (46), nu ook met effecttest: `backup.autoRecover`, `backup.autoRecoverFolder`, `backup.autoRecoverMinutes`,
`backup.saveNotify`, `backup.saveNotifyMinutes`, `backup.saveNotifySeconds`, `colors.background`, `colors.iconColors`
(deed niets buiten de Reset-knop; nu zet `applyColorScheme` `data-icon-colors` en geeft Classic voller gekleurde
iconen), `colors.scheme`, `display.breadcrumbs`, `display.hiddenEdges`, `display.tangentEdges`, `doc.autoCenterMarks`,
`doc.blockAngle`, `doc.blockLength1..3`, `doc.displayGrid`, `doc.gridAutoScale`, `doc.gridMajor`, `doc.gridMinor`,
`doc.lengthDecimals`, `doc.lengthUnit`, `doc.massLengthUnit`, `doc.massUnit`, `doc.standard`, `doc.unitSystem`,
`drawings.displayStyle`, `export.resolution`, `export.singleFile`, `fm.treeFilter`, `general.confirmationCorner`,
`general.inputDimensionValue`, `perf.brepKernel`, `perf.magnifiedSelection`, `perf.rebuildWorker`,
`perf.softwareOpenGL`, `sketch.entityPoints`, `sketch.numericInput`, `snaps.automaticRelations`, `spin.angle`,
`spin.lengthEnglish`, `spin.lengthMetric`, `view.arrowKeys`, `view.reverseWheel`, `view.zoomFitStandard`.
Daarvoor zijn de inline `getPref(...)`-regels in bodyScene, sketchScene, Magnifier, NumericInput, Hud, ManagerPane,
shortcuts, Breadcrumbs, camera, dialogs, tolerancing, autoRecover en evaluate vervangen door functies uit
prefsEffects/prefsFormat (zelfde gedrag, nu testbaar).

## Verwijderd uit het schema (en uit `DEFAULT_PREFS`) — 34

| sleutel(s) | waarom |
|---|---|
| `general.thumbnails` | miniaturen in Windows Verkenner vragen een shell-extensie; die heeft de app niet |
| `general.englishMenus`, `general.englishNames` | de app is alleen Engelstalig (stonden al vast uitgeschakeld) |
| `general.editMacro`, `general.stopDebugger` | er zijn geen macro's en geen VSTA-debugger |
| `general.checkSolutions`, `general.sendLogs` | de app zoekt niets online en verstuurt geen logbestanden |
| `general.sounds` (+ knop Configure Sounds) | de app speelt geen geluiden |
| `general.cosmeticThreads` | gaat over het opwaarderen van bestanden uit oude versies; er is geen ouder formaat |
| `search.indexing`, `search.webSearch`, `search.3dContent`, `search.showMissing` (categorie Search) | geen indexeerdienst, geen webzoekmachine, geen online bibliotheek |
| `collab.multiUser`, `collab.addShortcut`, `collab.checkWrite`, `collab.checkInterval`, `collab.commentIndicator` (categorie Collaboration) | geen meergebruikersomgeving |
| `ext.openReadOnly`, `ext.dontPrompt`, `ext.loadDocs`, `ext.searchLocations` | onderdelen zitten ingebed in de assembly; er zijn geen verwezen bestanden om te openen, te laden of te zoeken |
| `fe.hidden`, `fe.samples` | geen verborgen verwezen documenten, geen voorbeeldenmap |
| `perf.assemblyLoading`, `perf.loadLightweight`, `perf.resolveSub`, `perf.checkOutOfDate`, `perf.resolveLightweight` | er bestaan geen lightweight-componenten |
| `asm.envelopeAutomatic` | "envelopes lightweight laden": idem |
| `doc.perfUseLightweight` | geen Large Design Review-modus |
| `doc.previewLightweight` | label "Use pre-2009 tangent edge definition": die oude definitie bestaat hier niet |
| `doc.saveTessellation`, `doc.applyToAll` | het bestand bewaart geen tessellatie (alles wordt bij openen herbouwd); er zijn geen verwezen partdocumenten |

Een opgeslagen waarde onder een verwijderde sleutel blijft in localStorage staan maar wordt nergens meer gelezen.

## Keuzes en gedragswijzigingen

- **Decimaalteken:** "Use system separator" aan = het getalformaat van de app (Engels, punt). Zo blijven e2e en de
  referentiebeelden gelijk op een Belgische Windows; uit = het teken in het vakje ernaast (bv. komma).
- **`snaps.angle` standaard uit** (was `true` in `DEFAULT_PREFS`, maar deed niets): zoals het ontwerp; aan legt een lijn
  op veelvouden van `snaps.snapAngle` wanneer de cursor binnen de pick-tolerantie van die richting ligt.
- **Parallel/loodrecht:** de lijn klikt alleen vast binnen 1,5° én de pick-tolerantie (geen relatie, alleen de
  stippellijn `direction-inference`); de lijn die vanaf zijn eigen eindpunt verder getekend wordt telt niet mee.
- **Kwadrant/snijpunt** zijn nieuwe snaps (standaard aan, zoals het ontwerp): kwadrant geeft `pointOnEntity`,
  snijpunt geen relatie.
- **Dubbele maten**: de positie volgt `doc.dualPosition` (standaard Bottom, dus onder de maat); het eigen vakje
  "Dual Dimension" van een schetsmaat gebruikt dezelfde opmaak.
- **Arcering**: standaardwaarden geven exact het oude beeld (45°, 2,5 mm, één lijn). Area Hatch heeft nu een eigen
  patroon `k-hatch-area` (e2e zocht alleen `k-hatch` op doorsneden en `.k-area-hatch` op het pad: blijft kloppen).
- **Large Assembly Settings** gaan nu vanzelf aan bij meer dan `asm.largeThreshold` componenten (bij invoegen).
- **Mates**: de vakjes Show popup / Show preview / Use for positioning only in de Mate-PM schrijven terug naar de
  documentopties (via `setPrefs`), zodat de volgende mate ermee start.

## Nog grijs (198) — niet in deze ronde

Grootste groepen: Drawings (detailweergave/print), Colors (achtergrondweergave hangt aan `ViewPane.tsx`, dat een
andere agent bewerkt), Sketch (promptClose, fullyDefined, spline-opties, autoSolveThreshold), Display (edgeMode,
transparantie in context, tempAxes, openEdges, projection voor de vierweergave in `ViewPane.tsx`), Performance,
Assemblies (moveByDragging enz.), External References, Templates/File Locations, Detailing-filters, Image Quality,
Sheet Metal (andere agent), Configurations, Touch. Ze blijven grijs met "Not available in this version" tot ze een
effect en een test hebben.
