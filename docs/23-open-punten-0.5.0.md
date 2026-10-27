# Open punten van QA 0.4.8 afgewerkt → 0.5.0 (2026-10-27)

Deze ronde pakt de punten op die na 0.4.9 openstonden (F46, F47, F48, F103) en de laatste open taken van Vervolg 47.
De regressie is gedraaid op **Windows** (msedge). Linux en de CI zijn niet gedraaid, omdat de branch niet gepusht wordt
(F98, de beslissing van Ian).

| Punt | Wat er veranderd is | Bewijs |
|---|---|---|
| F46: rebuild van de UI-thread | Een part waarvan de rebuild langer duurt dan 250 ms wordt de volgende keer in een eigen worker gebouwd (`src/workers/rebuild.worker.ts`). Het venster blijft dan tekenen. Het oude model blijft zichtbaar tot het nieuwe klaar is, en de statusbalk toont "Rebuilding…" met een balk. Een nieuwere wijziging stopt de lopende rebuild. Op de UI-thread stopt een rebuild na 4 s en gaat verder in de worker (het budget was 45 s). Het resultaat komt verpakt terug (`rebuildWire.ts`): de typed arrays worden overgedragen, niet gekopieerd. Foutmeldingen en Bodies to Keep volgen als de worker klaar is (`whenRebuilt`). De optie staat in Tools ▸ Options ▸ Performance. | e2e `rebuildworker` (een plaat met 64 snedes: rebuild 26 s in de worker, grootste haperingen 83 ms), unit `rebuildWire.test` |
| F48: gesloten na elke boolean | Na elke mesh-boolean van twee gesloten solids wordt gecontroleerd of het resultaat gesloten is: de som van de georiënteerde driehoeksoppervlakken moet nul zijn. T-verbindingen tellen niet als lek. Een opening wordt een **rebuild-waarschuwing**, een gele driehoek in de boom. What's Wrong toont nu ook waarschuwingen (Show warnings). Waar de B-rep-kern de body exact maakt, verdwijnt de waarschuwing. | unit `booleanCheck.test`, `pattern.test` (de counterbore-scheur wordt gemeld) |
| F47: topologische namen | Elk vlak van een extrusie krijgt een naam: de feature plus de schetsentiteit waaruit het vlak komt, of de kant van de kap. De naam reist als attribuut door de booleans. Een rand heet naar zijn twee vlakken. Een fillet of chamfer vindt zijn rand dus terug na een wijziging, ook als er een gelijke rand dichterbij ligt. Na een feature die de body opnieuw opbouwt (een B-rep-tessellatie, een fillet) worden de namen overgenomen van het dichtstbijzijnde vlak. Exacte bodies krijgen de namen van hun mesh-tweeling. | unit `edgesets.test` (een trap waarvan het hoge deel groeit; zonder namen ging de fillet verloren), e2e `facenames` (mesh- en B-rep-kern) |
| F103: PropertyPanel gesplitst | `PropertyPanel.tsx` telde 3932 regels en telt er nu 25. Elke feature-familie heeft een eigen module in `panels/pm/`: feature, fillet, pattern, plaatwerk, solid, surface, weldment en schets, plus gedeelde onderdelen. Het grootste bestand telt 841 regels. De families worden in dezelfde volgorde geprobeerd als vroeger, met dezelfde state. `tools/line-budget.cjs` staat in de CI: maximaal 1000 regels per module, met een eigen plafond voor de acht modules die al groter waren. | typecheck, regressie |
| Loft naar een modelvlak | "Selected face as profile" maakt een plat vlak van het model het tweede profiel (Face<1> in de lijst). Een vlak dat verdwenen is, wordt gemeld. Er zijn twee nieuwe eindvoorwaarden. **Tangency To Face** volgt de vlakken naast het profiel, en **Next Face** kiest het volgende van die vlakken. **Curvature To Face** doet hetzelfde met een langere raaklijn. | unit `loftFace.test`, e2e `loftface` |
| Appearance | De dialoog heeft nu Basic en Advanced. Er zijn vier tabs: **Color/Image** (een afbeelding als uiterlijk), **Mapping** (box, projectie, cilinder of bol, met breedte in mm, rotatie en spiegelen), **Illumination** (diffuus, spiegelend, spreiding, reflectie, transparantie, lichtgevend) en **Surface Finish** (polished, brushed, sandblasted, knurled als reliëfpatroon). Cancel zet alles terug. | e2e `appearance2` |
| Insert Bends | De optie **Ignore beveled faces** sluit afgeschuinde vlakken uit van de bochten. De bochten worden geteld en staan in de boom (SharpBend1…). | unit `insertBends.test` |
| Face Fillet ▸ Hold line | De straal volgt uit de afstand tot de vasthoudlijn en de hoek tussen de vlakken: r = d · tan(α/2). | unit `holdline.test`, e2e `loftface` |

## Bewust nog niet

- Echte bochtstralen bij Insert Bends. De bochten worden geteld en getoond, maar de hoeken worden niet afgerond.
- Vlaknamen voor revolve, sweep en loft. Daar blijft de geometrische randherkenning uit 0.3.7 het vangnet.
- Mesh-booleans zelf sneller maken. De CDT-splitter van three-bvh-csg maakt minder driehoeken, maar brak vier tests en
  bleef dus uit. Een gatenpatroon in één snede samenvoegen hielp nauwelijks: de tijd zit in het splitsen van de grote
  vlakken.
