# Graph Report - Claude  (2026-10-27)

## Corpus Check
- 461 files · ~855,064 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .kcad 8, .css 2, .cmd 2)

## Summary
- 3930 nodes · 11504 edges · 170 communities (147 shown, 23 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eacc7e86`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- State
- addLine
- document/equations.ts
- CadCamera
- Taken - Phlippo CAD
- solver.ts
- store.ts
- Ribbon.tsx
- useStore
- autoTolerance.ts
- drawopts.mjs
- DrawingSheetView.tsx
- motion.ts
- SketchPoint
- PropertyPanel.tsx
- Viewport.tsx
- features/weldments.ts
- desktop.mjs
- rebuild.ts
- edit.ts
- model.ts
- evaluateDialogs2.tsx
- configurations.ts
- package.json
- MenuBar.tsx
- Vergelijking met de video (lokale sessie, 2026-10-20)
- sheetmetal.ts
- features.mjs
- TaskPane.tsx
- sketch.ts
- solid.ts
- desktop-installed.mjs
- camera.ts
- thin.ts
- App.tsx
- edgesets.ts
- devDependencies
- annotations.ts
- compilerOptions
- sketchtools2.mjs
- Document
- assembly/assembly.ts
- rect3.mjs
- blockf.mjs
- prefs.ts
- full.mjs
- richTips.tsx
- evaluate.tsx
- thread.ts
- build
- scripts
- sheetmetal4.ts
- Onderzoek: workflow en lay-out van moderne parametrische CAD
- annotations.mjs
- sheet.ts
- featuresSlice
- step.test.ts
- compilerOptions
- evaluateDialogs.tsx
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
- pmsweep.mjs
- icons3d.tsx
- P3 — look en kwaliteit (17)
- icons.tsx
- Vergelijking met de SOLIDWORKS-handleiding en aanpassingen
- newId
- componentpattern.mjs
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
- DraftAnalysisPM.tsx
- drawing.ts
- fixes1.mjs
- Sketch
- dependencies
- drawingfix.mjs
- P2 — vóór publieke release (14)
- dialogopts.mjs
- modelItems.ts
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
- motion2.mjs
- playwright
- sketch3d.mjs
- B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26)
- corners.mjs
- viewlayout.mjs
- multibody.mjs
- motion.mjs
- persistence.ts
- preload.cjs
- Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26)
- wrap.mjs
- sweep.ts
- triad.mjs
- ge.mjs
- asmoptions.mjs
- DrawingDimension
- Teamoordeel
- ao.ts
- gd.mjs
- ga1.mjs
- misc7.mjs
- ga2.mjs
- geometry.ts
- helix.mjs
- planes.ts
- sheetmetal.mjs
- B-rep: schroefdraad en frame-verstek → 0.4.2 (2026-10-26)
- ErrorBoundary
- draftcheck.mjs
- jogmiter.mjs
- B-rep-kern, STEP en stabiele randen → 0.3.7 (2026-10-26)
- tools/README.md
- nsis
- gf.mjs
- check.mjs
- contours.ts
- occtKernel
- explode.mjs
- unfoldfold.mjs
- Features via OpenCascade → 0.3.8 (2026-10-26)
- assembly2.mjs
- clickall.mjs
- Ontwerpronde 0.4.4: BasePlate naast de referentievideo
- B-rep: plaatwerk, weldments, booleans en vlakke terugval → 0.4.1 (2026-10-26)
- occtClient.ts
- multibody.test.ts
- Move/Copy Bodies, Bodies to Keep en bugjacht → 0.4.3 (2026-10-27)
- B-rep: eindcondities, thin, rib en plaatwerk-basis → 0.4.0 (2026-10-26)

## God Nodes (most connected - your core abstractions)
1. `State` - 362 edges
2. `useStore` - 219 edges
3. `Id` - 218 edges
4. `rebuildDocument()` - 172 edges
5. `playwright` - 138 edges
6. `three` - 114 edges
7. `addLine()` - 107 edges
8. `vitest` - 104 edges
9. `createSketch()` - 99 edges
10. `createDocument()` - 97 edges

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

## Communities (170 total, 23 thin omitted)

### Community 0 - "State"
Cohesion: 0.01
Nodes (11): State, ToolContext, Decal, DeleteBodyFeature, DrawingNote, DrawingSheet, DrawingView, WeldmentFeature (+3 more)

### Community 1 - "addLine"
Cohesion: 0.08
Nodes (49): bodies(), vitest, plate(), block(), pin(), plate(), fastenerPart(), plate() (+41 more)

### Community 2 - "document/equations.ts"
Cohesion: 0.20
Nodes (16): DesignStudyDialog(), evaluate(), Output, applyEquations(), DimensionRef, dimensionTable(), EquationResult, evaluateEquations() (+8 more)

### Community 4 - "Taken - Phlippo CAD"
Cohesion: 0.03
Nodes (76): Configuraties (ConfigurationManager, video 19) (2026-10-21), Controle met de volledige playlist (58 video's, 15 u) — na de download, Curves ▸ Helix and Spiral (2026-10-21), Desktop-app (Electron) (2026-10-20, nacht), Eindcondities en sensors (video 40, 31) (2026-10-21), Extrude met Draft (video 29, LEG BASE) (2026-10-21), Fase 2: 3D-features op een solid-kern (2026-10-20), Fase 2b: Mirror, patronen, Hole Wizard, Shell, Sweep/Loft (2026-10-20, nacht) (+68 more)

### Community 5 - "solver.ts"
Cohesion: 0.11
Nodes (29): extractBlock(), entityScalars(), lineLength(), resetIds(), ata(), atv(), dependentRows(), determinedParams() (+21 more)

### Community 6 - "store.ts"
Cohesion: 0.05
Nodes (95): FeaturesKeys, SheetMetalKeys, WeldmentsKeys, weldmentsSlice(), AskOptions, AsmTool, ConfigEdit, DEFAULT_DECAL (+87 more)

### Community 7 - "Ribbon.tsx"
Cohesion: 0.09
Nodes (41): CATEGORIES, commandById(), COMMANDS, DEFAULT_GESTURES, DEFAULT_KEYS, keyBindings(), keyCombo(), keyLabel() (+33 more)

### Community 8 - "useStore"
Cohesion: 0.06
Nodes (96): AltPositionPM(), AuxViewPM(), BalloonLayoutIcon(), BrokenOutPM(), ConfigSelect(), DetailViewPM(), DrawingDimensionPM(), DrawingViewPM() (+88 more)

### Community 9 - "autoTolerance.ts"
Cohesion: 0.07
Nodes (36): TolerancingKeys, tolerancingSlice(), DisplayStyle, exposeTestHooks(), MIRROR, TEST_HOOKS, BodyEntry, BodyScene (+28 more)

### Community 10 - "drawopts.mjs"
Cohesion: 0.13
Nodes (14): afront, asmDrw, det2, dim, dimAfter, dimEl, drw, errors (+6 more)

### Community 11 - "DrawingSheetView.tsx"
Cohesion: 0.12
Nodes (29): arrow(), arrowHead(), directionFrom(), DrawingSheetView(), newSymbolId(), orientationFor(), PAPER, sheetToViewLocal() (+21 more)

### Community 12 - "motion.ts"
Cohesion: 0.15
Nodes (16): Id, modelCentre(), MotionKey, MotionSim, MotionSpring, MotionStudy, motionTransforms(), Motor (+8 more)

### Community 13 - "SketchPoint"
Cohesion: 0.14
Nodes (9): ToolId, ViewportBridge, arcPoly(), PointerInfo, slotGeometry(), slotOutline(), ToolController, dist() (+1 more)

### Community 14 - "PropertyPanel.tsx"
Cohesion: 0.11
Nodes (27): ANSI_METRIC_NAMES, APPLY_TOOLS, defaultDimText(), DetailedPreviewButton(), dimFavs(), Header(), HOLE_SIZES, HOLE_SIZES_INCH (+19 more)

### Community 15 - "Viewport.tsx"
Cohesion: 0.10
Nodes (29): gestureBindings(), isCommandActive(), planeLabel(), DragHandlesHandle(), extrudeCapOf(), ConfirmationCorner(), viewDisplayName(), ViewSelector() (+21 more)

### Community 16 - "features/weldments.ts"
Cohesion: 0.08
Nodes (36): boundaryLoops(), capLoop(), extendSurface(), fillLoops(), flattenSurface(), halfSpaceBox(), key(), ruledSurface() (+28 more)

### Community 17 - "desktop.mjs"
Cohesion: 0.14
Nodes (8): consoleLog, logs, profile, env, errs, profile, profile, stepFile

### Community 18 - "rebuild.ts"
Cohesion: 0.10
Nodes (57): holeTool(), mirrorGeometry(), patternInstances(), rotatedAbout(), translated(), atLength(), curveInstances(), distToPoly() (+49 more)

### Community 19 - "edit.ts"
Cohesion: 0.15
Nodes (41): contourCache, addPiece(), arcAngles(), circumcentre(), convertPolylines(), copyEntities(), copyEntitiesKeep(), cornerTrim() (+33 more)

### Community 20 - "model.ts"
Cohesion: 0.13
Nodes (22): Block, addPolygon(), dimensionForSelection(), isCircular(), LABELS, measure(), RelationOption, relationsForSelection() (+14 more)

### Community 21 - "evaluateDialogs2.tsx"
Cohesion: 0.11
Nodes (23): STEPS, findMaterial(), m(), MATERIAL_LIBRARY, MaterialCategory, MaterialDef, beamEstimateEstimate(), BeamEstimateInput (+15 more)

### Community 22 - "configurations.ts"
Cohesion: 0.16
Nodes (31): Configuraties (ConfigurationManager) (2026-10-21), BomDialog(), fmt(), ModifyConfigurationsDialog(), ConfigurationEdit, partWithExtrude(), activateConfiguration(), activeConfiguration() (+23 more)

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (21): author, description, main, name, private, type, version, concurrently (+13 more)

### Community 24 - "MenuBar.tsx"
Cohesion: 0.17
Nodes (22): desktop(), DesktopFile, DesktopSaveResult, getDocumentHandle(), isDesktop(), setDocumentHandle(), LEGAL_NOTICE, download() (+14 more)

### Community 25 - "Vergelijking met de video (lokale sessie, 2026-10-20)"
Cohesion: 0.08
Nodes (23): Doorgevoerd in de lokale sessie (2026-10-20, avond), Eindcondities Up To Next / Up To Surface / Offset From Surface (video 40) (2026-10-21), Evaluate en bestanden (2026-10-20, nacht), Fase 2 (2026-10-20, avond): 3D-features, Fase 3: Equations en Global Variables (2026-10-20, nacht), Fase 4: Assemblies (2026-10-20, nacht), Fase 5: Tekeningen (2026-10-21, nacht), Functionele fouten gezien tijdens het vastleggen (+15 more)

### Community 26 - "sheetmetal.ts"
Cohesion: 0.09
Nodes (43): jogOnBody(), miterFlangeOnBody(), positionShift(), sheetLineFrame(), sketchedBendOnBody(), sliceMeshLoops(), base, P (+35 more)

### Community 27 - "features.mjs"
Cohesion: 0.09
Nodes (14): arrowInput, boxTris, c2, drift, eqInputs, errors, faces, mv (+6 more)

### Community 28 - "TaskPane.tsx"
Cohesion: 0.15
Nodes (21): BlockThumb(), DesignLibrary(), FileExplorer(), RecoveryPane(), RelationsPane(), StandardPartsFolder(), TaskPane(), ViewPalette() (+13 more)

### Community 29 - "sketch.ts"
Cohesion: 0.17
Nodes (22): SketchKeys, sketchSlice(), initialSolve, pointLineDistance(), withSpacingDimension(), offsetPolygon(), chainOf(), circularSketchPattern() (+14 more)

### Community 30 - "solid.ts"
Cohesion: 0.07
Nodes (41): three, three-mesh-bvh, exportStl(), geometryFromPositions(), parseStl(), falloff(), pointDeform, subdivideOnce() (+33 more)

### Community 31 - "desktop-installed.mjs"
Cohesion: 0.11
Nodes (8): app, dbg, dir, fileVersion, { results, check }, failed, only, SCRIPTS

### Community 32 - "camera.ts"
Cohesion: 0.11
Nodes (18): customPlanes, normalToView(), PLANE_LABELS, PlaneBasis, PLANES, Q(), REFERENCE_PLANES, ReferencePlaneId (+10 more)

### Community 33 - "thin.ts"
Cohesion: 0.13
Nodes (21): CreaseSegment, Region, extendEnd(), midpoint(), resample(), ribDraft(), ribGeometry(), sweptFlangeRegions() (+13 more)

### Community 34 - "App.tsx"
Cohesion: 0.06
Nodes (75): App(), AppearanceDialog, BeamEstimateDialog, BodiesToKeepDialog, BomDialog, CheckDialog, CompareDialog, CustomizeDialog (+67 more)

### Community 35 - "edgesets.ts"
Cohesion: 0.08
Nodes (43): componentBody(), box(), bodyEdges(), creaseSegments(), edgeDir(), matchMovedEdge(), mergeCollinear(), midSegment() (+35 more)

### Community 36 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, concurrently, cross-env, electron, electron-builder, jsdom, playwright, @types/node (+8 more)

### Community 37 - "annotations.ts"
Cohesion: 0.16
Nodes (21): lengthDecimals(), dimensionDrawing, dimensionDrawingBase(), entityAnchor(), entityFrame(), fmt(), GlyphDrawing, glyphDrawings() (+13 more)

### Community 38 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 39 - "sketchtools2.mjs"
Cohesion: 0.16
Nodes (11): click(), count(), errors, fly(), hd, K(), P(), pc (+3 more)

### Community 40 - "Document"
Cohesion: 0.10
Nodes (23): apply(), brepEnabled(), carrySelection(), nearestFace(), refineAssembly(), refined, refinedParts, refinedResult() (+15 more)

### Community 41 - "assembly/assembly.ts"
Cohesion: 0.09
Nodes (37): AssemblyRebuild, componentMatrix(), cylinderAxis(), flipWinding(), handMatrix(), leastSquares(), localRef(), matrixToTransform() (+29 more)

### Community 42 - "rect3.mjs"
Cohesion: 0.15
Nodes (10): clicks(), errors, fourth, lens, nr, P(), results, solid (+2 more)

### Community 43 - "blockf.mjs"
Cohesion: 0.40
Nodes (4): errors, results, S(), vol()

### Community 44 - "prefs.ts"
Cohesion: 0.07
Nodes (46): PrefCheck(), fmtNum(), loadCustom(), loadFavorites(), MaterialDialog(), saveCustom(), saveFavorites(), STRESS (+38 more)

### Community 45 - "full.mjs"
Cohesion: 0.21
Nodes (8): errors, kinds(), lenC, nCon(), nEnt(), results, S(), sk()

### Community 46 - "richTips.tsx"
Cohesion: 0.13
Nodes (17): arrow(), ART, BODY, box(), cyl(), DESC, Look, MORE (+9 more)

### Community 47 - "evaluate.tsx"
Cohesion: 0.19
Nodes (19): fmt(), LEN_UNITS, loadMassOpts(), MASS_UNITS, MassOpts, MassPropertiesDialog(), MeasureDialog(), MeasureLine (+11 more)

### Community 48 - "thread.ts"
Cohesion: 0.36
Nodes (8): helixRings(), METRIC_THREADS, nearestThread(), threadPreviewCurves(), threadProfile(), ThreadSpec, threadSweeps(), threadTool()

### Community 49 - "build"
Cohesion: 0.09
Nodes (23): build, appId, asar, asarUnpack, directories, electronFuses, extraFiles, fileAssociations (+15 more)

### Community 50 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, build:e2e, ci, desktop, desktop:build, desktop:start, dev (+7 more)

### Community 51 - "sheetmetal4.ts"
Cohesion: 0.11
Nodes (24): Blokken G-A t/m G-J: de laatste SOLIDWORKS-onderdelen uit de playlist-inventaris (0.3.3, 2026-10-25), Keuzes die afwijken van het origineel (bewust), Nieuwe testhaken en patronen, matchEdge(), axisCylinder(), bendLine(), chainEdges(), edgeSheetFace() (+16 more)

### Community 52 - "Onderzoek: workflow en lay-out van moderne parametrische CAD"
Cohesion: 0.18
Nodes (10): 1. Globale schermindeling (alle drie de pakketten komen overeen), 2. Sketch-workflow, 3. Constraint-solver, 4. Navigatie en sneltoetsen (conventies), 5. Feature-modelleren (fase 2, ter voorbereiding), 6. UI-componenten, 7. Bronnen, Dimensies (+2 more)

### Community 53 - "annotations.mjs"
Cohesion: 0.18
Nodes (7): asm, errors, front, items, results, tek, toPx()

### Community 54 - "sheet.ts"
Cohesion: 0.10
Nodes (44): SHEET_SIZES_MM, cleanLines(), F(), key(), Line2D, mergeLines(), projectView(), silhouetteSegments() (+36 more)

### Community 55 - "featuresSlice"
Cohesion: 0.09
Nodes (46): partsOf(), AssemblyKeys, assemblySlice(), DocumentKeys, documentSlice(), keepInSession(), featuresSlice(), sheetMetalSlice() (+38 more)

### Community 56 - "step.test.ts"
Cohesion: 0.12
Nodes (14): replicad, replicad-opencascadejs, setBrepKernel(), refineRebuild(), meshesToStep(), meshToSolid(), OCInstance, Replicad (+6 more)

### Community 57 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 58 - "evaluateDialogs.tsx"
Cohesion: 0.21
Nodes (14): CheckDialog(), ImportDiagnosticsDialog(), RepairSketchDialog(), SectionPropertiesDialog(), weldPositions(), ImportedFeature, bodyCheck(), sectionProperties() (+6 more)

### Community 59 - "sketchScene.ts"
Cohesion: 0.20
Nodes (11): getPlane(), PlaneId, sketchToWorld(), worldToSketch(), ExtrudeHandle(), CONTOUR_UNDER_PREVIEW, rgba(), SceneColors (+3 more)

### Community 60 - "faceOwner.ts"
Cohesion: 0.29
Nodes (9): faceOf(), loopOf(), Pick, SelectionToolbar(), isRoundFeature(), isSketchBased(), cache, faceOwner() (+1 more)

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
Cohesion: 0.06
Nodes (49): Invoer en robuustheid, react, zustand, AppearanceDialog(), hex2(), PALETTE, InterferenceDialog(), AssemblyTreeBody() (+41 more)

### Community 73 - "Vergelijking met de SOLIDWORKS-handleiding en aanpassingen"
Cohesion: 0.25
Nodes (7): Derde ronde: afstemming op de YouTube-video's, Kleuren (tweede ronde), Naam en logo, Vergelijking met de SOLIDWORKS-handleiding en aanpassingen, Vierde ronde: iconen, triade, tekst, Vijfde ronde: functionele controle, relatie-iconen, Design Library, YouTube-video's

### Community 74 - "newId"
Cohesion: 0.25
Nodes (22): addComment(), comps(), copyWithMates(), downloadText(), insertNewAssembly(), insertNewPart(), makeMultibodyPart(), mirrorComponents() (+14 more)

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
Nodes (34): bom, errors, head, mv, results, tree, tree2, doc (+26 more)

### Community 80 - "assembly.mjs"
Cohesion: 0.17
Nodes (7): before, c2, c2b, errors, hc, results, top2

### Community 82 - "exitCode"
Cohesion: 0.03
Nodes (25): count(), errors, K(), results, errors, results, errors, results (+17 more)

### Community 83 - "thickness.mjs"
Cohesion: 0.25
Nodes (5): errors, kruk, nums, results, thin

### Community 84 - "DesktopApi"
Cohesion: 0.13
Nodes (8): DesktopApi, bodyTriangles(), esc(), safeColor(), scriptJson(), VIEWER_SCRIPT, ViewerBody, viewerHtml()

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
Cohesion: 0.24
Nodes (16): AnalysisHead(), ThicknessAnalysisPM(), UndercutAnalysisPM(), bvhCache, bvhOf(), DRAFT_COLORS, draftAnalysis(), DraftClass (+8 more)

### Community 89 - "drawing.ts"
Cohesion: 0.26
Nodes (15): DrawingKeys, drawingSlice(), autoSheetScale(), dimensionValue(), nextViewLabel(), nextViewName(), sectionFlipFor(), sheetSize() (+7 more)

### Community 90 - "fixes1.mjs"
Cohesion: 0.20
Nodes (5): errors, results, solid, xs, ys

### Community 91 - "Sketch"
Cohesion: 0.08
Nodes (20): PlaneDef, brepKernel, BrepShape, BodyEdge, ExactJog, ExactMiter, RefSelection, centroid() (+12 more)

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

### Community 96 - "modelItems.ts"
Cohesion: 0.31
Nodes (8): modelItems(), ModelItemsOptions, near(), offsetLabel(), ORTHO, DragDimensionsHandle(), handleOf(), isDimension()

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
Cohesion: 0.11
Nodes (18): Phlippo CAD, Status 0.3.2 (2026-10-25), Status 0.3.3 (2026-10-25), Status 0.3.4 (2026-10-25), Status 0.3.5 (2026-10-26), Status 0.3.6 (2026-10-26), Status 0.3.7 (2026-10-26), Status 0.3.8 (2026-10-26) (+10 more)

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
Cohesion: 0.21
Nodes (13): SectionView, ReferencePlaneId, capTriangles(), clipPoly(), clipPolyAll(), Cut, dist(), Half (+5 more)

### Community 118 - "fasteners.ts"
Cohesion: 0.18
Nodes (13): FastenerPM(), MateEdit, AsmHole, FASTENER_NAMES, FastenerSlot, fastenerSlots(), FastenerType, Id (+5 more)

### Community 119 - "motion2.mjs"
Cohesion: 0.29
Nodes (4): errors, pin, results, rozet

### Community 120 - "playwright"
Cohesion: 0.02
Nodes (56): doc, logs, t0, logs, doc, errors, results, tree (+48 more)

### Community 123 - "B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26)"
Cohesion: 0.40
Nodes (4): B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26), Bewijs, Shell naast een afronding: bevinding, Volgende stappen

### Community 125 - "viewlayout.mjs"
Cohesion: 0.09
Nodes (21): asm, aux, click(), errors, front, nl, nrm, results (+13 more)

### Community 126 - "multibody.mjs"
Cohesion: 0.22
Nodes (3): boxes, errors, results

### Community 127 - "motion.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

### Community 128 - "persistence.ts"
Cohesion: 0.05
Nodes (54): Beveiliging (Electron), Dataverlies (de GO-voorwaarden), Prestaties en kwaliteit, QA-rapport (extern, 24-10-2026) en wat ermee gebeurde, Tests en proces, Uiterlijk en gebruik, typescript, ENTITY_POINT_FIELDS (+46 more)

### Community 129 - "preload.cjs"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, on(), electron

### Community 130 - "Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26)"
Cohesion: 0.40
Nodes (4): F46: rebuild in een worker — haalbaarheid, Nog open (buiten deze ronde), Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26), manualChunks()

### Community 132 - "sweep.ts"
Cohesion: 0.30
Nodes (15): polyArea(), ccw(), capTriangles(), centroidOf(), finish(), frameOf(), loftGeometry(), orient() (+7 more)

### Community 133 - "triad.mjs"
Cohesion: 0.29
Nodes (6): errors, pick(), pin, results, rozet, S()

### Community 134 - "ge.mjs"
Cohesion: 0.21
Nodes (9): errors, errs(), gDepth, names(), results, ripGap, S(), twoPlates() (+1 more)

### Community 136 - "asmoptions.mjs"
Cohesion: 0.22
Nodes (3): errors, pin, results

### Community 137 - "DrawingDimension"
Cohesion: 0.33
Nodes (4): DrawingEdit, DrawingDimension, DrawingSymbol, DrawingViewType

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

### Community 145 - "ga2.mjs"
Cohesion: 0.36
Nodes (6): block(), errors, errs(), results, S(), vol()

### Community 146 - "geometry.ts"
Cohesion: 0.16
Nodes (19): regionAt(), add(), distanceToEntity(), distToSegment(), ellipseArcRange(), ellipseParamOf(), ellipseParams(), Hit (+11 more)

### Community 149 - "planes.ts"
Cohesion: 0.35
Nodes (10): cross(), dot(), norm(), planeOnFace(), referencePlane(), referencePlaneRaw(), rotate(), sub() (+2 more)

### Community 154 - "draftcheck.mjs"
Cohesion: 0.25
Nodes (3): errors, nums, results

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
Cohesion: 0.04
Nodes (47): errors, plate(), { results, check }, S(), asm, errors, { results, check }, S() (+39 more)

### Community 163 - "contours.ts"
Cohesion: 0.20
Nodes (12): DSU, Edge, findContours(), polygonArea(), entityLoops(), cache, capRatio(), caps (+4 more)

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

### Community 174 - "B-rep: plaatwerk, weldments, booleans en vlakke terugval → 0.4.1 (2026-10-26)"
Cohesion: 0.40
Nodes (3): B-rep: plaatwerk, weldments, booleans en vlakke terugval → 0.4.1 (2026-10-26), Bewijs, Nog op de mesh-kern

### Community 175 - "occtClient.ts"
Cohesion: 0.36
Nodes (6): call(), ensure(), exportStep(), exportStepDoc(), pending, StepBody

### Community 177 - "multibody.test.ts"
Cohesion: 0.53
Nodes (5): extrudeF(), sketchF(), square(), twoBlocks(), vol()

## Knowledge Gaps
- **9 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `@types/three`, `concurrently` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1680 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `playwright` connect `playwright` to `wrap.mjs`, `triad.mjs`, `ge.mjs`, `asmoptions.mjs`, `drawopts.mjs`, `gd.mjs`, `ga1.mjs`, `misc7.mjs`, `desktop.mjs`, `ga2.mjs`, `helix.mjs`, `sheetmetal.mjs`, `package.json`, `draftcheck.mjs`, `features.mjs`, `jogmiter.mjs`, `desktop-installed.mjs`, `gf.mjs`, `check.mjs`, `explode.mjs`, `sketchtools2.mjs`, `unfoldfold.mjs`, `assembly2.mjs`, `clickall.mjs`, `blockf.mjs`, `rect3.mjs`, `full.mjs`, `annotations.mjs`, `annotations2.mjs`, `annotations3.mjs`, `deletekey2.mjs`, `ellipsetext.mjs`, `drawing.mjs`, `pmsweep.mjs`, `componentpattern.mjs`, `gg.mjs`, `editcomponent.mjs`, `skip`, `hem.mjs`, `assembly.mjs`, `surfaces.mjs`, `exitCode`, `thickness.mjs`, `deletekey.mjs`, `gj.mjs`, `fixes1.mjs`, `drawingfix.mjs`, `dialogopts.mjs`, `qa2.mjs`, `gh.mjs`, `qa1.mjs`, `gb.mjs`, `features2.mjs`, `asmcut.mjs`, `sketchtools.mjs`, `filletopts.mjs`, `gi.mjs`, `drawing2.mjs`, `motion2.mjs`, `sketch3d.mjs`, `corners.mjs`, `viewlayout.mjs`, `multibody.mjs`, `motion.mjs`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `rebuildDocument()` (e.g. with `F46: rebuild in een worker — haalbaarheid` and `Hoe het werkt`) actually correct?**
  _`rebuildDocument()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.00794392523364486 - nodes in this community are weakly interconnected._
- **Why does `State` connect `State` to `persistence.ts`, `solver.ts`, `store.ts`, `useStore`, `autoTolerance.ts`, `DrawingDimension`, `DrawingSheetView.tsx`, `SketchPoint`, `Viewport.tsx`, `model.ts`, `MenuBar.tsx`, `sheetmetal.ts`, `TaskPane.tsx`, `sketch.ts`, `annotations.ts`, `Document`, `assembly/assembly.ts`, `prefs.ts`, `evaluate.tsx`, `sheet.ts`, `featuresSlice`, `drawing.ts`, `Sketch`, `History`, `QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)`, `fasteners.ts`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Should `addLine` be split into smaller, more focused modules?**
  _Cohesion score 0.08084391336818521 - nodes in this community are weakly interconnected._
- **Why does `three` connect `solid.ts` to `addLine`, `sweep.ts`, `store.ts`, `useStore`, `autoTolerance.ts`, `DrawingSheetView.tsx`, `ao.ts`, `motion.ts`, `Viewport.tsx`, `features/weldments.ts`, `rebuild.ts`, `evaluateDialogs2.tsx`, `package.json`, `sheetmetal.ts`, `sketch.ts`, `camera.ts`, `thin.ts`, `edgesets.ts`, `contours.ts`, `Document`, `assembly/assembly.ts`, `evaluate.tsx`, `thread.ts`, `multibody.test.ts`, `sheetmetal4.ts`, `sheet.ts`, `featuresSlice`, `evaluateDialogs.tsx`, `sketchScene.ts`, `faceOwner.ts`, `icons.tsx`, `newId`, `DesktopApi`, `export3d.ts`, `DraftAnalysisPM.tsx`, `Sketch`, `modelItems.ts`, `section.ts`, `fasteners.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._