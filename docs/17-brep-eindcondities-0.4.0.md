# B-rep: eindcondities, thin, rib en plaatwerk-basis → 0.4.0 (2026-10-26)

Vervolg op docs/16. Ian: "blijf gewoon verder werken, niet stoppen tot het af is".

| Feature | Nu exact | Hoe |
|---|---|---|
| Extrude ▸ Up To Vertex, Up To Next, Up To Surface, Offset From Surface (ook Translate surface) | ja | dezelfde diepteberekening als de mesh-kern (`resolveExtrudeEnds`, gedeeld); vlak-eindes: through all, dan weggesneden met een half-ruimte op het (verschoven) vlak |
| Extrude ▸ Up To Body | ja | door het doellichaam, min het lichaam; het stuk dat aan het schetsvlak vastzit blijft |
| Extrude ▸ From offset | ja | het prisma begint op de offset |
| Extruded Cut ▸ Flip side to cut | ja | een plaat van dezelfde diepte min het profielprisma |
| Thin Feature (extrude) | ja, profielen van lijnen | de wandveelhoeken van de mesh-kern zijn bij lijnen al exact; bogen en Auto-fillet corners: mesh-kern |
| Rib | ja, schetsen van lijnen | het rib-gereedschap heeft alleen vlakke vlakken; het wordt een B-rep-solid en exact samengevoegd |
| Sheet Metal ▸ Base Flange (open profiel van lijnen) | ja | het profiel met echte bochtcilinders (binnenradius, buitenradius = binnen + dikte), dezelfde raakpunten als de mesh-kern |
| Sheet Metal ▸ Tab (gesloten profiel) | ja | een plaat van de plaatdikte |
| Sheet Metal ▸ Edge Flange (material outside/inside, bend outside) en Hem | ja, zonder relief-inkepingen | het flensprofiel met echte binnen- en buitenboog; Material Inside snijdt de plaat eerst terug |
| Sheet Metal ▸ Jog en Sketched Bend | ja | de vaste kant blijft, de andere kant wordt (exact) verschoven of gedraaid, het bochtgebied met echte bogen ertussen |
| Fillet ▸ Multiple radius en Variable size | ja | een radius per rand, of lineair van start naar einde langs de rand (OpenCascade) |

Nog op de mesh-kern: Thin met bogen, Revolve Thin, Miter Flange, flenzen met relief-inkepingen, de overige
plaatwerkfeatures (Vent, Forming Tool, Corners, Unfold/Fold …), Wrap, Thread, Deform, weldments, asymmetrische en conische
afrondingen.

## Bewijs

`src/core/occt/brep.test.ts` (25): de vijf eindcondities en Up To Body (exact en gelijk aan de mesh-kern binnen
0,2 %), Flip side to cut, thin in drie modi (gelijk aan de mesh-kern), een rib in een U-profiel (exact 90 × 15 × 4),
Base Flange (U met twee bochten) en Tab met gat, Edge Flange (buiten en binnen) en Hem, Jog, Sketched Bend
(gelijk aan de mesh-kern binnen 0,5 %), multi-radius en variabele afronding.
