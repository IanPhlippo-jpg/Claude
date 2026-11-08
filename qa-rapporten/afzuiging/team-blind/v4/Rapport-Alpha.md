# Onafhankelijke ontwerpbeoordeling afzuiging v4

## 1. Eindoordeel

**Gewogen ontwerpscore: 6,6/10 (onafgerond 6,55).** De productiegeometrie en de ingebedde firmware zijn aanzienlijk beter controleerbaar dan een louter concept: alle elf STL's zijn gesloten, het DXF klopt met de laserlussen en beide firmwaretargets compileren. Het ontwerp is geschikt voor gerichte verdere engineering, maar nog niet voor een ontwerpvrijgave: de filterafdichting, productspecifieke filterprestaties, werkelijk begrensde luchtmodellen, elektrische fouttoestanden en mechanische montagemarges zijn onvoldoende onderbouwd.

Dit is een beoordeling van het **digitale ontwerp**, niet van een afgebouwd toestel. Geen puntenaftrek voor het ontbreken van een prototype, fysieke meetresultaten, een lokale hostcompiler of de niet meegeleverde CAD-library. Scores zijn gemotiveerde technische beoordelingen, geen statistisch geschatte betrouwbaarheid of certificering.

| Gebied | Gewicht | Score /10 | Motivering |
|---|---:|---:|---|
| CAD | 15% | 7,0 | Hoofdmaten, serviceopening en permanent vingerrooster controleerbaar; afdichtings- en krachtketen niet volledig getolereerd. |
| Exports | 15% | 8,5 | Elf gesloten, consistent georiënteerde enkelvoudige STL-meshes; DXF/lussen overeenstemmend; revisie 7.0 in gecontroleerde PDF's. Geen volledige B-rep-herbouw uitgevoerd. |
| Lucht/geluid | 20% | 6,0 | Werkpuntberekeningen reproduceerbaar, maar scenario-envelop is geen bewezen bovengrens; volfiltereis niet gehaald op dagstand; vrijwel geen geluidsmarge. |
| Filtratie | 15% | 5,0 | Exact passend handelsfilter gekozen; efficiëntiecurve en pakkingkarakteristiek ontbreken als ontwerpinvoer. |
| Elektrisch/thermisch | 10% | 5,5 | Nominaal vermogensbudget plausibel; ontbrekende hardwarematige veilige toestand bij 5V-uitval en onbeheerst morspad. |
| Firmware | 10% | 7,0 | Beide embedded builds geslaagd; statische foutafhandeling duidelijk; hosttests niet uitgevoerd en model/code-koppeling niet werkelijk bewaakt. |
| Ergonomie | 5% | 6,5 | Werkplek expliciet uitgewerkt; 618 mm vrije hoogte is conditioneel en enkele onderbladmaten zijn fout benoemd. |
| Onderhoud | 5% | 7,5 | Bovenlangs wisselen en gesloten zakprocedure; geen uitkloppen; afdichtingsherhaalbaarheid vraagt een specifieker ontwerp. |
| Documentatie | 5% | 6,5 | Veel expliciete aannames en goede vrijgavepoorten; tegelijk te stellige prestaties, enkele interne tegenstrijdigheden en onvoldoende brontraceerbaarheid. |

Geen bevinding als **Kritiek** geclassificeerd: er is binnen deze digitale controle geen bewezen onmiddellijk catastrofaal defect vastgesteld. **Major** betekent een relevante ontwerp- of bewijsleemte die vóór ontwerpvrijgave moet worden gesloten; het betekent niet dat falen fysiek is waargenomen.

## 2. Uitgevoerd onderzoek

### Scope en integriteit

Gelezen: de neutrale casus, het formaat, `src-v4` en voor een eigen bestands-/inhoudsdiff de primaire bestanden van `src-v3`. Niet gelezen: voorlopige v4-oordelen, findings-bestanden, andere teamrapporten, eerdere eindverslagen of andere inzendingen. De broninhoud is niet aangepast. Bij een Python-import ontstond onbedoeld één `__pycache__/berekeningen.cpython-313.pyc`; dit eigen bijproduct is verwijderd. Eindcontrole: exact dezelfde **111 bestanden en SHA-256-inhoudshashes** als bij aanvang. Dit tijdelijke cache-incident wordt uitdrukkelijk niet als volledige schrijfloosheid voorgesteld.

Alle uitvoerende generators en builds draaiden verder op een tijdelijke kopie op de box. Geen andere computer gebruikt en geen personen benaderd.

### Werkelijk uitgevoerde controles

- `python3` met `pathlib`, `hashlib`, `json` en `difflib`: inventaris, SHA-256-vergelijking, primaire revisiediff en vergelijking van KCAD-deelinhoud met assemblage-inbeddingen. De assemblage bevat **80 plaatsingen**. Verschillen `format`/`kind` zijn containers, geen geometrische revisiemix. De tweede adapterklem heeft bewust afwijkende schetsinhoud; niet als automatisch bewijs van een fout aangemerkt.
- `uv venv` en installatie van `trimesh`, `numpy`, `shapely`, `scipy`, `networkx`, `ezdxf` en PlatformIO in een geïsoleerde analyseomgeving. Geen projectbroninstallatie of laptopwrite.
- `python docs/berekeningen.py` op de kopie: exit 0; rekenblad opnieuw gegenereerd. Dat herhaalt de bronberekening en valideert niet de aannames.
- **Eigen onafhankelijke scalaire berekening**, zonder functies uit het bronrekenblad: lineaire interpolatie van de opgegeven fanpunten, bisectie van fan- en systeemcurve en afzonderlijke berekening van plaatverliezen. Bij 75/80/100%: respectievelijk **253,624 / 276,051 / 366,552 m³/h**, zonder extra plenumverlies en met de nominale luchtweg. Overeenkomst met de brontabel is rekenkundig bevestigd.
- `trimesh.load_mesh(..., process=True)`: alle elf productie-STL's hebben `is_watertight=True`, consistente winding en één gesloten component. Dit bewijst geen afwezigheid van alle zelfdoorsnijdingen, geen printsterkte en geen onderlinge assemblagebotsingen. Gemeten begrenzingen stemmen grotendeels met de stukmaten overeen; zie dekselafwijking hieronder.
- STL-doorsnede van de instroomplaat op 1,5 mm boven de printbasis: gesloten snijcontouren; herhaalde spleetbreedten **10,4 mm**. Samen met de bronmaten ondersteunt dit het nominale vingerrooster. Geen volledige IEC-probe-B-keuring, vervormingsanalyse of alle-oriëntatiesproef uitgevoerd.
- `ezdxf.readfile(laser/rooster.dxf)` en Shapely-polygonen: **219 gesloten LWPOLYLINE-contouren**, eenheden mm; 218 openingen; buitenoppervlak **49.252,374 mm²** en totaal openingsoppervlak **17.781,032 mm²**. De DXF-oppervlakten stemmen met `rooster.loops` overeen. Boven het nominale filter: **12.106,571 mm² = 121,066 cm²**; minimumafstand tussen twee openingspolygonen **1,60035 mm**, naar de buitenrand **11,0 mm**. Geen universele minimumsleufbreedte van elke contour bewezen.
- `pdftotext -layout` voor de verzamel-PDF, werktekeningen, bouwschema en elektrisch schema: revisie 7.0, CU20013 en gewijzigde componenten teruggevonden. Tekstuele consistentie gecontroleerd; niet elke maatpijl visueel of elk SVG-element nagemeten.
- `pio run -e module -e knop` op de kopie, **espressif32 6.9.0 / Arduino 2.0.17**, GFX 1.5.0: **beide geslaagd**. Knop: 44.508 B RAM, 887.525 B flash; module: 38.652 B RAM, 746.792 B flash. Narrowing-waarschuwingen kwamen uit de externe RGB-panel-library; geen eigen compilefout. Geen flash of hardwaretest uitgevoerd.
- `pio test -e native`: **niet uitgevoerd tot testresultaat**, bouw faalde met `g++: not found`. Installatiepoging via apt strandde op HTTP-500 van de Debian-bron. De 22 `RUN_TEST`-registraties zijn statisch gelezen; de bronclaim “22/22 geslaagd” is hier niet onafhankelijk als uitvoering bevestigd. Dit is een gereedschapsbeperking, geen bewezen firmwarefout.
- Negatieve test op uitsluitend de kopie: vervangfactoren in `regel.h` tijdelijk op **9,0 / 9,0 / 9,0** gezet en het rekenblad opnieuw gedraaid: nog steeds **exit 0**. De beweerde automatische koppeling met het echte headerbestand bestaat dus niet; daarna is de kopie hersteld.
- Mechanisch en elektrisch handmatig herberekend: buigspanning, hefboomgeometrie, rubberveerschatting, leidingverlies, inschakel-I²t, vermogens- en thermische marges. Geen FEA, CFD, volledige tolerantie-Monte-Carlo of volledige CAD-kernel-regeneratie uitgevoerd; de import `../lib/schets.mjs` is niet aanwezig in het aangeleverde bronpakket.

### Herberekende kerncijfers

| Grootheid | Eigen resultaat | Betekenis |
|---|---:|---|
| Q voor 0,5 m/s op 10 cm | 189,541 m³/h | Correct binnen de gekozen Dalla-Valle-formule; geen aangetoonde vangst met handen/frees. |
| Open roosterfractie t.o.v. 201 × 201 | 0,29975 | Label “f = 0,35” is fout; de gebruikte formule rekent wel met ongeveer 0,30. |
| Luchtweg bij 250 m³/h, zonder filter/plenum | 66,439 Pa | Rekenkundig bevestigd; verliescoëfficiënten blijven aannames. |
| Filter bij 250 m³/h | 130,195 Pa | Uit 115 Pa op het volle front en verkleind vrij front; geen CU20013-productcurve. |
| Plenumscenario | 6,5 mm; 2.715,9 mm²; 12,600 m/s; 47,630 Pa | Correcte uitkomst van de gekozen geometrie en ζ; geen bewezen uiterste weerstand. |
| Ongunstig schoon model, 75/80% | 215,612 / 233,594 m³/h | Inclusief luchtwegfactor 1,5 en extra plenumscenario. |
| Zelfde model, “vol” filter, 75/80/100% | 141,107 / 155,913 / 217,884 m³/h | Dagstand haalt de 190-eis bij het gedefinieerde volle filter niet. |
| Geluid op 0,5 m, 75/80/100% | 68,774 / 70,175 / 75,021 dB(A) | Model, niet toestelgeluid; 80% zit zelfs onafgerond boven het doel van 70. |
| M8 0,25 mm², lus 1 m, 2,35 A | 0,1645 V; 0,3866 W | Nominale koperberekening klopt; contactweerstand niet inbegrepen. |
| 470 µF, 24 V, R = 0,1 Ω | 1,3536 A²s | Correct voor een ideaal RC-laadproces; geen fan-aanloop-I²t. |
| Nominaal piekbudget op 24 V | ongeveer 60,98 W / 2,54 A | 67,8% van 90 W; afgeleid uit nominale fanlast en geschatte 5V-piek. |
| Rubberschatting na één slag | 22,39 / 26,88 / 32,07 N | Alleen binnen hardheid/lineair veermodel van de bron. |
| Toelaatbare kracht volgens eigen 9,4MPa-criterium | 45,12 N bij L=10; 34,05 N bij L=13,25; 26,54 N bij L=17 mm | De contactgeometrie verandert de geclaimde montagemarge wezenlijk. |

### Primaire productbronnen geopend

Geraadpleegd op 8 november 2026, Europe/Brussels (CET):

1. [Sanyo Denki 9TG24P0S01](https://products.sanyodenki.com/en/sanace/dc/centrifugal-fan/9TG24P0S01/): Ø175 × 69, 24 V, 2,35 A, 56,4 W, 3.900 rpm, 11,6 m³/min, 609 Pa, 69 dB(A), 750 g bevestigd. Dit zijn geen gelijktijdige toestelwerkpuntwaarden.
2. [MANN CU20013](https://www.mann-filter.com/en/catalog/search-results/product.html/cu20013_mann-filter.html): **195 × 145 × 30 mm**, deeltjesfilter en genoemde voertuigtoepassingen bevestigd. Geen productspecifieke drukcurve of 0,3µm-rendementscurve op de geopende pagina gevonden; algemene marketingteksten vervangen die curves niet.
3. [Mean Well GST90A-specificatie](https://www.meanwell.com/Upload/PDF/GST90A/GST90A-SPEC.PDF): 24 V / 3,75 A / 90 W, 145 × 60 × 32 mm, nominale efficiëntie 90%, overlast 110–150% en hiccup bevestigd. Deellastefficiëntie van exact 88% is niet daarmee gegarandeerd.
4. [Pololu D24V10F5](https://www.pololu.com/product/2831): 5 V, maximaal 1 A, thermisch afhankelijke continue stroom, kortsluit-/overstroombeveiliging en thermische afschakeling bevestigd. Fabrikant adviseert boven 20 V een lokale elco ≥33 µF / ≥50 V tegen LC-pieken. Het schema bevat 470 µF / 35 V, maar de afstand/inductantie naar de regelaar is niet gespecificeerd; niet zonder meer gelijkwaardig verklaard.
5. [Fabrikantcatalogus, kopie op Alldatasheet, pagina 2](https://www.alldatasheet.co.kr/html-pdf/1259486/SANYODENKI/9TG24P0S01/1411/2/9TG24P0S01.html): fabrikantgegevens met nozzlevoorwaarde 109-1073, 25kHz-PWM en nul-toerental bij 0% PWM. De tussenpunten van de grafiek zijn niet onafhankelijk opnieuw gedigitaliseerd; de rekenbladcurve is daarom niet als volledig extern geverifieerd aangemerkt.

C&K-, Bel Fuse-, binder-, VIEWE- en PETG-specificaties zijn niet allemaal opnieuw tegen hun exacte primaire datasheet geverifieerd; daarvoor blijven bronclaims onderscheiden van bevestigd bewijs.

## 3. Gecontroleerde wijzigingen tegenover src-v3

De eigen vergelijking toont **58 gewijzigde gemeenschappelijke bestanden**, **16 toegevoegde** en **19 verwijderde** bestanden. Toegevoegd zijn onder meer het CU20013-filter, foam, klauwrubber en de materiaalstaat. Verwijderd zijn de oude filtercassette/cassetterand, oude Rittal-filterrepresentatie en oude laserklauwen. Hoofdwijzigingen zijn zelfstandig in de bron vastgesteld:

- Romponderzijde **−96 → −110 mm**, fan-top **−27 → −41 mm**: 14 mm dieper voor het dikkere filter. Bodemplaatonderzijde nu −116 mm t.o.v. het tafelbovenvlak.
- Filter van vlakke Rittal-mat/cassette naar **195 × 145 × 30 mm** CU20013 met vrij front **135 × 185 mm**, steunrand en 6 × 4 mm foam.
- Permanent geprint vingerrooster toegevoegd; productie-STL bevat de ribben.
- Rubber **4 mm** op de moduleklauwen, groter zwaaivenster en verplaatste assemblageklauwen; krachtbeperking blijft deels modelmatig.
- Toerentalregeling, boosttegoed, minimum voor filterbewaking **75%**, dagmaximum **80%** en vervangfactoren **1,08 / 1,19 / 1,44** in de primaire code vastgesteld.
- D502-schakelaar, DC-geclassificeerde zekeringclaim, diode en USB-C-bronweerstanden teruggevonden in schema/BOM. Exacte fabrikantkwalificaties niet voor alle delen extern bevestigd.
- Eén zakprocedure voor onderhoud teruggevonden in README en bouwschema.

### Historische ID-aftekening

De actuele bron noemt alleen **V3-02, V3-07 en V3-11** met herkenbaar onderwerp. Het lezen van eerdere rapporten is in de opdracht expliciet uitgesloten. Daarom worden de overige ID's hieronder afzonderlijk verantwoord, maar **niet verzonnen gekoppeld aan een onderwerp of ten onrechte als opgelost bestempeld**. “Open – niet traceerbaar” is een administratieve bewijsstatus, geen extra ontwerpaftrek.

| Historisch ID | Aftekening | Zelfstandig vastgesteld bewijs |
|---|---|---|
| V3-01 | Open – niet traceerbaar | Oorspronkelijke ID-definitie niet beschikbaar binnen de toegestane blinde scope. |
| V3-02 | Deels | `docs/Vrijgave-en-meetplan.md:41–45`; foamrand aanwezig, maar geen productspecificatie/compressie-tolerantieketen; bevinding Q01. |
| V3-03 | Open – niet traceerbaar | ID-definitie niet beschikbaar. |
| V3-04 | Open – niet traceerbaar | ID-definitie niet beschikbaar. |
| V3-05 | Open – niet traceerbaar | ID-definitie niet beschikbaar. |
| V3-06 | Open – niet traceerbaar | ID-definitie niet beschikbaar. |
| V3-07 | Deels | `maak-afzuiging.mjs:47,455–462`; rubber en één-slagprocedure aanwezig; hefboom/tolerantiemarge nog niet sluitend, Q06. |
| V3-08 | Open – niet traceerbaar | ID-definitie niet beschikbaar. |
| V3-09 | Open – niet traceerbaar | ID-definitie niet beschikbaar. |
| V3-10 | Open – niet traceerbaar | ID-definitie niet beschikbaar. |
| V3-11 | Deels | `maak-afzuiging.mjs:327–336`; nominale roostermaten geverifieerd; morsroute nog rechtstreeks naar fan, Q05. Geen fysieke probe-claim. |
| V3-12 | Open – niet traceerbaar | ID-definitie niet beschikbaar. |
| V3-13 | Open – niet traceerbaar | ID-definitie niet beschikbaar. |
| V3-14 | Open – niet traceerbaar | ID-definitie niet beschikbaar. |
| V3-15 | Open – niet traceerbaar | ID-definitie niet beschikbaar. |

## 4. Sterke punten en bevindingen

### Sterke punten

- De gekozen fanvariant en het filter zijn exact benoemd; hoofdspecificaties en filtermaat zijn op primaire productpagina's bevestigd.
- Werkpunten worden bepaald uit een fan-/systeemkruising, niet door vrijdebiet en afsluitdruk samen als prestaties te presenteren.
- De permanente afscherming blijft bij filterservice aanwezig. Nominale 10,4mm-spleten zijn ook in de productie-STL gevonden.
- Alle elf STL's gesloten en enkelvoudig; lasersnede en lussen hebben overeenstemmende aantallen en oppervlakten.
- Firmware scheidt regelhart en hardware; UIT tijdens ijken, drukversheid, meetbereik en boostduur zijn expliciet geprogrammeerd. Beide embedded builds slagen.
- Geen onbewezen HEPA-claim of dampvangst; zakprocedure en ontwikkelstatus zijn duidelijk beschreven.

### Gededupliceerde bevindingentabel

Bronpaden hieronder zijn relatief aan `src-v4`. Zekerheid betreft het beschreven digitale bewijs, niet een geschatte kans op een ongeval.

| ID | Ernst | Exact bewijs | Technisch gevolg | Concrete ontwerpactie | Digitaal acceptatiecriterium | Zekerheid |
|---|---|---|---|---|---|---|
| Q01 | Major | `maak-afzuiging.mjs:55–56,253–259,311–316`; `docs/Vrijgave-en-meetplan.md:41–45`; `README.md:36` | Filter ligt zonder positieve voorspanning op generieke tochtband. 130 Pa × 0,028275 m² geeft circa **3,68 N**; over circa 4.000 mm² pakking is dat slechts circa **0,9 kPa** gemiddelde druk. Zonder compressiekromme, vlakheid en hoogtevariatie bewijst dit geen sluiting. De claim “geen lucht langs” volgt niet uit geometrische overlap. | Kies exact foam met kracht-/compressiedata en tolerantie; leg de benodigde indrukking vast of voeg positieve mechanische aandrukking toe. | Worst-case maat- én krachtketen geeft rondom de vereiste minimumcompressie bij de laagste beschermende stand en toegestane filtervariatie; geen botsing met rooster en geen afhankelijkheid van een niet-gekwalificeerd foam. | Hoog voor ontbrekende specificatie; feitelijke lekkage onbekend. |
| Q02 | Major | `docs/berekeningen.py:65–71`; `README.md:9`; `docs/Vrijgave-en-meetplan.md:32–38` | Efficiëntie **50–70% bij 0,3 µm** en >90% vanaf 3 µm zijn geen getoonde CU20013-specificaties. Druk wordt overgenomen van andere interieurfilters en opgeschaald. Dat is bruikbaar als scenario, niet als gegarandeerde filtratie of verdedigbare recirculatieprestatie. | Leg productspecifieke leverancierscurves of een expliciet conservatief onbekend-prestatiemodel vast; scheid opvang bij bron van filterrendement en ruimteblootstelling. | Iedere numerieke productprestatie heeft exact product, debiet/face velocity, deeltjesgrootte, testmethode en bron; anders zichtbaar “onbekend/scenario”, zonder beschermingsgarantie. Geen willekeurige noodzakelijke filterklasse opleggen. | Hoog. |
| Q03 | Major | `docs/berekeningen.py:14–16,46–53,248–270,273–301`; `docs/Berekeningen.md:79,89` | **47,63 Pa** bij 250 m³/h is een gekozen ζ-scenario, geen bewezen bovengrens. Niet-uniforme filterbelasting en druk bij de excentrische meetpoort zijn niet gekoppeld opgelost. Fan-afleesonzekerheid ±15–25 Pa en nozzleverschil zitten niet in de zes scenario's. “Ongunstigste” en “≥10% marge” gelden alleen binnen het beperkte model. | Maak een gekoppeld filter/plenum-model met ruimtelijke weerstand en sensorpositie; voeg fan-, nozzle- en geometrie-onzekerheid toe. | Bronbare parameterintervallen en gevoeligheid; werkpunt en alarm vóór Q=189,541 m³/h voor alle beschermende standen in de onderbouwde envelop. Onbekende grenzen mogen niet als worst-case-bewijs worden aangemerkt. | Hoog voor modelbeperking; werkelijke afwijking onbekend. |
| Q04 | Major | `schema/maak-schema.mjs:147–153,191–194`; `firmware/src/module/main.cpp:13–17,61–65`; `docs/Berekeningen.md:119–120` | Bij verlies van 5/3,3 V verdwijnt de basisstroom van Q1 terwijl 24 V naar de fan kan blijven staan. PWM-laag/UIT is dan hardwarematig niet gegarandeerd; een hoge/open-PWM-toestand kan de softwarematige stand- en boostgrenzen omzeilen. Eén diode bewijst bovendien geen tweerichtingsisolatie van de USB-VBUS van een ongespecificeerde SuperMini-revisie. | Leg foutveilige hardwaretoestand vast voor 5V-kortsluiting, MCU-reset en Q1-onderbreking; specificeer de exacte board-powerpath en USB-isolatie. | Schema/FMEA met alle voedingscombinaties en componentfouten; aantoonbaar gekozen veilige fanstand zonder werkende MCU, geen onbedoelde VBUS-terugvoeding, voeding/thermiek ook voor die toestand doorgerekend. | Hoog voor verlies van actieve pull-down; exacte fanreactie op open PWM nog productspecifiek bevestigen. |
| Q05 | Major | `docs/Vrijgave-en-meetplan.md:63–69`; `docs/Materiaalstaat.md:28`; `maak-afzuiging.mjs:59–62,340–362` | Morsvloeistof mag volgens de beschreven route door filter en rooster rechtstreeks op waaier/motor terechtkomen. “Daar zit geen elektronica” is voor een elektronisch gecommuteerde BLDC-fan geen afdoende veiligheidsredenering; 24 V beperkt schokgevaar maar bewijst geen vloeistof-, brand- of oplosmiddelbestendigheid. | Ontwerp een gecontroleerd opvang-/afvoerpad buiten de fan en leg materiaal-/componentcompatibiliteit vast, of begrens aantoonbaar welke blootstelling de unit mag verdragen en hoe onveilig hergebruik wordt voorkomen. | Digitale doorsnede en foutanalyse volgen het vloeistofpad naar een veilige opvang/uitlaat; geen ongekwalificeerde vloeistofbelasting op motor of voeding; eventuele extra luchtweerstand terug in werkpuntmodel. | Hoog voor huidig pad; aard/omvang van fysieke schade onbekend. |
| Q06 | Major | `maak-afzuiging.mjs:43,47,438–446,455–462`; `docs/berekeningen.py:205–237`; `docs/Berekeningen.md:149–153` | Krachtmodel gebruikt **L=10 mm**, terwijl rubbercontact van **9,5 tot 17 mm** van de schroefas loopt; bij vlakke belasting ligt het midden op 13,25 mm. Eigen 9,4MPa-criterium geeft dan **34,05 N** i.p.v. 45,12 N; bij verschoven contact naar 17 mm **26,54 N**, onder de berekende bovengrens 32,07 N. Dat bewijst geen onmiddellijke breuk, wel een ontbrekende robuuste kruipmarge. Knopklauw heeft geen vergelijkbare krachtbegrenzing. | Gebruik werkelijk contactresultant en tolerantie/rotatie; beperk slag positief of verlaag klemkracht; dimensioneer ook de knopklauw op montagebelasting. | CAD-contactenvelop en krachtberekening blijven onder het gekozen, verantwoordde langetermijncriterium bij hardheid-, maat- en montagevariatie; moerdak en onderhuid inbegrepen; geen vertrouwen op alleen “handvast”. | Hoog voor geometrie/rekenverschil; kruipduur onbekend. |
| Q07 | Major | `docs/Berekeningen.md:18,34–38,75,89`; `firmware/include/regel.h:37,54–56` | Eis “190 m³/h ook met vol filter” is niet gelijk aan “tijdige vervangmelding”. Het eigen volle-filtermodel geeft bij 80% ongunstig **155,91 m³/h**, bij 75% **141,11 m³/h**. De normale bediening gaat niet boven 80%; 100% is tijdelijk. Een vroege waarschuwing kan een bruikbare keuze zijn, maar sluit de huidige volfiltereis niet. | Definieer één onderhoudseindpunt: vervanging bij de bewakingsgrens óf 190 m³/h tot de gedefinieerde einddruk. Pas eisen, UI en model daarop consistent aan. | Voor de gekozen definitie klopt Q≥189,541 m³/h tot het eindpunt in de onderbouwde envelop; waarschuwing en eventueel gebruiksbeperking zijn expliciet, zonder “75% beschermend bij ieder vol filter”. | Hoog, ook binnen het eigen model. |
| Q08 | Minor | `docs/berekeningen.py:157–170,283–304`; `firmware/include/regel.h:54–56` | Assert vergelijkt het model met een tweede handmatig ingevoerde factorlijst, niet met de echte header. Negatieve test met headerfactoren **9/9/9** blijft groen. Huidige waarden stemmen wel overeen. | Maak één gedeelde parameterbron of parse/verifieer de echte firmwareconstanten. | Een doelbewuste wijziging van factor of `beschermVanaf` in de header laat de controle falen; huidige waarden en alle tussenstanden slagen. | Hoog, uitgevoerd tegenvoorbeeld. |
| Q09 | Minor | `docs/berekeningen.py:138–140,329–337`; `docs/Berekeningen.md:93–101` | Model geeft **70,175 dB(A)** bij 80% op 0,5 m en slechts 0,226 dB marge bij 75%; afronden naar 70 maakt ≤70 niet waar. Geen marge voor kast, rooster, achtergrond of modelonzekerheid. “Stil” is niet uit dit rekenwerk afleidbaar. | Gebruik onafgeronde toetswaarden en een expliciet geluidbudget; kies een werkpunt of demping met berekende ruimte voor installatiebijdragen. | Numerieke eis wordt onafgerond gehaald met een verklaarde ontwerpmarge; lucht-/thermiekmodel verwerkt iedere akoestische wijziging. | Hoog voor rekenkundige marge; werkelijk geluid onbekend. |
| Q10 | Minor | `maak-afzuiging.mjs:42,62,77`; `README.md:29,148`; `docs/Vrijgave-en-meetplan.md:86,89`; `print/Knopdeksel.stl` | Onderzijde module is **116 mm onder bovenvlak = 82 mm onder ondervlak** van een 34mm-blad; vrije vloerhoogte **618 mm** klopt. Werkplekdocument noemt dit onjuist 116 mm “onder het blad”; box is 36 mm onder ondervlak, niet 71. Knopdeksel-STL is **4,9 mm** hoog inclusief pennen, README zegt 2 mm. | Genereer envelopmaten uit geometrie met eenduidig referentievlak, ook voor uitstekende pennen en connectoren. | README, werkplek, SVG/PDF en STL-envelop hebben identieke referentiematen; 618 mm blijft expliciet conditioneel voor de gebruiker. | Hoog. |
| Q11 | Minor | `schema/maak-schema.mjs:125–131`; `docs/Berekeningen.md:117–118`; `docs/berekeningen.py:48`; `README.md:203` | Schema zet **S1 vóór F1**, tekst zegt na F1. Roosterlabel noemt f=0,35 waar werkelijk 0,30 wordt gebruikt. USB-C-positie “18–26 mm onder bovenvlak” verwart onderbladreferentie: in CAD circa 52–56 mm onder bovenvlak. Deze tekstfouten geven onnodige montage-/reviewverwarring, geen bewezen fout in de gecontroleerde STL. | Corrigeer referentieteksten uit één parameter-/netbron; voer semantische controles uit, niet alleen revisiestempels. | Elektrische volgorde gelijk in schema en tekst; CAD- en handleidingcoördinaten omrekenbaar met 34 mm; fractielabel gelijk aan berekende waarde. | Hoog. |
| Q12 | Minor | `README.md:92–93`; `maak-afzuiging.mjs:79–80`; `docs/Berekeningen.md:154`; `docs/Vrijgave-en-meetplan.md:78–79` | Boxmontage noemt generieke “plug voor holle deuren” en vraagt ≥20 N, maar specificeert geen passend anker met toepassingsgebied voor circa 3mm-onderhuid en 28mm-boorgat. De lage gewichtslast bewijst geen passende klem-/montagebelasting. | Selecteer exact anker of ontwerp een beschreven lastspreider, inclusief draadlengte en montagelimiet. | BOM bevat type en bron; CAD toont gripbereik, vrije ruimte en lastpad; rekenbelasting inclusief stekkerbediening/montage met verklaarde veiligheidsfactor. | Hoog voor ontbrekende selectie; daadwerkelijke draagkracht onbekend. |

## 5. Verworpen of onbewezen claims

- **“Luchtdicht / geen lucht langs het filter.”** Niet bewezen door een rasterbemonstering, nominale CAD-contacten of 3,7 N zuigkracht. Er ontbreekt een getolereerde pakkingkrachtketen. Niet vastgesteld dat de unit daadwerkelijk lekt.
- **“CU20013 vangt 50–70% bij 0,3 µm.”** Niet productspecifiek bevestigd. De geopende MANN-catalogus bevestigt maat en productsoort, niet deze curve.
- **“De zes scenario's zijn worst-case en bewijzen 10% marge.”** Slechts scenario-uitkomst, geen probabilistische dekking, betrouwbaarheidsinterval of bewezen fysische begrenzing. Geen statistische zekerheid afleiden uit zes gekozen scenario's.
- **“75% is beschermend, ook met vol filter.”** Niet in de betekenis van de 300Pa-einddruk uit het rekenblad; tijdig vervangen is een andere, te expliciteren voorwaarde. Ook 0,5 m/s op 10 cm is een ontwerpdoel, geen universeel bewijs van blootstellingsveiligheid.
- **“Groen rekenblad bewaakt regel.h automatisch.”** Weerlegd door de uitgevoerde 9/9/9-mutatie. Huidige parameterovereenkomst is wel handmatig bevestigd.
- **“Het geluid voldoet aan ≤70 dB(A).”** De onafgeronde eigen modelwaarde is 70,175; geen toestelmeting. Een projectdoel van 70 dB(A) wordt niet tot wettelijke grens verheven.
- **“24 V betekent dat de morsroute veilig is.”** Verworpen als algemene redenering: schokgevaar is niet hetzelfde als materiaal-, motor- of brandschade. Geen explosieve atmosfeer of verplichte ATEX-classificatie verzonnen.
- **“Rubber begrenst de kracht op een bewezen veilige 22–32 N.”** Correcte uitkomst van een schattend veermodel, maar geen gekwalificeerde materiaalcurve of mechanische eindstop; verkeerde vaste hefboom vergroot de onzekerheid.
- **“Warmte in de box maximaal 44 °C.”** Alleen binnen 25°C-omgeving, opgegeven effectieve warmteoverdracht, efficiëntie en gemiddelde bedrijfscyclus. Herhaling van het bronmodel geeft bij continu vol bedrijf ongeveer **52,8 °C bij 25 °C omgeving**. Als gevoeligheidsvoorbeeld, met dezelfde overige modelparameters: circa **62,8 °C bij 35 °C omgeving**; dit is geen voorspelde salonmeting. Hotspots/contactwarmte en thermische capaciteit ontbreken; gemiddelde boostwarmte is geen bewezen piektemperatuur.
- **“22/22 tests slagen.”** In deze beoordeling niet herhaald wegens ontbrekende hostcompiler. Beide embedded builds zijn daarentegen daadwerkelijk geslaagd; een compile is geen geslaagde hardware- of regressietest.
- **“Eén revisie/commit bewijst alle exports.”** Gecontroleerde revisies, KCAD-inbedding en DXF/STL-eigenschappen ondersteunen consistentie; zonder volledige generator-/kernelherbouw geen universeel bewijs voor ieder maat- of uitvoerelement.

## 6. Top vijf ontwerpacties

1. **Sluit de filter- en pakkinginvoer.** Kies exact foam en definieer filtermaatvariatie, pakkingdruk, compressie en vlakheid. Leg productspecifieke efficiëntie en Δp vast of markeer die expliciet onbekend. Acceptatie: getolereerde CAD-krachtketen rondom dicht zonder onbenoemde materiaalkeuze; productclaims traceerbaar.
2. **Maak één consistent lucht-/bewakingscontract.** Definieer het vervangingseindpunt, koppel filter/plenum/sensor en voeg fan-/nozzle-onzekerheid toe. Acceptatie: voor iedere beschermende stand en onderbouwde parameterhoek blijft Q boven 189,541 m³/h tot het gekozen eindpunt; onafgeronde geluidtoets met ontwerpmarge. Een niet-onderbouwde bovengrens heet scenario, geen garantie.
3. **Ontwerp fouttoestanden hardwarematig.** Behandel 5V-uitval, open PWM, MCU-reset, USB-bronnen, lokale LC-pieken en vloeistofpad. Acceptatie: schema/FMEA geeft zonder MCU een gedefinieerde veilige toestand; toepasselijke vermogens-/temperatuurgevallen passen bij exact gespecificeerde componenten en omgevingsgrens; morsroute niet ongekwalificeerd door de motor.
4. **Herbereken de echte mechanische lastpaden.** Gebruik contactresultant 9,5–17 mm, werkelijke rubbercurve, instel-/overdraaimarge, knopklauw en exact boxanker. Acceptatie: geen overschrijding van het gemotiveerde langetermijncriterium in de contact-/tolerantie-envelop; concrete BOM en montagebegrenzing, geen alleenstaand “handvast”.
5. **Maak de digitale vrijgave zelfcontrolerend.** Eén gedeelde bron voor firmwarefactoren, grensstanden, maten en schemareferenties; mutatietest moet foutieve headers afkeuren; herhaal hosttests zodra een compiler beschikbaar is. Acceptatie: beide embedded builds blijven groen, alle 22 hosttests daadwerkelijk uitgevoerd, extra negatieve koppelingstests groen, export-enveloppen en documentmaten consistent en bronbestanden na controles hash-identiek.

### Afsluitend ongescoord prototypevalidatieplan

Onderstaande proeven zijn **geen gescoorde ontwerpfouten wegens hun huidige afwezigheid**. Ze zijn bedoeld om na sluiting van de digitale acties op één traceerbare revisie de resterende toestelonzekerheid te reduceren.

- **Lucht:** meet Q–Δp–rpm–vermogen op alle standen, schoon en tot het expliciete vervangingseindpunt. Meet druk ook op meerdere posities onder het filter om het ruimtelijke model en de ene sensorpoort te toetsen. Controleer vangst met twee handen, freesbewegingen en representatieve dwarsstroming.
- **Filter/afdichting:** bepaal fractioneel rendement en bypass met hetzelfde aerosol, debiet en deeltjesbereik, eerst productreferentie en vervolgens gemonteerde unit; controleer voor/na herhaalde wissels en verschillende toegestane filtermerken. Geen merkbare daling vervangen door een ongedefinieerde visuele lekclaim.
- **Elektrisch/thermisch:** instrumenteer regulator, adapterbehuizing, connectoren en lokale PETG-contacten; test normale bedrijfscyclus én ontworpen fouttoestanden bij de vastgelegde maximale omgeving. Voer USB-/5V-foutinjectie en veilige morsproef gecontroleerd uit, na voorafgaande risicobeoordeling.
- **Mechanisch/ergonomisch:** proefmontage in de exacte honingraattafel met geselecteerde ankers, klemkrachtmeting, overdraaimarge en kruip onder relevante temperatuur; servicecycli, probe-B-controle inclusief relevante kracht en de grootste beoogde gebruikers op werkhoogte.
- **Geluid en blootstelling:** meet LAeq op beide oorposities met afzonderlijk achtergrondniveau; laat ademzoneblootstelling bij representatief werk professioneel beoordelen. Een laag geluidniveau of een enkel rookfilmpje vervangt geen blootstellingsbeoordeling.
- **Statistiek:** registreer herhalingen, revisie, omgeving, instrumentonzekerheid en spreiding; rapporteer individuele resultaten en samenvatting. Kies steekproefomvang pas met het beoogde verschil, de toegestane faalkans en pilotvariantie; verzin geen betrouwbaarheid uit één unit. Iedere relevante ontwerpwijziging maakt een gerichte hertoets noodzakelijk.
