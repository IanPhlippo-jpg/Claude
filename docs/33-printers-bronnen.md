# Printerdatabase 3D Print: overzicht en bronnen (2026-11-18)

Dit overzicht hoort bij `src/print/printerDatabase.json` en `src/print/materialProfiles.json` (eisen: `docs/33-eisen-3d-print-extensie.md`, toezicht: `docs/34-supervisie-fable-3d-print.md`).

Regels die voor elke waarde gelden:

- Elk getal komt van een pagina van de fabrikant (bambulab.com, blog.bambulab.com, elegoo.com, gebruikershandleidingen op elegoo.com.cn, persberichten van Elegoo via PR Newswire) of uit een technisch gegevensblad (TDS) van de fabrikant. De URL staat per printer in `sources`.
- Elegoo blokkeerde tijdens het verzamelen de productpagina's (HTTP 429). De beschrijvingstekst van elke productpagina is wel gelezen (via de productfeed van de officiële winkel), net als de handleidingen. Waarden die alleen in de specificatietabel van een productpagina staan, zijn daardoor bij een deel van de Elegoo-printers AANNAME gebleven; die zijn als eerste te controleren.
- Wat niet op zo'n pagina stond, staat per printer in `assumptions` als `veld: waarde (reden)` en heet hieronder AANNAME.
- Er is niets overgenomen uit profielbestanden van Bambu Studio, OrcaSlicer, ElegooSlicer of PrusaSlicer (AGPL).
- Elke printer staat op `validatie: "nog te printen"`. Een proefprint (kalibratiekubus 20 mm) is de vrijgave.
- `printableArea`, `excludeAreas`, `travelLimits`, `origin` en `thumbnailFormat` zijn voor alle printers AANNAME: geen fabrikant publiceert ze. Ze zijn bewust veilig gekozen (gelijk aan het bed, oorsprong linksvoor, geen uitgesloten zones) en moeten per printer gecontroleerd worden tegen een bestand dat Ian uit de slicer van de fabrikant exporteert.

## Telling

| Merk | Leverbaar | Aangekondigd | Uit productie | Totaal |
|---|---|---|---|---|
| Bambu Lab | 11 | 0 | 4 | 15 |
| Elegoo | 19 | 2 | 15 | 36 |

## Aangekondigd, nog niet leverbaar

- **Elegoo Centauri X Ultra** (aangekondigd 2026-11). AANGEKONDIGD op Formnext 2026 (17 november 2026): eerste toolchanger van Elegoo met vier onafhankelijke printkoppen. Geen prijs of leverdatum. Bijna alle waarden zijn AANNAME; zie `assumptions`.
- **Elegoo Saturn 5 Ultra** (aangekondigd 2026-11). AANGEKONDIGD op Formnext 2026 (17 november 2026); lancering gepland begin Q1 2027. Elegoo noemt alleen een "intelligent resin management system"; geen technische gegevens. Bijna alle waarden zijn AANNAME; zie `assumptions`.

## Bambu Lab: FDM

| Model | Status | Aangekondigd | Bouwvolume (mm) | Nozzle max | Bed max | Behuizing | Koppen | Meerkleuren | Max snelheid | Max versnelling | G-code | Bestand | AANNAMES |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| X1 | uit productie | 2022-05 | 256 x 256 x 256 | 300 °C | 110 °C | ja | 1 | AMS up to 16 | 500 mm/s | 20000 mm/s² | bambu | .gcode.3mf | 8 |
| X1 Carbon | uit productie | 2022-05 | 256 x 256 x 256 | 300 °C | 110 °C | ja | 1 | AMS up to 16 | 500 mm/s | 20000 mm/s² | bambu | .gcode.3mf | 7 |
| X1E | uit productie | 2023-10 | 256 x 256 x 256 | 320 °C | 110 °C | ja | 1 | AMS up to 16 | 500 mm/s | 20000 mm/s² | bambu | .gcode.3mf | 8 |
| P1P | uit productie | 2022-11 | 256 x 256 x 256 | 300 °C | 100 °C | nee | 1 | AMS up to 16 | 500 mm/s | 20000 mm/s² | bambu | .gcode.3mf | 8 |
| P1S | leverbaar | 2023-07 | 256 x 256 x 256 | 300 °C | 100 °C | ja | 1 | AMS up to 16 | 500 mm/s | 20000 mm/s² | bambu | .gcode.3mf | 9 |
| A1 mini | leverbaar | 2023-09 | 180 x 180 x 180 | 300 °C | 80 °C | nee | 1 | AMS lite, 4 colours | 500 mm/s | 10000 mm/s² | bambu | .gcode.3mf | 6 |
| A1 | leverbaar | 2023-12 | 256 x 256 x 256 | 300 °C | 100 °C | nee | 1 | AMS lite, 4 colours | 500 mm/s | 10000 mm/s² | bambu | .gcode.3mf | 6 |
| H2D | leverbaar | 2025-03 | 325 x 320 x 325 | 350 °C | 120 °C | ja | 2 | Dual nozzle; up to 4 AMS 2 Pro + 8 AMS HT (24 slots), up to 25 colours | 1000 mm/s | 20000 mm/s² | bambu | .gcode.3mf | 5 |
| H2D Pro | leverbaar | 2025-08 | 325 x 320 x 325 | 350 °C | 120 °C | ja | 2 | Dual nozzle; AMS 2 Pro + AMS HT (as H2D) | 1000 mm/s | 20000 mm/s² | bambu | .gcode.3mf | 6 |
| H2S | leverbaar | 2025-08 | 340 x 320 x 340 | 350 °C | 120 °C | ja | 1 | Up to 4 AMS 2 Pro + 8 AMS HT (24 slots), up to 24 colours | 1000 mm/s | 20000 mm/s² | bambu | .gcode.3mf | 5 |
| P2S | leverbaar | 2025-10 | 256 x 256 x 256 | 300 °C | 110 °C | ja | 1 | Up to 4 AMS 2 Pro + 4 AMS HT (20 slots), up to 20 colours | 600 mm/s | 20000 mm/s² | bambu | .gcode.3mf | 5 |
| H2C | leverbaar | 2025-11 | 325 x 320 x 320 | 350 °C | 120 °C | ja | 2 | Vortek: 6 induction hotends on the right + 1 left nozzle (7 colours without full purge); AMS 2 Pro / AMS HT | 1000 mm/s | 20000 mm/s² | bambu | .gcode.3mf | 7 |
| X2D | leverbaar | 2026-04 | 256 x 256 x 260 | 300 °C | 120 °C | ja | 2 | Dual nozzle; up to 4 AMS 2 Pro + 8 AMS HT (24 slots), up to 25 colours | 1000 mm/s | 20000 mm/s² | bambu | .gcode.3mf | 5 |
| A2L | leverbaar | 2026-06 | 330 x 320 x 325 | 300 °C | 80 °C | nee | 1 | Up to 4 AMS units + 1 AMS lite, up to 19 colours | 500 mm/s | 10000 mm/s² | bambu | .gcode.3mf | 7 |
| H3C | leverbaar | 2026-11 | 330 x 320 x 325 | 350 °C | 120 °C | ja | 9 | SwapTek 9-tool changer + AMS 3H (9 slots); up to 24 spools via extra AMS on PrintTool 1 | 1400 mm/s | 25000 mm/s² | bambu | .gcode.3mf | 5 |

## Elegoo: FDM

| Model | Status | Aangekondigd | Bouwvolume (mm) | Nozzle max | Bed max | Behuizing | Koppen | Meerkleuren | Max snelheid | Max versnelling | G-code | Bestand | AANNAMES |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Neptune 3 | uit productie | 2022-04 | 220 x 220 x 280 | 260 °C | 100 °C | nee | 1 | - | 180 mm/s | 3000 mm/s² | marlin | .gcode | 13 |
| Neptune 3 Pro | leverbaar | 2022-11 | 225 x 225 x 280 | 260 °C | 100 °C | nee | 1 | - | 180 mm/s | 3000 mm/s² | marlin | .gcode | 11 |
| Neptune 3 Plus | uit productie | 2022-12 | 320 x 320 x 400 | 260 °C | 100 °C | nee | 1 | - | 180 mm/s | 3000 mm/s² | marlin | .gcode | 12 |
| Neptune 3 Max | uit productie | 2022-12 | 420 x 420 x 500 | 260 °C | 100 °C | nee | 1 | - | 180 mm/s | 3000 mm/s² | marlin | .gcode | 12 |
| Neptune 4 | leverbaar | 2023-05 | 225 x 225 x 265 | 300 °C | 110 °C | nee | 1 | - | 500 mm/s | 8000 mm/s² | klipper | .gcode | 7 |
| Neptune 4 Pro | leverbaar | 2023-05 | 225 x 225 x 265 | 300 °C | 110 °C | nee | 1 | - | 500 mm/s | 8000 mm/s² | klipper | .gcode | 7 |
| Neptune 4 Plus | leverbaar | 2023-09 | 320 x 320 x 385 | 300 °C | 100 °C | nee | 1 | - | 500 mm/s | 8000 mm/s² | klipper | .gcode | 8 |
| Neptune 4 Max | leverbaar | 2023-09 | 420 x 420 x 480 | 300 °C | 100 °C | nee | 1 | - | 500 mm/s | 8000 mm/s² | klipper | .gcode | 7 |
| OrangeStorm Giga | leverbaar | 2024-05 | 800 x 800 x 1000 | 300 °C | 100 °C | nee | 1 | Optional dual or quad extrusion upgrade kit | 300 mm/s | 3000 mm/s² | klipper | .gcode | 8 |
| Centauri Carbon | uit productie | 2025-02 | 256 x 256 x 256 | 320 °C | 110 °C | ja | 1 | - | 500 mm/s | 20000 mm/s² | klipper | .gcode | 9 |
| Centauri Carbon 2 | leverbaar | 2026-05 | 256 x 256 x 256 | 350 °C | 110 °C | ja | 1 | CANVAS optional (4 colours) | 500 mm/s | 20000 mm/s² | klipper | .gcode | 8 |
| Centauri Carbon 2 Combo | leverbaar | 2026-01 | 256 x 256 x 256 | 350 °C | 110 °C | ja | 1 | CANVAS, 4 colours | 500 mm/s | 20000 mm/s² | klipper | .gcode | 6 |
| Centauri 2 | leverbaar | 2026-06 | 256 x 256 x 256 | 350 °C | 110 °C | nee | 1 | CANVAS optional (4 colours) | 500 mm/s | 20000 mm/s² | klipper | .gcode | 6 |
| Centauri 2 Combo | leverbaar | 2026-06 | 256 x 256 x 256 | 350 °C | 110 °C | nee | 1 | CANVAS, 4 colours | 500 mm/s | 20000 mm/s² | klipper | .gcode | 6 |
| Centauri X Ultra | **AANGEKONDIGD** | 2026-11 | 256 x 256 x 256 | 350 °C | 120 °C | ja | 4 | 4 independent printheads (tool changer); optional AFS up to 20 colours | 500 mm/s | 20000 mm/s² | klipper | .gcode | 13 |

## Elegoo: hars (lcd/DLP)

| Model | Status | Aangekondigd | Bouwvolume (mm) | Scherm | Resolutie (px) | XY (µm) | Bestand | AANNAMES |
|---|---|---|---|---|---|---|---|---|
| Mars 3 | uit productie | 2021-06 | 143,43 x 89,6 x 175 | 6.66" 4K mono LCD | 4098 x 2560 | 35 | .ctb | 10 |
| Mars 3 Pro | uit productie | 2022-05 | 143 x 89,6 x 175 | 6.6" 4K mono LCD | 4098 x 2560 | 35 | .ctb | 10 |
| Mars 4 | uit productie | 2023-05 | 153,36 x 77,76 x 175 | 7" 9K mono LCD | 8520 x 4320 | 18 | .goo | 9 |
| Mars 4 Ultra | leverbaar | 2023-05 | 153,36 x 77,76 x 165 | 7" 9K mono LCD | 8520 x 4320 | 18 | .goo | 9 |
| Mars 4 Max | uit productie | 2023-04 | 195,84 x 122,4 x 150 | 9.1" 6K mono LCD | 5760 x 3600 | 34 | .goo | 8 |
| Mars 4 DLP | uit productie | 2023-04 | 132,8 x 74,7 x 150 | TI DLP projector | 2560 x 1440 | 51,875 | .goo | 11 |
| Mars 5 | leverbaar | 2024-06 | 143,43 x 89,6 x 150 | 6.66" 4K mono LCD | 4098 x 2560 | 35 | .goo | 9 |
| Mars 5 Ultra | leverbaar | 2024-06 | 153,36 x 77,76 x 165 | 7" 9K mono LCD | 8520 x 4320 | 18 | .goo | 8 |
| Saturn | uit productie | 2020-09 | 192 x 120 x 200 | 8.9" 4K mono LCD | 3840 x 2400 | 50 | .ctb | 9 |
| Saturn S | uit productie | 2022-02 | 196 x 122 x 210 | 9.1" 4K mono LCD | 4098 x 2560 | 48 | .ctb | 8 |
| Saturn 2 | uit productie | 2022-05 | 219 x 123 x 250 | 10" 8K mono LCD | 7680 x 4320 | 28,5 | .ctb | 10 |
| Saturn 8K | uit productie | 2022-09 | 219 x 123 x 210 | 10" 8K mono LCD | 7680 x 4320 | 28,5 | .ctb | 9 |
| Saturn 3 | leverbaar | 2023-05 | 218,88 x 122,88 x 250 | 10" 12K mono LCD | 11520 x 5120 | 19 | .goo | 7 |
| Saturn 3 Ultra | leverbaar | 2023-05 | 218,88 x 122,88 x 260 | 10" 12K mono LCD | 11520 x 5120 | 19 | .goo | 7 |
| Saturn 4 | leverbaar | 2024-04 | 218,88 x 122,88 x 220 | 10" 12K mono LCD | 11520 x 5120 | 19 | .goo | 8 |
| Saturn 4 Ultra | leverbaar | 2024-04 | 218,88 x 122,88 x 220 | 10" 12K mono LCD | 11520 x 5120 | 19 | .goo | 8 |
| Saturn 4 Ultra 16K | leverbaar | 2025-01 | 211,68 x 118,37 x 220 | 10" 16K mono LCD | 15120 x 6230 | 14 | .goo | 8 |
| Saturn 5 Ultra | **AANGEKONDIGD** | 2026-11 | 211,68 x 118,37 x 220 | 10" 16K mono LCD | 15120 x 6230 | 14 | .goo | 10 |
| Jupiter | uit productie | 2021-10 | 277,848 x 156,264 x 300 | 12.8" 6K mono LCD | 5448 x 3064 | 51 | .ctb | 10 |
| Jupiter SE | uit productie | 2023-11 | 277,848 x 156,264 x 300 | 12.8" 6K mono LCD | 5448 x 3064 | 51 | .goo | 9 |
| Jupiter 2 | leverbaar | 2026-04 | 302,4 x 161,98 x 300 | 14" 16K mono LCD | 15120 x 6230 | 20 | .goo | 7 |

## Opmerkingen per printer

- **Bambu Lab X1E**: Actieve kamerverwarming tot 60 °C.
- **Bambu Lab H2D**: Eén nozzle 325x320x325; twee nozzles 300x320x320; totaal bereik beide nozzles 350x320x320. Actieve kamerverwarming tot 65 °C.
- **Bambu Lab H2D Pro**: Eén nozzle 325x320x325; twee nozzles 300x320x320; totaal 350x320x320. Nozzles van wolfraamcarbide. Actieve kamerverwarming tot 65 °C.
- **Bambu Lab H2S**: Actieve kamerverwarming tot 65 °C.
- **Bambu Lab H2C**: Links één nozzle 325x320x320; rechts één nozzle 305x320x325; twee nozzles 300x320x320; totaal 330x320x320. Actieve kamerverwarming tot 65 °C.
- **Bambu Lab X2D**: Hoofdnozzle 256x256x260; hulpnozzle en beide nozzles 235,5x256x256. Actieve kamerverwarming tot 65 °C.
- **Bambu Lab H3C**: Actieve kamerverwarming tot 65 °C.
- **Elegoo Neptune 4 Pro**: Gesegmenteerd bed: middenzone 120 x 120 mm, buitenzone apart schakelbaar (productpagina).
- **Elegoo OrangeStorm Giga**: Standaardsnelheid 150 mm/s, maximum 300 mm/s; bed 100 °C bij 25 °C omgeving (handleiding). Losse behuizing en dubbele/viervoudige printkop als accessoire in de officiële winkel.
- **Elegoo Centauri Carbon**: Hotend tot 32 mm³/s (productpagina).
- **Elegoo Centauri Carbon 2 Combo**: Ook verkocht als ELEGOO x emoji Centauri Carbon 2 Combo (zelfde printer).
- **Elegoo Centauri 2**: Open frame; bed 260 x 260 mm; standaardversnelling 10 000 mm/s², aanbevolen snelheid 250 mm/s (productpagina).
- **Elegoo Centauri 2 Combo**: Open frame met CANVAS (4 kleuren, RFID, automatisch bijvullen) (productpagina).
- **Elegoo Centauri X Ultra**: AANGEKONDIGD op Formnext 2026 (17 november 2026): eerste toolchanger van Elegoo met vier onafhankelijke printkoppen. Geen prijs of leverdatum.
- **Elegoo Mars 5 Ultra**: Tot 150 mm/h, AI-camera, automatisch nivelleren (productpagina).
- **Elegoo Saturn 3**: XY-resolutie 19 x 24 µm (niet-vierkante pixels).
- **Elegoo Saturn 3 Ultra**: XY-resolutie 19 x 24 µm; tot 150 mm/h (handleiding).
- **Elegoo Saturn 4**: Tot 70 mm/h (productpagina).
- **Elegoo Saturn 4 Ultra**: XY-resolutie 19 x 24 µm; tot 150 mm/h; AI-camera (handleiding).
- **Elegoo Saturn 4 Ultra 16K**: XY-resolutie 14 x 19 µm; tot 150 mm/h (handleiding).
- **Elegoo Saturn 5 Ultra**: AANGEKONDIGD op Formnext 2026 (17 november 2026); lancering gepland begin Q1 2027. Elegoo noemt alleen een "intelligent resin management system"; geen technische gegevens.
- **Elegoo Jupiter 2**: XY-resolutie 20 x 26 µm; automatisch nivelleren, harstoevoer en verwarming (persbericht).

## Niet opgenomen

- **Bambu Lab P3C en X2D Pro**: alleen bekend uit FCC-registraties (september 2026), niet door Bambu Lab aangekondigd. Geen gegevens om op te slicen. Opnemen zodra Bambu Lab ze aankondigt.
- **Bambu Lab R1** (lasersnijder) en **S1** (scanner), **Elegoo M1 Ultra** (scanner) en **Phecda** (laser): geen 3D-printers.
- **H2D en H2S Laser Edition**: zelfde printer als H2D en H2S, met lasermodule. Voor het slicen identiek.
- **Elegoo Neptune 2, 2S, 2D, X** en **Mars, Mars Pro, Mars C**: oudere modellen (2019-2021) buiten de gevraagde reeksen. Kunnen later worden toegevoegd.
- **Bundels en combo's** (printer plus filament, plus Mercury, plus luchtreiniger) zijn geen aparte printers; een "Combo" met meerkleurensysteem staat er wel apart in als het de printer verandert (Centauri Carbon 2 Combo, Centauri 2 Combo).

## Materiaalprofielen

Prijzen per kg (EUR) zijn altijd AANNAME. Maximale volumetrische snelheid is AANNAME behalve bij TPU 95A (3,6 mm³/s, fabrikantpagina).

| Profiel | Basis | Nozzle (°C) | Bed (°C) | Dichtheid (g/cm³) | Max mm³/s | Koeling | Behuizing | Gehard | Prijs/kg |
|---|---|---|---|---|---|---|---|---|---|
| PLA | Bambu Lab PLA Basic | 190-230 (220) | 55-65 (60) | 1,24 | 20 | 100 % (50-100) | nee | nee | € 20 |
| PLA+ | generieke PLA+ (getaaid PLA) | 200-230 (215) | 50-65 (60) | 1,24 | 18 | 100 % (50-100) | nee | nee | € 22 |
| PETG | Bambu Lab PETG Basic | 230-260 (255) | 65-75 (70) | 1,25 | 14 | 40 % (0-60) | nee | nee | € 22 |
| ABS | Bambu Lab ABS | 240-270 (260) | 80-100 (90) | 1,05 | 18 | 20 % (0-80) | ja | nee | € 22 |
| ASA | Bambu Lab ASA | 240-270 (260) | 80-100 (90) | 1,05 | 16 | 20 % (0-80) | ja | nee | € 28 |
| TPU 95A | Bambu Lab TPU 95A / TPU 95A HF | 220-240 (230) | 30-35 (35) | 1,22 | 3,6 | 100 % (50-100) | nee | nee | € 35 |
| PA (nylon) | Polymaker PolyMide CoPA | 250-270 (260) | 25-50 (50) | 1,12 | 8 | 0 % (0-0) | ja | nee | € 50 |
| PA-CF | Bambu Lab PA6-CF | 260-290 (280) | 80-100 (100) | 1,09 | 8 | 20 % (0-60) | ja | ja | € 70 |
| PC | Bambu Lab PC | 260-280 (270) | 90-110 (100) | 1,2 | 12 | 20 % (0-60) | ja | nee | € 35 |
| PET-CF | Bambu Lab PET-CF | 260-290 (270) | 80-100 (80) | 1,29 | 8 | 20 % (0-60) | ja | ja | € 60 |

| Hars | Basis | Dichtheid | Laag (s) | Bodem (s) | Bodemlagen | Prijs/kg |
|---|---|---|---|---|---|---|
| Standard resin | Elegoo Standard Photopolymer Resin | 1,1 | 2,5 | 25 | 5 | € 30 |
| ABS-like resin | generieke ABS-like hars (Elegoo ABS-Like Resin) | 1,1 | 3 | 30 | 5 | € 35 |
| Water-washable resin | generieke waterafwasbare hars (Elegoo Water Washable Resin) | 1,1 | 2,5 | 25 | 5 | € 35 |

Belichtingstijden zijn AANNAME: ze hangen af van printer, lcd-generatie en harskleur en moeten per printer gekalibreerd worden.

## Bronnen

| Bron | Gebruikt voor |
|---|---|
| https://bambulab.com/en/x1 | X1, X1 Carbon |
| https://bambulab.com/en/compare | X1, X1 Carbon, P1S, P2S, X2D |
| https://blog.bambulab.com/the-x1-series-is-eol-the-standard-it-set-will-remain-forever | X1, X1 Carbon, X1E |
| https://en.wikipedia.org/wiki/Bambu_Lab | X1, X1 Carbon, X1E, P1P, P1S, A1 mini, A1, H2D, H2D Pro, H2S, P2S, H2C, X2D, A2L, H3C |
| https://bambulab.com/en/x1e | X1 Carbon, X1E |
| https://bambulab.com/en/p1p | P1P, P1S |
| https://blog.bambulab.com/a-farewell-to-p1p | P1P, P1S |
| https://bambulab.com/en/a1-mini/tech-specs | A1 mini |
| https://bambulab.com/en/a1-mini | A1 mini |
| https://bambulab.com/en/a1/tech-specs | A1 |
| https://bambulab.com/en/a1 | A1 |
| https://bambulab.com/en/h2d/tech-specs | H2D |
| https://bambulab.com/en/h2d/faq | H2D |
| https://bambulab.com/en/h2d-pro/tech-specs | H2D Pro |
| https://bambulab.com/en/h2s/tech-specs | H2S |
| https://bambulab.com/en/h2s/faq | H2S |
| https://bambulab.com/en/p2s/specs | P2S |
| https://bambulab.com/en/p2s/faq | P2S |
| https://bambulab.com/en/h2c/specs | H2C |
| https://bambulab.com/en/h2c | H2C |
| https://bambulab.com/en/h2c/faq | H2C |
| https://bambulab.com/en/x2d/specs | X2D |
| https://bambulab.com/en/x2d/faq | X2D |
| https://bambulab.com/en/a2l/specs | A2L |
| https://bambulab.com/en/a2l/faq | A2L |
| https://bambulab.com/en/h3c/specs | H3C |
| https://bambulab.com/en/h3c | H3C |
| https://blog.bambulab.com/tool-changer-game-changer-bambu-lab-presents-h3c-the-defining-new-generation-of-3d-printers | H3C |
| https://www.elegoo.com/products/elegoo-neptune-3-fdm-3d-printer | Neptune 3 |
| https://www.elegoo.com/products/elegoo-neptune-3-pro-fdm-3d-printer-225x225x280mm | Neptune 3 Pro |
| https://www.elegoo.com/products/elegoo-neptune-3-plus-fdm-3d-printer-with-larger-build-volume-of-320x320x400mm | Neptune 3 Plus |
| https://www.elegoo.com/products/elegoo-neptune-3-max-fdm-3d-printer-massive-printing-size-of-420x420x500mm | Neptune 3 Max |
| https://www.elegoo.com/products/elegoo-neptune-4-fdm-3d-printer | Neptune 4 |
| https://www.elegoo.com.cn/uploads/20230529/93fe46ef887fae3189a8cc0509fb9181.pdf | Neptune 4 |
| https://www.elegoo.com/products/elegoo-neptune-4-pro-fdm-3d-printer | Neptune 4 Pro |
| https://www.elegoo.com.cn/uploads/20230719/d918626b0c5b81b817edc83dd44e36a5.pdf | Neptune 4 Pro |
| https://www.elegoo.com/products/neptune-4-plus-fdm-3d-printer | Neptune 4 Plus |
| https://www.elegoo.com/products/neptune-4-max-fdm-3d-printer | Neptune 4 Max |
| https://www.elegoo.com/products/orangestorm-giga | OrangeStorm Giga |
| https://www.elegoo.com.cn/uploads/20250925/028b39980fd851eba76ddfb6979ff3d2.pdf | OrangeStorm Giga |
| https://www.elegoo.com/products/centauri-carbon | Centauri Carbon |
| https://www.elegoo.com/products/centauri-carbon-2 | Centauri Carbon, Centauri Carbon 2, Centauri Carbon 2 Combo |
| https://www.elegoo.com.cn/uploads/20251218/86d301d8d1876088c2d118ec41c57319.pdf | Centauri Carbon 2, Centauri Carbon 2 Combo |
| https://www.elegoo.com/products/centauri-carbon-2-combo | Centauri Carbon 2 Combo |
| https://www.prnewswire.com/news-releases/elegoo-to-launch-multicolor-3d-printer-centauri-carbon-2-combo-on-january-26-302664338.html | Centauri Carbon 2 Combo |
| https://www.elegoo.com/products/centauri-2 | Centauri 2, Centauri 2 Combo |
| https://www.elegoo.com/products/centauri-2-combo | Centauri 2 Combo |
| https://www.prnewswire.co.uk/news-releases/elegoo-showcases-new-solutions-across-resin-printing-fdm-printing-and-3d-scanning-at-formnext-2026-302942939.html | Centauri X Ultra, Saturn 5 Ultra |
| https://www.elegoo.com/products/elegoo-mars-3-lcd-3d-printer | Mars 3 |
| https://www.elegoo.com/products/elegoo-mars-3-pro-4k-mono-lcd-3d-printer | Mars 3 Pro |
| https://www.elegoo.com/products/elegoo-mars-4-msla-resin-3d-printer-with-9k-mono-lcd | Mars 4 |
| https://www.elegoo.com/products/elegoo-mars-4-ultra-msla-resin-3d-printer-with-9k-mono-lcd | Mars 4 Ultra |
| https://www.elegoo.com/products/elegoo-mars-4-max-msla-resin-3d-printer-with-6k-mono-lcd | Mars 4 Max |
| https://www.elegoo.com/products/elegoo-mars-4-dlp-resin-3d-printer | Mars 4 DLP |
| https://www.elegoo.com.cn/uploads/20230314/c962ca9800974469f4655c0a6b2bb7b9.pdf | Mars 4 DLP |
| https://www.elegoo.com/products/mars-5-4k-6-6inch-monochrome-lcd-resin-3d-printer | Mars 5 |
| https://www.elegoo.com/products/mars-5-ultra-9k-7inch-monochrome-lcd-resin-3d-printer | Mars 5 Ultra |
| https://www.elegoo.com/products/elegoo-saturn-4k-mono-lcd-3d-printer | Saturn |
| https://www.elegoo.com/products/elegoo-saturn-s-msla-9-1-4k-mono-lcd-3d-printer | Saturn S |
| https://www.elegoo.com/products/elegoo-saturn-2-8k-10-inches-mono-lcd-3d-printer | Saturn 2 |
| https://www.elegoo.com/products/elegoo-saturn-8k-msla-10inch-monochrome-lcd-resin-3d-printer | Saturn 8K |
| https://www.elegoo.com/products/elegoo-saturn-3-resin-3d-printer-12k | Saturn 3 |
| https://www.elegoo.com/products/elegoo-saturn-3-ultra-resin-3d-printer-12k | Saturn 3 Ultra |
| https://www.elegoo.com.cn/uploads/20230529/a5399d8b5033b6f7ac9a3a337e638e64.pdf | Saturn 3 Ultra |
| https://www.elegoo.com/products/saturn-4-12k-10inch-monochrome-lcd-resin-3d-printer | Saturn 4 |
| https://www.elegoo.com/products/saturn-4-ultra-12k-10inch-monochrome-lcd-resin-3d-printer | Saturn 4 Ultra |
| https://www.elegoo.com.cn/uploads/20250120/ea15e9af29b39d315d05c01c1c8b18eb.pdf | Saturn 4 Ultra |
| https://www.elegoo.com/products/saturn-4-ultra-16k-10inch-monochrome-lcd-resin-3d-printer | Saturn 4 Ultra 16K |
| https://www.elegoo.com.cn/uploads/20250923/8636c057f35a814d6e4e9e5bae63b9e2.pdf | Saturn 4 Ultra 16K |
| https://www.elegoo.com/products/elegoo-jupiter-resin-3d-printer-6k-mono-msla-3d-printer | Jupiter |
| https://www.elegoo.com/products/jupiter-se | Jupiter SE |
| https://www.elegoo.com/products/elegoo-jupiter-2 | Jupiter 2 |
| https://www.prnewswire.com/news-releases/elegoo-launches-large-format-resin-printer-jupiter-2-setting-new-benchmark-in-lcd-3d-printing-302740587.html | Jupiter 2 |
| https://store.bblcdn.com/s1/default/58b85d0f3db94878854a28fdb8a0006e/Bambu_PLA_Basic_Technical_Data_Sheet.pdf | PLA |
| https://bambulab.com/en/filament/guide | PLA, PETG, ABS, ASA, TPU 95A, PA-CF, PC, PET-CF |
| https://us.store.bambulab.com/products/pla-basic-filament | PLA |
| https://www.elegoo.com/products/elegoo-pla-plus-3d-printer-filament-1-75mm-colored-1kg | PLA+ |
| https://store.bblcdn.com/s1/default/cb94589bf7994fdcbfa833badefae9cd/Bambu_PETG_Basic_Technical_Data_Sheet.pdf | PETG |
| https://us.store.bambulab.com/products/petg-basic | PETG |
| https://store.bblcdn.com/s7/default/23b4cf2b83d5470bb96d19970b5f3ae8/Bambu_ABS_Technical_Data_Sheet_V3.pdf | ABS |
| https://us.store.bambulab.com/products/abs-filament | ABS |
| https://store.bblcdn.com/ad7b08230c164e72856cffbe06bb7dc9.pdf | ASA |
| https://us.store.bambulab.com/products/asa-filament | ASA |
| https://store.bblcdn.com/58df32731eab4c90a7dac9b12e13ba88.pdf | TPU 95A |
| https://us.store.bambulab.com/products/tpu-95a-hf | TPU 95A |
| https://polymaker.com/wp-content/uploads/lana-downloads/TDS_Polymaker_PolyMide-CoPA_V5.5_2026-01-06_EN.pdf | PA (nylon) |
| https://store.bblcdn.com/b2abc59ac250492b979a52f1ce3e61b3.pdf | PA-CF |
| https://us.store.bambulab.com/products/pa6-cf | PA-CF |
| https://store.bblcdn.com/a52afdccddfd448583d119587122c8c5.pdf | PC |
| https://us.store.bambulab.com/products/pc-filament | PC |
| https://store.bblcdn.com/9690d6226f024acab2ba0dd52dabb654.pdf | PET-CF |
| https://us.store.bambulab.com/products/pet-cf | PET-CF |
| https://www.123-3d.co.uk/pdf/Elegoo_Standaard_Resin_TDS_EN.pdf | Standard resin |
| https://www.elegoo.com/products/elegoo-standard-resin-v-2-0 | Standard resin |
| https://www.elegoo.com/products/elegoo-abs-like-resin-v-2-0 | ABS-like resin |
| https://www.elegoo.com/products/elegoo-water-washable-resin-v-2-0 | Water-washable resin |

Datums van aankondiging zonder fabrikantdatum komen uit de publicatiedatum in de officiële Elegoo-winkel of uit https://en.wikipedia.org/wiki/Bambu_Lab (alleen datums, geen technische waarden).

## Controle

Beide JSON-bestanden zijn gecontroleerd met een Node-script: verplichte sleutels, toegestane waarden, unieke id's, bronnen zijn https en geen GitHub- of slicerprofiel, plausibiliteit (bed 50-1100 mm, nozzle 240-500 °C, bed 50-150 °C, snelheid 50-2000 mm/s, versnelling 500-50 000 mm/s², printableArea binnen bouwvolume en binnen travelLimits, hars: pixelmaat lcd tegen XY-resolutie), materialen (bereik min ≤ standaard ≤ max, dichtheid 0,9-1,6, prijs en belichting gemarkeerd als AANNAME).
