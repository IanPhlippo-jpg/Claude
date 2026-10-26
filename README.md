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

## Status 0.4.1 (2026-10-26)

Ook Miter Flange, Revolve Thin, weldment-frames (Structural Member, Trim/Extend, End Cap), Combine en Intersect, Stud en elk gereedschap met alleen vlakke vlakken bouwen exact met OpenCascade. Zie docs/18-brep-plaatwerk-weldments-0.4.1.md.

## Status 0.4.0 (2026-10-26)

Ook alle extrude-eindcondities (Up To Vertex/Next/Surface/Body, Offset From Surface, From offset, Flip side to cut), Thin Feature en Rib van lijnen, plaatwerk (Base Flange, Tab, Edge Flange, Hem, Jog, Sketched Bend met echte bochtcilinders) en afrondingen met meerdere of variabele radius bouwen exact met OpenCascade. Zie docs/17-brep-eindcondities-0.4.0.md.

## Status 0.3.9 (2026-10-26)

Ook patronen (lineair, cirkelvormig, sketch/curve/table/fill), mirror van features en bodies, loft tussen twee profielen, extrude met draft en de Draft-feature bouwen nu exact met OpenCascade; de mesh-kern blijft de terugval. Zie docs/16-brep-open-stukken-0.3.9.md (met de bevinding over shell naast een afronding).

## Status 0.3.8 (2026-10-26)

De modelleerfeatures bouwen met de B-rep-kern (OpenCascade) en vallen per feature terug op de mesh-kern: extrude en cut, revolve, sweep, Hole Tool, fillet, chamfer en shell geven exacte cilinders, kegels en afrondingen; Mass Properties en STEP-export gebruiken de exacte bodies; de hele Deurkruk (onderdelen en assembly) is exact. Uit te zetten in Tools ▸ Options ▸ Performance. Zie docs/15-brep-features-0.3.8.md.

## Status 0.3.7 (2026-10-26)

STEP in en uit via OpenCascade (File ▸ Open van *.step/*.stp, Save As ▸ STEP AP214), in een eigen worker die pas bij het eerste gebruik laadt. Afrondingen en afschuiningen houden hun rand als een eerdere feature hem verschuift. Geen code signing (besluit): zie docs/14-brep-kern-0.3.7.md, met de metingen van de B-rep-spike en het migratiepad.

## Status 0.3.6 (2026-10-26)

De open punten van het QA-rapport over 0.3.4 die zonder externe beslissing af konden: de hoofdbundel van 2 168 naar 830 kB (dialogen en panelen als eigen chunk, three/CSG/React/kernel apart), de store opgesplitst in negen slices met componenten die alleen hun eigen velden lezen, interne namen zonder programmanamen (bestandsformaat 2 met automatische omzetting van format 1, oude optiesleutels blijven gelden), taakvenster-tabs op referentiemaat en een haalbaarheidsoordeel voor rebuild in een worker. Per punt: docs/13-vervolg-0.3.6.md. Unit tests 346, regressie 81/81.

## Status 0.3.5 (2026-10-26)

Het QA-rapport over 0.3.4 (92 bevindingen, 6/10, NO-GO) is verwerkt, opnieuw zonder nieuwe functies: opslagvraag tijdens Edit Component, half-geldige bestanden geweigerd (verwijzingen, featuretypes, grenzen), What's Wrong bij rebuild-fouten, meldingen bij geweigerde of aangepaste invoer, de laatste programmanamen en "as the original"-commentaren neutraal, Quick Beam Estimate zonder veiligheidskleur, app:// in plaats van file:// (met overzetting van de opgeslagen gegevens), geen debugpoort of permissies in de geïnstalleerde app, testhaken alleen in de e2e-build, één gedeelde e2e-helper, lektest en CI met timeout en git-diff-controle. Per bevinding: docs/12-qa-rapport-v0.3.4.md. Regressie: `npm run build:e2e` en `node e2e/run-regression.mjs`.

## Status 0.3.4 (2026-10-25)

Het externe QA-rapport over 0.3.3 (76 bevindingen, NO-GO) is verwerkt zonder nieuwe functies: de app werkt zonder testhaken (viewport-brug), kapotte documenten worden geweigerd zonder crash of autosave, de Viewer-export is tegen script-injectie beveiligd, undo dekt alle modelwijzigingen, commando's staan grijs zonder body, eigen plaatwerkiconen, vlaklabels zonder overlap, SimulationXpress is een indicatieve Quick Beam Estimate, geen SOLIDWORKS-productnamen meer in de UI, licentie en third-party notices, strengere Electron-instellingen, en elk e2e-script faalt nu ook op een page error. Per bevinding: docs/11-qa-rapport-v0.3.3.md. Unit tests 337, e2e-regressie `npm run e2e:regression` (79 scripts).

## Status 0.3.3 (2026-10-25)

Blokken G-A t/m G-J (docs/10-blokken-g.md): Surfaces compleet, Sheet Metal extra's (Vent, Forming Tool, Gusset, Tab and Slot, Rip, Swept Flange), Evaluate (Performance Evaluation, Symmetry Check, Deviation/Parting Line Analysis, Compare, SimulationXpress-schatting), Customize-dialoog met echte instellingen, Weldments met cut list, Material-velden + MBD Dimensions (DimXpert), Deform, Save As-opties, Publish to Phlippo Viewer (*.html), tekening bend lines. Unit tests 322, e2e-regressie 76 scripts.

## Status 0.3.2 (2026-10-25)

Het externe QA-rapport (52 bevindingen) is verwerkt: dataverlies-routes dicht (rebuild zonder undo-verlies, validatie bij openen, atomaire save met .bak, Save changes?, autosave per document), Electron-beveiliging (paden, CSP, navigatie, testhooks, fuses), invoervalidatie met eenheden, GPU-opruiming, start zoals SW (lege app + Welcome), muisgebaren en Enter-herhaling, exitcodes in alle e2e-scripts en een CI-workflow. Per bevinding: docs/08-qa-rapport.md.
