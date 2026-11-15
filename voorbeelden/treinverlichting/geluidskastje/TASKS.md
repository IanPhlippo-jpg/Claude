# Taken - geluidskastje

## Geluidskastje: firmware, behuizing, tekening, bestellijst (2026-11-15)
- [x] Contract en bestaande doos (generator, schets.mjs, firmware, tekeningen, QA-test) lezen
- [x] Onderdelen kiezen met bron (ESP32-S3-Zero, MAX98357A, luidspreker, regelaar 12 -> 5 V, 12 V-klem) + stroom/warmte/volume rekenen
- [x] Firmware (PlatformIO): header-only logica (WAV-header, volume, aanmeld-JSON, naam/opslag) + native tests
- [x] Firmware: API (/info, /speel, /stop, /geluid, /naam, /volume, /wifi, CORS), aanmelden elke 30 s, hotspot na 60 s, I2S-weergave; `pio run -e kastje`
- [x] Behuizing: maak-kastje.mjs -> Geluidskastje-bak/-deksel/samenstelling .kcad (rooster, paaltjes, kabelinvoer, sleutelgaten, 45°-regel)
- [x] src/qa/qaKastje.test.ts: kcad's opnieuw bouwen, botsingen, STL's met KASTJE_STL=1 -> print/
- [x] Werktekening GLD-01 (A3: bak, deksel, maten, onderdelen, bedrading) als SVG + PNG
- [x] README.md: wat, bestellijst met prijzen, printen, bouwen, flashen, gebruiken, WAV maken, opnieuw maken
- [x] Foto's van de behuizing (alleen als de preview op :5185 al draait)
- [x] graphify update en eindrapport
