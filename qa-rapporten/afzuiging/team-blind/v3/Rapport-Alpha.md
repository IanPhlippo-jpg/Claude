# Onafhankelijk ontwerp-QA-rapport v3

## 1. Scope, zelfstandig uitgevoerd onderzoek, bewijs en beperkingen

Beoordeeld is uitsluitend de engineeringmaturiteit van de aangeleverde 114 bestanden in `src-v3`. Alleen CASUS-v3, FORMAAT-v3 en deze bron zijn gelezen; geen eerdere eindverslagen, baseline of andere teamrapporten. De 114 aangeleverde bronbestanden zijn niet gewijzigd. Bij een eerste Python-import ontstond onbedoeld een extra `docs/__pycache__/berekeningen.cpython-313.pyc`; uitsluitend dat zelf gegenereerde cachebestand is verwijderd en de lege cachemap opgeruimd. De eindinventaris telt weer 114 bestanden en stemt met de aanvankelijke werkkopie overeen, afgezien van uitsluitend de bewust op de kopie opnieuw gegenereerde regeleinden in het rekenblad. Dit tijdelijke cache-effect was een afwijking van de strikt alleen-lezen werkwijze; geen aangeleverd bestand is overschreven. Uitvoering gebeurde op een eigen kopie in `[eigen onderzoeksmap]`; analyses en logs staan in `[eigen onderzoeksmap]/`. Geen contact met anderen, geen upload, geen hardwarebediening.

**Kernconclusie:** digitaal aanzienlijk beter uitgewerkt dan een schetsontwerp, maar nog niet consistent genoeg voor een definitieve bouwvrijgave. Vooral de afdichting, betekenis van de filterbewaking, thermische boekhouding, zachte start en onderhoudsinstructies hebben aantoonbare ontwerp-/implementatiegaten. De keuze voor een grove filtermat wordt als gegeven beoordeeld, niet als automatische tekortkoming; dit is bronafzuiging met recirculatie, geen fijnstofreiniging.

### Uitgevoerde controles

| Onderzoek | Eigen uitkomst / bewijs |
|---|---|
| Bestandsinventaris | 114 bestanden; 25 afzonderlijke onderdeel-KCAD's plus assemblage met 77 componenten. |
| Alle 13 aangeleverde STL's, Trimesh | Elk één verbonden component, gesloten, consistente winding; na samenvoegen van identieke vertices nul randen met incidentie ongelijk aan twee. `analyse.py`, `analyse.log`. Dit bewijst geen afwezigheid van alle zelfdoorsnijdingen of botsingen. |
| Onafhankelijke reconstructie filtercassette, CadQuery/OCCT | Geldige solid, één lichaam, 174,2 × 174,2 × 19 mm; volume 37.948,211 mm³. STL: 37.948,07 mm³, verschil circa 0,0004%. `cad_check.py`, `cad_check.log`, `cassette-reconstructed.step`. |
| Roostercontouren, Shapely | 218 gaten, één stuk staal; alle polygonen geldig. Totaal open 177,810 cm²; boven het vak 171 × 171 mm: **125,595 cm²**, niet 141 cm². |
| Rooster-DXF, ezdxf | 219 gesloten polylijnen, nul auditfouten; verschil in staaloppervlak met `rooster.loops`: **0,0 mm²**. Twee andere DXF's bevatten nog stalen klauwen. `dxf_check.py`, `dxf_check.log`. |
| Rekenblad opnieuw gegenereerd op kopie | Inhoud van `Berekeningen.md` exact gelijk na normalisatie van CRLF/LF. Dezelfde uitkomst is geen bewijs dat de invoeraannames kloppen. |
| Onafhankelijke rekencontroles | Vangdebiet, oppervlakken, vermogenssom, klauwen en gewijzigde warmtebalans; hieronder en in `analyse.log`, `drukmodel.log`. |
| Beide firmwarebuilds | `pio run -e module -e knop`: **beide SUCCESS**, met vastgelegde platform-/bibliotheekversies. Knop: 886.853 bytes flash, 44.476 bytes RAM; module: 744.418 bytes flash, 38.540 bytes RAM. `build.log`. Geen flash naar hardware. |
| Aangeleverde native suite | `pio test -e native` geprobeerd: build geblokkeerd door ontbrekende `g++` in deze omgeving; **geen van de 16 tests hier uitgevoerd**. Installatie van g++ via pakketbeheer mislukte wegens ontbrekende schrijfrechten. `native.log`. Dit is geen bewezen bronfout en krijgt geen scoreaftrek. |
| Firmware statisch en rekenkundig | Regellus, callback-/koppelpad, bewaking, opslag, ijking, UI en exact gehele-getalgedrag van de oploopformule onderzocht. Oploopreconstructie is een Python-herberekening, niet een uitgevoerde C++-test. |
| Documenten | README, reken- en vrijgaveplan, generators, stuklijst, SVG-revisies en geëxtraheerde tekst uit bouw-/werktekeningen. Bouwschema bevat nog een expliciete instructie om het filter uit te kloppen. |

Reproduceerbaar met de scripts in de eigen analysemap en de geïnstalleerde gratis tools in `[eigen onderzoeksmap]/venv`. Voor builds: `cd [eigen onderzoeksmap]/source/firmware && ../../venv/bin/pio run -e module -e knop`. De oorspronkelijke projectbibliotheek `../lib/schets.mjs` en officiële CAD-kernel maken geen deel uit van de toegestane bron. Daarom is geen volledige officiële KCAD-regeneratie, feature-resolutie of kernel-botsingscontrole geclaimd. De reconstructie van de cassette is onafhankelijk en beperkt tot dat onderdeel; nominale maatcontroles zijn daarvan onderscheiden.

Geen onafhankelijke leveranciersdatabladen of meetseries zijn meegeleverd binnen deze scope. Productspecificaties, materiaalkwalificaties en referentiecurven blijven daarom invoerclaims, niet extern geverifieerde feiten. Er zijn geen fysieke tests uitgevoerd. Daarvoor wordt nergens score afgetrokken. Scores zijn een expliciet engineeringoordeel, geen statistische schatting; betrouwbaarheidsintervallen zouden zonder meetdata verzonnen zijn.

## 2. Wijzigingen sinds v2 en matrix oude bevindingen

**Belangrijke grens:** het oorspronkelijke v2-verslag mocht niet worden gelezen. `docs/Vrijgave-en-meetplan.md:9–25,52` bevat verwijzingen naar E01–E14, maar geen volledige oude bevindingenlijst. Onderstaande matrix dekt alle daaruit afleidbare ID's E01–E14, inclusief ontbrekende E05. Een volledige inhoudelijke vergelijking met ELKE oorspronkelijke v2-bevinding is daardoor niet vast te stellen; onbekende formuleringen of extra ID's zijn niet gereconstrueerd alsof ze bekend waren. Status “onzeker” betekent onvoldoende toegestane historie, niet automatisch een open ontwerpgebrek.

Binnen deze beperking zijn actuele veranderingen zichtbaar: exacte gekozen mat en cassettevak; los regelhart `regel.h`; native testbestand; verse-metingsvlag in protocol/UI; ijking met plausibiliteitsgrenzen; lokale boosttimer; koppeling en versleutelde peers; gewone stand begrensd op 80%; elektrische/thermische rekenbladen; gesloten STL-set. Dat dit werkelijk de volledige delta sinds v2 is, is niet bewezen.

| Oude ID | Status | Wat zelfstandig vaststaat in de huidige bron |
|---|---|---|
| E01, alleen bij beschermingsconcept genoemd | **Onzeker** | Oude exacte claim onbekend. Huidige tekst erkent recirculatie van fijn stof en onderscheidt motorbescherming van luchtreiniging (`Vrijgave-en-meetplan.md:25–47`). Geen blootstellingsrendement uit de filterklasse afleidbaar. |
| E02 revisiemix | **Deels** | Onderzochte 17 tekening-SVG's en 10 schema/mal-SVG's dragen 6.1; rooster-DXF sluit aan op contourbestand. Toch oude stalen-klauw-DXF's, uiteenlopende maat-/prijsclaims en onderhoudstekst met dezelfde revisietitel; N05/N10. Eén revisielabel bewijst geen inhoudelijke synchronisatie. |
| E03 open/niet-manifold STL's | **Opgelost binnen getoetste topologie** | Alle 13 STL's voldoen aan de onafhankelijke rand-/winding-/componentcontrole. Geen algemene garantie voor alle geometrische gebreken. |
| E04, alleen bij beschermingsconcept genoemd | **Onzeker** | Oude exacte bevinding onbekend. Nieuwe rekenbladen bestaan, maar toevoerplenum, lucht-/drukreferentie en filterinvoer vragen verdere digitale uitwerking; N02/N08. |
| E05 | **Onzeker** | In toegestane huidige documenten niet benoemd; onderwerp en oplossing zijn niet vast te stellen. |
| E06 oude meetwaarde | **Opgelost in onderzocht regel-/UI-pad** | `regel.h:79–90,128–144` maakt statusdruk en filterwaarde ongeldig bij niet-verse meting; UI `knop/main.cpp:315–333` verbergt de waarde. Sensorherstart in `module/main.cpp:190–200`. Geen hardwarewerking geclaimd. |
| E07 ongeldige ijking / meetbereik | **Deels** | Minimumaantal monsters, drukgrenzen, toerental en behoud oude ijking staan in `regel.h:147–151,177–215`; 2×referentie boven 450 Pa geeft NAN (`:112`). Maar dit sensorbereikcriterium garandeert geen fysisch bereikbare of tijdige filtermelding; N02. Aan het einde van een ijkpunt wordt actuele `meetVers()` niet opnieuw vereist, alleen het eerder verzamelde aantal monsters en actuele rpm. |
| E08 stop/herstart | **Deels** | UIT annuleert ijking; initialisatie UIT; stilstandbewaking aanwezig (`regel.h:60–64,118,157`). Periodieke AAN-opdrachten kunnen na een afzonderlijke modulereset opnieuw starten zonder nieuwe menselijke handeling; N11. Volledige spanningsuitval van box én knop is daarvan te onderscheiden. |
| E09 radio | **Deels** | MAC-selectie, peer-encryptie, volgnummer en lokale boosttimer aanwezig. Koppeling kan echter gedurende elke eerste minuut een bestaande set overschrijven; N06. Test met een tweede knop ná 70 s dekt die botsing niet. |
| E10 draagconstructie | **Deels** | PETG-klauwen met moer, beperkte momentinstructie en berekening aanwezig. 48 N / 0,048 Nm en 31,25 N / 0,025 Nm zijn algebraïsch correct bij aangenomen 10 MPa. Geen temperatuurs-/laagoriëntatiegebonden onderbouwing van die kruipgrens of tolerantieketen; N07/N09. |
| E11 ongeschikte G01-ventilator | **Opgelost qua selectie en nominale vermogenssom** | S01 staat in model, stuklijst, schema en README; G01 expliciet uitgesloten (`README:43,60`). 58,424 W totaal tegenover 90 W. Dat bewijst niet de aanloop-/zekeringcoördinatie; N03/N09. |
| E12 uitkloppen / onderhoud | **Deels, niet gesloten** | README en live UI verbieden uitkloppen. `tekeningen/Bouwschema-afzuiging.pdf`, pagina 14, stap 13.4 beveelt nog letterlijk “klop het filter uit of vervang het” aan. N05. |
| E13, alleen bij beschermingsconcept genoemd | **Onzeker** | Exacte oude bevinding onbekend. Huidige bron beschrijft probe-/morsproeven, maar onderhoud verwijdert rooster en cassette zonder expliciete voorafgaande uitschakeling; N05. |
| E14 instructies | **Deels** | Veel selecties gelijkgetrokken; resterende schroef-/USB-instructie en maat-/kostenverschillen aantoonbaar; N10. |

## 3. Nieuwe en resterende bevindingen

Er is geen **Kritiek**-bevinding toegekend: binnen deze beperkte digitale scope is geen onvermijdelijk catastrofaal falen bewezen. “Major” betekent wel een open ontwerpactie vóór definitieve bouwvrijgave. Alle onderstaande sluitcriteria zijn digitaal; geen fysieke proef is nodig om de ontwerpactie zelf af te tekenen.

### N01 — Major — Afdichting beschreven maar niet geconstrueerd

**Bewijs:** `maak-afzuiging.mjs:49–50,145–147,258–271`: richel bovenvlak Y=0; cassetterand Y=0…2,5; rooster begint Y=2,5. Er is dus **0 mm nominale ruimte** voor de voorgeschreven samengedrukte pakking. `Vrijgave-en-meetplan.md:41–43` verlangt EPDM 3 × 9 mm, 30–50% compressie en een 1,5 mm lagere positie; die verplaatsing is niet in de actuele geometrie aanwezig. `M.richel` bevat geen hoogtecoördinaat. De nominale rechte oplegbreedte onder de rand is slechts 100,25−99 = **1,25 mm**. Pakking ontbreekt bovendien in de gelezen stuklijst/kooplijst en montagevolgorde.

**Actie:** ontwerp een doorgaand pakkingpad met steun, hoogte, materiaal, lijmnaad en vastgelegde compressie; verwerk dit in model, BOM en montage. Controleer lip-/greepuitsparingen mee.

**Digitaal acceptatiecriterium:** een doorsnede-/afstandstest toont rondom een ononderbroken afdichtpad en een gemonteerde pakkingdikte van **1,5–2,1 mm** bij nominale 3 mm; de volledige vastgelegde tolerantieketen blijft binnen 30–50% compressie. Geen harde interferentie, geen open pad van rooster naar onderdrukruimte buiten het filter. BOM en montage noemen hetzelfde afdichtdeel.

### N02 — Major — “Dubbele schone druk” bewaakt niet rechtstreeks filterbelasting of minimumdebiet

**Bewijs:** meetpunt in instroomplaat (`maak-afzuiging.mjs:68,328–341`), andere meterpoort referentie aan omgeving. Daarmee wordt niet uitsluitend het filter gemeten, maar ook rooster-/cassetteverlies. Bij 250 m³/h geeft het eigen model **53,83 Pa filter + 31,19 Pa rooster + 3,64 Pa cassettebodem = 88,66 Pa** vóór het oog; dit is niet de circa 50 Pa pure filterdruk waarmee de toelichting rekent. `regel.h:110–113` vergelijkt druk bij dezelfde gevraagde PWM met schoon; het debiet wordt niet constant gehouden en rpm wordt alleen op stilstand getoetst.

Zelfstandige koppeling van dezelfde nominale fan-/systeemcurven aan deze meetkamer (`drukmodel.py`) geeft, **onder de aanvullende aanname dat stand = toerentalfractie**:

| Toerentalfractie | Schoon debiet m³/h | Referentiedruk Pa | Alarm bij 2× Pa | Debiet bij alarm m³/h |
|---:|---:|---:|---:|---:|
| 0,20 | 57,87 | 14,33 | 28,66 | onbereikbaar: afsluitdruk slechts 24,36 Pa |
| 0,40 | 147,66 | 43,94 | 87,89 | 30,70 |
| 0,60 | 240,72 | 84,12 | 168,25 | 103,92 |
| 0,80 | 335,18 | 134,78 | 269,56 | 179,12 |

Dus zelfs het aangeleverde vereenvoudigde model geeft een alarm ná het ontwerpminimum van 189,54 m³/h op 60 en 80%. Dit zijn modeltegenvoorbeelden, geen gemeten alarmdebieten. Het bewijs ondersteunt **niet** de claim dat een bereikcontrole van 450 Pa voldoende bewaking oplevert. Een lage druk kan bovendien bij een weerstand vóór de meting iets anders betekenen dan lage luchtstroom; hogere druk kan samengaan met lager debiet.

**Actie:** definieer exact welke druk wordt gemeten en welke grootheid de veiligheids-/onderhoudsbeslissing stuurt. Gebruik een controleerbare Q-/rpm-/drukrelatie of afzonderlijke echte filterdrukmeting met een passend belastingsmodel. Onderscheid “filter vervangen”, “te weinig vangdebiet” en “bewaking niet beschikbaar”.

**Digitaal acceptatiecriterium:** een model-/testmatrix over alle toegestane standen en filterweerstanden toont dat Q onder het gekozen minimum nooit ongemeld kan voorkomen; onbereikbare drempels worden als onbewaakbare stand gemeld. Test expliciet bovengenoemde vier tegenvoorbeelden en de meetlocatie. Geen claim van werkelijk debiet zonder gekwalificeerde invoer.

### N03 — Major — Zachte start is afhankelijk van de lusfrequentie en sneller dan gespecificeerd

**Bewijs:** `regel.h:121–124` rondt elke individuele toename naar boven af: `(dt*50+999)/1000`. Bij dt=5 ms is dit elke stap **1 procentpunt**, dus 80% na **400 ms**, niet de bij 50 procentpunten/s vereiste 1600 ms. Bij 10 ms: 800 ms; bij 20 ms: 1600 ms. De hardwarelus bevat `delay(5)` (`module/main.cpp:233`); echte lusduur varieert. De native test (`test_regel.cpp:208–218`) gebruikt 250 ms en één losse grensassertie en detecteert dit niet. Uit PWM-oploop volgt bovendien op zichzelf geen gegarandeerde motorstroom.

**Actie:** bewaar fractionele voortgang of bepaal het doel uit verstreken totale tijd; scheid PWM-rampbewijs van aanloopstroombewijs.

**Digitaal acceptatiecriterium:** regressietests met 1, 5, 10, 20, 250 ms en jitter bewijzen cumulatief maximaal 50 procentpunten/s plus hoogstens één expliciet gekozen kwantisatiestap; UIT blijft in dezelfde stap nul. Een zekeringclaim verwijst naar een afzonderlijke stroom-/tijdanalyse.

### N04 — Major — Thermische balans mist het eigen verbruik van elektronica in de box

**Bewijs:** `docs/berekeningen.py:139,282–286`: de verliespost telt adapterverlies, buckverlies en 0,3 W bedrading, maar niet het elektrische vermogen dat module-ESP32 en drukmeter **zelf** in warmte omzetten. Dat is volgens de eigen invoer 0,50+0,02 = **0,52 W**. De knop van 1,20 W zit buiten de box en hoort juist niet integraal bij het interne verlies.

Correctie binnen hetzelfde model: bij 80% **5,337 W** in plaats van 4,817 W; bij 100% **9,090 W** in plaats van 8,570 W. De in `analyse.log` ook getoonde toevoeging van de volledige 1,72 W is alleen een bovenscenario waarin álle 5V-verbruikers binnen de box zouden zitten, niet de actuele opbouw. De rekenmatige adapteromgeving wordt dan op 80% **34,55–42,12 °C** en op 100% stationair **40,95–52,88 °C**, tegenover oorspronkelijk circa 33,65–40,57 en 40,07–51,43 °C (`thermisch-correct.log`). Ook zijn h·A, adapterrendement en fanvermogen ~rpm³ aannames zonder gekwalificeerde grensband voor deze behuizing. `Berekeningen.md:90` noemt geen echte thermische terugregeling: firmware heeft geen temperatuuringang en `dagMaxPct` is een vaste instelling.

**Actie:** plaats elke dissipatie op de juiste locatie, reken onderscheid tussen luchttemperatuur, adapteroppervlak en PETG, leg de juiste deratingcurve vast en kwalificeer de 80%-grens ook voor een benoemde omgevingstemperatuur. Noem een handmatige configuratiewijziging geen actieve beveiliging.

**Digitaal acceptatiecriterium:** vermogensbalans sluit inclusief 0,52 W interne elektronica, kabel-/buck-/adapterverliezen; doorrekening van expliciete nominale en ongunstige scenario's blijft binnen componentgrenzen of leidt tot een aangepaste configuratielimiet. Script, tabel en firmwarelimiet stemmen overeen. Een 120s-boost wordt niet als thermisch veilig bewezen zonder transiëntmodel of conservatieve stationaire grens.

### N05 — Major — Tegenstrijdige en onvolledige onderhoudsprocedure

**Bewijs:** `tekeningen/Bouwschema-afzuiging.pdf`, pagina 14, stap 13.4: “klop het filter uit of vervang het”. Dat strijdt met `README:31,258`, `Vrijgave-en-meetplan.md:44–45` en `knop/main.cpp:320`. Bovendien zeggen deze filterwisselstappen niet expliciet eerst UIT/stekker uit; rooster en cassette zijn van boven afneembaar, terwijl de waaier volgens `M.fan.top` op Y=−27 begint. Een intact rooster tijdens bedrijf is niet dezelfde toestand als geopend onderhoud. Geen interlock of afzonderlijke vaste beschermkap is aangetoond.

**Actie:** één onderhoudsprocedure: uitschakelen, voeding isoleren en uitloop afwachten vóór openen; niet uitkloppen; afgesloten afvalroute; correct weer opbouwen en ijken. Leg vast of bescherming door vaste afscherming of alleen de spanningsloze onderhoudsprocedure wordt geleverd.

**Digitaal acceptatiecriterium:** tekstextractie uit alle meegeleverde PDF/SVG/HTML/README/UI bevat geen positieve uitklopinstructie; elke volledige filterwisselprocedure begint met hetzelfde isolatie-/uitloopvoorschrift. Indien een vaste afscherming wordt gekozen: CAD-bereikbaarheidsanalyse omvat óók verwijderde cassette en alle vastgelegde openingen.

### N06 — Major — Koppelvenster kan bestaande set overschrijven

**Bewijs:** `regel.h:245–253` accepteert gedurende de eerste 60 s elke koppelvraag, ook als `gekoppeld` al waar is. `module/main.cpp:168–174` overschrijft opgeslagen peer en antwoordt broadcast. Een nieuwe knop zendt elke 500 ms (`knop/main.cpp:436–452`); twee modules die tegelijk opstarten kunnen dezelfde knop aannemen. De knop bindt zich vervolgens aan het ontvangen antwoord zonder specifieke transactie-identificatie. De bestaande test weigert tweede set pas bij 70.000 ms (`test_regel.cpp:237–240`), buiten het probleemvenster.

**Actie:** expliciet aanmelden voor herkoppelen, venster sluiten na succesvolle exclusieve transactie, antwoord aan de bedoelde knop en transactie koppelen; behandel sessie-/volgnummerherstart afzonderlijk.

**Digitaal acceptatiecriterium:** mock-/native tests met twee modules en twee knoppen, overlappende opstartvensters, herhaalde broadcastvragen en bestaande opgeslagen koppeling bewijzen dat een bestaande set niet stilzwijgend wordt overgenomen en elke bevestiging bij precies één transactie hoort.

### N07 — Major — Passing en filtercompressie alleen nominaal, niet als tolerantieontwerp

**Bewijs:** `maak-afzuiging.mjs:44–50,239–243,276–283`: bak 174,2 mm, torengrens 175 mm → **0,4 mm nominale speling per kant**; cassetterand 200,5 mm in frameopening 201 mm → **0,25 mm per kant**. Worst-case variatie is niet gespecificeerd. Bij louter een illustratieve ±0,2 mm variatie van elk van twee tegenoverliggende oppervlakken kan 0,4 mm al nul worden; dit is geen voorspelling van de printer, maar toont de ontbrekende budgettering.

Werkelijk gekozen filter: 173 × 173 × 17 mm; vak: 171 × 171 × 17 mm. Dat vraagt **2 mm totale zijdelingse indrukking**, maar CAD modelleert een **170,5 × 170,5 mm** mat met 0,25 mm lucht per kant. Die geometrie bewijst de bedoelde randcompressie niet. Filtermaattolerantie, samendrukbaarheid en maximale kracht zijn niet gespecificeerd. Cassettewand is 1,6 mm; algemene printinstructie van vijf 0,4mm-wanden is daar niet letterlijk uitvoerbaar.

**Actie:** bepaal een expliciet fabricage-/filtertolerantiebudget, modelleer nominale onbelaste en gemonteerde maten afzonderlijk en definieer een passende slicerregel voor dunne wanden. Gebruik leveranciersgegevens waar beschikbaar, anders benoemde ontwerpintervallen.

**Digitaal acceptatiecriterium:** worst-case maatketens voor alle verwisselbare interfaces tonen positieve montagespeling en gewenste afdichting zonder ongedefinieerde interferentie; gemonteerde filterrepresentatie correspondeert met de echte productmaat en opgegeven compressie. Een digitale snij-/slicercontrole toont continue wanden en een uitvoerbare laagopbouw.

### N08 — Major — Lucht-/geluidmodel dekt niet de actuele toevoergeometrie en regeling

**Bewijs:** `maak-afzuiging.mjs:49,60–63,328–341`: onderkant cassette Y=−19, instroomplaat bovenzijde Y=−22 → slechts **3 mm plenum** buiten het centrale oog. Het rekenblad (`berekeningen.py:45–51`) bevat rooster, cassettebodem, oog en uitblaas maar geen expliciete dunne-plenumverdeling. Onder de nadrukkelijk **niet bewezen** aanname van uniforme frontstroming moet circa 52,5% van 250 m³/h radiaal naar het oog. Ringdoorsnede 2π·66,5·3 = **1253,5 mm²**; snelheid circa **29,1 m/s**, dynamische schaal circa **507 Pa**. Dit is géén berekende extra drukval; het toont dat uniforme filterbenutting en een verwaarloosbaar plenumverlies niet zonder onderbouwing samengaan.

Verder zijn de gekozen filterdrukken een analogie met ander materiaal (`berekeningen.py:64–68`), zonder aangetoond conservatief bereik. De opgegeven 0,7–1,5-band varieert alleen luchtwegverlies, niet deze filteraanname of curveaflezing. `Berekeningen.md:56` verlangt rpm-regeling of ijking van PWM; `module/main.cpp:59–62,203–212` regelt slechts PWM en gebruikt tacho alleen als ingang voor bewaking. De voorspelde 250 m³/h vraagt 57–60 dB(A) op 1 m en 64–66 dB(A) op 0,5 m volgens de eigen tabel; de ontwerpeis is ≤55 dB(A) aan het oor. Daarvoor bestaat nog geen gelijktijdige digitale haalbaarheidsanalyse op de werkplek.

**Actie:** kwalificeer filter-/faninvoer met herleidbare brondata of zichtbare intervallen; modelleer de werkelijke plenumverdeling en verliezen, eventueel met vrije numerieke stromingsanalyse. Leg één consistente omzetting PWM→rpm→Q→vermogen/geluid vast, met duidelijk onderscheiden schattingen en eisen.

**Digitaal acceptatiecriterium:** een herhaalbare nominale én ongunstige modelberekening met de actuele geometrie toont een gekozen dagstand die het vangdebiet en benoemde geluidseis tegelijk kan halen, of legt expliciet de ontwerpspanning en aangepaste eis/constructie vast. De 3mm-kamer en de filteronzekerheid zijn aantoonbaar meegenomen; rpm-fractie wordt niet stilzwijgend gelijkgesteld aan duty-cycle.

### N09 — Major — Elektrische selectie en mechanische grenswaarden nog niet volledig onderbouwd

**Bewijs:** `Berekeningen.md:68` claimt dat de aanloopstroom binnen de trage zekeringcurve blijft omdat PWM oploopt. Een exact zekeringtypenummer, DC-afschakelvermogen, I²t-/tijd-stroomcurve en fan-aanloopprofiel ontbreken in `README:79` en `schema/maak-schema.mjs:278`. Nominale 2,434 A / 3,15 A = 77,3% is correct maar geen fout-/aanloopcoördinatie. Evenmin bewijst een opgegeven 10 MPa kruipgrens (`berekeningen.py:170`) onbeperkte houdkracht bij elke temperatuur, laagoriëntatie en belastingduur. “Twee vingers” borgt een limiet van circa 0,05 Nm niet reproduceerbaar.

**Actie:** specificeer zekering exact en verbind kortsluit-/aanloopgegevens aan draad, adapter en contactlimieten. Definieer materiaal-, printoriëntatie-, temperatuur- en tijdsintervallen voor de klauwberekening en kies een uitvoerbare kracht-/momentbegrenzing.

**Digitaal acceptatiecriterium:** onderbouwde tijd-stroom-/I²t-matrix voor normaal bedrijf, start en fout toont componentcompatibiliteit binnen opgegeven grenzen; geen stroomclaim uitsluitend uit PWM. Een rekenbestand met herleidbare materiaalgrenzen en nominale/worst-case krachten levert een vastgelegde veiligheidsmarge, in overeenstemming met montagemethode.

### N10 — Minor — Overgebleven maat-, uitvoer- en instructiemix

**Bewijs:** `README:114` noemt 141 cm² effectief rooster; contouren en rekeninvoer leveren 125,595 cm² (circa **10,9% minder**). `README:137` noemt Romp 99 mm hoog, STL/model 96 mm; `:140` noemt cassetterand 200 mm, STL 200,5 mm; `:146` noemt Knopdeksel 2 mm hoog, STL inclusief pennetjes 4,9 mm. README `:200` en bouwschema stap 11 vragen het USB-printje vast te schroeven met 2×M2×5; de actuele knophouder gebruikt juist gatloze print, palen en dekselpennen (`maak-afzuiging.mjs:98–99,504–507,564–567`). `README:174` noemt nog M5-filter 170×190 mm voor €0,50; actuele mat kost volgens dezelfde kooplijst €22,21 per vijf. `Besparingen.md:1` noemt €502,69, README €495,48. De twee DXF's voor stalen klauwen zijn nog aanwezig ondanks huidige PETG-uitvoering.

**Actie:** maak een expliciet uitvoermanifest, scheid verouderde/niet te fabriceren bestanden en genereer maten en montage-instructies uit dezelfde parameters. Voeg benodigde generator-/verificatieafhankelijkheden aan de reproduceerbare levering toe.

**Digitaal acceptatiecriterium:** CI-controle vergelijkt alle opgegeven onderdeel-enveloppen met exports, alle filter-/montagekeuzen met BOM en alle uit te leveren fabricagebestanden met het manifest. Geen actuele instructie vraagt schroefgaten in een gatloos printje. De prijs-/filtervoorbeeldtekst verwijst alleen naar de gekozen variant.

### N11 — Minor — Herstartbeleid is alleen voor gezamenlijke herstart aangetoond

**Bewijs:** nieuwe regelaar start UIT, maar accepteert meteen de eerste AAN-opdracht (`regel.h:57–76`). De knop blijft elke 250 ms de gewenste toestand verzenden (`knop/main.cpp:455–460`). Na een afzonderlijke module-reset, terwijl de knop blijft werken, kan dus zonder nieuwe menselijke bediening weer AAN worden gekozen. De bestaande stroomhersteltest (`test_regel.cpp:47–53`) stuurt geen opdrachten en dekt deze situatie niet. De normale boxschakelaar voedt ook de knopregelaar (`schema/maak-schema.mjs:125–136`), zodat dit niet hetzelfde is als de gewone gezamenlijke spanningsonderbreking.

**Actie:** beschrijf afzonderlijke MCU-reset expliciet en kies of een hernieuwde bewuste start of automatisch hervatten bedoeld is; laat protocol en UI dat beleid implementeren.

**Digitaal acceptatiecriterium:** tweepartijentest met doorlopende heartbeat en afzonderlijke resets van module/knop bewijst het vastgelegde beleid, zonder impliciete gelijkstelling aan een totale stroomonderbreking.

## 4. Wat goed is

- De 13 printbestanden zijn zelfstandig topologisch gesloten bevonden; cassettevolume is bovendien met een onafhankelijke OCCT-solid bevestigd. Het rooster is aantoonbaar één staaldeel en de DXF is exact consistent met de aangeleverde contouren.
- Maten van hoofdonderdelen zijn compact en in één parameterset herkenbaar. RVS 222 mm, romp 210 mm en freesgat 212 mm leveren nominaal 5 mm draagoverlap en 1 mm radiale montagespeling per zijde. Cassettewand 1,6 mm en bodem 2 mm zijn expliciet gemodelleerd.
- Fan-/bodemschroefconstructie is gericht verbeterd: nominale indraaiing M4×10 is 5 mm; bij de aangenomen twee ±0,2mm-variaties 4,6–5,4 mm. Dit klopt algebraïsch, zonder daarmee de niet meegeleverde fabrikantspecificatie te certificeren.
- Vangdebieten zijn goed herrekend: 189,54 / 358,29 / 594,54 m³/h voor 0,5 m/s op 10 / 15 / 20 cm binnen het gekozen model. De bron erkent expliciet de beperkte reikwijdte boven het rooster.
- Elektrische nominale som en kabelweerstanden kloppen: 58,424 W, 2,434 A; M8-lus 0,07 Ω, 0,1645 V val en 0,3866 W. Ruimte op de 90W-adapter is nominaal aanwezig.
- Regelbeslissingen zijn losgemaakt van Arduino; de firmware heeft expliciete statusversheid, UINT-tijdrekening, annulering van ijking, plausibiliteitschecks en behoud van oude ijking. Beide productiebuilds slagen.
- Gekozen grove mat en terugkeer van fijn stof zijn eerlijk beschreven. Er wordt geen H13-/fijnstofrendement aan deze mat toegeschreven.
- De ergonomische envelop is concreter dan een algemene comfortclaim: bij bovenvlak op 734 mm ligt de moduleonderkant op **632 mm**, dus **68 mm onder de onderzijde** van het 34mm-blad; moduleprojectie voorrand ongeveer 195–405 mm, frame 189–411 mm. Een knieën-/stoel-/handenenvelop moet nog digitaal als gebruiksvoorwaarde worden vastgelegd; afwezigheid van een fysieke werkplekproef wordt niet gescoord.
- Onderhoud is grotendeels van boven ontworpen, met uitneembare cassette en in hoofddocumenten een gesloten afvalroute. De fout in het bouwschema is concreet corrigeerbaar.

## 5. Gebiedsscores /10 en gewogen totaal

Dit is uitsluitend een **ontwerpmaturiteitsscore**. Onuitgevoerde fysieke tests tellen niet als aftrek. Afgetrokken wordt voor aantoonbare inconsistentie, ontbrekende ontwerpinput, ongedefinieerde toleranties of implementaties die hun eigen specificatie niet dragen. Om dubbeltelling te beperken ligt elke bevinding primair bij één gebied.

| Gebied | Gewicht | Score /10 | Primaire reden |
|---|---:|---:|---|
| CAD | 15% | 7,0 | Goede nominale geometrie en cassette-reconstructie; pakking/toleranties niet volledig ontworpen. |
| Exports | 15% | 8,5 | 13 gesloten meshes en exact rooster-DXF; verouderde fabricagebestanden en geen volledige officiële kernelregeneratie binnen levering. |
| Lucht | 20% | 4,5 | Heldere vangstrekening; dun plenum, filterinvoer en duty/rpm-relatie onvolledig, gelijktijdige geluid-/vangsthaalbaarheid open. |
| Filtratie | 15% | 6,0 | Gekozen beschermingsconcept expliciet; afdichting en fysieke betekenis van alarmdrempel nog niet sluitend. Grove klasse op zichzelf niet bestraft. |
| Elektrisch | 10% | 6,0 | Nominale vermogensmarge goed; zekeringcoördinatie en thermische grensberekening niet sluitend. |
| Firmware | 10% | 6,0 | Beide builds slagen en structuur verbeterd; ramp- en koppeltegenvoorbeelden, incomplete gedragsdekking. Native tooltekort niet bestraft. |
| Ergonomie | 5% | 7,0 | Concrete plaats-/hoogtematen; nog geen digitaal gespecificeerde gebruikers-/stoelenvelop. Geen aftrek voor ontbreken fysieke proef. |
| Onderhoud | 5% | 6,5 | Bereikbare cassette en afvalroute; conflicterend uitklopadvies en isolatiestap ontbreken. |
| Documentatie | 5% | 5,5 | Veel samenhang, maar maten, USB-montage en kosten niet volledig gesynchroniseerd. |
| **Gewogen totaal** | **100%** | **6,275 → 6,3/10** | **Som gewicht × gebiedsscore. Geen statistisch betrouwbaarheidsinterval.** |

## 6. Top-5 ontwerpacties en afzonderlijk ongescoord prototypevalidatieplan

### Top-5 ontwerpacties

1. **Herontwerp filterbewaking en bijbehorend luchtmodel** — N02/N08: echte meetgrootheid, minimum-Q-grens, rpm/duty-relatie en 3mm-plenum opnemen; alle toegestane standen digitaal doorrekenen.
2. **Werk afdichting en tolerantieketen af** — N01/N07: geïntegreerde pakkinggeometrie, echte filtercompressie, BOM en reproduceerbare passing.
3. **Corrigeer zachte start en koppelprotocol** — N03/N06/N11: tijdonafhankelijke ramp, exclusieve koppeling en resetbeleid met gerichte regressietests; native suite daarna op een beschikbare hostcompiler uitvoeren.
4. **Sluit elektrisch/thermisch dossier** — N04/N09: juiste warmtebronnen, omgevings-/deratinggrenzen, exact zekeringtype en tijd-stroomcoördinatie; gebruikslimiet overeenkomstig bewijs.
5. **Synchroniseer veilige montage/onderhoud en leveringsmanifest** — N05/N10: uitklopadvies verwijderen, spanningsloos onderhoud expliciet, gatloos USB-printje correct monteren, oude uitvoer uitsluiten.

### Ongescoord prototypevalidatieplan

Deze proeven zijn latere validatie, niet de acceptatiecriteria voor bovenstaande ontwerpacties en niet verwerkt als tekort in de score.

| Stap | Uitvoering | Vastlegging en toets |
|---|---|---|
| Werkpunt en vangst | Q-/druk-/rpm-/vermogenreeksen per stand, schoon en gecontroleerd beladen; handen/frees op 5/10/15 cm. | Revisie, werkelijk filter, meteronzekerheden en herhalingen; vergelijk met digitale curves, ≥0,5 m/s op benoemde werkhoogte. Rapporteer spreiding, geen schijnprecisie. |
| Filter/bypass en blootstelling | Deeltjesmetingen met maatfracties vóór/na unit en op ademhoogte; herhalen na filterwissels. | Maak onderscheid tussen media-efficiëntie, bypass en totale werkplekconcentratie; beroepsmatige beoordeling door bevoegde deskundige. ISO-coarse-label is geen PM1-garantie. |
| Akoestiek | Oorposities van beide gebruikers, vaste achtergrond en afstand, samen met daadwerkelijk geleverd debiet. | Toets de expliciete dagstand-/geluideis in dezelfde toestand, niet in een afzonderlijke gunstige stand. |
| Warmte/elektriek | Worst-case benoemde omgeving, normale dagstand en herhaalde boost; stromen, contact-/adapter-/kunststoftemperaturen. | Vergelijk met geselecteerde derating-/zekering-/materiaalgrenzen. De bestaande eis “4 uur 100%” vergt een aparte testmodus omdat normale firmware na 120 s terugvalt. |
| Fouten | Sensor los/CRC/omgekeerde slang, blokkade, radioverlies, simultaan koppelen, afzonderlijke reset, UIT bij elk ijkpunt. | Log tijdgestempelde opdracht, duty, rpm, druk, status en UI; toets na digitale regressietests op echte hardware. |
| Mechanica/gebruik/onderhoud | Passingen, klauw-/plugbelasting en kruip, grootste gekozen gebruiker/stoel, herhaalde spanningsloze filterwissels, morsen en bereikbaarheid. | Toets vooraf digitaal vastgelegde enveloppen en procedures; verbeter ontwerp waar model en prototype afwijken. |

## 7. Verworpen/ongefundeerde claims en grenzen van conclusies

- **“Alles uit dezelfde revisie, dus alles consistent”**: verworpen; dezelfde 6.1-titel staat boven een expliciete uitklopinstructie en onjuiste USB-montagestap.
- **“16/16 geslaagd, dus de regellogica klopt”**: eerdere lokale testclaim niet zelfstandig bevestigd; de aangeleverde suite mist aantoonbaar de 5ms-ramp en koppeling binnen het bestaande venster. Buildsucces is geen gedragstest.
- **“Zachte start maximaal 50%/s”**: in huidige formule onjuist bij kleine tijdstappen. **“Daarom blijft aanloop binnen zekeringcurve”** volgt ook na reparatie niet zonder stroomgegevens.
- **“Rittal-weerstand veilig aan hoge kant geschat”**: niet aangetoond door uitsluitend klasse/dikte van een ander medium. De doorgerekende band omvat deze onzekerheid niet. Geen niet-gelezen leveranciersbron als bewijs opgevoerd.
- **“Dubbele druk is dubbel filterverlies en altijd tijdig vervangen”**: verworpen als algemene uitspraak; meetlocatie, veranderd debiet en fan-afsluitdruk leveren expliciete modeltegenvoorbeelden.
- **“Aangedrukte mat en rand zijn luchtdicht”**: niet bewezen door nominale botsingsvrije CAD. Afdichting vereist een ontworpen compressie-/tolerantieketen; CAD kan geen werkelijke lekdichtheid certificeren.
- **“141 cm² effectief roosteroppervlak”**: huidige contouren leveren 125,595 cm² binnen het gekozen cassettevak. De rekeninvoer gebruikt al ongeveer deze juiste waarde; dit is primair documentinconsistentie, geen extra 10,9% rekenfout bovenop het huidige rekenblad.
- **“80% blijft koel genoeg / PETG blijft onder 60 °C”**: te stellig zolang lokale dissipatie, oppervlaktetemperaturen en derating niet volledig zijn gemodelleerd. Luchttemperatuur is niet automatisch adapter- of kunststoftemperatuur.
- **“Stille bronafzuiging”**: geen bewezen gelijktijdige prestatie. De eigen geluidsschatting ligt bij 250 m³/h boven de benoemde oorpositie-eis; een echte definitieve geluidswaarde is niet berekend of gemeten.
- **G3/ISO coarse 50% als fijnstofbescherming**: niet afleidbaar; het aandeel dat als fijn stof terugkeert is zonder fractionele efficiëntie en bronverdeling niet numeriek te bepalen. Het gekozen motorbeschermingsconcept is wel expliciet en wordt niet als H13-oplossing beoordeeld.
- **Geen volledige v2-delta en geen volledige officiële CAD-kernelcontrole**: onder de leesbeperking en onvolledige meegeleverde toolketen niet mogelijk. De statusmatrix maakt die onzekerheid zichtbaar in plaats van historische details te verzinnen.

De score is geen salonvrijgave, keuringsverklaring, blootstellingsgarantie of voorspelling van gemeten prestaties. De concrete ontwerpacties kunnen met digitale controles worden gesloten; het prototypevalidatieplan staat daarvan los.
