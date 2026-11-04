# rebuild.ts gesplitst (QA 0.5.11 F134, plan P3-2)

`src/core/features/rebuild.ts` ging van 3390 naar 2274 regels (telling van `tools/line-budget.cjs`); de cap daar zakte
in dezelfde wijziging van 3398 naar 2280. Werkwijze volgens het splitsplan in `docs/28-qa-0.5.10.md`: de takken van de
feature-lus in `rebuildDocument` verhuisden ongewijzigd naar eigen modules, naar het voorbeeld van `fasteningBuild.ts`.

## Modules

| Module | Regels | Inhoud (takken van de feature-lus, in hun oude volgorde) |
|---|---|---|
| `sheetMetalBuild.ts` | 563 | `buildSheetMetal`: Base Flange, Miter Flange/Jog/Sketched Bend, Edge Flange/Hem, Unfold/Fold, Flat Pattern, Cross Break, Closed Corner, Corner Relief, Lofted Bend, Vent, Form Tool, Gusset, Tab and Slot, Rip, Swept Flange, Convert to Sheet Metal |
| `frameBuild.ts` | 168 | `buildFrame`: Structural Member, Trim/Extend, End Cap, Weld Gusset/Fillet Bead |
| `surfaceBuild.ts` | 453 | `buildSurfaceFeature`: Split Line (silhouet/doorsnede en schets), Projected Curve (schets op schets en op lichaam), Wrap (spline en gewoon), de surface-features |
| `buildContext.ts` | 48 | `BuildContext`: wat `rebuildDocument` doorgeeft |

## Hoe

- `rebuildDocument` maakt vóór de lus één `ctx: BuildContext` met de containers van de rebuild (`bodies`, `errors`,
  `warnings`, `curves`, `consumedSketches`, `surfaceBodies`, `splits`, `history`, `bodyMeta`, `bendCounts`, `hiddenIds`,
  `autoHidden`, `approxBodies`) en de closures (`addMaterial`, `removeMaterial`, `addBoss`, `newBody`, `exactOf`,
  `setExact`, `visibleBodies`, `isEmpty`) plus `K` en `doc`: dezelfde objecten, niet gekopieerd.
- In de lus staat per module één regel op de plaats van zijn eerste tak, bv.
  `if (buildSheetMetal(f, body, ctx)) continue;`. De functie geeft `true` als `f` een van haar types is (gebouwd of
  met een fout gemarkeerd), anders `false` en de lus gaat verder zoals vroeger. De types van de modules overlappen
  met geen enkele andere tak van de lus, en elke verhuisde tak eindigde met `continue`; de volgorde van de stappen
  per feature is dus dezelfde.
- Mechanische wijzigingen, verder niets: een `continue` van de feature-lus werd `return true` (een `continue` in een
  binnenlus bleef staan), één inspringniveau minder, en de twee `let`s van de sheet-metal-basis (`sheet`,
  `unfolded`) staan nu op de context (`ctx.sheet`, `ctx.unfolded`), omdat enkel de sheet-metal-takken ze lazen of
  schreven. Elke functie haalt bovenaan de helpers die ze gebruikt uit `ctx` (`const { doc, errors, … } = ctx;`),
  zodat de code van de takken letterlijk dezelfde namen gebruikt.
- Wat de modules van `rebuild.ts` nodig hebben was al geëxporteerd (`jogOnBody`, `miterFlangeOnBody`,
  `sketchedBendOnBody`, `edgeFlangeOnBody`, `hemAsFlange`, `flangeParams`, `crossBreakLines`, `Body`, `ExactJog`,
  `ExactMiter`); niets werd hernoemd. De import van `rebuild.ts` vanuit `sheetMetalBuild.ts` is een kringimport van
  functies die pas bij een rebuild worden opgeroepen, niet bij het laden.
- Controle: na de verhuizing is elke tak in de nieuwe modules, met de drie mechanische wijzigingen teruggedraaid,
  letterlijk een stuk van de oude `rebuild.ts` (27/27 takken).

## Nog open uit het splitsplan

`patternBuild.ts` (mirror en de patronen), `brepTools.ts` (`brepTool`, `pickByVolume`) en `sheetmetalOnBody.ts` (de
`*OnBody`-helpers) zijn niet gedaan; ze zijn niet nodig voor de cap van 2500 en kunnen later op dezelfde manier.
