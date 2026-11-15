# Taken - Fitnesstoestellen (bibliotheek/fitness)

## Catalogus van ± 50 fitnesstoestellen met werkplaatspakket (2026-11-15)
- [x] Opzoeken: EN ISO 20957 (proeflasten, stabiliteit, knelpunten, staalkabel), kooponderdelen met winkel en prijs, marktprijzen thuis/pro
- [x] Kern: profielen en kooponderdelen (onderdelen.mjs), normen (normen.mjs), model-DSL (model.mjs, bouwstenen.mjs)
- [x] De 50 toestellen in 4 bestanden (rekken, banken, kabel, plate) met thuis- en pro-versie
- [x] Berekening (bereken.mjs), stuklijst/zaagplan/nesting (stuklijst.mjs), uren en prijs (werkwijze.mjs, prijzen.mjs)
- [x] Bladen: overzicht A3, stuklijst, stuk per stuk, lassen, boringen, kabelschema, bekleding, bestellijst, montage
- [x] 3D (scene3d.mjs), dossier/CSV (dossier.mjs), webpagina (web/index.html), maak-web.mjs
- [x] Presentatie in één bestand (maak-presentatie.mjs) en kopie naar het bureaublad met LEESMIJ
- [x] Tests src/qa/qaFitness.test.ts (826 groen), typecheck, test:voorbeelden
- [x] Screenshots bekijken en verbeteren (maatlijnen, titelblok, lasschets, nesting, montage per katrol en kussen)
- [x] README en docs (Normen-en-bronnen, Kooponderdelen, Marktprijzen), graphify update

## Versie 2: fouten uit de machines, meer detail, bewegingscontrole (2026-11-15)
- [x] Controles in controle.mjs: botsingen (OBB), zwevend, kabelloop, ergonomie, schijven vrij, gatfouten
- [x] Alle 50 toestellen thuis en pro nagelopen en verbeterd tot 0 meldingen (rekken, banken, kabel, plate-loaded)
- [x] Beweging: stand 0..1 voor hefbomen, sleden, stapels, FID-bank en beenmachines; controle in 5 standen
- [x] Details in 3D en bladen: gaten, eindkappen, grips, kartel, glijlagers, katrol met groef en borgmoer, kussens met naad, stelvoeten, typeplaatje
- [x] Tests uitbreiden (botsing over de slag, kabel, bereik, samenhang, gaten, negatieve gatproef): 1427 groen; typecheck fitness ok
- [x] Web en presentatie opnieuw bouwen (met bureaubladkopie), graphify update
- [x] Screenshots fitness-fotos-v2 (groot, detail, voor/na) bekeken en verbeterd (assen zichtbaar, close-ups zonder schijven)
- [x] Docs bijwerken (gatregels, README) en rapport

## Boutgaten zichtbaar en zonder fouten (2026-11-15)
- [x] Elk gat als donker gat op elk wandvlak in 3D, miniaturen en aanzichten; bouten met zeskantkop en moer
- [x] Stukbladen: ordinaatmaat per gat vanaf uiteinde A (plaat: x/y vanaf de randen) en een boortabel per stuk
- [x] Boorblad: per stuk Ø, aantal, vlak, wanden en doel (bout, pen, lager, Westside), met de uitkomst van de gatcontrole
- [x] Gatcontrole: zelfde as ≤ 0,5 mm, speling ISO 273, rand ≥ 1,5 Ø, niet in hoekradius of las, brug ≥ 6 mm
- [x] Test voor de gatcontrole en de lijst van gevonden gatfouten met de oplossing

## Versie 3: alle adviezen van Fable 5.2 (40 bevindingen) (2026-11-15)
- [x] Stap 1 rekken: J-cup als U-beugel met pen door beide wanden, pin-pipe safety, spotter met U-beugel en 2 pennen (P1-01/02/03)
- [x] Stap 2 hefboom-bouwsteen: as als staaf, naaf met eindschijven en spanstift, lagerbussen, stelringen, begin- en eindaanslag (P1-11)
- [x] Stap 3 slede: tegenrollen, grendels met getande strip, ribben achter de voetplaat (P1-06/07/10); Smith en belt squat opnieuw (P1-08/09)
- [x] Stap 4 kabel: stapel (lagers, klemblokken, bussen, last), lus met dubbele zwenkkatrol (P1-04), tweezijdige as (P1-05), nokken (P2-01/02), diepe voeten en kantelen (P1-12)
- [x] Stap 5 berekening en controles: evenwicht losse delen, as op buiging, platen, horizontale trek, kabellengte constant, pen op buiging, netto doorsnede; P2-punten
- [x] Stap 6 lastekeningen per lasgroep (P1-13) en maatvoering stukbladen (P2-09); typeplaatje "prototype: proeflast nodig" en dossier (P1-14)
- [x] Stap 7 prijzen (uren, overhead, uurloon als parameter), web klant/werkplaats, tests met negatieve proef per P1, fotos v3, graphify

## Versie 4: de 11 deels-punten van Fable 5.2 en de 2 oranje punten (2026-11-15)
- [x] FB-12 op de hefboom-bouwsteen (P1-11); row met de schijfhouder op een tak (P2-13); pec deck ± 40 % (P2-01)
- [x] Lat pulldown met verstelbare zitting (P2-03); zijafscherming stapel (P2-15); bestellijst: gereedschap, kabelgeleiders, traanplaat (P2-16)
- [x] Controles: sleutelruimte en gaten in gezette delen (P2-08); bouten op trek en trek + afschuiving (P2-10)
- [x] DXF-export van platen en laserdelen (P2-09); halve V als lassymbool (P3-04); lassamenstelling voor alle lasgroepen
- [x] Oranje punten onder 85 % (J-cup-pen thuis, schijfhouder FP-06 pro); tests, typecheck, web, presentatie, foto's v4, graphify

## Versie 5 fase A: pro-uiterlijk van de bestaande 50 (2026-11-15)
- [x] Weergave: PBR-materialen (poedercoat met korrel, chroom, leer), studiolicht, zachte schaduw, AO, betere camera
- [x] Ovaalbuis voor plate-loaded (armen, portaal), afgeronde vormen; berekening volgt het profiel
- [x] Gelaserde zijplaten met logo-uitsparing (placeholder) op rekken en plate-loaded
- [x] Kappen over stapel en katrollen (gezet plaatwerk 1,5 mm) met kijkvenster en instructieplaat
- [x] Kussens met bies en ronde randen, grepen met eindkap, knoppen/popper-pins in accentkleur, verborgen rubber voeten, chromen hulzen
- [x] Alles in stuklijst, bestellijst, prijs en tekening; controles groen; tests en typecheck
- [x] Foto's voor/na in fitness-fotos-v5a bekijken en verbeteren

## Versie 5 fase B: variantensysteem (2026-11-15)
- [x] Uitvoering thuis / semi-pro / pro (klasse H, semi-pro onderbouwd, S), maat compact / standaard / XL
- [x] Afwerking (RAL, bekleding, chroom of zwart, logoplaat) en opties per soort in model, berekening, stuklijst, prijs en tekening
- [x] Web: keuzes per toestel; tests; foto's fitness-fotos-v5b

## Versie 5 fase C: ± 100 nieuwe toestellen (2026-11-15)
- [x] FS selectorized (eigen stapel en pen), FM multigyms/rigs, FO opslag/accessoires, FX strongman/buiten (EN 16630)
- [x] Per toestel 3D, berekening, bladen, gat- en botsingscontrole, bestellijst, prijs en marktband
- [x] Web lui laden per toestel, EISEN/README/docs, presentatie en bureaubladkopie, foto's fitness-fotos-v5c, graphify

## Versie 5 fase A2: vormtaal van pro-toestellen (2026-11-15)
- [x] Model: gebogen buis (sweep langs bogen, buigradius ≥ 3 x buishoogte) en vrije laserplaat (contour met bogen, uitsparingen)
- [x] Doorrekenen: lassen, eindkappen, botsing en gaten op gebogen buis en contour; stuklijst (gestrekte lengte, bochten), werkwijze (buigen), prijs (per bocht, laser per m contour), DXF met bogen, stukblad
- [x] Plate-loaded: frame in gebogen ovaalbuis, zijschilden 10 mm rond de draaipunten, gebogen hefbomen, voetframe met ronde hoeken, schuine grepen (FP-04/05/08/09, FP-01)
- [x] Kabel: stapeltoren volledig omkapt (voor/zij/achter met grote radii, ronde bovenkap), voetkappen, gebogen bovenarm met katrolkap (FK-01, FK-04 en de andere torens)
- [x] Rekken: voetplaten met ronde hoeken en stelvoet, kopplaten met schuine rand, zijplaat met naam, J-cups met UHMW
- [x] Banken: ovaalbuisframe met gebogen achterpoot, voorpoot met wieltjes en handgreep, taps kussen, zitting met ronde neus (FB-02, FB-01)
- [x] Controles en tests groen, typecheck, foto's voor/na in fitness-fotos-v5a2 (FP-04, FP-08, FP-01, FK-01, FK-04, FR-01, FB-02), web, presentatie, graphify

## Versie 5 fase A3: vormtaal op alle toestellen (2026-11-15)
- [x] FP-04 (en de andere iso-machines): portaal symmetrisch of één centrale rugboog
- [x] FP-01: zijschild met contour langs de rails, gebogen staanders
- [x] FP-02/03/06/07/10/11/12: voetframe/bogen/schilden in ovaalbuis
- [x] FK-02/03/05..12: omkapping, gebogen armen, ovaal frame
- [x] Alle banken: ovaalbuisframe, gebogen poten, wielen en handgreep, vormkussens
- [x] Controles en tests groen, typecheck, foto's voor/na per toestel in fitness-fotos-v5a3, web, presentatie, graphify

## Versie 5 fase B: varianten per toestel (2026-11-15)
- [x] Uitvoering semi-pro (klasse S, lichtere wanden, max. gebruiker 135 kg) naast thuis en pro; overal doorgerekend
- [x] Maat compact / standaard / XL waar het zin heeft (rekken, banken, torens, opslag)
- [x] Afwerking: frame-RAL, kussenkleur, chroom of zwart, logoplaat ja/nee (model, prijs, 3D)
- [x] Opties per soort (schijvenopslag, bandpinnen, wielen, zwaardere stapel, grepenset)
- [x] Stuklijst, prijs, tekeningen en typeplaat met uitvoering/maat/opties; tests
- [x] Web en presentatie: keuzes per toestel; foto's fitness-fotos-v5b

## Versie 5 fase C: ± 100 nieuwe toestellen in blokken van ± 25 (2026-11-15)
- [x] Blok 1: FS-01..FS-25 selectorized (nokstation met hefboom en nok, kabelstation met gebogen arm), varianten en opties; tests, raster
- [x] Blok 2: FM-01..FM-25 multigyms en rigs (rigBouw 1-4 vakken, muur, monkey bars, ringen, dips, opslag; functional trainers 2-3 torens); FS: nokkap, herkenbare stations, latstang aan V-strop
- [x] Blok 3: FO-01..FO-25 opslag en accessoires (rekken met lagen, palen en wandstrips met houders, parallettes, plyobox, schijvenkar); muur als context bij muurtoestellen; snelle testrun (FITNESS_VOLLEDIG=1 voor alles); lui laden in de web
- [x] FO pro-uiterlijk: halterrekken met V-goten (gezette plaat + rubber) op 15° helling, zijplaat met logo en ronde voeten; ballen- en kettlebellrek met V-goot of gezette bak; plyobox als dichte doos uit gezette plaat; schijvenbomen en bandenpaal op een gelaserde basisplaat, houders met eindkap en rubberen huls
- [x] Blok 4: FX strongman en buiten (EN 16630)
  - [x] buiten.mjs: strongman (juk, farmers, frame carry, slee, log, axle, conan's wheel, viking press, deadlift jack, platform)
  - [x] buiten.mjs: calisthenics EN 16630 (palen in betonpoer, optrek, brug, dip, monkey bars, wandrek, buikbank, combinaties)
  - [x] EN 16630-toetsen: klemopeningen 89-230 mm, greep Ø 16-45, valhoogte en valruimte, ondergrond
  - [x] varianten (maat, opties), prijs en marktband, controles, catalogus en web
  - [x] snelle en volledige testrun (4280/4280, 173 s), typecheck, raster FX
- [x] Afronding: README/EISEN/docs (EN 16630, marktprijzen 150), presentatie, web-build met bestandenlijst, totaalraster 150, graphify
  - [x] README, EISEN, Normen-en-bronnen (EN 16630), Marktprijzen (150 toestellen)
  - [x] presentatie opnieuw gebouwd en naar Bureaublad/Fitnesstoestellen
  - [x] web-build met de volledige bestandenlijst
  - [x] totaalraster van alle 150 toestellen
  - [x] graphify update, tijdelijke scripts weg
