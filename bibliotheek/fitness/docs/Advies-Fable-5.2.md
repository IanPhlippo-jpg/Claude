# Advies Fable 5.2 - fitnesscatalogus (50 toestellen, thuis + pro)

Onafhankelijke review van commit c1dde6b, 2026-11-15. Niets gewijzigd behalve dit bestand.

## 0. Oordeel in het kort

De opbouw is sterk: één model per toestel voedt 3D, stuklijst, berekening, tekeningen en prijs; bronnen staan erbij; de gatcontrole heeft een negatieve proef; `qaFitness.test.ts` is groen (1427/1427, zelf gedraaid).

Maar de vraag "zitten er nog fouten in de machines" is **niet** opgelost. De tests bewijzen dat het model geometrisch sluit (niets botst, niets zweeft, elk boutgat ligt op zijn as). Ze bewijzen niet dat het toestel mechanisch werkt. Ik vond 14 punten waar een toestel zoals getekend onveilig is of niet werkt, verspreid over alle vier de soorten. Verkoop niets uit deze catalogus voor de P1-punten van dat toestel zijn opgelost en er één prototype met proeflast is getest.

Aantal bevindingen: **P1 = 14, P2 = 18, P3 = 8** (totaal 40).

Wat ik deed: alle generatoren, `bereken.mjs`, `controle.mjs`, `model.mjs`, `bouwstenen.mjs`, `onderdelen.mjs`, `prijzen.mjs`, `werkwijze.mjs`, `stuklijst.mjs`, `tekeningen.mjs` (deels), `detail.mjs` (deels) gelezen; alle 100 varianten doorgerekend met een eigen script (oordeel, benutting, uren, prijs); 14 screenshots bekeken; handberekeningen voor 4 toestellen. Niet gedaan: `banken.mjs` regel voor regel (alleen FB-02 via de uitvoer), `montage.mjs`, `dossier.mjs`, de web-app zelf bediend (alleen screenshots 40-42), de norm EN ISO 20957 zelf (betalend; ik steun op de waarden in `normen.mjs`).

Regelnummers verwijzen naar de bestanden in `bibliotheek/fitness/`.

---

## 1. P1 - onveilig of werkt niet zoals getekend

### P1-01 J-hook kan kantelen en draaien (FR-01, FR-02, FR-03, FR-04, FR-05)
- **Waar:** `bouwstenen.mjs:83-107` (`jhook`).
- **Fout:** de haak is een vlakke rugplaat tegen één vlak van de staander met een gelaste pen die maar door één wand steekt (`S.P.t + 18` mm). Er is geen U-beugel om de staander.
- **Waarom:** de stang ligt ± 45 mm voor het vlak. Bij de proeflast (thuis 4 x 150 kg = 5,89 kN; pro 6 x 225 kg = 13,2 kN) is het moment 265 Nm resp. 596 Nm. Dat moment moet opgenomen worden door de pen (trek naar buiten) en de onderrand van de plaat (80 mm lager): uittrekkracht 3,3 kN (thuis) en 7,4 kN (pro) op een gladde pen. Een gladde pen heeft geen uittrekweerstand. De haak kan ook vrij rond de pen draaien (plaat even breed als de staander, geen wangen). `bereken.mjs` rekent alleen afschuiving en stuik van de pen; het evenwicht van de haak zit er niet in.
- **Fix:** J-cup zoals Rogue/ATX: U-profiel (rugplaat + 2 wangen, laser 8/10 mm, binnenmaat staander + 2 mm met UHMW-voering) dat om drie vlakken grijpt; pen door **beide** wanden; de bovenrand van de achterwang neemt het moment op. Reken: pen dubbelsnedig, stuik op 2 wanden, contactdruk wang-staander.

### P1-02 Safety van het power rack is niet te monteren (FR-01)
- **Waar:** `bouwstenen.mjs:109-123` (`safety`), gebruikt in `rekken.mjs:37`.
- **Fout:** koker tussen voor- en achterstaander met aan beide kopse kanten een pen die 23 mm in de staander steekt. De zijframes zijn gelast (vaste afstand). De safety kan er niet in en niet uit; verstellen kan niet.
- **Fix:** pin-pipe safety (staaf Ø25/30 door beide staanders met een buis erover) of flip-down safety met U-beugels en één pen per kant. Pen dan dubbelsnedig door beide wanden.

### P1-03 Spotterarm hangt aan één stompe pen (FR-02, FR-04, FR-05)
- **Waar:** `rekken.mjs:423-433` (`spotter`).
- **Fout:** arm van 500-650 mm aan een rugplaat met één pen door één wand. Proeflast thuis 5,89 kN op het uiteinde van 600 mm geeft 3,5 kNm; arm tussen pen en onderrand van de plaat ± 120 mm: 29 kN uittrek op een gladde pen. De controle "Las aan de voet: spotterarm" (benut 0,68 / 0,86) rekent de las arm-rugplaat, niet de verbinding met de staander.
- **Fix:** spotterarm met U-beugel om de staander, pen door beide wanden bovenaan en een tweede pen of een haak-lip onderaan. Voeg een rekenregel toe voor het koppel op de staanderwanden.

### P1-04 Functional trainer en kabeltoren: kabellengte klopt niet bij verstellen (FK-04, FK-05)
- **Waar:** `kabel.mjs:330-367` (`ftBouw`), kabelroute op regel 354.
- **Fout:** de kabel loopt anker → losse katrol op de stapel → A → B → één katrol op de wagen → greep. Schuif je de wagen omlaag, dan heb je evenveel kabel extra nodig. De rail heeft 19 standen over 1350 mm; de stapel moet dan 675 mm stijgen (2:1) en de slag is 600 mm. In elke stand behalve één hangt de kabel slap of staat de stapel al omhoog.
- **Ook:** één katrol op de wagen. Trek je omhoog of omlaag, dan loopt de kabel van de katrol af.
- **Fix:** gesloten lus zoals elke commerciële trainer: de kabel loopt van boven door een dubbele zwenkkatrol op de wagen en verder naar een onderkatrol; de lengte langs de rail blijft dan constant. Wagen met twee katrollen in een zwenkbeugel. De test moet de wagen in de hoogste en laagste stand bouwen en de kabellengte vergelijken.

### P1-05 Leg extension, leg curl, kickback: as hangt eenzijdig en bezwijkt in buiging (FK-08, FK-09, FK-12)
- **Waar:** `kabel.mjs:380-397` (`beenMachine`).
- **Fout:** het lagerhuis is 100 mm lang en zit aan één kant (x = 160..260). De as Ø25 (thuis) / Ø30 (pro) steekt 420 mm uit; de nok met de volle kabelkracht zit op 250 mm van het lagerhuis.
- **Handberekening (thuis):** kabelkracht 84 kg x 9,81 = 824 N; M = 824 x 250 = 206 Nm; W(Ø25) = 1534 mm³; σ = 134 N/mm² bij gebruik. Proeflast (0 + 1,5 x 84) x 2,5 x 9,81 = 3,09 kN: σ = 3090 x 250 / 1534 = **504 N/mm² > 235**. Pro (Ø30, W = 2651, 104 kg): 361 N/mm² > 235.
- **Waarom gemist:** `bereken.mjs` rekent voor deze as alleen "pen op afschuiving" (benut 0,03).
- **Fix:** tweede lagerpaal aan de andere kant van de zitting (as tweezijdig opgelegd, nok en hefboom tussen de lagers), of as Ø40 C45 met de nok tegen het lagerhuis. Nieuwe rekenregel "as op buiging".

### P1-06 Slede kan van de rail lichten (FP-01 leg press, FP-02 hack squat)
- **Waar:** `plate.mjs:76-102` (`slede45`) en `plate.mjs:134-145`.
- **Fout:** de slede rijdt met 4 rollenparen bovenop de rails; de wangen geven alleen zijgeleiding. Er zijn geen tegenrollen onder de rail.
- **Handberekening (FP-01):** voetkracht langs de rail = W·sin45°, aangrijpend 373 mm boven het railvlak (midden voetplaat); schijven op t ≈ 360, rollen op t = 70 en 580. Momenten rond de onderste rol: N_boven = 0,707·W·(360 − 70 − 99 + 373)/510 = 0,78·W; N_onder = 0,707·W − 0,78·W = **−0,075·W**. De onderste rollen komen los, ook met de voeten in het midden; met de voeten hoog op de plaat erger. Bij 300 kg is dat ± 260 N lichten.
- **Fix:** tegenrollen onder de rail (rail als koker met rol boven en onder, of U-loopwagen), of lineaire geleiding op ronde assen Ø30 met gesloten lagers. Voetplaat lager zetten (dichter bij het railvlak) verkleint het moment.

### P1-07 Veiligheidsgrendels en eindstoppen bestaan alleen als tekst (FP-01, FP-02, FP-11)
- **Waar:** `plate.mjs:176`, `plate.mjs:223`, `plate.mjs:404` (`b.o.veiligheid = '...'`).
- **Fout:** "veiligheidsgrendels in 6 standen", "veiligheidshendel", "verstelbare eindstoppen op de geleidestangen" staan niet in het model, de stuklijst, de bestellijst of op een tekening.
- **Gevolg leg press:** de slede rust alleen op de onderste stop. Daar is de afstand heup-voetplaat ± 534 mm (heup y 620/z 500, voetplaat y 1022/z 852): je moet met de knieën tegen de borst onder 300-500 kg kruipen en kan niet wegzetten.
- **Fix:** grendels echt modelleren: draaibare hendels naast de zitting met een as en twee pallen die op een getande strip langs de rail vallen; een vaste noodstop ± 150 mm boven de laagste gebruiksstand. Smith: 2 klembare stopringen Ø25 met rubber per geleidestang in de stuklijst.

### P1-08 Smithmachine: de haken raken de pennen niet (FP-11)
- **Waar:** `plate.mjs:384-400`.
- **Gemeten in het model (thuis):** haak y 580-640, x 610-650; haakpennen y 770-820, x 668-693. Er zit 130 mm lucht in y en 18 mm in x. De stang kan nergens opgehangen worden.
- **Ook:** de stang is aan het lagerhuis gelast (las "Lagerhuis + Halterstang smith"), dus hij kan niet draaien om in te haken. De LM25UU (buitenmaat Ø40) wordt "geperst" in buis Ø60,3x3,6 (binnen Ø53,1): past niet. De geleidestang heeft onderaan een plaatje van 8 mm "met M8 dwarsbout" en bovenaan niets.
- **Fix:** stang draaibaar in een lagerblok (stang door 2 glijbussen in een blok dat aan het lineaire huis zit), haken aan de stang gelast, pennenrij op de staander **in het vlak van de haak** (aparte haakstrip naast de geleidestang). Lagerhuis: gedraaide bus Ø40 H7 of buis 48,3x4 uitgedraaid. Geleidestang: klemblokken boven en onder (gedraaid, M8 klembout) of draadeind M12 in de stang.

### P1-09 Belt squat: schijven staan tussen de benen (FP-03)
- **Waar:** `plate.mjs:236-239`.
- **Gemeten:** in de laagste stand staan 4 schijven Ø450 op y 225-675, z 425-875, x ± 132, midden op het platform (y 150-850). De gordelhaak zit op y 520. De gebruiker staat dus met de schijven tussen de dijen op kniehoogte. De haak zit in de laagste stand 492 mm boven het platform en gaat 386 mm omhoog; een squat vraagt ± 500 mm heupweg en een aanhaakpunt rond platformhoogte.
- **Ook:** haak = rond Ø20 met gat Ø12. Netto doorsnede ± 74 mm²; pro-proeflast 4 x 1,5 x 300 x 1,06 x 9,81 = 18,7 kN → 252 N/mm² > 235. Niet berekend.
- **Fix:** hefboom onder of achter het platform met de schijven aan het verre uiteinde buiten het platform (Rogue Rhino, Wenning); gordelpunt in een sleuf in het platform; oog als laserplaat 15 mm met gat Ø20.

### P1-10 Voetplaat van de leg press is niet verstijfd en niet berekend (FP-01)
- **Waar:** `plate.mjs:146`.
- **Fout:** plaat 760 x 600 x 12 die 575 mm uitkraagt boven de sledebalken, alleen aan de kopse kanten gelast.
- **Handberekening (pro):** proeflast langs de rail 4 x 1,5 x 500 x 9,81 x 0,707 = 20,8 kN op 300 mm: M = 6,24 kNm; W = 760 x 12²/6 = 18 240 mm³; σ = **342 N/mm² > 235**. Thuis 128 N/mm² (voldoet, zonder marge voor voeten hoog op de plaat).
- **Fix:** twee ribben achter de plaat (koker 50x30 of plaat 10 x 100) tot op de sledebalken, of plaat op een kader. Rekenregel toevoegen.

### P1-11 Hefboommachines: geen eindaanslagen, as niet in de stuklijst, naaf past niet (FP-03 t/m FP-10, FP-12, FB-12)
- **Waar:** `plate.mjs:38-71` (`hefboom`), `plate.mjs:18-26` (`lagerOren`), `bereken.mjs:128`.
- **Fouten:**
  1. Geen begin- en eindaanslag in het model. De berekening zegt alleen "eindaanslag met rubberbuffer ... nakijken op het toestel" (oranje). Zonder aanslag valt de arm met schijven door tot tegen het frame of de gebruiker.
  2. De as is alleen een `b.pen(...)` zonder `key`: hij staat niet in de stuklijst, het zaagplan of de bestellijst (gecontroleerd op FP-04: geen as in `delen` of `koop`). Zelfde voor de 4 assen Ø20 van de looprollen (FP-01/02).
  3. De draaibus is buis 42,4x3,2 (binnen Ø36) of 48,3x4 (binnen Ø40,3) "met glijlagers erin geperst", maar het lager is Ø28/Ø34 buiten en zit volgens de stuklijst in de lageroren. De as Ø25/30 heeft 5 mm speling in de bus: de verbinding as-hefboom is niet gedefinieerd.
  4. Het flensglijlager GFM-2528-21 is 21 mm lang in een oor van 8/10 mm.
  5. Geen asborging (borgring DIN 471, stelring of eindbout) in `KOOP`.
- **Fix:** as als staaf in het model (h9, C45 of S355), aan de naaf vast via 2 gelaserde eindschijven (gat Ø25 H8, in de bus gelast); lagers in gelaste bossen op de oren (lengte = lagerlengte); stelringen DIN 705 of borgringen; aanslagen als consoles op het frame met rubberbuffer M10, meegenomen in de botstest (stand 0 = op de aanslag).

### P1-12 Kabelcrossover en functional trainer kunnen voorover kantelen onder kabeltrek (FK-03, FK-04)
- **Waar:** `kabel.mjs:16-32` (torenvoet 650 mm diep), `kabel.mjs:143` en `:365` (lastgevallen), `bereken.mjs:149-167`.
- **Fout:** de stabiliteitscontrole kent alleen gewichten (gebruiker + stapel op 10°). De horizontale trek aan de hoge katrol zit er niet in.
- **Handberekening FK-03 thuis:** 350 kg, zwaartepunt ± 350 mm achter de voorste kantelrand: tegenmoment 350 x 9,81 x 0,35 = 1,2 kNm. Trek naar voren aan twee grepen op 1,9 m: 2 x 350 N geeft al 1,33 kNm. AANNAME: een gebruiker van 80 kg kan horizontaal ± 600-800 N zetten. FK-04 (2:1, max 392 N per greep, wagen tot 2,0 m): 1,57 kNm tegen 1,27 kNm.
- **Fix:** torenvoeten 1000-1100 mm (ver naar voren), of vloerverankering verplicht in thuis én pro. Lastgeval "kabeltrek horizontaal op de hoogste katrol" toevoegen aan `stabiliteit()`.

### P1-13 Er is geen lastekening met maten per lasgroep
- **Waar:** `tekeningen.mjs` (6 `maat()`-oproepen in het hele bestand: B, H, D en één hoogte op het overzicht, L op een staaf, l en b op een plaat).
- **Fout:** het overzicht geeft buitenmaten; het lasplan is een isometrie met oranje stippen. Nergens staat op welke maat de staander op de voetbalk komt, waar de schijfhouder zit, onder welke hoek de schoor staat. Een werkplaats kan zagen en boren, maar niet lassen zonder het 3D-model open te hebben.
- **Fix:** per lasgroep (zijframe, hefboom, slede, toren) een samenstellingsblad: 2 aanzichten met positienummers (ISO 6433), plaatsmaten van elk stuk vanaf één referentie, diagonaalmaat voor haaksheid, lassymbool op de plaats van de las, en de eis voor evenwijdigheid van gatenrijen L/R.

### P1-14 Het typeplaatje claimt een norm die niet beproefd is
- **Waar:** typeplaat in `tekeningen.mjs` ("EN ISO 20957-1 en -2 · klasse S"), badge "Voldoet" in de web-app (screenshot 41).
- **Fout:** de klasse en het normnummer op het product zetten is een conformiteitsverklaring. Er is geen proeflast, geen duurproef (12 000 / 100 000 cycli staan in `normen.mjs:30` maar worden nergens gebruikt) en geen risicoanalyse.
- **Advies:** (1) productaansprakelijkheid verzekeren vóór de eerste verkoop; (2) per toestel een proef met de berekende proeflast, foto's en meetrapport bewaren; (3) technisch dossier, handleiding NL/FR en fabrikantgegevens (EU 2023/988 algemene productveiligheid; AANNAME dat dit het kader is voor niet-aangedreven fitnesstoestellen, laat dit nakijken); (4) tot dan op het plaatje "ontworpen volgens" in plaats van een normclaim, en in de app "berekend" in plaats van "voldoet".

---

## 2. P2 - belangrijk

### P2-01 Pec deck: nok R55 geeft bijna geen weerstand (FK-10)
`kabel.mjs:254-263`. Koppel = 84 kg x 9,81 x 0,055 = 45 Nm per arm; kussen op 500 mm: 90 N ≈ **9 kg** bij de volle stapel, en gehalveerd als beide armen aan dezelfde stapel trekken. Stapelweg bij 100° = 96 mm. De rekenregel (`:263`) gebruikt R100 en arm 360, niet de getekende 55 en 500. De tekst zegt "2 kogellagers 6205", de stuklijst 6204 (boring 20), de as is buis Ø48,3. Fix: nok R200-250 (of 2:1 omgekeerd), as Ø30 massief in 2 x 6206 in een lagerhuis dat in het model zit.

### P2-02 Leg extension / curl / kickback: nok R100 is te klein (FK-08, FK-09, FK-12)
`kabel.mjs:385`, `:417`. Volle stapel = 19-24 kg aan de rol (de code rekent zelf `G*100/420`), stapelweg 140 mm bij 80°. Commercieel ± 1:1 aan de enkel. Fix: nok R250-300 of een excentrische nok; hefboom en as daarop herrekenen.

### P2-03 Lat pulldown: twee losse kabels aan één stapel (FK-01)
`kabel.mjs:69-90`. Trek je aan de lat, dan hangt de low-row-kabel 600 mm slap. De ogen zitten ± 60 mm uit het midden (stapel kantelt op de stangen). Slag 600 mm is kort (commercieel ± 900); de stang hangt op 1600 mm terwijl katrol B op 2077 mm zit; de kniesteun staat vast op 130 mm boven de zitting (dij P95 man ± 190 mm). Fix: één kabel met een zwevende katrol op de stapel en stopkogels aan beide uiteinden; slag 850; kniesteun en zitting verstelbaar met een veerpen.

### P2-04 Gewichtstapel: lagers, stangen en massa (alle FK met stapel)
`model.mjs:155-180`. (a) LM25UU en igus RJUM-01-25 zijn Ø40 buiten en 59 mm lang; de bovenplaat is 25 mm met gaten Ø27. (b) De geleidestangen hebben geen bevestiging onder en boven. (c) Stapelplaten lopen staal op staal op gehard Ø25; commercieel zit er een kunststof bus in elke plaat. (d) De kabellast is `n x kg` (80 kg); bovenplaat 6,6 kg + stang en ogen ± 1 kg tellen niet mee. Met 87,6 kg wordt de kabelfactor thuis 0,89 → **0,975** (`bereken.mjs:98-100`). Fix: bovenplaat met gelaste lagerbussen of flenslagers, klemblokken voor de stangen, bussen in `KOOP`, `s.last` gebruiken in de kabelcontrole.

### P2-05 Kabel Ø5 (kern 3 mm) zit op de limiet en de eindverbinding is niet geborgd
`onderdelen.mjs:62-67`. Breukkracht 5,29 kN tegen 6 x 0,86 = 5,16 kN. De bestellijst neemt aluminium persklemmen "4 mm" van de bouwmarkt op een kern van 3 mm; de factor 6 geldt ook voor de bevestiging (`normen.mjs:20`). Fix: overal kabel Ø6 (kern 4, 9,41 kN; meerprijs ± € 0,30/m) en kant-en-klare kabels op lengte met geperste eindstukken van de fitnessleverancier, of een eigen trekproef per persing.

### P2-06 Boutlengtes in de bestellijst kloppen niet
`bouwstenen.mjs:66-75` (`dwarsOp`: 144 mm thuis, ± 184 mm pro), `kabel.mjs:325` (`bovenVerbinding`: 150 mm), `rekken.mjs:306` (legplank: 120 mm). De bestellijst geeft altijd "M12 x 100" of "M16 x 130" (`onderdelen.mjs:105-106`). Door twee kokers van 60 is minstens M12 x 140 nodig, door twee van 80 M16 x 190. Fix: boutlengte per verbinding kiezen (klemlengte + 2 ringen + moer + 2 gangen, afronden naar de handelsmaat) en per lengte een `KOOP`-regel. Voeg afstandsbussen toe in doorgeboute kokers, anders trek je de wanden in.

### P2-07 Kopplaat: bout zit te dicht tegen profiel en las
`bouwstenen.mjs:40` (`off = d0/2 + las + 4`). M12: hart bout 13,5 mm van de kokerwand; ring DIN 125 heeft r = 12 en de las een been van 4,2 mm: de ring ligt op de las, een dop past er niet. M16: 16,5 mm tegen r = 15 + been 5,7. Fix: `off ≥ ringstraal + lasbeen + 3` (M12: 20 mm, M16: 24 mm); kopplaat hoger.

### P2-08 Gatcontrole: correct in wat ze doet, niet volledig
`controle.mjs:128-193`.
- Goed: as bout-gat ≤ 0,5 mm, bout zonder gat, randafstand 1,5·d (strenger dan 1,2·d0), hoekradius 2t, gat in las, dubbel gat, negatieve proef.
- Ontbreekt: (a) steek p1 ≥ 2,2·d0 en p2 ≥ 2,4·d0 (EN 1993-1-8 tabel 3.3); er wordt alleen een brug van 6 mm geëist. Westside Ø17 op 25 mm (brug 8 mm) is gangbaar in de sector maar valt buiten Eurocode: benoem het als AANNAME en reken de staander met netto doorsnede (nu bruto; −15 % thuis, −17 % pro). (b) boutlengte tegen klemlengte (zie P2-06). (c) ruimte voor ring, moer en sleutel (zie P2-07). (d) gaten in gebogen of gezette delen. (e) M16 krijgt Ø17 (ISO 273 fijn); EN 1090-2 normaal is Ø18. Met lastoleranties van ± 1 mm klemt Ø13/Ø17: neem Ø14 en Ø18.
- De 3D-test (`qaFitness.test.ts:166`) telt alleen of het aantal schijfjes klopt, niet of ze op de juiste plaats zitten of zichtbaar zijn.

### P2-09 Stukbladen: gaten zijn niet volledig gemaatvoerd
`tekeningen.mjs:96-163`. Ordinaatmaten vanaf uiteinde A en een boortabel zijn er (goed). Ontbreekt: (a) de dwarspositie van het gat (hart vlak staat nergens als maat of noot); (b) Ø bij het gat in het aanzicht (alleen in de tabel); (c) positietolerantie: ISO 2768-m geeft ± 1,2 tot ± 2 mm op 2220 mm, terwijl J-hooks L/R en de twee pennen van één safety binnen ± 0,3 mm moeten liggen; zet "gatenrij ± 0,3 onderling, boren met boormal, staanders per paar samen boren"; (d) passing voor lagerzittingen (Ø28/Ø34 H7) en assen (h9); (e) bij verstek: lange en korte zijde en de richting van de snede ten opzichte van de gaten; (f) "vorm: driehoek / kam (DXF uit de tekening)" zonder DXF of contourmaten; (g) schaal staat op "-" terwijl het aanzicht op schaal getekend is (ISO 5455).

### P2-10 Pennen en bouten: rekenregels te smal
`bereken.mjs:82-96`. (a) `extrinsiekPen` valt in de standaard 2,5 x zonder de dynamische 1,5 (regel 82). (b) Pennen met `F: 0` worden overgeslagen (regel 85): scharnierpennen FR-04, assen van de looprollen. (c) Penbuiging (EN 1993-1-8 tabel 3.10, M_Rd = 1,5·W·fy) ontbreekt; bij enkelsnedige pennen is dat maatgevend. (d) Stuik met vaste wand 3 mm (regel 89), ook voor platen van 8-10 mm. (e) Bouten alleen op afschuiving en alleen waar `F` is gezet; trek en de combinatie ontbreken. (f) Verwisselbare pennen: gebruiksgrens 0,6·t·d·fy ontbreekt.

### P2-11 Verankering in de muur
`bereken.mjs:132-138`. N_Rd = 7,6 kN geldt voor een keilbout M12 in beton. In Belgische snelbouw of holle baksteen is een keilbout niet toegelaten; een injectieanker met zeefhuls haalt ± 1-2 kN (AANNAME, per ETA nakijken). FR-06 vraagt al 1,28 kN per anker. FR-04 en FK-05 zijn "muur" zonder `o.anker`: geen berekening. Fix: ankerkeuze per ondergrond (beton / volle steen / holle steen) op het montageblad, met de trekkracht per anker.

### P2-12 Vermoeiing niet getoetst
`normen.mjs:30` (`duur`) wordt niet gebruikt. Schatting voor de zwaarst belaste hoeklas (hefboomvoet, benut 0,76-0,82 bij proeflast): spanningswissel bij gebruik ± 30-40 N/mm²; detailcategorie 36 (EN 1993-1-9) laat bij 10⁵ cycli ± 98 N/mm² toe, bij 2·10⁶ cycli 36 N/mm². De norm-duurproef haalt het; tien jaar sportschool zit op de grens. Fix: pro-hefbomen met doorgelaste voet of schetsplaten; rekenregel toevoegen.

### P2-13 Iso-laterale machines: weerstand en verstelling (FP-04, FP-05, FP-08, FP-09)
`plate.mjs:447-450`. Chest press: de schijven hangen 150 mm naast de as bij de start en 432 mm aan het einde, greep op 958 mm: 16 % → 45 % van het schijfgewicht. Met 125 kg per arm voel je 20 → 56 kg. De greep staat op 1050 mm bij een zitting op 450 mm (schouderhoogte in plaats van midden borst) en geen enkele zitting is verstelbaar. Fix: schijfhouder verder van de as (startarm ± 350 mm), zitting op een telescooppaal met veerpen (bestaat al als `pin25`).

### P2-14 Leg press: rugleuning draagt de volle duwkracht en zit niet in de berekening (FP-01)
`plate.mjs:158-169`. De reactie op de voetkracht staat bijna loodrecht op de rugleuning (cos = 0,997). Proeflast pro ± 20,8 kN op de rugleuningbalk 60x40x3: ± 195 N/mm² (voldoet krap, AANNAME lastpunt op 350 mm). Rugsteun, stoelpaal en hun lassen zijn niet gerekend. De tekst belooft een "verstelbare rugleuning" (`plate.mjs:109`); het model heeft een vaste.

### P2-15 Knelpunten en afscherming worden niet gemeten
`bereken.mjs:124-128`. Het model kent de geometrie in 5 standen, maar de controle "hefboom of slede tegen het frame" is een vaste oranje tekst. Meet per stand de kleinste afstand bewegend-vast en toets op < 9,5 / 25-60 mm (`NORM.knelVrij`). De stapelkap is voor en achter dicht en opzij open; `normen.mjs:24` vraagt voor klasse S volledige omkasting aan de gebruikerszijde (AANNAME uit de 2005-tekst).

### P2-16 Bestellijst: wat ontbreekt om het toestel af te bouwen
Niet in `KOOP` of het model: assen van hefbomen en looprollen (P1-11), borg- en stelringen, afstandsbussen, veiligheidsclips of borgveren voor pennen, draadplaat of lasmoer M10 voor de stelvoeten (de voet heeft nu niets om in te draaien), klemblokken geleidestangen, bussen in stapelplaten, stapelstickers (kg), kabelgeleiders, rubber handvatten of griptape, antislip op voetplaten, traanplaat als materiaal (staat als gewone plaat), klinknagels en typeplaat, waarschuwingsstickers, smeermiddel, verpakking (pallet, hoekbeschermers, folie), handleiding, montagegereedschap. Poedercoat: maskeerdoppen voor boringen en lagerzittingen.

### P2-17 Kostprijs en marktband
`werkwijze.mjs:6-22`, `prijzen.mjs:10-15`.
- **Uren te laag.** 0,045 u (2,7 min) per lasverbinding voor passen, heften en haaksheid; een leg press met 73 verbindingen in 17 u, een functional trainer in 18-20 u. Voor een eerste reeks zonder lasmallen reken ik 2 tot 3 x. Zet een leercurve in de instellingen (stuk 1, stuk 5, stuk 20).
- **Geen overhead.** Lakkerij-minimum per rit (± € 75-150, AANNAME), transport heen en terug, verpakking, levering en plaatsing, handleiding, garantie, verzekering, afschrijving van mallen en gereedschap, inkoopuren.
- **Uurloon € 45** is laag voor een zelfstandige in België (gangbaar € 50-65 excl. btw, AANNAME).
- **Thuis, eenvoudig:** blijft ver boven import, ook met deze optimistische uren: FR-11 € 622 (band 70-150), FR-12 € 438 (70-140), FR-13 € 1099 (220-370), FR-06 € 439 (50-250), FB-10 € 614 (110-240), FR-01 € 1601 (300-1460). Niet mee concurreren: schrappen of alleen als maatwerk.
- **Pro plate-loaded:** € 1500-3300 tegen merkprijzen € 2300-8300. De band is die van gecertificeerde merken met garantie en restwaarde; reken op 50-65 % van de merkprijs (AANNAME). Hier zit de marge, mits P1 is opgelost.
- De test "in de marktband of met een melding" (`qaFitness.test.ts:113`) keurt alles goed.

### P2-18 Web: de badge belooft te veel
Screenshot 41: "Voldoet, met 1 punt om na te kijken" naast een prijs. Voor een klant leest dat als gekeurd. Zie P1-14. Maak een klantweergave zonder kostprijs, marge en werkplaats, en een werkplaatsweergave met de open punten per toestel.

---

## 3. P3 - afwerking

- **P3-01 Doorsnedewaarden zonder hoekradius** (`onderdelen.mjs:12`): A, I en W 5-6 % te hoog (60x60x3: 6,84 cm² / 12,4 cm³ tegen ± 6,6 / 11,7 in de EN 10219-tabel). Neem tabelwaarden. Las a3 wordt afgedwongen op wand 2 mm (`model.mjs:237`): reken met min(a, t).
- **P3-02 Optrekstang massief Ø35 S235** (`onderdelen.mjs:40,47`): dik voor de hand en 7,6 kg/m. Rond Ø30 S355 haalt 0,88.
- **P3-03 Gaten in 3D** (`detail.mjs:14-21`, `scene3d.mjs:56,86`): zwarte schijf van 1,4 mm op het vlak, 14-hoek. Duidelijk zichtbaar op de screenshots 20 en 21, dus de vraag "duidelijk zichtbaar" is gehaald. Het is geen boring: je kijkt er niet door, een pen steekt er niet zichtbaar in, en van dichtbij zie je de veelhoek. Echte boring: korte donkere cilinder naar binnen met een ring, of CSG op de staanders in de detailweergave; 24 segmenten.
- **P3-04 Lassymbolen** (`tekeningen.mjs:170-205`): alles is "hoeklas rondom". Bij kokers van gelijke breedte zijn twee van de vier zijden een las in de hoekradius (halve V / flare), geen hoeklas. Voeg lasvolgorde, hechtplaatsen en "lasser EN ISO 9606-1" toe.
- **P3-05 Titelblok ISO 7200** (`blad.mjs:11-24`): velden "getekend door", "goedgekeurd door" en "documentsoort" ontbreken; materiaal en oppervlak staan niet in het blok van het stukblad.
- **P3-06 Looprol = kaal kogellager 6204 op kokerwand** (`plate.mjs:92-98`): Hertz ± 260-380 N/mm², de lak slijt weg, lawaai. Neem rollen met PU-band of een slijtstrip.
- **P3-07 Katrol D/d** (`bereken.mjs:108-109`): rekent met buitendiameter 115 en manteldiameter 5; juist is loopdiameter en kerndiameter. Uitkomst blijft goed.
- **P3-08 Tekst en model lopen uiteen:** FP-01 "verstelbare rugleuning", FK-10 "6205", FB-02 "FID" (AANNAME: geen decline-stand en geen verstelbare zitting; niet zelf nagekeken in `banken.mjs`).

---

## 4. Steekproef sterkte: eigen handberekening

| Toestel | Controle | Code | Hand | Oordeel |
|---|---|---|---|---|
| FR-01 thuis | Safety, ligger 60x60x3, L 1040, F = 4·150·9,81 = 5,89 kN | 123,6 N/mm², 0,526 | M = 1,53 kNm, W = 12 380 → 123,6 | klopt (met tabel-W 11,7: 131, 0,56) |
| FR-01 thuis | Staander met J-hook, e 75, Lcr 2580 | 0,234 | λ̄ = 1,18, χ = 0,444; 0,083 + 0,152 = 0,234 | klopt, bruto doorsnede (P2-08) |
| FR-01 thuis | Optrekstang Ø35, 2,5·120 kg | 195,8, 0,833 | M = 0,824 kNm, W = 4209 → 195,8 | klopt |
| FR-01 thuis | Pen J-hook Ø16 enkelsnedig | 0,169 / stuik 0,348 | 34,7 kN / 16,9 kN | klopt, maar evenwicht ontbreekt (P1-01) |
| FB-02 thuis | Ligger 80x40x3, L 1060, F = (120 + 1,5·80)·2,5·9,81 = 5,89 kN | 111,7, 0,475 | M = 1,56 kNm, W = 13 963 → 111,7 | klopt; ladder, steunbeugel en scharnieroor niet gerekend |
| FK-08 thuis | As hefboom Ø25 | afschuiving 0,03 | buiging 504 N/mm² bij proeflast | **faalt** (P1-05) |
| FK-08 thuis | Kabel Ø5, factor 6 | 0,89 (80 kg) | 0,975 (87,6 kg) | krap (P2-04, P2-05) |
| FP-01 pro | Rail 120x60x4, L 1500, F = 4·1,5·280·9,81 = 16,5 kN | 145,3, 0,618 | M = 6,18 kNm → 145 | klopt |
| FP-01 pro | Sledebalk 60x60x3, L 510 | 181,9, 0,774 | M = 2,25 kNm / 12 380 → 182 | klopt |
| FP-01 pro | Voetplaat 12 mm | niet gerekend | 342 N/mm² | **faalt** (P1-10) |
| FP-01 | Evenwicht slede | niet gerekend | N_onder = −0,075·W | **licht** (P1-06) |

Conclusie: wat de code rekent, rekent ze juist (formules, proeflasten en lasdoorsnede kloppen op mijn narekening). De fouten zitten in wat niet gerekend wordt: evenwicht van losse delen, assen op buiging, platen, en horizontale krachten.

---

## 5. Wat de tests niet vangen

1. **Functie:** kan de haak in de pen, kan de safety erin, blijft de kabel strak bij verstellen, blijft de slede op de rail. Alle P1-punten 1-9 passeren groen.
2. **Krachtsverhouding:** geen test op kracht aan de greep tegenover last (pec deck 9 kg), geen test op slag tegenover lichaamsmaten.
3. **Volledigheid van de berekening:** de test eist "minstens 1 sterktecontrole en 1 stabiliteitscontrole", niet dat elk dragend deel en elke pen een regel heeft. Pennen met `F: 0` verdwijnen stil.
4. **Oranje is groen:** 60 van de 100 varianten staan op oranje door een vaste tekst; de test laat dat door.
5. **Tekst zonder model:** `o.veiligheid`, `opm` en `uitleg` beloven onderdelen die niet bestaan. Test: elk zelfstandig naamwoord uit `o.veiligheid` moet een deel of kooponderdeel hebben.
6. **Stuklijst tegen verbindingen:** elke `pen` zonder `key` moet een staaf zijn; boutlengte ≥ klemlengte.
7. **Passingen van kooponderdelen:** buitenmaat lager tegen het gat waar het in moet (LM25UU, GFM, 6204).
8. **Stabiliteit onder kabel- en duwkrachten**, niet alleen gewichten.
9. **Tekeningen:** de test kijkt of de SVG geldig is, niet of elk gat een maat en elk stuk een plaats heeft.

---

## 6. Web en presentatie

Goed: catalogus met miniaturen, filter op soort, prijs en vloer, thuis/pro naast elkaar, kleurkeuze, marktband zichtbaar. De miniaturen zijn herkenbaar.
Verbeteren: klant- en werkplaatsweergave scheiden (P2-18); badge en typeplaat (P1-14); per toestel een lijst "open punten" uit dit rapport tot ze dicht zijn; offerte-export met levertermijn en voorwaarden; bij wandtoestellen de eis voor de ondergrond tonen.

---

## 7. Volgorde van aanpak

1. Rekken: J-cup, safety en spotter als U-beugel met doorgaande pen (P1-01/02/03). Dit zijn de eenvoudigste toestellen en ze worden het eerst verkocht.
2. Hefboom-bouwsteen: as, naaf, lagerbossen, borging, aanslagen (P1-11). Lost 10 toestellen tegelijk op.
3. Slede-bouwsteen met tegenrollen en echte grendels (P1-06/07/10).
4. Kabel: stapel-bouwsteen (P2-04), lus voor de trainer (P1-04), tweezijdige as (P1-05), nokken (P2-01/02), diepe voeten (P1-12).
5. Smith en belt squat opnieuw ontwerpen (P1-08/09) of uit de catalogus halen.
6. Lassamenstellingsbladen (P1-13) en maatvoering (P2-09).
7. Eén prototype per bouwsteen bouwen, proeflast erop, uren klokken, dan pas prijzen vastleggen (P2-17) en het typeplaatje invullen (P1-14).
