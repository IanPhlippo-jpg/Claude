# Ingebouwde nagelstofafzuiging (Lush Beauty), versie 2

Een krachtige afzuiging die in het bureaublad zit, met het LB-monogram in het RVS-rooster.
De module zakt van bovenaf in een gefreesde uitsparing en klemt zich vast met vier klauwen, zoals een Niko-inbouwdoos.
Een M5Stack Dial (ESP32 met rond scherm en draaiknop) zit rond ingebouwd in het blad en regelt de zuigkracht traploos.

![Rooster](laser/rooster-voorbeeld.png)

## Luchtweg

1. **Rooster:** RVS, lasergesneden, 96 cm² open.
2. **Filterlade:** drie lagen die je elk apart vervangt:
   - G4-voorfilter (10 mm), vangt het grove nagelstof;
   - M5-fijnstofmat (15 mm);
   - actieve koolmat (10 mm) tegen de geur van acryl en gel.
3. **Ventilator:** Delta PFR1212UHE-SP00, 120 x 38 mm, binnen de behuizing.
4. **Uitblaasplaat:** schuine lamellen sturen de lucht naar achteren, weg van de benen.

**Luchtdicht.** Het kanaal is alleen open via het rooster en de uitblaasplaat:
- elke klauw zit in een gesloten toren, die alleen naar buiten open is;
- de schroefkop dicht het schroefgat af;
- het ladefront overlapt de voorwand rondom, met schuimband ertussen.

Een test bemonstert het binnenste van de module per mm en controleert dat er geen andere weg naar buiten is.

## Filterbewaking

- **Meter:** een verschildrukmeter (Sensirion SDP810-500Pa) meet het drukverschil over het filterpakket.
- **Meetpunten:** twee meetpunten in de linker zijwand, één boven en één onder de filters, verbonden met siliconeslangetjes.
- **Ijken:** na het vervangen van de filters houd je het scherm van de Dial 2 seconden vast. De ventilator loopt dan 40 seconden van 20 naar 100 %. De Dial onthoudt hoeveel weerstand schone filters geven bij elke snelheid.
- **Volle filter:** een balkje onder op het scherm toont hoe vol de filters zijn. Is het drukverschil bij dezelfde snelheid verdubbeld, dan wordt de ring oranje en staat er "Filter vol – lade legen". Dan piept de Dial elke 10 minuten.
- **Storing:** valt het drukverschil weg terwijl de ventilator hoort te draaien, dan wordt de ring rood met "geen luchtstroom". De ventilator is dan stuk of een slang is los.

## Zuigkracht

| Ventilator | Vrij uitblazend | Max. statische druk | Vermogen |
|---|---|---|---|
| Delta PFR1212UHE-SP00 | 389 m³/h | 300 Pa | 32 W |

- **Vergelijking:** de eerste versie had een Noctua van 3,6 W en 75 Pa; ingebouwde salonmodellen hebben 60 tot 90 W.
- **Met rooster en filters:** dan blijft er naar schatting 150 tot 250 m³/h over. Dat geeft ongeveer 4 tot 7 m/s door het rooster.
- **Waarom geen F7-mat:** een vlakke F7-mat op dit oppervlak zou de luchtstroom smoren. Daarom M5. Wil je fijner filteren, dan hoort daar een geplooide filter bij.
- **Regelen:** met de draaiknop van 20 tot 100 % in stappen van 5 %. Lang drukken geeft 2 minuten boost.
- **Geluid:** op 100 % is de ventilator luid. Voor gewoon werk is 40 tot 60 % meestal genoeg.

## Bestanden

| Bestand | Wat |
|---|---|
| `Afzuiging.kcad` | assemblage, met lade-mates (schuift 0 tot 110 mm, de filters schuiven mee) |
| `../bureau/Bureau.kcad` | het bureau met de afzuiging en de uitsparingen in het blad |
| `laser/rooster.dxf` | snijcontouren voor de lasersnijder (mm, laag SNIJDEN) |
| `print/*.stl` | de PLA-delen in printstand |
| `aansluitschema.svg` | bedrading |
| `firmware/` | PlatformIO-project voor de M5Stack Dial |
| `maak-afzuiging.mjs`, `logo/*.py` | generators: alle maten staan bovenaan in `maak-afzuiging.mjs` |

## Stuklijst

| Onderdeel | Aantal | Opmerking |
|---|---|---|
| Rooster RVS 304, 1,5 mm | 1 | `laser/rooster.dxf`, 196 x 140 mm, geborsteld |
| PLA-prints | 1 set | inbouwmodule, filterlade, uitblaasplaat, 4 klauwen, dialhouder, elektronicabox, deksel |
| Delta PFR1212UHE-SP00 | 1 | 12 V, 120 x 38 mm, PWM en toerental |
| M5Stack Dial v1.1 (K130-V11) | 1 | met 2 Grove-kabels (HY2.0-4P) voor Port A en B |
| Sensirion SDP810-500Pa | 1 | verschildrukmeter, I2C, ±500 Pa, poorten voor slang 4 mm binnen |
| MCP1700-3302 (3,3 V-regelaar), 2 x 4,7 kΩ, 2 x 1 µF | 1 | voeding en pull-ups van de drukmeter |
| Siliconeslang 4 x 6 mm | 1 m | van de meetpunten naar de drukmeter |
| Netadapter 12 V 5 A | 1 | bv. Mean Well GST60A12-P1J |
| DC-inbouwbus 5,5 x 2,1 mm, zekering 4 A traag | 1 | in de elektronicabox |
| IRF4905, 2 x BC547, 2 x 1 kΩ, 3 x 10 kΩ, 470 µF/25 V | 1 | op een gaatjesprint 60 x 40 mm |
| Schroefklemmen 2,54 mm | 1 set | |
| G4-filtermat 10 mm, M5-fijnstofmat 15 mm, actieve koolmat 10 mm | rol | knippen op 177,6 x 125,1 mm |
| Schuimband 3 x 10 mm, zelfklevend | 1 m | rond de opening van de lade |
| M4 x 50 cilinderkop (DIN 912) + M4-moer | 4 | klauwen |
| M4 x 45 + M4-moer | 4 | ventilator op de uitblaasplaat |
| M3 x 10 zelftappend | 4 | uitblaasplaat aan de module |
| M2,5 x 8 zelftappend | 4 | deksel elektronicabox |
| Houtschroef 3,5 x 16 | 2 | elektronicabox onder het blad |

## Maken

**Frezen en boren.** Er zijn twee uitsparingen in het blad nodig.

| Uitsparing | Gereedschap | Plaats van het midden |
|---|---|---|
| Afzuiging, 196 x 140 mm, hoeken R5 | frees Ø10 mm | midden van het blad |
| Draaiknop, Ø60 mm | gatzaag Ø60 mm | 250 mm rechts van het midden, 100 mm van de voorkant |

Het LAGKAPTEN-blad is van binnen een honingraat. De wanden van de module en van de dialhouder dekken de rand volledig af.

**Lasersnijden.** Stuur `laser/rooster.dxf` naar een lasersnijdienst, in RVS 304 van 1,5 mm. Het rooster is één stuk, zonder losse eilanden, en geen steg of sleuf is smaller dan 1,5 mm.

**Printen.** Gebruik PLA met een laagdikte van 0,2 mm, 4 wanden en 25 % gyroid. Support is niet nodig. De STL's staan in printstand:
- de module, de dialhouder en de doos liggen met de flens op het bed;
- de lade ligt met het front op het bed;
- de uitblaasplaat ligt plat met de lamellen onder 45°.

Alles past op een bed van 220 x 220 mm. De module is 147 mm hoog.

## Monteren

1. Druk een M4-moer van onderen in elke klauw.
2. Schuif elke klauw liggend door het venster in de zijwand, tot de naaf onder het schroefgat zit. Draai de M4 x 50 van bovenaf in.
3. Draai elke schroef een paar slagen tegen de klok in. De klauw zwaait dan in de toren en ligt langs de wand.
4. Schroef de ventilator met 4 x M4 x 45 op de uitblaasplaat, met de kant met de spaken naar beneden. Schroef de plaat met 4 x M3 aan de hoekbussen.
5. Kleef schuimband rond de opening van de lade op de voorwand. Leg de drie filterlagen in de lade, G4 bovenaan, en schuif de lade in.
6. Laat de module in de uitsparing zakken en draai de vier schroeven rechtsom aan. Elke klauw zwaait door haar venster naar buiten en trekt zich tegen de onderkant van het blad. Draai stevig, maar niet te hard in PLA.
7. Leg het rooster in de flens.
8. Zet de dialhouder in het gat van Ø60 en de Dial erin. De kabels gaan door het gat in de bodem naar de elektronicabox. Die schroef je onder het blad.
9. Druk de twee siliconeslangen van onderen in de meetpunten in de linker zijwand. Leid ze door de achterkant van de elektronicabox naar de drukmeter: boven de filters naar de poort "+", onder de filters naar "-".
10. Zet de ventilator aan en houd het scherm 2 seconden vast om te ijken op de schone filters.

## Elektronica

![Aansluitschema](aansluitschema.svg)

- **Aan/uit:** G1 van Port B schakelt via de IRF4905 de 12 V van de ventilator echt aan en uit. Zonder signaal staat de ventilator uit, ook bij het opstarten.
- **Snelheid:** G2 van Port B regelt de snelheid via PWM.
- **Drukmeter:** Port A is de I2C-bus naar de drukmeter. De 5 V van Port A voedt de 3,3V-regelaar van de drukmeter.
- **Toerental:** de toerentaldraad van de ventilator blijft los. De Dial heeft maar vier vrije pinnen, en de drukmeter bewaakt de luchtstroom beter dan het toerental.
- **Draadkleuren:** meet de kleuren van de Grove-kabels en de draden van de ventilator voor het solderen even na.

## Firmware

```bash
python -m pip install platformio
```

```bash
cd voorbeelden/afzuiging/firmware
python -m platformio run -t upload
```

Sluit de Dial met USB-C aan op de computer.

**Bediening:**
- **Draaien:** de zuigkracht gaat in stappen van 5 %, van 20 tot 100 %. Draai je terwijl de ventilator uit staat, dan gaat hij aan.
- **Drukken of op het scherm tikken:** aan of uit.
- **Lang drukken:** boost, 2 minuten op 100 %.
- **Scherm 2 seconden vasthouden:** ijken op schone filters.
- **Scherm:** de ring en het percentage tonen de zuigkracht. Daaronder staat het drukverschil over de filters, met een balkje dat toont hoe vol ze zijn. Bij "Filter vol" wordt de ring oranje, bij "geen luchtstroom" rood.
- **Geheugen:** de laatste stand blijft bewaard als de stroom wegvalt.

## Onderhoud en veiligheid

- **Filters:** leeg of vervang de filters als de Dial "Filter vol" meldt. Ijk daarna opnieuw.
- **Koolmat:** vervang ze ook als de geur terugkomt, want de drukmeter ziet niet wanneer de kool verzadigd is.
- **Filters:** gebruik de afzuiging nooit zonder filters. Nagelstof hoort niet in de ventilator.
- **Netspanning:** er komt geen 230 V in het bureau, want de adapter steekt in het stopcontact.
