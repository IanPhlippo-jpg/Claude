# Graph Report - Claude  (2026-10-27)

## Corpus Check
- 463 files · ~868,135 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .kcad 8, (none) 2, .css 2)

## Summary
- 4072 nodes · 11647 edges · 178 communities (152 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `81f9c952`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- State
- model.ts
- P4 (77) — Opgelost
- CadCamera
- Taken - Phlippo CAD
- patterns2.ts
- store.ts
- Ribbon.tsx
- useStore
- autoTolerance.ts
- drawopts.mjs
- balloons.ts
- Sketch
- SketchPoint
- PropertyPanel.tsx
- Viewport.tsx
- configurations.mjs
- desktop.mjs
- rebuild.ts
- edit.ts
- sketch/types.ts
- evaluate2.ts
- configurations.ts
- package.json
- P2 (12)
- Vergelijking met de video (lokale sessie, 2026-10-20)
- sheetmetal.ts
- features.mjs
- P3 (11)
- sketch.ts
- solid.ts
- unfold.ts
- camera.ts
- rename-trademarks.cjs
- App.tsx
- sheetmetal4.ts
- devDependencies
- annotations.ts
- compilerOptions
- sketchtools2.mjs
- brepRefine.ts
- assembly/assembly.ts
- rect3.mjs
- blockf.mjs
- AssemblyPM.tsx
- full.mjs
- richTips.tsx
- evaluate.tsx
- thread.ts
- build
- scripts
- Nieuwe testhaken en patronen
- Onderzoek: workflow en lay-out van moderne parametrische CAD
- annotations.mjs
- sheet.ts
- newId
- step.test.ts
- compilerOptions
- Phlippo CAD — QA-rapport v0.4.8
- sketchScene.ts
- faceOwner.ts
- occt-spike.mjs
- annotations2.mjs
- annotations3.mjs
- deletekey2.mjs
- ellipsetext.mjs
- drawing.mjs
- Architectuurschets
- main.cjs
- endconditions.mjs
- icons3d.tsx
- P3 — look en kwaliteit (17)
- icons.tsx
- Vergelijking met de SOLIDWORKS-handleiding en aanpassingen
- src/app/assemblyCommands.ts
- componentpattern.mjs
- gg.mjs
- editcomponent.mjs
- skip
- neutral-comments.cjs
- assembly.mjs
- surfaces.mjs
- exitCode
- thickness.mjs
- DesktopApi
- export3d.ts
- deletekey.mjs
- gj.mjs
- DraftAnalysisPM.tsx
- doorhandle.mjs
- fixes1.mjs
- brepKernel
- dependencies
- drawingfix.mjs
- P2 — vóór publieke release (14)
- rib.mjs
- P1 (7)
- P1 — GO-blokkers (13)
- qa2.mjs
- gh.mjs
- History
- Merken en auteursrecht: wat mag wel en niet lijken op het origineel
- qa1.mjs
- QA-rapport v0.3.4 verwerkt → 0.3.5 (2026-10-26)
- Phlippo CAD — QA-rapport v0.3.4
- Lokaal werken met Claude Code (Windows)
- Inventaris SOLIDWORKS-video's 45, 47–52 vs. Phlippo CAD (src/)
- tsconfig.json
- Phlippo CAD
- gb.mjs
- features2.mjs
- asmcut.mjs
- QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)
- sketchtools.mjs
- filletopts.mjs
- gi.mjs
- drawing2.mjs
- section.ts
- fasteners.ts
- examples.check.test.ts
- playwright
- refgeom.ts
- B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26)
- corners.mjs
- solver.ts
- viewerExport.ts
- motion.mjs
- persistence.ts
- preload.cjs
- prefs.ts
- arcslot.mjs
- electronFuses
- triad.mjs
- ge.mjs
- asmoptions.mjs
- Id
- Teamoordeel
- section.mjs
- sheetmetal2.mjs
- gd.mjs
- ga1.mjs
- misc7.mjs
- 10. Teamoordeel
- ga2.mjs
- tools.ts
- QA-rapport (extern, 24-10-2026) en wat ermee gebeurde
- helix.mjs
- planes.ts
- dwgopts.mjs
- slot.mjs
- B-rep: schroefdraad en frame-verstek → 0.4.2 (2026-10-26)
- ErrorBoundary
- draftcheck.mjs
- thread.mjs
- featureTypes.ts
- jogmiter.mjs
- B-rep-kern, STEP en stabiele randen → 0.3.7 (2026-10-26)
- tools/README.md
- nsis
- gf.mjs
- check.mjs
- text.ts
- vite.config.ts
- occtKernel
- explode.mjs
- unfoldfold.mjs
- Features via OpenCascade → 0.3.8 (2026-10-26)
- SelectionItem
- clickall.mjs
- HungWorker
- Ontwerpronde 0.4.4: BasePlate naast de referentievideo
- QA-rapport v0.4.8 verwerkt (0.4.9)
- B-rep: plaatwerk, weldments, booleans en vlakke terugval → 0.4.1 (2026-10-26)
- occtClient.ts
- Circle2D
- Move/Copy Bodies, Bodies to Keep en bugjacht → 0.4.3 (2026-10-27)

## God Nodes (most connected - your core abstractions)
1. `State` - 362 edges
2. `useStore` - 220 edges
3. `Id` - 217 edges
4. `rebuildDocument()` - 172 edges
5. `playwright` - 138 edges
6. `three` - 114 edges
7. `addLine()` - 109 edges
8. `vitest` - 105 edges
9. `createSketch()` - 101 edges
10. `createDocument()` - 99 edges

## Surprising Connections (you probably didn't know these)
- `Top 5 van het rapport` --references--> `withUnsavedCheck()`  [INFERRED]
  docs/12-qa-rapport-v0.3.4.md → src/app/MenuBar.tsx
- `Werkwijze (nieuw)` --references--> `desktop()`  [INFERRED]
  docs/12-qa-rapport-v0.3.4.md → src/app/desktop.ts
- `Viewport` --references--> `CadCamera`  [INFERRED]
  docs/02-fase1-schetser.md → src/app/viewport/camera.ts
- `Hoe het werkt` --references--> `rebuildDocument()`  [INFERRED]
  docs/15-brep-features-0.3.8.md → src/core/features/rebuild.ts
- `Helix and Spiral (video 17, candy stripe) (2026-10-21)` --references--> `helixPath()`  [INFERRED]
  docs/05-vergelijking-video.md → src/core/features/sweep.ts

## Import Cycles
- 3-file cycle: `src/app/MenuBar.tsx -> src/app/viewport/Viewport.tsx -> src/app/panels/FeatureTreeBody.tsx -> src/app/MenuBar.tsx`
- 3-file cycle: `src/core/assembly/assembly.ts -> src/core/features/rebuild.ts -> src/core/features/smcorners.ts -> src/core/assembly/assembly.ts`

## Communities (178 total, 26 thin omitted)

### Community 1 - "model.ts"
Cohesion: 0.07
Nodes (61): bodies(), vitest, plate(), runSelfTest(), SelfTestResult, until(), block(), pin() (+53 more)

### Community 2 - "P4 (77) — Opgelost"
Cohesion: 0.03
Nodes (78): F01 · Kritiek · Opgelost · Performance — WebGL-geheugenlek bij bewerken, F02 · Kritiek · Opgelost · Beveiliging — file:save naar willekeurig pad, F03 · Major · Opgelost · Beveiliging — Geen CSP, navigatie- en sender-beveiliging, F04 · Major · Opgelost · Beveiliging — Testhooks in productie, F05 · Kritiek · Opgelost · Bestanden — Geen schemavalidatie bij openen, F06 · Major · Opgelost · Schets — Modify accepteert 0, F07 · Major · Opgelost · Features — Extrude-diepte niet gevalideerd, F08 · Major · Opgelost · Features — Extrude op lege schets (+70 more)

### Community 3 - "CadCamera"
Cohesion: 0.18
Nodes (3): Command, ViewportBridge, CadCamera

### Community 4 - "Taken - Phlippo CAD"
Cohesion: 0.03
Nodes (77): Configuraties (ConfigurationManager, video 19) (2026-10-21), Controle met de volledige playlist (58 video's, 15 u) — na de download, Curves ▸ Helix and Spiral (2026-10-21), Desktop-app (Electron) (2026-10-20, nacht), Eindcondities en sensors (video 40, 31) (2026-10-21), Extrude met Draft (video 29, LEG BASE) (2026-10-21), Fase 2: 3D-features op een solid-kern (2026-10-20), Fase 2b: Mirror, patronen, Hole Wizard, Shell, Sweep/Loft (2026-10-20, nacht) (+69 more)

### Community 5 - "patterns2.ts"
Cohesion: 0.22
Nodes (15): holeTool(), MAX_PATTERN_INSTANCES, mirrorGeometry(), patternInstances(), rotatedAbout(), translated(), atLength(), curveInstances() (+7 more)

### Community 6 - "store.ts"
Cohesion: 0.07
Nodes (78): FeaturesKeys, SheetMetalKeys, WeldmentsKeys, weldmentsSlice(), AskOptions, AsmTool, DEFAULT_DECAL, DialogId (+70 more)

### Community 7 - "Ribbon.tsx"
Cohesion: 0.08
Nodes (46): CATEGORIES, commandById(), COMMANDS, DEFAULT_GESTURES, DEFAULT_KEYS, gestureBindings(), keyBindings(), keyCombo() (+38 more)

### Community 8 - "useStore"
Cohesion: 0.06
Nodes (92): InterferenceDialog(), insertModelInView(), AltPositionPM(), AuxViewPM(), BalloonLayoutIcon(), BrokenOutPM(), ConfigSelect(), DetailViewPM() (+84 more)

### Community 9 - "autoTolerance.ts"
Cohesion: 0.07
Nodes (36): ToleranceTreeBody(), TolerancingKeys, tolerancingSlice(), DisplayStyle, BodyEntry, BodyScene, BodySceneInput, boxUVs() (+28 more)

### Community 10 - "drawopts.mjs"
Cohesion: 0.13
Nodes (14): afront, asmDrw, det2, dim, dimAfter, dimEl, drw, errors (+6 more)

### Community 11 - "balloons.ts"
Cohesion: 0.27
Nodes (8): BalloonBox, BalloonLayout, layoutBalloons(), magneticOrder(), Side, spread(), uncross(), visibleAnchors()

### Community 12 - "Sketch"
Cohesion: 0.21
Nodes (6): BrepShape, ContourRegion, OC, Replicad, Contour, Sketch

### Community 13 - "SketchPoint"
Cohesion: 0.12
Nodes (12): ToolId, arcPoly(), PointerInfo, slotGeometry(), ToolController, FormToolInput, VentInput, ProfileSegment (+4 more)

### Community 14 - "PropertyPanel.tsx"
Cohesion: 0.09
Nodes (40): ANSI_METRIC_NAMES, APPLY_TOOLS, defaultDimText(), DetailedPreviewButton(), dimFavs(), Header(), HOLE_SIZES, HOLE_SIZES_INCH (+32 more)

### Community 15 - "Viewport.tsx"
Cohesion: 0.10
Nodes (27): MarkupLayer(), isCommandActive(), CadGTAOPass, renderWithAO(), planeLabel(), DragHandlesHandle(), extrudeCapOf(), ConfirmationCorner() (+19 more)

### Community 16 - "configurations.mjs"
Cohesion: 0.15
Nodes (7): bom, errors, head, mv, results, tree, tree2

### Community 17 - "desktop.mjs"
Cohesion: 0.14
Nodes (8): consoleLog, logs, profile, env, errs, profile, profile, stepFile

### Community 18 - "rebuild.ts"
Cohesion: 0.05
Nodes (112): B-rep: eindcondities, thin, rib en plaatwerk-basis → 0.4.0 (2026-10-26), Bewijs, faceBoundary(), isReferencePlane(), resolvePlaneDef(), brepHoleTool(), brepRoundable(), brepTool() (+104 more)

### Community 19 - "edit.ts"
Cohesion: 0.13
Nodes (41): addPiece(), arcAngles(), circularSketchPattern(), circumcentre(), convertPolylines(), copyEntities(), copyEntitiesKeep(), cornerTrim() (+33 more)

### Community 20 - "sketch/types.ts"
Cohesion: 0.16
Nodes (18): dimensionForSelection(), isCircular(), LABELS, RelationOption, relationsForSelection(), ArcEntity, CircleEntity, ConicEntity (+10 more)

### Community 21 - "evaluate2.ts"
Cohesion: 0.12
Nodes (20): CompareDialog(), CutListDialog(), fmt(), PerformanceDialog(), SaveAsDialog(), Shell(), BeamEstimateInput, BeamEstimateResult (+12 more)

### Community 22 - "configurations.ts"
Cohesion: 0.11
Nodes (44): Configuraties (ConfigurationManager) (2026-10-21), BomDialog(), fmt(), ModifyConfigurationsDialog(), ConfigurationEdit, partWithExtrude(), activateConfiguration(), activeConfiguration() (+36 more)

### Community 23 - "package.json"
Cohesion: 0.10
Nodes (20): author, description, engines, node, main, name, private, type (+12 more)

### Community 24 - "P2 (12)"
Cohesion: 0.15
Nodes (13): F100 · Major · Nieuw · Tests — desktop-nohooks niet in CI, F105 · Major · Nieuw · Tests — B-rep-pad bijna nooit in regressie geoefend, F106 · Major · Nieuw · Geometrie — occtClient.call zonder timeout of cancel, F107 · Major · Nieuw · Kwaliteit — Sketch-solver-worker is dode code, F38 · Major · Deels opgelost · Docs — README/TASKS, F46 · Major · Deels opgelost · Performance — CSG/solver op de UI-thread, F47 · Major · Deels opgelost · Geometrie — Topologische naamgeving, F48 · Major · Deels opgelost · Geometrie — CSG-resultaat ongecontroleerd / toleranties (+5 more)

### Community 25 - "Vergelijking met de video (lokale sessie, 2026-10-20)"
Cohesion: 0.08
Nodes (23): Doorgevoerd in de lokale sessie (2026-10-20, avond), Eindcondities Up To Next / Up To Surface / Offset From Surface (video 40) (2026-10-21), Evaluate en bestanden (2026-10-20, nacht), Fase 2 (2026-10-20, avond): 3D-features, Fase 3: Equations en Global Variables (2026-10-20, nacht), Fase 4: Assemblies (2026-10-20, nacht), Fase 5: Tekeningen (2026-10-21, nacht), Functionele fouten gezien tijdens het vastleggen (+15 more)

### Community 26 - "sheetmetal.ts"
Cohesion: 0.07
Nodes (60): PlaneDef, CreaseSegment, ExactJog, ExactMiter, jogOnBody(), miterFlangeOnBody(), positionShift(), sketchedBendOnBody() (+52 more)

### Community 27 - "features.mjs"
Cohesion: 0.09
Nodes (14): arrowInput, boxTris, c2, drift, eqInputs, errors, faces, mv (+6 more)

### Community 28 - "P3 (11)"
Cohesion: 0.17
Nodes (12): F101 · Minor · Nieuw · Tests — clickall (en desktop-export/peek) zonder exit-code, F102 · Minor · Nieuw · Tests — Reload-check in drawing blijft gekoppeld aan Ø35, F103 · Minor · Nieuw · Kwaliteit — PropertyPanel-monolith (3932 regels) na F36, F104 · Minor · Nieuw · Electron — blank.html-flits op file:// vóór app://, F16 · Major · Deels opgelost · Visueel — Iconen en lettertype, F21 · Minor · Deels opgelost · Visueel — Taakvenster-iconen, F22 · Minor · Deels opgelost · Visueel — Body-randen, F24 · Minor · Deels opgelost · Visueel — Extra rij in Modify (+4 more)

### Community 29 - "sketch.ts"
Cohesion: 0.14
Nodes (25): RepairSketchDialog(), SketchKeys, sketchSlice(), initialSolve, pointLineDistance(), withSpacingDimension(), offsetPolygon(), chainOf() (+17 more)

### Community 30 - "solid.ts"
Cohesion: 0.07
Nodes (47): three, three-mesh-bvh, detectInterferences(), Interference, InterferenceOptions, touchDistance(), exportStl(), geometryFromPositions() (+39 more)

### Community 31 - "unfold.ts"
Cohesion: 0.29
Nodes (7): foldGeometry(), mapGeometry(), sheetMapping, splitByPlanes(), p, unfoldGeometry(), Zone

### Community 32 - "camera.ts"
Cohesion: 0.13
Nodes (13): customPlanes, normalToView(), PlaneBasis, PLANES, Q(), REFERENCE_PLANES, ReferencePlaneId, setUpAxis() (+5 more)

### Community 33 - "rename-trademarks.cjs"
Cohesion: 0.20
Nodes (11): APPLY, edits(), fs, MAP, path, processFile(), RE, ROOT (+3 more)

### Community 34 - "App.tsx"
Cohesion: 0.05
Nodes (96): App(), AppearanceDialog, BeamEstimateDialog, BodiesToKeepDialog, BomDialog, CheckDialog, CompareDialog, CustomizeDialog (+88 more)

### Community 35 - "sheetmetal4.ts"
Cohesion: 0.06
Nodes (62): refinedResult(), bodyEdges(), creaseSegments(), edgeDir(), edgeRef, matchEdge(), matchMovedEdge(), mergeCollinear() (+54 more)

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
Cohesion: 0.19
Nodes (16): apply(), brepEnabled(), carrySelection(), nearestFace(), refineAssembly(), refined, refinedParts, run() (+8 more)

### Community 41 - "assembly/assembly.ts"
Cohesion: 0.06
Nodes (52): MateEdit, AssemblyRebuild, componentBody(), componentMatrix(), cylinderAxis(), flipWinding(), handMatrix(), leastSquares() (+44 more)

### Community 42 - "rect3.mjs"
Cohesion: 0.15
Nodes (10): clicks(), errors, fourth, lens, nr, P(), results, solid (+2 more)

### Community 43 - "blockf.mjs"
Cohesion: 0.40
Nodes (4): errors, results, S(), vol()

### Community 44 - "AssemblyPM.tsx"
Cohesion: 0.10
Nodes (32): fmtNum(), loadCustom(), loadFavorites(), MaterialDialog(), saveCustom(), saveFavorites(), STRESS, TABS (+24 more)

### Community 45 - "full.mjs"
Cohesion: 0.21
Nodes (8): errors, kinds(), lenC, nCon(), nEnt(), results, S(), sk()

### Community 46 - "richTips.tsx"
Cohesion: 0.13
Nodes (17): arrow(), ART, BODY, box(), cyl(), DESC, Look, MORE (+9 more)

### Community 47 - "evaluate.tsx"
Cohesion: 0.17
Nodes (19): fmt(), LEN_UNITS, loadMassOpts(), MASS_UNITS, MassOpts, MassPropertiesDialog(), MeasureDialog(), MeasureLine (+11 more)

### Community 48 - "thread.ts"
Cohesion: 0.43
Nodes (7): helixRings(), insideBody(), threadPreviewCurves(), threadProfile(), ThreadSpec, threadSweeps(), threadTool()

### Community 49 - "build"
Cohesion: 0.13
Nodes (15): build, appId, asar, asarUnpack, directories, extraFiles, fileAssociations, files (+7 more)

### Community 50 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, build:e2e, ci, desktop, desktop:build, desktop:start, dev (+7 more)

### Community 51 - "Nieuwe testhaken en patronen"
Cohesion: 0.40
Nodes (3): Blokken G-A t/m G-J: de laatste SOLIDWORKS-onderdelen uit de playlist-inventaris (0.3.3, 2026-10-25), Keuzes die afwijken van het origineel (bewust), Nieuwe testhaken en patronen

### Community 52 - "Onderzoek: workflow en lay-out van moderne parametrische CAD"
Cohesion: 0.18
Nodes (10): 1. Globale schermindeling (alle drie de pakketten komen overeen), 2. Sketch-workflow, 3. Constraint-solver, 4. Navigatie en sneltoetsen (conventies), 5. Feature-modelleren (fase 2, ter voorbereiding), 6. UI-componenten, 7. Bronnen, Dimensies (+2 more)

### Community 53 - "annotations.mjs"
Cohesion: 0.18
Nodes (7): asm, errors, front, items, results, tek, toPx()

### Community 54 - "sheet.ts"
Cohesion: 0.06
Nodes (98): partsOf(), drawingToolClick(), insertBlock(), arrow(), arrowHead(), directionFrom(), DrawingSheetView(), newSymbolId() (+90 more)

### Community 55 - "newId"
Cohesion: 0.08
Nodes (54): AssemblyKeys, assemblySlice(), DocumentKeys, documentSlice(), keepInSession(), featuresSlice(), sheetMetalSlice(), UiKeys (+46 more)

### Community 56 - "step.test.ts"
Cohesion: 0.11
Nodes (15): replicad, replicad-opencascadejs, setBrepKernel(), refineRebuild(), meshesToStep(), meshToSolid(), OCInstance, Replicad (+7 more)

### Community 57 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 58 - "Phlippo CAD — QA-rapport v0.4.8"
Cohesion: 0.18
Nodes (10): 0. Versie en commit, 1. Oordeel, 2. GO-voorwaarden, 3. Top 5, 4. Testresultaten, 5. Verbeteringen sinds 0.3.4 (hoogtepunten), 6. Score per gebied (t.o.v. SOLIDWORKS 2026), 8. IP-risico (+2 more)

### Community 59 - "sketchScene.ts"
Cohesion: 0.19
Nodes (12): getPlane(), PlaneId, sketchToWorld(), worldToSketch(), ExtrudeHandle(), CONTOUR_UNDER_PREVIEW, rgba(), SceneColors (+4 more)

### Community 60 - "faceOwner.ts"
Cohesion: 0.27
Nodes (10): faceOf(), loopOf(), Pick, SelectionToolbar(), isRoundFeature(), isSketchBased(), cache, faceOwner() (+2 more)

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

### Community 67 - "Architectuurschets"
Cohesion: 0.20
Nodes (9): Architectuurschets, Bekende beperkingen (fase 1), Datamodel, Demo (± 2 minuten), Fase 1 — 2D-schetser met constraint-solver, Solver, Tests, UI-conventies (docs/01-research.md en docs/03-vergelijking-solidworks.md) (+1 more)

### Community 68 - "main.cjs"
Cohesion: 0.11
Nodes (21): { app, BrowserWindow, Menu, ipcMain, dialog, shell, session, protocol }, APP_DIST, APP_INDEX, atomicWrite(), createWindow(), CSP_OCCT_WORKER, EXTERNAL_ALLOW, finishSelfTest() (+13 more)

### Community 69 - "endconditions.mjs"
Cohesion: 0.20
Nodes (5): errors, menuText, results, sel, tree

### Community 70 - "icons3d.tsx"
Cohesion: 0.13
Nodes (18): Iconen, Lint en panelen, Niet overgenomen, Visuele kwaliteit: metingen en keuzes (0.3.3), Weergave (3D), Box(), Cyl(), ell() (+10 more)

### Community 71 - "P3 — look en kwaliteit (17)"
Cohesion: 0.11
Nodes (18): F16 · Major · Deels opgelost · Visueel — Iconen en lettertype, F19 · Minor · Open · Visueel — XYZ in statusbalk, F20 · Minor · Open · Visueel — Confirmation Corner, F21 · Minor · Open · Visueel — Taakvenster-iconen, F22 · Minor · Deels opgelost · Visueel — Body-randen, F24 · Minor · Open · Visueel — Extra rij in Modify, F28 · Minor · Deels opgelost · UX — Bestandsdialoog bij Insert Component, F33 · Minor · Deels opgelost · Portabiliteit — Machinegebonden scripts (+10 more)

### Community 72 - "icons.tsx"
Cohesion: 0.05
Nodes (62): Invoer en robuustheid, react, zustand, AppearanceDialog(), hex2(), PALETTE, DesignStudyDialog(), evaluate() (+54 more)

### Community 73 - "Vergelijking met de SOLIDWORKS-handleiding en aanpassingen"
Cohesion: 0.25
Nodes (7): Derde ronde: afstemming op de YouTube-video's, Kleuren (tweede ronde), Naam en logo, Vergelijking met de SOLIDWORKS-handleiding en aanpassingen, Vierde ronde: iconen, triade, tekst, Vijfde ronde: functionele controle, relatie-iconen, Design Library, YouTube-video's

### Community 74 - "src/app/assemblyCommands.ts"
Cohesion: 0.20
Nodes (26): addComment(), comps(), copyWithMates(), downloadText(), insertNewAssembly(), insertNewPart(), makeMultibodyPart(), mirrorComponents() (+18 more)

### Community 75 - "componentpattern.mjs"
Cohesion: 0.20
Nodes (6): circ, errors, pin, radii, results, xs

### Community 76 - "gg.mjs"
Cohesion: 0.32
Nodes (5): errors, pref(), results, S(), viewName()

### Community 77 - "editcomponent.mjs"
Cohesion: 0.25
Nodes (4): depthField, errors, pin, results

### Community 78 - "skip"
Cohesion: 0.03
Nodes (29): asm, errors, results, doc, errors, results, errors, mid (+21 more)

### Community 79 - "neutral-comments.cjs"
Cohesion: 0.20
Nodes (7): APPLY, changed, fs, path, ROOT, RULES, walk()

### Community 80 - "assembly.mjs"
Cohesion: 0.17
Nodes (7): before, c2, c2b, errors, hc, results, top2

### Community 82 - "exitCode"
Cohesion: 0.03
Nodes (25): errors, results, errors, results, errors, results, errors, results (+17 more)

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

### Community 88 - "DraftAnalysisPM.tsx"
Cohesion: 0.23
Nodes (16): ThicknessAnalysisPM(), bvhCache, bvhOf(), curvatureAnalysis(), curvatureColor(), DRAFT_COLORS, draftAnalysis(), DraftClass (+8 more)

### Community 89 - "doorhandle.mjs"
Cohesion: 0.22
Nodes (3): errors, results, tree

### Community 90 - "fixes1.mjs"
Cohesion: 0.20
Nodes (5): errors, results, solid, xs, ys

### Community 92 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, react, react-dom, replicad, replicad-opencascadejs, three, three-bvh-csg, three-mesh-bvh (+1 more)

### Community 93 - "drawingfix.mjs"
Cohesion: 0.11
Nodes (17): asm, b0b, b0c, balloonCheck(), bc, clearTb, clickAt(), crosses() (+9 more)

### Community 94 - "P2 — vóór publieke release (14)"
Cohesion: 0.13
Nodes (15): F14 · Major · Deels opgelost · Visueel — Commando's actief zonder body, F36 · Major · Open · Kwaliteit — Monolithische store, F38 · Major · Deels opgelost · Docs — README/TASKS, F40 · Kritiek · Deels opgelost · Bestanden — Half-geldige .kcad; Ctrl+S overschrijft, F46 · Major · Deels opgelost · Performance — CSG/solver op de UI-thread, F47 · Major · Open · Geometrie — Topologische naamgeving, F48 · Major · Deels opgelost · Geometrie — CSG-resultaat ongecontroleerd / toleranties, F49 · Major · Deels opgelost · Electron — Release-hardening (+7 more)

### Community 95 - "rib.mjs"
Cohesion: 0.22
Nodes (3): errors, results, tree

### Community 96 - "P1 (7)"
Cohesion: 0.22
Nodes (9): 7. Alle bevindingen, F10 · Major · Open · Tekening — Ø-maat en tekening herstellen na reload, F31 · Kritiek · Deels opgelost · Proces — e2e-exitcodes / CI / niet-gecommit werk, F50 · Kritiek · Deels opgelost · Juridisch — SW-handelsmerken, F54 · Major · Open · Proces — CI rood op Linux; 'regressie groen' niet reproduceerbaar, F93 · Kritiek · Nieuw · Proces — Docs/commits claimen regressie 86/86 terwijl drawing op Linux rood blijft, F97 · Kritiek · Nieuw · Electron — Packaged app:// + OCCT WASM niet smoke-getest op Windows, F98 · Major · Nieuw · Proces — 42 commits niet gepusht / geen bewijs van remote CI-run (+1 more)

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

### Community 103 - "QA-rapport v0.3.4 verwerkt → 0.3.5 (2026-10-26)"
Cohesion: 0.25
Nodes (7): Gevonden tijdens het hertesten, Overige bevindingen, QA-rapport v0.3.4 verwerkt → 0.3.5 (2026-10-26), Resultaat van deze ronde, Rooktest van de geïnstalleerde app (GO-noot van Strati en Riki), Top 5 van het rapport, Werkwijze (nieuw)

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
Cohesion: 0.10
Nodes (19): Phlippo CAD, Status 0.3.2 (2026-10-25), Status 0.3.3 (2026-10-25), Status 0.3.4 (2026-10-25), Status 0.3.5 (2026-10-26), Status 0.3.6 (2026-10-26), Status 0.3.7 (2026-10-26), Status 0.3.8 (2026-10-26) (+11 more)

### Community 109 - "gb.mjs"
Cohesion: 0.14
Nodes (11): amf, bodyRow, buf, dl, dl2, dl3, doc(), errors (+3 more)

### Community 111 - "asmcut.mjs"
Cohesion: 0.25
Nodes (4): asm, cutIds, errors, results

### Community 112 - "QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)"
Cohesion: 0.20
Nodes (9): Gevonden tijdens het hertesten, Niet gedaan in deze ronde (met reden), Nieuwe bevindingen F53–F76, Oude bevindingen die deels, open of erger waren, QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25), Tests van deze ronde, ownUrl(), trusted() (+1 more)

### Community 113 - "sketchtools.mjs"
Cohesion: 0.29
Nodes (4): count(), errors, K(), results

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
Cohesion: 0.23
Nodes (13): SectionView, ReferencePlaneId, capTriangles(), clipPoly(), clipPolyAll(), Cut, dist(), Half (+5 more)

### Community 118 - "fasteners.ts"
Cohesion: 0.24
Nodes (11): FastenerPM(), AsmHole, FASTENER_NAMES, FastenerSlot, fastenerSlots(), FastenerType, Id, LENGTHS (+3 more)

### Community 119 - "examples.check.test.ts"
Cohesion: 0.28
Nodes (6): all, files(), isText(), literals(), files, walk()

### Community 120 - "playwright"
Cohesion: 0.02
Nodes (52): doc, logs, t0, doc, errors, results, failed, only (+44 more)

### Community 122 - "refgeom.ts"
Cohesion: 0.47
Nodes (8): RefGeometry, axisCandidate(), pointCandidate(), refGeometryFrom(), refGeometryLines(), T(), V(), circleOfEdge()

### Community 123 - "B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26)"
Cohesion: 0.40
Nodes (4): B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26), Bewijs, Shell naast een afronding: bevinding, Volgende stappen

### Community 125 - "solver.ts"
Cohesion: 0.07
Nodes (39): asm, aux, click(), errors, front, nl, nrm, results (+31 more)

### Community 126 - "viewerExport.ts"
Cohesion: 0.47
Nodes (7): bodyTriangles(), esc(), safeColor(), scriptJson(), VIEWER_SCRIPT, ViewerBody, viewerHtml()

### Community 127 - "motion.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

### Community 128 - "persistence.ts"
Cohesion: 0.14
Nodes (27): Dataverlies (de GO-voorwaarden), AutosaveEntry, checkStructure(), clearAutosave(), DocumentFormatError, FILE_EXTENSION, FILE_VERSION, isBool() (+19 more)

### Community 129 - "preload.cjs"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, on(), electron

### Community 130 - "prefs.ts"
Cohesion: 0.12
Nodes (22): F46: rebuild in een worker — haalbaarheid, Nog open (buiten deze ronde), Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26), ColorList(), OptionsDialog(), appliedTokens, applyColorScheme(), Category (+14 more)

### Community 131 - "arcslot.mjs"
Cohesion: 0.29
Nodes (4): count(), errors, K(), results

### Community 132 - "electronFuses"
Cohesion: 0.25
Nodes (8): electronFuses, enableCookieEncryption, enableEmbeddedAsarIntegrityValidation, enableNodeCliInspectArguments, enableNodeOptionsEnvironmentVariable, grantFileProtocolExtraPrivileges, onlyLoadAppFromAsar, runAsNode

### Community 133 - "triad.mjs"
Cohesion: 0.29
Nodes (6): errors, pick(), pin, results, rozet, S()

### Community 134 - "ge.mjs"
Cohesion: 0.21
Nodes (9): errors, errs(), gDepth, names(), results, ripGap, S(), twoPlates() (+1 more)

### Community 136 - "asmoptions.mjs"
Cohesion: 0.22
Nodes (3): errors, pin, results

### Community 137 - "Id"
Cohesion: 0.02
Nodes (10): ConfigEdit, MotionEdit, PlaneEdit, BeltFeature, Decal, DeleteBodyFeature, DrawingNote, FlatPatternFeature (+2 more)

### Community 138 - "Teamoordeel"
Cohesion: 0.29
Nodes (7): Ernstwijzigingen: wie stelde wat voor, MT5 Developer, Riki — Test- en CI-eerlijkheid, Risk — Risico en optimalisatie (GO-lijst, bestanden, IP), Strati — Strategie en product, Teamoordeel, Webi — Frontend, Electron en beveiliging

### Community 141 - "gd.mjs"
Cohesion: 0.26
Nodes (9): errors, errs(), nSurf(), results, run(), S(), surfArea(), undo() (+1 more)

### Community 142 - "ga1.mjs"
Cohesion: 0.24
Nodes (9): [a, b], clickAt(), errors, line, lines, proj(), results, S() (+1 more)

### Community 143 - "misc7.mjs"
Cohesion: 0.22
Nodes (6): asm, errors, lassoItem, pts, results, so

### Community 144 - "10. Teamoordeel"
Cohesion: 0.29
Nodes (7): 10. Teamoordeel, Ernstwijzigingen: wie stelde wat voor, MT5 Developer — Code quality, testing/CI, geometry kernel, Riki — Test- en CI-eerlijkheid, Risk — Risico en optimalisatie (GO-lijst, IP), Strati — Strategie en product, Webi — Frontend, Electron en beveiliging

### Community 145 - "ga2.mjs"
Cohesion: 0.36
Nodes (6): block(), errors, errs(), results, S(), vol()

### Community 146 - "tools.ts"
Cohesion: 0.11
Nodes (29): OverlayProps, PreviewItem, contourCache, regionAt(), slotOutline(), ToolRender, DSU, findContours() (+21 more)

### Community 147 - "QA-rapport (extern, 24-10-2026) en wat ermee gebeurde"
Cohesion: 0.33
Nodes (5): Beveiliging (Electron), Prestaties en kwaliteit, QA-rapport (extern, 24-10-2026) en wat ermee gebeurde, Tests en proces, Uiterlijk en gebruik

### Community 149 - "planes.ts"
Cohesion: 0.38
Nodes (10): cross(), dot(), norm(), planeOnFace(), referencePlane(), referencePlaneRaw(), rotate(), sub() (+2 more)

### Community 150 - "dwgopts.mjs"
Cohesion: 0.33
Nodes (3): errors, part, results

### Community 154 - "draftcheck.mjs"
Cohesion: 0.25
Nodes (3): errors, nums, results

### Community 156 - "featureTypes.ts"
Cohesion: 0.40
Nodes (4): typescript, ENTITY_POINT_FIELDS, ENTITY_SCALAR_FIELDS, FEATURE_TYPES

### Community 158 - "B-rep-kern, STEP en stabiele randen → 0.3.7 (2026-10-26)"
Cohesion: 0.33
Nodes (5): B-rep-kern, STEP en stabiele randen → 0.3.7 (2026-10-26), Beveiliging, Licentie, Metingen (Node, deze machine), Migratiepad naar een volledige B-rep-kern

### Community 160 - "nsis"
Cohesion: 0.20
Nodes (10): nsis, allowToChangeInstallationDirectory, artifactName, createDesktopShortcut, createStartMenuShortcut, license, oneClick, perMachine (+2 more)

### Community 161 - "gf.mjs"
Cohesion: 0.25
Nodes (3): errors, res, results

### Community 162 - "check.mjs"
Cohesion: 0.03
Nodes (57): errors, plate(), { results, check }, S(), asm, errors, { results, check }, S() (+49 more)

### Community 163 - "text.ts"
Cohesion: 0.36
Nodes (7): cache, capRatio(), caps, dedupe(), font(), fonts, textOutlines()

### Community 164 - "vite.config.ts"
Cohesion: 0.40
Nodes (3): vite, @vitejs/plugin-react, pkg

### Community 165 - "occtKernel"
Cohesion: 0.30
Nodes (9): occtKernel(), contourFace(), contourWire(), entityEdges(), facesOf(), matchFaces(), pathWire(), polygonEdges() (+1 more)

### Community 168 - "Features via OpenCascade → 0.3.8 (2026-10-26)"
Cohesion: 0.33
Nodes (5): Bewijs, Features via OpenCascade → 0.3.8 (2026-10-26), Hoe het werkt, Volgende stappen, Wat nu exact is

### Community 170 - "clickall.mjs"
Cohesion: 0.29
Nodes (3): docs, errs, report

### Community 173 - "QA-rapport v0.4.8 verwerkt (0.4.9)"
Cohesion: 0.50
Nodes (3): Eerlijk over de regressie (F93, F38), Per bevinding, QA-rapport v0.4.8 verwerkt (0.4.9)

### Community 174 - "B-rep: plaatwerk, weldments, booleans en vlakke terugval → 0.4.1 (2026-10-26)"
Cohesion: 0.40
Nodes (3): B-rep: plaatwerk, weldments, booleans en vlakke terugval → 0.4.1 (2026-10-26), Bewijs, Nog op de mesh-kern

### Community 175 - "occtClient.ts"
Cohesion: 0.33
Nodes (7): call(), ensure(), exportStep(), exportStepDoc(), KernelTimeout, pending, restart()

## Knowledge Gaps
- **9 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `@types/three`, `concurrently` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1814 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `playwright` connect `playwright` to `arcslot.mjs`, `triad.mjs`, `ge.mjs`, `asmoptions.mjs`, `drawopts.mjs`, `section.mjs`, `sheetmetal2.mjs`, `gd.mjs`, `ga1.mjs`, `misc7.mjs`, `configurations.mjs`, `desktop.mjs`, `ga2.mjs`, `helix.mjs`, `dwgopts.mjs`, `slot.mjs`, `package.json`, `draftcheck.mjs`, `features.mjs`, `thread.mjs`, `jogmiter.mjs`, `gf.mjs`, `check.mjs`, `explode.mjs`, `sketchtools2.mjs`, `unfoldfold.mjs`, `clickall.mjs`, `blockf.mjs`, `rect3.mjs`, `full.mjs`, `annotations.mjs`, `annotations2.mjs`, `annotations3.mjs`, `deletekey2.mjs`, `ellipsetext.mjs`, `drawing.mjs`, `endconditions.mjs`, `componentpattern.mjs`, `gg.mjs`, `editcomponent.mjs`, `skip`, `assembly.mjs`, `surfaces.mjs`, `exitCode`, `thickness.mjs`, `deletekey.mjs`, `gj.mjs`, `doorhandle.mjs`, `fixes1.mjs`, `drawingfix.mjs`, `rib.mjs`, `qa2.mjs`, `gh.mjs`, `qa1.mjs`, `gb.mjs`, `features2.mjs`, `asmcut.mjs`, `sketchtools.mjs`, `filletopts.mjs`, `gi.mjs`, `drawing2.mjs`, `corners.mjs`, `solver.ts`, `motion.mjs`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `rebuildDocument()` (e.g. with `F46: rebuild in een worker — haalbaarheid` and `Hoe het werkt`) actually correct?**
  _`rebuildDocument()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.00847457627118644 - nodes in this community are weakly interconnected._
- **Why does `State` connect `State` to `persistence.ts`, `prefs.ts`, `store.ts`, `useStore`, `autoTolerance.ts`, `Id`, `Sketch`, `SketchPoint`, `Viewport.tsx`, `sketch/types.ts`, `sheetmetal.ts`, `sketch.ts`, `App.tsx`, `annotations.ts`, `SelectionItem`, `assembly/assembly.ts`, `evaluate.tsx`, `Circle2D`, `Nieuwe testhaken en patronen`, `sheet.ts`, `newId`, `sketchScene.ts`, `icons.tsx`, `History`, `QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Should `model.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06710271317829457 - nodes in this community are weakly interconnected._
- **Why does `three` connect `solid.ts` to `model.ts`, `patterns2.ts`, `store.ts`, `Ribbon.tsx`, `useStore`, `autoTolerance.ts`, `balloons.ts`, `Sketch`, `Viewport.tsx`, `rebuild.ts`, `evaluate2.ts`, `package.json`, `sheetmetal.ts`, `sketch.ts`, `unfold.ts`, `camera.ts`, `App.tsx`, `sheetmetal4.ts`, `text.ts`, `brepRefine.ts`, `assembly/assembly.ts`, `evaluate.tsx`, `thread.ts`, `sheet.ts`, `newId`, `sketchScene.ts`, `faceOwner.ts`, `icons.tsx`, `src/app/assemblyCommands.ts`, `export3d.ts`, `DraftAnalysisPM.tsx`, `section.ts`, `fasteners.ts`, `refgeom.ts`, `viewerExport.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._