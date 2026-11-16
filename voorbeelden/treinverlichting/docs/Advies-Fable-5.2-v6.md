# Advies Fable 5.2 op de kabeldoos, versie 6 (2026-11-16)

Onafhankelijke review van `voorbeelden/treinverlichting/` (werkboom op commit 5f2835f; de inhoud van de map is die van
4c8410f). Er is geen code gewijzigd. Paden zijn relatief aan `voorbeelden/treinverlichting/`.

**Oordeel in het kort.** De logica (include/*.h) is netjes, getest en goed leesbaar. Maar versie 6 is een ontwerp op
papier: niets is op hardware gemeten, en de drie dragende aannames (hoe de optocouplerprint aan de ingangskant
geschakeld is, welke polariteit de MOSFET-modules hebben, en hoe de bussen van Ian op IR reageren) zijn niet nagekeken.
Ze beslissen elk of een hoofdfunctie werkt. **Bestel van elke module één stuk, meet, en print en bedraad pas daarna.**
Zo lang dat niet gebeurd is, is "versie 6 af" te sterk.

**Aantallen:** 3 x P1, 26 x P2, 33 x P3 (62 bevindingen).
P1 = gaat stuk, werkt niet of onveilig; P2 = werkt waarschijnlijk slecht of onbetrouwbaar; P3 = verbetering of document.
AANNAME = ik kon het niet nakijken (geen hardware; de productpagina's van de modules waren vandaag niet op te halen).

Wat ik gedraaid heb: `python -m platformio test -e native` (129 van 129 geslaagd, 41 s) en
`VOORBEELDEN=1 npx vitest run src/qa/tekeningenTrein.test.ts src/qa/schemaNorm.test.ts` (21 geslaagd, 1 overgeslagen).
`qaTrein.test.ts` niet gedraaid (zoals gevraagd). De firmware voor de ESP is gebouwd (`.pio/build/doos/firmware.bin`,
1,04 MB), maar nooit uitgevoerd.

---

## De 10 belangrijkste

| # | Nr | Prio | Kort |
|---|---|---|---|
| 1 | E3 | P1 | De ingangskant van de optocouplerprint is een aanname (VCC gemeenschappelijk, sensor trekt IN naar 0 V). De gangbare print is andersom (IN = anode, gemeenschappelijke GND): dan werkt geen enkele knop, reed of hallsensor zoals de README zegt |
| 2 | E1 | P1 | -Q4 (IR-led kiezen) is "zoals -Q1", maar de firmware stuurt -Q1 actief laag en -Q4 actief hoog. Eén van de twee is fout; voor -Q4 bestaat geen bouwvlag |
| 3 | E2 | P1 | FTR/reflexsensor (letterlijke eis van Ian) heeft geen werkende aansluiting: op de 12 V-ingang hetzelfde probleem als de KY-003 die de README verbiedt, op de RMT-ontvangers geeft een niveau langer dan 12 ms geen frame |
| 4 | F2 | P2 | De halte zendt de stopcode maar 2,5 s. Een bus die alleen stilstaat zolang hij IR ziet, rijdt na 2,5 s weg; een bus die "vasthoudt", blijft na een herstart van de doos voor altijd staan |
| 5 | E4 | P2 | IR-driver: de gemeenschappelijke source van een optocoupler-MOSFET-module wordt op 38 kHz geschakeld door een AOD4184 met 3,3 V op de gate en pulsen van 8,8 µs. Alleen in gelijkstroom gerekend, nooit gemeten |
| 6 | F1 | P2 | Het bussysteem is onbekend. Leren en zenden werken alleen met een draaggolf van 30 tot 56 kHz; is het IR van Ian ongemoduleerd of van een ander soort, dan werkt de hele IR-keten niet |
| 7 | E8 | P2 | Bij het opstarten krijgen alle servo's tegelijk hun puls; de grens "hoogstens 4 tegelijk" geldt daar niet. Tot 16 x blokkeerstroom op een voeding die op 2,92 A gerekend is |
| 8 | E5 | P2 | Met actief-lage modules staan na het inschakelen alle 16 groepen aan tot de firmware de PCA9685 instelt (± 1 s), en blijvend als de ESP niet start. De OE-pull-up helpt daar niet tegen |
| 9 | E6 | P2 | I2C op 400 kHz over ± 1 m losse dupontkabel (2 kabels aan elkaar over de naad), 3 tot 4 chips, pull-ups ± 5 kΩ: stijgtijd ± 550 ns, de norm vraagt 300 ns |
| 10 | T1 | P2 | Het meetblad TRN-20 kent versie 6 niet: geen stap voor de XL4015 (komt op een willekeurige spanning uit de zak, met een elco van 10 V erachter), de polariteit van -Q4, de IR-zender, de MCP23017 of de servo's |

---

## 1. Elektrisch

### E1 (P1) Polariteit van -Q4 klopt niet met die van -Q1
- **Waar:** `firmware/src/hw.h:13-15` (uitgangen standaard actief laag: led van de optocoupler tussen VCC en IN),
  `hw.h:169` en `schema/uitbreiding.mjs:49` ("GPA hoog = die IR-led doet mee"), `firmware/src/main.cpp:206` en `:215`
  (`zetA(0)` = alles uit, `zetA(z.leds)` = bit hoog = meedoen), `uitbreiding.mjs:123` (-Q4 "zoals -Q1").
- **Fout:** dezelfde module krijgt twee tegengestelde polariteiten. Is ze actief laag (de aanname voor -Q1), dan zijn in
  rust alle 8 IR-kanalen aan en zendt de doos naar alle leds **behalve** de gekozen: de stopcode gaat naar de verkeerde
  haltes. Is ze actief hoog, dan staan de 16 lichtgroepen verkeerd om tot iemand de bouwvlag vindt.
- **Fix:** één constante voor beide. In `hw.h`: `Mcp23017::zetA(m)` schrijft `UITGANG_ACTIEF_LAAG ? ~m : m`; in `begin()`
  eerst `OLATA = UITGANG_ACTIEF_LAAG ? 0xFF : 0x00`, dan pas `IODIRA = 0x00`. Op TRN-20 een stap: "IR-led 1 gekozen
  in het dashboard: alleen kanaal 1 van -Q4 geleidt (meten: n− naar VIN− < 0,1 V), de andere 7 niet".

### E2 (P1) FTR/reflexsensor: geen werkende aansluiting
- **Waar:** `README.md:217`, `:239` en `docs/sensoradvies.py:14` (TCRT5000-module aan elk stoppunt, geteld bij de 24
  ingangen), `README.md:70` (KY-003 "niet gebruiken"), `uitbreiding.mjs:69` (FTR "op dezelfde klem" als de TSOP),
  `firmware/src/irhw.h:53` (frame eindigt na 12 ms zonder flank), `irhw.h:116` (`if (d == 0) break`),
  `main.cpp:290` (`if (n <= 0) continue`).
- **Fout, weg 1 (ingang met optocoupler op 12 V):** een TCRT5000-module heeft een LM393 met een pull-up van 10 kΩ en
  een lampje naar haar eigen VCC (3,3 of 5 V). Dat is exact het geval dat de README voor de KY-003 verbiedt: in rust
  loopt er stroom van +12 V door de led van de PC817 naar de 5 V van de module (± 0,5 tot 2 mA), de ingang blijft
  actief en de 5 V-rail van de module wordt opgeduwd.
- **Fout, weg 2 (RMT-ontvanger GPIO11/39/42):** een bus die boven de sensor staat geeft één lang niveau. De RMT sluit
  na 12 ms af met alleen een eindmarkering (duur 0); `ontvang()` geeft dan 0 tijden en de IR-taak gooit het weg. Een
  melding "ftr" ontstaat alleen bij toevallige korte flanken (AANNAME over het gedrag van de RMT: te bevestigen met een
  draadje naar GND op GPIO11). Bovendien zijn er maar 3 zulke klemmen voor 4 stoppunten.
- **Waarom P1:** "FTR sensoren moeten kunnen binnenlezen" staat letterlijk in EISEN.md, en de README belooft dat de
  reflexsensor "ook een bus die stilstaat" ziet.
- **Fix:** de reflexsensoren niet via de RMT en niet via 12 V. Voed de TCRT5000-modules met de beveiligde 3,3 V (E11) en
  hang hun uitgang rechtstreeks, met 1 kΩ in serie in de doos, aan GPB0..GPB6 van de MCP23017 (interne pull-up staat al
  aan, `hw.h:195`), soort "contact". -K6 vervalt dan voor die ingangen. De RMT-ontvangers alleen voor gecodeerd IR.
  Wil je een lichtsluis toch op een RMT-pin: in `irhw.h` de pin ook met `gpio_get_level` lezen in de lichttaak.

### E3 (P1) De ingangskant van de optocouplerprint is niet nagekeken
- **Waar:** `docs/Maten-en-bronnen.md:142-143` (klemvolgorde en serieweerstand AANNAME), `opbouw.mjs:97` (klemmen
  `VCC, IN1..IN8, GND`), `README.md:66-68`, `docs/Berekeningen.md` §4, draden W11/W12 (S12 naar "VCC" van -K3/-K4).
- **Fout:** alles gaat uit van "VCC (+12 V) door 1 kΩ en de led naar IN, de sensor trekt IN naar 0 V". De gangbare
  8-kanaals PC817-print "3,6-30 V" heeft volgens mijn kennis de led tussen IN (anode, via de weerstand) en een
  gemeenschappelijke GND: een signaal dat **hoog** wordt, schakelt (AANNAME van mijn kant; de productpagina was niet op
  te halen). Dan doet een knop, reed of open-collector-hallsensor naar 0 V niets, en is er geen "VCC aan de
  ingangskant" om S12 op aan te sluiten.
- **Gevolg:** de keuze voor de SS441A (open collector), -F18, de standaard "npn" en het hele hoofdstuk NPN/PNP hangen
  hieraan.
- **Fix:** één print kopen en meten vóór er iets bedraad wordt (diodetest tussen IN en elke gemeenschappelijke klem).
  Drie uitkomsten:
  1. per kanaal een eigen paar klemmen (IN+ en IN−): het beste geval. NPN: IN+ aan S12, IN− aan de sensor. PNP: IN+
     aan de sensor, IN− aan 0 V. Geen aparte "PNP-print" nodig, per ingang te kiezen. Dan README en schema zo
     herschrijven.
  2. gemeenschappelijke GND (hoog = actief): contacten en reed tussen S12 en IN, PNP-sensoren rechtstreeks. Voor NPN
     en open-collector-hallsensoren een pull-up van 2,2 kΩ van IN naar S12 en de ingang in de firmware omkeren (dat
     kan al: `-DTREIN_PNP_KEERT_OM` met polariteit "pnp"), of een print met PC814.
  3. gemeenschappelijke VCC (zoals getekend): niets wijzigen.

### E4 (P2) IR-driver: modulatie op de gemeenschappelijke source, 3,3 V op de gate
- **Waar:** `opbouw.mjs:328` (VIN− van -Q4 naar OUT− van -Q3), `opbouw.mjs:330` (GPIO47 rechtstreeks op PWM van -Q3,
  30 cm dupont over de naad), `irhw.h:44` (duty 33 %), `docs/Berekeningen.md:79`.
- **Fout:** (a) de MOSFET's van -Q4 krijgen hun gate uit VIN+ via een optocoupler, ten opzichte van VIN−. Schakelt -Q3
  VIN− 38 000 keer per seconde los van 0 V, dan zweeft die referentie mee en moet de gate van -Q4 elke periode
  bijladen; hoe dat uitvalt hangt van de onbekende schakeling van de module af. (b) De AOD4184 is gespecificeerd bij
  4,5 en 10 V op de gate (drempel tot 2,6 V); met 3,3 V uit de ESP en een gateweerstand op de module (AANNAME) duurt het
  schakelen enkele µs, bij een puls van 8,8 µs (33 % van 26 µs). Zulke modules worden verkocht voor PWM tot ± 20 kHz
  (AANNAME). Het rekenblad rekent alleen de gelijkstroom (89 mA, 0,02 V).
- **Fix:** meten vóór de leds in de baan gaan: 1 Ω in de 0 V van -Q3 en een scoop, of de leerontvanger -B1 als
  meetinstrument (IR-led voor het venster, code zenden, leren: frequentie binnen 1 kHz en dezelfde code terug). Maak
  daar een knop "IR-zelftest" van in het dashboard. Zet de duty in `irhw.h:44` op 50 % als de puls te smal uitvalt.
  Werkt het niet: -Q4 vervangen door iets dat statisch en zwevend schakelt (8 relais of fotovoltaïsche SSR's), of per
  IR-led een eigen snelle logic-level schakelaar.

### E5 (P2) Na het inschakelen staan alle groepen aan (actief-lage modules)
- **Waar:** `hw.h:33-35`, `main.cpp:7` ("een externe pull-up van 1 kΩ houdt alles UIT tijdens reset en flashen"),
  `main.cpp:716-728`.
- **Fout:** na een koude start staat MODE2 van de PCA9685 op 0x04 (niet omgekeerd, OUTNE = 00): met OE hoog zijn de
  uitgangen **laag**. Bij modules die op laag schakelen is dat "aan". Pas als `pcaBegin()` MODE2 = 0x15 schrijft
  (na het opstarten van de ESP en de PSRAM-test, ± 1 s) gaan ze uit. Start de ESP niet (lege flash, defect, 5 V weg),
  dan blijven alle 16 groepen aan. De zin in `main.cpp:7` klopt alleen na een warme reset.
- **Waarom:** 16 groepen tegelijk aan is tot 5,1 A inschakelstroom en elke keer een lichtflits over de hele baan.
- **Fix:** bij het nameten (TRN-20 stap 8) ook dit proberen: ESP uit de adapter, 12 V aan, brandt het bordje? Zo ja:
  de versie van de module nemen die op hoog schakelt (dan is de toestand na inschakelen "uit" en doet OE wat de
  commentaar belooft), of het gedrag in de README zetten. `main.cpp:7` corrigeren.

### E6 (P2) I2C: 400 kHz over ± 1 m dupont
- **Waar:** `main.cpp:63` (`I2C_HZ = 400000`), `opbouw.mjs:303-304`, `:312`, `:314` (ESP → -K2 → -K7 → -K5, de laatste
  met "2 dupontkabels van 30 cm aan elkaar, over de naad").
- **Fout:** pull-ups 2 x 10 kΩ (PCA9685-printen, AANNAME; de CJMCU-2317 heeft er mogelijk geen) = 5 kΩ; capaciteit
  ± 130 pF (1 m losse draad + 3 chips). Stijgtijd 0,85 x R x C ≈ 550 ns; fast mode staat 300 ns toe. Daarnaast lopen
  SDA en SCL over de naad naast GPIO47 (38 kHz) en de retour van de IR-leds (0,7 A-pulsen). Een steekverbinding
  halverwege de kabel, ondersteboven onder een baan, is de klassieke intermitterende fout.
- **Fix:** `I2C_HZ = 100000`; 2 x 4,7 kΩ van SDA en SCL naar 3,3 V op -X6; over de naad één kabel uit één stuk, SDA en
  SCL elk getwist met GND, niet in dezelfde bundel als W80-W83. Bij 100 kHz duurt `Pca9685::zet` (65 bytes, `hw.h:67`)
  en `PcaServo::zet` (`hw.h:298`) 6,5 ms, langer dan de tick van 5 ms: schrijf alleen de kanalen die veranderden
  (4 bytes per kanaal), en lees van de MCP23017 alleen poort B (3 bytes in plaats van 6).

### E7 (P2) MCP23017: GPA7 en GPB7 zijn geen ingangen
- **Waar:** `hw.h:170-171` (GPB0..GPB7 = ingang 17..24; 0x21: alle 16 als ingang), `ingangen.h:5-6`.
- **Fout:** Microchip heeft het datablad van de MCP23017 aangepast (2022): GPA7 en GPB7 zijn alleen uitgang; als
  ingang kunnen ze de I2C-bus storen wanneer het niveau verandert tijdens een overdracht.
- **Fix:** ingang 24 (en 32 en 40 op 0x21) schrappen: `IODIRB = 0x7F`, in `main.cpp:251` de aanwezig-maskers
  aanpassen, het dashboard toont ze niet. De telling "16 + 8 = 24 ingangen" in `README.md:244` wordt 23.

### E8 (P2) Servo's: bij het opstarten allemaal tegelijk
- **Waar:** `main.cpp:164-170` (`laadStand` → `servosOpStand`), `baan.h:442-448`, `servo.h:77-86` (`zetMeteen`),
  `servo.h:94-100` (eerste opdracht: de puls staat er meteen, ook als de servo in de rij "wacht"),
  `docs/berekeningen.py:68` en `:285-287`.
- **Fout:** de grens van 4 geldt alleen voor latere bewegingen. Bij elke start krijgen alle gebruikte servo's in
  dezelfde periode van 20 ms hun puls en springen ze samen; ook een eerste `naar()` omzeilt de rij. Het rekenblad
  (2,92 A, -F19 3 A, adapter) rekent met 4. Bovendien is 0,70 A blokkeerstroom voor een MG90S te laag (eerder 1,0 tot
  1,2 A bij 6 V, AANNAME uit gangbare opgaven).
- **Gevolg:** tot ± 11 A gevraagd uit een XL4015 van 5 A: de 5,5 V zakt in, de servo's trillen, en samen met de
  lampen kan de adapter in beveiliging gaan, waarna alles opnieuw start en hetzelfde doet.
- **Fix:** in `servosOpStand` de servo's niet actief maken maar in de rij zetten (één nieuwe servo per 300 ms, via
  `vraagPlaats`), en in `servo.h:94-100` `actief` pas zetten in `begin()`. Test erbij: na `servosOpStand` met 16
  servo's hebben nooit meer dan 4 kanalen een nieuwe puls binnen 300 ms. In het rekenblad `blok=1.2` voor de MG90S.

### E9 (P2) XL4015: niet ingesteld geleverd, elco van 10 V
- **Waar:** `README.md:181-182`, `:211` ("Elco 1000 µF 10 V of meer"), `uitbreiding.mjs:134`, TRN-20 (geen stap).
- **Fout:** de module komt met een willekeurige uitgangsspanning (tot de ingangsspanning, hier 12 V). De waarschuwing
  staat in de README en het schema, niet op het meetblad dat bij de bouw gebruikt wordt. Een elco van 10 V op 12 V kan
  openbarsten; servo's op 12 V zijn stuk.
- **Fix:** elco 1000 µF **25 V**; TRN-20: "-T3 zonder servo's en zonder -K7: OUT+ – OUT− = 5,4 .. 5,6 V" als stap vóór
  het aansluiten van W-V6; een druppel lak op de potmeter.

### E10 (P2) Servokabels zonder beveiliging
- **Waar:** `opbouw.mjs:316-320`, `uitbreiding.mjs:80-88`.
- **Fout:** de 5,5 V gaat met tot 5 A (stroomgrens van de XL4015) de baan op over servodraadjes van ± 0,08 mm², vaak
  verlengd. -F19 (3 A aan de 12 V-kant) laat aan de 5,5 V-kant ruim 5 A toe. Een kortsluiting aan een servostekker
  maakt zo'n draad heet.
- **Fix:** per servo of per groep van 4 een polyfuse 1,1 A in de V+ (zoals bij de groepen), of een XL4015 met
  instelbare stroomgrens op 3 A en verlengkabels van minstens 0,25 mm².

### E11 (P2) De 3,3 V van de ESP en 3 GPIO's gaan onbeveiligd de baan op
- **Waar:** `opbouw.mjs:322` (-X7 → -X12, 3,3 V naar de ontvangers), `uitbreiding.mjs:56-64` (OUT rechtstreeks op
  GPIO11/39/42), `README.md:179-180`.
- **Fout:** tot 3 m kabel onder een baan met spoelen, wisselaandrijvingen en railspanning hangt rechtstreeks aan de
  3,3 V-regelaar van het ESP-bord en aan de GPIO's. Een sluiting naar 0 V laat de ESP herstarten in een lus; een
  aanraking met 12 V of railspanning is het einde van de ESP. De 12 V voor sensoren heeft wel een eigen polyfuse (-F18).
- **Fix:** een eigen regelaartje 3,3 V (AMS1117-module, uit de 5 V) voor alles wat de doos verlaat, met een polyfuse
  0,1 A; in de doos 1 kΩ in serie met elke ontvangerlijn en 1 nF naar 0 V aan de klem van de ESP.

### E12 (P2) Storing van de IR-leddraden in de ontvangerdraden
- **Waar:** TRN-11 (IR-leds en ontvangers door dezelfde tules vooraan), `README.md:176-180`.
- **Fout:** de draden naar de IR-leds dragen blokgolven van 12 V op precies 38 kHz, de doorlaatband van de TSOP's.
  De uitgang van een TSOP is hoogohmig (interne pull-up ± 30 kΩ): een paar meter parallel in dezelfde bundel koppelt
  volt-pieken in, die de RMT als flanken leest (het stoorfilter is 1,25 µs, `irhw.h:52`).
- **Fix:** elke IR-led een getwist paar (heen en terug samen), een andere tule en kabelweg dan de ontvangers; de
  ontvangers een pull-up van 4,7 kΩ in de doos en de RC van E11; `filter_ticks_thresh` naar 255 (3,2 µs) voor de
  gedemoduleerde ontvangers.

### E13 (P2) PNP: de voorgestelde printen bestaan niet als bestelbaar onderdeel
- **Waar:** `README.md:184-189`, `uitbreiding.mjs:103`, `:136`, `README.md:213`; tegenspraak met `README.md:69`
  ("PNP: niet rechtstreeks").
- **Fout:** "een PNP-versie van de print" en "een print met bipolaire optocouplers (PC814)" hebben geen type, winkel
  of artikelnummer (zelf als AANNAME gemerkt). De eis "PNP moeten ook kunnen" is zo niet te bouwen. De berekening
  (3,8 en 5,8 mA met COM op 5 V) klopt, en de waarschuwing voor 12 V in sperrichting is terecht.
- **Fix:** eerst E3. Bij uitkomst 1 of 2 is PNP opgelost met de print die er is. Bij uitkomst 3: een concreet
  onderdeel opzoeken en nameten, of per PNP-sensor een klein relais (staat al in `README.md:69`). De tabel
  "Aansluiten" in de README bijwerken zodat ze niet tegenspreekt wat 120 regels lager staat.

### E14 (P3) Voedingsbudget en hoofdzekering
`docs/Berekeningen.md:85`: het ongunstigste geval is 7,33 A, meer dan de adapter (6,67 A); het rekenblad zegt dat
zelf. De hoofdzekering van 7,5 A springt dus nooit bij overbelasting: de adapter gaat in beveiliging en de doos
herstart. Met de bordjes van 1K is er ruimte (4,26 A). Fix: in de firmware de servo's laten wachten als meer dan
12 groepen aan staan, of de eigen 5 V-adapter voor de servo's die het rekenblad al noemt.

### E15 (P3) Ompoolbeveiliging
De SB560 (5 A) tegen een zekering van 7,5 A werkt met de eigen adapter (die schakelt af). Met een voeding die 8 tot
10 A blijft leveren smelt de zekering pas na tientallen seconden en is de diode dan al te heet. Fix: een diode van
10 A of meer (bv. 10SQ045), kost hetzelfde.

### E16 (P3) Weerstand IR-led en niveau van OE
120 Ω 0,5 W ziet 0,95 W als GPIO47 ooit hoog blijft staan (fout in de firmware, verkeerde pin): neem 1 W. OE: met
2 PCA9685-printen (2 x 10 kΩ naar 0 V, AANNAME) tegen -R1 1 kΩ staat OE "hoog" op 2,75 V; de grens is 2,31 V. Het
meetblad vraagt ≥ 2,5 V: goed, maar meet met beide printen aangesloten.

### E17 (P3) 0 V van de servo's via de dupont
-K7 hangt aan 0 V via de dikke draad van -T3 én via de dupont GND van -K2 (`opbouw.mjs:312`, `:320`). Een deel van
de servostroom loopt door de dunne dupont en de massa van de ESP-adapter. Fix: de GND-dupont tussen -K2 en -K7
weglaten (de massa komt via -T3) en dat op TRN-15 zetten.

### E18 (P3) Bordversie en klonen
GPIO48 is op de DevKitC-1 v1.0 en op de meeste klonen de RGB-led; `hw.h:112-114` weet dat, de bestellijst vraagt
v1.1. Komt er toch een v1.0 of een kloon, dan hangt de leerontvanger op de datalijn van de led en werkt het
statuslampje (GPIO38) niet. Zet een controle in de bouwvolgorde ("op het bord staat v1.1").

### E19 (P3) Servo's houden altijd hun puls
`servo.h:136`: een servo die een stand kreeg, krijgt voor altijd pulsen. Een wissel die tegen zijn aanslag duwt,
trekt dan blijvend blokkeerstroom (warm, bromt). Fix: per servo een keuze "puls uit 1 s na aankomst".

---

## 2. Firmware

### F1 (P2) Het bussysteem is onbekend: de hele IR-keten rust op een draaggolf
- **Waar:** `ir.h:34` (30..56 kHz), `irhw.h:38-46`, `uitbreiding.mjs:126` (TSMP58000, 20-60 kHz).
- **Fout:** leren en zenden werken alleen als het systeem van Ian gemoduleerd IR in die band gebruikt. Stopplaatsen
  met een continu brandende IR-led of met een serieel signaal zonder draaggolf worden niet geleerd (de TSMP58000 geeft
  niets door) en niet nagebootst (de RMT zendt altijd met draaggolf, `irhw.h:42`).
- **Fix:** vóór alles het signaal van één bestaande stopplaats bekijken (fototransistor + scoop of logic analyzer, of
  de camera van een gsm om te zien of de led continu brandt). Voeg een codesoort "continu" toe (IR-led aan zolang de
  halte vasthoudt, zonder draaggolf: `carrier_en = false`) zodat het eenvoudigste systeem ook kan.

### F2 (P2) De halte houdt de bus niet vast en herstelt niet na een herstart
- **Waar:** `halte.h:25` (stop 0,5 + 2 s), `halte.h:98-107` (in "wachten" en "verkeer" wordt niets gezonden),
  `halte.h:70-76` en `baan.h:242-245` (na het opstarten: vrij, rood, geen IR).
- **Fout:** (a) het ontwerp gaat uit van een bus die een stopcode onthoudt tot hij een rijcode krijgt. Veel systemen
  stoppen alleen zolang ze het signaal zien: dan vertrekt de bus na 2,5 s, lang voor "wachtS" om is. (b) Onthoudt de
  bus wel, dan blijft hij na een stroomonderbreking of watchdog-herstart tijdens het wachten voor altijd staan: de
  halte begint in "vrij" en zendt geen rijcode meer.
- **Fix:** per halte een keuze "stopcode blijven herhalen tot groen" (elke 250 tot 500 ms in aankomst, stop, wachten
  en verkeer); bij `haltesOpnieuw` na het opstarten één keer de rijcode naar alle stopleds van elke halte.

### F3 (P2) Een tweede bus bij een bezette halte rijdt door
- **Waar:** `halte.h:79-85` (alleen haltes in "vrij" reageren), commentaar `halte.h:12-13`.
- **Fout:** komt bus 2 aan terwijl de halte in "groen" of "vertrek" staat (7 s), dan krijgt hij geen stopcode en rijdt
  hij door de halte, of op bus 1 als die traag vertrekt.
- **Fix:** de aankomst onthouden (één wachtende per halte) en bij "vrij" meteen starten; of in "groen" en "vertrek"
  de stopcode al zenden als het aankomstpunt opnieuw meldt.

### F4 (P2) IR-led kiezen en in dezelfde tick zenden
- **Waar:** `main.cpp:205-216`.
- **Fout:** `mcp1.zetA(z.leds)` en `ir.zend(code)` volgen direct op elkaar. De optocoupler en de gate van -Q4 hebben
  tijd nodig (uit: tot ± 1 ms). Bij NEC vangt de leider van 9 ms dat op; bij RC5 (eerste bit 889 µs) en raw gaat het
  begin verloren of krijgt de vorige led het begin mee.
- **Fix:** een toestand ertussen: leds kiezen, 2 ticks (10 ms) wachten, dan zenden; na het einde ook 2 ticks wachten
  voor `zetA(0)`.

### F5 (P2) Een raw-code met herhalingen wordt stil niet verzonden
- **Waar:** `ir.h:37` (`MAX_IR_PULSEN = 1200`), `ir.h:261-269` (te veel = 0 tijden), `irhw.h:26` en `:80-90`
  (`IR_MAX_ITEMS = 700`, afkappen zonder melding), `api.h:603` (herhaal 1..10 voor elke soort).
- **Fout:** een geleerde raw-code van 255 tijden met "herhaal 5" geeft 1279 tijden: `irPulsen` geeft 0 terug en
  `zend()` doet niets, zonder fout in het dashboard. De halte denkt dat ze de stopcode stuurde.
- **Fix:** in `apiIr` weigeren als `irPulsen(...) == 0` ("deze code kan hoogstens n keer herhaald worden"), en een
  teller "IR niet verzonden" in `/api/staat`.

### F6 (P2) Geen wachtwoord op de API en de update; CSRF
- **Waar:** `main.cpp:418-428` (elke POST, body als `plain`), `main.cpp:669` (`/api/update`), `main.cpp:649`.
- **Fout:** staat de doos op het thuisnet, dan kan elk toestel daar de firmware vervangen. Erger: elke webpagina die
  iemand thuis opent kan een formulier naar `http://treinbaan.local/api/update` sturen (een multipart-POST heeft geen
  toestemming van de doos nodig) en zo eigen firmware in een toestel op het thuisnet zetten.
- **Fix:** `/api/update` en `/api/instellingen` alleen aanvaarden via de eigen hotspot (IP van de client in
  192.168.4.x) of met het wifi-wachtwoord als kop; POST's met een `Origin` die niet de doos zelf is weigeren.

### F7 (P2) De hotspot laat maar 6 toestellen toe
- **Waar:** `main.cpp:384` (`WiFi.softAP(HOTSPOT_NAAM, ww, 6, 0, 6)`), `kastjes.h:22` (`MAX_KASTJES = 8`).
- **Fout:** gsm, tablet, de laptop van de tv en 8 geluidskastjes zijn 11 toestellen. Het zevende krijgt geen
  verbinding; een kastje start dan na 60 s zijn eigen hotspot en lijkt "kapot".
- **Fix:** laatste argument 10 (het maximum van de ESP32), en in de README: bij meer dan 6 kastjes alles op het
  thuisnet. Op het thuisnet volgt het kanaal van de hotspot dat van de router; dat ook vermelden.

### F8 (P3) Lange IR-frames en schrijven in het flashgeheugen
`irhw.h:37` (`mem_block_num = 1`: 48 plaatsen). Een frame van meer dan 48 items (NEC met herhaalcodes, RC5 enkele
keren, raw) wordt tijdens het zenden bijgevuld door een interrupt die wacht zolang LittleFS schrijft
(`main.cpp:694`, `:709`): het frame raakt dan beschadigd. Eén NEC-frame (34 items) is veilig. Fix: zenden op
RMT-kanaal 1 met `mem_block_num = 3` (144 items; kanaal 0 blijft voor het statuslampje), en niet bewaren zolang
`!ir.klaar()`.

### F9 (P3) OE van de servoprint: firmware en bedrading spreken elkaar tegen
`hw.h:269` en `main.cpp:23` zeggen "OE aan GND"; `opbouw.mjs:312`, `uitbreiding.mjs:87` en `README.md:183` hangen
OE aan GPIO10. Zoals bedraad stopt een fout op de lichtprint (`main.cpp:271`, OE hoog) ook alle servopulsen. Kies
één: ik zou OE gedeeld laten (veilig bij reset) en de commentaar en de melding in het dashboard aanpassen.

### F10 (P3) MCP23017: een tweede korte puls op dezelfde poort gaat verloren
`hw.h:215-226`: INTF en INTCAP bevriezen bij de eerste verandering tot ze gelezen zijn. Een puls korter dan 5 ms op
een andere pin van dezelfde poort in dezelfde tick wordt niet gezien. Voor hallsensoren met 17 ms geen probleem;
zet het in de commentaar en hang de snelste sensoren aan de GPIO-ingangen 1..16.

### F11 (P3) Een hangende I2C-bus
`main.cpp:268-279`: elke 2 s worden tot 4 chips opnieuw ingesteld; elke mislukte overdracht wacht de standaard
50 ms. Met de bus vast is de lichttaak telkens ± 0,5 s weg (ingangen en haltes haperen), zonder herstel van de bus.
Fix: `Wire.setTimeOut(10)` en bij een fout 9 klokpulsen op SCL voor de volgende `begin()`.

### F12 (P3) "Verkeer vrij" zonder grens
`halte.h:108-111`: blijft een ingang actief (magneet boven de sensor, losse draad), dan wacht de bus voor altijd.
Fix: na bv. 60 s toch groen, met een melding. Zet in de README de regel "vrijMinS ≥ afstand van de sensor tot de
invoeging / traagste snelheid".

### F13 (P3) NEC met een uitgebreid adres waarvan de hoge byte 0 is
`ir.h:106-107` tegen `ir.h:171-176`: geleerde bytes `12 00 ..` geven adres 0x0012; bij het zenden wordt dat
`12 ED`. Fix: de 4 bytes bewaren zoals gelezen.

### F14 (P3) "De oude firmware blijft tot de nieuwe goed is"
`README.md:141`, `main.cpp:572-574`: alleen de controlesom wordt nagekeken. Een build die start en dan vastloopt
blijft herstarten; terug kan alleen met USB. Tekst aanpassen ("... tot de nieuwe volledig en ongeschonden
ontvangen is"); de USB-opening in de voorwand maakt dit draaglijk.

### F15 (P3) Slot, stapel en commentaar
`main.cpp:620-624` en `:690-693`: `apiStaat` en `configNaarJson` (tot 160 kB met 32 raw-codes) bouwen hun JSON
onder het slot; de lichttaak wacht dan tientallen ms. De stapel van 6144 bytes (`main.cpp:761`) is niet gemeten:
log één keer `uxTaskGetStackHighWaterMark`. `opslag.h:9` zegt 48 kB, `opslag.h:44` is 160 kB.

### F16 (P3) Geluidskastjes na elkaar
`main.cpp:300-324`: één taak, 1,5 s time-out. Eén kastje dat net uit staat vertraagt alle volgende geluiden met
1,5 tot 3 s. Fix: time-out 400 ms en een kastje na een fout meteen "offline" zetten.

### F17 (P3) Leerbuffer: 3000 items, niet 6000
`irhw.h:24-27`: de ringbuffer van 24 kB neemt items tot ± 12 kB aan (één item mag de helft zijn), dus ± 3000
perioden van de draaggolf, niet de 6000 van `IR_MAX_FRAME`. Een NEC-frame (± 1050) past; een lange raw-code niet,
en die verdwijnt dan zonder melding. Fix: buffer 48 kB (er is PSRAM) en de fout "code te lang" tonen.

---

## 3. Doos

### D1 (P2) Passingen die de printer niet vanzelf haalt
- **Waar:** `maten.mjs` `schroefpaal` (gat Ø2,2, schroef 2,0, hart 57,1 x 16,9), `naad` (spleet 0,2, lippen 0,2
  rondom), TRN-06, TRN-07.
- **Fout:** PETG krimpt 0,3 tot 0,5 %: over 57,1 mm is dat 0,17 tot 0,28 mm, terwijl schroef en gat samen ± 0,1
  speling geven; over 230 mm is het 0,7 tot 1,1 mm tegen een lijmspleet van 0,2 en bodemlippen met 0,2. De vierde
  schroef van een bordje en de vijf lippen passen zonder kalibratie waarschijnlijk niet.
- **Fix:** eerst een proefstuk van 20 minuten (één bordplaats met 4 paaltjes, en 30 mm naad met één lip en één haak)
  en de krimp in de slicer compenseren; pas dan de helften van 10 uur. Zet dat als stap 0 in het bouwschema. De
  speling van de lippen naar 0,3.

### D2 (P2) Dupont als blijvende verbinding, ondersteboven
- **Waar:** TRN-14/TRN-15 (alle signaaldraden dupont), `opbouw.mjs:314` en `:330`.
- **Fout:** de doos hangt met de bodem tegen de baan: elke print hangt ondersteboven en elke dupont aan zijn eigen
  veerkracht. Losse busjes van 1 pin trillen los of schuiven een pin op. De koppeling van 2 kabels in de lucht over de
  naad is het zwakste punt van de hele doos, en net daar loopt de I2C-bus.
- **Fix:** over de naad draden uit één stuk; busjes per groep in een behuizing van 6 of 8 (of een druppel
  smeltlijm op de rij na het meten); bij elke module een kabelbinder door een oogje in de bodem als trekontlasting.

### D3 (P3) "Eerst nameten" geldt nu ook voor de linkerhelft
`README.md:95-98` noemt alleen de rechterhelft, maar sinds fase B draagt de linkerhelft de palen van -Q4, -Q3 en
-K5 (alle drie AANNAME, `opbouw.mjs:133`, `:146`). Tekst bijwerken; de maten van de AOD4184-modules verschillen
sterk per verkoper.

### D4 (P3) De schroef van het bordje bij een dunne print
`docs/Berekeningen.md` §6: de punt blijft 0,6 boven het einde van het voorgat bij een print van 1,6 (AANNAME). Is het
bordje 1,0 of 1,2 dik, dan loopt de schroef vast op de bodem (0,4 dik) en draait de gang stuk. Meet de print; onder
1,4 mm een schroef 2,0 x 5.

### D5 (P3) Warmte: het rekenblad is van versie 5
§5 telt de XL4015, de 16 extra ingangen en de IR-weerstanden niet mee. Ongunstigst komt er ± 3 W bij (8 W, ± 9 K):
nog altijd goed, maar zet het erin. De polyfuses zitten dan op 34 °C + eigen warmte, binnen de gerekende 40 °C.

### D6 (P3) Epoxy op PETG
PETG hecht matig op een gladde printwand. Opruwen (korrel 120) en ontvetten in TRN-06 zetten. De naad draagt niets
(elke helft hangt aan 2 eigen schroeven), dus het is niet kritisch.

### D7 (P3) Venstertje en materiaal
Het gat Ø6 is open: stof en insecten komen recht op de ontvanger. Een stukje doorzichtig plakband aan de binnenkant
volstaat (IR gaat erdoor). De plaats van de lens van de TSMP58000 is AANNAME: nameten. En: print de doos niet in
PETG-CF (de printer heet "Carbon"): koolstofvezel dempt de wifi van de ESP in de doos.

### D8 (P3) Kabels zonder goten
Na versie 6 komen er tot 24 sensordraden x 3, 8 IR-paren, 3 ontvangerkabels en 16 servokabels bij de 32 draden van
de bordjes, door 19 tules, zonder vaste punten. Geef elke tule aan de binnenkant een oogje voor een kabelbinder
(trekontlasting: nu trekt een haperende draad aan een schroefklem of een dupont).

### D9 (P3) Bereikbaarheid
Goed: alles van één kant, USB door de wand. Minder: de 2 ATO-zekeringen en de RESET-knop zitten achter 6 schroeven
onder de baan. Leg -F1 en -F19 bij de naad van het deksel of maak het deksel rechts met 2 schroeven en de lip.

---

## 4. Tekeningen, schema's en bestellijst

### T1 (P2) Het meetblad TRN-20 is niet bijgewerkt voor versie 6
Het blad (rev. 5, "firmware 1.3.0 of hoger") heeft geen stap voor: de XL4015 (E9), de polariteit van -Q4 (E1), het
gedrag bij inschakelen zonder ESP (E5), de I2C-chips (0x20, 0x40, 0x42 gevonden), de IR-zelftest (E4), één servo
tussen zijn eindstanden, de 3,3 V naar de baan, en de stroom in een ingang (de serieweerstand is AANNAME en beslist
of een hallsensor binnen zijn 20 mA blijft). Voeg ze toe; het is het enige blad dat bij de bouw echt gevolgd wordt.

### T2 (P2) De bestellijst is niet volledig en niet overal bestelbaar
- Geen type of winkel voor de PNP- of bipolaire print (E13) en voor de reflexsensor (E2).
- Niet in het totaal: de 23 hallsensoren en magneten van het sensoradvies (± € 60 tot € 75), sensorkabel (ruwweg
  60 m 3-aderig), servo-verlengkabels, 4,7 kΩ en 1 kΩ (E6, E11), krimpkous. Het echte bedrag van versie 6 met
  sensoren ligt eerder rond € 330 tot € 350 dan € 249,75.
- 4 stoppunten maar 3 IR-leds ("IR-led 5, 6 en 7" in EISEN.md en `situatieplan/plan.json`): de vierde halte kan
  geen bus stoppen. Navragen bij Ian of een vierde led voorzien.
- Elco "10 V of meer" moet 25 V zijn (E9); weerstand 120 Ω liever 1 W (E16); diode 10 A (E15).
- -Q4 staat op € 9,00 en dezelfde module als -Q1 op € 20,99: kies één bron.
- Alle prijzen van de uitbreiding zijn AANNAME; dat staat er eerlijk bij.

### T3 (P3) Versienummers
`README.md:1` zegt "versie 5", het titelblok van het schema "kabeldoos verlichting, versie 5", de tekeningen en
het schema "Rev. 5" met inhoud van versie 6, `opslag.h:9` beschrijft versie 2 van het bestand. Eén revisie-index
per uitgifte (ISO 7200) en een wijzigingsregel "6: IR, servo's, NPN/PNP".

### T4 (P3) Schema blad 7 (IR)
-Q4 is getekend als 8 losse MOSFET's met de gate rechtstreeks op IN: de optocoupler en de klemmen VCC en GND van de
stuurkant ontbreken, terwijl net daar de polariteit van E1 en het probleem van E4 zitten. Teken het kanaal zoals
op het blad van -Q1 (led, fototransistor, MOSFET). De veldkabels hebben geen aanduiding (-W.. volgens 81346) en de
ontvangerlijnen geen beveiliging (E11). Goed: klassen -B, -E, -K, -M, -Q, -R, -T, -X kloppen met 81346-2, de
kruisverwijzingen en het kolomraster zijn in orde, en de IR-led heeft het juiste symbool met pijlen naar buiten.

### T5 (P3) Werktekeningen
Schaal 1:2,5 (TRN-02) is geen voorkeursschaal van ISO 5455 (wel 1:2 of 1:5). "ISO 2768-m" als algemene tolerantie
is voor FDM niet haalbaar (± 0,5 op 230 mm; zie D1): schrijf ISO 2768-c en zet de echte passingen (naad, lippen,
paaltjes) met hun eigen tolerantie op TRN-06 en TRN-07. Het symbool voor de projectiemethode (eerste hoek) vond ik
niet als tekst in TRN-02 (AANNAME: nakijken of het als figuur in het titelblok staat).

---

## 5. Tv en situatieplan

### V1 (P2) Anonieme voertuigen: spookauto's en verkeerd toegewezen bussen
- **Waar:** `firmware/ui/tv-live.js:162-165` (geen bus in de melding: de dichtstbijzijnde verwachte auto, anders een
  nieuwe auto), `:252` (weg na 3 minuten), `firmware/include/bussen.h:245-258` en `:178-185` (elke ingang wordt
  toegeschreven aan "de bus die naar dit punt op weg is").
- **Fout:** een hallsensor weet niet wat er voorbijreed. Op de gedeelde rijstrook schuift een auto zo de bus op het
  scherm naar voren (en bederft zijn gemeten rijtijd), en elke melding die bij geen verwachte auto past maakt een
  nieuwe auto die 3 minuten blijft rondrijden. Eén gemiste puls of één geparkeerde auto en het beeld loopt uit de pas.
- **Fix:** per stuk tussen 2 sensoren tellen (erin, eruit) in plaats van voertuigen te volgen; een auto verwijderen
  als hij 2 x zijn verwachte rijtijd te laat is; hallmeldingen alleen aan een bus toeschrijven op stroken waar alleen
  bussen komen (in het plan per sensor "alleen bus": ja/nee).

### V2 (P2) Zonder buscode weet de doos niet welke bus het is
- **Waar:** `bussen.h:10` ("een bus zendt zijn code voortdurend"), `tv-live.js:236` (de bus aan de halte verschijnt
  alleen als `h.bus` gekend is), `README.md:237` (één IR-ontvanger voor wissel 1).
- **Fout:** dat de bussen een eigen IR-code uitzenden staat nergens in EISEN.md: het is een aanname. Zonder code is
  `bus = -1`, toont de tv geen bus aan de halte en werkt de rijtijdschatting niet.
- **Fix:** navragen. Als de bussen niets zenden: de volgorde gebruiken (de bussen rijden in een vaste volgorde de
  busbaan op: FIFO per strook) en in het dashboard een knop "bus X staat nu bij punt Y" om te synchroniseren (bestaat
  al als `busGezien`).

### V3 (P3) Schaal
Het plan is een luchtfoto van het echte station (1 m = 5 px, AANNAME) en de baan wordt 1:87 verondersteld (AANNAME).
Een modelbaan is bijna altijd ingekort. De tv zelf heeft daar geen last van (alles in pixels van het plan), het
sensoradvies wel: "om de 50 cm = 217 px" kan 30 % naast zitten. Fix: 2 punten op de echte baan opmeten en in
`plan.json` "mm_op_de_baan_per_px" zetten; `docs/sensoradvies.py` daarmee laten rekenen. `tv-live.js:44` (6 m/s als
niets gemeten is) is dan ook af te leiden in plaats van gegokt.

### V4 (P3) Wat goed is, en één randgeval
De koppeling zelf is degelijk: de tijd van de doos (`ms`, `msNu`) wordt gebruikt en niet die van de laptop, de
ringbuffer van 64 met volgnummer vangt een herstart op, en bij 5 s stilte valt de pagina terug op de simulatie.
Randgeval: na 49,7 dagen aan één stuk loopt `millis()` over en klopt `m.ms > h.ms` in `tv-live.js` één keer niet.

### V5 (P3) `?api=` werkt maar half
`main.cpp:649` zet `Access-Control-Allow-Origin: *` alleen op `/api/meldingen`, niet op `/api/staat`
(`main.cpp:625`) en `/api/plan`. Een tv-pagina die van een andere host komt krijgt meldingen maar geen wissels,
lichten of haltes. Zelfde kop op de 2 andere GET's.

---

## 6. Sensoradvies

### S1 (P2) Hallsensor en de pool van de magneet
`README.md:216` en `docs/Maten-en-bronnen.md` (SS441A, unipolair, "de zuidpool naar de sensor"). Bij 23 sensoren en
een magneet onder elk voertuig is de helft van de magneten bij het kleven verkeerd om, en de stuurmagneet die een
Car System-voertuig al heeft, heeft een pool die je niet kiest. Fix: een omnipolaire sensor met open collector
(bv. Honeywell SS451A, 3 tot 24 V; AANNAME: nakijken in het datablad), zelfde aansluiting. Eerst met één sensor en
één bus proeven of de bestaande stuurmagneet al volstaat: dan zijn extra magneten niet nodig.

### S2 (P3) "Verkeer vrij" met doorritsensoren
Een hallsensor ziet een doorrit, geen stilstaande of trage auto tussen de sensor en de invoeging. De README zegt dat
zelf bij de stoppunten; het geldt net zo voor de invoegingen. Op die 4 plaatsen is een sensor die aanwezigheid ziet
(reflex, zie E2) zinvoller dan aan de stoppunten, waar de halte toch al weet dat de bus er staat.

### S3 (P3) Haalbaarheid: te veel in één keer
28 sensoren is 28 gaten in het wegdek, ± 60 m kabel en 2 dagen werk, voor een functie (tv) die pas zin heeft als
de halte werkt. Volgorde die ik zou aanhouden: (1) één halte met één aankomstsensor en één IR-led tot ze 50 keer na
elkaar goed gaat; (2) de 4 haltes; (3) de 4 invoegingen; (4) pas dan de 15 sensoren op de lange stukken, en alleen
als het beeld op de tv zonder hen stoort. Het advies "begin met de 12" in `README.md:245` gaat in die richting.

### S4 (P3) Tellingen
De legende op `docs/Sensoradvies.png` zegt "hallsensor (24)", de README "23 hallsensoren" (24 met HALL1). Met E7
zijn er 23 ingangen, waarvan 1 de knop: 22 voor sensoren, niet 23.

---

## 7. Testkwaliteit

### Q1 (P2) De laag waar het mis kan gaan, wordt nergens uitgevoerd
De 129 tests draaien op de pc tegen `include/*.h`. `src/hw.h`, `src/irhw.h` en `src/main.cpp` (PCA9685, MCP23017,
RMT, interrupts, taken, wifi, LittleFS, OTA) worden alleen gecompileerd. Bijna alle bevindingen hierboven zitten in
die laag of in de bedrading. Fix: een korte lijst "op het bord" (`pio test -e doos` met Unity op de ESP, of een
pagina `/zelftest`): I2C-scan, elk kanaal van de PCA9685 teruglezen, IR zenden en via -B1 teruglezen, een draadbrug
van een servokanaal naar een ingang om de pulsbreedte te meten, bewaren tijdens zenden.

### Q2 (P2) De tests bevestigen de aannames in plaats van ze te toetsen
`test_halte` test dat de stopcode 2,5 s gezonden wordt, niet of een bus daarmee blijft staan; `test_ingangen` test
"laag = actief", niet of de print dat doet; `test_bus` gaat ervan uit dat bussen een code zenden; de tv is getest
tegen een nep-doos die precies doet wat de pagina verwacht. Dat is geen fout van de tests, wel van de conclusie
"getest". Zet in README en TASKS bij elke functie "getest op de pc" of "gemeten op hardware", en houd de tweede
kolom leeg tot het zo is.

### Q3 (P3) Gevallen die ontbreken
- servo's: `test_hoogstens_vier_tegelijk` dekt `naar()` op actieve servo's, niet `zetMeteen`/`servosOpStand` en niet
  de eerste opdracht (E8);
- IR: raw x herhaal boven `MAX_IR_PULSEN` (F5), NEC met hoge adresbyte 0 (F13), een frame van één lang niveau (E2);
- halte: tweede bus tijdens groen (F3), herstart tijdens wachten (F2), een ingang die actief blijft (F12);
- MCP23017: twee pinnen in één tick (F10) en GPB7 (E7) hebben geen model op de pc;
- `schemaNorm.test.ts` kijkt structuur na (bladen, klassen, kruisverwijzingen, titelblok), niet of het schema
  elektrisch overeenkomt met `opbouw.mjs` voor de bladen van versie 6 (zo kon F9 ontstaan);
- `tekeningenTrein.test.ts` kijkt of modules passen met hun aangenomen maten: slaagt per definitie, zegt niets over
  de echte modules;
- geen test dat het meetblad en de bestellijst elke module van `MODULES` noemen (T1, T2).

---

## Wat ik zou doen, in volgorde

1. Van elke module één stuk kopen (optocouplerprint, 8-kanaals MOSFET-module, AOD4184, MCP23017, XL4015) en E3,
   E1, E5 en E4 op tafel meten. Dat kost ± € 25 en beslist over drie P1's.
2. Bij Ian navragen of één bestaande stopplaats bekijken: hoe stopt een bus (F1, F2), zenden de bussen iets (V2),
   en hoort er een vierde IR-led bij (T2).
3. De firmware bijwerken: E1, E7, E8, F2, F3, F4, F5, F7 (klein werk, samen ± 150 regels met tests) en I2C naar
   100 kHz met alleen gewijzigde kanalen (E6).
4. TRN-20 en de bestellijst bijwerken (T1, T2), dan het proefstuk printen (D1), dan pas de helften.
5. Eén halte werkend krijgen op de baan voor er meer sensoren ingebouwd worden (S3).

Niet gedaan in deze review: niets besteld, niets geïnstalleerd, niets gecommit; `TASKS.md` niet aangepast (de
opdracht liet alleen dit bestand toe).
