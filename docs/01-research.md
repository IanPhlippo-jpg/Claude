# Onderzoek: workflow en lay-out van moderne parametrische CAD

Datum: 2026-10-20. Bronnen: officiële help van SolidWorks, Onshape en Autodesk Fusion,
de PlaneGCS-documentatie (FreeCAD-solver), blogs van SolidWorks-resellers.
Doel: vastleggen welke conventies gebruikers van industriestandaard CAD verwachten,
zodat de app (werknaam **Kalibr CAD**) herkenbaar aanvoelt zonder merknamen, logo's of iconen te kopiëren.

## 1. Globale schermindeling (alle drie de pakketten komen overeen)

| Zone | SolidWorks | Onshape | Fusion | Kalibr-beslissing |
|---|---|---|---|---|
| Boven | Menubalk + CommandManager met tabs (Sketch, Features, Surfaces, Evaluate…) | Feature-/Sketch-/Assembly-toolbar die wisselt met context | Toolbar met tabs (Solid, Surface, Mesh, Sheet Metal…) | Ribbon met tabs **Sketch, Features, Assembly, Drawing, Evaluate**; tab wisselt automatisch mee met context |
| Links | FeatureManager design tree; PropertyManager vervangt de tree tijdens bewerken (flyout-tree beschikbaar) | Feature list (links), feature-dialog verschijnt boven de lijst | Browser (links), dialoog zweeft rechts | Feature tree links; **Property Manager** schuift over de tree bij bewerken, met inklapbare flyout-tree |
| Midden | Graphics area met heads-up view toolbar bovenaan, view-triade linksonder | Graphics area met view cube rechtsboven | Viewport met ViewCube rechtsboven, navigatiebalk onderaan | Viewport met **view cube rechtsboven**, **oriëntatietriade linksonder**, heads-up toolbar boven in de viewport |
| Onder | Statusbalk: sketch-status, coördinaten, eenheden, waarschuwingen | Statusindicatoren in feature list | Statusbalk met timeline (feature history) | **Statusbalk**: sketch-status (DOF), cursorcoördinaten, eenheden, solver-tijd, meldingen |
| Rechts | Task Pane (bibliotheek, appearances) | — | Data panel | Dockable panels (materiaal, variabelen, bibliotheek) in latere fases |

Bronnen: SolidWorks 2026 UI-overzicht (Menu Bar, CommandManager, PropertyManager, Task Pane,
Graphics Area, Heads-up View Toolbar, Selection Breadcrumbs, FeatureManager Design Tree, Status Bar);
Onshape Sketch Tools / View navigation; Fusion Sketch Constraints.

## 2. Sketch-workflow

1. Gebruiker kiest een vlak (Front/Top/Right of een vlakke face) en start een sketch. De camera draait "normal to" het vlak.
2. Schetsgereedschappen: lijn, hoek-rechthoek, centrum-rechthoek, cirkel (centrum / 3 punten), boog (tangent / 3 punten / centrum), spline, punt, constructie-geometrie (Onshape, SolidWorks).
3. Tijdens tekenen worden **automatische relaties** afgeleid (inference): horizontaal/verticaal, coincident op eindpunten, tangent bij bogen. Een gele icoon-hint toont de relatie vóór de klik (SolidWorks, Fusion "auto-constraints").
4. Relaties achteraf: selecteer entiteiten, kies relatie in het Property Manager-paneel of contextmenu. Alleen relaties die op de selectie passen worden aangeboden.
5. **Smart Dimension**: één gereedschap voor lengte, afstand, hoek, radius en diameter, afhankelijk van wat geselecteerd wordt. Klikken plaatst de maat, een invoerveld verschijnt direct.
6. **Status-kleuren** (SolidWorks-conventie, Onshape vergelijkbaar): blauw = onderbepaald (kan nog slepen), zwart = volledig bepaald, rood = overbepaald, geel = ongeldig, roze = onoplosbaar. Status ook in de statusbalk.
7. Slepen van blauwe geometrie is de aanbevolen manier om ontbrekende relaties te vinden.
8. Exit sketch → feature-dialoog (Extrude/Revolve) gebruikt automatisch de gesloten profielen (Onshape).

### Relaties / constraints die verwacht worden
Horizontal, Vertical, Coincident, Tangent, Equal, Symmetric, Parallel, Perpendicular, Concentric,
Collinear, Midpoint, Fix. (Fusion-lijst, SolidWorks "Add Relations"-paneel.)

### Dimensies
Afstand punt-punt, horizontale/verticale afstand, afstand punt-lijn, lengte, radius, diameter, hoek.
Dimensies zijn "driving" of "driven" (referentiemaat). Bij overbepaling biedt SolidWorks aan de nieuwe maat driven te maken.

## 3. Constraint-solver

- FreeCAD/PlaneGCS: primitieven (punt, lijn, cirkel, boog, ellips) met parameters; constraints zijn vergelijkingen in die parameters.
- Numerieke optimalisatie: DogLeg (standaard), Levenberg-Marquardt (fallback), BFGS; SQP bij tijdelijke (drag-)constraints.
- Vrijheidsgraden (DOF) = aantal parameters − rang van de Jacobiaan. Redundante constraints = lineair afhankelijke rijen van de Jacobiaan; conflicterende constraints = residu blijft na convergentie > tolerantie.
- Kalibr-keuze: eigen TypeScript-solver (Levenberg-Marquardt met numerieke/analytische Jacobiaan, rang-analyse via RREF voor DOF, per-parameter "vrij/vast" via nulruimte). Geen LGPL-afhankelijkheid; draait synchroon tijdens slepen en in een web worker voor volledige herberekeningen.

## 4. Navigatie en sneltoetsen (conventies)

- View cube: zijvlakken = orthografische aanzichten, hoeken = isometrisch/trimetrisch, pijlen = 15°-stappen (Onshape). 
- Muis: middelste knop slepen = roteren (SolidWorks) / rechtermuis slepen (Onshape); Ctrl+middel = pannen; wiel = zoom op cursor.
- SolidWorks: **S** opent contextgevoelige shortcutbalk, **spatie** opent oriëntatiemenu, **Ctrl+1..8** standaardaanzichten (Ctrl+7 isometrisch, Ctrl+8 normal-to), **F** zoom to fit, **Esc** annuleert, **Enter** herhaalt laatste commando.
- Fusion: L lijn, R rechthoek, C cirkel, D dimensie, X constructie, Q push/pull.
- Kalibr-set: L lijn, R rechthoek, C cirkel, A boog, N spline, P punt, X constructie-toggle, D smart dimension, Esc annuleren, Ctrl+Z/Ctrl+Y undo/redo, F zoom fit, Ctrl+1..8 aanzichten, spatie oriëntatiemenu, S shortcutbalk, Delete verwijderen, Ctrl+S opslaan.

## 5. Feature-modelleren (fase 2, ter voorbereiding)

- Feature-history (tree) is lineair en herafspeelbaar; rollback-balk kan naar elk punt. Bewerken = feature opnieuw openen in Property Manager en regenereren van alles daarna.
- B-rep-kernel in de browser: OpenCascade.js (WASM, v1.1.1 stabiel, beta-API wijkt af); alternatieven occt-wasm (kleiner) en @bitbybit-dev/occt-worker (worker-wrapper). Keuze: OpenCascade.js in een dedicated web worker, meshing naar Three.js BufferGeometry.

## 6. UI-componenten

21st.dev / Magic MCP is in deze omgeving **niet beschikbaar** (geen connector). Daarom is een eigen, consistente componentenset gebouwd
(`src/ui/`): Panel, Toolbar, RibbonTab, Dropdown, Dialog, TreeView, Tabs, Tooltip, Toggle, NumberField, met design-tokens voor light/dark.
Iconen: eigen lijn-iconenset (`src/ui/icons.tsx`), 16 px grid, stroke 1.5.

## 7. Bronnen

- https://help.solidworks.com/2026/english/SolidWorks/sldworks/c_user_interface_overview.htm
- https://help.solidworks.com/2018/English/SolidWorks/acadhelp/c_Sketch_States_AcadHelp.htm
- https://www.javelin-tech.com/blog/2023/10/default-solidworks-keyboard-shortcuts/
- https://hawkridgesys.com/blog/solidworks-useful-keyboard-shortcuts-workflow-customizations
- https://cad.onshape.com/help/Content/sketch-tools.htm
- https://cad.onshape.com/help/Content/View/view_navigation_and_the_view_cube.htm
- https://cad.onshape.com/help/Content/Primer/viewing_and_selecting.htm
- https://help.autodesk.com/cloudhelp/ENU/Fusion-Sketch/files/SKT-CONSTRAINTS.htm
- https://www.autodesk.com/products/fusion-360/blog/mastering-sketch-constraints-autodesk-fusion-tutorial/
- https://cdn.jsdelivr.net/npm/@salusoft89/planegcs@1.1.7/README.md
- https://planegcs.readthedocs.io/en/stable/
- https://ocjs.org/docs/about
