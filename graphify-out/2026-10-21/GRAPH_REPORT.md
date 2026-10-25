# Graph Report - Claude  (2026-10-21)

## Corpus Check
- 277 files · ~436,764 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .kcad 8, .css 2, .cmd 2)

## Summary
- 2419 nodes · 7009 edges · 130 communities (103 shown, 27 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `efd4b491`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- State
- model.ts
- Id
- CadCamera
- Taken - Phlippo CAD
- solver.ts
- store.ts
- App.tsx
- useStore
- document/types.ts
- configurations.ts
- icons.tsx
- regions.ts
- SketchPoint
- components.tsx
- Viewport.tsx
- ref_node_fs
- playwright
- hlr.ts
- edit.ts
- geometry.ts
- rebuild.ts
- Vergelijking met de video (lokale sessie, 2026-10-20)
- package.json
- MenuBar.tsx
- Sketch
- sheetmetal.ts
- features.mjs
- bodyScene.ts
- csg
- DrawingSheetView.tsx
- modelItems.ts
- assembly.ts
- newId
- sketch/types.ts
- round.ts
- devDependencies
- sweep.ts
- compilerOptions
- sketchtools2.mjs
- prefs.ts
- dependents.ts
- rect3.mjs
- evaluate.tsx
- Document
- full.mjs
- motion.ts
- assembly.mjs
- configurations.mjs
- build
- scripts
- solid.ts
- Onderzoek: workflow en lay-out van moderne parametrische CAD
- annotations.mjs
- tools.ts
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
- DesktopApi
- sheet.ts
- patterns2.ts
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
- fasteners.ts
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
- jogmiter.mjs
- motion.mjs
- blocks.ts
- slot.mjs
- thread.mjs
- wrap.mjs
- Merken en auteursrecht: wat mag wel en niet lijken op het origineel
- planes.ts
- relations.mjs
- ErrorBoundary
- Lokaal werken met Claude Code (Windows)
- Vergelijking met de SOLIDWORKS-playlist (TooTallToby, 58 video's)
- tsconfig.json
- README.md
- viewlayout.mjs
- solveSketch
- refgeom.ts
- sketchScene.ts
- document/equations.ts
- filletopts.mjs
- viewGeometry
- drawing2.mjs
- DrawingView
- misc7.mjs
- doorhandle.mjs
- text.ts
- assembly2.mjs
- features2.mjs
- sheetmetal2.mjs
- configureDialog.tsx
- multibody.test.ts
- SelectionItem
- Mate
- ComponentPattern
- Circle2D

## God Nodes (most connected - your core abstractions)
1. `State` - 303 edges
2. `Id` - 192 edges
3. `useStore` - 172 edges
4. `rebuildDocument()` - 105 edges
5. `addLine()` - 79 edges
6. `playwright` - 78 edges
7. `createSketch()` - 71 edges
8. `three` - 69 edges
9. `createDocument()` - 68 edges
10. `Viewport()` - 65 edges

## Surprising Connections (you probably didn't know these)
- `Helix and Spiral (video 17, candy stripe) (2026-10-21)` --references--> `helixPath()`  [INFERRED]
  docs/05-vergelijking-video.md → src/core/features/sweep.ts
- `Datamodel` --references--> `Sketch`  [INFERRED]
  docs/02-fase1-schetser.md → src/core/sketch/types.ts
- `Viewport` --references--> `CadCamera`  [INFERRED]
  docs/02-fase1-schetser.md → src/app/viewport/camera.ts
- `Configuraties (ConfigurationManager) (2026-10-21)` --references--> `configurations()`  [INFERRED]
  docs/05-vergelijking-video.md → src/core/document/configurations.ts
- `Configuraties (ConfigurationManager) (2026-10-21)` --references--> `activeConfiguration()`  [INFERRED]
  docs/05-vergelijking-video.md → src/core/document/configurations.ts

## Import Cycles
- 3-file cycle: `src/core/assembly/assembly.ts -> src/core/features/rebuild.ts -> src/core/features/smcorners.ts -> src/core/assembly/assembly.ts`

## Communities (130 total, 27 thin omitted)

### Community 1 - "model.ts"
Cohesion: 0.16
Nodes (26): plate(), block(), pin(), plate(), plate(), createDocument(), plate(), plateDoc() (+18 more)

### Community 2 - "Id"
Cohesion: 0.03
Nodes (13): ConfigEdit, FaceRef, Library, PlaneEdit, PatternInstance, BeltFeature, Decal, DeleteBodyFeature (+5 more)

### Community 3 - "CadCamera"
Cohesion: 0.11
Nodes (12): Architectuurschets, Bekende beperkingen (fase 1), Datamodel, Demo (± 2 minuten), Fase 1 — 2D-schetser met constraint-solver, Solver, Tests, UI-conventies (docs/01-research.md en docs/03-vergelijking-solidworks.md) (+4 more)

### Community 4 - "Taken - Phlippo CAD"
Cohesion: 0.03
Nodes (58): Configuraties (ConfigurationManager, video 19) (2026-10-21), Controle met de volledige playlist (58 video's, 15 u) — na de download, Curves ▸ Helix and Spiral (2026-10-21), Desktop-app (Electron) (2026-10-20, nacht), Eindcondities en sensors (video 40, 31) (2026-10-21), Extrude met Draft (video 29, LEG BASE) (2026-10-21), Fase 2: 3D-features op een solid-kern (2026-10-20), Fase 2b: Mirror, patronen, Hole Wizard, Shell, Sweep/Loft (2026-10-20, nacht) (+50 more)

### Community 5 - "solver.ts"
Cohesion: 0.20
Nodes (19): lineLength(), resetIds(), ata(), atv(), dependentRows(), determinedParams(), Matrix, rref() (+11 more)

### Community 6 - "store.ts"
Cohesion: 0.05
Nodes (43): AsmTool, COUPLING_MATES, DEFAULT_DECAL, DialogId, DockSide, ExplodeEdit, explodeStepOf(), FeatureEdit (+35 more)

### Community 7 - "App.tsx"
Cohesion: 0.10
Nodes (47): App(), downloadText(), InterferenceDialog(), DesignStudyDialog(), evaluate(), Output, AskDialog(), ConfirmDeleteDialog() (+39 more)

### Community 8 - "useStore"
Cohesion: 0.12
Nodes (55): AltPositionPM(), AuxViewPM(), BalloonLayoutIcon(), BrokenOutPM(), DetailViewPM(), DrawingDimensionPM(), DrawingViewPM(), Header() (+47 more)

### Community 9 - "document/types.ts"
Cohesion: 0.10
Nodes (37): BaseFlangeFeature, ClosedCornerFeature, CombineFeature, ConvertSheetFeature, CornerReliefFeature, CrossBreakFeature, DraftFeature, EdgeFlangeFeature (+29 more)

### Community 10 - "configurations.ts"
Cohesion: 0.25
Nodes (20): Configuraties (ConfigurationManager) (2026-10-21), BomDialog(), activateConfiguration(), activeConfiguration(), addConfiguration(), applyConfiguration(), captureConfiguration(), cfgId() (+12 more)

### Community 11 - "icons.tsx"
Cohesion: 0.10
Nodes (16): AppearanceDialog(), SWATCHES, fmtNum(), MaterialDialog(), TABS, DockColumn(), PreviewWindow(), findMaterial() (+8 more)

### Community 12 - "regions.ts"
Cohesion: 0.12
Nodes (26): three-mesh-bvh, PlaneDef, centroid(), pointInPolygon(), Region, sketchRegions(), extendEnd(), midpoint() (+18 more)

### Community 13 - "SketchPoint"
Cohesion: 0.16
Nodes (6): ToolId, arcPoly(), slotGeometry(), ToolController, dist(), SketchPoint

### Community 14 - "components.tsx"
Cohesion: 0.09
Nodes (34): APPLY_TOOLS, DetailedPreviewButton(), Header(), HOLE_SIZES, HOLE_TYPES, HoleTypeIcon(), lastRectangle(), PropertyManagerBody() (+26 more)

### Community 15 - "Viewport.tsx"
Cohesion: 0.07
Nodes (50): react, MarkupLayer(), MATE_ICON, FeatureTreeBody(), STATUS_LABEL, getPref(), Cmd, ShortcutBar() (+42 more)

### Community 16 - "ref_node_fs"
Cohesion: 0.06
Nodes (15): b64, [file, x, y, w, h, out], doc, errors, results, errors, results, errors (+7 more)

### Community 17 - "playwright"
Cohesion: 0.06
Nodes (14): doc, logs, t0, logs, logs, errors, results, d (+6 more)

### Community 18 - "hlr.ts"
Cohesion: 0.15
Nodes (23): cleanLines(), F(), key(), Line2D, mergeLines(), projectView(), silhouetteSegments(), View2D (+15 more)

### Community 19 - "edit.ts"
Cohesion: 0.16
Nodes (32): addPiece(), arcAngles(), circularSketchPattern(), circumcentre(), convertPolylines(), copyEntities(), cornerTrim(), dropPointRelations() (+24 more)

### Community 20 - "geometry.ts"
Cohesion: 0.13
Nodes (26): Contour, DSU, Edge, findContours(), polygonArea(), add(), distanceToEntity(), distToSegment() (+18 more)

### Community 21 - "rebuild.ts"
Cohesion: 0.16
Nodes (41): SketchBasedFeature, matchEdge(), toSketch(), isReferencePlane(), resolvePlaneDef(), crossBreakLines(), draftOnBody(), edgeFlangeOnBody() (+33 more)

### Community 22 - "Vergelijking met de video (lokale sessie, 2026-10-20)"
Cohesion: 0.08
Nodes (23): Doorgevoerd in de lokale sessie (2026-10-20, avond), Eindcondities Up To Next / Up To Surface / Offset From Surface (video 40) (2026-10-21), Evaluate en bestanden (2026-10-20, nacht), Fase 2 (2026-10-20, avond): 3D-features, Fase 3: Equations en Global Variables (2026-10-20, nacht), Fase 4: Assemblies (2026-10-20, nacht), Fase 5: Tekeningen (2026-10-21, nacht), Functionele fouten gezien tijdens het vastleggen (+15 more)

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (22): author, description, main, name, private, type, version, concurrently (+14 more)

### Community 24 - "MenuBar.tsx"
Cohesion: 0.19
Nodes (18): desktop(), DesktopFile, getDocumentPath(), isDesktop(), setDocumentPath(), download(), KCAD_FILTERS, MenuBar() (+10 more)

### Community 25 - "Sketch"
Cohesion: 0.17
Nodes (9): OverlayProps, Sketch, fromWire(), SolveOptions, SolveResult, SolveResultWire, toWire(), SolverClient (+1 more)

### Community 26 - "sheetmetal.ts"
Cohesion: 0.13
Nodes (26): baseFlangeGeometry(), baseFlangeRegion(), bendAllowance(), cross(), edgeFlangeGeometry(), EdgeFlangeInput, flangeLeg(), flangeSetback() (+18 more)

### Community 27 - "features.mjs"
Cohesion: 0.09
Nodes (14): arrowInput, boxTris, c2, drift, eqInputs, errors, faces, mv (+6 more)

### Community 28 - "bodyScene.ts"
Cohesion: 0.17
Nodes (10): DisplayStyle, BodyEntry, BodyScene, BodySceneInput, boxUVs(), woodTexture(), featureEdges(), featureEdgeSets() (+2 more)

### Community 29 - "csg"
Cohesion: 0.24
Nodes (12): detectInterferences(), Interference, channel(), applyShell(), applyShellFromHistory(), applyShellOutward(), BuildHistory, FaceRefData (+4 more)

### Community 30 - "DrawingSheetView.tsx"
Cohesion: 0.15
Nodes (25): arrow(), directionFrom(), DrawingSheetView(), newSymbolId(), orientationFor(), PAPER, sheetToViewLocal(), BalloonBox (+17 more)

### Community 31 - "modelItems.ts"
Cohesion: 0.17
Nodes (19): modelItems(), ModelItemsOptions, near(), ORTHO, lengthDecimals(), dimensionDrawing, entityAnchor(), entityFrame() (+11 more)

### Community 32 - "assembly.ts"
Cohesion: 0.10
Nodes (32): AssemblyRebuild, cylinderAxis(), leastSquares(), matrixToTransform(), partCache, partRebuild(), patternOffsets(), rebuildAssembly() (+24 more)

### Community 33 - "newId"
Cohesion: 0.16
Nodes (33): addComment(), comps(), copyWithMates(), insertNewAssembly(), insertNewPart(), makeMultibodyPart(), mirrorComponents(), packAndGoFiles() (+25 more)

### Community 34 - "sketch/types.ts"
Cohesion: 0.24
Nodes (13): ArcEntity, CircleEntity, ConicEntity, DIMENSION_KINDS, EllipseArcEntity, EllipseEntity, Entity, EntityBase (+5 more)

### Community 35 - "round.ts"
Cohesion: 0.15
Nodes (23): bodyEdges(), CreaseSegment, creaseSegments(), mergeCollinear(), applyRoundFeature(), removed(), topEdge(), vol() (+15 more)

### Community 36 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, concurrently, cross-env, electron, electron-builder, jsdom, playwright, @types/node (+8 more)

### Community 37 - "sweep.ts"
Cohesion: 0.25
Nodes (17): polyArea(), ccw(), dedupe(), taperedExtrude(), capTriangles(), centroidOf(), finish(), frameOf() (+9 more)

### Community 38 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 39 - "sketchtools2.mjs"
Cohesion: 0.16
Nodes (11): click(), count(), errors, fly(), hd, K(), P(), pc (+3 more)

### Community 40 - "prefs.ts"
Cohesion: 0.20
Nodes (12): ColorList(), Category, COLOR_SCHEME_ITEMS, Control, current, DEFAULT_PREFS, DOCUMENT_CATEGORIES, loadPrefs() (+4 more)

### Community 41 - "dependents.ts"
Cohesion: 0.36
Nodes (7): Feature, DeleteDependents, featureDependents(), geometricChildren(), Id, sketchOf(), TrialBody

### Community 42 - "rect3.mjs"
Cohesion: 0.15
Nodes (10): clicks(), errors, fourth, lens, nr, P(), results, solid (+2 more)

### Community 43 - "evaluate.tsx"
Cohesion: 0.29
Nodes (13): fmt(), MassPropertiesDialog(), MeasureDialog(), MeasureLine, measureLines(), polyLength(), clamp(), combineMassProperties() (+5 more)

### Community 44 - "Document"
Cohesion: 0.22
Nodes (3): Configuration, Equation, Document

### Community 45 - "full.mjs"
Cohesion: 0.21
Nodes (8): errors, kinds(), lenC, nCon(), nEnt(), results, S(), sk()

### Community 46 - "motion.ts"
Cohesion: 0.29
Nodes (11): componentMatrix(), localRef(), Id, MotionStudy, motionTransforms(), motorAngle(), motorAxis(), movingComponents() (+3 more)

### Community 47 - "assembly.mjs"
Cohesion: 0.17
Nodes (7): before, c2, c2b, errors, hc, results, top2

### Community 48 - "configurations.mjs"
Cohesion: 0.17
Nodes (7): bom, errors, head, mv, results, tree, tree2

### Community 49 - "build"
Cohesion: 0.17
Nodes (12): build, appId, directories, fileAssociations, files, portable, productName, win (+4 more)

### Community 50 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, desktop, desktop:build, desktop:start, dev, e2e, e2e:desktop (+4 more)

### Community 51 - "solid.ts"
Cohesion: 0.16
Nodes (11): three, vitest, exportStl(), geometryFromPositions(), parseStl(), ExtrudeFeature, SketchFeature, volume() (+3 more)

### Community 52 - "Onderzoek: workflow en lay-out van moderne parametrische CAD"
Cohesion: 0.18
Nodes (10): 1. Globale schermindeling (alle drie de pakketten komen overeen), 2. Sketch-workflow, 3. Constraint-solver, 4. Navigatie en sneltoetsen (conventies), 5. Feature-modelleren (fase 2, ter voorbereiding), 6. UI-componenten, 7. Bronnen, Dimensies (+2 more)

### Community 53 - "annotations.mjs"
Cohesion: 0.18
Nodes (7): asm, errors, front, items, results, tek, toPx()

### Community 54 - "tools.ts"
Cohesion: 0.17
Nodes (20): PreviewItem, PointerInfo, slotOutline(), ToolRender, fullyDefineSketch(), addConic(), addEllipse(), addEllipseArc() (+12 more)

### Community 55 - "analysis.ts"
Cohesion: 0.21
Nodes (17): AnalysisHead(), GeometryAnalysisPM(), ThicknessAnalysisPM(), UndercutAnalysisPM(), bvhCache, bvhOf(), curvatureAnalysis(), curvatureColor() (+9 more)

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
Cohesion: 0.22
Nodes (5): { app, BrowserWindow, ipcMain, dialog, shell }, fs, path, { contextBridge, ipcRenderer }, electron

### Community 69 - "nsis"
Cohesion: 0.22
Nodes (9): nsis, allowToChangeInstallationDirectory, artifactName, createDesktopShortcut, createStartMenuShortcut, oneClick, perMachine, runAfterFinish (+1 more)

### Community 71 - "sheet.ts"
Cohesion: 0.11
Nodes (22): SHEET_SIZES_MM, altCache, alternateLines(), alternateModel(), autoSheetScale(), auxCache, boCache, bodyCache (+14 more)

### Community 72 - "patterns2.ts"
Cohesion: 0.22
Nodes (15): holeTool(), mirrorGeometry(), patternInstances(), rotatedAbout(), translated(), atLength(), curveInstances(), distToPoly() (+7 more)

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
Cohesion: 0.13
Nodes (7): depthField, errors, pin, results, asm, errors, results

### Community 81 - "sketchtools.mjs"
Cohesion: 0.29
Nodes (4): count(), errors, K(), results

### Community 83 - "thickness.mjs"
Cohesion: 0.25
Nodes (5): errors, kruk, nums, results, thin

### Community 84 - "fasteners.ts"
Cohesion: 0.14
Nodes (16): AsmHole, assemblyHoles(), FASTENER_NAMES, fastenerPart(), FastenerSlot, fastenerSlots(), FastenerType, Id (+8 more)

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

### Community 96 - "motion.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

### Community 97 - "blocks.ts"
Cohesion: 0.19
Nodes (15): CheckDialog(), RepairSketchDialog(), SectionPropertiesDialog(), bodyCheck(), sectionProperties(), extractBlock(), insertBlock(), entityPoints() (+7 more)

### Community 101 - "Merken en auteursrecht: wat mag wel en niet lijken op het origineel"
Cohesion: 0.40
Nodes (4): Merken en auteursrecht: wat mag wel en niet lijken op het origineel, Praktische regels voor dit project, Wat in Europa vrij is om na te maken, Wat wél beschermd is en vermeden moet worden

### Community 102 - "planes.ts"
Cohesion: 0.19
Nodes (11): cross(), dot(), norm(), planeOnFace(), REFERENCE_PLANE_DEFS, referencePlane(), ReferencePlaneId, rotate() (+3 more)

### Community 105 - "Lokaal werken met Claude Code (Windows)"
Cohesion: 0.50
Nodes (3): Desktop-app (2026-10-20), Geïnstalleerde app (2026-10-21), Lokaal werken met Claude Code (Windows)

### Community 109 - "viewlayout.mjs"
Cohesion: 0.12
Nodes (11): asm, aux, click(), errors, front, nl, nrm, results (+3 more)

### Community 110 - "solveSketch"
Cohesion: 0.28
Nodes (11): buildEquations(), circleLike(), entityOf(), Equation, EquationBuildError, linePts(), P, ParamIndex (+3 more)

### Community 111 - "refgeom.ts"
Cohesion: 0.24
Nodes (13): threadEdge(), RefGeometry, axisCandidate(), pointCandidate(), refGeometryFrom(), refGeometryLines(), T(), V() (+5 more)

### Community 112 - "sketchScene.ts"
Cohesion: 0.25
Nodes (8): getPlane(), PlaneId, sketchToWorld(), worldToSketch(), rgba(), SceneColors, SceneInput, SketchScene

### Community 113 - "document/equations.ts"
Cohesion: 0.23
Nodes (12): solveAll(), applyEquations(), DimensionRef, dimensionTable(), EquationResult, evaluateEquations(), evaluateExpression(), featureDimensionNames() (+4 more)

### Community 114 - "filletopts.mjs"
Cohesion: 0.20
Nodes (5): errors, pickTopEdges(), results, topLongEdges(), undo()

### Community 115 - "viewGeometry"
Cohesion: 0.33
Nodes (9): DrawingSheet, breakGeometry(), sheetSize(), viewBounds(), viewGeometry(), fitCols(), freeSpot(), holeTableRows() (+1 more)

### Community 116 - "drawing2.mjs"
Cohesion: 0.22
Nodes (7): clickSheet(), errors, P(), painted, results, [srcNote, dstNote], tek

### Community 117 - "DrawingView"
Cohesion: 0.20
Nodes (5): DrawingEdit, DrawingDimension, DrawingSymbol, DrawingView, DrawingViewType

### Community 118 - "misc7.mjs"
Cohesion: 0.22
Nodes (6): asm, errors, lassoItem, pts, results, so

### Community 119 - "doorhandle.mjs"
Cohesion: 0.25
Nodes (3): errors, results, tree

### Community 120 - "text.ts"
Cohesion: 0.36
Nodes (7): cache, capRatio(), caps, dedupe(), font(), fonts, textOutlines()

### Community 121 - "assembly2.mjs"
Cohesion: 0.29
Nodes (3): asm, errors, results

### Community 124 - "configureDialog.tsx"
Cohesion: 0.48
Nodes (6): fmt(), ModifyConfigurationsDialog(), ConfigurationEdit, configurationDimension(), isSuppressedIn(), isSolidFeature()

### Community 125 - "multibody.test.ts"
Cohesion: 0.53
Nodes (5): extrudeF(), sketchF(), square(), twoBlocks(), vol()

## Knowledge Gaps
- **10 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `@types/three`, `concurrently` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1021 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `State` connect `State` to `ComponentPattern`, `Circle2D`, `Id`, `store.ts`, `App.tsx`, `document/types.ts`, `SketchPoint`, `hlr.ts`, `MenuBar.tsx`, `Sketch`, `sheetmetal.ts`, `DrawingSheetView.tsx`, `modelItems.ts`, `assembly.ts`, `prefs.ts`, `Document`, `viewGeometry`, `DrawingView`, `SelectionItem`, `Mate`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.010416666666666666 - nodes in this community are weakly interconnected._
- **Why does `playwright` connect `playwright` to `ref_node_fs`, `package.json`, `features.mjs`, `sketchtools2.mjs`, `rect3.mjs`, `full.mjs`, `assembly.mjs`, `configurations.mjs`, `annotations.mjs`, `componentpattern.mjs`, `drawing.mjs`, `endconditions.mjs`, `fixes1.mjs`, `annotations2.mjs`, `annotations3.mjs`, `deletekey2.mjs`, `ellipsetext.mjs`, `multibody.mjs`, `rib.mjs`, `arcslot.mjs`, `asmcut.mjs`, `draftcheck.mjs`, `editcomponent.mjs`, `explode.mjs`, `hem.mjs`, `sheetmetal.mjs`, `sketchtools.mjs`, `surfaces.mjs`, `thickness.mjs`, `corners.mjs`, `deletekey.mjs`, `helix.mjs`, `section.mjs`, `sketch3d.mjs`, `unfoldfold.mjs`, `uptobody.mjs`, `drawingfix.mjs`, `confirmdelete.mjs`, `jogmiter.mjs`, `motion.mjs`, `slot.mjs`, `thread.mjs`, `wrap.mjs`, `relations.mjs`, `viewlayout.mjs`, `filletopts.mjs`, `drawing2.mjs`, `misc7.mjs`, `doorhandle.mjs`, `assembly2.mjs`, `features2.mjs`, `sheetmetal2.mjs`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Should `Id` be split into smaller, more focused modules?**
  _Cohesion score 0.025 - nodes in this community are weakly interconnected._
- **Why does `three` connect `solid.ts` to `model.ts`, `store.ts`, `document/types.ts`, `regions.ts`, `Viewport.tsx`, `hlr.ts`, `rebuild.ts`, `package.json`, `sheetmetal.ts`, `bodyScene.ts`, `csg`, `DrawingSheetView.tsx`, `modelItems.ts`, `assembly.ts`, `newId`, `round.ts`, `sweep.ts`, `evaluate.tsx`, `motion.ts`, `analysis.ts`, `sheet.ts`, `patterns2.ts`, `fasteners.ts`, `blocks.ts`, `planes.ts`, `refgeom.ts`, `sketchScene.ts`, `text.ts`, `multibody.test.ts`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `CadCamera` be split into smaller, more focused modules?**
  _Cohesion score 0.1092436974789916 - nodes in this community are weakly interconnected._