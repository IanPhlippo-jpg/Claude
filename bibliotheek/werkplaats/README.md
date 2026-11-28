# Werkplaats: deuren, balustrades en fitness in één app (2026-11-28)

Ian: "bij de artifacten die we gemaakt hebben over fitness, deuren en balustrades deze zouden allemaal in 1 moeten komen
+ ... zet prijzen in 1 document en de schema's apart van alles".

## Wat het is

- **Eén pagina** met bovenaan Deuren (staal en aluminium), Balustrades, Fitness en Instellingen. Elke configurator draait in
  zijn eigen schaduwboom (eigen id's en stijl, eigen accentkleur) en wordt pas geladen als je hem opent.
- **Routes**: `#deuren/staal`, `#deuren/alu`, `#deuren/staal-werkplaats`, `#deuren/alu-werkplaats`,
  `#balustrades/balustrade`, `#balustrades/werkplaats`, `#fitness/catalogus`, `#fitness/toestel/FR-01`,
  `#fitness/werkplaats/FR-01`, `#instellingen/deuren` (of `balustrades`, `fitness`). De oude links van de drie losse pagina's
  (`#staal`, `#alu-werkplaats`, `#werkplaats`, `#toestel/FR-01`, ...) worden omgezet.
- **Werkplaats per product in drie tabbladen** (het gekozen tabblad blijft per product bewaard in de browser):
  - **Schema's**: alle tekeningen, bladen en 3D, met bovenaan een inhoudsopgave om meteen naar een tekening te springen;
  - **Werkvoorbereiding**: stuklijst, bestellijst en zaagplan, zaaglijst, werkwijze, berekening en nakijken, zonder prijzen;
  - **Prijzen**: één prijsdocument: kostprijs per regel met bron, kooponderdelen met prijs per eenheid, uren x uurloon,
    marge, verkoop excl. en incl. btw, de markt, en de gebruikte tarieven en materiaalprijzen met bron en datum. Als blad
    A4 op het scherm en met **Download PDF** (via de downloads-dienst).
- **Klantmodus**: `klant.html` (of `?klant`): geen werkplaats, instellingen of kostprijs.
- **Instellingen en opslag**: elke configurator bewaart zijn instellingen zoals voordien (dezelfde sleutels:
  `data/users/<id>/instellingen/taatsdeuren|balustrades|fitness` in de db, `taatsdeuren-*`, `balustrades-*`, `fitness-*` in de
  browser). De kop vraagt user, db en downloads één keer en geeft ze aan de drie configurators.

## Bestanden

| Bestand | Wat |
|---|---|
| `web/index.html` | de kop, de startpagina, de routes en het lui laden |
| `maak-werkplaats.mjs` | bouwt de map om te publiceren: `index.html`, `klant.html`, `js/apps/<app>.mjs` (elke configurator als `mount(ROOT, HOST, CTX)`) en `js/taatsdeuren|balustrades|fitness|werkplaats/` |
| `werkdoc.mjs` | gedeeld: de tabbladen, de stijl, het prijsdocument als HTML en als PDF (A4, Helvetica, zonder bibliotheek) |
| `../<product>/prijsdoc.mjs` | het prijsdocument per product, uit dezelfde `kostprijs()` als voordien (rekent niets opnieuw) |

De bron van elke configurator blijft `../<product>/web/index.html`; die werkt ook los. Het bouwscript verandert er alleen
de regel met `@wortel` (ROOT, HOST en CTX komen uit `mount`), de paden `./js/` en de stijl (`:root` en `body` worden `:host`).

## Maken en testen

```bash
node bibliotheek/werkplaats/maak-werkplaats.mjs <map>   # index.html, klant.html en js/ om te publiceren
npx vitest run bibliotheek/tests/werkplaatsPrijzen.test.ts  # prijsdocument = de vroegere kostprijstabel, bladen zonder prijzen, bouwscript
node e2e/werkplaats.mjs <map> [map voor schermafbeeldingen]  # Playwright op de gebouwde map (eigen statische server)
```

Publiceren: de hele map als één artifact (pagina `index.html`, de rest via `files` met `root` = de map), met de
mogelijkheden `user`, `db` en `downloads`. De instellingen van de drie oude artifacts staan in hun eigen opslag: kopieer ze
één keer naar het nieuwe artifact.
