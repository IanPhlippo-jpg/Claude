# Graph Report - Claude  (2026-10-26)

## Corpus Check
- 430 files · ~660,159 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .kcad 8, .css 2, .cmd 2)

## Summary
- 3622 nodes · 10780 edges · 157 communities (135 shown, 22 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 76 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7061c321`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- State
- solid.ts
- Id
- CadCamera
- Taken - Phlippo CAD
- Sketch
- store.ts
- Ribbon.tsx
- useStore
- bodyScene.ts
- drawopts.mjs
- ManagerPane.tsx
- sheetmetal4.ts
- SketchPoint
- PropertyPanel.tsx
- Viewport.tsx
- features2.mjs
- desktop-delete.mjs
- rebuildDocument
- sketch.ts
- model.ts
- rebuild.ts
- configurations.ts
- package.json
- autoTolerance.ts
- Vergelijking met de video (lokale sessie, 2026-10-20)
- sheetmetal.ts
- features.mjs
- prefs.ts
- sketchScene.ts
- Architectuurschets
- annotations.ts
- src/app/assemblyCommands.ts
- App.tsx
- resolvePlaneDef
- round.ts
- devDependencies
- camera.ts
- compilerOptions
- sketchtools2.mjs
- explode.mjs
- assembly/assembly.ts
- rect3.mjs
- blockf.mjs
- Document
- full.mjs
- richTips.tsx
- assembly.mjs
- configurations.mjs
- build
- scripts
- thread.ts
- Onderzoek: workflow en lay-out van moderne parametrische CAD
- annotations.mjs
- sheet.ts
- DraftAnalysisPM.tsx
- Breadcrumbs.tsx
- compilerOptions
- componentpattern.mjs
- drawing.mjs
- endconditions.mjs
- fixes1.mjs
- annotations2.mjs
- annotations3.mjs
- deletekey2.mjs
- ellipsetext.mjs
- multibody.mjs
- rib.mjs
- main.cjs
- nsis
- icons3d.tsx
- P3 — look en kwaliteit (17)
- isRoundFeature
- Vergelijking met de SOLIDWORKS-handleiding en aanpassingen
- arcslot.mjs
- asmcut.mjs
- draftcheck.mjs
- editcomponent.mjs
- skip
- hem.mjs
- evaluateDialogs.tsx
- sketchtools.mjs
- exitCode
- thickness.mjs
- DesktopApi
- export3d.ts
- deletekey.mjs
- gj.mjs
- surfaces.mjs
- sketch3d.mjs
- clickall.mjs
- motion2.mjs
- dependencies
- drawingfix.mjs
- P2 — vóór publieke release (14)
- refgeom.ts
- rename-trademarks.cjs
- P1 — GO-blokkers (13)
- qa2.mjs
- gh.mjs
- History
- Merken en auteursrecht: wat mag wel en niet lijken op het origineel
- qa1.mjs
- desktop-installed.mjs
- Phlippo CAD — QA-rapport v0.3.4
- Lokaal werken met Claude Code (Windows)
- 07-vergelijking-playlist.md
- tsconfig.json
- Phlippo CAD
- gb.mjs
- sheetmetal2.mjs
- jogmiter.mjs
- QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)
- motion.mjs
- filletopts.mjs
- gi.mjs
- drawing2.mjs
- section.ts
- slot.mjs
- wrap.mjs
- playwright
- sweep.ts
- ao.ts
- examples.check.test.ts
- viewlayout.mjs
- stl.test.ts
- deform.test.ts
- persistence.ts
- preload.cjs
- viewerExport.ts
- planes.ts
- triad.mjs
- ge.mjs
- addLine
- electronFuses
- Teamoordeel
- features.ts
- helix.mjs
- gd.mjs
- ga1.mjs
- QA-rapport v0.3.4 verwerkt → 0.3.5 (2026-10-26)
- MenuBar.tsx
- ga2.mjs
- geometry.ts
- gf.mjs
- featureTypes.ts
- Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26)
- sheetmetal.mjs
- qa3.mjs
- ErrorBoundary
- thread.mjs
- tools/README.md
- gg.mjs
- check.mjs
- dwgopts.mjs

## God Nodes (most connected - your core abstractions)
1. `State` - 361 edges
2. `useStore` - 216 edges
3. `Id` - 216 edges
4. `rebuildDocument()` - 155 edges
5. `playwright` - 127 edges
6. `three` - 109 edges
7. `addLine()` - 101 edges
8. `vitest` - 100 edges
9. `createSketch()` - 94 edges
10. `Viewport()` - 93 edges

## Surprising Connections (you probably didn't know these)
- `Top 5 van het rapport` --references--> `withUnsavedCheck()`  [INFERRED]
  docs/12-qa-rapport-v0.3.4.md → src/app/MenuBar.tsx
- `Werkwijze (nieuw)` --references--> `desktop()`  [INFERRED]
  docs/12-qa-rapport-v0.3.4.md → src/app/desktop.ts
- `Viewport` --references--> `CadCamera`  [INFERRED]
  docs/02-fase1-schetser.md → src/app/viewport/camera.ts
- `Helix and Spiral (video 17, candy stripe) (2026-10-21)` --references--> `helixPath()`  [INFERRED]
  docs/05-vergelijking-video.md → src/core/features/sweep.ts
- `Datamodel` --references--> `Sketch`  [INFERRED]
  docs/02-fase1-schetser.md → src/core/sketch/types.ts

## Import Cycles
- 3-file cycle: `src/app/MenuBar.tsx -> src/app/viewport/Viewport.tsx -> src/app/panels/FeatureTreeBody.tsx -> src/app/MenuBar.tsx`
- 3-file cycle: `src/core/assembly/assembly.ts -> src/core/features/rebuild.ts -> src/core/features/smcorners.ts -> src/core/assembly/assembly.ts`

## Communities (157 total, 22 thin omitted)

### Community 1 - "solid.ts"
Cohesion: 0.08
Nodes (35): three, vitest, Interference, InterferenceOptions, createDocument(), ExtrudeFeature, Feature, SketchFeature (+27 more)

### Community 2 - "Id"
Cohesion: 0.02
Nodes (15): ConfigEdit, DrawingEdit, LibraryItem, PlaneEdit, Decal, DeleteBodyFeature, DrawingDimension, DrawingNote (+7 more)

### Community 4 - "Taken - Phlippo CAD"
Cohesion: 0.03
Nodes (66): Configuraties (ConfigurationManager, video 19) (2026-10-21), Controle met de volledige playlist (58 video's, 15 u) — na de download, Curves ▸ Helix and Spiral (2026-10-21), Desktop-app (Electron) (2026-10-20, nacht), Eindcondities en sensors (video 40, 31) (2026-10-21), Extrude met Draft (video 29, LEG BASE) (2026-10-21), Fase 2: 3D-features op een solid-kern (2026-10-20), Fase 2b: Mirror, patronen, Hole Wizard, Shell, Sweep/Loft (2026-10-20, nacht) (+58 more)

### Community 5 - "Sketch"
Cohesion: 0.09
Nodes (39): OverlayProps, lineLength(), resetIds(), Sketch, buildEquations(), circleLike(), entityOf(), Equation (+31 more)

### Community 6 - "store.ts"
Cohesion: 0.07
Nodes (75): SheetMetalKeys, WeldmentsKeys, weldmentsSlice(), AskOptions, AsmTool, DialogId, ExplodeEdit, FeatureEdit (+67 more)

### Community 7 - "Ribbon.tsx"
Cohesion: 0.08
Nodes (46): CATEGORIES, commandById(), COMMANDS, DEFAULT_GESTURES, DEFAULT_KEYS, gestureBindings(), keyBindings(), keyCombo() (+38 more)

### Community 8 - "useStore"
Cohesion: 0.07
Nodes (70): AltPositionPM(), AuxViewPM(), BrokenOutPM(), ConfigSelect(), DetailViewPM(), DrawingDimensionPM(), DrawingViewPM(), Header() (+62 more)

### Community 9 - "bodyScene.ts"
Cohesion: 0.09
Nodes (21): Beveiliging (Electron), Prestaties en kwaliteit, QA-rapport (extern, 24-10-2026) en wat ermee gebeurde, Tests en proces, Uiterlijk en gebruik, DisplayStyle, exposeTestHooks(), MIRROR (+13 more)

### Community 10 - "drawopts.mjs"
Cohesion: 0.13
Nodes (14): afront, asmDrw, det2, dim, dimAfter, dimEl, drw, errors (+6 more)

### Community 11 - "ManagerPane.tsx"
Cohesion: 0.05
Nodes (83): Invoer en robuustheid, react, zustand, AppearanceDialog(), SWATCHES, BalloonLayoutIcon(), ORIENTATIONS, STYLES (+75 more)

### Community 12 - "sheetmetal4.ts"
Cohesion: 0.08
Nodes (38): Blokken G-A t/m G-J: de laatste SOLIDWORKS-onderdelen uit de playlist-inventaris (0.3.3, 2026-10-25), Keuzes die afwijken van het origineel (bewust), Nieuwe testhaken en patronen, PlaneDef, BodyEdge, RefSelection, Region, axisCylinder() (+30 more)

### Community 13 - "SketchPoint"
Cohesion: 0.12
Nodes (14): ToolId, ViewportBridge, PreviewItem, arcPoly(), contourCache, PointerInfo, slotGeometry(), slotOutline() (+6 more)

### Community 14 - "PropertyPanel.tsx"
Cohesion: 0.11
Nodes (30): APPLY_TOOLS, DetailedPreviewButton(), dimFavs(), Header(), HOLE_SIZES, HOLE_SIZES_INCH, HOLE_TYPES, holeSizesFor() (+22 more)

### Community 15 - "Viewport.tsx"
Cohesion: 0.13
Nodes (24): MarkupLayer(), isCommandActive(), planeLabel(), DragHandlesHandle(), extrudeCapOf(), ConfirmationCorner(), viewDisplayName(), ViewSelector() (+16 more)

### Community 17 - "desktop-delete.mjs"
Cohesion: 0.16
Nodes (6): logs, profile, env, errs, profile, profile

### Community 18 - "rebuildDocument"
Cohesion: 0.09
Nodes (38): crossBreakLines(), instanceMatrix(), rebuildDocument(), boundaryLoops(), capLoop(), extendSurface(), fillLoops(), flattenSurface() (+30 more)

### Community 19 - "sketch.ts"
Cohesion: 0.12
Nodes (49): SketchKeys, sketchSlice(), pointLineDistance(), withSpacingDimension(), offsetPolygon(), addPiece(), arcAngles(), chainOf() (+41 more)

### Community 20 - "model.ts"
Cohesion: 0.11
Nodes (31): extractBlock(), insertBlock(), fullyDefineSketch(), addConic(), addEllipse(), addEllipseArc(), addScalar(), addText() (+23 more)

### Community 21 - "rebuild.ts"
Cohesion: 0.08
Nodes (55): three-mesh-bvh, cache, isReferencePlane(), draftOnBody(), featureGeometry(), guideNormalToProfiles(), jogOnBody(), miterFlangeOnBody() (+47 more)

### Community 22 - "configurations.ts"
Cohesion: 0.07
Nodes (64): Configuraties (ConfigurationManager) (2026-10-21), BomDialog(), InterferenceDialog(), fmt(), ModifyConfigurationsDialog(), DesignStudyDialog(), evaluate(), Output (+56 more)

### Community 23 - "package.json"
Cohesion: 0.11
Nodes (18): author, description, main, name, private, type, version, concurrently (+10 more)

### Community 24 - "autoTolerance.ts"
Cohesion: 0.14
Nodes (20): TolerancingKeys, tolerancingSlice(), autoDimensionScheme(), AutoToleranceData, AutoToleranceDatum, AutoToleranceDim, AutoToleranceGtol, blockFor() (+12 more)

### Community 25 - "Vergelijking met de video (lokale sessie, 2026-10-20)"
Cohesion: 0.08
Nodes (23): Doorgevoerd in de lokale sessie (2026-10-20, avond), Eindcondities Up To Next / Up To Surface / Offset From Surface (video 40) (2026-10-21), Evaluate en bestanden (2026-10-20, nacht), Fase 2 (2026-10-20, avond): 3D-features, Fase 3: Equations en Global Variables (2026-10-20, nacht), Fase 4: Assemblies (2026-10-20, nacht), Fase 5: Tekeningen (2026-10-21, nacht), Functionele fouten gezien tijdens het vastleggen (+15 more)

### Community 26 - "sheetmetal.ts"
Cohesion: 0.11
Nodes (30): base, P, vol(), baseFlangeGeometry(), baseFlangeRegion(), bendAllowance(), bendTableK(), cross() (+22 more)

### Community 27 - "features.mjs"
Cohesion: 0.09
Nodes (14): arrowInput, boxTris, c2, drift, eqInputs, errors, faces, mv (+6 more)

### Community 28 - "prefs.ts"
Cohesion: 0.08
Nodes (39): PrefCheck(), fmtNum(), loadCustom(), loadFavorites(), MaterialDialog(), saveCustom(), saveFavorites(), STRESS (+31 more)

### Community 29 - "sketchScene.ts"
Cohesion: 0.22
Nodes (10): getPlane(), PlaneId, sketchToWorld(), worldToSketch(), ExtrudeHandle(), rgba(), SceneColors, SceneInput (+2 more)

### Community 30 - "Architectuurschets"
Cohesion: 0.20
Nodes (9): Architectuurschets, Bekende beperkingen (fase 1), Datamodel, Demo (± 2 minuten), Fase 1 — 2D-schetser met constraint-solver, Solver, Tests, UI-conventies (docs/01-research.md en docs/03-vergelijking-solidworks.md) (+1 more)

### Community 31 - "annotations.ts"
Cohesion: 0.20
Nodes (16): lengthDecimals(), dimensionDrawing, dimensionDrawingBase(), entityAnchor(), entityFrame(), fmt(), GlyphDrawing, glyphDrawings() (+8 more)

### Community 32 - "src/app/assemblyCommands.ts"
Cohesion: 0.20
Nodes (26): addComment(), comps(), copyWithMates(), downloadText(), insertNewAssembly(), insertNewPart(), makeMultibodyPart(), mirrorComponents() (+18 more)

### Community 33 - "App.tsx"
Cohesion: 0.07
Nodes (56): App(), AppearanceDialog, BeamEstimateDialog, BomDialog, CheckDialog, CompareDialog, CustomizeDialog, CutListDialog (+48 more)

### Community 34 - "resolvePlaneDef"
Cohesion: 0.13
Nodes (24): toSketch(), holeTool(), MAX_PATTERN_INSTANCES, mirrorGeometry(), patternInstances(), rotatedAbout(), translated(), atLength() (+16 more)

### Community 35 - "round.ts"
Cohesion: 0.08
Nodes (43): F46: rebuild in een worker — haalbaarheid, componentBody(), box(), deleteFaces(), V3, bodyEdges(), CreaseSegment, creaseSegments() (+35 more)

### Community 36 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, concurrently, cross-env, electron, electron-builder, jsdom, playwright, @types/node (+8 more)

### Community 37 - "camera.ts"
Cohesion: 0.13
Nodes (13): customPlanes, normalToView(), PlaneBasis, PLANES, Q(), REFERENCE_PLANES, ReferencePlaneId, setUpAxis() (+5 more)

### Community 38 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 39 - "sketchtools2.mjs"
Cohesion: 0.16
Nodes (11): click(), count(), errors, fly(), hd, K(), P(), pc (+3 more)

### Community 41 - "assembly/assembly.ts"
Cohesion: 0.05
Nodes (61): FastenerPM(), MateEdit, EMPTY, MotionPlot(), MotionTimeline(), recordAnimation(), AssemblyRebuild, componentMatrix() (+53 more)

### Community 42 - "rect3.mjs"
Cohesion: 0.15
Nodes (10): clicks(), errors, fourth, lens, nr, P(), results, solid (+2 more)

### Community 43 - "blockf.mjs"
Cohesion: 0.40
Nodes (4): errors, results, S(), vol()

### Community 44 - "Document"
Cohesion: 0.22
Nodes (4): InsertGhost, Configuration, Equation, Document

### Community 45 - "full.mjs"
Cohesion: 0.21
Nodes (8): errors, kinds(), lenC, nCon(), nEnt(), results, S(), sk()

### Community 46 - "richTips.tsx"
Cohesion: 0.16
Nodes (14): arrow(), ART, BODY, box(), cyl(), DESC, Look, P() (+6 more)

### Community 47 - "assembly.mjs"
Cohesion: 0.17
Nodes (7): before, c2, c2b, errors, hc, results, top2

### Community 48 - "configurations.mjs"
Cohesion: 0.15
Nodes (7): bom, errors, head, mv, results, tree, tree2

### Community 49 - "build"
Cohesion: 0.14
Nodes (14): build, appId, asar, directories, extraFiles, fileAssociations, files, portable (+6 more)

### Community 50 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, build:e2e, ci, desktop, desktop:build, desktop:start, dev (+7 more)

### Community 51 - "thread.ts"
Cohesion: 0.22
Nodes (12): flipWinding(), revolveAxis(), revolveGeometry(), helixRings(), METRIC_THREADS, threadPreviewCurves(), threadProfile(), ThreadSpec (+4 more)

### Community 52 - "Onderzoek: workflow en lay-out van moderne parametrische CAD"
Cohesion: 0.18
Nodes (10): 1. Globale schermindeling (alle drie de pakketten komen overeen), 2. Sketch-workflow, 3. Constraint-solver, 4. Navigatie en sneltoetsen (conventies), 5. Feature-modelleren (fase 2, ter voorbereiding), 6. UI-componenten, 7. Bronnen, Dimensies (+2 more)

### Community 53 - "annotations.mjs"
Cohesion: 0.18
Nodes (7): asm, errors, front, items, results, tek, toPx()

### Community 54 - "sheet.ts"
Cohesion: 0.05
Nodes (93): arrow(), arrowHead(), directionFrom(), DrawingSheetView(), newSymbolId(), orientationFor(), PAPER, sheetToViewLocal() (+85 more)

### Community 55 - "DraftAnalysisPM.tsx"
Cohesion: 0.21
Nodes (19): AnalysisHead(), GeometryAnalysisPM(), ThicknessAnalysisPM(), UndercutAnalysisPM(), bvhCache, bvhOf(), curvatureAnalysis(), curvatureColor() (+11 more)

### Community 56 - "Breadcrumbs.tsx"
Cohesion: 0.39
Nodes (7): MATE_ICON, featureIcon(), Breadcrumbs(), Chevron(), isSketchBased(), faceOwner(), featureSurface()

### Community 57 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 58 - "componentpattern.mjs"
Cohesion: 0.20
Nodes (6): circ, errors, pin, radii, results, xs

### Community 59 - "drawing.mjs"
Cohesion: 0.18
Nodes (5): errors, results, topView, tv, types

### Community 60 - "endconditions.mjs"
Cohesion: 0.20
Nodes (5): errors, menuText, results, sel, tree

### Community 61 - "fixes1.mjs"
Cohesion: 0.20
Nodes (5): errors, results, solid, xs, ys

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

### Community 66 - "multibody.mjs"
Cohesion: 0.22
Nodes (3): boxes, errors, results

### Community 67 - "rib.mjs"
Cohesion: 0.22
Nodes (3): errors, results, tree

### Community 68 - "main.cjs"
Cohesion: 0.10
Nodes (17): { app, BrowserWindow, Menu, ipcMain, dialog, shell, session, protocol }, APP_DIST, APP_INDEX, createWindow(), EXTERNAL_ALLOW, fs, handleOf(), handles (+9 more)

### Community 69 - "nsis"
Cohesion: 0.20
Nodes (10): nsis, allowToChangeInstallationDirectory, artifactName, createDesktopShortcut, createStartMenuShortcut, license, oneClick, perMachine (+2 more)

### Community 70 - "icons3d.tsx"
Cohesion: 0.13
Nodes (18): Iconen, Lint en panelen, Niet overgenomen, Visuele kwaliteit: metingen en keuzes (0.3.3), Weergave (3D), Box(), Cyl(), ell() (+10 more)

### Community 71 - "P3 — look en kwaliteit (17)"
Cohesion: 0.11
Nodes (18): F16 · Major · Deels opgelost · Visueel — Iconen en lettertype, F19 · Minor · Open · Visueel — XYZ in statusbalk, F20 · Minor · Open · Visueel — Confirmation Corner, F21 · Minor · Open · Visueel — Taakvenster-iconen, F22 · Minor · Deels opgelost · Visueel — Body-randen, F24 · Minor · Open · Visueel — Extra rij in Modify, F28 · Minor · Deels opgelost · UX — Bestandsdialoog bij Insert Component, F33 · Minor · Deels opgelost · Portabiliteit — Machinegebonden scripts (+10 more)

### Community 72 - "isRoundFeature"
Cohesion: 0.48
Nodes (6): faceOf(), loopOf(), Pick, SelectionToolbar(), isRoundFeature(), edgesOnFace()

### Community 73 - "Vergelijking met de SOLIDWORKS-handleiding en aanpassingen"
Cohesion: 0.25
Nodes (7): Derde ronde: afstemming op de YouTube-video's, Kleuren (tweede ronde), Naam en logo, Vergelijking met de SOLIDWORKS-handleiding en aanpassingen, Vierde ronde: iconen, triade, tekst, Vijfde ronde: functionele controle, relatie-iconen, Design Library, YouTube-video's

### Community 74 - "arcslot.mjs"
Cohesion: 0.29
Nodes (4): count(), errors, K(), results

### Community 75 - "asmcut.mjs"
Cohesion: 0.25
Nodes (4): asm, cutIds, errors, results

### Community 76 - "draftcheck.mjs"
Cohesion: 0.25
Nodes (3): errors, nums, results

### Community 77 - "editcomponent.mjs"
Cohesion: 0.25
Nodes (4): depthField, errors, pin, results

### Community 78 - "skip"
Cohesion: 0.04
Nodes (25): errors, pin, results, asm, errors, results, doc, errors (+17 more)

### Community 80 - "evaluateDialogs.tsx"
Cohesion: 0.28
Nodes (11): CheckDialog(), RepairSketchDialog(), SectionPropertiesDialog(), bodyCheck(), sectionProperties(), entityPoints(), removeEntity(), findSketchProblems() (+3 more)

### Community 81 - "sketchtools.mjs"
Cohesion: 0.29
Nodes (4): count(), errors, K(), results

### Community 82 - "exitCode"
Cohesion: 0.04
Nodes (24): errors, results, errors, results, exitCode(), asm, errors, lassoItem (+16 more)

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

### Community 90 - "clickall.mjs"
Cohesion: 0.29
Nodes (3): docs, errs, report

### Community 91 - "motion2.mjs"
Cohesion: 0.29
Nodes (4): errors, pin, results, rozet

### Community 92 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, react, react-dom, three, three-bvh-csg, three-mesh-bvh, zustand

### Community 93 - "drawingfix.mjs"
Cohesion: 0.11
Nodes (17): asm, b0b, b0c, balloonCheck(), bc, clearTb, clickAt(), crosses() (+9 more)

### Community 94 - "P2 — vóór publieke release (14)"
Cohesion: 0.13
Nodes (15): F14 · Major · Deels opgelost · Visueel — Commando's actief zonder body, F36 · Major · Open · Kwaliteit — Monolithische store, F38 · Major · Deels opgelost · Docs — README/TASKS, F40 · Kritiek · Deels opgelost · Bestanden — Half-geldige .kcad; Ctrl+S overschrijft, F46 · Major · Deels opgelost · Performance — CSG/solver op de UI-thread, F47 · Major · Open · Geometrie — Topologische naamgeving, F48 · Major · Deels opgelost · Geometrie — CSG-resultaat ongecontroleerd / toleranties, F49 · Major · Deels opgelost · Electron — Release-hardening (+7 more)

### Community 95 - "refgeom.ts"
Cohesion: 0.47
Nodes (8): RefGeometry, axisCandidate(), pointCandidate(), refGeometryFrom(), refGeometryLines(), T(), V(), circleOfEdge()

### Community 96 - "rename-trademarks.cjs"
Cohesion: 0.10
Nodes (18): APPLY, changed, fs, path, ROOT, RULES, walk(), APPLY (+10 more)

### Community 97 - "P1 — GO-blokkers (13)"
Cohesion: 0.14
Nodes (14): F05 · Kritiek · Deels opgelost · Bestanden — Geen schemavalidatie bij openen, F10 · Major · Open · Tekening — Ø-maat en tekening herstellen na reload, F31 · Kritiek · Deels opgelost · Proces — e2e-exitcodes / CI / niet-gecommit werk, F41 · Kritiek · Deels opgelost · Bestanden — Geen opslagvraag / autosave, F50 · Kritiek · Deels opgelost · Juridisch — SW-handelsmerken, F54 · Major · Deels opgelost · Proces — CI rood op Linux; 'regressie groen' niet reproduceerbaar, F57 · Major · Deels opgelost · Tests — Testscripts verouderd en lek, F70 · Major · Deels opgelost · Bestanden — Schemavalidatie oppervlakkig (+6 more)

### Community 98 - "qa2.mjs"
Cohesion: 0.32
Nodes (6): depthField, errors, lastMsg(), plate(), results, S()

### Community 99 - "gh.mjs"
Cohesion: 0.24
Nodes (9): errors, errs(), names(), nBodies(), pickFace(), results, S(), table (+1 more)

### Community 101 - "Merken en auteursrecht: wat mag wel en niet lijken op het origineel"
Cohesion: 0.33
Nodes (5): Disclaimer in de app (0.3.2), Merken en auteursrecht: wat mag wel en niet lijken op het origineel, Praktische regels voor dit project, Wat in Europa vrij is om na te maken, Wat wél beschermd is en vermeden moet worden

### Community 102 - "qa1.mjs"
Cohesion: 0.38
Nodes (5): errors, mem(), results, S(), st()

### Community 103 - "desktop-installed.mjs"
Cohesion: 0.15
Nodes (8): app, dbg, dir, fileVersion, { results, check }, failed, only, SCRIPTS

### Community 104 - "Phlippo CAD — QA-rapport v0.3.4"
Cohesion: 0.15
Nodes (12): 0. Versie en commit (eerst lezen), 10. Bestanden, 1. Oordeel, 2. GO-voorwaarden, 4. Testresultaten, 5. Alle bevindingen (op prioriteit), 6. Visuele vergelijking met SOLIDWORKS 2026, 7. Beveiliging (+4 more)

### Community 105 - "Lokaal werken met Claude Code (Windows)"
Cohesion: 0.50
Nodes (3): Desktop-app (2026-10-20), Geïnstalleerde app (2026-10-21), Lokaal werken met Claude Code (Windows)

### Community 106 - "07-vergelijking-playlist.md"
Cohesion: 0.29
Nodes (6): Inventaris SOLIDWORKS-video's 25–37 vs. Phlippo CAD (src/)\n\nWerkwijze: contactsheets + 8–15 frames per video bekeken (frames zijn 1280×720, niet 1920×1080); elk zichtbaar label met `grep -F` (en case-insensitief) in `src/**/*.ts(x)` gecontroleerd. \"Aanwezig\" = label gevonden in src; \"ONTBREEKT\" = nergens gevonden; \"WIJKT AF\" = label wel, maar zichtbaar andere structuur/plek. Geen code gewijzigd. Dekking beperkt door de beeld-rate-limit; video 28/29 contactsheets zijn niet gerenderd, alleen losse frames.\n\n## 25 SolidWorks Tutorial – Piping Y Flange – Layout Sketch, Sweep, Reuse feature\n- [0017/0019/0021] **Sweep PM**: sectie *Profile and Path* met radio **Sketch Profile / Circular Profile** (Circular actief), pad-box \"Open Group<1>\", *Diameter* 30.00→60.00mm; *Options*: **Merge tangent faces** ☐, Show preview ✓; *Thin Feature* ☐; *Curvature Display* (ingeklapt). In graphics de **SelectionManager**-toolbar (OK/Cancel + groep-iconen, 0021) en pink pad-highlight met callout \"Path\". Phlippo: Sweep-PM heeft enkel \"Profile and Path\"/Path-veld → ONTBREEKT: Sketch/Circular Profile-radio, Diameter-veld, Merge tangent faces, Curvature Display, SelectionManager/Open Group.\n- [0027] **RMB-menu tijdens Boss-Extrude**: Box Selection, Lasso Selection, Select Other, Clear Selection, Zoom/Pan/Rotate ▸, ✓OK, ✗Cancel; kop *Direction 1*: Reverse Direction, Blind✓, Through All, Up To Vertex, Up To Surface, Offset From Surface, Up To Body, Mid Plane; kop *Direction 2*: Direction 2 Off✓, Blind, Through All, Up To Next, Up To Vertex, Up To Surface, Offset From Surface, Up To Body; Customize Menu. Alle labels aanwezig in src; controleren of het graphics-RMB-menu tijdens een feature ook deze Direction-secties toont (WIJKT AF indien niet).\n- [0027/0029] **Boss-/Cut-Extrude PM**: From: Sketch Plane; Direction 1: Blind 20.00/10.00mm; Merge result ✓ / Flip side to cut ☐; Draft outward (grijs); Direction 2 ☐; Thin Feature ☐; *Selected Contours*: \"Sketch10-Contour<1>\". Statusbalk \"Diameter: 40mm Center: 0mm,0mm,0mm\". Aanwezig.\n- [0035] **Point PM** (dangling relatie herstellen): *Existing Relations* \"Coincident0\" in olijf/geel (dangling), \"Fully Defined\", *Add Relations*: Fix, **Control Vertex Parameters** X 0.00 / Y 0.00; tooltip **\"Reattach Relation\"** bij slepen van het rode handvat. ONTBREEKT: Reattach Relation, Control Vertex Parameters, dangling-kleur in relatielijst.\n- [0025/0041] Tree: Sweep1▸Sketch1, Sweep2, Shell1, Boss-Extrude1…Cut-Extrude6, Boss-Extrude3▸Sketch14; (-)Sketch10 met ⌀40/⌀65/⌀85; ribbon-tabs incl. \"MBD Dimensions\" en eigen tab \"TOBYS WORKFLOW\"; Sketch-toolbar onderaan gedockt; status MMGS. MBD Dimensions alleen in prefs/store → WIJKT AF (geen ribbon-tab).\n- [0015] Sketch1 met groene relatie-iconen, maten 30/70/R105, oriëntatielabel \"*Front\" linksonder. Aanwezig.\n\n## 26 SolidWorks Sheet Metal Tutorial – METAL CLIP – 23-02-02 (SM Hanger)\n- [crop 0021] **Base Flange PM**: Direction 1: **Mid Plane** (tooltip \"Depth\") 80.00mm; Sheet Metal Gauges: Use gauge table ☐; Sheet Metal Parameters 4.00mm, Reverse direction ☐, 4.00mm; *Bend Allowance* (sectie met checkbox) K-Factor 0.5; *Auto Relief* (checkbox) Rectangular, Use relief ratio ✓, Ratio. Alle labels aanwezig.\n- [0023/0037] **Line Properties PM**: gele *Message*-box (\"Edit the settings of the current line…\"), *Existing Relations* (⊥-icoon) \"Under Defined\", *Add Relations* Horizontal/Vertical/Fix, *Options* For construction / Infinite length, *Parameters* lengte+hoek (79.82 / 296.09°). Phlippo: Add/Existing Relations, For construction, Infinite length aanwezig; ONTBREEKT: PM-titel \"Line Properties\" en Message-box.\n- [0033] **Sheet Metal-ribbon** compleet: Base Flange/Tab, Convert to Sheet Metal, Lofted-Bend, Edge Flange, Miter Flange, Hem, Jog, Sketched Bend, Cross-Break, **Swept Flange**, Corners, **Forming Tool**, **Sheet Metal Gusset**, **Tab and Slot**, Extruded Cut, **Simple Hole**, **Vent**, **Normal Cut**, Unfold, Fold, Flatten, No Bends, Rip, **Insert Bends**. Vetgedrukte items ONTBREKEN in src.\n- [0041/0043/crop 0047] **Edge-Flange2 PM**: Flange Parameters Edge<1>; knop Edit Flange Profile; Use default radius ✓; 4.00mm / 1.00mm (grijs); *Angle* 90.00→120.00deg met **slot-icoon** ernaast + referentievlak-box \"Face<1>\"; radio Perpendicular to face ○ / Parallel to face ●; *Flange Length* Blind 85.00mm + 3 lengte-iconen; *Flange Position* 5 iconen; Trim side bends ☐. Gele preview, status \"Length: 112.52mm\". Labels aanwezig; controleren: slot-icoon bij Angle en Face<1>-box.\n- [0055] Tree: Cut list(1), Equations, Plain Carbon Steel, Sheet-Metal, Base-Flange1▸Sketch1+BaseBend1, **Tab1**, Mirror1, Edge-Flange2, Cut-Extrude3, Flat-Pattern (grijs). \"Tab1\" als node-naam niet gevonden (wel \"Base Flange/Tab\") → controleren naamgeving.\n- [0063] Flatten actief: Flat-Pattern niet meer grijs, ribbon-knop Flatten gehighlight, Cut-Extrude4. Aanwezig.\n- [0067] Sketch25 slot over de bocht, hover-tooltip \"Base-Flange1\" op vlak. [crop 0077] S-toets shortcut-bar iconengrid. Aanwezig (ShortcutBar).\n\n## 27 STEP STOOL – 05-02b – SHELL and MIRROR\n- [0019/0021] **Line Properties**: Existing Relations \"Vertical1\", **\"Doubled Distance13\"**; Fully Defined; Add Relations Horizontal/Vertical/Fix; Options For construction ✓ / Infinite length; Parameters 4.2795 / 270.00°; sectie **Additional Parameters** (ingeklapt). Status \"Angle: 21.19deg\". ONTBREEKT: Additional Parameters, relatienaam \"Doubled Distance\".\n- [0027/0028] **Evaluate-ribbon**: Design Study, Interference Detection, Measure, Markup, Mass Properties, Section Properties, Sensor, **Performance Evaluation**, Import Diagnostics, Check, Geometry Analysis, **Body Compare** (grijs), **Deviation Analysis**, **Zebra Stripes**, Curvature, Draft Analysis, Undercut Analysis, Parting Line Analysis, **Symmetry Check**, Thickness Analysis, **Compare Documents**, **Check Active Document**, 3DEXPERIENCE Simulation Connector, SimulationXpress/FloXpress Wizard. Vet = ONTBREEKT. Tree-selectie Boss-Extrude2 toont context-toolbar (6 iconen) in graphics; status \"Radius: 18.75in\".\n- [0030] Tree Boss-Extrude1, Boss-Extrude2, Fillet1, Mirror1, Shell1; shell-resultaat met oranje randhighlight. Aanwezig.\n- [0015/0017] Sketch met R26.000/R2.500/8.000 (IPS, 3 decimalen). Aanwezig.\n\n## 28 Sheet Metal Tutorial – Light Mount (21-02-11)\n- [0019] **Base Flange PM** (open contour, thin): Direction 1/2 (ingeklapt), Use gauge table ☐, 3.00mm, Reverse direction ☐, 3.00mm, Bend Allowance ✓ K-Factor 0.5, Auto Relief ✓ Rectangular, Use relief ratio ✓, Ratio 0.5. Aanwezig.\n- [0023] **Fillet PM** op plaatwerk: Fillet Type 4 iconen; Items To Fillet; Tangent propagation ✓; Full ● / Partial / No preview; Fillet Parameters Symmetric 1.00mm; Setback Parameters; Fillet Options; context-toolbar (2 rijen) bij randselectie. Aanwezig.\n- [0025/0029] **Circle PM**: Circle Type (2 iconen); Existing Relations \"Diameter0\"; Fully Defined; Options For construction / Add dimensions (grijs) / **Diameter dimensions** ✓; Parameters X -150.00, Y 0.00, R 7.50; tijdens plaatsen zijn secties grijs. \"Diameter dimensions\" alleen in drawing/modelItems → ONTBREEKT in sketch-Circle PM.\n- [0027] **Circular Pattern PM**: Parameters as-box (leeg; \"Axis1\" in graphics), 360.00deg, 19, Equal spacing ✓; Features and Faces (2 boxen); Bodies; Instances to Skip; Options Geometry pattern ☐ / Propagate visual properties ✓ / Full ○ Partial ●; Instances to Vary (grijs). Aanwezig.\n- [0031] Tree: Cut list(1)▸Cut-Extrude2, Equations, Material <not specified>, Sheet-Metal, Base-Flange1, Fillet1, Cut-Extrude1, **Axis1** (as-icoon in tree), CirPattern1, Combine1, Tab1, Cut-Extrude2, Flat-Pattern. Aanwezig (Axis1).\n- [0011] Line Properties boven YouTube-tekening (narratie).\n\n## 29 TooTallToby-10-02 – LEG BASE\n- [0017] **View-menu**: Redraw Ctrl+R, **Screen Capture ▸**, Display ▸, Modify ▸, **Lights and Cameras ▸**, Hide / Show ▸, **Toolbars ▸**, **Workspace ▸**, User Interface ▸, Touch Mode, Full Screen F11, Customize Menu. *Display*-submenu: Wireframe, Hidden Lines Visible, Hidden Lines Removed, Shaded With Edges, Shaded, **Draft Quality HLR/HLV**, Shadows In Shaded Mode, Ambient Occlusion, Perspective, Section View, Camera View (grijs), Curvature, **Zebra Stripes**, **Surface Curvature Combs**, Draft Analysis, Undercut Analysis, Parting Line Analysis, **Body Compare**, RealView Graphics, Cartoon, **Simulation Display** (grijs), **Tangent Edges Visible / as Phantom / Removed ✓**, Isolate (grijs), Customize Menu. Phlippo MenuBar heeft Redraw, Modify▸Orientation, Hide/Show, User Interface▸Task Pane, Customize, Maximize(F11); vet = ONTBREEKT als menu-item (Tangent Edges/Draft Quality/Touch Mode alleen in prefs/ShortcutBar → WIJKT AF).\n- [0021] **Dimension PM** (sketchmaat): tabs Value / Leaders / Other; Style-iconen + <NONE>; Tolerance/Precision None, .123 (Document); Primary Value \"D1@Sketch5\" 1.250in; Dimension Text <DIM> met uitlijn- en symboolknoppen; All uppercase ☐; Dual Dimension. Status \"Set the properties of the selected dimension(s).\" Aanwezig.\n- [0023] **Sweep PM**: Sketch Profile ● / Circular Profile ○; boxen \"PROFILE\" en \"PATH\"; Guide Curves; Options; **Start and End Tangency**; Thin Feature ☐; **Curvature Display**; callouts \"Profile(PROFILE)\" / \"Path(PATH)\"; status \"Select guide curves\". ONTBREEKT: radio's, Start and End Tangency, Curvature Display, callouts.\n- [0039] Tree Sweep1, **DeleteFace1**; Features-ribbon eindigt met **Deform**. Delete Face aanwezig; Deform ONTBREEKT.\n- [0033/0035] Sketch op Front Plane met vlaklabel \"Front Plane\" in graphics, status \"Hit Esc key to abort animation\"; Line Properties met Additional Parameters (zie 27). Vlaklabel/animatie-status controleren.\n\n## 30 TooTallToby-07-01 – FOOTBALL\n- [0051] **Boss-Extrude PM**: Direction 1 **Offset From Surface**; richtingbox; Face<1> (roze); 0.150in; Reverse offset ☐; Translate surface ☐; Merge result ✓; Draft outward grijs. Aanwezig.\n- [0055/0061] **LPattern1 PM**: Direction 1 \"Line8@Sketch1\", Spacing and instances ● / Up to reference ○, 1.000in, 3; Direction 2 idem 1.000in, 4; **Pattern seed only ✓**; Features and Faces: Boss-Extrude2; Bodies; Instances to Skip; Options. In graphics **bewerkbare callouts** \"Direction 1/2 – Spacing / Instances\". Labels aanwezig; callouts controleren.\n- [0064] **Mass Properties-dialoog**: bestandsbox \"Part2.SLDPRT\", Options…, Override Mass Properties…, Recalculate, Include hidden bodies/components ✓, Create Center of Mass feature ☐, Show weld bead mass ☐, \"Report coordinate values relative to: -- default --\"; tekst Density/Mass/Volume/Surface area/Center of mass/Principal axes of inertia…/Moments of inertia (2 blokken); knoppen Help, Print…, Copy to Clipboard. Alle labels aanwezig; controleren: \"Principal axes of inertia\"-blok en IPS-eenheden (pounds/inch).\n- [0037/0039] Sketch1 (11.600, R.625, 6.700, \"Fully Defined Editing Sketch1\"), Revolve1 oranje. [crop 0031] S-toets sketch-shortcutbar. Aanwezig.\n\n## 31 FREE Training – SINK WEIGHT\n- [0017] **Sensor PM**: Sensor Type: Mass Properties; Properties: Mass; selectiebox met tooltip \"Entities to Monitor\"; \"Value :\"; sectie *Alert* met checkbox. Aanwezig (SensorPM.tsx).\n- [0025/0043] Tree: Sensors▸**Mass1(121.747651 g)** (waarde in node-naam), \"LAYOUT SKETCH\" hernoemd + sketchkleur gewijzigd, materiaal \"1060 Alloy\", Revolve1, Cut-Extrude1, Cut-Revolve1. Sensorwaarde in tree-label controleren.\n- [0027/0031] Line Properties met Message; status \"… Under Defined Editing Sketch2 **(Locked Focus)**\". \"(Locked Focus)\" ONTBREEKT.\n- [0047] Cut-Extrude PM: From **Offset** 0.00mm; Through All; Flip side to cut; Draft outward. Aanwezig.\n- [0049] **Sketch Plane PM** (\"Sketch Plane/Face: Face<1>\", Edit Sketch Plane). ONTBREEKT.\n- [0051] Tree-context-toolbar op Cut-Extrude2 (8 iconen + comment). [0045] sketch met \"*Top\"-label en S-bar. [0053] Mirror1. Aanwezig.\n\n## 32 Free SHEET METAL Tutorial for HIGH SCHOOL / COLLEGE (deel 1)\n- [crop 0013] Base Flange: Blind (tooltip Depth) 40.00mm; 4.00mm; Reverse direction; 6.00mm; K-Factor 0.5. Aanwezig.\n- [crop 0015] Edge-Flange1: Edit Flange Profile; Use default radius ✓; 6.00/1.00mm grijs; Angle 90.00deg; Perpendicular/Parallel grijs; Flange Length Blind 104.00mm, 3 iconen; Flange Position. Aanwezig.\n- [0019] **Profile Sketch-dialoog** \"The sketch has intersecting contours.\" met < Back / Finish (grijs) / Cancel / Help; erachter Circle PM (Add dimensions grijs, Diameter dimensions ✓, Parameters -73.37). ONTBREEKT (dialoog van Edit Flange Profile).\n- [0031] Profile Sketch \"The sketch has more than one open contour.\" + **Trim Entities PM**: Power trim, Corner, Trim away inside, Trim away outside, Trim to closest; Keep trimmed entities as construction geometry ☐; Ignore trimming of construction geometry ☐. Trim-opties aanwezig; dialoog ONTBREEKT.\n- [0011/0037] Line Properties met inline maatinvoer (80.03 / R14). [0041] resultaat 817 g (narratie).\n\n## 33 Free SHEET METAL Tutorial for HIGH SCHOOL / COLLEGE (deel 2)\n- [0039] Base Flange vanuit sketch met meerdere contouren (\"No Contour Selection? NO PROBLEM\"); tree toont *Surface Bodies* én *Solid Bodies*. Aanwezig.\n- [0045] **Edge-Flange1 PM** (lege selectie): Edit Flange Profile grijs; Use default radius ✓ 3.00/1.00mm; Angle 90.00deg; Perpendicular/Parallel grijs; Flange Length Blind 9.00mm; Flange Position 5 iconen; Trim side bends ✓; **Offset ☐**; Custom Bend Allowance; Custom Relief Type. Status \"Please select an edge of a planar face to create the edge flange.\" Labels aanwezig; Offset-checkbox + statustekst controleren.\n- [0051] **Surface-Extrude1** onder Surface Bodies(1) (Insert ▸ Surface ▸ Extrude als referentie voor Edge Flange). Aanwezig.\n- [0063] Breadcrumb \"Edge-Flange1 ▸ Sketch13\" linksboven in graphics, context-toolbar 11 iconen, **Deform** in Features-ribbon, tree **Body-Delete/Keep 1**. Breadcrumb/Body-Delete aanwezig; Deform ONTBREEKT.\n- [0075] **Fillet PM**: tabs Manual / FilletXpert; Fillet Type 4 iconen; Items To Fillet; Show selection toolbar ✓; Tangent propagation ✓; Full preview ●; Fillet Parameters Symmetric 10.00mm; Multi Radius Fillet ☐; Profile: Circular; Setback Parameters; Partial Edge Parameters (checkbox-sectie). Aanwezig.\n- [0067/0071/0079] Line Properties (Horizontal3, Coincident3; 29.00/180.00°), tree Tab1, Edge-Flange2, Fillet1, Cut-Extrude1, Flat-Pattern. Aanwezig.\n\n## 34 Can we PATTERN this JOG?? – ULTIMATE Sheet Metal Training\n- [0027] Base Flange: Depth-veld met **uitdrukking \"100.00mm-38-12\"** en popup **\"Units >\"** (vergelijking in spinbox); 5.00mm; Reverse direction ✓; 8.00mm; K-Factor 0.333. Expressie-invoer met Units-popup ONTBREEKT (geen label gevonden).\n- [0037] **Mirror PM**: Mirror Face/Plane Face<1>; Features to Mirror; Faces to Mirror; Bodies to Mirror: Tab1; Options Merge solids ✓, Knit surfaces ☐, Propagate visual properties ✓, Full ○ / Partial ●; gele wireframe-preview. Aanwezig.\n- [0041/0049] Tree: Cut list(1) bevat **Fillet1 / Cut-Extrude1** (cut-list-item verwijst naar laatste feature); Base-Flange1▸Sketch1+BaseBend1; Tab1; Mirror1; Fillet1; (-)Sketch11 ⌀160. Aanwezig.\n- [0065] **Fillet PM Full Round**: 4e type-icoon actief; Items To Fillet 3 boxen (Face<1>, actieve middenbox blauw, 3e); callout \"Side Face Set 1\"; Tangent propagation ✓; Full preview ●. Aanwezig.\n- [0071] **Combine1** in Cut list; tree Base-Flange2, Fillet2, Cut-Extrude2. Aanwezig.\n\n## 36 Sheet Metal BENDS NOT SHOWING in Drawings!\n- [0007 / crop 0005] **Drawing View5 PM**: Import options; Display State \"<Default>_Display State 1\"; sectie **Bend Lines** (checkbox) ✓; **Bend Notes** ✓ met formaat \"<bend-direction> <bend-angle> R <bend-radius>\" + 6 stijl-iconen; **Flat Pattern Display** 0.00deg + knop **Flip view**; Display Style 5 iconen (HLR), High quality ● / Draft quality; Scale Use sheet scale ● / Use custom scale 1:2. Flat-pattern-view met bend notes \"DOWN 90° R 3 / UP 90° R 3\", gestippelde view-rand met hoekhaken; status \"Under Defined Editing Drawing View5 1:2 MMGS\". ONTBREEKT: Bend Lines, Bend Notes, note-formaat, Flat Pattern Display, Flip view; rest aanwezig.\n- [crop 0009] Hide/Show Items-flyout (heads-up) met ~26 toggles. Aanwezig.\n- [0011] **Dimension PM (drawing)**: **Dimension Assist Tools: Smart dimensioning ☐ / Rapid dimensioning ✓ / DimXpert**; Style; Tolerance/Precision None, .12 (Document); Primary Value \"RD1@Drawing View5\" 126.00mm, Override value ☐; Dimension Text <DIM>. Status \"Select one or two edges/vertices and then a text location.\" ONTBREEKT: Dimension Assist Tools/Smart/Rapid dimensioning.\n- [crop 0013] **Confirm Delete**: \"Delete the following item(s)?\" lijst \"☐ Sheet Format1 (Drawing Sheet)\", knoppen Yes / Yes to All / No / Cancel / Help, \"Don't show again\" ☐, tooltip \"Sheet1\". Labels aanwezig (Yes to All, show again in prefs) → checkbox-lijst en Help-knop controleren.\n- [0015] **Save As** (Windows-dialoog): pad …\\SOLIDWORKS 2022\\templates, lijst MBD / Drawing.DRWDOT; File name; Save as type \"Drawing Templates (*.drwdot)\"; \"Description: Add a description\"; radio Save as / Save as copy and continue / Save as copy and open; Include all referenced components ☐; Add prefix ☐ / Add suffix ☐; Advanced; Hide Folders. Phlippo heeft eigen Save As▸STL/drwdot → WIJKT AF; ONTBREEKT: Save as copy and continue/open, Include all referenced components, Add suffix, Description, Hide Folders.\n- Annotation-ribbon zichtbaar (Smart Dimension, Model Items, Spell Checker, Format Painter, Note, Linear Note Pattern, Balloon, Auto Balloon, Magnetic Line, Surface Finish, Weld Symbol, Hole Callout, Geometric Tolerance, Datum Feature, Datum Target, Center Mark, Centerline, Area Hatch/Fill, Revision Symbol, Revision Cloud, Blocks, Tables) – alle gecontroleerde labels aanwezig.\n\n## 37 Sheet Metal SPEED RUN!!\n- [0013] **Base Flange PM** volledig: *Sheet Metal Parameters From Material*: Use material sheet metal parameters ☐; Direction 1 Blind 50.00mm; Direction 2 ☐; Use gauge table ☐; 3.00mm / Reverse direction ☐ / 5.00mm; Bend Allowance K-Factor 0.333; Auto Relief. Gele dunne preview. Aanwezig.\n- [0017/0031] Tree Cut list(1)▸Cut-Extrude1, Equations, PLAIN CARBON STEEL, Sheet-Metal, Base-Flange1, Flat-Pattern (grijs); breadcrumb \"Base-Flange1 ▸ Sketch1\"; vlak-context-toolbar 8 iconen; tree-context-toolbar; status \"Length: 97mm\". Aanwezig.\n- [0021/0027] **Profile Sketch-dialoog**: \"The sketch has both open and closed contours.\" / \"The sketch is valid.\" (Finish actief), Back/Finish/Cancel/Help. ONTBREEKT.\n- [0035] Sheet Metal-ribbon (zie 26, zelfde ontbrekende items), Mirror1 ook in Cut list, tooltip \"Edge-Flange2\". [0037] **Break-Corner1**, Flat-Pattern actief, Flatten gehighlight. Aanwezig.\n\n## Samenvatting ontbrekend (uniek)\nSweep: Sketch/Circular Profile-radio, Diameter, Merge tangent faces, Start and End Tangency, Curvature Display, SelectionManager/Open Group, Profile()/Path()-callouts · Sketch: \"Line Properties\"-titel + Message-box, Additional Parameters, Doubled Distance, Reattach Relation, Control Vertex Parameters, Diameter dimensions (Circle PM), \"(Locked Focus)\", Sketch Plane PM · Sheet metal: Swept Flange, Forming Tool, Sheet Metal Gusset, Tab and Slot, Simple Hole, Vent, Normal Cut, Insert Bends, Profile Sketch-dialoog (3 meldingen), Units▸-popup bij expressie · Features: Deform · Evaluate: Performance Evaluation, Body Compare, Deviation Analysis, Zebra Stripes, Symmetry Check, Compare Documents, Check Active Document · View-menu: Screen Capture, Lights and Cameras, Toolbars, Workspace, Surface Curvature Combs, Simulation Display; Tangent Edges ×3 / Draft Quality HLR / Touch Mode alleen in prefs, niet als menu-items · Drawing: Bend Lines, Bend Notes (+formaat), Flat Pattern Display, Flip view, Dimension Assist Tools (Smart/Rapid dimensioning), Save-As-opties (copy and continue/open, referenced components, suffix, Description, Hide Folders), MBD Dimensions-ribbontab.\n\nNiet gelezen (rate-limit): contactsheets 28/29/30 en frames buiten de genoemde nummers; video 29 toont van 0027–0035 een ander onderdeel (Part4, sweep-pad) dan de Leg Base-titel."},"caller":{"type":"direct"}}],"container":null,"stop_reason":"tool_use","stop_sequence":null,"stop_details":null,"usage":{"input_tokens":32,"cache_creation_input_tokens":12839,"cache_read_input_tokens":465850,"output_tokens":10322,"output_tokens_details":{"thinking_tokens":0},"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard","cache_creation":{"ephemeral_1h_input_tokens":0,"ephemeral_5m_input_tokens":12839},"inference_geo":"global","iterations":[{"input_tokens":32,"output_tokens":10322,"cache_read_input_tokens":465850,"cache_creation_input_tokens":12839,"cache_creation":{"ephemeral_5m_input_tokens":12839,"ephemeral_1h_input_tokens":0},"type":"message"}],"speed":"standard","fallback_credit":null},"input_transformations":[],"diagnostics":null,"context_management":null},"wireToolInputs":{"toolu_019vYiebvo838ZL6NJtkn96s":{"message":"# Inventaris SOLIDWORKS-video's 25–37 vs. Phlippo CAD (src/)\n\nWerkwijze: contactsheets + 8–15 frames per video bekeken (frames zijn 1280×720, niet 1920×1080); elk zichtbaar label met `grep -F` (en case-insensitief) in `src/**/*.ts(x)` gecontroleerd. \"Aanwezig\" = label gevonden in src; \"ONTBREEKT\" = nergens gevonden; \"WIJKT AF\" = label wel, maar zichtbaar andere structuur/plek. Geen code gewijzigd. Dekking beperkt door de beeld-rate-limit; video 28/29 contactsheets zijn niet gerenderd, alleen losse frames.\n\n## 25 SolidWorks Tutorial – Piping Y Flange – Layout Sketch, Sweep, Reuse feature\n- [0017/0019/0021] **Sweep PM**: sectie *Profile and Path* met radio **Sketch Profile / Circular Profile** (Circular actief), pad-box \"Open Group<1>\", *Diameter* 30.00→60.00mm; *Options*: **Merge tangent faces** ☐, Show preview ✓; *Thin Feature* ☐; *Curvature Display* (ingeklapt). In graphics de **SelectionManager**-toolbar (OK/Cancel + groep-iconen, 0021) en pink pad-highlight met callout \"Path\". Phlippo: Sweep-PM heeft enkel \"Profile and Path\"/Path-veld → ONTBREEKT: Sketch/Circular Profile-radio, Diameter-veld, Merge tangent faces, Curvature Display, SelectionManager/Open Group.\n- [0027] **RMB-menu tijdens Boss-Extrude**: Box Selection, Lasso Selection, Select Other, Clear Selection, Zoom/Pan/Rotate ▸, ✓OK, ✗Cancel; kop *Direction 1*: Reverse Direction, Blind✓, Through All, Up To Vertex, Up To Surface, Offset From Surface, Up To Body, Mid Plane; kop *Direction 2*: Direction 2 Off✓, Blind, Through All, Up To Next, Up To Vertex, Up To Surface, Offset From Surface, Up To Body; Customize Menu. Alle labels aanwezig in src; controleren of het graphics-RMB-menu tijdens een feature ook deze Direction-secties toont (WIJKT AF indien niet).\n- [0027/0029] **Boss-/Cut-Extrude PM**: From: Sketch Plane; Direction 1: Blind 20.00/10.00mm; Merge result ✓ / Flip side to cut ☐; Draft outward (grijs); Direction 2 ☐; Thin Feature ☐; *Selected Contours*: \"Sketch10-Contour<1>\". Statusbalk \"Diameter: 40mm Center: 0mm,0mm,0mm\". Aanwezig.\n- [0035] **Point PM** (dangling relatie herstellen): *Existing Relations* \"Coincident0\" in olijf/geel (dangling), \"Fully Defined\", *Add Relations*: Fix, **Control Vertex Parameters** X 0.00 / Y 0.00; tooltip **\"Reattach Relation\"** bij slepen van het rode handvat. ONTBREEKT: Reattach Relation, Control Vertex Parameters, dangling-kleur in relatielijst.\n- [0025/0041] Tree: Sweep1▸Sketch1, Sweep2, Shell1, Boss-Extrude1…Cut-Extrude6, Boss-Extrude3▸Sketch14; (-)Sketch10 met ⌀40/⌀65/⌀85; ribbon-tabs incl. \"MBD Dimensions\" en eigen tab \"TOBYS WORKFLOW\"; Sketch-toolbar onderaan gedockt; status MMGS. MBD Dimensions alleen in prefs/store → WIJKT AF (geen ribbon-tab).\n- [0015] Sketch1 met groene relatie-iconen, maten 30/70/R105, oriëntatielabel \"*Front\" linksonder. Aanwezig.\n\n## 26 SolidWorks Sheet Metal Tutorial – METAL CLIP – 23-02-02 (SM Hanger)\n- [crop 0021] **Base Flange PM**: Direction 1: **Mid Plane** (tooltip \"Depth\") 80.00mm; Sheet Metal Gauges: Use gauge table ☐; Sheet Metal Parameters 4.00mm, Reverse direction ☐, 4.00mm; *Bend Allowance* (sectie met checkbox) K-Factor 0.5; *Auto Relief* (checkbox) Rectangular, Use relief ratio ✓, Ratio. Alle labels aanwezig.\n- [0023/0037] **Line Properties PM**: gele *Message*-box (\"Edit the settings of the current line…\"), *Existing Relations* (⊥-icoon) \"Under Defined\", *Add Relations* Horizontal/Vertical/Fix, *Options* For construction / Infinite length, *Parameters* lengte+hoek (79.82 / 296.09°). Phlippo: Add/Existing Relations, For construction, Infinite length aanwezig; ONTBREEKT: PM-titel \"Line Properties\" en Message-box.\n- [0033] **Sheet Metal-ribbon** compleet: Base Flange/Tab, Convert to Sheet Metal, Lofted-Bend, Edge Flange, Miter Flange, Hem, Jog, Sketched Bend, Cross-Break, **Swept Flange**, Corners, **Forming Tool**, **Sheet Metal Gusset**, **Tab and Slot**, Extruded Cut, **Simple Hole**, **Vent**, **Normal Cut**, Unfold, Fold, Flatten, No Bends, Rip, **Insert Bends**. Vetgedrukte items ONTBREKEN in src.\n- [0041/0043/crop 0047] **Edge-Flange2 PM**: Flange Parameters Edge<1>; knop Edit Flange Profile; Use default radius ✓; 4.00mm / 1.00mm (grijs); *Angle* 90.00→120.00deg met **slot-icoon** ernaast + referentievlak-box \"Face<1>\"; radio Perpendicular to face ○ / Parallel to face ●; *Flange Length* Blind 85.00mm + 3 lengte-iconen; *Flange Position* 5 iconen; Trim side bends ☐. Gele preview, status \"Length: 112.52mm\". Labels aanwezig; controleren: slot-icoon bij Angle en Face<1>-box.\n- [0055] Tree: Cut list(1), Equations, Plain Carbon Steel, Sheet-Metal, Base-Flange1▸Sketch1+BaseBend1, **Tab1**, Mirror1, Edge-Flange2, Cut-Extrude3, Flat-Pattern (grijs). \"Tab1\" als node-naam niet gevonden (wel \"Base Flange/Tab\") → controleren naamgeving.\n- [0063] Flatten actief: Flat-Pattern niet meer grijs, ribbon-knop Flatten gehighlight, Cut-Extrude4. Aanwezig.\n- [0067] Sketch25 slot over de bocht, hover-tooltip \"Base-Flange1\" op vlak. [crop 0077] S-toets shortcut-bar iconengrid. Aanwezig (ShortcutBar).\n\n## 27 STEP STOOL – 05-02b – SHELL and MIRROR\n- [0019/0021] **Line Properties**: Existing Relations \"Vertical1\", **\"Doubled Distance13\"**; Fully Defined; Add Relations Horizontal/Vertical/Fix; Options For construction ✓ / Infinite length; Parameters 4.2795 / 270.00°; sectie **Additional Parameters** (ingeklapt). Status \"Angle: 21.19deg\". ONTBREEKT: Additional Parameters, relatienaam \"Doubled Distance\".\n- [0027/0028] **Evaluate-ribbon**: Design Study, Interference Detection, Measure, Markup, Mass Properties, Section Properties, Sensor, **Performance Evaluation**, Import Diagnostics, Check, Geometry Analysis, **Body Compare** (grijs), **Deviation Analysis**, **Zebra Stripes**, Curvature, Draft Analysis, Undercut Analysis, Parting Line Analysis, **Symmetry Check**, Thickness Analysis, **Compare Documents**, **Check Active Document**, 3DEXPERIENCE Simulation Connector, SimulationXpress/FloXpress Wizard. Vet = ONTBREEKT. Tree-selectie Boss-Extrude2 toont context-toolbar (6 iconen) in graphics; status \"Radius: 18.75in\".\n- [0030] Tree Boss-Extrude1, Boss-Extrude2, Fillet1, Mirror1, Shell1; shell-resultaat met oranje randhighlight. Aanwezig.\n- [0015/0017] Sketch met R26.000/R2.500/8.000 (IPS, 3 decimalen). Aanwezig.\n\n## 28 Sheet Metal Tutorial – Light Mount (21-02-11)\n- [0019] **Base Flange PM** (open contour, thin): Direction 1/2 (ingeklapt), Use gauge table ☐, 3.00mm, Reverse direction ☐, 3.00mm, Bend Allowance ✓ K-Factor 0.5, Auto Relief ✓ Rectangular, Use relief ratio ✓, Ratio 0.5. Aanwezig.\n- [0023] **Fillet PM** op plaatwerk: Fillet Type 4 iconen; Items To Fillet; Tangent propagation ✓; Full ● / Partial / No preview; Fillet Parameters Symmetric 1.00mm; Setback Parameters; Fillet Options; context-toolbar (2 rijen) bij randselectie. Aanwezig.\n- [0025/0029] **Circle PM**: Circle Type (2 iconen); Existing Relations \"Diameter0\"; Fully Defined; Options For construction / Add dimensions (grijs) / **Diameter dimensions** ✓; Parameters X -150.00, Y 0.00, R 7.50; tijdens plaatsen zijn secties grijs. \"Diameter dimensions\" alleen in drawing/modelItems → ONTBREEKT in sketch-Circle PM.\n- [0027] **Circular Pattern PM**: Parameters as-box (leeg; \"Axis1\" in graphics), 360.00deg, 19, Equal spacing ✓; Features and Faces (2 boxen); Bodies; Instances to Skip; Options Geometry pattern ☐ / Propagate visual properties ✓ / Full ○ Partial ●; Instances to Vary (grijs). Aanwezig.\n- [0031] Tree: Cut list(1)▸Cut-Extrude2, Equations, Material <not specified>, Sheet-Metal, Base-Flange1, Fillet1, Cut-Extrude1, **Axis1** (as-icoon in tree), CirPattern1, Combine1, Tab1, Cut-Extrude2, Flat-Pattern. Aanwezig (Axis1).\n- [0011] Line Properties boven YouTube-tekening (narratie).\n\n## 29 TooTallToby-10-02 – LEG BASE\n- [0017] **View-menu**: Redraw Ctrl+R, **Screen Capture ▸**, Display ▸, Modify ▸, **Lights and Cameras ▸**, Hide / Show ▸, **Toolbars ▸**, **Workspace ▸**, User Interface ▸, Touch Mode, Full Screen F11, Customize Menu. *Display*-submenu: Wireframe, Hidden Lines Visible, Hidden Lines Removed, Shaded With Edges, Shaded, **Draft Quality HLR/HLV**, Shadows In Shaded Mode, Ambient Occlusion, Perspective, Section View, Camera View (grijs), Curvature, **Zebra Stripes**, **Surface Curvature Combs**, Draft Analysis, Undercut Analysis, Parting Line Analysis, **Body Compare**, RealView Graphics, Cartoon, **Simulation Display** (grijs), **Tangent Edges Visible / as Phantom / Removed ✓**, Isolate (grijs), Customize Menu. Phlippo MenuBar heeft Redraw, Modify▸Orientation, Hide/Show, User Interface▸Task Pane, Customize, Maximize(F11); vet = ONTBREEKT als menu-item (Tangent Edges/Draft Quality/Touch Mode alleen in prefs/ShortcutBar → WIJKT AF).\n- [0021] **Dimension PM** (sketchmaat): tabs Value / Leaders / Other; Style-iconen + <NONE>; Tolerance/Precision None, .123 (Document); Primary Value \"D1@Sketch5\" 1.250in; Dimension Text <DIM> met uitlijn- en symboolknoppen; All uppercase ☐; Dual Dimension. Status \"Set the properties of the selected dimension(s).\" Aanwezig.\n- [0023] **Sweep PM**: Sketch Profile ● / Circular Profile ○; boxen \"PROFILE\" en \"PATH\"; Guide Curves; Options; **Start and End Tangency**; Thin Feature ☐; **Curvature Display**; callouts \"Profile(PROFILE)\" / \"Path(PATH)\"; status \"Select guide curves\". ONTBREEKT: radio's, Start and End Tangency, Curvature Display, callouts.\n- [0039] Tree Sweep1, **DeleteFace1**; Features-ribbon eindigt met **Deform**. Delete Face aanwezig; Deform ONTBREEKT.\n- [0033/0035] Sketch op Front Plane met vlaklabel \"Front Plane\" in graphics, status \"Hit Esc key to abort animation\"; Line Properties met Additional Parameters (zie 27). Vlaklabel/animatie-status controleren.\n\n## 30 TooTallToby-07-01 – FOOTBALL\n- [0051] **Boss-Extrude PM**: Direction 1 **Offset From Surface**; richtingbox; Face<1> (roze); 0.150in; Reverse offset ☐; Translate surface ☐; Merge result ✓; Draft outward grijs. Aanwezig.\n- [0055/0061] **LPattern1 PM**: Direction 1 \"Line8@Sketch1\", Spacing and instances ● / Up to reference ○, 1.000in, 3; Direction 2 idem 1.000in, 4; **Pattern seed only ✓**; Features and Faces: Boss-Extrude2; Bodies; Instances to Skip; Options. In graphics **bewerkbare callouts** \"Direction 1/2 – Spacing / Instances\". Labels aanwezig; callouts controleren.\n- [0064] **Mass Properties-dialoog**: bestandsbox \"Part2.SLDPRT\", Options…, Override Mass Properties…, Recalculate, Include hidden bodies/components ✓, Create Center of Mass feature ☐, Show weld bead mass ☐, \"Report coordinate values relative to: -- default --\"; tekst Density/Mass/Volume/Surface area/Center of mass/Principal axes of inertia…/Moments of inertia (2 blokken); knoppen Help, Print…, Copy to Clipboard. Alle labels aanwezig; controleren: \"Principal axes of inertia\"-blok en IPS-eenheden (pounds/inch).\n- [0037/0039] Sketch1 (11.600, R.625, 6.700, \"Fully Defined Editing Sketch1\"), Revolve1 oranje. [crop 0031] S-toets sketch-shortcutbar. Aanwezig.\n\n## 31 FREE Training – SINK WEIGHT\n- [0017] **Sensor PM**: Sensor Type: Mass Properties; Properties: Mass; selectiebox met tooltip \"Entities to Monitor\"; \"Value :\"; sectie *Alert* met checkbox. Aanwezig (SensorPM.tsx).\n- [0025/0043] Tree: Sensors▸**Mass1(121.747651 g)** (waarde in node-naam), \"LAYOUT SKETCH\" hernoemd + sketchkleur gewijzigd, materiaal \"1060 Alloy\", Revolve1, Cut-Extrude1, Cut-Revolve1. Sensorwaarde in tree-label controleren.\n- [0027/0031] Line Properties met Message; status \"… Under Defined Editing Sketch2 **(Locked Focus)**\". \"(Locked Focus)\" ONTBREEKT.\n- [0047] Cut-Extrude PM: From **Offset** 0.00mm; Through All; Flip side to cut; Draft outward. Aanwezig.\n- [0049] **Sketch Plane PM** (\"Sketch Plane/Face: Face<1>\", Edit Sketch Plane). ONTBREEKT.\n- [0051] Tree-context-toolbar op Cut-Extrude2 (8 iconen + comment). [0045] sketch met \"*Top\"-label en S-bar. [0053] Mirror1. Aanwezig.\n\n## 32 Free SHEET METAL Tutorial for HIGH SCHOOL / COLLEGE (deel 1)\n- [crop 0013] Base Flange: Blind (tooltip Depth) 40.00mm; 4.00mm; Reverse direction; 6.00mm; K-Factor 0.5. Aanwezig.\n- [crop 0015] Edge-Flange1: Edit Flange Profile; Use default radius ✓; 6.00/1.00mm grijs; Angle 90.00deg; Perpendicular/Parallel grijs; Flange Length Blind 104.00mm, 3 iconen; Flange Position. Aanwezig.\n- [0019] **Profile Sketch-dialoog** \"The sketch has intersecting contours.\" met < Back / Finish (grijs) / Cancel / Help; erachter Circle PM (Add dimensions grijs, Diameter dimensions ✓, Parameters -73.37). ONTBREEKT (dialoog van Edit Flange Profile).\n- [0031] Profile Sketch \"The sketch has more than one open contour.\" + **Trim Entities PM**: Power trim, Corner, Trim away inside, Trim away outside, Trim to closest; Keep trimmed entities as construction geometry ☐; Ignore trimming of construction geometry ☐. Trim-opties aanwezig; dialoog ONTBREEKT.\n- [0011/0037] Line Properties met inline maatinvoer (80.03 / R14). [0041] resultaat 817 g (narratie).\n\n## 33 Free SHEET METAL Tutorial for HIGH SCHOOL / COLLEGE (deel 2)\n- [0039] Base Flange vanuit sketch met meerdere contouren (\"No Contour Selection? NO PROBLEM\"); tree toont *Surface Bodies* én *Solid Bodies*. Aanwezig.\n- [0045] **Edge-Flange1 PM** (lege selectie): Edit Flange Profile grijs; Use default radius ✓ 3.00/1.00mm; Angle 90.00deg; Perpendicular/Parallel grijs; Flange Length Blind 9.00mm; Flange Position 5 iconen; Trim side bends ✓; **Offset ☐**; Custom Bend Allowance; Custom Relief Type. Status \"Please select an edge of a planar face to create the edge flange.\" Labels aanwezig; Offset-checkbox + statustekst controleren.\n- [0051] **Surface-Extrude1** onder Surface Bodies(1) (Insert ▸ Surface ▸ Extrude als referentie voor Edge Flange). Aanwezig.\n- [0063] Breadcrumb \"Edge-Flange1 ▸ Sketch13\" linksboven in graphics, context-toolbar 11 iconen, **Deform** in Features-ribbon, tree **Body-Delete/Keep 1**. Breadcrumb/Body-Delete aanwezig; Deform ONTBREEKT.\n- [0075] **Fillet PM**: tabs Manual / FilletXpert; Fillet Type 4 iconen; Items To Fillet; Show selection toolbar ✓; Tangent propagation ✓; Full preview ●; Fillet Parameters Symmetric 10.00mm; Multi Radius Fillet ☐; Profile: Circular; Setback Parameters; Partial Edge Parameters (checkbox-sectie). Aanwezig.\n- [0067/0071/0079] Line Properties (Horizontal3, Coincident3; 29.00/180.00°), tree Tab1, Edge-Flange2, Fillet1, Cut-Extrude1, Flat-Pattern. Aanwezig.\n\n## 34 Can we PATTERN this JOG?? – ULTIMATE Sheet Metal Training\n- [0027] Base Flange: Depth-veld met **uitdrukking \"100.00mm-38-12\"** en popup **\"Units >\"** (vergelijking in spinbox); 5.00mm; Reverse direction ✓; 8.00mm; K-Factor 0.333. Expressie-invoer met Units-popup ONTBREEKT (geen label gevonden).\n- [0037] **Mirror PM**: Mirror Face/Plane Face<1>; Features to Mirror; Faces to Mirror; Bodies to Mirror: Tab1; Options Merge solids ✓, Knit surfaces ☐, Propagate visual properties ✓, Full ○ / Partial ●; gele wireframe-preview. Aanwezig.\n- [0041/0049] Tree: Cut list(1) bevat **Fillet1 / Cut-Extrude1** (cut-list-item verwijst naar laatste feature); Base-Flange1▸Sketch1+BaseBend1; Tab1; Mirror1; Fillet1; (-)Sketch11 ⌀160. Aanwezig.\n- [0065] **Fillet PM Full Round**: 4e type-icoon actief; Items To Fillet 3 boxen (Face<1>, actieve middenbox blauw, 3e); callout \"Side Face Set 1\"; Tangent propagation ✓; Full preview ●. Aanwezig.\n- [0071] **Combine1** in Cut list; tree Base-Flange2, Fillet2, Cut-Extrude2. Aanwezig.\n\n## 36 Sheet Metal BENDS NOT SHOWING in Drawings!\n- [0007 / crop 0005] **Drawing View5 PM**: Import options; Display State \"<Default>_Display State 1\"; sectie **Bend Lines** (checkbox) ✓; **Bend Notes** ✓ met formaat \"<bend-direction> <bend-angle> R <bend-radius>\" + 6 stijl-iconen; **Flat Pattern Display** 0.00deg + knop **Flip view**; Display Style 5 iconen (HLR), High quality ● / Draft quality; Scale Use sheet scale ● / Use custom scale 1:2. Flat-pattern-view met bend notes \"DOWN 90° R 3 / UP 90° R 3\", gestippelde view-rand met hoekhaken; status \"Under Defined Editing Drawing View5 1:2 MMGS\". ONTBREEKT: Bend Lines, Bend Notes, note-formaat, Flat Pattern Display, Flip view; rest aanwezig.\n- [crop 0009] Hide/Show Items-flyout (heads-up) met ~26 toggles. Aanwezig.\n- [0011] **Dimension PM (drawing)**: **Dimension Assist Tools: Smart dimensioning ☐ / Rapid dimensioning ✓ / DimXpert**; Style; Tolerance/Precision None, .12 (Document); Primary Value \"RD1@Drawing View5\" 126.00mm, Override value ☐; Dimension Text <DIM>. Status \"Select one or two edges/vertices and then a text location.\" ONTBREEKT: Dimension Assist Tools/Smart/Rapid dimensioning.\n- [crop 0013] **Confirm Delete**: \"Delete the following item(s)?\" lijst \"☐ Sheet Format1 (Drawing Sheet)\", knoppen Yes / Yes to All / No / Cancel / Help, \"Don't show again\" ☐, tooltip \"Sheet1\". Labels aanwezig (Yes to All, show again in prefs) → checkbox-lijst en Help-knop controleren.\n- [0015] **Save As** (Windows-dialoog): pad …\\SOLIDWORKS 2022\\templates, lijst MBD / Drawing.DRWDOT; File name; Save as type \"Drawing Templates (*.drwdot)\"; \"Description: Add a description\"; radio Save as / Save as copy and continue / Save as copy and open; Include all referenced components ☐; Add prefix ☐ / Add suffix ☐; Advanced; Hide Folders. Phlippo heeft eigen Save As▸STL/drwdot → WIJKT AF; ONTBREEKT: Save as copy and continue/open, Include all referenced components, Add suffix, Description, Hide Folders.\n- Annotation-ribbon zichtbaar (Smart Dimension, Model Items, Spell Checker, Format Painter, Note, Linear Note Pattern, Balloon, Auto Balloon, Magnetic Line, Surface Finish, Weld Symbol, Hole Callout, Geometric Tolerance, Datum Feature, Datum Target, Center Mark, Centerline, Area Hatch/Fill, Revision Symbol, Revision Cloud, Blocks, Tables) – alle gecontroleerde labels aanwezig.\n\n## 37 Sheet Metal SPEED RUN!!\n- [0013] **Base Flange PM** volledig: *Sheet Metal Parameters From Material*: Use material sheet metal parameters ☐; Direction 1 Blind 50.00mm; Direction 2 ☐; Use gauge table ☐; 3.00mm / Reverse direction ☐ / 5.00mm; Bend Allowance K-Factor 0.333; Auto Relief. Gele dunne preview. Aanwezig.\n- [0017/0031] Tree Cut list(1)▸Cut-Extrude1, Equations, PLAIN CARBON STEEL, Sheet-Metal, Base-Flange1, Flat-Pattern (grijs); breadcrumb \"Base-Flange1 ▸ Sketch1\"; vlak-context-toolbar 8 iconen; tree-context-toolbar; status \"Length: 97mm\". Aanwezig.\n- [0021/0027] **Profile Sketch-dialoog**: \"The sketch has both open and closed contours.\" / \"The sketch is valid.\" (Finish actief), Back/Finish/Cancel/Help. ONTBREEKT.\n- [0035] Sheet Metal-ribbon (zie 26, zelfde ontbrekende items), Mirror1 ook in Cut list, tooltip \"Edge-Flange2\". [0037] **Break-Corner1**, Flat-Pattern actief, Flatten gehighlight. Aanwezig.\n\n## Samenvatting ontbrekend (uniek)\nSweep: Sketch/Circular Profile-radio, Diameter, Merge tangent faces, Start and End Tangency, Curvature Display, SelectionManager/Open Group, Profile()/Path()-callouts · Sketch: \"Line Properties\"-titel + Message-box, Additional Parameters, Doubled Distance, Reattach Relation, Control Vertex Parameters, Diameter dimensions (Circle PM), \"(Locked Focus)\", Sketch Plane PM · Sheet metal: Swept Flange, Forming Tool, Sheet Metal Gusset, Tab and Slot, Simple Hole, Vent, Normal Cut, Insert Bends, Profile Sketch-dialoog (3 meldingen), Units▸-popup bij expressie · Features: Deform · Evaluate: Performance Evaluation, Body Compare, Deviation Analysis, Zebra Stripes, Symmetry Check, Compare Documents, Check Active Document · View-menu: Screen Capture, Lights and Cameras, Toolbars, Workspace, Surface Curvature Combs, Simulation Display; Tangent Edges ×3 / Draft Quality HLR / Touch Mode alleen in prefs, niet als menu-items · Drawing: Bend Lines, Bend Notes (+formaat), Flat Pattern Display, Flip view, Dimension Assist Tools (Smart/Rapid dimensioning), Save-As-opties (copy and continue/open, referenced components, suffix, Description, Hide Folders), MBD Dimensions-ribbontab.\n\nNiet gelezen (rate-limit): contactsheets 28/29/30 en frames buiten de genoemde nummers; video 29 toont van 0027–0035 een ander onderdeel (Part4, sweep-pad) dan de Leg Base-titel."}},"serverClassifierRequest":"84aba384-34c8-4346-a3ed-81b1bed1fad6","apiBlockIndex":0,"requestId":"req_011CgNtBusMUGe6q1jtSzDyt","requestRef":"44dafa07-c7c2-43b9-aac3-adea4c92856e","requestedModel":"claude-fable-5-1","attributionAgent":"general-purpose","type":"assistant","uuid":"9ff68b98-bb7c-4502-84ed-40d5c28434f3","timestamp":"2026-10-25T11:35:28.976Z","advisorModel":"claude-fable-5-1","effort":"high","perTurnEffort":"high","userType":"external","entrypoint":"claude-desktop","cwd":"C:\\Users\\ianph\\OneDrive\\Bureaublad\\Phlippo CAD\\Claude","sessionId":"89d8d793-f0ea-4467-813d-a66f7610fca6","version":"2.1.308","gitBranch":"claude/fase1-schetser","slug":"typed-jumping-hickey"}, Inventaris video 13–24 (agent, 2026-10-25), Inventaris video 13–24 + parity met Phlippo CAD (src/)\n\nMethode: contact sheets + 8–16 frames per video gelezen; elk UI-label case-insensitive gegrept in `src/**/*.{ts,tsx,css}` (Engels én Nederlands). \"✓\" = label aanwezig; \"ONTBREEKT\" = 0 hits; \"WIJKT AF\" = aanwezig maar anders. Frame = `<nn>/frames/00xx.jpg`.\n\n## 13 Fully Define Every Time – The SOLIDWORKS Sketch Song (SW 2012)\n- [0002] **Display/Delete Relations** PM: dropdown \"Overdefining/Not Solved\", lege relatielijst, checkbox \"Suppressed\", knoppen \"Delete\" / \"Delete All\", sectie \"Entities\"; ballon \"The sketch is no longer over defined.\"; status \"Under Defined | Editing Sketch1 | MMGS\". → ✓ Display/Delete Relations; **ONTBREEKT**: filter \"Overdefining/Not Solved\" (0 hits, alleen \"Not Solved\" 3x), knop \"Delete All\", sectie \"Entities\", ballon-melding.\n- [0003] **Line Properties** PM: \"Existing Relations\" (leeg, status \"Under Defined\"), \"Add Relations\": Horizontal / Vertical / Fix, \"Options\": For construction / Infinite length, \"Parameters\": lengte 162.918…, hoek 269.182…°. Status \"Length: 162.92mm\". → ✓ secties; **ONTBREEKT**: PM-titel \"Line Properties\" (0 hits), statusbar \"Length:\" bij lijn (geen hit in StatusBar.tsx).\n- [0005–0006] Smart Dimension: 125, Ø30, 15; blauw (under defined) → zwart (fully defined). ✓\n- [0008] Sketch-shortcutbar (S-key) 10 iconen in 2 kolommen; groene relatie-iconen met indexcijfers (□₁, □₀, |). ✓ ShortcutBar.tsx; indexcijfers op relatie-iconen niet geverifieerd.\n- [0009] Tangent-relatie-iconen (groene ruit) op boog/lijn. ✓\n\n## 14 Wheel – Sweep with Guide Curve, Pattern\n- [0011] Dimension PM \"Value | Leaders | Other\", Style `<NONE>`, Tolerance/Precision \"None\"; gedubbelde maten (Ø185, 150, 20.00°, 25). ✓\n- [0013] Breadcrumb \"Front Plane\" in grafisch gebied + S-key sketchbar (12 iconen). ✓ (ShortcutBar)\n- [0017] Line Properties PM met gele \"Message\"-balk, \"Additional Parameters\" sectie. **ONTBREEKT**: \"Additional Parameters\" (0), titel \"Line Properties\".\n- [0021] Boom: \"SWEEP PATH\", \"SWEEP GUIDE\" (hernoemde schetsen), \"(-) Sketch5\" prefix voor under-defined. ✓ Rename; \"(-)\"-prefix niet geverifieerd.\n- [0023] **Properties** PM (punt): \"Selected Entities: Line1@SWEEP GUIDE / Point6\", Existing Relations \"PiercePoint1\", \"Fully Defined\", Add Relations Midpoint / Coincident / Pierce; status \"Normal Distance: 15.8mm\". ✓ Pierce/Midpoint/Coincident; **ONTBREEKT** statusbar \"Normal Distance\" (1 hit, niet in StatusBar).\n- [0025] Callouts in grafisch gebied: \"Guide Curve(SWEEP GUIDE)\", \"Path(SWEEP PATH)\", \"Profile(Sketch5)\". **WIJKT AF**: Phlippo toont geen genoemde sweep-callouts.\n- [0027] **Sweep** PM: \"Profile and Path\" radio Sketch Profile / Circular Profile; Profile=Sketch5, Path=SWEEP PATH; sectie **\"Guide Curves\"** met lijst + ▲▼ knoppen, \"Merge smooth faces\", spinner; secties \"Options\", \"Start and End Tangency\", \"Thin Feature\" (checkbox), \"Feature Scope\" (All bodies / Selected bodies / Auto-select), \"Curvature Display\". → ✓ Profile and Path, Thin Feature, Feature Scope; **ONTBREEKT**: Circular Profile (0), Guide Curves bij sweep (alleen bij loft, regel 2239), Merge smooth faces, Start and End Tangency, Curvature Display (Mesh preview / Zebra stripes / Curvature combs).\n- [0029] Boom: Revolve1, Boss-Extrude1, Sweep1; hover-tooltip \"Sweep1\" op feature. ✓\n- [0031] **Cut-Extrude** PM: Blind 25.00mm, \"Flip side to cut\", Draft outward (disabled), Direction 2, Thin Feature, **Selected Contours**: \"Sketch6-Region<1>\", \"Sketch6-Region<2>\", \"Sketch6-Contour<1>\". ✓\n- [0032] Boom-sensor \"Mass1(558.970815 g)\" onder Sensors. ✓ (sensors.ts)\n\n## 15 Layout Sketch, Contour Selection, Shared Sketches, Delete Face, Hole Wizard (SW 2015)\n- [0017/0023] Layoutschets: tooltip \"Tangent(Arc1, Line2)\" bij relatie-icoon; maten Ø77, Ø40, 155, 80, 33.00°. **ONTBREEKT**: hover-tooltip met relatienaam+entiteiten (niet gevonden).\n- [0025/0031] **Boss-Extrude** PM Blind 60.00/52.00mm, Merge result ✓, Selected Contours \"Sketch1-Contour<1>\"; RMB-contextmenu: Box Selection, Lasso Selection, Select Other, Clear Selections, Zoom/Pan/Rotate ▸, OK, Cancel, **Direction 1**: Reverse Direction, ✓Blind, Through All, Up To Vertex, Up To Surface, Offset From Surface, Up To Body, Mid Plane; **Direction 2**: ✓Direction 2 Off, Blind…Up To Body; \"Customize Menu\". Status \"Diameter: 40mm Center: 155mm,0mm,0mm\". → ✓ alles aanwezig (Viewport.tsx 1199–1203, \"Direction 2 Off\" 1 hit). **WIJKT AF**: statusbar \"Diameter: … Center: …\" bij hover op cirkelrand niet in StatusBar.tsx.\n- [0027] **Plane** PM: Message \"Fully defined\" (groen), First Reference \"Line6@Sketch1\": Perpendicular, \"Set origin on curve\", Coincident, Project; Second Reference \"Point13@Sketch1\": Coincident, Project, afstand-veld; Third Reference. ✓ First/Second/Third Reference; **ONTBREEKT**: \"Set origin on curve\" (0), \"Project\"-knop als relatie-optie niet geverifieerd.\n- [0033] **Fillet** PM: tabs Manual | FilletXpert; Fillet Type 4 knoppen (4e = Full Round, actief); 3 selectievakken (Side Face Set 1, Center Face Set, Side Face Set 2, met blauw/paars/roze kleurbalk); Tangent propagation, Full/Partial/No preview; status \"Select faces for the center and side face sets\". ✓ Full Round (7 hits).\n- [0034] Tekening-callout \"Ø16 HOLE ⌴Ø32 ⊻8\".\n- [0035] **Hole Specification** (Counterbore): Standard \"ANSI Metric\", Type \"Hex Bolt - ANSI B18.2.3.5M\", Size M5, Fit Normal, \"Show custom sizing\" ✓ met velden Through Hole Diameter / Counterbore dia / depth 3.580mm, End Condition \"Through All\", Options (Head clearance). ✓ ANSI Metric; Show custom sizing (1), Through Hole Diameter (1) aanwezig; **WIJKT AF**: type-lijst Phlippo = ISO/DIN-schroeven, geen \"Hex Bolt – ANSI B18.2.3.5M\".\n- [0037] Hole Wizard **Dowel Holes**: Size \"Ø1.0\", Fit \"Nominal\", custom 43.000mm, \"Restore Default Values\". ✓ Dowel (3), Restore Default Values (1); **ONTBREEKT**: Fit-waarde \"Nominal\" (Phlippo: Close/Normal/Loose).\n- [0039] **Hole Position** tab: gele instructie \"Use the dimensions and other sketch tools to position the hole or slot. Click on the 'Type' tab…\"; gele cirkel-preview; status \"Under Defined | Editing\". ✓ Positions-tab; instructietekst niet geverifieerd.\n- [0041] Key slot: Line Properties \"Horizontal3\", Parameters 16.00 / 0.00°; overlay \"SHIFT+CLICK for DIMENSION TANGENCY\"; status \"Distance: 4.05mm dX: 0mm dY: -4.05mm dZ: 0mm Total Length: 151.09mm\". **ONTBREEKT**: statusbar Distance/dX/dY/dZ/Total Length (0 in StatusBar); Shift+klik maat-tangency niet geverifieerd.\n- [0041, contact] **Mass Properties** dialoog: \"Include hidden bodies/components\" ✓, \"Create Center of Mass feature\", \"Show weld bead mass\", \"Report coordinate values relative to: -- default --\", tekstblok Density/Mass/Volume/Surface area/Center of mass/Principal axes & moments (Ix,Iy,Iz,Px,Py,Pz)/Moments of inertia (Lxx…), knoppen Override Mass Properties / Recalculate. ✓ alle labels (2 hits elk). \n- Delete Face (titel): ✓ 10 hits.\n\n## 16 Sheet Metal Jog Tool, Edge Flange, Base Flange Tab\n- [0011/0013] **Base Flange** PM: \"Sheet Metal Parameters From Material\" ▸ \"Use material sheet metal parameters\" ☐; Direction 1: Blind 10.00mm → **Mid Plane** 60.00mm; Direction 2 ☐; \"Sheet Metal Gauges\" ▸ Use gauge table ☐; \"Sheet Metal Parameters\" T 3.00mm, \"Reverse direction\" ☐, bend radius 3.00mm; \"Bend Allowance\" K-Factor. ✓ allemaal.\n- [0019] **Edge-Flange** PM: Flange Parameters Edge<1>, \"Edit Flange Profile\", \"Use default radius\" ✓, radius 3.00 / gap 1.00 (disabled); Angle 90.00deg + slotje, vlakselectie, radio Perpendicular to face / Parallel to face; Flange Length Blind 32.00mm, 3 meetknoppen (outer/inner/bend-out); Flange Position 5 knoppen. ✓ (PropertyManager 1387–1438).\n- [0025] Modify-dialoog \"D1@Sketch7\" 17.00mm + Profile Sketch dialoog \"The sketch is valid.\" / Back / Finish / Cancel / Help. ✓ Modify, Profile Sketch (8); **ONTBREEKT**: tekst \"The sketch is valid\" (0).\n- [0031] Fillet (sheet metal): Edge<1>, Edge<2>, Radius 9.00mm; callout \"Radius: 9mm\"; \"Show selection toolbar\", Symmetric, Multi Radius Fillet, Profile Circular, Setback Parameters. ✓.\n- [0037] **Cut-Extrude** (sheet metal) Blind 10.00mm: \"Link to thickness\", \"Flip side to cut\", **\"Normal cut\"** ✓, \"Optimize Geometry\" ☐. **ONTBREEKT**: Normal cut (0), Link to thickness (0), Optimize Geometry (0).\n- [0045] Vergroot Sketch-lint: Exit Sketch, Smart Dimension, Line/Rect/Slot/Circle/Arc/Polygon/Spline/Ellipse/Fillet/Plane/Text, Trim/Convert/Offset Entities, \"Offset On Surface\"; tabs Features | Sketch | Surfaces | Sheet Metal | Evaluate | SOLIDWORKS Add-Ins. ✓ (Offset On Surface niet geverifieerd).\n- [0051/0055/0059] **Jog** PM: Selections ▸ Fixed Face \"Face<1>\", Use default radius ✓, 3.00mm; Jog Offset: Blind 20.00mm → **Up To Surface** \"Face<2>\", \"Dimension position\" 3 knoppen, \"Fix projected length\" ✓; Jog Position 4 knoppen; Jog Angle 60.00deg → 61.00deg; \"Custom Bend Allowance\" ☐. ✓ secties; **ONTBREEKT**: label \"Dimension position\" (0) – knoppenrij mogelijk zonder label.\n- [0063] **Mirror** PM: Mirror Face/Plane, Features to Mirror, Faces to Mirror, Bodies to Mirror, Options: Geometry Pattern ☐ / Propagate visual properties ✓ / Full preview / Partial preview ●. ✓.\n- Sheet Metal lint: Base Flange/Tab, Convert to Sheet Metal, Lofted-Bend, Edge Flange, Miter Flange, Hem, Jog, Sketched Bend, Cross-Break, Swept Flange, Corners, Forming Tool, Sheet Metal Gusset, Tab and Slot, Vent, Extruded Cut, Simple Hole, Normal Cut, Unfold, Fold, No Bends, Insert Bends, Rip, Flatten. **ONTBREEKT**: Swept Flange, Forming Tool, Sheet Metal Gusset, Tab and Slot, Simple Hole, Insert Bends (alle 0).\n\n## 17 Rocket – live solve (IPS, candy stripe)\n- [0037] S-key sketchbar; maten .125, R.125, 2.250 (inch); boom \"1060 Alloy\"; status \"IPS\". ✓.\n- [0039] **Revolve** PM: Axis of Revolution (leeg), Direction1 Blind 360.00deg, Direction2, Thin Feature, **Selected Contours** \"Sketch1-Region<1>\", \"Sketch1-Region<2>\" (gedeelde schets). ✓.\n- [0041] Boss-Extrude depth-tooltip \"Depth\" op veld, 0.125in, Merge result, Selected Contours Region<1>/<2>. ✓.\n- [0043] Boom: Revolve1 ▸ Sketch1 (gedeelde schets onder feature), Boss-Extrude1, CirPattern1. ✓.\n- [0047/0055] Line Properties met Message-balk; grafisch label met maat tijdens tekenen; \"Fully Defined\". ✓.\n- [0059] **Split Line** PM: Type of Split ○Silhouette ●Projection ○Intersection; Selections \"Current Sketch\" + vlakkenbox; \"Single direction\" ☐, \"Reverse direction\". ✓ (regel 1237–1275).\n- [0063] **Surface-Sweep** PM (Surfaces-tab): Profile and Path, Sketch5/Sketch4; Options: Profile orientation \"Follow Path\", Profile Twist \"Specify Twist Value\", Twist control \"Revolutions\", Direction 1 = 4, Merge tangent faces, Show preview; Curvature Display. ✓ Surface-Sweep (2); **ONTBREEKT**: Profile orientation, Follow Path, Profile Twist, Specify Twist Value, Twist control, Merge tangent faces (alle 0).\n- [0065] Split Line **Intersection**: Face<1>, Face<2>; \"Surface Split Options\": Split all ☐, ●Natural ○Linear. **ONTBREEKT**: Surface Split Options / Split all / Natural / Linear (0).\n- [0067] Surfaces-lint: Extruded/Revolved/Swept/Lofted/Boundary/Filled Surface, Freeform, Planar Surface, Offset Surface, Ruled Surface, Surface Flatten, Fillet, Delete Face, Replace Face, Delete Hole, Extend Surface, Trim Surface, Untrim Surface, Knit Surface, Thicken, Thickened Cut, Cut With Surface. Boom: Surface Bodies(2): Surface-Sweep1, Body-Move/Copy1; \"Mass1(2.28211174 lb)\". **ONTBREEKT**: Freeform, Surface Flatten, Replace Face, Delete Hole, Extend Surface, Untrim Surface, Thickened Cut, Cut With Surface, Body-Move/Copy (alle 0).\n- [0069] **Delete/Keep Body** PM: Type ●Delete Bodies ○Keep Bodies; \"Bodies to delete\": Surface-Sweep1, Body-Move/Copy1. **ONTBREEKT** (0).\n- [0071] Boom: Split Line2, Body-Delete/Keep1, uiterlijk per vlak (rood/wit/blauw). ✓ appearance dialoog aanwezig.\n\n## 18 Linear Pattern + Vary Sketch\n- [0013] **Offset Entities** PM: 10.00mm, Add dimensions, Reverse ✓, Select chain, Bi-directional, Cap ends (Arcs/Lines), Construction geometry: Base geometry / Offset geometry. ✓ alle labels.\n- [0015/0017] **Linear Pattern** PM: Direction 1 Edge<1>, ●Spacing and instances ○Up to reference, 14.00mm, 6; Direction 2; Features and Faces \"Cut-Extrude2\"; Bodies; Instances to Skip; Options: **Vary sketch** (disabled tot richting gekozen), Geometry pattern, Propagate visual properties, Full/Partial preview; Instances to Vary; callout \"Direction 1 Spacing/Instances\". ✓ (regel 1848–1933).\n- [0019] Uitvergroot Options; \"Vary sketch\" grijs. ✓\n- [0029/0031] Arc PM (3-punt) met 8 parameters; Dimension 175.00mm \"D4@Sketch1\". ✓\n- [0035] **Sweep** \"Circular Profile\" ● met diameter 4.00mm, Path(Sketch1)-callout, Thin Feature disabled. **ONTBREEKT**: Circular Profile.\n- [0039] **Plane** PM: Message \"Fully defined\", First Reference Front Plane: Parallel/Perpendicular/Coincident/90deg/22.0568…mm, \"Flip offset\" ✓, aantal 1, Mid Plane. ✓.\n- [0043] Boom met map \"UPPER WIRE\" (folder) met 2 schetsen; \"Plane1\", \"(-) Sketch6\". ✓ folders (verondersteld); \n- [0047] Properties PM punt: \"Arc2@UPPER WIRE SWEEP PATH / Point10\", PiercePoint6, Fully Defined. ✓\n- [0059] Boom: Sweep2, LPattern1, Mass1(129.017514 g). ✓\n\n## 19 Configuration Tables – Weight Plates\n(Frames 0049–0067: Configurations-tab, \"Modify Configurations\"-tabel, ConfigurationManager, Design Table). Niet opnieuw per label gegrept; `configureDialog.tsx` aanwezig → **globaal ✓**, detail-parity niet geverifieerd in deze pass.\n\n## 20 Fitting – live solve\n- [0017–0028] Standaard Extrude/Revolve/Fillet/Hole Wizard-PMs zoals boven; geen nieuwe labels buiten lijst. ✓.\n\n## 21 Sheet Metal – live solve (Model Monday)\n- [0023] Line Properties zonder relaties, Message-balk. ✓\n- [0025] Boom: Cut list(1), Sheet-Metal, Base-Flange1, Flat-Pattern (grijs). ✓ Cut list (2), Flat-Pattern (9).\n- [0026] Insert Line PM: Orientation ●As sketched / Horizontal / Vertical / Angle; Options For construction ✓ / Infinite length / Midpoint line / Add dimensions. **WIJKT AF**: \"Orientation\"-radio's (As sketched/Angle) en \"Midpoint line\" niet geverifieerd (geen grep-hit op \"Midpoint line\").\n- [0027/0028] Slot via S-bar; Dimension \"D4@Sketch7\" 30.00mm; \"Fully Defined\". ✓\n- [0029] Dimension 30.00° \"D2@Sketch8\". ✓\n- [0031] Boom: Break-Corner1, Cut-Extrude1/2. ✓ Break-Corner (5).\n- [0033] **Fillet** (Sheet Metal-lint actief): Edge<1>, Edge<2>, Show selection toolbar, Symmetric 10.00mm, Multi Radius Fillet, Profile Circular, Setback Parameters, **Partial Edge Parameters** (Edge<2>, Start condition, Distance Offset); callout \"Radius: 10.00000000mm\"; zwevende selectie-toolbar in grafisch gebied. ✓ Partial Edge Parameters (3).\n- [0035] **Circle** PM: Circle Type (center / perimeter), Existing Relations \"Diameter0\", Fully Defined, Add Relations Fix, Options For construction / Add dimensions / Diameter dimensions ✓, Parameters X 100.00 Y -30.00 R 5.00. ✓.\n\n## 22 Hole Wizard + Skip Instances\n- [0005/0006] **Hole Specification**: Standard \"ANSI Inch\", Type \"Binding Head Screw\", Size #00, Fit Normal, Show custom sizing 0.0550in/0.1250in/0.0280in; dan \"ANSI Metric\" / \"Hex Bolt - ANSI B18.2.3.5M\" M5 5.500/12.240/3.580mm; End Condition Through All. **ONTBREEKT**: standaard \"ANSI Inch\" (0); Type-lijst (Binding Head Screw, Hex Bolt…).\n- [0009] \"Pan Cross Head - ANSI B18.6.7M\" M10 8.000/15.000/6.000mm, \"Restore Default Values\". ✓ Restore Default Values.\n- [0010/0011] Positions-tab + Circle-tool: label \"Ø95\" met construction-cirkel; status \"Under Defined | Editing Sketch14\". ✓\n- [0012] Lint-dropdown Linear Pattern ▸ Linear Pattern, **Circular Pattern**, Mirror, Curve Driven Pattern, Sketch Driven Pattern, Table Driven Pattern, Fill Pattern, Variable Pattern; boom \"CBORE for M10 Pan Head Machine Screw1\", \"CBORE for M5 Hex Head Bolt1\", \"CirPattern1\". ✓ alle patroontypes; **WIJKT AF**: Hole-Wizard featurenaam \"CBORE for … Screw\" niet geverifieerd.\n- [0013–0015] **CirPattern** PM: Direction 1 Edge<1>, ○Instance spacing ●Equal spacing, 360.00deg, 8; Direction 2; Features and Faces \"CBORE for M10…\" met scroll ◀▶; Bodies; **Instances to Skip**: \"(D1, 6)\", \"(D1, 8)\"; Options Geometry pattern / Propagate visual properties / Full / Partial preview; Instances to Vary; callout \"Direction 1 Spacing: 360.0000deg Instances: 8\"; roze bolletjes op instanties; status \"Box/lasso – Toggles, Shift + box/lasso – Adds, Alt + box/lasso – Removes, selection from the list.\" ✓ alles; **WIJKT AF**: skip-notatie \"(D1, n)\" en Shift/Alt box-lasso-statustekst niet geverifieerd.\n\n## 23 Thin Feature, Revolve, Geometry Pattern\n- [0019/0020] **Boss-Extrude Thin**: Blind 10.00→28.00mm, Thin Feature \"One-Direction\" 10.00→3.00mm, \"Auto-fillet corners\" ☐; callout \"D2@Sketch1\". ✓ One-Direction (3), Auto-fillet corners (5).\n- [0024] Dimension + **Modify**-dialoog (D3@Sketch2 44.6709915mm, ✓ ✗ ↻ knoppen, schuifregelaar). ✓ Modify.\n- [0026] Boom: Solid Bodies(1), Extrude-Thin1, Sketch2. ✓ (\"Extrude-Thin\" naam niet geverifieerd).\n- [0027] Overlay \"RMB Right Mouse Button\" (view-rotatie). ✓\n- [0033] Boom met waarschuwingsdriehoek op \"CirPattern1\" (fout). ✓ (Confirmation/ fout-icon aanwezig, 14 hits).\n- [0035] **CirPattern** met **Geometry pattern ✓**, Features \"Revolve1, Cut-Extrude1, Cut-Extrude2\", Face<1> als as, 360deg / 3. ✓\n- [0036/0037] Fillet: 4 edges, Symmetric 7.00mm, callout \"Radius: 7.00000000mm\", groene bevestigingshoek rechtsboven. ✓\n- [0038] Sketch-overlay \"Click THIS ENDPOINT\" – maat-handle voor hoeklijnen (magic dimension handle: lengte+hoek-invoer bij lijn tekenen). ✓ (frame 0041 gedrag: dubbel label \"30 / 60\" tijdens tekenen).\n- [0042] Boom: Fillet1, Cut-Extrude3, Cut-Extrude4; RealView-schaduw. ✓\n\n## 24 Sheet Metal THRU BRACKET (SW 2020)\n- [0021] **Base Flange**: Use material sheet metal parameters ☐, Blind 42.00mm, Direction 2, Use gauge table, T 5.00mm \"Reverse direction\" ✓, radius 5.00, Bend Allowance K-Factor. ✓\n- [0023] S-key Sheet-Metal-bar + **\"Customize...\"** tooltip; boom Cut list(1), Sheet-Metal, Base-Flange1, Flat-Pattern. ✓ Customize (3).\n- [0025/0026] **Edge-Flange1**: Edge<1>, Edit Flange Profile, Use default radius ✓ 5.00/1.00, Angle 90→**45.00deg**, Perpendicular/Parallel to face, Flange Length Blind 48.00mm + 3 knoppen, Flange Position 5 knoppen, Trim side bends ✓, Offset ☐; status \"Length: 42mm\". ✓; **ONTBREEKT** statusbar \"Length:\" bij edge-hover.\n- [0029] Lint uitgebreid: Features | Sketch | Sheet Metal | Evaluate | TOBYS WORKFLOW | System | Weldments | Mold Tools | Mesh Modeling | Data Migration | Direct Editing | Markup | Evaluate | MBD Dimensions | Render Tools | SOLIDWORKS Add-Ins | Analysis Prepar…  **ONTBREEKT**: Mold Tools, Structure System, Mesh Modeling, Data Migration, Direct Editing, Markup, MBD Dimensions, Render Tools (0 hits; Weldments 1).\n- [0031] \"Normal Cut\"-resultaat (Cut-Extrude1 in boom). Zie 16: **ONTBREEKT** Normal cut.\n- [0033] Profile Sketch wizard \"The sketch is valid.\" Back/Finish/Cancel/Help + grijze Edge-Flange PM met \"Custom Bend Allowance\", \"Custom Relief Type\". ✓ secties; **ONTBREEKT** \"The sketch is valid\".\n- [0034] Breadcrumb in grafisch gebied \"Edge-Flange2 ▸ Sketch12\" + contextuele toolbar (8 iconen). ✓ breadcrumb (14/0029 vergelijkbaar) – niet geverifieerd voor features.\n- [0037] Line Properties met Message-balk; sketch op flens. ✓\n- [0039] **Cut-Extrude**: Through All, \"Flip side to cut\", **\"Normal cut\"** ☐, Draft outward; callout \"50\". **ONTBREEKT** Normal cut.\n- [0043] Circle PM: Add dimensions ☐ / Diameter dimensions ✓; tekening \"Ø12 THRU ⌀ SYM R10\". ✓\n\n## Samenvatting ONTBREEKT (0 hits in src)\nSketch/PM: \"Line Properties\"-titel, \"Additional Parameters\", \"Overdefining/Not Solved\"-filter, \"Delete All\", \"Entities\"-sectie in Display/Delete Relations, \"Set origin on curve\", \"The sketch is valid\", \"Midpoint line\"/\"Orientation\"-radio's (Insert Line).\nFeatures: Sweep **Circular Profile**, Sweep **Guide Curves**, Merge smooth faces, Start and End Tangency, Curvature Display (Mesh preview/Zebra stripes/Curvature combs), Profile orientation/Follow Path/Profile Twist/Specify Twist Value/Twist control/Merge tangent faces, Surface Split Options (Split all/Natural/Linear), **Delete/Keep Body**, Body-Move/Copy, Replace Face, Delete Hole, Extend/Untrim Surface, Surface Flatten, Thickened Cut, Cut With Surface, Freeform, Deform.\nSheet Metal: **Normal cut**, Link to thickness, Optimize Geometry, Swept Flange, Forming Tool, Sheet Metal Gusset, Tab and Slot, Simple Hole, Insert Bends, \"Dimension position\"-label (Jog).\nHole Wizard: standaard \"ANSI Inch\", Fit \"Nominal\", ANSI-schroeftypes (Hex Bolt B18.2.3.5M, Pan Cross Head B18.6.7M, Binding Head Screw).\nStatusbar: \"Length:\", \"Distance: dX dY dZ Total Length:\", \"Normal Distance:\", \"Diameter: … Center:\", \"Editing Sketch<n>\" (Phlippo toont \"Editing <sketchnaam>\" – ✓ equivalent).\nLint-tabs: Mold Tools, Structure System, Mesh Modeling, Data Migration, Direct Editing, Markup, MBD Dimensions, Render Tools, Statistics/Deviation Analysis/Symmetry Check/Compare Documents/Check Active Document (Evaluate).\n\n## WIJKT AF (aanwezig, maar anders)\n- Sweep-callouts \"Guide Curve(…)/Path(…)/Profile(…)\" ontbreken in grafisch gebied (14/0025).\n- Hole Wizard Type-lijst is ISO/DIN i.p.v. ANSI-schroeven; Fit zonder \"Nominal\" (15/0035, 22/0005).\n- Skip-instanties notatie \"(D1, n)\" en Shift/Alt-lasso statustekst niet geverifieerd (22/0015).\n- Relatie-tooltip \"Tangent(Arc1, Line2)\" en relatie-icoon indexcijfers niet geverifieerd (15/0017, 13/0008).\n- Featurenamen \"Extrude-Thin1\", \"CBORE for M10 Pan Head Machine Screw1\", \"Body-Delete/Keep1\", \"Surface-Sweep1\" niet geverifieerd.\n\nVideo 19 (configuraties) en 20 (fitting) bevatten geen labels buiten de hierboven gecontroleerde set; detail-parity voor Modify Configurations-tabel is niet in deze pass geverifieerd."},"caller":{"type":"direct"}}],"container":null,"stop_reason":"tool_use","stop_sequence":null,"stop_details":null,"usage":{"input_tokens":32,"cache_creation_input_tokens":8409,"cache_read_input_tokens":521400,"output_tokens":11549,"output_tokens_details":{"thinking_tokens":91},"server_tool_use":{"web_search_requests":0,"web_fetch_requests":0},"service_tier":"standard","cache_creation":{"ephemeral_1h_input_tokens":0,"ephemeral_5m_input_tokens":8409},"inference_geo":"global","iterations":[{"input_tokens":32,"output_tokens":11549,"cache_read_input_tokens":521400,"cache_creation_input_tokens":8409,"cache_creation":{"ephemeral_5m_input_tokens":8409,"ephemeral_1h_input_tokens":0},"type":"message"}],"speed":"standard","fallback_credit":null},"input_transformations":[],"diagnostics":null,"context_management":null},"wireToolInputs":{"toolu_01SzW3oen5pTWR1ZofyoVfeS":{"message":"# Inventaris video 13–24 + parity met Phlippo CAD (src/)\n\nMethode: contact sheets + 8–16 frames per video gelezen; elk UI-label case-insensitive gegrept in `src/**/*.{ts,tsx,css}` (Engels én Nederlands). \"✓\" = label aanwezig; \"ONTBREEKT\" = 0 hits; \"WIJKT AF\" = aanwezig maar anders. Frame = `<nn>/frames/00xx.jpg`.\n\n## 13 Fully Define Every Time – The SOLIDWORKS Sketch Song (SW 2012)\n- [0002] **Display/Delete Relations** PM: dropdown \"Overdefining/Not Solved\", lege relatielijst, checkbox \"Suppressed\", knoppen \"Delete\" / \"Delete All\", sectie \"Entities\"; ballon \"The sketch is no longer over defined.\"; status \"Under Defined | Editing Sketch1 | MMGS\". → ✓ Display/Delete Relations; **ONTBREEKT**: filter \"Overdefining/Not Solved\" (0 hits, alleen \"Not Solved\" 3x), knop \"Delete All\", sectie \"Entities\", ballon-melding.\n- [0003] **Line Properties** PM: \"Existing Relations\" (leeg, status \"Under Defined\"), \"Add Relations\": Horizontal / Vertical / Fix, \"Options\": For construction / Infinite length, \"Parameters\": lengte 162.918…, hoek 269.182…°. Status \"Length: 162.92mm\". → ✓ secties; **ONTBREEKT**: PM-titel \"Line Properties\" (0 hits), statusbar \"Length:\" bij lijn (geen hit in StatusBar.tsx).\n- [0005–0006] Smart Dimension: 125, Ø30, 15; blauw (under defined) → zwart (fully defined). ✓\n- [0008] Sketch-shortcutbar (S-key) 10 iconen in 2 kolommen; groene relatie-iconen met indexcijfers (□₁, □₀, |). ✓ ShortcutBar.tsx; indexcijfers op relatie-iconen niet geverifieerd.\n- [0009] Tangent-relatie-iconen (groene ruit) op boog/lijn. ✓\n\n## 14 Wheel – Sweep with Guide Curve, Pattern\n- [0011] Dimension PM \"Value | Leaders | Other\", Style `<NONE>`, Tolerance/Precision \"None\"; gedubbelde maten (Ø185, 150, 20.00°, 25). ✓\n- [0013] Breadcrumb \"Front Plane\" in grafisch gebied + S-key sketchbar (12 iconen). ✓ (ShortcutBar)\n- [0017] Line Properties PM met gele \"Message\"-balk, \"Additional Parameters\" sectie. **ONTBREEKT**: \"Additional Parameters\" (0), titel \"Line Properties\".\n- [0021] Boom: \"SWEEP PATH\", \"SWEEP GUIDE\" (hernoemde schetsen), \"(-) Sketch5\" prefix voor under-defined. ✓ Rename; \"(-)\"-prefix niet geverifieerd.\n- [0023] **Properties** PM (punt): \"Selected Entities: Line1@SWEEP GUIDE / Point6\", Existing Relations \"PiercePoint1\", \"Fully Defined\", Add Relations Midpoint / Coincident / Pierce; status \"Normal Distance: 15.8mm\". ✓ Pierce/Midpoint/Coincident; **ONTBREEKT** statusbar \"Normal Distance\" (1 hit, niet in StatusBar).\n- [0025] Callouts in grafisch gebied: \"Guide Curve(SWEEP GUIDE)\", \"Path(SWEEP PATH)\", \"Profile(Sketch5)\". **WIJKT AF**: Phlippo toont geen genoemde sweep-callouts.\n- [0027] **Sweep** PM: \"Profile and Path\" radio Sketch Profile / Circular Profile; Profile=Sketch5, Path=SWEEP PATH; sectie **\"Guide Curves\"** met lijst + ▲▼ knoppen, \"Merge smooth faces\", spinner; secties \"Options\", \"Start and End Tangency\", \"Thin Feature\" (checkbox), \"Feature Scope\" (All bodies / Selected bodies / Auto-select), \"Curvature Display\". → ✓ Profile and Path, Thin Feature, Feature Scope; **ONTBREEKT**: Circular Profile (0), Guide Curves bij sweep (alleen bij loft, regel 2239), Merge smooth faces, Start and End Tangency, Curvature Display (Mesh preview / Zebra stripes / Curvature combs).\n- [0029] Boom: Revolve1, Boss-Extrude1, Sweep1; hover-tooltip \"Sweep1\" op feature. ✓\n- [0031] **Cut-Extrude** PM: Blind 25.00mm, \"Flip side to cut\", Draft outward (disabled), Direction 2, Thin Feature, **Selected Contours**: \"Sketch6-Region<1>\", \"Sketch6-Region<2>\", \"Sketch6-Contour<1>\". ✓\n- [0032] Boom-sensor \"Mass1(558.970815 g)\" onder Sensors. ✓ (sensors.ts)\n\n## 15 Layout Sketch, Contour Selection, Shared Sketches, Delete Face, Hole Wizard (SW 2015)\n- [0017/0023] Layoutschets: tooltip \"Tangent(Arc1, Line2)\" bij relatie-icoon; maten Ø77, Ø40, 155, 80, 33.00°. **ONTBREEKT**: hover-tooltip met relatienaam+entiteiten (niet gevonden).\n- [0025/0031] **Boss-Extrude** PM Blind 60.00/52.00mm, Merge result ✓, Selected Contours \"Sketch1-Contour<1>\"; RMB-contextmenu: Box Selection, Lasso Selection, Select Other, Clear Selections, Zoom/Pan/Rotate ▸, OK, Cancel, **Direction 1**: Reverse Direction, ✓Blind, Through All, Up To Vertex, Up To Surface, Offset From Surface, Up To Body, Mid Plane; **Direction 2**: ✓Direction 2 Off, Blind…Up To Body; \"Customize Menu\". Status \"Diameter: 40mm Center: 155mm,0mm,0mm\". → ✓ alles aanwezig (Viewport.tsx 1199–1203, \"Direction 2 Off\" 1 hit). **WIJKT AF**: statusbar \"Diameter: … Center: …\" bij hover op cirkelrand niet in StatusBar.tsx.\n- [0027] **Plane** PM: Message \"Fully defined\" (groen), First Reference \"Line6@Sketch1\": Perpendicular, \"Set origin on curve\", Coincident, Project; Second Reference \"Point13@Sketch1\": Coincident, Project, afstand-veld; Third Reference. ✓ First/Second/Third Reference; **ONTBREEKT**: \"Set origin on curve\" (0), \"Project\"-knop als relatie-optie niet geverifieerd.\n- [0033] **Fillet** PM: tabs Manual | FilletXpert; Fillet Type 4 knoppen (4e = Full Round, actief); 3 selectievakken (Side Face Set 1, Center Face Set, Side Face Set 2, met blauw/paars/roze kleurbalk); Tangent propagation, Full/Partial/No preview; status \"Select faces for the center and side face sets\". ✓ Full Round (7 hits).\n- [0034] Tekening-callout \"Ø16 HOLE ⌴Ø32 ⊻8\".\n- [0035] **Hole Specification** (Counterbore): Standard \"ANSI Metric\", Type \"Hex Bolt - ANSI B18.2.3.5M\", Size M5, Fit Normal, \"Show custom sizing\" ✓ met velden Through Hole Diameter / Counterbore dia / depth 3.580mm, End Condition \"Through All\", Options (Head clearance). ✓ ANSI Metric; Show custom sizing (1), Through Hole Diameter (1) aanwezig; **WIJKT AF**: type-lijst Phlippo = ISO/DIN-schroeven, geen \"Hex Bolt – ANSI B18.2.3.5M\".\n- [0037] Hole Wizard **Dowel Holes**: Size \"Ø1.0\", Fit \"Nominal\", custom 43.000mm, \"Restore Default Values\". ✓ Dowel (3), Restore Default Values (1); **ONTBREEKT**: Fit-waarde \"Nominal\" (Phlippo: Close/Normal/Loose).\n- [0039] **Hole Position** tab: gele instructie \"Use the dimensions and other sketch tools to position the hole or slot. Click on the 'Type' tab…\"; gele cirkel-preview; status \"Under Defined | Editing\". ✓ Positions-tab; instructietekst niet geverifieerd.\n- [0041] Key slot: Line Properties \"Horizontal3\", Parameters 16.00 / 0.00°; overlay \"SHIFT+CLICK for DIMENSION TANGENCY\"; status \"Distance: 4.05mm dX: 0mm dY: -4.05mm dZ: 0mm Total Length: 151.09mm\". **ONTBREEKT**: statusbar Distance/dX/dY/dZ/Total Length (0 in StatusBar); Shift+klik maat-tangency niet geverifieerd.\n- [0041, contact] **Mass Properties** dialoog: \"Include hidden bodies/components\" ✓, \"Create Center of Mass feature\", \"Show weld bead mass\", \"Report coordinate values relative to: -- default --\", tekstblok Density/Mass/Volume/Surface area/Center of mass/Principal axes & moments (Ix,Iy,Iz,Px,Py,Pz)/Moments of inertia (Lxx…), knoppen Override Mass Properties / Recalculate. ✓ alle labels (2 hits elk). \n- Delete Face (titel): ✓ 10 hits.\n\n## 16 Sheet Metal Jog Tool, Edge Flange, Base Flange Tab\n- [0011/0013] **Base Flange** PM: \"Sheet Metal Parameters From Material\" ▸ \"Use material sheet metal parameters\" ☐; Direction 1: Blind 10.00mm → **Mid Plane** 60.00mm; Direction 2 ☐; \"Sheet Metal Gauges\" ▸ Use gauge table ☐; \"Sheet Metal Parameters\" T 3.00mm, \"Reverse direction\" ☐, bend radius 3.00mm; \"Bend Allowance\" K-Factor. ✓ allemaal.\n- [0019] **Edge-Flange** PM: Flange Parameters Edge<1>, \"Edit Flange Profile\", \"Use default radius\" ✓, radius 3.00 / gap 1.00 (disabled); Angle 90.00deg + slotje, vlakselectie, radio Perpendicular to face / Parallel to face; Flange Length Blind 32.00mm, 3 meetknoppen (outer/inner/bend-out); Flange Position 5 knoppen. ✓ (PropertyManager 1387–1438).\n- [0025] Modify-dialoog \"D1@Sketch7\" 17.00mm + Profile Sketch dialoog \"The sketch is valid.\" / Back / Finish / Cancel / Help. ✓ Modify, Profile Sketch (8); **ONTBREEKT**: tekst \"The sketch is valid\" (0).\n- [0031] Fillet (sheet metal): Edge<1>, Edge<2>, Radius 9.00mm; callout \"Radius: 9mm\"; \"Show selection toolbar\", Symmetric, Multi Radius Fillet, Profile Circular, Setback Parameters. ✓.\n- [0037] **Cut-Extrude** (sheet metal) Blind 10.00mm: \"Link to thickness\", \"Flip side to cut\", **\"Normal cut\"** ✓, \"Optimize Geometry\" ☐. **ONTBREEKT**: Normal cut (0), Link to thickness (0), Optimize Geometry (0).\n- [0045] Vergroot Sketch-lint: Exit Sketch, Smart Dimension, Line/Rect/Slot/Circle/Arc/Polygon/Spline/Ellipse/Fillet/Plane/Text, Trim/Convert/Offset Entities, \"Offset On Surface\"; tabs Features | Sketch | Surfaces | Sheet Metal | Evaluate | SOLIDWORKS Add-Ins. ✓ (Offset On Surface niet geverifieerd).\n- [0051/0055/0059] **Jog** PM: Selections ▸ Fixed Face \"Face<1>\", Use default radius ✓, 3.00mm; Jog Offset: Blind 20.00mm → **Up To Surface** \"Face<2>\", \"Dimension position\" 3 knoppen, \"Fix projected length\" ✓; Jog Position 4 knoppen; Jog Angle 60.00deg → 61.00deg; \"Custom Bend Allowance\" ☐. ✓ secties; **ONTBREEKT**: label \"Dimension position\" (0) – knoppenrij mogelijk zonder label.\n- [0063] **Mirror** PM: Mirror Face/Plane, Features to Mirror, Faces to Mirror, Bodies to Mirror, Options: Geometry Pattern ☐ / Propagate visual properties ✓ / Full preview / Partial preview ●. ✓.\n- Sheet Metal lint: Base Flange/Tab, Convert to Sheet Metal, Lofted-Bend, Edge Flange, Miter Flange, Hem, Jog, Sketched Bend, Cross-Break, Swept Flange, Corners, Forming Tool, Sheet Metal Gusset, Tab and Slot, Vent, Extruded Cut, Simple Hole, Normal Cut, Unfold, Fold, No Bends, Insert Bends, Rip, Flatten. **ONTBREEKT**: Swept Flange, Forming Tool, Sheet Metal Gusset, Tab and Slot, Simple Hole, Insert Bends (alle 0).\n\n## 17 Rocket – live solve (IPS, candy stripe)\n- [0037] S-key sketchbar; maten .125, R.125, 2.250 (inch); boom \"1060 Alloy\"; status \"IPS\". ✓.\n- [0039] **Revolve** PM: Axis of Revolution (leeg), Direction1 Blind 360.00deg, Direction2, Thin Feature, **Selected Contours** \"Sketch1-Region<1>\", \"Sketch1-Region<2>\" (gedeelde schets). ✓.\n- [0041] Boss-Extrude depth-tooltip \"Depth\" op veld, 0.125in, Merge result, Selected Contours Region<1>/<2>. ✓.\n- [0043] Boom: Revolve1 ▸ Sketch1 (gedeelde schets onder feature), Boss-Extrude1, CirPattern1. ✓.\n- [0047/0055] Line Properties met Message-balk; grafisch label met maat tijdens tekenen; \"Fully Defined\". ✓.\n- [0059] **Split Line** PM: Type of Split ○Silhouette ●Projection ○Intersection; Selections \"Current Sketch\" + vlakkenbox; \"Single direction\" ☐, \"Reverse direction\". ✓ (regel 1237–1275).\n- [0063] **Surface-Sweep** PM (Surfaces-tab): Profile and Path, Sketch5/Sketch4; Options: Profile orientation \"Follow Path\", Profile Twist \"Specify Twist Value\", Twist control \"Revolutions\", Direction 1 = 4, Merge tangent faces, Show preview; Curvature Display. ✓ Surface-Sweep (2); **ONTBREEKT**: Profile orientation, Follow Path, Profile Twist, Specify Twist Value, Twist control, Merge tangent faces (alle 0).\n- [0065] Split Line **Intersection**: Face<1>, Face<2>; \"Surface Split Options\": Split all ☐, ●Natural ○Linear. **ONTBREEKT**: Surface Split Options / Split all / Natural / Linear (0).\n- [0067] Surfaces-lint: Extruded/Revolved/Swept/Lofted/Boundary/Filled Surface, Freeform, Planar Surface, Offset Surface, Ruled Surface, Surface Flatten, Fillet, Delete Face, Replace Face, Delete Hole, Extend Surface, Trim Surface, Untrim Surface, Knit Surface, Thicken, Thickened Cut, Cut With Surface. Boom: Surface Bodies(2): Surface-Sweep1, Body-Move/Copy1; \"Mass1(2.28211174 lb)\". **ONTBREEKT**: Freeform, Surface Flatten, Replace Face, Delete Hole, Extend Surface, Untrim Surface, Thickened Cut, Cut With Surface, Body-Move/Copy (alle 0).\n- [0069] **Delete/Keep Body** PM: Type ●Delete Bodies ○Keep Bodies; \"Bodies to delete\": Surface-Sweep1, Body-Move/Copy1. **ONTBREEKT** (0).\n- [0071] Boom: Split Line2, Body-Delete/Keep1, uiterlijk per vlak (rood/wit/blauw). ✓ appearance dialoog aanwezig.\n\n## 18 Linear Pattern + Vary Sketch\n- [0013] **Offset Entities** PM: 10.00mm, Add dimensions, Reverse ✓, Select chain, Bi-directional, Cap ends (Arcs/Lines), Construction geometry: Base geometry / Offset geometry. ✓ alle labels.\n- [0015/0017] **Linear Pattern** PM: Direction 1 Edge<1>, ●Spacing and instances ○Up to reference, 14.00mm, 6; Direction 2; Features and Faces \"Cut-Extrude2\"; Bodies; Instances to Skip; Options: **Vary sketch** (disabled tot richting gekozen), Geometry pattern, Propagate visual properties, Full/Partial preview; Instances to Vary; callout \"Direction 1 Spacing/Instances\". ✓ (regel 1848–1933).\n- [0019] Uitvergroot Options; \"Vary sketch\" grijs. ✓\n- [0029/0031] Arc PM (3-punt) met 8 parameters; Dimension 175.00mm \"D4@Sketch1\". ✓\n- [0035] **Sweep** \"Circular Profile\" ● met diameter 4.00mm, Path(Sketch1)-callout, Thin Feature disabled. **ONTBREEKT**: Circular Profile.\n- [0039] **Plane** PM: Message \"Fully defined\", First Reference Front Plane: Parallel/Perpendicular/Coincident/90deg/22.0568…mm, \"Flip offset\" ✓, aantal 1, Mid Plane. ✓.\n- [0043] Boom met map \"UPPER WIRE\" (folder) met 2 schetsen; \"Plane1\", \"(-) Sketch6\". ✓ folders (verondersteld); \n- [0047] Properties PM punt: \"Arc2@UPPER WIRE SWEEP PATH / Point10\", PiercePoint6, Fully Defined. ✓\n- [0059] Boom: Sweep2, LPattern1, Mass1(129.017514 g). ✓\n\n## 19 Configuration Tables – Weight Plates\n(Frames 0049–0067: Configurations-tab, \"Modify Configurations\"-tabel, ConfigurationManager, Design Table). Niet opnieuw per label gegrept; `configureDialog.tsx` aanwezig → **globaal ✓**, detail-parity niet geverifieerd in deze pass.\n\n## 20 Fitting – live solve\n- [0017–0028] Standaard Extrude/Revolve/Fillet/Hole Wizard-PMs zoals boven; geen nieuwe labels buiten lijst. ✓.\n\n## 21 Sheet Metal – live solve (Model Monday)\n- [0023] Line Properties zonder relaties, Message-balk. ✓\n- [0025] Boom: Cut list(1), Sheet-Metal, Base-Flange1, Flat-Pattern (grijs). ✓ Cut list (2), Flat-Pattern (9).\n- [0026] Insert Line PM: Orientation ●As sketched / Horizontal / Vertical / Angle; Options For construction ✓ / Infinite length / Midpoint line / Add dimensions. **WIJKT AF**: \"Orientation\"-radio's (As sketched/Angle) en \"Midpoint line\" niet geverifieerd (geen grep-hit op \"Midpoint line\").\n- [0027/0028] Slot via S-bar; Dimension \"D4@Sketch7\" 30.00mm; \"Fully Defined\". ✓\n- [0029] Dimension 30.00° \"D2@Sketch8\". ✓\n- [0031] Boom: Break-Corner1, Cut-Extrude1/2. ✓ Break-Corner (5).\n- [0033] **Fillet** (Sheet Metal-lint actief): Edge<1>, Edge<2>, Show selection toolbar, Symmetric 10.00mm, Multi Radius Fillet, Profile Circular, Setback Parameters, **Partial Edge Parameters** (Edge<2>, Start condition, Distance Offset); callout \"Radius: 10.00000000mm\"; zwevende selectie-toolbar in grafisch gebied. ✓ Partial Edge Parameters (3).\n- [0035] **Circle** PM: Circle Type (center / perimeter), Existing Relations \"Diameter0\", Fully Defined, Add Relations Fix, Options For construction / Add dimensions / Diameter dimensions ✓, Parameters X 100.00 Y -30.00 R 5.00. ✓.\n\n## 22 Hole Wizard + Skip Instances\n- [0005/0006] **Hole Specification**: Standard \"ANSI Inch\", Type \"Binding Head Screw\", Size #00, Fit Normal, Show custom sizing 0.0550in/0.1250in/0.0280in; dan \"ANSI Metric\" / \"Hex Bolt - ANSI B18.2.3.5M\" M5 5.500/12.240/3.580mm; End Condition Through All. **ONTBREEKT**: standaard \"ANSI Inch\" (0); Type-lijst (Binding Head Screw, Hex Bolt…).\n- [0009] \"Pan Cross Head - ANSI B18.6.7M\" M10 8.000/15.000/6.000mm, \"Restore Default Values\". ✓ Restore Default Values.\n- [0010/0011] Positions-tab + Circle-tool: label \"Ø95\" met construction-cirkel; status \"Under Defined | Editing Sketch14\". ✓\n- [0012] Lint-dropdown Linear Pattern ▸ Linear Pattern, **Circular Pattern**, Mirror, Curve Driven Pattern, Sketch Driven Pattern, Table Driven Pattern, Fill Pattern, Variable Pattern; boom \"CBORE for M10 Pan Head Machine Screw1\", \"CBORE for M5 Hex Head Bolt1\", \"CirPattern1\". ✓ alle patroontypes; **WIJKT AF**: Hole-Wizard featurenaam \"CBORE for … Screw\" niet geverifieerd.\n- [0013–0015] **CirPattern** PM: Direction 1 Edge<1>, ○Instance spacing ●Equal spacing, 360.00deg, 8; Direction 2; Features and Faces \"CBORE for M10…\" met scroll ◀▶; Bodies; **Instances to Skip**: \"(D1, 6)\", \"(D1, 8)\"; Options Geometry pattern / Propagate visual properties / Full / Partial preview; Instances to Vary; callout \"Direction 1 Spacing: 360.0000deg Instances: 8\"; roze bolletjes op instanties; status \"Box/lasso – Toggles, Shift + box/lasso – Adds, Alt + box/lasso – Removes, selection from the list.\" ✓ alles; **WIJKT AF**: skip-notatie \"(D1, n)\" en Shift/Alt box-lasso-statustekst niet geverifieerd.\n\n## 23 Thin Feature, Revolve, Geometry Pattern\n- [0019/0020] **Boss-Extrude Thin**: Blind 10.00→28.00mm, Thin Feature \"One-Direction\" 10.00→3.00mm, \"Auto-fillet corners\" ☐; callout \"D2@Sketch1\". ✓ One-Direction (3), Auto-fillet corners (5).\n- [0024] Dimension + **Modify**-dialoog (D3@Sketch2 44.6709915mm, ✓ ✗ ↻ knoppen, schuifregelaar). ✓ Modify.\n- [0026] Boom: Solid Bodies(1), Extrude-Thin1, Sketch2. ✓ (\"Extrude-Thin\" naam niet geverifieerd).\n- [0027] Overlay \"RMB Right Mouse Button\" (view-rotatie). ✓\n- [0033] Boom met waarschuwingsdriehoek op \"CirPattern1\" (fout). ✓ (Confirmation/ fout-icon aanwezig, 14 hits).\n- [0035] **CirPattern** met **Geometry pattern ✓**, Features \"Revolve1, Cut-Extrude1, Cut-Extrude2\", Face<1> als as, 360deg / 3. ✓\n- [0036/0037] Fillet: 4 edges, Symmetric 7.00mm, callout \"Radius: 7.00000000mm\", groene bevestigingshoek rechtsboven. ✓\n- [0038] Sketch-overlay \"Click THIS ENDPOINT\" – maat-handle voor hoeklijnen (magic dimension handle: lengte+hoek-invoer bij lijn tekenen). ✓ (frame 0041 gedrag: dubbel label \"30 / 60\" tijdens tekenen).\n- [0042] Boom: Fillet1, Cut-Extrude3, Cut-Extrude4; RealView-schaduw. ✓\n\n## 24 Sheet Metal THRU BRACKET (SW 2020)\n- [0021] **Base Flange**: Use material sheet metal parameters ☐, Blind 42.00mm, Direction 2, Use gauge table, T 5.00mm \"Reverse direction\" ✓, radius 5.00, Bend Allowance K-Factor. ✓\n- [0023] S-key Sheet-Metal-bar + **\"Customize...\"** tooltip; boom Cut list(1), Sheet-Metal, Base-Flange1, Flat-Pattern. ✓ Customize (3).\n- [0025/0026] **Edge-Flange1**: Edge<1>, Edit Flange Profile, Use default radius ✓ 5.00/1.00, Angle 90→**45.00deg**, Perpendicular/Parallel to face, Flange Length Blind 48.00mm + 3 knoppen, Flange Position 5 knoppen, Trim side bends ✓, Offset ☐; status \"Length: 42mm\". ✓; **ONTBREEKT** statusbar \"Length:\" bij edge-hover.\n- [0029] Lint uitgebreid: Features | Sketch | Sheet Metal | Evaluate | TOBYS WORKFLOW | System | Weldments | Mold Tools | Mesh Modeling | Data Migration | Direct Editing | Markup | Evaluate | MBD Dimensions | Render Tools | SOLIDWORKS Add-Ins | Analysis Prepar…  **ONTBREEKT**: Mold Tools, Structure System, Mesh Modeling, Data Migration, Direct Editing, Markup, MBD Dimensions, Render Tools (0 hits; Weldments 1).\n- [0031] \"Normal Cut\"-resultaat (Cut-Extrude1 in boom). Zie 16: **ONTBREEKT** Normal cut.\n- [0033] Profile Sketch wizard \"The sketch is valid.\" Back/Finish/Cancel/Help + grijze Edge-Flange PM met \"Custom Bend Allowance\", \"Custom Relief Type\". ✓ secties; **ONTBREEKT** \"The sketch is valid\".\n- [0034] Breadcrumb in grafisch gebied \"Edge-Flange2 ▸ Sketch12\" + contextuele toolbar (8 iconen). ✓ breadcrumb (14/0029 vergelijkbaar) – niet geverifieerd voor features.\n- [0037] Line Properties met Message-balk; sketch op flens. ✓\n- [0039] **Cut-Extrude**: Through All, \"Flip side to cut\", **\"Normal cut\"** ☐, Draft outward; callout \"50\". **ONTBREEKT** Normal cut.\n- [0043] Circle PM: Add dimensions ☐ / Diameter dimensions ✓; tekening \"Ø12 THRU ⌀ SYM R10\". ✓\n\n## Samenvatting ONTBREEKT (0 hits in src)\nSketch/PM: \"Line Properties\"-titel, \"Additional Parameters\", \"Overdefining/Not Solved\"-filter, \"Delete All\", \"Entities\"-sectie in Display/Delete Relations, \"Set origin on curve\", \"The sketch is valid\", \"Midpoint line\"/\"Orientation\"-radio's (Insert Line).\nFeatures: Sweep **Circular Profile**, Sweep **Guide Curves**, Merge smooth faces, Start and End Tangency, Curvature Display (Mesh preview/Zebra stripes/Curvature combs), Profile orientation/Follow Path/Profile Twist/Specify Twist Value/Twist control/Merge tangent faces, Surface Split Options (Split all/Natural/Linear), **Delete/Keep Body**, Body-Move/Copy, Replace Face, Delete Hole, Extend/Untrim Surface, Surface Flatten, Thickened Cut, Cut With Surface, Freeform, Deform.\nSheet Metal: **Normal cut**, Link to thickness, Optimize Geometry, Swept Flange, Forming Tool, Sheet Metal Gusset, Tab and Slot, Simple Hole, Insert Bends, \"Dimension position\"-label (Jog).\nHole Wizard: standaard \"ANSI Inch\", Fit \"Nominal\", ANSI-schroeftypes (Hex Bolt B18.2.3.5M, Pan Cross Head B18.6.7M, Binding Head Screw).\nStatusbar: \"Length:\", \"Distance: dX dY dZ Total Length:\", \"Normal Distance:\", \"Diameter: … Center:\", \"Editing Sketch<n>\" (Phlippo toont \"Editing <sketchnaam>\" – ✓ equivalent).\nLint-tabs: Mold Tools, Structure System, Mesh Modeling, Data Migration, Direct Editing, Markup, MBD Dimensions, Render Tools, Statistics/Deviation Analysis/Symmetry Check/Compare Documents/Check Active Document (Evaluate).\n\n## WIJKT AF (aanwezig, maar anders)\n- Sweep-callouts \"Guide Curve(…)/Path(…)/Profile(…)\" ontbreken in grafisch gebied (14/0025).\n- Hole Wizard Type-lijst is ISO/DIN i.p.v. ANSI-schroeven; Fit zonder \"Nominal\" (15/0035, 22/0005).\n- Skip-instanties notatie \"(D1, n)\" en Shift/Alt-lasso statustekst niet geverifieerd (22/0015).\n- Relatie-tooltip \"Tangent(Arc1, Line2)\" en relatie-icoon indexcijfers niet geverifieerd (15/0017, 13/0008).\n- Featurenamen \"Extrude-Thin1\", \"CBORE for M10 Pan Head Machine Screw1\", \"Body-Delete/Keep1\", \"Surface-Sweep1\" niet geverifieerd.\n\nVideo 19 (configuraties) en 20 (fitting) bevatten geen labels buiten de hierboven gecontroleerde set; detail-parity voor Modify Configurations-tabel is niet in deze pass geverifieerd."}},"serverClassifierRequest":"694c98d5-24e5-4683-8636-ed7aa875231d","apiBlockIndex":1,"requestId":"req_011CgNsvriv9jEdD1QT1jBVk","requestRef":"ee5dd967-0dfd-40b6-a6f4-a03a2d0a27be","requestedModel":"claude-fable-5-1","attributionAgent":"general-purpose","type":"assistant","uuid":"2018b405-a21f-49f3-b16b-92a65740fa41","timestamp":"2026-10-25T11:32:30.069Z","advisorModel":"claude-fable-5-1","effort":"high","perTurnEffort":"high","userType":"external","entrypoint":"claude-desktop","cwd":"C:\\Users\\ianph\\OneDrive\\Bureaublad\\Phlippo CAD\\Claude","sessionId":"89d8d793-f0ea-4467-813d-a66f7610fca6","version":"2.1.308","gitBranch":"claude/fase1-schetser","slug":"typed-jumping-hickey"}, Inventaris video 25–37 (agent, 2026-10-25), Update 2026-10-21 — afgewerkte punten en nieuwe 1000%-controle, Vergelijking met de SOLIDWORKS-playlist (TooTallToby, 58 video's)

### Community 108 - "Phlippo CAD"
Cohesion: 0.29
Nodes (6): Phlippo CAD, Status 0.3.2 (2026-10-25), Status 0.3.3 (2026-10-25), Status 0.3.4 (2026-10-25), Status 0.3.5 (2026-10-26), Status 0.3.6 (2026-10-26)

### Community 109 - "gb.mjs"
Cohesion: 0.14
Nodes (11): amf, bodyRow, buf, dl, dl2, dl3, doc(), errors (+3 more)

### Community 112 - "QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)"
Cohesion: 0.20
Nodes (9): Gevonden tijdens het hertesten, Niet gedaan in deze ronde (met reden), Nieuwe bevindingen F53–F76, Oude bevindingen die deels, open of erger waren, QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25), Tests van deze ronde, ownUrl(), trusted() (+1 more)

### Community 113 - "motion.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

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

### Community 120 - "playwright"
Cohesion: 0.03
Nodes (44): errors, results, doc, logs, t0, logs, doc, [dir, first, last, prefix] (+36 more)

### Community 122 - "sweep.ts"
Cohesion: 0.21
Nodes (19): centroid(), pointInPolygon(), polyArea(), sketchRegions(), ccw(), sweptSurface(), capTriangles(), centroidOf() (+11 more)

### Community 124 - "examples.check.test.ts"
Cohesion: 0.28
Nodes (6): all, files(), isText(), literals(), files, walk()

### Community 125 - "viewlayout.mjs"
Cohesion: 0.12
Nodes (11): asm, aux, click(), errors, front, nl, nrm, results (+3 more)

### Community 126 - "stl.test.ts"
Cohesion: 0.70
Nodes (3): exportStl(), geometryFromPositions(), parseStl()

### Community 127 - "deform.test.ts"
Cohesion: 0.90
Nodes (3): falloff(), pointDeform, subdivideOnce()

### Community 128 - "persistence.ts"
Cohesion: 0.14
Nodes (27): Dataverlies (de GO-voorwaarden), AutosaveEntry, checkStructure(), clearAutosave(), DocumentFormatError, FILE_EXTENSION, FILE_VERSION, isBool() (+19 more)

### Community 129 - "preload.cjs"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, on(), electron

### Community 130 - "viewerExport.ts"
Cohesion: 0.47
Nodes (7): bodyTriangles(), esc(), safeColor(), scriptJson(), VIEWER_SCRIPT, ViewerBody, viewerHtml()

### Community 132 - "planes.ts"
Cohesion: 0.38
Nodes (10): cross(), dot(), norm(), planeOnFace(), referencePlane(), referencePlaneRaw(), rotate(), sub() (+2 more)

### Community 133 - "triad.mjs"
Cohesion: 0.29
Nodes (6): errors, pick(), pin, results, rozet, S()

### Community 134 - "ge.mjs"
Cohesion: 0.21
Nodes (9): errors, errs(), gDepth, names(), results, ripGap, S(), twoPlates() (+1 more)

### Community 136 - "addLine"
Cohesion: 0.12
Nodes (32): plate(), block(), pin(), plate(), fastenerPart(), plate(), plate(), plateDoc() (+24 more)

### Community 137 - "electronFuses"
Cohesion: 0.25
Nodes (8): electronFuses, enableCookieEncryption, enableEmbeddedAsarIntegrityValidation, enableNodeCliInspectArguments, enableNodeOptionsEnvironmentVariable, grantFileProtocolExtraPrivileges, onlyLoadAppFromAsar, runAsNode

### Community 138 - "Teamoordeel"
Cohesion: 0.29
Nodes (7): Ernstwijzigingen: wie stelde wat voor, MT5 Developer, Riki — Test- en CI-eerlijkheid, Risk — Risico en optimalisatie (GO-lijst, bestanden, IP), Strati — Strategie en product, Teamoordeel, Webi — Frontend, Electron en beveiliging

### Community 139 - "features.ts"
Cohesion: 0.06
Nodes (70): AssemblyKeys, assemblySlice(), DocumentKeys, documentSlice(), FeaturesKeys, featuresSlice(), sheetMetalSlice(), UiKeys (+62 more)

### Community 141 - "gd.mjs"
Cohesion: 0.26
Nodes (9): errors, errs(), nSurf(), results, run(), S(), surfArea(), undo() (+1 more)

### Community 142 - "ga1.mjs"
Cohesion: 0.24
Nodes (9): [a, b], clickAt(), errors, line, lines, proj(), results, S() (+1 more)

### Community 143 - "QA-rapport v0.3.4 verwerkt → 0.3.5 (2026-10-26)"
Cohesion: 0.25
Nodes (7): Gevonden tijdens het hertesten, Overige bevindingen, QA-rapport v0.3.4 verwerkt → 0.3.5 (2026-10-26), Resultaat van deze ronde, Rooktest van de geïnstalleerde app (GO-noot van Strati en Riki), Top 5 van het rapport, Werkwijze (nieuw)

### Community 144 - "MenuBar.tsx"
Cohesion: 0.07
Nodes (61): desktop(), DesktopFile, DesktopSaveResult, getDocumentHandle(), isDesktop(), setDocumentHandle(), ConfirmDeleteDialog(), LegacyOptionsDialog() (+53 more)

### Community 145 - "ga2.mjs"
Cohesion: 0.36
Nodes (6): block(), errors, errs(), results, S(), vol()

### Community 146 - "geometry.ts"
Cohesion: 0.09
Nodes (34): regionAt(), Contour, DSU, Edge, findContours(), polygonArea(), add(), distanceToEntity() (+26 more)

### Community 147 - "gf.mjs"
Cohesion: 0.25
Nodes (3): errors, res, results

### Community 148 - "featureTypes.ts"
Cohesion: 0.40
Nodes (4): typescript, ENTITY_POINT_FIELDS, ENTITY_SCALAR_FIELDS, FEATURE_TYPES

### Community 150 - "Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26)"
Cohesion: 0.22
Nodes (6): Nog open (buiten deze ronde), Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26), vite, @vitejs/plugin-react, manualChunks(), pkg

### Community 152 - "qa3.mjs"
Cohesion: 0.20
Nodes (5): depthField, errors, overlap, results, top

### Community 161 - "gg.mjs"
Cohesion: 0.32
Nodes (5): errors, pref(), results, S(), viewName()

### Community 162 - "check.mjs"
Cohesion: 0.05
Nodes (26): errors, results, errors, results, errors, mem(), openBlock(), { results, check } (+18 more)

### Community 163 - "dwgopts.mjs"
Cohesion: 0.33
Nodes (3): errors, part, results

## Knowledge Gaps
- **9 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `@types/three`, `concurrently` (+4 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1524 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `playwright` connect `playwright` to `triad.mjs`, `ge.mjs`, `drawopts.mjs`, `helix.mjs`, `gd.mjs`, `ga1.mjs`, `features2.mjs`, `desktop-delete.mjs`, `ga2.mjs`, `gf.mjs`, `sheetmetal.mjs`, `qa3.mjs`, `package.json`, `thread.mjs`, `features.mjs`, `gg.mjs`, `check.mjs`, `dwgopts.mjs`, `sketchtools2.mjs`, `explode.mjs`, `rect3.mjs`, `blockf.mjs`, `full.mjs`, `assembly.mjs`, `configurations.mjs`, `annotations.mjs`, `componentpattern.mjs`, `drawing.mjs`, `endconditions.mjs`, `fixes1.mjs`, `annotations2.mjs`, `annotations3.mjs`, `deletekey2.mjs`, `ellipsetext.mjs`, `multibody.mjs`, `rib.mjs`, `arcslot.mjs`, `asmcut.mjs`, `draftcheck.mjs`, `editcomponent.mjs`, `skip`, `hem.mjs`, `sketchtools.mjs`, `exitCode`, `thickness.mjs`, `deletekey.mjs`, `gj.mjs`, `surfaces.mjs`, `sketch3d.mjs`, `clickall.mjs`, `motion2.mjs`, `drawingfix.mjs`, `qa2.mjs`, `gh.mjs`, `qa1.mjs`, `gb.mjs`, `sheetmetal2.mjs`, `jogmiter.mjs`, `motion.mjs`, `filletopts.mjs`, `gi.mjs`, `drawing2.mjs`, `slot.mjs`, `wrap.mjs`, `viewlayout.mjs`?**
  _High betweenness centrality (0.162) - this node is a cross-community bridge._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _9 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.00861974904528096 - nodes in this community are weakly interconnected._
- **Why does `State` connect `State` to `persistence.ts`, `Id`, `Sketch`, `store.ts`, `useStore`, `features.ts`, `SketchPoint`, `Viewport.tsx`, `MenuBar.tsx`, `sketch.ts`, `configurations.ts`, `autoTolerance.ts`, `sheetmetal.ts`, `prefs.ts`, `annotations.ts`, `assembly/assembly.ts`, `Document`, `sheet.ts`, `History`, `QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)`?**
  _High betweenness centrality (0.141) - this node is a cross-community bridge._
- **Should `solid.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0773109243697479 - nodes in this community are weakly interconnected._
- **Why does `three` connect `solid.ts` to `viewerExport.ts`, `store.ts`, `useStore`, `bodyScene.ts`, `features.ts`, `ManagerPane.tsx`, `sheetmetal4.ts`, `Viewport.tsx`, `rebuildDocument`, `sketch.ts`, `geometry.ts`, `rebuild.ts`, `configurations.ts`, `package.json`, `autoTolerance.ts`, `sheetmetal.ts`, `sketchScene.ts`, `src/app/assemblyCommands.ts`, `App.tsx`, `resolvePlaneDef`, `round.ts`, `camera.ts`, `assembly/assembly.ts`, `thread.ts`, `sheet.ts`, `DraftAnalysisPM.tsx`, `Breadcrumbs.tsx`, `isRoundFeature`, `evaluateDialogs.tsx`, `export3d.ts`, `refgeom.ts`, `section.ts`, `sweep.ts`, `ao.ts`, `stl.test.ts`, `deform.test.ts`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Should `Id` be split into smaller, more focused modules?**
  _Cohesion score 0.023609163160355308 - nodes in this community are weakly interconnected._