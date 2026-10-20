# Vergelijking met de SOLIDWORKS-handleiding en aanpassingen

Bron: de door de gebruiker aangereikte handleiding *Introducing SOLIDWORKS* (my.solidworks.com) is vanuit deze
omgeving geblokkeerd (HTTP 403 door het CDN van SOLIDWORKS, archiefkopie breekt af). Als vervanging zijn de
officiële-interface-hoofdstukken uit *SOLIDWORKS 2025 Quick Start* en *SOLIDWORKS 2023 Tutorial* (SDC Publications,
voorbeeldhoofdstuk "Overview of SOLIDWORKS and the User Interface", met schermafbeeldingen) gebruikt; die beschrijven
dezelfde interface-elementen (Menu bar, CommandManager, FeatureManager, PropertyManager, Heads-up View toolbar,
Confirmation Corner, Task Pane, System feedback icons, Context toolbars, muisgedrag) als de handleiding.

| # | Handleiding (SOLIDWORKS) | Phlippo vóór | Aanpassing |
|---|---|---|---|
| 1 | **Menu bar** = menu (File, Edit, View, Insert, Tools, Window, Help) + Menu-bar-toolbar met Nieuw, Openen, Opslaan, Printen, Undo, Redo, Select, Rebuild, Opties, Help; zoekveld rechtsboven | Logo + 3 menu's + thema-knop | Menu bar met 7 menu's, toolbar-iconen, zoekveld, Help (?) |
| 2 | **CommandManager**: grote knoppen met tekst, *tab-strip onder de knoppen* (Features · Sketch · Markup · Evaluate · MBD Dimensions · …), consolidated fly-outs (Rechthoek ▾, Cirkel ▾, Boog ▾), inklappen/pin | Tabs boven de knoppen, geen fly-outs | Tab-strip onder de knoppen, fly-out-groepen, extra tools (Polygoon, Centerline, Mirror, Trim/Offset/Convert als fase-2-placeholders), Evaluate-tab, inklap-pin |
| 3 | **FeatureManager-paneel** met tabs (design tree, PropertyManager, ConfigurationManager, DimXpert, DisplayManager), filterveld, items *History, Sensors, Annotations, Material, Front Plane, Top Plane, Right Plane, Origin, features*; **rollback-balk** = sleepbare horizontale lijn in de tree; PropertyManager vervangt de tree tijdens een commando (fly-out tree beschikbaar); hide/show-pijl | Tree met map "Referentievlakken", losse Property-Manager-panel, rollback als slider | Eén Manager-paneel met tabs, filter, SOLIDWORKS-itemstructuur, sleepbare rollback-lijn, PropertyManager over de tree met fly-out tree, inklap-pijl |
| 4 | **Heads-up View toolbar** (transparant, bovenaan midden): Zoom to Fit, Zoom to Area, Previous View, Section View, View Orientation ▾ (Top/Left/Front/Right/Back/Bottom, Iso/Di/Trimetric, Normal To, 1/2/4 viewports, View Selector), Display Style ▾, Hide/Show Items ▾, Edit Appearance, Apply Scene, View Settings ▾ | 4 knoppen (fit, normal to, raster, relaties) | Volledige heads-up toolbar met dropdowns; Section/Appearance/Scene zichtbaar maar uitgeschakeld tot fase 2/7 |
| 5 | **Confirmation Corner** rechtsboven in het grafische venster: in schets = schetsicoon (afsluiten & bewaren) + rode X (annuleren); bij commando's = groen vinkje + rode X; toets **D** verplaatst OK/Cancel naar de cursor | Afsluiten via vinkje in paneelkop | Confirmation Corner toegevoegd; D-toets verplaatst OK/Cancel naar de cursor |
| 6 | **Triade** linksonder met naam van de view (\*Isometric, \*Front …) | Triade zonder naam | Viewnaam naast de triade; \* verdwijnt zodra de view geroteerd is |
| 7 | **Task Pane** rechts als verticale iconenstrip (Design Library, File Explorer, View Palette, Appearances/Scenes, Custom Properties, Resources) | Geen | Task Pane-strip met uitklapbaar paneel (Bibliotheek, Relaties, Eigenschappen, Help/sneltoetsen) |
| 8 | **Statusbalk**: "Editing Part / Editing Sketch1", schetsstatus, coördinaten, eenheden-dropdown (MKS, CGS, MMGS, IPS, Edit Document Units…) | Status, coördinaten, eenheid als tekst | "Bewerken: Part/Schets", eenhedenstelsel-dropdown (MKS/CGS/MMGS/IPS) |
| 9 | **Spatie** = Orientation-dialoog (raster van view-knoppen, New View, View Selector-schakelaar); **Ctrl+Spatie** = View Selector (kubus in context rond het model); geen permanente view cube | Permanente view cube rechtsboven (Onshape-stijl) | Orientation-dialoog met view-raster; View Selector-kubus alleen op Ctrl+Spatie / schakelaar; permanente kubus uit |
| 10 | **Oorsprong** als blauw assenpaar in het midden; schetsoorsprong rood | Zwart punt | Oorsprong-glyph (blauw in part, rood in schets) |
| 11 | **Muis**: middelste knop = roteren (ook in schets), Ctrl+middel = pannen, Shift+middel = zoomen, wiel = zoom (naar je toe = inzoomen, instelbaar), rechtsklik = contextmenu met context-toolbar | Middel = pannen, rechts-slepen = pannen, geen contextmenu | SOLIDWORKS-muisgedrag; rechtsklik-contextmenu met context-toolbar; optie "wielrichting omkeren" |
| 12 | **System feedback icons**: symbool naast de cursor (vertex, edge, face, dimension…) | Geen | Cursor-badge voor punt / lijn / boog / cirkel / spline / maat / vlak |
| 13 | **Schets starten**: klik *Sketch* → kies een vlak in het grafische venster (vlakken worden getoond met naam) of in de tree | Start direct op het voorvlak | "Kies een vlak"-modus: de drie referentievlakken worden getekend met label; klik om te starten; vlak licht op bij hover in de tree |
| 14 | Na het plaatsen van een maat verschijnt de **Modify**-dialoog bij de cursor (waarde, spinner, OK/Cancel/Rebuild/Reset) | Invoer in het Property-Manager-paneel | Modify-popup bij de maat (ook bij dubbelklik op een maat); PropertyManager blijft als alternatief |
| 15 | Relatie-iconen in groene kaders naast de geometrie | Grijze kaders | Groene kaders |
| 16 | **Nieuw document**-dialoog (Part / Assembly / Drawing) en **Welcome**-dialoog bij opstarten | Direct een leeg part | Nieuw-dialoog en Welcome-dialoog (Part actief; Assembly/Drawing volgen in fase 4/5) |
| 17 | Sneltoetsen: F = zoom to fit, Z / Shift+Z = uit-/inzoomen, Spatie = Orientation, Ctrl+Spatie = View Selector, S = shortcut bar, D = OK/Cancel naar cursor, Enter = laatste commando herhalen, Ctrl+1…8 views, Shift+C = tree inklappen | D = Smart Dimension, Enter = spline afsluiten | Toetsen zoals de handleiding; Smart Dimension op **M**; spline afsluiten met dubbelklik/Esc |

Niet overgenomen (bewust): 3DEXPERIENCE-tabbladen, MBD Dimensions, Markup, CAM-tabs (niet in scope), merknamen/iconen (eigen set).

## Kleuren (tweede ronde)

De gebruiker meldde dat de kleuren nog niet overeenkwamen. Aangepast naar de standaardkleuren van desktop-CAD
(bron: SOLIDWORKS-help *Background Color* / *Sketch States*, en de schermafbeeldingen in de voorbeeldhoofdstukken):

| Element | SOLIDWORKS-standaard | Phlippo (licht thema) |
|---|---|---|
| Venster/chrome | wit en lichtgrijs (Windows-stijl), blauwe selectie | `#ffffff` panelen, `#f0f0f0` app, `#f3f3f3` koppen, selectie `#cce4f7`, accent `#1a73c7` |
| Iconen | donkergrijs met blauwe accenten | `--icon: #4b5563`, actief blauw |
| Grafisch venster | lichte gradient | `#f4f6f9` → `#c9ced6` radiale gradient |
| Schets onderbepaald | blauw | `#0000ff` |
| Schets volledig bepaald | zwart | `#000000` |
| Schets overbepaald / conflict | rood | `#ff0000` |
| Geselecteerd | lichtblauw | `#19a9ff` |
| Dynamic highlight (hover) | oranje | `#ff8c00` |
| Maten | zwart (driven: grijs) | `#000000` |
| Relatie-iconen | groene kaders | `#cfeadb` |
| Schetsoorsprong | rood assenpaar | `--sk-origin-sketch: #ff0000` |
| Part-oorsprong | blauw assenpaar | `--sk-origin-part: #1e4fd8` |
| Referentievlakken | transparant blauwgrijs | `--sk-plane: #4f7fc8` (8 % vulling, 22 % bij hover) |
| Raster | standaard uit (Options ▸ Grid/Snaps) | standaard uit; aan via Hide/Show Items of Opties |
| Aslijnen | geen (alleen oorsprong) | alleen samen met het raster |

Het donkere thema blijft beschikbaar (Ctrl+Shift+D) als extra; SOLIDWORKS zelf heeft geen donkere modus.

## Naam en logo

Op verzoek hernoemd van Kalibr CAD naar **Phlippo CAD**. Nieuw logo: afgeronde donkerblauwe tegel met een witte "P"
en een oranje solver-punt (`public/logo.svg`, `Icon.Logo` in `src/ui/icons.tsx`). Bestandsextensie blijft `.kcad`;
autosave-sleutels zijn `phlippo.*`.

## YouTube-video's

Gevraagd is om YouTube-video's als referentie te gebruiken. Vanuit deze omgeving zijn YouTube-pagina's niet
bereikbaar (Google blokkeert met een captcha-redirect; transcripts zijn niet op te halen). Gevonden en relevant
voor een eigen check door de gebruiker:

- SolidWorks 2025 Basic Tutorial – User Interface – Sketch – Extrusion (lucmartz): https://www.youtube.com/watch?v=5Uwd3XEIAzA
- E1 SolidWorks 2025 – Basic Modeling for Beginners: https://www.youtube.com/watch?v=2sSgkW0MhBw
- User Interface Basics in SOLIDWORKS (Hawk Ridge): https://www.youtube.com/watch?v=Ui9CJnrarAE
- SolidWorks Bootcamp 2025, dag 1 (interface en navigatie): https://www.youtube.com/watch?v=Iaqo-2F2Cdk
- Sketch Tips: Dimensions and Relationships: https://www.youtube.com/watch?v=FTP4B7kxY7o
- Introduction to Sketch and Relations (2022): https://www.youtube.com/watch?v=nqBNlXrC63o

De aanpassingen zijn daarom gebaseerd op de schermafbeeldingen en teksten uit de handleiding-equivalenten
(SOLIDWORKS 2025 Quick Start / 2023 Tutorial, hoofdstuk "Overview of SOLIDWORKS and the User Interface") en de
officiële help. Als een video een afwijking laat zien, graag het tijdstip en de video doorgeven; dan pas ik het aan.

## Derde ronde: afstemming op de YouTube-video's

Gebruiker gaf twee video's op: *SOLIDWORKS 2026 Beginner Tutorial* (Design Forge, `jhaPTx056vI`) en
*What's New in SOLIDWORKS 2026 – Top 10* (Hawk Ridge Systems, `7XTMxQEkgko`). YouTube-pagina's en ondertitels zijn vanuit deze
omgeving geblokkeerd (bot-check, HTTP 429), maar de **storyboard-frames** (160×90-voorbeelden over de hele looptijd) en de
thumbnails konden wel worden opgehaald. Daaruit en uit de voorbeeldhoofdstukken is overgenomen:

| Waargenomen in de video's | Aanpassing |
|---|---|
| Vrijwel wit grafisch venster met zachte grijze gradient | `--bg-viewport: #ffffff` → `#dfe3e8` |
| Gesloten schetscontouren lichtgrijs gearceerd (*Shaded Sketch Contours*) | Contour-detectie (`src/core/sketch/contours.ts`, halfkant-wandeling incl. bogen en losse uitlopers) + arcering in de viewport; knop in de Sketch-tab |
| Titelregel "SOLIDWORKS Design ›" met uitklapbaar menu, menu-bar-toolbar met ▾-pijlen, login/help/venster-knoppen | Menu bar herbouwd: "PhlippoCAD Design ›", menu's verschijnen bij hover (pin houdt ze vast), Open▾/Save▾/Undo▾/Select▾/Options▾, login, Help▾, —/☐/✕ |
| CommandManager met Engelse commandonamen, sketch-entiteiten als 2×6 iconenraster met fly-outs, tabs Features · Sketch · Markup · Evaluate · MBD Dimensions · Add-Ins | CommandManager herbouwd met dezelfde indeling en namen; tab-strip lichtgrijs met witte actieve tab |
| Smalle witte FeatureManager met tab-iconen (tree, PropertyManager, ConfigurationManager, DimXpert, DisplayManager), Solid Bodies-map | Tab-iconen uitgebreid, "Solid Bodies" toegevoegd, kleuraccenten op vlak-/origin-/schets-iconen |
| "Model \| Motion Study 1"-tabs onder het grafische venster | Toegevoegd |
| Welcome-dialoog met Home/Recent/Learn/Alerts, grote Part/Assembly/Drawing/Open-tegels | Herbouwd |
| Volledig Engelse UI (commandonamen zoals in het origineel) | Alle UI-teksten naar Engels; documentatie blijft Nederlands |

Screenshots staan in `docs/screenshots/`.
