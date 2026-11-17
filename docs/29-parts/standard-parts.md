# Standard Parts: eigen normdelenbibliotheek (QA 0.5.11 rij 37, plan P2-8; uitgebreid in 0.5.16, advies 5.2 punt 9)

Eigen bibliotheek uit open normtabellen, geen inhoud van een ander programma.

## Kern: `src/core/library/`
- `iso.ts`: maattabellen van de bevestigers, M3–M24 (eerste keus: M3, M4, M5, M6, M8, M10, M12, M16, M20, M24) waar de
  norm die maten kent.
  - ISO 4762 inbusbout (dk, k, s, t, b, lengtebereik tot 200)
  - ISO 4017 zeskantbout volledig draad, productklasse A (s, k, e, dw; l tot 10·d en 150)
  - ISO 7380-1 bolkopinbus (dk, k, s, t; M3–M16, de norm stopt bij M16)
  - ISO 10642 verzonken inbus (dk theoretisch, k, s, t; M3–M20, de norm stopt bij M20)
  - ISO 4026 stelschroef met vlakke punt (s, t, dp)
  - ISO 4032 moer stijl 1 (s, m, e, dw), ISO 7040 borgmoer met nyloninzet (h; zeskant en dw van ISO 4032)
  - ISO 7089 sluitring normale reeks (d1, d2, h)
  - ISO 273 doorgaande gaten fijn/medium/grof tot M24, ISO 261 spoed P
- `pinsRingsBearings.ts`: ISO 2338 cilinderpen m6 (d, c, lengtebereik), ISO 8752 spanstift zware uitvoering (d, d1 vóór
  montage, s), DIN 471 / DIN 472 borgveren voor as / boring (d1, s, d3, b ≈, d2, m), groefkogellagers 6000–6010 en
  6200–6210 met de hoofdmaten van ISO 15 (d, D, B, r).
- Selectie:
  - `sizeForClearanceHole(D)`: de grootste maat waarvan een ISO 273-gat (fijn, medium of grof) niet groter is dan D.
    Voorbeelden: Ø6,6 → M6 medium, Ø9 → M8 medium, Ø7 → M6 grof, Ø22 → M20 medium, Ø26 → M24 medium.
  - `requiredScrewLength`: voor een doorgaand gat klemlengte + ring h + moer m + 2P, voor een tapgat de klemlengte.
  - `lengthFor(reeks, nodig)`: de kortste lengte uit het normbereik van die maat.
- `parts.ts`: de catalogus (één tabel `DEFS`: norm, map, maten, lengtes, naam, hoofdmaten, bouwer).
  `standardSizes`, `standardLengths`, `standardPartName`, `standardPartDimensions`, `standardPart`,
  `standardPartCatalog` (980 delen: elke maat in elke normlengte).
- `partBuilders.ts`: bouwers die gewone part-documenten maken (schets + features), zodat de bestaande rebuild ze bouwt:
  - inbusbout: revolve van schacht en kop, inbus-cut s × t; zeskantbout: schacht + zeskant-extrude + 30°-afschuining;
    bolkop: koepel als bolkap dk × k (8 segmenten); verzonken: 90°-kegel van d op -k tot dk op Z = 0; stelschroef:
    vlakke punt dp onder 45°;
  - moer: zeskant met gat en 30°-afschuiningen; borgmoer: zeskant tot m, ronde kraag dw tot h, gat en afschuining
    als één revolve-cut (een kraag en zeskant met elk een gat op dezelfde straal gaf open randen bij M20);
  - pen: cilinder met afschuining c; spanstift: buis d / d − 2s met sleuf (s/2 breed, niet genormeerd);
  - borgveer: gespleten ring s dik, b breed (de lippen met gaten zijn weggelaten; opening 0,25·d1, niet genormeerd);
  - lager: één body, de ringen met een ondiepe uitsparing (5 % van B) waar de afdichting zit, hoeken r als 45°.
- Vereenvoudiging: geen schroefdraad, schacht op de nominale d, inbus zonder kegelbodem.
- Oriëntatie: as langs +Z; een bout heeft het draagvlak onder de kop op Z = 0, een verzonken of stelschroef de
  bovenkant; moer, ring, pen, borgveer en lager staan op Z = 0.
- Namen (component en stuklijst): `ISO 4017 M16 x 60`, `ISO 7380-1 M6 x 12`, `ISO 10642 M8 x 25`, `ISO 4026 M5 x 8`,
  `ISO 7040 M10`, `ISO 7089 24 - 200 HV`, `ISO 2338 6 m6 x 20`, `ISO 8752 8 x 40`, `DIN 471 20 x 1.2`,
  `DIN 472 30 x 1.2`, `Ball Bearing 6204`.

## Interface
- Taakvenster ▸ Part Library ▸ map **Standard Parts (ISO, DIN)**: `src/app/panels/StandardPartsPane.tsx`, lazy geladen
  via `lazyNamed`.
  - Keuzes: norm (mappen Bolts and Screws / Nuts / Washers / Pins / Retaining Rings / Bearings), maat en lengte. Alleen
    maten en lengtes uit de norm worden aangeboden.
  - Toont de hoofdmaten met uitleg en, bij bouten, de ISO 273-gaten.
  - Insert gebruikt de bestaande route (`startInsertComponent` + `setInsertGhost`, plaatsen met een klik). Open opent
    het deel apart.
- Zolang de add-in niet geladen is, toont de map "Load now".

## Auto Fasteners
- De maat komt uit de ISO 273-tabel (nu tot M24), de lengte uit `fastenerLength`: de kortste lengte uit het normbereik
  van de norm van het type (ISO 4762, ISO 10642, ISO 4017). Waar de norm de maat kent, is de bout het bibliotheekdeel;
  anders (ISO 10642 M24) het algemene model.
- Het eigenschappenpaneel toont de maten M3–M24 en per maat de normlengtes (`fastenerLengths`).

## Tests
- `src/core/library/library.test.ts`: 7 tests (ISO 4762/4032/7089/273 tegen een handgeschreven tabel, nu tot M24;
  rebuild-bbox en -volume per maat; lengtekeuze; Auto Fasteners met een Ø9-plaat).
- `src/core/library/standardParts.test.ts`: 6 tests.
  - Catalogus: 13 normen in 6 mappen, maten per norm (ISO 7380-1 tot M16, ISO 10642 tot M20, 22 lagers), unieke namen,
    lengtebereiken.
  - Stuklijstnamen.
  - Maten tegen een tweede, handgeschreven tabel voor voorbeeldmaten van elke norm.
  - Elke norm, kleinste en grootste maat: één gesloten body (Check: geen open randen), volume binnen 1,5 % van een
    handberekening (Pappus/kegelstompen min inbus/sleuf; met een boven- en ondergrens waar een afschuining de hoeken
    van een zeskant raakt), bbox (lengte, kophoogte, sleutelwijdte, lagermaten).
  - Auto Fasteners: Ø17,5 / Ø22 / Ø26 → M16 / M20 / M24 met een normlengte, Ø26 → ISO 4762 M24, verzinkgat → ISO 10642.
  - Eenmalig nagegaan (niet in de suite, 75 s): alle 980 delen bouwen tot één gesloten body.
- `e2e/library.mjs`: 26 checks, o.a. de zes mappen en 13 normen, maten M3–M24 in Auto Fasteners, ISO 4017 M16 x 60,
  ISO 7040 M10, ISO 2338, DIN 471 en lager 6204 in een assembly (namen, 10 bodies, bbox), lager en bolkop openen.
- `e2e/fasteners.mjs` verwacht M6 × 30 (klemlengte 18 + 8,8 → 30).
