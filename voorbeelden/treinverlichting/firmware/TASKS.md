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

## Firmware 2.0: IR, servo's, PNP, bussen, haltes, kastjes (2026-11-15)
- [x] ir.h: NEC/RC5 coderen en decoderen (tolerantie), raw-hash, leren uit de draaggolf (TSMP58000), codetekst; test_ir
- [x] servo.h: eindstanden, snelheid (µs/s), max 4 tegelijk (wachtrij), µs -> PCA9685-tellen bij 50 Hz; test_servo
- [x] bussen.h en halte.h: bus gezien bij punt, rijtijd per traject, fractie; toestandsmachine bushalte; test_bus, test_interpolatie, test_halte
- [x] ingangen: npn/pnp per ingang en per groep van 8, ingangen 17-24 (MCP23017 0x20) en 25-40 (tweede MCP23017 0x21, optioneel); functiestappen servo/ir/geluid; config-versie 3 (v1/v2 laden nog)
- [x] api.h: /api/ir, /api/bus, /api/punt, /api/servo, /api/halte, /api/kastje, /api/plan, staat uitgebreid; tests in test_api
- [x] src/: RMT TX (GPIO47) en RX (48/11/39/42), MCP23017 (0x20), PCA9685 servo's (0x42, 50 Hz), HTTP naar de kastjes, /tv, /api/plan, /plan.jpg; maak-header.py met tv.html
- [x] native en native32 groen, `doos` bouwen (flash/RAM)
- [x] README 2.0.0 (pinnen, I2C-adressen, API, PNP), graphify update

## Advies Fable 5.2 (2026-11-16)
- [x] Drivers testbaar: Pca9685, PcaServo, Mcp23017 als template in include/i2c.h; nep-Wire en MCP-model in test/nep; test_hw
- [x] E6: I2C 100 kHz, Wire.setTimeOut(10), alleen gewijzigde kanalen schrijven, MCP 0x20 alleen poort B lezen (BANK=1, 3 bytes); F11 busherstel (9 klokpulsen)
- [x] E1: irLedActiefLaag (instelling, standaard = bouwvlag), zetA keert om, begin(): eerst OLATA uit, dan IODIRA; test met negatieve proef
- [x] E7: GPA7/GPB7 nooit ingang (23 ingangen, 0x21: 25-38); F10 in commentaar en als model-test
- [x] E3: printSoort per print (vcc/gnd/apart), omkeren bij gnd+npn, pnp op vcc geweigerd; config-versie 4, oude bestanden omgezet; tests met negatieve proef
- [x] E2: niveau van de ontvangers 2-4 lezen (laag > 50 ms = ftr-melding, hoog = einde); RMT-gedrag bevestigd in de documentatie van ESP-IDF 4.4; test met negatieve proef
- [x] IR in include: rmt-items bouwen en lezen (irrmt.h), IrZender (F4: 2 ticks voor en na, F1 continu), E4 duty 33/50 en IR-zelftest via -B1, F5 weigeren + teller, F13 NEC-bytes zoals gelezen, F17 leerbuffer 48 kB + "code te lang", F8 kanaal 1 met 3 blokken
- [x] Servo's: E8 gestaffeld opstarten en eerste opdracht door de rij, E14 wachten bij meer dan 12 groepen, E19 pulsUitS
- [x] Halte: F2 herhalen + rijcode na opstarten, F3 één wachtende bus, F12 maxVerkeerS met melding
- [x] Bussen/punten: V1 alleenBus, V2 FIFO per strook (commentaar); F16 kastjes 400 ms en offline na een fout
- [x] main.cpp: F6 toegang (hotspot of wachtwoordkop, Origin), V5 CORS, F7 10 clients, F9 OE-commentaar, E5 commentaar, F14 tekst, F15 JSON buiten het slot + stapelmeting, GET /api/zelftest (Q1)
- [x] Q3: ontbrekende gevallen als tests; native en native32 groen; doos bouwen (flash/RAM)
- [x] Firmware 2.1.0, README (nieuw in 2.1.0, instellingen, tabel getest op de pc / gemeten op hardware), graphify update

## Advies Fable 5.2, tweede ronde (2026-11-17)
- [x] FN2 + QN1: PCA9685 begin() met MODE1 0x30 (beide), NepChip strikt (AI-bit, NACK halverwege, 128 bytes); test met negatieve proef
- [x] FN1 + QN2: wachtLeds per halte (API, opslag, dashboard); stopcode voor de wachtende alleen via wachtLeds, rijcode in groen altijd via stopLeds; test vanuit de bus met negatieve proef
- [x] FN3 + EN3: servo-rem standaard uit, instelling "wachten boven n groepen" (0 = uit) met één servo tegelijk, melding na 5 s; servoMaxBewegend (standaard 2); tests
- [x] EN1 + TN3: vlag continu in /api/staat en codes, waarschuwing 470 Ω in het dashboard, firmwaregrens continu zenden; zelftest-tekst en niveau GPIO11 zichtbaar
- [x] Dashboard: wachtLeds per halte met uitleg, waarschuwing continu, servo-instellingen en melding, zelftest TN3, rijVol; demomodus bij
- [x] FN4, FN5, FN6, FN7: busherstel netjes + kortsluitmelding, Host-controle, tekst /update, bewaarvlag voor lange codes, kiesLeds en volle rij tellen, rijcode 3 keer na opstarten
- [x] VN1: busOver als pure functie (ui/tv-logica.js) met onzekerheidsgrens; node --test in ui/test met negatieve proef
- [x] native, native32 groen, doos bouwen; firmware 2.2.0; maak-tv.py en maak-header.py; README (nieuw in 2.2.0)
- [x] Screenshots dashboard en tv (scratchpad trein-v7), graphify update
