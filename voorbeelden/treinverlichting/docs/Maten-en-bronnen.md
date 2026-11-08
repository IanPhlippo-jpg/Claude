# Maten van de gekochte onderdelen en hun bron

Alle maten in mm. "Gemeten" = door Ian; "tekening" = letterlijk op de maattekening van de fabrikant; "afgelezen" = gemeten
op die tekening met de maatlijnen als schaal (± 0,3 mm).

## ESP32-S3-DevKitC-1 v1.1 (Espressif), met ESP32-S3-WROOM-1 N16R8

Bron: Espressif, "ESP32-S3-DevKitC-1 Dimensions" (DXF_ESP32-S3-DevKitC-1_V1.1_20220429.pdf, rev 1.1, 2022-04-29),
gelinkt vanuit de gebruikershandleiding v1.1; afbeelding: `ESP32-S3-DevKitC-1-v1.1-maten.png`.

| Maat | Waarde | Soort |
|---|---|---|
| print lengte x breedte | 62,74 x 25,40 | tekening |
| pinrijen: 2 x 22 pinnen, steek | 2,54 | tekening |
| hart pinrij tot de lange rand | 1,27 (dus 22,86 hart op hart) | tekening |
| laatste pin tot de korte rand bij de USB | 8,00 | tekening |
| eerste pin tot de korte rand bij de antenne | 1,5 | afgelezen |
| module ESP32-S3-WROOM-1 | 18,0 x 25,5 x 3,1 (datasheet); x 3,8 tot 21,9 vanaf de linkerrand | afgelezen |
| antenne van de module voorbij de print | 6,4 | afgelezen |
| USB: twee micro-USB, J2 "UART" en J4 "USB", aan de korte rand tegenover de antenne | hart 6,2 en 19,5 vanaf links, 8,2 breed, ± 0,8 voorbij de rand | afgelezen |
| knoppen BOOT (SW1) en RESET (SW2) | hart x 7,7 en 18,1; 48,8 van de antennerand; 5,1 x 5,1 | afgelezen |
| RGB-led D6 (GPIO38) | hart x 7,7; 33,6 van de antennerand | afgelezen |
| LDO U2 (SOT-223) | x 9,4 tot 17,9; y 23,2 tot 29,8 | afgelezen |
| USB-UART U3 (QFN, 4 x 4) | hart x 13,4; y 42,6 | afgelezen |
| bevestigingsgaten | geen | tekening |

Pinnen links (J1, van de antenne naar de USB): 3V3, 3V3, RST, 4, 5, 6, 7, 15, 16, 17, 18, 8, 3, 46, 9, 10, 11, 12, 13, 14, 5V, G.
Pinnen rechts (J3): G, TX, RX, 1, 2, 42, 41, 40, 39, 38, 37, 36, 35, 0, 45, 48, 47, 21, 20, 19, G, G.

## Modelbouwled "PCB met ingebouwde weerstand" (kroonsteen-PCB)

| Maat | Waarde | Soort |
|---|---|---|
| print | 61,1 x 20,9 | gemeten (Ian, 2026-11-08) |
| hoogste punt (met klemmen) | 14 | gemeten (Ian, 2026-11-08) |
| aansluitingen | 16 leds (+ elk met een SMD-weerstand), aan beide uiteinden een 2-polige klem (in en door) | Modelbouwled.nl, productpagina |
