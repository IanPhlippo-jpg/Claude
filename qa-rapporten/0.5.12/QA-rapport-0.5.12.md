# Definitief QA-rapport Phlippo CAD 0.5.12
## Strikte beoordeling tegen SolidWorks — technische QA en vier blinde reviews

8 november 2026 — Europe/Brussels (UTC+1). Documentbeoordeling door de rechter; geen nieuwe codeanalyse of testruns bij deze synthese. Alleen Ian deelt dit verslag met Claude.

## 1. Eindbesluit

**5/10 — strikte pariteitsindex 72,6% — NO-GO voor algemene vrijgave, productiegebruik zonder onafhankelijke modelcontrole of de claim “100% SolidWorks-vervanger”.**

Er is echte vooruitgang in de geometrie: de specifieke ellips-/spline- en gesplitste-filletfouten uit 0.5.11 zijn volgens de technische QA hersteld. Dat is geen bewijs dat alle geometrie exact is. De officiële build stopt op drie TypeScript-fouten en de CI op de beoordeelde SHA is rood. De releaseketen is daarom nog niet betrouwbaar leverbaar. Een losse geslaagde Vite-build is geen herstel van de officiële bouwprocedure.

**51 niet-afgesloten bevindingrecords: 1 Kritiek, 30 Major, 20 Minor.** Daarvan zijn 38 gedeeltelijk opgelost en 13 open. In totaal bevat de JSON 66 records, inclusief 15 opgelost. Dit is een traceerbare registertelling, niet 51 onafhankelijke hoofdoorzaken of 51 nieuw gereproduceerde productdefecten. Historische visuele en desktopbevindingen zonder actuele hertest blijven als onzeker/open geregistreerd, niet als nieuw bewezen fout. Overlappende release-/bewijsproblemen moeten als werkclusters worden aangepakt.

De score is een gemotiveerd engineeringoordeel, geen testpasspercentage of pariteitspercentage gedeeld door tien. Twee blinde beoordelingen kozen 5, één 5,5 en één 6. Hun gedeelde vrijgavebezwaar is door de technische bewijsstukken bevestigd. Bij gelijkwaardig bewijs geldt de strengste lezing: daarom 5/10. De verbeteringen worden zichtbaar in de hogere pariteitsindex en het kleinere open register, maar rechtvaardigen nog geen hogere totale vrijgavekwaliteit.

## 2. Versie, scope en bewijsgrenzen

- Versie **0.5.12**, SHA **e0c728385e7b2c62406ba21f83430af159077ed8**.
- Boxbron: `/workspace/phlippo-cad/src-0.5.12/`; snapshot `src-0.5.12.zip` in de bovenliggende map. Archief zonder .git, voorbeelden en qa-logs: archiefconsistentie is niet hetzelfde als onafhankelijk bewijs van de volledige Git-tree.
- Technisch bronrapport: `QA-rapport-0.5.12-technisch.md`; detailregister: `findings-0.5.12.json`.
- Vier anonieme rapporten: `team-blind/Rapport-Alpha.md` t/m `Rapport-Delta.md` in de levering; op de box onder `team/blind/`.
- Definitieve baseline: 0.5.11, 5/10 en 70,2%, 63 open (3 Kritiek, 37 Major, 23 Minor). De oude voorlopige 6/10 en 75% zijn niet gebruikt.
- Technische QA meldt Node 22.23.4. Sommige teamleden rapporteren aanvullend onderzoek op Node 24 in tijdelijke kopieën. Dat aanvullende onderzoek is in deze documentronde niet uitgevoerd of onafhankelijk herhaald.
- Geen actuele volledige side-by-side met een vastgelegde SolidWorks-versie, volledige actuele Windows-installatiebeoordeling of algemene fabricagevalidatie. Daarom geen claim van werkelijke volledige productequivalentie.

## 3. Gecontroleerde technische resultaten

Onderstaande uitkomsten zijn gecontroleerd op consistentie tussen het technische rapport en de detail-JSON; de rechter heeft ze niet opnieuw gedraaid.

| Controle | Vastgelegd resultaat | Betekenis/grens |
|---|---|---|
| npm ci | exit 0, 463 packages | Installatie op technische QA-omgeving |
| Officiële typecheck | exit 2 | TS6133, TS7016/TS2307 en TS2345 in tekeningenAfzuiging.test.ts |
| Officiële npm run build | exit 2 | Geen geslaagde officiële productiebuild |
| Kale snapshot unitrun | 724 groen, 10 rood, 1 skip | Ontbrekende voorbeelden verklaren de 10 fouten; niet als ontbrekende productfuncties tellen |
| Unitrun met fixtures van dezelfde SHA | 815 groen, 2 skips | Technische QA herstelde voorbeelden; niet automatisch reproduceerbaar met gereduceerde zip |
| Losse Vite-build | exit 0; hoofdchunk 782,72/800 kB | Slechts 17,28 kB marge; omzeilt officiële typecheck, geen volledige downloadomvang |
| Testhook-build | exit 0 | Geen bewijs voor actuele packaged desktop |
| Mesh-regressie | 104/104, geen skips | Gerichte scripts; geen universele CAD-correctheid |
| B-rep-regressie | 14/14, geen skips | Lokaal technisch resultaat, geen verklaring voor rode CI-shards |
| Mutaties | 4/4 gevangen | Geen volledige foutdetectiedekking |
| Huidige CI | run 42502050109 op e0c7283: failure | Vorige groene run 41862412746 op 02e3b22 telt niet voor huidige SHA |
| Dependencyaudit | 6 moderate ontwikkelketen; productie 0 | Geen bewijs van zes productie-exploits of afwezigheid van onbekende kwetsbaarheden |

### Geometrische vooruitgang

- **F175 opgelost binnen de geteste scope:** ellips 40×20×10 binnen 0,001 mm³ van 6.283,185307 mm³; STEP bevat analytische ellips-/spline-entiteiten. Wrap heeft exact=false en facetwaarschuwing in de onderzochte rebuildscope.
- **F177 opgelost binnen de geteste scope:** gesleufde plaat na wijziging 80→100 mm binnen 0,001 mm³ van 38.422,743339 mm³ op B-rep; mesh binnen 1,5 mm³. De oude stille afwijking van 47,212 mm³ wordt niet als actuele fout herhaald.
- **F176 niet opgelost:** huidige release-SHA heeft geen groene CI.
- Gedeelde matchEdges, ruime volumegrens en bemonsterde vormcontrole blijven beperkingen (F172/F179/F198/F202). Gelijke resultaten van twee kernels zijn geen onafhankelijk correctheidsbewijs.
- Beperkte fillet-/sweep-/loftscope, ontbrekende IGES/DWG/Parasolid en CSV in plaats van volledige Excel-integratie verhinderen de claim van volledige SolidWorks-pariteit. DXF/PDF voor tekeningen bestaan wel.

## 4. Strikte pariteit: 72,6%, niet 73,4%

De historische rubricering blijft exact **62 rijen**, aanwezig=1, deels=0,5, ontbreekt=0. Geen cosmetische noemerwijziging.

| | Aanwezig | Deels | Ontbreekt | Punten | Index |
|---|---:|---:|---:|---:|---:|
| 0.5.11 definitief | 30 | 27 | 5 | 43,5/62 | 70,2% |
| 0.5.12 definitief | 31 | 28 | 3 | 45/62 | **72,6%** |

Geaccepteerde promoties: rij 7 Instant2D/magnifier ontbreekt→deels; rij 27 undo/redo 200 stappen deels→aanwezig voor die beperkte rijscope; rij 44 ontwerptabellen ontbreekt→deels. Deze hebben concrete technische testonderbouwing. Het zijn geen bewijzen van volledige Instant3D-, undo- of Excel-equivalentie.

**Rij 49 STEP blijft deels.** Het technische rapport promoveerde die rij op basis van de gerepareerde ellips-/spline-entiteiten en roundtrip. Dat is sterk bewijs voor die gevallen, maar niet voor volledige uitwisselingsscope: wrap blijft een facet-patch en exacte featuredekking is niet universeel. Alle vier blinde beoordelingen behouden de gedeeltelijke baselineclassificatie. De strengste onderbouwde lezing wint; de halve punt promotie wordt niet toegekend. Hiervoor is de nieuwe exportbugclaim uit Alpha niet nodig en die wordt niet als bewezen gebruikt.

Rijen 51 (samengestelde formaten), 60 (signing) en 62 (groene huidige CI) blijven ontbreekt. Overige historische waarderingen zijn overgenomen, niet integraal opnieuw gemeten. **72,6% is een inventarisindex binnen deze 62 rijen, niet 72,6% van alle SolidWorks-functionaliteit of een kans op foutvrije modellen.** Stijging: 2,4 procentpunt tegenover de afgeronde baseline.

## 5. Blind oordeel en verdictmatrix

Rapporten zijn geanonimiseerd en willekeurig Alpha/Beta/Gamma/Delta genoemd; geen koppeltabel bewaard. Scores hieronder betreffen de kwaliteit van de documentbijdrage (0–10), niet de app. “Blinde vlekken” beoordeelt hoe goed de bijdrage onzekerheid zichtbaar maakt: hoger is beter. Sterkste verifieerbare bewijs wint, geen meerderheid van onbewezen claims. Teamleden hebben soms buiten de neutrale casus aanvullend code-/testonderzoek beschreven; dat is niet automatisch geaccepteerd bewijs in deze documentronde.

| Rapport | Eigen appscore/index | Geldigheid | Bruikbaarheid | Blinde vlekken expliciet | Oordeel van de rechter |
|---|---|---:|---:|---:|---|
| Alpha | 5,5 / 72,6% | 7 | 9 | 9 | Sterke concrete risicoscenario’s en acceptatiecriteria. Nieuwe wrap-export-, rebuild-export- en dak-tegenvoorbeelden staan niet in de toegestane technische bewijsset: onbewezen voor dit eindbesluit, niet meetellen als nieuwe defecten. |
| Beta | 6 / 72,6% | 9 | 9 | 9 | Zorgvuldige scheiding bron, aangeleverd resultaat en onbekend; nuttig onderscheid tussen compilerrood en onverklaarde regressie-CI. Appscore 6 niet gevolgd wegens strengste vrijgavelezing. |
| Gamma | 5 / 72,6% | 8 | 9 | 9 | Heldere registertelling, geen samengevoegde timeout-hertest als groene volledige suite; sterke waarschuwing over betrouwbaarheid. Nieuwe numerieke tekstmetingen, opties-hertelling en 120-mm-variant niet uit technische bewijsset verifieerbaar. |
| Delta | 5 / 72,6% | 8 | 8 | 8 | Consistente conservatieve matrix en releasepoort. Schatting “tot 80.000 punten” niet als bewezen harde cap overgenomen; voorstel app/testscheiding is een mogelijke oplossing, geen verplichte codearchitectuur. |

### Geaccepteerde teamcorrecties
1. Pariteit terug van technische 73,4% naar **72,6%**; rij 49 blijft deels.
2. Eindscore terug van technisch 6 naar **5/10**; daadwerkelijke geometrische verbetering erkennen, geen hogere vrijgavekwaliteit zolang officiële build/CI falen.
3. **51 records niet gelijk aan 51 onafhankelijke fouten.** Release-, signing- en bewijsgaten clusteren; historische niet-herbeoordeelde UI-fouten niet als nieuwe meting presenteren.
4. Ontbrekende fixtures in het compacte archief niet als ontbrekende CAD-productfunctionaliteit aanmerken.
5. Rode B-rep-/Windows-regressiejobs niet zonder ruwe logs aan de TypeScript-fout toeschrijven. Signing is een vertrouwens-/pariteitscriterium, geen algemene wettelijke verplichting.

### Niet aanvaard als bewezen nieuwe bevinding
- Alpha’s exacte dakafstand, export van een fout model en misleidende wrap-exportteller: gedetailleerd gerapporteerd, maar niet bevestigd in technisch rapport/JSON. Bewaar als vervolgonderzoek, zonder nieuwe F-ID of ernsttelling.
- Nieuwe teamvolumes voor Sketch Text, aanvullende 120-mm-fillet en precieze 147/345 wiringdoorsnede: niet bevestigd in de toegestane technische bewijsstukken. Het bestaande F201 over polylijntekst blijft wel geldig.
- Teamrun-aantallen op Node 24 worden niet bij de technische Node 22-unitcijfers opgeteld. Timeouts die later groen zijn, bewijzen geen deterministische productfout én geen nieuwe volledig groene suite.
- Geen algemene claim dat CAD-uitvoer veilig of onveilig is voor elk gebruik; geen nieuwe juridische of visuele fout geconcludeerd zonder referentieonderzoek.

## 6. Vergelijking met 0.5.11

| Aspect | 0.5.11 definitief | 0.5.12 definitief |
|---|---|---|
| Eindscore | 5/10 | **5/10** |
| Index | 70,2% | **72,6% (+2,4 procentpunt)** |
| Open register | 63: 3 Kritiek, 37 Major, 23 Minor | **51: 1 Kritiek, 30 Major, 20 Minor** |
| Oude 63 bevindingen | uitgangspunt | 15 opgelost, 38 gedeeltelijk, 10 open |
| Nieuwe records | — | F200 Major, F201 Minor, F202 Minor; alle open |
| Concrete stille ellips-/filletfouten | aanwezig | Geteste regressies hersteld |
| Vrijgave | NO-GO | **NO-GO**; officiële build en huidige CI blokkeren |

Netto 12 minder niet-afgesloten records (15 dicht, 3 nieuw). Het opheffen van twee kritieke geometrische regressies is echte winst, maar de resterende kritieke CI-poort en actuele bouwblokkade verhinderen een vrijgavebelofte.

## 7. Top 10 acties voor Claude — alleen Ian deelt dit verslag

1. **Herstel de officiële bouwroute en typecheck.** Los de drie compilerfouten op; schone Node 22-installatie, typecheck, unitrun en npm run build alle exit 0 op dezelfde nieuwe kandidaat-SHA. Geen globale suppressie, testuitsluiting zonder vervangende verplichte testtypecheck of versoepelde toleranties als “oplossing”.
2. **Maak de volledige CI groen op exact die SHA.** Onderzoek ook rode B-rep-/Windows-regressies afzonderlijk met ruwe logs. Linux/Windows, desktop, installer en verplichte regressies allemaal groen; geen oude groene SHA als vrijgavebewijs.
3. **Lever een complete reproduceerbare bewijsketen.** Bron-/fixturemanifest, hashes, Node/npm-versies, commando’s, volledige stdout/stderr, exitcodes en skipredenen. Ontbrekende voorbeelden/qa-logs expliciet scheiden van productgebreken; actuele installer/app://-selftests en herstelproeven bewaren.
4. **Maak geometrische validatie onafhankelijk en foutgestuurd.** Behoud analytische ellips-/filletasserts; voeg maatvarianten, ambigue randen, kleine lokale afwijkingen en gedeelde verkeerde randselectie toe. Definieer lokale vormtoleranties; bemonsterde overeenstemming niet als correctheidscertificaat presenteren.
5. **Bewijs exactheid door de hele exportketen.** Per body exact/benaderd zichtbaar houden, STEP onafhankelijk teruglezen, tekst/wrap/assemblies toetsen. Reproduceer Alpha’s nog onbewezen wrap-export- en rebuildfout-exportscenario’s; pas bij bevestiging als nieuwe defecten registreren. Rij 49 pas verhogen na volledige relevante scope.
6. **Werk exacte featuregaten af of begrens ze eerlijk.** Face/full-round/setback, sweep/loft met guides en overige terugvalpaden hebben eigen onafhankelijke orakels nodig. Benadering en niet-ondersteund gedrag zichtbaar aangeven.
7. **Toets migratie en workflowpariteit naast een vastgelegde SolidWorks-versie.** IGES/DWG/Parasolid alleen claimen bij echte roundtrips; CSV expliciet als CSV benoemen. XLSX/formules/koppeling en geavanceerde selectie-/maatinteractie vóór volledige promotie bewijzen.
8. **Verifieer actuele desktop, herstel en distributievertrouwen.** Installer en portable van dezelfde SHA, packaged app://, save/recover/.bak, fuses en signatuur controleren. Zolang ongesigneerd: expliciet beperkte interne proefstatus, geen vertrouwde algemene release suggereren. Alleen gratis hulpmiddelen; geen aankoopautorisatie.
9. **Kwantificeer tekstprecisie, opties en performance.** Sketch Text-tolerantie per hoogte/font vastleggen; opties op werkelijk effect testen; viewpanes-dekking aanvullen; cold start, totale assets, p95/max rebuild en UI-blokkering meten. 800-kB-hoofdchunk en 45-s-budget zijn geen volledige performancebewijzen.
10. **Maak regressie en documentatie eerlijk herhaalbaar.** Kritieke mesh/B-rep/UI-paden herhalen met vastgelegde omgeving; timeouts niet stil groen maken. README-tellingen uit bewijs genereren. Tien foutloze herhalingen zijn een rooktest, geen statistisch bewijs van 99% betrouwbaarheid. Werk daarna dezelfde 62 rijen opnieuw bij.

## 8. Gebruiksgrens en vrijgavevoorwaarden

Conceptmodellering en gecontroleerd experimenteel intern werk kunnen nuttig zijn, maar geen algemene goedkeuring van het huidige releaseartefact. Eerst een reproduceerbaar bouwbare kandidaat; daarna per model onafhankelijke maat-, vorm- en exportcontrole. Geen ongecontroleerde fabricageketen, veiligheidskritische toepassing of “100% vervanger”-claim op basis van deze review. Een nieuwe score vereist groen bewijs op de nieuwe kandidaat, niet alleen een verklaring dat de fouten zijn opgelost.

## 9. Volledig bevindingenregister

Onderstaande statussen/ernsten volgen de technische JSON ongewijzigd. “fixed” sluit alleen het beschreven defect binnen de aangetoonde scope; “partial” telt mee als niet afgesloten. Geen nieuwe teamhypothesen aan het register toegevoegd.

### F16 — Major — open — Iconen en lettertype

Gebied: Visueel. Niet opnieuw naast SolidWorks gelegd. De repo zegt bewust functioneel, niet pixelgelijk (docs/29). Geen screenshot-oordeel in deze ronde.

### F21 — Minor — open — Taakvenster-iconen

Gebied: Visueel. Niet visueel herbeoordeeld.

### F22 — Minor — open — Body-randen

Gebied: Visueel. Niet visueel herbeoordeeld.

### F24 — Minor — open — Extra rij in Modify

Gebied: Visueel. Niet in de UI heropend. De Modify-dialoog heeft nog een eenhedenrij (dialogs.tsx, .k-modify-units).

### F28 — Minor — open — Bestandsdialoog bij Insert Component

Gebied: UX. Niet in Electron gedraaid.

### F31 — Major — partial — e2e-exitcodes / CI

Gebied: Proces. run-regression.mjs eindigt met exit 1 bij rood en een DONE-regel. Lokaal mesh 104/104 exit 0 en brep 14/14 exit 0. Actions op e0c7283 (run 42502050109) is conclusion failure.

### F38 — Minor — partial — README/TASKS

Gebied: Docs. De zes qa*.test.ts-tellingen in de README kloppen (vitest JSON: 8, 34, 12, 12, 5, 1). De kop 'unit 736/736' klopt niet: met voorbeelden 815 geslaagd en 2 overgeslagen. Fase 3 noemt ontwerptabellen nog 'gepland' en fase 8 Hem nog 'gepland', terwijl die paden groen zijn.

### F46 — Major — partial — CSG/solver op de UI-thread

Gebied: Performance. Releasepad gebruikt de worker (CI-jobs release-* op deze SHA groen; lokaal niet de volledige release-pass). rebuildBudgetMs staat nog op 45000 (rebuild.ts). De mesh-browserbuild rekent op de UI-thread.

### F47 — Major — partial — Topologische naamgeving

Gebied: Geometrie. qaNaming.test.ts 12/12 groen (T4–T7). Geen bewijs dat elke SolidWorks-randnaam overleeft.

### F48 — Major — partial — CSG ongecontroleerd

Gebied: Geometrie. volumeCheck.ts heeft volume (0,5 %) én vorm (0,1 mm). qaCrossCheck 12/12 groen. De volumegrens en gedeelde randkeuze blijven (F172, F179).

### F49 — Major — open — Release-hardening / niet gesigneerd

Gebied: Electron. signature-0.5.12.txt (commit 02e3b22 én lokale installer fb63804): NotSigned voor setup, portable en exe. Op e0c7283 faalt de installer-job vóór een nieuwe meting.

### F51 — Major — partial — Mesh-kernel

Gebied: Geometrie. Ellips/spline/conic exact (qaBrep). Plastics-blok in qaBrep groen. Face fillet, full round en setback vallen buiten brepRoundable (rebuild.ts:855-859). Guide curves: brepTool geeft null (rebuild.ts:870, 884).

### F54 — Major — open — CI rood op de release-commit

Gebied: Proces. Run 42502050109 op e0c7283: conclusion failure. Rood: checks, desktop, windows-installer, regression (brep), regression (win-mesh-3of3). Linux-mesh en de meeste release-shards zijn groen.

### F93 — Major — partial — Claims 98/98 zonder bewijs

Gebied: Bewijs. De 104/104-logs van 02e3b22 zijn nagelezen (DONE-regels, commit 02e3b22) en de run is via de API success met 16 jobs. Ze horen niet bij e0c7283. qa-logs/README noemt checks/ en desktop/ die niet in de tree staan.

### F97 — Major — partial — Packaged app:// niet getest

Gebied: Electron. Op 02e3b22: desktop-installed 21/21, packaged true, app://phlippo/index.html. Op e0c7283 faalt windows-installer op npm run build (typecheck).

### F98 — Major — partial — Geen remote CI

Gebied: Proces. Er zijn publieke runs. De laatste op deze SHA is rood (42502050109). Het gat 'nooit een remote run' is dicht; groen op HEAD niet.

### F105 — Major — partial — B-rep bijna nooit in regressie

Gebied: Tests. ci.yml noemt 14 brep-scripts. Lokaal die 14: 14/14 exit 0. De Actions-job regression (brep) op e0c7283 is toch rood; de annotations noemen geen script en het log-artefact is 401.

### F111 — Major — fixed — Gesplitste fillet maar één stuk

Gebied: Topologie. qaTeam: plaat 100×40×10 met sleuf, verwacht 38422,743, B-rep < 1e-3 en mesh < 1,5 mm³, geen warnings. Zelfde file 5/5 groen in de suite 815.

### F112 — Major — partial — Options doen niets

Gebied: UI. prefsWired.ts: 148 sleutels. prefsSchema: 345 unieke keys, 198 niet bedraad (grijs volgens het commentaar). Was 45 van 379.

### F114 — Major — partial — Geen IGES/DWG/Parasolid

Gebied: Import/Export. DXF en PDF van tekeningen bestaan (sheetExport.ts). IGES/DWG/Parasolid niet. Options toont geen IGES meer.

### F117 — Major — open — Installer niet code-signed

Gebied: Installer. Zelfde NotSigned-rapport als F49. Geen certificaat in deze boom.

### F121 — Major — partial — Ontbrekende SolidWorks-features

Gebied: Features. Plastics exact in qaBrep (file groen). Design tables, Instant2D, normdelen en drag handles hebben groene e2e. Geen volledige SolidWorks-dekking (Toolbox, guide curves, virtual sharp).

### F122 — Major — partial — Centermarks en verborgen lijnen

Gebied: Tekeningen. drawing 28/28 en drawingfix 16/16 lokaal groen. Geen aparte assert dat elk standaardaanzicht centermarks en verborgen lijnen zet zoals SolidWorks.

### F124 — Minor — partial — Gaten uit docs/24

Gebied: Scope. instant2d 8/8, magnify 12/12, sketch3d2 14/14 lokaal groen. sketch.virtualSharps en doc.virtualSharp staan niet in WIRED_PREFS: de optie blijft grijs.

### F126 — Major — partial — Windows-log geplakt

Gebied: Bewijs. De 0.5.12-logs hebben een kop met commit en platform en noemen scripts die in 0.5.9 niet bestonden (designtable, instant2d). Het blijven samenvattingen van één regel per script, en ze zijn van 02e3b22.

### F129 — Minor — partial — Verouderde docs en tellingen

Gebied: Docs. Zelfde als F38: qa-tellingen kloppen, de totaalzin 736 en de fasekoppen niet. TASKS heeft [x] voor afzuiging; die bestanden zitten wel op de SHA, niet in de aangeleverde zip.

### F130 — Major — partial — Breedte boven correctheid

Gebied: Proces. Mate-, naming- en mutatie-tests zijn groen. Daarna is de boom weer rood: tekeningenAfzuiging.test.ts haalt typecheck onderuit.

### F134 — Minor — partial — Line-budget is de huidige grootte

Gebied: Code. line-budget.cjs exit 0. rebuild.ts 2273 regels, cap 2280 (was 3390). Het doel van 1000 blijft een tekst; de cap is nog een bevriezing.

### F137 — Major — partial — Rebuild-budget 45 s

Gebied: Performance. rebuildBudgetMs = 45_000 (rebuild.ts:848). Workerpad bestaat. De 117 ms framepauze is niet zelf gemeten.

### F138 — Minor — partial — npm audit

Gebied: Build. npm audit exit 1: 6 moderate, 0 high, 0 critical, alle via minimatch in de electron-builder-keten. npm audit --omit=dev: 0. Was 15 moderate en 2 high.

### F145 — Minor — partial — features niet-deterministisch

Gebied: Testen. Eén lokale run: features exit 0, 65/65, 201 s (mesh) en 385 s (brep). Geen herhaling (E2E_REPEAT=1).

### F147 — Major — fixed — CI-stappen verbergen B-rep

Gebied: Testen. ci.yml: aparte jobs checks, desktop, regression-matrix, windows-installer. Op run 42502050109 faalde brep terwijl mesh-shards groen bleven: de verberging is weg.

### F148 — Major — partial — Windows-log is een kopie

Gebied: Bewijs. De 0.5.12-logs zijn geen byte-kopie van het 0.5.9-log (andere scripts en commit 02e3b22). Ruwe volledige runner-stdout zit er niet bij.

### F149 — Major — partial — Claims zonder platform of log

Gebied: Bewijs. README 0.5.12 noemt platform, commit 02e3b22 en run-URL. qa-logs/0.5.12/README belooft mappen checks/ en desktop/ die niet in de git-tree staan (21 bestanden, alleen regressie en installer).

### F151 — Minor — partial — Self-test ongepackaged

Gebied: Testen. Log 02e3b22: packaged true. Deze SHA bouwt de installer niet (typecheck). Lokaal geen packaged self-test gedraaid.

### F159 — Major — fixed — Geen volumekruiscontrole

Gebied: Kernel. volumeMismatch en shapeMismatch worden gebruikt; qaCrossCheck 12/12 en mutatie b (drempel ×10) wordt gevangen.

### F161 — Minor — partial — Shading-naad en STEP-import als mesh

Gebied: Weergave. Niet visueel bekeken. Self-test op 02e3b22 schrijft STEP met exact 1. Geen nieuwe meting van de naad.

### F171 — Minor — fixed — Options toont IGES zonder exporter

Gebied: UI. prefs.test.ts verwacht dat export.format geen IGES bevat. Schema: STL, 3MF, AMF, STEP, DXF, PDF. 3MF/AMF in export3d.ts; DXF/PDF in sheetExport.ts.

### F172 — Major — partial — Volumegrens 0,5 % te ruim

Gebied: Kernel. VOLUME_MISMATCH is nog 0,005 (volumeCheck.ts:18). SHAPE_MISMATCH_MM = 0,1 vangt een gemiste fillet R2 (0,83 mm) als er een vertex in de buurt ligt. volumeCheck.test.ts:9 verwacht nog steeds géén volumewaarschuwing voor 8,58 mm³.

### F173 — Minor — fixed — QA-toleranties te ruim

Gebied: Testen. qaStrict: verlies binnen 2 % van de formule (regels 24-28) en de suite is groen.

### F174 — Minor — partial — Bundel bijna op

Gebied: Performance. vite build: index-ByIVbH-0.js 782,72 kB, budget 800, marge 17,28 kB (check:bundle exit 0). npm run build zelf faalt vóór de bundel.

### F175 — Kritiek — fixed — Facet onder het label exact

Gebied: Kernel. qaBrep: ellips 40×20×10 binnen 1e-3 van π·20·10·10; STEP minstens 2 ELLIPSE, 3 EDGE_CURVE; spline minstens 2 B_SPLINE_CURVE_WITH_KNOTS. Wrap: exact false en waarschuwing 'flat facets'. File 34/34 groen.

### F176 — Kritiek — open — Geen groene CI op de release-commit

Gebied: Testen. Run 41862412746 op 02e3b22 is success (16/16). Run 42502050109 op de geaudite SHA e0c7283 is failure. Een groene run op een eerdere commit telt niet voor deze HEAD.

### F177 — Kritiek — fixed — Fillet na maatwijziging stil één stuk

Gebied: Topologie. Zelfde test als F111. Formule 100·40·10 − 10·15·10 − 90·CORNER(2) = 38422,743. Geen fout en geen waarschuwing, volume binnen 1e-3 (B-rep).

### F178 — Major — fixed — Gebogen rand 32 segmenten, fillet 10× fout

Gebied: Kernel. qaTeam: één ketting van 70+5π+30 mm, filletverlies binnen 1e-4 (B-rep) en 2 % (mesh) van 100·CORNER(2)+Pappus.

### F179 — Major — partial — Kruiscontrole structureel blind

Gebied: Kernel. matchEdges is nog gedeeld (rebuild roept dezelfde functie voor beide kernels). Twee gelijke foute resultaten geven shapeDeviation 0. Ambiguïteit geeft nu null in plaats van een gok (edgesets.ts:317, 400).

### F180 — Major — partial — Herkomst QA niet sluitend

Gebied: QA. e2e/lib/commit.txt is e0c7283. Zonder bovenliggende .git zegt de logkop 'e0c7283 (git archive)'. De zip miste qa-logs en voorbeelden die wel op die SHA staan.

### F183 — Minor — fixed — CI-brep mist 2 scripts

Gebied: Testen. ci.yml brep-scripts: features features2 filletopts endconditions multibody full doorhandle step bodies qa2 facenames plastics loftface pmsweep = 14.

### F184 — Major — partial — Geen mutatie, herhaling of compat

Gebied: Testen. mutation-check.cjs: 4/4 gevangen, tree unchanged, exit 0. compat0510.test.ts 7/7 groen. E2E_REPEAT niet op 10 gedraaid.

### F185 — Major — fixed — QA-tests zonder asserts

Gebied: QA. qaTeam 8 expects, qaBrep 57, qaStrict 18, qaCrossCheck 34, qaNaming 14. De bestanden zijn groen, met echte expect().

### F186 — Minor — partial — unconverged via tweede solve van 128

Gebied: Assembly. MATE_TOLERANCE = 1e-3 en SETTLE_PASSES = 128 (mateStatus.ts:114-115). Er is een test op de grens. Het blijft een tweede solve, geen status uit de echte pass. CONFLICT_PASSES = 128 blijft.

### F188 — Minor — fixed — AutoRecover 0.5.10 niet getoond

Gebied: Robuustheid. recover.test.ts: adoptLegacyCopies van twee oude kopieën geeft 2, de tweede keer 0. In de groene suite.

### F189 — Major — partial — SW-documenten in de repo

Gebied: Juridisch. docs/06 en docs/26 zitten niet in deze zip en niet in de top van de publieke tree. Geen juridische toets. Materiaalnamen en de disclaimer blijven.

### F190 — Major — fixed — Geen Windows-job

Gebied: Testen. ci.yml heeft windows-installer en regression-windows. Op 02e3b22 groen. Op e0c7283 draait de job en faalt hij op de build, niet omdat hij ontbreekt.

### F191 — Minor — fixed — Extra views elke 1500 ms

Gebied: Performance. ViewPane.tsx:200-205: één draw bij wijziging plus twee eenmalige timeouts (400 en 1500 ms), geen setInterval.

### F192 — Major — partial — Extra views niet interactief

Gebied: UI. ViewPane heeft pointer-orbit, pan en zoom. viewpanes.mjs zit niet in de 104 regressiescripts en niet in ci.yml. De claim 45/45 is niet in de nagelezen logs.

### F193 — Minor — partial — Units onleesbaar, material-tabs

Gebied: UI. app.css:639 opacity 0 op de select; zichtbaar blijven het woord Units en een '>'. De gekozen eenheid staat niet in de tekst. Material-tabs: overflow-x auto (regel 469).

### F194 — Minor — partial — Productnaam in drie vormen

Gebied: UI. Vensters en menu's zeggen 'Phlippo CAD'. Paden blijven PhlippoCAD (prefs.ts, installerlog).

### F195 — Major — fixed — Multibody rood, features op de timeout

Gebied: Testen. Lokaal multibody 14/14 (mesh 84 s, brep 85 s) en features 65/65 (201 s en 385 s), ver onder 900 s. Linux-mesh op deze SHA is groen volgens de API.

### F196 — Minor — partial — Fuses niet getest in de package

Gebied: Installer. Log 02e3b22 noemt de fuses ok. Op e0c7283 komt de installer niet voorbij de build, dus deze SHA is niet opnieuw gemeten.

### F197 — Major — fixed — Flens stil vervangen door mesh

Gebied: Kernel. flangeExact.test.ts groen, inclusief de test die bij 10 % afwijking de faceted waarschuwing eist en het mesh-resultaat houdt. sheetmetalFormulas 16/16 groen.

### F198 — Major — partial — Test legt blindheid vast

Gebied: Testen. volumeCheck.test.ts:9 verwacht nog null voor 30439,07 tegen 30431,33. Het commentaar wijst naar qaCrossCheck. De volumecontrole alleen is dus nog blind; de vormtest eist wel een melding.

### F199 — Minor — open — OCCT zonder IGES-writer

Gebied: Import/Export. Geen IGESControl in de gebruikte code. README en docs/29 zeggen dat de meegeleverde WASM-build geen IGES-klasse heeft. Niet opnieuw in de binary geteld; de bron bevestigt dat er geen writer wordt aangeroepen.

### F200 — Major — open — typecheck blokkeert de releasebuild

Gebied: Build. npm run typecheck en npm run build exit 2. Drie fouten in src/qa/tekeningenAfzuiging.test.ts: ongebruikte rebuildAssembly (TS6133), revisie.mjs zonder declaratie (TS7016), number[] niet assignable aan P (TS2345). Dezelfde drie staan in de annotations van checks, desktop en windows-installer op run 42502050109.

### F201 — Minor — open — Sketch Text is een grove polylijn

Gebied: Kernel. text.ts:46-48: generateShapes + getPoints(6) per contour en gat. De B-rep extrudeert die polylijn. SolidWorks houdt de letterkromme. Geen volumemeting in deze ronde.

### F202 — Minor — open — Vormcontrole bemonstert grote lichamen

Gebied: Kernel. volumeCheck.ts: farthest stapt met max(1, count/80000). shapeTolerance is max(0,1 mm, 0,02 % van de diagonaal). Een klein verschil zonder vertex in de steekproef blijft stil.

## 10. Levering en integriteit

Levering bevat dit eindrapport, ongewijzigde findings-0.5.12.json, vier blinde rapporten en SHA256SUMS.txt. SHA256SUMS.txt registreert de inhoudshash van ieder geleverd rapport/JSON; kopiecontrole op de laptop wordt apart vastgelegd in SHA256-verificatie.json. Geen bronwijzigingen of verwijderingen, geen verzending aan Claude. Het technische bronrapport blijft op de box beschikbaar; het eerdere voorlopige technische totaaloordeel is door dit eindbesluit vervangen.
