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
- Maten van het bordje: **61,1 x 20,9 mm** (gemeten door Ian, 2026-11-08). Hoogte met klemmen en de plaats van de gaten nog niet gemeten: de doos rekent met 14 mm hoogte en houdt het bordje met klemlippen langs de rand (geen gaten nodig).
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
