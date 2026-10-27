# Move/Copy Bodies, Bodies to Keep en bugjacht → 0.4.3 (2026-10-27)

| Punt | Wat er veranderd is | Bewijs |
|---|---|---|
| Move/Copy Bodies | Nieuw: Insert ▸ Features ▸ Move/Copy… opent het Body-Move/Copy Property Panel: bodies kiezen, Copy met aantal kopieën, Translate ΔX/ΔY/ΔZ, Rotate om X, Y en Z rond een oorsprong. Het resultaat is al tijdens het invullen zichtbaar. Exact via B-rep (verplaatsing van de vorm). | brep.test (drie kopieën op 0/100/200/300, 90° draaiing, exact), e2e/bodies.mjs |
| Bodies to Keep | Een snede die een lichaam in stukken deelt maakt van elk stuk een body (grootste eerst), in beide kernen. Na OK verschijnt de dialoog "Bodies to Keep" (All bodies / Selected bodies); de keuze staat in de feature (`keepBodies`). De mesh-kern voegt delen die elkaar raken samen (T-knooppunten van booleans), zodat alleen echte stukken tellen. | brep.test (twee stukken; grootste houden), e2e/bodies.mjs |
| Bugjacht Property Panels | Nieuw e2e-script `pmsweep.mjs`: 54 part-commando's openen, annuleren, opnieuw openen, OK, Undo. Gevonden en opgelost: een Structural Member langs een boog of cirkel bouwde elk boogsegment als apart lid met verstekken en bevroor de app; nu is een boogstuk één gebogen lid (het profiel langs de boog), zoals SOLIDWORKS. | pmsweep (54/54), brep.test (lid langs een cirkel < 5 s, volume van de torus) |
| TASKS.md | De oude open punten nagelopen: 25 waren in latere rondes al gedaan en zijn afgevinkt met een verwijzing. | TASKS.md |

## Nog open

- De ontwerpronde: hoofdschermen opnieuw naast de referentieframes leggen (volgende ronde).
- Tien playlist-video's zijn zonder YouTube-cookies niet te downloaden.
