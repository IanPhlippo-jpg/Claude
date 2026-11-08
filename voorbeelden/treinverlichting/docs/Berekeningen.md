# Kabeldoos: rekenblad

Gemaakt door `docs/berekeningen.py`. De metingen bij de ingebruikname beslissen.

## 1. Stroom per groep (één bordje)

| bordje | stroom per led | 16 leds |
| --- | ---: | ---: |
| 1K (voor 12 V) | 9,1 mA | 0,146 A |
| 1K5 (voor 20 V) | 6,1 mA | 0,097 A |
| 470 Ω (voor 5 V) | 19,4 mA | 0,310 A |
| 0 Ω (leds met eigen weerstand, 20 mA) | 20,0 mA | 0,320 A |

Ongunstigste groep: **0,32 A**. Op 12 V geven bordjes van 1K5 maar 6,1 mA per led: zwakker licht (Modelbouwled raadt 1K aan voor 12 V).

## 2. Voeding en zekeringen

- **Alles aan, ongunstigste bordjes:** 16 x 0,32 A + besturing = **5,18 A**, 78 % van de Mean Well GST90A12-P1M (6,7 A). Met bordjes van 1K: 2,40 A.
- **Hoofdzekering:** steekzekering 7,5 A (32 V DC) in de voedingsprint, achter de klem 12 V in.
- **Per rij bordjes een polyfuse 1,1 A (bv. Bourns MF-R110):** een rij is 3 bordjes = 0,96 A ongunstigst, onder de houdstroom 1,1 A.
  Bij een kortsluiting op een bordje springt die polyfuse (vanaf 2,2 A) en blijven de andere rijen branden; na het wegnemen van de fout herstelt ze vanzelf.

## 3. Schakelen (MOSFET per groep)

IRLD024 (Vishay), logic-level, gestuurd door de PCA9685 met 3,3 V. R(on) bij 3,3 V: AANNAME 0,20 Ω (het datablad geeft 0,10 Ω bij 5 V). Bij 0,32 A: 20 mW, de chip wordt 2,5 K warmer dan de lucht (Rth 120 K/W): geen koeling nodig. PWM 1 kHz: de schakelverliezen zijn verwaarloosbaar.

## 4. Ingangen (knoppen en sensoren)

Elke ingang: optocoupler (PC847) met 2,2 kΩ in serie. Op 12 V loopt er 4,9 mA door de led; de transistor kan dan minstens 2,5 mA, de pull-up van de ESP vraagt 0,073 mA: zeker laag (factor 33). Een knop sluit je aan tussen "+12 V" en de ingang; een sensor met een uitgang op 12 V (PNP) rechtstreeks op de ingang. De 12 V van de knoppen komt uit de klemmen van de ingangsprint.

## 5. Warmte: geen verluchting nodig

Alles samen hoogstens **1,90 W** in de doos (MOSFET's, ESP, PCA9685, regelaar, polyfuses). De doos heeft 0,14 m² oppervlak; met 5 W/m²K (natuurlijke convectie, AANNAME) wordt het binnen **2,7 K** warmer dan onder de baan. Verluchtingsgaten zijn niet nodig; de kabelinvoeren laten ook lucht door. De netadapter (het warmste deel) hangt buiten de doos.

