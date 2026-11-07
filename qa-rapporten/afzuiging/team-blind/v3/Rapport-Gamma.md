# Onafhankelijk ontwerp-QA-rapport v3

## 1. Scope, zelfstandig uitgevoerd onderzoek, bewijs en beperkingen

Beoordeeld is de engineeringmaturiteit van `/workspace/afzuiging/src-v3/`, niet de vrijgave van een gebouwd apparaat. Opdrachtkader: `CASUS-v3.md` en `FORMAAT-v3.md`. Het aangewezen eindverslag v2 is uitsluitend gebruikt als lijst van oude bevindingen; andere teamrapporten zijn niet gelezen. Er is niemand gecontacteerd.

**Oordeel: 6,25/10.** De productiegeometrie en STL-topologie zijn aantoonbaar verbeterd. De ontwerpketen sluit echter nog niet: de voorgestelde pakking ontbreekt in de uitgewerkte geometrie, de berekende toerentalstanden zijn geen geïmplementeerde toerentalregeling, de filtermelding borgt het minimumdebiet niet en de zachte start voldoet bij de werkelijke lusfrequentie niet aan haar eigen specificatie. De exacte grove mat is een ventilatorbescherming, geen fijne-stof- of dampbeheersing.

### Uitgevoerd

- Eigen onderzoekskopie gemaakt in `[eigen onderzoeksmap]/`. Bronverwijzingen hieronder zijn relatief aan `src-v3`, tenzij anders vermeld.
- Alle 13 STL-typen gecontroleerd met Trimesh: driehoeken, randincidentie, winding, volume, verbonden componenten en bounding boxes. Geen automatische meshreparatie toegepast.
- Een eigen lezer voor KCAD-schetsen, lijnen, cirkels, bogen, boss/cut, tweede extrusierichting, ronde verzinkingen en componenttransformaties gemaakt; reconstructie met Manifold3D. **76 van 77 assemblagecomponenten** opgebouwd. De niet-cirkelvormige tapsheid van de voedingsbox wordt door deze eigen lezer niet ondersteund. Dit is een beperking van het onderzoek, geen aangetoonde CAD-fout.
- Relevante AABB-paren van die 76 componenten op solidintersectie onderzocht; geen snijvolume boven 0,02 mm³ gevonden. Twaalf printtypen ook onafhankelijk gereconstrueerd en op volume met de aangeleverde STL vergeleken: afwijkingen kleiner dan 0,08%. Volumeovereenkomst is geen formeel bewijs van volledige vormgelijkheid.
- DXF gelezen met ezdxf: 219 polylijnen, geen auditfouten. De 218 uitsnijdingen onafhankelijk met Shapely verwerkt. Staalpolygon geldig, één samenhangende plaat; open oppervlak boven 171 × 171 mm: **125,5946 cm²**.
- Berekeningsgenerator op de kopie uitgevoerd: `Berekeningen.md` reproduceert inhoudelijk exact; alleen CRLF/LF verschilt. Daarnaast afzonderlijk vangstsnelheid, drukposten, werkpunt/alarmscenario's, regelafronding, kabelverliezen, klauwbelasting en laseroppervlak nagerekend.
- Beide firmwaretargets daadwerkelijk gebouwd met PlatformIO op de kopie: **knop SUCCESS, module SUCCESS**. Er zijn narrowing-waarschuwingen in de gebruikte grafische bibliotheek; geen waarschuwingvrije build geclaimd.
- `pio test -e native` geprobeerd: **niet uitgevoerd**, omdat `g++` ontbreekt. Installatie van de hostcompiler mislukte door repository-/netwerkfouten. De meegeleverde claim van 16 geslaagde tests is daarom niet als eigen testresultaat overgenomen. De hieronder genoemde extra regeluitkomsten zijn transparante rekenreproducties van de C++-expressies, geen uitgevoerde C++-hosttests.
- Afbeeldingen bekeken: het rooster, UI-overzicht en gerasterde doorsnede, cassettetekening en tafelbladtekening. Beide technische PDF's naar tekst omgezet en instructies gecontroleerd.
- Het officiële Rittal-datablad opgehaald en gelezen: [SK 3171.100](https://www.rittal.com/pdf-creator/variant/com-en/3171100). Het bevestigt 173 × 173 × 17 mm, G3 / ISO Coarse 50%, progressieve vezelstructuur, voorgeschreven luchtzijde en F1-zelfdovendheid van de mat. Het verstrekt geen zelfstandige drukcurve voor de huidige toepassing.

### Reproduceerbaar bewijs

Onder `[eigen onderzoeksmap]/` staan `audit.py`, `mesh.json`, `audit.log`, `reconstruct.py`, `cad.json`, `overlaps.json`, `reconstruct.log`, `numeric_checks.py`, `numeric.log`, `extra_checks.py`, `extra.log`, `build.log`, `native.log`, `changes.json`, `source-hashes.json`, de gerasterde tekeningen en `rittal.pdf`/`rittal.txt`. Opdrachten:

```sh
cd [eigen onderzoeksmap]
venv/bin/python -B audit.py
venv/bin/python -B reconstruct.py
venv/bin/python -B numeric_checks.py
venv/bin/python -B extra_checks.py
cd source/firmware
../../venv/bin/pio run -e knop -e module
../../venv/bin/pio test -e native
```

De 114 aangeleverde bronbestanden zijn niet aangepast. Bij een vroege Python-import ontstond tijdelijk een bytecode-cache naast de bron; uitsluitend die eigen bijvangst is verwijderd en vervolguitvoering gebruikt de kopie en `-B`.

**Grenzen:** geen officiële CAD-kernelherbouw, geen volledige tolerantiesweep of klauwbewegingssweep, geen koperlayout-/netlistcontrole en geen hardware-uitvoering. Tessellatie gebruikt circa 0,4 mm boogsegmenten en ten minste 40 cirkelsegmenten. Exacte raakvlakken en zeer kleine interferenties blijven daardoor onzeker. Geen scoreaftrek wegens ontbrekende fysieke proeven.

## 2. Wijzigingen sinds v2 en matrix van alle oude bevindingen

De vergelijking met de oude bron toont 95 nieuwe of gewijzigde bestanden. Hoofdwijzigingen zijn de vierkante standaardmatcassette, kortere romp/fanplaatsing, complete nieuwe STL's, dikkere magneetpocketbodem, dieper verzonken fanboutkoppen, nieuw rekenblad en een gescheiden regelhart met peer-koppeling en tests.

| Oude bevinding uit eindverslag v2 | Status | Zelf gecontroleerd bewijs / resterend werk |
|---|---|---|
| Romp CAD/STL 99/114; cassette 22/37 | Opgelost | Actueel CAD/STL romp 96 mm, cassette 19 mm; `maak-afzuiging.mjs:40,49`, `mesh.json`, reconstructie. README bevat nog 99 mm. |
| Vier ongeldige oorspronkelijke STL's | Opgelost | Alle 13 typen watertight, winding consistent, positieve volumes, één lichaam en nul randen met incidentie ≠2. |
| Ontbrekende deksel, klauw, knopklauw en adapterklem | Opgelost | Alle vier aanwezig en topologisch geldig. |
| Oude filters/stalen klauwen/M3-knopvarianten in maakpakket | Deels | Hoofd-BOM en CAD zijn bijgewerkt; README:174 noemt nog M5 170 × 190 en README:200 schrijft nog schroeven voor bij de nu geklemde USB-print. |
| Oude breedtemaat 229 en onderhang 86 | Opgelost / genuanceerd | Actuele onderhang 68 mm bij blad 34. **229 mm is nu niet zomaar fout:** uitgezwaaide klauwen lopen tot ±114,5; het staal zelf is 222 mm. Totale hoogte 106 = 102 onder tafelreferentie + 4 erboven. |
| Hoofdmaatketens, binnenmaten en fanpassing | Opgelost nominaal | Romp 210/uitsparing 212, frame 222, cassette buiten 174,2/binnen 171, rand 200,5/opening 201; cassette/inlaat 3 mm en inlaat/fan 2 mm. Geen algemene botsingsramp. |
| Magneetpocket laat 0,4 mm bodem | Opgelost | `maak-afzuiging.mjs:64–65`: 2,5−1,6 = 0,9 mm; Ø8,2-pocket voor Ø8 × 1,5-magneet. Lijmtype blijft generiek. |
| Moerkamerdaken 1,8/1,6 mm en klauwkracht onberekend | Deels | `berekeningen.py:168–178` levert 48/31,25 N en 0,048/0,025 Nm. Rekenen klopt voor het vereenvoudigde model; materiaal-/kruipwaarden en lokale doorsneden niet onderbouwd. |
| M4×65-knopbout steekt circa 1 mm uit | Open | Reconstructie: boutpunt Y−63, deksel tot Y−62. Normdeelmodel gebruikt geen echte buitendraadenvelop; eindstand en gatspeling nog specificeren. |
| Fanbout indraaiing exact op ondergrens | Deels | `maak-afzuiging.mjs:306–320`: kopkamer 1 mm geeft nominale 5 mm, rekenband 4,6–5,4. Nog geen keten met zitting-, print- en werkelijke normdeeltoleranties. |
| Draagconcept frame/honingraat/ankers ontbreekt | Deels | Frame draagt gewicht; momenten en nominale klauwkrachten benoemd. Geen gekozen deurplug met rating in 3mm-huid, geen uitgewerkt huid-/frame-/lijmsterktemodel; `Berekeningen.md:94–98`. |
| Vier kleine overlapkandidaten | Deels / onzeker | Geen >0,02 mm³ bij de gereconstrueerde componentparen, waaronder knop/naafschroeven/USB. Voedingsbox niet onafhankelijk herbouwd; het oude box/PCB-kandidaat niet afgetekend. Officiële kernelcontrole blijft nodig voor exacte contacten. |
| Geen volledige toleranties/klauwzwaai | Open | Positieve nominale spelingen zijn geen worst-case-passing. Cassette-toren slechts 0,4 mm per zijde, rand-opening 0,25 mm per zijde; geen expliciete functionele tolerantiesweep. |
| Ongestaafd werkpunt 500 m³/h | Deels | Ontwerpdoel nu 250 schoon / 190 minimaal; verliezen en fanwetmodel aanwezig. Exacte SK3171-drukcurve ontbreekt; G4-surrogaat is geen gegarandeerde bovengrens. |
| PWM, RPM, debiet en geluid verward | Deels | Documentatie onderscheidt ze expliciet; firmware gebruikt nog rechtstreeks PWM. De getalsmatige brug naar gekozen werkstanden ontbreekt. |
| Geen coherente geluidraming | Deels | Fanwet en afstand nu correct als aanname genoemd; berekend doel vraagt al 57–60 dB(A) op 1 m, tegenover gewenst ≤55 dB(A) bij het oor. Geen sluitende ontwerpcombinatie. |
| M5 als enige retourlucht-eindtrap | Open in beschermingsfunctie; keuze verduidelijkt | Nu nog grover G3 / ISO Coarse 50%. Eerlijk benoemd als ventilatorbescherming, maar terugvoer van fijn stof blijft bestaan; geen uitgewerkt aanvullend ventilatie-/afvoerontwerp. |
| Deeltjesfilter niet geschikt voor dampen | Deels | Expliciet erkend in `Vrijgave-en-meetplan.md:27–47`; “goed ventileren” bevat nog geen ontwerpdebiet, emissie-/SDS-grenzen of afvoerroute. |
| Geen pakkingpad/compressie/retentie | Open | EPDM 3 × 9 mm en 30–50% genoemd als nog uit te voeren wijziging (`Vrijgave-en-meetplan.md:41–43`); CAD blijft randonderkant/richelbovenkant Y0 zonder pakkingruimte. |
| G01 ongeschikt voor 90W-adapter | Opgelost | README:60 sluit 93,6W-G01 expliciet uit; S01 is gekozen. |
| Zekering/DC-rating/afschakelcurve onvoldoende gekozen | Deels | Eisen ≥32 V DC en voldoende afschakelvermogen benoemd; nog geen bestelnummer/curve/coördinatie. De claim dat zachte start de zekering bewijst is onjuist. |
| Werkelijke M8-aders/connectorrating/foutlus | Deels | Nominale 0,25mm²- en 4A-berekening aanwezig, rekenkundig plausibel. Geen exact kabel-/connectorartikel met aders, contactweerstand en DC-gegevens; geen complete foutlus. |
| 5V-budget/USB-C/terugvoeding/layout | Deels | Pololu, CC-weerstanden en nominaal budget aanwezig. Schema noemt maximaal 0,35 A voor C3 alleen; rekenblad neemt daarvoor 0,5 W. Module-flashroute is niet uitgewerkt op terugvoeding. Geen fictieve creepage-afkeuring afgeleid uit componentblokken. |
| Warmte-/deratingbegroting ontbreekt | Deels | Wand-/schoorsteenmodel aanwezig. Rendement 88% en fanvermogen ∝RPM³ aannames; PWM/RPM-brug, transienten, omgevingband en herhaalboost ontbreken. “PETG blijft onder 60°C” volgt niet als harde garantie. |
| Oude drukwaarde na sensoruitval | Opgelost voor hoofdpaden | `regel.h:78–94,128–144`: versheid, foutenteller, NAN; module:190–200 herstart. Geen hardwaretest geclaimd. |
| IJking zonder samples toch geldig | Opgelost voor hoofdpaden | `regel.h:177–215` verlangt samples, druk en toerental; oude ijking wordt pas na volledige reeks vervangen. |
| UIT tijdens ijken / lage standen niet bewaakt | Opgelost voor hoofdpaden | `regel.h:60–64,118`: directe annulering en tacho op alle actieve doelen. Nieuwe voortgangs- en stabilisatieproblemen: zie §3. |
| Broadcast zonder koppeling, alleen knopboosttimer | Deels | Versleutelde unicast, MAC en volgnummers, moduleboostlease aanwezig. Koppelvenster kan bestaande koppeling overschrijven; onbeveiligde sleuteluitwisseling en ongebonden bevestiging blijven. |
| Opgeslagen AAN bij boot; UI versus bevestiging | Deels | Knopboot nu UIT, status komt uit module. UIT betekent nog PWM=0, niet rotor stil of geïsoleerd; verbindingsverlies toont lokaal UIT zonder bevestiging. Selectieve modulereset krijgt bovendien opnieuw de periodieke AAN-opdracht van de knop. |
| Actief uitkloppen en stofarme wissel ontbreken | Deels | Actief “niet uitkloppen”, zak, handschoenen en FFP2 ingevoerd in UI/README. Geen uitgewerkte stofopvang bij de open cassette of onderhoudsisolatie vóór verwijderen rooster/filter. |
| Materiaal-/epoxy-/reinigingskeuze te algemeen | Open | README:118 en :87 blijven generiek PETG/PETG-CF, acetonbestendigheid en epoxy noemen; geen exact materiaal-/lijm-/reinigingscompatibiliteitsdossier. |
| Ergonomische hand/knie/kabel/uitblaasenvelop ontbreekt | Deels | Concrete werkplektabel toegevoegd, inclusief handhoogte en buigradius. Afzonderlijk bureaumodel ontbreekt in deze snapshot; kabel/stoel/armsteun niet als volledige CAD-envelop aanwezig. |
| Boxfreesmaat/schakelaar/USB-datum/TR5 tegenstrijdig | Deels | Boxfreesmaat nu 212 × 102 en schakelaar voorwand/TR5 coherent. USB-print geklemd in model, nog geschroefd in README:200; USB-hoogtereferentie README:201 onjuist benoemd. |
| Reproduceerbare generatorroot ontbreekt | Open binnen geleverd pakket | `maak-afzuiging.mjs:29` vraagt `../lib/schets.mjs`, niet meegeleverd. Dit bewijst geen fout van de oorspronkelijke projectroot; volledige generatierun niet zelfstandig reproduceerbaar uit alleen deze snapshot. |
| Prijsindicatie geen totale geverifieerde kost | Deels | Actueel overzicht 380,48 + 55 + 60 = 495,48 klopt; README:174 bevat achterhaalde filtermaat/prijs. Geen actuele marktprijsverificatie geclaimd. |

## 3. Nieuwe bevindingen en resterende ontwerpgebreken

### N01 — Major — Pakking is een plan, geen uitgewerkt afdichtingsontwerp

**Bewijs:** `Vrijgave-en-meetplan.md:41–43` schrijft “lager te zetten”; `maak-afzuiging.mjs:49–50,145–147,262–263` houdt de oplegrichel op Y0 en de rand van Y0 tot Y2,5, gelijk met het frame. Een 3mm-band bij 30–50% compressie vraagt **1,5–2,1 mm** resterende dikte. Daarvoor is nu geen gecontroleerde inbouwhoogte, ononderbroken 9mm-breed steunpad, magneetklemmingsbudget of tolerantieketen gemodelleerd. Een eventuele band bovenop de bestaande opleg verhoogt de cassette en kan het rooster optillen. Alleen `M.richel.dikte` aanpassen verplaatst bovendien niet automatisch alle betrokken datumvlakken.

**Actie:** pakking als onderdeel en bemaat sluitvlak opnemen; cassette, filter, rand, torens en rooster gezamenlijk aanpassen. Geef ook de compressie-/tolerantie-eigenschappen van de 173mm-mat in het 171mm-vak op; het CAD-filter is nu slechts 170,5 mm breed (`:280–283`).

**Digitaal acceptatiecriterium:** doorsnede en worst-case-maatketen tonen rondom 30–50% compressie zonder hard contact vóór afdichting, zonder roosteroplichting en met berekende retentie; BOM bevat een exact pakkingtype. Het drukverschil en alle lekpaden zijn expliciet begrensd.

### N02 — Major — Zachte start is afhankelijk van lusfrequentie en viermaal te snel in de nominale lus

**Bewijs:** `regel.h:120–124` rondt elke stap omhoog met `(dt*50+999)/1000`; `module/main.cpp:233` wacht 5 ms. Bij dt=5 ms komt er **iedere stap 1 procentpunt** bij: 80% na circa **0,40 s**, niet na minstens 1,60 s. Bij dt=250 ms, zoals de bestaande tests, valt dit veel minder op. `numeric.log` reproduceert die integerexpressie. `test_regel.cpp:208–219` toetst uitsluitend een 250ms-stap.

**Actie:** fractionele voortgang behouden of de toegestane stand uit verstreken tijd sinds een doelwijziging berekenen. Verwijder de zekeringgarantie die enkel op PWM-oploop steunt: PWM is geen stroommeting.

**Digitaal acceptatiecriterium:** uitvoerbare tests met dt=1/5/10/250 ms en jitter tonen over elk tijdvenster stijging ≤50 procentpunten/s plus maximaal één kwantisatiestap, directe daling en UIT; apart berekende aanloopstroom/I²t versus gekozen zekeringcurve.

### N03 — Major — RPM-berekeningen zijn niet verbonden met de PWM-firmware

**Bewijs:** `Berekeningen.md:38,46–56,82–90` behandelt werkstanden en vermogen als werkelijk toerental. `module/main.cpp:59–62,203–212` zet het percentage direct om in PWM; tacho wordt alleen gelezen. Er is geen RPM-setpoint, terugkoppellus of geselecteerde PWM–RPM-map. De ijking meet alleen druk per PWM-punt. Een grens van 80% PWM bewijst dus niet de aangenomen warmte bij 80% RPM, evenmin het bijbehorende geluid/debiet.

**Actie:** kies een echte toerentalregeling of een gedocumenteerde OEM-gebaseerde map met onzekerheidsband en vertaal alle grenzen consequent. Maak een conservatief elektrisch model dat niet afhankelijk is van een onbewezen mapping.

**Digitaal acceptatiecriterium:** dezelfde grootheid en eenheid in UI, protocol, regelaar en berekeningen; tests tonen RPM-doelbereik bij gemodelleerde fanbelasting en foutgedrag, of een expliciet begrensde PWM–RPM-map. Warmte-/lucht-/geluidstabellen opnieuw afgeleid uit die implementatie.

### N04 — Major — “Filter vol” is geen minimumdebietbewaking en meet niet alleen filterweerstand

**Bewijs:** `schema/maak-schema.mjs:210–211` vergelijkt kamerdruk met het plenum **onder** filter en rooster. `regel.h:110–113` vergelijkt deze druk met de schone waarde bij dezelfde PWM. Dat omvat instroom-/roosterinvloeden, handafdekking en veranderend debiet. Verdubbeling is niet gelijk aan verdubbeling van de filterweerstand bij constant debiet.

Een onafhankelijk scenario met precies de aangenomen fanpunten en verliesposten geeft bij **60% werkelijk RPM** schoon circa **241 m³/h**, bovenstroomse druk 84 Pa; verdubbeling van die gemeten druk treedt pas op rond **104 m³/h**, oftewel circa **0,27 m/s op 10 cm**. Bij 80% RPM ligt die alarmgrens rond **179 m³/h**, nog onder het doel 190. Dit zijn modeltegenvoorbeelden, geen gemeten toestelwaarden. Ze ontkrachten wel de logische garantie van het huidige alarm.

**Actie:** onderscheid druktrend, verstopping, slangfout en onvoldoende bronvangst. Ontwerp een debiet-/minimum-RPM-/onderhoudsgrens die in een schoon-tot-beladen model de 190m³/h-grens vóór is. Toon “bewaking onbekend” wanneer de referentie buiten het meetbereik valt.

**Digitaal acceptatiecriterium:** deterministische sweep over filterweerstand, handocclusie, lekken en standen toont alarm vóór Q<190 voor iedere toegelaten werkstand, of markeert de stand expliciet als niet geschikt voor behandeling. Geen percentage “filtervolheid” als onbewezen massafractie presenteren.

### N05 — Major — Beschermingsconcept verplaatst fijn stof zonder aanvullende ontwerpgrens

**Bewijs:** het officiële filterdatablad specificeert een elektronicakastfilter met grove klasse en filtering vanaf circa 10 µm, geen gedocumenteerde fijnstof-/MPPS-prestatie voor deze toepassing. `Vrijgave-en-meetplan.md:27–47` erkent retour van fijn stof en dampen, maar vult dit slechts aan met “goed geventileerd” en buitenafvoer als latere optie. Er is geen ontwerp-massabalans, gekozen buitenluchtdebiet, uitstootroute of afgebakende product-/SDS-toepassingsenvelop. De grof-filterkeuze kan als ventilatorbescherming worden gerespecteerd, maar vervangt geen beschermingsontwerp voor de ruimte.

**Actie:** expliciet kiezen tussen een uitsluitend grofstofopvangend hulpmiddel met uitgewerkte aanvullende ventilatie, geschikte buitenafvoer, of een passende fijnstofeindtrap. Dampen afzonderlijk behandelen. Leg toegelaten middelen, hoeveelheden en afstand tot ontstekingsbronnen vast; zonder gegevens geen ATEX- of explosieveiligheidsclaim.

**Digitaal acceptatiecriterium:** functionele specificatie noemt geen onbewezen fijne-stofbescherming; gekozen lucht-/afvoerconcept heeft debiet, toevoer, uitblaaslocatie en brontermen of conservatieve ontwerpscenario's. Een middelen-/SDS-matrix bevat damp-, reinigings- en ontstekingsbeperkingen. Geen fysieke meetreeks vereist om dit ontwerpbesluit te sluiten.

### N06 — Major — Thermische borging is niet sluitend bij herhaalboost en onzeker vermogen

**Bewijs:** `regel.h:70` zet bij elke nieuwe boost de eindtijd opnieuw 120 s vooruit, ook tijdens een lopende boost; er is geen afkoeltijd of cumulatief budget. Herhaalde verzoeken kunnen zo vrijwel continu 100% geven. `berekeningen.py:137,149–164,282–290` bevat alleen stationaire berekeningen op één omgevingstemperatuur, met vaste rendementen en RPM³. De adapter zit bij 100% in dit model op 40–51°C omgeving; de stellige PETG-grens volgt niet uit een hotspot- of transientmodel. Een overschrijding van de grens voor **vol** adaptervermogen bewijst overigens niet dat de adapter bij 58W meteen ongeschikt is: de echte deratingcurve moet worden gebruikt.

**Actie:** dimensioneer voor herhaalbaar continu maximum, of introduceer aantoonbaar begrensde boostenergie/afkoelbeleid. Bereken op actuele adapterderating, elektrische inputbanden, kameromgeving en exacte belaste materiaal-/lijmgrenzen.

**Digitaal acceptatiecriterium:** model en tests voor eindeloos herhalen, radioverlies, warme start en stroomherstel tonen dat de gekozen elektrische/thermische grenzen niet afhankelijk zijn van incidenteel gebruikersgedrag. Documenteer conservatieve steady state of een onderbouwd transientmodel; geen ongefundeerde absolute temperatuurclaim.

### N07 — Major — Koppeling kan binnen het venster ongemerkt worden overgenomen

**Bewijs:** `regel.h:245–253` overschrijft MAC en sleutel bij iedere vraag in de eerste 60 s, óók als de module al gekoppeld is. `protocol.h:3–6` verstuurt de sleutel per onbeveiligde broadcast. `knop/main.cpp:101–108` accepteert een KOPPEL_OK van iedere module zonder nonce of bewijs dat die dezelfde vraag heeft ontvangen. Twee gelijktijdig ingeschakelde sets zijn dus niet afdoende getest door `test_regel.cpp:232–242`: daar arriveert de tweede koppelvraag pas na 70 s.

**Actie:** een bestaande koppeling alleen na expliciete lokale koppelhandeling wijzigen; antwoord aan unieke vraag/set binden. Definieer wat de sleuteluitwisseling wel en niet beveiligt. Controleer peer-aanmaakresultaten en opruimen van de oude peer.

**Digitaal acceptatiecriterium:** toestandsmachine-/hosttests met twee knoppen en twee modules tijdens hetzelfde 60s-venster kunnen geen bestaande pairing wijzigen zonder expliciete handeling; vreemde/vertraagde bevestigingen en oude sessies worden geweigerd. Gewone opdrachten blijven alleen voor de bedoelde set geldig.

### N08 — Minor — IJkvoortgang is altijd nul; oude alarmen kunnen tijdens stabilisatie blijven staan

**Bewijs:** `regel.h:137` begrenst de verstreken tijd eerst op 100 en deelt pas daarna door 40.000: `100*100/40000 = 0`. Tijdens ijken wordt dus 0% teruggestuurd. `:110–117` wist bij een andere actieve stand de oude `vol`/`geenLucht` niet zolang de meting vers en de ijking geldig is; gedurende de 6s-stabilisatietijd kan het oude resultaat als actueel blijven verschijnen.

**Actie:** eerst het percentage berekenen, dan begrenzen; status op “stabiliseren/onbekend” zetten na iedere referentiewijziging.

**Digitaal acceptatiecriterium:** tests op 0/8/20/32/40 s leveren passende oplopende voortgang; een standwisseling kan geen oude filterbalk/geen-luchtmelding aan een nieuwe drukwaarde koppelen.

### N09 — Major — Elektrische selectie en foutcoördinatie blijven specificatiewerk

**Bewijs:** README:79 benoemt alleen TR5 3,15 A; `Berekeningen.md:68` zegt nog “kies een type”. M8-kabel en schakelaar blijven generiek. `schema/maak-schema.mjs:137` noemt voor C3 tot 0,35 A op 5 V, terwijl `berekeningen.py:139` daarvoor slechts 0,5 W rekent. Dat maakt het gepresenteerde piekbudget intern inconsistent, zonder te bewijzen dat de 1A-buck te klein is. USB-C-VBUS wordt permanent aangeboden met CC-weerstanden; bescherming/terugvoeding bij moduleflashen is niet uitgewerkt.

**Actie:** exacte fuse, kabel, connector en schakelaar kiezen; DC-ratings, aanloop-/kortsluitgedrag, 5V-pieken en flashvoeding coördineren. Leg een laagspannings-bedradings-/padplan en trekontlasting vast; geen willekeurige 230V-creepage-eis op de eigen 24V-print plakken.

**Digitaal acceptatiecriterium:** BOM bevat bestelbare typen en datasheets; rekenblad gebruikt één consistent maximumbudget. Kortsluiting van iedere aftakking en externe USB-voeding hebben een aantoonbaar begrensd pad binnen draad-/connector-/regelaarwaarden en geselecteerde tijd-stroomcurven.

### N10 — Major — Filterwisselprocedure maakt de rotor toegankelijk zonder expliciete isolatiestap

**Bewijs:** README:31,198,258 beschrijft rooster verwijderen en cassette uitnemen zonder vooraf UIT, fysieke voedingsisolatie of uitloopcontrole te eisen. De netstekkerinstructie op :260 geldt uitdrukkelijk voor openen van de box. Een filter beschermt de hand alleen zolang het aanwezig is; na uitnemen ligt de Ø127-luchtweg boven de fan open. `regel.h:129` bevestigt PWM, geen rotorstilstand. Een draadloze UIT of schermtekst is geen onderhoudsisolatie.

**Actie:** voeg vóór rooster/filterverwijdering een eenduidige isolatie-/uitloopprocedure toe of ontwerp een passende vergrendeling. Werk een sluitbare opvang-/zakroute voor de geperforeerde cassette uit; alleen het oude filter in een zak doen beheerst achterblijvend los stof niet volledig.

**Digitaal acceptatiecriterium:** onderhoudsvolgorde bevat veilige stop, fysieke isolatie, gedefinieerde stilstandvoorwaarde en afgeschermde stoftransfer; alle UI-/README-/bouwinstructies zijn consistent. CAD toont de onderhoudstoestand en afscherming, of schema en statemachine documenteren de gekozen interlock.

### N11 — Minor — Functionele toleranties, bevestiging en materiaalwaarden zijn nog niet toetsbaar gesloten

**Bewijs:** nominale cassette/tower-speling 0,4 mm en rand/opening 0,25 mm per zijde zijn klein ten opzichte van niet gespecificeerde printvariatie. Een algemene ISO 2768-m-opmerking levert geen gecontroleerde FDM-passing. `Berekeningen.md:94–98` rekent met volle armdwarsdoorsneden en generieke 10MPa-kruip-/25MPa-schuifwaarden zonder tijd/temperatuur/oriëntatie. De kracht bij de kruipgrens is een grens, niet vanzelf een toelaatbare belasting met veiligheidsfactor. Gewichtsvergelijking 192/20 onderbouwt ook geen willekeurige optilbelasting.

**Actie:** functionele maat-/printtoleranties, filamentspecificatie, duurbelasting en echte contact-/moerkamerdoorsneden vastleggen; optillen, kabeltrek en montageoverspanning als aparte lasten opnemen. Kies exact anker voor de 3mm-huid. Werk boutpuntuitsteek en volledige fanboutketen uit.

**Digitaal acceptatiecriterium:** worst-case-passing en klauwbeweging voor 10/34/50mm-blad zonder onbedoelde botsing; minimale vrije speling positief met verklaarde tolerantie. Sterkte-/kruipberekening met onderbouwde materiaalwaarden en veiligheidsfactor; fanbout blijft onder alle opgegeven grenzen 4–6 mm ingedraaid.

### N12 — Minor — Revisie- en rekenclaims blijven intern tegenstrijdig

**Bewijs:** README:137 noemt romp 99 mm waar CAD/STL 96 mm geven; :140 noemt rand 200 i.p.v. 200,5; :174 noemt oud M5 170 × 190/€0,50; :200 schrijft schroeven voor een geklemde USB-print voor. :201 noemt de USB-positie 18–26 mm onder het **bovenvlak**, terwijl de CAD-opening rond Y−52 tot −56 ligt. De UI-afbeelding noemt nog 20–100% gewone regeling. `Berekeningen.md:24–25` labelt de openfracties 0,35/0,56, terwijl de gebruikte getallen 0,3109/0,7091 zijn. Het onafhankelijk gemeten roosteroppervlak bevestigt 125,6 cm² boven de huidige cassette, niet de 141 cm² in README:114.

**Actie:** documentwaarden uit gecontroleerde geometrie-/configuratiegegevens genereren; afhankelijkheden voor de volledige generator meeleveren. Het G4-surrogaat en 250Pa-eindpunt als scenario's labelen, niet als veilige of fabrikantspecifieke grenzen voor de Rittal-mat.

**Digitaal acceptatiecriterium:** automatische vergelijking van CAD/STL/tekeningen/BOM/README/UI geeft geen afwijkingen voor kritieke maten, aantal filters, bevestiging en standen. Schoon/beladen drukmodellen gebruiken dezelfde referentiesnelheid en onderscheiden aannames van fabrikantsdata.

### N13 — Major — Lucht- en geluidsdoel zijn op papier nog niet samen haalbaar gemaakt

**Bewijs:** de vangstformule geeft zelfstandig **189,54 m³/h** voor 0,5 m/s op 10 cm; 250 geeft **0,6595 m/s**, maar op 15 cm is daarvoor al **358,29 m³/h** nodig. De centrale-formule voorspelt geen vangst over het gehele hand-/freesgebied bij kruisstroming. Bij het gekozen schone ontwerpdebiet vermeldt het rekenblad 57–60 dB(A) op 1 m en 64–66 op 0,5 m; het eigen werkplekdoel is ≤55 op oorpositie (`Vrijgave-en-meetplan.md:83`). De drukcurve van de gekozen mat is niet bekend; een andere filterklasse ordent weerstand niet betrouwbaar. De belast-rekenrij vraagt bovendien 86–89% RPM voor 190, hoger dan de gewone 80%-grens als die als RPM bedoeld wordt. Eerder vervangen kan helpen, maar dat moet met N04 worden doorgerekend.

**Actie:** kies één dagwerkpunt, handhoogte/-gebied, onderhoudsgrens en oorafstand; werk een stille grotere inlaat/filteroppervlakte, lokale afscherming, demping of andere architectuur uit indien nodig. Neem media-onzekerheid en instroomnozzleverschil in de scenario's op.

**Digitaal acceptatiecriterium:** een gekoppelde ontwerpberekening toont over de toegelaten beladings- en handpositieband zowel Q≥190/gekozen vangstdoel als het afgesproken geluidsbudget, binnen de firmware- en thermische grenzen; anders doel/spec of ontwerp expliciet wijzigen. Geen fysieke geluidsmeting nodig om dit ontwerpconflict vast te stellen of de ontwerpactie af te tekenen.

## 4. Wat goed is

- Alle 13 productie-STL's zijn aanwezig en voldoen zelfstandig aan de uitgevoerde topologiecontroles; dit is een wezenlijke correctie van v2.
- De nominale geometrie is compact en grotendeels coherent: 68mm-onderhang, boventoegankelijke cassette, afzonderlijke bediening en externe gesloten netadapter.
- De huidige 229mm-maat is verklaarbaar door de uitgezwaaide klauwen; er is geen grond om deze op basis van v2 opnieuw automatisch af te keuren.
- De onafhankelijke reconstructie en exportvolumes ondersteunen geometrische samenhang voor de gecontroleerde typen; geen grote botsingen gevonden in het ondersteunde deel van de assemblage.
- De magneetpocket heeft nu 0,9mm-bodem; fanboutkamer geeft meer nominale indraaimarge.
- Werkpunt, kabelverlies, warmtepad en klauwkracht zijn nu reproduceerbaar beschreven in plaats van alleen gesteld. De rekenkundige hoofduitkomsten zijn grotendeels correct voor hun invoer.
- G01 is expliciet uitgesloten; gekozen S01 plus besturing past nominaal binnen het 90W-budget.
- Meetversheid, mislukte ijking, UIT-prioriteit en lage-stand-tachobewaking zijn inhoudelijk veel sterker. Module-eigen boostlease en normale versleutelde unicast zijn echte verbeteringen.
- Grove-filterbeperking, dampen en niet-uitkloppen worden nu expliciet genoemd. Dit is eerlijker dan een gezondheidsbelofte op basis van een generiek filterlabel.
- De prototypepoorten bestaan al. Het ontbreken van hun meetresultaten is **niet** gebruikt als ontwerpfout of scoreaftrek.

## 5. Gebiedsscores

| Gebied | Score /10 | Gewicht | Gewogen bijdrage | Ontwerpgrond |
|---|---:|---:|---:|---|
| CAD/geometrie | 8 | 15% | 1,20 | Goede nominale opbouw; pakking-, tolerantie-, last- en detailwerk niet gesloten. |
| Exports | 9 | 15% | 1,35 | Alle 13 geldig en grotendeels onafhankelijk consistent; volledige generatieroot en formele vormvergelijking ontbreken. |
| Lucht/druk/geluid | 5 | 20% | 1,00 | Rekenstructuur aanwezig, maar surrogaatmedium, alarmfunctie, RPM-brug en geluidsdoel sluiten niet. |
| Filtratie | 4 | 15% | 0,60 | Exacte grove mat helder gekozen; afdichting en aanvullend ruimtebeschermingsconcept niet uitgewerkt. |
| Elektrisch/thermisch | 6 | 10% | 0,60 | Coherente laagspanningsarchitectuur; componentselectie, foutcoördinatie en thermal duty niet af. |
| Firmware | 5 | 10% | 0,50 | Beide builds geslaagd, meerdere oude fouten opgelost; bewezen afrondings-/statusfouten en onvolledige pairing/limitering. |
| Ergonomie | 7 | 5% | 0,35 | Concrete werkplek en compacte onderhang; complete operationele envelop en hoogte-/geluidcombinatie niet gesloten. |
| Onderhoud | 7 | 5% | 0,35 | Bovenwissel en zakprocedure beter; rotor-/isolatie- en stoftransfertoestand niet uitgewerkt. |
| Documentatie | 6 | 5% | 0,30 | Uitgebreid en deels reproduceerbaar; expliciete maat-, montage- en claimtegenstrijdigheden. |
| **Totaal** | **6,25** | **100%** | **6,25** | **Som van score × gewicht.** |

De scores beoordelen wat op de ontwerptafel sluit. Geen aftrek omdat een prototype nog niet gebouwd, gemeten of gekeurd is. De niet uitvoerbare native-tests zijn een onderzoekslimiet, geen aangetoonde bronfout.

## 6. Top-5 ontwerpacties en afzonderlijk prototypevalidatieplan

### Top-5 ontwerpacties

1. **Sluit lucht-/beschermingsarchitectuur:** definitieve betekenis van de grove mat, aanvullende ventilatie/afvoer, reële filter-/drukscenario's, handgebied, geluidsbudget en vroegtijdige minimumdebietmelding gezamenlijk vastleggen. Aftekenen met de digitale criteria van N04/N05/N13.
2. **Werk cassetteafdichting daadwerkelijk uit:** pakking, steun-/compressiepad, filtertolerantie, roosterretentie en onderhoudstoestand in CAD/BOM. Aftekenen met N01 en onderhoudsroute N10.
3. **Maak regeling en grenzen werkelijk consistent:** RPM versus PWM, lusonafhankelijke zachte start, herhaalboostbudget, bewakingsstatus en ijkvoortgang; voeg adversariële hosttests en twee-set-pairingtests toe. Aftekenen met N02/N03/N06/N07/N08.
4. **Sluit elektrische, thermische en constructieve dimensionering:** exacte fuse/kabel/connector/anker/materiaalkeuze; foutlus, 5V-piek, derating, klauwkruip en functionele tolerantieketen. Aftekenen met N09/N11 en het model van N06.
5. **Bevries één reproduceerbare baseline:** volledige generatorafhankelijkheden, consistente maak-/USB-/onderhoudsinstructies, automatisch gecontroleerde maat- en configuratietabellen. Aftekenen met N12; behoud de nu goede STL-topologie.

### Prototypevalidatie — ongescoord, na ontwerpaftekening

- **Geometrie en montage:** koopdelen, print-/slicerresultaat, tolerantiecoupons, klauwzwaai voor gekozen bladdiktes, normdelen en fanboutindraaiing controleren; geen onveilige rotortest bij open toestel.
- **Lucht en blootstelling:** Q–Δp–PWM–RPM schoon/beladen, hand-/freesgebied en kruisstroming, lek-/uitstootmeting en professionele blootstellingsbeoordeling. Geen ongecontroleerde stofwolk met personen als proef.
- **Geluid/ergonomie:** oorposities van beide personen, tafeltrilling, handsteun, knieën, kabelbuigradius en uitblaasrichting.
- **Elektrisch/thermisch:** competente inspectie, maximale toegelaten duty inclusief herhaalboost, flashvoedingen, foutcondities en temperaturen binnen de vooraf gekozen materiaalen componentgrenzen. Adapter gesloten houden; geen geïmproviseerde netspanningsproef.
- **Constructie/materialen:** berekende belastingen, duurkruip, anker-/huidsterkte, magneet-/lijmretentie en compatibiliteit met precies gekozen reiniging.
- **Firmware/onderhoud:** reeds digitaal ontworpen sensor-/radio-/tacho-/resetfoutpaden op hardware bevestigen; onderhoudsisolatie, uitloop en herhaalde stofarme wissels met hermontageafdichting toetsen.

De bestaande eis “4 uur op 100%” moet worden afgestemd op het gekozen dutyconcept: óf werkelijk continu maximum is toegestaan en ontworpen, óf het is een gecontroleerde worst-case/foutproef met professioneel protocol, niet een instructie om de limiter ongemotiveerd te omzeilen.

## 7. Verworpen of ongefundeerde claims en grenzen van conclusies

- **Niet overgenomen:** “één generator/revisienummer betekent alle documenten consistent”. Concrete resterende tegenstrijdigheden zijn hierboven aangewezen.
- **Niet overgenomen:** “G3 heeft zeker minder weerstand dan deze G4-referentie”. Klasse is geen drukcurve; compressie, structuur, fabrikant en werkpuntsnelheid doen ertoe. 54 Pa is een scenario, geen gemeten of gegarandeerde Rittal-waarde.
- **Niet overgenomen:** “dubbele druk = vol filter = voldoende resterende vangst”. Het eigen druk-/fanmodel levert tegenvoorbeelden; 0–120% op de balk is geen fysiek gemeten beladingsfractie.
- **Niet overgenomen:** “50%/s is getest en bewijst aanloop binnen zekeringcurve”. De integercode voldoet bij 5ms-stappen niet en levert sowieso geen stroom-/I²t-bewijs.
- **Niet overgenomen:** “100% maar 120 s houdt de box vanzelf koel”. Herhaalboost en de PWM/RPM-mismatch maken dat geen geborgde warmtebeperking.
- **Niet overgenomen:** “EPDM staat in de tekst, dus de afdichting is opgelost”. De ontwerpgeometrie moet haar sluitpad en compressie leveren.
- **Niet overgenomen:** “UIT is stilstand of onderhoudsisolatie”. De bevestigde grootheid is PWM; radioverlies en rotoruitloop blijven afzonderlijke toestanden.
- **Niet overgenomen:** “grove mat plus algemeen ventileren is een uitgewerkt fijnstof-/dampbeschermingsconcept”. Het beschermingsdoel en de aanvullende installatie moeten expliciet begrensd worden.
- **Evenmin beweerd:** H13 is automatisch wettelijk verplicht; een G3-mat bewijst een wettelijke blootstellingsoverschrijding; aceton maakt automatisch ATEX noodzakelijk; F1-zelfdovendheid van de mat geldt ook voor beladen stof, PETG, lijm of het hele toestel.
- **Niet opnieuw als fout aangemerkt:** 229mm-totaalbreedte, nul mates of een kleine tessellatieafwijking. Nominale geometrie, eigen reconstructie en officiële CAD-kernel zijn verschillende bewijsniveaus.
- **Geen garantie afgeleid uit builds:** beide targets compileren, maar dit bewijst noch fysiek gedrag noch volledige testdekking. De 16 native-tests zijn hier niet uitgevoerd; de beperkte bestaande tests bevatten geen bewijs voor de nieuwe tegenvoorbeelden.
- **Geen ontbrekende fysieke test als tekortkoming gescoord.** De open punten zijn keuzes, logica, specificaties, berekeningen en geometrische uitwerkingen die digitaal kunnen worden afgerond.
