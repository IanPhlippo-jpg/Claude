# Design Tables (pariteitsrij 44, P2-3) — QA 0.5.11, plan NAAR-100

Een design table is een tabel met per rij een configuratie en per kolom een parameter. Ze wordt gelezen in de
bestaande configuraties (`Configuration.dims` en `Configuration.suppressed` in `src/core/document/configurations.ts`);
er wordt niets extra in het document bewaard.

## Kern: `src/core/document/designTable.ts`

- `exportDesignTable(doc, { separator?: ';' | ',', states?: 'used' | 'all' })` → CSV-tekst:
  ```
  Design Table for: Part1
  ;D1@Sketch1;D1@Boss-Extrude1;$STATE@Boss-Extrude1
  Default;40;10;U
  Short;40;12,5;U
  ```
  Kolommen: alle maten uit `dimensionTable`, `$STATE@<feature>` voor features die in minstens één configuratie
  suppressed zijn (`states: 'all'`: elke feature), `$DESCRIPTION`/`$COMMENT` als een configuratie er een heeft.
  Waarden zijn wat de configuratie echt toont (via `activateConfiguration`, dus ook "Suppress new features" en
  As Welded). `;` schrijft een decimale komma (Excel in België), `,` een decimale punt.
- `importDesignTable(doc, csv)` → `{ doc, errors, configurations: { name, added }[] }`.
  - Scheidingsteken: tab, `;` of `,` (het eerste dat buiten aanhalingstekens op de kopregel staat); decimale komma
    of punt; aanhalingstekens volgens CSV; BOM, een titelregel "Design Table for: …" en een `sep=;`-regel worden
    overgeslagen.
  - Parameters: maatnamen (exact, anders hoofdletterongevoelig), `$STATE@<feature>` (S/U, Suppressed/Unsuppressed,
    1/0), `$DESCRIPTION`, `$COMMENT`.
  - Een bestaande configuratie (op naam) wordt bijgewerkt, een nieuwe aangemaakt als kopie van de getoonde
    configuratie. Een lege cel houdt de waarde die de configuratie al had. De getoonde configuratie blijft getoond.
    Configuraties die niet in de tabel staan blijven ongemoeid.
  - Schrijven gebeurt via `addConfiguration`, `setConfigurationDimension`, `setConfigurationSuppressed`,
    `updateConfiguration`.
  - Fouten (niets wordt toegepast, `doc` is het invoerdocument): onbekende maat, onbekende feature in `$STATE@`,
    niet-ondersteunde `$`-parameter, waarde die geen getal is, `$STATE` die geen S/U is, dubbele parameter of
    configuratie, rij zonder naam, tabel zonder rijen. Elke melding noemt kolom (A, B, …) of configuratie.

## UI

Configurations-paneel: rechtsklik op het documentknooppunt (`Part1 Configuration(s)`) of op de map **Tables** →
**Insert Design Table…** (bestand kiezen, `.csv`/`.txt`) en **Export Design Table…** (download
`<naam> - Design Table.csv`, met BOM zodat Excel UTF-8 leest). De commando's staan in
`src/app/designTableCommands.ts` en worden pas bij het eerste gebruik geladen (`import()`), samen met de kern.
Insert is één undo-stap "Insert Design Table" (`applyDocument`, schetsen opnieuw opgelost met `solveAll`). Bij fouten:
statusmelding "Design Table not applied: …" (error) plus de volgende drie meldingen als waarschuwing.

## Tests

- `src/core/document/designTable.test.ts` (6 tests): blok L×B×H met doorgaand gat Ø (4 maten: `D1@Sketch1`,
  `D2@Sketch1`, `D1@Boss-Extrude1`, `D1@Sketch2`) × 3 configuraties, volume per configuratie via
  `documentForConfiguration` + `solveSketch` + `rebuildDocument` + `meshVolume` (relatieve fout < 2e-4: het gat is
  een veelhoek); export → import rond-trip identiek (ook in een part zonder configuraties, en met `,`/punt);
  `$STATE` suppress en unsuppress (ook op de getoonde configuratie); foutmeldingen; tabs, BOM, `$DESCRIPTION` met `;`
  tussen aanhalingstekens, lege cellen.
- `e2e/designtable.mjs` (15 checks, in `run-regression.mjs`): plaat tekenen, menu, Insert (3 configuraties, decimale
  komma, `$STATE` S → geen body), elke configuratie tonen en de maten van de body meten, foute tabel → melding en geen
  wijziging, Export (bestandsnaam, kop, rijen), export opnieuw inlezen → 0 toegevoegd.

## Beperkingen

- Alleen CSV/tekst, geen `.xlsx` en geen ingebedde spreadsheet die in de app bewerkt wordt; de tabel wordt niet als
  object in het document bewaard (de map Tables toont dus geen "Design Table"-knooppunt) en is niet gekoppeld aan
  een extern bestand.
- Geen formules in cellen (een spreadsheet exporteert de berekende waarden), geen eenheden in cellen (`12 mm` is een
  fout), geen duizendtalscheiding.
- Assemblies: alleen maten en `$STATE` van features; geen `$CONFIGURATION@component`, `$STATE@component`,
  `$COLOR`, `$PARTNUMBER` of andere `$`-parameters.
- Configuraties worden niet verwijderd als ze uit de tabel verdwijnen.
