# Kabeldoos: rekenblad

Gemaakt door `docs/berekeningen.py`. De metingen bij de ingebruikname beslissen (meetblad TRN-20).

## 1. Stroom per groep (één bordje)

| bordje | stroom per led | 16 leds |
| --- | ---: | ---: |
| 1K (voor 12 V) | 9,1 mA | 0,146 A |
| 1K5 (voor 20 V) | 6,1 mA | 0,097 A |
| 470 Ω (voor 5 V) | 19,4 mA | 0,310 A |
| 0 Ω (leds met eigen weerstand, 20 mA) | 20,0 mA | 0,320 A |

Ongunstigste groep: **0,32 A**. Op 12 V geven bordjes van 1K5 maar 6,1 mA per led: zwakker licht (Modelbouwled raadt 1K aan voor 12 V).

## 2. Voeding en zekeringen

- **Alles aan, ongunstigste bordjes:** 16 x 0,32 A + besturing = **5,18 A**, 78 % van de Mean Well GST90A12-P1M (6,67 A). Met bordjes van 1K: 2,40 A.
- **Hoofdzekering 7,5 A** (ATO, 32 V DC) achter de DC-bus: ze is groter dan wat de adapter kan leveren (6,67 A) en **beschermt dus alleen de print en de dikke draden** tegen een kortsluiting vóór de klemmen (de adapter schakelt bij overbelasting zelf af). Een groep, een rij of een knop beschermt ze niet.
- **Per groep een polyfuse Bourns MF-MSMF050/24X (1812)**, in de − van de groep op de uitgangsprint: houdstroom 0,50 A bij 23 °C, **0,44 A bij 40 °C** en 0,40 A bij 50 °C (derating uit het datablad), trip 1,00 A, 24 V. De ongunstigste groep (0,32 A) blijft eronder; een kortsluiting op een bordje of zijn draad laat alleen die polyfuse springen (binnen 0,2 s bij 8 A) en de MOSFET (5,7 A continu) ziet nooit meer dan de tripstroom.
- **Waarom niet meer per rij:** de polyfuse van 1,1 A per rij van versie 1 hield bij 40 °C nog maar 0,91 A, minder dan 3 ongunstige bordjes (0,96 A), en een kortsluiting van één groep ging door de IRLD024 tot 2,2 A voor ze sprong. De + per rij heeft nu geen eigen polyfuse meer: een rij is hoogstens 0,96 A op draad van 0,5 mm²; een kortsluiting van een + naar 0 V begrenst de adapter.
- **+12 V voor knoppen en sensoren:** eigen polyfuse Bourns MF-MSMF030 (1812) op de ingangsprint, 0,26 A bij 40 °C. Nodig: 16 ingangen x 4,9 mA + sensoren 80 mA (AANNAME) = 0,16 A. Een kortgesloten knopdraad legt zo niet de hele doos plat.

## 3. Schakelen (MOSFET per groep) en ompoolbeveiliging

AO3400A (Alpha & Omega): R(on) hoogstens 48 mΩ bij UGS = 2,5 V (datablad, ID = 3 A); de PCA9685 stuurt met 3,3 V, dus is het zeker niet meer. Bij 0,32 A: 4,9 mW en 15 mV over de MOSFET; de chip wordt 0,6 K warmer dan de lucht (SOT-23, Rth 125 K/W, AANNAME). Meetcriterium in het meetblad: minder dan 0,1 V over elke MOSFET bij vol licht. (De IRLD024 (versie 1) had alleen een R(on) vanaf 4 V; 0,20 Ω bij 3,3 V was een AANNAME.) Twee AO3400A zitten op een adapterprintje (DA-SOT23-3-X2) in een IC-voet DIP-8: een kapotte MOSFET wissel je zonder solderen. PWM 1 kHz: de schakelverliezen zijn verwaarloosbaar.

Ompoolbeveiliging: IRF4905 (Infineon) in de + (drain aan de ingang, source aan L+, gate met 10 kΩ aan 0 V). Goed aangesloten staat UGS op −12 V en geleidt hij met hoogstens 20 mΩ: bij 5,18 A is dat 0,54 W, 33 K boven de lucht (plat op de print, zonder koelplaat). Verkeerd om: de MOSFET spert en er loopt niets. De DC-bus houdt de stekker van de adapter (+ in het midden): niets doorknippen, niet verkeerd aan te sluiten met de eigen adapter.

## 4. Ingangen (knoppen en sensoren)

Elke ingang: LTV-844 (Lite-On) met AC-ingang (twee leds tegen elkaar) en 2,2 kΩ in serie. Op 12 V loopt er 4,9 mA door de led; de transistor kan dan minstens 0,98 mA (CTR ≥ 20 %), de pull-up van de ESP vraagt 0,073 mA: zeker laag (factor 13). De weerstand verbruikt 53 mW (1206 van 0,25 W: minder dan de helft).

Aansluiten (per 4 ingangen een COM-klem): **contact of PNP-sensor** (schakelt +12 V): COM aan 0 V, de knop tussen +12 V en IN. **NPN-sensor, hall of reed naar 0 V** (schakelt 0 V): COM aan +12 V, de uitgang van de sensor aan IN. De twee leds tegen elkaar maken het ook bestand tegen een verkeerd aangesloten draad (de taak van de antiparallelle diode die Fable vroeg): een led krijgt nooit meer dan 1,2 V in sperrichting.

## 5. Warmte: geen verluchting nodig

| bron | ongunstigst | gewoon (1K, 4 ingangen actief) |
| --- | ---: | ---: |
| 16 MOSFET's | 0,08 W | 0,02 W |
| 16 polyfuses (R1max 1,3 Ω) | 2,13 W | 0,44 W |
| 16 weerstanden van de ingangen (53 mW elk) | 0,85 W | 0,21 W |
| ESP, PCA9685, regelaar | 0,74 W | 0,74 W |
| P-MOSFET en zekering | 0,81 W | 0,16 W |
| **samen** | **4,60 W** | **1,57 W** |

De bodem hangt tegen de onderkant van de baan (hout): die geeft bijna geen warmte af. Alleen het deksel en de 4 zijwanden tellen: 0,094 m² met 5 W/m²K (natuurlijke convectie, AANNAME). Binnen wordt het **9,8 K** warmer dan onder de baan in het ongunstigste geval (alle 16 groepen met bordjes van 0 Ω vol aan, alle ingangen actief), **3,4 K** gewoon. Met 25 °C onder de baan blijft het binnen onder 40 °C: daarop zijn de polyfuses hierboven gerekend. Verluchtingsgaten zijn niet nodig; de netadapter (het warmste deel) hangt buiten de doos.

## 6. Kabelgoten: vulgraad

Een goot tussen twee rijen is 5,4 breed tot 5,2 hoog (de voet van de wand) en daarboven 5,8 tussen de vingers, tot 28 hoog (het deksel): **160 mm²**. Leddraad 0,25 mm² (Ø1,4, 1,54 mm²), voedingsdraad 0,5 mm² (Ø1,8, 2,54 mm²), AANNAME gangbare buitenmaten. Zo'n goot krijgt de klemmen van 6 bordjes (3 per rij, 16 leddraden per klemmenrij) en hun voeding.

| doorsnede | leddraden | voeding | draden samen | vulgraad |
| --- | ---: | ---: | ---: | ---: |
| gewoon | 48 | 8 | 94 mm² | **59 %** |
| ergst | 96 | 8 | 168 mm² | **105 %** |

"Gewoon": de draden van een bordje komen door de sleuf in de bodem onder dat bordje, de helft loopt door een doorsnede: onder de 60 % die bij een schakelkast de grens is, het deksel klikt er zonder knellen op. "Ergst": alle 96 leddraden van de 6 bordjes door één sleuf: dat past niet onder het deksel. Breng de draden van elk bordje dus binnen door de sleuf onder dat bordje (zo is de doos getekend). De goten langs de zijwanden (11 breed) en de achterwand (4,8) zijn minder vol. Een goot van 5,4 is te smal voor een vinger: til een gootdeksel op en trek een draad eruit met de spatel en het haakje van de hulpstukken (print/Hulpstukken.stl).

## 7. Klik van de gootdeksels (PETG, E = 2100 MPa)

Elk been is een uitkragende balk van 1,2 dik; de nok gaat 0,40 voorbij de vinger op 7,0 van de plaat. Rek = 1,5 t d / L² = **1,47 %**, onder de 2 % die PETG bij herhaald klikken verdraagt (AANNAME). Een deksel tussen twee rijen klikt op 4 plaatsen (8 nokken), een randdeksel op 2 plaatsen en met zijn neus over de hele lengte. Nok en groef hebben vlakken van 45°.

## 8. Klemlippen van de bordjes (PETG)

Elk bordje zit tussen 4 lippen aan zijn korte kanten. Een lip is een tong van 0,8 x 2,0 die in een kuiltje van 1,8 diep in de bodem begint: veerlengte 6,5 tot de haak. Bij het inleggen duwt de print de schuine kant (45°) 0,60 opzij. Rek = 1,5 t d / L² = **1,70 %** (onder 2 %). Kracht om een lip open te duwen: 3 E I d / L³ = 1,17 N; de haak grijpt 0,60 mm over de print met een recht vlak eronder: het bordje (10 g) en de draden eraan blijven zitten met het deksel eraf en de doos ondersteboven. Uitnemen: de twee lippen aan één kant met de spatel naar buiten duwen en het bordje optillen.

## 9. Draden en de 0 V-retour

De 16 groepen komen samen terug door de sources van de MOSFET's: tot 5,18 A. Op de uitgangsprint loopt dat over een blanke draad Ø1,0 (0,79 mm²) langs de sources naar een eigen klem -X3:17 (5,08, tot 1,5 mm²) en met 0,75 mm² naar -X1:3 op de voedingsprint: 350 mm geeft 8,2 mΩ en 42 mV verlies. De andere draden tussen de prints (gates, GPIO, I2C) dragen milliampères: 0,14 mm². Interne draadlijst: TRN-14.

