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
- [ ] Bouwschema-beelden van stap 7 tot 10 opnieuw renderen (tonen nog de oude draadsleuven; `node e2e/tools/bouwschema-trein.mjs`, ± 40 min)
