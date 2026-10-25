# Vergelijking met de video (lokale sessie, 2026-10-20)

Bron: *SOLIDWORKS 2026 Beginner Tutorial* (Design Forge, `jhaPTx056vI`), lokaal gedownload met yt-dlp
(1920×1080, 32 min) en met ffmpeg om de 5 s in frames gezet: `referentie-video/frames/f_NNNN.jpg`
(frame N = tijdstip (N−1)×5 s). De app is op dezelfde resolutie vastgelegd met Playwright/Edge in
`referentie-video/app/`. Beide mappen staan in `.gitignore`.

Nuttige frames: 17 (lege part), 20 (heads-up toolbar ingezoomd), 22 (design tree ingezoomd), 24 (CommandManager-tabs),
50 (vlak kiezen), 57 (lege schets), 61 (Sketch-tab ingezoomd), 65 (oorsprong), 70 (rechthoek), 81–82 (Dimension
PropertyManager + Modify), 95 (cirkel met Ø-maat), 104 (Features-tab ingezoomd), 111 (Boss-Extrude), 118 (part).

## Wat al overeenkomt

Titelbalk "… Design ›" met documentnaam in het midden, CommandManager met tab-strip eronder, FeatureManager met
tab-iconen, filterveld en dezelfde items (History, Sensors, Annotations, Material, Front/Top/Right Plane, Origin),
"(-) Sketch1" bij een onderbepaalde schets, blauwe rollback-lijn, Model | Motion Study 1-tabs, Confirmation Corner,
Modify-dialoog bij de maat, groene relatie-iconen, blauwe/zwarte schetskleuren, gearceerde contouren, triade met
viewnaam, statusbalk met coördinaten / definitiestatus / "Editing Sketch1" / MMGS.

## Verschillen (video → app)

| # | Video | App | Voorstel |
|---|---|---|---|
| 1 | **Grafisch venster is vlak wit**; hooguit een nauwelijks zichtbare grijze zweem onderaan (fr. 17, 57, 118) | Radiale gradient die naar de randen duidelijk grijs wordt | Achtergrond vrijwel wit maken (`#ffffff` → `#f3f4f6` max) |
| 2 | **Gearceerde contour is middengrijs** (~`#c0c0c0`), duidelijk donkerder dan het venster (fr. 70, 95) | Zeer lichtgrijs (~`#e3e5e9`), valt weg tegen de achtergrond | Arcering donkerder (`#c4c7cc`) |
| 3 | **Relatie-iconen**: felgroene gevulde vierkantjes (~`#2ee22e`) met zwart glyph, zonder rand (fr. 70, 95) | Bleekgroene afgeronde kaders met donkere rand | Vulling feller groen, rand weg, hoeken scherp |
| 4 | **Maattekst** "80.00" / "Ø35.00": twee decimalen, geen eenheid, normale schreefloze letter (~13 px), geen kader | "80 mm" / "ø35" in monospace met wit kadertje; eenheid erbij, geen decimalen | Tekst "80.00" zonder eenheid, Segoe UI, zonder kader (kader alleen bij hover/selectie) |
| 5 | **Eindpunten** van lijnen: kleine zwarte vierkantjes; cirkelmiddelpunt een klein kruisje "+" (fr. 95) | Blauwe vierkantjes; middelpunt een vierkant met punt | Zwart (of kleur van de entiteit), middelpunt als "+" |
| 6 | **Viewnaam** bij schets op Top Plane: "*Top" (fr. 57); triade toont X naar beneden, Y naar rechts in die view | "*Normal To" | Naam van het vlak gebruiken als de view loodrecht op een referentievlak staat |
| 7 | **Vlakkenkeuze** (fr. 50): vlakken als dunne blauwgrijze omtrek zonder vulling, naam in blauwe schuine letters langs de bovenrand, assen gestippeld, gehoverd vlak oranje; PropertyManager "Edit Sketch" met gele boodschap "Select a plane on which to create a sketch for the entity." | Vlakken gevuld lichtblauw, kleine rechte labels, geen PropertyManager, boodschap alleen in de statusbalk | Omtrek zonder vulling, schuine labels, oranje hover, Edit-Sketch-PropertyManager met gele boodschap |
| 8 | **Solid Bodies** verschijnt pas na de eerste feature, als "Solid Bodies(1)" (fr. 17 vs 118) | Altijd zichtbaar, zonder telling | Pas tonen bij ≥ 1 body, met "(n)" |
| 9 | **PropertyManager Rectangle** (fr. 65): "Rectangle Type" met 5 typeknoppen, "Add construction lines", "Parameters" met x/y-velden, later "Existing Relations" / "Add Relations" / "Options / For construction" (fr. 70) | "MESSAGE: Click two opposite corners." + lege "OPTIONS" | Secties overnemen; eerste stap: Rectangle Type + Parameters |
| 10 | **PropertyManager Dimension** (fr. 81): tabs Value / Leaders / Other, secties Style, Tolerance/Precision, Primary Value ("D2@Sketch1", 80.00mm), Dimension Text | Type / Primary Value / Driven / Status / Delete | Naam "D1@Sketch1" tonen, Primary-Value-sectie zoals het origineel; overige secties als placeholder |
| 11 | **Fly-out FeatureManager** tijdens een commando staat als ingeklapte regel "▸ BasePlate (Default) <<Def…" linksboven **in het grafische venster** (fr. 65, 70) | Als regel bovenaan in het paneel ("Part1 (fly-out FeatureManager)") | Verplaatsen naar de linkerbovenhoek van de viewport |
| 12 | **Menu-bar-toolbar** staat op een eigen rij onder de titel (Home, New▾, Open▾, Save▾, stoplicht, Options▾, Undo▾, Redo▾); de CommandManager herhaalt die als 3×3 kleine iconen vóór "Update and Freeze" / "Create Derived Part" (fr. 17, 22) | Toolbar-iconen op de titelrij; geen 3×3-blok | Eigen rij + 3×3-blok (laatste is laag prioriteit) |
| 13 | **Sketch-tab raster** (fr. 61): 3 rijen × 4: Line▾ · Circle▾ · Spline▾ · (select) / Rectangle▾ · Slot▾ · Ellipse▾ · Text / Slot-straight▾ · Polygon · Arc▾ · Point; na "Offset Entities" ook "Offset On Surface"; Shaded Sketch Contours is een **grote** ingedrukte knop rechts; Instant2D groot | 2 rijen × 6 in andere volgorde; Shaded Sketch Contours als kleine toggle; "Construction Geometry" extra | Volgorde en grootte overnemen |
| 14 | **CommandManager-tabs**: Features · Sketch · Surfaces · Sheet Metal · Evaluate · Render Tools · SOLIDWORKS Add-Ins (fr. 24) | Features · Sketch · Markup · Evaluate · MBD Dimensions · Phlippo Add-Ins · Assembly · Drawing | Markup/MBD vervangen door Surfaces · Sheet Metal · Render Tools (placeholders); Assembly/Drawing kunnen blijven |
| 15 | **Features-tab**: Extruded/Revolved Boss/Base gekleurd en actief, Instant3D ingedrukt (fr. 17); geen "Sketch"-knop in deze tab | Alles grijs met tekst "Feature tools arrive in phase 2", extra Sketch-knop | Pas relevant in fase 2 |
| 16 | **Heads-up toolbar** staat op de hoogte van de tab-strip, zonder kader, iconen gekleurd (fr. 20) | Iets lager, in een licht afgerond kader, iconen grijs | Omhoog, kader weg, kleur-iconen |
| 17 | **Statusbalk**: drie losse coördinaten "29.9mm  43.51mm  0mm", geen gekleurde achtergrond bij de status (fr. 70) | "30.25, 29.73 mm", "Under Defined" met blauwe achtergrond | Drie waarden met eenheid, geen achtergrondkleur |
| 18 | **Task Pane**-strip rechts heeft 9 iconen (fr. 17) | 4 iconen | Laag prioriteit |
| 19 | **FeatureManager-breedte** ≈ 230 px op 1920 px; paneelkop zonder "‹ … ✕" | ≈ 300 px, met ‹ … ✕ | Smaller maken |

## Functionele fouten gezien tijdens het vastleggen

- De statusmelding "Select a plane on which to create the sketch for the feature." blijft in de statusbalk staan
  nadat het vlak gekozen is en de schets al bewerkt wordt (`referentie-video/app/05-sketch-empty.png`).
- Een lege schets wordt gemeld als "Fully Defined"; de video toont "Under Defined" (fr. 57).
- Smart Dimension via de toetsenbordvolgorde lijn → plaatsing werkte voor de onderste lijn, maar de tweede maat
  (linkerlijn) werd na de eerste maat niet geplaatst omdat de geometrie na het invoeren van 80 mm verschoven was;
  dat is op zich correct gedrag, maar bevestig dat de selectie-hitbox na herpositionering klopt.

Unit tests (32) en `tsc -b` slagen. De Playwright-e2e-scripts verwijzen naar een Linux-pad voor Chromium en draaien
lokaal nog niet; met `channel: 'msedge'` werken ze wel (zie `capture.mjs`-aanpak in deze sessie).

## Werkwijze herhalen

```
yt-dlp -f "bv*[height<=1080][ext=mp4]/bv*" -o referentie-video/video.mp4 https://youtu.be/jhaPTx056vI
ffmpeg -i referentie-video/video.mp4 -vf fps=1/5 -q:v 2 referentie-video/frames/f_%04d.jpg
```

## Doorgevoerd in de lokale sessie (2026-10-20, avond)

Functioneel (gevonden door zelf te tekenen met echte muisbewegingen en met de e2e-scripts):

- **Klik-en-slepen** werkte voor geen enkel tekengereedschap: de app kende alleen klik-klik, dus wie zoals in het
  origineel sleept, zag alleen een voorbeeld en kreeg niets. Nu ondersteunen lijn, rechthoek, cirkel, polygoon, bogen
  en spline beide manieren (`src/app/viewport/tools.ts`, `pointerUp`). Een gesleepte lijn is één segment (geen
  ketting), zoals het origineel.
- **Vlak selecteren in de tree en dan Sketch** opent de schets meteen op dat vlak (`selectedPlane` in de store);
  voorheen moest je altijd nog in het venster klikken.
- **Smart Dimension**: de maat hangt nu als voorbeeld aan de cursor; bij twee punten wordt het type bepaald door
  waar de cursor staat (boven/onder = horizontaal, links/rechts = verticaal, diagonaal = schuin), zoals het origineel.
  De Modify-dialoog krijgt de focus met de waarde geselecteerd (die ging voorheen naar het PropertyManager-veld, zodat
  typen + Enter niets deed) en toont de naam "D1@Sketch1".
- **Esc** beëindigt de entiteit in uitvoering én laat de tool los (SOLIDWORKS-help "Sketch Modes"); dubbelklik
  beëindigt de ketting en houdt de tool actief.
- De statusmelding "Select a plane…" bleef staan na het kiezen van het vlak; een lege schets heette "Fully Defined".
- De app startte in het donkere thema als Windows donker stond; het origineel heeft geen donkere modus, dus licht is
  nu altijd de start (Ctrl+Shift+D blijft werken).
- De fly-out FeatureManager staat nu linksboven in het grafische venster en klapt in zodra je in het venster klikt.
- e2e-scripts draaien lokaal via Edge (`npm run e2e` met `E2E_URL=http://127.0.0.1:5173/`): 66/66 controles.

Uiterlijk (punten 1–19 uit de tabel hierboven): 1, 2, 3, 4, 5 (deels: punten kleiner), 6, 7, 8, 9, 10, 11, 12, 13,
14, 16, 17, 19 doorgevoerd; 15 (Features-tab gekleurd, Instant3D ingedrukt) doorgevoerd met een melding dat de
feature in fase 2 komt; 18 (Task Pane 9 iconen) nog open.

Nieuw: `start-app.cmd` start de app als eigen venster zonder browserbalk, schermvullend (Edge app-modus).

## Fase 2 (2026-10-20, avond): 3D-features

Nieuw, gebouwd op een mesh-solidkern met booleans (three-bvh-csg):

- **Extruded Boss/Base** en **Extruded Cut** (Blind, Mid Plane, Through All, Direction 2, Reverse) en **Revolved
  Boss/Base / Cut** (as = lijn of centerline van de schets, hoek) via de Features-tab, met gele preview, Boss-Extrude-
  PropertyManager zoals in frame 111 (From, Direction 1, Direction 2, Thin Feature, Selected Contours) en Confirmation
  Corner. De view draait automatisch naar trimetrisch, zoals in de video.
- **Bodies** in "Shaded With Edges" (lichtgrijs, zwarte randen), hover oranje, selectie blauw; vlak selecteren en dan
  Sketch opent een schets op dat vlak (view "Normal To"). Display styles via de heads-up toolbar.
- **Feature tree**: Boss-Extrude1 ▸ Sketch1, Solid Bodies(1), Edit Feature / Edit Sketch / Suppress / Delete, rollback.
- **Fillet** en **Chamfer** (fly-out van Fillet, zoals het origineel): randen van de body aanwijzen (oranje) en
  selecteren (blauw, Ctrl voor meer), PropertyManager met Items To Fillet / Chamfer Type / radius of afstand, preview
  op het model. Werkt op rechte en cirkelvormige randen tussen vlakke zijden; de rand-referenties overleven een rebuild.
- Randweergave: eigen knikrand-detectie (`src/core/features/edges.ts`) die de T-kruisingen van booleans negeert, zodat
  er geen driehoekslijnen op vlakke zijden verschijnen; tangentranden (vlak ↔ fillet of cilinder) worden als dunne lijn
  getekend, zoals "tangent edges visible" in het origineel. Normalen zijn glad binnen 30° en scherp over knikken.
- Een Cut op een vlak van de body snijdt standaard het materiaal in (de vlaknormaal wijst naar buiten), zoals het origineel.
- **Mirror** (body spiegelen om Front/Top/Right of een vlak van de body, samengevoegd), **Linear Pattern** en
  **Circular Pattern** (extrude/cut/revolve-features herhalen langs de X/Y/Z-as of om een as door de oorsprong) en
  **Hole Wizard** (Hole, Counterbore, Countersink; Through All of Blind; posities aanklikken op het geselecteerde vlak).
- **Shell**: wanddikte en te verwijderen vlakken (Ctrl voor meer). De holte wordt uit de bouwgeschiedenis gemaakt: het
  toegevoegde materiaal naar binnen verschoven (snijding van verschoven vlakken per hoekpunt, T-kruisingen meegerekend)
  min elk snijgereedschap (cuts, holes, fillets/chamfers, hun patronen en spiegelingen) met de wanddikte vergroot, elk
  als boolean. Zo blijft de holte een geldige solid, ook als gaten dichter bij elkaar liggen dan tweemaal de wanddikte
  (eerder gaf dat waaierlijnen en een kapotte buis rond het kleine gat).
- **Swept Boss/Base / Swept Cut**: profiel-schets langs een pad-schets (lijnen, bogen, splines aan elkaar), met
  parallel-transport-frames; **Lofted Boss/Base / Lofted Cut**: tussen twee profiel-schetsen (herbemonsterd op booglengte,
  minimale twist). Pad of tweede profiel kies je in de PropertyManager ("Profile and Path" / "Profiles"); de feature
  tree toont beide schetsen als kind (Sweep1 ▸ Sketch3, Sketch4).
- Vlakken van bodies: een cilinder- of filletvlak licht als geheel op bij hover/selectie (zoals het origineel), niet per
  facet; splinters van booleans horen bij het vlak waarop hun hoekpunten liggen, zodat de blauwe/oranje overlay geen
  gaten of waaiers toont. Een schets of Hole Wizard op een gebogen vlak geeft de melding "Select a planar face".
- Nog niet: patronen langs een rand of om een cilindervlak, holes in een omwenteling, fillets op randen tussen gebogen
  vlakken, Shell waarbij een door een cut gemaakt vlak open moet. De kern is een trianglemesh, geen echte B-rep.

Controle: `e2e/features.mjs` bouwt de BasePlate uit de video (80×80, Ø35, Boss-Extrude 10 mm, Cut-Extrude Through All
op het bovenvlak, Fillet 5 mm en Chamfer 4 mm op randen, Hole Wizard counterbore op twee posities, Linear Pattern van
de cut, Mirror om Right Plane, Shell 2 mm met open bovenvlak, Sweep van een Ø8-cirkel op Front Plane langs een lijn
op Top Plane), test undo/redo, herladen, scrollwiel-zoom op de cursor en draaien met de pijltjestoetsen: 28/28.

## Evaluate en bestanden (2026-10-20, nacht)

- **Mass Properties** (Evaluate-tab, Tools ▸ Evaluate): zwevend venster met de opmaak van het origineel — Selected items,
  Options/Override/Recalculate, de drie vinkjes, "Report coordinate values relative to", en het rapport (Density, Mass,
  Volume, Surface area, Center of mass, Principal axes/moments, Moments of inertia L en I met positive tensor notation),
  Print / Copy to Clipboard / Close / Help. Dichtheid bij "Material <not specified>" = 1000 kg/m³ zoals het origineel.
  Kern: `src/core/features/measure.ts` (divergentiestelling over de driehoeken, Jacobi voor de hoofdassen).
- **Measure**: zwevend "Measure - Part1"-venster met de werkbalk (Arc/Circle, Units, Show XYZ, XYZ relative to,
  Projected on, History, Sensor), de geselecteerde items en de metingen: Length / Diameter / Circumference van randen,
  Area / Perimeter van vlakken, Distance + Delta X/Y/Z, Angle en Total Length tussen twee randen, Normal Distance of
  Angle tussen twee vlakke vlakken, en in een schets afstand tussen punten en lengte/diameter van entiteiten. Selectie
  telt op zolang het venster open is (zoals het origineel), nogmaals klikken deselecteert.
- **STL**: File ▸ Save As ▸ STL schrijft een binaire STL van de body; File ▸ Open van een .stl voegt de mesh toe als
  feature "Imported1" (eigen icoon in de tree, union met de bestaande body; een binnenstebuiten mesh wordt omgedraaid).
  STEP/IGES vragen een echte B-rep-kern en zijn er niet.

## Fase 3: Equations en Global Variables (2026-10-20, nacht)

- Tools ▸ Equations… opent "Equations, Global Variables, and Dimensions" met de drie views (Equation, Dimension, Ordered),
  de secties Global Variables en Equations (Name · Value/Equation · Evaluates to · Comments), de rijen "Add global
  variable" / "Add equation", Automatically rebuild, Link to external file en Angular equation units, zoals het origineel.
- Syntaxis als het origineel: namen tussen dubbele aanhalingstekens (`"Width" = 80`, `"D1@Sketch1" = "Width" / 2`,
  `"D1@Boss-Extrude1" = "Width" * 0.1`), + - * / ^ ( ), sin/cos/tan/asin/acos/atan (graden), sqrt, abs, int, sgn, min,
  max, pi. Fouten (onbekende naam, cirkelverwijzing, deling door nul) staan rood in de kolom Evaluates to en worden bij
  rebuild genegeerd.
- Maatnamen volgen het origineel: `D1@Sketch1`, `D2@Sketch1` (volgorde van plaatsing), `D1@Boss-Extrude1` (diepte),
  `D1@Fillet1` (straal), `D1@Shell1` (dikte), `D1@Hole1` (diameter) …
- In de Modify-box begint een vergelijking met "=" (de box wordt dan een tekstveld); een gekoppelde maat toont het
  Σ-voorvoegsel in de schets. Zodra er vergelijkingen zijn, staat de map "Equations" in de FeatureManager (dubbelklik opent
  de dialoog). Vergelijkingen worden bij elke solve/rebuild toegepast, dus een gewijzigde globale variabele verandert het
  model direct; undo/redo werkt.
- Nog niet: Design Tables (Excel) en "Link to external file".

## Fase 4: Assemblies (2026-10-20, nacht)

- File ▸ New ▸ Assembly (ook in het Welcome-venster) maakt "Assem1" en opent meteen de PropertyManager **Insert
  Component** (Browse… kiest een .kcad-onderdeel; het eerste onderdeel staat (f) vast op de oorsprong, volgende
  instanties heten Plate<2>, … en komen naast de bestaande). Het onderdeel wordt in het assembly-bestand ingebed, dus
  een .kcad-assembly is op zichzelf compleet.
- CommandManager **Assembly**-tab: Insert Components, Mate, Linear Component Pattern, Smart Fasteners, Move Component
  (▾ Rotate Component), Show Hidden Components, Assembly Features, Reference Geometry, New Motion Study, Bill of
  Materials, Exploded View, Instant3D; rechts Edit Component, Large Assembly Settings, Interference Detection. Tabs
  voor een assembly: Assembly · Sketch · Markup · Evaluate · Render Tools · Add-Ins.
- **Mate** PropertyManager als het origineel: Mates/Analysis-tabs, Mate Selections (Face<2>@Plate<1>, …), Standard
  Mates (Coincident, Parallel, Perpendicular, Tangent, Concentric, Lock, Distance met waarde en Flip dimension, Angle),
  Mate alignment Aligned/Anti-Aligned, Advanced en Mechanical Mates (lijst), Mates, Options. Vlakke vlakken geven
  vlak-referenties, cilindervlakken een as (uit de facetvlakken gefit, met straal) — twee cilinders stellen automatisch
  Concentric voor. Solver: iteratief per mate; vaste componenten bewegen nooit.
- FeatureManager: Assem1 (Default) <Display State-1> ▸ History, Sensors, Annotations, Front/Top/Right Plane, Origin,
  (f) Plate<1>, (-) Plate<2> (met de features van het onderdeel), Mates ▸ Coincident1 (Plate<1>,Plate<2>).
  Contextmenu op een component: Fix/Float, Hide/Show, Move, Rotate, Mate…, nog een instantie, Delete; op een mate: Edit,
  Suppress, Delete.
- Move Component sleept een component in het schermvlak; de mates worden daarna opnieuw opgelost zodat alleen de vrije
  vrijheidsgraden overblijven (zoals het origineel). Rotate Component draait om het middelpunt.
- Evaluate: Mass Properties en Measure werken op de assembly; **Bill of Materials** (ITEM NO. / PART NUMBER /
  DESCRIPTION / QTY. / MASS) en **Interference Detection** (bounding boxes + CSG-doorsnede, volume per paar).
- Nog niet: component-patronen, Smart Fasteners, Exploded View, sub-assemblies, Edit Component in context, Advanced/
  Mechanical mates, Mate-referenties op randen/vertices.

## Fase 5: Tekeningen (2026-10-21, nacht)

- File ▸ New ▸ Drawing (ook in Welcome) opent eerst **Sheet Format/Size** zoals het origineel (Standard sheet size-lijst
  A…D (ANSI) en A0…A4 (ISO), Display sheet format, Custom sheet size, voorbeeld, Landscape/Portrait), daarna "Draw1" met
  de tabs View Layout · Annotation · Sketch · Markup · Evaluate · Sheet Format · Add-Ins en de PropertyManager **Model
  View** (Part/Assembly to Insert ▸ Browse…, daarna Reference Configuration, Orientation met de standaardaanzichten,
  Import Options, Display State, Display Style, Scale, Dimension Type). Na het plaatsen gaat het commando verder als
  **Projected View**: boven/onder/links/rechts van het basisaanzicht klikken plaatst de projectie, uitgelijnd op rij of
  kolom (derde-hoeksprojectie; ISO/DIN in Document Properties ▸ Drafting Standard geeft eerste-hoeksprojectie).
- Het blad: wit papier met rand, zonenummers/-letters en het standaard titelblok (UNLESS OTHERWISE SPECIFIED, DRAWN /
  CHK'D / APPV'D, MATERIAL, WEIGHT, TITLE, DWG NO., SCALE, SHEET 1 OF 1, REV); middenknop pant, wiel zoomt op de cursor,
  F = Zoom to Sheet; views verslepen (geprojecteerde views blijven uitgelijnd), Delete verwijdert een view (met zijn
  projecties). Zichtbare lijnen dik, verborgen lijnen gestreept (Display Style Hidden Lines Visible), silhouetten van
  cilinders; verborgen lijnen onder zichtbare lijnen worden niet getekend. Kern: `src/core/drawing/hlr.ts`
  (feature-randen + silhouetten, hidden line removal met BVH-raycasts per sample, samenvoegen per span).
- **Annotation**: Smart Dimension (rand → lengte horizontaal/verticaal/aligned naargelang de plaatsing, cirkel → Ø met
  leader; de waarde is de modelmaat, decimalen uit Document Properties ▸ Units), Center Mark, Note (tekst in de
  PropertyManager, klik om te plaatsen), Tables ▸ BOM. Dimension-PropertyManager met Value/Leaders/Other en
  Tolerance/Precision.
- FeatureManager: Draw1 ▸ Annotations, Sheet1 ▸ Sheet Format1, Drawing View1 ▸ Plate<1>, …; contextmenu Projected View /
  Delete; dubbelklik op Sheet1 = Sheet Properties (naam, schaal, projectietype, formaat). Statusbalk "Editing Sheet1".
- Nog niet: Section/Detail/Auxiliary/Broken-out views, Model Items, Balloons, Hole Callout, GD&T, Sheet Format
  bewerken, meerdere bladen, schaduw-weergave in views, export naar PDF/DXF (afdrukken via de printdialoog).

## Tools ▸ Options zoals het origineel (2026-10-20, nacht)

Bron: help.solidworks.com 2024, pagina's "System Options" en "Document Properties" (categorielijsten en per pagina de
opties). De dialoog (`src/app/options.tsx`, schema in `src/app/prefs.ts`) heeft dezelfde opbouw: titel volgt de pagina
("System Options - General", "Document Properties - Units"), tabbladen System Options / Document Properties, de
categorielijst links (General, MBD, Drawings ▸ Display Style / Area Hatch/Fill / Performance, Colors, Sketch ▸
Relations/Snaps, Display, Selection, Performance, Assemblies, External References, Default Templates, File Locations,
FeatureManager, Spin Box Increments, View, Backup/Recover, Touch, Hole Wizard/Toolbox, File Explorer, Search,
Collaboration, Messages/Errors/Warnings, Import, Export; Drafting Standard, Annotations, Dimensions, Virtual Sharps,
Tables, DimXpert, Detailing, Grid/Snap, Units, Model Display, Material Properties, Image Quality, Sheet Metal, Weldments,
Plane Display, Configurations, Mates, Performance), "Search Options" rechtsboven (filtert de lijst), Reset… (deze pagina
/ alles) linksonder, OK / Cancel / Help.

Opties die echt iets doen: View ▸ Arrow keys (draaistap), Reverse mouse wheel zoom direction, Zoom to fit when changing
to standard views; Colors ▸ Background Dark = donker thema; Display ▸ tangent edges As visible / As phantom (gestreept) /
Removed en Hidden edges Solid / Dashed (in Hidden Lines Visible); Sketch ▸ Display entity points; General ▸ Input
dimension value (Modify-box na het plaatsen van een maat) en Enable Confirmation Corner; FeatureManager ▸ Enable
FeatureManager tree filter; Spin Box Increments (Modify-box stappen, metrisch 10 mm / Engels 0,1 in / hoek 1°);
Document Properties ▸ Units (unit system, decimalen van de maten), Grid/Snap (Display grid, Automatic scaling, Major
grid spacing, Minor-lines per major). Systeemopties staan per gebruiker in localStorage (alleen afwijkingen van de
fabrieksinstellingen), documenteigenschappen in het .kcad-bestand (`properties`).

## Configuraties (ConfigurationManager) (2026-10-21)

Bron: playlist-video 19 (TooTallToby, SW 2024): ConfigurationManager-tab, Modify Configurations-tabel, per instantie in
de assembly een configuratie, massa van drie platen in drie configuraties. Kern in `src/core/document/configurations.ts`:
een document heeft minstens de configuratie "Default"; elke configuratie bewaart de maatwaarden (D1@Sketch1,
D1@Boss-Extrude1 ...) en welke features onderdrukt zijn. Het document bevat altijd de waarden van de ACTIEVE configuratie;
bij "Show Configuration" worden de huidige waarden in de oude configuratie vastgelegd en die van de nieuwe toegepast
(daarna opnieuw oplossen en rebuild).

- ConfigurationManager (derde tab van het manager-paneel): "Part1 Configuration(s) (Default)" ▸ "✓ Default [ Part1 ]",
  "210 [ Part1 ]", map Tables; dubbelklik = Show Configuration; RMB op het topknooppunt: Add Configuration…, Modify
  Configurations…, Document Properties…; RMB op een configuratie: Show Configuration, Add Derived Configuration (grijs),
  Delete, Properties…, Rename tree item.
- Add Configuration / Configuration Properties PropertyManager: Configuration name, Description, Use in bill of
  materials, Comment; Bill of Materials Options; Advanced Options. Een nieuwe configuratie is een kopie van de actieve en
  wordt meteen getoond.
- Modify Configurations (Configure Dimension via RMB op een maat in de schets, Configure Feature via RMB op een feature
  in de tree, of Modify Configurations… in de ConfigurationManager): tabel Configuration Name x kolomgroep per schets of
  feature ("Boss-Extrude1 ▾" ▸ D1, of ▸ Suppress), rij "< Creates a new configuration. >", OK / Cancel / Apply / Help;
  extra kolommen via "Add dimension…" / "Add feature…".
- Modify-box: bij meer dan één configuratie de keuze This Configuration / All Configurations / Specify Configuration(s).
- Assembly: elke instantie toont de gekozen configuratie van het onderdeel ("(f) Part1<1> (210)"), te kiezen in het
  RMB-menu van de component; de rebuild gebruikt per (onderdeel, configuratie) een gecachet document. Mass Properties telt
  alle componenten op (eigen materiaal per onderdeel, traagheid via de parallelle-assenstelling); de BOM krijgt een rij
  per onderdeel én configuratie. Het topknooppunt van de tree en het Mass Properties-rapport noemen de actieve configuratie.
- Opslag: `configurations` en `activeConfiguration` in het .kcad-bestand; `e2e/configurations.mjs` (25 checks).

## Rib (video 10) (2026-10-21)

Features ▸ Rib (`src/core/features/rib.ts`): een open schets (lijn, boog of ketting) op een vlak wordt een wand die
vanaf de schets groeit tot hij het lichaam raakt. De uiteinden van de schets worden automatisch tot het lichaam
verlengd (ray-casts tegen een BVH van het lichaam in schetscoördinaten) en de verre zijde volgt het oppervlak van het
lichaam (één ray per sample langs de schets), zodat de rib nergens door een plaat heen steekt. PropertyManager als het
origineel: Parameters ▸ Thickness (First Side / Both Sides / Second Side), dikte, Extrusion direction (Parallel to Sketch
/ Normal to Sketch), Flip material side, draft (opgeslagen, nog niet op de mesh), Selected Contours; gele preview;
Rib1 in de tree met de schets eronder; D1@Rib1 in Equations.

## Eindcondities Up To Next / Up To Surface / Offset From Surface (video 40) (2026-10-21)

Direction 1 van Boss-Extrude / Cut-Extrude kent nu Blind, Through All, Up To Next, Up To Surface, Offset From Surface en
Mid Plane (de lijst van het origineel; Up To Vertex en Up To Body volgen zodra hoekpunten selecteerbaar zijn). Up To Next
schiet een straal vanuit het midden van het profiel langs de extrusierichting en stopt bij het eerste vlak van het
lichaam. Up To Surface / Offset From Surface vragen een vlak in het beeld (selectievak "Face<1>" in de PM): de extrusie
loopt door en wordt gesneden met de halfruimte van dat vlak (verschoven met de offset; "Reverse offset" zet hem voorbij
het vlak), zodat ook schuine vlakken werken. De gele preview rekent tegen het lichaam zoals het vóór de feature is.

## Multi-body (video's 11, 44, 45, 52) (2026-10-21)

De rebuild (`src/core/features/rebuild.ts`) werkt nu met meerdere solid bodies zoals het origineel: "Merge result" uit
houdt nieuw materiaal als aparte body; een boss die geen bestaande body raakt wordt vanzelf een nieuwe body; raakt hij
meerdere bodies, dan versmelten die. Cuts, Hole Wizard en patronen werken op de bodies die ze raken (Auto-select) of op
de Feature Scope (All bodies / Selected bodies in de PM). Verborgen bodies (Solid Bodies ▸ RMB ▸ Hide Body) worden niet
getekend en doen niet mee aan Merge result. Fillet/Chamfer vinden de body van de gekozen randen, Shell de body van het
gekozen vlak. Combine (Insert ▸ Features ▸ Combine…, of RMB op een body) voegt samen, trekt af (Main Body) of houdt het
gemeenschappelijke deel. Per body kan een materiaal gekozen worden (RMB ▸ Material…): de naam staat achter de body in de
tree, de kleur in het beeld, de dichtheid telt in Mass Properties en de sensors. De bodies heten naar hun laatste
feature (Boss-Extrude1, Combine1 …), ids body1, body2 … in volgorde van ontstaan.

## Sheet metal, basis (video 16 e.a.) (2026-10-21)

`src/core/features/sheetmetal.ts`: een part wordt plaatwerk met de eerste Base Flange (Sheet-Metal1 met dikte T1,
buigradius en K-factor in de tree, Flat-Pattern1 onderaan en onderdrukt). Base Flange/Tab: een open schets wordt een
wand van de plaatdikte met op elke hoek een buiging (binnenradius r, buitenradius r + t), Blind of Mid Plane; een
gesloten schets wordt een platte tab. Edge Flange: klik een rechte rand van de plaat, hoek (90°), lengte (Outer Virtual
Sharp / Inner Virtual Sharp / Tangent Bend), Flange Position (Material Inside / Material Outside / Bend Outside), Flip;
de flens is een profiel (buiging + been) langs de rand geëxtrudeerd en met de plaat versmolten. Flatten (of Flat-Pattern1
unsuppress) toont de ontwikkelde plaat: lengte = rechte stukken − 2 × setback + bend allowance per buiging (K-factor), plus
been + bend allowance per edge flange. De PM's volgen de indeling van het origineel.

## Section View (2026-10-21)

De Section View-knop van de Heads-up View toolbar opent de PM van het origineel (Section Method, Section Options,
Section 1 met Front/Top/Right, Offset distance en Flip Direction). Tijdens het instellen en na OK wordt het model
getoond als doorsnede: elke body wordt met de halfruimte van het vlak gesneden (CSG, dus met een dicht snijvlak als
"section cap"); het echte model blijft ongewijzigd voor massa, meten en selectie. De knop blijft actief; nog een klik
zet de doorsnede uit.

## Schetsgereedschappen (2026-10-21)

`src/core/sketch/edit.ts` levert de bewerkingen van de Sketch-tab als zuivere functies op het schetsmodel: Trim
Entities (Trim to closest: het aangeklikte stuk tot de dichtstbijzijnde snijpunten verdwijnt; een cirkel wordt een boog),
Sketch Fillet (twee lijnen in een hoek → raakboog met twee tangent-relaties), Offset Entities (lijnen met verstek op de
hoeken, bogen en cirkels concentrisch, splines per punt; Reverse en Offset geometry als constructie), Linear en Circular
Sketch Pattern, Move/Copy/Rotate/Scale Entities en Convert Entities (geselecteerde modelranden of een vlak worden op het
schetsvlak geprojecteerd en als lijn, cirkel, boog of spline toegevoegd). In de schets kan een modelrand aangeklikt worden
zolang er geen schetsentiteit onder de muis ligt. De PM's volgen de secties van het origineel; bij Offset, Move/Copy/
Rotate/Scale en de patronen past OK de bewerking toe. Verder: Sketch Chamfer (Distance-distance, Equal distance), Extend
Entities (het aangeklikte uiteinde van een lijn tot de volgende entiteit) en Edit Appearance (Render Tools of RMB op een
body: kleur voor het part of één body met swatches en RGB-kiezer; de kleur gaat vóór de materiaalkleur). Bij Fillet en
Chamfer verliest het hoekpunt zijn eigen relaties (bijv. coincident met de oorsprong), zoals het hoekpunt verdwijnt.

## Helix and Spiral (video 17, candy stripe) (2026-10-21)

Curves ▸ Helix and Spiral (`helixPath` in `src/core/features/sweep.ts`): op een schets met een cirkel ontstaat een
helix rond de schetsnormaal, bepaald door Pitch and Revolution, Height and Revolution of Height and Pitch, met start
angle, Reverse direction en Clockwise/Counterclockwise. De helix is een referentiecurve (donkerblauw) en staat als
Helix/Spiral1 in de tree; Swept Boss/Base en Swept Cut nemen hem als Path (profiel op het beginpunt), zodat veren en
schroefdraad gemaakt kunnen worden.

## Hem, Up To Vertex, Exploded View (2026-10-21)

Hem (Sheet Metal-tab): een rechte rand vouwt 180° terug over de plaat, Closed of Open (gap), lengte, Reverse, Material
Inside (de plaat wordt eerst met r + t ingekort) of Bend Outside; telt mee in de flat pattern. Edge Flange met Material
Inside kort de plaat nu ook echt in. Extrude ▸ Up To Vertex: klik een hoekpunt van het model; de diepte is de afstand
tot dat punt langs de schetsnormaal. Assembly ▸ Exploded View: Explode-PM met stappen (componenten klikken, richting
X/Y/Z, afstand, Add Step), live voorbeeld, ExplView1 in de ConfigurationManager met Explode/Collapse; de echte posities
blijven ongewijzigd (alleen de weergave verschuift).

## RealView Graphics en schaduwen (2026-10-21)

View Settings (heads-up toolbar) ▸ RealView Graphics zet physically based materialen aan met een studio-omgeving
(RoomEnvironment, ACES-tone mapping): metalen (dichtheid > 2500 kg/m³) reflecteren, hout krijgt een naadloze
procedurele nerf (box-projectie), andere materialen zijn mat. Shadows In Shaded Mode legt een vloer onder het model
die alleen de schaduw van het bovenlicht ontvangt. Het voorbeeld voorbeelden/deurkruk (e2e/doorhandle.mjs) toont het.

## Voorbeeld Deurkruk, explode lines, tekening (2026-10-21)

`e2e/doorhandle.mjs` bouwt met de eigen modelkern het voorbeeld voorbeelden/deurkruk/: Deur (eiken, doornmaat 70,
PC 72), Rozet en Sleutelrozet (revolve, sleutelgat), Vierkantstift, Kruk (gedraaide hals, sweep-hendel met bolle kop),
de assembly Deurkruk met 14 mates en een exploded view (met explode-lijnen), en de tekening Kruk-tekening (vier
aanzichten, maten, notities; materiaal en gewicht in het titelblok). De HLR-silhouetten splitsen open meshranden op
T-knooppunten, zodat gebogen buizen in aanzichten volledig getekend worden.

## Sneltoetsen en muis (officiële lijst)

Bron: help.solidworks.com 2018 ▸ "Selected Keyboard Shortcuts" en de lijst "commonly-used shortcuts" (2015), aangevuld
met de Visiativ-lijst voor Ctrl+1…8, G, R, Shift+C, D, L. Doorgevoerd: pijltjestoetsen draaien 15° (Shift 90°, Alt
rollen, Ctrl pannen), Alt+middenknop rollen, Shift+middenknop zoomen om het schermcentrum, dubbelklik middenknop Zoom
to Fit, wiel zoomt op de cursor (naar je toe = inzoomen, omkeerbaar), Ctrl tijdens schetsen = geen automatische
relaties, R = recente documenten, Ctrl+B/Ctrl+Q rebuild, Ctrl+R redraw, F9 FeatureManager, F11 schermvullend. De
eerder zelf bedachte lettertoetsen (C, A, N, P, M, X, R voor rechthoek) zijn verwijderd; het origineel kent alleen L.
