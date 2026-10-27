# B-rep: schroefdraad en frame-verstek → 0.4.2 (2026-10-26)

| Punt | Wat er veranderd is | Bewijs |
|---|---|---|
| Thread (gemodelleerd) | Het ISO-V-profiel loopt langs een echte helix: een lijn op een cilinderoppervlak, met dezelfde startkant en draairichting als de mesh-kern; OpenCascade `MakePipeShell` met de as als vaste binormaal houdt het profiel in een vlak door de as. Meerdere gangen (lead = gangen × spoed), snijden en opbouwen, Trim met begin- en eindvlak. Vangnet: binnen 5 % van het volume van de mesh-draad. | brep.test (M10 snijden, opbouwen, twee gangen: exact, binnen 1 % van de mesh-kern), screenshot `0.4.2-schroefdraad-exact.png` |
| Weldments ▸ verstek op de sluithoek | Een gesloten pad (een frame) kreeg op de hoek waar het eerste en het laatste lid samenkomen geen verstek. Nu wel, in beide kernen, zoals SOLIDWORKS alle hoeken verstekt. | brep.test (frames), screenshot `0.4.2-frame-verstek.png` |

## Bewust nog niet

- **Topologische namen uit de OpenCascade-geschiedenis.** De rebuild maakt elke keer nieuwe vormen; namen doorgeven
  vraagt dat elke B-rep-bewerking zijn `Modified`/`Generated`-geschiedenis bijhoudt en dat de mesh-terugval dezelfde
  namen kan geven. De geometrische randhandtekening (richting, twee vlaknormalen, dichtstbijzijnde, geen gok bij twee
  gelijke kandidaten; F47) dekt de gangbare wijzigingen. Dit blijft een apart traject.
- **De hele rebuild in de worker (F46).** De mesh-rebuild op de hoofdthread geeft direct beeld en de preview tijdens
  het bewerken; de exacte versie volgt een fractie later uit de worker. De rebuild volledig asynchroon maken raakt elke
  actie die direct na een rebuild de geometrie leest (71 plaatsen); dat blijft een apart traject. (0.5.0: trage parts
  rebuilden wel in een worker, zie docs/23; F47: vlaknamen voor extrusies, ook docs/23.)
