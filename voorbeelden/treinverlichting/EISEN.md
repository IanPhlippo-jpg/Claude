# Treinverlichting: eisenlijst (2026-11-08)

Voor de modelbaan van Ians schoonvader: alle lampen van de baan komen samen in één doos, in groepen, en worden
aangestuurd met een ESP vanaf een eigen dashboard. Knoppen en sensoren op de baan kunnen functies starten.

## Vast (keuzes van Ian)

| Eis | Keuze |
|---|---|
| Bediening | webdashboard op gsm of tablet (browser, geen app); de doos maakt een **eigen wifi-hotspot** |
| Groepen | 16 uitgangen (Ian: 9 tot 16 groepen); **één groep = één bordje** van Modelbouwled |
| Per groep | gewoon aan/uit; als optie dimmen en effecten (dag/nacht, flikkerend vuur, tv-licht, lasvlam, knipperen) |
| Bordjes | Modelbouwled.nl "Kroonsteen PCB met ingebouwde weerstand" (spanningsverdeler V1.5) en de versie met power plug (V1.4-B): **16 led-aansluitingen, elk met een eigen SMD-weerstand in de +**, de min gemeenschappelijk; aan beide kanten een 2-polige klem om door te lussen. Waarden volgens Modelbouwled: 0 Ω (doorverbinding, voor leds met eigen weerstand), 470 Ω (5 V), 1K (12 V), 1K5 (20 V), 2K. Geen maten gepubliceerd: na te meten |
| Spanning | 12 V gelijkspanning (zoals nu) |
| Lampen | leds met en zonder eigen weerstand (de R op het bordje); alles moet kunnen |
| Knoppen en sensoren | ingangen voor drukknoppen en sensoren (contacten, reedcontacten, sensoren op 12 V); per ingang in het dashboard te kiezen welke functie hij start |
| Functies | scènes en macro's (bv. "avond", "overweg knippert 30 s"), ook als knoppen op het dashboard |
| Doos | **onder de baan**, vastgeschroefd; **de bordjes van alle groepen zitten ín de doos** en de leddraden worden tot daar verlengd (Ian, 2026-11-08); geprint in PETG op de Elegoo Centauri Carbon (256 x 256), zonder support; bij 16 bordjes in delen of modules |
| Veiligheid | 230 V alleen in een gekeurde netadapter (geen eigen bedrading op 230 V) |
| Budget elektronica | meer dan € 100 mag (zonder lampen) |
| Werkwijze | eerst deze lijst, dan het ontwerp; op het einde foto's en één PDF om af te drukken, zoals bij de afzuiging |

## Na te meten (geen keuze nodig, wel voor de ingebruikname)

- Stroom per bordje bij vol licht (multimeter in de toevoer). Rekenwaarde: 16 leds x 9 mA (1K op 12 V) = 0,15 A; met 0 Ω hangt het af van de leds. De doos is gerekend op hoogstens 1 A per groep.
- Bordjes met 1K5 zijn gemaakt voor 20 V: op 12 V geven ze ongeveer 6 mA per led (zwakker licht). Voor vol licht op 12 V: de 1K-versie.
- Maten van het bordje: **61,1 x 20,9 mm** (gemeten door Ian, 2026-11-08). Hoogte met klemmen en de plaats van de gaten nog niet gemeten: de doos rekent met 14 mm hoogte; sinds versie 5b is het bordje vastgeschroefd door zijn 4 gaten (hart 2 mm van de randen, Ian 2026-11-15; Ø2,2 AANNAME).
- Welke sensoren er komen (type en voeding): de ingangen nemen een contact of een 12 V-signaal.

## Versie 2 (Ian, 2026-11-11)

- De doos van versie 1 (248,9 x 245,6) is te groot voor de printer: de slicer houdt rechtsvoor een vak van 10 x 20 mm vrij
  voor de aanslag van het filamentmes (OrcaSlicer/ElegooSlicer-profiel: `bed_exclude_area` 246x0 tot 256x20). Elk geprint
  deel moet dus ruim op 256 x 256 passen zonder die hoek en met een skirt errond: **hoogstens 230 x 230 mm per deel**.
- **Echte kabelgoten** in de doos: er komen veel kabels binnen. Vingerkanalen zoals in een schakelkast (wanden met
  vingers, een klikdeksel per goot), tussen elke rij bordjes en langs de zijkanten, doorlopend van module tot module.
- **Hoogstens 80 mm hoog** (de hele doos met deksel).
- Groter mag (breder en langer), maar dan **in modules met een sleutelverbinding** die in elkaar klikken.

Keuzes (zelf beslist, geen meerkost boven € 20):
- 3 modules naast elkaar, elk hoogstens 230 x 230: twee modules met elk 8 bordjes (2 kolommen x 4 rijen) en één module
  met de elektronica (ESP, PWM-print, uitgangsprint, ingangsprint, voeding).
- Verbinding: zwaluwstaarten over de volle hoogte in de wanden die tegen elkaar komen (de ene module schuift van boven in
  de andere), licht taps zodat ze vastklemmen, met een klikneus onderaan die hoorbaar invalt; geen lijm of schroeven nodig.
- Elke module heeft een eigen deksel en eigen sleutelgaten om onder de baan te hangen; de goten lopen door open
  sleuven in de tussenwanden van module tot module.

Bijsturing (Ian, 2026-11-11): "alles zou wel in 1 module moeten als het kan". Uitgewerkt (README): het past in één doos
van 229,8 x 229,8 x 68,3. De hoogte gaat naar de goten (60 hoog, 5,4 breed tussen de rijen, vol hoogstens 49 %); de
wanden van de goten zijn ook het kader van de bordjes; de indeling van versie 1 blijft (rij 1 tot 5 telkens 3 bordjes,
rij 6 bordje 16 met de uitgangsprint en de PCA9685, rij 7 voeding, ingangen en ESP). Geen modules en geen zwaluwstaarten.

Bijsturing (Ian, 2026-11-11): de goten van 60 hoog zijn te hoog ("zo is het niet meer makkelijk om met je vingers erin te
werken"), daarna: "maak de goten 25 mm, mogen iets hoger maar niet overdreven", met "een click systeem net als een echte
kabelgoot" zodat de draden er niet los uit hangen. Uitgewerkt: goten 28 hoog (bij 25 zou een goot bij gewoon bekabelen
66 % vol zitten, bij 28 is het 59 %, onder de 60 % van een schakelkast), met de klikdeksels van versie 2 (nokken in de
klikvingers, de randdeksels met een neus in de buitenwand). De doos blijft 229,8 x 229,8 x 68,3.

Bijsturing (Ian, 2026-11-11): "maak hem 25 mm lager", daarna "10 mm speling mag". De binnenhoogte gaat van 63,5 naar
39,6: boven de gootdeksels (29,6) blijft 10 mm tot het deksel; de doos is 229,8 x 229,8 x 44,4 met het deksel. De
drukribben van het deksel zijn 24 mm korter.

## Bijsturing 2026-11-12: advies Fable 5.2 (Ian: "Pas alle dingen aan die Fable 5 zegt")

Verwerkt in versie 3 (README, docs/Berekeningen.md, schema revisie 2, tekeningen TRN-04, TRN-10 tot TRN-14, TRN-20, TRN-21):

1. **Bordjes vast:** de bordjes lagen los (alleen de ribben van het deksel). Nu 4 PETG-klemlippen per bordje aan de
   korte kanten (haak 0,6 over de rand, rek 1,7 %): ze blijven zitten met het deksel eraf en de doos ondersteboven
   (de belofte "klemlippen langs de rand" van hierboven is nu waar). **Bedraden op werkhoogte:** 2 geprinte werkhaken
   laten de doos verticaal 12 cm onder de baan hangen; kabellus van 50 cm per bundel.
2. **+12 V voor knoppen en sensoren** heeft een eigen polyfuse 0,3 A (-F18); het rekenblad zegt nu dat de zekering van
   7,5 A alleen de print beschermt (de adapter levert hoogstens 6,67 A).
3. **Fouten bij aansluiten:** (a) DC-chassisbus in de wand (de adapter houdt zijn stekker; de GST90A12-P1M heeft een
   stekker 5,5 x 2,**5**, niet 2,1) én een P-MOSFET IRF4905 tegen ompolen; (b) een polyfuse van 0,5 A per groep (16)
   in plaats van 1,1 A per rij, de MOSFET's in voetjes; zo klopt ook "hoogstens 1 A per groep" hierboven: een groep
   trekt hoogstens 0,32 A, de polyfuse houdt bij 40 °C nog 0,44 A en springt vanaf 1 A; (c) de ingangen hebben
   optocouplers met AC-ingang (twee leds tegen elkaar, LTV-844): dat doet wat een 1N4148 over de led zou doen, en meer.
4. **Firmware:** waakhond op de lichttaak en de lus, de hotspot gaat opnieuw aan als hij wegvalt, BOOT 5 s = wachtwoord
   terug, firmware bijwerken via het dashboard (2 app-slots), thuis-wifi naast de hotspot (treinbaan.local),
   testmodus "looplicht" en "groep vast".
5. **Bouwdocumenten:** opbouwtekeningen van de 4 gaatjesprints (TRN-10 tot TRN-13), interne draadlijst met doorsnedes
   (TRN-14; de 0 V-retour tot 5,2 A op een eigen klem -X3:17 met 0,75 mm²), de stap "firmware flashen" en eerst een
   proefopstelling met 1 bordje in het bouwschema, een meetblad (TRN-20).

Kleinere punten: OE-pull-up 1 kΩ (de PCA9685-print trekt OE zelf laag; meetpunt op het meetblad); MOSFET AO3400A,
gespecificeerd bij 2,5 V (≤ 48 mΩ) op een adapterprintje, met als meetcriterium < 0,1 V; het rekenblad rekent de warmte
van de ingangsweerstanden mee, een doos die met de bodem tegen de baan nauwelijks koelt en de derating van de
polyfuses bij 40 °C; NPN-sensoren werken (COM per 4 ingangen aan +12 V); een spatel met haakje voor de smalle goten
(5,4: geen vinger) en dat staat eerlijk in de README; standaard is ingang 1 een knop "alles aan/uit"; tot 32 groepen
voorbereid (tweede PCA9685 op 0x41, vrije GPIO 11, 39, 42, 47, 48); documentfouten verbeterd (pad in firmware/README,
micro-USB in platformio.ini, "versie 1" in het schema); een invulblad voor de namen (TRN-21).

Keuzes (zelf beslist, binnen de € 20, zie README-bestellijst: € 148,67 in plaats van € 132,32):
- De uitgangsprint vult nu rij 6 naast bordje 16 (132 breed) en de PCA9685 staat op afstandsbussen erboven: 8
  adapterprintjes en 16 polyfuses passen niet op de oude 68 mm.
- Printklemmen met steek 2,54 (Phoenix MPT 0,5) in plaats van 3,5: die passen in het raster van een gaatjesprint; de
  0 V-retour en 12 V in op klemmen met steek 5,08 (tot 1,5 mm²).
- De regelaar 12 -> 5 V zit onder de ESP op de draagprint (op de voedingsprint was er geen plaats meer).
- De DC-bus vervangt de wartel; geen doorgeknipte kabel meer.

Na te meten (nieuw): de dikte van de print van een bordje (de klemlippen rekenen met 1,6); de schroefdraad van de
DC-bus (gat Ø11,5); de pennen van de ATO-houder (10,16); de pull-down op OE van de gekochte PCA9685-print.

**Rebuildtijd (2026-11-12, na de klemlippen):** de bak kwam op 46 s (budget van de app 45 s). De schroefgaten Ø2,2 en Ø2,6
in de paaltjes en bussen zijn nu achthoeken met de vlakken op die maat (de schroef tapt in de vlakken; een printer maakt
zo een klein gat toch hoekig): de bak bouwt in 38 s.

## Bijsturing 2026-11-13: kant-en-klare printjes (Ian: "Voor de treindoos zou ik graag willen dat je zoveel mogelijk printjes gebruikt die ik gewoon kan bestellen")

Uitgewerkt in versie 4 (README, opbouw.mjs, schema revisie 3, tekeningen TRN-05, TRN-10, TRN-14, TRN-20, TRN-21):

| Functie | Versie 3 (zelf solderen) | Versie 4 (bestellen) |
|---|---|---|
| uitgangen | uitgangsprint: 16 x AO3400A op 8 adapterprintjes in voetjes, 48 printklemmen | 2 MOSFET-modules 8 kanalen met optocouplers (3,3 V-versie), dupont van de PCA9685 |
| zekering per groep | 16 SMD-polyfuses op de uitgangsprint | 16 radiale polyfuses Bourns MF-R050, pootje in de klem van de module en in een WAGO 221-2411 |
| ingangen | ingangsprint: 4 x LTV-844 (AC), 16 weerstanden, 24 klemmen, COM per 4 | 2 optocouplerprints PC817 8 kanalen (schroefklemmen) |
| +12 V knoppen en sensoren | SMD-polyfuse op de ingangsprint | radiale polyfuse MF-R050 (-F18) in de verdeelklemmen |
| voeding | voedingsprint: klemmen, ATO-houder, P-MOSFET IRF4905, elco | zekeringhouder ATO met draden, Schottkydiode SB560 tegen ompolen, WAGO 221-415 als verdeelklemmen |
| 5 V | Pololu D24V10F5 op de draagprint (gesoldeerd) | Joy-IT SBC-Buck02 met schroefklem |
| ESP | draagprint met 2 vrouwelijke pinrijen (gesoldeerd) | schroefklemadapter 44-pin |
| solderen | 4 gaatjesprints, 4 tot 5 uur | alleen de 2 lippen van de DC-bus |

Keuzes (zelf beslist; bestellijst € 186,95 in plaats van € 148,67, € 38,28 meer: boven de € 20 van "zelf beslissen",
maar Ian vroeg zelf om kant-en-klaar; met de MOSFET-modules van AliExpress in plaats van Amazon.de ± € 26 minder):
- **Alles op één geprinte moduleplaat boven de bordjes** (op de gootdeksels, achteraan onder een richel, vooraan 2
  schroeven): de modules nemen ± 2,5 keer de plaats van de gaatjesprints en pasten niet meer in rij 6 en 7. De doos wordt
  66,8 hoog (was 44,4; eis hoogstens 80), blijft 229,8 x 229,8 en houdt haar ringen, goten, klemlippen, tules en
  sleutelgaten. Plaat eruit: 2 schroeven; de draden van de bordjes lopen door de goten naar voren en daar omhoog.
- **De maten van de MOSFET-modules, de schroefklemadapter en de gaten van de regelaar zijn niet gepubliceerd** (AANNAME
  in docs/Maten-en-bronnen.md). Daarom is de plaat een apart printdeel: na het nameten de maten in opbouw.mjs aanpassen
  en alleen de plaat opnieuw printen (3 uur, niet de bak van 17 uur).
- **Polariteit van de modules** (welk niveau zet een groep aan, welk niveau geeft een ingang) is niet gepubliceerd:
  de firmware gaat uit van actief laag en heeft een bouwvlag voor het andere geval; het meetblad controleert het.
- **Ompoolbeveiliging:** een P-MOSFET bestaat niet als module met schroefklemmen; een Schottkydiode tussen L+ en 0 V
  achter de zekering doet het zonder solderen (verkeerd om: de adapter schakelt af of de zekering smelt).
- **Zekering per groep:** de Schönwitz-zekeringverdeler (4 groepen met PTC en lampje, 65 x 55) is overwogen: 4 stuks
  passen niet op de plaat. De radiale polyfuse met een WAGO-doorverbinder doet hetzelfde zonder plaats te nemen.
- Modules krijgen in het schema de klasse van hun hoofdfunctie (81346-2): -Q (MOSFET-modules), -K (ESP, PCA9685,
  optocouplerprints), -T (regelaar), -X (klemmen en de adapter); de letter A gebruikt dit project niet.

Wat versie 4 minder kan dan versie 3 (eerlijk):
- **Een sensor die zelf 12 V geeft (PNP)** werkt niet rechtstreeks: de optocouplerprint heeft een gemeenschappelijke +
  per 8 ingangen (contacten, reed en NPN wel). Oplossing als het nodig is: een NPN-sensor of een klein relais.
- **Wisselspanning op een ingang** (de trafo van de baan): de AC-optocouplers verdroegen dat, de PC817 niet boven 18 V
  piek. Een +12 V op een ingang (de waarschijnlijkste fout) is wel onschadelijk.
- **Dimmen onder 5 %** is minder nauwkeurig door de optocoupler in de MOSFET-module (schakeltijd); aan/uit, dimmen en
  de effecten blijven.

Na te meten (nieuw): de maten en gaten van de MOSFET-modules, de schroefklemadapter en de SBC-Buck02; de hoogte van de
MOSFET-module (één verkoper noemt 39 mm: dan past ze niet onder het deksel); de volgorde van de klemmen van de
optocouplerprint; de weerstand in de ingang (stroom bij 12 V); de polariteit van uitgangen en ingangen (meetblad stap 8
en 9); of de pootjes van de polyfuses (0,51 mm) vast zitten in de WAGO 221-2411.

## Bijsturing 2026-11-15: één laag, de doos in 2 helften die klikken, aan/uit, hallsensoren

Ian: "Als je met 2 lagen werkt is het te moeilijk om de kabels aan te sluiten." Gekozen (Ian, uit 3 voorstellen): **één
langwerpige doos van ± 460 x 230, geprint in 2 helften die aan elkaar vastgemaakt worden, binnen geen tussenwand**; alles
op één laag en van bovenaf bereikbaar. Daarna: "De doos moet in elkaar kunnen klikken en nog kunnen lijmen.", "Dimmers
zijn niet nodig." en "Zorg ook dat er hallsensoren binnen gelezen kunnen worden."

Uitgewerkt in versie 5 (README, maak-kabeldoos.mjs, opbouw.mjs, tekeningen TRN-00a/b, TRN-01 tot TRN-06, TRN-10, TRN-14,
TRN-20, rekenblad hoofdstuk 4, 5 en 8, firmware 1.3.0):

| Wat | Versie 4 | Versie 5 |
|---|---|---|
| doos | 229,8 x 229,8 x 66,8, één bak, één deksel | **440,9 x 229,8 x 52,6**, 2 bakhelften en 2 dekselhelften (elk hoogstens 229,8) |
| modules | op een geprinte moduleplaat boven de bordjes (2 lagen) | op palen Ø6 x 5 in de bodem van de rechterhelft, naast de bordjes (één laag) |
| kabelgoten | 9 goten met vingers en klikdeksels | **geen** (Ian: "Kabel goten mogen weg"); de bordjes houden hun plaats (steunrail, palen, aanslagen, klemlippen) |
| draden van de bordjes | door de goten naar voren en omhoog naar de plaat | **rechtstreeks** van de eindklem door de vrije strook voor de rij naar hun klem van de MOSFET-module |
| naad | — | **2 klikhaken** (14 x 1,6, onderkant 45°, nok 0,6 in een kuiltje 0,8), **5 bodemlippen**, **lijmspleet 0,2**; het deksel met een **lip van 12** (4 vingers met een nok) |
| uitgangen | aan/uit, dimmen en effecten | **alleen aan/uit** en aan/uit-effecten (knipperen, overweg, lasvlam, tl); vuur, tv en ademen vervallen |
| ingangen | contact, reed, NPN | ook **hallsensoren**: een puls vanaf 1 ms wordt gezien (interrupt), 0,3 s vastgehouden, een teller per ingang |

Keuzes (zelf beslist; de bestellijst wordt € 194,95, € 8,00 meer voor de lijm):
- **Lengte 440,9 in plaats van ± 460:** de linkerhelft blijft zoals de bordjesruimte van versie 4 (224,9 breed), de
  rechterhelft is 229,8 met de klikhaken; de modules passen er met 10 tot 14 mm draadruimte voor elke klemmenrij. Langer
  kan niet zonder een derde deel (elk geprint deel hoogstens 230). **Na het weghalen van de goten niet kleiner gemaakt:**
  de diepte (229,8) is nodig voor de modules van de rechterhelft, en links blijft de ruimte nodig voor de tules (die
  steken 6,6 naar binnen), de sleutelgaten, de draden tussen de rijen (9,2) en aan de naad (± 20): kleiner zou hoogstens
  10 mm schelen en de draden krapper maken.
- **Geen moduleplaat:** de palen staan in de bodem van de rechterhelft. Nadeel: klopt een gat van een module niet (AANNAME),
  dan moet de rechterhelft opnieuw (± 10 uur) in plaats van de plaat (3 uur). Daarom in de bouwvolgorde: **eerst de
  modules kopen en nameten, dan de rechterhelft printen**. Een losse montageplaat per helft zou de doos weer 5 mm hoger
  maken en een tweede laag geven: niet gedaan.
- **Hoogte:** binnen 47,0. De MOSFET-module is getekend 15 hoog (AANNAME), maar één verkoper noemt 87 x 47 x **39**: veilig
  gekozen voor een module tot 39 mm op palen van 5 met 3 mm vrij tot het deksel. Is ze echt 15, dan kan de doos 10 mm
  lager (maten.mjs: doos.h).
- **De naad print zonder support:** de bodemlippen liggen op het bed, de klikhaken hebben een onderkant van 45°, de
  kuiltjes en groeven zijn van boven open; het deksel links print met de buitenkant op het bed (sponning boven), het
  deksel rechts met de binnenkant op het bed (de lip op het bed). Rek van een haak 0,62 %, inklikken 9,7 N per haak; rek
  van een dekselvinger 0,44 %, samen 44 N (docs/Berekeningen.md, hoofdstuk 8). Geen schroeven, inserts of paspennen in
  de naad (de bodemlippen zijn de geprinte nokken die uitlijnen).
- **De naad van het deksel** ligt 2 mm naast die van de bak; de lip van 12 overlapt de naad van de bak, zodat het dichte
  deksel de 2 helften bovenaan verbindt. Het deksel heeft 6 schroeven (2 links, 4 rechts).
- **Plaatsen:** de ESP met haar USB naar de voorwand (opening), de DC-bus in de achterwand van de rechterhelft boven de
  WAGO-klemmen, de ingangen van de optocouplerprints naar de rechterwand met 4 tules ernaast, de regelaar rechtsvoor. Van
  de 18 tules: 5 links en 4 vooraan in de linkerhelft, 3 vooraan, 2 achteraan en 4 rechts in de rechterhelft.
- **Hallsensor:** Honeywell SS441A (3,8-30 V, open collector, 20 mA) of een A3144-kloon (4,5-24 V): rechtstreeks op 12 V,
  de uitgang aan IN; 10,6 mA door de ingang. Kant-en-klare Arduino-hallmodules met lampje en pull-up (KY-003): niet
  gebruiken (README). Tot 19 sensoren samen op -F18; meerdere per ingang mag (parallel).
- **Aan/uit:** de PCA9685 blijft (de ESP heeft te weinig vrije GPIO's voor 16 uitgangen naast 16 ingangen), maar zet elk
  kanaal volledig aan of uit.

Na te meten (nieuw): de echte hoogte van de MOSFET-module (de doos is gerekend tot 39); de stroom in een ingang met een
hallsensor (verwacht 10,6 mA; boven 18 mA een weerstand van 1 kΩ in serie); of de klikhaken klikken met de printer van
Ian (de nok mag 0,1 tot 0,2 afwijken: dan de nok in maten.mjs aanpassen, alleen de rechterhelft opnieuw).

Bijsturing (Ian, 2026-11-15): "Kabel goten mogen weg op de treindoos". Uitgewerkt: geen kabelgoten, geen gootdeksels
(Gootdeksel.kcad, Gootdeksels-plaat.kcad en goten.mjs verwijderd), geen naadgoot en naadwand. De bordjes blijven op hun
plaats van versie 4: elk op een steunrail, tussen 2 palen (X) en 4 lage aanslagen langs de lange kanten (Z, 4,9 hoog: onder
de draadingangen van de klemmen) en vast in 4 klemlippen. De draden lopen rechtstreeks van de tule of hun gaatje in de
bodem naar hun klem; per rij gebundeld met een kabelbinder in de vrije strook van 9,2 voor de rij. De spatel blijft (blad:
klemlip openduwen; haakje: een draad tussen de bordjes uittrekken). Rebuild: linkerhelft 21,1 s, rechterhelft 7,4 s (was
28,4 en 10,5 met de goten).

Bijsturing (Ian, 2026-11-15): "Gaatjes van de linkse box zijn 2mm op 2mm voor de printjes". Gelezen als: de leddraden
komen van boven door de bodem, en daarvoor komen er **vierkante gaatjes van 2 x 2** in plaats van de lange draadsleuven.
Uitgewerkt: **per klem één gaatje** (16 bordjes x 2 klemstroken x 16 klemmen = 512), recht voor die klem in de vrije strook
voor het bordje. De klemmen staan op 2,54: in één rij liet een gaatje van 2 maar 0,54 vlees; daarom om en om in 2 rijen
(0,3 en 2,5 van de rand van het bordje, binnen een rij steek 5,08). In een strook van 9,2 tussen 2 rijen bordjes liggen
zo 4 rijen gaatjes om en om (even, oneven, even, oneven): vlees 3,08 in een rij, 2,4 tussen 2 rijen, 0,58 schuin tussen 2
hoekpunten. Rond de gaatjes van een bordje en een strook staat een **eilandje van 0,4 hoog** (19 stuks, hoogstens 32 gaatjes
elk): met 512 gaatjes in één bodemvlak maakte de mesh-kernel van de app een fout in het vlak; per eilandje gaat het goed.
De aanslagen schoven naar x ±26 (voorbij de klemmen), bordje 16 kreeg ook 4 aanslagen (de 2 lange stroken vielen weg).
Printbaar met de bodem op het bed: de gaatjes zijn staande kokers, geen overhang. Rebuild linkerhelft 33,1 s.
Mogelijk anders bedoeld: bevestigingsgaatjes Ø2 voor de printjes (de bordjes hebben 4 gaatjes Ø2,2 in hun hoeken) — na te
vragen bij Ian; de bordjes zitten nu vast in hun klemlippen, zonder schroeven. (Zo bleek het: zie hieronder.)

Bijsturing (Ian, 2026-11-15): "Nu hangen de bordjes nog vast met inklik dingen, ik wil ze geschroefd hebben. Gaten zitten op
2mm op 2mm van de hoeken van het bordje." Uitgewerkt (versie 5b):
- **Geen klemlippen meer**: elk bordje ligt op **4 schroefpaaltjes Ø5** recht onder zijn gaten (hart **2,0 van beide
  randen**: 57,1 x 16,9 hart op hart) en op de steunrail in het midden (die blijft: de print buigt niet door als je een
  klem aandraait). De palen tussen de bordjes en de aanslagen vallen weg: de 4 schroeven houden het bordje op zijn plaats.
- **Schroef: plaatschroef voor kunststof 2,0 x 6, bolkop Ø4, kruiskop PH1** (makkelijk te koop, bv. per 100). Het gat in
  de print is Ø2,2 (AANNAME, na te meten): een schroef van 2,2 gaat er niet door, 2,0 wel. Voorgat Ø1,6 (0,8 x d) tot
  0,4 boven de onderkant van de bodem; wand 1,7 (4 lijnen); de schroef grijpt 4,4 diep; uittrekkracht ± 207 N per
  schroef (Berekeningen §6). De kop blijft 1,45 van de eindklem en 8,2 van de klemstrook; de schroevendraaier (PH1, Ø4,5)
  raakt geen klem (test). Detail en plaats van elk paaltje: **TRN-07**.
- De **512 gaatjes 2 x 2 vallen weg** (dat was een verkeerde lezing van "2mm op 2mm"): terug naar de **draadsleuven** van
  40 x 4 tussen de rijen (één per bordje) en 20 x 6 links per rij.
- Bestellijst: 70 schroefjes 2,0 x 6 (64 + 6 reserve, € 3,50): totaal **€ 198,45**. Montage: bordje op de 4 paaltjes
  leggen, 4 schroeven.

## Versie 6 (Ian, 2026-11-15): IR, servo's, PNP, geluidskastjes, situatieplan en tv

Wensen van Ian, letterlijk:
- "PNP moeten ook kunnen."
- "Wissels, seinen of slagbomen moeten ook kunnen."
- "Geluiden: dit moeten kleine speakertjes zijn die ik ergens kan plaatsen."
- "Een volledig situatieplan waar alles op te zien is."
- "Dat de software op een televisie kan projecteren waar bussen aan het rijden zijn of als er bepaalde groepen lichten aan
  of uitgaan."
- "Treindoos moet IR leds, IR sensors, FTR sensoren moeten kunnen binnenlezen, uitsturen."

Uitgewerkt (fase A: elektronica, firmware, dashboard, tv; fase B: de aanpassingen aan de doos, pas na "klaar"):
- **Vrije pinnen:** alleen GPIO 11, 39, 42, 47 en 48 zijn nog vrij. Verdeling: **GPIO47 = IR zenden** (RMT met
  draaggolf), **GPIO48, 11, 39, 42 = 4 IR-/FTR-ontvangers** (RMT ontvangen: de ESP32-S3 heeft 4 RMT-kanalen om te zenden
  en 4 om te ontvangen). Alles wat meer nodig is gaat over de I2C-bus die er al is (GPIO8/9): een **MCP23017** (0x20,
  16 extra in- of uitgangen) en een **tweede PCA9685 voor de servo's op 0x42** (0x40 = groepen 1-16, 0x41 blijft vrij
  voor de groepen 17-32).
- **IR zenden:** één gemoduleerd signaal (draaggolf 30 tot 56 kHz, instelbaar; codering NEC, RC5 of raw) op GPIO47 naar
  een snelle MOSFET-module (zonder optocoupler, die is te traag voor 38 kHz) in de retour van alle IR-leds; per IR-led een
  **schakeluitgang** (MCP23017 -> een kanaal van een 8-kanaals MOSFET-module zoals -Q1) die kiest welke led(s) meedoen.
  Stroom per IR-led: zie Berekeningen (IR-led op 12 V met een serieweerstand, piek ± 90 mA, gemiddeld veel minder).
- **IR leren:** een **leerontvanger** (Vishay TSMP58000, geeft de draaggolf door) meet de draaggolf en de pulstijden van
  Ians eigen IR-zender; de doos bewaart de code (raw of herkend als NEC/RC5) en kan ze opnieuw uitsturen.
- **IR-/FTR-ontvangers op de baan:** elke ontvanger (TSOP 38 kHz of een fototransistor-module, "FTR": AANNAME,
  fototransistor) leest ruwe codes; in het dashboard koppel je een code aan een bus: "bus X gezien bij punt Y".
- **Servo's** (wissels, slagbomen, armseinen): de tweede PCA9685 op **50 Hz** met een **eigen voeding 5-6 V** (regelaar
  van 12 V, eigen zekering); per servo de 2 eindstanden en de snelheid, te gebruiken in functies. **Lichtseinen en
  verkeerslichten zijn gewone lichtgroepen.**
- **PNP:** per ingang of per groep van 8 kiesbaar NPN (de sensor trekt naar 0 V) of PNP (de sensor geeft +12 V): in de
  firmware de polariteit per ingang, in de bedrading de gemeenschappelijke klem van de optocouplerprint (zie README).
- **Geluidskastjes:** kleine, losse kastjes die Ian overal kan plaatsen: een ESP32-bordje + versterker MAX98357A +
  luidsprekertje Ø28 tot 40 op 12 V (via een kleine regelaar naar 5 V), in een geprinte behuizing. Ze melden zich aan op
  het wifi-netwerk "Treinbaan" van de doos; de doos zegt welk kastje welk geluid speelt; geluiden upload je via het
  dashboard; elk kastje speelt zijn eigen geluid tegelijk met de andere.
- **Tv-pagina:** een laptop met HDMI aan de tv toont `treinbaan.local/tv`: het plan met de rijdende bussen (plaats uit
  de hallsensoren en IR-/FTR-ontvangers, tussen 2 punten geschat met de gemeten rijtijd), de lichtgroepen en de stand van
  de wissels, slagbomen en verkeerslichten. Met een demomodus.
- **Busbaan (Station Turnhout):** 4 haltestroken, 4 Car System-wissels, 4 stoppunten, IR-led 5, 6 en 7, hallsensor 1. De
  verkeerslichtendecoder en de timer vallen weg: de doos doet de **bushalte**: bus komt aan -> stopt (IR) -> wacht ->
  wacht tot het verkeer vrij is -> groen -> vertrekt.
- **Plan:** het situatieplan zelf maakt een andere agent (`situatieplan/`: plan.svg, plan-3840x2160.png, plan.json in
  pixels en meters); de tv-pagina en de planeditor in het dashboard lezen dat formaat (lijnen als polylijnen, punten met
  hun koppeling aan ingang, groep, servo, IR of kastje). Tot het er is: een eenvoudig testplan in hetzelfde formaat.
