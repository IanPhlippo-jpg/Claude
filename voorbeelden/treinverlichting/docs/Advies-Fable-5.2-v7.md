# Advies Fable 5.2 op de kabeldoos, versie 6 met firmware 2.1.0 (2026-11-17)

Tweede ronde, op commit f5e894c (werkboom c9b2ff3, alleen een TASKS-commit later). Er is niets gewijzigd. Paden zijn
relatief aan `voorbeelden/treinverlichting/`. Vorige ronde: `docs/Advies-Fable-5.2-v6.md` (62 punten); wat ermee gedaan
is volgens de makers: `docs/Fable-5.2-v6-status.md` (57 gedaan, 5 deels).

**Oordeel in het kort.** Er is veel en degelijk werk verzet: de drie P1's hebben nu een echte uitweg (instelbare
printsoort, één polariteit voor -Q1 en -Q4, reflexsensoren op 3,3 V), de drivers draaien tegen een nagebootste bus, en
er is een meetblad. Mijn telling is strenger dan de statustabel: **48 echt opgelost, 14 deels, 0 niet** (de tabel zegt
57 en 5). De 9 extra "deels" zijn punten waar de oplossing zelf een fout of een gat heeft. Daarnaast **23 nieuwe
bevindingen: 1 x P1, 8 x P2, 14 x P3**. Op hardware is nog altijd niets gemeten; "opgelost" betekent hier: in het
ontwerp, de firmware en de documenten.

P1 = gaat stuk, werkt niet of onveilig; P2 = werkt waarschijnlijk slecht of onbetrouwbaar; P3 = verbetering of document.
AANNAME = niet na te kijken zonder hardware of datablad.

**Gedraaid:**
- `python -m platformio test -e native` in `firmware/`: 159 van 159 geslaagd (52 s).
- `npx cross-env VOORBEELDEN=1 vitest run src/qa/tekeningenTrein.test.ts src/qa/schemaNorm.test.ts`: 22 geslaagd, 1
  overgeslagen.
- `npm run typecheck`: zonder fouten.

---

## De 5 belangrijkste

| # | Nr | Prio | Kort |
|---|---|---|---|
| 1 | EN1 | P1 | De nieuwe codesoort "continu" laat een IR-led minutenlang op 89 mA branden: 0,95 W blijvend in een weerstand van 1 W die met zijn pootjes in een WAGO-klem in een dichte PETG-doos hangt. Dat is niet gerekend en wordt te heet |
| 2 | EN2 | P2 | De 3,3 V naar de baan (B3V3) hangt achter een polyfuse van 0,1 A, maar voedt nu ook 4 tot 8 reflexsensoren en de stuurkant van -Q4: ± 100 tot 200 mA. Geen berekening, geen vrije klemmen op -X12, niet in de draadlijst, en -F20 staat op geen enkel schemablad |
| 3 | FN1 | P2 | Wacht er een tweede bus, dan krijgt de eerste bus in "groen" geen rijcode en blijft de stopcode komen via dezelfde IR-led: de eerste bus vertrekt niet, de halte denkt van wel |
| 4 | TN1-TN3 | P2 | Drie stappen van het meetblad TRN-22 meten niet wat ze moeten: de diodetest (A) leest op veel multimeters "open" door de serieweerstand, stap D haalt net de spanning weg die het probleem veroorzaakt, en stap H kan gemoduleerd en continu IR niet uit elkaar houden |
| 5 | FN3 | P2 | Met meer dan 12 lichtgroepen aan bewegen de servo's niet meer, zonder tijdsgrens: in een avondscène blijven wissels en slagbomen staan en opent de slagboom van een halte niet |

---

## A. De 62 punten van de vorige ronde

"Opgelost" = ik vond het in de firmware, het schema, de tekeningen of de documenten en het klopt. "Deels" = gedaan,
maar met een fout of een gat (zie het nieuwe punt in de laatste kolom).

| Nr | Prio | Status volgens de makers | Mijn oordeel | Wat ik zag |
|---|---|---|---|---|
| E1 | P1 | gedaan | opgelost | `include/i2c.h:232-257`, `:281-292`: `zetA` keert om, OLATA eerst op "uit", dan pas IODIRA; instelling `irLedActiefLaag`, meetstap TRN-22 C en F. De meting zelf staat open |
| E2 | P1 | gedaan | **deels** | Reflexsensor op 3,3 V naar GPB0..6 (README:70, schema blad 8), RMT-pinnen ook als niveau gelezen (`irhw.h:143`, `ir.h` NiveauWacht). Maar de voeding is te klein en de bedrading ontbreekt in de draadlijst: EN2 |
| E3 | P1 | gedaan | opgelost | `ingangen.h:109-123`, `opslag.h:68-76`, `api.h:454-462`: 3 printsoorten, omkeren bij "gnd" + NPN, PNP op "vcc" geweigerd; README "Aansluiten" per soort. De meetmethode van stap A is zwak: TN1 |
| E4 | P2 | gedaan | opgelost | Duty 33/50 (`irhw.h:86`, `:103-108`), IR-zelftest (`baan.h:256-266`, `:658-675`), TRN-22 F en G. De schakeling zelf blijft ongemeten, zoals gezegd |
| E5 | P2 | deels | **deels** | Commentaar klopt nu (`hw.h:18-22`). De meetstap D meet het verkeerde (TN2) en na een warme reset gaan de oude groepen toch even aan (FN2) |
| E6 | P2 | gedaan | opgelost | 100 kHz (`main.cpp:71`), alleen gewijzigde kanalen (`i2c.h:100-116`, `:177-197`), poort B in 3 bytes (`:269-278`), één kabel van 50 cm (README:200) |
| E7 | P2 | gedaan | opgelost | `i2c.h:228`, `:242-250`: GPx7 uitgang laag, ingangen 17-23 en 25-38 |
| E8 | P2 | gedaan | opgelost | `servo.h` `naarStart` en `magBeginnen`: één nieuwe servo per 300 ms, ook de eerste opdracht door de rij; rekenblad met 1,2 A |
| E9 | P2 | gedaan | opgelost | Elco 25 V (schema, bestellijst), TRN-22 E |
| E10 | P2 | gedaan | opgelost | XL4015 met stroomgrens op 3 A in plaats van een polyfuse per servo: aanvaardbaar. Rest: EN3 |
| E11 | P2 | deels | **deels** | -F20 en 1 kΩ per lijn zijn er. Geen eigen regelaar, geen 1 nF, en -F20 is te klein voor wat er nu aan hangt: EN2 |
| E12 | P2 | gedaan | **deels** | Getwiste paren, andere tule, filter 255 (`irhw.h:72`). De "4,7 kΩ pull-up in de ontvanger" bestaat niet: EN5 |
| E13 | P2 | gedaan | opgelost | Geen PNP-print meer nodig; README:69 en :203-206 spreken elkaar niet meer tegen |
| E14 | P3 | gedaan | opgelost | `baan.h:184`: de servo's wachten boven 12 groepen. Het middel is te grof: FN3 |
| E15 | P3 | gedaan | opgelost | 10SQ045 in schema en bestellijst |
| E16 | P3 | gedaan | opgelost | Weerstanden 1 W, OE 2,75 V gerekend, TRN-22 L. Door de continu-modus niet meer genoeg: EN1 |
| E17 | P3 | gedaan | opgelost | `opbouw.mjs:387`: geen GND meer tussen -K2 en -K7 |
| E18 | P3 | gedaan | opgelost | "v1.1" in bestellijst en TRN-22 I |
| E19 | P3 | gedaan | opgelost | `servo.h` `pulsUit` per servo |
| F1 | P2 | gedaan | **deels** | Codesoort "continu" bestaat (`irhw.h:115-125`, `irzend.h:58-71`). Thermisch niet gerekend (EN1) en de zelftest kan "ongemoduleerd" niet zien (TN3) |
| F2 | P2 | gedaan | opgelost | `halte.h:133-138` (herhalen elke 400 ms), `:94` (rijcode na het opstarten). Rest: FN7 |
| F3 | P2 | gedaan | **deels** | Eén wachtende bus wordt onthouden (`halte.h:109-116`), maar de uitwerking houdt de eerste bus vast: FN1 |
| F4 | P2 | gedaan | opgelost | `irzend.h:48-94`: kiezen, 2 ticks, zenden, 2 ticks |
| F5 | P2 | gedaan | opgelost | `api.h:696-699` weigert, `irrmt.h:44`, `:54` zendt geen half frame, teller in `/api/staat` |
| F6 | P2 | gedaan | opgelost | `api.h:1012-1024`, `main.cpp:467-478`, `:490`, `:552`, `:642`. Resten: FN5 |
| F7 | P2 | gedaan | opgelost | `main.cpp:432` |
| F8 | P3 | gedaan | **deels** | Kanaal 1 met 3 blokken (`irhw.h:39`, `:54`) en niet bewaren tijdens zenden (`main.cpp:800`). Geldt tot 144 items; langere codes blijven kwetsbaar: FN6 |
| F9 | P3 | gedaan | opgelost | `i2c.h:148-149`, melding `main.cpp:377-381` |
| F10 | P3 | gedaan | opgelost | Commentaar `i2c.h:16-19`, model in `test/nep/nepwire.h:160-168` |
| F11 | P3 | gedaan | opgelost | `hw.h:97-114`, `main.cpp:304-306`, time-out 10 ms. Schoonheidsfout: FN4 |
| F12 | P3 | gedaan | opgelost | `halte.h:157-160`, melding `baan.h:275-284` |
| F13 | P3 | gedaan | opgelost | `ir.h:71`, `:185-189` |
| F14 | P3 | gedaan | opgelost | Tekst README en commentaar `main.cpp:652-653` |
| F15 | P3 | gedaan | opgelost | Kopie onder het slot (`main.cpp:711`, `:804`), stapels in `/api/zelftest` en na 30 s op de seriële poort |
| F16 | P3 | gedaan | opgelost | 400 ms (`kastjes.h:27`), offline na een fout (`main.cpp:361-364`) |
| F17 | P3 | gedaan | opgelost | 48 kB, 12 000 tijden, "afgekapt" doorgegeven (`irhw.h:41-43`, `:129-140`) |
| D1 | P2 | gedaan | opgelost | `proefstuk.mjs`, TRN-08, lippen 0,3 (`maten.mjs`). Goed gekozen stuk: 4 paaltjes, lip, haak |
| D2 | P2 | gedaan | opgelost | Oogjes bij de modules met dupont, behuizingen in de bestellijst, één kabel over de naad |
| D3 | P3 | gedaan | opgelost | Volgens de status en TRN-11 ("eerst nameten"); niet regel voor regel nagekeken |
| D4 | P3 | gedaan | opgelost | Bestellijst: "print dunner dan 1,4: 2,0 x 5" |
| D5 | P3 | gedaan | opgelost | Berekeningen §9: + 3,5 W, 10 K. Zonder de continu-modus (EN1) |
| D6 | P3 | gedaan | opgelost | Opruwen met korrel 120 |
| D7 | P3 | gedaan | opgelost | Plakband, geen PETG-CF |
| D8 | P3 | gedaan | opgelost | 26 oogjes, geteld in `opbouw.mjs:486-489`. Opmerking: DN1 |
| D9 | P3 | gedaan | opgelost | 2 houders 5 x 20 in de achterwand (`maten.mjs:67`). Opmerkingen: DN2 |
| T1 | P2 | gedaan | **deels** | TRN-22 bestaat en dekt alle onderwerpen; 3 van de 13 stappen meten niet wat ze moeten: TN1, TN2, TN3 |
| T2 | P2 | gedaan | opgelost | Ref per rij, totaal € 315,24 klopt (nagerekend), sensoren fase 1, vijfde IR-led. Resten: TN5, DN2 |
| T3 | P3 | gedaan | opgelost | Overal versie 6 en revisie 6. Eén oude regel: TN4 |
| T4 | P3 | gedaan | **deels** | Kabelaanduidingen en 1 kΩ staan erop; -Q4 is nog altijd 8 kale MOSFET's met de gate op IN (`schema/uitbreiding.mjs:39-40`), nu met twee losse labels VCC en GND: TN4 |
| T5 | P3 | gedaan | opgelost | 1:2 en 2:1, ISO 2768-c, "Projectie: 1e hoek" op TRN-01 tot TRN-08 |
| V1 | P2 | gedaan | **deels** | "Alleen bussen" per meetpunt (`bussen.h:74`, `:259`), tellen in plaats van gokken (`tv-live.js` `wie`). De grens van 4 m maakt toch spookauto's: VN1 |
| V2 | P2 | gedaan | opgelost | Volgorde per strook, knop "bus X staat bij punt Y". Blijft een aanname tot Ian het bevestigt |
| V3 | P3 | deels | **deels** | `mm_op_de_baan_per_px` staat niet in `plan.json`; de schaal zelf lijkt niet te kloppen: VN2 |
| V4 | P3 | gedaan | opgelost | `msNa` en `later` in `tv-live.js` |
| V5 | P3 | gedaan | opgelost | `main.cpp:716`, `:765` |
| S1 | P2 | gedaan | opgelost | SS451A, eerst de stuurmagneet proberen |
| S2 | P3 | gedaan | **deels** | De tabel zegt reflex aan de invoegingen; README:193, de bestellijst en schema blad 8 zeggen aan de stoppunten: TN5 |
| S3 | P3 | gedaan | opgelost | "Stap voor stap" in de README |
| S4 | P3 | gedaan | opgelost | 23 ingangen, 22 voor sensoren |
| Q1 | P2 | deels | **deels** | Drivers en zendstappen draaien nu in tests. Het model van de PCA9685 is te eenvoudig en verbergt een fout: FN2, QN1 |
| Q2 | P2 | gedaan | opgelost | Tabel in `firmware/README.md:73`, de kolom "gemeten" leeg |
| Q3 | P3 | deels | **deels** | Veel tests erbij; de test van de tweede bus bevestigt het ontwerp, niet het gedrag van 2 bussen bij één led: QN2 |

---

## B. Nieuwe bevindingen

### 1. Elektrisch

#### EN1 (P1) Codesoort "continu": 0,95 W blijvend in een weerstand van 1 W
- **Waar:** `firmware/src/irhw.h:115-125` (pin vast hoog, geen draaggolf), `firmware/include/baan.h:237-247`
  (`continuLeds`: zolang een halte vasthoudt), `docs/Berekeningen.md:79` en `:83` (gerekend: 0,16 W gemiddeld; 0,95 W
  alleen "door een fout").
- **Fout:** met een continu-stopcode staat de led de hele tijd aan dat de halte een bus vasthoudt: aankomst, stop,
  wachten (standaard 12 s), verkeer (tot 60 s) en zo lang een tweede bus wacht. Dat is geen fout meer maar de bedoeling.
  De weerstand van 120 Ω krijgt dan 0,95 W blijvend, 95 % van zijn waarde, bij 35 tot 40 °C in de doos. Zo'n weerstand
  wordt ruim 150 °C aan het lichaam (AANNAME: gangbare metaalfilm 1 W). Hij hangt met zijn pootjes in een WAGO 221
  (hoogstens 85 °C) tussen PVC-draden (70 °C) boven PETG (wordt week bij 80 °C).
- **Ook:** vier haltes samen is 3,8 W erbij, niet in de warmteberekening (D5); de led zelf zit op 89 van 100 mA in
  een gesloten wegdek.
- **Fix:** voor continu-systemen een andere weerstand: 470 Ω 0,5 W geeft 23 mA en 0,24 W (stopleds van zulke systemen
  werken met 10 tot 20 mA; AANNAME, te proeven). Zet dat in de README, op TRN-22 H en in §9, met de warmte van 4 haltes.
  In het dashboard een waarschuwing bij het kiezen van "continu": "alleen met 470 Ω in plaats van 120 Ω". In de firmware
  een grens voor de proefknop is er al (2 s, `ir.h:49`).

#### EN2 (P2) De 3,3 V naar de baan: polyfuse te klein, geen klemmen, niet in de bouwdocumenten
- **Waar:** `opbouw.mjs:176-177`, `:398`, `:419` (-F20 MF-R010 van -X7:5 naar -X12:1; -X12:2 naar -Q4 VCC),
  `schema/uitbreiding.mjs:59` en `:105-107`, `README.md:70`, `:190-194`; geen regel in `docs/berekeningen.py`.
- **Fout:**
  1. Belasting: een TCRT5000-module trekt op 3,3 V ± 12 tot 24 mA (IR-led, LM393, 2 lampjes; AANNAME), 4 stuks 50 tot
     100 mA, 8 stuks (stoppunten én invoegingen) tot 190 mA; de stuurkant van -Q4 tot ± 30 mA; de ontvangers 2 mA. De
     MF-R010 houdt 0,10 A bij 23 °C en ± 0,08 A bij 40 °C. Hij springt dus in gewoon bedrijf, of laat door zijn eigen
     weerstand (2,5 tot 7,5 Ω) 0,3 tot 0,75 V vallen: de sensoren en -Q4 krijgen dan 2,6 V.
  2. Klemmen: -X12 heeft 5 plaatsen: -F20, -Q4 en 3 ontvangers. Voor 4 reflexsensoren is er geen plaats.
  3. De draden van de ontvangers en de reflexsensoren, -R22..-R31 en -X14 staan niet in `DRADEN` of `IN_KLEMMEN`, dus
     niet in TRN-15 en niet op TRN-10/11. De bouwer moet ze zelf bedenken.
  4. -F20 en het net B3V3 staan op geen enkel stroomkringblad (alleen in het klemmenplan en de stuklijst); blad 7
     verwijst voor B3V3 naar blad 6, waar het niet bestaat.
- **Fix:** het advies van de vorige ronde alsnog: een regelaartje 3,3 V (AMS1117-module, uit de 5 V van -T2) alleen
  voor de baan, met een polyfuse van 0,3 A. Of op zijn minst MF-R030 en -Q4 VCC terug rechtstreeks op -X7. Een tweede
  WAGO 221-415 voor B3V3 en één voor 0 V. De veldkabels in `opbouw.mjs` zetten zodat de test "elke draad op een klem"
  ze ziet, -F20 op blad 6 tekenen, en een regel "B3V3" in het rekenblad met een assert op de houdstroom bij 40 °C.

#### EN3 (P3) Stroomgrens 3 A tegen 4 servo's van 1,2 A
`docs/Berekeningen.md:81`: de vraag kan 4,92 A zijn, de XL4015 begrenst op 3 A en laat dan de spanning zakken. De
servo's "bewegen wat trager" is optimistisch: onder ± 4 V trillen ze of blijven ze hangen. Fix: `SERVO_MAX_BEWEGEND`
instelbaar, standaard 2 (2 x 1,2 = 2,4 A past binnen de grens).

#### EN5 (P3) "4,7 kΩ pull-up in de ontvanger"
`schema/uitbreiding.mjs:73` en de status bij E12. De TSOP38238 heeft intern ± 30 kΩ, geen 4,7 kΩ, en er staat geen
weerstand van 4,7 kΩ in de bestellijst of het schema. Schrap de zin, of voeg de weerstand toe (van de ESP-kant van
-R22..-R24 naar 3,3 V) als de ontvangers op 3 m kabel storen.

### 2. Firmware

#### FN1 (P2) Tweede bus: de eerste bus krijgt geen rijcode en blijft de stopcode zien
- **Waar:** `firmware/include/halte.h:109-116` (wachtende onthouden, stopcode via `c.stopLeds`), `:133-138` (herhalen
  zolang `heeftWachtend`, ook in groen en vertrek), `:163` en `:243` (in groen geen rijcode als er een wachtende is).
- **Fout:** een halte heeft één IR-led. De stopcode voor de wachtende bus en de rijcode voor de eerste bus gaan door
  dezelfde led, en de firmware kiest dan voor "stop". De eerste bus krijgt groen licht, de slagboom gaat open, de tv
  toont hem vertrokken, maar hij krijgt geen rijcode en elke 400 ms opnieuw "stop". Pas één volledige cyclus later,
  als er dan geen derde bus wacht, vertrekt hij. Bij druk verkeer halveert de doorstroming en klopt het beeld niet.
- **Fix:** per halte een tweede masker "wachtLeds" (de led waar de tweede bus stilstaat, vóór de halte). De stopcode
  voor de wachtende alleen daarheen; in groen altijd de rijcode via `stopLeds`. Is `wachtLeds` leeg, dan de tweede bus
  niet tegenhouden (het gedrag van 2.0.0) en dat in het dashboard zeggen. Test: met een wachtende bus krijgt de
  eerste in groen de rijcode en geen stopcode meer.

#### FN2 (P2) PCA9685 `begin()`: "alle kanalen uit" wordt niet geschreven
- **Waar:** `firmware/include/i2c.h:81-83` en `:160-162` (MODE1 = 0x10, dan 4 bytes naar ALL_LED_ON_L),
  `firmware/src/main.cpp:844-845` (daarna meteen OE laag), `firmware/test/nep/nepwire.h:15-22` (het model hoogt altijd
  op).
- **Fout:** 0x10 zet het bit AI (adres ophogen, 0x20) uit. De 4 bytes landen dan alle vier in ALL_LED_ON_L; het
  register ALL_LED_OFF_H met het "volledig uit"-bit wordt nooit geschreven. Na een koude start maakt dat niets uit (de
  chip begint uit). Na een warme reset (watchdog, update, `ESP.restart`) staan de kanalen die aan waren nog aan: zodra
  OE laag gaat branden ze weer, tot de lichttaak voor het eerst schrijft (na het laden van de instellingen, ± 0,2 tot
  0,5 s). "Eerst alle kanalen 0, dan pas OE laag" klopt dus niet, en `test_hw` ziet het niet omdat de nep-chip AI
  negeert.
- **Fix:** `schrijf(MODE1, 0x30)` (slapen met AI) in beide `begin()`'s. In `NepChip` een variant voor de PCA9685 die
  alleen ophoogt als bit 5 van register 0 gezet is; test: na `zet(0xFFFF)` en een nieuwe `begin()` geeft `leesTerug` 0.

#### FN3 (P2) Meer dan 12 groepen aan: de servo's staan stil, zonder einde
- **Waar:** `firmware/include/baan.h:48` en `:184`, `firmware/include/servo.h:187`.
- **Fout:** de rem telt groepen, niet stroom. Met de bordjes van 1K (de gewone) trekken 16 groepen 2,3 A en is er
  ruimte genoeg; toch bewegen wissels, seinen en slagbomen niet zolang 13 groepen branden. Een avondscène is precies
  dat. De halte geeft groen, de slagboom blijft dicht, de bus rijdt ertegen. Het dashboard toont alleen een vlag
  (`api.h:185`).
- **Fix:** standaard uit; als instelling "servo's laten wachten boven n groepen" voor wie bordjes van 0 Ω heeft. Of
  beter: in plaats van stilstaan één servo tegelijk toelaten. In elk geval een melding in het dashboard als een servo
  langer dan 5 s wacht.

#### FN4 (P3) Busherstel: eerst een START, en SCL wordt niet nagekeken
`firmware/src/hw.h:101-111`: na de 9 klokpulsen staat SCL hoog en wordt SDA laag getrokken: dat is een START, gevolgd
door een STOP. Het werkt meestal, maar netjes is: SCL laag, SDA laag, SCL hoog, SDA hoog. Kijk ook eerst of SCL zelf
laag blijft hangen (`digitalRead(scl)` na loslaten): dan helpen pulsen niet en hoort er een melding "I2C-bus kortgesloten".

#### FN5 (P3) Toegang: twee resten
- `firmware/include/api.h:1019`: een Origin die gelijk is aan de kop Host wordt aanvaard. Bij DNS-rebinding zijn die
  twee gelijk (beide de naam van de aanvaller). Op het thuisnet houdt het wachtwoord dat tegen; via de hotspot niet.
  Fix: Host alleen aanvaarden als hij 192.168.4.1, treinbaan.local of het thuis-IP is.
- `firmware/src/main.cpp:629-635`: de noodpagina `/update` is een gewoon formulier zonder de wachtwoordkop. Op het
  thuisnet geeft ze altijd 401; ze werkt alleen via de hotspot. Zet dat op de pagina.

#### FN6 (P3) Lange IR-codes en het flashgeheugen
`firmware/include/ir.h:46` (`IR_MAX_ITEMS = 700`) tegen `irhw.h:54` (144 items zonder bijvullen). Een code van 145
tot 700 items wordt nog altijd door een interrupt bijgevuld. `main.cpp:800` kijkt alleen of er een frame loopt op het
moment dat het bewaren begint; een frame dat start terwijl LittleFS al schrijft (de instellingen kunnen 160 kB zijn),
raakt beschadigd. Fix: een vlag "bezig met bewaren" die de zender een lange code laat uitstellen, of `irPast` op 144
items voor wat een halte automatisch zendt.

#### FN7 (P3) Fouten die niet geteld worden, en de rijcode na het opstarten
- `firmware/include/irzend.h:53`, `:60`, `:92`: het resultaat van `kiesLeds` wordt niet bekeken. Antwoordt de
  MCP23017 niet, dan wordt de code "verzonden" zonder dat een led meedoet, en telt `nietVerzonden` niet.
- `firmware/include/baan.h` `irRij`: een volle rij (8) geeft `false`, maar de halte kijkt daar niet naar
  (`halteIr`) en er is geen teller. Met een stopcode die langer duurt dan 400 ms loopt de rij vol.
- `firmware/include/halte.h:94`: na het opstarten gaat de rijcode één keer uit. In groen gaat ze 3 keer; doe dat
  hier ook.

### 3. Doos

#### DN1 (P3) Oogjes: de binder moet er vooraf in
`maten.mjs:85`: 2 sleuven van 3,0 x 1,6 met een kanaal van 1,4 diep aan de onderkant van de bodem. Sterk genoeg
(brug 3,2 x 1,0) en zonder support te printen. Maar met de bodem tegen de baan is het kanaal dicht: een binder krijg
je er dan niet meer door. Zet in het bouwschema: "steek in elk oogje een losse kabelbinder vóór de doos onder de baan
gaat, of doe het op de werkhaken".

#### DN2 (P3) Zekeringhouders in de achterwand
`maten.mjs:67`: twee gaten Ø12,5 op 18 mm van elkaar, 26 hoog, het lijf 24 + 6 mm naar binnen. Alles AANNAME (houder
"na te meten"), dus:
- de moer van zo'n houder is 15 tot 17 mm over de vlakken (17 tot 19,6 over de hoeken): op 18 mm steek kunnen de
  moeren elkaar raken. Neem 22 mm, er is plaats;
- het lijf en de vlakstekers met hun draden komen ± 50 mm naar binnen, boven de WAGO-klemmen aan de achterwand: kijk
  na of de hendels nog open kunnen;
- de houder moet 10 A mogen (er bestaan versies van 6,3 A) en 8 A blijvend verdragen;
- vlaksteekhulzen 4,8 (4 stuks, geïsoleerd, krimptang) staan niet in de bestellijst; solderen kan ook, maar de README
  belooft "niet solderen behalve de DC-bus".

### 4. Tekeningen, schema's en documenten

#### TN1 (P2) TRN-22 stap A: de diodetest is onbetrouwbaar
- **Waar:** `tekeningen/TRN-22-meetblad-versie-6.svg`, stap A; `README.md:66`.
- **Fout:** in serie met de led van de PC817 (1,2 V) staat de weerstand van de print (± 1 kΩ, of 3 kΩ op sommige
  printen). Een multimeter in diodetest stuurt ± 1 mA en geeft bij meer dan ± 2 V "OL". 1,2 V + 1 V of meer zit daar op
  of over: veel meters tonen in beide richtingen "open". De bouwer besluit dan verkeerd ("apart", of "kapot"). Dit is
  de meting die over de vroegere P1 E3 beslist.
- **Fix:** meten met 5 V (de USB-voeding of -T2) en de mA-stand, in beide richtingen: 5 V blijft onder de 6 V die
  de led in sperrichting verdraagt. "Stroom van VCC naar IN: vcc; van IN naar G: gnd; geen gemeenschappelijke klem:
  apart." Stap B (12 V, 3 tot 15 mA) blijft daarna zoals hij is.

#### TN2 (P2) TRN-22 stap D meet niet wat er bij het inschakelen gebeurt
- **Fout:** "VCC los, 12 V aan: blijft de led uit?" Zonder VCC kan de optocoupler van de module nooit geleiden: de
  led blijft altijd uit en de stap stelt gerust. Bij echt inschakelen is VCC er wel (de 3,3 V van het ESP-bord komt
  op, ook als de ESP niet start) en trekt de PCA9685 zijn uitgangen laag. Dat is de toestand van stap C met IN aan GND.
- **Fix:** stap D schrappen als meting en vervangen door de conclusie: "C = actief laag: bij elk inschakelen
  branden alle groepen ± 1 s, en blijvend als de ESP niet start". Wie het wil zien: de hele proefopstelling, RESET van
  de ESP ingedrukt houden en dan de 12 V inschakelen.

#### TN3 (P2) TRN-22 stap H: gemoduleerd of continu is zo niet te zien
- **Waar:** TRN-22 stap H; `firmware/include/baan.h:658-662` (`zelftest.ongemoduleerd`).
- **Fout:** (a) een led met een draaggolf van 38 kHz ziet er in een gsm-camera net zo uit als een led die continu
  brandt; "ze knippert niet" bewijst niets. (b) De TSMP58000 laat alleen 20 tot 60 kHz door: licht zonder draaggolf
  geeft geen uitgang, dus de zelftest kan "ongemoduleerd" niet melden, hoogstens toevallig op een flank.
- **Gevolg:** de bouwer kiest "continu" voor een systeem dat gemoduleerd is, of omgekeerd; met EN1 erbij is dat de
  duurste vergissing.
- **Fix:** de beslissing omkeren: "houd de stopled van Ian voor het venster en kies IR leren. Leert de doos een code:
  gemoduleerd. Ziet de camera licht maar leert de doos niets: continu, of een draaggolf buiten 20-60 kHz." Wie zeker
  wil zijn: de fototransistor van een TCRT5000-module op 3,3 V aan GPIO11 en het niveau in het dashboard.

#### TN4 (P3) Schema blad 7 en 8
Tegen IEC 60617, 81346, 61082 en ISO 7200: de klassen, het titelblok, het kolomraster en de bladstructuur zijn in
orde (de 4 normtests slagen). Fouten:
- kruisverwijzingen naar de verkeerde kolom: blad 7 zegt "GPB0..6 /8.1", het punt staat op blad 8 in kolom 2
  (`uitbreiding.mjs:55`, `ref(B.servo, 60)`); blad 8 zegt "GPB0 /7.1", het staat op blad 7 in kolom 4 (`:107`,
  `ref(B.ir, 60)`). Geef de echte x mee (112 en 180). De normtest kijkt alleen of blad en kolom bestaan;
- -F20 en B3V3 ontbreken op de stroomkringbladen (zie EN2);
- -Q4 (`uitbreiding.mjs:39-40`): gate rechtstreeks op IN, de optocoupler ontbreekt; alleen een tekstverwijzing naar
  blad 4. Teken per kanaal het symbool van de optocoupler, of teken -Q4 als gesloten blok zonder MOSFET's;
- blad 7 tekent en benoemt -E21..-E28, de stuklijst zegt -E21..-E24;
- `schema/maak-schema.mjs:78`: "-F1 7,5 A beschermt de draden": het is nu T 8 A.

#### TN5 (P3) README en bestellijst: waar komen de reflexsensoren en de hallsensoren?
`README.md:236` (tabel): reflex aan de invoegingen, hall aan de stoppunten. `README.md:193`, `:308`, schema blad 8
(-B5 "stoppunt") en de stuklijst: reflex aan de stoppunten. `README.md:326`: fase 1 = hall "na de wissels en aan de
invoegingen". Kies één (de tabel is de goede) en trek de andere 4 plaatsen gelijk. In "Aansluiten" ontbreekt bij de
hallsensor en de NPN-sensor de bedrading voor een print "apart" (IN+ aan +12 V, de uitgang aan IN−) en bij de
NPN-sensor de 2,2 kΩ voor "gnd".

### 5. Tv en situatieplan

De routes in `situatieplan/plan.json` kloppen: ik heb elke aftakking en invoeging nagerekend (het beginpunt van elke
strook ligt binnen 0,6 px op zijn moederbaan, elke `afstand_px` binnen 1 px van de projectie, de autolus sluit op
2 px). De 4 wissels, 4 stoppunten en HALL1 liggen op hun baan.

#### VN1 (P2) Een bus zonder code op een gedeelde strook maakt toch een spookauto
- **Waar:** `firmware/ui/tv-live.js:178-182` (`busOver`: binnen 4 m), `wie()` erboven.
- **Fout:** een melding zonder bus op een punt dat niet "alleen bussen" is, wordt een nieuwe auto, tenzij er een
  bus binnen 4 m van dat punt getekend staat. 4 m op het plan is 20 px, op de baan 46 mm (bij 1:87). De getekende
  bus staat tussen 2 sensoren op een schatting: hij zit er makkelijk 100 tot 200 mm naast. Dan verschijnt er achter
  elke bus een auto die niet bestaat, tot hij na 2 x zijn rijtijd verdwijnt.
- **Fix:** de grens laten afhangen van de onzekerheid: de helft van de afstand tot het vorige meetpunt van die bus,
  met een minimum van 4 m; of "rijdt er een bus op deze baan die dit punt nog niet voorbij is volgens de doos".

#### VN2 (P3) De schaal 1 m = 5 px lijkt niet te kloppen
De twee rijstroken van de Stationstraat liggen in het plan 25,5 px uit elkaar (`README.md` van het situatieplan:
y = 562,0 en 587,5). Bij 5 px/m is dat 5,1 m van as tot as; een gewone rijstrook is 3 tot 3,5 m. Dat wijst op 7 tot
8 px/m, tenzij de achtergrond de weg breder tekent dan hij is. Bij 1:87 zou een strook op de baan 59 mm breed zijn;
een Car System-strook is ± 40 mm. Voor de tv maakt het niet uit (alles in pixels), voor het sensoradvies wel: "om de
50 cm" is dan ± 330 px in plaats van 217, dus 10 sensoren op de lange stukken in plaats van 15. En
`mm_op_de_baan_per_px` staat niet in `plan.json`, alleen in de README als opdracht. Fix: één maat op de echte baan
(de breedte van een rijstrook volstaat) en de sleutel invullen.

#### VN3 (P3) Het plan kent de geadviseerde sensoren niet
`plan.json` heeft alleen HALL1 en geen `ir_sensoren`; de 28 punten staan in `docs/sensoradvies.json`. De tv negeert
een melding van een punt dat niet in het plan staat (`verwerk`: `if (!plek) return`). Met echte meldingen toont de tv
dus alleen HALL1 en de haltes, tot iemand elk punt met de hand in de planeditor zet. Fix: een knop of script
"sensoradvies in het plan zetten" (de id's en `afstand_px` zijn er al).

### 6. Tests

#### QN1 (P3) De nep-bus is op drie punten te eenvoudig
`firmware/test/nep/nepwire.h`: (a) `NepChip` hoogt het register altijd op, ook met AI uit: daardoor slaagt de test
terwijl de echte PCA9685 iets anders doet (FN2); (b) geen NACK halverwege en geen grens van 128 bytes zoals de buffer
van Wire; (c) het model van de MCP23017 is goed (BANK, bevriezen van INTF), maar het is mijn lezing van het datablad,
geen meting: dat staat er eerlijk bij. Fix voor (a) staat bij FN2; voor (b) een test die `write` van 129 bytes weigert.

#### QN2 (P3) De test van de tweede bus toetst het ontwerp, niet de werkelijkheid
`test_halte` bevestigt dat er met een wachtende bus geen rijcode gaat. Dat is juist de fout (FN1). Schrijf de test
vanuit de bus: "bus 1 staat aan `stopLeds`, bus 2 aan `wachtLeds`: wat ziet elke led in elke fase?", met een nep-bus
die stopt op "stop" en rijdt op "rij".

---

## Wat ik zou doen, in volgorde

1. EN1 en TN3 samen: beslissen hoe continu-systemen bedraad worden (470 Ω) en hoe je het systeem van Ian herkent.
2. TN1 en TN2: het meetblad verbeteren vóór iemand ermee meet; het beslist over de drie vroegere P1's.
3. EN2: de 3,3 V naar de baan opnieuw rekenen en in de draadlijst en op blad 6 zetten.
4. Firmware: FN1 (wachtLeds), FN2 (één byte), FN3 (rem standaard uit). Samen ± 60 regels met tests.
5. Daarna pas kopen en meten met TRN-22.

Niet gedaan: niets gewijzigd buiten dit bestand, niets gecommit, niets geïnstalleerd; `TASKS.md` niet aangepast.
`qaTrein.test.ts` niet gedraaid (was niet gevraagd). De schemabladen heb ik uit hun generator en de SVG-tekst
beoordeeld, niet als beeld.
