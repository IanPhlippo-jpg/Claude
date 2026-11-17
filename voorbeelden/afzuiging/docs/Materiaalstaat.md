# Afzuiging: materiaalstaat

Revisie: versie 7.4 (2026-11-17), zie `revisie.mjs`. Welk materiaal, waarom, tot waar het mag en waar de cijfers vandaan
komen. Wat hier niet uit een datablad komt, staat als **aanname** aangeduid; de duurproeven horen bij
`Vrijgave-en-meetplan.md`.

## Geprinte delen

Printbed: hoogstens 230 x 230 mm (7.4). Daarom is het bovenframe uit 4 latten opgebouwd (gelijmd) en heeft de
voedingsbox een rand van 5 mm (box 220 breed).

| Onderdeel | Materiaal | Printstand | Belasting |
|---|---|---|---|
| Romp, ventilatorkuip, voedingsbox, deksel | PETG wit | zie de tabel in de README | licht; warmte in de box (rekenblad, hoofdstuk 5); de kuip draagt de ventilator (750 g) star op 4 geprinte bussen, met 8 ribben verstijfd (7.4: geen rubberbuffers meer), en hangt met 4 x M3 aan de romp; lamellen 2,5 mm dik (stootproef in W1) |
| Bovenframe (4 latten) en instroomplaat (met het vingerrooster en de instroomtuit) | PETG wit; **PA12-CF of PET-CF overwogen** (7.4, druppelzone, zie "Chemisch") | zie de tabel in de README | licht; aceton van boven (druppelzone) |
| Adapterklemmen (7.4) | **PA12-CF** (was PETG) | zie de tabel in de README | warm: ze liggen op de behuizing van de adapter (advies v1, P2-7). Grens op het contactvlak: ≥ 10 °C onder de warmtevervormingstemperatuur uit het datablad van het gekochte PA12-CF; poort E1 meet met een thermokoppel |
| Klauwen (4 x) en knopklauwen (2 x, zwart) | PETG, 100 % vulling | plat, de moerkamer op het bed: de arm buigt in de laag | de enige blijvend belaste delen (rekenblad, hoofdstuk 6). Open beslissing van Ian: een vaste aanslag of een klauw van 8 mm in PA-CF |
| Knophouder, knopdeksel | PETG zwart | de plaat op het bed | licht; wordt aangeraakt met handschoenen |

**Filament PETG:** Prusament PETG (Prusa Research, technisch datablad *PETG TechSheet*), of een PETG met een datablad dat
minstens dezelfde waarden haalt. Uit dat datablad (ISO 527-1, geprinte proefstaven):

| Eigenschap | Waarde | Gebruikt in |
|---|---|---|
| vloeigrens liggend / staand XY / over de lagen (Z) | 47 / 50 / 30 MPa | klauwberekening: 47 in de laag, 30 over de lagen |
| elasticiteitsmodulus | 1,5 GPa (Z 1,4 GPa) | |
| warmtevervormingstemperatuur (HDT, 0,45 MPa) | 68 °C | grens voor de lucht in de box: 60 °C; niet voor delen die de adapter raken (daarom PA12-CF voor de klemmen) |
| kruip | **niet gepubliceerd** (ook niet voor Eastman Eastar/Spectar) | **aanname:** blijvende spanning ≤ 1/5 van de vloeigrens = 9,4 MPa |
| brandgedrag | niet vlamdovend (geen UL94 V-0 op het datablad) | risicoanalyse, rij 18 |

**PA12-CF en PET-CF (7.4):** nylon 12 of PET met korte koolstofvezels; printen in een gesloten printer met een geharde
nozzle (de Centauri Carbon is daarvoor gemaakt), filament droog bewaren (PA12 neemt vocht op). Waarden (HDT, sterkte,
chemische bestendigheid) uit het datablad van het gekochte filament overnemen: **nog niet ingevuld**.

**Chemisch (Eastman Spectar-gegevens en de PETG-tabel van Brett Martin):**

| Middel | PETG | Wat het betekent |
|---|---|---|
| aceton (nagellakremover, gelremover) | **niet bestand**: zwelt, wordt rubberachtig (ca. 16 % gewichtstoename bij onderdompeling) | aceton nooit op de geprinte delen; een spat meteen droog deppen. Van bovenaf zie je alleen staal en een randje van 2,5 mm van het bovenframe. **Druppelzone (7.2):** wat door de sleuven van de plaat druppelt, valt op het filter en, naast het filter, op de instroomplaat en de rand van het bovenframe. Hoe snel een druppel het aantast, meet poort M3 (acetonproef); tot dan: morsen = de procedure "Na morsen" |
| ethanol 50 % en 96 % | bestand (< 1 % verandering) | reinigen en ontsmetten met alcohol |
| propanol | bestand | |
| water met zeep | bestand | |

ABS en ASA lossen op in aceton en zijn dus geen beter alternatief. Beter bestand tegen aceton zijn PP (moeilijk te
printen, hecht slecht) en de vezelversterkte materialen **PA12-CF en PET-CF** (7.4, advies v1 P3-19): polyamide en het
kristallijne PET verdragen ketonen volgens de algemene tabellen beter dan het amorfe PETG (**aanname**, niet uit het
datablad van een gekocht filament). Daarom worden het bovenframe en de instroomplaat, de delen in de druppelzone, in
PA12-CF of PET-CF overwogen; poort M3 legt coupons van beide naast PETG in de acetonproef en beslist. Tot dan blijft de
plaatsing de maatregel: het staal ligt boven, het geprinte materiaal eronder of onder het blad.

## Lijm

**MMA-lijm (methacrylaat, tweecomponenten) voor kunststoffen** (7.4, advies v1 P3-11; was epoxy UHU plus endfest 300):
voor de magneten, het bovenframe (de 4 latten en de verbinding met de romp), de instroomplaat en de messingbuisjes.
Epoxy hecht op PETG onzeker (PETG staat niet in de lijst van UHU) en de celband van de kuip duwt blijvend tegen de
gelijmde instroomplaat (pelbelasting); een MMA-lijm voor kunststoffen is daar beter voor geschikt.

| Eigenschap | Waarde |
|---|---|
| type | een MMA-lijm waarvan het datablad PET of PETG (en, als die gekozen worden, PA of composieten) als geschikte ondergrond noemt; merk en datablad bij de aankoop vastleggen (**nog niet gekozen**) |
| gebruikstemperatuur | uit het datablad; nodig: tot 60 °C (lucht in de box) |
| voorbehandeling | volgens het datablad; in elk geval stofvrij en ontvet met alcohol (**niet met aceton**: dat tast het PETG aan) |
| veiligheid bij het lijmen | methacrylaten kunnen bij huidcontact allergie geven en ruiken sterk: nitrilhandschoenen, goed ventileren (risicoanalyse, levensfase montage) |

**Lijmproef** bij de vrijgave (poort M3: twee geschuurde PETG-strips, 24 uur uitharden, met de hand niet los te trekken;
de magneet niet uit zijn gat te wrikken; dezelfde proef op PA12-CF of PET-CF als die gekozen worden).

## Inserts (7.4)

**Messing inserts M3 (heat-set)** in de romp, voor de schroeven die bij het onderhoud los en vast gaan (advies v1,
P3-9; eerder rechtstreeks in een gat Ø2,5 in PETG met een wand van 1,5 mm). Inpersen met een soldeerbout met een
passende punt, recht en tot vlak met het oppervlak. Maat en gat volgens het model en de opgave van de leverancier van
de insert. Poort M2 controleert: 10 keer los en vast zonder doordraaien.

## Rubber en foam

| Onderdeel | Materiaal | Grenzen |
|---|---|---|
| kussentjes op de klauwen (4 x 7,5 x 8 x 4 op de module, 2 x 6 x 6 x 3 op de knop) | neopreen (CR) Shore A 40 ± 5, gelijmd met secondelijm-gel (cyanoacrylaat hecht goed op neopreen en op geschuurd PETG) | -30 tot +90 °C; de veer volgt uit de hardheid (rekenblad, hoofdstuk 6). Geen losse siliconen voor de kussentjes: die hechten met geen enkele gewone lijm |
| afdichtlip rond het filter (150 x 200, 5 mm breed) | siliconenrubber 0,5 mm, Shore A 50 tot 60, **met fabriekskleeflaag** (de kleeflaag is voor siliconen gemaakt; op schoon, ontvet PETG) | -40 tot +200 °C; bestand tegen aceton en alcohol (zwelt kort, geen blijvende schade). Vervangen als ze gescheurd, gezwollen of los is |
| draagband onder het filter | zachte zelfklevende foamband 6 x 4 mm, EPDM-cel (tochtband) | draagt het filter alleen (de afdichting is de lip); vervangen als hij plat of gescheurd is |
| dichting van de kuip (7.2) | zelfklevende celband 6 x 2 mm, EPDM of neopreen | getekend 1,5 mm ingedrukt; vervangen als hij plat is (jaarlijkse controle) |
| doorvoer van de aders in de kuip (7.4: achteraan in de wand, naar de dode ruimte van de romp) | neutrale siliconenkit, met een tie-wrap als trekontlasting | luchtdicht; lost niet op in alcohol; de tussenstekker Molex Micro-Fit 3.0 (4-polig) zit in de romp, zodat de ventilator zonder solderen los kan |

De rubberbuffers van 7.2 (natuurrubber Ø15 x 10, M4) vervallen in 7.4: hun dwarse en kantelende eigenfrequenties
lagen binnen het werkgebied van 13 tot 65 Hz (advies v1, P2-2). De ventilator staat star op 4 geprinte bussen; poort
G1 meet de trillingen.

## Filter

Interieurfilter MANN CU 20 013 (of gelijk, zie de README): polyester- of polypropeenvlies, geplooid, met zijstroken.
Het hoeft niet tegen ontsmettingsmiddelen te kunnen: het wordt vervangen, niet gereinigd.

## Magneten

Neodymium N42 (NdFeB, Ni-Cu-Ni-coating), schijf Ø8 x 1,5. Gewone N-kwaliteiten verliezen blijvend kracht boven
ongeveer 80 °C. In het frame onder de RVS-plaat bij kamertemperatuur: ruim binnen de grens. Niet kiezen: N50/N52 (bij
sommige leveranciers maar tot 60 °C).

## Metaal

| Onderdeel | Materiaal |
|---|---|
| rooster (lasersnede) | RVS 430 (1.4016), 1,5 mm, geborsteld: **magnetisch**, de plaat klikt op de magneten. 304 en 316 zijn niet magnetisch en vallen dus af. 430 is minder corrosievast dan 304: er kunnen vlekjes of roestpuntjes komen (vocht, zout van handen, chloor). Met een middel op alcohol reinigen en droog afnemen, geen chloor; vlekjes weg met een RVS-reiniger of een zachte schuurspons in de richting van het borstelpatroon (jaarlijkse controle, `onderhoud.mjs`). **Randen (7.4):** alle randen braamvrij (ISO 13715), bovenzijde gebroken 0,2 tot 0,5 mm, braamzijde onder; zo op tekening AFZ-03 en in de bestelling |
| persbouten (7.2) | PEM FH4-M3-6, RVS uit de 400-reeks, voor RVS-plaat tot HB 195 (430: zacht genoeg); door de lasersnijder ingeperst; de kop vlak met de plaat |
| inserts (7.4) | messing, M3, heat-set (zie "Inserts") |
| schroeven en moeren | RVS A2 (DIN 7991, DIN 934); de ventilator met 4 x M4 in de motor (schroefdiepte 4 tot 6 mm volgens de datasheet) |
| meetbuisjes | messing Ø3 x 0,5 |

## Hout en mallen (7.2)

| Onderdeel | Materiaal | Grenzen |
|---|---|---|
| latten tussen de huiden van het blad | vuren, geschaafd, 28 x 44 (rond de module) en multiplex of beuken 10 x 30 (achter de box) | gelijmd met PU-lijm D4 of houtlijm D3 op de vezelplaat; droog binnen; de schroeven van de box draaien erin. Eerst het proefgat (poort B2): de binnenkant van LAGKAPTEN is onbekend |
| massief blad (eerste keuze voor een salon, 7.4) | multiplex 30 mm | IKEA verkoopt LAGKAPTEN voor huishoudelijk gebruik; met een massief blad vallen de latten weg |
| freesmallen | MDF 12 mm, lasergesneden | alleen gereedschap; vlak en droog bewaren |

## Reinigen en ontsmetten

**Schülke mikrozid AF liquid** (alcoholisch oppervlakteontsmettingsmiddel zonder aldehyden; per 100 g 25 g ethanol en
35 g 1-propanol). Volgens Schülke goed verdragen door metalen en kunststoffen, behalve alcoholgevoelige kunststoffen
zoals acrylglas. Beide alcoholen zijn voor PETG "bestand" (tabel hierboven). Sproeien op een doek, niet in het rooster
(de vloeistof loopt anders op het filter; zie de morsroute in `Vrijgave-en-meetplan.md`).

Gelijkwaardig: elk ontsmettingsmiddel op basis van ethanol of propanol zonder aceton, ketonen of chloor.

## Bronnen

- Prusament PETG TechSheet (Prusa Research)
- Eastman, chemische bestendigheid Spectar/Eastar copolyester; Brett Martin, chemical resistance PETG
- UHU plus endfest 300, technisch datablad (tot 7.3; PETG staat niet in de lijst)
- MMA-lijm, PA12-CF en PET-CF: datablad van het gekozen product (nog bij het dossier te leggen)
- Schülke mikrozid AF liquid, productinformatie
- ISO 13715 (randen van werkstukken)
