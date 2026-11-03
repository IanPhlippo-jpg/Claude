# Exacte ellipsen en splines in de B-rep-kern (P1-1, F175) — QA 0.5.11, plan NAAR-100

## Wat veranderd is

- **Nieuw `src/core/occt/curves.ts`**: exacte OpenCascade-randen voor de gebogen schetsentiteiten zonder cirkelvorm.
  - Ellips en gedeeltelijke ellips: `gp_Elips` (hoofdas langs X; is de "kleine" straal groter dan de grote, dan
    worden de assen gewisseld en schuift de parameter π/2). De boog wordt op parameter gemaakt
    (`BRepBuilderAPI_MakeEdge(elips, p1, p2)`) en omgedraaid volgens draairichting en contourrichting.
  - Spline (Catmull-Rom door punten): exact als C1 kubische `Geom_BSplineCurve` (knopen 0..n-1, multipliciteit 4/2/4).
    Elk Catmull-Rom-stuk is een kubische Bézier; de tussenliggende doorgangspunten liggen precies halfweg tussen
    twee polen en vallen daardoor weg. Gecontroleerd: de curve valt samen met `sampleCatmullRom` (tot 4 decimalen
    op 17 parameters).
  - Style Spline (Bézier): één B-spline-span van graad n-1 (max. graad 25).
  - Conic/parabool: rationele kwadratische B-spline (gewichten 1, rho/(1-rho), 1).
  - Valt iets uit (graad > 25, minder dan 3 punten, eindpunt van een ellipsboog meer dan 1e-7 naast het
    schetspunt, OCCT-fout), dan blijft het oude pad: korte segmenten.
- **`src/core/occt/brep.ts`**: `entityEdges` gebruikt eerst `exactCurveEdges`; kopcommentaar bijgewerkt.
  Extrude, revolve, cut, loft (via `contourWire`) en sweep-paden (`pathWire`) krijgen zo exacte vlakken/randen.
- **`src/core/occt/step.ts`**: nieuwe `shapeVolume` (Gauss-Kronrod per knoopspan, `VolumePropertiesGK`, eps 1e-6).
  **Gevonden fout:** de standaard Gauss-integratie van replicad (`measureVolume`) zat op een spline-prisma
  8,18 mm³ naast (2869,18 i.p.v. 2861,00, 0,3 %) en op een plaat met elliptisch gat 0,02 mm³. `kernel.volume()`
  (dus `exactVolume`) en de volumes in STEP-import/-export van exacte lichamen gebruiken nu `shapeVolume`.
  Eps 1e-9 was exacter, maar de M10-draadtest liep dan > 120 s; met 1e-6 ca. 46 s (was 36 s).

## Tests (`src/qa/qaBrep.test.ts`, blok "QA F175", 9 nieuwe tests)

| test | gemeten (B-rep) | verwacht |
|---|---|---|
| ellips a=20, b=10, extrude 10 | 6283,185307 | π·20·10·10 = 6283,185307 |
| idem gedraaid (0,5 rad, ander middelpunt) | 6283,185307 | idem |
| ellips met kleine straal 25 > 20 | 15707,963268 | π·20·25·10 |
| plaat 80×60×10 met elliptisch gat (30° gedraaid), through all | 41716,814885 | 41716,814693 (verschil 1,9e-4) |
| halve ellips + lijn, ccw en cw | 3141,592654 | π·20·10·10/2 |
| kwart ellips + 2 stralen | 1570,796327 | π·20·10·10/4 |
| halve ellips 5 mm naast de as, revolve 360° | 18247,184811 | Pappus: πab/2 · 2π(5 + 4b/3π) |
| spline (5 punten) + lijn, extrude 10 | 2861,000000 | fijne integratie (20000 samples) 2861,000; mesh-kern 2859,53 |
| Style Spline + lijn | 2011,428571 | fijne integratie, < 1e-3 |
| conic rho 0,4 + lijn | 2216,377757 | fijne integratie, < 1e-3 |

Bij de drie curve-tests wordt ook gecontroleerd dat de fout van de gesegmenteerde benadering met 8, 32 en 128
segmenten telkens meer dan 8× kleiner wordt (≈ 1/n²) en dat het mesh-kernvolume binnen die facetmarge ligt.

STEP-export (`shapesToStep`): het ellipslichaam heeft 3 ADVANCED_FACE, 3 EDGE_CURVE en `ELLIPSE(`-curves; het
splinelichaam 4 ADVANCED_FACE, 6 EDGE_CURVE en `B_SPLINE_CURVE_WITH_KNOTS(`. Geen polylijn. Beide lezen terug met
hetzelfde volume (< 1e-3).

## Uitvoer

- `npx vitest run src/qa src/core/occt`: 7 bestanden, 86 tests groen (73,8 s). In een eerdere run, terwijl
  andere agenten tegelijk tests draaiden, faalden "structural member ... builds quickly" (6,7 s > 5 s, belasting) en
  T4 arc in het nog niet ingecheckte `qaNaming.test.ts`; los opnieuw gedraaid zijn beide groen.
- `npx tsc --noEmit -p tsconfig.app.json`: 0 fouten. `node tools/line-budget.cjs`: ok.
  `node tools/neutral-comments.cjs`: 0 vervangingen.

## Niet gedaan / open

- De mesh-kern is niet aangeraakt (spline 12 segmenten per span, ellips 48/96).
- Ellipsbogen waarvan het eindpunt meer dan 1e-7 mm naast de ellips ligt (solver-restfout), vallen terug op
  segmenten: daarvoor zijn tolerante vertices nodig (`BRep_Builder.UpdateVertex` zit niet in de binding).
- Een volledige ellips negeert de contourrichting (zoals de cirkel); `MakeFace` corrigeert de oriëntatie.
- `solids()` sorteert nog met de snelle `measureVolume` (alleen voor de volgorde).
