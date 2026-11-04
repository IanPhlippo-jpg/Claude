# Plaatwerk en frames tegen de normformules (pariteitsrijen 19 en 20, P1-6 en P2-11) — QA 0.5.11, plan NAAR-100

## Plaatwerk: formules

Hoek θ = de buighoek (afbuiging, 90 voor een haakse flens), R = binnenstraal, T = dikte, K = K-factor.

| grootheid | formule | code |
|---|---|---|
| bend allowance | BA = (π/180)·θ·(R + K·T) | `bendAllowance()` (`sheetmetal.ts`) |
| outside setback | OSSB = (R + T)·tan(θ/2) | `outerSetback()` |
| inside setback | ISSB = R·tan(θ/2) | `innerSetback()` (nieuw) |
| bend deduction | BD = 2·OSSB − BA | `bendDeduction()` (nieuw) |
| uitslag | Σ benen tot de buitenste virtuele snijpunten − Σ BD = Σ rechte stukken tussen de raaklijnen + Σ BA | `flatLength()`, `sheetMapping().length` |

Bend Allowance-type "Bend Allowance" (BA per 90°, evenredig met θ), "Bend Deduction" (BD per 90°, uitslag = benen − BD)
en "Bend Table" (K uit R/T) lopen via dezelfde `bendAllowance()`.

## Plaatwerk: gemeten (`src/core/features/sheetmetalFormulas.test.ts`, 16 tests, alles binnen 0,01 mm)

| bocht | BA | OSSB | BD | L-flens 60 + 50 (schets = buitenkant) | strip 100 + edge flange 30 (Material Inside) |
|---|---|---|---|---|---|
| 90° R1 T2 K0,5 | 3,14159 | 3,00000 | 2,85841 | 107,14159 | 127,14159 |
| 90° R2 T1,5 K0,44 | 4,17832 | 3,50000 | 2,82168 | 107,17832 | 127,17832 |
| 120° R3 T2 K0,4 | 7,95870 | 8,66025 | 9,36180 | 100,63820 | 120,63820 |

- Base flange: `flatLength`, `sheetMapping().length`, de echt uitgevouwen mesh (`unfoldGeometry`) en de Flat-Pattern in de
  rebuild geven alle drie 110 − BD; met het materiaal aan de andere kant (schets = binnenkant) 110 − 2·ISSB + BA.
- Edge flange 90°, Material Inside, lengte 30 tot het buitenste virtuele snijpunt: gevouwen onderdeel 100 × 30, uitslag
  100 + 30 − BD. Material Outside (bocht begint aan de rand): (100 + OSSB) + 30 − BD.
- Flenslengte tot het virtuele snijpunt (F124): bij Outer/Inner Virtual Sharp ligt het verste punt van het been precies 30
  van het buitenste resp. binnenste snijpunt, ook bij 120°.
- Zoom (hem): gesloten (R ≈ 0,01, Material Inside) uitslag = 100 + L + π·(R + K·T) − (R + T); open (spleet 2 → R 1,
  Material Outside) 100 + L + π·(1 + K·T). De zoomlengte telt vanaf het einde van de bocht (Tangent Bend).
- Bend Deduction 3,1 en Bend Allowance 4,5: uitslag 106,9 resp. 110 − 2·3,5 + 4,5.

### Fouten gevonden en opgelost

1. **Uitvouwen negeerde het Bend Allowance-type** (`unfold.ts`): `sheetMapping` rekende altijd met R + K·T, ook als
   Bend Allowance, Bend Deduction of Bend Table gekozen was. Nu `BA = bendAllowance(...)` en de neutrale straal BA/θ.
   Met BD 3,1 gaf de uitslag 107,18 i.p.v. 106,90.
2. **`flatLength` ging altijd van de buitenkant uit**: bij een base flange met het materiaal aan de andere kant (Reverse
   direction, schetslijnen = binnenkant) trok hij 2·OSSB af i.p.v. 2·ISSB (bij 90° R2 T1,5: 3 mm te kort). Nu kiest hij per
   bocht de juiste setback; `flatPatternGeometry` en de rebuild (Flat-Pattern met edge flanges) geven `reverse` door.

### Open (niet gewijzigd)

- "Material Outside" bouwt de flens zoals "Bend Outside" (bocht begint aan de rand). In het referentieprogramma ligt bij
  Material Outside de binnenkant van de flens op de rand (plaat R korter dan bij Bend Outside). Bestaande tests, e2e en
  B-rep-tests gaan van het huidige gedrag uit; aanpassen raakt `flangeSetback` en `edgeFlangeGeometry`.
- De positie "Bend from Virtual Sharp" bestaat niet als aparte keuze; Material Inside zet het buitenste virtuele snijpunt op
  de rand (bij 90° hetzelfde).
- De Flat-Pattern met edge flanges is een rechthoekige plaat: de verlengingen worden in de lengterichting opgeteld,
  ook voor een flens op een zijrand.

## Frames: profielbibliotheek (eigen tabellen uit de normen)

- Koudgevormde kokers EN 10219-2 met hoekstralen ro/ri = 2t/t (t ≤ 6), 2,5t/1,5t (t ≤ 10), 3t/2t: alle ISO-kokers,
  nieuw 40 × 40 × 3 en 50 × 30 × 3.
- IPE EN 10365 met wortelstraal r (IPE 80: 5, 100: 7, 120: 7, 160: 9).
- Hoekstaal EN 10056-1 met r1/r2 (25×25×3: 3,5/2; 40×40×4: 6/3; 50×50×5: 7/3,5; 75×75×8: 10/5).
- C-profielen = UPN 80/100/120 (EN 10279) met evenwijdige flenzen van de gemiddelde flensdikte (doorsnede binnen 0,4 %).
- Stralen zijn echte bogen in de B-rep (`profileLoops`), 8 koorden per kwart in de mesh (`profileRegion`).

Doorsnede (polygoon waaruit het lichaam gebouwd wordt) tegen de normtabel, allemaal ≤ 1 %: koker 40×40×3 en 50×30×3
4,21 cm², 40×40×4 5,35 cm², IPE 100 10,3 cm², UPN 80 11,0 cm², L 40×40×4 3,08 cm², buis 48,3×4,0 5,57 cm².
Zonder stralen lag de koker 40×40×4 7,7 % te hoog en IPE 100 4 % te laag.

## Frames: cut list (`src/core/features/weldmentsCutList.test.ts`, 13 tests)

- Lengte in de cut list = de lengte van het lid langs zijn as na de hoekbehandeling (`MemberBuild.length`, via
  `axialExtent`); de padlengte staat apart in `pathLength`. Bij verstek telt de lange kant.
- Frame 400 × 300 buitenmaat van koker 40 × 40 × 3 (pad 360 × 260 door het midden): End Miter 400, 300, 400, 300 (45°);
  End Butt1 2 × 400 en 2 × 220; End Butt2 2 × 300 en 2 × 320; End Butt1 met lasspleet 2: 2 × 400 en 2 × 216.
  Geen overlap tussen de leden, buitenmaat 400 × 300.
- End cap: buitenwaarts 5 dik met de buitenkant op 105 (eind 100), binnenwaarts vlak met het eind (95..100); offset 3
  maakt de omtrek 34 × 34. Gusset: 5 dik over de hoeklijn, benen 30 en 25 op de twee vlakken, "start" + offset 2.

### Fouten gevonden en opgelost

1. **Cut list-lengte = padlengte**: een verstekhoek of stomp gelast lid gaf de lengte van het schetssegment. Nu de echte
   lengte (L-frame 300 + 200 met verstek: 320 en 220).
2. **End Butt verlengde/kortte met de halve diagonaal** (`half − 1` = 28,28 bij 40 × 40) i.p.v. de halve breedte van het
   andere profiel (20). Nu `reach()`: hoe ver het geplaatste profiel van het andere lid langs de as reikt.
3. **End Butt in een gesloten rechthoek gaf een "windmolen"** (elk lid één kant door): nu lopen het eerste en elk tweede lid
   van een keten aan beide kanten door (Butt1; Butt2 omgekeerd), zoals een frame met 2 doorlopende en 2 tussengezette leden.
4. **Cut list-groepering op afgeronde sleutels** zette twee gelijke leden apart als de boolean een fractie verschilde; nu
   een tolerantie (afmetingen 0,05 mm, volume 0,1 %).
5. **End cap binnenwaarts stak 0,02 mm buiten het eind**; nu vlak. De B-rep-versie is een prisma van de omtrek
   (`endCapPrism` + `extrudeLoop`) i.p.v. `fromMesh` met een limiet van 16 punten (afgeronde kokers vielen terug op mesh).

Aangepaste verwachtingen door de normstralen: `weldments.test.ts` (oppervlakte, end cap, lasnaadlengte 24 = 40 − 2·8),
`src/core/occt/brep.test.ts` (trim van een koker: volume met stralen), `e2e/gh.mjs` (volume, cut list 320/220 mm,
end cap met R6-hoeken).

## F197: exacte edge flange / hem tegen mesh en formule (`src/core/features/flangeExact.test.ts`, 5 tests, 42 gevallen + de waarschuwing)

Methode: elk geval op beide kernels (OCCT geladen zoals `src/qa/qaBrep.test.ts`): exact volume = formule binnen
1e-3 mm³, facet-volume = formule binnen 0,5 %, `shapeMismatch(mesh, exact)` = null, geen waarschuwing, lichaam exact.
Formule: tab − setback·T·b + b·(θ/2·((R+T)² − R²) + been·T) − reliefs (rw·rd·T, obround + cirkelsegment).

Gevallen: 90/120/45°, Material Inside/Outside/Bend Outside, beide richtingen (flip); zoom open/gesloten,
Inside/Outside, beide richtingen; reliefs rechthoek/tear/obround (Inside/Outside); gap; zoom met offsets; L-plaat:
alle vier eindranden (binnen- en buitenvlak, beide uiteinden) met flens en zoom.

Gemeten vóór de fixes: op een eenvoudige tab week geen enkel geval > 0,5 % af. Het exacte pad was overal gelijk aan
de formule; de mesh zat 0,03–0,1 % lager door de koorden van de bocht. De poort van 0,5 % ging dus nooit af. De
oorzaak in de releasepass van 0.5.10 was de testselectie (een flens op de binnenrand). Wat de probe wel vond:

| geval | wie fout | oorzaak | fix |
|---|---|---|---|
| flens/zoom op de eindrand van de staande kant van een L | beide kernels gelijk fout | de "plaatvlakken" van de rand werden gekozen als grootste vlak met dezelfde normaal *ergens* op het lichaam (de bovenkant van de basis), niet het vlak waar de rand op ligt: de flens werd op het kopse vlak gebouwd (8441 i.p.v. 8205 mm³) | `sheetFaceOfEdge` (sheetmetal4.ts): alleen vlakken waarvan het vlak de rand bevat; ook in edgeFlangeOnBody en de miter flange |
| flip (Reverse direction), Material Inside / zoom | beide gelijk fout | de flens vertrok van hetzelfde vlak met de plaat aan de verkeerde kant: trim sneed lucht, flens één dikte verschoven (tab 90°: 7052,81 i.p.v. 6753,98) | bij flip vertrekt het profiel van het tegenoverliggende vlak (rand + T·n): spiegelbeeld, volumes = niet-geflipt |
| reliefs (offsets), Material Inside | mesh fout (fout "volume check"), exact niet geprobeerd | relief-dozen met een linkshandig assenstelsel = binnenstebuiten (volume negatief), de mesh-trim sneed te weinig en de unie faalde | assenstelsel rechtshandig gemaakt (de as langs de rand omgedraaid) |
| reliefs: exact pad | exact ontbrak (stille mesh + algemene melding) | `exact` werd niet gemaakt als er reliefs waren | relief-prisma's (doos, obround met echte cirkel) in `exact.reliefs`, rebuild snijdt ze mee |
| reliefs: trim en notch raken elkaar op b = 47 | mesh: dunne restwand (1 mm afwijking in shapeMismatch) | twee sneden die elkaar enkel raken laten een vlak achter; doos + obround-cilinder overlappend in één samengevoegd gereedschap | trim reikt e = 0,05 in de notch; trim ∪ notches en doos ∪ cilinder als één gereedschap |
| start/eind-offset | kernels verschillend | de B-rep-tessellatie geeft de rand in omgekeerde richting: offsets wisselden van kant (3 mm) | `edgeEnds`: volgorde volgens `EdgeRef.dir` (zoals gekozen), anders langs de grootste coördinaat |

Poort in `rebuild.ts`: blijft 0,5 %, maar een afwijking zet nu een eigen waarschuwing op de feature
(`flangeMismatchWarning`: "Warning: B-rep and mesh disagree on this flange (exact … vs faceted … mm³); the faceted
result is kept …"), zichtbaar in What's Wrong in plaats van alleen de algemene "has no exact (B-rep) version".
Faalt de mesh-boolean zelf, dan blijft het exacte resultaat staan. Getest met een kernel die het volume 10 % te klein
meet. Nog op mesh (met de algemene melding): Edit Flange Profile (een getekend flensprofiel).
