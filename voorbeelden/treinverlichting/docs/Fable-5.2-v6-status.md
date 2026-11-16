# Advies Fable 5.2 op versie 6: status per punt (2026-11-16)

Bron: `docs/Advies-Fable-5.2-v6.md` (62 punten: 3 x P1, 26 x P2, 33 x P3). Niets is op hardware gemeten: wat de meting
beslist, staat op het meetblad **TRN-22** ("eerst kopen en meten", ± € 24 tot € 37). "Getest" = getest op de pc
(firmware: 159 native tests, ook met 32 groepen; doos: qaTrein, tekeningenTrein, schemaNorm).

**Samen: 57 gedaan, 5 deels, 0 niet.**

| Nr | Prio | Status | Wat er gedaan is | Waar |
|---|---|---|---|---|
| E1 | P1 | gedaan | Instelling "IR-led actief laag" (standaard = bouwvlag van -Q1); de MCP23017 zet eerst alles uit (OLATA) en pas dan uitgang; negatieve proef: zonder omkeren of met OLATA niet eerst faalt test_hw | firmware hw.h, dashboard, TRN-22 C en F |
| E2 | P1 | gedaan | Reflexsensor (TCRT5000) op 3,3 V met 1 kΩ rechtstreeks op ingang 17-23 (MCP23017 GPB0..6); de RMT-pinnen ook als niveau gelezen (> 50 ms laag = "ftr"); ESP-IDF 4.4 geciteerd, de rest AANNAME met fallback; negatieve proef in test_irzend | firmware, schema blad 8, README, TRN-22 M |
| E3 | P1 | gedaan | 3 schakelingen ("vcc", "gnd", "apart") per print in het dashboard; de firmware keert om bij "gnd" + NPN en weigert PNP op "vcc"; negatieve proeven in test_api en test_opslag; bron: handleiding Envistia ("vcc") tegen productpagina ("G"): meten met de diodetest | firmware, schema blad 5 en 8, README Aansluiten, Berekeningen §9, TRN-22 A en B, Maten-en-bronnen |
| E4 | P2 | gedaan | Duty 33 of 50 % instelbaar; knop "IR-zelftest" (zenden via een IR-led, terug lezen via -B1, ook "ongemoduleerd"); de schakeling zelf: eerst meten | firmware, dashboard, TRN-22 F en G |
| E5 | P2 | deels | Commentaar in main.cpp en hw.h verbeterd; meetstap "zonder ESP inschakelen: blijft de groep uit?". Een andere module kiezen beslist Ian na die meting | firmware, TRN-22 D |
| E6 | P2 | gedaan | I2C 100 kHz, alleen gewijzigde kanalen schrijven, van de MCP23017 alleen poort B lezen; de 4 draden naar -K5 in één dupontkabel van 50 cm; 4,7 kΩ niet nodig bij 100 kHz (± 550 ns < 1000 ns) | firmware, README, bestellijst |
| E7 | P2 | gedaan | GPA7/GPB7 nooit ingang: ingangen 1-23 en 25-38 | firmware, dashboard, README, schema blad 7 |
| E8 | P2 | gedaan | Servo's bij het opstarten één per 0,3 s, ook de eerste opdracht door de rij; rekenblad met 1,2 A blokkeerstroom | firmware servo.h, Berekeningen §9 |
| E9 | P2 | gedaan | Elco 25 V; meetstap XL4015 op 5,5 V vóór -K7 | schema, bestellijst, TRN-22 E |
| E10 | P2 | gedaan | XL4015 met stroomgrens (CC/CV) op 3 A; servoverlengkabels ≥ 0,25 mm² | schema, bestellijst, README |
| E11 | P2 | deels | Polyfuse -F20 0,1 A voor de 3,3 V naar de baan (B3V3 op -X12), 1 kΩ in elke ontvanger- en reflexsensorlijn; geen eigen 3,3 V-regelaar en geen 1 nF aan de klem van de ESP (geen vrije klem; de polyfuse vangt een sluiting op) | opbouw.mjs, schema blad 7 en 8, README, TRN-22 K |
| E12 | P2 | gedaan | IR-leds in getwiste paren en door een andere tule dan de ontvangers; stoorfilter 3,2 µs voor de ontvangers op de baan; 4,7 kΩ in de ontvanger | firmware irhw.h, schema blad 7, README |
| E13 | P2 | gedaan | Geen "PNP-print" of PC814 meer nodig: PNP met een print "gnd" of "apart", of een relais bij "vcc"; de tegenspraak in de README is weg | README, schema blad 8 |
| E14 | P3 | gedaan | Servo's wachten als meer dan 12 groepen aan staan; uitleg in het rekenblad | firmware, Berekeningen §9 |
| E15 | P3 | gedaan | Diode 10SQ045 (10 A) | schema, bestellijst, Berekeningen |
| E16 | P3 | gedaan | IR-weerstanden 1 W; OE met beide PCA9685 gerekend (2,75 V) en gemeten | schema, Berekeningen §9, TRN-22 L |
| E17 | P3 | gedaan | Geen GND-dupont tussen -K2 en -K7 (W62 vervalt) | opbouw.mjs, TRN-15, schema blad 8 |
| E18 | P3 | gedaan | "v1.1 op het bord" in de bestellijst, de bouwvolgorde en TRN-22 I | README, TRN-22 |
| E19 | P3 | gedaan | Per servo "puls uit na ... s" | firmware, dashboard |
| F1 | P2 | gedaan | Codesoort "continu" (led aan zonder draaggolf); de zelftest meldt "ongemoduleerd"; navragen bij Ian | firmware, dashboard, TRN-22 H, EISEN |
| F2 | P2 | gedaan | Per halte "stopcode herhalen" (elke 400 ms tot groen); na een herstart één keer de rijcode | firmware halte.h, dashboard |
| F3 | P2 | gedaan | Eén wachtende bus per halte, krijgt meteen de stopcode | firmware, dashboard |
| F4 | P2 | gedaan | Leds kiezen, 2 ticks wachten, dan zenden; na het einde ook 2 ticks | firmware irzend.h |
| F5 | P2 | gedaan | Een code die met haar herhalingen te lang wordt: 400 met het maximum; teller "IR niet verzonden" | firmware, dashboard |
| F6 | P2 | gedaan | Op het thuisnet het wifi-wachtwoord als kop (401), een vreemde Origin 403; kastjes mogen zich aanmelden | firmware, dashboard |
| F7 | P2 | gedaan | Hotspot 10 toestellen; meer dan ± 6 kastjes: thuisnet | firmware, README |
| F8 | P3 | gedaan | Zenden op een RMT-kanaal met 3 geheugenblokken; niet bewaren zolang er gezonden wordt | firmware |
| F9 | P3 | gedaan | OE gedeeld (veilig bij reset); commentaar en melding in het dashboard kloppen nu | firmware, schema blad 8 |
| F10 | P3 | gedaan | Commentaar en een modeltest; snelste sensoren op de GPIO-ingangen | firmware |
| F11 | P3 | gedaan | Time-out 10 ms en 9 klokpulsen op SCL bij een hangende bus | firmware i2c.h |
| F12 | P3 | gedaan | "Verkeer vrij" met een grens (maxVerkeerS, standaard 60 s) en een melding | firmware, dashboard |
| F13 | P3 | gedaan | NEC: de 4 bytes zoals gelezen (adres16/commando16) | firmware ir.h |
| F14 | P3 | gedaan | Tekst "tot de nieuwe volledig en ongeschonden ontvangen is" | README, firmware/README.md |
| F15 | P3 | gedaan | JSON buiten het slot, stapel-hoogwatermerken in de zelftest, commentaar opslag.h | firmware |
| F16 | P3 | gedaan | Kastjes: time-out 400 ms, na een fout meteen offline | firmware |
| F17 | P3 | gedaan | Leerbuffer groter; "code te lang" als fout | firmware irhw.h |
| D1 | P2 | gedaan | Proefstuk (2 stukjes, ± 20 min, TRN-08) vóór de helften; speling van de lippen 0,3 | Proefstuk.kcad, maten.mjs, README, bouwschema stap 1 |
| D2 | P2 | gedaan | Oogjes voor kabelbinders bij de modules met dupont; busjes per groep in een behuizing; over de naad één kabel | doos, README, bestellijst |
| D3 | P3 | gedaan | "Eerst nameten" ook voor de linkerhelft (TRN-11) | README, bouwschema |
| D4 | P3 | gedaan | Print dunner dan 1,4 mm: schroef 2,0 x 5 | README, bestellijst |
| D5 | P3 | gedaan | Warmte met de uitbreiding (+ 3,5 W, 10 K ongunstigst) | Berekeningen §9 |
| D6 | P3 | gedaan | Lijmvlakken opruwen (korrel 120) en ontvetten | README, bestellijst |
| D7 | P3 | gedaan | Plakband achter het venster; niet in PETG-CF printen | README |
| D8 | P3 | gedaan | Bij elke tule een oogje voor een kabelbinder (trekontlasting) | doos (26 oogjes) |
| D9 | P3 | gedaan | -F1 (T 8 A) en -F19 (T 3,15 A) in houders 5 x 20 in de achterwand: van buiten te vervangen | maten.mjs, doos, schema, bestellijst |
| T1 | P2 | gedaan | Nieuw meetblad TRN-22 (versie 6) met de stappen A-M; TRN-20 wijst ernaar; test: elk module-ref staat op TRN-20/22 | opbouwTrein.ts, tekeningenTrein.test.ts |
| T2 | P2 | gedaan | Bestellijst met Ref per rij, de uitbreiding en de sensoren van fase 1, 4 IR-leds + 1, één bron voor -Q4, eerlijk totaal € 315,24 (zonder servo's); test: elk module-ref staat in de bestellijst | README |
| T3 | P3 | gedaan | Overal versie 6, revisie 6 met wijzigingsregel (tekeningen, schema, README) | tekeningen, schema, README |
| T4 | P3 | gedaan | Stuurkant van -Q4 (VCC, GND, zoals -Q1 op blad 4), kabelaanduidingen -W21..-W28 en -W31..-W33, beveiliging van de ontvangerlijnen | schema blad 7 |
| T5 | P3 | gedaan | Schalen 1:2 en 2:1 (ISO 5455), ISO 2768-c, passingen met eigen tolerantie op TRN-06 en TRN-07, projectiesymbool met label | tekeningen |
| V1 | P2 | gedaan | Per meetpunt "alleen bussen"; anonieme meldingen alleen toewijzen als het zeker is; auto weg na 2 x zijn rijtijd | firmware bussen.h, tv-live.js, dashboard |
| V2 | P2 | gedaan | Zonder buscode de volgorde per strook (FIFO); knop "bus X staat bij punt Y"; navragen bij Ian | firmware, dashboard, tv, EISEN |
| V3 | P3 | deels | "mm_op_de_baan_per_px" in plan.json: het sensoradvies rekent ermee; de standaardsnelheid van de tv (6 m/s) blijft een schatting tot er gemeten is | docs/sensoradvies.py, README |
| V4 | P3 | gedaan | Tijden modulo 2^32 (overloop van millis) | tv-live.js |
| V5 | P3 | gedaan | CORS ook op /api/staat en /api/plan | firmware |
| S1 | P2 | gedaan | Omnipolaire hallsensor (SS451A); eerst proberen of de stuurmagneet volstaat | README, bestellijst |
| S2 | P3 | gedaan | Reflexsensoren aan de invoegingen (verkeer vrij), hallsensoren aan de stoppunten | docs/sensoradvies.py, README |
| S3 | P3 | gedaan | Stap voor stap: 1 halte, 4 haltes, invoegingen, dan pas de lange stukken | README |
| S4 | P3 | gedaan | Tellingen: 23 ingangen, 22 voor sensoren; legende uit het script | README, Sensoradvies.png |
| Q1 | P2 | deels | De drivers (PCA9685, servoprint, MCP23017), de RMT-items, het zenden in stappen, de toegang en de zelftest-JSON draaien in native tests met een nagebootste I2C-bus; de lijm in main.cpp (webserver, wifi, taken) niet: daarvoor /api/zelftest | firmware test/ |
| Q2 | P2 | gedaan | Tabel "getest op de pc / gemeten op hardware" (die laatste leeg) | firmware/README.md, README |
| Q3 | P3 | deels | Tests voor servo's bij het opstarten, IR raw x herhaal, NEC met hoge byte 0, een lang niveau, tweede bus, herstart, ingang die actief blijft, MCP23017; meetblad en bestellijst noemen elke module. Niet: een test die het schema elektrisch met opbouw.mjs vergelijkt | firmware test/, tekeningenTrein.test.ts |
