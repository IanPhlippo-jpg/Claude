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
| RVS-rooster (f = 0,35) | 19,36 | 404 | 34 |
| vingerrooster in het oog (10 ribben 1,6 mm en een dwarsrib, f = 0,85) | 0,34 | 127 | 6 |
| instroom naar het oog Ø127 (trechter 45°) | 0,50 | 127 | 9 |
| uitblaas door de schuine lamellen | 2,50 | 207 | 17 |
| **samen** |  |  | **66** (47 tot 100) |

ζ van de platen volgens Idelchik (dunne geperforeerde plaat); de instroom en de lamellen zijn schattingen. Daarom staat overal een band van 0,7x tot 1,5x.

## 3. Werkpunt per filter

Snijpunt van de ventilatorcurve (100 % en lager toerental, Q ~ n, p ~ n²) met filter plus luchtweg. Vol filter = de einddrukval van de fabrikant (of 2x schoon als die ontbreekt).

| filter | Δp filter bij 250 (Pa) | max. debiet schoon | max. debiet vol | toerental voor 250 schoon | toerental voor 190 vol | dB(A) op 1 m / 0,5 m bij 250 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **gekozen:** interieurfilter MANN CU 20 013, 30 mm, geplooid | 130 | 337–388 | 230–247 | 71 %–79 % | 85 %–88 % | 62–64 / 68–70 |
| Rittal SK 3171.100 (G3), 17 mm, vroegere cassette 171 x 171 | 54 | 384–453 | 226–243 | 60 %–68 % | 86 %–89 % | 58–61 / 64–67 |
| vlakke mat M5 (ePM10 50 %), 20 mm, referentie Nittmann V400S | 261 | 273–302 | 194–204 | 88 %–94 % | 96 %–99 % | 66–68 / 72–74 |
| minipleat ePM1 65 % (F7), 48 mm, TROX MFP-PLA op maat | 146 | 328–376 | 261–286 | 74 %–81 % | 76 %–80 % | 62–64 / 68–70 |
| minipleat ePM1 90 % (F9), 48 mm, TROX MFP-PLA op maat | 248 | 279–309 | 200–211 | 87 %–92 % | 94 %–97 % | 66–67 / 72–73 |
| H13 (EN 1822), 150 mm, Freudenberg SF13 (ter vergelijking, past niet) | 630 | 176 | 103 | — | — | — |

**Met het gekozen filter (schoon), per stand:** debiet en luchtsnelheid boven het midden van het rooster.

| toerental | debiet (m³/h) | op 10 cm | op 15 cm | op 20 cm | dB(A) op 1 m |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 40 % | 105 | 0,28 | 0,15 | 0,09 | 49 |
| 60 % | 188 | 0,50 | 0,26 | 0,16 | 58 |
| 70 % | 231 | 0,61 | 0,32 | 0,19 | 61 |
| 75 % | 254 | 0,67 | 0,35 | 0,21 | 63 |
| 80 % | 276 | 0,73 | 0,39 | 0,23 | 64 |
| 100 % (boost) | 367 | 0,97 | 0,51 | 0,31 | 69 |

20 cm boven het rooster haalt geen enkele stand 0,5 m/s: dat vraagt ongeveer 600 m³/h, meer dan deze ventilator met rooster en filter levert.

De stand is een fractie van het volle **toerental**: de firmware regelt het toerental (ijktabel PWM -> toerental plus bijregeling op de tacho, regel.h). Debiet, geluid en warmte in dit rekenblad gebruiken dezelfde grootheid. Het geluid volgt ΔL = 50 log10(n/n_vol) en een vrije puntbron; roosterfluit, kastresonantie en galm komen erbij (meten: poort G1).

### 3b. Melding "filter vervangen" per stand

De drukmeter ziet rooster + filter. Bij een voller filter zakt het debiet; de melding moet komen vóór het debiet onder het minimum voor de vangst (190 m³/h) zakt. Zes scenario's per stand: de verliesband 0,7x / 1x / 1,5x, telkens zonder en met de bovengrens van de verdeelruimte (hoofdstuk 3c). De firmware neemt het ongunstigste scenario met 10 % marge.

| stand (toerental) | schoon debiet (m³/h) | grens: x de schone sensordruk (laagste) | firmware (regel.h) | oordeel |
| ---: | ---: | ---: | ---: | --- |
| 40 % | 94–108 | — | lage stand | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 50 % | 127–151 | — | lage stand | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 60 % | 162–197 | — | lage stand | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 70 % | 198–244 | — | lage stand | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 75 % | 216–268 | 1,20 | 1,08 | melding op tijd (marge ≥ 10 %) |
| 80 % | 234–291 | 1,33 | 1,19 | melding op tijd (marge ≥ 10 %) |
| 90 % | 270–339 | 1,49 | 1,31 | melding op tijd (marge ≥ 10 %) |
| 100 % | 306–388 | 1,63 | 1,44 | melding op tijd (marge ≥ 10 %) |

De firmware meldt onder 75 % "lage stand" (geen bescherming beloofd). Dit rekenblad faalt als de waarden in regel.h niet meer kloppen met het model. Poort L1 (Q–Δp gemeten) mag de grenzen later verruimen; tot dan gelden deze.

### 3c. Verdeelruimte tussen filter en instroomplaat

Tussen de onderkant van het filter en de instroomplaat zit 6,5 mm (steunrand 3,5 mm plus de foamband, onder de onderdruk hoogstens tot 3 mm ingedrukt). Als het filter overal even veel lucht doorlaat, moet 49 % van het debiet radiaal naar het oog (Ø127): door een ring van 2716 mm² is dat bij 250 m³/h 12,6 m/s. In werkelijkheid gaat meer lucht door het midden van het filter (boven het oog), waar de weg het kortst is: het filter wordt niet gelijk benut, en de dynamische druk in de ring is **geen** verlies dat zomaar bij de rest opgeteld mag worden. Daarom twee grenzen: verwaarloosbaar (gelijke benutting) en een bovengrens van ζ = 0,5 op de ringsnelheid (48 Pa bij 250 m³/h, kwadratisch met het debiet).

| stand | debiet zonder (m³/h) | debiet met de bovengrens (m³/h) | v op 10 cm met de bovengrens (m/s) | boven het minimum? |
| ---: | ---: | ---: | ---: | --- |
| 60 % | 188 | 171 | 0,45 | **nee** |
| 70 % | 231 | 209 | 0,55 | ja |
| 75 % | 254 | 229 | 0,60 | ja |
| 80 % | 276 | 248 | 0,65 | ja |
| 100 % | 367 | 327 | 0,86 | ja |

Het filter remt meer dan de vroegere mat (130 tegen 54 Pa bij 250 m³/h, met de bovengrens van de schatting). Met alle ongunstige aannames samen (filter 115 Pa op het hele front, luchtweg 1,5x, bovengrens van de verdeelruimte) haalt 70 % het minimum niet zeker meer: daarom is **75 % de laagste beschermende stand** (`beschermVanaf` in regel.h) en **80 % de dagstand**. Wat het echt is, meet poort L1 (Q–Δp bij elke stand, met een schoon en een vol filter); ligt de weerstand dichter bij de ondergrens (55 Pa), dan mag 70 % weer meetellen.

### 3d. Geluidsdoel bij het dagwerkpunt

Werkpunt: de medewerker zit tegenover de klant, het oor op ± 0,5 m van het rooster (vrije puntbron, zonder roosterfluit of galm). Dagstand: 80 % (75 % is de laagste beschermende stand).

| stand | debiet (m³/h) | dB(A) op 1 m | dB(A) op 0,5 m (oor) |
| ---: | ---: | ---: | ---: |
| 75 % | 254 | 63 | 69 |
| 80 % | 276 | 64 | 70 |
| 100 % (boost) | 367 | 69 | 75 |

**Doel (projectdoel, geen norm):** dagstand 80 %: ≤ 70 dB(A) op de oorpositie (model 70); 75 %: ≤ 69 dB(A); boost kort luider. Het vroegere doel van 55 dB(A) op het oor is met deze ventilator op een beschermende stand niet haalbaar en is geschrapt. Stiller kan alleen met een grotere, langzamere ventilator of geluiddemping in de uitblaas (niet gekozen: dieper en duurder). Alle gehoorgrenzen voor werknemers (vanaf 80 dB(A) gemiddeld over 8 uur) liggen ver boven deze waarden; het doel gaat over comfort. Poort G1 meet het.

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
- **Schakelaar -S1:** C&K D502J12S215PQA, **10 A bij 30 V DC** (resistief), 10 000 schakelingen; de ventilator trekt hoogstens 2,35 A. Hij schakelt de 24 V na de zekering: uit = ventilator, regelaar en ESP32-C3 spanningsloos.
- **5 V:** de D24V10F5 heeft een kortsluit- en overstroombeveiliging en schakelt af als ze te warm wordt. Bij een kortsluiting in de USB-C-kabel naar de knop valt de besturing weg; wat de ventilator dan doet, meet poort E2.
- **Terugvoeding:** de Schottky-diode -V1 (1N5819) zit tussen de 5 V en de 5V-pin van de ESP32-C3. Hangt de box aan een computer om te flashen, dan voedt de computer alleen de ESP32-C3, niet de regelaar en niet de knop. De knop flash je met de kabel uit de box (in de computer): dan is er geen tweede bron.

| kabel | mm² | lus (m) | I (A) | R lus (Ω) | ΔU (V) | verlies (W) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M8-kabel -W2 box -> module (0,5 m), 24 V en massa | 0,25 | 1,0 | 2,35 | 0,07 | 0,16 | 0,39 |
| adapter -> box (DC-snoer van de adapter) | 0,75 | 3,0 | 2,55 | 0,07 | 0,18 | 0,46 |
| USB-C box -> knop, 5 V | 0,20 | 2,0 | 0,30 | 0,18 | 0,05 | 0,02 |

De M8-connector (binder 718, 4 polen) mag 4 A per contact; de ventilatorstroom loopt over één contact heen en één terug. Bij een fout begrenst de adapter op hoogstens 5,6 A (hiccup), ook voor de draad van 0,25 mm². De spanningsval van 0,1 tot 0,2 V maakt voor de ventilator niets uit.

## 5. Warmte in de voedingsbox

In de box zit alleen de adapter en de kleine elektronica; de ventilator zit in de module. Verlies van de adapter = P_uit (1/η − 1). De adapter mag volgens de deratingcurve van Mean Well 100 % last tot 40 °C, lineair dalend naar 50 % bij 70 °C (horizontaal); onder 50 % last tot 70 °C.

| stand | P naar de module (W) | last adapter | verlies in de box (W) | ΔT lucht in de box (K) | lucht in de box bij 25 °C | adapter mag tot |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 40 % toerental | 5,6 | 6 % | 1,87 | 3–6 | 28–31 °C | 70 °C |
| 60 % | 14,2 | 16 % | 3,04 | 6–10 | 31–35 °C | 70 °C |
| 75 % (laagste beschermende stand) | 25,8 | 29 % | 4,62 | 8–15 | 33–40 °C | 70 °C |
| 80 % (dagstand, hoogste gewone stand) | 30,9 | 34 % | 5,31 | 10–17 | 35–42 °C | 70 °C |
| 100 % (boost) | 58,4 | 65 % | 9,07 | 16–28 | 41–53 °C | 61 °C |
| 80 % met zoveel boost als het tegoed toelaat (1/5 op 100 %, gemiddeld) | — | — | 6,06 | 11–19 | 36–44 °C | 61 °C |

In de box: de adapter, de regelaar en 0,50 W van de ESP32-C3, de drukmeter en de diode (de knop zit in het blad). De warmte in de box bereikt geen evenwicht in de 120 s van één boost; het gemiddelde met het boosttegoed (hoogstens 1/5 van de tijd op 100 %, regel.h, getest) is het geval om op te rekenen.

**Grenzen:** de adapter staat in elke stand op hoogstens 65 % last en mag dan tot 61 °C omgeving (datablad). De strengste grens is het PETG van de box: warmtevervormingstemperatuur 68 °C (Prusament, 0,45 MPa); we houden de lucht in de box onder 60 °C. Het ongunstigste geval hierboven (h = 5 W/m²K, 25 °C in de salon) is 44 °C. Poort E1 meet het (4 uur, adapter en box). Model: wanden (h = 5 tot 10 W/m²K) plus de schoorsteenstroom door de bodem- en achterwandsleuven.

## 6. Bevestiging

- **moduleklauw (M5):** arm 8 x 6 mm, hefboom 10 mm, plat geprint (de arm buigt in de laag). Blijvende spanning 9,4 MPa (1/5 van de vloeigrens van 47 MPa, Prusament PETG) bij **45 N** per klauw; het dak boven de moer (1,8 mm) houdt 748 N in afschuiving over de lagen (15 MPa). Bij K = 0,2 hoort daar T = K F d = 0,05 Nm bij.
- **knopklauw (M4):** arm 6 x 5 mm, hefboom 8 mm, plat geprint (de arm buigt in de laag). Blijvende spanning 9,4 MPa (1/5 van de vloeigrens van 47 MPa, Prusament PETG) bij **29 N** per klauw; het dak boven de moer (1,6 mm) houdt 582 N in afschuiving over de lagen (15 MPa). Bij K = 0,2 hoort daar T = K F d = 0,02 Nm bij.
- **Montage van de moduleklauw (begrensd door het rubber):** 0,05 Nm is met de hand niet te controleren. Daarom ligt er een rubberkussen op de arm (neopreen Shore A 40, 4 mm, 7,5 x 8): draaien tot het rubber het blad raakt, dan precies één slag (M5: 0,8 mm). Rubber (veer 35 N/mm, Shore 35 tot 45: 29 tot 43 N/mm) en arm in serie geven dan **22 tot 32 N** per klauw, onder de 45 N van de blijvende spanning. Een halve slag te veel geeft tot 48 N, rond de grens: daarom precies één slag, de handleiding zegt het zo. Het rubber verliest met de tijd wat spanning; dat mag, de klauw hoeft alleen optillen te beletten.
- **Knopklauwen (M4):** zonder rubber; aandraaien tot de klauw aanligt. De knop weegt 50 g en wordt alleen gedraaid en ingedrukt: de klauw houdt hem tegen optillen. Poort M1 meet beide.
- **Waarom zo weinig genoeg is:** het gewicht van de module en de druk van handen gaan via de rand van het bovenframe (5 mm rondom) naar het blad, niet via de klauwen. De klauwen houden de module alleen omlaag tegen optillen en trillen: 4 x 45 N = 180 N tegen ongeveer 20 N gewicht (factor 9). De klauw is met opzet geen sterke klem: zo kan hij de honingraat van het blad niet indrukken.
- **Voedingsbox:** 0,7 kg = 7 N op 4 pluggen voor holle deuren, dus 2 N per plug. Vraag aan de plug: ≥ 20 N per stuk in de onderhuid van 3 mm (factor 10).
- **Fanschroeven M4 x 10:** kop 1 mm verzonken in een plaat van 6 mm, dus 5 mm indraaiing (fabrikant: 4 tot 6). Met plaat ±0,2 en schroeflengte ±0,2 (ISO 4759-1, klasse A): 4,6 tot 5,4 mm.

