# Graph Report - Claude  (2026-10-27)

## Corpus Check
- 498 files · ~947,232 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .kcad 8, (none) 2, .css 2)

## Summary
- 4281 nodes · 12543 edges · 183 communities (157 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 127 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `037d8bf1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- State
- vitest
- P4 (77) — Opgelost
- CadCamera
- Taken - Phlippo CAD
- Section
- store.ts
- react
- ManagerPane.tsx
- bodyScene.ts
- drawopts.mjs
- autoTolerance.ts
- Sketch
- SketchPoint
- useStore
- Viewport.tsx
- configurations.mjs
- desktop.mjs
- rebuild.ts
- sketch.ts
- model.ts
- evaluate2.ts
- featuresSlice
- package.json
- P2 (12)
- Vergelijking met de video (lokale sessie, 2026-10-20)
- sheetmetal.ts
- TaskPane.tsx
- P3 (11)
- relations.ts
- solid.ts
- sheetmetal4.ts
- camera.ts
- rename-trademarks.cjs
- App.tsx
- round.ts
- devDependencies
- modelItems.ts
- compilerOptions
- sketchtools2.mjs
- brepRefine.ts
- assembly/assembly.ts
- rect3.mjs
- blockf.mjs
- getPref
- full.mjs
- endconditions.mjs
- evaluate.tsx
- qa3.mjs
- build
- scripts
- rib.ts
- Onderzoek: workflow en lay-out van moderne parametrische CAD
- annotations.mjs
- sheet.ts
- slices/assembly.ts
- step.test.ts
- compilerOptions
- Phlippo CAD — QA-rapport v0.4.8
- features/weldments.ts
- DrawingView
- occt-spike.mjs
- annotations2.mjs
- annotations3.mjs
- deletekey2.mjs
- ellipsetext.mjs
- drawing.mjs
- videos46.mjs
- main.cjs
- src/app/assemblyCommands.ts
- icons3d.tsx
- P3 — look en kwaliteit (17)
- components.tsx
- Vergelijking met de SOLIDWORKS-handleiding en aanpassingen
- addLine
- componentpattern.mjs
- gg.mjs
- editcomponent.mjs
- skip
- videos56.mjs
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
- edgesets.ts
- asmcut.mjs
- QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)
- sketchtools.mjs
- filletopts.mjs
- gi.mjs
- drawing2.mjs
- section.ts
- fasteners.ts
- corners.mjs
- playwright
- refgeom.ts
- B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26)
- features2.mjs
- solver.ts
- viewerExport.ts
- motion2.mjs
- persistence.ts
- preload.cjs
- Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26)
- sectionopts.mjs
- electronFuses
- triad.mjs
- ge.mjs
- dwgopts.mjs
- Id
- Teamoordeel
- section.mjs
- sheetmetal2.mjs
- gd.mjs
- ga1.mjs
- misc7.mjs
- 10. Teamoordeel
- ga2.mjs
- geometry.ts
- render.mjs
- helix.mjs
- planes.ts
- Document
- viewlayout.mjs
- B-rep: schroefdraad en frame-verstek → 0.4.2 (2026-10-26)
- ErrorBoundary
- draftcheck.mjs
- deform.test.ts
- featureTypes.ts
- B-rep-kern, STEP en stabiele randen → 0.3.7 (2026-10-26)
- tools/README.md
- nsis
- gf.mjs
- check.mjs
- document/equations.ts
- occtKernel
- rebuildworker.mjs
- unfoldfold.mjs
- Features via OpenCascade → 0.3.8 (2026-10-26)
- SelectionItem
- line-budget.cjs
- HungWorker
- Ontwerpronde 0.4.4: BasePlate naast de referentievideo
- QA-rapport v0.4.8 verwerkt (0.4.9)
- B-rep: plaatwerk, weldments, booleans en vlakke terugval → 0.4.1 (2026-10-26)
- occtClient.ts
- Circle2D
- appearance2.mjs
- Move/Copy Bodies, Bodies to Keep en bugjacht → 0.4.3 (2026-10-27)
- hem.mjs
- dialogopts.mjs
- sketch3d.mjs
- uptobody.mjs
- wrap.mjs
- DrawingSheet

## God Nodes (most connected - your core abstractions)
1. `State` - 366 edges
2. `useStore` - 234 edges
3. `Id` - 222 edges
4. `rebuildDocument()` - 182 edges
5. `playwright` - 144 edges
6. `three` - 123 edges
7. `addLine()` - 118 edges
8. `vitest` - 110 edges
9. `createSketch()` - 110 edges
10. `createDocument()` - 108 edges

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

## Communities (183 total, 26 thin omitted)

### Community 1 - "vitest"
Cohesion: 0.08
Nodes (26): bodies(), vitest, block(), plate(), partWithExtrude(), partWithExtrude(), createDocument(), ExtrudeFeature (+18 more)

### Community 2 - "P4 (77) — Opgelost"
Cohesion: 0.03
Nodes (78): F01 · Kritiek · Opgelost · Performance — WebGL-geheugenlek bij bewerken, F02 · Kritiek · Opgelost · Beveiliging — file:save naar willekeurig pad, F03 · Major · Opgelost · Beveiliging — Geen CSP, navigatie- en sender-beveiliging, F04 · Major · Opgelost · Beveiliging — Testhooks in productie, F05 · Kritiek · Opgelost · Bestanden — Geen schemavalidatie bij openen, F06 · Major · Opgelost · Schets — Modify accepteert 0, F07 · Major · Opgelost · Features — Extrude-diepte niet gevalideerd, F08 · Major · Opgelost · Features — Extrude op lege schets (+70 more)

### Community 3 - "CadCamera"
Cohesion: 0.06
Nodes (28): Architectuurschets, Bekende beperkingen (fase 1), Datamodel, Demo (± 2 minuten), Fase 1 — 2D-schetser met constraint-solver, Solver, Tests, UI-conventies (docs/01-research.md en docs/03-vergelijking-solidworks.md) (+20 more)

### Community 4 - "Taken - Phlippo CAD"
Cohesion: 0.02
Nodes (82): Configuraties (ConfigurationManager, video 19) (2026-10-21), Controle met de volledige playlist (58 video's, 15 u) — na de download, Curves ▸ Helix and Spiral (2026-10-21), Desktop-app (Electron) (2026-10-20, nacht), Eindcondities en sensors (video 40, 31) (2026-10-21), Extrude met Draft (video 29, LEG BASE) (2026-10-21), Fase 2: 3D-features op een solid-kern (2026-10-20), Fase 2b: Mirror, patronen, Hole Wizard, Shell, Sweep/Loft (2026-10-20, nacht) (+74 more)

### Community 5 - "Section"
Cohesion: 0.07
Nodes (90): AltPositionPM(), BrokenOutPM(), ViewToolPM(), DeviationPM(), Head(), PartingLinePM(), ComponentPatternPM(), ExplodePM() (+82 more)

### Community 6 - "store.ts"
Cohesion: 0.05
Nodes (99): FeaturesKeys, SheetMetalKeys, WeldmentsKeys, weldmentsSlice(), AskOptions, AsmTool, cfgOpts(), COUPLING_MATES (+91 more)

### Community 7 - "react"
Cohesion: 0.06
Nodes (57): react, AppearanceDialog(), hex2(), PALETTE, CATEGORIES, Command, commandById(), COMMANDS (+49 more)

### Community 8 - "ManagerPane.tsx"
Cohesion: 0.05
Nodes (75): zustand, InterferenceDialog(), ORIENTATIONS, STYLES, AssemblyTreeBody(), MATE_ICON, ConfigurationPanelBody(), ConfigurationPM() (+67 more)

### Community 9 - "bodyScene.ts"
Cohesion: 0.06
Nodes (31): Beveiliging (Electron), Prestaties en kwaliteit, QA-rapport (extern, 24-10-2026) en wat ermee gebeurde, Tests en proces, Uiterlijk en gebruik, DisplayStyle, exposeTestHooks(), MIRROR (+23 more)

### Community 10 - "drawopts.mjs"
Cohesion: 0.13
Nodes (14): afront, asmDrw, det2, dim, dimAfter, dimEl, drw, errors (+6 more)

### Community 11 - "autoTolerance.ts"
Cohesion: 0.15
Nodes (20): TolerancingKeys, tolerancingSlice(), autoDimensionScheme(), AutoToleranceData, AutoToleranceDatum, AutoToleranceDim, AutoToleranceGtol, blockFor() (+12 more)

### Community 12 - "Sketch"
Cohesion: 0.10
Nodes (22): PlaneId, CONTOUR_UNDER_PREVIEW, SceneColors, SceneInput, PlaneDef, BrepShape, ExactJog, ExactMiter (+14 more)

### Community 13 - "SketchPoint"
Cohesion: 0.11
Nodes (17): ToolId, ViewportBridge, OverlayProps, PreviewItem, arcPoly(), contourCache, PointerInfo, regionAt() (+9 more)

### Community 14 - "useStore"
Cohesion: 0.07
Nodes (60): downloadText(), DesignStudyDialog(), Output, LegacyOptionsDialog(), drawingToolClick(), Frame(), GeneralTableDialog(), insertBlock() (+52 more)

### Community 15 - "Viewport.tsx"
Cohesion: 0.08
Nodes (46): filterAllows(), isCommandActive(), CadGTAOPass, renderWithAO(), getPlane(), planeLabel(), sketchToWorld(), DragHandlesHandle() (+38 more)

### Community 16 - "configurations.mjs"
Cohesion: 0.15
Nodes (7): bom, errors, head, mv, results, tree, tree2

### Community 17 - "desktop.mjs"
Cohesion: 0.14
Nodes (8): consoleLog, logs, profile, env, errs, profile, profile, stepFile

### Community 18 - "rebuild.ts"
Cohesion: 0.09
Nodes (60): B-rep: eindcondities, thin, rib en plaatwerk-basis → 0.4.0 (2026-10-26), Bewijs, rotatedAbout(), translated(), atLength(), curveInstances(), distToPoly(), faceBoundary() (+52 more)

### Community 19 - "sketch.ts"
Cohesion: 0.11
Nodes (47): SketchKeys, sketchSlice(), pointLineDistance(), withSpacingDimension(), offsetPolygon(), addPiece(), arcAngles(), chainOf() (+39 more)

### Community 20 - "model.ts"
Cohesion: 0.13
Nodes (25): RepairSketchDialog(), BodiesKeys, bodiesSlice(), extractBlock(), insertBlock(), entityPoints(), entityScalars(), removeEntity() (+17 more)

### Community 21 - "evaluate2.ts"
Cohesion: 0.14
Nodes (15): F46: rebuild in een worker — haalbaarheid, BeamEstimateInput, BeamEstimateResult, BodyCompareResult, compareDocuments(), DeviationResult, DocCompareResult, featureKey() (+7 more)

### Community 22 - "featuresSlice"
Cohesion: 0.16
Nodes (38): Configuraties (ConfigurationManager) (2026-10-21), BomDialog(), fmt(), ModifyConfigurationsDialog(), DrawingKeys, drawingSlice(), featuresSlice(), solveAll() (+30 more)

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
Cohesion: 0.11
Nodes (34): polyArea(), base, P, baseFlangeGeometry(), baseFlangeLoop(), baseFlangeRegion(), bendAllowance(), bendTableK() (+26 more)

### Community 27 - "TaskPane.tsx"
Cohesion: 0.16
Nodes (22): usePMContext(), BlockThumb(), DesignLibrary(), FileExplorer(), RecoveryPane(), RelationsPane(), StandardPartsFolder(), TaskPane() (+14 more)

### Community 28 - "P3 (11)"
Cohesion: 0.17
Nodes (12): F101 · Minor · Nieuw · Tests — clickall (en desktop-export/peek) zonder exit-code, F102 · Minor · Nieuw · Tests — Reload-check in drawing blijft gekoppeld aan Ø35, F103 · Minor · Nieuw · Kwaliteit — PropertyPanel-monolith (3932 regels) na F36, F104 · Minor · Nieuw · Electron — blank.html-flits op file:// vóór app://, F16 · Major · Deels opgelost · Visueel — Iconen en lettertype, F21 · Minor · Deels opgelost · Visueel — Taakvenster-iconen, F22 · Minor · Deels opgelost · Visueel — Body-randen, F24 · Minor · Deels opgelost · Visueel — Extra rij in Modify (+4 more)

### Community 29 - "relations.ts"
Cohesion: 0.29
Nodes (7): fullyDefineSketch(), dimensionForSelection(), isCircular(), LABELS, measure(), RelationOption, relationsForSelection()

### Community 30 - "solid.ts"
Cohesion: 0.06
Nodes (52): three, three-mesh-bvh, Interference, InterferenceOptions, exportStl(), geometryFromPositions(), parseStl(), Feature (+44 more)

### Community 31 - "sheetmetal4.ts"
Cohesion: 0.06
Nodes (45): Blokken G-A t/m G-J: de laatste SOLIDWORKS-onderdelen uit de playlist-inventaris (0.3.3, 2026-10-25), Keuzes die afwijken van het origineel (bewust), Nieuwe testhaken en patronen, componentBody(), brepTool(), pickByVolume(), centroid(), nesting() (+37 more)

### Community 32 - "camera.ts"
Cohesion: 0.14
Nodes (13): customPlanes, normalToView(), PlaneBasis, PLANES, Q(), REFERENCE_PLANES, ReferencePlaneId, setUpAxis() (+5 more)

### Community 33 - "rename-trademarks.cjs"
Cohesion: 0.10
Nodes (18): APPLY, changed, fs, path, ROOT, RULES, walk(), APPLY (+10 more)

### Community 34 - "App.tsx"
Cohesion: 0.05
Nodes (83): App(), AppearanceDialog, BeamEstimateDialog, BodiesToKeepDialog, BomDialog, CheckDialog, CompareDialog, CustomizeDialog (+75 more)

### Community 35 - "round.ts"
Cohesion: 0.13
Nodes (28): subEdgeAt(), applyRoundFeature(), removed(), topEdge(), vol(), applyRound(), applyTools(), cornerCell() (+20 more)

### Community 36 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, concurrently, cross-env, electron, electron-builder, jsdom, playwright, @types/node (+8 more)

### Community 37 - "modelItems.ts"
Cohesion: 0.13
Nodes (26): modelItems(), ModelItemsOptions, near(), offsetLabel(), ORTHO, lengthDecimals(), dimensionDrawing, dimensionDrawingBase() (+18 more)

### Community 38 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 39 - "sketchtools2.mjs"
Cohesion: 0.16
Nodes (11): click(), count(), errors, fly(), hd, K(), P(), pc (+3 more)

### Community 40 - "brepRefine.ts"
Cohesion: 0.17
Nodes (23): apply(), brepEnabled(), carrySelection(), nearestFace(), partsOf(), refineAssembly(), refined, refinedParts (+15 more)

### Community 41 - "assembly/assembly.ts"
Cohesion: 0.11
Nodes (30): AssemblyRebuild, componentMatrix(), cylinderAxis(), flipWinding(), handMatrix(), leastSquares(), localRef(), matrixToTransform() (+22 more)

### Community 42 - "rect3.mjs"
Cohesion: 0.15
Nodes (10): clicks(), errors, fourth, lens, nr, P(), results, solid (+2 more)

### Community 43 - "blockf.mjs"
Cohesion: 0.40
Nodes (4): errors, results, S(), vol()

### Community 44 - "getPref"
Cohesion: 0.06
Nodes (55): NotePM(), PrefCheck(), fmtNum(), loadCustom(), loadFavorites(), MaterialDialog(), saveCustom(), saveFavorites() (+47 more)

### Community 45 - "full.mjs"
Cohesion: 0.21
Nodes (8): errors, kinds(), lenC, nCon(), nEnt(), results, S(), sk()

### Community 46 - "endconditions.mjs"
Cohesion: 0.20
Nodes (5): errors, menuText, results, sel, tree

### Community 47 - "evaluate.tsx"
Cohesion: 0.18
Nodes (21): evaluate(), fmt(), LEN_UNITS, loadMassOpts(), MASS_UNITS, MassOpts, MassPropertiesDialog(), MeasureDialog() (+13 more)

### Community 48 - "qa3.mjs"
Cohesion: 0.20
Nodes (5): depthField, errors, overlap, results, top

### Community 49 - "build"
Cohesion: 0.13
Nodes (15): build, appId, asar, asarUnpack, directories, extraFiles, fileAssociations, files (+7 more)

### Community 50 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, build:e2e, ci, desktop, desktop:build, desktop:start, dev (+7 more)

### Community 51 - "rib.ts"
Cohesion: 0.36
Nodes (8): extendEnd(), extendNatural(), midpoint(), resample(), ribDraft(), ribGeometry(), channel(), THROUGH_ALL

### Community 52 - "Onderzoek: workflow en lay-out van moderne parametrische CAD"
Cohesion: 0.18
Nodes (10): 1. Globale schermindeling (alle drie de pakketten komen overeen), 2. Sketch-workflow, 3. Constraint-solver, 4. Navigatie en sneltoetsen (conventies), 5. Feature-modelleren (fase 2, ter voorbereiding), 6. UI-componenten, 7. Bronnen, Dimensies (+2 more)

### Community 53 - "annotations.mjs"
Cohesion: 0.18
Nodes (7): asm, errors, front, items, results, tek, toPx()

### Community 54 - "sheet.ts"
Cohesion: 0.06
Nodes (82): arrow(), arrowHead(), directionFrom(), DrawingSheetView(), newSymbolId(), orientationFor(), PAPER, sheetToViewLocal() (+74 more)

### Community 55 - "slices/assembly.ts"
Cohesion: 0.10
Nodes (36): Bewust nog niet, Open punten van QA 0.4.8 afgewerkt → 0.5.0 (2026-10-27), AssemblyKeys, assemblySlice(), DocumentKeys, documentSlice(), sheetMetalSlice(), UiKeys (+28 more)

### Community 56 - "step.test.ts"
Cohesion: 0.11
Nodes (15): replicad, replicad-opencascadejs, setBrepKernel(), refineRebuild(), meshesToStep(), meshToSolid(), OCInstance, Replicad (+7 more)

### Community 57 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 58 - "Phlippo CAD — QA-rapport v0.4.8"
Cohesion: 0.18
Nodes (10): 0. Versie en commit, 1. Oordeel, 2. GO-voorwaarden, 3. Top 5, 4. Testresultaten, 5. Verbeteringen sinds 0.3.4 (hoogtepunten), 6. Score per gebied (t.o.v. SOLIDWORKS 2026), 8. IP-risico (+2 more)

### Community 59 - "features/weldments.ts"
Cohesion: 0.08
Nodes (38): extrudeGeometry(), PlanarFace, boundaryLoops(), capLoop(), extendSurface(), fillLoops(), flattenSurface(), halfSpaceBox() (+30 more)

### Community 60 - "DrawingView"
Cohesion: 0.22
Nodes (4): DrawingEdit, DrawingSymbol, DrawingView, DrawingViewType

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

### Community 67 - "videos46.mjs"
Cohesion: 0.25
Nodes (3): dep, errors, results

### Community 68 - "main.cjs"
Cohesion: 0.11
Nodes (21): { app, BrowserWindow, Menu, ipcMain, dialog, shell, session, protocol }, APP_DIST, APP_INDEX, atomicWrite(), createWindow(), CSP_OCCT_WORKER, EXTERNAL_ALLOW, finishSelfTest() (+13 more)

### Community 69 - "src/app/assemblyCommands.ts"
Cohesion: 0.11
Nodes (37): addComment(), comps(), copyWithMates(), insertNewAssembly(), insertNewPart(), makeMultibodyPart(), mirrorComponents(), packAndGoFiles() (+29 more)

### Community 70 - "icons3d.tsx"
Cohesion: 0.13
Nodes (18): Iconen, Lint en panelen, Niet overgenomen, Visuele kwaliteit: metingen en keuzes (0.3.3), Weergave (3D), Box(), Cyl(), ell() (+10 more)

### Community 71 - "P3 — look en kwaliteit (17)"
Cohesion: 0.11
Nodes (18): F16 · Major · Deels opgelost · Visueel — Iconen en lettertype, F19 · Minor · Open · Visueel — XYZ in statusbalk, F20 · Minor · Open · Visueel — Confirmation Corner, F21 · Minor · Open · Visueel — Taakvenster-iconen, F22 · Minor · Deels opgelost · Visueel — Body-randen, F24 · Minor · Open · Visueel — Extra rij in Modify, F28 · Minor · Deels opgelost · UX — Bestandsdialoog bij Insert Component, F33 · Minor · Deels opgelost · Portabiliteit — Machinegebonden scripts (+10 more)

### Community 72 - "components.tsx"
Cohesion: 0.10
Nodes (23): Invoer en robuustheid, DockPanel(), StandardView, ConfirmationCorner(), Hud(), HudButton(), VIEW_LABEL, ViewGrid() (+15 more)

### Community 73 - "Vergelijking met de SOLIDWORKS-handleiding en aanpassingen"
Cohesion: 0.25
Nodes (7): Derde ronde: afstemming op de YouTube-video's, Kleuren (tweede ronde), Naam en logo, Vergelijking met de SOLIDWORKS-handleiding en aanpassingen, Vierde ronde: iconen, triade, tekst, Vijfde ronde: functionele controle, relatie-iconen, Design Library, YouTube-video's

### Community 74 - "addLine"
Cohesion: 0.11
Nodes (45): plate(), plate(), fastenerPart(), plate(), plateDoc(), part(), box(), rect() (+37 more)

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
Cohesion: 0.02
Nodes (39): errors, pin, results, asm, errors, results, doc, errors (+31 more)

### Community 79 - "videos56.mjs"
Cohesion: 0.25
Nodes (4): depth, errors, m, results

### Community 80 - "assembly.mjs"
Cohesion: 0.17
Nodes (7): before, c2, c2b, errors, hc, results, top2

### Community 82 - "exitCode"
Cohesion: 0.04
Nodes (25): count(), errors, K(), results, errors, results, errors, results (+17 more)

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
Cohesion: 0.21
Nodes (19): AnalysisHead(), DraftAnalysisPM(), GeometryAnalysisPM(), ThicknessAnalysisPM(), UndercutAnalysisPM(), bvhCache, bvhOf(), curvatureAnalysis() (+11 more)

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
Nodes (20): Phlippo CAD, Status 0.3.2 (2026-10-25), Status 0.3.3 (2026-10-25), Status 0.3.4 (2026-10-25), Status 0.3.5 (2026-10-26), Status 0.3.6 (2026-10-26), Status 0.3.7 (2026-10-26), Status 0.3.8 (2026-10-26) (+12 more)

### Community 109 - "gb.mjs"
Cohesion: 0.14
Nodes (11): amf, bodyRow, buf, dl, dl2, dl3, doc(), errors (+3 more)

### Community 110 - "edgesets.ts"
Cohesion: 0.09
Nodes (38): box(), BodiesBefore, compositePath(), edgesOf(), joinPieces(), sweepPathOf(), bodyEdges(), CreaseSegment (+30 more)

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
Cohesion: 0.24
Nodes (11): FastenerPM(), AsmHole, FASTENER_NAMES, FastenerSlot, fastenerSlots(), FastenerType, Id, LENGTHS (+3 more)

### Community 120 - "playwright"
Cohesion: 0.02
Nodes (53): docs, errs, report, doc, logs, t0, doc, asm (+45 more)

### Community 122 - "refgeom.ts"
Cohesion: 0.35
Nodes (9): RefGeometry, axisCandidate(), pointCandidate(), refGeometryFrom(), refGeometryLines(), RefSelection, T(), V() (+1 more)

### Community 123 - "B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26)"
Cohesion: 0.40
Nodes (4): B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26), Bewijs, Shell naast een afronding: bevinding, Volgende stappen

### Community 125 - "solver.ts"
Cohesion: 0.12
Nodes (31): lineLength(), resetIds(), buildEquations(), circleLike(), entityOf(), Equation, EquationBuildError, linePts() (+23 more)

### Community 126 - "viewerExport.ts"
Cohesion: 0.47
Nodes (7): bodyTriangles(), esc(), safeColor(), scriptJson(), VIEWER_SCRIPT, ViewerBody, viewerHtml()

### Community 127 - "motion2.mjs"
Cohesion: 0.29
Nodes (4): errors, pin, results, rozet

### Community 128 - "persistence.ts"
Cohesion: 0.12
Nodes (29): Dataverlies (de GO-voorwaarden), files, walk(), AutosaveEntry, checkStructure(), clearAutosave(), DocumentFormatError, FILE_EXTENSION (+21 more)

### Community 129 - "preload.cjs"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, on(), electron

### Community 130 - "Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26)"
Cohesion: 0.22
Nodes (6): Nog open (buiten deze ronde), Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26), vite, @vitejs/plugin-react, manualChunks(), pkg

### Community 131 - "sectionopts.mjs"
Cohesion: 0.29
Nodes (3): errors, part, results

### Community 132 - "electronFuses"
Cohesion: 0.25
Nodes (8): electronFuses, enableCookieEncryption, enableEmbeddedAsarIntegrityValidation, enableNodeCliInspectArguments, enableNodeOptionsEnvironmentVariable, grantFileProtocolExtraPrivileges, onlyLoadAppFromAsar, runAsNode

### Community 133 - "triad.mjs"
Cohesion: 0.29
Nodes (6): errors, pick(), pin, results, rozet, S()

### Community 134 - "ge.mjs"
Cohesion: 0.21
Nodes (9): errors, errs(), gDepth, names(), results, ripGap, S(), twoPlates() (+1 more)

### Community 136 - "dwgopts.mjs"
Cohesion: 0.33
Nodes (3): errors, part, results

### Community 137 - "Id"
Cohesion: 0.02
Nodes (11): ConfigEdit, ConfigurationEdit, MateEdit, PlaneEdit, Decal, DrawingNote, ImportedFeature, UnfoldFeature (+3 more)

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

### Community 146 - "geometry.ts"
Cohesion: 0.11
Nodes (25): faceTag(), nameExtrudedFaces(), segDist(), setTags(), add(), distanceToEntity(), distToSegment(), ellipseArcRange() (+17 more)

### Community 147 - "render.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

### Community 149 - "planes.ts"
Cohesion: 0.38
Nodes (10): cross(), dot(), norm(), planeOnFace(), referencePlane(), referencePlaneRaw(), rotate(), sub() (+2 more)

### Community 150 - "Document"
Cohesion: 0.10
Nodes (18): rebuildInWorker(), RebuildSuperseded, rebuildWorkerEnabled(), InsertGhost, Configuration, Document, DeleteDependents, geometricChildren() (+10 more)

### Community 151 - "viewlayout.mjs"
Cohesion: 0.12
Nodes (11): asm, aux, click(), errors, front, nl, nrm, results (+3 more)

### Community 154 - "draftcheck.mjs"
Cohesion: 0.25
Nodes (3): errors, nums, results

### Community 155 - "deform.test.ts"
Cohesion: 0.90
Nodes (3): falloff(), pointDeform, subdivideOnce()

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

### Community 163 - "document/equations.ts"
Cohesion: 0.15
Nodes (16): draftEquations(), notePendingEquation(), withFieldEquations(), DimensionRef, Equation, EquationResult, evaluateEquations(), evaluateExpression() (+8 more)

### Community 165 - "occtKernel"
Cohesion: 0.30
Nodes (9): occtKernel(), contourFace(), contourWire(), entityEdges(), facesOf(), matchFaces(), pathWire(), polygonEdges() (+1 more)

### Community 166 - "rebuildworker.mjs"
Cohesion: 0.18
Nodes (4): base, errors, results, t0

### Community 168 - "Features via OpenCascade → 0.3.8 (2026-10-26)"
Cohesion: 0.33
Nodes (5): Bewijs, Features via OpenCascade → 0.3.8 (2026-10-26), Hoe het werkt, Volgende stappen, Wat nu exact is

### Community 170 - "line-budget.cjs"
Cohesion: 0.18
Nodes (10): all, files(), isText(), literals(), CAPS, fs, over, path (+2 more)

### Community 173 - "QA-rapport v0.4.8 verwerkt (0.4.9)"
Cohesion: 0.50
Nodes (3): Eerlijk over de regressie (F93, F38), Per bevinding, QA-rapport v0.4.8 verwerkt (0.4.9)

### Community 174 - "B-rep: plaatwerk, weldments, booleans en vlakke terugval → 0.4.1 (2026-10-26)"
Cohesion: 0.40
Nodes (3): B-rep: plaatwerk, weldments, booleans en vlakke terugval → 0.4.1 (2026-10-26), Bewijs, Nog op de mesh-kern

### Community 175 - "occtClient.ts"
Cohesion: 0.22
Nodes (11): runSelfTest(), SelfTestResult, until(), serializeDocument(), call(), ensure(), exportStep(), exportStepDoc() (+3 more)

### Community 178 - "appearance2.mjs"
Cohesion: 0.22
Nodes (4): chooser, errors, png, results

### Community 184 - "dialogopts.mjs"
Cohesion: 0.29
Nodes (4): errors, mid, part, results

### Community 186 - "uptobody.mjs"
Cohesion: 0.29
Nodes (3): blk, errors, results

## Knowledge Gaps
- **9 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `@types/three`, `concurrently` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1874 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `State` connect `State` to `persistence.ts`, `store.ts`, `Id`, `autoTolerance.ts`, `Sketch`, `SketchPoint`, `useStore`, `sketch.ts`, `model.ts`, `featuresSlice`, `Document`, `sheetmetal.ts`, `App.tsx`, `document/equations.ts`, `modelItems.ts`, `SelectionItem`, `getPref`, `evaluate.tsx`, `Circle2D`, `sheet.ts`, `slices/assembly.ts`, `DrawingView`, `DrawingSheet`, `History`, `QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)`, `refgeom.ts`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `rebuildDocument()` (e.g. with `F46: rebuild in een worker — haalbaarheid` and `Hoe het werkt`) actually correct?**
  _`rebuildDocument()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.008658008658008658 - nodes in this community are weakly interconnected._
- **Why does `playwright` connect `playwright` to `sectionopts.mjs`, `triad.mjs`, `ge.mjs`, `dwgopts.mjs`, `drawopts.mjs`, `section.mjs`, `sheetmetal2.mjs`, `gd.mjs`, `ga1.mjs`, `misc7.mjs`, `configurations.mjs`, `desktop.mjs`, `ga2.mjs`, `render.mjs`, `helix.mjs`, `viewlayout.mjs`, `package.json`, `draftcheck.mjs`, `gf.mjs`, `check.mjs`, `rebuildworker.mjs`, `sketchtools2.mjs`, `unfoldfold.mjs`, `rect3.mjs`, `blockf.mjs`, `full.mjs`, `endconditions.mjs`, `qa3.mjs`, `appearance2.mjs`, `annotations.mjs`, `hem.mjs`, `dialogopts.mjs`, `sketch3d.mjs`, `uptobody.mjs`, `wrap.mjs`, `annotations2.mjs`, `annotations3.mjs`, `deletekey2.mjs`, `ellipsetext.mjs`, `drawing.mjs`, `videos46.mjs`, `componentpattern.mjs`, `gg.mjs`, `editcomponent.mjs`, `skip`, `videos56.mjs`, `assembly.mjs`, `surfaces.mjs`, `exitCode`, `thickness.mjs`, `deletekey.mjs`, `gj.mjs`, `doorhandle.mjs`, `fixes1.mjs`, `drawingfix.mjs`, `rib.mjs`, `qa2.mjs`, `gh.mjs`, `qa1.mjs`, `gb.mjs`, `asmcut.mjs`, `sketchtools.mjs`, `filletopts.mjs`, `gi.mjs`, `drawing2.mjs`, `corners.mjs`, `features2.mjs`, `motion2.mjs`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Should `vitest` be split into smaller, more focused modules?**
  _Cohesion score 0.0847457627118644 - nodes in this community are weakly interconnected._
- **Why does `Document` connect `Document` to `State`, `vitest`, `persistence.ts`, `store.ts`, `ManagerPane.tsx`, `Id`, `Sketch`, `useStore`, `Viewport.tsx`, `rebuild.ts`, `sketch.ts`, `evaluate2.ts`, `featuresSlice`, `planes.ts`, `sheetmetal.ts`, `solid.ts`, `App.tsx`, `document/equations.ts`, `modelItems.ts`, `brepRefine.ts`, `assembly/assembly.ts`, `getPref`, `occtClient.ts`, `sheet.ts`, `slices/assembly.ts`, `step.test.ts`, `DrawingView`, `src/app/assemblyCommands.ts`, `addLine`, `edgesets.ts`, `QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)`, `fasteners.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._