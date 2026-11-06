# Afzuiging: beschermingsconcept, meetplan en vrijgave

Revisie: versie 6 (2026-11-07). Dit document hoort bij de eindverslagen v1 (3,1/10) en v2 (5,0/10); de berekeningen staan in `Berekeningen.md` (gemaakt door `berekeningen.py`). Het legt vast wat het
ontwerp moet bereiken, hoe dat gemeten wordt en wanneer de afzuiging in de salon gebruikt mag worden. Zolang niet
elke poort hieronder groen is, is de afzuiging een **ontwikkelprototype**: niet gebruiken met klanten of medewerkers.

## 1. Wat al in de bestanden is opgelost

| Punt uit het verslag | Stand |
|---|---|
| E02 revisiemix | één revisie: alle KCAD, STL's, tekeningen, mallen, schema, stuklijst, prijslijst en README uit dezelfde generator en dezelfde commit |
| E03 open/niet-manifold STL's | STL's uit de exacte B-rep-vorm; de test controleert per STL dat elke rand bij precies twee driehoeken hoort (open = 0) |
| E06 oude meetwaarde | meting is 1 s geldig; daarna geen drukwaarde, geen filterbalk, melding "meting niet actueel"; drukmeter wordt opnieuw gestart |
| E07 ongeldige ijking | ijken alleen met verse, plausibele metingen binnen 450 Pa en met toerental op elk punt; anders blijft de vorige ijking |
| E07 meetbereik | de filterbewaking werkt alleen op standen waar 2 x de schone waarde onder 450 Pa blijft |
| E08 stop en herstart | UIT breekt een ijking in dezelfde regelstap af; stilstand op elke stand vanaf 20 % bewaakt; na stroomuitval altijd UIT; het scherm toont de bevestigde toestand van de module |
| E09 radio | koppeling per set (MAC en sleutel, versleuteld), volgnummers; boost vervalt in de module na 120 s; bij verbindingsverlies draait de module op de laatste gewone stand |
| E11 G01 | de 9TG24P0G01 (93,6 W) is geschrapt: alleen de 9TG24P0S01 (56 W) op de adapter van 90 W |
| E12 uitkloppen | geschrapt in de UI en de handleiding: filter in een zak vervangen |
| E14 instructies | freesmaten, USB-printjes, schakelaar in de voorwand, TR5-zekering, M8 binder 718 overal gelijk |

De firmwarebeslissingen zitten in `firmware/include/regel.h` en zijn beschreven in 14 tests (`firmware/test/test_regel`).
Die tests draaien op de pc met `python -m platformio test -e native`. Daarvoor is een C++-compiler (gcc) nodig.

## 2. Beschermingsconcept (E01, E04, E12, E13)

**Doel:** nagelstof bij de bron vangen en de lucht gefilterd terug in de ruimte blazen, zonder lek langs het filter.
Dampen van oplosmiddelen (aceton, monomeer) vangt dit filter niet; daarvoor is ventilatie van de ruimte nodig.

1. **Filter.** Een vlakke M5-mat van 170 x 190 mm is bij een hoog debiet te snel doorstroomd (bij 500 m³/h ongeveer
   4,3 m/s): het rendement op fijn stof is dan onbekend. Kies één van deze twee en leg het product vast:
   - **A (aanbevolen):** een geplooid paneelfilter ePM1 50–65 % (F7) van 170 x 190 x 25 mm, op maat, met opgegeven
     drukval bij 150, 250 en 350 m³/h. Geplooid geeft 8 tot 12 keer meer filteroppervlak.
   - **B:** een M5-mat (ePM10 50 %) als voorfilter én afvoer naar buiten.
   De cassette heeft 20 mm ruimte; een filter van 25 mm vraagt 5 mm meer cassettehoogte (één maat in `M.cassette`).
   **Uitgerekend (Berekeningen.md, hoofdstuk 3):** voor 250 m³/h (0,66 m/s op 10 cm boven het rooster) vraagt de
   M5-mat 80 tot 86 % toerental (64 tot 66 dB(A) op 1 m). Een minipleat ePM1 65 % van 48 mm (TROX MFP-PLA op maat,
   vlakke pakking FNU) haalt hetzelfde op 68 tot 74 % (61 tot 63 dB(A)) en filtert fijn stof veel beter; de module
   wordt dan 28 mm dieper (99 mm onder het blad). H13 past niet: op dit front haalt het maar 128 tot 211 m³/h.
2. **Afdichting.** Onder de rand van de cassette komt een zelfklevende EPDM-schuimband van 3 x 9 mm, 30 tot 50 %
   samengedrukt door de RVS-plaat. De richel en de rand zijn daarvoor 1,5 mm lager te zetten (`M.richel`).
   Het filter zelf wordt geklemd met een raam (het paneelfilter heeft een eigen kader).
3. **Onderhoud.** Filter niet uitkloppen of uitblazen. Vervangen met handschoenen en een stofmasker FFP2, het oude
   filter meteen in een zak, zak dicht, daarna ijken (knop 5 s).
4. **Afvoer.** De lucht gaat onder het blad naar achteren. Bij variant B of bij twijfel na de metingen: een slang naar
   buiten.
5. **Morsen en bereikbaarheid.** De waaier zit 30 mm onder het rooster, achter het filter. Meet met een testvinger
   (IEC 61032, probe B) dat de waaier niet bereikbaar is met de plaat erop. Gemorste vloeistof valt in de cassette op
   het filter: gebruik geen open vlam en geen verwarmd gereedschap boven het rooster.

## 3. Draagconstructie (E10)

- **Module:** de klauwen klemmen onder de onderhuid van het blad (vezelplaat ±3 mm) rond de uitsparing. LAGKAPTEN is
  vanbinnen een honingraat; de klemkracht moet dus beperkt blijven. Draai de M5-schroeven aan tot de klauw voelbaar aanligt, niet verder (± 0,05 Nm, kruipgrens PETG; het gewicht rust op het frame).
- **Voedingsbox:** 4 pluggen voor holle deuren in de onderhuid naast de uitsparing; de box weegt ongeveer 0,7 kg.
- **Te bewijzen:** zie poort M hieronder (uittrekken, kruip, warmte).

## 4. Meetplan en acceptatie

Meet op één complete, gemonteerde unit van deze revisie. Leg bij elke meting de revisie (git-commit), het
filterproduct, de stand (%), het toerental en de omgeving vast.

| Poort | Meting | Hoe | Acceptatie |
|---|---|---|---|
| L1 | debiet en drukval | Q-Δp bij 20, 40, 60, 80, 100 %, schoon en beladen; toerental en vermogen | curve vastgelegd; het werkpunt bij de dagstand ligt op de curve van de ventilator |
| L2 | vangst bij de bron | rookproef en anemometer op de plaats van de handen (10 cm boven de plaat), met handen en frees | rook gaat zichtbaar naar het rooster; luchtsnelheid ≥ 0,5 m/s op 10 cm |
| L3 | lek langs het filter | deeltjesteller voor en na de unit, schoon en na 3 filterwissels | gemeten rendement ≥ 90 % van het filterproduct; geen daling na de wissels |
| L4 | blootstelling | stofmeting op ademhoogte van klant en medewerker tijdens een normale behandeling | beoordeeld door een deskundige (preventieadviseur of arbeidshygiënist) volgens de Belgische regels |
| G1 | geluid | dB(A) op oorhoogte van beide personen, achtergrond apart | dagstand ≤ 55 dB(A) op de oorpositie van de medewerker |
| E1 | warmte | 4 uur op 100 %: adapter, box, M8-connectoren, ventilatormotor | alle onderdelen binnen hun specificatie met ≥ 10 °C marge |
| E2 | elektrische eindcontrole | door een elektricien: netsnoer en adapter, aarding, zekering TR5, kabels en trekontlasting | goedgekeurd; DC-schakelaar is geen netisolatie: stekker eruit voor onderhoud |
| F1 | firmware op de hardware | foutinjectie: meter los, slang los of omgekeerd, stilstand, UIT tijdens ijken, radio weg tijdens boost, stroomuitval, tweede set | gedrag zoals de tests in `test_regel`; geen oude drukwaarde op het scherm |
| M1 | bevestiging | uittrekken en 7 dagen belasting van de klauwen en de box op een stuk LAGKAPTEN | geen loskomen, geen zichtbare vervorming |
| M2 | printpassing | testcoupons: moerkamers, paaltjes, cassette in het frame, deksel | passen zonder forceren |
| O1 | onderhoud | 10 filterwissels met de procedure van punt 2.3 | geen stofwolk, afdichting blijft (L3 opnieuw) |
| W1 | werkplek | 1:1-proef met twee personen: knieën, polsen, knop, kabels, uitblaas | geen hinder; niemand zet de stand lager dan de bewezen minimumstand |

**Vrijgave:** pas als alle poorten groen zijn op dezelfde revisie, met een kort meetverslag. Daarna stelt de
firmware de minimale toegestane stand in op de bewezen minimumstand (nu 20 %, `Instellingen.minPct`).

## 5. Wat Ian beslist

- Filtervariant A of B (en het product).
- Of een deskundige de blootstelling meet (aanbevolen voor gebruik met klanten).
- Of er een C++-compiler op de pc mag komen om de firmwaretests te draaien.
