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
Die tests draaien op de pc met `python -m platformio test -e native` (GCC 16.2, WinLibs): 16 van de 16 geslaagd op 2026-11-07.

## 2. Beschermingsconcept (E01, E04, E12, E13)

**Doel:** nagelstof bij de bron wegzuigen, weg van het gezicht van klant en medewerker. Het filter beschermt de
ventilator; het is **geen luchtreiniger**. Ontwerpbesluit van Ian (2026-11-07): een goedkope, makkelijk te vervangen
filtermat die veel lucht doorlaat, zodat de zuigkracht boven het rooster zo groot mogelijk blijft. Gevolg: het fijnste
stof gaat door de mat en komt onder het blad terug in de salon. De salon moet daarom goed geventileerd zijn (en dat is
ook nodig voor dampen van aceton en monomeer, die geen enkel deeltjesfilter vangt).

1. **Filter (gekozen).** De kant-en-klare standaardmat Rittal SK 3171.100 van 173 x 173 x 17 mm (G3 / ISO coarse 50 %,
   EAN 4028177038059; per 5 of per 50, bij Rittal, RS en Lieske), vervangen zonder knippen. De cassette heeft een vak
   van 171 x 171: de mat zit rondom 1 mm aangedrukt, zodat er geen lucht langs gaat.
   **Uitgerekend (Berekeningen.md):** zo'n grove mat kost bij 250 m³/h ongeveer 50 Pa (een M5-mat ongeveer 200 Pa), dus
   meer debiet bij hetzelfde toerental. De andere filters (M5, geplooid F7/F9, H13) staan ter vergelijking in het
   rekenblad; ze filteren fijner maar zuigen minder of luider.
   **Ophoogte boven het rooster:** zie Berekeningen.md hoofdstuk 1: 0,5 m/s op 10 cm vraagt 190 m³/h, op 15 cm 360 m³/h.
   Een laag schermpje aan de overkant van het rooster verbetert de vangst op 15 cm zonder meer lucht (optie).
2. **Afdichting.** Onder de rand van de cassette komt een zelfklevende EPDM-schuimband van 3 x 9 mm, 30 tot 50 %
   samengedrukt door de RVS-plaat. De richel en de rand zijn daarvoor 1,5 mm lager te zetten (`M.richel`).
   De mat ligt op de roosterbodem van de cassette, de cassetterand ligt erop.
3. **Onderhoud.** Filter niet uitkloppen of uitblazen. Vervangen met handschoenen en een stofmasker FFP2, het oude
   filter meteen in een zak, zak dicht, daarna ijken (knop 5 s).
4. **Afvoer.** De lucht gaat onder het blad naar achteren, de salon in. Wie het fijne stof ook buiten wil: een slang
   van onder de module naar buiten (latere optie).
5. **Morsen en bereikbaarheid.** De waaier zit 30 mm onder het rooster, achter het filter. Meet met een testvinger
   (IEC 61032, probe B) dat de waaier niet bereikbaar is met de plaat erop. Gemorste vloeistof valt in de cassette op
   het filter: gebruik geen open vlam en geen verwarmd gereedschap boven het rooster.

## 3. Draagconstructie (E10)

- **Module:** de klauwen klemmen onder de onderhuid van het blad (vezelplaat ±3 mm) rond de uitsparing. LAGKAPTEN is
  vanbinnen een honingraat; de klemkracht moet dus beperkt blijven. Draai de M5-schroeven aan tot de klauw voelbaar aanligt, niet verder (± 0,05 Nm, kruipgrens PETG; het gewicht rust op het frame).
- **Voedingsbox:** 4 pluggen voor holle deuren in de onderhuid naast de uitsparing; de box weegt ongeveer 0,7 kg.
- **Te bewijzen:** zie poort M hieronder (uittrekken, kruip, warmte).

## 3b. Werkplek (maten uit het model, bureau LAGKAPTEN 1400 x 600 x 34 op twee ALEX, blad 734 mm hoog)

| Wat | Maat | Gevolg / controle in W1 |
|---|---|---|
| module | midden van het blad: 300 mm van de voorrand, 189 mm vrije rand voor het frame | de onderarm van de klant ligt op het blad of het rooster, de nagel 50 tot 100 mm boven het rooster (vangst: Berekeningen.md, hoofdstuk 1) |
| onderkant module | 102 mm onder het blad, dus 632 mm boven de vloer, tussen 189 en 411 mm vanaf de voorrand | dijen en knieën van de medewerker aan de voorkant: vrij als de knie niet verder dan 190 mm onder het blad komt of onder 632 mm blijft; proef met de grootste gebruiker en de stoel op werkhoogte |
| vrije ruimte tussen de ladekasten | 680 mm breed | de module (210 breed) staat in het midden, beide knieën ernaast is niet mogelijk: knieën vóór de module |
| knop | 250 mm rechts van het midden, 100 mm van de voorrand, 16 mm boven het blad | met de rechterhand te bereiken zonder te leunen; linkshandig: de mal en `M.dial` spiegelen (x = -250) |
| voedingsbox | 495 mm van de voorrand, 71 mm onder het blad (rand + bak) | achter de knieën, buiten de beenruimte; netsnoer langs de achterpoot |
| kabels | M8 en slangetje in een sleuf van 29 x 7 onder het blad, USB-C van de knop in een sleuf van 5 x 5 | geen kabel in de beenruimte; buigradius USB-C (haaks) en M8 ≥ 5 x kabeldiameter aan de connector |
| uitblaas | onder de module naar achteren, op 632 mm hoogte | geen tocht op de benen van de klant (W1: hand op kniehoogte aan de klantkant) |
| armsteun | geen: de onderarm rust op het blad of op de RVS-plaat (4 mm hoger, randen afgerond R6) | geen drukplek op de pols (W1) |

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

- ~~Filtervariant~~: beslist op 2026-11-07, standaardmat Rittal SK 3171.100 (bescherming van de ventilator, geen luchtreiniger).
- Of een deskundige de blootstelling meet (aanbevolen voor gebruik met klanten).
- ~~C++-compiler~~: geïnstalleerd (WinLibs GCC 16.2, 2026-11-07); de firmwaretests slagen.
