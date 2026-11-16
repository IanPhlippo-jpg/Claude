# Advies Fable 5.2 - fitnesscatalogus v5 (150 toestellen, thuis / semi-pro / pro)

Onafhankelijke review van commit 4c8410f, 2026-11-16. Niets gewijzigd behalve dit bestand.

## 0. Oordeel in het kort

De 40 punten van de vorige ronde zijn in de oude 50 toestellen zichtbaar verwerkt. De nieuwe 100 zijn geometrisch net zo proper (geen botsing, niets zweeft, geen rode controle in 586 extra varianten die ik zelf bouwde). Maar hetzelfde patroon als vorige keer komt terug: **de tests bewijzen dat het model sluit, niet dat het toestel werkt.**

- **FS (selectorized)** is de zwakste reeks. Bij 8 van de 12 nokmachines draait de nok de verkeerde kant op (de kabel wordt slap), de stapel is veel te licht aan de greep (31-65 % van 100 kg, lat pulldown 50 kg) en het model tilt de stapel 600 mm terwijl de nok maar 52-262 mm kabel opwikkelt. Niet bouwen voor dit is opgelost.
- **FM (rigs)** is de sterkste reeks en het dichtst bij verkoopbaar. Eén echt gat: het dipstation.
- **FO (opslag)** is technisch eenvoudig en veilig, maar de DXF van alle gezette delen is fout en de prijs is 3 tot 9 keer de markt.
- **FX**: drie strongman-werktuigen zijn fout ontworpen (laadpaal niet te laden, log 101 kg leeg, stenenplatform te licht). Buiten: de paal zit maar 200 mm in het beton, er is geen funderingsplan en geen ontluchting voor het verzinken.
- **Prijs**: 249 van 300 boven de markt, semi-pro 92 van 100 buiten de band. Dat los je niet op met rekenen, wel met kiezen: een klein gamma, geen thuislijn in machines, opslag vereenvoudigen.

Aantal bevindingen: **P1 = 12, P2 = 27, P3 = 11** (totaal 50).

Wat ik deed: `selectorized.mjs`, `rigs.mjs`, `opslag.mjs`, `buiten.mjs`, `pro.mjs`, `vorm.mjs`, `opties.mjs`, `bereken.mjs`, `prijzen.mjs`, `dxf.mjs`, `blad.mjs`, `catalogus.mjs`, `werkwijze.mjs` volledig gelezen, `model.mjs`, `tekeningen.mjs`, `onderdelen.mjs`, `kabel.mjs` en de test deels. Eigen scripts: alle 300 prijzen en oordelen, de kabellengte per stand, en 586 varianten van de nieuwe reeksen (semi + compact/XL in elke uitvoering, alle opties tegelijk). De fotorasters van FS, FM, FO, FX en het overzicht v5a3 bekeken. Snelle test zelf gedraaid: 734/734 groen (33 s). Volledige test (FITNESS_VOLLEDIG=1, één keer): 4280/4280 groen (147 s). Twee normpunten van EN 16630 opgezocht (alleen samenvattingen van fabrikanten gevonden, dus AANNAME).

Regelnummers verwijzen naar `bibliotheek/fitness/`.

---

## 1. P1 - onveilig of werkt niet zoals getekend

### P1-01 FS-01, 02, 04, 05, 07, 08, 12, 23: de nok draait de verkeerde kant op
- **Waar:** `selectorized.mjs:29` (rot), `:50` (vloerkatrol op `yk + Rn + r`), `:63` (kabel naar `rot([xl, yk + Rn, zk])`).
- **Fout:** de kabel komt altijd van onder aan de +y-kant van de trommel. Bij een negatieve `hoek` gaat dat punt naar beneden, naar de vloerkatrol toe: de kabel wordt slap, de stapel zakt in plaats van te stijgen. Gemeten in het model, FS-01: het eindpunt gaat van z = 1480 naar 1351 mm (129 mm omlaag) terwijl de stapel 600 mm stijgt.
- **Waarom:** een trommel wikkelt alleen op als het oppervlak aan de raakkant van de katrol weg beweegt.
- **Fix:** bij `hoek < 0` de vloerkatrol en de kabelgoot spiegelen naar `yk - Rn - r`, of de kabel over de bovenkant van de trommel leggen met het anker aan de andere kant. De nokkap en de kabelgoot (`:56-59`) volgen. Test: het eindpunt van de kabel moet in stand 1 verder van de laatste katrol liggen dan in stand 0 (zie P2-22).

### P1-02 FS (alle 25): de stapel voelt veel te licht
- **Waar:** `selectorized.mjs:17` (`Rn = 200`), `:48` (toets is alleen "info"), `:93` (`overbrenging: 2`), `onderdelen.mjs:50/61/68` (stapel 16/18/20 x 5 kg).
- **Fout:** kracht aan de greep = stapel x R/L. Pro, stapel 100 kg:

| Toestel | arm L | aan de greep | nodig voor pro (AANNAME, merktoestellen) |
|---|--:|--:|--:|
| FS-01 chest press | 650 | 31 kg | 100-135 kg |
| FS-07 incline | 591 | 34 kg | 90-120 kg |
| FS-09 seated dip | 497 | 40 kg | 100-135 kg |
| FS-11 standing calf | 380 | 53 kg | 150-200 kg |
| FS-23 leg extension | 306 | 65 kg | 90-130 kg |
| FS-13 lat pulldown (2:1) | - | 50 kg | 100-135 kg |

  Thuis (80 kg) nog 20 % minder. Een sterke klant is na een week uitgetraind.
- **Fix:** (a) de kabel niet op een trommel R200 maar op de hefboomarm zelf, op 0,7-1,0 x L, of een nok R ≈ 0,8 x L; (b) FS-13..22 en 25 op 1:1 met een vaste bovenkatrol (alleen de lage katrol 2:1 als dat gewenst is); (c) pro-stapel 30 x 5 = 150 kg (XL 180 kg), calf 200 kg; (d) de toets "Krachtsverhouding" een oordeel geven: rood onder 60 % voor druk- en beentoestellen. As, lagerpaal, kabel (factor 6: 9,41 kN / 6 = 160 kg per streng) en katrol (3 kN: bij 150 kg en 180° omslag 2,9 kN, op de grens) opnieuw rekenen.

### P1-03 FS-01..12, 23, 24: de stapelweg in het model klopt niet met de nok
- **Waar:** `selectorized.mjs:63` (`slag: T.s.slag` = 600), `:48` (R·θ).
- **Fout:** het model tilt de stapel 600 mm; de nok wikkelt maar R·θ op: FS-11 52 mm, FS-10 70 mm, FS-02 122 mm, FS-01 140 mm, FS-03 262 mm. De kabellengte verandert dus tussen stand 0 en 1 (FS-01: 4994 → 4264 mm; FS-03: 4413 → 4010 mm): geen gesloten kabelloop. De kabellengte op de bestellijst, de afschermingshoogte en de knelmeting rekenen met de verkeerde stand. Daarnaast is de greepweg bij twee toestellen te kort: FS-02 schouderpers 319 mm x 35° = 195 mm (nodig ± 400-450), FS-09 dip 497 x 30° = 260 mm.
- **Fix:** stapelstand = R·θ·stand (één bron), FS-02 arm ≥ 600 mm of hoek ≥ 60°, FS-09 hoek ≥ 45°. Test: |L(stand 1) − L(stand 0)| ≤ 2 mm voor elke kabel die op "nok" eindigt.

### P1-04 FS (nokmachines): het lagerhuis kan niet gemaakt worden
- **Waar:** `selectorized.mjs:26`.
- **Fout:** buis Ø60,3 x 8 heeft een binnendiameter van 44,3 mm. "Uitgedraaid Ø44 H7" is dus onmogelijk: het gat is al te groot en ruw, het flensglijlager GFM-4044-30 zit los.
- **Fix:** dikwandige buis Ø63,5 x 12,5 of Ø60 x 10 (E355, EN 10297-1) en uitdraaien tot Ø44 H7, of een gedraaide bus uit rond Ø65. Op het stukblad de passing en de ruwheid Ra 1,6 zetten.

### P1-05 FM-09, 11, 17, 21, 22: dipgrepen te zwak en de klem is niet ontworpen
- **Waar:** `rigs.mjs:71-78`; geen `b.reken`, geen belastinggeval "dip" (`:81`).
- **Fout:** greep buis Ø32 x 3,2 (W = 1899 mm³), 460 mm uitkragend. Handberekening in §4.2: 291 N/mm² met de hand op 300 mm (benut 1,24), 445 N/mm² aan het einde. De dipbeugel zit met "2 x M16 door de Westside-gaten" op een liggende koker van 60 mm hoog: twee bouten boven elkaar op 50 mm passen daar niet in, en met één bout draait de beugel.
- **Fix:** greep Ø42,4 x 4 (W = 4241 mm³ → 130 N/mm²) of Ø38 massief, licht naar buiten wijkend; een staande rugplaat 8 x 80 x 250 met twee pennen Ø25 op 150 mm (penkracht 1,36 kNm / 0,15 m = 9 kN, stuik 35 kN per wand: goed) en een U-zadel om de staander. `b.reken('Dipgreep', ..., 'uitkrager')` en `b.last('Gebruiker in de dip', ..., { geval: 'dip' })` toevoegen: bij FM-21 thuis hangt de gebruiker 200 mm vóór de voorste voetrand.

### P1-06 FX-04 laadpaal: er kan geen schijf op
- **Waar:** `buiten.mjs:134-136`.
- **Fout:** de greepbeugel (80 breed) en de grepen (300 breed) zijn op de top van de laadpen gelast, de basisplaat onderaan ook. Een schijf met gat Ø50 kan er nergens over.
- **Fix:** greep afneembaar: een T-greep met een pen Ø25 in de top van de laadpen en een borgclip, of een oog bovenaan voor een karabijn met losse greep (zo doen de merken het).

### P1-07 FX-09 log: 101 kg leeg
- **Waar:** `buiten.mjs:105-108`, maxLast thuis 100 kg (`:285`).
- **Fout:** buis Ø273 x 6,3 weegt 41,4 kg/m; 2 m + kopplaten + pennen = 101 kg (model). De thuisversie is leeg al boven haar eigen maximale last; een trainingslog weegt leeg 30-60 kg (AANNAME, merklogs).
- **Fix:** romp 1200 mm in Ø273 x 4 (26,5 kg/m → 32 kg) of gewalste plaat 3 mm; pennen 400 mm; totaal ≈ 45 kg. Thuis een "10 inch" log Ø219 x 3. Test: massa ≤ 0,5 x maxLast voor losse werktuigen.

### P1-08 FX-11 stenenplatform: te licht en te dun
- **Waar:** `buiten.mjs:287` (hergebruik van `plyobox`, `opslag.mjs:137-155`).
- **Fout:** doos 800 x 800 x 1150 uit 2 mm mantel en 3 mm deksel, 82 kg. Een atlas stone van 150 kg wordt erop gegooid en over de rand gerold. Kantelen: 0,3 x 150 kg x g x 1,15 m = 507 Nm tegen 82 x g x 0,4 + 150 x g x 0,1 = 469 Nm: kantelt. Het deksel van 3 mm deukt onder een steen (zie §4.3 voor dezelfde som bij de plyobox). De berekening rekent met "gebruiker x 2", niet met een steen.
- **Fix:** eigen bouwer: frame koker 80 x 80 x 4, deksel 8 mm met rubbermat 20 mm, voetafdruk 1000 x 1000, ≥ 150 kg of vloerankers, belastinggeval "steen 200 kg op 100 mm van de rand + 30 % horizontaal".

### P1-09 FX-12..25 (buiten): de paal zit maar 200 mm in het beton, geen funderingsplan
- **Waar:** `buiten.mjs:144-145` (paal tot z = −500, poer van −900 tot −300), `:208-209` (bankboog tot −450); tekst zegt "500 mm ingegoten". `tekeningen.mjs` en `montage.mjs` kennen geen poer.
- **Fout:** model en tekst spreken elkaar tegen. 200 mm inklemming werkt los bij zwaaien. De bovenste 300 mm staal zit in de grond zonder beton (corrosie op de grondlijn). En er is geen blad met de hartmaten van de poeren, het peil, de inbeddiepte en de uithardingstijd: zo kan niemand het plaatsen.
- **Fix:** paal 600 mm in een poer 500 x 500 x 800, of een ingegoten ankerkorf met voetplaat en 4 x M16 (dan kan het toestel in de werkplaats af en is het vervangbaar). Bovenkant poer afwaterend; diepte onder het oppervlak volgens EN 1176-1 §4.2.14 (AANNAME dat EN 16630 hiernaar verwijst: 400 mm, of 200 mm met een afgeronde kop). Nieuw blad "Funderingsplan" (A3, schaal 1:20/1:50) met valruimte.

### P1-10 FX-12..25: thermisch verzinken van gesloten buizen zonder ontluchting
- **Waar:** `buiten.mjs:144` ("kopkap gelast"), `:152` ("rondom gelast"), `:192`; geen woord over ontluchten in `werkwijze.mjs`.
- **Fout:** een dicht gelaste holle ruimte kan in het zinkbad (450 °C) openbarsten. Elke verzinkerij weigert dit of boort zelf gaten waar jij ze niet wilt.
- **Waarom:** EN ISO 1461 en EN ISO 14713-2 (ontluchtings- en afvloeigaten).
- **Fix:** per holle ruimte 2 gaten (Ø10-12 bij Ø76-89, diagonaal, zo dicht mogelijk bij de uiteinden), op het stukblad getekend; de kopkap na het verzinken als kunststof of aluminium dop, of een gelaste kap met gat. Sporten die door de paal steken: een gat in de paal binnen de sport. Afspreken met de verzinkerij vóór de eerste reeks.

### P1-11 FO-01..08, 16, 17, 19..21, FX-11, FS/FK-kappen: de DXF van gezette delen is geen uitslag
- **Waar:** `opslag.mjs:71-76` (V-goot = twee losse flanken), `:83-84` (bak = bodem + 2 losse randen), `:145-146` (mantel = 4 losse vlakken zonder de zettingen R30), `selectorized.mjs:58` (nokkap vlak), `pro.mjs:81-83` (venster en sleuf alleen in de 3D en de opmerking); `dxf.mjs:48-53` schrijft wat in het model zit.
- **Fout:** de lasersnijder krijgt per "gezette plaat" losse vlakke stukken zonder zetlijn en zonder buigtoeslag. Wie die bestelt, krijgt de verkeerde stukken. De stapelkap wordt een dichte rechthoek zonder venster en sleuf.
- **Fix:** één deel per gezette plaat met `uitslag: { contour, zetlijnen: [{ lijn, hoek, R, richting }] }` (K-factor 0,33-0,45 volgens de zetterij), DXF met laag `ZETLIJN`, en een zetblad per positie (hoek, binnenradius, volgorde). Uitsparingen van de stapelkap in de contour. Tot dan: DXF van deze posities niet aanbieden.

### P1-12 FO-16, FO-17 plyobox: deukt en kantelt bij een randlanding
- **Waar:** `opslag.mjs:138-153`.
- **Fout:** deksel 3 mm met één ribbe, rechte wanden, 30 kg. Handberekening in §4.3: het deksel vloeit plaatselijk onder een landing; bij een landing op 50 mm van de rand met 30 % horizontale kracht is het kantelmoment 294 Nm tegen 172 Nm tegenmoment. De controle "Kantelen op 10°" (benut 0,88) kent geen sprong.
- **Fix:** taps (onderaan 100 mm breder per zijde, zoals de stalen boxen van de merken), deksel 4 mm met kruisribben of 3 ribben, rubber rand; belastinggeval "landing op de rand, 2 x gebruiker, 30 % horizontaal".

---

## 2. P2 - belangrijk

### Mechanica en veiligheid

**P2-01 FS (nok): hefboomarm op een as Ø40 zonder naaf, torsie niet gerekend.** `selectorized.mjs:33`, `:46`. Een koker 60 x 60 stomp tegen een ronde as Ø40 geeft een lijncontact; `bereken.mjs:42-46` rekent een las rondom het volle profiel. Torsie in de as (proef 3,68 kN x 0,2 m = 736 Nm → τ = 59 N/mm², samen met de buiging 147 N/mm²) ontbreekt. Fix: naafbus Ø60 x 10 op de as, de arm in een uitsparing rond de bus; toets "as: buiging + torsie" en "las nok op as" (73 N/mm² bij a4, goed).

**P2-02 FS: zitting niet verstelbaar, geen bereikinstelling, geen eindaanslag.** `selectorized.mjs:104`, `:133-182` (`verstel` alleen bij FS-13). Elk pro-toestel heeft een zitting op een gasveer of veerpen en een startstand in stappen. Zonder dat passen ze maar voor één lengte. Fix: `verstel: true` overal, een instelschijf met veerpen tussen nok en arm, rubber aanslagen aan begin en einde (zoals P1-11 van de vorige ronde bij de hefbomen).

**P2-03 FS-23 leg extension: rol op 306 mm van de as.** `selectorized.mjs:179` (`naar: [-60, -300]`). De scheenrol hoort net boven de enkel, ± 380-420 mm onder de knieas. Fix: arm verstelbaar 340-440 mm.

**P2-04 FS-13..22, 25: elf bijna dezelfde toestellen.** `selectorized.mjs:167-183`. Zelfde toren, zelfde arm, alleen een ander kussen. Dat is geen gamma maar één toestel met opties. Fix: terug naar 3 (lat/row, pushdown/crunch-kolom, verstelbare katrol); de rest als "station-optie".

**P2-05 FM (vrijstaand, thuis): kipping en ringen zonder verankering.** `rigs.mjs:46`, `:81`, `:94-96` (oefening "kipping"). Alleen de statische 10°-proef. FM-01 thuis (126 kg, zwaartepunt 777 mm van de voorrand, stang op 2,23 m): een horizontale kracht van 0,5 x 120 kg x g = 590 N geeft 1313 Nm tegen 960 + 235 = 1195 Nm: kantelt. AANNAME: 0,5 g bij kippen; bij 0,25 g houdt hij. Fix: `o.trek`-geval "zwaaien 0,5 x gebruiker op stanghoogte" voor elk rig; thuis: ankers meeleveren en "kipping alleen verankerd" op het typeplaatje, of de voet 300 mm langer.

**P2-06 FM-07, 12, 22: sporten van de monkey bars gelast aan de optrekstang.** `rigs.mjs:57`. Een ronde sport Ø35 tegen een ronde stang Ø35 die zelf gebout is: slechte las (punt-contact) en de optrekstang draagt ineens alle sporten. Fix: eigen ladder uit 2 kokers 60 x 60 met doorgestoken sporten, met kopplaten tussen de staanders gebout.

**P2-07 FM-08, 10..12, 17, 19, 20: ophangbalk van de ringen niet berekend.** `rigs.mjs:64`. Geen `b.reken`, en "rechts gelast, links gebout" kan niet (een balk tussen twee gelaste zijframes moet aan beide kanten gebout). Fix: kopplaten 2 x M16 aan beide kanten; ligger met 2 x gebruiker x 2,5 (schommelen op ringen).

**P2-08 FX-01, 02 juk: laadpennen te kort, vaste hoogte, rubbervoeten.** `buiten.mjs:32-46`. Pen 300 mm = 6 stalen schijven van 25 kg = 150 kg per kant; met het frame (73 kg) 373 kg, minder dan de opgegeven 450 kg; met bumpers nog de helft. Een juk met vaste jukbalk op 1,5 m past voor één lengte. Stelvoetjes van rubber overleven het neerzetten en slepen niet. Geen schetsplaten staander-voet (wringen bij het lopen). Fix: pen 450 mm of 2 pennen per kant; jukbalk verstelbaar met 2 pennen Ø25 in gaten om de 50 mm; stalen sleepstrips; schetsplaten 8 mm.

**P2-09 FX-07 slee: duwpaal gerekend op een halve gebruiker.** `buiten.mjs:98`. De duwkracht volgt uit de wrijving: 0,5 x (250 + 64) kg x g = 1,54 kN (μ = 0,5 op kunstgras, AANNAME), x 2,5 = 3,85 kN → 338 N/mm² in koker 60 x 60 x 3 (model: 161 N/mm² bij 1,84 kN). Fix: `g: μ·(G + massa)`, duwpalen 60 x 60 x 4 of schoor, en uitneembaar (transport). Glijders: slijtstrip UHMW of Hardox als eigen onderdeel in de stuklijst; bodemplaat 10 mm (37 kg) kan 5 mm met 2 ribben.

**P2-10 FX-03, 05, 06: grepen en maten.** `buiten.mjs:61-62` (vrije greeplengte 150 mm tussen de platen: krap met krijt, neem 180), `:72` (frame 660 breed, binnen ± 580: neem 720), `:58` rubbervoet onder een farmers-handvat dat valt: stalen voetplaat.

**P2-11 FX (buiten): valhoogte bij optrekstang en monkey bars.** `buiten.mjs:256`. De aftrek van 1 m armlengte geldt volgens de samenvatting van tolymp.de alleen "als het geen klimzone is". Op een optrekstang op 2,3 m doen mensen muscle-ups en zitten ze op de stang. AANNAME: een keurder rekent dan Y = 2,3 m; dan is X = 2/3·2,3 + 0,5 = 2,03 m (model 1,50 m) en volstaat de valtegel van 45 mm ("tot 1,5 m", `onderdelen.mjs:177`) niet. Fix: per station een vlag `klim` (muscle-up mogelijk) zonder aftrek; tegeldikte kiezen op de kritische valhoogte (EN 1177); de norm zelf kopen (EN 16630:2015; prEN 16630:2026 is in ontwerp).

**P2-12 FX (buiten): openingencontrole mist delen.** `buiten.mjs:234` (regex `Ligger` met hoofdletter: "Ladderligger" valt eruit; palen niet), `:212` (afwateringssleuven 12 mm in het ligvlak tot 900 mm hoog: binnen de vingermaat 8-25 mm). Nagerekend met de hand: FX-23 stang/ladderligger ≈ 254 mm (goed, maar niet getoetst). Fix: regex hoofdletterongevoelig, palen en liggers mee, vingeropeningen 8-25 mm als eigen toets; sleuven 6 mm of ronde gaten Ø30.

**P2-13 FX (buiten): poer en horizontale last.** `bereken.mjs:177-179`. De formule Kp·γ·b·D³/6 rekent grond vanaf het maaiveld over de volle 0,4 m; de poer begint pas op −0,3 m. Met (D³ − d³)/12 is het 1,26 kNm in plaats van 2,62 kNm (AANNAME, vereenvoudigd). Bij 30 % horizontaal blijft dat goed (0,96 kNm), bij 50 % (zwaaien, vandalisme) niet meer voor twee palen. Fix: poer 500 x 500 x 800 voor stations met 2 palen, de formule corrigeren, en de belasting uit de norm halen in plaats van aannemen.

**P2-14 FX (buiten): palen Ø76/Ø89 zijn dun.** `buiten.mjs:144`. Sterk genoeg (44 N/mm²), maar parktoestellen van de merken gebruiken Ø101,6-114,3 of koker 100 x 100. Dun oogt goedkoop en veert. Fix: pro Ø114,3 x 4, thuis Ø88,9 x 4.

### Gebogen buis, laser, materiaal

**P2-15 Buigradius 3 x de hoogte voor vlakovaal over de hoge kant.** `model.mjs:95`, `prijzen.mjs:14` (€ 9 per bocht + € 25 instellen). Vlakovaal 120 x 60 over de hoge kant op R360 kan alleen op een doornbuiger met een matrijs voor precies dat profiel; die heeft een gewone buigerij niet liggen (AANNAME: eigen matrijs € 1.500-3.000, of rollen op R ≥ 8-10 x h). Fix: eerst twee buigerijen bellen met het profiel; in het model `R` per profiel uit een tabel "matrijzen van mijn buigerij"; ovaal bij voorkeur over de platte kant buigen (R ≥ 2,5-3 x 60); prijs per bocht € 20-35 en instel € 75-150 tot een offerte het anders zegt.

**P2-16 Verzwakking in de bocht niet gerekend.** `bereken.mjs:65-72`. Bij R = 3·D wordt de buitenwand ± 14 % dunner en de doorsnede ovaler. De lat-arm van FS-13..25 (`selectorized.mjs:79`) heeft zijn bocht bij de toren, waar het moment het grootst is. Fix: W x 0,85 voor een doorsnede in een bocht; lassen en gaten ≥ 1 x h buiten de bocht (de plooizone-controle bestaat al voor platen).

**P2-17 Buigtabel zonder buigrichting.** `vorm.mjs:30` (`acos`: hoek zonder teken), `tekeningen.mjs:115-118`. Een U en een Z met dezelfde hoeken geven dezelfde tabel. Fix: kolom "richting" (L/R in het buigvlak) of rotatie 0°/180°, plus een regel "terugvering: hoek nameten, tolerantie ovaliteit ≤ 5 %".

**P2-18 Lassen op vlakovaal.** `pro.mjs:27`, lagerpaal `selectorized.mjs:23`. Het vlakke deel van 120 x 60 is 60 mm breed; een koker van 60 komt met zijn randen op de ronding (las in een V-vormige spleet, lastig dicht te krijgen). Op de ronde kant is een zadelsnede nodig; de stukbladen geven alleen haaks of verstek. Fix: aansluitende profielen ≤ 40 mm op het vlak, of een gelaserde zadelplaat; zadelsnedes als contour op het stukblad (of buislaser).

**P2-19 Kokers met gaten: geen bestand voor de buislaser.** `dxf.mjs:64` ("geen kokers of buizen"). Een rig met 10 staanders heeft honderden Westside-gaten; met een boormal is dat dagen werk en de bron van de meeste fouten. Fix: STEP per gatenkoker of een uitslag-DXF per wand; buislaseren in de prijs (AANNAME € 0,3-0,5 per gat) in plaats van 0,025 u per gat.

**P2-20 Materiaalaanduidingen kloppen niet.** `onderdelen.mjs:32` (`b48x8s`: "S355" maar norm "EN 10219 S235JRH"), `r40`, `r30s`, `r35s` (fy 355 met norm "S235JR"), `buiten.mjs:27` (opmerking "S355", profiel `b48x8` = P235). De stuklijst zet overal "S235JR(H)" (`stuklijst.mjs:29`). Wie zo bestelt, krijgt S235 voor een as die op 355 gerekend is. Fix: `mat` uit het profiel, en "3.1-certificaat vragen" bij S355/C45. Ook: `dxf.mjs:42` zet `$INSUNITS` in een R12-kop (hoort bij R2000; sommige nestsoftware struikelt): weglaten of AC1015 schrijven.

### Tekeningen, varianten, prijs, tests

**P2-21 Tekeningen: verkeerde norm op FO en FX, lastoleranties.** `blad.mjs:8` (overal "EN ISO 20957 klasse S", ook op een buitentoestel en een rek), `:21` ("ISO 2768-m" op gelaste frames: daarvoor dient EN ISO 13920-B, 2768-m alleen voor losse bewerkte stukken), `:22` (materiaal "S235, RAL" op verzinkte toestellen). ISO 128, 5456-2, 7200 en 2553 zijn verder in orde. Ontbreken: funderingsplan (P1-09), zetbladen (P1-11), ontluchtingsgaten (P1-10).

**P2-22 Tests: wat ontsnapt.** `src/qa/qaFitness.test.ts`.
- `:32` de snelle run test 3 per soort = 24 van 150 toestellen. Van FS alleen FS-01, 13, 25; rol, kussen en dwarsgreep nooit. Van FO geen plyobox, bak of kar; van FX geen slee, log, farmers of bank.
- `:108` de kabelloop-test geldt alleen voor soort `kabel`: 25 FS en 4 FM-kabeltoestellen niet.
- Geen test op kabellengte bij de nok, draairichting, krachtsverhouding, massa van losse werktuigen, "schijf past over de pen tot aan de kraag", inbeddiepte van een paal.
- `:621-634` maten alleen voor FR/FB/FK; `:646-656` opties alleen voor oude soorten; semi (`:610`) alleen op de steekproef.
- `:54-58` de titel zegt nog "± 50, vier soorten".
- Geen enkele negatieve proef voor de nieuwe reeksen.
- Fix: per bouwer (nokStation met elk `einde`, kabelStation, rigBouw met elke `extra`, elke FO/FX-bouwer) minstens één toestel in de snelle run (± 20 extra, schatting + 25 s); de zes nieuwe controles hierboven met een negatieve proef; de volledige run 's nachts of vóór elke commit van een bouwer.

**P2-23 Semi-pro: klopt als klasse S, maar heeft geen plaats in de markt.** `catalogus.mjs:28-29`, `onderdelen.mjs:59-61`. Technisch juist: klasse S, dezelfde proeffactoren als pro, 135 kg, profielen 80 x 80 x 3. Alle 300 semi/compact/XL-varianten van de nieuwe reeksen bouwen zonder botsing of rood. Maar: de marktband is verzonnen (midden van thuis en pro, zo staat het er eerlijk bij) en 89 van 100 semi-prijzen liggen erboven. Semi kost bijna evenveel uren als pro. Fix: semi niet als derde prijslijn tonen; hou één lijn "pro" en bied 3 mm wand aan als besparing op aanvraag. `maxLast.semi` = 80 % van pro is een afspraak, geen berekening: toon hem pas als de controles met die last groen zijn (dat zijn ze).

**P2-24 Opties botsen niet, maar staan bij het verkeerde toestel.** `opties.mjs:34-37`. Soort `buiten` krijgt valtegels én schijfklemmen: op een juk "valtegels: past niet", op een parktoestel "klemmen: past niet" (25 x 2 gemeten). Fix: opties per `reeks` ("strongman" / "buiten (EN 16630)"). Voor FS/FM/FO alle opties tegelijk: geen botsing.

**P2-25 Prijsmodel: fouten die de prijs opdrijven of verbergen.**
- Dubbel geteld: verpakking (`catalogus.mjs:70` € 22 en `prijzen.mjs:56` € 25-45) en handleiding (`catalogus.mjs:71` € 6 en `prijzen.mjs:57` € 10).
- Vaste overhead ± € 185-230 per stuk (`prijzen.mjs:19`), ook op parallettes van 8 kg: FO-14 € 851 tegen markt € 60-130.
- Uren opslag: FO-19 72 u, FO-07 46 u, FO-04 32 u voor een rek met bakken (`werkwijze.mjs:15-16`: elke bak is 3 platen met eigen lassen, zie P1-11). Een gezette bak is 0 lassen.
- Buiten: 2,5-10 u per station en € 45 per poer (`onderdelen.mjs:176`). Plaatsen (uitzetten, graven, storten, 2 man, 2 ritten) en keuring ontbreken; € 150-250 per poer is realistischer (AANNAME).
- Marge: `prijzen.mjs:13` kent alleen rek, bank, kabel, plate; de vier nieuwe soorten vallen op 30 %.
- Uurloon € 45 (`:12`): te laag voor een zelfstandige met werkplaats in België (AANNAME: € 60-70 nodig om na sociale bijdragen en vaste kosten iets over te houden).

**P2-26 Web: de klant ziet jouw kostprijs.** `fitness-web/index.html` (ids `w-kost`, `i-tarief`, tekst "kostprijs … marge … %", "Boven de markt"). Catalogus, werkplaats en instellingen zitten in één pagina. Een klant die ziet dat je zelf "boven de markt" bij je prijs zet, koopt niet. Fix: klantmodus zonder werkplaats, instellingen, marktband en berekeningsdetails; aparte link voor jou.

**P2-27 Aansprakelijkheid en keuring.** Het typeplaatje zegt terecht "prototype". Voor verkoop: productaansprakelijkheid verzekerd, een proeflast per type gedocumenteerd, en voor buitentoestellen een keuring volgens EN 16630 door een erkende instelling; gemeenten vragen het certificaat. Dat zijn kosten per type (AANNAME € 1.500-3.000), nog een reden voor een klein gamma.

---

## 3. P3 - afwerking en uiterlijk (per reeks, bouwbaar)

**P3-01 FS: het station oogt als een bankje naast een kast.** Rechte palen op T-voeten, een kale schijf als nok. Voorstel: (1) één gebogen ruggengraat in vlakovaal van de vloerligger tot de as (1 bocht), zitting en rug erop; (2) de twee lagerpalen vervangen door één gelaserd schild 8 mm per kant met ronde contour (zoals de lagerschilden van FP-04); (3) nokkap dicht en in de kapkleur, nu half doorzichtig; (4) armen in vlakovaal 80 x 40 met een knik naar de greep; (5) voet als gesloten lus zoals bij plate-loaded.

**P3-02 FS-13..25: latstang wit, zitting te laag en te dicht bij de kast.** De stang is in de 3D wit (materiaal "chroom" zonder omgeving?) en de zitting hangt onder kniehoogte tegen de toren. Kniesteun met twee rollen op een gebogen arm, voetsteun als gezette traanplaat.

**P3-03 FM rigs: goed, maar kaal.** Voorstel: schetsplaten 8 mm met een rond gat (driehoek met afgeronde punt) in elke hoek staander-ligger; voetflens 150 x 150 x 10 met 2 ankergaten in plaats van een doorlopende voetbalk bij verankerde rigs (zo doen de merken het, en het scheelt staal); genummerde gaten (gelaserd om de 5).

**P3-04 FM-05, 06, 10, 15, 16, 20 muurrigs:** de korte achterstaanders op de vloer zijn overbodig als de muur draagt; een muurstrip met consoles oogt lichter en is goedkoper.

**P3-05 FM-13, 14, 23, 24 functional trainers:** twee grijze kasten met een balk. Voorstel: bovenbalk als gebogen boog in vlakovaal met de optrekgrepen erin, kasten 15° naar binnen gedraaid.

**P3-06 FO rekken:** de zijplaat is een rechthoek. Geef hem een schuine voorkant die de helling van de lagen volgt (trapvorm), en laat de kopligger weg. De middenpoot van FO-02/08/20 als plaat in dezelfde vorm.

**P3-07 FO-09..11, 24, 25:** basisplaat 700-900 mm in 10-12 mm (46-76 kg, € 74-139 laser). Een kruisvoet uit 2 kokers met eindplaten oogt meer als de merken en kost een derde.

**P3-08 FO-12, 13, 22, 23 wandstrips:** de houders eindigen stomp; een gedraaide eindkap Ø50 met kraag (schijven blijven hangen) in de accentkleur.

**P3-09 FX strongman:** witte/chromen laadpennen op mat zwart ogen als losse onderdelen: zwart of verzinkt-zwart gepassiveerd. Juk: de V-schoor op de vloer vervangen door schetsplaten.

**P3-10 FX buiten:** kopkap bol (gietaluminium of gelaserd met R), infobord op de paal als gelaserd RVS-plaatje in plaats van een aparte infopaal bij FX-18, stangen in RVS 316 (geen coating die van de handen slijt).

**P3-11 Logo met VHB-tape op poedercoat** (`pro.mjs:208`): in een sportschool met reinigingsmiddelen laat dat los. Twee blindklinkmoeren M5 of lasbouten.

---

## 4. Steekproef handberekening (4 nieuwe toestellen)

### 4.1 FS-01 chest press, pro (nok)
- Stapel 100 kg, R = 200, L = √(560² + 330²) = 650 mm.
- Aan de grepen: 100 x 200 / 650 = 30,8 kg (15,4 per hand). Model: 15 kg per arm. Klopt, en is dus te licht (P1-02).
- Greepweg: 650 x 0,698 rad = 454 mm. Stapelweg: 200 x 0,698 = 140 mm. Model: toets zegt 140, de 3D tilt 600 (P1-03).
- Draairichting: nokpunt z = 1480 + 200·sin(−40°) = 1351 mm: zakt (P1-01).
- As Ø40: proefkracht 2,5 x 1,5 x 100 x 9,81 = 3679 N op 140 mm van het linkerlager, overspanning 740: M = 3679 x 140 x 600 / 740 = 418 Nm, x 1,6 = 668 Nm; W = 6283 mm³: σ = 106 N/mm². Klopt met het model. Torsie erbij: T = 3679 x 0,2 = 736 Nm, τ = 736·10³ / 12566 = 59 N/mm²; σv = √(106² + 3·59²) = 147 N/mm² ≤ 235: goed, maar niet in het model.
- Kabel: 100 x 9,81 = 0,98 kN (model 1,08 kN met de bovenplaat), x 6 = 6,5 kN ≤ 9,41 kN: goed. Bij 150 kg: 8,8-9,5 kN: op de grens, dan kabel 6,4 mm of een zwaardere kwaliteit.

### 4.2 FM-09 rig met dipstation, pro
- Gebruiker 150 kg, proeflast 2,5 x 150 x 9,81 = 3679 N, per greep 1839 N.
- Greep Ø32 x 3,2: W = 1899 mm³. Hand op 300 mm: M = 552 Nm → σ = 291 N/mm² > 235 (benut 1,24). Aan het einde (460 mm): 846 Nm → 445 N/mm².
- Las rondom Ø32, a4: Ww = π·16²·4 = 3217 mm³ → 172 N/mm² op 300 mm (goed), 263 N/mm² op 460 mm (niet goed, grens 208).
- Met Ø42,4 x 4: W = 4241 mm³ → 130 N/mm²: goed.
- Klem: moment om de staander 3679 N x 0,37 m = 1361 Nm. Twee bouten op 50 mm: 27 kN per bout; stuik in de wand van 4 mm = 1,5 x 4 x 16 x 235 = 22,6 kN: niet goed. Twee pennen Ø25 op 150 mm: 9,1 kN tegen 35 kN: goed.
- Optrekstang (model): 2,5 x 150 x 9,81 = 3,68 kN, L = 1120: M = 1,03 kNm, W(Ø35) = 4209: 245 N/mm² ≤ 355. Klopt.

### 4.3 FO-16 plyobox 50 cm
- Massa 30 kg, 600 x 500 x 500. Landing: 2 x 100 kg x 9,81 = 1962 N.
- Deksel 3 mm tussen ribbe en wand (300 mm), meedragende strook 200 mm (AANNAME): M = 1962 x 0,3 / 4 = 147 Nm; W = 200 x 3² / 6 = 300 mm³ → 490 N/mm² vrij opgelegd, ± 245 N/mm² ingeklemd: op of boven de vloeigrens: deukt.
- Kantelen bij een landing 50 mm van de rand met 30 % horizontaal: 589 N x 0,5 m = 294 Nm tegen 1962 x 0,05 + 30 x 9,81 x 0,25 = 98 + 74 = 172 Nm: kantelt. In het midden: 491 + 74 = 565 Nm: goed. Met 100 mm uitloop per zijde: 294 + 103 = 397 Nm: goed.
- Ribbe (model): 2,5 x 300 x 9,81 = 7,36 kN, L = 500: M = 0,92 kNm, W = 11730: 78 N/mm². Klopt, maar de ribbe is niet het zwakke punt.

### 4.4 FX-12 optrekstang buiten, pro (en FX-09 log)
- Stang Ø35 S355, L = 1111: M = 3679 x 1,111 / 4 = 1022 Nm, W = 4209: 243 N/mm² ≤ 355. Klopt.
- Paal Ø88,9 x 4: horizontaal 1,5 x 0,3 x 150 x 9,81 = 662 N op 2,3 m; moment aan de poer per paal 662 x 2,9 / 2 = 0,96 kNm; W = 21674: 44 N/mm²: goed. Uitwijking bovenaan onder gebruik (221 N per paal, 2,6 m): 221 x 2600³ / (3 x 210000 x 963398) = 6,4 mm: goed.
- Inbedding 200 mm (model): koppelkracht 0,96 / (2/3 x 0,2) = 7,2 kN op 89 x 100 mm = 0,8 N/mm²: het beton houdt het, maar de paal werkt los en roest op de grondlijn (P1-09).
- Grond: model 2,62 kNm; met de poer vanaf −0,3 m: 3 x 18 x 0,4 x (0,9³ − 0,3³) / 12 = 1,26 kNm → benut 0,76 in plaats van 0,37. Bij 50 % horizontaal: 1,6 kNm: niet goed (P2-13).
- Log FX-09: 2,0 x 41,4 + 2 x 4,6 (kopplaten) + 2 x 2,4 (pennen) + 3,2 (handvatten) + 1 (kragen) − 2,7 (uitsparingen) ≈ 98 kg; model 101 kg. Klopt, en is dus de fout (P1-07).

---

## 5. Prijzen: wat Ian moet doen

Gemeten (standaardinstellingen, incl. btw, tegenover de bovenkant van de marktband):

| Reeks | thuis: boven | thuis: prijs / markt | pro: boven | pro: prijs / markt |
|---|--:|--:|--:|--:|
| FR rekken | 14/14 | 4,9 x | 11/14 | 2,3 x |
| FB banken | 12/12 | 3,0 x | 10/12 | 1,8 x |
| FK kabel | 12/12 | 2,1 x | 7/12 | 1,1 x |
| FP plate-loaded | 12/12 | 2,8 x | 7/12 | 1,1 x |
| FS selectorized | 25/25 | 2,0 x | 14/25 | 1,0 x |
| FM rigs | 25/25 | 2,1 x | 19/25 | 1,1 x |
| FO opslag | 25/25 | 6,5 x | 25/25 | 3,3 x |
| FX strongman/buiten | 21/25 | 2,1 x | 10/25 | 1,0 x |

1. **Stop met de thuislijn voor alles met een stapel, een hefboom of een rek.** Tegen Aziatische serieproductie (thuisband) win je nooit: arbeid alleen is al meer dan de winkelprijs. Thuis alleen houden waar maatwerk telt (muurrig op maat van een garage).
2. **Uurloon omhoog naar € 60-65, niet omlaag.** Met € 45 verkoop je uren onder de kost; de prijs wordt er niet marktconform door (arbeid is 35-45 % van de kostprijs). Marktconform word je door minder uren: lasmallen (leercurve 1,0 in plaats van 1,6 scheelt 37 % arbeid), buislaser voor alle gaten, gezette delen in plaats van gelaste.
3. **Waar zit marge?** (a) Buitentoestellen pro: FX-13, 22, 23, 25 liggen zelfs ónder de band (€ 2.056-4.163 tegen € 2.500-14.000), en plaatsing is extra omzet die een importeur niet levert. Let op: de uren zijn onderschat (P2-25), reken eerst juist. (b) Rigs op maat van de zaal (FM, muurrigs: 6 van de 9 pro al in de band). (c) Plate-loaded en selectorized pro zitten rond 1,0-1,1 x: haalbaar zodra FS mechanisch klopt, maar reken op een prototype per type.
4. **Schrappen:** FO-14/15 parallettes, FO-16/17 plyobox, FX-10 axle, FX-04 laadpaal, FO-12/13/22/23 wandstrips als los product (€ 800-1.200 tegen € 40-600): alleen als meeleveroptie bij een rig, zonder eigen overhead. FS-14..22, 25 samenvoegen (P2-04). Semi-pro als prijslijn (P2-23).
5. **Vereenvoudigen:** opslagrekken (P1-11, P3-06, P3-07): mikpunt 8-10 u in plaats van 19-72 u. Functional trainers FM-13/14/24 (€ 12.000 tegen € 6.800-7.800): kooponderdelen € 1.692, daar zit het (katrollen, lineaire geleiding); één toren als module.
6. **Begin met 10-12 toestellen**, niet 150: 4 rigs, 2 muurrigs, 3 buitenstations, juk, slee, 1 halterrek. Elk type vraagt een prototype, een proeflast en een dossier.

---

## 6. Web en presentatie voor klanten

- Klantmodus (P2-26): alleen foto, maten, vloeroppervlak, maximale last, kleuren, opties, prijs "vanaf" en levertermijn.
- De status "prototype, proeflast nog te doen" staat er eerlijk; toon voor klanten alleen types die gebouwd en beproefd zijn, de rest als "op aanvraag".
- 150 kaarten met 13 bijna gelijke FS-toestellen en 22 bijna gelijke rigs is vermoeiend: groepeer per familie met een keuzeknop (vakken 1-4, muur ja/nee, extra's).
- Een offerteknop die de gekozen variant (tekeningnummer `FM-02-P-XL` + opties + RAL) in een mail of pdf zet; nu is er geen vervolgstap.
- Renders zijn goed voor een eerste indruk, maar een klant wil één echte foto van een gebouwd toestel en een las van dichtbij. Dat ene beeld verkoopt meer dan 150 renders.
- 1,2 MB aan modules + three: laden op een telefoon testen; de rasters als vooraf gemaakte afbeeldingen.
- Logo en naam zijn placeholder: niet naar klanten sturen voor de zaak een naam en btw-nummer heeft.

---

## 7. De 10 belangrijkste

1. P1-01 nok draait verkeerd om bij 8 FS-toestellen.
2. P1-02 FS-stapel 31-65 % aan de greep, lat pulldown 50 kg.
3. P1-03 stapelweg en kabellengte bij de nok kloppen niet; FS-02 en FS-09 te korte slag.
4. P1-05 dipgrepen FM (291-445 N/mm²) en de klem.
5. P1-09 + P1-10 buiten: 200 mm inbedding, geen funderingsplan, geen ontluchting voor het verzinken.
6. P1-11 DXF van gezette delen is geen uitslag.
7. P1-06/07/08 laadpaal niet te laden, log 101 kg, stenenplatform kantelt.
8. P1-04 lagerhuis Ø60,3 x 8 kan niet op Ø44 H7; P1-12 plyobox.
9. P2-25 + §5 prijs: dubbel geteld, uren opslag fout, buiten onderschat; thuislijn en semi schrappen, starten met 10-12 types.
10. P2-22 tests: 24 van 150 in de snelle run, geen enkele negatieve proef en geen kabelloop-test voor de nieuwe reeksen.

Bronnen normpunten EN 16630 (samenvattingen, geen normtekst): tolymp.de/en/your-topics, sportsequip.co.uk (BS EN 16630), sunshinegym.co.uk (buyers guide), standards.iteh.ai (prEN 16630:2025).

---

## Verwerking in v6 (2026-11-16)

Status: **gedaan**, **deels** (wat ontbreekt, staat erbij), **keuze Ian** (bedrijfskeuze, niet geschrapt) of **niet**. Elke P1 heeft een test met een negatieve proef (`src/qa/qaFitness.test.ts`, describe "fitness v6").

| Punt | Status | Wat | Bestand |
|---|---|---|---|
| P1-01 | gedaan | raakpunt en vloerkatrol aan de kant waar de nok opwikkelt (ook FK-08 had de fout); controle `nokFouten` | selectorized.mjs, kabel.mjs, controle.mjs |
| P1-02 | gedaan | nok R = grens · L / stapel, grens per oefening (AANNAME merkwaarden), stapel 20/24/28 x 5 kg; kabelstations 1:1 (lat, row) of 2:1 (arm, romp); toets met oordeel | selectorized.mjs |
| P1-03 | gedaan | stapelweg = R·θ (ook FK-10), opgewikkelde kabel: lengte gelijk in stand 0 en 1; FS-02 greepweg 447 mm, FS-09 391 mm | selectorized.mjs, kabel.mjs, model.mjs |
| P1-04 | gedaan | lagerhuis Ø70 x 12 E355 (binnen 46) → Ø50 H7 voor GFM-4550, as Ø45; FK Ø60,3 x 10 → Ø44 H7; controle `lagerhuisFouten` | selectorized.mjs, kabel.mjs, onderdelen.mjs |
| P1-05 | gedaan | U-zadel (rugplaat + wangen), 2 pennen Ø25/16 op 150 mm, greep Ø42,4 x 4, berekening en belastinggeval dip | rigs.mjs |
| P1-06 | gedaan | afneembare T-greep (stift Ø25 + borgveer); controle `laadpenFouten` | buiten.mjs |
| P1-07 | gedaan | log 1,2 m in Ø273 x 4 (thuis Ø219 x 3): 52 / 35 kg leeg | buiten.mjs |
| P1-08 | gedaan | eigen bouwer: frame 80 x 80 x 4, deksel 8 mm + rubbermat 20 mm, 1 x 1 m, 237 kg; toetsen steen op de rand en deksel | buiten.mjs |
| P1-09 | gedaan | paal 600 mm in een poer 500 x 500 x 800, bovenkant −200; funderingsplan (A3); controle `inbedFouten` | buiten.mjs, tekeningen.mjs |
| P1-10 | gedaan | 2 ontluchtingsgaten per holle ruimte, kopkap na het verzinken; controle `ontluchtFouten` | buiten.mjs, controle.mjs |
| P1-11 | gedaan | gezette plaat = één positie met uitslag (K = 0,4) en zetlijnen: V-goot, bak, mantel, kabelgoot, zijkap, bovenkap; DXF-laag ZETLIJN; zetblad; venster in de stapelkap-DXF; nokkap vlak met kantband | model.mjs, vorm.mjs, stuklijst.mjs, dxf.mjs, tekeningen.mjs, opslag.mjs, kabel.mjs, pro.mjs |
| P1-12 | gedaan | taps (100 mm per zijde), deksel 4 mm op 3 ribben, rubberen rand, toetsen landing op de rand en deksel | opslag.mjs |
| P2-01 | gedaan | naafbus Ø70 x 12 onder elke arm; toets as buiging + torsie (von Mises) en las nok op as | selectorized.mjs |
| P2-02 | gedaan | zitting op een veerpen (verstelbaar), instelschijf met 6 gaten, aanslagen met rubberbuffers | selectorized.mjs |
| P2-03 | deels | rol op 404 mm van de knieas; de arm is nog niet verstelbaar | selectorized.mjs |
| P2-04 | keuze Ian | FS-13..22, 25 blijven (samenvoegen = schrappen) | - |
| P2-05 | gedaan | vloerankers op elk vrijstaand rig, belastinggeval kippen, notitie op het typeplaatje | rigs.mjs, tekeningen.mjs |
| P2-06 | gedaan | eigen ladder: 2 kokers met kopplaten tussen de staanders gebout, sporten ertussen | rigs.mjs |
| P2-07 | gedaan | ophangbalk aan beide kanten gebout, berekend op 2 schommelende gebruikers | rigs.mjs |
| P2-08 | gedaan | pen 450 mm, jukbalk verstelbaar per 50 mm (2 pennen), Hardox-sleepstrips, schetsplaten | buiten.mjs |
| P2-09 | deels | duwkracht μ·(last + slee), duwpaal 60 x 60 x 4, UHMW-slijtstrip, bodem 6 mm op 2 ribben; uitneembare duwpalen niet | buiten.mjs |
| P2-10 | gedaan | greep 180 mm vrij, frame 720 breed, stalen voetplaat | buiten.mjs |
| P2-11 | gedaan | klimzone (stang of ladder vanaf 2 m: geen aftrek), tegeldikte 45/60/80 mm naar de valhoogte | buiten.mjs, opties.mjs |
| P2-12 | gedaan | openingen met palen en ladderliggers, eigen vingertoets 8-25 mm, sleuven 6 mm | buiten.mjs |
| P2-13 | gedaan | Mp = Kp·γ·b·(D³ − d³)/12, 50 % horizontaal, poer 500 x 500 x 800 | bereken.mjs |
| P2-14 | gedaan | palen Ø114,3 x 4 (pro) en Ø88,9 x 4 (thuis) | buiten.mjs |
| P2-15 | deels | € 25 per bocht + € 100 instellen (buis tot Ø60: € 30), matrijs-AANNAME op het stukblad; R per buigerij pas na een offerte | prijzen.mjs, tekeningen.mjs |
| P2-16 | gedaan | W x 0,85 voor gebogen stukken (lat-arm thuis/semi zwaarder) | bereken.mjs, selectorized.mjs, kabel.mjs |
| P2-17 | gedaan | kolom richting (L/R), terugvering en ovaliteit op het stukblad | tekeningen.mjs |
| P2-18 | deels | controle "aansluitingen op vlakovaal" met de oplossing (zadelplaat); de zadelplaten zelf nog niet getekend | bereken.mjs |
| P2-19 | gedaan | wand-DXF per koker voor de buislaser (STEP kan het model niet maken), instelling buislaser € 0,40 per gat | dxf.mjs, prijzen.mjs |
| P2-20 | gedaan | materiaal uit het profiel (S355/C45/E355 met 3.1-certificaat), $INSUNITS weg | onderdelen.mjs, stuklijst.mjs, dxf.mjs |
| P2-21 | gedaan | norm per soort (EN 16630, strongman, opslag), EN ISO 13920-BF, materiaal verzinkt; funderingsplan, zetbladen | blad.mjs, tekeningen.mjs |
| P2-22 | gedaan | steekproef per bouwer, kabelloop FS/FM, maten en opties op de nieuwe reeksen, negatieve proef per bouwer | qaFitness.test.ts |
| P2-23 | keuze Ian | semi-pro blijft een prijslijn | - |
| P2-24 | gedaan | opties per reeks: valtegels (buiten), klemmen (strongman) | opties.mjs, web, presentatie |
| P2-25 | gedaan | verpakking en handleiding niet dubbel, overhead per grootteklasse, minder lasuren opslag, plaatsing en keuring buiten, marges nieuwe soorten; tabel € 45 / 60 / 65 | prijzen.mjs, catalogus.mjs, opslag.mjs, docs/Marktprijzen.md |
| P2-26 | gedaan | klantmodus (`?klant`, klant.html): geen werkplaats, instellingen, kostprijs of marktband; presentatie zonder marktband | web/index.html, maak-web.mjs, presentatie/app.mjs |
| P2-27 | deels | keuring EN 16630 in de prijs, aansprakelijkheid in de docs; verzekering afsluiten = Ian | prijzen.mjs |
| P3-01 | deels | armen in vlakovaal, nok als segment, nokkap dicht; ruggengraat, lagerschild en gesloten voet niet | selectorized.mjs |
| P3-02 | deels | latstang gekarteld in plaats van wit; zitting niet verplaatst | selectorized.mjs |
| P3-03 | deels | schetsplaat met rond gat aan de voet (bovenaan zitten de bouten); voetflens en genummerde gaten niet | rigs.mjs |
| P3-04 | niet | muurrigs zonder achterstaanders: andere constructie, eerst kiezen | - |
| P3-05 | niet | functional trainer met boog: nog niet | - |
| P3-06 | deels | zijplaat trapvorm (schuine voorkant); kopligger blijft | opslag.mjs |
| P3-07 | niet | kruisvoet: in strijd met de vorige opdracht (basisplaat gevraagd); kost is gedocumenteerd | - |
| P3-08 | gedaan | gedraaide eindkap Ø56 met kraag in de accentkleur | opslag.mjs |
| P3-09 | gedaan | laadpennen zwart, schetsplaten op het juk | pro.mjs, buiten.mjs |
| P3-10 | gedaan | bolle kopkap, infobord op de bank, stangen RVS 1.4404 (pro) | buiten.mjs, onderdelen.mjs |
| P3-11 | gedaan | logo- en zijplaten op 2 lasbouten M5 | pro.mjs |
