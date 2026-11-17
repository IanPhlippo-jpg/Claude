# Fable 5.2, tweede ronde (v7): status

Bron: `docs/Advies-Fable-5.2-v7.md` (2026-11-17). Verwerkt op 2026-11-17, firmware 2.2.0. Niets gecommit, niets
geïnstalleerd of besteld.

## De nieuwe punten (1 x P1, 8 x P2, 14 x P3)

| Nr | Prio | Status | Wat er veranderd is | Negatieve test (faalt zonder de fix) |
|---|---|---|---|---|
| EN1 | P1 | opgelost | Rekenblad: codesoort continu met **470 Ω 0,5 W** (± 16 mA, 0,12 W per led, 4 haltes meegeteld in de warmte), assert dat 120 Ω niet continu mag. Firmware: waarschuwing in het dashboard en de continu-led uit na de langste haltecyclus + 10 s. README, bouwschema, schema blad 7 (tekst), TRN-22 stap H, bestellijst (8 x 470 Ω als optie) | `tekeningenTrein` "Fable 5.2 EN1 en EN2" (draait `berekeningen.py`, zoekt `**470 Ω 0,5 W**`); `test_halte` `test_continu_tijdsgrens_en_waarschuwing` |
| EN2 | P2 | opgelost | -F20 nu **MF-R030** (houdstroom 0,24 A bij 40 °C, last 0,10 A); -Q4 VCC terug uit de 3,3 V van -K4 en GND uit J3:1; veldkabels -W31..-W33 (ontvangers) en -W40 + **-X17/-X18 (WAGO 221-415 onder de baan)** voor de 4 reflexsensoren, -R22..-R24 in -X14 en -R28..-R31 in -X15, alles in `opbouw.mjs` (DRADEN 115, "elke draad op een klem" ziet ze) en in TRN-15 ("veld"); -F20 en B3V3 op **blad 6** met kruisverwijzingen /7.7 en /8.1; rekenblad met asserts op de houdstroom bij 40 °C en de 3,3 V-regelaar van het ESP-bord; README en bestellijst | `tekeningenTrein` "Fable 5.2 EN1 en EN2" (MF-R030 in Berekeningen.md, elke -B2..-B8 3 draadeinden, -X17); assert in `berekeningen.py` |
| EN3 | P3 | opgelost | `servoMaxBewegend` 1..4, standaard 2 (2 x 1,2 A binnen de 3 A van de XL4015) | `test_servo` `test_standaard_twee_tegelijk` |
| EN5 | P3 | opgelost | De zin "4,7 kΩ pull-up in de ontvanger" geschrapt (blad 7: interne pull-up ± 30 kΩ, geen extra weerstand) | |
| FN1 | P2 | opgelost | Per halte `wachtLeds`: de stopcode voor de wachtende bus alleen daarheen, in groen altijd de rijcode via `stopLeds`; zonder `wachtLeds` wordt de tweede bus niet tegengehouden (melding in het dashboard) | `test_halte` `test_tweede_bus_tijdens_groen`, `test_zonder_wachtled_niet_tegenhouden`, `test_wachtleds_api` |
| FN2 | P2 | opgelost | `begin()` van beide PCA9685's met MODE1 0x30 (slapen + AI); de nep-chip hoogt alleen op met AI | `test_hw` `test_pca_begin_na_warme_reset_alles_uit`, `test_nep_pca_ai_bit` |
| FN3 | P2 | opgelost | De rem op de servo's standaard uit; aan = boven n groepen één servo tegelijk (niet stil), melding als een servo langer dan 5 s wacht | `test_servo` `test_wachten_bij_veel_lampen` |
| FN4 | P3 | opgelost | Busherstel: eerst SCL nakijken (kortgesloten = melding), STOP als SCL laag, SDA laag, SCL hoog, SDA hoog | `test_hw` |
| FN5 | P3 | opgelost | Host moet 192.168.4.1, treinbaan.local of het thuis-IP zijn; de noodpagina `/update` zegt "werkt alleen via de hotspot" | `test_api` |
| FN6 | P3 | opgelost | Een code van meer dan 144 items wacht tot LittleFS klaar is met bewaren (vlag `bewaarBezig`) | `test_irzend` `test_lange_code_wacht_op_bewaren` |
| FN7 | P3 | opgelost | `kiesLeds` mislukt = niet zenden en tellen; volle IR-rij geteld (`ir.rijVol` in /api/staat); na het opstarten de rijcode 3 keer | `test_irzend` `test_kiesleds_mislukt_en_volle_rij`, `test_halte` `test_opstarten_rijdcode_drie_keer` |
| DN1 | P3 | opgelost | Bouwschema (stap "Ophangen") en README: in elk oogje een losse kabelbinder vóór de doos onder de baan gaat | |
| DN2 | P3 | opgelost | Zekeringhouders op steek **22** (x 241 en 263) en **6 hoger** (y 32): de moeren (tot 17 over de vlakken) raken elkaar en die van de DC-bus niet, het lijf blijft boven de open WAGO-hendels; houder voor 10 A en 4 vlaksteekhulzen 4,8 in de bestellijst | `qaTrein` "Fable 5.2 DN2" (steek ≥ 22, moeren over de hoeken vrij, lijf boven de hendels) |
| TN1 | P2 | opgelost | TRN-22 stap A: geen diodetest meer, meten met 5 V en de mA-stand in beide richtingen (vcc, gnd of apart); README | `tekeningenTrein` "Fable 5.2 TN1-TN3" |
| TN2 | P2 | opgelost | TRN-22 stap D: geen meting meer maar de conclusie van C (actief laag: bij inschakelen ± 1 s alles aan); wie het wil zien: RESET ingedrukt houden | idem |
| TN3 | P2 | opgelost | TRN-22 stap H: leertest (leert de doos een code: gemoduleerd; ziet de camera licht maar leert niets: continu, dan 470 Ω); firmware en dashboard volgen | idem; `test_api` `test_zelftest_json` |
| TN4 | P3 | opgelost | Kruisverwijzingen met de echte x (GPB0..6 → /8.2, GPB0 → /7.4); -Q4 als gesloten blok met zijn klemmen en "per kanaal PC817 + MOSFET, zoals -Q1"; stuklijst -E21..-E28; blad 3 "-F1 T 8 A"; -F20 en B3V3 op blad 6 | `schemaNorm` (kolommen bestaan); nagekeken op de PNG van blad 6, 7 en 8 |
| TN5 | P3 | opgelost | Overal: reflexsensoren vlak voor de invoegingen, hallsensoren aan de stoppunten en na de wissels (README Bedraden, bestellijst, schema blad 8, stuklijst, sensoradvies.py). "Aansluiten": hallsensor en NPN-sensor met "apart" (IN+ aan +12 V, uitgang aan IN−) en NPN met 2,2 kΩ voor "gnd" | |
| VN1 | P2 | opgelost | `tv-logica.js` `busOverPunt`: grens = de helft van de afstand tot het vorige meetpunt van die bus (minimum 4 m), of de doos zegt dat de bus het punt nog niet voorbij is | `node --test ui/test/tv-logica.test.mjs` (7 tests) |
| VN2 | P3 | opgelost (AANNAME) | Schaal uit de rijstroken: 25,5 px / 3,25 m = **7,8 px/m** (vroeger 5: strook 5,1 m); `mm_op_de_baan_per_px: 1.47` (H0 1:87) met `mm_op_de_baan_aanname: true` in `plan.json` (uit `maak-plan.py`); schaalbalk 40 m; sensoradvies nu om de 340 px: 9 in plaats van 15 op de lange stukken | |
| VN3 | P3 | opgelost | `maak-plan.py` zet het sensoradvies in `plan.json`: 17 hallsensoren en 5 `ir_sensoren` (IRRX1, 4 x FTR) met `advies: true` en op busstroken `alleen_bus: true`; ook in de ingebakken kopie van de tv. De tv tekent ze nu volgens hun lijst (HW/HS waren als IR getekend) | |
| QN1 | P3 | opgelost | Nep-chip hoogt alleen op met AI; `i2cSchrijf` weigert meer dan 128 bytes (buffer van Wire); het MCP23017-model is een lezing van het datablad (staat erbij) | `test_hw` `test_nep_buffer_128_bytes` |
| QN2 | P3 | opgelost | De test van de tweede bus vanuit de bussen: bus 1 aan `stopLeds`, bus 2 aan `wachtLeds`, wat ziet elke led per fase | `test_halte` `test_tweede_bus_tijdens_groen` |

## De 14 punten die "deels" waren

| Nr | Prio | Nu | Via |
|---|---|---|---|
| E2 | P1 | opgelost | EN2 (voeding en bedrading reflexsensoren) |
| E5 | P2 | opgelost | TN2, FN2 |
| E11 | P2 | opgelost | EN2 (MF-R030, veldkabels, 1 kΩ per lijn). Geen eigen regelaar: 0,10 A past op de ESP-regelaar (rekenblad, AANNAME 0,8 A); meer dan 4 reflexsensoren = een AMS1117-module (README, rekenblad). Geen 1 nF: het RC-filter 100 Ω + 4,7 µF bij de ontvanger en de 1 kΩ blijven |
| E12 | P2 | opgelost | EN5 |
| F1 | P2 | opgelost | EN1, TN3 |
| F3 | P2 | opgelost | FN1 |
| F8 | P3 | opgelost | FN6 |
| T1 | P2 | opgelost | TN1, TN2, TN3 |
| T4 | P3 | opgelost | TN4 |
| V1 | P2 | opgelost | VN1 |
| V3 | P3 | opgelost (AANNAME) | VN2: de sleutel staat er, de waarde is berekend en nog te meten |
| S2 | P3 | opgelost | TN5 |
| Q1 | P2 | opgelost | FN2, QN1 |
| Q3 | P3 | opgelost | QN2 |

## Proeven

| Proef | Uitkomst |
|---|---|
| `pio test -e native` / `-e native32` | 172/172 en 172/172 |
| `node --test ui/test/tv-logica.test.mjs` | 7/7 |
| `python docs/berekeningen.py` (asserts EN1, EN2) | slaagt |
| `tekeningenTrein` (TREIN_TEKENINGEN=1) + `schemaNorm` | 25/25 (de lengtetest slaat de veldkabels over: hun lengte ligt op de baan) |
| `qaTrein` (TREIN_STL=1, volledig) | 25/27: alles behalve de 2 rebuildtijden, die in de volle run 71 en 53 s waren |
| rebuild **alleen** gemeten | bak links **43,5 en 44,5 s** (grens 45 s, krap), bak rechts **31,5 s** |
| `npm run typecheck` | 0 fouten (eerder tussendoor fouten in `src/core` en `src/app` van werk dat tegelijk liep, niet van de treindoos) |
| `graphify update .` | gedaan |
| app (`app/maak-app.py`) | opnieuw, grootste bestand 10,7 MB (≤ 16 MB) |
| PDF's | aansluitschema (19 bladen), werktekeningen (17, met het projectiesymbool eerste hoek), bouwschema (12 stappen), alles-in-één |

Let op: de rebuild van de linkerhelft zat in ronde v6b op 24,2 s en nu op ± 44 s, zonder dat de linkerhelft deze
ronde veranderde. `src/core` heeft niet-gecommitte wijzigingen van ander werk (o.a. `rebuild.ts`, `solid.ts`); na te
kijken of de kernel trager werd.
