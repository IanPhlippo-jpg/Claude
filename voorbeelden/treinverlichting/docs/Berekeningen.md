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

- **Alles aan, ongunstigste bordjes, alle ingangen actief:** 16 x 0,32 A + besturing + ingangen = **5,43 A**, 81 % van de Mean Well GST90A12-P1M (6,67 A). Met bordjes van 1K en 4 ingangen actief: 2,44 A.
- **Hoofdzekering 7,5 A** (ATO in een houder met draden, 32 V DC) achter de DC-bus: ze is groter dan wat de adapter kan leveren (6,67 A) en **beschermt de draden tot de verdeelklemmen** en de ompoolbeveiliging (hieronder) tegen een andere adapter zonder eigen beveiliging. Een groep of een knop beschermt ze niet.
- **Per groep een polyfuse Bourns MF-R050 (radiaal)** (-F2..-F17), met één pootje in de klem n− van de MOSFET-module en het andere in een WAGO 221-2411 samen met de − van het bordje (geen solderen): houdstroom 0,50 A bij 23 °C, **0,41 A bij 40 °C** en 0,36 A bij 50 °C (derating uit het datablad), trip 1,00 A, 60 V. De ongunstigste groep (0,32 A) blijft eronder; een kortsluiting op een bordje of zijn draad laat alleen die polyfuse springen (4,0 s bij 2,5 A, sneller bij meer) en het kanaal van de module (2,0 A, AANNAME) ziet nooit meer dan een paar ampère gedurende die tijd. De pootjes zijn 0,51 mm (0,20 mm²): de kleinste draad die een WAGO 221 neemt; een schroefklem neemt ze altijd.
- **Waarom niet meer per rij:** de polyfuse van 1,1 A per rij van versie 1 hield bij 40 °C nog maar 0,91 A, minder dan 3 ongunstige bordjes (0,96 A). Elk bordje krijgt nu zijn + uit de klem n+ van zijn module en zijn − door zijn eigen polyfuse.
- **+12 V voor de ingangen en de sensoren (S12):** eigen polyfuse -F18 (Bourns MF-R050 (radiaal)), 0,41 A bij 40 °C. Nodig: 16 ingangen x 10,8 mA + sensoren 80 mA (AANNAME) = 0,25 A. Een kortgesloten sensordraad legt zo niet de hele doos plat.

## 3. Schakelen (MOSFET-modules) en ompoolbeveiliging

Elke groep schakelt de − van zijn bordje met een kanaal van een 8-kanaals MOSFET-module met optocouplers (versie 4: kant-en-klaar). Het type MOSFET staat niet bij de verkoper: AANNAME 20 mΩ en 2,0 A per kanaal. Bij 0,32 A: 2,0 mW en 6 mV over de MOSFET, 0,1 K warmer dan de lucht. Meetcriterium in het meetblad: minder dan 0,1 V tussen n− en VIN− bij vol licht (ook bij 0,31 Ω in plaats van 0,020 Ω nog geen warmteprobleem: 0,03 W).

PWM 1 kHz door een optocoupler: de PC817 schakelt in 4 µs aan en 3 µs uit (datablad, met 100 Ω); met de weerstanden van de module wordt dat trager (AANNAME tot 50 µs). Bij 1017 Hz (een periode van 983 µs) zijn de laagste 5 % van het dimbereik dus niet nauwkeurig: een groep die op 2 % staat, kan iets feller of donkerder zijn dan berekend. Aan/uit, 10 tot 100 % en de effecten (vuur, tv, lasvlam) werken gewoon; 1 kHz blijft (geen flikkeren voor oog of camera).

Ompoolbeveiliging zonder solderen: een Schottkydiode SB560 (-R2) met haar pootjes in de verdeelklemmen, de kathode aan L+ en de anode aan 0 V, achter de hoofdzekering. Goed aangesloten spert ze: geen verlies. Verkeerd om (een andere adapter met de + buiten): de diode geleidt, de modules zien hoogstens −0,7 V, en de adapter schakelt af (de GST90A heeft een kortsluitbeveiliging) of de zekering van 7,5 A smelt; de diode verdraagt 150 A piek (datablad). De DC-bus houdt de stekker van de eigen adapter (+ in het midden): niets doorknippen, niet verkeerd aan te sluiten. (Versie 3 had een P-MOSFET IRF4905 op een gaatjesprint; die bestaat niet als kant-en-klare module met schroefklemmen.)

## 4. Ingangen (knoppen en sensoren)

Elke ingang: een kanaal van een PC817 (optocouplerprint 8 kanalen): VCC (S12, +12 V) door een weerstand (1,0 kΩ, AANNAME: na te meten) en de led naar IN; de knop of sensor trekt IN naar 0 V. Op 12 V loopt er 10,8 mA door de led (hoogstens 50 mA); de transistor kan dan minstens 5,4 mA (CTR ≥ 50 %), de pull-up van de uitgang (AANNAME 10 kΩ naar 3,3 V) vraagt 0,33 mA: zeker laag (factor 16). De weerstand verbruikt 117 mW zolang de ingang actief is.

Aansluiten: **contact, schakelaar, reed** tussen IN en 0 V (-X2); **NPN-sensor of hall (open collector)**: + aan +12 V (-X3), − aan 0 V, de uitgang aan IN. Een **sensor met een 12 V-uitgang (PNP)** werkt niet rechtstreeks met deze print (de led zit tussen +12 V en IN): kies er een met NPN-uitgang, of laat de PNP-sensor een klein relais schakelen waarvan het contact aan IN hangt. Bestand tegen fouten: +12 V op IN zet 0 V over de led (niets aan de hand); wisselspanning tot 18 V piek verdraagt de led (6 V in sperrichting, datablad PC817); de wisselspanning van een trafo van de baan (16 V, 22,6 V piek) dus niet: een ingang krijgt een contact, geen trafo.

## 5. Warmte: geen verluchting nodig

| bron | ongunstigst | gewoon (1K, 4 ingangen actief) |
| --- | ---: | ---: |
| 16 kanalen van de MOSFET-modules | 0,03 W | 0,01 W |
| 16 polyfuses (R1max 1,17 Ω) | 1,92 W | 0,40 W |
| 16 ingangen (weerstand en led, 117 mW elk) | 1,87 W | 0,47 W |
| ESP, PCA9685, regelaar | 0,74 W | 0,74 W |
| hoofdzekering en -F18 | 0,37 W | 0,05 W |
| **samen** | **4,93 W** | **1,67 W** |

De bodem hangt tegen de onderkant van de baan (hout): die geeft bijna geen warmte af. Alleen het deksel en de 4 zijwanden tellen (de doos is nu 66,8 hoog): 0,114 m² met 5 W/m²K (natuurlijke convectie, AANNAME). Binnen wordt het **8,6 K** warmer dan onder de baan in het ongunstigste geval (alle 16 groepen met bordjes van 0 Ω vol aan, alle ingangen actief), **2,9 K** gewoon. Met 25 °C onder de baan blijft het binnen onder 40 °C: daarop zijn de polyfuses hierboven gerekend. Verluchtingsgaten zijn niet nodig; de netadapter (het warmste deel) hangt buiten de doos. De modules liggen op de moduleplaat bovenaan, het warmste deel van de doos: de regelaar (0,11 W) wordt nauwelijks warm.

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

De 16 groepen komen terug door de MOSFET-modules: per module tot 2,56 A over zijn klem VIN− en een draad van 0,75 mm² naar de verdeelklem -X2 (WAGO 221-415, 32 A): 250 mm geeft 5,8 mΩ en 15 mV verlies. Samen 5,43 A door de 2 WAGO-klemmen van -X1 en -X2 en de draden van 0,75 mm² van de DC-bus. De andere draden (PWM, GPIO, I2C, 3,3 V) dragen milliampères: 0,14 mm² of dupontkabels. Interne draadlijst: TRN-14.

