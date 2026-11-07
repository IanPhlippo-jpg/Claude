# Onafhankelijk ontwerp-QA-rapport v3

## 1. Scope, zelfstandig uitgevoerd onderzoek, bewijs en beperkingen

**Scope.** Dit is een beoordeling van de engineering- en ontwerpmaturiteit van `/workspace/afzuiging/src-v3/` (114 bestanden, revisie 6.1). Ik heb de bron vergeleken met de baseline `/workspace/afzuiging/src/` en met de bevindingen uit `report/AFZUIGING-eindverslag-v2.md`. Andere teamrapporten en team/in-mappen heb ik niet gelezen. Ontbrekende fysieke proeven tellen niet mee in de score.

**Werkwijze.** Alles is uitgevoerd op een eigen kopie in `[eigen onderzoeksmap]/`. Het bewijs staat in `BEWIJSLOG.md`. De SHA256-hashes van de bron zijn vóór en na het onderzoek gelijk: de bron is niet gewijzigd.

| # | Onderzoek | Uitkomst |
|---|---|---|
| 1 | `docs/berekeningen.py` opnieuw gedraaid | `Berekeningen.md` is identiek, op regeleinden (CRLF) na |
| 2 | Native tests `test_regel.cpp` met Unity 2.6.0 en zig/clang c++ (gnu++17). GCC 16.2 zoals in de docs was niet beschikbaar | 16/16 geslaagd |
| 3 | 8 eigen adversariële tests (`qa_extra.cpp`) | 6 falen, 2 slagen (zie sectie 3) |
| 4 | Firmwarebuilds met PlatformIO en espressif32@6.9.0 | knop SUCCESS, module SUCCESS. De 5 waarschuwingen komen allemaal uit de GFX-bibliotheek |
| 5 | Eigen reconstructie van alle KCAD-onderdelen (sketch/extrude, boss/cut, draft, direction2) met shapely + manifold3d | 26 onderdelen gereconstrueerd zonder kernelfout |
| 6 | 13 print-STL's tegen de reconstructie | allemaal gesloten en manifold met consistente winding. Volumeratio 0,9991–1,0001 |
| 7 | Assemblage: 77 plaatsingen, 2926 paren | 1 snijding (Voedingsbox/Voedingsprint 0,66 mm³) |
| 8 | Klauwsweep (verticale schuif bij blad 10–50 mm, zwaai 0–90°) | geen interferentie in het zwaaivenster |
| 9 | `rooster.dxf` met ezdxf/shapely: open oppervlak, stegen/sleuven, ingeschreven cirkels | zie sectie 3 |
| 10 | Eigen systeemmodel voor filtermelding tegen vangstdebiet (`geo/alarm.py`) | zie N-02 |
| 11 | Webbronnen opgezocht: Rittal SK 3171.100 en Mean Well GST90A-spec | G3 / ISO Coarse 50 %, “vanaf 10 µm”, progressieve mat. Adapter 100 % last tot 40 °C met derating, η ≈ 90 % |

**Drie bewijsniveaus**
- **Nominaal:** de parameters `M` in `maak-afzuiging.mjs` en de documentmaten.
- **Onafhankelijke reconstructie:** mijn eigen mesh-kernel. Bogen zijn gesegmenteerd op ±0,3 mm, draft is benaderd met kegels of trappen van 0,2 mm. Schroeven zijn als kerndiameter gemodelleerd, dus schroefdraadcontact is niet zichtbaar.
- **Officiële kernel:** niet beschikbaar. `../lib/schets.mjs` ontbreekt (`ERR_MODULE_NOT_FOUND`), dus de generator draait niet. De STL's zijn de enige officiële kernel-uitvoer. Die komen binnen 0,1 % volume overeen met mijn reconstructie.

**Grenzen**
- Er is geen hardware uitgevoerd.
- Geen CFD en geen FEM.
- De ventilatorcurve is grafisch afgelezen.
- De drukval van de Rittal-mat is niet gepubliceerd; het rekenblad gebruikt G4-referenties als aanname.
- De koppeling tussen PWM-stand en toerental is onbekend.

## 2. Wijzigingen sinds v2 en matrix van elke oude bevinding

**Belangrijkste wijzigingen**
- Eén revisie 6.1 voor alle uitvoer en een nieuw `docs/berekeningen.py`.
- Eén filter: Rittal SK 3171.100 (G3) in plaats van M5. Het beschermingsconcept is herschreven tot “bescherming van de ventilator, geen luchtreiniger”.
- Ontwerpdebiet 250 m³/h in plaats van 500.
- `regel.h` met tests, koppeling per set (MAC + LMK) en een boost-lease in de module.
- PETG-klauwen met een berekend aandraaimoment.
- Schroefdiepte van de ventilator 5 mm.
- Magneetbodem 0,9 mm.

| v2-bevinding | Status | Bron / bewijs |
|---|---|---|
| M5 als enige retourlucht-eindtrap (Kritiek) | **Deels.** De filterkeuze is nu exact en eerlijk gedocumenteerd. Een grofstoffilter (G3 / ISO Coarse 50 %, fabrikant: “vanaf 10 µm”) is echter geen aangetoonde, afdoende fijnstofbescherming; het ontwerp claimt die ook niet meer. De werkelijke fijnstof-efficiëntie van deze mat is zonder meetdata onbekend (niet nul verondersteld). Er is geen buitenafvoer en de ventilatie is niet gedimensioneerd. | `Vrijgave-en-meetplan.md` §2; Rittal-spec |
| Afdichting cassetterand / pakking (Major) | **Open.** De EPDM-band bestaat alleen als tekst. Hij staat niet in de CAD, de BOM of de README en `M.richel` is niet verlaagd. De zitting is 1,25 mm breed. | `maak-afzuiging.mjs:49-50`; meetplan r.41 |
| Mediavlak en drukcurve onderbouwen | **Deels.** Er is nu een systeemkromme met een band van 0,7–1,5×. De Δp van de mat is een aanname. | `berekeningen.py:63-67` |
| Revisiemix CAD/STL (romp 99/114, cassette 22/37) | **Opgelost.** De STL's komen overeen met de reconstructie. | `recon-onderdelen.json` |
| 4 niet-manifold STL's | **Opgelost.** 13/13 zijn gesloten met consistente winding. | idem |
| 4 ontbrekende printtypen | **Opgelost.** 13 typen aanwezig. | `print/` |
| Oude doorsnede/BOM (drie filters, 229, 86, stalen klauwen, M3) | **Deels.** De maat 229 klopt nu (span van de uitgezwaaide klauwen ±114,5). Wel nog aanwezig: verouderde `laser/klauwen-4x-RVS304-4mm.dxf` en `dialklauwen-2x-RVS304-3mm.dxf`, en verouderd generatorcommentaar (“versie 6”, “stalen klauwen (M3)”). | `maak-afzuiging.mjs:1,17,90` |
| Overlap knophouder/M2,5-schroef | **Opgelost** (0 mm³) | `intersecties.json` |
| Overlap knophouder/USB-print | **Opgelost** | idem |
| Overlap knophouder/VIEWE | **Opgelost** | idem |
| Overlap voedingsbox/voedingsprint | **Open** (0,66 mm³) | idem |
| Magneetbodem 0,4 mm | **Opgelost** (0,9 mm) | `maak-afzuiging.mjs:64-65` |
| Moerkamerdaken 1,8/1,6 mm in berekening | **Opgelost** (afschuiving 1247/970 N) | `Berekeningen.md` §6 |
| M4×65 puntuitsteek ±1 mm | **Open.** De punt zit op y −63 en de dekselonderkant op −62. | assemblage-bbox |
| M4×10 ventilator: 4 mm indraaiing | **Opgelost.** Kamer 1 mm plus verzinking geeft 5,0 mm nominaal. | Bodemplaat-features |
| Bevestiging honingraatblad / belastingsgeval | **Deels.** Er is een berekening, maar het moment van 0,05 Nm is niet beheersbaar (N-08). | `Berekeningen.md` §6 |
| G01-fanalternatief | **Opgelost** | README-BOM |
| Zekering selectie/coördinatie | **Deels.** De DC-eis staat er nu, maar er is geen partnummer. Belasting 77 %. | `Berekeningen.md` §4 |
| Kabel-/M8-ratings | **Deels.** Het schema zegt 0,5 mm², de berekening 0,25 mm². | `schema/blad-2.svg` |
| USB-C-bron en terugvoeding bij flashen | **Deels / onzeker.** Rp 56 kΩ is aanwezig. VBUS is permanent aan. Flashen van de module terwijl de box aan staat is niet geregeld. | blad-4; README Firmware |
| Warmtebegroting | **Opgelost** (conservatief model) | `Berekeningen.md` §5 |
| Verouderde `dp` blijft geldig | **Opgelost** | `regel.h:8,144`; test |
| Nul samples geeft geldige ijking | **Opgelost** | `regel.h:149,197-201` |
| UIT tijdens ijken / bewaking pas vanaf 30 % | **Opgelost** | `regel.h:60-64,118`; tests |
| Koppeling / broadcast / boost alleen in knop | **Deels.** Opgelost: MAC, LMK, volgnummer en module-lease. Nieuw open: overschrijven in het koppelvenster, sleutel in klare tekst, replay uit een oude sessie (N-06). | `regel.h:245-265` |
| AAN opgeslagen bij boot / bevestigde status | **Opgelost** | `knop/main.cpp:366`; `Status` |
| Uitklopinstructie | **Opgelost** | `knop/main.cpp:320`; README |
| Drukbereik en factor-2-alarm | **Deels.** De bereikbewaking is opgelost, maar de alarmdrempel is niet aan het vangstdebiet gekoppeld (N-02). | `regel.h:112` |
| Geluidsclaim zonder model | **Deels.** Er is nu een model, maar onder de modelaannames ligt de voorspelling boven het meetplan-doel ≤55 dB(A) (N-04). | meetplan r.83 |
| Ergonomische envelop vastleggen | **Deels.** Er is een tabel, maar geen CAD-envelop. | meetplan §3b |
| “PETG kan tegen aceton/75 °C” te algemeen | **Open** | README r.118 |
| Freesmaat / schakelaar / USB / TR5 | **Opgelost** | README, mallen |
| Ontbrekende `../lib/schets.mjs` | **Open.** De generator is niet reproduceerbaar uit de snapshot. | `maak-afzuiging.mjs:29` |
| Kostentotaal | **Open.** README €495,48 tegen script €502,69. | README r.102/172; `prijslijst.csv` |
| Stofarm uitnemen van de cassette | **Deels.** Er is een zak-instructie, maar geen ontwerp dat stof opvangt. | README r.31 |
| Stof versus dampen | **Opgelost als documentatie.** Het ventilatiedebiet is niet gedimensioneerd. | meetplan §2 |

## 3. Nieuwe bevindingen

| ID | Ernst | Bewijs (bestand:regel / onderdeel) | Actie | Digitaal acceptatiecriterium |
|---|---|---|---|---|
| N-01 | **Major** | Waaier bereikbaar met de vinger. Het rooster heeft 4 openingen met een ingeschreven cirkel van Ø14,6–18,3 mm (`rooster.dxf`). De cassettebodem heeft vensters van 18×18 mm (`berekeningen.py:35`). Het oog van de instroomplaat is Ø127 (`maak-afzuiging.mjs:62`), de waaier zit ±2 mm onder de plaat. Plaat en cassette zijn zonder gereedschap afneembaar. Het meetplan (r.49) toetst alleen “met de plaat erop”. | Vaste vingerbescherming in of onder de instroomplaat (spaken/rooster met openingen ≤ 8 mm, gelijmd of geschroefd). Optioneel een reed-interlock op rooster/cassette. | CAD-sweep van testvinger IEC 61032 probe B (Ø12, 80 mm) met plaat, cassette en filter verwijderd raakt de waaierenvelop niet. De extra Δp van de bescherming staat in `berekeningen.py`. |
| N-02 | **Major** | De melding “filter vervangen” bij 2× de schone meetwaarde (`regel.h:41,112`) is in de code niet aan het vangstdebiet gekoppeld; de meetplek staat stroomafwaarts van het filter (totale onderdruk). **Conditionele modeluitkomst** (`geo/alarm.py`; aannames: afgelezen fancurve, G4-referentie voor de mat met n = 1, ζ-band 0,7–1,5×, toerental ≈ PWM-stand, geen meting): debiet bij de melding 24–207 m³/h, in 20 van 21 combinaties < 190 m³/h; op 20–30 % wordt 2× onder deze aannames niet bereikt (modeldruk 609·r²). De rekenbladclaim “ruim vóór de einddrukval” (`berekeningen.py:248`) volgt niet uit hetzelfde model (filter daar 5–13× schoon). Dit is geen gemeten werking. | Drempel per stand afleiden van q = 190 m³/h, óf het debiet direct meten met een tap in de keel van het instroomoog. Geldt alleen voor standen die volgens N-03 toegestaan blijven. | Voor **elke toegestane stand** (na N-03; standen die 190 m³/h met schoon filter niet halen zijn uitgesloten of als niet-beschermend gemarkeerd) toont het script een drempel waarbij q ≥ 190 m³/h over de hele ζ-band, en een native test geeft de melding op die drempel. |
| N-03 | Major | Toegestane standen 20 % tot ±45 % (`regel.h:29`, `knop/main.cpp:39`) halen **onder de modelaannames** (zie N-02) geen 190 m³/h; daarvoor is volgens het eigen rekenblad ±49 % toerental met schoon filter nodig. PWM wordt niet naar toerental geregeld (Berekeningen §3, laatste alinea), dus de grens in PWM-% is onzeker. | Of `minPct` verhogen tot de berekende stand voor 190 m³/h (met marge voor de ζ-band en PWM→toerental), óf toerentalregeling op tacho; standen eronder uitsluiten of ondubbelzinnig als “niet-beschermend” tonen. | `minPct` ≥ berekende stand voor 190 m³/h over de ζ-band, óf een native test toont dat elke stand eronder “niet-beschermend” meldt en nooit als beschermende dagstand geldt. |
| N-04 | Major | Eisconflict geluid **onder de modelaannames** (fanwet ΔL = 50 log(n), vrije puntbron, 69 dB(A) op 1 m OEM, oor op ±0,5 m). Het meetplan G1 vraagt ≤ 55 dB(A) op het oor van de medewerker (r.83). Het eigen rekenblad voorspelt ±59,5 dB(A) op 0,5 m bij het vangstminimum en 64–66 dB(A) bij 250 m³/h. Geen meting; werkelijk niveau kan afwijken door afscherming, spectrum en ruimte. | Eis of ontwerp bijstellen: lagere eis met motivatie, of geluiddemping/stillere luchtweg toevoegen aan het model. | Het rekenblad toont dat het gekozen werkpunt binnen de gestelde geluidseis valt, met de afstandsaanname expliciet. |
| N-05 | Minor | De zachte start is per regelstap minstens 1 % door afronding naar boven (`regel.h:123`). Bij `delay(5)` (`module/main.cpp:233`) is de PWM na 250 ms 50 % in plaats van ≤ 13 %. Bij een lus van 1 ms is het 80 % na 100 ms. De brontest stapt per 250 ms en mist dit. De berekening van de aanloopstroom in §4 steunt op deze claim. | Accumulator in ‰ of float, of de regelstap begrenzen. | De test `test_zachte_start_bij_5ms_lus` / `_1ms_lus` in `qa_extra.cpp` slaagt. |
| N-06 | Minor | Koppeling: binnen 60 s overschrijft elke KOPPEL zonder bevestiging (`regel.h:245-254`). De LMK gaat in klare tekst via broadcast (`protocol.h:3-6`, `knop/main.cpp:438-443`). Een bericht uit een oudere sessie wordt aanvaard (`regel.h:260`). Eigen tests falen. | Bevestiging op de module (knop op de box), sessie-nonce of anti-replay per sessie, sleutelafleiding (bijv. ECDH) of een fysiek koppelmoment. | De twee eigen tests slagen; testgevallen voor een tweede set binnen het venster. |
| N-07 | Minor | Meting > 525 Pa (verzadiging, bijv. dichtgedrukt rooster bij boost: max. 609 Pa) telt als sensoruitval (`regel.h:80-81`). `IJK_BUITEN_BEREIK` is onbereikbaar omdat `meting()` die samples al weigert (`regel.h:86` tegenover `:200`). | Verzadiging apart behandelen; foutcode correct doorgeven. | De eigen tests `verzadiging…` en `ijkfoutcode…` slagen. |
| N-08 | Major | De klauwkracht is niet beheersbaar. Het ontwerpmoment is 0,05 Nm “met twee vingers”. Bij een aangenomen handmoment van 0,3 Nm is F = T/(K·d) ≈ 300 N (K = 0,2) en σ = 6FL/(bh²) ≈ 63 MPa in het vereenvoudigde balkmodel, boven de vloeigrens van PETG (±50 MPa). Er is geen borging tegen trillen. | Een expliciet krachtbegrenzend mechanisme ontwerpen. Een aanslag begrenst alleen de kracht als de kracht via een gedefinieerde veerweg wordt opgebouwd (bijv. schotelveren of een flexibele klauwarm tot aanslag); een harde aanslag zonder veer begrenst slechts de weg, niet de kracht. Alternatief: sterkere arm plus gespecificeerd momentgereedschap. | Rekenblad toont het mechanisme met krachtpad, veerkarakteristiek (kracht–weg), de vrije weg en tolerantieketen, de blok- en aanslagkracht en de sterkte: maximale klauwkracht ≤ 48 N (of nieuw doel) bij elk handmoment tot de aanname ≥ 0,5 Nm, en σ ≤ ½ vloeigrens in klauw, veer en moerkamer. |
| N-09 | Minor | De afdichtingszitting van de cassetterand op de richel is 1,25 mm breed (100,25 − 99). Er is 0,25 mm spleet naar het frame. Er is geen pakking gemodelleerd. | De EPDM-band (§2.2 meetplan) als onderdeel in CAD/BOM opnemen en `M.richel` aanpassen. | Assemblage met pakking: compressie 30–50 % in de nominale én de uiterste tolerantie, en een gesloten pad rondom. |
| N-10 | Minor | De Rittal-mat heeft een progressieve structuur: open stofzijde, gesloten schone zijde. De legrichting is nergens gespecificeerd (README stap 9, r.198). | Oriëntatie aangeven in tekening en instructie, met een markering in de cassette. | Tekening en bouwschema benoemen de stofzijde boven. |
| N-11 | Minor | Rekenblad-labels “f = 0,35” en “f = 0,56” staan hardgecodeerd (`berekeningen.py:47-48`). Werkelijk is het 0,311 en 0,709. README r.114 zegt “141 cm² open”, de DXF geeft 125,6 cm² boven het vak van 171 en 177,8 cm² in totaal. 52 cm² opening ligt boven de dichte cassetterand en is niet werkzaam. | Labels uit de variabelen genereren en de README-maat uit de DXF halen. | Script-uitvoer en README komen overeen met de DXF-meting op ±1 %. |
| N-12 | Minor | Documentconflicten: kosten €380,48 / €495,48 (README) tegenover €502,69 (`prijslijst.csv`, `Besparingen.md`); “nieuw filter (M5, 170×190) €0,50” (README r.174); meetplan “versie 6” en module “102 mm” / box “71 mm onder het blad” (bedoeld vanaf de bovenkant); schema 0,5 mm² tegenover 0,25 mm²; “dubbel geïsoleerd, met aarding” (Besparingen r.24, P1M is klasse I); UI “schone filters” (`knop/main.cpp:284`). | Alles uit één bron genereren. | Een grep/CI-check vindt geen tegenstrijdige waarden; de README-totalen zijn gelijk aan `prijslijst.py`. |
| N-13 | Minor | De zekering staat op 77 % van de nominale stroom bij een box van 40–51 °C. Een gebruikelijke derating is ≤ 75 % bij 25 °C. | Partnummer met een DC-derating-curve kiezen, of 4 A T onderbouwen tegen de draaddoorsnede. | Fabrikantcurve plus berekening bij de boxtemperatuur. |
| N-14 | Minor | Het acceptatiecriterium L3 (“≥ 90 % van het filterrendement”) is niet gedefinieerd voor G3 (geen ePM-waarde). | Criterium op bypass-fractie of grof-gravimetrisch. | Meetbare grootheid en grens staan vast. |
| N-15 | Info | Het thermische model hanteert 40 °C als grens bij volle last. Op 80 % stand is de adapter maar 34 % belast. Volgens de derating van de fabrikant is dat conservatief. | Derating-curve in het model gebruiken. | Model met lastafhankelijke grens. |

## 4. Wat goed is

- **Exports en geometrie zijn sterk verbeterd.** Alle 13 STL's zijn gesloten en manifold, en komen tot op 0,1 % overeen met een onafhankelijke reconstructie. In de nominale assemblage is nog maar één kleine overlap over (van de vier in v2).
- **De klauwen zijn geometrisch correct.** Er is geen interferentie bij het schuiven (blad 10–50 mm) of bij het zwaaien in het venster.
- **Gesloten maatketens:**
  - schroefdiepte van de ventilator 5,0 mm;
  - magneetbodem 0,9 mm;
  - inlaat 2 mm vrij van de waaier;
  - cassette 0,4 mm vrij van de torens.
- **Het rooster is laserbaar:** één deel, 218 openingen, geen sleuf smaller dan ±1,5 mm.
- **Er is een reproduceerbaar rekenblad** met bronnen en onzekerheidsbanden. Het vangstdoel is expliciet (Dalla Valle, flens) en het debietdoel is realistisch gemaakt (250 in plaats van 500).
- **De firmware is goed opgebouwd:** een testbaar regelhart; beide builds slagen; 16 tests slagen. De v2-fouten zijn hersteld: verouderde meting, lege ijking, UIT-voorrang, stilstandbewaking, boost-lease in de module, start in UIT.
- **Elektrisch:** de G01-fout is geschrapt. Belasting 65 % van de adapter. Er is een DC-zekeringseis en een concept zonder eigen 230 V-bedrading.
- **De documentatie is eerlijk** over de filterkeuze en de gevolgen ervan.

Ontbrekende fysieke validatie is nergens als tekortkoming gescoord.

## 5. Gebiedsscores

| Gebied | Gewicht | Score /10 | Onderbouwing |
|---|---:|---:|---|
| CAD, geometrie, passing | 15 % | 7 | Coherente maatketens en klauwsweep. Min: waaier bereikbaar (N-01), pakking niet gemodelleerd (N-09), puntuitsteek, 0,66 mm³ overlap |
| Exports en revisieconsistentie | 15 % | 8 | 13/13 STL's gelijk aan de reconstructie. Min: wezen-DXF's, generator niet reproduceerbaar |
| Luchttechniek en geluid | 20 % | 6 | Goed systeemmodel. Min: filtermelding los van het vangstdebiet (N-02), lage standen (N-03), geluidseisconflict (N-04) |
| Filtratie en stofbeheersing | 15 % | 3 | Exacte keuze, maar geen aangetoonde afdoende fijnstofbescherming, geen pakking, geen buitenafvoer of ventilatiedimensionering, legrichting niet vastgelegd |
| Elektrisch en thermisch | 10 % | 7 | Coherent. Min: zekeringpart/derating, draaddoorsnede-conflict, USB-flashen onzeker |
| Firmware | 10 % | 6 | Builds en tests OK. Min: zachte start, koppeling/replay, verzadiging en foutcode, de alarmlogica uit N-02 |
| Ergonomie | 5 % | 7 | Compacte inbouw, knop en kniehoogte gedocumenteerd. Min: puntuitsteek in de dijzone, geen CAD-envelop |
| Onderhoud | 5 % | 6 | Zak-procedure, kant-en-klare mat zonder knippen, uitkloppen geschrapt. Min: geen stofdicht uitnemen, legrichting, waaier bereikbaar bij het wisselen |
| Documentatie | 5 % | 5 | Veel en grotendeels consistent. Min: N-11/N-12 en claims die niet volgen uit het eigen model |

**Gewogen totaal: 6,1 / 10**

Berekening: (7·15 + 8·15 + 6·20 + 3·15 + 7·10 + 6·10 + 7·5 + 6·5 + 5·5) / 100 = 610/100.

## 6. Top-5 ontwerpacties

1. **Beschermingsconcept kiezen en uitwerken (filtratie, N-09/N-10).**
   - **Optie A, G3 houden:** ventilatiedebiet van de salon dimensioneren en de retourlucht weg van de benen richten. Laagste kosten en geluid; een grofstoffilter is echter geen aangetoonde afdoende fijnstofbescherming (efficiëntie op fijnstof zonder meetdata onbekend).
   - **Optie B, F7-minipleat (48 mm) in de module:** volgens het eigen rekenblad (modeluitkomst) 70–77 % toerental voor 250 m³/h, ±3–4 dB luider. Module ±31 mm dieper (68 → ±99 mm onder het blad), conflict met de knieruimte.
   - **Optie C, buitenafvoer:** geen recirculatie; wanddoorvoer, compensatielucht en warmteverlies.
   - **Optie D, groter filteroppervlak of externe filterbox** (bijv. H13- of F9-element met groter front in een aparte kast onder het blad of op de vloer, gekoppeld via een kanaal): drukval daalt grofweg met het frontoppervlak, ten koste van ruimte, kanaalverlies en kosten. Alleen als optie te kiezen met een berekende systeemkromme.
   - De in het rekenblad doorgerekende H13-configuratie (Freudenberg SF13 305×305×150, past niet in de module) valt onder het eigen model af (±197 m³/h bij 100 %). Dat geldt voor díe configuratie, niet voor H13 als concept.
   - *Digitaal criterium:* het rekenblad bevat voor de gekozen optie de filterklasse met bron, werkpunt schoon en beladen ≥ 190 m³/h over de ζ-band, vangst op 10 cm, geluid op de oorposities en (bij D) kanaalverliezen; CAD/BOM bevatten het gekozen filter, de pakking (N-09) en de legrichting (N-10).
2. **Filtermelding en standen aan het vangstdebiet koppelen (N-02/N-03).**
   - **Goedkoop:** modelmatige drempel per toegestane stand; standen onder het minimumdebiet uitsluiten of als niet-beschermend tonen.
   - **Robuuster:** een tap in de keel van het instroomoog als debietmeter (één extra tap en een kalibratiecoëfficiënt).
   - *Digitaal criterium:* zie de acceptatiecriteria van N-02 en N-03 (alleen toegestane standen).
3. **Vingerbescherming waaier (N-01).**
   - **Vast rooster op het oog:** geschat extra Δp ±5–9 Pa bij ±5,5 m/s (ζ ≈ 0,3–0,5, aanname); kan niet vergeten worden.
   - **Reed-interlock:** geen Δp, maar de waaier loopt nog uit, dus alleen als aanvulling.
   - *Digitaal criterium:* zie N-01 (CAD-sweep probe B met afneembare delen verwijderd, Δp in het rekenblad).
4. **Afdichting en klauwkracht in de CAD (N-09/N-08).**
   - Pakking als onderdeel met compressiestudie.
   - Een krachtbegrenzend klauwmechanisme met expliciet krachtpad: een veerelement (bijv. schotelveren of flexibele arm) dat de kracht over een gedefinieerde weg opbouwt tot een aanslag. Een aanslag of schotelveer is pas krachtbegrenzend als kracht–weg, vrije weg en sterkte zijn aangetoond.
   - *Digitaal criterium:* zie N-09 (compressie 30–50 % in nominaal en uiterste tolerantie) en N-08 (kracht–weg, aanslagkracht en sterkte, maximale klauwkracht ≤ doel bij elk handmoment tot ≥ 0,5 Nm).
5. **Firmware en documentconsistentie (N-05–N-07, N-11–N-12).**
   - Accumulator voor de zachte start, anti-replay en koppelbevestiging, verzadigingsstatus, en de eigen tests opnemen.
   - Generator reproduceerbaar maken (`lib/schets.mjs` meeleveren) en de wezen-DXF's verwijderen.
   - *Digitaal criterium:* de 8 tests uit `[eigen onderzoeksmap]/qa_extra.cpp` plus de 16 brontests slagen; `node maak-afzuiging.mjs` draait uit de snapshot en levert byte-gelijke of volume-gelijke (±0,1 %) exports; geen tegenstrijdige waarden volgens N-11/N-12.

**Prototypevalidatieplan (ongescoord, latere fase)**
1. Debietcurve Q–Δp tegen PWM en toerental, schoon en beladen. Het debiet bij de filtermelding nagaan.
2. Vangst met rook en anemometer op 10/15 cm, met handen en frees.
3. Lekkage langs de pakking na herhaalde wissels.
4. Geluid op de beide oorposities.
5. Proef met testvinger zonder plaat en cassette.
6. Klauw: uittrek- en kruipproef bij het werkelijke handmoment.
7. Temperaturen in de box bij boost en dagstand.
8. Foutinjectie in de firmware op hardware: verzadiging, radio, koppelen.
9. Stofwolk bij het wisselen.
10. Ergonomie 1:1 met beide gebruikers.

## 7. Verworpen of ongefundeerde claims en grenzen van de conclusies

Alle getallen hieronder uit `geo/alarm.py` en het rekenblad zijn **conditionele modeluitkomsten** onder de genoemde aannames (afgelezen fancurve, G4-referentie voor de mat, ζ-band 0,7–1,5×, toerental ≈ PWM, fanwet en vrije puntbron voor geluid). Het zijn geen gemeten werking en geen bewezen onhaalbaarheid buiten die aannames.

**Verworpen (niet consistent met het eigen model of de bronbestanden)**
- “Filter vervangen ruim vóór de einddrukval, ±100 Pa bij 250 m³/h.” Gemeten wordt de totale onderdruk stroomafwaarts; onder de modelaannames valt de melding bij ±180 Pa meetwaarde, met een filter van 5–13× schoon.
- “Zachte start 50 %/s (getest).” Alleen waar bij stappen van 250 ms; bij de lus van 5 ms uit `module/main.cpp` faalt de eigen test.
- “Waaier niet bereikbaar met de plaat erop” als veiligheidscriterium: afneembare delen horen verwijderd te zijn.
- “141 cm² open boven de cassette.” De DXF geeft 125,6 cm².
- “Kostentotaal €495,48.” Het script geeft €502,69.
- “Dubbel geïsoleerd” voor een adapter van klasse I.

**Ongefundeerd of aanname**
- De drukval van de Rittal-mat (G4-referentie) en de fijnstof-efficiëntie ervan: niet gepubliceerd en niet gemeten; geen nul-efficiëntie verondersteld.
- De koppeling tussen PWM en toerental.
- Zeta-waarden voor de instroom, de lamellen en een eventuele vingerbescherming.
- Het M8-contact van 4 A (niet nagekeken).
- Of ESP-NOW onversleutelde frames van een versleutelde peer weigert: **onzeker**.
- Of terugvoeding via de USB van de ESP32-C3 bij flashen kan optreden: **onzeker**, hangt af van de diode op de module.

**Niet beweerd**
- Geen gemeten blootstelling of filterrendement, geen bewezen wettelijke overschrijding, geen hardwaregedrag.
- De 0,66 mm³-overlap kan een bedoeld contact zijn.
- Mijn reconstructie is geen officiële kernel. Schroefdraad en toleranties zijn alleen nominaal of als sweep onderzocht. De klauwsweep dekt alleen de moduleklauw, niet de knopklauw.
- De score betreft ontwerpmaturiteit, geen productvrijgave.
