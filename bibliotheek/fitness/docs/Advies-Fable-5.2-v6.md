# Advies Fable 5.2 - fitnesscatalogus v6b (150 toestellen)

Onafhankelijke review van commit 5c26d67 (v6b, met 4597410 en f54b9c1), 2026-11-17. Niets gewijzigd behalve dit bestand.

## 0. Oordeel in het kort

Er is veel echt opgelost: van de 50 vorige punten zijn er 26 in orde, 19 deels en 5 niet (waarvan 2 een keuze van Ian). De rigs, de strongman-werktuigen en de buitentoestellen zijn er duidelijk beter van geworden. De statustabel in het v5-rapport is op de meeste punten eerlijk, maar zes punten die als "gedaan" staan, zijn dat maar half (P1-01, P1-02, P1-06, P1-10, P1-11, P2-02).

De 2:1-takel van v6b lost de kracht aan de greep op, maar brengt de zwaarste nieuwe fouten mee: het takelblok heeft geen geleiding en hangt naast de vloerligger in de lucht, de riem trekt er scheef aan, en de nok- en riemkappen zijn open platen naast de heup en de schouder van de gebruiker. Daarbovenop weegt een "plaat van 5 kg" in het model 5,67 kg, waardoor de echte pro-stapel 170 kg is en kabel en bovenkatrol over hun grens gaan.

Nieuwe bevindingen: **P1 = 7, P2 = 14, P3 = 8** (totaal 29).

Wat ik deed: `selectorized.mjs` volledig gelezen, de wijzigingen in `rigs.mjs`, `buiten.mjs`, `opslag.mjs`, `kabel.mjs`, `bereken.mjs`, `controle.mjs`, `prijzen.mjs`, `opties.mjs`, `dxf.mjs`, `vorm.mjs`, `model.mjs` en `maak-web.mjs` nagelezen. Eigen scripts: alle 50 FS-varianten (nok, kracht, slag, kabellengte per stand), kabelroutes, massa per onderdeel, afstand aanslag-arm per stand, alle 300 prijzen, 592 varianten van FS/FM/FO/FX (geen botsing, niets zweeft, geen rood), DXF en stukbladen van de gezette delen, het funderingsplan opnieuw gegenereerd, en klant.html in een browser geopend en doorgeklikt. Beelden bekeken: `fitness-fotos-v6`, `fitness-fotos-v6b` en eigen schermafdrukken van de bladen en de klantpagina.

Zelf gedraaid: `npx vitest run src/qa/qaFitness.test.ts` 1516/1516 groen (64 s); `npm run typecheck` zonder fouten.

Regelnummers verwijzen naar `bibliotheek/fitness/`.

---

## 1. De 50 vorige punten: echt opgelost?

| Punt | Tabel v5 | Mijn oordeel | Wat ik zag |
|---|---|---|---|
| P1-01 nok draait verkeerd | gedaan | **deels** | FS in orde (raakpunt en vloerkatrol aan de opwikkelkant). FK-08 niet: zie N-P1-05 |
| P1-02 stapel te licht | gedaan | **deels** | kracht haalt de eigen grens (95 kg bij chest press pro). Maar de echte stapel is 13 % zwaarder dan gerekend (N-P1-03) en de grens van 90 kg is een aanname (N-P2-02) |
| P1-03 stapelweg/kabellengte | gedaan | opgelost | lengte gelijk in stand 0 en 1 voor alle 25 FS; FS-02 greepweg 447 mm, FS-09 391 mm |
| P1-04 lagerhuis | gedaan | opgelost | Ø70 x 12 (binnen 46) → Ø50 H7, as Ø45 |
| P1-05 dipstation | gedaan | opgelost | greep Ø42,4 x 4 (139 N/mm²), U-zadel, 2 pennen op 150 mm, belastinggeval dip |
| P1-06 laadpaal | gedaan | **deels** | T-greep is afneembaar. Stift Ø25 in een buis met binnenmaat 32,3: zie N-P2-07 |
| P1-07 log | gedaan | opgelost | 52 kg (pro) en 35 kg (thuis) |
| P1-08 stenenplatform | gedaan | opgelost | frame 80 x 80 x 4, 237 kg, kanteltoets 0,75. Kost nu € 5.991 (N-P2-10) |
| P1-09 inbedding, funderingsplan | gedaan | **deels** | 600 mm in een poer 500 x 500 x 800: goed. Het funderingsplan bestaat maar is te mager om uit te zetten (N-P2-08) |
| P1-10 ontluchting verzinken | gedaan | **deels** | gaten in palen en bogen: goed. Nieuw probleem: RVS-stangen worden mee verzinkt (N-P1-06) |
| P1-11 DXF gezette delen | gedaan | **deels** | één positie, laag ZETLIJN, zetblad, venster in de stapelkap: goed. De maten van de uitslag kloppen niet (N-P1-07) |
| P1-12 plyobox | gedaan | opgelost | taps, deksel 4 mm op 3 ribben |
| P2-01 naafbus, torsie | gedaan | opgelost | von Mises 303 N/mm² ≤ 355; las nok 178 ≤ 208 |
| P2-02 zitting, instelschijf, aanslagen | gedaan | **deels** | zitting verstelbaar: goed. Instelschijf en aanslagen werken niet (N-P1-04) |
| P2-03 rol leg extension | deels | deels | 404 mm, niet verstelbaar |
| P2-04 elf gelijke kabelstations | keuze Ian | niet | blijft; zie prijs |
| P2-05 kippen zonder anker | gedaan | opgelost | elk rig verankerd, trekgeval 0,5 x gebruiker, notitie |
| P2-06 monkey bars | gedaan | opgelost | eigen ladder met gebouten liggers |
| P2-07 ophangbalk ringen | gedaan | opgelost | beide kanten gebout, berekend |
| P2-08 juk | gedaan | opgelost | pen 450, verstelbare jukbalk, sleepstrips, schetsplaten |
| P2-09 slee | deels | deels | wrijving gerekend, 60 x 60 x 4; duwpalen niet uitneembaar |
| P2-10 grepen en maten | gedaan | opgelost | 180 mm vrij, frame 720 |
| P2-11 valhoogte klimzone | gedaan | opgelost | Y = 2,30 m, X = 2,03 m, tegels 45/60/80 |
| P2-12 openingen | gedaan | opgelost | palen en ladderliggers mee, vingertoets, sleuven 6 mm |
| P2-13 poer en horizontale last | gedaan | opgelost | (D³ − d³)/12, 50 %, benut 0,72 bij 2 palen |
| P2-14 palen | gedaan | opgelost | Ø114,3 / Ø88,9 |
| P2-15 buigradius en prijs | deels | deels | prijs aangepast; R per buigerij nog niet |
| P2-16 W in de bocht | gedaan | opgelost | W x 0,85 |
| P2-17 buigrichting | gedaan | opgelost | kolom L/R, terugvering |
| P2-18 lassen op vlakovaal | deels | deels | alleen een vaste oranje melding (0,95) op 50 FS-varianten; geen zadelplaat getekend |
| P2-19 buislaser | gedaan | **deels** | vier losse rechthoeken per koker: bruikbaar als boormal, geen invoer voor een buislaser (N-P2-11) |
| P2-20 materiaal | gedaan | opgelost | materiaal uit het profiel. Rest: "C45 / S355J2" is geen keuze (N-P2-06) |
| P2-21 normen op de bladen | gedaan | opgelost | titelblok per soort, EN ISO 13920-BF. Rest: eerste regel van de berekening (N-P3-05) |
| P2-22 tests | gedaan | opgelost | steekproef per bouwer, negatieve proeven. Nieuwe gaten: N-P2-14 |
| P2-23 semi-pro | keuze Ian | niet | 97 van 100 semi-prijzen buiten de band |
| P2-24 opties per reeks | gedaan | opgelost | alleen FM-15 bandpinnen "past niet" |
| P2-25 prijsmodel | gedaan | **deels** | dubbeltelling weg, overhead per klasse, opslag 11 u. Totaal is slechter: 273 van 300 boven de markt (N-P2-10) |
| P2-26 klantmodus | gedaan | **deels** | werkplaats en kostprijs zijn verborgen, niet weg (N-P2-09) |
| P2-27 aansprakelijkheid | deels | deels | keuring in de prijs; verzekering is aan Ian |
| P3-01 FS-vorm | deels | deels | zie §4 |
| P3-02 latstang, zitting | deels | deels | stang gekarteld; zitting op dezelfde plek |
| P3-03 rigs | deels | deels | schetsplaat onderaan |
| P3-04 muurrigs | niet | niet | - |
| P3-05 functional trainer | niet | niet | - |
| P3-06 zijplaat opslag | deels | deels | schuine voorkant; kopligger blijft |
| P3-07 kruisvoet | niet | niet | - |
| P3-08 eindkap houders | gedaan | opgelost | - |
| P3-09 laadpennen zwart | gedaan | opgelost | - |
| P3-10 kopkap, RVS | gedaan | opgelost | RVS geeft wel N-P1-06 |
| P3-11 logo op lasbouten | gedaan | opgelost | - |

Telling: **26 opgelost, 19 deels, 5 niet.**

---

## 2. Nieuwe P1 - onveilig of werkt niet zoals getekend

### N-P1-01 FS (14 nokmachines): het takelblok heeft geen geleiding en geen steun
- **Waar:** `selectorized.mjs:116-122`. De U-geleiding bestaat alleen in de tekst van `:118` en `:121`.
- **Fout:** het blok (plaat 8 mm, x = −248..−97, z = 73..81) ligt 57 mm naast de vloerligger (x = −40..40) en 73 mm boven de vloer, op niets. Er is geen onderdeel "geleiding", geen UHMW in de stuklijst en geen berekening. Daarbij trekt de riem aan het oog op x = −230, terwijl de twee kabelstrengen op x = −230 en −115 liggen: hun resultante ligt 57,5 mm naast de riem. Dat geeft een draaimoment op het blok van 2 x 140 kg x 9,81 x 0,0575 m = 158 Nm in gebruik (590 Nm bij de proeflast). Zonder geleiding draait het blok dwars en loopt de kabel van de schijf.
- **Fix (voorkeur):** de takel niet op de vloer maar in de toren: de losse katrol op de bovenplaat van de stapel (zoals `kabelStation` al doet, `:153-157`), de riem vast aan een korte kabel die over A naar die katrol loopt. Dan is er geen schuivend blok, geen goot over de vloer en wordt het toestel ± 450 mm korter (N-P2-04).
- **Fix (als het blok blijft):** riemoog op de hartlijn van de schijf (x = xl + r), een echte geleiding als onderdelen (2 hoekprofielen of een C-rail met UHMW-strips op een console aan de vloerligger), een toets op de zijkracht, en de controle `zwevend` mag het blok niet meer overslaan.

### N-P1-02 FS (nok): open kappen bij de nok en de riem, naast de gebruiker
- **Waar:** `selectorized.mjs:97-107`.
- **Fout:** de nokkap en de kabelkap zijn elk twee vlakke platen op 64-67 mm van elkaar, rondom open ("rand met rubberen kantband"). In v5 was de kap rondom omgezet. De inlopende kneep tussen riem en nok ligt bij FS-01 op 1,48 m, naast de linkerschouder; de riem loopt van de vloer tot daar verticaal op x = −230, y = 860, dat is 70 mm naast de zitting (y 610-910, x ±160). Een hand of een vinger past in een spleet van 64 mm.
- **Waarom:** EN ISO 20957-1 §5.3 (knel- en schuifpunten binnen bereik afschermen); EN ISO 13857 voor de diepte achter een opening.
- **Fix:** de twee platen met een gezette strook rondom sluiten (één U-vormige kap, DXF met zetlijnen), ook de schacht over de riem; alleen een sleuf voor de arm. Controle: geen opening > 8 mm binnen 120 mm van een inlopende kneep onder 1,8 m.

### N-P1-03 Alle toestellen met een stapel: een "plaat van 5 kg" weegt 5,67 kg
- **Waar:** `model.mjs:218` (plaat 340 x 112 x 20 met 3 gaten), `selectorized.mjs:21-22`, kabel en katrol in `onderdelen.mjs`.
- **Fout:** de stuklijst van FS-01 pro geeft 28 platen = 158,8 kg; met de bovenplaat (8,2 kg), de lagerbussen en de stang is dat ± 170 kg. De berekening rekent 140 + 10,8 kg. Met de echte massa: kabel 6 x 170 x 9,81 = 10,0 kN > 9,41 kN (106 %), bovenkatrol A 2 x 1,67 = 3,34 kN > 3,0 kN (111 %). Het model toont 94 % en 98 %. De stickers op de platen zeggen 5 kg per plaat: de klant tilt 13 % meer dan hij kiest.
- **Fix:** plaat 300 x 112 x 20 (± 4,95 kg met de gaten) of 340 x 100 x 20, en de last voor kabel en katrollen uit de massa van de stuklijst halen in plaats van n x 5. Voor de pro-stapel een kabel Ø6,4-7 mm en katrollen ≥ 5 kN: nu is er geen marge. Test: |massa stapelplaat − stapelKg| ≤ 3 %.

### N-P1-04 FS (nok): instelschijf en aanslagen doen niets
- **Waar:** `selectorized.mjs:60` (naafbus "op de as gelast", arm op de bus gelast), `:64` (instelschijf "op de as gelast"), `:76` (aanslagen).
- **Fout:** arm, as en instelschijf zijn één gelast geheel; een veerpen van de arm in de schijf verstelt dan niets. De twee aanslagen zitten op de lagerpaal (x = 398-410), 80 mm onder elkaar, bij elke machine op dezelfde plek. De arm komt er nooit bij: gemeten afstand arm-aanslag 73 mm in stand 0, 0,5 en 1 (FS-01). De arm heeft dus geen begin- en eindstop; alleen de stapel op zijn buffers houdt hem tegen.
- **Fix:** de armen op een bus die vrij op de as draait (glijlager), de instelschijf vast op de as, de veerpen in de arm: zo werkt een startstand. Aanslagen als nok op de as tegen een buffer op de lagerpaal, per toestel op de hoek van stand 0 en stand 1. Test zoals P1-11 van de eerste ronde: in stand 0 en 1 ligt de arm tegen zijn aanslag (≤ 2 mm).

### N-P1-05 FK-08 leg extension: de vloerkatrol staat aan de verkeerde kant van de kabel
- **Waar:** `kabel.mjs:507` (`yf = yr + sg * r`), controle `nokFouten` in `controle.mjs` (vergelijkt de kant van de as, niet de kant van de raaklijn).
- **Fout:** bij een negatieve hoek ligt het raakpunt op y = 130 en de vloerkatrol op y = 73. De kabel komt van de toren (y = 1078) over de vloer en moet op y = 130 omhoog. De schijf ligt dan aan de buitenkant van de hoek: de kabel raakt ze niet. In `selectorized.mjs:92` staat het goed (`yf = yr + r`, altijd aan de torenkant).
- **Fix:** `yf = yr + r` (de schijf in de binnenhoek van de kabel), en in `nokFouten`: de vloerkatrol moet tussen het raakpunt en de vorige katrol liggen (`(pf.y − yr)` en `(vorige.y − yr)` hetzelfde teken).

### N-P1-06 FX buiten (pro): RVS-stangen door een paal gelast en mee verzinkt
- **Waar:** `buiten.mjs:224-227` ("door de paal gestoken en rondom gelast (duplex: verzinkt + poedercoat)"), `prijzen.mjs:54` (verzinken over het volle gewicht).
- **Fout:** de stangen zijn in pro RVS 1.4404, maar ze worden nog altijd in de stalen paal gelast, waarna het geheel naar het zinkbad en de lakkerij gaat. RVS hoort niet in het zinkbad (zink op de greep, risico op scheuren door vloeibaar metaal, AANNAME: de verzinkerij weigert het), en gecoat RVS is precies wat P3-10 wou vermijden.
- **Fix:** palen met gelaste bussen of klemschalen verzinken en coaten, de RVS-stangen daarna monteren (klemschaal met 2 x M10 RVS, of een stang met draadeinden door de paal en een dopmoer). Zo is een stang ook vervangbaar. Thuis (S355, verzinkt) kan gelast blijven.

### N-P1-07 Gezette delen: de uitslag heeft de verkeerde maten
- **Waar:** `opslag.mjs:96` (bak), `kabel.mjs` (bovenkap: `fl = 30 − 2`, vlak = volle buitenmaat), `selectorized.mjs:110` (kabelgoot), `opslag.mjs:172-179` (mantel), `vorm.mjs` (`uitslagStrook`, `ontvouw`).
- **Fout 1:** `uitslagStrook` telt de opgegeven benen als vlakke lengtes en zet er de buigtoeslag tussen. De bouwers geven buitenmaten door. Bak FO-04 (3 mm, Ri 6): uitslag 40 + (W − 6) + 40 + 2 x 11,3 = W + 96,6 mm. Juist is 43 + W + 43 − 4 x (R + t) + 2 x 11,3 = W + 72,6 mm. De bak wordt 12 mm breder en elke rand 6 mm hoger dan het model. Zelfde fout bij de bovenkap van de stapel (12 mm te groot in beide richtingen) en de kabelgoot.
- **Fout 2:** de plyobox-mantel heeft 4 ronde hoeken maar 3 zettingen: op de vierde hoek ontbreekt de kwartcirkel (± 45 mm plaat), de naad sluit niet. De buigtoeslag rekent Ri = 30 terwijl 30 de buitenradius van deksel en bodem is (3,2 mm te veel per hoek). De tafel zegt 90°, bij 100 mm taps is de hoek tussen twee vlakken 87,7°.
- **Fout 3:** de mantel-uitslag is 2205 x 1537 mm: past niet op een plaat van 1500 breed.
- **Fix:** vlak been = buitenmaat − (R + t) per aangrenzende zetting; mantel in twee helften met de naden midden in een vlak (4 zettingen); R als binnenradius doorgeven. Een test die de uitslag terugvouwt en de buitenmaat vergelijkt met de 3D (± 1 mm). Praktisch: stuur de zetterij de buitenmaten en laat hen hun eigen inkorting toepassen; K = 0,4 met Ri = 2t is een aanname (op een V24-matrijs wordt Ri ± 4 mm bij 3 mm plaat).

---

## 3. Nieuwe P2 - belangrijk

**N-P2-01 Kabelgoot als massief blok: 296 kg te veel.** `selectorized.mjs:109`. De goot is een `plaat` van 195 x 1119 x 170 mm en telt als massief staal. FS-01 pro: `o.massa` 707 kg, stuklijst 402 kg. Alle 14 nokmachines wegen 606-745 kg in het model. Gevolg: de klant ziet een fout gewicht, de kantelproef rekent met 296 kg extra onderaan (te gunstig) en de overheadklasse klopt niet. Fix: de 3D-kinderen van een gezette plaat als dunne vlakken, en een test `|o.massa − som stuklijst| ≤ 5 %`.

**N-P2-02 De grens van 90 kg.** `selectorized.mjs:16` (`NOKGRENS`), `:87`. Chest press pro 95 kg, thuis 58 kg; lat pulldown 140 kg (1:1), arm en romp 70 kg (2:1). De toets vergelijkt de kracht met een grens die in dezelfde regel gekozen is, en de bron is "AANNAME merkwaarden" zonder getal van een merk. Voor een pro chest press en dip is 90-95 kg aan de lage kant (AANNAME: merkstapels 110-180 kg bij ± 1:1). En er is geen ruimte om te groeien: de kabel staat op 94 % en katrol A op 98 % (in werkelijkheid erover, N-P1-03). Fix: per oefening één bron met een getal opzoeken (stapel en overbrenging uit een handleiding), de kabel en de katrollen een maat zwaarder, grens druk en been 110-120 kg.

**N-P2-03 Nokriem en riemschijf zijn geen bestelbare onderdelen.** `onderdelen.mjs:87-88`. "AANNAME (riemenhandel)" en "AANNAME (draaierij)", breukkracht "± 22 kN" zonder bron: dat botst met de eis dat kooponderdelen echt bestelbaar zijn, en dit is het onderdeel dat 2 x de stapel draagt. Een gestikte lus haalt de breukkracht van de band niet (AANNAME 50-70 %), de lus ligt om een pen M10 (`:122`: te scherp voor aramide, neem een pen ≥ Ø20), en de schijf heeft een vlakke loopbaan zonder flens (de riem loopt eraf als het blok scheef trekt). Fix: een leverancier met een datablad (riem met ingeperste eindstukken), of terug naar staalkabel Ø6,4 op een nok met groef.

**N-P2-04 De nokmachines zijn 2,0-2,7 m diep.** `selectorized.mjs:36-37` (`ytMin`: de toren schuift achteruit om plaats te maken voor het blok). FS-01 2368 mm, FS-09 2738 mm; in v5 ± 1,9 m, merktoestellen 1,2-1,6 m (AANNAME). Een zaal koopt per vierkante meter. Fix: takel in de toren (N-P1-01).

**N-P2-05 Kabelgoot van 1,5 mm op de vloer.** `selectorized.mjs:109-110`. Een U-kap van 195 breed, 170 hoog en 1,1 m lang tussen station en toren: daar stapt iemand op. 1,5 mm deukt en dan loopt het blok vast. Fix: traanplaat 3 mm met 2 schotten, of geen goot (N-P1-01).

**N-P2-06 As "C45 / S355J2".** `onderdelen.mjs:33`, `selectorized.mjs:49, 55, 60, 64`. Op de as worden de nok, de instelschijf en twee naafbussen gelast. C45 is slecht lasbaar zonder voorwarmen; S355J2 wel. De berekening staat op 0,85 (as) en 0,86 (las nok). Fix: S355J2+C voorschrijven, geen keuze laten.

**N-P2-07 FX-04: T-greep rammelt en de borgpen is niet gerekend.** `buiten.mjs` (laadpaal: stift `r25` in `b48x8s`). Binnenmaat van de laadpen 32,3 mm, stift Ø25: 7 mm speling. De hele last hangt aan de borgveer Ø8; daar is geen toets voor (de enige berekening is de laadpen als uitkrager). Fix: stift Ø32 (afgedraaid op de binnenmaat), borgpen Ø10 door stift en laadpen, toets afschuiving en stuik bij 2,5 x 200 kg.

**N-P2-08 Funderingsplan: te mager om uit te zetten.** `tekeningen.mjs:445` (`funderingBlad`). Wat er staat is goed (tabel x/y, doorsnede, valruimte 2,07 m, tekst over KLIP/KLIM). Wat ontbreekt: maatlijnen tussen de poeren en de twee diagonalen (uitzetten gebeurt met een meetlint, niet met coördinaten), de paalhoogte per poer (FX-13 en FX-22 hebben palen van verschillende lengte), de maat van de valruimte, en bij FX-23 liggen de poeren 200 mm van elkaar: teken dat als één strook. De titel "Doorsnede poer" staat tegen de tabel. Bij FX-18 (bank) en FX-24 nakijken of de bogen en opstappalen dezelfde gegevens krijgen.

**N-P2-09 Klantmodus is een laag verf.** `maak-web.mjs:28`, `web/index.html:152, 257, 269`. `klant.html` is `index.html` met een klasse die de werkplaats met CSS verbergt. In dezelfde map staan `index.html` (zonder `?klant` toont ze alles, getest) en `js/prijzen.mjs` met uurloon en marges. De prijzen worden in de browser van de klant berekend met `STANDAARD`; Ians eigen instellingen staan in de `localStorage` van zijn eigen browser en komen dus nooit bij de klant. Verder: geen offerteknop, de inleiding belooft de klant "het volledige tekeningenpakket", de voet verwijst naar "de werkplaats", en de klant ziet thuisprijzen van 2 tot 5 keer de markt (FR-01 thuis € 3.549). Fix: `maak-web --klant` schrijft een map met alleen `klant.html`, de 3D-modules en een `prijzen.json` die vooraf met Ians instellingen berekend is; geen `prijzen.mjs`, `werkwijze.mjs`, `dossier.mjs`, `tekeningen.mjs`.

**N-P2-10 Prijs: slechter dan v5.** Standaardinstellingen: 273 van 300 boven de markt (v5: 249). FS pro 25 van 25 boven (1,18 x; v5: 14 van 25), FX pro 19 van 25 (v5: 10), semi 97 van 100. Oorzaken: de takel (FS-01 pro € 7.119 → € 8.614), plaatsing en keuring bij buiten (terecht), het stenenplatform (FX-11: 45 uur, € 5.991 tegen markt € 500-1.100). De keuring van € 400 per stuk zit ook op de thuisversie van een buitentoestel (een tuin heeft geen keuring nodig). En 140 van de 300 oordelen staan op oranje (v5: 51), waarvan 50 door de vaste melding van P2-18: oranje zegt zo niets meer. Het advies van v5 §5 blijft: kleiner gamma, geen thuislijn voor machines.

**N-P2-11 Buislaser-DXF.** `dxf.mjs` (`kokerDxf`). Vier rechthoeken onder elkaar met de gaten per wand. Een buislaser leest dat niet (STEP of een parameterlijst), en zonder aanduiding van de lasnaad en het nulpunt is "wand +w" niet eenduidig. Noem het wat het is (boormal op schaal 1:1) of lever een gatentabel per wand als CSV: positie langs de koker, wand, diameter.

**N-P2-12 R30 op een kantbank.** `opslag.mjs:179`. Een zetting met binnenradius 30 in 2 mm plaat vraagt een radiusstempel of stapbuigen (zichtbare facetten). Vraag het de zetterij; R 4-6 met een afgeronde gelaste hoek is goedkoper.

**N-P2-13 Restpunten die open blijven.** P2-03 (rolarm verstelbaar 340-440), P2-09 (duwpalen uitneembaar: een slee met vaste palen van 1,1 m past niet in een bestelwagen naast de rest), P2-15 (R per buigerij), P2-18 (zadelplaten tekenen of de aansluiting smaller maken: nu staat op elk FS-toestel "Voet lagerpaal 80 mm op vlak 60 mm").

**N-P2-14 Tests: wat v6 niet vangt.** `src/qa/qaFitness.test.ts:719-840`. De negatieve proeven per P1 zijn goed. Geen van de zeven nieuwe P1's valt erdoor:
- bewegend deel zonder geleiding of steun (takelblok);
- aanslag raakt de arm in stand 0 en 1;
- massa van een stapelplaat tegenover haar label, en kabel/katrol op de echte massa;
- vloerkatrol aan de binnenkant van de kabelhoek;
- uitslag terugvouwen = buitenmaat van de 3D;
- `o.massa` tegenover de stuklijst;
- materiaalcombinatie (RVS + verzinken);
- opening bij een inlopende kneep.

---

## 4. Vormtaal: is het nu pro?

- **FM rigs (Rogue/Eleiko): ja, bijna.** Schetsplaten met gat, kopplaten, zijplaat met naam, dipzadel. Wat nog ontbreekt staat in P3-03/04.
- **FX strongman: ja.** Zwarte pennen, schetsplaten, verstelbare jukbalk met accentpennen, tapse details.
- **FX buiten: ja.** Dikke palen met bolle kop, RVS-stangen (mits N-P1-06).
- **FO opslag: grotendeels.** Tapse plyobox en trapvormige zijplaat ogen goed. De schijvenbomen op een plaat van 46-76 kg blijven zwaar en duur (P3-07).
- **FP en FK (Hammer Strength / Life Fitness): redelijk**, zoals in v5.
- **FS selectorized (Life Fitness/Technogym): nee.** Het blijft een kast met daarnaast een bankje tussen twee rechte palen op T-voeten. De nok is nu een grijze plaat tussen twee vlakke platen, de instelschijf is een kale schijf naast de arm, de riem loopt zichtbaar langs de zitting. Wat de merken anders doen en wat bouwbaar is:
  1. één gesloten kap rond nok en riem in de kleur van de stapelkap, die doorloopt tot aan de toren (lost ook N-P1-02 op);
  2. de twee lagerpalen vervangen door één gelaserd schild 8 mm per kant met een ronde contour;
  3. zitting en rug op één gebogen ruggengraat in vlakovaal;
  4. toren en station op één gesloten voetlus, geen losse T-voeten;
  5. de takel in de toren (N-P1-01), zodat de vloer vrij is en het toestel korter wordt.

---

## 5. Nieuwe P3 - afwerking

**N-P3-01 Verouderde tekst.** `selectorized.mjs:2` ("trommel R200"), `:55` ("kabelgroef" bij een riem), `:138` ("één kabel 2:1 zoals FK-01"). Op het kabelblad van FS-01 staat bij de nokriem "persklem op de kern, mantel strippen, Ø3 mm" (tekst van een staalkabel) en bij katrol L "kap: bovenligger + beugel".

**N-P3-02 Juk: 14 schijven op 450 mm.** `buiten.mjs` (`schijven25: floor((Lp − 20) / 30)`). Een gietijzeren schijf van 25 kg is ± 40-45 mm dik: 9-10 schijven = 225-250 kg per kant. Genoeg voor 450 kg, maar zet het juiste getal op het blad. Verstelbereik jukbalk 300 mm (7 gaten): laat de gaten doorlopen tot 1,0 m.

**N-P3-03 Kantelen onder trek.** `bereken.mjs` (`kantelTrek`): met anker is de benutting altijd 0,5, ook als het ankerkoppel nooit gerekend wordt; en het moment staat als "1.312,58 kNm" (het is Nm).

**N-P3-04 Zethoek V-goot en buitenmaat.** `opslag.mjs:85`: benen `Lf − 2` in plaats van `Lf − (R + t/2)·tan(al)`: ± 5 mm op de breedte van een open goot, zonder gevolg, maar dezelfde denkfout als N-P1-07.

**N-P3-05 "EN ISO 20957 klasse S" bij een buitentoestel.** Eerste regel van `berekening()` (`bereken.mjs`, `V.uitleg`). En op de klantpagina staat een groen vak "Berekend volgens EN ISO 20957" boven "prototype, geen normclaim": groen leest als goedgekeurd.

**N-P3-06 FM-15 muurrig: optie bandpinnen past niet.** Verberg de optie waar ze niet kan in plaats van "niet gelukt".

**N-P3-07 Keuring op thuisversies buiten** (`prijzen.mjs`, `o.grond`): alleen bij pro en semi rekenen.

**N-P3-08 Open P3's uit v5:** P3-03 (voetflens, genummerde gaten), P3-04 (muurrig zonder achterstaanders), P3-05 (functional trainer met boog), P3-06 (kopligger), P3-07 (kruisvoet).

---

## 6. De 5 belangrijkste

1. **N-P1-01 + N-P2-04:** het takelblok heeft geen geleiding of steun en de riem trekt 57 mm excentrisch; verplaats de takel naar de toren.
2. **N-P1-03:** stapelplaten wegen 5,67 kg in plaats van 5: echte pro-stapel 170 kg, kabel 106 % en bovenkatrol 111 %.
3. **N-P1-02 + N-P1-04:** open kappen bij nok en riem naast de gebruiker; instelschijf en aanslagen werken niet (arm komt nooit dichter dan 73 mm).
4. **N-P1-07:** de uitslagen van de gezette delen hebben verkeerde maten (bak 24 mm te breed, plyobox-mantel sluit niet).
5. **N-P1-06 + N-P1-05:** RVS-stangen worden mee verzinkt; bij FK-08 staat de vloerkatrol aan de verkeerde kant van de kabel.

Daarna: N-P2-09 (klantmodus is alleen CSS, prijzen uit de standaardinstellingen) en N-P2-10 (273 van 300 boven de markt).
