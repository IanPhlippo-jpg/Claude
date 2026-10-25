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
- [ ] Lijst van bugs van de gebruiker ontvangen en reproduceren
- [ ] Statusmelding "Select a plane…" wissen zodra de schets start; lege schets = Under Defined
- [ ] e2e-scripts lokaal laten draaien (Edge via `channel: 'msedge'` i.p.v. Linux-pad)
- [ ] Verschillen 1–7 uit `docs/05-vergelijking-video.md` doorvoeren (achtergrond, arcering, relatie-iconen, maattekst, punten, viewnaam, vlakkenkeuze)

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
- [ ] Vervolg fase 2: Shell, Linear/Circular Pattern, Hole Wizard, Sweep/Loft, Mirror

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
- [~] Playlist downloaden (720p) met frames om de 15 s en contactvellen per video: referentie-video/playlist/ (achtergrond, download.sh)
- [ ] Per video de contactvellen bekijken en alles wat gebouwd is vergelijken (interface, PropertyManagers, gedrag); afwijkingen noteren in docs/07-vergelijking-playlist.md en oplossen

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
- [ ] Nog 10 video's niet gedownload (YouTube-botcontrole: 08, 09, 35, 46, 53–58) — later opnieuw proberen

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
- [ ] Draft-hoek van de rib wordt opgeslagen maar nog niet op de mesh toegepast

## Extrude met Draft (video 29, LEG BASE) (2026-10-21)
- [x] ExtrudeFeature.draft (hoek, Draft outward); taps toelopende extrusie in de kern (offset-ringen per hoogte, gesplitst op het schetsvlak bij Mid Plane / Direction 2, gaten mee); D@ draft.angle in Equations; 4 unit tests
- [x] Extrude PM: Draft On/Off-knop, hoekveld, Draft outward (zoals Direction 1 in het origineel); e2e in e2e/rib.mjs
- [x] Revolve PM: Direction2 en Selected Contours (video 17)

## Eindcondities en sensors (video 40, 31) (2026-10-21)
- [x] Extrude: Up To Next (ray vanuit het profielcentrum tot het eerste vlak), Up To Surface en Offset From Surface (vlak kiezen in het beeld, Reverse offset; ook schuine vlakken via half-ruimte-doorsnede); in de PM-lijst en het RMB-menu; gele preview tegen het lichaam; 4 unit tests
- [x] Sensors-map in de tree: RMB Add Sensor ▸ Mass / Volume / Surface Area, "Mass1 (1234.56 grams)" volgt de rebuild; Delete
- [x] Up To Surface / Offset From Surface ook met een referentievlak als eindvlak (klik op Plane1 in de tree)
- [x] Center Rectangle tekent beide constructie-diagonalen (video 48); donker thema: neutraal grijs beeldvlak (video 43)
- [ ] Up To Vertex en Up To Body (hoekpunt-selectie ontbreekt nog)

## Multi-body (video's 11, 44, 45, 52) (2026-10-21)
- [x] Kern: Merge result (uit = aparte body), een boss die niets raakt wordt een nieuwe body, meerdere geraakte bodies versmelten; cuts/holes/patronen werken op de bodies die ze raken (Auto-select) of op de Feature Scope; verborgen bodies doen niet mee; fillet/chamfer op de body met de randen; shell op de body van het gekozen vlak; 5 unit tests
- [x] Combine-feature (Add / Subtract / Common) met PM (Operation Type, Main Body, Bodies to Combine); Insert ▸ Features ▸ Combine…
- [x] Solid Bodies-map: RMB Hide/Show Body (cursief), Material… per body (naam achter de body, kleur in het beeld, dichtheid in Mass Properties en sensors), Combine…
- [x] Extrude PM: Merge result aanvinkbaar, Feature Scope (All bodies / Selected bodies, Auto-select) bij meer dan één body
- [x] Insert-menu: Boss/Base ▸ Extrude/Revolve, Cut ▸ Extrude, Features ▸ Fillet/Shell/Rib/Combine, Reference Geometry ▸ Plane werken nu
- [x] e2e/multibody.mjs 14/14 (twee bodies, Hide/Show, materiaal per body, Merge result uit, Combine, Feature Scope, herladen)
- [ ] Delete Body, Move/Copy Body, Bodies to Keep bij een cut die een body splitst

## Sheet metal, basis (video's 16, 21, 24, 26, 32–38, 50, 54, 56) (2026-10-21)
- [x] Kern src/core/features/sheetmetal.ts: Base Flange uit een open schets (wand met buigradius op elke hoek: binnen r, buiten r + t), Tab uit een gesloten schets, Edge Flange (buiging + been langs een rechte rand; Outer/Inner Virtual Sharp, Tangent Bend; Material Inside/Outside; Flip; hoek), bend allowance met K-factor, Flat Pattern (ontwikkelde lengte); 5 unit tests
- [x] Datamodel: Document.sheetMetal (T1, buigradius, K), features baseFlange / edgeFlange / flatPattern (Flat-Pattern1 altijd onderaan, standaard onderdrukt); rebuild met merge; gele preview
- [x] Sheet Metal-tab: Base Flange/Tab, Edge Flange, Flatten (overige knoppen "later"); PM's zoals het origineel (Sheet Metal Parameters From Material, Direction 1, Gauges, Sheet Metal Parameters, Bend Allowance, Auto Relief; Flange Parameters, Angle, Flange Length, Flange Position); Sheet-Metal1 in de tree met eigen PM
- [x] e2e/sheetmetal.mjs 14/14 (L-profiel → Base-Flange1, Edge-Flange1 op de bovenrand, Flatten/terugvouwen, dikte wijzigen, herladen)
- [ ] Miter Flange, Hem, Jog, Sketched Bend, Corners, Unfold/Fold, Convert to Sheet Metal, buiglijnen in de flat pattern, gauge tables

## Section View (heads-up toolbar) (2026-10-21)
- [x] Section View-knop in de Heads-up View toolbar: PM zoals het origineel (Drawing Section View, Section Method Planar/Zonal, Section Options met Show section cap, Section 1 met vlak-iconen Front/Top/Right, Offset distance, Flip Direction, Edit Color; Section 2/3, Selected Bodies)
- [x] Weergave: het model wordt met een halfruimte-doorsnede (CSG) getoond met gesloten snijvlak (section cap); het echte model blijft heel (Mass Properties, selectie); de knop blijft actief en schakelt de doorsnede weer uit
- [x] e2e/section.mjs 9/9
- [ ] Doorsnedevlak met pijlen in het beeld, Zonal, draaihoeken X/Y, kleur van het snijvlak

## Schetsgereedschappen van de Sketch-tab (2026-10-21)
- [x] Kern src/core/sketch/edit.ts: Trim to closest (lijn/boog/cirkel/spline, snijpunten met alle andere entiteiten), Sketch Fillet (twee lijnen → raakboog met tangent-relaties), Offset Entities (lijnen met verstek, bogen/cirkels concentrisch, splines), Linear/Circular Sketch Pattern, Move/Copy/Rotate/Scale Entities, Convert Entities (polylijnen → lijn/cirkel/boog/spline); 6 unit tests
- [x] Tools: Trim (klik), Sketch Fillet (twee klikken, straal in de PM), Offset / Move / Copy / Rotate / Scale / Linear / Circular Pattern (entiteiten klikken, PM-waarden, OK past toe); PM's met de secties van het origineel (Options, Fillet Parameters, Parameters, Direction 1/2, Entities to Pattern)
- [x] Convert Entities: in een schets een modelrand (of vlak) aanklikken en omzetten naar schetsentiteiten op het schetsvlak
- [x] Sketch-tab, S-palet en Tools-menu aangesloten; e2e/sketchtools.mjs 9/9
- [x] Sketch Chamfer (Distance-distance, Equal distance), Extend Entities (tot de volgende entiteit); Edit Appearance (kleur voor het part of een body, swatches + RGB, Remove Appearance) in Render Tools en in het body-menu
- [ ] Power trim, From/To-modus bij Move, Add dimensions bij Offset/patronen, Text, Ellipse

## Curves ▸ Helix and Spiral (2026-10-21)
- [x] HelixFeature op een cirkelschets (as = schetsnormaal): Defined By Pitch and Revolution / Height and Revolution / Height and Pitch, Reverse direction, Start angle, Clockwise/Counterclockwise; PM zoals het origineel (Taper Helix grijs)
- [x] De helix is een referentiecurve (donkerblauw) in het beeld en in de tree (Helix/Spiral1 met de schets eronder); Swept Boss/Base/Cut kan de helix als Path kiezen (veer, draad)
- [x] e2e/helix.mjs 5/5 (cirkel r20, pitch 10 x 3 omwentelingen, profiel r2 → veer met het verwachte volume)
- [ ] Variable pitch, Taper Helix, Spiral (vlak), Split Line, Projected Curve


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
- [ ] Na elke stap: deurkruk-voorbeeld + screenshots, volledige regressie

## Vervolg 3: veelgebruikte knoppen die nog "later" zijn (2026-10-21)
- [x] Features ▸ Draft (neutraal vlak, vlakken, hoek; naar binnen tapsen) — klaar (frustumvolume exact, e2e/draftcheck.mjs)
- [x] Assembly ▸ Interference Detection in de ribbon aan de bestaande controle koppelen — klaar (ook in Evaluate)
- [x] Evaluate ▸ Check (gesloten/geldige body) en Section Properties (oppervlak, zwaartepunt van een vlak) — klaar (vectoroppervlak-test, traagheidsmomenten)
- [x] Features ▸ Intersect (gemeenschappelijk deel van bodies) — klaar (regio's uitsluiten, Merge result)
- [ ] Na elke stap: e2e + volledige regressie + screenshots

## Vervolg 4: analyse en bewerken in context (2026-10-21)
- [x] Evaluate ▸ Draft Analysis (vlakken kleuren naar trekhoek: groen positief, rood negatief, geel steil) — klaar
- [x] Evaluate ▸ Curvature (vlakken kleuren naar kromming) — klaar (per vlak, 1/r log-schaal)
- [x] Hole Wizard: Straight Tap — klaar (kernboring, cosmetische draad gestippeld in 3D, naam M6x1.0 Tapped Hole1); draad in tekening nog niet
- [x] Assembly ▸ Edit Component (onderdeel in context openen en terug) — klaar (banner + Return to Assembly, alle instanties bijgewerkt)
- [ ] Na elke stap: e2e + volledige regressie + screenshots

## Vervolg 5: resterende schets- en featureknoppen (2026-10-21)
- [x] Boundary Boss/Base en Boundary Cut (tussen twee profielen, met de loft-kern) — klaar
- [x] Evaluate ▸ Sensor-knop met Sensor-PM (Mass / Volume / Surface Area) — klaar
- [x] Sketch ▸ Repair Sketch (kleine gaten en dubbele lijnen opsporen en herstellen) — klaar
- [x] Sketch ▸ 3 Point Arc Slot — klaar (concentrische bogen, gelijke doppen, constructie-middenboog)
- [ ] Na elke stap: e2e + volledige regressie + screenshots

## Vervolg 6: schetsgereedschappen die nog ontbreken (2026-10-21)
- [x] Tangent Arc (raakboog aan het eind van een lijn of boog) — klaar
- [x] Perimeter Circle (cirkel door drie punten) — klaar
- [x] Centerpoint Arc Slot — klaar
- [x] Horizontal / Vertical Dimension (maat met vaste richting) — klaar
- [ ] Na elke stap: e2e + volledige regressie + screenshots

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
- [~] bugronde: volledige regressie
- [ ] designronde: interface naast SW 2026-frames (lettertype, kleuren, afstanden, iconen) en bijwerken
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
- [ ] Overige grijze PM-opties (sheet metal, draft, pattern, dimension-PM, drawing-PM, motion)
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
- [ ] Bugjacht: PropertyManagers openen/OK/Cancel/Undo per feature; geen vastlopers
- [ ] SW-gelijkenis: hoofdschermen (part, sketch, feature-PM, assembly, drawing) opnieuw naast referentieframes, verschillen wegwerken
- [ ] Gevonden fouten oplossen + regressie + installer

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
- [~] Blok F: playlist-video's (58) commando per commando naast elkaar, verschillen wegwerken
  - [x] oude open punten: Delete Face (Delete/Patch/Fill), Pierce-relatie, schetskleur, gedeelde-schets-icoon, Loft Direction Vector/Tangency To Face, Richting 2 Up To Vertex/Surface/Next (e2e/blockf.mjs 6/6)
  - [~] inventaris per video (4 agents) en verschillen wegwerken
- [ ] Na elk blok: tsc, unit tests, e2e van het blok, screenshot; op het einde volledige regressie, versie ophogen, installer

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
- [ ] Later: code signing, worker/incrementele rebuild, B-rep-proef, vitest-major voor npm audit

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
- [ ] Playlist-inventaris afmaken (video's 13–15, 21–24, 26–37) en resterende verschillen wegwerken
- [ ] Na elk blok tsc + e2e; op het einde volledige regressie, 0.3.3, installer, schermafbeeldingen
