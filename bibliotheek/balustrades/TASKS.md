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

## Advies Fable 5.2 op de balustrades v1 (2026-11-17)
- [x] EISEN, README, TASKS, Normen-en-bronnen en alle modules lezen
- [x] Test (490 groen) en typecheck draaien; 33 configuraties doorrekenen (scratch-script, geen code gewijzigd)
- [x] Bladen en de presentatie renderen (Edge/playwright) en bekijken
- [x] Bronnen nalezen: Buildwise Contact 2016/4 p. 16-17 en de ANB-fiche EN 1991-1-1
- [x] Rapport schrijven: docs/Advies-Fable-5.2-v1.md (P1/P2/P3 met bestand:regel, norm en oplossing)
- [x] Adviezen verwerken (ronde 2, 2026-11-17): zie de sectie hieronder

## Advies Fable 5.2 v1 verwerken (2026-11-17)
- [x] Voor-screenshots van de bladen en de presentatie; bronnen nazoeken (wind ANB, verticale last, klemtabel Q-railing)
- [x] P1-8 en P1-5: eerlijke conformiteitstekst met lijst "niet gecontroleerd"; echte randafstand op ontwerp en plaatsingsblad
- [x] P1-1 wind buiten (EN 1991-1-4 + ANB, terrein en hoogte, combinatie met de lijnlast volgens Contact 2016/4)
- [x] P1-2 ondergrond (chape + isolatie, welfsels, hout, staal; hef vanaf de draagvloer; ankertype per ondergrond)
- [x] P1-3 verticale last handregel, P1-4 glas tussen klemmen (deels: ruitmaat AANNAME), P1-6 vulling onder 0,5 kN, P1-7 driehoek langs de trap + traponderregel
- [x] P2-1 tot P2-17, P2-2/P2-3/P2-8 deels (trapvoetplaten, valhoogte, M10/M12, ontluchtingsgaten, secties en voegen, EXC, titelblok, ISO 5455, prijsmodel, klantmodus, ...)
- [x] P3-1 tot P3-12, behalve P3-6 (niet) en P3-7 (deels)
- [x] Tests: handberekeningen, negatieve test per P1/P2, cirkelvormige prijstest weg; vitest 532/532 groen (typecheck: 2 fouten buiten de balustrades)
- [x] Web en presentatie opnieuw bouwen, kopie naar Balustradeconfigurator, na-screenshots bekijken, graphify update
- [x] Statustabel onderaan het adviesrapport (31 gedaan, 5 deels, 1 niet)
- [ ] Open: AANNAMES laten bevestigen (MOD 2500 ruitmaat/borgpen, ω, 900 mm trap, rand 0,75, kI/ψ0, sectiemaat), γM0 ANB (P3-6), typecheck src/app + src/core (andere agent)
