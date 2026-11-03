# Options-formaten, IGES en undo 200 (QA 0.5.11: F171, F114 / P2-1, P2-7)

## F171: Options ▸ Import/Export tonen alleen bestaande formaten

- `src/app/prefsSchema.ts` (categorieën `import` en `export`):
  - Export ▸ File Format: was `STL, STEP, IGES, DXF/DWG, PDF, 3MF`, is nu `STL, 3MF, AMF, STEP, DXF, PDF`.
    Dat zijn precies de Save As-ingangen van het File-menu (`src/app/MenuBar.tsx`): STL, 3MF, AMF, STEP AP214 en voor
    een tekening DXF en Adobe PDF.
  - Import ▸ File Format: was `General, STL/OBJ/OFF/PLY/PLY2, STEP/IGES/ACIS, DXF/DWG`, is nu `General, STL, STEP`.
    Open leest alleen .kcad/.json, .stl en .step/.stp (`openFileData`, `openFileDialog`).
  - De standaardwaarden (`STL`, `General` in `src/app/prefs.ts`) bestaan nog, dus geen migratie nodig. Beide opties
    staan niet in `WIRED_PREFS` en blijven grijs (F112); dat verandert niet.
- `src/app/prefs.test.ts`: nieuwe groep "Options ▸ Import/Export list only formats that exist (F171)". Elk
  exportformaat moet een `Save As ▸ …<formaat>`-regel in MenuBar.tsx hebben (IGES expliciet niet), elk importformaat
  moet als extensie in de Open-filters staan. Komt er later een formaat bij in Options zonder exporter, dan faalt de test.

## F114 / P2-1: IGES via OCCT — niet mogelijk met de meegeleverde build (geen code)

Onderzocht: `replicad-opencascadejs` 1.1.0 (`node_modules/replicad-opencascadejs/dist`, single en multi, zelfde
bindings), gebruikt door `replicad` ^1.2.0.

- **Ontbrekende klassen:** `IGESControl_Writer`, `IGESControl_Reader`, `IGESControl_Controller`, `IGESCAFControl_Writer`,
  `IGESCAFControl_Reader`, `BRepToIGES_BREntity`, `IGESToBRep_*`. Geen enkele `IGES*`-klasse is gebonden.
- **Bewijs 1 (typen):** `replicad_single.d.ts` bevat het woord IGES 15 keer, uitsluitend in doc-commentaar van
  `XSControl_Reader` ("When using IGESControl_Reader or STEPControl_Reader …") en bij het FS-commentaar; er is geen
  `declare class IGES…`.
- **Bewijs 2 (runtime):** de module in node geladen (zoals `step.test.ts`) en de sleutels van het OC-object geteld:
  501 bindings; `IGES*` = [] ; wel `STEPControl_Writer`, `STEPControl_Reader`, `STEPCAFControl_Writer`,
  `StlAPI_Writer`, `StlAPI_Reader`, `XSControl_Reader`, `XSControl_WorkSession`, `Interface_Static`.
- **Bewijs 3 (wasm):** in `replicad_single.wasm` staan alleen de meldteksten van de gedeelde XSTEP-berichtenbron
  (`IGES_1000` … en zinnen als "Beginning of IGES file reading."), die in TKXSBase meegelinkt zitten. Er staat geen
  `IGESControl`-, `IGESToBRep`- of `BRepToIGES`-symbool in: de toolkits TKIGES / TKDEIGES zijn niet meegecompileerd.
- **Waarom:** de replicad-build is een op maat gesneden OpenCascade.js-build met alleen wat replicad gebruikt (STEP en
  STL voor import/export). IGES-export vraagt een eigen OpenCascade.js-build (emscripten, custom build-YAML met
  TKIGES/TKDEIGES en de bindings `IGESControl_Controller::Init`, `IGESControl_Writer` (AddShape, ComputeModel, Write),
  `IGESControl_Reader`) of een ander WASM-pakket. Dat is een aparte, grote stap (build-keten, wasm-grootte ±+3 MB,
  bundelbudget F174) en hoort niet in deze ronde.
- Gevolg: IGES staat niet in Options en niet in Save As; F114 blijft deels open voor IGES (DXF/PDF van tekeningen
  bestaan). Er is niets gewijzigd in `occtClient.ts`, de worker of `brep.ts`.

## P2-7: undo/redo over 200 stappen bewezen

- Het stapelplafond staat in `src/core/document/history.ts:4` (`constructor(private limit = 200)`; het plan noemde
  `src/app/history.ts:5`, dat bestand bestaat niet).
- Nieuw: `e2e/undo200.mjs` (playwright, `track`/`checks`/`exitCode`/`waitSettled` uit `e2e/lib/check.mjs`,
  `window.__phlippoKit` en `window.__phlippoStore`). Blok 60 × 40, diepte 10:
  1. geopend: niets te undo'en, volume 24 000;
  2. 200 × `applyDocument` (diepte +1 per stap) → diepte 210, volume 504 000;
  3. 200 × undo → diepte 10, volume gelijk aan het begin binnen 1e-3, canUndo onwaar;
  4. 201e undo verandert niets;
  5. 200 × redo → diepte 210, volume gelijk aan het eind binnen 1e-3; 201e redo verandert niets;
  6. 201 bewerkingen + 200 × undo → diepte 11: de oudste stap is eraf gevallen (plafond 200).
- Toegevoegd aan `SCRIPTS` in `e2e/run-regression.mjs` (alleen die regel).

## Tests

- `npx vitest run src/app/prefs.test.ts src/app/prefsWired.test.ts src/core/occt/step.test.ts src/core/occt/occtClient.test.ts`:
  4 bestanden, 9/9 groen.
- `npm run typecheck` (tsc -b): groen. `node tools/neutral-comments.cjs`: 0 treffers. `node tools/line-budget.cjs`: ok.
- `e2e/undo200.mjs` tegen een eigen dev-server (`npx cross-env VITE_TEST_HOOKS=1 vite --port 5182 --strictPort`),
  Windows/Edge, 7/7 checks, geen fouten, in drie passes: standaard (3,2 s), `?kernel=brep` (5,4 s), `?rebuild=worker`
  (2,6 s). De dev-server is daarna gestopt.
