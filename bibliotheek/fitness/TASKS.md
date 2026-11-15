# Taken - Fitnesstoestellen (bibliotheek/fitness)

## Catalogus van ± 50 fitnesstoestellen met werkplaatspakket (2026-11-15)
- [x] Opzoeken: EN ISO 20957 (proeflasten, stabiliteit, knelpunten, staalkabel), kooponderdelen met winkel en prijs, marktprijzen thuis/pro
- [x] Kern: profielen en kooponderdelen (onderdelen.mjs), normen (normen.mjs), model-DSL (model.mjs, bouwstenen.mjs)
- [x] De 50 toestellen in 4 bestanden (rekken, banken, kabel, plate) met thuis- en pro-versie
- [x] Berekening (bereken.mjs), stuklijst/zaagplan/nesting (stuklijst.mjs), uren en prijs (werkwijze.mjs, prijzen.mjs)
- [x] Bladen: overzicht A3, stuklijst, stuk per stuk, lassen, boringen, kabelschema, bekleding, bestellijst, montage
- [x] 3D (scene3d.mjs), dossier/CSV (dossier.mjs), webpagina (web/index.html), maak-web.mjs
- [x] Presentatie in één bestand (maak-presentatie.mjs) en kopie naar het bureaublad met LEESMIJ
- [x] Tests src/qa/qaFitness.test.ts (826 groen), typecheck, test:voorbeelden
- [x] Screenshots bekijken en verbeteren (maatlijnen, titelblok, lasschets, nesting, montage per katrol en kussen)
- [x] README en docs (Normen-en-bronnen, Kooponderdelen, Marktprijzen), graphify update

## Versie 2: fouten uit de machines, meer detail, bewegingscontrole (2026-11-15)
- [x] Controles in controle.mjs: botsingen (OBB), zwevend, kabelloop, ergonomie, schijven vrij, gatfouten
- [x] Alle 50 toestellen thuis en pro nagelopen en verbeterd tot 0 meldingen (rekken, banken, kabel, plate-loaded)
- [x] Beweging: stand 0..1 voor hefbomen, sleden, stapels, FID-bank en beenmachines; controle in 5 standen
- [x] Details in 3D en bladen: gaten, eindkappen, grips, kartel, glijlagers, katrol met groef en borgmoer, kussens met naad, stelvoeten, typeplaatje
- [x] Tests uitbreiden (botsing over de slag, kabel, bereik, samenhang, gaten, negatieve gatproef): 1427 groen; typecheck fitness ok
- [x] Web en presentatie opnieuw bouwen (met bureaubladkopie), graphify update
- [x] Screenshots fitness-fotos-v2 (groot, detail, voor/na) bekeken en verbeterd (assen zichtbaar, close-ups zonder schijven)
- [x] Docs bijwerken (gatregels, README) en rapport

## Boutgaten zichtbaar en zonder fouten (2026-11-15)
- [x] Elk gat als donker gat op elk wandvlak in 3D, miniaturen en aanzichten; bouten met zeskantkop en moer
- [x] Stukbladen: ordinaatmaat per gat vanaf uiteinde A (plaat: x/y vanaf de randen) en een boortabel per stuk
- [x] Boorblad: per stuk Ø, aantal, vlak, wanden en doel (bout, pen, lager, Westside), met de uitkomst van de gatcontrole
- [x] Gatcontrole: zelfde as ≤ 0,5 mm, speling ISO 273, rand ≥ 1,5 Ø, niet in hoekradius of las, brug ≥ 6 mm
- [x] Test voor de gatcontrole en de lijst van gevonden gatfouten met de oplossing

## Versie 3: alle adviezen van Fable 5.2 (40 bevindingen) (2026-11-15)
- [x] Stap 1 rekken: J-cup als U-beugel met pen door beide wanden, pin-pipe safety, spotter met U-beugel en 2 pennen (P1-01/02/03)
- [x] Stap 2 hefboom-bouwsteen: as als staaf, naaf met eindschijven en spanstift, lagerbussen, stelringen, begin- en eindaanslag (P1-11)
- [x] Stap 3 slede: tegenrollen, grendels met getande strip, ribben achter de voetplaat (P1-06/07/10); Smith en belt squat opnieuw (P1-08/09)
- [x] Stap 4 kabel: stapel (lagers, klemblokken, bussen, last), lus met dubbele zwenkkatrol (P1-04), tweezijdige as (P1-05), nokken (P2-01/02), diepe voeten en kantelen (P1-12)
- [x] Stap 5 berekening en controles: evenwicht losse delen, as op buiging, platen, horizontale trek, kabellengte constant, pen op buiging, netto doorsnede; P2-punten
- [x] Stap 6 lastekeningen per lasgroep (P1-13) en maatvoering stukbladen (P2-09); typeplaatje "prototype: proeflast nodig" en dossier (P1-14)
- [x] Stap 7 prijzen (uren, overhead, uurloon als parameter), web klant/werkplaats, tests met negatieve proef per P1, fotos v3, graphify

## Versie 4: de 11 deels-punten van Fable 5.2 en de 2 oranje punten (2026-11-15)
- [x] FB-12 op de hefboom-bouwsteen (P1-11); row met de schijfhouder op een tak (P2-13); pec deck ± 40 % (P2-01)
- [x] Lat pulldown met verstelbare zitting (P2-03); zijafscherming stapel (P2-15); bestellijst: gereedschap, kabelgeleiders, traanplaat (P2-16)
- [x] Controles: sleutelruimte en gaten in gezette delen (P2-08); bouten op trek en trek + afschuiving (P2-10)
- [x] DXF-export van platen en laserdelen (P2-09); halve V als lassymbool (P3-04); lassamenstelling voor alle lasgroepen
- [x] Oranje punten onder 85 % (J-cup-pen thuis, schijfhouder FP-06 pro); tests, typecheck, web, presentatie, foto's v4, graphify
