# Ingebouwde nagelstofafzuiging (Lush Beauty), versie 5

Een krachtige, stille afzuiging voor in het bureaublad, met het LB-monogram in het RVS-rooster.
De module zakt van bovenaf in een gefreesde uitsparing en klemt zich vast met vier stalen klauwen, voor een blad van 10 tot 50 mm dik.
Een radiale ventilator met achterwaarts gebogen schoepen zuigt door drie filterlagen en houdt zijn kracht ook als de filters voller worden.
Een VIEWE-knop van 1,5" (rond AMOLED-scherm) zit in het blad, regelt de zuigkracht en meldt wanneer de filters vol zijn.
De netadapter en de elektronica zitten in een aparte voedingsbox onder het blad; er komt geen enkele schroef door het bureaublad.

![Rooster](laser/rooster-voorbeeld.png)

## Opbouw

| Deel | Wat |
|---|---|
| RVS-plaat | RVS 430 (magnetisch), 222 x 222 mm, even groot als het frame; klikt op 4 verzonken magneten |
| Bovenframe | PETG, smalle omranding van 2,5 mm, op de romp gelijmd; de magneten en de koppen van de M5-schroeven zitten erin, onder de plaat |
| Filtercassette | bak met roosterbodem en een gelijmde rand; G4-voorfilter, M5-fijnstofmat en actieve koolmat van 170 x 190 mm; langs boven uitneembaar |
| Romp | vierkant 210 x 210 mm; de klauwen zitten in de vier hoeken |
| Instroomplaat | met een trechter boven het oog van de ventilator; het meetpunt van de drukmeter zit erin |
| Ventilator | San Ace C175 (Ø175 mm, 24 V, 56 W), staat op de bodemplaat |
| Bodemplaat | één plaat over de hele onderkant; schuine lamellen sturen de lucht naar achteren |
| Voedingsbox | onder het blad, 15 mm ingefreesd: netadapter, schakelaar, ESP32-C3, drukmeter en de USB-C voor de knop |
| Knop | VIEWE 1,5" op een houder die niet breder is dan de knop, in een gat van Ø44 |

- **Diepte onder het blad:** de module hangt 86 mm onder een blad van 34 mm, de voedingsbox 36 mm.
- **Van boven alleen staal:** de RVS-plaat bedekt het frame volledig. Van opzij zie je een randje PETG van 2,5 mm en de plaat van 1,5 mm, samen 4 mm boven het blad.
- **Filters reinigen:** neem het rooster eraf, til de cassette aan de twee greepuitsparingen uit en klop de filters uit of vervang ze.
- **Kabels:** tussen de box en de afzuiging lopen een M8-kabel (de ventilator) en een siliconeslangetje (de drukmeting). Tussen de box en de knop loopt een USB-C-kabel. Alle drie liggen ze in gefreesde sleuven onderaan het blad en hebben ze aan beide kanten een koppeling: een andere lengte is gewoon een andere kabel.
- **Draadloos:** de knop en de ESP32-C3 in de box praten met elkaar via ESP-NOW. Valt de verbinding weg, dan blijft de ventilator op zijn laatste stand en meldt de knop "geen verbinding".
- **Aan/uit:** een wipschakelaar zit verzonken in een kom in de achterkant van de box. De wip ligt 1 mm binnen de wand, zodat je hem niet per ongeluk omzet.
- **Veilig:** 230 V zit alleen in de gekeurde netadapter, die je met een gewoon netsnoer (C13) op het stopcontact aansluit. Er is geen eigen bedrading op 230 V.
- **Luchtdicht:** lucht kan alleen langs het rooster binnen en langs de bodemplaat buiten. De cassetterand rust rondom op een richel, zodat er geen lucht langs de filters glipt. Een test bemonstert het geheel per mm, met een tegenproef.
- **Stevig:** de kop van elke M5-schroef zit in het bovenframe en drukt het hele frame op het blad. De klauwen zijn van RVS van 4 mm. Alle schroefkoppen zitten in een conische zitting.

## Zuigkracht en bediening

| Ventilator | Vrij uitblazend | Max. statische druk | Geluid (vol) | Vermogen |
|---|---|---|---|---|
| San Ace C175 9TG24P0S01 | 696 m³/h | 609 Pa | 69 dB(A) | 56 W |

- **Met rooster en filters:** ongeveer 500 m³/h bij 200 Pa op volle kracht. Op de helft van zijn toerental haalt hij nog ongeveer 170 m³/h. Dat is wat de vorige ventilator op vol haalde, maar nu rond 54 dB in plaats van 65 dB (schatting).
- **Draaien:** de zuigkracht gaat van 20 tot 100 % in stappen van 5 %. Voor dagelijks gebruik is 40 tot 60 % genoeg.
- **Drukken:** aan of uit.
- **1 seconde indrukken:** boost, 2 minuten op 100 %.
- **5 seconden indrukken:** ijken op schone filters. Doe dat na elke filterwissel.
- **Filtermelding:** de drukmeter vergelijkt de weerstand van de filters met die van schone filters. Bij het dubbele wordt de ring oranje met "Filter vol – filters uitkloppen".
- **Storing:** de ring wordt rood bij "geen luchtstroom" (slangetje of filters) of bij "ventilator draait niet" (het toerental blijft weg; kijk de M8-kabel na).

## Bestellijst

### Kopen

| Onderdeel | Aantal | Type of bestelnummer | Prijs per stuk | Totaal |
|---|---|---|--:|--:|
| Radiale ventilator Ø175, 24 V, PWM, tacho | 1 | San Ace C175 9TG24P0S01 (Sanyo Denki), of 9TG24P0G01 (verschil eerst nakijken) | € 160,00 | € 160,00 |
| Netadapter 24 V, 3,75 A, C14-inlaat | 1 | Mean Well GST90A24-P1M | € 33,00 | € 33,00 |
| Netsnoer C13 naar stopcontact (randaarde) | 1 | gewoon pc-netsnoer | € 5,00 | € 5,00 |
| Knop met rond AMOLED-scherm 1,5", ESP32-S3 | 1 | VIEWE UEDX46460015-MD50E, variant 1.5-Black-Knob (AliExpress, VIEWE Store) | € 34,00 | € 34,00 |
| Adapterprint FPC 10-polig 0,5 mm naar 2,54 mm | 1 | FPC/FFC-breakout 10P, past in 23 x 47 mm | € 2,00 | € 2,00 |
| USB-C-bus, breakout 16-polig (USB 2.0, 5,1 kΩ op CC), ca. 14 x 10,6 mm | 1 | in de knophouder op 2 palen, de bus opzij door de achterwand (kant van de sleuf): 5 V van de box, of de computer om de knop te flashen | € 1,50 | € 1,50 |
| USB-C-bus, breakout 6-polig (VBUS, GND, CC1, CC2) | 1 | in de box, levert 5 V aan de knop | € 1,00 | € 1,00 |
| USB-C-kabel C-C, 1 m, haakse stekkers | 1 | USB 2.0 volstaat | € 9,00 | € 9,00 |
| M8-inbouwbus 4-polig, A-codering, achterwandmontage (PG7) | 1 | in de achterwand van de afzuiging | € 13,00 | € 13,00 |
| M8-inbouwstekker 4-polig, A-codering, achterwandmontage (PG7) | 1 | in de voorkant van de box | € 13,00 | € 13,00 |
| M8-kabel 4-polig stekker-bus, 0,5 m | 1 | verlengkabel; elke lengte past | € 12,00 | € 12,00 |
| ESP32-C3 SuperMini | 1 | in de box: stuurt de ventilator en leest de drukmeter | € 7,00 | € 7,00 |
| Schakelende regelaar 24 V naar 5 V, 1 A | 1 | Pololu D24V10F5 | € 10,50 | € 10,50 |
| Verschildrukmeter ±500 Pa, I2C | 1 | Sensirion SDP810-500PA | € 30,00 | € 30,00 |
| Wipschakelaar aan/uit, 1-polig, 21 x 15 mm | 1 | KCD1-101, inbouwgat 19 x 13 mm, 6 A | € 1,00 | € 1,00 |
| Vlakstekerhulzen 4,8 mm, geïsoleerd | 2 | draden op de schakelaar | € 0,15 | € 0,30 |
| NPN-transistor | 1 | BC547B (TO-92) | € 0,20 | € 0,20 |
| Weerstanden 0,25 W | 7 | 1 x 1 kΩ, 2 x 10 kΩ, 2 x 4,7 kΩ, 2 x 56 kΩ | € 0,10 | € 0,70 |
| Elco 470 µF / 35 V | 1 | buffer voor de ventilator | € 0,50 | € 0,50 |
| Zekering 3,15 A traag 5 x 20 mm + printzekeringhouder | 1 |  | € 2,00 | € 2,00 |
| Gaatjesprint 40 x 50 mm | 1 | gaten 2 mm in de hoeken | € 1,00 | € 1,00 |
| Printschroefklem 2-polig, steek 5 mm | 1 | de DC-kabel van de adapter (ingekort) | € 0,50 | € 0,50 |
| Montagedraad 0,25 mm² en 0,75 mm² | 1 m |  | € 3,00 | € 3,00 |
| Siliconeslang 3 x 5 mm | 1 m | drukmeting: van de afzuiging naar de box, en binnen de afzuiging | € 3,00 | € 3,00 |
| Messingbuisje Ø3 x 0,5 mm | 40 mm | 3 stukjes van 12 mm: meetpunt in de instroomplaat en doorvoer in de afzuiging en de box | € 3,00 | € 3,00 |
| G4-voorfilter, mat 10 mm | rol | knippen op 170 x 190 mm | € 12,00 | € 12,00 |
| M5-fijnstofmat 15 mm | rol | knippen op 170 x 190 mm | € 15,00 | € 15,00 |
| Actieve koolmat 10 mm | rol | knippen op 170 x 190 mm | € 15,00 | € 15,00 |
| Neodymiummagneet Ø8 x 2 mm, N42 | 4 | inlijmen in het bovenframe, vlak met de bovenkant | € 0,50 | € 2,00 |
| Tweecomponentenlijm voor kunststof | 1 | magneten, bovenframe op de romp, rand op de cassette, instroomplaat, messingbuisjes | € 9,00 | € 9,00 |
| Plug voor holle deuren, M4 | 4 | de voedingsbox onder het blad | € 0,50 | € 2,00 |
| M5 x 65 verzonken (DIN 7991, A2) | 4 | klauwen van de module | € 0,60 | € 2,40 |
| M3 x 60 verzonken (DIN 7991, A2) | 2 | klauwen van de knophouder (de koppen liggen onder de voet van de knop) | € 0,35 | € 0,70 |
| M2,5 x 6 cilinderkop | 2 | knop in de houder (gaten in de naaf) | € 0,10 | € 0,20 |
| M2,5 x 8 verzonken (DIN 7991) | 2 | deksel van de knophouder | € 0,10 | € 0,20 |
| M3 x 16 verzonken (DIN 7991, A2) | 8 | bodemplaat; de kop ligt vlak in de plaat, draait zelf in PETG | € 0,10 | € 0,80 |
| M4 x 10 verzonken (DIN 7991, A2) | 4 | ventilator op de bodemplaat (4 tot 6 mm in de motor) | € 0,12 | € 0,48 |
| M2,5 x 6 zelftappend | 4 | print in de box | € 0,10 | € 0,40 |
| M2 x 5 zelftappend | 4 | USB-C-bus in de box en USB-C-printje in de knophouder | € 0,10 | € 0,40 |
| **Totaal kopen** | | | | **€ 406,78** |

### Laten lasersnijden

| Bestand | Materiaal | Aantal | Prijs per stuk | Totaal |
|---|---|---|--:|--:|
| `laser/rooster.dxf` | RVS 430, 1,5 mm, geborsteld (magnetisch), 222 x 222 mm | 1 | € 45,00 | € 45,00 |
| `laser/klauwen-4x-RVS304-4mm.dxf` | RVS 304, 4 mm; gat Ø4,2 laten tappen M5 | 4 (staan alle 4 in het bestand) | € 6,00 | € 24,00 |
| `laser/dialklauwen-2x-RVS304-3mm.dxf` | RVS 304, 3 mm; gat Ø2,5 laten tappen M3 (klauwen van de knophouder) | 2 | € 5,00 | € 10,00 |
| opstart en verzending | | 1 | € 10,00 | € 10,00 |
| **Totaal lasersnijden** | | | | **€ 89,00** |

Het rooster is één stuk, zonder losse eilanden, en geen steg of sleuf is smaller dan 1,5 mm. Boven de cassette is 141 cm² open.

### Printen (Elegoo Centauri Carbon, PETG, zonder support)

PETG is taaier dan PLA, kruipt minder onder de klemkracht van de schroeven, kan tot ongeveer 75 °C en kan tegen aceton (nagellakremover). ABS en ASA lossen op in aceton. Met de geharde spuitmond van de Centauri Carbon kan ook PETG-CF: stijver en het kruipt nog minder, goed voor de romp en het bovenframe. De knophouder en het deksel in zwart, de rest in wit.

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
| Kap | open of op een kier | PETG heeft geen warme kamer nodig; zo blijft de koeling goed |

Droog PETG vooraf (4 uur op 65 °C) als de rol open heeft gelegen: vocht maakt het bros en draderig.

| Bestand | Stand op het bed | Maat (mm) |
|---|---|---|
| `print/Romp.stl` | rechtop | 210 x 210 x 114 |
| `print/Bovenframe.stl` | plat | 222 x 222 x 2,5 |
| `print/Filtercassette.stl` | rechtop, de roosterbodem op het bed | 174 x 194 x 37 |
| `print/Cassetterand.stl` | plat | 200 x 200 x 2,5 |
| `print/Instroomplaat.stl` | plat, de trechter naar boven | 202 x 202 x 3 |
| `print/Bodemplaat.stl` | plat, de lamellen staan onder 45° | 210 x 210 x 6 |
| `print/Voedingsbox.stl` | rechtop, de bodem op het bed | 218 x 108 x 50 |
| `print/Knophouder.stl` | ondersteboven, de plaat op het bed | Ø51,6 x 62 |
| `print/Knopdeksel.stl` | plat | Ø43 x 2 |

Alles past op het bed van 256 x 256 mm van de Centauri Carbon, en zelfs op 225 x 225. Reken met ongeveer 1 kg PETG (de romp alleen al ongeveer 420 g): neem 1,5 kg wit en wat zwart.

Overhangen: alleen korte bruggen (de vensters van de klauwen, de kom van de schakelaar, de vloer van de knophouder van 22 mm). De richels voor de instroomplaat en de rand van de box zijn getrapt onder 45°. Zet de brugkoeling op 100 %.

### Gereedschap

- **Bovenfrees met frees Ø10 mm:** voor de uitsparing van 212 x 212 mm (hoeken R6) en de uitsparing van 202 x 92 x 15 mm onderaan voor de box (hoeken R5).
- **Gatzaag Ø44 mm:** voor de knop.
- **Frees Ø5 mm:** voor de kabelsleuven onderaan het blad, langs een lat.
- **Boor voor de pluggen voor holle deuren:** de maat staat op de verpakking.
- **Soldeerbout:** voor de gaatjesprint en de M8-bus.
- **Tap M5:** alleen als de lasersnijder de klauwen niet tapt.

### Wat het kost

Prijzen per stuk incl. 21 % btw, zonder verzendkosten: een indicatie van november 2026 bij de winkels in `tekeningen/prijslijst.csv`. Losse schroeven koop je meestal per zakje; de prijs per stuk is dan het zakje gedeeld door het aantal.

| Groep | Totaal |
|---|--:|
| Kopen (elektronica, ventilator, filters, schroeven) | € 406,78 |
| Laten lasersnijden (rooster en 6 klauwen) | € 89,00 |
| Filament PETG: 2 rollen wit en 1 rol zwart | € 60,00 |
| **Eindtotaal** | **€ 555,78** |

Het filament dat echt opgaat (ca. 1,2 kg) kost ongeveer € 24,00. Het duurste onderdeel is de ventilator (ca. € 160, bijna 30 % van het totaal), daarna het rooster (€ 45), de knop (€ 34), de netadapter (€ 33) en de drukmeter (€ 30). Een set nieuwe filters (G4 + M5 + kool, 170 x 190 mm) kost minder dan € 1,50.

## Maken en monteren

1. **Uitsparingen in het blad.**

   | Uitsparing | Gereedschap | Plaats |
   |---|---|---|
   | Afzuiging, 212 x 212 mm | frees Ø10 | midden van het blad |
   | Knop, Ø44 mm | gatzaag | 250 mm rechts van het midden, 100 mm van de voorkant |
   | Voedingsbox, 202 x 92 x 15 mm, onderaan | frees Ø10 | achter de afzuiging, midden op 195 mm achter het midden |
   | Sleuf naar de afzuiging, 29 x 7 mm, onderaan | frees Ø10 | van de box recht naar de achterkant van de uitsparing, 53 tot 82 mm links van het midden |
   | Sleuf naar de knop, 5 x 5 mm, onderaan | frees Ø5 | van de rechterkant van de box schuin naar het knopgat, rechts langs de afzuiging |

   Druk de freesmallen in `schema/` (één PDF per doos: `Freesmal-afzuiging`, `-knop` en `-voedingsbox`) af op 100 % en meet de controlemaat van 100 mm na. De mal voor het knopgat legt je in de hoek van de uitsparing, die voor de onderkant tegen de achterrand ervan.

   LAGKAPTEN is vanbinnen een honingraat: de uitsparing voor de box geeft geen houvast in de zijkanten, de rand van de box drukt op de onderhuid.
2. **Magneten:** lijm de vier magneten in het bovenframe, vlak met de bovenkant en allemaal met dezelfde pool naar boven.
3. **Lijmen:** lijm het bovenframe op de bovenrand van de romp, rondom (luchtdicht). Lijm de rand op de bak van de cassette, over de hele wandbovenkant. Lijm een messingbuisje in de instroomplaat (meetpunt) en een in de achterwand (doorvoer). Laat de lijm een nacht uitharden.
4. **Klauwen:** schuif elke klauw liggend door het venster onderaan de zijwand, tot het gat onder de schroef zit. Draai de M5 x 65 van bovenaf door de lip van het bovenframe in en draai hem een paar slagen terug.
5. **Ventilator:** soldeer de vier draden van de ventilator op de M8-bus (rood 1, geel 2, zwart 3, bruin 4) en zet de bus met zijn moer in de achterwand. Schroef de ventilator met 4 x M4 x 10 van onderen op de bodemplaat.
6. **Instroomplaat:** schuif een stukje siliconeslang van het messingbuisje in de instroomplaat naar dat in de achterwand. Leg de plaat op de getrapte richel en lijm ze rondom.
7. **Bodemplaat:** schroef de plaat met de ventilator met 8 x M3 aan de romp.
8. **Inbouwen:** laat de module in de uitsparing zakken en draai de vier M5-schroeven rechtsom aan. Elke klauw zwaait naar buiten en trekt zich tegen de onderkant van het blad.
9. **Filters en plaat:** knip de drie filters op 170 x 190 mm. Leg ze in de cassette, G4 bovenaan. Zet de cassette in het frame en leg de RVS-plaat erop.
10. **Voedingsbox:** bouw de print volgens `schema/Aansluitschema-afzuiging.pdf` en schroef ze op de bussen. Zet de netadapter op de bodem tegen de aanslagen. Kort de DC-kabel van de adapter in en klem hem op -X1. Zet de schakelaar, de M8-stekker, het messingbuisje en de USB-C-bus in de wanden. Duw de box in de uitsparing en zet de rand vast met 4 pluggen voor holle deuren.
11. **Knop:** steek de twee knopklauwen van onderen in hun kanaal en draai de M3 x 60 van bovenaf in. Zet de houder in het gat van Ø44 en draai beide schroeven aan. Steek de FPC door de sleuf in de kom, zet de knop in de kom en schroef hem van onderen vast met 2 x M2,5 x 6. Soldeer 4 draden (VBUS, GND, D+, D-) van de adapterprint naar het USB-C-printje. Steek de FPC in de adapterprint en schuif de print in de groeven. Schroef het USB-C-printje met 2 x M2 x 5 onder de palen: de bus steekt opzij door de achterwand, naar de sleuf. Schroef het deksel vast (het deksel is dicht).
    De USB-C zit 18 tot 26 mm onder het bovenvlak van een blad van 34 mm: tot een blad van 48 mm past de stekker onder het blad.
12. **Kabels:** leg de M8-kabel en het slangetje in de sleuf tussen de box en de afzuiging, de USB-C-kabel in de sleuf naar de knop, en steek ze in.
13. **Opstarten:** steek het netsnoer in de box en in het stopcontact, flash de firmware (zie hieronder), zet de schakelaar aan en houd de knop 5 seconden ingedrukt om te ijken.

## Aansluitschema

Het aansluitschema staat in `schema/Aansluitschema-afzuiging.pdf`, in EPLAN-stijl met de codes van IEC 81346. De bladen zijn ook los beschikbaar als `schema/blad-1.svg` tot `schema/blad-6.svg`.

| Blad | Inhoud |
|---|---|
| 1 | titelblad en inhoud |
| 2 | voeding 24 V: -T1, -X1, -S1, -F1, -C1 en de 5V-regelaar -T3 |
| 3 | ventilator: M8-kabel -W2, PWM met -Q1 (0 % = stil), tacho naar -A4 |
| 4 | besturing -A4 (ESP32-C3), drukmeter -B1, USB-C-koppeling -X8 / -W1 / -X7 naar de knop -A1 |
| 5 | klemmenplan |
| 6 | stuklijst elektronica |

Meet de draadkleuren van de ventilator na voor het solderen (datasheet van San Ace).

## Firmware

```bash
python -m pip install platformio
```

Er zijn twee programma's in één project: `knop` (scherm en bediening) en `module` (ventilator en drukmeter, in de box). Ze praten draadloos met elkaar.

Knop: trek de USB-C-kabel uit de box en steek dat uiteinde in de computer.

```bash
cd voorbeelden/afzuiging/firmware
python -m platformio run -e knop -t upload
```

Box: steek een USB-C-kabel in de USB-C van de ESP32-C3, aan de rechterkant van de box.

```bash
python -m platformio run -e module -t upload
```

De knop gebruikt GFX Library for Arduino (CO5300-driver) en U8g2-lettertypes; het protocol staat in `firmware/include/protocol.h`.

## Bestanden

| Bestand | Wat |
|---|---|
| `Afzuiging.kcad` | assemblage van de afzuiging, de voedingsbox en de knop |
| `../bureau/Bureau.kcad` | het bureau met alles en de uitsparingen en sleuven in het blad |
| `laser/`, `print/` | DXF's en STL's |
| `schema/` | aansluitschema (PDF en SVG) en de freesmallen op ware grootte, per doos een PDF: `Freesmal-afzuiging-1op1-A4.pdf` (uitsparing, 2 bladen), `Freesmal-knop-1op1-A4.pdf` (knopgat) en `Freesmal-voedingsbox-1op1-A4.pdf` (onderkant: box en sleuven) |
| `tekeningen/Werktekeningen-afzuiging.pdf` | werktekeningen A3 (ISO E): samenstelling met stuklijst (AFZ-00), doorsnede, alle zelfgemaakte delen (AFZ-01 tot AFZ-12) en de bewerkingen in het blad (AFZ-20); losse SVG's, `stuklijst.csv` en `prijslijst.csv` (prijs per stuk, totaal per regel en eindtotaal) ernaast |
| `tekeningen/Bouwschema-afzuiging.pdf` | bouwschema A4 in 13 stappen, met beelden uit Phlippo CAD |
| `firmware/` | PlatformIO-project voor de knop en de box |
| `maak-afzuiging.mjs`, `logo/*.py`, `schema/maak-schema.mjs` | generators; alle maten staan bovenaan in `maak-afzuiging.mjs` |

## Onderhoud en veiligheid

- **Filters:** leeg of vervang ze als de knop "Filter vol" meldt. Ijk daarna opnieuw.
- **Koolmat:** vervang ze ook als de geur terugkomt, want de drukmeter ziet niet wanneer de kool verzadigd is.
- **Gebruik:** gebruik de afzuiging nooit zonder filters.
- **Netspanning:** 230 V zit alleen in de gekeurde netadapter in de box. Trek het netsnoer uit voor je de box opent.
