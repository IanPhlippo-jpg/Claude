# Blokken G-A t/m G-J: de laatste SOLIDWORKS-onderdelen uit de playlist-inventaris (0.3.3, 2026-10-25)

Na het QA-rapport (docs/08) en de visuele kwaliteit (docs/09) zijn de resterende onderdelen uit de inventaris van de
58 playlistvideo's (docs/07) in tien blokken ingebouwd. Elk blok heeft een eigen kernelmodule, unit tests en een
e2e-script in `e2e-out/run-regression.sh`. Alles is lokaal gecommit op `claude/fase1-schetser`.

| Blok | Wat | Kernel | e2e |
|---|---|---|---|
| G-A | kleine PM-/dialoogopties (Chamfer Vertex/Face-Face, Sweep circular + keep normal + twist, Loft centerline, Fill Pattern layouts) | round.ts, sweep.ts, patterns2.ts | ga1 (19), ga2 (16) |
| G-B | rechtsklikmenu's (feature: Comment, Parent/Child, Feature Properties, Go To, mappen, Favorites; body: transparantie, mappen, bounding box, Insert into New Part) | — | gb (32) |
| G-C | Save As STL (ASCII/binair) / 3MF / AMF met Export Options-pagina | export3d.ts | gb |
| G-D | Surfaces compleet (Filled, Ruled, Extend, Untrim, Replace Face, Delete Hole, Thickened Cut, Cut With Surface, Surface Flatten) | surfaces2.ts | gd (23) |
| G-E | Sheet Metal extra's: Vent, Forming Tool (Design Library-lijst), Gusset, Tab and Slot, Rip, Swept Flange, Simple Hole, Normal cut / Link to thickness / Optimize geometry, Insert Bends, Profile Sketch-controle | sheetmetal4.ts | ge (59) |
| G-F | Evaluate: Performance Evaluation, Symmetry Check, Deviation Analysis, Parting Line Analysis, Compare (bodies/documenten), SimulationXpress-wizard (balkschatting) | evaluate2.ts | gf (27) |
| G-G | Customize-dialoog met echte instellingen (tabs, Quick Access, shortcut bars, commando-catalogus, menu's, toetsen, muisgebaren, tooltips/lock) | commands.tsx | gg (22) |
| G-H | Weldments: profielbibliotheek ISO/ANSI, Structural Member met verstek/stuik, Trim/Extend, End Cap, Gusset, Weld Bead, cut list + Properties | weldments.ts | gh (29) |
| G-I | Material: Compressive Strength, Description/Source/Sustainability, Favorites + boommenu; MBD Dimensions (DimXpert: Auto Dimension Scheme, datums, maten, GTOL, tolerantiestatus, callouts) | dimxpert.ts | gi (29) |
| G-J | statusbalk-uitlezing, Line Properties + Insert Line-bericht, relaties-filter, Hole Wizard ANSI Inch, View ▸ Display, Up Axis Y/Z, Deform (point), Save As-opties, Publish to Phlippo Viewer (*.html), tekening bend lines/notes | deform.ts, viewerExport.ts | gj (37) |

## Keuzes die afwijken van het origineel (bewust)

- **SimulationXpress** rekent met de balkformules (buiging + afschuiving op de doorsnede van het onderdeel); het dialoogvenster
  zegt dat erbij. Een eindige-elementenoplossing hoort niet in deze kernel.
- **Sheet Metal Gusset / Forming Tool** zijn geperste vormen met de plaatdikte als wand; het "Flat Pattern Visibility"-blok
  is aanwezig maar het afwikkelen van een vorm blijft een latere stap.
- **Rip** snijdt een ribbe open met de rip-gap (beide zijden of één vlak); het echte SW-gedrag (randen splitsen voor Insert Bends)
  wordt verder door Convert to Sheet Metal (shell) gedekt.
- **Structural Member** maakt één body per recht segment; boogsegmenten volgen de rechte segmenten (Merge arc segment bodies staat
  er als optie zonder effect).
- **TolAnalyst Study** geeft een stack-up (worst case en RSS) van de DimXpert-maten, geen volledige add-in.
- **Mouse Gestures** blijven 4 richtingen (8 en 12 later); de dialoog zegt dat.
- **Publish to Phlippo Viewer** vervangt eDrawings: één HTML-bestand met een eigen canvas-viewer (draaien, pannen, zoomen,
  shaded/edges, bodies aan/uit, afstand meten tussen twee punten) zonder netwerk of installatie.
- **Deform** is het punt-type (met regio en stijfheid); Curve to curve en Surface push staan grijs.
- Niet gedaan: Baseline/Ordinate/Path Length-schetsdimensies (nieuwe dimensietypes in de solver), "Set origin on curve".

## Nieuwe testhaken en patronen

- Face-picks voor nieuwe features gaan via `setSelectedFace` in de store (branch per draft-type); e2e-scripts gebruiken `pickFace(pred)`
  met een predicaat op `normal`/`centroid`.
- `rebuild.times` (ms per feature) voedt Performance Evaluation; `rebuild.bodyMeta` (soort, omschrijving, lengte, verstekhoeken)
  voedt de cut list en het Weld Folder.
- CSG-lessen uit G-E: nooit gereedschappen met vlakken coplanair aan body-vlakken (tabs 0,02 mm dunner, forming tools starten
  net in de plaat); overlappende cut-boxen eerst met een boolean verenigen; `orientedBox` controleert op een linkshandig assenstelsel
  (anders staat de box binnenstebuiten en gedragen booleans zich omgekeerd).
