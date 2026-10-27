# Graph Report - Claude  (2026-10-27)

## Corpus Check
- 458 files · ~830,518 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .kcad 8, .css 2, .cmd 2)

## Summary
- 3918 nodes · 11451 edges · 172 communities (150 shown, 22 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 82 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `02640927`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- State
- addLine
- Id
- CadCamera
- Taken - Phlippo CAD
- model.ts
- store.ts
- Ribbon.tsx
- useStore
- bodyScene.ts
- drawopts.mjs
- DrawingSheetView.tsx
- src/app/assemblyCommands.ts
- SketchPoint
- PropertyPanel.tsx
- Viewport.tsx
- features/weldments.ts
- desktop.mjs
- rebuild.ts
- sketch.ts
- sketch/types.ts
- evaluate2.ts
- configurations.ts
- package.json
- DrawingExtras.tsx
- Vergelijking met de video (lokale sessie, 2026-10-20)
- sheetmetal.ts
- features.mjs
- getPref
- pierce.ts
- solid.ts
- autoTolerance.ts
- refgeom.ts
- MenuBar.tsx
- App.tsx
- edgesets.ts
- devDependencies
- annotations.ts
- compilerOptions
- sketchtools2.mjs
- brepRefine.ts
- assembly/assembly.ts
- rect3.mjs
- blockf.mjs
- prefs.ts
- full.mjs
- richTips.tsx
- evaluate.tsx
- document/equations.ts
- build
- scripts
- sheetmetal4.ts
- Onderzoek: workflow en lay-out van moderne parametrische CAD
- annotations.mjs
- sheet.ts
- newId
- step.test.ts
- compilerOptions
- configurations.mjs
- SolveResult
- modelItems.ts
- occt-spike.mjs
- annotations2.mjs
- annotations3.mjs
- deletekey2.mjs
- ellipsetext.mjs
- drawing.mjs
- rib.mjs
- main.cjs
- pmsweep.mjs
- icons3d.tsx
- P3 — look en kwaliteit (17)
- icons.tsx
- Vergelijking met de SOLIDWORKS-handleiding en aanpassingen
- entityPoints
- arcslot.mjs
- gg.mjs
- editcomponent.mjs
- skip
- hem.mjs
- assembly.mjs
- surfaces.mjs
- exitCode
- thickness.mjs
- DesktopApi
- export3d.ts
- deletekey.mjs
- gj.mjs
- evaluateDialogs.tsx
- drawing.ts
- fixes1.mjs
- Sketch
- dependencies
- drawingfix.mjs
- P2 — vóór publieke release (14)
- dialogopts.mjs
- rename-trademarks.cjs
- P1 — GO-blokkers (13)
- qa2.mjs
- gh.mjs
- History
- Merken en auteursrecht: wat mag wel en niet lijken op het origineel
- qa1.mjs
- section.mjs
- Phlippo CAD — QA-rapport v0.3.4
- Lokaal werken met Claude Code (Windows)
- Inventaris SOLIDWORKS-video's 45, 47–52 vs. Phlippo CAD (src/)
- tsconfig.json
- Phlippo CAD
- gb.mjs
- features2.mjs
- viewerExport.ts
- QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)
- doorhandle.mjs
- filletopts.mjs
- gi.mjs
- drawing2.mjs
- section.ts
- slices/assembly.ts
- motion2.mjs
- playwright
- sketch3d.mjs
- B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26)
- examples.check.test.ts
- viewlayout.mjs
- multibody.mjs
- QA-rapport v0.3.4 verwerkt → 0.3.5 (2026-10-26)
- persistence.ts
- preload.cjs
- Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26)
- uptobody.mjs
- sweep.ts
- triad.mjs
- ge.mjs
- asmoptions.mjs
- confirmdelete.mjs
- Teamoordeel
- Document
- featureTypes.ts
- gd.mjs
- ga1.mjs
- misc7.mjs
- camera.ts
- ga2.mjs
- tools.ts
- render.mjs
- helix.mjs
- planes.ts
- sheetmetal.mjs
- B-rep: schroefdraad en frame-verstek → 0.4.2 (2026-10-26)
- ErrorBoundary
- draftcheck.mjs
- sectionopts.mjs
- neutral-comments.cjs
- jogmiter.mjs
- B-rep-kern, STEP en stabiele randen → 0.3.7 (2026-10-26)
- tools/README.md
- gf.mjs
- check.mjs
- text.ts
- occtKernel
- explode.mjs
- unfoldfold.mjs
- Features via OpenCascade → 0.3.8 (2026-10-26)
- assembly2.mjs
- clickall.mjs
- Ontwerpronde 0.4.4: BasePlate naast de referentievideo
- occtClient.ts
- multibody.test.ts
- Move/Copy Bodies, Bodies to Keep en bugjacht → 0.4.3 (2026-10-27)

## God Nodes (most connected - your core abstractions)
1. `State` - 362 edges
2. `useStore` - 219 edges
3. `Id` - 218 edges
4. `rebuildDocument()` - 172 edges
5. `playwright` - 138 edges
6. `three` - 114 edges
7. `addLine()` - 105 edges
8. `vitest` - 102 edges
9. `createSketch()` - 98 edges
10. `Viewport()` - 96 edges

## Surprising Connections (you probably didn't know these)
- `Top 5 van het rapport` --references--> `withUnsavedCheck()`  [INFERRED]
  docs/12-qa-rapport-v0.3.4.md → src/app/MenuBar.tsx
- `Werkwijze (nieuw)` --references--> `desktop()`  [INFERRED]
  docs/12-qa-rapport-v0.3.4.md → src/app/desktop.ts
- `Hoe het werkt` --references--> `rebuildDocument()`  [INFERRED]
  docs/15-brep-features-0.3.8.md → src/core/features/rebuild.ts
- `Helix and Spiral (video 17, candy stripe) (2026-10-21)` --references--> `helixPath()`  [INFERRED]
  docs/05-vergelijking-video.md → src/core/features/sweep.ts
- `Datamodel` --references--> `Sketch`  [INFERRED]
  docs/02-fase1-schetser.md → src/core/sketch/types.ts

## Import Cycles
- 3-file cycle: `src/app/MenuBar.tsx -> src/app/viewport/Viewport.tsx -> src/app/panels/FeatureTreeBody.tsx -> src/app/MenuBar.tsx`
- 3-file cycle: `src/core/assembly/assembly.ts -> src/core/features/rebuild.ts -> src/core/features/smcorners.ts -> src/core/assembly/assembly.ts`

## Communities (172 total, 22 thin omitted)

### Community 1 - "addLine"
Cohesion: 0.08
Nodes (48): bodies(), vitest, plate(), block(), pin(), plate(), fastenerPart(), plate() (+40 more)

### Community 2 - "Id"
Cohesion: 0.02
Nodes (14): DrawingEdit, ExplodeEdit, Sketch3DEdit, PatternInstance, DrawingDimension, DrawingSheet, DrawingSymbol, DrawingView (+6 more)

### Community 3 - "CadCamera"
Cohesion: 0.12
Nodes (10): Architectuurschets, Bekende beperkingen (fase 1), Datamodel, Demo (± 2 minuten), Fase 1 — 2D-schetser met constraint-solver, Solver, Tests, UI-conventies (docs/01-research.md en docs/03-vergelijking-solidworks.md) (+2 more)

### Community 4 - "Taken - Phlippo CAD"
Cohesion: 0.03
Nodes (76): Configuraties (ConfigurationManager, video 19) (2026-10-21), Controle met de volledige playlist (58 video's, 15 u) — na de download, Curves ▸ Helix and Spiral (2026-10-21), Desktop-app (Electron) (2026-10-20, nacht), Eindcondities en sensors (video 40, 31) (2026-10-21), Extrude met Draft (video 29, LEG BASE) (2026-10-21), Fase 2: 3D-features op een solid-kern (2026-10-20), Fase 2b: Mirror, patronen, Hole Wizard, Shell, Sweep/Loft (2026-10-20, nacht) (+68 more)

### Community 5 - "model.ts"
Cohesion: 0.12
Nodes (36): copyEntitiesKeep(), fullyDefineSketch(), addArc(), addConic(), addConstraint(), addEllipse(), addEllipseArc(), addPoint() (+28 more)

### Community 6 - "store.ts"
Cohesion: 0.05
Nodes (96): m(), FeaturesKeys, SheetMetalKeys, WeldmentsKeys, weldmentsSlice(), AskOptions, AsmTool, ConfigEdit (+88 more)

### Community 7 - "Ribbon.tsx"
Cohesion: 0.08
Nodes (46): CATEGORIES, Command, commandById(), COMMANDS, DEFAULT_GESTURES, DEFAULT_KEYS, gestureBindings(), keyBindings() (+38 more)

### Community 8 - "useStore"
Cohesion: 0.06
Nodes (85): AppearanceDialog(), AltPositionPM(), AuxViewPM(), BalloonLayoutIcon(), BrokenOutPM(), ConfigSelect(), DetailViewPM(), DrawingDimensionPM() (+77 more)

### Community 9 - "bodyScene.ts"
Cohesion: 0.10
Nodes (19): Beveiliging (Electron), Prestaties en kwaliteit, QA-rapport (extern, 24-10-2026) en wat ermee gebeurde, Tests en proces, Uiterlijk en gebruik, DisplayStyle, TEST_HOOKS, BodyEntry (+11 more)

### Community 10 - "drawopts.mjs"
Cohesion: 0.13
Nodes (14): afront, asmDrw, det2, dim, dimAfter, dimEl, drw, errors (+6 more)

### Community 11 - "DrawingSheetView.tsx"
Cohesion: 0.12
Nodes (28): arrow(), arrowHead(), directionFrom(), DrawingSheetView(), newSymbolId(), orientationFor(), PAPER, sheetToViewLocal() (+20 more)

### Community 12 - "src/app/assemblyCommands.ts"
Cohesion: 0.10
Nodes (40): addComment(), comps(), copyWithMates(), insertNewAssembly(), insertNewPart(), makeMultibodyPart(), mirrorComponents(), packAndGoFiles() (+32 more)

### Community 13 - "SketchPoint"
Cohesion: 0.15
Nodes (8): ToolId, ViewportBridge, arcPoly(), slotGeometry(), ToolController, dist(), measure(), SketchPoint

### Community 14 - "PropertyPanel.tsx"
Cohesion: 0.09
Nodes (35): ANSI_METRIC_NAMES, APPLY_TOOLS, defaultDimText(), DetailedPreviewButton(), dimFavs(), Header(), HOLE_SIZES, HOLE_SIZES_INCH (+27 more)

### Community 15 - "Viewport.tsx"
Cohesion: 0.07
Nodes (43): isCommandActive(), CadGTAOPass, renderWithAO(), planeLabel(), DragHandlesHandle(), extrudeCapOf(), viewDisplayName(), ViewSelector() (+35 more)

### Community 16 - "features/weldments.ts"
Cohesion: 0.09
Nodes (34): boundaryLoops(), capLoop(), extendSurface(), fillLoops(), flattenSurface(), halfSpaceBox(), key(), ruledSurface() (+26 more)

### Community 17 - "desktop.mjs"
Cohesion: 0.14
Nodes (8): consoleLog, logs, profile, env, errs, profile, profile, stepFile

### Community 18 - "rebuild.ts"
Cohesion: 0.10
Nodes (53): B-rep: eindcondities, thin, rib en plaatwerk-basis → 0.4.0 (2026-10-26), Bewijs, holeTool(), mirrorGeometry(), patternInstances(), rotatedAbout(), translated(), atLength() (+45 more)

### Community 19 - "sketch.ts"
Cohesion: 0.10
Nodes (48): SketchKeys, sketchSlice(), pointLineDistance(), withSpacingDimension(), faceBoundary(), offsetPolygon(), addPiece(), arcAngles() (+40 more)

### Community 20 - "sketch/types.ts"
Cohesion: 0.33
Nodes (9): ConicEntity, DIMENSION_KINDS, EllipseArcEntity, EllipseEntity, EntityBase, EntityKind, PointEntity, SplineEntity (+1 more)

### Community 21 - "evaluate2.ts"
Cohesion: 0.12
Nodes (21): F46: rebuild in een worker — haalbaarheid, box(), beamEstimateEstimate(), BeamEstimateInput, BeamEstimateResult, bodyCompare(), BodyCompareResult, compareDocuments() (+13 more)

### Community 22 - "configurations.ts"
Cohesion: 0.18
Nodes (28): Configuraties (ConfigurationManager) (2026-10-21), BomDialog(), fmt(), ModifyConfigurationsDialog(), ConfigurationEdit, partWithExtrude(), activateConfiguration(), activeConfiguration() (+20 more)

### Community 23 - "package.json"
Cohesion: 0.11
Nodes (18): author, description, main, name, private, type, version, concurrently (+10 more)

### Community 24 - "DrawingExtras.tsx"
Cohesion: 0.17
Nodes (23): LegacyOptionsDialog(), DRAWING_BLOCKS, drawingToolClick(), Frame(), GeneralTableDialog(), insertBlock(), insertModelInView(), LinearNotePatternDialog() (+15 more)

### Community 25 - "Vergelijking met de video (lokale sessie, 2026-10-20)"
Cohesion: 0.08
Nodes (23): Doorgevoerd in de lokale sessie (2026-10-20, avond), Eindcondities Up To Next / Up To Surface / Offset From Surface (video 40) (2026-10-21), Evaluate en bestanden (2026-10-20, nacht), Fase 2 (2026-10-20, avond): 3D-features, Fase 3: Equations en Global Variables (2026-10-20, nacht), Fase 4: Assemblies (2026-10-20, nacht), Fase 5: Tekeningen (2026-10-21, nacht), Functionele fouten gezien tijdens het vastleggen (+15 more)

### Community 26 - "sheetmetal.ts"
Cohesion: 0.09
Nodes (42): jogOnBody(), miterFlangeOnBody(), positionShift(), sheetLineFrame(), sketchedBendOnBody(), sliceMeshLoops(), base, P (+34 more)

### Community 27 - "features.mjs"
Cohesion: 0.09
Nodes (14): arrowInput, boxTris, c2, drift, eqInputs, errors, faces, mv (+6 more)

### Community 28 - "getPref"
Cohesion: 0.11
Nodes (33): NotePM(), PrefCheck(), fmtNum(), loadCustom(), loadFavorites(), MaterialDialog(), saveCustom(), saveFavorites() (+25 more)

### Community 30 - "solid.ts"
Cohesion: 0.08
Nodes (37): three, three-mesh-bvh, Interference, InterferenceOptions, exportStl(), geometryFromPositions(), parseStl(), falloff() (+29 more)

### Community 31 - "autoTolerance.ts"
Cohesion: 0.13
Nodes (21): TolerancingKeys, tolerancingSlice(), StoreGet, StoreSet, autoDimensionScheme(), AutoToleranceData, AutoToleranceDatum, AutoToleranceDim (+13 more)

### Community 32 - "refgeom.ts"
Cohesion: 0.20
Nodes (17): BodyEdge, axisCandidate(), pointCandidate(), refGeometryFrom(), refGeometryLines(), RefSelection, T(), V() (+9 more)

### Community 33 - "MenuBar.tsx"
Cohesion: 0.08
Nodes (46): desktop(), DesktopFile, DesktopSaveResult, getDocumentHandle(), isDesktop(), setDocumentHandle(), ConfirmDeleteDialog(), loadCdel() (+38 more)

### Community 34 - "App.tsx"
Cohesion: 0.06
Nodes (62): App(), AppearanceDialog, BeamEstimateDialog, BodiesToKeepDialog, BomDialog, CheckDialog, CompareDialog, CustomizeDialog (+54 more)

### Community 35 - "edgesets.ts"
Cohesion: 0.10
Nodes (38): bodyEdges(), creaseSegments(), edgeDir(), matchEdge(), matchMovedEdge(), mergeCollinear(), midSegment(), sameNormals() (+30 more)

### Community 36 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, concurrently, cross-env, electron, electron-builder, jsdom, playwright, @types/node (+8 more)

### Community 37 - "annotations.ts"
Cohesion: 0.17
Nodes (20): lengthDecimals(), dimensionDrawing, dimensionDrawingBase(), entityAnchor(), entityFrame(), fmt(), GlyphDrawing, glyphDrawings() (+12 more)

### Community 38 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 39 - "sketchtools2.mjs"
Cohesion: 0.16
Nodes (11): click(), count(), errors, fly(), hd, K(), P(), pc (+3 more)

### Community 40 - "brepRefine.ts"
Cohesion: 0.18
Nodes (20): apply(), brepEnabled(), carrySelection(), nearestFace(), refineAssembly(), refined, refinedParts, refinedResult() (+12 more)

### Community 41 - "assembly/assembly.ts"
Cohesion: 0.13
Nodes (25): AssemblyRebuild, componentBody(), cylinderAxis(), flipWinding(), handMatrix(), leastSquares(), matrixToTransform(), mergedCache (+17 more)

### Community 42 - "rect3.mjs"
Cohesion: 0.15
Nodes (10): clicks(), errors, fourth, lens, nr, P(), results, solid (+2 more)

### Community 43 - "blockf.mjs"
Cohesion: 0.40
Nodes (4): errors, results, S(), vol()

### Community 44 - "prefs.ts"
Cohesion: 0.17
Nodes (17): ColorList(), OptionsDialog(), appliedTokens, applyColorScheme(), Category, COLOR_SCHEME_ITEMS, Control, current (+9 more)

### Community 45 - "full.mjs"
Cohesion: 0.21
Nodes (8): errors, kinds(), lenC, nCon(), nEnt(), results, S(), sk()

### Community 46 - "richTips.tsx"
Cohesion: 0.16
Nodes (14): arrow(), ART, BODY, box(), cyl(), DESC, Look, P() (+6 more)

### Community 47 - "evaluate.tsx"
Cohesion: 0.16
Nodes (23): DesignStudyDialog(), evaluate(), Output, fmt(), LEN_UNITS, loadMassOpts(), MASS_UNITS, MassOpts (+15 more)

### Community 48 - "document/equations.ts"
Cohesion: 0.19
Nodes (17): EquationsDialog(), fmt(), applyEquations(), DimensionRef, dimensionTable(), Equation, EquationResult, equationsFromText() (+9 more)

### Community 49 - "build"
Cohesion: 0.06
Nodes (33): build, appId, asar, asarUnpack, directories, electronFuses, extraFiles, fileAssociations (+25 more)

### Community 50 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, build:e2e, ci, desktop, desktop:build, desktop:start, dev (+7 more)

### Community 51 - "sheetmetal4.ts"
Cohesion: 0.07
Nodes (48): Blokken G-A t/m G-J: de laatste SOLIDWORKS-onderdelen uit de playlist-inventaris (0.3.3, 2026-10-25), Keuzes die afwijken van het origineel (bewust), Nieuwe testhaken en patronen, round6(), v3(), brepTool(), pickByVolume(), centroid() (+40 more)

### Community 52 - "Onderzoek: workflow en lay-out van moderne parametrische CAD"
Cohesion: 0.18
Nodes (10): 1. Globale schermindeling (alle drie de pakketten komen overeen), 2. Sketch-workflow, 3. Constraint-solver, 4. Navigatie en sneltoetsen (conventies), 5. Feature-modelleren (fase 2, ter voorbereiding), 6. UI-componenten, 7. Bronnen, Dimensies (+2 more)

### Community 53 - "annotations.mjs"
Cohesion: 0.18
Nodes (7): asm, errors, front, items, results, tek, toPx()

### Community 54 - "sheet.ts"
Cohesion: 0.10
Nodes (43): SHEET_SIZES_MM, cleanLines(), F(), key(), projectView(), silhouetteSegments(), View2D, viewFrame (+35 more)

### Community 55 - "newId"
Cohesion: 0.11
Nodes (36): partsOf(), DocumentKeys, documentSlice(), keepInSession(), featuresSlice(), sheetMetalSlice(), UiKeys, uiSlice() (+28 more)

### Community 56 - "step.test.ts"
Cohesion: 0.12
Nodes (13): replicad, replicad-opencascadejs, setBrepKernel(), meshesToStep(), meshToSolid(), OCInstance, Replicad, shapesToStep() (+5 more)

### Community 57 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 58 - "configurations.mjs"
Cohesion: 0.15
Nodes (7): bom, errors, head, mv, results, tree, tree2

### Community 59 - "SolveResult"
Cohesion: 0.26
Nodes (7): fromWire(), SolveOptions, SolveResult, SolveResultWire, toWire(), SolverClient, SolveRequest

### Community 60 - "modelItems.ts"
Cohesion: 0.43
Nodes (6): modelItems(), ModelItemsOptions, near(), offsetLabel(), ORTHO, isDimension()

### Community 61 - "occt-spike.mjs"
Cohesion: 0.11
Nodes (16): back, blob, edgeFilter(), filleted, holed, mesh, out, plate (+8 more)

### Community 62 - "annotations2.mjs"
Cohesion: 0.25
Nodes (5): click(), errors, results, tek, toPx()

### Community 63 - "annotations3.mjs"
Cohesion: 0.25
Nodes (5): click(), errors, results, tek, toPx()

### Community 64 - "deletekey2.mjs"
Cohesion: 0.12
Nodes (12): alive(), btn, check(), del, errors, results, clicks(), conic (+4 more)

### Community 65 - "ellipsetext.mjs"
Cohesion: 0.25
Nodes (4): count(), errors, K(), results

### Community 66 - "drawing.mjs"
Cohesion: 0.18
Nodes (5): errors, results, topView, tv, types

### Community 67 - "rib.mjs"
Cohesion: 0.22
Nodes (3): errors, results, tree

### Community 68 - "main.cjs"
Cohesion: 0.10
Nodes (20): { app, BrowserWindow, Menu, ipcMain, dialog, shell, session, protocol }, APP_DIST, APP_INDEX, createWindow(), CSP_OCCT_WORKER, EXTERNAL_ALLOW, fs, handleOf() (+12 more)

### Community 69 - "pmsweep.mjs"
Cohesion: 0.27
Nodes (8): cancelAll(), COMMANDS, editState(), errors, open(), { results, check }, rows, S()

### Community 70 - "icons3d.tsx"
Cohesion: 0.13
Nodes (18): Iconen, Lint en panelen, Niet overgenomen, Visuele kwaliteit: metingen en keuzes (0.3.3), Weergave (3D), Box(), Cyl(), ell() (+10 more)

### Community 71 - "P3 — look en kwaliteit (17)"
Cohesion: 0.11
Nodes (18): F16 · Major · Deels opgelost · Visueel — Iconen en lettertype, F19 · Minor · Open · Visueel — XYZ in statusbalk, F20 · Minor · Open · Visueel — Confirmation Corner, F21 · Minor · Open · Visueel — Taakvenster-iconen, F22 · Minor · Deels opgelost · Visueel — Body-randen, F24 · Minor · Open · Visueel — Extra rij in Modify, F28 · Minor · Deels opgelost · UX — Bestandsdialoog bij Insert Component, F33 · Minor · Deels opgelost · Portabiliteit — Machinegebonden scripts (+10 more)

### Community 72 - "icons.tsx"
Cohesion: 0.05
Nodes (63): Invoer en robuustheid, react, zustand, SWATCHES, InterferenceDialog(), DeviationPM(), Head(), PartingLinePM() (+55 more)

### Community 73 - "Vergelijking met de SOLIDWORKS-handleiding en aanpassingen"
Cohesion: 0.25
Nodes (7): Derde ronde: afstemming op de YouTube-video's, Kleuren (tweede ronde), Naam en logo, Vergelijking met de SOLIDWORKS-handleiding en aanpassingen, Vierde ronde: iconen, triade, tekst, Vijfde ronde: functionele controle, relatie-iconen, Design Library, YouTube-video's

### Community 74 - "entityPoints"
Cohesion: 0.44
Nodes (7): RepairSketchDialog(), entityPoints(), removeEntity(), findSketchProblems(), repair(), repairSketch(), SketchProblem

### Community 75 - "arcslot.mjs"
Cohesion: 0.29
Nodes (4): count(), errors, K(), results

### Community 76 - "gg.mjs"
Cohesion: 0.32
Nodes (5): errors, pref(), results, S(), viewName()

### Community 77 - "editcomponent.mjs"
Cohesion: 0.25
Nodes (4): depthField, errors, pin, results

### Community 78 - "skip"
Cohesion: 0.04
Nodes (28): errors, results, errors, part, results, errors, menuText, results (+20 more)

### Community 80 - "assembly.mjs"
Cohesion: 0.17
Nodes (7): before, c2, c2b, errors, hc, results, top2

### Community 82 - "exitCode"
Cohesion: 0.03
Nodes (26): circ, errors, pin, radii, results, xs, errors, results (+18 more)

### Community 83 - "thickness.mjs"
Cohesion: 0.25
Nodes (5): errors, kruk, nums, results, thin

### Community 85 - "export3d.ts"
Cohesion: 0.23
Nodes (15): amfXml(), crc32(), CRC_TABLE, exportMesh(), f(), indexed(), MeshExportOptions, prepareTriangles() (+7 more)

### Community 86 - "deletekey.mjs"
Cohesion: 0.33
Nodes (6): alive(), asm, check(), errors, results, tek

### Community 87 - "gj.mjs"
Cohesion: 0.20
Nodes (8): dl, dl2, errors, errs(), html, results, S(), vol()

### Community 88 - "evaluateDialogs.tsx"
Cohesion: 0.46
Nodes (6): CheckDialog(), ImportDiagnosticsDialog(), SectionPropertiesDialog(), weldPositions(), bodyCheck(), sectionProperties()

### Community 89 - "drawing.ts"
Cohesion: 0.26
Nodes (15): DrawingKeys, drawingSlice(), autoSheetScale(), dimensionValue(), nextViewLabel(), nextViewName(), sectionFlipFor(), sheetSize() (+7 more)

### Community 90 - "fixes1.mjs"
Cohesion: 0.20
Nodes (5): errors, results, solid, xs, ys

### Community 91 - "Sketch"
Cohesion: 0.07
Nodes (15): B-rep: plaatwerk, weldments, booleans en vlakke terugval → 0.4.1 (2026-10-26), Bewijs, Nog op de mesh-kern, PlaneDef, brepKernel, BrepShape, ExactJog, ExactMiter (+7 more)

### Community 92 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, react, react-dom, replicad, replicad-opencascadejs, three, three-bvh-csg, three-mesh-bvh (+1 more)

### Community 93 - "drawingfix.mjs"
Cohesion: 0.11
Nodes (17): asm, b0b, b0c, balloonCheck(), bc, clearTb, clickAt(), crosses() (+9 more)

### Community 94 - "P2 — vóór publieke release (14)"
Cohesion: 0.13
Nodes (15): F14 · Major · Deels opgelost · Visueel — Commando's actief zonder body, F36 · Major · Open · Kwaliteit — Monolithische store, F38 · Major · Deels opgelost · Docs — README/TASKS, F40 · Kritiek · Deels opgelost · Bestanden — Half-geldige .kcad; Ctrl+S overschrijft, F46 · Major · Deels opgelost · Performance — CSG/solver op de UI-thread, F47 · Major · Open · Geometrie — Topologische naamgeving, F48 · Major · Deels opgelost · Geometrie — CSG-resultaat ongecontroleerd / toleranties, F49 · Major · Deels opgelost · Electron — Release-hardening (+7 more)

### Community 95 - "dialogopts.mjs"
Cohesion: 0.29
Nodes (4): errors, mid, part, results

### Community 96 - "rename-trademarks.cjs"
Cohesion: 0.20
Nodes (11): APPLY, edits(), fs, MAP, path, processFile(), RE, ROOT (+3 more)

### Community 97 - "P1 — GO-blokkers (13)"
Cohesion: 0.14
Nodes (14): F05 · Kritiek · Deels opgelost · Bestanden — Geen schemavalidatie bij openen, F10 · Major · Open · Tekening — Ø-maat en tekening herstellen na reload, F31 · Kritiek · Deels opgelost · Proces — e2e-exitcodes / CI / niet-gecommit werk, F41 · Kritiek · Deels opgelost · Bestanden — Geen opslagvraag / autosave, F50 · Kritiek · Deels opgelost · Juridisch — SW-handelsmerken, F54 · Major · Deels opgelost · Proces — CI rood op Linux; 'regressie groen' niet reproduceerbaar, F57 · Major · Deels opgelost · Tests — Testscripts verouderd en lek, F70 · Major · Deels opgelost · Bestanden — Schemavalidatie oppervlakkig (+6 more)

### Community 98 - "qa2.mjs"
Cohesion: 0.31
Nodes (7): depthField, errors, lastMsg(), plate(), results, S(), volOf()

### Community 99 - "gh.mjs"
Cohesion: 0.24
Nodes (9): errors, errs(), names(), nBodies(), pickFace(), results, S(), table (+1 more)

### Community 101 - "Merken en auteursrecht: wat mag wel en niet lijken op het origineel"
Cohesion: 0.33
Nodes (5): Disclaimer in de app (0.3.2), Merken en auteursrecht: wat mag wel en niet lijken op het origineel, Praktische regels voor dit project, Wat in Europa vrij is om na te maken, Wat wél beschermd is en vermeden moet worden

### Community 102 - "qa1.mjs"
Cohesion: 0.38
Nodes (5): errors, mem(), results, S(), st()

### Community 104 - "Phlippo CAD — QA-rapport v0.3.4"
Cohesion: 0.15
Nodes (12): 0. Versie en commit (eerst lezen), 10. Bestanden, 1. Oordeel, 2. GO-voorwaarden, 4. Testresultaten, 5. Alle bevindingen (op prioriteit), 6. Visuele vergelijking met SOLIDWORKS 2026, 7. Beveiliging (+4 more)

### Community 105 - "Lokaal werken met Claude Code (Windows)"
Cohesion: 0.50
Nodes (3): Desktop-app (2026-10-20), Geïnstalleerde app (2026-10-21), Lokaal werken met Claude Code (Windows)

### Community 106 - "Inventaris SOLIDWORKS-video's 45, 47–52 vs. Phlippo CAD (src/)"
Cohesion: 0.06
Nodes (32): 39 3min 07sec - but is the MASS CORRECT? - SOLIDWORKS SPEEDMODELING!, 40 BEST SOLIDWORKS TIPS and TRICKS! Step-by-step Intermediate Tutorial - 24-03-04 PUMP BODY, 41 Eccentric Reducer in SOLIDWORKS – Beginners Step-by-Step tutorial, 42 SOLIDWORKS TUTORIAL - for intermediate / advanced users - Loft, Circ Pattern, Equations, 43 SOLIDWORKS Speedmodeling in Dark Mode, 44 Advanced SOLIDWORKS Tutorial: Multi-Material Corner Shelf | Sweeps + Patterns, 45 SOLIDWORKS Step-by-Step TUTORIAL - Corner Shelf using Multi-Body and Multi-Material, 47 SOLIDWORKS Speedmodeling and Robust Parametric Design - Paper Towel Holder - 3D Sketch and Sweep (+24 more)

### Community 108 - "Phlippo CAD"
Cohesion: 0.12
Nodes (16): Phlippo CAD, Status 0.3.2 (2026-10-25), Status 0.3.3 (2026-10-25), Status 0.3.4 (2026-10-25), Status 0.3.5 (2026-10-26), Status 0.3.6 (2026-10-26), Status 0.3.7 (2026-10-26), Status 0.3.8 (2026-10-26) (+8 more)

### Community 109 - "gb.mjs"
Cohesion: 0.14
Nodes (11): amf, bodyRow, buf, dl, dl2, dl3, doc(), errors (+3 more)

### Community 111 - "viewerExport.ts"
Cohesion: 0.47
Nodes (7): bodyTriangles(), esc(), safeColor(), scriptJson(), VIEWER_SCRIPT, ViewerBody, viewerHtml()

### Community 112 - "QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)"
Cohesion: 0.20
Nodes (9): Gevonden tijdens het hertesten, Niet gedaan in deze ronde (met reden), Nieuwe bevindingen F53–F76, Oude bevindingen die deels, open of erger waren, QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25), Tests van deze ronde, ownUrl(), trusted() (+1 more)

### Community 113 - "doorhandle.mjs"
Cohesion: 0.22
Nodes (3): errors, results, tree

### Community 114 - "filletopts.mjs"
Cohesion: 0.20
Nodes (5): errors, pickTopEdges(), results, topLongEdges(), undo()

### Community 115 - "gi.mjs"
Cohesion: 0.32
Nodes (5): dx(), errors, pickFace(), results, S()

### Community 116 - "drawing2.mjs"
Cohesion: 0.22
Nodes (7): clickSheet(), errors, P(), painted, results, [srcNote, dstNote], tek

### Community 117 - "section.ts"
Cohesion: 0.21
Nodes (13): SectionView, ReferencePlaneId, capTriangles(), clipPoly(), clipPolyAll(), Cut, dist(), Half (+5 more)

### Community 118 - "slices/assembly.ts"
Cohesion: 0.09
Nodes (31): FastenerPM(), AssemblyKeys, assemblySlice(), COUPLING_MATES, explodeStepOf(), joinMateRefs(), MateEdit, mateRefCount() (+23 more)

### Community 119 - "motion2.mjs"
Cohesion: 0.29
Nodes (4): errors, pin, results, rozet

### Community 120 - "playwright"
Cohesion: 0.02
Nodes (51): asm, cutIds, errors, results, doc, logs, t0, logs (+43 more)

### Community 123 - "B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26)"
Cohesion: 0.40
Nodes (4): B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26), Bewijs, Shell naast een afronding: bevinding, Volgende stappen

### Community 124 - "examples.check.test.ts"
Cohesion: 0.28
Nodes (6): all, files(), isText(), literals(), files, walk()

### Community 125 - "viewlayout.mjs"
Cohesion: 0.09
Nodes (21): asm, aux, click(), errors, front, nl, nrm, results (+13 more)

### Community 126 - "multibody.mjs"
Cohesion: 0.22
Nodes (3): boxes, errors, results

### Community 127 - "QA-rapport v0.3.4 verwerkt → 0.3.5 (2026-10-26)"
Cohesion: 0.25
Nodes (7): Gevonden tijdens het hertesten, Overige bevindingen, QA-rapport v0.3.4 verwerkt → 0.3.5 (2026-10-26), Resultaat van deze ronde, Rooktest van de geïnstalleerde app (GO-noot van Strati en Riki), Top 5 van het rapport, Werkwijze (nieuw)

### Community 128 - "persistence.ts"
Cohesion: 0.14
Nodes (27): Dataverlies (de GO-voorwaarden), AutosaveEntry, checkStructure(), clearAutosave(), DocumentFormatError, FILE_EXTENSION, FILE_VERSION, isBool() (+19 more)

### Community 129 - "preload.cjs"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, on(), electron

### Community 130 - "Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26)"
Cohesion: 0.18
Nodes (7): Nog open (buiten deze ronde), Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26), vite, @vitejs/plugin-react, renameOldKeys(), manualChunks(), pkg

### Community 131 - "uptobody.mjs"
Cohesion: 0.29
Nodes (3): blk, errors, results

### Community 132 - "sweep.ts"
Cohesion: 0.33
Nodes (13): capTriangles(), centroidOf(), finish(), frameOf(), loftGeometry(), orient(), placeLoop(), resample() (+5 more)

### Community 133 - "triad.mjs"
Cohesion: 0.29
Nodes (6): errors, pick(), pin, results, rozet, S()

### Community 134 - "ge.mjs"
Cohesion: 0.21
Nodes (9): errors, errs(), gDepth, names(), results, ripGap, S(), twoPlates() (+1 more)

### Community 136 - "asmoptions.mjs"
Cohesion: 0.22
Nodes (3): errors, pin, results

### Community 137 - "confirmdelete.mjs"
Cohesion: 0.33
Nodes (3): doc, errors, results

### Community 138 - "Teamoordeel"
Cohesion: 0.29
Nodes (7): Ernstwijzigingen: wie stelde wat voor, MT5 Developer, Riki — Test- en CI-eerlijkheid, Risk — Risico en optimalisatie (GO-lijst, bestanden, IP), Strati — Strategie en product, Teamoordeel, Webi — Frontend, Electron en beveiliging

### Community 139 - "Document"
Cohesion: 0.16
Nodes (9): InsertGhost, Configuration, Document, DeleteDependents, featureDependents(), geometricChildren(), Id, sketchOf() (+1 more)

### Community 140 - "featureTypes.ts"
Cohesion: 0.40
Nodes (4): typescript, ENTITY_POINT_FIELDS, ENTITY_SCALAR_FIELDS, FEATURE_TYPES

### Community 141 - "gd.mjs"
Cohesion: 0.26
Nodes (9): errors, errs(), nSurf(), results, run(), S(), surfArea(), undo() (+1 more)

### Community 142 - "ga1.mjs"
Cohesion: 0.24
Nodes (9): [a, b], clickAt(), errors, line, lines, proj(), results, S() (+1 more)

### Community 143 - "misc7.mjs"
Cohesion: 0.22
Nodes (6): asm, errors, lassoItem, pts, results, so

### Community 144 - "camera.ts"
Cohesion: 0.10
Nodes (24): customPlanes, getPlane(), normalToView(), PlaneBasis, PlaneId, PLANES, Q(), REFERENCE_PLANES (+16 more)

### Community 145 - "ga2.mjs"
Cohesion: 0.36
Nodes (6): block(), errors, errs(), results, S(), vol()

### Community 146 - "tools.ts"
Cohesion: 0.12
Nodes (29): contourCache, PointerInfo, regionAt(), slotOutline(), ToolContext, Contour, DSU, Edge (+21 more)

### Community 147 - "render.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

### Community 149 - "planes.ts"
Cohesion: 0.14
Nodes (18): exposeTestHooks(), Feature, base, vol(), holeDoc(), plate(), cross(), dot() (+10 more)

### Community 154 - "draftcheck.mjs"
Cohesion: 0.25
Nodes (3): errors, nums, results

### Community 155 - "sectionopts.mjs"
Cohesion: 0.29
Nodes (3): errors, part, results

### Community 156 - "neutral-comments.cjs"
Cohesion: 0.20
Nodes (7): APPLY, changed, fs, path, ROOT, RULES, walk()

### Community 158 - "B-rep-kern, STEP en stabiele randen → 0.3.7 (2026-10-26)"
Cohesion: 0.33
Nodes (5): B-rep-kern, STEP en stabiele randen → 0.3.7 (2026-10-26), Beveiliging, Licentie, Metingen (Node, deze machine), Migratiepad naar een volledige B-rep-kern

### Community 161 - "gf.mjs"
Cohesion: 0.25
Nodes (3): errors, res, results

### Community 162 - "check.mjs"
Cohesion: 0.04
Nodes (49): errors, plate(), { results, check }, S(), asm, errors, { results, check }, S() (+41 more)

### Community 163 - "text.ts"
Cohesion: 0.36
Nodes (7): cache, capRatio(), caps, dedupe(), font(), fonts, textOutlines()

### Community 165 - "occtKernel"
Cohesion: 0.30
Nodes (9): occtKernel(), contourFace(), contourWire(), entityEdges(), facesOf(), matchFaces(), pathWire(), polygonEdges() (+1 more)

### Community 168 - "Features via OpenCascade → 0.3.8 (2026-10-26)"
Cohesion: 0.33
Nodes (5): Bewijs, Features via OpenCascade → 0.3.8 (2026-10-26), Hoe het werkt, Volgende stappen, Wat nu exact is

### Community 169 - "assembly2.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

### Community 170 - "clickall.mjs"
Cohesion: 0.29
Nodes (3): docs, errs, report

### Community 175 - "occtClient.ts"
Cohesion: 0.31
Nodes (7): call(), ensure(), exportStep(), exportStepDoc(), pending, refineRebuild(), StepBody

### Community 177 - "multibody.test.ts"
Cohesion: 0.53
Nodes (5): extrudeF(), sketchF(), square(), twoBlocks(), vol()

## Knowledge Gaps
- **9 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `@types/three`, `concurrently` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1677 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `playwright` connect `playwright` to `uptobody.mjs`, `triad.mjs`, `ge.mjs`, `asmoptions.mjs`, `confirmdelete.mjs`, `drawopts.mjs`, `gd.mjs`, `ga1.mjs`, `misc7.mjs`, `desktop.mjs`, `ga2.mjs`, `render.mjs`, `helix.mjs`, `sheetmetal.mjs`, `package.json`, `draftcheck.mjs`, `features.mjs`, `sectionopts.mjs`, `jogmiter.mjs`, `gf.mjs`, `check.mjs`, `explode.mjs`, `sketchtools2.mjs`, `unfoldfold.mjs`, `assembly2.mjs`, `clickall.mjs`, `blockf.mjs`, `rect3.mjs`, `full.mjs`, `annotations.mjs`, `configurations.mjs`, `annotations2.mjs`, `annotations3.mjs`, `deletekey2.mjs`, `ellipsetext.mjs`, `drawing.mjs`, `rib.mjs`, `pmsweep.mjs`, `arcslot.mjs`, `gg.mjs`, `editcomponent.mjs`, `skip`, `hem.mjs`, `assembly.mjs`, `surfaces.mjs`, `exitCode`, `thickness.mjs`, `deletekey.mjs`, `gj.mjs`, `fixes1.mjs`, `drawingfix.mjs`, `dialogopts.mjs`, `qa2.mjs`, `gh.mjs`, `qa1.mjs`, `section.mjs`, `gb.mjs`, `features2.mjs`, `doorhandle.mjs`, `filletopts.mjs`, `gi.mjs`, `drawing2.mjs`, `motion2.mjs`, `sketch3d.mjs`, `viewlayout.mjs`, `multibody.mjs`?**
  _High betweenness centrality (0.126) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `rebuildDocument()` (e.g. with `F46: rebuild in een worker — haalbaarheid` and `Hoe het werkt`) actually correct?**
  _`rebuildDocument()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.008732646663681147 - nodes in this community are weakly interconnected._
- **Why does `State` connect `State` to `persistence.ts`, `Id`, `store.ts`, `useStore`, `Document`, `DrawingSheetView.tsx`, `SketchPoint`, `Viewport.tsx`, `sketch.ts`, `sheetmetal.ts`, `autoTolerance.ts`, `MenuBar.tsx`, `annotations.ts`, `assembly/assembly.ts`, `prefs.ts`, `evaluate.tsx`, `document/equations.ts`, `newId`, `SolveResult`, `drawing.ts`, `Sketch`, `History`, `QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)`, `slices/assembly.ts`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Should `addLine` be split into smaller, more focused modules?**
  _Cohesion score 0.08421052631578947 - nodes in this community are weakly interconnected._
- **Why does `three` connect `solid.ts` to `addLine`, `sweep.ts`, `store.ts`, `Ribbon.tsx`, `bodyScene.ts`, `DrawingSheetView.tsx`, `src/app/assemblyCommands.ts`, `Viewport.tsx`, `camera.ts`, `features/weldments.ts`, `rebuild.ts`, `sketch.ts`, `evaluate2.ts`, `planes.ts`, `package.json`, `sheetmetal.ts`, `pierce.ts`, `autoTolerance.ts`, `refgeom.ts`, `edgesets.ts`, `text.ts`, `brepRefine.ts`, `assembly/assembly.ts`, `evaluate.tsx`, `multibody.test.ts`, `sheetmetal4.ts`, `sheet.ts`, `modelItems.ts`, `icons.tsx`, `export3d.ts`, `evaluateDialogs.tsx`, `Sketch`, `viewerExport.ts`, `section.ts`, `slices/assembly.ts`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._