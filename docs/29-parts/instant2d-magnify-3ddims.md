# Instant2D, Magnified Selection en 3D-schetsmaten (F124, pariteitsrijen 6 en 7, P2-4) — QA 0.5.11, plan NAAR-100

Drie gaten uit `docs/24` ("Bewust nog niet") zijn dicht.

## 1. Live maat slepen (Instant2D, in Phlippo "Drag Dimensions")

De naam blijft *Drag Dimensions*: Instant2D is een merknaam (`docs/06`, `tools/rename-trademarks.cjs` vervangt hem).
De bestaande knop in de Sketch-tab is dus de aan/uit-knop; er komt geen tweede.

`src/app/viewport/DragDimensions.tsx`:
- De handgreep zit op het eindpunt van de maat (`handleOf`: length, radius/diameter, distance/hDistance/vDistance).
- Slepen past de waarde **live** toe: bij elke stap de schets zoals ze was bij het indrukken, met de nieuwe waarde,
  opgelost met `solveAll` (dus ook Equations), zonder Undo-stap. De liniaal blijft staan waar het slepen begon.
- Afronding: `dragValue(v0, along, fine)` = veelvoud van 0,5 mm (Alt: 0,1 mm), nooit kleiner dan één stap.
- Loslaten: terug naar de toestand van het indrukken en dan `updateDimension` → precies één Undo-stap
  "Modify dimension".
- Volledig bepaalde schets: werkt hetzelfde (een drijvende maat blijft drijvend). Een waarde die de schets niet kan
  oplossen (conflict) laat de geometrie live op de laatste waarde die wel lukte; losgelaten op zo'n waarde wordt ze gezet
  zoals een getypte waarde (de conflictmelding en rood). Een driven (reference) maat heeft geen handgreep.

e2e `e2e/instant2d.mjs` (8 checks): volledig bepaalde lijn 50, live 55,0 tijdens slepen, 60 na loslaten (nog steeds
Fully Defined), één Undo → 50, 47,8 → 48,0.

## 2. Magnified Selection (G)

`src/app/viewport/Magnifier.tsx`, in de Viewport naast de andere overlays.
- **G** (zonder modifier, niet in een invoerveld, met een document, geen tekening) opent het vergrootglas: een cirkel
  van 240 px rond de aanwijzer met het beeld eronder 3× vergroot. **G** of **Esc** sluit; Esc wordt in de capture-fase
  opgevangen, zodat de selectie blijft staan.
- Het wiel verandert de vergroting (2×–8×) zolang het glas openstaat; de camera zoomt dan niet.
- Rendering: de camera wordt gekloond met `setViewOffset` (het kleine venster rond de aanwijzer op volle resolutie),
  met viewport + scissor in de linkeronderhoek van het canvas gerenderd, met `drawImage` naar het canvas van het glas
  gekopieerd en in dezelfde taak overschreven door het normale beeld (met AO als dat aan staat). Geen
  `preserveDrawingBuffer` nodig; het beeld toont nooit de tussenstap.
- Het glas laat klikken door (`pointer-events: none`): een klik selecteert wat onder het midden ligt, met de gewone
  selectieregels (vlakken, randen, schetsentiteiten).
- Options ▸ Performance ▸ *Magnified selection* uit = G doet niets (`perf.magnifiedSelection` staat nu in
  `WIRED_PREFS`). G staat in de sneltoetsenlijst (`shortcuts.ts`).

e2e `e2e/magnify.mjs` (12 checks): glas gecentreerd op de aanwijzer, beschilderd, 3×, klik selecteert het vlak dat
`bodies.pick` onder dat punt vindt, wiel vergroot, Esc sluit en houdt de selectie, G opent/sluit, de randen van een
hoek staan in het glas.

## 3. Maten in een 3D-schets

Kern `src/core/sketch/sketch3d.ts`:
- `Dim3D` = `{ kind: 'length', line, value }` of `{ kind: 'distance', a: [lijn, 0|1], b: [lijn, 0|1], value }`;
  bewaard in `Sketch3DFeature.dims` en `Sketch3DEdit.dims`.
- `solve3D(segs, relations, dims, drag?)`: vergelijkingen voor Along X/Y/Z (twee coördinaten gelijk) en voor de maten
  (|p − q| = waarde); Newton met de kleinste verplaatsing (minimum-norm). Punten op de oorsprong blijven daar (samenvallend
  met de oorsprong). Met `drag` gaat het gesleepte punt eerst exact naar het doel (relaties per coördinaat) en wordt het
  vastgehouden; lukt dat niet, dan mag het punt meegeven (zo dicht als de maten toelaten); lukt ook dat niet, dan blijft
  de schets zoals ze was.
- Status: rang van de Jacobiaan → `dof`; `under` / `full` / `over` (meer vergelijkingen dan rang) / `conflict` (niet
  op te lossen). `status3D`, `measure3D`, `dimsWithoutLine` (Undo last line), `endPoints3D`.

UI:
- `src/app/panels/Sketch3DPM.tsx`: per lijn een Smart Dimension-knop (lengtemaat op de huidige lengte); sectie
  *Dimensions* met de waarden (typen = drijvend, geometrie volgt), × om te wissen, en *Distance* tussen twee eindpunten
  (Point1…). Een maat die de schets zou overbepalen wordt geweigerd met een melding. Typen van X/Y/Z, de lengte in de
  lijnenlijst (= de lengtemaat als de lijn er een heeft) en Along X/Y/Z lossen mee op. De status staat onder Message.
- `src/app/viewport/Sketch3DOverlay.tsx`: de maatwaarden in het beeld (afstand met een stippellijn) en, als de keten
  beëindigd is, de eindpunten als sleephandgrepen (slepen op het actieve vlak door het punt; klikken zonder slepen
  begint een lijn zoals voorheen). De lijnen zijn zwart als de schets volledig bepaald is, anders blauw.
- Statusbalk: Under / Fully / Over Defined voor de 3D-schets (`status-sketch3d`).

Volledig bepaald: een lijn vanuit de oorsprong met Along Z en een lengte (1 relatie + 1 maat) heeft 0 vrijheidsgraden.
Een L met Along Z 30 en Along X 40 (2 relaties + 2 maten) ook. Een tweede maat op een volledig bepaalde lijn is Over
Defined, één die tegenspreekt Conflict.

Tests: `src/core/sketch/sketch3d.test.ts` (12), e2e `e2e/sketch3d2.mjs` (14 checks).

## Beperkingen

- De selectienauwkeurigheid in het vergrootglas is die van het gewone beeld (pick-toleranties in schermpixels); het
  glas vergroot het beeld, niet de pick. Vaste vergrootglaspositie (aanwijzer bewegen binnen het glas) is er niet.
- Lijndikten van schetsen in het glas zijn niet mee vergroot (LineMaterial-resolutie van het hele beeld).
- 3D-maten: geen hoekmaten, geen maat naar de oorsprong anders dan via een eindpunt dat erop ligt, geen naam voor
  Equations/Design Tables; maten worden in het Property Panel aangemaakt, niet door op een lijn in het beeld te klikken.
  Een punt dat van de oorsprong weg gesleept wordt, verliest het samenvallen met de oorsprong.
