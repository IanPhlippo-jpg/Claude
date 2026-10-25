# Graph Report - Claude  (2026-10-22)

## Corpus Check
- 316 files · ~465,273 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .kcad 8, .css 2, .cmd 2)

## Summary
- 2590 nodes · 7411 edges · 133 communities (102 shown, 31 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.87)
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
- Sketch
- store.ts
- App.tsx
- useStore
- document/types.ts
- drawopts.mjs
- icons.tsx
- MenuBar.tsx
- SketchPoint
- PropertyManager.tsx
- Viewport.tsx
- ref_node_fs
- playwright
- configurations.ts
- edit.ts
- tools.ts
- rebuild.ts
- Vergelijking met de video (lokale sessie, 2026-10-20)
- package.json
- sketch/types.ts
- addConstraint
- sheetmetal.ts
- features.mjs
- bodyScene.ts
- camera.ts
- thin.ts
- annotations.ts
- assembly.ts
- Ribbon.tsx
- blocks.ts
- round.ts
- devDependencies
- sweep.ts
- compilerOptions
- sketchtools2.mjs
- AssemblyPM.tsx
- evaluate.tsx
- rect3.mjs
- materials.ts
- Document
- full.mjs
- richTips.tsx
- assembly.mjs
- configurations.mjs
- build
- scripts
- solid.ts
- Onderzoek: workflow en lay-out van moderne parametrische CAD
- annotations.mjs
- DrawingExtras.tsx
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
- document/equations.ts
- sheet.ts
- planes.ts
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
- motion.mjs
- configureDialog.tsx
- slot.mjs
- thread.mjs
- wrap.mjs
- Merken en auteursrecht: wat mag wel en niet lijken op het origineel
- dependents.ts
- getPref
- jogmiter.mjs
- Lokaal werken met Claude Code (Windows)
- Vergelijking met de SOLIDWORKS-playlist (TooTallToby, 58 video's)
- tsconfig.json
- README.md
- viewlayout.mjs
- sketchScene.ts
- deletekey3.mjs
- relations.mjs
- keys.mjs
- filletopts.mjs
- ao.ts
- drawing2.mjs
- DrawingView
- misc7.mjs
- doorhandle.mjs
- clickall.mjs
- features2.mjs
- sheetmetal2.mjs
- faceappearance.mjs
- assembly2.mjs
- fasteners.mjs
- newId
- instant3d.mjs
- SelectionItem
- ComponentPattern
- tutorial.mjs
- Circle2D

## God Nodes (most connected - your core abstractions)
1. `State` - 312 edges
2. `Id` - 194 edges
3. `useStore` - 183 edges
4. `rebuildDocument()` - 109 edges
5. `playwright` - 100 edges
6. `addLine()` - 80 edges
7. `three` - 76 edges
8. `Viewport()` - 75 edges
9. `createSketch()` - 73 edges
10. `createDocument()` - 69 edges

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

## Communities (133 total, 31 thin omitted)

### Community 1 - "model.ts"
Cohesion: 0.12
Nodes (35): vitest, plate(), block(), pin(), plate(), fastenerPart(), placeFasteners(), plate() (+27 more)

### Community 2 - "Id"
Cohesion: 0.02
Nodes (11): ConfigEdit, FaceRef, FeatureEdit, Library, BeltFeature, Decal, DeleteBodyFeature, DrawingNote (+3 more)

### Community 3 - "CadCamera"
Cohesion: 0.11
Nodes (12): Architectuurschets, Bekende beperkingen (fase 1), Datamodel, Demo (± 2 minuten), Fase 1 — 2D-schetser met constraint-solver, Solver, Tests, UI-conventies (docs/01-research.md en docs/03-vergelijking-solidworks.md) (+4 more)

### Community 4 - "Taken - Phlippo CAD"
Cohesion: 0.03
Nodes (60): Configuraties (ConfigurationManager, video 19) (2026-10-21), Controle met de volledige playlist (58 video's, 15 u) — na de download, Curves ▸ Helix and Spiral (2026-10-21), Desktop-app (Electron) (2026-10-20, nacht), Eindcondities en sensors (video 40, 31) (2026-10-21), Extrude met Draft (video 29, LEG BASE) (2026-10-21), Fase 2: 3D-features op een solid-kern (2026-10-20), Fase 2b: Mirror, patronen, Hole Wizard, Shell, Sweep/Loft (2026-10-20, nacht) (+52 more)

### Community 5 - "Sketch"
Cohesion: 0.09
Nodes (38): lineLength(), resetIds(), Sketch, buildEquations(), circleLike(), entityOf(), Equation, EquationBuildError (+30 more)

### Community 6 - "store.ts"
Cohesion: 0.05
Nodes (43): AsmTool, COUPLING_MATES, DEFAULT_DECAL, DialogId, DockSide, DRAW_TOOLS, ExplodeEdit, explodeStepOf() (+35 more)

### Community 7 - "App.tsx"
Cohesion: 0.09
Nodes (46): App(), AppearanceDialog(), addComment(), downloadText(), packAndGoFiles(), BomDialog(), InterferenceDialog(), DesignStudyDialog() (+38 more)

### Community 8 - "useStore"
Cohesion: 0.15
Nodes (48): AltPositionPM(), AuxViewPM(), BalloonLayoutIcon(), BrokenOutPM(), DetailViewPM(), DrawingDimensionPM(), DrawingViewPM(), Header() (+40 more)

### Community 9 - "document/types.ts"
Cohesion: 0.09
Nodes (40): BaseFlangeFeature, ClosedCornerFeature, CombineFeature, ConvertSheetFeature, CornerReliefFeature, CrossBreakFeature, DraftFeature, EdgeFlangeFeature (+32 more)

### Community 10 - "drawopts.mjs"
Cohesion: 0.13
Nodes (14): afront, asmDrw, det2, dim, dimAfter, dimEl, drw, errors (+6 more)

### Community 11 - "icons.tsx"
Cohesion: 0.10
Nodes (31): react, SWATCHES, AssemblyTreeBody(), MATE_ICON, ConfigurationManagerBody(), DrawingTreeBody(), featureIcon(), FeatureTreeBody() (+23 more)

### Community 12 - "MenuBar.tsx"
Cohesion: 0.19
Nodes (18): desktop(), DesktopFile, getDocumentPath(), isDesktop(), setDocumentPath(), download(), KCAD_FILTERS, MenuBar() (+10 more)

### Community 13 - "SketchPoint"
Cohesion: 0.15
Nodes (7): ToolId, arcPoly(), slotGeometry(), ToolController, dist(), hitTest(), SketchPoint

### Community 14 - "PropertyManager.tsx"
Cohesion: 0.08
Nodes (40): APPEARANCE_TREE, AppearancesPane(), findFolder(), Folder, Kind, sphere(), Swatch, APPLY_TOOLS (+32 more)

### Community 15 - "Viewport.tsx"
Cohesion: 0.11
Nodes (33): MarkupLayer(), isCommandActive(), planeLabel(), ConfirmationCorner(), viewDisplayName(), ViewSelector(), InsertRotateBar(), extrudeCapOf() (+25 more)

### Community 16 - "ref_node_fs"
Cohesion: 0.04
Nodes (26): [dir, first, last, prefix], b64, [inp, out, x, y, w, h, sc = '3'], b64, [file, x, y, w, h, out], doc, asm, shots (+18 more)

### Community 17 - "playwright"
Cohesion: 0.04
Nodes (22): logs, logs, errors, results, errors, results, errors, sw (+14 more)

### Community 18 - "configurations.ts"
Cohesion: 0.27
Nodes (19): Configuraties (ConfigurationManager) (2026-10-21), activateConfiguration(), activeConfiguration(), addConfiguration(), applyConfiguration(), captureConfiguration(), cfgId(), configurationByName() (+11 more)

### Community 19 - "edit.ts"
Cohesion: 0.15
Nodes (36): addPiece(), arcAngles(), circularSketchPattern(), circumcentre(), convertPolylines(), copyEntities(), cornerTrim(), dropPointRelations() (+28 more)

### Community 20 - "tools.ts"
Cohesion: 0.11
Nodes (32): PreviewItem, contourCache, PointerInfo, regionAt(), slotOutline(), ToolRender, Contour, DSU (+24 more)

### Community 21 - "rebuild.ts"
Cohesion: 0.13
Nodes (46): holeTool(), mirrorGeometry(), patternInstances(), rotatedAbout(), translated(), atLength(), curveInstances(), distToPoly() (+38 more)

### Community 22 - "Vergelijking met de video (lokale sessie, 2026-10-20)"
Cohesion: 0.08
Nodes (23): Doorgevoerd in de lokale sessie (2026-10-20, avond), Eindcondities Up To Next / Up To Surface / Offset From Surface (video 40) (2026-10-21), Evaluate en bestanden (2026-10-20, nacht), Fase 2 (2026-10-20, avond): 3D-features, Fase 3: Equations en Global Variables (2026-10-20, nacht), Fase 4: Assemblies (2026-10-20, nacht), Fase 5: Tekeningen (2026-10-21, nacht), Functionele fouten gezien tijdens het vastleggen (+15 more)

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (22): author, description, main, name, private, type, version, concurrently (+14 more)

### Community 24 - "sketch/types.ts"
Cohesion: 0.15
Nodes (19): cache, capRatio(), caps, dedupe(), font(), fonts, textOutlines(), ArcEntity (+11 more)

### Community 25 - "addConstraint"
Cohesion: 0.25
Nodes (11): withSpacingDimension(), fullyDefineSketch(), addConstraint(), addPolygon(), dimensionForSelection(), isCircular(), LABELS, measure() (+3 more)

### Community 26 - "sheetmetal.ts"
Cohesion: 0.13
Nodes (26): baseFlangeGeometry(), baseFlangeRegion(), bendAllowance(), cross(), DEFAULT_SHEET_METAL, edgeFlangeGeometry(), EdgeFlangeInput, flangeLeg() (+18 more)

### Community 27 - "features.mjs"
Cohesion: 0.09
Nodes (14): arrowInput, boxTris, c2, drift, eqInputs, errors, faces, mv (+6 more)

### Community 28 - "bodyScene.ts"
Cohesion: 0.13
Nodes (15): DisplayStyle, BodyEntry, BodyScene, BodySceneInput, boxUVs(), LIGHTING, woodTexture(), featureEdges() (+7 more)

### Community 29 - "camera.ts"
Cohesion: 0.18
Nodes (10): customPlanes, PlaneBasis, PLANES, REFERENCE_PLANES, ReferencePlaneId, registerPlanes(), StandardView, V() (+2 more)

### Community 30 - "thin.ts"
Cohesion: 0.14
Nodes (21): PlaneDef, Region, extendEnd(), midpoint(), resample(), ribGeometry(), channel(), mergeGeometries() (+13 more)

### Community 31 - "annotations.ts"
Cohesion: 0.22
Nodes (14): lengthDecimals(), dimensionDrawing, entityAnchor(), entityFrame(), fmt(), GlyphDrawing, glyphDrawings(), norm() (+6 more)

### Community 32 - "assembly.ts"
Cohesion: 0.06
Nodes (56): comps(), copyWithMates(), insertNewAssembly(), insertNewPart(), makeMultibodyPart(), mirrorComponents(), patternDrivenPattern(), restoreSnapshot() (+48 more)

### Community 33 - "Ribbon.tsx"
Cohesion: 0.20
Nodes (19): startEmptyView(), LifecycleTab(), AnnotationTab(), SheetFormatTab(), ViewLayoutTab(), ASSEMBLY_TABS, BigButton(), BigProps (+11 more)

### Community 34 - "blocks.ts"
Cohesion: 0.24
Nodes (12): LibraryItem, Block, extractBlock(), entityPoints(), entityScalars(), ownerOfPoint(), removeEntity(), findSketchProblems() (+4 more)

### Community 35 - "round.ts"
Cohesion: 0.15
Nodes (21): bodyEdges(), CreaseSegment, creaseSegments(), mergeCollinear(), removed(), topEdge(), vol(), edgesOnFace() (+13 more)

### Community 36 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, concurrently, cross-env, electron, electron-builder, jsdom, playwright, @types/node (+8 more)

### Community 37 - "sweep.ts"
Cohesion: 0.24
Nodes (18): centroid(), pointInPolygon(), polyArea(), sketchRegions(), ccw(), capTriangles(), centroidOf(), finish() (+10 more)

### Community 38 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 39 - "sketchtools2.mjs"
Cohesion: 0.16
Nodes (11): click(), count(), errors, fly(), hd, K(), P(), pc (+3 more)

### Community 40 - "AssemblyPM.tsx"
Cohesion: 0.12
Nodes (23): fmtNum(), MaterialDialog(), TABS, ColorList(), OptionsDialog(), Header(), InsertComponentPM(), MATE_LABEL (+15 more)

### Community 41 - "evaluate.tsx"
Cohesion: 0.23
Nodes (15): evaluate(), Output, fmt(), MassPropertiesDialog(), MeasureDialog(), MeasureLine, measureLines(), polyLength() (+7 more)

### Community 42 - "rect3.mjs"
Cohesion: 0.15
Nodes (10): clicks(), errors, fourth, lens, nr, P(), results, solid (+2 more)

### Community 43 - "materials.ts"
Cohesion: 0.29
Nodes (4): findMaterial(), MATERIAL_LIBRARY, MaterialCategory, MaterialDef

### Community 44 - "Document"
Cohesion: 0.20
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
Cohesion: 0.17
Nodes (12): build, appId, directories, fileAssociations, files, portable, productName, win (+4 more)

### Community 50 - "scripts"
Cohesion: 0.17
Nodes (12): scripts, build, desktop, desktop:build, desktop:start, dev, e2e, e2e:desktop (+4 more)

### Community 51 - "solid.ts"
Cohesion: 0.08
Nodes (40): three, detectInterferences(), Interference, exportStl(), geometryFromPositions(), parseStl(), volume(), applyRound() (+32 more)

### Community 52 - "Onderzoek: workflow en lay-out van moderne parametrische CAD"
Cohesion: 0.18
Nodes (10): 1. Globale schermindeling (alle drie de pakketten komen overeen), 2. Sketch-workflow, 3. Constraint-solver, 4. Navigatie en sneltoetsen (conventies), 5. Feature-modelleren (fase 2, ter voorbereiding), 6. UI-componenten, 7. Bronnen, Dimensies (+2 more)

### Community 53 - "annotations.mjs"
Cohesion: 0.18
Nodes (7): asm, errors, front, items, results, tek, toPx()

### Community 54 - "DrawingExtras.tsx"
Cohesion: 0.33
Nodes (12): DRAWING_BLOCKS, drawingToolClick(), Frame(), GeneralTableDialog(), insertBlock(), insertModelInView(), LinearNotePatternDialog(), RelativeViewDialog() (+4 more)

### Community 55 - "analysis.ts"
Cohesion: 0.18
Nodes (14): cylinderAxis(), leastSquares(), smallestEigenvector(), bvhCache, bvhOf(), curvatureAnalysis(), curvatureColor(), DRAFT_COLORS (+6 more)

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

### Community 70 - "document/equations.ts"
Cohesion: 0.23
Nodes (12): solveAll(), applyEquations(), DimensionRef, dimensionTable(), EquationResult, evaluateEquations(), evaluateExpression(), featureDimensionNames() (+4 more)

### Community 71 - "sheet.ts"
Cohesion: 0.05
Nodes (87): three-mesh-bvh, arrow(), directionFrom(), DrawingSheetView(), newSymbolId(), orientationFor(), PAPER, sheetToViewLocal() (+79 more)

### Community 72 - "planes.ts"
Cohesion: 0.33
Nodes (10): cross(), dot(), norm(), planeOnFace(), referencePlane(), ReferencePlaneId, rotate(), sub() (+2 more)

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
Cohesion: 0.32
Nodes (10): RefGeometry, axisCandidate(), pointCandidate(), refGeometryFrom(), refGeometryLines(), RefSelection, T(), V() (+2 more)

### Community 96 - "motion.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

### Community 97 - "configureDialog.tsx"
Cohesion: 0.48
Nodes (6): fmt(), ModifyConfigurationsDialog(), ConfigurationEdit, configurationDimension(), isSuppressedIn(), isSolidFeature()

### Community 101 - "Merken en auteursrecht: wat mag wel en niet lijken op het origineel"
Cohesion: 0.40
Nodes (4): Merken en auteursrecht: wat mag wel en niet lijken op het origineel, Praktische regels voor dit project, Wat in Europa vrij is om na te maken, Wat wél beschermd is en vermeden moet worden

### Community 102 - "dependents.ts"
Cohesion: 0.38
Nodes (6): DeleteDependents, featureDependents(), geometricChildren(), Id, sketchOf(), TrialBody

### Community 103 - "getPref"
Cohesion: 0.21
Nodes (13): getPref(), Breadcrumbs(), Chevron(), faceOf(), loopOf(), Pick, SelectionToolbar(), isRoundFeature() (+5 more)

### Community 105 - "Lokaal werken met Claude Code (Windows)"
Cohesion: 0.50
Nodes (3): Desktop-app (2026-10-20), Geïnstalleerde app (2026-10-21), Lokaal werken met Claude Code (Windows)

### Community 109 - "viewlayout.mjs"
Cohesion: 0.12
Nodes (11): asm, aux, click(), errors, front, nl, nrm, results (+3 more)

### Community 110 - "sketchScene.ts"
Cohesion: 0.27
Nodes (8): getPlane(), PlaneId, sketchToWorld(), ExtrudeHandle(), rgba(), SceneColors, SceneInput, SketchScene

### Community 111 - "deletekey3.mjs"
Cohesion: 0.40
Nodes (3): doc, logs, t0

### Community 113 - "keys.mjs"
Cohesion: 0.29
Nodes (6): check(), errs, keys, part, results, run()

### Community 114 - "filletopts.mjs"
Cohesion: 0.20
Nodes (5): errors, pickTopEdges(), results, topLongEdges(), undo()

### Community 116 - "drawing2.mjs"
Cohesion: 0.22
Nodes (7): clickSheet(), errors, P(), painted, results, [srcNote, dstNote], tek

### Community 117 - "DrawingView"
Cohesion: 0.22
Nodes (4): DrawingEdit, DrawingSymbol, DrawingView, DrawingViewType

### Community 118 - "misc7.mjs"
Cohesion: 0.22
Nodes (6): asm, errors, lassoItem, pts, results, so

### Community 119 - "doorhandle.mjs"
Cohesion: 0.25
Nodes (3): errors, results, tree

### Community 120 - "clickall.mjs"
Cohesion: 0.29
Nodes (3): docs, errs, report

### Community 125 - "assembly2.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

### Community 127 - "newId"
Cohesion: 0.19
Nodes (9): ErrorBoundary, insertBlock(), addConic(), addEllipse(), addEllipseArc(), addScalar(), addText(), newId() (+1 more)

## Knowledge Gaps
- **10 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `@types/three`, `concurrently` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1105 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `playwright` connect `playwright` to `instant3d.mjs`, `tutorial.mjs`, `drawopts.mjs`, `ref_node_fs`, `package.json`, `features.mjs`, `sketchtools2.mjs`, `rect3.mjs`, `full.mjs`, `assembly.mjs`, `configurations.mjs`, `annotations.mjs`, `componentpattern.mjs`, `drawing.mjs`, `endconditions.mjs`, `fixes1.mjs`, `annotations2.mjs`, `annotations3.mjs`, `deletekey2.mjs`, `ellipsetext.mjs`, `multibody.mjs`, `rib.mjs`, `arcslot.mjs`, `asmcut.mjs`, `draftcheck.mjs`, `editcomponent.mjs`, `explode.mjs`, `hem.mjs`, `sheetmetal.mjs`, `sketchtools.mjs`, `surfaces.mjs`, `thickness.mjs`, `corners.mjs`, `deletekey.mjs`, `helix.mjs`, `section.mjs`, `sketch3d.mjs`, `unfoldfold.mjs`, `uptobody.mjs`, `drawingfix.mjs`, `confirmdelete.mjs`, `motion.mjs`, `slot.mjs`, `thread.mjs`, `wrap.mjs`, `jogmiter.mjs`, `viewlayout.mjs`, `deletekey3.mjs`, `relations.mjs`, `keys.mjs`, `filletopts.mjs`, `drawing2.mjs`, `misc7.mjs`, `doorhandle.mjs`, `clickall.mjs`, `features2.mjs`, `sheetmetal2.mjs`, `faceappearance.mjs`, `assembly2.mjs`, `fasteners.mjs`?**
  _High betweenness centrality (0.204) - this node is a cross-community bridge._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.010101010101010102 - nodes in this community are weakly interconnected._
- **Why does `State` connect `State` to `assembly.ts`, `SelectionItem`, `Id`, `ComponentPattern`, `Circle2D`, `Sketch`, `store.ts`, `AssemblyPM.tsx`, `document/types.ts`, `Document`, `SketchPoint`, `MenuBar.tsx`, `Viewport.tsx`, `DrawingView`, `sheetmetal.ts`, `refgeom.ts`, `annotations.ts`?**
  _High betweenness centrality (0.171) - this node is a cross-community bridge._
- **Should `model.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11699370603480193 - nodes in this community are weakly interconnected._
- **Why does `three` connect `solid.ts` to `model.ts`, `store.ts`, `App.tsx`, `document/types.ts`, `icons.tsx`, `Viewport.tsx`, `rebuild.ts`, `package.json`, `sketch/types.ts`, `sheetmetal.ts`, `bodyScene.ts`, `camera.ts`, `thin.ts`, `assembly.ts`, `round.ts`, `sweep.ts`, `evaluate.tsx`, `analysis.ts`, `sheet.ts`, `refgeom.ts`, `getPref`, `sketchScene.ts`, `ao.ts`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Should `Id` be split into smaller, more focused modules?**
  _Cohesion score 0.024691358024691357 - nodes in this community are weakly interconnected._