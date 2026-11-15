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
