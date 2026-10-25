# QA-rapport (extern, 24-10-2026) en wat ermee gebeurde

Een extern team van vijf (QA-test, webontwikkeling, optimalisatie, software, risk) beoordeelde Phlippo CAD 0.3.1
tegenover SOLIDWORKS 2026: 52 bevindingen, eindoordeel 4/10, NO-GO voor release. Dit document zet per bevinding
wat er in 0.3.2 veranderde. Status: **✓ opgelost**, **◐ deels**, **✗ bewust niet** (met reden), **→ later**.

## Dataverlies (de GO-voorwaarden)

| ID | Bevinding | Status | Wat veranderde |
|----|-----------|--------|----------------|
| F39 | Rebuild (Ctrl+B) wiste de undo-geschiedenis en zette onbewaard werk op bewaard | ✓ | `rebuildAll()` lost en herbouwt alleen; undo en de ster in de titel blijven (Ribbon, menu, Ctrl+B/Ctrl+Q) |
| F40 | Half-geldig .kcad opende leeg; Ctrl+S overschreef het origineel | ✓ | `parseDocument` valideert elk veld (naam, eenheden, schetsen, punten, maten, features, assembly, tekening) en gooit een `DocumentFormatError` met uitleg; het open document blijft staan. Save in de shell schrijft atomair (tempbestand → `.bak` → rename) |
| F41 | Geen "unsaved changes"-vraag; autosave faalt stil | ✓ | "Save changes to X?" met Save / Don't Save / Cancel bij Open, New, Close, sluitknop en Alt+F4 (shell vraagt via `win:closeRequested`); browser `beforeunload`. Autosave meldt een volle/geblokkeerde opslag als waarschuwing en bewaart per document (laatste 5) voor Document Recovery en Welcome ▸ Recent |
| F05 | Geen schemavalidatie bij openen | ✓ | zie F40; migratietabel per formaatversie; nieuwere bestanden worden geweigerd met de versie erbij |
| F45 | .kcad-koppeling opende een lege app | ✓ | single-instance lock, argv/second-instance/open-file → `file:opened` → het document opent (ook terwijl de app draait) |

## Beveiliging (Electron)

| ID | Bevinding | Status | Wat veranderde |
|----|-----------|--------|----------------|
| F02 | `file:save` schreef naar elk pad | ✓ | de renderer mag alleen paden noemen die het main-proces zelf uitgaf (dialoog of startbestand); anders de dialoog |
| F03 | Geen CSP, geen navigatie-/sender-check | ✓ | CSP in de build (vite-plugin) én als header in de shell; `will-navigate`/`will-redirect`/`will-attach-webview` geblokkeerd; elke IPC-handler controleert `senderFrame`; alleen https naar de systeembrowser |
| F04 | Testhooks in productie | ✓ | `TEST_HOOKS` (dev, browser-build, of `PHLIPPO_E2E=1` → `--phlippo-e2e` in de preload); de desktop-checks zetten de variabele |
| F43 | Decal laadde remote/file:// | ✓ | alleen `data:image/*` (parser en scene) |
| F49 | Fuses, ASAR-integriteit, code signing | ◐ | `electronFuses` (runAsNode uit, NODE_OPTIONS uit, cookie-encryptie aan, ASAR-integriteit aan, onlyLoadAppFromAsar) en `asar: true`. De inspect-CLI-fuse blijft aan: Playwright drijft de geïnstalleerde app via `--inspect` voor de desktop-checks (e2e/desktop-peek*.mjs) en zonder die fuse hangt dat; wie CLI-argumenten kan meegeven heeft de machine al. Code signing vraagt een certificaat → later |

## Invoer en robuustheid

| ID | Bevinding | Status | Wat veranderde |
|----|-----------|--------|----------------|
| F06 | Modify accepteerde 0 | ✓ | lengte > 0, hoek ≥ 0, eindig; anders melding en de box blijft open |
| F07 | Extrude-diepte niet gevalideerd | ✓ | minimum 0.01 in het veld; commit weigert 0/negatief/NaN/∞ voor diepte, hoek (0–360], fillet-grootte |
| F08 | Extrude op lege schets | ✓ | Extrude/Revolve op een schets zonder contour of ketting wordt geweigerd (start en commit) |
| F42 | Numerieke invoer en eenheden | ✓ | `parseValue`: `2in`, `3cm`, `1m`, `30deg`, `0.5rad` worden omgerekend naar de veldeenheid; letters/∞/meerdere getallen laten de waarde staan; `updateFeatureDraft` laat geen niet-eindige getallen door |
| F44 | Geen limiet op patroonaantal / bestandsgrootte | ✓ | 2000 instanties (preview afgekapt, commit geweigerd met melding); bestanden > 64 MB geweigerd (app en shell) |
| F47 | Geen topologische naamgeving | ◐ | verloren randreferenties worden gemeld ("Warning: n of the m edge references could not be found…") en de feature bouwt met de rest; echte naamgeving vraagt een B-rep-kern → later |
| F48 | CSG niet gecontroleerd, toleranties inconsistent | ✓ | `csg()` gooit bij een leeg of niet-eindig resultaat; elke feature zit in een eigen try/catch (één fout breekt nooit de hele rebuild); toleranties in `core/features/tolerance.ts` |

## Uiterlijk en gebruik

| ID | Bevinding | Status | Wat veranderde |
|----|-----------|--------|----------------|
| F13/F30 | Welkomstscherm met al geopend Part; geen welkom na reload | ✓ | start zoals SW: lege app (CommandManager grijs, geen FeatureManager), Welcome erover, autosave onder Recent Documents / Document Recovery; "Do not show at startup" |
| F14 | Featurecommando's actief zonder body | ✓ | zonder document is alles grijs; met leeg part zijn Cut/Fillet/Shell/… al grijs (`noBody`) |
| F15 | Groot P-watermerk | ✓ | weg |
| F17 | Isometric i.p.v. Trimetric | ✓ | nieuwe documenten openen in *Trimetric (Ctrl+7 blijft Isometric) |
| F29 | Delete child features standaard aan | ✓ | nu zoals SW: absorbed aan, child uit |
| F52 | Enter-herhaling en muisgebaren | ✓ | Enter herhaalt het laatste CommandManager-commando; rechts-slepen toont het gebarenwiel (4): part/assembly Top/Front/Left/Right, schets Line/Smart Dimension/Circle/Corner Rectangle |
| F23 | Placeholder-iconen in Extrude-PM | ✓ | eigen diepte- en draft-hoek-iconen |
| F26 | Nederlandse fouttekst | ✓ | alle meldingen Engels |
| F28 | Insert Component opent geen bestandsdialoog | ✓ | nieuwe assembly (ook via Welcome) start Begin Assembly en opent de bestandsdialoog (prefs Start/Auto browse) |
| F50 | Merknamen, geen disclaimer | ✓ | Help ▸ About: onafhankelijk product, niet verbonden met Dassault Systèmes; zie ook docs/06 |
| F16 | Iconen/lettertype wijken af | ✗ | bewust: eigen iconenset (docs/06); lettertype is Segoe UI zoals SW |
| F18 | Vlakkeuze ziet er anders uit | ✗ | onze weergave is gemeten op de videoframes (oranje omtrek + label) |
| F19 | Statusbalk zonder X/Y/Z-labels | ✗ | SW toont de coördinaten ook zonder labels (frame f_0070/f_0111) |
| F21 | Task pane 10 i.p.v. 11 iconen | ✗ | frame f_0118 toont 10 iconen |
| F20, F22, F24, F27 | confirmation corner, randdikte, extra Modify-rij, klein venster | → | geen frame-bewijs; later met metingen |

## Prestaties en kwaliteit

| ID | Bevinding | Status | Wat veranderde |
|----|-----------|--------|----------------|
| F01/F36 | WebGL-geheugenlek | ✓ | elke rebuild ruimt geometrie en gekloonde materialen op (bodies, randen, extra's, reflecties, decals, curves, preview); `BodyScene.dispose()` bij unmount; `webglcontextlost`-melding; e2e meet `renderer.info.memory` over 30 edits |
| F34 | Bundel 2,48 MB | ✓ | chunks three / csg / react |
| F35 | Verouderde BVH-optie | ✗ | de waarschuwing komt uit three-bvh-csg zelf (niet uit onze code) |
| F37 | Kwetsbare dev-dependencies | → | vitest/tinypool vragen een major-upgrade (`npm audit fix --force`); geen productie-afhankelijkheden geraakt |
| F46 | Rebuild/solver op de UI-thread | → | worker en incrementele rebuild staan op de lijst |
| F51 | Mesh-kern zonder B-rep | → | strategisch; zie het advies "proef met een B-rep-kern" |

## Tests en proces

| ID | Bevinding | Status | Wat veranderde |
|----|-----------|--------|----------------|
| F31 | E2E meldde falen niet (exit 0), geen CI | ✓ | elk check-script zet `process.exitCode = 1` bij een gefaalde check; `run-regression.sh` logt per script de exitcode en telt; `.github/workflows/ci.yml` (typecheck, vitest, build, e2e op `vite preview`) |
| F32 | Niet-hermetische/verouderde tests | ◐ | endconditions (Through All - Both) en Full Round (drie face sets) bijgewerkt; nieuwe `e2e/qa1.mjs` (26) en `e2e/qa2.mjs` (17), unit tests voor het bestandsformaat |
| F33 | Machinegebonden scripts | ✓ | `PW_CHROMIUM` / `PW_CHANNEL` uit de omgeving; standaard Playwright-chromium op Linux |
| F09–F12 | Full Round, Ø-maat, tekening herstellen, Insert Component, Standard 3 View | ✓ | op de huidige code slagen filletopts 16/16, drawing 24/24, assembly 21/21, drawingfix (Standard 3 View) |
| F38 | README en TASKS inconsistent | ✓ | README-status en TASKS bijgewerkt |
