# Treinbaan: firmware van de lichtdoos

ESP32-S3-DevKitC-1 v1.1 (N16R8, twee micro-USB-poorten "UART" en "USB") met een PCA9685 (16 lichtgroepen, uit te
breiden tot 32) en 16 ingangen rechtstreeks op GPIO's. De doos maakt een eigen wifi-netwerk met een dashboard voor gsm
en tablet, en meldt zich als je dat wilt ook aan op de wifi van het huis. Firmware 1.2.0 (versie 4: kant-en-klare modules, polariteit instelbaar met een bouwvlag).

## Gebruiken

1. Verbind de gsm met wifi **Treinbaan**, wachtwoord **treinbaan** (te wijzigen bij Instellingen).
2. Het dashboard opent vanzelf. Anders: `http://192.168.4.1` of `http://treinbaan.local`.
3. Thuis-wifi (niet verplicht): bij Instellingen de naam en het wachtwoord van het thuisnet invullen. De hotspot
   **Treinbaan** blijft altijd; op het thuisnet is het dashboard te vinden op `http://treinbaan.local` (of het adres
   dat het dashboard toont).
4. Wachtwoord vergeten: houd de knop **BOOT** op de ESP **5 s** ingedrukt (na 1 s wordt het lampje blauw, daarna
   knippert het): het wifi-wachtwoord is weer `treinbaan` en het thuisnet staat uit. Een knop die bij het aanzetten al
   ingedrukt is, telt niet (zo blijft de flashmodus van de ESP gewoon werken).
5. Standaard is **ingang 1 een drukknop "alles aan/uit"** (functie 2, stap "Aan/uit wisselen" op alle groepen): brandt
   er iets, dan gaat alles uit, anders alles aan. Te wijzigen bij Ingangen en Functies.

## Bouwen, flashen, testen (vanuit deze map)

| Wat | Opdracht |
|---|---|
| bouwen en flashen (eerste keer, via de micro-USB "UART") | `python -m platformio run -e doos -t upload` |
| bijwerken zonder kabel | dashboard, Instellingen, "Firmware bijwerken": kies `.pio/build/doos/firmware.bin` (of `http://192.168.4.1/update`) |
| seriële monitor | `python -m platformio device monitor -e doos` |
| tests op de pc (78) | `python -m platformio test -e native` |
| dezelfde tests met 32 groepen (78) | `python -m platformio test -e native32` |
| proef op de pc | `python -m platformio run -e native`, dan `.pio/build/native/program.exe` |

Flash en RAM (`doos`, 16 groepen): 906 429 bytes van het app-slot van 6 553 600 (13,8 %), RAM 60 588 van 327 680 bytes
(18,5 %). De partitietabel `default_16MB.csv` heeft twee app-slots (app0 en app1): een update gaat naar het vrije slot,
pas na een geslaagde controle start de ESP daarvan; mislukt ze, dan blijft de oude firmware.

## Dashboard

- Bron: `ui/dashboard.html` (één bestand, css en js erin, geen internet nodig).
- `ui/maak-header.py` pakt het in (gzip) als `src/dashboard.h`. Dat gebeurt **vanzelf** bij elk bouwen van `doos`
  (`extra_scripts` in `platformio.ini`); met de hand: `python ui/maak-header.py`.
- **Demo**: open `ui/dashboard.html` rechtstreeks in een browser (dubbelklikken). Zonder doos toont het dashboard
  voorbeeldgegevens die zich gedragen zoals de echte doos (schakelen, scènes, functies, een sensor die af en toe
  bezet is). Rechtsboven staat dan "voorbeeld (geen doos)".

## Vaste aansluitingen

| ESP32-S3 | naar |
|---|---|
| GPIO8 | SDA van de PCA9685, 400 kHz |
| GPIO9 | SCL van de PCA9685 |
| GPIO10 | OE van de PCA9685 (actief laag). **Pull-up 1 kΩ naar 3,3 V** (-R1): de gangbare PCA9685-breakouts trekken OE zelf naar GND (Adafruit: "pulled low by default"); met 1 kΩ tegen een pull-down van 10 kΩ blijft OE bij reset en flashen ≥ 3,0 V (hoog = alles uit). Meetpunt op het meetblad |
| GPIO0 | BOOT-knop op het bord: 5 s vasthouden = wifi-wachtwoord terug naar `treinbaan` |
| GPIO38 | RGB-led op het bord (DevKitC-1 v1.1) = statuslampje: groen = hotspot actief, rood = PCA9685 antwoordt niet, blauw = BOOT-knop vast (knippert: wachtwoord teruggezet) |
| GPIO11, 39, 42, 47, 48 | **vrij** voor uitbreidingen (48 alleen op v1.1; op v1.0 zat daar de led) |

PCA9685 op adres 0x40 (A0..A5 aan GND): kanaal 0..15 = groep 1..16, ~1017 Hz, 12 bit. PWM0..7 gaan met
dupontkabels naar IN1..IN8 van MOSFET-module 1, PWM8..15 naar MOSFET-module 2. Standaard **actief laag** (de 3,3 V-versie
van de module heeft de led van de optocoupler tussen VCC en IN): MODE2 = OUTDRV + INVRT + OUTNE 01, zodat met OE hoog
(reset, flashen) alle uitgangen 1 zijn = alles uit. Schakelt jouw module bij een hoge ingang (de led tussen IN en GND):
bouwen met `-DTREIN_UITGANG_ACTIEF_HOOG` (meetblad TRN-20, stap 8).

De 16 ingangen gaan via 2 kant-en-klare **optocouplerprints PC817** (8 kanalen elk) naar GPIO's van de ESP32-S3
(versie 4; daarvoor eigen AC-optocouplers LTV-844). Aan de ingangskant krijgt de print +12 V (VCC, na de polyfuse -F18);
een knop, schakelaar, reed of NPN-sensor trekt IN n naar 0 V: de led brandt. Een +12 V op IN n doet niets (geen spanning
over de led). Een sensor die zelf 12 V geeft (PNP) werkt niet rechtstreeks (README van de doos). Aan de uitgangskant
(VCC = 3,3 V van de ESP, jumper op pull-up) trekt de optocoupler OUT n naar GND = actief; in rust houdt de pull-up (op de
print en INPUT_PULLUP) hem hoog. Geeft jouw print hoog als hij actief is: bouwen met `-DTREIN_INGANG_ACTIEF_HOOG`
(INPUT_PULLDOWN). De firmware leest de ingangen elke 5 ms (geen interrupt); de ontdendering is 30 ms.

| Ingang | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GPIO | 1 | 2 | 4 | 5 | 6 | 7 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 21 | 40 | 41 |

Bewust niet als ingang gebruikt: GPIO 0, 3, 45, 46 (strapping), 19, 20 (USB), 35, 36, 37 (octal PSRAM van de
N16R8), 43, 44 (UART0), 38 (RGB-led op v1.1) en 48 (RGB-led op v1.0). De lijst staat in `src/hw.h`
(`INGANG_PINNEN`).

## Opbouw

| Bestand | Wat |
|---|---|
| `include/licht.h` | gamma, zachte overgangen, maximum, de 7 effecten, dag/nacht |
| `include/functies.h` | scènes en functies (stappen met wachttijden) |
| `include/ingangen.h` | ontdendering (30 ms), drukknop, schakelaar, sensor met nalooptijd |
| `include/opslag.h` | instellingen en laatste stand als JSON, volledig nagekeken bij het laden |
| `include/baan.h` | alles samen (de "doos" zonder hardware), met de testmodus |
| `include/api.h` | de JSON-API van het dashboard |
| `include/onderhoud.h` | BOOT-knop 5 s (lange druk), wanneer de hotspot opnieuw starten, controle van een nieuwe firmware |
| `src/hw.h` | eigen driver voor de PCA9685 (alleen Wire), de 16 ingangspinnen en het statuslampje |
| `src/main.cpp` | hardware, watchdog, wifi (hotspot en thuisnet), captive portal, mDNS, webserver, updates, bewaren |
| `test/test_*` | 78 tests op de pc (ook met 32 groepen: `native32`) |

Alle logica staat in `include/` en gebruikt geen Arduino-functies: zo is ze op de pc te testen.

## API

Alles JSON. Groepen, scènes, functies en ingangen hebben nummers vanaf 1.

| Vraag | Inhoud |
|---|---|
| `GET /api/staat` | alles (namen, scènes, functies, ingangen, instellingen, live stand) |
| `GET /api/staat?kort=1` | alleen de live stand; het dashboard vraagt dit elke seconde en haalt alles opnieuw op als `rev` verandert |
| `POST /api/groep` | `{"nr":3,"aan":true,"helderheid":60,"effect":"vuur","p1":60,"p2":5}` (nr mag ook `[3,4]`), `{"nr":3,"naam":"Station","max":80,"dagnacht":true}`, `{"allesUit":true}` |
| `POST /api/scene` | `{"actie":"oproepen","nr":1}`, `{"actie":"bewaren","naam":"Avond"}` (met `nr`: overschrijven), `{"actie":"hernoemen","nr":1,"naam":"..."}`, `{"actie":"wissen","nr":1}` |
| `POST /api/functie` | `{"actie":"start"/"stop"/"wissel","nr":1}`, `{"actie":"bewaren","nr":2,"functie":{...}}`, `{"actie":"wissen","nr":1}` |
| `POST /api/ingang` | `{"nr":1,"naam":"Knop perron","gedrag":"drukknop","functieA":1,"wisselen":true}` (`functieB`, `nalopen` in s) |
| `POST /api/instellingen` | `{"faduur":0.5,"dagnachtMin":20,"opstart":"laatste"/"uit","wachtwoord":"..."}`, `{"fabrieksinstellingen":true}` |
| `POST /api/instellingen` (thuisnet) | `{"thuisnet":{"ssid":"Thuis","wachtwoord":"..."}}`; `"ssid":""` = uit; het wachtwoord leeg = open netwerk. Het dashboard krijgt het wachtwoord nooit terug (alleen `metWachtwoord`) |
| `POST /api/dagnacht` | `{"loopt":true,"vanaf":"avond"}`, `{"loopt":false}` |
| `POST /api/test` | `{"actie":"looplicht","stapS":1}` (0,3 tot 5 s per groep), `{"actie":"vast","groep":5}`, `{"actie":"stop"}` |
| `POST /api/update` | de nieuwe firmware als multipart-upload (veld `firmware`, bestand `firmware.bin`); antwoord `{"ok":true,"herstart":true}`, daarna herstart de doos. Een bestand dat niet met 0xE9 begint of niet in het vrije app-slot past, wordt geweigerd |
| `GET /update` | een kleine eigen pagina om bij te werken (als het dashboard zelf stuk zou zijn) |

`/api/staat` geeft ook `"test":{"soort":"looplicht"|"vast"|"","groep":n}` (n = de groep die nu vol brandt, 0 = geen),
`"thuisnet":{"ssid":...,"verbonden":true,"ip":"192.168.1.40"}` en (volledig) `"aantalGroepen":16`.

Antwoord: `{"ok":true}` (soms met `"nr"`) of HTTP 400 met `{"ok":false,"fout":"uitleg"}`. Effecten: `geen`,
`knipperen`, `overweg`, `vuur`, `tv`, `lasvlam`, `tl`, `ademen`. Acties in een stap: `aan`, `uit`, `helderheid`,
`effect`, `scene`, `dagnacht`, `wissel` (staat een van de groepen aan, dan alle uit, anders alle aan). Een functie in JSON:

```json
{"naam":"Overweg","herhalen":false,"stopUit":true,"stappen":[
  {"groepen":[3,4],"actie":"effect","effect":"overweg","p1":600,"wacht":30},
  {"groepen":[3,4],"actie":"uit","wacht":0}]}
```

## Bewaren

`/instellingen.json` en `/stand.json` in LittleFS, met `"versie": 1`. Een onbruikbaar bestand (kapot, te groot,
andere versie) geeft de standaardinstellingen en een melding op het dashboard; het oude bestand blijft bewaard als
`/instellingen.kapot.json`. Losse foute waarden worden aangepast (ook met een melding). De stand wordt 3 s na een
wijziging bewaard (ten laatste na 30 s), de instellingen na 1 s; altijd eerst naar een tijdelijk bestand.

## Testmodus (ingebruikname, meetblad)

Bij Instellingen, "Testmodus": **Looplicht** zet groep 1, 2, ... om de beurt vol aan (zonder zacht aan, maximum of
effect), **Eén groep vol aan** houdt één groep aan om haar stroom te meten. Bovenaan elk tabblad staat dan een groene
balk met de groep die brandt en een knop om te stoppen; "Alles uit" stopt de testmodus ook. De gewone stand van de
groepen blijft bewaard en komt terug na het stoppen.

## Veiligheid tegen vastlopen

- **Watchdog** (esp_task_wdt, 8 s) op de lichttaak en op `loop()`: hangt een van beide, dan start de ESP opnieuw (de
  laatste stand komt terug). Tijdens een update reset de upload de watchdog bij elk stuk.
- **Hotspot weg** (na een wifi-fout): `loop()` kijkt elke 10 s na of de hotspot nog op 192.168.4.1 draait en start hem
  anders opnieuw (bij herhaald mislukken na 10, 20, 40 en dan elke 60 s).
- **Wachtwoord vergeten**: de BOOT-knop 5 s (zie Gebruiken).

## Uitbreiden tot 32 groepen

De firmware is voorbereid op een tweede PCA9685:

1. Tweede PCA9685-print: **A0 op 3,3 V** (soldeerbrug A0 dicht) = adres **0x41**; SDA, SCL, VCC (3,3 V), GND en **OE
   parallel** met de eerste (de pull-up -R1 blijft één weerstand voor beide). Kanaal 0..15 = groep 17..32, met nog 2
   MOSFET-modules en per groep een polyfuse, zoals groep 1..16.
2. In `platformio.ini` bij `[env:doos]` aan `build_flags` toevoegen: `-DTREIN_GROEPEN=32` (1 tot 32 kan), bouwen en
   flashen. Het dashboard toont dan vanzelf 32 groepen; de groepen zitten intern als bits in een masker van 32 bit.
3. Antwoordt een van de twee chips niet, dan blijven alle uitgangen uit (OE hoog) en meldt het dashboard het.

Extra ingangen of andere uitbreidingen: GPIO 11, 39, 42, 47 en 48 zijn vrij (zie Vaste aansluitingen). Met 32 groepen
gebruikt de firmware 65 396 bytes RAM (20,0 %).
