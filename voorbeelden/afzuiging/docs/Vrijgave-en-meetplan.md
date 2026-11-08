# Afzuiging: beschermingsconcept, meetplan en vrijgave

Revisie: versie 7.0 (2026-11-08). Dit document hoort bij de eindverslagen v1 (3,1/10), v2 (5,0/10) en v3 (5,6/10); de berekeningen staan in `Berekeningen.md` (gemaakt door `berekeningen.py`). Het legt vast wat het
ontwerp moet bereiken, hoe dat gemeten wordt en wanneer de afzuiging in de salon gebruikt mag worden. Zolang niet
elke poort hieronder groen is, is de afzuiging een **ontwikkelprototype**: niet gebruiken met klanten of medewerkers.

## 1. Wat al in de bestanden is opgelost

| Punt uit het verslag | Stand |
|---|---|
| E02 revisiemix | één revisie: alle KCAD, STL's, tekeningen, mallen, schema, stuklijst, prijslijst en README uit dezelfde generator en dezelfde commit |
| E03 open/niet-manifold STL's | STL's uit de exacte B-rep-vorm; de test controleert per STL dat elke rand bij precies twee driehoeken hoort (open = 0) |
| E06 oude meetwaarde | meting is 1 s geldig; daarna geen drukwaarde, geen filterbalk, melding "meting niet actueel"; drukmeter wordt opnieuw gestart |
| E07 ongeldige ijking | ijken alleen met verse, plausibele metingen binnen 450 Pa en met toerental op elk punt; anders blijft de vorige ijking |
| E07 meetbereik | de filterbewaking werkt alleen op standen waar de vervanggrens (de vervangfactor van die stand x de schone waarde) onder 450 Pa blijft; anders "buiten bereik" |
| E08 stop en herstart | UIT breekt een ijking in dezelfde regelstap af; stilstand op elke stand vanaf 20 % bewaakt; na stroomuitval altijd UIT; het scherm toont de bevestigde toestand van de module |
| E09 radio | koppeling per set (MAC en sleutel, versleuteld), volgnummers; boost vervalt in de module na 120 s; bij verbindingsverlies draait de module op de laatste gewone stand |
| E11 G01 | de 9TG24P0G01 (93,6 W) is geschrapt: alleen de 9TG24P0S01 (56 W) op de adapter van 90 W |
| E12 uitkloppen | geschrapt in de UI en de handleiding: filter in een zak vervangen |
| E14 instructies | freesmaten, USB-printjes, schakelaar C&K D502 in de voorwand, zekering Bel 0697W (72 V DC), M8 binder 718 overal gelijk |

De firmwarebeslissingen zitten in `firmware/include/regel.h` en zijn beschreven in 22 tests (`firmware/test/test_regel`).
Die tests draaien op de pc met `python -m platformio test -e native` (GCC 16.2, WinLibs): 22 van de 22 geslaagd op 2026-11-08.

## 2. Beschermingsconcept (E01, E04, E12, E13)

**Doel:** nagelstof bij de bron wegzuigen, weg van het gezicht van klant en medewerker, en het meeste fijne stof
tegenhouden. Ontwerpbesluit van Ian (2026-11-08): een gewoon interieurfilter van een auto, overal te koop en zonder
knippen te vervangen. Het is geen HEPA-filter en vangt geen dampen (aceton, monomeer): de salon moet goed geventileerd
zijn.

1. **Filter (gekozen).** Interieurfilter (pollenfilter) MANN CU 20 013, 195 x 145 x 30 mm, geplooid deeltjesfilter, voor
   de Toyota Aygo II, Peugeot 108 en Citroën C1 II; gelijk: Bosch 1 987 435 066, Valeo 715828, Purflux AH495, Mahle
   LA 1174, Filtron K 1347A (196 x 145 x 30). Vangst volgens gepubliceerde proeven op interieurfilters: bij 0,3 µm 50 tot
   70 % (merkfilters beter dan naamloze), vanaf 3 µm meer dan 90 %. Neem een merkfilter.
   **Uitgerekend (Berekeningen.md):** 55 tot 115 Pa bij 250 m³/h op het hele front (een schatting uit proeven, geen
   fabrikantcurve); het rekenblad neemt de bovengrens op het vrije front: 130 Pa. Daarmee is 75 % de laagste
   beschermende stand en 80 % de dagstand. Poort L1 meet het echte filter.
   **Ophoogte boven het rooster:** zie Berekeningen.md hoofdstuk 1: 0,5 m/s op 10 cm vraagt 190 m³/h, op 15 cm 360 m³/h.
   De vroegere keuze (Rittal-mat, 2026-11-07) staat ter vergelijking in het rekenblad.
2. **Afdichting (V3-02).** Het filter ligt op een zachte zelfklevende foamband van 6 x 4 mm op een steunrand van 6 mm
   van de instroomplaat; een geleiderand houdt het op zijn plaats (1 mm speling rondom). In rust ligt het filter 1 mm
   onder de RVS-plaat; zodra de ventilator draait, trekt de drukval over het filter (130 Pa x 0,028 m² = 3,7 N) het in de
   foam. Een interieurfilter is daarvoor gemaakt: het zit in de auto ook op een zachte rand. Poort L3 meet of er lucht
   langs gaat; O1 controleert de foam na 10 wissels.
3. **Onderhoud.** Eén procedure (`onderhoud.mjs`, ook in de README en het bouwschema): knop uit, schakelaar op de box
   uit, 10 s wachten tot de ventilator stilstaat, dan het filter horizontaal in een zak, foamband en instroomplaat
   vochtig afnemen, nieuw filter met de pijl naar onder, ijken. Niet uitkloppen of uitblazen. Een test controleert dat
   geen enkele uitvoer nog uitkloppen aanraadt.
4. **Afvoer.** De lucht gaat onder het blad naar achteren, de salon in. Wie het fijne stof ook buiten wil: een slang
   van onder de module naar buiten (latere optie).
5. **Bereikbaarheid van de waaier (V3-11).** Toestanden, met wat er tussen een vinger en de waaier zit:

   | Toestand | Wat er tussen zit | Rechte proef Ø12 (testvinger) |
   |---|---|---|
   | bedrijf | RVS-plaat (openingen tot 18 mm), filter (30 mm geplooid, zacht: telt niet als afscherming), vast vingerrooster in het oog (spleten 10,4 mm, 3 mm dik), 2 mm lucht | gaat niet door het vingerrooster |
   | service (plaat en filter eruit, schakelaar uit) | alleen het vingerrooster; de plaat is gelijmd en blijft | gaat niet door het vingerrooster |
   | tolerantie | ribben 1,6 ± 0,2 en steek 12 ± 0,1 (geprint): spleet hoogstens 10,8 mm | gaat niet door |

   Dit is een rekenkundige controle met de maten uit het model, geen keuring; de testvinger (IEC 61032, probe B) wordt
   in poort W1 op de unit gezet. Er wordt geen universele openingsnorm geclaimd. De procedure blijft: eerst
   uitschakelen en stilstand, ook al houdt het rooster een vinger tegen.
6. **Morsroute (V3-11).** Gemorste vloeistof op het rooster (ontsmettingsmiddel, aceton, nagellak) valt op het
   filter en wordt erin opgezogen; wat er doorheen gaat, druppelt door het vingerrooster op de waaier en met de
   uitblaaslucht door de lamellen van de bodemplaat onder het blad. Daar zit geen elektronica: de voedingsbox hangt
   40 mm achter de module en maar 36 mm onder het blad, de uitblaas zit op 82 mm en gaat eronder door; de M8-bus in
   de achterwand en de ventilator werken op 24 V (SELV): geen schokgevaar. Wat te doen: uitschakelen, filter vervangen, de module laten drogen. Aceton tast PETG aan
   (`Materiaalstaat.md`): na een acetonspat de plaat afnemen en het filter vervangen. Geen open vlam of verwarmd
   gereedschap boven het rooster.

## 3. Draagconstructie (E10)

- **Module:** de klauwen klemmen onder de onderhuid van het blad (vezelplaat ±3 mm) rond de uitsparing. LAGKAPTEN is
  vanbinnen een honingraat; de klemkracht moet dus beperkt blijven. Op de arm van elke klauw zit een rubberkussen
  (neopreen Shore A 40, 4 mm): draai de M5-schroef tot het rubber het blad raakt en dan precies één slag. Dat geeft
  22 tot 32 N per klauw, onder de 45 N van de blijvende spanning in PETG (Berekeningen.md, hoofdstuk 6; V3-07). Het
  gewicht rust op het frame.
- **Voedingsbox:** 4 pluggen voor holle deuren in de onderhuid naast de uitsparing; de box weegt ongeveer 0,7 kg.
- **Te bewijzen:** zie poort M hieronder (uittrekken, kruip, warmte).

## 3b. Werkplek (maten uit het model, bureau LAGKAPTEN 1400 x 600 x 34 op twee ALEX, blad 734 mm hoog)

| Wat | Maat | Gevolg / controle in W1 |
|---|---|---|
| module | midden van het blad: 300 mm van de voorrand, 189 mm vrije rand voor het frame | de onderarm van de klant ligt op het blad of het rooster, de nagel 50 tot 100 mm boven het rooster (vangst: Berekeningen.md, hoofdstuk 1) |
| onderkant module | 116 mm onder het blad, dus 618 mm boven de vloer, tussen 195 en 405 mm vanaf de voorrand (de romp; het frame boven het blad loopt van 189 tot 411) | dijen en knieën van de medewerker aan de voorkant: vrij als de bovenkant van de dij onder 618 mm blijft of de knie niet verder dan 195 mm onder het blad komt; proef met de grootste gebruiker en de stoel op werkhoogte |
| vrije ruimte tussen de ladekasten | 680 mm breed | de module (210 breed) staat in het midden, beide knieën ernaast is niet mogelijk: knieën vóór de module |
| knop | 250 mm rechts van het midden, 100 mm van de voorrand, 16 mm boven het blad | met de rechterhand te bereiken zonder te leunen; linkshandig: de mal en `M.dial` spiegelen (x = -250) |
| voedingsbox | 495 mm van de voorrand, 71 mm onder het blad (rand + bak) | achter de knieën, buiten de beenruimte; netsnoer langs de achterpoot |
| kabels | M8 en slangetje in een sleuf van 29 x 7 onder het blad, USB-C van de knop in een sleuf van 5 x 5; de stekkers (M8 aan de achterwand van de module op 80 mm onder het blad, USB-C aan de box en de knophouder) steken hoogstens 40 mm uit | geen kabel in de beenruimte: alles ligt achter de module of tussen box en knop; buigradius USB-C (haaks) en M8 ≥ 5 x kabeldiameter aan de connector |
| uitblaas | onder de module naar achteren, op 618 mm hoogte | geen tocht op de benen van de klant (W1: hand op kniehoogte aan de klantkant) |
| armsteun | geen: de onderarm rust op het blad of op de RVS-plaat (4 mm hoger, randen afgerond R6) | geen drukplek op de pols (W1) |

## 4. Meetplan en acceptatie

Meet op één complete, gemonteerde unit van deze revisie. Leg bij elke meting de revisie (git-commit), het
filterproduct, de stand (%), het toerental en de omgeving vast.

| Poort | Meting | Hoe | Acceptatie |
|---|---|---|---|
| L1 | debiet en drukval | Q-Δp bij 20, 40, 60, 70, 75, 80, 100 %, met een schoon en een vol interieurfilter; toerental en vermogen | curve vastgelegd; het werkpunt bij de dagstand ligt op de curve van de ventilator; de vervangfactoren in regel.h blijven onder de gemeten grens |
| L2 | vangst bij de bron | rookproef en anemometer op de plaats van de handen (10 cm boven de plaat), met handen en frees | rook gaat zichtbaar naar het rooster; luchtsnelheid ≥ 0,5 m/s op 10 cm |
| L3 | lek langs het filter | deeltjesteller voor en na de unit, schoon en na 3 filterwissels | gemeten rendement ≥ 90 % van het filterproduct; geen daling na de wissels |
| L4 | blootstelling | stofmeting op ademhoogte van klant en medewerker tijdens een normale behandeling | beoordeeld door een deskundige (preventieadviseur of arbeidshygiënist) volgens de Belgische regels |
| G1 | geluid | dB(A) op oorhoogte van beide personen, achtergrond apart | dagstand 80 %: ≤ 70 dB(A) op de oorpositie van de medewerker, 75 %: ≤ 69 dB(A) (Berekeningen.md 3d) |
| E1 | warmte | 4 uur op 100 %: adapter, box, M8-connectoren, ventilatormotor | alle onderdelen binnen hun specificatie met ≥ 10 °C marge |
| E2 | elektrische eindcontrole | door een elektricien: netsnoer en adapter, aarding, zekering -F1, kabels en trekontlasting; kortsluiting in de USB-C-kabel naar de knop (wat doet de ventilator); ESP32-C3 aan een computer terwijl de box aan staat (geen terugvoeding door -V1) | goedgekeurd; DC-schakelaar is geen netisolatie: stekker eruit voor onderhoud |
| F1 | firmware op de hardware | foutinjectie: meter los, slang los of omgekeerd, stilstand, UIT tijdens ijken, radio weg tijdens boost, stroomuitval, tweede set | gedrag zoals de tests in `test_regel`; geen oude drukwaarde op het scherm |
| M1 | bevestiging | klauwen met rubber: tot contact + 1 slag op een stuk LAGKAPTEN; uittrekken en 7 dagen belasting; ook de box | geen loskomen, geen zichtbare vervorming of indruk in de onderhuid |
| M2 | printpassing | testcoupons: moerkamers, paaltjes, filter op de foamband in de geleiderand, deksel | passen zonder forceren |
| M3 | lijm en reiniging | UHU plus endfest 300 op twee geschuurde PETG-strips en een magneet in een frame-coupon (24 uur); een PETG-coupon 1 week dagelijks afnemen met het ontsmettingsmiddel (`docs/Materiaalstaat.md`) | niet met de hand los te krijgen; geen zwelling, geen dof of plakkerig oppervlak |
| O1 | onderhoud | 10 filterwissels met de procedure van punt 2.3; twee merken (MANN en Filtron) | geen stofwolk, de foamband blijft dicht (L3 opnieuw) |
| W1 | werkplek | 1:1-proef met twee personen: knieën, polsen, knop, kabels, uitblaas; testvinger (IEC 61032, probe B) in bedrijf en in service | geen hinder; de testvinger raakt de waaier niet; niemand zet de stand lager dan de bewezen minimumstand |

**Vrijgave:** pas als alle poorten groen zijn op dezelfde revisie, met een kort meetverslag. Daarna stelt de
firmware de minimale toegestane stand in op de bewezen minimumstand (nu 20 %, `Instellingen.minPct`).

## 5. Wat Ian beslist

- ~~Filtervariant~~: beslist op 2026-11-08, interieurfilter MANN CU 20 013 (eerder, 2026-11-07: Rittal-mat).
- ~~Afdichting~~: beslist op 2026-11-08, zachte foamband.
- ~~Montagegrens klauwen~~: beslist op 2026-11-08, rubberkussen op de arm (tot contact + 1 slag).
- Of een deskundige de blootstelling meet (aanbevolen voor gebruik met klanten).
- ~~C++-compiler~~: geïnstalleerd (WinLibs GCC 16.2, 2026-11-07); de firmwaretests slagen.
