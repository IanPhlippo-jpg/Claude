# Afzuiging: beschermingsconcept, meetplan en vrijgave

Revisie: versie 7.2 (2026-11-12). Dit document hoort bij de eindverslagen v1 (3,1/10), v2 (5,0/10), v3 (5,6/10) en v4 (6,4/10) en bij het advies van Fable 5.2 (2026-11-12); de berekeningen staan in `Berekeningen.md` (gemaakt door `berekeningen.py`), de risicoanalyse en de CE-vragen in `Risicoanalyse-en-CE.md`. Het legt vast wat het
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
| E09 radio | koppeling per set (MAC en sleutel, versleuteld), volgnummers; boost vervalt in de module na 120 s; bij verbindingsverlies draait de module op de laatste gewone stand, hoogstens 10 min (7.2) |
| E11 G01 | de 9TG24P0G01 (93,6 W) is geschrapt: alleen de 9TG24P0S01 (56 W) op de adapter van 90 W |
| E12 uitkloppen | geschrapt in de UI en de handleiding: filter in een zak vervangen |
| E14 instructies | freesmaten, USB-printjes, schakelaar C&K D502 in de voorwand, zekering Bel 0697W (72 V DC), M8 binder 718 overal gelijk |
| V4-03 tot V4-14 | zie revisie 7.1 (toerentalvolging, herstart, ijken, koppelen, boosttegoed, eindpunt, -Q2, -C2) |
| F52-1 vangst en geluid | werkhoogte 10 cm vastgelegd (15 cm alleen boost); verdeelruimte 15,5 mm; filter 3 tot 5 mm onder de plaat; rooster open fractie 0,30 -> 0,46 (werkzaam); 75 % is nu beschermend; ventilator op rubberbuffers; handen op het rooster in het rekenblad (3e) |
| F52-2 afvoer | geen afvoer naar buiten (bewust, Ian 2026-11-12); uitblaas opzij en naar onder, niet langs de box; koolfilter als optie (Castrol CC0356C Carbon+, zelfde maat); L3 met PM2,5-criterium, L4 verplicht |
| F52-3 valse filtermelding | minimum over 5 min, hysterese (blijft tot een nieuwe ijking, ook na een herstart), "ander merk filter" als eigen handeling, ijking zonder filter geweigerd; tests "hand op rooster", schommelingen en "ander merk" |
| F52-4 aanraakveiligheid | vingerrooster volgens EN ISO 13857 tabel 4 (spleet ≤ 5,9 mm, 14 mm tot de waaier); stop na 3 s zonder filter of luchtstroom op elke stand; task-watchdog op module en knop; risicoanalyse en CE in een eigen document |
| F52-5 tafelblad | latten tussen de huiden rond beide uitsparingen, schroeven van de box in hout, MDF-freesmal met kopieerring, doorbuigberekening (6d) en doorbuigproef (M1) |
| F52 klein | ompolingsbeveiliging -R13; RC en ontdendering op de tacho, periodemeting; draad 0,5 mm² / M8 4 x 0,25 mm² overal gelijk; Besparingen gecorrigeerd (klasse I); opbouwtekening van de print (schema blad 11); 0 % PWM = stil nagekeken in de datasheet; "+"-poort afgeschermd; acetonproef; persbouten tegen verschuiven; time-out zonder knop en automatisch uit; koppelsleutel via X25519 |

De firmwarebeslissingen zitten in `firmware/include/regel.h` en `firmware/include/bediening.h` en zijn beschreven in 55 tests
(`firmware/test/test_regel`). Die tests draaien op de pc met `python -m platformio test -e native` (GCC, WinLibs):
55 van de 55 geslaagd op 2026-11-12; beide programma's (`knop` en `module`) bouwen.

## 2. Beschermingsconcept (E01, E04, E12, E13)

**Doel:** nagelstof bij de bron wegzuigen, weg van het gezicht van klant en medewerker, en het grove stof
tegenhouden. Ontwerpbesluit van Ian (2026-11-08): een gewoon interieurfilter van een auto, overal te koop en zonder
knippen te vervangen. Het is geen HEPA-filter en vangt geen dampen (aceton, monomeer): de salon moet goed geventileerd
zijn.

1. **Filter (gekozen).** Interieurfilter (pollenfilter) MANN CU 20 013, 195 x 145 x 30 mm, geplooid deeltjesfilter, voor
   de Toyota Aygo II, Peugeot 108 en Citroën C1 II; gelijk: Bosch 1 987 435 066, Valeo 715828, Purflux AH495, Mahle
   LA 1174, Filtron K 1347A (196 x 145 x 30). **Vangst:** de fabrikant geeft geen curve; de literatuur (Johansson e.a.,
   AIVC 1999) geeft voor betere interieurfilters ongeveer 45 % bij 0,1 tot 0,35 µm. Wij beloven geen vangstgetal voor het
   filter (bron per bewering: README, "Wat het filter wel en niet doet"); poort L3 meet het met een absoluut criterium.
   **Uitgerekend (Berekeningen.md):** 55 tot 115 Pa bij 250 m³/h op het hele front (een schatting uit proeven, geen
   fabrikantcurve); het rekenblad neemt de bovengrens op het vrije front: 130 Pa. Met de volle band (36 scenario's) is
   **75 % de laagste beschermende stand** (7.1: 80 %). Het eindpunt van het filter is de melding van de firmware.
   Poort L1 meet het echte filter.
   **Werkhoogte (7.2):** 10 cm boven het rooster. 0,5 m/s op 10 cm vraagt 190 m³/h, op 15 cm 360 m³/h: dat haalt alleen
   boost met een schoon filter (Berekeningen.md hoofdstuk 1). Wie hoger werkt, vangt minder: de handleiding en de knop
   zeggen 10 cm.
   **Koolfilter (optie, niet doorgerekend):** Castrol Filters CC0356C "Carbon+" heeft dezelfde maat (195 x 145 x 30). Een
   MANN CUK 20 013 vonden we niet. Met een koolfilter: "ander merk filter" ijken en L1 en L3 opnieuw.
2. **Afdichting (V4-02).** Het filter ligt op een zachte foamband in een geleiderand (1 mm speling rondom). De
   afdichting is een lip van zelfklevend siliconenrubber (0,5 mm, Shore A 60) op de geleiderand, 2,5 mm over de rand
   van het filter: bij het inleggen buigt het filter haar naar onder, ze ligt rondom tegen de zijkant en de onderdruk
   drukt haar in de spleet. Maatketen en lekberekening: Berekeningen.md 6c. Ontbreekt het filter of ligt het scheef,
   dan stopt de ventilator na 3 s (onder 0,70 x schoon); een kleine kier ziet de drukmeter niet, daarom de controle
   bij elke wissel. Poort L3 meet of er lucht langs gaat; O1 controleert de lip na 10 wissels.
3. **Onderhoud.** Eén procedure (`onderhoud.mjs`, ook in de README en het bouwschema): knop uit, schakelaar op de box
   uit, 10 s wachten tot de ventilator stilstaat, dan het filter horizontaal in een zak, lip, foamband en instroomplaat
   vochtig afnemen, nieuw filter met de pijl naar onder, de lip rondom nakijken, ijken (bevestigd).
   Niet uitkloppen en niet uitblazen. Daarnaast "Na morsen" en "Eens per jaar" (zelfde bestand).
   Een test controleert dat geen enkele uitvoer nog uitkloppen aanraadt.
4. **Afvoer (7.2).** De lucht gaat uit de kuip opzij (lamellen onder 45° naar onder, in 12 sectoren van ±15 tot ±70° rond
   de X-as: vooral naar de ladekasten; de buitenste sectoren wijzen schuin naar voor en naar achter, maar 45° omlaag, zodat
   de lucht onder de voedingsbox door gaat) en naar onder (ringsleuven), onder het blad, de salon in. W1 kijkt of er tocht
   op de benen komt; zo ja, de buitenste sectoren dichtmaken en het rekenblad opnieuw draaien met 2/3 van de lamellen. **Een afvoer naar buiten
   is bewust niet gekozen (Ian, 2026-11-12).** Gevolg: het fijne stof dat door het filter gaat en alle dampen blijven in de
   salon. Daarom: aparte ventilatie van de salon, en **poort L4 is verplicht** vóór gebruik met klanten.
5. **Bereikbaarheid van de waaier (V3-11, F52-4).** Toestanden, met wat er tussen een vinger en de waaier zit:

   | Toestand | Wat er tussen zit | EN ISO 13857 tabel 4 |
   |---|---|---|
   | bedrijf | RVS-plaat (sleuven 5 mm, zonder gereedschap af te nemen: telt niet), filter (zacht, los: telt niet), vast vingerrooster in het oog (spleten 5,6 mm, ribben 12 mm hoog), 2 mm lucht | sleuf 4 < e ≤ 6: 10 mm nodig, 14 mm aanwezig: voldoet |
   | service (plaat en filter eruit) | alleen het vingerrooster; de instroomplaat is gelijmd en blijft; zonder filter stopt de ventilator na 3 s | idem |
   | tolerantie | ribben 1,6 ± 0,2 en steek 7,2 ± 0,1 (geprint): spleet hoogstens 5,9 mm | blijft in 4 < e ≤ 6 |
   | onder het blad | de lamellen van de kuip: banden van 4 mm (loodrecht 2,8 mm), de ringsleuven 4 mm breed; de waaier zit 7 mm achter de wand | e ≤ 4: 2 mm nodig: voldoet |

   **Sterkte (V4-07):** balkrooster met 10 N op elke plaats: hoogstens 0,12 mm doorbuiging tegen 1,75 mm vrije ruimte
   (Berekeningen.md 6b).

   Dit is een rekenkundige controle met de maten uit het model, geen keuring; de testvinger (IEC 61032, probe B) wordt
   in poort W1 op de unit gezet. De procedure blijft: eerst uitschakelen en stilstand, ook al houdt het rooster een vinger
   tegen. De stop zonder filter is een aanvulling (geen veiligheidsfunctie met een prestatieniveau; zie de risicoanalyse).
6. **Morsroute (V4-09).** Begrensd scenario: een fles van 15 ml valt om op het rooster. Het filter houdt 38 tot 113 ml
   vast (AANNAME, Berekeningen.md 7): de vloeistof blijft in het filter. Wat er toch door komt, valt door het
   vingerrooster op de waaier en wordt tegen de kuip geslingerd en naar buiten (onder het blad); daar zit geen elektronica
   (de voedingsbox hangt erachter, buiten de uitblaas) en alles werkt op 24 V. Aceton tast PETG aan (proef M3).
   Daarom de vaste procedure "Na morsen" (`onderhoud.mjs`, README). Geen open vlam of verwarmd gereedschap boven het rooster.

## 3. Draagconstructie (E10, F52-5)

- **Module:** het frame ligt met een rand van 5 mm op de bovenhuid; daaronder zit sinds 7.2 rondom een lat van 28 x 44 mm
  tussen de huiden (gelijmd). De klauwen klemmen onder de onderhuid op dezelfde latten. Op de arm van elke klauw zit een
  rubberkussen (neopreen Shore A 40, 4 mm): draai de M5-schroef tot het rubber het blad raakt en dan een halve slag.
  Met de echte contactzone (9,5 tot 17 mm van de as), Shore 35 tot 45, koud en warm geeft dat 9 tot 13 N per klauw, marge
  1,9 op de blijvende spanning in PETG (Berekeningen.md, hoofdstuk 6). Het gewicht rust op het frame.
- **Voedingsbox:** 4 spaanplaatschroeven 4 x 16 verzonken door de onderhuid in hout: vooraan in de achterste lat van de
  module (28 x 38), achteraan in een lat van 10 x 30 tegen de onderhuid; de box weegt ongeveer 0,7 kg.
- **Blad:** doorbuiging met de gaten in de vrije overspanning van 680 mm: Berekeningen.md 6d (met 15 kg in het midden
  hoogstens ongeveer 2,6 mm; de kern en de huiden zijn aannames). IKEA geeft 50 kg verdeeld en 15 kg geconcentreerd.
  Alternatief: een massief blad (multiplex 30 mm of eiken 26 tot 30 mm).
- **Te bewijzen:** zie poort M hieronder (doorbuiging, uittrekken, kruip, warmte).

## 3b. Werkplek (maten uit het model, bureau LAGKAPTEN 1400 x 600 x 34 op twee ALEX, blad 734 mm hoog)

| Wat | Maat | Gevolg / controle in W1 |
|---|---|---|
| module | midden van het blad: 300 mm van de voorrand, 189 mm vrije rand voor het frame | de onderarm van de klant ligt op het blad of het rooster, de nagel tot 100 mm boven het rooster (vangst: Berekeningen.md, hoofdstuk 1) |
| onderkant module (7.2) | de vierkante romp 70 mm onder het bovenvlak (664 mm boven de vloer, 195 tot 405 mm van de voorrand); de ronde kuip (Ø189) eronder: de rand 110 mm onder het bovenvlak (624 mm boven de vloer, vanaf 205 mm van de voorrand), het midden van de bolle bodem 136 mm (598 mm boven de vloer, 300 mm van de voorrand) | aan de voorrand van de module meer ruimte dan in 7.1 (618 mm overal), in het midden 20 mm minder; proef met de grootste gebruiker en de stoel op werkhoogte |
| vrije ruimte tussen de ladekasten | 680 mm breed | de module staat in het midden, beide knieën ernaast is niet mogelijk: knieën vóór de module |
| knop | 250 mm rechts van het midden, 100 mm van de voorrand, 16 mm boven het blad | met de rechterhand te bereiken zonder te leunen; linkshandig: de mal en `M.dial` spiegelen (x = -250) |
| voedingsbox | 495 mm van de voorrand, 71 mm onder het blad (rand + bak) | achter de knieën, buiten de beenruimte; netsnoer langs de achterpoot |
| kabels | M8 en slangetje in een sleuf van 29 x 7 onder het blad, USB-C van de knop in een sleuf van 5 x 5 | geen kabel in de beenruimte |
| uitblaas (7.2) | uit de kuip opzij (naar de ladekasten) en naar onder, tussen 624 en 598 mm hoogte | geen tocht op de benen van de klant en geen lucht langs de ventilatiesleuven van de box (W1: hand op kniehoogte, rookproef bij de box) |
| armsteun | geen: de onderarm rust op het blad of op de RVS-plaat (4 mm hoger, randen afgerond R6) | geen drukplek op de pols; de plaat schuift niet (persbouten) |

## 4. Meetplan en acceptatie

Meet op één complete, gemonteerde unit van deze revisie. Leg bij elke meting de revisie (git-commit), het
filterproduct, de stand (%), het toerental en de omgeving vast.

**Stap 0 (eerst, F52-1f): proefopstelling.** Vóór er iets geprint of gefreesd wordt: de ventilator, een filter MANN CU 20 013
en een rooster (of een geprinte proefplaat met dezelfde open fractie) in een eenvoudige kast van MDF met dezelfde
binnenmaten (verdeelruimte 15,5 mm, oog Ø127) en dezelfde uitblaasopening. Daarop L1 (Q-Δp), L2 (vangst op 10 en 15 cm) en
G1 (geluid op 0,5 m) bij 75, 80 en 100 %. Valt het debiet lager uit dan het rekenblad, dan eerst het model bijstellen
(vervangfactoren en de laagste beschermende stand) voor er verder gebouwd wordt.

| Poort | Meting | Hoe | Acceptatie |
|---|---|---|---|
| L1 | debiet en drukval | Q-Δp bij 20, 40, 60, 75, 80, 90, 100 %, met een schoon filter en een filter op het moment van de melding; toerental en vermogen; eerst op de proefopstelling (stap 0) | curve vastgelegd; het werkpunt bij de dagstand ligt op de curve van de ventilator; bij de melding nog ≥ 190 m³/h op 75 % |
| L2 | vangst bij de bron | rookproef en anemometer op de plaats van de handen (10 cm boven de plaat), met handen en frees; ook op 15 cm | rook gaat zichtbaar naar het rooster; luchtsnelheid ≥ 0,5 m/s op 10 cm op 75 %; op 15 cm vastleggen (geen eis) |
| L3 | vangst van het filter en lek | deeltjesteller (PM2,5, optisch) net boven het rooster en in de uitblaas van de kuip, tijdens het vijlen van gelnagels op een proefhand; schoon en na 3 filterwissels | **absoluut:** PM2,5 in de uitblaas ≤ 50 % van die boven het rooster (projectkeuze: ≥ 50 % van de massa in het filter; de literatuur geeft 45 % bij de doorlaatbaarste 0,1 tot 0,35 µm, grover stof hoger); geen daling na de wissels; lager dan 50 %: een beter filter (F7) of de afvoer heroverwegen |
| L4 | blootstelling (**verplicht**) | stofmeting (inhaleerbaar en respirabel) en dampen (aceton, VOS) op ademhoogte van klant en medewerker tijdens een normale behandeling, met en zonder afzuiging | beoordeeld door een deskundige (arbeidshygiënist of preventieadviseur) volgens de Belgische regels (grenswaarden in de Codex over het welzijn op het werk; de deskundige bepaalt welke) |
| G1 | geluid | dB(A) op oorhoogte van beide personen, achtergrond apart; met de rubberbuffers en eenmaal met de ventilator star vastgeschroefd (de bijdrage van de ontkoppeling) | op 75 %: ≤ 71 dB(A), op 80 %: ≤ 72 dB(A) op de oorpositie van de medewerker (model 70,3 en 71,7 met budget, Berekeningen.md 3d) |
| E1 | warmte | 4 uur op 100 %: adapter, box, M8-connectoren, ventilatormotor | alle onderdelen binnen hun specificatie met ≥ 10 °C marge |
| E2 | elektrische eindcontrole | door een elektricien: netsnoer en adapter (klasse I), aarding, zekering -F1, kabels en trekontlasting; **min aan aarde?** (weerstand tussen M en de aarde van het stopcontact: de datasheet zegt "−V niet verbonden met FG", dus zwevend); ompoling (adapter verkeerd om op -X1 met een labvoeding met stroombegrenzing: -R13 geleidt, niets wordt warm); de waarheidstabel (Berekeningen.md 4) | goedgekeurd; M zwevend tegen de aarde (of het verschil verklaard); in elke fouttoestand van de tabel staat de ventilator stil; DC-schakelaar is geen netisolatie: stekker eruit voor werk aan de box |
| F1 | firmware op de hardware | foutinjectie: meter los, slang los of omgekeerd, stilstand, toerental afgeremd, UIT tijdens ijken, radio weg tijdens boost en tijdens UIT, alleen de box herstarten, stroomuitval, filter eruit terwijl hij draait (op 30, 75 en 100 %), hand 1 min op het rooster, knop 10 min uit, de firmware laten vastlopen (watchdog), tacho met de PWM ernaast op de oscilloscoop, twee sets tegelijk koppelen, ander merk filter | gedrag zoals de tests in `test_regel`; zonder filter stil binnen 3 tot 6 s; geen valse filtermelding door een hand; na een herstart van de box UIT; geen extra tachopulsen |
| M1 | bevestiging en blad | klauwen met rubber (module en knop): tot contact + een halve slag op een stuk LAGKAPTEN met latten; uittrekken en 7 dagen belasting; de schroeven van de box: 100 N trekken; **doorbuigproef:** 15 kg op het frame (geconcentreerd) en 50 kg verdeeld over het blad, doorbuiging in het midden meten | geen loskomen, geen zichtbare vervorming of indruk; doorbuiging met 15 kg ≤ 3 mm (model hoogstens 2,6 mm), geen kraken, de latten blijven vast |
| M2 | printpassing | testcoupons: moerkamers, paaltjes, filter met lip in de geleiderand (MANN en Filtron), deksel, een stuk kuip met lamellen en een oor, de persbouten in het frame | passen zonder forceren; de lip ligt rondom aan; de lamellen printen zonder draden |
| M3 | lijm, reiniging en aceton | UHU plus endfest 300 op twee geschuurde PETG-strips en een magneet in een frame-coupon (24 uur); een PETG-coupon 1 week dagelijks afnemen met het ontsmettingsmiddel (`docs/Materiaalstaat.md`); **acetonproef (7.2):** een druppel nagellakremover op een PETG-coupon, op de siliconenlip, de foamband en op een stuk RVS 430: 1 min laten liggen, afvegen, na 24 uur bekijken | lijm en ontsmetting: niet met de hand los, geen zwelling, geen dof of plakkerig oppervlak; aceton: vastleggen wat er gebeurt (PETG: verwacht zwelling; de lip: bestand; RVS: geen vlek) en de procedure "Na morsen" daarop afstemmen |
| O1 | onderhoud | 10 filterwissels met de procedure van punt 2.3; twee merken (MANN en Filtron); eenmaal de procedure "Na morsen" met water; eenmaal de kuip los en weer vast | geen stofwolk, de lip blijft rondom aanliggen (L3 opnieuw), de foamband van de kuip dicht nog |
| W1 | werkplek | 1:1-proef met twee personen: knieën, polsen, knop, kabels, uitblaas; testvinger (IEC 61032, probe B) met 10 N op het vingerrooster en op de lamellen van de kuip, in service, schakelaar uit en ventilator stil; een arm op de RVS-plaat die zijwaarts duwt | geen hinder; de testvinger raakt de waaier niet; de plaat verschuift niet; niemand zet de stand lager dan 75 % |

**Vrijgave:** pas als alle poorten groen zijn op dezelfde revisie, met een kort meetverslag, en de punten van
`Risicoanalyse-en-CE.md` afgehandeld zijn. Daarna stelt de firmware de minimale toegestane stand in op de bewezen
minimumstand (nu 20 %, `Instellingen.minPct`).

## 5. Wat Ian beslist

- ~~Filtervariant~~: beslist op 2026-11-08, interieurfilter MANN CU 20 013 (eerder, 2026-11-07: Rittal-mat).
- ~~Afdichting~~: beslist op 2026-11-08, zachte foamband; in 7.1 de siliconenlip als afdichting erbij.
- ~~Montagegrens klauwen~~: beslist op 2026-11-08, rubberkussen op de arm, een halve slag na contact.
- ~~Ventilator~~: beslist op 2026-11-12: geen sterkere ventilator (San Ace C175 9TG24P0S01 blijft).
- ~~Afvoer naar buiten~~: beslist op 2026-11-12: niet; de afzuiging blaast vrij uit. Fijn stof en dampen blijven in de salon.
- ~~Vormen onder het blad~~: beslist op 2026-11-12: rond en bol (kuip), boven blijft het vierkant.
- **Blootstellingsmeting (L4):** verplicht vóór gebruik met klanten (advies); wie, wanneer.
- **Dagstand:** 75 % (stiller) of 80 % (filter gaat langer mee).
- **Koolfilter:** proberen (Castrol CC0356C Carbon+), dan L1 en L3 opnieuw.
- **Zachtere buffers** (40 Shore, Ø15 x 15) als G1 een brom laat horen.
- **Massief blad** in plaats van LAGKAPTEN met latten.
- **Echte print (PCB)** in plaats van de gaatjesprint.
- ~~C++-compiler~~: geïnstalleerd (WinLibs GCC 16.2, 2026-11-07); de firmwaretests slagen.
