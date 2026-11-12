# Kabeldoos voor de verlichting van de modelbaan, versie 3 (2026-11-12)

Eén doos onder de baan brengt alle lampen samen. 16 lichtgroepen, één per Modelbouwled-bordje, gaan aan en uit, dimmen
of krijgen een effect (dag/nacht, vuur, tv, lasvlam, knipperende overweg). 16 ingangen nemen knoppen en sensoren
(contact, PNP en NPN). Alles bedien je met de gsm of tablet: de doos maakt haar eigen wifi **Treinbaan** met een
dashboard, en meldt zich als je wilt ook aan op de wifi van het huis.

Alle maten en onderdelen komen uit `maak-kabeldoos.mjs`, de indeling van de gaatjesprints uit `opbouw.mjs`. De
berekeningen staan in `docs/Berekeningen.md`, de maten van de gekochte onderdelen met hun bron in
`docs/Maten-en-bronnen.md`, de eisen van Ian in `EISEN.md`.

**Versie 3 (advies Fable 5.2):** de bordjes klikken vast in klemlippen (ook met het deksel eraf en de doos
ondersteboven); de adapter gaat met zijn eigen stekker in een DC-bus in de wand, met een P-MOSFET tegen ompolen; elke
groep heeft zijn eigen polyfuse van 0,5 A en een MOSFET die al bij 2,5 V volledig geleidt (AO3400A, in een voetje);
de knoppen en sensoren hebben een eigen polyfuse; de ingangen nemen ook NPN-sensoren; er zijn opbouwtekeningen van de
gaatjesprints, een interne draadlijst, een meetblad en een invulblad; de firmware heeft een waakhond, een noodreset,
bijwerken zonder kabel, thuis-wifi en een testmodus. **Versie 2:** één doos van 229,8 x 229,8 x 44,4 (elk geprint deel
hoogstens 230 x 230) met echte kabelgoten van 28 hoog met klikdeksels.

## Opbouw

| Deel | Wat |
|---|---|
| Doos | PETG zwart, 229,8 x 229,8 x 44,4 mm (deksel inbegrepen), hangt met de bodem tegen de onderkant van de baan; het grijze deksel zit onderaan |
| Kabelgoten | 9 goten met vingers en sleuven, 28 hoog: één langs de achterwand, één tussen elke twee rijen (5,4 breed, 5,8 tussen de vingers), één langs de linker- en de rechterwand (11 breed). Een grijs klikdeksel per goot; vol 59 % als de draden van elk bordje door de sleuf onder dat bordje binnenkomen (docs/Berekeningen.md, hoofdstuk 6) |
| 16 bordjes | Modelbouwled "PCB met ingebouwde weerstand" (61,1 x 20,9, 14 hoog), in 5 rijen van 3 en één in rij 6. Elke rij ligt in een ring (de wanden van de goten), op een steunrail, tussen palen. **4 klemlippen per bordje** aan de korte kanten: de print klikt erin (45° schuin, haak 0,6 over de rand, rek 1,7 %), dus het bordje blijft zitten met het deksel eraf en de doos ondersteboven. Uitnemen: twee lippen aan één kant met de spatel naar buiten duwen |
| Uitgangsprint | 132 x 25,4 naast bordje 16 (opbouwtekening TRN-10): 16 MOSFET's AO3400A, per twee op een adapterprintje in een IC-voet (vervangen zonder solderen), per groep een polyfuse 0,5 A en een klem (-X3:1..16), een eigen 0 V-klem (-X3:17) voor de stroom van alle groepen samen. Elke groep schakelt de min van zijn bordje |
| PWM-print | PCA9685: 16 kanalen, 12 bit, 1 kHz, via I2C van de ESP; op 4 afstandsbussen van 10 mm boven de rechterhelft van de uitgangsprint |
| ESP | ESP32-S3-DevKitC-1 v1.1 (N16R8) op een draagprint met 2 vrouwelijke pinrijen, met daaronder de regelaar 12 -> 5 V (TRN-13); de 2 micro-USB-poorten in een opening van de rechterwand (flashen met de doos dicht) |
| Ingangsprint | 88 x 25,4 (TRN-11): 4 optocouplers LTV-844 met AC-ingang, 24 klemmen (16 ingangen, 4 COM, 2 x +12 V, 2 x 0 V), een polyfuse 0,3 A voor de +12 V van de knoppen |
| Voedingsprint | 61 x 25,4 (TRN-12): klem 12 V in (-X1), steekzekering 7,5 A, P-MOSFET IRF4905 tegen ompolen, elco, de + per rij bordjes (-X2:1..6) en +12 V/0 V naar de ingangsprint (-X2:7/8) |
| DC-bus | 5,5 x 2,5, 8 A (GlobTek JACK-L-PANEL-8A(R)) in de linkerwand, boven de voedingsprint: de stekker van de adapter gaat erin, niets doorknippen |
| Netadapter | Mean Well GST90A12-P1M (12 V, 6,67 A, stekker 5,5 x 2,5 met + in het midden), gekeurd; 230 V komt niet in de doos |

- **Draden:** de leddraden komen van boven door de draadsleuven in de bodem (onder elke goot één per bordje), of door de
  kabelinvoeren: 5 in de linkerwand en 5 in de rechterwand en 8 vooraan (4 bij de klemmen van de ingangsprint), 18 ronde
  gaten Ø16,5 met elk een membraantule Wiska EMT 16. Klik de tule van buiten in het gat, prik de draden door het vlies.
- **Kabels ordenen:** elke draad gaat recht uit zijn klem door een sleuf de goot in en loopt in de goot naar de
  zijgoot. Bind een bundel bij een tule met een kabelbinder rond de vinger ernaast. Klik daarna de gootdeksels erop.
  **Eerlijk:** een goot tussen twee rijen is 5,4 breed: daar kan geen vinger in. Een gootdeksel til je op met het
  blad van de **spatel** en een draad trek je eruit met haar **haakje** (beide op de printplaat met hulpstukken).
- **Monteren:** de doos hangt aan 4 sleutelgaten in de bodem van de zijgoten. Plak de boormal (TRN-00, A3 op 100 %)
  onder de baan, draai 4 bolkopschroeven 4 x 20 half in, hang de doos met de grote gaten over de koppen en schuif ze
  6 mm naar achteren.
- **Bedraden op werkhoogte:** schuif de doos 6 mm naar voren en neem ze van de schroeven. Hang de 2 geprinte
  **werkhaken** aan de 2 voorste schroeven (hun sleutelgat over de kop, zoals de doos) en hang de doos met haar 2
  voorste sleutelgaten aan de knoppen van de haken: ze hangt dan verticaal, 12 cm onder de baan, de open kant naar je
  toe; de bordjes blijven in hun klemlippen. Laat elke bundel van de baan naar de doos daarvoor een **kabellus van
  50 cm** (met een kabelbinder aan de baan vastgezet). Klaar: deksel erop, doos terug op de 4 schroeven.
- **Geen verluchting nodig:** gewoon 1,6 W, hoogstens 4,6 W in de doos; omdat de bodem tegen de baan nauwelijks koelt,
  wordt het binnen 3,4 K (hoogstens 9,8 K) warmer dan onder de baan (docs/Berekeningen.md, hoofdstuk 5).

## Aansluiten

| Wat | Waar |
|---|---|
| de netadapter | stekker in de DC-bus in de linkerwand (+ in het midden; verkeerd om aangesloten met een andere adapter: de P-MOSFET laat niets door) |
| een bordje (groep n) | de **+** aan de klem **R+ van zijn rij** op de voedingsprint (-X2:1..6; doorlussen naar de andere bordjes van die rij met de + van de eindklem); de **−** aan **klem n** van de uitgangsprint (-X3:n). De − van de eindklemmen nooit doorlussen: dan gaan twee groepen samen aan |
| een led | aan een bordje: lange poot (+) aan de klemmenrij met de weerstanden, korte poot (−) aan de andere rij |
| een drukknop of schakelaar | tussen **+12 V** (-X4:21/22) en een ingang IN; de **COM** van die 4 ingangen aan **0 V** (-X4:23/24) |
| een sensor met een 12 V-uitgang (PNP) | + aan +12 V, − aan 0 V, uitgang aan IN; COM van die 4 ingangen aan **0 V** |
| een sensor die naar 0 V schakelt (NPN, hall, reed naar massa) | + aan +12 V, − aan 0 V, uitgang aan IN; COM van die 4 ingangen aan **+12 V** |

Per 4 ingangen (IN01-IN04 met COM1, IN05-IN08 met COM2, ...) één soort: contacten en PNP samen, of NPN. Bordjes van 1K5
zijn gemaakt voor 20 V: op 12 V geven ze ongeveer 6 mA per led (zwakker). Voor vol licht op 12 V: 1K.

## Draden labelen

Zet op elke draad een label aan beide uiteinden, met deze namen; ze komen overeen met het schema (`schema/`), de
groepen in het dashboard en het invulblad TRN-21 (om bij de baan te hangen):

| Draad | Label | Van | Naar |
|---|---|---|---|
| − van groep n | `G01−` … `G16−` | uitgangsprint -X3:n | − van bordje n |
| + van rij r | `R1+` … `R6+` | voedingsprint -X2:r | + van het eerste bordje van rij r (daarna doorlussen) |
| ingang n | `IN01` … `IN16` | ingangsprint -X4 (zie het klemmenplan) | knop of sensor |
| leddraden | `G05 kerk` (groep en plaats) | bordje n | de lamp op de baan |

De draden tussen de prints in de doos (44, met doorsnede, kleur en lengte) staan in de **interne draadlijst TRN-14**.
Rij 1 = de 3 bordjes het verst van de ESP (achteraan), rij 6 = bordje 16. Groep 1 is het linkse bordje van rij 1.

## Bouwen in deze volgorde

1. Printen (bak, deksel, gootdeksels, hulpstukken), de gaatjesprints zagen (uit één print van 160 x 100).
2. Solderen volgens de **opbouwtekeningen TRN-10 tot TRN-13**: eerst de voetjes en klemmen, dan de SMD-onderdelen aan
   de koperzijde, dan de bruggen. De MOSFET-adapters pas in hun voetje als de print gemeten is.
3. **Proefopstelling op tafel:** voedingsprint, draagprint met ESP, uitgangsprint met PCA9685 en ingangsprint met de
   draden van TRN-14, **één bordje** op groep 1 en één knop op IN01. Firmware flashen (micro-USB "UART",
   `firmware/README.md`), meten met het **meetblad TRN-20**, testmodus "looplicht".
4. Alles in de bak, bordjes in hun klemlippen, doos op de werkhaken, bedraden, labelen, het meetblad afwerken.

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
de eerste, met een tweede uitgangsprint (dezelfde opbouw) in een tweede doos ernaast; de firmware bouwen met
`-DTREIN_GROEPEN=32` (env `native32` toont dat alle logica werkt). Vrij op de ESP voor andere uitbreidingen: GPIO 11,
39, 42, 47 en 48.

## Bestellijst

| Onderdeel | Aantal | Type | Prijs per stuk | Totaal |
|---|--:|---|--:|--:|
| Netadapter 12 V, 6,67 A, C14, stekker 5,5 x 2,5 | 1 | Mean Well GST90A12-P1M | € 32,00 | € 32,00 |
| Netsnoer C13 | 1 | gewoon pc-netsnoer | € 5,00 | € 5,00 |
| DC-chassisbus 5,5 x 2,5, 8 A | 1 | GlobTek JACK-L-PANEL-8A(R) | € 4,00 | € 4,00 |
| ESP32-S3-DevKitC-1-N16R8 | 1 | Espressif (origineel, v1.1) | € 16,00 | € 16,00 |
| PWM-print 16 kanalen | 1 | PCA9685-breakout (62,5 x 25,4) | € 4,00 | € 4,00 |
| Afstandsbus M2,5 x 10 met 8 schroefjes M2,5 x 5 | 4 | nylon, rond | € 0,30 | € 1,20 |
| MOSFET N 30 V, ≤ 48 mΩ bij 2,5 V, SOT-23 | 16 | Alpha & Omega AO3400A | € 0,10 | € 1,60 |
| Adapterprintje 2 x SOT-23 naar DIP-8 | 8 | Artekit DA-SOT23-3-X2 | € 1,50 | € 12,00 |
| IC-voet DIP-8 | 8 | precisievoet | € 0,20 | € 1,60 |
| Polyfuse 0,5 A, 24 V, 1812 | 16 | Bourns MF-MSMF050/24X | € 0,35 | € 5,60 |
| Polyfuse 0,3 A, 30 V, 1812 | 1 | Bourns MF-MSMF030 | € 0,30 | € 0,30 |
| P-MOSFET −55 V, 20 mΩ, TO-220 | 1 | Infineon IRF4905PbF | € 1,50 | € 1,50 |
| Optocoupler 4 x AC-ingang, DIP-16 | 4 | Lite-On LTV-844 | € 1,20 | € 4,80 |
| Weerstanden 1206: 16 x 100 kΩ, 16 x 2,2 kΩ (0,25 W), 1 kΩ, 10 kΩ | 1 set | | € 2,00 | € 2,00 |
| Regelaar 12 -> 5 V, 1 A | 1 | Pololu D24V10F5 | € 10,50 | € 10,50 |
| Printhouder steekzekering ATO + zekering 7,5 A | 1 | Littelfuse of gelijk, 32 V DC | € 1,50 | € 1,50 |
| Elco 470 µF / 25 V | 1 | radiaal Ø6,3 | € 0,30 | € 0,30 |
| Printklem steek 2,54 (per pool) | 48 | Phoenix MPT 0,5/..-2,54: -X2 8, -X3 16, -X4 24 | € 0,35 | € 16,80 |
| Printklem steek 5,08, 3- en 2-polig | 2 | Phoenix MKDS 1,5/3-5,08 en /2-5,08 | € 0,75 | € 1,50 |
| Gaatjesprint (2,54) 160 x 100 | 1 | uitgang 132, ingang 88, voeding 61, drager 68 (telkens 25,4 diep) | € 3,00 | € 3,00 |
| Vrouwelijke pinrij 22-polig | 2 | 2,54 | € 0,50 | € 1,00 |
| Membraantule Wiska EMT 16 LG (10062559) | 18 | M16, IP66, lichtgrijs (richtprijs, na te kijken) | € 0,40 | € 7,20 |
| Plaatschroef 2,5 x 6 bolkop | 15 | prints op de schroefpaaltjes | € 0,05 | € 0,75 |
| Plaatschroef 3 x 12 verzonken | 4 | deksel | € 0,08 | € 0,32 |
| Bolkopschroef 4 x 20 (hout) | 4 | sleutelgaten in de zijgoten | € 0,05 | € 0,20 |
| Montagedraad 0,14, 0,25, 0,5 en 0,75 mm², blanke draad Ø1,0 | 1 | | € 7,00 | € 7,00 |
| Kabelbinders 2,5 x 100 mm | 1 zakje | rond een vinger bij een tule, kabellussen | € 3,00 | € 3,00 |
| Kabelmarkering (cijfers en letters) of vlaggetjes | 1 | de labels van [Draden labelen](#draden-labelen) | € 4,00 | € 4,00 |
| **Totaal kopen** | | | | **€ 148,67** |

Prijzen zijn richtprijzen (AANNAME, niet besteld). De 16 Modelbouwled-bordjes heb je al; een extra kost € 9,75
(Modelbouwled.nl). Filament: ongeveer 360 g PETG zwart (bak) en 280 g grijs (deksel, gootdeksels, hulpstukken), samen
ongeveer € 13.

## Printen (Elegoo Centauri Carbon, PETG, zonder support)

| Bestand | Stand | Maat (mm) | Ongeveer |
|---|---|---|---|
| `print/Kabeldoos-bak.stl` | de bodem op het bed | 229,8 x 229,8 x 42,0 | 360 g zwart, 14 uur |
| `print/Kabeldoos-deksel.stl` | de buitenkant op het bed | 229,8 x 229,8 x 24,7 (met de drukribben) | 190 g grijs, 7 uur |
| `print/Gootdeksels-plaat.stl` | de vlakke kant op het bed, de benen omhoog | 211,0 x 132,4 x 8,9 (9 gootdeksels) | 70 g grijs, 3 uur |
| `print/Hulpstukken.stl` | plat op het bed | 140,0 x 46,0 x 11,4 (2 werkhaken, spatel) | 15 g grijs, 1 uur |

Elk deel is hoogstens 230 x 230 en past op het bed van 256 x 256 naast de vrije hoek voor het filamentmes (rechtsvoor
10 x 20), met een skirt erbij: leg het deel in het midden van het bed. Instellingen zoals bij de afzuiging (0,2 mm,
4 wanden, 30 % gyroid). De vingers van de goten zijn 1,2 dik en tot 23 hoog en de klemlippen 0,8 dik: print de bak
wat trager (buitenwanden 40 mm/s) en zonder "ironing". Na het printen: een bordje klikt in zijn 4 lippen, een
gootdeksel klikt met zijn nokken in de klikvingers.

## Bestanden

| Bestand | Wat |
|---|---|
| `Kabeldoos.kcad` | de hele doos met alle prints, bordjes, gootdeksels en schroeven |
| `Kabeldoos-bak.kcad`, `Kabeldoos-deksel.kcad`, `Gootdeksels-plaat.kcad`, `Gootdeksel.kcad`, `Hulpstukken.kcad` | de geprinte delen apart |
| `maak-kabeldoos.mjs` | de generator: indeling, bak, deksel, assemblage; maten in `maten.mjs`, goten in `goten.mjs`, klemlippen en hulpstukken in `hulpstukken.mjs`, de gekochte onderdelen in `onderdelen.mjs`, de gaatjesprints in `opbouw.mjs` |
| `print/` | de STL's (uit de exacte vorm, dicht en manifold) |
| `tekeningen/Werktekeningen-kabeldoos.pdf` | boormal op ware grootte (TRN-00), bak (TRN-01), deksel (TRN-02), gootdeksel (TRN-03), hulpstukken (TRN-04), opbouw van de 4 gaatjesprints (TRN-10 tot TRN-13), interne draadlijst (TRN-14), meetblad (TRN-20, A4), invulblad (TRN-21, A4) |
| `tekeningen/Bouwschema-kabeldoos.pdf` | de stappen met beelden, van printen tot aanzetten |
| `Kabeldoos-alles-afdrukken.pdf` | alles samen om af te drukken (README, bouwschema, tekeningen, schema, dashboard, rekenblad) |
| `schema/` | aansluitschema (`Aansluitschema-kabeldoos.pdf` en per blad een SVG) in 11 bladen, opgemaakt zoals EPLAN Electric P8 en volgens IEC/EN 61082-1, 60617, 81346 en ISO 7200: titelblad, inhoudsopgave, 4 schemabladen (kruisverwijzing /blad.kolom), klemmenplannen -X1 tot -X4, stuklijst |
| `firmware/` | PlatformIO-project met het dashboard, 78 tests (ook met 32 groepen) |
| `docs/` | rekenblad, maten met bronnen, de maattekening van de ESP |
| `EISEN.md` | de eisen van Ian |

## Opnieuw maken (vanuit de map van de repo)

| Wat | Opdracht |
|---|---|
| de CAD-bestanden | `node voorbeelden/treinverlichting/maak-kabeldoos.mjs` |
| aansluitschema (SVG en html) | `node voorbeelden/treinverlichting/schema/maak-schema.mjs` |
| rekenblad | `python voorbeelden/treinverlichting/docs/berekeningen.py` |
| tests (onderdelen, klemlippen, assemblage, B-rep) | `VOORBEELDEN=1 npx vitest run src/qa/qaTrein.test.ts src/qa/tekeningenTrein.test.ts src/qa/schemaNorm.test.ts` |
| STL's | `VOORBEELDEN=1 TREIN_STL=1 npx vitest run src/qa/qaTrein.test.ts -t "B-rep"` |
| tekeningen (SVG) | `VOORBEELDEN=1 TREIN_TEKENINGEN=1 npx vitest run src/qa/tekeningenTrein.test.ts` |
| PDF's van schema en tekeningen | `node e2e/tools/trein-pdf.mjs` |
| bouwschema, beelden, alles-PDF (de app met VITE_TEST_HOOKS op E2E_URL) | `node e2e/tools/bouwschema-trein.mjs`, `node e2e/tools/look-trein.mjs`, `node e2e/tools/trein-fable-shots.mjs`, `node e2e/tools/alles-trein-pdf.mjs` |
| de webpagina | `python voorbeelden/treinverlichting/app/maak-app.py` |
| firmware-tests | in `firmware/`: `python -m platformio test -e native` en `-e native32` |
