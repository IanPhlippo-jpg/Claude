# Afzuiging: beschermingsconcept, meetplan en vrijgave

Revisie: versie 7.4 (2026-11-17), zie `revisie.mjs` (lijst van wijzigingen per revisie). Dit document hoort bij de eindverslagen v1 (3,1/10), v2 (5,0/10), v3 (5,6/10) en v4 (6,4/10), bij het advies van Fable 5.2 (2026-11-12) en bij het advies van Fable 5.2 v1 (2026-11-17, `docs/Advies-Fable-5.2-v1.md`); de berekeningen staan in `Berekeningen.md` (gemaakt door `berekeningen.py`), de risicoanalyse en de CE-vragen in `Risicoanalyse-en-CE.md`. Het legt vast wat het
ontwerp moet bereiken, hoe dat gemeten wordt en wanneer de afzuiging in de salon gebruikt mag worden. Zolang niet
elke poort hieronder groen is, is de afzuiging een **ontwikkelprototype**: niet gebruiken met klanten of medewerkers.

## 1. Wat al in de bestanden is opgelost

| Punt uit het verslag | Stand |
|---|---|
| E02 revisiemix | één revisie uit `revisie.mjs` voor alle KCAD, STL's, tekeningen, mallen, schema, stuklijst, prijslijst en README. In 7.2 en 7.3 stond dit hier ten onrechte als opgelost (README, schema, typeplaatje en documenten droegen nog 7.2; advies v1, P2-16); sinds 7.4 eist een test dezelfde revisie in elke uitvoer |
| E03 open/niet-manifold STL's | STL's uit de exacte B-rep-vorm; de test controleert per STL dat elke rand bij precies twee driehoeken hoort (open = 0) |
| E06 oude meetwaarde | meting is 1 s geldig; daarna geen drukwaarde, geen filterbalk, melding "meting niet actueel"; drukmeter wordt opnieuw gestart |
| E07 ongeldige ijking | ijken alleen met verse, plausibele metingen binnen 450 Pa en met toerental op elk punt; anders blijft de vorige ijking |
| E07 meetbereik | de filterbewaking werkt alleen op standen waar de vervanggrens (de vervangfactor van die stand x de schone waarde) onder 450 Pa blijft; anders "buiten bereik" |
| E08 stop en herstart | UIT breekt een ijking in dezelfde regelstap af; stilstand op elke stand vanaf 20 % bewaakt; na stroomuitval altijd UIT; het scherm toont de bevestigde toestand van de module |
| E09 radio | koppeling per set (MAC en sleutel, versleuteld), volgnummers; boost vervalt in de module na 120 s; bij verbindingsverlies draait de module op de laatste gewone stand, hoogstens 10 min (7.2) |
| E11 G01 | de 9TG24P0G01 (93,6 W) is geschrapt: alleen de 9TG24P0S01 (56 W) op de adapter van 90 W |
| E12 uitkloppen | geschrapt in de UI en de handleiding: filter in een zak vervangen |
| E14 instructies | freesmaten, USB-printjes, schakelaar C&K D502 (sinds 7.4 in de achterwand van de box), zekering Bel 0697W (72 V DC), M8 binder 718 overal gelijk |
| V4-03 tot V4-14 | zie revisie 7.1 (toerentalvolging, herstart, ijken, koppelen, boosttegoed, eindpunt, -Q2, -C2) |
| F52-1 vangst en geluid | 7.2: verdeelruimte 15,5 mm; filter 3 tot 5 mm onder de plaat; rooster open fractie 0,30 -> 0,46 (werkzaam); handen op het rooster in het rekenblad (3e). Achterhaald in 7.4: de werkhoogte (nu 5 cm, zie hieronder), "75 % is beschermend" (nu: berekend, nog niet gemeten) en de rubberbuffers (nu star) |
| F52-2 afvoer | geen afvoer naar buiten (bewust, Ian 2026-11-12); uitblaas opzij en naar onder, niet langs de box; koolfilter als optie (Castrol CC0356C Carbon+, zelfde maat); L3 met PM2,5-criterium, L4 verplicht |
| F52-3 valse filtermelding | minimum over 5 min, hysterese (blijft tot een nieuwe ijking, ook na een herstart), "ander merk filter" als eigen handeling, ijking zonder filter geweigerd; tests "hand op rooster", schommelingen en "ander merk" |
| F52-4 aanraakveiligheid | vingerrooster in het oog; stop na 3 s zonder filter of luchtstroom op elke stand; task-watchdog op module en knop; risicoanalyse en CE in een eigen document. 7.2 rekende met EN ISO 13857 tabel 4 (vanaf 14 jaar); sinds 7.4 tabel 5 (vanaf 3 jaar), zie punt 2.5 |
| F52-5 tafelblad | latten tussen de huiden rond beide uitsparingen, schroeven van de box in hout, MDF-freesmal met kopieerring, doorbuigberekening (6d) en doorbuigproef (M1) |
| F52 klein | ompolingsbeveiliging -R13; RC en ontdendering op de tacho, periodemeting; draad 0,5 mm² / M8 4 x 0,25 mm² overal gelijk; Besparingen gecorrigeerd (klasse I); opbouwtekening van de print (schema blad 11); 0 % PWM = stil nagekeken in de datasheet; "+"-poort afgeschermd; acetonproef; persbouten tegen verschuiven; time-out zonder knop en automatisch uit; koppelsleutel via X25519 |

### Advies Fable 5.2 v1 (7.4)

Eerlijk gescheiden: wat in de bestanden is opgelost, en wat alleen een meting kan beslissen. Een oplossing in het model
is nog geen bewijs; de poort ernaast beslist.

| Punt | Opgelost in de bestanden (7.4) | Beslist pas door meting |
|---|---|---|
| P1-1, P1-2 M8 | bus van de module verticaal naar onder in een console onderaan de romp, binnen 210 x 210 (de module zakt door de uitsparing van 212); stekker van de box in de linkerwand; haakse M8-kabel van 0,3 m; stekkers en kabel als onderdelen in de assemblage; de sleuf naar de module in het blad vervalt | M2: montagetraject met de echte stekkers en kabel |
| P1-3 instroom | instroomtuit naar de vorm van de Sanyo-nozzle 109-1073 (R6, keel Ø125, 2 mm in het oog; los geprint, in een verzonken zitting van de plaat); rekenblad met inbouwverlies 0 / 10 / 20 %; 75 % heet "berekend, nog niet gemeten" | stap 0 en L1 met de echte kuip, instroomplaat en tuit; `beschermVanaf` pas vast na L1 |
| P1-4 maatketen | speling waaier tot instroomplaat 4 mm (was 2); maatketen 69 ± 1 mm plus printtoleranties in Berekeningen.md | M2: voelermaat op vier plaatsen, ≥ 1,5 mm |
| P2-1 geluid | geen "stil" meer; model 70 tot 72 dB(A) op 0,5 m op de dagstand, eerlijke band tot ongeveer 76 | G1 (tertsbanden); boven 70 dB(A) de gemeten waarde in de handleiding |
| P2-2 trillingen | ventilator star op 4 geprinte bussen in een kuip met 8 ribben (geen rubberbuffers: die hadden dwars en kantelend eigenfrequenties binnen 13 tot 65 Hz) | G1: oploop 20 tot 100 % met een versnellingsmeter |
| P2-3 vangsnelheid | werkhoogte 5 cm met 1,0 m/s (actieve bron, ACGIH); 0,5 m/s op 10 cm als tweede eis; afdwingen met een lage polssteun of zijschotjes | L2 met draaiende frees en deeltjesteller; W1 (polssteun of schotjes) |
| P2-4 schakelaar | -Q4 in de achterwand van de box (klantzijde, ongeveer 55 mm van de achterrand): bereikbaar vanaf de achterrand | W1: bereikbaar zonder onder het blad te kruipen |
| P2-5, P3-12 aders | aders door de wand van de kuip achteraan in de dode ruimte van de romp, tussenstekker Molex Micro-Fit 3.0 (4-polig), kit en trekontlasting (tie-wrap) | L3 (lek bij de doorvoer), O1 |
| P2-6, B-7 box en netsnoer | box blijft achteraan (onderkant 664 mm boven de vloer, boven knie- en dijhoogte P95: AANNAME); C13 met IEC-lock; netsnoer in een kabelgoot langs de zijwand van een ALEX (het bureau heeft geen poten) | B1 (kartonproef) en W1 met de klant aan de achterkant |
| P2-7 warmte | adapterklemmen in PA12-CF; grens op het contactvlak | E1 met thermokoppels op de adapter en de klem |
| P2-8 printbed | bed 230 x 230: bovenframe uit 4 latten, rand van de box 5 mm (box 220 breed) | M2: printen op het echte bed |
| P2-9 klauwen | een halve slag blijft; kracht na een halve slag 9,4 tot 16,2 N (rekenblad rechtgezet) | M1; vaste aanslag of klauw 8 mm in PA-CF: beslissing van Ian |
| P2-10 plaat | randen braamvrij (ISO 13715), bovenzijde gebroken 0,2 tot 0,5 mm, braamzijde onder (AFZ-03 en bestelling) | W1: hand en pols over de rand |
| P2-11 kuip | lamellen 2,5 mm dik | W1: stootproef 2 J (IK07, EN 62262), geen breuk |
| P2-12 kinderen | ribben van het vingerrooster 17 mm hoog: 21 mm tot de waaier; EN ISO 13857 tabel 5 vraagt 20 mm voor een sleuf van 4 tot 6 mm (AANNAME: waarde uit het advies, na te kijken in de normtekst) | W1 (testvinger); de normtekst |
| P2-13, P2-14 | grenzen van de machine, ontbrekende gevaren en wat voor CE ontbreekt: `Risicoanalyse-en-CE.md` | handleiding en verklaringen moeten nog gemaakt worden |
| P2-16 revisie | één revisie (7.4) uit `revisie.mjs`, met een test | |
| P3-6, P3-7, P3-5 | -C1 geschrapt; tachoklem; bij ompoling blijft de adapter in hiccup (geen bewering meer dat -F1 smelt) | E2 (ompoling met labvoeding) |
| P3-9, P3-11, P3-19 | messing inserts M3 in de romp; lijm voor PETG: MMA; PA12-CF of PET-CF voor bovenframe en instroomplaat overwogen (`Materiaalstaat.md`) | M3 |
| P3-22 | | W1: lange kunstnagels, ringen en sieraden in de sleuven van 5 mm |
| B-1 knieën | kuip hangt tot 598 mm boven de vloer, midden in de knieopening | B1: kartonnen proefmodel onder het blad en W1, **vóór het frezen** |
| B-2 blad | binnenkant van LAGKAPTEN onbekend (huiden, randlijst); massief multiplex 30 mm is de eerste keuze voor een salon (IKEA geeft LAGKAPTEN voor huishoudelijk gebruik) | B2: proefgat Ø3 en voelen met een haakje, **vóór het frezen** |
| B-3 bevestiging | blad met 4 schroeven aan de ALEX-kasten | M1: zijwaarts duwen |
| B-6 strook | | M1: meetklok op de strook van 38 mm tussen de uitsparing en de box |

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
   fabrikantcurve); het rekenblad neemt de bovengrens op het vrije front: 130 Pa. Met de volle band is 75 % de laagste
   beschermende stand **volgens het model: berekend, nog niet gemeten** (7.4). Het rekenblad rekent sinds 7.4 ook met een
   inbouwverlies van de ventilator van 0, 10 en 20 %: de curve van Sanyo Denki geldt met de originele nozzle 109-1073, en
   de inbouw hier is anders (advies v1, P1-3). De laagste beschermende stand in de firmware (`beschermVanaf`) wordt pas
   vastgelegd na L1. Het eindpunt van het filter is de melding van de firmware. Poort L1 meet het echte filter.
   **Werkhoogte (7.4):** 5 cm boven het rooster, met 1,0 m/s: een nagelfrees werpt stof weg (actieve bron; ACGIH,
   Industrial Ventilation, geeft daarvoor 1,0 tot 2,5 m/s). 0,5 m/s op 10 cm blijft als tweede eis (190 m³/h, Berekeningen.md
   hoofdstuk 1; bij 190 m³/h is het op 5 cm ongeveer 1,07 m/s). De werkhoogte wordt afgedwongen met een lage polssteun
   of zijschotjes naast het rooster (keuze na W1). Wie hoger werkt, vangt minder: de handleiding en de knop zeggen 5 cm.
   **Koolfilter (optie, niet doorgerekend):** Castrol Filters CC0356C "Carbon+" heeft dezelfde maat (195 x 145 x 30). Een
   MANN CUK 20 013 vonden we niet. Met een koolfilter: "ander merk filter" ijken en L1 en L3 opnieuw.
2. **Afdichting (V4-02).** Het filter ligt op een zachte foamband in een geleiderand (1 mm speling rondom). De
   afdichting is een lip van zelfklevend siliconenrubber (0,5 mm, Shore A 60) op de geleiderand, 2,5 mm over de rand
   van het filter: bij het inleggen buigt het filter haar naar onder, ze ligt rondom tegen de zijkant en de onderdruk
   drukt haar in de spleet. Maatketen en lekberekening: Berekeningen.md 6c. Ontbreekt het filter of ligt het scheef,
   dan stopt de ventilator na 3 s (onder 0,70 x schoon); een kleine kier ziet de drukmeter niet, daarom de controle
   bij elke wissel. Poort L3 meet of er lucht langs gaat; O1 controleert de lip na 10 wissels.
3. **Onderhoud.** Eén procedure (`onderhoud.mjs`, ook in de README en het bouwschema): knop uit, schakelaar op de box
   uit (7.4: in de achterwand van de box, vanaf de achterrand van het bureau te bereiken), 10 s wachten tot de
   ventilator stilstaat, dan het filter horizontaal in een zak, lip, foamband en instroomplaat
   vochtig afnemen, nieuw filter met de pijl naar onder, de lip rondom nakijken, ijken (bevestigd).
   Niet uitkloppen en niet uitblazen. Daarnaast "Na morsen" en "Eens per jaar" (zelfde bestand).
   Een test controleert dat geen enkele uitvoer nog uitkloppen aanraadt.
4. **Afvoer (7.2).** De lucht gaat uit de kuip opzij (lamellen onder 45° naar onder, in 12 sectoren van ±15 tot ±70° rond
   de X-as: vooral naar de ladekasten; de buitenste sectoren wijzen schuin naar voor en naar achter, maar 45° omlaag, zodat
   de lucht onder de voedingsbox door gaat) en naar onder (ringsleuven), onder het blad, de salon in. W1 kijkt of er tocht
   op de benen komt en of er stof van de vloer opwervelt; zo ja, de buitenste sectoren dichtmaken en het rekenblad opnieuw draaien met 2/3 van de lamellen. **Een afvoer naar buiten
   is bewust niet gekozen (Ian, 2026-11-12).** Gevolg: het fijne stof dat door het filter gaat en alle dampen blijven in de
   salon. Daarom: aparte ventilatie van de salon, en **poort L4 is verplicht** vóór gebruik met klanten.
5. **Bereikbaarheid van de waaier (V3-11, F52-4, advies v1 P2-12).** In een salon komen kinderen: sinds 7.4 geldt
   EN ISO 13857 **tabel 5** (personen vanaf 3 jaar), niet meer tabel 4 (vanaf 14 jaar). Toestanden, met wat er tussen
   een vinger en de waaier zit:

   | Toestand | Wat er tussen zit | EN ISO 13857 tabel 5 (AANNAME: waarden uit het advies, na te kijken in de normtekst) |
   |---|---|---|
   | bedrijf | RVS-plaat (sleuven 5 mm, zonder gereedschap af te nemen: telt niet), filter (zacht, los: telt niet), vast vingerrooster in het oog (spleten 5,6 mm, ribben tot 21 mm boven de waaier, in de losse tuit), 4 mm lucht: 21 mm van de bovenkant van de ribben tot de waaier | sleuf 4 < e ≤ 6: 20 mm nodig, 21 mm aanwezig: voldoet, met 1 mm marge. Met de hoogtetolerantie van de ventilator (± 1 mm) is dat krap: M2 meet de werkelijke speling |
   | service (plaat en filter eruit) | alleen het vingerrooster; de instroomplaat is gelijmd en blijft; zonder filter stopt de ventilator na 3 s | idem |
   | tolerantie | ribben 1,6 ± 0,2 en steek 7,2 ± 0,1 (geprint): spleet hoogstens 5,9 mm | blijft in 4 < e ≤ 6 |
   | onder het blad | de lamellen van de kuip (7.4: 2,5 mm dik), openingen hoogstens 4 mm, de ringsleuven 4 mm breed; de waaier zit ongeveer 7 mm achter de wand | e ≤ 4: de waarde van tabel 5 na te kijken in de normtekst (AANNAME: 2 mm, zoals tabel 4) |

   **Sterkte (V4-07):** balkrooster met 10 N op elke plaats: doorbuiging tegen de vrije ruimte tot de waaier
   (Berekeningen.md 6b; de hogere ribben van 7.4 zijn stijver). De lamellen van de kuip krijgen in W1 een stootproef.

   Dit is een rekenkundige controle met de maten uit het model, geen keuring; de testvinger (IEC 61032, probe B) wordt
   in poort W1 op de unit gezet. De procedure blijft: eerst uitschakelen en stilstand, ook al houdt het rooster een vinger
   tegen. De stop zonder filter is een aanvulling (geen veiligheidsfunctie met een prestatieniveau; zie de risicoanalyse).
6. **Morsroute (V4-09).** Begrensd scenario: een fles van 15 ml valt om op het rooster. Het filter houdt 38 tot 113 ml
   vast (AANNAME, Berekeningen.md 7): de vloeistof blijft in het filter. Wat er toch door komt, valt door het
   vingerrooster op de waaier en wordt tegen de kuip geslingerd en naar buiten (onder het blad); daar zit geen elektronica
   (de voedingsbox hangt erachter, buiten de uitblaas) en alles werkt op 24 V. Aceton tast PETG aan (proef M3); voor het
   bovenframe en de instroomplaat (de druppelzone) wordt PA12-CF of PET-CF overwogen (`Materiaalstaat.md`, proef M3).
   Daarom de vaste procedure "Na morsen" (`onderhoud.mjs`, README). Geen open vlam of verwarmd gereedschap boven het rooster.

## 3. Draagconstructie (E10, F52-5)

- **Module:** het frame ligt met een rand van 5 mm op de bovenhuid; daaronder zit sinds 7.2 rondom een lat van 28 x 44 mm
  tussen de huiden (gelijmd). De klauwen klemmen onder de onderhuid op dezelfde latten. Op de arm van elke klauw zit een
  rubberkussen (neopreen Shore A 40, 4 mm): draai de M5-schroef tot het rubber het blad raakt en dan een halve slag.
  Na een halve slag is de kracht **9,4 tot 16,2 N** per klauw (7.4: het rekenblad zei eerder 9 tot 13 N; de bovengrens
  kwam uit het geval met de kleinste marge, niet uit de grootste kracht). Het moment van "contact" voel je op ongeveer
  een kwart slag; neopreen relaxeert daarna. Een vaste aanslag of een klauw van 8 mm in PA-CF is een **open beslissing
  van Ian** (hoofdstuk 5); M1 controleert. Het gewicht rust op het frame.
- **Voedingsbox:** 4 spaanplaatschroeven 4 x 16 verzonken door de onderhuid in hout: vooraan in de achterste lat van de
  module, achteraan in een lat van 10 x 30 tegen de onderhuid; de box weegt ongeveer 0,7 kg. Rand van de box 5 mm
  (7.4: box 220 breed, past op een printbed van 230 x 230).
- **Blad:** doorbuiging met de gaten in de vrije overspanning van 680 mm: Berekeningen.md 6d (met 15 kg in het midden
  hoogstens ongeveer 2,6 mm; de kern en de huiden zijn aannames). IKEA geeft 50 kg verdeeld en 15 kg geconcentreerd, en
  verkoopt LAGKAPTEN voor huishoudelijk gebruik: een salon en uitsparingen vallen daarbuiten. De zwakste plek is de strook
  van 38 mm tussen de uitsparing van de module en die van de box: M1 meet daar met een meetklok.
  **Eerste keuze voor een salon: een massief blad (multiplex 30 mm)**; eiken 26 tot 30 mm kan ook.
- **Binnenkant van LAGKAPTEN (7.4, controlestap vóór het frezen):** de dikte van de huiden (aanname 3 mm) en de breedte
  van de randlijst zijn onbekend; de lat achter de box ligt 22 tot 54 mm van de achterrand, waar mogelijk al de lijst
  zit. Daarom eerst poort B2: een proefgat Ø3 en met een haakje voelen.
- **Blad op de kasten (7.4):** het blad zit met 4 schroeven vast op de ALEX-kasten (module, box en kabels hangen eraan en
  mensen leunen erop). M1 duwt het blad zijwaarts.
- **Te bewijzen:** zie de poorten B en M hieronder (proefgat, doorbuiging, uittrekken, kruip, warmte).

## 3b. Werkplek (maten uit het model, bureau LAGKAPTEN 1400 x 600 x 34 op twee ALEX, blad 734 mm hoog)

De medewerker zit aan de voorrand, de klant aan de achterrand.

| Wat | Maat | Gevolg / controle in W1 |
|---|---|---|
| module | midden van het blad: 300 mm van de voorrand, 189 mm vrije rand voor het frame | de onderarm van de klant ligt op het blad of op een lage polssteun, de nagel ongeveer 5 cm boven het rooster (vangst: Berekeningen.md, hoofdstuk 1) |
| onderkant module (7.2) | de vierkante romp 70 mm onder het bovenvlak (664 mm boven de vloer, 195 tot 405 mm van de voorrand); de ronde kuip (Ø189) eronder: de rand 110 mm onder het bovenvlak (624 mm boven de vloer, vanaf 205 mm van de voorrand), het midden van de bolle bodem 136 mm (598 mm boven de vloer, 300 mm van de voorrand) | de kuip hangt midden in de knieopening van 680 mm, aan beide kanten zitten knieën; **B1: kartonnen proefmodel vóór het frezen**, met de grootste gebruiker en de stoel op werkhoogte |
| vrije ruimte tussen de ladekasten | 680 mm breed | de module staat in het midden, beide knieën ernaast is niet mogelijk: knieën vóór de module |
| knop | 250 mm rechts van het midden, 100 mm van de voorrand, 16 mm boven het blad | met de rechterhand te bereiken zonder te leunen; linkshandig: de mal en `M.dial` spiegelen (x = -250) |
| voedingsbox | 495 mm van de voorrand (54 tot 156 mm van de achterrand), onderkant 664 mm boven de vloer | voor de medewerker achter de knieën; aan de **klantzijde** in de beenruimte, boven knie- en dijhoogte van een grote gebruiker (P95: AANNAME, B1 en W1 controleren). C13-stekker met IEC-lock; netsnoer in een kabelgoot langs de zijwand van een ALEX-kast (het bureau heeft geen poten) |
| schakelaar -Q4 (7.4) | in de achterwand van de box, ongeveer 55 mm van de achterrand van het blad | vanaf de achterrand te bereiken zonder onder het blad te kruipen |
| kabels (7.4) | haakse M8-kabel van 0,3 m in een lus naast de box, van de linkerwand van de box naar de bus onderaan de romp (24 mm of meer onder het blad; de sleuf naar de module vervalt); het slangetje van de drukmeter ernaast; USB-C van de knop in een sleuf van 5 x 5 | geen kabel waar een knie of een tas hem kan lostrekken; de aders van de ventilator lopen binnen de romp |
| uitblaas (7.2) | uit de kuip opzij (naar de ladekasten) en naar onder, tussen 624 en 598 mm hoogte | geen tocht op de benen van de klant, geen opgewerveld stof van de vloer en geen lucht langs de ventilatiesleuven van de box (W1: hand op kniehoogte, rookproef bij de box) |
| armsteun | geen vaste: de onderarm rust op het blad of op de RVS-plaat (4 mm hoger; randen braamvrij, bovenzijde gebroken 0,2 tot 0,5 mm, braamzijde onder); om de werkhoogte van 5 cm af te dwingen een lage polssteun of zijschotjes naast het rooster (keuze na W1) | geen drukplek op de pols; de plaat schuift niet (persbouten) |

## 4. Meetplan en acceptatie

Meet op één complete, gemonteerde unit van deze revisie. Leg bij elke meting de revisie (`revisie.mjs` en de git-commit),
het filterproduct, de stand (%), het toerental en de omgeving vast.

**Stap 0 (eerst, F52-1f en advies v1 P1-3): proefopstelling.** Vóór er iets in serie geprint of gefreesd wordt: de
ventilator, een filter MANN CU 20 013 en een rooster (of een geprinte proefplaat met dezelfde open fractie) met **de echte
geprinte kuip, de echte instroomplaat en de instroomtuit** van deze revisie, in een eenvoudige kast van MDF met dezelfde
binnenmaten (verdeelruimte 15,5 mm). Geen MDF-nabouw van de uitblaas: de inbouw rond de waaier (tuit, speling, kuip,
lamellen) is precies wat het inbouwverlies bepaalt. Daarop L1 (Q-Δp), L2 (vangst op 5 en 10 cm) en G1 (geluid op 0,5 m)
bij 75, 80 en 100 %. Vergelijk het debiet met de drie scenario's van het rekenblad (inbouwverlies 0, 10 en 20 %). Valt het
debiet lager uit dan het rekenblad, dan eerst het model bijstellen (vervangfactoren en de laagste beschermende stand) voor
er verder gebouwd wordt.

**Stap 0b (vóór het frezen van het blad): poorten B1 en B2.**

| Poort | Meting | Hoe | Acceptatie |
|---|---|---|---|
| B1 | knieruimte (advies v1 B-1) | kartonnen proefmodel van de romp, de kuip (tot 598 mm boven de vloer) en de voedingsbox, met tape onder het blad op de plaats uit het model; zitten met de grootste gebruiker aan de voorrand en een klant aan de achterrand, stoel op werkhoogte; daarna W1 | geen knie of dij raakt de kuip of de box bij normaal zitten en opstaan; anders eerst het ontwerp aanpassen (bv. ventilator naast in plaats van onder het filter) |
| B2 | binnenkant van het blad (advies v1 B-2) | proefgat Ø3 in de zone van de uitsparing en in de zone van de lat achter de box; met een haakje de dikte van de huiden en de rand van de randlijst voelen; noteren | huiden en lijst bekend; de maten van de latten en de mallen kloppen ermee, of ze worden aangepast; anders het massieve blad |

| Poort | Meting | Hoe | Acceptatie |
|---|---|---|---|
| L1 | debiet en drukval | Q-Δp bij 20, 40, 60, 75, 80, 90, 100 %, met een schoon filter en een filter op het moment van de melding; toerental en vermogen; eerst op de proefopstelling (stap 0) | curve vastgelegd; het inbouwverlies bepaald (tegen het scenario 0 / 10 / 20 %); bij de melding nog ≥ 190 m³/h op de laagste beschermende stand. Pas dan wordt `beschermVanaf` vastgelegd (tot dan: 75 %, berekend, nog niet gemeten) |
| L2 | vangst bij de bron | met een **draaiende nagelfrees** op een proefhand: rookproef; anemometer op 5 en 10 cm boven de plaat; een **deeltjesteller op ademhoogte** van klant en medewerker, met en zonder afzuiging; met de polssteun of de zijschotjes | rook gaat zichtbaar naar het rooster; ≥ 1,0 m/s op 5 cm en ≥ 0,5 m/s op 10 cm op de laagste beschermende stand; de deeltjesconcentratie op ademhoogte is met afzuiging duidelijk lager dan zonder (verhouding vastleggen; het oordeel ligt bij L4) |
| L3 | vangst van het filter en lek | deeltjesteller (PM2,5, optisch) net boven het rooster en in de uitblaas van de kuip, tijdens het vijlen van gelnagels op een proefhand; schoon en na 3 filterwissels; ook bij de doorvoer van de aders in de kuip | **absoluut:** PM2,5 in de uitblaas ≤ 50 % van die boven het rooster (projectkeuze: ≥ 50 % van de massa in het filter; de literatuur geeft 45 % bij de doorlaatbaarste 0,1 tot 0,35 µm, grover stof hoger); geen daling na de wissels; lager dan 50 %: een beter filter (F7) of de afvoer heroverwegen |
| L4 | blootstelling (**verplicht**) | stofmeting (inhaleerbaar en respirabel) en dampen (aceton, VOS) op ademhoogte van klant en medewerker tijdens een normale behandeling, met en zonder afzuiging | beoordeeld door een deskundige (arbeidshygiënist of preventieadviseur) volgens de Belgische regels (grenswaarden in de Codex over het welzijn op het werk; de deskundige bepaalt welke) |
| G1 | geluid en trillingen | dB(A) op oorhoogte van beide personen, achtergrond apart; ook in **tertsbanden** (tonen op de schoepfrequentie); **oploop van 20 tot 100 %** met een versnellingsmeter op de kuip en op het blad | geen resonantiepiek in het werkgebied (13 tot 65 Hz) en geen aanlopen (geen schuurgeluid, geen sporen op de ribben of de tuit na de proef); op de dagstand ≤ 72 dB(A) op de oorpositie van de medewerker (comfortdoel, projectkeuze; model 70 tot 72 dB(A), eerlijke band tot ongeveer 76). De gemeten waarde gaat in de handleiding: boven 70 dB(A) de waarde zelf, anders "niet meer dan 70 dB(A)" (Machinerichtlijn bijlage I, 1.7.4.2 u; verordening 2023/1230). Hoger dan het doel: Ian beslist |
| E1 | warmte | 4 uur op 100 %: lucht in de box, **thermokoppel op de behuizing van de adapter en op het contactvlak van een adapterklem** (PA12-CF), M8-connectoren, ventilatormotor | alle onderdelen binnen hun specificatie met ≥ 10 °C marge; het contactvlak klem/adapter ≥ 10 °C onder de warmtevervormingstemperatuur van het gekochte PA12-CF (datablad) |
| E2 | elektrische eindcontrole | door een elektricien: netsnoer en adapter (klasse I), aarding, C13 met IEC-lock, zekering -F1, kabels en trekontlasting; **min aan aarde?** (weerstand tussen M en de aarde van het stopcontact: de datasheet zegt "−V niet verbonden met FG", dus zwevend); ompoling (adapter verkeerd om op -X1 met een labvoeding met stroombegrenzing: -R13 geleidt, de bron gaat in begrenzing, niets wordt warm; met de echte adapter blijft die in hiccup); de waarheidstabel (Berekeningen.md 4) | goedgekeurd; M zwevend tegen de aarde (of het verschil verklaard); in elke fouttoestand van de tabel staat de ventilator stil; DC-schakelaar is geen netisolatie: stekker eruit voor werk aan de box |
| F1 | firmware op de hardware | foutinjectie: meter los, slang los of omgekeerd, stilstand, toerental afgeremd, UIT tijdens ijken, radio weg tijdens boost en tijdens UIT, alleen de box herstarten, stroomuitval, filter eruit terwijl hij draait (op 30, 75 en 100 %), hand 1 min op het rooster, knop 10 min uit, de firmware laten vastlopen (watchdog), tacho met de PWM ernaast op de oscilloscoop, twee sets tegelijk koppelen, ander merk filter, tussenstekker Molex Micro-Fit 3.0 los | gedrag zoals de tests in `test_regel`; zonder filter stil binnen 3 tot 6 s; geen valse filtermelding door een hand; na een herstart van de box UIT; geen extra tachopulsen |
| M1 | bevestiging en blad | klauwen met rubber (module en knop): tot contact + een halve slag op een stuk blad met latten; kracht per klauw controleren (9,4 tot 16,2 N volgens het rekenblad); uittrekken en 7 dagen belasting; de schroeven van de box: 100 N trekken; **doorbuigproef:** 15 kg op het frame (geconcentreerd) en 50 kg verdeeld over het blad, doorbuiging in het midden meten; **meetklok op de strook van 38 mm** tussen de uitsparing en de box; het blad op de kasten **zijwaarts duwen** (4 schroeven) | geen loskomen, geen zichtbare vervorming of indruk, na 7 dagen geen merkbare kruip; doorbuiging met 15 kg ≤ 3 mm (model hoogstens 2,6 mm), de strook buigt niet zichtbaar meer door dan het midden (waarde vastleggen), geen kraken, de latten blijven vast; het blad verschuift niet op de kasten |
| M2 | printpassing en montage | testcoupons op het echte bed van 230 x 230: moerkamers, paaltjes, messing inserts M3 in de romp, filter met lip in de geleiderand (MANN en Filtron), deksel, een stuk kuip met lamellen van 2,5 mm en een oor, de persbouten in het frame, het frame uit 4 latten; **montagetraject:** de module met de M8-bus in de console zakt door de uitsparing van 212, de haakse kabel past tussen box en module; **speling:** met een voelermaat op vier plaatsen de axiale speling tussen de waaier en de instroomplaat, en de radiale speling tussen de tuit en het oog | passen zonder forceren; de lip ligt rondom aan; de lamellen printen zonder draden en zonder breuk; de module zakt zonder kantelen door; axiale speling ≥ 1,5 mm op elke plaats; de tuit raakt het oog nergens (kleinste radiale speling vastleggen) |
| M3 | lijm, reiniging en aceton | MMA-lijm (methacrylaat) op twee geschuurde PETG-strips en een magneet in een frame-coupon (24 uur); dezelfde lijm op PA12-CF of PET-CF als die gekozen worden; een PETG-coupon 1 week dagelijks afnemen met het ontsmettingsmiddel (`docs/Materiaalstaat.md`); **acetonproef:** een druppel nagellakremover op een PETG-coupon, op een PA12-CF- en een PET-CF-coupon, op de siliconenlip, de foamband en op een stuk RVS 430: 1 min laten liggen, afvegen, na 24 uur bekijken | lijm en ontsmetting: niet met de hand los, geen zwelling, geen dof of plakkerig oppervlak; aceton: vastleggen wat er gebeurt (PETG: verwacht zwelling; de lip: bestand; RVS: geen vlek) en daarmee het materiaal van bovenframe en instroomplaat kiezen en de procedure "Na morsen" afstemmen |
| O1 | onderhoud | 10 filterwissels met de procedure van punt 2.3; twee merken (MANN en Filtron); eenmaal de procedure "Na morsen" met water; eenmaal de kuip los en weer vast (tussenstekker Molex Micro-Fit 3.0 los en vast) | geen stofwolk, de lip blijft rondom aanliggen (L3 opnieuw), de foamband van de kuip dicht nog, de trekontlasting van de aders houdt |
| W1 | werkplek en afscherming | 1:1-proef met twee personen (na B1): knieën, polsen, knop, schakelaar -Q4 vanaf de achterrand, kabels, uitblaas (tocht en opgewerveld stof op kniehoogte), polssteun of zijschotjes; testvinger (IEC 61032, probe B) met 10 N op het vingerrooster en op de lamellen van de kuip, in service, schakelaar uit en ventilator stil; **stootproef 2 J (IK07, EN 62262)** op een geprinte kuip; **lange kunstnagels, ringen en sieraden** in de sleuven van 5 mm van de plaat; hand en pols over de rand van de plaat; een arm op de RVS-plaat die zijwaarts duwt | geen hinder; de testvinger raakt de waaier niet; de kuip breekt niet; geen nagel of ring haakt vast (anders de sleufrichting aanpassen); de rand snijdt of schraapt niet; de plaat verschuift niet; niemand zet de stand lager dan de laagste beschermende |

**Vrijgave:** pas als alle poorten groen zijn op dezelfde revisie, met een kort meetverslag, en de punten van
`Risicoanalyse-en-CE.md` afgehandeld zijn. Daarna stelt de firmware de minimale toegestane stand in op de bewezen
minimumstand (nu 20 %, `Instellingen.minPct`) en de laagste beschermende stand op de waarde uit L1 (`beschermVanaf`).

## 5. Wat Ian beslist

- ~~Filtervariant~~: beslist op 2026-11-08, interieurfilter MANN CU 20 013 (eerder, 2026-11-07: Rittal-mat).
- ~~Afdichting~~: beslist op 2026-11-08, zachte foamband; in 7.1 de siliconenlip als afdichting erbij.
- ~~Montagegrens klauwen~~: beslist op 2026-11-08, rubberkussen op de arm, een halve slag na contact.
- ~~Ventilator~~: beslist op 2026-11-12: geen sterkere ventilator (San Ace C175 9TG24P0S01 blijft).
- ~~Afvoer naar buiten~~: beslist op 2026-11-12: niet; de afzuiging blaast vrij uit. Fijn stof en dampen blijven in de salon.
- ~~Vormen onder het blad~~: beslist op 2026-11-12: rond en bol (kuip), boven blijft het vierkant.
- **Blootstellingsmeting (L4):** verplicht vóór gebruik met klanten (advies); wie, wanneer.
- **Dagstand:** 75 % of 80 % (filter gaat langer mee); pas na L1, want 75 % is nog niet gemeten.
- **Klauwen (7.4):** een halve slag blijft voorlopig; kiezen tussen een vaste aanslag (de naaf loopt tegen een kraag) en
  een klauw van 8 mm in PA-CF.
- **Werkhoogte afdwingen (7.4):** een lage polssteun of zijschotjes naast het rooster, na W1.
- **Koolfilter:** proberen (Castrol CC0356C Carbon+), dan L1 en L3 opnieuw.
- **Massief blad** (multiplex 30 mm, eerste keuze voor een salon) in plaats van LAGKAPTEN met latten; anders eerst B2.
- **Materiaal bovenframe en instroomplaat:** PETG, PA12-CF of PET-CF, na de acetonproef in M3.
- **Radiomodules (RED):** ESP32-C3 SuperMini en VIEWE-knop houden, vervangen of laten beoordelen (`Risicoanalyse-en-CE.md`, hoofdstuk 2).
- **Echte print (PCB)** in plaats van de gaatjesprint.
- ~~Zachtere buffers~~: vervallen in 7.4 (de ventilator staat star; G1 meet de trillingen).
- ~~C++-compiler~~: geïnstalleerd (WinLibs GCC 16.2, 2026-11-07); de firmwaretests slagen.
