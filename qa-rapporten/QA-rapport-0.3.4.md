# Phlippo CAD — QA-rapport v0.3.4

Hertest door Grok Bot op 25-10-2026, ca. 22:00–23:30 (Brussel, UTC+1), op een kopie van de laptop-werkmap (Linux, headless Chromium via Playwright, `vite preview` op :4173). De lat: ziet het eruit en werkt het 100% als SOLIDWORKS 2026? Dit document is zelfstandig leesbaar en bedoeld voor de ontwikkelagent (Claude Code) op de laptop van Ian. Volgorde: prioriteit, dan ernst.

## 0. Versie en commit (eerst lezen)

- Branch `claude/fase1-schetser`, **HEAD `4d52596`** (25-10-2026 20:23 Brussel) heeft in `package.json` nog **versie 0.3.3**. Er zijn **geen tags**.
- **0.3.4 bestaat alleen als niet-gecommitte wijzigingen** in 73 bestanden (+5.432/−5.296), werkmap gelezen om ca. 22:24 (store.ts mtime 21:56). Dat zijn o.a.: `package.json` (0.3.4), `package-lock.json`, `src/app/store.ts`, `src/core/document/persistence.ts`, `src/core/features/pattern.ts`, `src/core/features/rebuild.ts` (+ `rebuildBudget.test.ts`), `src/core/features/solid.ts`, `src/core/assembly/assembly.ts`, `src/ui/components.tsx`, `src/core/document/examples.check.test.ts`, `.github/workflows/ci.yml`, `README.md`, `TASKS.md`, `docs/06-merken-en-auteursrecht.md`, `docs/11-qa-rapport-v0.3.3.md`, `tools/rename-trademarks.cjs`, `tsconfig.app.json`, alle `voorbeelden/deurkruk/*.kcad` en ±50 `e2e/*.mjs`.
- Getest is precies die werkmap (`4d52596` + de niet-gecommitte wijzigingen). Zie F82: committen en `v0.3.4` taggen vóór er een installer gebouwd wordt.

## 1. Oordeel

**Score 6/10 (was 5/10). NO-GO voor release; eigen gebruik door Ian kan, onder vier voorwaarden (zie Teamoordeel).**

**Teamoordeel: 4 van 5 reviewers binnen (Strati, Webi, Riki, Risk), unaniem 6/10 en NO-GO voor release. MT5 Developer volgt later.** Ernst na de teamreview: de strengste voorgestelde ernst geldt.

0.3.4 is een echte herstelronde: de kritieke regressie zonder testhooks (F53) is weg, assembly-cut laat het model staan (F60), de Viewer-XSS is dicht (F62), beschadigde assemblies en tekeningen worden netjes geweigerd (F55), de GPU-lekcheck blijft groen, vitest 337/337, `npm audit` 0, regressie 78/79. Maar: de CI is op Linux nog steeds rood door `drawing` (F10/F54), Edit Component + Ctrl+N gooit zonder vraag werk weg (F74, door docs/11 ten onrechte "opgelost" genoemd), half-geldige bestanden openen met onzichtbare rebuild-fouten (F78, F80), en zichtbare SOLIDWORKS-namen (Hole Wizard, Toolbox, Design Library, "Lifecycle and Collaboration") staan er nog (F50). Qua uiterlijk is er sinds 0.3.3 vrijwel niets veranderd (pixelverschil 0,02–0,27%).

- Bevindingen totaal: **92** (F01–F92). Ernst: 14 kritiek, 40 major, 38 minor.
- Status F01–F76: 48 opgelost, 19 deels, 9 open, 0 erger.
- Nieuw in 0.3.4: 16. Uit de QA-ronde 7 (F77–F83): 1 kritiek, 2 major, 4 minor; uit de teamreview 9 (F84–F92): 4 major, 5 minor.
- Nog niet opgelost (incl. nieuw): 44 — 9 kritiek, 19 major, 16 minor.
- GO-voorwaarden (lijst van Risk): **5 gehaald, 4 deels, 1 niet** (was 3/5/2), door Risk bevestigd.

## 2. GO-voorwaarden

| # | Voorwaarde | Status | Toelichting |
|---|---|---|---|
| 1 | Opslaan alleen naar paden van het main-proces | Gehaald | Ondoorzichtige handles (F68), main.cjs |
| 2 | Schemavalidatie bij openen | Deels | Structuur, bereik, mates, sheets, __proto__, diepte: goed. Verwijzingen (punt-id's), onbekende feature-types, depth 1e11/negatief: niet (F80) |
| 3 | Atomische saves | Gehaald | tmp + fh.sync() (main.cjs:92) + rename, tmp opgeruimd bij fout |
| 4 | .bak | Gehaald | .bak + .bak2 (main.cjs:104-106), mislukte backup als waarschuwing. Alleen in code gecontroleerd |
| 5 | Vraag bij niet-opgeslagen wijzigingen (Open/New/Close) | Deels | Toolbox Open vraagt nu (TaskPane.tsx:113); tijdens Edit Component vraagt Ctrl+N/Ctrl+O niets (F74, runtime bevestigd). Risk: de vraag bij Make Multibody Part (AssemblyTab.tsx:28) is alleen ja/nee, zonder Save |
| 6 | Invoerlimieten | Deels | 1e300/1e7 geweigerd (MAX_FIELD_VALUE 1e6), maar zonder melding; -5/0 stil naar 0,01; bestand mag 1e12 (F80, F81) |
| 7 | Aantal-limieten | Gehaald | Patroon max 250 (pattern.ts:52,59), 300 → 250 in 1,45 s. Kanttekening: stil afgekapt (F81), CSG nog synchroon (F46) |
| 8 | CSP blokkeert remote/file-afbeeldingen | Gehaald | Ongewijzigd |
| 9 | e2e faalt bij falende checks + CI groen | Niet | drawing 22/24 op Linux → CI rood (F10/F54); smoke.mjs en relations.mjs geven nooit exit 1 (F57); 0.3.4 niet gecommit (F82); de regressie maakt de voorbeeld-.kcad's vuil, dus een git-diff-gate faalt altijd (F84) |
| 10 | FeatureManager weg + disclaimer | Deels | FeatureManager, PropertyManager, DimXpert, SimulationXpress weg uit de zichtbare UI, disclaimer overal (F72). Nog zichtbaar: Hole Wizard, Toolbox, Design Library, Weldments, MBD Dimensions, tab "Lifecycle and Collaboration" (F50) |

Om GO te halen: #2 (F80), #5 (F74), #6 (F81), #9 (F10/F54/F57/F82/F84) en #10 (F50) afronden. Risk bevestigt de telling 5/4/1: #4 en #7 nu gehaald, #10 van niet naar deels, #9 nog niet.

**Noot bij GO (Strati, Riki):** de packaged Electron-app en de installer zijn nooit getest, terwijl F53 precies daar ontstond. Een smoke-test van de packaged app en de installer op Windows, met hooks uit, hoort bij GO en niet "buiten de 10". Verder buiten de 10: code signing (F49).

## 3. Top 5 (in deze volgorde)

1. **F74 + F41 — opslagvraag tijdens Edit Component.** `withUnsavedCheck` (MenuBar.tsx:59-61) moet ook `editContext` (en de dirty-status van de parent-assembly) meenemen; `openDocument` (store.ts:4779/4792) mag `dirty:false`/`editContext:null` pas zetten na bevestiging. Voeg een qa3-check toe: assembly wijzigen → Edit Component → Ctrl+N ⇒ dialoog "Save changes?".
2. **F10/F54/F57/F82 — CI echt groen en reproduceerbaar.** drawing.mjs op Linux groen maken (Ø35-plaatsing en herstel na reload), één gedeelde e2e-helper zodat ook smoke, relations, keys, deletekey en deletekey2 rood kunnen worden, doorhandle.mjs naar /tmp (F84), alles committen en `v0.3.4` taggen; installer alleen van een schone tree.
3. **F78 + F80 — half-geldige bestanden.** Validator controleert verwijzingen en feature-types en hanteert dezelfde grenzen als de UI; rebuild-fouten zichtbaar in de boom (CSS-fix components.css:103/112) plus What's Wrong-melding na openen; Ctrl+S op zo'n bestand eerst bevestigen (F40).
4. **F50 + F77 — resterende merknamen en kapotte hernoemteksten.** Hole Wizard, Toolbox, Design Library, "Lifecycle and Collaboration" neutraal maken; "Feature Tree Tree Area", "a Auto Tolerancing" herstellen; commentaar "as the 2026 original" e.d. weg; qa3-regex uitbreiden.
5. **F81/F56/F46 — eerlijke feedback.** Melding bij afkappen/weigeren van invoer; Quick Beam Estimate zonder groene veiligheidsfactor; CSG naar een worker met voortgang/annuleren.

## 4. Testresultaten

| Stap | Resultaat | Status |
|---|---|---|
| npm ci | OK | Groen |
| tsc --noEmit | 0 fouten | Groen |
| vite build | index 2.159,20 kB (gzip 587,35); chunkwaarschuwing blijft (was 2.142,85) | Waarschuwing |
| vitest | 337/337 in 95 bestanden, 0 BVH-meldingen (was 432) | Groen |
| npm audit | 0 kwetsbaarheden | Groen |
| Volledige regressie (79 scripts, `node e2e/run-regression.mjs`) | 78/79 groen; drawing 22/24 (Ø35 placed, drawing restored after reload); filletopts 291 s (timeout 400 s) | Rood |
| Desktop-simulatie zonder hooks (zz34-desktop) | window.__phlippo* undefined; Zoom to Fit (F en menu) en Final Render werken | Groen |
| Beschadigde bestanden via echte Ctrl+O (zz34-damaged2) | Assembly/drawing/mate/bereik/__proto__/diepte/geen JSON geweigerd met melding; badEntity, unknownFeature, depth 1e11, depth −5, missingSketch geaccepteerd (F80) | Waarschuwing |
| UI-checks (zz34-ui) | F74 rood; F14 bijna (Linear Pattern); F63, F62, F72, F75, F27 groen; invoer F71 groen met stille clamps (F81) | Waarschuwing |
| Lektest (zz-leak34) | 11/4/3/4 constant over 75 bewerkingen + 10 new/open | Groen |
| Visueel (zz-shots34 + compare) | 0,02–0,27% pixelverschil met 0.3.3 (3,4% welkomstscherm door juridische tekst); assembly-script laadt 1 component; "FAIL mod2" in shots-script | Waarschuwing |

## 5. Alle bevindingen (op prioriteit)

Prioriteit: **P1** = GO-blokker, **P2** = vóór publieke release, **P3** = look/kwaliteit, **P4** = opgelost (alleen ter controle). Status: Opgelost / Deels opgelost / Open / Nieuw.

### P1 — GO-blokkers (13)

#### F05 · Kritiek · Deels opgelost · Bestanden — Geen schemavalidatie bij openen
- Status 0.3.3: Deels opgelost
- Bewijs / file:line: Structuur, bereik, mates, sheets, __proto__ en diepte worden geweigerd; verwijzingen niet (zie F80)
- Repro: Open d34b-badEntity / unknownFeature via Ctrl+O
- Fix: Zie F80: referentiële integriteit valideren.

#### F31 · Kritiek · Deels opgelost · Proces — e2e-exitcodes / CI / niet-gecommit werk
- Status 0.3.3: Deels opgelost
- Bewijs / file:line: CI draait volledige regressie, maar: drawing rood op Linux (F10); smoke.mjs en relations.mjs falen nooit (geen process.exit); 0.3.4 niet gecommit (F82)
- Repro: grep -L "process.exit" e2e/smoke.mjs e2e/relations.mjs
- Fix: smoke/relations exit 1 laten geven bij page error of FAIL; 0.3.4 committen + taggen; CI groen maken.

#### F41 · Kritiek · Deels opgelost · Bestanden — Geen opslagvraag / autosave
- Status 0.3.3: Deels opgelost
- Bewijs / file:line: Toolbox ▸ Open vraagt nu (TaskPane.tsx:113); maar tijdens Edit Component vraagt Ctrl+N/Ctrl+O niets (F74)
- Repro: Zie F74
- Fix: Zie F74.

#### F50 · Kritiek · Deels opgelost · Juridisch — SW-handelsmerken
- Status 0.3.3: Erger
- Bewijs / file:line: Zichtbaar UI: FeatureManager/PropertyManager/DimXpert/SimulationXpress weg; nog zichtbaar: Hole Wizard, Weldments, MBD Dimensions, Design Library, Toolbox, tab 'Lifecycle and Collaboration' (Ribbon.tsx:37). In broncode nog PropertyManager 121x, DimXpert 136x; commentaar documenteert kopiëren ('as the 2026 original': AssemblyTab.tsx:43; components.css:139, richTips.tsx:4, icons3d.tsx:6, app.css:535). Dialoog-id 'simxpress' (store.ts:139); qa3-regex sluit Toolbox/Hole Wizard uit
- Repro: Ribbon doorklikken; rg -c "PropertyManager|DimXpert" src
- Fix: Resterende namen neutraal maken (Hole Wizard→Hole Tool, Toolbox→Standard Parts, Design Library→Part Library, Lifecycle and Collaboration→Share); identifiers en commentaar opschonen; qa3-regex uitbreiden.

#### F74 · Kritiek · Open · Assembly — Edit Component-context blijft staan na Open/New
- Status 0.3.3: Nieuw in 0.3.3
- Ernst: verhoogd door de teamreview (was Major)
- Bewijs / file:line: Runtime bevestigd (u34-f74-ctrlN-during-edit): gewijzigde assembly → Edit Component → Ctrl+N opent New-dialoog zonder opslagvraag. withUnsavedCheck (MenuBar.tsx:59-61) kijkt alleen naar st.dirty (false tijdens edit); openDocument (store.ts:4779/4792) zet editContext:null en dirty:false; editComponent store.ts:1540-1555
- Repro: Assembly openen → component verplaatsen → rechtsklik Edit Component → Ctrl+N
- Fix: withUnsavedCheck: dirty || editContext?.parentDirty || editContext !== null; bij editContext eerst 'Return to assembly and save?' vragen. Test in qa3 toevoegen.

#### F82 · Kritiek · Nieuw · Proces — 0.3.4 niet gecommit; HEAD heeft nog versie 0.3.3
- Status 0.3.3: —
- Ernst: verhoogd door de teamreview (was Major)
- Bewijs / file:line: Laptop: branch claude/fase1-schetser, HEAD 4d52596 (25-10 20:23 +0100) met package.json 0.3.3, geen tags. 0.3.4 bestaat alleen als niet-gecommitte wijzigingen in 73 bestanden (+5.432/−5.296): package.json, store.ts, persistence.ts, pattern.ts, rebuild.ts, components.tsx, solid.ts, assembly.ts, ci.yml, docs/11, tools/rename-trademarks.cjs, voorbeelden/*.kcad, e2e/* Teamnoot (Risk): één git checkout . of schijfdefect en het is weg; oplossen kost een minuut.
- Repro: git status; git describe --tags
- Fix: Alles committen, 'v0.3.4' taggen, installer alleen van een schone, getagde tree bouwen (check in build-script: git diff --quiet || exit 1).

#### F10 · Major · Open · Tekening — Ø-maat en tekening herstellen na reload
- Status 0.3.3: Open
- Bewijs / file:line: logs/regression.log: drawing 22/24 op Linux: 'FAIL diameter Ø35 placed', 'FAIL drawing restored after reload {"k":"drawing","v":3}' (3e ronde op rij) Riki: één oorzaak; drawing.mjs:191 (herstel na reload) is een vervolgfout van :161 (Ø35), de info-string logt dims niet.
- Repro: npm run build && npx vite preview --port 4173; node e2e/drawing.mjs (Linux, Chromium headless)
- Fix: Oorzaak op Linux reproduceren in de CI (artifact met screenshot); Ø-plaatsing niet laten afhangen van venster-/fontmetriek; reload-check laten wachten op de herstelde tekening i.p.v. vaste timeout.

#### F54 · Major · Deels opgelost · Proces — CI rood op Linux; 'regressie groen' niet reproduceerbaar
- Status 0.3.3: Nieuw in 0.3.3
- Ernst: verhoogd door de teamreview (was Minor)
- Bewijs / file:line: CI draait volledige regressie, maar drawing faalt op Linux → CI zou rood zijn
- Repro: run-regression op Linux
- Fix: Zie F10.

#### F57 · Major · Deels opgelost · Tests — Testscripts verouderd en lek
- Status 0.3.3: Nieuw in 0.3.3
- Bewijs / file:line: Een page error maakt 74/79 regressiescripts rood (72 met !pageErrors.length + assembly en drawing). Niet rood: smoke.mjs en relations.mjs (geen exit-afhandeling), keys.mjs:65 (zonder errs), deletekey.mjs en deletekey2.mjs (alleen exit 1 bij bevroren pagina); deletekey2.mjs heeft 5 check()-aanroepen die de run nooit rood maken. 72 scripts kopiëren dezelfde exit-regel (qa1.mjs:187-189): telt page errors, geen console-errors (alleen assembly en drawing tellen die). Ingeslikte catches 74 → 89 (50 in de regressie); ci.yml-commentaar 'every script exits 1' klopt niet. Geen gedeelde helper (geen e2e/lib).
- Repro: rg -c 'pageErrors.length' e2e/*.mjs; lees keys.mjs:65 en deletekey2.mjs; rg -c '\.catch\(\(\) => (\{\}|undefined|null|false|0|\'\')\)' e2e
- Fix: Gedeelde helper (e2e/lib/check.mjs): elke gefaalde check en elke page error geeft exit 1, console-errors via een allowlist; smoke, relations, keys, deletekey en deletekey2 erop overzetten; lege catches in de regressie vervangen; ci.yml-commentaar corrigeren.

#### F70 · Major · Deels opgelost · Bestanden — Schemavalidatie oppervlakkig
- Status 0.3.3: Nieuw in 0.3.3
- Bewijs / file:line: Zie F05/F80: structuur goed, verwijzingen en onbekende types niet
- Repro: d34b-*
- Fix: Zie F80.

#### F78 · Major · Nieuw · UI — Rebuild-fouten onzichtbaar: '!'-markering buiten beeld, geen What's Wrong
- Status 0.3.3: —
- Bewijs / file:line: Markering span.status.conflict staat op x≈326 px, boomvenster ±236 px breed (d34b-unknownFeature-full). components.css:103 white-space:nowrap + components.css:112 .status{margin-left:auto}: rijen groeien mee met de lange rootnaam. Statusbalk zegt 'Ready', geen What's Wrong-dialoog bij openen
- Repro: Open d34b-badEntity of missingSketch via Ctrl+O; kijk in de feature tree
- Fix: Rij: display:flex; min-width:0; label overflow:hidden; text-overflow:ellipsis; status-icoon flex:none rechts binnen de pane-breedte. Na openen/rebuild met fouten: What's Wrong-dialoog of opvallende statusmelding.

#### F80 · Major · Nieuw · Bestanden — Validatie mist verwijzingen en onbekende feature-types
- Status 0.3.3: —
- Bewijs / file:line: badEntity: lijn met onbestaand punt → Revolve1 niet gebouwd, body verdwijnt stil, tooltip toont rauwe JS-fout "Cannot read properties of undefined (reading 'y')". unknownFeature: type 'bogusFeature' geladen als feature 'X' met foute melding 'The sketch of this feature no longer exists'. depth 1e11 stil geaccepteerd (MAX_FILE_NUMBER 1e12, persistence.ts:33 vs veld 1e6); negatieve depth stil geaccepteerd (d34b-*)
- Repro: Pas een .kcad aan (p1 → onbestaande id, type → bogusFeature, depth 1e11 / -5) en open via Ctrl+O
- Fix: In persistence.ts: elke entity-puntverwijzing, feature→sketch, mate→component controleren; feature.type tegen een whitelist; per veld dezelfde grenzen als de UI (≤1e6, >0 waar nodig). Weigeren met duidelijke melding, of openen met expliciete reparatiedialoog.

#### F84 · Major · Nieuw · Tests — Regressie overschrijft de voorbeeld-.kcad's in git
- Status 0.3.3: —
- Bron: teamreview (Riki N1)
- Bewijs / file:line: doorhandle.mjs (script 18) schrijft voorbeelden/deurkruk/*.kcad opnieuw met random id's (doorhandle.mjs:8, :234, :256, :356). Na elke run: 8 .kcad's vuil (+4.916/−4.916), dus een git-diff-gate (F82) faalt altijd; editcomponent, misc7, sectionopts en assembly2 testen daarna de nieuw gegenereerde bestanden i.p.v. de gecommitte. Ook al zo in 0.3.3.
- Repro: node e2e/run-regression.mjs; git status voorbeelden/
- Fix: doorhandle.mjs naar /tmp (of os.tmpdir()) laten schrijven of deterministisch genereren; in CI na de tests git diff --exit-code.


### P2 — vóór publieke release (14)

#### F40 · Kritiek · Deels opgelost · Bestanden — Half-geldige .kcad; Ctrl+S overschrijft
- Status 0.3.3: Deels opgelost
- Bewijs / file:line: fsync (main.cjs:92), .bak/.bak2 (main.cjs:104-106); maar half-geldige bestanden openen nog (F80), dus Ctrl+S kan een verminkt model wegschrijven
- Repro: Open badEntity-bestand → Revolve1 weg → Ctrl+S
- Fix: Bestand met rebuild-fouten bij openen markeren en Ctrl+S eerst laten bevestigen (of Save As afdwingen).

#### F51 · Kritiek · Open · Geometrie — Mesh-kernel
- Status 0.3.3: Open
- Bewijs / file:line: Mesh-kernel blijft
- Repro: —
- Fix: Strategisch: OpenCascade (occt-import-js / opencascade.js, LGPL) of replicad als B-rep-kernel evalueren. Teamnoot (Strati): er is nog geen B-rep-beslissing en geen tijdslot; plan de OpenCascade-spike direct na GO, vóór nieuwe functies.

#### F56 · Kritiek · Deels opgelost · Juridisch — SimulationXpress geeft spanning en veiligheidsfactor uit een schatting
- Status 0.3.3: Nieuw in 0.3.3
- Bewijs / file:line: Hernoemd tot Quick Beam Estimate, label 'Indicative estimate', maar toont nog 'Factor of safety (min)' groen gekleurd (evaluateDialogs2.tsx:372) en von Mises-spanning Teamnoot (Risk): evaluateDialogs2.tsx:310 fosColor #1f7a37 bij FOS ≥ 1 en :380 groene resultaatbalk (#e6f4ea) zodra FOS ≥ 1; kleur communiceert sterker dan de tekst.
- Repro: Evaluate → Quick Beam Estimate → Run
- Fix: Geen groene veiligheidskleur; FOS weglaten of als 'indicatieve verhouding' in grijs met de waarschuwing direct ernaast.

#### F14 · Major · Deels opgelost · Visueel — Commando's actief zonder body
- Status 0.3.3: Open
- Bewijs / file:line: Leeg part: Extruded Cut, Hole Wizard, Fillet, Shell, Mirror, Draft, Rib grijs; Linear Pattern nog actief (shot u34-f14-empty-part-features)
- Repro: New Part → tab Features → Linear Pattern is klikbaar
- Fix: Linear Pattern (en Circular/Curve Driven) disabled={noBody} geven in de Features-ribbon. Teamnoot (Riki): de kind-oorzaak is opgelost (Ribbon.tsx:273); rest is Linear Pattern Ribbon.tsx:306, fix van één regel: disabled={noBody || inSk}.

#### F36 · Major · Open · Kwaliteit — Monolithische store
- Status 0.3.3: Erger
- Bewijs / file:line: src/app/store.ts 5.322 regels; PropertyManager.tsx 3.834
- Repro: wc -l
- Fix: Store opsplitsen in slices (document, sketch, assembly, drawing, ui) met zustand slices; PropertyManager per feature-type.

#### F38 · Major · Deels opgelost · Docs — README/TASKS
- Status 0.3.3: Deels opgelost
- Ernst: verhoogd door de teamreview (was Minor)
- Bewijs / file:line: README '79 scripts' klopt; docs/11 claimt F31, F57, F74, F50 opgelost terwijl dat niet (volledig) zo is Teamnoot (Strati): onjuiste statusclaims ondermijnen elke volgende ronde; daarom Major.
- Repro: docs/11-qa-rapport-v0.3.3.md
- Fix: Statussen in docs/11 corrigeren volgens dit rapport.

#### F46 · Major · Deels opgelost · Performance — CSG/solver op de UI-thread
- Status 0.3.3: Open
- Bewijs / file:line: rebuildBudgetMs 45_000 (rebuild.ts:756); CSG nog synchroon op de UI-thread; filletopts 291 s
- Repro: Zwaar model met veel fillets
- Fix: CSG in een Web Worker (transferable buffers), UI-thread alleen voor resultaat; budget naar ~5 s met voortgang + annuleren.

#### F47 · Major · Open · Geometrie — Topologische naamgeving
- Status 0.3.3: Deels opgelost
- Bewijs / file:line: Geen topologische naamgeving (mesh)
- Repro: Edge-fillet na wijziging eerdere feature
- Fix: Hangt aan F51; tussentijds: edge-referenties op geometrische signatuur + waarschuwing bij verlies.

#### F48 · Major · Deels opgelost · Geometrie — CSG-resultaat ongecontroleerd / toleranties
- Status 0.3.3: Deels opgelost
- Bewijs / file:line: Boss/cut atomair; geen manifold-check
- Repro: Code solid.ts
- Fix: Na elke boolean manifold/volume-check; bij falen feature markeren i.p.v. stil resultaat.

#### F49 · Major · Deels opgelost · Electron — Release-hardening
- Status 0.3.3: Deels opgelost
- Bewijs / file:line: Geen code signing; fuses/devtools wel
- Repro: Installer
- Fix: Code-signing-certificaat (bv. Azure Trusted Signing) of SmartScreen-waarschuwing documenteren.

#### F85 · Major · Nieuw · Electron — Packaged app accepteert --remote-debugging-port
- Status 0.3.3: —
- Bron: teamreview (Riki N3)
- Bewijs / file:line: desktop-installed.mjs:13-18 start de geïnstalleerde exe met --remote-debugging-port=9333 en bestuurt hem via CDP; de fuse enableNodeCliInspectArguments:false blokkeert die Chromium-switch niet en main.cjs filtert hem niet. Elk lokaal proces of elke snelkoppeling kan zo de renderer en de save-bridge besturen. Afgeleid uit code, niet in een binary getest.
- Repro: Phlippo CAD.exe --remote-debugging-port=9333; open http://127.0.0.1:9333/json
- Fix: In main.cjs bij PACKAGED afsluiten als process.argv --remote-debugging-port/--inspect bevat (vóór app.ready), of documenteren; test in desktop-installed.mjs omdraaien.

#### F90 · Major · Nieuw · Features — Tolerance Stack-up telt alle maten op i.p.v. één maatketen
- Status 0.3.3: —
- Bron: teamreview (Risk)
- Bewijs / file:line: Ribbon.tsx:511 'Tolerance Stack-up Study' telt de toleranties van alle maten in het schema op, niet die van één keten. Het resultaat ('worst case ±…, RSS ±…') is neutraal geformuleerd maar technisch misleidend.
- Repro: Tolerance Tree → schema met meerdere maten → Tolerance Stack-up Study
- Fix: De gebruiker een maatketen laten kiezen, of hernoemen naar 'Tolerance sum (all dimensions)' met uitleg.

#### F92 · Major · Nieuw · Juridisch — ~250 'as the original'-commentaren en 'reference frame f_0341'
- Status 0.3.3: —
- Bron: teamreview (Risk)
- Bewijs / file:line: Ongeveer 250 commentaren 'as the original' en vijf keer 'as the (original) 2026', o.a. AssemblyTab.tsx:7 (met 'reference frame f_0341'), AssemblyTab.tsx:43, richTips.tsx:4, components.css:139. Niet in de build (geminificeerd, geen sourcemaps), maar bij een publieke repo of geschil kant-en-klaar bewijs van bewuste nabootsing; f_0341 wijst op frame-voor-frame kopiëren uit video. Major bij publicatie van de broncode, Minor zolang privé.
- Repro: rg -c 'as the original' src; sed -n 7p src/ui/AssemblyTab.tsx
- Fix: Commentaren neutraliseren (beschrijf het gedrag, niet de bron) vóór een publieke repo; een rename-trademarks-dry-run in CI die ook deze patronen zoekt.

#### F81 · Minor · Nieuw · Invoer — Stille afkapping en weigering zonder melding
- Status 0.3.3: —
- Bewijs / file:line: Patroon 300 → stil 250 (pattern.ts:52,59); diepte -5/0 → stil 0,01 (PropertyManager.tsx:41,324,368); 1e300/1e7 geweigerd maar veld springt terug zonder melding
- Repro: Linear Pattern aantal 300; Shell dikte -5; Extrude diepte 1e7
- Fix: Bij afkappen of weigeren een inline melding in de PM ('Maximum 250 instances', 'Waarde moet tussen 0,01 en 1 000 000 mm liggen') en veld rood markeren.


### P3 — look en kwaliteit (17)

#### F16 · Major · Deels opgelost · Visueel — Iconen en lettertype
- Status 0.3.3: Open
- Bewijs / file:line: Plaatwerkiconen eigen ontwerp; overige iconen en lettertype ongewijzigd (pixeldiff t.o.v. 0.3.3 0,02–0,27%)
- Repro: compare/c01–c13
- Fix: Icon-set en Segoe UI-maten één voor één naast referentieframes zetten.

#### F34 · Major · Deels opgelost · Performance — Bundelgrootte
- Status 0.3.3: Deels opgelost
- Bewijs / file:line: build: index 2.159,20 kB (gzip 587,35), chunk-waarschuwing blijft; iets groter dan 0.3.3
- Repro: npm run build
- Fix: three/three-bvh-csg en zware dialogen via dynamic import() splitsen; manualChunks.

#### F19 · Minor · Open · Visueel — XYZ in statusbalk
- Status 0.3.3: Open
- Bewijs / file:line: Statusbalk ongewijzigd (c01, c04)
- Repro: Statusbalk bekijken tijdens schetsen
- Fix: XYZ-coördinaten en eenheid rechts in de statusbalk tonen zoals referentie.

#### F20 · Minor · Open · Visueel — Confirmation Corner
- Status 0.3.3: Open
- Bewijs / file:line: Confirmation Corner ongewijzigd (c05)
- Repro: Schets of feature bewerken
- Fix: Rechtsboven in viewport OK/Cancel-hoek met juiste iconen/maat.

#### F21 · Minor · Open · Visueel — Taakvenster-iconen
- Status 0.3.3: Open
- Bewijs / file:line: Taakvenster-iconen ongewijzigd (c01)
- Repro: Rechter taakvenster
- Fix: Iconen hertekenen op referentiemaat.

#### F22 · Minor · Deels opgelost · Visueel — Body-randen
- Status 0.3.3: Deels opgelost
- Bewijs / file:line: Randdikte ongewijzigd
- Repro: Model met body
- Fix: Lijndikte silhouet/randen afstemmen.

#### F24 · Minor · Open · Visueel — Extra rij in Modify
- Status 0.3.3: Open
- Bewijs / file:line: Modify-box heeft nog de extra rij (c06)
- Repro: Smart Dimension → dubbelklik op maat
- Fix: Extra rij verwijderen; layout gelijk aan referentie.

#### F28 · Minor · Deels opgelost · UX — Bestandsdialoog bij Insert Component
- Status 0.3.3: Deels opgelost
- Bewijs / file:line: Desktop-auto-browse niet getest (geen Electron-binary)
- Repro: Insert Component in desktop-app
- Fix: Testen in desktop-installed.mjs.

#### F33 · Minor · Deels opgelost · Portabiliteit — Machinegebonden scripts
- Status 0.3.3: Deels opgelost
- Bewijs / file:line: desktop:build schrijft bewust naar %LOCALAPPDATA%; enkele look-/calib-scripts machinegebonden
- Repro: e2e/look-*.mjs
- Fix: Machinegebonden scripts naar e2e/tools/ en uit de regressie houden (gebeurt al), documenteren.

#### F77 · Minor · Nieuw · UI-tekst — Kapotte hernoemteksten
- Status 0.3.3: —
- Bewijs / file:line: MenuBar.tsx:257 'Feature Tree Tree Area'; shortcuts.ts:47 'Hide/show Feature Tree tree area'; ManagerPane.tsx:65 'Hide Feature Tree tree area'; Ribbon.tsx:507 'Paste a Auto Tolerancing scheme' / 'Not a Auto Tolerancing scheme'
- Repro: Menu View; rg -n 'Tree Tree|tree area|a Auto' src
- Fix: Teksten met de hand nalopen na tools/rename-trademarks.cjs: 'Feature Tree', 'Hide/show feature tree', 'an Auto Tolerancing scheme'; unit-test die dubbele woorden en 'a A' in UI-strings zoekt.

#### F79 · Minor · Nieuw · Rendering — Final Render bakt hover/selectie-highlight in
- Status 0.3.3: —
- Bewijs / file:line: Viewport.tsx:631-672: alleen origin/planes/sketches verborgen (r. 640); oranje hover/selectie blijft in de render (d34-finalrender)
- Repro: Selecteer een face → Final Render
- Fix: Voor de render selectie/hover-materialen tijdelijk resetten (zelfde als origin/planes) en daarna herstellen.

#### F83 · Minor · Nieuw · Code — Dubbele testhook-conditie in bodyScene.ts
- Status 0.3.3: —
- Bewijs / file:line: src/app/viewport/bodyScene.ts:97: dezelfde lange testhook-conditie staat twee keer achter elkaar (if (X) if (X) ...), restant van een automatische vervanging; dupliceert TEST_HOOKS (testHooks.ts:12) Teamnoot (Webi): het is een tweede, afwijkende kopie van de TEST_HOOKS-gate; importeer TEST_HOOKS.
- Repro: sed -n 97p src/app/viewport/bodyScene.ts
- Fix: Vervangen door: if (TEST_HOOKS) (globalThis as ...).__phlippoLighting = LIGHTING; geen eigen kopie van de conditie.

#### F86 · Minor · Nieuw · Tests — Geen lektest in de repo en geen CI-timeout
- Status 0.3.3: —
- Bron: teamreview (Riki N4/N7)
- Bewijs / file:line: git ls-files e2e | grep -i leak: 0; zz-leak34.mjs is een untracked QA-script, dus F01 heeft geen regressiebewaking. Regressie ±1.820 s serieel, filletopts 291 s bij timeout 400 s; ci.yml heeft geen timeout-minutes.
- Repro: git ls-files e2e | grep -i leak; grep timeout-minutes .github/workflows/ci.yml
- Fix: zz-leak34 als e2e/leak.mjs in de regressie opnemen; timeout-minutes in ci.yml; filletopts splitsen.

#### F87 · Minor · Nieuw · Beveiliging — Geen permission request/check handlers
- Status 0.3.3: —
- Bron: teamreview (Webi a)
- Bewijs / file:line: main.cjs: geen session.setPermissionRequestHandler/setPermissionCheckHandler (rg: 0 hits); Electron staat standaard elke permissie toe (camera, microfoon, notificaties, …).
- Repro: rg -n setPermission electron/
- Fix: Deny-by-default: session.defaultSession.setPermissionRequestHandler((_w,_p,cb)=>cb(false)) en setPermissionCheckHandler(()=>false).

#### F88 · Minor · Nieuw · Beveiliging — Nog file://, geen app:// en geen grantFileProtocolExtraPrivileges-fuse
- Status 0.3.3: —
- Bron: teamreview (Webi b)
- Bewijs / file:line: App laadt via file://; geen protocol.handle; fuse grantFileProtocolExtraPrivileges niet gezet (standaard aan), dus een renderer-XSS op file:// kan waarschijnlijk lokale bestanden lezen. De onHeadersReceived-CSP (main.cjs:287-291) is voor file:// waarschijnlijk dode code; de meta-tag geldt.
- Repro: rg -n "protocol.handle|grantFileProtocol" electron/ package.json
- Fix: app:// via protocol.handle met grantFileProtocolExtraPrivileges=false; CSP-header dan wel actief.

#### F89 · Minor · Nieuw · Beveiliging — TEST_HOOKS aan in elke niet-desktopbuild
- Status 0.3.3: —
- Bron: teamreview (Webi c)
- Bewijs / file:line: testHooks.ts:12: DEV || !d || !!d.testHooks; buiten de desktop (!d) is het altijd waar, dus een gehoste webbuild zou window.__phlippoStore en __phlippoSave blootstellen.
- Repro: npm run build && npx vite preview; in de console: typeof window.__phlippoStore
- Fix: Gate op een expliciete buildvlag (import.meta.env.VITE_TEST_HOOKS), alleen in de e2e-build aan.

#### F91 · Minor · Nieuw · Juridisch — THIRD-PARTY-NOTICES mist Chromium/Electron-licenties
- Status 0.3.3: —
- Bron: teamreview (Risk)
- Bewijs / file:line: THIRD-PARTY-NOTICES.txt (213 regels) noemt react, three, zustand, electron e.a. (MIT), maar niet Chromium, ffmpeg en andere code die Electron bundelt; niet gecontroleerd of LICENSES.chromium.html in de installer zit.
- Repro: Installer uitpakken; zoek LICENSES.chromium.html
- Fix: LICENSES.chromium.html meeleveren en ernaar verwijzen in THIRD-PARTY-NOTICES; derde-partij-HDR's, fonts en iconen nalopen.


### P4 — opgelost (ter controle) (48)

- **F01** [Kritiek] WebGL-geheugenlek bij bewerken — Opgelost. Bewijs: zz-leak34: geometries/textures/programs/VAO constant 11/4/3/4 over 75 bewerkingen + 10x new/open
- **F02** [Kritiek] file:save naar willekeurig pad — Opgelost. Bewijs: electron/main.cjs: ondoorzichtige handles (F68), save alleen naar door main gekozen pad
- **F53** [Kritiek] Regressie in desktop: functies kapot zonder testhooks — Opgelost. Bewijs: Desktop-simulatie zonder hooks: Zoom to Fit via F en menu werkt, Final Render levert beeld (d34-*). Niet getest in packaged Electron Teamnoot (Riki/Risk): opgelost in code, maar niet geborgd in CI: geen run met hooks uit of tegen de packaged build (zz34-desktop is untracked).
- **F58** [Kritiek] Feature-burst tegen het advies van feature freeze in — Opgelost. Bewijs: src 55.282 regels (+610), geen nieuwe CAD-functies
- **F60** [Kritiek] Assembly-cut laat niets over van de body — Opgelost. Bewijs: asmcut 3/3
- **F03** [Major] Geen CSP, navigatie- en sender-beveiliging — Opgelost. Bewijs: main.cjs: will-navigate/will-frame-navigate/will-redirect geblokkeerd, trusted() exact (alleen code, niet in Electron-binary getest)
- **F04** [Major] Testhooks in productie — Opgelost. Bewijs: Desktop-simulatie (phlippoDesktop, testHooks:false): alle window.__phlippo* undefined; src/app/testHooks.ts:12
- **F06** [Major] Modify accepteert 0 — Opgelost. Bewijs: regressie: modify-scripts groen
- **F07** [Major] Extrude-diepte niet gevalideerd — Opgelost. Bewijs: regressie features 64/64 groen; diepte >1e6 geweigerd in het veld
- **F08** [Major] Extrude op lege schets — Opgelost. Bewijs: regressie groen
- **F09** [Major] Full Round fillet — Opgelost. Bewijs: filletopts 16/16 groen (291 s, dicht bij timeout 400 s)
- **F11** [Major] Insert Component — Opgelost. Bewijs: regressie insert-scripts groen
- **F12** [Major] Standard 3 View — Opgelost. Bewijs: regressie groen
- **F13** [Major] Welkomstscherm — Opgelost. Bewijs: Welkomstscherm met disclaimer (dialogs.tsx:87), shot app-01
- **F15** [Major] Watermerk — Opgelost. Bewijs: fixes1 groen (geen watermerk)
- **F32** [Major] Niet-hermetische tests — Opgelost. Bewijs: Regressie draait op Linux/Chromium zonder msedge; keys, dimpm, confirmdelete groen; fixture in e2e/fixtures
- **F39** [Major] Rebuild wist undo — Opgelost. Bewijs: Claim + editcomponent groen (niet zelf handmatig nagespeeld)
- **F42** [Major] Numeriek / eenheden — Opgelost. Bewijs: 2*25+5→55, (100-4)/3→32, 10mm, 1in→25,4; '1,000'→1 (komma = decimaal, components.tsx:268) by design
- **F43** [Major] Decal-URL — Opgelost. Bewijs: CSP blokkeert remote/file-afbeeldingen
- **F44** [Major] Patroon- en bestandslimieten — Opgelost. Bewijs: MAX_PATTERN_INSTANCES = 250 (pattern.ts:52,59); 300 → 250 in 1,45 s, geen bevriezing (stille afkapping: F81)
- **F45** [Major] Koppeling .kcad — Opgelost. Bewijs: Koppeling .kcad in installer
- **F55** [Major] Beschadigde assembly of drawing crasht de UI — Opgelost. Bewijs: Beschadigde assembly/drawing/mate geweigerd met melding ('Component 1 is damaged', 'Sheet 1 is damaged', 'Mate 1 is damaged'); geen crash, geen page errors
- **F62** [Major] Stored XSS in de Phlippo Viewer-export — Opgelost. Bewijs: XSS-naam ontsnapt in viewer-titel, geen PWNED, CSP default-src none
- **F71** [Major] Geen bovengrens op numerieke invoer — Opgelost. Bewijs: 1e300 en 1e7 geweigerd (MAX_FIELD_VALUE = 1e6, components.tsx:287); 999999 geaccepteerd; geen melding bij weigeren (F81)
- **F72** [Major] Disclaimer onvolledig en deels onjuist — Opgelost. Bewijs: About 'Phlippo CAD 0.3.4' + volledige disclaimer (u34-about), Welcome, Viewer-footer, LICENSE.txt in installer
- **F75** [Major] Modelwijzigingen buiten undo — Opgelost. Bewijs: Undo werkt voor renameDocument, renameFeature, setMaterial, setUnits (zz34-ui); setTableCell met history.push (store.ts:3444)
- **F17** [Minor] Isometrisch in plaats van Trimetric — Opgelost. Bewijs: Trimetric standaard
- **F18** [Minor] Vlak kiezen — Opgelost. Bewijs: Vlaklabels in hoek zonder overlap (app-03, c03)
- **F23** [Minor] Placeholder-iconen in de Extrude-PM — Opgelost. Bewijs: Extrude-PM iconen ok
- **F25** [Minor] Sterretje bij niet-opgeslagen — Opgelost. Bewijs: * in titel bij wijziging
- **F26** [Minor] Nederlandse foutmelding / lang=nl — Opgelost. Bewijs: <html lang="en">; meldingen Engels
- **F27** [Minor] Klein venster — Opgelost. Bewijs: 1100x700 en 900x640: geen horizontale scroll, ribbon klapt in met » (u34-small-*)
- **F29** [Minor] Standaard bij verwijderen van kinderen — Opgelost. Bewijs: confirmdelete groen
- **F30** [Minor] Geen welkom na reload — Opgelost. Bewijs: Geen welkom na reload
- **F35** [Minor] BVH-optie — Opgelost. Bewijs: vitest 337/337, 0 BVH-meldingen
- **F37** [Minor] Dev-dependencies — Opgelost. Bewijs: npm audit: 0 kwetsbaarheden
- **F52** [Minor] Enter herhalen / muisgebaren — Opgelost. Bewijs: qa2 17/17 en keys groen op Linux
- **F59** [Minor] tsbuildinfo in git — Opgelost. Bewijs: tsbuildinfo uit git
- **F61** [Minor] Verouderde zoom-fit-hook in tekening — Opgelost. Bewijs: qa3 groen (zoom to sheet)
- **F63** [Minor] Sheet Metal-tab niet contextgevoelig, met generieke iconen — Opgelost. Bewijs: Op solid: Edge Flange, Hem, Jog, Unfold e.a. grijs; Base Flange/Insert Bends/Convert actief (u34-f63)
- **F64** [Minor] DimXpertManager: tekst afgekapt en verwarrend — Opgelost. Bewijs: DimXpert-tekst loopt om, 'No tolerance scheme yet…' (app-21)
- **F65** [Minor] Packaged app luistert naar dev- en E2E-env-vars — Opgelost. Bewijs: main.cjs:18-21 PACKAGED-gates (code)
- **F66** [Minor] Vlaklabels overlappen in Trimetric — Opgelost. Bewijs: Geen overlap van vlaklabels
- **F67** [Minor] DevTools bereikbaar via het standaardmenu — Opgelost. Bewijs: devTools !PACKAGED (main.cjs:147,180), menu null
- **F68** [Minor] file:open geeft het absolute pad aan de renderer — Opgelost. Bewijs: Handles i.p.v. paden (code)
- **F69** [Minor] openExternal accepteert elke https-URL — Opgelost. Bewijs: Allowlist openExternal (code)
- **F73** [Minor] Geen LICENSE/EULA en third-party notices — Opgelost. Bewijs: LICENSE.txt en THIRD-PARTY-NOTICES.txt
- **F76** [Minor] Interferentie: mislukte boolean telt als 'geen interferentie' — Opgelost. Bewijs: interference.ts catch markeert paar als mislukt; assemblyDialogs.tsx:106 'Not checked'

## 6. Visuele vergelijking met SOLIDWORKS 2026

13 vergelijkingen naast elkaar in `report-0.3.4/compare/c01–c13.jpg` (links SW 2026-videoframe, rechts Phlippo 0.3.4).

Advies Strati: tel visuele gelijkenis niet meer als doel, maar de herkenbaarheid van de workflow. Dat verkleint het IP-risico en scheelt werk aan F16–F24. De pixelvergelijking hieronder blijft als referentie.

- Beter dan 0.3.3: vlaklabels zonder overlap (F18/F66), DimXpert-tekst loopt om (F64), commando's grijs zonder body (F14, op Linear Pattern na), plaatwerk-tab contextgevoelig met eigen iconen (F63), ribbon klapt netjes in op kleine vensters (F27).
- Nog anders: iconen en lettertype (F16), statusbalk zonder XYZ (F19), Confirmation Corner (F20), taakvenster-iconen (F21), randdikte (F22), extra rij in Modify (F24, c06), kapotte teksten (F77), '!'-markering buiten beeld (F78).

## 7. Beveiliging

- Goed: ondoorzichtige handles, CSP, sandbox/contextIsolation, geen navigatie, openExternal-allowlist, PACKAGED-gates voor env-vars en DevTools, Viewer-export ge-escaped met eigen CSP, fsync + .bak/.bak2.
- Open: geen code signing (F49); half-geldige bestanden openen (F80); alles in Electron alleen in code gecontroleerd (geen binary op de testmachine).
- Uit de teamreview: packaged app accepteert --remote-debugging-port (F85, Major, uit code); geen permission handlers (F87); nog file://, geen app:// en geen grantFileProtocolExtraPrivileges-fuse (F88); TEST_HOOKS aan in elke niet-desktopbuild, dus een gehoste webbuild zou __phlippoStore/__phlippoSave blootstellen (F89); F83 is een afwijkende kopie van de gate.

## 8. IP-risico (tellingen hoofdletterongevoelig in src, 0.3.3 → 0.3.4)

FeatureManager 42→17 (niet meer zichtbaar), PropertyManager 131→121, CommandManager 33→26, DimXpert 147→136, TolAnalyst 2→0, SimulationXpress 11→7, Instant3D 33→30, RealView 46→41, Hole Wizard 42→42, Toolbox 36→36, Design Library 15→15, Smart Fasteners 8→8, eDrawings 5→5, SOLIDWORKS 5→4. IP-risico volgens Risk: **middel-laag voor privégebruik, middel bij publieke release** (in 0.3.3 hoog); de DS-eigen namen zijn uit de UI. Commercieel: eerst juridisch laten toetsen.

- Bewijs van nabootsing in de broncode (F92, Major bij publicatie, Minor zolang privé): ~250 commentaren "as the original", vijf keer "as the (original) 2026" en "reference frame f_0341" (AssemblyTab.tsx:7). Niet in de build, wel in een publieke repo.
- THIRD-PARTY-NOTICES noemt alleen MIT-pakketten, niet Chromium/Electron; controleer dat LICENSES.chromium.html meegaat (F91).

Voorstel hernoemen: Hole Wizard → Hole Tool, Toolbox → Standard Parts, Design Library → Part Library, Lifecycle and Collaboration → Share, Smart Fasteners → Auto Fasteners, Instant3D → Drag Handles, RealView → Realistic Shading; identifiers (`simxpress`, `PropertyManager.tsx`) en commentaar meenemen.

## 9. Niet getest

- De packaged Electron-app en de NSIS-installer (geen Electron-binary; desktop alleen gesimuleerd via `window.phlippoDesktop`).
- Windows en msedge (alles op Linux/Chromium).
- Code signing / SmartScreen.
- Ctrl+S op een half-geldig bestand in de echte desktop-app (F40).

## 10. Bestanden

- Logs: `report-0.3.4/logs/` (regression.log, zz34-*.log, build, vitest, audit)
- Screenshots: `report-0.3.4/shots/`
- Vergelijkingen: `report-0.3.4/compare/`
- Data: `report-0.3.4/findings34.json`
- Testscripts (in de testkopie): `e2e/zz34-*.mjs`, `zz-shots34.mjs`, `zz-leak34.mjs`

## Teamoordeel

**Stand: 4 van 5 reviewers binnen. Unaniem 6/10, NO-GO voor release.** Eigen gebruik door Ian is OK onder de voorwaarden van Risk:

1. Eerst 0.3.4 committen en taggen (F82).
2. Werkbestanden onder eigen versiebeheer of back-up; twee .bak-generaties zijn geen archief.
3. Edit Component altijd afsluiten met Save en Return vóór Open of New (F74).
4. Quick Beam Estimate niet gebruiken als ontwerpcontrole (F56).

### Strati — Strategie en product

**Oordeel:** 6/10, NO-GO voor release. Akkoord met de lead; eigen gebruik door Ian kan, met versie-backups.

Kernpunten:
- De feature freeze werkt: +610 regels, geen nieuwe CAD-functies (F58) en daardoor 48 bevindingen opgelost. Hou hem vast tot GO.
- Ernst omhoog: F74 en F82 naar Kritiek, F54 en F38 naar Major; F56 blijft Kritiek zolang er een groene veiligheidsfactor staat.
- De packaged Electron-app en de installer zijn nooit getest, terwijl F53 precies daar ontstond: een smoke-test op Windows hoort bij GO.
- Nog geen beslissing over de kern (F51) en geen tijdslot: plan de OpenCascade-spike direct na GO, vóór nieuwe functies.
- Mik op een herkenbare workflow, niet op pixelgelijkenis met SOLIDWORKS: dat verkleint het IP-risico en scheelt werk aan F16–F24.

Top 3:
1. Reproduceerbaar en bewezen: commit en tag v0.3.4 (F82), drawing groen op Linux (F10/F54), smoke/relations exit 1 (F57), smoke-test van packaged app en installer op Windows, docs/11 corrigeren.
2. Geen stil dataverlies of stille fouten: F74, F78, F80, F81.
3. Naam en eerlijkheid: hernoemvoorstel volledig uitvoeren incl. identifiers en 'as the 2026 original', F77 herstellen; veiligheidsfactor weg of neutraal met 'niet voor ontwerp gebruiken'.

### Webi — Frontend, Electron en beveiliging

**Oordeel:** 6/10, NO-GO. Electron-beveiliging is op papier in orde; GO wordt geblokkeerd door proces en architectuur/performance, niet door security.

Kernpunten:
- Geverifieerd in code: F02 (UUID-handles, atomair opslaan met .bak/.bak2), F03 (navigatie dicht, trusted() exact), F53 (bridge.ts, geen productiecode leest window.__phlippo*), F62 (scriptJson-escape + eigen CSP + unittest). Niets getest in een packaged binary.
- Nog open: file:// zonder app:// en zonder grantFileProtocolExtraPrivileges-fuse (F88), geen permission handlers (F87), geen code signing (F49), TEST_HOOKS aan in elke niet-desktopbuild (F89), F83 is een afwijkende kopie van de gate.
- Performance onveranderd of slechter: store.ts 5.322 regels, 127 kale useStore() tegen 22 selectors, 0 useShallow, 0 React.lazy, hoofdchunk 2,16 MB, CSG nog op de UI-thread, rebuildbudget 45 s.
- Stelde F34 Minor voor (desktop laadt lokaal); niet overgenomen, de strengste ernst wint.

Top 3:
1. CI groen en reproduceerbaar (F10/F54/F57, commit en tag F82) plus een smoke-test van de echte electron-builder-output op een Windows-runner zonder PHLIPPO_E2E.
2. Performance-pass binnen de freeze: zustand-slices met selectors/useShallow, React.lazy voor Drawing/Assembly/Simulation/Sheet Metal/Weldments, CSG in een worker met voortgang en annuleren, budget ~5 s (F46).
3. Laatste Electron-lockdown: app:// met grantFileProtocolExtraPrivileges=false, deny-by-default permission handlers, drop-guard in de renderer, code signing of een gedocumenteerde SmartScreen-melding.

### Riki — Test- en CI-eerlijkheid

**Oordeel:** 6/10, NO-GO. De tests zijn een stuk eerlijker (runner met exit 1, volledige regressie in CI, || true weg), maar "groen" betekent nog niet overal "werkt".

Kernpunten:
- F57 gecorrigeerd: een page error maakt 74/79 scripts rood, niet 77/79; smoke, relations, keys, deletekey en deletekey2 nooit, en deletekey2 laat 5 gefaalde checks door. Ingeslikte catches 74 → 89; 72 scripts kopiëren de exit-regel (page errors wel, console-errors niet).
- F54 is eerlijk rood en heeft één oorzaak: drawing.mjs:191 is een vervolgfout van :161 (Ø35). Er bestaat geen echte CI-run op 0.3.4, want het is niet gecommit.
- F53 is in code opgelost maar niet geborgd: geen CI-run met hooks uit of tegen de packaged build.
- Nieuw: regressie overschrijft de voorbeeld-.kcad's in git (F84), packaged app accepteert --remote-debugging-port (F85), geen lektest in de repo en geen CI-timeout (F86).
- Grootste risico: CI test een andere configuratie (browser, hooks aan) dan wat geleverd wordt (packaged Electron, hooks uit).

Top 3:
1. Eén gedeelde e2e-helper (e2e/lib/check.mjs) voor alle 79 scripts, lege catches vervangen, lektest in de repo en de regressie.
2. CI eerlijk en reproduceerbaar: commit en tag v0.3.4, doorhandle.mjs naar /tmp, git diff --exit-code na de tests, Ø35 op Linux oplossen, timeout-minutes.
3. CI-run zonder hooks: desktop-nohooks.mjs met Zoom to Fit en Final Render via xvfb-run, desktop-installed.mjs verplicht vóór elke installer, --remote-debugging-port blokkeren.

### Risk — Risico en optimalisatie (GO-lijst, bestanden, IP)

**Oordeel:** Release NO-GO, 6/10, akkoord met de lead. Persoonlijk gebruik door Ian: GO, onder vier voorwaarden.

Kernpunten:
- GO-telling bevestigd: 5 gehaald, 4 deels, 1 niet. #4 (.bak) en #7 (aantal-limieten) nu gehaald, #10 van niet naar deels, #9 nog niet. Make Multibody Part vraagt alleen ja/nee, zonder Save (#5).
- F82 naar Kritiek: het hele 0.3.4-resultaat bestaat alleen in een werkmap. Stelde verlaging voor van F50, F56, F05, F41 en F40 naar Major; niet overgenomen, de strengste ernst wint.
- F56: de FOS wordt groen (evaluateDialogs2.tsx:310) en de resultaatbalk krijgt een groene achtergrond bij FOS ≥ 1 (:380). Tolerance Stack-up telt alle maten op i.p.v. één keten (F90).
- IP: middel-laag voor privégebruik, middel bij publieke release. ~250 commentaren 'as the original' en 'reference frame f_0341' (AssemblyTab.tsx:7) zijn bewijs van nabootsing als de broncode publiek wordt (F92); THIRD-PARTY-NOTICES mist Chromium/Electron-licenties (F91).

Top 3:
1. Proces: nu committen en taggen, drawing groen op Linux (of expliciete skip met issue), smoke/relations een exitcode, zz34-desktop als desktop-nohooks.mjs in de regressie.
2. Bestandsintegriteit: whitelist van feature-types, entity→punt- en feature→schets-controle, MAX_FILE_NUMBER naar 1e6, negatieve waarden weigeren (F80); withUnsavedCheck ook op editContext (F74).
3. IP en zekerheid: neutrale FOS-kleur, Hole Wizard en Lifecycle and Collaboration in de MAP van rename-trademarks.cjs, F77 herstellen, 'as the original'/f_0341-commentaren neutraliseren, dry-run in CI.

### MT5 Developer

**Oordeel:** Volgt later (na de trading-batch).


### Ernstwijzigingen: wie stelde wat voor

Regel: de strengste voorgestelde ernst wint. Een verlaging door één reviewer telt niet als de huidige of een andere voorgestelde ernst hoger is.

| ID | Ernst QA | Voorstellen team | Definitief | Toelichting |
|---|---|---|---|---|
| F74 | Major | Strati: Kritiek; Risk: samen met F41 als Major | Kritiek | Dataverlies, zelfde klasse als F41; hoogste voorstel wint |
| F82 | Major | Strati: Kritiek; Risk: Kritiek | Kritiek | Hele 0.3.4 bestaat alleen in een werkmap |
| F54 | Minor | Strati, Riki, Risk: Major | Major | Hangt aan GO-voorwaarde #9 |
| F38 | Minor | Strati: Major | Major | Onjuiste statusclaims in docs/11 |
| F56 | Kritiek | Strati: Kritiek; Risk: Major | Kritiek (blijft) | Groene veiligheidsfactor staat er nog |
| F31 | Kritiek | Riki: Major | Kritiek (blijft) | Verlaging telt niet bij hogere huidige ernst |
| F14 | Major | Riki: Minor | Major (blijft) | Noot: Linear Pattern Ribbon.tsx:306, fix van één regel |
| F34 | Major | Webi: Minor (desktop laadt lokaal) | Major (blijft) | Verlaging telt niet |
| F50 | Kritiek | Risk: Major | Kritiek (blijft) | Verlaging telt niet |
| F05 | Kritiek | Risk: Major (samenvoegen met F70/F80) | Kritiek (blijft) | Verlaging telt niet |
| F41 | Kritiek | Risk: Major (samenvoegen met F74) | Kritiek (blijft) | Verlaging telt niet |
| F40 | Kritiek | Risk: Major | Kritiek (blijft) | Verlaging telt niet |
| F57 | Major | Riki: Major, bewijs corrigeren | Major | Bewijs gecorrigeerd: 74/79, catches 74 → 89 |
| F53 | Kritiek (Opgelost) | Riki: Opgelost met voorbehoud | Kritiek (Opgelost) | Noot: niet geborgd in CI |
