# Eisen: lastafel op een schaarheftafel (zoals de DCT-video)

Gevraagd door Ian (2026-11-09): de lastafel uit zijn video (Instagram @DCT_BV) "identiek 100%" namaken, en desnoods
meer informatie opzoeken. Kosten spelen geen rol.

## Wat de video en de bronnen tonen

| Onderdeel | Wat | Bron |
|---|---|---|
| Lastafel | 3D-lastafel Ø28, raster 100 mm h.o.h. met diagonale gaten (DG), zijwanden 200 hoog met gaten, liniaal op één lengte- en één breedtezijde, S690QL, gasgenitreerd 800 HV, blad 25-27 mm | [dctbv.nl lastafel 2400x1200](https://dctbv.nl/nl/producten/lastafel-2400x1200) |
| Heftafel | elektrohydraulische schaarlift, bovenkant 370 tot 1425 mm (zonder blad), 4000 kg inclusief blad, voetpedaal en handbediening, noodstop, CE | [dctbv.nl heftafel](https://dctbv.nl/nl/producten/heftafel-schaarlift) |
| Steunvlakken | 6 CNC-gefreesde vlakken met een boring; het blad wordt erop vastgebout | idem, foto "gefreesd" |
| Opvanglade | verzinkte bakken bovenin, zodat spatten en vuil door de gaten niet tussen de schaar vallen | idem |
| Valbeveiliging | een gele kap met zaagtand op elke hydraulische cilinder, met een zwarte tandplaat: de schaar kan niet zakken als een slang breekt | idem, foto "valbeveiliging"; video |
| Onderframe | U-profielen op een vloerplaat, hijsogen, aanslagpennen, bedienkast RAL 7035 met wartels, hydraulische unit in het midden | 3D-model van DCT (gemeten: 1190 x 2390 mm, materialen) |

## Keuzes

- **Maat:** 2400 x 1200 mm. Die maat staat in DCT's 3D-model van de lift (onderframe 1190 x 2390) en past bij de
  standaardplaatmaat. De lift past in de vorm ook bij 2000 x 1000 en 3000 x 1500.
- **Raster:** DG (dubbel gat): 12 x 24 rastergaten en 11 x 23 diagonale gaten in het blad. Elke zijwand heeft twee rijen
  gaten op het raster (50 en 150 mm onder de bovenkant) en één diagonale rij (100 mm).
- **Badge:** het DCT-logo neem ik niet over (merkrecht). Op dezelfde plaats komt een eigen gele badge.
- **Kleuren:** gemeten in het 3D-model van DCT: poedercoat zwart, verzinkt, RAL 7035, DCT-geel, gefreesd staal.
- **Hydrauliek:** in de video steken de cilinders vlak naar voren. Zo zou de druk in de laagste stand oplopen tot meer dan
  500 bar bij 4 t. Ik koos daarom een ophangpunt dat 70 mm boven de schaararm uitsteekt, en een cilindervoet laag op
  60 mm. Zo blijft de druk overal ≤ 140 bar met 2 cilinders Ø100/56. Van buiten ziet het er hetzelfde uit (zie
  `docs/Berekeningen.md`).
- **Bediening:** 230 V, 16 A, hydraulische unit 2,2 kW. Voetpedaal (op en neer) met noodstop. Zakken gaat alleen zolang
  je het pedaal ingedrukt houdt (dodemansbediening). In elke cilinder zit een leidingbreukventiel (EN 1570-1).

## Open (aan Ian)

- De maat 2400 x 1200 heb ik zelf gekozen. 2000 x 1000 of 3000 x 1500 kan met dezelfde generator.
