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

## 2. Weerstand van de luchtweg zonder filter

| onderdeel | ζ | oppervlak (cm²) | Δp bij 250 m³/h (Pa) |
| --- | ---: | ---: | ---: |
| RVS-rooster (f = 0,30) | 19,36 | 404 | 34 |
| vingerrooster in het oog (10 ribben 1,6 mm, een dwarsrib en twee ringen, f = 0,81) | 0,50 | 127 | 9 |
| instroom naar het oog Ø127 (trechter 45°) | 0,50 | 127 | 9 |
| uitblaas door de schuine lamellen | 2,50 | 207 | 17 |
| **samen** |  |  | **69** (48 tot 104) |

ζ van de platen volgens Idelchik (dunne geperforeerde plaat); de instroom en de lamellen zijn schattingen. Daarom staat overal een band van 0,7x tot 1,5x.

## 3. Werkpunt per filter

Snijpunt van de ventilatorcurve (100 % en lager toerental, Q ~ n, p ~ n²) met filter plus luchtweg. "Vol" = de einddrukval van de fabrikant (of 2x schoon als die ontbreekt), alleen ter vergelijking: het gekozen filter wordt eerder vervangen (3b).

| filter | Δp filter bij 250 (Pa) | max. debiet schoon | max. debiet vol | toerental voor 250 schoon | toerental voor 190 vol | dB(A) op 1 m / 0,5 m bij 250 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **gekozen:** interieurfilter MANN CU 20 013, 30 mm, geplooid | 130 | 334–385 | 229–246 | 72 %–79 % | 85 %–88 % | 62–64 / 68–70 |
| Rittal SK 3171.100 (G3), 17 mm, vroegere cassette 171 x 171 | 54 | 380–450 | 225–242 | 60 %–69 % | 86 %–89 % | 58–61 / 64–67 |
| vlakke mat M5 (ePM10 50 %), 20 mm, referentie Nittmann V400S | 261 | 272–301 | 193–203 | 88 %–94 % | 96 %–99 % | 66–68 / 72–74 |
| minipleat ePM1 65 % (F7), 48 mm, TROX MFP-PLA op maat | 146 | 325–374 | 260–285 | 74 %–81 % | 77 %–81 % | 62–64 / 68–70 |
| minipleat ePM1 90 % (F9), 48 mm, TROX MFP-PLA op maat | 248 | 277–308 | 199–210 | 87 %–93 % | 94 %–97 % | 66–67 / 72–73 |
| H13 (EN 1822), 150 mm, Freudenberg SF13 (ter vergelijking, past niet) | 630 | 176 | 103 | — | — | — |

**Met het gekozen filter (schoon), per stand:** debiet en luchtsnelheid boven het midden van het rooster.

| toerental | debiet (m³/h) | op 10 cm | op 15 cm | op 20 cm | dB(A) op 1 m |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 40 % | 104 | 0,27 | 0,15 | 0,09 | 49 |
| 60 % | 187 | 0,49 | 0,26 | 0,16 | 58 |
| 70 % | 230 | 0,61 | 0,32 | 0,19 | 61 |
| 75 % | 252 | 0,66 | 0,35 | 0,21 | 63 |
| 80 % | 274 | 0,72 | 0,38 | 0,23 | 64 |
| 100 % (boost) | 364 | 0,96 | 0,51 | 0,31 | 69 |

20 cm boven het rooster haalt geen enkele stand 0,5 m/s: dat vraagt ongeveer 600 m³/h, meer dan deze ventilator met rooster en filter levert.

De stand is een fractie van het volle **toerental**: de firmware regelt het toerental (ijktabel PWM -> toerental plus bijregeling op de tacho, regel.h). Debiet, geluid en warmte in dit rekenblad gebruiken dezelfde grootheid. Het geluid volgt ΔL = 50 log10(n/n_vol) en een vrije puntbron; roosterfluit, kastresonantie en galm komen erbij (meten: poort G1).

### 3b. Onderhoudseindpunt: de melding "filter vervangen" per stand

**Het eindpunt is de melding van de firmware**, niet de einddruk van de fabrikant (300 Pa): het filter gaat eruit zodra de knop "filter vervangen" toont. Tot dat moment moet elke beschermende stand het minimum (190 m³/h) halen. De drukmeter ziet rooster + filter. Per stand 36 scenario's: luchtweg 0,7x / 1x / 1,5x, verdeelruimte zonder en met de bovengrens (3c), ventilatorcurve −20 / 0 / +20 Pa (afleesonzekerheid) en een toerental tot 3 % te laag (meer laat de bewaking niet toe: daarboven meldt ze "toerental"). De firmware meldt met 10 % marge op de reserve: f ≤ 1 + 0,9 (g − 1), met g de ongunstigste grens. f komt rechtstreeks uit `regel.h` (vervangStand, vervangFactor, beschermVanaf).

| stand (toerental) | schoon debiet (m³/h) | grens g (x schone sensordruk) | firmware f (regel.h) | debiet bij de melding, ongunstigst (m³/h) | oordeel |
| ---: | ---: | ---: | ---: | ---: | --- |
| 40 % | 91–111 | — (haalt het minimum niet) | lage stand | — | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 50 % | 123–155 | — (haalt het minimum niet) | lage stand | — | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 60 % | 157–201 | — (haalt het minimum niet) | lage stand | — | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 70 % | 191–249 | — (haalt het minimum niet) | lage stand | — | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 75 % | 209–273 | 1,05 | lage stand | — | "lage stand": geen bescherming beloofd, geen filteroordeel |
| 80 % | 226–297 | 1,17 | 1,15 | 192 | melding op tijd |
| 85 % | 244–321 | 1,29 | 1,23 | 197 | melding op tijd |
| 90 % | 261–346 | 1,37 | 1,32 | 200 | melding op tijd |
| 95 % | 279–370 | 1,44 | 1,38 | 203 | melding op tijd |
| 100 % (boost) | 297–395 | 1,51 | 1,44 | 206 | melding op tijd |

Onder 80 % meldt de firmware "lage stand" (geen bescherming beloofd). **80 % is de laagste beschermende stand en de dagstand.** 75 % haalt het minimum schoon nog wel, maar met de volle band blijft er geen reserve met marge over (g dicht bij 1).

**Koppeling met de firmware:** dit script leest `regel.h` zelf en stopt (exit ≠ 0) als een waarde daar niet meer klopt. Telkens het draait, keurt het ook een kopie van `regel.h` met de factoren 9/9/9 (mutatieproef): die moet afgekeurd worden, anders stopt het eveneens.

**Hoe lang gaat een filter mee?** Bij de melding mag de drukval van het filter stijgen tot (gewoon scenario):

| stand | filter schoon (Pa) | filter bij de melding (Pa) | stijging (Pa) | deel van de stijging tot 339 Pa (fabrikant) |
| ---: | ---: | ---: | ---: | ---: |
| 80 % | 143 | 179 | 36 | 19 % |
| 90 % | 166 | 259 | 93 | 54 % |
| 100 % | 190 | 341 | 151 | 101 % |

Wie op 80 % werkt, vervangt het filter dus vroeg (een klein deel van zijn stofcapaciteit); op 90 % gaat hetzelfde filter twee à drie keer zo lang mee, maar is het 2,5 dB luider. Een filter kost ongeveer € 7; de knop toont de drukreserve, zodat je ziet wanneer het zover is.

### 3c. Verdeelruimte tussen filter en instroomplaat

Tussen de onderkant van het filter en de instroomplaat zit 6,5 mm (steunrand 3,5 mm plus de foamband, hoogstens tot 3 mm ingedrukt). Als het filter overal even veel lucht doorlaat, moet 49 % van het debiet radiaal naar het oog (Ø127): door een ring van 2716 mm² is dat bij 250 m³/h 12,6 m/s. In werkelijkheid gaat meer lucht door het midden van het filter (boven het oog), waar de weg het kortst is: het filter wordt niet gelijk benut, en de dynamische druk in de ring is **geen** verlies dat zomaar bij de rest opgeteld mag worden. Daarom twee scenario's (geen bewezen grenzen): verwaarloosbaar (gelijke benutting) en ζ = 0,5 op de ringsnelheid (48 Pa bij 250 m³/h, kwadratisch met het debiet). Beide zitten in de 36 scenario's van 3b.

| stand | debiet zonder (m³/h) | debiet met ζ = 0,5 (m³/h) | v op 10 cm met ζ = 0,5 (m/s) | boven het minimum? |
| ---: | ---: | ---: | ---: | --- |
| 60 % | 187 | 170 | 0,45 | **nee** |
| 70 % | 230 | 208 | 0,55 | ja |
| 75 % | 252 | 227 | 0,60 | ja |
| 80 % | 274 | 247 | 0,65 | ja |
| 100 % | 364 | 325 | 0,86 | ja |

Het filter is een geschat filter (geen fabrikantcurve): 115 Pa bij 250 m³/h op het hele front (bovengrens van de literatuurband 55 tot 115 Pa). Ligt de echte weerstand lager, dan is er meer reserve; poort L1 meet het (Q–Δp bij elke stand, schoon en bij de melding).

### 3d. Geluid bij het dagwerkpunt

Werkpunt: de medewerker zit tegenover de klant, het oor op ± 0,5 m van het rooster. Model: vrije puntbron (69 dB(A) op 1 m bij vol toerental, ΔL = 50 log10 n), plus een budget van 1,5 dB voor rooster, kast en galm.

| stand | debiet (m³/h) | dB(A) op 1 m | dB(A) op 0,5 m (model) | op 0,5 m met budget |
| ---: | ---: | ---: | ---: | ---: |
| 80 % | 274 | 64,2 | 70,2 | 71,7 |
| 90 % | 319 | 66,7 | 72,7 | 74,2 |
| 100 % (boost) | 364 | 69,0 | 75,0 | 76,5 |

**Comfortdoel (projectkeuze, geen norm):** dagstand 80 %: ≤ 72 dB(A) op de oorpositie, budget inbegrepen (model 70,2 + 1,5 = 71,7); boost kort luider. Dit is geen verbetering van het geluid: het vroegere doel van 55 dB(A) is met deze ventilator op een beschermende stand niet haalbaar en is vervangen door dit doel. Stiller kan alleen met een grotere, langzamere ventilator of demping in de uitblaas (niet gekozen: dieper en duurder). Gehoorgrenzen voor werknemers (vanaf 80 dB(A) over 8 uur) liggen hoger; het doel gaat over comfort. Poort G1 meet het.

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
- **Schakelaar -S1:** C&K D502J12S215PQA, **10 A bij 30 V DC** (resistief), 10 000 schakelingen; de ventilator trekt hoogstens 2,35 A. Volgorde vanaf de adapter: -X1, -S1, -F1 (de schakelaar zit vóór de zekering). Uit = ventilator, regelaar en ESP32-C3 spanningsloos.
- **Ingang van de regelaar:** Pololu raadt boven 20 V een elco van minstens 33 µF dicht bij VIN aan (spanningspieken bij het inschakelen door de kabelinductie). Daarom -C2 47 µF / 50 V vlak bij VIN van -T3; de buffer -C1 is 470 µF / 50 V (niet 35 V: marge op 24 V plus piek). De regelaar mag tot 36 V aan de ingang.
- **Ventilator spanningsloos zonder besturing:** -Q2 (IRF4905, P-kanaal, 55 V, 20 mΩ) schakelt de 24 V naar de ventilator; -Q3 (BC547) trekt zijn gate laag via een deler (Vgs ≈ −12 V, binnen ±20 V) zodra GPIO7 van -A4 hoog is. Een weerstand van 10 kΩ houdt de basis van -Q3 laag: zonder 5 V of 3,3 V, tijdens een reset of bij het flashen staat -Q2 open en krijgt de ventilator geen spanning. Verlies in -Q2: 2,35 A² x 0,02 Ω = 0,11 W (zonder koellichaam).
- **5 V:** de D24V10F5 heeft een kortsluit- en overstroombeveiliging en schakelt af als ze te warm wordt. 1 A is een typische continue waarde die van de warmte afhangt; de piek van knop en module samen blijft eronder (tabel hierboven).
- **Terugvoeding:** de Schottky-diode -V1 (1N5819) zit tussen de 5 V en de 5V-pin van de ESP32-C3. Het ontwerp hangt niet af van hoe het bordje intern zijn USB-poort met de 5V-pin verbindt (rechtstreeks of met een eigen diode): -V1 spert in beide gevallen de weg terug naar de regelaar en de knop. De knop flash je met de kabel uit de box.

**Waarheidstabel: wat doet de ventilator bij een fout?** (veilige toestand = stil en spanningsloos)

| toestand | 24 V | 5 V / 3,3 V | -Q2 (24 V naar de ventilator) | PWM | ventilator | wat de gebruiker ziet |
| --- | --- | --- | --- | --- | --- | --- |
| normaal UIT | ja | ja | open (GPIO7 laag) | 0 % | stil, spanningsloos | knop: UIT |
| normaal AAN | ja | ja | dicht | geregeld | draait | knop: stand, Pa, tpm |
| 5 V of 3,3 V valt weg (24 V blijft) | ja | nee | open (basis laag via 10 kΩ) | zwevend | stil, spanningsloos | knop zwart |
| reset of flashen van -A4 | ja | ja | open (pinnen hoogohmig) | zwevend | stil | knop: UIT? (geen status) |
| kortsluiting in de USB-C-kabel naar de knop | ja | zakt (regelaar begrenst) | open | zwevend | stil | knop zwart |
| radio weg, -A4 werkt | ja | ja | dicht | laatste gewone stand | draait verder (geen boost) | knop: AAN? / UIT? |
| ventilator te traag of PWM verzadigd | ja | ja | dicht | geregeld | draait | knop: toerental wijkt af (geen filteroordeel) |
| -S1 uit of zekering gesmolten | nee | nee | open | — | stil | knop zwart |

Na elke herstart van -A4 staat de afzuiging UIT tot een nieuwe handeling op de knop (regel.h, getest).

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
- **Voedingsbox:** 0,7 kg = 7 N op 4 spaanplaatschroeven 4 x 16 verzonken in de onderhuid van het blad (voorboren Ø2,5; geen pluggen). Uittrekkracht per schroef in 3 mm vezelplaat: AANNAME ≥ 30 N (voorzichtig: een volle schroefgang in de huid). Ongunstig geval: gewicht plus 20 N trek aan een kabel op één hoek: hoogstens ongeveer 12 N op één schroef (factor 2,5). Aandraaien tot de kop vlak ligt, niet verder (de huid is dun). Poort M1 trekt eraan.
- **Fanschroeven M4 x 10:** kop 1 mm verzonken in een plaat van 6 mm, dus 5 mm indraaiing (fabrikant: 4 tot 6). Met plaat ±0,2 en schroeflengte ±0,2 (ISO 4759-1, klasse A): 4,6 tot 5,4 mm.

## 6b. Vingerrooster in het oog

Ribben 1,6 mm breed en 7,0 mm hoog op x = ±6, ±18 .. ±54 (spleten 10,4 mm), een dwarsrib en twee ringen (r 24 en 44). De onderkant ligt 2,05 mm boven de waaier.

**Rekenmodel:** balkrooster (813 knopen, 840 balkjes) met buiging en wringing; de uiteinden van de ribben op de rand van het oog als scharnier (ongunstiger dan ingeklemd); PETG E = 1200 MPa (1500 min 20 % voor warmte en printrichting). Een last van **10 N** (projectkeuze, geen normwaarde) staat om de beurt op elke knoop (om de 2 mm). Grootste doorbuiging onder de last: **0,73 mm** (bij x = -22, z = 9); zonder de ringen zou dat 1,3 mm zijn.

**Ruimte tot de waaier:** 2,05 mm, min 0,3 mm printtolerantie. Een vinger (Ø12, bolle top R6, de ongunstigste vorm) zakt 3,0 mm in een spleet: dat blijft binnen de ribhoogte van 7,0 mm. Beschikbaar: 1,75 mm, doorbuiging 0,73 mm: **factor 2,4**. Het rooster zit vast in de gelijmde instroomplaat en blijft staan als het filter eruit is. Poort W1 controleert het met een proefvinger, nooit met een draaiende ventilator (schakelaar UIT).

## 6c. Afdichting van het filter

Het filter (195 x 145 x 30, maattolerantie AANNAME ±1 mm, hoogte 29 tot 31) ligt los op een zachte foamband in een geleiderand met 1 mm speling rondom. **De afdichting is een lip** van zelfklevend siliconenrubber (0,5 mm, Shore A 60, E ≈ 3,6 MPa) op de geleiderand, 2,5 mm over de nominale rand van het filter: bij het inleggen buigt het filter de lip naar onder en ze ligt rondom tegen de zijkant. De lucht boven de lip staat onder hogere druk dan eronder: de lip wordt in de spleet gedrukt (zelfversterkend). De foamband draagt het filter alleen nog.

**Maatketen (min/max):**

| geval | waarde | gevolg |
| --- | --- | --- |
| kleinste filter (194 x 144), naar één kant geschoven | spleet tot 3,0 mm aan de andere kant | de lip reikt nog 1,0 mm tegen de zijkant: contact rondom |
| grootste filter (196 x 146), naar één kant geschoven | spleet 0 mm aan die kant | de lip zit geklemd tussen filter en rand: dicht |
| filterhoogte 29 tot 31 mm | bovenkant 0,5 tot 2,5 mm boven het blad | de RVS-plaat (onderkant 2,5) sluit altijd; het filter kan hoogstens 2 mm opschuiven en de lip blijft liggen |
| foamband 0 tot 1 mm ingedrukt (gewicht en onderdruk) | verdeelruimte 6,5 tot 7,5 mm | boven de ribben van het vingerrooster blijft 2,5 tot 3,5 mm |

**Wat er langs kan:** zou er rondom toch een spleet van 20 µm blijven, dan lekt er bij het grootste drukverschil (566 Pa, boost bij de melding, x 1,5) 0,05 m³/h langs het filter (Poiseuille, 1 mm contact): verwaarloosbaar. Bij 0,1 mm rondom is het 6,4 m³/h: dat sluit de lip juist uit. Ontbreekt het filter of ligt het scheef (grote omloop), dan zakt de sensordruk onder 0,70 x schoon en meldt de knop "filter ontbreekt of sluit niet af" (regel.h; zonder filter rekent het model 0,27 tot 0,54 x). Een kleine omloop ziet de drukmeter niet: daarom staat in de onderhoudsstappen "lip rondom tegen het filter?" (zien en voelen).

## 7. Morsen (begrensd scenario)

Scenario: een fles nagellak of remover van 15 ml valt om op het rooster. Een deel loopt door de gaten (ongeveer 25 % open); in het ongunstigste geval alles. De RVS-plaat en het siliconen van de lip kunnen ertegen; PETG niet tegen aceton (docs/Materiaalstaat.md). Het filter heeft ongeveer 0,38 m² vlies (46 plooien van 28 mm). AANNAME: vlies houdt 100 tot 300 g vloeistof per m² vast, dus 38 tot 113 ml: **15 ml blijft in het filter**. Wat er toch door komt, valt in het oog op de waaier en wordt naar de lamellen in de bodemplaat geslingerd (onder het blad).

Daarom na morsen: schakelaar UIT, stilstand, filter in een zak (weg), en dan de inspectie met afkeurgrenzen uit `onderhoud.mjs` ("Na morsen"). Voor de waaier: schakelaar UIT, de M8-stekker onder het blad los, de vier klauwen los en de module er van boven uit; dan de bodemplaat los (8 x M3). Niets staat dan onder spanning of draait.

