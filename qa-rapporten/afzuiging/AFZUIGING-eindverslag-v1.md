# Afzuiging nageltafel — eindverslag v1
## Blind vonnis van de rechter

**Voor Ian · 6 november 2026, 23:20 CET (Europe/Brussels)**  
**Onderzocht:** bronmomentopname van circa23:07 CET; vier geanonimiseerde rapporten.  
**Eindscore: 3,1/10. NIET vrijgeven voor productie uit de huidige bestanden en NIET gebruiken in de salon.**

Het concept mag verder als **gecontroleerd engineeringprototype**, nadat de eerstvolgende ontwerp-/veiligheidspoorten zijn vastgelegd. Het is geen afgekeurd idee, maar wel een onvoldoende bewezen en revisie-inconsistent eindproduct. De score beoordeelt **aangetoonde vrijgaverijpheid**, niet Claude’s inzet of een geschatte kans op letsel. De kritieke blokkade blijft gelden ongeacht het gemiddelde.

**Kort samengevat:** een goede modulaire basis met echte CAD, elektronica en compileerbare firmware, maar te weinig bewijs dat fijne nagelstof veilig wordt vastgehouden; verkeerde/defecte productiebestanden; en concrete softwarepaden die een betrouwbaarder beeld kunnen geven dan de echte meet-/bedrijfstoestand. Eerst herstellen en meten, niet alvast de tafel frezen.

## 1. Blind proces en beslisregel

De vier rapporten zijn uitsluitend gelezen als **Gamma → Alpha → Delta → Beta**. De niet-geanonimiseerde invoermap is niet geopend; er is geen auteurskoppeling gezocht of afgeleid. Identiteiten of rollen spelen geen rol in dit vonnis. Schrijfstijl/onderwerpkeuze kan nooit perfecte onherkenbaarheid garanderen; dit was daarom een beoordeling onder geanonimiseerde labels, geen claim van mathematisch perfecte blindering.

Beoordeeld op logica, bronverwijzing en relevantie. Waar nodig vergeleken met het eigen technische rapport, de lokale bron en bestaande bewijslogs. Nieuwe, belangrijke claims over UI, herstart en buildwaarschuwingen zijn rechtstreeks tegen de bron gecontroleerd. **Viermaal hetzelfde ontbreken van praktijkbewijs is niet hetzelfde als vier onafhankelijke fysieke tests.**

Beslisregel: best onderbouwde inhoud wint; bij gelijkwaardig bewijs de strengste beoordeling. Oordelen worden niet gemiddeld om een compromis te krijgen. De veiligheids-/blootstellingspoorten gaan vóór een mooie score. De oorspronkelijke technische deelrapportscore4,3 wordt vervangen door deze eindscore3,1: de weging blijft gelijk, maar meerdere eerdere voldoendes waardeerden aanwezige functies te ruim ten opzichte van ontbrekende validatie en aantoonbare foutpaden. Dit is een strengere bewijsweging, geen bewijs dat de constructie in de tussentijd verslechterde.

## 2. Gewogen eindscore en deelgebieden

| Gebied | Definitieve score | Gewicht | Beslissing bij verschil |
|---|---:|---:|---|
| CAD en nominale maatvoering | 6/10 | 15% | Alle vier:6; parseerbaar en coherent, geen kernel-/passing-/bewegingsbewijs. |
| Exports en productierevisie | 2/10 | 15% | Alle vier:2; harde maatverschillen, vier defecte en vier ontbrekende STL-typen. |
| Luchtprestatie en geluid | 3/10 | 20% | Alle vier:3; geen gemeten werkpunt, bronvangst of oorpositiegeluid. |
| Filtratie en blootstelling | 1/10 | 15% | Alpha/Beta/Delta:1 versus Gamma:2; gelijk feitenbewijs, strengste beoordeling wint. |
| Elektrisch en thermisch | 4/10 | 10% | Beta/Gamma/Delta:4 versus Alpha:5; nominale architectuur is nog geen eindveiligheid. |
| Firmware en foutgedrag | 3/10 | 10% | Alpha/Beta:3 versus Gamma/Delta:4; bronpaden en UI/herstart versterken de strengste beoordeling. |
| Ergonomie | 4/10 | 5% | Alpha/Delta:4 versus Beta/Gamma:5; dezelfde afwezige werkplekvalidatie, strengste wint. |
| Onderhoud en reinigbaarheid | 2/10 | 5% | Alpha/Beta/Delta:2 versus Gamma:3; uitkloppen staat ook werkelijk in de actieve UI. |
| Documentatie en overdraagbaarheid | 3/10 | 5% | Alpha/Beta:3 versus Gamma/Delta:4; uitgebreide maar niet eenduidig bouwbare levering. |
| **Totaal** | **3,1/10** | **100%** | **Som(score × gewicht)/100 = 3,10. Geen vrijgave door middelen.** |

De ongewogen gemiddelden3,2/3,3 in Beta/Delta zijn rekenkundig correct, maar zijn niet het definitieve gewogen beoordelingsmodel. De gewichten zijn behouden uit de technische QA: CAD15, exports15, lucht20, filtratie15, elektrisch10, firmware10, ergonomie5, onderhoud5, documentatie5 procent. Geen kunstmatig betrouwbaarheidspercentage of schadefrequentie uit deze getallen afleiden.

## 3. Vonnis-matrix

Schaal1–5:5=sterk. **Validiteit** betekent logica en bewijslast; **Bruikbaarheid** betekent concrete, toetsbare acties; **Blinde vlekken** betekent de mate waarin het rapport belangrijke hiaten van andere rapporten aanvult, niet het aantal fouten in het rapport. Deze matrix is geen extra stemgewicht en vervangt geen inhoudelijke toetsing.

| Rapport | Validiteit | Bruikbaarheid | Blinde vlekken / complementaire waarde |
|---|---|---|---|
| **Alpha** | **5/5** — concrete firmware-/UI-traces; scheidt ontbrekend beschermingsbewijs van bewezen letsel. Onderscheidt fysieke isolatie van scherm-UIT. | **5/5** — controleerbare testgevallen en herstel van UI én handleiding; praktisch onderhouds-/gebruikskader. | **5/5** — vult Gamma/Delta aan met opgeslagen AAN bij herstart, lokale schermstatus en mogelijke gebruikersmisleiding; koppelt comfort aan werkelijk blijven gebruiken. |
| **Beta** | **4/5** — kernfeiten reproduceerbaar; damp-/brandscenario is relevant maar nog een ongetoetste incidentketen, geen aangetoonde ontstekings-/ATEX-situatie. Die beperking erkent het rapport zelf. | **4/5** — sterke geïntegreerde veiligheidslijst, maar meet-/dampvereisten moeten eerst aan echte producten/SDS en gebruik worden gekoppeld; niet elk risico is al een verplicht ontwerpkenmerk. | **5/5** — vult de andere drie aan met aparte stof/dampstrategie, meerdere tafels, morsen/brandbare vloeistoffen en onderhoudsemissie. |
| **Gamma** | **5/5** — transparante onafhankelijke bestandschecks en nauwkeurige grenzen: nominale ruimte is geen tolerantiebewijs; radioverlies hoeft niet tot afzuigstop te leiden. | **5/5** — heldere alternatieve routes en volledige acceptatiepoorten, inclusief effect van pakking/filterupgrade op kleine vrije ruimte. | **4/5** — vult Alpha/Beta aan met uitvoerbare architectuuralternatieven en trade-offs; minder aanvullende UI/herstartdetails en externe verificatie dan andere rapporten. |
| **Delta** | **5/5** — sterke controleberekeningen; scheidt dynamische druk van werkelijk drukverlies, voorwaardelijk bypassvoorbeeld van meting en catalogusmaxima van werkpunt. | **5/5** — traceerbare fabricage-/meetpoorten en expliciete fabrikantcontrole van fanvarianten; bruikbaar voor technische hertest. | **4/5** — vult Gamma/Alpha/Beta aan met luchtvermogen, rendement, correcte filterklassen en kwantificering van bypass; minder nieuwe gebruikers-/bedieningstoestanden dan Alpha. |

**Aanvulling over en weer:** Delta begrenst de kwantitatieve interpretatie van alle drie; Alpha maakt de statische firmwarebevindingen van Gamma/Delta concreet voor de gebruiker; Beta voorkomt dat alleen deeltjesvangst als compleet salonveiligheidsplan geldt; Gamma voorkomt dat de rest vastloopt op één filter- of regelarchitectuur. Geen rapport krijgt automatisch gelijk omdat het op één criterium hoog scoort.

## 4. Wat goed is — behouden

1. **Modulair, parametrisch concept.** 27 KCAD-bestanden, assemblage77 componenten, centrale maatvoering; losse afzuigmodule, voedingsbox en bediening. Niet aantoonbaar een schijnmodel. Bewijs: `evidence/file-audit.json`, `src/Afzuiging.kcad`, `src/maak-afzuiging.mjs:33–94`.
2. **Nominale maatketen is coherent.** Fanbovenkant−30 minus69 geeft−99; bodemplaat6 geeft−105; bij bladonderkant−34 is onderhang71mm. Frame2,5+staal1,5=4mm boven blad. Dat blijft nominale rekensom, geen passende fysieke assemblage.
3. **Onderhoudstoegang van boven.** Afneembaar rooster en cassette beperken demontage; behoud dit met echte afdichting en stofarme wisselprocedure. `README.md:15–29`.
4. **Roosteroppervlak is rekenbaar.** 218 gaten; circa177,81cm² totaal en140,669cm² boven het filterfront. De eigen generator meldt één stuk staal/geen losse eilanden. Niet gelijkstellen aan bewezen sterkte, braamvrijheid of luchtprestatie. `laser/rooster.loops`, `evidence/rooster-run.log`.
5. **Verifieerbare S01-fan en redelijke voedingsbasis.** 24V×2,35A=56,4W nominaal; op90W resteert33,6W nominaal vóór besturing/verliezen/derating/startgedrag. De G01 is géén gelijkwaardig alternatief.
6. **Echte firmware en zinvolle signalen.** CRC, tacho, opgeslagen referenties, tekst plus kleur. Bestaand log toont `knop SUCCESS` en `module SUCCESS`. Er staan wel narrowing-waarschuwingen in een derdepartijbibliotheek; “schone build” betekende herbouw zonder bronwijzigingen, niet waarschuwingvrij. `firmware-build.log:99–112,363–365`.
7. **Gesloten netadapterarchitectuur.** Geen zelf aangelegde open230V-bedrading vastgesteld. Adapter gesloten en geschikte geaarde C13/C14 behouden; de DC-schakelaar is geen veilige netisolatie.

## 5. Wat niet goed is — samengevoegd, zonder dubbeltellingen

Er zijn **16 samengevoegde vrijgavepunten:1 Kritiek,12 Major,3 Minor**. Dit zijn thematische eindbevindingen; vergelijk hun aantal niet één-op-één met de25 uitgesplitste punten in de oorspronkelijke JSON. Die oorspronkelijke feitenlijst blijft als detailbijlage beschikbaar.

| ID / ernst | Bevinding en concrete bewijslast | Vereiste verbetering |
|---|---|---|
| **E01 Kritiek** | **Retourluchtbescherming niet aangetoond.** Eén M5-mat170×190×20mm; terugblaas in ruimte; geen exact filterproduct, efficiëntie-/systeemlek-/emissiebewijs. `README:17,21,80`; `maak-afzuiging:51–54`. M5 is geen HEPA; geen bewijs dat feitelijke blootstelling boven een grens ligt, maar evenmin dat zij voldoende beheerst is. | Exact beschermingsconcept en deskundig gevalideerde bronvangst, filtering, bypass en retouruitstoot. Deeltjesfilter geen dampclaim. |
| **E02 Major** | **Revisiemix en incompleet bouwpakket.** Romp CAD99/STL114mm; cassette22/37mm; tekeningen229mm/86mm en drie filters. Oude BOM: stalen klauwen/M3 waar actuele uitvoering PETG/knop-M4 heeft. Vier voorgeschreven STL-typen ontbreken. `Romp.kcad/f2`, `Filtercassette.kcad/f2`, `print/`, `tekeningen/stuklijst.csv`, `README:138–143`. | Eén vrijgegeven revisie met13 actuele printtypen, actuele schema’s/tekeningen/BOM/mallen en maat-/hashvergelijking. |
| **E03 Major** | **Vier ongeschikte meshbestanden.** Bodemplaat, Bovenframe, Knophouder en Knopdeksel hebben open/niet-manifold randen. Drie ook inconsistente winding; Knopdeksel krijgt niet ten onrechte een normals-afkeuring. Onafhankelijke randtellingen bevestigen dezelfde vier, exacte aantallen hangen af van vertexnormalisatie. `mesh-audit.json`, `mesh-edge-audit.json`. | Bron/export herstellen en op opnieuw gegenereerde geometrie solid-/normalen-/slicercontrole doen; autorepair niet blind accepteren. |
| **E04 Major** | **Opleg is geen bewezen lekafdichting.** Cassette op richel zonder gedefinieerde pakkingcompressie; nominale speling0,25mm per zijde. Print-/lijmnaden en geknipte mat zijn niet als bypass gekwalificeerd. `maak-afzuiging:48–49,139–141,228–275`; `README:32`. | Pakking/retentie en toleranties ontwerpen; volledige unit op bypass/lekkage testen, ook na wissels. |
| **E05 Major** | **Werkpunt, minimale stand en geluid ongevalideerd.** 500m³/h,170m³/h,54dB en “40–60% genoeg” zijn geen eigen meetresultaten. Fanvrijdebiet696 en maximaal609Pa zijn verschillende uitersten. Bij aangenomen500m³/h:4,30m/s filterfront,9,87m/s vrije roosteropeningen; geen handhoogte-vangstsnelheid. `README:39–42`. | Q–Δp/PWM–RPM, vangveld met handen en belading, geluid op beide oorposities; minimumstand bepalen uit bewijs. |
| **E06 Major** | **Oude sensorwaarde blijft geldig lijken.** Na start maakt leesuitval `meter` niet ongeldig; `dp` veroudert niet; status blijft verzonden. Radioverbinding kan dus bestaan terwijl data niet actueel zijn. `module/main.cpp:219–226,256–259`; `knop:241,268,283–287`. | Meetversheid, sensorfout/herstel en UI-ongeldigheid onafhankelijk van radiolevendigheid. |
| **E07 Major** | **Ongeldige ijking en onbewezen volheidscriterium.** Nul samples wordt uiteindelijk opgeslagen als[1,1,1,1,1]Pa, `geijkt=true`. Kamerdruk naar onderzijde filter meet ook rooster-/instroominvloeden. ±500Pa dekt een verdubbelingsgrens boven250Pa referentie niet; daadwerkelijke clipping is niet gemeten. `module:145–164,239–242`; `schema/blad-4.svg`. | Geen ijking zonder verse plausibele samples/RPM/range; oude geldige ijking behouden. Onderhoudsgrens koppelen aan bewezen minimale vangst, niet schijnprecies filterpercentage. |
| **E08 Major** | **Stop, lage standen en herstartbeleid onvoldoende.** IJktak blijft PWM sturen buiten normale aan/uitregeling; bewaking pas vanaf30% ondanks20/25% selectie. Knop leest opgeslagen AAN terug en toont buiten de ijkweergave lokale `t.aan`, geen bevestigde rotor-/isolatiestatus. `module:229–253`; `knop:245–262,319–322,394–396`. | Prioritaire annuleer/stop, alle toegestane standen bewaken, bewust stroomherstelbeleid en bevestigde bedrijfstoestand. Fysiek isoleren voor onderhoud. |
| **E09 Major** | **Geen unieke radiokoppeling; boostdeadline ontbreekt lokaal.** Afzender-MAC genegeerd, broadcast ongecodeerd; andere set kan opdrachten/status mengen. Timer alleen in knop; module kan laatste100% blijven houden bij verlies. `module:118–126,193–198`; `protocol.h:16–35`; `knop:95–117`. | Unieke beveiligde peers/identiteit en module-eigen boostlease; radioverliesstrategie expliciet, niet blind stofvangst stoppen. |
| **E10 Major** | **Draagconstructie onbekend.** PETG-klauwen,5mm oplegrand en epoxy-inserts in honingraat zijn geen bewezen draagvermogen/kruipvastheid. `README:33,83,184,193`. | Dragende bladversterking/anker ontwerpen; uittrek-/belasting-/duur-/warmte-/montageproeven op echte bladopbouw. |
| **E11 Major** | **Elektrische/thermische eindveiligheid niet gekwalificeerd.** Exact G01-alternatief93,6W/3,9A overschrijdt90W/3,75A; S01 is nominaal aannemelijk maar start-/warmte-/foutgedrag, kabel-/connector-/zekeringcoördinatie, USB-bron/flash/terugvoeding en trekontlasting missen bewijs. CC-weerstanden56kΩ staan wél in het schema. `README:55–56,74,193`; `schema/maak-schema:128–136,212–231`. | Exact S01 houden of keten volledig herontwerpen; competente eindinspectie en warmte-/foutproeven op complete inbouw. |
| **E12 Major** | **Onderhoud aerosoliseert mogelijk opnieuw stof.** Uitkloppen wordt voorgeschreven in README én actieve UI: `README:27,46,252`; `knop/main.cpp:275`. Geen gesloten wissel-/afvalroute of behoud van filterefficiëntie bewezen. | Uitkloppen schrappen op beide plaatsen; gevalideerde stofarme wissel en hermontagelekcontrole, alleen fabrikanttoegestaan hergebruik. |
| **E13 Major** | **Mors-/bereikbaarheids-/incidentketen niet getoetst.** Magnetisch rooster, open retourpad en mogelijke oplosmiddelen vragen gecontroleerde beoordeling van rotorbereik, vloeistofpad en materiaal/foutwarmte. `README:15,27,112`; `maak-afzuiging:279–307`. Geen aangetoonde explosieve atmosfeer of automatisch verplichte ATEX-uitvoering. | Product/SDS-/gebruiksscenario vastleggen; deskundige probe-/mors-/brandrisicobeoordeling en noodzakelijke ontwerpmaatregelen bewijzen. |
| **E14 Minor** | **Instructies en leveringsreproduceerbaarheid.** Freesmaat202×92 versus212×102; USB-print zonder gaten versus schroefmontage; schakelaarlocatie; TR5 tegenover oude5×20-weergave. Gedeelde `../lib/schets.mjs` ontbreekt in deze snapshot, niet bewezen in volledige projectroot. | Datumvlakken/montagebeschrijving/correcte componentvariant eenduidig; minimale dependencyset en werkende herbouwopdracht leveren. |
| **E15 Minor** | **Proces-/materiaalclaims ongekwalificeerd.** Algemeen PETG/aceton/75°C bewijst geen bestendigheid van exact filament, voorgespannen print, epoxy en reinigingsregime. Passingen/magneten/poriën vragen coupons/proeven. `README:112`; `maak-afzuiging:207–212`. | Exact materiaal/proces en lijm vastleggen; chemische, kruip-, passings- en retentieproeven. |
| **E16 Minor** | **Ergonomie en levensduurkosten onbekend.** Geen tweepersoonsmock-up, knie-/pols-/uitblaas-/geluidsacceptatie. €495,08 telt rekenkundig op maar is geen geverifieerde volledige projectkost inclusief tests, arbeid, verzending en iteraties. `README:25–26,159–168,177,242`; `prijslijst.csv`. | Veilige1:1 gebruiksproef en complete lifecyclebegroting; comfort mag niet tot gebruik onder de bewezen vangststand leiden. |

**Status van deze bevindingen:** geometrieverschillen en beschreven codepaden zijn bestandsfeiten/statische gevolgtrekkingen. Blootstelling, lekfractie, temperaturen, breuk, brand en werkelijke vangst zijn niet gemeten. “Niet bewezen veilig” is niet hetzelfde als “bewezen gevaarlijk op deze dosis”. Wel voldoende om vrijgave te blokkeren.

## 6. Niet overgenomen, begrensd of gecorrigeerd

Geen van de vier rapporten bevat een overtuigend weerlegde kernbevinding die de vrijgave zou veranderen. Wel worden de volgende cijfers, suggesties en mogelijke veralgemeningen **niet** tot bewezen feiten of automatische eisen verheven:

- **Beta’s brand-/dampincidentketen:** behouden als te onderzoeken scenario, niet als bewezen brand-/explosiegevaar, verplichte ATEX-classificatie of bewijs dat ieder onderdeel oplosmiddel-/ontstekingsveilig gecertificeerd móét zijn. Werkelijke producten, hoeveelheden, ventilatie en foutscenario’s ontbreken. Stofafzuiging hoeft niet zelfstandig alle salon-VOC’s op te lossen; daarvoor is een apart onderbouwd beheersplan nodig.
- **Delta’s bypassvoorbeeld:**1% bypass met ideaalH13 geeft rekenkundig circa1,0495% penetratie. Dat is een goed voorbeeld, **geen gemeten1% lek** in dit project. Ook de berekende circa49,3% benodigde fan-efficiëntie voor500m³/h bij200Pa bewijst noch realiseerbaarheid noch onmogelijkheid van dat werkpunt.
- **Delta’s250m³/h bij half toerental:** slechts ideaal gelijkvormigheidsvoorbeeld met passende systeemcurve. Het weerlegt de170m³/h niet definitief; werkelijk toerental, filtercurve en montage ontbreken. Beide zijn zonder meetbewijs geen productprestatie.
- **Filterklassegetallen:** generieke M5-/H13-klassebeschrijvingen uit Delta zijn achtergrond, geen certificaat voor deze mat of automatisch wettelijkH13-voorschrift. Een H13-label alléén zou de kritieke blokkade niet opheffen; buitenafvoer is ook niet automatisch voldoende.
- **Gamma’s voorgestelde10 wisselcycli en stop binnen één regelcyclus:** bruikbare ontwikkeltests, geen aangetoonde normgrens of volledige levensduurkwalificatie. In het actieplan onderscheiden we softwarematig stopdoel, echte rotoruitloop en fysieke isolatie. Definitieve aantallen/tijden moeten worden onderbouwd.
- **Alpha’s scherm-/herstartanalyse:** broncontrole bevestigt de opgeslagen AAN-toestand en lokale UIT-weergave. Tijdens actieve ontvangen ijkstatus staat echter eerst **IJKEN** op het scherm (`knop:245–251`), niet per definitie UIT. We nemen dus geen sterkere claim over dat het scherm tijdens iedere ijking UIT zegt of dat het apparaat fysiek al ongewenst is herstart; dat laatste moet worden getest.
- **“Vier defecte STL’s = alle slicers falen” of “vijf gesloten STL’s zijn goedgekeurd”:** geen rapport mag zo worden uitgelegd. Dezelfde vier falen basis-topologie; exacte randaantallen variëren met samenvoegen van vertices. Geen slicer-, zelfdoorsnijdings-, solide- of passingscertificatie uitgevoerd.
- **Geen mates of ontbrekende snapshotlibrary = fout CAD-project:** niet overgenomen. Vaste componentplaatsing kan correct zijn en de gedeelde library kan buiten de map bestaan. Er ontbreekt verificatie/overdraagbaarheid, geen bewezen algemene projectcorruptie.
- **Ruwe assembly-audit en schroefmaten:** negatieve ruwe matches op `format`/`kind` zijn geen geometriefouten. Niet alle klauwen gebruikenM4: vier moduleklauwenM5×65, twee knopklauwenM4×65. Delta’s correctie wordt overgenomen; de oorspronkelijke verkorte formulering was te makkelijk misleesbaar.
- **Succesvolle “schone build” = waarschuwingvrij/werkend:** gecorrigeerd. Het log bevat librarywaarschuwingen en twee SUCCESS-uitkomsten. Dat bewijst geen hardware- of veiligheidswerking.
- **Beta/Delta’s ongewogen eindgemiddelden:** niet gekozen als eindscore omdat zij geen risicoweging van de vastgelegde gebieden toepassen; niet omdat de sommen fout zijn.

## 7. Opdracht voor Claude — rechtstreeks te kopiëren

> **Doel:** maak van het afzuigingsontwerp één aantoonbaar consistente en veilig kwalificeerbare engineeringrevisie. De huidige score is3,1/10; geen salonvrijgave of productie uit de bestaande mix. Hieronder staan herstel- en bewijsvoorwaarden, geen toestemming voor aankopen, betaalde tests of wijzigingen aan andere projecten. Ian beslist over kosten. Behoud de modulaire opzet; toon bij elke stap bestanden, revisiehash en testresultaten. Geen claims “veilig”, “stil”, “luchtdicht” of “dagstand genoeg” zonder passend bewijs.

### Prioriteit1 — beschermingsconcept en filter/afdichting

**Bestanden/onderdelen:** `maak-afzuiging.mjs` filters/cassette/richel/inlaat; `Filtercassette.kcad`, `Cassetterand.kcad`, `README.md` gebruik/onderhoud.

**Actie:** kies exact filterproduct met efficiëntie- en drukvalgegevens voor het bedoelde debiet, ontwerp controleerbare pakkingcompressie/retentie en stofarme wissel. Vergelijk passend groter/geplooid filter, geschikte buitenafvoer of aantoonbaar geschikt bestaand systeem op dezelfde beschermingscriteria. Inventariseer gebruikte producten/SDS en regel dampen/ruimteventilatie apart. Nieuwe filter/pakking mag de nominale3mm cassette-/inlaatruimte niet ongemerkt opeten.

**Acceptatie:** gedocumenteerde ontwerpkeuze, exacte product-/filtergegevens en meetplan met vooraf onderbouwde relevante criteria/meetonnauwkeurigheid; complete unit schoon/beladen en na hermontage toetsen op bronvangst, bypass en retouruitstoot/blootstelling. Toepasselijke Belgische context door competente deskundige vastleggen. Geen ongecontroleerde proef met echte nagelstof en medewerkers/klanten als blootgestelde proefpersonen.

### Prioriteit2 — één complete productierevisie, niet alleen nieuw plaatje

**Bestanden:** hoofdgenerator, gedeelde library, alle27KCAD, `print/`, `laser/`, `schema/`, `tekeningen/`, BOM/CSV en README.

**Actie:** trek oude exports in; regenereer alle13 bedoelde printtypen inclusief `Deksel-voedingsbox`, `Klauw`, `Knopklauw`, `Adapterklem`. Corrigeer romp99/114, cassette22/37, box/freesmaten, filterlagen, klauwmateriaal en juisteM5-module/M4-knopbevestiging. Neem dependencies/toolversies en revisie-ID’s mee.

**Acceptatie:** gecontroleerde herbouw uit één baseline; CAD/exportmaatvergelijking binnen vooraf bepaalde toleranties; geen open/niet-manifold randen, ongewenste degeneraties of verkeerde normals; echte kernel-/interferentiecontrole inclusief klauwzwaai, kabelbochten, koopdelen en bedoelde bladdiktes; slicerlagen en passingscoupons goed. Mallen op100% met nagemeten controlemaat; BOM/schema/handleiding dezelfde uitvoering. Geen productie op een stilzwijgend gerepareerde oude mesh.

### Prioriteit3 — firmware en UI: meetgeldigheid, stop en lokale autonomie

**Bestanden:** `firmware/src/module/main.cpp`, `firmware/src/knop/main.cpp`, `firmware/include/protocol.h`.

**Actie:** voeg meettijd/geldigheid en sensorherstel toe; verwerp sampleloze/onplausibele/overrange-ijking met behoud vorige goede referentie; onderhoudsgrens aan gevalideerde minimumvangst koppelen. Maak annuleren/UIT prioritair, bewaak alle werkelijk toegestane standen, bepaal stroomherstelbeleid en bevestigde toestand. Unieke beveiligde koppeling, module-eigen120s-boostdeadline en expliciet radioverliesgedrag. Verwijder “filters uitkloppen” uit de UI én handleiding. Maak onderscheid tussen opdrachtpercentage, gemetenRPM/druk en bewezen vangst.

**Acceptatie:** nieuwe builds plus automatische regressie en gecontroleerde hardwarefoutinjectie: sensorlos/NACK/CRC/stale na goed bedrijf; nul samples/omgekeerde slang/overrange/fout filter; RPMverlies alle toegestane standen; stop elk ijkpunt; twee sets; radioverlies tijdens boost; spanningsherstel. Bij ongeldige ijking geen nieuwe geldigeNVS-referentie. Stopdoel heeft softwarematig direct prioriteit binnen één regelcyclus; echte uitlooptijd afzonderlijk meten en veilige isolatie vóór onderhoud vastleggen. Boost vervalt lokaal na120s plus één regelcyclus, ook zonder knop. Meettimeout/storingtijd vooraf technisch onderbouwen en vervolgens aantoonbaar halen. Geen kruisbediening of misleidend actuele waarde bij ongeldige meting.

### Prioriteit4 — fysieke constructie en elektrische/thermische eindveiligheid

**Onderdelen:** echt tafelblad, module-/knopklauwen, voedingsboxankers, S01-fan, adapter/zekering/print/kabels/M8/USB-C, rooster/uitlaat/morspad.

**Actie:** ontwerp aantoonbaar dragende versterking voor honingraatblad; definieer lijm, voorbereiding, momenten en lasten. SchrapG01 als alternatief tenzij complete keten opnieuw wordt ontworpen. Houd gesloten geaarde adapter. Verifieer ratings, zekeringcurve, stroompaden, isolatie/trekontlasting, USB-bron/CC/flash/terugvoeding. Onderzoek guard en vloeistofpad en bepaal noodzakelijke maatregelen uit het echte gebruiks-/incidentprofiel.

**Acceptatie:** deskundig vastgelegde belastings-/uittrek-/kruipproeven op werkelijke bladopbouw, warmte en herhaalde montage; geen loskomen/ontoelaatbare vervorming/verlies van afdichting. Thermische duur-/foutproef en elektrische eindinspectie met stromen/temperaturen binnen gedocumenteerde materiaal-/componentgrenzen en passende marge. Veilige bereikbaarheid en morsscenario gecontroleerd beoordeeld. Geen vingers/ongecontroleerd water bij ingeschakelde ongekwalificeerde apparatuur; DC-UIT is geen netisolatie.

### Prioriteit5 — complete systeemkwalificatie en werkelijk bruikbare werkplek

**Bestanden/resultaten:** meetplan, testrapport, actuele gebruikershandleiding, onderhoudslog en vrijgavematrix bij de definitieve revisie.

**Actie:** meet Q–Δp/PWM–RPM/vermogen schoon en representatief beladen; vangveld met handen/frees/armsteunen/realistische hoogte en dwarsstroming; oorpositiegeluid met achtergrondniveau bij beide personen. Koppel minimaal toegestane werkstand en alarmgrens aan daadwerkelijk beschermingsbewijs, niet aan “20%” of “40–60%”. Test knieën/polsen/knop/kabels/uitblaas eerst op veilige1:1 mock-up. Stofarme wissel, afvalverpakking, hermontage en materiaal-/lijmbestendigheid onder het echte reinigingsregime aantonen.

**Acceptatie:** alle vooraf vastgelegde beschermings-, veiligheids- en bruikbaarheidscriteria gehaald op dezelfde vrij te geven revisie; herhaalde wissels met behouden afdichting en stofarme procedure; expliciete beperkingen/onderhoudsinterval en traceerbaar meetverslag. Een ontwikkeltest van10 wissels kan een begin zijn, geen volledige levensduurclaim. Geen geslaagde werkplekproef als gebruikers onder de bewezen minimale vangststand moeten terugregelen wegens geluid of hinder. Neem arbeid, testen, revisies en filterverbruik in de begroting op. **Pas daarna hertest en expliciete vrijgavebeslissing; geen automatische goedkeuring.**

## 8. Grenzen en bewijsintegriteit

- Geen fysieke unit getest door de rechter; geen nieuwe CAD-kernel-/SolidWorks-herbouw, exacte botsingsmatrix, CFD/FEM, slicer/printproef, akoestiek-, blootstellings-, thermiek-, elektrische of brand-/morsproef uitgevoerd.
- De bronreview en compilatielogs bestaan; **geen uitgevoerde host-/hardwarefoutinjectie**. De eerder voorbereide hosttest kon wegens ontbrekende compiler niet worden uitgevoerd. Geen blokkades omzeild.
- Geen Belgische wettelijke stof-/geluidsgrens of productconformiteitsverklaring uit deze bestanden afgeleid. Een competente deskundige moet toepasselijkheid/meetstrategie bepalen; een generiekeHSE-referentie of een leverancierssamenvatting van een norm is geen Belgische goedkeuring.
- Vier rapporten delen dezelfde bronmomentopname en deels dezelfde primaire technische QA. Hun onafhankelijke analyses verminderen bepaalde interpretatiefouten, maar vormen geen onafhankelijke fysieke replicaties of nieuwe meetreeksen.
- Auteursidentiteit niet gebruikt, niets naar Claude gestuurd, geen aanschaf of betaalde dienst gestart. Bron op laptop niet gewijzigd; rapportlevering uitsluitend in de afgesproken QA-map.
- Hashes van de vier daadwerkelijk gelezen blinde rapporten staan in `team-blind/SHA256.json`. Hun tekst wordt bytegetrouw meegeleverd, niet herschreven om het oordeel mooier te maken.

## 9. Bestanden en definitieve beslissing

In dezelfde rapportmap: `AFZUIGING-eindverslag-v1.md`, `team-blind/Rapport-Alpha.md`, `Rapport-Beta.md`, `Rapport-Gamma.md`, `Rapport-Delta.md` en hashmanifest. De eerdere `AFZUIGING-QA-rapport-v1.md`, `findings-v1.json`, afbeeldingen en evidence blijven technische bijlagen; **dit eindverslag gaat voor waar score/weging/duiding verschilt**.

**Vonnis: behouden als ontwikkelconcept; huidige productieset en salongebruik blokkeren. Score3,1/10. Eerst beschermingsconcept, consistente maakset en foutbestendige regeling; vervolgens gecontroleerde mechanische/elektrische en complete systeemvalidatie. Ian deelt het verslag zelf met Claude.**
