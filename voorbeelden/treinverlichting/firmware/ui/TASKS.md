# Taken - dashboard en tv-pagina

## Versie 6: IR, servo's, bussen, haltes, kastjes, plan en tv (2026-11-15)
- [x] testplan.json (Station Turnhout in het klein, baanplan-formaat; vervalt voor de tv: het formaat van situatieplan/plan.json is leidend)
- [x] dashboard: tabblad Baan met IR (leren, codes, laatste codes, koppelen aan bus), servo's, bussen en meetpunten, haltes, geluidskastjes
- [x] dashboard: ingangen 1-24 met NPN/PNP (per ingang en per groep van 8) en functiestappen servo, IR, geluid
- [x] dashboard: planeditor op het formaat van situatieplan/plan.json (laden/bewaren /api/plan, punten en rijbanen verslepen/toevoegen/wissen, koppeling, achtergrond verkleinen en uploaden)
- [x] dashboard: demomodus (?demo=1 en als bestand) met nepgegevens voor alles hierboven
- [x] tv.html = situatieplan/tv.html + ui/tv-live.js (ui/maak-tv.py), live via /api/meldingen en /api/staat?kort=1, simulatie zonder doos
- [x] screenshots (tv 1920x1080 demo en live, dashboard gsm/tablet, licht/donker) bekeken en verbeterd
- [x] gzip-grootte gemeten, maak-header.py gedraaid, graphify update

## Advies Fable 5.2 (2026-11-16)
- [x] dashboard: wachtwoord voor het thuisnet (F6): veld in Instellingen, localStorage, kop X-Treinbaan-Wachtwoord op elke POST/PUT, melding bij 401 en 403
- [x] dashboard: Instellingen > Hardware: printSoort per optocouplerprint (E3, uitleg vcc/gnd/apart, TRN-20), irLedActiefLaag (E1), irDuty (E4)
- [x] dashboard: ingangen 23 in plaats van 24 (E7; 17-23 reflexsensor op 3,3 V), NPN/PNP-uitleg volgens printSoort
- [x] dashboard: IR: codesoort "continu" (F1), teller "IR niet verzonden" en laatste fout (F5), knop IR-zelftest met resultaat en "ongemoduleerd" (E4, F1)
- [x] dashboard: haltes "stopcode herhalen", "maxVerkeerS" en wachtende bus live (F2, F12, F3); servo "puls uit na ... s" (E19, E8)
- [x] dashboard: meetpunten "alleen bussen" (V1), knop "bus X staat bij punt Y" (V2), paneel Zelftest met GET /api/zelftest (Q1)
- [x] dashboard: demomodus uitgebreid met alle nieuwe velden (ook 401 met ?demo=1&thuisnet=1)
- [x] tv-live.js: geen spookauto's (V1: alleen zeker toewijzen, 2 x rijtijd te laat = weg, tellen per stuk), FIFO per strook zonder buscode (V2), millis-overloop (V4), ?api= ook voor staat en plan (V5)
- [x] screenshots (ui-*.png) met nep-doos, zelf bekijken en verbeteren
- [x] maak-tv.py en maak-header.py draaien, gzip-groottes, graphify update
