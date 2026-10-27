# Ontwerpronde 0.4.4: BasePlate naast de referentievideo

Werkwijze: `e2e/tools/compare-baseplate.mjs` (frames 111 en 118) en `e2e/tools/compare-sketch.mjs` (frames 70, 82, 95) zetten de app naast het referentieframe; kleuren gemeten met PIL op dezelfde plek.

| Frame | Verschil | Oplossing | Gemeten (app / referentie) |
|---|---|---|---|
| 111 | schetsregio onder de preview even geel als de rest | contourvulling onder een feature-preview donkerblauw (0x00002c, 50 %), zodat ze door het geel olijfgrijs leest | 162,167,119 / 162,165,118 |
| 111 | gele preview te licht | previewkleur 0xbec66e (was 0xe9f07a) | 208,214,156 / 211,216,158 |
| 111 | schetslijnen gestippeld (z-fighting met de gele randen) | onder een preview na de randen getekend, met polygon offset | effen zwart |
| 111 | sleeppijl vlak | bredere schacht met lichte kern, kegelpunt met lichte en donkere helft, gevulde kegeltjes voor Direction 2 | — |
| 111 | rode schetsoorsprong onder de lijnen | over de lijnen getekend | zichtbaar op de hoek |
| 50, 118 | oorsprong zichtbaar in partmodus | View ▸ Origins standaard uit; in schetsmodus en onder een preview de rode schetsoorsprong | — |
| 82, 95 | contourvulling | 0,29 zwart | 179 en 126 (dubbel) / 179 en 126 |
| 82 | maten zonder plaatsing binnen de rechthoek | standaard buiten de schets, weg van het midden, op een zesde van de schetsmaat | — |

Niet aangepast: de zoom (in de video zoomt de gebruiker zelf) en de groene relatiesymbolen (al gelijk).

## 0.4.5: tekening en assembly

| Referentie | Verschil | Oplossing |
|---|---|---|
| video 36, frame 0004 | het blad vulde het venster niet, de bladtabs vielen onder de rand | de ResizeObserver mat de lege host van vóór het blad; nu wordt de echte host gemeten, de bladtabs liggen onderaan en de inpassing houdt er rekening mee |
| frame 340 | (assembly-scherm) | lint, tabs en boom gelijk; geen wijziging |
| frame 320 | Insert Component: "No open documents." | het part dat open was vóór File ▸ New blijft in de sessie (sessionParts), staat onder Open documents, is geselecteerd en hangt als preview aan de cursor |
