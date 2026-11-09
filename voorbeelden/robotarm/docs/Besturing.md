# Besturing van de robotcel

## Opbouw

| Laag | Wat | Waar |
|---|---|---|
| Veiligheid | Pilz PNOZmulti 2 (-K2): noodstop, deur, lichtschermen, muting, STO, netmagneet | kast, rij 3 |
| Beweging | industriële PC (-K1) met Linux (PREEMPT_RT) en LinuxCNC: 6-assige kinematica, baanplanning, EtherCAT-master (IgH, cyclus 1 ms) | kast, rij 3 |
| Aandrijving | 6 servoversterkers Inovance SV660N (-T11..-T16) aan EtherCAT, STO van -K2 | kast, rij 2 |
| I/O | Beckhoff EK1100 + EL1809 / EL2809 / EL3002 (-K3) aan het einde van de EtherCAT-lijn | kast, rij 3 |
| Zien | camera Basler ace 2 (-B30) via GigE (PoE-switch -K4), laser (-B31) analoog op -K3 | portaal boven de band |
| Denken | grijpplanner (`besturing/greep.py`) en herkenning (OpenCV) als dienst op de IPC | -K1 |
| Bedienen | HMI (`hmi/index.html`) als webpagina van de IPC op het aanraakscherm -P10 | kastdeur |

De veiligheid hangt niet af van de PC: valt de PC uit, dan blijft -K2 de STO en de remmen bewaken.

## Toestanden

| Toestand | Hoe erin | Wat gebeurt er |
|---|---|---|
| UIT | hoofdschakelaar -Q1 af | niets onder spanning behalve vóór -Q1 |
| VEILIG (niet klaar) | na inschakelen, na noodstop of deur open | STO actief, remmen dicht; HMI toont de oorzaak |
| GESTOPT | reset -S3 met alle beveiligingen in orde | servo's aan, robot in rust; handbediening of start mogelijk |
| HAND (T1) | sleutel -S4 op hand | assen of gereedschap verplaatsen met 250 mm/s, alleen met vrijgave |
| AUTOMAAT | sleutel op automaat, start -S5 | de cyclus hieronder, tot stop -S6 (na de cyclus) of een fout |
| FOUT | alarm (vacuüm, positie, servo, camera) | stop cat. 1, melding met oplossing op de HMI; reset na herstel |

## Cyclus (automaat)

1. De fotocel -B32 meldt een stuk. De camera maakt een beeld wanneer het stuk onder het portaal is; de laser meet de
   dikte. De herkenning geeft omtrek, draaiing, middelpunt en dikte.
2. De grijpplanner rekent: draaiing A6, grijppunt, zones (balken) en de toegelaten versnelling (veiligheid 2). Te zwaar
   of te klein = weigeren: het stuk loopt door, melding op de HMI.
3. De stopper -Q25 gaat omhoog; het stuk loopt ertegen (-B33). De band stopt (-K14).
4. De robot gaat boven het stuk, daalt de laatste 50 mm traag, de zones zuigen (-Q21..-Q23); pas als elke gebruikte
   zone onder -400 mbar is (-B21..-B23) tilt hij op.
5. Hij legt het stuk neer volgens de soort (plat of rechtop, plaats per soort, zie het scherm Stukken), blaast af
   (-Q24) en gaat terug. De stopper zakt, de band loopt.
6. De statistiek telt het stuk, de cyclustijd en eventuele weigeringen; de onderhoudstellers lopen op.

## Statistiek op de HMI

- Stuks per uur en per soort, gemiddelde cyclustijd, geweigerde stukken.
- OEE = beschikbaarheid x prestatie x kwaliteit; beschikbaarheid uit de stilstand per oorzaak, prestatie tegenover de
  doelcyclus van 13,5 s, kwaliteit = goed afgelegde stukken / alle stukken.
- Zonder verbinding met de IPC toont de HMI gesimuleerde waarden met de vermelding SIMULATIE.
