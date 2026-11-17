# 32 — Advies Fable 5.2 op Phlippo CAD 0.5.14

Datum: 2026-11-17. Branch `claude/fase1-schetser`, werkboom op d2c46c7 met niet-vastgelegde wijzigingen van andere
agenten (bibliotheek/fitness, voorbeelden/treinverlichting). Er is geen code gewijzigd.

## Hoe dit tot stand kwam

Gelezen: docs/29, 30, 31, het externe QA-rapport 0.5.13, de recente CAD-delen van TASKS.md, `electron/*.cjs`,
`src/app/store.ts`, `rebuildWorker.ts`, `brepRefine.ts`, `MenuBar.tsx`, `slices/document.ts`, delen van
`slices/assembly.ts` en `slices/features.ts`, `prefs.ts`, `core/document/persistence.ts`, `history.ts`,
`core/features/rebuild.ts` (kop, staart, lichaamsbeheer), `solid.ts` (CSG), `volumeCheck.ts`, `edgesets.ts`,
`core/solver/solver.ts` en `linalg.ts`, `core/occt/occtClient.ts`, beide workers, `vite.config.ts`, `ci.yml`.

Zelf gedraaid op deze werkboom (Windows 11, terwijl andere agenten zware tests draaiden):

| Controle | Uitslag |
|---|---|
| `npm run typecheck` | geslaagd (exit 0) |
| `npx vitest run` | **rood**: 148 bestanden, 145 geslaagd, 2 gefaald, 1 overgeslagen; 2934 tests, 2896 geslaagd, **11 gefaald**, 27 overgeslagen; 247 s |

De 11 fouten:

- 10 in `src/qa/qaFitness.test.ts` (botsingen FS-12 en FO-16, rood oordeel FS-01, varianten, opslag, P1-01/02/03,
  P1-11). Dat is de fitnesscatalogus, geen CAD-kern; de bestanden in `bibliotheek/fitness` zijn op dit moment
  gewijzigd en niet vastgelegd. Zie P2-11.
- 1 in `src/core/occt/brep.test.ts:524` ("weldment frames … are exact"): tijdslimiet van 60 s overschreden terwijl de
  machine zwaar belast was. Geen rekenfout aangetoond; wel een test die van de wandklok afhangt. Zie P2-12.

Niet gedraaid: e2e-regressie, de voorbeeldsuites, rebuildbudgetten, de desktopshell. Alles hieronder komt dus uit het
lezen van de code, tenzij er "gedraaid" bij staat. Waar ik een gevolg afleid maar niet heb uitgevoerd, staat dat erbij;
zo'n punt verdient eerst een falende test voor het wordt opgelost.

## Telling

| Prioriteit | Aantal |
|---|---:|
| P1 (gegevensverlies, foute geometrie) | 3 |
| P2 (belangrijk) | 15 |
| P3 | 13 |

Beveiliging van de Electron-shell is in orde; daar staat geen P1 of P2 (zie "Beveiliging").

---

## P1

### P1-1 Ctrl+S tijdens Edit Component schrijft het onderdeel over het assembly-bestand

- Waar: `src/app/MenuBar.tsx:48-85` (`saveDocument`), `src/app/slices/assembly.ts:247-262` (`editComponent`),
  `src/app/App.tsx:109`.
- Wat: `editComponent` opent het onderdeel met `openDocument`, maar de bestandshandle (`currentHandle` in
  `desktop.ts`) blijft die van het assembly. `saveDocument` kijkt niet naar `editContext`: het serialiseert `doc` (nu
  het onderdeel) en schrijft dat met de handle van het assembly. Daarna hernoemt het het onderdeel naar de
  bestandsnaam van het assembly (`MenuBar.tsx:76-77`) en zet `dirty` op false.
- Waarom erg: het `.kcad` van het assembly bevat dan alleen nog één onderdeel. Het assembly zelf staat alleen nog in het
  geheugen en in `.bak`. Een crash of "Don't Save" daarna en het assembly is weg uit het hoofdbestand; na twee verdere
  saves is ook de `.bak`-rotatie (standaard 2 kopieën) voorbij. `autoRecover.ts:26` weet wel dat het onderdeel "geen
  eigen bestand" heeft; `saveDocument` weet dat niet.
- Status: uit de code afgeleid, niet uitgevoerd.
- Oplossing: in `saveDocument` bij `editContext` eerst `returnToAssembly()` (zoals `withUnsavedCheck` al doet op
  regel 106) of het assembly met het bewerkte onderdeel erin serialiseren zonder de bewerking te verlaten. Test in
  `e2e/desktop*.mjs`: assembly opslaan, Edit Component, Ctrl+S, bestand teruglezen en `kind === 'assembly'` eisen.

### P1-2 Herstart voor software-OpenGL gooit onopgeslagen werk weg

- Waar: `electron/main.cjs:353-357` (`gpu:restart`), `src/app/softwareGL.tsx:35-40` en `58-62`.
- Wat: de knoppen "Use software OpenGL and restart" en "terug naar de grafische kaart" roepen `restartApp()`. Het
  hoofdproces doet `app.relaunch(); app.exit(0)` zonder naar `dirty` te kijken; de renderer vraagt ook niets.
  `app.exit` slaat de `close`-handler met de Save-vraag over.
- Waarom erg: wie in Options de schakelaar omzet met een gewijzigd document open, verliest alles sinds de laatste
  save (Auto-Recover schrijft maar om de 10 minuten).
- Oplossing: in de renderer `withUnsavedCheck(() => api.restartApp())`; in `gpu:restart` weigeren zolang
  `dirty && !force`. Test in `desktop-nohooks.mjs`.

### P1-3 Lichamen heten naar hun volgnummer; verwijzingen schuiven op

- Waar: `src/core/features/rebuild.ts:726` (`id: body${++bodySeq}`), gebruikt door `scoped()` (Feature Scope),
  `doc.hiddenBodies`, `doc.bodyAppearances`, `doc.bodyMaterials`, `doc.transparentBodies`.
- Wat: een lichaam krijgt zijn id uit de volgorde waarin het ontstaat. Voeg je vroeg in de boom een feature toe die
  een lichaam maakt (Merge result uit, een split, een import), dan heet het vroegere `body2` nu `body3`.
- Waarom erg: een cut met Feature Scope op `body2` snijdt daarna een ander lichaam, zonder fout of waarschuwing. Dat
  is stil foute geometrie. Verborgen lichamen, kleuren en materialen (massa!) verspringen mee. De kruiscontrole ziet
  het niet, want beide kernen maken dezelfde fout.
- Status: uit de code afgeleid; `multibody.test.ts` heeft geen geval "feature ingevoegd vóór een scope".
- Oplossing: het id afleiden van de feature die het lichaam maakte plus een stabiel volgnummer binnen die feature
  (`<featureId>#<k>`), met een migratie voor bestaande bestanden (oude `bodyN` omzetten bij het openen aan de hand van
  een eerste rebuild). Test: twee lichamen, cut met scope op het tweede, daarna een derde lichaam vooraan invoegen; de
  cut moet op hetzelfde lichaam blijven.

---

## P2

### P2-1 Options ▸ OK wist instellingen die in dezelfde sessie zijn bewaard

- Waar: `src/app/options.tsx:24,52`, `src/app/slices/features.ts:1577-1580`, tegenover `materialDialog.tsx:11,14`,
  `panels/AppearancesPane.tsx:89`, `panels/pm/shared.tsx:311`, `evaluate.tsx:39`, `slices/features.ts:1235`,
  `drawing/DrawingPM.tsx:17`, `panels/AssemblyPM.tsx:222,281`.
- Wat: die plekken bewaren met `savePrefs({ ...loadPrefs(), sleutel })` rechtstreeks in localStorage en werken
  `store.prefs` niet bij. Het Options-venster begint van `store.prefs` en `setPrefs` schrijft bij OK de hele set
  terug. Alles wat sinds de start buiten de store is bewaard (eigen materialen, favorieten, eigen appearances,
  maatstijlen, mate-opties) wordt overschreven met de stand van bij de start.
- Oplossing: één schrijfpad. `savePrefs` laten samenvoegen met wat er staat, of alle losse schrijvers via een
  `patchPrefs(k, v)` laten lopen die store en opslag samen bijwerkt. Test: favoriet materiaal toevoegen, Options OK,
  favoriet moet er nog zijn.

### P2-2 Documenteigenschappen: het bestand bepaalt systeemopties, en de echte doc-opties worden niet toegepast

- Waar: `src/app/slices/document.ts:92`, `src/app/prefs.ts:79-104`, `src/core/document/persistence.ts:150-235`.
- Wat, drie dingen:
  1. `openDocument` legt `doc.properties` ongefilterd over de gebruikersopties. `validateDocument` controleert
     `properties` niet. Een `.kcad` kan dus `perf.rebuildWorker`, `backup.autoRecover`, `customize.keys` enz. zetten;
     bij de eerstvolgende Options ▸ OK staan ze blijvend in het profiel.
  2. `getPref()` leest de modulevariabele `current`, en die wordt bij het openen niet bijgewerkt. Het Options-venster
     toont dus de waarden van het bestand (decimalen, eenheden, rastermaat), maar de viewport en de maten rekenen met
     die van de gebruiker tot iemand op OK klikt.
  3. `setPrefs` bewaart ook de `doc.*`-sleutels in het gebruikersprofiel, zodat de eigenschappen van document A
     doorlekken naar het volgende nieuwe document.
- Oplossing: bij het openen alleen sleutels die met `doc.` beginnen, in `DEFAULT_PREFS` bestaan en hetzelfde type
  hebben; daarna `current` zetten via één functie; in `savePrefs` de `doc.*`-sleutels weglaten.

### P2-3 Een gecrashte of hangende renderer houdt het venster gegijzeld

- Waar: `electron/main.cjs:201-206`; er is geen `render-process-gone`- of `unresponsive`-handler.
- Wat: met `dirty === true` houdt `close` het sluiten tegen en vraagt het de renderer om de Save-vraag. Is de renderer
  dood (geheugen op bij een grote boolean) of hangt hij, dan komt er nooit antwoord: het venster sluit alleen nog via
  Taakbeheer.
- Oplossing: `render-process-gone` → dialoog in het hoofdproces ("herstart; je werk staat in Document Recovery"),
  `dirty = false`, herladen. `unresponsive` → wachten of afsluiten aanbieden. Een tijdslimiet van enkele seconden op
  het antwoord van `win:closeRequested`.

### P2-4 Exacte (B-rep) nabouw: tijdslimiet korter dan het budget, niet afbreekbaar, fouten ingeslikt

- Waar: `src/core/occt/occtClient.ts:39,61-64`, `src/workers/occt.worker.ts:80-104`,
  `src/app/brepRefine.ts:152-204`.
- Wat:
  1. `refineRebuild` gebruikt de standaardlimiet van 60 s, inclusief het laden van 23 MB WASM en wachttijd achter
     een lopende export. Het rebuildbudget is 45 s en CI mat al rebuilds van 68 s. Een zwaar model loopt zo telkens in
     `KernelTimeout`: worker weg, WASM opnieuw laden, en nooit een exact resultaat.
  2. Het budget (`setRebuildBudget`) gaat niet mee naar de OCCT-worker en `stopped` komt niet terug. Stopt de B-rep
     na 45 s terwijl de mesh-rebuild wel klaar was, dan kunnen de lichamen in aantal kloppen en meldt de
     kruiscontrole een "kernelverschil" dat er niet is.
  3. Een verouderde nabouw wordt niet afgebroken (`busy`/`again`): na een wijziging moet de oude eerst uitrekenen.
     De mesh-worker breekt wel af (`rebuildWorker.ts:41-46`).
  4. Elke fout behalve een timeout verdwijnt (`timedOut(err)` op regel 183 en 199). Na een WASM-abort (geheugen op)
     blijft `ready` in de worker opgelost met een dode module: elke volgende aanroep faalt en de gebruiker ziet alleen
     "Faceted", zonder reden.
- Oplossing: limiet = budget + laadtijd, klok pas starten als de worker begint; budget meesturen en bij `stopped`
  geen kruiscontrole; bij een nieuwe aanvraag de worker beëindigen; elke fout één keer melden en de worker na een
  fout herstarten.

### P2-5 Elke wijziging bouwt het hele model opnieuw, deels op de UI-thread

- Waar: `src/core/features/rebuild.ts:700-1908`, `src/app/store.ts:1219-1243`, `src/app/slices/document.ts:122`,
  `src/core/assembly/assembly.ts:562-569`.
- Wat:
  1. `rebuildDocument` begint altijd bij feature 0. Er is geen tussenstand per feature. De laatste fillet aanpassen
     kost evenveel als het hele model, en dat twee keer (mesh, daarna B-rep).
  2. De eerste rebuild van een document loopt tot 4 s op de UI-thread (`SYNC_REBUILD_MS`) en wordt dan weggegooid en
     in de worker herdaan.
  3. `reorderFeature` doet een volledige `rebuildNow` op de UI-thread, zonder worker (lastafel: ±14 s bevroren).
  4. Assemblies bouwen al hun onderdelen synchroon op de UI-thread (`rebuildFor` slaat ze over, `partRebuild` rekent
     meteen). Een assembly met zware onderdelen openen bevriest het venster voor de som van alle rebuilds.
  5. Het budget wordt alleen tussen features gecontroleerd (`rebuild.ts:902`): één patroon of boolean kan er ver
     overheen.
- Oplossing, in volgorde van winst: (a) tussenstanden per feature bewaren, gesleuteld op een hash van de feature en
  haar invoer, en herbouwen vanaf de eerste gewijzigde feature; (b) `SYNC_REBUILD_MS` naar ±300 ms; (c) reorder en
  onderdelen van assemblies ook via de worker; (d) budgetcontrole binnen patronen.

### P2-6 Autosave: het hele document, opgemaakt, twee keer naar localStorage bij elke wijziging

- Waar: `src/core/document/persistence.ts:27-29` (`JSON.stringify(…, null, 2)`), `274-299` (`autosave`), aangeroepen
  na elke bewerking, undo, redo en sleepactie.
- Wat: synchroon op de UI-thread. Met inspringing staat elk getal van een geïmporteerde mesh op een eigen regel
  (±14 bytes per getal). Een STL of STEP van 100 000 driehoeken is zo ±12 MB: boven het quotum van localStorage, dus
  "Autosave failed" bij elke wijziging, en elke wijziging kost een volledige serialisatie.
- Zelfde oorzaak, tweede gevolg: `MAX_FILE_BYTES` is 64 MB (`main.cjs:70`, `persistence.ts:16`). Een import van ±500 000
  driehoeken levert een bestand dat niet meer opgeslagen kan worden ("The document is too large to save").
- Oplossing: autosave uitstellen (bv. 2 s na de laatste wijziging, of in `requestIdleCallback`), zonder inspringing;
  in de desktop naar de schijf via de bestaande recover-brug in plaats van localStorage; mesh-posities als base64
  Float32 bewaren (factor ±5 kleiner), met een migratie naar formaat 3.

### P2-7 Bestandsformaat: geen programmaversie, één formaatnummer sinds 0.3.6, ondiepe validatie

- Waar: `src/core/document/persistence.ts:7,27-29,138-143,176-195`.
- Wat:
  1. `FILE_VERSION` is 2 sinds 0.3.6. Alles wat 0.4 en 0.5 aan velden toevoegden, zit in hetzelfde formaat. Een
     oudere build opent een nieuwer bestand zonder waarschuwing en negeert de velden die hij niet kent: andere
     geometrie, geen melding. Alleen een onbekend feature-*type* wordt geweigerd.
  2. Het bestand zegt niet welke programmaversie het schreef. Bij een foutmelding van een gebruiker is niet te
     achterhalen waar het bestand vandaan komt.
  3. Van features worden alleen `depth/angle/thickness/radius/distance` gecontroleerd. Aantallen van patronen,
     `positions` van een import, `keepBodies`, `scope` enz. niet. Een patroon met 10⁹ exemplaren uit een beschadigd
     bestand loopt vast tot het budget (dat binnen een feature niet kijkt, zie P2-5).
- Oplossing: `app: "0.5.14"` en `commit` meeschrijven; het formaatnummer verhogen zodra een veld de geometrie
  verandert; bij een bestand van een nieuwere programmaversie waarschuwen; per featuretype een schema (de typen
  bestaan al in `types.ts`) met grenzen voor aantallen.

### P2-8 Mesh-booleans: de volumecontrole vangt alleen onmogelijke uitkomsten

- Waar: `src/core/features/solid.ts:522-528` (`booleanVolumeOk`), `559-562` (`isClosed`), `513`.
- Wat: de controle eist alleen dat een cut niet groter wordt en een union niet kleiner, met 0,1 % marge. Een cut die
  niets wegneemt, of een union die het gereedschap laat vallen, komt erdoor. Een gemist gat Ø5 in een balk van 4 m
  valt binnen de marge. `isClosed` telt de som van de georiënteerde oppervlakken: twee tegenover elkaar liggende gaten
  heffen elkaar op en tellen als gesloten.
- Waarom: zolang een lichaam exact is, vangt de kruiscontrole dit. Voor alles wat op de mesh-kern terugvalt (face
  fillet, full round, setback, guide curves, wrap, split lines) is er geen tweede mening.
- Oplossing: (a) na een cut/union waarbij het volume niet verandert terwijl gereedschap en lichaam elkaar echt
  overlappen (een hoekpunt van het ene binnen het andere, via de BVH die er al is) een fout geven; (b) geslotenheid op
  randen tellen (elke rand twee keer, T-kruisingen apart), niet op de oppervlaktesom.

### P2-9 Schetssolver: dicht en kubisch, geen opsplitsing

- Waar: `src/core/solver/solver.ts:45-107`, `src/core/solver/linalg.ts:99-137`, `src/app/store.ts:1112-1128`,
  `src/app/slices/document.ts:167,176`.
- Wat: Levenberg-Marquardt met een dichte Jacobiaan, `AᵀA` en een dichte oplossing: O(n³) per stap, tot 80 stappen
  × 12 pogingen, en daarna drie keer een dichte `rref` voor de statusanalyse. Losse cirkels zonder relaties worden
  mee opgelost alsof ze samenhangen. Dat is waarom het lastafelblad zijn 541 gaten ±14 s kost. `undo`, `redo`,
  `openDocument` en Ctrl+B lossen bovendien alle schetsen opnieuw op (`solveAll(…, {})`).
- Oplossing: de vergelijkingen splitsen in samenhangende groepen (union-find op de parameters van elke vergelijking)
  en elke groep apart oplossen en analyseren; bij undo alleen de schetsen die verschillen van de vorige stand.
  Verwachte winst voor 541 losse gaten: van één stelsel van ±1600 naar 541 stelsels van 3.

### P2-10 De rebuild-worker wordt bij elke nieuwe aanvraag gedood en opnieuw gestart

- Waar: `src/app/rebuildWorker.ts:40-46,56-62`.
- Wat: bij slepen aan een maat komt er per tussenwaarde een aanvraag; elke keer `terminate()` en een nieuwe worker die
  de kernelmodule opnieuw moet laden en compileren. Er is geen `onmessageerror` (een resultaat dat niet te klonen is,
  laat de belofte eeuwig hangen: "Rebuilding…" blijft staan) en geen bewaking als de worker zelf blijft hangen.
- Oplossing: een reserve-worker warm houden; de aanvraag pas versturen na een korte pauze in het slepen;
  `onmessageerror` behandelen als fout; een limiet van budget + marge waarna de worker herstart en de fout getoond
  wordt.

### P2-11 `npm test` hangt af van de fitnesscatalogus en is daardoor nu rood

- Waar: `vite.config.ts:31-33` (12 uitgesloten bestanden) tegenover `package.json:15` (`test:voorbeelden`, 15
  bestanden); `src/qa/qaFitness.test.ts`, `qaBalustrades.test.ts`, `montageDeuren.test.ts`.
- Wat: de drie laatste staan niet in de uitsluitlijst en draaien dus mee in `npm test`, de poort van de CAD-kern in
  CI. `qaFitness` alleen al kost 174 s van de 247 s en gaf 10 fouten op deze werkboom, omdat `bibliotheek/fitness`
  op dat moment gewijzigd was. Een agent die aan de catalogus werkt, maakt zo de CAD-poort rood (dit is hetzelfde
  soort koppeling als F203).
- Oplossing: de bibliotheektests (fitness, deuren, balustrades) naar een eigen map en een eigen script en CI-job
  (`test:bibliotheek`); `VOORBEELD_TESTS` en `test:voorbeelden` uit één lijst afleiden, met een test die eist dat ze
  gelijk zijn.

### P2-12 Tests die van de wandklok afhangen

- Waar: `src/core/occt/brep.test.ts:26,188,541,740` (limiet 60 s per test); `e2e/*.mjs`.
- Wat: "weldment frames … are exact" haalde op een belaste machine 62 s en faalde (gedraaid). In de 117 e2e-scripts
  staan 1657 vaste `waitForTimeout`-pauzes (375 × 300 ms, 285 × 200 ms, 269 × 400 ms, 195 × 500 ms, 122 × 800 ms …):
  te kort op een trage runner, en bij elkaar minuten stilstaan per pass. Dit past bij de flakes die docs/30 en 31
  beschrijven (F137, F145, F184).
- Oplossing: zware B-rep-tests een ruime limiet geven en hun duur apart bewaken (een budgettest, geen timeout); in
  e2e wachten op een toestand (`waitForFunction` op `rebuild.pending === false`, op het exacte lichaam, op een
  testid), met één helper in `e2e/lib`.

### P2-13 `returnToAssembly` zoekt het onderdeel op naam

- Waar: `src/app/slices/assembly.ts:267`.
- Wat: `c.part.name === ctx.partName` vervangt elk component waarvan het onderdeel zo heet. Twee verschillende
  onderdelen met dezelfde naam (twee bestanden `Beugel.kcad` uit verschillende mappen, of twee keer een nieuw "Part1")
  worden allebei overschreven door het bewerkte.
- Status: uit de code afgeleid; niet nagegaan of het invoegen dubbele namen elders tegenhoudt.
- Oplossing: op `part.id` vergelijken (elk document heeft er een sinds F153), met de naam alleen als terugval voor
  oude bestanden.

### P2-14 De regelbegroting meet regels, geen code

- Waar: `tools/line-budget.cjs`, `src/app/viewport/Viewport.tsx:561`, `src/core/features/rebuild.ts:700-1908`.
- Wat (gemeten): 569 bronregels zijn langer dan 300 tekens, 22 langer dan 1000. `Viewport.tsx:561` is één aanroep van
  ruim 3000 tekens. Een bestand blijft zo onder zijn plafond terwijl het groeit. `rebuildDocument` is één functie van
  ±1200 regels met ±25 closures die dezelfde toestand delen. Er is geen ESLint en geen Prettier in de repo; de
  opmerking `eslint-disable` in `qaFitness.test.ts` verwijst naar niets.
- Oplossing: begroten op tekens of op regels na Prettier (`printWidth` 140); een plafond per functie (bv. 150
  regels) via ESLint `max-lines-per-function`; `rebuildDocument` opdelen in een tabel `type → bouwer(f, ctx)`, zoals
  `buildSheetMetal` en `buildSurfaceFeature` al doen.

### P2-15 Undo laat een open Property Panel en de rollback-balk staan

- Waar: `src/app/slices/document.ts:164-181`, `src/app/shortcuts.ts:141-145`.
- Wat: Ctrl+Z werkt ook terwijl een feature bewerkt wordt. `undo` zet `featureEdit`, `mateEdit` en `drawingEdit`
  niet terug en hergebruikt `rollbackIndex` van de nieuwere stand op een oudere featurelijst. Na undo kan het paneel
  een feature tonen die niet meer bestaat; OK voegt haar dan opnieuw toe of faalt.
- Status: uit de code afgeleid, niet uitgevoerd.
- Oplossing: zoals het referentieprogramma: undo binnen een open paneel geldt alleen voor het paneel, of het paneel
  sluit eerst. `rollbackIndex` begrenzen op de lengte van de teruggezette lijst.

---

## P3

| Nr | Waar | Wat | Oplossing |
|---|---|---|---|
| P3-1 | `src/app/lifecycleDialogs.tsx:58` | Pack and Go zoekt `window.phlippo`; de brug heet `phlippoDesktop`. De desktoptak is dode code, elk bestand gaat als download. | `desktop()` gebruiken en één map laten kiezen. |
| P3-2 | `src/app/MenuBar.tsx:290`, `src/app/shortcuts.ts:126-129` | Het menu zegt Save As = Ctrl+Shift+S; de toets start het kiezen van een schetsvlak. | Eén van de twee aanpassen; een test die menu-sneltoetsen tegen de handler legt. |
| P3-3 | `electron/main.cjs:92,259` | Een relatief pad van een tweede start wordt opgelost tegen de map van de eerste start. | De `workingDirectory` van `second-instance` gebruiken (`path.resolve`). |
| P3-4 | `src/workers/occt.worker.ts:81-82` | `release()` staat bij `rebuild` niet in een `finally`; een uitzondering lekt OCCT-objecten tot de worker stopt. | `try/finally`, zoals bij `exportDoc`. |
| P3-5 | `src/app/MenuBar.tsx:68-79` | `dirty = false` na de `await`: een wijziging tijdens het schrijven telt als opgeslagen. | Vóór het schrijven de documentverwijzing onthouden en alleen dan `dirty` wissen als ze nog gelijk is. |
| P3-6 | `src/core/features/tolerance.ts` (`reference: 0.5`) | Verwijzingen naar randen en vlakken matchen binnen vaste 0,5 mm; op kleine onderdelen (afschuining 0,3 mm) liggen twee kandidaten binnen de marge. | Marge relatief aan de randlengte, met 0,5 mm als plafond. |
| P3-7 | `src/core/solver/solver.ts:45-60`, `linalg.ts:106,144,163` | De status (volledig/onder/over) komt uit een Jacobiaan met voorwaartse verschillen en een absolute drempel van 1e-9 zonder schaling van rijen. Hoek- en lengtevergelijkingen door elkaar op grote schetsen kunnen de rang verkeerd schatten. Niet aangetoond. | Analytische afgeleiden of centrale verschillen, rijen normaliseren, rang via QR met pivotering; test met een rechthoek van 4000 mm en overtollige relaties. |
| P3-8 | `src/core/features/solid.ts:485-486` | `csg` vervangt `console.warn` globaal tijdens elke boolean. | De waarschuwing bij de bron wegnemen (optie hernoemen via een patch of upgrade van three-bvh-csg). |
| P3-9 | `src/core/occt/occtClient.ts:42` | De klok van een kernelaanroep loopt ook terwijl hij achter een andere wacht. | Starten bij een "begonnen"-bericht van de worker. |
| P3-10 | `.github/workflows/ci.yml` | Actions vastgezet op tag (`@v4`), geen Dependabot, `npm audit` niet in CI, geen dekkingsmeting. | SHA-pins, Dependabot voor npm en actions, `npm audit --omit=dev` als stap, dekking van `src/core` rapporteren. |
| P3-11 | `src/qa/*` | Tests van deuren, balustrades en fitness staan in de bron van het CAD-programma en importeren uit `bibliotheek/`. | Verhuizen (zie P2-11). |
| P3-12 | `electron/main.cjs:57`, `vite.config.ts:10` | `style-src 'unsafe-inline'` in de CSP. Geen lek op zich (geen externe inhoud), wel de laatste versoepeling. | Inline `style`-attributen blijven nodig voor React; `style-src-elem 'self'` toevoegen zodat alleen attributen inline mogen. |
| P3-13 | `src/app/store.ts:1260-1270` | Het resultaat van de worker wordt alleen aangenomen als `rebuild` nog exact de placeholder is. Elke code die intussen een kopie van `rebuild` zet, laat `pending` voor altijd staan. Nu doet niemand dat; het is een valkuil. | Een volgnummer in de toestand vergelijken in plaats van objectidentiteit. |

---

## Beveiliging (in orde)

Nagekeken in `electron/main.cjs`, `preload.cjs`, `recover.cjs`, `backups.cjs`, `package.json` (`electronFuses`),
`vite.config.ts`:

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, geen DevTools in de geïnstalleerde build,
  debugschakelaars geweigerd, fuses dicht (`runAsNode`, `NODE_OPTIONS`, inspect, asar-integriteit).
- `app://phlippo` met padcontrole binnen `dist/`, CSP als header, `'unsafe-eval'` alleen voor de OCCT-worker.
- Geen navigatie, geen kindvensters, geen webview, alle permissies geweigerd, externe links via een lijst.
- IPC alleen van het eigen topframe; de renderer noemt nooit een pad (handles); schrijven is atomair met `.bak`.
- Bestanden: groottegrens, diepte- en knooppuntgrens, verboden sleutels (`__proto__`), decals alleen `data:image/`.

Open blijft wat QA al meldt: de installer is niet ondertekend (F49/F117). Nieuwe punten hierboven: P1-2, P2-2, P2-3.

---

## SOLIDWORKS-gelijkheid: de grootste gaten, in volgorde van wat een gebruiker merkt

1. **Eén document tegelijk, en alles ingebed.** Geen meerdere open documenten, geen Window-menu of Ctrl+Tab. Een
   assembly bevat een kopie van elk onderdeel (`component.part`), een tekening een kopie van het model
   (`view.model`). Wijzig je het onderdeelbestand, dan verandert het assembly of de tekening niet mee. In SOLIDWORKS is
   die koppeling tussen bestanden de kern van het werken. Dit is het grootste gat, en P1-1 en P2-13 komen eruit voort.
2. **Het model verschijnt eerst gefacetteerd en springt daarna naar exact.** Twee kernen na elkaar; selecties worden
   "op plaats" overgezet (`brepRefine.ts`, `nearestFace` met een normaaldrempel van 0,95: op gekromde vlakken gaat de
   selectie verloren). SOLIDWORKS heeft één exacte kern. Face fillet, full round, setback, loft/sweep met guide curves,
   wrap en split lines blijven facetten (F51/F121).
3. **Rebuildsnelheid.** Elke wijziging bouwt alles opnieuw (P2-5); SOLIDWORKS herbouwt vanaf de gewijzigde feature.
   Het budget van 45 s is een noodrem, geen werktempo.
4. **Options: 195 van 345 instellingen doen niets** (F112). Een gebruiker die een vinkje zet en geen effect ziet,
   vertrouwt de rest ook niet meer.
5. **Uitwisseling.** STEP-import komt binnen als mesh zonder exacte vlakken (`MenuBar.tsx:172-190`, F161); geen
   DXF/DWG-import, geen Parasolid, IGES alleen schrijven.
6. **Instant3D onvolledig** (rij 7 van de pariteitstabel): slepen aan vlakken en maten in het model werkt maar
   deels.
7. **Grote schetsen zijn traag** (P2-9): honderden gaten in één schets is in SOLIDWORKS gewoon werkbaar.
8. **Tekeningen:** centermarks en verborgen lijnen deels (F122), en geen bijwerken vanuit het modelbestand (punt 1).
9. **Toolbox / standaardonderdelen en design tables in Excel** (CSV in plaats van Excel, rij 44).
10. **Uiterlijk:** iconen en lettertype (F16), taakvenster-iconen (F21), randen van lichamen (F22). Bewust anders om
    juridische redenen (F189), maar het is het eerste wat iemand ziet.
11. **Toetsen en muis:** het meeste is er (middelste knop, Ctrl/Shift/Alt-varianten, wiel naar de aanwijzer, S, D,
    spatie, Ctrl+1…8, pijltjes, muisgebaren). Niet gevonden in `shortcuts.ts`: Tab / Shift+Tab (component verbergen
    en tonen), Ctrl+Tab. Ctrl+Shift+S doet iets anders dan het menu zegt (P3-2). Undo met een open paneel wijkt af
    (P2-15).
12. **Installer niet ondertekend:** Windows SmartScreen waarschuwt bij de installatie.

---

## Tests en CI: wat gedekt is en wat niet

Gedekt: 148 unit-testbestanden (kern, solver, B-rep, kruiscontrole, bestandsformaat, prefs), 4 mutatieproeven,
117 e2e-scripts in drie passes op Linux en Windows, de geïnstalleerde build met zelftest, autosave en Auto-Recover.
De opzet (jobs naast elkaar, logs als artefact, `git diff --exit-code` na elke job) is goed.

Niet gedekt, voor zover ik zag:

- Opslaan tijdens Edit Component (P1-1), herstart met onopgeslagen werk (P1-2), een dode renderer (P2-3).
- Lichaamsverwijzingen na invoegen eerder in de boom (P1-3).
- Options ▸ OK na een losse `savePrefs` (P2-1); documenteigenschappen uit een bestand (P2-2).
- Een bestand van een nieuwere programmaversie met onbekende velden (P2-7); grenzen op patroonaantallen.
- Grote bestanden: autosave boven het quotum, opslaan boven 64 MB (P2-6).
- De OCCT-worker na een fout of een timeout (P2-4).
- Geheugen: geen test die N rebuilds draait en de WASM-heap of het aantal levende OCCT-objecten vergelijkt.
- Dekking wordt niet gemeten; de mutatieproeven zijn er vier.

---

## Volgorde die ik zou aanhouden

1. P1-1, P1-2 (klein, gegevensverlies) met elk een falende test vooraf.
2. P2-11 en P2-12, zodat `npm test` weer een betrouwbare poort is.
3. P2-1, P2-2, P2-3 (instellingen en vastlopen).
4. P1-3 met migratie; daarna P2-13.
5. P2-5(a) tussenstanden per feature en P2-9 opsplitsen van de solver: de grootste winst in snelheid.
6. P2-4, P2-6, P2-7, P2-8, P2-10.
7. Pariteit: eerst punt 1 (meerdere documenten en verwijzingen naar bestanden). Dat is een ontwerpbesluit voor Ian:
   het verandert het bestandsformaat.

---

## Status na verwerking (0.5.15, 2026-11-17)

Eerlijk per punt: "gedaan" alleen als het punt helemaal af is. Rebuildbudgetten en tijdmetingen: **nog te meten, alleen
draaiend** (andere agenten draaiden zware tests; de genoemde tijden zijn ruwe enkelvoudige metingen onder belasting).

| Punt | Stand | Waar | Opmerking |
|---|---|---|---|
| P1-1 Ctrl+S tijdens Edit Component | gedaan | `src/app/editContext.ts`, `MenuBar.tsx` (`saveDocument`, `markSaved`), `desktop.ts` (`handleFor`) | Schrijft het assembly met het bewerkte onderdeel; een handle hoort bij één document-id. Tests: `src/app/saveContext.test.ts`, e2e `e2e/desktop-editsave.mjs` |
| P1-2 herstart software-GL | gedaan | `electron/main.cjs` (`gpu:restart` weigert bij dirty), `preload.cjs`, `src/app/softwareGL.tsx` (`restartForGraphics`) | Save / Don't Save / Cancel vóór de herstart. Tests: `saveContext.test.ts`, `desktop-editsave.mjs` |
| P1-3 lichaam-ids | gedaan | `src/core/features/bodyIds.ts`, `rebuild.ts`, `src/core/document/migrate.ts` | `<featureId>#<k>`, ook vlaklichamen (`surfN`); oude `bodyN`/`surfN` worden bij het openen omgezet; negatieve test in beide kernen (`bodyIds.test.ts`). Restrisico: binnen één feature schuift `k` als die feature meer of minder stukken maakt |
| P2-1 Options OK overschrijft | gedaan | `src/app/prefs.ts` (`patchPrefs`, `changedPrefs`), `options.tsx`, 8 losse schrijvers | Eén schrijfpad; OK schrijft alleen wat in het venster veranderde. Tests: `prefsLayers.test.ts`, `desktop-editsave.mjs` |
| P2-2 doc-eigenschappen | gedaan | `prefs.ts` (`documentProperties`, `setDocumentProperties`), `slices/document.ts`, `slices/features.ts` | Een bestand zet alleen bekende `doc.*` van het juiste type; meteen actief; niet in het profiel; nieuw document = standaard. Test: `prefsLayers.test.ts` |
| P2-3 dode/hangende renderer | deels | `electron/main.cjs` (`render-process-gone`, `unresponsive`, ontvangstbevestiging binnen 5 s), `preload.cjs` | Gebouwd, maar zonder geautomatiseerde test (crash en hang niet nagebootst) |
| P2-4 exacte nabouw | gedaan | `src/core/occt/occtClient.ts`, `kernelPolicy.ts`, `src/workers/occt.worker.ts`, `src/app/brepRefine.ts` | Klok vanaf "started", limiet = budget + laadtijd, `stopped` terug zonder kruiscontrole, verouderde nabouw afgebroken, fouten één keer gemeld, herstart na fatale fout. Unit-tests (`kernelPolicy.test.ts`, `occtClient.test.ts`) |
| P2-5 volledige rebuild | gedaan | `rebuildCache.ts`, `rebuildState.ts`, `src/app/rebuildQueue.ts`, `assembly.ts`, `slices/document.ts` (`reorderFeature`) | (a) tussenstanden per feature, beide kernen; (b) `SYNC_REBUILD_MS` 300 ms; (c) reorder en onderdelen van assemblies via de worker; (d) budget binnen patronen. Test: `rebuildCache.test.ts`. Budget: nog te meten |
| P2-6 autosave | deels | `persistence.ts` (±2 s uitgesteld, zonder inspringing), `positionCodec.ts` (base64 Float32) | Nog naar localStorage, niet via de recover-brug naar schijf |
| P2-7 bestandsformaat | gedaan | `persistence.ts`, `validateFeatures.ts`, `types.ts` | Formaat 3 met `app` en `commit`; een nieuwer bestand opent met een waarschuwing (`MenuBar.tsx` `readKcad`, `TaskPane.tsx`); grenzen per featuretype. Test: `persistence3.test.ts` |
| P2-8 mesh-booleans | gedaan | `src/core/features/meshCheck.ts`, `solid.ts` | Cut/union zonder effect bij echte overlap = fout; geslotenheid op randen. Gaten: alleen binnen 0,1 % volume, zeldzame gedeelde-hoekpuntgevallen. Test: `meshCheck.test.ts` |
| P2-9 schetssolver | gedaan | `src/core/solver/groups.ts`, `lm.ts`, `linalg.ts`, `solver.ts`, `store.ts` (`solveSketchCached` in `solveAll`) | Per samenhangende groep, ijle AᵀA; undo/redo/open lossen alleen gewijzigde schetsen op. Ruw: 541 gaten ±1 s (was 14-30 s). Test: `groups.test.ts` |
| P2-10 rebuild-worker | gedaan | `src/app/rebuildWorkerClient.ts`, `rebuildWorker.ts`, `src/workers/rebuild.worker.ts` | Hergebruik, warme reserve, debounce, `onmessageerror`, waakhond. Test: `rebuildWorkerClient.test.ts` |
| P2-11 testpoort | gedaan | `tools/test-groups.json`, `tools/run-tests.mjs`, `vite.config.ts`, `package.json`, `ci.yml` (job `bibliotheek`) | Eén lijst; `src/qa/testGroups.test.ts` bewaakt hem (vond meteen `typeplaatjeAfzuiging.test.ts`) |
| P2-12 wandklok | deels | `brep.test.ts` e.a. (600 s), `vite.config.ts` (`testTimeout` 120 s), `e2e/lib/wait.mjs` | E2e: 558 van 1657 vaste pauzes vervangen door `settle()`, **1099 over** |
| P2-13 returnToAssembly op naam | gedaan | `src/app/editContext.ts` (`isEditedPart`) | Op `part.id`, de naam alleen voor oude onderdelen zonder id. Tests: `saveContext.test.ts`, `desktop-editsave.mjs` |
| P2-14 regelbegroting | gedaan | `tools/line-length.cjs`, `tools/line-length-baseline.json`, `rebuild.ts` (1909 → 707 regels) | Regels > 200 tekens bevroren per bestand, tekenbudget per module; `rebuildDocument` 1209 → 75 regels (tabel `BUILDERS`). Het functieplafond is alleen een rapport (geen ESLint, niets geïnstalleerd) |
| P2-15 undo met open paneel | gedaan | `src/app/slices/document.ts` (`closeOpenPanel`, rollback begrensd) | Undo annuleert eerst het paneel. Test: `saveContext.test.ts` |
| P3-1 Pack and Go | gedaan | `lifecycleDialogs.tsx`, `main.cjs` (`pack:save`), `preload.cjs` | Eén map kiezen; alleen basisnamen `.kcad`. Test: `desktop-editsave.mjs` |
| P3-2 Ctrl+Shift+S | gedaan | `MenuBar.tsx`, `src/app/shortcutLabels.test.ts` | Save As toont de toets niet meer; de test legt menu en lint tegen de handler |
| P3-3 relatief pad tweede start | gedaan | `main.cjs` (`second-instance`) | Geen test |
| P3-4 release in finally | gedaan | `occt.worker.ts` | |
| P3-5 dirty na await | gedaan | `MenuBar.tsx` (`markSaved`) | Test: `saveContext.test.ts` |
| P3-6 relatieve verwijzingsmarge | gedaan | `tolerance.ts` (`referenceTol`), `edgesets.ts`, `deleteface.ts` | Test: `tolerance.test.ts`. Niet geschaald: het lengtefilter van `matchEdge`, `matchMovedEdge`, `sheetmetal4.ts` |
| P3-7 rang in de solver | gedaan | `linalg.ts` (`rowRank`), `lm.ts` (vouwtest) | Centrale verschillen, genormaliseerde rijen. Test: `groups.test.ts` |
| P3-8 console.warn | gedaan | `solid.ts` (`CadBrush`) | Bij een upgrade van three-bvh-csg de override nakijken |
| P3-9 klok achter wachtrij | gedaan | `occtClient.ts` | |
| P3-10 CI | deels | `ci.yml` (SHA-pins, `npm audit`), `.github/dependabot.yml` | Geen dekkingsmeting (provider niet geïnstalleerd) |
| P3-11 bibliotheektests in src/qa | deels | `tools/test-groups.json` | Eigen groep, script en CI-job; niet verhuisd (qaFitness mocht niet aangeraakt worden) |
| P3-12 CSP | gedaan | `vite.config.ts`, `main.cjs` | `style-src-elem 'self'`; desktop-e2e groen, de geïnstalleerde build niet nagekeken |
| P3-13 volgnummer i.p.v. identiteit | gedaan | `src/app/rebuildQueue.ts` | Test: `rebuildQueue.test.ts` |

### Pariteitslijst

| Nr | Stand | Opmerking |
|---|---|---|
| 1 meerdere documenten, externe verwijzingen | niet | Besluit voor Ian, zie het voorstel hieronder |
| 2 facetten → exact, selectie op gekromde vlakken | deels | `src/app/faceTransfer.ts`: eerst `ftag`, normaaldrempel naar kromming (test `faceTransfer.test.ts`); nog steeds twee kernen na elkaar |
| 3 rebuildsnelheid | deels | Incrementeel (P2-5); budget nog te meten |
| 4 Options zonder effect (F112) | niet | |
| 5 uitwisseling (STEP als B-rep, DXF/DWG, Parasolid) | niet | |
| 6 Instant3D | niet | |
| 7 grote schetsen | gedaan | P2-9 |
| 8 tekeningen | niet | |
| 9 standaardonderdelen, Excel-ontwerptabellen | niet | |
| 10 uiterlijk | niet | bewust anders (F189) |
| 11 toetsen | deels | Tab / Shift+Tab verbergen en tonen een component (`shortcuts.ts`; Shift+Tab toont de laatst met Tab verborgen, niet "onder de aanwijzer"); Ctrl+Tab vraagt meerdere documenten; P3-2 en P2-15 gedaan |
| 12 installer niet ondertekend | niet | certificaat, besluit Ian |

Tellingen: P1 3 gedaan; P2 12 gedaan, 3 deels (P2-3, P2-6, P2-12); P3 11 gedaan, 2 deels (P3-10, P3-11); pariteit 1
gedaan, 3 deels, 8 niet.

Gedraaid: `npm run typecheck` schoon; `npx vitest run` 971 tests, 970 geslaagd, 0 gefaald, 1 overgeslagen (het tijdelijke hulpbestand
`src/qa/fotosAfzuiging74.test.ts` van de afzuiging-agent; zolang het er staat, telt `tools/doc-counts.cjs` 971 i.p.v. 970), groen na
twee aanpassingen (de prefsStore-test zet een doc-optie nu na het nieuwe document, P2-2; `typeplaatjeAfzuiging.test.ts`
in de groep voorbeelden); e2e desktop: `desktop-editsave` 13/13, `desktop` 15/15, `desktop-recover` 21/21;
browser (mesh-pass): editcomponent, dialogopts, prefs112, reorder, multibody, assembly, features groen; release-pass
(`?kernel=brep&rebuild=worker`): brep, rebuildworker, multibody groen. De volledige regressie (117 scripts, 3 passes) is niet gedraaid.

### Voorstel voor Ian: meerdere documenten en externe verwijzingen (niet gebouwd)

Nu bevat een assembly een kopie van elk onderdeel (`component.part`) en een tekening een kopie van het model
(`view.model`). Het referentieprogramma werkt met losse bestanden die naar elkaar verwijzen.

Voorstel:
1. Een component krijgt `ref: { file: <relatief pad>, id: <document-id>, rev: <hash> }`, eerst naast `part` (overgang),
   later in plaats ervan. Openen zoekt het bestand naast het assembly, dan in de zoekpaden; ontbreekt het, dan de
   ingebedde kopie met de waarschuwing "verwijzing niet gevonden".
2. Meerdere open documenten in één venster (Window-menu, Ctrl+Tab), elk met eigen undo, dirty en handle; opslaan van een
   assembly vraagt welke gewijzigde onderdelen mee moeten (Save All).
3. Een tekening verwijst op dezelfde manier naar haar model en werkt bij als het modelbestand verandert.

Gevolgen:
- Bestandsformaat 4 met migratie: ingebedde onderdelen worden bij het opslaan als losse bestanden uitgepakt. Pack and Go
  wordt dan echt nodig om een set te versturen.
- De desktop-brug moet bestanden naast elkaar mogen lezen en schrijven (nu alleen handles uit een dialoog): een map-handle
  per project, met dezelfde padcontrole.
- De browserversie kan geen verwijzingen naar schijf volgen; daar blijft ingebed werken.
- P1-1 en P2-13 verdwijnen als soort fout (opslaan schrijft het onderdeelbestand zelf).
- Grote ingreep in store, Edit Component, tekeningen, autosave/Recovery en e2e; meerdere rondes werk.

### Rebuildtijd: vertraging gevonden en opgelost (2026-11-17, avond)

De treinagent zag `Kabeldoos-bak-links.kcad` van 24,2 s naar ±44 s gaan. Gemeten met een tijdelijke test die de
mesh-rebuild (zonder budget) van dezelfde `.kcad`-bestanden doet, afwisselend op een werkboom van 0.5.14 (`git worktree`
van HEAD) en op deze werkboom. Andere agenten draaiden intussen zware tests (afzuiging, tekeningen): de absolute tijden
schommelen ±30 %, alleen de afwisselende paren zijn te vergelijken. Een meting op een rustige machine blijft **nog te
meten, alleen draaiend**.

Eerste paar (vóór de oplossing): links 32,0 → 45,7 s, rechts 18,0 → 30,2 s. Oorzaak, met een CPU-profiel:
- `isClosed`/`openArea` (P2-8, nieuw) lasten elk hoekpunt via tekstsleutels, drie keer per boolean (lichaam, gereedschap,
  resultaat): ±2,3 s tegen 0,7 s.
- `booleanMissed` (P2-8, nieuw) liep ook op de boekhoud-union van de boss-geschiedenis en bemonsterde alle hoekpunten van
  het grote lichaam: ±4,3 s.
- Rebuildcache en solver waren het niet (cache uit: even traag).

Opgelost in `src/core/features/meshCheck.ts` en `solid.ts`: lassen met numerieke celhashing en de ruwe array, randen tellen
met gesorteerde typed arrays, eerst het resultaat controleren (lichaam en gereedschap alleen als het resultaat open is),
`csg(..., { checks: false })` voor de boss-geschiedenis, en bij `booleanMissed` alleen punten binnen de doos van het andere
lichaam (cut) of van het lichaam dat het volume mist (union). Daarbij een oud knelpunt gevonden: `meshPieces` had een
union-find op tekstsleutels zonder padcompressie (26 s van de 60 s van de linkerbak); nu gehele getallen met padhalvering
en unie op grootte.

Na de oplossing, twee afwisselende paren (0.5.14 → 0.5.15, wandtijd, gemiddelde):

| Model | 0.5.14 | 0.5.15 |
|---|---:|---:|
| Kabeldoos-bak-links | 41,8 s | 27,6 s |
| Kabeldoos-bak-rechts | 19,5 s | 18,0 s |
| Ventilatorkuip (afzuiging) | 63,9 s | 44,3 s |
| Voedingsbox (afzuiging) | 60,8 s | 54,6 s |
| Lastafel (alle onderdelen) | 47,2 s | 46,2 s |

De schetsoplossing van dezelfde bestanden bleef 3-170 ms. Tests na de wijziging: `src/core/features` en de strikte
QA-tests (81 bestanden, 354 tests) groen.
