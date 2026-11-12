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

## Versie 3 (advies Fable 5.2, 2026-11-12): de nieuwe onderdelen

Opgezocht op 2026-11-12. "Datablad" = letterlijk uit het datablad van de fabrikant; "afgelezen" = gemeten op de
maattekening; AANNAME = niet gepubliceerd, na te meten bij de bouw.

### Netadapter Mean Well GST90A12-P1M (stekker)

| Maat | Waarde | Soort |
|---|---|---|
| uitgang | 12 V, 6,67 A | datablad |
| stekker P1M | 2,5 x 5,5 x 11 mm, + in het midden (P1J is 2,1 x 5,5) | Mean Well-catalogus ("P1M: 2.5øx5.5øx11mm / C+"), GST90A-datablad |

Fable 5.2 schreef 5,5 x 2,1; de P1M heeft een pen van 2,5: daarom een DC-bus 5,5 x 2,5.

### DC-chassisbus GlobTek JACK-L-PANEL-8A(R) Rev A1

| Maat | Waarde | Soort |
|---|---|---|
| stekker | 5,5 x 2,5 (pen Ø2,5, opening Ø5,7) | tekening |
| belasting | 50 V DC, 8 A, contactweerstand ≤ 30 mΩ | tekening (specificaties) |
| flens | Ø12,5 x 2,0 | tekening |
| lengte achter de flens | 16,4 − 2,0 = 14,4, soldeerlippen 9,7 | tekening |
| moer | 14,0 sleutelwijdte | tekening |
| schroefdraad | Ø11,3 | afgelezen; gat in de wand Ø11,5 (AANNAME, na te meten) |

### MOSFET Alpha & Omega AO3400A (SOT-23), op adapterprintje Artekit DA-SOT23-3-X2

| Maat | Waarde | Soort |
|---|---|---|
| UDS, ID | 30 V, 5,7 A | datablad (Rev 3.1, 2023-07) |
| R(on) | ≤ 26,5 mΩ bij 10 V, ≤ 32 mΩ bij 4,5 V, **≤ 48 mΩ bij 2,5 V** (ID = 3 A) | datablad |
| pinnen | 1 = G, 2 = S, 3 = D | datablad |
| Rth junctie-lucht | 125 K/W | AANNAME (SOT-23 op een klein printje) |
| adapterprintje | 12,70 x 12,07, DIP-8 (2 x 4 pinnen op 2,54, rijen 7,62 uit elkaar), 2 x SOT-23-3 | Artekit-datablad Rev 1B |
| aansluiting adapter | 1 = IC1-3, 2 = nc, 3 = IC2-1, 4 = IC2-2, 5 = IC2-3, 6 = nc, 7 = IC1-1, 8 = IC1-2 | Artekit-datablad (aansluitschema) |
| hoogte met IC-voet DIP-8 | 7,0 boven de print | AANNAME |

### Polyfuses Bourns MF-MSMF (1812, aan de koperzijde van de gaatjesprint)

| Type | U max | I hold 23 °C | 40 °C | 50 °C | I trip | R min / R1max | Soort |
|---|--:|--:|--:|--:|--:|--:|---|
| MF-MSMF050/24X (per groep) | 24 V | 0,50 A | 0,44 A | 0,40 A | 1,00 A | 0,15 / 1,3 Ω | datablad + derating-tabel |
| MF-MSMF030 (+12 V knoppen) | 30 V | 0,30 A | 0,26 A | 0,22 A | 0,60 A | 0,30 / 3,0 Ω | datablad + derating-tabel |
| MF-R110 (versie 1, per rij) | 30 V | 1,10 A | 0,91 A | 0,85 A | 2,20 A | 0,10 / 0,27 Ω | datablad MF-R |

Maat 1812: 4,37 tot 4,73 lang, 3,07 tot 3,41 breed (datablad). Op een gaatjesprint ligt een 1812 over twee naburige
eilandjes (2,54 uit elkaar).

### Optocoupler Lite-On LTV-844 (4 x AC-ingang, DIP-16)

| Maat | Waarde | Soort |
|---|---|---|
| CTR | ≥ 20 % bij IF = ±1 mA, UCE = 5 V (zonder rangletter 20 tot 300 %) | datablad LTV-814/824/844 |
| isolatie, UCE | 5000 V eff., 35 V | datablad (verdelers) |
| pinnen | kanaal n: led 2n−1 en 2n (AC), collector 18−2n, emitter 17−2n (zoals PC847) | datablad |
| lichaam | 19,8 x 6,4 x 3,5 | AANNAME (gangbare DIP-16) |

### P-MOSFET Infineon IRF4905PbF (TO-220), ompoolbeveiliging

| Maat | Waarde | Soort |
|---|---|---|
| UDS, ID | −55 V, −74 A (25 °C) | datablad |
| R(on) | ≤ 0,020 Ω bij UGS = −10 V | datablad |
| RθJA | 62 K/W | ouder IR-datablad (1997); AANNAME voor de PbF |

### Printklemmen Phoenix Contact

| Type | Waarde | Soort |
|---|---|---|
| MPT 0,5/..-2,54 (-X2, -X3:1..16, -X4) | steek 2,54, 6 A, 160 V, 0,14 tot 0,5 mm² | datablad 1725656 |
| MPT: hoogte, diepte | 12 (met de pinnen), 6,2; in het model 8,5 boven de print | datablad (hoogte); diepte RS; 8,5 AANNAME |
| MKDS 1,5/..-5,08 (-X1, -X3:17/18) | steek 5,08, tot 1,5 mm²; diepte 7,6, hoogte 10 | AANNAME (na te kijken) |

### Andere

| Wat | Waarde | Soort |
|---|---|---|
| PCA9685-print (Adafruit en klonen): OE | "pulled low by default" (pull-down op de print, waarde niet gepubliceerd) | Adafruit Learn Guide; 10 kΩ AANNAME |
| ESP32-S3-DevKitC-1 v1.1: USB | 2 x micro-USB ("USB-to-UART Port: A Micro-USB port") | Espressif user guide v1.1 |
| afstandsbus PCA9685 | M2,5 x 10, rond Ø5 | AANNAME |
| ATO-printhouder | 2 soldeerpennen 10,16 uit elkaar | AANNAME (na te meten, zo nodig opboren) |
| klemlip bordje | tong 0,8 x 2,0, haak 0,75 (0,15 speling), 0,1 boven de print; de print van het bordje 1,6 dik | ontwerp (maten.mjs); 1,6 AANNAME (gangbare FR4): na te meten, de haak moet erover passen |
