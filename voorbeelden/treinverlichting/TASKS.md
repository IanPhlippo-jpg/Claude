# Taken - kabeldoos treinverlichting

## Advies Fable 5.2 verwerken (2026-11-12)
- [x] Firmware: watchdog, hotspot herstellen, BOOT-knop, update, thuisnet, testmodus, knop alles aan/uit, tot 32 groepen (firmware/TASKS.md)
- [x] Gaatjesprints opnieuw ingedeeld (opbouw.mjs): AO3400A op adapters in voetjes, polyfuse per groep, LTV-844 met COM-klemmen, P-FET tegen ompolen, 0 V-klem op de uitgangsprint, klemmen steek 2,54
- [x] Doos: klemlippen per bordje, DC-bus in de linkerwand, uitgangsprint over de hele rij 6 met de PCA9685 erboven, hulpstukken (werkhaken, spatel)
- [x] Schema: voeding (DC-bus, P-FET, polyfuse knoppen), uitgangen (polyfuse per groep, AO3400A), ingangen (AC-optocouplers, COM), OE 1 kΩ, versie 2
- [x] Tekeningen: opbouw van de 4 gaatjesprints, interne draadlijst, meetblad, invulblad
- [x] Rekenblad, README, EISEN (bijsturing 2026-11-12), maten en bronnen, bouwschema (proefopstelling, flashen, tafelhoogte)
- [x] Tests (klemlippen, schema, opbouw), STL's, PDF's, app, screenshots

## Kant-en-klare modules in plaats van gaatjesprints (2026-11-13)
- [x] Modules kiezen (uitgangen, ingangen, voeding 5 V, zekeringen, ompoolbeveiliging, ESP-klemmenadapter) met maten en bron
- [x] Indeling van de doos en 3D van de modules (maten.mjs, onderdelen.mjs, printjes.mjs, maak-kabeldoos.mjs)
- [x] Bedrading als data (opbouw.mjs): modules, klemmen, draadlijst TRN-14, controle
- [x] Schema (modules als -A-blokken), klemmenplannen, stuklijst
- [x] Montageblad modules en bedrading (vervangt TRN-10..13), meetblad TRN-20, invulblad TRN-21
- [x] Firmware (pinnen, actief-hoog/laag, adres) en hosttests
- [x] Rekenblad, README (bestellijst), Maten-en-bronnen, EISEN (bijsturing 2026-11-13)
- [x] Generators, tests (bak < 45 s), PDF's, bouwschema, app, screenshots

## Eén laag: langwerpige doos in 2 helften die in elkaar klikken (2026-11-15)
- [x] Indeling: bordjes in de linkerhelft (zoals versie 4), modules op palen in de bodem van de rechterhelft, tules/sleutelgaten/bussen verdeeld
- [x] Naad: klikhaken (45° onderkant, berekende rek en kracht) + lijmvoeg 0,2 (bodemlippen, haken langs de wand), deksel met overlap en kliklippen
- [x] Generator: bak links/rechts, deksel links/rechts, assemblage, moduleplaat weg
- [x] Bijsturing: geen dimmers (firmware 1.3.0, aan/uit) en hallsensoren op de ingangen (firmware, schema, rekenblad, meetblad)
- [x] Bijsturing: kabelgoten en gootdeksels weg (goten.mjs, Gootdeksel(s-plaat).kcad), aanslagen voor de bordjes, draden rechtstreeks
- [x] Tests (qaTrein, tekeningenTrein, schemaNorm, typecheck), rebuild per bakhelft < 45 s, STL's
- [x] Tekeningen: bak/deksel per helft, naaddetail TRN-06, boormal over 2 bladen, montageblad rechterhelft, draadlijst, meetblad
- [x] Rekenblad, README, EISEN, Maten-en-bronnen, schema, app
- [x] PDF's, bouwschema, beelden, screenshots nagekeken
- [x] Bijsturing: gaatjes 2 x 2 per klem in de bodem (512, om en om, eilandjes van 0,4), aanslagen naar x ±26, TRN-07, tests, beelden
- [x] Bouwschema-beelden van stap 7 tot 10 opnieuw renderen (tonen nog de oude draadsleuven; `node e2e/tools/bouwschema-trein.mjs`, ± 40 min)

## Bouwschema opnieuw renderen (2026-11-15)
- [x] build:e2e en preview op poort 5185
- [x] bouwschema-trein.mjs draaien (zonder hergebruik)
- [x] stapbeelden 7-10 controleren
- [x] app opnieuw bouwen met maak-app.py

## Situatieplan Station Turnhout uit de Google-foto (2026-11-15)
- [x] Foto meten: sporenhoek (Hough), schaal, plein, hotel, Stationstraat
- [x] Labels en pins weg met cv2.inpaint (maskers)
- [x] Getekende ondergrond: vlakken uit de foto, polygonen, rails met dwarsliggers (nu controle in eigen-ondergrond/)
- [x] Busbaan als vector volgens de gedraaide schets van Ian
- [x] Bijsturing: Ian levert zelf de achtergrond (achtergrond.jpg); eigen ondergrond blijft alleen als controle

## Situatieplan op de achtergrond van Ian + tv-demo (2026-11-15)
- [x] Rijstroken meten in achtergrond.jpg (hart van elke strook)
- [x] maak-plan.py: rijbanen, wissels, stoppunten, IR, hall, verkeerslichten -> plan.json
- [x] plan.svg en plan-3840x2160.png (titel, legende, noordpijl, schaal in de band onder het beeld)
- [x] controle-banen.png nakijken
- [x] tv.html: simulatie met bussen en auto's, wissels, hall, verkeerslichten, zetMelding()
- [x] Screenshots met Playwright (1 + reeks van 4), nakijken, tijdelijke scripts wissen
- [x] README.md met JSON-formaat en koppeling live gegevens

## Bordjes vastschroeven in plaats van klemlippen, versie 5b (2026-11-15)
- [x] Maten: schroefpaaltje Ø5, voorgat Ø1,6, schroef 2,0 x 6 bolkop (gaten 2 mm van de randen); klemlippen, palen en aanslagen weg
- [x] Generator: 64 paaltjes, voorgaten, schroeven in de samenstelling; 512 gaatjes terug naar draadsleuven
- [x] Tests: 4 paaltjes per bordje op de gaten, wand en grip, kop en schroevendraaier vrij van de klemmen
- [x] TRN-07 wordt de bevestiging van de bordjes (bovenaanzicht, doorsnede, schroef, tabel)
- [x] Rekenblad §6, README (bestellijst € 198,45, montage), EISEN, Maten-en-bronnen, bouwschema-tekst, app-teksten
- [x] STL's en rebuild bak links (≤ 45 s: 24,2 s alleen), tekeningen en PDF's opnieuw
- [x] Foto's in scratchpad/trein-v5b (bordje met 4 schroeven, linkerhelft van boven, TRN-07) en zelf nakijken
- [x] Bouwschema opnieuw renderen (build:e2e + preview 5185, zonder hergebruik), app opnieuw bouwen

## Versie 6, fase A: IR, servo's, PNP, geluidskastjes, tv-pagina, planeditor (2026-11-15)
- [x] EISEN.md: wensen van Ian letterlijk, keuzes en aannames (pinnen 11/39/42/47/48, MCP23017, 2de PCA9685 op 50 Hz)
- [x] Firmware 2.0: IR zenden (RMT, draaggolf 30-56 kHz, NEC/RC5/raw, leermodus) en IR/FTR lezen (bus X gezien bij punt Y)
- [x] Firmware 2.0: servo's (eindstanden, snelheid, in functies), PNP/NPN per ingang, bushalte-functie, geluidskastjes aansturen
- [x] Pio native tests: IR-decoder, servo-ramp, buslogica, interpolatie van de busplaats
- [x] Dashboard: IR leren, servo's, geluiden uploaden, planeditor; tv-pagina /tv met rijdende bussen en demo
- [x] Geluidskastje: firmware, behuizing (.kcad + STL), tekening, bestellijst
- [x] Schema (IEC 60617/81346/61082) en rekenblad (stroom IR-led, servovoeding, optocouplers PNP)
- [x] Sensoradvies op het situatieplan (docs/sensoradvies.py, Sensoradvies.png)
- [x] README (wat kopen, hoe bedraden), screenshots in scratchpad/trein-v6 en zelf nakijken

## Versie 6, fase B: de doos aangepast voor de nieuwe modules (2026-11-15)
- [x] Indeling: servoprint -K7, XL4015 -T3 en WAGO 3V3/M in de rechterhelft (tussen de PCA9685 en de optocouplers); IR-driver -Q4/-Q3 en MCP23017 -K5 (+ plaats -K8) in de linkerhelft naast bordje 16
- [x] opbouw.mjs: modules, plaatsing per helft, draden (W62..), controle per helft (vrij van de draadzones van de bordjes)
- [x] 3D: servoprint met servostekkers, MCP23017, AOD4184, XL4015, TSMP58000 in een houder achter een venstertje in de voorwand
- [x] Generator: palen per helft, klempaaltjes MCP, tule voor de servokabels, venstertje + houder TSMP58000
- [x] Tests: controleerAlles, venstertje vrij, rebuild per helft ≤ 45 s (alleen gemeten), STL's
- [x] Tekeningen: TRN-01/02, montageblad linkerhelft (TRN-11), draadlijst, schema (-X9 = klemmen van -Q4), bestellijst
- [x] Bouwschema, app (maak-app.py), README/EISEN, foto's in scratchpad/trein-v6b
- [x] tv-pagina: label van een live bus niet over een ander label (tv-live.js)

## Advies Fable 5.2 op versie 6 verwerken: 62 punten (2026-11-16)
- [x] P1: E3 (ingangskant optocouplerprint: 3 varianten, bron, meetstap), E1 (polariteit -Q4), E2 (reflexsensor op de MCP23017 + niveau-timeout)
- [x] Firmware (agent): E1, E2, E3, E4-E8, E14, E19, F1-F17, V5, Q1/Q3 (mocks van hw.h/irhw.h), native en native32 groen
- [x] Dashboard en tv (agent): instellingen voor E1/E3/F2/F1/E19, IR-zelftest, V1/V2/V4
- [x] Doos en tekeningen (agent): D1 proefstuk en speling 0,3, D2/D8 trekontlasting, D9 zekeringen, T5 schaal en toleranties, qaTrein en rebuild
- [x] Schema (E3, E11, E12, T4, -W-kabels), rekenblad (E8, E14-E16, D5), TRN-20 (T1), bestellijst (T2), sensoradvies (S1-S4, V3)
- [x] README, EISEN, Maten-en-bronnen, versies (T3), "getest op de pc / gemeten" (Q2), "eerst kopen en meten"
- [x] Tabel van de 62 punten met status (docs/Fable-5.2-v6-status.md), app opnieuw (zip < 16 MB), foto's in scratchpad/trein-v6c

## Doos en tekeningen na Fable 5.2 (2026-11-16)
- [x] D1: speling bodemlippen 0,3 in maten.mjs (naad) en de naadtests bijwerken
- [x] D1: proefstuk (Proefstuk.kcad): bordplaats met 4 schroefpaaltjes + steunrail, 30 mm naad met lip en klikhaak; STL in print/
- [x] D2/D8: oogjes voor kabelbinders in de bodem bij elke tule en bij -K2, -K7, -K5, -Q4; vrij van modules en draadzones
- [x] D9: zekeringen -F1 en -F19 bereikbaar bij de naad van het deksel: nagekeken, niet zonder grote verbouwing (rapport)
- [x] T5: schaal 1:2 of 1:5, ISO 2768-c in het titelblok, passingen met eigen tolerantie op TRN-06/TRN-07, projectiesymbool
- [x] T3: revisie 6 en wijzigingsregel in tekeningenTrein; TRN-08 "Proefstuk"
- [x] Q3: test dat TRN-20 en de bestellijst in README elke module van MODULES noemen
- [x] Rebuild per helft, volledige qaTrein, tekeningen + PDF, tsc, graphify update, foto's in scratchpad/trein-v6c
