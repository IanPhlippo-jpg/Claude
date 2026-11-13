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
