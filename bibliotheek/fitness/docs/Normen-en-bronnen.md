# Normen en bronnen: fitnesstoestellen (opgezocht op 2026-11-15)

De EN ISO 20957-normen zijn betalend. De waarden hieronder komen uit:
- gratis voorbeelden van de normtekst (iTeh);
- testrapporten die de clausules letterlijk citeren;
- de oude EN 957-1.

Wat in geen enkele publieke bron stond, staat als **AANNAME**. Dat staat ook zo in `normen.mjs` en in de berekening.
Koop de normen bij NBN om de aannames af te sluiten (zie onderaan).

## Bronnen

| Code | Bron | Link |
|---|---|---|
| A | ISO 20957-1:2024, gratis voorbeeld | https://cdn.standards.iteh.ai/samples/81908/34a0636bef484aefb5688ed70051548f/ISO-20957-1-2024.pdf |
| B | V-Trust-testrapport dat EN ISO 20957-1:2013 per clausule citeert | https://align-pilates.com/wp-content/uploads/2022/08/ce-test-c8-s-pilates-reformer.pdf |
| C | TÜV Rheinland-rapport, EN ISO 20957-1:2013 | https://www.levarecura.nl/wp-content/uploads/2023/03/DYACO-ST8700-Philips-4.0-T-EN-ISO-20957-1-EN-957-6-Test-Report-50253916-00....pdf |
| D | ISO 20957-2:2020, voorbeeld | https://cdn.standards.iteh.ai/samples/77100/b49b5195548240229348fdf70b46c0f2/ISO-20957-2-2020.pdf |
| E | ISO/FDIS 20957-2:2024, voorbeeld | https://cdn.standards.iteh.ai/samples/83392/5a2ada00dff14979a6ac67375c758c91/ISO-FDIS-20957-2.pdf |
| F | ISO 20957-2:2005, voorbeeld | https://cdn.standards.iteh.ai/samples/39904/a20c3fdfeede453f9d57adf67cd130a8/ISO-20957-2-2005.pdf |
| G | BS EN 957-1:1996+A1, volledige tekst | http://u.dianyuan.com/bbs/u/42/1150711498.pdf |
| H | ISO 20957-4:2016, voorbeeld | https://cdn.standards.iteh.ai/samples/66870/eea8faf5d4164c5d8e4388a2444f72e0/ISO-20957-4-2016.pdf |
| I | Fitgearsource, samenvatting van deel 4 | https://www.fitgearsource.com/fitness-equipment-standard-en957-4-for-strength-training-benches/ |
| J | Staalkabel 7x19, breukkracht (Ø5: 16,0 kN, Ø6: 23,1 kN, blank) | https://ducting-express.co.uk/attachments/product/2531/GS7190400100_7X19_Galvanised_Wire_Strand_Core.pdf |
| K | EN 1993-1-8 (bouten, pennen, lassen): ArcelorMittal Orange Book en steelcalculator | https://orangebook.arcelormittal.com/node/170 · https://steelcalculator.pages.dev/reference/en-1993-connection-design/ |

## EN ISO 20957-1 (algemeen)

| Onderwerp | Waarde | Bron | Status | Gebruikt in |
|---|---|---|---|---|
| Gebruiksklassen | H = thuis, S = studio/commercieel, I = commercieel en inclusief (ook S) | A §4.3 | bevestigd | thuis = H, pro = S |
| Maximale gebruikersmassa | uit de handleiding, minstens 100 kg | A §3.6 | bevestigd | thuis 120 kg, pro 150 kg (keuze) |
| Intrinsieke proeflast | F = 2,5 x lichaamsmassa, 5 min, op 300 x 300 mm | B/C §5.14.1 | bevestigd | proef 'intrinsiek' |
| Extrinsieke proeflast | F = (Gk + 1,5·G) · 2,5 · 9,81 N | C §5.14.2 | bevestigd | proef 'extrinsiek' |
| Stabiliteit: proef | op een hellend vlak, proefpersoon 100 kg, ongunstigste stand | B/C §6.2.1 | bevestigd | stabiliteit per belastinggeval |
| Stabiliteit: hoek | **10° in alle richtingen** (EN 957-1:1996: 10° bewegingsrichting, 5° anders) | G §6.3 | **AANNAME** voor de huidige versie | h · tan 10° ≤ afstand tot de kantelrand |
| Knel- en schaarpunten | afgeschermd of ≥ 60 mm vrij; 25 mm waar alleen vingers kunnen komen | B §5.3.3 | bevestigd | knelpunten (hefboom = oranje: nameten) |
| Vaste spleet | niet tussen 9,5 en 25 mm | B §5.3.4 | bevestigd | spleten |
| Zone knel- en intrekpunten | tot 1800 mm hoogte | B §5.7; G §5.2.3 | bevestigd | vingerbescherming katrollen < 1800 mm |
| Randen | lichaamsdragend r ≥ 2,5 mm; andere randen braamvrij | A §5.3.2 | bevestigd | werkwijze, stukbladen |
| Buisuiteinden | afgesloten; dop ≥ 20 N uittrekkracht | A §5.3.3 | bevestigd | eindkappen automatisch per open uiteinde |
| Duurproef | 12 000 cycli (H), 100 000 (S) | B §6.12 | bevestigd | info |

## EN ISO 20957-2 (krachttoestellen)

| Onderwerp | Waarde | Bron | Status |
|---|---|---|---|
| Plate-loaded, extrinsiek | F = S·(Wp + 1,5·Fa), S = 4 (S/I), 2,5 (H) | D §5.3.2.4 | bevestigd |
| Schijfhouder voor training | 6x (S/I), 4x (H) de maximale last | D/E | bevestigd |
| Opslagpen voor schijven | 4x (S/I), 2,5x (H) | D/E | bevestigd |
| Vanghaken geleide toestellen (Smith) | 6x (S/I), 4x (H) | D §5.3.2.5 | bevestigd |
| J-hooks en safety's van een rack | 6x / 4x zoals vanghaken | E §3.2 ('rack station') | **AANNAME** |
| Kabels, riemen en hun bevestiging | veiligheidsfactor 6 op de maximaal mogelijke trekkracht | B §5.6.1/6.6 | bevestigd |
| Maximaal mogelijke trekkracht | stapelgewicht / overbrenging; de versnelling zit in de factor 6 | - | **AANNAME** |
| Katroldiameter | huidige norm: volgens de kabelfabrikant; EN 957-1: D ≥ 18 x d | B §5.6.1; G §5.5.2 | bevestigd (oud ter vergelijking) |
| Intrekpunten katrollen | tot 1800 mm afschermen; afscherming draait niet mee; kabelgeleiding | B §5.6.3/5.7 | bevestigd |
| Gewichtstapel | ≥ 60 mm van onderdelen; H: omkasting of opening ≤ 75 mm; S achter de gebruiker: 3 of 4 zijden tot 60 mm boven het blok | F §5.4 (2005) | bevestigd 2005, **AANNAME** dat 2020/2024 gelijk is |
| Selectiepen | borging tegen onbedoeld losraken | B §5.5 | bevestigd |
| Doorbuiging | ≤ L/100, uitkragers ≤ L/150 | F §5.2 (2005) | **AANNAME** als gebruiksgrens |

## EN ISO 20957-4 (banken, 2016)

| Onderwerp | Waarde | Bron | Status |
|---|---|---|---|
| Zitting en rugleuning | volgens deel 1 (2,5 x en (Gk + 1,5G)·2,5) | H §5.6 | bevestigd |
| Halterhaak | voorlip 20-40 mm (stang Ø30), achterkant ≥ 80 mm hoger dan de lip | H §5.4 | bevestigd: J-hooks 22 mm lip, rug 98 mm hoger |
| Vrijstaande haltersteunen | moeten verankerd kunnen worden | H §5.3 | bevestigd: pro-racks met 4 keilbouten |
| Rotatiestabiliteit | 1 schijf aan één kant: 10 kg (H), 20 kg (S) | H §6.2 | bevestigd: belastinggeval bank |
| Kantelen bank met steunen | 40 kg (H), 50 kg (S/I) of de helft van de maximale last | I §6.3 | secundaire bron |

## Staal en verbindingen

| Onderwerp | Waarde | Bron |
|---|---|---|
| S235JR(H) | fy = 235, fu = 360 N/mm² (t ≤ 16 mm) | EN 10025-2, EN 10219-1 (**AANNAME**: niet in de norm nagekeken, algemeen bekend) |
| Hoeklas | fvw,d = fu / (√3 · βw · γM2) = 360 / (√3 · 0,8 · 1,25) ≈ 208 N/mm² | K (βw = 0,8) |
| Bout 8.8 | Fv,Rd = 0,6 · 800 · As / 1,25 (M12: 32,4 kN, M16: 60,3 kN) | K |
| Pen | Fv,Rd = 0,6 · A · fup / γM2 per snede; stuik Fb,Rd = 1,5 · t · d · fy | K (tabel 3.10) |
| Gekochte pull pin | fup = 500 N/mm² | **AANNAME** |
| Knik | kromme c (α = 0,49) voor koudgevormde buizen, Lcr = L (in een kader) of 2L (vrijstaand) | EN 1993-1-1 §6.3.1 |
| Staalkabel met mantel | Ø5 (kern 3,0): 539 kg = 5,29 kN; Ø6 (kern 4,0): 959 kg = 9,41 kN | gymparts.de (opgave winkel) |
| Keilbout M12 in beton | NRd ≈ 7,6 kN | **AANNAME** (zie de balustrades; nakijken in fischer FIXPERIENCE) |
| Zwaartepunt schijven op een houder | op 0,6 x de lengte van de houder | **AANNAME** |

## Vlakovaalbuis (v5)
- Koud gevormde vlakovaalbuis volgens EN 10219 (constructie) of EN 10305-5 (precisie), S235JRH / E235: twee vlakke zijden
  en halfronde kopse kanten met straal b/2. Doorsnede in `onderdelen.mjs` (`ovaal`): rechthoek b x (h-b) plus een
  cirkel Ø b, buiten min binnen.
- Maten 100x50x3 en 120x60x3 zijn gangbaar; 120x60x4 (pro) is AANNAME: navragen bij de buizenhandel, anders 120x60x3 met
  een inwendige strip 60x8 in het eerste armstuk: met 120x60x3 alleen komt de hefboomarm van FP-07 pro op 103 % (rood).
- Gaten alleen door de vlakke zijden (de controle meldt een gat in de ronde kant als 'hoekradius').

## Gaten en boutverbindingen

| Regel | Waarde in de controle | Bron |
|---|---|---|
| Bout en gat op dezelfde as | ≤ 0,5 mm tussen de as van de bout of pen en het hart van het gat, in elk stuk dat hij kruist | eigen keuze (boren met mal) |
| Speling bout | gat = M + 0,4 tot M + 2,6 mm; gekozen M12 → Ø14, M16 → Ø18 (EN 1090-2 normaal, ruimte voor lastoleranties) | ISO 273; EN 1090-2 |
| Speling pen | gat = pen + 0,4 tot pen + 2,1 mm (pen Ø16 → Ø17, Ø25 → Ø26) | ISO 273 naar analogie; eigen keuze |
| Lagerzitting | gat = buitenmaat glijlager - 0,1 tot + 0,5 mm (Ø28, Ø34, Ø47) | fabrikant flensglijlager (H7-zitting), AANNAME |
| Randafstand | ≥ 1,5 x Ø van het gat, gemeten tot de rand of het uiteinde | EN 1993-1-8 tabel 3.3 vraagt e1, e2 ≥ 1,2 d0; hier strenger |
| Hoekradius koker | het gat mag niet in de buitenhoekradius 2t vallen | EN 10219-2 (r = 2t voor t ≤ 6 mm) |
| Brug tussen gaten | ≥ 6 mm staal tussen twee gaten | AANNAME (werkplaats: boor loopt niet uit) |
| Steek boutgaten | p ≥ 2,2·d0 tussen boutgaten in hetzelfde stuk; Westside-pengaten (25/50 mm) vallen erbuiten (AANNAME, gangbaar in de sector) en de staander wordt met de netto doorsnede gerekend | EN 1993-1-8 tabel 3.3 |
| Boutlengte | klemlengte + 2 ringen + borgmoer + 2 gangen, afgerond naar de handelsmaat; afstandsbus in elke doorgeboute koker | DIN 931 / DIN 985 |
| Kopplaat | hart bout ≥ ringstraal + lasbeen a·√2 + 3 mm (M12: 20, M16: 24) | eigen keuze (ring en dop moeten passen) |
| Niet in de las | geen gat binnen keel + 3 mm van een lasnaad; het gat dat zelf de zitting van het gelaste deel is telt niet | eigen keuze |
| Westside | Ø17 (thuis, pen 16) op 25 mm in de bankzone en 50 mm elders; Ø26 (pro, pen 25) op 50 mm; gaten in een lasband, tegen een boutgat of te dicht bij het uiteinde vallen weg en staan op het stukblad | Westside-gatpatroon (Rogue, Titan) |

## EN 16630 (buitenfitness, v5 fase C)

EN 16630:2015 geldt voor permanent geïnstalleerde buitenfitnesstoestellen. De norm is gericht op gebruikers vanaf 14
jaar of vanaf 1,40 m. De norm zelf is betalend. Hieronder staan de waarden uit publieke samenvattingen; wat daar niet in
stond, is als AANNAME gemarkeerd.

| Regel | Waarde in de controle | Bron |
|---|---|---|
| Vrije valhoogte | hangen: greephoogte min 1 m (armlengte); bij een stang of ladder vanaf 2 m (muscle-up, op de stang zitten: klimzone) geen aftrek (v6); klimmen: hoogste voetsteun; staan: het staanvlak; maximaal 3 m | tolymp.de (samenvatting EN 16630 / EN 1176); **AANNAME** klimzone, Fable 5.2 P2-11 |
| Valruimte | X = 2/3·Y + 0,5 m rondom, minimaal 1,5 m | tolymp.de |
| Ondergrond | valdempend boven 1 m vrije valhoogte (zand/grind 300 mm, of rubbertegels EN 1177); de optie "valtegels" kiest de dikte naar de valhoogte: 45 mm tot 1,6 m, 60 mm tot 2,1 m, 80 mm tot 2,8 m | sportsequip.co.uk; tolymp.de (tegeldikte per valhoogte) |
| Openingen hoofd en nek | geen vrije opening tussen 89 en 230 mm tussen evenwijdige stangen, sporten en liggers | EN 1176-1 §4.2.7 (proefstukken C en D), **AANNAME** dat EN 16630 dezelfde grenzen gebruikt |
| Vingers | geen vrije opening tussen 8 en 25 mm tussen stangen, sporten, liggers en palen (eigen toets); afwateringssleuven 6 mm | sunshinegym.co.uk (samenvatting EN 16630); nameten op het eerste toestel |
| Greepdiameter | Ø 16-45 mm om te omvatten | EN 1176-1 §4.2.4.3, **AANNAME** zelfde grens |
| Belasting en stabiliteit | horizontaal 50 % van de gebruiker op greephoogte (zwaaien, kippen, vandalisme), x 1,5; poer 500 x 500 x 800 met de bovenkant op 200 mm: Mp = Kp·γ·b·(D³ − d³)/12, Kp = 3 | **AANNAME** (EN 16630 §4.2 nakijken); grondmechanica, Fable 5.2 P2-13 |
| Funderingen | palen 600 mm ingegoten in een poer 500 x 500 x 800, bovenkant 200 mm onder het maaiveld en afgeschuind; PE-manchet op de grondlijn; funderingsplan per toestel | EN 1176-1 §4.2.14, **AANNAME** dat EN 16630 hiernaar verwijst |
| Infobord | gebruikersleeftijd, oefeningen, noodnummer, beheerder | EN 16630 (samenvatting sportsequip.co.uk) |
| Strongman | proeflast 2,5 x de last; geen kantelproef voor losse werktuigen; een los werktuig weegt leeg ≤ de helft van zijn maximale last | **AANNAME**: strongman-werktuigen vallen buiten EN ISO 20957 |
| Verzinken | elke holle ruimte 2 openingen (open uiteinde of gat ≥ Ø8; palen 2 gaten Ø12 diagonaal); kopkap na het verzinken | EN ISO 1461, EN ISO 14713-2 |
| Keuring | buitentoestellen: keuring EN 16630 door een erkende instelling, AANNAME € 1.500-3.000 per type (in de prijs verdeeld over de reeks) | Fable 5.2 P2-27 |

## Selectorized (v6)

| Regel | Waarde | Bron |
|---|---|---|
| Nokstraal | R ≤ 220 mm (v6b). De nok van de merktoestellen is compact, ± 100-220 mm. De vorm volgt de krachtcurve. | **AANNAME**: opgave coördinator na beeldvergelijking met Hammer Strength, Life Fitness en Technogym; geen maat in een publieke bron gevonden. Cam met variabele straal: US-octrooien 4953855 en 5580341 (image-ppubs.uspto.gov) |
| Krachtverhouding | 2:1-takel. De nokriem trekt een losse katrol en de stapelkabel loopt eromheen. Riemkracht 2 x stapel, stapelslag 2·R·θ. Kracht aan de greep = 2 · stapel · R / L. | Nautilus Impact Leg Extension "1:1 weight ratio" ([productblad](https://shop.corehandf.com/cdn/shop/files/Leg_Extension_9NA-S1312_Nautilus_Impact_Product_Sheet.pdf)); SportsArt: 1:1 (2 handen) en 2:1 (1 hand) ([Status-catalogus](https://www.gosportsart.com/wp-content/uploads/in5-archives/Strength-Catalog-ENG/Strength/Status%20Series%20Catalog.pdf)) |
| Nokriem | aramide (kevlar), 25 x 3 mm, breukkracht ± 22 kN (factor 6 op 2 x de stapel); riemschijven Ø115, 8 kN | Nautilus Instinct: kevlarriem ([thefitnessoutlet.com](https://www.thefitnessoutlet.com/nautilus-instinct-leg-extension/)); breukkracht en schijf **AANNAME** |
| Kracht aan de greep | grens (kg bij de pro-stapel): druk 90, trek (lat, row) 100, rug 60, been 90, kuit 130, arm 45, romp 45; thuis 60 %, semi 80 % | **AANNAME** uit merktoestellen (Fable 5.2 P1-02: chest press 90-135 kg) |
| Stapel nokstation | thuis 20, semi 24, pro 28 platen van 5 kg (pro 140 kg: stapelkabel Ø6 met factor 6 en katrol A 3 kN op de grens) | gymparts.de, jk-sportvertrieb.de |
| Kabelstation | 2:1 als de halve stapel de grens haalt, anders twee kabels 1:1 | eigen regel |
| Lagerhuis | binnendiameter ≤ boring − 1,5 mm (uit te draaien tot H7, Ra 1,6) | Fable 5.2 P1-04 |
| Gebogen stukken | W x 0,85 in de bocht (buitenwand dunner, ovaal) | Fable 5.2 P2-16, **AANNAME** |
| Gezette plaat | uitslag met K = 0,4 (navragen bij de zetterij), Ri = 2 t | **AANNAME**, Fable 5.2 P1-11 |
| Toleranties | gelaste frames EN ISO 13920-BF, losse bewerkte stukken ISO 2768-m | EN ISO 13920, Fable 5.2 P2-21 |

Bronnen: [tolymp.de](https://www.tolymp.de/en/your-topics/),
[sportsequip.co.uk](https://www.sportsequip.co.uk/bsen16630-permanently-installed-outdoor-fitness-equipment),
[sunshinegym.co.uk](https://www.sunshinegym.co.uk/bs-en-16630),
[AS 16630:2021 (inhoud)](https://store.standards.org.au/product/as-16630-2021).

## Selectorized v7: kabels, kabelschijven en de grens

- Life Fitness Insignia Chest Press: stapel 260 lb / 130 kg (standaard), 305 lb / 152 kg (zwaar), live area 171 x 140 x 210 cm
  (lifefitness.com, catalogus Insignia Series Chest Press). Basis voor de grens druk 110 kg (± 85 %, AANNAME overbrenging).
- Staalkabel 8x19W met staalkern Ø8, 1770 N/mm²: MBF 40,3 kN (Mennens, productpagina 8x19W staalkern).
- Staalkabel 6x19 vezelkern Ø6, 1770 N/mm²: MBF 19,6 kN (Mennens / LKI-tabel).
- Rema RZ-0.5 (art. 3063001): kabel 5-6 mm, Ø150, werklast 500 kg met de hand, 250 kg mechanisch, € 73,25 excl. (klium.be).
  Rema RZ-1.0 (art. 3063003): kabel 8-10 mm, Ø235, 1000 kg met de hand, 500 kg mechanisch, € 99,51 excl. (klium.be).
  AANNAME: een fitnesstoestel is handbediend (spierkracht); de toets gebruikt de werklast met de hand, de kabel heeft factor 6.
- Overbrenging nok: de losse katrol op de stapel halveert de kracht aan de nok (stapel stijgt de helft van de kabelweg);
  voor 2 x de stapel aan de nok moet de losse katrol aan de kant van de nok zitten (geleid takelblok).

## v8: grens per oefening, buigradius per buigerij

**Grens (stapel x katrolverhouding, pro):** Nautilus Impact productbladen (https://www.corehandf.com/cdn/shop/files/Product_<Naam>_Impact_Nautilus_Product_Sheets.pdf), elk met "pulley ratio 1:1":

| Soort | Toestel | Stapel |
|---|---|---|
| druk | Chest Press 9NA-S4301, Shoulder Press 9NA-S4307, Dip 9NA-S5303 | 130 kg |
| trek | Lat Pull Down 9NA-S3305 | 130 kg |
| rug | Low Row 9NA-S3306, Vertical Row 9NA-S3301 | 130 kg |
| been | Leg Extension 9NA-S1312, Seated Leg Curl 9NA-S1313 | 130 kg (Leg Curl 90 kg) |
| kuit | Standing Calf 9NA-S1309 | 130 kg |
| arm | Biceps Curl 9NA-S5301, Tricep Extension 9NA-S5302 | 90 kg |
| romp | Abdominal 9NA-S6301 | 65 kg |
| lage rug | Low Back 9NA-S3302 | 130 kg |

Ter vergelijking (verhouding niet opgegeven): Life Fitness Insignia Chest Press en Leg Extension 130/152 kg, Torso Rotation 85/100 kg; Hammer Strength Select Lat Pulldown 295 lb; Cybex Prestige Lat Pulldown 245/305 lb; Matrix Ultra Calf 135/180 kg; Technogym Selection 900 Leg Press 190/250 kg; Body-Solid GLP-STK 2:1 (210 lb geeft 420 lb). AANNAME: met een nok is de gemiddelde verhouding aan de greep ± 1:1; thuis 60 % en semi 80 % (geen merkdata).

**Buigradius (centerline), publieke tabellen:**
- Biegetechnik Sachsen, doornbuigen: rond Ø26,9-42,4 R100, Ø48,3 R150; vierkant 40x40x3 R80, 50x50x4 R145.
- Biegetechnik Sachsen, rondwalsen S235: rond tot Ø88,9 R305; vierkant 40-60 R500; rechthoek zware as 40x20-80x40 R1000, lichte as tot 120x40 R500.
- Rogue Fab, rotary draw zonder doorn: vierkant 25,4-31,8 R114, 38,1 R152; rond 38,1 R89, 44,5 R114.
- Geen publieke tabel gevonden voor koker 60x60-80x80, 100x50, 120x60 en voor vlakovaal: die bochten krijgen in de berekening "offerte bij de buigerij".

**Kantbank (binnenradius Ri, staal):** 247TailorSteel (t 1 / 1,5 / 2 / 3 / 4 / 5 / 6 / 8: Ri 1,4 / 1,65 / 1,88 / 2,75 / 3,02 / 3,62 / 4,62 / 8) en Bystronic (V = 6-8 t: Ri 1,2 / 2 / 2,5 / 3,5 / 6 / 8 / 8 / 9,5). De zetterij krijgt de buitenmaten.

## Wat nog open is

- **Stabiliteit:** de hellingshoek (10°) in EN ISO 20957-1:2013/2024.
- **Gewichtstapel:** de afschermingseisen in deel 2:2020/2024 (§5.4).
- **Rack:** of J-hooks en safety's van een rack onder de factor 6x/4x vallen.
- **Hefbomen:** de knelpunten tussen hefboom en frame (≥ 60 mm of ≤ 25 mm) worden op het eerste toestel nagemeten. Daarom
  staan alle plate-loaded machines in de berekening op oranje.
- **Ankers:** de waarden moeten nagerekend worden met de echte vloer of muur.
