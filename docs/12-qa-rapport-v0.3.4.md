# QA-rapport v0.3.4 verwerkt → 0.3.5 (2026-10-26)

Extern rapport: `phlippo-cad-qa-rapport-v0-3-4-q2bb.pages.grok.bot` en `qa-rapporten/QA-rapport-0.3.4.md` (oordeel 6/10,
NO-GO, 4 van 5 reviewers). Het rapport testte de werkmap van 25-10 om 22:24, vóór de laatste commit van 0.3.4
(f001b13, 22:31). Ook deze ronde voegt geen CAD-functies toe; alles is herstel, tests en documentatie.

Statuslegende: **opgelost** (met test), **deels** (wat ontbreekt staat erbij), **open** (bewust niet, met reden).

## Top 5 van het rapport

| # | Bevindingen | Status | Wat er veranderd is | Bewijs |
|---|---|---|---|---|
| 1 | F74, F41 | opgelost | `withUnsavedCheck` kent de Edit Component-context: Ctrl+N, Ctrl+O, Open, New, Welcome en Toolbox vragen "Return to Assem1 and save the changes?" (Save / Don't Save / Cancel); de context verdwijnt pas na het antwoord. Het venster sluiten vraagt het ook. Make Multibody Part vraagt nu Save / Don't Save / Cancel. | qa4 (Ctrl+N tijdens Edit Component, Cancel houdt de bewerking open) |
| 2 | F10, F54, F57, F31, F82, F84 | Windows opgelost; Linux bleef rood (QA 0.4.8 F93, aangepakt in 0.4.9) | 0.3.4 is gecommit (f001b13) en getagd (`v0.3.4`). drawing.mjs wacht op de toestand van de app in plaats van vaste tijden en legt bij een fout de toestand en een screenshot vast. Eén gedeelde helper `e2e/lib/check.mjs`: elke gefaalde check, page error en onverwachte console-error geeft exit 1; smoke en relations hebben nu echte checks (13 en 14), keys, deletekey en deletekey2 een exitcode; 50 stille catches loggen wat ze overslaan. doorhandle.mjs schrijft naar een tijdelijke map (`UPDATE_EXAMPLES=1` voor de voorbeelden), de CI eindigt met `git diff --exit-code`. | regressie 0.3.5, CI-workflow |
| 3 | F80, F78, F40, F05, F70 | opgelost | Validatie bij openen controleert elk punt waar een schetsentiteit naar verwijst, de radius-parameters, de relaties, de volgorde-lijsten, de schets van elke feature, dubbele feature-id's, het featuretype tegen een lijst van 60 (gelijk gehouden met de Feature-union door een unit test) en lengtes tegen de veldgrenzen (negatief of boven 1 000 000 mm geweigerd). Een model met rebuild-fouten opent met **What's Wrong**; de rode markering staat direct achter de feature (en vóór de rootnaam), de statusbalk meldt het aantal fouten. Opslaan van zo'n model vraagt eerst bevestiging. Interne fouten krijgen een leesbare tekst. | persistence.test, featureTypes.test, qa4 |
| 4 | F50, F77, F92 | deels | Zichtbaar: Hole Wizard → Hole Tool, Toolbox → Standard Parts, Design Library → Part Library, Lifecycle and Collaboration → Share, Smart Fasteners → Auto Fasteners; de kapotte teksten ("Feature Tree Tree Area", "a Auto Tolerancing") hersteld. 355 commentaren en vier zichtbare meldingen die "the original" of videoframes noemden zijn neutraal herschreven (`tools/neutral-comments.cjs`). De CI faalt als er weer een naam of zo'n formulering bijkomt; een unit test bewaakt alle zichtbare tekst (ook dubbele woorden en "a Auto"). **Open:** interne namen (`PropertyManager.tsx`, `doc.dimxpert`, dialog-id `simxpress`) blijven: ze zijn niet zichtbaar en `dimxpert` is een veld van het bestandsformaat. | uiText.test, qa3 (uitgebreide namenlijst), CI |
| 5 | F81, F56, F46 | deels | Getalvelden tonen een rode rand en een melding onder het veld bij weigeren ("Refused: the value must lie between …") of aanpassen ("Adjusted to 0.01mm: -5.00mm is not allowed here (below the minimum)"); het patroonpaneel zegt het als meer dan 250 kopieën gevraagd worden. Quick Beam Estimate toont geen veiligheidsfactor meer maar een grijze "indicative ratio yield / stress (not a safety factor)" met "Not for design decisions" ernaast. **Open:** CSG in een worker (F46). | qa4, gf |

## Overige bevindingen

| ID | Status | Toelichting |
|---|---|---|
| F14 | opgelost | Linear Pattern (met de flyout voor alle patronen) grijs zonder body. qa4. |
| F16 | deels | Ongewijzigd buiten de plaatwerkiconen van 0.3.4. |
| F19 | opgelost | Gecontroleerd tegen referentieframe 82: de statusbalk toont tijdens het schetsen de schetscoördinaten x, y en 0 mm, zoals de referentie. |
| F20 | opgelost | Confirmation Corner in schetsmodus zoals referentieframe 81: een eigen "Exit Sketch"-icoon (schetshoek met terugpijl), een dikke lichtrode X, en beide vaag tot de muis erover komt. |
| F21 | open | Taakvenster-iconen; visuele ronde met referentieframes. |
| F22 | opgelost | Gemeten: randen zijn 1–2 px donker in referentieframe 118 en in de app (e3-part). |
| F24 | opgelost | Gecontroleerd tegen playlist-video 04 frame 41: titel, iconenrij, naam, waarde met spinner, duimwiel en Units-rij, dezelfde rijen. |
| F28 | opgelost | desktop.mjs: een nieuwe assembly in de desktop-app opent de bestandsdialoog (gestubd) en Insert Component. |
| F33 | opgelost | Machinegebonden scripts in `e2e/tools/` met README; de regressie en de desktop-checks draaien in een eigen tijdelijk profiel (`PHLIPPO_USER_DATA`, alleen niet-geïnstalleerd). |
| F34 | deels | Bundelgrootte ongewijzigd. |
| F36 | open | Store opsplitsen: architectuurwerk voor een eigen fase. |
| F38 | opgelost | docs/11 gecorrigeerd (kader bovenaan de nieuwe bevindingen). |
| F46 | deels | Tijdsbudget van 0.3.4; geen worker. De 291 s van filletopts bleek een testfout (een OK-knop die 30 s per stap gezocht werd): nu 23 s. |
| F47, F51 | open | Hangen aan de keuze voor een B-rep-kernel. |
| F48 | opgelost | Na elke boolean een volumecontrole (`booleanVolumeOk`): een cut of doorsnede kan geen materiaal winnen, een unie geen materiaal verliezen; anders wordt de feature gemarkeerd. Unit test. |
| F49 | deels | Code signing vraagt een certificaat; zonder handtekening toont Windows SmartScreen bij de eerste start "Windows heeft uw pc beschermd" → *Meer info* → *Toch uitvoeren*. |
| F79 | opgelost | Final Render wist selectie en hover-markering tijdens het renderen en zet ze daarna terug. qa4. |
| F83 | opgelost | bodyScene gebruikt `TEST_HOOKS`; geen eigen kopie van de voorwaarde. |
| F85 | opgelost | De geïnstalleerde app sluit meteen af (exit 1) bij `--remote-debugging-port`, `--inspect` en verwante switches. desktop-installed.mjs controleert dat op de echte exe. |
| F86 | opgelost | `e2e/leak.mjs` in de regressie (75 bewerkingen en 10 keer New/Open: geometrieën, texturen en shaderprogramma's constant); `timeout-minutes: 90` in de CI. |
| F87 | opgelost | Permissies standaard geweigerd (request- en check-handler). desktop-nohooks. |
| F88 | opgelost | De app draait op `app://phlippo` via `protocol.handle` (bestanden alleen uit `dist/`, met CSP-header), fuse `grantFileProtocolExtraPrivileges: false`. Opgeslagen voorkeuren, recente documenten en autosaves van de oude file://-oorsprong worden bij de eerste start eenmalig overgezet (alleen sleutels die nog ontbreken; het origineel blijft staan). desktop.mjs. |
| F89 | opgelost | Testhaken alleen in de dev-server, in `npm run build:e2e` (`VITE_TEST_HOOKS=1`) en in de onverpakte shell met `PHLIPPO_E2E=1`; een gewone build heeft ze niet. |
| F90 | opgelost | "Tolerance Stack-up Study" heet nu "Tolerance Sum" en zegt dat het de som van alle toleranties is, niet de stack-up van één maatketen. gi. |
| F91 | opgelost | THIRD-PARTY-NOTICES verwijst naar `LICENSES.chromium.html` (zit in de installatie); desktop-installed controleert beide. Geen HDR-bestanden of fonts meegeleverd (systeemfont, eigen iconen). |

## Gevonden tijdens het hertesten

- **Volumecontrole vond een echte fout.** Bij een loft met middellijn faalde de interne vereniging van alle
  boss-gereedschappen (de boekhouding van de featurehistorie: 24000 + 7824 mm³ gaf 18741 mm³). Die boekhouding laat een
  feature nu niet meer falen; de feature zelf was correct gebouwd.
- **Sweep langs een 3D-schets of helix**: het pad is een feature, geen schets. De nieuwe validatie stond dat eerst niet
  toe; paden en geleiders mogen nu ook naar een feature wijzen.
- **Hernoeming**: "Update SpeedPak Subassemblies" was "Update Lightweight Subassembly Subassemblies" geworden; nu
  "Update Lightweight Subassemblies". Alle overige hernoemde termen zijn nagelopen.
- **Dubbele opslagvraag** bij een nieuwe tekening (New-venster én Sheet Format) teruggebracht tot één vraag; ook de
  Drawing-knop van het Welcome-venster vraagt nu.
- **Rootmarkering**: de foutmarkering van de bovenste regel staat vóór de naam, omdat de lange rootnaam buiten de pane
  loopt.

## Rooktest van de geïnstalleerde app (GO-noot van Strati en Riki)

Omdat de geïnstalleerde app nu geen debugpoort meer accepteert, wordt hij van buitenaf getest
(`e2e/desktop-installed.mjs`): bestandsversie gelijk aan package.json, LICENSE/THIRD-PARTY-NOTICES/LICENSES.chromium.html
aanwezig, het programma start en toont zijn venster met titel, crasht niet, en weigert een start met
`--remote-debugging-port` (exit 1, geen endpoint). De inhoudelijke controles zonder testhaken (Final Render, Zoom to
Fit, About, permissies) draaien op dezelfde releasebuild in `desktop-nohooks.mjs`.

## Werkwijze (nieuw)

- Browserregressie: `npm run build:e2e` en daarna `node e2e/run-regression.mjs` (log `e2e-out/regression-<versie>.txt`;
  een deelrun schrijft naar `…-partial.txt`).
- Desktop: `npm run build` (zonder haken), dan `desktop-nohooks`, `desktop`, `desktop-delete`; na installatie
  `desktop-installed`.
- Voorbeelden opnieuw genereren: `UPDATE_EXAMPLES=1 node e2e/doorhandle.mjs`.

## Resultaat van deze ronde

| Stap | Resultaat |
|---|---|
| tsc, unit tests | 0 fouten; 343 tests in 98 bestanden |
| Tekstcontroles | `rename-trademarks --check` en `neutral-comments --check`: 0 treffers |
| Browserregressie (`build:e2e`) | 81/81 groen (`e2e-out/regression-0.3.5.txt`), `voorbeelden/` ongewijzigd |
| Desktop, releasebuild, eigen profiel | desktop-nohooks 8/8, desktop 10/10, desktop-delete groen |
| Geïnstalleerde app 0.3.5 | desktop-installed 9/9 (gebouwd van een schone, getagde tree `v0.3.5`) |
