# Eisen - Fitnesstoestellen (bibliotheek/fitness)

Vraag van Ian (2026-11-13): "Maak ook een database met fitnessapparatuur die ik kan maken, ook zo'n artifact met alle schema's en alles erbij."

## Keuzes van Ian (vragenronde 2026-11-13)
- **Soorten:** alle vier
  - rekken en racks (power rack, squat rack, half rack, rekken voor halters/schijven/stangen)
  - banken (vlak, verstelbaar, preacher, hyperextension, GHD ...)
  - kabelmachines (kabelstation, lat pulldown, low row, crossover; gewichtstapel of schijven)
  - plate-loaded machines (leg press, hack squat, chest press, row, belt squat ...)
- **Klant:** allebei: per toestel een thuisversie (EN ISO 20957 klasse H) en een professionele versie (klasse S/I), met andere profielen, wanddiktes en prijs.
- **Opbouw:** vaste catalogus: elk toestel in één vaste maat (per versie) met zijn volledige tekeningenpakket; geen maten kiezen.
- **Aantal:** ± 50 toestellen in de eerste versie.

## Versie 5 (2026-11-15): pro-uiterlijk, varianten, ± 150 toestellen
Ian: "Er moeten meerdere fitness toestellen zijn in meerdere varianten en ze moeten er beter uitzien. Nu zien ze er nog echt te selfmade uit en niet zoals pro toestellen."
- **Stijl per soort:** rekken zoals Rogue/Eleiko (vierkante koker, Westside, mat zwart, gelaserde logoplaat, eindkappen, UHMW); plate-loaded zoals Hammer Strength (ovaalbuis, robuust, zwart met accentkleur, verchroomde schijfhouders); kabel/selectorized zoals Life Fitness/Technogym (kappen over de stapel met venster en instructieplaat, afgeronde vormen, katrolkappen, antraciet/zilver).
- **Varianten per toestel:** uitvoering thuis / semi-pro / pro; maat compact / standaard / XL; afwerking (frame-RAL, kussenkleur, chroom of zwart, logoplaat); opties (schijvenopslag, extra grepen, zwaardere stapel ...).
- **Nieuwe soorten:** selectorized (FS), multigyms/rigs (FM), opslag/accessoires (FO), strongman/buiten (FX); samen ± 150 toestellen.
- Alles blijft maakbaar (in België te koop of te laseren) en staat in stuklijst, prijs en tekeningen; logo = placeholder tot de zaak een naam heeft; geen logo's of ontwerpen van merken namaken.
- Werkwijze: drie fases (A uiterlijk, B varianten, C nieuwe toestellen), na elke fase foto's.
- Fase C in blokken van ± 25 (FS, FM, FO, FX), met tests, typecheck en een fotoraster per blok. De snelle testrun is een steekproef, de volledige run gaat met FITNESS_VOLLEDIG=1.
- Opslag in pro-vormtaal: geen open kokerframes of losse ronde liggers. Lagen 15° naar de gebruiker met een V-goot in gezette plaat en rubber, gezette bakken, een dichte plyobox, een gelaserde basisplaat, houders met eindkap en rubberen huls.
- Buiten volgens EN 16630: palen in een betonpoer, verzinkt + poedercoat, openingen buiten 89-230 mm, vrije valhoogte ≤ 3 m, valruimte en ondergrond, infobord. Strongman in mat zwart met laadpennen Ø48.
- v6 (adviezen Fable 5.2): eerst P1, dan P2, dan P3; elke P1 een test met een negatieve proef; het uurloon blijft een instelling (€ 45), met een tabel voor € 60 en € 65; niets schrappen, bedrijfskeuzes bij Ian.

## Vaste regels (uit eerdere projecten)
- Tekeningen volgens ISO: ISO 5457 (bladformaat), ISO 7200 (titelblok), ISO 128 (lijnen), ISO 5456-2 (eerste hoekprojectie), ISO 2768-m (algemene toleranties), ISO 2553 (lassymbolen), ISO 7573 (stuklijst).
- Veiligheid en sterkte: EN ISO 20957-1 (algemeen), -2 (krachttoestellen), -4 (banken), -5? (zie norm) en de last- en stabiliteitsproeven; staal S235JR (EN 10025-2), buizen EN 10219; berekening met bron per controle (groen/oranje/rood), onzekere waarden als AANNAME.
- Kooponderdelen (katrollen, kabels, lagers, J-hooks, UHMW, pinnen, bekleding, schuim, bouten) zijn echte, bestelbare producten in de EU met winkel en prijs; Ian bestelt zelf.
- Werkplaatspakket per toestel: overzicht, stuklijst, zaagplan op 6 m-staven, A4 per stuk, lasdetails, boringen, montage per verbinding, bestellijst, uren en kostprijs, verkoopprijs met marktband.
- Zelfde opbouw en uitstraling als de taatsdeuren- en balustradeconfigurator (web-artifact + presentatie in één bestand op het bureaublad).
