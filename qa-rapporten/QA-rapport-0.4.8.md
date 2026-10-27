# Phlippo CAD — QA-rapport v0.4.8

Hertest door Grok Bot op **27-10-2026**, ca. 08:07–10:00 (Brussel, UTC+1), op een **read-only** kopie van de laptop-repo (git bundle + schone werkmap op HEAD `81f9c95`). Omgeving: Linux, headless Chromium (Playwright), `vite preview` :4173, `build:e2e`. De lat blijft kritisch: ziet het eruit en werkt het als SOLIDWORKS 2026? Zelfstandig leesbaar voor de ontwikkelagent op de laptop van Ian. **De strengste ernst wint.**

## 0. Versie en commit

- Branch (laptop): `claude/fase1-schetser`, **HEAD `81f9c95`**, `git describe` → **`v0.4.8-2-g81f9c95`** (tag `v0.4.8` + 2 docs-commits).
- `package.json` version **0.4.8**. Werkmap op de laptop was **schoon** (geen uncommitted changes). Branch staat **42 commits ahead** of `origin` (niet gepusht; geen blokker voor deze QA).
- Sinds 0.3.4-basis `4d52596`: **27 commits**, groot diff (o.a. B-rep/OpenCascade, store-slices, Electron app://, QA-fixes F74/F80/…). Tags: v0.3.4 … v0.4.8.
- Getest: clone van bundle op de box, commit `81f9c95`. Geen commit/checkout/stash op de laptop.

## 1. Oordeel

**Score 7/10 (was 6/10 in 0.3.4). NO-GO voor release.** Eigen gebruik door Ian: GO, met de voorwaarden onder Teamoordeel. **Teamoordeel: 5 van 5 reviewers binnen (Strati, Webi, Riki, Risk, MT5 Developer), unaniem NO-GO voor release; GO voor eigen gebruik met backups.** Scores 7 / 7 / 7 / 7,5 / 7 → strengste **7/10**. Ernst na de teamreview: de strengste voorgestelde ernst geldt.

0.4.8 is een grote sprong t.o.v. 0.3.4: OpenCascade B-rep (worker) met mesh-terugval, store opgesplitst, bundel 2,16 MB → 0,86 MB, vrijwel alle P1-punten van 0.3.4 dicht (F74, F78, F80, F82, F57, F84–F89, F92, Hole Wizard→Hole Tool, Share-tab, Quick Beam zonder groene FOS). Regressie **85/86** groen, vitest **393/393**, tsc 0, npm audit 0.

**Blokkers:** CI-waarheid (F93↑Kritiek + F10/F54/F31/F95/F98 — geen "groen" zonder CI-link), packaged Windows smoke onder app://+WASM (F97 Kritiek), merknamen (F50/F94↑Major), B-rep-eerlijkheid + UI-thread (F51/F99/F46/F105–F107), topologie (F47/F48).

- Bevindingen totaal: **107** (F01–F107). Ernst: 16 kritiek, 48 major, 43 minor.
- Status F01–F92: 77 opgelost, 13 deels, 2 open.
- Nieuw in 0.4.8: **15** (F93–F107). Uit QA-ronde 4 (F93–F96); uit teamreview **11** (F97–F107): 1 kritiek, 6 major, 4 minor.
- Nog niet opgelost (incl. nieuw): **30** — 5 kritiek (F31, F50, F51, F93, F97), 15 major, 10 minor.
- GO-voorwaarden: **8 gehaald, 1 deels, 1 niet** (was 5/4/1).

## 2. GO-voorwaarden

| # | Voorwaarde | Status | Toelichting |
|---|---|---|---|
| 1 | Opslaan alleen via main | Gehaald | Handles (F68) |
| 2 | Schemavalidatie | Gehaald | F80: refs, types, length-grenzen (rest: MAX_FILE_NUMBER 1e12 generiek) |
| 3 | Atomische saves | Gehaald | tmp + fsync + rename |
| 4 | .bak | Gehaald | .bak + .bak2 |
| 5 | Vraag bij unsaved / Edit Component | Gehaald | F74/F41; qa4 groen |
| 6 | Invoerlimieten + melding | Gehaald | F81 showNote + pattern-limit |
| 7 | Aantal-limieten | Gehaald | max 250 |
| 8 | CSP remote/file images | Gehaald | |
| 9 | e2e faalt + CI groen | **Niet** | drawing rood Linux (F10/F54); valse 86/86-claims (F93); geen remote CI-bewijs (F98); desktop-nohooks niet in CI (F100); Node CI≠QA (F95) |
| 10 | Merknamen + disclaimer | Deels | Hole Tool + Share ok; Pack and Go / Weldments / MBD Dimensions nog (F50/F94) |

Noot bij GO (Strati/Webi/MT5D): packaged Electron onder `app://` + OCCT WASM is niet smoke-getest op Windows (F97 Kritiek) — hoort bij GO, niet "buiten de 10". Code signing bewust gesloten (F49, besluit Ian) voor privé; heropenen vóór publieke release.

## 3. Top 5

1. **CI-waarheid (F93/F10/F54/F31/F95/F98/F100).** Geen claim "groen" zonder CI-link. Drawing groen op Linux of eerlijke skip + issue; docs/commits "86/86" corrigeren; Node pin (CI 22 = QA 22); branch pushen; desktop-nohooks in CI.
2. **Windows packaged smoke + push (F97/F98).** NSIS-build zonder hooks: open/schets/extrude/fillet/STEP/Save onder app://+WASM; daarna push naar origin (B-rep staat nu alleen op de laptop).
3. **Merknamen (F50/F94).** Pack and Go → Package Files; MBD Dimensions → Product Dimensions; optioneel Weldments → Frames; commentaren opruimen.
4. **B-rep-eerlijkheid + UI-thread (F51/F99/F46/F105/F106/F107).** Exact/mesh-indicator; STEP-waarschuwing; B-rep in meer e2e; occt-timeout; mesh-CSG/solver van UI-thread of budget ~5 s; solver-worker gebruiken of schrappen.
5. **Topologie (F47/F48).** Stabiele edge-id’s afronden; manifold-check na boolean.

## 4. Testresultaten

| Stap | Resultaat | Status |
|---|---|---|
| Snapshot laptop | Bundle + schone WT 81f9c95 / v0.4.8 | Groen |
| tsc --noEmit | 0 fouten | Groen |
| vitest | 393/393 in 103 files | Groen |
| npm audit | 0 | Groen |
| build:e2e | index 862 kB (gzip 230); chunks kernel/three/PropertyPanel | Groen |
| Regressie 86 scripts | **85/86**; failed: **drawing** (22/24) | Rood |
| leak / qa1–qa4 / brep / bodies | groen (incl. F74/F80 in qa4) | Groen |
| UI-shots | welcome, empty part, sketch, assembly Share; F14 disabled; Hole Tool; Pack and Go zichtbaar | Waarschuwing |
| Packaged Electron / Windows installer | Niet hertest deze ronde (F97) | — |

## 5. Verbeteringen sinds 0.3.4 (hoogtepunten)

- B-rep: replicad/OpenCascade-worker, STEP, exacte features met mesh-terugval (F51 deels).
- Store slices + useShallow; bundel −60% (F34, F36).
- F74/F41, F78/Whats Wrong, F80 validatie, F81 meldingen, F82 tags, F57 helper, F84–F89 Electron-lockdown, F92 commentaren weg, F56 FOS neutraal, F14 Linear Pattern grijs, F19/F20 XYZ + Confirmation Corner, F79 Final Render.
- Hole Wizard → Hole Tool; Lifecycle → Share.

## 6. Score per gebied (t.o.v. SOLIDWORKS 2026)

| Gebied | Score | Was 0.3.4 |
|---|---|---|
| Schetsen | 7 | 6 |
| Features | 8 | 7 |
| UI / look | 7 | 6 |
| Tekening | 5 | 5 |
| Assembly | 7 | 6 |
| Performance | 6 | 5 |
| Code / tests | 7 | 5 |
| Bestanden | 8 | 6 |
| Beveiliging | 8 | 7 |
| **Totaal** | **7/10** | 6 |

## 7. Alle bevindingen

Prioriteit: P1 GO-blokker · P2 vóór release · P3 look/kwaliteit · P4 opgelost. Status t.o.v. 0.3.4 in kolom “Was”. Na teamreview: strengste ernst wint.

### P1 (7)

#### F10 · Major · Open · Tekening — Ø-maat en tekening herstellen na reload
- Was 0.3.4: Open
- Bewijs: logs/regression.log: drawing exit=1, 22/24 — FAIL diameter Ø35 placed, FAIL drawing restored after reload (zelfde als 0.3.4; docs claimen 86/86) Teamnoot (Riki): reload-check (dims.length===2) is vervolg van Ø35 — zie F102.
- Repro: node e2e/drawing.mjs op Linux
- Fix: Ø-picking onafhankelijk van font/metrix; reload wacht op herstelde staat; CI-artifact met screenshot.

#### F31 · Kritiek · Deels opgelost · Proces — e2e-exitcodes / CI / niet-gecommit werk
- Was 0.3.4: Deels opgelost
- Bewijs: Versie gecommit/getagd; e2e/lib/check.mjs; CI timeout; drawing nog rood → CI zou rood zijn Teamnoot: Riki stelde Major voor; strengste wint → Kritiek blijft (drawing houdt GO #9 dicht).
- Repro: run-regression Linux
- Fix: F10 oplossen.

#### F50 · Kritiek · Deels opgelost · Juridisch — SW-handelsmerken
- Was 0.3.4: Deels opgelost
- Bewijs: Hole Wizard→Hole Tool; Lifecycle→Share; FeatureManager/PM/DimXpert weg; uiText.test NAMES-regex. Nog zichtbaar: Weldments, MBD Dimensions, Pack and Go (AssemblyTab/Share). Commentaren noemen nog Lifecycle/MBD. Teamnoot: Risk stelde Major voor; strengste wint → Kritiek blijft tot Pack and Go hernoemd is.
- Repro: Ribbon + Share-tab shot app-08
- Fix: Pack and Go→Package Files; MBD Dimensions→Product Dimensions; Weldments mag blijven of → Frames; commentaren opschonen.

#### F54 · Major · Open · Proces — CI rood op Linux; 'regressie groen' niet reproduceerbaar
- Was 0.3.4: Deels opgelost
- Bewijs: Alleen drawing faalt: DONE 85/86 failed: drawing — CI op Linux zou rood zijn
- Repro: run-regression
- Fix: Zie F10.

#### F93 · Kritiek · Nieuw · Proces — Docs/commits claimen regressie 86/86 terwijl drawing op Linux rood blijft
- Was 0.3.4: —
- Bewijs: Commit 8285999 e.a. "regressie 86/86"; docs/12 claimt F10 opgelost. Deze ronde: DONE 85/86 failed: drawing (Ø35 + reload) — identiek aan 0.3.4 op Linux. Team: alle 5 reviewers → Kritiek (derde ronde valse groen-claims).
- Repro: Vergelijk git log --grep=86/86 met node e2e/drawing.mjs op Linux
- Fix: Claims aanpassen tot drawing groen is of expliciet "Windows 86/86, Linux drawing bekend rood" + issue-link; F10 eerst fixen.

#### F97 · Kritiek · Nieuw · Electron — Packaged app:// + OCCT WASM niet smoke-getest op Windows
- Was 0.3.4: —
- Bewijs: Packaged Electron/NSIS deze ronde niet hertest terwijl app:// + OCCT WASM-worker nieuw zijn. desktop-installed.mjs checkt alleen start/versie/debug-weigering — geen sketch/extrude/fillet/STEP/WASM. Zelfde faalklasse als F53. [Strati N1 · Webi a · MT5D-06]
- Repro: Windows NSIS-build: open part → extrude → fillet → STEP → Save; of uitbreiden desktop-installed/nohooks.mjs
- Fix: Windows packaged smoke zonder hooks: app://+WASM laden, Zoom/Fit, Final Render, extrude+fillet, STEP, Save/Save As. Gate release erop.

#### F98 · Major · Nieuw · Proces — 42 commits niet gepusht / geen bewijs van remote CI-run
- Was 0.3.4: —
- Bewijs: Branch 42 ahead of origin; hele B-rep-migratie alleen op de laptop. Geen Actions-artifact in report-0.4.8/logs/. 'CI rood' = lokale inferentie. [Strati N2 · Riki R02]
- Repro: git status -sb; ls report-0.4.8/logs/; geen Actions-URL in docs
- Fix: Push naar (private) origin; Actions-artifact van drawing-run bewaren; pas daarna "CI" claimen.

### P2 (12)

#### F38 · Major · Deels opgelost · Docs — README/TASKS
- Was 0.3.4: Deels opgelost
- Bewijs: docs/12 claimt F10/F54 opgelost; commits 0.4.x claimen regressie 86/86; op Linux drawing rood (F93)
- Repro: docs vs logs/regression.log
- Fix: Docs/commits eerlijk houden over Linux-CI.

#### F46 · Major · Deels opgelost · Performance — CSG/solver op de UI-thread
- Was 0.3.4: Deels opgelost
- Bewijs: OCCT-worker + solver-worker; mesh-CSG (csg) nog synchroon op UI-thread voor niet-B-rep features; rebuildBudgetMs=45_000 (rebuild.ts:805); brepRefine async na mesh Teamnoot (MT5D/Webi): solver.solveSync enige pad; solver.solve 0 callers; mesh csg() sync; budget 45 000.
- Repro: Zwaar fillet/patroon
- Fix: Mesh-booleans naar worker of budget ~5 s + voortgang; meer features exact via B-rep.

#### F47 · Major · Deels opgelost · Geometrie — Topologische naamgeving
- Was 0.3.4: Open
- Bewijs: 0.3.7: stabiele randverwijzingen (richting+normalen); volledige topologische namen nog apart traject (docs/19)
- Repro: Edge-fillet na edit
- Fix: Topologische id’s afronden.

#### F48 · Major · Deels opgelost · Geometrie — CSG-resultaat ongecontroleerd / toleranties
- Was 0.3.4: Deels opgelost
- Bewijs: B-rep volume-check vs meshTool (rebuild.ts); niet overal manifold-gate
- Repro: Boolean zwaar
- Fix: Structurele manifold-check na elke boolean.

#### F51 · Kritiek · Deels opgelost · Geometrie — Mesh-kernel
- Was 0.3.4: Open
- Bewijs: OpenCascade via replicad in occt.worker.ts; pref perf.brepKernel; STEP in/uit; mesh-kernel blijft terugval voor niet-ondersteunde features (docs/15–19) Teamnoot (MT5D/Strati): dekking ongemeten; geen exact/mesh-indicator (zie F99).
- Repro: Part met extrude+fillet; STEP export
- Fix: Feature-dekking meten; mesh-pad uitfaseren waar B-rep groen is.

#### F94 · Major · Nieuw · Juridisch — Pack and Go, Weldments en MBD Dimensions nog zichtbaar
- Was 0.3.4: —
- Bewijs: Share-tab: Pack and Go (shot app-08); tabs Weldments + MBD Dimensions (ui48). Onderdeel restant F50. Teamnoot (Strati/Risk): Major — restant van F50, bepaalt GO #10.
- Repro: Assembly → Share; Part → tabs
- Fix: Hernoemen of onder F50 afronden; qa-regex uitbreiden.

#### F95 · Major · Nieuw · Portabiliteit — Node not pinned: CI Node 22 vs QA Node 20, no engines field
- Was 0.3.4: —
- Bewijs: package.json heeft geen engines-veld (geverifieerd 81f9c95). CI (.github/workflows/ci.yml:14) pinned Node 22; QA/box draaide Node v20.19.2. Oud bewijs 'engines ≥22' is stale (Webi/MT5D/Risk). Strati: Major — Node eerst gelijktrekken vóór drawing-debug.
- Repro: node -v; cat .github/workflows/ci.yml | grep node-version; node -e "console.log(require('./package.json').engines)"
- Fix: QA/docs op Node 22 zetten (match CI), of engines.node pin + matrix 20+22; daarna drawing debuggen.

#### F99 · Major · Nieuw · Geometrie — Geen exact-vs-mesh-indicator; STEP voor fallback-bodies onbewezen
- Was 0.3.4: —
- Bewijs: Body.exact bestaat; UI toont geen badge/label exact vs benadering. STEP-export sewt mesh-bodies stil (occt.worker shapesToStep); geen waarschuwing als exact < bodies.length. [Strati N3 · MT5D-02]
- Repro: Part met mesh-terugval → Feature Tree; STEP export; check UI-waarschuwing
- Fix: Indicator per body in Feature Tree/statusbalk; warn/block STEP bij non-exact; documenteer welke features exactheid verliezen.

#### F100 · Major · Nieuw · Tests — desktop-nohooks niet in CI
- Was 0.3.4: —
- Bewijs: desktop-nohooks.mjs dekt Final Render + Zoom to Fit zonder hooks, maar staat niet in .github/workflows/ci.yml noch in run-regression.mjs. CI compileert release-build maar test functioneel alleen build:e2e (hooks aan). F53-regressie kan CI groen laten. [Risk R1 · Riki R01]
- Repro: rg desktop-nohooks .github/workflows/ci.yml e2e/run-regression.mjs
- Fix: desktop-nohooks (xvfb) na npm run build in CI, of Playwright tegen release-dist zonder VITE_TEST_HOOKS.

#### F105 · Major · Nieuw · Tests — B-rep-pad bijna nooit in regressie geoefend
- Was 0.3.4: —
- Bewijs: brepRefine: onder TEST_HOOKS is B-rep uit tenzij localStorage.phlippo.kernel==='brep'. Alleen e2e/brep.mjs en desktop.mjs zetten de flag; 84/86 regressiescripts rebuilden op mesh. [MT5D-01]
- Repro: rg phlippo.kernel e2e/; tel SCRIPTS vs brep-flag
- Fix: Default e2e naar brep als WASM laadt, of CI-matrix PHLIPPO_KERNEL=brep op features+fillet+step+bodies; assert bodies.exact waar claimed.

#### F106 · Major · Nieuw · Geometrie — occtClient.call zonder timeout of cancel
- Was 0.3.4: —
- Bewijs: occtClient.call: pending.set + postMessage, geen setTimeout/AbortSignal. Vastgelopen WASM laat Promise hangen. SolverClient.solve eveneens zonder timeout/onerror. [MT5D-03]
- Repro: Lees src/core/occt/occtClient.ts call(); src/core/solver/solverClient.ts
- Fix: Per-call timeout (bijv. 60 s refine / 120 s STEP), reject + worker herstarten; UI: "exact refine timed out — showing mesh".

#### F107 · Major · Nieuw · Kwaliteit — Sketch-solver-worker is dode code
- Was 0.3.4: —
- Bewijs: SolverClient.solve nooit aangeroepen (rg: 0). Productiepad alleen solveSync (store.ts:1096/1299/1304). solver.worker.ts (18 regels) shipped maar unused; comment claimt async solves — false. [MT5D-04]
- Repro: rg "solver\.solve" src; lees solverClient.ts + store.ts call sites
- Fix: solveAll/non-drag via solver.solve routeren, of worker verwijderen en async-claim schrappen.

### P3 (11)

#### F16 · Major · Deels opgelost · Visueel — Iconen en lettertype
- Was 0.3.4: Deels opgelost
- Bewijs: Plaatwerk/eigen iconen; Segoe-referentie niet pixelgelijk; ontwerpronde 0.4.4–0.4.8 verbeterde previews
- Repro: compare
- Fix: Icon-set en lettertype verder afstemmen of workflow-herkenbaarheid als doel houden.

#### F21 · Minor · Deels opgelost · Visueel — Taakvenster-iconen
- Was 0.3.4: Open
- Bewijs: Taakvenster-tabs op referentiemaat (0.3.6); iconen niet volledig hertekend
- Repro: Taakvenster
- Fix: Iconen nalopen.

#### F22 · Minor · Deels opgelost · Visueel — Body-randen
- Was 0.3.4: Deels opgelost
- Bewijs: Randdikte ongewijzigd
- Repro: Model met body
- Fix: Lijndikte silhouet/randen afstemmen.

#### F24 · Minor · Deels opgelost · Visueel — Extra rij in Modify
- Was 0.3.4: Open
- Bewijs: Modify Reverse sense (0.4.6); extra rij niet opnieuw bewezen weg
- Repro: Smart Dimension dubbelklik
- Fix: Layout naast referentie controleren.

#### F28 · Minor · Deels opgelost · UX — Bestandsdialoog bij Insert Component
- Was 0.3.4: Deels opgelost
- Bewijs: Code aanwezig; packaged desktop niet hertest deze ronde
- Repro: Insert Component desktop
- Fix: desktop-installed.mjs op Windows.

#### F33 · Minor · Deels opgelost · Portabiliteit — Machinegebonden scripts
- Was 0.3.4: Deels opgelost
- Bewijs: look-scripts buiten regressie; desktop:build vereist schone tree
- Repro: e2e/look-*.mjs
- Fix: Documenteren.

#### F96 · Minor · Nieuw · UX — tipTexts Tolerance Sum spreekt nog van stack-up
- Was 0.3.4: —
- Bewijs: tipTexts.ts:90 'Adds up a chain of tolerances (stack-up)' vs Ribbon-disclaimer 'all dimensions'
- Repro: Hover Tolerance Sum
- Fix: Tooltip gelijk trekken aan de dialoogtekst.

#### F101 · Minor · Nieuw · Tests — clickall (en desktop-export/peek) zonder exit-code
- Was 0.3.4: —
- Bewijs: clickall.mjs eindigt na writeFileSync + browser.close() zonder process.exit/exitCode. Niet in SCRIPTS → laag risico, wel vals groen bij handmatig draaien. [Riki R03]
- Repro: node e2e/clickall.mjs; echo $?
- Fix: exitCode/process.exit toevoegen of scripts naar e2e/tools/ + documenteren.

#### F102 · Minor · Nieuw · Tests — Reload-check in drawing blijft gekoppeld aan Ø35
- Was 0.3.4: —
- Bewijs: drawing.mjs ~r.201 eist dims.length===2; bij Ø35-falen dus twee FAIL-regels voor één oorzaak. Info logt dims (beter), maar F10 oogt als twee bugs. [Riki R04]
- Repro: Lees drawing.mjs rond reload-assert; vergelijk met Ø35-fail
- Fix: Reload-assert splitsen (views/notes vs dims) of dims alleen checken als Ø35 eerst groen was.

#### F103 · Minor · Nieuw · Kwaliteit — PropertyPanel-monolith (3932 regels) na F36
- Was 0.3.4: —
- Bewijs: Store is gesplitst (F36 Opgelost), maar PropertyPanel.tsx is nog 3932 regels (lazy-loaded, niet gesplit). [Webi b · MT5D-05]
- Repro: wc -l src/app/panels/PropertyPanel.tsx
- Fix: Splitsen per feature-familie achter hetzelfde panel-shell; line-count budget in CI.

#### F104 · Minor · Nieuw · Electron — blank.html-flits op file:// vóór app://
- Was 0.3.4: —
- Bewijs: migrateStorage loadFile't kort blank.html op file:// vóór app://. CSP default-src 'none'; navigation deny staat; restant. [Webi c]
- Repro: Start desktop; let op korte file://-flits; lees migrateStorage
- Fix: Direct app:// laden of blank.html vermijden in het migratiepad.

### P4 (77) — Opgelost

#### F01 · Kritiek · Opgelost · Performance — WebGL-geheugenlek bij bewerken
- Was 0.3.4: Opgelost
- Bewijs: zz-leak34: geometries/textures/programs/VAO constant 11/4/3/4 over 75 bewerkingen + 10x new/open · hertest 0.4.8: geen regressie
- Repro: Leak-script: 75 extrude-bewerkingen, 10x New/Open, renderer.info vergelijken
- Fix: Geen; leak-test in CI houden.

#### F02 · Kritiek · Opgelost · Beveiliging — file:save naar willekeurig pad
- Was 0.3.4: Opgelost
- Bewijs: electron/main.cjs: ondoorzichtige handles (F68), save alleen naar door main gekozen pad · hertest 0.4.8: geen regressie
- Repro: Code-review main.cjs save-handler
- Fix: Geen.

#### F03 · Major · Opgelost · Beveiliging — Geen CSP, navigatie- en sender-beveiliging
- Was 0.3.4: Opgelost
- Bewijs: main.cjs: will-navigate/will-frame-navigate/will-redirect geblokkeerd, trusted() exact (alleen code, niet in Electron-binary getest) · hertest 0.4.8: geen regressie
- Repro: Code-review
- Fix: In desktop-installed.mjs een navigatiepoging + drop van een extern bestand testen.

#### F04 · Major · Opgelost · Beveiliging — Testhooks in productie
- Was 0.3.4: Opgelost
- Bewijs: Desktop-simulatie (phlippoDesktop, testHooks:false): alle window.__phlippo* undefined; src/app/testHooks.ts:12 · hertest 0.4.8: geen regressie
- Repro: zz34-desktop.mjs
- Fix: Geen.

#### F05 · Kritiek · Opgelost · Bestanden — Geen schemavalidatie bij openen
- Was 0.3.4: Deels opgelost
- Bewijs: persistence.ts: whitelist FEATURE_TYPES, entity→punt, feature→schets, depth/thickness/radius 0…1e6 (qa4 groen)
- Repro: Open half-geldig .kcad
- Fix: MAX_FILE_NUMBER 1e12 voor generieke getallen blijft; optioneel naar 1e6.

#### F06 · Major · Opgelost · Schets — Modify accepteert 0
- Was 0.3.4: Opgelost
- Bewijs: regressie: modify-scripts groen · hertest 0.4.8: geen regressie
- Repro: node e2e/run-regression.mjs
- Fix: Geen.

#### F07 · Major · Opgelost · Features — Extrude-diepte niet gevalideerd
- Was 0.3.4: Opgelost
- Bewijs: regressie features 64/64 groen; diepte >1e6 geweigerd in het veld · hertest 0.4.8: geen regressie
- Repro: zz34-ui
- Fix: Geen (zie F80 voor diepte uit bestand).

#### F08 · Major · Opgelost · Features — Extrude op lege schets
- Was 0.3.4: Opgelost
- Bewijs: regressie groen · hertest 0.4.8: geen regressie
- Repro: run-regression
- Fix: Geen.

#### F09 · Major · Opgelost · Features — Full Round fillet
- Was 0.3.4: Opgelost
- Bewijs: filletopts 16/16 groen (291 s, dicht bij timeout 400 s) · hertest 0.4.8: geen regressie
- Repro: run-regression filletopts
- Fix: Script versnellen of opsplitsen zodat het niet flaky wordt.

#### F11 · Major · Opgelost · Assembly — Insert Component
- Was 0.3.4: Opgelost
- Bewijs: regressie insert-scripts groen · hertest 0.4.8: geen regressie
- Repro: run-regression
- Fix: Geen.

#### F12 · Major · Opgelost · Tekening — Standard 3 View
- Was 0.3.4: Opgelost
- Bewijs: regressie groen · hertest 0.4.8: geen regressie
- Repro: run-regression
- Fix: Geen.

#### F13 · Major · Opgelost · Visueel — Welkomstscherm
- Was 0.3.4: Opgelost
- Bewijs: Welkomstscherm met disclaimer (dialogs.tsx:87), shot app-01 · hertest 0.4.8: geen regressie
- Repro: App starten
- Fix: Geen.

#### F14 · Major · Opgelost · Visueel — Commando's actief zonder body
- Was 0.3.4: Deels opgelost
- Bewijs: Ribbon.tsx:307 Linear Pattern disabled={noBody||inSk}; shot app-03 + ui48
- Repro: New Part → Features
- Fix: Geen.

#### F15 · Major · Opgelost · Visueel — Watermerk
- Was 0.3.4: Opgelost
- Bewijs: fixes1 groen (geen watermerk) · hertest 0.4.8: geen regressie
- Repro: run-regression fixes1
- Fix: Geen.

#### F17 · Minor · Opgelost · Visueel — Isometrisch in plaats van Trimetric
- Was 0.3.4: Opgelost
- Bewijs: Trimetric standaard · hertest 0.4.8: geen regressie
- Repro: Start
- Fix: Geen.

#### F18 · Minor · Opgelost · Visueel — Vlak kiezen
- Was 0.3.4: Opgelost
- Bewijs: Vlaklabels in hoek zonder overlap (app-03, c03) · hertest 0.4.8: geen regressie
- Repro: New Part
- Fix: Geen.

#### F19 · Minor · Opgelost · Visueel — XYZ in statusbalk
- Was 0.3.4: Open
- Bewijs: StatusBar.tsx:116-122 data-testid=status-xyz bij cursor in schets/tekening
- Repro: Schetsen + muis bewegen
- Fix: Geen.

#### F20 · Minor · Opgelost · Visueel — Confirmation Corner
- Was 0.3.4: Open
- Bewijs: Hud.tsx Confirmation Corner .k-confirm; shot app-05; prefs general.confirmationCorner
- Repro: Schets bewerken
- Fix: Geen.

#### F23 · Minor · Opgelost · Visueel — Placeholder-iconen in de Extrude-PM
- Was 0.3.4: Opgelost
- Bewijs: Extrude-PM iconen ok · hertest 0.4.8: geen regressie
- Repro: Extrude
- Fix: Geen.

#### F25 · Minor · Opgelost · Visueel — Sterretje bij niet-opgeslagen
- Was 0.3.4: Opgelost
- Bewijs: * in titel bij wijziging · hertest 0.4.8: geen regressie
- Repro: Wijzig iets
- Fix: Geen.

#### F26 · Minor · Opgelost · UX — Nederlandse foutmelding / lang=nl
- Was 0.3.4: Opgelost
- Bewijs: UI Engels by design; About/disclaimer ok
- Repro: —
- Fix: Geen.

#### F27 · Minor · Opgelost · UX — Klein venster
- Was 0.3.4: Opgelost
- Bewijs: Ribbon klapt in (ongewijzigd t.o.v. 0.3.4 groen)
- Repro: Venster verkleinen
- Fix: Geen.

#### F29 · Minor · Opgelost · UX — Standaard bij verwijderen van kinderen
- Was 0.3.4: Opgelost
- Bewijs: confirmdelete groen · hertest 0.4.8: geen regressie
- Repro: run-regression
- Fix: Geen.

#### F30 · Minor · Opgelost · UX — Geen welkom na reload
- Was 0.3.4: Opgelost
- Bewijs: Geen welkom na reload · hertest 0.4.8: geen regressie
- Repro: Reload
- Fix: Geen.

#### F32 · Major · Opgelost · Tests — Niet-hermetische tests
- Was 0.3.4: Opgelost
- Bewijs: Regressie draait op Linux/Chromium zonder msedge; keys, dimpm, confirmdelete groen; fixture in e2e/fixtures · hertest 0.4.8: geen regressie
- Repro: run-regression op Linux
- Fix: filletopts (291 s) inkorten.

#### F34 · Major · Opgelost · Performance — Bundelgrootte
- Was 0.3.4: Deels opgelost
- Bewijs: Geverifieerd 81f9c95: dist/assets/index-*.js 862 016 B (gzip ~230); was 2 159 201. Webi: Opgelost — bevestigd in code.
- Repro: npm run build:e2e
- Fix: Geen.


#### F35 · Minor · Opgelost · Kwaliteit — BVH-optie
- Was 0.3.4: Opgelost
- Bewijs: vitest 337/337, 0 BVH-meldingen · hertest 0.4.8: geen regressie
- Repro: npx vitest run
- Fix: Geen.

#### F36 · Major · Opgelost · Kwaliteit — Monolithische store
- Was 0.3.4: Open
- Bewijs: Geverifieerd 81f9c95: slices/* (9), store.ts 1349 regels, useShallow 185×, kale useStore() 2. PropertyPanel.tsx nog 3932 (restant → F103). Webi: Opgelost — bevestigd.
- Repro: wc -l
- Fix: PropertyPanel verder splitsen optioneel.


#### F37 · Minor · Opgelost · Beveiliging — Dev-dependencies
- Was 0.3.4: Opgelost
- Bewijs: npm audit: 0 kwetsbaarheden · hertest 0.4.8: geen regressie
- Repro: npm audit
- Fix: Geen.

#### F39 · Major · Opgelost · Bestanden — Rebuild wist undo
- Was 0.3.4: Opgelost
- Bewijs: Claim + editcomponent groen (niet zelf handmatig nagespeeld) · hertest 0.4.8: geen regressie
- Repro: run-regression
- Fix: Geen.

#### F40 · Kritiek · Opgelost · Bestanden — Half-geldige .kcad; Ctrl+S overschrijft
- Was 0.3.4: Deels opgelost
- Bewijs: MenuBar.tsx:36-41 Save vraagt bij rebuild-fouten; .bak/.bak2
- Repro: Ctrl+S met fouten
- Fix: Geen.

#### F41 · Kritiek · Opgelost · Bestanden — Geen opslagvraag / autosave
- Was 0.3.4: Deels opgelost
- Bewijs: via F74: withUnsavedCheck + editContext; qa4 groen
- Repro: Ctrl+N tijdens edit
- Fix: Geen.

#### F42 · Major · Opgelost · Invoer — Numeriek / eenheden
- Was 0.3.4: Opgelost
- Bewijs: NumberField + meldingen (F81); komma=decimaal by design
- Repro: zz/ui
- Fix: Geen.

#### F43 · Major · Opgelost · Beveiliging — Decal-URL
- Was 0.3.4: Opgelost
- Bewijs: CSP blokkeert remote/file-afbeeldingen · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: Geen.

#### F44 · Major · Opgelost · Performance — Patroon- en bestandslimieten
- Was 0.3.4: Opgelost
- Bewijs: MAX_PATTERN_INSTANCES = 250 (pattern.ts:52,59); 300 → 250 in 1,45 s, geen bevriezing (stille afkapping: F81) · hertest 0.4.8: geen regressie
- Repro: Linear Pattern aantal 300
- Fix: Zie F81.

#### F45 · Major · Opgelost · Electron — Koppeling .kcad
- Was 0.3.4: Opgelost
- Bewijs: Koppeling .kcad in installer · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: Geen.

#### F49 · Major · Opgelost · Electron — Release-hardening
- Was 0.3.4: Deels opgelost
- Bewijs: Ian: geen code signing; F49 gesloten in docs/14; SmartScreen-gedrag gedocumenteerd
- Repro: Installer
- Fix: Geen (bewust).

#### F52 · Minor · Opgelost · UX — Enter herhalen / muisgebaren
- Was 0.3.4: Opgelost
- Bewijs: qa2 17/17 en keys groen op Linux · hertest 0.4.8: geen regressie
- Repro: run-regression
- Fix: Geen.

#### F53 · Kritiek · Opgelost · Desktop — Regressie in desktop: functies kapot zonder testhooks
- Was 0.3.4: Opgelost
- Bewijs: Desktop-simulatie zonder hooks: Zoom to Fit via F en menu werkt, Final Render levert beeld (d34-*). Niet getest in packaged Electron Teamnoot (Riki/Risk): opgelost in code, maar niet geborgd in CI: geen run met hooks uit of tegen de packaged build (zz34-desktop is untracked). · hertest 0.4.8: geen regressie
- Repro: zz34-desktop.mjs
- Fix: In desktop-installed.mjs dezelfde checks in de echte binary.

#### F55 · Major · Opgelost · Bestanden — Beschadigde assembly of drawing crasht de UI
- Was 0.3.4: Opgelost
- Bewijs: Beschadigde assembly/drawing/mate geweigerd met melding ('Component 1 is damaged', 'Sheet 1 is damaged', 'Mate 1 is damaged'); geen crash, geen page errors · hertest 0.4.8: geen regressie
- Repro: zz34-damaged2.mjs
- Fix: Melding ook als dialoog tonen (nu alleen statusbalk).

#### F56 · Kritiek · Opgelost · Juridisch — SimulationXpress geeft spanning en veiligheidsfactor uit een schatting
- Was 0.3.4: Deels opgelost
- Bewijs: evaluateDialogs2: Indicative ratio yield/stress (not a safety factor); disclaimer; geen groene FOS-kleur op ratio
- Repro: Quick Beam Estimate
- Fix: Geen.

#### F57 · Major · Opgelost · Tests — Testscripts verouderd en lek
- Was 0.3.4: Deels opgelost
- Bewijs: e2e/lib/check.mjs; smoke/relations process.exitCode; leak in regressie
- Repro: rg process.exitCode e2e/smoke.mjs
- Fix: Geen.

#### F58 · Kritiek · Opgelost · Proces — Feature-burst tegen het advies van feature freeze in
- Was 0.3.4: Opgelost
- Bewijs: src 55.282 regels (+610), geen nieuwe CAD-functies · hertest 0.4.8: geen regressie
- Repro: git diff --stat
- Fix: Geen.

#### F59 · Minor · Opgelost · Proces — tsbuildinfo in git
- Was 0.3.4: Opgelost
- Bewijs: tsbuildinfo uit git · hertest 0.4.8: geen regressie
- Repro: git ls-files
- Fix: Geen.

#### F60 · Kritiek · Opgelost · Assembly — Assembly-cut laat niets over van de body
- Was 0.3.4: Opgelost
- Bewijs: asmcut 3/3 · hertest 0.4.8: geen regressie
- Repro: run-regression asmcut
- Fix: Geen.

#### F61 · Minor · Opgelost · Kwaliteit — Verouderde zoom-fit-hook in tekening
- Was 0.3.4: Opgelost
- Bewijs: qa3 groen (zoom to sheet) · hertest 0.4.8: geen regressie
- Repro: qa3
- Fix: Geen.

#### F62 · Major · Opgelost · Beveiliging — Stored XSS in de Phlippo Viewer-export
- Was 0.3.4: Opgelost
- Bewijs: XSS-naam ontsnapt in viewer-titel, geen PWNED, CSP default-src none · hertest 0.4.8: geen regressie
- Repro: zz34-ui
- Fix: Geen.

#### F63 · Minor · Opgelost · Visueel — Sheet Metal-tab niet contextgevoelig, met generieke iconen
- Was 0.3.4: Opgelost
- Bewijs: Op solid: Edge Flange, Hem, Jog, Unfold e.a. grijs; Base Flange/Insert Bends/Convert actief (u34-f63) · hertest 0.4.8: geen regressie
- Repro: Part met extrude → Sheet Metal-tab
- Fix: Geen.

#### F64 · Minor · Opgelost · Visueel — DimXpertManager: tekst afgekapt en verwarrend
- Was 0.3.4: Opgelost
- Bewijs: DimXpert-tekst loopt om, 'No tolerance scheme yet…' (app-21) · hertest 0.4.8: geen regressie
- Repro: Tolerance Tree
- Fix: Geen.

#### F65 · Minor · Opgelost · Electron — Packaged app luistert naar dev- en E2E-env-vars
- Was 0.3.4: Opgelost
- Bewijs: main.cjs:18-21 PACKAGED-gates (code) · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: In packaged app testen.

#### F66 · Minor · Opgelost · Visueel — Vlaklabels overlappen in Trimetric
- Was 0.3.4: Opgelost
- Bewijs: Geen overlap van vlaklabels · hertest 0.4.8: geen regressie
- Repro: New Part
- Fix: Geen.

#### F67 · Minor · Opgelost · Electron — DevTools bereikbaar via het standaardmenu
- Was 0.3.4: Opgelost
- Bewijs: devTools !PACKAGED (main.cjs:147,180), menu null · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: Geen.

#### F68 · Minor · Opgelost · Electron — file:open geeft het absolute pad aan de renderer
- Was 0.3.4: Opgelost
- Bewijs: Handles i.p.v. paden (code) · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: Geen.

#### F69 · Minor · Opgelost · Electron — openExternal accepteert elke https-URL
- Was 0.3.4: Opgelost
- Bewijs: Allowlist openExternal (code) · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: Geen.

#### F70 · Major · Opgelost · Bestanden — Schemavalidatie oppervlakkig
- Was 0.3.4: Deels opgelost
- Bewijs: via F80
- Repro: —
- Fix: Geen.

#### F71 · Major · Opgelost · Invoer — Geen bovengrens op numerieke invoer
- Was 0.3.4: Opgelost
- Bewijs: 1e300 en 1e7 geweigerd (MAX_FIELD_VALUE = 1e6, components.tsx:287); 999999 geaccepteerd; geen melding bij weigeren (F81) · hertest 0.4.8: geen regressie
- Repro: zz34-ui
- Fix: Zie F81.

#### F72 · Major · Opgelost · Juridisch — Disclaimer onvolledig en deels onjuist
- Was 0.3.4: Opgelost
- Bewijs: About 'Phlippo CAD 0.3.4' + volledige disclaimer (u34-about), Welcome, Viewer-footer, LICENSE.txt in installer · hertest 0.4.8: geen regressie
- Repro: Help → About
- Fix: Geen.

#### F73 · Minor · Opgelost · Juridisch — Geen LICENSE/EULA en third-party notices
- Was 0.3.4: Opgelost
- Bewijs: LICENSE.txt en THIRD-PARTY-NOTICES.txt · hertest 0.4.8: geen regressie
- Repro: dist/installer config
- Fix: Geen.

#### F74 · Kritiek · Opgelost · Assembly — Edit Component-context blijft staan na Open/New
- Was 0.3.4: Open
- Bewijs: MenuBar.tsx:72-97 withUnsavedCheck op editContext; qa4 14/14 groen; store setDirty bij editContext
- Repro: Edit Component → Ctrl+N
- Fix: Geen.

#### F75 · Major · Opgelost · Bestanden — Modelwijzigingen buiten undo
- Was 0.3.4: Opgelost
- Bewijs: Undo werkt voor renameDocument, renameFeature, setMaterial, setUnits (zz34-ui); setTableCell met history.push (store.ts:3444) · hertest 0.4.8: geen regressie
- Repro: zz34-ui
- Fix: Geen.

#### F76 · Minor · Opgelost · Assembly — Interferentie: mislukte boolean telt als 'geen interferentie'
- Was 0.3.4: Opgelost
- Bewijs: interference.ts catch markeert paar als mislukt; assemblyDialogs.tsx:106 'Not checked' · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: Geen.

#### F77 · Minor · Opgelost · UI-tekst — Kapotte hernoemteksten
- Was 0.3.4: Nieuw
- Bewijs: rg Tree Tree / a Auto: 0 hits; uiText.test
- Repro: Menu View
- Fix: Geen.

#### F78 · Major · Opgelost · UI — Rebuild-fouten onzichtbaar: '!'-markering buiten beeld, geen What's Wrong
- Was 0.3.4: Nieuw
- Bewijs: WhatsWrong.tsx; status flex:none; openDocument zet whatsWrong; tree-error klikbaar
- Repro: Open bestand met fout
- Fix: Geen.

#### F79 · Minor · Opgelost · Rendering — Final Render bakt hover/selectie-highlight in
- Was 0.3.4: Nieuw
- Bewijs: Viewport.tsx:667-670 selectie/hover gewist vóór Final Render
- Repro: Final Render met selectie
- Fix: Geen.

#### F80 · Major · Opgelost · Bestanden — Validatie mist verwijzingen en onbekende feature-types
- Was 0.3.4: Nieuw
- Bewijs: persistence.ts entity-refs, FEATURE_TYPES, length-grenzen; qa4 groen. Rest: MAX_FILE_NUMBER 1e12 voor niet-lengtevelden
- Repro: badEntity/unknownFeature
- Fix: Generieke MAX naar 1e6.

#### F81 · Minor · Opgelost · Invoer — Stille afkapping en weigering zonder melding
- Was 0.3.4: Nieuw
- Bewijs: NumberField showNote bij weigeren; pattern-limit melding PropertyPanel; qa
- Repro: Patroon 300; diepte 1e7
- Fix: Geen.

#### F82 · Kritiek · Opgelost · Proces — 0.3.4 niet gecommit; HEAD heeft nog versie 0.3.3
- Was 0.3.4: Nieuw
- Bewijs: Tags v0.3.4…v0.4.8; HEAD 81f9c95 = v0.4.8-2-g81f9c95; desktop:build checkt schone tree; WT schoon op laptop
- Repro: git describe
- Fix: Geen.

#### F83 · Minor · Opgelost · Code — Dubbele testhook-conditie in bodyScene.ts
- Was 0.3.4: Nieuw
- Bewijs: bodyScene.ts importeert TEST_HOOKS
- Repro: sed bodyScene
- Fix: Geen.

#### F84 · Major · Opgelost · Tests — Regressie overschrijft de voorbeeld-.kcad's in git
- Was 0.3.4: Nieuw
- Bewijs: doorhandle.mjs → os.tmpdir() tenzij UPDATE_EXAMPLES=1
- Repro: run-regression; git status voorbeelden
- Fix: Geen.

#### F85 · Major · Opgelost · Electron — Packaged app accepteert --remote-debugging-port
- Was 0.3.4: Nieuw
- Bewijs: main.cjs: PACKAGED weigert --remote-debugging-port/--inspect
- Repro: code
- Fix: Geen.

#### F86 · Minor · Opgelost · Tests — Geen lektest in de repo en geen CI-timeout
- Was 0.3.4: Nieuw
- Bewijs: e2e/leak.mjs in SCRIPTS; ci.yml timeout-minutes: 90
- Repro: run-regression leak
- Fix: Geen.

#### F87 · Minor · Opgelost · Beveiliging — Geen permission request/check handlers
- Was 0.3.4: Nieuw
- Bewijs: main.cjs:360-361 deny-by-default permission handlers
- Repro: code
- Fix: Geen.

#### F88 · Minor · Opgelost · Beveiliging — Nog file://, geen app:// en geen grantFileProtocolExtraPrivileges-fuse
- Was 0.3.4: Nieuw
- Bewijs: app://phlippo protocol.handle; grantFileProtocolExtraPrivileges:false
- Repro: code
- Fix: Geen.

#### F89 · Minor · Opgelost · Beveiliging — TEST_HOOKS aan in elke niet-desktopbuild
- Was 0.3.4: Nieuw
- Bewijs: TEST_HOOKS = DEV || VITE_TEST_HOOKS===1 || desktop.testHooks; productiebuild zonder vlag
- Repro: testHooks.ts:13
- Fix: Geen.

#### F90 · Major · Opgelost · Features — Tolerance Stack-up telt alle maten op i.p.v. één maatketen
- Was 0.3.4: Nieuw
- Bewijs: Ribbon: Tolerance Sum (all dimensions) met expliciete disclaimer
- Repro: MBD → Tolerance Sum
- Fix: Geen.

#### F91 · Minor · Opgelost · Juridisch — THIRD-PARTY-NOTICES mist Chromium/Electron-licenties
- Was 0.3.4: Nieuw
- Bewijs: THIRD-PARTY-NOTICES verwijst naar LICENSES.chromium.html
- Repro: notices
- Fix: Installer-inhoud steekproef op Windows.

#### F92 · Major · Opgelost · Juridisch — ~250 'as the original'-commentaren en 'reference frame f_0341'
- Was 0.3.4: Nieuw
- Bewijs: rg 'as the original' src → 0 hits
- Repro: rg
- Fix: Geen.

## 8. IP-risico

- Eigen gebruik: laag–middel.
- Publieke release: middel — Pack and Go / MBD Dimensions / Weldments nog zichtbaar (F50/F94); “as the original” weg (F92).
- Commercieel: juridisch laten toetsen.

## 9. Niet getest / bestanden

- Packaged Electron + NSIS-installer op Windows: niet hertest (F97 Kritiek — team).
- msedge / echte code-signing flow: n.v.t. (F49 gesloten).
- Rapport: `/workspace/phlippo-cad/report-0.4.8/QA-rapport-0.4.8.md`
- Data: `findings.json` · logs/ · shots/
- Laptop-kopie (enige write): `C:\Users\ianph\OneDrive\Bureaublad\Phlippo CAD\Claude\qa-rapporten\QA-rapport-0.4.8.md`

## 10. Teamoordeel

**Stand: 5 van 5 reviewers binnen. Unaniem NO-GO voor release; GO voor eigen gebruik met backups.** Scores: Strati 7, Webi 7, Riki 7, Risk 7,5, MT5 Developer 7 → strengste **7/10**.

Voorwaarden eigen gebruik (Risk + team):
1. Werkbestanden onder eigen versiebeheer of back-up; twee .bak-generaties zijn geen archief.
2. Quick Beam Estimate en Tolerance Sum niet gebruiken als ontwerpcontrole.
3. **Branch naar origin pushen** — de B-rep-migratie staat nu alleen op de laptop (F98).
4. Tekening op Linux niet vertrouwen tot F10 dicht is (of alleen op Windows valideren); zware mesh-features kunnen de UI ~45 s vastzetten.

### Strati — Strategie en product

**Oordeel:** 7/10, NO-GO voor release; eigen gebruik door Ian: GO met versie-backups. Akkoord met de Lead.

Kernpunten:
- Beste ronde tot nu toe: B-rep via OpenCascade/replicad in worker + STEP (F51 deels); store gesplitst; bundel −60%; Quick Beam zonder groene FoS; Hole Wizard/Lifecycle hernoemd.
- Ernst omhoog: F93 Major→Kritiek (derde ronde valse groen-claims); F94 Minor→Major; F95 Minor→Major (Node eerst gelijktrekken).
- Nieuw: packaged app://+WASM niet getest (N1→F97 Kritiek); 42 commits niet gepusht (N2→F98); geen exact/mesh-indicator (N3→F99).

Top 3:
1. CI-waarheid: Node gelijk (F95), drawing groen of eerlijke skip (F10/F54), docs/commits corrigeren (F93/F38). Regel: geen "groen" zonder CI-link.
2. Packaged-app-smoketest op Windows (F97); daarna push naar origin (F98).
3. Merk + kern: Pack and Go / MBD / Weldments (F94/F50); B-rep-dekking meten + exact/benadering tonen (F99).

### Webi — Frontend, Electron en beveiliging

**Oordeel:** 7/10 NO-GO. Electron-lockdown en frontend-architectuur sprongen hard; blokkers zijn CI-eerlijkheid, untested packaged binary onder app://+WASM, en mesh-CSG op de UI-thread.

Kernpunten:
- Geverifieerd Opgelost in code: F02/F03/F53/F62/F65/F67–F69/F83/F85/F87–F89; app:// + fuse false; deny-default permissions; TEST_HOOKS gated.
- Perf: store slices, useShallow 185×, bare useStore() 2, bundel 862 kB — F34/F36 Opgelost (geverifieerd). Restant: PropertyPanel 3932 (F103), mesh-CSG sync (F46), blank.html-flits (F104).
- F93→Kritiek; F95 evidence stale → retitle Node CI 22 vs QA 20; packaged smoke Major→meegenomen als F97 Kritiek (strengste).

Top 3:
1. CI-waarheid: drawing fix/skip (F10/F54); 86/86-claims (F93/F38); Node pin.
2. Packaged Windows smoke zonder hooks onder app://+WASM (F97).
3. Mesh-CSG naar worker; rebuild-budget ~5 s (F46); optioneel PropertyPanel-split (F103).

### Riki — Test- en CI-eerlijkheid

**Oordeel:** 7/10. NO-GO voor release. Akkoord met QA. Eigen gebruik: GO met versie-backups; tekening-Ø op Linux/CI faalt.

Kernpunten:
- Testinfra sinds 0.3.4 eerlijk: check.mjs, 86 scripts, CI timeout + git diff, doorhandle → tmp, lektest, debug-poorten geweigerd.
- Blokker: drawing 22/24 → 85/86 terwijl docs/commits 86/86 claimen (F93↑Kritiek). F31 blijft Kritiek (strengste; Riki’s Major-voorstel niet overgenomen).
- Nieuw: desktop-nohooks niet in CI (R01→F100); geen remote CI-bewijs (R02→F98); clickall zonder exit (R03→F101); reload-check gekoppeld aan Ø35 (R04→F102).

Top 3:
1. F10/F54/F93 — drawing groen of eerlijke skip; stop 86/86-claims.
2. Echte CI + hooks-off (F98/F100): pushen; desktop-nohooks in workflow.
3. Restant-hygiëne: clickall exitCode (F101); merknamen F50/F94 voor GO #10.

### Risk — Risico en optimalisatie (GO-lijst, IP)

**Oordeel:** 7,5/10. Release NO-GO; persoonlijk gebruik GO met kortere voorwaarden. Akkoord met lead-telling GO 8/1/1.

Kernpunten:
- GO #1–#8 gehaald; #9 niet (drawing + claims); #10 deels (Pack and Go / Weldments / MBD).
- F93→Kritiek; F94→Major; F31/F51 blijven Kritiek; F50 blijft Kritiek (Risk stelde Major — niet overgenomen). F95: evidence stale, retitle.
- Nieuw: desktop-nohooks niet in CI (Risk-R1→F100). IP: middel-laag privé; middel publiek tot Pack and Go/MBD hernoemd.

Top 3:
1. CI-waarheid (F10/F54/F93/F31 + F100).
2. Merknamen-restant (F50/F94).
3. UI-draad (F46): budget ~5 s + voortgang.

### MT5 Developer — Code quality, testing/CI, geometry kernel

**Oordeel:** 7/10. NO-GO for release. Agree with QA draft. Own use: GO with version backups.

Kernpunten:
- F93→Kritiek; F51/F46/F47/F48 blijven; F95 evidence stale (retitle, Strati’s Major wint).
- Nieuw: B-rep zelden in regressie (MT5D-01→F105); geen exact/mesh-indicator (MT5D-02→F99); occt-timeout ontbreekt (MT5D-03→F106); solver-worker dood (MT5D-04→F107); PropertyPanel monolith (MT5D-05→F103); packaged WASM (MT5D-06→F97).

Top 3:
1. CI truth (F93 + F10/F54/F31).
2. Geometry kernel honesty (F51 + F105/F99/F106).
3. UI-thread rebuild (F46 + F107).

### Ernstwijzigingen: wie stelde wat voor

Regel: de strengste voorgestelde ernst wint. Een verlaging door één reviewer telt niet als de huidige of een andere voorgestelde ernst hoger is.

| ID | Ernst QA | Voorstellen team | Definitief | Toelichting |
|---|---|---|---|---|
| F93 | Major | Alle 5: Kritiek | Kritiek | Derde ronde valse "groen"-claims |
| F94 | Minor | Strati, Risk: Major | Major | Restant F50; bepaalt GO #10 |
| F95 | Minor | Strati: Major; Webi/MT5D/Risk: retitle (stale engines) | Major | Strengste (Strati); titel/bewijs gecorrigeerd |
| F31 | Kritiek | Riki: Major | Kritiek (blijft) | Verlaging telt niet |
| F50 | Kritiek | Risk: Major | Kritiek (blijft) | Verlaging telt niet tot Pack and Go weg is |
| F51 | Kritiek | MT5D/Strati: Kritiek (blijft) | Kritiek (blijft) | B-rep deels; dekking ongemeten |
| F34 | Opgelost | Webi: Opgelost | Opgelost | Geverifieerd: bundel 862 kB |
| F36 | Opgelost | Webi: Opgelost | Opgelost | Geverifieerd: slices + useShallow; restant → F103 |

---

*Grok Bot · QA v0.4.8 + teamreview (5/5) · 27-10-2026 (Brussel, UTC+1) · strengste ernst wint · geen secrets in dit rapport.*
