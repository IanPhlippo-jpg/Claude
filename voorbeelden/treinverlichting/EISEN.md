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
