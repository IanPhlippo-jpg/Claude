# QA-rapport Phlippo CAD 0.5.11 — strikte controle tegen SOLIDWORKS

*Opgesteld op 3 november 2026 (Europe/Brussels, UTC+1). Alle cijfers komen uit runs op de QA-box (Linux, xvfb en SwiftShader) of uit bestanden in deze map. Er is niets overgenomen zonder eigen controle. Doel van de opdrachtgever: "echt 100 % halen". Daarom staat er in §11 een volledig plan met acceptatietests (ook als los bestand `NAAR-100.md`).*

## 0. Versie en scope

| | |
|---|---|
| Versie | **0.5.11**, HEAD `db0d4b2` (`db0d4b27d857c42b898bcec68c65240b3fe855e9`, 3-11-2026 02:46 CET), branch `claude/fase1-schetser` |
| Vorige QA | 0.5.10 (`a4b1e92`): score 5/10, strikte pariteit 66,1 %, 70 open bevindingen, 9 Kritiek |
| Delta | 14 commits sinds `a4b1e92` |
| Testomgeving | `git archive HEAD` van de laptop naar `/workspace/phlippo-cad/app-0.5.11`. Node 22 met Playwright-Chromium (SwiftShader) en Electron onder xvfb. De laptop is alleen gelezen. |
| Bewijs | `logs/` (alle runs), `shots/` (screenshots), `win/` (Windows- en Actions-logs van de laptop, zelfrapportage), `tools/` (generatoren en eigen QA-tests in `tools/qa-src/`) |
| Beperking | De boom is een `git archive` (geen echte kloon). Om de e2e-kop te laten werken kreeg de box-kopie een lokale stand-in-commit `dcd49df` (`logs/git-standin.txt`); de box-logs dragen dus "commit dcd49df" en **niet** db0d4b2. Dat de inhoud HEAD db0d4b2 is, blijkt uit `provenance.txt` en de zip-comment (688/688 bestanden). De eerste versie van dit rapport zei ten onrechte "commit unknown" (F180). |
| Revisie | **Herzien na de vijf teamreviews** (`team/strati.md`, `riki.md`, `webi.md`, `risk.md`, `mt5dev.md`). De strengste lezing wint waar het bewijs die steunt; elk teamclaim dat de score raakt is op de box nagemeten (§3.2). |

## 1. Oordeel (executive summary)

**Is het klaar? Nee. En de eerste versie van dit rapport was te gunstig.** Wij schreven dat 0.5.11 "de eerste versie zonder bekende stille geometriefout" was, met 0 Kritiek en 6/10. De teamreview (Strati) vond een stille fout die wij gemist hadden, en wij hebben die op de box gereproduceerd (§3.2):

1. **F177 — Kritiek: stille foute fillet na een maatwijziging.** T3 met de sleuf, daarna basis 80 → 100 mm: B-rep geeft **38.469,956 mm³** waar 38.422,743 juist is (**+47,212 mm³ = 55 mm fillet vergeten**). Het lichaam heet "exact", er is geen fout, geen waarschuwing en geen "Faceted". De mesh-kernel maakt precies dezelfde fout, dus de kruiscontrole zwijgt (F179). Met de hand gekozen randen geeft hetzelfde model wél 38.422,743.
2. **F175 — Kritiek: facetten onder het label "exact".** Een ellips 40×20×10 geeft 6.278,700 mm³ in plaats van 6.283,185, onder "Exact surfaces (B-rep)", zonder Faceted-cel; de STEP bevat 0 ELLIPSE en 864 LINE-entiteiten. Splines en de wrap-patch idem. In SOLIDWORKS zijn die vlakken analytisch of NURBS.
3. **F176 — Kritiek (blokkade voor klaar): geen enkele groene CI-run op de release-commit.**

**Wat wél klopt en blijft staan:** T1 (gatrand), T2 en de basis-T3 zijn correct op beide kernels; B-rep is daar exact. Mates markeren de nieuwste conflicterende mate (F141). AutoRecover 21/21, Two/Four View zonder WebGL 35/35. Op de Linux-box: mesh-regressie **98/98**, B-rep **14/14**, release **98/98**, vitest 487/487.

**Correctie op ons eigen werk (F140/F167):** terecht ingetrokken voor 0.5.11; voor 0.5.10 afgeleid, niet gedraaid (§4.2). Daarnaast heeft de teamreview gevonden dat 28 pariteitsrijen naar logs verwezen die hier niet bestaan, dat de herkomstzin fout was en dat onze eigen diagnosetests 0 asserts hebben (F180, F185). Hersteld in deze revisie of als open bevinding opgenomen.

**Lijkt het op SOLIDWORKS?** In werkwijze en uiterlijk sterk. Maar SOLIDWORKS geeft na een maatwijziging nooit stil een ander volume, en een ellips is daar een ellips. Zolang dat hier niet zo is, mag je Mass Properties en STEP van gefillete of gebogen geometrie niet blind vertrouwen.

**Eindscore: 5/10** (eerste versie: 6/10; 0.5.10: 5/10). **Strikte pariteit: 70,2 %** (eerste versie: 75,0 %; 0.5.10: 66,1 %). 63 bevindingen staan open: **3 Kritiek** (F175, F176, F177), 37 Major, 23 Minor. **GO/NO-GO:** NO-GO voor publiceren of verspreiden. Eigen concept- en hobbywerk: alleen onder de voorwaarden in §9.2.

## 2. Delta sinds 0.5.10 (14 commits)

| Onderwerp | Wat de commits en README zeggen | QA-bevinding |
|---|---|---|
| Fillet op gatrand (F139) | Kettingtolerantie en "Keep features"-hersnede | **Klopt**: mesh-verlies binnen 0,9 % van de gesloten vorm, B-rep exact |
| Wrap exact | Polyhedrale B-rep-tool | **Onjuist label**: lichaam heet "exact", maar de patch is polyhedraal (22 PLANE-vlakken in STEP, F175) |
| Dome exact | Bol-segment | **Klopt** (qaBrep) |
| Kruiscontrole F159 | Exact tegen facet, terugval bij > 0,5 % | Bestaat, maar te ruim (F172) én structureel blind voor gedeelde randfouten (F179) |
| QA-tests in repo | "8 mesh + 13 B-rep" in `src/qa/` | **Klopt** (geteld). TASKS.md noemt nog "(11)" |
| Mates | Nieuwste mate gemarkeerd, Not Converged | **Klopt** (M2, StatusBar.tsx:111) |
| AutoRecover | Eén sleutel per document | **Klopt** (desktop-recover 21/21) |
| Two/Four View | Hoofdrenderer, zonder WebGL opgevangen | **Klopt** (viewpanes 35/35) |
| Namen | Frames, Additional Materials, SW-Density → Density | **Klopt** (Ribbon.tsx:47, persistence.ts:139) |
| CI | Matrix mesh/B-rep/release, één log per pass, skip-budget | Config klopt; op HEAD niet gedraaid |
| Windows | "mesh 98/98, release 98/98, brep 12/12 op 0495219" | Getallen kloppen met `win/*.txt`, maar niet op HEAD (brep op 1fd00e3) |

## 3. Testresultaten (box, echte cijfers)

| Test | Resultaat | Log |
|---|---|---|
| Unit (vitest) | **487/487**, 121 bestanden | logs/vitest.log |
| Typecheck | exit 0 | logs/typecheck.log |
| ci-checks (merken, neutral, budgetten) | ok | logs/ci-checks.log |
| Bundel | 854,86 kB van 860 kB (5,14 kB marge) | logs/build-release.log |
| npm audit | dev-keten 15 moderate, 0 high; productie 0 | logs/audit.json, logs/audit-prod.json |
| Regressie mesh (98 scripts) | **98/98**, 0 skips. drawing 28/28, inventory47 18/18, videos46 25/25, sheetexport 12/12, rebuildworker 10/10 (152 s), features 65/65 (163 s), multibody 14/14 | logs/regression-mesh.log |
| Regressie B-rep (14 scripts, `?kernel=brep`) | **14/14**, 0 skips | logs/regression-brep.log |
| Regressie release (98 scripts, `?kernel=brep&rebuild=worker`) | **98/98**, 1 skips | logs/regression-release.log |
| Electron self-test zonder GPU | **8/8**: B-rep exact 44858,407; Fillet1 exact 44742,522; STEP exact (23567 B); worker 1143/1143 vertices in 85 ms; atomaire save met .bak | logs/self-test-nogpu.json |
| Electron self-test SwiftShader | **8/8**, zelfde waarden, worker 183 ms | logs/self-test-softgl.json |
| desktop-nohooks (soft GL) | 10/10 | logs/desktop-nohooks-softgl.log |
| desktop-restore-autosave | ok, 4 features hersteld | logs/desktop-autosave.log |
| desktop-recover | **21/21** (F153, F154, F156, F162) | logs/desktop-recover.log |
| viewpanes | 35/35 | logs/viewpanes.log |

**Werkwijze B-rep/release op de box:** de QA-box werd halverwege de B-rep-pass vervangen (node_modules, dist en de Playwright-cache waren weg). Opnieuw `npm ci`, `playwright install chromium` en `build:e2e` (bundel opnieuw 854,77 kB). De B-rep-pass is daarna afgemaakt: 7 scripts vóór de reset (`logs/regression-brep-part1.log`) plus de 7 resterende (`logs/regression-brep-part2.log`). De release-pass liep volledig opnieuw, in 3 parallelle shards (`E2E_SHARD=k/3`, `logs/regression-release-shard(1, 2, 3).log`). De gecombineerde DONE-regels staan in `logs/regression-brep.log` en `logs/regression-release.log`. Het enige overgeslagen optionele stapje in de release-pass is sheetexport "PDF in de browserviewer" (Download is starting, binnen het budget van 1).

**Windows-logs vergeleken (win/):** `regression-0.5.11-mesh-win32.txt` geeft DONE 98/98 op `0495219`, `…-release-win32.txt` geeft 98/98 op `0495219`, `…-brep-win32.txt` geeft 12/12 op `1fd00e3`. De getallen kloppen met de claims, maar geen van de drie is van HEAD `db0d4b2`. `desktop-installed-0.5.11.txt` bevat alleen de regel "19/19 checks passed", zonder commit of lijst van checks (F97). `signature-0.5.11.txt` geeft NotSigned voor alle drie de exe's.

### 3.1 Eigen strikte QA-tests (bronnen in tools/qa-src/, log logs/qa-ext-tests.log: 14/14)

CORNER(R) = R²(1−π/4) en RIM_LOSS = CORNER·2π(r + k·R) met k = (10−3π)/(12−3π).

| Test | Kernel | Gemeten | Verwacht | Oordeel |
|---|---|---|---|---|
| T1 gatrand R2, Ø35 | mesh | verlies 97,61 mm³ | 96,80 | ok (+0,8 %, facetten) |
| T1 na Ø50 | mesh | verlies 138,46 | 137,25 | ok (+0,9 %) |
| T1 Ø35 / Ø50 | B-rep | 54282,076 / 44227,798 | formule | **exact** |
| T2 revolve-fillet | mesh | verlies 432,68 | 428,74 | ok (+0,9 %) |
| T2 | B-rep | 100175,033 / 149865,048 | formule | **exact** |
| T3 gesplitste rand z=−40 | mesh | 30439,067 | 30439,911 | ok (−0,8 mm³) |
| T3 gesplitste rand z=−40 | B-rep | 30439,911 | 30439,911 | **exact** |
| T3 rand z=0 (niet gesplitst) | B-rep | 30431,327 | 30500 − 80·CORNER(2) = 30431,327 | **exact** (zie §4.2) |
| M2 conflict | — | nieuwste mate m2 gemarkeerd | m2 | ok (F141) |
| M5 gesloten lus met conflict | — | mAB gemarkeerd, B "over", C "under" | idem | ok |
| E1 circulaire vergelijking | — | gemeld | gemeld | ok |

### 3.2 Teamclaims nagemeten (teamronde, `tools/qa-src/qaTeam.test.ts`, `qaCurved.test.ts`; logs `logs/qa-team.json`, `logs/qa-team-tests.log` 11/11, `logs/qa-curved.log`)

CORNER(2) = 4·(1−π/4) = 0,8584 mm² per mm randlengte.

| # | Test | Kernel | Gemeten | Verwacht | Label / waarschuwing | Oordeel |
|---|---|---|---|---|---|---|
| 1a | T3 + sleuf, daarna basis 80 → 100 (variant A; variant E idem) | B-rep | 38.469,956 | 38500 − 90·C = 38.422,743 | exact, geen fout, geen waarschuwing, geen Faceted | **FOUT, stil (+47,212) → F177 Kritiek** |
| 1a | idem | mesh | 38.469,533 | 38.422,743 (± facet) | Faceted | **zelfde fout** (+46,790) |
| 1a | orakel: zelfde model, stukken 55 + 35 mm met de hand | B-rep | 38.422,743 | 38.422,743 | exact | ok — de kernel kán het, de randkeuze niet |
| 1a | controles: alleen basis 100 / alleen sleuf | B-rep | 39.914,159 / 30.439,911 | formule | exact | ok |
| 1a | kruiscontrole volumeMismatch(exact, mesh) | — | null | waarschuwing | — | **blind → F179** |
| 1a-b | plaat met R10-boog, scherp | B-rep | 31.785,398 | formule | exact | ok, maar de boogrand = 32 rechte randen van 0,491 mm |
| 1a-b | fillet R2 op de 32 boogsegmenten | B-rep→mesh | verlies 135,498 | 12,881 (Pappus) | waarschuwing "approximate" | **10,5× fout → F178** |
| 1a-b | sleuf vóór fillet op 32 segmenten | B-rep | geen resultaat na > 10 min | — | — | hang, afgebroken, niet geïsoleerd |
| 1b | ellips 40×20, extrude 10 | B-rep | 6.278,700 | 6.283,185 | exact, "Exact surfaces (B-rep)", geen waarschuwing; STEP 0 ELLIPSE, 864 LINE, 98 PLANE | **facet onder exact → F175 Kritiek** |
| 1b | ellips | mesh | 6.273,097 | 6.283,185 | Faceted | eerlijk gelabeld |
| 1b | cirkel Ø20 (controle) | B-rep | 3.141,593 | 3.141,593 | exact, STEP 1 CYLINDRICAL_SURFACE | ok |
| 1b | spline-profiel | B-rep | 2.943,781 | — | exact; STEP 0 B_SPLINE, 333 LINE | **facet onder exact → F175** |
| 1c | wrap emboss 2 mm op R20-rol | B-rep | 75.607,924 | 75.608,224 | exact, geen waarschuwing; STEP 22 PLANE | **polyhedraal onder exact → F175** |
| 1c | wrap deboss | B-rep | 75.208,023 | 75.208,224 | idem | idem |
| 1d | asserts in onze QA-tests (`rg -c "expect\("`) | — | qaBrep 0, qaDiag 0, qaT3diag 0, qaTeam 0, qaCurved 0, qaStrict 20 | — | — | **F185** |
| 1d | B-T3 (`qaBrep.test.ts:56-68`) randkeuze | — | eerste 80 mm-rand = z=0 | z=−40 | — | **RISK-08 bevestigd** |

Code-claims van het team ook zelf gecontroleerd: `volumeCheck.test.ts:9` (F198), `rebuild.ts:1600-1604` (F197), `ci.yml:137` 12 scripts (F183), 0× `IGESControl_Writer` in de meegeleverde OCCT (F199), `recover.cjs:27-29` (F188), `mateStatus.ts:124-128` (F186), `rebuild.ts:858-864` (F51).

## 4. Claimcontrole

### 4.1 Onjuiste of onbewezen claims

| Claim | Waar | Oordeel |
|---|---|---|
| "Linux: checks en desktop groen" | README.md, win/linux/README.md | **Onbewezen**: er staan geen ruwe logs van de checks- en desktop-jobs in `win/linux/`, alleen regressieshards (F149) |
| "qaBrep.test.ts (11)" | TASKS.md (P0/P1-regel) | **Onjuist**: het zijn er 13. README zegt terecht 13 (F129) |
| F142 "alleen .gitignore" | docs/28 | **Verouderd**: graphify-out is echt uit de index (TASKS klopt) |
| "release 0.5.11 gebouwd en geïnstalleerd (19/19)" | TASKS.md:834 | **Zwak bewijs**: het log is één regel zonder commit of checks (F97) |
| "Regressie Windows op 0495219 (mesh 98/98, release 98/98, brep 12/12)" | TASKS.md:834 | Getallen kloppen, maar brep draaide op `1fd00e3` en niets op HEAD (F176) |
| "Wrap op een exact lichaam houdt het lichaam exact" | README | **Deels**: het lichaam blijft exact, de patch is polyhedraal |
| "elk lichaam krijgt een kruiscontrole" | README | Klopt, maar met 0,5 % is die te grof om fillet-fouten te vangen (F172) |
| "Exact surfaces (B-rep)" / Faceted-cel | UI, README | **Onjuist** voor ellips, spline en wrap-patch (F175, §3.2) |
| Overige claims (F139, F141, F143, F144–F146, F153–F158, F160, F162–F166, Frames) | commits, TASKS, docs/28 | **Klopt**, zelf nagemeten (§3) |

### 4.2 Ingetrokken: F140 en F167 (fout in onze test)

De 0.5.10-test `B-T3` koos de te fillen rand met `edges.reduce((a, b) => len(b) > len(a) ? b : a)`. Bij gelijke lengte (80 mm) blijft dan de eerste rand staan. Onder de mesh-kernel was dat de rand op z=−40, die de sleuf in twee stukken snijdt. Onder de B-rep-kernel was het de rand op z=0, die de sleuf niet raakt. De diagnose (`tools/qa-src/qaT3diag.test.ts`, `logs/qa-t3diag.log`):

- rand z=0 in B-rep: 30431,327 mm³ = 30500 − 80·CORNER(2), verschil 0;
- rand z=−40 in B-rep, sleuf in twee richtingen en gewone sleuf: 30439,911 mm³ = 30500 − 70·CORNER(2), verschil 0;
- rand z=−40 in mesh: 30439,067 mm³ (−0,8 mm³, facetten).

**Formulering na teamreview: terecht ingetrokken voor 0.5.11; voor 0.5.10 afgeleid, niet gedraaid.** Voor 0.5.11 is gemeten dat het programma op beide randen het juiste doet. Dat het in 0.5.10 al zo was, leiden we af: op 0.5.10 zelf konden we de diagnose niet opnieuw draaien, omdat `app-0.5.10/node_modules` geen vite bevat (`logs/qa-t3diag-on-0.5.10.log`). De 0.5.10-waarde 30431,327 is wel exact de waarde voor de z=0-rand. **Les voor QA:** kies randen op positie, niet met een `reduce` op lengte.

## 5. Pariteitsmatrix (62 rijen)

Weging: aanwezig = 1, deels = 0,5, ontbreekt/kapot = 0. **30 aanwezig, 27 deels, 5 ontbreekt, 0 kapot: 70,2 %** (eerste versie 0.5.11: 75,0 %; 0.5.10: 66,1 %).

**Strikte hertelling na teamreview.** Elke verlaging die een reviewer met bewijs voorstelde, is overgenomen (unie), en alleen als ons eigen boxbewijs of de code die steunt. Strati en Riki kwamen op 71,8 %, Webi op 73,4 %, MT5D en Risk op 74,2 %; de unie is 70,2 %.

| Rij | Was | Nu | Waarom (bewijs) |
|---|---|---|---|
| 11 Fillet/Chamfer | aanwezig | deels | F177 stil fout na maatwijziging; F178 gebogen rand 10× fout; face fillet/full round alleen mesh (Strati, Riki, §3.2) |
| 30 Exacte B-rep op desktop | aanwezig | deels | ellips/spline/wrap facet onder exact (F175); self-test niet packaged (Strati, Riki, Risk, Webi) |
| 49 STEP | aanwezig | deels | "exacte" STEP van een ellips = 864 LINE, 0 ELLIPSE (Riki, MT5D, §3.2) |
| 55 Handelsmerk-vrij | aanwezig | deels | geen juridische toets; docs/26 en docs/06 (Strati, Risk; F189) |
| 61 Unit + e2e + B-rep + worker | aanwezig | deels | alleen box, één run, CI-brep 12/14, QA-tests zonder asserts (Strati, Webi; F183–F185) |
| 62 CI | deels | ontbreekt | 0 groene runs op HEAD; laatste runs rood op andere commits (Riki; F176, F195) |
| 56 Performance | deels | deels | bewijs ververst met 0.5.11-cijfers (was 0.5.10, MT5D-17) |
| 59 Installer | deels | deels | blijft deels: packaged self-test ontbreekt (F151), los van signing |

Daarnaast wezen **28 rijen** naar logs die in deze map niet bestaan (`logs/regression.log`, `regression-rerun.log`, `qa-strict-tests.log`, `qa-brep-tests.log`, "vitest 454/454"). Die verwijzingen zijn nu vervangen door de echte 0.5.11-logs (`regression-mesh.log`, `qa-ext-tests.log`, vitest 487/487); een script controleert dat elk genoemd log bestaat (0 missend). Rijen waarvoor een SOLIDWORKS-referentie nodig is om "aanwezig" te worden: 3, 6, 7, 10, 15, 16, 17, 18, 19, 20, 33, 37, 41, 47, 52, 54, 56.

| # | Gebied | Onderdeel | 0.5.10 | 0.5.11 | Bewijs |
|---|---|---|---|---|---|
| 1 | Sketcher | Lijn/rechthoek/cirkel/boog/spline/ellips/sleuf/polygoon/tekst | aanwezig | aanwezig | model.ts add*; smoke 13/13, slot 9/9, sketchcurves 13/13, ellipsetext 6/6 (logs/regression-mesh.log); shots/walk-12-dimensioned.png |
| 2 | Sketcher | Relaties (16 soorten) + glyphs, blauw/zwart-status | aanwezig | aanwezig | solver.ts; relations 14/14 (logs/regression-mesh.log); shots/gj1-relations.png |
| 3 | Sketcher | Intersection/Merge/Equal curvature/AlongXYZ | deels | deels | Intersection/Merge/Equal Curvature: equations.ts:307-323 + relations2.test.ts (AlongXYZ = 3D-schets, rij 5) — Teamronde: deels (Strati, Riki, Risk, Webi): AlongXYZ komt 0× voor in src; bewijs alleen code + unit-test (relations2.test.ts) |
| 4 | Sketcher | Over-/conflict-detectie (redundant/conflicting/driven) | aanwezig | aanwezig | solver.test.ts over/conflict in vitest 487/487 (logs/vitest.log) |
| 5 | Sketcher | Trim/Extend/Offset/Mirror/Convert/patterns | aanwezig | aanwezig | sketchtools 13/13, sketchtools2 4/4 (logs/regression-mesh.log) |
| 6 | Sketcher | 3D-schets met maten/relaties | deels | deels | docs/24: geen 3D-maten (F124) |
| 7 | Sketcher | Instant2D / Magnified Selection | ontbreekt | ontbreekt | docs/24 |
| 8 | Features | Extrude boss/cut + alle eindcondities, draft, thin, 2 richtingen | aanwezig | aanwezig | endconditions 15/15 mesh én B-rep (logs/regression-mesh.log, logs/regression-brep.log); features 65/65 mesh en B-rep (één run) (logs/regression-mesh.log); shots/walk-15-extruded.png |
| 9 | Features | Revolve | aanwezig | aanwezig | Revolve-fillet na maatwijziging OK: QA T2 mesh+B-rep (logs/qa-ext-tests.log, logs/qa-ext-tests.log) |
| 10 | Features | Sweep / Loft (loft B-rep alleen 2 profielen) | deels | deels | Sweep/Loft aanwezig (shots/e18-sweep.png, pmsweep 54/54, loftface 7/7 in logs/regression-mesh.log); B-rep-loft nog 2 profielen; Sweep1 faalde 1× in features (F145) |
| 11 | Features | Fillet/Chamfer (const, variabel, face, full round) | kapot | deels **↑** | Constante fillet T1–T3 correct; maar gesplitste rand na maatwijziging stil fout onder exact (F177: 38469,956 vs 38422,743, logs/qa-team.json), gebogen rand 10× fout via mesh (F178, logs/qa-curved.log), face fillet/full round/setback alleen mesh (rebuild.ts:858-864); filletopts 16/16 mesh (logs/regression-mesh.log) en B-rep (logs/regression-brep.log) |
| 12 | Features | Shell/Draft/Rib | aanwezig | aanwezig | rib 10/10 (logs/regression-mesh.log); shots/e16-shell.png |
| 13 | Features | Hole Tool (simple/cbore/csk/tap) + Advanced Hole + Thread | aanwezig | aanwezig | Hole Tool: shots/e12-hole-preview.png; gj 37/37 incl. ANSI-gat (logs/regression-mesh.log) |
| 14 | Features | Patterns (linear/circular/curve/sketch/fill/table/variable) + Mirror | aanwezig | aanwezig | features 65/65 (logs/regression-mesh.log), componentpattern 6/6, sketchpattern 2/2 (logs/regression-mesh.log) |
| 15 | Features | Wrap/Deform/Flex/Freeform | deels | deels | wrap 4/4, gj (deform) 37/37 (logs/regression-mesh.log); mesh-terugval, Faceted |
| 16 | Features | Dome/Indent/Mounting Boss/Snap Hook/Lip-Groove | deels | deels | Aanwezig (plastics.ts, 12 unit-tests, e2e plastics) maar alleen mesh-kernel, vereenvoudigd (F121) |
| 17 | Features | Instant3D (drag-handles op model) | deels | deels | Drag Handles (hernoemd van Instant3D): alleen diepte van blind extrude (store.ts:828-839); geen e2e of unit-test gevonden |
| 18 | Features | Surfaces (extrude/revolve/loft/knit/trim/thicken) | deels | deels | surfaces 7/7, gd 23/23 (logs/regression-mesh.log); mesh-terugval |
| 19 | Features | Sheet metal (base/edge flange/hem/bend/flat pattern) | deels | deels | sheetmetal 14/14, sheetmetal2 7/7, ge 59/59 (logs/regression-mesh.log); shots/ge14-sweptflange.png; geen virtual sharp |
| 20 | Features | Weldments (structural member, trim) | deels | deels | Naam nu "Frames" en gh 29/29 eerder; profielbibliotheek, end caps/gussets niet tegen SOLIDWORKS gemeten |
| 21 | Features | Multibody (combine/split/move-copy/scope) | aanwezig | aanwezig | multibody 14/14 mesh én B-rep (logs/regression-mesh.log, logs/regression-brep.log); shots/m5-combined.png |
| 22 | FeatureManager | Boom met history/sensors/annotations/materials/planes | aanwezig | aanwezig | shots/walk-18-done.png (History, Sensors, Annotations, Solid Bodies, Material, vlakken, Origin) |
| 23 | FeatureManager | Rollback-bar | aanwezig | aanwezig | FeatureTreeBody.tsx rollback; full 68/68 en relations 14/14 (logs/regression-mesh.log) |
| 24 | FeatureManager | Suppress/unsuppress, edit feature/sketch | aanwezig | aanwezig | features 65/65 (logs/regression-mesh.log), qa1 26/26 (logs/regression-mesh.log) |
| 25 | FeatureManager | Reorder (slepen) | aanwezig | aanwezig | e2e/reorder.mjs sleept met dragTo, reorder 10/10 (logs/regression-mesh.log); FeatureTreeBody.tsx:213 + reorder.test.ts. Teamronde: blijft aanwezig (e2e-bewijs, niet alleen code) |
| 26 | FeatureManager | Parent/child-weergave | aanwezig | aanwezig | gb 32/32 (logs/regression-mesh.log); shots/gb-parentchild.png |
| 27 | FeatureManager | Undo/redo (200 stappen) | deels | deels | history.ts:5 limit=200; undo in e2e gebruikt, maar 200 stappen nergens getest [Risk] |
| 28 | Topologie | Randreferenties overleven maatwijziging (extrude) | deels | aanwezig **↑** | T1 Ø35→Ø50: rand teruggevonden en correct afgerond op mesh én B-rep (logs/qa-ext-tests.log) |
| 29 | Topologie | Gesplitste randen / revolve / sweep / loft | deels | deels | Gesplitste rand (T3) en revolve (T2) correct op beide kernels; sweep/loft-randen na maatwijziging niet getest |
| 30 | Kernel | Exacte B-rep (OCCT) op desktop | deels | deels | Self-test 8/8 (logs/self-test-*.json) maar "packaged": false; ellips/spline/wrap heten exact terwijl ze facetten zijn (F175: ellips 6278,700 vs 6283,185, STEP 0 ELLIPSE) |
| 31 | Kernel | Exacte B-rep in browser / voor alle features | deels | deels | Plastics behalve Dome nog mesh (F51/F121); ellips/spline als segmenten (F175); wrap-patch polyhedraal |
| 32 | Assembly | Insert component / patterns / configuraties per instantie | aanwezig | aanwezig | assembly 21/21, assembly2 15/15, configurations 25/25 (logs/regression-mesh.log); shots/deurkruk-assembly.png |
| 33 | Assembly | Standaard + geavanceerde + mechanische mates (typen) | deels | deels | Typen aanwezig (types.ts) en solver nu correct voor M1/M3/M5 (logs/qa-ext-tests.log); mechanische mates (cam/hinge/screw/rack-pinion/linear coupler) nog zonder gedragstests |
| 34 | Assembly | Mate-solver (simultaan, beide kanten) | aanwezig | aanwezig | QA M1 beide volgordes, M3 keten-4, M5 gesloten lus correct (logs/qa-ext-tests.log) |
| 35 | Assembly | Over-/onderbepaald (+)/(-), mate-fouten | deels | aanwezig **↑** | M2: nieuwste mate gemarkeerd (F141 opgelost), M5 over/onder, "Not Converged" in statusbalk (StatusBar.tsx:111) |
| 36 | Assembly | Interference detection / exploded view | aanwezig | aanwezig | explode 18/18, asmcut 3/3 (logs/regression-mesh.log); shots/deurkruk-exploded.png |
| 37 | Assembly | Smart Fasteners / Toolbox | deels | deels | Auto Fasteners (store.ts:461); geen Toolbox-bibliotheek |
| 38 | Tekeningen | Standaard/projected/section/detail/aux/broken/crop | aanwezig | aanwezig | drawing2 13/13, section 9/9, drawingfix 16/16, viewlayout 16/16 (logs/regression-mesh.log); shots/drawfix-three.png, shots/deurkruk-tekening.png |
| 39 | Tekeningen | Maten plaatsen (Smart Dimension op tekening) | deels | aanwezig **↑** | drawing 28/28 op Linux HEAD (F10 opgelost; logs/regression-mesh.log) |
| 40 | Tekeningen | BOM/hole table/revisietabel/balloons/GD&T | aanwezig | aanwezig | drawingfix 16/16, drawopts 21/21, annotations 3/3+4/4+3/3 (logs/regression-mesh.log); shots/drawfix-tables.png |
| 41 | Tekeningen | Auto centermarks / verborgen lijnen | deels | deels | core/drawing/autoMarks.ts + hlr.ts met unit-tests — Teamronde: deels (Strati, Risk, Webi): alleen unit-tests (autoMarks.test.ts, hlr.test.ts); geen verborgen lijnen in de shots; centermarks ontbreken in Detail B (shots/deurkruk-tekening.png) |
| 42 | Tekeningen | PDF/DXF/DWG export | deels | deels | PDF/DXF: sheetExport.ts, export2d.test.ts, e2e/sheetexport.mjs; DWG ontbreekt |
| 43 | Configuraties | ConfigurationManager, per-config waarden/suppress | aanwezig | aanwezig | configurations 25/25 (logs/regression-mesh.log) |
| 44 | Configuraties | Design tables (Excel) | ontbreekt | ontbreekt | rg "design table" = alleen tree-filterlabel |
| 45 | Configuraties | Equations/global variables/circulair | aanwezig | aanwezig | shots/e22-equations-applied.png; QA E1 circulair gemeld (logs/qa-ext-tests.log) |
| 46 | Evaluate | Measure / Mass Properties / Section Properties | aanwezig | aanwezig | shots/e19-mass-properties.png, shots/e20-measure.png |
| 47 | Evaluate | Draft/undercut/thickness analysis | deels | deels | draftcheck 9/9, thickness 2/2 (logs/regression-mesh.log); geen numerieke assert op undercut/thickness |
| 48 | Import/Export | Native .kcad (atomair + .bak) | aanwezig | aanwezig | self-test: "Save writes the .kcad atomically and keeps a .bak" (logs/self-test-nogpu.json) |
| 49 | Import/Export | STEP AP214 in/uit (exact) | aanwezig | deels **↑** | step 11/11 mesh (logs/regression-mesh.log) en B-rep (logs/regression-brep.log), self-test STEP; maar "exacte" STEP van een ellips bevat 864 LINE en 0 ELLIPSE (F175, logs/qa-team.json) |
| 50 | Import/Export | STL/3MF/AMF | aanwezig | aanwezig | MenuBar.tsx:149-153 STL, MenuBar.tsx:278 "Save As ▸ 3MF"; gb (exportopties) 32/32 (logs/regression-mesh.log) |
| 51 | Import/Export | IGES / DXF / DWG / Parasolid | ontbreekt | ontbreekt | IGES/DWG/Parasolid ontbreken nog (DXF alleen 2D-tekening, rij 41) |
| 52 | UI/UX | CommandManager/tabs/heads-up toolbar/taakvenster/statusbalk | deels | deels | Context-toolbar nu groen op Linux (F144), maar CommandManager/taakvenster niet pixel- of gedragsgewijs naast SOLIDWORKS gelegd |
| 53 | UI/UX | Options-dialoog werkend | deels | deels | Ongewijzigd: 45/379 opties werken (F112); Export biedt IGES/DWG zonder exporter (F171) |
| 54 | UI/UX | Iconen/lettertype pixelgelijk | deels | deels | Niet naast SOLIDWORKS geverifieerd (F16/F21/F22) |
| 55 | UI/UX | Handelsmerk-vrij | deels | deels | Code-bewaking ok (rename-trademarks.cjs, logs/trademark-check.log, logs/ci-checks.log; disclaimer shots/home-brep.png), maar geen juridische toets; docs/26 en docs/06 met SW-inhoud in de repo; materiaalnamen volgen SW (F189) |
| 56 | Performance | Rebuild-worker / UI vloeiend | deels | deels | Release: worker standaard; box rebuildworker 10/10 in 152 s (logs/regression-mesh.log) en release-pass 98/98 met worker (logs/regression-release.log); budget 45 s (F137); browser-mesh-CSG op de UI-thread (F46). Geen herhaalde runs. |
| 57 | Robuustheid | Autosave + crash-herstel | deels | aanwezig **↑** | desktop-recover 21/21 (crash-herstel, eigen kopie per document, opent dirty), desktop-autosave ok |
| 58 | Robuustheid | Zonder WebGL / zonder GPU | deels | aanwezig **↑** | viewpanes 35/35 incl. zonder WebGL, self-test zonder GPU 8/8 en softGL 8/8, desktop-nohooks 10/10 |
| 59 | Installer | NSIS + portable, .kcad-associatie | deels | deels | NSIS + portable gebouwd (win/desktop-build.log); ongesigneerd |
| 60 | Installer | Code-signing | ontbreekt | ontbreekt | Get-AuthenticodeSignature: NotSigned |
| 61 | Testen/CI | Unit + e2e + B-rep + worker | deels | deels | vitest 487/487 (logs/vitest.log); box mesh 98/98, B-rep 14/14, release 98/98 (logs/regression-*.log) — maar alleen box, één run per pass (F184), CI-brep 12/14 scripts (F183), QA-diagnosetests zonder asserts (F185), toleranties te ruim (F173) |
| 62 | Testen/CI | Groene CI op Linux bewezen | kapot | ontbreekt **↑** | Geen enkele groene GitHub Actions-run op HEAD db0d4b2 (quotum); laatste runs 41542259973/41551048560 op andere commits met rode shards (F176, F195). Box-groen is geen CI. |

## 6. Alle bevindingen

Totaal 199 (F1–F199; F177–F199 komen uit de teamreview, met de originele team-ID's als alias tussen haken). Van de 70 bevindingen die in 0.5.10 open stonden zijn er **31 opgelost**, **2 ingetrokken** (F140, F167) en **37 nog open**. Nieuw: **24** (F171, F172, F173, F174, F175, F176, F177, F178, F179, F183, F184, F186, F188, F189, F190, F191, F192, F193, F194, F195, F196, F197, F198, F199). Open per ernst: **Kritiek 3** (F175, F176, F177), Major 37, Minor 23.

Opgelost in 0.5.11: F10, F50, F94, F99, F115, F118, F119, F120, F125, F136, F139, F141, F142, F143, F144, F146, F150, F152, F153, F154, F155, F156, F157, F158, F160, F162, F163, F164, F165, F166, F169.

### 6.1 Overzicht open bevindingen

| ID | Ernst | Status | Prio | Gebied | Titel |
|---|---|---|---|---|---|
| F175 | Kritiek | Nieuw | P0 | Kernel | Facetgeometrie onder het label "exact": ellips, spline en wrap-patch (geen waarschuwing, STEP zonder ELLIPSE/B_SPLINE) [STRATI-02, MT5D-09, RISK-09, RIKI-04, MT5D-13] |
| F176 | Kritiek | Nieuw | P0 | Testen/CI | Geen enkel volledig groen bewijs op HEAD db0d4b2 buiten deze QA-box [MT5D, STRATI-04, RIKI-01] |
| F177 | Kritiek | Nieuw | P0 | Topologie | Fillet op een gesplitste rand na een maatwijziging rondt stil maar één stuk af (onder "exact", zonder waarschuwing) [STRATI-01] |
| F31 | Major | Deels opgelost | P0 | Proces | e2e-exitcodes / CI / niet-gecommit werk |
| F54 | Major | Deels opgelost | P0 | Proces | CI rood op Linux; 'regressie groen' niet reproduceerbaar |
| F111 | Major | Deels opgelost | P0 | Topologie | Fillet-rand die door een eerder ingevoegde feature gesplitst wordt: maar één deel afgerond, zonder waarschuwing [STRATI-01] |
| F147 | Major | Deels opgelost | P0 | Testen/CI | CI: mesh-, B-rep- en worker-regressie in één run-stap met bash -e; B-rep en worker draaien nooit zolang mesh rood is [N, i, e, u, w,  , i, n,  , d, e,  , t, e, a, m, r, o, n, d, e, ;,  , S, t, r, a, t, i,  , F, 1, 4, 8, ,,  , R, i, k, i,  , F, 1, 4, 7, ,,  , R, i, s, k,  , F, 1, 4, 8, ,,  , M, T, 5,  , D, e, v,  , F, 1, 4, 7] |
| F172 | Major | Nieuw | P0 | Kernel | Volume-kruiscontrole B-rep↔mesh (0,5 %) te ruim om een fillet-fout te vangen |
| F178 | Major | Nieuw | P0 | Kernel | Gebogen rand van een exact lichaam bestaat uit 32 rechte segmenten; fillet erop valt naar mesh en is ±10× fout [STRATI-01(b)] |
| F179 | Major | Nieuw | P0 | Kernel | Kruiscontrole is structureel blind: beide kernels delen de randresolutie, waarschuwing alleen bij de laatste feature [STRATI-03, RISK-02] |
| F51 | Major | Deels opgelost | P1 | Geometrie | Mesh-kernel |
| F93 | Major | Deels opgelost | P1 | Proces | Docs/commits claimen 98/98 terwijl de Linux-regressie rood blijft |
| F98 | Major | Deels opgelost | P1 | Proces | 42 commits niet gepusht / geen bewijs van remote CI-run |
| F105 | Major | Deels opgelost | P1 | Tests | B-rep-pad bijna nooit in regressie geoefend [K, r, i, t, i, e, k,  , v, o, l, g, e, n, s,  , S, t, r, a, t, i, ;,  , Q, A,  , h, a, d,  , M, a, j, o, r, .,  , M, T, 5,  , D, e, v, :,  , d, e, e, l, s, ,,  , i, n,  , C, I,  , o, n, b, e, r, e, i, k, b, a, a, r,  , b, i, j,  , r, o, d, e,  , m, e, s, h, -, p, a, s, s] |
| F148 | Major | Deels opgelost | P1 | Bewijs/claims | Windows-log round2b is een kopie van het 0.5.9-log; het 98/98-log draaide op een niet-gecommitte werkboom [N, i, e, u, w,  , i, n,  , d, e,  , t, e, a, m, r, o, n, d, e, ;,  , S, t, r, a, t, i,  , F, 1, 4, 7, ,,  , W, e, b, i,  , F, 1, 4, 7, ,,  , R, i, k, i,  , F, 1, 4, 9, a, /, b] |
| F149 | Major | Deels opgelost | P1 | Bewijs/claims | Claims zonder platform of log: 98/98 zonder "Windows", "CI draait B-rep-pass", "0.5.10 geïnstalleerd (19/19)" [N, i, e, u, w,  , i, n,  , d, e,  , t, e, a, m, r, o, n, d, e, ;,  , R, i, k, i,  , F, 1, 4, 8, ,,  , S, t, r, a, t, i,  , F, 1, 5, 2, ,,  , W, e, b, i,  , (, 1, 9, /, 1, 9, ), ,,  , R, i, s, k,  , §, 4, ., 5] |
| F159 | Major | Deels opgelost | P1 | Kernel | B-rep-resultaat vervangt het mesh-resultaat zonder volume-kruiscontrole; mesh-waarschuwingen van exacte bodies worden weggegooid [N, i, e, u, w,  , i, n,  , d, e,  , t, e, a, m, r, o, n, d, e, ;,  , R, i, s, k,  , F, 1, 4, 7] |
| F180 | Major | Deels opgelost | P1 | QA-proces | Herkomst en logverwijzingen van het QA-rapport waren niet sluitend [RIKI-01, RIKI-02, RIKI-03, RISK-03, RISK-04, RISK-10, WEBI-01, MT5D-12, MT5D-17, STRATI-04] |
| F184 | Major | Nieuw | P1 | Testen/CI | Geen herhaalde runs, mutatietests, rand-asserts of .kcad-compatibiliteitstest [RIKI-09] |
| F185 | Major | Deels opgelost | P1 | QA-proces | Eigen QA-diagnosetests hebben 0 asserts; B-T3 kiest nog de z=0-rand [RISK-08] |
| F189 | Major | Nieuw | P1 | Juridisch | Juridische grens: interne SW-documentatie en pixel-overlay-plan horen niet in een publieke repo [RISK-06, WEBI-07] |
| F190 | Major | Nieuw | P1 | Testen/CI | Geen Windows-job in CI [RISK-07] |
| F195 | Major | Nieuw | P1 | Testen/CI | Multibody rood in beide Actions-runs; features dicht bij de 900 s-timeout [WEBI-08] |
| F197 | Major | Nieuw | P1 | Kernel | Exacte sheet-metal-flange wordt bij afwijking stil vervangen door mesh [MT5D-10] |
| F198 | Major | Nieuw | P1 | Testen/CI | Unit-test legt blindheid van de kruiscontrole vast [MT5D-11] |
| F46 | Major | Deels opgelost | P2 | Performance | CSG/solver op de UI-thread |
| F47 | Major | Deels opgelost | P2 | Geometrie | Topologische naamgeving |
| F48 | Major | Deels opgelost | P2 | Geometrie | CSG-resultaat ongecontroleerd / toleranties |
| F49 | Major | Open | P2 | Electron | Release-hardening (heropend; samengevoegd met F117) |
| F97 | Major | Deels opgelost | P2 | Electron | Packaged app:// + OCCT WASM niet smoke-getest op Windows |
| F112 | Major | Deels opgelost | P2 | UI/Options | Options-dialoog: 334 van 379 instellingen doen niets (nu eerlijk grijs) |
| F114 | Major | Deels opgelost | P2 | Import/Export | Geen IGES-, DWG- of Parasolid-export (PDF/DXF van tekeningen nu wel) |
| F117 | Major | Open | P2 | Installer | Installer/exe niet code-signed (samengevoegd met F49) [M, a, j, o, r,  , v, o, l, g, e, n, s,  , Q, A,  , e, n,  , a, l, l, e,  , r, e, v, i, e, w, e, r, s, ;,  , N, o, t, S, i, g, n, e, d,  , o, p,  , 2, -, 1, 1,  , o, p, n, i, e, u, w,  , g, e, m, e, t, e, n,  , (, F, 1, 5, 0, )] |
| F121 | Major | Deels opgelost | P2 | Features | Ontbrekende SolidWorks-features: Dome, Indent, Mounting Boss, Snap Hook, Lip/Groove; Smart Fasteners en Instant3D slechts deels (Auto Fasteners, Drag Handles) |
| F122 | Major | Deels opgelost | P2 | Tekeningen | Standaardaanzichten zonder automatische centermarks/verborgen lijnen [D, e, e, l, s,  , v, o, l, g, e, n, s,  , W, e, b, i,  , e, n,  , R, i, s, k, :,  , a, l, l, e, e, n,  , u, n, i, t, -, t, e, s, t, s, ,,  , g, e, e, n,  , e, 2, e, ;,  , v, e, r, b, o, r, g, e, n,  , l, i, j, n, e, n,  , i, n,  , g, e, e, n,  , e, n, k, e, l, e,  , s, h, o, t, ;,  , c, e, n, t, e, r, m, a, r, k, s,  , o, n, t, b, r, e, k, e, n,  , i, n,  , D, e, t, a, i, l,  , B,  , v, a, n,  , s, h, o, t, s, /, d, e, u, r, k, r, u, k, -, t, e, k, e, n, i, n, g, ., p, n, g, ;,  , Q, A,  , h, a, d,  , O, p, g, e, l, o, s, t] |
| F126 | Major | Deels opgelost | P2 | Proces/Bewijs | Windows-regressielog is geplakt, geen ruwe runner-output [S, t, r, a, t, i, ,,  , W, e, b, i, ,,  , R, i, k, i, :,  , Q, A, -, t, e, k, s, t,  , w, a, s,  , f, o, u, t,  , (, ", r, o, u, n, d, 2, b,  , b, e, v, a, t,  , m, a, a, r,  , 6,  , s, c, r, i, p, t, s, ", )] |
| F130 | Major | Deels opgelost | P2 | Proces | Breedte boven correctheid: +7608 regels, maar geen tests voor mate-richting/conflict of gesplitste randen |
| F192 | Major | Nieuw | P2 | UI/UX | Extra views (Two/Four View) zijn niet interactief [WEBI-04] |
| F145 | Minor | Deels opgelost | P2 | Testen/CI | features-script niet-deterministisch: Sweep1 "path sketch has no lines" met volgfouten (oorzaak niet geverifieerd) [M, a, j, o, r,  , v, o, l, g, e, n, s,  , R, i, k, i,  , e, n,  , M, T, 5,  , D, e, v,  , (, e, n,  , R, i, s, k,  , b, i, j,  , h, e, r, h, a, l, i, n, g, ), ;,  , Q, A,  , h, a, d,  , M, i, n, o, r] |
| F151 | Minor | Deels opgelost | P2 | Testen/CI | Self-tests draaien ongepackaged (packaged:false) en met SwiftShader: geen installer-test en geen echte no-WebGL-test [N, i, e, u, w,  , i, n,  , d, e,  , t, e, a, m, r, o, n, d, e, ;,  , S, t, r, a, t, i,  , F, 1, 5, 4, ,,  , R, i, k, i,  , F, 1, 5, 1, ,,  , M, T, 5,  , D, e, v,  , (, M, T, 5, D, -, 0, 6, /, F, 9, 7, )] |
| F173 | Minor | Nieuw | P2 | Testen/CI | Strikte QA-tests in de repo hebben te ruime toleranties |
| F183 | Minor | Nieuw | P2 | Testen/CI | CI-brep-job draait 12 van de 14 B-rep-scripts (loftface en pmsweep ontbreken) [RIKI-05, MT5D-16d] |
| F188 | Minor | Nieuw | P2 | Robuustheid | AutoRecover-kopieën van 0.5.10 worden mogelijk niet getoond [RISK-05] |
| F196 | Minor | Nieuw | P2 | Installer | Electron-fuses niet getest in de gepackagede app [WEBI-09] |
| F199 | Minor | Nieuw | P2 | Import/Export | Meegeleverde OCCT heeft geen IGES-writer [MT5D-15] |
| F16 | Major | Niet geverifieerd | P3 | Visueel | Iconen en lettertype |
| F137 | Major | Open | P3 | Performance | Rebuild-budget nog 45 s; mesh-CSG op de UI-thread in de browser |
| F21 | Minor | Niet geverifieerd | P3 | Visueel | Taakvenster-iconen |
| F22 | Minor | Niet geverifieerd | P3 | Visueel | Body-randen |
| F24 | Minor | Deels opgelost | P3 | Visueel | Extra rij in Modify |
| F28 | Minor | Deels opgelost | P3 | UX | Bestandsdialoog bij Insert Component |
| F38 | Minor | Deels opgelost | P3 | Docs | README/TASKS |
| F124 | Minor | Open | P3 | Scope | Bewuste gaten uit docs/24 (Magnified Selection, Instant2D, virtual-sharp flange, 3D-schetsmaten) |
| F129 | Minor | Deels opgelost | P3 | Docs | Verouderde docs en tellingen |
| F134 | Minor | Open | P3 | Code | Line-budget-caps staan op de huidige grootte, niet op een doel (MT5D-08) [D, e, e, l, s,  , o, p, g, e, l, o, s, t,  , v, o, l, g, e, n, s,  , M, T, 5,  , D, e, v,  , (, c, a, p, s, ,,  , g, e, e, n,  , d, o, e, l, e, n, ;,  , g, e, e, n,  , s, p, l, i, t, s, p, l, a, n, ), ;,  , Q, A,  , h, a, d,  , O, p, g, e, l, o, s, t] |
| F138 | Minor | Deels opgelost | P3 | Build/Security | npm audit: 17 kwetsbaarheden (15 moderate, 2 high) in de electron-builder-keten |
| F161 | Minor | Deels opgelost | P3 | Weergave | Shading-naad en spikkels; STEP-import toont mesh ("300 triangles") [N, i, e, u, w,  , i, n,  , d, e,  , t, e, a, m, r, o, n, d, e, ;,  , W, e, b, i,  , F, 1, 5, 2] |
| F171 | Minor | Nieuw | P3 | UI/UX | Options ▸ Export en Import tonen IGES en DXF/DWG als formaat zonder exporter |
| F174 | Minor | Nieuw | P3 | Performance | Bundelbudget bijna op: 854,86 van 860 kB |
| F186 | Minor | Nieuw | P3 | Assembly | Mate-conflict-heuristiek: "unconverged" hangt aan een tweede solve van 128 iteraties [RIKI-10] |
| F191 | Minor | Nieuw | P3 | Performance | Extra views tekenen elke 1500 ms opnieuw met een CPU-readback [WEBI-03] |
| F193 | Minor | Nieuw | P3 | UI/UX | Keuzelijst "Units" onleesbaar; Material-tabs lopen over [WEBI-05] |
| F194 | Minor | Nieuw | P3 | UI/UX | Productnaam in drie vormen [WEBI-06] |

### 6.2 Details open bevindingen

#### F175 · Kritiek · Nieuw · P0 · Kernel — Facetgeometrie onder het label "exact": ellips, spline en wrap-patch (geen waarschuwing, STEP zonder ELLIPSE/B_SPLINE) [STRATI-02, MT5D-09, RISK-09, RIKI-04, MT5D-13]

- **Bewijs:** 0.5.11 teamronde: BEVESTIGD als stille fout onder het label "exact" (tools/qa-src/qaTeam.test.ts, logs/qa-team.json): ellips 40×20 × 10 mm geeft B-rep 6278,700 mm³ tegen π·20·10·10 = 6283,185 (−4,485 mm³, −0,071 %); body.exact = true, boom "Exact surfaces (B-rep)", geen waarschuwing, geen Faceted-cel in de statusbalk (StatusBar telt alleen !exact), volumeMismatch = null. STEP uit dezelfde B-rep: 864 LINE, 98 PLANE, 0 ELLIPSE, 0 B_SPLINE. Spline-profiel idem: exact = true, STEP 333 LINE, 0 B_SPLINE. Wrap-patch (MT5D-13) zelfde klasse: emboss 75607,924 vs 75608,224 (ΔV -0.299 mm³), deboss ΔV -0.2 mm³, exact = true, geen waarschuwing; STEP 22 PLANE-vlakken waar SOLIDWORKS een cilindrisch offsetvlak heeft (rebuild.ts:2187-2188 meshToolOf). Volgens onze eigen regel (stil fout resultaat) Kritiek. || 0.5.11: occt/brep.ts:4 en :68: "ellipses and splines are followed by short segments for now". Bodies met zulke profielen heten exact, maar hun vlakken zijn polygonaal; massa en STEP wijken af van SOLIDWORKS.
- **Reproductie:** Ellips 40×20 op Top, extrude 10 mm, B-rep: Mass Properties 6278,700 i.p.v. 6283,185; STEP exporteren en tellen: 0 ELLIPSE. Wrap emboss 10×10 op R20-rol diepte 2: 22 PLANE-vlakken.
- **Fix:** Interim (direct): bodies met ellips/spline/wrap-patch exact:false + waarschuwing tot de echte fix. Echt: Geom_Ellipse / BSplineCurve in occt/brep.ts:68-75 i.p.v. sampleEntity(…,96); wrap via exacte offset-/projectie.

#### F176 · Kritiek · Nieuw · P0 · Testen/CI — Geen enkel volledig groen bewijs op HEAD db0d4b2 buiten deze QA-box [MT5D, STRATI-04, RIKI-01]

- **Bewijs:** 0.5.11 teamronde: Ernst verhoogd naar Kritiek volgens onze eigen definitie ("stil fout resultaat óf blokkade voor klaar", MT5D). Geen enkele Actions-run op db0d4b2; de box-logs dragen "commit dcd49df", de lokale stand-in-commit van de archive (logs/git-standin.txt), niet de echte HEAD. F54 telt niet apart als Kritiek: het resterende deel van F54 is precies deze bevinding. || 0.5.11: Windows-logs zijn van 0495219/1fd00e3, Actions-runs van c1fc039/75ceeea; HEAD zelf is alleen op de QA-box gedraaid. Logkop op de box zegt "commit unknown" (git-archive zonder .git).
- **Reproductie:** Vergelijk de commit-kop van elk log met HEAD.
- **Fix:** Eén Actions-run op de release-commit met alle jobs groen; artefacten met commit-kop bewaren.

#### F177 · Kritiek · Nieuw · P0 · Topologie — Fillet op een gesplitste rand na een maatwijziging rondt stil maar één stuk af (onder "exact", zonder waarschuwing) [STRATI-01]

- **Bewijs:** 0.5.11 teamronde: Gereproduceerd op de box (tools/qa-src/qaTeam.test.ts, logs/qa-team.json). T3 (80×40×10, fillet R2 op de z=−40-rand, sleuf 35–45 ervóór), daarna basis 80 → 100 mm. B-rep: 38469,956 mm³, verwacht 38500 − 90·CORNER(2) = 38422,743 (+47,212 mm³ = precies 55 mm fillet te weinig); exact = true, geen fout, geen waarschuwing, geen Faceted. Mesh geeft dezelfde fout (38469,533), dus volumeMismatch = null. Orakel (zelfde model, beide stukken 55 + 35 mm met de hand gekozen): 38422,743 = formule. Controles: alleen basis 100 zonder sleuf = 39914,159 = formule; alleen sleuf (T3) = 30439,911 = formule. Oorzaak volgens Strati: edgesets.ts:338-355 en :308-310 kiezen bij meerdere kandidaten één stuk; rebuild.ts:2848-2849.
- **Reproductie:** Zie bewijs; vergelijk Mass Properties met 38422,743.
- **Fix:** Bij een gesplitste referentie alle stukken langs dezelfde lijn/kromme meenemen; waarschuwen zodra matchEdge uit meerdere kandidaten kiest (edgesets.ts:310); propertysuite (NAAR-100 §5.5-3).

#### F31 · Major · Deels opgelost · P0 · Proces — e2e-exitcodes / CI / niet-gecommit werk

- **Bewijs:** 0.5.11: Exitcodes en DONE-regel met skip-budget werken (Linux-box HEAD db0d4b2, mesh-pass 98/98 groen, 0 skips (logs/regression-mesh.log)). Een groene GitHub Actions-run op HEAD ontbreekt: laatste runs 41542259973 (c1fc039) en 41551048560 (75ceeea) hadden rode shards; de run op 772236a startte niet (minutenquotum). || 0.5.10: 0.5.10: Exitcodes en runner in orde; CI-config draait nu met SwiftShader (ci.yml). Een groene Actions-run is niet te bewijzen (privé-repo, geen gh op laptop of box). Lokale Linux-regressie: 93/98 groen bij volledige run (features, drawing, inventory47, rebuildworker, videos46 rood); bij herhaling features en rebuildworker groen, drawing, inventory47 en videos46 reproduceerbaar rood → 95/98 (logs/r
- **Reproductie:** run-regression Linux
- **Fix:** F10 oplossen.

#### F54 · Major · Deels opgelost · P0 · Proces — CI rood op Linux; 'regressie groen' niet reproduceerbaar

- **Bewijs:** 0.5.11 teamronde: Rest valt onder F176 (Kritiek); hier Major gehouden om niet dubbel te tellen. Daarnaast WEBI-08: multibody rood in beide Actions-runs, features dicht bij de 900 s-timeout (F195). || 0.5.11: Kritiek → Major. Op de Linux-box (xvfb + SwiftShader) is de mesh-pass nu 98/98 groen op HEAD, incl. drawing, inventory47, videos46, sheetexport, features (Linux-box HEAD db0d4b2, mesh-pass 98/98 groen, 0 skips (logs/regression-mesh.log)); B-rep-pass 14/14 groen, 0 skips; release-pass 98/98 groen, 1 skips. Wat ontbreekt: een groene Actions-run op HEAD (quotum op). || 0.5.10: 0.5.10: De CI-stap draait run-regression.mjs zonder continue-on-error; lokaal op Linux (zelfde ubuntu/xvfb/SwiftShader-opzet) zijn drawing, inventory47 en videos46 reproduceerbaar rood (logs/regression-rerun.log) → de CI-job is vrijwel zeker rood. Geen Actions-run zichtbaar (privé-repo). || 0.5.1: 0.5.1 Linux-regressie: DONE 91/93 — failed: drawing rebuildworker. 0.5.1: Linux-regressie: drawing bl
- **Reproductie:** run-regression
- **Fix:** Zie F10.

#### F111 · Major · Deels opgelost · P0 · Topologie — Fillet-rand die door een eerder ingevoegde feature gesplitst wordt: maar één deel afgerond, zonder waarschuwing [STRATI-01]

- **Bewijs:** 0.5.11 teamronde: HEROPEND als klasse (Strati): de basis-T3 klopt, maar een gesplitste rand na een maatwijziging en een gebogen rand niet. Zie F177 (Kritiek) en F178. Status Deels; ernst Major om F177 niet dubbel te tellen. || 0.5.11: T3 (rand gesplitst door eerder ingevoegde sleuf): mesh 30439,067 en B-rep 30439,911 tegen theorie 30439,911 mm³ (logs/qa-ext-tests.log, logs/qa-t3diag.log). || 0.5.10: 0.5.10: Mesh: T3 30439,07 vs verwacht 30439,91 → OK. B-rep (standaard in release): 30431,33, 8,584 mm³ te weinig = een extra rand van 10 mm afgerond (F140). Kritiek → Major (mesh-deel dicht; B-rep-deel apart als F140). Teamronde: Het symptoom (stil fout bij een gesplitste rand) zit in de releasekernel; de gebruiker ziet F140. || 0.5.1: Team 27-10: Strati/Webi/Riki/MT5/Risk: ↑Kritiek — stil foute g
- **Reproductie:** vitest src/qa/qaStrict.test.ts › T3
- **Fix:** Bij gesplitste rand alle afstammelingen matchen (zelfde face-namen), anders waarschuwing tonen zoals SolidWorks "Missing edge".

#### F147 · Major · Deels opgelost · P0 · Testen/CI — CI: mesh-, B-rep- en worker-regressie in één run-stap met bash -e; B-rep en worker draaien nooit zolang mesh rood is [N, i, e, u, w,  , i, n,  , d, e,  , t, e, a, m, r, o, n, d, e, ;,  , S, t, r, a, t, i,  , F, 1, 4, 8, ,,  , R, i, k, i,  , F, 1, 4, 7, ,,  , R, i, s, k,  , F, 1, 4, 8, ,,  , M, T, 5,  , D, e, v,  , F, 1, 4, 7]

- **Bewijs:** 0.5.11: ci.yml splitst nu in matrix-jobs (release ×3, mesh ×3, brep) met continue-on-error en eind-gates; niet bewezen op HEAD (geen run). || 0.5.10: Geverifieerd: .github/workflows/ci.yml:38-46 is één `run:`-blok zonder continue-on-error; run-regression.mjs eindigt met exit 1 bij rood; mesh is lokaal reproduceerbaar rood (logs/regression-rerun.log). Ook "git diff --exit-code" en de eindgate van de desktopchecks (ci.yml:48-51) worden dan niet bereikt. README.md:90 "De CI draait … een B-rep-pass" is daardoor bij een rode mesh-pass feitelijk onwa
- **Reproductie:** sed -n 38,46p .github/workflows/ci.yml
- **Fix:** Drie aparte stappen met id en continue-on-error, plus een eindstap die alle uitkomsten controleert (zoals nohooks/selftest).

#### F172 · Major · Nieuw · P0 · Kernel — Volume-kruiscontrole B-rep↔mesh (0,5 %) te ruim om een fillet-fout te vangen

- **Bewijs:** 0.5.11 teamronde: Prioriteit naar P0 (Risk). Let op voor de fix: de in NAAR-100 voorgestelde drempel max(0,5 mm³; 0,1 %) ligt onder het tessellatieverschil op een correct T3 (0,794–0,845 mm³, logs/qa-t3diag.log) en geeft dus valse alarmen (RISK-01). Ook een perfecte drempel vangt F177 niet: mesh geeft daar dezelfde fout (F179). || 0.5.11: VOLUME_MISMATCH = 0.005 (volumeCheck.ts:8). Op T3 (30500 mm³) is 0,5 % = 152 mm³, terwijl een complete fillet van 70 mm R2 maar 60,1 mm³ is en het F140-verschil 8,6 mm³. Een gemiste of extra fillet blijft dus onzichtbaar.
- **Reproductie:** T3 met B-rep; vergelijk |V_brep−V_mesh| met 0,005·V.
- **Fix:** Absolute + relatieve drempel per feature: |ΔV| < max(0,5 mm³, 0,1 % van het featurevolume i.p.v. bodyvolume).

#### F178 · Major · Nieuw · P0 · Kernel — Gebogen rand van een exact lichaam bestaat uit 32 rechte segmenten; fillet erop valt naar mesh en is ±10× fout [STRATI-01(b)]

- **Bewijs:** 0.5.11 teamronde: Eigen test (tools/qa-src/qaCurved.test.ts, logs/qa-curved.log): plaat 80×40×10 met R10-hoekboog, B-rep scherp 31785,398 = formule, maar de bovenste boogrand verschijnt als 32 rechte randen van 0,491 mm (de onderste lus als één rand van 115,706). Fillet R2 op alle 32: waarschuwing "no exact (B-rep) version … approximate", verlies 135,498 mm³ tegen 12,881 (Pappus) — geen benadering maar ±10,5× te veel. Eén segment: verlies 0,753. SOLIDWORKS kiest één boogrand met tangentpropagatie. De combinatie sleuf vóór de fillet + 32 segmenten gaf > 10 min geen resultaat (door ons afgebroken; niet geïsoleerd). Strati's variant "gebogen gesplitste rand" was daardoor niet zuiver te meten.
- **Reproductie:** Zie bewijs.
- **Fix:** Randen van het exacte lichaam uit de B-rep-topologie (TopExp) halen, niet uit tessellatie; tangentketens als één selectie.

#### F179 · Major · Nieuw · P0 · Kernel — Kruiscontrole is structureel blind: beide kernels delen de randresolutie, waarschuwing alleen bij de laatste feature [STRATI-03, RISK-02]

- **Bewijs:** 0.5.11 teamronde: F177 toont het: mesh 38469,533 en B-rep 38469,956 maken dezelfde fout, volumeMismatch = null. De randkeuze (matchEdges) is gedeeld (rebuild.ts:2837-2838, :818, :821). De waarschuwing hangt aan de laatste feature (brepRefine.ts:77, :89-90), is alleen een waarschuwing en heeft geen e2e. volumeCheck.test.ts:9 legt vast dat het F140-verschil (30439,07 vs 30431,33) géén waarschuwing geeft (F198).
- **Reproductie:** Zie F177.
- **Fix:** Onafhankelijke controle: som van gematchte stuklengtes tegen de lengte van het oorspronkelijke vlakkenpaar; per feature; e2e.

#### F51 · Major · Deels opgelost · P1 · Geometrie — Mesh-kernel

- **Bewijs:** 0.5.11 teamronde: Aanvulling (Strati): face fillet, full round, setback, partial en andere niet-constante varianten vallen buiten brepRoundable (rebuild.ts:858-864) en worden dus facet; voor variabel/face/full round/chamfer-varianten is er geen 0.5.11-volumebewijs. || 0.5.11: Kritiek → Major: per feature nu een waarschuwing "has no exact (B-rep) version … Faceted" (rebuild.ts:3313-3314) en "Faceted n/m" in de statusbalk. Nog steeds mesh: Indent, Lip/Groove, Snap Hook, Mounting Boss, wrap-patch polyhedraal; ellips/spline-randen als korte segmenten in B-rep (occt/brep.ts:4, :68). || 0.5.10: 0.5.10: Browser-build toont "Faceted 1/1" (shots/walk-18-done.png); mesh-kernel blijft primair voor preview/terugval/worker; plastics-features alleen mesh (plastics.ts gebruikt csg/extrudeGeometry); mesh-fillet op gatrand fout (F139). Teamronde: Correctie: de shot "Faceted 1/1" (shots/walk-18-done.png) komt uit de e2e-build (TEST_HOOKS → mesh, brepRefine.ts:29-35). Een gewone browserbuild zet B-re
- **Reproductie:** Part met extrude+fillet; STEP export
- **Fix:** Feature-dekking meten; mesh-pad uitfaseren waar B-rep groen is.

#### F93 · Major · Deels opgelost · P1 · Proces — Docs/commits claimen 98/98 terwijl de Linux-regressie rood blijft

- **Bewijs:** 0.5.11: Claims hebben nu platform+commit+log (README, win/linux/README.md). Resterend: "checks, desktop groen" op Linux staat in win/linux/README.md zonder ruw log van die jobs; Windows-logs zijn van 0495219/1fd00e3, niet van HEAD db0d4b2; TASKS "(11)" vs 13; docs/28 zegt over F142 alleen ".gitignore" terwijl TASKS terecht "uit de index" meldt. || 0.5.10: 0.5.10: Claims kloppen niet: commit a3bfaf7 en TASKS.md:810 melden "98/98", lokaal Linux haalt dat niet; bundle "827 kB" is 849 kB (F118); het Windows-log met 98/98 heet regression-0.5.9.txt (start 30-10 22:03 CET, vóór de versie-commit a3bfaf7 van 22:48 CET); lokaal Linux 93/98 groen bij volledige run (features, drawing, inventory47, rebuildworker, videos46 rood); bij herhaling features en rebuil
- **Reproductie:** Vergelijk git log --grep=86/86 met node e2e/drawing.mjs op Linux
- **Fix:** Claims aanpassen tot drawing groen is of expliciet "Windows 86/86, Linux drawing bekend rood" + issue-link; F10 eerst fixen.

#### F98 · Major · Deels opgelost · P1 · Proces — 42 commits niet gepusht / geen bewijs van remote CI-run

- **Bewijs:** 0.5.11: Remote Actions-runs bestaan met links (41542259973, 41551048560), maar niet op HEAD en niet volledig groen. || 0.5.10: 0.5.10: Branch is gepusht (laptop: claude/fase1-schetser = origin/…, HEAD a4b1e92). Een Actions-run-link of -uitslag ontbreekt nog steeds. || 0.5.1: 0.5.1: Gepusht (origin up-to-date), maar remote CI-run niet zichtbaar voor QA. || 0.4.8: Branch 42 ahead of origin; hele B-rep-migratie alleen op de laptop. Geen Actions-artifact in report-0.4.8/logs/. 'CI rood' = lokale inferentie. [Strati N2 · Riki 
- **Reproductie:** git status -sb; ls report-0.4.8/logs/; geen Actions-URL in docs
- **Fix:** Push naar (private) origin; Actions-artifact van drawing-run bewaren; pas daarna "CI" claimen.

#### F105 · Major · Deels opgelost · P1 · Tests — B-rep-pad bijna nooit in regressie geoefend [K, r, i, t, i, e, k,  , v, o, l, g, e, n, s,  , S, t, r, a, t, i, ;,  , Q, A,  , h, a, d,  , M, a, j, o, r, .,  , M, T, 5,  , D, e, v, :,  , d, e, e, l, s, ,,  , i, n,  , C, I,  , o, n, b, e, r, e, i, k, b, a, a, r,  , b, i, j,  , r, o, d, e,  , m, e, s, h, -, p, a, s, s]

- **Bewijs:** 0.5.11 teamronde: Box-only: B-rep 14/14 en release 98/98 alleen op de QA-box; CI-brep-job draait 12 scripts, loftface en pmsweep ontbreken (ci.yml:137, RIKI-05). Daarom terug naar Deels (Strati). || 0.5.11: CI draait nu een volledige release-pass op ?kernel=brep&rebuild=worker (ci.yml:89-115) plus 12 brep-scripts (ci.yml:134-136). Box: B-rep-pass 14/14 groen, 0 skips, release-pass 98/98 groen, 1 skips. || 0.5.10: 0.5.10: B-rep-pass 12 scripts in CI; lokaal 11/12 (features TimeoutError na 227 s, logs/regression-brep.log), bij herhaling features 65/65 (logs/regression-rerun-brep.log) → timing-flaky. Maar de B-rep-pass vangt F140 (extra rand) niet. Teamronde: Release = B-rep (prefs.ts:21, brepRefine.ts:25-38: true buiten TEST_HOOKS), maar de e2e-build draait mesh; in CI draaien de 12 B-rep-scripts (ci.yml:44)
- **Reproductie:** rg phlippo.kernel e2e/; tel SCRIPTS vs brep-flag
- **Fix:** Default e2e naar brep als WASM laadt, of CI-matrix PHLIPPO_KERNEL=brep op features+fillet+step+bodies; assert bodies.exact waar claimed.

#### F148 · Major · Deels opgelost · P1 · Bewijs/claims — Windows-log round2b is een kopie van het 0.5.9-log; het 98/98-log draaide op een niet-gecommitte werkboom [N, i, e, u, w,  , i, n,  , d, e,  , t, e, a, m, r, o, n, d, e, ;,  , S, t, r, a, t, i,  , F, 1, 4, 7, ,,  , W, e, b, i,  , F, 1, 4, 7, ,,  , R, i, k, i,  , F, 1, 4, 9, a, /, b]

- **Bewijs:** 0.5.11: Logs hebben nu een kop met commit en platform (run-regression.mjs:48-52), maar zijn van eerdere commits dan HEAD (zie F126). || 0.5.10: Geverifieerd: regels 1-99 van win/regression-round2b.log zijn byte-identiek aan regels 2-100 van win/regression-0.5.9.txt. Dat log start 2026-10-30 22:03:47 CET (kop "regression 0.5.9"), 45 min vóór a3bfaf7 (22:48:35 CET), en bevat round2.mjs (r.99), dat pas in a3bfaf7 werd toegevoegd (git log --diff-filter=A).
- **Reproductie:** diff <(sed -n 1,99p win/regression-round2b.log) <(sed -n 2,100p win/regression-0.5.9.txt)
- **Fix:** Per release één ruw log met commit-hash en versie in de kop; nooit logs samenplakken.

#### F149 · Major · Deels opgelost · P1 · Bewijs/claims — Claims zonder platform of log: 98/98 zonder "Windows", "CI draait B-rep-pass", "0.5.10 geïnstalleerd (19/19)" [N, i, e, u, w,  , i, n,  , d, e,  , t, e, a, m, r, o, n, d, e, ;,  , R, i, k, i,  , F, 1, 4, 8, ,,  , S, t, r, a, t, i,  , F, 1, 5, 2, ,,  , W, e, b, i,  , (, 1, 9, /, 1, 9, ), ,,  , R, i, s, k,  , §, 4, ., 5]

- **Bewijs:** 0.5.11: Grotendeels opgelost: claims noemen platform/commit. Uitzondering: "checks, desktop groen" (win/linux/README.md) zonder ruw log. || 0.5.10: Geverifieerd: TASKS.md:810 en commit a3bfaf7 noemen 98/98 / B-rep 12/12 / worker 6/6 zonder platform, terwijl eerdere commits "Windows" vermeldden; README.md:55-56 zegt dat de cijfers Windows-cijfers zijn. README.md:90 claimt een CI-B-rep-pass (zie F147). TASKS.md:814 claimt "release 0.5.10 geïnstalleerd (19/19)" zonder enig log; QA schreef eerder ten onrechte "niet voor 0.5.10 geclaimd".
- **Reproductie:** –
- **Fix:** Elke claim met platform, commit en pad naar het ruwe log.

#### F159 · Major · Deels opgelost · P1 · Kernel — B-rep-resultaat vervangt het mesh-resultaat zonder volume-kruiscontrole; mesh-waarschuwingen van exacte bodies worden weggegooid [N, i, e, u, w,  , i, n,  , d, e,  , t, e, a, m, r, o, n, d, e, ;,  , R, i, s, k,  , F, 1, 4, 7]

- **Bewijs:** 0.5.11: Kruiscontrole bestaat (volumeCheck.ts:8 VOLUME_MISMATCH = 0.005) maar 0,5 % is te ruim om een gemiste of extra fillet te vangen (F172). || 0.5.10: Geverifieerd: src/app/brepRefine.ts:51-70 refinedResult wisselt exacte bodies in zonder vergelijking met het mesh-volume; waarschuwingen blijven alleen voor facet-bodies (:67-69). Daardoor blijft F140 stil.
- **Reproductie:** –
- **Fix:** Bij |V_exact − V_mesh|/V > 0,5 %: melding "exact en facet wijken af" en de feature markeren.

#### F180 · Major · Deels opgelost · P1 · QA-proces — Herkomst en logverwijzingen van het QA-rapport waren niet sluitend [RIKI-01, RIKI-02, RIKI-03, RISK-03, RISK-04, RISK-10, WEBI-01, MT5D-12, MT5D-17, STRATI-04]

- **Bewijs:** 0.5.11 teamronde: Box-logs dragen "commit dcd49df" (lokale stand-in-commit, logs/git-standin.txt), terwijl het rapport "commit unknown" zei; inhoud = db0d4b2 volgens provenance.txt en de zip-comment (688/688 bestanden, Risk). 28 pariteitsrijen verwezen naar logs die in deze map niet bestaan (logs/regression.log, regression-rerun.log, qa-strict-tests.log, qa-brep-tests.log); rij 56 gebruikte 0.5.10-cijfers; prefs-unused.txt en regression-worker.log ontbraken; B-rep deel 1 heeft geen eigen DONE-regel (gecombineerd log); desktop-installed is 2 regels. In deze revisie hersteld: alle rij-verwijzingen wijzen naar bestaande 0.5.11-logs, rij 56 herzien, de herkomstzin gecorrigeerd. Open: een echte git-kloon en een ongesplitste B-rep-run.
- **Reproductie:** rg "logs/regression.log" parity.json (vóór deze revisie 28 rijen).
- **Fix:** Echte git clone op de release-commit; logs niet combineren maar per run bewaren.

#### F184 · Major · Nieuw · P1 · Testen/CI — Geen herhaalde runs, mutatietests, rand-asserts of .kcad-compatibiliteitstest [RIKI-09]

- **Bewijs:** 0.5.11 teamronde: Elke groene pass is één run; geen mutatietest die bewijst dat de QA-tests een fout vangen; geen assert op welke rand gefillet wordt; geen test dat .kcad van 0.5.10 opent.
- **Reproductie:** –
- **Fix:** N ≥ 10 herhalingen in CI; Stryker of handmatige mutaties op edgesets/volumeCheck; rand-asserts; fixture-bestanden van 0.5.10.

#### F185 · Major · Deels opgelost · P1 · QA-proces — Eigen QA-diagnosetests hebben 0 asserts; B-T3 kiest nog de z=0-rand [RISK-08]

- **Bewijs:** 0.5.11 teamronde: Geteld (rg -c "expect\("): tools/qa-src/qaBrep.test.ts 0, qaDiag 0, qaT3diag 0, qaTeam 0, qaCurved 0; alleen qaStrict.test.ts heeft 20. qaBrep.test.ts:63 kiest met reduce de eerste langste rand: onder B-rep de z=0-rand (zelfde fout als F140). De cijfers komen uit JSON-logs en worden handmatig tegen formules gelegd.
- **Reproductie:** rg -c "expect\(" tools/qa-src/*.ts
- **Fix:** Diagnosetests omzetten naar asserts met positie-gebaseerde randkeuze.

#### F189 · Major · Nieuw · P1 · Juridisch — Juridische grens: interne SW-documentatie en pixel-overlay-plan horen niet in een publieke repo [RISK-06, WEBI-07]

- **Bewijs:** 0.5.11 teamronde: docs/26 en docs/06:3 bevatten SW-specifieke inhoud; NAAR-100 P2-12 stelde een overlay binnen 4 px op SW-screenshots voor; geen EULA. Materiaalbibliotheek volgt SW-naamgeving (WEBI-07).
- **Reproductie:** –
- **Fix:** docs/26 en docs/06 uit de repo vóór publiceren; functionele, geen visuele pariteit; geen pixelkopie; juridische toets door een mens.

#### F190 · Major · Nieuw · P1 · Testen/CI — Geen Windows-job in CI [RISK-07]

- **Bewijs:** 0.5.11 teamronde: ci.yml heeft alleen ubuntu-runners; de Windows-logs zijn handmatig van 0495219/1fd00e3.
- **Reproductie:** –
- **Fix:** windows-latest-job met mesh/release en de packaged self-test.

#### F195 · Major · Nieuw · P1 · Testen/CI — Multibody rood in beide Actions-runs; features dicht bij de 900 s-timeout [WEBI-08]

- **Bewijs:** 0.5.11 teamronde: Actions-runs 41542259973 en 41551048560: multibody rood; features-scripts lopen tegen 900 s. Op de box groen (14/14), dus platform- of timing-afhankelijk.
- **Reproductie:** –
- **Fix:** Oorzaak in CI vinden; timeouts met marge.

#### F197 · Major · Nieuw · P1 · Kernel — Exacte sheet-metal-flange wordt bij afwijking stil vervangen door mesh [MT5D-10]

- **Bewijs:** 0.5.11 teamronde: rebuild.ts:1600-1604: als de exacte flange > 0,5 % afwijkt van mesh, wordt het mesh-resultaat gehouden ("an edge flange and a hem short of material on the exact path"). Het exacte defect blijft verborgen.
- **Reproductie:** –
- **Fix:** Het exacte flange-pad repareren; afwijking melden.

#### F198 · Major · Nieuw · P1 · Testen/CI — Unit-test legt blindheid van de kruiscontrole vast [MT5D-11]

- **Bewijs:** 0.5.11 teamronde: volumeCheck.test.ts:9: expect(volumeMismatch(30439.07, 30431.33)).toBeNull(): het verschil van een hele extra fillet (8,58 mm³) moet stil blijven.
- **Reproductie:** –
- **Fix:** Omkeren zodra de controle per feature werkt (F172).

#### F46 · Major · Deels opgelost · P2 · Performance — CSG/solver op de UI-thread

- **Bewijs:** 0.5.11: Release: worker standaard (rebuildworker 10/10 Linux, 152 s). Browser-e2e en dev draaien mesh-CSG nog op de UI-thread; budget 45 s (F137). || 0.5.10: 0.5.10: Release-builds rebuilden standaard in de worker (rebuildWorker.ts:25-36, perf.rebuildWorker=true); e2e-builds draaien op de UI-thread tenzij ?rebuild=worker. Worker-pass: 5/6 (features TimeoutError na 226 s; rebuildworker 10/10) (logs/regression-worker.log). Budget nog 45 s (F137). || 0.5.1: Team 27-10: Webi: mesh-CSG draait in de browser nog op de UI-thread; rebuildBudgetMs nog 45 000 (re
- **Reproductie:** Zwaar fillet/patroon
- **Fix:** Mesh-booleans naar worker of budget ~5 s + voortgang; meer features exact via B-rep.

#### F47 · Major · Deels opgelost · P2 · Geometrie — Topologische naamgeving

- **Bewijs:** 0.5.11: T1 (gatrand Ø35→Ø50), T2 (revolve) en T3 (gesplitste rand) nu correct op mesh én B-rep (logs/qa-ext-tests.log, logs/qa-t3diag.log). Naamgeving over sweep/loft/patterns/shell niet getest. || 0.5.10: 0.5.10: Mesh: T1-T3 randen worden teruggevonden; B-rep: T3 rondt een extra parallelle rand af (F140) → naamgeving nog niet robuust. || 0.5.1: 0.5.1: Eigen QA-tests (logs/qa-strict-tests.log): T1 fillet op gatrand overleeft Ø35→Ø50 ✓; T3 rand gesplitst door later ingevoegde slot: slechts 1 van 2 delen afgerond, zonder waarschuwing ✗ (F111); T2 revolve-fillet faalt na maatwijziging ✗ (F110). Face na
- **Reproductie:** Edge-fillet na edit
- **Fix:** Topologische id’s afronden.

#### F48 · Major · Deels opgelost · P2 · Geometrie — CSG-resultaat ongecontroleerd / toleranties

- **Bewijs:** 0.5.11: Volume-kruiscontrole B-rep↔mesh bestaat (volumeCheck.ts:8) maar met drempel 0,5 %: te ruim (F172). || 0.5.10: 0.5.10: niet opnieuw getest, status overgenomen. || 0.5.1: Volume-/gesloten-check vangt fouten (T2: "boolean result failed the volume check") — goed — maar de feature valt dan weg i.p.v. te slagen. || 0.4.8: B-rep volume-check vs meshTool (rebuild.ts); niet overal manifold-gate
- **Reproductie:** Boolean zwaar
- **Fix:** Structurele manifold-check na elke boolean.

#### F49 · Major · Open · P2 · Electron — Release-hardening (heropend; samengevoegd met F117)

- **Bewijs:** 0.5.11: win/signature-0.5.11.txt: setup, portable en win-unpacked exe alle NotSigned; nu eerlijk gemeld ("not code-signed: there is no certificate"). || 0.5.10: 0.5.10: Geïnstalleerde Phlippo CAD.exe: Get-AuthenticodeSignature = NotSigned (laptop, read-only). Bewust (docs/25), maar blokkeert publiceren (SmartScreen). Teamronde: Opnieuw gemeten op 2-11 (alleen lezen): geïnstalleerde exe, Setup-0.5.10.exe, portable en win-unpacked alle vier NotSigned (win/signature-0.5.10.txt). || 0.5.1: Team 27-10: Strati/MT5: heropend — "Opgelost (bewust geen signing)" sp
- **Reproductie:** Installer
- **Fix:** Geen (bewust).

#### F97 · Major · Deels opgelost · P2 · Electron — Packaged app:// + OCCT WASM niet smoke-getest op Windows

- **Bewijs:** 0.5.11: win/desktop-installed-0.5.11.txt meldt alleen "19/19 checks passed": geen commit, geen lijst van checks, geen tijd. Packaged smoke bestaat, maar het bewijs is niet controleerbaar. || 0.5.10: 0.5.10: Niet opnieuw op Windows getest; box-self-test (app://, 0.5.10) 8/8 zonder GPU en met SwiftShader (logs/self-test-nogpu.json, logs/self-test-softgl.json). Teamronde: logs/self-test-nogpu.json:3 en self-test-softgl.json:3: "packaged": false. Een packaged (geïnstalleerde) self-test van 0.5.10 is er niet (F151). || 0.5.1: 0.5.1: Windows packaged self-test (app://, 0.5.1) 8/8 ok — logs/windows-
- **Reproductie:** Windows NSIS-build: open part → extrude → fillet → STEP → Save; of uitbreiden desktop-installed/nohooks.mjs
- **Fix:** Windows packaged smoke zonder hooks: app://+WASM laden, Zoom/Fit, Final Render, extrude+fillet, STEP, Save/Save As. Gate release erop.

#### F112 · Major · Deels opgelost · P2 · UI/Options — Options-dialoog: 334 van 379 instellingen doen niets (nu eerlijk grijs)

- **Bewijs:** 0.5.11: Ongewijzigd: WIRED_PREFS telt 45 sleutels (prefsWired.ts:5) van 379 in prefsSchema.ts; 334 grijs "Not available". Eerlijk, maar 88 % van de Options doet niets. || 0.5.10: 0.5.10: 379 sleutels (prefsSchema+prefs), 45 in WIRED_PREFS, 334 inert maar grijs met "Not available in this version of Phlippo CAD." (options.tsx:80-81; logs/prefs-unused.txt); prefsWired.test.ts bewaakt de lijst; AutoRecover schrijft echt (autoRecover.ts). Eerlijkheid opgelost; slechts ≈12 % van de opties werkt → Kritiek → Major. || 0.5.1: Team 27-10: Strati: ↑Kritiek; Risk: AutoRecover/Backup-s
- **Reproductie:** rg per sleutel buiten prefs.ts
- **Fix:** Inerte opties verbergen of grijs maken; AutoRecover-interval/-map echt implementeren (nu alleen localStorage-autosave).

#### F114 · Major · Deels opgelost · P2 · Import/Export — Geen IGES-, DWG- of Parasolid-export (PDF/DXF van tekeningen nu wel)

- **Bewijs:** 0.5.11: Nog steeds geen IGES-, DWG- of Parasolid-export; wel PDF/DXF van tekeningen. Zie ook F171. || 0.5.10: 0.5.10: PDF/DXF-export van tekeningen (sheetExport.ts, export2d.ts + export2d.test.ts, e2e/sheetexport.mjs). IGES, DWG en Parasolid ontbreken nog. || 0.5.1: MenuBar.tsx: Open .kcad/.json/.stl/.step/.stp; Save As STL/3MF/AMF/STEP AP214. Geen IGES/DXF/DWG/PDF; Print = window.print().
- **Reproductie:** MenuBar.tsx Save As-lijst
- **Fix:** DXF/PDF-export van tekeningen (vector), IGES via OCCT.

#### F117 · Major · Open · P2 · Installer — Installer/exe niet code-signed (samengevoegd met F49) [M, a, j, o, r,  , v, o, l, g, e, n, s,  , Q, A,  , e, n,  , a, l, l, e,  , r, e, v, i, e, w, e, r, s, ;,  , N, o, t, S, i, g, n, e, d,  , o, p,  , 2, -, 1, 1,  , o, p, n, i, e, u, w,  , g, e, m, e, t, e, n,  , (, F, 1, 5, 0, )]

- **Bewijs:** 0.5.11: Samengevoegd met F49: NotSigned (win/signature-0.5.11.txt). || 0.5.10: 0.5.10: NotSigned bevestigd (zie F49). Teamronde: Opnieuw gemeten op 2-11 (alleen lezen): geïnstalleerde exe, Setup-0.5.10.exe, portable en win-unpacked alle vier NotSigned (win/signature-0.5.10.txt). || 0.5.1: Team 27-10: Strati: ↑Major voor publieke verspreiding; tegenspraak met F49 "Opgelost (bewust geen signing)" → F49 heropend en samengevoegd: één fix (signen of expliciet "alleen eigen gebrui
- **Reproductie:** Get-AuthenticodeSignature
- **Fix:** Code-signing certificaat (of minimaal documenteren).

#### F121 · Major · Deels opgelost · P2 · Features — Ontbrekende SolidWorks-features: Dome, Indent, Mounting Boss, Snap Hook, Lip/Groove; Smart Fasteners en Instant3D slechts deels (Auto Fasteners, Drag Handles)

- **Bewijs:** 0.5.11: Dome exact (qaBrep "a Dome on a round pad is an exact sphere segment"); Indent, Mounting Boss, Snap Hook, Lip/Groove nog alleen mesh en vereenvoudigd; geen vergelijking met SOLIDWORKS-maatvoering. || 0.5.10: 0.5.10: Dome/Indent/Mounting Boss/Snap Hook/Lip-Groove bestaan (plasticsTypes.ts, plastics.ts, 12 unit-tests, e2e plastics) maar alleen op de mesh-kernel; Auto Fasteners aanwezig (store.ts:461). || 0.5.1: featureTypes.ts (~60 types) bevat ze niet; rg "dome|mountingBoss|snapHook|lipGroove|instant3d" = 0 feature-hits ("Indent" alleen als sheet-metal gusset-optie).
- **Reproductie:** rg in src
- **Fix:** Prioriteren: Dome, Indent, Mounting Boss, Instant3D (drag handles).

#### F122 · Major · Deels opgelost · P2 · Tekeningen — Standaardaanzichten zonder automatische centermarks/verborgen lijnen [D, e, e, l, s,  , v, o, l, g, e, n, s,  , W, e, b, i,  , e, n,  , R, i, s, k, :,  , a, l, l, e, e, n,  , u, n, i, t, -, t, e, s, t, s, ,,  , g, e, e, n,  , e, 2, e, ;,  , v, e, r, b, o, r, g, e, n,  , l, i, j, n, e, n,  , i, n,  , g, e, e, n,  , e, n, k, e, l, e,  , s, h, o, t, ;,  , c, e, n, t, e, r, m, a, r, k, s,  , o, n, t, b, r, e, k, e, n,  , i, n,  , D, e, t, a, i, l,  , B,  , v, a, n,  , s, h, o, t, s, /, d, e, u, r, k, r, u, k, -, t, e, k, e, n, i, n, g, ., p, n, g, ;,  , Q, A,  , h, a, d,  , O, p, g, e, l, o, s, t]

- **Bewijs:** 0.5.11: autoMarks/hlr bestaan met unit-tests; correctheid tegen een SOLIDWORKS-tekening niet gemeten (referentie nodig). || 0.5.10: 0.5.10: Auto centermarks + verborgen lijnen (core/drawing/autoMarks.ts, hlr.ts met tests). || 0.5.1: Team 27-10: Webi: ↑Major — tekening zonder centermarks/verborgen lijnen is geen SOLIDWORKS-standaardaanzicht. Riki: vergelijking met de SW-standaard niet geverifieerd. || shots/e42-three-views.png, e43-drawing: gat Ø35 alleen in bovenaanzicht zichtbaar; geen centermark, geen verborgen lijnen in voo
- **Reproductie:** drawing.mjs
- **Fix:** Document-optie "auto insert center marks" + weergavemodus Hidden Lines Visible.

#### F126 · Major · Deels opgelost · P2 · Proces/Bewijs — Windows-regressielog is geplakt, geen ruwe runner-output [S, t, r, a, t, i, ,,  , W, e, b, i, ,,  , R, i, k, i, :,  , Q, A, -, t, e, k, s, t,  , w, a, s,  , f, o, u, t,  , (, ", r, o, u, n, d, 2, b,  , b, e, v, a, t,  , m, a, a, r,  , 6,  , s, c, r, i, p, t, s, ", )]

- **Bewijs:** 0.5.11: Windows-logs zijn nu ruwe runner-output met kop (commit/platform), maar van 0495219 (mesh/release 98/98) en 1fd00e3 (brep 12/12), niet van HEAD db0d4b2. || 0.5.10: 0.5.10: Ruwe runner-logs bestaan nu op de laptop (win/regression-0.5.9.txt, win/regression-round2b.log). Maar het volledige 98/98-log is als 0.5.9 benoemd en het 0.5.10-log (round2b) bevat maar 6 scripts. Teamronde: Correctie: win/regression-round2b.log bevat niet 6 scripts. Regels 1-99 zijn byte-identiek aan regels 2-100 van win/regression-0.5.9.txt (diff, geen verschil), plus B-rep 12/12 (r.112)
- **Reproductie:** Header van win/regression-0.5.9.txt vergelijken met git log -1 a3bfaf7
- **Fix:** Ruwe e2e-out/regression-*.txt of een GitHub Actions-artefact bewaren; geen handgeschreven samenvattingen als bewijs.

#### F130 · Major · Deels opgelost · P2 · Proces — Breedte boven correctheid: +7608 regels, maar geen tests voor mate-richting/conflict of gesplitste randen

- **Bewijs:** 0.5.11: Deels: mateStatus.test.ts:16 (M1) en :30 (M2, "one is flagged") staan in de repo; M3 (keten van 4), M5 (gesloten lus) en de eis dat de nieuwste mate gemarkeerd wordt zitten alleen in de externe QA-tests (tools/qa-src/qaStrict.test.ts). src/qa/qaStrict.test.ts bevat alleen geometrie (8 tests). || 0.5.10: 0.5.10: Nieuwe unit-tests mateStatus/revolve2/edgesets; maar de mesh-gatrand-fout (F139) en B-rep-T3 (F140) vallen door die tests heen; intussen 9 releases in 3 dagen met veel look-dev. || 0.5.1: Strati N8: diff 0.4.8→0.5.1 src +7608/−4321. Correctie QA: er zijn wél mate-unit-tests (assembly.test.ts:75,96; mates2.test.ts), maar geen enkele dekt richtingsafhankelijkheid (M1), conflict (M2) of gespl
- **Reproductie:** git diff --stat 81f9c95..46fc2f3
- **Fix:** M1/M2/T2/T3 als vaste regressietests; UI-pariteit bevriezen tot F108/F109/F111 groen zijn.

#### F192 · Major · Nieuw · P2 · UI/UX — Extra views (Two/Four View) zijn niet interactief [WEBI-04]

- **Bewijs:** 0.5.11 teamronde: In SOLIDWORKS kun je in elk viewport selecteren, draaien en zoomen; hier zijn de extra panes alleen beelden.
- **Reproductie:** Four View, klik in een extra pane.
- **Fix:** Interactie per pane.

#### F145 · Minor · Deels opgelost · P2 · Testen/CI — features-script niet-deterministisch: Sweep1 "path sketch has no lines" met volgfouten (oorzaak niet geverifieerd) [M, a, j, o, r,  , v, o, l, g, e, n, s,  , R, i, k, i,  , e, n,  , M, T, 5,  , D, e, v,  , (, e, n,  , R, i, s, k,  , b, i, j,  , h, e, r, h, a, l, i, n, g, ), ;,  , Q, A,  , h, a, d,  , M, i, n, o, r]

- **Bewijs:** 0.5.11 teamronde: Eén groene run (features 65/65 mesh en B-rep) bewijst geen stabiliteit; in 0.5.10 faalde Sweep1 1×. Deels tot N ≥ 10 herhaalde runs zonder fout (Riki). || 0.5.11: features 65/65 op mesh (163 s) en B-rep (352 s) op Linux. || 0.5.10: features 59/65 in standaardrun (Sweep1 'path sketch has no lines…'), TimeoutError in B-rep- en worker-pass, maar 65/65 bij herhaling op mesh en B-rep (logs/regression.log, logs/regression-brep.log, logs/regression-worker.log, logs/regression-rerun.log, logs/regression-rerun-brep.log). Teamronde: Sweep1-fout "The path sketch has no lines, arcs or splines to sweep along." met volgfouten in Imported1
- **Reproductie:** Herhaal node e2e/run-regression.mjs features een paar keer.
- **Fix:** Lange script opsplitsen, expliciet wachten op rebuild-klaar i.p.v. vaste timeouts.

#### F151 · Minor · Deels opgelost · P2 · Testen/CI — Self-tests draaien ongepackaged (packaged:false) en met SwiftShader: geen installer-test en geen echte no-WebGL-test [N, i, e, u, w,  , i, n,  , d, e,  , t, e, a, m, r, o, n, d, e, ;,  , S, t, r, a, t, i,  , F, 1, 5, 4, ,,  , R, i, k, i,  , F, 1, 5, 1, ,,  , M, T, 5,  , D, e, v,  , (, M, T, 5, D, -, 0, 6, /, F, 9, 7, )]

- **Bewijs:** 0.5.11: Self-tests draaien nog ongepackaged; packaged smoke op Windows bestaat maar het log is onvolledig (F97). || 0.5.10: Geverifieerd: logs/self-test-nogpu.json:3 en logs/self-test-softgl.json:3 "packaged": false. "Zonder GPU" betekent hier software-GL, niet geen WebGL.
- **Reproductie:** –
- **Fix:** Self-test ook op de geïnstalleerde exe draaien (Windows) en één run met WebGL echt uit.

#### F173 · Minor · Nieuw · P2 · Testen/CI — Strikte QA-tests in de repo hebben te ruime toleranties

- **Bewijs:** 0.5.11: qaStrict.test.ts:26 accepteert |V−verwacht|/sharp < 0,3 % (≈160 mm³ op T1, meer dan het hele fillet-verlies van 97 mm³; gelukkig dekken :24-25 het verlies met ±5 %); :69 accepteert 25 mm³ bij "stadium". qaBrep gebruikt exacte waarden.
- **Reproductie:** Lees qaStrict.test.ts:19-70.
- **Fix:** Mesh-toleranties op ±2 % van het verlies, B-rep op 1e-3 mm³.

#### F183 · Minor · Nieuw · P2 · Testen/CI — CI-brep-job draait 12 van de 14 B-rep-scripts (loftface en pmsweep ontbreken) [RIKI-05, MT5D-16d]

- **Bewijs:** 0.5.11 teamronde: ci.yml:137 noemt 12 scripts; op de box draaiden er 14 (logs/regression-brep.log).
- **Reproductie:** Lees ci.yml:133-138.
- **Fix:** loftface en pmsweep toevoegen.

#### F188 · Minor · Nieuw · P2 · Robuustheid — AutoRecover-kopieën van 0.5.10 worden mogelijk niet getoond [RISK-05]

- **Bewijs:** 0.5.11 teamronde: recover.cjs:27-29: alleen namen met ~<16 hex>.autorecover.kcad gelden als herstelbestand; oudere kopieën zonder sleutel vallen erbuiten (niet in een e2e getest).
- **Reproductie:** Leg een 0.5.10-autorecover in de map en start 0.5.11.
- **Fix:** Oude naamvorm ook herkennen of eenmalig migreren.

#### F196 · Minor · Nieuw · P2 · Installer — Electron-fuses niet getest in de gepackagede app [WEBI-09]

- **Bewijs:** 0.5.11 teamronde: Fuses staan in de config, maar geen test controleert ze in de geïnstalleerde exe.
- **Reproductie:** –
- **Fix:** @electron/fuses read in de packaged smoke.

#### F199 · Minor · Nieuw · P2 · Import/Export — Meegeleverde OCCT heeft geen IGES-writer [MT5D-15]

- **Bewijs:** 0.5.11 teamronde: replicad_single.d.ts en replicad_multi.d.ts: 0× IGESControl_Writer (STEPControl_Writer 4×). IGES-export vergt een eigen OCCT-build met de IGES-module.
- **Reproductie:** rg IGESControl_Writer node_modules/replicad-opencascadejs/dist/*.d.ts
- **Fix:** Eigen opencascade.js-build met IGES (gratis, ±3–5 d) of IGES buiten scope.

#### F16 · Major · Niet geverifieerd · P3 · Visueel — Iconen en lettertype

- **Bewijs:** 0.5.11: Niet te meten zonder SOLIDWORKS-referentie naast elkaar (zelfde model, zelfde resolutie). Geen wijziging in 0.5.11. || 0.5.10: 0.5.10: Niet opnieuw naast SOLIDWORKS gelegd; look is in 0.5.6-0.5.7 veranderd (studio look). || 0.5.1: Team 27-10: Webi: geen SOLIDWORKS-referentieshots in 0.5.1 → pixel-/icoongelijkheid niet geverifieerd (status was "Deels opgelost"). || 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Plaatwerk/eigen iconen; Segoe-referentie niet pixelgelijk; ontwerpro
- **Reproductie:** compare
- **Fix:** Icon-set en lettertype verder afstemmen of workflow-herkenbaarheid als doel houden.

#### F137 · Major · Open · P3 · Performance — Rebuild-budget nog 45 s; mesh-CSG op de UI-thread in de browser

- **Bewijs:** 0.5.11: Budget nog 45 s (store.ts:1234, :1261 rebuildBudgetMs); browser-mesh-CSG op de UI-thread. || 0.5.10: 0.5.10: rebuildBudgetMs nog 45 000 (rebuild.ts:875); browser-release gebruikt wel de worker. || 0.5.1: Webi/Risk: rebuild.ts:875 `export let rebuildBudgetMs = 45_000` (QA nagelezen); in de browser of zonder perf.rebuildWorker blijft mesh-CSG synchroon (store.ts:1231). 0.4.8-advies niet uitgevoerd. Verwant aan F46/F125.
- **Reproductie:** rebuild.ts:875
- **Fix:** Budget naar ≈5 s met voortgang/annuleren; CSG standaard in de worker.

#### F21 · Minor · Niet geverifieerd · P3 · Visueel — Taakvenster-iconen

- **Bewijs:** 0.5.11: Niet te meten zonder SOLIDWORKS-referentie naast elkaar (zelfde model, zelfde resolutie). Geen wijziging in 0.5.11. || 0.5.10: 0.5.10: Niet opnieuw naast SOLIDWORKS gelegd; look is in 0.5.6-0.5.7 veranderd (studio look). || 0.5.1: Team 27-10: Webi: geen SOLIDWORKS-referentieshots in 0.5.1 → pixel-/icoongelijkheid niet geverifieerd (status was "Deels opgelost"). || 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Taakvenster-tabs op referentiemaat (0.3.6); iconen niet volledig her
- **Reproductie:** Taakvenster
- **Fix:** Iconen nalopen.

#### F22 · Minor · Niet geverifieerd · P3 · Visueel — Body-randen

- **Bewijs:** 0.5.11: Niet te meten zonder SOLIDWORKS-referentie naast elkaar (zelfde model, zelfde resolutie). Geen wijziging in 0.5.11. || 0.5.10: 0.5.10: Niet opnieuw naast SOLIDWORKS gelegd; look is in 0.5.6-0.5.7 veranderd (studio look). || 0.5.1: Team 27-10: Webi: geen SOLIDWORKS-referentieshots in 0.5.1 → pixel-/icoongelijkheid niet geverifieerd (status was "Deels opgelost"). || 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Randdikte ongewijzigd
- **Reproductie:** Model met body
- **Fix:** Lijndikte silhouet/randen afstemmen.

#### F24 · Minor · Deels opgelost · P3 · Visueel — Extra rij in Modify

- **Bewijs:** 0.5.11: Niet opnieuw onderzocht in 0.5.11 (geen commit raakt het); status ongewijzigd overgenomen. || 0.5.10: 0.5.10: niet opnieuw getest, status overgenomen. || 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Modify Reverse sense (0.4.6); extra rij niet opnieuw bewezen weg
- **Reproductie:** Smart Dimension dubbelklik
- **Fix:** Layout naast referentie controleren.

#### F28 · Minor · Deels opgelost · P3 · UX — Bestandsdialoog bij Insert Component

- **Bewijs:** 0.5.11: Niet opnieuw onderzocht in 0.5.11; status ongewijzigd overgenomen. || 0.5.10: 0.5.10: niet opnieuw getest, status overgenomen. || 0.5.1: niet opnieuw bewezen in 0.5.1; geen code-wijziging gevonden die dit sluit. || 0.4.8: Code aanwezig; packaged desktop niet hertest deze ronde
- **Reproductie:** Insert Component desktop
- **Fix:** desktop-installed.mjs op Windows.

#### F38 · Minor · Deels opgelost · P3 · Docs — README/TASKS

- **Bewijs:** 0.5.11: README heeft nu "Status 0.5.11 (in voorbereiding)" (README.md:47); TASKS.md noemt nog "qaBrep.test.ts (11)" terwijl het er 13 zijn (README klopt). || 0.5.10: 0.5.10: README "Status" stopt bij 0.5.4 terwijl de versie 0.5.10 is (README.md:46); TASKS en commit a3bfaf7 melden 98/98, op Linux niet gehaald. || 0.5.1: 0.5.1: docs/23 zegt eerlijk "Linux en de CI zijn niet gedraaid"; maar commit 358b3ba claimt een Linux-fix die niet standhoudt. || 0.4.8: docs/12 claimt F10/F54 opgelost; commits 0.4.x claimen regressie 86/86; op Linux drawing rood (F93)
- **Reproductie:** docs vs logs/regression.log
- **Fix:** Docs/commits eerlijk houden over Linux-CI.

#### F124 · Minor · Open · P3 · Scope — Bewuste gaten uit docs/24 (Magnified Selection, Instant2D, virtual-sharp flange, 3D-schetsmaten)

- **Bewijs:** 0.5.11: Ongewijzigd bewuste gaten (docs/24): Instant2D, Magnified Selection, 3D-schetsmaten, virtual-sharp flange. || 0.5.10: 0.5.10: niet opnieuw getest, status overgenomen. || docs/24 somt ze zelf op.
- **Reproductie:** docs/24
- **Fix:** Op roadmap of uit UI.

#### F129 · Minor · Deels opgelost · P3 · Docs — Verouderde docs en tellingen

- **Bewijs:** 0.5.11: TASKS.md "qaBrep.test.ts (11)" vs werkelijk 13; docs/28 F142-tekst verouderd. || 0.5.10: 0.5.10: docs/23 bijgewerkt; maar README-status 0.5.4, docs/25 noemt het 0.5.1-rapport "6/10" (was 5/10 na teamronde). || 0.5.1: Strati N7: docs/23:4 zegt nog "Linux en de CI zijn niet gedraaid, omdat de branch niet gepusht wordt" (branch is gepusht); Risk: README.md:69/74/79 idem/onbewezen. Ook dit QA-rapport noemde 124 i.p.v. 125 bevindingen (§12) — gecorrigeerd.
- **Reproductie:** docs/23 r.4; README.md
- **Fix:** Docs bijwerken; geen "groen" zonder run-link.

#### F134 · Minor · Open · P3 · Code — Line-budget-caps staan op de huidige grootte, niet op een doel (MT5D-08) [D, e, e, l, s,  , o, p, g, e, l, o, s, t,  , v, o, l, g, e, n, s,  , M, T, 5,  , D, e, v,  , (, c, a, p, s, ,,  , g, e, e, n,  , d, o, e, l, e, n, ;,  , g, e, e, n,  , s, p, l, i, t, s, p, l, a, n, ), ;,  , Q, A,  , h, a, d,  , O, p, g, e, l, o, s, t]

- **Bewijs:** 0.5.11: line-budget.cjs:12 CAPS staan nog op de huidige grootte (rebuild.ts cap 3398, werkelijk 3393); geen doelwaarde. || 0.5.10: 0.5.10: Caps bevroren op huidige grootte en verlaagd bij splitsing (repo: tools/line-budget.cjs). Teamronde: logs/ci-checks.log: "rebuild.ts … above the goal of 1000"; caps op grootte+1 (tools/line-budget.cjs:13-22). || 0.5.1: MT5 Developer: tools/line-budget.cjs caps vs wc -l (QA nageteld): rebuild.ts 3499/3500, Viewport.tsx 1699/1700, store.ts 1445/1450, slices/features.ts 1592/1600.
- **Reproductie:** node tools/line-budget.cjs
- **Fix:** Caps verlagen als doel en monolieten opsplitsen.

#### F138 · Minor · Deels opgelost · P3 · Build/Security — npm audit: 17 kwetsbaarheden (15 moderate, 2 high) in de electron-builder-keten

- **Bewijs:** 0.5.11: npm audit: 15 moderate, 0 high (was 2 high) in de dev-keten electron-builder/minimatch; productie-afhankelijkheden 0 (logs/audit.json, logs/audit-prod.json). || 0.5.10: logs/audit.log: follow-redirects 1.16.1, joi 18.3.0, minimatch 10.2.6; --omit=dev: 0 (logs/audit-prod.log). Zelfde versies als 0.5.1 → nieuwe advisories, alleen build-tijd.
- **Reproductie:** npm audit
- **Fix:** electron-builder/overrides bijwerken.

#### F161 · Minor · Deels opgelost · P3 · Weergave — Shading-naad en spikkels; STEP-import toont mesh ("300 triangles") [N, i, e, u, w,  , i, n,  , d, e,  , t, e, a, m, r, o, n, d, e, ;,  , W, e, b, i,  , F, 1, 5, 2]

- **Bewijs:** 0.5.11: Niet opnieuw visueel beoordeeld; importStep loopt via OCCT (occtClient.ts:50). || 0.5.10: Volgens Webi: naad in shots/e10-fillet.png, spikkels in e19, STEP-import als mesh (shots/step-imported.png). Niet zelf opnieuw beoordeeld door QA: niet geverifieerd.
- **Reproductie:** –
- **Fix:** Normalen/AO bij exacte bodies nakijken; STEP-import als B-rep tonen.

#### F171 · Minor · Nieuw · P3 · UI/UX — Options ▸ Export en Import tonen IGES en DXF/DWG als formaat zonder exporter

- **Bewijs:** 0.5.11: prefsSchema.ts:313-314 biedt "IGES" en "DXF/DWG" (export.format staat niet in WIRED_PREFS, dus grijs), maar er is geen IGES/DWG-export (F114).
- **Reproductie:** Tools ▸ Options ▸ Export ▸ File Format.
- **Fix:** Formaten zonder exporter uit de lijst halen of markeren als "niet beschikbaar".

#### F174 · Minor · Nieuw · P3 · Performance — Bundelbudget bijna op: 854,86 van 860 kB

- **Bewijs:** 0.5.11: logs/build-release.log: 5,14 kB ruimte; elke feature van betekenis tikt de gate.
- **Reproductie:** npm run build (release).
- **Fix:** Code-splitting van tekeningen/assemblies of budget bewust herzien met motivatie.

#### F186 · Minor · Nieuw · P3 · Assembly — Mate-conflict-heuristiek: "unconverged" hangt aan een tweede solve van 128 iteraties [RIKI-10]

- **Bewijs:** 0.5.11 teamronde: mateStatus.ts:124-128: een geschonden mate die na 128 extra iteraties klopt telt als niet-geconvergeerd, niet als conflict; geen test voor de grens.
- **Reproductie:** –
- **Fix:** Convergentiecriterium expliciet maken en testen.

#### F191 · Minor · Nieuw · P3 · Performance — Extra views tekenen elke 1500 ms opnieuw met een CPU-readback [WEBI-03]

- **Bewijs:** 0.5.11 teamronde: ViewPane rendert periodiek opnieuw en leest pixels terug, ook zonder wijziging.
- **Reproductie:** –
- **Fix:** Alleen bij wijziging renderen.

#### F193 · Minor · Nieuw · P3 · UI/UX — Keuzelijst "Units" onleesbaar; Material-tabs lopen over [WEBI-05]

- **Bewijs:** 0.5.11 teamronde: Zie shots van Options/Material (Webi).
- **Reproductie:** –
- **Fix:** Breedte/omloop corrigeren.

#### F194 · Minor · Nieuw · P3 · UI/UX — Productnaam in drie vormen [WEBI-06]

- **Bewijs:** 0.5.11 teamronde: Venstertitel, installer en About gebruiken verschillende schrijfwijzen.
- **Reproductie:** –
- **Fix:** Eén naam.

### 6.3 Opgelost of ingetrokken in deze ronde

| ID | Was | Nu | Bewijs 0.5.11 |
|---|---|---|---|
| F10 | Open | Opgelost | drawing 28/28 op Linux (Linux-box HEAD db0d4b2, mesh-pass 98/98 groen, 0 skips (logs/regression-mesh.log)); Ø35-maat wordt gepakt en hersteld na reload. |
| F50 | Deels opgelost | Opgelost | 0.5.11 teamronde: Aanvulling (RISK-06, WEBI-07): zie F189 voor de juridische grens van de repo-inhoud; materiaalbibliotheek volgt SW-naamgeving. |
| F94 | Deels opgelost | Opgelost | Pack and Go, MBD en Weldments zichtbaar weg (zie F50). |
| F99 | Deels opgelost | Opgelost | Statusbalk "Faceted n/m" (shots/viewpanes-four.png) en per-feature waarschuwing dat massa en STEP benaderd zijn (rebuild.ts:3314, :3317). |
| F115 | Deels opgelost | Opgelost | ViewPane gebruikt hasWebGL/renderToCanvas uit glSetup (ViewPane.tsx:7, :78); viewpanes 35/35 incl. zonder-WebGL-stap (logs/viewpanes.log, shots/viewpanes-nowebgl.png); self-test zonder GPU 8/8. |
| F118 | Open | Opgelost | Gate bestaat: tools/bundle-budget.cjs:8 BUDGET_KB=860; release-build 854,86 kB (logs/build-release.log). Nog 5,14 kB ruimte: zie F174. |
| F119 | Deels opgelost | Opgelost | Runner telt skips en heeft een skip-budget per script (run-regression.mjs:24, :64, :77); mesh-pass "0 optional step(s) skipped". |
| F120 | Deels opgelost | Opgelost | CI-brep-pass 12 scripts + volledige release-pass op B-rep (ci.yml:89-136). |
| F125 | Deels opgelost | Opgelost | rebuildworker 10/10 op Linux in 152 s (één run; logs/regression-mesh.log). |
| F136 | Deels opgelost | Opgelost | neutral-comments.cjs scant nu ook e2e/ (neutral-comments.cjs:61-74); ci-checks ok (logs/ci-checks.log). |
| F139 | Nieuw | Opgelost | Mesh T1: verlies 97,61 mm³ bij r=17,5 (theorie 96,80) en 138,46 bij r=25 (theorie 137,25); filletApplied=true; B-rep exact 54282,076 / 44227,798 = formule (logs/qa-ext-tests.log). |
| F141 | Nieuw | Opgelost | M2: de nieuwste mate (m2) wordt nu als conflict gemarkeerd (logs/qa-ext-tests.log). |
| F142 | Nieuw | Opgelost | graphify-out zit niet in de HEAD-archive (uit de index). |
| F143 | Nieuw | Opgelost | Zie F115: ViewPane veilig zonder WebGL; viewpanes 35/35. |
| F144 | Nieuw | Opgelost | inventory47 18/18 en videos46 25/25 op Linux (Linux-box HEAD db0d4b2, mesh-pass 98/98 groen, 0 skips (logs/regression-mesh.log)). |
| F146 | Nieuw | Opgelost | sheetexport 12/12, 0 skips op Linux. |
| F150 | Nieuw | Opgelost | Geen valse signing-claim meer: signature-0.5.11.txt zegt "not code-signed: there is no certificate". Signing zelf: F49. |
| F152 | Nieuw | Opgelost | src/qa/qaStrict.test.ts (8 mesh) en qaBrep.test.ts (13 B-rep) in de repo, draaien in vitest 487/487; T1/T3 als gate. Mate-tests M3/M5 ontbreken (F130); toleranties te ruim (F173). |
| F153 | Nieuw | Opgelost | desktop-recover 21/21: twee documenten "Part1" krijgen elk een eigen kopie (logs/desktop-recover.log). |
| F154 | Nieuw | Opgelost | desktop-recover: herstelde kopie opent als "(Recovered)" en dirty; Save vraagt een bestand. |
| F155 | Nieuw | Opgelost | Zie F119: skip-budget per script, DONE-regel toont het aantal skips. |
| F156 | Nieuw | Opgelost | desktop-recover: een door de renderer meegegeven map wordt genegeerd. |
| F157 | Nieuw | Opgelost | Four View toont grijze, belichte modellen met studio-omgeving (shots/viewpanes-four.png, viewpanes-four-dark.png). |
| F158 | Nieuw | Opgelost | CI release-pass = ?kernel=brep&rebuild=worker over alle scripts (ci.yml:89-115). |
| F160 | Nieuw | Opgelost | Eén log per pass/shard (run-regression.mjs:45-48): regression-0.5.11.txt, …-brep-…, …-brep-worker-…. |
| F162 | Nieuw | Opgelost | desktop-recover: gpu.json bewaart alleen de keuze, geen enable-unsafe-swiftshader. |
| F163 | Nieuw | Opgelost | rename-trademarks.cjs:25-27 dekt Weldment(s), Sustainability(-Extras). |
| F164 | Nieuw | Opgelost | src/core/drawing/dbg.test.ts bestaat niet meer. |
| F165 | Nieuw | Opgelost | persistence.ts:139 zet SW-Density om naar Density; legacyNames.test.ts:11. |
| F166 | Nieuw | Opgelost | MATE_PASSES (assembly.ts:430-444) en statusbalk "Not Converged" (StatusBar.tsx:111). |
| F169 | Deels opgelost | Opgelost | Theoriewaarden opnieuw met de gesloten vorm berekend; T2 mesh 432,68 vs 428,74 (logs/qa-ext-tests.log). |
| F140 | Nieuw | Ingetrokken (QA-fout) | 0.5.11 teamronde: Terecht ingetrokken voor 0.5.11 (B-rep op de juiste rand z=−40 gemeten: 30439,911 = formule); voor 0.5.10 afgeleid, niet gedraaid (app-0.5.10 heeft geen vite, logs/qa-t3diag-on-0.5.10.log). De bewering van Webi dat brep.ts/edgesets.ts tussen 0.5.10 en 0.5.11 wijzigden, wordt door de CR-gestripte diffs van Strati, Riki en MT5D tegengesproken. |
| F167 | Nieuw | Ingetrokken (QA-fout) | Volgt uit F140: de oorzaak was onze testopstelling, niet het programma. |

## 7. Risico's

1. **Stille foute geometrie onder het label "exact"** (F177, F175). De gebruiker krijgt geen enkel signaal; Mass Properties, STEP en verdere bewerkingen zijn fout. Dit is precies wat SOLIDWORKS nooit doet.
2. **De vangnetten zien gedeelde fouten niet** (F179, F198): beide kernels delen de randkeuze en een unit-test legt de blindheid vast.
3. **Gebogen randen** (F178): 32 segmenten, mesh-terugval, ±10× fout verlies; één combinatie hing > 10 min.
4. **Bewijs alleen op de QA-box, op een stand-in-commit** (F176, F180, F190): geen groene CI, geen Windows-job, geen echte kloon.
5. **Stabiliteit onbewezen** (F184, F145, F195): elke pass één run; multibody rood in Actions.
6. **Gegevens** (F188): AutoRecover-kopieën van 0.5.10 worden mogelijk niet aangeboden.
7. **Juridisch** (F189): SW-documentatie in de repo; pixel-overlay-plan; geen EULA. Niet publiceren vóór opschoning en toets.
8. **Ongesigneerde installer** (F49): SmartScreen; niet geschikt voor verspreiding.

## 8. Score

### 8.1 QA-score

| Criterium | 0.5.10 | 0.5.11 eerste versie | 0.5.11 herzien | Waarom |
|---|---|---|---|---|
| Correcte geometrie | 4 | 7 | **4** | T1–T3 basis correct, maar stil fout na maatwijziging (F177) en facetten onder "exact" (F175); gebogen rand 10× fout (F178) |
| Functionele pariteit | 6 | 7 | **6** | 70,2 % strikt |
| Bewijs/claims | 4 | 6 | **4** | Stand-in-commit, foute herkomstzin, 28 dode logverwijzingen, niets groen op HEAD buiten de box |
| Tests | 5 | 7 | **5** | 487 unit en 98/98 op de box, maar kruiscontrole blind, CI-brep 12/14, QA-diagnose zonder asserts, geen herhalingen |
| Release-klaar | 3 | 4 | **3** | Ongesigneerd, geen CI, geen Windows-job |
| **Totaal** | **5/10** | 6/10 | **5/10** | Gemiddelde 4,4; naar boven afgerond omdat de basis-T1–T3 en de regressie echt verbeterd zijn. Geen 6 met 3 Kritiek open |

### 8.2 Teamscores

| Reviewer | Focus | Score | Pariteit | Belangrijkste punt |
|---|---|---|---|---|
| Strati | geometrie, strategie | 5/10 | 71,8 % | STRATI-01: stille foute fillet na maatwijziging (bevestigd, F177) |
| Riki | regressie, bewijs | 6/10 | 71,8 % | logs en herkomst niet sluitend; CI-brep 12/14 (F180, F183) |
| Risk | risico, gegevens, juridisch | 6/10 | 74,2 % | P0-2-drempel geeft valse alarmen; AutoRecover 0.5.10; juridische grens (F172, F188, F189) |
| Webi | UI/UX, CI | 5,5/10 | 73,4 % | extra views niet interactief; multibody rood in Actions (F192, F195) |
| MT5D | code, kernel | 5/10 | 74,2 % | volumeCheck.test.ts:9; flange gemaskeerd; geen IGES-writer (F197–F199) |
| **QA herzien** | alles | **5/10** | **70,2 %** | strengste lezing met boxbewijs |

## 9. Wat nu

### 9.1 P0 — eerst (zie §11, fase F0)

1. **Eerlijk label, interim:** ellips/spline/wrap-patch en fillets op gesplitste/gebogen referenties `exact:false` + waarschuwing (F175, F177, F178).
2. **STRATI-01 repareren:** gesplitste referentie = alle stukken; waarschuwen bij een keuze uit meerdere kandidaten (F177).
3. **Kruiscontrole per feature, onafhankelijk van `matchEdges`,** met volume, oppervlak, zwaartepunt, bbox en face/edge-aantallen en een tessellatie-bewuste drempel (F172, F179); `volumeCheck.test.ts:9` omkeren (F198).
4. **Groene Actions-run op de release-commit vanuit een echte git-kloon,** CI-brep 14/14, plus een Windows-job (F176, F183, F190).
5. **QA-tests met asserts en randkeuze op positie;** herhaalde runs (N ≥ 10) en mutatietests (F185, F184).

### 9.2 Voorwaarden voor eigen gebruik (geconsolideerd uit Risk 1–6 en Strati)

Eigen concept- en hobbywerk kan, **mits**:
1. **Mass Properties opnieuw controleren** na een fillet of chamfer op een gesplitste of gebogen rand, en na elk invoegen van een feature vóór een fillet of elke maatwijziging daarvóór. Vergelijk met een handberekening of herselecteer de randen (F177, F178).
2. **Ellipsen, splines en wrap-patches zijn niet exact**, ook als er "Exact" staat. Niet gebruiken voor maatkritische delen of STEP naar derden (F175).
3. **Face fillet, full round, setback en plastics gaan via mesh** (F51); let op de **Faceted**-cel in de statusbalk en de waarschuwingen in de boom.
4. **Vaak Ctrl+S**; AutoRecover is goed, maar niet je enige kopie.
5. **Crashkopieën van 0.5.10 eerst in 0.5.10 openen** en opslaan, vóór je overstapt (F188).
6. Niet verspreiden: ongesigneerde installer, geen CI-bewijs (F49, F176).
7. STEP-export van gefillete of gebogen geometrie in een tweede CAD-pakket nameten vóór gebruik.

### 9.3 Besluiten voor Ian

Zie §11 (NAAR-100 §6): B1 rij 37 en 54 herdefiniëren; B2 DWG/Parasolid betalen of buiten scope; B3 code-signing; B4 SOLIDWORKS-licentie voor R0; B5 repo publiek maken (pas na de juridische opschoning, NAAR-100 §7).

## 10. Bijlagen

`findings.json` (199 bevindingen), `parity.json` (62 rijen, met `team_pct` en `log_refs_hersteld`), `NAAR-100.md`, `team/` (vijf reviews), `logs/` (o.a. `qa-team.json`, `qa-team-tests.log`, `qa-curved.log`), `shots/`, `tools/` (generatoren `build_findings_0511.py`, `parity_0511.py`, `team_0511.py`, `mkreport_0511.py`; QA-bronnen `tools/qa-src/`; eerste versies `naar100-v1.md`, `mkreport_0511-v1.py`), `win/`, `provenance.txt`.

## 11. Weg naar 100%

*Opgesteld 3 november 2026 (Europe/Brussels, UTC+1), herzien dezelfde dag na de vijf teamreviews (Strati, Riki, Webi, Risk, MT5D; `team/`). Ieder punt heeft een meetbare acceptatietest, de plek in de code (bestand:regel op HEAD `db0d4b2`) en een inschatting in werkdagen voor één ontwikkelaar met de huidige agent-setup. Statussen en cijfers: `findings.json` en `parity.json`. De eerste versie van dit plan staat als `tools/naar100-v1.md`; de fouten daarin zijn bevinding F182.*

### 1. Waar we staan

- **Strikte pariteit: 70,2 %** (30 aanwezig, 27 deels, 5 ontbreekt, 0 kapot). De eerste versie zei 75,0 %; zie F181.
- **3 Kritiek open:** F177 (stille foute fillet op een gesplitste rand na een maatwijziging, onder "exact"), F175 (facetten onder het label "exact": ellips, spline, wrap-patch) en F176 (geen groene CI op de release-commit).
- **Geen enkel "groen" buiten de QA-box op HEAD.**

### 2. Meetbare definitie van "100 %" (overgenomen van Strati §5.5)

Een release is **100 % SW-gelijk** als al het volgende waar is, op één release-commit:

1. **Pariteit:** 62/62 rijen "aanwezig", waarbij rij 37, 42/51 en 54 vooraf door Ian zijn herdefinieerd en ondertekend (§6). Een rij is pas aanwezig als:
   - (a) elk deelitem uit de rijnaam een geautomatiseerde test in de repo heeft (vitest of e2e) die in CI op `?kernel=brep&rebuild=worker` draait;
   - (b) **geometrie:** volume en oppervlak gelijk aan de R0-waarde binnen |ΔV| ≤ max(0,01 mm³; 1·10⁻⁵ relatief) voor exacte bodies; een facet-body maakt de rij niet aanwezig;
   - (c) **2D/tekening:** maten binnen 0,01 mm van R0; aantal zichtbare en verborgen lijnen gelijk aan de R0-PDF;
   - (d) **STEP:** round-trip naar SW (R0) geeft gelijk volume binnen 1·10⁻³ mm³ en dezelfde vlaktypes (ellips = `ELLIPSE`, spline = `B_SPLINE_*`, geen polylijnstroken);
   - (e) **UI-rijen:** een **gedragsscript per commando** (functionele pariteit). *Geen pixel-overlay op SW-screenshots* (juridische grens, §7).
2. **Bevindingen:** 0 open van welke ernst ook, en 0 "niet geverifieerd" in `findings.json`.
3. **Naamgevingsrobuustheid:** een propertysuite van ≥ 500 willekeurige bewerkreeksen (feature invoegen vóór een fillet/chamfer, verwijderen, maat of aantal wijzigen). Orakel: herbouw met handmatig gekozen randen, plus R0 voor 30 vaste gevallen. Uitkomst **0 stille afwijkingen**; elke afwijking geeft een waarschuwing.
4. **Eerlijkheid:** elke body met `exact: true` heeft alleen analytische of NURBS-vlakken (STEP-check). "Faceted" is waar voor elke andere body.
5. **Bewijs:** een groene GitHub Actions-run met artefacten waarin `commit` = de tag, op een **echte git-kloon** (geen stand-in); Windows-regressie mesh, release en B-rep op dezelfde commit; self-test met `packaged: true` vanuit de geïnstalleerde exe; `Get-AuthenticodeSignature` = Valid; een desktop-installed-log met de 19 checknamen.
6. **Stabiliteit:** 3 opeenvolgende CI-runs over 2 releases groen zonder rerun; geen rij teruggezakt; elk e2e-script N ≥ 10 keer groen.

### 3. Plafond: wat haalbaar is zonder geld en zonder herdefinitie

| Rij / bevinding | Waarom niet gratis | Beste haalbare |
|---|---|---|
| 42 PDF/DXF/**DWG** | DWG lezen/schrijven vergt de ODA-SDK (betaald) | PDF en DXF wel; rij blijft **deels** |
| 51 IGES/DXF/DWG/**Parasolid** (F114, F199) | Parasolid is van Siemens; geen vrije writer bekend (niet geverifieerd). **IGES kan niet met de meegeleverde OCCT**: `replicad_single.d.ts`/`replicad_multi.d.ts` bevatten 0× `IGESControl_Writer`. IGES vergt een eigen opencascade.js-build met de IGES-module (gratis, ±3–5 d) | IGES via eigen build + 3D-DXF; rij blijft **deels** |
| 60 Code-signing (F49/F117) | Authenticode-certificaat kost geld; gratis alleen via SignPath Foundation als de repo publiek en OSS is | **ontbreekt**, tenzij Ian kiest (§6) |
| 59 Installer | De installer zelf kan volledig worden (P2-13); blijft alleen deels zolang SmartScreen waarschuwt. *Dat is hetzelfde gemis als rij 60*; hier strikt mee geteld | **deels** zonder signing |
| 54 Iconen/lettertype pixelgelijk | 1:1 kopiëren schendt auteurs- en merkrecht (F50, F189) | **Herdefiniëren** (§6), anders deels |
| 37 Toolbox | De Toolbox-inhoud is SW-eigendom | Eigen ISO/DIN-bibliotheek; **herdefiniëren** (§6), anders deels |

**Eerlijk plafond zonder betaalde posten en zonder herdefinitie:** 56 aanwezig, 5 deels (37, 42, 51, 54, 59), 1 ontbreekt (60) = (56 + 2,5)/62 = **94,4 %**. (De eerste versie zei 95,2 %: rij 37 stond daar tegelijk bij "naar aanwezig" en bij "deels", en rij 42 kwam in geen enkele weeklijst voor; F182.) Telt men rij 59 los van de signing (alleen P2-13), dan is het 95,2 %; wij houden de strengere 94,4 %.

**Zonder R0 (SOLIDWORKS-referentie):** 17 rijen zijn alleen met een SW-referentie te meten (3, 6, 7, 10, 15, 16, 17, 18, 19, 20, 33, 37, 41, 47, 52, 54, 56). Zonder R0 blijven die hoogstens deels: 41 aanwezig, 20 deels, 1 ontbreekt = (41 + 10)/62 = **82,3 %**. (Met rij 59 los van signing: 83,1 %.) **Zonder R0 is ±83 % het maximum, hoe goed de code ook is.**

### 4. Fasen met poorten (structuur van Strati §5.6, aangevuld)

Een fase is pas klaar als de poort volledig waar is. Geen enkele rij mag in een latere fase terugzakken.

| Fase | Inhoud | Poort (alles moet waar zijn) | Strati | QA (herzien) |
|---|---|---|---|---|
| **F0 · Waarheid** | §5 P0-1 … P0-10 | **G0:** Actions groen op de release-commit (echte git-kloon); de STRATI-01-tests (F177) groen met juist volume of een expliciete waarschuwing; ellips/spline/wrap `exact:false` of echt exact; strikte pariteit opnieuw geteld volgens §2-1; **0 Kritiek** | 7–10 d | 11–15 d |
| **R0 · Referentie** (parallel) | SW-referentiepakket (zie §5) plus de STRATI-01-modellen en de varianten van rij 11. Eigenaar en licentie vooraf vastgelegd | **GR:** `qa-referentie/` met een JSON per rij en model, door Ian goedgekeurd | 3–5 d + licentie | 3–5 d + licentie |
| **F1 · Geometrie** | §5 P1-1 … P1-10, rij 11 volledig in B-rep, de propertysuite (§2-3) | **G1:** 0× Faceted in de featurelijst van R0; propertysuite 0 stil; STEP-vlaktypes juist; rijen 10, 11, 15, 16, 18, 19, 29, 30, 31, 33 aanwezig volgens §2-1 | 35–42 d | 43–57 d |
| **F2 · Functies** | §5 P2-1 … P2-16, met realistische tijd | **G2:** rijen 3, 6, 7, 17, 20, 27, 41, 44, 47, 52, 53, 56 aanwezig; geen F1-rij teruggezakt | 40–43 d | 47–55 d |
| **F3 · Release en besluiten** | P2-13/14, P3, juridische toets, de besluiten uit §6 | **G3:** de definitie uit §2, volledig | 5–8 d + besluiten | 5–6 d + besluiten |

#### Doorlooptijd (eerlijke bandbreedte)

| Bron | Schatting tot 100 % (§2) |
|---|---|
| Eerste versie van dit plan | 60–80 d (rekenfout: de posten telden op tot 82–89 d; F182) |
| Strati | 90–105 d |
| Risk | 80–110 d |
| MT5D | 110–150 d |
| **QA herzien (som van §5)** | **109–138 d** (F0 11–15 + R0 3–5 + F1 43–57 + F2 47–55 + F3 5–6) |

**Eerlijk: 95–150 werkdagen kernwerk; met 15 % buffer voor onbekenden (gebogen-randtopologie F178, CI-flakiness F195, de onverklaarde hang in F178) 110–175 werkdagen, ≈ 5½–8½ maanden voor één ontwikkelaar.** Daarbij komt de doorlooptijd van de besluiten in §6 (licentie, certificaat). Deze schattingen zijn niet geverifieerd; het enige harde punt is dat de onderkant van de eerste versie (60 d) niet houdbaar is.

### 5. Werkpakketten

#### P0 — Waarheid en release-gate (F0; ≈ 11–15 d)

| # | Wat | Dekt | Acceptatietest (meetbaar) | Code | Inschatting |
|---|---|---|---|---|---|
| P0-1 | **Eerlijk label, interim (eerst, vóór alles):** bodies met ellips, spline of wrap-patch en bodies waarop een fillet een gesplitste/gebogen referentie heeft, krijgen `exact:false` en een waarschuwing tot de echte fix | F175, F177, F178 | Ellips 40×20×10: statusbalk "Faceted", boom niet "Exact surfaces"; T3+sleuf+basis 100: waarschuwing zichtbaar | `occt/brep.ts:68-75`, `rebuild.ts:2848-2849`, StatusBar | 1–2 d |
| P0-2 | **STRATI-01-fix:** gesplitste referentie neemt alle stukken langs dezelfde lijn/kromme mee; waarschuwing zodra `matchEdge` uit meerdere kandidaten kiest | F177, F111 | T3 + basis 80 → 100: 38422,743 ± 1e-3 mm³ (B-rep) / ± 1,5 mm³ (mesh), of een expliciete waarschuwing; varianten A–E uit `tools/qa-src/qaTeam.test.ts` als asserts in `src/qa/` | `src/core/features/edgesets.ts:308-310, :338-355` | 2–3 d |
| P0-3 | **Volume-kruiscontrole per feature, onafhankelijk van `matchEdges`** + bbox, oppervlak, zwaartepunt en face/edge-aantallen | F172, F179, F159, F48 | Per fillet/chamfer: som van gematchte stuklengtes = lengte van het oorspronkelijke vlakkenpaar langs dezelfde lijn. Per feature: \|ΔV\|, \|ΔA\|, Δzwaartepunt, Δbbox en #faces/#edges tegen de andere kernel. **Tessellatie-bewuste drempel:** \|ΔV\| > max(3 × de gemeten tessellatiefout van die feature; 1e-4 relatief) — de oude drempel max(0,5 mm³; 0,1 %) ligt onder het tessellatieverschil op een correct T3 (0,794–0,845 mm³) en geeft valse alarmen (RISK-01). Waarschuwing bij elke feature, niet alleen de laatste; e2e-test | `volumeCheck.ts:8`, `brepRefine.ts:77, :89-90` | 2–3 d |
| P0-4 | **`volumeCheck.test.ts:9` omkeren:** `volumeMismatch(30439.07, 30431.33)` moet een waarschuwing geven | F198 | Test rood op de huidige code, groen na P0-3 | `src/core/features/volumeCheck.test.ts:9` | 0,1 d |
| P0-5 | Eén volledig groene GitHub Actions-run op de release-commit, vanuit een **echte git-kloon** | F176, F54, F31, F147, F98, F180, rij 61/62 | `gh run view <id> --json jobs`: alle jobs `success`; artefacten met `commit` = release-commit; mesh 98/98, release 98/98, brep **14/14** (loftface en pmsweep toegevoegd), 0 skips boven budget; multibody groen (F195) | `ci.yml:89-137`, `e2e/run-regression.mjs:48-52` | 1 d + minutenquotum (gratis: repo publiek, of self-hosted runner) |
| P0-6 | **Windows-job in CI** | F190, F93 | `windows-latest`: mesh, release en packaged self-test op dezelfde commit | `ci.yml` | 1 d |
| P0-7 | QA-tests strakker en in de repo, **met asserts**; randkeuze op positie | F173, F130, F185 | M3, M5 en "nieuwste mate gemarkeerd" in `mateStatus.test.ts`; `qaStrict.test.ts:26` ≤ 2 % van het **verlies**; `:69` ≤ 1,5 mm³; B-rep ≤ 1e-3 mm³; elke diagnosetest heeft `expect`; B-T3 kiest de rand op y = 10, z = −40 | `src/qa/qaStrict.test.ts:19-70`, `qaBrep.test.ts:56-68` | 1 d |
| P0-8 | **Herhaalde runs en mutatietests** | F184, F145 | Elk e2e-script N ≥ 10 keer groen in CI; mutaties (matchEdge kiest altijd het eerste stuk; volumeCheck-drempel × 10) worden door de tests gevangen | `e2e/run-regression.mjs`, vitest | 1–2 d |
| P0-9 | Bewijs op HEAD: Windows-logs, desktop-installed-log, checks/desktop-logs, ongesplitste logs | F93, F149, F126, F148, F97, F151, F180 | `win/*.txt` met de release-commit in de kop; `desktop-installed-<v>.txt` met commit, tijd en 19 checknamen; elke pass één log met eigen DONE-regel | `tools/sign-report.cjs`, `electron/selftest*` | 1 d |
| P0-10 | Release-pass ook buiten de box | F105 | release 98/98 op Windows en in Actions; het overgeslagen sheetexport-stapje groen of bewust uit het budget | `ci.yml:105-115`, `e2e/sheetexport.mjs` | 0,5 d |

#### R0 — SOLIDWORKS-referentiepakket (parallel; ≈ 3–5 d + licentie)

Bouw in SOLIDWORKS de QA-modellen T1–T3, M1–M5, **de STRATI-01-modellen (T3 + sleuf + basis 100; gebogen rand R10 + fillet R2)**, de varianten van rij 11 (variabel, face fillet, full round, setback, chamfer-varianten) en één model per referentierij. Exporteer per model Mass Properties (volume, oppervlak, zwaartepunt op 0,001), STEP, een tekening als PDF en per commando een gedragsbeschrijving. Leg alles vast in `qa-referentie/` met een JSON per rij. **Eigenaar en licentie: besluit van Ian (§6).** De screenshots zijn alleen intern referentiemateriaal, nooit in de repo.

#### P1 — Exacte geometrie (F1; ≈ 43–57 d)

| # | Wat | Dekt | Acceptatietest | Code | Inschatting |
|---|---|---|---|---|---|
| P1-1 | Exacte ellipsen en splines | F175, rij 30/31 | Ellips 40×20×10: V = 6283,185 ± 0,001; STEP bevat `ELLIPSE` en `B_SPLINE_CURVE_WITH_KNOTS`, 0 polylijnstroken | `occt/brep.ts:4, :68-75, :144` | 3 d |
| P1-2 | **Randen van het exacte lichaam uit de B-rep-topologie** (geen 32 segmenten op een boog); tangentketens als één selectie | F178 | Plaat met R10-boog: de boog is 1 rand; fillet R2 erop in B-rep, verlies 12,881 ± 0,001 mm³, geen mesh-terugval; de hang (sleuf + fillet op 32 segmenten) gereproduceerd en weg | `occt/brep.ts` (edges), `edgesets.ts` | 4–6 d |
| P1-3 | **Alle filletsoorten in B-rep + tests per soort**: variabel, multi-radius, face fillet, full round, setback, partial, chamfer-varianten | rij 11, F51 | Per soort een test tegen gesloten vorm of R0 binnen 1e-3 mm³; geen "has no exact (B-rep) version" | `rebuild.ts:858-864` (brepRoundable) | 5–8 d |
| P1-4 | Plastics exact: Indent, Lip/Groove, Snap Hook, Mounting Boss | F51, F121, rij 16/31 | Geen mesh-waarschuwing (`rebuild.ts:3314`); volume tegen R0 binnen 1e-3; 0× Faceted | `features/plastics.ts`, `brepKernel.ts:50` | 8–10 d |
| P1-5 | Wrap/Deform/Flex/Freeform en surfaces exact | F175 (wrap), rij 15/18 | Emboss/deboss: STEP zonder PLANE-strook op de cilinder; volume tegen R0 | `rebuild.ts:2187-2188`, `occt/brep.ts:363` | 6–8 d |
| P1-6 | Loft > 2 profielen en guide curves in B-rep | rij 10 | 3 profielen: volume tegen R0 binnen 0,01 % | `occt/brep.ts` loft | 3 d |
| P1-7 | Topologische naamgeving + **propertysuite** (§2-3) | F47, F177, rij 29 | T4–T7 (sweep, loft, patroon, shell) én ≥ 500 willekeurige reeksen: 0 stil | `src/qa/` (nieuw) | 6–8 d |
| P1-8 | Sheet metal: exacte flange repareren, K-factor, flat pattern | F197, rij 19 | Geen stille mesh-terugval (`rebuild.ts:1600-1604`); flat-patternlengte van 3 bochten = R0 ± 0,01 mm | `features/sheetmetal*.ts` | 4–5 d |
| P1-9 | Mechanische mates met gedragstests; conflictheuristiek | rij 33, F186 | cam/hinge/screw/rack-pinion/linear coupler: positie na 10 mm/30° ± 1e-6; grens "unconverged" getest | `assembly.ts:430-444`, `mateStatus.ts:124-128` | 3–4 d |
| P1-10 | `.kcad`-compatibiliteit en AutoRecover van 0.5.10 | F184, F188 (RISK-05) | Fixtures van 0.5.10 openen identiek (volume, featurelijst); een 0.5.10-autorecoverkopie verschijnt in Document Recovery | `persistence.ts`, `electron/recover.cjs:27-29` | 1–2 d |

#### P2 — Functionele gaten (F2; ≈ 47–55 d)

| # | Wat | Dekt | Acceptatietest | Code | Inschatting |
|---|---|---|---|---|---|
| P2-1 | IGES-export via **eigen opencascade.js-build** (met IGES-module) en 3D-DXF; niet-bestaande formaten uit Options | F114, F171, F199, rij 51 | T1 als IGES, terug ingelezen: volume binnen 1e-3; Options ▸ Export toont alleen bestaande formaten | `occtClient.ts:50`, `prefsSchema.ts:313-314` | 5–7 d |
| P2-2 | Options die echt werken | F112, rij 53 | Elke getoonde optie heeft een effecttest (of is weg) | `prefsWired.ts:5`, `prefsSchema.ts` | 6–8 d |
| P2-3 | Design tables (CSV/XLSX via SheetJS) | rij 44 | 3 configuraties × 4 maten: import en round-trip identiek | `src/core/document/` | 3 d |
| P2-4 | Instant2D, Magnified Selection, 3D-schetsmaten | F124, rij 6/7 | e2e: maat slepen wijzigt waarde; 3D-schets volledig bepaald | `src/core/sketch/`, `Viewport.tsx` | 5 d |
| P2-5 | AlongX/Y/Z | rij 3 | `relations2.test.ts`: AlongZ houdt x, y gelijk na sleep | `equations.ts:307-323` | 1 d |
| P2-6 | Instant3D-handvatten | rij 17 | e2e: 4 featuretypes, ± 0,01 | `store.ts:828-839` | 3 d |
| P2-7 | Undo/redo 200 stappen bewezen | rij 27 | e2e 200× undo/redo | `src/core/document/history.ts:5` | 0,5 d |
| P2-8 | Eigen normdelenbibliotheek (ISO 4762, 4032, 7089) | rij 37 | 30 normdelen; Smart Fasteners kiest M6 bij Ø6,6 | `store.ts:461` | 4 d |
| P2-9 | HLR, centermarks, analyses tegen R0 | F122, rij 41/47 | Lijntellingen = R0-PDF; analyses binnen 1 % | `drawing/autoMarks.ts`, `hlr.ts` | 4 d |
| P2-10 | Performance: budget en worker overal | F137, F46, rij 56 | `rebuildBudgetMs` 45 000 → 5 000 (`rebuild.ts:853`, gebruikt in `store.ts:1234, :1261`); browser standaard in de worker; features-script ≤ 120 s in CI (nu dicht bij 900 s, F195) | `rebuild.ts:853`, `rebuildWorker.ts:25-36` | 4–5 d |
| P2-11 | Frames (weldments) tegen SW | rij 20 | 5 ISO-profielen; cut-list = R0 ± 0,01 mm | `features/weldments.ts` | 2 d |
| P2-12 | UI-gedrag naast SW: CommandManager, taakvenster, heads-up — **functioneel, geen pixelkopie** | rij 52, rij 54, F16, F21, F22 | Per commando een gedragsscript (zelfde stappen, zelfde uitkomst als R0); eigen iconen | `ui/icons.tsx`, `Ribbon.tsx` | 3–4 d |
| P2-13 | Gepackaged self-test en fuses-test in de installer | F151, F196, rij 59 | Self-test vanuit de geïnstalleerde exe (`packaged:true`) in de Windows-CI; fuses gelezen met `@electron/fuses` | `electron/main*`, ci.yml | 1–2 d |
| P2-14 | Code-signing (na besluit §6) | F49, F117, rij 60 | `Get-AuthenticodeSignature` = Valid op setup, portable en exe | electron-builder-config | 1 d + aanvraag |
| P2-15 | Extra views interactief en zonder 1500 ms-readback | F192, F191 | Selecteren/draaien/zoomen in elk pane; geen periodieke readback zonder wijziging | `ViewPane.tsx` | 3 d |
| P2-16 | CI-stabiliteit multibody en features | F195, F183 | multibody groen in 3 runs op rij; features met ≥ 30 % marge op de timeout | `e2e/multibody.mjs`, `ci.yml` | 1–2 d |

#### P3 — Hygiëne (F3; ≈ 5–6 d)

| # | Wat | Dekt | Acceptatietest | Code | Inschatting |
|---|---|---|---|---|---|
| P3-1 | Docs gelijk aan de werkelijkheid | F38, F129 | Script vergelijkt getallen in README/TASKS met vitest-output | `TASKS.md`, `docs/28` | 0,5 d |
| P3-2 | Line-budget-caps | F134 | `rebuild.ts`-cap ≤ 2500 (nu 3398) | `tools/line-budget.cjs:12-21` | 2 d |
| P3-3 | Dev-audit naar 0 | F138 | `npm audit` 0 moderate/high | `package.json` | 0,5 d |
| P3-4 | Bundelruimte | F174 | Release-index ≤ 800 kB | `vite.config.ts`, `bundle-budget.cjs:8` | 1 d |
| P3-5 | Kleine UI-restpunten | F24, F28, F161, F193, F194 | Units/Material leesbaar; één productnaam; overige zoals eerder | `Ribbon.tsx`, `occtClient.ts:50` | 1–2 d |

### 6. Besluiten voor Ian (geen techniek; zonder deze besluiten is 100 % niet te halen)

| # | Besluit | Opties | Gevolg |
|---|---|---|---|
| B1 | **Rij 37 (Toolbox) en rij 54 (iconen/lettertype) herdefiniëren** | (a) rij 37 = "eigen ISO/DIN-normdelenbibliotheek met Smart Fasteners", rij 54 = "eigen, consistente iconenset; gedragsgelijk, niet pixelgelijk"; (b) laten staan | (a) maakt 100 % mogelijk; (b) houdt beide rijen definitief op deels |
| B2 | **DWG (rij 42) en Parasolid (rij 51)** | (a) betalen (ODA-lidmaatschap; Parasolid-licentie bij Siemens); (b) met handtekening buiten scope | (b) = de rijen uit de 62 halen of definitief deels |
| B3 | **Code-signing (rij 60)** | (a) betaald Authenticode-certificaat; (b) repo publiek + OSS + SignPath Foundation; (c) ongesigneerd laten | (c) = rij 60 blijft ontbreekt, rij 59 deels |
| B4 | **SolidWorks-licentie voor R0** | (a) eigen licentie/maker-licentie; (b) iemand met SW die de modellen bouwt; (c) geen R0 | (c) = plafond ±83 % (§3) |
| B5 | **Repo publiek maken?** | Ja geeft gratis CI-minuten en de OSS-signing-route; maar eerst §7 | Nee = self-hosted runner of betaalde minuten |

### 7. Juridische grens (F189, RISK-06, WEBI-07)

- **Vóór de repo publiek gaat:** `docs/26` en `docs/06` (SW-specifieke inhoud, o.a. docs/06:3) uit de repo en uit de git-historie.
- **Functionele, geen visuele pariteit.** Geen pixelkopie van iconen, lettertype of lay-out; geen SW-screenshots in de repo; de R0-screenshots blijven intern.
- Geen SW-merknamen in UI of productnaam (de merkencheck blijft); materiaalnamen niet 1:1 uit de SW-bibliotheek; een eigen EULA.
- Een juridische toets door een mens vóór publicatie. QA is geen jurist.

### 8. Volgorde

1. **Week 1–2: F0.** Eerst P0-1 (eerlijk label), dan P0-2 t/m P0-4, dan CI (P0-5/6) en bewijs. Besluiten B1–B5 aanvragen; R0 starten zodra B4 rond is.
2. **Week 3–13: F1** (geometrie), met de propertysuite vanaf het begin.
3. **Week 14–24: F2** (functies).
4. **Week 25–30: F3** (release, besluiten, juridische toets), P3 doorlopend.

Resultaat zonder betaalde posten en zonder herdefinitie: **94,4 %**. Met B1 (herdefinitie) en B2/B3 (betalen of buiten scope met handtekening): 100 % volgens §2.
