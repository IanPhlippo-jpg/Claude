# B-rep: patronen, mirror, loft en draft → 0.3.9 (2026-10-26)

Vervolg op docs/15. Ian: "Ga verder met de open stukken".

| Feature | Nu exact | Hoe | Terugval naar de mesh-kern bij |
|---|---|---|---|
| Linear / Circular / Sketch / Curve / Table / Fill Pattern van features | ja | het B-rep-gereedschap van de seed, per instantie verplaatst (`K.transform` met de instantiematrix) | Vary sketch, gevarieerde maten, Variable Pattern, seeds die van de body afhangen (up to next/surface/body) |
| Bodies to Pattern | ja | de exacte body verplaatst | — |
| Mirror (features) | ja | het B-rep-gereedschap gespiegeld (`K.mirror`), dan fuse of cut | — |
| Mirror (bodies, merge aan of uit) | ja | de exacte body gespiegeld | Faces to Mirror (oppervlakken) |
| Loft tussen twee profielen | ja | `ThruSections` tussen de exacte draden | guide curves, centerline, end constraints, boundary, close loft, profielen met gaten; vangnet 3 % |
| Extrude met draft | ja (enkelzijdig) | prisma, daarna `DraftAngle` op de zijvlakken met het schetsvlak als neutraal vlak | mid-plane, twee richtingen |
| Draft (neutraal vlak) | ja | `DraftAngle` op de gekozen vlakken; de kant van de hoek die met de mesh-kern overeenkomt wint | parting line, step draft, face propagation |

**Hoek en richting.** Waar de twee kernen een andere tekenconventie kunnen hebben (draft) probeert de rebuild beide
kanten en kiest de uitkomst die met de mesh-versie overeenkomt (binnen 3 %, bij extrude-draft 10 % wegens de
overhang van snijgereedschap). Komt geen van beide overeen, dan bouwt de mesh-kern.

## Shell naast een afronding: bevinding

Een shell met een open vlak waar een afronding aan raakt (bijv. bovenrand afgerond, bovenvlak open) is op die rand
meetkundig niet eenduidig: de wand loodrecht op de afronding staat daar loodrecht op het open vlak, dus het eindvlak van
de wand ontaardt tot een lijn. OpenCascade weigert dit (of geeft een niet-uitgeholde vorm); de mesh-kern geeft een
benadering met een lip langs de rand. Zonder referentie van SOLIDWORKS voor precies dit geval is niet vast te stellen
welke vorm juist is; het vangnet kiest de mesh-versie, zoals in 0.3.8. Gewone shells (ook met gaten, en afrondingen die
niet aan het open vlak raken) zijn exact.

## Bewijs

| Test | Wat |
|---|---|
| `src/core/occt/brep.test.ts` (17) | lineair + cirkelvormig patroon (exact volume), mirror van een feature en van een body, loft (afgeknotte piramide), extrude met 5° draft, Draft-feature gelijk aan de mesh-kern |
| `e2e/brep.mjs` (9) | in de app: lineair patroon van de plaat geeft twee exacte bodies |

## Volgende stappen

1. Topologische namen voor vlakken en randen uit de bouwgeschiedenis van OpenCascade.
2. De hele rebuild in de worker (F46), zodat de mesh-stap overbodig wordt.
3. Plaatwerk, weldments, wrap, rib en thread via B-rep.
