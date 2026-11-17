# Treinbaan: firmware van de lichtdoos

ESP32-S3-DevKitC-1 v1.1 (N16R8, twee micro-USB-poorten "UART" en "USB") met een PCA9685 (16 lichtgroepen, uit te
breiden tot 32) en 16 ingangen rechtstreeks op GPIO's. De doos maakt een eigen wifi-netwerk met een dashboard voor gsm
en tablet, en meldt zich als je dat wilt ook aan op de wifi van het huis. Firmware **2.2.0** (de tweede ronde van het
advies van Fable 5.2 verwerkt, zie hieronder); sinds 2.0.0: **IR** zenden,
leren en ontvangen, **servo's** (wissels, slagbomen, armseinen), **NPN of PNP** per ingang, tot **37 ingangen**,
**bussen** volgen langs meetpunten, de **bushalte**, **geluidskastjes** en een **tv-pagina**. De groepen zijn sinds
1.3.0 alleen **aan of uit**, en de ingangen lezen ook de korte pulsen van **hallsensoren**.

## Nieuw in 2.2.0 (2026-11-17, advies Fable 5.2, tweede ronde)

Nummers = de punten van `../docs/Advies-Fable-5.2-v7.md`. Elke P1/P2 heeft een test die faalt zonder de fix (de fix
tijdelijk teruggedraaid en zo nagekeken). Het configuratiebestand blijft versie 4: de nieuwe velden zijn optioneel.

- **EN1 Codesoort "continu" alleen met 470 Ω (0,5 W) in plaats van 120 Ω** (Berekeningen §9). Het dashboard zegt het
  bij de codes, vraagt een bevestiging bij "+ Code continu" en bij Zenden, en toont het in de halte als de stopcode
  continu is. De API geeft `"waarschuwing"` terug bij bewaren en zenden van een continu-code en bij een halte met een
  continu-stopcode; `/api/staat` heeft `"ir":{"continu":true,"continuWaarschuwing":".."}` en per halte `"continu"`.
  Een continu-stopled heeft een **tijdsgrens**: aankomst + stop + `wachtS` + `maxVerkeerS` (0 = 60 s) + 10 s (aan de
  wachtled ook nog groen en oranje); daarna gaat ze uit, met een melding en `"continuTeLang":true` per halte.
- **EN3 `servoMaxBewegend`** (instelling 1..4, standaard **2**): 2 x 1,2 A blijft binnen de 3 A van de XL4015.
- **FN1 Tweede bus: `wachtLeds`** per halte (lijst zoals `stopLeds`): de IR-led vóór de halte. De stopcode voor de
  wachtende bus gaat **alleen** via de wachtled; de eerste bus krijgt in groen **altijd** zijn rijdcode via de stopled
  (in 2.1.0 bleef hij staan). Is de halte vrij, dan krijgt de wachtende 3 keer de rijdcode via de wachtled en stopt hij
  aan de stopled. `wachtLeds` leeg = de tweede bus niet tegenhouden (zoals 2.0.0). Wachtled en stopled mogen geen led
  delen (400); met een wachtled moet de stopled gekozen zijn (leeg = alle leds). Test vanuit de bus (QN2): een nep-bus
  aan elke led die stopt op "stop" en rijdt op "rij", met wat elke led in elke fase zond.
- **FN2 PCA9685 `begin()`**: MODE1 eerst **0x30** (slapen met AI) in beide drivers; anders landden de 4 bytes "alles
  uit" in één register en brandden na een warme reset de oude groepen weer. **QN1**: het model (`test/nep/nepwire.h`)
  hoogt alleen op met AI, kopieert ALL_LED naar de 16 kanalen, kan een NACK halverwege nabootsen en heeft de buffer van
  Wire (128 bytes); `i2cSchrijf` weigert een overdracht die niet past.
- **FN3 De servo-rem is standaard uit** (`servoRemGroepen`, 0 = uit, anders 1..N groepen). Staat ze aan en branden er
  meer groepen, dan beweegt er **één servo tegelijk** in plaats van geen. Een servo die langer dan 5 s wacht: een
  melding bovenaan het dashboard en `"servoWachtLang"` (nr) in `/api/staat`.
- **FN4 Busherstel**: eerst kijken of SCL laag blijft (dan "I2C-bus kortgesloten" in de melding, elke 2 s opnieuw), de
  STOP netjes (SCL laag, SDA laag, SCL hoog, SDA hoog).
- **FN5 Toegang**: ook de kop `Host` moet de doos zijn (192.168.4.1, treinbaan.local of het thuis-IP, eventueel met
  `:80`): tegen DNS-rebinding. De noodpagina `/update` zegt dat ze alleen via de hotspot Treinbaan werkt.
- **FN6 Bewaren en lange IR-codes**: zolang LittleFS schrijft (instellingen, stand, uploads), wacht een code van meer
  dan 144 RMT-items in KIEZEN; een lange code die al loopt, laat het schrijven eerst eindigen (hoogstens 1,5 s).
- **FN7** Mislukt het kiezen van de IR-leds (MCP23017), dan wordt de code niet verzonden en telt `nietVerzonden`; een
  volle rij van 8 telt in `"ir":{"rijVol":n}`; na het opstarten zendt elke halte haar rijdcode **3 keer** (via stopled
  en wachtled).
- **TN3 Zelftest**: -B1 (TSMP58000) ziet licht zonder draaggolf niet: de teksten zeggen dat nu. Gemoduleerd of continu:
  leert de doos de code van de stopled, dan gemoduleerd; leert ze niets maar ziet een gsm-camera licht: continu of een
  draaggolf buiten 20-60 kHz. Zeker weten: een TCRT5000 of fototransistor op GPIO11; het niveau staat live in het
  dashboard (`"ontvangerLaag"` in `/api/staat`).
- **VN1 Tv**: een melding zonder buscode op een gedeelde strook wordt geen nieuwe auto als er een bus "over" het punt
  rijdt; die grens is nu de helft van de afstand van het vorige meetpunt van die bus tot het punt (minimum 4 m), en
  een bus die volgens de doos nog naar dit punt rijdt, telt altijd. De beslissing staat in `ui/tv-logica.js`, getest
  met `node --test ui/test/*.test.mjs` (7 tests). Met de nep-doos (gedeelde strook, bussen die na IRS1 35 % sneller
  rijden): 2.1.0 maakte van 5 busmeldingen 2 spookauto's, 2.2.0 geen.

## Nieuw in 2.1.0 (2026-11-16, advies Fable 5.2 op versie 6)

Versie 6 is nog niet op hardware gemeten. Waar het advies een aanname aanwijst, kiest de firmware niet zelf maar maakt
ze **elke uitkomst instelbaar**; TRN-20 beslist. Nummers = de punten van `../docs/Advies-Fable-5.2-v6.md`.

- **E3 Soort optocouplerprint** per print (`printSoort`, 5 printen: ingang 1-8, 9-16, 17-23, 25-31, 32-38): `"vcc"`
  (gemeenschappelijke VCC, de sensor trekt IN naar 0 V; standaard, zoals getekend), `"gnd"` (gemeenschappelijke GND,
  IN hoog = actief) of `"apart"` (per kanaal IN+ en IN-). De firmware keert een ingang om bij `"gnd"` met polariteit
  `"npn"` (pull-up 2,2 kΩ van IN naar S12). **PNP op een print `"vcc"` wordt geweigerd** (HTTP 400 met uitleg). Zie
  "NPN of PNP kiezen". De bouwvlag `-DTREIN_PNP_KEERT_OM` en `"pnpOmkeren"` in `/api/staat` bestaan niet meer.
- **E1 Polariteit van de IR-leds** (-Q4) = die van de lichtgroepen (-Q1): standaard actief laag (bouwvlag
  `-DTREIN_UITGANG_ACTIEF_HOOG` voor beide), en instelbaar (`irLedActiefLaag`). De MCP23017 zet bij het opstarten eerst
  "alles uit" in OLATA en maakt pas dan GPA tot uitgang.
- **E2 Reflexsensoren** op ingang **17-23** (MCP23017 0x20, GPB0..6): TCRT5000-module op de beveiligde 3,3 V, uitgang
  met 1 kΩ in serie naar GPBn, interne pull-up, actief laag, soort `"contact"`, print 3 = `"vcc"` (niets omkeren). En de
  ontvangerpinnen 2-4 (GPIO11, 39, 42) worden ook als **niveau** gelezen: laag langer dan 50 ms = een melding `"ftr"` op
  het punt van die ontvanger (aanwezigheid), weer hoog = einde (`"ontvangerBezet"` in `/api/staat`). Reden: de RMT
  negeert een niveau dat langer duurt dan zijn idle-drempel (ESP-IDF 4.4: "The receiver will ignore pulses longer than
  this setting"), dus een bus die stilstaat boven een sensor gaf geen frame.
- **E4 IR-driver**: duty van de draaggolf instelbaar (`irDuty` 33 of 50 %); **IR-zelftest**: `POST /api/ir
  {"actie":"zelftest","led":n}` zendt een NEC-testcode via IR-led n, -B1 (TSMP58000) leest mee; resultaat in
  `"zelftest"` van `/api/staat` (ok, kHz, code, fout, `"ongemoduleerd"`: licht zonder draaggolf).
- **E6 I2C op 100 kHz**, time-out 10 ms; beide PCA9685's schrijven alleen de kanalen die veranderden; de MCP23017 op
  0x20 leest alleen poort B (3 bytes, BANK = 1). **F11**: na een fout op de bus eerst 9 klokpulsen op SCL.
- **E7** GPA7 en GPB7 van de MCP23017's zijn nooit ingang: 37 ingangen (24, 39 en 40 bestaan niet).
- **E8** bij het opstarten krijgen de servo's hun eerste puls **één voor één, om de 300 ms** (door de rij), ook de eerste
  opdracht aan een servo zonder stand. **E14** de servo's wachten zolang meer dan 12 lichtgroepen aan staan
  (`"servoWachtLampen"` in `/api/staat`). **E19** `pulsUitS` per servo: zoveel s (1-10) na aankomst geen puls meer.
- **E5, F9, F10, F14** commentaar en tekst rechtgezet (inschakelen met actief-lage modules, OE gedeeld met de
  servoprint, INTF/INTCAP van de MCP23017, wat de update nakijkt).
- **F1** IR-codesoort `"continu"`: de stopleds branden zonder draaggolf zolang de halte de bus vasthoudt.
- **F2** halte: `"herhalen"` (standaard aan) = de stopcode elke 400 ms van aankomst tot groen; na het opstarten zendt
  elke halte één keer haar rijdcode. **F3** een tweede bus wordt onthouden (`"wachtend"`) en krijgt meteen de
  stopcode. **F12** `"maxVerkeerS"` (standaard 60 s): daarna toch groen, met een melding.
- **F4** IR: leds kiezen, 10 ms wachten, zenden, 10 ms wachten, leds uit. **F5** een code die met haar herhalingen te
  lang wordt, wordt geweigerd; `"ir":{"nietVerzonden","laatsteFout"}` in `/api/staat`. **F8** zenden op RMT-kanaal 1 met
  144 items, niet bewaren tijdens het zenden. **F13** NEC: de 4 bytes zoals gelezen (`"adres16"`, `"commando16"`).
  **F17** leerbuffer 48 kB, een te lange code geeft "te lang" in plaats van een halve code.
- **F6 Toegang**: elke POST/PUT alleen van de eigen hotspot (192.168.4.x) of met het wifi-wachtwoord in de kop
  `X-Treinbaan-Wachtwoord` (anders 401); een `Origin` van een andere pagina: 403 (ook vanaf de hotspot). Uitzondering:
  de aanmelding van een geluidskastje. **V5** `Access-Control-Allow-Origin: *` op `GET /api/staat`, `/api/plan` en
  `/api/meldingen`.
- **F7** de hotspot laat **10 toestellen** toe (gsm, tablet, laptop van de tv en 7 kastjes). Meer kastjes: alles op het
  thuisnet. Op het thuisnet volgt het kanaal van de hotspot dat van de router.
- **F15** `/api/staat` en het bewaren bouwen hun JSON op een kopie, buiten het slot; de vrije stapel per taak staat in
  `GET /api/zelftest` en één keer in de seriële monitor. **F16** geluidskastjes: time-out 400 ms, een kastje dat niet
  antwoordt is meteen offline.
- **V1** per punt `"alleenBus"` (standaard uit): een melding zonder code wordt alleen op zo'n punt aan een bus
  toegeschreven. **V2** zonder buscode volgt de doos de volgorde per strook (FIFO); rechtzetten met
  `{"actie":"gezien",...}`.
- **Q1** de drivers (PCA9685, servo-PCA9685, MCP23017) staan in `include/i2c.h` en draaien in de tests tegen een nep-bus
  met chipmodellen (`test/nep/nepwire.h`); de RMT-items (`include/irrmt.h`) en het zenden in stappen
  (`include/irzend.h`) ook. `GET /api/zelftest` kijkt op het bord na wat de pc niet kan. **Q3** de ontbrekende gevallen
  als tests (159 in plaats van 129).
- **Instellingen versie 4**; bestanden van versie 1-3 laden nog (een print met een pnp-ingang wordt `"gnd"`).

### Wat op de pc getest is en wat op hardware (Q2)

"Getest op de pc" = de logica of een model van de chip, met `pio test -e native` en `-e native32`. Dat bevestigt dat
de firmware doet wat ze moet doen ALS de aanname klopt; of de echte module zo werkt, zegt het niet. De kolom "gemeten op
hardware" blijft leeg tot het op TRN-20 gemeten is.

| Functie | Getest op de pc | Gemeten op hardware |
|---|---|---|
| Lichtgroepen aan/uit, effecten, scènes, functies, dag/nacht | ja (test_licht, test_functies, test_api) | |
| PCA9685: alleen gewijzigde kanalen, teruglezen, na een dip opnieuw (E6) | ja, model (test_hw) | |
| PCA9685: alles uit na een warme reset (FN2), NACK halverwege, buffer 128 bytes (QN1) | ja, strenger model (test_hw) | |
| Polariteit -Q1 en -Q4, OLATA eerst uit (E1) | ja, model van -Q4 (test_hw) | |
| Toestand na inschakelen met actief-lage modules (E5) | nee (alleen hardware) | |
| Ingangen: contact, puls (1-10 ms), teller, gedrag | ja (test_ingangen) | |
| Printsoort vcc/gnd/apart, omkeren, pnp op vcc geweigerd (E3) | ja (test_api, test_opslag, test_ingangen) | |
| MCP23017: BANK = 1, alleen poort B, GPx7 nooit ingang, twee pinnen in één tick (E6, E7, F10) | ja, model (test_hw) | |
| Reflexsensor op ingang 17-23 (E2) | ja, als gewone ingang | |
| Lang niveau op een ontvangerpin = ftr-melding (E2) | ja, logica (test_ir, test_irzend); gpio_get_level op een RMT-pin: AANNAME | |
| IR: NEC/RC5/raw coderen en herkennen, leren uit de draaggolf, NEC 4 bytes (F13) | ja (test_ir) | |
| IR: RMT-items bouwen en lezen, te lang = niets (F5, F17) | ja (test_ir, test_irzend) | |
| IR: leds kiezen, 2 ticks, zenden (F4), continu (F1) | ja, nep-hardware (test_irzend) | |
| IR-zelftest via -B1 (E4) | ja, met een nagemaakt frame (test_irzend) | |
| IR-driver -Q3/-Q4 op 38 kHz, duty 33/50 (E4) | nee (alleen hardware) | |
| Servo's: snelheid, 2 (1..4) tegelijk (EN3), één voor één bij opstarten (E8), rem standaard uit en dan één tegelijk, melding na 5 s (FN3), puls uit (E19) | ja (test_servo) | |
| Servo-PCA9685 50 Hz, alleen gewijzigde kanalen | ja, model (test_hw) | |
| Bushalte: fasen, herhalen (F2), rijdcode 3 keer na herstart (FN7), tweede bus met wachtled vanuit de bus (F3, FN1, QN2), maxVerkeer (F12), continu met tijdsgrens (F1, EN1) | ja (test_halte) | |
| IR: lange code wacht op het bewaren (FN6), leds niet gekozen en volle rij geteld (FN7) | ja, nep-hardware (test_irzend) | |
| Toegang: Host-kop (FN5) | ja, de regel (test_api) | |
| Tv: bus over het punt met onzekerheid (VN1) | ja (node --test ui/test/*.test.mjs) en met de nep-doos | |
| Busherstel: SCL kortgesloten (FN4) | nee (alleen hardware) | |
| Of een bus van Ian met deze IR-codes stopt en rijdt (F1, F2) | nee (alleen op de baan) | |
| Meetpunten, meldingen, rijtijd, alleenBus (V1), volgorde (V2) | ja (test_bus, test_interpolatie) | |
| Instellingen bewaren en laden, versie 1-4 | ja (test_opslag) | |
| Toegang: hotspot, wachtwoordkop, Origin (F6) | ja, de regel (test_api); de koppen van de webserver: nee | |
| GET /api/zelftest (JSON) | ja (test_api); de I2C-scan zelf: nee | |
| Wifi, hotspot (10 toestellen), mDNS, OTA, LittleFS, watchdog, stapels | nee (alleen hardware) | |
| Geluidskastjes: rij, offline na een fout (F16) | ja, de rij (test_api); HTTP: nee | |

## Nieuw in 2.0.0 (2026-11-15, treindoos versie 6 fase A)

- **IR zenden** op GPIO47 (RMT met draaggolf 30-56 kHz, duty 33 %) naar een snelle MOSFET-module in de gemeenschappelijke
  retour van de IR-leds; per IR-led (1..8) een schakeluitgang op de MCP23017 (0x20, GPA0..7) die kiest welke leds
  meedoen. Codes NEC, RC5 of raw (tot 256 tijden), 32 plaatsen, met naam.
- **IR leren** met de leerontvanger **TSMP58000** op GPIO48 (geeft de draaggolf door): de doos meet de frequentie en de
  pulstijden, herkent NEC of RC5 (anders raw) en bewaart de code (10 s wachten op een code).
- **IR-/FTR-ontvangers op de baan** op GPIO11, 39 en 42 (TSOP38238 of een fototransistor-module, gedemoduleerd, actief
  laag). Een code geeft "ir", licht zonder code (lichtsluis) "ftr".
- **Meetpunten en bussen**: een punt (id uit `situatieplan/plan.json`) hangt aan een ingang (hallsensor) of een
  ontvanger. Elke keer dat een punt iets ziet: een **melding met de tijd** (ringbuffer van 64, `GET /api/meldingen`).
  Een bus wordt herkend aan zijn IR-code, of (hallsensor) als de bus die volgens de volgorde naar dat punt op weg is. De
  doos meet de rijtijd per traject (voortschrijdend gemiddelde, start 10 s) en schat waar de bus tussen 2 punten is.
- **Bushalte** (8): aankomst, stop (stopcode via IR, elke 0,5 s), wachten, verkeer vrij (ingangen), groen (rijdcode,
  slagboom open), vertrek (oranje 2 s, rood). Zie "Bushalte".
- **Servo's** (16) op een tweede PCA9685 op **0x42** (50 Hz, eigen 5-6 V): eindstand A en B, snelheid, hoogstens 4
  tegelijk in beweging; ook als stap in een functie. De stand komt terug na een stroomonderbreking.
- **Ingangen**: 17..24 op de MCP23017 (0x20, GPB0..7), 25..40 op een **tweede MCP23017 (0x21)** als die er is.
  Per ingang (of per groep van 8) **NPN of PNP**.
- **Geluidskastjes**: melden zich aan bij de doos; de doos laat ze spelen (`/api/kastje`, stap "geluid").
- **Functiestappen** `servo`, `ir` en `geluid`.
- **Tv-pagina** `http://treinbaan.local/tv/` (gzip in de firmware), het plan (`/api/plan`) en de bestanden van het
  situatieplan in LittleFS (`/tv/achtergrond.jpg`, ...).
- **Instellingen versie 3** (bestanden van 1.3.0 en ouder laden gewoon, zie Bewaren).

## Nieuw in 1.3.0 (2026-11-15)

- **Alleen aan/uit.** Geen helderheid, geen zacht aan- en uitgaan, geen maximum per groep meer; de PCA9685 zet elk
  kanaal volledig aan of volledig uit. Per groep een schakelaar; scènes en functies kiezen per groep aan of uit.
- **Effecten**: blijven (alleen aan/uit): knipperen, om beurten (overweg), lasvlam (reeksen korte flitsen), tl-buis
  (flikkert een paar keer, blijft dan branden). Vervallen (vroegen tussenwaarden): vuur, tv en ademen.
- **Hallsensoren**: per ingang de soort "contact" (knop, schakelaar, reed: 30 ms ontdenderd, zoals vroeger) of "puls"
  (hallsensor: elke puls vanaf 1 ms wordt gezien en standaard 0,3 s vastgehouden). Per ingang een teller.
- **Oude instellingen** (firmware 1.0 tot 1.2) laden gewoon: een groep die aan stond, blijft aan; een stap
  "helderheid" wordt "aan"; vuur, tv en ademen worden "aan" zonder effect. Het bestand wordt meteen als versie 2
  bewaard (zie Bewaren).

## Gebruiken

1. Verbind de gsm met wifi **Treinbaan**, wachtwoord **treinbaan** (te wijzigen bij Instellingen).
2. Het dashboard opent vanzelf. Anders: `http://192.168.4.1` of `http://treinbaan.local`.
3. Thuis-wifi (niet verplicht): bij Instellingen de naam en het wachtwoord van het thuisnet invullen. De hotspot
   **Treinbaan** blijft altijd; op het thuisnet is het dashboard te vinden op `http://treinbaan.local` (of het adres
   dat het dashboard toont).
4. Wachtwoord vergeten: houd de knop **BOOT** op de ESP **5 s** ingedrukt (na 1 s wordt het lampje blauw, daarna
   knippert het): het wifi-wachtwoord is weer `treinbaan` en het thuisnet staat uit. Een knop die bij het aanzetten al
   ingedrukt is, telt niet (zo blijft de flashmodus van de ESP gewoon werken).
5. Standaard is **ingang 1 een drukknop "alles aan/uit"** (functie 2, stap "Aan/uit wisselen" op alle groepen): brandt
   er iets, dan gaat alles uit, anders alles aan. Te wijzigen bij Ingangen en Functies.

## Bouwen, flashen, testen (vanuit deze map)

| Wat | Opdracht |
|---|---|
| bouwen en flashen (eerste keer, via de micro-USB "UART") | `python -m platformio run -e doos -t upload` |
| bijwerken zonder kabel | dashboard, Instellingen, "Firmware bijwerken": kies `.pio/build/doos/firmware.bin` (of `http://192.168.4.1/update`) |
| seriële monitor | `python -m platformio device monitor -e doos` |
| tests op de pc (172) | `python -m platformio test -e native` |
| dezelfde tests met 32 groepen (172) | `python -m platformio test -e native32` |
| tests van de tv-logica (7, node, niets te installeren) | `node --test ui/test/*.test.mjs` |
| proef op de pc | `python -m platformio run -e native`, dan `.pio/build/native/program.exe` |

Flash en RAM (`doos`, 16 groepen, firmware 2.2.0, met dashboard en tv-pagina): 1 079 941 bytes van het app-slot van
6 553 600 (16,5 %), RAM 126 488 van 327 680 bytes (38,6 %; de instellingen met 32 IR-codes van 256 tijden zitten in het
geheugen; de kopieën voor de JSON (F15) en de leerbuffer van 48 kB komen in PSRAM). De partitietabel
`default_16MB.csv` heeft twee app-slots (app0 en app1): een update gaat naar het vrije slot; de oude firmware blijft tot
de nieuwe **volledig en ongeschonden ontvangen** is (grootte, begin en controlesom). Een firmware die start en dan
vastloopt, blijft herstarten: terug kan dan alleen met USB (F14).

## Dashboard

- Bron: `ui/dashboard.html` (één bestand, css en js erin, geen internet nodig).
- `ui/maak-header.py` pakt het in (gzip) als `src/dashboard.h`. Dat gebeurt **vanzelf** bij elk bouwen van `doos`
  (`extra_scripts` in `platformio.ini`); met de hand: `python ui/maak-header.py`.
- **Demo**: open `ui/dashboard.html` rechtstreeks in een browser (dubbelklikken). Zonder doos toont het dashboard
  voorbeeldgegevens die zich gedragen zoals de echte doos (schakelen, scènes, functies, een sensor die af en toe
  bezet is, twee hallsensoren die om de 5 s een magneet zien). Rechtsboven staat dan "voorbeeld (geen doos)".
- **Beelden**: `node e2e/tools/trein-dashboard-shots.mjs` (vanuit de repo-root) maakt `ui/beelden/*.png` (gsm, tablet,
  donker; ook `gsm-ingang-hallsensor.png` en `gsm-scene-kiezen.png`).

## Vaste aansluitingen

| ESP32-S3 | naar |
|---|---|
| GPIO8 | SDA van de I2C-chips, **100 kHz** (2.1.0, E6; time-out 10 ms, na een fout 9 klokpulsen) |
| GPIO9 | SCL van de PCA9685 |
| GPIO10 | OE van de PCA9685 (actief laag). **Pull-up 1 kΩ naar 3,3 V** (-R1): de gangbare PCA9685-breakouts trekken OE zelf naar GND (Adafruit: "pulled low by default"); met 1 kΩ tegen een pull-down van 10 kΩ blijft OE bij reset en flashen ≥ 3,0 V (hoog = alles uit). Meetpunt op het meetblad |
| GPIO0 | BOOT-knop op het bord: 5 s vasthouden = wifi-wachtwoord terug naar `treinbaan` |
| GPIO38 | RGB-led op het bord (DevKitC-1 v1.1) = statuslampje: groen = hotspot actief, rood = PCA9685 antwoordt niet, blauw = BOOT-knop vast (knippert: wachtwoord teruggezet) |
| GPIO47 | **IR zenden** (RMT-kanaal 1 met 3 geheugenblokken, draaggolf, duty 33 of 50 % (`irDuty`), hoog = leds aan; continu: vast hoog zonder draaggolf) naar de snelle MOSFET-module (AOD4184-module zonder optocoupler) in de gemeenschappelijke retour van alle IR-leds |
| GPIO48 | **IR-ontvanger 1** = leerontvanger Vishay TSMP58000 (geeft de draaggolf door; RMT RX kanaal 4) |
| GPIO11 | **IR-ontvanger 2** (TSOP38238 of fototransistor-module, actief laag; RMT RX kanaal 5) |
| GPIO39 | **IR-ontvanger 3** (idem, kanaal 6) |
| GPIO42 | **IR-ontvanger 4** (idem, kanaal 7) |

Geen vrije GPIO's meer: alles wat er nog bij komt, gaat over de I2C-bus.

| I2C-adres | chip | wat |
|---|---|---|
| 0x40 | PCA9685 | lichtgroep 1..16 (alleen aan/uit) |
| 0x41 | PCA9685 | **gereserveerd** voor groep 17..32 (`-DTREIN_GROEPEN=32`) |
| 0x42 | PCA9685 (A1 hoog) | **servo 1..16**, 50 Hz (prescale 121), puls 500..2500 µs; eigen voeding 5-6 V; OE aan GPIO10, samen met de lichtchip (zo bedraad; een fout op de lichtchip stopt ook de servopulsen, F9) |
| 0x20 | MCP23017 (BANK = 1) | GPA0..7 = IR-led 1..8 (via -Q4, dezelfde polariteit als -Q1: `irLedActiefLaag`, standaard actief laag); GPB0..6 = ingang 17..23 (reflexsensoren, actief laag, interne pull-up); GPB7 uitgang (E7) |
| 0x21 | MCP23017 (A0 hoog), **optioneel** | GPA0..6 = ingang 25..31, GPB0..6 = ingang 32..38 (2 extra optocouplerprints: print 4 en 5); GPA7/GPB7 uitgang. Bij het opstarten gezocht: niet gevonden = 25..38 afwezig (`"aanwezig":false` in `/api/staat`) |

De MCP23017's hebben hun INT-pin niet aangesloten (geen vrije GPIO): de lichttaak leest elke 5 ms ook INTF en INTCAP
(interrupt-on-change op elke ingang), zodat een korte puls van een hallsensor op 17..38 ook tussen 2 lezingen gezien
wordt. Grens (F10): INTF en INTCAP bevriezen bij de eerste verandering op een poort tot ze gelezen zijn; een tweede
puls korter dan 5 ms op een andere pin van dezelfde poort in dezelfde 5 ms gaat verloren. Hang de snelste sensoren dus
aan ingang 1..16. Antwoordt een chip niet, dan meldt het dashboard dat (alleen als er iets aan hangt) en probeert de doos elke 2 s
opnieuw.

PCA9685 op adres 0x40 (A0..A5 aan GND): kanaal 0..15 = groep 1..16, **alleen volledig aan of uit** (het "full on"-
of "full off"-bit, bit 4 van LEDn_ON_H of LEDn_OFF_H; geen PWM-waarden, dus de MOSFET's schakelen niet meer op
1 kHz). De PCA9685 blijft omdat er te weinig vrije GPIO's zijn voor 16 uitgangen. PWM0..7 gaan met
dupontkabels naar IN1..IN8 van MOSFET-module 1, PWM8..15 naar MOSFET-module 2. Standaard **actief laag** (de 3,3 V-versie
van de module heeft de led van de optocoupler tussen VCC en IN): MODE2 = OUTDRV + INVRT + OUTNE 01, zodat met OE hoog
(reset, flashen) alle uitgangen 1 zijn = alles uit. Schakelt jouw module bij een hoge ingang (de led tussen IN en GND):
bouwen met `-DTREIN_UITGANG_ACTIEF_HOOG` (meetblad TRN-20, stap 8).

De 16 ingangen gaan via 2 kant-en-klare **optocouplerprints PC817** (8 kanalen elk) naar GPIO's van de ESP32-S3
(versie 4; daarvoor eigen AC-optocouplers LTV-844). Hoe de ingangskant van de print geschakeld is, is een AANNAME tot
het meten op TRN-20 (E3): de firmware kent de 3 mogelijkheden (`printSoort`, zie "NPN of PNP kiezen"). Zoals getekend
(`"vcc"`): de print krijgt +12 V (VCC, na de polyfuse -F18); een knop, schakelaar, reed of NPN-sensor trekt IN n naar
0 V: de led brandt. Ingang 25..38 komen op dezelfde manier via optocouplerprints op de tweede MCP23017; ingang 17..23
zijn bedoeld voor reflexsensoren rechtstreeks (E2). Aan de uitgangskant
(VCC = 3,3 V van de ESP, jumper op pull-up) trekt de optocoupler OUT n naar GND = actief; in rust houdt de pull-up (op de
print en INPUT_PULLUP) hem hoog. Geeft jouw print hoog als hij actief is: bouwen met `-DTREIN_INGANG_ACTIEF_HOOG`
(INPUT_PULLDOWN).

Lezen: elke ingang heeft een **GPIO-interrupt op elke flank** (CHANGE; sinds 2.1.0, omdat de printsoort een ingang
kan omkeren). De ISR staat in
IRAM en zet alleen een vlag "er was een flank" voor die ingang (in een kritieke sectie); de lichttaak haalt elke 5 ms
alle vlaggen in één keer op en zet ze op 0, en leest daarna het niveau van de 16 pinnen. Daarmee rekent
`include/ingangen.h`:

- **contact** (standaard: knop, schakelaar, reed): wisselt pas als de ingang 30 ms onafgebroken de nieuwe waarde heeft
  (tegen stuiteren); de flankvlaggen tellen niet mee.
- **puls** (hallsensor): geen ontdendering; een lezing met de ingang actief **of** een flankvlag = een puls. De ingang
  blijft daarna nog "vasthouden" actief (standaard **0,3 s**, instelbaar 0 tot 10 s), zodat de functies en het
  dashboard hem zeker zien. Een puls wordt gezien zodra de optocoupler schakelt: vanaf **1 ms zeker** (getest van 1 tot
  10 ms op elk moment tussen twee lezingen; elektrisch ook korter, de PC817 heeft enkele tientallen µs nodig).
  Rekenvoorbeeld: magneetzone ± 10 mm, H0 tot ± 0,6 m/s = ± 15 ms, snel of met een kleine magneet ± 5 ms: ruim genoeg.
  Vroeger (1.2.0: elke 5 ms pollen, 30 ms ontdenderen) werd zo'n puls gemist.
- **teller** per ingang (sinds het opstarten, te wissen in het dashboard of met de API): contact = aantal keer actief,
  puls = aantal pulsen (pulsen binnen dezelfde 5 ms tellen als één).

Tijdens het schrijven in het flashgeheugen (bewaren, update) wacht de interrupt tot het schrijven klaar is, maar de flank
blijft in de GPIO-hardware staan: hij gaat niet verloren.

## NPN of PNP kiezen

Eerst de **soort print** (sinds 2.1.0, E3; per print, `POST /api/instellingen {"printSoort":["vcc","gnd","apart"]}`;
1 tot 5 waarden voor print 1 = ingang 1-8, 2 = 9-16, 3 = 17-23, 4 = 25-31, 5 = 32-38). Meten op TRN-20: diodetest
tussen IN en elke gemeenschappelijke klem van één print, vóór er iets bedraad wordt.

| print | wat de meting zegt | NPN (en knop, reed, open-collector-hallsensor) | PNP | firmware |
|---|---|---|---|---|
| `"vcc"` (standaard, zoals getekend) | gemeenschappelijke VCC, de led van IN naar die VCC | VCC aan S12, de sensor trekt IN naar 0 V | **kan niet** (geweigerd) | niets omkeren |
| `"gnd"` | gemeenschappelijke GND, IN = anode | pull-up 2,2 kΩ van IN naar S12, de sensor aan IN; knop/reed tussen S12 en IN (kies dan `"pnp"`) | rechtstreeks aan IN | npn: **omkeren** (in rust geleidt de optocoupler) |
| `"apart"` | per kanaal IN+ en IN- | IN+ aan S12, IN- aan de sensor | IN+ aan de sensor, IN- aan 0 V | niets omkeren |

Dan per ingang `"polariteit":"npn"` (standaard) of `"pnp"`, of voor een hele print in één keer (`{"groep":g,...}`,
g = print 1..5), in het dashboard of met `POST /api/ingang`. **PNP op een print `"vcc"` wordt geweigerd** (HTTP 400):
eerst de print op `"gnd"` of `"apart"` zetten; omgekeerd kan een print niet `"vcc"` worden zolang er een pnp-ingang op
staat. Een ingang die daardoor anders omgekeerd wordt, begint opnieuw (zijn huidige lezing is rust: er start niets
vanzelf). Een bestand van firmware 2.0.0 met pnp-ingangen krijgt voor die print `"gnd"` (zo bedraadde 2.0.0 PNP: COM
aan 0 V, niets omkeren). Hoe Ian de print koopt en bedraadt: zie de README van de doos (`../README.md`).

## IR, meetpunten en bussen

1. **Codes**: leer de code van een afstandsbediening (dashboard, of `{"actie":"leren","naam":"Stop bus","ontvanger":1}`):
   richt ze binnen 10 s op de TSMP58000 en druk één keer. Of typ een NEC- of RC5-code in. Elke code krijgt een tekst
   zoals een ontvanger ze leest (`nec:00FF12ED` = adres 0, commando 0x12; `rc5:0510`; `raw:XXXXXXXX`, een vingerafdruk
   van de vorm van de pulsen).
2. **Zenden**: `{"actie":"zenden","nr":3,"leds":[5,6]}`: de doos zet IR-led 5 en 6 aan (MCP23017), wacht 10 ms (F4),
   zendt de code, wacht weer 10 ms en zet de leds uit. Hoogstens 8 opdrachten in de rij. Een code die met haar
   herhalingen niet in één keer past, wordt bij het bewaren geweigerd (F5). Een code `"continu"` brandt 2 s zonder
   draaggolf (in een halte: zolang ze de bus vasthoudt).
3. **Punten**: koppel elk meetpunt uit het plan aan zijn bron: `{"id":"HALL1","ingang":5}` (hallsensor) of
   `{"id":"STOP_lijnbus3","ontvanger":2}`. Optioneel `"volgende":"P5"` (welk punt een bus daarna bereikt; anders leert
   de doos dat uit wat ze ziet) en `"soort":"ftr"` (lichtsluis).
4. **Bussen**: naam, kleur en de code die de ontvangers van die bus lezen (`"code":"nec:00FF12ED"`). AANNAME: of de
   bussen een eigen code zenden, staat niet in EISEN.md (V2). Een bus zonder IR wordt herkend aan de volgorde (FIFO per
   strook): een melding op punt Y geeft de bus die het langst naar Y op weg is, maar **alleen op een punt met
   `"alleenBus":true`** (V1; standaard uit: op een gedeelde strook kan het ook een auto zijn). Rechtzetten:
   `{"actie":"gezien","bus":1,"punt":"P3"}`.
5. **Meldingen**: elke keer dat een punt iets ziet, komt er een melding met de tijd van de doos (ms) in een ringbuffer
   van 64. Dezelfde code op dezelfde ontvanger binnen 1,5 s telt als één doorkomst; een lichtsluis hoogstens één keer
   per seconde.
6. **Rijtijd**: per traject A -> B; zonder metingen 10 s, de eerste meting telt helemaal, dan het gemiddelde van 2 en 3,
   daarna voor een kwart. Een meting korter dan 0,2 s of (na 2 metingen) langer dan 3 x het gemiddelde telt niet.
   `fractie = min(0,98; (msNu - gezienMs) / rijtijd)`; de tv rekent zelf verder met `msNu`.

## Bushalte

Per halte (8): aankomstpunt, stopleds (IR-leds), wachtleds (2.2.0: de IR-led vóór de halte voor een tweede bus),
stopcode en rijdcode (IR-codes), wachttijd, vrije ingangen (verkeer)
met minimale vrije tijd, lichtgroepen rood/oranje/groen (gewone lichtgroepen), groentijd en eventueel een servo.

| fase | duur | wat de doos doet |
|---|---|---|
| vrij | tot een melding op het aankomstpunt | rood aan |
| aankomst | 0,5 s | rood aan, stopcode via de stopleds |
| stop | 2 s | stopcode opnieuw (met `herhalen`: elke 0,4 s, zonder: elke 0,5 s) |
| wachten | wachtS | in- en uitstappen; met `herhalen` (standaard) de stopcode elke 0,4 s |
| verkeer | tot alle vrije ingangen vrijMinS onafgebroken niet actief waren, hoogstens `maxVerkeerS` (standaard 60 s; daarna toch groen met een melding, F12) | met `herhalen` de stopcode elke 0,4 s |
| groen | groenS | groen aan, rood uit, rijdcode (3 keer om de 0,5 s), servo naar B; de rijtijd van de bus telt vanaf hier |
| vertrek | 2 s | groen uit, oranje aan; daarna rood aan, oranje uit, servo naar A -> vrij |

Na het opstarten (en na het bewaren van een halte) zendt elke halte 3 keer haar rijdcode, via de stopleds en de
wachtleds (F2, FN7): een bus die tijdens een stroomonderbreking aan de halte stond, rijdt dan weer. Een **tweede bus**
die aankomt terwijl de halte bezig is, wordt alleen tegengehouden als de halte **wachtleds** heeft (FN1): dan wordt hij
onthouden (één per halte, `"wachtend"` in `/api/staat`) en krijgt hij de stopcode via de wachtleds (met `herhalen` elke
0,4 s). De eerste bus krijgt in groen gewoon zijn rijdcode via de stopleds. Is de halte vrij, dan krijgt de wachtende 3
keer de rijdcode via de wachtleds en begint de halte met hem (stopcode via de stopleds) (F3). Zonder wachtleds rijdt
een tweede bus door (zoals 2.0.0). Een stopcode `"continu"` laat de stopleds branden van aankomst tot groen, en de
wachtleds zolang er een bus wacht, met een tijdsgrens (F1, EN1); alleen met 470 Ω per led. Regel voor `vrijMinS`:
minstens de afstand van de sensor tot de invoeging gedeeld door de traagste snelheid.

## Een hallsensor instellen

1. Aansluiten: de hallsensor (bv. A3144 of een kant-en-klaar hallsensormoduletje met open-collector/NPN-uitgang) krijgt
   +12 V en 0 V; zijn uitgang gaat naar IN n van de optocouplerprint. Komt de magneet voorbij, dan trekt de sensor IN n
   naar 0 V: de led van de PC817 brandt even. (Een sensor die zelf 12 V uitgeeft (PNP) werkt niet rechtstreeks.)
2. Dashboard, tabblad **Ingangen**, bij die ingang **Instellen**: bij "Wat hangt eraan?" **Hallsensor (korte puls)**
   kiezen. "Na een puls actief houden" staat op 0,3 s (langer = de ingang blijft langer groen; 0 = alleen de puls zelf).
3. "Wat moet er gebeuren?": **Drukknop** = elke magneet start functie A (met "Volgende magneet = stoppen" wisselt hij);
   **Sensor** = de eerste magneet start functie A, pas als er N seconden geen magneet meer kwam: functie B (handig voor
   een overweg: knippert zolang de trein met zijn magneten passeert); **Schakelaar** = magneet: functie A, na het
   vasthouden: functie B; **Niet gebruikt** = alleen tellen. **Bewaren.**
4. Proef: houd een magneet langs de sensor. Het bolletje wordt even groen (een puls die tussen twee keer vragen valt:
   1 s groen, de toestand zegt "puls") en het getal ("… keer") gaat 1 omhoog. "Teller op 0" (bij de ingang) of
   "Alle tellers op 0" (onderaan) zet de tellers terug.

| Ingang | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GPIO | 1 | 2 | 4 | 5 | 6 | 7 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 21 | 40 | 41 |

Bewust niet als ingang gebruikt: GPIO 0, 3, 45, 46 (strapping), 19, 20 (USB), 35, 36, 37 (octal PSRAM van de
N16R8), 43, 44 (UART0), 38 (RGB-led op v1.1) en 48 (RGB-led op v1.0). De lijst staat in `src/hw.h`
(`INGANG_PINNEN`).

## Opbouw

| Bestand | Wat |
|---|---|
| `include/licht.h` | aan/uit per groep (masker), de 4 effecten (knipperen, overweg, lasvlam, tl), dag/nacht |
| `include/functies.h` | scènes en functies (stappen met wachttijden) |
| `include/ingangen.h` | contact (30 ms ontdenderd) of puls (hallsensor, flankvlag, vasthouden), teller, drukknop, schakelaar, sensor met nalooptijd |
| `include/opslag.h` | instellingen en laatste stand als JSON, volledig nagekeken bij het laden |
| `include/baan.h` | alles samen (de "doos" zonder hardware), met de testmodus |
| `include/api.h` | de JSON-API van het dashboard |
| `include/onderhoud.h` | BOOT-knop 5 s (lange druk), wanneer de hotspot opnieuw starten, controle van een nieuwe firmware |
| `include/ir.h` | NEC en RC5 coderen en herkennen (marge 25 % + 80 µs), raw-vingerafdruk, leren uit de draaggolf, codetekst |
| `include/servo.h` | servo's: eindstanden, snelheid, hoogstens 4 tegelijk (rij), µs naar tellen bij 50 Hz |
| `include/bussen.h` | meetpunten, meldingen (ringbuffer 64), bussen, rijtijd per traject, fractie |
| `include/halte.h` | de bushalte (toestandsmachine) |
| `include/kastjes.h` | geluidskastjes (aanmelden, online, offline na een fout) en de rij HTTP-opdrachten |
| `include/i2c.h` | (2.1.0) de drivers van de PCA9685 (licht en servo's) en de MCP23017, als template op de I2C-klasse: op de doos Wire, in de tests een nep-bus |
| `include/irrmt.h` | (2.1.0) IR-tijden naar RMT-items en terug |
| `include/irzend.h` | (2.1.0) IR zenden in stappen: leds kiezen, wachten, zenden, continu |
| `src/irhw.h` | IR met de RMT (TX GPIO47 kanaal 1, RX GPIO48/11/39/42, niveau van de pinnen) |
| `src/tv.h` | de tv-pagina (gemaakt door `ui/maak-header.py` uit `ui/tv.html`) |
| `src/hw.h` | de 16 ingangspinnen met de flank-interrupt (IRAM), het statuslampje, het herstel van de I2C-bus en de drivers uit `i2c.h` met Wire |
| `src/main.cpp` | hardware, watchdog, wifi (hotspot en thuisnet), captive portal, mDNS, webserver, updates, bewaren, IR-taak, HTTP naar de kastjes, plan- en tv-bestanden |
| `test/test_*` | 159 tests op de pc (ook met 32 groepen: `native32`); `test/nep/nepwire.h` = de nep-I2C-bus met modellen van de chips |

Alle logica staat in `include/` en gebruikt geen Arduino-functies: zo is ze op de pc te testen.

## API

Alles JSON. Groepen, scènes, functies en ingangen hebben nummers vanaf 1.

| Vraag | Inhoud |
|---|---|
| `GET /api/staat` | alles (namen, scènes, functies, ingangen, instellingen, live stand) |
| `GET /api/staat?kort=1` | alleen de live stand; het dashboard vraagt dit elke seconde en haalt alles opnieuw op als `rev` verandert |
| `POST /api/groep` | `{"nr":3,"aan":true}`, `{"nr":3,"aan":true,"effect":"knipperen","p1":500,"p2":500}` (nr mag ook `[3,4]`), `{"nr":3,"naam":"Station","dagnacht":true}`, `{"allesUit":true}`. Sinds 1.3.0 geen `helderheid` en geen `max` meer (worden genegeerd) |
| `POST /api/scene` | `{"actie":"oproepen","nr":1}`, `{"actie":"bewaren","naam":"Avond"}` (de huidige stand; met `nr`: overschrijven), `{"actie":"bewaren","nr":3,"aan":[1,2,5]}` (per groep kiezen: 1, 2 en 5 aan, de rest uit), `{"actie":"hernoemen","nr":1,"naam":"..."}`, `{"actie":"wissen","nr":1}` |
| `POST /api/functie` | `{"actie":"start"/"stop"/"wissel","nr":1}`, `{"actie":"bewaren","nr":2,"functie":{...}}`, `{"actie":"wissen","nr":1}` |
| `POST /api/ingang` | `{"nr":1,"naam":"Knop perron","gedrag":"drukknop","functieA":1,"wisselen":true}` (`functieB`, `nalopen` in s), `{"nr":7,"soort":"puls","vasthouden":0.3}` (hallsensor; `"soort":"contact"` = knop/schakelaar), `{"nr":7,"tellerNul":true}`, `{"tellersNul":true}` |
| `POST /api/instellingen` | `{"dagnachtMin":20,"opstart":"laatste"/"uit","wachtwoord":"..."}`, `{"fabrieksinstellingen":true}` (`faduur` bestaat niet meer) |
| `POST /api/instellingen` (thuisnet) | `{"thuisnet":{"ssid":"Thuis","wachtwoord":"..."}}`; `"ssid":""` = uit; het wachtwoord leeg = open netwerk. Het dashboard krijgt het wachtwoord nooit terug (alleen `metWachtwoord`) |
| `POST /api/dagnacht` | `{"loopt":true,"vanaf":"avond"}`, `{"loopt":false}` |
| `POST /api/test` | `{"actie":"looplicht","stapS":1}` (0,3 tot 5 s per groep), `{"actie":"vast","groep":5}`, `{"actie":"stop"}` |
| `POST /api/update` | de nieuwe firmware als multipart-upload (veld `firmware`, bestand `firmware.bin`); antwoord `{"ok":true,"herstart":true}`, daarna herstart de doos. Een bestand dat niet met 0xE9 begint of niet in het vrije app-slot past, wordt geweigerd |
| `GET /update` | een kleine eigen pagina om bij te werken (als het dashboard zelf stuk zou zijn) |
| `POST /api/ingang` (2.0.0) | ook `{"nr":5,"polariteit":"pnp"}` en `{"groep":1,"polariteit":"pnp"}` (groep = print 1..5: 1-8, 9-16, 17-23, 25-31, 32-38); pnp op een print `"vcc"`: 400 |
| `POST /api/instellingen` (2.1.0) | `{"printSoort":["vcc","gnd","apart"]}` (1 tot 5 printen; `"vcc"` geweigerd zolang er een pnp-ingang op staat), `{"irLedActiefLaag":true}`, `{"irDuty":33}` of `50`; 2.2.0: `{"servoRemGroepen":0}` (0 = uit, standaard; tot het aantal groepen), `{"servoMaxBewegend":2}` (1..4) |
| `GET /api/zelftest` (2.1.0) | I2C-scan (0x20, 0x21, 0x40, 0x41, 0x42 gevonden), de PCA9685 teruglezen, MCP23017's, servo-PCA9685, LittleFS, vrije stapel per taak, wifi-toestellen, vrij geheugen: `{"ok":..,"i2c":[{"adres":"0x20","wat":..,"gevonden":true}],"pca9685":{"ok":..,"geschreven":..,"gelezen":..},"mcp23017":..,"mcp23017b":..,"servoPca":..,"littlefs":{..},"stapelVrij":{"licht":..,"ir":..,"kastjes":..,"loop":..},"wifiClients":2,"vrijGeheugen":..,"vrijPsram":..}` |
| `POST /api/ir` | `{"actie":"leren","naam":"Stop bus","ontvanger":1}` (10 s), `{"actie":"bewaren","nr":3,"code":{"naam":"..","soort":"nec"\|"rc5"\|"raw"\|"continu","khz":38,"adres":0,"commando":18,"adres16":false,"commando16":false,"raw":[9000,4500,...],"herhaal":1}}` (zonder `nr`: nieuw; 32 codes, raw 2..256 tijden in µs, aan/uit om beurten, begint met aan; te lang met de herhalingen: 400 met het maximum), `{"actie":"zelftest","led":5}` (2.1.0, E4), `{"actie":"zenden","nr":3,"leds":[5,6]}` (leeg of zonder `leds` = alle), `{"actie":"wissen","nr":3}`, `{"actie":"hernoemen","nr":3,"naam":".."}` |
| `POST /api/bus` | `{"nr":1,"naam":"Bus 1","kleur":"#d23","code":"nec:00FF12ED"}` (zonder `nr`: nieuw; 8 bussen), `{"actie":"wissen","nr":1}`, `{"actie":"gezien","bus":1,"punt":"P3"}` (met de hand, testen) |
| `POST /api/punt` | `{"id":"P3","ingang":5}`, `{"id":"P4","ontvanger":2}`, optioneel `"soort":"hall"\|"ir"\|"ftr"\|"auto"`, `"volgende":"P5"` en `"alleenBus":true` (V1); `{"id":"P3","ingang":0}` = loskoppelen; `{"actie":"wissen","id":"P3"}` (48 punten) |
| `POST /api/servo` | `{"nr":1,"naam":"Wissel 1","kanaal":1,"a":1100,"b":1900,"snelheid":400,"soort":"wissel"\|"slagboom"\|"armsein"}` (snelheid in µs/s, 0 = meteen; `"pulsUitS":0..10`, E19), `{"nr":1,"naar":"a"\|"b"\|"wissel"}`, `{"nr":1,"kanaal":1,"proef":1500}` (ook voor een servo die nog niet bewaard is: hij wordt dan aangemaakt), `{"actie":"wissen","nr":1}` |
| `POST /api/halte` | `{"nr":1,"naam":"Halte Station 1","aankomstPunt":"P5","stopLeds":[5],"wachtLeds":[4],"stopCode":3,"rijdCode":4,"wachtS":12,"vrijIngangen":[7],"vrijMinS":3,"licht":{"rood":9,"oranje":10,"groen":11},"groenS":5,"servo":0,"herhalen":true,"maxVerkeerS":60}` (0 = geen; `maxVerkeerS` 0 = geen grens; `wachtLeds` (2.2.0, FN1) [] = een tweede bus niet tegenhouden, geen led gemeen met `stopLeds`: anders 400), `{"actie":"wissen","nr":1}` |
| `POST /api/kastje` | van het kastje: `{"actie":"aanmelden","id":"a1b2c3","naam":"Kerk","ip":"192.168.4.23","geluiden":[{"naam":"klok.wav","s":4.2}],"versie":"1.0.0"}` (elke 30 s; 90 s niets = offline); van het dashboard: `{"actie":"spelen","kastje":"Kerk","geluid":"klok.wav","volume":80}` (doos -> `POST http://<ip>/speel`), `{"actie":"stop","kastje":"Kerk"}` (-> `/stop`), `{"actie":"hernoemen","id":"a1b2c3","naam":"Kerk"}` (-> `/naam`) |
| Toegang (2.1.0, F6; 2.2.0, FN5) | elke POST/PUT (ook `/api/update`, `/api/plan`, de bestanden): van de hotspot (192.168.4.x) of met de kop `X-Treinbaan-Wachtwoord: <wifi-wachtwoord>`, anders **401**; een `Origin` of een `Host` die niet de doos is (`192.168.4.1`, `treinbaan.local`, het IP op het thuisnet, eventueel met `:80`): **403**. Uitzondering: `{"actie":"aanmelden"}` van een geluidskastje |
| `GET /api/meldingen?sinds=812` | `{"volgnr":813,"msNu":123456,"meldingen":[{"nr":813,"ms":123400,"soort":"hall"\|"ir"\|"ftr","punt":"P3","ingang":5,"ontvanger":2,"code":"nec:00FF12ED","bus":1}]}` (`ingang`, `ontvanger`, `code`, `bus` alleen als ze er zijn; hoogstens de laatste 64; een `sinds` groter dan `volgnr` = de doos herstartte: alles) |
| `GET /api/plan`, `PUT /api/plan` | het plan (body = `situatieplan/plan.json`, JSON-object, hoogstens **256 kB**), bewaard als `/plan.json`; zonder eigen plan geeft GET `/tv/plan.json` |
| `POST /api/plan/beeld` | jpg of png (multipart of ruwe body, hoogstens 1,5 MB) -> `/plan.jpg`; `GET /plan.jpg` |
| `GET /tv`, `GET /tv/` | de tv-pagina (gzip uit `ui/tv.html`; ontbreekt die, dan `/tv/tv.html` uit LittleFS) |
| `GET /tv/<bestand>` | een bestand uit LittleFS `/tv/` (achtergrond.jpg, plan.json, ...); ook `/<bestand>` als het in `/tv/` staat |
| `POST /api/tv/bestand?naam=achtergrond.jpg` | een bestand voor de tv-pagina in LittleFS `/tv/` zetten (multipart of ruwe body, hoogstens 1,5 MB; naam 1..31 tekens met extensie) |

Erbij in `/api/staat` (2.0.0), kort en volledig: `"msNu"` (klok van de doos), `"volgnr"` (laatste melding),
`"servos":[{"nr":1,"us":1500,"stand":"a"|"b"|"onderweg"}]` (`us` 0 = nog geen puls),
`"bussen":[{"nr":1,"van":"P3","naar":"P4","fractie":0.42,"gezienMs":123456,"staat":"rijdt"|"halte"|"wacht"|"onbekend"}]`,
`"irLaatst":[{"ontvanger":2,"code":"nec:00FF12ED","ms":123456}]` (laatste 8, de nieuwste achteraan),
`"leren":{"loopt":true,"ontvanger":1,"resterendS":7}` of `{"loopt":false,"nr":5}` (met `"fout"` als het niet lukte),
`"haltes":[{"nr":1,"fase":"vrij"|...,"bus":2,"resterendS":4,"wachtend":-1}]` (`bus` 0 = onbekende bus; `wachtend`:
de wachtende bus, 0 = een onbekende, -1 = niemand; `"teLang":true` na F12), per ingang `"aanwezig"`. Sinds 2.1.0 ook
`"servoWachtLampen"` (E14), `"ontvangerBezet":[false,false,true,false]` (E2, ontvanger 1..4),
`"zelftest":{"loopt":false,"ok":true,"led":5,"khz":38.0,"code":"nec:7E815AA5","fout":"","ongemoduleerd":false}` (E4) en
`"ir":{"nietVerzonden":0,"laatsteFout":""}` (F5; volledig staan in `"ir"` ook de codes).
Alleen volledig: per servo, bus en halte ook hun instellingen, `"ir":{"codes":[{"nr":1,"naam":..,"soort":"nec","khz":38,
"adres":0,"commando":18,"herhaal":1,"raw":[...],"tekst":"nec:00FF12ED","tijden":0}],"leds":8,"ontvangers":[{"nr":1,"pin":48,
"soort":"leren"},...]}`, `"punten":[{"id":"P3","ingang":5,"soort":"auto","volgende":""}]`,
`"kastjes":[{"id":..,"naam":..,"ip":..,"versie":..,"online":true,"gezienMs":..,"geluiden":[{"naam":"klok.wav","s":4.2}]}]`,
per ingang `"polariteit"` (`raw` staat er alleen bij een code met tijden), in `"instellingen"` ook `"printSoort"` (5),
`"irLedActiefLaag"` en `"irDuty"`; per punt `"alleenBus"`, per servo `"pulsUitS"`, per halte `"herhalen"` en
`"maxVerkeerS"`. `"pnpOmkeren"` bestaat niet meer (2.1.0).
Sinds 2.2.0 ook: `"servoWachtLang"` (FN3, nr van een servo die > 5 s wacht, 0 = geen), `"ontvangerLaag"` (TN3, het
niveau van ontvangerpin 1..4 nu), in `"ir"` ook `"rijVol"` (FN7), `"continu"` en `"continuWaarschuwing"` (EN1), per
halte `"continu"` en `"continuTeLang"` (EN1); volledig in `"instellingen"` ook `"servoRemGroepen"` en
`"servoMaxBewegend"`, per halte `"wachtLeds"`.

`/api/staat` geeft per groep `"aan"` (gekozen), `"brandt"` (nu echt aan, bij knipperen deze tel; vervangt `"lamp"`
0..100 van 1.2), `"effect"`, `"p1"`, `"p2"`, `"fase"`; per ingang `"actief"`, `"teller"`, `"toestand"` (bv. "puls",
"rust", "bezet"), eventueel `"vrijOver"`, en (volledig) `"soort"` en `"vasthouden"` (s); per scène (volledig) `"aan"`
(de groepen die ze aanzet). Verder `"test":{"soort":"looplicht"|"vast"|"","groep":n}` (n = de groep die nu brandt,
0 = geen), `"thuisnet":{"ssid":...,"verbonden":true,"ip":"192.168.1.40"}` en (volledig) `"aantalGroepen":16`.

Antwoord: `{"ok":true}` (soms met `"nr"`) of HTTP 400 met `{"ok":false,"fout":"uitleg"}`. Effecten: `geen`,
`knipperen`, `overweg`, `lasvlam`, `tl` (`vuur`, `tv` en `ademen` geven sinds 1.3.0 een fout). Acties in een stap:
`aan`, `uit`, `effect`, `scene`, `dagnacht`, `wissel` (staat een van de groepen aan, dan alle uit, anders alle aan),
sinds 2.0.0 ook `{"actie":"servo","servo":1,"stand":"a"|"b"|"wissel","wacht":2}`, `{"actie":"ir","code":3,"leds":[5]}`
en `{"actie":"geluid","kastje":"kerk","geluid":"klok.wav","volume":80}` (zonder groepen); een
oude stap `helderheid` wordt `aan` (waarde > 0) of `uit` (0). Een functie in JSON:

```json
{"naam":"Overweg","herhalen":false,"stopUit":true,"stappen":[
  {"groepen":[3,4],"actie":"effect","effect":"overweg","p1":600,"wacht":30},
  {"groepen":[3,4],"actie":"uit","wacht":0}]}
```

## Bewaren

`/instellingen.json` en `/stand.json` in LittleFS, met `"versie": 4` (2.1.0: printSoort, irLedActiefLaag, irDuty,
continu, adres16/commando16, pulsUitS, alleenBus, herhalen, maxVerkeerS; sinds 2.0.0: IR-codes, servo's, bussen,
punten, haltes, polariteit; tot 160 kB; in `/stand.json` ook de servo's in stand B). Een bestand met `"versie": 3`
(firmware 2.0.0) laadt gewoon: de nieuwe waarden krijgen hun standaard, een print met een pnp-ingang wordt `"gnd"`;
een pnp-ingang op een print `"vcc"` in een bestand van versie 4 wordt npn (met een melding). Een bestand met
`"versie": 2` (firmware 1.3.0) laadt ook: de onderdelen van 2.0.0 krijgen hun standaard (geen codes, servo's, ...;
alle ingangen npn), daarna bewaart de doos het als versie 4. Het plan staat apart in `/plan.json`, het beeld in
`/plan.jpg`, de bestanden van de tv-pagina in `/tv/`. Een bestand met `"versie": 1`
(firmware 1.0 tot 1.2, met helderheden) wordt zonder melding omgezet: `helderheid`, `max` en `faduur` vallen weg (een
groep die aan stond, blijft aan), een stap `helderheid` wordt `aan` (> 0) of `uit` (0), de effecten vuur, tv en ademen
worden "aan" zonder effect; daarna bewaart de doos het meteen als versie 2. Een onbruikbaar bestand (kapot, te groot,
onbekende versie) geeft de standaardinstellingen en een melding op het dashboard; het oude bestand blijft bewaard als
`/instellingen.kapot.json`. Let op: zet je daarna firmware 1.2 terug, dan kent die versie 2 niet (standaardinstellingen). Losse foute waarden worden aangepast (ook met een melding). De stand wordt 3 s na een
wijziging bewaard (ten laatste na 30 s), de instellingen na 1 s; altijd eerst naar een tijdelijk bestand.

## Testmodus (ingebruikname, meetblad)

Bij Instellingen, "Testmodus": **Looplicht** zet groep 1, 2, ... om de beurt aan (zonder effect), **Eén groep aan**
houdt één groep aan om haar stroom te meten. Bovenaan elk tabblad staat dan een groene
balk met de groep die brandt en een knop om te stoppen; "Alles uit" stopt de testmodus ook. De gewone stand van de
groepen blijft bewaard en komt terug na het stoppen.

## Veiligheid tegen vastlopen

- **Watchdog** (esp_task_wdt, 8 s) op de lichttaak en op `loop()`: hangt een van beide, dan start de ESP opnieuw (de
  laatste stand komt terug). Tijdens een update reset de upload de watchdog bij elk stuk.
- **Hotspot weg** (na een wifi-fout): `loop()` kijkt elke 10 s na of de hotspot nog op 192.168.4.1 draait en start hem
  anders opnieuw (bij herhaald mislukken na 10, 20, 40 en dan elke 60 s).
- **Wachtwoord vergeten**: de BOOT-knop 5 s (zie Gebruiken).

## Uitbreiden tot 32 groepen

De firmware is voorbereid op een tweede PCA9685:

1. Tweede PCA9685-print: **A0 op 3,3 V** (soldeerbrug A0 dicht) = adres **0x41**; SDA, SCL, VCC (3,3 V), GND en **OE
   parallel** met de eerste (de pull-up -R1 blijft één weerstand voor beide). Kanaal 0..15 = groep 17..32, met nog 2
   MOSFET-modules en per groep een polyfuse, zoals groep 1..16.
2. In `platformio.ini` bij `[env:doos]` aan `build_flags` toevoegen: `-DTREIN_GROEPEN=32` (1 tot 32 kan), bouwen en
   flashen. Het dashboard toont dan vanzelf 32 groepen; de groepen zitten intern als bits in een masker van 32 bit.
3. Antwoordt een van de twee chips niet, dan blijven alle uitgangen uit (OE hoog) en meldt het dashboard het.

Extra ingangen of andere uitbreidingen: GPIO 11, 39, 42, 47 en 48 zijn vrij (zie Vaste aansluitingen). Met 32 groepen
gebruikt de firmware 65 024 bytes RAM (19,8 %).
