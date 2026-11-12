# Afzuiging: materiaalstaat

Welk materiaal, waarom, tot waar het mag en waar de cijfers vandaan komen. Wat hier niet uit een datablad komt, staat
als **aanname** aangeduid; de duurproeven horen bij `Vrijgave-en-meetplan.md`.

## Geprinte delen

| Onderdeel | Materiaal | Printstand | Belasting |
|---|---|---|---|
| Romp, bovenframe, instroomplaat (met het vingerrooster), ventilatorkuip, voedingsbox, deksel, adapterklemmen | PETG wit | zie de tabel in de README | licht; warmte in de box (rekenblad, hoofdstuk 5); de kuip draagt de ventilator (750 g) via de buffers en 4 x M3 |
| Klauwen (4 x) en knopklauwen (2 x, zwart) | PETG, 100 % vulling | plat, de moerkamer op het bed: de arm buigt in de laag | de enige blijvend belaste delen (rekenblad, hoofdstuk 6) |
| Knophouder, knopdeksel | PETG zwart | de plaat op het bed | licht; wordt aangeraakt met handschoenen |

**Filament:** Prusament PETG (Prusa Research, technisch datablad *PETG TechSheet*), of een PETG met een datablad dat
minstens dezelfde waarden haalt. Uit dat datablad (ISO 527-1, geprinte proefstaven):

| Eigenschap | Waarde | Gebruikt in |
|---|---|---|
| vloeigrens liggend / staand XY / over de lagen (Z) | 47 / 50 / 30 MPa | klauwberekening: 47 in de laag, 30 over de lagen |
| elasticiteitsmodulus | 1,5 GPa (Z 1,4 GPa) | |
| warmtevervormingstemperatuur (HDT, 0,45 MPa) | 68 °C | grens voor de lucht in de box: 60 °C |
| kruip | **niet gepubliceerd** (ook niet voor Eastman Eastar/Spectar) | **aanname:** blijvende spanning ≤ 1/5 van de vloeigrens = 9,4 MPa |

**Chemisch (Eastman Spectar-gegevens en de PETG-tabel van Brett Martin):**

| Middel | PETG | Wat het betekent |
|---|---|---|
| aceton (nagellakremover, gelremover) | **niet bestand**: zwelt, wordt rubberachtig (ca. 16 % gewichtstoename bij onderdompeling) | aceton nooit op de geprinte delen; een spat meteen droog deppen. Van bovenaf zie je alleen staal en een randje PETG van 2,5 mm. **Druppelzone (7.2):** wat door de sleuven van de plaat druppelt, valt op het filter en, naast het filter, op de instroomplaat en de rand van het bovenframe: dat is PETG. Hoe snel een druppel het aantast, meet poort M3 (acetonproef); tot dan: morsen = de procedure "Na morsen" |
| ethanol 50 % en 96 % | bestand (< 1 % verandering) | reinigen en ontsmetten met alcohol |
| propanol | bestand | |
| water met zeep | bestand | |

ABS en ASA lossen op in aceton en zijn dus geen beter alternatief. Een acetonbestendig printmateriaal (PP) is moeilijk
te printen en hecht niet met epoxy; het ontwerp lost het daarom op met de plaatsing: het staal ligt boven, het PETG
eronder of onder het blad.

## Lijm

**UHU plus endfest 300** (tweecomponentenepoxy, datablad UHU): voor de magneten, het bovenframe op de romp, de instroomplaat
en de messingbuisjes.

| Eigenschap | Waarde |
|---|---|
| gebruikstemperatuur | -40 tot +80 °C; boven ongeveer 60 °C daalt de sterkte sterk |
| afschuifsterkte (aluminium) | 12 N/mm² uitgehard bij kamertemperatuur, 17 N/mm² na 5 dagen |
| verwerkingstijd | 90 min |
| voorbehandeling | schuren met korrel 100, ontvetten met alcohol (**niet met aceton**: dat tast het PETG aan) |

PETG staat niet in de lijst van UHU (niet bij de geschikte en niet bij de ongeschikte kunststoffen): **lijmproef** bij de
vrijgave (poort M3: twee geschuurde PETG-strips, 24 uur uitharden, met de hand niet los te trekken; de magneet niet uit
zijn gat te wrikken).

## Rubber en foam

| Onderdeel | Materiaal | Grenzen |
|---|---|---|
| kussentjes op de klauwen (4 x 7,5 x 8 x 4 op de module, 2 x 6 x 6 x 3 op de knop) | neopreen (CR) Shore A 40 ± 5, gelijmd met secondelijm-gel (cyanoacrylaat hecht goed op neopreen en op geschuurd PETG) | -30 tot +90 °C; de veer volgt uit de hardheid (rekenblad, hoofdstuk 6). Geen losse siliconen voor de kussentjes: die hechten met geen enkele gewone lijm |
| afdichtlip rond het filter (150 x 200, 5 mm breed) | siliconenrubber 0,5 mm, Shore A 50 tot 60, **met fabriekskleeflaag** (de kleeflaag is voor siliconen gemaakt; op schoon, ontvet PETG) | -40 tot +200 °C; bestand tegen aceton en alcohol (zwelt kort, geen blijvende schade). Vervangen als ze gescheurd, gezwollen of los is |
| draagband onder het filter | zachte zelfklevende foamband 6 x 4 mm, EPDM-cel (tochtband) | draagt het filter alleen (de afdichting is de lip); vervangen als hij plat of gescheurd is |
| dichting van de kuip (7.2) | zelfklevende celband 6 x 2 mm, EPDM of neopreen | getekend 1,5 mm ingedrukt; vervangen als hij plat is (jaarlijkse controle) |
| rubberbuffers van de ventilator (7.2) | natuurrubber (NR) 55 Shore A, Ø15 x 10, M4 binnendraad (Erwin Halder EH 25150.0008: max. 200 N, veer ca. 80 N/mm) | -30 tot +80 °C (algemeen voor NR; na te kijken op het gekochte type); niet tegen olie en aceton |
| gat voor de aders in de kuip (7.2) | neutrale siliconenkit | luchtdicht; lost niet op in alcohol |

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
| rooster (lasersnede) | RVS 430 (1.4016), 1,5 mm, geborsteld: **magnetisch**, de plaat klikt op de magneten. 304 en 316 zijn niet magnetisch en vallen dus af. 430 is minder corrosievast dan 304: er kunnen vlekjes of roestpuntjes komen (vocht, zout van handen, chloor). Met een middel op alcohol reinigen en droog afnemen, geen chloor; vlekjes weg met een RVS-reiniger of een zachte schuurspons in de richting van het borstelpatroon (jaarlijkse controle, `onderhoud.mjs`) |
| persbouten (7.2) | PEM FH4-M3-6, RVS uit de 400-reeks, voor RVS-plaat tot HB 195 (430: zacht genoeg); door de lasersnijder ingeperst; de kop vlak met de plaat |
| schroeven en moeren | RVS A2 (DIN 7991, DIN 934) |
| meetbuisjes | messing Ø3 x 0,5 |

## Hout en mallen (7.2)

| Onderdeel | Materiaal | Grenzen |
|---|---|---|
| latten tussen de huiden van het blad | vuren, geschaafd, 28 x 44 (rond de module) en multiplex of beuken 10 x 30 (achter de box) | gelijmd met PU-lijm D4 of houtlijm D3 op de vezelplaat; droog binnen; de schroeven van de box draaien erin |
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
- UHU plus endfest 300, technisch datablad
- Schülke mikrozid AF liquid, productinformatie
