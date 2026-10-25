# QA-rapport v0.3.3 verwerkt → 0.3.4 (2026-10-25)

Extern rapport: `phlippo-cad-qa-rapport-v0-3-3-uc33.pages.grok.bot` (HEAD 6de9803, oordeel 5/10, NO-GO). Het rapport
vroeg eerst F53, F62 en F55 op te lossen en de CI op Linux groen te krijgen, daarna de SW-look (F14/F63) en de
merknamen. Deze ronde voegt geen nieuwe CAD-functies toe (F58: feature freeze); alles hieronder is herstel, beveiliging,
tests en documentatie.

Statuslegende: **opgelost** (gecontroleerd met een test), **deels** (wat ontbreekt staat erbij), **open** (bewust niet
in deze ronde, met reden).

## Nieuwe bevindingen F53–F76

| ID | Ernst | Status | Wat er veranderd is | Bewijs |
|---|---|---|---|---|
| F53 | Kritiek | opgelost | Nieuwe viewport-brug `src/app/viewport/bridge.ts`: Zoom to Fit, Final Render, snapshots, previews, ViewPane, Take/Restore Snapshot, Locate Profile, schets-opties en Save/Shortcut Bar lopen via de brug. `window.__phlippo*` is alleen nog een spiegel (getters) die `testHooks.ts` in testbuilds zet; de app leest ze nooit. | qa3 (alle haken verwijderd: F en Final Render werken), desktop-installed (geïnstalleerde app zonder haken) |
| F54 | Minor | deels | features.mjs-selector (strict mode) en STL-stap bijgewerkt; rechtsklik opent het contextmenu bij het loslaten (Linux stuurt `contextmenu` al bij het indrukken); de CI draait nu de volledige regressie met Chromium. Linux zelf kon hier niet gedraaid worden: de drawing-checks (Ø35, herstel na reload) slagen op Windows 24/24 en worden in de CI op Linux gecontroleerd. | features 64/64, qa2 17/17, drawing 24/24 |
| F55 | Major | opgelost | `openDocument` valideert, lost op en bouwt opnieuw vóór er iets verandert; een kapot document geeft een foutmelding, laat het open document staan en overschrijft de autosave niet. De crashmelding zegt eerlijk wat Undo en Reload doen. | persistence.test (assembly `part:{}`, drawing `sheets:[{}]`), qa3 |
| F56 | Kritiek | opgelost | SimulationXpress heet nu **Quick Beam Estimate**; elk resultaat staat als "Indicative estimate (beam model)" en zegt uitdrukkelijk dat het niet aantoont dat het onderdeel veilig is. "The part should be safe" is weg. | gf (nieuwe check) |
| F57 | Major | opgelost | 73 scripts falen nu ook bij een page error; `|| true` in features2 vervangen door een echte check (referentiegeometrie in de scène); fixes1 (geen watermerk), surfaces (Trim Surface is een kleine knop) en features (Export Options) bijgewerkt; `npm run e2e:regression` wijst naar het gecommitte `e2e/run-regression.mjs` (cross-platform, exit 1 bij één rood script). | regressie 0.3.4 |
| F58 | Kritiek (proces) | opgelost | Geen nieuwe functies in deze ronde; alleen bevindingen. | git log |
| F59 | Minor | opgelost | `tsconfig.*.tsbuildinfo` uit git, `*.tsbuildinfo` in `.gitignore`. | git |
| F60 | Kritiek | opgelost | Assembly-cut en assembly-gat vangen een mislukte boolean per component af: dat component blijft heel, de feature krijgt een foutmelding, de assembly verdwijnt niet. | asmcut |
| F61 | Minor | opgelost | De tekening registreert zijn eigen "Zoom to Sheet" en ruimt die op bij het sluiten; F past daarna weer het model. | qa3 |
| F62 | Major | opgelost | Viewer-export: model-JSON met `<`, `>`, `&`, U+2028/9 als `\uXXXX`, CSP-meta (`default-src 'none'`), alleen hex-kleuren. | viewerExport.test (`</script>` in naam) |
| F63 | Minor | opgelost | Sheet Metal-tab: Edge/Miter Flange, Hem, Jog, Sketched Bend, Cross-Break, Corners, Forming Tool, Gusset, Normal Cut, Unfold, Fold, Flatten en No Bends grijs zonder plaatwerkbody; 15 eigen plaatwerkiconen (ribbon en boom) in plaats van de generieke. | qa3 |
| F64 | Minor | opgelost | Tolerance Tree zonder schema: "Model dimensions (n)" en één duidelijke, omlopende tekst. | qa3 |
| F65 | Minor | opgelost | De geïnstalleerde app leest `VITE_DEV_SERVER_URL`, `PHLIPPO_E2E` en `PHLIPPO_SMOKE` niet (`app.isPackaged`); `trusted()` vergelijkt exact met de eigen pagina en alleen het hoofdframe van het eigen venster. | desktop-installed (env met dev-URL en E2E: app laadt file:// zonder haken) |
| F66 | Minor | opgelost | Vlaklabels staan op de hoogste hoek van hun vlak en schuiven bij overlap een regel op; een klik op een label kiest dat vlak. | qa3 (geen overlap, klik op "Top Plane" → schets op Top) |
| F67 | Minor | opgelost | `Menu.setApplicationMenu(null)`, `devTools: false` in de geïnstalleerde app, Ctrl+Shift+I/J/C en F12 doen niets. | desktop-installed |
| F68 | Minor | opgelost | De renderer krijgt geen paden meer: open en save werken met een ondoorzichtige handle die het main-proces bijhoudt. | code (`electron/main.cjs`, `src/app/desktop.ts`) |
| F69 | Minor | opgelost | `openExternal` alleen voor een allowlist (github.com, phlippo.be); de app opent zelf geen externe links. | code |
| F70 | Major | opgelost | Validatie over de hele boom (diepte ≤ 64, getallen eindig en ≤ 1e12, geen `__proto__`) plus per onderdeel: componenten (geneste part gevalideerd, positie, rotatie, vlaggen), mates (twee bestaande componenten, waarde), sheets, views (model gevalideerd, schaal > 0, parent bestaat), maten, notities, centre marks. | persistence.test (2 nieuwe tests) |
| F71 | Major | opgelost | Getalvelden weigeren alles boven 1 000 000 (zoals ∞); daarnaast rekenen ze `2*25+5` uit (F42). | qa3 |
| F72 | Major | opgelost | Eén tekst (`src/app/legal.ts`) in About, Welcome, installer (licentiepagina) en Viewer-bestand; de onjuiste zin "niet afgeleid van" is vervangen; docs/06 gecorrigeerd; het woord SOLIDWORKS staat in de broncode alleen nog in `legal.ts`. | qa3, desktop-installed |
| F73 | Minor | opgelost | `LICENSE.txt` (licentie, geen garantie, Quick Beam Estimate is geen veiligheidsbeoordeling) en `THIRD-PARTY-NOTICES.txt` (react, react-dom, scheduler, three, three-bvh-csg, three-mesh-bvh, zustand, electron) in de installatiemap. | desktop-installed |
| F74 | Major | opgelost | `openDocument` zet `editContext` terug; Edit Component zonder geldig part laat de assembly staan. | qa3 |
| F75 | Major | opgelost | Undo voor Suppress/Unsuppress mate, Hide/Show component, Show all, Rename feature, Rename document, tabelcel, Edit Scene. | qa3 |
| F76 | Minor | opgelost | Een mislukte boolean in Interference Detection staat als "Not checked" in de lijst en in de sensor, niet als "geen interferentie". | code (`interference.ts`, `assemblyDialogs.tsx`, `sensors.ts`) |

## Oude bevindingen die deels, open of erger waren

| ID | Status 0.3.3 | Status 0.3.4 | Toelichting |
|---|---|---|---|
| F03 | deels | opgelost | Geen enkele navigatie meer (`will-navigate`, `will-frame-navigate`, `will-redirect`), een gesleept bestand buiten een droppunt doet niets, `trusted()` exact (F65). |
| F05 | deels | opgelost | Zie F70. |
| F10 | open | deels | Slaagt op Windows (drawing 24/24); de CI op Linux draait het script nu mee. |
| F14 | open | opgelost | `noBody` behandelt een document zonder `kind` als part. |
| F16 | open | deels | Plaatwerkiconen eigen ontwerp (F63); de overige iconen en het lettertype zijn ongewijzigd. |
| F18 | open | opgelost | Zie F66. |
| F19, F20, F21, F24 | open | open | Statusbalk, Confirmation Corner, taakvenster-iconen en Modify-box: visuele verschillen die een eigen vergelijkingsronde met de referentieframes vragen. |
| F22 | deels | deels | Randdikte ongewijzigd. |
| F26 | deels | opgelost | `<html lang="en">`. |
| F27 | open | opgelost | Gecontroleerd op 1100×700 en 900×640: de ribbon klapt in met », de Property Panel scrolt. |
| F28 | deels | deels | Auto-browse in de desktop niet apart geverifieerd. |
| F31 | deels | opgelost | Exit 1 bij een page error, volledige regressie in de CI. |
| F32 | deels | opgelost | Alle browserscripts kiezen per platform (Edge/Chromium); het testdocument staat in `e2e/fixtures/`. |
| F33 | deels | deels | Regressie cross-platform en gecommit; `desktop:build` schrijft bewust naar `%LOCALAPPDATA%` (installer buiten OneDrive). |
| F34 | deels | deels | Bundelgrootte ongewijzigd. |
| F35 | open | opgelost | De deprecation-melding van three-bvh-csg (`maxLeafSize`) wordt rond de boolean gefilterd: 0 meldingen in vitest (was 432). |
| F36 | erger | open | De store is niet opgesplitst; zie "Niet gedaan". |
| F37 | open | opgelost | vitest 3 → 5.0.5 (dev-afhankelijkheid); `npm audit`: 0 kwetsbaarheden. |
| F38 | deels | opgelost | Oorzaak gevonden: het oude bash-script las de exitcode verkeerd en telde een crash zonder "FAIL"-regel als groen (full.mjs crashte ook al op 0.3.3). De nieuwe runner kijkt naar de exitcode; README en TASKS geven de regressie van deze build. |
| F39 | deels | opgelost | Edit Component bewaart de undo-stapel van de assembly; Return to Assembly zet hem terug met de componentbewerking als één stap. |
| F40 | deels | opgelost | `fsync` vóór de rename, twee generaties (.bak, .bak2), tmp-bestand opgeruimd bij een fout, een mislukte backup wordt als waarschuwing gemeld. |
| F41 | deels | opgelost | Toolbox ▸ Open vraagt eerst "Save changes?". |
| F42 | deels | opgelost | Rekenexpressies in getalvelden (`(100-4)/3`); "1,000" blijft 1 (komma = decimaalteken). |
| F44 | deels | opgelost | Patroonlimiet 250 (was 2000). |
| F46 | open | deels | Rebuild met tijdsbudget van 45 s: de features erna worden gemarkeerd in plaats van berekend, de app bevriest niet meer minutenlang. CSG in een worker is niet gedaan. |
| F47 | deels | open | Topologische naamgeving vraagt een andere kernel (F51). |
| F48 | deels | deels | Boss en cut zijn nu atomair (eerst alle booleans, dan pas de bodies); een manifold-check ontbreekt nog. |
| F49 | deels | deels | Fuse `enableNodeCliInspectArguments` uit, geen menu/DevTools, env-gates; code signing vraagt een certificaat. |
| F50 | erger | opgelost | Zie F72 en de hernoemlijst in docs/06. |
| F51 | open | open | Mesh-kernel blijft; zie "Niet gedaan". |
| F52 | deels | opgelost | Rechtsklik en muisgebaren werken los van het platform (zie F54). |

## Gevonden tijdens het hertesten

- **Contextmenu buiten beeld.** Het contextmenu van een feature onderaan de boom liep sinds G-B onder de vensterrand door,
  zodat "Delete…" onbereikbaar was. Elk menu schuift nu binnen het venster en scrolt als het hoger is dan het venster
  (full.mjs, nieuwe check).
- **Assembly-cut die een component helemaal wegsnijdt** geeft geen fout meer: dat component verdwijnt, zoals in het
  origineel (asmcut 3/3, in het rapport 2/3).
- **Strengere validatie bij openen.** `size` is op sommige features een aanduiding (M6, 40 x 40 x 4) en wordt niet
  als getal gecontroleerd; oudere tekeningen zonder lijst met notities of centre marks krijgen een lege lijst. Alle
  voorbeeldbestanden (Deurkruk, tekeningen) openen: `examples.check.test.ts`.

## Niet gedaan in deze ronde (met reden)

- **F36 store opsplitsen, F46 CSG in een worker, F47/F51 B-rep-kernel.** Dit zijn architectuurwijzigingen van meerdere
  dagen die elk deel van de app raken. Ze horen in een eigen fase met een eigen plan; deze ronde was herstel zonder
  nieuwe risico's.
- **F49 code signing.** Vraagt een code-signing-certificaat op naam van Ian.
- **F19/F20/F21/F22/F24, rest van F16.** Visuele verschillen; ze vragen een vergelijkingsronde naast de referentieframes.

## Tests van deze ronde

- Unit: 337 tests (nieuw: viewer-escape, assembly/drawing/bereik-validatie, rebuild-budget en patroonlimiet, voorbeeldbestanden).
- e2e: nieuw `e2e/qa3.mjs` (30 checks), uitgebreid `gf.mjs` (F56) en `desktop-installed.mjs` (geïnstalleerde app).
- Volledige regressie: `node e2e/run-regression.mjs` → **79/79 groen** op de definitieve build (log `e2e-out/regression-0.3.4.txt`).
- Installer `Phlippo CAD-Setup-0.3.4.exe` stil geïnstalleerd (Local Storage eerst geback-upt): `desktop-installed.mjs` 10/10 op de geïnstalleerde exe (koppelt via het debugprotocol omdat de inspect-fuse uit staat), `desktop-nohooks.mjs` 4/4, `desktop.mjs` 8/8, `desktop-delete.mjs` groen.
- De hulpscripts `desktop-export/peek/restore-autosave` gebruiken sinds 0.3.4 de onverpakte shell (zelfde profiel), omdat de geïnstalleerde app bewust geen testhaken meer heeft.
