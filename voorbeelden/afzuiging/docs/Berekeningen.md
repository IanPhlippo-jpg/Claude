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

**Minimum: 190 m³/h** (0,5 m/s op 10 cm), ook met een vol filter. **Ontwerpdebiet: 250 m³/h** met een schoon filter (0,66 m/s op 10 cm). Meer debiet geeft vooral meer geluid; 500 m³/h is geen doel meer.

## 2. Weerstand van de luchtweg zonder filter

| onderdeel | ζ | oppervlak (cm²) | Δp bij 250 m³/h (Pa) |
| --- | ---: | ---: | ---: |
| RVS-rooster (f = 0,35) | 17,59 | 404 | 31 |
| cassettebodem (f = 0,56) | 1,08 | 292 | 4 |
| instroom naar het oog Ø127 (trechter 45°) | 0,50 | 127 | 9 |
| uitblaas door de schuine lamellen | 2,50 | 207 | 17 |
| **samen** |  |  | **61** (43 tot 91) |

ζ van de platen volgens Idelchik (dunne geperforeerde plaat); de instroom en de lamellen zijn schattingen. Daarom staat overal een band van 0,7x tot 1,5x.

## 3. Werkpunt per filter

Snijpunt van de ventilatorcurve (100 % en lager toerental, Q ~ n, p ~ n²) met filter plus luchtweg. Vol filter = de einddrukval van de fabrikant (of 2x schoon als die ontbreekt).

| filter | Δp filter bij 250 (Pa) | max. debiet schoon | max. debiet vol | toerental voor 250 schoon | toerental voor 190 vol | dB(A) op 1 m / 0,5 m bij 250 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **gekozen:** Rittal SK 3171.100 (G3), 17 mm, gerekend als G4 (veilige kant) | 54 | 392–461 | 229–244 | 59 %–67 % | 86 %–89 % | 57–60 / 64–66 |
| vlakke mat M5 (ePM10 50 %), 20 mm, referentie Nittmann V400S | 223 | 294–327 | 214–227 | 83 %–89 % | 90 %–93 % | 65–66 / 71–72 |
| minipleat ePM1 65 % (F7), 48 mm, TROX MFP-PLA op maat | 125 | 347–397 | 283–311 | 70 %–77 % | 72 %–76 % | 61–63 / 67–69 |
| minipleat ePM1 90 % (F9), 48 mm, TROX MFP-PLA op maat | 212 | 300–334 | 220–234 | 82 %–88 % | 88 %–91 % | 65–66 / 71–72 |
| H13 (EN 1822), 150 mm, Freudenberg SF13 (ter vergelijking, past niet) | 538 | 197 | 118 | — | — | — |

**Met de gekozen mat (schoon), per stand:** debiet en luchtsnelheid boven het midden van het rooster.

| toerental | debiet (m³/h) | op 10 cm | op 15 cm | op 20 cm | dB(A) op 1 m |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 40 % | 148 | 0,39 | 0,21 | 0,12 | 49 |
| 60 % | 241 | 0,63 | 0,34 | 0,20 | 58 |
| 70 % | 288 | 0,76 | 0,40 | 0,24 | 61 |
| 80 % | 335 | 0,88 | 0,47 | 0,28 | 64 |
| 100 % (boost) | 430 | 1,13 | 0,60 | 0,36 | 69 |

20 cm boven het rooster haalt geen enkele stand 0,5 m/s: dat vraagt ongeveer 600 m³/h, meer dan deze ventilator met rooster en filter levert.

De stand is een fractie van het volle **toerental**: de firmware regelt het toerental (ijktabel PWM -> toerental plus bijregeling op de tacho, regel.h). Debiet, geluid en warmte in dit rekenblad gebruiken dezelfde grootheid. Het geluid volgt ΔL = 50 log10(n/n_vol) en een vrije puntbron; roosterfluit, kastresonantie en galm komen erbij (meten: poort G1).

### 3b. Melding "filter vervangen" per stand

De drukmeter ziet rooster + mat + cassettebodem. Bij een vollere mat zakt het debiet; de melding moet komen vóór het debiet onder het minimum voor de vangst (190 m³/h) zakt. Zes scenario's per stand: de verliesband 0,7x / 1x / 1,5x, telkens zonder en met de bovengrens van de verdeelruimte (hoofdstuk 3c). De firmware neemt het ongunstigste scenario met 10 % marge.

| stand (toerental) | schoon debiet (m³/h) | grens: x de schone sensordruk (laagste) | firmware (regel.h) | oordeel |
| ---: | ---: | ---: | ---: | --- |
| 40 % | 106–156 | — | lage stand | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 50 % | 137–205 | — | lage stand | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 60 % | 169–256 | — | lage stand | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 70 % | 200–307 | 1,22 | 1,10 | melding op tijd (marge ≥ 10 %) |
| 75 % | 215–332 | 1,53 | 1,34 | melding op tijd (marge ≥ 10 %) |
| 80 % | 231–358 | 1,76 | 1,58 | melding op tijd (marge ≥ 10 %) |
| 90 % | 262–409 | 1,94 | 1,73 | melding op tijd (marge ≥ 10 %) |
| 100 % | 294–461 | 2,09 | 1,88 | melding op tijd (marge ≥ 10 %) |

De firmware meldt onder 70 % "lage stand" (geen bescherming beloofd). Dit rekenblad faalt als de waarden in regel.h niet meer kloppen met het model. Poort L1 (Q–Δp gemeten) mag de grenzen later verruimen; tot dan gelden deze.

### 3c. Verdeelruimte tussen mat en instroomplaat

Tussen de onderkant van de mat en de instroomplaat zit 4,3 mm (3 mm vrij plus de open roosterbodem). Als de mat overal even veel lucht doorlaat, moet 57 % van het debiet radiaal naar het oog (Ø127): door een ring van 1788 mm² is dat bij 250 m³/h 22,0 m/s. In werkelijkheid gaat meer lucht door het midden van de mat (boven het oog), waar de weg het kortst is: de mat wordt niet gelijk benut, en de dynamische druk in de ring is **geen** verlies dat zomaar bij de rest opgeteld mag worden. Daarom twee grenzen: verwaarloosbaar (gelijke benutting) en een bovengrens van ζ = 0,5 op de ringsnelheid (145 Pa bij 250 m³/h, kwadratisch met het debiet).

| stand | debiet zonder (m³/h) | debiet met de bovengrens (m³/h) | v op 10 cm met de bovengrens (m/s) | boven het minimum? |
| ---: | ---: | ---: | ---: | --- |
| 60 % | 241 | 176 | 0,46 | **nee** |
| 70 % | 288 | 209 | 0,55 | ja |
| 80 % | 335 | 242 | 0,64 | ja |
| 100 % | 430 | 308 | 0,81 | ja |

Met de bovengrens haalt 60 % het minimum niet: daarom is **70 % de laagste beschermende stand** (`beschermVanaf` in regel.h) en houdt de melding "filter vervangen" rekening met de bovengrens (hoofdstuk 3b). Wat het echt is, meet poort L1 (Q–Δp bij elke stand, met en zonder mat); blijkt het verlies klein, dan mag 60 % weer meetellen. Een hogere verdeelruimte (de instroomplaat lager) kost diepte onder het blad: niet gekozen.

### 3d. Geluidsdoel bij het dagwerkpunt

Werkpunt: de medewerker zit tegenover de klant, het oor op ± 0,5 m van het rooster (vrije puntbron, zonder roosterfluit of galm). Dagstand: 70 %, de laagste beschermende stand.

| stand | debiet (m³/h) | dB(A) op 1 m | dB(A) op 0,5 m (oor) |
| ---: | ---: | ---: | ---: |
| 70 % | 288 | 61 | 67 |
| 80 % | 335 | 64 | 70 |
| 100 % (boost) | 430 | 69 | 75 |

**Doel (projectdoel, geen norm):** dagstand 70 %: ≤ 67 dB(A) op de oorpositie (model 67); 80 %: ≤ 70 dB(A); boost kort luider. Het vroegere doel van 55 dB(A) op het oor is met deze ventilator op een beschermende stand niet haalbaar en is geschrapt. Stiller kan alleen met een grotere, langzamere ventilator of geluiddemping in de uitblaas (niet gekozen: dieper en duurder). Alle gehoorgrenzen voor werknemers (vanaf 80 dB(A) gemiddeld over 8 uur) liggen ver boven deze waarden; het doel gaat over comfort. Poort G1 meet het.

## 4. Elektriek

| post | waarde |
| --- | --- |
| ventilator vol toerental | 56,4 W, 2,35 A |
| 5 V (knop + module + drukmeter, piek) via buck η 0,85 | 2,0 W |
| totaal op 24 V | 58,4 W, 2,43 A |
| adapter Mean Well GST90A24-P1M | 90 W, 3.75 A: 65 % belast |
| zekering 3.15 A traag (TR5) | 77 % van de nominale stroom |

Zekering: TR5, traag, 3,15 A, met een DC-spanning van minstens 32 V en een afschakelvermogen dat de kortsluitstroom van de adapter dekt (de adapter heeft zelf een stroombegrenzing en kortsluitbeveiliging). Kies een type met een opgegeven DC-waarde op het datablad. De aanloopstroom van de ventilator blijft binnen de traag-curve: de firmware laat de PWM hooguit 50 % per seconde stijgen (regel.h, getest).

| kabel | mm² | lus (m) | I (A) | R lus (Ω) | ΔU (V) | verlies (W) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M8-kabel -W2 box -> module (0,5 m), 24 V en massa | 0,25 | 1,0 | 2,35 | 0,07 | 0,16 | 0,39 |
| adapter -> box (DC-snoer van de adapter) | 0,75 | 3,0 | 2,55 | 0,07 | 0,18 | 0,46 |
| USB-C box -> knop, 5 V | 0,20 | 2,0 | 0,30 | 0,18 | 0,05 | 0,02 |

De M8-connector (binder 718, 4 polen) mag 4 A per contact; de ventilatorstroom loopt over één contact heen en één terug. De spanningsval van 0,1 tot 0,2 V maakt voor de ventilator niets uit.

## 5. Warmte in de voedingsbox

In de box zit alleen de adapter en de kleine elektronica; de ventilator zit in de module. Verlies van de adapter = P_uit (1/η − 1).

| stand | P naar de module (W) | verlies in de box (W) | ΔT lucht in de box (K) | adapter-omgeving bij 25 °C |
| --- | ---: | ---: | ---: | ---: |
| 40 % toerental | 5,6 | 1,89 | 3–6 | 28–31 °C |
| 60 % | 14,2 | 3,06 | 6–10 | 31–35 °C |
| 70 % (dagstand, laagste beschermende stand) | 21,4 | 4,04 | 7–13 | 32–38 °C |
| 80 % (hoogste gewone stand) | 30,9 | 5,34 | 10–17 | 35–42 °C |
| 100 % (boost) | 58,4 | 9,09 | 16–28 | 41–53 °C |
| 80 % met zoveel boost als het tegoed toelaat (1/5 op 100 %, gemiddeld) | — | 6,09 | 11–19 | 36–44 °C |

In de box: de adapter, de regelaar en 0,52 W van de ESP32-C3 en de drukmeter (de knop zit in het blad). De warmte in de box bereikt geen evenwicht in de 120 s van één boost; het gemiddelde met het boosttegoed (hoogstens 1/5 van de tijd op 100 %, regel.h, getest) is het geval om op te rekenen.

**Grens:** de adapter levert vol vermogen tot 40 °C omgeving; bij minder last laat de fabrikant volgens de deratingcurve meer toe, maar die cijfers zijn hier niet overgenomen: we rekenen met 40 °C als grens (veilige kant). Tot 70 % blijft de box daar onder. Op 80 % met boost komt het ongunstigste geval (h = 5 W/m²K) er 1 à 3 K boven: poort E1 meet het (4 uur, adapter en box); is het te warm, dan wordt `dagMaxPct` in regel.h 70 % en daalt het boosttegoed. PETG blijft ruim onder zijn verwekingstemperatuur (± 70 °C). Model: wanden (h = 5 tot 10 W/m²K) plus de schoorsteenstroom door de bodem- en achterwandsleuven.

## 6. Bevestiging

- **moduleklauw (M5):** arm 8 x 6 mm, hefboom 10 mm. Kruipgrens PETG (10 MPa) bij **48 N** per klauw; het dak boven de moer (1,8 mm) houdt 1247 N in afschuiving. Aanhaalmoment daarvoor: T = K F d = **0,05 Nm** (aandraaien met twee vingers aan de korte kant van de inbussleutel tot de klauw voelbaar aanligt; niet verder).
- **knopklauw (M4):** arm 6 x 5 mm, hefboom 8 mm. Kruipgrens PETG (10 MPa) bij **31 N** per klauw; het dak boven de moer (1,6 mm) houdt 970 N in afschuiving. Aanhaalmoment daarvoor: T = K F d = **0,03 Nm** (aandraaien met twee vingers aan de korte kant van de inbussleutel tot de klauw voelbaar aanligt; niet verder).
- **Waarom zo weinig genoeg is:** het gewicht van de module en de druk van handen gaan via de rand van het bovenframe (5 mm rondom) naar het blad, niet via de klauwen. De klauwen houden de module alleen omlaag tegen optillen en trillen: 4 x 48 N = 192 N tegen ongeveer 20 N gewicht (factor 10). De klauw is met opzet geen sterke klem: zo kan hij de honingraat van het blad niet indrukken.
- **Voedingsbox:** 0,7 kg = 7 N op 4 pluggen voor holle deuren, dus 2 N per plug. Vraag aan de plug: ≥ 20 N per stuk in de onderhuid van 3 mm (factor 10).
- **Fanschroeven M4 x 10:** kop 1 mm verzonken in een plaat van 6 mm, dus 5 mm indraaiing (fabrikant: 4 tot 6). Met plaat ±0,2 en schroeflengte ±0,2 (ISO 4759-1, klasse A): 4,6 tot 5,4 mm.

