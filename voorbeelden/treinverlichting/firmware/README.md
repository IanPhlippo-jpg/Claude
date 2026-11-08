# Treinbaan: firmware van de lichtdoos

ESP32-S3-DevKitC-1 (N16R8) met een PCA9685 (16 lichtgroepen) en 16 ingangen rechtstreeks op GPIO's. De doos maakt
een eigen wifi-netwerk met een dashboard voor gsm en tablet.

## Gebruiken

1. Verbind de gsm met wifi **Treinbaan**, wachtwoord **treinbaan** (te wijzigen bij Instellingen).
2. Het dashboard opent vanzelf. Anders: `http://192.168.4.1` of `http://treinbaan.local`.

## Bouwen, flashen, testen (vanuit deze map)

| Wat | Opdracht |
|---|---|
| bouwen en flashen | `python -m platformio run -e doos -t upload` |
| seriële monitor | `python -m platformio device monitor -e doos` |
| tests op de pc (61) | `python -m platformio test -e native` |
| proef op de pc | `python -m platformio run -e native` en dan `.pio\build
ative\program.exe` |

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
| GPIO10 | OE van de PCA9685 (actief laag; externe pull-up naar 3,3 V houdt alles uit bij reset) |
| GPIO11 | vrij |
| GPIO38 | RGB-led op het bord (DevKitC-1 v1.1) = statuslampje: groen = hotspot actief, rood = PCA9685 antwoordt niet |

PCA9685 op adres 0x40 (A0..A5 aan GND): kanaal 0..15 = groep 1..16, ~1017 Hz, 12 bit.

De 16 ingangen gaan via optocouplers rechtstreeks naar GPIO's van de ESP32-S3. De optocoupler trekt de pin naar GND =
actief; in rust houdt de interne pull-up (INPUT_PULLUP) hem hoog. De firmware leest ze elke 5 ms (geen interrupt);
de ontdendering is 30 ms.

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
| `include/baan.h` | alles samen (de "doos" zonder hardware) |
| `include/api.h` | de JSON-API van het dashboard |
| `src/hw.h` | eigen driver voor de PCA9685 (alleen Wire), de 16 ingangspinnen en het statuslampje |
| `src/main.cpp` | hardware, wifi, captive portal, mDNS, webserver, bewaren |
| `test/test_*` | 61 tests op de pc |

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
| `POST /api/dagnacht` | `{"loopt":true,"vanaf":"avond"}`, `{"loopt":false}` |

Antwoord: `{"ok":true}` (soms met `"nr"`) of HTTP 400 met `{"ok":false,"fout":"uitleg"}`. Effecten: `geen`,
`knipperen`, `overweg`, `vuur`, `tv`, `lasvlam`, `tl`, `ademen`. Acties in een stap: `aan`, `uit`, `helderheid`,
`effect`, `scene`, `dagnacht`. Een functie in JSON:

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
