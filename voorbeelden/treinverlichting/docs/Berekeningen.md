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

- **Alles aan, ongunstigste bordjes, alle ingangen actief:** 16 x 0,32 A + besturing + ingangen = **5,51 A**, 83 % van de Mean Well GST90A12-P1M (6,67 A). Met bordjes van 1K en 4 ingangen actief: 2,44 A.
- **Hoofdzekering 7,5 A** (ATO in een houder met draden, 32 V DC) achter de DC-bus: ze is groter dan wat de adapter kan leveren (6,67 A) en **beschermt de draden tot de verdeelklemmen** en de ompoolbeveiliging (hieronder) tegen een andere adapter zonder eigen beveiliging. Een groep of een knop beschermt ze niet.
- **Per groep een polyfuse Bourns MF-R050 (radiaal)** (-F2..-F17), met één pootje in de klem n− van de MOSFET-module en het andere in een WAGO 221-2411 samen met de − van het bordje (geen solderen): houdstroom 0,50 A bij 23 °C, **0,41 A bij 40 °C** en 0,36 A bij 50 °C (derating uit het datablad), trip 1,00 A, 60 V. De ongunstigste groep (0,32 A) blijft eronder; een kortsluiting op een bordje of zijn draad laat alleen die polyfuse springen (4,0 s bij 2,5 A, sneller bij meer) en het kanaal van de module (2,0 A, AANNAME) ziet nooit meer dan een paar ampère gedurende die tijd. De pootjes zijn 0,51 mm (0,20 mm²): de kleinste draad die een WAGO 221 neemt; een schroefklem neemt ze altijd.
- **Waarom niet meer per rij:** de polyfuse van 1,1 A per rij van versie 1 hield bij 40 °C nog maar 0,91 A, minder dan 3 ongunstige bordjes (0,96 A). Elk bordje krijgt nu zijn + uit de klem n+ van zijn module en zijn − door zijn eigen polyfuse.
- **+12 V voor de ingangen en de sensoren (S12):** eigen polyfuse -F18 (Bourns MF-R050 (radiaal)), 0,41 A bij 40 °C. Nodig: 16 ingangen x 10,8 mA + sensoren 160.0 mA (AANNAME) = 0,33 A. Een kortgesloten sensordraad legt zo niet de hele doos plat.

## 3. Schakelen (MOSFET-modules) en ompoolbeveiliging

Elke groep schakelt de − van zijn bordje met een kanaal van een 8-kanaals MOSFET-module met optocouplers (versie 4: kant-en-klaar). Het type MOSFET staat niet bij de verkoper: AANNAME 20 mΩ en 2,0 A per kanaal. Bij 0,32 A: 2,0 mW en 6 mV over de MOSFET, 0,1 K warmer dan de lucht. Meetcriterium in het meetblad: minder dan 0,1 V tussen n− en VIN− bij vol licht (ook bij 0,31 Ω in plaats van 0,020 Ω nog geen warmteprobleem: 0,03 W).

Alleen aan/uit (Ian, 2026-11-15: "Dimmers zijn niet nodig"; firmware 1.3.0): de PCA9685 zet elk kanaal met zijn full-on- of full-off-bit volledig aan of uit, zonder PWM. De optocoupler van de module schakelt in 4 tot 50 µs (datablad PC817, AANNAME met de weerstanden van de module): voor aan/uit en de knipper-effecten (knipperen, overweg, lasvlam, tl) speelt dat geen rol.

Ompoolbeveiliging zonder solderen: een Schottkydiode SB560 (-R2) met haar pootjes in de verdeelklemmen, de kathode aan L+ en de anode aan 0 V, achter de hoofdzekering. Goed aangesloten spert ze: geen verlies. Verkeerd om (een andere adapter met de + buiten): de diode geleidt, de modules zien hoogstens −0,7 V, en de adapter schakelt af (de GST90A heeft een kortsluitbeveiliging) of de zekering van 7,5 A smelt; de diode verdraagt 150 A piek (datablad). De DC-bus houdt de stekker van de eigen adapter (+ in het midden): niets doorknippen, niet verkeerd aan te sluiten. (Versie 3 had een P-MOSFET IRF4905 op een gaatjesprint; die bestaat niet als kant-en-klare module met schroefklemmen.)

## 4. Ingangen (knoppen en sensoren)

Elke ingang: een kanaal van een PC817 (optocouplerprint 8 kanalen): VCC (S12, +12 V) door een weerstand (1,0 kΩ, AANNAME: na te meten) en de led naar IN; de knop of sensor trekt IN naar 0 V. Op 12 V loopt er 10,8 mA door de led (hoogstens 50 mA); de transistor kan dan minstens 5,4 mA (CTR ≥ 50 %), de pull-up van de uitgang (AANNAME 10 kΩ naar 3,3 V) vraagt 0,33 mA: zeker laag (factor 16). De weerstand verbruikt 117 mW zolang de ingang actief is.

Aansluiten: **contact, schakelaar, reed** tussen IN en 0 V (-X2); **NPN-sensor of hall (open collector)**: + aan +12 V (-X3), − aan 0 V, de uitgang aan IN. Een **sensor met een 12 V-uitgang (PNP)** werkt niet rechtstreeks met deze print (de led zit tussen +12 V en IN): kies er een met NPN-uitgang, of laat de PNP-sensor een klein relais schakelen waarvan het contact aan IN hangt. Bestand tegen fouten: +12 V op IN zet 0 V over de led (niets aan de hand); wisselspanning tot 18 V piek verdraagt de led (6 V in sperrichting, datablad PC817); de wisselspanning van een trafo van de baan (16 V, 22,6 V piek) dus niet: een ingang krijgt een contact, geen trafo.

### Hallsensoren (Ian, 2026-11-15)

Een hallsensor onder of naast het spoor ziet de magneet onder een loc of wagen. Gekozen: de **Honeywell SS441A** (unipolair, open collector, 3,8 tot 30 V): hij werkt **rechtstreeks op 12 V** (+ aan -X3, − aan -X2, de uitgang aan IN n). Met de magneet trekt de uitgang IN naar 0 V: door de led van de PC817 loopt dan **10,6 mA**, de sensor mag 20 mA zinken en blijft verzadigd (hoogstens 0,40 V): de PC817 schakelt zeker. Zou de weerstand op de print kleiner zijn dan 540 Ω (stroom in IN boven 20 mA, meetblad), zet dan 1 kΩ in serie met de uitgang. Zonder magneet lekt de uitgang hoogstens 10 µA: de PC817 blijft uit (de uitgang van de print geeft hoogstens 20 µA tegen 0,33 mA van de pull-up). Een kloon van de Allegro **A3144** (4,5-24 V, 25 mA) werkt net zo.

**Niet gebruiken:** een kant-en-klare hallmodule voor Arduino (KY-003 en gelijk) met een pull-up en een lampje naar zijn eigen VCC: op 5 V gevoed duwt de pull-up stroom door de led van de PC817 (12 V tegen 5 V) en de ingang blijft half aan; op 12 V gevoed loopt er stroom door het lampje van de module (gemaakt voor 5 V). Een sensor met een 12 V-uitgang (PNP) werkt niet (zie hierboven).

**Meer sensoren op één ingang:** open collectors mogen parallel (wired-OR): elke sensor trekt IN naar 0 V, de lekstromen tellen op (10 µA per sensor). **Voeding:** elke sensor vraagt hoogstens 10 mA uit S12; met 16 ingangen actief (173 mA) laat -F18 (0,41 A bij 40 °C, 90 %) plaats voor **19 sensoren**; gerekend met 16 (één per ingang).

**Korte puls:** een magneetzone van 10 mm bij 0,6 m/s geeft 17 ms (stapvoets 0,2 s). De firmware (1.3.0) leest een ingang van de soort "puls" met een interrupt en ziet zo elke puls vanaf **1 ms** (de PC817 voegt hoogstens 50 µs toe) en houdt ze 0,3 s vast; een knop houdt zijn ontdendering van 30 ms.

## 5. Warmte: geen verluchting nodig

| bron | ongunstigst | gewoon (1K, 4 ingangen actief) |
| --- | ---: | ---: |
| 16 kanalen van de MOSFET-modules | 0,03 W | 0,01 W |
| 16 polyfuses (R1max 1,17 Ω) | 1,92 W | 0,40 W |
| 16 ingangen (weerstand en led, 117 mW elk) | 1,87 W | 0,47 W |
| ESP, PCA9685, regelaar | 0,74 W | 0,74 W |
| hoofdzekering en -F18 | 0,43 W | 0,05 W |
| **samen** | **4,99 W** | **1,67 W** |

De bodem hangt tegen de onderkant van de baan (hout): die geeft bijna geen warmte af. Alleen het deksel en de 4 zijwanden tellen (de doos is nu 52,6 hoog): 0,172 m² met 5 W/m²K (natuurlijke convectie, AANNAME). Binnen wordt het **5,8 K** warmer dan onder de baan in het ongunstigste geval (alle 16 groepen met bordjes van 0 Ω vol aan, alle ingangen actief), **1,9 K** gewoon. Met 25 °C onder de baan blijft het binnen onder 40 °C: daarop zijn de polyfuses hierboven gerekend. Verluchtingsgaten zijn niet nodig; de netadapter (het warmste deel) hangt buiten de doos. De modules staan in de rechterhelft op de bodem (één laag): de regelaar (0,11 W) wordt nauwelijks warm.

## 6. Schroefpaaltjes van de bordjes (PETG)

Ian (2026-11-15): "ik wil ze geschroefd hebben. Gaten zitten op 2mm op 2mm van de hoeken van het bordje." Elk bordje ligt op 4 paaltjes Ø5,0 recht onder zijn gaten (hart 2,0 van beide randen) en de steunrail in het midden. Schroef: plaatschroef voor kunststof 2,0 x 6, bolkop Ø4,0, kruiskop PH1 (een schroef van 2,2 zou niet door het gat van Ø2,2 gaan: AANNAME, na te meten). Voorgat Ø1,6 = 0,80 x d (vuistregel voor zelftappers in PETG: 0,75 tot 0,85 x d). Wand rond het voorgat **1,7 mm** (4 lijnen van 0,4; buitendiameter 2,5 x d, vuistregel minstens 2 x d). De schroef grijpt **4,4 mm** in het paaltje (minstens 2 x d) en de punt blijft 0,6 boven het einde van het voorgat: hij komt niet door de bodem. Uittrekkracht ≈ π d L τ / 2 = 207 N per schroef met τ = 15 MPa (AANNAME); een bordje met zijn draden weegt 0,29 N: meer dan 705 keer veilig, ook met de doos ondersteboven. De kop (Ø4) blijft 1,45 van de eindklem en 8,2 van de klemstrook; de schacht van een schroevendraaier PH1 (Ø4,5) raakt geen klem. Aandraaien met de hand tot de kop de print raakt, dan 1/8 slag: verder draaien trekt de gang uit.

## 7. Draden en de 0 V-retour

De 16 groepen komen terug door de MOSFET-modules: per module tot 2,56 A over zijn klem VIN− en een draad van 0,75 mm² naar de verdeelklem -X2 (WAGO 221-415, 32 A): 250 mm geeft 5,8 mΩ en 15 mV verlies. Samen 5,51 A door de 2 WAGO-klemmen van -X1 en -X2 en de draden van 0,75 mm² van de DC-bus. De andere draden (PWM, GPIO, I2C, 3,3 V) dragen milliampères: 0,14 mm² of dupontkabels. Interne draadlijst: TRN-14.

## 8. De naad: klikhaken en de lip van het deksel (PETG)

Ian, 2026-11-15: "De doos moet in elkaar kunnen klikken en nog kunnen lijmen." De 2 helften klikken met 2 haken (achter en voor) van de rechterhelft in een kuiltje in de wand van de linkerhelft; 5 bodemlippen lijnen uit; overal 0,2 lijmspleet.

Een haak is een uitkragende balk van 14 lang en 1,6 dik. Door de onderkant van 45° (zo print hij zonder support) groeit zijn hoogte van 11,8 aan de punt tot 25,8 aan de voet. Met J = ∫ x² / (b0 + x) dx = 41,7 mm² is de kracht om de punt 0,6 opzij te duwen F = d E t³ / (12 J) = **10,3 N**, de rek aan de voet 6 F l / (b t² E) = **0,62 %** (een rechte balk van 11,8 hoog: 0,73 %), onder de 2 %. De nok loopt op over 27° (wrijving 0,3): inklikken **9,7 N per haak**, samen 19 N. Met het rechte vlak achter de nok kan de haak er niet meer uit tot je de punt met een kleine schroevendraaier van de wand weg trekt (van binnen, bovenaan bereikbaar).

Het deksel: de rechterhelft schuift met een lip van 12 x 1,4 onder de linkerhelft; de lip is in 4 vingers gesneden met elk een nok van 0,5 die 0,3 opzij moet (de lijmspleet is 0,2). Rek = 1,5 t d / L² = **0,44 %**; inklikken samen **44 N**.

## 9. Versie 6: IR, servo's, NPN en PNP

**IR-led** (Vishay TSAL6200, Vf 1,35 V bij 100 mA, hoogstens 100 mA continu en 200 mA piek): op 12 V met **120 Ω** in serie loopt er **89 mA** zolang de draaggolf "aan" is. De draaggolf staat 33 % aan, een NEC-code zendt ± 50 % van de tijd: gemiddeld 14,8 mA per led. De weerstand: 0,95 W piek, 0,16 W gemiddeld (neem 0,5 W). Alle 8 leds samen: 0,71 A piek door -Q3 (AOD4184-module, geen koeling nodig). De MOSFET van -Q4 en die van -Q3 staan in serie: elk ± 0,02 V, verwaarloosbaar. Bereik: enkele meters tot een TSOP-ontvanger (AANNAME, praktijk); richt de led op de ontvanger van de bus.

**Servo's** (SG90 / MG90S): blokkeerstroom ± 0,70 A, in rust ± 10 mA (AANNAME, gangbare waarden). De firmware laat er hoogstens 4 tegelijk bewegen: ongunstigst 4 x 0,70 + 12 x 0,01 = **2,92 A** op 5,5 V: de XL4015 (5 A) heeft ruim marge. Uit 12 V (rendement 88 %): 1,52 A, dus -F19 3 A. De elco van 1000 µF vangt de stroomstoot op als een servo vertrekt.

**Ingangen NPN of PNP** (serieweerstand 1000 Ω op de print, AANNAME): NPN met COM op +12 V: 10,8 mA. Een PNP-print (led andersom, COM op 0 V): even veel. Een bipolaire print (PC814) met COM op 5 V: NPN 3,8 mA, PNP 5,8 mA; uitgang ten minste 1,9 mA (CTR 50 %) tegen een pull-up van 10 kΩ (0,33 mA): ruim. **Nooit een gewone (NPN-)print met COM aan 0 V**: een PNP-sensor zet dan 12 V in sperrichting over de led (PC817: hoogstens 6 V).

**Voeding:** de uitbreiding vraagt uit 12 V hoogstens 1,81 A (servo's, IR gemiddeld, ontvangers, 16 extra ingangen); met de bordjes van 1K (Modelbouwled voor 12 V) en 4 ingangen actief: **4,26 A** (64 % van de 6,67 A). Het ongunstigste geval van hoofdstuk 2 (bordjes van 0 Ω, alles aan) plus 4 blokkerende servo’s geeft 7,33 A: meer dan de adapter. Komen er ooit bordjes zonder weerstand, geef de servo’s dan een eigen netadapter 5 V (bv. Mean Well GST25A05, 4 A) in plaats van -T3.

