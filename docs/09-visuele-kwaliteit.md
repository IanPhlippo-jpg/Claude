# Visuele kwaliteit: metingen en keuzes (0.3.3)

Ian: "SOLIDWORKS ziet er veel hogere resolutie en kwaliteit uit, onze versie is versimpeld." Dit document legt vast wat
gemeten is en wat veranderde. Alle vergelijkingen staan in `e2e-out/compare-*.png` (gegenereerd door
`e2e/look-extrudepm.mjs`, `e2e/look-sketchribbon.mjs`, `e2e/tune-light.mjs`).

## Weergave (3D)

| Meting (frame f_0118, BasePlate in Trimetric) | SOLIDWORKS | Phlippo vóór | Phlippo nu |
|---|---|---|---|
| bovenvlak | 219 | 213 | 218 |
| groot zijvlak (voor) | 240 | 235 | 241 |
| smal zijvlak (rechts) | 218 | 171 | 219 |
| achtergrond | 252/255/251 (jpeg) | 255 → 245 verloop | 252 effen |
| donkerste randpixel | 22 | 73 (GL-lijn 1 px, grijs door AA) | 0 (LineSegments2, 1,5 px, alphaToCoverage) |

Belichting: `LIGHTING` in `bodyScene.ts` (key [-0.2, 0.15, 0.97] × 3.0, fill [0.9, 0.1, 0.4] × 0.72, ambient 1.05),
gevonden met `CANDIDATES='[…]' node e2e/tune-light.mjs` en PIL-sampling op de geprojecteerde vlakmiddens.
Randen: `Shaded With Edges` tekent de randen en silhouetten als vette lijnen (`LineSegments2`, `edgeMat2`); de
HLR-stijlen houden de GL-lijnen (gestreepte verborgen lijnen).

## Iconen

De SOLIDWORKS-iconen zijn isometrische grijze solids met teal-blauwe featurevlakken en donkere omtrek (palet gemeten:
(224,224,224)/(192,192,192) grijs, (96–128,144–176,160–192) teal, (48,48,48) omtrek). Eigen ontwerpen in dezelfde taal:

- `src/ui/icons3d.tsx`: iso-toolkit (`Box`, `Cyl`, `Hole`, `iso()`), Features-tab (Extrude, Cut, Revolve, Sweep, Loft,
  Boundary, Hole, RevolveCut, SweepCut, LoftCut, BoundaryCut, Fillet, Chamfer, Pattern, CircularPattern, Rib, Draft,
  Shell, Wrap, Intersect, Mirror, RefGeometry, Curves, Instant3D), Part + ConfigBadge, manager-tabs, heads-up
  (Fit, ZoomArea, Previous, Section, Orientation, DisplayStyle, Eye, Appearance, Scene, ViewSettings), PM-glyphs
  (ReverseDir, DirArrow, Depth "D1"). ViewBox 2.4–21.6 zodat de solids het vak vullen zoals in het lint van SW.
- `src/ui/iconsSketch.tsx`: Sketch-tab als teal lijnwerk met vierkante eindpunten (Line … Point, ExitSketch,
  SmartDimension, TrimEntities, ConvertEntities, OffsetEntities, OffsetOnSurface, MirrorEntities, SketchPattern,
  MoveEntities, DisplayRelations, RepairSketch, QuickSnaps, RapidSketch, Instant2D, ShadedContours).
- Dezelfde iconen in lint, FeatureManager en PM-kop (zoals SW); `featureIcon.tsx` kiest de cut-varianten.

## Lint en panelen

- CommandManager: labels breken af op 58 px (lange woorden verbreden de knop), groepen 3 px, iconen 26 px (groot) /
  20 px (schetsraster) — gemeten tegen f_0070/f_0118.
- PropertyManager: Reverse Direction-knop en richtingspijl, D1-glyph bij de diepte, kop-icoon 22 px, spinknoppen met
  massieve driehoekjes op een lichtgrijze strook, manager-tabs grijs met de actieve wit.
- Titelrij: Search Commands als donkere tegel die het zoekveld opent, persoon-icoon (aanmelden), grijze "?"; thema en
  toetsenbord staan in de menu's.

## Niet overgenomen

Z-omhoog: de tutorialvideo gebruikt de Z-up-weergave (triade met Z boven); SOLIDWORKS' standaard is Y-up en dat blijft
onze standaard. De Y-up/Z-up-schakelaar in het Orientation-venster staat op de lijst (blok G).
