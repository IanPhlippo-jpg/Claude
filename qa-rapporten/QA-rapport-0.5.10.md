# QA-rapport Phlippo CAD 0.5.10 — strikte eindcontrole tegen SOLIDWORKS

*Opgesteld op 2 november 2026 (Europe/Brussels); bijgewerkt na de teamronde (5 reviews, team/), 2 november 2026 ca. 16:00 CET. De strengste score en de strengste ernst per bevinding winnen. Alle cijfers komen uit runs op de QA-box (Linux, xvfb + SwiftShader) of uit bestanden in deze map. Niets is overgenomen zonder controle; zelfgerapporteerde Windows-cijfers staan apart.*

## 0. Versie en scope

| | |
|---|---|
| Versie | **0.5.10**, HEAD `a4b1e92` ("TASKS: 0.5.10 uitgebracht", 30-10-2026 22:51 CET), branch `claude/fase1-schetser` |
| Vorige QA | 0.5.1 (`46fc2f3`), score 5/10 na teamronde, pariteit 58,9 % |
| Delta | 21 commits (0.5.2 → 0.5.10) in 3 dagen; 222 gewijzigde bestanden, waarvan 146 in src/electron/e2e/tools (+5375 / −942 regels); de rest is vooral `graphify-out/` (64 MB, F142) |
| Testomgeving | Box-kloon `/workspace/phlippo-cad/app-0.5.10`, Node + Playwright-Chromium (SwiftShader), Electron onder xvfb; Windows-laptop alleen gelezen |
| Bewijs | `logs/` (alle runs), `shots/` (34 headless-screenshots uit de 0.5.10-regressie), `win/` (Windows-logs van de laptop, zelfrapportage), `tools/` (QA-scripts en eigen tests `tools/qa-src/*.test.ts`) |

## 1. Oordeel (executive summary)

**Is het klaar? Nee.** 0.5.10 is wel een duidelijke stap vooruit: de mate-solver werkt nu echt (M1, M3 en M5 correct), conflicten worden gedetecteerd, de fillet op een revolve-rand na een maatwijziging klopt (T2), de Options-dialoog liegt niet meer (inerte opties grijs), het programma start netjes zonder GPU, en er zijn reorder, PDF/DXF-export, auto-centermarks/verborgen lijnen (alleen unit-getest) en de plastics-features bijgekomen. Pariteit stijgt van 58,9 % naar **66,1 %** (streng, na teamronde; QA-eerste telling 70,2 %). Dat is een bovengrens: geen enkele rij is naast echte SOLIDWORKS-beelden gelegd (Webi).

Toch blijft het **NO-GO** voor "klaar" of publiceren. Na de teamronde staan er **9 Kritieke** bevindingen open (F31, F50, F51, F54, F93, F105, F111, F139, F140). De drie hoofdredenen:

1. **Stil foute geometrie in de release-standaard.** Op de B-rep-kernel (standaard in de release) rondt een fillet op een gesplitste rand een extra rand van 10 mm af (T3: precies 8,584 mm³ = 10 mm · R²·(1−π/4) bij R = 2 te veel weggenomen), zonder waarschuwing (**F140, Kritiek**). Er is geen kruiscontrole tussen exact en mesh die dit zou vangen (F159). Op de mesh-kernel (terugval, preview, plastics, e2e-build) voegt een fillet op een gatrand volume toe in plaats van het weg te nemen, bij Ø35 zonder enige waarschuwing (**F139, nu Kritiek**). Beide fouten vallen door de 454 unit-tests en de hele e2e-regressie heen; de QA-tests die ze vinden staan niet in de repo (F152).
2. **"98/98 groen" klopt niet op Linux.** Lokaal is het 93/98. Na herhaling blijven drawing (Ø35 niet gepakt, sinds 0.5.1), inventory47 en videos46 reproduceerbaar rood. De CI-job die exact deze run doet is dus vrijwel zeker rood (F54, F144), en omdat mesh, B-rep en worker in één bash -e-stap staan, draaien de B-rep- en workerpass in CI dan nooit (F147). Het enige 98/98-log van Windows heet `regression-0.5.9.txt`, is gestart 45 min vóór de versie-commit en draaide op een niet-gecommitte werkboom (het bevat round2.mjs, dat pas in a3bfaf7 kwam); `regression-round2b.log` is daar een letterlijke kopie van (F148).
3. **De claims zijn weer niet eerlijk genoeg.** 98/98 staat zonder platform in commit en TASKS; "release 0.5.10 geïnstalleerd (19/19)" (TASKS.md:814) heeft geen log; het build-log meldt "signing with signtool.exe" terwijl alle binaries NotSigned zijn (F149, F150). De README-status stopt bij 0.5.4. (De bundel-claim 827 kB is een verouderde 0.5.2-claim, geen 0.5.10-claim; de bundel is weer gegroeid naar 849 kB, F118.)

**Lijkt het echt op SOLIDWORKS?** Visueel: ja, opvallend. CommandManager, FeatureManager-boom, statusbalk, heads-up-toolbar, studio-look met schaduw en de assemblage-/tekening-weergaven liggen heel dicht bij het origineel (shots/walk-18-done.png, shots/deurkruk-assembly.png). Functioneel: alleen voor de basis. Schetsen, extrude/revolve, fillet, assemblage en tekening werken. Maar de kern die SOLIDWORKS betrouwbaar maakt, namelijk exacte geometrie die na wijzigingen stabiel blijft, is nog niet robuust. Daarnaast ontbreken IGES/DWG/Parasolid, design tables en een Toolbox. En 334 van de 379 opties doen niets. In Two/Four View worden de extra vensters zwarte silhouetten (F157, shots/m7-fourview.png).

**Eindscore na teamronde: 5/10** (QA-eerste oordeel 6/10; Strati, Riki, Webi en MT5 Dev 5/10, Risk 6/10; de strengste wint). 0.5.1: 5/10. **GO/NO-GO: NO-GO** voor "klaar" en publiceren (unaniem); **voorwaardelijk GO** voor eigen concept- en hobbywerk (unaniem, voorwaarden in §7.3 en §10).

## 2. Delta sinds 0.5.1

| Release | Wat volgens de commits | QA-bevinding |
|---|---|---|
| 0.5.2 | F109 solver, F108 DOF/conflict, F111 split-edge-fillet, F110 revolve-fillet, F112 inerte opties grijs + AutoRecover naar schijf, F113 reorder, F114 DXF/PDF, F116, F118 bundle 919→827 kB, F119–F123, F125, F131/F132 | Solver, conflict, T2, F112-eerlijkheid, reorder en DXF/PDF kloppen. **F111 alleen op mesh** (B-rep fout, F140). Bundel sindsdien weer gegroeid (827 → 849 kB, F118). |
| 0.5.3 | Concentric-conflict (F108) | Klopt (M5) |
| 0.5.4 | Software-GL (F115/F128), plastics (F121), statusprompts herschreven (F135/F136), F129, F133, F134 | Software-GL en self-test zonder GPU kloppen; multi-view onbeveiligd (F143); plastics alleen mesh |
| 0.5.5 | Plastics-preview | Gezien in shots/plastics-part.png |
| 0.5.6–0.5.9 | Look-kalibratie (studio-look, AO, vlakken, 1:1 tegen SW-frames, docs/26) | Visueel sterk, niet pixel-geverifieerd naast SOLIDWORKS (F16/F21/F22) |
| 0.5.10 | Testronde (docs/27); commit a3bfaf7 en TASKS.md:810: "unit 454, regressie 98/98, B-rep 12/12, worker 6/6" | Unit 454/454 klopt; e2e-claims kloppen niet op Linux |

## 3. Testresultaten (box, echte cijfers)

| Test | Resultaat | Bewijs |
|---|---|---|
| `npm ci` | OK | logs/npm-ci.log |
| Typecheck | EXIT 0 | logs/typecheck.log |
| Unit (vitest) | **454/454** in 117 bestanden | logs/vitest.log |
| CI-checks (merken, neutraal, regelbudget) | 3× EXIT 0 | logs/ci-checks.log |
| npm audit | 17 (15 moderate, 2 high, allemaal build-keten); `--omit=dev`: 0 | logs/audit.log, logs/audit-prod.log |
| Release-build | index 849,37 kB (gzip 233,87) | logs/build-release.log |
| Self-test Electron zonder GPU | **8/8**: B-rep exact, Fillet1 44742,52, STEP exact, worker 1143/1143, save + .bak | logs/self-test-nogpu.json |
| Self-test met SwiftShader | **8/8** | logs/self-test-softgl.json |
| desktop-nohooks (PHLIPPO_SOFTWARE_GL=1) | **10/10** | logs/desktop-nohooks-softgl.log |
| e2e-regressie standaard (mesh) | **93/98**: features, drawing, inventory47, rebuildworker, videos46 rood | logs/regression.log |
| Herhaling van de 5 rode scripts | features 65/65 en rebuildworker 10/10 groen; **drawing, inventory47, videos46 weer rood** → effectief 95/98 | logs/regression-rerun.log |
| e2e B-rep-pass | **11/12** (features TimeoutError); herhaling features 65/65 | logs/regression-brep.log, logs/regression-rerun-brep.log |
| e2e worker-pass | **5/6** (features TimeoutError) | logs/regression-worker.log |
| Repo schoon na tests | ja; de QA-map `src/qa/` is na de run uit de box-kloon verwijderd (git status schoon). De QA-tests staan dus niet in de repo (F152) | logs/git-status-after.log |
| Windows (zelfrapportage) | 98/98 (log heet 0.5.9, draaide op de niet-gecommitte 0.5.10-werkboom) + 12/12 + 6/6; round2b r.1-99 is een kopie van het 0.5.9-log (F148); NSIS + portable gebouwd, alle NotSigned | win/regression-0.5.9.txt, win/regression-round2b.log, win/desktop-build.log, win/signature-0.5.10.txt |

### 3.1 Eigen strikte QA-tests (bronnen in tools/qa-src/)

| Test | Wat | Mesh | B-rep |
|---|---|---|---|
| T1 | Fillet R2 op gatrand, daarna gat Ø35→Ø50 | **FOUT**: verlies −4,6 mm³ (verwacht +137,2), alleen waarschuwing "not closed ≈18,5 mm²"; Ø35 direct −34,8 zonder waarschuwing (F139) | Exact: 96,8 / 137,2 |
| T2 | Fillet op revolve-rand na maatwijziging | OK (432,68 vs 428,74) | Exact |
| T3 | Fillet op een rand die later gesplitst wordt | OK (30439,07 vs 30439,91) | **FOUT**: 30431,33, extra rand van 10 mm afgerond (F140) |
| M1 | Mate-keten, beide ref-volgordes | B=25 in beide | – |
| M2 | Conflicterende mates | Conflict gedetecteerd; de oudere mate gemarkeerd (F141) | – |
| M3 | Keten van 4, slechtste volgorde | OK | – |
| M4 | Onderbepaald | OK | – |
| M5 | Gesloten lus + concentric-conflict | OK, conflict gedetecteerd | – |
| E1 | Circulaire vergelijking | Gemeld | – |

Bewijs: logs/qa-strict-tests.log (9 tests, 1 rood: T1), logs/qa-brep-tests.log, logs/qa-diag.log. Let op (F169, MT5 Dev): de regels T2diag in qa-diag.log tonen een foute theoriewaarde (335,79 / 408,60) door een formulefout in de testbron; de juiste theorie is 355,93 / 428,74 (bron in tools/qa-src gecorrigeerd, log niet opnieuw gedraaid). Het T2-oordeel hierboven gebruikte al de juiste waarde.

## 4. Claimcontrole

| Claim (bron) | Oordeel | Bewijs |
|---|---|---|
| Unit 454 (TASKS.md:810) | **Waar** | logs/vitest.log 454/454 |
| Regressie 98/98 (TASKS.md:810, commit a3bfaf7) | **Onwaar op Linux** (93/98, na herhaling 95/98). Windows: het log heet 0.5.9 en draaide op de niet-gecommitte 0.5.10-werkboom (bevat round2.mjs); gelijkheid met de release niet geverifieerd. Claim noemt geen platform (F149) | logs/regression.log, logs/regression-rerun.log, win/regression-0.5.9.txt |
| Release 0.5.10 geïnstalleerd 19/19 (TASKS.md:814; TASKS.md:807 deed hetzelfde voor 0.5.9) | **Onbewezen**: geen log (correctie: eerder stond hier ten onrechte "niet voor 0.5.10 geclaimd") | – |
| B-rep 12/12, worker 6/6 | **Deels**: 11/12 en 5/6 lokaal, features groen bij herhaling (flaky) | logs/regression-brep.log, logs/regression-worker.log |
| F109 solver opgelost | **Waar** | QA M1/M3/M5 |
| F108 DOF/conflict | **Waar**, met kanttekening (oudere mate gemarkeerd, F141) | QA M2/M5 |
| F110 revolve-fillet | **Waar** | QA T2 |
| F111 split-edge-fillet opgelost | **Half waar**: mesh ja, B-rep (release-standaard) fout | QA T3 B-rep, F140 |
| F112 inerte opties grijs, AutoRecover naar schijf | **Waar** (334/379 grijs; autoRecover.ts schrijft), maar herstel niet e2e-getest | options.tsx:78-81, logs/prefs-unused.txt |
| F113 reorder | **Waar** | e2e/reorder.mjs:52-69 dragTo, 10/10 |
| F114 DXF/PDF | **Waar** (IGES/DWG/Parasolid nog niet) | sheetexport 12/12 |
| F115 zonder GPU nette afhandeling | **Grotendeels waar** (hoofdviewport, self-test); ViewPane onbeveiligd | glSetup.ts:11-17, ViewPane.tsx:20 |
| F118 bundle 919→827 kB (TASKS.md:763, 0.5.2) | **Verouderd** (claim hoort bij 0.5.2; of 827 kB toen klopte: niet zelf geverifieerd, Strati mat 826,66 kB op 46a1bd9). Nu 849,37 kB: weer gegroeid zonder budget | logs/build-release.log:50 |
| F10 Ø35 (impliciet "alles groen") | **Onwaar**: nog altijd rood op Linux | logs/regression-rerun.log |
| "CI groen" | **Wordt niet geclaimd** (correctie): README.md:55-56 zegt zelf dat de Actions-uitslag niet leesbaar is. Wél geclaimd: "De CI draait de desktopchecks en een B-rep-pass" (README.md:90): **onbewezen**, en bij een rode mesh-pass feitelijk onwaar (F147) | ci.yml:38-46; geen Actions-run; lokaal 3 reproduceerbaar rode scripts |
| F50 handelsmerkvrij | **Deels**: "Weldments" zichtbaar als tab (29× in src, 0× in de merkcheck), "Sustainability Extras" | shots/walk-18-done.png, materials.ts:124/140 |
| Signing (build-log "signing with signtool.exe") | **Onwaar**: alle vier 0.5.10-binaries NotSigned (F150) | win/desktop-build.log:67-74, win/signature-0.5.10.txt |

### 4.1 De 9 kritieke punten uit 0.5.1 en M1/M2/T2/T3

| ID | 0.5.1 | 0.5.10 (QA → na teamronde) |
|---|---|---|
| F31 CI/exitcodes | Kritiek | Deels opgelost; QA Major → **Kritiek** (Strati, Webi, MT5 Dev; CI kan B-rep/worker niet draaien, F147) |
| F50 Handelsmerken | Kritiek | Deels opgelost; QA Major → **Kritiek** (Strati; blokkeert publiceren) |
| F51 Mesh-kernel primair | Kritiek | Deels opgelost, **blijft Kritiek** (unaniem; mesh-fout F139) |
| F93 Claims kloppen niet | Kritiek | Deels opgelost, **blijft Kritiek** (unaniem; 98/98, 19/19, signing) |
| F108 Mate-conflict | Kritiek | **Opgelost** |
| F109 Mate-solver | Kritiek | **Opgelost** |
| F111 Split-edge-fillet | Kritiek | Deels; QA Major → **Kritiek** (Strati, MT5 Dev); B-rep-deel ook als **F140 Kritiek** |
| F112 Options-façade | Kritiek | Deels → **Major** (unaniem aanvaard; eerlijk, maar 88 % inert) |
| F115 Zonder WebGL | Kritiek | Deels → **Major** (unaniem aanvaard; F143 resteert) |
| M1 / M2 | kapot / ontbreekt | OK / OK met F141 |
| T2 / T3 | kapot | OK / mesh OK, B-rep fout |


## 5. Pariteitsmatrix (62 rijen)

Weging: aanwezig = 1, deels = ½, ontbreekt/kapot = 0. **Pariteit: 66,1 %** (0.5.1: 58,9 %). Telling: 26 aanwezig, 30 deels, 4 ontbreekt, 2 kapot. Na de teamronde strenger gezet (QA-eerste telling: 70,2 %); afwijkingen staan vet met 'Teamronde:' in het bewijs. Ook dit is een bovengrens: geen rij is naast echte SOLIDWORKS-beelden gelegd. Elke 'aanwezig' verwijst naar een log, een shot of een code-regel. Alle genoemde logs/ en shots/ bestaan in deze map. Geen enkele rij is ingeschat zonder bewijs.

| # | Gebied | Item | 0.5.1 | 0.5.10 | Bewijs |
|---|---|---|---|---|---|
| 1 | Sketcher | Lijn/rechthoek/cirkel/boog/spline/ellips/sleuf/polygoon/tekst | aanwezig | aanwezig | model.ts add*; smoke 13/13, slot 9/9, sketchcurves 13/13, ellipsetext 6/6 (logs/regression.log); shots/walk-12-dimensioned.png |
| 2 | Sketcher | Relaties (16 soorten) + glyphs, blauw/zwart-status | aanwezig | aanwezig | solver.ts; relations 14/14 (logs/regression.log); shots/gj1-relations.png |
| 3 | Sketcher | Intersection/Merge/Equal curvature/AlongXYZ | ontbreekt | **deels** | Intersection/Merge/Equal Curvature: equations.ts:307-323 + relations2.test.ts (AlongXYZ = 3D-schets, rij 5) — Teamronde: deels (Strati, Riki, Risk, Webi): AlongXYZ komt 0× voor in src; bewijs alleen code + unit-test (relations2.test.ts) |
| 4 | Sketcher | Over-/conflict-detectie (redundant/conflicting/driven) | aanwezig | aanwezig | solver.test.ts over/conflict in vitest 454/454 (logs/vitest.log) |
| 5 | Sketcher | Trim/Extend/Offset/Mirror/Convert/patterns | aanwezig | aanwezig | sketchtools 13/13, sketchtools2 4/4 (logs/regression.log) |
| 6 | Sketcher | 3D-schets met maten/relaties | deels | deels | docs/24: geen 3D-maten (F124) |
| 7 | Sketcher | Instant2D / Magnified Selection | ontbreekt | ontbreekt | docs/24 |
| 8 | Features | Extrude boss/cut + alle eindcondities, draft, thin, 2 richtingen | aanwezig | aanwezig | endconditions 15/15 mesh én B-rep (logs/regression.log, logs/regression-brep.log); features 65/65 bij herhaling (logs/regression-rerun.log); shots/walk-15-extruded.png |
| 9 | Features | Revolve | deels | **aanwezig** | Revolve-fillet na maatwijziging OK: QA T2 mesh+B-rep (logs/qa-strict-tests.log, logs/qa-brep-tests.log) |
| 10 | Features | Sweep / Loft (loft B-rep alleen 2 profielen) | deels | deels | Sweep/Loft aanwezig (shots/e18-sweep.png, pmsweep 54/54, loftface 7/7 in logs/regression.log); B-rep-loft nog 2 profielen; Sweep1 faalde 1× in features (F145) |
| 11 | Features | Fillet/Chamfer (const, variabel, face, full round) | deels | **kapot** | T2 OK, maar mesh-fillet op gatrand fout (F139) en B-rep T3 te veel afgerond (F140) — Teamronde: kapot (MT5 Dev): stil fout volume op beide kernels (F139 mesh, F140 B-rep); stil fout resultaat ⇒ kapot |
| 12 | Features | Shell/Draft/Rib | aanwezig | aanwezig | rib 10/10 (logs/regression.log); shots/e16-shell.png |
| 13 | Features | Hole Tool (simple/cbore/csk/tap) + Advanced Hole + Thread | aanwezig | aanwezig | Hole Tool: shots/e12-hole-preview.png; gj 37/37 incl. ANSI-gat (logs/regression.log) |
| 14 | Features | Patterns (linear/circular/curve/sketch/fill/table/variable) + Mirror | aanwezig | aanwezig | features 65/65 (logs/regression-rerun.log), componentpattern 6/6, sketchpattern 2/2 (logs/regression.log) |
| 15 | Features | Wrap/Deform/Flex/Freeform | deels | deels | wrap 4/4, gj (deform) 37/37 (logs/regression.log); mesh-terugval, Faceted |
| 16 | Features | Dome/Indent/Mounting Boss/Snap Hook/Lip-Groove | ontbreekt | **deels** | Aanwezig (plastics.ts, 12 unit-tests, e2e plastics) maar alleen mesh-kernel, vereenvoudigd (F121) |
| 17 | Features | Instant3D (drag-handles op model) | deels | deels | Drag Handles (hernoemd van Instant3D): alleen diepte van blind extrude (store.ts:828-839); geen e2e of unit-test gevonden |
| 18 | Features | Surfaces (extrude/revolve/loft/knit/trim/thicken) | deels | deels | surfaces 7/7, gd 23/23 (logs/regression.log); mesh-terugval |
| 19 | Features | Sheet metal (base/edge flange/hem/bend/flat pattern) | deels | deels | sheetmetal 14/14, sheetmetal2 7/7, ge 59/59 (logs/regression.log); shots/ge14-sweptflange.png; geen virtual sharp |
| 20 | Features | Weldments (structural member, trim) | deels | deels | gh 29/29 (logs/regression.log), shots/gh6-frame.png; naam "Weldments" (F50) |
| 21 | Features | Multibody (combine/split/move-copy/scope) | aanwezig | aanwezig | multibody 14/14 mesh én B-rep (logs/regression.log, logs/regression-brep.log); shots/m5-combined.png |
| 22 | FeatureManager | Boom met history/sensors/annotations/materials/planes | aanwezig | aanwezig | shots/walk-18-done.png (History, Sensors, Annotations, Solid Bodies, Material, vlakken, Origin) |
| 23 | FeatureManager | Rollback-bar | aanwezig | aanwezig | FeatureTreeBody.tsx rollback; full 68/68 en relations 14/14 (logs/regression.log) |
| 24 | FeatureManager | Suppress/unsuppress, edit feature/sketch | aanwezig | aanwezig | features 65/65 (logs/regression-rerun.log), qa1 26/26 (logs/regression.log) |
| 25 | FeatureManager | Reorder (slepen) | ontbreekt | **aanwezig** | e2e/reorder.mjs sleept met dragTo, reorder 10/10 (logs/regression.log:94); FeatureTreeBody.tsx:213 + reorder.test.ts. Teamronde: blijft aanwezig (e2e-bewijs, niet alleen code) |
| 26 | FeatureManager | Parent/child-weergave | aanwezig | aanwezig | gb 32/32 (logs/regression.log); shots/gb-parentchild.png |
| 27 | FeatureManager | Undo/redo (200 stappen) | deels | deels | history.ts:5 limit=200; undo in e2e gebruikt, maar 200 stappen nergens getest [Risk] |
| 28 | Topologie | Randreferenties overleven maatwijziging (extrude) | aanwezig | **deels** | Mesh: maat Ø35→Ø50 rand gevonden maar fillet-volume fout (F139); B-rep correct |
| 29 | Topologie | Gesplitste randen / revolve / sweep / loft | kapot | **deels** | T2/T3 mesh OK; T3 B-rep (release-standaard) rondt extra rand af (F140) |
| 30 | Kernel | Exacte B-rep (OCCT) op desktop | aanwezig | **deels** | self-test 8/8: B-rep exact, Fillet1 exact 44742,52, STEP exact (logs/self-test-nogpu.json); B-rep-pass 11/12, features groen bij herhaling (logs/regression-brep.log, logs/regression-rerun-brep.log) — Teamronde: deels (Strati, Risk, MT5 Dev): de exacte kernel geeft stil een fout volume (F140, Kritiek) op precies dit pad |
| 31 | Kernel | Exacte B-rep in browser / voor alle features | deels | deels | Plastics alleen mesh (F51/F121); mesh-terugval/preview/worker fout bij gatrand-fillet (F139). Correctie teamronde: de shot "Faceted 1/1" (shots/walk-18-done.png) komt uit de e2e-build (TEST_HOOKS → mesh); een gewone browserbuild zet B-rep aan (brepRefine.ts:37); of de OCCT-worker in de browserrelease draait: niet geverifieerd |
| 32 | Assembly | Insert component / patterns / configuraties per instantie | aanwezig | aanwezig | assembly 21/21, assembly2 15/15, configurations 25/25 (logs/regression.log); shots/deurkruk-assembly.png |
| 33 | Assembly | Standaard + geavanceerde + mechanische mates (typen) | deels | deels | Typen aanwezig (types.ts) en solver nu correct voor M1/M3/M5 (logs/qa-strict-tests.log); mechanische mates (cam/hinge/screw/rack-pinion/linear coupler) nog zonder gedragstests |
| 34 | Assembly | Mate-solver (simultaan, beide kanten) | kapot | **aanwezig** | QA M1 beide volgordes, M3 keten-4, M5 gesloten lus correct (logs/qa-strict-tests.log) |
| 35 | Assembly | Over-/onderbepaald (+)/(-), mate-fouten | ontbreekt | **deels** | Conflict gedetecteerd (M2, M5) met under/over-status, maar de verkeerde (oudere) mate gemarkeerd (F141) |
| 36 | Assembly | Interference detection / exploded view | aanwezig | aanwezig | explode 18/18, asmcut 3/3 (logs/regression.log); shots/deurkruk-exploded.png |
| 37 | Assembly | Smart Fasteners / Toolbox | deels | deels | Auto Fasteners (store.ts:461); geen Toolbox-bibliotheek |
| 38 | Tekeningen | Standaard/projected/section/detail/aux/broken/crop | aanwezig | aanwezig | drawing2 13/13, section 9/9, drawingfix 16/16, viewlayout 16/16 (logs/regression.log); shots/drawfix-three.png, shots/deurkruk-tekening.png |
| 39 | Tekeningen | Maten plaatsen (Smart Dimension op tekening) | deels | deels | Linux: Ø35 niet gepakt in beide runs (logs/regression.log, logs/regression-rerun.log; F10) |
| 40 | Tekeningen | BOM/hole table/revisietabel/balloons/GD&T | aanwezig | aanwezig | drawingfix 16/16, drawopts 21/21, annotations 3/3+4/4+3/3 (logs/regression.log); shots/drawfix-tables.png |
| 41 | Tekeningen | Auto centermarks / verborgen lijnen | ontbreekt | **deels** | core/drawing/autoMarks.ts + hlr.ts met unit-tests — Teamronde: deels (Strati, Risk, Webi): alleen unit-tests (autoMarks.test.ts, hlr.test.ts); geen verborgen lijnen in de shots; centermarks ontbreken in Detail B (shots/deurkruk-tekening.png) |
| 42 | Tekeningen | PDF/DXF/DWG export | ontbreekt | **deels** | PDF/DXF: sheetExport.ts, export2d.test.ts, e2e/sheetexport.mjs; DWG ontbreekt |
| 43 | Configuraties | ConfigurationManager, per-config waarden/suppress | aanwezig | aanwezig | configurations 25/25 (logs/regression.log) |
| 44 | Configuraties | Design tables (Excel) | ontbreekt | ontbreekt | rg "design table" = alleen tree-filterlabel |
| 45 | Configuraties | Equations/global variables/circulair | aanwezig | aanwezig | shots/e22-equations-applied.png; QA E1 circulair gemeld (logs/qa-strict-tests.log) |
| 46 | Evaluate | Measure / Mass Properties / Section Properties | aanwezig | aanwezig | shots/e19-mass-properties.png, shots/e20-measure.png |
| 47 | Evaluate | Draft/undercut/thickness analysis | deels | deels | draftcheck 9/9, thickness 2/2 (logs/regression.log); geen numerieke assert op undercut/thickness |
| 48 | Import/Export | Native .kcad (atomair + .bak) | aanwezig | aanwezig | self-test: "Save writes the .kcad atomically and keeps a .bak" (logs/self-test-nogpu.json) |
| 49 | Import/Export | STEP AP214 in/uit (exact) | aanwezig | aanwezig | self-test STEP exact (logs/self-test-nogpu.json); step 11/11 mesh én B-rep (logs/regression.log, logs/regression-brep.log); shots/step-imported.png |
| 50 | Import/Export | STL/3MF/AMF | aanwezig | aanwezig | MenuBar.tsx:149-153 STL, MenuBar.tsx:278 "Save As ▸ 3MF"; gb (exportopties) 32/32 (logs/regression.log) |
| 51 | Import/Export | IGES / DXF / DWG / Parasolid | ontbreekt | ontbreekt | IGES/DWG/Parasolid ontbreken nog (DXF alleen 2D-tekening, rij 41) |
| 52 | UI/UX | CommandManager/tabs/heads-up toolbar/taakvenster/statusbalk | aanwezig | **deels** | shots/walk-18-done.png, shots/deurkruk-assembly.png, shots/walk-02-front-plane-rmb.png; maar context-toolbar faalt op Linux (F144) — Teamronde: deels (Riki, Risk): context-toolbar reproduceerbaar rood (inventory47, videos46; logs/regression-rerun.log, F144) |
| 53 | UI/UX | Options-dialoog werkend | kapot | **deels** | Eerlijk: 334/379 grijs "Not available"; maar slechts 45 werken (F112) |
| 54 | UI/UX | Iconen/lettertype pixelgelijk | deels | deels | Niet naast SOLIDWORKS geverifieerd (F16/F21/F22) |
| 55 | UI/UX | Handelsmerk-vrij | deels | deels | Alleen "Weldments" resteert (F50); e2e-comments noemen SOLIDWORKS (F136) |
| 56 | Performance | Rebuild-worker / UI vloeiend | deels | deels | Release: worker standaard; worker-pass 5/6 (features TimeoutError na 226 s; rebuildworker 10/10); budget 45 s (F137); rebuildworker 10/10 (2×), 1× TimeoutError |
| 57 | Robuustheid | Autosave + crash-herstel | deels | deels | AutoRecover schrijft nu echt (autoRecover.ts) + browser-autosave; herstel na crash niet end-to-end getest |
| 58 | Robuustheid | Zonder WebGL / zonder GPU | kapot | **deels** | Zonder GPU: self-test 8/8 (logs/self-test-nogpu.json), SwiftShader: self-test 8/8 + desktop-nohooks 10/10 (logs/self-test-softgl.json, logs/desktop-nohooks-softgl.log); multi-view ViewPane.tsx:20 onbeveiligd (F143) |
| 59 | Installer | NSIS + portable, .kcad-associatie | deels | deels | NSIS + portable gebouwd (win/desktop-build.log); ongesigneerd |
| 60 | Installer | Code-signing | ontbreekt | ontbreekt | Get-AuthenticodeSignature: NotSigned |
| 61 | Testen/CI | Unit + e2e + B-rep + worker | deels | deels | vitest 454/454 (logs/vitest.log); Linux e2e 93/98 → 95/98 na herhaling (logs/regression.log, logs/regression-rerun.log); B-rep 11/12 → 12/12 na herhaling; worker 5/6; QA-eigen 1 van 9 rood + B-rep T3 fout (logs/qa-strict-tests.log, logs/qa-brep-tests.log) |
| 62 | Testen/CI | Groene CI op Linux bewezen | kapot | kapot | drawing, inventory47 en videos46 reproduceerbaar rood op Linux (logs/regression-rerun.log); geen Actions-run zichtbaar (F31/F54) |

## 6. Alle bevindingen

Totaal 170 bevindingen (F1–F170). **Open: 70** (9 Kritiek, 40 Major, 21 Minor); opgelost: 100. Nieuw in deze ronde: F138–F146 (QA) en F147–F170 (teamronde, ontdubbeld; aliassen in §7.4). Ernstcorrecties uit de teamronde: §7.2. Volledige data: findings.json. Het veld 'ev' begint met het 0.5.10-bewijs, gevolgd door de historie.

### 6.1 Overzicht open bevindingen

| Prio | ID | Ernst | Status | Gebied | Titel |
|---|---|---|---|---|---|
| P0 | F31 | Kritiek | Deels opgelost | Proces | e2e-exitcodes / CI / niet-gecommit werk |
| P0 | F54 | Kritiek | Open | Proces | CI rood op Linux; 'regressie groen' niet reproduceerbaar |
| P0 | F105 | Kritiek | Deels opgelost | Tests | B-rep-pad bijna nooit in regressie geoefend |
| P0 | F111 | Kritiek | Deels opgelost | Topologie | Fillet-rand die door een eerder ingevoegde feature gesplitst wordt: maar één deel afgerond, zonder waarschuwing |
| P0 | F139 | Kritiek | Nieuw | Kernel | Mesh-fillet op een gatrand voegt volume toe i.p.v. af te nemen (fout zonder foutmelding) |
| P0 | F140 | Kritiek | Nieuw | Topologie | B-rep (standaard in release): fillet op gesplitste rand rondt een extra rand van 10 mm af |
| P0 | F147 | Major | Nieuw | Testen/CI | CI: mesh-, B-rep- en worker-regressie in één run-stap met bash -e; B-rep en worker draaien nooit zolang mesh rood is |
| P0 | F159 | Major | Nieuw | Kernel | B-rep-resultaat vervangt het mesh-resultaat zonder volume-kruiscontrole; mesh-waarschuwingen van exacte bodies worden weggegooid |
| P0 | F167 | Major | Nieuw | Topologie | De voorgestelde fix voor F140 zit op de verkeerde laag; de oorzaak is niet bekend |
| P1 | F50 | Kritiek | Deels opgelost | Juridisch | SW-handelsmerken |
| P1 | F51 | Kritiek | Deels opgelost | Geometrie | Mesh-kernel |
| P1 | F93 | Kritiek | Deels opgelost | Proces | Docs/commits claimen 98/98 terwijl de Linux-regressie rood blijft |
| P1 | F10 | Major | Open | Tekening | Ø-maat en tekening herstellen na reload |
| P1 | F98 | Major | Deels opgelost | Proces | 42 commits niet gepusht / geen bewijs van remote CI-run |
| P1 | F119 | Major | Deels opgelost | Testinfra | Regressierunner verbergt skip()-regels: "groen" kan overgeslagen checks bevatten |
| P1 | F120 | Major | Deels opgelost | CI | CI-B-rep-pass draait 9 scripts, lokaal 11 (qa2, facenames ontbreken) |
| P1 | F143 | Major | Nieuw | Robuustheid | Multi-view (ViewPane) maakt een WebGLRenderer zonder try/catch: zonder WebGL crasht 2/4-view |
| P1 | F144 | Major | Nieuw | Testen/CI | inventory47 en videos46 reproduceerbaar rood op Linux (context-toolbar) |
| P1 | F145 | Major | Nieuw | Testen/CI | features-script niet-deterministisch: Sweep1 "path sketch has no lines" met volgfouten (oorzaak niet geverifieerd) |
| P1 | F148 | Major | Nieuw | Bewijs/claims | Windows-log round2b is een kopie van het 0.5.9-log; het 98/98-log draaide op een niet-gecommitte werkboom |
| P1 | F149 | Major | Nieuw | Bewijs/claims | Claims zonder platform of log: 98/98 zonder "Windows", "CI draait B-rep-pass", "0.5.10 geïnstalleerd (19/19)" |
| P1 | F152 | Major | Nieuw | Testen/CI | De strikte QA-tests (T1/T3/M1-M5) staan buiten de repo; geen gate vangt F139/F140 |
| P1 | F153 | Major | Nieuw | Dataverlies | AutoRecover heeft alleen de documentnaam als sleutel: documenten met dezelfde naam overschrijven en wissen elkaars kopie |
| P1 | F154 | Major | Nieuw | Dataverlies | Herstelde AutoRecover-kopie opent als "opgeslagen" (dirty:false), zonder fsync en zonder e2e-test |
| P1 | F155 | Major | Nieuw | Testen/CI | skip() telt als groen: ~120 optionele stappen kunnen overslaan zonder dat een run faalt |
| P1 | F158 | Major | Nieuw | Testen/CI | De release rebuildt in de worker, maar de regressie draait standaard op de UI-thread |
| P1 | F160 | Major | Nieuw | Testen/CI | Regressielog per pass overschreven: B-rep-bewijs verdwijnt uit het CI-artefact |
| P2 | F47 | Major | Deels opgelost | Geometrie | Topologische naamgeving |
| P2 | F48 | Major | Deels opgelost | Geometrie | CSG-resultaat ongecontroleerd / toleranties |
| P2 | F49 | Major | Open | Electron | Release-hardening (heropend; samengevoegd met F117) |
| P2 | F94 | Major | Deels opgelost | Juridisch | Pack and Go, Weldments en MBD Dimensions nog zichtbaar |
| P2 | F97 | Major | Deels opgelost | Electron | Packaged app:// + OCCT WASM niet smoke-getest op Windows |
| P2 | F112 | Major | Deels opgelost | UI/Options | Options-dialoog: 334 van 379 instellingen doen niets (nu eerlijk grijs) |
| P2 | F114 | Major | Deels opgelost | Import/Export | Geen IGES-, DWG- of Parasolid-export (PDF/DXF van tekeningen nu wel) |
| P2 | F115 | Major | Deels opgelost | Robuustheid/CI | Zonder WebGL: hoofdviewport en self-test nu netjes, multi-view nog onbeveiligd (F143) |
| P2 | F117 | Major | Open | Installer | Installer/exe niet code-signed (samengevoegd met F49) |
| P2 | F121 | Major | Deels opgelost | Features | Ontbrekende SolidWorks-features: Dome, Indent, Mounting Boss, Snap Hook, Lip/Groove; Smart Fasteners en Instant3D slechts deels (Auto Fasteners, Drag Handles) |
| P2 | F122 | Major | Deels opgelost | Tekeningen | Standaardaanzichten zonder automatische centermarks/verborgen lijnen |
| P2 | F125 | Major | Deels opgelost | Performance | rebuildworker-e2e timing-flaky (frame-gap-check zelf groen) |
| P2 | F126 | Major | Deels opgelost | Proces/Bewijs | Windows-regressielog is geplakt, geen ruwe runner-output |
| P2 | F130 | Major | Deels opgelost | Proces | Breedte boven correctheid: +7608 regels, maar geen tests voor mate-richting/conflict of gesplitste randen |
| P2 | F150 | Major | Nieuw | Release | Build-log meldt "signing with signtool.exe", maar alle 0.5.10-binaries zijn NotSigned |
| P2 | F156 | Major | Nieuw | Security | recover:*-IPC accepteert een door de renderer gekozen map (met %ENV%-expansie) |
| P2 | F157 | Major | Nieuw | Weergave | Two/Four View: de extra vensters hebben geen studio-omgeving, modellen worden zwarte silhouetten |
| P2 | F151 | Minor | Nieuw | Testen/CI | Self-tests draaien ongepackaged (packaged:false) en met SwiftShader: geen installer-test en geen echte no-WebGL-test |
| P2 | F163 | Minor | Nieuw | Merken | Merk- en neutral-checks blind voor Weldments, Sustainability Extras en "reference frames"; docs/26 legt 1-op-1-pass vast |
| P3 | F16 | Major | Niet geverifieerd | Visueel | Iconen en lettertype |
| P3 | F38 | Major | Deels opgelost | Docs | README/TASKS |
| P3 | F46 | Major | Deels opgelost | Performance | CSG/solver op de UI-thread |
| P3 | F99 | Major | Deels opgelost | Geometrie | Geen exact-vs-mesh-indicator; STEP voor fallback-bodies onbewezen |
| P3 | F137 | Major | Deels opgelost | Performance | Rebuild-budget nog 45 s; mesh-CSG op de UI-thread in de browser |
| P3 | F21 | Minor | Niet geverifieerd | Visueel | Taakvenster-iconen |
| P3 | F22 | Minor | Niet geverifieerd | Visueel | Body-randen |
| P3 | F24 | Minor | Deels opgelost | Visueel | Extra rij in Modify |
| P3 | F28 | Minor | Deels opgelost | UX | Bestandsdialoog bij Insert Component |
| P3 | F118 | Minor | Open | Performance | Bundel weer gegroeid zonder budget: index 849 kB tegen 827 kB in de 0.5.2-claim (claim verouderd) |
| P3 | F124 | Minor | Nieuw | Scope | Bewuste gaten uit docs/24 (Magnified Selection, Instant2D, virtual-sharp flange, 3D-schetsmaten) |
| P3 | F129 | Minor | Deels opgelost | Docs | Verouderde docs en tellingen |
| P3 | F134 | Minor | Deels opgelost | Code | Line-budget-caps staan op de huidige grootte, niet op een doel (MT5D-08) |
| P3 | F136 | Minor | Deels opgelost | Juridisch/Tooling | Neutral-comments-check incompleet |
| P3 | F138 | Minor | Nieuw | Build/Security | npm audit: 17 kwetsbaarheden (15 moderate, 2 high) in de electron-builder-keten |
| P3 | F141 | Minor | Nieuw | Assembly | Bij conflict wordt de oudere mate als fout gemarkeerd, niet de nieuwe |
| P3 | F142 | Minor | Nieuw | Repo | graphify-out (64 MB, 193 bestanden) gecommit |
| P3 | F146 | Minor | Nieuw | Testen/CI | sheetexport: PDF-viewerstap slaat over op Linux (file-URL fout opgebouwd) |
| P3 | F161 | Minor | Nieuw | Weergave | Shading-naad en spikkels; STEP-import toont mesh ("300 triangles") |
| P3 | F162 | Minor | Nieuw | Security | gpu:setSoftware bewaart enable-unsafe-swiftshader permanent in gpu.json |
| P3 | F164 | Minor | Nieuw | Testen/CI | src/core/drawing/dbg.test.ts is een debugtest zonder assertie en telt mee in de 454 |
| P3 | F165 | Minor | Nieuw | Data | Oude "SW-Density" in vergelijkingen wordt bij openen niet omgezet |
| P3 | F166 | Minor | Nieuw | Assembly | solveMates stopt stil na een vast aantal passes; niet-convergentie is niet te onderscheiden van een conflict |
| P3 | F169 | Minor | Deels opgelost | QA-rapport | QA-diagnoselog bevat een foute theoriewaarde (T2diag) |

### 6.2 Details open bevindingen

#### F31 · Kritiek · Deels opgelost · P0 · Proces — e2e-exitcodes / CI / niet-gecommit werk
- Bewijs 0.5.10: Exitcodes en runner in orde; CI-config draait nu met SwiftShader (ci.yml). Een groene Actions-run is niet te bewijzen (privé-repo, geen gh op laptop of box). Lokale Linux-regressie: 93/98 groen bij volledige run (features, drawing, inventory47, rebuildworker, videos46 rood); bij herhaling features en rebuildworker groen, drawing, inventory47 en videos46 reproduceerbaar rood → 95/98 (logs/regression.log). Teamronde: CI bewijst niets zolang mesh rood is: één run-stap met bash -e (ci.yml:38-46, F147); logs/regression-rerun.log EXIT=1; geen Actions-run.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: 0.5.1: Branch gepusht naar origin (IanPhlippo-jpg/Claude, HEAD 46fc2f3), maar GitHub Actions niet toegankelijk vanaf QA (scm_repo_not_accessible) → geen bewijs van groene CI. Linux-drawing rood ⇒ CI (ubuntu) vrijwel zeker rood. || 0.4.8: Versie gecommit/getagd; e2e/lib/check.mjs; CI timeout; drawing nog rood → CI zou rood zijn Teamnoot: Riki stelde Major voor; strengste wint → Kritiek blijft (drawing houdt GO #9 dicht).
- Teamronde: Kritiek volgens Strati, Webi en MT5 Dev; Major volgens QA, Riki en Risk (Risk: "wie F147 niet apart boekt, moet F31 Kritiek houden"). Strengste wint: Kritiek
- Repro: run-regression Linux
- Fix: F10 oplossen.

#### F54 · Kritiek · Open · P0 · Proces — CI rood op Linux; 'regressie groen' niet reproduceerbaar
- Bewijs 0.5.10: De CI-stap draait run-regression.mjs zonder continue-on-error; lokaal op Linux (zelfde ubuntu/xvfb/SwiftShader-opzet) zijn drawing, inventory47 en videos46 reproduceerbaar rood (logs/regression-rerun.log) → de CI-job is vrijwel zeker rood. Geen Actions-run zichtbaar (privé-repo).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: 0.5.1 Linux-regressie: DONE 91/93 — failed: drawing rebuildworker. 0.5.1: Linux-regressie: drawing blijft rood (zie F10). CI-config draait ubuntu-latest ⇒ rood. || 0.4.8: Alleen drawing faalt: DONE 85/86 failed: drawing — CI op Linux zou rood zijn
- Teamronde: Kritiek volgens MT5 Dev (P0 die "klaar" blokkeert = Kritiek volgens §11); QA had Major
- Repro: run-regression
- Fix: Zie F10.

#### F105 · Kritiek · Deels opgelost · P0 · Tests — B-rep-pad bijna nooit in regressie geoefend
- Bewijs 0.5.10: B-rep-pass 12 scripts in CI; lokaal 11/12 (features TimeoutError na 227 s, logs/regression-brep.log), bij herhaling features 65/65 (logs/regression-rerun-brep.log) → timing-flaky. Maar de B-rep-pass vangt F140 (extra rand) niet. Teamronde: Release = B-rep (prefs.ts:21, brepRefine.ts:25-38: true buiten TEST_HOOKS), maar de e2e-build draait mesh; in CI draaien de 12 B-rep-scripts (ci.yml:44) alleen als de mesh-pass groen is (F147). F140 wordt door de B-rep-pass niet gevangen.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: MT5 Developer: → Deels — B-rep-pass staat in ci.yml:38 maar is in CI nooit groen gezien; de stappen ervoor (ci.yml:25,27) falen zonder GPU (F115/F128). || 0.5.1: B-rep-pass in CI (9 scripts, ci.yml:38) — zie F120. || 0.4.8: brepRefine: onder TEST_HOOKS is B-rep uit tenzij localStorage.phlippo.kernel==='brep'. Alleen e2e/brep.mjs en desktop.mjs zetten de flag; 84/86 regressiescripts rebuilden op mesh. [MT5D-01]
- Teamronde: Kritiek volgens Strati; QA had Major. MT5 Dev: deels, in CI onbereikbaar bij rode mesh-pass
- Repro: rg phlippo.kernel e2e/; tel SCRIPTS vs brep-flag
- Fix: Default e2e naar brep als WASM laadt, of CI-matrix PHLIPPO_KERNEL=brep op features+fillet+step+bodies; assert bodies.exact waar claimed.

#### F111 · Kritiek · Deels opgelost · P0 · Topologie — Fillet-rand die door een eerder ingevoegde feature gesplitst wordt: maar één deel afgerond, zonder waarschuwing
- Bewijs 0.5.10: Mesh: T3 30439,07 vs verwacht 30439,91 → OK. B-rep (standaard in release): 30431,33, 8,584 mm³ te weinig = een extra rand van 10 mm afgerond (F140). Kritiek → Major (mesh-deel dicht; B-rep-deel apart als F140). Teamronde: Het symptoom (stil fout bij een gesplitste rand) zit in de releasekernel; de gebruiker ziet F140.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Strati/Webi/Riki/MT5/Risk: ↑Kritiek — stil foute geometrie (errors {}), gaat zo de STEP-export in. || QA-test T3: plaat 80×40×10, Fillet R2 op lange bovenrand; daarna slot vóór de fillet ingevoegd die de rand in tweeën splitst → volume 30469.53 = exact "één helft afgerond" (verwacht 30439.91 voor beide), errors {}.
- Teamronde: Kritiek volgens Strati en MT5 Dev ("of sluiten en onderbrengen in F140"); Major volgens QA, Riki en Risk (alleen zolang F140 Kritiek blijft). Strengste wint: Kritiek
- Repro: vitest src/qa/qaStrict.test.ts › T3
- Fix: Bij gesplitste rand alle afstammelingen matchen (zelfde face-namen), anders waarschuwing tonen zoals SolidWorks "Missing edge".

#### F139 · Kritiek · Nieuw · P0 · Kernel — Mesh-fillet op een gatrand voegt volume toe i.p.v. af te nemen (fout zonder foutmelding)
- Bewijs 0.5.10: QA T1 mesh: Ø50: gefilleteerd 44390,34 > eigen scherpe mesh 44385,74 (verlies −4,6, verwacht 137,2), alleen waarschuwing "faceted result is not closed (≈18,48 mm²)". Ø35 direct: 54428,24 > 54393,40 (−34,8 i.p.v. 96,8) zonder waarschuwing (logs/qa-strict-tests.log, logs/qa-diag.log). Identiek in 0.5.1 → het 0.5.1-rapport noemde T1 ten onrechte OK (vergeleek met analytisch volume). B-rep exact correct (logs/qa-brep-tests.log); de gebruiker ziet eerst het foute mesh-resultaat, worker/terugval blijven fout. Teamronde: Ø35 (r=17,5): verlies −34,85 mm³ met errors {} en géén waarschuwing (logs/qa-diag.log:1). Stil fout volume = Kritiek volgens §11.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Kritiek volgens Strati, Riki, Webi, Risk en MT5 Dev (unaniem); QA had Major
- Repro: QA-bronnen uit tools/qa-src/ naar src/qa/ kopiëren, dan npx vitest run src/qa/qaStrict.test.ts src/qa/qaDiag.test.ts --silent=false
- Fix: Concave-rand fillet in mesh-CSG corrigeren of mesh-fillet op gesloten ronde randen weigeren met fout; test op volumeverlies t.o.v. eigen scherp volume.

#### F140 · Kritiek · Nieuw · P0 · Topologie — B-rep (standaard in release): fillet op gesplitste rand rondt een extra rand van 10 mm af
- Bewijs 0.5.10: QA T3 B-rep: 30431,33 vs verwacht 30439,91; tekort exact 8,584 mm³ = 10 mm × (4−π) bij R2 → één extra rechte rand van 10 mm afgerond, waarschijnlijk de achterrand van de sleuf parallel aan de oorspronkelijke rand (logs/qa-brep-tests.log). Stil fout resultaat, geen waarschuwing; mesh-pad correct. Teamronde: Formule: 8,584 mm³ = 10 mm · R²·(1−π/4) bij R = 2 (logs/qa-brep-tests.log). Welke rand extra wordt afgerond, is niet geverifieerd; zie F167 voor de oorzaak en F159 voor de ontbrekende kruiscontrole.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Kritiek volgens QA en alle vijf reviewers (unaniem)
- Repro: QA-bronnen uit tools/qa-src/ naar src/qa/ kopiëren, dan npx vitest run src/qa/qaBrep.test.ts --silent=false
- Fix: Eerst diagnose (F167): mesh- en OCCT-randen loggen; QA-T3 als B-rep-unit-test die 30439,91 ± 0,01 mm³ eist; daarna de matcher repareren. Intussen volume-kruiscontrole (F159).

#### F147 · Major · Nieuw · P0 · Testen/CI — CI: mesh-, B-rep- en worker-regressie in één run-stap met bash -e; B-rep en worker draaien nooit zolang mesh rood is
- Bewijs 0.5.10: Geverifieerd: .github/workflows/ci.yml:38-46 is één `run:`-blok zonder continue-on-error; run-regression.mjs eindigt met exit 1 bij rood; mesh is lokaal reproduceerbaar rood (logs/regression-rerun.log). Ook "git diff --exit-code" en de eindgate van de desktopchecks (ci.yml:48-51) worden dan niet bereikt. README.md:90 "De CI draait … een B-rep-pass" is daardoor bij een rode mesh-pass feitelijk onwaar.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Strati F148, Riki F147, Risk F148, MT5 Dev F147
- Alias: Strati F148, Riki F147, Risk F148, MT5 Dev F147
- Repro: sed -n 38,46p .github/workflows/ci.yml
- Fix: Drie aparte stappen met id en continue-on-error, plus een eindstap die alle uitkomsten controleert (zoals nohooks/selftest).

#### F159 · Major · Nieuw · P0 · Kernel — B-rep-resultaat vervangt het mesh-resultaat zonder volume-kruiscontrole; mesh-waarschuwingen van exacte bodies worden weggegooid
- Bewijs 0.5.10: Geverifieerd: src/app/brepRefine.ts:51-70 refinedResult wisselt exacte bodies in zonder vergelijking met het mesh-volume; waarschuwingen blijven alleen voor facet-bodies (:67-69). Daardoor blijft F140 stil.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Risk F147
- Alias: Risk F147
- Repro: –
- Fix: Bij |V_exact − V_mesh|/V > 0,5 %: melding "exact en facet wijken af" en de feature markeren.

#### F167 · Major · Nieuw · P0 · Topologie — De voorgestelde fix voor F140 zit op de verkeerde laag; de oorzaak is niet bekend
- Bewijs 0.5.10: Geverifieerd: edgesets.ts:337-354 splitPieces eist al colineair (≥0,9999) en binnen de oorspronkelijke rand (1e-3). Het B-rep-pad matcht op de tessellatie en vertaalt met brepEdgesOn (tol max(0,05; 1 % lengte), brep.ts:266-268 volgens MT5 Dev). QA's "waarschijnlijk de achterrand van de sleuf" is een hypothese.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; MT5 Dev F148
- Alias: MT5 Dev F148
- Repro: –
- Fix: Eerst de gematchte mesh-randen en OCCT-randen loggen en B-T3 als unit-test (30439,91 ± 0,01); pas dan de matcher aanpassen; tot dan een waarschuwing bij gesplitste randen.

#### F50 · Kritiek · Deels opgelost · P1 · Juridisch — SW-handelsmerken
- Bewijs 0.5.10: SW-Density en 3D ContentCentral weg (F116/F131); "Weldments" bewust behouden: 28 vermeldingen in src en zichtbaar als tabblad (shots/walk-18-done.png). Kritiek → Major: één term resteert, juridische check vóór publicatie. Teamronde: "Weldments" 29× in src (rg -o Weldments src), 0× in tools/rename-trademarks.cjs; "Sustainability Extras" (materials.ts:124/140); docs/26 legt een 1-op-1-pass tegen SOLIDWORKS-frames vast (docs/26-zelfcontrole-1op1.md:1-5).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: 0.5.1: "Weldments" nog zichtbaar (28 hits, o.a. CommandManager-tab, shots/e19-mass-properties.png) en "SW-Density" als File Property (equations.ts:257-261). Pack and Go/MBD weg. || 0.4.8: Hole Wizard→Hole Tool; Lifecycle→Share; FeatureManager/PM/DimXpert weg; uiText.test NAMES-regex. Nog zichtbaar: Weldments, MBD Dimensions, Pack and Go (AssemblyTab/Share). Commentaren noemen nog Lifecycle/MBD. Teamnoot: Risk stelde Major voor; strengste wint → Kritiek blijft tot Pack and Go hernoemd is.
- Teamronde: Kritiek volgens Strati; Major volgens QA, Riki, Webi, Risk en MT5 Dev. Strengste wint: Kritiek. Alle reviewers: blokkeert publiceren, niet eigen gebruik
- Repro: Ribbon + Share-tab shot app-08
- Fix: Pack and Go→Package Files; MBD Dimensions→Product Dimensions; Weldments mag blijven of → Frames; commentaren opschonen.

#### F51 · Kritiek · Deels opgelost · P1 · Geometrie — Mesh-kernel
- Bewijs 0.5.10: Browser-build toont "Faceted 1/1" (shots/walk-18-done.png); mesh-kernel blijft primair voor preview/terugval/worker; plastics-features alleen mesh (plastics.ts gebruikt csg/extrudeGeometry); mesh-fillet op gatrand fout (F139). Teamronde: Correctie: de shot "Faceted 1/1" (shots/walk-18-done.png) komt uit de e2e-build (TEST_HOOKS → mesh, brepRefine.ts:29-35). Een gewone browserbuild zet B-rep aan (brepRefine.ts:37); of de OCCT-worker in de browserrelease echt draait: niet geverifieerd. F51 blijft Kritiek om de plastics (alleen mesh) en de mesh-terugval/preview/worker (F139).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: 0.5.1: B-rep-refine (OCCT) standaard alleen op desktop (perf.brepKernel); browser = mesh ("Faceted 1/1" in statusbalk). Windows B-rep-pass 11/11, Linux B-rep-pass zie logs/regression-brep.log. Sheet metal/wrap/deform/surfaces e.d. blijven mesh. || 0.4.8: OpenCascade via replicad in occt.worker.ts; pref perf.brepKernel; STEP in/uit; mesh-kernel blijft terugval voor niet-ondersteunde features (docs/15–19) Teamnoot (MT5D/Strati): dekking ongemeten; geen exact/mesh-indicator (zie F99).
- Teamronde: Kritiek volgens QA en alle reviewers
- Repro: Part met extrude+fillet; STEP export
- Fix: Feature-dekking meten; mesh-pad uitfaseren waar B-rep groen is.

#### F93 · Kritiek · Deels opgelost · P1 · Proces — Docs/commits claimen 98/98 terwijl de Linux-regressie rood blijft
- Bewijs 0.5.10: Claims kloppen niet: commit a3bfaf7 en TASKS.md:810 melden "98/98", lokaal Linux haalt dat niet; bundle "827 kB" is 849 kB (F118); het Windows-log met 98/98 heet regression-0.5.9.txt (start 30-10 22:03 CET, vóór de versie-commit a3bfaf7 van 22:48 CET); lokaal Linux 93/98 groen bij volledige run (features, drawing, inventory47, rebuildworker, videos46 rood); bij herhaling features en rebuildworker groen, drawing, inventory47 en videos46 reproduceerbaar rood → 95/98. Teamronde: Het Windows-98/98-log (win/regression-0.5.9.txt, gestart 22:03:47 CET) bevat round2.mjs (r.99), dat pas in a3bfaf7 (22:48:35 CET) is toegevoegd: het draaide dus op een niet-gecommitte 0.5.10-werkboom met package-versie 0.5.9. Gelijkheid met de release: niet geverifieerd. TASKS.md:814 claimt "release 0.5.10 geïnstalleerd (19/19)" zonder log (F149).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: 0.5.1 Linux-regressie: DONE 91/93 — failed: drawing rebuildworker. 0.5.1: docs/23 benoemt nu eerlijk "alleen Windows"; maar commit 358b3ba (0.4.9) claimt de Linux-fix voor Ø35 en die faalt nog steeds. || 0.4.8: Commit 8285999 e.a. "regressie 86/86"; docs/12 claimt F10 opgelost. Deze ronde: DONE 85/86 failed: drawing (Ø35 + reload) — identiek aan 0.3.4 op Linux. Team: alle 5 reviewers → Kritiek (derde ronde valse groen-claims).
- Teamronde: Kritiek volgens QA en alle reviewers
- Repro: Vergelijk git log --grep=86/86 met node e2e/drawing.mjs op Linux
- Fix: Claims aanpassen tot drawing groen is of expliciet "Windows 86/86, Linux drawing bekend rood" + issue-link; F10 eerst fixen.

#### F10 · Major · Open · P1 · Tekening — Ø-maat en tekening herstellen na reload
- Bewijs 0.5.10: drawing 24/25 op Linux in beide runs: 'diameter Ø35 placed' picked:false, under:'line.' (logs/regression.log, logs/regression-rerun.log). Identiek aan 0.5.1; op Windows zelfgerapporteerd groen.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: 0.5.1 Linux-regressie: DONE 91/93 — failed: drawing rebuildworker. 0.5.1: Linux regressie: drawing exit=1, 24/25 — "drawing restored after reload" slaagt nu, maar "FAIL diameter Ø35 placed" {"picked":false} blijft (shots/e43-fail-diameter.png). Commit 358b3ba claimde "Tekening-picks 4 px (Ø35 op Linux)": niet waar op Linux. Windows-log: 93/93. || 0.4.8: logs/regression.log: drawing exit=1, 22/24 — FAIL diameter Ø35 placed, FAIL drawing restored after reload (zelfde als 0.3.4; docs claimen 86/86) Teamnoot (Riki): reload-check (dims.length===2) is vervolg van Ø35 — zie F102.
- Repro: node e2e/drawing.mjs op Linux
- Fix: Ø-picking onafhankelijk van font/metrix; reload wacht op herstelde staat; CI-artifact met screenshot.

#### F98 · Major · Deels opgelost · P1 · Proces — 42 commits niet gepusht / geen bewijs van remote CI-run
- Bewijs 0.5.10: Branch is gepusht (laptop: claude/fase1-schetser = origin/…, HEAD a4b1e92). Een Actions-run-link of -uitslag ontbreekt nog steeds.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: 0.5.1: Gepusht (origin up-to-date), maar remote CI-run niet zichtbaar voor QA. || 0.4.8: Branch 42 ahead of origin; hele B-rep-migratie alleen op de laptop. Geen Actions-artifact in report-0.4.8/logs/. 'CI rood' = lokale inferentie. [Strati N2 · Riki R02]
- Repro: git status -sb; ls report-0.4.8/logs/; geen Actions-URL in docs
- Fix: Push naar (private) origin; Actions-artifact van drawing-run bewaren; pas daarna "CI" claimen.

#### F119 · Major · Deels opgelost · P1 · Testinfra — Regressierunner verbergt skip()-regels: "groen" kan overgeslagen checks bevatten
- Bewijs 0.5.10: Runner telt en noemt skips (run-regression.mjs:19-29); lokaal: 7 optionele stappen overgeslagen in de standaardrun, elk met reden in logs/regression.log.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Strati/Webi/MT5/Risk: ↑Major — 53 skip()-aanroepen (rg "skip(" e2e), check.mjs:32 logt alleen; zelfde klasse als F31/F93. || e2e/run-regression.mjs filtert stdout tot FAIL/passed; e2e/lib/check.mjs:32 skip() logt alleen; 53 skip()-aanroepen in e2e/.
- Teamronde: Deels heropend volgens Webi en Risk: skips worden geteld maar laten een run nooit falen (F155); QA had Opgelost
- Repro: rg "skip\(" e2e
- Fix: Skips tellen en tonen in de samenvatting ("93/93, 4 skipped").

#### F120 · Major · Deels opgelost · P1 · CI — CI-B-rep-pass draait 9 scripts, lokaal 11 (qa2, facenames ontbreken)
- Bewijs 0.5.10: CI B-rep-pass = 12 scripts, gelijk aan de lokale lijst (ci.yml:44). Teamronde: ci.yml:44 heeft 12 scripts, maar die regel draait niet zolang ci.yml:42 rood is (F147).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Strati: ↑Major — CI-B-rep-pass (ci.yml:38) mist qa2 en facenames én wordt in CI nooit bereikt (F128). || .github/workflows/ci.yml:38 vs e2e-out/brep-0.5.1.txt (11/11).
- Teamronde: Deels opgelost volgens Strati en MT5 Dev: de lijst klopt, maar de stap wordt in CI niet bereikt; QA had Opgelost
- Repro: ci.yml
- Fix: qa2 en facenames toevoegen.

#### F143 · Major · Nieuw · P1 · Robuustheid — Multi-view (ViewPane) maakt een WebGLRenderer zonder try/catch: zonder WebGL crasht 2/4-view
- Bewijs 0.5.10: src/app/viewport/ViewPane.tsx:20 `new THREE.WebGLRenderer` zonder guard, terwijl glSetup.ts:11-17 de hoofdviewport wel afvangt. Statisch gevonden; niet runtime gereproduceerd (box heeft SwiftShader). Teamronde: De enige ErrorBoundary staat rond de hele app (src/main.tsx:25-28), dus een throw in ViewPane legt de hele UI plat (statisch, niet runtime gereproduceerd).
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Major volgens QA en alle reviewers; Riki: ernstiger dan gedacht
- Repro: Start zonder WebGL (bijv. --disable-gpu --disable-software-rasterizer), kies View ▸ Viewport ▸ Two/Four View.
- Fix: ViewPane via createRenderer uit glSetup laten lopen en bij null een melding tonen.

#### F144 · Major · Nieuw · P1 · Testen/CI — inventory47 en videos46 reproduceerbaar rood op Linux (context-toolbar)
- Bewijs 0.5.10: inventory47 17/18 'a clicked line shows the context toolbar with Make Horizontal' in beide runs; videos46 24/25 'Top Plane: context toolbar …' en bij herhaling TimeoutError (logs/regression.log, logs/regression-rerun.log). Windows-log zegt 98/98 → platformafhankelijk gedrag of tests die op timing leunen.
- Historie (bewijsbestanden in report-0.5.1/): –
- Repro: E2E_URL=http://127.0.0.1:4173/ xvfb-run -a node e2e/run-regression.mjs inventory47 videos46
- Fix: Context-toolbar-timing op Linux onderzoeken (hover-delay/mouse-move), test deterministisch maken; CI groen bewijzen.

#### F145 · Major · Nieuw · P1 · Testen/CI — features-script niet-deterministisch: Sweep1 "path sketch has no lines" met volgfouten (oorzaak niet geverifieerd)
- Bewijs 0.5.10: features 59/65 in standaardrun (Sweep1 'path sketch has no lines…'), TimeoutError in B-rep- en worker-pass, maar 65/65 bij herhaling op mesh en B-rep (logs/regression.log, logs/regression-brep.log, logs/regression-worker.log, logs/regression-rerun.log, logs/regression-rerun-brep.log). Teamronde: Sweep1-fout "The path sketch has no lines, arcs or splines to sweep along." met volgfouten in Imported1, equations, Extrude-Thin1 (logs/regression.log:3). App- of testrace: niet geverifieerd.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Major volgens Riki en MT5 Dev (en Risk bij herhaling); QA had Minor
- Repro: Herhaal node e2e/run-regression.mjs features een paar keer.
- Fix: Lange script opsplitsen, expliciet wachten op rebuild-klaar i.p.v. vaste timeouts.

#### F148 · Major · Nieuw · P1 · Bewijs/claims — Windows-log round2b is een kopie van het 0.5.9-log; het 98/98-log draaide op een niet-gecommitte werkboom
- Bewijs 0.5.10: Geverifieerd: regels 1-99 van win/regression-round2b.log zijn byte-identiek aan regels 2-100 van win/regression-0.5.9.txt. Dat log start 2026-10-30 22:03:47 CET (kop "regression 0.5.9"), 45 min vóór a3bfaf7 (22:48:35 CET), en bevat round2.mjs (r.99), dat pas in a3bfaf7 werd toegevoegd (git log --diff-filter=A).
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Strati F147, Webi F147, Riki F149a/b
- Alias: Strati F147, Webi F147, Riki F149a/b
- Repro: diff <(sed -n 1,99p win/regression-round2b.log) <(sed -n 2,100p win/regression-0.5.9.txt)
- Fix: Per release één ruw log met commit-hash en versie in de kop; nooit logs samenplakken.

#### F149 · Major · Nieuw · P1 · Bewijs/claims — Claims zonder platform of log: 98/98 zonder "Windows", "CI draait B-rep-pass", "0.5.10 geïnstalleerd (19/19)"
- Bewijs 0.5.10: Geverifieerd: TASKS.md:810 en commit a3bfaf7 noemen 98/98 / B-rep 12/12 / worker 6/6 zonder platform, terwijl eerdere commits "Windows" vermeldden; README.md:55-56 zegt dat de cijfers Windows-cijfers zijn. README.md:90 claimt een CI-B-rep-pass (zie F147). TASKS.md:814 claimt "release 0.5.10 geïnstalleerd (19/19)" zonder enig log; QA schreef eerder ten onrechte "niet voor 0.5.10 geclaimd".
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Riki F148, Strati F152, Webi (19/19), Risk §4.5
- Alias: Riki F148, Strati F152, Webi (19/19), Risk §4.5
- Repro: –
- Fix: Elke claim met platform, commit en pad naar het ruwe log.

#### F152 · Major · Nieuw · P1 · Testen/CI — De strikte QA-tests (T1/T3/M1-M5) staan buiten de repo; geen gate vangt F139/F140
- Bewijs 0.5.10: Geverifieerd: tools/qa-src/ staat alleen in de QA-map; src/qa is na de run uit de kloon verwijderd (git status schoon). F139 en F140 zijn alleen door deze tests gevonden.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Strati F155 (vervolg F130 / team-N8)
- Alias: Strati F155 (vervolg F130 / team-N8)
- Repro: –
- Fix: qaStrict/qaBrep in de repo opnemen als vitest-suite (T3 B-rep: 30439,91 ± 0,01).

#### F153 · Major · Nieuw · P1 · Dataverlies — AutoRecover heeft alleen de documentnaam als sleutel: documenten met dezelfde naam overschrijven en wissen elkaars kopie
- Bewijs 0.5.10: Geverifieerd: electron/main.cjs:342 recoverFile(name) = gesaneerde naam (80 tekens) + .autorecover.kcad; recover:remove (main.cjs:381-384) wist op naam; volgens Risk wordt alleen het actieve document geschreven (autoRecover.ts:42-60) en wist MenuBar.tsx:75 na opslaan op naam (niet regel voor regel door QA nagelezen).
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Risk F150
- Alias: Risk F150
- Repro: –
- Fix: Sleutel op pad of document-id; alle dirty documenten schrijven.

#### F154 · Major · Nieuw · P1 · Dataverlies — Herstelde AutoRecover-kopie opent als "opgeslagen" (dirty:false), zonder fsync en zonder e2e-test
- Bewijs 0.5.10: Geverifieerd: slices/document.ts:87 zet dirty:false bij openen; recover:write (main.cjs:344-357) doet tmp+rename zonder fsync, anders dan atomicWrite (main.cjs:123-130); e2e/desktop-restore-autosave.mjs bestaat maar staat niet in ci.yml.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Risk F151 (Riki: desktop-restore-autosave niet in CI)
- Alias: Risk F151 (Riki: desktop-restore-autosave niet in CI)
- Repro: –
- Fix: Herstel openen als dirty met "(Recovered)" in de titel, fsync toevoegen, e2e-test in CI.

#### F155 · Major · Nieuw · P1 · Testen/CI — skip() telt als groen: ~120 optionele stappen kunnen overslaan zonder dat een run faalt
- Bewijs 0.5.10: Geverifieerd: e2e/lib/check.mjs:35 skip() logt en geeft een waarde terug, de exitcode (:29) houdt er geen rekening mee; rg telt 122 skip(-aanroepen in e2e (Risk: 53 → 121 sinds 0.5.1). Webi noemt 7 skips die klikfouten slikken (o.a. full:322, configurations:173, brep:102, bodies:64, inventory47:171/197, sheetexport:72).
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Webi F149, Risk F153 (heropent F119 deels)
- Alias: Webi F149, Risk F153 (heropent F119 deels)
- Repro: –
- Fix: Skipbudget per script; het aantal skips in de eindgate opnemen; klik-timeouts nooit als optioneel behandelen.

#### F158 · Major · Nieuw · P1 · Testen/CI — De release rebuildt in de worker, maar de regressie draait standaard op de UI-thread
- Bewijs 0.5.10: Geverifieerd: prefs.ts:21 perf.rebuildWorker=true in de release; de e2e-build gebruikt de worker alleen met ?rebuild=worker (worker-pass 6 scripts, 5/6 lokaal, logs/regression-worker.log). Het verzonden pad heeft dus de kleinste dekking.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Webi F151
- Alias: Webi F151
- Repro: –
- Fix: Hoofdregressie op het releasepad (worker + B-rep), mesh/UI-thread als extra pass.

#### F160 · Major · Nieuw · P1 · Testen/CI — Regressielog per pass overschreven: B-rep-bewijs verdwijnt uit het CI-artefact
- Bewijs 0.5.10: Geverifieerd: e2e/run-regression.mjs:11-12 schrijft regression-<versie>-partial.txt met writeFileSync voor elke gedeeltelijke run; de worker-pass overschrijft zo de B-rep-pass (ci.yml:44/46, artefact ci.yml:52-57).
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Risk F149
- Alias: Risk F149
- Repro: –
- Fix: Bestandsnaam per pass (suffix kernel/rebuild).

#### F47 · Major · Deels opgelost · P2 · Geometrie — Topologische naamgeving
- Bewijs 0.5.10: Mesh: T1-T3 randen worden teruggevonden; B-rep: T3 rondt een extra parallelle rand af (F140) → naamgeving nog niet robuust.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: 0.5.1: Eigen QA-tests (logs/qa-strict-tests.log): T1 fillet op gatrand overleeft Ø35→Ø50 ✓; T3 rand gesplitst door later ingevoegde slot: slechts 1 van 2 delen afgerond, zonder waarschuwing ✗ (F111); T2 revolve-fillet faalt na maatwijziging ✗ (F110). Face names alleen voor extrude (docs/23). || 0.4.8: 0.3.7: stabiele randverwijzingen (richting+normalen); volledige topologische namen nog apart traject (docs/19)
- Repro: Edge-fillet na edit
- Fix: Topologische id’s afronden.

#### F48 · Major · Deels opgelost · P2 · Geometrie — CSG-resultaat ongecontroleerd / toleranties
- Bewijs 0.5.10: niet opnieuw getest, status overgenomen.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Volume-/gesloten-check vangt fouten (T2: "boolean result failed the volume check") — goed — maar de feature valt dan weg i.p.v. te slagen. || 0.4.8: B-rep volume-check vs meshTool (rebuild.ts); niet overal manifold-gate
- Repro: Boolean zwaar
- Fix: Structurele manifold-check na elke boolean.

#### F49 · Major · Open · P2 · Electron — Release-hardening (heropend; samengevoegd met F117)
- Bewijs 0.5.10: Geïnstalleerde Phlippo CAD.exe: Get-AuthenticodeSignature = NotSigned (laptop, read-only). Bewust (docs/25), maar blokkeert publiceren (SmartScreen). Teamronde: Opnieuw gemeten op 2-11 (alleen lezen): geïnstalleerde exe, Setup-0.5.10.exe, portable en win-unpacked alle vier NotSigned (win/signature-0.5.10.txt).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Strati/MT5: heropend — "Opgelost (bewust geen signing)" spreekt F117 tegen; release-hardening is niet af zolang signing open is. Zie F117. || Ian: geen code signing; F49 gesloten in docs/14; SmartScreen-gedrag gedocumenteerd
- Teamronde: Major volgens QA en alle reviewers; NotSigned op 2-11 opnieuw gemeten (F150)
- Repro: Installer
- Fix: Geen (bewust).

#### F94 · Major · Deels opgelost · P2 · Juridisch — Pack and Go, Weldments en MBD Dimensions nog zichtbaar
- Bewijs 0.5.10: Pack and Go en MBD weg uit src; Weldments bewust behouden (zie F50).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Risk stelde ↓Minor voor; de strengste stem (Major) blijft staan. || 0.5.1: Pack and Go/MBD Dimensions weg; Weldments blijft (bewuste keuze in docs) — strenge QA: blijft restant F50. || 0.4.8: Share-tab: Pack and Go (shot app-08); tabs Weldments + MBD Dimensions (ui48). Onderdeel restant F50. Teamnoot (Strati/Risk): Major — restant van F50, bepaalt GO #10.
- Repro: Assembly → Share; Part → tabs
- Fix: Hernoemen of onder F50 afronden; qa-regex uitbreiden.

#### F97 · Major · Deels opgelost · P2 · Electron — Packaged app:// + OCCT WASM niet smoke-getest op Windows
- Bewijs 0.5.10: Niet opnieuw op Windows getest; box-self-test (app://, 0.5.10) 8/8 zonder GPU en met SwiftShader (logs/self-test-nogpu.json, logs/self-test-softgl.json). Teamronde: logs/self-test-nogpu.json:3 en self-test-softgl.json:3: "packaged": false. Een packaged (geïnstalleerde) self-test van 0.5.10 is er niet (F151).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: 0.5.1: Windows packaged self-test (app://, 0.5.1) 8/8 ok — logs/windows-packaged-self-test.json: Fillet exact 44742.52, STEP 23567 bytes exact, worker 1143/1143, save+.bak. Linux: alleen 8/8 met SwiftShader (zie F115). || 0.4.8: Packaged Electron/NSIS deze ronde niet hertest terwijl app:// + OCCT WASM-worker nieuw zijn. desktop-installed.mjs checkt alleen start/versie/debug-weigering — geen sketch/extrude/fillet/STEP/WASM. Zelfde faalklasse als F53. [Strati N1 · Webi a · MT5D-06]
- Teamronde: Deels opgelost volgens MT5 Dev (self-test niet gepackaged); QA had Opgelost. Ernst Kritiek → Major (QA): app:// + WASM zijn bewezen, alleen de packaging-laag niet
- Repro: Windows NSIS-build: open part → extrude → fillet → STEP → Save; of uitbreiden desktop-installed/nohooks.mjs
- Fix: Windows packaged smoke zonder hooks: app://+WASM laden, Zoom/Fit, Final Render, extrude+fillet, STEP, Save/Save As. Gate release erop.

#### F112 · Major · Deels opgelost · P2 · UI/Options — Options-dialoog: 334 van 379 instellingen doen niets (nu eerlijk grijs)
- Bewijs 0.5.10: 379 sleutels (prefsSchema+prefs), 45 in WIRED_PREFS, 334 inert maar grijs met "Not available in this version of Phlippo CAD." (options.tsx:80-81; logs/prefs-unused.txt); prefsWired.test.ts bewaakt de lijst; AutoRecover schrijft echt (autoRecover.ts). Eerlijkheid opgelost; slechts ≈12 % van de opties werkt → Kritiek → Major.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Strati: ↑Kritiek; Risk: AutoRecover/Backup-subset P0 — "Save auto-recover info every 10 minutes" staat standaard aan (prefs.ts:305-307/363) en niets schrijft naar backup.* (5 backup.*-sleutels inert). Telling: Webi noemt 341; QA-hertelling met exacte sleutelmatch geeft 342/375 inert (wc -l toont 341 omdat de laatste regel geen newline heeft; een substring-telling ziet "fm.tree" ten onrechte als gebruikt via "fm.treeFilter"). Ook perf.softwareOpenGL (prefs.ts:254) is inert — had F115 kunnen opvangen. || prefs.ts: 375 sleutels in 31 categorieën, slechts 33 buiten prefs.ts gelezen (logs/prefs-unused.txt). Inert o.a. alle backup.* (AutoRecover-minuten/-map, back-ups), doc.lengthUnit/angleUnit/massa-eenheden, dual dims, perf.verification, sketch.fullyDefined, drawings.hatchPattern, msg.displayOverDefined, view-transities.
- Repro: rg per sleutel buiten prefs.ts
- Fix: Inerte opties verbergen of grijs maken; AutoRecover-interval/-map echt implementeren (nu alleen localStorage-autosave).

#### F114 · Major · Deels opgelost · P2 · Import/Export — Geen IGES-, DWG- of Parasolid-export (PDF/DXF van tekeningen nu wel)
- Bewijs 0.5.10: PDF/DXF-export van tekeningen (sheetExport.ts, export2d.ts + export2d.test.ts, e2e/sheetexport.mjs). IGES, DWG en Parasolid ontbreken nog.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: MenuBar.tsx: Open .kcad/.json/.stl/.step/.stp; Save As STL/3MF/AMF/STEP AP214. Geen IGES/DXF/DWG/PDF; Print = window.print().
- Repro: MenuBar.tsx Save As-lijst
- Fix: DXF/PDF-export van tekeningen (vector), IGES via OCCT.

#### F115 · Major · Deels opgelost · P2 · Robuustheid/CI — Zonder WebGL: hoofdviewport en self-test nu netjes, multi-view nog onbeveiligd (F143)
- Bewijs 0.5.10: Hoofdviewport: glSetup.ts:11-17 try/catch → null; self-test zonder GPU 8/8 ('WebGL2 blocklisted', logs/self-test-nogpu.log en logs/self-test-nogpu.json), software-GL 8/8 en desktop-nohooks 10/10 (logs/desktop-nohooks-softgl.log). Maar ViewPane.tsx:20 maakt nog een WebGLRenderer zonder try/catch (F143). Kritiek → Major.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: MT5 Developer: ↑Kritiek; Risk: P0. Viewport.tsx:129 `new THREE.WebGLRenderer(...)` zonder try/catch → generieke ErrorBoundary-dialoog "An operation failed… Error creating WebGL context." (shots/self-test-electron.png) i.p.v. een GPU-melding (Webi, MT5). Pref perf.softwareOpenGL bestaat maar is inert (F112). || Box (xvfb, geen GPU): self-test 7/8 ("Fillet1 is exact" ok=false, info undefined), desktop-nohooks TimeoutError. Met --use-angle=swiftshader: 8/8 en 8/8. CI draait ubuntu zonder deze flag ⇒ waarschijnlijk rood.
- Repro: xvfb-run -a npx electron . --self-test --no-sandbox (zonder GPU; logs/self-test-nogpu.json); ViewPane: zie F143
- Fix: WebGL-detectie met duidelijke melding/terugval; CI-job met SwiftShader-flags.

#### F117 · Major · Open · P2 · Installer — Installer/exe niet code-signed (samengevoegd met F49)
- Bewijs 0.5.10: NotSigned bevestigd (zie F49). Teamronde: Opnieuw gemeten op 2-11 (alleen lezen): geïnstalleerde exe, Setup-0.5.10.exe, portable en win-unpacked alle vier NotSigned (win/signature-0.5.10.txt).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Strati: ↑Major voor publieke verspreiding; tegenspraak met F49 "Opgelost (bewust geen signing)" → F49 heropend en samengevoegd: één fix (signen of expliciet "alleen eigen gebruik" vastleggen). || Geïnstalleerde app C:\Users\ianph\AppData\Local\Programs\Phlippo CAD (0.5.1): Authenticode NotSigned (windows-packaged-self-test.json). SmartScreen-waarschuwing bij installatie.
- Teamronde: Major volgens QA en alle reviewers; NotSigned op 2-11 opnieuw gemeten (F150)
- Repro: Get-AuthenticodeSignature
- Fix: Code-signing certificaat (of minimaal documenteren).

#### F121 · Major · Deels opgelost · P2 · Features — Ontbrekende SolidWorks-features: Dome, Indent, Mounting Boss, Snap Hook, Lip/Groove; Smart Fasteners en Instant3D slechts deels (Auto Fasteners, Drag Handles)
- Bewijs 0.5.10: Dome/Indent/Mounting Boss/Snap Hook/Lip-Groove bestaan (plasticsTypes.ts, plastics.ts, 12 unit-tests, e2e plastics) maar alleen op de mesh-kernel; Auto Fasteners aanwezig (store.ts:461).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: featureTypes.ts (~60 types) bevat ze niet; rg "dome|mountingBoss|snapHook|lipGroove|instant3d" = 0 feature-hits ("Indent" alleen als sheet-metal gusset-optie).
- Repro: rg in src
- Fix: Prioriteren: Dome, Indent, Mounting Boss, Instant3D (drag handles).

#### F122 · Major · Deels opgelost · P2 · Tekeningen — Standaardaanzichten zonder automatische centermarks/verborgen lijnen
- Bewijs 0.5.10: Auto centermarks + verborgen lijnen (core/drawing/autoMarks.ts, hlr.ts met tests).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Webi: ↑Major — tekening zonder centermarks/verborgen lijnen is geen SOLIDWORKS-standaardaanzicht. Riki: vergelijking met de SW-standaard niet geverifieerd. || shots/e42-three-views.png, e43-drawing: gat Ø35 alleen in bovenaanzicht zichtbaar; geen centermark, geen verborgen lijnen in voor-/zijaanzicht.
- Teamronde: Deels volgens Webi en Risk: alleen unit-tests, geen e2e; verborgen lijnen in geen enkele shot; centermarks ontbreken in Detail B van shots/deurkruk-tekening.png; QA had Opgelost
- Repro: drawing.mjs
- Fix: Document-optie "auto insert center marks" + weergavemodus Hidden Lines Visible.

#### F125 · Major · Deels opgelost · P2 · Performance — rebuildworker-e2e timing-flaky (frame-gap-check zelf groen)
- Bewijs 0.5.10: rebuildworker 10/10 incl. frame-gap-check bij herhaling (177 s, logs/regression-rerun.log) en in de worker-pass (366 s, logs/regression-worker.log); in de volledige standaardrun TimeoutError na 219 s (logs/regression.log) → werkt, maar de test is timing-flaky. Teamronde: logs/regression.log: rebuildworker exit=1 219 s TimeoutError in de standaardrun.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: logs/regression.log: rebuildworker exit=1 — FAIL "the window kept drawing frames during the rebuild (no gap over 250 ms)" {"gap":933.35,"frames":467,"workerMs":39788}; 9/10. Op Windows-log groen. Box zonder GPU (software-rendering) kan bijdragen; toch rode e2e op het CI-platform.
- Teamronde: Major volgens MT5 Dev (rebuildworker rood in de standaardrun); QA had Minor
- Repro: node e2e/run-regression.mjs rebuildworker (Linux, vite preview :4173)
- Fix: Main-thread-werk tijdens rebuild opsplitsen (mesh-upload in chunks), of de drempel onderbouwen; in CI groen krijgen.

#### F126 · Major · Deels opgelost · P2 · Proces/Bewijs — Windows-regressielog is geplakt, geen ruwe runner-output
- Bewijs 0.5.10: Ruwe runner-logs bestaan nu op de laptop (win/regression-0.5.9.txt, win/regression-round2b.log). Maar het volledige 98/98-log is als 0.5.9 benoemd en het 0.5.10-log (round2b) bevat maar 6 scripts. Teamronde: Correctie: win/regression-round2b.log bevat niet 6 scripts. Regels 1-99 zijn byte-identiek aan regels 2-100 van win/regression-0.5.9.txt (diff, geen verschil), plus B-rep 12/12 (r.112) en worker 6/6 (r.119). Zie F148.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Strati N4 / Risk R3 / MT5: logs/windows-regression-0.5.1.txt heeft 96 regels met 94× "exit=" voor 93 scripts; r.94 "DONE 93/93 green", r.95 afgebroken duplicaat "eos54: exit=0 14s 18/18 checks passed", r.96 nogmaals "DONE 93/93 green" (QA nageteld).
- Teamronde: Strati, Webi, Riki: QA-tekst was fout ("round2b bevat maar 6 scripts")
- Repro: Header van win/regression-0.5.9.txt vergelijken met git log -1 a3bfaf7
- Fix: Ruwe e2e-out/regression-*.txt of een GitHub Actions-artefact bewaren; geen handgeschreven samenvattingen als bewijs.

#### F130 · Major · Deels opgelost · P2 · Proces — Breedte boven correctheid: +7608 regels, maar geen tests voor mate-richting/conflict of gesplitste randen
- Bewijs 0.5.10: Nieuwe unit-tests mateStatus/revolve2/edgesets; maar de mesh-gatrand-fout (F139) en B-rep-T3 (F140) vallen door die tests heen; intussen 9 releases in 3 dagen met veel look-dev.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Strati N8: diff 0.4.8→0.5.1 src +7608/−4321. Correctie QA: er zijn wél mate-unit-tests (assembly.test.ts:75,96; mates2.test.ts), maar geen enkele dekt richtingsafhankelijkheid (M1), conflict (M2) of gesplitste/revolve-randen (T2/T3).
- Repro: git diff --stat 81f9c95..46fc2f3
- Fix: M1/M2/T2/T3 als vaste regressietests; UI-pariteit bevriezen tot F108/F109/F111 groen zijn.

#### F150 · Major · Nieuw · P2 · Release — Build-log meldt "signing with signtool.exe", maar alle 0.5.10-binaries zijn NotSigned
- Bewijs 0.5.10: Geverifieerd: win/desktop-build.log:67-74 (5× "signing with signtool.exe"); Get-AuthenticodeSignature op 2-11 (alleen lezen): installed exe, Setup, portable en win-unpacked NotSigned (win/signature-0.5.10.txt). Het build-log wekt dus een valse indruk; package.json heeft geen certificaatconfiguratie (MT5 Dev).
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Strati F153, Risk F154, MT5 Dev F151
- Alias: Strati F153, Risk F154, MT5 Dev F151
- Repro: –
- Fix: forceCodeSigning of een expliciete "unsigned"-melding in de build; de AuthenticodeSignature-uitvoer bij elke release in win/ bewaren.

#### F156 · Major · Nieuw · P2 · Security — recover:*-IPC accepteert een door de renderer gekozen map (met %ENV%-expansie)
- Bewijs 0.5.10: Geverifieerd: main.cjs:338-341 recoverDir(folder) breidt %VAR% uit en accepteert elk absoluut pad; recover:write maakt die map aan (mkdir recursive) en schrijft daar *.autorecover.kcad. Dat breekt de regel uit main.cjs (alleen bekende handles/paden). Wel beperkt tot de eigen bestandsextensie.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Webi F148
- Alias: Webi F148
- Repro: –
- Fix: Map in main vastleggen (userData/backup of een via dialoog gekozen en bewaarde map); de renderer stuurt geen pad mee.

#### F157 · Major · Nieuw · P2 · Weergave — Two/Four View: de extra vensters hebben geen studio-omgeving, modellen worden zwarte silhouetten
- Bewijs 0.5.10: Geverifieerd: ViewPane.tsx:20 maakt een eigen WebGLRenderer zonder makeStudioEnvironment (alleen glSetup.ts:23 roept het aan); shots/m7-fourview.png: Front/Top/Right donkergrijs zonder randen, alleen Isometric normaal.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Webi F150
- Alias: Webi F150
- Repro: –
- Fix: ViewPane via createRenderer (glSetup.ts) laten lopen; dat lost ook F143 op.

#### F151 · Minor · Nieuw · P2 · Testen/CI — Self-tests draaien ongepackaged (packaged:false) en met SwiftShader: geen installer-test en geen echte no-WebGL-test
- Bewijs 0.5.10: Geverifieerd: logs/self-test-nogpu.json:3 en logs/self-test-softgl.json:3 "packaged": false. "Zonder GPU" betekent hier software-GL, niet geen WebGL.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Strati F154, Riki F151, MT5 Dev (MT5D-06/F97)
- Alias: Strati F154, Riki F151, MT5 Dev (MT5D-06/F97)
- Repro: –
- Fix: Self-test ook op de geïnstalleerde exe draaien (Windows) en één run met WebGL echt uit.

#### F163 · Minor · Nieuw · P2 · Merken — Merk- en neutral-checks blind voor Weldments, Sustainability Extras en "reference frames"; docs/26 legt 1-op-1-pass vast
- Bewijs 0.5.10: Geverifieerd: Weldments 0× in tools/rename-trademarks.cjs (29× in src); materials.ts:124/140 "Sustainability Extras"; docs/26-zelfcontrole-1op1.md:1-5 (vergelijking met SOLIDWORKS Design 2026-frames). Volgens Risk missen ook app.css:972, StatusBar.tsx:202, materialDialog.tsx:116 de neutral-check.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Riki F150, Risk F152
- Alias: Riki F150, Risk F152
- Repro: –
- Fix: Patronen toevoegen; docs/26 niet publiceren.

#### F16 · Major · Niet geverifieerd · P3 · Visueel — Iconen en lettertype
- Bewijs 0.5.10: Niet opnieuw naast SOLIDWORKS gelegd; look is in 0.5.6-0.5.7 veranderd (studio look).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Webi: geen SOLIDWORKS-referentieshots in 0.5.1 → pixel-/icoongelijkheid niet geverifieerd (status was "Deels opgelost"). || 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Plaatwerk/eigen iconen; Segoe-referentie niet pixelgelijk; ontwerpronde 0.4.4–0.4.8 verbeterde previews
- Repro: compare
- Fix: Icon-set en lettertype verder afstemmen of workflow-herkenbaarheid als doel houden.

#### F38 · Major · Deels opgelost · P3 · Docs — README/TASKS
- Bewijs 0.5.10: README "Status" stopt bij 0.5.4 terwijl de versie 0.5.10 is (README.md:46); TASKS en commit a3bfaf7 melden 98/98, op Linux niet gehaald.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: 0.5.1: docs/23 zegt eerlijk "Linux en de CI zijn niet gedraaid"; maar commit 358b3ba claimt een Linux-fix die niet standhoudt. || 0.4.8: docs/12 claimt F10/F54 opgelost; commits 0.4.x claimen regressie 86/86; op Linux drawing rood (F93)
- Repro: docs vs logs/regression.log
- Fix: Docs/commits eerlijk houden over Linux-CI.

#### F46 · Major · Deels opgelost · P3 · Performance — CSG/solver op de UI-thread
- Bewijs 0.5.10: Release-builds rebuilden standaard in de worker (rebuildWorker.ts:25-36, perf.rebuildWorker=true); e2e-builds draaien op de UI-thread tenzij ?rebuild=worker. Worker-pass: 5/6 (features TimeoutError na 226 s; rebuildworker 10/10) (logs/regression-worker.log). Budget nog 45 s (F137).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Webi: mesh-CSG draait in de browser nog op de UI-thread; rebuildBudgetMs nog 45 000 (rebuild.ts:875) — zie F137. || 0.5.1: Rebuild-worker (perf.rebuildWorker) bestaat; worker-suite Windows 6/6, self-test "rebuild worker builds the same body 1143/1143". In de browser/zonder pref blijft mesh-CSG synchroon. || 0.4.8: OCCT-worker + solver-worker; mesh-CSG (csg) nog synchroon op UI-thread voor niet-B-rep features; rebuildBudgetMs=45_000 (rebuild.ts:805); brepRefine async na mesh Teamnoot (MT5D/Webi): solver.solveSync enige pad; solver.solve 0 callers; mesh csg() sync; budget 45 000.
- Repro: Zwaar fillet/patroon
- Fix: Mesh-booleans naar worker of budget ~5 s + voortgang; meer features exact via B-rep.

#### F99 · Major · Deels opgelost · P3 · Geometrie — Geen exact-vs-mesh-indicator; STEP voor fallback-bodies onbewezen
- Bewijs 0.5.10: Featuretree toont per body "Exact surfaces (B-rep)"/Faceted (FeatureTreeBody.tsx:354); open faceted resultaat geeft waarschuwing (rebuild.ts:3364). Teamronde: Indicator bestaat (StatusBar.tsx:224 "Faceted n/m"), maar geen test die de indicator of data-exact controleert.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Strati: → Deels — indicator en STEP-waarschuwing bestaan (StatusBar.tsx:213, FeatureTreeBody.tsx:334) maar er is geen e2e-test op de indicator of de STEP-waarschuwing. || 0.5.1: Statusbalk-cel "Faceted n/m" + STEP-waarschuwing (shots/e19-mass-properties.png "Faceted 2/2"). || 0.4.8: Body.exact bestaat; UI toont geen badge/label exact vs benadering. STEP-export sewt mesh-bodies stil (occt.worker shapesToStep); geen waarschuwing als exact < bodies.length. [Strati N3 · MT5D-02]
- Teamronde: Deels volgens Strati: geen test op data-exact / status "Faceted"; MT5 Dev: opgelost. Strengste wint
- Repro: Part met mesh-terugval → Feature Tree; STEP export; check UI-waarschuwing
- Fix: Indicator per body in Feature Tree/statusbalk; warn/block STEP bij non-exact; documenteer welke features exactheid verliezen.

#### F137 · Major · Deels opgelost · P3 · Performance — Rebuild-budget nog 45 s; mesh-CSG op de UI-thread in de browser
- Bewijs 0.5.10: rebuildBudgetMs nog 45 000 (rebuild.ts:875); browser-release gebruikt wel de worker.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Webi/Risk: rebuild.ts:875 `export let rebuildBudgetMs = 45_000` (QA nagelezen); in de browser of zonder perf.rebuildWorker blijft mesh-CSG synchroon (store.ts:1231). 0.4.8-advies niet uitgevoerd. Verwant aan F46/F125.
- Repro: rebuild.ts:875
- Fix: Budget naar ≈5 s met voortgang/annuleren; CSG standaard in de worker.

#### F21 · Minor · Niet geverifieerd · P3 · Visueel — Taakvenster-iconen
- Bewijs 0.5.10: Niet opnieuw naast SOLIDWORKS gelegd; look is in 0.5.6-0.5.7 veranderd (studio look).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Webi: geen SOLIDWORKS-referentieshots in 0.5.1 → pixel-/icoongelijkheid niet geverifieerd (status was "Deels opgelost"). || 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Taakvenster-tabs op referentiemaat (0.3.6); iconen niet volledig hertekend
- Repro: Taakvenster
- Fix: Iconen nalopen.

#### F22 · Minor · Niet geverifieerd · P3 · Visueel — Body-randen
- Bewijs 0.5.10: Niet opnieuw naast SOLIDWORKS gelegd; look is in 0.5.6-0.5.7 veranderd (studio look).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Team 27-10: Webi: geen SOLIDWORKS-referentieshots in 0.5.1 → pixel-/icoongelijkheid niet geverifieerd (status was "Deels opgelost"). || 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Randdikte ongewijzigd
- Repro: Model met body
- Fix: Lijndikte silhouet/randen afstemmen.

#### F24 · Minor · Deels opgelost · P3 · Visueel — Extra rij in Modify
- Bewijs 0.5.10: niet opnieuw getest, status overgenomen.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Modify Reverse sense (0.4.6); extra rij niet opnieuw bewezen weg
- Repro: Smart Dimension dubbelklik
- Fix: Layout naast referentie controleren.

#### F28 · Minor · Deels opgelost · P3 · UX — Bestandsdialoog bij Insert Component
- Bewijs 0.5.10: niet opnieuw getest, status overgenomen.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Code aanwezig; packaged desktop niet hertest deze ronde
- Repro: Insert Component desktop
- Fix: desktop-installed.mjs op Windows.

#### F118 · Minor · Open · P3 · Performance — Bundel weer gegroeid zonder budget: index 849 kB tegen 827 kB in de 0.5.2-claim (claim verouderd)
- Bewijs 0.5.10: build-release: index 849,37 kB (gzip 233,87) — docs/25 claimt 827 kB; groei t.o.v. 0.5.1 (906) wel kleiner, maar de claim klopt niet (logs/build-release.log). Teamronde: Correctie: de claim "919 → 827 kB" staat in TASKS.md:763 (0.5.2) en docs/25:30; het is geen 0.5.10-claim en dus verouderd, niet "onwaar". Strati bouwde 46a1bd9 zelf: 826,66 kB (niet door QA herhaald). Nu 849,37 kB (logs/build-release.log:50): +22,7 kB zonder budget.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: logs/build-release.log.
- Teamronde: Strati, Riki, Risk, MT5 Dev: "827 kB" is een verouderde 0.5.2-claim, niet onwaar; Webi: stale. Ernst blijft Minor
- Repro: npm run build
- Fix: Bundelbudget in CI (bijv. index ≤ 830 kB) en de claim bij elke release opnieuw meten.

#### F124 · Minor · Nieuw · P3 · Scope — Bewuste gaten uit docs/24 (Magnified Selection, Instant2D, virtual-sharp flange, 3D-schetsmaten)
- Bewijs 0.5.10: niet opnieuw getest, status overgenomen.
- Historie (bewijsbestanden in report-0.5.1/): docs/24 somt ze zelf op.
- Repro: docs/24
- Fix: Op roadmap of uit UI.

#### F129 · Minor · Deels opgelost · P3 · Docs — Verouderde docs en tellingen
- Bewijs 0.5.10: docs/23 bijgewerkt; maar README-status 0.5.4, docs/25 noemt het 0.5.1-rapport "6/10" (was 5/10 na teamronde).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Strati N7: docs/23:4 zegt nog "Linux en de CI zijn niet gedraaid, omdat de branch niet gepusht wordt" (branch is gepusht); Risk: README.md:69/74/79 idem/onbewezen. Ook dit QA-rapport noemde 124 i.p.v. 125 bevindingen (§12) — gecorrigeerd.
- Repro: docs/23 r.4; README.md
- Fix: Docs bijwerken; geen "groen" zonder run-link.

#### F134 · Minor · Deels opgelost · P3 · Code — Line-budget-caps staan op de huidige grootte, niet op een doel (MT5D-08)
- Bewijs 0.5.10: Caps bevroren op huidige grootte en verlaagd bij splitsing (repo: tools/line-budget.cjs). Teamronde: logs/ci-checks.log: "rebuild.ts … above the goal of 1000"; caps op grootte+1 (tools/line-budget.cjs:13-22).
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: MT5 Developer: tools/line-budget.cjs caps vs wc -l (QA nageteld): rebuild.ts 3499/3500, Viewport.tsx 1699/1700, store.ts 1445/1450, slices/features.ts 1592/1600.
- Teamronde: Deels opgelost volgens MT5 Dev (caps, geen doelen; geen splitsplan); QA had Opgelost
- Repro: node tools/line-budget.cjs
- Fix: Caps verlagen als doel en monolieten opsplitsen.

#### F136 · Minor · Deels opgelost · P3 · Juridisch/Tooling — Neutral-comments-check incompleet
- Bewijs 0.5.10: repo-script neutral-comments.cjs scant e2e/ niet: 15+ e2e-bestanden verwijzen naar "reference video/frame" en één naar "the SOLIDWORKS reference frame" (e2e/tools/tune-shade.mjs:1); in src nog bodyScene.ts:688 "(reference frames: …)" dat de regex mist.
- Historie (bewijsbestanden in report-0.5.1/): 0.5.1: Risk R5: electron/main.cjs:2 "as the original" (QA nagelezen) wordt niet gevangen; ook "reference frames/videos" en frame-tags (\d{2}/\d{4}) niet.
- Repro: node tools/neutral-comments.cjs --check (in de repo) en rg -n "reference frame" e2e/
- Fix: Regex uitbreiden.

#### F138 · Minor · Nieuw · P3 · Build/Security — npm audit: 17 kwetsbaarheden (15 moderate, 2 high) in de electron-builder-keten
- Bewijs 0.5.10: logs/audit.log: follow-redirects 1.16.1, joi 18.3.0, minimatch 10.2.6; --omit=dev: 0 (logs/audit-prod.log). Zelfde versies als 0.5.1 → nieuwe advisories, alleen build-tijd.
- Historie (bewijsbestanden in report-0.5.1/): –
- Repro: npm audit
- Fix: electron-builder/overrides bijwerken.

#### F141 · Minor · Nieuw · P3 · Assembly — Bij conflict wordt de oudere mate als fout gemarkeerd, niet de nieuwe
- Bewijs 0.5.10: QA M2: m1 (10) en m2 (20) → B y=30 (voldoet aan m2), violated ["m1"] (logs/qa-strict-tests.log). SOLIDWORKS houdt de bestaande mate en markeert de nieuw toegevoegde.
- Historie (bewijsbestanden in report-0.5.1/): –
- Repro: vitest qaStrict › M2
- Fix: Mates in volgorde van aanmaak oplossen; de laatst toegevoegde conflicterende mate markeren.

#### F142 · Minor · Nieuw · P3 · Repo — graphify-out (64 MB, 193 bestanden) gecommit
- Bewijs 0.5.10: git ls-files graphify-out = 193; du -sh 64M; diff 46fc2f3..HEAD wordt erdoor gedomineerd (222 bestanden).
- Historie (bewijsbestanden in report-0.5.1/): –
- Repro: git ls-files graphify-out | wc -l
- Fix: In .gitignore zetten en uit de index halen.

#### F146 · Minor · Nieuw · P3 · Testen/CI — sheetexport: PDF-viewerstap slaat over op Linux (file-URL fout opgebouwd)
- Bewijs 0.5.10: e2e/sheetexport.mjs:72 bouwt 'file:///' + cwd + '/' + OUT terwijl OUT op Linux absoluut is (/tmp/phlippo-e2e) → ERR_FILE_NOT_FOUND, skip; sheet-pdf.png is dan een foutpagina (logs/regression.log). De PDF-inhoud zelf wordt wel gecheckt.
- Historie (bewijsbestanden in report-0.5.1/): –
- Repro: node e2e/sheetexport.mjs op Linux
- Fix: pathToFileURL(resolve(OUT,'sheet.pdf')) gebruiken.

#### F161 · Minor · Nieuw · P3 · Weergave — Shading-naad en spikkels; STEP-import toont mesh ("300 triangles")
- Bewijs 0.5.10: Volgens Webi: naad in shots/e10-fillet.png, spikkels in e19, STEP-import als mesh (shots/step-imported.png). Niet zelf opnieuw beoordeeld door QA: niet geverifieerd.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Webi F152
- Alias: Webi F152
- Repro: –
- Fix: Normalen/AO bij exacte bodies nakijken; STEP-import als B-rep tonen.

#### F162 · Minor · Nieuw · P3 · Security — gpu:setSoftware bewaart enable-unsafe-swiftshader permanent in gpu.json
- Bewijs 0.5.10: Geverifieerd: main.cjs:35-44 leest gpu.json vóór Chromium start en zet enable-unsafe-swiftshader; main.cjs:388 gpu:setSoftware schrijft die keuze weg.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Webi F153
- Alias: Webi F153
- Repro: –
- Fix: Alleen per sessie of met duidelijke melding en terugzetknop.

#### F164 · Minor · Nieuw · P3 · Testen/CI — src/core/drawing/dbg.test.ts is een debugtest zonder assertie en telt mee in de 454
- Bewijs 0.5.10: Geverifieerd: het enige *.test.ts in src zonder expect/assert (rg --files-without-match).
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Risk F155
- Alias: Risk F155
- Repro: –
- Fix: Verwijderen of asserties toevoegen.

#### F165 · Minor · Nieuw · P3 · Data — Oude "SW-Density" in vergelijkingen wordt bij openen niet omgezet
- Bewijs 0.5.10: Geverifieerd: equations.ts:262 accepteert ^(?:SW-)?Density$ bij lezen; geen herschrijving van bestaande expressies gevonden.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Risk F156
- Alias: Risk F156
- Repro: –
- Fix: Bij openen herschrijven naar "Density".

#### F166 · Minor · Nieuw · P3 · Assembly — solveMates stopt stil na een vast aantal passes; niet-convergentie is niet te onderscheiden van een conflict
- Bewijs 0.5.10: Geverifieerd: assembly.ts:441 for (pass < passes); mateStatus.ts heeft volgens Riki (:8,18) geen aparte status voor niet-convergentie (niet regel voor regel door QA nagelezen).
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; Riki F152
- Alias: Riki F152
- Repro: –
- Fix: Status "niet geconvergeerd" met residu tonen.

#### F169 · Minor · Deels opgelost · P3 · QA-rapport — QA-diagnoselog bevat een foute theoriewaarde (T2diag)
- Bewijs 0.5.10: Geverifieerd: qaDiag.test.ts:45 gebruikte R − 3 + 3k i.p.v. R − 3k (k = (10−3π)/(12−3π)). Bron gecorrigeerd in tools/qa-src/qaDiag.test.ts; juiste theorie 355,93 / 428,74 (gelijk aan B-rep). logs/qa-diag.log is niet opnieuw gegenereerd en toont nog 335,79 / 408,60. Het T2-oordeel gebruikte al de juiste waarde.
- Historie (bewijsbestanden in report-0.5.1/): –
- Teamronde: Nieuw in de teamronde; MT5 Dev F149
- Alias: MT5 Dev F149
- Repro: –
- Fix: qaDiag opnieuw draaien bij de volgende QA-ronde.

### 6.3 Deze ronde gesloten

| ID | Was | Ernst | Titel | Bewijs 0.5.10 |
|---|---|---|---|---|
| F100 | Deels opgelost | Major | desktop-nohooks niet in CI | ci.yml:27-29 draait desktop-nohooks met PHLIPPO_SOFTWARE_GL=1; op de box 10/10 incl. 'WebGL runs on SwiftShader' en About 0.5.10 (logs/desktop-nohooks-softgl.log). |
| F108 | Nieuw | Kritiek | Mates: geen over-/onderbepaald-detectie; conflicterende mates stil opgelost | QA M2: conflict wordt gedetecteerd (B "over", violated ["m1"]); M5 lus-conflict ook gedetecteerd (logs/qa-strict-tests.log). Kanttekening: de oudere mate wordt als fout gemarkeerd i.p.v. de nieuwe (F141). |
| F109 | Nieuw | Kritiek | Mate-solver is richtingsafhankelijk: component op refs[0] wordt nooit verplaatst | QA M1 in beide refs-volgordes B=25, C=10; M3 keten van 4 in slechtste volgorde correct; M5 gesloten lus correct (logs/qa-strict-tests.log). |
| F110 | Nieuw | Major | Fillet op revolve-rand faalt na wijziging van de schetsmaat (mesh-kernel) | QA T2 mesh: geen fout, verlies 432,68 vs theorie 428,74 (R30: 359,14 vs 355,93); B-rep exact 428,74/355,93 (logs/qa-strict-tests.log, logs/qa-brep-tests.log). |
| F113 | Nieuw | Major | Geen feature-reorder (slepen in de boom) | Slepen in de boom met canDrop/onDrop (FeatureTreeBody.tsx:213) + core/features/reorder.ts met reorder.test.ts; e2e/reorder.mjs:52-69 sleept met dragTo, 10/10 (logs/regression.log). |
| F116 | Nieuw | Major | "SW-Density" zichtbaar als File Property in vergelijkingen | Geen "SW-Density" meer zichtbaar; equations.ts:262 accepteert de oude naam alleen bij inlezen. |
| F123 | Nieuw | Minor | Schets-solver mist relaties: Intersection, Merge, Equal curvature (G2), AlongX/Y/Z; geen 3D-maten | Intersection/Merge/Equal Curvature in solver (equations.ts:307-323) met relations2.test.ts; AlongX/Y/Z hoort bij 3D-schets (F124). |
| F127 | Nieuw | Major | Zonder GPU faalt "Fillet1 is exact" (exactVolume undefined): exactheid hangt af van GPU/timing | Self-test zonder GPU 8/8, Fillet1 exact 44742,52 (logs/self-test-nogpu.json); software-GL 8/8 (logs/self-test-softgl.json). |
| F128 | Nieuw | Major | CI rood by design: desktop-nohooks en self-test zonder SwiftShader vóór de regressie; artefacten stil leeg | ci.yml: desktop-nohooks met PHLIPPO_SOFTWARE_GL=1 en self-test --software-gl, continue-on-error met eindstap die faalt; regressielog-artefact if-no-files-found: error. (Screenshots nog "ignore".) |
| F131 | Nieuw | Major | Geregistreerd merk "3D ContentCentral" zichtbaar in Options ▸ Search | "3D ContentCentral" weg uit src/electron; repo-tools/rename-trademarks.cjs:20 vervangt het. |
| F132 | Nieuw | Major | Merkencheck rename-trademarks.cjs kent "Weldments", "SW-" en "3D ContentCentral" niet → CI groen ondanks merken | Merkencheck + uiText.test dekken SW-, Pack and Go, MBD, SOLIDWORKS, 3D ContentCentral (logs/ci-checks.log EXIT=0). |
| F133 | Nieuw | Minor | ≈80 ingeslikte catches in e2e-scripts | 19 .catch(() => …) over: 4 in regressiescripts, allemaal gerichte terugval (Escape/alternatieve klik); 15 in e2e/tools (niet in de regressie). |
| F135 | Nieuw | Major | Statusbalk-prompts letterlijk uit SOLIDWORKS-video's + video-frame-tags in code | Alle statusbalk-prompts herschreven in eigen woorden (git diff 46fc2f3..HEAD -- src/app/StatusBar.tsx); frame-tags uit StatusBar weg. |
| F168 | — | Minor | Fouten in het eerste QA-rapport 0.5.10 (formule, round2b, 827 kB, CI groen, Windows-log, Faceted-bewijs, 19/19) | Gecorrigeerd in deze versie: (a) 8,584 mm³ = 10·R²·(1−π/4), niet 10·(4−π)·R²; (b) round2b bevat 98+12+6 en is een kopie (F148); (c) 827 kB is verouderd (0.5.2-claim), niet onwaar; (d) de repo claimt geen "CI groen" (README.md:55-56), wel een CI-B-rep-pass (README.md:90), die onbewezen is; (e) het 98/98-log draaide op de niet-gecommitte 0.5.10-werkboom; (f) "Faceted 1/1" komt uit de e2e-build; (g) TASKS.md:814 claimt wel 19/19 voor 0.5.10. |
| F170 | — | Minor | Pariteit was te mild bij stille fouten | Herberekend (§5): stil fout resultaat ⇒ kapot (rij 11); rij 3, 30, 41 en 52 naar deels. 70,2 % → 66,1 %. |

*Verder 85 bevindingen die al in eerdere rondes waren opgelost (zie findings.json).*


## 7. Teamoordeel

Vijf reviewers lazen dit rapport, de logs, shots en de code (team/strati.md, team/riki.md, team/webi.md, team/risk.md, team/mt5dev.md). Regel: **de strengste score en de strengste ernst per bevinding winnen.** Elke teamclaim die de score of een ernst verandert, heeft QA zelf nagelopen in code of logs. Wat QA niet zelf kon nagaan, staat als "niet geverifieerd".

### 7.1 Oordeel per teamlid

| Teamlid | Score | Klaar | Publiceren | Eigen gebruik | Top 3 (kort) |
|---|---|---|---|---|---|
| QA (eerste oordeel) | 6/10 | NO-GO | NO-GO | Voorwaardelijk GO | F140 stil fout op B-rep; Linux 93/98; claims |
| Strati | **5/10** | NO-GO | NO-GO | Voorwaardelijk GO | Stille geometrie (F140/F139/F111); eerlijkheid claims (98/98 hergebruikt, 19/19 zonder log); gevel zonder product (F112, F50, signing, CI) |
| Riki | **5/10** | NO-GO | NO-GO | Voorwaardelijk GO | F140 op de releasekernel; F139/F51 mesh-gatrand; CI verbergt B-rep/worker (F147) en geen Actions-run |
| Webi | **5/10** | NO-GO | NO-GO | Voorwaardelijk GO | F140/F139; bewijsintegriteit (round2b = 0.5.9-run); pariteit zonder SOLIDWORKS-referentie |
| Risk & Optimization | 6/10 | NO-GO | NO-GO | Voorwaardelijk GO | F140 + geen volume-kruiscontrole (F159) + F139; CI vertelt de waarheid niet (F147, F155, F160); AutoRecover-dataverlies (F153/F154) |
| MT5 Developer | **5/10** | NO-GO | NO-GO | Voorwaardelijk GO | F140 (+F111); F139; CI en claims (F54/F31/F93) |
| **Eindoordeel** | **5/10** | **NO-GO** | **NO-GO** | **Voorwaardelijk GO** | Strengste score wint (4 van 5 reviewers: 5/10) |

Pariteit per reviewer: Strati 66,9 % (41,5/62), Riki 68,5 %, Risk 66,9 % (41,5/62), MT5 Dev 68,5 %, Webi geen getal (rij 3 overgeteld; rijen 3, 25 en 41 alleen code, 9 en 34 alleen unit-tests; 0 van 62 rijen met een SOLIDWORKS-referentie). **Strengste verdedigbare combinatie: 66,1 % (41/62)**: rij 3, 30, 41 en 52 naar deels, rij 11 naar kapot (stil fout resultaat op beide kernels). Rij 25 (reorder) blijft aanwezig: daar is e2e-bewijs (reorder 10/10, dragTo). Rijen 8, 14 en 24 blijven aanwezig met de notitie dat features pas bij herhaling groen werd (F145). Ook 66,1 % is een bovengrens zolang er geen beeld-voor-beeld-vergelijking met echte SOLIDWORKS is (F16/F21/F22).

### 7.2 Ernstcorrecties (wie wilde wat)

| ID | Titel | QA (eerste versie) | Na teamronde | Wie wilde wat |
|---|---|---|---|---|
| F31 | e2e-exitcodes / CI / niet-gecommit werk | Major / Deels opgelost | **Kritiek / Deels opgelost / P0** | Kritiek volgens Strati, Webi en MT5 Dev; Major volgens QA, Riki en Risk (Risk: "wie F147 niet apart boekt, moet F31 Kritiek houden"). Strengste wint: Kritiek |
| F49 | Release-hardening (heropend; samengevoegd met F117) | Major / Open | **Major / Open / P2** | Major volgens QA en alle reviewers; NotSigned op 2-11 opnieuw gemeten (F150) |
| F50 | SW-handelsmerken | Major / Deels opgelost | **Kritiek / Deels opgelost / P1** | Kritiek volgens Strati; Major volgens QA, Riki, Webi, Risk en MT5 Dev. Strengste wint: Kritiek. Alle reviewers: blokkeert publiceren, niet eigen gebruik |
| F51 | Mesh-kernel | Kritiek / Deels opgelost | **Kritiek / Deels opgelost / P1** | Kritiek volgens QA en alle reviewers |
| F54 | CI rood op Linux; 'regressie groen' niet reproduceerbaar | Major / Open | **Kritiek / Open / P0** | Kritiek volgens MT5 Dev (P0 die "klaar" blokkeert = Kritiek volgens §11); QA had Major |
| F93 | Docs/commits claimen 98/98 terwijl de Linux-regressie rood blijft | Kritiek / Deels opgelost | **Kritiek / Deels opgelost / P1** | Kritiek volgens QA en alle reviewers |
| F97 | Packaged app:// + OCCT WASM niet smoke-getest op Windows | Kritiek / Opgelost | **Major / Deels opgelost / P2** | Deels opgelost volgens MT5 Dev (self-test niet gepackaged); QA had Opgelost. Ernst Kritiek → Major (QA): app:// + WASM zijn bewezen, alleen de packaging-laag niet |
| F99 | Geen exact-vs-mesh-indicator; STEP voor fallback-bodies onbewezen | Major / Opgelost | **Major / Deels opgelost / P3** | Deels volgens Strati: geen test op data-exact / status "Faceted"; MT5 Dev: opgelost. Strengste wint |
| F105 | B-rep-pad bijna nooit in regressie geoefend | Major / Deels opgelost | **Kritiek / Deels opgelost / P0** | Kritiek volgens Strati; QA had Major. MT5 Dev: deels, in CI onbereikbaar bij rode mesh-pass |
| F111 | Fillet-rand die door een eerder ingevoegde feature gesplitst wordt: maar één deel afgerond, zonder waarschuwing | Major / Deels opgelost | **Kritiek / Deels opgelost / P0** | Kritiek volgens Strati en MT5 Dev ("of sluiten en onderbrengen in F140"); Major volgens QA, Riki en Risk (alleen zolang F140 Kritiek blijft). Strengste wint: Kritiek |
| F117 | Installer/exe niet code-signed (samengevoegd met F49) | Major / Open | **Major / Open / P2** | Major volgens QA en alle reviewers; NotSigned op 2-11 opnieuw gemeten (F150) |
| F118 | Bundel weer gegroeid zonder budget: index 849 kB tegen 827 kB in de 0.5.2-claim (claim verouderd) | Minor / Open | **Minor / Open / P3** | Strati, Riki, Risk, MT5 Dev: "827 kB" is een verouderde 0.5.2-claim, niet onwaar; Webi: stale. Ernst blijft Minor |
| F119 | Regressierunner verbergt skip()-regels: "groen" kan overgeslagen checks bevatten | Major / Opgelost | **Major / Deels opgelost / P1** | Deels heropend volgens Webi en Risk: skips worden geteld maar laten een run nooit falen (F155); QA had Opgelost |
| F120 | CI-B-rep-pass draait 9 scripts, lokaal 11 (qa2, facenames ontbreken) | Major / Opgelost | **Major / Deels opgelost / P1** | Deels opgelost volgens Strati en MT5 Dev: de lijst klopt, maar de stap wordt in CI niet bereikt; QA had Opgelost |
| F122 | Standaardaanzichten zonder automatische centermarks/verborgen lijnen | Major / Opgelost | **Major / Deels opgelost / P2** | Deels volgens Webi en Risk: alleen unit-tests, geen e2e; verborgen lijnen in geen enkele shot; centermarks ontbreken in Detail B van shots/deurkruk-tekening.png; QA had Opgelost |
| F125 | rebuildworker-e2e timing-flaky (frame-gap-check zelf groen) | Minor / Deels opgelost | **Major / Deels opgelost / P2** | Major volgens MT5 Dev (rebuildworker rood in de standaardrun); QA had Minor |
| F126 | Windows-regressielog is geplakt, geen ruwe runner-output | Major / Deels opgelost | **Major / Deels opgelost / P2** | Strati, Webi, Riki: QA-tekst was fout ("round2b bevat maar 6 scripts") |
| F134 | Line-budget-caps staan op de huidige grootte, niet op een doel (MT5D-08) | Minor / Opgelost | **Minor / Deels opgelost / P3** | Deels opgelost volgens MT5 Dev (caps, geen doelen; geen splitsplan); QA had Opgelost |
| F139 | Mesh-fillet op een gatrand voegt volume toe i.p.v. af te nemen (fout zonder foutmelding) | Major / Nieuw | **Kritiek / Nieuw / P0** | Kritiek volgens Strati, Riki, Webi, Risk en MT5 Dev (unaniem); QA had Major |
| F140 | B-rep (standaard in release): fillet op gesplitste rand rondt een extra rand van 10 mm af | Kritiek / Nieuw | **Kritiek / Nieuw / P0** | Kritiek volgens QA en alle vijf reviewers (unaniem) |
| F143 | Multi-view (ViewPane) maakt een WebGLRenderer zonder try/catch: zonder WebGL crasht 2/4-view | Major / Nieuw | **Major / Nieuw / P1** | Major volgens QA en alle reviewers; Riki: ernstiger dan gedacht |
| F145 | features-script niet-deterministisch: Sweep1 "path sketch has no lines" met volgfouten (oorzaak niet geverifieerd) | Minor / Nieuw | **Major / Nieuw / P1** | Major volgens Riki en MT5 Dev (en Risk bij herhaling); QA had Minor |

Niet gewijzigd en door alle reviewers aanvaard: F112 → Major, F115 → Major (F143 resteert). F140, F51 en F93 blijven unaniem Kritiek.

### 7.3 Voorwaarden voor eigen gebruik (samengevoegd)

Alle zes oordelen geven een voorwaardelijk GO voor eigen concept- en hobbywerk, onder deze voorwaarden:

1. **Alleen de desktop-release met B-rep aan** (standaard). Niet de browser en niet de mesh-terugval vertrouwen. Staat er "Faceted n/m" in de statusbalk, dan is dat body een mesh-benadering: geen volumes of STEP daarvan vertrouwen (F51/F139).
2. **Geen fillets op randen die later door een sleuf/boss/snede gesplitst worden**, en geen fillets op gatranden van mesh-bodies. Doe je het toch: na **elke** fillet of chamfer Mass Properties nameten tegen je verwachting (F140/F139/F111).
3. **Massa en volume altijd zelf narekenen** bij werk dat moet kloppen; niets voor productie, klanten of maakwerk zonder eigen meting (F140/F139/F159).
4. **Zelf regelmatig opslaan met Ctrl+S** en eigen back-ups maken. Vertrouw AutoRecover niet bij twee open documenten met dezelfde naam, sla een herstelde kopie meteen op, en gooi de .bak/.bak2-kopieën niet weg (F153/F154; main.cjs:142-144).
5. **Geen Two/Four View** op een pc zonder WebGL (crasht de hele UI, F143), en vertrouw de extra vensters niet visueel (zwart, F157).
6. **Mate-conflicten zelf nakijken**: bij een conflict markeert Phlippo de oudere mate (F141); niet-convergentie is niet zichtbaar (F166).
7. **Niet publiceren of delen** (installer, website): ongesigneerd (F150), Weldments/trade dress (F50/F163), CI onbewezen (F31/F54/F147).

### 7.4 Nieuwe bevindingen uit de teamronde (ontdubbeld, F147–F170)

De reviewers nummerden elk vanaf F147; die nummers botsten. Hieronder de unieke nummering met de oorspronkelijke ID's als alias.

| ID | Ernst | Prio | Status | Titel | Aliassen (reviewer-ID) |
|---|---|---|---|---|---|
| F147 | Major | P0 | Nieuw | CI: mesh-, B-rep- en worker-regressie in één run-stap met bash -e; B-rep en worker draaien nooit zolang mesh rood is | Strati F148, Riki F147, Risk F148, MT5 Dev F147 |
| F148 | Major | P1 | Nieuw | Windows-log round2b is een kopie van het 0.5.9-log; het 98/98-log draaide op een niet-gecommitte werkboom | Strati F147, Webi F147, Riki F149a/b |
| F149 | Major | P1 | Nieuw | Claims zonder platform of log: 98/98 zonder "Windows", "CI draait B-rep-pass", "0.5.10 geïnstalleerd (19/19)" | Riki F148, Strati F152, Webi (19/19), Risk §4.5 |
| F150 | Major | P2 | Nieuw | Build-log meldt "signing with signtool.exe", maar alle 0.5.10-binaries zijn NotSigned | Strati F153, Risk F154, MT5 Dev F151 |
| F151 | Minor | P2 | Nieuw | Self-tests draaien ongepackaged (packaged:false) en met SwiftShader: geen installer-test en geen echte no-WebGL-test | Strati F154, Riki F151, MT5 Dev (MT5D-06/F97) |
| F152 | Major | P1 | Nieuw | De strikte QA-tests (T1/T3/M1-M5) staan buiten de repo; geen gate vangt F139/F140 | Strati F155 (vervolg F130 / team-N8) |
| F153 | Major | P1 | Nieuw | AutoRecover heeft alleen de documentnaam als sleutel: documenten met dezelfde naam overschrijven en wissen elkaars kopie | Risk F150 |
| F154 | Major | P1 | Nieuw | Herstelde AutoRecover-kopie opent als "opgeslagen" (dirty:false), zonder fsync en zonder e2e-test | Risk F151 (Riki: desktop-restore-autosave niet in CI) |
| F155 | Major | P1 | Nieuw | skip() telt als groen: ~120 optionele stappen kunnen overslaan zonder dat een run faalt | Webi F149, Risk F153 (heropent F119 deels) |
| F156 | Major | P2 | Nieuw | recover:*-IPC accepteert een door de renderer gekozen map (met %ENV%-expansie) | Webi F148 |
| F157 | Major | P2 | Nieuw | Two/Four View: de extra vensters hebben geen studio-omgeving, modellen worden zwarte silhouetten | Webi F150 |
| F158 | Major | P1 | Nieuw | De release rebuildt in de worker, maar de regressie draait standaard op de UI-thread | Webi F151 |
| F159 | Major | P0 | Nieuw | B-rep-resultaat vervangt het mesh-resultaat zonder volume-kruiscontrole; mesh-waarschuwingen van exacte bodies worden weggegooid | Risk F147 |
| F160 | Major | P1 | Nieuw | Regressielog per pass overschreven: B-rep-bewijs verdwijnt uit het CI-artefact | Risk F149 |
| F161 | Minor | P3 | Nieuw | Shading-naad en spikkels; STEP-import toont mesh ("300 triangles") | Webi F152 |
| F162 | Minor | P3 | Nieuw | gpu:setSoftware bewaart enable-unsafe-swiftshader permanent in gpu.json | Webi F153 |
| F163 | Minor | P2 | Nieuw | Merk- en neutral-checks blind voor Weldments, Sustainability Extras en "reference frames"; docs/26 legt 1-op-1-pass vast | Riki F150, Risk F152 |
| F164 | Minor | P3 | Nieuw | src/core/drawing/dbg.test.ts is een debugtest zonder assertie en telt mee in de 454 | Risk F155 |
| F165 | Minor | P3 | Nieuw | Oude "SW-Density" in vergelijkingen wordt bij openen niet omgezet | Risk F156 |
| F166 | Minor | P3 | Nieuw | solveMates stopt stil na een vast aantal passes; niet-convergentie is niet te onderscheiden van een conflict | Riki F152 |
| F167 | Major | P0 | Nieuw | De voorgestelde fix voor F140 zit op de verkeerde laag; de oorzaak is niet bekend | MT5 Dev F148 |
| F168 | Minor | P4 | Opgelost | Fouten in het eerste QA-rapport 0.5.10 (formule, round2b, 827 kB, CI groen, Windows-log, Faceted-bewijs, 19/19) | Strati F149/F150/F151, Riki F149c-e, MT5 Dev F150, Risk §4.1/§4.5, Webi (F126) |
| F169 | Minor | P3 | Deels opgelost | QA-diagnoselog bevat een foute theoriewaarde (T2diag) | MT5 Dev F149 |
| F170 | Minor | P4 | Opgelost | Pariteit was te mild bij stille fouten | MT5 Dev F152; Strati, Riki, Risk, Webi (pariteitsnotities) |

## 8. Fixlijst voor Claude (na teamronde)

### P0 (eerst; blokkeert "klaar")
1. **F140 + F167 + F111**: eerst diagnose: log de gematchte mesh-randen en de gevonden OCCT-randen voor QA-T3. Maak B-T3 een B-rep-unit-test die 30439,91 ± 0,01 mm³ eist, en repareer pas dan de matcher (splitPieces filtert al colineair en binnen de rand; de fout zit waarschijnlijk in de B-rep-vertaling, niet geverifieerd).
2. **F159**: volume-kruiscontrole exact tegen mesh in brepRefine.ts (bij > 0,5 % afwijking: melding en feature markeren). Goedkoop, en het maakt F140-achtige fouten zichtbaar.
3. **F139**: de mesh-fillet op een gatrand moet volume wegnemen of netjes weigeren met een fout. Test op het verlies t.o.v. het eigen scherpe volume (QA-T1, Ø35 en Ø35→50).
4. **F147 + F31 + F120 + F105**: ci.yml opsplitsen in drie stappen (mesh, B-rep, worker) met id + continue-on-error en een eindgate; daarna een **link naar een groene GitHub Actions-run** op deze HEAD.
5. **F54/F144/F10**: Linux-regressie echt groen: drawing (Ø35 picked:false), inventory47 en videos46 (context-toolbar).

### P1
6. **F93/F148/F149/F126/F38/F129**: claims alleen nog met platform, commit-hash en een ruw log van precies die commit; logs nooit hergebruiken of samenplakken; "0.5.10 geïnstalleerd 19/19" onderbouwen of schrappen; README-status naar 0.5.10.
7. **F152**: de QA-tests (qaStrict, qaBrep) in de repo opnemen als vitest-suite in CI.
8. **F155/F119 + F160**: skipbudget per script en skips in de eindgate; regressielog per pass een eigen bestandsnaam.
9. **F158/F46**: de hoofdregressie op het releasepad (worker + B-rep) draaien.
10. **F153/F154**: AutoRecover op pad/document-id, herstel als dirty "(Recovered)", fsync, en desktop-restore-autosave in CI.
11. **F145**: oorzaak van de Sweep1-fout "path sketch has no lines" vinden (app- of testrace).
12. **F143/F157**: ViewPane via createRenderer met studio-omgeving en nette melding zonder WebGL; een ErrorBoundary per venster.
13. **F50/F163/F94**: "Weldments" en "Sustainability Extras" hernoemen, de merk- en neutral-checks uitbreiden, docs/26 niet publiceren.
14. **F51**: B-rep ook voor de plastics-features, en een duidelijke "Faceted"-waarschuwing bij elke mesh-terugval.

### P2
15. **F150/F49/F117**: code-signing (of een expliciete "unsigned"-melding) vóór elke publieke verspreiding; AuthenticodeSignature bij elke release loggen.
16. **F151/F97**: self-test op de geïnstalleerde exe (Windows), plus een run met WebGL echt uit.
17. **F156**: recover-map in main vastleggen; geen renderer-gekozen pad.
18. **F112**: de meest gebruikte opties echt aansluiten (backup/AutoRecover, eenheden, grid/snap, kleuren).
19. **F114**: IGES (en eventueel Parasolid via OCCT); DWG optioneel.
20. **F122**: verborgen lijnen en centermarks met een e2e-check en een shot; centermarks in detailaanzichten.
21. **F125/F105**: features- en rebuildworker-e2e deterministisch maken (wachten op "rebuild klaar").
22. **F121**: plastics op B-rep; Toolbox-light.

### P3
F141 (markeer de nieuwe mate), F166 (niet-convergentie tonen), F142 (graphify-out uit de repo), F138 (audit), F146 (pathToFileURL), F136 (neutral-comments over e2e/), F137 (rebuildbudget), F118 (bundelbudget), F134 (line-budget-doelen), F161 (shading/STEP-mesh), F162 (gpu.json), F164 (dbg.test.ts), F165 (SW-Density omzetten), F99 (test op de Faceted-indicator), F16/F21/F22 (pixelvergelijking naast echte SOLIDWORKS-shots).

## 9. Score per gebied (QA, bijgewerkt na teamronde)

| Gebied | 0.5.1 | 0.5.10 | Toelichting |
|---|---|---|---|
| Sketcher | 7 | 8 | Nieuwe relaties, conflictdetectie; 3D-schetsmaten en Instant2D ontbreken |
| Features | 6 | 7 | Plastics, sweep/loft/sheet metal/weldments aanwezig; veel op mesh-terugval |
| Topologie / robuustheid geometrie | 3 | 4 | T2 en mesh-T3 goed; B-rep-T3 (F140) en mesh-T1 (F139) stil fout |
| Assembly | 3 | 7 | Solver en conflict werken nu; mechanische mates ongetest; geen Toolbox |
| Tekeningen | 6 | 7 | Centermarks, HLR, PDF/DXF; Ø35-maat op Linux kapot |
| UI / look | 7 | 8 | Zeer dicht bij SOLIDWORKS; Options eerlijk maar grotendeels inert; "Weldments" |
| Import/export | 5 | 6 | STEP exact, PDF/DXF; geen IGES/DWG/Parasolid |
| Tests / CI / eerlijkheid | 4 | 4 | 454 unit, goede runner, desktop-checks werken; Linux rood, claims weer te rooskleurig |
| Release / installer | 4 | 4 | Builds OK; ongesigneerd terwijl het build-log "signing" meldt (F150) |
| **Totaal** | **5** | **5** | QA gaf eerst 6; na de teamronde 5 (strengste wint): stil foute geometrie op beide kernels, CI die B-rep/worker niet kan draaien, en claims die weer niet kloppen |

## 10. Voorwaardelijk gebruik

| Gebruik | Oordeel | Voorwaarde / reden |
|---|---|---|
| Eigen concept- en hobbymodellen, schetsen, eenvoudige onderdelen | **Ja, onder de voorwaarden van §7.3** | Desktop-release (B-rep) gebruiken; na elke fillet het volume/de vorm nakijken |
| Fillets op randen die later gesplitst worden (sleuf/boss over een gefilleteerde rand) | **Nee** | F140: een extra rand wordt stil afgerond |
| Fillet op gatranden op mesh-bodies ("Faceted" in de statusbalk) | **Nee** | F139: volume klopt niet, bij Ø35 zonder melding |
| Assemblages met standaard-mates | **Ja, met controle** | Solver werkt (M1–M5); bij een conflict markeert hij de oudere mate (F141); niet-convergentie onzichtbaar (F166) |
| Mechanische mates (cam, screw, rack-pinion…) | **Beperkt** | Geen gedragstests |
| Tekeningen naar PDF/DXF | **Ja, met controle** | Ø-maten nakijken (F10) |
| STEP uitwisselen | **Ja** | Exact via OCCT (self-test, step 11/11) |
| Werk voor klanten / maatvoering die moet kloppen | **Nee** | F139/F140/F159; geen IGES/DWG |
| Vertrouwen op AutoRecover | **Nee** | Sleutel op naam (F153), herstel als "opgeslagen" (F154); zelf Ctrl+S |
| Publiceren of delen (installer, website) | **Nee** | Ongesigneerd (F117/F150), "Weldments" (F50), CI onbewezen (F54/F147) |
| Zonder GPU / op een oude laptop | **Ja, met beperking** | Self-test 8/8 met software-GL (niet gepackaged, F151); vermijd 2/4-view (F143/F157) |

## 11. Werkwijze en beperkingen van deze QA

- Alle runs op de box (Linux, xvfb, Playwright-Chromium met SwiftShader, Electron 0.5.10 uit de kloon). De Windows-laptop is alleen gelezen. Het enige wat naar de laptop is geschreven, is dit rapport.
- De e2e-regressie is volledig gedraaid (mesh, B-rep, worker). De rode scripts zijn daarna opnieuw gedraaid om flakes van echte fouten te scheiden.
- De eigen tests (`tools/qa-src/` (qaStrict, qaBrep, qaDiag)) draaien met `npx vitest run` nadat je ze tijdelijk in `src/qa/` zet. Op de box zijn ze daarna uit de kloon verwijderd.
- Niet geverifieerd: pixelgelijkheid naast echte SOLIDWORKS-screenshots (F16/F21/F22), een GitHub Actions-run (privé-repo, geen toegang), de geïnstalleerde 19/19-claim voor 0.5.10, of het Windows-98/98-log gelijk is aan de release, de oorzaak van F140, of de Sweep1-fout (F145) in app of test zit, of de OCCT-worker in de browserrelease draait, het F143-crashscenario (alleen statisch), Webi's shading/STEP-punten (F161), en Strati's eigen build van 46a1bd9 (826,66 kB).
- Teamronde (2-11, ca. 15:25-16:00 CET): 5 reviews verwerkt (team/). QA heeft zelf nagelopen: de round2b-diff, round2.mjs in het 0.5.9-log en de commitdatum, ci.yml:38-46, README.md:46/55-56/90, TASKS.md:763/807/810/814, brepRefine.ts, main.cjs (recover, gpu), check.mjs, run-regression.mjs, dbg.test.ts, equations.ts:262, ViewPane.tsx + shots/m7-fourview.png, edgesets.ts:337-354, qaDiag.test.ts:45, en opnieuw Get-AuthenticodeSignature op de laptop (alleen lezen; win/signature-0.5.10.txt).
- Correcties t.o.v. de eerste versie van dit rapport staan als F168 (formule, round2b, 827 kB, CI groen, Windows-log, Faceted-bewijs, 19/19) en F169 (qaDiag-theorie).
- Bevindingen die niet opnieuw zijn getest, houden hun 0.5.1-status en zijn als "overgenomen" gemarkeerd in findings.json.
- Ernst: Kritiek = stil fout resultaat of een blokkade voor "klaar"; Major = belangrijk functioneel of procesgat; Minor = cosmetisch of laag risico. De strengste ernst wint.
