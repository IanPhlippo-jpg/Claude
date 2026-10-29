# 26 — Strenge zelfcontrole 1-op-1 (2026-10-29)

Referentie: de hoofdvideo (SOLIDWORKS Design 2026, 1920x1080, `referentie-video/frames`), aangevuld met video 01 (2025),
02 en 48 (2026). Phlippo vastgelegd in dezelfde toestanden met `e2e/tools/audit-shots.mjs` (audit-NN-*.png).
Vergelijking per uitsnede, vergroot, naast elkaar; kleuren gemeten in de frames.

## Gevonden en opgelost

| Gebied | Verschil | Nu |
|---|---|---|
| Kleuren vensterrand | Titelbalk, lint, boom, PM en statusbalk wit (255) of #f3f3f3 | #f7f7f7 zoals gemeten (247) |
| Lint-tabs | Vlak, geen kaders | Grijze vakjes (#d4d4d4), actief licht en vet |
| Tabrij | Eigen balk boven het grafische venster | Het venster loopt onder de tabs door; heads-up-werkbalk en vensterknoppen op dezelfde rij (bij een smal venster zakt de werkbalk eronder) |
| Snelle toegang (3x3) | Kolom per kolom (Home, Save, Undo onder elkaar) | Rij per rij: Home Save Undo / New Rebuild Redo / Open Options Select |
| Pictogrammen snelle toegang | Blauwe diskette, groene vink voor Rebuild, zonnetje voor Options, oranje map | Leisteen/teal lijnwerk, verkeerslicht voor Rebuild, tandwiel, map met pijl |
| Schetspictogrammen | Lichtblauw, dun | Donker teal, dikker |
| Schetsraster | Kolom 2: Arc Slot; kolom 3: Arc; kolom 4: Fillet | Circle/Arc/Polygon, Spline/Ellipse/Fillet, Plane/Text/Point; Arc-knop start als Centerpoint Arc |
| Schets-tab buiten een schets | Trim en Offset aan, Convert uit, Offset On Surface uit, Quick Snaps uit, Shaded Contours ingedrukt | Zoals SW: Trim/Offset/patronen uit, Convert/Offset On Surface/Quick Snaps aan, contouren pas ingedrukt in een schets |
| Lint tijdens Modify of PM | Bleef bruikbaar | Grijs (ook schetsraster en snelle toegang, behalve New/Options) |
| Grote lintknoppen | Breder dan nodig, afgeronde hoeken | Zo breed als het label, vierkant ingedrukt |
| PM-sectiekoppen | 12,5 px halfvet grijs, ingesprongen | 11 px vet donkergrijs, links uitgelijnd, zwaardere chevrons |
| PM-velden | 26 px hoog, keuzelijst gecentreerd met dikke pijl | 21 px, tekst links, dunne chevron |
| PM-vinkjes | Tegen de linkerrand | Na de pictogramkolom |
| Rechthoek-PM | Rood kruis, Options-sectie vóór het tekenen, blauwe keuzeknop, parameters in 2 kolommen, geen puntnummers | Alleen het vinkje, geen Options, grijze keuzeknop, 8 rijen met puntpictogram, genummerde type-pictogrammen |
| Schetsgereedschap-PM's | Rood kruis | Alleen het vinkje (zoals Rectangle/Line in SW) |
| Fillet-PM | Profile naast de keuzelijst; Partial Edge vóór Setback, vinkje binnen de sectie | Profile: op een eigen regel; Setback → Partial Edge (vinkje in de kop) → Fillet Options |
| Extrude-PM | Kubus als Detailed Preview | Donker oog |
| Modify-venster | Undo-pijl en tandwiel | ✓ ✗ Rebuild, Reverse, spin-increment, Mark (SW-volgorde) |
| Boom | Equations-map altijd; terugrolbalk pas na de eerste feature; wortel ingesprongen; 13 px | Equations alleen met vergelijkingen (Hide/show tree items werkt nu); terugrolbalk altijd; wortel tegen de rand; 12 px |
| Beheerdertabs | Witte knoppen | Grijze tegels, actieve licht |
| Statusbalk | MMGS ˅ | MMGS ˄ |
| Schets na Escape | Net getekende rechthoek bleef lichtblauw | Donkerblauw (de schets werd niet hertekend bij een gereedschapswissel) |

## Fout gevonden tijdens de controle

Een veelhoek met ingeschreven cirkel en een even aantal zijden kreeg n Tangent + n-1 Equal. Eén Equal is dan
overbodig (de schets kon "Over Defined" melden, afhankelijk van afronding) en de vorm kon toch onregelmatig worden
(afwisselende hoeken). Nu vervangt een Parallel (n/2 oneven) of Perpendicular (n/4 oneven) de laatste Equal; unit-tests
voor 3, 4, 5, 6, 10 en 12 zijden (4 vrijheidsgraden, regelmatig na slepen).

## Bewust anders

- Merknamen blijven vervangen (Hole Tool, Drag Handles, Drag Dimensions, Product Dimensions, Phlippo Add-Ins), zie docs/06.
- Het modelbeeld blijft het realistische standaardbeeld (glanzend blauwgrijs, band in de achtergrond); de hoofdvideo
  gebruikt een witte scène met mat grijs.
- Tabs Weldments en Product Dimensions blijven zichtbaar (functies die de referentie-installatie verborg).

## Nog open

- Dimension-PM: Style-pictogrammen en twee tekstvakken bij Dimension Text (Tolerance/Precision hebben nu pictogrammen).
- Task Pane-pictogrammen dichter bij het origineel.

## Ook gedaan in deze ronde

- Rechtsklik op een feature: werkbalk boven het menu, menu met kop "Feature (naam)", dubbel "Configure Feature" weg.
- ">"-knop naast de beheerdertabs zichtbaar in boommodus (viel buiten het paneel), weg in PM-modus.
- Heads-up-pictogrammen Zoom to Fit, Zoom to Area, Previous View en Section View opnieuw getekend.
- Lege-eenheidvelden tonen 0.00 zoals SW.

Regressie: browser 97/97 (videos56 na herstel van Edit Sketch in het schetsmenu), B-rep 12/12, worker 6/6, unit 454.
Beelden: docs/screenshots/audit-rect-pm.png, audit-fillet-pm.png, audit-extrude-pm.png.
