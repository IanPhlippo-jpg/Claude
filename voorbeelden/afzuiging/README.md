# Ingebouwde nagelstofafzuiging (Lush Beauty), versie 6.1 (2026-11-07)

Alle uitvoer (KCAD, STL, tekeningen, bouwschema, schema, freesmallen, prijslijst) komt uit dezelfde generator en draagt dit
revisienummer (`revisie.mjs`). De berekeningen staan in `docs/Berekeningen.md`, het meet- en vrijgaveplan in
`docs/Vrijgave-en-meetplan.md`.

Een krachtige, stille afzuiging voor in het bureaublad, met het LB-monogram in het RVS-rooster.
De module zakt van bovenaf in een gefreesde uitsparing en klemt zich vast met vier geprinte klauwen (met een M5-moer erin), voor een blad van 10 tot 50 mm dik.
Een radiale ventilator met achterwaarts gebogen schoepen zuigt door één kant-en-klare standaardfiltermat (Rittal SK 3171.100) en houdt zijn kracht ook als de mat voller wordt. De mat beschermt de ventilator tegen vijlsel; ze is geen luchtreiniger: het fijnste stof komt onder het blad terug in de salon, zorg dus voor ventilatie.
Een VIEWE-knop van 1,5" (rond AMOLED-scherm) zit in het blad, regelt de zuigkracht en meldt wanneer het filter vol is.
De netadapter en de elektronica zitten in een aparte voedingsbox die onderaan in het blad is ingefreesd; er komt geen enkele schroef door het bovenvlak van het bureau.

![Rooster](laser/rooster-voorbeeld.png)

## Opbouw

| Deel | Wat |
|---|---|
| RVS-plaat | RVS 430 (magnetisch), 222 x 222 mm, even groot als het frame; klikt op 4 verzonken magneten |
| Bovenframe | PETG, smalle omranding van 2,5 mm, op de romp gelijmd; de magneten en de koppen van de M5-schroeven zitten erin, onder de plaat |
| Filtercassette | bak met roosterbodem en een gelijmde rand; één standaardfiltermat Rittal SK 3171.100 van 173 x 173 x 17 mm (niets te knippen), zoals in de meeste nagelafzuigingen; langs boven uitneembaar |
| Romp | vierkant 210 x 210 mm; de klauwen zitten in de vier hoeken |
| Instroomplaat | met een trechter boven het oog van de ventilator; het meetpunt van de drukmeter zit erin |
| Ventilator | San Ace C175 (Ø175 mm, 24 V, 56 W), staat op de bodemplaat |
| Bodemplaat | één plaat over de hele onderkant; schuine lamellen sturen de lucht naar achteren |
| Voedingsbox | bak van 210 x 100 x 50, de bovenste 14 mm in een uitsparing onderaan het blad; een vlakke rand op de onderkant van het blad met 4 x M4 verzonken in pluggen voor holle deuren; een los deksel bovenin (4 x M3); ventilatie onderaan en in de achterwand; netadapter, ESP32-C3, drukmeter, de USB-C voor de knop en de aan/uit-schakelaar in de voorwand |
| Knop | VIEWE 1,5" op een houder die niet breder is dan de knop, in een gat van Ø44 |

- **Diepte onder het blad:** de module hangt 68 mm onder een blad van 34 mm, de voedingsbox 36 mm.
- **Van boven alleen staal:** de RVS-plaat bedekt het frame volledig. Van opzij zie je een randje PETG van 2,5 mm en de plaat van 1,5 mm, samen 4 mm boven het blad.
- **Filter vervangen:** neem het rooster eraf, til de cassette aan de twee greepuitsparingen uit en vervang het filter: met handschoenen en een FFP2-masker, het oude filter meteen in een zak. Niet uitkloppen of uitblazen.
- **Kabels:** tussen de box en de afzuiging lopen een M8-kabel (de ventilator) en een siliconeslangetje (de drukmeting). Tussen de box en de knop loopt een USB-C-kabel. Alle drie liggen ze in gefreesde sleuven onderaan het blad en hebben ze aan beide kanten een koppeling: een andere lengte is gewoon een andere kabel.
- **Draadloos:** de knop en de ESP32-C3 in de box praten met elkaar via ESP-NOW. Valt de verbinding weg, dan blijft de ventilator op zijn laatste stand en meldt de knop "geen verbinding".
- **Aan/uit:** een wipschakelaar zit verzonken in een kom in de voorwand van de box. De wip ligt 1 mm binnen de wand, zodat je hem niet per ongeluk omzet.
- **Veilig:** 230 V zit alleen in de gekeurde netadapter, die je met een gewoon netsnoer (C13) op het stopcontact aansluit. Er is geen eigen bedrading op 230 V.
- **Luchtdicht:** lucht kan alleen langs het rooster binnen en langs de bodemplaat buiten. De cassetterand rust rondom op een richel, zodat er geen lucht langs de filters glipt. Een test bemonstert het geheel per mm, met een tegenproef.
- **Stevig:** de kop van elke M5-schroef zit in het bovenframe en drukt het hele frame op het blad. De klauwen zijn geprint in PETG (6 mm, 100 % vulling) met een ingeperste M5-moer. Alle schroeven zijn verzonken en zitten in een conische zitting, behalve die van de printplaten.

## Zuigkracht en bediening

| Ventilator | Vrij uitblazend | Max. statische druk | Geluid (vol) | Vermogen |
|---|---|---|---|---|
| San Ace C175 9TG24P0S01 | 696 m³/h | 609 Pa | 69 dB(A) | 56 W |

- **Met rooster en filter:** niet gemeten. De cijfers in de tabel zijn de grenzen van de ventilator (vrij uitblazend en dichtgedrukt), geen werkpunt. Debiet, vangst en geluid worden gemeten volgens `docs/Vrijgave-en-meetplan.md`.
- **Draaien:** de zuigkracht gaat van 20 tot 80 % in stappen van 5 % (100 % alleen als boost: dan blijft de adapter in de box koel genoeg, zie docs/Berekeningen.md). De ventilator start zacht (50 % per seconde). De minimale stand voor dagelijks gebruik volgt uit de vangstmeting (poort L2 in het meetplan).
- **Drukken:** aan of uit. Na een stroomonderbreking staat alles UIT.
- **1 seconde indrukken:** boost, 2 minuten op 100 % (de box telt de tijd, ook zonder knop).
- **5 tot 10 seconden indrukken:** ijken op een schoon filter, bij het loslaten. Doe dat na elke filterwissel. Lukt het niet, dan meldt de knop "ijken mislukt" en blijft de vorige ijking.
- **10 seconden indrukken:** opnieuw koppelen met de box; zet daarna de box uit en aan (koppelvenster 60 s).
- **Filtermelding:** de drukmeter vergelijkt de weerstand van het filter met die van een schoon filter. Bij het dubbele wordt de ring oranje met "filter vervangen". Is de meting ouder dan 1 s, dan toont de knop geen drukwaarde ("meting niet actueel").
- **Storing:** de ring wordt rood bij "geen luchtstroom" (slangetje of filters) of bij "ventilator draait niet" (het toerental blijft weg; kijk de M8-kabel na).

## Bestellijst

### Kopen

| Onderdeel | Aantal | Type of bestelnummer | Prijs per stuk | Totaal |
|---|---|---|--:|--:|
| Radiale ventilator Ø175, 24 V, PWM, tacho | 1 | San Ace C175 9TG24P0S01 (Sanyo Denki); niet de 9TG24P0G01 (93,6 W: te veel voor de adapter van 90 W) | € 160,00 | € 160,00 |
| Netadapter 24 V, 3,75 A, C14-inlaat | 1 | Mean Well GST90A24-P1M | € 33,00 | € 33,00 |
| Netsnoer C13 naar stopcontact (randaarde) | 1 | gewoon pc-netsnoer | € 5,00 | € 5,00 |
| Knop met rond AMOLED-scherm 1,5", ESP32-S3 | 1 | VIEWE UEDX46460015-MD50E, variant 1.5-Black-Knob (AliExpress, VIEWE Store) | € 34,00 | € 34,00 |
| Adapterprint FPC 10-polig 0,5 mm naar 2,54 mm | 1 | FPC/FFC-breakout 10P, past in 23 x 47 mm | € 2,00 | € 2,00 |
| USB-C-bus, breakout 16-polig (USB 2.0, 5,1 kΩ op CC), 12 x 15 mm zonder gaten | 1 | in de knophouder, geklemd tussen 2 palen en het deksel; de bus opzij onderaan door de wand (kant van de sleuf): 5 V van de box, of de computer om de knop te flashen | € 1,50 | € 1,50 |
| USB-C-bus, breakout 6-polig (VBUS, GND, CC1, CC2), 20,3 x 12,7 mm met 2 gaten M2 | 1 | in de box, levert 5 V aan de knop; meet de gaten na en pas `M.box.usb` aan als ze anders liggen | € 1,00 | € 1,00 |
| USB-C-kabel C-C, 1 m, haakse stekkers | 1 | USB 2.0 volstaat | € 9,00 | € 9,00 |
| M8-inbouwbus 4-polig, achterwandmontage, binder 718 (M10 x 0,75, gat Ø10,2) | 1 | in de achterwand van de afzuiging | € 13,00 | € 13,00 |
| M8-inbouwstekker 4-polig, achterwandmontage, binder 718 (M10 x 0,75, gat Ø10,2) | 1 | in de voorkant van de box | € 13,00 | € 13,00 |
| M8-kabel 4-polig stekker-bus, 0,5 m | 1 | verlengkabel; elke lengte past | € 12,00 | € 12,00 |
| ESP32-C3 SuperMini | 1 | in de box: stuurt de ventilator en leest de drukmeter | € 7,00 | € 7,00 |
| Schakelende regelaar 24 V naar 5 V, 1 A | 1 | Pololu D24V10F5 | € 10,50 | € 10,50 |
| Verschildrukmeter ±500 Pa, I2C | 1 | Sensirion SDP810-500PA | € 30,00 | € 30,00 |
| Wipschakelaar aan/uit, 1-polig, 21 x 15 mm | 1 | KCD1-101, inbouwgat 19 x 13 mm, 6 A | € 1,00 | € 1,00 |
| Vlakstekerhulzen 4,8 mm, geïsoleerd | 2 | draden op de schakelaar | € 0,15 | € 0,30 |
| NPN-transistor | 1 | BC547B (TO-92) | € 0,20 | € 0,20 |
| Weerstanden 0,25 W | 7 | 1 x 1 kΩ, 2 x 10 kΩ, 2 x 4,7 kΩ, 2 x 56 kΩ | € 0,10 | € 0,70 |
| Elco 470 µF / 35 V | 1 | buffer voor de ventilator | € 0,50 | € 0,50 |
| Zekering TR5 3,15 A traag (Ø8,4 x 7,6, op de print) | 1 | past op de kleine print (een houder 5 x 20 is 28 x 10 x 21) | € 1,00 | € 1,00 |
| Gaatjesprint 40 x 50 mm | 1 | gaten 2 mm in de hoeken | € 1,00 | € 1,00 |
| Printschroefklem 2-polig, steek 5 mm | 1 | de DC-kabel van de adapter (ingekort) | € 0,50 | € 0,50 |
| Montagedraad 0,25 mm² en 0,75 mm² | 1 m |  | € 3,00 | € 3,00 |
| Siliconeslang 3 x 5 mm | 1 m | drukmeting: van de afzuiging naar de box, en binnen de afzuiging | € 3,00 | € 3,00 |
| Messingbuisje Ø3 x 0,5 mm | 40 mm | 3 stukjes van 12 mm: meetpunt in de instroomplaat en doorvoer in de afzuiging en de box | € 3,00 | € 3,00 |
| Filtermat Rittal SK 3171.100 (173 x 173 x 17, G3 / ISO coarse 50 %, EAN 4028177038059) | 1 pak van 5 | het enige filter, kant-en-klaar; vervangen zonder knippen (ook als pak van 50: SK 3171.105) | € 22,21 | € 22,21 |
| Neodymiummagneet Ø8 x 1,5 mm, N42 | 4 | inlijmen in het bovenframe, vlak met de bovenkant (gat Ø8,2 x 1,6, bodem 0,9 mm) | € 0,50 | € 2,00 |
| Tweecomponentenlijm (epoxy) | 1 | magneten, bovenframe op de romp, rand op de cassette, instroomplaat, messingbuisjes | € 9,00 | € 9,00 |
| Plug voor holle deuren M4 (gat Ø8) | 4 | in de onderkant van het blad, naast de uitsparing van de box | € 0,50 | € 2,00 |
| M4 x 30 verzonken (DIN 7991, A2) | 4 | de rand van de voedingsbox in de pluggen (i.p.v. de bijgeleverde schroeven) | € 0,15 | € 0,60 |
| M3 x 8 verzonken (DIN 7991, A2) | 4 | het deksel van de voedingsbox op de paaltjes | € 0,10 | € 0,40 |
| M5 x 65 verzonken (DIN 7991, A2) | 4 | klauwen van de module | € 0,60 | € 2,40 |
| M5 zeskantmoer (DIN 934, A2) | 4 | in de klauwen van de module | € 0,10 | € 0,40 |
| M4 x 65 verzonken (DIN 7991, A2) | 2 | klauwen van de knophouder (de koppen liggen onder de voet van de knop) | € 0,40 | € 0,80 |
| M4 zeskantmoer (DIN 934, A2) | 2 | in de klauwen van de knophouder | € 0,10 | € 0,20 |
| M2,5 x 6 verzonken (DIN 7991) | 2 | knop in de houder, van onderen in de naaf | € 0,10 | € 0,20 |
| M2,5 x 8 verzonken (DIN 7991) | 2 | deksel van de knophouder | € 0,10 | € 0,20 |
| M3 x 16 verzonken (DIN 7991, A2) | 8 | bodemplaat; de kop ligt vlak in de plaat, draait zelf in PETG | € 0,10 | € 0,80 |
| M4 x 10 verzonken (DIN 7991, A2) | 4 | ventilator op de bodemplaat (4 tot 6 mm in de motor) | € 0,12 | € 0,48 |
| M3 x 10 verzonken (DIN 7991) | 2 | klemmen van de netadapter | € 0,10 | € 0,20 |
| M2,5 x 6 zelftappend | 4 | print in de box (printplaat: gewone kop mag) | € 0,10 | € 0,40 |
| M2 x 5 zelftappend | 2 | USB-C-bus in de box (printplaat) | € 0,10 | € 0,20 |
| **Totaal kopen** | | | | **€ 380,48** |

### Laten lasersnijden

| Bestand | Materiaal | Aantal | Prijs per stuk | Totaal |
|---|---|---|--:|--:|
| `laser/rooster.dxf` | RVS 430, 1,5 mm, geborsteld (magnetisch), 222 x 222 mm | 1 | € 45,00 | € 45,00 |
| opstart en verzending | | 1 | € 10,00 | € 10,00 |
| **Totaal lasersnijden** | | | | **€ 55,00** |

De klauwen worden geprint (met een moer); alleen het rooster gaat naar de lasersnijder.

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
| `print/Romp.stl` | rechtop | 210 x 210 x 99 |
| `print/Bovenframe.stl` | plat | 222 x 222 x 2,5 |
| `print/Filtercassette.stl` | rechtop, de roosterbodem op het bed | 174,2 x 174,2 x 19 |
| `print/Cassetterand.stl` | plat | 200 x 200 x 2,5 |
| `print/Instroomplaat.stl` | plat, de trechter naar boven | 202 x 202 x 3 |
| `print/Bodemplaat.stl` | plat, de lamellen staan onder 45° | 210 x 210 x 6 |
| `print/Voedingsbox.stl` | rechtop, de bodem op het bed; de rand rust op een schuine kant van 45° | 225 x 124 x 50 |
| `print/Deksel-voedingsbox.stl` | plat | 203,6 x 93,6 x 2 |
| `print/Knophouder.stl` | ondersteboven, de plaat op het bed | Ø51,6 x 62 |
| `print/Knopdeksel.stl` | plat | Ø43 x 2 |
| `print/Klauw.stl` (4 x) | plat, de moerkamer op het bed, 100 % vulling | 24,5 x 13 x 6 |
| `print/Knopklauw.stl` (2 x, zwart) | plat, de moerkamer op het bed, 100 % vulling | 20,5 x 11 x 5 |
| `print/Adapterklem.stl` (2 x) | plat | 9 x 16,5 x 3 |

Alles past op het bed van 256 x 256 mm van de Centauri Carbon, en zelfs op 225 x 225. Reken met ongeveer 1 kg PETG (de romp alleen al ongeveer 420 g): neem 1,5 kg wit en wat zwart.

Overhangen: alleen korte bruggen (de vensters van de klauwen, de kom van de schakelaar, de vloer van de knophouder van 22 mm). De richels voor de instroomplaat zijn getrapt onder 45°. Zet de brugkoeling op 100 %.

### Gereedschap

- **Bovenfrees met frees Ø10 mm:** voor de uitsparing van 212 x 212 mm (hoeken R6) en de uitsparing van 212 x 102 x 15 mm onderaan voor de box (hoeken R5) en een boor Ø8 voor de 4 pluggen (28 diep).
- **Gatzaag Ø44 mm:** voor de knop.
- **Frees Ø5 mm:** voor de kabelsleuven onderaan het blad, langs een lat.
- **Boor Ø8:** voor de 4 pluggen voor holle deuren naast de uitsparing van de box.
- **Soldeerbout:** voor de gaatjesprint en de M8-bus.

### Wat het kost

Prijzen per stuk incl. 21 % btw, zonder verzendkosten: een indicatie van november 2026 bij de winkels in `tekeningen/prijslijst.csv`. Losse schroeven koop je meestal per zakje; de prijs per stuk is dan het zakje gedeeld door het aantal.

| Groep | Totaal |
|---|--:|
| Kopen (elektronica, ventilator, filter, schroeven en moeren) | € 380,48 |
| Laten lasersnijden (rooster) | € 55,00 |
| Filament PETG: 2 rollen wit en 1 rol zwart | € 60,00 |
| **Eindtotaal** | **€ 495,48** |

Het filament dat echt opgaat (ca. 1,2 kg) kost ongeveer € 24,00. Het duurste onderdeel is de ventilator (ca. € 160, bijna 30 % van het totaal), daarna het rooster (€ 45), de knop (€ 34), de netadapter (€ 33) en de drukmeter (€ 30). Een nieuw filter (M5, 170 x 190 mm) kost ongeveer € 0,50.

## Maken en monteren

1. **Uitsparingen in het blad.**

   | Uitsparing | Gereedschap | Plaats |
   |---|---|---|
   | Afzuiging, 212 x 212 mm | frees Ø10 | midden van het blad |
   | Knop, Ø44 mm | gatzaag | 250 mm rechts van het midden, 100 mm van de voorkant |
   | Voedingsbox, 212 x 102 x 15 mm, onderaan | frees Ø10 | achter de afzuiging, midden op 195 mm achter het midden; ernaast 4 gaten Ø8 voor de pluggen (zie de freesmal) |
   | Sleuf naar de afzuiging, 29 x 7 mm, onderaan | frees Ø10 | van de box recht naar de achterkant van de uitsparing, 53 tot 82 mm links van het midden |
   | Sleuf naar de knop, 5 x 5 mm, onderaan | frees Ø5 | van de rechterkant van de box schuin naar het knopgat, rechts langs de afzuiging |

   Druk de freesmallen in `schema/` (één PDF per doos: `Freesmal-afzuiging`, `-knop` en `-voedingsbox`) af op 100 % en meet de controlemaat van 100 mm na. De mal voor het knopgat legt je in de hoek van de uitsparing, die voor de onderkant tegen de achterrand ervan.

   LAGKAPTEN is vanbinnen een honingraat: de uitsparing voor de box geeft geen houvast in de zijkanten, de rand van de box drukt op de onderhuid.
2. **Magneten:** lijm de vier magneten in het bovenframe, vlak met de bovenkant en allemaal met dezelfde pool naar boven.
3. **Lijmen:** lijm het bovenframe op de bovenrand van de romp, rondom (luchtdicht). Lijm de rand op de bak van de cassette, over de hele wandbovenkant. Lijm een messingbuisje in de instroomplaat (meetpunt) en een in de achterwand (doorvoer). Laat de lijm een nacht uitharden.
4. **Klauwen:** druk in elke klauw van onderen een M5-moer in de zeskantkamer (een tik met een hamer, of de moer even opwarmen). Schuif elke klauw liggend door het venster onderaan de zijwand, tot het gat onder de schroef zit. Draai de M5 x 65 van bovenaf door de lip van het bovenframe in en draai hem een paar slagen terug.
5. **Ventilator:** soldeer de vier draden van de ventilator op de M8-bus (rood 1, geel 2, zwart 3, bruin 4) en zet de bus met zijn moer in de achterwand. Schroef de ventilator met 4 x M4 x 10 van onderen op de bodemplaat.
6. **Instroomplaat:** schuif een stukje siliconeslang van het messingbuisje in de instroomplaat naar dat in de achterwand. Leg de plaat op de getrapte richel en lijm ze rondom.
7. **Bodemplaat:** schroef de plaat met de ventilator met 8 x M3 aan de romp.
8. **Inbouwen:** laat de module in de uitsparing zakken en draai de vier M5-schroeven rechtsom aan. Elke klauw zwaait naar buiten en trekt zich tegen de onderkant van het blad. Stop zodra de klauw voelbaar aanligt (twee vingers aan de korte kant van de inbussleutel): de klauwen houden de module alleen tegen optillen, het gewicht rust op het frame (zie docs/Berekeningen.md).
9. **Filter en plaat:** leg een filtermat Rittal SK 3171.100 in de cassette en druk ze rondom aan. Zet de cassette in het frame en leg de RVS-plaat erop.
10. **Voedingsbox:** bouw de print volgens `schema/Aansluitschema-afzuiging.pdf` en schroef ze op de bussen. Zet de netadapter op de bodem tegen de aanslagen en schroef de twee klemmen op de paaltjes (M3 x 10 verzonken). Kort de DC-kabel van de adapter in en klem hem op -X1. Zet de schakelaar (voorwand), de M8-stekker, het messingbuisje en de USB-C-bus in de wanden. Leid het slangetje door de ring tegen de voorwand. Schroef het deksel met 4 x M3 x 8 op de paaltjes. Zet de 4 pluggen voor holle deuren in het blad, duw de box van onderen in de uitsparing en zet de rand vast met 4 x M4 x 30 verzonken.
11. **Knop:** druk een M4-moer in elke knopklauw. Zet de houder in het gat van Ø44, schuif de klauwen van onderen in hun kanaal en draai de M4 x 65 van bovenaf in tot de klauwen tegen het blad trekken. Steek de FPC door de sleuf in de kom, zet de knop in de kom en schroef hem van onderen vast met 2 x M2,5 x 6 verzonken. Soldeer 4 draden (VBUS, GND, D+, D-) van de adapterprint naar het USB-C-printje. Steek de FPC in de adapterprint en schuif de print in de groeven. Schroef het USB-C-printje met 2 x M2 x 5 onder de palen: de bus steekt opzij door de achterwand, naar de sleuf. Schroef het deksel vast (het deksel is dicht).
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

De knop gebruikt GFX Library for Arduino (CO5300-driver). Tekst en cijfers zijn in Inter (SIL OFL), vooraf anti-aliased gerenderd met `logo/knopfont.py` naar `src/knop/fonts.h`; het LB-logo komt uit `logo/knoplogo.py`. Een voorbeeld van alle schermen staat in `firmware/ui/schermen.html`. Het protocol staat in `firmware/include/protocol.h`.

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

- **Filter:** vervang het (in een zak) als de knop "filter vervangen" meldt. Ijk daarna opnieuw.
- **Gebruik:** gebruik de afzuiging nooit zonder filter.
- **Netspanning:** 230 V zit alleen in de gekeurde netadapter in de box. Trek het netsnoer uit voor je de box opent.
