# Afzuiging: rekenblad

Gemaakt door `docs/berekeningen.py` (niet met de hand aanpassen). Invoer en bronnen staan bovenaan dat script.
Het is een ontwerpberekening: de metingen in `Vrijgave-en-meetplan.md` beslissen.

## 1. Doel: hoeveel lucht

Vangst bij de bron: 0,5 m/s op 10 cm boven het rooster (Dalla Valle, opening met flens: v = Q / (0,75 (10x² + A)), A = 404 cm²).

| debiet (m³/h) | v op 5 cm | v op 10 cm | v op 15 cm |
| ---: | ---: | ---: | ---: |
| 150 | 0,85 | 0,40 | 0,21 |
| 200 | 1,13 | 0,53 | 0,28 |
| 250 | 1,42 | 0,66 | 0,35 |
| 300 | 1,70 | 0,79 | 0,42 |
| 400 | 2,27 | 1,06 | 0,56 |

**Minimum: 190 m³/h** (0,5 m/s op 10 cm), op elke beschermende stand tot de melding "filter vervangen" (het onderhoudseindpunt, 3b). **Ontwerpdebiet: 250 m³/h** met een schoon filter (0,66 m/s op 10 cm). Meer debiet geeft vooral meer geluid; 500 m³/h is geen doel meer.

**Werkhoogte (versie 7.2, eerlijk vastgelegd): 10 cm boven het rooster.** Daar is de vangst ontworpen en bewaakt. Op 15 cm haalt alleen boost 0,5 m/s, en dan alleen met een schoon filter (tabel in hoofdstuk 3: 0,52 m/s); op de dagstand is het op 15 cm ongeveer 0,39 m/s. Wie hoger boven het rooster werkt, vangt dus minder: leg de hand van de klant op het blad of op de rand van de plaat, met de nagel laag boven het rooster.

## 2. Weerstand van de luchtweg zonder filter

| onderdeel | ζ | oppervlak (cm²) | Δp bij 250 m³/h (Pa) |
| --- | ---: | ---: | ---: |
| RVS-rooster (f = 0,46) | 5,69 | 404 | 10 |
| vingerrooster in het oog (18 ribben 1,6 mm, een dwarsrib en twee ringen, f = 0,72) | 0,98 | 127 | 18 |
| instroom naar het oog Ø127 (trechter 45°) | 0,50 | 127 | 9 |
| uitblaas door de lamellen en ringsleuven van de kuip | 2,50 | 165 | 27 |
| **samen** |  |  | **63** (44 tot 95) |

ζ van de platen volgens Idelchik (dunne geperforeerde plaat); de instroom en de lamellen zijn schattingen. Daarom staat overal een band van 0,7x tot 1,5x.

**Versie 7.2 tegenover 7.1:** het rooster is opener (sleuven 5 mm, stegen 2 mm; laserrapport: 151,0 cm² boven het filter en 70,5 cm² ernaast, die voor de helft meetellen omdat de plaat nu 3 tot 5 mm boven de plooien ligt): werkzame open fractie 0,46 (was 0,30), verlies bij 250 m³/h 10 Pa (was 34). Het vingerrooster is dichter (spleten 5,6 mm voor EN ISO 13857, 6b) en de uitblaas van de ronde kuip heeft 165 cm² vrije doorgang (109 cm² lamellen opzij, 56 cm² ringsleuven in de bodem; de vlakke bodemplaat had 207 cm²): samen kosten die twee wat de opener plaat wint. De grote winst zit in de verdeelruimte (3c).

## 3. Werkpunt per filter

Snijpunt van de ventilatorcurve (100 % en lager toerental, Q ~ n, p ~ n²) met filter plus luchtweg. "Vol" = de einddrukval van de fabrikant (of 2x schoon als die ontbreekt), alleen ter vergelijking: het gekozen filter wordt eerder vervangen (3b).

| filter | Δp filter bij 250 (Pa) | max. debiet schoon | max. debiet vol | toerental voor 250 schoon | toerental voor 190 vol | dB(A) op 1 m / 0,5 m bij 250 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **gekozen:** interieurfilter MANN CU 20 013, 30 mm, geplooid | 130 | 341–390 | 231–248 | 71 %–78 % | 85 %–88 % | 62–64 / 68–70 |
| Rittal SK 3171.100 (G3), 17 mm, vroegere cassette 171 x 171 | 54 | 388–457 | 228–243 | 59 %–67 % | 86 %–89 % | 58–60 / 64–66 |
| vlakke mat M5 (ePM10 50 %), 20 mm, referentie Nittmann V400S | 261 | 276–303 | 194–204 | 88 %–93 % | 96 %–98 % | 66–67 / 72–74 |
| minipleat ePM1 65 % (F7), 48 mm, TROX MFP-PLA op maat | 146 | 332–378 | 263–288 | 73 %–80 % | 76 %–80 % | 62–64 / 68–70 |
| minipleat ePM1 90 % (F9), 48 mm, TROX MFP-PLA op maat | 248 | 281–311 | 201–211 | 86 %–92 % | 94 %–97 % | 66–67 / 72–73 |
| H13 (EN 1822), 150 mm, Freudenberg SF13 (ter vergelijking, past niet) | 630 | 177 | 103 | — | — | — |

**Met het gekozen filter (schoon), per stand:** debiet en luchtsnelheid boven het midden van het rooster.

| toerental | debiet (m³/h) | op 10 cm | op 15 cm | op 20 cm | dB(A) op 1 m |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 40 % | 105 | 0,28 | 0,15 | 0,09 | 49 |
| 60 % | 189 | 0,50 | 0,26 | 0,16 | 58 |
| 70 % | 233 | 0,62 | 0,33 | 0,20 | 61 |
| 75 % | 256 | 0,67 | 0,36 | 0,22 | 63 |
| 80 % | 278 | 0,73 | 0,39 | 0,23 | 64 |
| 100 % (boost) | 370 | 0,98 | 0,52 | 0,31 | 69 |

20 cm boven het rooster haalt geen enkele stand 0,5 m/s: dat vraagt ongeveer 600 m³/h, meer dan deze ventilator met rooster en filter levert.

De stand is een fractie van het volle **toerental**: de firmware regelt het toerental (ijktabel PWM -> toerental plus bijregeling op de tacho, regel.h). Debiet, geluid en warmte in dit rekenblad gebruiken dezelfde grootheid. Het geluid volgt ΔL = 50 log10(n/n_vol) en een vrije puntbron; roosterfluit, kastresonantie en galm komen erbij (meten: poort G1).

### 3b. Onderhoudseindpunt: de melding "filter vervangen" per stand

**Het eindpunt is de melding van de firmware**, niet de einddruk van de fabrikant (300 Pa): het filter gaat eruit zodra de knop "filter vervangen" toont. Tot dat moment moet elke beschermende stand het minimum (190 m³/h) halen. De drukmeter ziet rooster + filter. Per stand 36 scenario's: luchtweg 0,7x / 1x / 1,5x, verdeelruimte zonder en met de bovengrens (3c), ventilatorcurve −20 / 0 / +20 Pa (afleesonzekerheid) en een toerental tot 3 % te laag (meer laat de bewaking niet toe: daarboven meldt ze "toerental"). De firmware meldt met 10 % marge op de reserve: f ≤ 1 + 0,9 (g − 1), met g de ongunstigste grens. f komt rechtstreeks uit `regel.h` (vervangStand, vervangFactor, beschermVanaf).

| stand (toerental) | schoon debiet (m³/h) | grens g (x schone sensordruk) | firmware f (regel.h) | debiet bij de melding, ongunstigst (m³/h) | oordeel |
| ---: | ---: | ---: | ---: | ---: | --- |
| 40 % | 96–112 | — (haalt het minimum niet) | lage stand | — | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 50 % | 132–156 | — (haalt het minimum niet) | lage stand | — | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 60 % | 170–203 | — (haalt het minimum niet) | lage stand | — | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 70 % | 208–252 | 1,05 | lage stand | — | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 75 % | 227–276 | 1,21 | 1,18 | 193 | melding op tijd |
| 80 % | 247–301 | 1,36 | 1,29 | 198 | melding op tijd |
| 85 % | 267–325 | 1,49 | 1,40 | 202 | melding op tijd |
| 90 % | 286–350 | 1,62 | 1,50 | 207 | melding op tijd |
| 95 % | 306–375 | 1,74 | 1,60 | 212 | melding op tijd |
| 100 % (boost) | 326–400 | 1,85 | 1,70 | 215 | melding op tijd |

Onder 75 % meldt de firmware "lage stand" (geen bescherming beloofd). **75 % is de laagste beschermende stand** (versie 7.1: 80 %; de opener plaat en de grotere verdeelruimte maken het verschil). **Dagstand: 75 tot 80 %**: op 75 % is het 1,4 dB stiller, op 80 % gaat een filter langer mee. 70 % haalt het minimum schoon nog wel, maar met de volle band blijft er geen reserve met marge over (g dicht bij 1).

**Koppeling met de firmware:** dit script leest `regel.h` zelf en stopt (exit ≠ 0) als een waarde daar niet meer klopt. Telkens het draait, keurt het ook een kopie van `regel.h` met de factoren 9/9/9 (mutatieproef): die moet afgekeurd worden, anders stopt het eveneens.

**Hoe lang gaat een filter mee?** Bij de melding mag de drukval van het filter stijgen tot (gewoon scenario):

| stand | filter schoon (Pa) | filter bij de melding (Pa) | stijging (Pa) | deel van de stijging tot 339 Pa (fabrikant) |
| ---: | ---: | ---: | ---: | ---: |
| 75 % | 133 | 161 | 28 | 14 % |
| 80 % | 145 | 194 | 49 | 25 % |
| 90 % | 169 | 269 | 100 | 59 % |
| 100 % | 193 | 354 | 162 | 110 % |

Wie op 75 % werkt, vervangt het filter dus vroeg (een klein deel van zijn stofcapaciteit); op 90 % gaat hetzelfde filter een paar keer zo lang mee, maar is het luider (2,5 dB tegenover 80 %). Een filter kost ongeveer € 7; de knop toont de drukreserve, zodat je ziet wanneer het zover is. Versie 7.2: de melding komt pas als de druk 5 minuten lang boven de grens bleef (het minimum over het venster, 3e), en blijft dan staan tot een nieuw filter geijkt is.

### 3c. Verdeelruimte tussen filter en instroomplaat

Tussen de onderkant van het filter en de instroomplaat zit 15,5 mm (steunrand 12,5 mm plus de foamband, hoogstens tot 3 mm ingedrukt; versie 7.1: 6,5 mm en 12,6 m/s). Als het filter overal even veel lucht doorlaat, moet 49 % van het debiet radiaal naar het oog (Ø127): door een ring van 6476 mm² is dat bij 250 m³/h 5,3 m/s. In werkelijkheid gaat meer lucht door het midden van het filter (boven het oog), waar de weg het kortst is: het filter wordt niet gelijk benut, en de dynamische druk in de ring is **geen** verlies dat zomaar bij de rest opgeteld mag worden. Daarom twee scenario's (geen bewezen grenzen): verwaarloosbaar (gelijke benutting) en ζ = 0,5 op de ringsnelheid (8 Pa bij 250 m³/h, kwadratisch met het debiet). Beide zitten in de 36 scenario's van 3b.

| stand | debiet zonder (m³/h) | debiet met ζ = 0,5 (m³/h) | v op 10 cm met ζ = 0,5 (m/s) | boven het minimum? |
| ---: | ---: | ---: | ---: | --- |
| 60 % | 189 | 186 | 0,49 | **nee** |
| 70 % | 233 | 229 | 0,60 | ja |
| 75 % | 256 | 250 | 0,66 | ja |
| 80 % | 278 | 272 | 0,72 | ja |
| 100 % | 370 | 362 | 0,95 | ja |

Het filter is een geschat filter (geen fabrikantcurve): 115 Pa bij 250 m³/h op het hele front (bovengrens van de literatuurband 55 tot 115 Pa). Ligt de echte weerstand lager, dan is er meer reserve; poort L1 meet het (Q–Δp bij elke stand, schoon en bij de melding).

### 3d. Geluid bij het dagwerkpunt

Werkpunt: de medewerker zit tegenover de klant, het oor op ± 0,5 m van het rooster. Model: vrije puntbron (69 dB(A) op 1 m bij vol toerental, ΔL = 50 log10 n), plus een budget van 1,5 dB voor rooster, kast en galm.

| stand | debiet (m³/h) | dB(A) op 1 m | dB(A) op 0,5 m (model) | op 0,5 m met budget |
| ---: | ---: | ---: | ---: | ---: |
| 75 % | 256 | 62,8 | 68,8 | 70,3 |
| 80 % | 278 | 64,2 | 70,2 | 71,7 |
| 90 % | 324 | 66,7 | 72,7 | 74,2 |
| 100 % (boost) | 370 | 69,0 | 75,0 | 76,5 |

**Comfortdoel (projectkeuze, geen norm):** dagstand 80 %: ≤ 72 dB(A) op de oorpositie, budget inbegrepen (model 70,2 + 1,5 = 71,7); boost kort luider. Dit is geen verbetering van het geluid: het vroegere doel van 55 dB(A) is met deze ventilator op een beschermende stand niet haalbaar en is vervangen door dit doel. Gehoorgrenzen voor werknemers (vanaf 80 dB(A) over 8 uur) liggen hoger; het doel gaat over comfort. Op de nieuwe laagste beschermende stand (75 %) is het model 70,3 dB(A) met budget. Poort G1 meet het, eerst op de proefopstelling (meetplan, stap 0).

**Ontkoppeling (versie 7.2).** De ventilator staat niet meer star op de bodem maar op 4 rubberbuffers Ø15 x 10 (NR 55 Shore A, ca. 80 N/mm per buffer volgens Halder). Met 750 g (datasheet) is de eigenfrequentie ongeveer 104 Hz. Trillingen boven √2 x 104 = 147 Hz (de schoepfrequentie en de tonen van de motor, enkele honderden Hz) worden gedempt: die gaan niet meer star in de kuip, de romp en het blad (het blad werkt anders als klankbord). De draaifrequentie zelf (52 Hz op 80 %, 65 Hz op 100 %) ligt onder de eigenfrequentie en wordt niet gedempt (ongeveer x 1,64 bij 100 %); bij een goed gebalanceerde waaier is die klein. Zachtere buffers (Ø15 x 15, 40 Shore) zouden ook die dempen: na te gaan als G1 een brom laat horen. Hoeveel dB(A) de ontkoppeling scheelt, rekenen we niet: G1 meet met en zonder buffers (vier M4-schroeven direct).

**Geluidsdemping in de uitblaas (punt e van het advies):** in de ronde kuip is tussen de waaier en de wand 4 mm: daar past geen akoestisch schuim zonder de luchtweg te vernauwen, en een labyrint kost diepte. Niet gedaan. Wat wel helpt zonder diepte: de lamellen blazen opzij en naar onder, weg van het oor, onder het blad (dat de rechte weg naar het oor afschermt). Blijkt G1 te luid: een uitblaaskap met schuim onder de kuip (ca. 30 mm dieper) is de volgende stap.

### 3e. Valse meldingen "filter vervangen" (versie 7.2)

Op 80 % meldt de firmware bij 1,29 x de schone sensordruk. Wat verschuift die verhouding zonder dat het filter voller is? Per geval de verhouding sensordruk / schoon met een schoon filter:

| geval | debiet (m³/h) | sensordruk / schoon | zonder venster | met het minimum over 5 min |
| --- | ---: | ---: | --- | --- |
| schoon, gewone lucht | 278 | 1,00 | geen melding | ook geen melding |
| luchtdichtheid +5 % (koud, hoge luchtdruk) | 283 | 1,02 | geen melding | ook geen melding |
| toerental 3 % te hoog (rand van de bewaking) | 289 | 1,04 | geen melding | ook geen melding |
| beide samen | 294 | 1,06 | geen melding | ook geen melding |
| hand op het rooster: 25 % van de gaten dicht | 269 | 1,06 | geen melding | ook geen melding |
| hand op het rooster: 50 % van de gaten dicht | 245 | 1,22 | geen melding | ook geen melding |
| hand op het rooster: 75 % van de gaten dicht | 178 | 1,63 | **valse melding** | geen melding als de hand niet 5 min onafgebroken ligt |

Een hand op het rooster doet de druk onder het filter stijgen (meer onderdruk), net als een vol filter. Daarom beslist de firmware sinds 7.2 op het **minimum over 5 minuten** werktijd op een te bewaken stand (10 emmers van 30 s): een hand, een arm of een handdoek die even op het rooster ligt, telt niet. Pas als de druk 5 minuten aan een stuk boven de grens blijft, komt de melding, en dan blijft ze staan (hysterese, ook na een herstart) tot een nieuw filter geijkt is. Luchtdichtheid en toerentalband samen blijven onder de grens (tabel; zo getest in test_regel).

**Ander merk filter:** een filter van een ander merk kan 15 tot 30 % meer weerstand hebben (de literatuurband is 55 tot 115 Pa). Vroeger weigerde de box dan de ijking en was de enige uitweg de koppelhandeling op de box. Sinds 7.2 is "ander merk filter" een eigen handeling op de knop (op "Nieuw filter?" 3 s vasthouden): de eerste ijking vervalt en de nieuwe wordt de referentie. Een ijking onder 0,70 x de eerste wordt geweigerd (geijkt zonder filter of met een kier).

### 3f. Filter ontbreekt of geen luchtstroom: stoppen (versie 7.2)

Zonder filter is de luchtweg lichter: meer debiet, maar de sensor ziet alleen nog het rooster. De verhouding sensordruk / schoon (bij hetzelfde toerental) per stand, over de band van de luchtweg (0,7x tot 1,5x); de firmware stopt na 3 s onder 0,70 x:

| stand | zonder filter (x schoon) | schoon, toerental 3 % te laag (x schoon) | onderscheid |
| ---: | ---: | ---: | --- |
| 30 % | 0,11 | 0,95 | ja |
| 50 % | 0,14 | 0,95 | ja |
| 75 % | 0,18 | 0,96 | ja |
| 80 % | 0,19 | 0,96 | ja |
| 100 % | 0,21 | 0,96 | ja |

Zonder filter ligt de sensordruk op elke stand ver onder de grens, een schoon filter op een iets te laag toerental ruim erboven: de stop kan op elke stand. De firmware vergelijkt met de schone druk bij het **gemeten** toerental (uit de ijking) en oordeelt pas als de ventilator opgelopen is: tijdens de zachte start geen valse stop (getest). Daarna start de ventilator pas weer na UIT en een nieuwe AAN op de knop. Een kleine kier ziet de drukmeter niet (6c): daarom blijft de controle van de lip bij elke wissel; en het vingerrooster is de vaste afscherming (6b), de stop komt erbovenop.

## 4. Elektriek

| post | waarde |
| --- | --- |
| ventilator vol toerental | 56,4 W, 2,35 A |
| 5 V gemiddeld (knop + module + drukmeter + diode) via de regelaar, η 0,85 | 2,0 W |
| 5 V piek (knop en module zenden tegelijk) | 0,78 A van de 1,0 A van de D24V10F5 (78 %) |
| totaal op 24 V (ventilator vol + 5 V-piek) | 61,0 W, 2,54 A |
| adapter Mean Well GST90A24-P1M | 90 W, 3,75 A: 68 % belast |
| zekering 3,15 A traag (Bel Fuse 0697W3150-01) | 81 % van de nominale stroom |

**Beveiliging, van de bron naar de last:**

- **Adapter:** overlast vanaf 110 tot 150 % van 90 W, dus 4,1 tot 5,6 A; dan hiccup (zet telkens even af en herstelt vanzelf). Overspanning en oververhitting: uit tot de stekker opnieuw in gaat (datablad Mean Well).
- **Zekering -F1:** Bel Fuse 0697W3150-01, traag, 3,15 A, 350 V AC / **72 V DC**, I²t 66 A²s (IEC 60127-3 blad 4). Bij 1,3 tot 1,8 x In smelt ze pas na minuten (1,5 x In: ≥ 60 min; 2,1 x In: ≤ 120 s): de adapter schakelt dus eerst af. De zekering is de reserve als de adapter zelf faalt of als er na de adapter een fout is die hij niet ziet. Inschakelen: de elco van 470 µF laden kost hoogstens C U² / 2R = 1,4 A²s (R ≥ 0,1 Ω), ver onder 66 A²s. De ventilator start met 50 % per seconde (regel.h, getest).
- **Schakelaar -Q4:** C&K D502J12S215PQA, **10 A bij 30 V DC** (resistief), 10 000 schakelingen; de ventilator trekt hoogstens 2,35 A. Volgorde vanaf de adapter: -X1, -Q4, -F1 (de schakelaar zit vóór de zekering). Uit = ventilator, regelaar en ESP32-C3 spanningsloos.
- **Ingang van de regelaar:** Pololu raadt boven 20 V een elco van minstens 33 µF dicht bij VIN aan (spanningspieken bij het inschakelen door de kabelinductie). Daarom -C2 47 µF / 50 V vlak bij VIN van -T3; de buffer -C1 is 470 µF / 50 V (niet 35 V: marge op 24 V plus piek). De regelaar mag tot 36 V aan de ingang.
- **Ventilator spanningsloos zonder besturing:** -Q2 (IRF4905, P-kanaal, 55 V, 20 mΩ) schakelt de 24 V naar de ventilator; -Q3 (BC547) trekt zijn gate laag via een deler (Vgs ≈ −12 V, binnen ±20 V) zodra GPIO7 van -K1 hoog is. Een weerstand van 10 kΩ houdt de basis van -Q3 laag: zonder 5 V of 3,3 V, tijdens een reset of bij het flashen staat -Q2 open en krijgt de ventilator geen spanning. Verlies in -Q2: 2,35 A² x 0,02 Ω = 0,11 W (zonder koellichaam).
- **5 V:** de D24V10F5 heeft een kortsluit- en overstroombeveiliging en schakelt af als ze te warm wordt. 1 A is een typische continue waarde die van de warmte afhangt; de piek van knop en module samen blijft eronder (tabel hierboven).
- **Ompoling (versie 7.2):** de DC-kabel van de adapter wordt ingekort en op -X1 geschroefd: wie de aders verwisselt, zet -24 V op de elco's, de regelaar en de MOSFET. Daarom zit -R13 (Schottky SB560, 5 A / 60 V) in sperrichting over L+ en M, achter -F1. Juist aangesloten spert ze (geen verlies). Verkeerd om geleidt ze: de spanning blijft op ongeveer -0,5 V, de adapter gaat in hiccup (4,1 tot 5,6 A in korte pulsen) en -F1 smelt na enige tijd. Bovendien: de min van de adapter heeft de witte streep of de opdruk "-" (nameten met de multimeter vóór het vastschroeven, bouwschema). Een inbouwbus voor de originele stekker (Ø5,5/2,5, midden +) was het alternatief; die past niet op de volle print van 40 x 50.
- **Tacho (versie 7.2):** de tachodraad loopt 0,5 m naast de PWM van 25 kHz. -R14 (1 kΩ in serie) en -C3 (10 nF naar M) bij GPIO4: τ = 10 µs, een tachopuls (hoogstens 130 Hz) gaat er ongeschonden door, een stoorpiek van enkele µs niet. In de software telt een flank pas 1,5 ms na de vorige (ontdendering) en komt het toerental uit de tijd tussen de pulsen (resolutie 1 µs in plaats van 1 puls per seconde = 3 % bij 900 min-1).
- **Watchdog (versie 7.2):** op de ESP32-C3 en de knop een task-watchdog van 3 s: loopt de lus vast, dan herstart de chip. Tijdens die herstart is -Q2 open (ventilator spanningsloos) en daarna staat alles UIT.
- **Terugvoeding:** de Schottky-diode -R12 (1N5819) zit tussen de 5 V en de 5V-pin van de ESP32-C3. Het ontwerp hangt niet af van hoe het bordje intern zijn USB-poort met de 5V-pin verbindt (rechtstreeks of met een eigen diode): -R12 spert in beide gevallen de weg terug naar de regelaar en de knop. De knop flash je met de kabel uit de box.

**Waarheidstabel: wat doet de ventilator bij een fout?** (veilige toestand = stil en spanningsloos)

| toestand | 24 V | 5 V / 3,3 V | -Q2 (24 V naar de ventilator) | PWM | ventilator | wat de gebruiker ziet |
| --- | --- | --- | --- | --- | --- | --- |
| normaal UIT | ja | ja | open (GPIO7 laag) | 0 % | stil, spanningsloos | knop: UIT |
| normaal AAN | ja | ja | dicht | geregeld | draait | knop: stand, Pa, tpm |
| 5 V of 3,3 V valt weg (24 V blijft) | ja | nee | open (basis laag via 10 kΩ) | zwevend | stil, spanningsloos | knop zwart |
| reset of flashen van -K1 | ja | ja | open (pinnen hoogohmig) | zwevend | stil | knop: UIT? (geen status) |
| kortsluiting in de USB-C-kabel naar de knop | ja | zakt (regelaar begrenst) | open | zwevend | stil | knop zwart |
| radio weg, -K1 werkt | ja | ja | dicht | laatste gewone stand | draait verder (geen boost), na 10 min stil | knop: AAN? / UIT? |
| filter eruit of slang los (7.2) | ja | ja | open na 3 s | 0 % | stil na 3 s | knop: gestopt, filter ontbreekt |
| 4 uur geen bediening (7.2) | ja | ja | open | 0 % | stil | knop: 4 uur niets gedaan: uit |
| firmware loopt vast (7.2) | ja | ja | open (watchdog-herstart) | zwevend | stil, daarna UIT | knop: UIT? / afzuiging herstart |
| PWM-draad los of gebroken | ja | ja | dicht | los | **vol toerental** (datasheet: open stuurdraad = 100 %) | knop: toerental wijkt af; UIT op de knop maakt hem spanningsloos |
| ventilator te traag of PWM verzadigd | ja | ja | dicht | geregeld | draait | knop: toerental wijkt af (geen filteroordeel) |
| -Q4 uit of zekering gesmolten | nee | nee | open | — | stil | knop zwart |

Na elke herstart van -K1 staat de afzuiging UIT tot een nieuwe handeling op de knop (regel.h, getest).

- **Terugvoeding:** de Schottky-diode -R12 (1N5819) zit tussen de 5 V en de 5V-pin van de ESP32-C3. Hangt de box aan een computer om te flashen, dan voedt de computer alleen de ESP32-C3, niet de regelaar en niet de knop. De knop flash je met de kabel uit de box (in de computer): dan is er geen tweede bron.

| kabel | mm² | lus (m) | I (A) | R lus (Ω) | ΔU (V) | verlies (W) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| montagedraad in de box, -Q2 en M naar -X9 (0,15 m) | 0,50 | 0,3 | 2,35 | 0,01 | 0,02 | 0,06 |
| M8-kabel -W2 box -> module (0,5 m), 24 V en massa | 0,25 | 1,0 | 2,35 | 0,07 | 0,16 | 0,39 |
| aders van de ventilator (AWG 24, ca. 0,3 m tot -X10) | 0,20 | 0,6 | 2,35 | 0,05 | 0,12 | 0,28 |
| adapter -> box (DC-snoer van de adapter) | 0,75 | 3,0 | 2,55 | 0,07 | 0,18 | 0,46 |
| USB-C box -> knop, 5 V | 0,20 | 2,0 | 0,30 | 0,18 | 0,05 | 0,02 |

De M8-connector (binder 718, 4 polen) mag 4 A per contact; de ventilatorstroom loopt over één contact heen en één terug. Bij een fout begrenst de adapter op hoogstens 5,6 A (hiccup), ook voor de draad van 0,25 mm². De spanningsval van 0,1 tot 0,2 V maakt voor de ventilator niets uit. **Versie 7.2, gelijkgetrokken:** in de box montagedraad 0,5 mm² voor 24 V en M naar -X9; de M8-kabel heeft 4 x 0,25 mm² (zo verkocht, niet te kiezen); de aders van de ventilator zijn AWG 24 (datasheet). Schema, bestellijst en dit rekenblad zeggen nu hetzelfde.

## 5. Warmte in de voedingsbox

In de box zit alleen de adapter en de kleine elektronica; de ventilator zit in de module. Verlies van de adapter = P_uit (1/η − 1). De adapter mag volgens de deratingcurve van Mean Well 100 % last tot 40 °C, lineair dalend naar 50 % bij 70 °C (horizontaal); onder 50 % last tot 70 °C.

| stand | P naar de module (W) | last adapter | verlies in de box (W) | ΔT lucht in de box (K) | lucht in de box bij 25 °C | adapter mag tot |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 40 % toerental | 5,6 | 6 % | 1,87 | 3–6 | 28–31 °C | 70 °C |
| 60 % | 14,2 | 16 % | 3,04 | 6–10 | 31–35 °C | 70 °C |
| 75 % (lage stand) | 25,8 | 29 % | 4,62 | 8–15 | 33–40 °C | 70 °C |
| 80 % (dagstand: laagste beschermende en hoogste gewone stand) | 30,9 | 34 % | 5,31 | 10–17 | 35–42 °C | 70 °C |
| 100 % (boost) | 58,4 | 65 % | 9,07 | 16–28 | 41–53 °C | 61 °C |
| 80 % met zoveel boost als het tegoed toelaat (1/5 op 100 %, gemiddeld) | — | — | 6,06 | 11–19 | 36–44 °C | 61 °C |

In de box: de adapter, de regelaar en 0,50 W van de ESP32-C3, de drukmeter en de diode (de knop zit in het blad). De warmte in de box bereikt geen evenwicht in de 120 s van één boost; het gemiddelde met het boosttegoed (hoogstens 1/5 van de tijd op 100 %, regel.h, getest) is het geval om op te rekenen.

**Grenzen:** de adapter staat in elke stand op hoogstens 65 % last en mag dan tot 61 °C omgeving (datablad). De strengste grens is het PETG van de box: warmtevervormingstemperatuur 68 °C (Prusament, 0,45 MPa); we houden de lucht in de box onder 60 °C. Het ongunstigste geval hierboven (h = 5 W/m²K, 25 °C in de salon) is 44 °C. Poort E1 meet het (4 uur, adapter en box). Model: wanden (h = 5 tot 10 W/m²K) plus de schoorsteenstroom door de bodem- en achterwandsleuven.

**Foutgeval en herstarts:** blijft de ventilator door een fout continu op 100 % in een salon van 30 °C, dan wordt de lucht in de box 58 °C: onder 60 °C en onder de 61 °C van de adapter. De warmte is dus ook zonder boostgrens veilig; het boosttegoed (begint na elke start op 0, ook na een warme herstart) begrenst vooral het geluid. Valt de besturing weg, dan staat de ventilator stil (hoofdstuk 4).

## 6. Bevestiging

Montage van beide klauwtypen: draaien tot het rubberkussen het blad raakt, dan **een halve slag** (180°). De kracht volgt uit het rubber (Gent: E uit de Shore-hardheid, met de vormfactor) en de arm (PETG) in serie. De resultante van het contact ligt ergens op het rubber; beide randen worden gerekend, Shore 35 tot 45, koud en warm (40 °C: stijfheid en sterkte x 0,9, AANNAME). De blijvende spanning is 1/5 van de vloeigrens (47 MPa, Prusament PETG): 9,4 MPa. Dat is een AANNAME (er is geen gepubliceerde kruipwaarde voor PETG), geen datablad.

| klauw | arm (mm) | rubber | veer rubber (N/mm) | kracht na een halve slag (N) | kruipgrens arm, slechtst (N) | marge | dak boven de moer (N) |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| module (M5, 8 x 6) | 9,5 tot 17,0 | neopreen Shore A 40, 4 mm, 7,5 x 8 | 29–43 | 9–13 | 24 | 1,9 | 673 |
| knop (M4, 6 x 5) | 7,5 tot 13,5 | neopreen Shore A 40, 3 mm, 6,0 x 6 | 24–35 | 7–9 | 16 | 1,7 | 524 |

- **Waarom zo weinig genoeg is:** het gewicht van de module en de druk van handen gaan via de rand van het bovenframe (5 mm rondom) naar het blad, niet via de klauwen. De klauwen houden de module alleen omlaag tegen optillen en trillen: samen minstens 38 N tegen ongeveer 20 N gewicht. De knop weegt 50 g en wordt alleen gedraaid en ingedrukt.
- **Druk op het blad:** het rubber (7,5 x 8 mm) drukt met hoogstens 0,21 MPa op de onderhuid: ver onder wat vezelplaat verdraagt (enkele MPa).
- **Een halve slag te veel** (dus een hele) geeft tot 25 N bij de buitenrand: rond de kruipgrens. De handleiding zegt daarom "een halve slag" en toont het met de schroefgleuf.
- **Voedingsbox (versie 7.2):** 0,7 kg = 7 N op 4 spaanplaatschroeven 4 x 16 verzonken. Ze draaien nu niet meer alleen in de onderhuid van 3 mm maar door de huid in een houten lat van 10 x 30 mm die binnen tegen de onderhuid gelijmd is (6d). Uittrekkracht per schroef in 10 mm naaldhout: AANNAME ≥ 100 N (voorzichtig; in alleen 3 mm vezelplaat was het ≥ 30 N). Ongunstig geval: gewicht plus 20 N trek aan een kabel op één hoek: hoogstens ongeveer 12 N op één schroef. Poort M1 trekt eraan.
- **Frame op het blad (versie 7.2):** de rand van 5 mm van het bovenframe ligt op de bovenhuid; daaronder zit nu rondom een lat van 28 x 44 mm tussen de huiden (6d): de last van een leunende arm gaat in hout, niet in 3 mm vezelplaat boven papier.
- **Fanschroeven M4 x 10:** kop 1 mm verzonken in een plaat van 6 mm, dus 5 mm indraaiing (fabrikant: 4 tot 6). Met plaat ±0,2 en schroeflengte ±0,2 (ISO 4759-1, klasse A): 4,6 tot 5,4 mm.

## 6b. Vingerrooster in het oog

Versie 7.2: 18 ribben 1,6 mm breed en 12,0 mm hoog op steek 7,2 (spleten 5,6 mm, met de printtolerantie hoogstens 5,9), een dwarsrib en twee ringen (r 24 en 44). De onderkant ligt 2,05 mm boven de waaier, de bovenkant dus 14,1 mm. Versie 7.1 had spleten van 10,4 tot 10,8 mm op 9 mm: te weinig volgens de norm hieronder.

**EN ISO 13857:2019, tabel 4 (personen vanaf 14 jaar, sleuf):** e ≤ 4 mm: 2 mm afstand; 4 < e ≤ 6: 10 mm; 6 < e ≤ 8: 20 mm; 8 < e ≤ 10: 80 mm; 10 < e ≤ 12: 100 mm (bron: overgenomen in de veiligheidsgids van Troax, p. 6; de norm zelf is niet gratis). Hier: e ≤ 5,9 mm, dus nodig 10 mm; aanwezig 14,1 mm: **voldoet**. De plaat en het filter zijn zonder gereedschap af te nemen en tellen dus niet als afscherming; het vingerrooster is gelijmd (vaste afscherming). De lamellen van de kuip (banden van 4 mm, loodrecht 2,8 mm) vallen onder e ≤ 4 mm: 2 mm nodig, de waaier zit 7 mm achter de wand.

**Rekenmodel:** balkrooster (1183 knopen, 1222 balkjes) met buiging en wringing; de uiteinden van de ribben op de rand van het oog als scharnier (ongunstiger dan ingeklemd); PETG E = 1200 MPa (1500 min 20 % voor warmte en printrichting). Een last van **10 N** (projectkeuze, geen normwaarde) staat om de beurt op elke knoop (om de 2 mm). Grootste doorbuiging onder de last: **0,12 mm** (bij x = 22, z = -9); zonder de ringen zou dat 0,21 mm zijn.

**Ruimte tot de waaier:** 2,05 mm, min 0,3 mm printtolerantie. Een vinger (Ø12, bolle top R6, de ongunstigste vorm) zakt 0,7 mm in een spleet: dat blijft binnen de ribhoogte van 12,0 mm. Beschikbaar: 1,75 mm, doorbuiging 0,12 mm: **factor 15,2**. Het rooster zit vast in de gelijmde instroomplaat en blijft staan als het filter eruit is. Poort W1 controleert het met een proefvinger, nooit met een draaiende ventilator (schakelaar UIT).

## 6c. Afdichting van het filter

Het filter (195 x 145 x 30, maattolerantie AANNAME ±1 mm, hoogte 29 tot 31) ligt los op een zachte foamband in een geleiderand met 1 mm speling rondom. **De afdichting is een lip** van zelfklevend siliconenrubber (0,5 mm, Shore A 60, E ≈ 3,6 MPa) op de geleiderand, 2,5 mm over de nominale rand van het filter: bij het inleggen buigt het filter de lip naar onder en ze ligt rondom tegen de zijkant. De lucht boven de lip staat onder hogere druk dan eronder: de lip wordt in de spleet gedrukt (zelfversterkend). De foamband draagt het filter alleen nog.

**Maatketen (min/max):**

| geval | waarde | gevolg |
| --- | --- | --- |
| kleinste filter (194 x 144), naar één kant geschoven | spleet tot 3,0 mm aan de andere kant | de lip reikt nog 1,0 mm tegen de zijkant: contact rondom |
| grootste filter (196 x 146), naar één kant geschoven | spleet 0 mm aan die kant | de lip zit geklemd tussen filter en rand: dicht |
| filterhoogte 29 tot 31 mm (versie 7.2: 3 mm lager) | bovenkant 2,5 tot 0,5 mm onder het blad | 3 tot 5 mm lucht tot de RVS-plaat (onderkant 2,5): ook de gaten naast het filter doen mee; het filter kan hoogstens 3 tot 5 mm opschuiven, de lip (2,5 mm) blijft dan nog over de rand |
| foamband 0 tot 1 mm ingedrukt (gewicht en onderdruk) | verdeelruimte 15,5 tot 16,5 mm | boven de ribben van het vingerrooster (12 mm) blijft 6,5 tot 7,5 mm |

**Wat er langs kan:** zou er rondom toch een spleet van 20 µm blijven, dan lekt er bij het grootste drukverschil (547 Pa, boost bij de melding, x 1,5) 0,05 m³/h langs het filter (Poiseuille, 1 mm contact): verwaarloosbaar. Bij 0,1 mm rondom is het 6,2 m³/h: dat sluit de lip juist uit. Ontbreekt het filter of ligt het scheef (grote omloop), dan zakt de sensordruk onder 0,70 x schoon en meldt de knop "filter ontbreekt of sluit niet af" (regel.h; zonder filter rekent het model 0,27 tot 0,54 x). Een kleine omloop ziet de drukmeter niet: daarom staat in de onderhoudsstappen "lip rondom tegen het filter?" (zien en voelen).

## 6d. Tafelblad LAGKAPTEN met de uitsparingen (versie 7.2)

LAGKAPTEN is 34 mm dik: twee huiden van vezelplaat (hardboard) op een kern van papieren honingraat, met een rand van spaanplaat (IKEA). IKEA geeft 50 kg verdeeld en 15 kg geconcentreerd als grens. De dikte van de huiden staat nergens: **AANNAME 3 mm**, na te meten in de eerste uitsparing. Het blad ligt op twee ALEX-kasten: de vrije overspanning in het midden is 680 mm, en precies daar zitten de gaten.

**Wat er weg is (ongunstigste doorsnede, x = -60 mm):** bovenhuid 212 mm (de uitsparing van de module), onderhuid 212 + 102 (de voedingsbox) + 38 mm (de sleuf naar de module, 29 x 7, loopt over 38 mm van voor naar achter door die doorsnede). Van 600 mm blijft 388 mm bovenhuid en 248 mm onderhuid.

**Rekenmodel:** vrij opgelegde sandwichbalk over 680 mm met een last in het midden, de verzwakte doorsnede over de hele lengte (ongunstig). Buiging door de huiden (E vezelplaat 2500 tot 4000 MPa, AANNAME), afschuiving door de papieren kern (G 2 tot 6 MPa, AANNAME: geen fabrikantwaarde). De latten rond de uitsparingen maken de randen stijf maar tellen hier niet mee.

| last in het midden | doorbuiging buiging (mm) | doorbuiging afschuiving kern (mm) | samen (mm) | spanning huid (MPa) | zelfde blad zonder gaten (mm) |
| --- | ---: | ---: | ---: | ---: | ---: |
| 150 N (15 kg: grens van IKEA voor een geconcentreerde last) | 0,6–0,9 | 0,6–1,7 | 1,1–2,6 | 1,1 | 1,1 |
| 300 N (iemand leunt met beide ellebogen) | 1,1–1,8 | 1,1–3,3 | 2,2–5,1 | 2,2 | 2,3 |
| 500 N (50 kg: zitten op het blad, buiten de grens) | 1,9–3,0 | 1,8–5,5 | 3,7–8,5 | 3,7 | 3,8 |

De spanning in de huid blijft klein (vezelplaat breekt bij enkele tientallen MPa). De doorbuiging met 15 kg is hoogstens ongeveer 2,6 mm, de kern bepaalt het meeste: dat is een AANNAME en daarom meet poort M1 het (doorbuigproef met 15 kg op het frame en 50 kg verdeeld). Met de gaten buigt het blad ongeveer 2,2 keer zoveel als zonder (ongunstig gerekend).

**Latten tussen de huiden (versie 7.2, werkwijze in de README en tekening AFZ-20):**

- **Rond de uitsparing van de module (212 x 212, doorgaand):** vier geschaafde vurenhouten latten 28 x 44 mm, elk 212 mm lang, in de holte langs elke zijde. Na het frezen de honingraat rondom 45 mm diep wegsnijden (mes, schroevendraaier), de lat met PU-lijm of houtlijm D3 op beide huiden schuiven, de binnenkant gelijk met de rand van de uitsparing, en klemmen tot de lijm hard is. De rand van het frame (5 mm) en de klauwen (onder de onderhuid) drukken dan op hout.
- **Rond de uitsparing van de box (212 x 102 x 15, van onderen):** twee latten 10 x 30 mm (multiplex of beuken), 200 mm lang, voor en achter, tegen de binnenkant van de onderhuid gelijmd (de honingraat 32 mm diep wegsnijden). De 4 schroeven 4 x 16 van de box draaien door de huid 10 mm in de lat.
- **Kern 28 mm:** dat volgt uit de aanname van 3 mm per huid; is de kern anders, dan de lat op die maat schaven.
- **Alternatief:** een massief blad (multiplex berken 30 mm of massief eiken 26 tot 30 mm): geen latten nodig, de klauwen werken van 10 tot 50 mm, de schroeven van de box houden zonder meer. Duurder en zwaarder.

## 7. Morsen (begrensd scenario)

Scenario: een fles nagellak of remover van 15 ml valt om op het rooster. Een deel loopt door de gaten (ongeveer 25 % open); in het ongunstigste geval alles. De RVS-plaat en het siliconen van de lip kunnen ertegen; PETG niet tegen aceton (docs/Materiaalstaat.md). Het filter heeft ongeveer 0,38 m² vlies (46 plooien van 28 mm). AANNAME: vlies houdt 100 tot 300 g vloeistof per m² vast, dus 38 tot 113 ml: **15 ml blijft in het filter**. Wat er toch door komt, valt in het oog op de waaier en wordt tegen de wand van de kuip geslingerd en door de lamellen en ringsleuven naar buiten (onder het blad; de voedingsbox staat erachter, buiten de uitblaas).

Daarom na morsen: schakelaar UIT, stilstand, filter in een zak (weg), en dan de inspectie met afkeurgrenzen uit `onderhoud.mjs` ("Na morsen"). Voor de waaier: schakelaar UIT, de M8-stekker onder het blad los, de vier klauwen los en de module er van boven uit; dan de kuip met de ventilator los (4 x M3). Niets staat dan onder spanning of draait.

