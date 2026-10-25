# Graph Report - Claude  (2026-10-25)

## Corpus Check
- 356 files · ~535,665 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .kcad 8, .css 2, .cmd 2)

## Summary
- 2900 nodes · 8449 edges · 141 communities (109 shown, 32 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `efd4b491`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- State
- model.ts
- Id
- camera.ts
- Taken - Phlippo CAD
- solver.ts
- store.ts
- App.tsx
- useStore
- bodyScene.ts
- drawopts.mjs
- react
- Sketch
- SketchPoint
- PropertyManager.tsx
- Viewport.tsx
- ref_node_fs
- playwright
- configurations.ts
- edit.ts
- geometry.ts
- rebuild.ts
- Vergelijking met de video (lokale sessie, 2026-10-20)
- package.json
- blocks.ts
- tools.ts
- sheetmetal.ts
- features.mjs
- sweep.ts
- thread.ts
- DrawingView
- modelItems.ts
- assembly.ts
- Ribbon.tsx
- newId
- round.ts
- devDependencies
- regions.ts
- compilerOptions
- sketchtools2.mjs
- evaluate.tsx
- DrawingExtras.tsx
- rect3.mjs
- blockf.mjs
- Document
- full.mjs
- richTips.tsx
- assembly.mjs
- configurations.mjs
- build
- scripts
- csg
- Onderzoek: workflow en lay-out van moderne parametrische CAD
- annotations.mjs
- render.mjs
- analysis.ts
- History
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
- motion.ts
- sheet.ts
- MotionManager.tsx
- Vergelijking met de SOLIDWORKS-handleiding en aanpassingen
- arcslot.mjs
- asmcut.mjs
- draftcheck.mjs
- editcomponent.mjs
- explode.mjs
- hem.mjs
- sheetmetal.mjs
- sketchtools.mjs
- surfaces.mjs
- thickness.mjs
- DesktopApi
- corners.mjs
- deletekey.mjs
- helix.mjs
- section.mjs
- sketch3d.mjs
- unfoldfold.mjs
- uptobody.mjs
- dependencies
- drawingfix.mjs
- confirmdelete.mjs
- refgeom.ts
- relations.mjs
- sketchpattern.mjs
- qa2.mjs
- thread.mjs
- wrap.mjs
- Merken en auteursrecht: wat mag wel en niet lijken op het origineel
- qa1.mjs
- getPref
- jogmiter.mjs
- Lokaal werken met Claude Code (Windows)
- Vergelijking met de SOLIDWORKS-playlist (TooTallToby, 58 video's)
- tsconfig.json
- Phlippo CAD
- viewlayout.mjs
- .update
- electronFuses
- fasteners.ts
- keys.mjs
- filletopts.mjs
- motion.mjs
- drawing2.mjs
- section.ts
- misc7.mjs
- doorhandle.mjs
- clickall.mjs
- features2.mjs
- sheetmetal2.mjs
- slot.mjs
- faceappearance.mjs
- vite.config.ts
- ErrorBoundary
- instant3d.mjs
- SelectionItem
- preload.cjs
- asmoptions.mjs
- belt.ts
- triad.mjs
- DrawingSheet
- dialogopts.mjs
- motion2.mjs
- sectionopts.mjs
- _dbg.mjs
- dwgopts.mjs

## God Nodes (most connected - your core abstractions)
1. `State` - 327 edges
2. `Id` - 200 edges
3. `useStore` - 187 edges
4. `rebuildDocument()` - 125 edges
5. `playwright` - 110 edges
6. `addLine()` - 98 edges
7. `createSketch()` - 91 edges
8. `three` - 89 edges
9. `vitest` - 86 edges
10. `Viewport()` - 86 edges

## Surprising Connections (you probably didn't know these)
- `Helix and Spiral (video 17, candy stripe) (2026-10-21)` --references--> `helixPath()`  [INFERRED]
  docs/05-vergelijking-video.md → src/core/features/sweep.ts
- `Datamodel` --references--> `Sketch`  [INFERRED]
  docs/02-fase1-schetser.md → src/core/sketch/types.ts
- `Viewport` --references--> `CadCamera`  [INFERRED]
  docs/02-fase1-schetser.md → src/app/viewport/camera.ts
- `Invoer en robuustheid` --references--> `csg()`  [INFERRED]
  docs/08-qa-rapport.md → src/core/features/solid.ts
- `Configuraties (ConfigurationManager) (2026-10-21)` --references--> `configurations()`  [INFERRED]
  docs/05-vergelijking-video.md → src/core/document/configurations.ts

## Import Cycles
- 3-file cycle: `src/core/assembly/assembly.ts -> src/core/features/rebuild.ts -> src/core/features/smcorners.ts -> src/core/assembly/assembly.ts`

## Communities (141 total, 32 thin omitted)

### Community 1 - "model.ts"
Cohesion: 0.05
Nodes (84): three, vitest, plate(), TEST_HOOKS, block(), pin(), plate(), fastenerPart() (+76 more)

### Community 2 - "Id"
Cohesion: 0.03
Nodes (7): LibraryItem, GlyphDrawing, Circle2D, Block, Hit, Constraint, Id

### Community 3 - "camera.ts"
Cohesion: 0.07
Nodes (23): Architectuurschets, Bekende beperkingen (fase 1), Datamodel, Demo (± 2 minuten), Fase 1 — 2D-schetser met constraint-solver, Solver, Tests, UI-conventies (docs/01-research.md en docs/03-vergelijking-solidworks.md) (+15 more)

### Community 4 - "Taken - Phlippo CAD"
Cohesion: 0.03
Nodes (62): Configuraties (ConfigurationManager, video 19) (2026-10-21), Controle met de volledige playlist (58 video's, 15 u) — na de download, Curves ▸ Helix and Spiral (2026-10-21), Desktop-app (Electron) (2026-10-20, nacht), Eindcondities en sensors (video 40, 31) (2026-10-21), Extrude met Draft (video 29, LEG BASE) (2026-10-21), Fase 2: 3D-features op een solid-kern (2026-10-20), Fase 2b: Mirror, patronen, Hole Wizard, Shell, Sweep/Loft (2026-10-20, nacht) (+54 more)

### Community 5 - "solver.ts"
Cohesion: 0.12
Nodes (30): lineLength(), resetIds(), buildEquations(), circleLike(), entityOf(), Equation, EquationBuildError, linePts() (+22 more)

### Community 6 - "store.ts"
Cohesion: 0.03
Nodes (105): AskOptions, AsmTool, ConfigEdit, COUPLING_MATES, DEFAULT_DECAL, DialogId, DockSide, DRAW_TOOLS (+97 more)

### Community 7 - "App.tsx"
Cohesion: 0.08
Nodes (61): App(), AppearanceDialog(), downloadText(), InterferenceDialog(), desktop(), DesktopFile, DesktopSaveResult, getDocumentPath() (+53 more)

### Community 8 - "useStore"
Cohesion: 0.15
Nodes (48): AltPositionPM(), AuxViewPM(), BalloonLayoutIcon(), BrokenOutPM(), ConfigSelect(), DetailViewPM(), DrawingDimensionPM(), DrawingViewPM() (+40 more)

### Community 9 - "bodyScene.ts"
Cohesion: 0.10
Nodes (21): Beveiliging (Electron), Invoer en robuustheid, Prestaties en kwaliteit, QA-rapport (extern, 24-10-2026) en wat ermee gebeurde, Tests en proces, Uiterlijk en gebruik, DisplayStyle, BodyEntry (+13 more)

### Community 10 - "drawopts.mjs"
Cohesion: 0.13
Nodes (14): afront, asmDrw, det2, dim, dimAfter, dimEl, drw, errors (+6 more)

### Community 11 - "react"
Cohesion: 0.08
Nodes (39): react, SWATCHES, AssemblyTreeBody(), MATE_ICON, ConfigurationManagerBody(), DrawingTreeBody(), featureIcon(), FeatureTreeBody() (+31 more)

### Community 12 - "Sketch"
Cohesion: 0.14
Nodes (15): PlaneId, OverlayProps, PreviewItem, SceneColors, SceneInput, ToolContext, ToolRender, Sketch (+7 more)

### Community 13 - "SketchPoint"
Cohesion: 0.18
Nodes (6): ToolId, arcPoly(), slotGeometry(), ToolController, dist(), SketchPoint

### Community 14 - "PropertyManager.tsx"
Cohesion: 0.10
Nodes (37): APPLY_TOOLS, DetailedPreviewButton(), dimFavs(), Header(), HOLE_SIZES, HOLE_TYPES, holeSubtypePatch(), HoleTypeIcon() (+29 more)

### Community 15 - "Viewport.tsx"
Cohesion: 0.09
Nodes (39): isCommandActive(), CadGTAOPass, renderWithAO(), Breadcrumbs(), getPlane(), planeLabel(), sketchToWorld(), ExtrudeHandle() (+31 more)

### Community 16 - "ref_node_fs"
Cohesion: 0.04
Nodes (29): asm, errors, results, [dir, first, last, prefix], b64, [inp, out, x, y, w, h, sc = '3'], doc, logs (+21 more)

### Community 17 - "playwright"
Cohesion: 0.04
Nodes (23): b64, [file, x, y, w, h, out], logs, logs, doc, errors, results, errors (+15 more)

### Community 18 - "configurations.ts"
Cohesion: 0.09
Nodes (48): Configuraties (ConfigurationManager) (2026-10-21), BomDialog(), fmt(), ModifyConfigurationsDialog(), DesignStudyDialog(), evaluate(), Output, EquationsDialog() (+40 more)

### Community 19 - "edit.ts"
Cohesion: 0.10
Nodes (46): addPiece(), arcAngles(), chainOf(), circularSketchPattern(), circumcentre(), convertPolylines(), copyEntities(), cornerTrim() (+38 more)

### Community 20 - "geometry.ts"
Cohesion: 0.10
Nodes (32): regionAt(), Contour, DSU, Edge, findContours(), polygonArea(), add(), distanceToEntity() (+24 more)

### Community 21 - "rebuild.ts"
Cohesion: 0.09
Nodes (61): deleteFaces(), V3, toSketch(), MAX_PATTERN_INSTANCES, mirrorGeometry(), patternInstances(), rotatedAbout(), translated() (+53 more)

### Community 22 - "Vergelijking met de video (lokale sessie, 2026-10-20)"
Cohesion: 0.08
Nodes (23): Doorgevoerd in de lokale sessie (2026-10-20, avond), Eindcondities Up To Next / Up To Surface / Offset From Surface (video 40) (2026-10-21), Evaluate en bestanden (2026-10-20, nacht), Fase 2 (2026-10-20, avond): 3D-features, Fase 3: Equations en Global Variables (2026-10-20, nacht), Fase 4: Assemblies (2026-10-20, nacht), Fase 5: Tekeningen (2026-10-21, nacht), Functionele fouten gezien tijdens het vastleggen (+15 more)

### Community 23 - "package.json"
Cohesion: 0.10
Nodes (20): author, description, main, name, private, type, version, concurrently (+12 more)

### Community 24 - "blocks.ts"
Cohesion: 0.25
Nodes (11): extractBlock(), insertBlock(), entityPoints(), entityScalars(), ownerOfPoint(), removeEntity(), findSketchProblems(), repair() (+3 more)

### Community 25 - "tools.ts"
Cohesion: 0.16
Nodes (25): contourCache, PointerInfo, slotOutline(), copyEntitiesKeep(), fullyDefineSketch(), addArc(), addConic(), addConstraint() (+17 more)

### Community 26 - "sheetmetal.ts"
Cohesion: 0.11
Nodes (30): base, P, vol(), baseFlangeGeometry(), baseFlangeRegion(), bendAllowance(), bendTableK(), cross() (+22 more)

### Community 27 - "features.mjs"
Cohesion: 0.09
Nodes (14): arrowInput, boxTris, c2, drift, eqInputs, errors, faces, mv (+6 more)

### Community 28 - "sweep.ts"
Cohesion: 0.25
Nodes (17): polyArea(), ccw(), dedupe(), taperedExtrude(), capTriangles(), centroidOf(), finish(), frameOf() (+9 more)

### Community 29 - "thread.ts"
Cohesion: 0.18
Nodes (15): three-mesh-bvh, flipWinding(), revolveAxis(), revolveGeometry(), helixRings(), METRIC_THREADS, nearestThread(), threadPreviewCurves() (+7 more)

### Community 30 - "DrawingView"
Cohesion: 0.20
Nodes (5): DrawingEdit, DrawingDimension, DrawingSymbol, DrawingView, DrawingViewType

### Community 31 - "modelItems.ts"
Cohesion: 0.17
Nodes (21): modelItems(), ModelItemsOptions, near(), offsetLabel(), ORTHO, lengthDecimals(), dimensionDrawing, dimensionDrawingBase() (+13 more)

### Community 32 - "assembly.ts"
Cohesion: 0.12
Nodes (23): AssemblyRebuild, cylinderAxis(), flipWinding(), handMatrix(), leastSquares(), matrixToTransform(), mergedCache, partCache (+15 more)

### Community 33 - "Ribbon.tsx"
Cohesion: 0.20
Nodes (19): startEmptyView(), LifecycleTab(), AnnotationTab(), SheetFormatTab(), ViewLayoutTab(), ASSEMBLY_TABS, BigButton(), BigProps (+11 more)

### Community 34 - "newId"
Cohesion: 0.13
Nodes (33): Dataverlies (de GO-voorwaarden), addComment(), comps(), copyWithMates(), insertNewAssembly(), insertNewPart(), makeMultibodyPart(), mirrorComponents() (+25 more)

### Community 35 - "round.ts"
Cohesion: 0.09
Nodes (40): faceOf(), loopOf(), Pick, SelectionToolbar(), componentBody(), rebuildAssembly(), isRoundFeature(), bodyEdges() (+32 more)

### Community 36 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, concurrently, cross-env, electron, electron-builder, jsdom, playwright, @types/node (+8 more)

### Community 37 - "regions.ts"
Cohesion: 0.13
Nodes (25): PlaneDef, CreaseSegment, centroid(), pointInPolygon(), Region, sketchRegions(), extendEnd(), midpoint() (+17 more)

### Community 38 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 39 - "sketchtools2.mjs"
Cohesion: 0.16
Nodes (11): click(), count(), errors, fly(), hd, K(), P(), pc (+3 more)

### Community 40 - "evaluate.tsx"
Cohesion: 0.13
Nodes (23): fmt(), LEN_UNITS, loadMassOpts(), MASS_UNITS, MassOpts, MassPropertiesDialog(), MeasureLine, measureLines() (+15 more)

### Community 41 - "DrawingExtras.tsx"
Cohesion: 0.33
Nodes (12): DRAWING_BLOCKS, drawingToolClick(), Frame(), GeneralTableDialog(), insertBlock(), insertModelInView(), LinearNotePatternDialog(), RelativeViewDialog() (+4 more)

### Community 42 - "rect3.mjs"
Cohesion: 0.15
Nodes (10): clicks(), errors, fourth, lens, nr, P(), results, solid (+2 more)

### Community 43 - "blockf.mjs"
Cohesion: 0.40
Nodes (4): errors, results, S(), vol()

### Community 44 - "Document"
Cohesion: 0.13
Nodes (10): InsertGhost, Configuration, Equation, Document, DeleteDependents, featureDependents(), geometricChildren(), Id (+2 more)

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
Cohesion: 0.15
Nodes (13): build, appId, asar, directories, fileAssociations, files, portable, productName (+5 more)

### Community 50 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, ci, desktop, desktop:build, desktop:start, dev, e2e (+6 more)

### Community 51 - "csg"
Cohesion: 0.24
Nodes (14): jogOnBody(), positionShift(), sketchedBendOnBody(), channel(), applyShell(), applyShellFromHistory(), applyShellOutward(), BuildHistory (+6 more)

### Community 52 - "Onderzoek: workflow en lay-out van moderne parametrische CAD"
Cohesion: 0.18
Nodes (10): 1. Globale schermindeling (alle drie de pakketten komen overeen), 2. Sketch-workflow, 3. Constraint-solver, 4. Navigatie en sneltoetsen (conventies), 5. Feature-modelleren (fase 2, ter voorbereiding), 6. UI-componenten, 7. Bronnen, Dimensies (+2 more)

### Community 53 - "annotations.mjs"
Cohesion: 0.18
Nodes (7): asm, errors, front, items, results, tek, toPx()

### Community 54 - "render.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

### Community 55 - "analysis.ts"
Cohesion: 0.22
Nodes (17): AnalysisHead(), ThicknessAnalysisPM(), bvhCache, bvhOf(), curvatureAnalysis(), curvatureColor(), DRAFT_COLORS, draftAnalysis() (+9 more)

### Community 57 - "compilerOptions"
Cohesion: 0.18
Nodes (10): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+2 more)

### Community 58 - "componentpattern.mjs"
Cohesion: 0.20
Nodes (6): circ, errors, pin, radii, results, xs

### Community 59 - "drawing.mjs"
Cohesion: 0.20
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
Cohesion: 0.16
Nodes (9): { app, BrowserWindow, ipcMain, dialog, shell, session }, APP_INDEX, createWindow(), fs, knownPaths, path, pendingOpen, readForOpen() (+1 more)

### Community 69 - "nsis"
Cohesion: 0.22
Nodes (9): nsis, allowToChangeInstallationDirectory, artifactName, createDesktopShortcut, createStartMenuShortcut, oneClick, perMachine, runAfterFinish (+1 more)

### Community 70 - "motion.ts"
Cohesion: 0.15
Nodes (19): componentMatrix(), localRef(), assemblyHoles(), Id, modelCentre(), MotionKey, MotionSim, MotionSpring (+11 more)

### Community 71 - "sheet.ts"
Cohesion: 0.06
Nodes (64): arrow(), arrowHead(), directionFrom(), DrawingSheetView(), newSymbolId(), orientationFor(), PAPER, sheetToViewLocal() (+56 more)

### Community 72 - "MotionManager.tsx"
Cohesion: 0.23
Nodes (9): EMPTY, MotionManager(), MotionPlot(), recordAnimation(), keyedPose(), MotionStudy, Motor, motorValue() (+1 more)

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

### Community 81 - "sketchtools.mjs"
Cohesion: 0.29
Nodes (4): count(), errors, K(), results

### Community 83 - "thickness.mjs"
Cohesion: 0.25
Nodes (5): errors, kruk, nums, results, thin

### Community 86 - "deletekey.mjs"
Cohesion: 0.33
Nodes (6): alive(), asm, check(), errors, results, tek

### Community 91 - "uptobody.mjs"
Cohesion: 0.29
Nodes (3): blk, errors, results

### Community 92 - "dependencies"
Cohesion: 0.29
Nodes (7): dependencies, react, react-dom, three, three-bvh-csg, three-mesh-bvh, zustand

### Community 93 - "drawingfix.mjs"
Cohesion: 0.11
Nodes (17): asm, b0b, b0c, balloonCheck(), bc, clearTb, clickAt(), crosses() (+9 more)

### Community 94 - "confirmdelete.mjs"
Cohesion: 0.33
Nodes (3): doc, errors, results

### Community 95 - "refgeom.ts"
Cohesion: 0.29
Nodes (11): RefGeometry, BodyEdge, axisCandidate(), pointCandidate(), refGeometryFrom(), refGeometryLines(), RefSelection, T() (+3 more)

### Community 98 - "qa2.mjs"
Cohesion: 0.32
Nodes (6): depthField, errors, lastMsg(), plate(), results, S()

### Community 101 - "Merken en auteursrecht: wat mag wel en niet lijken op het origineel"
Cohesion: 0.40
Nodes (4): Merken en auteursrecht: wat mag wel en niet lijken op het origineel, Praktische regels voor dit project, Wat in Europa vrij is om na te maken, Wat wél beschermd is en vermeden moet worden

### Community 102 - "qa1.mjs"
Cohesion: 0.38
Nodes (5): errors, mem(), results, S(), st()

### Community 103 - "getPref"
Cohesion: 0.08
Nodes (44): PrefCheck(), fmtNum(), loadCustom(), MaterialDialog(), saveCustom(), STRESS, TABS, ColorList() (+36 more)

### Community 105 - "Lokaal werken met Claude Code (Windows)"
Cohesion: 0.50
Nodes (3): Desktop-app (2026-10-20), Geïnstalleerde app (2026-10-21), Lokaal werken met Claude Code (Windows)

### Community 109 - "viewlayout.mjs"
Cohesion: 0.12
Nodes (11): asm, aux, click(), errors, front, nl, nrm, results (+3 more)

### Community 111 - "electronFuses"
Cohesion: 0.29
Nodes (7): electronFuses, enableCookieEncryption, enableEmbeddedAsarIntegrityValidation, enableNodeCliInspectArguments, enableNodeOptionsEnvironmentVariable, onlyLoadAppFromAsar, runAsNode

### Community 112 - "fasteners.ts"
Cohesion: 0.26
Nodes (10): AsmHole, FASTENER_NAMES, FastenerSlot, fastenerSlots(), FastenerType, Id, LENGTHS, METRIC (+2 more)

### Community 113 - "keys.mjs"
Cohesion: 0.29
Nodes (6): check(), errs, keys, part, results, run()

### Community 114 - "filletopts.mjs"
Cohesion: 0.20
Nodes (5): errors, pickTopEdges(), results, topLongEdges(), undo()

### Community 115 - "motion.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

### Community 116 - "drawing2.mjs"
Cohesion: 0.22
Nodes (7): clickSheet(), errors, P(), painted, results, [srcNote, dstNote], tek

### Community 117 - "section.ts"
Cohesion: 0.23
Nodes (13): SectionView, ReferencePlaneId, capTriangles(), clipPoly(), clipPolyAll(), Cut, dist(), Half (+5 more)

### Community 118 - "misc7.mjs"
Cohesion: 0.22
Nodes (6): asm, errors, lassoItem, pts, results, so

### Community 119 - "doorhandle.mjs"
Cohesion: 0.25
Nodes (3): errors, results, tree

### Community 120 - "clickall.mjs"
Cohesion: 0.29
Nodes (3): docs, errs, report

### Community 126 - "vite.config.ts"
Cohesion: 0.40
Nodes (3): vite, @vitejs/plugin-react, pkg

### Community 130 - "preload.cjs"
Cohesion: 0.50
Nodes (3): { contextBridge, ipcRenderer }, on(), electron

### Community 131 - "asmoptions.mjs"
Cohesion: 0.22
Nodes (3): errors, pin, results

### Community 133 - "triad.mjs"
Cohesion: 0.29
Nodes (6): errors, pick(), pin, results, rozet, S()

### Community 136 - "dialogopts.mjs"
Cohesion: 0.29
Nodes (4): errors, mid, part, results

### Community 137 - "motion2.mjs"
Cohesion: 0.29
Nodes (4): errors, pin, results, rozet

### Community 138 - "sectionopts.mjs"
Cohesion: 0.29
Nodes (3): errors, part, results

### Community 139 - "_dbg.mjs"
Cohesion: 0.33
Nodes (3): errors, part, results

### Community 140 - "dwgopts.mjs"
Cohesion: 0.33
Nodes (3): errors, part, results

## Knowledge Gaps
- **10 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `@types/three`, `concurrently` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1232 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `playwright` connect `playwright` to `instant3d.mjs`, `asmoptions.mjs`, `triad.mjs`, `dialogopts.mjs`, `motion2.mjs`, `drawopts.mjs`, `_dbg.mjs`, `dwgopts.mjs`, `sectionopts.mjs`, `ref_node_fs`, `package.json`, `features.mjs`, `sketchtools2.mjs`, `rect3.mjs`, `blockf.mjs`, `full.mjs`, `assembly.mjs`, `configurations.mjs`, `annotations.mjs`, `render.mjs`, `componentpattern.mjs`, `drawing.mjs`, `endconditions.mjs`, `fixes1.mjs`, `annotations2.mjs`, `annotations3.mjs`, `deletekey2.mjs`, `ellipsetext.mjs`, `multibody.mjs`, `rib.mjs`, `arcslot.mjs`, `asmcut.mjs`, `draftcheck.mjs`, `editcomponent.mjs`, `explode.mjs`, `hem.mjs`, `sheetmetal.mjs`, `sketchtools.mjs`, `surfaces.mjs`, `thickness.mjs`, `corners.mjs`, `deletekey.mjs`, `helix.mjs`, `section.mjs`, `sketch3d.mjs`, `unfoldfold.mjs`, `uptobody.mjs`, `drawingfix.mjs`, `confirmdelete.mjs`, `relations.mjs`, `sketchpattern.mjs`, `qa2.mjs`, `thread.mjs`, `wrap.mjs`, `qa1.mjs`, `jogmiter.mjs`, `viewlayout.mjs`, `keys.mjs`, `filletopts.mjs`, `motion.mjs`, `drawing2.mjs`, `misc7.mjs`, `doorhandle.mjs`, `clickall.mjs`, `features2.mjs`, `sheetmetal2.mjs`, `slot.mjs`, `faceappearance.mjs`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.009569377990430622 - nodes in this community are weakly interconnected._
- **Why does `State` connect `State` to `assembly.ts`, `SelectionItem`, `Id`, `newId`, `store.ts`, `getPref`, `App.tsx`, `sheet.ts`, `evaluate.tsx`, `DrawingSheet`, `Document`, `Sketch`, `useStore`, `Viewport.tsx`, `SketchPoint`, `sheetmetal.ts`, `DrawingView`, `refgeom.ts`?**
  _High betweenness centrality (0.132) - this node is a cross-community bridge._
- **Should `model.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.051770719240598756 - nodes in this community are weakly interconnected._
- **Why does `three` connect `model.ts` to `camera.ts`, `belt.ts`, `store.ts`, `App.tsx`, `bodyScene.ts`, `react`, `Sketch`, `Viewport.tsx`, `geometry.ts`, `rebuild.ts`, `package.json`, `sheetmetal.ts`, `sweep.ts`, `thread.ts`, `modelItems.ts`, `assembly.ts`, `newId`, `round.ts`, `regions.ts`, `evaluate.tsx`, `csg`, `analysis.ts`, `motion.ts`, `sheet.ts`, `MotionManager.tsx`, `refgeom.ts`, `fasteners.ts`, `section.ts`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Should `Id` be split into smaller, more focused modules?**
  _Cohesion score 0.025565677343520422 - nodes in this community are weakly interconnected._