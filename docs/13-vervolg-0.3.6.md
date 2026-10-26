# Open punten van QA-rapport v0.3.4 afgewerkt → 0.3.6 (2026-10-26)

Vervolg op `docs/12-qa-rapport-v0.3.4.md`: de bevindingen die daar **deels** of **open** stonden en zonder externe
beslissing af kunnen. Geen nieuwe CAD-functies; gedrag en bestandsinhoud blijven gelijk.

| ID | Status | Wat er veranderd is | Bewijs |
|---|---|---|---|
| F34 | opgelost | Code splitting: de dialogen (opties, vergelijken, ontwerpstudie, BOM, …), de tekeningweergave, de panelen van tekeningen, assemblies en analyses en het Property Panel laden als eigen chunk (`src/app/lazy.tsx`). Ze worden 300 ms na de eerste weergave op de achtergrond opgehaald, zodat het eerste commando niet wacht; eenmaal geladen tonen ze zonder Suspense-vertraging. `manualChunks` zet three.js, de CSG-bibliotheken, React en de kernel (`src/core`) apart. Hoofdbundel **2 168 kB → 830 kB** (gzip 587 → 221 kB), geen chunk-waarschuwing meer. | `npm run build`, regressie |
| F36 | opgelost | De store (5 326 regels, 462 eigenschappen) is opgesplitst in negen slices per onderwerp in `src/app/slices/` (document, sketch, features, assembly, drawing, ui, sheetMetal, tolerancing, weldments). Elke slice heeft een `Pick<State, …>`-type, dus de typecontrole bewaakt dat elke eigenschap precies één keer bestaat; `useStore` en elke selector werken ongewijzigd. store.ts houdt de types, de gedeelde hulpfuncties en de drie acties die module-toestand gebruiken (1 364 regels). 126 van de 128 componenten die de hele store lazen, lezen nu met `useShallow` alleen de velden die ze gebruiken (en `isCommandActive` als één boolean); ze renderen niet meer bij elke wijziging elders. De twee overige (Measure-dialoog, Drag Handles) geven de hele toestand door aan een rekenfunctie en zijn klein. | tsc, 346 unit tests, regressie |
| F50 | opgelost | Interne namen zonder productnamen: bestanden (`PropertyPanel.tsx`, `AutoTolerancePM.tsx`, `ConfigurationPanel.tsx`, `core/document/autoTolerance.ts`, `DragHandles.tsx`, `DragDimensions.tsx`, `MotionTimeline.tsx`), componenten, store-acties, dialoog-id's, test-id's, CSS-klassen en commentaren (540 plaatsen). Het bestandsveld `dimxpert` heet `autoTolerance`: bestandsformaat 2, een format-1-bestand wordt bij openen omgezet (ook in onderdelen binnen een assembly en modellen in tekeningweergaven). Opgeslagen opties onder de oude sleutels blijven gelden (`renameOldKeys`). Zichtbaar: "Stud Wizard" → "Stud Tool" (ook in de merknamencontrole). Alleen de juridische vermelding (`legal.ts`) en de controlelijsten noemen de merknamen nog. | persistence.test (format 1 → 2), prefs.test, `tools/rename-trademarks.cjs --check` |
| F21 | opgelost | Taakvenster op referentiemaat (frame 17): losse grijze tabs van 24 px met rand, iconen 20 px, de strip alleen zo hoog als de tabs en 50 px onder de bovenrand van het grafische venster, zoals de referentie. De iconen blijven eigen ontwerp. | screenshot `docs/screenshots/0.3.6-taakvenster.png` |
| F16 | opgelost (lettertype) / bewust (iconen) | Gemeten naast frame 17: Segoe UI 12 px (9 pt), tabs 22 px hoog, ribbonlabels 11 px — gelijk aan de referentie. De iconen blijven eigen ontwerp: het rapport zelf adviseert herkenbaarheid van de workflow boven pixelgelijkenis (IP-risico). | screenshot |
| F46 | beoordeeld | Zie hieronder. Het tijdsbudget (45 s) en de patroonlimiet van 0.3.4 blijven de bescherming tegen een hangende app. | — |

## F46: rebuild in een worker — haalbaarheid

- **Wat het vraagt.** `rebuildDocument` wordt op 71 plaatsen synchroon aangeroepen; acties lezen direct daarna
  `get().rebuild` (vlakken kiezen na een commit, foutmeldingen, preview). Async maken betekent dat elke actie en elke
  e2e-verwachting moet wachten op een resultaat dat later binnenkomt.
- **Wat er over de grens moet.** Het document is JSON en gaat zonder moeite naar een worker. Het resultaat niet:
  `Body` bevat `THREE.BufferGeometry`, vlak- en randtabellen en `Set`s; die moeten als getypte arrays worden
  overgedragen en in de hoofdthread opnieuw opgebouwd.
- **Wat zonder alles async te maken kan.** Een worker alleen voor de zware, niet-interactieve paden: een document
  openen en Rebuild All (Ctrl+Q), met voortgang en Annuleren; interactieve bewerkingen blijven synchroon. Dat vraagt
  de geometrie-serialisatie hierboven en een "rebuilding…"-toestand in de UI.
- **Advies.** Samen met de keuze voor een B-rep-kernel (F47/F51) doen: een WASM-kernel draait toch in een worker,
  en de serialisatie van het resultaat is dan één keer werk in plaats van twee keer.

## Nog open (buiten deze ronde)

- F49 code signing: vraagt een certificaat van Ian.
- F47/F51 B-rep-kernel: architectuurkeuze, na GO.
