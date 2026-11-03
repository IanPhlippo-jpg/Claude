# Topologische naamgeving over sweep, loft, pattern en shell (F47 / pariteitsrij 29 / P1-5) — QA 0.5.11

Strikte QA-tests T4–T7 met gesloten-vormwaarden, op beide kernels. Modellen en formules in `src/qa/qaModels.ts`,
tests in `src/qa/qaNaming.test.ts` (12 tests: 6 mesh, 6 B-rep). Randen worden op **positie** gekozen
(`edgeAt` = richting + centroid, `edgesThrough` = polylijn door een punt; elke andere telling dan 1 gooit een fout),
nooit met een `reduce` op lengte. Omdat randen van gelijke lengte hetzelfde volume geven, controleert elke test ook
per positie welke scherpe randen weg zijn en welke er nog zijn (`expectSharp`).

Afkortingen: `CORNER(R) = R²(1 − π/4)` (doorsnede van een afronding op een rechte bolle rand),
`K = (10 − 3π)/(12 − 3π)` (afstand van het zwaartepunt van die doorsnede tot de rand, langs elk vlak, in eenheden R).

## Modellen en formules

| | model | wijziging | formule (B-rep, exact) |
|---|---|---|---|
| T4 | profiel 10×6 (front, x −5..5, y −3..3) langs een recht pad op top (z 0..L); R1 op de rand x = 5, y = 3 | L 50 → 70 | `60·L − L·CORNER(1)` |
| T4-boog | idem, pad = lijn L + kwartboog R30 naar −x (de rand x = +5 ligt aan de buitenkant) | rechte deel 50 → 70 | `60·(L + π/2·30) − CORNER(1)·(L + π/2·(35 − K))` (Pappus) |
| T5 | loft tussen twee rechthoeken 20×10 (front en een vlak op z = h); R1 op de zijrand x = 10, y = 5 | h 30 → 45 | `200·h − h·CORNER(1)` |
| T6 | plaat 100×20×5, nok 10×10×5 op x 5..15, lineair patroon langs x om 20; R1 op de bovenrand x = 15 + 20(i−1), y = 10 van nok 2 (of nokken 1, 2, 3) | aantal 3 → 5 | `10000 + n·500 − m·10·CORNER(1)` (n nokken, m afgerond) |
| T7 | blok 40×30×20; R2 op de verticale rand x = 40, z = −30; shell 1 mm, bovenvlak open | — | `24000 − 20·CORNER(2) − (38·28·19 − 19·CORNER(1))` |

Mesh-kernel: het fillet-verlies tegen het eigen gefacetteerde scherpe lichaam (`sharpOf`: dezelfde boom zonder
fillets), tolerantie 2 % van het verlies, minstens 0,25 en hoogstens 1,5 mm³. B-rep: `exactVolume` tegen de formule,
≤ 1e-3 mm³, en het lichaam moet exact blijven.

## Gemeten waarden

| | mesh: verlies (exact) | B-rep: volume − formule |
|---|---|---|
| T4 L50 / L70 | 10,847 (10,730, +1,09 %) / 15,186 (15,022, +1,09 %) | −1,4e-12 / −2,7e-12 |
| T4-boog L50 / L70 | 22,614 (22,453, +0,72 %) / 26,946 (26,745, +0,75 %) | −8,8e-7 / −7,2e-11 |
| T5 h30 / h45 | 6,524 (6,438, +1,33 %) / 9,785 (9,657, +1,33 %) | −4,5e-6 / −2,1e-6 |
| T6 nok 2, ×3 / ×5 | 2,175 (2,146, +1,33 %) / 2,175 | −1,8e-12 / −5,5e-12 |
| T6 nokken 1–3, ×3 / ×5 | 6,524 (6,438, +1,33 %) / 6,524 | −1,8e-12 / −3,6e-12 |
| T7 | 13,187 (13,091, +0,74 %); scherpe shell 3784,000 = exact | 3,6e-12 (3770,9093) |

(De mesh-fillet neemt ~1 % te veel weg: de gefacetteerde boog ligt binnen de echte; dat geldt ook voor T1/T3.)

## Gevonden en opgeloste fouten

1. **Mesh-loft sneed hoeken af** (`src/core/features/sweep.ts`, `resample`). Een lus werd op booglengte herbemonsterd
   naar 64 punten; bij een rechthoek 20×10 vielen twee hoeken tussen twee monsters: een loft tussen twee gelijke
   rechthoeken had twee afgeschuinde randen (2 × 5,9 mm³ te weinig bij h = 30) en de rand x = 10, y = 5 bestond niet.
   Nu houdt een lus met ≤ n punten al haar punten (hoeken) en krijgt ze de rest op haar zijden naar rato van hun
   lengte (`keepCorners`, grootste-rest-verdeling); langere lussen blijven op booglengte. Volume nu exact 200·h.
2. **Randketens stopten achterwaarts** (`src/core/features/edgesets.ts`, `bodyEdges`). Bij het achterwaarts verlengen
   van een keten had de "turn" het verkeerde teken, zodat een open kromme die vanuit een segment in het midden werd
   opgebouwd daar stopte: de buitenrand van de boog-sweep viel uiteen in losse facetten van 2,5 mm en de fillet rondde
   alleen het rechte deel af (verlies 10,85 i.p.v. 22,45; de B-rep rondde wél de hele tangentketen af). Nu:
   `-d1·d0` achterwaarts. Gevolg: elke open tangentketen is consistent één rand (zoals de bestaande ontwerpkeuze met
   `subEdgeAt` bij Tangent propagation uit). `round.test.ts` verwachtte ≥ 10 randen na een fillet op een doos; dat
   getal kwam van de fout, het zijn er nu 9 (elke kopvlak-omtrek bovenrand–boog–voorrand is één keten); de test
   controleert nu dat er geen rand meer op de oude rand ligt en dat er 9 randen zijn met 2 ketens.
3. **Fillet op een sweep-rand sprong naar de andere kant na een padwijziging** (T4-boog L70, beide kernels: verlies
   23,52 = rechte deel + binnenboog, dus de rand x = −5). Sweep- en loftvlakken hadden geen namen; `matchMovedEdge`
   koos bij een gekromde rand op centroid-afstand, en de binnenketen lag na de wijziging dichter bij de oude centroid.
   Nu benoemt `sweepGeometry`/`loftGeometry` elke driehoek met zijn bron (`userData.faceSrc`: kap `-`/`+` of het
   profielpunt waarvan de wand komt) en `nameFeatureFaces` geeft sweep- en loftvlakken de naam van de dichtste
   profielentiteit (`<feature>:<entiteit>`, kappen `<feature>:cap±`), net als een extrusie. De B-rep-tessellatie
   erft de namen via `copyFaceNames`. De tests eisen nu dat de randreferentie van een sweep- en loftrand beide
   vlaknamen draagt.

T6 (pattern) en T7 (fillet vóór shell) waren al correct op beide kernels; geen wijziging nodig.

## Open punten

- Geen open fouten in T4–T7.
- In een volledige `npx vitest run` gaven `edges.test.ts` ("counterbores and patterned holes") en `revolve2.test.ts`
  (T2) een time-out van 5 s onder parallelle last (5–6 s); los draaien ze in ~1 s. Niet veroorzaakt door deze
  wijzigingen.
