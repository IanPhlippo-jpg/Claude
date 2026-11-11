# Kabeldoos voor de verlichting van de modelbaan, versie 2 (2026-11-11)

Eén doos onder de baan brengt alle lampen samen. 16 lichtgroepen, één per Modelbouwled-bordje, gaan aan en uit, dimmen
of krijgen een effect (dag/nacht, vuur, tv, lasvlam, knipperende overweg). 16 ingangen nemen knoppen en sensoren. Alles
bedien je met de gsm of tablet: de doos maakt haar eigen wifi **Treinbaan** met een dashboard.

Alle maten en onderdelen komen uit `maak-kabeldoos.mjs`. De berekeningen staan in `docs/Berekeningen.md`, de maten van de
gekochte onderdelen met hun bron in `docs/Maten-en-bronnen.md`, de eisen van Ian in `EISEN.md`.

**Versie 2:** de doos van versie 1 (248,9 x 245,6) paste niet naast de vrije hoek voor het filamentmes van de printer.
Nu is alles nog altijd één doos, maar 229,8 x 229,8 (elk geprint deel hoogstens 230 x 230) en 44,4 hoog, met echte
kabelgoten zoals in een schakelkast: 28 hoog, net boven de bordjes, zodat je er met je vingers bij kan, met een
klikdeksel per goot.

## Opbouw

| Deel | Wat |
|---|---|
| Doos | PETG zwart, 229,8 x 229,8 x 44,4 mm (deksel inbegrepen), hangt met de bodem tegen de onderkant van de baan; het grijze deksel zit onderaan |
| Kabelgoten | 9 goten met vingers en sleuven, 28 hoog (net boven de bordjes): één langs de achterwand, één tussen elke twee rijen (5,4 breed, 5,8 tussen de vingers), één langs de linker- en de rechterwand (11 breed). Een grijs klikdeksel per goot; vol 59 % als de draden van elk bordje door de sleuf onder dat bordje binnenkomen (docs/Berekeningen.md, hoofdstuk 6) |
| 16 bordjes | Modelbouwled "PCB met ingebouwde weerstand" (61,1 x 20,9, 14 hoog), in 5 rijen van 3 en één in rij 6. Elke rij ligt in een ring: de wanden van de goten zijn het kader (0,3 mm speling), palen tussen de bordjes, een steunrail eronder; ribben aan het deksel drukken ze vast (geen schroeven). Voor elke klemmenrij een sleuf per twee klemmen: de draad gaat recht uit de klem de goot in |
| Uitgangsprint | 16 MOSFET's IRLD024: elke groep schakelt de min van zijn bordje; 16 klemmen (één per groep) |
| PWM-print | PCA9685: 16 kanalen, 12 bit, 1 kHz, via I2C van de ESP |
| ESP | ESP32-S3-DevKitC-1 v1.1 (N16R8) op een draagprint met 2 vrouwelijke pinrijen; de 2 USB-poorten in een opening van de rechterwand (flashen met de doos dicht) |
| Ingangsprint | 16 optocouplers (4 x PC847) en 20 klemmen: 16 ingangen, 2 x +12 V en 2 x 0 V voor de knoppen |
| Voedingsprint | 12 V in (wartel M12 in de linkerwand), steekzekering 7,5 A, 6 polyfuses (één per rij bordjes), regelaar 12 -> 5 V voor de ESP |
| Netadapter | Mean Well GST90A12-P1M (12 V, 6,67 A), gekeurd; 230 V komt niet in de doos |

- **Draden:** de leddraden komen van boven door de draadsleuven in de bodem (onder elke goot één per bordje), of door de
  kabelinvoeren: 5 in de linkerwand en 5 in de rechterwand (telkens bij een goot tussen twee rijen) en 8 vooraan (4 bij
  de klemmen van de ingangsprint), 18 ronde gaten Ø16,5 met elk een membraantule Wiska EMT 16 (TPE, IP66). Klik de tule
  van buiten in het gat, prik de draden door het vlies: het rubber sluit rond de bundel (1 tot 9 mm). Zo komt er geen
  stof binnen en schuurt er geen draad over een rand.
- **Kabels ordenen:** elke draad gaat recht uit zijn klem door een sleuf de goot in en loopt in de goot naar de
  zijgoot; de draden van de uitgangsprint (de − van elk bordje) en van de voedingsprint (de + per rij) lopen door de
  zijgoten en de goot voor rij 7. Bind een bundel bij een tule met een kabelbinder rond de vinger ernaast, dan trekt er
  niets aan de klemmen. Klik daarna de gootdeksels erop: het deksel van een goot tussen twee rijen klikt op vier plaatsen
  (8 nokken) in de groef van de klikvingers (op 34,5 en 93 links en rechts van het midden); een randdeksel haak je met zijn neus in de
  groef van de buitenwand en klik je aan de andere kant dicht. Zie [Draden labelen](#draden-labelen).
- **Monteren met alles erin:** de doos hangt aan 4 sleutelgaten in de bodem van de zijgoten. Plak de boormal (TRN-00,
  A3 op 100 % afdrukken) onder de baan en draai 4 bolkopschroeven 4 x 20 half in de baan, hang de doos met de grote
  gaten over de koppen en schuif ze 6 mm naar achteren. De prints hoeven er niet uit.
- **Geen verluchting nodig:** alles samen hoogstens 1,9 W, dus ongeveer 2 °C warmer dan onder de baan
  (docs/Berekeningen.md, hoofdstuk 5).

## Aansluiten

| Wat | Waar |
|---|---|
| een bordje (groep n) | de **+** van het bordje aan de **+12 V-klem van zijn rij** op de voedingsprint (doorlussen naar de andere bordjes van die rij met de + van de eindklem); de **−** van het bordje aan **klem n** van de uitgangsprint. De − van de eindklemmen nooit doorlussen: dan gaan twee groepen samen aan |
| een led | aan een bordje: lange poot (+) aan de klemmenrij met de weerstanden, korte poot (−) aan de andere rij |
| een drukknop | tussen een **+12 V**-klem en een ingang van de ingangsprint |
| een sensor (12 V, PNP-uitgang) | + aan +12 V, − aan 0 V, uitgang aan een ingang |

Bordjes van 1K5 zijn gemaakt voor 20 V: op 12 V geven ze ongeveer 6 mA per led (zwakker). Voor vol licht op 12 V: 1K.

## Draden labelen

Zet op elke draad een label (kabelmarkering of een vlaggetje tape) aan beide uiteinden, met deze namen; ze komen overeen
met het schema (`schema/`) en de groepen in het dashboard:

| Draad | Label | Van | Naar |
|---|---|---|---|
| − van groep n | `G01−` … `G16−` | uitgangsprint -X3:n | − van bordje n |
| + van rij r | `R1+` … `R6+` | voedingsprint -X2:r | + van het eerste bordje van rij r (daarna doorlussen) |
| ingang n | `IN01` … `IN16` | ingangsprint -X4:n | knop of sensor |
| leddraden | `G05 kerk` (groep en plaats) | bordje n | de lamp op de baan |

Rij 1 = de 3 bordjes het verst van de ESP (achteraan), rij 6 = bordje 16. Groep 1 is het linkse bordje van rij 1.

## Bediening

Verbind de gsm met wifi **Treinbaan** (wachtwoord **treinbaan**, te wijzigen bij Instellingen); het dashboard opent
vanzelf (anders `http://192.168.4.1`). De rode knop "Alles uit" staat altijd bovenaan. Tabbladen: Groepen (schakelaar,
helderheid, effect), Scènes (de stand van alles bewaren en terugzetten), Functies (een reeks stappen, bv. een overweg
die 30 s knippert), Ingangen (welke knop of sensor welke functie start, met live status), Instellingen. Het lampje op
de ESP: groen = wifi aan, rood = de PWM-print antwoordt niet. Meer: `firmware/README.md`.

## Bestellijst

| Onderdeel | Aantal | Type | Prijs per stuk | Totaal |
|---|--:|---|--:|--:|
| Netadapter 12 V, 6,67 A, C14 | 1 | Mean Well GST90A12-P1M | € 32,00 | € 32,00 |
| Netsnoer C13 | 1 | gewoon pc-netsnoer | € 5,00 | € 5,00 |
| ESP32-S3-DevKitC-1-N16R8 | 1 | Espressif (origineel, v1.1) | € 16,00 | € 16,00 |
| PWM-print 16 kanalen | 1 | PCA9685-breakout (62,5 x 25,4) | € 4,00 | € 4,00 |
| MOSFET logic-level | 16 | Vishay IRLD024PBF (HVMDIP-4) | € 0,90 | € 14,40 |
| Optocoupler 4-voudig | 4 | Sharp PC847 | € 0,80 | € 3,20 |
| Weerstandsnetwerk SIP-9, 100 kΩ (8 x, gemeenschappelijk) | 2 | bv. Bourns 4609X-101-104 | € 0,40 | € 0,80 |
| Weerstandsnetwerk DIP-16, 2,2 kΩ (8 x, los) | 2 | bv. Bourns 4116R-1-222 | € 1,20 | € 2,40 |
| Regelaar 12 -> 5 V, 1 A | 1 | Pololu D24V10F5 | € 10,50 | € 10,50 |
| Printhouder steekzekering ATO + zekering 7,5 A | 1 | Littelfuse of gelijk, 32 V DC | € 1,50 | € 1,50 |
| Polyfuse 1,1 A | 6 | Bourns MF-R110 | € 0,40 | € 2,40 |
| Elco 470 µF / 25 V | 1 | radiaal Ø6,3 | € 0,30 | € 0,30 |
| Printklemmen steek 3,5 (per pool) | 44 | 16 + 20 + 8 polen | € 0,25 | € 11,00 |
| Printklem 2-polig steek 5,08 | 1 | 12 V in | € 0,40 | € 0,40 |
| Gaatjesprint (2,54) | 4 | uitgang 68 x 25, ingang 80 x 25, voeding 61 x 25, drager 68 x 25 (uit één plaat) | € 1,50 | € 6,00 |
| Vrouwelijke pinrij 22-polig | 2 | 2,54 | € 0,50 | € 1,00 |
| Wartel M12 x 1,5 | 1 | kabel Ø3 tot 6,5 | € 0,80 | € 0,80 |
| Membraantule Wiska EMT 16 LG (10062559) | 18 | M16, gat Ø16 tot 17,2, wand 2 tot 9,5, kabel 1 tot 9, IP66, lichtgrijs; per 100 verpakt (richtprijs, na te kijken) | € 0,40 | € 7,20 |
| Plaatschroef 2,5 x 6 bolkop | 18 | prints op de schroefpaaltjes | € 0,05 | € 0,90 |
| Plaatschroef 3 x 12 verzonken | 4 | deksel | € 0,08 | € 0,32 |
| Bolkopschroef 4 x 20 (hout) | 4 | sleutelgaten in de zijgoten | € 0,05 | € 0,20 |
| Montagedraad 0,25 en 0,5 mm² | 1 | | € 5,00 | € 5,00 |
| Kabelbinders 2,5 x 100 mm | 1 zakje | rond een vinger bij een tule | € 3,00 | € 3,00 |
| Kabelmarkering (cijfers en letters) of vlaggetjes | 1 | de labels van [Draden labelen](#draden-labelen) | € 4,00 | € 4,00 |
| **Totaal kopen** | | | | **€ 132,32** |

De 16 Modelbouwled-bordjes heb je al; een extra kost € 9,75 (Modelbouwled.nl). Filament: ongeveer 360 g PETG zwart
(bak) en 260 g grijs (deksel en gootdeksels), samen ongeveer € 13.

## Printen (Elegoo Centauri Carbon, PETG, zonder support)

| Bestand | Stand | Maat (mm) | Ongeveer |
|---|---|---|---|
| `print/Kabeldoos-bak.stl` | de bodem op het bed | 229,8 x 229,8 x 42,0 | 360 g zwart, 14 uur |
| `print/Kabeldoos-deksel.stl` | de buitenkant op het bed | 229,8 x 229,8 x 24,7 (met de drukribben) | 190 g grijs, 7 uur |
| `print/Gootdeksels-plaat.stl` | de vlakke kant op het bed, de benen omhoog | 211,0 x 132,4 x 8,9 (9 gootdeksels) | 70 g grijs, 3 uur |

Elk deel is hoogstens 230 x 230 en past op het bed van 256 x 256 naast de vrije hoek voor het filamentmes (rechtsvoor
10 x 20), met een skirt erbij: leg het deel in het midden van het bed. Instellingen zoals bij de afzuiging (0,2 mm,
4 wanden, 30 % gyroid). De vingers van de goten zijn 1,2 dik en tot 23 hoog: print de bak wat trager (buitenwanden
40 mm/s) en zonder "ironing". Na het printen: de bordjes vallen zonder kracht in hun ring (0,3 mm speling), een
gootdeksel klikt met zijn nokken in de klikvingers.

## Bestanden

| Bestand | Wat |
|---|---|
| `Kabeldoos.kcad` | de hele doos met alle prints, bordjes, gootdeksels en schroeven |
| `Kabeldoos-bak.kcad`, `Kabeldoos-deksel.kcad`, `Gootdeksels-plaat.kcad`, `Gootdeksel.kcad` | de geprinte delen apart |
| `maak-kabeldoos.mjs` | de generator: indeling, bak, deksel, assemblage; maten in `maten.mjs`, goten en gootdeksels in `goten.mjs`, de gekochte onderdelen in `onderdelen.mjs` |
| `print/` | de STL's (uit de exacte vorm, dicht en manifold) |
| `tekeningen/Werktekeningen-kabeldoos.pdf` | boormal op ware grootte (TRN-00), bak (TRN-01), deksel (TRN-02) en gootdeksel (TRN-03) |
| `tekeningen/Bouwschema-kabeldoos.pdf` | 8 stappen met beelden, van printen tot aanzetten |
| `Kabeldoos-alles-afdrukken.pdf` | alles samen om af te drukken (README, bouwschema, tekeningen, schema, dashboard, rekenblad) |
| `schema/` | aansluitschema (`Aansluitschema-kabeldoos.pdf` en per blad een SVG) in 11 bladen, opgemaakt zoals EPLAN Electric P8 en volgens IEC/EN 61082-1, 60617, 81346 en ISO 7200: titelblad, inhoudsopgave, 4 schemabladen (kruisverwijzing /blad.kolom), klemmenplannen -X1 tot -X4, stuklijst |
| `firmware/` | PlatformIO-project met het dashboard, 61 tests |
| `docs/` | rekenblad, maten met bronnen, de maattekening van de ESP |
| `EISEN.md` | de eisen van Ian |
