# Geluidskastje (treinverlichting versie 6, 2026-11-15)

Een klein kastje met een luidspreker dat je ergens op of onder de baan zet (kerk, station, overweg). Het hangt via wifi
aan de doos van de treinverlichting ("Treinbaan"): het meldt zich elke 30 s aan, de doos laat het een geluid spelen
(functiestap `{"actie":"geluid","kastje":"Kerk","geluid":"klok.wav","volume":80}`) en het dashboard uploadt de geluiden
rechtstreeks naar het kastje. Ian: "Geluiden: dit moeten kleine speakertjes zijn die ik ergens kan plaatsen."

- Buitenmaat **97,4 x 51,0 x 26,4 mm** (met de 2 oogjes 116,4 lang); binnen 93,4 x 47 x 22.
- 12 V in via een DC-bus 5,5 x 2,1 in de achterwand; USB-C van de ESP in de rechterwand (flashen met het deksel dicht).
- Luidspreker 40 mm 4 ohm 3 W achter een rooster in het deksel, in een gesloten ring (20 cm³ achter de conus).

| Bestand | Wat |
|---|---|
| `maak-kastje.mjs` | maakt `Geluidskastje-bak.kcad`, `Geluidskastje-deksel.kcad` en de samenstelling `Geluidskastje.kcad` |
| `print/Geluidskastje-bak.stl`, `print/Geluidskastje-deksel.stl` | voor de printer, al in printstand |
| `tekeningen/GLD-01-geluidskastje.svg/.pdf/.png` | werktekening A3: bak, deksel, doorsnede, onderdelen, bedrading |
| `firmware/` | PlatformIO-project van het kastje (ESP32-S3-Zero) |
| `maak-pdf.mjs`, `maak-fotos.mjs` | PDF/PNG van de tekening, beelden uit Phlippo CAD |

## Onderdelen (met bron)

| Onderdeel | Gegevens | Bron |
|---|---|---|
| ESP32-S3-Zero (Waveshare) | ESP32-S3FH4R2: 4 MB flash, 2 MB PSRAM; print 23,5 x 18 (24,8 met de USB-C); USB-C rechtstreeks op de S3 (geen UART-chip); 5V-pin 3,7 tot 6 V; LDO ME6217 (800 mA); RGB-led op GPIO21 | [Waveshare wiki](https://www.waveshare.com/wiki/ESP32-S3-Zero), [CNX Software](https://www.cnx-software.com/2024/08/07/waveshare-esp32-s3-zero-is-a-tiny-wifi-and-ble-iot-module-with-a-usb-c-port-up-to-32-gpios/), [espboards.dev](https://www.espboards.dev/esp32/esp32-s3-zero/) |
| MAX98357A-breakout (Adafruit 3006 of kloon) | 19,4 x 17,8 x 3,0; 2,7 tot 5,5 V; 3,2 W op 4 ohm / 1,8 W op 8 ohm (5 V, 10 % THD); 8 tot 96 kHz; geen MCLK; versterking 9 dB (GAIN open); SD laag = uit | [Adafruit 3006](https://www.adafruit.com/product/3006), [pinout](https://learn.adafruit.com/adafruit-max98357-i2s-class-d-mono-amp/pinouts) |
| Luidspreker 40 mm 4 ohm 3 W (bv. Adafruit 3968) | Ø40, 20 hoog, 27 g; flens 2 dik en lijf Ø34: AANNAME (na te meten) | [Adafruit 3968](https://www.adafruit.com/product/3968) |
| MP1584EN-module 12 -> 5 V | 22 x 17 x 4; in 4,5 tot 28 V, uit 0,8 tot 20 V instelbaar, 3 A max (1,8 A gewoon); dikte print 1,0: AANNAME | listings o.a. [hallroadlahore](https://hallroadlahore.pk/mini-mp1584en-dc-dc-buck-adjustable-step-down-module-4.5v-28v-input-0.8v-20v-output/), [digitec](https://digitec.ch/en/s1/product/purecrea-mp1584-3a-switching-regulator-dc-dc-step-down-converter-development-boards-kits-25442321) |
| DC-bus 5,5 x 2,1 (DC-022B) | lijf 10 x 10 x 12, gat Ø8, paneel tot 4 mm, met moer | [Tinytronics](https://www.tinytronics.nl/en/cables-and-connectors/connectors/dc-jack/dc-jack-plastic-5.5mm-female-dc-022b) |

Waarom geen Mini-360 als regelaar: die levert 1,8 A piek (1,2 A blijvend), het kastje vraagt op 5 V tot 1,82 A piek
(zie hieronder). De MP1584EN (3 A) heeft genoeg marge.

## Berekening (`berekening()` in maak-kastje.mjs)

- **Piekstroom versterker**: 3,2 W op 4 ohm is een piekspanning van 5,06 V, door de BTL-uitgang begrensd op 5,0 V:
  1,25 A door de luidspreker. Uit de 5 V (rendement 85 %): 5,0 x 1,25 / (0,85 x 5,0) = **1,47 A** op de toppen.
- **ESP32-S3**: tot 0,35 A tijdens het zenden over wifi (AANNAME uit het datablad: 340 mA), 0,10 A gemiddeld.
- **5 V samen: 1,82 A piek** -> MP1584EN (3 A) is goed, Mini-360 (1,8 A) te krap. Een gewone volle sinus duurt
  maar zo lang als een proeftoon: echt geluid (spraak, klok, trein) is gemiddeld ongeveer 1/8 van het piekvermogen
  (crestfactor 12 dB, AANNAME).
- **Uit 12 V** (MP1584 88 %): piek 5,0 x 1,82 / (0,88 x 12) = **0,86 A**, gemiddeld **92 mA**. Tel per kastje 1 A bij
  de 12 V-voeding van de baan.
- **Warmte**: 0,70 W (ESP 0,5 W, verliezen in versterker en regelaar 0,2 W). Over 0,019 m² buitenkant met
  7 W/m²K (natuurlijke convectie + straling, AANNAME): **5,7 K warmer** dan de lucht. PETG kan tot 70 °C: geen probleem.
- **Volume**: 82 dB/1 W/1 m (AANNAME voor een 40 mm-luidspreker) + 10 log 3,2 = **87 dB op 1 m** op vol vermogen:
  ruim genoeg voor een modelbaan. Het volume (0 tot 100) staat in de firmware kwadratisch: 50 = -12 dB.

## Bestellijst per kastje

Richtprijzen november 2026, incl. btw; AANNAME waar geen prijs gevonden is. Niets besteld.

| Onderdeel | Aantal | Type | Winkel | Prijs | Totaal |
|---|---|---|---|---|---|
| ESP32-S3-Zero | 1 | Waveshare 25517 (zonder pinnen solderen we draadjes) | Berrybase | € 7,80 | € 7,80 |
| I2S-versterker | 1 | MAX98357A, Adafruit 3006 (of kloon ~ € 2,50, AANNAME) | Kiwi Electronics / Adafruit (AANNAME prijs) | € 6,50 | € 6,50 |
| Luidspreker | 1 | 40 mm 4 ohm 3 W, max 20 diep (Adafruit 3968 of gelijkwaardig) | Kiwi Electronics (AANNAME prijs) | € 5,50 | € 5,50 |
| Regelaar | 1 | MP1584EN-module, instelbaar | Tinytronics / AliExpress (AANNAME prijs) | € 1,80 | € 1,80 |
| DC-bus | 1 | 5,5 x 2,1 paneel, DC-022B | Tinytronics | € 0,50 | € 0,50 |
| DC-stekker met schroefklemmen | 1 | 5,5 x 2,1 male (voor de 12 V-kabel van de baan) | Tinytronics (AANNAME prijs) | € 0,75 | € 0,75 |
| Plaatschroef 2,2 x 4,5 bolkop | 4 | DIN 7981 / ISO 7049 | bouwmarkt/Conrad (AANNAME) | € 0,05 | € 0,20 |
| Sluitring M2,5 Ø8 | 4 | DIN 9021: 3 staal + 1 nylon | idem (AANNAME) | € 0,05 | € 0,20 |
| Plaatschroef 2,9 x 9,5 bolkop | 4 | DIN 7981 | idem (AANNAME) | € 0,05 | € 0,20 |
| Foamring | 1 | zelfklevend foam 1 mm, Ø40 / Ø34 (uit een strook knippen) | (AANNAME) | € 0,20 | € 0,20 |
| Draad 0,25 mm² | 1 m | soepel, 4 kleuren | (AANNAME) | € 0,30 | € 0,30 |
| PETG | 52 g | bak zwart, deksel grijs | rol € 25/kg | € 1,30 | € 1,30 |
| **Totaal per kastje** | | | | | **€ 25,25** |

Plus 2 schroeven 3,5 x 16 om het kastje vast te zetten (meestal al in huis).

## Printen

- `print/Geluidskastje-bak.stl`: rechtop, de bodem op het bed. `print/Geluidskastje-deksel.stl`: plat, de buitenkant
  (met het rooster) op het bed. Beide al zo gedraaid.
- PETG, laag 0,2, 3 wanden, 20 % vulling, **geen support**: alle wanden staan recht, de opening van de USB-C heeft
  45°-hoeken met een brug van 8,5 mm, het gat van de DC-bus is een druppel met een 45°-punt, de oogjes liggen op het bed.
- Na het printen: de voorgaten (Ø1,8 in de paaltjes, Ø2,4 in de bussen) eventueel met een boortje van die maat uitruimen.

## Bouwen

1. **Regelaar instellen**: de MP1584EN aan 12 V hangen, met een multimeter op OUT de trimmer draaien tot **5,0 V**
   (nooit hoger dan 5,5 V: dan gaan de ESP en de versterker stuk). Pas daarna aansluiten.
2. **Bedraden** (zie GLD-01, rechts): draadjes van 0,25 mm², zo kort mogelijk, rechtstreeks op de printjes solderen
   (geen pinnen onder de printjes: die liggen op steunrails van 3 mm):

   | Van | Naar | Kleur |
   |---|---|---|
   | DC-bus + (pen) | MP1584 IN+ | oranje |
   | DC-bus − (huls) | MP1584 IN− | zwart |
   | MP1584 OUT+ | ESP **5V** en MAX98357A **VIN** | rood |
   | MP1584 OUT− | ESP **GND** en MAX98357A **GND** | zwart |
   | ESP **GPIO4** | MAX98357A **BCLK** | geel |
   | ESP **GPIO5** | MAX98357A **LRC** | groen |
   | ESP **GPIO6** | MAX98357A **DIN** | blauw |
   | ESP **GPIO1** | MAX98357A **SD** | grijs |
   | MAX98357A + / − (klemmenblok) | luidspreker + / − | rood / zwart |

   GAIN blijft open (9 dB). GPIO1, 4, 5 en 6 zijn geen strapping-pinnen (dat zijn 0, 3, 45 en 46 bij de ESP32-S3).
   SD hoog = versterker aan (hij speelt het linkerkanaal; de firmware stuurt links = rechts), laag = uit.
3. **Inbouwen**: DC-bus van binnen door de achterwand, moer buiten. De printjes op hun rails leggen (de USB-C van de
   ESP in de opening), elk met een plaatschroef 2,2 x 4,5 en een brede sluitring vastklemmen: de ring ligt 1,6 mm op de
   rand van de print. Bij de antenne van de ESP de **nylon** ring. Niet te hard aandraaien (1/8 slag na contact).
4. De luidspreker met de conus naar boven op de ring leggen (de draadjes door de uitsparing), een foamring op de flens,
   het deksel erop en met 4 plaatschroeven 2,9 x 9,5 vastzetten: het deksel drukt de luidspreker vast.
5. **Flashen** via de USB-C (deksel mag dicht):
   `cd voorbeelden/treinverlichting/geluidskastje/firmware` en `python -m platformio run -e kastje -t upload`.
   Wordt het kastje niet gevonden: de BOOT-knop van de ESP vasthouden terwijl je de kabel insteekt.

## Gebruiken

- **Aanmelden**: na het aansluiten zoekt het kastje "Treinbaan" (wachtwoord "treinbaan") en meldt zich elke 30 s bij
  de doos. In het dashboard verschijnt het als "Kastje a1b2c3" (het id staat ook op de seriële monitor): geef het daar
  een naam (bv. "Kerk"). Het lampje op de ESP: groen = verbonden en aangemeld, geel = verbonden maar de doos antwoordt
  niet, oranje knipperend = zoekt, blauw = eigen hotspot, wit = speelt.
- **Geen "Treinbaan" na 60 s**: het kastje maakt een eigen hotspot "Geluidskastje-xxxx" (wachtwoord "treinbaan"). Daarmee
  verbinden en `http://192.168.5.1/` openen: daar staan naam, volume, de geluiden en het netwerk (bv. een ander
  wachtwoord). **BOOT 5 s vasthouden** zet de wifi terug op "Treinbaan" / "treinbaan".
- **Geluid uploaden** via het dashboard van de doos (het dashboard stuurt het rechtstreeks naar het kastje) of via de
  eigen pagina van het kastje. Er is plaats voor ongeveer 75 s geluid op 16 kHz (2,4 MB), hoogstens 64 geluiden.
- **WAV maken met Audacity**: geluid openen, Sporen > Mixen > *Stereo naar mono mixen*, linksonder de projectfrequentie
  op **16000 Hz**, eventueel Effect > Normaliseren (-1 dB), dan Bestand > Exporteren > Als WAV:
  *WAV (Microsoft)*, **signed 16-bit PCM**. Naam met kleine letters zonder spaties (bv. `klok.wav`).
  8000 tot 22050 Hz mag; stereo, 24-bit, 32-bit float of 44,1 kHz worden geweigerd met een duidelijke melding.

### API van het kastje (contract versie 6, poort 80, CORS `*`)

| Verzoek | Antwoord |
|---|---|
| `GET /info` | `{"ok":true,"id","naam","geluiden":[{"naam","s","bytes"}],"vrij","totaal","versie","volume","speelt","ip","wifi":{...}}` |
| `POST /speel {"geluid":"klok.wav","volume":80}` | speelt (volume maal het volume van het kastje); een nieuw geluid onderbreekt het vorige |
| `POST /stop` | stopt |
| `POST /geluid?naam=klok.wav` (body = WAV, of een FormData met één bestand) | `{"ok":true,"naam","s","vrij"}` |
| `DELETE /geluid?naam=klok.wav` | wist |
| `POST /naam {"naam":"Kerk"}`, `POST /volume {"volume":80}` | bewaard in `/kastje.json` |
| `POST /wifi {"ssid":"Treinbaan","wachtwoord":"treinbaan","doos":"192.168.4.1"}` | ander netwerk (`doos` mag ontbreken) |

Fouten: HTTP 400 (of 404/405/411/413/507) met `{"ok":false,"fout":"..."}`. Aanmelden:
`POST http://192.168.4.1/api/kastje {"actie":"aanmelden","id","naam","ip","geluiden":[{"naam","s"}],"versie":"1.0.0"}`.

## Firmware

- PlatformIO, `espressif32@6.9.0`, Arduino, board `esp32-s3-devkitc-1` met 4 MB flash; partities `partities.csv`:
  app 1,5 MB (flashen via USB, geen OTA), LittleFS 2,375 MB voor de geluiden.
- Alleen wat in Arduino-ESP32 zit (WiFi, HTTPClient, LittleFS, ESPmDNS, de I2S-driver van ESP-IDF) en ArduinoJson 7.2.1.
  De webserver is een eigen kleine HTTP-server (`include/http.h`): de WebServer van Arduino-ESP32 2.0.17 leest bij een
  binaire POST (de WAV) de queryparameter `?naam=` niet, en zijn gewone weg breekt af op de eerste nulbyte.
- De logica is header-only en getest op de pc: `include/kastje.h` (WAV-kop, volume, namen, instellingen, JSON),
  `include/http.h` (verzoek, kop, CORS, multipart), `include/wifiplan.h` (hotspot na 60 s, aanmelden elke 30 s,
  BOOT-knop). `python -m platformio test -e native`: **40 tests**.
- `python -m platformio run -e kastje`: RAM 17 %, flash 55 % van 1,5 MB.
- ArduinoJson en Unity kwamen uit de map `.pio/libdeps` van de doos (niets gedownload); op een nieuwe pc haalt
  PlatformIO ze zelf op.

## Opnieuw maken

```
node voorbeelden/treinverlichting/geluidskastje/maak-kastje.mjs
KASTJE=1 KASTJE_STL=1 KASTJE_TEKENING=1 npx vitest run src/qa/qaKastje.test.ts
node voorbeelden/treinverlichting/geluidskastje/maak-pdf.mjs
node voorbeelden/treinverlichting/geluidskastje/maak-fotos.mjs e2e-out/geluidskastje   (de app met test-hooks op :5185)
```

`src/qa/qaKastje.test.ts` kijkt na: bak en deksel bouwen exact (B-rep) als één lichaam, passen op het bed, printen
zonder support (geen overhang boven 45° buiten de brug van de USB-opening), niets botst in de samenstelling, de kcad's
zijn gelijk aan wat de generator maakt, de sluitringen klemmen de printjes, de regelaar kan de piekstroom leveren.

## Open punten en aannames

- Na te meten: flens (2) en lijf (Ø34) van de luidspreker (de ring is Ø37 binnen: een lijf tot Ø36 past); dikte van de
  print van de ESP32-S3-Zero (1,0) en de MP1584 (1,0); hoogte van het klemmenblok op de MAX98357A; lijf van de DC-bus.
- Vóór het printen de echte onderdelen naast de tekening leggen; past iets niet, de maat in `K` van maak-kastje.mjs
  aanpassen en opnieuw maken.
- De kleurvolgorde van de RGB-led van de ESP32-S3-Zero (RGB of GRB) is niet bevestigd: zijn rood en groen omgewisseld,
  dan alleen de kleuren in `lampje()` (main.cpp) omwisselen.
- Prijzen zijn richtprijzen (zie de bestellijst); de winkels zijn niet gecontacteerd.
