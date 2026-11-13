# Kabeldoos voor de verlichting van de modelbaan, versie 4 (2026-11-13)

Eén doos onder de baan brengt alle lampen samen. 16 lichtgroepen, één per Modelbouwled-bordje, gaan aan en uit, dimmen
of krijgen een effect (dag/nacht, vuur, tv, lasvlam, knipperende overweg). 16 ingangen nemen knoppen en sensoren
(contact, reed, NPN). Alles bedien je met de gsm of tablet: de doos maakt haar eigen wifi **Treinbaan** met een
dashboard, en meldt zich als je wilt ook aan op de wifi van het huis.

Alle maten en onderdelen komen uit `maak-kabeldoos.mjs`, de modules en hun bedrading uit `opbouw.mjs`. De berekeningen
staan in `docs/Berekeningen.md`, de maten van de gekochte onderdelen met hun bron in `docs/Maten-en-bronnen.md`, de eisen
van Ian in `EISEN.md`.

**Versie 4 (Ian: "zoveel mogelijk printjes die ik gewoon kan bestellen"):** geen zelfgesoldeerde gaatjesprints meer.
Alle elektronica zijn kant-en-klare modules op één geprinte **moduleplaat** boven de bordjes: 2 MOSFET-modules (8
kanalen), 2 optocouplerprints (8 kanalen), de PCA9685, de ESP in een schroefklemadapter, een regelaar 12 -> 5 V en
WAGO-verbindingsklemmen. Alles gaat met schroefklemmen, WAGO-klemmen en dupontkabels; **het enige soldeerwerk zijn de 2
lippen van de DC-bus.** De doos wordt 66,8 hoog (was 44,4). **Versie 3 (advies Fable 5.2):** klemlippen, DC-bus,
polyfuse per groep, waakhond, thuis-wifi, testmodus. **Versie 2:** één doos van 229,8 x 229,8 met kabelgoten van 28 hoog
met klikdeksels.

## Opbouw

| Deel | Wat |
|---|---|
| Doos | PETG zwart, 229,8 x 229,8 x 66,8 mm (deksel inbegrepen), hangt met de bodem tegen de onderkant van de baan; het grijze deksel zit onderaan |
| Kabelgoten | 9 goten met vingers en sleuven, 28 hoog: één langs de achterwand, één tussen elke twee rijen (5,4 breed), één langs de linker- en de rechterwand (11 breed). Een grijs klikdeksel per goot; vol 59 % als de draden van elk bordje door de sleuf onder dat bordje binnenkomen (docs/Berekeningen.md, hoofdstuk 6) |
| 16 bordjes | Modelbouwled "PCB met ingebouwde weerstand" (61,1 x 20,9, 14 hoog), in 5 rijen van 3 en één in rij 6, elk in **4 klemlippen** (ook met het deksel eraf en de doos ondersteboven blijft het zitten) |
| Moduleplaat | PETG grijs, 220 x 199 x 3,5, ligt op de gootdeksels: achteraan onder een richel in de achterwand, vooraan 2 schroeven 3 x 10 in 2 palen. Paaltjes op de gaten van elke module, 2 klikhouders voor 6 WAGO-klemmen. Vooraan 21,5 vrij: de **stijgruimte** waar alle draden naar boven gaan. Plaat eruit (2 schroeven): de bordjes en goten liggen vrij |
| MOSFET-modules (-Q1, -Q2) | 2 x 8 kanalen met optocouplers, 3,3 V-ingang (PWM): per groep een uitgang + en −; de PCA9685 stuurt ze met dupontkabels |
| PWM-print (-K2) | PCA9685: 16 kanalen, 12 bit, 1 kHz, via I2C van de ESP |
| Optocouplerprints (-K3, -K4) | 2 x 8 kanalen PC817 (3,6-24 V): de knoppen en sensoren trekken IN naar 0 V |
| ESP (-K1 op -X6) | ESP32-S3-DevKitC-1 v1.1 (N16R8) in een **schroefklemadapter** met 44 klemmen; de 2 micro-USB-poorten bij een opening in de rechterwand (flashen met de doos dicht) |
| Regelaar (-T2) | Joy-IT SBC-Buck02: 12 -> 5 V voor de ESP, met schroefklem |
| Zekeringen | hoofdzekering 7,5 A (ATO in een houder met draden, -F1); **per groep een polyfuse 0,5 A** (Bourns MF-R050, -F2..-F17) met één pootje in de klem n− van de MOSFET-module en het andere in een WAGO 221-2411 met de − van het bordje; de +12 V voor ingangen en sensoren een eigen polyfuse (-F18) |
| Ompoolbeveiliging | Schottkydiode SB560 (-R2) tussen L+ en 0 V, met haar pootjes in de verdeelklemmen: met een verkeerde adapter geleidt ze en schakelt de adapter af of smelt -F1 |
| Verdeelklemmen | WAGO 221-415: -X1 (L+, 2 stuks), -X2 (0 V, 2 stuks), -X3 (+12 V sensoren), -X7 (3,3 V) |
| DC-bus | 5,5 x 2,5, 8 A (GlobTek JACK-L-PANEL-8A(R)) in de linkerwand, boven de moduleplaat: de stekker van de adapter gaat erin, niets doorknippen |
| Netadapter | Mean Well GST90A12-P1M (12 V, 6,67 A, stekker 5,5 x 2,5 met + in het midden), gekeurd; 230 V komt niet in de doos |

- **Draden:** de leddraden komen van boven door de draadsleuven in de bodem (onder elke goot één per bordje), of door de
  kabelinvoeren: 5 in de linkerwand, 5 in de rechterwand en 8 vooraan, 18 ronde gaten Ø16,5 met elk een membraantule
  Wiska EMT 16. De draden van de bordjes naar de modules lopen door de goten naar voren (rij 7, vrij) en daar in de
  stijgruimte omhoog naar de moduleplaat; laat ze 15 cm langer dan nodig, zodat de plaat eruit kan.
- **Kabels ordenen:** elke draad gaat recht uit zijn klem door een sleuf de goot in. Een goot tussen twee rijen is 5,4
  breed: een gootdeksel til je op met het blad van de **spatel**, een draad trek je eruit met haar **haakje**.
- **Monteren:** de doos hangt aan 4 sleutelgaten in de bodem van de zijgoten. Plak de boormal (TRN-00, A3 op 100 %)
  onder de baan, draai 4 bolkopschroeven 4 x 20 half in, hang de doos met de grote gaten over de koppen en schuif ze
  6 mm naar achteren.
- **Bedraden op werkhoogte:** schuif de doos 6 mm naar voren, hang de 2 geprinte **werkhaken** aan de 2 voorste
  schroeven en de doos met haar 2 voorste sleutelgaten aan de knoppen: ze hangt verticaal, 12 cm onder de baan. Laat
  elke bundel van de baan naar de doos een **kabellus van 50 cm**.
- **Geen verluchting nodig:** gewoon 1,7 W, hoogstens 4,9 W in de doos; binnen 2,9 K (hoogstens 8,6 K) warmer dan onder
  de baan (docs/Berekeningen.md, hoofdstuk 5).

## Aansluiten

| Wat | Waar |
|---|---|
| de netadapter | stekker in de DC-bus in de linkerwand (+ in het midden) |
| een bordje (groep n) | de **+** aan de klem **n+** van zijn MOSFET-module, de **−** in de **WAGO 221-2411 van zijn polyfuse** (de polyfuse zit met haar andere pootje in de klem **n−**). Groep 1..8 = -Q1 kanaal 1..8, groep 9..16 = -Q2 kanaal 1..8. De + en − van de eindklemmen van een bordje nooit doorlussen naar een ander bordje |
| een led | aan een bordje: lange poot (+) aan de klemmenrij met de weerstanden, korte poot (−) aan de andere rij |
| een drukknop, schakelaar of reedcontact | tussen **IN n** van de optocouplerprint en **0 V** (-X2) |
| een sensor met NPN-uitgang (hall, IR, open collector) | + aan **+12 V** (-X3), − aan **0 V** (-X2), de uitgang aan **IN n** |
| een sensor die zelf 12 V geeft (PNP) | **niet rechtstreeks**: kies een NPN-sensor, of laat de sensor een klein relais 12 V schakelen waarvan het contact tussen IN n en 0 V hangt |

Ingang 1..8 = -K3 IN1..IN8, ingang 9..16 = -K4 IN1..IN8. Bordjes van 1K5 zijn gemaakt voor 20 V: op 12 V geven ze
ongeveer 6 mA per led (zwakker). Voor vol licht op 12 V: 1K.

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
het **montageblad TRN-10**. Rij 1 = de 3 bordjes het verst van de DC-bus (achteraan), rij 6 = bordje 16. Groep 1 is het
linkse bordje van rij 1.

## Bouwen in deze volgorde

1. Printen: bak, deksel, moduleplaat, gootdeksels, hulpstukken.
2. **Modules op de moduleplaat** (montageblad TRN-10): elke module met plaatschroeven 3 x 8 op haar paaltjes (de PCA9685
   met 2,5 x 6), de 6 WAGO-klemmen in hun klikhouders. Meet eerst de gaten van de modules met een AANNAME na (hieronder).
3. **Bedraden volgens TRN-14** (W01..W61): dupontkabels op de pinnen van de PCA9685 en de MOSFET-modules, gestripte
   draden in de schroef- en WAGO-klemmen. De weerstand -R1, de diode -R2 en de polyfuse -F18 met hun pootjes in de
   klemmen. **Niet solderen**, behalve de 2 lippen van de DC-bus (pen = +, huls = −).
4. **Proefopstelling op tafel:** de plaat met de DC-bus, één bordje op groep 1 (met zijn polyfuse) en één knop op IN01.
   Firmware flashen (micro-USB "UART", `firmware/README.md`), meten met het **meetblad TRN-20**: ook of de modules
   schakelen zoals de firmware verwacht (stap 8 en 9).
5. Bordjes in hun klemlippen, de doos onder de baan, op de werkhaken, de draden van de bordjes naar voren en omhoog,
   labelen, de moduleplaat erin (achteraan onder de richel, vooraan 2 schroeven), aansluiten, het meetblad afwerken.

**Eerst nameten (AANNAME):** de maten en gaten van de MOSFET-modules, de schroefklemadapter en de SBC-Buck02 staan niet
in een datablad. Komen ze niet overeen met TRN-10: de maten in `opbouw.mjs` (MODULES) aanpassen,
`node voorbeelden/treinverlichting/maak-kabeldoos.mjs` en alleen de moduleplaat opnieuw printen (3 uur).

## Bediening

Verbind de gsm met wifi **Treinbaan** (wachtwoord **treinbaan**, te wijzigen bij Instellingen); het dashboard opent
vanzelf (anders `http://192.168.4.1` of `http://treinbaan.local`). De rode knop "Alles uit" staat altijd bovenaan.
Tabbladen: Groepen, Scènes, Functies, Ingangen, Instellingen. Bij Instellingen ook:

- **Thuis-wifi:** naam en wachtwoord van het thuisnet; de hotspot Treinbaan blijft. Op het thuisnet: `http://treinbaan.local`.
- **Testmodus:** "looplicht" (groep 1 tot 16 om de beurt vol aan) of één groep vast vol aan (om de stroom te meten).
- **Firmware bijwerken:** een nieuw `firmware.bin` kiezen; de oude blijft tot de nieuwe goed is (2 app-slots).

Standaard is **ingang 1 een drukknop "alles aan/uit"**: hang er een knop aan bij de baan. **Wachtwoord vergeten:** de
knop BOOT op de ESP 5 s indrukken (het lampje wordt blauw): het wachtwoord is weer `treinbaan`. Het lampje op de ESP:
groen = wifi aan, rood = de PWM-print antwoordt niet. De firmware herstart vanzelf als ze vastloopt (waakhond, 8 s) en
zet de hotspot opnieuw aan als hij wegvalt. Meer: `firmware/README.md`.

## Uitbreiden

Tot 32 groepen: een tweede PCA9685 op adres 0x41 (de brug A0 op die print dicht), SDA, SCL, OE, VCC en GND parallel aan
de eerste, met 2 MOSFET-modules en 16 polyfuses in een tweede doos ernaast; de firmware bouwen met `-DTREIN_GROEPEN=32`
(env `native32` toont dat alle logica werkt). Vrij op de ESP voor andere uitbreidingen: GPIO 11, 39, 42, 47 en 48.

## Bestellijst

Richtprijzen, opgezocht op 2026-11-13 (niet besteld); "nagekeken" = de prijs stond zo op de productpagina, anders
AANNAME. Verzendkosten niet inbegrepen (4 tot 5 winkels).

| Onderdeel | Aantal | Type | Winkel | Prijs per stuk | Totaal |
|---|--:|---|---|--:|--:|
| Netadapter 12 V, 6,67 A, C14, stekker 5,5 x 2,5 | 1 | Mean Well GST90A12-P1M | Reichelt, Conrad | € 32,00 | € 32,00 |
| Netsnoer C13 | 1 | gewoon pc-netsnoer | | € 5,00 | € 5,00 |
| DC-chassisbus 5,5 x 2,5, 8 A | 1 | GlobTek JACK-L-PANEL-8A(R) | Mouser | € 4,00 | € 4,00 |
| Zekeringhouder ATO met draden + zekering 7,5 A | 1 | Littelfuse FHAC0001ZXJ of gelijk | Conrad, Reichelt | € 3,50 | € 3,50 |
| Schottkydiode 5 A, 60 V | 1 | SB560 | Reichelt | € 0,30 | € 0,30 |
| ESP32-S3-DevKitC-1-N16R8 | 1 | Espressif (origineel, v1.1) | Kiwi Electronics, Otronic | € 16,00 | € 16,00 |
| Schroefklemadapter ESP32-S3 44-pin (23 en 25,5 mm) | 1 | ESP32-S3 Expansion Board 44P | Amazon.de, AliExpress | € 8,00 | € 8,00 |
| PWM-print 16 kanalen, pinnen gesoldeerd | 1 | AZ-Delivery PCA9685 | AZ-Delivery, Amazon.de | € 6,00 | € 6,00 |
| MOSFET-module 8 kanalen, optocouplers, 3,3 V-versie | 2 | "8 Channel MOSFET PLC Amplifier" (versie B) | Amazon.de (± € 21), AliExpress (± € 8) | € 20,99 | € 41,98 |
| Optocouplerprint PC817, 8 kanalen, 3,6-24 V | 2 | MakerMind RBS18122 (nagekeken) | roboter-bausatz.de | € 3,95 | € 7,90 |
| Regelaar 9-35 V -> 5 V, 5 A, schroefklem | 1 | Joy-IT SBC-Buck02 | Conrad | € 8,99 | € 8,99 |
| Polyfuse 0,5 A, 60 V, radiaal | 17 | Bourns MF-R050 | Reichelt, Mouser | € 0,30 | € 5,10 |
| Verbindingsklem 5-voudig | 6 | WAGO 221-415 | bouwmarkt, Conrad | € 0,90 | € 5,40 |
| Doorverbinder 1 + 1 | 16 | WAGO 221-2411 | Conrad, Reichelt | € 0,90 | € 14,40 |
| Weerstand 1 kΩ, 0,25 W, met draden | 1 | | | € 0,10 | € 0,10 |
| Dupontkabels 20 cm, 40 female-female en 40 female-male | 1 set | | AZ-Delivery, Amazon.de | € 6,00 | € 6,00 |
| Plaatschroef 3 x 8 bolkop (24) en 2,5 x 6 bolkop (4) | 28 | modules op de paaltjes | | € 0,05 | € 1,40 |
| Plaatschroef 3 x 12 (deksel, 4) en 3 x 10 (moduleplaat, 2) verzonken | 6 | | | € 0,08 | € 0,48 |
| Membraantule Wiska EMT 16 LG (10062559) | 18 | M16, IP66, lichtgrijs | | € 0,40 | € 7,20 |
| Bolkopschroef 4 x 20 (hout) | 4 | sleutelgaten in de zijgoten | | € 0,05 | € 0,20 |
| Montagedraad 0,14, 0,25, 0,5 en 0,75 mm² | 1 | | | € 6,00 | € 6,00 |
| Kabelbinders 2,5 x 100 mm | 1 zakje | | | € 3,00 | € 3,00 |
| Kabelmarkering (cijfers en letters) of vlaggetjes | 1 | de labels van [Draden labelen](#draden-labelen) | | € 4,00 | € 4,00 |
| **Totaal kopen** | | | | | **€ 186,95** |

Versie 3 (gaatjesprints) kostte € 148,67: de kant-en-klare modules kosten € 38,28 meer, vooral de 2 MOSFET-modules van
Amazon.de (bij AliExpress ± € 26 minder, maar 2 tot 4 weken onderweg). Wat wegvalt: 8 adapterprintjes met 16 MOSFET's
en voetjes, 4 optocouplers LTV-844, de P-MOSFET, de Pololu-regelaar, 50 printklemmen, de gaatjesprint, de
SMD-weerstanden en -polyfuses, en 4 tot 5 uur solderen. De 16 Modelbouwled-bordjes heb je al; een extra kost € 9,75
(Modelbouwled.nl). Filament: ongeveer 420 g PETG zwart (bak) en 330 g grijs (deksel, moduleplaat, gootdeksels,
hulpstukken), samen ongeveer € 16.

## Printen (Elegoo Centauri Carbon, PETG, zonder support)

| Bestand | Stand | Maat (mm) | Ongeveer |
|---|---|---|---|
| `print/Kabeldoos-bak.stl` | de bodem op het bed | 229,8 x 229,8 x 64,4 | 420 g zwart, 17 uur |
| `print/Kabeldoos-deksel.stl` | de buitenkant op het bed | 229,8 x 229,8 x 3,9 | 160 g grijs, 5 uur |
| `print/Moduleplaat.stl` | de onderkant op het bed, de paaltjes omhoog | 220,0 x 199,0 x 8,5 | 85 g grijs, 3 uur |
| `print/Gootdeksels-plaat.stl` | de vlakke kant op het bed, de benen omhoog | 211,0 x 132,9 x 9,1 (9 gootdeksels) | 70 g grijs, 3 uur |
| `print/Hulpstukken.stl` | plat op het bed | 140,0 x 46,0 x 11,4 (2 werkhaken, spatel) | 15 g grijs, 1 uur |

Elk deel is hoogstens 230 x 230 en past op het bed van 256 x 256 naast de vrije hoek voor het filamentmes (rechtsvoor
10 x 20), met een skirt erbij: leg het deel in het midden van het bed. Instellingen zoals bij de afzuiging (0,2 mm,
4 wanden, 30 % gyroid). De vingers van de goten zijn 1,2 dik en tot 23 hoog en de klemlippen 0,8 dik: print de bak
wat trager (buitenwanden 40 mm/s) en zonder "ironing". De richel in de achterwand heeft 45° eronder: geen support.

## Bestanden

| Bestand | Wat |
|---|---|
| `Kabeldoos.kcad` | de hele doos met de moduleplaat, alle modules, bordjes, gootdeksels en schroeven |
| `Kabeldoos-bak.kcad`, `Kabeldoos-deksel.kcad`, `Moduleplaat.kcad`, `Gootdeksels-plaat.kcad`, `Gootdeksel.kcad`, `Hulpstukken.kcad` | de geprinte delen apart |
| `maak-kabeldoos.mjs` | de generator: indeling, bak, deksel, moduleplaat, assemblage; maten in `maten.mjs`, goten in `goten.mjs`, klemlippen en hulpstukken in `hulpstukken.mjs`, de gekochte onderdelen in `onderdelen.mjs`, de modules en hun bedrading in `opbouw.mjs` |
| `print/` | de STL's (uit de exacte vorm, dicht en manifold) |
| `tekeningen/Werktekeningen-kabeldoos.pdf` | boormal op ware grootte (TRN-00), bak (TRN-01), deksel (TRN-02), gootdeksel (TRN-03), hulpstukken (TRN-04), moduleplaat (TRN-05), montageblad modules en bedrading (TRN-10), interne draadlijst (TRN-14), meetblad (TRN-20, A4), invulblad (TRN-21, A4) |
| `tekeningen/Bouwschema-kabeldoos.pdf` | de stappen met beelden, van printen tot aanzetten |
| `Kabeldoos-alles-afdrukken.pdf` | alles samen om af te drukken (README, bouwschema, tekeningen, schema, dashboard, rekenblad) |
| `schema/` | aansluitschema (`Aansluitschema-kabeldoos.pdf` en per blad een SVG) in 16 bladen, opgemaakt zoals EPLAN Electric P8 en volgens IEC/EN 61082-1, 60617, 81346 en ISO 7200: titelblad, inhoudsopgave, 4 schemabladen met de modules als toestellen (kruisverwijzing /blad.kolom), 9 klemmenplannen (-X1, -X2, -X3, -X7, -X8, -Q1, -Q2, -K3, -K4), stuklijst |
| `firmware/` | PlatformIO-project met het dashboard, 78 tests (ook met 32 groepen) |
| `docs/` | rekenblad, maten met bronnen, de maattekening van de ESP |
| `EISEN.md` | de eisen van Ian |

## Opnieuw maken (vanuit de map van de repo)

| Wat | Opdracht |
|---|---|
| de CAD-bestanden | `node voorbeelden/treinverlichting/maak-kabeldoos.mjs` |
| aansluitschema (SVG en html) | `node voorbeelden/treinverlichting/schema/maak-schema.mjs` |
| rekenblad | `python voorbeelden/treinverlichting/docs/berekeningen.py` |
| tests (onderdelen, klemlippen, assemblage, B-rep, modules en bedrading) | `VOORBEELDEN=1 npx vitest run src/qa/qaTrein.test.ts src/qa/tekeningenTrein.test.ts src/qa/schemaNorm.test.ts` |
| STL's | `VOORBEELDEN=1 TREIN_STL=1 npx vitest run src/qa/qaTrein.test.ts -t "B-rep"` |
| tekeningen (SVG) | `VOORBEELDEN=1 TREIN_TEKENINGEN=1 npx vitest run src/qa/tekeningenTrein.test.ts` |
| PDF's van schema en tekeningen | `node e2e/tools/trein-pdf.mjs` |
| bouwschema, beelden, alles-PDF (de app met VITE_TEST_HOOKS op E2E_URL) | `node e2e/tools/bouwschema-trein.mjs`, `node e2e/tools/look-trein.mjs`, `node e2e/tools/trein-fable-shots.mjs`, `node e2e/tools/alles-trein-pdf.mjs` |
| de webpagina | `python voorbeelden/treinverlichting/app/maak-app.py` |
| firmware-tests | in `firmware/`: `python -m platformio test -e native` en `-e native32` |
