# Kabeldoos voor de verlichting van de modelbaan, versie 5 (2026-11-15)

Eén doos onder de baan brengt alle lampen samen. 16 lichtgroepen, één per Modelbouwled-bordje, gaan aan en uit of
krijgen een knippereffect (knipperen, overweg, lasvlam, tl-buis). 16 ingangen nemen knoppen en sensoren (contact, reed,
NPN, **hallsensoren**). Alles bedien je met de gsm of tablet: de doos maakt haar eigen wifi **Treinbaan** met een
dashboard, en meldt zich als je wilt ook aan op de wifi van het huis.

Alle maten en onderdelen komen uit `maak-kabeldoos.mjs` (maten in `maten.mjs`), de modules en hun bedrading uit
`opbouw.mjs`. De berekeningen staan in `docs/Berekeningen.md`, de maten van de gekochte onderdelen met hun bron in
`docs/Maten-en-bronnen.md`, de eisen van Ian in `EISEN.md`.

**Versie 5 (Ian, 2026-11-15: "Als je met 2 lagen werkt is het te moeilijk om de kabels aan te sluiten"):** alles op
**één laag** in één langwerpige doos van **440,9 x 229,8 x 52,6**, geprint in **2 helften die in elkaar klikken en
gelijmd kunnen worden** ("De doos moet in elkaar kunnen klikken en nog kunnen lijmen"), binnen geen tussenwand. Links de
16 bordjes, rechts alle modules op palen in de bodem; alles is van bovenaf bereikbaar. De moduleplaat valt weg en de
**kabelgoten ook** (Ian: "Kabel goten mogen weg"): de draden lopen rechtstreeks van de tule naar hun klem. Ook nieuw: **alleen aan/uit** (Ian: "Dimmers zijn niet nodig", firmware 1.3.0) en
**hallsensoren** op de ingangen (Ian: "Zorg ook dat er hallsensoren binnen gelezen kunnen worden"). **Versie 4:**
kant-en-klare modules, enkel de DC-bus solderen. **Versie 3 (advies Fable 5.2):** klemlippen, DC-bus, polyfuse per
groep, waakhond, thuis-wifi, testmodus. **Versie 2:** kabelgoten van 28 hoog met klikdeksels.

## Opbouw

| Deel | Wat |
|---|---|
| Doos | PETG zwart, 440,9 x 229,8 x 52,6 mm (deksel inbegrepen), hangt met de bodem tegen de onderkant van de baan; het grijze deksel zit onderaan. Binnen 47 hoog: een MOSFET-module mag tot 39 mm hoog zijn (één verkoper noemt 39, getekend 15: AANNAME) |
| Linkerhelft (bordjes) | 224,9 x 229,8: 16 bordjes in 6 rijen (de plaatsen van versie 4), elk bordje op een steunrail tussen 2 palen en 4 lage **aanslagen** (4,9 hoog, onder de draadingangen) en vast in **4 klemlippen**; tussen de rijen 9,2 vrij voor de draden en een schroevendraaier; per klem een **gaatje van 2 x 2** in de bodem voor de leddraad (op een eilandje van 0,4); geen kabelgoten |
| Rechterhelft (modules) | 229,8 x 229,8 (met de klikhaken): elke module op palen Ø6 x 5 in de bodem, 2 klikhouders voor 6 WAGO-klemmen; aan de naad 11 vrij voor de draden van de bordjes |
| Naad | **2 klikhaken** (achter en voor, 14 lang, 1,6 dik, onderkant 45°) van de rechterhelft klikken met een nok van 0,6 in een kuiltje in de wand van de linkerhelft; **5 bodemlippen** lijnen uit; **lijmspleet 0,2** overal (2K-epoxy). Het deksel klikt met een **lip van 12** in 4 vingers onder de linkerhelft; de naad van het deksel ligt 2 mm naast die van de bak (de lip overlapt ze). Detail: TRN-06 |
| 16 bordjes | Modelbouwled "PCB met ingebouwde weerstand" (61,1 x 20,9, 14 hoog), in 5 rijen van 3 en één in rij 6 |
| MOSFET-modules (-Q1, -Q2) | 2 x 8 kanalen met optocouplers, 3,3 V-ingang: per groep een uitgang + en −, **de klemmen naar de bordjes** (groep 1 achteraan, zoals rij 1); de PCA9685 stuurt ze met dupontkabels |
| Uitgangsprint (-K2) | PCA9685: 16 uitgangen via I2C van de ESP, alleen volledig aan of uit (geen PWM) |
| Optocouplerprints (-K3, -K4) | 2 x 8 kanalen PC817 (3,6-24 V), **de ingangen naar de rechterwand**: de knoppen, sensoren en hallsensoren trekken IN naar 0 V |
| ESP (-K1 op -X6) | ESP32-S3-DevKitC-1 v1.1 (N16R8) in een **schroefklemadapter** met 44 klemmen; de 2 micro-USB-poorten achter een opening in de **voorwand** (flashen met de doos dicht) |
| Regelaar (-T2) | Joy-IT SBC-Buck02: 12 -> 5 V voor de ESP, met schroefklem (rechtsvoor) |
| Zekeringen | hoofdzekering 7,5 A (ATO in een houder met draden, -F1, achter de DC-bus); **per groep een polyfuse 0,5 A** (Bourns MF-R050, -F2..-F17) met één pootje in de klem n− van de MOSFET-module en het andere in een WAGO 221-2411 met de − van het bordje; de +12 V voor ingangen en sensoren een eigen polyfuse (-F18) |
| Ompoolbeveiliging | Schottkydiode SB560 (-R2) tussen L+ en 0 V, met haar pootjes in de verdeelklemmen |
| Verdeelklemmen | WAGO 221-415 achteraan in de rechterhelft, onder de DC-bus: -X1 (L+, 2 stuks), -X2 (0 V, 2 stuks), -X3 (+12 V sensoren), -X7 (3,3 V) |
| DC-bus | 5,5 x 2,5, 8 A (GlobTek JACK-L-PANEL-8A(R)) in de **achterwand van de rechterhelft**, boven de WAGO-klemmen |
| Netadapter | Mean Well GST90A12-P1M (12 V, 6,67 A, stekker 5,5 x 2,5 met + in het midden), gekeurd; 230 V komt niet in de doos |

- **Draden:** 18 kabelinvoeren Ø16,5 met een membraantule Wiska EMT 16: 5 in de linkerwand en 4 vooraan in de
  linkerhelft (leddraden), 3 vooraan en 2 achteraan in de rechterhelft, **4 in de rechterwand** (knoppen en sensoren,
  vlak bij de ingangen). De leddraden komen van boven (de baan) door de bodem: **per klem één gaatje van 2 x 2**, recht
  voor die klem (512 gaatjes, om en om in 2 rijen op 0,3 en 2,5 van de rand van het bordje, TRN-07): **elke draad door
  zijn eigen gaatje**, recht omhoog in zijn klem. Geen kabelgoten: elke draad loopt rechtstreeks naar zijn klem; de + en − van elk
  bordje van zijn eindklem door de vrije strook voor de rij naar de naad en recht in hun klem van de MOSFET-module (die
  staat met haar klemmen naar de bordjes): geen draad kruist over een klem.
- **Kabels ordenen:** bundel de draden per rij met een kabelbinder in de vrije strook voor de rij; een draad tussen de
  bordjes trek je eruit met het **haakje** van de spatel, een klemlip duw je open met haar **blad**.
- **Monteren:** de doos hangt aan 4 sleutelgaten in de bodem (2 per helft). Plak de boormal (TRN-00a en TRN-00b, 2 x A3
  op 100 %, de kruisen A en B over elkaar) onder de baan, draai 4 bolkopschroeven 4 x 20 half in, hang de doos met de
  grote gaten over de koppen en schuif ze 6 mm naar achteren.
- **Bedraden op werkhoogte:** schuif de doos 6 mm naar voren, hang de 2 geprinte **werkhaken** aan de 2 voorste
  schroeven en de doos met haar 2 voorste sleutelgaten aan de knoppen: ze hangt verticaal, 12 cm onder de baan. Laat
  elke bundel van de baan naar de doos een **kabellus van 50 cm**.
- **Geen verluchting nodig:** gewoon 1,7 W, hoogstens 5 W in de doos; binnen 2,1 K (hoogstens 5,8 K) warmer dan onder de
  baan (docs/Berekeningen.md, hoofdstuk 5).

## Aansluiten

| Wat | Waar |
|---|---|
| de netadapter | stekker in de DC-bus in de achterwand van de rechterhelft (+ in het midden) |
| een bordje (groep n) | de **+** aan de klem **n+** van zijn MOSFET-module, de **−** in de **WAGO 221-2411 van zijn polyfuse** (de polyfuse zit met haar andere pootje in de klem **n−**). Groep 1..8 = -Q1 kanaal 1..8 (achteraan), groep 9..16 = -Q2 kanaal 1..8. De + en − van de eindklemmen van een bordje nooit doorlussen naar een ander bordje |
| een led | aan een bordje: lange poot (+) aan de klemmenrij met de weerstanden, korte poot (−) aan de andere rij |
| een drukknop, schakelaar of reedcontact | tussen **IN n** van de optocouplerprint en **0 V** (-X2) |
| een **hallsensor** (Honeywell SS441A of een A3144-kloon, open collector) | + (pin 1) aan **+12 V** (-X3), − (pin 2) aan **0 V** (-X2), de uitgang (pin 3) aan **IN n**; in het dashboard de ingang op "Hallsensor (korte puls)" zetten (hieronder) |
| een andere sensor met NPN-uitgang (IR, open collector) | + aan **+12 V** (-X3), − aan **0 V** (-X2), de uitgang aan **IN n** |
| een sensor die zelf 12 V geeft (PNP) | **niet rechtstreeks**: kies een NPN-sensor, of laat de sensor een klein relais 12 V schakelen waarvan het contact tussen IN n en 0 V hangt |
| een kant-en-klare hallmodule voor Arduino (KY-003 en gelijk, met lampje en pull-up naar zijn eigen VCC) | **niet gebruiken**: op 5 V gevoed blijft de ingang half aan (12 V tegen 5 V door de led van de PC817), op 12 V brandt het lampje van de module met een weerstand voor 5 V. Neem de losse sensor |

Ingang 1..8 = -K3 IN1..IN8, ingang 9..16 = -K4 IN1..IN8. **Meer hallsensoren op één ingang** mag (parallel: de
uitgangen samen aan IN n, wired-OR): elke sensor zet de ingang aan. Elke sensor vraagt hoogstens 10 mA uit +12 V:
-F18 heeft plaats voor 19 sensoren samen (docs/Berekeningen.md, hoofdstuk 4). Met de magneet trekt de sensor 10,6 mA uit
de ingang (de SS441A mag 20 mA). Bordjes van 1K5 zijn gemaakt voor 20 V: op 12 V geven ze ongeveer 6 mA per led
(zwakker). Voor vol licht op 12 V: 1K.

## Draden labelen

Zet op elke draad een label aan beide uiteinden, met deze namen; ze komen overeen met het schema (`schema/`), de
groepen in het dashboard en het invulblad TRN-21 (om bij de baan te hangen):

| Draad | Label | Van | Naar |
|---|---|---|---|
| + van groep n | `G01+` … `G16+` | MOSFET-module, klem n+ | + van bordje n |
| − van groep n | `G01−` … `G16−` | WAGO 221-2411 van polyfuse -F(n+1) | − van bordje n |
| ingang n | `IN01` … `IN16` | optocouplerprint, klem IN | knop of sensor |
| leddraden | `G05 kerk` (groep en plaats) | bordje n | de lamp op de baan |

De 61 draden tussen de modules (met doorsnede, kleur en lengte) staan in de **interne draadlijst TRN-14**, hun plaats op
het **montageblad TRN-10**. Rij 1 = de 3 bordjes achteraan, rij 6 = bordje 16. Groep 1 is het linkse bordje van rij 1.

## Bouwen in deze volgorde

1. **Eerst de modules kopen en nameten (AANNAME):** de maten en gaten van de MOSFET-modules, de schroefklemadapter en de
   SBC-Buck02 staan niet in een datablad. Komen ze niet overeen met TRN-10: de maten in `opbouw.mjs` (MODULES)
   aanpassen, `node voorbeelden/treinverlichting/maak-kabeldoos.mjs`, en pas dan de rechterhelft printen (zij draagt nu
   de palen; de moduleplaat is weg).
2. **Printen:** bak links en rechts, deksel links en rechts, hulpstukken (hieronder).
3. **Helften passen:** op een vlakke tafel tegen elkaar schuiven, de 5 bodemlippen in hun uitsparingen, tot de 2
   klikhaken klikken (± 10 N per haak). Uit elkaar: de punt van elke haak met een kleine schroevendraaier van de wand weg
   trekken (van binnen, bovenaan bereikbaar).
4. **Modules in de rechterhelft** (montageblad TRN-10): elke module met plaatschroeven 3 x 8 op haar palen (de PCA9685
   met 2,5 x 6), de 6 WAGO-klemmen in hun klikhouders, de DC-bus in de achterwand.
5. **Bedraden volgens TRN-14** (W01..W61): dupontkabels op de pinnen van de PCA9685 en de MOSFET-modules, gestripte
   draden in de schroef- en WAGO-klemmen. -R1, -R2 en -F18 met hun pootjes in de klemmen. **Niet solderen**, behalve de 2
   lippen van de DC-bus (pen = +, huls = −).
6. **Proefopstelling op tafel** (de rechterhelft alleen): één bordje op groep 1, één knop op IN01, eventueel een
   hallsensor op IN02. Firmware flashen (micro-USB "UART", `firmware/README.md`), meten met het **meetblad TRN-20**.
7. **Helften verbinden:** inklikken, eventueel eerst 2K-epoxy in de voeg (stootvlakken, bodemlippen, buitenkant van de
   haken), 24 uur op de tafel laten uitharden (TRN-06).
8. Bordjes in hun klemlippen, de doos onder de baan, op de werkhaken, de draden van de bordjes rechtstreeks naar hun
   klemmen (per rij gebundeld), labelen, aansluiten, het meetblad afwerken.
9. **Deksel:** de rechterhelft met de lip onder de linkerhelft schuiven tot de 4 nokken klikken (eventueel lijm in de
   sponning), dan het deksel met 6 plaatschroeven 3 x 12 op de bak.

## Bediening

Verbind de gsm met wifi **Treinbaan** (wachtwoord **treinbaan**, te wijzigen bij Instellingen); het dashboard opent
vanzelf (anders `http://192.168.4.1` of `http://treinbaan.local`). De rode knop "Alles uit" staat altijd bovenaan.
Tabbladen: Groepen, Scènes, Functies, Ingangen, Instellingen.

Sinds firmware 1.3.0 is elke lichtgroep **alleen aan of uit** (geen dimmers). In het dashboard, tabblad Groepen, staat
per groep een schakelaar; het lampje ernaast brandt als de groep echt aan is (bij knipperen in het ritme mee). Een groep
kan ook een effect krijgen dat alleen aan/uit gebruikt: knipperen, om beurten (overweg), lasvlam of tl-buis. Een scène
kies je bij Scènes, "Scènes wijzigen of wissen", "Groepen kiezen": tik de groepen aan die moeten branden. In een functie
kies je per stap welke groepen aan, uit of "aan/uit wisselen".

**Hallsensor instellen:** een hallsensor onder het spoor (magneet onder de loc) sluit je aan zoals hierboven. In het
dashboard, tabblad Ingangen, bij die ingang "Instellen": kies "Hallsensor (korte puls)". "Na een puls actief houden"
staat op 0,3 s. Kies dan wat er moet gebeuren: Drukknop = elke magneet start een functie; Sensor = de eerste magneet
start functie A, pas als er een aantal seconden geen magneet meer kwam functie B (bv. een overweg die knippert zolang de
trein passeert). Bewaren. De doos ziet elke puls vanaf 1 ms, ook als de trein snel rijdt. Per ingang toont het
dashboard live de toestand en een teller (te wissen met "Teller op 0").

Bij Instellingen ook:

- **Thuis-wifi:** naam en wachtwoord van het thuisnet; de hotspot Treinbaan blijft. Op het thuisnet: `http://treinbaan.local`.
- **Testmodus:** "looplicht" (groep 1 tot 16 om de beurt aan) of één groep vast aan (om de stroom te meten).
- **Firmware bijwerken:** een nieuw `firmware.bin` kiezen; de oude blijft tot de nieuwe goed is (2 app-slots).

Standaard is **ingang 1 een drukknop "alles aan/uit"**: hang er een knop aan bij de baan. **Wachtwoord vergeten:** de
knop BOOT op de ESP 5 s indrukken (het lampje wordt blauw): het wachtwoord is weer `treinbaan`. Het lampje op de ESP:
groen = wifi aan, rood = de uitgangsprint (PCA9685) antwoordt niet. De firmware herstart vanzelf als ze vastloopt
(waakhond, 8 s) en zet de hotspot opnieuw aan als hij wegvalt. Instellingen van firmware 1.2 laden zonder melding (een
helderheid wordt aan, vuur, tv en ademen worden aan zonder effect). Meer: `firmware/README.md`.

## Uitbreiden

Tot 32 groepen: een tweede PCA9685 op adres 0x41 (de brug A0 op die print dicht), SDA, SCL, OE, VCC en GND parallel aan
de eerste, met 2 MOSFET-modules en 16 polyfuses in een tweede doos ernaast; de firmware bouwen met `-DTREIN_GROEPEN=32`
(env `native32` toont dat alle logica werkt). Vrij op de ESP voor andere uitbreidingen: GPIO 11, 39, 42, 47 en 48.

## Bestellijst

Richtprijzen, opgezocht op 2026-11-13 en 2026-11-15 (niet besteld); "nagekeken" = de prijs stond zo op de
productpagina, anders AANNAME. Verzendkosten niet inbegrepen (4 tot 5 winkels).

| Onderdeel | Aantal | Type | Winkel | Prijs per stuk | Totaal |
|---|--:|---|---|--:|--:|
| Netadapter 12 V, 6,67 A, C14, stekker 5,5 x 2,5 | 1 | Mean Well GST90A12-P1M | Reichelt, Conrad | € 32,00 | € 32,00 |
| Netsnoer C13 | 1 | gewoon pc-netsnoer | | € 5,00 | € 5,00 |
| DC-chassisbus 5,5 x 2,5, 8 A | 1 | GlobTek JACK-L-PANEL-8A(R) | Mouser | € 4,00 | € 4,00 |
| Zekeringhouder ATO met draden + zekering 7,5 A | 1 | Littelfuse FHAC0001ZXJ of gelijk | Conrad, Reichelt | € 3,50 | € 3,50 |
| Schottkydiode 5 A, 60 V | 1 | SB560 | Reichelt | € 0,30 | € 0,30 |
| ESP32-S3-DevKitC-1-N16R8 | 1 | Espressif (origineel, v1.1) | Kiwi Electronics, Otronic | € 16,00 | € 16,00 |
| Schroefklemadapter ESP32-S3 44-pin (23 en 25,5 mm) | 1 | ESP32-S3 Expansion Board 44P | Amazon.de, AliExpress | € 8,00 | € 8,00 |
| Uitgangsprint 16 kanalen (PCA9685), pinnen gesoldeerd | 1 | AZ-Delivery PCA9685 | AZ-Delivery, Amazon.de | € 6,00 | € 6,00 |
| MOSFET-module 8 kanalen, optocouplers, 3,3 V-versie | 2 | "8 Channel MOSFET PLC Amplifier" (versie B) | Amazon.de (± € 21), AliExpress (± € 8) | € 20,99 | € 41,98 |
| Optocouplerprint PC817, 8 kanalen, 3,6-24 V | 2 | MakerMind RBS18122 (nagekeken) | roboter-bausatz.de | € 3,95 | € 7,90 |
| Regelaar 9-35 V -> 5 V, 5 A, schroefklem | 1 | Joy-IT SBC-Buck02 | Conrad | € 8,99 | € 8,99 |
| Polyfuse 0,5 A, 60 V, radiaal | 17 | Bourns MF-R050 | Reichelt, Mouser | € 0,30 | € 5,10 |
| Verbindingsklem 5-voudig | 6 | WAGO 221-415 | bouwmarkt, Conrad | € 0,90 | € 5,40 |
| Doorverbinder 1 + 1 | 16 | WAGO 221-2411 | Conrad, Reichelt | € 0,90 | € 14,40 |
| Weerstand 1 kΩ, 0,25 W, met draden | 1 | | | € 0,10 | € 0,10 |
| Dupontkabels 20 cm, 40 female-female en 40 female-male | 1 set | | AZ-Delivery, Amazon.de | € 6,00 | € 6,00 |
| Plaatschroef 3 x 8 bolkop (24) en 2,5 x 6 bolkop (4) | 28 | modules op de palen | | € 0,05 | € 1,40 |
| Plaatschroef 3 x 12 verzonken | 6 | het deksel (2 links, 4 rechts) | | € 0,08 | € 0,48 |
| Membraantule Wiska EMT 16 LG (10062559) | 18 | M16, IP66, lichtgrijs | | € 0,40 | € 7,20 |
| Bolkopschroef 4 x 20 (hout) | 4 | sleutelgaten (2 per helft) | | € 0,05 | € 0,20 |
| 2-componentenlijm epoxy, 24 ml (de naad, eventueel) | 1 | bv. UHU Plus Schnellfest of Bison Epoxy Universal | bouwmarkt | € 8,00 | € 8,00 |
| Montagedraad 0,14, 0,25, 0,5 en 0,75 mm² | 1 | | | € 6,00 | € 6,00 |
| Kabelbinders 2,5 x 100 mm | 1 zakje | | | € 3,00 | € 3,00 |
| Kabelmarkering (cijfers en letters) of vlaggetjes | 1 | de labels van [Draden labelen](#draden-labelen) | | € 4,00 | € 4,00 |
| **Totaal kopen** | | | | | **€ 194,95** |
| *Optioneel:* hallsensor unipolair, open collector, 3,8-30 V | per stuk | Honeywell SS441A (of een A3144-kloon, 4,5-24 V) | Farnell, Mouser (± € 2,50, AANNAME); A3144 per 10 ± € 6 | € 2,50 | |
| *Optioneel:* neodymiummagneet Ø5 x 2 (onder de loc) | per stuk | N35 | | € 0,20 | |

Versie 4 kostte € 186,95: de moduleplaat met haar 2 schroeven 3 x 10 valt weg, het deksel krijgt 6 schroeven in plaats
van 4 (samen even duur) en de lijm komt erbij (€ 8,00). De naad heeft geen schroeven, inserts of paspennen nodig: de
klikhaken, de bodemlippen en de lip van het deksel zijn geprint. De 16 Modelbouwled-bordjes heb je al; een extra kost
€ 9,75 (Modelbouwled.nl). Filament: ongeveer 495 g PETG zwart (bak) en 420 g grijs (deksel, hulpstukken), samen
ongeveer € 19.

## Printen (Elegoo Centauri Carbon, PETG, zonder support)

| Bestand | Stand | Maat (mm) | Ongeveer |
|---|---|---|---|
| `print/Kabeldoos-bak-links.stl` | de bodem op het bed | 224,9 x 229,8 x 49,4 | 255 g zwart, 10 uur |
| `print/Kabeldoos-bak-rechts.stl` | de bodem op het bed | 229,8 x 229,8 x 49,4 | 240 g zwart, 10 uur |
| `print/Kabeldoos-deksel-links.stl` | de **buitenkant** op het bed | 226,9 x 229,8 x 4,7 | 205 g grijs, 6 uur |
| `print/Kabeldoos-deksel-rechts.stl` | de **binnenkant** op het bed (de lip ligt op het bed) | 226,0 x 229,8 x 3,2 | 200 g grijs, 6 uur |
| `print/Hulpstukken.stl` | plat op het bed | 140,0 x 46,0 x 11,4 (2 werkhaken, spatel) | 15 g grijs, 1 uur |

Elk deel is hoogstens 230 x 230 en past op het bed van 256 x 256 naast de vrije hoek voor het filamentmes (rechtsvoor
10 x 20), met een skirt erbij: leg het deel in het midden van het bed. Instellingen zoals bij de afzuiging (0,2 mm,
4 wanden, 30 % gyroid). De klemlippen zijn 0,8 dik en de klikhaken 1,6: print de bakhelften
wat trager (buitenwanden 40 mm/s) en zonder "ironing". De klikhaken steken 14 mm voorbij de naad met een onderkant van
45°: geen support nodig (in de slicer "support" uit laten). Het naadvlak van beide helften moet recht zijn: geen "brim"
aan de naad.

## Bestanden

| Bestand | Wat |
|---|---|
| `Kabeldoos.kcad` | de hele doos met de 2 helften, het deksel, alle modules, bordjes en schroeven |
| `Kabeldoos-bak-links.kcad`, `Kabeldoos-bak-rechts.kcad`, `Kabeldoos-deksel-links.kcad`, `Kabeldoos-deksel-rechts.kcad`, `Hulpstukken.kcad` | de geprinte delen apart |
| `maak-kabeldoos.mjs` | de generator: indeling, de 2 bakhelften, de naad (klikhaken, lippen, klikberekening), het deksel in 2 helften, assemblage; maten in `maten.mjs`, klemlippen en hulpstukken in `hulpstukken.mjs`, de gekochte onderdelen in `onderdelen.mjs`, de modules en hun bedrading in `opbouw.mjs` |
| `print/` | de STL's (uit de exacte vorm, dicht en manifold) |
| `tekeningen/Werktekeningen-kabeldoos.pdf` | boormal op ware grootte over 2 A3-bladen met uitlijnkruisen (TRN-00a, TRN-00b), bak links (TRN-01) en rechts (TRN-02), hulpstukken (TRN-03), deksel links (TRN-04) en rechts (TRN-05), de naad met klikhaken en lijmvoeg (TRN-06), de gaatjes voor de leddraden (TRN-07), montageblad van de rechterhelft (TRN-10), interne draadlijst (TRN-14), meetblad (TRN-20, A4), invulblad (TRN-21, A4) |
| `tekeningen/Bouwschema-kabeldoos.pdf` | de stappen met beelden, van printen tot aanzetten |
| `Kabeldoos-alles-afdrukken.pdf` | alles samen om af te drukken (README, bouwschema, tekeningen, schema, dashboard, rekenblad) |
| `schema/` | aansluitschema (`Aansluitschema-kabeldoos.pdf` en per blad een SVG) in 16 bladen, opgemaakt zoals EPLAN Electric P8 en volgens IEC/EN 61082-1, 60617, 81346 en ISO 7200 |
| `firmware/` | PlatformIO-project met het dashboard (versie 1.3.0), 85 tests (ook met 32 groepen) |
| `docs/` | rekenblad, maten met bronnen, de maattekening van de ESP |
| `EISEN.md` | de eisen van Ian |

## Opnieuw maken (vanuit de map van de repo)

| Wat | Opdracht |
|---|---|
| de CAD-bestanden | `node voorbeelden/treinverlichting/maak-kabeldoos.mjs` |
| aansluitschema (SVG en html) | `node voorbeelden/treinverlichting/schema/maak-schema.mjs` |
| rekenblad | `python voorbeelden/treinverlichting/docs/berekeningen.py` |
| tests (onderdelen, rebuild per bakhelft, naad, klemlippen, assemblage, B-rep, modules en bedrading) | `VOORBEELDEN=1 npx vitest run src/qa/qaTrein.test.ts src/qa/tekeningenTrein.test.ts src/qa/schemaNorm.test.ts` |
| STL's | `VOORBEELDEN=1 TREIN_STL=1 npx vitest run src/qa/qaTrein.test.ts -t "B-rep"` |
| tekeningen (SVG) | `VOORBEELDEN=1 TREIN_TEKENINGEN=1 npx vitest run src/qa/tekeningenTrein.test.ts` |
| PDF's van schema en tekeningen | `node e2e/tools/trein-pdf.mjs` |
| bouwschema, beelden, alles-PDF (de app met test-hooks op E2E_URL) | `node e2e/tools/bouwschema-trein.mjs`, `node e2e/tools/look-trein.mjs`, `node e2e/tools/trein-v5-shots.mjs <map>`, `node e2e/tools/alles-trein-pdf.mjs` |
| de webpagina | `python voorbeelden/treinverlichting/app/maak-app.py` |
| firmware-tests | in `firmware/`: `python -m platformio test -e native` en `-e native32` |
