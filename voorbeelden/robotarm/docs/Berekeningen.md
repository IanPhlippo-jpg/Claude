# Berekeningen robotarm

Gemaakt door `berekeningen.py`; de massa's van de armdelen zijn aannames (gelaste S355-constructie), na de eerste weging bijwerken.

## Lasten

| Wat | Waarde |
|---|--:|
| Deur | 60 kg |
| Grijper (raam, nappen, ejectors, slangen) | 42 kg |
| Totaal aan de flens | 102 kg (klasse 120 kg) |
| Zwaartepunt voor de flens | 200 mm |
| Bereik tot het polsmidden | 2700 mm; tot de flens 2915 mm |

## Koppel per as (slechtste stand: arm horizontaal gestrekt, met versnelling)

Statisch A2 6019 Nm, waarvan de gewichtscompensatie 4635 Nm opvangt; statisch A3 2251 Nm. Traagheid om A1 1173 kg·m², om A2 1302 kg·m², om A3 373 kg·m².

| As | Snelheid | Versnelling | Koppel (Nm) | Reductor | Nominaal / bij versnellen (Nm) | Overbrenging (voortrap) | Motorkoppel max / statisch (Nm) | Servomotor |
|---|--:|--:|--:|---|--:|--:|--:|---|
| A1 | 130 °/s | 120 °/s² | 2457 (statisch 0) | RV-320C | 3136 / 7840 | 138 (3.89) | 22.2 / 0.0 | 2,9 kW |
| A2 | 120 °/s | 70 °/s² | 2974 (statisch 1383) | RV-320C | 3136 / 7840 | 150 (4.21) | 24.8 / 11.5 | 2,9 kW |
| A3 | 120 °/s | 120 °/s² | 3031 (statisch 2251) | RV-320C | 3136 / 7840 | 150 (4.21) | 25.3 / 18.8 | 4,4 kW |
| A4 | 220 °/s | 250 °/s² | 460 (statisch 300) | RV-100C | 980 / 2450 | 82 (2.23) | 7.0 / 4.6 | 1,3 kW |
| A5 | 220 °/s | 250 °/s² | 612 (statisch 415) | RV-100C | 980 / 2450 | 82 (2.23) | 9.3 / 6.3 | 1,3 kW |
| A6 | 300 °/s | 300 °/s² | 244 (statisch 100) | RV-50C | 490 / 1225 | 60 (1.84) | 5.1 / 2.1 | 1,3 kW |

De arm beweegt met servomotoren op elke as; de cilinder op de schouder is alleen een gewichtscompensatie (een gasveer die het eigen gewicht draagt), geen aandrijving. Daardoor kan A2 snel bewegen met een kleinere motor.


Regel: het toelaatbare koppel bij versnellen en remmen minstens 1,3 x het grootste koppel, het nominale minstens het statische koppel (catalogus Nabtesco RV-C).

## Vacuümgrijper (belastinggevallen volgens de rekenwijze van Schmalz)

| Wat | Waarde |
|---|--:|
| Zuignappen | 16 x Schmalz SAB 100 (Ø101), 70 kPa onderdruk, 222 N per nap |
| Houdkracht | 3547 N |
| Nodig plat (I), S = 2.0 | 1657 N (ok) |
| Nodig rechtop (III, µ = 0.5), S = 2.0 | 3314 N (ok) |

Bij het neerleggen in alle richtingen is geval III (de deur rechtop, de kracht langs het vlak) maatgevend. Elke ejector heeft een terugslagklep: bij het uitvallen van de perslucht blijft het vacuüm even staan, de robot stopt (vacuümschakelaar in het veiligheidscircuit).

