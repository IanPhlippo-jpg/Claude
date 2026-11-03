# Weg naar 100 % — Phlippo CAD na 0.5.11

*Opgesteld 3 november 2026 (Europe/Brussels) bij het QA-rapport 0.5.11. Ieder punt heeft een meetbare acceptatietest, de plek in de code (bestand:regel op HEAD `db0d4b2`) en een inschatting in werkdagen voor één ontwikkelaar met de huidige agent-setup. Statussen en cijfers: `findings.json` en `parity.json` in deze map.*

## Hoe "100 %" hier gemeten wordt

- **Bevindingen:** 0 open (Open, Deels, Nieuw, Niet geverifieerd) in `findings.json`.
- **Pariteit:** alle 62 rijen "aanwezig" in `parity.json`. Op dit moment zijn het **75,0 %**: 35 aanwezig, 23 deels, 4 ontbreekt, 0 kapot.
- **Bewijs:** elk "groen" komt uit een ruw log met een kop die commit en platform noemt, en die commit is de release-commit.

## Eerlijk oordeel: is 100 % haalbaar?

**Nee, niet letterlijk. Ongeveer 95 % strikte pariteit is wel haalbaar, in naar schatting 60–80 werkdagen.** De rest wordt geblokkeerd door licenties, geld of de wet, niet door techniek:

| Rij / bevinding | Waarom 100 % niet kan met gratis middelen | Beste haalbare |
|---|---|---|
| 51 IGES/DXF/DWG/Parasolid (F114) | DWG lezen en schrijven vergt de ODA-SDK (betaald lidmaatschap). Parasolid (x_t) is eigendom van Siemens, en er bestaat geen vrije writer. | IGES via OCCT `IGESControl_Writer` (gratis) plus 3D-DXF. De rij blijft "deels". |
| 60 Code-signing (F49/F117) | Een Authenticode-certificaat kost geld. Gratis kan alleen via SignPath Foundation, en dan moet het project open source zijn. | Gratis alleen als de repo publiek en OSS wordt. Anders blijft de rij "ontbreekt", of je kiest bewust een betaald certificaat. |
| 54 Iconen/lettertype pixelgelijk (F16/F21/F22) | Iconen en lettertype van SOLIDWORKS 1:1 overnemen schendt auteursrecht en merkrecht (zie F50). | Functioneel gelijkwaardige, eigen iconen. Voorstel: deze rij herdefiniëren als "herkenbaar en consistent" en meten met een SW-referentieset. |
| 37 Toolbox | De Toolbox-bibliotheek zelf is SOLIDWORKS-inhoud. | Een eigen ISO/DIN-bibliotheek (schroeven, moeren, ringen) uit open normtabellen. |

**Rijen die alleen met een SOLIDWORKS-referentie te meten zijn** (dezelfde modellen in SOLIDWORKS 2024/2025 gebouwd; screenshots en Mass Properties exporteren): 3, 6, 7, 10, 15, 16, 17, 18, 19, 20, 33, 37, 41, 47, 52, 54, 56. Zonder zo'n referentieset kan QA die rijen hoogstens als "deels" beoordelen, hoe goed de code ook is. **De eerste actie is daarom het referentiepakket (R0 hieronder).**

## Mijlpalen

### P0 — Bewijs en release-gate (eerst; samen ≈ 4–6 dagen)

| # | Wat | Dekt | Acceptatietest (meetbaar) | Code | Inschatting |
|---|---|---|---|---|---|
| P0-1 | Eén volledig groene GitHub Actions-run op de release-commit | F176, F31, F54, F147, F98, rij 61, rij 62 | `gh run view <id> --json jobs`: alle jobs `success`; artefacten `regression-<versie>-*.txt` met `commit` = release-commit; DONE-regels mesh 98/98, release 98/98, brep 12/12, 0 skips boven budget | `.github/workflows/ci.yml:89-136`; `e2e/run-regression.mjs:48-52` | 0,5 d + minutenquotum. Gratis route: repo publiek maken (onbeperkte minuten) of een self-hosted runner op eigen hardware. |
| P0-2 | Volume-kruiscontrole per feature, niet per body | F172, F159, F48 | Unit-test: T3 met een opzettelijk overgeslagen fillet op de mesh moet de waarschuwing "B-rep and mesh disagree" geven. Drempel \|ΔV\| < max(0,5 mm³; 0,1 % van het featurevolume). Een extra rand van 10 mm × R2 (8,58 mm³) moet worden gevangen. | `src/core/features/volumeCheck.ts:8` | 1 d |
| P0-3 | QA-tests strakker en volledig in de repo | F173, F130 | M3 (keten van 4), M5 (gesloten lus) en "de nieuwste mate wordt gemarkeerd" als test in `src/core/assembly/mateStatus.test.ts`; `qaStrict.test.ts:26`: relatieve fout ≤ 2 % van het **verlies** (niet van het bodyvolume); `:69` stadium ≤ 1,5 mm³; B-rep ≤ 1e-3 mm³ | `src/qa/qaStrict.test.ts:19-70` | 0,5 d |
| P0-4 | Bewijs op HEAD: Windows-logs, desktop-installed-log en Linux checks/desktop-logs | F93, F149, F126, F148, F97, F151 | `win/*.txt` hebben in de kop dezelfde commit als de release-tag; `desktop-installed-<v>.txt` noemt commit, tijd en de naam van elk van de 19 checks; `checks`- en `desktop`-joblogs staan als ruw bestand in het artefact | `tools/sign-report.cjs`, `electron/selftest*`, `run-regression.mjs:48` | 1 d |
| P0-5 | Release-pass ook buiten de box bewijzen (F105 is op de QA-box gesloten: release 98/98, B-rep 14/14) | F105-nazorg, F126 | release-pass 98/98 op Windows en in Actions op dezelfde commit; het ene overgeslagen sheetexport-stapje (PDF in de browserviewer) ook groen of bewust uit het budget | `ci.yml:105-115`, `e2e/sheetexport.mjs` | 0,5 d |

### R0 — SOLIDWORKS-referentiepakket (parallel aan P0; ≈ 3 dagen, vergt een SW-licentie of SW-gebruiker)

Bouw in SOLIDWORKS de QA-modellen T1–T3 en M1–M5, plus één model per rij hierboven. Exporteer per model Mass Properties (volume op 0,001 mm³), STEP, een tekening als PDF en screenshots op 1920×1080 met de standaardweergave. Leg alles vast in `qa-referentie/`, met een JSON die per rij de te halen waarde noemt. **Zonder R0 is geen van de 17 referentierijen "aanwezig" te maken.**

### P1 — Exacte geometrie overal (≈ 25–35 dagen)

| # | Wat | Dekt | Acceptatietest | Code | Inschatting |
|---|---|---|---|---|---|
| P1-1 | Exacte ellipsen en splines in B-rep | F175, rij 31 | Ellips 40×20 geëxtrudeerd over 10 mm: V = 6283,185 ± 0,001 mm³; STEP bevat `ELLIPSE` en `B_SPLINE_CURVE_WITH_KNOTS`, geen polylijn | `src/core/occt/brep.ts:4, :68, :144` | 3 d |
| P1-2 | Plastics exact: Indent, Lip/Groove, Snap Hook, Mounting Boss | F51, F121, rij 16, rij 31 | Geen "has no exact (B-rep) version"-waarschuwing (`rebuild.ts:3314`) voor deze 4 features; volume per feature tegen gesloten vorm of R0 binnen 1e-3 mm³; statusbalk 0 × Faceted | `src/core/features/plastics.ts`, `brepKernel.ts:50` | 8–10 d |
| P1-3 | Wrap/Deform/Flex/Freeform en surfaces exact | rij 15, rij 18 | Emboss/deboss en wrap-scribe in B-rep zonder polyhedrale patch; thicken/knit/trim exact; volume tegen R0 | `occt/brep.ts:363` (clipByPlane), `rebuild.ts` wrap-pad | 6–8 d |
| P1-4 | Loft met > 2 profielen en guide curves in B-rep | rij 10 | Loft met 3 profielen: B-rep-volume tegen R0 binnen 0,01 %; geen Faceted | `occt/brep.ts` loft | 3 d |
| P1-5 | Topologische naamgeving over sweep, loft, pattern en shell | F47, rij 29 | Nieuwe QA-tests T4 (fillet op sweep-rand na padwijziging), T5 (loft-rand), T6 (rand in een lineair patroon na een aantalwijziging), T7 (fillet vóór shell): elk volume = gesloten vorm of R0 | `src/qa/qaStrict.test.ts`, `qaBrep.test.ts` (nieuw) | 4–5 d |
| P1-6 | Sheet metal tegen SW: K-factor, bend allowance, flat pattern | rij 19 | Flat-patternlengte van 3 standaardbochten = R0 binnen 0,01 mm | `src/core/features/sheetmetal*.ts` | 3 d |
| P1-7 | Mechanische mates met gedragstests | rij 33 | cam/hinge/screw/rack-pinion/linear coupler: elk met een unit-test die positie na een aandrijving van 10 mm / 30° controleert (±1e-6) | `src/core/assembly/assembly.ts:430-444`, `types.ts` | 3 d |

### P2 — Functionele gaten dichten (≈ 25–30 dagen)

| # | Wat | Dekt | Acceptatietest | Code | Inschatting |
|---|---|---|---|---|---|
| P2-1 | IGES-export (gratis via OCCT) en 3D-DXF; formaten zonder exporter uit Options | F114, F171, rij 51, rij 42 | Exporteer T1 als IGES, lees in met OCCT: volume gelijk binnen 1e-3; Options ▸ Export toont alleen formaten die bestaan | `src/core/occt/occtClient.ts:50` (naast importStep), `src/app/prefsSchema.ts:313-314` | 3 d |
| P2-2 | Options die echt werken | F112, rij 53 | `WIRED_PREFS` ≥ 190/379 (≥ 50 %, nu 45), of de niet-werkende opties uit het schema verwijderen, zodat 100 % van de getoonde opties werkt; `prefsWired.test.ts` per sleutel een effecttest | `src/app/prefsWired.ts:5`, `prefsSchema.ts` | 6–8 d |
| P2-3 | Design tables (CSV/XLSX, gratis via SheetJS) | rij 44 | Tabel met 3 configuraties × 4 maten importeren: 3 configuraties met juiste maten; export rond-trip identiek | `src/core/document/` (nieuw), ConfigurationManager | 3 d |
| P2-4 | Instant2D, Magnified Selection, 3D-schetsmaten | F124, rij 6, rij 7 | e2e: maat in schets slepen wijzigt waarde; 3D-schets met 2 maten en 1 relatie volledig bepaald (zwart) | `src/core/sketch/`, `Viewport.tsx` | 5 d |
| P2-5 | AlongX/Y/Z-relaties | rij 3 | `relations2.test.ts`: AlongZ op een 3D-lijn houdt x en y gelijk na een sleep | `src/core/sketch/equations.ts:307-323` | 1 d |
| P2-6 | Instant3D: sleephandvatten voor revolve-hoek, fillet-straal en schetsmaten | rij 17 | e2e: handvat slepen wijzigt de waarde met ±0,01 nauwkeurigheid voor 4 featuretypes | `src/app/store.ts:828-839` | 3 d |
| P2-7 | Undo/redo 200 stappen bewezen | rij 27 | e2e: 200 bewerkingen, 200 × undo → oorspronkelijk volume; 200 × redo → eindvolume | `src/app/history.ts:5` | 0,5 d |
| P2-8 | Toolbox-achtige bibliotheek (ISO 4762, 4032, 7089) | rij 37 | 30 normdelen invoegbaar; Smart Fasteners kiest de juiste M-maat bij een Ø6,6-gat | `store.ts:461` | 4 d |
| P2-9 | HLR, centermarks en analyses tegen R0 | F122, rij 41, rij 47 | Tekening van T1 en R0-PDF: aantal zichtbare/verborgen lijnen gelijk; centermarks op elk gat; draft/undercut/thickness numeriek gelijk aan R0 binnen 1 % | `src/core/drawing/autoMarks.ts`, `hlr.ts` | 4 d |
| P2-10 | Performance: budget en worker overal | F137, F46, rij 56 | `rebuildBudgetMs` 45 000 → 5 000 (`store.ts:1234, :1261`); browser-build standaard in de worker; features-script ≤ 120 s op Linux-CI | `src/app/store.ts:1234`, `rebuildWorker.ts:25-36` | 4 d |
| P2-11 | Frames (weldments): profielbibliotheek, end caps, gussets tegen SW | rij 20 | 5 profielen ISO; cut-list-lengtes = R0 binnen 0,01 mm | `src/core/features/weldments.ts` | 2 d |
| P2-12 | UI-gedrag naast SW: CommandManager, taakvenster, heads-up | rij 52, rij 54, F16, F21, F22 | Per R0-screenshot een overlay-diff: lay-out en positie van groepen binnen 4 px; eigen iconen (geen kopie) | `src/ui/icons.tsx`, `Ribbon.tsx` | 3 d (na R0) |
| P2-13 | Gepackaged self-test in de installer | F151, rij 59 | Self-test draait vanuit de geïnstalleerde exe (`packaged:true`) in CI op Windows | `electron/main*`, ci.yml desktop-job | 1 d |
| P2-14 | Code-signing (alleen als het gratis kan via SignPath OSS, anders bewuste keuze) | F49, F117, rij 60 | `Get-AuthenticodeSignature` = Valid op setup, portable en exe | electron-builder-config | 1 d + aanvraag |

### P3 — Hygiëne (≈ 2–3 dagen)

| # | Wat | Dekt | Acceptatietest | Code | Inschatting |
|---|---|---|---|---|---|
| P3-1 | Docs gelijk aan de werkelijkheid | F38, F129 | TASKS noemt "qaBrep.test.ts (13)"; docs/28 F142 zegt "uit de index"; een script vergelijkt de getallen in README/TASKS met vitest-output | `TASKS.md`, `docs/28-qa-0.5.10.md` | 0,5 d |
| P3-2 | Line-budget-caps op doelwaarden | F134 | rebuild.ts-cap ≤ 2500 (nu 3398) na splitsen volgens het splitsplan in docs/28 | `tools/line-budget.cjs:12-21` | 2 d |
| P3-3 | Dev-audit naar 0 | F138 | `npm audit` 0 moderate/high (nu 15 moderate) | `package.json` (electron-builder-update) | 0,5 d |
| P3-4 | Bundelruimte | F174 | Release-index ≤ 800 kB door code-splitting (tekening, assembly) | `vite.config.ts`, `tools/bundle-budget.cjs:8` | 1 d |
| P3-5 | Kleine UI-restpunten | F24, F28, F161 | Modify zonder extra rij; Insert Component opent het native dialoog; STEP-import toont "exact" zonder naad (screenshot-diff) | `Ribbon.tsx`, `occtClient.ts:50` | 1 d |

## Volgorde en totaal

1. **Week 1:** P0-1 t/m P0-5 en R0 aanvragen. Na deze week is elk "groen" bewezen op de release-commit.
2. **Week 2–7:** P1 (geometrie). Hiermee gaan de rijen 10, 15, 16, 18, 19, 29, 31 en 33 naar "aanwezig".
3. **Week 8–13:** P2 (functies). Hiermee gaan 3, 6, 7, 17, 20, 27, 37, 41, 44, 47, 52, 53 en 56 naar "aanwezig".
4. **Doorlopend:** P3.

Totaal ≈ **60–80 werkdagen**. Verwacht resultaat: **±95 % strikte pariteit**: 57 van de 62 rijen "aanwezig", 4 "deels" (37 Toolbox-inhoud, 51 DWG/Parasolid, 54 pixelgelijk, 59 installer ongesigneerd) en 1 "ontbreekt" (60 signing zonder OSS of certificaat). (57 + 4·0,5) / 62 = 95,2 %. Dat is het realistische plafond met gratis middelen en zonder SOLIDWORKS-eigendom te kopiëren.
