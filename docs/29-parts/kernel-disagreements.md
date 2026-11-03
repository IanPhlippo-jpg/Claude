# Kernelverschillen uit de kruiscontrole (QA 0.5.11, F172)

De vormcontrole (`shapeDeviation`/`shapeMismatch` in `src/core/features/volumeCheck.ts`, tolerantie 0,1 mm) vond op
het releasepad (`?kernel=brep&rebuild=worker`) vier documenten waarop het mesh-lichaam en het exacte lichaam niet
dezelfde vorm hadden (`e2e-out/mismatch-cases/`). Per geval is met een gesloten vorm nagegaan welke kernel juist
bouwt; de fout zat drie keer in de mesh-kernel en één keer in de B-rep-kernel (doorhandle-3 had er twee: één per
kernel).

Regressietests: `src/qa/qaCrossCheck.test.ts`, describe "kernel disagreements found by the cross-check (QA F172)".
Elk model wordt in de test zelf opgebouwd; de B-rep-inhoud moet op 1e-3 mm³ gelijk zijn aan de gesloten vorm, de
mesh-inhoud binnen de facetmarge, `shapeMismatch(mesh, exact)` moet `null` zijn en de facetten van het exacte lichaam
moeten zijn inhoud omsluiten. Elke test is nagekeken door de fix tijdelijk terug te draaien: dan faalt hij.

## 1. doorhandle-1: verzinkt gat (Hole, countersink Ø4,5 / Ø8,4 × 90°)

- **Fout: mesh.** Exact 324,47 mm³ weggenomen = 2 × (cilinder + kegelstomp − cilinder), wat de gesloten vorm geeft;
  mesh nam één verzinking (34,7 mm³) te weinig weg en had een hoekpunt op de as van het gat, in de kegeltop
  (0, 19, 3,8) = vlak 8 − h, h = 4,2 mm.
- **Oorzaak:** `holeTool` (`src/core/features/pattern.ts`) voegde losse, elkaar overlappende schillen samen (cilinder,
  kegel met een top van straal 0) met `mergeGeometries`. Dat is geen gesloten lichaam: de boolean hield de wanden van
  de ene schil die binnen de andere lagen (de kegel bleef in het gat staan).
- **Fix:** `holeParts()` geeft de onderdelen (t0, t1, r0, r1) van een gat; beide kernels bouwen hun gereedschap
  daaruit (`brepHoleTool` in `rebuildTools.ts` gebruikt dezelfde lijst). De mesh-kernel draait nu één gesloten
  omwentelingslichaam rond de omhullende (`holeOutline`: per diepte de grootste straal, een trede waar een onderdeel
  eindigt, snijpunten van kegels), zonder driehoeken van oppervlakte nul. `hole2.test.ts` verwachtte nog de som van
  de schillen (Head clearance: π·5,5²·1); dat is nu de ring rond het gat, π·(5,5² − 3,3²)·1.
- **Test:** plaat 40 × 40 × 10 met twee verzonken gaten M4, verwacht 16000 − 2·(π·2,25²·10 + π·1,95/3·(4,2² + 4,2·2,25
  + 2,25²) − π·2,25²·1,95).

## 2. doorhandle-3: Sweep1 (buis Ø16 langs lijn + boog R25) en daarna een bol op het eind

- **Sweep, fout: mesh.** Exact = π·8²·(92 + 25·π/2) = 26393,38 mm³ (Pappus, profiel loodrecht op het pad, R > r), op
  0,001 mm³. Het mesh-eindvlak stond 0,31 mm scheef (bbox tot z = 12,69 i.p.v. 13).
- **Oorzaak:** `sweepGeometry` (`src/core/features/sweep.ts`) nam aan de uiteinden de richting van de laatste koorde
  als raaklijn; op een boog ligt die een halve stap naast de echte raaklijn, dus het eindprofiel kantelde.
- **Fix:** `arcEndTangent()`: eindigt het pad op een gelijkmatig bemonsterde boog (drie gelijke koorden die evenveel
  en om dezelfde as draaien, minder dan ~15° per stap), dan is de raaklijn aan het eind die van het volgende punt
  (centrale differentie, exact op zo'n boog) gespiegeld in de koorde ertussen. Een hoek van een polylijn houdt zijn
  koorde.
- **Bol (Revolve2), fout: B-rep.** De OCCT-vorm was juist (buis + halve bol = 26393,38 + 2144,66/2 op 0,001 mm³), maar
  zijn facetten niet: de halve bol werd plat gemesht (mesh-hoekpunt (117, 0, 5) lag 8 mm van het "exacte" oppervlak,
  de facetten omsloten 1089 mm³ te weinig).
- **Oorzaak:** `clean()` in `src/core/occt/brep.ts` (`ShapeUpgrade_UnifySameDomain` na elke boolean) voegde de twee
  meridianen waarlangs de buis de bol snijdt samen tot één rand door beide polen; het vlak werd ongeldig
  (`BRepCheck_Analyzer` false) en `BRepMesh` legde er een plat vlak in.
- **Fix:** `clean()` controleert het resultaat. Is het samengevoegde lichaam ongeldig terwijl de boolean een geldig
  lichaam gaf, dan alleen de vlakken samenvoegen (randen niet), en is ook dat ongeldig, dan het lichaam van de boolean
  zelf. De controle kost ongeveer evenveel als het samenvoegen (≈ 10 % van de fuse op dit model).
- **Test:** het pad en profiel nagebouwd, eerst de buis tegen Pappus, dan de bol erbij tegen buis + halve bol.

## 3. doorhandle-5: Cut-Extrude through all door de as van een omwentelingslichaam

- **Fout: mesh.** Exact nam profieloppervlak × 8 weg (61,93 × 8 = 495,4 mm³, het profiel is boog R3,5 + trapezium);
  mesh 30 mm³ minder en hield een hoekpunt op de as bovenaan, (0, 0, 8).
- **Oorzaak:** `revolveGeometry` (`LatheGeometry`) maakt op de as driehoeken van oppervlakte nul (twee hoekpunten in
  de pool). De boolean (three-bvh-csg) verbindt driehoeken via hun randen; via de randen van lengte nul hing de hele
  waaier rond de pool aan elkaar en droeg hij de binnen/buiten-beslissing over: vier waaierdriehoeken die volledig
  in het gereedschap lagen bleven als deksel over de snede staan.
- **Fix:** `brush()` in `src/core/features/solid.ts` laat driehoeken met twee samenvallende hoekpunten weg
  (`withoutDegenerate`) voor elke boolean; ze hebben geen oppervlakte en hun buren delen de randen onderling, dus de
  schil blijft gesloten. Dit geldt voor alle mesh-booleans (ook kegeltoppen enz.).
- **Test:** cilinder R8 × 8 als omwenteling (profiel tegen de as) met een D-vormige snede door de as tot voorbij de
  rand; verwacht π·64·8 − 8·(D-oppervlak − het deel buiten de cilinder), beide in gesloten vorm.

## 4. ge-1: Swept Flange langs de bovenrand van een plaat

- **Fout: mesh.** Beide 9480 mm³, maar de mesh-flens stond gespiegeld (lip naar x = 40, buiten de plaat), de exacte
  zoals getekend (poot op x = 27..30, lip van x = 30 naar 20 op y = 12..15). Het profiel is getekend op de plek waar
  het geveegd wordt; spiegelen is nooit juist.
- **Oorzaak:** `sweepGeometry` keerde de u-as van het profiel om als het pad tegen de normaal van het profielvlak in
  begint. Het pad komt van de rand van het lichaam; op de mesh-kernel liepen de punten van die rand de andere kant op
  (−z) dan op de exacte tessellatie (+z), dus alleen daar werd gespiegeld.
- **Fix:** die omkering is weg; het profiel blijft zoals getekend, `finish()` keert de vlakken naar buiten. (Dezelfde
  omkering staat nog in `sweepCurves` voor Swept Surface; daar is geen exacte tegenhanger die verschilt en bepaalt de
  omkering de normaalrichting van het oppervlak, dus die is niet aangeraakt.) De kant van de plaatdikte
  (`thinRegions`, reverse false) is niet gewijzigd en is op beide kernels gelijk.
- **Test:** plaat 60 × 40 × 3, profiel 12 omhoog + 10 terug op het Front Plane, flens langs de rand: 7200 +
  (3·9 + 10·3)·40 = 9480 mm³, bbox x ≤ 30 en y ≤ 15 op beide kernels; daarnaast geeft `sweepGeometry` met het pad in
  beide richtingen hetzelfde lichaam.
