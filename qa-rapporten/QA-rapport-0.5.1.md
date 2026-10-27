# Phlippo CAD — QA-rapport v0.5.1 (eindcontrole, strenge SOLIDWORKS-lat)

Eindcontrole door Grok Bot op **27-10-2026**, ca. 20:40–22:00 (Brussel, UTC+1); **teamoordelen geïntegreerd om ca. 21:35–22:30** (Strati, Webi, Riki, MT5 Developer, Risk & Optimization). Getest op een read-only kloon van `origin` (github.com/IanPhlippo-jpg/Claude) op de box; op de laptop alleen gelezen en logbestanden gekopieerd. Lat: *ziet het eruit én werkt het als SOLIDWORKS?* Elke claim hieronder is onderbouwd met code (bestand:regel), testoutput (logs/) of een screenshot (shots/). **De strengste ernst wint.**

## 0. Versie en commit

- HEAD **`46fc2f3`** (`git describe` → `v0.5.1-2-g46fc2f3`), `package.json` **0.5.1**. Branch gepusht naar origin.
- Sinds 0.4.8 (`81f9c95`): 8 commits — `358b3ba` 0.4.9, `17ed1c2`, `b1e1e2c` 0.5.0, `037d8bf`, `a31280f`, `cbfc362` 0.5.1, `333dc2b`, `46fc2f3`.
- Diff: 204 bestanden; `src/` 112 bestanden, **+7608 / −4321** regels; src totaal ≈ 63,3k regels.
- Geïnstalleerde app op de laptop: `C:\Users\ianph\AppData\Local\Programs\Phlippo CAD` (0.5.1, geïnstalleerd 27-10 20:36), **niet code-signed** (Authenticode NotSigned).

## 1. Oordeel

**Eindscore: 5/10** (strengste teamscore; QA alleen gaf 6/10). **NO-GO voor "helemaal klaar / echt SolidWorks" en NO-GO voor publiceren of delen.** Alleen **voorwaardelijk GO voor eigen gebruik** (§9.2). Alle vijf teamleden zeggen NO-GO; de strengste ernst per bevinding is toegepast.

Eerlijk beeld: de *look* is zeer dicht bij SolidWorks (CommandManager, FeatureManager-boom, heads-up toolbar, taakvenster, PropertyManager, statusbalk — zie shots/). De procesbeloften van 0.4.8 zijn grotendeels ingelost: Windows packaged self-test 8/8 onder `app://` + OCCT-WASM, branch gepusht, rebuild-worker, Faceted-indicator, OCCT-timeout. **Maar** zodra je strenger test op wat SolidWorks *inhoudelijk* doet, komen echte gaten boven:

- **Assembly-mates** lossen niet simultaan op en zijn richtingsafhankelijk (F109), en conflicterende mates geven geen fout of (+)/(-)-status (F108).
- **Topologische naamgeving** breekt bij gesplitste randen (stil maar één helft afgerond, F111) en revolve-fillets na een maatwijziging (F110).
- **Options-dialoog** is grotendeels façade: 342 van 375 instellingen doen niets, inclusief AutoRecover/back-up (F112).
- Geen **feature-reorder** (F113), geen **IGES/DXF/DWG/PDF**-export (F114), geen design tables, ontbrekende features (Dome, Indent, Mounting Boss, Snap Hook, Lip/Groove — F121). Smart Fasteners en Instant3D bestaan slechts **deels** (als Auto Fasteners en Drag Handles).
- **Linux/CI**: drawing en rebuildworker rood op Linux (91/93; F10/F54/F125) ondanks commit-claim van een Linux-fix (F93); Electron zonder GPU faalt (F115); de CI is **rood by design** (desktop-nohooks en self-test zonder SwiftShader vóór de regressie, F128); het Windows-log is geplakt (F126).
- **Gelijkenis als risico**: letterlijke statusbalk-prompts uit de video's (F135), "3D ContentCentral" zichtbaar (F131), SW-Density (F116), en de merkencheck vangt dit niet (F132).

- SolidWorks-pariteit (strenge matrix na teamcorrecties, §3): **58.9%** (was 62.1% vóór de teamcorrecties) (26 aanwezig, 21 deels, 10 ontbreekt, 5 kapot van 62 punten; aanwezig=1, deels=½, ontbreekt/kapot=0).
- Bevindingen totaal: **137** (F01–F137). Status: 86 opgelost, 17 deels, 1 open, 30 nieuw (F108–F125 QA, F126–F137 team), 3 niet geverifieerd.
- Nog niet opgelost: **51** — 9 kritiek (F31, F50, F51, F93, F108, F109, F111, F112, F115), 31 major, 11 minor.

**Top 5 (na teamintegratie):**

1. **F109 Kritiek P0** — mate-solver stil fout en richtingsafhankelijk (M1: B op y=100 i.p.v. 25, assembly.ts:409-410).
2. **F111 Kritiek P0** — gesplitste fillet-rand: maar één helft afgerond, zonder melding (T3: 30469,53 i.p.v. 30439,91).
3. **F108 Kritiek P0** — conflicterende mates stil "opgelost" (M2: y=30), geen (+)/(-), geen niet-convergentiesignaal.
4. **F128 + F115 Kritiek/Major P0** — CI rood by design (geen SwiftShader vóór de regressie) en zonder WebGL alleen een generieke foutdialoog (Viewport.tsx:129).
5. **F112 Kritiek P0** — Options 342/375 inert; AutoRecover staat aan maar schrijft niets.

## 2. Claims van de ontwikkelagent gecontroleerd

| Claim | Gecontroleerd | Resultaat |
|---|---|---|
| Unit-tests 416 groen | vitest op de box (Node 22.23.4) | **Waar** — 416/416 in 111 files |
| Regressie 93/93 groen | Windows-log `logs/windows-regression-0.5.1.txt` + eigen Linux-run | **Waar op Windows**; Linux: 91/93 — rood: drawing (Ø35 niet geplaatst, 24/25) en rebuildworker (frame-gap 933 ms, 9/10) |
| B-rep 11/11 | `logs/windows-brep-0.5.1.txt` + Linux B-rep-pass | **Waar op Windows** (11/11); Linux: 9/9 groen (CI-set; qa2 + facenames niet in deze set, F120). CI draait er maar 9 (F120) |
| Worker 6/6 | `logs/windows-worker-0.5.1.txt` | **Waar** (Windows) |
| Desktop 8/8 + 12/12 | self-test + desktop-nohooks op Linux-xvfb | 8/8 **alleen met SwiftShader**; zonder GPU 7/8 en TimeoutError (F115). 12/12 niet reproduceerbaar bevestigd |
| Packaged app werkt | `logs/windows-packaged-self-test.json` | **Waar** — app:// 0.5.1, 8/8 ok, Fillet exact 44742.52, STEP exact, save + .bak |
| Ø35 op Linux opgelost (commit 358b3ba) | Linux-regressie drawing | **Onwaar** — `FAIL diameter Ø35 placed {"picked":false}` (shots/e43-fail-diameter.png) |
| Windows-log is ruwe output | `logs/windows-regression-0.5.1.txt` | **Onwaar** — 94× exit= voor 93 scripts, dubbele DONE-regel r.94-96 (F126) |
| "Helemaal klaar / zoals SolidWorks" | Pariteitsmatrix + eigen adversarial tests | **Onwaar** — zie §1, §3, F108–F125 |

Noot: de Windows-logs zijn samenvattingen die de ontwikkelagent zelf schreef (geen ruwe runner-output, geen CI-artefact). Ze zijn consistent met de code, maar het blijft zelfrapportage; GitHub Actions was voor QA niet toegankelijk.

## 3. SolidWorks-pariteitsmatrix

Totaal: **58.9%**. Statussen: aanwezig · deels · ontbreekt · kapot (aanwezig in de UI maar faalt aantoonbaar).

| Gebied | Functie | Status | Bewijs |
|---|---|---|---|
| Sketcher | Lijn/rechthoek/cirkel/boog/spline/ellips/sleuf/polygoon/tekst | aanwezig | model.ts add*; e2e sketch/slot groen |
| Sketcher | Relaties (16 soorten) + glyphs, blauw/zwart-status | aanwezig | solver.ts; shots/06-relations.png; relations 14/14 |
| Sketcher | Intersection/Merge/Equal curvature/AlongXYZ | ontbreekt | F123 |
| Sketcher | Over-/conflict-detectie (redundant/conflicting/driven) | aanwezig | solver.test.ts status over/conflict |
| Sketcher | Trim/Extend/Offset/Mirror/Convert/patterns | aanwezig | e2e trim (t1-trim-fillet.png) |
| Sketcher | 3D-schets met maten/relaties | deels | docs/24: geen 3D-maten (F124) |
| Sketcher | Instant2D / Magnified Selection | ontbreekt | docs/24 |
| Features | Extrude boss/cut + alle eindcondities, draft, thin, 2 richtingen | aanwezig | endconditions, features 64/64 |
| Features | Revolve | deels | Geen eigen revolve-script (de bewering "revolve-scripts groen" was fout); revolve alleen binnen doorhandle 17/17, pmsweep 54/54, assembly2 15/15; revolve-fillet na edit fout (F110) [Riki/Risk] |
| Features | Sweep / Loft (loft B-rep alleen 2 profielen) | deels | BrepKernel loft 2 profielen |
| Features | Fillet/Chamfer (const, variabel, face, full round) | deels | filletopts groen; revolve-fillet na edit kapot (F110) |
| Features | Shell/Draft/Rib | aanwezig | shots/e16-shell.png; rib 10/10 (regression.log). Eerdere verwijzing "r1–r3" bestond niet in shots/ [Webi/Risk] |
| Features | Hole Tool (simple/cbore/csk/tap) + Advanced Hole + Thread | aanwezig | Hole Tool aanwezig |
| Features | Patterns (linear/circular/curve/sketch/fill/table/variable) + Mirror | aanwezig | Linear/circular pattern in 8 e2e-scripts (o.a. features 64/64, componentpattern, sketchpattern). Riki: "geen e2e" — door QA weerlegd |
| Features | Wrap/Deform/Flex/Freeform | deels | mesh-terugval, Faceted |
| Features | Dome/Indent/Mounting Boss/Snap Hook/Lip-Groove | ontbreekt | F121 |
| Features | Instant3D (drag-handles op model) | deels | Drag Handles bestaan (store.ts:829 dragHandles, toggleDragHandles; tipTexts.ts:29), maar geen volledige Instant3D (maten slepen op het model niet bewezen) [Webi] |
| Features | Surfaces (extrude/revolve/loft/knit/trim/thicken) | deels | mesh-terugval |
| Features | Sheet metal (base/edge flange/hem/bend/flat pattern) | deels | sheetmetal 14/14, mesh (geen virtual sharp) |
| Features | Weldments (structural member, trim) | deels | aanwezig maar naam = handelsmerk (F50) |
| Features | Multibody (combine/split/move-copy/scope) | aanwezig | multibody 14/14 (regression.log). Eerdere verwijzing "m1–m5" bestond niet in shots/ |
| FeatureManager | Boom met history/sensors/annotations/materials/planes | aanwezig | shots/e19 |
| FeatureManager | Rollback-bar | aanwezig | FeatureTreeBody.tsx:381; rollback gebruikt in e2e full 68/68 en relations 14/14 |
| FeatureManager | Suppress/unsuppress, edit feature/sketch | aanwezig | e2e features |
| FeatureManager | Reorder (slepen) | ontbreekt | F113 |
| FeatureManager | Parent/child-weergave | aanwezig | e2e/gb.mjs:57-61 opent Parent/Child… en checkt dat Sketch1 als parent staat; gb 32/32 op Linux. Risk vroeg "onbewezen"; QA vond deze test, dus aanwezig blijft |
| FeatureManager | Undo/redo (200 stappen) | deels | history.ts:5 limit=200; undo in e2e gebruikt, maar 200 stappen nergens getest [Risk] |
| Topologie | Randreferenties overleven maatwijziging (extrude) | aanwezig | edgesets.test + QA T1 |
| Topologie | Gesplitste randen / revolve / sweep / loft | kapot | QA T2/T3 (F110/F111) |
| Kernel | Exacte B-rep (OCCT) op desktop | aanwezig | Windows B-rep 11/11; self-test Fillet exact |
| Kernel | Exacte B-rep in browser / voor alle features | deels | mesh primair; Faceted n/m (F51) |
| Assembly | Insert component / patterns / configuraties per instantie | aanwezig | assembly 21/21, c6 |
| Assembly | Standaard + geavanceerde + mechanische mates (typen) | deels | Typen aanwezig in types.ts:1225 en UI, maar cam/hinge/screw/universalJoint/rackPinion/linearCoupler zonder gedragstests en solver kapot (F109) [Riki/Risk] |
| Assembly | Mate-solver (simultaan, beide kanten) | kapot | QA M1 (F109) |
| Assembly | Over-/onderbepaald (+)/(-), mate-fouten | ontbreekt | QA M2 (F108) |
| Assembly | Interference detection / exploded view | aanwezig | Evaluate-tab, e2e |
| Assembly | Smart Fasteners / Toolbox | deels | Auto Fasteners bestaan (store.ts:461-465 startSmartFasteners/commitSmartFasteners; src/core/assembly/fasteners), geen volledige Toolbox-bibliotheek [Webi] |
| Tekeningen | Standaard/projected/section/detail/aux/broken/crop | aanwezig | drawing, sec1-section-view |
| Tekeningen | Maten plaatsen (Smart Dimension op tekening) | deels | Linux: Ø35 niet gepakt (F10) |
| Tekeningen | BOM/hole table/revisietabel/balloons/GD&T | aanwezig | shots/e34-bom.png. Eerdere verwijzing "c8-bom" bestond niet in shots/ |
| Tekeningen | Auto centermarks / verborgen lijnen | ontbreekt | F122 |
| Tekeningen | PDF/DXF/DWG export | ontbreekt | F114 |
| Configuraties | ConfigurationManager, per-config waarden/suppress | aanwezig | configurations 25/25 (regression.log); shots/c6-assembly-configurations.png. Eerdere verwijzing "c1–c5" bestond niet |
| Configuraties | Design tables (Excel) | ontbreekt | rg "design table" = alleen tree-filterlabel |
| Configuraties | Equations/global variables/circulair | aanwezig | e22, QA E1 circulair gemeld |
| Evaluate | Measure / Mass Properties / Section Properties | aanwezig | e19, e20 |
| Evaluate | Draft/undercut/thickness analysis | deels | draftcheck 9/9, thickness maar 2/2 checks; geen numerieke assert op undercut/thickness [Risk] |
| Import/Export | Native .kcad (atomair + .bak) | aanwezig | self-test save+.bak |
| Import/Export | STEP AP214 in/uit (exact) | aanwezig | self-test STEP exact 1 |
| Import/Export | STL/3MF/AMF | aanwezig | MenuBar Save As |
| Import/Export | IGES / DXF / DWG / Parasolid | ontbreekt | F114 |
| UI/UX | CommandManager/tabs/heads-up toolbar/taakvenster/statusbalk | aanwezig | alle shots |
| UI/UX | Options-dialoog werkend | kapot | 342/375 inert (exacte hertelling, F112); AutoRecover aan maar niets geschreven |
| UI/UX | Iconen/lettertype pixelgelijk | deels | Niet geverifieerd: geen SOLIDWORKS-referentieshots (F16/F21/F22) |
| UI/UX | Handelsmerk-vrij | deels | Weldments, SW-Density (F50/F116) |
| Performance | Rebuild-worker / UI vloeiend | deels | desktop ja, browser mesh-CSG sync (F46) |
| Robuustheid | Autosave + crash-herstel | deels | localStorage-autosave + ErrorBoundary; AutoRecover-opties inert (F112) |
| Robuustheid | Zonder WebGL / zonder GPU | kapot | F115 |
| Installer | NSIS + portable, .kcad-associatie | deels | NSIS/portable gebouwd en geïnstalleerd; .kcad-associatie alleen config (package.json fileAssociations), niet getest op installatie; unsigned (F117) [Risk] |
| Installer | Code-signing | ontbreekt | F117 |
| Testen/CI | Unit + e2e + B-rep + worker | deels | 416/416 unit; Linux 91/93; Windows 93/93/11/11/6/6 alleen zelfrapportage met geplakt log (F126); 53 verborgen skips (F119) [Riki] |
| Testen/CI | Groene CI op Linux bewezen | kapot | drawing rood op Linux; CI niet zichtbaar (F31/F54) |

**Per gebied:** Sketcher 64% · Features 64% · FeatureManager 75% · Topologie 50% · Kernel 75% · Assembly 50% · Tekeningen 50% · Configuraties 67% · Evaluate 75% · Import/Export 75% · UI/UX 50% · Performance 50% · Robuustheid 25% · Installer 25% · Testen/CI 25%

## 4. Testresultaten (box, Linux, Node 22.23.4)

| Stap | Resultaat | Status |
|---|---|---|
| tsc --noEmit | 0 fouten | Groen |
| vitest | 416/416 in 111 files | Groen |
| CI-checks script | OK | Groen |
| npm audit | 0 kwetsbaarheden | Groen |
| build (release + e2e) | OK; index 906 kB (gzip 245), was 862 kB (F118) | Groen |
| Electron self-test (xvfb, geen GPU) | 7/8 — "Fillet1 is exact" ok=false | Rood |
| Electron self-test (SwiftShader) | 8/8 | Groen |
| desktop-nohooks (xvfb / SwiftShader) | TimeoutError / 8/8 | Rood/Groen |
| Regressie 93 scripts (Linux Chromium) | 91/93 — rood: drawing (Ø35 niet geplaatst, 24/25) en rebuildworker (frame-gap 933 ms, 9/10) | Zie tekst |
| B-rep-pass (Linux) | 9/9 groen (CI-set; qa2 + facenames niet in deze set, F120) | Zie tekst |
| Eigen adversarial tests (src/qa/qaStrict.test.ts, alleen op de box) | 6 tests: T1 ✓, T2 ✗ (F110), T3 stil-fout (F111), M1 fout (F109), M2 fout (F108), E1 ✓ | Rood |
| Windows (laptop-logs) | regressie 93/93, B-rep 11/11, worker 6/6, packaged 8/8 | Groen (zelfrapportage) |

### 4.1 Eigen tests in detail (`logs/qa-strict-tests.log`)

- T1 — plaat 80×80×10, gat Ø35, Fillet R2 op bovenrand van het gat; gat → Ø50. Volume 44193,10 < scherp 44365,05 → fillet blijft. **OK.**
- T2 — buis r10–30 h40 (revolve 360°), Fillet R3 op buitenste bovenrand OK; buitenmaat 30→36 → `Boolean operation failed: the boolean result failed the volume check (subtract: 148447.45 and 4.89 gave 148598.13 mm³)`, mét `filletApplied:true` en v = 150184,24 mm³ = **109,55 mm³ onder scherp** (150293,79), terwijl R3 op r=36 analytisch ≈429 mm³ wegneemt. **Fout lichaam + foutmelding (F110).** Correctie: eerder stond hier "fillet weg"; dat was onjuist (gemeld door Webi/Riki, door QA nagerekend). (Mesh-kernel; desktop-B-rep niet in deze test.)
- T3 — plaat 80×40×10, Fillet R2 op lange bovenrand; slot vóór de fillet ingevoegd die de rand splitst. Volume 30469,53 = precies "één helft afgerond" (beide helften: 30439,91). Geen fout, geen waarschuwing. **Stil fout (F111).**
- M1 — A vast; C coincident op A; B Distance 5 op C (B als eerste referentie). B blijft op y=100 (verwacht 25). Met omgedraaide referenties: 25. **Richtingsafhankelijk (F109).**
- M2 — twee Distance-mates 10 en 20 tussen dezelfde vlakken: B op y=30, geen fout; component-object heeft geen status. **Geen overbepaald-detectie (F108).**
- E1 — vergelijkingen a=b+1, b=a·2: "Circular reference through \"a\"". **OK.**

## 5. Verbeteringen sinds 0.4.8 (bewezen)

- Windows packaged app (NSIS) onder `app://` + OCCT-WASM smoke-getest: 8/8 (F97 dicht).
- Branch gepusht naar origin (F98 deels).
- Rebuild-worker voor zware part-rebuilds; worker-suite 6/6 (F46 deels).
- Faceted n/m-indicator in statusbalk + STEP-waarschuwing (F99 deels: geen e2e-test erop).
- OCCT KernelTimeout + herstart (F106), dode solver-worker weg (F107), clickall exit-code (F101), geen blank.html-flits (F104).
- Pack and Go → Package Files, MBD → Product Dimensions (F94 deels).
- Node 22 gepind (.nvmrc + engines, F95).
- Face names voor extrude-vlakken: fillet op gat-rand overleeft maatwijziging (T1).
- Playlist-video's 08–58 nagebouwd (docs/24): o.a. vergelijkingen in PM-velden, Edit Flange Profile, Curve Through XYZ Points.

## 6. Score per gebied (strenge SOLIDWORKS-lat)

| Gebied | 0.5.1 | 0.4.8 | Toelichting |
|---|---|---|---|
| Schetsen | 7 | 7 | Solide solver + statussen; mist Intersection/Merge/G2, 3D-maten |
| Features | 6 | 8 | Breed, maar revolve: geen eigen script en fillet na edit fout; Dome/Indent/Mounting Boss ontbreken; Instant3D/Smart Fasteners deels |
| FeatureManager | 6 | — | Rollback/suppress ok; geen reorder |
| Topologie | 4 | — | Extrude ok; gesplitste randen stil fout (Kritiek), revolve fout |
| UI / look | 7 | 7 | Zeer dicht bij SW, maar Options 342/375 façade (Kritiek) en iconen niet geverifieerd; de gelijkenis is tegelijk een merkrisico (Risk 4/10) |
| Tekening | 5 | 5 | Views/tabellen ok; geen auto-centermarks, geen PDF/DXF, Ø-pick Linux |
| Assembly | 4 | 7 | Mate-typen in de UI, maar solver stil fout en richtingsafhankelijk (Kritiek) en zonder conflictdetectie (Kritiek) |
| Bestanden | 6 | 8 | STEP exact; geen IGES/DXF/DWG/PDF |
| Performance | 6 | 6 | Worker op desktop; browser mesh-CSG sync; bundel 906 kB |
| Code / tests | 6 | 7 | 416 unit, 93 e2e; maar CI rood by design (F128), 53 verborgen skips (F119), geplakte Windows-logs (F126), ≈80 ingeslikte catches (F133) |
| Robuustheid | 6 | — | Atomaire save + .bak; autosave alleen localStorage; zonder GPU faalt |
| Installer | 6 | — | NSIS + portable ok; niet gesigned |
| **Totaal** | **5/10** | 7/10 | Strengste teamscore (Strati, Webi, MT5 Developer: 5). QA alleen: 6. Product is beter dan 0.4.8; de lat is inhoudelijk en strenger. |

## 7. GO-voorwaarden

| # | Voorwaarde | Status | Toelichting |
|---|---|---|---|
| 1 | Opslaan alleen via main | Gehaald |  |
| 2 | Schemavalidatie | Gehaald |  |
| 3 | Atomische saves | Gehaald | self-test save |
| 4 | .bak | Gehaald | self-test .bak |
| 5 | Unsaved / Edit Component | Gehaald |  |
| 6 | Invoerlimieten + melding | Gehaald |  |
| 7 | Aantal-limieten | Gehaald |  |
| 8 | CSP images | Gehaald |  |
| 9 | e2e + CI groen | **Niet** | 91/93 op Linux (drawing, rebuildworker); CI niet zichtbaar; zonder GPU rood (F10/F54/F31/F115/F125) |
| 10 | Merknamen + disclaimer | Deels | Weldments, SW-Density (F50/F116) |
| 11 | Packaged Windows smoke | Gehaald | 8/8 (F97) |
| 12 | "Lijkt echt op SolidWorks" (inhoud) | **Niet** | F108–F114, F121; pariteit 58.9% |
| 13 | Publiceren / delen (merk- en tekstrisico) | **Niet** | F50, F116, F131, F132, F135 (Risk 4/10) |

## 8. Alle bevindingen

Prioriteit: P0 directe blokker · P1 GO-blokker · P2 vóór release · P3 look/kwaliteit · P4 opgelost. "Was" = status in 0.4.8.

### P0 (9)

#### F31 · Kritiek · Deels opgelost · Proces — e2e-exitcodes / CI / niet-gecommit werk

- Was: Deels opgelost
- Bewijs: 0.5.1: Branch gepusht naar origin (IanPhlippo-jpg/Claude, HEAD 46fc2f3), maar GitHub Actions niet toegankelijk vanaf QA (scm_repo_not_accessible) → geen bewijs van groene CI. Linux-drawing rood ⇒ CI (ubuntu) vrijwel zeker rood. || 0.4.8: Versie gecommit/getagd; e2e/lib/check.mjs; CI timeout; drawing nog rood → CI zou rood zijn Teamnoot: Riki stelde Major voor; strengste wint → Kritiek blijft (drawing houdt GO #9 dicht).
- Repro: run-regression Linux
- Fix: F10 oplossen.

#### F54 · Major · Open · Proces — CI rood op Linux; 'regressie groen' niet reproduceerbaar

- Was: Open
- Bewijs: 0.5.1 Linux-regressie: DONE 91/93 — failed: drawing rebuildworker. 0.5.1: Linux-regressie: drawing blijft rood (zie F10). CI-config draait ubuntu-latest ⇒ rood. || 0.4.8: Alleen drawing faalt: DONE 85/86 failed: drawing — CI op Linux zou rood zijn
- Repro: run-regression
- Fix: Zie F10.

#### F108 · Kritiek · Nieuw · Assembly — Mates: geen over-/onderbepaald-detectie; conflicterende mates stil opgelost

- Was: —
- Bewijs: Team 27-10: Strati: ↑Kritiek. Riki R06 hier samengevoegd: geen niet-convergentiesignaal — solveMates stopt na 8 passes zonder fout of status (assembly.ts:400-419); Component-type heeft geen status-veld (types.ts:1159-1171). || QA-test M2: twee Distance-mates 10 en 20 tussen dezelfde vlakken → B op y=30, geen fout/flag (Component heeft geen status-veld). AssemblyTreeBody.tsx:50 toont altijd "(-)" voor niet-vaste componenten, ook volledig gemated. SolidWorks: "(+)" over-defined, rode mate-fout, "(-)" alleen bij vrijheidsgraden.
- Repro: vitest src/qa/qaStrict.test.ts › M2
- Fix: Vrijheidsgraden per component berekenen (Jacobiaan van mate-vergelijkingen), (+)/(-)/geen prefix, fout op conflicterende mate.

#### F109 · Kritiek · Nieuw · Assembly — Mate-solver is richtingsafhankelijk: component op refs[0] wordt nooit verplaatst

- Was: —
- Bewijs: Team 27-10: Strati/Webi/Riki/MT5/Risk: ↑Kritiek — stil fout assembly-resultaat. Code: assembly.ts:409-410 verplaatst refs[0] alleen als refs[1] vast is. || QA-test M1: A vast, C coincident op A, B Distance 5 op C (B = refs[0]) → B blijft op y=100 (verwacht 25). Zelfde mate met omgedraaide refs → B op 25. solveMates (assembly.ts:400) = sequentiële 8-pass per-mate verplaatsing van refs[1].
- Repro: vitest src/qa/qaStrict.test.ts › M1
- Fix: Simultane solver (Newton/LM over alle vrije componenten) of minstens graaf-ordening vanaf vaste componenten; beide kanten van een mate verplaatsbaar.

#### F111 · Kritiek · Nieuw · Topologie — Fillet-rand die door een eerder ingevoegde feature gesplitst wordt: maar één deel afgerond, zonder waarschuwing

- Was: —
- Bewijs: Team 27-10: Strati/Webi/Riki/MT5/Risk: ↑Kritiek — stil foute geometrie (errors {}), gaat zo de STEP-export in. || QA-test T3: plaat 80×40×10, Fillet R2 op lange bovenrand; daarna slot vóór de fillet ingevoegd die de rand in tweeën splitst → volume 30469.53 = exact "één helft afgerond" (verwacht 30439.91 voor beide), errors {}.
- Repro: vitest src/qa/qaStrict.test.ts › T3
- Fix: Bij gesplitste rand alle afstammelingen matchen (zelfde face-namen), anders waarschuwing tonen zoals SolidWorks "Missing edge".

#### F112 · Kritiek · Nieuw · UI/Options — Options-dialoog is grotendeels façade: 342 van 375 instellingen doen niets

- Was: —
- Bewijs: Team 27-10: Strati: ↑Kritiek; Risk: AutoRecover/Backup-subset P0 — "Save auto-recover info every 10 minutes" staat standaard aan (prefs.ts:305-307/363) en niets schrijft naar backup.* (5 backup.*-sleutels inert). Telling: Webi noemt 341; QA-hertelling met exacte sleutelmatch geeft 342/375 inert (wc -l toont 341 omdat de laatste regel geen newline heeft; een substring-telling ziet "fm.tree" ten onrechte als gebruikt via "fm.treeFilter"). Ook perf.softwareOpenGL (prefs.ts:254) is inert — had F115 kunnen opvangen. || prefs.ts: 375 sleutels in 31 categorieën, slechts 33 buiten prefs.ts gelezen (logs/prefs-unused.txt). Inert o.a. alle backup.* (AutoRecover-minuten/-map, back-ups), doc.lengthUnit/angleUnit/massa-eenheden, dual dims, perf.verification, sketch.fullyDefined, drawings.hatchPattern, msg.displayOverDefined, view-transities.
- Repro: rg per sleutel buiten prefs.ts
- Fix: Inerte opties verbergen of grijs maken; AutoRecover-interval/-map echt implementeren (nu alleen localStorage-autosave).

#### F115 · Kritiek · Nieuw · Robuustheid/CI — Electron zonder WebGL: geen nette afhandeling; self-test en desktop-nohooks rood op Linux-xvfb

- Was: —
- Bewijs: Team 27-10: MT5 Developer: ↑Kritiek; Risk: P0. Viewport.tsx:129 `new THREE.WebGLRenderer(...)` zonder try/catch → generieke ErrorBoundary-dialoog "An operation failed… Error creating WebGL context." (shots/self-test-electron.png) i.p.v. een GPU-melding (Webi, MT5). Pref perf.softwareOpenGL bestaat maar is inert (F112). || Box (xvfb, geen GPU): self-test 7/8 ("Fillet1 is exact" ok=false, info undefined), desktop-nohooks TimeoutError. Met --use-angle=swiftshader: 8/8 en 8/8. CI draait ubuntu zonder deze flag ⇒ waarschijnlijk rood.
- Repro: logs/self-test-2.json, logs/desktop-nohooks.log vs *-swiftshader.*
- Fix: WebGL-detectie met duidelijke melding/terugval; CI-job met SwiftShader-flags.

#### F128 · Major · Nieuw · CI — CI rood by design: desktop-nohooks en self-test zonder SwiftShader vóór de regressie; artefacten stil leeg

- Was: —
- Bewijs: Strati N6 / Riki R05 / Risk R4 / MT5: ci.yml:25 `xvfb-run -a node e2e/desktop-nohooks.mjs` en :27 self-test zonder --use-angle=swiftshader; regressie pas op :37-39; upload-artifact `if-no-files-found: ignore` (ci.yml:46,52). Lokaal zonder GPU: TimeoutError en 7/8. QA nagelezen.
- Repro: ci.yml
- Fix: SwiftShader-flags in beide stappen (of WebGL-detectie), continue-on-error met eindgate, artefact verplicht.

#### F130 · Major · Nieuw · Proces — Breedte boven correctheid: +7608 regels, maar geen tests voor mate-richting/conflict of gesplitste randen

- Was: —
- Bewijs: Strati N8: diff 0.4.8→0.5.1 src +7608/−4321. Correctie QA: er zijn wél mate-unit-tests (assembly.test.ts:75,96; mates2.test.ts), maar geen enkele dekt richtingsafhankelijkheid (M1), conflict (M2) of gesplitste/revolve-randen (T2/T3).
- Repro: git diff --stat 81f9c95..46fc2f3
- Fix: M1/M2/T2/T3 als vaste regressietests; UI-pariteit bevriezen tot F108/F109/F111 groen zijn.

### P1 (16)

#### F10 · Major · Deels opgelost · Tekening — Ø-maat en tekening herstellen na reload

- Was: Open
- Bewijs: 0.5.1 Linux-regressie: DONE 91/93 — failed: drawing rebuildworker. 0.5.1: Linux regressie: drawing exit=1, 24/25 — "drawing restored after reload" slaagt nu, maar "FAIL diameter Ø35 placed" {"picked":false} blijft (shots/e43-fail-diameter.png). Commit 358b3ba claimde "Tekening-picks 4 px (Ø35 op Linux)": niet waar op Linux. Windows-log: 93/93. || 0.4.8: logs/regression.log: drawing exit=1, 22/24 — FAIL diameter Ø35 placed, FAIL drawing restored after reload (zelfde als 0.3.4; docs claimen 86/86) Teamnoot (Riki): reload-check (dims.length===2) is vervolg van Ø35 — zie F102.
- Repro: node e2e/drawing.mjs op Linux
- Fix: Ø-picking onafhankelijk van font/metrix; reload wacht op herstelde staat; CI-artifact met screenshot.

#### F50 · Kritiek · Deels opgelost · Juridisch — SW-handelsmerken

- Was: Deels opgelost
- Bewijs: 0.5.1: "Weldments" nog zichtbaar (28 hits, o.a. CommandManager-tab, shots/e19-mass-properties.png) en "SW-Density" als File Property (equations.ts:257-261). Pack and Go/MBD weg. || 0.4.8: Hole Wizard→Hole Tool; Lifecycle→Share; FeatureManager/PM/DimXpert weg; uiText.test NAMES-regex. Nog zichtbaar: Weldments, MBD Dimensions, Pack and Go (AssemblyTab/Share). Commentaren noemen nog Lifecycle/MBD. Teamnoot: Risk stelde Major voor; strengste wint → Kritiek blijft tot Pack and Go hernoemd is.
- Repro: Ribbon + Share-tab shot app-08
- Fix: Pack and Go→Package Files; MBD Dimensions→Product Dimensions; Weldments mag blijven of → Frames; commentaren opschonen.

#### F51 · Kritiek · Deels opgelost · Geometrie — Mesh-kernel

- Was: Deels opgelost
- Bewijs: 0.5.1: B-rep-refine (OCCT) standaard alleen op desktop (perf.brepKernel); browser = mesh ("Faceted 1/1" in statusbalk). Windows B-rep-pass 11/11, Linux B-rep-pass zie logs/regression-brep.log. Sheet metal/wrap/deform/surfaces e.d. blijven mesh. || 0.4.8: OpenCascade via replicad in occt.worker.ts; pref perf.brepKernel; STEP in/uit; mesh-kernel blijft terugval voor niet-ondersteunde features (docs/15–19) Teamnoot (MT5D/Strati): dekking ongemeten; geen exact/mesh-indicator (zie F99).
- Repro: Part met extrude+fillet; STEP export
- Fix: Feature-dekking meten; mesh-pad uitfaseren waar B-rep groen is.

#### F93 · Kritiek · Deels opgelost · Proces — Docs/commits claimen regressie 86/86 terwijl drawing op Linux rood blijft

- Was: Open
- Bewijs: 0.5.1 Linux-regressie: DONE 91/93 — failed: drawing rebuildworker. 0.5.1: docs/23 benoemt nu eerlijk "alleen Windows"; maar commit 358b3ba (0.4.9) claimt de Linux-fix voor Ø35 en die faalt nog steeds. || 0.4.8: Commit 8285999 e.a. "regressie 86/86"; docs/12 claimt F10 opgelost. Deze ronde: DONE 85/86 failed: drawing (Ø35 + reload) — identiek aan 0.3.4 op Linux. Team: alle 5 reviewers → Kritiek (derde ronde valse groen-claims).
- Repro: Vergelijk git log --grep=86/86 met node e2e/drawing.mjs op Linux
- Fix: Claims aanpassen tot drawing groen is of expliciet "Windows 86/86, Linux drawing bekend rood" + issue-link; F10 eerst fixen.

#### F98 · Major · Deels opgelost · Proces — 42 commits niet gepusht / geen bewijs van remote CI-run

- Was: Open
- Bewijs: 0.5.1: Gepusht (origin up-to-date), maar remote CI-run niet zichtbaar voor QA. || 0.4.8: Branch 42 ahead of origin; hele B-rep-migratie alleen op de laptop. Geen Actions-artifact in report-0.4.8/logs/. 'CI rood' = lokale inferentie. [Strati N2 · Riki R02]
- Repro: git status -sb; ls report-0.4.8/logs/; geen Actions-URL in docs
- Fix: Push naar (private) origin; Actions-artifact van drawing-run bewaren; pas daarna "CI" claimen.

#### F105 · Major · Deels opgelost · Tests — B-rep-pad bijna nooit in regressie geoefend

- Was: Open
- Bewijs: Team 27-10: MT5 Developer: → Deels — B-rep-pass staat in ci.yml:38 maar is in CI nooit groen gezien; de stappen ervoor (ci.yml:25,27) falen zonder GPU (F115/F128). || 0.5.1: B-rep-pass in CI (9 scripts, ci.yml:38) — zie F120. || 0.4.8: brepRefine: onder TEST_HOOKS is B-rep uit tenzij localStorage.phlippo.kernel==='brep'. Alleen e2e/brep.mjs en desktop.mjs zetten de flag; 84/86 regressiescripts rebuilden op mesh. [MT5D-01]
- Repro: rg phlippo.kernel e2e/; tel SCRIPTS vs brep-flag
- Fix: Default e2e naar brep als WASM laadt, of CI-matrix PHLIPPO_KERNEL=brep op features+fillet+step+bodies; assert bodies.exact waar claimed.

#### F110 · Major · Nieuw · Kernel — Fillet op revolve-rand faalt na wijziging van de schetsmaat (mesh-kernel)

- Was: —
- Bewijs: Team 27-10: Bewijscorrectie (Webi/Riki, door QA nagerekend in logs/qa-strict-tests.log): de fillet is NIET "weg". T2 meldt filletApplied:true en v=150184,24 mm³ = 109,55 mm³ onder scherp 150293,79, terwijl een R3-afronding op r=36 analytisch ≈429 mm³ wegneemt. Resultaat = fout lichaam ÉN foutmelding r1. Ernst blijft Major (fout is zichtbaar). || QA-test T2: buis (r 10–30, h 40) + Fillet R3 op buitenste bovenrand OK; buitenmaat 30→36 → r1: "Boolean operation failed: the boolean result failed the volume check (subtract: 148447.45 and 4.89 gave 148598.13 mm³)". Fillet verdwijnt. Getest met de mesh-kernel (browser-standaard); desktop-B-rep niet in deze test.
- Repro: vitest src/qa/qaStrict.test.ts › T2
- Fix: Revolve-fillets via B-rep (OCCT) ook in de browser; face names voor revolve (docs/23).

#### F114 · Major · Nieuw · Import/Export — Geen IGES-, DXF/DWG- of PDF-export; tekening alleen via window.print()

- Was: —
- Bewijs: MenuBar.tsx: Open .kcad/.json/.stl/.step/.stp; Save As STL/3MF/AMF/STEP AP214. Geen IGES/DXF/DWG/PDF; Print = window.print().
- Repro: MenuBar.tsx Save As-lijst
- Fix: DXF/PDF-export van tekeningen (vector), IGES via OCCT.

#### F116 · Major · Nieuw · Handelsmerken — "SW-Density" zichtbaar als File Property in vergelijkingen

- Was: —
- Bewijs: Team 27-10: Webi/MT5/Risk: ↑Major — SW-Density zichtbaar én persistent in vergelijkingen (equations.ts:257-261); rename-trademarks.cjs kent "SW-" niet (F132). || src/core/document/equations.ts:257-261; commit a31280f "SW-Density".
- Repro: rg SW-Density src
- Fix: Hernoemen naar "Density" (of Phlippo-Density) met migratie.

#### F119 · Major · Nieuw · Testinfra — Regressierunner verbergt skip()-regels: "groen" kan overgeslagen checks bevatten

- Was: —
- Bewijs: Team 27-10: Strati/Webi/MT5/Risk: ↑Major — 53 skip()-aanroepen (rg "skip(" e2e), check.mjs:32 logt alleen; zelfde klasse als F31/F93. || e2e/run-regression.mjs filtert stdout tot FAIL/passed; e2e/lib/check.mjs:32 skip() logt alleen; 53 skip()-aanroepen in e2e/.
- Repro: rg "skip\(" e2e
- Fix: Skips tellen en tonen in de samenvatting ("93/93, 4 skipped").

#### F120 · Major · Nieuw · CI — CI-B-rep-pass draait 9 scripts, lokaal 11 (qa2, facenames ontbreken)

- Was: —
- Bewijs: Team 27-10: Strati: ↑Major — CI-B-rep-pass (ci.yml:38) mist qa2 en facenames én wordt in CI nooit bereikt (F128). || .github/workflows/ci.yml:38 vs e2e-out/brep-0.5.1.txt (11/11).
- Repro: ci.yml
- Fix: qa2 en facenames toevoegen.

#### F126 · Major · Nieuw · Proces/Bewijs — Windows-regressielog is geplakt, geen ruwe runner-output

- Was: —
- Bewijs: Strati N4 / Risk R3 / MT5: logs/windows-regression-0.5.1.txt heeft 96 regels met 94× "exit=" voor 93 scripts; r.94 "DONE 93/93 green", r.95 afgebroken duplicaat "eos54: exit=0 14s 18/18 checks passed", r.96 nogmaals "DONE 93/93 green" (QA nageteld).
- Repro: logs/windows-regression-0.5.1.txt r.94-96
- Fix: Ruwe e2e-out/regression-*.txt of een GitHub Actions-artefact bewaren; geen handgeschreven samenvattingen als bewijs.

#### F127 · Major · Nieuw · Kernel — Zonder GPU faalt "Fillet1 is exact" (exactVolume undefined): exactheid hangt af van GPU/timing

- Was: —
- Bewijs: Strati N5 / Riki R08: logs/self-test-2.json "Fillet1 is exact" ok=false info "undefined" (selfTest.ts:57); met SwiftShader 8/8. Oorzaak niet onderzocht (door niemand geverifieerd).
- Repro: xvfb-run npx electron . --self-test (zonder --use-angle=swiftshader)
- Fix: Oorzaak vinden: de B-rep-check mag niet van rendering afhangen.

#### F131 · Major · Nieuw · Juridisch — Geregistreerd merk "3D ContentCentral" zichtbaar in Options ▸ Search

- Was: —
- Bewijs: Risk R6: prefs.ts:313 label "Search 3D ContentCentral" (QA nagelezen); stond al in 0.4.8; rename-trademarks.cjs kent het niet.
- Repro: Options ▸ Search
- Fix: Label → "Search online part libraries" of optie verwijderen (is toch inert, F112).

#### F132 · Major · Nieuw · Juridisch/Tooling — Merkencheck rename-trademarks.cjs kent "Weldments", "SW-" en "3D ContentCentral" niet → CI groen ondanks merken

- Was: —
- Bewijs: Riki R07 / MT5: `grep -n "Weldments\|SW-\|ContentCentral" tools/rename-trademarks.cjs` = 0 treffers (QA); ci-checks.log "total 0 dry run"; "Weldment" komt 53× voor in src.
- Repro: node tools/rename-trademarks.cjs --check
- Fix: Termen toevoegen aan de rename-map; check moet falen op zichtbare merken.

#### F135 · Major · Nieuw · Juridisch — Statusbalk-prompts letterlijk uit SOLIDWORKS-video's + video-frame-tags in code

- Was: —
- Bewijs: Risk R2: StatusBar.tsx:49 "as the intended status bar words it (measured in the reference videos)"; 22 `return`-strings in StatusBar.tsx (QA nageteld); frame-tags (57/0028) StatusBar.tsx:63, (46/0146) MenuBar.tsx:371, (53/0068) AppearancesPane.tsx:25, (58/0033) FeatureTreeBody.tsx:600. Options spiegelt 375 sleutels/31 categorieën. docs/06 "Hulpteksten zijn zelf geschreven" klopt niet meer. Risicosignaal, geen juridisch advies.
- Repro: StatusBar.tsx
- Fix: Prompts in eigen woorden (zelfde betekenis), frame-tags weg, docs/06 corrigeren; inerte Options verbergen.

### P2 (18)

#### F38 · Major · Deels opgelost · Docs — README/TASKS

- Was: Deels opgelost
- Bewijs: 0.5.1: docs/23 zegt eerlijk "Linux en de CI zijn niet gedraaid"; maar commit 358b3ba claimt een Linux-fix die niet standhoudt. || 0.4.8: docs/12 claimt F10/F54 opgelost; commits 0.4.x claimen regressie 86/86; op Linux drawing rood (F93)
- Repro: docs vs logs/regression.log
- Fix: Docs/commits eerlijk houden over Linux-CI.

#### F46 · Major · Deels opgelost · Performance — CSG/solver op de UI-thread

- Was: Deels opgelost
- Bewijs: Team 27-10: Webi: mesh-CSG draait in de browser nog op de UI-thread; rebuildBudgetMs nog 45 000 (rebuild.ts:875) — zie F137. || 0.5.1: Rebuild-worker (perf.rebuildWorker) bestaat; worker-suite Windows 6/6, self-test "rebuild worker builds the same body 1143/1143". In de browser/zonder pref blijft mesh-CSG synchroon. || 0.4.8: OCCT-worker + solver-worker; mesh-CSG (csg) nog synchroon op UI-thread voor niet-B-rep features; rebuildBudgetMs=45_000 (rebuild.ts:805); brepRefine async na mesh Teamnoot (MT5D/Webi): solver.solveSync enige pad; solver.solve 0 callers; mesh csg() sync; budget 45 000.
- Repro: Zwaar fillet/patroon
- Fix: Mesh-booleans naar worker of budget ~5 s + voortgang; meer features exact via B-rep.

#### F47 · Major · Deels opgelost · Geometrie — Topologische naamgeving

- Was: Deels opgelost
- Bewijs: 0.5.1: Eigen QA-tests (logs/qa-strict-tests.log): T1 fillet op gatrand overleeft Ø35→Ø50 ✓; T3 rand gesplitst door later ingevoegde slot: slechts 1 van 2 delen afgerond, zonder waarschuwing ✗ (F111); T2 revolve-fillet faalt na maatwijziging ✗ (F110). Face names alleen voor extrude (docs/23). || 0.4.8: 0.3.7: stabiele randverwijzingen (richting+normalen); volledige topologische namen nog apart traject (docs/19)
- Repro: Edge-fillet na edit
- Fix: Topologische id’s afronden.

#### F48 · Major · Deels opgelost · Geometrie — CSG-resultaat ongecontroleerd / toleranties

- Was: Deels opgelost
- Bewijs: 0.5.1: Volume-/gesloten-check vangt fouten (T2: "boolean result failed the volume check") — goed — maar de feature valt dan weg i.p.v. te slagen. || 0.4.8: B-rep volume-check vs meshTool (rebuild.ts); niet overal manifold-gate
- Repro: Boolean zwaar
- Fix: Structurele manifold-check na elke boolean.

#### F49 · Major · Deels opgelost · Electron — Release-hardening (heropend; samengevoegd met F117)

- Was: Opgelost
- Bewijs: Team 27-10: Strati/MT5: heropend — "Opgelost (bewust geen signing)" spreekt F117 tegen; release-hardening is niet af zolang signing open is. Zie F117. || Ian: geen code signing; F49 gesloten in docs/14; SmartScreen-gedrag gedocumenteerd
- Repro: Installer
- Fix: Geen (bewust).

#### F94 · Major · Deels opgelost · Juridisch — Pack and Go, Weldments en MBD Dimensions nog zichtbaar

- Was: Open
- Bewijs: Team 27-10: Risk stelde ↓Minor voor; de strengste stem (Major) blijft staan. || 0.5.1: Pack and Go/MBD Dimensions weg; Weldments blijft (bewuste keuze in docs) — strenge QA: blijft restant F50. || 0.4.8: Share-tab: Pack and Go (shot app-08); tabs Weldments + MBD Dimensions (ui48). Onderdeel restant F50. Teamnoot (Strati/Risk): Major — restant van F50, bepaalt GO #10.
- Repro: Assembly → Share; Part → tabs
- Fix: Hernoemen of onder F50 afronden; qa-regex uitbreiden.

#### F99 · Major · Deels opgelost · Geometrie — Geen exact-vs-mesh-indicator; STEP voor fallback-bodies onbewezen

- Was: Open
- Bewijs: Team 27-10: Strati: → Deels — indicator en STEP-waarschuwing bestaan (StatusBar.tsx:213, FeatureTreeBody.tsx:334) maar er is geen e2e-test op de indicator of de STEP-waarschuwing. || 0.5.1: Statusbalk-cel "Faceted n/m" + STEP-waarschuwing (shots/e19-mass-properties.png "Faceted 2/2"). || 0.4.8: Body.exact bestaat; UI toont geen badge/label exact vs benadering. STEP-export sewt mesh-bodies stil (occt.worker shapesToStep); geen waarschuwing als exact < bodies.length. [Strati N3 · MT5D-02]
- Repro: Part met mesh-terugval → Feature Tree; STEP export; check UI-waarschuwing
- Fix: Indicator per body in Feature Tree/statusbalk; warn/block STEP bij non-exact; documenteer welke features exactheid verliezen.

#### F100 · Major · Deels opgelost · Tests — desktop-nohooks niet in CI

- Was: Open
- Bewijs: 0.5.1: desktop-nohooks staat in CI, maar faalt op Linux-xvfb zonder SwiftShader (TimeoutError, logs/desktop-nohooks.log); met --use-angle=swiftshader 8/8. || 0.4.8: desktop-nohooks.mjs dekt Final Render + Zoom to Fit zonder hooks, maar staat niet in .github/workflows/ci.yml noch in run-regression.mjs. CI compileert release-build maar test functioneel alleen build:e2e (hooks aan). F53-regressie kan CI groen laten. [Risk R1 · Riki R01]
- Repro: rg desktop-nohooks .github/workflows/ci.yml e2e/run-regression.mjs
- Fix: desktop-nohooks (xvfb) na npm run build in CI, of Playwright tegen release-dist zonder VITE_TEST_HOOKS.

#### F113 · Major · Nieuw · FeatureManager — Geen feature-reorder (slepen in de boom)

- Was: —
- Bewijs: FeatureTreeBody.tsx: alleen draggable rollback-bar (r.381); geen drag/drop of reorder-code voor features (rg "reorder|onDrop|draggable"). SolidWorks: features slepen met parent/child-check.
- Repro: rg in src/app/panels
- Fix: Drag & drop met parent/child-validatie + undo.

#### F117 · Major · Nieuw · Installer — Installer/exe niet code-signed (samengevoegd met F49)

- Was: —
- Bewijs: Team 27-10: Strati: ↑Major voor publieke verspreiding; tegenspraak met F49 "Opgelost (bewust geen signing)" → F49 heropend en samengevoegd: één fix (signen of expliciet "alleen eigen gebruik" vastleggen). || Geïnstalleerde app C:\Users\ianph\AppData\Local\Programs\Phlippo CAD (0.5.1): Authenticode NotSigned (windows-packaged-self-test.json). SmartScreen-waarschuwing bij installatie.
- Repro: Get-AuthenticodeSignature
- Fix: Code-signing certificaat (of minimaal documenteren).

#### F121 · Major · Nieuw · Features — Ontbrekende SolidWorks-features: Dome, Indent, Mounting Boss, Snap Hook, Lip/Groove; Smart Fasteners en Instant3D slechts deels (Auto Fasteners, Drag Handles)

- Was: —
- Bewijs: featureTypes.ts (~60 types) bevat ze niet; rg "dome|mountingBoss|snapHook|lipGroove|instant3d" = 0 feature-hits ("Indent" alleen als sheet-metal gusset-optie).
- Repro: rg in src
- Fix: Prioriteren: Dome, Indent, Mounting Boss, Instant3D (drag handles).

#### F122 · Major · Nieuw · Tekeningen — Standaardaanzichten zonder automatische centermarks/verborgen lijnen

- Was: —
- Bewijs: Team 27-10: Webi: ↑Major — tekening zonder centermarks/verborgen lijnen is geen SOLIDWORKS-standaardaanzicht. Riki: vergelijking met de SW-standaard niet geverifieerd. || shots/e42-three-views.png, e43-drawing: gat Ø35 alleen in bovenaanzicht zichtbaar; geen centermark, geen verborgen lijnen in voor-/zijaanzicht.
- Repro: drawing.mjs
- Fix: Document-optie "auto insert center marks" + weergavemodus Hidden Lines Visible.

#### F123 · Minor · Nieuw · Sketcher — Schets-solver mist relaties: Intersection, Merge, Equal curvature (G2), AlongX/Y/Z; geen 3D-maten

- Was: —
- Bewijs: solver.ts relaties: coincident … tangent (16 soorten); docs/24 noemt 3D-schetsmaten bewust weggelaten.
- Repro: src/core/solver/solver.ts
- Fix: Relaties toevoegen; 3D-schets solver.

#### F125 · Major · Nieuw · Performance — UI bevriest tijdens zware rebuild op Linux (frame-gap 933 ms > 250 ms; rebuild 39,8 s)

- Was: —
- Bewijs: logs/regression.log: rebuildworker exit=1 — FAIL "the window kept drawing frames during the rebuild (no gap over 250 ms)" {"gap":933.35,"frames":467,"workerMs":39788}; 9/10. Op Windows-log groen. Box zonder GPU (software-rendering) kan bijdragen; toch rode e2e op het CI-platform.
- Repro: node e2e/run-regression.mjs rebuildworker (Linux, vite preview :4173)
- Fix: Main-thread-werk tijdens rebuild opsplitsen (mesh-upload in chunks), of de drempel onderbouwen; in CI groen krijgen.

#### F129 · Minor · Nieuw · Docs — Verouderde docs en tellingen

- Was: —
- Bewijs: Strati N7: docs/23:4 zegt nog "Linux en de CI zijn niet gedraaid, omdat de branch niet gepusht wordt" (branch is gepusht); Risk: README.md:69/74/79 idem/onbewezen. Ook dit QA-rapport noemde 124 i.p.v. 125 bevindingen (§12) — gecorrigeerd.
- Repro: docs/23 r.4; README.md
- Fix: Docs bijwerken; geen "groen" zonder run-link.

#### F133 · Minor · Nieuw · Testinfra — ≈80 ingeslikte catches in e2e-scripts

- Was: —
- Bewijs: Riki: ≈80; QA-telling: 84 `.catch(() => …)`-patronen in e2e/*.mjs. Fouten in setup-stappen verdwijnen stil.
- Repro: rg "\.catch\(\(\) =>" e2e
- Fix: Catches loggen of laten falen; alleen gericht negeren.

#### F136 · Minor · Nieuw · Juridisch/Tooling — Neutral-comments-check incompleet

- Was: —
- Bewijs: Risk R5: electron/main.cjs:2 "as the original" (QA nagelezen) wordt niet gevangen; ook "reference frames/videos" en frame-tags (\d{2}/\d{4}) niet.
- Repro: node tools/neutral-comments.cjs --check
- Fix: Regex uitbreiden.

#### F137 · Major · Nieuw · Performance — Rebuild-budget nog 45 s; mesh-CSG op de UI-thread in de browser

- Was: —
- Bewijs: Webi/Risk: rebuild.ts:875 `export let rebuildBudgetMs = 45_000` (QA nagelezen); in de browser of zonder perf.rebuildWorker blijft mesh-CSG synchroon (store.ts:1231). 0.4.8-advies niet uitgevoerd. Verwant aan F46/F125.
- Repro: rebuild.ts:875
- Fix: Budget naar ≈5 s met voortgang/annuleren; CSG standaard in de worker.

### P3 (8)

#### F16 · Major · Niet geverifieerd · Visueel — Iconen en lettertype

- Was: Deels opgelost
- Bewijs: Team 27-10: Webi: geen SOLIDWORKS-referentieshots in 0.5.1 → pixel-/icoongelijkheid niet geverifieerd (status was "Deels opgelost"). || 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Plaatwerk/eigen iconen; Segoe-referentie niet pixelgelijk; ontwerpronde 0.4.4–0.4.8 verbeterde previews
- Repro: compare
- Fix: Icon-set en lettertype verder afstemmen of workflow-herkenbaarheid als doel houden.

#### F21 · Minor · Niet geverifieerd · Visueel — Taakvenster-iconen

- Was: Deels opgelost
- Bewijs: Team 27-10: Webi: geen SOLIDWORKS-referentieshots in 0.5.1 → pixel-/icoongelijkheid niet geverifieerd (status was "Deels opgelost"). || 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Taakvenster-tabs op referentiemaat (0.3.6); iconen niet volledig hertekend
- Repro: Taakvenster
- Fix: Iconen nalopen.

#### F22 · Minor · Niet geverifieerd · Visueel — Body-randen

- Was: Deels opgelost
- Bewijs: Team 27-10: Webi: geen SOLIDWORKS-referentieshots in 0.5.1 → pixel-/icoongelijkheid niet geverifieerd (status was "Deels opgelost"). || 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Randdikte ongewijzigd
- Repro: Model met body
- Fix: Lijndikte silhouet/randen afstemmen.

#### F24 · Minor · Deels opgelost · Visueel — Extra rij in Modify

- Was: Deels opgelost
- Bewijs: 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Modify Reverse sense (0.4.6); extra rij niet opnieuw bewezen weg
- Repro: Smart Dimension dubbelklik
- Fix: Layout naast referentie controleren.

#### F28 · Minor · Deels opgelost · UX — Bestandsdialoog bij Insert Component

- Was: Deels opgelost
- Bewijs: 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Code aanwezig; packaged desktop niet hertest deze ronde
- Repro: Insert Component desktop
- Fix: desktop-installed.mjs op Windows.

#### F118 · Minor · Nieuw · Performance — Bundle groeit: index 906 kB (gzip 245) vs 862 kB

- Was: —
- Bewijs: logs/build-release.log.
- Repro: npm run build
- Fix: Code-splitting (drawings, sheet metal, OCCT-lazy).

#### F124 · Minor · Nieuw · Scope — Bewuste gaten uit docs/24 (Magnified Selection, Instant2D, virtual-sharp flange, 3D-schetsmaten)

- Was: —
- Bewijs: docs/24 somt ze zelf op.
- Repro: docs/24
- Fix: Op roadmap of uit UI.

#### F134 · Minor · Nieuw · Code — Line-budget-caps staan op de huidige grootte, niet op een doel (MT5D-08)

- Was: —
- Bewijs: MT5 Developer: tools/line-budget.cjs caps vs wc -l (QA nageteld): rebuild.ts 3499/3500, Viewport.tsx 1699/1700, store.ts 1445/1450, slices/features.ts 1592/1600.
- Repro: node tools/line-budget.cjs
- Fix: Caps verlagen als doel en monolieten opsplitsen.

### P4 (86)

#### F01 · Kritiek · Opgelost · Performance — WebGL-geheugenlek bij bewerken

- Was: Opgelost
- Bewijs: zz-leak34: geometries/textures/programs/VAO constant 11/4/3/4 over 75 bewerkingen + 10x new/open · hertest 0.4.8: geen regressie
- Repro: Leak-script: 75 extrude-bewerkingen, 10x New/Open, renderer.info vergelijken
- Fix: Geen; leak-test in CI houden.

#### F02 · Kritiek · Opgelost · Beveiliging — file:save naar willekeurig pad

- Was: Opgelost
- Bewijs: electron/main.cjs: ondoorzichtige handles (F68), save alleen naar door main gekozen pad · hertest 0.4.8: geen regressie
- Repro: Code-review main.cjs save-handler
- Fix: Geen.

#### F03 · Major · Opgelost · Beveiliging — Geen CSP, navigatie- en sender-beveiliging

- Was: Opgelost
- Bewijs: main.cjs: will-navigate/will-frame-navigate/will-redirect geblokkeerd, trusted() exact (alleen code, niet in Electron-binary getest) · hertest 0.4.8: geen regressie
- Repro: Code-review
- Fix: In desktop-installed.mjs een navigatiepoging + drop van een extern bestand testen.

#### F04 · Major · Opgelost · Beveiliging — Testhooks in productie

- Was: Opgelost
- Bewijs: Desktop-simulatie (phlippoDesktop, testHooks:false): alle window.__phlippo* undefined; src/app/testHooks.ts:12 · hertest 0.4.8: geen regressie
- Repro: zz34-desktop.mjs
- Fix: Geen.

#### F05 · Kritiek · Opgelost · Bestanden — Geen schemavalidatie bij openen

- Was: Opgelost
- Bewijs: persistence.ts: whitelist FEATURE_TYPES, entity→punt, feature→schets, depth/thickness/radius 0…1e6 (qa4 groen)
- Repro: Open half-geldig .kcad
- Fix: MAX_FILE_NUMBER 1e12 voor generieke getallen blijft; optioneel naar 1e6.

#### F06 · Major · Opgelost · Schets — Modify accepteert 0

- Was: Opgelost
- Bewijs: regressie: modify-scripts groen · hertest 0.4.8: geen regressie
- Repro: node e2e/run-regression.mjs
- Fix: Geen.

#### F07 · Major · Opgelost · Features — Extrude-diepte niet gevalideerd

- Was: Opgelost
- Bewijs: regressie features 64/64 groen; diepte >1e6 geweigerd in het veld · hertest 0.4.8: geen regressie
- Repro: zz34-ui
- Fix: Geen (zie F80 voor diepte uit bestand).

#### F08 · Major · Opgelost · Features — Extrude op lege schets

- Was: Opgelost
- Bewijs: regressie groen · hertest 0.4.8: geen regressie
- Repro: run-regression
- Fix: Geen.

#### F09 · Major · Opgelost · Features — Full Round fillet

- Was: Opgelost
- Bewijs: filletopts 16/16 groen (291 s, dicht bij timeout 400 s) · hertest 0.4.8: geen regressie
- Repro: run-regression filletopts
- Fix: Script versnellen of opsplitsen zodat het niet flaky wordt.

#### F11 · Major · Opgelost · Assembly — Insert Component

- Was: Opgelost
- Bewijs: regressie insert-scripts groen · hertest 0.4.8: geen regressie
- Repro: run-regression
- Fix: Geen.

#### F12 · Major · Opgelost · Tekening — Standard 3 View

- Was: Opgelost
- Bewijs: regressie groen · hertest 0.4.8: geen regressie
- Repro: run-regression
- Fix: Geen.

#### F13 · Major · Opgelost · Visueel — Welkomstscherm

- Was: Opgelost
- Bewijs: Welkomstscherm met disclaimer (dialogs.tsx:87), shot app-01 · hertest 0.4.8: geen regressie
- Repro: App starten
- Fix: Geen.

#### F14 · Major · Opgelost · Visueel — Commando's actief zonder body

- Was: Opgelost
- Bewijs: Ribbon.tsx:307 Linear Pattern disabled={noBody||inSk}; shot app-03 + ui48
- Repro: New Part → Features
- Fix: Geen.

#### F15 · Major · Opgelost · Visueel — Watermerk

- Was: Opgelost
- Bewijs: fixes1 groen (geen watermerk) · hertest 0.4.8: geen regressie
- Repro: run-regression fixes1
- Fix: Geen.

#### F17 · Minor · Opgelost · Visueel — Isometrisch in plaats van Trimetric

- Was: Opgelost
- Bewijs: Trimetric standaard · hertest 0.4.8: geen regressie
- Repro: Start
- Fix: Geen.

#### F18 · Minor · Opgelost · Visueel — Vlak kiezen

- Was: Opgelost
- Bewijs: Vlaklabels in hoek zonder overlap (app-03, c03) · hertest 0.4.8: geen regressie
- Repro: New Part
- Fix: Geen.

#### F19 · Minor · Opgelost · Visueel — XYZ in statusbalk

- Was: Opgelost
- Bewijs: StatusBar.tsx:116-122 data-testid=status-xyz bij cursor in schets/tekening
- Repro: Schetsen + muis bewegen
- Fix: Geen.

#### F20 · Minor · Opgelost · Visueel — Confirmation Corner

- Was: Opgelost
- Bewijs: Hud.tsx Confirmation Corner .k-confirm; shot app-05; prefs general.confirmationCorner
- Repro: Schets bewerken
- Fix: Geen.

#### F23 · Minor · Opgelost · Visueel — Placeholder-iconen in de Extrude-PM

- Was: Opgelost
- Bewijs: Extrude-PM iconen ok · hertest 0.4.8: geen regressie
- Repro: Extrude
- Fix: Geen.

#### F25 · Minor · Opgelost · Visueel — Sterretje bij niet-opgeslagen

- Was: Opgelost
- Bewijs: * in titel bij wijziging · hertest 0.4.8: geen regressie
- Repro: Wijzig iets
- Fix: Geen.

#### F26 · Minor · Opgelost · UX — Nederlandse foutmelding / lang=nl

- Was: Opgelost
- Bewijs: UI Engels by design; About/disclaimer ok
- Repro: —
- Fix: Geen.

#### F27 · Minor · Opgelost · UX — Klein venster

- Was: Opgelost
- Bewijs: Ribbon klapt in (ongewijzigd t.o.v. 0.3.4 groen)
- Repro: Venster verkleinen
- Fix: Geen.

#### F29 · Minor · Opgelost · UX — Standaard bij verwijderen van kinderen

- Was: Opgelost
- Bewijs: confirmdelete groen · hertest 0.4.8: geen regressie
- Repro: run-regression
- Fix: Geen.

#### F30 · Minor · Opgelost · UX — Geen welkom na reload

- Was: Opgelost
- Bewijs: Geen welkom na reload · hertest 0.4.8: geen regressie
- Repro: Reload
- Fix: Geen.

#### F32 · Major · Opgelost · Tests — Niet-hermetische tests

- Was: Opgelost
- Bewijs: Regressie draait op Linux/Chromium zonder msedge; keys, dimpm, confirmdelete groen; fixture in e2e/fixtures · hertest 0.4.8: geen regressie
- Repro: run-regression op Linux
- Fix: filletopts (291 s) inkorten.

#### F33 · Minor · Opgelost · Portabiliteit — Machinegebonden scripts

- Was: Deels opgelost
- Bewijs: 0.5.1: geen machinegebonden paden gevonden in e2e/ of scripts/. || 0.4.8: look-scripts buiten regressie; desktop:build vereist schone tree
- Repro: e2e/look-*.mjs
- Fix: Documenteren.

#### F34 · Major · Opgelost · Performance — Bundelgrootte

- Was: Opgelost
- Bewijs: Geverifieerd 81f9c95: dist/assets/index-*.js 862 016 B (gzip ~230); was 2 159 201. Webi: Opgelost — bevestigd in code.
- Repro: npm run build:e2e
- Fix: Geen.

#### F35 · Minor · Opgelost · Kwaliteit — BVH-optie

- Was: Opgelost
- Bewijs: vitest 337/337, 0 BVH-meldingen · hertest 0.4.8: geen regressie
- Repro: npx vitest run
- Fix: Geen.

#### F36 · Major · Opgelost · Kwaliteit — Monolithische store

- Was: Opgelost
- Bewijs: Geverifieerd 81f9c95: slices/* (9), store.ts 1349 regels, useShallow 185×, kale useStore() 2. PropertyPanel.tsx nog 3932 (restant → F103). Webi: Opgelost — bevestigd.
- Repro: wc -l
- Fix: PropertyPanel verder splitsen optioneel.

#### F37 · Minor · Opgelost · Beveiliging — Dev-dependencies

- Was: Opgelost
- Bewijs: npm audit: 0 kwetsbaarheden · hertest 0.4.8: geen regressie
- Repro: npm audit
- Fix: Geen.

#### F39 · Major · Opgelost · Bestanden — Rebuild wist undo

- Was: Opgelost
- Bewijs: Claim + editcomponent groen (niet zelf handmatig nagespeeld) · hertest 0.4.8: geen regressie
- Repro: run-regression
- Fix: Geen.

#### F40 · Kritiek · Opgelost · Bestanden — Half-geldige .kcad; Ctrl+S overschrijft

- Was: Opgelost
- Bewijs: MenuBar.tsx:36-41 Save vraagt bij rebuild-fouten; .bak/.bak2
- Repro: Ctrl+S met fouten
- Fix: Geen.

#### F41 · Kritiek · Opgelost · Bestanden — Geen opslagvraag / autosave

- Was: Opgelost
- Bewijs: via F74: withUnsavedCheck + editContext; qa4 groen
- Repro: Ctrl+N tijdens edit
- Fix: Geen.

#### F42 · Major · Opgelost · Invoer — Numeriek / eenheden

- Was: Opgelost
- Bewijs: NumberField + meldingen (F81); komma=decimaal by design
- Repro: zz/ui
- Fix: Geen.

#### F43 · Major · Opgelost · Beveiliging — Decal-URL

- Was: Opgelost
- Bewijs: CSP blokkeert remote/file-afbeeldingen · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: Geen.

#### F44 · Major · Opgelost · Performance — Patroon- en bestandslimieten

- Was: Opgelost
- Bewijs: MAX_PATTERN_INSTANCES = 250 (pattern.ts:52,59); 300 → 250 in 1,45 s, geen bevriezing (stille afkapping: F81) · hertest 0.4.8: geen regressie
- Repro: Linear Pattern aantal 300
- Fix: Zie F81.

#### F45 · Major · Opgelost · Electron — Koppeling .kcad

- Was: Opgelost
- Bewijs: Koppeling .kcad in installer · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: Geen.

#### F52 · Minor · Opgelost · UX — Enter herhalen / muisgebaren

- Was: Opgelost
- Bewijs: qa2 17/17 en keys groen op Linux · hertest 0.4.8: geen regressie
- Repro: run-regression
- Fix: Geen.

#### F53 · Kritiek · Opgelost · Desktop — Regressie in desktop: functies kapot zonder testhooks

- Was: Opgelost
- Bewijs: Desktop-simulatie zonder hooks: Zoom to Fit via F en menu werkt, Final Render levert beeld (d34-*). Niet getest in packaged Electron Teamnoot (Riki/Risk): opgelost in code, maar niet geborgd in CI: geen run met hooks uit of tegen de packaged build (zz34-desktop is untracked). · hertest 0.4.8: geen regressie
- Repro: zz34-desktop.mjs
- Fix: In desktop-installed.mjs dezelfde checks in de echte binary.

#### F55 · Major · Opgelost · Bestanden — Beschadigde assembly of drawing crasht de UI

- Was: Opgelost
- Bewijs: Beschadigde assembly/drawing/mate geweigerd met melding ('Component 1 is damaged', 'Sheet 1 is damaged', 'Mate 1 is damaged'); geen crash, geen page errors · hertest 0.4.8: geen regressie
- Repro: zz34-damaged2.mjs
- Fix: Melding ook als dialoog tonen (nu alleen statusbalk).

#### F56 · Kritiek · Opgelost · Juridisch — SimulationXpress geeft spanning en veiligheidsfactor uit een schatting

- Was: Opgelost
- Bewijs: evaluateDialogs2: Indicative ratio yield/stress (not a safety factor); disclaimer; geen groene FOS-kleur op ratio
- Repro: Quick Beam Estimate
- Fix: Geen.

#### F57 · Major · Opgelost · Tests — Testscripts verouderd en lek

- Was: Opgelost
- Bewijs: e2e/lib/check.mjs; smoke/relations process.exitCode; leak in regressie
- Repro: rg process.exitCode e2e/smoke.mjs
- Fix: Geen.

#### F58 · Kritiek · Opgelost · Proces — Feature-burst tegen het advies van feature freeze in

- Was: Opgelost
- Bewijs: src 55.282 regels (+610), geen nieuwe CAD-functies · hertest 0.4.8: geen regressie
- Repro: git diff --stat
- Fix: Geen.

#### F59 · Minor · Opgelost · Proces — tsbuildinfo in git

- Was: Opgelost
- Bewijs: tsbuildinfo uit git · hertest 0.4.8: geen regressie
- Repro: git ls-files
- Fix: Geen.

#### F60 · Kritiek · Opgelost · Assembly — Assembly-cut laat niets over van de body

- Was: Opgelost
- Bewijs: asmcut 3/3 · hertest 0.4.8: geen regressie
- Repro: run-regression asmcut
- Fix: Geen.

#### F61 · Minor · Opgelost · Kwaliteit — Verouderde zoom-fit-hook in tekening

- Was: Opgelost
- Bewijs: qa3 groen (zoom to sheet) · hertest 0.4.8: geen regressie
- Repro: qa3
- Fix: Geen.

#### F62 · Major · Opgelost · Beveiliging — Stored XSS in de Phlippo Viewer-export

- Was: Opgelost
- Bewijs: XSS-naam ontsnapt in viewer-titel, geen PWNED, CSP default-src none · hertest 0.4.8: geen regressie
- Repro: zz34-ui
- Fix: Geen.

#### F63 · Minor · Opgelost · Visueel — Sheet Metal-tab niet contextgevoelig, met generieke iconen

- Was: Opgelost
- Bewijs: Op solid: Edge Flange, Hem, Jog, Unfold e.a. grijs; Base Flange/Insert Bends/Convert actief (u34-f63) · hertest 0.4.8: geen regressie
- Repro: Part met extrude → Sheet Metal-tab
- Fix: Geen.

#### F64 · Minor · Opgelost · Visueel — DimXpertManager: tekst afgekapt en verwarrend

- Was: Opgelost
- Bewijs: DimXpert-tekst loopt om, 'No tolerance scheme yet…' (app-21) · hertest 0.4.8: geen regressie
- Repro: Tolerance Tree
- Fix: Geen.

#### F65 · Minor · Opgelost · Electron — Packaged app luistert naar dev- en E2E-env-vars

- Was: Opgelost
- Bewijs: main.cjs:18-21 PACKAGED-gates (code) · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: In packaged app testen.

#### F66 · Minor · Opgelost · Visueel — Vlaklabels overlappen in Trimetric

- Was: Opgelost
- Bewijs: Geen overlap van vlaklabels · hertest 0.4.8: geen regressie
- Repro: New Part
- Fix: Geen.

#### F67 · Minor · Opgelost · Electron — DevTools bereikbaar via het standaardmenu

- Was: Opgelost
- Bewijs: devTools !PACKAGED (main.cjs:147,180), menu null · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: Geen.

#### F68 · Minor · Opgelost · Electron — file:open geeft het absolute pad aan de renderer

- Was: Opgelost
- Bewijs: Handles i.p.v. paden (code) · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: Geen.

#### F69 · Minor · Opgelost · Electron — openExternal accepteert elke https-URL

- Was: Opgelost
- Bewijs: Allowlist openExternal (code) · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: Geen.

#### F70 · Major · Opgelost · Bestanden — Schemavalidatie oppervlakkig

- Was: Opgelost
- Bewijs: via F80
- Repro: —
- Fix: Geen.

#### F71 · Major · Opgelost · Invoer — Geen bovengrens op numerieke invoer

- Was: Opgelost
- Bewijs: 1e300 en 1e7 geweigerd (MAX_FIELD_VALUE = 1e6, components.tsx:287); 999999 geaccepteerd; geen melding bij weigeren (F81) · hertest 0.4.8: geen regressie
- Repro: zz34-ui
- Fix: Zie F81.

#### F72 · Major · Opgelost · Juridisch — Disclaimer onvolledig en deels onjuist

- Was: Opgelost
- Bewijs: About 'Phlippo CAD 0.3.4' + volledige disclaimer (u34-about), Welcome, Viewer-footer, LICENSE.txt in installer · hertest 0.4.8: geen regressie
- Repro: Help → About
- Fix: Geen.

#### F73 · Minor · Opgelost · Juridisch — Geen LICENSE/EULA en third-party notices

- Was: Opgelost
- Bewijs: LICENSE.txt en THIRD-PARTY-NOTICES.txt · hertest 0.4.8: geen regressie
- Repro: dist/installer config
- Fix: Geen.

#### F74 · Kritiek · Opgelost · Assembly — Edit Component-context blijft staan na Open/New

- Was: Opgelost
- Bewijs: MenuBar.tsx:72-97 withUnsavedCheck op editContext; qa4 14/14 groen; store setDirty bij editContext
- Repro: Edit Component → Ctrl+N
- Fix: Geen.

#### F75 · Major · Opgelost · Bestanden — Modelwijzigingen buiten undo

- Was: Opgelost
- Bewijs: Undo werkt voor renameDocument, renameFeature, setMaterial, setUnits (zz34-ui); setTableCell met history.push (store.ts:3444) · hertest 0.4.8: geen regressie
- Repro: zz34-ui
- Fix: Geen.

#### F76 · Minor · Opgelost · Assembly — Interferentie: mislukte boolean telt als 'geen interferentie'

- Was: Opgelost
- Bewijs: interference.ts catch markeert paar als mislukt; assemblyDialogs.tsx:106 'Not checked' · hertest 0.4.8: geen regressie
- Repro: Code
- Fix: Geen.

#### F77 · Minor · Opgelost · UI-tekst — Kapotte hernoemteksten

- Was: Opgelost
- Bewijs: rg Tree Tree / a Auto: 0 hits; uiText.test
- Repro: Menu View
- Fix: Geen.

#### F78 · Major · Opgelost · UI — Rebuild-fouten onzichtbaar: '!'-markering buiten beeld, geen What's Wrong

- Was: Opgelost
- Bewijs: WhatsWrong.tsx; status flex:none; openDocument zet whatsWrong; tree-error klikbaar
- Repro: Open bestand met fout
- Fix: Geen.

#### F79 · Minor · Opgelost · Rendering — Final Render bakt hover/selectie-highlight in

- Was: Opgelost
- Bewijs: Viewport.tsx:667-670 selectie/hover gewist vóór Final Render
- Repro: Final Render met selectie
- Fix: Geen.

#### F80 · Major · Opgelost · Bestanden — Validatie mist verwijzingen en onbekende feature-types

- Was: Opgelost
- Bewijs: persistence.ts entity-refs, FEATURE_TYPES, length-grenzen; qa4 groen. Rest: MAX_FILE_NUMBER 1e12 voor niet-lengtevelden
- Repro: badEntity/unknownFeature
- Fix: Generieke MAX naar 1e6.

#### F81 · Minor · Opgelost · Invoer — Stille afkapping en weigering zonder melding

- Was: Opgelost
- Bewijs: NumberField showNote bij weigeren; pattern-limit melding PropertyPanel; qa
- Repro: Patroon 300; diepte 1e7
- Fix: Geen.

#### F82 · Kritiek · Opgelost · Proces — 0.3.4 niet gecommit; HEAD heeft nog versie 0.3.3

- Was: Opgelost
- Bewijs: Tags v0.3.4…v0.4.8; HEAD 81f9c95 = v0.4.8-2-g81f9c95; desktop:build checkt schone tree; WT schoon op laptop
- Repro: git describe
- Fix: Geen.

#### F83 · Minor · Opgelost · Code — Dubbele testhook-conditie in bodyScene.ts

- Was: Opgelost
- Bewijs: bodyScene.ts importeert TEST_HOOKS
- Repro: sed bodyScene
- Fix: Geen.

#### F84 · Major · Opgelost · Tests — Regressie overschrijft de voorbeeld-.kcad's in git

- Was: Opgelost
- Bewijs: doorhandle.mjs → os.tmpdir() tenzij UPDATE_EXAMPLES=1
- Repro: run-regression; git status voorbeelden
- Fix: Geen.

#### F85 · Major · Opgelost · Electron — Packaged app accepteert --remote-debugging-port

- Was: Opgelost
- Bewijs: main.cjs: PACKAGED weigert --remote-debugging-port/--inspect
- Repro: code
- Fix: Geen.

#### F86 · Minor · Opgelost · Tests — Geen lektest in de repo en geen CI-timeout

- Was: Opgelost
- Bewijs: e2e/leak.mjs in SCRIPTS; ci.yml timeout-minutes: 90
- Repro: run-regression leak
- Fix: Geen.

#### F87 · Minor · Opgelost · Beveiliging — Geen permission request/check handlers

- Was: Opgelost
- Bewijs: main.cjs:360-361 deny-by-default permission handlers
- Repro: code
- Fix: Geen.

#### F88 · Minor · Opgelost · Beveiliging — Nog file://, geen app:// en geen grantFileProtocolExtraPrivileges-fuse

- Was: Opgelost
- Bewijs: app://phlippo protocol.handle; grantFileProtocolExtraPrivileges:false
- Repro: code
- Fix: Geen.

#### F89 · Minor · Opgelost · Beveiliging — TEST_HOOKS aan in elke niet-desktopbuild

- Was: Opgelost
- Bewijs: TEST_HOOKS = DEV || VITE_TEST_HOOKS===1 || desktop.testHooks; productiebuild zonder vlag
- Repro: testHooks.ts:13
- Fix: Geen.

#### F90 · Major · Opgelost · Features — Tolerance Stack-up telt alle maten op i.p.v. één maatketen

- Was: Opgelost
- Bewijs: Ribbon: Tolerance Sum (all dimensions) met expliciete disclaimer
- Repro: MBD → Tolerance Sum
- Fix: Geen.

#### F91 · Minor · Opgelost · Juridisch — THIRD-PARTY-NOTICES mist Chromium/Electron-licenties

- Was: Opgelost
- Bewijs: THIRD-PARTY-NOTICES verwijst naar LICENSES.chromium.html
- Repro: notices
- Fix: Installer-inhoud steekproef op Windows.

#### F92 · Major · Opgelost · Juridisch — ~250 'as the original'-commentaren en 'reference frame f_0341'

- Was: Opgelost
- Bewijs: rg 'as the original' src → 0 hits
- Repro: rg
- Fix: Geen.

#### F95 · Major · Opgelost · Portabiliteit — Node not pinned: CI Node 22 vs QA Node 20, no engines field

- Was: Open
- Bewijs: 0.5.1: .nvmrc 22 + engines in package.json. || 0.4.8: package.json heeft geen engines-veld (geverifieerd 81f9c95). CI (.github/workflows/ci.yml:14) pinned Node 22; QA/box draaide Node v20.19.2. Oud bewijs 'engines ≥22' is stale (Webi/MT5D/Risk). Strati: Major — Node eerst gelijktrekken vóór drawing-debug.
- Repro: node -v; cat .github/workflows/ci.yml | grep node-version; node -e "console.log(require('./package.json').engines)"
- Fix: QA/docs op Node 22 zetten (match CI), of engines.node pin + matrix 20+22; daarna drawing debuggen.

#### F96 · Minor · Opgelost · UX — tipTexts Tolerance Sum spreekt nog van stack-up

- Was: Open
- Bewijs: 0.5.1: Tolerance Sum-tekst is eerlijk over de beperking. || 0.4.8: tipTexts.ts:90 'Adds up a chain of tolerances (stack-up)' vs Ribbon-disclaimer 'all dimensions'
- Repro: Hover Tolerance Sum
- Fix: Tooltip gelijk trekken aan de dialoogtekst.

#### F97 · Kritiek · Opgelost · Electron — Packaged app:// + OCCT WASM niet smoke-getest op Windows

- Was: Open
- Bewijs: 0.5.1: Windows packaged self-test (app://, 0.5.1) 8/8 ok — logs/windows-packaged-self-test.json: Fillet exact 44742.52, STEP 23567 bytes exact, worker 1143/1143, save+.bak. Linux: alleen 8/8 met SwiftShader (zie F115). || 0.4.8: Packaged Electron/NSIS deze ronde niet hertest terwijl app:// + OCCT WASM-worker nieuw zijn. desktop-installed.mjs checkt alleen start/versie/debug-weigering — geen sketch/extrude/fillet/STEP/WASM. Zelfde faalklasse als F53. [Strati N1 · Webi a · MT5D-06]
- Repro: Windows NSIS-build: open part → extrude → fillet → STEP → Save; of uitbreiden desktop-installed/nohooks.mjs
- Fix: Windows packaged smoke zonder hooks: app://+WASM laden, Zoom/Fit, Final Render, extrude+fillet, STEP, Save/Save As. Gate release erop.

#### F101 · Minor · Opgelost · Tests — clickall (en desktop-export/peek) zonder exit-code

- Was: Open
- Bewijs: 0.5.1: clickall geeft exitCode door. || 0.4.8: clickall.mjs eindigt na writeFileSync + browser.close() zonder process.exit/exitCode. Niet in SCRIPTS → laag risico, wel vals groen bij handmatig draaien. [Riki R03]
- Repro: node e2e/clickall.mjs; echo $?
- Fix: exitCode/process.exit toevoegen of scripts naar e2e/tools/ + documenteren.

#### F102 · Minor · Opgelost · Tests — Reload-check in drawing blijft gekoppeld aan Ø35

- Was: Open
- Bewijs: 0.5.1: ontkoppeld. || 0.4.8: drawing.mjs ~r.201 eist dims.length===2; bij Ø35-falen dus twee FAIL-regels voor één oorzaak. Info logt dims (beter), maar F10 oogt als twee bugs. [Riki R04]
- Repro: Lees drawing.mjs rond reload-assert; vergelijk met Ø35-fail
- Fix: Reload-assert splitsen (views/notes vs dims) of dims alleen checken als Ø35 eerst groen was.

#### F103 · Minor · Opgelost · Kwaliteit — PropertyPanel-monolith (3932 regels) na F36

- Was: Open
- Bewijs: 0.5.1: opgelost (code bevestigd). || 0.4.8: Store is gesplitst (F36 Opgelost), maar PropertyPanel.tsx is nog 3932 regels (lazy-loaded, niet gesplit). [Webi b · MT5D-05]
- Repro: wc -l src/app/panels/PropertyPanel.tsx
- Fix: Splitsen per feature-familie achter hetzelfde panel-shell; line-count budget in CI.

#### F104 · Minor · Opgelost · Electron — blank.html-flits op file:// vóór app://

- Was: Open
- Bewijs: 0.5.1: app://-scheme, geen blank.html meer. || 0.4.8: migrateStorage loadFile't kort blank.html op file:// vóór app://. CSP default-src 'none'; navigation deny staat; restant. [Webi c]
- Repro: Start desktop; let op korte file://-flits; lees migrateStorage
- Fix: Direct app:// laden of blank.html vermijden in het migratiepad.

#### F106 · Major · Opgelost · Geometrie — occtClient.call zonder timeout of cancel

- Was: Open
- Bewijs: 0.5.1: KernelTimeout + herstart in occtClient. || 0.4.8: occtClient.call: pending.set + postMessage, geen setTimeout/AbortSignal. Vastgelopen WASM laat Promise hangen. SolverClient.solve eveneens zonder timeout/onerror. [MT5D-03]
- Repro: Lees src/core/occt/occtClient.ts call(); src/core/solver/solverClient.ts
- Fix: Per-call timeout (bijv. 60 s refine / 120 s STEP), reject + worker herstarten; UI: "exact refine timed out — showing mesh".

#### F107 · Major · Opgelost · Kwaliteit — Sketch-solver-worker is dode code

- Was: Open
- Bewijs: 0.5.1: Solver-worker verwijderd; alleen occt- + rebuild-worker. || 0.4.8: SolverClient.solve nooit aangeroepen (rg: 0). Productiepad alleen solveSync (store.ts:1096/1299/1304). solver.worker.ts (18 regels) shipped maar unused; comment claimt async solves — false. [MT5D-04]
- Repro: rg "solver\.solve" src; lees solverClient.ts + store.ts call sites
- Fix: solveAll/non-drag via solver.solve routeren, of worker verwijderen en async-claim schrappen.

## 9. Teamoordeel (geïntegreerd 27-10-2026, ca. 21:35 Brussel)

Bron: `team/strati.md`, `team/webi.md`, `team/riki.md`, `team/mt5dev.md`, `team/risk.md`. Regel: **de strengste score en de strengste ernst winnen.** Teamclaims zijn waar mogelijk door QA nagecontroleerd in de code (HEAD 46fc2f3) en de logs. Waar een teamclaim niet klopte, staat dat hieronder.

### 9.1 Scores

| Lid | Score | GO/NO-GO | Top 3 |
|---|---|---|---|
| Strati | 5 | NO-GO; voorwaardelijk GO eigen gebruik | 1. Stil foute geometrie (F109/F108/F111)<br>2. CI-waarheid, vierde ronde (F93/F31/N4→F126/N6→F128)<br>3. Façade en focus (F112/N8→F130/F50/F116; Weldments in src) |
| Webi | 5 | NO-GO | 1. Uiterlijk niet bewezen: geen SW-referentieshots, parity verwees naar niet-bestaande shots, geen revolve-e2e<br>2. Stil verkeerde geometrie/assemblies (F111, F109)<br>3. Groen onbetrouwbaar: CI zonder SwiftShader (F115), Windows-zelfrapportage, merkencheck 0 treffers (F132) |
| MT5 Developer | 5 | NO-GO | 1. Stil foute resultaten in kernel en mate-solver (F109/F111/F108)<br>2. CI niet waarheidsgetrouw, op Linux nooit groen (F115/F128/F119/F126)<br>3. Lijkt op SW aan de oppervlakte, niet in gedrag (F112/F113/F114, Viewport.tsx:129) |
| Risk & Optimization | 5,5 (functioneel 6 · gelijkenis/merk 4) | NO-GO; NO-GO publiceren; GO eigen gebruik onder voorwaarden | 1. Stil foute geometrie (F109/F111; wortel F51)<br>2. CI-waarheid (F31/F54/F93/F119/F126/F128)<br>3. Gelijkenis als risico (F50/F116/F131/F135/F136) |
| Riki | 6 | NO-GO; GO eigen gebruik met back-ups | 1. Groene CI onmogelijk: stapvolgorde + geen GPU-flag (F128)<br>2. Stil foute resultaten: mates (F109, R06→F108) en F111<br>3. Windows 93/93 en 11/11 zonder CI-artefact; Linux 91/93 |
| QA (Grok Bot) | 6 | NO-GO; GO eigen gebruik met back-ups | 1. Mates stil fout (F108/F109)<br>2. Topologie: gesplitste randen/revolve (F110/F111)<br>3. Options-façade + Linux/CI rood (F112/F93/F115) |

**Eindscore = strengste teamscore = 5/10.** NO-GO voor "klaar / SolidWorks-gelijk" en NO-GO voor publiceren of delen. Unaniem.

### 9.2 Voorwaardelijk GO voor eigen gebruik (Strati + Risk samengevoegd)

- Werk dat ertoe doet alleen in de **desktop-app (B-rep)**, niet in de browser/mesh. Controleer na **elke rebuild** dat de statusbalk **"Faceted 0/n"** toont (StatusBar.tsx:213).
- **Sla zelf op** met Ctrl+S en houd eigen versiekopieën; de .bak/.bak2 zijn het echte vangnet. **Vertrouw AutoRecover niet**: de optie staat aan maar er wordt niets weggeschreven (F112). Zet AutoRecover/Backup-opties uit of negeer ze.
- **Assemblies:** posities van componenten nameten; het "(-)"-voorvoegsel zegt niets (F108/F109). Geen conflicterende of overbepaalde mates gebruiken.
- **Fillets na boomwijzigingen** (feature vóór een fillet invoegen, revolve-maat wijzigen) visueel én met Mass Properties controleren (F110/F111).
- Tekeningen **niet als productiedocument** gebruiken (geen PDF/DXF, Ø-pick faalt op Linux, geen centermarks).
- **Niet verspreiden of publiceren** zolang de merk- en tekstpunten (F50/F116/F131/F132/F135/F136) niet opgelost zijn.

### 9.3 Strategisch advies (Strati)

- **Bevries UI-pariteit** (nieuwe SW-look, nieuwe menu's, nieuwe opties) **tot F108, F109 en F111 groen zijn.** Correctheid vóór breedte (F130: +7608 regels in 0.5.1 zonder één test op mate-richting of gesplitste randen).
- Maak de QA-tests **M1, M2, T2 en T3 standaard regressietests** en een harde gate in CI. Geen "groen" zonder link naar een echte Actions-run.

### 9.4 Juridisch risicosignaal (Risk)

- **Dezelfde workflow is prima** (functionele pariteit: werkwijze, gedrag, sneltoetsen). **Identieke teksten en visuals niet**: letterlijke statusbalk-prompts uit de SW-video's (F135), de Options-structuur 1-op-1 (375 sleutels/31 categorieën), "3D ContentCentral" (F131), SW-Density (F116), en het geheel van ribbon/boom/taakvenster/statusbalk.
- Meet "lijkt op SolidWorks" als *"een SW-gebruiker vindt alles meteen"*, niet als *"pixel- en woordgelijk"*. Zolang woordgelijkheid het doel is, blijft publiceren NO-GO.
- **Dit is een risicosignaal, geen juridisch advies.** Voor publicatie: laat het door een jurist (IE/merkenrecht) beoordelen.

### 9.5 Ernstcorrecties door het team (toegepast)

| F | Was | Nu | Door / reden |
|---|---|---|---|
| F108 | Major P1 | **Kritiek P0** | Strati; + Riki R06 (geen niet-convergentiesignaal) samengevoegd |
| F109 | Major P1 | **Kritiek P0** | alle vijf; stil fout, richtingsafhankelijk |
| F111 | Major P1 | **Kritiek P0** | alle vijf; stil half afgerond |
| F112 | Major P1 | **Kritiek P0** | Strati (Kritiek), Risk (AutoRecover-subset P0) |
| F115 | Major P1 | **Kritiek P0** | MT5 Developer (Kritiek), Risk (P0) |
| F116 | Minor P2 | **Major P1** | Webi/MT5/Risk |
| F117 | Minor P2 | **Major P2** | Strati; samengevoegd met F49 |
| F119 | Minor P2 | **Major P1** | Strati/Webi/MT5/Risk |
| F120 | Minor P2 | **Major P1** | Strati |
| F122 | Minor P3 | **Major P2** | Webi |
| F49 | Major Opgelost | **Major Deels** (heropend) | Strati/MT5; samengevoegd met F117 |
| F99 | Major Opgelost | **Major Deels** | Strati: geen e2e op indicator/STEP-waarschuwing |
| F105 | Major Opgelost | **Major Deels** | MT5: CI-B-rep-pass nooit groen gezien |
| F16/F21/F22 | Deels opgelost | **Niet geverifieerd** | Webi: geen SW-referentieshots |
| F94 | Major Deels | Major Deels (blijft) | Risk stelde Minor voor; strengste stem blijft |
| F110 | Major | Major (bewijs gecorrigeerd) | Webi/Riki: filletApplied:true, 109,55 mm³ onder scherp |

### 9.6 Bewijsfouten in het QA-rapport (gecorrigeerd) en teamclaims die QA weerlegt

- **Niet-bestaande shots**: parity verwees naar `r1–r3`, `m1–m5`, `c1–c5`, `c8-bom`. In `shots/` staan 17 bestanden en die namen niet. Vervangen door echte bewijzen (rib 10/10, multibody 14/14, configurations 25/25, shots/e34-bom.png, shots/c6-…).
- **"revolve-scripts groen"** was onjuist: er is geen revolve-script in de 93 (regression.log). Revolve zit alleen in doorhandle/pmsweep/assembly2. Pariteitsrij Revolve → deels.
- **F110**: niet "fillet weg" maar `filletApplied:true`, volume 109,55 mm³ onder scherp (verwacht ≈429) plus foutmelding. Nagerekend in logs/qa-strict-tests.log.
- **Smart Fasteners / Instant3D**: bestaan deels als **Auto Fasteners** (store.ts:461-465, src/core/assembly/fasteners) en **Drag Handles** (store.ts:829, tipTexts.ts:29). Rijen ontbreekt → deels.
- **"124 bevindingen"** in §12 was fout (JSON had 125). Nu: 137.
- **Weerlegd — 341 vs 342 (F112)**: QA hertelde met een exacte sleutelmatch: **342/375 inert**. `wc -l` toont 341 omdat de laatste regel geen newline heeft; een substring-zoek ziet "fm.tree" ten onrechte als gebruikt (via "fm.treeFilter"). 342 blijft.
- **Weerlegd — "patterns zonder e2e" (Riki)**: linear/circular pattern komt voor in 8 e2e-scripts (o.a. features 64/64). Rij blijft aanwezig.
- **Weerlegd — "Parent/child onbewezen" (Risk)**: e2e/gb.mjs:57-61 opent Parent/Child… en checkt de parent; gb 32/32 op Linux. Rij blijft aanwezig.
- **Bijgesteld — "geen mate-tests" (Strati N8)**: er zijn mate-unit-tests (assembly.test.ts:75/96, mates2.test.ts), maar geen enkele test op richting (M1), conflict (M2) of gesplitste randen (T2/T3). De bevinding blijft (F130).
- **Pariteit herberekend**: 62.1% → **58.9%** (26/21/10/5). Naar deels: Revolve, mate-typen, Undo/redo-200, Draft/undercut/thickness, Installer-associatie, Unit+e2e (6× −½). Naar deels vanuit ontbreekt: Smart Fasteners, Instant3D (2× +½). Netto (32+6,5−3+1)/62 = 36,5/62 = 58,9% — gelijk aan de teamschatting.

### 9.7 Nieuwe teambevindingen → F-nummers (ontdubbeld)

| Teampunt | F | Opmerking |
|---|---|---|
| Strati N4 / Risk R3 (geplakt Windows-log) | **F126** | QA nageteld: 94× exit=, r.94-96 |
| Strati N5 / Riki R08 (Fillet1 niet exact zonder GPU) | **F127** | oorzaak niet geverifieerd |
| Strati N6 / Riki R05 / Risk R4 (CI-stapvolgorde, geen SwiftShader) | **F128** | ci.yml:25/27, if-no-files-found: ignore |
| Strati N7 (docs/23:4, 124 vs 125) | **F129** |  |
| Strati N8 (breedte boven correctheid) | **F130** | bijgesteld: mate-unit-tests bestaan |
| Risk R6 (3D ContentCentral, prefs.ts:313) | **F131** |  |
| Riki R07 (merkencheck mist termen) | **F132** | 0 treffers in rename-trademarks.cjs |
| Riki (≈80 ingeslikte catches) | **F133** | QA: 84 |
| MT5D-08 (line-budget-caps) | **F134** |  |
| Risk R2 (22 prompts + frame-tags) | **F135** | QA: 22 return-strings |
| Risk R5 (neutral-comments-check) | **F136** |  |
| Webi/Risk (rebuildBudgetMs 45 000, mesh-CSG UI-thread) | **F137** | + F46 |
| Riki R06 (geen niet-convergentiesignaal) | **F108** | samengevoegd |
| MT5/Webi (WebGLRenderer zonder try/catch Viewport.tsx:129, generieke ErrorBoundary) | **F115** | samengevoegd; shots/self-test-electron.png |
| Webi (perf.softwareOpenGL inert) | **F112 / F115** | samengevoegd |

## 10. Geprioriteerde fixlijst voor Claude

### P0 — eerst, vóór elke nieuwe UI-functie

- **Mate-solver (F109, F108)**: simultane solver met DOF-telling over alle vrije componenten; beide kanten verplaatsbaar; (-)/(+)/geen prefix; rode fout bij conflict of niet-convergentie. M1/M2 als unit- én regressietest.
- **Gesplitste randen (F111)**: alle afstammelingen van een gesplitste rand afronden, of een zichtbare "Missing edge"-fout. T3 als test.
- **CI-waarheid (F128, F115)**: `--use-angle=swiftshader --enable-unsafe-swiftshader` in desktop-nohooks en self-test; WebGL-detectie met nette melding (Viewport.tsx:129); artefact verplicht; één groene Actions-run met link vóór elke "groen"-claim.
- **AutoRecover (F112-subset)**: echt naar schijf schrijven of de optie verbergen; inerte Options verbergen/grijs.
- **Gate (F130)**: M1, M2, T2, T3 als vaste regressietests; UI-pariteit bevroren tot F108/F109/F111 groen.

### P1 — GO-blokkers

- Drawing Ø35-pick op Linux echt groen (F10/F93); README/docs-claims corrigeren (F129).
- Skips tellen en tonen (F119); qa2+facenames in de B-rep-pass (F120); F105 in CI groen.
- Oorzaak "Fillet1 is exact" zonder GPU (F127).
- Merk/tekst: SW-Density → Density met migratie (F116); "3D ContentCentral" weg (F131); termen in rename-trademarks.cjs (F132); statusbalk-prompts in eigen woorden + frame-tags weg (F135); Weldments-beslissing (F50).
- Ruwe Windows-logs/artefacten i.p.v. samenvattingen (F126).
- Revolve-fillet na maatwijziging (F110); face names voor revolve/sweep/loft (F47).

### P2 — vóór een release

- Feature-reorder (F113); PDF/DXF/IGES (F114); centermarks/verborgen lijnen (F122).
- Rebuild-budget ≈5 s + CSG in worker (F137/F46/F125).
- Code-signing of expliciet "alleen eigen gebruik" (F117/F49).
- Ingeslikte catches (F133); neutral-comments-regex (F136); exact-indicator e2e (F99).
- Ontbrekende features Dome/Indent/Mounting Boss/Snap Hook/Lip-Groove (F121), Instant3D en Toolbox volledig.

P3/P4: zie §8 (line-budget F134, bundel F118, schetsrelaties F123, iconen F16/F21/F22 na referentieshots).

## 11. Wat QA niet kon doen

- GitHub Actions bekijken (repo niet toegankelijk voor de QA-connector) → geen bewijs van remote CI.
- De geïnstalleerde app op de laptop zelf draaien (zou userData op de laptop schrijven; alleen de bestaande packaged self-test gelezen).
- 12/12 desktop-claim niet apart gereproduceerd.
- T2/T3 niet op de desktop-B-rep-kernel getest (alleen mesh-kernel in vitest).
- Oorzaak van F127 (Fillet1 niet exact zonder GPU) niet onderzocht — door niemand in het team geverifieerd.
- Pixelgelijkheid met SOLIDWORKS (F16/F21/F22): geen referentieshots beschikbaar.

## 12. Bestanden

- MD: `/workspace/phlippo-cad/report-0.5.1/QA-rapport-0.5.1.md` (box) en `C:\Users\ianph\OneDrive\Bureaublad\Phlippo CAD\Claude\qa-rapporten\QA-rapport-0.5.1.md` (laptop)
- `findings.json` (137 bevindingen F01–F137, schema id/area/sev/old/title/status/prio/ev/repro/fix), `parity.json` (62 rijen, 58.9%)
- `team/` (5 teamoordelen), `team.json`
- `logs/` (typecheck, vitest, audit, builds, self-tests, regression, regression-brep, qa-strict-tests, prefs-unused, Windows-logs)
- `shots/` (17 bestanden)
- Vorige versie (vóór teamintegratie): `backup-pre-team/`
## Bijlage A. Linux-regressie per script (logs/regression.log)

```
smoke: exit=0 13s 13/13 checks passed
relations: exit=0 20s 14/14 checks passed
features: exit=0 93s 64/64 checks passed
full: exit=0 70s 68/68 checks passed
assembly: exit=0 27s 21/21 checks passed
drawing: exit=1 50s FAIL diameter Ø35 placed {"picked":false,"edit":null,"dims":[{"kind":"linear","value":80,"orientation":"h"}],"circlePt"
configurations: exit=0 27s 25/25 checks passed
rib: exit=0 15s 10/10 checks passed
endconditions: exit=0 49s 14/14 checks passed
multibody: exit=0 25s 14/14 checks passed
slot: exit=0 12s 9/9 checks passed
sheetmetal: exit=0 14s 14/14 checks passed
section: exit=0 10s 9/9 checks passed
sketchtools: exit=0 81s 13/13 checks passed
helix: exit=0 13s 5/5 checks passed
hem: exit=0 11s 9/9 checks passed
explode: exit=0 21s 18/18 checks passed
doorhandle: exit=0 44s 17/17 checks passed
ellipsetext: exit=0 11s 6/6 checks passed
componentpattern: exit=0 8s 6/6 checks passed
uptobody: exit=0 6s 4/4 checks passed
jogmiter: exit=0 12s 7/7 checks passed
sketch3d: exit=0 10s 9/9 checks passed
sketchpattern: exit=0 5s 2/2 checks passed
faceappearance: exit=0 5s 2/2 checks passed
draftcheck: exit=0 10s 9/9 checks passed
editcomponent: exit=0 6s 2/2 checks passed
arcslot: exit=0 8s 4/4 checks passed
sketchtools2: exit=0 12s 4/4 checks passed
surfaces: exit=0 10s 7/7 checks passed
annotations: exit=0 14s 3/3 checks passed
annotations2: exit=0 9s 4/4 checks passed
annotations3: exit=0 10s 3/3 checks passed
viewlayout: exit=0 16s 16/16 checks passed
corners: exit=0 9s 4/4 checks passed
unfoldfold: exit=0 7s 5/5 checks passed
wrap: exit=0 8s 4/4 checks passed
motion: exit=0 10s 5/5 checks passed
thickness: exit=0 9s 2/2 checks passed
dragHandles: exit=0 5s 3/3 checks passed
dimpm: exit=0 4s 3/3 checks passed
thread: exit=0 14s 2/2 checks passed
confirmdelete: exit=0 11s 11/11 checks passed
deletekey: exit=0 20s 8/8 checks passed
deletekey2: exit=0 19s 13/13 checks passed
rect3: exit=0 8s 8/8 checks passed
sketchcurves: exit=0 19s 13/13 checks passed
features2: exit=0 27s 15/15 checks passed
sheetmetal2: exit=0 14s 7/7 checks passed
evalrender2: exit=0 12s 10/10 checks passed
assembly2: exit=0 36s 15/15 checks passed
drawing2: exit=0 19s 13/13 checks passed
misc7: exit=0 22s 8/8 checks passed
filletopts: exit=0 22s 16/16 checks passed
drawingfix: exit=0 20s 16/16 checks passed
drawopts: exit=0 37s 21/21 checks passed
keys: exit=0 63s 7/7 checks passed
asmoptions: exit=0 10s 18/18 passed
sectionopts: exit=0 7s 5/5 passed
dwgopts: exit=0 11s 13/13 passed
dialogopts: exit=0 18s 15/15 passed
motion2: exit=0 13s 9/9 passed
triad: exit=0 12s 5/5 passed
blockf: exit=0 6s 6/6 passed
fixes1: exit=0 6s 6/6 checks passed
asmcut: exit=0 16s 3/3 checks passed
qa1: exit=0 44s 26/26 passed
qa2: exit=0 14s 18/18 passed
qa3: exit=0 19s 30/30 passed
qa4: exit=0 16s 14/14 passed
leak: exit=0 14s 3/3 checks passed
ga1: exit=0 13s 19/19 passed
ga2: exit=0 13s 16/16 passed
gb: exit=0 13s 32/32 passed
gd: exit=0 16s 23/23 passed
ge: exit=0 38s 59/59 passed
gf: exit=0 11s 28/28 passed
gg: exit=0 9s 22/22 passed
gh: exit=0 17s 29/29 passed
gi: exit=0 11s 29/29 passed
gj: exit=0 23s 37/37 passed
step: exit=0 6s 11/11 checks passed
brep: exit=0 19s 9/9 checks passed
bodies: exit=0 9s 7/7 checks passed
pmsweep: exit=0 60s 54/54 checks passed
inventory47: exit=0 18s 18/18 checks passed
rebuildworker: exit=1 155s FAIL the window kept drawing frames during the rebuild (no gap over 250 ms) {"gap":933.3480000000054,"frames":467
facenames: exit=0 5s 10/10 checks passed
appearance2: exit=0 5s 8/8 checks passed
loftface: exit=0 9s 7/7 checks passed
videos56: exit=0 12s 18/18 checks passed
videos46: exit=0 45s 25/25 checks passed
videos54: exit=0 15s 18/18 checks passed
DONE 91/93 green — failed: drawing rebuildworker
```

## Bijlage B. B-rep-pass (logs/regression-brep.log)

```
features: exit=0 93s 64/64 checks passed
features2: exit=0 26s 15/15 checks passed
filletopts: exit=0 21s 16/16 checks passed
endconditions: exit=0 49s 14/14 checks passed
multibody: exit=0 25s 14/14 checks passed
full: exit=0 68s 68/68 checks passed
doorhandle: exit=0 45s 17/17 checks passed
step: exit=0 6s 11/11 checks passed
bodies: exit=0 9s 7/7 checks passed
DONE 9/9 green
```
