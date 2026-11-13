# Taken - Balustrades

## Balustrade-configurator zoals de taatsdeuren (2026-11-13)
- [x] Taatsdeuren bestuderen (web, prijzen, montage, bladen) en normen + marktprijzen opzoeken
- [x] Rekenkern: normen.mjs, onderdelen.mjs, model.mjs (geometrie recht/hoek/trap), bereken.mjs (staander, ankers, las, glas, openingen)
- [x] Prijs en werkwijze (prijzen.mjs): kostprijs per categorie, toeslagen, marktband per soort
- [x] Werkplaats: stuklijst/zaaglijst/zaagplan, tekening per stuk, lasdetails, boringen, montage (3D + iso-blad), bestellijst, plaatsingsblad, berekeningsblad
- [x] Web-configurator (web/index.html + js/) en klantpagina met 3D (scene3d.mjs)
- [x] Presentatie (één HTML met esbuild) en maak-web.mjs naar de scratchpad
- [x] Test qaBalustrades.test.ts + typecheck + test:voorbeelden
- [x] Browsercontrole (Edge/playwright) en screenshots
- [x] EISEN.md (keuzes ontwerper), README.md, docs/Normen-en-bronnen.md

## Afschuining onder een schuin dak aan begin en/of einde (2026-11-13)
- [x] Bronnen zoeken (Buildwise/WTCB: borstwering onder een hellend dak; toeslag vormglas) en keuzes vastleggen
- [x] Model: invoer per uiteinde (helling, hoogte aan de muur, spleet), knik in de handregel, lagere staanders, muurplaat, ingekorte spijlen/staven, schuine platen en trapeziumglas
- [x] Berekening: lengte schuin stuk past, opening dak-balustrade ≤ 110, volle hoogte, hoogte aan de muur, muurplaat
- [x] Werkplaats: stuklijst/zaaglijst met schuine stukken, stukblad met schuine maat, glasbestelling met trapeziummaten, montage, plaatsingsblad
- [x] Prijs: uren en vormtoeslag glas in een aparte toeslag "Afschuining onder het dak"
- [x] 3D en vooraanzicht: dak (half doorzichtig) en knieschot, stippellijn in de bladen
- [x] Web en presentatie: invoer per uiteinde met de lengte van het schuine stuk
- [x] Tests uitbreiden, vitest + typecheck groen
- [x] Webversie, presentatie, kopie naar Balustradeconfigurator, README/EISEN, graphify update
- [x] Screenshots (Edge) bekijken en verbeteren
