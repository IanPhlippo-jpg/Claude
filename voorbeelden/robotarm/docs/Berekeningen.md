# Berekeningen robotarm

Gemaakt door `berekeningen.py`; de massa's van de armdelen zijn aannames (gelaste S355-constructie), na de eerste weging bijwerken.

## Lasten

| Wat | Waarde |
|---|--:|
| Deur | 60 kg |
| Grijper (raam, nappen, ejectors, slangen) | 45 kg |
| Totaal aan de flens | 105 kg (klasse 120 kg) |
| Zwaartepunt voor de flens | 150 mm |
| Bereik tot het polsmidden | 2700 mm; tot de flens 2915 mm |

## Koppel per as (slechtste stand: arm horizontaal gestrekt, met versnelling)

Statisch A2 6049 Nm, waarvan de gewichtscompensatie 4650 Nm opvangt; statisch A3 2247 Nm. Traagheid om A1 1170 kg·m², om A2 1296 kg·m², om A3 364 kg·m².

| As | Snelheid | Versnelling | Koppel (Nm) | Reductor | Nominaal / bij versnellen (Nm) | Overbrenging (voortrap) | Motorkoppel max / statisch (Nm) | Servomotor |
|---|--:|--:|--:|---|--:|--:|--:|---|
| A1 | 130 °/s | 120 °/s² | 2451 (statisch 0) | RV-320C | 3136 / 7840 | 138 (3.89) | 22.1 / 0.0 | 2,9 kW |
| A2 | 120 °/s | 70 °/s² | 2981 (statisch 1398) | RV-320C | 3136 / 7840 | 150 (4.21) | 24.8 / 11.7 | 2,9 kW |
| A3 | 120 °/s | 120 °/s² | 3008 (statisch 2247) | RV-320C | 3136 / 7840 | 150 (4.21) | 25.1 / 18.7 | 4,4 kW |
| A4 | 220 °/s | 250 °/s² | 470 (statisch 309) | RV-100C | 980 / 2450 | 82 (2.23) | 7.2 / 4.7 | 1,3 kW |
| A5 | 220 °/s | 250 °/s² | 557 (statisch 376) | RV-100C | 980 / 2450 | 82 (2.23) | 8.5 / 5.7 | 1,3 kW |
| A6 | 300 °/s | 300 °/s² | 247 (statisch 103) | RV-50C | 490 / 1225 | 60 (1.84) | 5.1 / 2.1 | 1,3 kW |

De arm beweegt met servomotoren op elke as; de cilinder op de schouder is alleen een gewichtscompensatie (een gasveer die het eigen gewicht draagt), geen aandrijving. Daardoor kan A2 snel bewegen met een kleinere motor.


Regel: het toelaatbare koppel bij versnellen en remmen minstens 1,3 x het grootste koppel, het nominale minstens het statische koppel (catalogus Nabtesco RV-C).

## Vlakgrijper (belastinggevallen volgens de rekenwijze van Schmalz)

| Wat | Waarde |
|---|--:|
| Balken | 2 x Schmalz FA-M 1972 x 130 (2454 N elk) + 1 x FMP-60 1972 x 60 (692 N), bij -250 mbar |
| Houdkracht, deur (alle balken bedekt) | 5600 N |
| Nodig plat (I), S = 2.0 | 1657 N (ok) |
| Nodig rechtop (III, µ = 0.5), S = 2.0 | 3314 N (ok) |
| Perslucht voor het vacuüm (5 x SBPL 100) | 1975 l/min = 118 m³/h zolang de grijper zuigt |

Kleinere stukken (plinten, planken, latten): zie Grijpen.md; de grijpplanner kiest per stuk de balk(en) met de meeste houdkracht en begrenst de versnelling. Elke balk heeft een terugslagklep en een vacuümschakelaar: bij het uitvallen van de perslucht blijft het vacuüm even staan en stopt de robot (veiligheidscircuit). Let op de compressor: 118 m³/h vraagt een schroefcompressor van ±15 kW, of kies een elektrische zijkanaalblazer (±4 kW) voor het vacuüm.

