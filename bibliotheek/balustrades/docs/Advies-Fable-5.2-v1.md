# Advies Fable 5.2 op de balustrade-configurator, v1 (2026-11-17)

Strenge nalezing van `bibliotheek/balustrades` (model, berekening, normen, onderdelen, stuklijst, prijzen, tekeningen,
montage, dossier, web en presentatie). Er is geen code gewijzigd.

## Wat ik gedaan heb

- Gelezen: EISEN.md, README.md, TASKS.md, docs/Normen-en-bronnen.md en alle modules.
- Gedraaid: `vitest run src/qa/qaBalustrades.test.ts` (490 van 490 groen) en `npm run typecheck` (schoon).
- Doorgerekend met een eigen script: 33 configuraties (alle soorten, categorie A tot C5, boven en zij, binnen en
  buiten, trap, hoek, 12 m, vrije afstand 2000, onder het dak). De getallen in dit rapport komen daaruit.
- Bekeken als beeld (Edge via playwright uit `node_modules`): overzicht, stuklijst, bestellijst, plaatsingsblad,
  boringen, lasdetails, montagebladen en stukbladen van vijf ontwerpen, plus de presentatie op desktop en gsm.
- Bronnen nagelezen: Buildwise Contact 2016/4 p. 16-17 en de ANB-fiche NBN EN 1991-1-1 (de twee pdf's uit
  Normen-en-bronnen.md, als tekst uitgelezen).

**Niet gedaan, dus niet bevestigd:** de normteksten zelf (NBN B 03-004:2017, NBN S 23-002, EN 16612, de ETA's van
fischer, de technische fiches van Q-railing) heb ik niet ingezien. Waar ik uit het hoofd een normwaarde noem, staat
er "nakijken" bij. De web-configurator (`web/index.html`) heb ik gelezen maar niet in de browser bediend; alleen de
gebouwde presentatie is gerenderd.

## Oordeel in het kort

De opbouw is goed: elke waarde heeft een bron of het woord AANNAME, de lijnlasten kloppen met de ANB-fiche
(A 0,5; B, C1-C4 en D 1,0; E 2,0; C5 5,0 kN/m), de aangrijping op de volle hoogte is voorzichtig, de zone 110-450 mm
met de kubus van 20 mm is juist overgenomen en de keuze "geen inslaganker" is verstandig.

Maar de configurator zegt nu "Voldoet aan NBN B 03-004" terwijl vier belastingen uit diezelfde norm niet gerekend
worden (wind, de verticale puntlast, de puntlast op de vulling, de schokproef), en terwijl de verankering uitgaat van
een kale betonvloer die in een Belgische woning zelden bestaat. Dat zijn de zaken die eerst moeten.

**Aantal bevindingen: 8 x P1, 17 x P2, 12 x P3.**

Top 5:
1. Buiten wordt geen wind gerekend (P1-1).
2. De ondergrond is altijd "beton C20/25, kaal": geen chape, welfsels of hout (P1-2).
3. De verticale puntlast ontbreekt; de platte handregel 50x8 vrij tussen staanders haalt die niet (P1-3).
4. Glas tussen klemmen heeft geen maatgrens: 1901 x 952 mm in 55.2 op vier klemmen is groen (P1-4).
5. De tekst "Voldoet aan NBN B 03-004" belooft meer dan er gecontroleerd is (P1-8).

---

## P1: onveilig of niet conform

### P1-1 Buiten wordt geen windbelasting gerekend
- **Waar:** `bereken.mjs:111-192` (er is geen windcontrole), `model.mjs:14` (`plaats: 'binnen' | 'buiten'` stuurt alleen
  de afwerking en de ankers).
- **Wat:** `plaats: 'buiten'` verandert niets aan de berekening. Glas met staanders, buiten, H 1300, categorie A geeft
  groen met koker 40x40x4 op 990 mm. Idem voor de vlakke plaat (H3) en glas in het U-profiel.
- **Waarom:** Buildwise Contact 2016/4 p. 16 (de eigen bron C2016) zegt letterlijk dat de herziene norm
  windblootstellingsklassen toevoegt en dat de wind gecombineerd wordt met de horizontale lijnlast. Een dichte vulling
  van 1,1 m hoog vangt bij qp = 0,7 kN/m² en cp,net = 1,2 (EN 1991-1-4 tabel 7.9, zone D; aan vrije einden tot ± 3,4,
  nakijken) al 0,92 kN/m, met een moment van ± 0,51 kNm/m aan de voet. Dat is even veel als de hele lijnlast van een
  woning (0,5 kN/m op 1 m). Aan de kust of op een hoog balkon is de wind maatgevend.
- **Oplossing:**
  1. Invoer bij buiten: hoogte boven het maaiveld en terrein (of de windklasse uit NBN B 03-004).
  2. Wind op de dichte oppervlakte: glas en vlakke plaat volledig, geperforeerde plaat en lamellen met hun
     volheidsgraad, spijlen en staven verwaarloosbaar.
  3. Twee combinaties: lijnlast + ψ0 · wind en wind + ψ0 · lijnlast, voor staander, las, voetplaat, ankers en glas.
  4. Tot dat er is: buiten met glas of plaat altijd oranje, met de tekst "wind niet gerekend".

### P1-2 De ondergrond is altijd kaal beton C20/25
- **Waar:** `onderdelen.mjs:106-111` (ANKER: alleen waarden in gescheurd C20/25), `model.mjs:13-15` (geen keuze voor de
  ondergrond of de vloeropbouw), `tekeningen.mjs:401` ("beton minstens C20/25").
- **Wat:** er is geen invoer voor chape, isolatie, welfsels, hout of metselwerk. De ankerstang is altijd M12x160 met
  hef 110 mm, gemeten vanaf de bovenkant van de voetplaat.
- **Waarom:** in een Belgische woning ligt op de draagvloer bijna altijd 80 tot 150 mm isolatie en chape, en de
  draagvloer is vaak een holle welfsel of een houten roostering. Een stang van 160 mm zit dan volledig in de chape: de
  rekenwaarde van 14 kN geldt niet, en een voetplaat op een zwevende dekvloer zakt en kantelt. De opdracht noemt
  uitdrukkelijk beton én hout; hout bestaat in de code alleen als waarschuwing bij de muurplaat.
- **Oplossing:**
  1. Invoer: ondergrond (volle betonplaat, welfsel met druklaag, hout, staal, metselwerk) en de dikte van de opbouw
     boven de draagvloer.
  2. Ankerlengte = opbouw + voetplaat + hef; boven ± 40 mm opbouw een staander die door de chape tot op de draagvloer
     loopt (voetplaat op de ruwbouw, vóór de chape) of zijmontage.
  3. Hout: doorgaande bouten of houtdraadbouten met een eigen controle (EN 1995-1-1), of rood met "laat rekenen".
  4. Holle welfsels en metselwerk: rood of oranje met het juiste ankertype (injectie met zeefhuls), nooit de
     betonwaarde.

### P1-3 De verticale puntlast ontbreekt; de platte handregel haalt hem niet
- **Waar:** `bereken.mjs:144-146` (handregel: alleen horizontaal), `onderdelen.mjs:150` (G1: platte handregel 50x8 op de
  staanders, 60 mm boven het glas), `onderdelen.mjs:137` (H2).
- **Wat:** de handregel wordt alleen horizontaal gecontroleerd. De last van iemand die op de handregel gaat zitten of
  staan ontbreekt, terwijl Normen-en-bronnen.md regel 34 hem zelf noemt ("verticaal 1 kN op de handgreep").
- **Waarom:** Contact 2016/4 p. 16: de verticale puntbelasting moet in rekening gebracht worden (alleen volglas zonder
  regel is vrijgesteld). Platstaal 50x8 liggend heeft verticaal W = 50 · 8² / 6 = 533 mm³. Bij glas met staanders
  (1320 mm vrij, niets eronder): M = 1,5 · 1,0 kN · 1,32 m / 4 = 0,495 kNm, dus σ = 928 N/mm² (plastisch 619), tegen
  235. Ook als doorgaande ligger (± 0,17 · Q · L) blijft het boven 600 N/mm². Bij spijlen en bij een plaat tot tegen de
  handregel dragen die mee; bij glas met staanders en bij horizontale staven niet.
- **Oplossing:** controle "handregel verticaal" toevoegen met de waarde uit de norm (1 kN nakijken). Platte handregel
  alleen toelaten waar spijlen of een plaat hem om de ≤ 110 mm steunen; bij G1, H1 en H2 een koker (bv. 50x30x3 of
  40x40x3) of de buis Ø42,4 kiezen, of het platstaal op een koker lassen.

### P1-4 Glas tussen klemmen: geen maatgrens, te gunstige rekenbreedte, geen borging
- **Waar:** `bereken.mjs:162-165`, `model.mjs:384-404`, `onderdelen.mjs:83-84` en `:147`.
- **Wat:**
  - Met een vrije staanderafstand van 2000 mm krijg je glas 1901 x 952 mm in 55.2 op vier klemmen, en alles is groen.
  - De spanning rekent met beff = de volle glashoogte (952 mm) onder een puntlast op de bovenrand. Een puntlast op
    een vrije rand spreidt hoogstens onder 45°; de rekenbreedte is dan een fractie daarvan.
  - De klemmen zelf worden niet gecontroleerd (kracht per klem, maximale ruitmaat en -gewicht van de fabrikant).
  - Er is geen borgpen of veiligheidsplaatje voorzien: gelaagd glas in een knelklem kan er na breuk of bij kruip van
    de rubbers uit zakken.
- **Waarom:** NBN S 23-002-2/-3 en de montagerichtlijn van de klemfabrikant bepalen de toegelaten ruitmaat; de code
  zegt zelf "klemfabrikant nakijken" maar kleurt toch groen. De schokproef uit NBN B 03-004 is voor glazen vulling het
  eigenlijke criterium en is niet aangetoond.
- **Oplossing:** de maximale ruitbreedte en -hoogte per klemtype en glasdikte uit de tabel van de fabrikant halen en
  als harde grens zetten (rood erboven); beff = 2 x de afstand tot de rand met een maximum; borgpen of veiligheidsplaat
  in de stuklijst en op het montageblad; de controle altijd oranje zolang er geen attest van het systeem is.

### P1-5 Randafstand van de ankers: het blad zegt ≥ 100 mm, het ontwerp geeft 55 mm
- **Waar:** `tekeningen.mjs:400-401` ("slaglijn op 100 mm van de vloerrand" en "Randafstand ≥ 100 mm"), boringenblad
  ("randafstand ≥ 100 mm"), `bereken.mjs:25-26` (gaten op 25 mm van de plaatrand), `onderdelen.mjs:113` (RAND 0,75 en
  0,6, AANNAME).
- **Wat:** het staanderhart staat op 100 mm; met een voetplaat van 140 zitten de buitenste ankers op 100 − 45 = 55 mm
  van de vloerrand. Het plaatsingsblad spreekt zichzelf dus tegen. De reductie 0,75 heeft geen bron, en de dwarskracht
  naar de rand (betonrandbreuk) wordt niet gecontroleerd. Bij de keilbout is 55 mm bovendien dicht bij of onder de
  kleinste randafstand uit de ETA (nakijken): een spreidanker zo dicht bij de rand kan de rand afsplijten.
- **Waarom:** EN 1992-4 (betonkegel, randbreuk, splijten) en de ETA van het anker. De hele balustrade hangt aan deze
  vier ankers.
- **Oplossing:** de echte randafstand c = 100 − e tonen en toetsen aan c_min uit de ETA; het staanderhart standaard
  verder van de rand (≥ 120 mm bij plaat 140) of de plaat excentrisch; bij c < 1,5 · hef geen keilbout maar chemisch;
  de zin "Randafstand ≥ 100 mm" vervangen door de echte maat; dwarskracht naar de rand toevoegen.

### P1-6 De vulling wordt niet gerekend; ronde spijl Ø12 haalt de puntlast niet
- **Waar:** `bereken.mjs` (geen controle op spijl, staaf, plaat of plint), `onderdelen.mjs:123`.
- **Wat:** de ANB-fiche, voetnoot 3, legt naast de puntlast op de beschermingshoogte een puntlast van 0,5 kN op onder
  de beschermingshoogte, dus op de vulling. Die staat ook in Normen-en-bronnen.md (Qk,h2) maar wordt nergens gerekend.
- **Waarom (indicatief):** spijl Ø12, 1002 mm lang, aan beide einden gelast: plastisch bezwijkt hij bij
  Pu = 8 · Wpl · fy / L = 8 · 288 · 235 / 1002 = 0,54 kN, tegen γQ · Q = 0,75 kN. Vierkant 12 (Wpl 432) haalt 0,81 kN,
  Ø14 0,86 kN. In categorie B tot E (als daar 1 kN zou gelden) haalt geen van de dunne spijlen het. De markt gebruikt
  Ø12 wel, maar steunt dan op een proef.
- **Oplossing:** een controle "vulling onder 0,5 kN" per stijl; Ø12 alleen tot een lengte die het haalt (of met een
  tussenregel), anders standaard vierkant 12 of Ø14; de plaat van 3 mm en de plint als plaat op twee randen narekenen.

### P1-7 Langs een trap gaat een bol van 110 mm onder de onderregel door
- **Waar:** `model.mjs:267` en `normen.mjs:17` (alleen "50 mm van de trapneus tot de onderste regel").
- **Wat:** de controle "50 / 50 mm" is groen, maar de driehoek tussen trede, stootbord en onderregel wordt niet
  bekeken. Bij 180/250 en 50 mm boven de neuslijn heeft die driehoek een ingeschreven cirkel van ± Ø156 mm.
- **Waarom:** de eigen regel "openingen ≤ 110 mm (bol), ook tussen de vloer en de onderrand". Of NBN B 03-004 voor
  die driehoek een aparte maat geeft, heb ik niet kunnen nalezen; met de regel van 110 mm is het een overschrijding.
  Geldt alleen als de balustrade op of boven het open eind van de treden staat (niet naast een dichte trapboom).
- **Oplossing:** de ingeschreven cirkel uitrekenen uit optrede, aantrede en de afstand tot de neuslijn en als opening
  tonen; bij overschrijding een plint of plaat die de treden volgt, of zijmontage op de trapboom; invoer "open treden
  of dichte trapboom".

### P1-8 "Voldoet aan NBN B 03-004" belooft meer dan er gecontroleerd is
- **Waar:** `presentatie/app.mjs:70` (klanttekst), `tekeningen.mjs:170` ("groen: voldoet"), `dossier.mjs:36`.
- **Wat:** de klant leest "Voldoet aan NBN B 03-004". Niet gecontroleerd zijn: wind (P1-1), de verticale puntlast
  (P1-3), de puntlast op de vulling (P1-6), de schokproeven met het zachte en het harde lichaam, het gedrag van glas
  na breuk, en de ondergrond (P1-2). De normtekst zelf is niet ingezien (Normen-en-bronnen.md regel 3).
- **Waarom:** Ian tekent als vakman voor de conformiteit. Een schriftelijke belofte die de berekening niet dekt, is
  bij een ongeval zijn aansprakelijkheid.
- **Oplossing:** de tekst wijzigen in "Hoogte, openingen en beklimbaarheid volgens NBN B 03-004; sterkte voorberekend
  op x kN/m. Niet inbegrepen: schokproef, wind, ondergrond", met een checklijst "na te kijken vóór uitvoering" in het
  dossier. Groen pas als elke regel van die lijst afgevinkt is.

---

## P2: fout of belangrijk

### P2-1 Trap, bovenop: de voetplaten liggen op de schuine neuslijn, niet op de treden
- **Waar:** `model.mjs:209-215` (staanders gelijk verdeeld over de helling), `:224-235` (voet op `s.punt(t)`).
- **Wat:** bij trap 3000 + vide 1500 staan de voetplaten op z = 14, 730, 1445 en 2160 mm en zijn alle staanders
  1084 mm. De treden liggen op veelvouden van 180 mm; de plaat op t = 1013 mm loopt van 943 tot 1083 mm en ligt dus
  over de trapneus op 1000 mm. Hier klopt de hoogte toevallig bijna (4 treden per veld); bij een andere lengte zweeft
  de plaat tot 180 mm boven de trede.
- **Waarom:** maakbaarheid: zo kan het niet geplaatst worden.
- **Oplossing:** de staanders op een trede zetten (hart in het midden van de aantrede, afstand = veelvoud van de
  aantrede ≤ amax), de staanderlengte per staander uit het echte tredeniveau, en dat op het plaatsingsblad tonen. Of
  langs een trap alleen zijmontage op de trapboom aanbieden.

### P2-2 Hoogte: trap negeert de valhoogte; de presentatie vraagt de valhoogte niet
- **Waar:** `normen.mjs:60-63`, `presentatie/app.mjs` en `sjabloon.html` (geen veld valhoogte; wel in `web/index.html`).
- **Wat:** trap met H 900 en valhoogte 12 m is groen (de 1200 mm geldt alleen voor recht, hoek en U). In de
  presentatie voor de klant kan de valhoogte niet ingevuld worden: een balkon op de vijfde verdieping krijgt 1100 mm
  en "voldoet". De 900 mm langs de trap blijft een AANNAME uit een secundaire bron.
- **Oplossing:** de valhoogte ook bij de trap toepassen (of oranje); het vinkje "valhoogte 12 m of meer" in de
  presentatie; de 900 mm bevestigen in de normtekst of bij Buildwise vóór de eerste trap verkocht wordt.

### P2-3 De bron van "openingen ≤ 110 mm" klopt niet; de spleet aan de vloerrand ontbreekt
- **Waar:** `normen.mjs:16`, `model.mjs:219` (zijmontage: 40 mm + halve staander voor de vloerrand).
- **Wat:** Contact 2016/4 p. 16-17 noemt 110 mm alleen als ondergrens van de klimzone (figuur 1: 110-450 mm); de
  grootste opening staat er niet in. De waarde is in de sector gangbaar, maar de bronvermelding is fout. Bij
  zijmontage ontstaat tussen de vloerrand en de vulling een horizontale spleet van ± 54 mm (koker 40, spijl Ø12) tot
  ± 74 mm (koker 80); die wordt niet als opening getoond en de norm heeft daar mogelijk een eigen grens (nakijken).
- **Oplossing:** de bron vervangen (ACB-document of de normtekst); de spleet aan de vloerrand als opening toevoegen.

### P2-4 Handregel horizontaal: alleen de lijnlast, terwijl de puntlast maatgevend is
- **Waar:** `bereken.mjs:145-146`.
- **Wat:** M = γQ · q · a² / 8. De puntlast in het midden (γQ · Q · a / 4) is groter zodra a < 2 · Q / q; dat is in
  categorie A en B altijd zo onder 2 m. Bij 1320 mm: 0,248 tegen 0,163 kNm (+ 52 %). De toelichting "voorzichtig"
  klopt dus niet. De spanningen blijven laag, maar de formule is fout; een doorbuigingscontrole van de handregel
  ontbreekt.
- **Oplossing:** `Math.max(q·a²/8, Q·a/4)` en de doorbuiging in het midden optellen bij die van de staander.

### P2-5 Een vrije staanderafstand wordt niet aan de grens getoetst
- **Waar:** `bereken.mjs:142` (alleen bij `auto`), `onderdelen.mjs:120`, `:133`, `:147` (maxAfstand).
- **Wat:** afstand 2000 mm is groen bij spijlen (grens 1600) en bij glas met staanders (grens 1500). EISEN.md regel 60
  zegt: "Is die te groot, dan staat de controle op rood." De onderregel koker 40x20x2 over 2 m met 18 spijlen wordt
  nergens gerekend.
- **Oplossing:** de controle ook bij een vrije afstand tonen, rood boven `S.maxAfstand`.

### P2-6 Zijmontage: het lasmodel past niet bij het detail
- **Waar:** `bereken.mjs:133-134` (las "rondom aan de console" met de doorsnede van de staander), `:32` en `:128`
  (arm H + 20), `:46` (m = 30 vast), `model.mjs:231-232` (twee afstandhouders op −90 en −160 mm).
- **Wat:** de staander is niet rondom op de console gelast; het moment gaat als koppel door twee afstandhouders die
  70 mm uit elkaar staan (± 13 kN per afstandhouder in een woning). De las houdt dat ruim (± 27 N/mm²), maar de
  formule op het berekeningsblad beschrijft een verbinding die er niet is. Het grootste moment in de staander zit ter
  hoogte van de bovenste afstandhouder (H + 90), niet op H + 20 (6 % te gunstig).
- **Oplossing:** las per afstandhouder rekenen op M / 70 mm, de wand van de staander onder die kracht nakijken, de
  arm H + 90 gebruiken; de afstandhouders verder uit elkaar zetten (bv. −40 en −210) maakt alles lichter.

### P2-7 Buiten met M10: de bestellijst geeft M12-ankers
- **Waar:** `onderdelen.mjs:107` en `:109` (`koopA4: 'faz12a4'` en `'fisa12a4'` bij keil10 en chem10),
  `stuklijst.mjs:78`, `prijzen.mjs:77`.
- **Wat:** glas in U-profiel, buiten: het ankertype is chem10 (gat Ø12, profielgat voor M10), de bestellijst zegt
  "17 x Ankerstang FIS A M12x160 A4". Met keilbouten idem (FAZ II 12/20 A4). Past niet in het profiel.
- **Oplossing:** artikels `fisa10a4` en `faz10a4` toevoegen en koppelen.

### P2-8 Glas in het U-profiel: de uitkomst hangt aan ω = 0,3 zonder bron
- **Waar:** `normen.mjs:40`, `bereken.mjs:90-93` en `:152-159`, `model.mjs:417-424`.
- **Wat:**
  - De doorbuiging is 12,3 mm (88.4, woning) en 13,0 mm (1010.4, kantoor) tegen 15 mm. Met ω = 0,1 wordt 88.4
    19,6 mm, dus rood. Voor gewone PVB bij persoonslasten ligt ω volgens EN 16612 naar mijn weten lager dan 0,3
    (nakijken); de draaiing van het profiel en de ankers komt er nog bij.
  - De systeemcontrole kijkt alleen naar kN/m, niet naar de grootste glashoogte van het systeem (H tot 1300 kan).
  - De puntlast op één smalle plaat wordt niet gerekend (kleinste lijn 600 mm, zonder handregel draagt elke plaat
    alleen).
  - De ankersteek 250/200/150/125 mm wordt vrij gekozen; het profiel heeft voorgeboorde gaten op een vaste steek.
- **Oplossing:** ω uit de norm per folie (PVB, stijve folie) en lastduur, met de bron; rood zodra de fabrikant geen
  tabelwaarde voor deze hoogte en last geeft; puntlast per plaat; de steek uit de fiche van het profiel.

### P2-9 Glasbestelling zonder klasse en zonder heat-soak
- **Waar:** `stuklijst.mjs:49`, `tekeningen.mjs` (glaslijst), `onderdelen.mjs:53-58`.
- **Wat:** de bestelling zegt "gehard-gelaagd, kanten geslepen". Er staat geen slagvastheidsklasse 1B1 volgens
  EN 12600, geen EN 14449 (gelaagd) of EN 12150 (gehard), en geen heat-soak-test (EN 14179) tegen spontane breuk door
  nikkelsulfide. In de hele code komt "12600" niet voor.
- **Waarom:** Contact 2016/4 p. 17 noemt type 1B1 voor glas dat tegen vallen beschermt; NBN S 23-002.
- **Oplossing:** die vier vermeldingen vast op de glasbestelling en in de offerte; heat-soak standaard aan.

### P2-10 Thermisch verzinken: de ontluchtingsgaten staan niet op de tekeningen
- **Waar:** `werkwijze.mjs:55` (één zin), stukbladen en boringenblad (`tekeningen.mjs:195-287`, `:318-349`): niets.
- **Wat:** elke koker is aan beide einden dichtgelast (staander tussen voetplaat en handregel, regels tussen de
  staanders). Het stukblad van de staander toont geen enkel gat. De vlakke plaat van 3 mm met onderbroken las 30/150
  wordt ook verzinkt.
- **Waarom:** EN ISO 1461 en EN ISO 14713-2. Een gesloten holle ruimte kan in het zinkbad openbarsten; de verzinkerij
  weigert het stuk. Onderbroken lassen op een overlap houden beitszuur vast (roestlopers door de coating), en vlakke
  plaat van 3 mm trekt krom in het bad. Ook bij enkel poedercoaten gast een gesloten koker uit in de oven.
- **Oplossing:** bij buiten de gaten in het model zetten (Ø10-12 diagonaal onder en boven in elke staander, een
  gat in de staanderwand achter elke regel of een kerf in het regeleinde), ze op het stukblad en het boringenblad
  maten, en ze meetellen in de uren. Plaat buiten: rondom doorlassen of bouten na het verzinken, en vlakke plaat
  ≥ 4 mm of met een zetrand; de klant waarschuwen voor vervorming.

### P2-11 Geen secties, geen werfnaden, geen uitzetting
- **Waar:** `stuklijst.mjs:117-121`, `model.mjs:20` (L tot 12 000), `model.mjs:278-299` (handregel per lijn in één
  stuk).
- **Wat:** een lijn van 12 m geeft één handregelpositie "L 12000"; het zaagplan snijdt die in 2 x 6000 met de
  opmerking "stuiklas op een staander", maar nergens staat hoe de balustrade in vervoerbare delen verdeeld wordt, of
  hoe die op de werf gekoppeld worden. Een hoek of U wordt als één geheel getekend.
- **Waarom:** een gelast raam moet in de bestelwagen, door het trapgat, in het zinkbad en in de oven (vaak ≤ 6 à 7 m;
  navragen). Buiten zet 12 m staal bij 60 K verschil 8,6 mm uit: zonder voeg trekt dat aan de ankers.
- **Oplossing:** invoer "grootste sectie" (standaard ± 3 m), secties eindigen op een staander of met een dubbele
  staander, een werfverbinding in de handregel (insteekmof of geboute lip, geen werflas op gecoat staal), een
  uitzetvoeg om de ± 6 à 8 m buiten, en een samenstellingstekening per sectie met de diagonaalmaat.

### P2-12 "Uitvoeringsklasse EXC2" op het lasblad
- **Waar:** `tekeningen.mjs:306`.
- **Wat:** het blad vermeldt EXC2 (EN 1090-2). Dat veronderstelt een gecertificeerde fabricagecontrole, een
  lascoördinator, lasmethodebeschrijvingen en gekwalificeerde lassers.
- **Waarom:** een starter die EXC2 op zijn tekening zet zonder dat systeem, belooft iets wat hij niet kan aantonen.
  Of een borstwering onder EN 1090-1 valt, is omstreden (meestal niet, als ze geen deel van de draagstructuur is):
  navragen bij Buildwise of het Belgisch Instituut voor Lastechniek.
- **Oplossing:** "EXC2" schrappen en vervangen door wat Ian wel kan waarmaken: lasproces 135, kwaliteitsniveau
  ISO 5817-C, lasser gekwalificeerd volgens ISO 9606-1 (hoeklas, 135), visuele controle 100 %.

### P2-13 Titelblok en tekenregels: niet volgens ISO 7200, 5455 en 128
- **Waar:** `blad.mjs:36-48`, `montage.mjs:230`, `tekeningen.mjs:153-176`.
- **Wat (gezien op de gerenderde bladen):**
  - Overzicht, stuklijst, bestellijst, berekening, plaatsing, boringen en lassen hebben alle zeven hetzelfde nummer
    "BA-1" en "Blad 1 / 1".
  - "Uitgifte" (datum) is leeg tenzij de pagina hem meegeeft; getekend door, goedgekeurd door en het documenttype
    ontbreken (verplichte velden in ISO 7200).
  - Schalen 1:15, 1:30, 1:40 en 1:2,5 bestaan niet in ISO 5455 (wel 1:10, 1:20, 1:50, 1:2, 1:5); er staan drie
    schalen in één veld.
  - "Doorsnede A-A" heeft geen snijlijn A-A in het aanzicht (ISO 128-3).
  - Voor gelaste samenstellingen is ISO 2768-m de verkeerde algemene tolerantie: daarvoor dient ISO 13920 (klasse B
    voor lengtes, F voor rechtheid). ISO 2768-m geldt voor de losse zaagstukken en laserdelen.
  - De eerste-hoekprojectie is juist (bovenaanzicht onder het vooraanzicht, symbool in het titelblok).
- **Oplossing:** doorlopende bladnummers "n / totaal" over het hele dossier, de datum altijd invullen, de ontbrekende
  velden toevoegen, de schaal afronden naar ISO 5455, de snijlijn tekenen en "gelast: ISO 13920-BF" toevoegen.

### P2-14 Er is geen samenstellingstekening met maten voor de lasmal
- **Waar:** `tekeningen.mjs:56-90` (vooraanzicht), `montage.mjs` (isometrisch, zonder schaal).
- **Wat:** het overzicht geeft de totale lengte, één h.o.h.-maat en de hoogte. De steek van de spijlen (107 mm), de
  eerste en de laatste tussenruimte, de hoogte van de onder- en bovenregel, de plaats van de klemgaten en de
  diagonaal staan alleen als tekst of nergens. Het montageblad zegt "latje van 95 mm" terwijl de opening 94,9 mm is.
- **Oplossing:** per sectie een gemaat vooraanzicht op schaal 1:10: steek, randopeningen, regelhoogtes, klemgaten,
  diagonaal, en de gecontroleerde opening (≤ 110) als controlemaat.

### P2-15 Prijs: het uurloon en de uren zijn te laag, vaste kosten ontbreken
- **Waar:** `prijzen.mjs:33` (uurloon 45, marge 30/30/25/15), `werkwijze.mjs:6-29`, `prijzen.mjs:22` en `:84`.
- **Wat (spijlen, 4 m, binnen, geplaatst):** 15,0 uur, materiaal € 454, kostprijs € 1 131, verkoop € 1 470 = € 367/m.
  De eigen marktbron (Urban Steel LANCO) staat op € 568/m geplaatst.
  - € 45/u is voor een zelfstandige lasser in België in 2026 een loon, geen kostprijs met werkplaats, bestelwagen,
    verzekering en sociale bijdragen (reken eerder € 55 tot 70/u; SCHATTING, bij een boekhouder navragen).
  - Niet in de uren: opmeten bij de klant, offerte en tekenwerk, twee ritten naar de coater of verzinkerij, laden en
    lossen, verplaatsing naar de werf, opruimen. Voor 4 m komt daar al gauw 5 tot 8 uur bij.
  - Plaatsen aan 1,5 u/m is voor één persoon; glas vraagt twee personen (de 0,4 u per plaat dekt dat niet).
  - Poedercoat aan € 30 per m² staaloppervlak: coaters rekenen hekwerk doorgaans per m² aanzicht of per strekkende
    meter; bij spijlen is het staaloppervlak (3,2 m² op 4 m) kleiner dan het aanzicht (4,4 m²). Het minimum van € 150
    vangt dat hier toevallig op; bij 12 m niet.
  - Glas in U-profiel met 15 % marge op € 2 240 kostprijs laat € 336 over voor het risico van een gebroken ruit.
- **Oplossing:** een vaste post per opdracht (opmeten, tekenen, transport: uren + km), het uurloon als
  kostprijs-uurtarief met uitleg, plaatsen met het aantal personen, coat per m² aanzicht, en een post "risico glas".

### P2-16 De klant is één klik verwijderd van het uurloon en de marge
- **Waar:** `presentatie/sjabloon.html:94-95`, `presentatie/app.mjs:43`.
- **Wat:** de knop "Instellingen" staat rechtsboven op de klantpagina en toont het uurloon en de marge. Ian toont dit
  op een tablet aan de klant.
- **Oplossing:** de instellingen achter een code of in een apart bestand voor Ian; op de klantversie alleen naam,
  contact en "prijs tonen".

### P2-17 De tests bevestigen de code, niet de norm
Zie het hoofdstuk "Wat de tests niet vangen" hieronder; ik tel het als één bevinding.

---

## P3: verbetering

1. **`bereken.mjs:16`:** de derde tak van `lasW` (plat profiel) geeft 2 · a · h² / 3; twee lijnen van lengte h hebben
   W = a · h² / 3. Nu dode code (geen enkele staander is plat), maar fout zodra iemand hem gebruikt.
2. **`werkwijze.mjs:46`:** de lasmaat in de tekst komt uit de voetplaatdikte (t / 2,5), de berekening en het lasblad
   uit de wanddikte (`keel`). Koker 40x40x4 op plaat 8: tekst a3, berekening a4. Eén functie gebruiken.
3. **`tekeningen.mjs:301-304`:** a3 rondom op koker 40x20x2 (wand 2 mm) en op plaat 3 mm is te zwaar (a ≤ 0,7 · t):
   doorbranden en kromtrekken. Daar a2 voorschrijven.
4. **`bereken.mjs:35`:** `maxAfstand` kent de puntlast niet. Bij de inox staander Ø48,3 is de puntlast maatgevend
   (89 % benut bij 790 mm, terwijl het doel 85 % is). De puntlast als ondergrens meenemen bij de profielkeuze.
5. **`bereken.mjs:10`:** de E-modulus van inox hangt aan `fy === 230`. Een eigen veld `E` in het profiel is veiliger.
   De las van inox wordt met fu = 360 en βw = 0,8 gerekend: voorzichtig, maar zeg het erbij.
6. **`normen.mjs:31`:** γM0 = 1,00 en γM2 = 1,25 zijn naar mijn weten ook de Belgische ANB-waarden; na één controle
   kan "AANNAME" daar weg.
7. **`bereken.mjs:132`:** de doorbuiging telt alleen de staander. De draaiing van de voetplaat en de ankers en de
   doorbuiging van de handregel horen erbij; de grens van 25 mm is bovendien een proefcriterium.
8. **`tekeningen.mjs:170`:** het overzicht van glas in U-profiel zegt "Afwerking: poedercoat" en "Staander:
   U-profiel"; het profiel is geanodiseerd en er zijn geen staanders.
9. **`onderdelen.mjs:41-42`:** inox 1.4301 buiten geeft vliegroest aan de kust en bij een zwembad; daar 1.4404 (316)
   aanbieden. De voetplaat en de rozet volgen dezelfde kwaliteit.
10. **`dossier.mjs:32`:** "incl. btw" rekent altijd 21 %. Voor een woning ouder dan 10 jaar geldt 6 % op geplaatst
    werk; een keuze toevoegen.
11. **Presentatie (desktop 1440 x 900):** het oordeel en de prijs staan onder de vouw; de stappen springen van 3 naar
    5 als er geen glas is; er is geen knop "offerte" met klantnaam, geldigheid en voorwaarden. Op gsm (390 px) werkt
    de pagina goed, zonder fouten in de console.
12. **`prijzen.mjs:134-139` en de test `qaBalustrades.test.ts:95-104`:** de marktband is een schatting en de test eist
    dat de prijs erin valt. Zo wordt de prijs naar de band getrokken in plaats van naar Ians kosten. De band tonen
    is goed; er niet op testen.

---

## Formules in `bereken.mjs` naast de norm

| Regel | Formule | Oordeel |
|---|---|---|
| 9 | fvw,d = fu / (√3 · βw · γM2) = 207,8 N/mm² | Juist (EN 1993-1-8 §4.5.3.3, S235, βw 0,8). |
| 16 | W van de las: koker a(bh + h²/3), buis π r² a | Juist; plat-tak fout (P3-1). Dwarskracht verwaarloosd: aanvaardbaar. |
| 17 | keel = wanddikte, 3 tot 5 mm | Aanvaardbaar; a = t op een koker is het maximum. |
| 23 | zij: z = 180 (anker op −60, draaipunt op −240) | Klopt met de console; de plaat is 230 hoog van −20 tot −250, het draaipunt ligt dus 10 mm lager dan getekend: verwaarloosbaar. |
| 26 | boven: z = b − 35, 2 ankers op trek | Aanvaardbaar. Geen bron voor het drukpunt op 10 mm van de rand (AANNAME, niet gemeld). |
| 35 | buiging: fy · W / (γM0 · γQ · q · arm) | Juist, elastisch (voorzichtig). Puntlast ontbreekt hier (P3-4). |
| 36 | doorbuiging: q · a · h³ / (3 E I) ≤ 25 mm | Formule juist; grens is een proefwaarde op 1 m (C2016 p. 17), toegepast op de volle hoogte: voorzichtig. Zie P3-7. |
| 38 | ankers: ψ · NRd · z · n / (γQ · q · arm) | Formule juist; ψ 0,75 en 0,6 zonder bron, NRd chemisch zonder bron, dwarskracht en randbreuk ontbreken (P1-5). |
| 45-49 | voetplaat: 6 N m / (beff t²) ≤ fy | Elastisch, voorzichtig. beff = b / n is een AANNAME zonder bron (niet gemeld). Zij: m = 30 vast (P2-6). |
| 97 | U-profiel: z = 45 (boven) en 60 (zij) | AANNAME (gemeld). De hele ankerkracht hangt lineair van deze maat af: uit de fiche halen. |
| 129-130 | MEd = γQ · max(q · a, Q) · arm | Juist; de puntlast is meegenomen. |
| 145 | handregel: γQ · q · a² / 8 | Onvolledig (P2-4); verticaal ontbreekt (P1-3). |
| 152-153 | glas uitkragend: σ = 6 (M / n) / t², arm = H − 100 | Voorzichtig (geen samenwerking). De inklemdiepte van 100 mm is een AANNAME uit M2023 ("± 100 mm"); het Smart-profiel uit de fiche nemen. |
| 154 | glasdoorbuiging met hef en ω = 0,3 | Formule hef juist (EN 16612); ω zonder bron en beslissend (P2-8). |
| 163 | glas in klemmen: σ = 6M / (hg · n · t²) | Te gunstig (P1-4). |
| 186 | muurplaat: V = F · √(1/4 + 1) | Zonder afleiding of bron; de factor 0,5 op VRd is een AANNAME (gemeld). In hout of metselwerk geldt de betonwaarde niet (P1-2). |
| `normen.mjs:41` | fg,d = 80 N/mm² | Aannemelijk voor gehard glas en een korte last (EN 16612 geeft ± 85); als AANNAME gemeld. Randsterkte en klemzones niet apart. |

Lijnlasten (`normen.mjs:20-28`): gecontroleerd tegen de ANB-fiche (12/2015), ze kloppen. De puntlast A = 0,5 kN komt
uit Contact 2016/4 p. 16 en klopt. De fiche zegt in voetnoot 2 "lijnlast op de beschermingshoogte"; de herziene norm
zegt 1000 mm. De volle hoogte nemen is het voorzichtigst: goed.

---

## Wat de tests niet vangen (`src/qa/qaBalustrades.test.ts`)

De 490 tests controleren dat het model niet crasht, dat de bladen geldige SVG zijn, dat de prijs in de marktband valt
en dat een handvol regels rood of niet rood geeft. Geen enkele test legt een rekenresultaat naast een met de hand
gerekende waarde. Niet gevangen:

1. **Geen referentieberekening.** Geen test zegt "koker 40x40x3, 990 mm, woning: σ = 161,8 N/mm²". Een fout in een
   formule of een eenheid blijft groen zolang het oordeel groen blijft.
2. **Ontbrekende controles** (wind, verticale last, vulling, driehoek trap, randafstand): een test kan niet falen op
   iets wat niet bestaat. Een lijst "verplichte controles per soort" met een test dat ze er alle zijn, vangt dat.
3. **Vrije afstand boven de grens** is groen (P2-5); de test op regel 123 kijkt alleen naar `auto`.
4. **Glasmaat** (P1-4): geen test op de grootste ruit.
5. **Trap:** de test op regel 127 kijkt naar de zaagsnede van de spijlen, niet of de voetplaat op een trede ligt
   (P2-1) en niet naar de valhoogte (P2-2).
6. **Artikel past bij het anker** (P2-7): geen test dat de diameter van het bestelde anker gelijk is aan `ANKER.d`.
7. **Bladnummers en titelblok** (P2-13): geen test op unieke nummers, een ingevulde datum of een ISO-schaal.
8. **Ontluchtingsgaten buiten** (P2-10): geen test dat een verzinkt stuk gaten heeft.
9. **Stuklengte ≤ staaflengte en sectiemaat** (P2-11): de positie "handregel L 12000" passeert.
10. **Tekst naast berekening:** geen test dat de lasmaat in de werkwijze gelijk is aan die in de berekening (P3-2) of
    dat "Randafstand ≥ 100" overeenkomt met de echte maat (P1-5).
11. **De prijstest is een cirkel** (P3-12): hij bewijst dat de prijs in een geschatte band valt, niet dat Ian eraan
    verdient. Een test "kostprijs ≥ materiaal + uren x tarief + vaste post" is nuttiger.
12. **De pagina's zelf:** de test rendert geen web of presentatie; een regressie in de klanttekst of een fout in de
    console wordt niet gezien (de map `e2e/tools` heeft daar voorbeelden voor).

---

## Aannames zonder bron die ik tegenkwam (overzicht)

Gemeld in de code als AANNAME (goed), maar bepalend voor de veiligheid en dus vóór de eerste verkoop te bevestigen:
hoogte 900 mm langs de trap; 50 mm onder de onderregel langs de trap; NRd van FIS V Plus (9 en 14 kN); de
randreducties 0,75 en 0,6; de hefboom 45 en 60 mm in het U-profiel; ω = 0,3; fg,d = 80; beff = glashoogte; alle
regels onder het schuine dak.

Niet gemeld als aanname, maar wel één: het drukpunt van de voetplaat op 10 mm van de rand (`bereken.mjs:26`);
beff = b / n voor de plaatbuiging (`:46`); staander 100 mm van de vloerrand (staat in EISEN, niet in de code als
bron); de formule van de muurplaat (`:186`); "opening ≤ 110 mm" met een bron die het niet zegt (P2-3).

## Voorstel van volgorde

1. P1-8 (de tekst) en P1-5 (de zin over de randafstand): een uur werk, haalt het grootste risico weg.
2. P1-2 (ondergrond) en P1-1 (wind): nieuwe invoer; tot dan oranje.
3. P1-3, P1-4, P1-6, P1-7: vier nieuwe controles in `bereken.mjs`, elk met een handberekening als test.
4. P2-10, P2-11, P2-13, P2-14: de tekeningen maakbaar maken voor buiten en voor lange lijnen.
5. P2-15 en P2-16: de prijs en de instellingen vóór Ian er een klant mee bezoekt.

---

## Status van de verwerking (2026-11-17)

Verwerkt door Claude (Opus 5.5) op 2026-11-17, niet gecommit. "gedaan" = volledig opgelost, met een test die faalt
zonder de oplossing (nagegaan: de nieuwe tests op de oude code van commit 27021d6 geven 54 van 54 rood). "deels" = een
deel staat er, of een bepalende waarde is nog een AANNAME. "niet" = niet gedaan.

| Punt | Wat | Status | Toelichting |
|---|---|---|---|
| P1-1 | Wind buiten | gedaan | EN 1991-1-4 + ANB: qp uit vb,0 (23/24/25/26 m/s per postcode, standaard 26), terrein 0-IV en hoogte; cp,net uit tabel 7.9, of cf 2,0 op een open vulling. Combinatie lijnlast + 0,6 · wind of wind + 0,7 · lijnlast op de staander, de las, de ankers, de voetplaat en het glas. **26,2 m/s staat in geen enkele Belgische bron: de ANB heeft een kaart van 23 tot 26 m/s.** kI = 1 en de ψ0 uit EN 1990 blijven AANNAME. |
| P1-2 | Ondergrond | gedaan | Invoer: draagvloer (beton, welfsel, hout, staal, metselwerk) en opbouw. De hef telt vanaf de draagvloer; boven 40 mm opbouw staat de voetplaat op de draagvloer. Ankertype per ondergrond. Een controle die oranje of rood geeft waar geen rekenwaarde bestaat (welfsel, hout, metselwerk). Hout wordt niet gerekend: rood, laten rekenen. |
| P1-3 | Verticale last op de handregel | gedaan | Qk,v = 1 kN uit Contact 2018/4: bron gevonden, dus geen AANNAME. Platstaal 50x8 vrij tussen de staanders is rood. G1 en H2 krijgen een koker 50x30x3. Spijlen en een plaat dragen de platte handregel; de spijl wordt dan op knik nagekeken. |
| P1-4 | Glas tussen klemmen | deels | Gedaan: rekenbreedte w/2, borgpen MOD 5015, klem MOD 2500 (de MOD 2100 is maar voor glas van 6-10 mm), oranje zonder attest, rood boven de maatgrens. **De maatgrens 1200 x 1000 mm / 1,2 m² is een AANNAME**: de tabel van Q-railing zit achter een account. Of de borgpen een gat in het glas vraagt, is ook een AANNAME. |
| P1-5 | Randafstand | gedaan | c = 100 mm voor de voorste ankers; het staanderhart staat op 100 + e (145 bij een plaat van 140). Dezelfde maat op het plaatsingsblad, het boringenblad en de doorsnede. Dwarskracht naar de rand volgens EN 1992-4. De reductie 0,75 blijft AANNAME. |
| P1-6 | Vulling onder 0,5 kN | gedaan | Spijl, staaf, regel, plaat en plint worden gerekend. S1 wordt Ø14; de plint wordt 4 mm. Vierkant 12 (S3) staat bij H 1100 op 93 % (oranje). |
| P1-7 | Driehoek langs de trap | gedaan | De ingeschreven cirkel telt als opening. Standaard volgt een trapplint van 4 mm de treden; een dichte trapboom kan ook. Glas in een U-profiel bovenop de treden blijft rood, want daar past geen plint: kies zijmontage. De grens van 110 mm voor de driehoek is AANNAME. |
| P1-8 | Conformiteitstekst | gedaan | De klant leest "Hoogte, openingen en beklimbaarheid volgens NBN B 03-004; sterkte voorberekend op ...", met de lijst van wat niet gecontroleerd is. Ian vinkt die lijst af in de werkplaats; pas dan staat er "nagekeken". |
| P2-1 | Trap: voetplaten op de treden | gedaan | Elke voetplaat ligt volledig op een trede: in het midden, of 70 mm van het uiteinde. De knikstaander staat op de laatste trede. De trede staat op het plaatsingsblad en het stukblad. |
| P2-2 | Valhoogte | deels | 1200 mm geldt nu ook langs de trap, en het vinkje staat in de presentatie. **De 900 mm langs de trap blijft een AANNAME** uit een secundaire bron. |
| P2-3 | Bron van 110 mm, spleet aan de vloerrand | deels | De bron zegt nu eerlijk AANNAME, en de spleet bij zijmontage telt als opening. Een betere bron dan de normtekst zelf is niet gevonden. |
| P2-4 | Handregel horizontaal | gedaan | max(q a²/8; Q a/4). De doorbuiging van de handregel telt op bij die van de staander. |
| P2-5 | Vrije staanderafstand | gedaan | Altijd getoetst aan de berekening en aan de grens van de soort; daarboven rood. De onderregel wordt onder de puntlast gerekend. Grens voor glas met staanders: 1250 mm. |
| P2-6 | Lasmodel zijmontage | gedaan | Afstandhouders op 40 en 210 mm, dus 170 mm uit elkaar. Koppel F = M / 170, las per afstandhouder en de wand van de staander, arm H + 40. |
| P2-7 | M10 buiten | gedaan | fisa10a4 en faz10a4 toegevoegd en gekoppeld; de meerprijs A4 volgt het juiste artikel. |
| P2-8 | Glas in een U-profiel | deels | Gedaan: ω = 0,1 (dus 1010.4 ook in een woning), de puntlast per plaat, de systeemhoogte ≤ 1100 mm. **ω = 0,1 en de 1100 mm zijn AANNAMES.** De ankersteek (250 mm) is niet uit de fiche van het profiel gehaald. |
| P2-9 | Glasbestelling | gedaan | 1B1 (EN 12600), EN ISO 12543 / EN 14449, EN 12150 en heat-soak EN 14179 staan op de bestelling, het stukblad en de offerte. Heat-soak zit in de prijs. |
| P2-10 | Ontluchtingsgaten | gedaan | In het model, op het stukblad en het boringenblad, en in de uren. Plaat buiten 4 mm, rondom doorgelast. |
| P2-11 | Secties, werfnaden, uitzetting | gedaan | Secties ≤ 3 m (instelbaar), werfnaad met lip en insteekmof, de handregel per sectie, buiten om de ± 6 m een uitzetvoeg, een samenstellingsblad per sectie. De grootste sectie (vervoer, zinkbad) is een SCHATTING: navragen. |
| P2-12 | EXC2 | gedaan | Geschrapt. Wel ISO 9606-1, ISO 5817-C en 100 % visuele controle; EN 1090 navragen. |
| P2-13 | Titelblok en tekenregels | gedaan | Doorlopende nummers en blad n / totaal over het hele dossier. Datum altijd ingevuld; velden opgesteld door, goedgekeurd door en documenttype. Alleen ISO 5455-schalen, snijlijn A-A, gelast ISO 13920-BF. |
| P2-14 | Samenstellingstekening | gedaan | Per sectie een gemaat vooraanzicht: staanderafstanden, regelhoogtes, spijlsteek, opening, klemgaten, diagonaal. Het latje op het montageblad volgt de echte opening. |
| P2-15 | Prijsmodel | gedaan | Het uurloon blijft € 45 (instelling). Opgeloste fouten: vaste post per opdracht, glas plaatsen met 2 personen, coaten per m² aanzicht (glas: per lopende meter), risico glas, heat-soak, inox 1.4404 buiten. Marktvergelijking: zie hieronder. |
| P2-16 | Klantmodus | gedaan | Presentatie: uurloon en marge achter een code. Web: klant.html, zonder werkplaats, instellingen en kostprijs. |
| P2-17 | Tests | gedaan | Handberekeningen naast de code: qp, cp,net, de combinatie, de staander (161,8 N/mm²), de ankers, de spijl, de handregel, het glas, de driehoek, de betonrand, de las. Een negatieve test per P1/P2. De cirkeltest op de marktband is weg. |
| P3-1 | lasW plat | gedaan | a h² / 3. |
| P3-2 | Lasmaat in de werkwijze | gedaan | Werkwijze, lasblad en berekening gebruiken keel(P). |
| P3-3 | a3 op dunne wanden | gedaan | a2 op wanden van 2-3 mm, a2,5 op plaat van 4 mm. |
| P3-4 | Puntlast in de profielkeuze | gedaan | Een profiel dat de puntlast niet haalt, valt af. |
| P3-5 | E van inox | gedaan | Eigen veld E in het profiel; de inox-las staat vermeld als voorzichtig gerekend. |
| P3-6 | γM0 volgens de ANB | niet | De Belgische ANB bij EN 1993-1-1 is niet ingezien: blijft AANNAME. |
| P3-7 | Doorbuiging | deels | De handregel telt mee. De draaiing van de voetplaat en de ankers niet; dat staat in de formule. |
| P3-8 | Overzicht U-profiel | gedaan | "alu geanodiseerd" en "geen (U-profiel)". |
| P3-9 | Inox buiten | gedaan | 1.4404 (316) buiten, + 25 % (SCHATTING). |
| P3-10 | Btw 6 % | gedaan | Keuze 21 of 6 % in de presentatie, de web en het dossier. |
| P3-11 | Presentatie | gedaan | Oordeel en prijs bovenaan (ook op 1440 x 900), stappen doorlopend genummerd. Knop Offerte met klant, werf, geldigheid en voorwaarden. |
| P3-12 | Cirkeltest op de prijs | gedaan | Vervangen door "kostprijs = materiaal + uren x uurloon, met de vaste post". |

**Telling (37 punten):** 31 gedaan, 5 deels (P1-4, P2-2, P2-3, P2-8, P3-7), 1 niet (P3-6).

**Marktvergelijking met de nieuwe prijs** (4,5 m, binnen, woning, uurloon € 45):

| Balustrade | Zonder plaatsen | Marktband | Geplaatst |
|---|--:|--:|--:|
| Spijlen Ø14 | € 387/m | € 200-400 | € 480/m |
| Spijlen Ø14, 4 m | € 416/m | € 200-400 | € 510/m (Urban Steel LANCO: € 568/m) |
| Glas 55.2 tussen kokers | € 550/m | € 300-450 | € 680/m |
| Glas 1010.4 in U-profiel met U-handregel | € 722/m | € 340-600 | € 836/m |

De glassoorten liggen nu boven de band. Redenen: dikker glas (ω = 0,1), heat-soak, risico glas, klemmen MOD 2500 met
borgpen, 2 personen bij het plaatsen, en de vaste post. Of Ian dat aanvaardt of zijn marge op glas verlaagt, beslist
hij zelf.

**Open beslissingen voor Ian:**
1. Uurloon € 45 als kostprijs-uurtarief. Met werkplaats, bestelwagen, verzekering en sociale bijdragen ligt het eerder op
   € 55-70 (SCHATTING): navragen bij een boekhouder.
2. Glas: de prijs boven de markt aanvaarden, of 88.4 in het U-profiel pas toelaten met een attest of tabel van Q-railing.
3. Deze AANNAMES laten bevestigen vóór de eerste verkoop:
   - ruitmaat en borgpen van de MOD 2500;
   - ω;
   - 900 mm langs de trap;
   - de randreductie 0,75;
   - kI en ψ0;
   - de grootste sectie (vervoer, zinkbad);
   - de handelslengtes van FIS A.
4. Navragen bij Buildwise of het BIL of EN 1090 geldt voor borstweringen.
5. De betalingsvoorwaarden in de offerte (nu "volgens afspraak").

**Niet groen:** `npm run typecheck` geeft 2 fouten, allebei ongebruikte imports:
- `src/app/slices/features.ts`;
- `src/core/features/buildPatterns.ts`.

Een andere agent bewerkt die bestanden; ze vallen buiten deze opdracht. De balustrades en hun test zijn foutloos.
