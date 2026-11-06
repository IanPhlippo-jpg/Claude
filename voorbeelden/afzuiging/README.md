# Ingebouwde nagelstofafzuiging (Lush Beauty), versie 4

Een krachtige, compacte afzuiging voor in het bureaublad, met het LB-monogram in het RVS-rooster.
De module zakt van bovenaf in een gefreesde uitsparing en klemt zich vast met vier stalen klauwen, voor een blad van 10 tot 50 mm dik.
Een VIEWE-knop van 1,5" (rond AMOLED-scherm, ESP32-S3) zit in het blad, regelt de zuigkracht en meldt wanneer de filters vol zijn.
Ook de knop klemt zich vast met klauwen: er komt geen enkele schroef in het bureaublad. Van boven zie je alleen de knop zelf, de houder is niet breder.

![Rooster](laser/rooster-voorbeeld.png)

## Opbouw

| Van boven naar onder | Wat |
|---|---|
| RVS-plaat | RVS 430 (magnetisch), 206 x 150 mm, even groot als het frame; klikt op 4 verzonken magneten |
| Bovenframe | PETG, smalle omranding van 2,5 mm, op de romp gelijmd; de magneten en de koppen van de M5-schroeven zitten erin, onder de plaat |
| Filtercassette | G4-voorfilter, M5-fijnstofmat en actieve koolmat; langs boven uitneembaar |
| Romp | ventilator Delta PFR1212UHE-SP00 direct onder de cassette; links het elektronicavak |
| Bodemplaat | één plaat over de hele onderkant: lamellen onder de ventilator sturen de lucht naar achteren, onder het elektronicavak de DC-bus |

- **Diepte onder het blad:** de module hangt 51 mm onder een blad van 34 mm, met de schroefkoppen 54 mm. In versie 2 was dat 116 mm.
- **Van boven alleen staal:** de RVS-plaat bedekt het frame volledig. Van opzij zie je een randje PETG van 2,5 mm en de plaat van 1,5 mm, samen 4 mm boven het blad. De magneten zitten onzichtbaar onder de plaat.
- **Filters reinigen:** neem het rooster eraf, til de cassette aan de twee greepuitsparingen uit en klop de filters uit of vervang ze.
- **Draaiknop:** de VIEWE-knop staat op een houder die even breed is als de knop (Ø51,6). De houder zit in een gat van Ø44 en klemt zich vast met 2 stalen klauwen. Alleen de voet en de naaf van de knop zijn vastgeschroefd: draaien en indrukken doet de knop zelf.
- **Aan/uit:** een wipschakelaar zit verzonken in een kom in de linkerzijwand, onder het blad. De wip ligt 1 mm binnen de wand, zodat je knie of een tas hem niet omzet.
- **Luchtdicht:** het kanaal is alleen open via het rooster en de bodemplaat. De klauwen zitten in gesloten torens, de schroefkoppen dichten hun gat en de naad tussen frame en romp is gelijmd. De cassetterand rust rondom op een richel, zodat er geen lucht langs de filters glipt. Het elektronicavak is afgesloten van het kanaal. Een test bemonstert het geheel per mm, met tegenproeven.
- **Stevig:** de kop van elke M5-schroef zit in het bovenframe en drukt het hele frame op het blad; de lijmnaad hoeft geen kracht op te nemen. De klauwen zijn van RVS van 4 mm. Alle schroefkoppen zitten in een conische zitting. Bij het aandraaien zwaait elke klauw door een venster naar buiten en schuift dan in een lange sleuf omhoog tot tegen het blad.

## Zuigkracht en bediening

| Ventilator | Vrij uitblazend | Max. statische druk | Vermogen |
|---|---|---|---|
| Delta PFR1212UHE-SP00 | 389 m³/h | 300 Pa | 32 W |

- **Met rooster en filters:** naar schatting 150 tot 250 m³/h.
- **Draaien:** de zuigkracht gaat van 20 tot 100 % in stappen van 5 %.
- **Drukken:** aan of uit.
- **1 seconde indrukken:** boost, 2 minuten op 100 %.
- **5 seconden indrukken:** ijken op schone filters. Doe dat na elke filterwissel.
- **Filtermelding:** de verschildrukmeter vergelijkt de weerstand van de filters met die van schone filters. Bij het dubbele wordt de ring oranje met "Filter vol – filters uitkloppen".
- **Storing:** valt de luchtstroom weg terwijl de ventilator hoort te draaien, dan wordt de ring rood.

## Bestellijst

### Kopen

| Onderdeel | Aantal | Type of bestelnummer |
|---|---|---|
| Ventilator 120 x 38 mm, 12 V, PWM | 1 | Delta PFR1212UHE-SP00 |
| Knop met rond AMOLED-scherm 1,5", ESP32-S3 | 1 | VIEWE UEDX46460015-MD50E, variant 1.5-Black-Knob (AliExpress, VIEWE Store) |
| Adapterprint FPC 10-polig 0,5 mm naar 2,54 mm | 1 | FPC/FFC-breakout 10P, past in 23 x 47 mm |
| USB-C-bus (breakout, USB 2.0) | 1 | op de adapterprint, om de knop te flashen |
| Schakelende regelaar 12 V naar 5 V, 0,5 A | 1 | Pololu D24V5F5 |
| Verschildrukmeter ±500 Pa, I2C | 1 | Sensirion SDP810-500PA |
| Netadapter 12 V DC, 5 A, plug 5,5 x 2,1 mm | 1 | Mean Well GST60A12-P1J |
| DC-inbouwbus 5,5 x 2,1 mm met moer | 1 | inbouwmodel, gat Ø8 |
| Wipschakelaar aan/uit, 1-polig, 21 x 15 mm | 1 | KCD1-101, inbouwgat 19 x 13 mm, 6 A |
| Vlakstekerhulzen 4,8 mm, geïsoleerd | 2 | draden op de schakelaar |
| P-MOSFET | 1 | Infineon IRF4905PbF (TO-220) |
| NPN-transistor | 2 | BC547B (TO-92) |
| Spanningsregelaar 3,3 V | 1 | Microchip MCP1700-3302E/TO |
| Weerstanden 0,25 W | 7 | 2 x 1 kΩ, 3 x 10 kΩ, 2 x 4,7 kΩ |
| Condensatoren | 3 | 470 µF/25 V elco, 2 x 1 µF keramisch |
| Zekering 4 A traag 5 x 20 mm + printzekeringhouder | 1 | |
| Gaatjesprint 30 x 70 mm | 1 | gaten 2 mm in de hoeken |
| Printschroefklemmen steek 3,5 mm | 3 | 4-polig (ventilator), 6-polig (kabel naar de knop) op de print en 6-polig op de adapterprint |
| Kabel 4 x 2 x 0,2 mm² (Cat 6, soepel) | 0,6 m | van het elektronicavak naar de knop |
| Siliconeslang 3 x 5 mm | 0,5 m | drukmeter naar het tuitje |
| G4-voorfilter, mat 10 mm | rol | knippen op 154 x 121 mm |
| M5-fijnstofmat 15 mm | rol | knippen op 154 x 121 mm |
| Actieve koolmat 10 mm | rol | knippen op 154 x 121 mm |
| Neodymiummagneet Ø8 x 2 mm, N42 | 4 | inlijmen in het bovenframe, vlak met de bovenkant |
| Tweecomponentenlijm (epoxy) | 1 | voor de magneten |
| Tweecomponentenlijm voor kunststof | 1 | bovenframe op de romp (PETG) |
| Kabeltule Ø6 | 1 | doorvoer ventilatorkabel in de tussenwand |
| Kabeltule Ø10 | 1 | in het deksel van de knophouder |
| M5 x 65 verzonken (DIN 7991, A2) | 4 | klauwen van de module |
| M3 x 60 verzonken (DIN 7991, A2) | 2 | klauwen van de knophouder (de koppen liggen onder de voet van de knop) |
| M2,5 x 6 cilinderkop | 2 | knop in de houder (gaten in de naaf) |
| M2,5 x 8 verzonken (DIN 7991) | 2 | deksel van de knophouder |
| M3 x 16 verzonken (DIN 7991, A2) | 6 | bodemplaat; de kop ligt vlak in de plaat, draait zelf in PETG |
| M4 x 45 verzonken (DIN 7991, A2) + M4-moer (DIN 934) | 4 | ventilator op de bodemplaat; de kop ligt vlak in de plaat |
| M2,5 x 6 zelftappend | 4 | gaatjesprint op de bussen |

### Laten lasersnijden

| Bestand | Materiaal | Aantal |
|---|---|---|
| `laser/rooster.dxf` | RVS 430, 1,5 mm, geborsteld (magnetisch), 206 x 150 mm | 1 |
| `laser/klauwen-4x-RVS304-4mm.dxf` | RVS 304, 4 mm; gat Ø4,2 laten tappen M5 | 4 (staan alle 4 in het bestand) |
| `laser/dialklauwen-2x-RVS304-3mm.dxf` | RVS 304, 3 mm; gat Ø2,5 laten tappen M3 (klauwen van de knophouder) | 2 |

Het rooster is één stuk, zonder losse eilanden, en geen steg of sleuf is smaller dan 1,5 mm. Boven de cassette is 78 cm² open.

### Printen (PETG, 0,2 mm, 4 wanden, 25 % gyroid, zonder support)

PETG is taaier dan PLA, kruipt minder onder de klemkracht van de schroeven, kan tot ongeveer 75 °C en kan tegen aceton (nagellakremover). ABS en ASA lossen op in aceton. Print op 235-245 °C, bed 75-80 °C. De knophouder en het deksel in zwart, de rest in wit.

| Bestand | Stand op het bed | Maat (mm) |
|---|---|---|
| `print/Romp.stl` | rechtop | 194 x 138 x 79 |
| `print/Bovenframe.stl` | plat | 206 x 150 x 2,5 |
| `print/Filtercassette.stl` | met de rand op het bed | 185 x 134 x 39 |
| `print/Bodemplaat.stl` | plat, de lamellen staan onder 45° | 194 x 138 x 6 |
| `print/Knophouder.stl` | ondersteboven, de plaat op het bed | Ø51,6 x 62 |
| `print/Knopdeksel.stl` | plat | Ø43 x 2 |

Alles past op een bed van 220 x 220 mm.

### Gereedschap

- **Bovenfrees:** met een frees Ø10 mm, voor een uitsparing van 196 x 140 mm. De hoeken worden dan R5.
- **Gatzaag Ø44 mm:** voor de knop.
- **Soldeerbout:** voor de gaatjesprint.
- **Tap M5:** alleen als de lasersnijder de klauwen niet tapt.

## Maken en monteren

1. **Uitsparingen in het blad.**

   | Uitsparing | Gereedschap | Plaats |
   |---|---|---|
   | Afzuiging, 196 x 140 mm | frees Ø10 | midden van het blad |
   | Knop, Ø44 mm | gatzaag | 250 mm rechts van het midden, 100 mm van de voorkant |

   De wanden van de romp en de buis van de knophouder dekken de rand van het honingraatblad volledig af.
2. **Magneten:** lijm de vier magneten in het bovenframe, vlak met de bovenkant en allemaal met dezelfde pool naar boven.
3. **Frame op de romp:** lijm het bovenframe op de bovenrand van de romp, rondom. Die naad moet luchtdicht zijn.
4. **Klauwen:** schuif elke klauw liggend door het venster onderaan de zijwand, tot het gat onder de schroef zit. Draai de M5 x 65 van bovenaf door de lip van het bovenframe in en draai hem een paar slagen terug. De kop zit verzonken in het frame, onder de RVS-plaat, en drukt het frame over zijn hele vlak op het blad. De klauw ligt dan in de toren langs de wand.
5. **Elektronica:** bouw de gaatjesprint volgens `schema/Aansluitschema-afzuiging.pdf`. Schroef ze met 4 x M2,5 op de bussen in het elektronicavak. Druk de siliconeslang van de drukmeter (poort "-") op het tuitje in het plafond van het vak.
6. **Ventilator:** schroef de ventilator met 4 x M4 x 45 en moeren op de bodemplaat, met de spaken naar beneden. Leid de kabel door de tule in de tussenwand naar de print.
7. **Schakelaar:** soldeer of klem twee draden op de wipschakelaar en druk hem van buiten in het gat in de kom van de linkerzijwand, tot hij vastklikt. Eén draad gaat naar de + van de DC-bus, de andere naar de zekering op de print.
8. **Bodemplaat:** zet de DC-bus in de bodemplaat, onder het elektronicavak. De kabel naar de knop gaat door de kabeldoorvoer ernaast. Schroef de plaat met 6 x M3 aan de romp. Om bij de elektronica te kunnen, schroef je de bodemplaat weer los.
9. **Inbouwen:** laat de module in de uitsparing zakken en draai de vier M5-schroeven rechtsom aan. Elke klauw zwaait naar buiten en trekt zich tegen de onderkant van het blad. Draai stevig aan.
10. **Filters en plaat:** knip de drie filters op 154 x 121 mm. Leg ze in de cassette, G4 bovenaan. Zet de cassette in het frame en leg de RVS-plaat erop, precies op de rand van het frame.
11. **Knop:** steek de twee knopklauwen van onderen in hun kanaal en draai de M3 x 60 van bovenaf in, een paar slagen. Zet de houder in het gat van Ø44 en draai beide schroeven rechtsom aan: de klauwen zwaaien uit en klemmen tegen de onderkant van het blad (10 tot 50 mm). Steek de FPC van de knop door de sleuf in de kom, zet de knop in de kom (de pennen in hun gaatjes) en schroef hem van onderen vast met 2 x M2,5 x 6. Steek de FPC in de adapterprint, klem de kabel op de schroefklem en schuif de print in de groeven. Schroef het deksel met 2 x M2,5 x 8 vast, met de kabel door de tule.
12. **Opstarten:** zet de schakelaar aan de zijkant aan, flash de firmware via de USB-C-bus in het deksel en houd de knop 5 seconden ingedrukt om te ijken.

## Aansluitschema

Het aansluitschema staat in `schema/Aansluitschema-afzuiging.pdf`, in EPLAN-stijl met de codes van IEC 81346. De bladen zijn ook los beschikbaar als `schema/blad-1.svg` tot `schema/blad-6.svg`.

| Blad | Inhoud |
|---|---|
| 1 | titelblad en inhoud |
| 2 | voeding: -T1, -X1, -S1, -F1, -C1 en de 5V-regelaar -T3 |
| 3 | ventilator: aan/uit met -Q3/-Q2, snelheid met -Q1, -M1 |
| 4 | knop -A1 met adapterprint -A3 en kabel -W1, 3,3V-regelaar -T2, drukmeter -B1 |
| 5 | klemmenplan |
| 6 | stuklijst elektronica |

Meet de draadkleuren van de kabel en de ventilator na voor het solderen.

## Firmware

```bash
python -m pip install platformio
```

```bash
cd voorbeelden/afzuiging/firmware
python -m platformio run -t upload
```

Sluit de knop aan via de USB-C-bus in het deksel van de knophouder, met de afzuiging aan. De firmware gebruikt GFX Library for Arduino (CO5300-driver) en U8g2-lettertypes.

## Bestanden

| Bestand | Wat |
|---|---|
| `Afzuiging.kcad` | assemblage van de afzuiging |
| `../bureau/Bureau.kcad` | het bureau met de afzuiging en de uitsparingen in het blad |
| `laser/`, `print/` | DXF's en STL's |
| `schema/` | aansluitschema (PDF en SVG) |
| `firmware/` | PlatformIO-project voor de VIEWE-knop |
| `maak-afzuiging.mjs`, `logo/*.py`, `schema/maak-schema.mjs` | generators; alle maten staan bovenaan in `maak-afzuiging.mjs` |

## Onderhoud en veiligheid

- **Filters:** leeg of vervang ze als de knop "Filter vol" meldt. Ijk daarna opnieuw.
- **Koolmat:** vervang ze ook als de geur terugkomt, want de drukmeter ziet niet wanneer de kool verzadigd is.
- **Gebruik:** gebruik de afzuiging nooit zonder filters.
- **Netspanning:** er komt geen 230 V in het bureau, want de adapter steekt in het stopcontact.
