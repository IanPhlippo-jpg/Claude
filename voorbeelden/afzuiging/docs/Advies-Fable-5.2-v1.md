# Advies Fable 5.2 (v1) op de afzuiging 7.2/7.3 en het bureau

Datum: 2026-11-17. Beoordeeld: `voorbeelden/afzuiging` (README, docs, generators, .kcad, tekeningen, schema,
`Afzuiging-alles-afdrukken.pdf`) en `voorbeelden/bureau`. Er is niets aan code of modellen gewijzigd.

**Hoe gekeken:** alle documenten gelezen; `berekeningen.py` geïmporteerd en de kerncijfers nagerekend (zonder
`Berekeningen.md` te herschrijven); de SVG's van de werktekeningen (AFZ-00, -01, -03, -05, -09, -20, -21) en van het
schema (blad 3, 4, 5) gerenderd en bekeken; de tekst van de 87 bladzijden van de alles-PDF doorzocht; het typeplaatje
bekeken; datasheets van Sanyo Denki (San Ace C175) en Mean Well (GST90A, 2024-10-30) en de IKEA-pagina's nagelezen.

**Tests:** `npm run typecheck` slaagt (exit 0). De vitest-run van de vijf QA-bestanden was na ruim 20 minuten nog bezig
(andere agenten draaien zware tests) en heeft dus **geen uitslag** in dit advies; van de vijf bestanden worden er
bovendien twee overgeslagen zonder omgevingsvariabele (zie hoofdstuk 5).

**Oordeel in één zin:** het dossier is ongewoon eerlijk en volledig voor een prototype (meetplan met poorten,
aannames benoemd, firmware aan het rekenblad gekoppeld), maar de bouw loopt vast op de M8-verbinding, en de belofte
"75 % vangt het stof zeker" staat op een model waarvan de marge (1,6 %) kleiner is dan wat de inbouw van de
ventilator kost.

| Klasse | Aantal | Betekenis |
|---|--:|---|
| P1 | 4 | past niet, werkt niet zoals beloofd of kan aanlopen |
| P2 | 20 | moet opgelost of gemeten zijn vóór de vrijgave |
| P3 | 22 | fout of veroudering in documenten, kleine verbetering |
| Bureau | 8 | apart hoofdstuk (3 x P2, 5 x P3), niet meegeteld hierboven |

---

## 1. P1

### P1-1 De M8-kabel past niet tussen de module en de voedingsbox

- **Waar:** `maak-afzuiging.mjs:93` (`achter.m8`, in de achterwand van de romp, naar −Z), `:104` (box op z = −195,
  diepte 100) en `:113` (`box.m8` in de voorwand, naar +Z); `README.md:45`, `:108-110`, `:260`.
- **Wat:** de achterwand van de romp ligt op z = −105, de voorwand van de box op z = −145: **40 mm van wand tot
  wand**. Beide inbouwconnectoren steken 11 mm uit en staan op dezelfde lijn (x = −60, hoogte −62 en −54) recht
  tegenover elkaar: er blijft **17,8 mm** tussen de twee koppelingen. Een M8-kabelstekker is recht ongeveer 30 tot
  40 mm lang en haaks ongeveer 20 tot 25 mm vanaf het paneel (maten van de gekochte kabel na te kijken): twee
  stekkers passen er niet tussen, ook geen haakse. De kabel van 0,5 m heeft bovendien geen plaats.
- **Bijkomend:** de sleuf "29 x 7 naar de afzuiging" (`README.md:244`, `maak-afzuiging.mjs:122`) ligt in de onderkant
  van het blad (tot 7 mm diep), terwijl de connectoren 20 tot 28 mm ónder het blad zitten. De kabel kan de sleuf
  niet gebruiken; ze is 38 mm lang.
- **Waarom het niet gezien is:** kabels en stekkers zijn geen onderdelen in de assemblage; "niets botst" test ze niet.
- **Oplossing:** de M8-stekker, het buisje en de schakelaar van de box naar een **kopse wand** (links of rechts)
  verplaatsen; op de module de bus naar onder richten (zie P1-2). Dan een haakse kabel van 0,3 m in een lus naast de
  box. Voeg de kabelstekkers (met buigstraal) als onderdelen toe aan de assemblage, zodat de botstest ze meeneemt.

### P1-2 De module zakt niet door de uitsparing met de M8-bus erop

- **Waar:** `maak-afzuiging.mjs:221-225` (gat in de achterwand), `:503-511` (schroefdraad, moer en koppeling buiten
  de wand); `README.md:253-255` (stap 7: bus monteren, stap 8: aders solderen, stap 9: module laten zakken).
- **Wat:** de romp is 210 mm in een uitsparing van 212 mm (1 mm speling per kant). De bus steekt met moer en
  koppeling tot z = −116,1 uit: **10 mm voorbij de rand van de uitsparing**, op 62 mm onder het bovenvlak. Het blad
  is 34 mm dik: de bus moet door het blad en kan dat niet. Kantelen helpt niet (het frame van 222 mm en de romp van
  70 mm hoog laten geen hoek toe).
- **Oplossing:** de bus binnen de omtrek van 210 x 210 houden: (a) verticaal naar onder in een console onderaan
  de romp, in de dode ruimte tussen de kuip en de achterwand (daar is 28 mm), of (b) in een nis van 12 mm diep in
  de achterwand. Daarna een test "module zakt door de uitsparing" over het hele traject (nu test die alleen de
  klauwen, `qaAfzuiging.test.ts:162`).

### P1-3 De ventilatorcurve geldt niet voor deze inbouw; de marge van het model is 1,6 %

- **Waar:** `berekeningen.py:38-40` (curve "met inlaatnozzle 109-1073"), `:113-118` (verliezen), `:164-165`;
  `Berekeningen.md:26-32`, `:74` (193 m³/h bij de melding tegen een minimum van 190); `README.md:61` ("75 % is de
  laagste stand die het stof **zeker** vangt"); `maak-afzuiging.mjs:72` (trechter 45°, 2 mm boven de waaier) en
  `:79` (kuip binnen Ø183 rond een waaier van Ø175).
- **Wat:** de datasheet van Sanyo Denki geeft debiet en druk "when inlet nozzle (option 109-1073) is mounted": een
  stalen instroomtuit met afronding R10 en keel Ø126 die in het oog (Ø131) steekt. Het ontwerp heeft:
  1. een geprinte trechter van 45° die 2 mm bóven de waaier stopt, zonder overlap: de spleet (π x 131 x 2 =
     8 cm²) staat tussen de drukzijde (kuip) en de zuigzijde (oog) en laat lucht dwars in de instroom terugstromen;
  2. een vingerrooster met 18 ribben op 2 mm van de draaiende dekschijf (verstoorde aanstroming);
  3. een wand op **4 mm** rond de waaier, met lamellen recht tegenover de uitstroom. Een radiale waaier met
     achterwaarts gebogen schoepen blaast vrij uit; fabrikanten vragen rondom ruimte in de orde van een halve
     waaierdiameter. Het rekenblad geeft de hele uitblaas ζ = 2,5 op 165 cm² (27 Pa): een schatting zonder bron.
- **Gevolg, nagerekend met het eigen model:** verliest de ventilator door de inbouw 10 % (Q x 0,9, p x 0,81), dan
  geeft 75 % schoon 222 m³/h en bij de melding ongeveer 170 tot 175 m³/h: **onder het minimum**. Bij 20 % haalt
  75 % het minimum zelfs schoon niet meer (189 m³/h). De band 0,7x tot 1,5x op de luchtweg dekt dit niet, want die
  band verandert de curve van de ventilator niet.
- **Oplossing:** (1) de originele nozzle 109-1073 (43 g) op de instroomplaat schroeven, of haar vorm overnemen
  (R10, keel Ø126, 1 tot 2 mm in het oog), met het vingerrooster erboven; (2) de kuip rond de waaier ruimer
  (binnen ≥ Ø215; de uitsparing van 212 laat Ø206 toe, dus de kuip tweedelig of de lamellen vervangen door een open
  korf met staven); (3) stap 0 van het meetplan (proefkast) uitvoeren **met de echte kuip en instroomplaat**, niet
  met "dezelfde uitblaasopening" in MDF; (4) tot L1 gemeten is in de README "berekend, nog niet gemeten" schrijven
  in plaats van "zeker", en `beschermVanaf` pas vastleggen na L1.

### P1-4 Maatketen waaier tot instroomplaat: 2 mm speling tegen ±1 mm op de ventilator alleen al

- **Waar:** `berekeningen.py:91` (`rotor=2.05`), `:984` (alleen 0,3 mm printtolerantie afgetrokken);
  `Berekeningen.md:257`; `maak-afzuiging.mjs:67`, `:72`, `:85`.
- **Wat:** de dekschijf draait 2,0 mm onder de instroomplaat. De datasheet geeft de hoogte van de ventilator als
  69 ± 1 mm (waaier 60,5 ± 1). Daarbij komen de buffers (rubber, hoogte typisch ± 0,5), de kuip van bodem tot oor
  (62 mm geprint, ± 0,3), de romp van bus tot richel (± 0,2) en de vlakheid van een geprinte plaat van 201 mm
  (± 0,3 tot 0,5). Ongunstig opgeteld: 2,05 − 2,3 tot 2,5 = **geen speling**; statistisch (wortel uit de som van de
  kwadraten) blijft ongeveer 0,8 mm. De ventilator staat bovendien op rubber en beweegt (P2-2).
- **Gevolg:** aanlopen van de waaier tegen de plaat of de ribben: lawaai, slijtage, plastic in de luchtstroom. De
  factor 15,2 in 6b zegt hier niets over: die gaat alleen over doorbuiging onder een vinger.
- **Oplossing:** speling 4 mm nominaal, of beter de nozzle van P1-3 (die hoort te overlappen en verdraagt de
  tolerantie); de hoogte instelbaar maken (vulringen onder de buffers) en in poort M2 de speling met een
  voelermaat op vier plaatsen meten (acceptatie ≥ 1,5 mm).

---

## 2. P2

### Functie

**P2-1 Geluid: 70 tot 72 dB(A) op oorhoogte is niet "stil".**
`README.md:7` ("een krachtige, stille afzuiging") tegenover `Berekeningen.md:116-121` (dagstand 70,2 dB(A) op 0,5 m,
71,7 met budget). Bij 70 dB(A) achtergrond praat je op 0,6 m met stemverheffing; een behandeling is een gesprek.
Het budget van 1,5 dB (`berekeningen.py:495`) is krap voor een rooster op 2 mm voor de inlaat en lamellen op 4 mm
van de schoepen (toon op de schoepfrequentie). Boven 70 dB(A) op de werkplek moet de handleiding de gemeten
emissiewaarde vermelden (Machinerichtlijn bijlage I, 1.7.4.2 u; verordening 2023/1230 bijlage III, 1.7.4.2).
*Oplossing:* "stil" schrappen tot G1 gemeten is; het debiet verlagen door dichter bij de bron te vangen (P2-3)
in plaats van harder te draaien; ruimte rond de waaier (P1-3); G1 ook in tertsbanden meten (toon).

**P2-2 Rubberbuffers: alleen de axiale eigenfrequentie is berekend.**
`berekeningen.py:511-521`: 104 Hz axiaal. Een cilindrische buffer is dwars ongeveer 6 keer slapper
(k ≈ G·A/h ≈ 0,7 MPa x 177 mm² / 10 mm ≈ 12 N/mm): **dwars ongeveer 41 Hz**, kantelen in dezelfde buurt. Het
werkgebied is 13 tot 65 Hz (20 tot 100 %): 63 % stand ligt op de resonantie, de dagstand (49 tot 52 Hz) er vlak
boven. Axiaal versterken de buffers de onbalans 1,3 tot 1,6 keer (dat staat er eerlijk bij). Samen met P1-4 is
dat een risico op aanlopen. *Oplossing:* de ventilator star in de kuip en de **hele module** ontkoppelen (celrubber
3 mm onder de rand van het frame; de klauwen hebben al rubber), of buffers kiezen waarvan alle eigenfrequenties
boven 92 Hz liggen; in G1 een oploop van 20 tot 100 % met een versnellingsmeter.

**P2-3 Vangsnelheid 0,5 m/s is de ondergrens voor rustig vrijkomend stof.**
`berekeningen.py:165`. De gangbare tabel (ACGIH, Industrial Ventilation; ook HSE HSG258) geeft 0,5 tot 1,0 m/s
voor stof dat met lage snelheid vrijkomt en 1,0 tot 2,5 m/s voor actieve bronnen. Een nagelfrees (20 000 tot
35 000 min⁻¹) werpt stof weg. 1,0 m/s op 10 cm vraagt 379 m³/h: meer dan boost. De formule van Dalla Valle geldt
bovendien op de as en in stilstaande lucht. *Oplossing:* de werkhoogte op 5 cm leggen (bij 190 m³/h al 1,07 m/s)
en dat afdwingen met een lage polssteun of zijschotjes naast het rooster; L2 met een draaiende frees en een
deeltjesteller op ademhoogte, niet alleen met een anemometer.

**P2-4 De aan/uit-schakelaar zit in een kloof van 40 mm.**
`maak-afzuiging.mjs:114`; `README.md:47`, `:291`. De schakelaar zit in de voorwand van de box, 6 mm verzonken,
tegenover de achterwand van de romp op 40 mm, 17 mm onder het blad en 445 mm van de voorrand, achter de kuip. De
onderhoudsprocedure begint ermee. Een scheidingsmiddel moet makkelijk bereikbaar zijn (EN 60204-1, 5.3; bijlage I,
1.6.3). *Oplossing:* naar de kopse wand van de box of naast de knop; anders slaat de gebruiker de stap over.

**P2-5 De aders van de ventilator lopen buiten de kuip, in de beenruimte.**
`maak-afzuiging.mjs:82` (`draad: [0, -38]` in de bodem), `README.md:252`, `:254`. De vier aders (AWG 24) komen
onder de kuip naar buiten en lopen ongeveer 120 mm onbeschermd langs de wand naar de M8-bus. Een knie of een tas
kan ze lostrekken; een gebroken PWM-ader geeft vol toerental (eigen waarheidstabel, `Berekeningen.md:196`).
*Oplossing:* de aders door de wand van de kuip net onder de rand naar de dode ruimte (achteraan zit 40° dichte
wand), of een geprinte goot met deksel; trekontlasting.

### Mechanica en print

**P2-6 Voedingsbox en netstekker hangen in de beenruimte van de klant.**
`Vrijgave-en-meetplan.md:114` ("achter de knieën, buiten de beenruimte") klopt alleen voor de medewerker. De klant
zit aan de achterkant: de box hangt daar 54 tot 156 mm van de rand, met de C13-stekker opzij en zonder
vergrendeling. *Oplossing:* box naar een zijkant tegen een ALEX-kast, C13 met borgbeugel of IEC-lock, snoer in
een goot (er is geen "achterpoot").

**P2-7 Warmte: het model rekent de lucht, niet het oppervlak van de adapter.**
`berekeningen.py:256` (wandoppervlak 0,052 m²; 14 mm van de box zit in het blad, vrij is 0,043 m²), `:261`,
`:927-931`. Bij 5 tot 9 W verlies is de behuizing van de adapter 20 tot 30 K warmer dan de lucht in de box: op de
dagstand 55 tot 70 °C, in het foutgeval (58 °C lucht) boven 80 °C. De adapter ligt op ribben en onder klemmen van
PETG (HDT 68 °C bij 0,45 MPa, kruip begint lager). *Oplossing:* E1 met een thermokoppel op de adapter en op de
klem; ribben en klemmen in PC, ASA of PA-CF, of een aluminium strip; de grens op het contactvlak leggen.

**P2-8 Printbed: 222 en 225 mm op een bed van 230 mm.**
De opdracht noemt een bed van hoogstens 230 x 230; `README.md:208` en `qaAfzuiging.test.ts:85-93` rekenen met
256 x 256. Bovenframe 222 x 222 en voedingsbox 225 x 124 laten 2,5 tot 4 mm per kant: geen rand, geen schoonveeg,
en op de buitenste millimeters van het bed is de hechting het slechtst (een frame van 2,5 mm trekt krom).
*Oplossing:* het frame in twee L-vormen (het wordt toch gelijmd), de rand van de box van 7,5 naar 5 mm; de test
op het echte bed zetten.

**P2-9 "Een halve slag" is geen robuuste montagegrens.**
`berekeningen.py:286`, `:956`; `Berekeningen.md:239`, `:244`. Nagerekend: de kracht na een halve slag is 9,4 tot
**16,2 N** (de tabel zegt 9 tot 13: de bovengrens komt uit het geval met de kleinste marge, niet uit de grootste
kracht). Het moment van "contact" voel je op ± een kwart slag: dat is 5 tot 24 N, en bij driekwart slag zit de arm
al op de kruipgrens (24,1 tegen 23,9 N). Neopreen relaxeert daarna 20 tot 30 %. In de generator staat nog "precies
één slag" (`maak-afzuiging.mjs:18`, `:49`). *Oplossing:* een vaste aanslag (de naaf loopt tegen een kraag en het
rubber is dan een vaste maat ingedrukt), of een klauw van 8 mm in PA-CF; de commentaren rechtzetten.

**P2-10 De RVS-plaat heeft geen eis voor ontbramen.**
AFZ-03 (`tekeningenAfzuiging.test.ts:46-53`): geen randtoestand (ISO 13715), geen kant van de braam. Handen en
polsen liggen erop; `Risicoanalyse-en-CE.md:64` noemt "randen R6" als maatregel, maar dat is de hoekradius in het
vlak. *Oplossing:* "alle randen braamvrij, bovenzijde gebroken 0,2 tot 0,5 mm, braamzijde onder" op de tekening en
in de bestelling.

**P2-11 De kuip is de afscherming op kniehoogte, zonder stootproef.**
De lamellen zijn banden van 2 mm verticaal (1,4 mm loodrecht), 32 mm lang, als brug geprint
(`maak-afzuiging.mjs:346-358`). W1 drukt er alleen met 10 N op. *Oplossing:* stootproef (bv. 2 J, IK07 volgens
EN 62262) op een geprinte kuip, lamellen 2,5 tot 3 mm dik, en "geen draden" in M2 aanvullen met "geen breuk".

### Veiligheid en CE

**P2-12 EN ISO 13857: tabel 4 geldt vanaf 14 jaar; in een salon komen kinderen.**
`berekeningen.py:989-991`, `Risicoanalyse-en-CE.md:52`. Voor personen vanaf 3 jaar (tabel 5) vraagt een sleuf van
4 tot 6 mm naar mijn lezing 20 mm; aanwezig is 14,1 mm (13 mm met de tolerantie van de ventilator). Een vierkante
of ronde maas tot 6 mm vraagt 10 mm. De getallen van tabel 5 in de norm zelf nakijken. *Oplossing:* dwarsribben
om de 7,2 mm (vierkante mazen): dan voldoet de bestaande hoogte, tegen een iets lagere open fractie (nu 0,72).

**P2-13 De risicoanalyse mist gevaren en de grenzen van de machine.**
`Risicoanalyse-en-CE.md:46-71`. EN ISO 12100 begint met de grenzen (bedoeld gebruik, voorzienbaar misbruik,
gebruikers, levensfasen); die ontbreken. Ontbrekende gevaren:
- brandgedrag van de geprinte behuizingen (PETG is niet vlamdovend) rond adapter en motor, met brandbaar nagelstof
  in het filter en de kuip;
- sensibilisatie door (meth)acrylaatstof en schimmelsporen in nagelstof: punt 9 geeft ernst 2, maar een
  allergie is blijvend (ernst 3);
- kinderen (P2-12), scherpe randen van de plaat (P2-10), lange nagels en sieraden in sleuven van 5 mm;
- het blad zelf: verzwakt door de uitsparingen, buiten het gebruik dat IKEA toelaat (zie bureau);
- heet oppervlak van de adapter (P2-7), losgetrokken aders (P2-5), tocht en opgewerveld stof door de uitblaas op
  de benen;
- transport, montage (frezen van het blad: stof, terugslag), afdanken (WEEE);
- de motivering waarom er geen noodstop is (bijlage I, 1.2.4.3).

**P2-14 CE: wat nog openstaat.**
`Risicoanalyse-en-CE.md:24-26` laat open of eigen gebruik onder de plicht valt. Dat is geregeld: artikel 2 i) van
2006/42/EG noemt als fabrikant ook wie een machine "voor eigen gebruik" ontwerpt of bouwt; de verordening
2023/1230 (van toepassing vanaf 20 januari 2027) houdt dat aan. Verder ontbreken: RoHS (2011/65/EU hoort bij de
CE-markering van elektrische apparatuur), een zelfstandige handleiding met de inhoud van 1.7.4 (de README is een
bouwbeschrijving), de geluidsverklaring (P2-1), de EU-conformiteitsverklaring, en de RED-verklaringen van de
ESP32-C3 SuperMini en de VIEWE-knop (al gemeld, nog niet beslist).

**P2-15 Typeplaatje: de tekst valt buiten het label.**
`docs/typeplaatje.svg:6`, `:9`, `:11` en `typeplaatje.png`: drie regels zijn rechts afgesneden ("(naam en adres van
de", "230 V AC, kl", "voor de vrijg"). Er ontbreken: 50 Hz en de netstroom (0,6 A), het adres, het
WEEE-symbool, "lees de handleiding"; de versie is 7.2 terwijl de revisie 7.3 is. *Oplossing:* label 90 x 45 mm of
letter 2,0 mm, de versie uit `revisie.mjs`, en een test die de tekstbreedte meet.

### Tekeningen, schema en documenten

**P2-16 Revisiemix: 7.3 en 7.2 door elkaar.**
`revisie.mjs:3` zegt 7.3. De werktekeningen en het voorblad van de PDF zijn 7.3; `README.md:1`, de bladen van het
schema, het typeplaatje, het rekenblad, het meetplan en de risicoanalyse zijn 7.2. Het bouwschema schrijft nog
**M5 x 65** (`e2e/tools/bouwschema-afzuiging.mjs:89`, `:91`; PDF blz. 19) tegenover M5 x 70 in de README en de
stuklijst. De tekening van de romp zegt "Gaten M5: Ø5,8 x 67" (`tekeningenAfzuiging.test.ts:32`), het model is
Ø5,4 x 69 (`maak-afzuiging.mjs:198-199`); de doorsnede zegt "vingerrooster (7 mm, twee ringen)" (`:378`), het is
12 mm. Het meetplan noemt "één revisie" juist als opgelost (`Vrijgave-en-meetplan.md:11`). *Oplossing:* alles
opnieuw genereren, de teksten uit `M` afleiden en een test die in elke uitvoer dezelfde revisie eist.

**P2-17 Het projectiesymbool is dat van de derde hoek.**
`src/qa/werktekening.ts:91-93`: de kegel heeft het grote eind links en het kleine eind naar de cirkels toe. Bij de
eerste hoek (ISO 5456-2) wijst het kleine eind van de cirkels weg. De aanzichten zelf staan wel volgens de eerste
hoek (linkeraanzicht rechts, bovenaanzicht onder): symbool en tekening spreken elkaar tegen. Dit zit in de
gedeelde module en raakt dus ook de andere projecten. *Oplossing:* de halve hoogtes omwisselen (1,5 k bij `sx`,
3 k bij `sx + 9 k`).

**P2-18 Het schema toont de netzijde en de aarde niet.**
Blad 3: -T1 is een kader met alleen + en −; netstekker, L, N en PE ontbreken, net als de vermelding dat de
24 V-zijde zwevend blijft (EN 60204-1, hoofdstuk 17; IEC 61082-1). Op de verbindingen staan geen doorsneden of
kleuren (alleen in een voetnoot). De tekst bij -R13 loopt over het symbool van -C1. De bladen dragen 7.2.

**P2-19 De tekeningen volstaan niet om zonder het model te bouwen.**
Per onderdeel staan er twee of drie hoofdmaten in de aanzichten en de rest als tekstlijst ("Belangrijke maten").
Voor geprinte delen is dat verdedigbaar, maar dan moet er staan "vorm volgens STL, revisie x; de tekening geeft
controlematen" en moeten de passingen een eigen tolerantie krijgen (moerkamer, geleiderand van het filter, speling
waaier, gat Ø10,2). ISO 2768-m (± 0,1 tot 6 mm) haalt een FDM-print niet op elk detail. De doorsnede B-B van
AFZ-00 loopt precies door de dwarsrib, waardoor het vingerrooster massief lijkt. "Goedgekeurd: Ian" staat op een
prototype dat niet vrijgegeven is.

**P2-20 De prijzen zijn te laag en het totaal mist verplichte kosten.**
`README.md:100`: de ventilator voor € 160 incl. btw; distributeurs vragen voor de zustertypes £ 157 (RS, excl. btw)
en $ 128 tot 166: reken € 180 tot 230 incl. btw, en vraag de levertijd. `:113`: de SDP810 kost eerder € 40 tot 46
incl. btw. `:164`: RVS 430 geborsteld 1,5 mm met een zeer lange snijlijn en ingeperste bouten voor € 51 is
optimistisch, en niet elke lasersnijder heeft 430. `:224`: verzendkosten bij zes of meer leveranciers ontbreken
(reken € 40 tot 80). Het eindtotaal (`:231`) bevat niet wat de vrijgave zelf kost: anemometer, deeltjesteller,
geluidsmeter, de arbeidshygiënist van L4, kopieerring en frezen. *Oplossing:* een regel "vrijgave en gereedschap"
en een bandbreedte in plaats van € 601,78 op de cent.

---

## 3. P3

| # | Waar | Wat | Oplossing |
|---|---|---|---|
| P3-1 | `berekeningen.py:977`, `Berekeningen.md:247` | "Fanschroeven M4 x 10 in een plaat van 6 mm" is van 7.1; nu buffers met draadeind M4 x 8 | regel vervangen door de indraaidiepte in de buffers (4 mm) |
| P3-2 | `berekeningen.py:910`, `Berekeningen.md:222-223` | "75 % (lage stand)" en "80 % (laagste beschermende stand)": 75 % is nu de laagste beschermende | labels uit `FW['bescherm']` |
| P3-3 | `berekeningen.py:1079`, `:1076` | "ongeveer 25 % open" (nu 45 %); dode uitdrukking `* 0` | uit het laserrapport; opruimen |
| P3-4 | `berekeningen.py:142` | filter lineair (n = 1): bij 2,5 m/s frontsnelheid is een geplooid filter deels kwadratisch; boven 250 m³/h (boost) te gunstig | n = 1,3 als tweede scenario |
| P3-5 | `Berekeningen.md:178`, `maak-afzuiging.mjs:1071-1073` | ompoling: de adapter blijft in hiccup; "-F1 smelt na enige tijd" is onwaarschijnlijk (gemiddelde stroom onder In) | paneelbus Ø5,5/2,5 in de wand van de box (de kabel van de adapter blijft heel), of een P-FET in serie |
| P3-6 | schema blad 3, `README.md:119` | -C1 470 µF direct achter -Q4: laadpiek van meer dan 100 A over een wipschakelaar van 10 A; de ventilator heeft eigen buffers | -C1 weglaten of een NTC van 5 Ω |
| P3-7 | schema blad 4 | tacho naar GPIO4 zonder klem: een sluiting tussen pen 1 (24 V) en pen 2 in de M8 geeft 20 mA in de beschermdiode | BAT54S of zener 3,3 V na -R14 |
| P3-8 | `Berekeningen.md:173` | de DC-waarde (72 V) van Bel 0697W niet kunnen nakijken | datasheet bij het dossier leggen |
| P3-9 | `maak-afzuiging.mjs:217-219` | M3 rechtstreeks in PETG (Ø2,5), wand 1,5 mm, elk jaar los en vast | messing inserts M3 |
| P3-10 | `README.md:204`, AFZ-09 | klauw met de moerkamer op het bed: het dak (1,8 mm, met gat) is een brug rond een gat en zakt door; dat dak draagt de klemkracht | omgekeerd printen (dak op het bed) |
| P3-11 | `Materiaalstaat.md:49-51`, `maak-afzuiging.mjs:382-390` | epoxy op PETG is onzeker (eigen proef M3); de celband van de kuip duwt blijvend tegen de gelijmde instroomplaat (pel) | 4 schroeven extra, of een lijm voor PETG (MMA, PU) |
| P3-12 | `README.md:254` | de ventilator is op de M8-bus gesoldeerd: vervangen is desolderen | tussenstekker (JST VH) of M8 met schroefklemmen |
| P3-13 | `README.md:308` | "Na morsen", stap 4, vergeet het slangetje van de drukmeter | toevoegen |
| P3-14 | `README.md:259` | "USB-C 18 tot 26 mm onder het bovenvlak, bij elk blad hetzelfde": het model zegt 52 tot 56 mm | corrigeren |
| P3-15 | `README.md:244` tegenover `:214-216`; `maak-afzuiging.mjs:1253` | frees Ø10 voor de sleuf staat niet bij het gereedschap; commentaar zegt nog "frezen (Ø10)" voor de uitsparing | gelijktrekken |
| P3-16 | `maak-afzuiging.mjs:14`, `:22`, `:124`, `:441-445`, `:588` | verouderde commentaren (bodemplaat naar achteren, M3-moer, stalen klauwen, ribben 7 mm en 0,73 mm) | opruimen |
| P3-17 | `tekeningen/stuklijst.csv` | de 4 magneten ontbreken; ventilator "PBT" (datasheet: aluminium motorhuis, kunststof waaier UL94 V-0); materiaalnamen afgekapt op AFZ-00 | aanvullen |
| P3-18 | `Afzuiging-alles-afdrukken.pdf` | A4 staand, A4 liggend en A3 door elkaar met "afdrukken op 100 %": op een A4-printer vervalt de schaal van de A3-bladen | op het voorblad zeggen welke bladen A3 zijn |
| P3-19 | `Materiaalstaat.md:33-35` | "acetonbestendig = PP, moeilijk te printen" slaat PA12-CF en PET-CF over, waarvoor de Centauri Carbon gemaakt is | bovenframe en instroomplaat (druppelzone) in PA12-CF of PET-CF; in M3 meetesten |
| P3-20 | `berekeningen.py:346-353` | verdeelruimte 15,5 mm: binnen het oog staan de ribben 9 mm boven de plaat; dwars op de ribben (X) is maar 7,5 mm vrij | vermelden; de proefkast beslist |
| P3-21 | `Berekeningen.md:8` | A = 404 cm² (opening van het frame) terwijl het filter 283 cm² is: aan de veilige kant, maar zeg het | zin toevoegen |
| P3-22 | rooster, sleuven 5 mm | lange kunstnagels en ringen haken in de sleuven | in W1 proberen; sleuven dwars op de vingerrichting vermijden |

---

## 4. Bureau (`voorbeelden/bureau`)

**Nagekeken tegen IKEA:** LAGKAPTEN 140 x 60 is 3,4 cm dik, draagt 50 kg verdeeld, "vermijd meer dan 15 kg op een
klein oppervlak", opbouw: lijst van spaanplaat of vezelplaat, vulling van papieren honingraat. ALEX-ladekast
36 x 58 x 70 cm, binnendiepte lade 52 cm. De maten in `maak-bureau.mjs:16-18` en `:23` kloppen; de bladhoogte van
734 mm en de vrije opening van 680 mm ook.

| # | Klasse | Waar | Wat | Oplossing |
|---|---|---|---|---|
| B-1 | P2 | `Vrijgave-en-meetplan.md:111-112`, `maak-afzuiging.mjs:79` | De kuip hangt tot 598 mm boven de vloer, 205 tot 395 mm van de voorrand, midden in de knieopening van 680 mm. Een zittende knie steekt 250 tot 350 mm voorbij de voorrand onder het blad en is bij een grote man ongeveer 600 mm hoog plus schoenen; aan de overkant zit de klant met dezelfde knieën. Kantoornormen vragen meer vrije hoogte (EN 527-1, waarde na te kijken) | vóór het frezen een kartonnen proefmodel onder het blad en W1 doen; de ventilator naast in plaats van onder het filter zou 60 mm winnen |
| B-2 | P2 | `README.md:248`, AFZ-20, AFZ-21 | De binnenkant van het blad is onbekend: dikte van de huiden (aanname 3 mm) en de breedte van de randlijst. De lat achter de box ligt 22 tot 54 mm van de achterrand: daar zit mogelijk al de lijst. IKEA verkoopt het blad voor huishoudelijk gebruik (EN 12521); een salon en uitsparingen vallen daarbuiten | eerst een proefgat Ø3 en met een haakje voelen; een beslisboom op AFZ-20; het massieve blad (multiplex 30 mm) als eerste keuze voor een salon |
| B-3 | P2 | `maak-bureau.mjs:161` | Het blad ligt los op de kasten (geen bevestiging in het model of de handleiding), terwijl module, box en kabels eraan hangen en mensen erop leunen | 4 hoekbeugels of schroeven door de bovenplaat van de ALEX, of antisliprubber; in M1 opzij duwen |
| B-4 | P3 | `maak-bureau.mjs:19` | Vijf gelijke ladefronten van 136 mm. IKEA noemt een "kleine lade" met een eigen maximumlast: de fronten zijn dus waarschijnlijk niet gelijk | nameten op de echte kast |
| B-5 | P3 | `maak-bureau.mjs:68` | Commentaar "frees Ø10" bij de uitsparingen; de README en de mal zeggen Ø12 (R6) | gelijktrekken |
| B-6 | P3 | `Berekeningen.md:276-288` | De doorbuiging is netjes en ongunstig gerekend, maar de strook van 38 mm tussen de uitsparing en de box (met de sleuf erin) is de zwakste plek en krijgt geen eigen controle | in M1 daar een meetklok |
| B-7 | P3 | `Vrijgave-en-meetplan.md:114` | "Netsnoer langs de achterpoot": het bureau heeft geen poten | kabelgoot langs de zijwand van een ALEX |
| B-8 | P3 | `src/qa/qaBureau.test.ts` | De test kijkt alleen naar kasten en lades; niets over de module in het blad, de beenruimte of de bevestiging | zie hoofdstuk 5 |

---

## 5. Wat de tests niet vangen

1. **Twee van de vijf bestanden doen niets in het opgegeven commando:** `stlAfzuiging.test.ts:22` en
   `tekeningenAfzuiging.test.ts:391` hebben `skipIf` op `AFZUIGING_STL` en `AFZUIGING_TEKENINGEN`.
2. **De maattests zijn momentopnamen van het model** (`qaAfzuiging.test.ts:53-83`): ze leggen vast wat de generator
   maakt, niet of dat klopt met de echte onderdelen (ventilator 69 ± 1, filter ± 1).
3. **Geen kabels, stekkers of slangen** in de assemblage: P1-1 is daardoor onzichtbaar.
4. **Geen montagetraject:** alleen de eindstand wordt op botsingen getest; P1-2 zit in de weg ernaartoe.
5. **Geen maatketens:** elke test rekent met nominale maten (P1-4).
6. **Printbaarheid:** alleen de omhullende op een bed van 256 mm; geen overhangen, bruggen, wanddiktes of het bed
   van 230 mm.
7. **Teksten:** verouderde zinnen staan vast in het testbestand zelf (`tekeningenAfzuiging.test.ts:32`, `:378`);
   niets vergelijkt README, bouwschema, tekeningen en schema onderling of met `revisie.mjs`.
8. **Normvorm:** het projectiesymbool, de afgesneden tekst op het typeplaatje en overlappende tekst in het schema.
9. **Het rekenblad bewaakt de firmware tegen het model, niet het model tegen de werkelijkheid:** de asserts
   (`berekeningen.py:450`, `:503`, `:927`) slagen zolang de eigen aannames kloppen.
10. **"Luchtdicht"** is een meetkundige bemonstering van het nominale model: lijmnaden, krimp en een scheve lip
    vallen erbuiten (terecht in L3 gelegd).
11. **Het bureau:** niets over beenruimte, bevestiging of de sterkte van het blad.

---

## 6. Nagerekend en in orde

- Dalla Valle: 189,5 m³/h voor 0,5 m/s op 10 cm; de tabel van hoofdstuk 1 klopt.
- ζ van het rooster (5,69 bij f = 0,461) en van het vingerrooster (0,98 bij f = 0,723) volgens Idelchik; 63 Pa bij
  250 m³/h klopt met de eigen invoer.
- Werkpunten 189 / 256 / 278 / 370 m³/h bij 60 / 75 / 80 / 100 % en de geluidswaarden volgen uit het model.
- Ventilator tegen de datasheet: 24 V, 2,35 A, 56,4 W, 3900 min⁻¹, 11,6 m³/min, 609 Pa, 69 dB(A), 750 g, 0 % PWM
  = stilstand, AWG 24: juist.
- Adapter tegen de datasheet: 90 W, 3,75 A, 145 x 60 x 32, overlast 110 tot 150 % hiccup, rendement 90 %: juist.
  Belasting 68 %, zekering op 81 %: juist.
- Schema blad 4: -Q2/-Q3 (Vgs −12 V), PWM omgekeerd met -Q1 en -R2 naar 3,3 V, tacho met pull-up naar 3,3 V en RC
  van 10 µs: de waarheidstabel klopt met de schakeling. Blad 5: Rp 56 kΩ op CC, I²C-adres 0x25, geen strapping-pinnen
  gebruikt.
- Aanzichten volgens de eerste hoek, kader en titelblok met de velden van ISO 7200: in orde (behalve het symbool).
- Kabelverliezen, eigenfrequentie axiaal (104 Hz), sandwichberekening van het blad: rekenkundig juist.

## 7. Volgorde die ik zou aanhouden

1. P1-1 en P1-2 samen oplossen (connectoren verplaatsen) en de kabels in het model zetten.
2. Proefkast met de echte kuip, instroomplaat en nozzle (P1-3, P1-4, P2-1, P2-2): eerst meten, dan pas printen.
3. Kartonnen proef onder het bureau (B-1) en het proefgat in het blad (B-2) vóór er gefreesd wordt.
4. Alles opnieuw genereren op één revisie (P2-16), het projectiesymbool en het typeplaatje herstellen.
5. Risicoanalyse en handleiding aanvullen (P2-12 tot P2-14).

## Bronnen

- Sanyo Denki, San Ace C175 (9TG), catalogusblad met maten, toleranties en de voorwaarde "inlet nozzle 109-1073".
- Mean Well, GST90A-SPEC, 2024-10-30.
- IKEA, productpagina's LAGKAPTEN 140 x 60 en ALEX 36 x 70 (2026).
- Richtlijn 2006/42/EG (art. 2 i, bijlage I: 1.2.4.3, 1.6.3, 1.7.3, 1.7.4.2), verordening (EU) 2023/1230.
- EN ISO 12100, EN ISO 13857 (tabellen 4 en 5), EN 60204-1, ISO 5456-2, ISO 7200, ISO 13715, ISO 2768-1.
- ACGIH, Industrial Ventilation (vangsnelheden); HSE HSG258.
