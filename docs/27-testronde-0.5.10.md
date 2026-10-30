# 27 — Testronde op fouten na 0.5.9 (2026-10-30)

Alle suites opnieuw (typecheck, unit, browserregressie, B-rep, worker, CI-checks), daarna verkennend getest op Ians
scherm (1280x672 @1.5), in het donkere thema, met vier vensters, met een ingeklapt lint, in een smal venster (1024x700),
in een tekening en een assembly, met alle pagina- en consolefouten verzameld (geen).

Ook de 10 "optionele" stappen die de regressie al sinds 0.5.3 oversloeg zijn één voor één nagelopen: zes zijn terecht
(het venster "Save changes?" verschijnt niet als een document via de testhaak geopend wordt), drie waren verouderde
selectors (sketchtools, qa1, videos46: die stap werd stilletjes niet getest) en één verborg een echte fout.

## Gevonden en opgelost

| Fout | Gevolg | Oplossing | Test |
|---|---|---|---|
| Escape met een rechtsklikmenu open sloot het menu én annuleerde de feature | Een bewerking in een PM ging verloren | De eerste Escape sluit alleen het menu (zoals SW) | endconditions (stap is niet meer optioneel) |
| Exit Sketch wiste de selectie | Extruded Boss/Base direct na Exit Sketch vroeg opnieuw om een schets | De net gesloten schets blijft geselecteerd en Extrude neemt hem meteen | round2 |
| Donker thema: de tabrij had een dichte achtergrond | De heads-up-werkbalk werd half bedekt | Tabrij doorzichtig in beide thema's | round2 |
| Donker thema: nieuwe lijnpictogrammen (snelle toegang, schets, heads-up) | Bijna onzichtbaar op het donkere lint | Lichter gemaakt in het donkere thema (verkeerslicht ongewijzigd) | beeldcontrole |
| Verouderde selectors in 3 tests | Stappen werden overgeslagen zonder melding | Selectors bijgewerkt, stappen verplicht | sketchtools, qa1, videos46 |
| autoMarks- en loftFace-unit-tests | Faalden in een volle parallelle run op een time-out (alleen 1,4 s) | Ruimere limiet voor deze twee zware tests | 2 volle runs groen |

Nieuw testscript: `e2e/round2.mjs` (in de regressielijst). Verkenningsscript: `e2e/tools/explore-round2.mjs`.
