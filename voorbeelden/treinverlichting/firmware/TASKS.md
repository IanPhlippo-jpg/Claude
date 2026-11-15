# Taken - treinverlichting firmware

## Firmware lichtsturing modelbaan (2026-11-08)
- [x] PlatformIO-project: env `doos` (ESP32-S3 N16R8, LittleFS) en env `native` (Unity), ArduinoJson met vaste versie
- [x] Pure logica in headers: licht.h (gamma, fades, effecten, dag/nacht), functies.h (scènes, sequencer), ingangen.h (ontdendering, gedrag), opslag.h (JSON, validatie), baan.h (alles samen) en api.h
- [x] Hosttests per header (test_licht, test_functies, test_ingangen, test_opslag, test_api) en allemaal groen
- [x] Drivers PCA9685 en MCP23017 (Wire), main.cpp: veilig opstarten (kanalen 0, dan OE laag), hotspot, captive portal, mDNS, webserver, opslaan
- [x] Dashboard ui/dashboard.html (één bestand, licht/donker, demo-modus op file://)
- [x] ui/maak-header.py: dashboard.html gzip naar src/dashboard.h (ook automatisch bij het bouwen)
- [x] `doos` bouwen (flash/RAM), demo openen en schermafbeeldingen nakijken
- [x] README met API, pinnen en adressen

## Ingangen via TCA9555 in plaats van MCP23017 (2026-11-08)
- [x] src/hw.h: driver Tca9555 (input 0x00/0x01, polariteit 0x04/0x05 = 0, config 0x06/0x07 = 0xFF), geen interne pull-ups
- [x] main.cpp, ingangen.h, platformio.ini, README en TASKS: MCP23017 wordt TCA9555 (10 kΩ pull-ups op de print, INT op GPIO11)
- [x] beide envs bouwen, tests groen

## Ingangen rechtstreeks op GPIO's, geen expander (2026-11-08)
- [x] src/hw.h: Tca9555 weg, ingangen via GPIO 1, 2, 4, 5, 6, 7, 12, 13, 14, 15, 16, 17, 18, 21, 38, 39 (INPUT_PULLUP, actief laag)
- [x] main.cpp: ingangen elke 5 ms lezen, geen interrupt meer (GPIO11 vrij); licht blijft elke 10 ms naar de PCA9685
- [x] commentaar, platformio.ini, README (pinlijst en verboden pinnen)
- [x] beide envs bouwen, tests groen

## Pinlijst v1.1: ingang 15/16 op GPIO40/41, RGB-led op GPIO38 als statuslampje (2026-11-08)
- [x] hw.h, main.cpp, README: ingang 15 = GPIO40, ingang 16 = GPIO41; GPIO38 niet als ingang
- [x] statuslampje GPIO38 met neopixelWrite: groen = hotspot actief, rood = PCA9685 antwoordt niet
- [x] beide envs bouwen, tests groen

## Fable-advies verwerken (2026-11-12)
- [x] Groepen uitbreidbaar: TREIN_GROEPEN (1..32), groepsmasker uint32_t, env native32, tweede PCA9685 op 0x41
- [x] Nieuwe stap-actie "wissel" en standaard: functie 2 "Alles aan/uit", ingang 1 = drukknop
- [x] Testmodus in de Baan (looplicht, groep vast) met API /api/test en hosttests
- [x] Thuis-wifi (thuisnet) in instellingen, opslag en API; AP+STA in main.cpp
- [x] Hulplogica in include/onderhoud.h: lange druk (BOOT 5 s), hotspotwacht, controle update-image; hosttests
- [x] main.cpp: watchdog, hotspot herstellen, BOOT-knop, OTA /api/update, thuisnet, tweede PCA
- [x] Dashboard: testmodus, firmware bijwerken, thuisnet, actie wissel (ook demo-modus)
- [x] README, platformio.ini (micro-USB), tests native en native32 groen, doos bouwen, beelden

## Firmware 1.3.0: groepen alleen aan/uit, hallsensoren op de ingangen (2026-11-15)
- [x] licht.h, baan.h, functies.h: dimmen weg (helderheid, faduur, maximum, gamma, vuur/tv/ademen); uitgang = aan/uit-masker
- [x] ingangen.h: soort "puls" (hallsensor) met flankvlag, vasthoudtijd (300 ms) en teller per ingang
- [x] opslag.h en api.h: CONFIG_VERSIE 2 met omzetting van versie 1, API zonder helderheid, soort/vasthouden/teller
- [x] hw.h en main.cpp: PCA9685 alleen volledig aan/uit-bit, GPIO-interrupt (IRAM) per ingang met atomair uitlezen
- [x] hosttests aanpassen en uitbreiden (puls 1..10 ms, teller, drukknop ontdenderd, aan/uit, oude config), native en native32 groen
- [x] dashboard: schakelaar per groep, scènes/functies aan/uit, ingangen met lampje en teller, soort en vasthoudtijd (ook demo); dashboard.h opnieuw
- [x] doos bouwen (flash/RAM), README bijwerken (aan/uit, hallsensor, API, 1.3.0)
- [x] dashboardbeelden opnieuw (trein-dashboard-shots.mjs) en nakijken
