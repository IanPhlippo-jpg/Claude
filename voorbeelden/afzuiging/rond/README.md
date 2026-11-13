# Afzuiging helemaal rond (vergelijkingsmodel naast 7.3, 2026-11-13)

Op vraag van Ian: "maak ook eens een helemaal rond model van de afzuiging dat ik kan vergelijken". Dit is een
vergelijkingsmodel; versie 7.3 (`../Afzuiging.kcad`) blijft het ontwerp en is niet gewijzigd.

![Rooster rond](laser/rooster-rond-voorbeeld.png)

## Keuzes

- **Filter: een ringfilter Ø175 / Ø120 x 55 (luchtfilter met radiale stroming).** De lucht gaat van buiten naar binnen
  door de plooien en valt door de kern recht in het oog van de ventilator (Ø131). Een dekseltje van PETG (Ø150) sluit de
  kern bovenaan af, onder het logo. Het rechthoekige CU 20 013 (195 x 145) vraagt in een rond huis binnen Ø245 en een
  frame van ongeveer Ø265: dan past de romp niet meer op het bed (≤ 230) en moet ze in drie stukken. Een rond, plat
  pollenfilter heb ik niet gevonden.
  - Gevonden met exact deze maat: Engel Imports, art. 1943, "round air filter element", buiten 175, binnen 120, hoogte 55,
    $ 14,68 (engelimports.com, pagina MGC 1967-1969 "carburettor and air filter", november 2026). Merk, papiersoort en
    een MANN- of Bosch-nummer staan er niet bij. **Eerst bevestigen** (maat en een Europese leverancier) voor je iets
    bouwt; de maten staan bovenaan in `maak-rond.mjs` (`R.filter`) en een ander ringfilter van Ø170-180 x 50-56 past met
    een kleine aanpassing.
- **4 klauwen** op 45°, 135°, 225° en 315°: dezelfde klauw, hetzelfde rubber en dezelfde moer als 7.3, en het frame wordt
  elke 90° aangedrukt (koorde 141 mm). Met 3 klauwen zou de rand tussen twee klauwen over 172 mm vrij liggen; 4 geeft
  ook dezelfde bestellijst.
- **Diameter:** frame en RVS-plaat Ø228 (≤ 230 van het bed), romp Ø216, uitsparing Ø218.
- **Uitlijnen van het logo:** een ronde plaat kan draaien. Het frame heeft achteraan een nok met een gat Ø3,2 voor één van
  de drie persbouten: de plaat ligt pas plat als je ze zo draait dat de bout in het gat valt. Ze kan maar in één stand
  liggen (bij 7.3 past de plaat ook 180° gedraaid).
- **Romp ondersteboven printen** (het bovenvlak op het bed): de torens van de klauwen eindigen op de instroomplaat en
  hebben dan geen overhang; de richel waartegen de plaat gelijmd wordt en de pootjes van de kuip lopen onder 45°.
- **Geen M8-inbouwbus in de module:** tussen de kuip (Ø189) en de wand (Ø208) is maar 9,5 mm, een binder 718 is 13 mm
  diep. De vier aders gaan zoals in 7.3 door het gat in de bodem van de kuip (kit) naar een **M8-kabelbus** (binder 718,
  veldmonteerbaar, ca. € 10); het slangetje van de drukmeting loopt door de open spleet onder de instroomplaat.
- **Meetpunt:** de schone kant is hier alleen de kern. Een kanaaltje van 1,5 x 2 mm in de instroomplaat (5 mm dik) loopt van
  de rand van het gat naar het messingbuisje op r 101 achteraan, onder de plaat en buiten de kuip.
- Ongewijzigd uit 7.3: de kuip, de ventilator San Ace C175 op de 4 rubberbuffers, de kuipdichting, de uitblaas opzij
  (weg van de voedingsbox), het vingerrooster (14 ribben, alle spleten ≤ 5,6 mm), de klauw, de knop, de voedingsbox en de
  elektronica. De kuip en de ventilator hangen 18 mm lager.

## Vergelijking met 7.3

| | 7.3 (vierkant van boven) | rond |
|---|---|---|
| Van boven | frame en RVS-plaat 222 x 222, hoeken R6 | frame en RVS-plaat Ø228 |
| Uitsparing in het blad | 212 x 212, hoeken R6 (MDF-mal 217 x 217) | Ø218 (MDF-mal met opening Ø223, `laser/freesmal-rond-mdf.dxf`; kopieerring Ø17, frees Ø12). Een gatzaag van Ø218 bestaat niet als gewone maat (meestal tot Ø210): frezen |
| Romp | 210 x 210 x 70 | Ø216, wand tot 69 diep, pootjes tot 88 |
| Diepte onder een blad van 34 | romp 36, rand van de kuip 76, midden van de bodem **102** | wand 35, pootjes 54, rand van de kuip 94, midden van de bodem **120** (+18) |
| Open oppervlak rooster | 221,5 cm² (151,0 boven het filter) | 178,3 cm² (96,7 buiten het deksel, 81,6 boven het deksel: die lucht gaat eerst opzij door een spleet van 3,5 mm) |
| Filter | MANN CU 20 013, 195 x 145 x 30, pollenfilter, € 6-14, overal te koop | ringfilter Ø175 / Ø120 x 55, motorluchtfilterpapier, ca. € 14 (Engel Imports art. 1943, nog te bevestigen) |
| Plooi-oppervlak (geschat) | ca. 0,35 m² | ca. 0,3 m² (125 plooien x 2 x 25 x 50 mm) |
| Drukverlies schoon | 55-115 Pa bij 250 m³/h (literatuur, rekenblad) | **geschat** 70-200 Pa bij 200 m³/h (papier van een motorluchtfilter, 300-600 l/m²s bij 200 Pa: aanname, niet gemeten). Het papier vangt grof stof en vijlsel beter dan een pollenfilter, het is geen HEPA |
| Afdichting rond het filter | foamband + siliconenlip | foamband onder de onderste eindkap en celband onder het deksel; de onderdruk drukt deksel, filter en foam op elkaar. **Geen lip: te meten** (L1/L3) |
| Geprint, massief (PETG 1,27) | romp 375, kuip 205, instroomplaat 246, frame en klauwen ca. 35: ca. 860 g | romp 310, instroomplaat 220, kuip 205, filterdeksel 51, frame 24, klauwen 4: **814 g** (met 40 % vulling ongeveer twee derde) |
| Grootste geprinte deel | voedingsbox 225 (module: frame 222) | romp en frame Ø216 / Ø228 (voedingsbox ongewijzigd 225) |
| Klauwen | 4, in de hoeken; M5 x 70, de punt 6,5 mm in een blind gat | 4, op de diagonalen; **M5 x 65**, de punt maar 1,5 mm in het blinde gat (9 mm geleiding boven het kanaal blijft) |
| RVS-plaat | 325 g, 4 persbouten | 265 g, 3 persbouten (één in de nok) |

### Voordelen van rond

- Van boven één cirkel: past bij de ronde knop, geen hoeken om vuil in te vegen.
- Rond frezen is één doorlopende gang langs de mal, zonder hoekradius; de latten (4 x 28 x 44, een vierkant van 150 binnen
  en 238 buiten) worden mee doorgefreesd, zodat de rand van het gat overal in hout zit.
- De plaat kan maar in één stand: het logo staat altijd recht.
- Het ringfilter heeft geen verdeelruimte nodig: de kern ligt recht boven het oog van de ventilator.
- Ongeveer 45 g minder PETG, en de romp is kleiner van onderen (de wand stopt bij de instroomplaat, de uitblaas is vrijer).

### Nadelen van rond

- **18 mm dieper** (120 in plaats van 102 onder een blad van 34): het filter van 55 mm staat boven de ventilator.
- **Het filter is geen gewoon onderdeel:** een ringfilter van deze maat is een oud carburateurfilter; het CU 20 013 ligt in
  elke autowinkel. Dat is het grootste nadeel.
- **Minder open rooster** (178 in plaats van 221 cm²) en de lucht boven het logo moet eerst opzij onder de plaat door.
  De vangst op 10 cm zal ongeveer gelijk zijn (de opening is kleiner, de luchtsnelheid erin iets hoger), maar dat is
  niet gemeten.
- Het stof valt van de plooien naar onder in de ringspleet: bij elke filterwissel de spleet uitzuigen.
- De afdichting van het filter hangt aan de onderdruk (geen lip); de M5 is minder diep geleid; geen M8-bus aan de module.

## Bestanden

| Bestand | Wat |
|---|---|
| `Afzuiging-rond.kcad` | assemblage: de ronde module met de knop en de voedingsbox van 7.3 |
| `Romp-rond.kcad`, `Bovenframe-rond.kcad`, `Instroomplaat-rond.kcad`, `Filterdeksel.kcad` | nieuwe geprinte delen |
| `Rooster-LB-rond.kcad`, `laser/rooster-rond.dxf` | de ronde RVS-plaat (lasersnede, rapport in `laser/rooster-rond.loops`) |
| `Ringfilter-175x120x55.kcad`, `Foamband-ring.kcad`, `Celband-deksel.kcad` | filter en afdichting |
| `Ventilatorkuip.kcad`, `Klauw.kcad` | ongewijzigd uit 7.3 (in de assemblage 18 mm lager) |
| `laser/freesmal-rond-mdf.dxf` | MDF-freesmal 400 x 400, opening Ø223, hartlijnen gegraveerd |
| `maak-rond.mjs`, `rooster_rond.py` | generators (`python rooster_rond.py`, dan `node maak-rond.mjs`) |

Test: `VOORBEELDEN=1 npx vitest run src/qa/rondAfzuiging.test.ts` (één body per deel, maten, laserrapport, botsingen,
klauwen bij 10 tot 50 mm en ingetrokken, filter vrij naar boven, luchtdicht met twee tegenproeven).
