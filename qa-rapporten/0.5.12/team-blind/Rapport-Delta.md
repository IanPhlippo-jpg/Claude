# Blinde review — Phlippo CAD 0.5.12 (SHA e0c7283) versus SolidWorks

Bronnen gelezen: CASUS.md, FORMAAT.md, findings-0.5.12.json, report-0.5.11/QA-rapport-0.5.11.md, findings.json en parity.json (baseline-matrix 62 rijen), gerichte stukken uit src-0.5.12/. Het voorlopige technische totaaloordeel en andere teamrapporten zijn niet gelezen. Er is niets gebouwd of getest: alle test- en buildcijfers hieronder zijn **aangeleverd** tenzij expliciet "zelf gecontroleerd (statisch)".

## 1. Eigen conclusie: score, strikte pariteit en vrijgaveadvies

**Score: 5/10** (gelijk aan baseline 0.5.11). De geometrische kern is wezenlijk beter geworden: twee van de drie Kritieke punten uit 0.5.11 (F175 vals "exact", F177 stil foute fillet) zijn volgens aangeleverde tests opgelost en de bijbehorende code is aanwezig. Daar staat tegenover dat de release-commit zelf niet bouwt: de officiële `npm run build` (`tsc -b && vite build`) breekt af op een testbestand, en CI op deze SHA is rood. In mijn eigen releasewaardering (geen universele regel) laat ik een release die niet via de eigen buildroute reproduceerbaar is niet hoger scoren dan de vorige. Na een volledig groene build en CI-rerun op dezelfde SHA, met aantoonbaar juiste testdekking, zou ik 6/10 heroverwegen.

**Strikte pariteit: 72,6 %** (45,0/62). Dezelfde methodiek als de baseline: 62 rijen, aanwezig = 1, deels = 0,5, ontbreekt = 0. De noemer blijft 62 en er zijn geen rijen geherdefinieerd.

| | aanwezig | deels | ontbreekt | punten | % |
|---|---|---|---|---|---|
| Baseline 0.5.11 | 30 | 27 | 5 | 43,5 | 70,2 % |
| Eigen telling 0.5.12 | 31 | 28 | 3 | 45,0 | 72,6 % |

Wijzigingen ten opzichte van de baseline. Elke wijziging is verantwoord en geen enkele is direct uit een testtelling afgeleid:
- **Rij 7 Instant2D / Magnified Selection: ontbreekt → deels (+0,5).** Zelf gezien: `src/app/viewport/Magnifier.tsx` en `e2e/instant2d.mjs` bestaan. Aangeleverd: 8/8 en 12/12. Geen "aanwezig", want er is geen gedragsvergelijking met SolidWorks (alle maattypen, sleepgedrag).
- **Rij 44 Design tables (Excel): ontbreekt → deels (+0,5).** Zelf gezien: `src/core/document/designTable.ts` is CSV-only (regels 14, 45, 73). Excel-integratie zoals in SolidWorks ontbreekt, dus deels.
- **Rij 27 Undo/redo 200 stappen: deels → aanwezig (+0,5).** Zelf gezien: `history.ts:5 limit = 200`. Aangeleverd: undo200 7/7. Deze aanwezigheid geldt strikt voor de concrete rijscope, namelijk 200 stappen undo/redo zoals in de baseline omschreven. Het baselinebezwaar was "200 nergens getest" en dat bezwaar is hiermee weggenomen. Het is geen claim van volledige SolidWorks-gelijkheid in undo-gedrag; daarvoor is een gedragsreferentie nodig (zie criterium 6).
- **Expliciet níet verhoogd:**
  - Rij 11 Fillet. F177/F178 zijn opgelost, maar `brepRoundable` (`src/core/features/rebuild.ts:855-859`) sluit setback, partial, overflow en profielen uit, en face fillet en full round gaan naar de mesh-kernel.
  - Rij 30 Exact B-rep desktop. Er is geen packaged self-test op e0c7283.
  - Rij 31 Exact B-rep overal. Plastics, wrap en sweep/loft met guides vallen terug op mesh (`rebuild.ts` sweep/loft geeft `null` bij guides).
  - Rij 17 Instant3D. Drag handles zijn geen volledige Instant3D.
  - Rij 51 IGES/DWG/Parasolid. In de onderzochte snapshot is geen exporter voor IGES, DWG of Parasolid aangetroffen.
  - Rij 60 Code-signing. `package.json:20` meldt zelf "UNSIGNED build". Dit is een rij in de matrix, geen wettelijke verplichting.
  - Rij 62 Groene CI. Aangeleverd: rood op e0c7283.
  - Rij 61 Unit+e2e+B-rep+worker. Typecheck blokkeert, dus niet aanwezig.

Let op: deze matrix meet of functies **aanwezig** zijn. 72,6 % betekent níet "72,6 % van SolidWorks". Veel "aanwezig"-rijen gaan over versimpelde implementaties die niet één-op-één tegen SolidWorks gemeten zijn. Betere geometrie verhoogt de betrouwbaarheid, maar niet automatisch de pariteit.

**Vrijgaveadvies:**
- **Universele vrijgave of "SolidWorks-vervanger": NO-GO.** Redenen: build en CI rood op de release-SHA, geen IGES/DWG/Parasolid-exporter aangetroffen, en de kruiscontrole deelt een blinde vlek.
- **Distributie.** Dit is een eigen distributiepoort, geen absolute technische of wettelijke eis. Ongesigneerde experimentele distributie is mogelijk als er transparant bij staat dat de installer niet gesigneerd is. Wie vertrouwde, brede distributie nastreeft, moet wel signeren.
- **Eigen niche- of experimenteel gebruik: voorwaardelijk GO.** Dat geldt voor concept- en hobbymodellen met constante fillets, extrude/revolve, eenvoudige assemblies en STEP-export. Voorwaarden:
  - gebouwd vanaf een gevalideerd build-pad;
  - kritische maten en vormen onafhankelijk gecontroleerd, met eigen meting of referentiemodel.

  De volume- en vormwaarschuwingen bewijzen geen geometrische veiligheid. Ze delen de blinde vlek van de gedeelde randkeuze en zijn steekproefsgewijs. De goedkeuring is dus een gebruiksadvies en geen veiligheidsbewijs.

## 2. Sterke en zwakke punten (bewijs per claim)

**Sterk**
- **Eerlijke exactheid.** `occt.worker.ts:78` geeft `exact: false` terug als er geen exacte vorm is (zelf gezien). Aangeleverd: de ellips-STEP bevat ELLIPSE/B_SPLINE en de wrap heeft het label "niet exact" (F175).
- **Kruiscontrole volume én vorm.** `volumeCheck.ts:18,21,41,90` (zelf gezien): volumegrens 0,5 %, vormgrens 0,1 mm of 0,02 % van de diagonaal, steekproef tot 80 000 punten. Aangeleverd: mutatiecheck 4/4.
- **Randherkenning gokt niet meer.** `edgesets.ts:317` geeft `null` bij ambiguïteit in plaats van de dichtstbijzijnde rand (zelf gezien, F179).
- **Fillet na maatwijziging.** Aangeleverd (F111/F177): 38 422,743 mm³ binnen 0,001 mm³ op B-rep. De oude fout van 47,2 mm³ is weg.
- **Brede feature-dekking.** 119 e2e-scripts aanwezig (zelf geteld). Ontwerptabellen, magnifier, 3D-schets en relaties staan in de bron.
- **Codediscipline.** `rebuild.ts` heeft 2273 regels (zelf geteld), net onder de cap van 2280 en flink lager dan de vorige 3390.

**Zwak**
- **Build gebroken door een testbestand.** `tsconfig.app.json` heeft `"include": ["src"]`, dus `src/qa/tekeningenAfzuiging.test.ts` wordt meegetypecheckt. Dat bestand importeert `../../voorbeelden/afzuiging/revisie.mjs` zonder `@ts-expect-error` (de regel erboven heeft het wél). Dat bevestigt TS7016/TS2307 statisch. `rebuildAssembly` is geïmporteerd en `noUnusedLocals: true` staat aan, wat past bij TS6133 (zelf gezien). Projectspecifieke testcode zit in de productbuild: dat is een procesfout, geen geometriefout.
- **Gedeelde blinde vlek.** `matchEdges` wordt in `rebuild.ts:816,1918,1962` voor beide kernels gebruikt. Twee gelijk-foute randkeuzes geven dus afwijking 0 (zelf gezien, F179).
- **Volumegrens blijft ruim.** `volumeCheck.test.ts:10` legt vast dat 30439,07 tegenover 30431,33 (≈0,025 %, ~7,7 mm³) géén waarschuwing geeft (zelf gezien, F172/F198). De vormcontrole vangt dit alleen op als er een vertex in de buurt ligt.
- **Sketch Text als curvebenadering.** `text.ts:46-48` gebruikt `getPoints(6)` per contour, dus de lettercontour wordt benaderd met lijnstukken (zelf gezien, F201). De B-rep-extrusie van die contour kan zelf een exacte solid zijn; de afwijking zit in de curvebenadering, niet per se in de solid.
- **Instellingen deels niet bedraad.** 148 bedrade sleutels in `prefsWired.ts` (zelf geteld). Of het schema er 345 heeft, is aangeleverd. `sketch.virtualSharps` staat in het schema maar is niet bedraad (zelf gezien).
- **Rebuild-budget van 45 s** (`rebuild.ts:848`, zelf gezien). De UI-thread rekent in de browser-meshbuild (aangeleverd).
- **Geen code-signing** (`package.json:20`, zelf gezien). In de onderzochte snapshot is geen IGES-, DWG- of Parasolid-exporter aangetroffen: `rg IGES src` levert geen exporter op (zelf gezien; dit is alleen deze snapshot). STEP is alleen AP214, geen AP242 (`step.ts:128`).
- **Documentatie.** De totaalzin "736/736" en de fasekoppen kloppen niet (aangeleverd, F38/F129; niet zelf herteld).

## 3. Geldigheid van het bewijs

| Categorie | Inhoud |
|---|---|
| **Zelf gecontroleerd (statisch, op de box)** | Versie 0.5.12 in package.json. Build-script `tsc -b && vite build`. tsconfig-include `src`. De imports in tekeningenAfzuiging.test.ts. Brepround-uitsluitingen. Sweep/loft geven `null` bij guides. Constanten in volumeCheck en de nul-waarschuwingstest. Gedeelde matchEdges. Ambiguïteit → null. Polylijntekst. History-limiet 200. CSV-only ontwerptabellen. Magnifier en e2e instant2d. Geen IGES-code. UNSIGNED in het build-script. 2273 regels in rebuild.ts. 148 bedrade prefs. 119 e2e-bestanden. Map `voorbeelden/` ontbreekt in de snapshot. |
| **Aangeleverd (cloud-QA, niet gereproduceerd)** | npm ci; exitcodes van typecheck en build plus de drie TS-codes; unit 724/10/1 kaal en 815/2 met fixtures; vite-bundel 782,72 kB; mesh 104/104; B-rep 14/14; mutatie 4/4; ellips- en filletvolumes; npm audit; Actions-runs 41862412746 (groen, 02e3b22) en 42502050109 (rood, e0c7283); NotSigned-rapport; Instant2D, undo, CSV en e2e-tellingen. Ruwe logs ontbreken op de box. Het B-rep-CI-artefact gaf 401, dus de oorzaak van de rode B-rep-job op CI is onbekend, terwijl dezelfde scripts lokaal groen zouden zijn. |
| **Onbekend / ontbrekend** | Packaged desktop op e0c7283. Windows-installer op deze SHA. Visuele en UI-herbeoordeling (F16/F21/F22/F24/F28). Determinisme (E2E_REPEAT=10). Volume-impact van polylijntekst. Juridische toets (F189). Of het schema 345 sleutels heeft. Geen vergelijking naast SolidWorks in deze ronde. |

De ontbrekende `voorbeelden/` in de zip verklaart de 10 kale unitfouten. Ik reken die **niet** als productfout. De typecheckfout reken ik wél als productfout: de aangeleverde observatie zegt dat fixtures toevoegen de typecheck niet herstelt, en statisch klopt dat ook (TS6133 en de typefout staan los van fixtures).

## 4. Ernst en prioriteiten (gededupliceerd)

Overlappende bevindingen zijn samengevoegd tot één werkpunt.

| Prio | Werkpunt | Samengevoegde ID's | Ernst |
|---|---|---|---|
| P0 | Releasebewijs-cluster: release-SHA bouwt niet, CI rood, packaged en installer niet gemeten | F200, F176, F54, F130, F31, F98, F97, F151, F196 | **Kritiek** (één punt voor de ernstbepaling). Het is niet bewezen dat de installer- en packaged-gaten causaal uit de typecheck volgen. Elk blijft een afzonderlijke onbekende: de rode B-rep-job, het installergedrag, de packaged self-test en de fuses. |
| P1 | Kruiscontrole: gedeelde randkeuze + ruime volumegrens + steekproef | F179, F172, F198, F202, F48 | Major |
| P1 | Exacte dekking onvolledig (face/full-round/setback-fillet, guides, plastics, wrap) | F51, F121, rij 11/31 | Major |
| P1 | Distributie: niet gesigneerd | F49, F117 | Major binnen mijn eigen distributiepoort voor vertrouwde, brede distributie. Geen absolute technische of wettelijke blokkade; ongesigneerde distributie kan met een transparante waarschuwing. |
| P2 | Interop: geen IGES-, DWG- of Parasolid-exporter aangetroffen in de snapshot; STEP AP214 | F114, F199 | Major voor universele pariteit, Minor voor niche |
| P2 | Bewijsketen: ruwe logs/mappen ontbreken, logs van andere SHA | F93, F126, F148, F149, F180, F105 | Major |
| P2 | Prefs grotendeels niet bedraad | F112, F124 | Major |
| P2 | Performance: 45 s budget, UI-thread in browser, bundelmarge 17 kB | F46, F137, F174 | Major/Minor |
| P3 | Tekeningen centermarks/HLR-asserts, topologische naamgeving | F122, F47 | Major |
| P3 | Sketch Text polylijn, docs/tellingen, UI-cosmetica, productnaam, juridisch | F201, F38/F129, F16/F21/F22/F24/F193/F194, F189 | Minor (F189 vóór publicatie Major) |

Mijn telling Kritiek: **1** (P0). F175 en F177 tellen niet mee: statisch is de fix aanwezig en het aangeleverde bewijs is consistent.

## 5. Bruikbaarheid, blinde vlekken, alternatieve interpretaties

- **Bruikbaarheid nu.** Goed bruikbaar voor eenvoudige prismatische delen, plaatwerk-concepten, kleine assemblies en tekeningen met PDF/DXF. STEP AP214-export is aanwezig. Of dat voor een concrete leverancier volstaat, is niet onderzocht. In de snapshot is geen IGES-, DWG- of Parasolid-exporter aangetroffen. Wie die formaten nodig heeft, kan ze in deze snapshot niet exporteren.
- **Blinde vlekken.**
  1. De kruiscontrole kan niet zien dat beide kernels dezelfde verkeerde rand kiezen.
  2. Vormfouten op grote lichamen zonder vertex in de steekproef.
  3. De UI is sinds 0.5.11 niet opnieuw visueel beoordeeld.
  4. Geen herhaalruns, dus flakiness is onbekend.
  5. De bewijsketen leunt op een andere SHA (02e3b22).
- **Alternatieve interpretatie (hypothese, niet bewezen).** Mogelijk is de buildbreuk beperkt van omvang. Dat staat niet vast: er zijn drie TS-fouten en de rode B-rep-job op CI heeft een onbekende oorzaak. Of de kwaliteit daarna gelijk is aan die van 02e3b22 plus de fixes, blijkt pas uit een volledige groene rerun op dezelfde SHA met aantoonbaar juiste coverage.

  Ik raad geen blinde `@ts-expect-error` aan. De richting die ik voorstel: app-build en tests scheiden, met een aparte testtypecheck. Zo blijven de testfouten zichtbaar zonder dat ze de appbuild blokkeren.

  De tegenlezing: zo'n breuk had de release nooit mogen bereiken. Dat wijst op een releaseproces zonder poort.
- **Kans / alternatief ontwikkelpad.** In plaats van verdere feature-breedte richting SolidWorks (veel rijen "deels", rendement per rij laag) zou ik de positie "betrouwbare, eerlijke niche-CAD" kiezen. Concreet:
  1. Releasepoort plus signing.
  2. Een onafhankelijke randselectie voor de kruiscontrole.
  3. Exacte fillets uitbreiden (face/full round).

  Afruil: de pariteitsgroei per iteratie is waarschijnlijk lager, maar betrouwbaarheid en verspreidbaarheid nemen toe. IGES via een andere OCCT-WASM-build is een tweede kans met een duidelijke afruil: grotere bundel, terwijl de marge al maar 17 kB is. Daarom eerst code-splitting.
- **Onzekerheden.** Alle runtime-cijfers zijn aangeleverd. Mijn statische lezing kan niet uitsluiten dat er meer fouten verschijnen zodra de typecheck verder komt.

## 6. Concrete acceptatiecriteria voor vervolgwerk

1. **Build/CI (P0).**
   - `npm ci && npm run typecheck && npm run build` geven exit 0 vanuit een schone git-kloon van de release-SHA.
   - App-build en tests zijn gescheiden: tests en fixtures staan buiten `tsconfig.app.json`, met een aparte testtypecheck die in CI verplicht draait.
   - Geen blinde `@ts-expect-error` als oplossing.
   - De oorzaak van de rode B-rep-job is vastgesteld.
   - De Actions-run op exact die SHA is groen voor alle jobs (checks, desktop, windows-installer, regression mesh/brep).
   - Run-ID en SHA staan in de release notes.
2. **Packaged.** Desktop-installed self-test op de release-SHA geeft `packaged: true`, `app://` en alle checks groen. Ruwe stdout is als artefact bewaard (geen samenvatting van één regel).
3. **Signing (voor vertrouwde, brede distributie).** `sign-report` toont `Valid` voor setup, portable en exe. Kies je voor ongesigneerde experimentele distributie, dan staat de waarschuwing "niet gesigneerd" zichtbaar in de release notes en op de downloadpagina.
4. **Kruiscontrole.**
   - Een onafhankelijke randselectie (bijvoorbeeld topologisch op B-rep, geometrisch op mesh) met een mutatietest: "beide kernels krijgen dezelfde verkeerde rand" moet een waarschuwing geven.
   - `volumeCheck.test.ts:10` wordt omgezet naar een verwachte waarschuwing of een gedocumenteerde, lagere grens.
   - De vormsteekproef vangt een gemiste R2-fillet op een lichaam met >80 000 vertices.
5. **Fillet-dekking.** Face fillet, full round en setback op B-rep binnen 0,001 mm³ van een analytische referentie, of `exact: false` met zichtbare waarschuwing. Elk geval heeft een eigen test.
6. **Pariteitsupdate.**
   - Herteld met dezelfde 62 rijen en noemer.
   - Een rij gaat pas naar "aanwezig" met een gedragsscript plus een SolidWorks-referentiewaarde of -gedrag.
   - Rij 62 pas na criterium 1.
   - Rij 44 pas met Excel (.xlsx) round-trip.
   - Rij 51 houdt de volledige scope IGES/DXF/DWG/Parasolid. IGES alleen maakt de rij niet "aanwezig".
   - Rij 27 en andere rijen met concrete scope worden alleen voor die scope beoordeeld; een volledige SolidWorks-gedragsreferentie is nodig voordat je van gelijkheid spreekt.
7. **Bewijsketen.** Ruwe logs met SHA in de kop staan in de repo of als artefact. Alle in de README genoemde mappen bestaan. De README-tellingen worden automatisch uit vitest-JSON gegenereerd.
8. **Onafhankelijke geometriecontrole.** Kritische maten en vorm worden gecontroleerd tegen een onafhankelijke referentie, buiten de gedeelde `matchEdges`-route.
9. **Determinisme.** `E2E_REPEAT=10` voor features/multibody op mesh en B-rep zonder flakes.
10. **Sketch Text.** De afwijking van de contour ten opzichte van de letterkromme en de volumeafwijking van een tekst-extrusie zijn gemeten. Het label onderscheidt "curvebenadering" (contour) van "exacte B-rep-solid". Polylijnoutput krijgt niet automatisch `exact: false`; wel komt er een melding als de contourafwijking boven een gedocumenteerde grens ligt.
