# Phlippo CAD

Phlippo CAD is een onafhankelijk product van Ian Phlippo. Het is niet verbonden met of goedgekeurd door Dassault Systèmes SolidWorks Corp. en bevat geen SOLIDWORKS-code, -bestanden of -artwork; de werkwijze is gemodelleerd naar publiek getoond gedrag van desktop-CAD-software (o.a. referentievideo's). SOLIDWORKS is een merk van Dassault Systèmes en wordt hier alleen ter referentie genoemd. Licentie: `LICENSE.txt`; gebruikte open-sourcepakketten: `THIRD-PARTY-NOTICES.txt`.

Parametrische 3D-CAD-webapplicatie voor werktuigbouwkundig ontwerp (TypeScript, React, three.js), met een interface die het
bekende desktop-CAD-pakket volgt (CommandManager, FeatureManager, PropertyManager, Heads-up View toolbar, Confirmation Corner).

![Schets](docs/screenshots/03-sketch-dimension.png)

```
npm install
npm run dev        # ontwikkelserver
npm test           # unit tests (vitest)
npm run build      # productiebuild
npm run preview    # serveer de build op :4173
npm run e2e        # Playwright-scenario's tegen de preview
start-app.cmd     # app als eigen venster, schermvullend (Windows, Edge app-modus)
start-desktop.cmd # echte desktop-app (Electron): eigen venster met - [] x, bestandsdialogen
npm run desktop   # desktop-app tegen de dev-server (hot reload)
npm run desktop:build  # installer + portable exe in %LOCALAPPDATA%\PhlippoCAD
elease
npm run e2e:desktop    # Playwright-controle van het desktopvenster (na npm run build)
```

Desktop-app: de map `electron/` bevat de shell (main.cjs: randloos venster, native Open/Save As-dialogen; preload.cjs:
de brug `window.phlippoDesktop`). In het venster sturen de knoppen — ☐ ✕ rechtsboven het echte venster, Open/Save/Save As
gebruiken Windows-bestandsdialogen (.kcad, .stl) en Save onthoudt het pad. De installer wordt buiten de OneDrive-map
gebouwd (OneDrive vergrendelt bestanden tijdens de build).

Documentatie:
- `docs/01-research.md` — onderzoek naar workflow en lay-out van parametrische CAD.
- `docs/02-fase1-schetser.md` — architectuur, tests en demo van fase 1 (2D-schetser).
- `docs/03-vergelijking-solidworks.md` — vergelijking met de SOLIDWORKS-handleiding en doorgevoerde aanpassingen.
- `docs/05-vergelijking-video.md` — vergelijking met de YouTube-video (lokale frames) en gevonden verschillen.
- `docs/06-merken-en-auteursrecht.md` — wat van het origineel vrij is om na te maken en wat vermeden wordt (naam, logo, iconen, merknamen).

Status per fase:
1. 2D-schetser met constraint-solver — **gereed**
2. Feature-modelleren (Extrude met draft en Up To Next/Surface, Cut, Revolve, Sweep, Loft, Rib, Fillet, Chamfer, Mirror, Linear/Circular Pattern, Hole Wizard, Shell, Combine; multi-body met materiaal per body; op een mesh-solidkern met booleans) — **gereed**
3. Variabelen en vergelijkingen (Tools ▸ Equations, Σ-maten) en configuraties (ConfigurationManager, Modify Configurations, configuratie per component) — **gereed**; ontwerptabellen (Excel) gepland
4. Assemblies (Insert Components, Mates, Move/Rotate, BOM, Interference Detection) — **basis gereed**
5. 2D-tekeningen (Sheet Format/Size, Model View, Projected View, Smart Dimension, Center Mark, Note, titelblok) — **basis gereed**
6. Import/export — STL in/uit **gereed**; STEP/IGES niet (geen B-rep)
8. Sheet metal (Base Flange/Tab, Edge Flange, Flatten met K-factor) — **basis gereed**; Hem/Jog/Miter/Unfold gepland
7. Massa-eigenschappen en meten — **gereed** (Mass Properties, Measure); materialen en rendering gepland

## Status 0.3.3 (2026-10-25)

Blokken G-A t/m G-J (docs/10-blokken-g.md): Surfaces compleet, Sheet Metal extra's (Vent, Forming Tool, Gusset, Tab and Slot, Rip, Swept Flange), Evaluate (Performance Evaluation, Symmetry Check, Deviation/Parting Line Analysis, Compare, SimulationXpress-schatting), Customize-dialoog met echte instellingen, Weldments met cut list, Material-velden + MBD Dimensions (DimXpert), Deform, Save As-opties, Publish to Phlippo Viewer (*.html), tekening bend lines. Unit tests 322, e2e-regressie 76 scripts.

## Status 0.3.2 (2026-10-25)

Het externe QA-rapport (52 bevindingen) is verwerkt: dataverlies-routes dicht (rebuild zonder undo-verlies, validatie bij openen, atomaire save met .bak, Save changes?, autosave per document), Electron-beveiliging (paden, CSP, navigatie, testhooks, fuses), invoervalidatie met eenheden, GPU-opruiming, start zoals SW (lege app + Welcome), muisgebaren en Enter-herhaling, exitcodes in alle e2e-scripts en een CI-workflow. Per bevinding: docs/08-qa-rapport.md.
