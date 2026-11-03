# Plastics exact op de B-rep-kernel (QA 0.5.11 F51 / F121, pariteitsrij 16 en 31, plan P1-2)

Indent, Lip/Groove, Snap Hook en Mounting Boss bouwen op de B-rep-kernel nu een exacte versie; de waarschuwing
"has no exact (B-rep) version … Faceted" komt voor deze vier niet meer. Bij geen kernel of een kernelfout bouwt de
mesh-kernel het feature zoals vroeger (zelfde terugval als Dome).

## Hoe

| Feature | Exacte versie | Code |
|---|---|---|
| Mounting Boss | boss en gat (of pin) als kegel-/cilinderstukken (`axisymmetric`), fins als prisma's van hun profiel (`extrudeLoop`); eerst onderling gefuseerd, daarna één keer met het lichaam | `mountingBossTools` (`plastics.ts`), `buildMountingBoss` (`fasteningBuild.ts`), `prismShape` (`plasticsExact.ts`) |
| Snap Hook | één prisma van het profiel (balk + lip met de schuine aanloop) | `snapHookPiece`, `prismShape` |
| Lip/Groove | band tussen opening en vergrote omtrek, van z0 tot z1 langs de normaal van het randvlak: rond = ring tussen twee echte cilinders, anders prisma van de omtrek min prisma van de opening | `rimBandPiece`, `bandShape` |
| Indent | dezelfde booleans op de exacte lichamen met exacte offsets: doel − (gereedschap + speling), of (doel ∪ (gereedschap + speling + dikte)) − (gereedschap + speling) | `indentShape`, nieuwe kernelmethode `offset` (`BRepOffsetAPI_MakeOffsetShape`, join Intersection = scherpe hoeken zoals `offsetMesh`) |

De mesh-versie en de exacte versie gebruiken dezelfde getallen (`PrismPiece`, `RimBandPiece`, `AxisPiece`).
De rebuild geeft `exactOf`/`setExact` door aan `buildFastening` (één regel in `rebuild.ts`).

## Gecorrigeerd

- **Draft van boss, gat en pin**: de stukken beginnen SINK onder (of eindigen boven) het vlak. Het exacte stuk zet
  de draft daar voort, zodat de diameter aan het vlak de opgegeven is en de wand precies de draft-hoek heeft
  (vroeger 0,1 % minder steil en de diameter aan het vlak 0,0007 mm te klein). Het mesh-stuk houdt de oude
  eindstralen (minder dan 0,01 mm verschil): met de exacte stralen liet de mesh-boolean (three-bvh-csg) in het
  e2e-model (Ø8, draft 1°, 4 fins) een naaldvormige driehoek van 28 mm achter op het vlak onder de boss.
- **Mesh-union van de boss**: stuk voor stuk toegevoegd liet de mesh-boolean een stukje vlak onder een fin
  achter (0,18 mm, boven de marge van de kernel cross-check). Boss en fins worden nu eerst één gereedschap.

## Tests (`src/qa/qaBrep.test.ts`, blok "QA plastics on the B-rep kernel")

Per lichaam: exact, gesloten vorm binnen 1e-3 mm³, geen waarschuwing, tessellatie binnen 1 %, en de mesh-kernel
bouwt hetzelfde lichaam (`volumeMismatch` en `shapeMismatch` = null, de cross-check van de e2e-builds).

| Test | Gesloten vorm (mm³) | Exact gemeten | Tessellatie | Mesh-kernel |
|---|---|---|---|---|
| Mounting Boss Ø10×20, 4 fins 6×12×2, gat Ø4×15 | 49673.5202 | 49673.5202 | 49673.139 | 49670.275 |
| Mounting Boss draft 2°, gat-draft 1°, geen fins | 49196.7029 | 49196.7029 | 49194.881 | 49193.288 |
| Snap Hook 2×15, lip 1,5×3, breedte 6, 30° gedraaid | 48196.2000 | 48196.2000 | 48196.200 | 48196.200 |
| Lip/Groove rechte randen: bovenste helft (groef) | 5324.7960 | 5324.7960 | 5324.796 | 5324.796 |
| Lip/Groove rechte randen: onderste helft (lip) | 4216.0000 | 4216.0000 | 4216.000 | 4216.000 |
| Lip/Groove ronde rand: bovenste helft (groef) | 3312.1780 | 3312.1780 | 3311.583 | 3310.044 |
| Lip/Groove ronde rand: onderste helft (lip) | 2620.0883 | 2620.0883 | 2618.575 | 2618.427 |
| Indent blok, speling 0,5, dikte 1 | 40382.0000 | 40382.0000 | 40382.000 | 40382.000 |
| Indent Cut, speling 0,5 / 0 | 39516 / 39600 | 39516 / 39600 | idem | idem |

(De draft-test is nieuw na de correctie; met de oude stukken gaf de exacte boss 0,209 mm³ minder.)

e2e op het releasepad (`?kernel=brep&rebuild=worker`, `e2e/plastics.mjs`): 26/26, geen consolefouten (geen
"kernel cross-check").

## Wat mesh (of facetten) blijft

- **Lip/Groove langs een gebogen stuk rand** dat geen volledige cirkel is (bv. een opening met afgeronde hoeken):
  de omtrek komt uit de tessellatie van het randvlak, dus die stukken blijven facetten (in beide kernels gelijk;
  het lichaam blijft wel B-rep). Bogen terugvinden in de omtrek is niet gedaan.
- **Indent** waarbij het doel of het gereedschap geen exact lichaam is, of waar OpenCascade de offset met scherpe
  hoeken niet kan maken (bv. een hoekpunt met meer dan 3 randen): terugval op de mesh-versie, met de waarschuwing.
- **Dome** elliptisch en continu: ongewijzigd (zie `domeShape`).
