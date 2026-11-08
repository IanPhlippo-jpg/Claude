# Onafhankelijke beoordeling Phlippo CAD 0.5.12

## 1. Eigen conclusie

**Score: 5,5/10. Strikte pariteit volgens de bestaande 62-rijenrubriek: 72,6%. Vrijgaveadvies: niet vrijgeven als productieklare SolidWorks-vervanger.** Een afgeschermde proefversie voor niet-kritische modellen is verdedigbaar, met expliciete beperkingen en controle van de uitvoer in een onafhankelijk CAD-pakket. Geen vrijgave voor rechtstreeks fabriceren, veiligheidskritische maatvoering of ongecontroleerde migratie van bestaande SolidWorks-projecten.

De geometrische reparaties zijn substantieel en deels zelf bevestigd. Toch faalt de officiële build, is de huidige Windows-release niet bewezen en levert eigen tegenonderzoek nieuwe vals-negatieven en onjuiste exportkwalificatie op. Veel functies aanwezig hebben is niet hetzelfde als de juiste vorm, stabiele referenties, gelijkwaardig gedrag en betrouwbare productie-uitvoer garanderen. De kwaliteitsscore is een zelfstandig vrijgaveoordeel, geen omzetting van het pariteitspercentage.

### Berekening zonder scopewijziging

De definitieve baseline 0.5.11 (§5 van `report-0.5.11/QA-rapport-0.5.11.md`) bevat 30 aanwezig, 27 deels, 5 ontbreekt: `(30 + 27 × 0,5) / 62 = 70,1613%`. Voor deze beoordeling veranderen uitsluitend:

| Rij | Baseline → oordeel | Reden |
|---|---|---|
| 7 Instant2D / Magnified Selection | ontbreekt → deels | Werkende drag-dimensions en vergroting; eigen browserchecks bevestigen het beperkte pad. Het glas vergroot niet de pick-tolerantie en heeft geen vaste glaspositie; geen volledige gedragsvergelijking met SolidWorks. |
| 27 Undo/redo, 200 stappen | deels → aanwezig | Eigen `undo200`-run controleert 200 edits, undo, redo en het afvallen van de oudste stap; bron `history.ts` begrenst op 200. Dit is dekking van deze rij, niet van alle bewerkingssoorten. |
| 44 Design tables (Excel) | ontbreekt → deels | CSV import/export en configuraties zijn aantoonbaar aanwezig. Geen XLSX, spreadsheetobject, live koppeling of complete componentparameters: `docs/29-parts/design-tables.md:56–65`. |

Uitkomst: **31 aanwezig, 28 deels, 3 ontbreekt; `(31 + 28 × 0,5) / 62 = 72,5806%`**. De noemer blijft 62, inclusief signing en ontbrekende bestandsformaten. De groepen zijn volledig reproduceerbaar:
- Aanwezig: 1, 2, 4, 5, 8, 9, 12, 13, 14, 21–28, 32, 34–36, 38–40, 43, 45, 46, 48, 50, 57, 58.
- Deels: 3, 6, 7, 10, 11, 15–20, 29–31, 33, 37, 41, 42, 44, 47, 49, 52–56, 59, 61.
- Ontbreekt: 51, 60, 62.

Niet gewijzigde rijen behouden de definitieve baselineclassificatie; niet alle 62 rijen zijn opnieuw end-to-end gemeten. Dit is dus een conservatieve actualisatie van de afgesproken rubricering, **niet** een meting dat 72,6% van alle SolidWorks-functionaliteit volledig equivalent is. De rijen wegen ongelijk belangrijke en ongelijk brede functionaliteit toch even zwaar. Rij 49 blijft deels: analytische STEP-krommen zijn verbeterd, maar de exportkwalificatie van benaderde bodies is nog onbetrouwbaar. Rij 62 blijft ontbreekt: groen op een eerdere commit voldoet niet.

## 2. Sterke en zwakke punten, met bewijs

Bronverwijzingen naar `src/...`, `electron/...`, `e2e/...` en `docs/...` zijn relatief aan `/workspace/phlippo-cad/src-0.5.12/`. Eigen meetbestanden en tijdelijke testcode staan uitsluitend in `/tmp/cad-review-anoniem-nLNk3O/`.

### Sterke punten

1. **De specifieke ellips- en filletreparaties zijn geen louter tekstuele claims.** In de eigen ongewijzigde unitrun slagen `qaBrep` 34/34, `qaTeam` 5/5, `qaNaming` 12/12, `qaCrossCheck` 12/12, `qaStrict` 8/8 en `flangeExact` 5/5 (`unit-review.json`). De analytische referenties zijn zelfstandig herberekend: `π × 20 × 10 × 10 = 6283,185307 mm³`; voor de gesleufde plaat `100 × 40 × 10 − 10 × 15 × 10 − 90 × (4 − π) = 38422,743339 mm³`. De tests eisen respectievelijk <0,001 mm³ voor de exacte ellips en exacte fillet, en <1,5 mm³ voor de mesh-fillet (`src/qa/qaBrep.test.ts:178 e.v.; qaTeam.test.ts:47–68`). Ook STEP-entitychecks zitten in de geslaagde B-rep-tests. Dat bewijst de betreffende voorbeelden, niet alle ellips-, spline- en topologiegevallen.
2. **Er is daadwerkelijk een tweede geometriekernel en er zijn foutmeldingen.** OCCT wordt in eigen tests geladen; de volumevergelijking en bidirectionele vertexafstand bevatten echte berekeningen (`volumeCheck.ts`). Wrap is in het rebuildresultaat expliciet `exact:false` met een facettenwaarschuwing; die waarschuwing is eigenhandig gereproduceerd. Dat is wezenlijk beter dan elk polyhedraal B-rep-object exact noemen.
3. **Nieuwe workflowfuncties hebben uitvoerbare UI-checks.** Eigen browserruns bevestigen drag-dimensions, vergroting, undo en CSV-tabellen; details in §3. De tests laten geometriewaarden en undo-toestanden controleren, niet alleen knoppen bestaan. Ze gebruiken wel testhooks en een beperkte selectie modellen.
4. **De desktopbron bevat relevante hardening.** `electron/main.cjs` zet `contextIsolation:true`, `nodeIntegration:false`, `sandbox:true` en blokkeert navigatie; `package.json:75–83` configureert fuses. De eigen productieaudit meldt nul bekende kwetsbaarheden. Dit zijn bron-/dependencycontroles, geen dynamisch beveiligingsonderzoek van een installer. Een productieaudit met `--omit=dev` sluit bovendien pakketten zoals Electron uit die hier als ontwikkeldependency zijn gedeclareerd maar wel onderdeel van de desktopketen zijn.

### Zwakke punten

**A. Officiële releasebuild blijft geblokkeerd.** Zowel eigen `npm run typecheck` als `npm run build` geven de drie fouten in `src/qa/tekeningenAfzuiging.test.ts`: TS6133 op regel 18, TS2307 op regel 22 door de ontbrekende fixturemodule en TS2345 op regel 411. De eerste en derde fout verdwijnen niet door alleen voorbeelden toe te voegen. Een losse Vite-build slaagt, maar omzeilt de typecheck en is geen gerepareerde officiële build (`typecheck-review.log`, `build-review.log`, `vite-review.log`). De aangeleverde rode CI op huidige SHA is hiermee lokaal consistent, niet zelfstandig online geverifieerd.

**B. De vormcontrole mist ook kleine meshes zonder sampling.** Eigen tegenvoorbeeld: een gesloten blok met ondervlak z=−100 en bovenste hoeken `(0,0,0)`, `(10,0,0)`, `(10,10,1)`, `(0,10,0)`. Trianguleer het dak eenmaal via diagonaal 0–2 en eenmaal via 1–3; gebruik dezelfde zij- en bodemvlakken. Alle hoekpunten liggen op beide oppervlakken, maar de dakinterieurs verschillen. `shapeDeviation` rapporteert **0 mm**; `shapeMismatch` én `volumeMismatch` zijn **null**. Volumes zijn 10033,333333 en 10016,666667 mm³: verschil 16,666667 mm³, relatief 0,166113%, dus onder 0,5%. Het verticale hoogteverschil in het midden is 0,5 mm; een aparte point-to-surface-meting bevestigt een afstand van 0,495074 mm, ruim boven de ingestelde 0,1 mm. Dit is geen bewijs dat een bestaand productmodel dit specifieke defect heeft; het bewijst wel dat het controlesysteem een echte vormafwijking kan goedkeuren. Bron: `volumeCheck.ts:58–100`; reproductie: `src/qa/independentReview.test.ts`, `adversarial-results.jsonl` in de tijdelijke kopie. Meer vertexsamples lossen dit driehoekinterieurprobleem niet op.

**C. De STEP-export telt een expliciet benaderde wrap-body toch als exact.** In het eigen wrapmodel is `body.exact=false` en vermeldt de rebuildwaarschuwing vlakke facetten. Hetzelfde selecteer-/exportpad als `occt.worker.ts:59–65` geeft daarna `exportExact=1` voor één body. `shapesToStep` verhoogt de exacte teller zodra een `shape` aanwezig is (`src/core/occt/step.ts:129–150`), ook als die shape facetten bevat. De UI berekent vervolgens `faceted = volumes.length − res.exact`: **0**. Daardoor ontbreekt in de exportbevestiging de bedoelde waarschuwing over niet-exacte surfaces (`treeDialogs.tsx:99–126`). De STEP-uitvoer bestaat echt, 82.570 bytes. Dit is gemeten via de worker-equivalente kernelaanroepen; de volledige exportdialoog is niet met een screenshot gecontroleerd. De eerdere waarschuwing bij de feature blijft bestaan: niet beweren dat elke indicatie verdwenen is. Wel is de exportkwalificatie aantoonbaar inconsistent.

**D. Export heeft geen zelfstandige poort tegen rebuildfouten.** Een geldig document met een 80×40×10-basis en een onmogelijke fillet R1000 passeert `validateDocument`, maar de rebuild geeft een booleanfout. De resterende basis kan via het worker-equivalente STEP-pad toch succesvol worden geëxporteerd: volume circa **32000 mm³**, `exact=1`, 15.849 bytes. `occt.worker.ts:61–65` controleert `r.errors` niet; `ExportOptionsDialog` controleert slechts of er bodies bestaan (`treeDialogs.tsx:131–135`). Native opslaan kent wél een expliciete bevestiging bij rebuildfouten (`MenuBar.tsx:47–59`). De statusbalk kan de fout tonen; het risico is ongewenste export van een onvolledig model zonder afzonderlijke exportbevestiging, niet bewezen volledige onzichtbaarheid van de fout. Reproductie: tijdelijke `independentWrapReview.test.ts`, laatste `BROKEN_EXPORT`-record in `adversarial-results.jsonl`.

**E. Geometrie- en uitwisselingsdekking blijven begrensd.** `rebuild.ts:855–859` sluit onder meer face/full-round/setback en verscheidene filletopties uit het exacte pad uit. Sweep met guides, twist, circular profile en diverse eindcondities valt terug (`:867–889`); loft kent eveneens beperkingen. Exacte plastics in één testsuite maken deze gaten niet dicht. `treeDialogs.tsx:104–107` exporteert assemblies als genaaide meshes in plaats van dezelfde exacte part-route. IGES/DWG/Parasolid-pariteit is niet aangetoond; het ontbreken is consistent met aangeleverde bevindingen en de beperkte exportkeuzes. Geen eigen roundtrip met SolidWorks of externe IGES/DWG/Parasolid-bestanden uitgevoerd.

**F. Sketch Text heeft geen foutgestuurde krommenbenadering.** `src/core/sketch/text.ts:43–48` gebruikt `getPoints(6)`. Eigen vergelijking voor letter O, 100 mm hoog, hetzelfde meegeleverde lettertype: grove netto-oppervlakte **3696,575699 mm²**, dichte referentie met 1000 samples per curve **3707,054698 mm²**. Verschil −10,478999 mm² (−0,282677%); bij 10 mm extrusie correspondeert dit met −104,789991 mm³. Dit is een vergelijking met hetzelfde font, niet met een andere SolidWorks-font of een exact analytisch fontoppervlak. Wel toont het meetbaar dat zes segmenten geen maatonafhankelijke nauwkeurigheid garanderen en dat een B-rep van de polylijn niet de originele lettercurve bewaart.

**G. Twee kernels vormen geen volledig onafhankelijke controle.** `rebuild.ts:816,1918` gebruikt dezelfde `matchEdges`-logica voor randselectie. Een gedeelde onjuiste randkeuze kan twee overeenkomstige fouten geven. Bovenop B bestaan de bekende steekproefgrens en schaalafhankelijke tolerantie (`volumeCheck.ts:41,64,89–90`): bij 5 m diagonaal wordt 1 mm afwijking toegestaan. Zelfs alle vertices bekijken is geen algemene Hausdorff-controle. `volumeMismatch` retourneert bovendien null bij NaN/oneindig (`:26`), wat eigen tests bevestigen; geen bewijs verzameld dat een upstream productpad daardoor een ongeldige body als goed rapporteert.

## 3. Geldigheid van het bewijs

### Zelf gemeten

Omgeving: Linux op de box, Node **24.22.1**, npm **11.21.1**; niet de aangeleverde Node 22.23.4. De snapshot is naar een unieke `/tmp`-map gekopieerd; builds, installaties, eigen testcode, browserlogs en gegenereerde uitvoer bleven daar. `npm ci --ignore-scripts` installeerde 463 packages. Het overslaan van installatiescripts betekent onder meer dat geen volwaardige Electron-installatie/installercontrole wordt geclaimd. De lockfile en oorspronkelijke bron zijn niet aangepast. De reproduceercommando’s staan hieronder; voer ze uitsluitend in de tijdelijke kopie uit:

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build
npm test -- --reporter=json --outputFile=unit-review.json
npx vitest run src/core/document/designTable.test.ts src/core/occt/brep.test.ts --testNamePattern="creates 3 configurations|a chamfer of 2 mm" --maxWorkers=1
npx vitest run src/qa/independentReview.test.ts src/qa/independentWrapReview.test.ts
npm run build:e2e
# preview op 127.0.0.1:4393; ieder afzonderlijk script:
PW_CHROMIUM=/opt/google/chrome/chrome E2E_URL=http://127.0.0.1:4393/ node e2e/undo200.mjs
```

Voor de andere drie browserruns is alleen de scriptnaam gewijzigd. De twee `independent*`-bestanden bestaan uitsluitend in de tijdelijke kopie en voegen geen wijziging toe aan de beoordeelde bron. Alle tijden/duurverwijzingen in de eigen logs horen bij de boxomgeving; deze rapportage is afgerond op 08-11-2026 21:18 CET (Europe/Brussels).

| Controle | Eigen resultaat | Reikwijdte/bewijs |
|---|---|---|
| Officiële typecheck en build | Beide exit 2; drie genoemde TS-fouten | `typecheck-review.log`, `build-review.log` |
| Ongewijzigde volledige unitrun | **722 geslaagd, 12 gefaald, 1 overgeslagen**, 144 testbestanden | `unit-review.json`; géén eigen toegevoegde testbestanden in deze run |
| Oorzaak rood | 10 falende individuele tests gebruiken ontbrekende fixtures; daarnaast 2 time-outs op 5 s; ook 4 suites kunnen niet verzamelen door ontbrekende fixturemodules | De ontbrekende voorbeelden niet als ontbrekende productfuncties geteld |
| Time-out-hertest | **2/2 geslaagd** met één worker en dezelfde 5 s-testlimiet; 40 niet geselecteerd | `timeout-retest-review.json`; belasting kan de eerste time-outs verklaren, geen bewezen deterministische productbug |
| Losse Vite-productiebundel | Exit 0; hoofdchunk 782,72 kB | `vite-review.log`; 17,28 kB onder 800 kB, slechts 2,16% marge; niet de totale downloadgrootte |
| Browser-testbuild | Exit 0 | `e2e-build-review.log`; bouwt met testhooks, niet als Windows-installer |
| Browserchecks | **instant2d 8/8, magnify 12/12, undo200 7/7, designtable 15/15**; alle vier exit 0, geen gemelde browsererrors | Chrome `/opt/google/chrome/chrome`, lokale preview, software-WebGL; logs `*-review.log` |
| Eigen tegenvoorbeelden | 3/3 vorm-/getal-/tekstchecks; 2/2 exportchecks geslaagd | Deze tests bevestigen juist het onveilige gedrag; groen betekent hier niet opgelost |
| Productieaudit | 0 bekende kwetsbaarheden; installatieaudit 6 moderate | `audit-prod-review.json`, `install-review.log`; geen garantie tegen onbekende kwetsbaarheden |
| Bronintegriteit | 737 oorspronkelijke bestanden bytegelijk aan hun kopieën | `source-comparison-review.json`; eigen extra tests uitsluitend toegevoegd aan de tijdelijke kopie |

De ongecorrigeerde unitrun is niet achteraf tot “724 groen” herschreven. Twee afzonderlijke hertests zijn geen nieuwe volledige groene suite. De huidige fixtureloze snapshot kan de aangeleverde 815/2 niet zelfstandig reproduceren.

### Alleen aangeleverd

De huidige SHA `e0c728385e7b2c62406ba21f83430af159077ed8`, 104/104 mesh-regressies, 14/14 B-rep-scripts, 4/4 mutaties, 815 geslaagde tests met teruggezette voorbeelden, vorige Windows- en packaged-resultaten en de precieze Actions-jobstatussen komen uit `CASUS.md` en `findings-0.5.12.json`. Deze claims zijn niet volledig opnieuw gedraaid of online opgehaald. Een committekst in een archief is geen cryptografisch bewijs van een Git-tree; er is geen `.git` in de snapshot. De bestaande definitieve 0.5.11-matrix is als baseline gebruikt, niet het voorlopige 0.5.12-totaaloordeel. Geen andere teamrapporten gelezen.

### Onbekend of niet gecontroleerd

Geen nieuw Electron-/Windows-/installeronderzoek, code-signaturemeting, GPU-driverbreedteonderzoek, visuele side-by-side met SolidWorks, juridische toets, volledige 104/14-regressieherhaling, echte CAM/CNC-keten, complexe klantassemblages, externe native SolidWorks-bestanden of volledige onafhankelijke STEP-roundtrips. De twee nieuwe exportgevallen zijn via de corresponderende kernelaanroepen en bronpadcontrole bewezen, niet via een complete gebruikersklikroute. De 1000-samples-fontreferentie is zeer dicht bemonsterd, niet analytisch exact.

## 4. Ernst en prioriteiten

Ernst gaat over gevolgen; prioriteit over volgorde. Onderstaande clusters zijn geen optelsom van alle aangeleverde labels en geen nieuwe telling van alle open projectbevindingen.

| Prioriteit | Ernst | Uniek probleem / samenvoeging |
|---|---|---|
| P0 | Kritiek voor vrijgave | Officiële build niet reproduceerbaar groen op de releasebasis. F200/F54/F176 en de CI-gerelateerde delen van F31/F98 zijn één releasepoortprobleem, niet vijf afzonderlijke defecten. Geen bewezen kritieke geometrische catastrofe geclaimd. |
| P1 | Major | Wrap/STEP-exportkwalificatie strijdig met `body.exact`. Nieuwe aanvulling op F175/F99-achtige waarheidsclaims; de specifieke ellipsreparatie blijft wel geldig. |
| P1 | Major | Rebuildfouten worden niet als exportpoort afgedwongen; een onvolledige basisbody is exporteerbaar. Apart van de exacte/facettenkwalificatie. |
| P1 | Major | Onvolledige vormcontrole, gedeelde randselectie en te ruime volume-/schaaltolerantie. F48/F159/F172/F179/F198/F202 overlappen; het eigen dakvoorbeeld verdiept één integriteitscluster. |
| P2 | Major | Onvolledige exacte features en uitwisselingsformaten (F51/F114/F121/F199), met aparte concrete gebruikersscenario’s maar zonder elk symptoom dubbel te tellen. |
| P2 | Major | Niet bewezen/ongesigneerde actuele desktoprelease: F49/F117 samen; oude installer-, packaged- en fusebewijzen niet als drie extra signingdefecten tellen. |
| P2 | Major voor de pariteitsclaim | Ontwerptabellen, 3D-interactie, opties en UI hebben aantoonbare maar begrensde scope. CSV is geen volledige Excel-integratie. |
| P2 | Minor, toepassingsafhankelijk Major | Sketch Text-precisie: bij decoratie meestal beperkt; bij grote gravures, passing of massabepaling relevant. Prioriteit verhogen zodra daarvoor productieclaims gelden. |
| P3 | Minor / bewijsverbetering | Bundelmarge, documentatietellingen, uitvoerige logs en herhaalbaarheid. De twee geïsoleerd groene time-outcases worden niet als bewezen Major-productbugs geteld. |

Ontbrekende raw logs, onbekende visuele afwijkingen en juridische onzekerheid zijn bewijs-/scopegaten, geen automatisch bewezen fouten. Veel kleine iconische verschillen wegen voor vrijgave minder zwaar dan één misleidende geometrische goedkeuring.

## 5. Bruikbaarheid, blinde vlekken en alternatieve interpretaties

- **Bruikbaar:** leren, prototyping, overzichtelijke parametrische parts, gecontroleerde tekeningen en CSV-varianten. Op die gebieden zijn de werkende implementatie en gerichte regressies serieus te nemen. Niet elk tekort maakt alle functies waardeloos.
- **Worstcase fabricage:** een model met mislukte fillet/cut blijft een valide basisbody houden; die exporteert zonder afzonderlijke incompleet-modelvraag. De ontvanger krijgt een leesbare STEP en kan aannemen dat de bedoelde afronding aanwezig is. Een bestaande rode status helpt alleen als de bediener die ziet en de overdracht beheerst.
- **Worstcase vertrouwen:** een wrap is eerlijk Faceted in de featureweergave, maar de STEP-exportteller suggereert nul faceted bodies. Later kan de ontvanger het model ten onrechte behandelen als maatvaste kromme. Geen bewijs dat de file corrupt is; juist een syntactisch bruikbare file kan de semantische fout verhullen.
- **Alternatieve interpretatie exportteller:** “exact” kan intern “heeft een OCCT-shape” betekenen. Dan is de teller technisch consequent met dát criterium, maar de huidige UI-vertaling naar “not exact surfaces” blijft inhoudelijk verkeerd. Een geldig B-rep-polyhedron is niet gelijk aan de oorspronkelijke analytische vorm.
- **Worstcase schaal:** 0,5% volume kan een klein maar cruciaal gat of fillet missen; de diagonale vormtolerantie wordt ruimer bij grote modellen. Een geschikte controle moet lokale fout en modelintentie toetsen, niet alleen totale massa.
- **Testblindheid:** `e2e/lib/check.mjs:51–57` slikt time-outs van `waitSettled`, ook als de verwachte exacte bodies niet verschijnen. Een groene scriptnaam “B-rep” bewijst daarom zonder lokale body-/exactnessasserts niet dat alle resultaten exact zijn gecontroleerd. De consoleallowlist accepteert bovendien breed “Failed to load resource”. Dit zijn brongebaseerde assurancebeperkingen, geen bewijs dat de aangeleverde 14 scripts vals groen waren.
- **Prestatieblindheid:** de 45 s-rebuildgrens wordt tussen features gecontroleerd (`rebuild.ts:1220–1227`), niet als preëmptie midden in een zware CSG-bewerking. De worker beperkt schade aan de UI maar maakt een individuele operatie niet automatisch begrensd. Geen eigen p95-interactietijdmeting of stressherhaling uitgevoerd; de box was gedeeld en eerste tests liepen deels parallel.
- **Meetmethode:** 62 grove categorieën zijn geen representatieve catalogus van alle SolidWorks-features. “Handelsmerk-vrij”, pixelgelijkheid, signing en geometrische correctheid zijn verschillende doelen. De bestaande noemer is bewust behouden om geen cosmetische vooruitgang te creëren. Een toekomstige scopewijziging moet afzonderlijk worden besloten en zichtbaar naast deze historische score staan.

## 6. Concrete acceptatiecriteria voor vervolgwerk

1. **Releasepoort:** op één vastgelegde nieuwe commit `npm ci`, officiële typecheck, unitrun en officiële build groen op de ondersteunde Node 22-omgeving én actuele Windows-run. Alle vereiste fixturebestanden met hashes en herkomst meeleveren. TS6133/TS2345 oplossen in plaats van tests uit de typecheck te verwijderen. Geen skip-/tolerantieverruiming als vervanging voor een oplossing. Installer en portable moeten van precies dezelfde commit komen; bewaar volledige stdout, exitcodes en artefacthashes.
2. **Waarheidsgetrouwe export:** herhaal het wrapmodel uit de tijdelijke test. Rebuild blijft eerlijk `exact:false`; de export rapporteert eveneens één benaderde body en toont de waarschuwing, ongeacht of die als OCCT-shape of genaaide mesh wordt geschreven. Een gemengde assembly/part met één exacte en één benaderde body moet afzonderlijke aantallen en beperkingen tonen. STEP heropenen in een onafhankelijke reader; geometrie en metadata vastleggen.
3. **Export bij fouten:** het geval met geldig basisblok en onmogelijke R1000-filletedge mag niet geruisloos een productie-export opleveren. Standaard blokkeren of een expliciete, gerichte bevestiging met foutlijst en onvolledige-modelkwalificatie eisen; annuleren produceert geen bestand. Voeg pending rebuild, rollback, worker-time-out en fout in genest component toe. Test de echte UI- en workerroute, niet uitsluitend een mock.
4. **Onafhankelijke vormvalidatie:** voeg het gesloten dak-tegenvoorbeeld toe met dezelfde acht vertices en twee dakdiagonalen; eis detectie van de >0,49 mm-interieurafwijking ondanks <0,5% volumeverschil. Test daarnaast gelijke volumes met lokale materiaalverplaatsing, kleine features op grote modellen, subtriangelafwijkingen en gemiste steekproefvertices. Meet ook vlakinterieurs of gebruik een aantoonbaar conservatieve foutgrens. NaN/oneindig/ongeldige bodies mogen niet als een geslaagde kruiscontrole eindigen. Label niet-getoetst apart van overeenkomstig.
5. **Geometrische intentie:** per topologie-/filletscenario een onafhankelijke analytische of extern vastgelegde referentie, met opeenvolgende maatwijzigingen, splits/merges, verwijderde randen en symmetrische ambiguïteit. Verkeerde gedeelde randselectie moet falen, ook als beide kernels hetzelfde foute resultaat leveren. Behoud de reeds strikte ellips- en gesleufde-plaatasserts. Voor exacte bodies als doel: `|ΔV| ≤ max(0,01 mm³, 10⁻⁵ × V)` plus gedocumenteerde lokale vorm-/topologiegrenzen; geen universele CAD-maatnauwkeurigheid suggereren uit alleen dit volumecriterium.
6. **Sketch Text:** foutgestuurde sampling of echte fontkrommen; leg een expliciete maximale contourfout in mm vast en toets bij meerdere hoogten, fonts, gaten en schalingen. Voor de gemeten O moet de ingestelde foutgrens de segmentatie bepalen. Een polylijn mag niet impliciet worden gepresenteerd als behoud van de oorspronkelijke lettercurve.
7. **Volledige pariteitsclaims:** voor rij 7 naast het simpele sleepvoorbeeld ook verschillende maattypen, conflict/escape, driven dimensions en selectienauwkeurigheid vergelijken met een vastgelegde SolidWorks-versie; voor rij 44 XLSX/formules/embedded of live tabel en assemblyparameters bewijzen vóór promotie naar aanwezig. Voor fillets, guides, tekenlijnen en formaten per ontbrekend subpad een geval met inputs, verwachte uitvoer en expliciete fallbackkwalificatie. Anders deels blijven.
8. **Operationele borging:** getekende actuele Windows-artefacten óf zichtbaar beperkte ongesigneerde proefrelease; signature- en fusecontrole op de daadwerkelijk geïnstalleerde binaries. Minstens tien herhalingen van de eerder tijdsgevoelige regressiepaden, met p95/piek en platformgegevens. `waitSettled`-time-outs laten falen of als expliciet toegestane, geassertte faceted fallback registreren. Een ontbrekende resource mag niet stil tot een groen assurance-resultaat worden gefilterd.

Tot deze criteria aantoonbaar zijn gehaald: beperkte proefstatus, expliciete exportcontrole en geen claim van volledige SolidWorks-pariteit.
