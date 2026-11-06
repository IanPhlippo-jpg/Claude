# Ingebouwde nagelstofafzuiging (Lush Beauty), versie 4.2

Een krachtige, compacte afzuiging voor in het bureaublad, met het LB-monogram in het RVS-rooster.
De module zakt van bovenaf in een gefreesde uitsparing en klemt zich vast met vier stalen klauwen, voor een blad van 10 tot 50 mm dik.
Een VIEWE-knop van 1,5" (rond AMOLED-scherm, ESP32-S3) zit in het blad, regelt de zuigkracht en meldt wanneer de filters vol zijn.
Ook de knop klemt zich vast met klauwen: er komt geen enkele schroef in het bureaublad. Van boven zie je alleen de knop zelf, de houder is niet breder.
De knop stuurt de module draadloos en krijgt alleen 5 V over een gewone USB-C-kabel, die in een sleuf onder het blad loopt.

![Rooster](laser/rooster-voorbeeld.png)

## Opbouw

| Van boven naar onder | Wat |
|---|---|
| RVS-plaat | RVS 430 (magnetisch), 206 x 150 mm, even groot als het frame; klikt op 4 verzonken magneten |
| Bovenframe | PETG, smalle omranding van 2,5 mm, op de romp gelijmd; de magneten en de koppen van de M5-schroeven zitten erin, onder de plaat |
| Filtercassette | bak met roosterbodem en een gelijmde rand; G4-voorfilter, M5-fijnstofmat en actieve koolmat; langs boven uitneembaar |
| Romp | ventilator Delta PFR1212UHE-SP00 direct onder de cassette; links het elektronicavak |
| Bodemplaat | één plaat over de hele onderkant: lamellen onder de ventilator sturen de lucht naar achteren, onder het elektronicavak de DC-bus en twee USB-C-bussen |

- **Diepte onder het blad:** de module hangt 51 mm onder een blad van 34 mm, met de schroefkoppen 54 mm. In versie 2 was dat 116 mm.
- **Van boven alleen staal:** de RVS-plaat bedekt het frame volledig. Van opzij zie je een randje PETG van 2,5 mm en de plaat van 1,5 mm, samen 4 mm boven het blad. De magneten zitten onzichtbaar onder de plaat.
- **Filters reinigen:** neem het rooster eraf, til de cassette aan de twee greepuitsparingen uit en klop de filters uit of vervang ze.
- **Draaiknop:** de VIEWE-knop staat op een houder die even breed is als de knop (Ø51,6). De houder zit in een gat van Ø44 en klemt zich vast met 2 stalen klauwen. Alleen de voet en de naaf van de knop zijn vastgeschroefd: draaien en indrukken doet de knop zelf.
- **Kabel naar de knop:** een USB-C-kabel (C-C, 0,5 m, liefst met haakse stekkers) tussen de USB-C-bus onderaan de module en die in het deksel van de knophouder. Hij loopt in een sleuf van 5 x 5 mm onder het blad. Verplaats je de knop, dan neem je gewoon een langere of kortere kabel: er wordt niets geknipt of gesoldeerd. Over de kabel gaat alleen 5 V; de knop en de module praten draadloos met elkaar (ESP-NOW). Valt de verbinding weg, dan blijft de ventilator op zijn laatste stand en meldt de knop "geen verbinding".
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
| USB-C-bus, breakout 16-polig (USB 2.0, 5,1 kΩ op CC) | 1 | op de adapterprint in de knophouder: 5 V van de module, of de computer om de knop te flashen |
| USB-C-bus, breakout 6-polig (VBUS, GND, CC1, CC2) | 1 | onderaan de module, levert 5 V aan de knop |
| USB-C-kabel C-C, 0,5 m, haakse stekkers | 1 | USB 2.0 volstaat; elke lengte past |
| ESP32-C3 SuperMini | 1 | in de module: stuurt de ventilator en leest de drukmeter |
| Schakelende regelaar 12 V naar 5 V, 1 A | 1 | Pololu D24V10F5 |
| Verschildrukmeter ±500 Pa, I2C | 1 | Sensirion SDP810-500PA |
| Netadapter 12 V DC, 5 A, plug 5,5 x 2,1 mm | 1 | Mean Well GST60A12-P1J |
| DC-inbouwbus 5,5 x 2,1 mm met moer | 1 | inbouwmodel, gat Ø8 |
| Wipschakelaar aan/uit, 1-polig, 21 x 15 mm | 1 | KCD1-101, inbouwgat 19 x 13 mm, 6 A |
| Vlakstekerhulzen 4,8 mm, geïsoleerd | 2 | draden op de schakelaar |
| P-MOSFET | 1 | Infineon IRF4905PbF (TO-220) |
| NPN-transistor | 2 | BC547B (TO-92) |
| Weerstanden 0,25 W | 9 | 2 x 1 kΩ, 3 x 10 kΩ, 2 x 4,7 kΩ, 2 x 56 kΩ |
| Elco 470 µF / 25 V | 1 | buffer voor de ventilator |
| Zekering 4 A traag 5 x 20 mm + printzekeringhouder | 1 | |
| Gaatjesprint 30 x 70 mm | 1 | gaten 2 mm in de hoeken |
| Printschroefklem steek 3,5 mm, 4-polig | 1 | ventilator |
| Montagedraad 0,25 mm² | 1 m | -A4, -X8 en de drukmeter op de print |
| Siliconeslang 3 x 5 mm | 0,5 m | drukmeter naar het messingbuisje |
| Messingbuisje Ø3 x 0,5 mm | 12 mm | meetpunt in het plafond van het vak, inlijmen |
| G4-voorfilter, mat 10 mm | rol | knippen op 153 x 120 mm |
| M5-fijnstofmat 15 mm | rol | knippen op 153 x 120 mm |
| Actieve koolmat 10 mm | rol | knippen op 153 x 120 mm |
| Neodymiummagneet Ø8 x 2 mm, N42 | 4 | inlijmen in het bovenframe, vlak met de bovenkant |
| Tweecomponentenlijm (epoxy) | 1 | voor de magneten |
| Tweecomponentenlijm voor kunststof | 1 | bovenframe op de romp, rand op de bak van de cassette, messingbuisje |
| Kabeltule Ø6 | 1 | doorvoer ventilatorkabel in de tussenwand |
| M5 x 65 verzonken (DIN 7991, A2) | 4 | klauwen van de module |
| M3 x 60 verzonken (DIN 7991, A2) | 2 | klauwen van de knophouder (de koppen liggen onder de voet van de knop) |
| M2,5 x 6 cilinderkop | 2 | knop in de houder (gaten in de naaf) |
| M2,5 x 8 verzonken (DIN 7991) | 2 | deksel van de knophouder |
| M3 x 16 verzonken (DIN 7991, A2) | 6 | bodemplaat; de kop ligt vlak in de plaat, draait zelf in PETG |
| M4 x 45 verzonken (DIN 7991, A2) + M4-moer (DIN 934) | 4 | ventilator op de bodemplaat; de kop ligt vlak in de plaat |
| M2,5 x 6 zelftappend | 4 | gaatjesprint op de bussen |
| M2 x 5 cilinderkop | 2 | USB-C-bus van de module tegen de voorwand |

### Laten lasersnijden

| Bestand | Materiaal | Aantal |
|---|---|---|
| `laser/rooster.dxf` | RVS 430, 1,5 mm, geborsteld (magnetisch), 206 x 150 mm | 1 |
| `laser/klauwen-4x-RVS304-4mm.dxf` | RVS 304, 4 mm; gat Ø4,2 laten tappen M5 | 4 (staan alle 4 in het bestand) |
| `laser/dialklauwen-2x-RVS304-3mm.dxf` | RVS 304, 3 mm; gat Ø2,5 laten tappen M3 (klauwen van de knophouder) | 2 |

Het rooster is één stuk, zonder losse eilanden, en geen steg of sleuf is smaller dan 1,5 mm. Boven de cassette is 78 cm² open.

### Printen (PETG, zonder support)

PETG is taaier dan PLA, kruipt minder onder de klemkracht van de schroeven, kan tot ongeveer 75 °C en kan tegen aceton (nagellakremover). ABS en ASA lossen op in aceton. De knophouder en het deksel in zwart, de rest in wit.

Instellingen voor een zo sterk mogelijk resultaat:

| Instelling | Waarde | Waarom |
|---|---|---|
| Laaghoogte | 0,2 mm | goede hechting tussen de lagen |
| Wanden | 5 (2 mm bij een spuitmond van 0,4) | de sterkte zit vooral in de wanden; schroefgaten en klauwkanalen worden zo massief |
| Boven- en onderlagen | 6 | stevige platen en luchtdichte vlakken |
| Vulling | 40 % gyroid | sterk in alle richtingen |
| Temperatuur | 240-245 °C, bed 80 °C | warmer = betere laaghechting |
| Koeling | 30-50 %, bij bruggen 100 % | weinig koeling voor sterkte, veel voor strakke bruggen |
| Snelheid | buitenwand 40 mm/s | nette en dichte wanden |

Droog PETG vooraf (4 uur op 65 °C) als de rol open heeft gelegen: vocht maakt het bros en draderig.

| Bestand | Stand op het bed | Maat (mm) |
|---|---|---|
| `print/Romp.stl` | rechtop | 194 x 138 x 79 |
| `print/Bovenframe.stl` | plat | 206 x 150 x 2,5 |
| `print/Filtercassette.stl` | rechtop, de roosterbodem op het bed | 158 x 125 x 37 |
| `print/Cassetterand.stl` | plat | 185 x 134 x 2,5 |
| `print/Bodemplaat.stl` | plat, de lamellen staan onder 45° | 194 x 138 x 6 |
| `print/Knophouder.stl` | ondersteboven, de plaat op het bed | Ø51,6 x 62 |
| `print/Knopdeksel.stl` | plat | Ø43 x 2 |

Alles past op een bed van 220 x 220 mm. Massief samen ongeveer 670 g; met de instellingen hierboven gaat er zo'n 500 g PETG in (romp 280 g, bodemplaat 110 g, cassette 70 g, de rest klein). Eén rol van 1 kg is genoeg.

Overhangen: alleen korte bruggen (de kom van de schakelaar, de vensters van de klauwen, het plafond van het elektronicavak van 32 mm en de vloer van de knophouder van 22 mm). Zet de brugkoeling op 100 %.

### Gereedschap

- **Bovenfrees:** met een frees Ø10 mm, voor een uitsparing van 196 x 140 mm. De hoeken worden dan R5.
- **Gatzaag Ø44 mm:** voor de knop.
- **Frees Ø5 mm:** voor de kabelsleuf onderaan het blad, 5 mm diep, langs een lat.
- **Soldeerbout:** voor de gaatjesprint.
- **Tap M5:** alleen als de lasersnijder de klauwen niet tapt.

## Maken en monteren

1. **Uitsparingen in het blad.**

   | Uitsparing | Gereedschap | Plaats |
   |---|---|---|
   | Afzuiging, 196 x 140 mm | frees Ø10 | midden van het blad |
   | Knop, Ø44 mm | gatzaag | 250 mm rechts van het midden, 100 mm van de voorkant |
   | Kabelsleuf 5 x 5 mm, onderaan | frees Ø5 | recht van de voorkant van de uitsparing (72 mm links van het midden) naar het knopgat, ca. 32 cm |

   De wanden van de romp en de buis van de knophouder dekken de rand van het honingraatblad volledig af.
2. **Magneten:** lijm de vier magneten in het bovenframe, vlak met de bovenkant en allemaal met dezelfde pool naar boven.
3. **Frame op de romp:** lijm het bovenframe op de bovenrand van de romp, rondom. Die naad moet luchtdicht zijn. Lijm ook de rand op de bak van de cassette, over de hele wandbovenkant, en het messingbuisje in de bus bovenop het plafond van het elektronicavak (8 mm steekt er onderaan uit). Laat de lijm een nacht uitharden.
4. **Klauwen:** schuif elke klauw liggend door het venster onderaan de zijwand, tot het gat onder de schroef zit. Draai de M5 x 65 van bovenaf door de lip van het bovenframe in en draai hem een paar slagen terug. De kop zit verzonken in het frame, onder de RVS-plaat, en drukt het frame over zijn hele vlak op het blad. De klauw ligt dan in de toren langs de wand.
5. **Elektronica:** bouw de gaatjesprint volgens `schema/Aansluitschema-afzuiging.pdf`. Schroef ze met 4 x M2,5 op de bussen in het elektronicavak. Schuif de ESP32-C3 van onderen in de twee rails tegen de linkerwand (USB-C naar beneden) en schroef de USB-C-bus met 2 x M2 x 5 tegen de voorwand (bus naar beneden). Soldeer hun draadjes op de print. Druk de siliconeslang van de drukmeter (poort "-") op het messingbuisje in het plafond van het vak.
6. **Ventilator:** schroef de ventilator met 4 x M4 x 45 en moeren op de bodemplaat, met de spaken naar beneden. Leid de kabel door de tule in de tussenwand naar de print.
7. **Schakelaar:** soldeer of klem twee draden op de wipschakelaar en druk hem van buiten in het gat in de kom van de linkerzijwand, tot hij vastklikt. Eén draad gaat naar de + van de DC-bus, de andere naar de zekering op de print.
8. **Bodemplaat:** zet de DC-bus in de bodemplaat, vooraan onder het elektronicavak. De twee USB-C-bussen vallen in hun openingen. Schroef de plaat met 6 x M3 aan de romp. Om bij de elektronica te kunnen, schroef je de bodemplaat weer los.
9. **Inbouwen:** laat de module in de uitsparing zakken en draai de vier M5-schroeven rechtsom aan. Elke klauw zwaait naar buiten en trekt zich tegen de onderkant van het blad. Draai stevig aan.
10. **Filters en plaat:** knip de drie filters op 153 x 120 mm. Leg ze in de cassette, G4 bovenaan. Zet de cassette in het frame en leg de RVS-plaat erop, precies op de rand van het frame.
11. **Knop:** steek de twee knopklauwen van onderen in hun kanaal en draai de M3 x 60 van bovenaf in, een paar slagen. Zet de houder in het gat van Ø44 en draai beide schroeven rechtsom aan: de klauwen zwaaien uit en klemmen tegen de onderkant van het blad (10 tot 50 mm). Steek de FPC van de knop door de sleuf in de kom, zet de knop in de kom (de pennen in hun gaatjes) en schroef hem van onderen vast met 2 x M2,5 x 6. Steek de FPC in de adapterprint en schuif de print in de groeven. Schroef het deksel met 2 x M2,5 x 8 vast: de USB-C-bus valt in zijn opening.
12. **Kabel:** druk de USB-C-kabel in de sleuf onder het blad en steek hem in de bus onderaan de module en in die in het deksel van de knop.
13. **Opstarten:** flash de firmware (zie hieronder), zet de schakelaar aan de zijkant aan en houd de knop 5 seconden ingedrukt om te ijken.

## Aansluitschema

Het aansluitschema staat in `schema/Aansluitschema-afzuiging.pdf`, in EPLAN-stijl met de codes van IEC 81346. De bladen zijn ook los beschikbaar als `schema/blad-1.svg` tot `schema/blad-6.svg`.

| Blad | Inhoud |
|---|---|
| 1 | titelblad en inhoud |
| 2 | voeding: -T1, -X1, -S1, -F1, -C1 en de 5V-regelaar -T3 |
| 3 | ventilator: aan/uit met -Q3/-Q2, snelheid met -Q1, -M1 |
| 4 | besturing -A4 (ESP32-C3), drukmeter -B1, USB-C-koppeling -X8 / -W1 / -X7 naar de knop -A1 |
| 5 | klemmenplan |
| 6 | stuklijst elektronica |

Meet de draadkleuren van de ventilator na voor het solderen.

## Firmware

```bash
python -m pip install platformio
```

Er zijn twee programma's in één project: `knop` (scherm en bediening) en `module` (ventilator en drukmeter). Ze praten draadloos met elkaar.

Knop: trek de USB-C-kabel uit de module en steek dat uiteinde in de computer.

```bash
cd voorbeelden/afzuiging/firmware
python -m platformio run -e knop -t upload
```

Module: steek een USB-C-kabel in de USB-C van de ESP32-C3, onderaan de module.

```bash
python -m platformio run -e module -t upload
```

De knop gebruikt GFX Library for Arduino (CO5300-driver) en U8g2-lettertypes; het protocol staat in `firmware/include/protocol.h`.

## Bestanden

| Bestand | Wat |
|---|---|
| `Afzuiging.kcad` | assemblage van de afzuiging |
| `../bureau/Bureau.kcad` | het bureau met de afzuiging en de uitsparingen in het blad |
| `laser/`, `print/` | DXF's en STL's |
| `schema/` | aansluitschema (PDF en SVG) |
| `firmware/` | PlatformIO-project voor de knop en de module |
| `maak-afzuiging.mjs`, `logo/*.py`, `schema/maak-schema.mjs` | generators; alle maten staan bovenaan in `maak-afzuiging.mjs` |

## Onderhoud en veiligheid

- **Filters:** leeg of vervang ze als de knop "Filter vol" meldt. Ijk daarna opnieuw.
- **Koolmat:** vervang ze ook als de geur terugkomt, want de drukmeter ziet niet wanneer de kool verzadigd is.
- **Gebruik:** gebruik de afzuiging nooit zonder filters.
- **Netspanning:** er komt geen 230 V in het bureau, want de adapter steekt in het stopcontact.
