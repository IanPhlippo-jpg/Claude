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

## Tweede ronde (volledige releasepass met dump, `e2e-out/mismatch-cases2/`)

Na de fixes hierboven vond een volledige releasepass nog drie verschillen. Twee keer zat de fout in de mesh-boolean
(vlakken van het gereedschap die in vlakken van het lichaam liggen), één keer op beide kernels in de richting van de
rand en daarna in de mesh-kernel in de wet van de straal.

### 5. features2-1: CrvPattern1 boort een gat opnieuw waar TPattern1 er al een boorde

- **Fout: mesh.** Exact = 32000 − 5·π·3²·10 (gaten op x = 10, 30, 50, 70 en 40), op 0,001 mm³. De curve pattern zet
  een instantie op x = 70, waar de table pattern al een gat maakte; het mesh-lichaam hield daar een stuk van het
  gereedschap (tot y = 20, boven de plaat van 10 dik) en een open naad.
- **Oorzaak:** de cilinderwand van het gereedschap viel vlak voor vlak samen met de wand van het bestaande gat
  (dezelfde veelhoek). three-bvh-csg beoordeelt zulke samenvallende driehoeken verkeerd.
- **Fix:** `detachCoincident()` in `csg()` (`src/core/features/solid.ts`), alleen bij aftrekken: elke driehoek van het
  gereedschap die in het vlak ligt van de lichaamsdriehoek waar hij op rust (punten verspreid over de driehoek,
  afstand ≤ 1e-6 × maat, normaal evenwijdig), wordt 1e-4 mm langs de normaal van dat lichaamsvlak uit het materiaal
  geschoven. Ligt het gereedschapsvlak binnen het lichaam, dan reikt de snede zo tot net voorbij het vlak; ligt het
  erbuiten (zoals hier), dan schuift het weg van het lichaam waar het niets wegnam. Het resultaat verandert hoogstens
  1e-4 mm.
- **Test:** plaat 80 × 40 × 10 met dezelfde gaten, de table pattern en de curve pattern; volume, vorm en bbox (y ≤ 10).

### 6. filletopts-1: Variable Size fillet R2 → R8

- **Twee fouten.** (a) De mesh-kernel zette R2 aan het andere uiteinde dan de B-rep (2,49 mm verschil bij x = 0). Elke
  kernel nam de beginwaarde aan het begin van zijn eigen rand, en het mesh-lichaam en de tessellatie van het exacte
  lichaam noemen de punten van dezelfde rand in tegengestelde volgorde. Juist is de richting waarin de rand liep toen
  hij gekozen werd: die staat als `dir` in de randreferentie. (b) Daarna bleef 0,15 mm over: de mesh liet de straal
  lineair verlopen, OpenCascade (`BRepFilletAPI_MakeFillet::Add(R1, R2, E)`) niet. Uitgelezen met `GetLaw` en
  nagerekend voor drie randen (lengte 40/80/120, R oplopend en aflopend):
  r(s) = R1 + (R2 − R1)·(3s + 4(3s² − 2s³))/7 (helling 3/7 van de lineaire aan de uiteinden,
  9/7 in het midden): een vloeiende overgang, zoals de standaardkeuze "Smooth transition" van het
  referentieprogramma (de precieze wet daarvan is niet nagegaan; de B-rep-wet is hier de maat).
  De exacte inhoud volgt die wet met cirkelvormige doorsneden op 0,001 mm³:
  (1 − π/4)·L·∫r², ∫h = 1/2, ∫h² = (3 + 18 + 96/5 − 32 + 64/7)/49.
- **Fix:** `matchEdges` (`src/core/features/edgesets.ts`) geeft een rechte rand terug in de richting van zijn referentie
  (`alongRef`), dus beide kernels krijgen dezelfde begin- en eindwaarde. `roundToolsOpts`
  (`src/core/features/round.ts`) volgt `variableSize()` (dezelfde wet), in stukken van hoogstens 1/16 van de rand.
- **Test:** blok 80 × 40 × 20, de bovenrand met de referentie in beide richtingen: de straal aan x = 0 is 8 of 2 op
  beide kernels, het volume is 64000 − de gesloten vorm, en de vormen zijn gelijk.

### 7. library-1: Cut-Revolve1, de afschuining van een zeskantmoer

- **Fout: mesh.** Exact klopt met de gesloten vorm per plak (zeskant ∩ schijf met straal ρ(z) = 4,45 + z·√3, met zes
  cirkelsegmenten voorbij de vlakken). Op het mesh-lichaam bleef één hoek van de moer aan z = 0 scherp (0,67 mm).
- **Oorzaak:** de platte kant van de afschuifdriehoek ligt in het eindvlak van de moer (z = 0 en z = 5,2): de ring van
  het omwentelingsgereedschap valt samen met het eindvlak van het lichaam.
- **Fix:** dezelfde `detachCoincident()` als bij geval 5 (hier ligt het gereedschapsvlak binnen het lichaamsvlak en
  wordt het naar buiten geschoven).
- **Test:** zeskant SW 10 met een gat Ø6, dik 5,2, aan beide kanten afgeschuind onder 30°; het volume wordt per plak
  numeriek geïntegreerd (20000 plakken).

### 8. hem-1 en sheetmetal-1: Hem en Edge Flange op de bovenrand van een base flange

- **Fout: mesh.** Base flange: L-profiel 40 × 30, dikte 3, buigstraal 3, 60 diep. De rand is de buitenste bovenrand van
  de staande wand, met normalen +y (de eindvlak van 3 mm) en +x (de wand). Op het exacte lichaam stond de Edge Flange
  (90°, 32) horizontaal naar buiten (x tot 69) en lag de Hem tegen de buitenkant van de wand (x tot 43, niets boven
  y = 30), zoals het hoort: een flens buigt van de plaat af, niet van zijn dikte. Op het mesh-lichaam ging de flens
  rechtop (y tot 59) en de hem omhoog: beide stonden op het eindvlak van 3 mm. Afwijking 23 mm en 11,3 mm.
- **Oorzaak:** `sheetFaceOfEdge` kiest het grootste van de twee vlakken aan de rand, maar `planarFaces`
  (`src/core/features/solid.ts`) gaf op het mesh-lichaam geen vlak +x en ook geen onderkant −y. De facetten van de bocht
  (R3/R6, elk groter dan 0,5 % van het oppervlak) zijn vlakken die via randen onder een paar graden aan elkaar en aan
  de raakvlakken hangen. De regel "drie of meer zulke vlakken zijn één gebogen vlak" nam daarom ook de wand en de
  onderkant mee in het gebogen vlak. Op de tessellatie van het exacte lichaam zijn de bochtfacetten te klein om vlakken
  te worden, dus daar ging het goed.
- **Fix:** in die regel blijft een vlak dat meer dan 4 × de mediane oppervlakte van zijn groep heeft, een vlak: het is
  de plaat (of de wand van een sleuf) waarin het gebogen vlak raakt, geen facet ervan.
- **Test:** het mesh-lichaam van de base flange heeft een vlak +x van 24 × 60 en een vlak −y van 34 × 60 (gesloten
  vorm). Edge Flange en Hem: dezelfde vorm op beide kernels (`shapeMismatch` null, inhoud op 0,2 %), de flens met x > 60
  en y < 40, de hem met x > 42 en y = 30. De inhoud van flens en hem is hier niet in gesloten vorm nagerekend. Beide
  kernels bouwen ze met dezelfde parameters uit `edgeFlangeGeometry` (domein van F197); de fout zat alleen in de keuze
  van het vlak.
