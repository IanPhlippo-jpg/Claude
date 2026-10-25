# Graph Report - Claude  (2026-10-22)

## Corpus Check
- 344 files · ~518,948 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: .kcad 8, .css 2, .cmd 2)

## Summary
- 2803 nodes · 8222 edges · 147 communities (117 shown, 30 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `efd4b491`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- State
- addLine
- Id
- CadCamera
- Taken - Phlippo CAD
- solver.ts
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
- model.ts
- sheetmetal.ts
- features.mjs
- bodyScene.ts
- camera.ts
- surfaces.ts
- annotations.ts
- assembly.ts
- Ribbon.tsx
- newId
- three
- devDependencies
- sweep.ts
- compilerOptions
- sketchtools2.mjs
- getPref
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
- motion.ts
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
- vitest
- slot.mjs
- thread.mjs
- wrap.mjs
- Merken en auteursrecht: wat mag wel en niet lijken op het origineel
- dependents.ts
- prefs.ts
- jogmiter.mjs
- Lokaal werken met Claude Code (Windows)
- Vergelijking met de SOLIDWORKS-playlist (TooTallToby, 58 video's)
- tsconfig.json
- README.md
- viewlayout.mjs
- ExtrudeHandle.tsx
- deletekey3.mjs
- fasteners.ts
- keys.mjs
- filletopts.mjs
- ao.ts
- drawing2.mjs
- section.ts
- misc7.mjs
- doorhandle.mjs
- clickall.mjs
- features2.mjs
- sheetmetal2.mjs
- splitline.ts
- assembly2.mjs
- Architectuurschets
- ErrorBoundary
- instant3d.mjs
- SelectionItem
- ComponentPattern
- asmoptions.mjs
- Circle2D
- triad.mjs
- thread.ts
- text.ts
- dialogopts.mjs
- motion2.mjs
- sectionopts.mjs
- _dbg.mjs
- dwgopts.mjs
- Hud.tsx
- multibody.test.ts
- stl.test.ts
- look-deurkruk-sel.mjs
- look-ian.mjs
- DrawingSheet

## God Nodes (most connected - your core abstractions)
1. `State` - 322 edges
2. `Id` - 197 edges
3. `useStore` - 188 edges
4. `rebuildDocument()` - 124 edges
5. `playwright` - 107 edges
6. `addLine()` - 97 edges
7. `createSketch()` - 90 edges
8. `three` - 86 edges
9. `Viewport()` - 86 edges
10. `createDocument()` - 84 edges

## Surprising Connections (you probably didn't know these)
- `Viewport` --references--> `CadCamera`  [INFERRED]
  docs/02-fase1-schetser.md → src/app/viewport/camera.ts
- `Helix and Spiral (video 17, candy stripe) (2026-10-21)` --references--> `helixPath()`  [INFERRED]
  docs/05-vergelijking-video.md → src/core/features/sweep.ts
- `Datamodel` --references--> `Sketch`  [INFERRED]
  docs/02-fase1-schetser.md → src/core/sketch/types.ts
- `Configuraties (ConfigurationManager) (2026-10-21)` --references--> `configurations()`  [INFERRED]
  docs/05-vergelijking-video.md → src/core/document/configurations.ts
- `Configuraties (ConfigurationManager) (2026-10-21)` --references--> `activeConfiguration()`  [INFERRED]
  docs/05-vergelijking-video.md → src/core/document/configurations.ts

## Import Cycles
- 3-file cycle: `src/core/assembly/assembly.ts -> src/core/features/rebuild.ts -> src/core/features/smcorners.ts -> src/core/assembly/assembly.ts`

## Communities (147 total, 30 thin omitted)

### Community 1 - "addLine"
Cohesion: 0.12
Nodes (27): block(), pin(), plate(), fastenerPart(), placeFasteners(), plate(), createDocument(), plate() (+19 more)

### Community 2 - "Id"
Cohesion: 0.02
Nodes (14): ConfigEdit, FaceRef, Library, MotionEdit, PlaneEdit, PatternInstance, BeltFeature, Decal (+6 more)

### Community 4 - "Taken - Phlippo CAD"
Cohesion: 0.03
Nodes (61): Configuraties (ConfigurationManager, video 19) (2026-10-21), Controle met de volledige playlist (58 video's, 15 u) — na de download, Curves ▸ Helix and Spiral (2026-10-21), Desktop-app (Electron) (2026-10-20, nacht), Eindcondities en sensors (video 40, 31) (2026-10-21), Extrude met Draft (video 29, LEG BASE) (2026-10-21), Fase 2: 3D-features op een solid-kern (2026-10-20), Fase 2b: Mirror, patronen, Hole Wizard, Shell, Sweep/Loft (2026-10-20, nacht) (+53 more)

### Community 5 - "solver.ts"
Cohesion: 0.07
Nodes (49): CheckDialog(), RepairSketchDialog(), SectionPropertiesDialog(), bodyCheck(), sectionProperties(), extractBlock(), entityPoints(), entityScalars() (+41 more)

### Community 6 - "store.ts"
Cohesion: 0.05
Nodes (46): AsmTool, COUPLING_MATES, DEFAULT_DECAL, DialogId, DockSide, DRAW_TOOLS, ExplodeEdit, explodeStepOf() (+38 more)

### Community 7 - "App.tsx"
Cohesion: 0.11
Nodes (35): react, App(), AppearanceDialog(), SWATCHES, BomDialog(), InterferenceDialog(), AskDialog(), ConfirmDeleteDialog() (+27 more)

### Community 8 - "useStore"
Cohesion: 0.15
Nodes (50): AltPositionPM(), AuxViewPM(), BalloonLayoutIcon(), BrokenOutPM(), ConfigSelect(), DetailViewPM(), DrawingDimensionPM(), DrawingViewPM() (+42 more)

### Community 9 - "document/types.ts"
Cohesion: 0.07
Nodes (40): comp(), BaseFlangeFeature, ClosedCornerFeature, CombineFeature, Component, ConvertSheetFeature, CornerReliefFeature, CrossBreakFeature (+32 more)

### Community 10 - "drawopts.mjs"
Cohesion: 0.13
Nodes (14): afront, asmDrw, det2, dim, dimAfter, dimEl, drw, errors (+6 more)

### Community 11 - "icons.tsx"
Cohesion: 0.10
Nodes (29): AssemblyTreeBody(), MATE_ICON, featureIcon(), FeatureTreeBody(), STATUS_LABEL, DimXpertManagerBody(), DisplayManagerBody(), Sensor (+21 more)

### Community 12 - "MenuBar.tsx"
Cohesion: 0.26
Nodes (14): desktop(), DesktopFile, getDocumentPath(), isDesktop(), setDocumentPath(), download(), KCAD_FILTERS, MenuBar() (+6 more)

### Community 13 - "SketchPoint"
Cohesion: 0.16
Nodes (6): ToolId, arcPoly(), slotGeometry(), ToolController, dist(), SketchPoint

### Community 14 - "PropertyManager.tsx"
Cohesion: 0.09
Nodes (38): APPLY_TOOLS, DetailedPreviewButton(), dimFavs(), Header(), HOLE_SIZES, HOLE_TYPES, holeSubtypePatch(), HoleTypeIcon() (+30 more)

### Community 15 - "Viewport.tsx"
Cohesion: 0.13
Nodes (24): isCommandActive(), planeLabel(), ConfirmationCorner(), viewDisplayName(), ViewSelector(), InsertRotateBar(), extrudeCapOf(), Instant3DHandle() (+16 more)

### Community 16 - "ref_node_fs"
Cohesion: 0.04
Nodes (25): [dir, first, last, prefix], b64, [file, x, y, w, h, out], doc, errors, results, errors, results (+17 more)

### Community 17 - "playwright"
Cohesion: 0.04
Nodes (24): b64, [inp, out, x, y, w, h, sc = '3'], logs, logs, errors, results, errors, sw (+16 more)

### Community 18 - "configurations.ts"
Cohesion: 0.10
Nodes (44): Configuraties (ConfigurationManager) (2026-10-21), fmt(), ModifyConfigurationsDialog(), DesignStudyDialog(), evaluate(), Output, EquationsDialog(), fmt() (+36 more)

### Community 19 - "edit.ts"
Cohesion: 0.14
Nodes (36): addPiece(), arcAngles(), chainOf(), circularSketchPattern(), circumcentre(), convertPolylines(), copyEntities(), cornerTrim() (+28 more)

### Community 20 - "tools.ts"
Cohesion: 0.08
Nodes (34): PlaneId, OverlayProps, PreviewItem, SceneColors, SceneInput, contourCache, PointerInfo, regionAt() (+26 more)

### Community 21 - "rebuild.ts"
Cohesion: 0.10
Nodes (44): three-mesh-bvh, SketchBasedFeature, matchEdge(), holeTool(), mirrorGeometry(), patternInstances(), rotatedAbout(), translated() (+36 more)

### Community 22 - "Vergelijking met de video (lokale sessie, 2026-10-20)"
Cohesion: 0.08
Nodes (23): Doorgevoerd in de lokale sessie (2026-10-20, avond), Eindcondities Up To Next / Up To Surface / Offset From Surface (video 40) (2026-10-21), Evaluate en bestanden (2026-10-20, nacht), Fase 2 (2026-10-20, avond): 3D-features, Fase 3: Equations en Global Variables (2026-10-20, nacht), Fase 4: Assemblies (2026-10-20, nacht), Fase 5: Tekeningen (2026-10-21, nacht), Functionele fouten gezien tijdens het vastleggen (+15 more)

### Community 23 - "package.json"
Cohesion: 0.09
Nodes (22): author, description, main, name, private, type, version, concurrently (+14 more)

### Community 24 - "sketch/types.ts"
Cohesion: 0.13
Nodes (22): LibraryItem, Block, insertBlock(), dimensionForSelection(), isCircular(), LABELS, RelationOption, relationsForSelection() (+14 more)

### Community 25 - "model.ts"
Cohesion: 0.15
Nodes (20): plate(), docWithSquare(), copyEntitiesKeep(), fullyDefineSketch(), addArc(), addCircle(), addConic(), addConstraint() (+12 more)

### Community 26 - "sheetmetal.ts"
Cohesion: 0.12
Nodes (29): base, P, vol(), baseFlangeGeometry(), baseFlangeRegion(), bendAllowance(), bendTableK(), cross() (+21 more)

### Community 27 - "features.mjs"
Cohesion: 0.09
Nodes (14): arrowInput, boxTris, c2, drift, eqInputs, errors, faces, mv (+6 more)

### Community 28 - "bodyScene.ts"
Cohesion: 0.13
Nodes (13): DisplayStyle, BodyEntry, BodyScene, BodySceneInput, boxUVs(), LIGHTING, woodTexture(), featureEdges() (+5 more)

### Community 29 - "camera.ts"
Cohesion: 0.15
Nodes (12): customPlanes, normalToView(), PlaneBasis, PLANES, Q(), REFERENCE_PLANES, ReferencePlaneId, registerPlanes() (+4 more)

### Community 30 - "surfaces.ts"
Cohesion: 0.13
Nodes (35): toSketch(), resolvePlaneDef(), jogOnBody(), miterFlangeOnBody(), positionShift(), sheetLineFrame(), sketchedBendOnBody(), sliceMeshLoops() (+27 more)

### Community 31 - "annotations.ts"
Cohesion: 0.18
Nodes (19): lengthDecimals(), dimensionDrawing, dimensionDrawingBase(), entityAnchor(), entityFrame(), fmt(), GlyphDrawing, glyphDrawings() (+11 more)

### Community 32 - "assembly.ts"
Cohesion: 0.12
Nodes (27): AssemblyRebuild, componentBody(), flipWinding(), handMatrix(), matrixToTransform(), mergedCache, partCache, partRebuild() (+19 more)

### Community 33 - "Ribbon.tsx"
Cohesion: 0.20
Nodes (20): startEmptyView(), LifecycleTab(), AnnotationTab(), SheetFormatTab(), ViewLayoutTab(), ASSEMBLY_TABS, BigButton(), BigProps (+12 more)

### Community 34 - "newId"
Cohesion: 0.20
Nodes (26): addComment(), comps(), copyWithMates(), downloadText(), insertNewAssembly(), insertNewPart(), makeMultibodyPart(), mirrorComponents() (+18 more)

### Community 35 - "three"
Cohesion: 0.09
Nodes (40): three, faceOf(), loopOf(), Pick, SelectionToolbar(), isRoundFeature(), MiterFlangeFeature, bodyEdges() (+32 more)

### Community 36 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, concurrently, cross-env, electron, electron-builder, jsdom, playwright, @types/node (+8 more)

### Community 37 - "sweep.ts"
Cohesion: 0.18
Nodes (22): isReferencePlane(), featureGeometry(), guideNormalToProfiles(), centroid(), pointInPolygon(), polyArea(), sketchRegions(), ccw() (+14 more)

### Community 38 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, isolatedModules, jsx, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+7 more)

### Community 39 - "sketchtools2.mjs"
Cohesion: 0.16
Nodes (11): click(), count(), errors, fly(), hd, K(), P(), pc (+3 more)

### Community 40 - "getPref"
Cohesion: 0.13
Nodes (27): PrefCheck(), fmtNum(), loadCustom(), MaterialDialog(), saveCustom(), STRESS, TABS, APPEARANCE_TREE (+19 more)

### Community 41 - "evaluate.tsx"
Cohesion: 0.19
Nodes (19): fmt(), LEN_UNITS, loadMassOpts(), MASS_UNITS, MassOpts, MassPropertiesDialog(), MeasureDialog(), MeasureLine (+11 more)

### Community 42 - "rect3.mjs"
Cohesion: 0.15
Nodes (10): clicks(), errors, fourth, lens, nr, P(), results, solid (+2 more)

### Community 43 - "materials.ts"
Cohesion: 0.29
Nodes (5): findMaterial(), m(), MATERIAL_LIBRARY, MaterialCategory, MaterialDef

### Community 44 - "Document"
Cohesion: 0.11
Nodes (8): DrawingEdit, InsertGhost, Configuration, Equation, Document, DrawingSymbol, DrawingView, DrawingViewType

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
Cohesion: 0.12
Nodes (22): Interference, InterferenceOptions, RevolveFeature, channel(), applyShell(), applyShellFromHistory(), applyShellOutward(), BuildHistory (+14 more)

### Community 52 - "Onderzoek: workflow en lay-out van moderne parametrische CAD"
Cohesion: 0.18
Nodes (10): 1. Globale schermindeling (alle drie de pakketten komen overeen), 2. Sketch-workflow, 3. Constraint-solver, 4. Navigatie en sneltoetsen (conventies), 5. Feature-modelleren (fase 2, ter voorbereiding), 6. UI-componenten, 7. Bronnen, Dimensies (+2 more)

### Community 53 - "annotations.mjs"
Cohesion: 0.18
Nodes (7): asm, errors, front, items, results, tek, toPx()

### Community 54 - "DrawingExtras.tsx"
Cohesion: 0.34
Nodes (13): DRAWING_BLOCKS, drawingToolClick(), Frame(), GeneralTableDialog(), insertBlock(), insertModelInView(), LinearNotePatternDialog(), RelativeViewDialog() (+5 more)

### Community 55 - "analysis.ts"
Cohesion: 0.18
Nodes (18): cylinderAxis(), leastSquares(), smallestEigenvector(), bvhCache, bvhOf(), curvatureAnalysis(), curvatureColor(), DRAFT_COLORS (+10 more)

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

### Community 70 - "motion.ts"
Cohesion: 0.11
Nodes (30): EMPTY, MotionManager(), MotionPlot(), recordAnimation(), componentMatrix(), localRef(), assemblyHoles(), Id (+22 more)

### Community 71 - "sheet.ts"
Cohesion: 0.05
Nodes (86): arrow(), arrowHead(), directionFrom(), DrawingSheetView(), newSymbolId(), orientationFor(), PAPER, sheetToViewLocal() (+78 more)

### Community 72 - "planes.ts"
Cohesion: 0.14
Nodes (15): basePlate(), base, vol(), cross(), dot(), norm(), planeOnFace(), REFERENCE_PLANE_DEFS (+7 more)

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
Cohesion: 0.47
Nodes (8): RefGeometry, axisCandidate(), pointCandidate(), refGeometryFrom(), refGeometryLines(), T(), V(), circleOfEdge()

### Community 96 - "motion.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

### Community 97 - "vitest"
Cohesion: 0.22
Nodes (8): vitest, ExtrudeFeature, SketchFeature, cube(), neutral, oneFace, twoBoxes(), meshVolume()

### Community 101 - "Merken en auteursrecht: wat mag wel en niet lijken op het origineel"
Cohesion: 0.40
Nodes (4): Merken en auteursrecht: wat mag wel en niet lijken op het origineel, Praktische regels voor dit project, Wat in Europa vrij is om na te maken, Wat wél beschermd is en vermeden moet worden

### Community 102 - "dependents.ts"
Cohesion: 0.38
Nodes (6): DeleteDependents, featureDependents(), geometricChildren(), Id, sketchOf(), TrialBody

### Community 103 - "prefs.ts"
Cohesion: 0.19
Nodes (16): ColorList(), OptionsDialog(), appliedTokens, applyColorScheme(), Category, COLOR_SCHEME_ITEMS, Control, current (+8 more)

### Community 105 - "Lokaal werken met Claude Code (Windows)"
Cohesion: 0.50
Nodes (3): Desktop-app (2026-10-20), Geïnstalleerde app (2026-10-21), Lokaal werken met Claude Code (Windows)

### Community 109 - "viewlayout.mjs"
Cohesion: 0.12
Nodes (11): asm, aux, click(), errors, front, nl, nrm, results (+3 more)

### Community 110 - "ExtrudeHandle.tsx"
Cohesion: 0.27
Nodes (7): getPlane(), sketchToWorld(), worldToSketch(), ExtrudeHandle(), rgba(), SketchScene, sketchBounds()

### Community 111 - "deletekey3.mjs"
Cohesion: 0.40
Nodes (3): doc, logs, t0

### Community 112 - "fasteners.ts"
Cohesion: 0.19
Nodes (12): MateEdit, AsmHole, FASTENER_NAMES, FastenerSlot, fastenerSlots(), FastenerType, Id, LENGTHS (+4 more)

### Community 113 - "keys.mjs"
Cohesion: 0.29
Nodes (6): check(), errs, keys, part, results, run()

### Community 114 - "filletopts.mjs"
Cohesion: 0.20
Nodes (5): errors, pickTopEdges(), results, topLongEdges(), undo()

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

### Community 124 - "splitline.ts"
Cohesion: 0.29
Nodes (10): PlaneDef, CreaseSegment, Region, THROUGH_ALL, inPoly(), insideSplit(), onOriginal(), splitBodySurface() (+2 more)

### Community 125 - "assembly2.mjs"
Cohesion: 0.33
Nodes (3): asm, errors, results

### Community 126 - "Architectuurschets"
Cohesion: 0.20
Nodes (9): Architectuurschets, Bekende beperkingen (fase 1), Datamodel, Demo (± 2 minuten), Fase 1 — 2D-schetser met constraint-solver, Solver, Tests, UI-conventies (docs/01-research.md en docs/03-vergelijking-solidworks.md) (+1 more)

### Community 131 - "asmoptions.mjs"
Cohesion: 0.22
Nodes (3): errors, pin, results

### Community 133 - "triad.mjs"
Cohesion: 0.29
Nodes (6): errors, pick(), pin, results, rozet, S()

### Community 134 - "thread.ts"
Cohesion: 0.39
Nodes (7): helixRings(), METRIC_THREADS, nearestThread(), threadPreviewCurves(), threadProfile(), ThreadSpec, threadTool()

### Community 135 - "text.ts"
Cohesion: 0.36
Nodes (7): cache, capRatio(), caps, dedupe(), font(), fonts, textOutlines()

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

### Community 141 - "Hud.tsx"
Cohesion: 0.53
Nodes (5): Hud(), HudButton(), VIEW_LABEL, ViewGrid(), ViewIcon()

### Community 142 - "multibody.test.ts"
Cohesion: 0.53
Nodes (5): extrudeF(), sketchF(), square(), twoBlocks(), vol()

### Community 143 - "stl.test.ts"
Cohesion: 0.70
Nodes (3): exportStl(), geometryFromPositions(), parseStl()

### Community 144 - "look-deurkruk-sel.mjs"
Cohesion: 0.50
Nodes (3): asm, errors, rows

### Community 145 - "look-ian.mjs"
Cohesion: 0.50
Nodes (3): asm, drw, errors

## Knowledge Gaps
- **10 isolated node(s):** `@types/node`, `@types/react`, `@types/react-dom`, `@types/three`, `concurrently` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1187 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **30 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `playwright` connect `playwright` to `instant3d.mjs`, `asmoptions.mjs`, `triad.mjs`, `dialogopts.mjs`, `motion2.mjs`, `drawopts.mjs`, `_dbg.mjs`, `dwgopts.mjs`, `sectionopts.mjs`, `ref_node_fs`, `look-deurkruk-sel.mjs`, `look-ian.mjs`, `package.json`, `features.mjs`, `sketchtools2.mjs`, `rect3.mjs`, `full.mjs`, `assembly.mjs`, `configurations.mjs`, `annotations.mjs`, `componentpattern.mjs`, `drawing.mjs`, `endconditions.mjs`, `fixes1.mjs`, `annotations2.mjs`, `annotations3.mjs`, `deletekey2.mjs`, `ellipsetext.mjs`, `multibody.mjs`, `rib.mjs`, `arcslot.mjs`, `asmcut.mjs`, `draftcheck.mjs`, `editcomponent.mjs`, `explode.mjs`, `hem.mjs`, `sheetmetal.mjs`, `sketchtools.mjs`, `surfaces.mjs`, `thickness.mjs`, `corners.mjs`, `deletekey.mjs`, `helix.mjs`, `section.mjs`, `sketch3d.mjs`, `unfoldfold.mjs`, `uptobody.mjs`, `drawingfix.mjs`, `confirmdelete.mjs`, `motion.mjs`, `slot.mjs`, `thread.mjs`, `wrap.mjs`, `jogmiter.mjs`, `viewlayout.mjs`, `deletekey3.mjs`, `keys.mjs`, `filletopts.mjs`, `drawing2.mjs`, `misc7.mjs`, `doorhandle.mjs`, `clickall.mjs`, `features2.mjs`, `sheetmetal2.mjs`, `assembly2.mjs`?**
  _High betweenness centrality (0.191) - this node is a cross-community bridge._
- **What connects `@types/node`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `State` be split into smaller, more focused modules?**
  _Cohesion score 0.00975609756097561 - nodes in this community are weakly interconnected._
- **Why does `State` connect `State` to `SelectionItem`, `Id`, `ComponentPattern`, `Circle2D`, `solver.ts`, `store.ts`, `useStore`, `document/types.ts`, `MenuBar.tsx`, `SketchPoint`, `Viewport.tsx`, `DrawingSheet`, `tools.ts`, `sketch/types.ts`, `sheetmetal.ts`, `annotations.ts`, `assembly.ts`, `evaluate.tsx`, `Document`, `sheet.ts`, `prefs.ts`, `fasteners.ts`?**
  _High betweenness centrality (0.161) - this node is a cross-community bridge._
- **Should `addLine` be split into smaller, more focused modules?**
  _Cohesion score 0.11690821256038647 - nodes in this community are weakly interconnected._
- **Why does `three` connect `three` to `addLine`, `solver.ts`, `store.ts`, `App.tsx`, `thread.ts`, `document/types.ts`, `text.ts`, `icons.tsx`, `Hud.tsx`, `multibody.test.ts`, `Viewport.tsx`, `stl.test.ts`, `tools.ts`, `rebuild.ts`, `package.json`, `sheetmetal.ts`, `bodyScene.ts`, `camera.ts`, `surfaces.ts`, `assembly.ts`, `newId`, `sweep.ts`, `evaluate.tsx`, `solid.ts`, `analysis.ts`, `motion.ts`, `sheet.ts`, `planes.ts`, `refgeom.ts`, `vitest`, `ExtrudeHandle.tsx`, `fasteners.ts`, `ao.ts`, `section.ts`, `splitline.ts`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Should `Id` be split into smaller, more focused modules?**
  _Cohesion score 0.023809523809523808 - nodes in this community are weakly interconnected._