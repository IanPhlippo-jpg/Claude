# Onafhankelijk ontwerp-QA-rapport v3

## 1. Scope, zelfstandig uitgevoerd onderzoek, bewijs en beperkingen

**Scope:** ontwerp-/engineeringmaturiteit van `src-v3/` (114 bestanden). `src/` en `report/AFZUIGING-eindverslag-v2.md` zijn alleen gebruikt voor de matrix van eerdere bevindingen. Er zijn geen andere teamrapporten, team/in-mappen of v2/v3-evidencemappen gelezen. Ontbrekende fysieke validatie telt nergens als aftrek.

**Bewijslabels:** **[B]** = claim uit de bron; **[E]** = eigen berekening, test of reconstructie; **[K]** = officiële CAD-kernel. Ik had **geen** officiële kernel. Elke geometrie hieronder is dus [B] (nominale generatorparameters) of [E] (meshanalyse).

**Uitgevoerde controles** (alle artefacten staan in `[eigen onderzoeksmap]/`, zie `LEESMIJ.md`):
1. **Bronintegriteit:** SHA256 van alle 114 bestanden vóór en na het onderzoek, identiek (`bron-sha256-voor/na.txt`). Ik heb alleen op `src-copy/` gewerkt.
2. **Native tests:** `test_regel.cpp` gebouwd met zig c++ (clang, gnu++17, `-Wall -Wextra`) en Unity v2.6.0. Uitkomst **16/16 PASS** (`native-test.log`). Dit is niet de PlatformIO/GCC-16.2-toolchain die de bron noemt. ESP32-targets (knop/module) heb ik **niet** opnieuw gebouwd.
3. **Eigen karakteriseringstests:** 7 tests in `eigen-tests/test_adversarial.cpp`, 7/7 PASS (`eigen-tests.log`). PASS betekent hier dat het beschreven risicogedrag echt optreedt.
4. **STL-analyse:** trimesh-controle van alle 13 STL's op gesloten mesh, winding, aantal bodies en maten (`stl-check.json`).
5. **Rekenblad:** `berekeningen.py` opnieuw gedraaid. De uitkomst is byte-identiek aan `Berekeningen.md`, op regeleinden na (`berekeningen-herrun.md`).
6. **Eigen luchtreconstructie:** gebouwd op de bronfuncties, met sensordruk = rooster + filter + cassettebodem, omdat het meetpunt onder het filter in de instroomplaat zit (`maak-afzuiging.mjs:67`). Scenario's: schoon, geen filter, belast filter, en het moment waarop het debiet onder 190 m³/h zakt (`lucht_eigen.py` → `lucht-eigen.txt`).
7. **Filterkeuze:** Rittal-productblad SK 3171.100, geraadpleegd via [Rittal-productblad SK 3171.100](https://www.rittal.com/pdf-creator/variant/de-de/3171100) en bewaard als `[eigen onderzoeksmap]/rittal-SK3171100.pdf` ("Stand: 07.11.2026", SHA256 e52a5b20…d79d2). Daarin: G3 / ISO Coarse 50 %, "Ausfilterung … ab 10 µm", progressieve opbouw met open stofluchtzijde en gesloten reine-luchtzijde, 173×173×17, tot 100 °C. **Rittal geeft geen drukval.** "Vanaf 10 µm" betekent niet dat kleinere deeltjes helemaal niet worden afgevangen. Er is alleen geen fijnstofrendement aangetoond. Deze review geeft geen kwantitatief oordeel over uitstoot of blootstelling.
8. Statische review van `regel.h`, `protocol.h`, `module/main.cpp`, `knop/main.cpp` en de documentatie, plus nominale maatketens uit `maak-afzuiging.mjs`.

**Beperkingen:**
- Geen kernelherbouw van `Afzuiging.kcad` (77 componenten) en geen nieuwe interferentiecontrole. Dit is een grens van de scope van deze review en geen ontwerptekort; de CAD-score is daarvoor niet verlaagd.
- `maak-afzuiging.mjs:29` importeert `../lib/schets.mjs`, dat niet in de snapshot zit. Exports kon ik daarom niet regenereren.
- Geen schema-/netlistcontrole van kruipwegen.
- Geen hardware uitgevoerd. Geen claim dat iets fysiek werkt.

## 2. Wijzigingen sinds v2 en matrix van elke oude bevinding

**Hoofdwijzigingen [B]:**
- Filter gewisseld van een M5-mat naar **Rittal SK 3171.100 (G3)**. Het concept is expliciet herdefinieerd als "ventilatorbescherming, geen luchtreiniger".
- Ontwerpdebiet nu **250 m³/h** in plaats van 500.
- Nieuw gegenereerd rekenblad.
- Nieuwe `regel.h` (hardwarevrije toestandsmachine) met 16 hosttests.
- Koppeling met MAC + CCMP-sleutel.
- 13 STL's, cassette/romp geherdimensioneerd (romp 96 mm, cassette 19 mm).

| # | v2-bevinding | Status | Bron / bewijs |
|---|---|---|---|
| 1 | M5 als enige retourlucht-eindtrap | **Open (heringekaderd)** | Vervangen door een **grovere** G3-mat (≥10 µm). Fijn stof gaat bewust terug in de ruimte (`Vrijgave §2`, `README:9`). De gezondheidsbelofte is eerlijk geschrapt, maar er is geen fijnstofbeheersing ontworpen. Buitenafvoer is alleen een "latere optie" (`Vrijgave §2.4`). |
| 2 | Geen gespecificeerde afdichting | **Deels** | 1 mm rondom aandrukken in een vak van 171 (`mjs:47-49`) [B/E]. De EPDM-band 3×9 staat alleen in tekst (`Vrijgave §2.2`). Niet in CAD, BOM of `stuklijst.csv`. `richel.dikte` blijft 1,5 en is niet "1,5 mm lager" gezet (`mjs:50`). |
| 3 | Onbekende mediacurve/drukval | **Deels** | Rittal geeft geen Δp. Gerekend met een G4-surrogaat van 34 Pa bij 1,5 m/s (`berekeningen.py:64-68`). De frontsnelheid bij 250 m³/h is 2,37 m/s [E], dus een extrapolatie buiten het bronpunt. |
| 4 | 500 m³/h ongefundeerd | **Opgelost** | Doel 190 minimum / 250 ontwerp (`Berekeningen §1`), Dalla Valle zelf nagerekend [E]. |
| 5 | Geluid gelijkgesteld | **Opgelost als raming** | 50·log-wet per stand (`Berekeningen §3`) [E: 60 % → 57,9 dB]. |
| 6 | Romp CAD 99/STL 114; cassette 22/37 | **Opgelost** (export) | STL romp 210×210×96 = AFZ-01 = `mjs:40`; cassette 174,2×174,2×19 [E]. Maar de README-printtabel zegt nog 99 (`README:137`), zie N9. |
| 7 | 4 STL's niet gesloten/manifold | **Opgelost** | 13/13 gesloten mesh, consistente winding, 1 body elk [E]. |
| 8 | 4 STL-typen ontbreken | **Opgelost** | 13 typen aanwezig [E]. |
| 9 | Oude doorsnede/BOM (3 filters, 229, 86, stalen klauwen, M3) | **Grotendeels opgelost** | Doorsnede: 1 mat, 68 onderhang, 106 hoog. "229" staat er nog; dit lijkt de buitenmaat inclusief klauwen, niet geverifieerd. Het commentaar "2 stalen klauwen (M3)" staat nog in `mjs:90` en `mjs:462`, terwijl de BOM M4/PETG zegt. Het M5-moermateriaal botst: "staal verzinkt" in de stuklijst tegenover A2 in `README:92`. |
| 10 | 4 kleine overlapkandidaten | **Onzeker** | Geen kernelherbouw uitgevoerd. |
| 11 | Magneetpocket 0,4 mm bodem | **Opgelost** [B] | 1,6 diep in 2,5, dus 0,9 bodem (`mjs:65-66`). |
| 12 | Moerkamerdak 1,8/1,6 | **Deels** | Opgenomen in de afschuifcalculatie (`Berekeningen §6`). Geen buigcontrole van het dak. |
| 13 | M4×65 puntuitsteek knop | **Onzeker** | Niet opnieuw gereconstrueerd. |
| 14 | Fanbout 4 mm op ondergrens | **Opgelost op papier** | 5 mm nominaal, 4,6–5,4 [B]. Opmerking: voor L=10 geeft ISO 4759-1 js15 ±0,29, niet ±0,2. Ook dan blijft het binnen 4–6 [E]. |
| 15 | Draag-/klemconcept niet berekend | **Deels** | 48 N/klauw en 0,05 Nm reken ik na [E: σ=6·48·10/(8·6²)=10 MPa; T=0,2·48·0,005=0,048 Nm]. Uitvoerbaarheid: zie N6. |
| 16 | G01-fan te zwaar | **Opgelost** | `README:60`, `Vrijgave E11`. |
| 17 | Zekeringselectie | **Deels** | Criteria staan erin (traag, ≥32 V DC, afschakelvermogen). Geen partnummer. 2,43/3,15 = 77 % [E]. |
| 18 | Kabel/M8-ratings | **Deels** | 0,25 mm², 1 m lus: 0,069 Ω [E]. "binder 718, 4 A/contact" is [B], niet door mij geverifieerd. |
| 19 | Kruipweg/padplan/USB-C-bron | **Onzeker** | Schema niet in detail gecontroleerd. |
| 20 | Warmtebudget | **Grotendeels opgelost** | Tabel per stand. De regel noemt nog "70 % dagstand met F7" (`Berekeningen §5`), een achterhaalde verwijzing. |
| 21 | Oude dp blijft geldig | **Opgelost** | `regel.h meetVers`; bron-test plus review [E]. |
| 22 | Nul samples → geijkt | **Opgelost** | `ijkVerder` minimum 4 metingen; test [E]. |
| 23 | IJking negeert UIT; bewaking pas vanaf 30 % | **Opgelost** | UIT breekt de ijking af; stilstand bewaakt vanaf 20 % (tests) [E]. |
| 24 | Geen unieke koppeling, broadcast, boost alleen in knop | **Deels** | MAC + CCMP en module-eigen boost zijn opgelost. Nieuw: overname en replay (N4). |
| 25 | AAN bij boot; UIT ≠ bevestigd | **Opgelost / deels** | Start UIT (`knop:366`, test). `Status.aan` = PWM>0 en is geen rotorbevestiging. Wel is STIL na 5 s via tacho aanwezig. |
| 26 | "Uitkloppen" | **Opgelost** | `knop:320`, `README:31`. |
| 27 | ±500 Pa met factor 2 | **Deels** | Begrensd tot 450 Pa. Nieuw gevolg: N3. |
| 28 | Kamerdruk meet rooster/hand mee | **Open** | Het meetpunt zit onder het filter (`mjs:67`). Het rooster telt in de referentie mee en dempt het alarm (N1). |
| 29 | Ergonomische envelop | **Deels** | `Vrijgave §3b` werkplekmaten. |
| 30 | "PETG tegen aceton/75 °C" | **Onzeker** | Niet onderzocht. |
| 31 | Doc-conflicten (frees, schakelaar, USB, TR5) | **Grotendeels opgelost** [B] | Frees 212×102 (`mjs:77`), schakelaar in de voorwand. Nieuwe conflicten: N9. |
| 32 | `../lib/schets.mjs` ontbreekt | **Open** | `mjs:29`; exports niet reproduceerbaar. |
| 33 | Kostentotaal | **Open (nieuw conflict)** | README €495,48 (`README:172`) tegenover `prijslijst.csv`/`Besparingen` €502,69. |

## 3. Nieuwe bevindingen

**N1 — Major — "Filter vervangen" komt te laat; het scherm oogt normaal terwijl de minimale vangst al niet meer gehaald wordt.**
- **Bewijs [E]:** volgens het eigen bronmodel (`lucht-eigen.txt`) meet de sensor rooster + filter + bodem. Het alarm staat op 2× de schone sensordruk (`regel.h volFactor`). Het debiet zakt onder 190 m³/h, het eigen minimum (0,5 m/s op 10 cm), bij:
  - 60 %: 1,42× schoon;
  - 70 %: 1,70× schoon;
  - 80 %: 1,94× schoon.
- Het alarm volgt dus pas **na** het verlies van de vangst. Bij 60 % wordt 2× pas gehaald rond de einddrukval van het filter, bij ongeveer 103 m³/h (≈0,27 m/s op 10 cm).
- De claim "ongeveer 100 Pa bij 250 m³/h, ruim vóór de einddrukval" (`Berekeningen §3`) klopt niet voor de werkelijk gemeten grootheid.
- **Menselijk gevolg:** een beige ring met een Pa-waarde suggereert werkende afzuiging terwijl stof het gezicht kan bereiken.
- **Actie:** baseer het alarm op het geschatte debiet (Δp + tacho + fanmodel) of op een filtergerelateerde drempel per stand, gekoppeld aan Qmin.
- **DIGITAAL acceptatiecriterium:** een hosttest met de rekenbladcurven laat zien dat op elke toegestane stand "vervangen" of "onvoldoende afzuiging" verschijnt vóórdat Q(model) < 190 m³/h.

**N2 — Major — Gewone standen onder de vangstdoelstelling geven geen melding.**
- **Bewijs [B/E]:** schoon levert 40 % 148 m³/h en 0,39 m/s op 10 cm (`Berekeningen §3`). Standen 20–50 % zijn kiesbaar (`regel.h minPct`), zonder enige melding.
- **Gevolg:** stille standen zijn voorspelbaar te zwak, terwijl de gebruiker denkt dat er "afgezogen" wordt.
- **Actie:** verhoog `minPct` naar de berekende stand voor 190 m³/h, of toon "zwakke afzuiging" onder Qmin.
- **DIGITAAL:** een test/tabel bewijst dat elke selecteerbare stand zonder waarschuwing ≥190 m³/h haalt (model, schoon en op de vervanggrens).

**N3 — Major — Een aanhoudende meting boven 450 Pa leidt tot een vage melding zonder handelingsinstructie.**
- **Bewijs [E]:** `regel.h:86` zet bij |pa|>450 `dp=NAN` (`buitenBereik` gaat niet in `Status`). UI-pad `knop:317-318` toont "meting niet actueel – filterbewaking even uit". Test D: `meetVers=false`, `vol=NAN`, `storing=GEEN`.
- **Interpretatie:** een meting boven 450 Pa is niet automatisch een verstopt filter. Mogelijke oorzaken zijn onder meer een sterk belast filter, een afgedekt rooster, een sensor- of slangfout en een offset. Het ontwerpgat is dat een aanhoudende overrange of ongeldige meting niet als aparte, blijvende bewakingsstatus wordt doorgegeven en geen passende instructie krijgt.
- **Actie:** een eigen status "meting buiten bereik / ongeldig" in `Status` en de UI. Bij een aanhoudende toestand een duidelijke melding met een controle-instructie (rooster vrij, slang, filter controleren), los van de vervangindicatie (`vol`).
- **DIGITAAL:** een hosttest met een aanhoudende 460–500 Pa geeft na een vastgelegde tijd de status "buiten bereik" plus de bijbehorende UI-melding, en nooit stil een normaal beeld.

**N4 — Major — Koppeling: overname binnen het venster, replay over sessies, sleutel in klare tekst.**
- **Bewijs [E]:**
  - `Koppeling::vraag` (`regel.h`) overschrijft een bestaande koppeling bij elke KOPPEL in de eerste 60 s (test A). Na een stroomuitval in een salon met twee sets kan de andere knop de module overnemen.
  - Een sessiewissel reset het volgnummer, dus een oud bericht uit een andere sessie wordt opnieuw aanvaard (test B).
  - De LMK gaat onversleuteld als broadcast (`knop:438-442`).
  - De PMK staat hardcoded (`module:41`).
  - Of ESP-NOW onversleutelde frames van een versleutelde peer weigert, heb ik niet vastgesteld (onzeker).
- **Actie:** koppelen alleen na een expliciete handeling op de box, en een bestaande koppeling niet stil overschrijven. Sessie gebonden aan de module-nonce; opdrachten geauthenticeerd.
- **DIGITAAL:** de omgekeerde weigeringstests slagen (PASS): een overname zonder expliciete koppelhandeling wordt geweigerd, en een opdracht uit een eerdere sessie wordt geweigerd. Mijn karakteriseringstests A en B horen dan te falen.

**N5 — Major — De bewaking kan een ontbrekend filter, een ijking op een vuil filter en een losse slang (ongeijkt) niet onderscheiden.**
- **Bewijs [E, modelgebonden]:**
  - In de eigen reconstructie (bronmodel, onzekerheidsband 0,7–1,5×) ziet de sensor zonder filter 0,47–0,66× de schone waarde. Dat ligt boven de storingsdrempel van 0,25 (`lucht-eigen.txt`; test C: geen storing).
  - IJken op hogere waarden wordt aanvaard zolang ze tussen 0,5 en 450 Pa liggen en stijgen (test E).
  - Ongeijkt wordt geen `geenLucht` beoordeeld (test F).
  - `README:259` zegt "nooit zonder filter", maar het ontwerp bewaakt dat niet.
- **Grens:** één drukwaarde identificeert een ontbrekend of half vol filter niet uniek (stand, rooster, toleranties). De getallen gelden alleen binnen het model.
- **Actie:** óf een mechanische aanwezigheidsborging (cassette/mat met een geometrische vergrendeling of een aanwezigheidsdetectie), óf een expliciet gedocumenteerde detectiegrens ("dit wordt niet gedetecteerd") in de UI en de README. Een absolute plausibiliteitsband alleen met een onderbouwde onzekerheidsanalyse. Ongeijkt: een minimale absolute controle of een duidelijke status "niet bewaakt".
- **DIGITAAL:** de CAD toont een borging, of de documentatie en UI-teksten noemen de detectiegrens; een eventuele band is afgeleid uit een gedocumenteerde onzekerheidsberekening met bijbehorende hosttests.

**N6 — Major (ergonomie/voorspelbaarheid) — De momentbegrenzing van de klauwen is onvoldoende gespecificeerd.**
- **Bewijs [B]:** `Berekeningen §6`, `README:197`: 0,05/0,03 Nm, uitgevoerd als "twee vingers… voelbaar aanligt". Er is geen gereedschap, geen meetbaar criterium en geen ontwerpmatige begrenzing die dit moment of de klauwkracht vastlegt.
- **Gevolg (ontwerprisico):** of de klemkracht binnen de berekende PETG-/honingraatgrens blijft, hangt af van niet-gespecificeerde handbediening.
- **Actie:** specificeer een uitvoerbare begrenzing: een geometrische aanslag of afstandsbus, een veer met een gedefinieerde kracht, of een gespecificeerd momentgereedschap. Reken de kracht door bij het gespecificeerde maximum.
- **DIGITAAL:** CAD/BOM bevat de begrenzing, en een berekening toont dat de spanning bij de gespecificeerde maximale bediening ≤ de kruipgrens blijft.

**N7 — Minor — Filtermat: oriëntatie niet gespecificeerd; goedkoper alternatief zonder aandrukking.**
- **Bewijs:** Rittal noemt een open stofluchtzijde en een gesloten reine-luchtzijde. README en `Vrijgave` zeggen niets over oriëntatie [B/E]. `Besparingen` punt 3: RS 171×171 in een vak van 171 geeft nominaal 0 mm aandrukking. Dat bewijst geen feitelijke bypass, maar verhoogt het bypassrisico, en het staat toch bij "veilig besparen" zonder maatketen.
- **Actie:** specificeer de oriëntatie (open zijde boven) in UI, tekening en README. Onderbouw het alternatief met een compressie- en tolerantieketen of voeg een pakking toe.
- **DIGITAAL:** de tekening AFZ-04 en de README benoemen de mat-oriëntatie. Per alternatief een gedocumenteerde maat- en compressieketen (mat- en vaktoleranties) die de gekozen minimale aandrukking onderbouwt. De drempelwaarde is een ontwerpkeuze en geen voorgeschreven eis.

**N8 — Minor — Rekenbladdetails.**
- **Bewijs [E]:**
  - Het rooster heeft het label f=0,35, maar de berekende f = 125,6/404 = 0,311. Over het cassettevak is dat 0,43.
  - De filterexponent n=1 bij 2,37 m/s: n=1,3–1,6 geeft 62–71 Pa in plaats van 54.
  - De verwijzing "dagstand met F7" in §5 is achterhaald.
- **Actie:** label corrigeren, gevoeligheid voor n toevoegen, F7-verwijzing schrappen.
- **DIGITAAL:** gegenereerde tabellen tonen een n-band en de juiste f.

**N9 — Minor — Documentconsistentie.**
- **Bewijs [E]:**
  - `README:137-142`: Romp 99 (STL 96), Cassetterand 200 (200,5), Instroomplaat 202 (201,4), Knopdeksel ×2 (4,9).
  - `README:174`: "nieuw filter (M5, 170×190) € 0,50", terwijl de werkelijke prijs €22,21 per 5 is.
  - Totaal €495,48 tegenover €502,69.
  - `mjs:90` en `mjs:462`: "stalen klauwen (M3)".
  - M5-moer: verzinkt tegenover A2.
  - `README:36,52`: meervoud "filters".
- **Actie:** README-tabellen genereren uit dezelfde bron als de STL's.
- **DIGITAAL:** een script vergelijkt de README-maten en -prijzen met `stl-check`/`prijslijst.csv`, zonder afwijking.

**N10 — Major (ontwerpgat, geen tekort aan fysieke tests) — Er is geen ontworpen fijnstofbeheersing.**
- **Bewijs [B]:**
  - De gekozen mat is G3 / ISO Coarse 50 % met "Ausfilterung … ab 10 µm" (Rittal-blad, zie §1). Er is geen fijnstofrendement opgegeven of aangetoond.
  - De bron kiest bewust "geen luchtreiniger", met lucht terug in de ruimte (`README:9`, `Vrijgave §2`). Voor ventilatie geeft ze geen debiet- of luchtwisselingseis. Buitenafvoer is alleen een "latere optie" (`Vrijgave §2.4`).
  - De uitblaas gaat onder het blad naar achteren. Een reinigingsinstructie voor de delen stroomafwaarts (instroomplaat, waaier, bodemplaat) ontbreekt.
- **Grens:** dit is geen claim over feitelijke uitstoot, lekkage of gezondheidseffecten. Het ontwerpgat is dat de beschermingsfunctie tegen fijn stof niet gedimensioneerd of toegewezen is.
- **Actie:** kies en dimensioneer een concept: een fijnere eindtrap met drukbudget, een uitgewerkte buitenafvoer, of een kwantitatieve ventilatie-eis. Voeg een stofarme reinigingsinstructie per onderdeel toe.
- **DIGITAAL:** een ontwerpdocument met het gekozen concept, gespecificeerde filterdata of debieteisen, bijbehorende drukbudgetberekeningen en een instructie per onderdeel.

## 4. Wat goed is

- **Firmware:** `regel.h` is een duidelijke, hardwarevrije toestandsmachine. Het beleid staat bovenaan beschreven, en de tests (16/16, door mij gereproduceerd) dekken: start UIT, UIT met voorrang, versheid, ijkfouten, stilstand vanaf 20 %, boost in de module en zachte start. De meeste v2-firmwarefouten zijn aantoonbaar opgelost.
- **Exports:** alle 13 printtypen zijn gesloten meshes en stemmen overeen met de tekeningen en de generatorparameters.
- **Rekenblad:** wordt gegenereerd, is reproduceerbaar en noemt aannames en bronnen. Debiet is nu een onderbouwd doel. De beslissingen zijn eerlijk gedocumenteerd ("geen luchtreiniger").
- **Elektrisch:** de G01-fout is geschrapt; vermogens- en zekeringbalans zijn consistent; er is een thermische tabel per stand.
- **Onderhoud:** de vervanginstructie is stofarm (zak, FFP2, niet uitkloppen) en staat zowel in de UI als in de README.
- **Geometrie:** de mat past met een expliciete aandrukking, de magneetbodem is verbeterd en de fanboutketen is doorgerekend.

## 5. Gebiedsscores (/10, alleen ontwerpmaturiteit)

| Gebied | Gewicht | Score | Toelichting |
|---|---:|---:|---|
| CAD/geometrie/passing | 15 % | 7 | Coherente maatketens; pakking niet gemodelleerd. (Dat ik geen eigen kernelherbouw heb gedaan is een scopegrens en telt niet als aftrek.) |
| Exports/revisie | 15 % | 7 | 13/13 gesloten en consistent; generator niet reproduceerbaar (`schets.mjs`); README-tabel verouderd. |
| Lucht/druk/geluid | 20 % | 5 | Goed rekenblad, maar G3-Δp geëxtrapoleerd; alarmmodel en kiesbare standen dekken Qmin niet (N1, N2). |
| Filtratie/beschermingsconcept | 15 % | 3 | Bewust grof G3 (≥10 µm), fijn stof terug in de ruimte; afdichting alleen in tekst; geen filter-ontbreekt-detectie. |
| Elektrisch/thermisch | 10 % | 7 | Consistente balans; partnummers en ratings deels ongeverifieerd. |
| Firmware | 10 % | 6 | Grote vooruitgang; nieuwe Major-punten N3–N5. |
| Ergonomie | 5 % | 7 | Werkplekmaten; klemmoment niet uitvoerbaar (N6). |
| Onderhoud | 5 % | 6 | Goede vervangroute; oriëntatie en reiniging stroomafwaarts ontbreken. |
| Documentatie | 5 % | 6 | Veel verbeterd; nieuwe conflicten (N9). |

**Gewogen totaal:** (7·15 + 7·15 + 5·20 + 3·15 + 7·10 + 6·10 + 7·5 + 6·5 + 6·5) / 100 = 580 / 100 = **5,8 / 10**.

## 6. Top-5 ontwerpacties

1. **Filter-/vangstbewaking koppelen aan Qmin (N1, N2, N3, N5).** Debiet- of filtergebaseerde drempels; een aparte overrange-/ongeldig-status met instructie; een aanwezigheidsborging of een gedocumenteerde detectiegrens; geen kiesbare stand onder 190 m³/h zonder waarschuwing. Acceptatie: hosttests met rekenbladcurven en de nieuwe status- en weigeringstests slagen.
2. **Beschermingsconcept kwantificeren (#1, N10).** Kies tussen een fijnere eindtrap met drukbudget, een uitgewerkte buitenafvoer, of een gedimensioneerde ventilatie-eis. Leg de gekozen grens als ontwerpaanname vast.
3. **Afdichting en matdetails in CAD/BOM (#2, N7).** EPDM-band met groef/richel in het model, compressie- en tolerantieketen, mat-oriëntatie; RS-alternatief schrappen of aanpassen.
4. **Koppeling beveiligen (N4).** Expliciete koppelactie, geen stille overname, sessie-nonce, geauthenticeerde opdrachten. Acceptatie: de verbeterde weigeringstests slagen (PASS).
5. **Reproduceerbare revisie (#32, #33, N8, N9).** `schets.mjs` meeleveren; README-tabellen en prijzen genereren; een gespecificeerde momentbegrenzing van de klauwen (N6). Acceptatie: één commando regenereert alles zonder diff, en de controlescript-afwijking is 0.

**Afzonderlijk, ongescoord prototypevalidatieplan** (geen voorwaarde om bovenstaande acties af te tekenen):
1. **Lucht:** Q–Δp per stand met schone, half belaste en eindbelaste mat. Meet de vangstsnelheid op 10/15 cm en vergelijk die met het alarmmoment.
2. **Lekkage:** deeltjesteller vóór en na de unit, schoon en na herhaalde wissels; mat-oriëntatie vergelijken.
3. **Elektrisch/thermisch:** boxtemperatuur op 80 % en bij boost; eindcontrole door een bevoegd persoon; tacho en minimum toerental bij 20 % PWM.
4. **Firmware op hardware:** radioverlies, tweede set tijdens een stroomuitval, sensoruitval en het gedrag boven 450 Pa.
5. **Constructie:** klauwkracht en kruip bij een realistisch handmoment.
6. **Onderhoud:** stofarme wissel en bevuiling stroomafwaarts na gebruik, uitgevoerd met een veilig protocol, zonder opzettelijke stofblootstelling van personen.

## 7. Verworpen/ongefundeerde claims en grenzen van conclusies

- **Verworpen binnen het bronmodel:** "filter vervangen bij ongeveer 100 Pa, ruim vóór de einddrukval" (`Berekeningen §3`). In de eigen modellering van de bron ligt het alarmmoment bij de einddrukval en na het verlies van Qmin (N1). Dat is een modelinconsistentie en geen voorspelling van het gebouwde systeem.
- **Verworpen:** "G4 rekenen = veilige kant". Dat is alleen veilig op het surrogaatpunt bij 1,5 m/s; bij 2,37 m/s en n>1 ligt Δp hoger (N8).
- **Ongefundeerd:** "RS 171×171 = veilig besparen". Nominaal is er geen aandrukking en dus een bypassrisico zonder onderbouwende maatketen; feitelijke bypass is niet aangetoond (N7).
- **Ongefundeerd [B]:** "drukmeter weglaten, vol filter afleiden uit toerental" (`Besparingen` punt 2); geen model gegeven. M8 4 A/contact, de deratinggrens van de adapter en "PETG < 60 °C" heb ik niet gecontroleerd.
- **Niet aangevoerd:** ik claim geen wettelijke norm of overschrijding van een blootstellingsgrens, en geen feitelijke lekkage, uitstoot of gezondheidsschade. Het productblad noemt afscheiding vanaf 10 µm. Dat zegt niet dat kleinere deeltjes helemaal niet worden afgevangen; er is alleen geen fijnstofrendement aangetoond.
- **Grenzen:**
  - Alle luchtconclusies gebruiken de eigen modelstructuur en de onzekere coëfficiënten van de bron (band 0,7–1,5×). Ze laten een ontwerpinconsistentie zien en zijn geen voorspelling van het gebouwde toestel.
  - Geometrie is niet met een officiële kernel gecontroleerd.
  - De native tests liepen op clang (zig), niet op de vermelde GCC/PlatformIO. ESP32-builds zijn niet opnieuw uitgevoerd.
  - Het ESP-NOW-gedrag bij onversleutelde frames is onzeker.
  - Overlapkandidaten en schroefuitsteek uit v2 zijn niet opnieuw onderzocht.
