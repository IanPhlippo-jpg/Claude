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
