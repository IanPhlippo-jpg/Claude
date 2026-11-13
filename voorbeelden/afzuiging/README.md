# Ingebouwde nagelstofafzuiging (Lush Beauty), versie 7.2 (2026-11-12)

Alle uitvoer (KCAD, STL, tekeningen, bouwschema, schema, freesmallen, prijslijst) komt uit dezelfde generator en draagt dit
revisienummer (`revisie.mjs`, met de lijst van wijzigingen). De berekeningen staan in `docs/Berekeningen.md`, het meet- en
vrijgaveplan in `docs/Vrijgave-en-meetplan.md`, de risicoanalyse en de CE-vragen in `docs/Risicoanalyse-en-CE.md`.

Een krachtige, stille afzuiging voor in het bureaublad, met het LB-monogram in het RVS-rooster.
De module zakt van bovenaf in een gefreesde uitsparing en klemt zich vast met vier geprinte klauwen (met een M5-moer erin), voor een blad van 10 tot 50 mm dik.
Een radiale ventilator met achterwaarts gebogen schoepen zuigt door een gewoon interieurfilter van een auto (pollenfilter MANN CU 20 013 voor de Toyota Aygo, Peugeot 108 en Citroën C1, ook van Bosch, Valeo en Purflux) en houdt zijn kracht ook als het filter voller wordt. Het geplooide filter houdt vijlsel en grof stof tegen. Hoeveel van het fijnste stof het tegenhoudt, geeft de fabrikant niet op (zie [Wat het filter wel en niet doet](#wat-het-filter-wel-en-niet-doet)); het is geen HEPA-filter en houdt geen dampen tegen.
**De gefilterde lucht, met het fijne stof dat erdoor gaat en alle dampen, gaat terug in de salon: een afvoer naar buiten is bewust niet gekozen (Ian, 2026-11-12). Zorg voor aparte ventilatie.**
Een VIEWE-knop van 1,5" (rond AMOLED-scherm) zit in het blad, regelt de zuigkracht en meldt wanneer het filter vol is.
De netadapter en de elektronica zitten in een aparte voedingsbox die onderaan in het blad is ingefreesd; er komt geen enkele schroef door het bovenvlak van het bureau.

![Rooster](laser/rooster-voorbeeld.png)

## Wat er in 7.2 veranderde

Het advies van Fable 5.2 is verwerkt zonder sterkere ventilator, en onder het blad zijn de vormen rond (wens van Ian):

- **Vangst eerlijk:** de werkhoogte is 10 cm boven het rooster; 15 cm haalt alleen boost. De verdeelruimte onder het filter is 15,5 mm (was 6,5), het filter ligt 3 tot 5 mm onder de plaat (ook de gaten naast het filter doen mee) en het rooster is opener (sleuven 5 mm, stegen 2 mm). Daardoor is **75 % nu de laagste beschermende stand** (was 80 %): 1,4 dB stiller.
- **Rond onder het blad:** de vierkante romp stopt 70 mm onder het bovenvlak; de ventilator hangt eronder in een ronde, bolle kuip (Ø189) op vier rubberbuffers. De uitblaas gaat opzij en naar onder, niet meer naar achteren langs de voedingsbox. Bovenframe, RVS-plaat en uitsparing blijven vierkant.
- **Veiliger:** het vingerrooster voldoet aan EN ISO 13857 (spleten 5,6 mm), de ventilator stopt na 3 s zonder filter of luchtstroom, een watchdog herstart een vastgelopen besturing, na 10 min zonder knop of 4 uur zonder bediening gaat hij uit. De RVS-plaat zit vast met 4 persbouten in de frameopening.
- **Geen valse filtermelding meer:** de knop meldt "filter vervangen" pas als de druk 5 minuten aan een stuk boven de grens bleef (een hand op het rooster telt niet); een filter van een ander merk krijgt een eigen handeling.
- **Elektriek:** ompolingsbeveiliging, RC-filter op de tacho, een opbouwtekening van de print, de sleutel van de radio gaat niet meer over de lucht.
- **Tafelblad:** houten latten tussen de huiden rond de uitsparingen, schroeven van de box in hout, stijve MDF-freesmallen met kopieerring.
- De volledige lijst staat in `revisie.mjs`.

## Opbouw

| Deel | Wat |
|---|---|
| RVS-plaat | RVS 430 (magnetisch), 222 x 222 mm, even groot als het frame; klikt op 4 verzonken magneten; 4 RVS-persbouten (PEM FH4-M3-6, door de lasersnijder ingeperst) steken 6 mm in de opening van het frame en houden de plaat op haar plaats |
| Bovenframe | PETG, smalle omranding van 2,5 mm, op de romp gelijmd; de magneten en de koppen van de M5-schroeven zitten erin, onder de plaat |
| Filter | interieurfilter MANN CU 20 013, 195 x 145 x 30 mm (overal te koop, niets te knippen); ligt los op een zachte foamband in een geleiderand, langs boven uitneembaar; een siliconenlip op de geleiderand dicht de rand rondom af; 3 tot 5 mm onder de RVS-plaat |
| Romp | vierkant 210 x 210 x 70 mm: het filter, de verdeelruimte van 15,5 mm, de instroomplaat en de vier klauwtorens in de hoeken; achteraan, onder de instroomplaat, de M8-bus en het gat voor het slangetje |
| Instroomplaat | met een trechter boven het oog van de ventilator, een vast vingerrooster in het oog (18 ribben, spleten 5,6 mm, 12 mm hoog, twee ringen), een steunrand van 12,5 mm met foamband en een geleiderand met de afdichtlip voor het filter; het meetpunt van de drukmeter zit erin, onder het filter |
| Ventilatorkuip | rond (binnen Ø183, wand 3) met een bolle onderkant, rechtop te printen zonder support; schuine lamellen opzij (12 sectoren) en vier ringsleuven in de bodem; hangt met 4 oren en 4 x M3 aan de romp, een foamband dicht de rand af tegen de instroomplaat |
| Ventilator | San Ace C175 (Ø175 mm, 24 V, 56 W) op 4 rubberbuffers Ø15 x 10 in de kuip |
| Voedingsbox | bak van 210 x 100 x 50 met hoeken R10 en een afgeschuinde onderrand, de bovenste 14 mm in een uitsparing onderaan het blad; een vlakke rand op de onderkant van het blad met 4 spaanplaatschroeven 4 x 16 verzonken (in hout: zie de latten); een los deksel bovenin (4 x M3); ventilatie onderaan en in de achterwand; netadapter, ESP32-C3, drukmeter, de USB-C voor de knop en de aan/uit-schakelaar in de voorwand |
| Knop | VIEWE 1,5" op een houder die niet breder is dan de knop, in een gat van Ø44 |

- **Diepte onder het blad:** gemeten vanaf de **onderkant** van het blad (34 mm) hangt de vierkante romp 36 mm lager, de rand van de kuip (Ø189) 76 mm en het midden van de bolle bodem 102 mm (bij een bureau van 734 mm: 598 mm boven de vloer in het midden). Versie 7.1 hing overal 82 mm lager, ook aan de voorrand. De voedingsbox 36 mm.
- **Van boven alleen staal:** de RVS-plaat bedekt het frame volledig (ook de koppen van de persbouten zijn RVS). Van opzij zie je een randje PETG van 2,5 mm en de plaat van 1,5 mm, samen 4 mm boven het blad.
- **Filter vervangen:** zie [Onderhoud](#onderhoud-het-filter-vervangen): eerst uitschakelen en de ventilator laten stilvallen, dan het filter stofarm in een zak.
- **Kabels:** tussen de box en de afzuiging lopen een M8-kabel (de ventilator) en een siliconeslangetje (de drukmeting). Tussen de box en de knop loopt een USB-C-kabel. Alle drie liggen ze in gefreesde sleuven onderaan het blad en hebben ze aan beide kanten een koppeling: een andere lengte is gewoon een andere kabel.
- **Draadloos:** de knop en de ESP32-C3 in de box praten met elkaar via ESP-NOW, versleuteld met een sleutel die bij het koppelen uit X25519 komt (hij gaat niet over de lucht). Valt de verbinding weg, dan blijft de ventilator op zijn laatste gewone stand, **hoogstens 10 minuten**; de knop toont "AAN?" of "UIT?" met "geen verbinding": zonder recente bevestiging van de box toont hij nooit een zekere stand.
- **Aan/uit:** een wipschakelaar zit verzonken in een kom in de voorwand van de box. De wip ligt 1 mm binnen de wand, zodat je hem niet per ongeluk omzet. Na 4 uur zonder bediening gaat de afzuiging vanzelf uit.
- **Veilig:** 230 V zit alleen in de gekeurde netadapter (klasse I, met aarding), die je met een gewoon netsnoer (C13) op het stopcontact aansluit. Er is geen eigen bedrading op 230 V. Valt de besturing weg (5 V weg, reset, flashen, watchdog), dan schakelt een MOSFET de 24 V naar de ventilator af: hij staat dan stil (waarheidstabel in docs/Berekeningen.md, hoofdstuk 4). Na elke herstart van de box staat de afzuiging UIT tot je ze op de knop opnieuw aanzet. Het vingerrooster in het oog voldoet aan EN ISO 13857 tabel 4; ontbreekt het filter of is er geen luchtstroom, dan stopt de ventilator na 3 s, op elke stand.
- **Luchtdicht:** lucht kan alleen langs het rooster binnen en langs de lamellen en ringsleuven van de kuip buiten. Rond het filter ligt een lip van 0,5 mm siliconenrubber op de geleiderand; de instroomplaat is rondom gelijmd (ook langs de torens); de kuip dicht af met een foamband tegen de instroomplaat; het gat voor de aders zet je dicht met kit (docs/Berekeningen.md, 6c). Een test bemonstert het geheel per mm, met twee tegenproeven.
- **Stevig:** de kop van elke M5-schroef zit in het bovenframe en drukt het hele frame op het blad, en dat ligt rondom op een houten lat tussen de huiden. De klauwen zijn geprint in PETG (6 mm, 100 % vulling) met een ingeperste M5-moer en een rubberkussen (neopreen Shore A 40, 4 mm) op de arm: aandraaien tot het rubber het blad raakt en dan **een halve slag**; het rubber begrenst de kracht (zie docs/Berekeningen.md, hoofdstuk 6). De knopklauwen hebben hetzelfde, met rubber van 3 mm.
- **Stil:** de ventilator staat op rubberbuffers (geen starre verbinding met de kuip, de romp en het blad); de uitblaas gaat opzij en naar onder, weg van het oor.

## Zuigkracht en bediening

| Ventilator | Vrij uitblazend | Max. statische druk | Geluid (vol) | Vermogen |
|---|---|---|---|---|
| San Ace C175 9TG24P0S01 | 696 m³/h | 609 Pa | 69 dB(A) | 56 W |

- **Met rooster en filter:** niet gemeten. De cijfers in de tabel zijn de grenzen van de ventilator (vrij uitblazend en dichtgedrukt), geen werkpunt. Debiet, vangst en geluid worden gemeten volgens `docs/Vrijgave-en-meetplan.md`, eerst op een proefopstelling.
- **Werkhoogte: 10 cm boven het rooster.** Daar is de vangst berekend (0,5 m/s op elke beschermende stand tot de melding "filter vervangen"). Op 15 cm haalt alleen boost 0,5 m/s, en dan alleen met een schoon filter (docs/Berekeningen.md, hoofdstuk 1). Werk dus met de hand van de klant laag boven het rooster.
- **Draaien:** de zuigkracht gaat van 20 tot 80 % in stappen van 5 % (100 % alleen als boost). De ventilator start zacht (50 % per seconde). **Dagstand: 75 tot 80 %.** 75 % is de laagste stand die het stof zeker vangt tot de melding "filter vervangen" (1,4 dB stiller dan 80 %); op 80 % gaat een filter langer mee. Lager zegt de knop "lage stand" (docs/Berekeningen.md, hoofdstuk 3b).
- **Drukken:** aan of uit. Na een stroomonderbreking of een herstart van de box staat alles UIT; de knop zegt dan "afzuiging herstart – druk om aan te zetten".
- **1 seconde indrukken:** boost, 2 minuten op 100 % (de box telt de tijd, ook zonder knop). Het boosttegoed begint na elke start leeg: de eerste boost kan na 40 s, en hoogstens 1/5 van de tijd staat op 100 %.
- **5 tot 10 seconden indrukken:** de knop vraagt "Nieuw filter?". Kort drukken = ijken op het schone filter; **3 s vasthouden = ander merk filter** (de eerste ijking vervalt en deze wordt de referentie); draaien of 10 s niets doen = annuleren. Doe dat na elke filterwissel. Ligt de nieuwe ijking meer dan 15 % boven de eerste ijking, dan weigert de box ze ("ijking geweigerd – ander merk? 5 s, dan 3 s"); onder 0,70 x de eerste ook ("filter ontbreekt?").
- **10 seconden indrukken:** opnieuw koppelen. Zet daarna de box met de schakelaar **drie keer kort aan en uit** (telkens korter dan 5 s) en laat hem de derde keer aan: dan staat zijn koppelvenster 60 s open. Koppel één box tegelijk; de knop neemt alleen het eerste antwoord aan en bevestigt het. Koppelen wist de ijking niet.
- **Filtermelding:** de drukmeter vergelijkt de weerstand met die van het schone filter. De balk toont de verbruikte drukreserve (geen gewicht aan stof). De ring wordt oranje met "filter vervangen" als de druk **5 minuten aan een stuk** boven de grens bleef: op 75 % bij 1,18 x de schone waarde, op 85 % bij 1,40 x, op 100 % bij 1,70 x (uit `regel.h`, nagerekend in docs/Berekeningen.md 3b). Een hand op het rooster of een korte schommeling geeft dus geen melding (3e). De melding blijft staan, ook na een herstart, tot je een nieuw filter ijkt. **Dat is het moment om te vervangen.** Is de meting ouder dan 1 s, dan toont de knop geen drukwaarde ("meting niet actueel").
- **Filter ontbreekt of sluit niet af:** onder 0,70 x de schone druk: oranje melding, en na 3 s stopt de ventilator (op elke stand): "gestopt: filter ontbreekt of geen luchtstroom". Leg het filter goed, kijk of de lip rondom aanligt en zet weer aan.
- **Storing (rood):** "geen luchtstroom" (slangetje), "ventilator draait niet" (het toerental blijft weg; kijk de M8-kabel na) of "toerental wijkt af" (meer dan 3 % naast het doel, 10 s lang: dan geeft de knop geen filteroordeel; een losse PWM-draad geeft vol toerental).
- **Vanzelf uit:** na 10 minuten zonder bericht van de knop ("gestopt: geen verbinding") en na 4 uur zonder bediening ("4 uur niets gedaan: uit"). Druk op de knop om weer aan te zetten.

## Wat het filter wel en niet doet

De afzuiging vangt stof bij de bron (boven het rooster) en houdt het grove deel in een gewoon pollenfilter. De lucht gaat
daarna terug in de salon: dit is geen ventilatie en geen luchtreiniger. Per bewering de bron:

| Bewering | Bron | Soort |
|---|---|---|
| CU 20 013 is 195 x 145 x 30 mm en past in de Aygo II, 108 en C1 II | MANN-FILTER-catalogus | fabrikant |
| Het is een deeltjesfilter (pollenfilter), zonder actieve kool: dampen (aceton, monomeer) gaan erdoor | MANN-FILTER (de catalogus toont drie niveaus: CU, CUK met kool, FP) | fabrikant |
| Drukval schoon 55 tot 115 Pa bij 250 m³/h (wij rekenen met 115) | Johansson e.a., AIVC 1999 (interieurfilters), geschaald op ons front | literatuur, aanname |
| Vangst van het fijnste stof (0,1 tot 0,35 µm): bij betere interieurfilters ongeveer 45 % (55 % gaat erdoor) | Johansson e.a., AIVC 1999 | literatuur, niet voor dit filter |
| Vangst van grover stof en vijlsel | geen fabrikantcurve voor CU 20 013 | **onbekend: we beloven geen getal; poort L3 meet PM2,5 voor en na** |
| Vangst bij de bron: 0,5 m/s op 10 cm boven het rooster, op 75 % of meer tot de melding "filter vervangen" | rekenblad 3b (36 scenario's per stand) | model, poort L2 meet het |
| Het filter beschermt de ventilator tegen vijlsel en stof | geplooid vlies vóór de waaier; vervangen bij de melding | ontwerp |
| Een filter **met actieve kool** in dezelfde maat bestaat: Castrol Filters CC0356C "Carbon+", 195 x 145 x 30, voor Aygo (2014-), 108 en C1 II | winparts.co.uk (productpagina, 2026) | handelaar; MANN CUK 20 013: niet gevonden |
| Een koolfilter vangt dampen alleen zolang de kool niet verzadigd is en remt meer | algemeen; niet doorgerekend | **na te gaan: L1 en L3 opnieuw met een koolfilter** |

**Wat je zelf moet regelen:** aparte ventilatie van de salon voor dampen en voor het fijne stof dat terugkomt. Een afvoer
naar buiten (slang) is bewust niet gekozen (Ian, 2026-11-12): de afzuiging blaast vrij uit onder het blad. Een koolfilter
in dezelfde maat (zie hierboven) is een optie voor dampen; het is niet doorgerekend en vraagt een nieuwe ijking ("ander merk
filter") en de metingen L1 en L3. Poort L4 (meting door een arbeidshygiënist of preventieadviseur) is verplicht vóór
gebruik met klanten.

## Bestellijst

### Kopen

| Onderdeel | Aantal | Type of bestelnummer | Prijs per stuk | Totaal |
|---|---|---|--:|--:|
| Radiale ventilator Ø175, 24 V, PWM, tacho | 1 | San Ace C175 9TG24P0S01 (Sanyo Denki); niet de 9TG24P0G01 (93,6 W: te veel voor de adapter van 90 W) | € 160,00 | € 160,00 |
| Netadapter 24 V, 3,75 A, C14-inlaat (klasse I) | 1 | Mean Well GST90A24-P1M | € 33,00 | € 33,00 |
| Netsnoer C13 naar stopcontact (randaarde) | 1 | gewoon pc-netsnoer | € 5,00 | € 5,00 |
| Knop met rond AMOLED-scherm 1,5", ESP32-S3 | 1 | VIEWE UEDX46460015-MD50E, variant 1.5-Black-Knob (AliExpress, VIEWE Store) | € 34,00 | € 34,00 |
| Adapterprint FPC 10-polig 0,5 mm naar 2,54 mm | 1 | FPC/FFC-breakout 10P, past in 23 x 47 mm | € 2,00 | € 2,00 |
| USB-C-bus, breakout 16-polig (USB 2.0, 5,1 kΩ op CC), 12 x 15 mm zonder gaten | 1 | in de knophouder, geklemd tussen 2 palen en het deksel; de bus opzij onderaan door de wand (kant van de sleuf): 5 V van de box, of de computer om de knop te flashen | € 1,50 | € 1,50 |
| USB-C-bus, breakout 6-polig (VBUS, GND, CC1, CC2), 20,3 x 12,7 mm met 2 gaten M2 | 1 | in de box, levert 5 V aan de knop; meet de gaten na en pas `M.box.usb` aan als ze anders liggen | € 1,00 | € 1,00 |
| USB-C-kabel C-C, 1 m, haakse stekkers | 1 | USB 2.0 volstaat | € 9,00 | € 9,00 |
| M8-inbouwbus 4-polig, achterwandmontage, binder 718 (M10 x 0,75, gat Ø10,2) | 1 | in de achterwand van de romp | € 13,00 | € 13,00 |
| M8-inbouwstekker 4-polig, achterwandmontage, binder 718 (M10 x 0,75, gat Ø10,2) | 1 | in de voorkant van de box | € 13,00 | € 13,00 |
| M8-kabel 4-polig stekker-bus, 0,5 m (4 x 0,25 mm²) | 1 | verlengkabel; elke lengte past | € 12,00 | € 12,00 |
| ESP32-C3 SuperMini | 1 | in de box: stuurt de ventilator en leest de drukmeter | € 7,00 | € 7,00 |
| Schakelende regelaar 24 V naar 5 V, 1 A | 1 | Pololu D24V10F5 | € 10,50 | € 10,50 |
| Verschildrukmeter ±500 Pa, I2C | 1 | Sensirion SDP810-500PA | € 30,00 | € 30,00 |
| Wipschakelaar aan/uit, 1-polig, 10 A bij 30 V DC | 1 | C&K D502J12S215PQA, rand 20,8 x 15, inbouwgat 19,41 x 12,90 (paneel 2 mm), vlaksteker 4,75 | € 8,50 | € 8,50 |
| Vlakstekerhulzen 4,8 mm, geïsoleerd | 2 | draden op de schakelaar | € 0,15 | € 0,30 |
| NPN-transistor | 2 | BC547B (TO-92): -Q1 (PWM) en -Q3 (driver van -Q2) | € 0,20 | € 0,40 |
| P-kanaal-MOSFET 55 V, TO-220 | 1 | Infineon IRF4905PBF (-Q2): schakelt de 24 V naar de ventilator; zonder besturing staat hij stil | € 1,50 | € 1,50 |
| Weerstanden 0,25 W | 12 | 3 x 1 kΩ, 5 x 10 kΩ, 2 x 4,7 kΩ, 2 x 56 kΩ | € 0,10 | € 1,20 |
| Elco 470 µF / 50 V, Ø10 x 20 | 1 | buffer voor de ventilator (-C1); staat naast de print op de bodem van de box (2 draden 0,5 mm²) | € 0,60 | € 0,60 |
| Elco 47 µF / 50 V | 1 | vlak bij VIN van de regelaar (-C2, Pololu: minstens 33 µF boven 20 V) | € 0,30 | € 0,30 |
| Keramische condensator 10 nF / 50 V, steek 5 | 1 | RC-filter van de tacho (-C3) | € 0,10 | € 0,10 |
| Zekering traag 3,15 A, 72 V DC (TE5, 8,35 x 4,0, op de print) | 1 | Bel Fuse 0697W3150-01; past op de kleine print (een houder 5 x 20 is 28 x 10 x 21) | € 0,70 | € 0,70 |
| Schottky-diode 1 A, 40 V | 1 | 1N5819, in de 5 V naar de ESP32-C3 (geen terugvoeding als ze aan een computer hangt) | € 0,20 | € 0,20 |
| Schottky-diode 5 A, 60 V (DO-201AD) | 1 | SB560 (-R13): ompolingsbeveiliging over L+ en M; over -C1 gesoldeerd, naast de print | € 0,40 | € 0,40 |
| Gaatjesprint 40 x 50 mm | 1 | raster 2,54, gaten 2 mm in de hoeken; opbouw: schema blad 11 | € 1,00 | € 1,00 |
| Printschroefklem 2-polig, steek 5 mm | 1 | de DC-kabel van de adapter (ingekort; + en − nameten) | € 0,50 | € 0,50 |
| Montagedraad 0,25 mm² en 0,5 mm² | 1 m | 0,5 mm² voor 24 V en M naar de M8-stekker, 0,25 mm² voor de signalen | € 3,00 | € 3,00 |
| Siliconeslang 3 x 5 mm | 1 m | drukmeting: van de afzuiging naar de box, en 10 cm op de "+"-poort van de drukmeter | € 3,00 | € 3,00 |
| Messingbuisje Ø3 x 0,5 mm | 40 mm | 2 stukjes van 12 mm: het meetpunt in de instroomplaat en de doorvoer in de box | € 3,00 | € 3,00 |
| Interieurfilter (pollenfilter) 195 x 145 x 30 | 2 | MANN CU 20 013; gelijk: Bosch 1 987 435 066, Valeo 715828, Purflux AH495, Filtron K 1347A (vanaf ± € 6); een in gebruik, een in reserve | € 14,00 | € 28,00 |
| Zachte zelfklevende foamband 6 x 4 mm (EPDM-cel, tochtband) | 1 rol van 5 m | 0,7 m op de steunrand: het filter rust erop (de afdichting is de lip) | € 6,00 | € 6,00 |
| Zelfklevende celband 6 x 2 mm (EPDM of neopreen) | 1 rol | 0,6 m op de rand van de kuip (dicht af tegen de instroomplaat) | € 5,00 | € 5,00 |
| Siliconenrubber 0,5 mm, Shore A 60, zelfklevend, 200 x 300 mm | 1 | de afdichtlip (150 x 200, uitsnijden met `schema/Snijmal-afdichtlip-1op1-A4.pdf`); bestand tegen aceton | € 12,00 | € 12,00 |
| Neopreen (CR) Shore A 40, 4 mm dik | 1 strook van 50 x 50 mm | 4 kussentjes van 7,5 x 8 op de arm van de moduleklauwen (snijden met een mes) | € 5,00 | € 5,00 |
| Neopreen (CR) Shore A 40, 3 mm dik | 1 strook van 50 x 50 mm | 2 kussentjes van 6 x 6 op de knopklauwen | € 4,00 | € 4,00 |
| Secondelijm gel (cyanoacrylaat) | 1 | de rubberkussentjes op de klauwen (module en knop) | € 4,00 | € 4,00 |
| Neodymiummagneet Ø8 x 1,5 mm, N42 | 4 | inlijmen in het bovenframe, vlak met de bovenkant (gat Ø8,2 x 1,6, bodem 0,9 mm) | € 0,50 | € 2,00 |
| Tweecomponentenlijm (epoxy) | 1 | UHU plus endfest 300: magneten, bovenframe op de romp, instroomplaat, messingbuisjes; schuren (korrel 100) en ontvetten met alcohol | € 9,00 | € 9,00 |
| Neutrale siliconenkit, klein tubetje | 1 | het gat voor de aders in de bodem van de kuip | € 5,00 | € 5,00 |
| Rubberbuffer Ø15 x 10, M4 binnendraad aan beide kanten (type C), NR 55 Shore A | 4 | Erwin Halder EH 25150.0008 of gelijk: de ventilator op de bodem van de kuip | € 1,50 | € 6,00 |
| Draadeind M4 x 8 (DIN 913, A2) | 4 | van de buffer in de motor (4 + 4 mm) | € 0,15 | € 0,60 |
| M4 x 8 verzonken (DIN 7991, A2) | 4 | van onderen door de bodem van de kuip in de buffers | € 0,12 | € 0,48 |
| M3 x 12 cilinderkop (DIN 912, A2) | 4 | de oren van de kuip in de bussen van de romp | € 0,10 | € 0,40 |
| Geschaafde vurenhouten lat 28 x 44 mm | 1 m | 4 x 212 mm rond de uitsparing van de module (één op 38 mm breed voor de achterkant) | € 3,50 | € 3,50 |
| Lat 10 x 30 mm (multiplex of beuken) | 0,5 m | 1 x 200 mm achter de uitsparing van de box | € 2,50 | € 2,50 |
| PU-lijm D4 (of houtlijm D3) | 1 | de latten tussen de huiden van het blad | € 8,00 | € 8,00 |
| Spaanplaatschroef 4 x 16 verzonken (bv. SPAX) | 4 | de rand van de voedingsbox, door de onderhuid in de latten (voorboren Ø2,5 x 14) | € 0,05 | € 0,20 |
| M3 x 8 verzonken (DIN 7991, A2) | 4 | het deksel van de voedingsbox op de paaltjes | € 0,10 | € 0,40 |
| M5 x 70 verzonken (DIN 7991, A2) | 4 | klauwen van de module | € 0,60 | € 2,40 |
| M5 zeskantmoer (DIN 934, A2) | 4 | in de klauwen van de module | € 0,10 | € 0,40 |
| M4 x 65 verzonken (DIN 7991, A2) | 2 | klauwen van de knophouder (de koppen liggen onder de voet van de knop) | € 0,40 | € 0,80 |
| M4 zeskantmoer (DIN 934, A2) | 2 | in de klauwen van de knophouder | € 0,10 | € 0,20 |
| M2,5 x 6 verzonken (DIN 7991) | 2 | knop in de houder, van onderen in de naaf | € 0,10 | € 0,20 |
| M2,5 x 8 verzonken (DIN 7991) | 2 | deksel van de knophouder | € 0,10 | € 0,20 |
| M3 x 10 verzonken (DIN 7991) | 2 | klemmen van de netadapter | € 0,10 | € 0,20 |
| M2,5 x 6 zelftappend | 4 | print in de box (printplaat: gewone kop mag) | € 0,10 | € 0,40 |
| M2 x 5 zelftappend | 2 | USB-C-bus in de box (printplaat) | € 0,10 | € 0,20 |
| **Totaal kopen** | | | | **€ 462,78** |

### Laten lasersnijden

| Bestand | Materiaal | Aantal | Prijs per stuk | Totaal |
|---|---|---|--:|--:|
| `laser/rooster.dxf` | RVS 430, 1,5 mm, geborsteld (magnetisch), 222 x 222 mm | 1 | € 45,00 | € 45,00 |
| persbouten PEM FH4-M3-6 inpersen (in de 4 gaten Ø3,0 van het rooster) | RVS 400-reeks, voor RVS-plaat 1,0 tot 2,4 mm | 4 | € 1,50 | € 6,00 |
| `laser/freesmal-mdf.dxf` | MDF 12 mm: freesmal module 400 x 400 en box 400 x 260 (snijden en hartlijnen graveren) | 1 | € 18,00 | € 18,00 |
| opstart en verzending | | 1 | € 10,00 | € 10,00 |
| **Totaal lasersnijden** | | | | **€ 79,00** |

Het rooster, de persbouten en de MDF-mallen bestel je in één keer bij dezelfde lasersnijder (prijzen een indicatie: vraag
een offerte; niet elke lasersnijder perst PEM-bouten in, en niet elke snijdt MDF). De klauwen worden geprint.

Het rooster is één stuk, zonder losse eilanden, en geen steg of sleuf is smaller dan 1,6 mm. Recht boven het filter (145 x 195) is 151,0 cm² open, in totaal 221,5 cm² (laser-rapport; versie 7.1: 121,1 en 177,8). Rond elk persboutgat is 7,2 mm vlak staal (PEM: minstens 5,6 mm van het hart tot een rand).

### Printen (Elegoo Centauri Carbon, PETG, zonder support)

PETG is taaier dan PLA, kruipt minder onder de klemkracht van de schroeven en kan tot 68 °C (Prusament PETG, HDT). Het kan **niet** tegen aceton (nagellakremover, gelremover): het zwelt. Reinig en ontsmet met een middel op alcohol, nooit met aceton; een spat meteen droog deppen. Van bovenaf zie je alleen staal; ABS en ASA lossen nog sneller op in aceton. Materialen, lijm en reinigingsmiddel met hun grenzen: `docs/Materiaalstaat.md`. Met de geharde spuitmond van de Centauri Carbon kan ook PETG-CF: stijver en het kruipt nog minder, goed voor de romp en het bovenframe. De knophouder en het deksel in zwart, de rest in wit.

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
| `print/Romp.stl` | rechtop | 210 x 210 x 70 |
| `print/Bovenframe.stl` | plat | 222 x 222 x 2,5 |
| `print/Instroomplaat.stl` | plat, de trechter en de randen naar boven | 201,4 x 201,4 x 25,5 |
| `print/Ventilatorkuip.stl` | rechtop, de bodem op het bed (de bolle rand en de oren onder 45°) | Ø206 x 83,5 |
| `print/Voedingsbox.stl` | rechtop, de bodem op het bed; de rand rust op een schuine kant van 45° | 225 x 124 x 50 |
| `print/Deksel-voedingsbox.stl` | plat | 203,6 x 93,6 x 2 |
| `print/Knophouder.stl` | ondersteboven, de plaat op het bed | Ø51,6 x 62 |
| `print/Knopdeksel.stl` | plat | Ø43 x 4,9 (plaat 2 mm, met de pennetjes) |
| `print/Klauw.stl` (4 x) | plat, de moerkamer op het bed, 100 % vulling | 24,5 x 13 x 6 |
| `print/Knopklauw.stl` (2 x, zwart) | plat, de moerkamer op het bed, 100 % vulling | 20,5 x 11 x 5 |
| `print/Adapterklem.stl` (2 x) | plat | 9 x 16,5 x 3 |

Alles past op het bed van 256 x 256 mm van de Centauri Carbon. Het grootste deel, de voedingsbox, is 225 mm breed. Massief gerekend (PETG 1,27 g/cm³) wegen de romp 375 g, de kuip 205 g en de instroomplaat 246 g, samen 826 g; in versie 7.1 waren romp, bodemplaat en instroomplaat samen 920 g (94 g meer). Met 40 % vulling is het echte gewicht ongeveer twee derde daarvan. Reken met ongeveer 1 kg PETG voor alles: neem 1,5 kg wit en wat zwart.

Overhangen: alleen korte bruggen (de vensters en de vloer van de zwaaikamers van de klauwen, de kom van de schakelaar, de vloer van de knophouder van 22 mm). De richels voor de instroomplaat en de bolle rand en de oren van de kuip zijn getrapt of schuin onder 45°. De lamellen van de kuip zijn banden onder 45°. Zet de brugkoeling op 100 %.

### Gereedschap

- **Bovenfrees met kopieerring Ø17 en frees Ø12:** Bosch-kopieerring 2 609 200 139 (17 mm) of gelijk, een spiraalfrees Ø12 (hardmetaal, snijlengte minstens 40 mm) en de twee MDF-freesmallen van de lasersnijder: voor de uitsparing van 212 x 212 mm (hoeken R6) en de uitsparing van 212 x 102 x 15 mm onderaan voor de box (hoeken R6). De opening van de mal is (17 − 12) / 2 = 2,5 mm groter rondom (tekening AFZ-21).
- **Gatzaag Ø44 mm:** voor de knop.
- **Frees Ø5 mm:** voor de kabelsleuven onderaan het blad, langs een lat.
- **Mes, lange schroevendraaier, lijmklemmen, zaag:** voor de latten tussen de huiden.
- **Boor Ø2,5:** voor de 4 voorboorgaten (14 diep) van de schroeven van de box.
- **Scherp mes en een lat:** voor de afdichtlip (snijmal).
- **Soldeerbout en multimeter:** voor de gaatjesprint, de M8-bus en om + en − van de DC-kabel na te meten.

### Wat het kost

Prijzen per stuk incl. 21 % btw, zonder verzendkosten: een indicatie van november 2026 bij de winkels in `tekeningen/prijslijst.csv`. Losse schroeven koop je meestal per zakje; de prijs per stuk is dan het zakje gedeeld door het aantal.

| Groep | Totaal |
|---|--:|
| Kopen (elektronica, ventilator, filter, schroeven en moeren) | € 462,78 |
| Laten lasersnijden (rooster, persbouten en freesmallen) | € 79,00 |
| Filament PETG: 2 rollen wit en 1 rol zwart | € 60,00 |
| **Eindtotaal** | **€ 601,78** |

Het duurste onderdeel is de ventilator (ca. € 160), daarna het rooster (€ 45), de knop (€ 34), de netadapter (€ 33) en de drukmeter (€ 30). Een nieuw interieurfilter kost € 6 tot € 14 (MANN CU 20 013 of gelijk).

## Maken en monteren

1. **Uitsparingen in het blad.** Bestel de MDF-freesmallen samen met het rooster (`laser/freesmal-mdf.dxf`). Zet de mal met dubbelzijdige tape en twee lijmklemmen op het blad, de gegraveerde hartlijnen op je potloodlijnen, en frees met de kopieerring Ø17 en de frees Ø12 in drie tot vier gangen.

   | Uitsparing | Gereedschap | Plaats |
   |---|---|---|
   | Afzuiging, 212 x 212 mm, hoeken R6 | MDF-mal, kopieerring Ø17, frees Ø12 | midden van het blad (700 van links, 300 van voor) |
   | Knop, Ø44 mm | gatzaag | 250 mm rechts van het midden, 100 mm van de voorkant |
   | Voedingsbox, 212 x 102 x 15 mm, hoeken R6, onderaan | MDF-mal, kopieerring Ø17, frees Ø12 | achter de afzuiging, midden op 195 mm achter het midden; ernaast 4 voorboorgaten Ø2,5 x 14 (door de gaatjes van de mal) |
   | Sleuf naar de afzuiging, 29 x 7 mm, onderaan | frees Ø10 | na de latten: van de box recht naar de achterkant van de uitsparing, 53 tot 82 mm links van het midden |
   | Sleuf naar de knop, 5 x 5 mm, onderaan | frees Ø5 | na de latten: van de rechterkant van de box schuin naar het knopgat, rechts langs de afzuiging |

   De papieren mallen in `schema/` (`Freesmal-afzuiging`, `-knop` en `-voedingsbox`, op 100 % afdrukken en de controlemaat van 100 mm nameten) zijn om af te tekenen en na te meten; frees langs de MDF-mal.
2. **Latten tussen de huiden.** LAGKAPTEN is vanbinnen een honingraat van papier: snij die in de uitsparing van de module rondom 45 mm diep weg, lijm vier latten 28 x 44 x 212 (vuren; achteraan een van 28 x 38, tot de uitsparing van de box) met PU-lijm op beide huiden, de binnenkant gelijk met de rand, en klem ze een nacht. Achter de box: honingraat 32 mm diep weg en een lat 10 x 30 x 200 tegen de binnenkant van de onderhuid lijmen. Meet eerst de kern (28 mm bij huiden van 3 mm, een aanname). Frees daarna de sleuven. Tekening AFZ-21 en docs/Berekeningen.md 6d.
3. **Magneten:** lijm de vier magneten in het bovenframe, vlak met de bovenkant en allemaal met dezelfde pool naar boven.
4. **Lijmen:** lijm het bovenframe op de bovenrand van de romp, rondom (luchtdicht). Laat de lijm een nacht uitharden.
5. **Klauwen:** druk in elke klauw van onderen een M5-moer in de zeskantkamer (een tik met een hamer, of de moer even opwarmen). Lijm met secondelijm een rubberkussen van 7,5 x 8 x 4 mm op de bovenkant van de arm, aan het uiteinde (tussen 9,5 en 17 mm van het schroefgat). Doe hetzelfde op de twee knopklauwen (6 x 6 x 3 mm, tussen 7,5 en 13,5 mm). Schuif elke klauw liggend door het venster onderaan de zijwand, tot het gat onder de schroef zit. Draai de M5 x 70 van bovenaf door de lip van het bovenframe in en draai hem een paar slagen terug.
6. **Ventilator in de kuip:** draai in elke rubberbuffer een draadeind M4 x 8 half in en het andere eind 4 mm in een gat van de motor (niet tot op de bodem: de fabrikant laat 4 tot 6 mm toe). Zet de ventilator met de buffers in de kuip en schroef ze van onderen vast met 4 x M4 x 8 verzonken. Leid de vier aders door het gat Ø5 in de bodem en zet het dicht met siliconenkit.
7. **Instroomplaat:** lijm een messingbuisje in de instroomplaat (meetpunt). Zet de M8-bus met zijn moer in de achterwand van de romp. Leg de plaat op de getrapte richel (die loopt ook langs de torens) en lijm ze rondom. Schuif een siliconeslangetje op het buisje onder de plaat en leid het door het gat Ø6 in de achterwand naar buiten. Kleef de foamband op de steunrand (6 mm breed, binnen de geleiderand), de naad op een korte kant. Snij de afdichtlip uit met de snijmal (`schema/Snijmal-afdichtlip-1op1-A4.pdf`, één stuk) en kleef ze op de bovenkant van de geleiderand, de buitenrand gelijk met de buitenkant: 3,5 mm steekt naar binnen uit.
8. **Kuip aan de romp:** kleef de celband 6 x 2 op de rand van de kuip. Soldeer de vier aders van de ventilator op de M8-bus (rood 1, geel 2, zwart 3, bruin 4; eerst nameten met de datasheet). Duw de kuip tegen de onderkant van de instroomplaat, de oren onder de bussen, en schroef ze vast met 4 x M3 x 12 cilinderkop.
9. **Inbouwen:** laat de module in de uitsparing zakken en draai de vier M5-schroeven rechtsom aan. Elke klauw zwaait naar buiten en schuift omhoog tot het rubber de onderkant van het blad raakt (de schroef gaat dan zwaarder). Draai daarna precies **een halve slag** verder (de inbussleutel wijst de andere kant op) en stop: de klauw duwt dan met 9 tot 13 N, de helft van zijn grens. Een hele slag is te veel. De klauwen houden de module alleen tegen optillen; het gewicht rust op het frame en via de lat op het blad (docs/Berekeningen.md, hoofdstuk 6).
10. **Filter en plaat:** duw het interieurfilter recht naar onder door de lip tot op de foamband, de lange kant van voor naar achter en de pijl (luchtrichting) naar onder. Kijk rondom: de lip ligt overal naar onder gebogen tegen de zijkant. Leg de RVS-plaat erop, met de 4 persbouten in de opening van het frame.
11. **Voedingsbox:** bouw de print volgens `schema/Aansluitschema-afzuiging.pdf` (opbouw op blad 11) en schroef ze op de bussen. Zet de netadapter op de bodem tegen de aanslagen en schroef de twee klemmen op de paaltjes (M3 x 10 verzonken). Kort de DC-kabel van de adapter in, **meet met de multimeter welke ader + is** en klem ze op -X1 (+ op 1; -R13 beschermt bij een vergissing). Zet de schakelaar (voorwand), de M8-stekker, het messingbuisje en de USB-C-bus in de wanden. Schuif een stukje slang van 10 cm op de "+"-poort van de drukmeter, met het open einde naar onder en een propje filtervlies erin (tegen stof uit de salon). Leid het slangetje door de ring tegen de voorwand. Schroef het deksel met 4 x M3 x 8 op de paaltjes. Duw de box van onderen in de uitsparing en zet de rand vast met 4 spaanplaatschroeven 4 x 16 verzonken: door de onderhuid in de latten, tot de kop vlak ligt.
12. **Knop:** druk een M4-moer in elke knopklauw. Zet de houder in het gat van Ø44, schuif de klauwen van onderen in hun kanaal en draai de M4 x 65 van bovenaf in tot het rubber van de klauwen het blad raakt, dan een halve slag. Steek de FPC door de sleuf in de kom, zet de knop in de kom en schroef hem van onderen vast met 2 x M2,5 x 6 verzonken. Soldeer 4 draden (VBUS, GND, D+, D-) van de adapterprint naar het USB-C-printje. Steek de FPC in de adapterprint en schuif de print in de groeven. Leg het USB-C-printje (zonder gaten) tussen de 2 palen: de bus steekt opzij onderaan door de wand, naar de sleuf. Schroef het deksel vast: de 2 pennetjes van het deksel klemmen het printje (het deksel is dicht).
    De USB-C zit 18 tot 26 mm onder het **bovenvlak** van het blad (bij elk blad hetzelfde): tot een blad van 48 mm past de stekker onder het blad.
13. **Kabels:** leg de M8-kabel en het slangetje in de sleuf tussen de box en de afzuiging, de USB-C-kabel in de sleuf naar de knop, en steek ze in.
14. **Opstarten:** steek het netsnoer in de box en in het stopcontact, flash de firmware (zie hieronder) en zet de schakelaar aan. Koppel (zie Bediening), houd de knop 5 seconden ingedrukt, bevestig "Nieuw filter?" met kort drukken en wacht tot het ijken klaar is (40 s).

## Aansluitschema

Het aansluitschema staat in `schema/Aansluitschema-afzuiging.pdf`, opgemaakt zoals EPLAN Electric P8 het afdrukt en
volgens de Europese normen: IEC/EN 61082-1 (opbouw, kruisverwijzing /blad.kolom), IEC/EN 60617 (symbolen), IEC/EN
81346-1/-2 (aanduidingen =AFZ +BOX -K1), IEC 61355 (documentsoort per blad), ISO 7200 (titelblok) en ISO 5457 (A3 met
kader). De bladen zijn ook los beschikbaar als `schema/blad-1.svg` tot `schema/blad-12.svg`.

| Blad | Documentsoort | Inhoud |
|---|---|---|
| 1 | &EAA titelblad | project- en installatiegegevens, de normen |
| 2 | &EAB inhoudsopgave | alle bladen |
| 3 | &EFS schema | voeding 24 V en 5 V: -T1, -X1, hoofdschakelaar -Q4, -F1, ompolingsbeveiliging -R13, -C1, -C2 en de regelaar -T3 |
| 4 | &EFS schema | ventilator: -Q2/-Q3 (24 V naar de ventilator, aan/uit vanaf GPIO7), M8-kabel -W2, PWM met -Q1 (0 % = stil), tacho met RC-filter (-R14, -C3) naar -K1 |
| 5 | &EFS schema | besturing -K1 (ESP32-C3), drukmeter -B1 (de "+"-poort afgeschermd), USB-C-koppeling -X8 / -W1 / -X7 naar de knop -S1 |
| 6 tot 10 | &EMA klemmenplan | -X1, -X7, -X8, -X9, -X10, een rij per klem met de doelen buiten en binnen |
| 11 | &ELU opstellingsplan | opbouw van de gaatjesprint -U1 (raster, plaatsing, draadbruggen, netlijst) |
| 12 | &EPC stuklijst | alle elektronica |

Aanduidingen volgens ISO/IEC 81346-2: -B sensor, -C condensator, -F zekering, -K besturing, -M motor, -Q schakelen
(hoofdschakelaar, transistoren, MOSFET), -R weerstand en diode, -S de knop, -T voeding en regelaar, -U de print,
-W kabel, -X klem, stekker en adapterprint.

Meet de draadkleuren van de ventilator na voor het solderen (datasheet van San Ace: rood +, zwart −, geel tacho, bruin PWM).

## Onderhoud: het filter vervangen

Dezelfde stappen staan in het bouwschema (uit `onderhoud.mjs`). Dit is het eindpunt van het filter: vervangen bij de melding "filter vervangen".

1. Zet de afzuiging uit met de knop en daarna met de schakelaar op de voorkant van de voedingsbox (de ventilator is dan spanningsloos).
2. Wacht 10 seconden tot de ventilator stilstaat. Grijp nooit in de module zolang je hem nog hoort draaien.
3. Doe handschoenen en een stofmasker FFP2 aan en houd een vuilniszak open naast het rooster.
4. Neem de RVS-plaat eraf en trek het filter aan de randen recht omhoog en horizontaal eruit (de lip buigt mee): het stof blijft bovenop.
5. Leg het filter meteen in de zak en sluit de zak. Niet uitkloppen, niet uitblazen, geen perslucht.
6. Neem de lip, de foamband en de instroomplaat af met een vochtige doek. Is de lip gescheurd of los, of de foamband plat, vervang ze.
7. Duw een nieuw interieurfilter MANN CU 20 013 (of gelijk: Bosch 1 987 435 066, Valeo 715828) recht naar onder door de lip tot op de foamband, de lange kant van voor naar achter en de pijl naar onder.
8. Kijk en voel rondom: de lip ligt overal naar onder gebogen tegen de zijkant van het filter, zonder kier.
9. Leg de RVS-plaat erop en zet de schakelaar aan. Houd de knop 5 seconden ingedrukt, bevestig "Nieuw filter?" met kort drukken en wacht tot het ijken klaar is.

### Na morsen

Een fles nagellak of remover tot 15 ml blijft in het filter (docs/Berekeningen.md, hoofdstuk 7). Toch altijd zo:

1. Zet de schakelaar op de box meteen uit en wacht tot de ventilator stilstaat. Veeg het rooster droog met keukenpapier.
2. Neem de RVS-plaat eraf. Het natte filter gaat in een zak en weg (ook als het nog maar half vol was).
3. Kijk met een zaklamp door het vingerrooster: is de instroomplaat droog en de waaier droog en schoon, ga dan naar de laatste stap.
4. Is er vloeistof voorbij het filter gekomen: trek de M8-stekker onder het blad uit, draai de vier klauwschroeven los en til de module eruit. Schroef de kuip met de ventilator los (4 x M3, van onderen) en dep alles droog. Reinig met een middel op alcohol, nooit met aceton.
5. Afkeuren en vervangen: een PETG-deel dat wit, zacht of plakkerig is geworden (aceton), of een lip die gezwollen is. Draait de waaier met de hand niet vrij en stil rond, of ruikt de motor verbrand: nieuwe ventilator.
6. Laat alles minstens een uur open drogen. Bouw weer in (kuip met de foamband, module, klauwen: contact plus een halve slag, M8-stekker).
7. Leg een nieuw filter in zoals bij het filter vervangen en ijk. De knop moet daarna "x Pa, y tpm" tonen zonder rode of oranje melding; anders uit laten en nakijken.

### Eens per jaar

1. Bij een filterwissel, met de schakelaar uit en de ventilator stil: zuig de instroomplaat en het vingerrooster af met een stofzuiger met een smal mondstuk.
2. Til de module eruit (zoals na morsen), schroef de kuip los en zuig de waaier, de lamellen en de ringsleuven af. Kijk of de waaier vrij draait, of de rubberbuffers en de foamband van de kuip heel zijn en of de klauwen en het rubber heel zijn.
3. Vervang het propje vlies op de "+"-poort van de drukmeter in de voedingsbox (deksel eraf, netsnoer uit).
4. Reinig de RVS-plaat met een middel op alcohol en droog ze af; vlekjes of roestpuntjes (RVS 430 is minder corrosievast dan 304) weg met een RVS-reiniger of een zachte schuurspons, in de richting van het borstelpatroon.
5. Druk de knop na de inbouw 5 seconden in en ijk opnieuw met een nieuw filter.

## Firmware

```bash
python -m pip install platformio
```

Er zijn twee programma's in één project: `knop` (scherm en bediening) en `module` (ventilator en drukmeter, in de box). Ze praten draadloos met elkaar. Beide hebben een task-watchdog van 3 s. Het regelhart (`include/regel.h`, `include/bediening.h`) is op de pc getest: `python -m platformio test -e native` (55 tests, alle geslaagd op 2026-11-12; de envs knop en module bouwen).

Knop: trek de USB-C-kabel uit de box en steek dat uiteinde in de computer.

```bash
cd voorbeelden/afzuiging/firmware
python -m platformio run -e knop -t upload
```

Box: steek een USB-C-kabel in de USB-C van de ESP32-C3, aan de rechterkant van de box.

```bash
python -m platformio run -e module -t upload
```

De knop gebruikt GFX Library for Arduino (CO5300-driver). Tekst en cijfers zijn in Inter (SIL OFL), vooraf anti-aliased gerenderd met `logo/knopfont.py` naar `src/knop/fonts.h`; het LB-logo komt uit `logo/knoplogo.py`. Een voorbeeld van alle schermen staat in `firmware/ui/schermen.html`. Het protocol (versie 5, met de publieke sleutels en het levensteken) staat in `firmware/include/protocol.h`, de sleutelafspraak (X25519 en SHA-256 uit mbedtls) in `firmware/include/sleutel.h`.

## Bestanden

| Bestand | Wat |
|---|---|
| `Afzuiging-alles-afdrukken.pdf` | **alles in één PDF om af te drukken**: deze README, het bouwschema, de werktekeningen, het aansluitschema, de freesmallen en de snijmal op ware grootte, de knopschermen, de materiaalstaat, het rekenblad, het meetplan, de risicoanalyse en de besparingen; afdrukken op 100 % (`node e2e/tools/alles-afzuiging-pdf.mjs`) |
| `Afzuiging.kcad` | assemblage van de afzuiging, de voedingsbox en de knop |
| `../bureau/Bureau.kcad` | het bureau met alles en de uitsparingen en sleuven in het blad |
| `../bureau/Tafelblad-detail.kcad` | een stuk blad met de twee huiden en de latten ertussen, met de afzuiging en de box (versie 7.2) |
| `laser/`, `print/` | DXF's (rooster, MDF-freesmallen) en STL's |
| `schema/` | aansluitschema (PDF en SVG), de opbouw van de print (`print-u1.mjs`), de papieren mallen op ware grootte, per doos een PDF: `Freesmal-afzuiging-1op1-A4.pdf` (uitsparing, 2 bladen), `Freesmal-knop-1op1-A4.pdf` (knopgat) en `Freesmal-voedingsbox-1op1-A4.pdf` (onderkant: box en sleuven), en `Snijmal-afdichtlip-1op1-A4.pdf` |
| `tekeningen/Werktekeningen-afzuiging.pdf` | werktekeningen A3 (ISO E): samenstelling met stuklijst (AFZ-00), doorsnede, alle zelfgemaakte delen (AFZ-01 tot AFZ-12), de bewerkingen in het blad (AFZ-20) en de MDF-freesmallen met de latten (AFZ-21); losse SVG's, `stuklijst.csv` en `prijslijst.csv` (prijs per stuk, totaal per regel en eindtotaal) ernaast |
| `tekeningen/Bouwschema-afzuiging.pdf` | bouwschema A4, met beelden uit Phlippo CAD |
| `docs/` | rekenblad (`berekeningen.py` maakt `Berekeningen.md`), meetplan, materiaalstaat, besparingen, risicoanalyse en CE |
| `firmware/` | PlatformIO-project voor de knop en de box |
| `maak-afzuiging.mjs`, `logo/*.py`, `schema/maak-schema.mjs`, `schema/maak-mallen.mjs` | generators; alle maten staan bovenaan in `maak-afzuiging.mjs` |

## Onderhoud en veiligheid

- **Filter:** vervang het (in een zak) als de knop "filter vervangen" meldt. Ijk daarna opnieuw ("Nieuw filter?" bevestigen; een ander merk: 3 s vasthouden).
- **Gebruik:** gebruik de afzuiging nooit zonder filter. Zonder filter of met een slecht liggend filter stopt de ventilator na 3 s ("gestopt: filter ontbreekt"); een kleine kier ziet de drukmeter niet: kijk bij elke wissel of de lip rondom aanligt.
- **Ventilatie:** de afzuiging blaast de gefilterde lucht terug in de salon (geen afvoer naar buiten, keuze van Ian). Dampen (aceton, monomeer) en het fijnste stof gaan erdoor: zorg voor aparte ventilatie en laat de blootstelling meten (poort L4).
- **Aceton:** het PETG onder de plaat kan er niet tegen. Een spat op de plaat meteen droog deppen; morsen: zie "Na morsen".
- **Netspanning:** 230 V zit alleen in de gekeurde netadapter in de box. Trek het netsnoer uit voor je de box opent.
- **Vrijgave:** zolang niet elke poort van `docs/Vrijgave-en-meetplan.md` groen is, is dit een prototype: niet gebruiken met klanten. De CE-vragen en de risicoanalyse staan in `docs/Risicoanalyse-en-CE.md`.
