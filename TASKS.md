# Taken - Phlippo CAD

## Lokaal werken: video-referentie vergelijken met de app (2026-10-20)
- [x] Controleren dat Node, Git, Python, yt-dlp en ffmpeg geïnstalleerd zijn
- [x] Project lokaal beschikbaar op branch `claude/fase1-schetser` (stond al in `Phlippo CAD\Claude`)
- [x] YouTube-video https://youtu.be/jhaPTx056vI downloaden met yt-dlp naar `referentie-video/`
- [x] Elke 5 seconden een frame uit de video halen met ffmpeg naar `referentie-video/frames/`
- [x] Dev-server starten (`npm run dev`) en de app openen op http://localhost:5173
- [x] Interface in de frames vergelijken met de app en de verschillen opsommen
- [x] Verschillen noteren in `docs/05-vergelijking-video.md`

## Vervolg: bugs en video-afwijkingen oplossen (2026-10-20)
- [x] Lijst van bugs van de gebruiker ontvangen en reproduceren (vervallen: de QA-rapporten namen dit over)
- [x] Statusmelding "Select a plane…" wissen zodra de schets start; lege schets = Under Defined (nagekeken 2026-10-27: klopt)
- [x] e2e-scripts lokaal laten draaien (Edge via `channel: 'msedge'` i.p.v. Linux-pad) (nagekeken 2026-10-27: gedaan in een latere ronde)
- [x] Verschillen 1–7 uit `docs/05-vergelijking-video.md` doorvoeren (fase 1) (achtergrond, arcering, relatie-iconen, maattekst, punten, viewnaam, vlakkenkeuze)

## Tekenfuncties repareren en uiterlijk 1-op-1 met de video (2026-10-20)
- [x] Invoercode van viewport/tools lezen en elk schetsgereedschap met echte muisbewegingen testen (klik-klik én slepen)
- [x] Vlakkenkeuze testen (hover, klik in viewport, klik in tree) en repareren
- [x] Gevonden tekenbugs repareren (slepen voor alle tools, lege schets, statusmelding, thema)
- [x] Smart Dimension, relaties, selectie en Esc/undo opnieuw testen (e2e 66/66)
- [x] Kleuren en achtergrond naar de video (wit venster, grijze arcering, felgroene relatie-iconen, maattekst)
- [x] Vlakkenkeuze-weergave, viewnaam "*Top", PropertyManagers (Rectangle, Dimension, Edit Sketch) naar de video
- [x] CommandManager Sketch-tab raster en tabs naar de video
- [x] Statusbalk, heads-up toolbar, fly-out FeatureManager naar de video
- [x] e2e lokaal laten draaien via Edge en alles opnieuw vastleggen naast de frames

## Smart Dimension, schermvullende app en desktop-app (2026-10-20)
- [x] Smart Dimension zoals het origineel: maat hangt aan de cursor, twee punten = horizontaal/verticaal/schuin, Modify krijgt focus
- [x] `start-app.cmd`: app als eigen venster zonder browserbalk, schermvullend (Edge app-modus)
- [x] Echte desktop-app (Electron) met eigen venster, bestandsdialogen (.kcad openen/opslaan) en installer
- [x] Vensterknoppen (— ☐ ✕) in de titelbalk werkend maken in de desktop-app

## Fase 2: 3D-features op een solid-kern (2026-10-20)
- [x] Datamodel: feature-types (extrude, cut, revolve), vlakken op bodyvlakken, persistentie (.kcad), rebuild-pipeline `src/core/features/` + unit tests
- [x] Mesh-kern: gesloten contour → prisma (Blind, Mid Plane, twee richtingen), omwenteling → lathe; union/subtract via three-bvh-csg
- [x] Viewport: bodies "Shaded With Edges", vlakken van bodies hover (oranje) en selecteren (blauw), schets starten op een vlak
- [x] Boss-Extrude / Cut-Extrude / Revolve PropertyManager met gele preview, Confirmation Corner, Features-tab knoppen werkend
- [x] Feature tree: Boss-Extrude1 met schets als kind, Solid Bodies(n), rollback, verwijderen, Edit Feature / Edit Sketch
- [x] Display styles (shaded, shaded with edges, wireframe, hidden lines) en Zoom to Fit met bodies
- [x] e2e: BasePlate uit de video nabouwen (80×80, Ø35, extrude 10, cut) — `e2e/features.mjs`, 10/10
- [x] Docs en README bijwerken (fase 2 basis gereed)

## Sneltoetsen, muis en vensterknoppen zoals het origineel (2026-10-20)
- [x] Officiële lijst opgezocht (help.solidworks.com "Selected Keyboard Shortcuts"): pijltjes 15°, Shift 90°, Alt rollen, Ctrl pannen, Z/Shift+Z, F, Space, Ctrl+Space, Ctrl+1…8, Ctrl+Shift+Z, S, D, Enter, Shift+C, R, Ctrl+B/Q/R, F9, F11
- [x] Niet-officiële lettertoetsen (C, A, N, P, M, X, R=rechthoek) verwijderd; alleen L = Line; S = shortcut bar
- [x] Muis: Alt+middenknop rollen, dubbelklik middenknop Zoom to Fit, wiel zoomt op de cursor (getest), Ctrl tijdens schetsen = geen automatische relaties
- [x] Vensterknoppen rechtsboven: ☐ schermvullend/terug (F11), ✕ document sluiten, — pas in de desktop-app

## Fillet en Chamfer (2026-10-20, avond)
- [x] Knikranden van bodies bepalen (T-kruisingen van booleans genegeerd) en groeperen tot rechte/cirkelvormige randen
- [x] Randen aanwijzen (oranje) en selecteren (blauw) in de viewport
- [x] Fillet en Chamfer als features (tool-prisma per randsegment, boolean), referenties die een rebuild overleven
- [x] PropertyManager Fillet / Chamfer, fly-out onder Fillet in de Features-tab, preview, feature tree
- [x] Tangentranden tekenen, gladde normalen over facetten, Cut standaard het materiaal in
- [x] Tests: 45 unit tests, e2e features 16/16 (incl. volumecontrole van de cut)
- [x] Vervolg fase 2: Shell, Linear/Circular Pattern, Hole Wizard, Sweep/Loft, Mirror (nagekeken 2026-10-27: gedaan in een latere ronde)

## Fase 2b: Mirror, patronen, Hole Wizard, Shell, Sweep/Loft (2026-10-20, nacht)
- [x] Datamodel + kern: Mirror (body spiegelen om vlak, union), Linear/Circular Pattern (feature-geometrie herhalen), Hole Wizard (simple, counterbore, countersink) + unit tests
- [x] Rebuild-integratie: mirror, patronen, holes in de feature-volgorde; feature tree met iconen en namen (Mirror1, LPattern1, CirPattern1, Hole1)
- [x] PropertyManagers: Mirror (Mirror Face/Plane, Bodies), Linear Pattern (Direction 1/2, spacing, count), Circular Pattern (axis, angle, count), Hole Wizard (Type, Specifications, End Condition, Positions)
- [x] Ribbon: Mirror, Linear Pattern ▾ Circular Pattern, Hole Wizard werkend
- [x] Snijgereedschappen beginnen 0,5 mm boven het schetsvlak (geen coplanaire kappen); randdetectie filtert binnenranden van vlakke zijden met een sondetest
- [x] Shell: body uithollen met dikte en te verwijderen vlakken (offset via snijding van verschoven vlakken; exact voor polyeders en facetten)
- [x] Randen van bodies robuust na booleans: buren op afstand tot de lijn, negatieve-nul-sleutels, samengevoegde koorden (12 rechte randen + 4 rimmen op de testplaat)
- [x] Sweep (profiel langs pad-schets) en Loft (tussen twee profielen): kern + unit tests, Ribbon-knoppen, PropertyManager (pad / tweede profiel kiezen), feature tree, e2e Sweep
- [x] e2e: Hole Wizard (counterbore, 2 posities), Linear Pattern van de cut, Mirror om Right Plane op de BasePlate — features 22/22; docs bijwerken

## Schermfouten uit de foto's van de gebruiker (2026-10-20, laat)
- [x] Shell: waaierlijnen en kapotte buis rond het kleine gat → holte uit de bouwgeschiedenis (boss-offset min vergrote snijgereedschappen), splinter-driehoeken zonder vlak, T-kruisingen tellen mee in de hoekpunt-offset
- [x] Randtekening: splinters op vlakke zijden krijgen de normaal van hun vlak (geen losse lijnen meer)
- [x] Hole Wizard-preview: blauwe waaier over de hele body → overlay van geselecteerde vlakken gebruikt de eigen body-geometrie, Hole Wizard wist de vlakselectie
- [x] Hover/selectie van cilinder- en filletvlakken als één vlak (oranje/blauw over het hele vlak), schets op gebogen vlak geweigerd
- [x] Alles opnieuw getest: unit 59, e2e features 28/28, full 66/66, smoke en relations zonder fouten

## Fase 7 (deel): Evaluate — Measure en Mass Properties, STL in/uit (2026-10-20, nacht)
- [x] Kern src/core/features/measure.ts: volume, oppervlak, zwaartepunt, traagheidstensor (divergentiestelling), hoofdassen (Jacobi) + unit tests
- [x] Mass Properties-dialoog zoals het origineel (dichtheid, massa, volume, oppervlak, zwaartepunt, hoofdassen, traagheidsmomenten; Copy to Clipboard)
- [x] Measure: zwevend venster, selectie van randen/vlakken telt op zonder Ctrl; lengte, diameter, afstand (dX/dY/dZ), oppervlak, omtrek
- [x] Evaluate-tab en Tools-menu: Measure en Mass Properties werkend
- [x] File > Save As > STL (binair) en File > Open van .stl als geimporteerde body (feature "Imported1", binnenstebuiten-meshes omgedraaid)
- [x] e2e: Mass Properties (volume klopt), Measure van een rand (80 mm), STL-export en -import — features 36/36; docs bijwerken

## Desktop-app (Electron) (2026-10-20, nacht)
- [x] electron en electron-builder installeren; electron/main.cjs (venster zonder eigen rand, laadt dist of de dev-server) en preload.cjs (venster, bestanden)
- [x] Vensterknoppen — ☐ ✕ in de titelbalk sturen het echte venster; Open/Save As via eigen bestandsdialogen (.kcad, .stl), Save onthoudt het pad
- [x] Scripts: npm run desktop (dev), desktop:start, desktop:build (installer buiten OneDrive), e2e:desktop; start-desktop.cmd
- [x] Controle: e2e desktop 7/7 (brug, maximize/restore, titel); installer (Setup) en portable exe gebouwd in %LOCALAPPDATA%\PhlippoCAD
elease; README en docs/04 bijgewerkt

## Fase 3: Equations en Global Variables (2026-10-20, nacht)
- [x] Kern src/core/document/equations.ts: expressie-parser (+ - * / ^, functies in graden, "namen" tussen aanhalingstekens), maatnamen D1@Sketch1 / D1@Boss-Extrude1, evaluatie met afhankelijkheden en cirkeldetectie, toepassen op schetsmaten en feature-maten + unit tests
- [x] Document: equations[] in .kcad (oudere bestanden krijgen een lege lijst)
- [x] Dialoog "Equations, Global Variables, and Dimensions" (Tools > Equations): Equation/Dimension/Ordered View, Global Variables en Equations met Evaluates to, toevoegrijen, fouten rood, Automatically rebuild, Angular units
- [x] Modify-box: "=" typen maakt van de maat een vergelijking; Σ-voorvoegsel op gekoppelde maten; map "Equations" in de tree
- [x] Store: vergelijkingen worden toegepast voor elke solve/rebuild (globale variabele wijzigen = model volgt); undo/redo
- [x] e2e: "Width" = 100 stuurt D1@Sketch1, plaat groeit, Equations-map in tree, undo — features 43/43

## Fase 4: Assemblies (2026-10-20, nacht)
- [x] Datamodel: Document.kind 'part' | 'assembly', components (ingebed part-document, transform, fixed) en mates (coincident, concentric, distance, parallel, perpendicular, tangent, angle, lock) in .kcad; New > Assembly
- [x] Kern src/core/assembly/: rebuild van componenten naar wereld-bodies (cache per onderdeel), mate-solver (iteratief), cilinder-as uit facetvlakken; 5 unit tests
- [x] Store en viewport: componenten tonen, selectie van vlakken per component, Move Component (slepen binnen de vrijheidsgraden) en Rotate Component, eerste component (f) vast, Fix/Float, Hide/Show
- [x] Assembly-tab in de CommandManager (Insert Components, Mate, Move/Rotate Component, Show Hidden, BOM, Interference Detection; patterns/fasteners/exploded view later), PropertyManagers Insert Component en Mate (Mate Selections, Standard Mates, alignment, afstand/hoek, Advanced/Mechanical als lijst)
- [x] FeatureManager voor assemblies: Assem1 ▸ History, Sensors, Annotations, vlakken, Origin, (f) Plate<1>, (-) Plate<2> (met features), Mates ▸ Coincident1 (Plate<1>,Plate<2>); contextmenu Fix/Float, Hide, Move, Rotate, Mate, Delete
- [x] Mass Properties en Measure werken op de wereld-bodies; Bill of Materials (ITEM NO./PART NUMBER/QTY./MASS); Interference Detection (bbox + CSG-intersectie, volume per paar)
- [x] e2e/assembly.mjs 18/18: plaat bouwen, New Assembly, 2x invoegen, Coincident + Concentric, BOM, Interference, Move Component, herladen; docs

## Instellingen (Tools > Options) zoals het origineel (2026-10-20, nacht)
- [x] Officiële indeling opgezocht (help.solidworks.com 2024): System Options-categorieën General … Export, Document Properties Drafting Standard … Performance
- [x] Dialoog "System Options - General": tabbladen System Options / Document Properties, categorielijst links, Search Options, Reset…, OK/Cancel/Help; alle pagina's met de echte opties en standaardwaarden
- [x] Instellingen die echt werken: pijltjes-stap, wiel omkeren, zoom to fit bij standaardaanzichten, achtergrond Light/Dark, tangent edges visible/phantom/removed, hidden edges solid/dashed, entity points, Confirmation Corner, Input dimension value, tree filter, spin box-stappen, decimalen, raster (minor lines, snap points)
- [x] Opslag in localStorage (systeem, alleen afwijkingen) en in het document (doc.properties); e2e features 49/49; docs

## Controle met de volledige playlist (58 video's, 15 u) — na de download
- [x] Playlist downloaden (720p) met frames om de 15 s en contactvellen per video: referentie-video/playlist/ (alle 58, de laatste 10 op 2026-10-27)
- [x] Per video de contactvellen bekijken en alles wat gebouwd is vergelijken (interface, PropertyManagers, gedrag); de laatste 10 in docs/24-playlist-video-08-58.md

## Fase 5: Tekeningen (2026-10-20/21, nacht)
- [x] Datamodel: Document.kind 'drawing', sheets (formaat A4/A3/A2/A1/A0/ANSI A-D, liggend/staand, schaal), views (type front/top/right/left/back/bottom/iso, positie, schaal, bron-document ingebed), maten en notities; New > Drawing met het "Sheet Format/Size"-dialoog
- [x] Kern src/core/drawing/: projectie van bodies naar 2D (feature-randen + silhouetten), hidden line removal met BVH-raycasts, zichtbare (dik) en verborgen (streep) lijnen; unit tests op een plaat met gat
- [x] Tekenblad in de viewport: wit blad met rand, titelblok (Sheet Format), zoom/pan, views verslepen, uitlijning van geprojecteerde views, schaal (Sheet Scale 1:1, 1:2 …)
- [x] CommandManager-tabs View Layout (Standard 3 View, Model View, Projected View, Auxiliary, Section, Detail…), Annotation (Smart Dimension, Note, Center Mark, Centerline…), Sketch, Evaluate, Sheet Format; PropertyManagers Model View (Browse, Orientation, Display Style, Scale) en Projected View
- [x] Smart Dimension op tekenranden (lengte, afstand tussen evenwijdige lijnen, diameter van cirkels) met de werkelijke modelmaat; Center Mark op cirkels; Note
- [x] FeatureManager voor tekeningen: Draw1 ▸ Annotations, Sheet1 ▸ Sheet Format1, Drawing View1 ▸ Plate<1> …; statusbalk "Editing Sheet1", schaal
- [x] Opslaan/herladen (.kcad); e2e/drawing.mjs 17/17; docs (afdrukken/PDF via File > Print blijft de browser/desktop-printdialoog)

## Uit de playlist-controle (2026-10-21)
- [x] Fillet PM naar SW 2024/2025 (Manual/FilletXpert, Fillet Type, preview-radio's, Symmetric/Profile, Partial Edge/Setback/Options), callout met straal in het beeld
- [x] S-toets als iconenpalet met fly-outs en beschrijving (schets / part / assembly)
- [x] RMB-menu tijdens Extrude met eindcondities (Direction 1/2), OK/Cancel
- [x] Hole Wizard: Standard/Type/Size/Fit (ISO 273), Show custom sizing, Restore Default Values, Options
- [x] Material-dialoog (bibliotheek, Properties-tabel, Apply → dichtheid/kleur), Material in de tree
- [x] Modify-box: spin-increment, duimwiel, Units-rij
- [x] Thin Feature (open profiel → wand; One-Direction/Mid-Plane/Two-Direction, Reverse), automatisch bij een open profiel, naam Extrude-Thin1; unit tests + e2e
- [x] Tree: waarschuwing op het topknooppunt bij rebuild-fouten
- [x] Reference Geometry > Plane (Offset Distance met aantal, At Angle om een rechte rand, Parallel/Coincident), Plane1 in de tree en in het beeld, schets erop
- [x] Modify-box: lijstje met globale variabelen/functies bij een vergelijking (zoals het origineel)
- [x] Selected Contours bij Extrude/Revolve (per gebied aan/uit in de PM)
- [x] Straight Slot en Centerpoint Straight Slot (2 lijnen + 2 bogen + constructie-middellijn, 4x tangent + equal), preview met L/W, fly-out, S-palet, Tools-menu; e2e/slot.mjs 7/7
- [x] Shift+klik op een boog/cirkel bij Smart Dimension = maat tot de rand (Arc Condition Min; solver, tekening en waarde volgen); Slot PM met Slot Types / Add dimensions / Center to Center
- [x] Nog 10 video's niet gedownload (YouTube-botcontrole: 08, 09, 35, 46, 53–58): op 2026-10-27 alsnog binnengehaald zonder cookies

## Configuraties (ConfigurationManager, video 19) (2026-10-21)
- [x] Datamodel: Document.configurations (naam, omschrijving, maten per naam, onderdrukte features), activeConfiguration; Component.configuration in assemblies
- [x] Kern src/core/document/configurations.ts: lijst (Default), vastleggen/toepassen van een configuratie, toevoegen/verwijderen/hernoemen; unit tests
- [x] ConfigurationManager-tab: "<naam> Configuration(s) (<actief>)", lijst met vinkje, dubbelklik = activeren, RMB Add Configuration / Delete / Properties
- [x] Modify Configurations-tabel (Configure Dimension / Configure Feature): kolommen per maat, rij "< Creates a new configuration. >", OK/Cancel/Apply/Help
- [x] Modify-box: "This Configuration / All Configurations / Specify Configuration(s)" bij meer dan één configuratie
- [x] Assembly: configuratie per component (contextmenu + PM), naam in de tree "PLATES<1> (210)", rebuild per configuratie; Mass Properties telt alle componenten op
- [x] Opslaan/herladen, e2e-checks, docs/07 + README

## Rib-feature (video 10, ORG TRAY) (2026-10-21)
- [x] Kern src/core/features/rib.ts: open schets (lijn/boog/ketting) groeit tot aan het lichaam (ray-casts met BVH), uiteinden automatisch verlengd tot de wanden, verre zijde volgt het lichaam; Parallel/Normal to Sketch, First/Both/Second Side, Flip material side; 4 unit tests
- [x] RibFeature in het datamodel (D1@Rib1 = dikte), rebuild (union + geschiedenis voor Shell), gele preview in het beeld (ook bij Edit Feature)
- [x] Rib PM zoals het origineel: Parameters (Thickness met 3 zijde-iconen, waarde, Extrusion direction met 2 iconen, Flip material side, draft), Selected Contours; Rib-knop in de Features-tab; icoon in de tree
- [x] e2e/rib.mjs 9/9 (vin op een plaat vanaf een lijn op het Front Plane, volume = breedte x hoogte x dikte, Edit Feature)
- [x] Draft-hoek van de rib wordt opgeslagen maar nog niet op de mesh toegepast (nagekeken 2026-10-27: gedaan in een latere ronde)

## Extrude met Draft (video 29, LEG BASE) (2026-10-21)
- [x] ExtrudeFeature.draft (hoek, Draft outward); taps toelopende extrusie in de kern (offset-ringen per hoogte, gesplitst op het schetsvlak bij Mid Plane / Direction 2, gaten mee); D@ draft.angle in Equations; 4 unit tests
- [x] Extrude PM: Draft On/Off-knop, hoekveld, Draft outward (zoals Direction 1 in het origineel); e2e in e2e/rib.mjs
- [x] Revolve PM: Direction2 en Selected Contours (video 17)

## Eindcondities en sensors (video 40, 31) (2026-10-21)
- [x] Extrude: Up To Next (ray vanuit het profielcentrum tot het eerste vlak), Up To Surface en Offset From Surface (vlak kiezen in het beeld, Reverse offset; ook schuine vlakken via half-ruimte-doorsnede); in de PM-lijst en het RMB-menu; gele preview tegen het lichaam; 4 unit tests
- [x] Sensors-map in de tree: RMB Add Sensor ▸ Mass / Volume / Surface Area, "Mass1 (1234.56 grams)" volgt de rebuild; Delete
- [x] Up To Surface / Offset From Surface ook met een referentievlak als eindvlak (klik op Plane1 in de tree)
- [x] Center Rectangle tekent beide constructie-diagonalen (video 48); donker thema: neutraal grijs beeldvlak (video 43)
- [x] Up To Vertex en Up To Body (hoekpunt-selectie ontbreekt nog) (nagekeken 2026-10-27: gedaan in een latere ronde)

## Multi-body (video's 11, 44, 45, 52) (2026-10-21)
- [x] Kern: Merge result (uit = aparte body), een boss die niets raakt wordt een nieuwe body, meerdere geraakte bodies versmelten; cuts/holes/patronen werken op de bodies die ze raken (Auto-select) of op de Feature Scope; verborgen bodies doen niet mee; fillet/chamfer op de body met de randen; shell op de body van het gekozen vlak; 5 unit tests
- [x] Combine-feature (Add / Subtract / Common) met PM (Operation Type, Main Body, Bodies to Combine); Insert ▸ Features ▸ Combine…
- [x] Solid Bodies-map: RMB Hide/Show Body (cursief), Material… per body (naam achter de body, kleur in het beeld, dichtheid in Mass Properties en sensors), Combine…
- [x] Extrude PM: Merge result aanvinkbaar, Feature Scope (All bodies / Selected bodies, Auto-select) bij meer dan één body
- [x] Insert-menu: Boss/Base ▸ Extrude/Revolve, Cut ▸ Extrude, Features ▸ Fillet/Shell/Rib/Combine, Reference Geometry ▸ Plane werken nu
- [x] e2e/multibody.mjs 14/14 (twee bodies, Hide/Show, materiaal per body, Merge result uit, Combine, Feature Scope, herladen)
- [x] Delete Body, Move/Copy Body, Bodies to Keep bij een cut die een body splitst (Move/Copy en Bodies to Keep in 0.4.3)

## Sheet metal, basis (video's 16, 21, 24, 26, 32–38, 50, 54, 56) (2026-10-21)
- [x] Kern src/core/features/sheetmetal.ts: Base Flange uit een open schets (wand met buigradius op elke hoek: binnen r, buiten r + t), Tab uit een gesloten schets, Edge Flange (buiging + been langs een rechte rand; Outer/Inner Virtual Sharp, Tangent Bend; Material Inside/Outside; Flip; hoek), bend allowance met K-factor, Flat Pattern (ontwikkelde lengte); 5 unit tests
- [x] Datamodel: Document.sheetMetal (T1, buigradius, K), features baseFlange / edgeFlange / flatPattern (Flat-Pattern1 altijd onderaan, standaard onderdrukt); rebuild met merge; gele preview
- [x] Sheet Metal-tab: Base Flange/Tab, Edge Flange, Flatten (overige knoppen "later"); PM's zoals het origineel (Sheet Metal Parameters From Material, Direction 1, Gauges, Sheet Metal Parameters, Bend Allowance, Auto Relief; Flange Parameters, Angle, Flange Length, Flange Position); Sheet-Metal1 in de tree met eigen PM
- [x] e2e/sheetmetal.mjs 14/14 (L-profiel → Base-Flange1, Edge-Flange1 op de bovenrand, Flatten/terugvouwen, dikte wijzigen, herladen)
- [x] Miter Flange, Hem, Jog, Sketched Bend, Corners, Unfold/Fold, Convert to Sheet Metal, buiglijnen in de flat pattern, gauge tables (nagekeken 2026-10-27: gedaan in een latere ronde)

## Section View (heads-up toolbar) (2026-10-21)
- [x] Section View-knop in de Heads-up View toolbar: PM zoals het origineel (Drawing Section View, Section Method Planar/Zonal, Section Options met Show section cap, Section 1 met vlak-iconen Front/Top/Right, Offset distance, Flip Direction, Edit Color; Section 2/3, Selected Bodies)
- [x] Weergave: het model wordt met een halfruimte-doorsnede (CSG) getoond met gesloten snijvlak (section cap); het echte model blijft heel (Mass Properties, selectie); de knop blijft actief en schakelt de doorsnede weer uit
- [x] e2e/section.mjs 9/9
- [x] Doorsnedevlak met pijlen in het beeld, Zonal, draaihoeken X/Y, kleur van het snijvlak (nagekeken 2026-10-27: gedaan in een latere ronde)

## Schetsgereedschappen van de Sketch-tab (2026-10-21)
- [x] Kern src/core/sketch/edit.ts: Trim to closest (lijn/boog/cirkel/spline, snijpunten met alle andere entiteiten), Sketch Fillet (twee lijnen → raakboog met tangent-relaties), Offset Entities (lijnen met verstek, bogen/cirkels concentrisch, splines), Linear/Circular Sketch Pattern, Move/Copy/Rotate/Scale Entities, Convert Entities (polylijnen → lijn/cirkel/boog/spline); 6 unit tests
- [x] Tools: Trim (klik), Sketch Fillet (twee klikken, straal in de PM), Offset / Move / Copy / Rotate / Scale / Linear / Circular Pattern (entiteiten klikken, PM-waarden, OK past toe); PM's met de secties van het origineel (Options, Fillet Parameters, Parameters, Direction 1/2, Entities to Pattern)
- [x] Convert Entities: in een schets een modelrand (of vlak) aanklikken en omzetten naar schetsentiteiten op het schetsvlak
- [x] Sketch-tab, S-palet en Tools-menu aangesloten; e2e/sketchtools.mjs 9/9
- [x] Sketch Chamfer (Distance-distance, Equal distance), Extend Entities (tot de volgende entiteit); Edit Appearance (kleur voor het part of een body, swatches + RGB, Remove Appearance) in Render Tools en in het body-menu
- [x] Power trim, From/To-modus bij Move, Add dimensions bij Offset/patronen, Text, Ellipse (nagekeken 2026-10-27: gedaan in een latere ronde)

## Curves ▸ Helix and Spiral (2026-10-21)
- [x] HelixFeature op een cirkelschets (as = schetsnormaal): Defined By Pitch and Revolution / Height and Revolution / Height and Pitch, Reverse direction, Start angle, Clockwise/Counterclockwise; PM zoals het origineel (Taper Helix grijs)
- [x] De helix is een referentiecurve (donkerblauw) in het beeld en in de tree (Helix/Spiral1 met de schets eronder); Swept Boss/Base/Cut kan de helix als Path kiezen (veer, draad)
- [x] e2e/helix.mjs 5/5 (cirkel r20, pitch 10 x 3 omwentelingen, profiel r2 → veer met het verwachte volume)
- [x] Variable pitch, Taper Helix, Spiral (vlak), Split Line, Projected Curve (nagekeken 2026-10-27: gedaan in een latere ronde)


## Vervolg: Hem, Up To Vertex, Exploded View (2026-10-21)
- [x] Sheet Metal ▸ Hem: Closed / Open (gap) op een rechte rand, lengte, Reverse, Material Inside (plaat ingekort) / Bend Outside; flat pattern telt mee; Tear Drop/Rolled grijs; e2e/hem.mjs 9/9
- [x] Extrude ▸ Up To Vertex: klik een hoekpunt (uiteinde van een modelrand, 14 px) → diepte tot dat punt; PM-selectievak, RMB-menu; unit test + e2e (endconditions 14/14)
- [x] Assembly ▸ Exploded View: Explode-PM (Explode Steps, Add a Step: componenten klikken, X/Y/Z + Reverse, afstand, Add Step/Reset), live preview, ExplView1 met stappen in de ConfigurationManager (RMB Explode/Collapse/Edit Feature), Exploded View-fly-out; e2e/explode.mjs 17/17
- [x] Docs, memory, regressie

## Voorbeeld Deurkruk (2026-10-21)
- [x] e2e/doorhandle.mjs bouwt Deur, Rozet, Vierkantstift, Kruk (Plane1 + slot-arm, vierkant gat) en de assembly Deurkruk met exploded view; bestanden in voorbeelden/deurkruk/; screenshots e2e-out/deurkruk-*.png
- [x] Componentkleur volgt het materiaal van het onderdeel (eiken deur, RVS krukken)
- [x] Mates in het voorbeeld (8 coincident + 6 concentric), alles opgelost zonder verschuiving
- [x] Realistischer: gedraaide hals met kraag (revolve), ronde gebogen hendel (sweep) met bolle kop, gewelfde rozetten, sleutelrozetten met sleutelgat, deur 300 x 600 met doornmaat 70 en PC 72
- [x] RealView Graphics (PBR, studio-omgeving, glanzend metaal, houtnerf) en Shadows In Shaded Mode in View Settings; Edit Appearance in de heads-up toolbar
- [x] Explode lines (stippellijnen) in de exploded view
- [x] Tekening van de kruk: voor/boven/zij + iso, maten (138, 46.8, Ø26, Ø16), notities, materiaal en gewicht in het titelblok
- [x] HLR-silhouetten robuust bij CSG-T-knooppunten (gebogen buizen volledig getekend)

## Vervolg: alles afmaken + 1000%-controle tegen SOLIDWORKS (2026-10-21)
- [x] Audit: app-screenshots naast de referentieframes (2026-video + playlist) leggen; verschillen noteren in docs/07 en oplossen — ronde 1 klaar: boom ingeklapt, PM-stijl, 10.00mm-velden, oog, grijze actieve knoppen, contourkleur exact (#b3b3b3)
- [x] Drawings: Section View (snijlijn A-A, arcering) en Detail View (cirkel, vergroting)  — klaar: doorsnede via mesh-snede + winding-test, auto-kijkrichting, detail 2:1; revolve-normalen hersteld; blad blijft passend
- [x] Sketch: Ellipse en Text — klaar: 3-klik ellipse, Sketch Text (Helvetica-contouren, hoogte/breedte/spatiëring/rotatie), regio’s met gaten
- [x] Assembly: Linear / Circular Component Pattern — klaar: LocalLPattern/LocalCirPattern in boom met instanties, richting via as of vlak, bewerken met dubbelklik
- [x] Extrude: Up To Body — klaar: door-extrusie min doellichaam, deel aan schetsvlak blijft (eind volgt kromme vorm), body kiezen in grafisch venster
- [x] Sheet metal: Jog en Miter Flange — klaar: Jog (Z-profiel met buigradii, vaste kant/omkeren), Miter Flange (profiel langs randketen, verstek + spleet)
- [x] Loft: guide curves; 3D Sketch — klaar: geleidecurven (1 of 2, secties volgen de curve), 3D-schets met Tab-wissel XY/YZ/ZX als sweep-pad
- [x] Na elke stap: deurkruk-voorbeeld + screenshots, regressie

## Vervolg 2: resterende SW-functies + audit ronde 2 (2026-10-21)
- [x] Sheet metal: Sketched Bend — klaar (buiging rond de lijn met radius, vaste kant/omkeren); Unfold/Fold nog niet
- [x] Sketch Driven Pattern (instanties op schetspunten) — klaar (referentiepunt = centroid, e2e/sketchpattern.mjs)
- [x] Appearances per vlak — klaar (vertexkleuren, vlak via normaal+centroid; ook: alleen zichtbare randen kiesbaar, heads-up-klik wist selectie niet meer)
- [x] Loft: Start/End Constraints (Normal To Profile) — klaar (Hermite-paden, raaklengte)
- [x] Audit ronde 2: Insert Component, Mate (2026-tabs + pop-up), Hole Wizard (3×3), berichtvakken, actieve knoppen, contourkleur — gedaan; schets en Dimension-PM waren al gelijk
- [x] Na elke stap: deurkruk-voorbeeld + screenshots, volledige regressie (nagekeken 2026-10-27: gedaan in een latere ronde)

## Vervolg 3: veelgebruikte knoppen die nog "later" zijn (2026-10-21)
- [x] Features ▸ Draft (neutraal vlak, vlakken, hoek; naar binnen tapsen) — klaar (frustumvolume exact, e2e/draftcheck.mjs)
- [x] Assembly ▸ Interference Detection in de ribbon aan de bestaande controle koppelen — klaar (ook in Evaluate)
- [x] Evaluate ▸ Check (gesloten/geldige body) en Section Properties (oppervlak, zwaartepunt van een vlak) — klaar (vectoroppervlak-test, traagheidsmomenten)
- [x] Features ▸ Intersect (gemeenschappelijk deel van bodies) — klaar (regio's uitsluiten, Merge result)
- [x] Na elke stap: e2e + volledige regressie + screenshots (nagekeken 2026-10-27: gedaan in een latere ronde)

## Vervolg 4: analyse en bewerken in context (2026-10-21)
- [x] Evaluate ▸ Draft Analysis (vlakken kleuren naar trekhoek: groen positief, rood negatief, geel steil) — klaar
- [x] Evaluate ▸ Curvature (vlakken kleuren naar kromming) — klaar (per vlak, 1/r log-schaal)
- [x] Hole Wizard: Straight Tap — klaar (kernboring, cosmetische draad gestippeld in 3D, naam M6x1.0 Tapped Hole1); draad in tekening nog niet
- [x] Assembly ▸ Edit Component (onderdeel in context openen en terug) — klaar (banner + Return to Assembly, alle instanties bijgewerkt)
- [x] Na elke stap: e2e + volledige regressie + screenshots (nagekeken 2026-10-27: gedaan in een latere ronde)

## Vervolg 5: resterende schets- en featureknoppen (2026-10-21)
- [x] Boundary Boss/Base en Boundary Cut (tussen twee profielen, met de loft-kern) — klaar
- [x] Evaluate ▸ Sensor-knop met Sensor-PM (Mass / Volume / Surface Area) — klaar
- [x] Sketch ▸ Repair Sketch (kleine gaten en dubbele lijnen opsporen en herstellen) — klaar
- [x] Sketch ▸ 3 Point Arc Slot — klaar (concentrische bogen, gelijke doppen, constructie-middenboog)
- [x] Na elke stap: e2e + volledige regressie + screenshots (nagekeken 2026-10-27: gedaan in een latere ronde)

## Vervolg 6: schetsgereedschappen die nog ontbreken (2026-10-21)
- [x] Tangent Arc (raakboog aan het eind van een lijn of boog) — klaar
- [x] Perimeter Circle (cirkel door drie punten) — klaar
- [x] Centerpoint Arc Slot — klaar
- [x] Horizontal / Vertical Dimension (maat met vaste richting) — klaar
- [x] Na elke stap: e2e + volledige regressie + screenshots (nagekeken 2026-10-27: gedaan in een latere ronde)

## Vervolg 7: Surfaces-tabblad (2026-10-21)
- [x] Extruded / Revolved / Planar / Offset Surface als open oppervlaklichamen (map Surface Bodies)
- [x] Knit Surface met Create solid (schil oriënteren, gesloten -> solid)
- [x] Ribbon blijft op Surfaces / Sheet Metal / Evaluate na OK, zoals SW
- [x] Swept / Lofted / Boundary / Trim Surface — klaar
- [x] Volledige regressie + screenshots

## Vervolg 8: tekening-annotaties (2026-10-21)
- [x] Balloon (itemnummer van het onderdeel onder de klik) en Auto Balloon (één per onderdeel, ring rond het aanzicht)
- [x] Surface Finish (Ra), Geometric Tolerance (symbool, tolerantie, datum), Datum Feature (A, B, …)
- [x] Hole Callout (Ø… THRU ALL) en Centerline (tussen twee evenwijdige randen)
- [x] Commando's grijs zonder lichaam/schets, zoals SW in een leeg onderdeel
- [x] Volledige regressie + screenshots

## Vervolg 9: tekening-tabellen en aanzichten (2026-10-21)
- [x] Tables ▸ Bill of Materials als tabel op het blad (ITEM NO. / PART NUMBER / DESCRIPTION / QTY.), rechtsboven aan het ankerpunt zoals SW
- [x] Crop View (rechthoek uit een aanzicht, geometrie blijft op zijn plaats)
- [x] Break (onderbroken aanzicht met zigzag-breeklijnen)
- [x] Auxiliary View (loodrecht op een gekozen rand, pijl + VIEW A)
- [x] e2e + regressie + screenshots (viewlayout.mjs, deurkruk-samenstellingstekening met BOM)

## Vervolg 10: Model Items, Broken-out Section, draad in tekening (2026-10-21)
- [x] BOM-tabel in de boom onder het aanzicht (Bill of Materials1)
- [x] Model Items: schetsmaten in het evenwijdige aanzicht, extrusiediepte in het zijaanzicht, elk één keer (PM Source/Destination, Dimensions, Options)
- [x] Broken-out Section: gesloten profiel in een aanzicht, diepte vanaf de voorkant, gearceerd binnen het profiel
- [x] Cosmetische draad van getapte gaten in de tekening (dunne gestreepte cirkel op de buitendiameter, gestreepte lijnen in zijaanzicht, ANSI)
- [x] Deurkruk-schetsen gedimensioneerd (R25, 92, Ø16, R8, 8x8, 13, 34, 46.8) zodat Model Items ze toont
- [x] Model Items slaat maten over van geometrie buiten een Crop View; Broken-out-rand als gesloten spline
- [x] e2e (viewlayout uitbreiden), regressie, screenshots

## Vervolg 11: tekening-omgeving zoals SW + plaatwerkhoeken (2026-10-21)
- [x] Papierkleur #e8e8e0 en lichte verloop-achtergrond (gemeten in playlist-video 36), zonestreepjes en grotere zonecijfers
- [x] Tab "Drawing" i.p.v. "View Layout", volgorde Drawing · Annotation · Sketch · Markup · Evaluate · Add-Ins · Sheet Format
- [x] Annotation-tab in kolommen (Balloon/Auto Balloon/Magnetic Line, Surface Finish/Weld Symbol/Hole Callout, …)
- [x] Bladtabs onderaan (Sheet1 + Add Sheet), statusbalk met bladcoördinaten, Under Defined, Editing Drawing ViewN, schaal 1 : 1
- [x] Drawing View-PropertyManager bij klik op een aanzicht (Display Style met 5 iconen, Scale, Dimension Type, Cosmetic Thread Display)
- [x] Sheet Metal ▸ Cross-Break (diagonalen op een vlak) en Corners ▸ Break-Corner/Corner-Trim (Collect all corners, afschuining/afronding)
- [x] Plaatwerkboom zoals SW (playlist 37): Cut list(1) i.p.v. Solid Bodies, map Sheet-Metal na Origin, map Flat-Pattern met Flat-Pattern1
- [x] e2e (corners.mjs, viewlayout), volledige regressie (32 scripts groen), screenshots

## Vervolg 12: Unfold / Fold en echte uitslag (2026-10-21)
- [x] Afbeelding gevouwen <-> vlak langs de neutrale lijn (K-factor, buigtoeslag), rondgang exact (src/core/features/unfold.ts)
- [x] Unfold1 / Fold1 in de boom; sneden in uitgeslagen toestand vouwen mee terug (driehoeken gesplitst op de buigfacetten)
- [x] Flatten toont de echte uitslag met sneden en gaten, plus buiglijnen (Bend-Lines)
- [x] Unfold/Fold-PropertyManager (Fixed face, Bends to unfold, Collect All Bends)
- [x] e2e unfoldfold.mjs, unit-tests unfold.test.ts
- [x] volledige regressie (33 scripts groen) en screenshots

## Vervolg 13: Wrap en cilindervlakken (2026-10-21)
- [x] Gefacetteerde cilinders/kegels (vlakjes < 8° knik) zijn één gebogen vlak bij selectie, zoals SW
- [x] Cilinderfit uit de facetten (as, straal) voor features op cilindervlakken
- [x] Features ▸ Wrap: Emboss / Deboss / Scribe (Analytical), schets op raakvlak gewikkeld op het cilindervlak
- [x] e2e wrap.mjs, unit-test wrap.test.ts
- [x] volledige regressie (groen)

## Vervolg 14: Motion Study (2026-10-21)
- [x] Tab "Motion Study 1" onderaan opent de MotionManager (werkbalk Animation/Calculate/Play/Stop/snelheid/Motor/…, boom, tijdlijn met tijdbalk en sleutels)
- [x] Motor-PropertyManager: Rotary Motor op een onderdeel (as = concentrische mate), Constant speed (RPM) of Oscillating (amplitude, frequentie)
- [x] Meedraaiende onderdelen via de mates (vierkantstift en tweede kruk draaien mee, rozet en deur niet)
- [x] Deurkruk-voorbeeld: Motion Study 1 met RotaryMotor1 (kruk 40° omlaag en terug), extra mate stift ↔ Kruk<2>
- [x] e2e motion.mjs, unit-test motion.test.ts
- [x] volledige regressie (groen)

## Vervolg 15: titelblok en revisies (2026-10-21)
- [x] Sheet Format ▸ Title Block Fields (bedrijf, titel, DWG NO., getekend/datum, gecontroleerd, goedgekeurd)
- [x] Revision Symbol (driehoek met letter), Revision Table (REVISIONS / REV. / DESCRIPTION / DATE / APPROVED), REV in het titelblok, Add Revision
- [x] Revision Cloud, Weld Symbol (hoeklas met maat), Datum Target (gedeelde cirkel met A1, kruisje op het onderdeel)
- [x] BOM schuift onder de revisietabel
- [x] e2e annotations2.mjs
- [x] volledige regressie (groen)

## Vervolg 16: Evaluate-analyses (2026-10-21)
- [x] Thickness Analysis: doel-dikte, Show thin regions, kleurverloop rood→geel, minimum dikte (stralen naar de tegenoverliggende wand, mediaan per vlak)
- [x] Undercut Analysis: trekrichting X/Y/Z of omgekeerd, vijf klassen (Direction1/2, Occluded, Straddle, No undercut) met kleuren
- [x] e2e thickness.mjs, unit-test thickness.test.ts
- [x] volledige regressie (groen)

## Vervolg 17: Instant3D (2026-10-21)
- [x] Instant3D aan/uit in de Features-tab (standaard aan)
- [x] Geselecteerd eindvlak van een Blind-extrusie krijgt een sleeppijl; slepen toont een liniaal en de nieuwe diepte (0.5 mm-stappen), loslaten past de diepte aan (undo werkt)
- [x] e2e instant3d.mjs

## Vervolg 18: vergelijking referentieframe f_0241 (2026-10-21)
- [x] Dimension-PM: geselecteerde maat toont meteen zijn waarde (was 0.00mm door vroege focus), alleen ✓ zoals het origineel
- [x] Dimension Text bewerkbaar (<DIM> + tekst, bv. 2X <DIM>) met uitlijn- en symboolknoppen (Ø ° ± ℄ □ ⌵ ⊔ ↧), zichtbaar in de maat
- [x] Tijdens het schetsen zijn Fillet, Linear Pattern, Hole Wizard, Draft, Shell, Wrap, Intersect, Mirror, Lofted/Boundary en Swept/Lofted/Boundary Cut grijs, zoals in de referentie
- [x] e2e dimpm.mjs
- [x] volledige regressie (groen)

## Vervolg 19: Thread en snelheid (2026-10-21)
- [x] Hole Wizard ▸ Thread (referentieframe f_0301): cirkelrand kiezen, Metric Die/Tap, maat (M3…M24), lengte, Cut/Extrude thread, rechts/links; echte V-groef langs een helix (ISO-diepte)
- [x] Hole Wizard-flyout (Hole Wizard, Advanced Hole, Thread, Stud Wizard)
- [x] Randdetectie lineair i.p.v. kwadratisch (groeperen per lijnpositie): draad-rebuild 96 s → 4 s
- [x] Weergave: lichamenlijst gememoiseerd, randen niet meer opnieuw bij elke hover/selectie (aanzichtwissel 15 s → 0,7 s)
- [x] e2e thread.mjs, unit-test thread.test.ts
- [x] volledige regressie (groen)

## Vervolg 20: CommandManager zoals SW 2026 (2026-10-21)
- [x] Tijdens een actief commando (feature-PM, vlak, plaatwerk, patroon, 3D-schets, motor, analyse) is de CommandManager grijs, de actieve knop blijft (f_0301)
- [x] Assembly-tab in de volgorde van f_0341 (Edit Component … Large Assembly Settings), Instant3D ook in assemblies
- [x] Tab "Lifecycle and Collaboration" in assemblies
- [x] volledige regressie (groen)

## Vervolg 21: Smart Fasteners (2026-10-21)
- [x] Toolbox-onderdelen: ISO 4762 inbusbout (met zeskantgat), ISO 10642 verzonken, ISO 4017 zeskantbout (M3…M20, standaardlengtes)
- [x] Smart Fasteners: Hole Wizard-gaten in de assembly, aansluitende coaxiale gaten = één bout, maat uit het gat, lengte uit de klemlengte; PM met Selection, Series Components, Properties (type, maat, lengte)
- [x] Bouten met Concentric- en Coincident-mates (per type doorgenummerd)
- [x] Deurkruk realistischer: rozetten met 2 verzonken M4-gaten, Smart Fasteners plaatst 4× ISO 10642 M4 x 16, schroeven gaan mee in de exploded view, BOM met 6 regels
- [x] e2e fasteners.mjs, unit-test fasteners.test.ts
- [x] volledige regressie (groen)

## Vervolg 22: Assembly Features (2026-10-21)
- [x] Assembly Features ▸ Extruded Cut: schets in de assembly, snede door de componenten (Feature Scope: alle / geselecteerde componenten), de onderdelen zelf blijven ongewijzigd
- [x] Boom: assembly-schetsen en Cut-Extrude1 na Mates; consumeerde schetsen verborgen
- [x] Snede vanaf een referentievlak begint precies op het vlak (was 0,5 mm extra), zoals het origineel
- [x] Ribbon blijft op de Assembly-tab na een assembly-feature
- [x] e2e asmcut.mjs (cutaway van de deurkruk), unit-test asmfeature.test.ts
- [x] volledige regressie (groen)

## Vervolg 23: Render Tools (2026-10-21)
- [x] Edit Scene-PM (Basic/Advanced/Illumination): achtergrond Gradient, Plain White, Color, Studio Backdrop; vloerschaduw
- [x] Final Render: beeld op dubbele resolutie met RealView en schaduw op de scène-achtergrond, zonder oorsprong/vlakken/schetsen; venster met Save Image (PNG)
- [x] e2e render.mjs (deurkruk-render.png)

## Vervolg 24: Removed Section en Area Hatch/Fill (2026-10-21)
- [x] Removed Section: snijlijn in een aanzicht, alleen het snijvlak (gearceerd) vrij geplaatst, label SECTION A-A
- [x] Area Hatch/Fill: klik op een modelvlak dat naar de kijker staat; het (samenhangende) vlak wordt gearceerd, gaten blijven open
- [x] e2e annotations3.mjs
- [x] volledige regressie (groen)

## Vervolg 25: feedback Ian — app, logo, menu's, rechthoek, Modify (2026-10-21)
- [x] App geïnstalleerd (installer 0.2.0, Startmenu + bureaublad), app-icoon = Phlippo-logo i.p.v. blauw vlak
- [x] Phlippo-logo draait langzaam op de achtergrond van een leeg document
- [x] Flyout-menu's in de CommandManager worden boven de tabstrook getekend (niet meer afgeknipt)
- [x] Center Rectangle werkte niet (botsende midpoint-relatie): opgelost; Add construction lines (From Corners / From Midpoints) werkt
- [x] Maattekst gecentreerd tussen de maatpijlen
- [x] Modify-box in de SW-indeling (titel, iconenrij, naam, waarde, duimwiel, Units >); getalvelden tonen meteen de juiste waarde
- [x] Alternate Position View (ingedrukte kruk als fantoomlijnen in de deurkruk-tekening)
- [x] bugronde: volledige regressie
- [x] designronde: interface naast SW 2026-frames (lettertype, kleuren, afstanden, iconen) en bijwerken (gedaan in 0.4.4/0.4.5, Vervolg 45–46)
- [x] nieuwe installer (0.2.1) bouwen en installeren

## Vervolg 26: Delete-bug, Confirm Delete, crash-vangnet (2026-10-21)
- [x] Delete-toets nagespeeld (browser + geïnstalleerde app, eigen onderdeel van Ian)
- [x] Confirm Delete-venster zoals het origineel (afhankelijke items, absorbed, child features)
- [x] Geen losse "wees"-features meer na een delete (Fillet na Boss-Extrude, schets op een vlak)
- [x] Vangnet: een fout toont een herstelvenster i.p.v. een bevroren/wit venster
- [x] Native confirm/alert/prompt vervangen door eigen venster (Electron verloor daarna het toetsenbord)
- [x] Design: FeatureManager zoals SW 2026 (mappen-iconen, gestippelde vlakken, driehoek-pijltjes, grote tabs, filterbalk)
- [x] Rollback-balk direct onder de laatste feature (gemeten i.p.v. rijen tellen)
- [x] Model/Motion Study-tabs over de volle breedte, documentknoppen rechtsboven in de viewport
- [x] Update and Freeze / Create Derived Part uit de Features-tab (niet in SW 2026)
- [x] e2e confirmdelete + regressie (alles groen)
- [x] Installer 0.2.1 bouwen en installeren (Ians autosave bewaard)

## Vervolg 27: designronde schetsen + rechthoek-types (2026-10-21)
- [x] Schermen naast SW 2026-frames gelegd (f_0201 part, f_0111 Boss-Extrude, f_0070 Rectangle)
- [x] Draaiend logo verdwijnt zodra er iets in het document staat (scheen door de extrude-preview)
- [x] ✓/✗-hoek onder de documentknoppen
- [x] 3 Point Corner Rectangle, 3 Point Center Rectangle, Parallelogram en Midpoint Line werken
- [x] Rectangle-PM na tekenen: Existing Relations + status, Add Relations, Options (For construction), Parameters (x/y van 4 hoeken)
- [x] Slot-PM: boogsleuf-types ingeschakeld
- [x] Regressie + rect3-test op de build

## Vervolg 28: alle "later/phase"-knoppen echt laten werken (2026-10-21)
- [x] Blok 1 schetsen: Partial Ellipse, Parabola, Conic, Style Spline, Equation Driven Curve, Fully Define Sketch, Rapid Sketch, Instant2D, Perspective (e2e/sketchcurves.mjs, unit curves.test.ts)
- [x] Blok 2 features: Reference Axis / Point / Coordinate System, Split Line, Projected Curve, Curve/Table/Fill/Variable Pattern, Advanced Hole, Stud Wizard, Offset On Surface
- [x] Blok 3 sheet metal: Convert to Sheet Metal, Lofted-Bend, No Bends, Closed/Welded Corner, Corner Relief
- [x] Blok 4 evaluate/render/managers: Design Study, Geometry Analysis, Edit Decal, Preview Window, Apply Scene, Ambient Occlusion, DimXpertManager, DisplayManager
- [x] Blok 5 assembly: Make Multibody Part, Reference Geometry, Take Snapshot, Large Assembly Settings, Insert New Part/Assembly, Copy with Mates, Mirror Components, Pattern Driven, assembly Revolved Cut/Hole/Fillet, Belt/Chain, geavanceerde/mechanische mates
- [x] Blok 6 tekeningen: Relative/Empty/Predefined View, Spell Checker, Format Painter, Linear Note Pattern, Magnetic Line, Blocks, Edit Sheet Format, Hole/General Table, Add Sheet
- [x] Blok 7 overige: Two/Four View, Lasso Selection, Select Other, Isolate, Delete Body, configuratie-items
- [x] Fillet/Chamfer-opties: asymmetrisch, conisch profiel, multi radius, variabel, partial edge, Face/Full Round, FilletXpert, Angle-Distance (e2e/filletopts.mjs)
- [x] Overige grijze PM-opties (sheet metal, draft, pattern, dimension-PM, drawing-PM, motion) (nagekeken 2026-10-27: gedaan in een latere ronde)
- [x] Regressie + installer 0.3.0

## Vervolg 29: tekening 100% zoals SOLIDWORKS (2026-10-21)
- [x] Deurkruk-tekening nabouwen en vergelijken met SW (screenshot Ian: balloons, overlap, view buiten blad)
- [x] Auto Balloon: Balloon Layout (Square standaard, Circular, Top/Bottom/Left/Right), leaders kruisen niet, punt op een zichtbaar vlak van het onderdeel, één undo-stap
- [x] Magnetic Line: balloons in de volgorde van hun onderdelen; lijnen alleen zichtbaar tijdens gebruik/slepen
- [x] Balloons, notities en tabellen verslepen; balloon schuift langs zijn magnetische lijn; balloons bewegen mee met hun view
- [x] Views: automatische bladschaal bij de eerste view, Standard 3 View gecentreerd boven het titelblok (geen overlap)
- [x] Tabellen: Hole/General Table op een vrije plek, volgen de cursor tot de klik; kolommen passend op de tekst
- [x] Titelblok zoals de ISO sheet format (DEBUR AND BREAK SHARP EDGES, DO NOT SCALE DRAWING, NAME/SIGNATURE/DATE, MFG, Q.A, A3)
- [x] e2e/drawingfix.mjs (16/16) + unit balloons.test.ts
- [x] Tekening-PM's: Section View (Half Section, Slice, Partial, Auto hatching, custom scale), Detail View (Full/Jagged outline, Pin position), Dimension (Tolerance/Precision, Override, prefix/suffix, Dual, Leaders, Other; aanklikken, slepen, Delete), Model Items-opties, Broken-out Preview, Use parent scale, lasvormen, balloon op randen (e2e/drawopts.mjs 21/21)
- [x] Regressie (53 scripts groen) + installer 0.3.0 geïnstalleerd (autosave van Ian bewaard)

## Vervolg 30: volledige controleronde — scherpte, bugs, SW-gelijkenis (2026-10-21)
- [x] Scherpte gecontroleerd op Ians scherm (1920×1080 op 150 %, e2e/look-ian.mjs, look-crop.mjs): renderer op devicePixelRatio, SVG-iconen/tekst scherp
- [x] Silhouetlijnen van gebogen vlakken (cilinderomtrek) zoals SW (core/features/silhouette.ts)
- [x] Ronde vormen adaptief fijner (max. 0,02 mm koordafwijking): cirkels, bogen, revolves, grote fillets
- [x] Belichting gekalibreerd op SW-referentie (iso-kubus boven/links/rechts 227/223/172 ≈ SW 228/223/172)
- [x] Lint: »-knop met de commando's die niet passen (Assembly-tab liep van het scherm); tooltips niet meer afgesneden (één globale tooltip)
- [x] Geopend document zoomt automatisch passend (Zoom to Fit), zoals SW
- [x] Bugjacht: elk lint-commando, menu-item, tab en contextmenu automatisch aangeklikt (e2e/clickall.mjs): schets 128, part 115, assembly 89, tekening 106 — 0 fouten; alle sneltoetsen (e2e/keys.mjs) — dubbele items in de S-balk opgelost
- [x] Bugjacht: PropertyManagers openen/OK/Cancel/Undo per feature; geen vastlopers (e2e/pmsweep.mjs, 0.4.3)
- [x] SW-gelijkenis: hoofdschermen (part, sketch, feature-PM, assembly, drawing) opnieuw naast referentieframes, verschillen wegwerken (0.4.4/0.4.5, zie Vervolg 45–46)
- [x] Gevonden fouten oplossen + regressie + installer (releases 0.4.x)

## Vervolg 31: elk commando naast de SW-referentievideo (2026-10-22)
- [x] Replay van de BasePlate-tutorial op 1920×1080 (e2e/tutorial.mjs) + zij-aan-zij-beelden (e2e/pair.mjs)
- [x] Extrude: schetsmaten/relaties zichtbaar tijdens de preview, grijze sleeppijl, lichte gele preview
- [x] Fillet: eerst alleen preview (model blijft scherp), dikke gele doorsnede-boogjes, Radius-vak met leider en twee rondjes, PM zoals SW (kubus-iconen, Manual/FilletXpert, selectievak, punaise), PM-kop blijft staan, geen wegscrollen
- [x] Rijke tooltips op het lint (titel, eigen illustratie, uitleg)
- [x] Schets: maattekst zonder kader en mee gedraaid (ISO), diameter met één leider, dikkere lijnen, maatuitlezing bij de cursor, regio-hover oranje, Circle/Arc-PM met Type/Options/Parameters, rechthoek blijft geselecteerd
- [x] Vlak-hover: alleen oranje omtrek + grijs label met de featurenaam
- [x] Camera: Zoom to Fit tijdens een draai breekt de draai niet meer af
- [x] Extrude ▸ Selected Contours: gekozen regio's paars/magenta zoals SW (fr. 192); sleeppijl oranje bij aanwijzen, magenta met meetlat bij slepen
- [x] Selectie-werkbalk bij een gekozen rand (Show selection toolbar, fr. 207)
- [x] Tree: feature aanwijzen = oranje omtrek van zijn vlakken (fr. 374), selecteren = SW-blauw gearceerd + schetsmaten met blauwe eindpunten (fr. 376/381)
- [x] Tree: alleen icoon + naam krijgen het hover/selectie-kader (gemeten kleuren)
- [x] Breadcrumbs bij selectie (onderdeel ▸ body ▸ feature, schets eronder), vervagen met afstand tot de muis
- [x] Thread: cyaan preview van de schroefdraad (3 helixbanen + profiel begin/eind, door het model heen), pas resultaat na OK (fr. 299–301)
- [x] Insert Component: onderdeel hangt aan de muis (eigen kleur), klik plaatst, OK = oorsprong, Esc stopt; Rotate-contextwerkbalk (hoek + X/Y/Z) linksonder; Open documents toont het gekozen onderdeel (fr. 318–324)
- [x] Assembly: component kiezen = blauw + breadcrumbs (assembly ▸ onderdeel) met zijn mates erboven (fr. 372); klik op geselecteerd item houdt het geselecteerd (Ctrl+klik haalt weg); zwarte randen blijven zichtbaar op blauw
- [x] Extrude: holle dubbele pijl voor Direction 2 aan de andere kant; slepen zet Direction 2 (Blind) aan (fr. 192/230)
- [x] Appearances, Scenes, and Decals: navigatiebalk, mappenboom (Metal ▸ Aluminum …), gele hint, bol-stalen, RMB-menu, slepen op het model (fr. 247–250)
- [x] Polygon: standaard Inscribed circle, PM Parameters (zijden, Inscribed/Circumscribed, Cx/Cy/⌀/∠, New Polygon), één Polygon-relatie per zijde (fr. 274–276)
- [x] Constructiegeometrie in de schetskleur, dunner, lang streep-punt (fr. 276)
- [x] Mate: Make first selection transparent standaard aan, eerste onderdeel doorzichtig (fr. 344)
- [x] Frames 209–387 van de video afgegaan
- [x] Build + regressie (57 scripts groen, 2 rondes) + installer 0.3.1 geïnstalleerd, autosave behouden

## Vervolg 32: alles af — geen grijze opties meer, rest van de playlist (2026-10-22)
- [x] Blok A schets (klaar: Dimension-PM Value/Leaders/Other, favorieten, tolerantie 6 types, precisie, naam + vergelijkingen, Dual, pijlen/pijlstijl, eenheden, lettergrootte, uitlijning; Keep constrained corners, Select chain, Keep relations, Equal spacing, Infinite length, Polygon-parameters) — Trim Mutual, Line Infinite length, Polygon/Rectangle/Circle-parameters bewerkbaar na tekenen, Dimension-PM (Leaders/Other, tolerantie, precisie, uitlijning), Keep relations/Select chain/Equal spacing echt schakelbaar
- [x] Blok B features (klaar: Draft Parting line/Step/propagation/DraftXpert, Rib draft + outward, patronen Up to reference/Instance spacing/Selected point/Bodies/Faces/Geometry pattern/Vary sketch/Instances to Vary/Propagate/Partial preview, Fillet tangent/preview/setback/through faces/keep features/round corners/overflow, Break Corner internal, Surface Trim Mutual, Knit merge/open edges, Intersect cap/consume, Thread reverse/startvlak/preview, Wrap Spline Surface, Split Line silhouette/intersection/single, Projected Curve sketch-on-sketch, Lofted Bend bent, Convert keep body, Stud op cilinder/cosmetic, Hole head clearance + 3 countersinks + cosmetic/callout, Mirror merge solids, Revolve Mid-Plane/Direction 2/Thin + gaten in profiel, Loft guide tangency, Translate surface, Auto-fillet corners, Auto-select) — Draft (Parting line, Step draft, DraftXpert), Draft outward, patronen (Up to reference, Selected point, Vary sketch, Internal corners), Fillet (Tangent propagation, Select through faces, Keep features, Round corners), Extrude/Revolve-subopties, Wrap Spline Surface, Split Line Silhouette/Intersection, Projected Curve sketch-on-sketch, Intersect Cap planar openings, Knit (Merge entities, Show open edges), Hole Wizard-opties, Stud op cilinder, Lofted Bend Bent, Loft guide tangency, Boundary translate, Thread startvlak + Reverse
- [x] Blok C sheet metal (klaar: gauge-tabellen, K-Factor/BA/BD/Bend Table, auto relief rechthoek/tear/obround + ratio, materiaal-K, Edge Flange profiel-offsets + relief, gap, trim side bends, offset, hoek t.o.v. vlak, Up To Vertex, eigen allowance/relief; Hem miter gap/breedte; Miter Flange radius + start/end offset; Jog offset-types/fix projected/positie/hoek/radius; Sketched Bend positie/radius; Cross-Break bewerken) — gauge-tabel, K-factor/Bend allowance/Bend deduction, relief-types/ratio, Material Inside/Outside/Bend Outside, Edge Flange (hoek-referentie, lengte-types, Up To Vertex, Edit Flange Profile, Trim side bends, Offset), Miter Flange-opties, Edit Cross-Break / Hem Width
- [x] Blok D assembly/tekening/dialogen (klaar: Mate-opties preview/popup/nieuwe map/alleen positioneren + Analysis-tab; Insert Component start/auto browse/preview/virtual/envelope; sub-assemblies invoegen; multibody-componenten; Explode-rotatie/auto-space/ringen; Instances to Skip; Section View eigen snijding (Zonal, dop + kleur, graphics-only, Section 2/3, hoeken, geselecteerde bodies, Save); Plane Perpendicular/Mid Plane/Flip normal; ConfigurationManager BOM-opties/kleur/nieuwe features onderdrukken + materiaal per configuratie; Decal-tabs + Illumination + vrije hoogte; Draft/Thickness/Geometry-opties; Mass Properties opties/override/verborgen/zwaartepunt/lasnaad/coördinatensysteem; Check-opties; Edit Scene omgevingen/reflecties/vloer/Advanced/Illumination; eigen materialen; Mirror opposite hand; Sensor Dimension/Interference + Alert; Equations import/export/link/radialen; Fastener auto length; Appearances terug/vooruit/bibliotheek/map/display state; eigen kleurschema's; alle tekening-PM-opties (configuratie, preview, annotaties importeren, draft quality, true dims, draadweergave, pijl-label, detail-stijlen + profiel, notitie leader/rand/uitlijning/stijlen, ballon-vorm/tekst, breuklijnstijl, aux-pijl, duplicaten, alt. positie, eigen bladmaat, volgende labels); jog Up To Vertex, draad-favorieten, gattypes, Extrude From Offset, Fully Define schema's, eenheden in Modify)
- [x] Blok D2 Motion Study (klaar: Basic Motion met zwaartekracht/veren/contact + Calculate, Loop/Reciprocate, Save Animation (WebM), Animation Wizard draaien/exploderen/samenvoegen, Autokey + Add/Update Key met sleutelpunten, lineaire motor + Distance/Segments/Expression, Results and Plots, Motion Study Properties, Load-bearing faces; ook Richting 2 Up To Vertex/Surface/Next, Viewports-knoppen, Toolbox-add-in): Basic Motion (zwaartekracht, veer, contact), afspeelmodi Loop/Reciprocate, Save Animation, Animation Wizard, Autokey/Add Key, motorprofielen Segments/Expression, Load-bearing faces
- [x] Blok E: Move with Triad (pijlen verschuiven, ringen draaien, Esc) en lichtcyaan = vlakken van de geselecteerde/net gemaakte mate (gemeten 143,255,252) — e2e/triad.mjs 5/5
- [x] Blok F: playlist-video's (58) commando per commando naast elkaar, verschillen wegwerken
  - [x] oude open punten: Delete Face (Delete/Patch/Fill), Pierce-relatie, schetskleur, gedeelde-schets-icoon, Loft Direction Vector/Tangency To Face, Richting 2 Up To Vertex/Surface/Next (e2e/blockf.mjs 6/6)
  - [x] inventaris per video (4 agents) en verschillen wegwerken (alle 58, de laatste 10 in docs/24)
- [x] Na elk blok: tsc, unit tests, e2e van het blok, screenshot; op het einde volledige regressie, versie ophogen, installer (nagekeken 2026-10-27: gedaan in een latere ronde)

## Vervolg 33: QA-rapport (extern, 52 bevindingen) verwerken → 0.3.2 (2026-10-25)
- [x] Rapport gelezen (phlippo-cad-qa-rapport…pages.grok.bot); per bevinding status in docs/08-qa-rapport.md
- [x] Dataverlies: Rebuild zonder undo-verlies, schemavalidatie + migraties, atomaire save met .bak, "Save changes?" bij Open/New/Close/Alt+F4, autosave per document met foutmelding, .kcad-koppeling
- [x] Electron: paden alleen uit het main-proces, CSP, will-navigate/senderFrame-checks, testhooks alleen met PHLIPPO_E2E, decal alleen data:, fuses + ASAR-integriteit
- [x] Invoer: eenheden in elk getalveld, 0/negatief/NaN/∞ geweigerd (Modify, diepte, hoek, grootte), lege schets geweigerd, 2000 instanties, 64 MB
- [x] Geometrie: csg-resultaat gecontroleerd, één feature faalt nooit de hele rebuild, verloren randreferenties gemeld, toleranties in één module
- [x] GPU-lek: alles opgeruimd per rebuild + dispose bij unmount + contextlost-melding (e2e meet geometrie-aantal)
- [x] Start zoals SW: lege app + Welcome, Recent Documents, Document Recovery, Trimetric, geen watermerk, Confirm Delete-standaarden, Enter herhaalt, muisgebaren (4), Extrude-PM-iconen, About-disclaimer
- [x] Proces: exitcodes in alle e2e-scripts, regressie telt fouten, CI-workflow, PW_CHROMIUM/PW_CHANNEL, verouderde tests bijgewerkt, e2e/qa1.mjs 26/26 + e2e/qa2.mjs 17/17, unit tests bestandsformaat
- [x] Build 0.3.2 + volledige regressie (67 scripts groen na 3 testcorrecties: CSP-meta zonder frame-ancestors, Confirm Delete-standaarden) + installer met fuses geïnstalleerd (autosave bewaard, desktop-checks 8/8 en no-hooks 3/3) + schermafbeeldingen (Deurkruk)
- [x] Later: code signing, worker/incrementele rebuild, B-rep-proef, vitest-major voor npm audit (signing gesloten op besluit, B-rep in 0.3.7–0.4.2, worker beoordeeld in docs/19, vitest 5)

## Vervolg 34: resterende SOLIDWORKS-onderdelen uit de playlist-inventaris (2026-10-25)
- [x] Commit 0.3.2 lokaal
- [x] Blok V visuele kwaliteit (op verzoek van Ian: "ziet er versimpeld uit"): belichting gemeten op frame f_0118 (bovenvlak 219 / voorvlak 240 / zijvlak 218), randen zwart 1,5 px anti-aliased (LineSegments2), achtergrond #fcfcfc, Features-tab + boom + PM-kop in isometrische iconen (icons3d.tsx), Sketch-tab in lijn-iconen (iconsSketch.tsx), heads-up-iconen, manager-tabs, Part-icoon + configuratiebadge, PM-richtingsiconen en D1-glyph, spinknoppen, Search Commands als donkere tegel, lint-afstanden zoals SW
- [x] Blok G-A (e2e/ga1.mjs 19/19, e2e/ga2.mjs 16/16; nog niet: Section View offset-modus, PM-titel "Line Properties") kleine PM-/dialoogopties: Line (Additional Parameters, As sketched/Horizontal/Vertical/Angle, Midpoint line), Point (Control Vertex Parameters), Rectangle (Add dimensions, From Corners/Midpoints), Circle (Add dimensions, Diameter), relaties Coradial/Equal Curve Length, Properties-PM Selected Entities, Section View offset/Section by Body, Dimension-PM All uppercase/Dual Dimension, Equations Filter All Fields/Automatic solve order, Chamfer Vertex/Offset Face/Face Face + Chamfer Options, Sweep-opties (Circular/Solid profile, Follow Path/Twist, Merge tangent faces, Align with end faces, Curvature Display), Loft (Next Face, Apply to all, Centerline Parameters, Drag Sketch, Merge tangent faces, Close loft), Fill Pattern indeling (Perforation/Circular/Square/Polygon, Validate Count, Create seed cut), Zebra Stripes
- [x] Blok G-B (e2e/gb.mjs 32/32) rechtsklikmenu's: feature (Comment, Parent/Child, Configure Feature, Add to Favorites, Feature Properties, Go To, Create New Folder, Hide/Show Tree Items), body/cut-list (Body Display, Delete/Keep Body, Add to New Folder, Insert into New Part, Save Selection, Change Transparency, Show Feature History, Save Bodies, Create Bounding Box)
- [x] Blok G-C (export3d.ts: ASCII/binair STL, 3MF-zip, AMF; Export Options-pagina; eigen viewer later) export: Save As STL/3MF/AMF-optiepagina (ASCII/binair, eenheden, resolutie, info vooraf, positieve ruimte, één bestand), Publish to eDrawings-equivalent (HTML-viewer)
- [x] Blok G-D (surfaces2.ts; e2e/gd.mjs 23/23; Freeform als 'later') Surfaces: Filled, Ruled, Extend, Untrim, Replace Face, Thickened Cut, Cut With Surface + Feature Scope, Surface Flatten
- [x] Blok G-E Sheet Metal extra's: Swept Flange, Forming Tool (Design Library-lijst), Sheet Metal Gusset, Tab and Slot, Simple Hole, Vent (boundary/ribs/spars/fill-in), Normal cut + Link to thickness + Optimize geometry op Extruded Cut, Rip, Insert Bends, Profile Sketch-controle ("The sketch is valid."); Sheet Metal-tab in SW-volgorde; kernel `sheetmetal4.ts` + unit tests + e2e `ge.mjs` (59 checks)
- [x] Blok G-F Evaluate: Performance Evaluation (rebuildtijd per feature + statistieken), Symmetry Check, Deviation Analysis, Parting Line Analysis (kleuren + parting line), Compare (Body Compare / Compare Documents), Check Active Document in Tools-menu, SimulationXpress Analysis Wizard (6 stappen, balk-schatting); kernel `evaluate2.ts` + unit tests + e2e `gf.mjs`
- [x] Blok G-G Customize-dialoog (Toolbars: CM-tabs/Quick Access/grote knoppen; Shortcut Bars per context; Commands-catalogus + Add to Quick Access; Menus verbergen; Keyboard herbinden; Mouse Gestures per richting + aan/uit; Customization: tooltips/lock/reset) met echte prefs; commando-register `commands.tsx`; e2e `gg.mjs` (22 checks)
- [x] Blok G-H Weldments: Weldments-tab, Weldment, Structural Member (ISO/ANSI-profielbibliotheek, End Miter/End Butt1/End Butt2, rotatie/spiegel/Locate Profile), Trim/Extend (bodies of vlak, weld gap), End Cap (dikte, offset/ratio, afschuining), Gusset (driehoekig/polygonaal), Weld Bead (ook intermitterend, Weld Folder), Cut list met Cut-List-Items + Properties-dialoog; kernel `weldments.ts` + unit tests + e2e `gh.mjs` (29 checks)
- [x] Blok G-I Material-velden (Compressive Strength-rij, Description/Source/Sustainability, Favorites-tab + favorietenmenu op Material in de boom) en MBD Dimensions-tab (Auto Dimension Scheme met Prismatic/Turned en Plus-Minus/Geometric, Datum, Size/Location/Pattern Dimension, Geometric Tolerance, Show Tolerance Status, Copy/Import Scheme, Delete All Tolerances, TolAnalyst-stack-up; DimXpertManager + callouts in de viewport); kernel `dimxpert.ts` + unit tests + e2e `gi.mjs` (29 checks)
- [x] Blok G-J resterende inventarisverschillen: statusbalk Length / Distance dX dY dZ / Diameter+Center / Area, Line/Circle/Arc/Point Properties-titels + Insert Line-Message, Display/Delete Relations met filter (Dangling, Overdefining/Not Solved, …) + Delete All + Entities, Hole Wizard ANSI Inch (+JIS), View ▸ Display-submenu (stijlen, Zebra, Perspective, Shadows, AO, RealView, Tangent Edges) en Up Axis Y/Z, Deform (Point) met regio/stijfheid, Save As-dialoog (copy and continue/open, suffix), Publish to Phlippo Viewer (*.html, standalone viewer = eDrawings-equivalent), tekening Flat Pattern Display (Bend lines + Bend notes); unit tests + e2e `gj.mjs` (37 checks)
- [x] Playlist-inventaris afmaken (video's 13–15, 21–24, 26–37): inventaris in docs/07; resterende items in blokken G-A..G-J verwerkt. Niet gedaan (bewust): Baseline/Ordinate/Path Length-dimensies (nieuwe schetsdimensie-types), "Set origin on curve", TolAnalyst als volledige add-in (nu stack-up-schatting), 8/12-richtingen muisgebaren
- [x] Na elk blok tsc + e2e; volledige regressie 0.3.3 (77 scripts, 1 fout gefixt → groen, log e2e-out/regression-0.3.3.txt), installer Phlippo CAD-Setup-0.3.3.exe gebouwd + stil geïnstalleerd (e2e/desktop-installed.mjs 3/3), schermafbeeldingen verstuurd

## Vervolg 35: QA-rapport v0.3.3 (extern, F53–F76 + resterende F01–F52) verwerken → 0.3.4 (2026-10-25)
- [x] F53/F61/F65: viewport-brug in plaats van window-testhaken (Zoom to Fit, Final Render, previews, snapshots, ViewPane, Locate Profile, tekening-fit herstelt bij sluiten); e2e zonder haken
- [x] F62: Viewer-export escapet `<`/`</script>`, CSP-meta in de viewer, kleur gecontroleerd (unit test)
- [x] F55/F05/F70/F40: diepe schemavalidatie (assembly, mates, drawing, bereik/diepte), geen autosave van een kapot document, eerlijke foutmelding, atomicWrite met fsync + 2 .bak-generaties + tmp-opruiming
- [x] F74/F75/F76/F60/F39/F41/F71/F42: editContext-reset bij Open/New, undo voor mates/hide/rename/tabel/scène, interferentie meldt booleanfouten, assembly-cut faalt per component, Edit Component/Return/Toolbox Open zonder undo-verlies, bovengrens getallen, expressies in getalvelden
- [x] F14/F63/F66/F18/F64: doc.kind standaard 'part', commando's grijs zonder body, Sheet Metal-knoppen grijs zonder plaatbody + eigen iconen, vlaklabels zonder overlap + juiste pick, DimXpertManager-tekst
- [x] F56/F50/F72/F73: Quick Beam Estimate (indicatief), hernoemlijst SW-namen, disclaimer in Welcome/installer/Viewer, docs/06 gecorrigeerd, LICENSE + THIRD-PARTY-NOTICES
- [x] F54/F57/F31/F32/F33/F38/F52: gedeelde e2e-helper (exit 1 bij page errors), `|| true` weg, verouderde selectors (features, fixes1, surfaces), rechtssleep zonder contextmenu (Linux), tekening Ø/restore, e2e:regression-script gecommit, hermetisch (geen e2e-out-json)
- [x] F67/F68/F69/F65/F49/F03: Electron: geen standaardmenu/DevTools in de packaged app, bestandshandles i.p.v. paden, openExternal-allowlist, isPackaged-gates, will-navigate alleen eigen pagina, drop-preventie, trusted() exact, fuse inspect uit
- [x] F59/F26/F37/F44/F46/F36: tsbuildinfo uit git, lang="en", npm audit, cap 250 + rebuild met wall-clock-budget, store-helpers afgesplitst
- [x] docs/11-qa-rapport-2.md met status per bevinding; tsc, unit tests, volledige regressie, versie 0.3.4, installer + stille installatie (Local Storage-backup eerst), schermafbeeldingen, commit lokaal
- [x] Later (architectuur, eigen fase): store opsplitsen (F36), CSG in een worker (F46), B-rep-kernel (F47/F51), code signing (F49), visuele rest (F16/F19–F22/F24) (gedaan in 0.3.6–0.4.2; F49 gesloten op besluit)

## Vervolg 36: QA-rapport v0.3.4 (extern, F01–F92, 6/10 NO-GO) verwerken → 0.3.5 (2026-10-26)
- [x] F82: 0.3.4 is gecommit (f001b13) → tag v0.3.4; F84 doorhandle schrijft niet meer in voorbeelden/ (alleen met UPDATE_EXAMPLES=1)
- [x] F74/F41: opslagvraag tijdens Edit Component (Ctrl+N/Ctrl+O/Open, Make Multibody Part met Save), editContext pas na bevestiging weg
- [x] F10/F54/F57/F31: drawing Ø35 robuust (ook Linux-fonts), gedeelde e2e-helper e2e/lib/check.mjs (exit 1 bij FAIL en page error, console-allowlist), smoke/relations/keys/deletekey(2) erop, lege catches weg, CI-timeout
- [x] F80/F78/F40/F05/F70/F81: referentiële validatie (punten, schetsen, componenten, feature-types, grenzen als de UI), rebuild-fouten zichtbaar in de boom + What's Wrong bij openen, Ctrl+S met fouten vraagt bevestiging, melding bij afkappen/weigeren
- [x] F50/F77/F92/F56/F90: resterende merknamen (Hole Wizard, Toolbox, Design Library, Lifecycle and Collaboration, Smart Fasteners), kapotte teksten, 'as the original'-commentaren neutraal, FOS zonder groen, Tolerance Stack-up eerlijk
- [x] F85/F87/F88/F89/F83/F91: packaged app weigert debug-switches, permissies deny-by-default, app://-protocol + fuse, testhaken alleen in de e2e-build (VITE_TEST_HOOKS), dubbele gate weg, Chromium-licenties
- [x] F14/F79/F48/F86/F33/F28/F19/F20: Linear Pattern grijs, Final Render zonder highlight, volume-check na booleans, lektest in de regressie, machinegebonden scripts apart, desktop auto-browse getest, statusbalk XYZ, Confirmation Corner
- [x] docs/12 met status per bevinding + correcties docs/11 (F38); tsc, unit, volledige regressie (e2e-build), installer + rooktest geïnstalleerde app, screenshots, commit + tag v0.3.5
- [x] Later (architectuur, eigen fase): store opsplitsen (F36), CSG in een worker (F46), B-rep-kernel (F47/F51), code signing (F49), interne namen (PropertyManager.tsx, doc.dimxpert), taakvenster-iconen (F21), iconen/lettertype (F16) (gedaan in 0.3.6–0.4.2; F49 gesloten op besluit)

## Vervolg 37: resterende punten na 0.3.5 (2026-10-26)
- [x] F34: bundel opsplitsen (zware dialogen en panelen lazy laden, manualChunks), gemeten voor/na
- [x] F36: store opsplitsen in slices (zelfde API), zware componenten met selectors i.p.v. de hele store
- [x] F50 rest: interne namen (PropertyManager-bestanden/componenten, dimxpert-identifiers, dialoog-id simxpress) neutraal; bestandsveld via migratie
- [x] F21/F16: taakvenster-iconen en lettermaten naast de referentieframes
- [x] F46: haalbaarheid van rebuild in een worker beoordelen; wat kan zonder de hele store async te maken
- [x] tsc, unit, volledige regressie, desktop-checks, installer 0.3.6, screenshots, commit + tag (regressie 81/81, unit 346, desktop 8/8 + 10/10 + delete, geïnstalleerd 9/9)

## Vervolg 38: zonder certificaat, B-rep-kern en stabiele randen (2026-10-26)
- [x] F49: geen code signing (Ian levert geen certificaat); SmartScreen-stap documenteren, F49 sluiten
- [x] F47: randverwijzingen met richting en aanliggende vlaknormalen; een rand die door een eerdere feature verschuift wordt teruggevonden (unit test + e2e)
- [x] F51 spike: OpenCascade (replicad + opencascade-wasm) in een worker; extrude, fillet op echte topologie, volume tegen de mesh-kern, tijd en bundelgrootte gemeten
- [x] F51: STEP importeren (File ▸ Open / Insert ▸ Imported) en STEP exporteren via OpenCascade, zoals SOLIDWORKS
- [x] Beslisdocument kern (docs/14) met meetwaarden en migratiepad
- [x] tsc, unit, regressie, desktop, installer 0.3.7, screenshots, commit + tag (regressie 82/82, unit 351, geïnstalleerd 9/9)

## Vervolg 39: features via OpenCascade, mesh-kern als terugval (2026-10-26)
- [x] Contouren met hun entiteiten in volgorde (lijnen, bogen, cirkels) zodat een B-rep-draad exact is
- [x] B-rep-kern (src/core/occt/brep.ts): profiel → vlak, extrude (blind, mid plane, through all, twee richtingen), fuse/cut, tesselleren
- [x] rebuild.ts: per body een B-rep-vorm zolang elke feature ondersteund is; elke andere feature valt terug op de mesh-kern
- [x] Fillet en chamfer (constante maat) op echte randen; revolve (boss/cut)
- [x] Worker: rebuild met de B-rep-kern; de app vervangt de mesh-bodies door de exacte (selectie blijft kloppen)
- [x] STEP-export uit de B-rep (echte cilinders, geen facetten) wanneer de body exact is
- [x] Extra: Hole Tool (cilinders/kegels), gedeeltelijke revolve, sweep langs schetspad, shell (met volume-vangnet), assemblies uit exacte onderdelen, Mass Properties exact
- [x] Unit tests per feature (volume, vlakken) en e2e; optie in Tools ▸ Options; regressie, desktop, installer 0.3.8 (unit 364, regressie 83/83, desktop 8/8 + 12/12 + delete)

## Vervolg 40: open stukken B-rep — patronen, mirror, loft, draft, shell naast afronding (2026-10-26)
- [x] Linear en circular pattern (en sketch/table pattern) van features via B-rep: elke instantie het B-rep-gereedschap verplaatst
- [x] Mirror (features en bodies) via een B-rep-spiegeling
- [x] Loft (boss/cut) tussen twee profielen via ThruSections, met volume-vangnet
- [x] Draft (neutraal vlak, vlakken) via DraftAngle, met volume-vangnet
- [x] Shell naast een afronding: uitgezocht (rand meetkundig niet eenduidig; OCCT weigert, mesh benadert; zonder SW-referentie blijft het vangnet de mesh kiezen) — docs/16
- [x] Tests (unit + e2e), regressie, desktop, installer 0.3.9, screenshots, commit + tag (unit 368, regressie 83/83)

## Vervolg 41: B-rep verder — eindcondities, rib, thin, sheet metal basis, topologische namen (2026-10-26)
- [x] Extrude-eindcondities via B-rep: Up To Vertex, Up To Next, Up To Surface, Offset From Surface, Up To Body, From offset, Flip side to cut
- [x] Thin Feature (extrude en revolve) via B-rep
- [x] Rib via B-rep
- [x] Sheet metal Base Flange/Tab via B-rep (plaat + bochten als echte cilinders)
- [x] Topologische namen (beoordeeld in docs/19: apart traject)
- [x] Tests (unit + e2e), regressie (83/83 op de 0.4.0-code); uitgebracht samen met Vervolg 42 als 0.4.1

## Vervolg 42: plaatwerk-flenzen, topologische namen, rebuild in de worker (2026-10-26)
- [x] Edge Flange via B-rep: bocht als echte cilindersector, been als prisma
- [x] Hem, Jog en Sketched Bend via B-rep; ook multi-radius en variabele fillet (Miter Flange: volgende ronde)
- [x] (beoordeeld in docs/19) Topologische namen: een randverwijzing onthoudt de features van zijn twee vlakken; bij twijfel tussen kandidaten wint de rand met dezelfde herkomst
- [x] (beoordeeld in docs/19) Rebuild in de worker (F46): voor exacte parts komt de mesh-stap niet meer op de hoofdthread als de worker klaar staat
- [x] Tests, regressie (83/83), desktop, installer 0.4.1, screenshots, commit + tag
- [x] Extra in 0.4.1: Miter Flange, Revolve Thin, weldment-frames (Structural Member, Trim/Extend, End Cap), Combine/Intersect, Stud, vlakke terugval (docs/18)

## Vervolg 43: verder naar volledige B-rep (2026-10-26)
- [x] Weldments: het verstek op de begin/eindhoek van een gesloten pad (alle vier de hoeken van een frame), ook in de mesh-kern
- [x] Thread (gemodelleerd) via B-rep: driehoeksprofiel langs een echte helix
- [x] Beoordeeld, apart traject (docs/19): Topologische namen: bij twijfel tussen kandidaat-randen wint de rand met dezelfde herkomst
- [x] Beoordeeld, apart traject (docs/19): Rebuild in de worker (F46): geen dubbele rebuild op de hoofdthread voor exacte parts
- [x] Tests, regressie (83/83), desktop, installer 0.4.2, screenshots, commit + tag

## Vervolg 44: Move/Copy Bodies, Bodies to Keep, oude open punten (2026-10-27)
- [x] Move/Copy Bodies (Insert ▸ Features ▸ Move/Copy): bodies kiezen, kopiëren met aantal, verschuiven ΔX/ΔY/ΔZ, draaien om X/Y/Z rond een punt; exact via B-rep
- [x] Bodies to Keep: een snede die een lichaam in stukken deelt geeft aparte bodies; dialoog "Bodies to Keep" (All bodies / Selected bodies) zoals SOLIDWORKS
- [x] Oude open punten in TASKS.md nalopen: gedane afvinken, echte restpunten oplossen
- [x] Tests, regressie (85/85), desktop, installer 0.4.3, screenshots, commit + tag

## Vervolg 45: ontwerpronde naast de referentievideo (2026-10-27)
- [x] Oorsprong in part-modus: standaard verborgen (frames 50 en 118 tonen geen oorsprong), achter het onderdeel als hij aan staat; in schetsmodus en onder een feature-preview de rode schetsoorsprong bovenop
- [x] Boss-Extrude naast frame 111: schetsregio donker onder de preview (gemeten 162,166,118 tegen 162,165,118), gele preview donkerder (208,214,156 tegen 211,216,158), schetslijnen effen zwart over de gele randen (geen z-fighting meer), sleeppijl met schaduwkegel en gevulde kegeltjes voor Direction 2
- [x] Schetsen naast frames 70, 82 en 95 (e2e/tools/compare-sketch.mjs): contourvulling 179/126 grijs zoals de referentie, maten zonder plaatsing buiten de schets
- [x] Tests, regressie, desktop, installer 0.4.4, screenshots, commit + tag (unit 387, regressie 85/85, desktop 8/8 + 12/12)

## Vervolg 46: tekening en assembly naast de referentie (2026-10-28)
- [x] Tekening naast video 36 (frame 0004): het blad vulde het venster niet en de bladtabs vielen weg; de ResizeObserver mat de lege host van vóór het blad. Nu wordt de echte host gemeten, het blad past in en de bladtabs staan onderaan.
- [x] Assembly naast frame 340: lint, tabs en boom gelijk (eigen namen Drag Handles en Auto Fasteners blijven)
- [x] Insert Component naast frame 320: het part dat open was vóór File ▸ New staat onder Open documents, is geselecteerd en hangt meteen als preview aan de cursor (sessionParts; e2e/tools/compare-insert.mjs)
- [x] Tests, regressie, desktop, installer 0.4.5, commit + tag (unit 387, regressie 85/85, desktop 8/8 + 12/12)

## Vervolg 47: playlist-inventaris video 39–52 (2026-10-28)
- [x] Inventaris video 39–44 en 45–52 (twee agents; 38 is Onshape, 46 en 53–58 niet gedownload): e2e-out/inventaris-39-44.md en -45-52.md; e2e/inventory47.mjs 15/15
- [x] Thread-PM naast frame 298: Favorite open met vijf knoppen (eigen ster-plus-icoon) en volle keuzelijst, Type/Size volle breedte, diameter en spoed grijs tot Override, Locate Profile gecentreerd
- [x] Appearances-paneel naast frame 142: categorieën als map met kleurbal, takenpaneelkop met « links en de titel in het midden (frame 262 is de Dimension-PM, al vergeleken)
- [x] Gevonden verschillen (39–44) oplossen:
  - [x] statusbalk: prompt per commando (Smart Dimension, Offset, Polygon, Selected Contours, Sweep, maat geselecteerd), Total Length bij meerdere curves/randen
  - [x] contextwerkbalk bij klik op een boomitem (Edit Feature, Edit Sketch, Suppress, Normal To, Zoom to Fit; na een korte rust, klikbaar zodra de pointer erop staat)
  - [x] schets-RMB-menu: Selection Tools ▸, Recent Commands ▸, Sketch Entities ▸, More Dimensions ▸, Display Grid, Fully Define Sketch…, Sketch Tools ▸ (Menu kent nu fly-outs); maatkop met Link Values…, Driven, Mark For Drawing (Model Items slaat ongemarkeerde maten over)
  - [x] Dimension Text: R<DIM> en <MOD-DIAM><DIM> als standaardtekst (Rectangle-PM "Static" niet gewijzigd: frame 70 en het rect3-frame spreken elkaar tegen)
  - [x] Modify: Reverse the sense of the dimension en Mark dimension to be imported into a drawing
  - [x] Chamfer-callout met Angle; Linear Pattern-flyout met Mirror; bodies met [n] bij dezelfde naam; bodymateriaal als kindrij
  - [x] Hole Wizard: titel Hole Position op het tabblad Positions met de Type-verwijzing; ANSI Metric-typenamen (B18.2.3.5M, B18.6.7M …)
  - [x] Loft: profielenlijst met ▲▼, Apply to all als vinkje bij Start constraint (callouts hadden de schetsnaam al)
  - [x] Loft: modelvlakken als profiel, Curvature To Face, Next Face (0.5.0)
  - [x] Equations: groep Features met Add feature suppression ("suppressed"/"unsuppressed" of een voorwaarde), Sketch Equation View, vier view-iconen links van het filter
  - [x] Evaluate ▸ Import Diagnostics: foute vlakken en gaten van de geïmporteerde driehoeken, Attempt to Heal All last punten binnen de tolerantie (Check staat al op de tab)
  - [x] Appearance: kop met ✓/✗ (✗ zet terug), Selected Geometry + Remove Appearance, Color met standaardpalet 8×5, kleurveld en Red/Green/Blue, statusprompt "Select entities to modify their appearance."
  - [x] Appearance: tabs Basic/Advanced en Color/Image/Mapping (0.5.0)
- [x] Verschillen 45–52 (tweede agent, e2e-out/inventaris-45-52.md):
  - [x] meer statusprompts (Select sweep profile, Edge Flange, Mirror, Sketched Bend, Break Corner, callout), open boogrand toont Radius
  - [x] contextwerkbalk op een body in de boom (Hide/Show, Isolate, Appearance, Zoom to Fit)
  - [x] contextwerkbalk na linksklik in een schets (relaties met "Make …"-tooltips; ook op de RMB-werkbalk)
  - [x] cut list: aantal altijd "(n)", body-[n], materiaal als kindrij; materialen Red Oak, American Cherry
  - [x] Fill Pattern: Create seed cut als radio bij Features and Faces, layoutvolgorde Perforation/Circular/Square/Polygon
  - [x] Section View: "Section by Body", Offset perpendicular to (Reference plane / Selected plane, unit test)
  - [x] Insert Bends: Ignore beveled faces; face fillet Hold Line (0.5.0)
  - [x] View-menu: Redraw, Screen Capture ▸ Image Capture, Lights and Cameras ▸ Edit Scene, Toolbars ▸ Customize, Full Screen, Customize Menu; Display ▸ Curvature/Draft/Undercut/Parting Line/Section View; Tangent Edges als drie keuzes
  - [x] sensorwaarde als Mass1(23.8401841 g)
  - [x] plaatwerk-bochten in de boom: BaseBend1…, EdgeBend1…, MiterBend1… onder hun feature
  - [x] 3D-schets: Insert Line-PM met Orientation (As sketched / Along X/Y/Z, werkt op het volgende punt) en Control Vertex Parameters X/Y/Z van het laatste punt
  - [x] Segment (Sketch Tools ▸ Segment…): Sketch points of Sketch segments, n gelijke delen (unit 3, e2e)
  - [x] ribbon-tooltips met beschrijving voor alle commando's (catalogus registreert zijn beschrijvingen; 94 eigen teksten in src/ui/tipTexts.ts)
  - [x] weldment-configuraties: een nieuwe weldment krijgt Default<As Machined> (actief) en Default<As Welded>, die de snedes en gaten na de Weldment-feature onderdrukt (unit test)
- [x] Tests, regressie (86/86 met inventory47, unit 389), installer 0.4.6, screenshots, commit
- [x] Release 0.4.7: unit 392, regressie 86/86, desktop, installer (Loft, Appearance, bochten in de boom, Segment, 3D-schets)
- [x] Release 0.4.8: ribbon-tooltips voor alle knoppen, weldment-configuraties; unit 393, regressie 86/86, installer

## QA-rapport 0.4.8 verwerken (2026-10-27)
- [x] F10/F54/F102: drawing.mjs Ø35-plaatsing los van font/metriek, reload-check splitsen (views/notes vs maten); draaien met Linux-achtige Chromium (swiftshader)
- [x] F93/F38: docs eerlijk: "Windows-regressie", Linux-status apart; README/docs/12 corrigeren
- [x] F95: engines.node >=22 in package.json, .nvmrc 22
- [x] F50/F94: Pack and Go → Package Files, MBD Dimensions → Product Dimensions (regex in uiText.test + rename-trademarks)
- [x] F96: tooltip Tolerance Sum gelijk aan de dialoog; F101: clickall/peek/desktop-export exitCode
- [x] F106/F107: occtClient- en solver-timeouts met herstart; solver-worker gebruiken of schrappen
- [x] F99: exact/benadering-indicator per body + STEP-waarschuwing bij mesh-bodies
- [x] F97/F100: desktop-installed uitbreiden (schets, extrude, fillet, STEP, Save onder app:// + WASM); desktop-nohooks in CI
- [x] F105: CI-stap met phlippo.kernel=brep op features/fillet/step/bodies
- [x] F104: blank.html-flits in migrateStorage; release 0.4.9 (unit, regressie, desktop, installer)
- [x] Open na 0.4.9: F46, F103, F47/F48 opgepakt in 0.5.0; F98 pushen blijft de beslissing van Ian

## Open punten afwerken na 0.4.9 (2026-10-27)
- [x] F46: zware part-rebuilds in een eigen worker (mesh-CSG van de UI-thread), synchroon budget ~4 s, "Rebuilding…" in de statusbalk; e2e die de UI-thread meet
- [x] F48: gesloten-check na elke boolean (som van georiënteerde oppervlakken); een opening wordt een rebuild-waarschuwing (gele driehoek, What's Wrong ▸ Show warnings)
- [x] F47: vlaknamen (feature + schetsentiteit) als attribuut door de booleans; randen herkend aan hun twee vlaknamen; ook op exacte bodies (unit + e2e facenames, mesh en B-rep)
- [x] F103: PropertyPanel.tsx gesplitst in pm/ (7 families + schets + gedeeld; max 841 regels); tools/line-budget.cjs in CI
- [x] Loft: modelvlak als tweede profiel (Selected face as profile), Curvature To Face, Next Face (unit + e2e loftface)
- [x] Appearance: Basic/Advanced; tabs Color/Image (afbeelding), Mapping (box/projectie/cilinder/bol, breedte, rotatie, spiegelen), Illumination, Surface Finish (e2e appearance2)
- [x] Insert Bends: Ignore beveled faces + bochten geteld in de boom (SharpBend); Face Fillet ▸ Hold line (unit + e2e)
- [x] Release 0.5.0: unit 404, regressie Windows 90/90, B-rep-pass 11/11, worker-pass 6/6, desktop 8/8 + 12/12, installer + zelftest 19/19 (rebuild-worker onder app://), screenshots

## Ontbrekende playlist-video's 08, 09, 35, 46, 53–58 (2026-10-27)
- [x] Downloaden en frames maken: 08, 09, 35, 55, 56, 57, 58 binnen; 46, 53, 54 opnieuw (netwerk en botcontrole)
- [x] Inventaris per video: e2e-out/inventaris-08-09-35-55.md, -46-53-54.md, -56-58.md
- [x] Verschillen wegwerken, met e2e-tests (videos56, videos46, videos54); overzicht docs/24-playlist-video-08-58.md
- [x] Regressie, commit en push (Windows 93/93, B-rep 11/11, worker 6/6, unit 416, desktop 8/8 + 12/12)

## Verschillen video 56–58 wegwerken (2026-10-27)
- [x] Rib: Type Linear/Natural, Draft On/Off-knop, Rib Thickness At sketch plane / At wall interface
- [x] Delete Face: Show selection toolbar en Show preview
- [x] Statusbalkprompts (rib, full round fillet, handles, mirror) en Perimeter/Radius-readouts
- [x] Live Length-readout bij slepen van de flenshandgreep: bewust niet (Phlippo heeft geen sleephandgreep voor de flenshoogte, docs/24)
- [x] Mass-sensor 9 significante cijfers
- [x] Modify-box: Global Variables ▸, File Properties ▸, Functions ▸ en tooltip
- [x] Contextwerkbalk schets in de boom: Show/Hide en Zoom to Selection
- [x] Sketch/Curve Color PM
- [x] Slot als één entiteit bij Trim (waarschuwing met Don't show again)
- [x] Instant2D (bestaat als Drag Dimensions, naam bewust anders), plaatwerk-mirror tooltip, full round fillet callouts

## Verschillen video 08, 09, 35, 55 wegwerken (2026-10-27)
- [x] Vergelijkingen in PM-getalvelden (="HALFWIRE"+4) met het =-menu (Global Variables, Functions, File Properties; SW-Density)
- [x] Sweep: Merge result, Feature Scope en Minimum Twist
- [x] Composite Curve en sweep langs modelranden of een composite curve
- [x] Doubled Distance (diametermaat over een middellijn)
- [x] Up To Vertex op punten van een layoutschets
- [x] Delete/Keep Body als PM (ook in Insert ▸ Features)
- [x] Menu's met echte submenu's (alle groepen in de menubalk)
- [x] Plane: Project-optie bij een punt: bewust niet (het Plane-PM kent nog geen punten als referentie, docs/24)
- [x] Edge Flange: Bend from Virtual Sharp en Tangent to Bend: bewust niet (geometrie bij andere hoeken niet zeker, docs/24)
- [x] Curve Through XYZ Points / Reference Points
- [x] Selection Filter-werkbalk (F5, F6)
- [x] Statusbalk: Normal Distance bij twee vlakken of lijnen, Diameter bij een cilindervlak
- [x] Tab<n> voor een Base Flange op een bestaand plaatwerkpart
- [x] Statusprompts rechthoek, cirkel, 3-puntsboog, Circular Pattern; relatienamen met volgnummer
- [x] Materialen Cast Alloy Steel, PBT General Purpose (Nickel en Rubber bestonden al)

## Verschillen video 46, 53, 54 wegwerken (2026-10-27)
- [x] Equations-dialoog: keuzelijst na = in de Value-cel; Σ in velden met een vergelijking
- [x] Contextwerkbalk op een vlak in de boom (Sketch, Show/Hide, Zoom to Selection, Normal To)
- [x] Bodies en standaardvlakken hernoemen
- [x] Mass Properties voor geselecteerde bodies
- [x] Base Flange als Tab op bestaand plaatwerk (verkorte PM, Tab1)
- [x] Override default parameters bij bewerken van Base-Flange1
- [x] Vlak loodrecht op een curve in zijn eindpunt
- [x] 3D-schets: Sketch Fillet op de hoeken en drijvende lijnlengtes (vrije 3D-bogen en 3D-maten bewust nog niet, docs/24)
- [x] Edit Flange Profile als echte profielschets (Profile Sketch-dialoog)
- [x] Measure Total Length voor meer dan 2 randen; voettekst File/Config
- [x] Equations-map in de boom uitklapbaar met Σ-icoon

## Kleinere verschillen video 08–58 (2026-10-27)
- [x] New Document ▸ Advanced (Templates / Tutorial, sjablonen met materiaal en eenheden, Novice)
- [x] Menu-items tonen hun beschrijving in de statusbalk
- [x] Tools-menu: Select, Select All, Sketch Settings, Geometry/Thickness Analysis, Symmetry Check, Add-Ins
- [x] Rechtsklikmenu Extrude: Zoom/Pan/Rotate als submenu, Direction 2 in SW-volgorde met Up To Next
- [x] Appearances ▸ Plastic: Soft Touch, Textured, Clear Plastic, Satin Finish, EDM, Patterned
- [x] Material-dialoog: DIN Materials, Sustainability Extras, Save model type in library
- [x] Tooltips: maatnaam (D3@Sketch6), volledige naam bij afgekapte boomrijen
- [x] On-screen numeric input bij lijn en cirkel

## QA-rapport 0.5.1 verwerken (2026-10-27)
- [x] Per bevinding een status in docs/25-qa-rapport-v0.5.1.md
- [x] CI-waarheid (afgerond: QA 0.5.11 bevestigt F115/F125, Actions 41862412746 groen): rebuildworker-framegap opgelost (software-GL: dunne randen, F125); qa2 + facenames + worker-pass in CI (F120); skips geteld (F119); drawing-test wacht op rust en meldt wat onder de klik ligt (F10, Linux niet lokaal te draaien); SwiftShader-schakelaar in de app wacht op Ians OK (F115)
- [x] Assembly: solver ordent vanaf de vaste componenten, beide kanten verplaatsbaar (F109); vrijheidsgraden gemeten → (-)/(+)/niets, conflicterende mate rood, statusbalk Under/Fully/Over Defined (F108); Lock rotation werkt echt; M1/M2 als unit-tests
- [x] Topologie: gesplitste rand in al zijn stukken afgerond (F111); afronding van een gebogen rand als één gereedschap i.p.v. één boolean per facet (F110: 923 → 359 mm³); vlaknamen voor revolve; T2/T3 als unit-tests
- [x] Options eerlijk: wat het programma niet leest staat grijs (lijst getest tegen de broncode); AutoRecover op schijf (desktop) met interval en map, in Document Recovery; herinnering niet-opgeslagen; Length-eenheid en Mass/Section-eenheden doorgevoerd (F112)
- [x] Feature-reorder: slepen in de boom (met de eigen schets mee), parent/child-controle (no-drop), weigeren als een feature dan faalt, Undo; unit + e2e reorder (F113)
- [x] Tekening naar DXF (R12, mm, HIDDEN-laag) en PDF (vector, Helvetica), arcering mee, geen selectiekleur; IGES-export kan niet: de meegeleverde OCCT-build heeft alleen de IGES-reader (F114)
- [ ] Dome, Indent, Mounting Boss (F121) — volgende ronde; Instant3D als Drag Handles vastgelegd in docs/25
- [x] SW-Density → Density met migratie, SW- in de merknamentest (F116); Weldments blijft (vakwoord, F50); 3D ContentCentral hernoemd (F131/F132)
- [x] Afwerking: code-splitting, hoofdbundel 919 → 827 kB (F118); auto-centermarks bij nieuwe aanzichten + weergavestijl uit Options (F122); schetsrelaties Intersection, Merge, Equal Curvature (F123; Along X/Y/Z blijft de oriëntatie tijdens 3D-schetsen); WebGL-melding (F115)
- [x] Regressie (Windows 94/95 → qa3 opgelost, B-rep 11/11, worker 6/6), installer 0.5.2, commit, push
- [x] 0.5.3: concentric-conflict richting-onafhankelijk (Deurkruk vals Over Defined), test op het Deurkruk-voorbeeld

## QA 0.5.1 restpunten: SwiftShader, Dome/Indent/Mounting Boss, eigen woorden (2026-10-28)
- [x] Software-OpenGL (SwiftShader) in de desktop-app: optie + `--software-gl`, knop in de WebGL-melding, CI-stappen met de vlag, artefacten verplicht (F115/F128)
- [x] Dome op een vlak vlak (F121): rond (bolsegment, Elliptical, afstand 0 = halve bol), veelhoek (rechtop of Continuous), Reverse
- [x] Mounting Boss (F121): hardware head/thread, pin/hole, draft, vinnen; exact op de B-rep-kernel
- [x] Indent (F121): doel- en gereedschapslichaam, speling, wanddikte, Cut
- [x] Snap Hook en Lip/Groove (F121); unit plastics.test.ts, e2e plastics.mjs 25/25 (mesh, B-rep, worker)
- [x] Statusbalkprompts in eigen woorden, frame-tags weg, neutral-comments-check uitgebreid (F135/F136)
- [x] Ingeslikte catches in e2e gericht maken (F133); docs en line-budget-doelen (F129/F134)
- [x] Regressie (Windows 96/96, B-rep 12/12, worker 6/6), release 0.5.4, push
- [x] 0.5.5: voorbeeld van Dome, Indent, Mounting Boss, Snap Hook en Lip/Groove terwijl het paneel open is

## Uiterlijk en handelingen naast SOLIDWORKS leggen (2026-10-28)
- [x] Referentieframes zoeken: model in shaded-with-edges, achtergrond, selectie/hover, schets, PropertyManager
- [x] Uiterlijk vergelijken: belichting te vlak (219/240/218 i.p.v. 254/180/230), geen AO, selectie flets blauw i.p.v. cyaan; iconen (teal = standaardstijl), achtergrond en donker thema komen overeen
- [x] Uiterlijk aanpassen: belichting gekalibreerd, AO standaard aan (software-GL: na stilstand), selectie cyaan; voor/na in docs/screenshots/shading-voor-na.png
- [x] Basishandelingen vergelijken (quick-start-video 02, op 1920x1080): rechtsklik op vlak, lijnen, maten, extrude, fillet
- [x] Verschillen opgelost: rechtsklik vlak = werkbalk + menu; Enter = OK in featurepanelen; uitlijnlijnen + H/V op sluitende lijn; een berichtvak; e2e quickstart.mjs 8/8
- [x] Regressie, release 0.5.6 (desktop 12/12 + 9/9, geinstalleerd 19/19), push

## Realistischer beeld en duidelijke planes, zoals SOLIDWORKS 2025 (2026-10-28)
- [x] Planes: paarsblauwe rand, naam op het vlak zelf (leesbaar gedraaid), selectie hemelsblauw met ronde greepjes, hover oranje, geen stippellijnen, nauwelijks vulling
- [x] Achtergrond: wit met een zachte blauwgrijze band
- [x] Modelmateriaal: glanzend blauwgrijs met studioreflecties (PBR, eigen studio, virtueel oog voor verloop binnen vlakken); gekleurde onderdelen als kunststof
- [x] Vloer: vervagende spiegeling (alleen het voorste vlak) en zachte schaduw; spiegeling standaard aan
- [x] Kalibratie: box 134/186/230 tegen 138/195/240, voorvlak 126 (135), rechts 165 (165); tools calib-studio.mjs, look-planes.mjs
- [x] Regressie (96/97 → 97/97 na testaanpassing, B-rep 12/12, worker 6/6), release 0.5.7, push

## Plane onder de muis alleen tonen (2026-10-29)
- [x] Muis boven een plane (boom of beeld): de andere planes verdwijnen even, zoals SOLIDWORKS; aanwijzen van de andere blijft werken
- [x] Controle in quickstart.mjs (9/9), release 0.5.8, push

## Strenge zelfcontrole 1-op-1 met SOLIDWORKS 2025 (2026-10-29)
- [x] Referentieframes per gebied verzamelen (hoofdreferentie SOLIDWORKS Design 2026, 1920x1080, referentie-video/frames) en dezelfde toestanden in Phlippo vastleggen (e2e/tools/audit-shots.mjs)
- [x] Bovenbalk + Command Ribbon: pictogrammen, teksten, tabbladen, afstanden, kleuren
- [x] FeatureManager-boom: pictogrammen, teksten, inspringing, selectie/hover
- [x] PropertyManager-panelen (schets, extrude, fillet): koppen, secties, velden, pictogrammen
- [x] Heads-up-werkbalk, Task Pane, statusbalk, bevestigingshoek
- [x] Schets: lijnkleuren, punten, relatie-iconen, maten, Modify-venster (+ polygoon-solverfout opgelost)
- [x] Menu's en rechtsklikmenu's: teksten, volgorde, pictogrammen
- [x] Bevindingen vastleggen (docs/26), oplossen per gebied, voor/na-beelden
- [x] Regressie (97/97, B-rep 12/12, worker 6/6), release 0.5.9 geïnstalleerd (19/19), push

## Testronde op fouten na 0.5.9 (2026-10-30)
- [x] Alle suites: typecheck, unit (454, 2 wankele time-outs opgelost), browserregressie 98/98, B-rep 12/12, worker 6/6, CI-checks; 4 van de 10 overgeslagen stappen waren verborgen problemen
- [x] Verkennend testen van de 0.5.9-wijzigingen op Ians scherm (1280x672 @1.5), donker thema, tekening, assembly, gesplitst beeld, ingeklapt lint
- [x] Console-fouten en waarschuwingen nalopen (geen)
- [x] Gevonden fouten oplossen met een test per fout (e2e/round2.mjs: Exit Sketch houdt de schets geselecteerd, donker thema tabrij/pictogrammen)
- [x] Regressie, release 0.5.10 geïnstalleerd (19/19), push

## QA-rapport 0.5.10 verwerken naar 10/10 (2026-11-02)
- [x] P0 F140/F167/F111: zes opstellingen gereproduceerd, alle exact 30439,911; poort qaBrep.test.ts T3 (30439,91 ± 0,01) in npm test/CI; QA-opstelling niet na te spelen (bron niet in rapport)
- [x] P0 F159: volumeCheck.ts + brepRefine: > 0,5 % → waarschuwing op de feature en melding
- [x] P0 F139: gereproduceerd met het gat als aparte cut; twee oorzaken (kettingtolerantie, Keep-features-hersnede) opgelost; qaStrict T1 + varianten
- [ ] P0 F147/F31/F120/F105: ci.yml op ubuntu-24.04 (Playwright kent 26.04 niet: alle runs sinds 0.5.6 rood), mesh/B-rep/worker als aparte stappen met eindgate, log per pass; groene Actions-run op deze HEAD
- [ ] P0 F54/F144/F10/F146: Linux echt groen: drawing (Ø35), inventory47, videos46 (context-toolbar), sheetexport file-URL
- [x] P1 F152: src/qa/qaStrict.test.ts (8) en qaBrep.test.ts (13; eerst 11 genoemd, gecorrigeerd na QA 0.5.11 F129) in npm test
- [x] P1 F155/F119/F160: skipbudget per script en skips in de eindgate; regressielog per pass een eigen naam (commit + platform in de kop)
- [x] P1 F158/F46: hoofdregressie in CI op het releasepad (worker + B-rep); mesh/UI-thread als extra pass; de vier rode releasepad-scripts uitgezocht (wrap exact via polyhedrale tool, thread meetrace, sheetmetal/hem randkeuze)
- [x] P1 F153/F154/F156: electron/recover.cjs (map in main, sleutel id+pad, fsync, herstel als dirty "(Recovered)"), e2e/desktop-recover.mjs 21/21, gpu.json alleen de keuze (F162)
- [x] P1 F145/F125: features.mjs wacht op toestand (sweep); contextwerkbalk-tests wachten op het element; rebuildworker-drempel bleef relatief
- [x] P1 F143/F157: vensters tekenen met de hoofdrenderer (studio-look, randen), melding zonder WebGL, ErrorBoundary per venster; e2e/viewpanes.mjs 35/35
- [x] P1 F50/F163/F94/F136: Weldments → Frames, Sustainability Extras → Additional Materials, checks uitgebreid (ook e2e/), docs/26 intern
- [x] P1 F51/F121: Dome exact (bol + clip), boss/vinnen/snap hook waren al exact; waarschuwing per feature bij mesh-terugval; Faceted-cel getest (F99)
- [x] P1 F93/F148/F149/F126/F38/F129: claims met platform, commit en ruw log (qa-logs/0.5.11/); README-status 0.5.11; desktop-installed-0.5.11.txt en signature-0.5.11.txt bewaard
- [x] P2 F150/F49/F117: UNSIGNED-melding in desktop:build + tools/sign-report.cjs (signature-<versie>.txt); F151/F97: desktop-installed.mjs draait --self-test op de geïnstalleerde exe (packaged:true), log bewaard
- [x] P2 F112 backup-opties echt (eenheden/grid/kleuren waren al gekoppeld), F114 IGES niet mogelijk in deze OCCT-build (gedocumenteerd), F122 HLR/centermarks e2e + centermarks in detailaanzichten, F141/F166 nieuwste mate gemarkeerd en Not Converged-status
- [x] P3 F142 graphify-out uit de index, F138 audit fix (2 high weg), F137 bewust 45 s (gedocumenteerd), F118 bundelbudget 860 kB, F134 splitsplan, F161/F16/F21/F22 gedocumenteerd, F162, F164, F165, F99 gedaan
- [x] Regressie Windows op 0495219 (mesh 98/98, release 98/98, brep 12/12), release 0.5.11 gebouwd en geïnstalleerd (19/19), push, docs/28
- [x] Linux-CI: release 98/98 (c1fc039, run 41542259973), brep 12/12 en mesh-shard 2 (75ceeea, run 41551048560), mesh-shard 3 (c1fc039); logs in qa-logs/0.5.11/linux/
- [x] Linux-CI volledig groen op db0d4b2 (run 41600737843: release 98/98, mesh 98/98, brep 12/12, checks, desktop) na multibody/features-fix (772236a), scripttimeout 1500 s en repo publiek (Actions-minuten); logs in qa-logs/0.5.11/linux/

## Merken, docs en kleine punten uit QA 0.5.10 (2026-11-02)
- [x] F50/F94/F163: zichtbare "Weldments" → "Frames", "Sustainability Extras" → "Additional Materials"; merkcheck vangt beide; e2e-selectors bij
- [x] F136/F163: neutral-comments scant ook e2e/ en vangt "reference frame/video"; commentaren herschreven
- [x] F38/F129/F149: README-status 0.5.11, docs/25 5/10, docs/26 intern werkdocument
- [x] F142: graphify-out/ in .gitignore
- [x] F164/F165: dbg.test.ts weg; "SW-Density" → "Density" bij openen, met unit-test
- [x] F138: npm audit fix (2 high weg; 15 moderate minimatch blijven, override zou electron-builder breken)
- [x] F118/F134: tools/bundle-budget.cjs + "check:bundle"; splitsplan in docs/28

## CI en testinfra uit QA 0.5.10 (2026-11-02)
- [x] F31/F54: ci.yml op ubuntu-24.04
- [x] F147: aparte jobs (checks, desktop, regressie-matrix) met continue-on-error en eindgates
- [x] F158/F105/F120: release-pass (?kernel=brep&rebuild=worker) met de volledige lijst naast mesh; keuze B-rep/worker-sublijsten gedocumenteerd
- [x] F160: regressielog per pass een eigen naam, kop met versie/commit/platform/URL/datum; artefact per pass
- [x] F155/F119: skip-budget per script (`// skip-budget: N`) en DONE faalt bij overschrijding
- [x] F155: alle skip(-aanroepen nagelopen; "Save changes?"-gevallen voorwaardelijk, klikfouten hersteld; scripts gedraaid
- [x] F146: sheetexport file-URL via pathToFileURL
- [x] docs/28 sectie "CI/testinfra"; neutral-comments, line-budget, typecheck groen

## AutoRecover en security uit QA 0.5.10 (2026-11-02)
- [x] F156: AutoRecover-map in main vastgelegd (userData/autorecover of via dialoog gekozen, bewaard in userData); renderer stuurt geen pad meer
- [x] F153: kopie per document-id (+ pad als het document een bestand heeft); alle open documenten met wijzigingen schrijven
- [x] F154: fsync vóór rename; herstel opent als dirty met " (Recovered)" in de naam
- [x] F162: gpu.json bewaart alleen de keuze; Options toont uitleg en een knop "Use the graphics card again"
- [x] F112: backup.*-opties werkend (aan/uit, minuten, map, saveNotify) en prefsWired.test.ts klopt
- [x] e2e/desktop-recover.mjs (eigen profiel, herstart, Document Recovery) + unit-tests
- [x] docs/28 sectie "AutoRecover en security"; typecheck, neutral-comments, line-budget groen

## Multi-view vensters uit QA 0.5.10 (2026-11-02)
- [x] F143: ViewPane zonder eigen WebGL-context; zonder WebGL een melding in het venster; ErrorBoundary per venster
- [x] F157: vensters tekenen met de renderer van het hoofdvenster (studio-omgeving, belichting, randen, achtergrond van het thema)
- [x] e2e/viewpanes.mjs: Four View pixels/randen + Chromium zonder WebGL; screenshot e2e-out/viewpanes-four.png
- [x] F161: STEP-import als B-rep in de desktop-app nagekeken en genoteerd
- [x] docs/28 sectie "Multi-view"; typecheck, neutral-comments, line-budget groen

## QA 0.5.11 (6/10) naar 0.5.12 (2026-11-03)
- [x] P0-1/P0-4 (F176, F97, F149): groene Actions-run op db0d4b2 vastgelegd met checks- en desktop-joblogs; commit in elke build, zelftest en log (ook uit git archive); desktop-installed-log met commit, tijd en elke check; Windows-jobs in CI (installer + regressie in Edge)
- [x] P0-2 (F172, F159, F48): kruiscontrole op vormafwijking (afstand exact ↔ facet, beide kanten, ≥ 0,1 mm) naast 0,5 % volume; qaCrossCheck.test.ts 4/4 (overgeslagen fillet 0,83 mm, extra rand 10 mm R2 gevangen); in e2e-builds een consolefout
- [x] P0-3 (F173, F130): qaStrict op 2 % van het verlies en 1,5 mm³ voor elke sleuf: vond een echte fout (stadium-sleuf + fillet: "Keep features" sneed opnieuw, 10 mm-uitsteeksel en 21 mm³ te weinig; nu alleen hersnijden waar de fillet materiaal toevoegt); mateStatus M3/M5 (agent)
- [x] P0-5: sheetexport-schermafdruk van de PDF-viewer alleen op Windows (Edge), geen skip meer; skip-budget 0
- [x] P1-1 (F175): ellipsen, splines, Style Splines en conics exact in B-rep (ellips 40×20×10 = 6283,185307; STEP met ELLIPSE/B_SPLINE_CURVE_WITH_KNOTS); exactVolume via shapeVolume (spline was 8 mm³ te groot)
- [x] P1-7 + P2-5 + P2-7: mechanische mates met gedragstests (mechMates.test.ts 15, vier fouten opgelost: screw, rack-pinion, linear coupler, gear), M3/M5/nieuwste mate (solver liet de nieuwste mate winnen: opgelost), AlongX/Y/Z in 3D-schetsen, e2e/undo200.mjs 7/7
- [x] P2-1 (F114, F171): Options toont alleen formaten met exporter (prefs.test.ts bewaakt het); IGES: de OCCT-WASM-build van replicad heeft geen enkele IGES-klasse (gedocumenteerd, F114 blijft open voor IGES)
- [x] P2-3 design tables (CSV, ; of , en decimale komma, $STATE): designTable.test.ts 6/6, e2e/designtable.mjs 15/15
- [x] P2-6 Instant3D: sleephandvatten voor fillet-straal, chamfer-afstand en revolve-hoek (naast extrude/cut-diepte); e2e/dragHandles.mjs 14/14 op mesh en releasepad
- [x] P1-5 naamgevingstests T4–T7 op beide kernels (qaNaming 12/12); drie fouten opgelost: mesh-loft sneed hoeken af, randketens braken, fillet sprong naar de overkant na een padwijziging
- [x] P2-8 normdelen: 101 ISO 4762/4032/7089-delen in Standard Parts, Smart Fasteners via ISO 273 (Ø6,6 → M6), bout stond omgekeerd (opgelost); e2e/library 16/16
- [x] P1-6/P2-11: plaatwerk tegen BA/BD/K-factor (16 tests; uitslag bij Reverse en BD-modus gerepareerd), frames met EN-profielen en juiste cut list (13 tests; End Butt, groepering, end cap)
- [x] P2-4: Drag Dimensions live via de solver (Instant2D), vergrootglas G, 3D-schetsmaten met status; e2e instant2d 8/8, magnify 12/12, sketch3d2 14/14
- [x] P1-2 plastics exact (Mounting Boss, Snap Hook, Lip/Groove, Indent; 7 tests binnen 1e-3); P1-4 loft met ≥ 3 profielen en Close loft exact (guide curves blijven mesh: OCCT-WASM bouwt ze niet betrouwbaar)
- [x] Teamronde: F177 (gesplitste rand na langer worden: beide stukken, qaTeam), F178 (gebogen rand = één keten), F183 (brep-job 14 scripts), F188 (AutoRecover van 0.5.10), F189 (docs/06, docs/26 en vergelijkingsbeelden uit de repo, lokaal in intern/), F191 (vensters alleen bij wijziging), F193, F194, F196 (fuses-check), F198
- [x] F46/F190: randen voor het beeld in de workers (rebuild en occt) en de interieurtest met een raster: 33,5 → 8,5 s bij 4× trager CPU, framepauze tijdens een rebuild van 21 s: 117 ms
- [x] Kernelverschillen die de vormcontrole vond: verzinking, sweep-eind, snede door de as, swept flange (mesh fout), bol (B-rep fout); qaCrossCheck 8 tests
- [x] F197 exacte flens: zes fouten opgelost (L-plaat, Reverse, reliefs, trim/notch, offsets), afwijking geeft een eigen waarschuwing (flangeExact 42 gevallen)
- [x] F192 extra vensters interactief (viewpanes 45/45), F184 mutatietests (4/4 gevangen) + E2E_REPEAT + 7 .kcad-fixtures van 0.5.10, F112 Options 46 → 148 bedraad (34 zonder betekenis weg), F186 convergentieregel
- [x] CI 4526c24: Windows-installer 21/21 met commit; regressies section (display van de worker op een vervangen geometrie) en wrap (B-rep-beeld van een benaderd lichaam) opgelost; bundel weer onder 800 kB (782 kB); gh groen met de booleanfix; magnify robuust op SwiftShader
- [x] Laatste kernelverschillen (curve pattern, variabele fillet, moerafschuining, flens/zoom op het verkeerde vlak): releasepass zonder één kernelverschil in 104 scripts
- [x] Windows-scripts: vloershaders werden bij elke rebuild opnieuw gecompileerd (8–9 s → 1 s), camera-animatie/rebuild afwachten in jogmiter, misc7, gj, motion; Select Other gebruikt de straal van de rechtsklik
- [x] F134 rebuild.ts 3390 → 2274 regels (sheetMetalBuild, frameBuild, surfaceBuild, buildContext); unit 736/736; mutatiecheck 4/4
- [x] Release 0.5.12 op 02e3b22: Actions-run 41862412746 alle 16 jobs groen (Linux en Windows: release 104/104, mesh 104/104, brep 14/14, installer 21/21); lokaal Windows idem; geïnstalleerd 21/21; logs in qa-logs/0.5.12; docs/29 en README
- [x] P3 (F38, F129, F138, F174): bundel 855 → 784 kB (budget 800, lazy panelen); tools/doc-counts.cjs in CI; TASKS (13) en docs/28 F142 rechtgezet; audit: minimatch < 11 zonder backport in electron-builder 26.18 (gedocumenteerd)
- [x] Regressie Windows + Actions op de release-commit, release 0.5.12, docs/29

## Bureau naar foto, IKEA-maten (2026-11-05)
- [x] Maten vastleggen: LAGKAPTEN-blad 1400 x 600 x 34 mm, twee ALEX-kasten 360 x 580 x 700 mm, totaal 734 mm hoog
- [x] Generator `voorbeelden/bureau/maak-bureau.mjs` die drie .kcad-bestanden schrijft (Tafelblad, ALEX-kast, Bureau-assemblage)
- [x] ALEX-kast met deur: voeg van 2 mm rond de deur in het voorvlak
- [x] Assemblage: kasten flush met de zijkanten en achterkant van het blad, 20 mm overstek vooraan
- [x] Controleren met een unit-test (volumes en maten na rebuild) en de voorbeeldentest
- [x] Openen in de app, screenshot vergelijken met de foto
- [x] Commit en push

## Bureau: ALEX-ladekasten met lades op geleiders (2026-11-05)
- [x] Kast wordt ALEX-ladekast: korpus 360 x 564 x 700 met holte en tien geleiders, vijf lades met front 356 x 136
- [x] Lade: bak 296 x 100 x 520 met loopregels die op de geleiders rusten
- [x] Mates per lade: Coincident op de geleider, Coincident op het Right Plane, Distance-limiet 0 tot 450 mm
- [x] Test: onderdelen op beide kernels, lades schuiven alleen langs Z binnen 0 tot 450, geen botsing dicht en open
- [x] In de app: lade slepen en screenshot met lades open
- [x] Commit en push

## Ingebouwde nagelstofafzuiging voor het bureau (2026-11-05)
- [x] LB-monogram van Lush Beauty overtrekken (zonder tekst, op vraag van Ian; B uit het grote beeld, halve manen als vloeiende krommen)
- [x] Rooster RVS 1,5 mm, 196 x 140, LB in het midden + chevronsleuven (zoals ULKA X2F); geen eilanden, niets < 1,5 mm; DXF
- [x] Inbouwmodule in PLA die van bovenaf in een gefreesde uitsparing zakt: flens + rooster bovenop, 4 klauwen zoals een Niko-inbouwdoos
- [x] Filterlade (zoals Vento) op richels met G4-filtermat en steunschot; ventilatorplaat met Noctua NF-F12 iPPC-3000 PWM
- [x] Houder voor de M5Stack Dial in het blad, elektronicabox met deksel en interfaceprint onder het blad
- [x] Assemblage Afzuiging + in het bureau (uitsparingen 196 x 140 en 59 x 59 in het blad, lade met Distance-limiet 0-110)
- [x] Elektronica: aansluitschema (aansluitschema.svg) en stuklijst (README)
- [x] Firmware ESP32 (M5Dial): draaien = snelheid, drukken = aan/uit, lang = boost, toerental en storing op het ronde scherm; compileren met PlatformIO
- [x] Tests (qaAfzuiging, qaBureau), STL's in printstand, screenshots, commit en push

## Afzuiging v2: luchtdicht, fijnfilter, strakker design, ronde draaiknop (2026-11-05)
- [x] Ventilator en filters kiezen: voorfilter + fijnfilter (+ koolstof) vraagt meer statische druk dan de NF-F12
- [x] Luchtdicht kanaal: klauwen in gesloten torens (enkel open naar buiten), schroefgat dicht onder de kop, ladefront overlappend met schuimband
- [x] Filterlade met voorfilter en fijnfilter in lagen; ventilator binnen de behuizing; onderplaat als uitblaasrooster met schuine lamellen naar achter
- [x] Strakker design: afgeschuinde flens, afgeronde romp, ladefront met greepsleuf in plaats van blokje
- [x] Ronde dialhouder (gatzaag Ø60) en een ronde M5Stack Dial
- [x] Test: luchtdicht (flood-fill van het kanaal mag de buitenkant niet bereiken), botsing, B-rep, printbed; STL's en DXF
- [x] Verschildrukmeting over de filters (Sensirion SDP810-500Pa, I2C op Port A): meetpunten in de module, slangen naar de elektronicabox
- [x] Firmware: ijken op schone filters, melding "Filter vol" op het scherm, storing via de druk (Port B: G2 PWM, G1 aan/uit)
- [x] README, aansluitschema bijwerken; tests, screenshots, commit en push

## Afzuiging v3: compacter, filter langs boven, rooster met magneten, printbaar zonder support (2026-11-05)
- [x] Romp (rechtop geprint) + bovenframe (plat geprint): klauwen trekken de romp tegen het frame; cassette met 3 filterlagen langs boven uitneembaar
- [x] Ventilator direct onder de cassette: module hangt ~5 cm onder het blad (was 11,6); lade, richels en opening in de voorwand vervallen
- [x] Rooster RVS 430 (magnetisch) 202 x 146 op het frame, 4 magneten Ø8 x 2 in het frame; effectieve luchtdoorlaat in het rapport
- [x] Drukmeting: één meetpunt onder de filters, de andere poort open naar de kamer
- [x] Tests: luchtdicht (met tegenproeven), cassette vrij uitneembaar, botsing, B-rep, printbed; STL's
- [x] README, aansluitschema, screenshots, commit en push

## Afzuiging v3.1: rooster bijna vlak, draaiknop met klauwen, alle schroeven zichtbaar (2026-11-05)
- [x] Bovenframe 3 mm met verzonken rooster (3 mm boven het blad i.p.v. 6,5), op de romp gelijmd; magneten in de torentoppen
- [x] Cassette-rand onder het rooster op de torens; greepuitsparingen boven de torens (geen omloop langs de filters)
- [x] Dialhouder zonder schroeven in het blad: kuip met 2 stalen klauwen (M3) + vlakke sierring
- [x] Alle schroeven, bouten en moeren als onderdelen in de assemblage (klauwen, uitblaasplaat, deksel, ventilator, print, dial)
- [x] Tests (botsing met schroeven, luchtdicht, klauwen 10-50 mm), bureau-botsingstest nakijken, README/bestellijst, STL/DXF

## Afzuiging v3.2: van boven alleen staal, dialpot dicht (2026-11-05)
- [x] Bovenframe als smalle omranding van 2,5 mm; RVS-plaat even groot (206 x 150), magneten verzonken in het frame eronder
- [x] Dialkuip dicht: bodem met kabeltule, O-ringgroef in de sierring
- [x] Tests en STL's

## Afzuiging v3.3: één bodemplaat, aan/uit-schakelaar, kleinere ring rond de Dial (2026-11-05)
- [x] Uitblaasplaat en vakdeksel samen tot één bodemplaat over de hele onderkant (194 x 138), 6 x M3; DC-bus en kabeldoorvoer erin
- [x] Wipschakelaar KCD1-101 verzonken in een kom in de linkerzijwand (wip 1 mm binnen de wand); print-onderdelen opzij
- [x] Draaiknop: gatzaag Ø57, sierring Ø62 (was Ø76), kuipwand 2 mm
- [x] Aansluitschema (-S1), bestellijst, README, tegenproef luchtdicht vervangen (zonder M5-schroeven)
- [x] Schroeven van onderen verzonken (DIN 7991, conische verzinking): 6 x M3 x 16 en 4 x M4 x 45, koppen vlak in de bodemplaat
- [x] Tests met STL-export (afzuiging, bureau, voorbeelden), screenshots
- [x] graphify update, commit en push

## Afzuiging v4: VIEWE-knop 1,5", M5-koppen in het frame, PETG (2026-11-05)
- [x] Conische zitting voor de M5- en M3-koppen; M5-kop in een lip van het bovenframe (drukt het hele frame op het blad), cassette met uitsparingen
- [x] Knophouder voor de VIEWE UEDX46460015-MD50E (maten uit de maattekening): plaat Ø51,6 = knop, buis in gat Ø44, 2 klauwen M3, naafkom met 2 x M2,5 en pennen, FPC-sleuf
- [x] Adapterprint -A3 in groeven, USB-C onderaan, deksel met tule; knop, print en schroeven als onderdelen
- [x] Firmware naar de VIEWE-knop (CO5300 QSPI, encoder 6/5, knop 0, I2C 44/43, PWM 39, aan/uit 40) - compileert
- [x] Schema: -A1 knop, -A3, -W1 Cat 6, -X4 6-polig, 5V-regelaar -T3; stuklijst en klemmenplan
- [x] PETG i.p.v. PLA (kruip, warmte, aceton); README en bestellijst
- [x] Tests (botsingen, klauwen knop 10-50 mm, luchtdicht, B-rep, STL): 68/68 groen; screenshots; app op de pc geopend
- [x] graphify update, commit en push

## Afzuiging v4.1: USB-C-koppeling knop-module, draadloze besturing, kabelsleuf in het blad (2026-11-06)
- [x] Module: ESP32-C3 SuperMini (-A4) in rails op de linkerwand (USB-C naar beneden door de bodemplaat), stuurt ventilator en drukmeter
- [x] Module: USB-C-bus -X8 (5 V voor de knop) tegen de voorwand, door de bodemplaat; DC-bus naar voren; kabeldoorvoer en 6-polige klem weg
- [x] Knophouder: adapterprint zonder schroefklem, deksel zonder tule (de USB-C-bus is de koppeling)
- [x] Bureau: kabelsleuf 5 x 5 mm onderaan het blad van de uitsparing naar het knopgat
- [x] Firmware: één PlatformIO-project met twee omgevingen (knop en module), ESP-NOW tussen beide; compileren
- [x] Schema, stuklijst, README en bestellijst (USB-C-kabel 0,5 m haaks, ESP32-C3 SuperMini, regelaar 1 A)
- [x] Tests (72/72 groen), screenshots, app openen, commit en push

## Afzuiging v4.2: alles printbaar zonder support (2026-11-06)
- [x] Tuitje drukmeter: geen hangend tuitje meer maar een bus bovenop het plafond met een messingbuisje Ø3 erin
- [x] Filtercassette in twee delen: bak rechtop (roosterbodem op het bed) en een vlakke rand met kraag die erop gelijmd wordt
- [x] Tests (luchtdicht met rand, cassette uittillen, botsingen, STL-standen), printgewicht per deel
- [x] README (printtabel, bestellijst messingbuisje, montage), screenshots, commit en push

## Afzuiging v4.3: geen dunne stukjes meer in de cassetterand (2026-11-06)
- [x] Lip- en greepuitsparing samenvoegen tot één uitsparing (strookje van 1,5 mm weg); andere dunne plekken nakijken
- [x] Tests (74/74), screenshot, commit en push

## Afzuiging v5: radiale ventilator (stiller en sterker) en aparte voedingsbox (2026-11-06)
- [x] Ventilator kiezen: San Ace C175 9TG24P0S01 (Ø175 x 69, 24 V, PWM 25 kHz, ~500 m³/h bij 200 Pa)
- [x] Module hertekenen: vierkant 210 x 210, klauwen in de hoeken, instroomplaat met trechter, grotere cassette, ventilator op de bodemplaat (4 x M4), uitblaas rondom; geen elektronica meer in de module
- [x] Bovenframe 222 x 222 en RVS-rooster opnieuw (logo, lasercontrole), uitsparing 212 x 212
- [x] Voedingsbox: 15 mm ingefreesd met rand en 4 pluggen voor holle deuren; netadapter 24 V met IEC-koppeling, schakelaar, ESP32-C3, drukmeter, 5V-regelaar, USB-C naar de knop, M8-bus naar de ventilator
- [x] Bureau: uitsparingen en sleuven (box -> module: M8-kabel en slangetje; box -> knop: USB-C)
- [x] Firmware (tacho, PWM 0 % = stil), schema, stuklijst, README
- [x] Tests (81/81: luchtdicht met tegenproef, botsingen incl. box, klauwen 10-50 mm, printbed 225 x 225, B-rep, STL), screenshots, commit en push

## Afzuiging: technische tekeningen en bouwschema (2026-11-06)
- [x] Generator voor werktekeningen (A3, Europese projectie): aanzichten met verborgen lijnen, doorsnede, hoofdmaten, maattabel, titelblok
- [x] Tekenmodule: een afgeronde rechthoek werd als cirkel herkend (valse cirkel met hartlijnen), met test
- [x] Knop: USB-C in de achterkant van de buis (kant van de sleuf) i.p.v. onderaan in het deksel: printje op 2 palen, opening in de wand, deksel zonder opening
- [x] Knop: botsingen, lek- en printtests, schema en README bijwerken
- [x] Tekeningen van alle zelfgemaakte onderdelen (print, laser, filtermatten) en van de bewerkingen in het tafelblad
- [x] Samenstellingstekening: opengewerkt aanzicht met ballonnen en stuklijst (met de koopdelen)
- [x] Bouwschema: stappen met beelden uit Phlippo CAD en uitleg, als PDF
- [x] Freesmallen 1:1 op A4 bij het aansluitschema: uitsparing afzuiging (2 bladen met paspunten), knopgat, voedingsbox met sleufaanzet, controlemaat 100 mm
- [x] Controleren (maten tegen het model), README, commit en push

## Afzuiging: prijzen in de bestellijst (2026-11-06)
- [x] Prijzen opzoeken (excl. en incl. btw, winkel) voor de koopdelen, laserwerk en printfilament
- [x] Bestellijst in de README: prijs per stuk, totaal per regel, totaal per groep en eindtotaal
- [x] Prijslijst ook als CSV naast de stuklijst; commit en push

## Afzuiging: voorbeeld van de schermen van de knop (2026-11-06)
- [x] Voorbeeldpagina met alle schermen en meldingen uit de firmware (uit, aan, boost, ijken, filter vol, storingen, geen verbinding, drukmeter)
- [x] Meldingen in de firmware: "module" wordt "voedingsbox" (daar zit de ESP32-C3 sinds v5)
- [x] PNG maken, versturen, commit en push

## Afzuiging: knop-UI aantrekkelijker (2026-11-06)
- [x] LB-logo als bitmap voor de knop (uit logo/lb-monogram.png, anti-aliased, in beige) in plaats van de tekst LUSH BEAUTY
- [x] Ring met meer pit: donker spoor, dikkere boog met kleurverloop, ronde kappen begin en einde, handvat op het einde
- [x] Filterbalk in dezelfde stijl (spoor, verloop, ronde einden)
- [x] Firmware compileren, voorbeeldpagina bijwerken, PNG sturen, commit en push

## Afzuiging: lettertypes van de knop (2026-11-06)
- [x] Inter (OFL) in het project; generator voor anti-aliased fonts (procenten vet, tekst medium, titel semibold)
- [x] Firmware: eigen tekenroutine voor deze fonts i.p.v. U8g2 (procenten vet, % kleiner en bovenaan uitgelijnd)
- [x] Compileren, voorbeeldpagina met dezelfde fonts, PNG sturen, commit en push

## Afzuiging v6: goedkoper, één filter, kunststof klauwen, nieuwe voedingsbox, echte maten (2026-11-06)
- [x] Eén M5-filter (20 mm) i.p.v. drie lagen: cassette 15 mm minder diep, module 71 mm onder het blad
- [x] Klauwen in PETG met een ingeperste moer (M5 module, M4 knop); M4 x 65 bij de knop; schuin plafond (45°) in de zwaaikamer zodat de klauw vanzelf uitzwaait
- [x] Alle schroeven verzonken behalve die van printplaten; klemmen voor de netadapter, ringen voor slang en draden
- [x] Printplaten op echte maat (SDP810, ESP32-C3, D24V10F5, TR5, elco, klem), M8 binder 718 (M10 x 0,75), USB-C-printjes en FPC-adapter
- [x] Koopdelen gedetailleerder (connectoren, schakelaar, knop, adapter, USB-C, inbus/kruiskop)
- [x] Voedingsbox zonder rand en trapjes: rechte bak in de uitsparing, deksel bovenin, 4 x M4 x 60 in inlijmmoeren, ventilatie, schakelaar voor
- [~] Tests, tekeningen, bouwschema, mallen, STL's, prijslijst, README; commit en push

## Afzuiging: eindverslag v1 (3,1/10) verwerken (2026-11-06)
- [x] Firmware: meetversheid en sensorherstel, ijking alleen met geldige samples (oude referentie behouden), stop/annuleren met voorrang, bewaking vanaf 20 %, start na stroomuitval UIT, bevestigde toestand op het scherm, koppeling per set (MAC + sleutel), boostdeadline in de module, radioverlies expliciet, "uitkloppen" weg
- [x] Testbare regel-logica (regel.h) met 14 hosttests; native testomgeving in PlatformIO (draaien vraagt gcc)
- [~] Exports: STL's uit de exacte vorm (B-rep), dicht en manifold met controle; alle 15 printtypen; oude exports weg; revisie-ID op tekeningen, mallen, bouwschema en README
- [ ] (wacht op de filterkeuze van Ian) Afdichting: pakking onder de cassetterand met vastgelegde compressie, filter geklemd in een raam; stofarme filterwissel (zak), geen uitkloppen
- [x] Beschermingsconcept (docs/Vrijgave-en-meetplan.md): filterkeuze met gegevens (F7/ePM1 geplooid), bypass/retour, damp apart; G01 geschrapt
- [x] Draagconstructie: box met rand en pluggen (Ian: geen inlijmmoeren); proefplan M1/M2
- [x] Meet- en vrijgaveplan (Q-dp, RPM, vangst, lek, geluid, warmte, elektrisch, uittrek, mors, ergonomie) met acceptatiecriteria
- [ ] Alles opnieuw genereren en testen; commit en push; rapport voor Ian

## Afzuiging: eindverslag v2 (5,0/10) verwerken (2026-11-06)
- [x] Testreeks van v6 groen; alle 13 printtypen als dichte STL; overlapkandidaten in de exacte kernel nagaan en benoemen
- [x] Rekenblad (docs/Berekeningen.md + script): fancurve S01 tegen filter- en roosterverliezen, werkpunt, mediavlak, vangst op 10 cm, geluid naar toerental en afstand
- [x] Rekenblad elektrisch en warmte: zekering, draad en M8, 5V-budget, warmte in de box; bevestiging: klem- en plugbelasting, moerkamerdak
- [x] Maakdetails: magneetpocket met 0,8 mm bodem, moerkamerdaken, fanschroef 5 mm indraaiing, puntuitsteek knopschroef met speling
- [x] Documentatie gelijktrekken (freesmaten, schakelaar, USB-print, zekering TR5) en revisie op alle uitvoer
- [x] Filter: voorgelegd; Ian koos een goedkope G4-mat van de rol die veel lucht doorlaat (bescherming ventilator, geen luchtreiniger); rekenblad met ophoogte 10/15/20 cm
- [x] Firmware: gewone standen tot 80 % (100 % alleen boost), zachte start 50 %/s, 2 tests erbij
- [x] Box-rand opzij 7,5 (printbed 225), schroeven voor/achter, pluggaten 28 diep met 2 mm hout naast de uitsparing
- [x] Tekeningen, mallen, bouwschema opnieuw; commit en push; rapport voor Ian
- [x] Box: ventilatie onder de schuine kant, uitsparingen voor C13/M8/schakelaar, USB-tong vast; 3 verzinkingen exact (B-rep) en alle 13 STL's dicht; revisie 6.1 overal; werkplek in het meetplan
- [x] Laatste testreeks, STL's, tekeningen en bouwschema (vervangen door de Rittal-mat hieronder)

## Afzuiging: standaardfilter Rittal SK 3171.100 (2026-11-07)
- [x] Cassette vierkant voor de mat 173 x 173 x 17 (vak 172 x 172: de mat zit 0,5 mm aangedrukt rondom, geen lek)
- [x] Module 3 mm minder diep (mat 17 i.p.v. 20): instroomplaat, ventilator, romp, bodemplaat 3 mm hoger
- [x] Rekenblad, README, stuklijst, bouwschema, tekeningen en tests aanpassen (STL-export in een eigen testbestand)
- [x] Testreeks, STL's, tekeningen, bouwschema; commit en push

## Afzuiging: eindverslag v3 (5,6/10) verwerken (2026-11-07)
- [x] V3-13: "uitkloppen" uit het bouwschema; onderhoud begint met uitschakelen en stilstand; matrichting; tekstcontrole over alle uitvoer
- [x] V3-04/14/15: zachte start op tijd (niet per regelstap), oude filterstatus weg tijdens stabiliseren, boostbudget (geen herhaalde boost zonder afkoelen); tests 1/5/10/20/250 ms
- [x] V3-05: koppelen alleen na een bewuste handeling; bevestiging met uitdaging; oude sessies weigeren; tests
- [x] V3-06/03: filtermelding per stand uit het luchtmodel (vóór het minimumdebiet), lage standen gemarkeerd, stabiliseren/buiten bereik zichtbaar; geluidsdoel consistent
- [ ] V3-02: EPDM-band 3 x 9 echt in het model (steunrand, sluitmaat, compressie), matpassing en toleranties
- [x] V3-08/12: 0,52 W in de warmte, boostbudget in de warmte, overlap box/print nagaan
- [x] V3-09/10/11: README en teksten uit dezelfde gegevens (romp 96, prijs 502,69, rooster 125,6 cm², USB-klemming), oude laserklauwen weg, materiaalstaat, bereikbaarheid en morsroute
- [ ] Testreeks, firmwaretests, STL's, tekeningen, bouwschema; commit en push

### Vervolg zonder keuze van Ian (2026-11-08)
- [x] V3-12: overlap Voedingsbox/Voedingsprint met de exacte kernel meten en oplossen of als bedoeld contact labelen
- [x] V3-08: exacte DC-zekering en DC-schakelaar met datablad, C3-piekstroom gelijk in schema en rekenblad, echte deratingcurve adapter, USB-pad (kortsluiting, terugvoeding bij flashen)
- [x] V3-10: materiaalstaat (filament, epoxy, magneten, reinigingsmiddel) met datasheets en grenzen; aceton-claim nakijken
- [x] V3-11: probe-envelop (welke plaat houdt een vinger tegen), morsroute, kabel- en knie-envelop uit de modelmaten
- [x] V3-07: klauwberekening met materiaalbron; montagegrens (keuze voorleggen als het geld of ontwerp vraagt)
- [x] Rekenblad en README bijwerken, tekstcontrole uitbreiden

## Afzuiging 7.0: interieurfilter MANN CU 20 013, foamband, rubber onder de klauwen (keuzes Ian, 2026-11-08)
- [x] Filter: CU 20 013 (195 x 145 x 30) rechtstreeks op een steunrand van de instroomplaat met een zachte foamband; cassette en cassetterand vervallen; module zo weinig mogelijk dieper
- [x] Romp, ventilator, bodemplaat, torens, achterwand en lekrooster mee naar onder; rooster/frame ongewijzigd
- [x] Klauw: rubberkussen (Shore A 40, 4 mm) op de arm; montage "tot contact + 1 slag"; berekening van de kracht
- [x] Luchtmodel: filter CU 20 013 (band 55-115 Pa schoon, 300 Pa vol), plenum, sensor; vervangfactoren en beschermVanaf opnieuw; firmware-constanten en tests
- [x] V3-11: probe-envelop (vast vingerrooster in het oog), morsroute, knie- en kabelenvelop met de nieuwe diepte
- [x] README, bouwschema, onderhoud, prijslijst, meetplan, materiaalstaat, Besparingen; tekstcontrole
- [x] Tests (qa, STL, overlap, teksten, firmware), STLs, tekeningen, schema, mallen, beelden; graphify; commit en push
- [x] Alles in één PDF om af te drukken (Afzuiging-alles-afdrukken.pdf, e2e/tools/alles-afzuiging-pdf.mjs)

## Afzuiging 7.1: eindverslag v4 (6,4/10) verwerken (2026-11-08)
- [x] Snelle testset (alleen het gewijzigde onderdeel) naast de volledige set
- [x] Firmware: één bewakingscontract: toerentalvolging/verzadiging (V4-04), herstart en onbevestigde UIT (V4-12), ijken als bevestigde onderhoudsmodus + filter ontbreekt/lekt (V4-13), NVS-validatie (V4-14), koppelen per module (V4-11), boosttegoed na herstart (V4-10); tests
- [x] Rekenblad leest regel.h zelf (mutatie 9/9/9 wordt rood); onderhoudseindpunt = vervangmelding, Qmin tot dat punt per stand; onzekerheidsbanden en geluidsmarge (V4-03)
- [x] Filter/foam: exacte foamband met drukcurve, geometrische voorspanning door de RVS-plaat, min/max maatketen (V4-02); bron-/eisenmatrix filter en retourlucht (V4-01)
- [x] Vingerrooster sterker met rasterberekening en rotorvrije ruimte (V4-07); klauw met echte contactzone en exact bladanker (V4-06)
- [x] Morsen: opvanggoot rond het oog, inspectie/afkeur/herstart, toegang tot de ventilator (V4-09)
- [x] Elektriek: waarheidstabel voeding/fout/PWM, elco 50 V aan de buck-VIN, TVS, USB-pad (V4-05)
- [x] Tegenstrijdigheden: RVS 430, herkoppelen, f=0,30, printbed, S1/F1, dekselhoogte, referentievlak blad (V4-08)
  - Onderweg anders gekozen: afdichting met een siliconenlip (geen voorspanning door de plaat: de magneten houden gesloten-cel foam niet), geen opvanggoot (de helft van het filter ligt boven het oog; het filter houdt 15 ml vast), geen TVS (elco 47 µF/50 V volgens Pololu), schroeven 4 x 16 i.p.v. pluggen, vingerrooster 7 mm hoog met twee ringen, halve slag na contact
- [~] Volledige testreeks, STL's, tekeningen, bouwschema, alles-PDF, foto's; commit en push

## Treinverlichting: doos met ESP, 16 lichtgroepen, knoppen en sensoren, webdashboard (2026-11-08)
- [x] Eisenlijst met Ian (voorbeelden/treinverlichting/EISEN.md): hotspot, 16 groepen = 16 Modelbouwled-bordjes, 12 V DC, aan/uit + dimmen + effecten, knoppen en sensoren, doos onder de baan
- [x] Elektronica kiezen en rekenen: adapter 12 V (gekeurd), ESP32-S3, PCA9685 + 16 MOSFET-uitgangen met polyfuse, 16 ingangen via optocouplers + MCP23017; stroom, warmte, zekeringen (docs/Berekeningen.md)
- [x] Firmware (PlatformIO): hotspot + webdashboard (groepen, dimmen, effecten, scènes, functies, ingangen -> functie), opslag in flash, hosttests
- [x] Aansluitschema (EPLAN-stijl, zoals de afzuiging) en klemmenplan
- [x] Doos in Phlippo CAD (PETG, zonder support, sleutelgaten onder de baan): kaders per rij, kabelgoten, lippen, binderspleten, drukribben; 0 botsingen, bak 32 s rebuild
- [x] STL's (dicht en manifold) en werktekeningen: boormal 1:1 (TRN-00), bak, deksel; gedeelde module src/qa/werktekening.ts
- [x] README met bestellijst en prijzen, bouwschema (8 stappen met beelden), alles-in-één-PDF
- [x] Tests, foto's, alles-in-één-PDF; commit en push (44bdda8, e565e5b)

## Schema's en tekeningen volgens de Europese normen en zoals EPLAN: treinverlichting en afzuiging (2026-11-09)
- [x] Bronnen: EPLAN-formulieren (normblad, voorblad, inhoudsopgave, klemmenplan, stuklijst) uit de Hamburg Airport-richtlijn, klassen ISO/IEC 81346-2 en documentsoorten IEC 61355 uit de Eplan-brochure
- [x] Gedeelde EPLAN-module (voorbeelden/lib/eplan.mjs): normblad met kolommen 0-9 en EPLAN-titelblok (ISO 7200-velden), ISO 5457-kader, onderbrekingspunten met /blad.kolom, black boxes streep-punt, alles zwart; titelblad, inhoudsopgave, klemmenplan per strook, stuklijst
- [x] Treinverlichting: schema op de module, 11 bladen, aanduidingen 81346-2 (-K1..-K6, -R2..-R5)
- [x] Afzuiging: schema op de module (geen eigen kopie meer), 11 bladen, aanduidingen 81346-2 (-Q4, -S1, -U1, -X11, -K1, -R12), ook in README, rekenblad, firmware en generator
- [x] Werktekeningen (src/qa/werktekening.ts): ISO 5457 (archiefrand, centreermerken, raster 1-8/A-F), titelblok ISO 7200, projectiesymbool ISO 5456-2; boormal met smal titelblok
- [x] Freesmallen en snijmal: ISO 5457-kader en titelblok met de ISO 7200-velden
- [x] Test src/qa/schemaNorm.test.ts (aanduidingen, kruisverwijzingen, titelblok, documentsoorten)
- [x] Alles opnieuw maken: werktekeningen, PDF's (schema's van beide projecten, tekeningen, bouwschema, alles), de kabeldoos-app (versie 2)
- [x] README's, nakijken met screenshots, test:voorbeelden 60/60; commit en push
## Treinverlichting: alle tekeningen en printbestanden in één app (2026-11-09)
- [x] Materiaal verzamelen: STL's, werktekeningen (SVG + PDF), bouwschema, schema 6 bladen, beelden van de doos en het dashboard, PDF's
- [x] App bouwen (app/maak-app.py + sjabloon.html): overzicht, printen met 3D-beeld op het bed, tekeningen, bouwschema, aansluitschema, bestellijst, dashboard, alle bestanden
- [x] Publiceren als artifact (https://claude.ai/artifact/DD87ZqJGL2BR3xDebRNukE), nagekeken op desktop en gsm (licht en donker), screenshots naar Ian
- [x] Bouwscript en sjabloon in voorbeelden/treinverlichting/app/ (uit/ wordt gebouwd); commit en push

## Phlippo CAD 0.5.13: QA-rapport 0.5.12 (5/10, 51 open) verwerken (2026-11-08)
- [x] F200: de drie typefouten in src/qa/tekeningenAfzuiging.test.ts (ongebruikte import, revisie.d.mts, tuple-type); npm run typecheck exit 0
- [x] F54/F176/F31: features.mjs robuuster op trage runners (rand pas klikken als ze oplicht, Measure-venster eerst open); volledige lokale poort (typecheck, unit, mutatie, tekst, build, budgets) vóór de push; CI op de nieuwe SHA groen krijgen
- [x] F180/F93/F149: bewijsketen per SHA (manifest met node/npm, commando's, exitcodes, volledige logs, skipredenen) in qa-logs/0.5.13
- [x] F38/F129: README-tellingen uit vitest (doc-counts), fasekoppen bijwerken
- [x] F172/F198/F202/F179: strengere vormcontrole (volumegrens per lichaam, geen bemonstering), test die blindheid vastlegde omgedraaid, onafhankelijke randkeuze op de B-rep
- [x] F201: Sketch Text exact (letterkrommen als Bezier-randen); Earcut-fout in de mesh-kern (O te vol) opgelost
- [x] B-rep-regressie (14 scripts) en volledige unit-run op de nieuwe kruiscontrole; README-tellingen; docs/30-qa-0.5.12.md
- [x] F97/F151/F196/F49: installer en packaged self-test op de nieuwe SHA (CI-job windows-installer 21/21 op 7db76a0); ongesigneerd eerlijk vermeld
- [x] Rest van het register: F134 (sheetMetalOps.ts, rebuild.ts 1909), F137 zelf gemeten (150-228 ms), F112 (Tangent-snap, Name feature on creation), F193; versie 0.5.13, commit en push
- [x] CI groen op de eind-SHA (d5077ba, run 42588296138, 17/17) en het Actions-bewijs in qa-logs/0.5.13

## Printjes in detail: textuur, opdruk en koperbanen (2026-11-09)
- [x] Decals van onderdelen ook tonen in een samenstelling (zoals SOLIDWORKS), per component getransformeerd en alleen op dat lichaam
- [x] Gedeelde module voorbeelden/lib/printplaat.mjs: SVG-artwork per print (soldeermasker met textuur, koperbanen, pads, via's, opdruk)
- [x] Artwork voor het Modelbouwled-bordje, de ESP32-S3-DevKitC-1, de WROOM-module (kap met opschrift) en de PCA9685
- [x] Artwork voor de gaatjesprints (koperen eilandjes op 2,54) en de Pololu-regelaar
- [x] Opschriften op de IC's en onderdelen (PC847, IRLD024, PCA9685, weerstanden)
- [x] Unit-test voor de decals in een samenstelling; generator draaien, voorbeeldtests
- [x] Close-ups renderen en controleren naast de echte prints; screenshots naar Ian
- [x] graphify update, commit en push

## Kabeldoos: membraantules in de kabelinvoeren (2026-11-09)
- [x] Tule kiezen met bron: Wiska EMT 16 LG (10062559), wand 2-9,5, kabel 1-9, Ø21 x 11
- [x] Open sleuven vervangen door gaten Ø16,5 op 13,5 hoogte; 18 tules in het model; voorrand 8 mm (vrij van de klemstrook)
- [x] Botsingstest en exacte vorm groen; STL's en werktekeningen opnieuw
- [x] Bouwschema en afdruk-PDF opnieuw; README en bestellijst (de app volgt bij de volgende publicatie)
- [x] Commit en push (foto's later: Ian wil eerst de robotarm zien)

## Robotarm die deuren van een lopende band neemt (2026-11-09)
- [x] EISEN.md met de antwoorden van Ian (60 kg, alle richtingen, perslucht, €3.000-12.000)
- [x] Rekenblad: reikwijdte, koppel per as (statisch + versnelling), keuze reductoren en motoren, snelheden, vacuüm
- [x] Kooponderdelen met bron en maten (reductoren, servo's, besturing, veiligheid); [~] vlakgrijper en camera
- [x] Generator voorbeelden/robotarm/maak-robotarm.mjs: voet, draaikrans, schouder, bovenarm, elleboog, onderarm, pols 3 assen, grijper, hek, lichtschermen, kast
- [x] Test qaRobotarm: elk deel één lichaam, kinematica, bereik, geen botsingen
- [~] Universele grijper (Ian: ook plinten en kleine planken, meer en grotere zuigopeningen): vlakgrijper met zones + camera; grijpplanner besturing/greep.py
- [ ] Werktekeningen ISO 5457/7200 (lasersnijdelen, laswerk), schema's EPLAN (vermogen, besturing, veiligheid, pneumatiek ISO 1219)
- [ ] Firmware/besturing, bestellijst, bouwschema, één afdruk-PDF
- [x] Foto's naar Ian, commit en push

## Robotcel als volledig werkend product: schakelkast, HMI, schema's, statistieken (2026-11-09)
- [x] Vlakgrijper met zones en camera-boog boven de band in het model (na het onderzoek naar producten)
- [x] Schakelkast Rittal VX25 1200 x 2000 x 600 in 3D: montageplaat met hoofdschakelaar, beveiligingen, voeding 24 V, veiligheids-PLC, 6 servoversterkers, industriële PC, EtherCAT-I/O, klemmen, goten, koeling; HMI-touchpanel in de deur
- [x] Aansluitschema's volgens EPLAN/IEC (vermogen, servo's, veiligheid, 24 V, EtherCAT, I/O, pneumatiek ISO 1219), klemmenplannen, stuklijst, opstellingstekening van de montageplaat
- [x] HMI (web, aanraakscherm): overzicht, automaat/hand, stukken van de camera, zones, alarmen, statistieken (stuks per uur, cyclustijd, beschikbaarheid), onderhoud
- [x] Besturingslogica: toestanden en cyclus in docs/Besturing.md, grijpplanner besturing/greep.py met controles (simulator in de HMI)
- [x] Bestellijst met prijzen en bronnen, README, bouw- en inbedrijfstellingsplan, risicobeoordeling (EN ISO 12100 / 10218-2)
- [x] Eén afdruk-PDF (Robotcel-alles-afdrukken.pdf), foto's naar Ian, commit en push

## Lastafel op schaarheftafel zoals de DCT-video (2026-11-09)
- [x] Bronnen: video-frames, dctbv.nl (heftafel 370-1425 mm, 4 t, voetpedaal, 6 gefreesde steunvlakken, opvanglade), 3D-model van DCT gemeten (1190 x 2390, hoogte en onderdelen)
- [x] EISEN.md met maten, keuzes (2400 x 1200, DG-raster Ø28, eigen badge i.p.v. DCT-logo) en bronnen
- [x] Model: onderframe met vloerflenzen, geleidepennen en hijsogen; schaararmen met middenbout M30; bovenframe met opvanglade en 6 gefreesde steunvlakken
- [x] Model: hydraulische cilinders, gele valbeveiliging met zaagtand, hydraulische unit, bedienkast RAL 7035, voetpedaal
- [x] Model: lastafel 2400 x 1200 x 200 DG Ø28 (raster 100, diagonaal, gaten in de zijwanden, liniaal), eigen badge
- [x] Standen laag (370), midden en hoog (1425) + tests (botsingen, hoogtes, raster)
- [x] Berekeningen (cilinderkracht, druk, pomp, hefsnelheid), hydraulisch schema (ISO 1219) en elektrisch schema (EPLAN-stijl)
- [x] Tekeningen (ISO), bestellijst met bronnen, README, foto's zoals de video, afdruk-PDF
- [x] typecheck, tests, commit en push
- [x] Tafel als lasconstructie (blad, wanden, ribben) met de gaten in de schets: 541 gaten in ± 14 s in plaats van > 25 min

## Lastafel: bouwplan, materiaallijsten en een artifact met alles (2026-11-09)
- [x] Materiaallijsten uit het model: zaaglijst profielen, plaatlijst (laser), normdelen, kooponderdelen, verbruik, gewichten
- [x] Bouwplan stap voor stap: voorbereiden, snijden, lassen, nabewerken, coaten, monteren, hydrauliek, elektro, inbedrijfstellen, keuren (EN 1570-1)
- [x] Bouwschema-PDF (A4) met beelden per stap, in de afdruk-PDF opnemen
- [x] Mallen 1:1 in A3 (armwang volledig) en A4 (kop- en middenmal) (op 100 %, op 100 % afdrukken, op de plaat plakken): armwangen (over meerdere bladen met overlap en paspunten), ogen en lippen met de asgaten (hart met kruis), hijsogen, kapzijde en palplaat met zaagtand, kopplaat; maten erop en een controlemaat van 100 mm
- [x] Oog cilinder in het model gelijk aan de mal (zadel R45 op de buis, kop R34 om de pen)
- [x] Artifact-pagina met alles: foto's, specificaties, bouwplan, materiaallijsten, bestellijst, berekeningen, tekeningen, schema's, downloads
- [x] Controleren (pagina op gsm-breedte en donker), commit en push

## Lastafel: sterkte, CE-dossier en offerteaanvragen (2026-11-10)
- [x] Sterkteberekening schaar: krachten per arm uit het evenwicht (midden en excentrische last, laag/midden/hoog), buiging en normaalkracht in de armen, pennen (afschuiving, stuik), middenpen, bovenframe, kantelen (EN 1570-1)
- [x] Waar nodig het model versterken (wanddikte, naven rond de boringen) en materiaallijst, mallen en tekeningen bijwerken
- [x] CE-dossier: risicobeoordeling EN ISO 12100 / EN 1570-1, handleiding (gebruik, onderhoud, keuring), EU-conformiteitsverklaring, CE-plaat en waarschuwingen op het model
- [x] Offerteaanvragen (laserwerk, cilinders, aggregaat, tafel) klaar om te versturen
- [x] Pagina en afdruk-PDF bijwerken, tests, commit en push

## Bibliotheek: 10 stalen taatsdeuren, maten aanpasbaar (2026-11-10)
- [x] EISEN.md met de inspiratie (stalen glasdeuren met boog) en de open vragen in één ronde
- [x] Bronnen: profielen en prijzen (koker, T, strip), gelaagd glas, taatsscharnieren, poedercoaten, lasdraad/gas
- [x] Eén parametrische generator (breedte, hoogte, stijl) voor 10 stijlen: model (.kcad), zaaglijst, plaatlijst, glaslijst, kostprijs
- [x] Tekeningen per deur (ISO, maatvoering volgens de gekozen maten) en mallen 1:1 voor de bogen
- [x] Werkwijze per deur: zagen, mal/opspannen op de lastafel, hechten, lassen (MIG/MAG en TIG), slijpen, coaten, glas, plaatsen van het taatsscharnier
- [x] Configurator-pagina: stijl kiezen, maten invullen, tekening, lijsten en prijs meteen; downloads
- [x] Tests (alle stijlen en een reeks maten bouwen zonder fouten), foto's, commit en push
- [x] Configurator in drie pagina's: Deur (klant, enkel deur en prijs), Werkplaats (tekeningen, lijsten), Instellingen (standaarduren, uurloon, prijzen)

## Taatsdeuren: 50 stijlen en een 3D-kamer (2026-11-10)
- [x] Stijlen als bouwstenen (bovenkant, roeden, paneel onderaan) en 50 stijlen met naam en uitleg
- [x] Paneel (plaat) onderaan: tekening, lijsten, model, werkwijze, kostprijs
- [x] Tests voor alle 50 stijlen (geometrie op 3 maten, model bouwt zonder botsingen)
- [x] 3D-kamer in de configurator: muur met opening, vloer, de deur in 3D, deur open draaien, kleuren muur en vloer
- [x] Stijlkaarten als tekening (geen foto per stijl nodig), filter per soort
- [x] Bibliotheek-PDF en bestanden voor alle 50, README
- [~] Artifact bijwerken, gsm en donker controleren, commit en push, foto's naar Ian

## Deurenconfigurator voor klanten, los van de CAD (2026-11-10)
- [x] Eisen en bronnen: verdekte scharnieren voor staal, bekendste RAL-kleuren poedercoat, veiligheidsglas (kleur en structuur), dubbel glas en profieldiepte
- [x] Scharnier: pivot (taats) of verdekte scharnieren (draaideur) in tekening, 3D, lijsten, kostprijs en werkwijze
- [x] Glas: altijd veiligheidsglas; enkel (gelaagd) of dubbel (isolerend), dieper profiel bij dubbel glas; glaskleuren en structuren
- [x] RAL-kleuren met structuur (fijnstructuur, mat, glans) in de prijs en in 3D
- [x] 50 extra stijlen (TD-51 tot TD-100), tests voor alle 100
- [x] Presentatietool in een eigen map buiten de CAD (offline te openen): 2D en 3D, deurgat ingeven -> kamer, alle keuzes, RAL-kaart
- [x] Dezelfde tool online als pagina; foto's, commit en push

## Deurplannen: stuklijst met schetsen per onderdeel (2026-11-10)
- [x] stuklijst.mjs: elk onderdeel met positienummer (staven, latten, lasergesneden delen, panelen, glas, beslag), aantal, maat, gewicht
- [x] Schets per onderdeel: echte vorm van de staaf (verstek, schuin op de boog) met lengte en doorsnede; bogen en platen met stralen en gaten; glas met maten
- [x] Blad Stuklijst (A3): samenstelling met positieballonnen (ISO 6433) en de stuklijst (ISO 7573); bladen Onderdelen met de schetsen
- [x] In het dossier en de PDF per deur, op de pagina Werkplaats en in de downloads
- [x] Tests: elk deel in de stuklijst, gewicht klopt met het model; foto's, commit en push

## Opengewerkte tekening (exploded) met verbindingen (2026-11-10)
- [x] Verbindingen zoeken: welke uiteinden tegen welk stuk komen (verstek, T-stuk, schuin tegen de boog, boog op kalf of poot)
- [x] Blad A3: alle stalen delen uit elkaar getrokken in hun echte vorm, verstekken rood met 45°, positieballonnen, verbindingscodes met stippellijnen
- [x] Verbindingentabel: posities, aantal, naad en lasproces (ISO 2553-termen), kleine schets per soort
- [x] Kolom Zagen (hoeken van beide uiteinden) in de stuklijst
- [x] In het dossier, de PDF en de pagina Werkplaats; tests; alles opnieuw maken, commit en push

## Stuk per stuk inzoomen (2026-11-10)
- [x] detail.mjs: detailblad A4 per positie: hele stuk met alle maten, beide uiteinden vergroot (hoek, lengte lange en korte kant), doorsnede 1:1, gaten, waar het stuk in de deur zit, verbindingen van dit stuk
- [x] 3D-vorm per stuk (koker hol met verstek, platstaal, rond, boog, plaat met gaten, glas) zonder three, voor de pagina en de test
- [x] Pagina Werkplaats: klik op een stuk (kaart, ballon, opengewerkte tekening) of kies uit de lijst: venster met detailblad (zoomen, slepen, knijpen) en 3D (draaien), vorige/volgende, afdrukken
- [x] Bladen Onderdelen: grotere schetsen (6 per A3 in plaats van 14, tekst en maten groeien mee)
- [x] PDF per deur met de detailbladen (TD-xx-...-stukken.pdf), niet in de bibliotheek-PDF
- [x] Tests: elk detailblad zonder NaN, 3D-volume klopt met het gewicht; foto's, commit en push

## Koopprofielen (Jansen Economy, Janisol Arte 2.0, Forster unico) en vaste ramen (2026-11-10)
- [x] Catalogi opzoeken: artikelnummers, maten, kg/m, glasdikte, verbindingen, prijzen en verdelers per systeem
- [x] Profielsystemen in de bibliotheek: doorsnede per profiel (isolatiezone), glas per systeem, binnen/buiten
- [x] Bestellijst per artikel in staven van 6 m (zaagplan)
- [x] Vaste ramen: gemaakt, maar Ian wil geen ramen (zie hieronder)

## Taatsdeuren uit deurprofielen, geen ramen (2026-11-10)
- [x] Alles van de vaste ramen weg (stijlen, ontwerp, 3D-kamer, configurator, presentatietool, tests)
- [x] Koopprofielen altijd als taatsdeur (pivot); geen opgelegde draaischarnieren van het systeem
- [x] Profielen zichtbaar: doorsnede per profiel met sponning en artikelnummer op de opengewerkte tekening, het werkblad en elk stukblad; verstekken rood
- [x] Plannen per deur in deurprofielen (pdf-koop per systeem): werkblad, opengewerkt, stuklijst, onderdelen, bestellijst en stuk per stuk
- [x] Tests, pagina en presentatietool bijwerken, foto's, commit en push

## Deuren uit de profielen van Darby Doors (aluminium) (2026-11-10)
- [x] Catalogus van Darby Doors (Du Pont) opzoeken: deurprofielen niet los te koop; losse alu-profielen en pivots wel
- [x] Vragen aan Ian: verbinden met hoekverbinders en schroeven
- [x] Systeem 'Alu Du Pont': koker 50x25x2 en 60x30x2, L 20x10x2, Revolta-pivot, hoek- en T-verbinders (doorsneden, kg/m, prijzen, montage)
- [x] Plannen: werkblad, profielen, opengewerkt, stuklijst, bestellijst en stuk per stuk met de Du Pont-artikelen
- [x] Configurator, presentatietool, tests, PDF's, foto's, commit en push

## Leverancier van losse deurprofielen (alu, steel look) (2026-11-10)
- [x] Darby / Du Pont: SAS-profielen zijn kastdeurprofielen (4 mm glas); de doos is waarschijnlijk de kleurenstalendoos
- [x] Andere leveranciers: Portapivot (pakketten), Pauli+Sohn LOFT (losse staven), Umakov, Glassparts; Du Pont U-profielen
- [x] Alibaba: Huaming, Meitong, Haomei; antidumping 32,1 % (Haomei 21,2 %) + 7,5 %; geen tekeningen
- [x] Keuzes voorgelegd aan Ian

## Aanvraagdossier profielsysteem voor leveranciers (NL + EN) (2026-11-10)
- [x] Profielsysteem op maat vastleggen: P1 vleugel 30x45 met glasgleuf voor 44.2, P2 roede H 30x45, P3 kozijn 40x50, P4 U-glasrubber, C1 hoekverbinder, C2 schroefkanaal, pivot
- [x] Dit systeem in de bibliotheek (doorsneden met gleuf, glasmaat met inloop 8, stuklijst, bestellijst, plannen)
- [x] aanvraag.mjs: A3-bladen overzicht, doorsneden 2:1 met alle maten, verbindingen, offerteaanvraag met meters per deur; NL en EN
- [x] PDF's in Bureaublad, foto's, commit en push

## Profieltekeningen P1-P4 voor de extrudeur (Alibaba) (2026-11-10)
- [x] Werktekening per profiel (A4, schaal 2,5:1, ISO 128) met maten en eisen
- [x] PDF, PNG per profiel (voor de chat) en DXF, in het Engels en het Nederlands
- [x] Engels antwoord aan de leverancier: doorsnede, meters, glasdikte, wand 1,8 mm, monsters
- [x] Kopie op het bureaublad (Profielaanvraag), commit en push

## QA 0.5.13 verwerken naar 0.5.14 (2026-11-10)
- [x] F203: voorbeeldwalker alleen echte CAD-documenten, test dat datafiles overgeslagen worden en een echt document zonder naam faalt
- [x] F204: STEP telt alleen exact === true als exact; export en Publish vragen bevestiging bij rebuild.errors; tests (wrap-export, document met fouten)
- [x] F179: checkEdges waarschuwt als de eigen B-rep-randkeuze null is (geen stil resultaat)
- [x] F172/F198/F202: volumegrens zonder 0,5 %-cap op het app-pad, vormtolerantie niet meer met de diagonaal; tests bijwerken
- [x] F137/F54: rebuildworker-framepauze 11 s op win-release-3of3 onderzoeken en oplossen
- [x] F180: commitOf gebruikt commit.txt als de git-checkout niet deze repo is
- [x] Docs: docs/31-qa-0.5.13.md, README Status 0.5.14, doc-counts, versie 0.5.14
- [x] Commit, push, volledige CI groen op dezelfde SHA, logs via npm run bewijs -- --ci (run 42940008926 op 564ae50, 17/17)

## Rest van QA 0.5.13 naar 0.5.15 (2026-11-11)
- [x] F114/F199: eigen IGES 5.3-schrijver (B-spline-vlakken met trimkrommen, entiteiten 128/126/142/144) met terugleestest (step-e2e 16/16, 13 IGES-tests)
- [~] F134/F46: rebuild.ts onder 1000 regels splitsen; releasepad rekent volledig in de worker
- [ ] F51/F121: B-rep voor face fillet, full round, setback en loft/sweep met guide curves
- [~] F112/F124: de 196 niet-bedrade Options bedraden (incl. virtualSharps) of eerlijk uit het schema halen
- [x] Kleine punten: F192 viewpanes in de regressie, F193/F24 Modify-eenheden en material-tabs, F138 npm audit, F186, F122 centermarks/verborgen lijnen, F145/F184 E2E_REPEAT (viewpanes 45/45, features 10x 10/10, audit 0, drawing 35/35)
- [x] Visueel naast SW-frames: F16 iconen/lettertype, F21 taakvenster-iconen, F22 bodyranden, F161 shading-naad (gemeten; vlakpictogrammen boom en AO-korrel in gaten nog iets af)
- [x] F49/F117: signeerpad klaar voor een certificaat (geen aankoop), F28 Insert Component in Electron (zelftest 7/7, desktop 15/15)
- [ ] Samenvoegen, alle gates, docs/32, README Status 0.5.15, versie 0.5.15
- [ ] Commit, push, CI 17/17 op dezelfde SHA, logs via npm run bewijs -- --ci

## Kabeldoos versie 2: modules met kabelgoten (2026-11-11)
- [x] Oorzaak "te groot": uitgesloten hoek 10 x 20 rechtsvoor in het slicerprofiel; EISEN.md versie 2 (max 230 x 230 per deel, max 80 hoog, kabelgoten, modules met sleutelverbinding)
- [x] Generator: liefst alles in 1 module (Ian, 2026-11-11) van hoogstens 230 x 230 x 80: diepe smalle goten die ook de bordjes vasthouden; anders zo weinig mogelijk modules met zwaluwstaart en klikneus
- [x] Snelle en volledige test: één lichaam per deel, max 230 x 230, niets botst, exacte vorm, STL dicht (10 groen)
- [x] STL's: bak 229,8 x 229,8 x 65,9, deksel, plaat met 9 gootdeksels; elk getoetst op 230 x 230
- [x] Werktekeningen TRN-00 tot 03, bouwschema, README/bestellijst, alles-afdrukken-PDF, app
- [x] Foto's naar Ian, commit en push

## Kabeldoos: lagere goten met klikdeksels (2026-11-11)
- [x] Goten van 60 naar 17 hoog zonder deksels (vervangen: Ian wil toch klikdeksels)
- [x] Goten 28 hoog (Ian: 25, iets hoger mag) met de klikdeksels van versie 2; vulgraad 59 %; STAL-namen zoeken en controleren
- [x] Klik steviger: nok 0,4 voorbij de vinger (was 0,25), 4 klikpunten per deksel tussen de rijen (rek 1,47 %)
- [x] README, EISEN.md, Berekeningen (vulgraad 59 % bij 28 hoog) bijgewerkt
- [x] Tests (qaTrein 9/9) en STL's, tekeningen TRN, bouwschema, alles-afdrukken-PDF opnieuw
- [x] Foto's naar Ian; commit en push

## Kabeldoos 25 mm lager (2026-11-11)
- [x] Binnenhoogte 63,5 -> 39,6: 10 mm speling boven de gootdeksels (Ian); doos 44,4 met deksel
- [x] Tests: geen botsingen, 230 x 230, STL's dicht (8/9; rebuildtijd bak 50 s > 45 s door belasting van de pc, ook de vorige versie haalt nu 53 s)
- [x] STL's, tekeningen, bouwschema, alles-PDF, app; README, EISEN, rekenblad (warmte 2,6 K)
- [x] Foto's naar Ian, commit en push

## Taatsdeurenconfigurator: staal en aluminium apart, montage, prijzen, nieuwe look (2026-11-12)
- [x] Staal en aluminium op aparte pagina's (eigen stijlen, profielen, kleur en prijs; Werkplaats per materiaal)
- [x] Montagebladen per systeem: hoekverbinding (staal: verstek lassen; alu: verstek + hoekverbinder), roeden, glas (geschroefd, klik, rubber), pivot inbouwen, verzonken bouten
- [x] Verbindingen in 3D (uit elkaar en samen) per deur, en de pivot zichtbaar in de 3D-kamer
- [x] RAL-keuze met kleurvierkantjes
- [x] Pivot draait in 3D naar beide kanten (verdekt blijft één kant)
- [x] Prijzen naar de markt: aluminium hoogstens ± € 880 excl. btw, staal € 1 100 tot 2 300; plaatsen apart; marktvergelijking per materiaal
- [x] Nieuwe look van de hele configurator
- [x] Testen (qaDeuren 500 + montage 31 + browser), presentatie en artifact bijwerken, foto's naar Ian, commit en push (e2d06f4)

## Taatsdeuren: gaten van de vijzen en de profielen tot in detail (2026-11-12)
- [x] Boringen per stuk vastleggen (boringen.mjs): plaats, Ø, verzinking 90°, schroefdraad, door één of beide wanden, per systeem
- [x] Montage-3D en -bladen: echte gaten met afschuining in de wanden en platen, letters A, B, ... met de maat (ISO 15786)
- [x] Stukbladen per onderdeel: de gaten in de aanzichten met maten en verzinksymbool
- [x] Profielen tot in detail: kokers met hoekstralen (EN 10219), wanden en kamers zoals ze echt zijn; pivot boven met inlegplaat in het kozijn
- [x] Testen (montage 35/35, qaDeuren 500/500 na busplaat 30x30x8 i.p.v. lasring), artifact, foto's, commit en push
- [x] Structuur (fijnstructuur, glad mat, zijdeglans) als stalen in de RAL-kleur (beide configuratoren)
- [x] Advies Fable 5.2 (deuren en hele CAD) en de fouten verbeterd: geen verzonken kop in dunne wand, hoeklijn 3 mm, vloeiboren M4, toegangsgat met afdekdop, afstandsbus greep, stelschroeven aan de glaszijde, glijbus en intrekgat bovenpen

## Treinverlichting: advies Fable 5.2 verwerken (2026-11-12)
- [x] Bordjes vast met klemlippen; bedraden op tafelhoogte (neerklapbaar ophangen); haakje/spatel voor de goten
- [x] Elektrisch: polyfuse op +12 V knoppen, ompoolbeveiliging + DC-bus, polyfuse per groep, 1N4148 per ingang, OE-weerstand, ingangen ook naar massa
- [x] Firmware: watchdog, hotspot herstarten, update over wifi, noodreset met BOOT, thuis-wifi, testmodus looplicht
- [x] Bouwen: opbouwtekening gaatjesprints, interne draadlijst met 0 V-klem, stap firmware laden, meetblad, invulblad groepen
- [x] Rekenblad (warmte, polyfuse bij 40 °C), documentfoutjes, tests, app en foto's

## Afzuiging: advies Fable 5.2 verwerken (2026-11-12)
- [x] Lucht: grotere verdeelruimte onder het filter, opener rooster, lucht boven de plooien, ventilator ontkoppeld, werkhoogte 10 cm eerlijk, proefopstelling
- [x] Uitblaas blijft vrij (Ian: geen adapter naar buiten), weg van de voedingsbox; koolfilter als optie, L3/L4 met echte criteria
- [x] Onder de tafel ronde, bolle vormen (romp, bodemplaat, voedingsbox, knophouder) om ruimte te sparen; bovenkant blijft vierkant met afgeronde hoeken
- [x] Firmware: filter-vol op laagste druk over een venster met hysterese, aparte ijking wissen, stop bij filter weg/geen lucht, watchdog, tacho-filter, nachtuit, radio weg = stoppen
- [x] Veiligheid en blad: spleten bij de waaier, CE/risicoanalyse-checklist, latten in het blad, MDF-mal, doorbuigproef
- [x] Elektrisch: ompoolbeveiliging, draaddikte gelijk, aarding nakijken, opbouwtekening gaatjesprint, stoffilter voedingsbox
- [x] Tests, tekeningen, revisie, foto's, commit en push
- [x] Treinbak terug binnen 45 s (schroefgaten als achthoek: 38 s); foto's van het knoppotje

## Afzuiging: schroeven van de klauwen beter geleid (2026-11-13)
- [x] Module: M5 x 70 (was 65), gat Ø5,4 over de hele toren: 9 mm geleiding boven, 6,5 mm in een blind gat onderaan
- [x] Knop: gat Ø4,3 boven (12 mm) en Ø4,4 in het deksel
- [x] Bestellijst, README, revisie; tests (49 + STL + tekeningen groen), commit en push

## Afzuiging: helemaal rond model om te vergelijken (2026-11-13)
- [x] Variant in voorbeelden/afzuiging/rond/: rond frame, ronde RVS-plaat met LB-rooster, ronde romp en kuip
- [x] Filter kiezen dat in rond past (kant-en-klaar), klauwen op de omtrek
- [x] Test (bouwt, botst niet, luchtdicht), vergelijkingstabel met 7.3, foto's naast elkaar

## Treindoos: zoveel mogelijk kant-en-klare printjes (2026-11-13)
- [x] Elke zelfgebouwde gaatjesprint vervangen door een bestelbaar module (uitgangen/MOSFET, ingangen/opto, voeding/buck, zekeringen, DC-bus) met product, winkel en prijs
- [x] Doos aanpassen: palen/gaten per module, goten en kabelwegen
- [x] Schema, draadlijst, bestellijst, bouwschema en meetblad bijwerken; opbouwtekeningen die wegvallen schrappen
- [x] Firmware nakijken (pinnen, polariteit van de modules), tests, app, foto's, commit en push

## Balustrades: configurator zoals de taatsdeuren (2026-11-13)
- [x] Vragenronde en EISEN.md (4 soorten, binnen/trap/buiten, op de vloer en zijmontage, prijs per meter)
- [x] Normen en belastingen opzoeken (NBN B 03-004, EN 1991-1-1 ANB, NBN S 23-002), profielen en kooponderdelen met prijzen
- [x] Model: lijnen (recht, hoek, trap), staanders, regels, vulling per soort, bevestiging; stuklijst en zaaglijst
- [x] Werkplaatsdocumenten: tekening per stuk, lasdetails, montage per verbinding, bestellijst, PDF
- [x] Klantpagina en werkplaats (3D, RAL, prijs per meter met marktband), instellingen
- [x] Tests, artifact, foto's, commit en push

## Balustrades: afschuining aan de uiteinden onder een schuin dak (2026-11-13)
- [x] Invoer per uiteinde (begin/eind): aan/uit, dakhelling, hoogte onder het dak aan de muur, spleet tot het dak
- [x] Model: handregel en vulling volgen het dak (schuine staander/regel, ingekorte spijlen, glas met schuine kant)
- [x] Veiligheid: opening tussen dak en balustrade ≤ 110 mm, volle hoogte waar het dak hoger is; berekening per stuk
- [x] Stuklijst, zaagsneden (verstekhoeken), tekening per stuk, glasmaat met schuine kant, prijs (toeslag per afschuining)
- [x] 3D met het dak getekend, klantpagina en werkplaats; tests uitbreiden
- [x] Web en presentatie opnieuw maken, artifact bijwerken, foto's, commit en push
