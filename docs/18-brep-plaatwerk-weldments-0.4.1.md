# B-rep: plaatwerk, weldments, booleans en vlakke terugval → 0.4.1 (2026-10-26)

Vervolg op docs/17 (0.4.0 is niet apart uitgebracht: alles zit in 0.4.1).

| Feature | Nu exact | Hoe |
|---|---|---|
| Miter Flange (profiel van lijnen) | ja | per been het exacte profiel met echte bochtcilinders, afgesneden op de verstekvlakken |
| Revolve ▸ Thin Feature (profiel van lijnen) | ja | de wandveelhoeken (exact bij lijnen) omgewenteld |
| Weldments ▸ Structural Member | ja | het profielprisma (buis: echte cirkels), afgesneden op de verstekvlakken; elk lid een eigen exacte body |
| Weldments ▸ Trim/Extend | ja (vlak, of lichamen zonder lasspleet) | snijden met het vlak of met de exacte lichamen |
| Weldments ▸ End Cap | ja, bij buizen met rechte zijden | de dop als exacte plaat |
| Combine (add, subtract, common) en Intersect | ja | booleans tussen exacte bodies (`common` nieuw in de kern) |
| Stud | ja | een echte cilinder |
| Alle features waarvan het gereedschap alleen vlakke vlakken heeft (gussets, weld gussets, vents met rechte sleuven, extrude met draft naar twee kanten, …) | ja | het mesh-gereedschap wordt een B-rep-solid (genaaid, coplanaire driehoeken samengevoegd) als het volume binnen 0,1 % klopt; gebogen gereedschap blijft op de mesh-kern |

## Bewijs

`src/core/occt/brep.test.ts` (32): Miter Flange, Revolve Thin, frames van kokers en buizen met verstek, Combine
(drie soorten) en Intersect, Stud, Trim/Extend met een vlak, End Cap, en de vlakke terugval (extrude met draft naar
twee kanten), telkens exact en gelijk aan de mesh-kern.

## Nog op de mesh-kern

Gebogen gereedschap zonder eigen B-rep-versie: thin met bogen, sweep met twist/geleiders, loft met geleiders,
wrap, thread (gemodelleerd), deform, forming tools, unfold/fold, afrondingen face/full round, asymmetrische
afschuiningen, lasrupsen.
