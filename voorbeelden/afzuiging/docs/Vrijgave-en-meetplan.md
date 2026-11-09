# Afzuiging: beschermingsconcept, meetplan en vrijgave

Revisie: versie 7.1 (2026-11-08). Dit document hoort bij de eindverslagen v1 (3,1/10), v2 (5,0/10), v3 (5,6/10) en v4 (6,4/10); de berekeningen staan in `Berekeningen.md` (gemaakt door `berekeningen.py`). Het legt vast wat het
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
| V4-04 toerental | bewaking "toerental wijkt af" als het werkelijke toerental 10 s lang meer dan 3 % naast het doel ligt of de bijregeling op haar grens zit: dan geen filteroordeel |
| V4-12 herstart en UIT | elke start van de box krijgt een nieuw startnummer; AAN wordt alleen aanvaard met dat nummer: na een herstart blijft de afzuiging UIT tot een nieuwe handeling; zonder verse status toont de knop "UIT?" of "AAN?" |
| V4-13 ijken en filter | ijken pas na "Nieuw filter?" bevestigen; een ijking > 15 % boven de eerste ijking wordt geweigerd; onder 0,70 x schoon: "filter ontbreekt of sluit niet af"; de balk heet drukreserve |
| V4-14 opgeslagen ijking | volledig nagekeken voor ze geladen wordt (eindig, bereik, stijgend); anders blijft de vorige |
| V4-11 koppelen | de knop neemt het eerste antwoord en bevestigt het gericht; pas dan bewaart de module de koppeling; mislukte radiohandelingen tellen niet als verbinding |
| V4-10 boost | het tegoed begint na elke start op 0: hoogstens 1/5 van de tijd op 100 %, ook over herstarts |
| V4-03 eindpunt | het filter wordt vervangen bij de melding; het rekenblad leest de grenzen uit regel.h en controleert 36 scenario's per stand, met een mutatieproef |
| V4-05 fouten | -Q2 maakt de ventilator spanningsloos zonder besturing; -C2 aan VIN; waarheidstabel in Berekeningen.md hoofdstuk 4 |

De firmwarebeslissingen zitten in `firmware/include/regel.h` en `firmware/include/bediening.h` en zijn beschreven in 44 tests
(`firmware/test/test_regel`). Die tests draaien op de pc met `python -m platformio test -e native` (GCC 16.2, WinLibs):
44 van de 44 geslaagd op 2026-11-08; beide programma's bouwen.

## 2. Beschermingsconcept (E01, E04, E12, E13)

**Doel:** nagelstof bij de bron wegzuigen, weg van het gezicht van klant en medewerker, en het meeste fijne stof
tegenhouden. Ontwerpbesluit van Ian (2026-11-08): een gewoon interieurfilter van een auto, overal te koop en zonder
knippen te vervangen. Het is geen HEPA-filter en vangt geen dampen (aceton, monomeer): de salon moet goed geventileerd
zijn.

1. **Filter (gekozen).** Interieurfilter (pollenfilter) MANN CU 20 013, 195 x 145 x 30 mm, geplooid deeltjesfilter, voor
   de Toyota Aygo II, Peugeot 108 en Citroën C1 II; gelijk: Bosch 1 987 435 066, Valeo 715828, Purflux AH495, Mahle
   LA 1174, Filtron K 1347A (196 x 145 x 30). **Vangst:** de fabrikant geeft geen curve; de literatuur (Johansson e.a.,
   AIVC 1999) geeft voor betere interieurfilters ongeveer 45 % bij 0,1 tot 0,35 µm. Wij beloven geen vangstgetal voor het
   filter (bron per bewering: README, "Wat het filter wel en niet doet"); poort L3 meet het.
   **Uitgerekend (Berekeningen.md):** 55 tot 115 Pa bij 250 m³/h op het hele front (een schatting uit proeven, geen
   fabrikantcurve); het rekenblad neemt de bovengrens op het vrije front: 130 Pa. Met de volle band (36 scenario's) is
   **80 % de laagste beschermende stand en de dagstand**. Het eindpunt van het filter is de melding van de firmware.
   Poort L1 meet het echte filter.
   **Ophoogte boven het rooster:** zie Berekeningen.md hoofdstuk 1: 0,5 m/s op 10 cm vraagt 190 m³/h, op 15 cm 360 m³/h.
   De vroegere keuze (Rittal-mat, 2026-11-07) staat ter vergelijking in het rekenblad.
2. **Afdichting (V4-02).** Het filter ligt op een zachte foamband in een geleiderand (1 mm speling rondom). De
   afdichting is een lip van zelfklevend siliconenrubber (0,5 mm, Shore A 60) op de geleiderand, 2,5 mm over de rand
   van het filter: bij het inleggen buigt het filter haar naar onder, ze ligt rondom tegen de zijkant en de onderdruk
   drukt haar in de spleet. Maatketen (kleinste en grootste filter, naar één kant geschoven, hoogte 29 tot 31) en de
   lekberekening: Berekeningen.md 6c. Ontbreekt het filter of ligt het scheef, dan meldt de knop "filter ontbreekt of
   sluit niet af" (onder 0,70 x schoon); een kleine kier ziet de drukmeter niet, daarom de controle bij elke wissel.
   Poort L3 meet of er lucht langs gaat; O1 controleert de lip na 10 wissels.
3. **Onderhoud.** Eén procedure (`onderhoud.mjs`, ook in de README en het bouwschema): knop uit, schakelaar op de box
   uit, 10 s wachten tot de ventilator stilstaat, dan het filter horizontaal in een zak, lip, foamband en instroomplaat
   vochtig afnemen, nieuw filter met de pijl naar onder, de lip rondom nakijken, ijken (bevestigd).
   Niet uitkloppen en niet uitblazen. Daarnaast "Na morsen" en "Eens per jaar" (zelfde bestand).
   Een test controleert dat geen enkele uitvoer nog uitkloppen aanraadt.
4. **Afvoer.** De lucht gaat onder het blad naar achteren, de salon in. Wie het fijne stof ook buiten wil: een slang
   van onder de module naar buiten (latere optie).
5. **Bereikbaarheid van de waaier (V3-11).** Toestanden, met wat er tussen een vinger en de waaier zit:

   | Toestand | Wat er tussen zit | Rechte proef Ø12 (testvinger) |
   |---|---|---|
   | bedrijf | RVS-plaat (openingen tot 18 mm), filter (30 mm geplooid, zacht: telt niet als afscherming), vast vingerrooster in het oog (spleten 10,4 mm, ribben 7 mm hoog, twee ringen), 2 mm lucht | gaat niet door het vingerrooster |
   | service (plaat en filter eruit, schakelaar uit) | alleen het vingerrooster; de plaat is gelijmd en blijft | gaat niet door het vingerrooster |
   | tolerantie | ribben 1,6 ± 0,2 en steek 12 ± 0,1 (geprint): spleet hoogstens 10,8 mm | gaat niet door |

   **Sterkte (V4-07):** balkrooster met 10 N op elke plaats: hoogstens 0,73 mm doorbuiging tegen 1,75 mm vrije ruimte
   (na printtolerantie), factor 2,4 (Berekeningen.md 6b).

   Dit is een rekenkundige controle met de maten uit het model, geen keuring; de testvinger (IEC 61032, probe B) wordt
   in poort W1 op de unit gezet. Er wordt geen universele openingsnorm geclaimd. De procedure blijft: eerst
   uitschakelen en stilstand, ook al houdt het rooster een vinger tegen.
6. **Morsroute (V4-09).** Begrensd scenario: een fles van 15 ml valt om op het rooster. Het filter houdt 38 tot 113 ml
   vast (AANNAME, Berekeningen.md 7): de vloeistof blijft in het filter. Wat er toch door komt, valt door het
   vingerrooster op de waaier en met de uitblaaslucht door de lamellen onder het blad; daar zit geen elektronica (de
   voedingsbox hangt 40 mm achter de module en 36 mm onder het blad) en alles werkt op 24 V. Aceton tast PETG aan.
   Daarom de vaste procedure "Na morsen" (`onderhoud.mjs`, README): schakelaar uit, filter weg, inspectie met een
   zaklamp, bij vloeistof voorbij het filter de module eruit (M8 los, klauwen los, bodemplaat los), afkeurgrenzen
   (wit, zacht of plakkerig PETG; gezwollen lip; waaier die niet vrij draait; brandgeur), een uur drogen, inbouwen,
   nieuw filter, ijken, en pas weer gebruiken zonder rode of oranje melding. Geen open vlam of verwarmd gereedschap
   boven het rooster.

## 3. Draagconstructie (E10)

- **Module:** de klauwen klemmen onder de onderhuid van het blad (vezelplaat ±3 mm) rond de uitsparing. LAGKAPTEN is
  vanbinnen een honingraat; de klemkracht moet dus beperkt blijven. Op de arm van elke klauw zit een rubberkussen
  (neopreen Shore A 40, 4 mm): draai de M5-schroef tot het rubber het blad raakt en dan een halve slag. Met de echte
  contactzone (9,5 tot 17 mm van de as), Shore 35 tot 45, koud en warm geeft dat 9 tot 13 N per klauw, marge 1,9 op de
  blijvende spanning in PETG (Berekeningen.md, hoofdstuk 6; V4-06). De knopklauwen hebben hetzelfde rubber (3 mm) en
  dezelfde regel: 7 tot 9 N, marge 1,7. Het gewicht rust op het frame.
- **Voedingsbox:** 4 spaanplaatschroeven 4 x 16 verzonken in de onderhuid naast de uitsparing (voorboren Ø2,5 x 14);
  de box weegt ongeveer 0,7 kg (2 N per schroef; met 20 N trek aan een kabel hoogstens 12 N op één schroef).
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
| L1 | debiet en drukval | Q-Δp bij 20, 40, 60, 75, 80, 90, 100 %, met een schoon filter en een filter op het moment van de melding; toerental en vermogen | curve vastgelegd; het werkpunt bij de dagstand ligt op de curve van de ventilator; bij de melding nog ≥ 190 m³/h op 80 % |
| L2 | vangst bij de bron | rookproef en anemometer op de plaats van de handen (10 cm boven de plaat), met handen en frees | rook gaat zichtbaar naar het rooster; luchtsnelheid ≥ 0,5 m/s op 10 cm |
| L3 | lek langs het filter | deeltjesteller voor en na de unit, schoon en na 3 filterwissels | gemeten rendement ≥ 90 % van het filterproduct; geen daling na de wissels |
| L4 | blootstelling | stofmeting op ademhoogte van klant en medewerker tijdens een normale behandeling | beoordeeld door een deskundige (preventieadviseur of arbeidshygiënist) volgens de Belgische regels |
| G1 | geluid | dB(A) op oorhoogte van beide personen, achtergrond apart | dagstand 80 %: ≤ 72 dB(A) op de oorpositie van de medewerker (model 70,2 plus 1,5 dB budget, Berekeningen.md 3d) |
| E1 | warmte | 4 uur op 100 %: adapter, box, M8-connectoren, ventilatormotor | alle onderdelen binnen hun specificatie met ≥ 10 °C marge |
| E2 | elektrische eindcontrole | door een elektricien: netsnoer en adapter, aarding, zekering -F1, kabels en trekontlasting; de waarheidstabel (Berekeningen.md 4): 5 V weg met 24 V aan, reset en flashen, kortsluiting in de USB-C-kabel naar de knop; ESP32-C3 aan een computer terwijl de box aan staat (geen terugvoeding door -R12) | goedgekeurd; in elke fouttoestand van de tabel staat de ventilator stil; DC-schakelaar is geen netisolatie: stekker eruit voor werk aan de box |
| F1 | firmware op de hardware | foutinjectie: meter los, slang los of omgekeerd, stilstand, toerental afgeremd, UIT tijdens ijken, radio weg tijdens boost en tijdens UIT, alleen de box herstarten, stroomuitval, filter eruit, twee sets tegelijk koppelen | gedrag zoals de tests in `test_regel`; geen oude drukwaarde op het scherm; na een herstart van de box UIT |
| M1 | bevestiging | klauwen met rubber (module en knop): tot contact + een halve slag op een stuk LAGKAPTEN; uittrekken en 7 dagen belasting; de schroeven van de box: 30 N trekken | geen loskomen, geen zichtbare vervorming of indruk in de onderhuid |
| M2 | printpassing | testcoupons: moerkamers, paaltjes, filter met lip in de geleiderand (MANN en Filtron), deksel | passen zonder forceren; de lip ligt rondom aan |
| M3 | lijm en reiniging | UHU plus endfest 300 op twee geschuurde PETG-strips en een magneet in een frame-coupon (24 uur); een PETG-coupon 1 week dagelijks afnemen met het ontsmettingsmiddel (`docs/Materiaalstaat.md`) | niet met de hand los te krijgen; geen zwelling, geen dof of plakkerig oppervlak |
| O1 | onderhoud | 10 filterwissels met de procedure van punt 2.3; twee merken (MANN en Filtron); eenmaal de procedure "Na morsen" met water | geen stofwolk, de lip blijft rondom aanliggen (L3 opnieuw) |
| W1 | werkplek | 1:1-proef met twee personen: knieën, polsen, knop, kabels, uitblaas; testvinger (IEC 61032, probe B) met 10 N, in service, schakelaar uit en ventilator stil | geen hinder; de testvinger raakt de waaier niet; niemand zet de stand lager dan 80 % |

**Vrijgave:** pas als alle poorten groen zijn op dezelfde revisie, met een kort meetverslag. Daarna stelt de
firmware de minimale toegestane stand in op de bewezen minimumstand (nu 20 %, `Instellingen.minPct`).

## 5. Wat Ian beslist

- ~~Filtervariant~~: beslist op 2026-11-08, interieurfilter MANN CU 20 013 (eerder, 2026-11-07: Rittal-mat).
- ~~Afdichting~~: beslist op 2026-11-08, zachte foamband; in 7.1 (verslag v4) de siliconenlip als afdichting erbij (de foamband draagt nog), zonder meerprijs boven € 20.
- ~~Montagegrens klauwen~~: beslist op 2026-11-08, rubberkussen op de arm; in 7.1 een halve slag na contact (de echte contactzone gaf bij een hele slag te weinig marge).
- Of een deskundige de blootstelling meet (aanbevolen voor gebruik met klanten).
- ~~C++-compiler~~: geïnstalleerd (WinLibs GCC 16.2, 2026-11-07); de firmwaretests slagen.
