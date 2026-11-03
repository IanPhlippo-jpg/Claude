# Standard Parts: eigen normdelenbibliotheek (QA 0.5.11 rij 37, plan P2-8)

Eigen bibliotheek uit open normtabellen, geen inhoud van een ander programma.

## Kern: `src/core/library/`
- `iso.ts`: maattabellen M3–M12.
  - ISO 4762 (dk, k, s, t, b, lengtebereik), ISO 4032 stijl 1 (s, m, e, dw), ISO 7089 normale reeks (d1, d2, h)
  - ISO 273 doorgaande gaten fijn/medium/grof (plus M16/M20 voor de grotere Auto Fasteners-maten)
  - ISO 261 spoed P
- Selectie:
  - `sizeForClearanceHole(D)`: de grootste maat waarvan een ISO 273-gat (fijn, medium of grof) niet groter is dan D. Voorbeelden: Ø6,6 → M6 medium, Ø9 → M8 medium, Ø7 → M6 grof, Ø10 → M8 grof.
  - `requiredScrewLength`: voor een doorgaand gat klemlengte + ring h + moer m + 2P, voor een tapgat de klemlengte.
  - `screwLengthFor`: de kortste lengte uit de ISO 4762-reeks binnen het normbereik van die maat.
- `parts.ts`: generatoren die gewone part-documenten bouwen (schets + features), zodat de bestaande rebuild ze bouwt:
  - `socketHeadCapScrew`: revolve van schacht en kop (afschuining van 1 spoed op het einde, 0,06·dk op de kop) en een inbus-cut s × t.
  - `hexNut`: zeskant-extrude met gat d en een 30°-afschuining (revolve-cut) aan beide zijden vanaf dw.
  - `plainWasher`: revolve van de ring.
  - Catalogus: 87 bouten (elke maat in alle normlengtes), 7 moeren en 7 ringen, samen 101 delen.
- Vereenvoudiging: geen schroefdraad, schacht op de nominale d, inbus zonder kegelbodem.
- Oriëntatie: as langs +Z, draagvlak op Z = 0.

## Interface
- Taakvenster ▸ Part Library ▸ map **Standard Parts (ISO)**: `src/app/panels/StandardPartsPane.tsx`, lazy geladen via `lazyNamed`.
  - Keuzes: norm (Bolts and Screws / Nuts / Washers; ook ISO 10642 en ISO 4017 van Auto Fasteners), maat en lengte. Alleen lengtes uit het normbereik worden aangeboden.
  - Toont de hoofdmaten en de ISO 273-gaten.
  - Insert gebruikt de bestaande route (`startInsertComponent` + `setInsertGhost`, plaatsen met een klik). Open opent het deel apart.
- Zolang de add-in niet geladen is, toont de map "Load now".

## Auto Fasteners
- De maat komt uit de ISO 273-tabel, de lengte uit `fastenerLength`. Een ISO 4762-bout van M3–M12 is het bibliotheekdeel.
- Het eigenschappenpaneel toont "hole Ø6.6 (ISO 273 medium)".
- Fout gecorrigeerd: de Concentric-mate had de schroefas +Z "aligned" met de boorrichting. Daardoor draaide de solver de bout om, met de kop in het gat. De schroefref is nu -Z (in het gat).

## Tests
- `src/core/library/library.test.ts`: 7 tests.
  - Aantal delen ≥ 30.
  - Maten tegen een tweede, handgeschreven normtabel.
  - Rebuild-bbox en -volume per maat.
  - Volume M6×20 binnen 2 % van de handberekening.
  - Ø6,6 → M6 en Ø9 → M8.
  - Lengtekeuze.
  - Auto Fasteners met een Ø9-plaat, inclusief de kop boven de plaat na de solve.
- `e2e/library.mjs`: 16 checks (staat achteraan in de SCRIPTS van `run-regression.mjs`).
- `e2e/fasteners.mjs` verwacht nu M6 × 30 (klemlengte 18 + 8,8 → 30) in plaats van M6 × 25.
