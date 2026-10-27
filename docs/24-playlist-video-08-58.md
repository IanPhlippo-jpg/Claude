# Playlist-video's 08, 09, 35, 46, 53–58 naast Phlippo CAD → 0.5.1 (2026-10-27)

Deze tien video's waren eerder niet te downloaden door de botcontrole van YouTube. Op 2026-10-27 lukte het alsnog,
zonder cookies (46, 53 en 54 bij een tweede poging, met 2 minuten pauze). Drie agents legden ze frame per frame naast
de broncode. De inventarissen staan in `e2e-out/inventaris-08-09-35-55.md`, `-46-53-54.md` en `-56-58.md`. Daarna zijn de
verschillen weggewerkt, met de e2e-tests `videos56`, `videos46` en `videos54`.

## Gebouwd

| Onderwerp | Wat er veranderd is | Video | Bewijs |
|---|---|---|---|
| Vergelijkingen in PM-velden | `=` in een waardeveld maakt er een vergelijking van: menu Global Variables ▸ / Functions ▸ / File Properties ▸ (Density). Na OK stuurt de vergelijking de maat van de feature (`"D1@Boss-Extrude1" = "Width" / 2`). Het veld toont Σ; een klik toont de vergelijking. Het Modify-vak en de Equations-dialoog gebruiken hetzelfde menu. | 46, 55, 57 | e2e `videos56`, `videos46` |
| Equations-map | Σ-icoon in de boom, de vergelijkingen eronder; dubbelklik opent Manage Equations | 46 | e2e `videos46` |
| Rib | Type Linear / Natural (bij Normal to Sketch), Draft On/Off-knop, Rib Thickness At sketch plane / At wall interface | 58 | unit `rib.test`, e2e `videos56` |
| Delete Face | Show selection toolbar en Show preview | 57 | e2e `videos56` |
| Statusbalk | prompts van rib, full round fillet, extrude/base flange-handgrepen, Through All, mirror, rechthoek, cirkel, 3-puntsboog en circular pattern. Readouts: Area + Perimeter, Radius van een ronde rand, Diameter (of Radius) van een cilindervlak, Normal Distance tussen twee evenwijdige vlakken of lijnen, en Center met Z. Menu-items tonen hun beschrijving bij hover. | 08, 09, 46, 53, 55–58 | e2e `videos46`, `videos56` |
| Contextwerkbalken | Een schets in de boom: Show/Hide, Zoom to Selection, Normal To. Een standaardvlak: Sketch, Show/Hide, Zoom to Selection, Normal To. | 46, 53, 58 | e2e `videos46`, `videos56` |
| Hernoemen | bodies (rechtsklik ▸ Rename) en standaardvlakken (F2) | 46 | e2e `videos46` |
| Mass Properties | per gekozen body (Selected items) | 46 | e2e `videos46` |
| Delete/Keep Body | een eigen Property Panel (Delete Bodies / Keep Bodies, bodies kiezen in de boom of het grafisch gebied), ook via Insert ▸ Features | 55 | e2e `videos46` |
| Tab | een Base Flange op plaatwerk heet Tab1 en krijgt de verkorte PM (dikte grijs, Reverse direction, Merge result). Bij het bewerken van Base-Flange1: Override default parameters. | 35, 54 | e2e `videos46`, `videos54` |
| Sweep | Merge result, Feature Scope en Profile Twist ▸ Minimum Twist | 55 | typecheck, PM |
| Curves | Composite Curve (modelranden, schetsen en curves achter elkaar, ook als sweeppad), Curve Through XYZ Points (Curve File-tabel met Browse/Save/Insert) en Curve Through Reference Points | 55 | unit `compositeCurve.test`, e2e `videos46`, `videos54` |
| 3D-schets | Sketch Fillet op de hoeken en drijvende lijnlengtes (wat erna komt schuift mee) | 46, 55 | unit `sketch3dFillet.test`, e2e `videos54` |
| Doubled Distance | Een maat tot een middellijn, met de tekst voorbij die lijn, wordt een diametermaat (Ø) en geldt als twee keer de afstand | 55 | unit `solver.test`, e2e `videos46` |
| Up To Vertex | ook op punten van een layoutschets | 55 | Viewport-pick |
| Vlak | Perpendicular op een gebogen rand: het vlak loodrecht op de curve in haar eindpunt | 46 | typecheck, preview |
| Edit Flange Profile | De flens opent als schets op haar buitenvlak (de rechthoek van de flens zoals ze is), met de Profile Sketch-dialoog: "The sketch is valid." / "The sketch has both open and closed contours.", < Back / Finish / Cancel / Help. Het profiel bepaalt breedte en lengte; gaten erin snijden door. | 54 | unit `flangeProfile.test`, e2e `videos54` |
| Slot | Een slot is één geheel. Trim op een slotlijn vraagt eerst "This trim operation will destroy the slot entity…", met Don't show again. | 57 | e2e `videos54` |
| Numerieke invoer | Options ▸ Sketch ▸ on screen numeric input: een vakje naast de aanwijzer bij lijn en cirkel; een getypte waarde plaatst het eindpunt | 08, 09, 35, 55 | e2e `videos54` |
| Menu's | De groepen zijn echte uitklapmenu's (Insert ▸ Features ▸ …), Tangent Edges Visible / As Phantom / Removed staan direct onder Display. Tools heeft Select, Select All, Sketch Settings, Geometry/Thickness Analysis, Symmetry Check en Add-Ins. In het rechtsklikmenu van Extrude is Zoom/Pan/Rotate een uitklapmenu, en Direction 2 staat in de SW-volgorde met Up To Next. | 46, 54, 55 | e2e `videos54`, tests met `lib/menu.mjs` |
| Selection Filter | De werkbalk naast Model / Motion Study: F5 toont hem, F6 zet hem aan of uit. Filters voor hoekpunten, randen, vlakken, bodies, vlakken, schetspunten en schetssegmenten. | 09, 55 | e2e `videos46` |
| New Document | Advanced met de tabs Templates / Tutorial en sjablonen met materiaal en eenheden (Part-PLAIN CARBON STEEL-MMGS, Part-RED OAK-IPS …), knop Novice | 35 | handmatig |
| Sketch/Curve Color | een Property Panel (Remove Color, standard-palet, Color Properties, Configurations) in plaats van de kleurkiezer van het OS | 58 | e2e `videos46` |
| Overig | Mass-sensor met 9 significante cijfers; relatienamen met volgnummer (Horizontal0); maatnaam als tooltip (D3@Sketch6); rechtsklik ▸ Lock Sketch Focus met "(Locked Focus)" in de statusbalk; volledige naam als tooltip bij afgekapte boomrijen; full round fillet-callouts; plaatwerk-tooltip bij Mirror; Appearances ▸ Plastic met Soft Touch, Textured, Clear Plastic, Satin Finish, EDM en Patterned; materialen Cast Alloy Steel, PBT General Purpose; de bibliotheken DIN Materials en Sustainability Extras; Save model type in library | 46–58 | e2e, unit `featureTypes.test` |

## Bewust nog niet

- **Edge Flange ▸ Bend from Virtual Sharp en Tangent to Bend.** De juiste ligging bij andere hoeken dan 90° is niet
  zeker genoeg. Een gok zou verkeerde onderdelen geven.
- **Live "Length:" bij het slepen van de flens.** Phlippo heeft voor de flenshoogte geen sleephandgreep.
- **Plane ▸ Project bij een punt.** Het Plane-PM kent nog geen punten als referentie.
- **Magnified Selection (G).** Daarvoor moet het WebGL-beeld rond de aanwijzer worden uitvergroot. Dat is niet
  betrouwbaar zonder `preserveDrawingBuffer`.
- **Customize ▸ Shortcut Bars per werkbalk** (slepen naar de balk), het slotje bij de flenshoek, "Customize…" onder de
  contextwerkbalk van een schets en de eenheid "Custom".
- **Instant2D** bestaat al als *Drag Dimensions*; de naam is bewust anders (handelsmerkregel).
- **Equations op 3D-schetsmaten** en bogen in een 3D-schets: de hoeken worden afgerond met Sketch Fillet, maar een vrije
  3D-boog en 3D-maten in de solver zijn er niet.
