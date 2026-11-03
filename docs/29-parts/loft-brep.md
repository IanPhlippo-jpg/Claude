# Loft in B-rep: meer dan 2 profielen, ruled/smooth, Close loft (pariteitsrij 10, P1-4) — QA 0.5.11, plan NAAR-100

## Wat er nu kan

- **Datamodel** (`LoftFeature` in `src/core/document/types.ts`): `profiles?: Id[]` = profiel 3, 4, … na `sketchId2`,
  in loftvolgorde; `ruled?: boolean` = recht tussen opeenvolgende profielen (zonder: één gladde vlakte door alle);
  `closeLoft` (bestond al) loft bij 3+ profielen van het laatste terug naar het eerste, zonder eindvlakken.
  `ruled` is geen optie in de Loft-PM van SOLIDWORKS. Het is een veld in het model, zonder knop in de PM.
- **B-rep** (`src/core/occt/brep.ts`, `loft(sections, { ruled, closed })`): `BRepOffsetAPI_ThruSections(solid, ruled)`
  met alle wires; Close loft = dezelfde eerste wire nog eens achteraan (OCCT sluit de loft dan op zichzelf).
  De kernel-interface (`brepKernel.ts`) neemt nu een lijst secties in plaats van twee.
- **Rebuild-lijm** (`src/core/features/loftThrough.ts`): `loftProfileIds`, `loftThroughFeature` (mesh, 3+ profielen)
  en `loftShape` (B-rep, 2+ profielen). In `rebuild.ts` alleen kleine wijzigingen: de B-rep-loft roept `loftShape` aan
  (netto 4 regels minder), de featuregeometrie gaat bij `profiles` naar `loftThroughFeature` en alle profielschetsen
  worden "consumed". `reorder.ts` en `treeDialogs.tsx` kennen `profiles` als ouderschetsen.
- **Mesh** (`loftThroughGeometry` in `src/core/features/sweep.ts`): volgt dezelfde wiskunde als OCCT, zodat de
  cross-check (`brepRefine.ts`, 0,5 %) niet afgaat.

## Hoe OCCT een gladde loft door N secties bouwt (gemeten, en de mesh doet hetzelfde)

- Tot 9 secties (DegMax 8) is de vlakte in de loftrichting **één polynoom (Lagrange) door de secties**. Gemeten op
  3, 4, 5 en 9 vierkanten: de doorsnede valt tot 3 decimalen samen met het Lagrange-model. Bij 10+ secties stukt OCCT
  de vlakte anders samen. Daarom bouwt `loftShape` een gladde loft met meer dan 9 secties (Close loft telt er één bij)
  niet exact: de mesh gebruikt dan Catmull-Rom en het lichaam blijft facetted.
- De parameters zijn **chord length over de B-spline-polen**: de wortel van de som van de kwadratische afstanden tussen
  de poolvectoren van twee secties (gemeten: 0,23988 tegen 0,23988 voorspeld). Een lijn heeft zijn polen in de
  hoekpunten, een cirkel (benaderd als niet-rationele B-spline van graad 14) heeft ze buiten de cirkel. De mesh splitst
  de sprong in centrumverplaatsing en vormverandering, en weegt de vormverandering met `KAPPA2 = 1,6`. Die waarde is
  geijkt op vierkanten (exact 1,5) en cirkels (1,65). `SetParType` (IsoParametric) zou dit overbodig maken, maar de enum
  `Approx_ParametrizationType` zit niet in de WASM-build ("Cannot read properties of undefined (reading 'name')").
- Ruled en Close loft: rechte wanden per overgang. Veelhoeken met evenveel hoeken gaan **hoek op hoek** (zoals OCCT).
  De mesh legt daarom op elke zijde evenveel punten. Bij de oude verdeling naar lengte week 40×20 → 20×30 → 40×20 af
  (OCCT 44000 = prismatoïde, mesh 2,2 % ernaast). Opgelet: de 2-profiel-loft (`loftGeometry`) verdeelt nog naar lengte.

Gemeten verschil exact ↔ mesh-kernel (64 punten rond): 3 vierkanten 0 % (ruled) / 0,09 % (smooth), 3 cirkels 0,26 % /
0,14 %, 4 vierkanten ongelijk 0 % / 0,09 %, 5 cirkels ongelijk en uit de as 0,21 % / 0,03 %, rechthoeken met andere
verhouding 0 % / 0,04 %, vierkant→cirkel→vierkant 0,05 % / 0,20 %, Close loft 4 cirkels rond Y 0,16 % / 0,35 %.

## Wat niet lukte

- **Close loft met veelhoeken in draaiende vlakken** (4 vierkanten rond de Y-as): OCCT's `BRepFill_CompatibleWires`
  koppelt de hoeken anders (gedraaid), met 6000 tegen 12000 mm³ analytisch (Jacobiaan: per stuk ∫x = 3000). De
  3 %-controle in `brepTool` vangt dat op en de mesh bouwt het lichaam. Cirkels in dezelfde opstelling zijn wel exact.
- **Guide curves blijven op de mesh-kernel.** `BRepOffsetAPI_MakePipeShell` met een hulpspine
  (`SetMode(wire, curvilinear, BRepFill_TypeOfContact)`) is in de build aanwezig, maar getest met 40×40 → 20×20 over
  30 mm (frustum 28000) en een rechte of gebogen guide door de hoek:
  - `BRepFill_NoContact`: de guide bepaalt alleen de draaiing van de sectie, niet de grootte. Een gebogen guide geeft
    dus hetzelfde lichaam (28000). Met `CurvilinearEquivalence` = true: 27799 bij een rechte guide (fout).
  - `BRepFill_Contact` / `BRepFill_ContactOnBorder`: met twee secties, voor alle combinaties van
    WithContact/WithCorrection/curvilinear "not done" of een WASM-exception. Lukte het toch, dan kwamen er onzinnige
    volumes uit (70120, 71252, 26749).
  - `ThruSections` heeft geen guide-ingang. Een benadering met tussensecties (doorsnede van de ruled loft, geschaald
    naar de guide en door ThruSections gehaald) volgt de guide alleen op die secties. Dat is niet exact en is daarom
    niet gebouwd.
  Een loft met guides, centerline, start/end constraints, boundary of een vlak als profiel blijft dus op de mesh. Met
  3+ profielen geeft de mesh-kernel daarvoor een foutmelding: die combinatie bestaat (nog) niet.
- Geen PM-knop om een 3e profiel toe te voegen (`solidPM.tsx` toont nog `sketchId`/`sketchId2`). Ook "Close loft"
  staat er nog uitgeschakeld.

## Tests

`src/qa/qaBrep.test.ts`, blok "QA 0.5.11 parity row 10" (5 tests): ruled 3 vierkanten = 2 frustums (56000, < 1e-3),
ruled 4 vierkanten ongelijk, smooth 3 cirkels (exact 35185,8377 = 11200π; fijne integratie < 0,5 %; tessellatie
< 1 %; mesh < 0,5 %), drie gladde gevallen mesh ↔ exact < 0,5 % plus de ruled prismatoïden, en Close loft ruled en smooth.
