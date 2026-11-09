# Kabeldoos voor de verlichting van de modelbaan, versie 1 (2026-11-08)

Eén doos onder de baan brengt alle lampen samen. 16 lichtgroepen, één per Modelbouwled-bordje, gaan aan en uit, dimmen
of krijgen een effect (dag/nacht, vuur, tv, lasvlam, knipperende overweg). 16 ingangen nemen knoppen en sensoren. Alles
bedien je met de gsm of tablet: de doos maakt haar eigen wifi **Treinbaan** met een dashboard.

Alle maten en onderdelen komen uit `maak-kabeldoos.mjs`. De berekeningen staan in `docs/Berekeningen.md`, de maten van de
gekochte onderdelen met hun bron in `docs/Maten-en-bronnen.md`, de eisen van Ian in `EISEN.md`.

## Opbouw

| Deel | Wat |
|---|---|
| Doos | PETG zwart, 249 x 241 x 29 mm (deksel inbegrepen), hangt met de bodem tegen de onderkant van de baan; het grijze deksel zit onderaan |
| 16 bordjes | Modelbouwled "PCB met ingebouwde weerstand" (61,1 x 20,9, 14 hoog), in 5 rijen van 3 en één in rij 6; elk ligt in een uitsparing van het kader van zijn rij (0,3 mm speling) op een steunrail; ribben aan het deksel drukken ze vast (geen schroeven) |
| Uitgangsprint | 16 MOSFET's IRLD024: elke groep schakelt de min van zijn bordje; 16 klemmen (één per groep) |
| PWM-print | PCA9685: 16 kanalen, 12 bit, 1 kHz, via I2C van de ESP |
| ESP | ESP32-S3-DevKitC-1 v1.1 (N16R8) op een draagprint met 2 vrouwelijke pinrijen; de 2 USB-poorten in een opening van de rechterwand (flashen met de doos dicht) |
| Ingangsprint | 16 optocouplers (4 x PC847) en 20 klemmen: 16 ingangen, 2 x +12 V en 2 x 0 V voor de knoppen |
| Voedingsprint | 12 V in (wartel M12 in de linkerwand), steekzekering 7,5 A, 6 polyfuses (één per rij bordjes), regelaar 12 -> 5 V voor de ESP |
| Netadapter | Mean Well GST90A12-P1M (12 V, 6,67 A), gekeurd; 230 V komt niet in de doos |

- **Draden:** de leddraden komen van boven door de draadsleuven in de bodem (tussen de rijen), of langs de zijkanten door
  de kabelinvoeren in de vier wanden: uitsparingen van 8 mm, open aan de kant van het deksel. Leg de draden erin; het
  deksel sluit ze af.
- **Kabels ordenen:** langs de linker- en de rechterwand loopt een kabelgoot (rij 1 tot 6) met een opening bij elke rij:
  daarin lopen de draden van de uitgangsprint (de − van elk bordje) en van de voedingsprint (de + per rij). Langs elk
  kader steekt een lip van 1,6 mm uit over de draadgang tussen de rijen: schuif de leddraden eronder. Bij elke
  kabelinvoer in de zijwanden zitten twee spleten voor een kabelbinder (2,5 mm breed): bind elke bundel daar vast, dan trekt er
  niets aan de klemmen. Zie [Draden labelen](#draden-labelen).
- **Monteren met alles erin:** de doos hangt aan 4 sleutelgaten in de bodem. Plak de boormal (TRN-00, A3 op 100 %
  afdrukken) onder de baan en draai 4 bolkopschroeven 4 x 20 half in de baan, hang de doos met de grote gaten over de koppen en schuif ze 6 mm opzij. De prints hoeven er niet uit.
- **Geen verluchting nodig:** alles samen hoogstens 1,9 W, dus ongeveer 3 °C warmer dan onder de baan
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
| Gaatjesprint (2,54) | 4 | uitgang 68 x 25, ingang 80 x 25, voeding 61 x 25, drager 68 x 28 (uit één plaat) | € 1,50 | € 6,00 |
| Vrouwelijke pinrij 22-polig | 2 | 2,54 | € 0,50 | € 1,00 |
| Wartel M12 x 1,5 | 1 | kabel Ø3 tot 6,5 | € 0,80 | € 0,80 |
| Plaatschroef 2,5 x 6 bolkop | 18 | prints op de schroefpaaltjes | € 0,05 | € 0,90 |
| Plaatschroef 3 x 12 verzonken | 6 | deksel | € 0,08 | € 0,48 |
| Bolkopschroef 4 x 20 (hout) | 4 | sleutelgaten | € 0,05 | € 0,20 |
| Montagedraad 0,25 en 0,5 mm² | 1 | | € 5,00 | € 5,00 |
| Kabelbinders 2,5 x 100 mm | 1 zakje | voor de binderogen | € 3,00 | € 3,00 |
| Kabelmarkering (cijfers en letters) of vlaggetjes | 1 | de labels van [Draden labelen](#draden-labelen) | € 4,00 | € 4,00 |
| **Totaal kopen** | | | | **€ 125,28** |

De 16 Modelbouwled-bordjes heb je al; een extra kost € 9,75 (Modelbouwled.nl). Filament: ongeveer 350 g PETG zwart
(bak) en 120 g grijs (deksel), samen ongeveer € 10.

## Printen (Elegoo Centauri Carbon, PETG, zonder support)

| Bestand | Stand | Maat (mm) |
|---|---|---|
| `print/Kabeldoos-bak.stl` | de bodem op het bed | 248,9 x 240,6 x 26,4 |
| `print/Kabeldoos-deksel.stl` | de buitenkant op het bed | 248,9 x 240,6 x 9,1 (met de drukribben) |

Past op het bed van 256 x 256. Instellingen zoals bij de afzuiging (0,2 mm, 4 wanden, 30 % gyroid).

## Bestanden

| Bestand | Wat |
|---|---|
| `Kabeldoos.kcad` | de hele doos met alle prints, bordjes en schroeven |
| `maak-kabeldoos.mjs` | de generator; alle maten bovenaan in `M` |
| `print/` | de STL's (uit de exacte vorm, dicht en manifold) |
| `tekeningen/Werktekeningen-kabeldoos.pdf` | boormal op ware grootte (TRN-00), bak (TRN-01) en deksel (TRN-02) |
| `tekeningen/Bouwschema-kabeldoos.pdf` | 8 stappen met beelden, van printen tot aanzetten |
| `Kabeldoos-alles-afdrukken.pdf` | alles samen om af te drukken (README, bouwschema, tekeningen, schema, dashboard, rekenblad) |
| `schema/` | aansluitschema (`Aansluitschema-kabeldoos.pdf` en per blad een SVG) in 11 bladen, opgemaakt zoals EPLAN Electric P8 en volgens IEC/EN 61082-1, 60617, 81346 en ISO 7200: titelblad, inhoudsopgave, 4 schemabladen (kruisverwijzing /blad.kolom), klemmenplannen -X1 tot -X4, stuklijst |
| `firmware/` | PlatformIO-project met het dashboard, 61 tests |
| `docs/` | rekenblad, maten met bronnen, de maattekening van de ESP |
| `EISEN.md` | de eisen van Ian |
