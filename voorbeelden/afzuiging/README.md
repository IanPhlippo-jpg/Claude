# Ingebouwde nagelstofafzuiging (Lush Beauty), versie 3.3

Een krachtige, compacte afzuiging voor in het bureaublad, met het LB-monogram in het RVS-rooster.
De module zakt van bovenaf in een gefreesde uitsparing en klemt zich vast met vier stalen klauwen, voor een blad van 10 tot 50 mm dik.
Een M5Stack Dial zit rond ingebouwd in het blad, regelt de zuigkracht en meldt wanneer de filters vol zijn.
Ook de draaiknop klemt zich vast met klauwen: er komt geen enkele schroef in het bureaublad.

![Rooster](laser/rooster-voorbeeld.png)

## Opbouw

| Van boven naar onder | Wat |
|---|---|
| RVS-plaat | RVS 430 (magnetisch), 206 x 150 mm, even groot als het frame; klikt op 4 verzonken magneten |
| Bovenframe | PLA, smalle omranding van 2,5 mm, op de romp gelijmd; de magneten zitten erin, onder de plaat |
| Filtercassette | G4-voorfilter, M5-fijnstofmat en actieve koolmat; langs boven uitneembaar |
| Romp | ventilator Delta PFR1212UHE-SP00 direct onder de cassette; links het elektronicavak |
| Bodemplaat | één plaat over de hele onderkant: lamellen onder de ventilator sturen de lucht naar achteren, onder het elektronicavak de DC-bus |

- **Diepte onder het blad:** de module hangt 51 mm onder een blad van 34 mm, met de schroefkoppen 54 mm. In versie 2 was dat 116 mm.
- **Van boven alleen staal:** de RVS-plaat bedekt het frame volledig. Van opzij zie je een randje PLA van 2,5 mm en de plaat van 1,5 mm, samen 4 mm boven het blad. De magneten zitten onzichtbaar onder de plaat.
- **Filters reinigen:** neem het rooster eraf, til de cassette aan de twee greepuitsparingen uit en klop de filters uit of vervang ze.
- **Aan/uit:** een wipschakelaar zit verzonken in een kom in de linkerzijwand, onder het blad. De wip ligt 1 mm binnen de wand, zodat je knie of een tas hem niet omzet.
- **Luchtdicht:** het kanaal is alleen open via het rooster en de bodemplaat. De klauwen zitten in gesloten torens, de schroefkoppen dichten hun gat en de naad tussen frame en romp is gelijmd. De cassetterand rust rondom op een richel, zodat er geen lucht langs de filters glipt. Het elektronicavak is afgesloten van het kanaal. Een test bemonstert het geheel per mm, met tegenproeven.
- **Stevig:** frame en romp worden door de lijmnaad één geheel. De klauwen zijn van RVS van 4 mm en de schroeven zijn M5. Bij het aandraaien zwaait elke klauw door een venster naar buiten en schuift dan in een lange sleuf omhoog tot tegen het blad.

## Zuigkracht en bediening

| Ventilator | Vrij uitblazend | Max. statische druk | Vermogen |
|---|---|---|---|
| Delta PFR1212UHE-SP00 | 389 m³/h | 300 Pa | 32 W |

- **Met rooster en filters:** naar schatting 150 tot 250 m³/h.
- **Draaien:** de zuigkracht gaat van 20 tot 100 % in stappen van 5 %.
- **Drukken of op het scherm tikken:** aan of uit.
- **Knop lang indrukken:** boost, 2 minuten op 100 %.
- **Scherm 2 seconden vasthouden:** ijken op schone filters. Doe dat na elke filterwissel.
- **Filtermelding:** de verschildrukmeter vergelijkt de weerstand van de filters met die van schone filters. Bij het dubbele wordt de ring oranje met "Filter vol – filters uitkloppen".
- **Storing:** valt de luchtstroom weg terwijl de ventilator hoort te draaien, dan wordt de ring rood.

## Bestellijst

### Kopen

| Onderdeel | Aantal | Type of bestelnummer |
|---|---|---|
| Ventilator 120 x 38 mm, 12 V, PWM | 1 | Delta PFR1212UHE-SP00 |
| Besturing met rond scherm en draaiknop | 1 | M5Stack Dial v1.1 (K130-V11) |
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
| Printschroefklemmen steek 3,5 mm | 1 set | 4-polig (ventilator) en 2-polig (dial, voeding) |
| Grove-bus HY2.0-4P voor print | 2 | Port A en Port B |
| Grove-kabel 100 cm | 2 | van het elektronicavak naar de Dial |
| Draad 2 x 0,5 mm², rood/zwart | 1 m | voeding van de Dial |
| Siliconeslang 3 x 5 mm | 0,5 m | drukmeter naar het tuitje |
| G4-voorfilter, mat 10 mm | rol | knippen op 154 x 121 mm |
| M5-fijnstofmat 15 mm | rol | knippen op 154 x 121 mm |
| Actieve koolmat 10 mm | rol | knippen op 154 x 121 mm |
| Neodymiummagneet Ø8 x 2 mm, N42 | 4 | inlijmen in het bovenframe, vlak met de bovenkant |
| Tweecomponentenlijm (epoxy) | 1 | voor de magneten |
| Secondelijm (CA) voor PLA | 1 | bovenframe op de romp, sierring op de dialkuip |
| Kabeltule Ø6 | 1 | doorvoer ventilatorkabel in de tussenwand |
| Kabeltule Ø10 | 1 | onderaan de dialkuip (het potje blijft dicht) |
| O-ring 51 x 1,5 mm (NBR) | 1 | in de sierring, rond de Dial |
| M5 x 65 verzonken (DIN 7991, A2) | 4 | klauwen van de module |
| M3 x 40 verzonken (DIN 7991, A2) | 2 | klauwen van de draaiknop |
| M3 x 16 verzonken (DIN 7991, A2) | 6 | bodemplaat; de kop ligt vlak in de plaat, draait zelf in PLA |
| M4 x 45 verzonken (DIN 7991, A2) + M4-moer (DIN 934) | 4 | ventilator op de bodemplaat; de kop ligt vlak in de plaat |
| M2,5 x 6 zelftappend | 4 | gaatjesprint op de bussen |

### Laten lasersnijden

| Bestand | Materiaal | Aantal |
|---|---|---|
| `laser/rooster.dxf` | RVS 430, 1,5 mm, geborsteld (magnetisch), 206 x 150 mm | 1 |
| `laser/klauwen-4x-RVS304-4mm.dxf` | RVS 304, 4 mm; gat Ø4,2 laten tappen M5 | 4 (staan alle 4 in het bestand) |
| `laser/dialklauwen-2x-RVS304-3mm.dxf` | RVS 304, 3 mm; gat Ø2,5 laten tappen M3 | 2 |

Het rooster is één stuk, zonder losse eilanden, en geen steg of sleuf is smaller dan 1,5 mm. Boven de cassette is 78 cm² open.

### Printen (PLA, 0,2 mm, 4 wanden, 25 % gyroid, zonder support)

| Bestand | Stand op het bed | Maat (mm) |
|---|---|---|
| `print/Romp.stl` | rechtop | 194 x 138 x 79 |
| `print/Bovenframe.stl` | plat | 206 x 150 x 2,5 |
| `print/Filtercassette.stl` | met de rand op het bed | 185 x 134 x 39 |
| `print/Bodemplaat.stl` | plat, de lamellen staan onder 45° | 194 x 138 x 6 |
| `print/Dialkuip.stl` | rechtop | Ø56 x 60 |
| `print/Dialring.stl` | plat | Ø62 x 3 |

Alles past op een bed van 220 x 220 mm.

### Gereedschap

- **Bovenfrees:** met een frees Ø10 mm, voor een uitsparing van 196 x 140 mm. De hoeken worden dan R5.
- **Gatzaag Ø57 mm:** voor de draaiknop.
- **Soldeerbout:** voor de gaatjesprint.
- **Tap M5:** alleen als de lasersnijder de klauwen niet tapt.

## Maken en monteren

1. **Uitsparingen in het blad.**

   | Uitsparing | Gereedschap | Plaats |
   |---|---|---|
   | Afzuiging, 196 x 140 mm | frees Ø10 | midden van het blad |
   | Draaiknop, Ø57 mm | gatzaag | 250 mm rechts van het midden, 100 mm van de voorkant |

   De wanden van de romp en de sierring van de draaiknop dekken de rand van het honingraatblad volledig af.
2. **Magneten:** lijm de vier magneten in het bovenframe, vlak met de bovenkant en allemaal met dezelfde pool naar boven.
3. **Frame op de romp:** lijm het bovenframe op de bovenrand van de romp, rondom. Die naad moet luchtdicht zijn.
4. **Klauwen:** schuif elke klauw liggend door het venster onderaan de zijwand, tot het gat onder de schroef zit. Draai de M5 x 65 van bovenaf in en draai hem een paar slagen terug. De klauw ligt dan in de toren langs de wand.
5. **Elektronica:** bouw de gaatjesprint volgens `schema/Aansluitschema-afzuiging.pdf`. Schroef ze met 4 x M2,5 op de bussen in het elektronicavak. Druk de siliconeslang van de drukmeter (poort "-") op het tuitje in het plafond van het vak.
6. **Ventilator:** schroef de ventilator met 4 x M4 x 45 en moeren op de bodemplaat, met de spaken naar beneden. Leid de kabel door de tule in de tussenwand naar de print.
7. **Schakelaar:** soldeer of klem twee draden op de wipschakelaar en druk hem van buiten in het gat in de kom van de linkerzijwand, tot hij vastklikt. Eén draad gaat naar de + van de DC-bus, de andere naar de zekering op de print.
8. **Bodemplaat:** zet de DC-bus in de bodemplaat, onder het elektronicavak. De Grove-kabels en de voeding van de Dial gaan door de kabeldoorvoer ernaast. Schroef de plaat met 6 x M3 aan de romp. Om bij de elektronica te kunnen, schroef je de bodemplaat weer los.
9. **Inbouwen:** laat de module in de uitsparing zakken en draai de vier M5-schroeven rechtsom aan. Elke klauw zwaait naar buiten en trekt zich tegen de onderkant van het blad. Draai stevig aan.
10. **Filters en plaat:** knip de drie filters op 154 x 121 mm. Leg ze in de cassette, G4 bovenaan. Zet de cassette in het frame en leg de RVS-plaat erop, precies op de rand van het frame.
11. **Draaiknop:** leg de O-ring in de groef van de sierring en lijm de ring op de dialkuip. Steek de kabels door de kabeltule onderaan, zodat het potje dicht blijft. Steek de twee dialklauwen liggend door hun venster en draai de M3 x 40 van bovenaf in. Zet de kuip in het gat van Ø57 en draai beide schroeven rechtsom aan: de klauwen klemmen tegen de onderkant van het blad. Zet daarna de Dial erin. Dit werkt voor een blad van 22 tot 50 mm.
12. **Opstarten:** flash de firmware, zet de schakelaar aan de zijkant aan en houd het scherm 2 seconden vast om te ijken.

## Aansluitschema

Het aansluitschema staat in `schema/Aansluitschema-afzuiging.pdf`, in EPLAN-stijl met de codes van IEC 81346. De bladen zijn ook los beschikbaar als `schema/blad-1.svg` tot `schema/blad-6.svg`.

| Blad | Inhoud |
|---|---|
| 1 | titelblad en inhoud |
| 2 | voeding 12 V: -T1, -X1, -F1, -C1 |
| 3 | ventilator: aan/uit met -Q3/-Q2, snelheid met -Q1, -M1 |
| 4 | besturing -A1, 3,3V-regelaar -T2, drukmeter -B1 |
| 5 | klemmenplan |
| 6 | stuklijst elektronica |

Meet de draadkleuren van de Grove-kabels en de ventilator na voor het solderen.

## Firmware

```bash
python -m pip install platformio
```

```bash
cd voorbeelden/afzuiging/firmware
python -m platformio run -t upload
```

Sluit de Dial met USB-C aan op de computer.

## Bestanden

| Bestand | Wat |
|---|---|
| `Afzuiging.kcad` | assemblage van de afzuiging |
| `../bureau/Bureau.kcad` | het bureau met de afzuiging en de uitsparingen in het blad |
| `laser/`, `print/` | DXF's en STL's |
| `schema/` | aansluitschema (PDF en SVG) |
| `firmware/` | PlatformIO-project voor de M5Stack Dial |
| `maak-afzuiging.mjs`, `logo/*.py`, `schema/maak-schema.mjs` | generators; alle maten staan bovenaan in `maak-afzuiging.mjs` |

## Onderhoud en veiligheid

- **Filters:** leeg of vervang ze als de Dial "Filter vol" meldt. Ijk daarna opnieuw.
- **Koolmat:** vervang ze ook als de geur terugkomt, want de drukmeter ziet niet wanneer de kool verzadigd is.
- **Gebruik:** gebruik de afzuiging nooit zonder filters.
- **Netspanning:** er komt geen 230 V in het bureau, want de adapter steekt in het stopcontact.
