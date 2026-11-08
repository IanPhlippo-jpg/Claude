# Onafhankelijke ontwerpbeoordeling afzuiging v4

Scope: `src-v4/` (revisie 7.0, 8 november 2026, CET), alleen-lezen. Engineeringfase: het ontbreken van fysieke proeven telt niet mee in de score en staat apart in het validatieplan (§6).

## 1. Eindoordeel

**Gewogen score: 6,1 / 10.** Revisie 7.0 is consistent, bouwt, en de firmwarelogica is sterk verbeterd. Toch rust de veiligheidskritische keten *vangst → afdichting → filterbewaking* op modelaannames die het eigen ontwerp niet borgt. De belangrijkste: de firmware ziet een **ontbrekend of omzeild filter niet** en meldt dan "ok". Verder kan de foamafdichting met de beschikbare onderdruk nauwelijks worden ingedrukt, en de verdeelruimte van 6,5 mm bepaalt grotendeels of 75 tot 80 % nog beschermt. Niet vrijgeven voor bouw zolang K1 en M1/M2 open staan.

| Gebied | Gewicht | Score | Kern |
|---|---:|---:|---|
| CAD (geometrie, passing, afdichting) | 15 % | 6,5 | Meshes schoon en maten consistent. De afdichting is wel gemodelleerd, maar de ontwerpkracht ontbreekt. Speling van 1 mm rond het filter. |
| Exports / revisieconsistentie | 15 % | 8,0 | 11/11 STL's zijn gesloten en manifold, de PDF's dragen 7.0 en het rekenblad is reproduceerbaar. |
| Lucht / geluid | 20 % | 5,0 | De werkpunten hangen aan een geschatte filtercurve en een willekeurige plenum-ζ. Geen enkele stand haalt 0,5 m/s op 20 cm. 70 dB(A) aan het oor is luid. |
| Filtratie (stof en dampen) | 15 % | 4,0 | Geen detectie van een ontbrekend of omzeild filter. Het rendement van het filter komt niet uit een primaire bron. Dampen gaan ongefilterd terug de salon in (wel eerlijk gemeld). |
| Elektrisch / thermisch | 10 % | 6,5 | DC-zekering en -schakelaar exact gekozen, coördinatie klopt. Geen temperatuurbewaking. Het thermisch model gaat uit van 25 °C. |
| Firmware | 10 % | 7,0 | Build en 22/22 hosttests zijn groen, de zachte start is nu correct. Wel blinde vlekken in de bewaking (K1, M4). |
| Ergonomie | 5 % | 6,0 | De knieën moeten vóór de module, onderkant op 618 mm boven de vloer: krap voor grote gebruikers. |
| Onderhoud | 5 % | 6,5 | Goede instructie (uit, FFP2, zak, niet uitkloppen). Geen vergrendeling en de herijking hangt af van discipline. |
| Documentatie | 5 % | 7,5 | Grotendeels eerlijk en consistent. Eén etiketfout (f = 0,35 tegenover gebruikt 0,30). |

Berekening: 0,15·6,5 + 0,15·8 + 0,20·5 + 0,15·4 + 0,10·6,5 + 0,10·7 + 0,05·6 + 0,05·6,5 + 0,05·7,5 = **6,125 → 6,1**.

## 2. Uitgevoerd onderzoek

Alle schrijvende stappen draaiden op een tijdelijke kopie van `src-v4`. De bron is niet gewijzigd. In de kopie verschillen na afloop alleen de tijdelijke testbestanden en de opnieuw gegenereerde `Berekeningen.md`, die enkel in regeleinden (CR) verschilt.

**Zelf geverifieerd (eigen controle):**
- `diff -rq src-v3 src-v4`, vergeleken met `report/v4-evidence/changes-v4.json`: toegevoegd, verwijderd en gewijzigd komen overeen (onder meer cassette eruit, CU20013, foamband en klauwrubber erin, tekeningen hernummerd).
- `python3 docs/berekeningen.py` op de kopie: de gegenereerde `Berekeningen.md` is inhoudelijk identiek aan de bron, op regeleinden (CR) na. Het rekenblad is dus reproduceerbaar.
- Eigen herberekening van de kernformules met de functies van het script:
  - Dalla Valle: 250 m³/h geeft 0,66 m/s op 10 cm ✓.
  - Ringsnelheid in de verdeelruimte: 12,6 m/s ✓.
  - Rooster-ζ: 19,36 ✓, maar bij f = 0,2997, niet bij de vermelde 0,35 (f = 0,35 zou 12,8 geven).
  - Thermische wandoppervlakte 0,052 m² is plausibel.
  - Dynamische druk in de ring: 95 Pa bij 250 m³/h.
- Gevoeligheid (eigen script):
  - Debiet bij een **plenum-ζ** van 0,5 / 1,0 / 1,5 en luchtweg 1,5x: op 75 % 216 / 201 / 189 m³/h, op 80 % 234 / 217 / 204 m³/h. Het minimum is 190 m³/h.
  - **Zonder filter** (alleen roosterdruk aan het meetpunt): de sensordruk is 0,34 tot 0,54 x de schone waarde, over alle standen en verliesbanden.
- Firmware:
  - Zonder systeem-`g++` heb ik een lokale compiler-wrapper gebruikt (zig c++ in een venv), met PlatformIO in een venv.
  - `pio test -e native`: **22/22 PASSED**. `pio run -e module -e knop`: **beide SUCCESS**.
  - Eigen extra hosttests (tijdelijk bestand `test_eigen`, niet in de bron):
    - bypass met 40 % minder sensordruk dan schoon geeft bewaking = BEW_OK, storing = geen, vol = 0,00;
    - ijken op een filter dat al 1,4x weerstand heeft, gevolgd door +10 % geeft vol 0,53 en geen melding;
    - zachte start 0 → 80 % duurt 1600 ms ✓.
- STL-analyse (eigen Python-script): driehoeksaantallen, bestandsgrootte, manifold-randen, bounding box en volume. Alle 11 zijn gesloten met 0 niet-manifold randen. Maten: Romp 210×210×110, Bodemplaat 210×210×6, Bovenframe 222×222×2,5, Instroomplaat 201,4×201,4×16,5, Voedingsbox 225×124×50 (inclusief flens).
- Rasterdoorsnede (verticale stralen) van de Instroomplaat: centrale opening van ongeveer Ø127, open hoekuitsparingen; de hoekafdichting heb ik niet kunnen beoordelen.
- PDF-tekst (`pdftotext`): de bouwschema's dragen 7.0. "Klop het filter uit" staat er niet meer in; wel "Niet uitkloppen, niet uitblazen".
- Code-review: `regel.h`, `module/main.cpp`, `maak-afzuiging.mjs` (filter, foam, steunrand) en README.

**Alleen herhaald of overgenomen:** de fabrikantwaarden (ventilatorcurve, adapterderating, zekering I²t, schakelaarrating) heb ik **niet** aan primaire datasheets getoetst. Ze staan als bronclaim in het script. De filterwaarden zijn een literatuurschaling (Johansson 1999), geen MANN-data.

**Beperkingen:**
- Geen KCAD-viewer gebruikt.
- Geen botsingsanalyse in 3D, dus V3-11 en V3-12 zijn niet herverifieerd.
- Afbeeldingen alleen via bestandsnamen of tekst gecontroleerd, niet visueel.
- Mijn ruwe meshraster (2 tot 4 mm) mist dunne ribben.

## 3. Wijzigingen ten opzichte van src-v3 en aftekening V3

Wijzigingen bevestigd: het filtercassette-concept (Rittal G3) is vervangen door een los interieurfilter (CU20013) op een foamband 6×4. Verder: een rubberkussen op de klauw, schakelaar C&K D502 (DC-rated), het boosttegoed, bewaking per stand met een "lage stand" onder 75 %, een stabilisatiestatus en een koppelvenster dat alleen na een bewuste handeling opengaat.

| V3 | Status | Onderbouwing |
|---|---|---|
| V3-01 fijnstofconcept | **deels** | Het filter is beter dan G3, maar het rendement komt niet uit een primaire bron, dampen worden niet afgevangen en de lucht gaat terug de salon in. |
| V3-02 afdichting niet ingebouwd | **deels** | De foamband is nu gemodelleerd. De aandrukkracht volstaat waarschijnlijk niet (zie M1). |
| V3-03 luchtmodel/plenum | **deels** | Scenario's 0,7 tot 1,5x en een plenumgrens zijn toegevoegd. ζ = 0,5 is niet onderbouwd en de ruimte blijft 6,5 mm (M2). |
| V3-04 zachte start te snel | **opgelost** | De oploop rekent nu op de verstreken tijd (`regel.h:170`). Eigen test: 1600 ms naar 80 %. |
| V3-05 koppelvenster overschrijft | **grotendeels opgelost** | Opent alleen na drie snelle starts (`regel.h:392`). Restrisico in m6. |
| V3-06 filteralarm borgt minimum niet | **deels** | Factoren per stand komen nu uit het model. Ontbrekend filter, bypass en ijken op een vuil filter worden niet gezien (K1, M4). |
| V3-07 klemberekening | **deels** | Het rubber begrenst nu de kracht (22 tot 32 N). Kruip = 1/5 van de vloeigrens blijft een aanname. |
| V3-08 elektrisch/warmte | **grotendeels opgelost** | Exacte DC-zekering en -schakelaar, coördinatie klopt. Restpunt in m3. |
| V3-09 README-consistentie | **opgelost** (gecontroleerde punten) | 82 + 34 = 116 mm, consistent met de STL (110 + 6) en het meetplan. Revisie 7.0 overal. |
| V3-10 materiaal/reiniging | **deels** | `Materiaalstaat.md` en proef M3 zijn toegevoegd. De brongegevens van de middelen heb ik niet getoetst. |
| V3-11 bereikbaarheid/morsroute | **niet herverifieerd** | Geen 3D-probe gedaan. |
| V3-12 kleine overlap print/box | **niet herverifieerd** | Geen booleaanse controle. |
| V3-13 uitkloppen / onderhoudsisolatie | **opgelost** | PDF: "Niet uitkloppen". README: uitschakelen, stilvallen, FFP2, zak. |
| V3-14 oude melding tijdens stabiliseren | **opgelost** | `vol` en `geenLucht` worden elke stap gewist en `BEW_STABILISEREN` bestaat. |
| V3-15 herhaalde boost | **opgelost** | Boosttegoed van 120 s met herstel van 1:4, gemiddeld hoogstens 1/5 van de tijd op 100 %. |

## 4. Sterke punten en bevindingen

**Sterk:**
- Eén generator voor alle uitvoer, met reproduceerbaar rekenblad en revisiestempel.
- Schone STL's.
- Een regelhart zonder hardware, met echte foutinjectietests.
- De bewaking zegt eerlijk "lage stand", "niet geijkt" of "geen meting" in plaats van een vals oordeel.
- 230 V zit alleen in een gekeurde adapter, en er is een DC-rated zekering en schakelaar.
- Het boosttegoed koppelt het warmtemodel aan de code.
- Het geluidsdoel is eerlijk bijgesteld.
- Er staat een expliciete waarschuwing in dat dampen niet worden gefilterd.

| ID | Ernst | Evidence | Technisch gevolg | Ontwerpactie | Digitaal acceptatiecriterium | Zekerheid |
|---|---|---|---|---|---|---|
| K1 | **Kritiek** | `regel.h:57,158,163`; meetpunt onder het filter (`berekeningen.py:241`) | Zonder filter ziet de sensor 0,34 tot 0,54 x de schone druk (eigen model), dus boven de storingsgrens van 0,25. Bij een omzeild filter (−40 %) blijft het resultaat BEW_OK met vol = 0 (eigen hosttest). Het toestel blaast dan ongefilterd stof uit en meldt "ok". | Ondergrens "filter ontbreekt/lek" per stand toevoegen (bijvoorbeeld dp < 0,75 x schoon geeft een storing), afgeleid uit het model zonder filter met marge. Eventueel een filteraanwezigheidsschakelaar (reed/microswitch) in de geleiderand. | Hosttest: op elke beschermende stand geeft een sensordruk volgens het model-zonder-filter (0,7 tot 1,5x) binnen 6 s een storing. Het rekenblad faalt als de grens niet onder de laagste schone/bypass-verhouding met 10 % marge ligt. | hoog (code), middel (modelgetallen) |
| M1 | Major | `maak-afzuiging.mjs:52–55,253–259` (foam 6×4, speling 1 mm); `berekeningen.py:251` | Aandrukkracht = Δp_filter × front ≈ 130 Pa × 0,028 m² ≈ 3,7 N op ±4100 mm² foam (≈ 0,9 kPa). Celfoam vraagt typisch tientallen kPa voor 25 % indrukking (**schatting, geen datablad gebruikt**). De foam wordt dus nauwelijks ingedrukt. Dat het CU20013 een vlakke rand van 6 mm rondom heeft, is niet aangetoond. De omloopspleet van 1 mm geeft een orde van grootte tot ≈ 20 m³/h lek bij een open voeg (schatting). | Mechanische aandrukking ontwerpen (klemraam of veer onder de RVS-plaat, gedefinieerde indrukking 25 tot 40 %), foam met CLD-datablad, lip of labyrint rond het filterpakket. Rand van het CU20013 uit primaire tekening opmeten en in CAD zetten. | CAD: nominale indrukking 25 tot 40 % bij gesloten plaat over alle toleranties. Rekenblad: aandrukkracht ≥ CLD × oppervlak × 1,5. Geen rechtstreekse luchtweg rond het filter in de doorsnede. | middel |
| M2 | Major | `berekeningen.py:248–256`; `Berekeningen.md` §3c | Ringsnelheid 12,6 m/s bij 6,5 mm. ζ = 0,5 is een arbitraire "bovengrens". Bij ζ = 1,0 tot 1,5 en luchtweg 1,5x zakt 75 % naar 201 tot 189 m³/h (minimum 190) en 80 % naar 217 tot 204 (eigen berekening). Ook kans op fluittoon. De beschermclaim voor de dagstand hangt aan één niet-onderbouwde coëfficiënt. | Verdeelruimte vergroten naar ≥ 15 mm (ringsnelheid ≤ 6 m/s) of een conisch plenum/diffusor, en scenario's met ζ tot 1,5 meerekenen. | Rekenblad: op de dagstand ≥ 190 m³/h met vol filter bij ζ_plenum = 1,5 en luchtweg 1,5x. Firmwarefactoren worden opnieuw afgeleid en het script blijft groen. | middel |
| M3 | Major | `berekeningen.py:65–71` | De filterweerstand (de grootste term) is een schaling van Volvo-filters (AIVC 1999), geen data van MANN of het CU20013. Het rendement "0,3 µm 50–70 %" in README:9 heeft geen primaire bron. Elk afgeleid getal (werkpunten, vervangfactoren, geluid) erft die onzekerheid. | Primaire Δp(Q)- en rendementsdata van MANN/Bosch opvragen of een filter met gepubliceerde ISO 16890/11155-data kiezen; de scenarioband verbreden tot de data er zijn. | Rekenblad toont bron en datum per filtergetal. Een band van ≥ ±50 % op de filterweerstand wordt meegenomen en de beschermclaim blijft waar. | hoog |
| M4 | Major | `regel.h:269–277`, `ijkVerder` | Ijken aanvaardt elk stijgend, plausibel profiel, ook op een vervuild filter. Daarna geldt de vervangfactor relatief tot een vuile basis (eigen test: 1,4x vuil + 10 % geeft vol 0,53, geen melding). Wie na een filterwissel vergeet te ijken, of te vroeg ijkt, zit zonder werkelijke bescherming. | Absolute plausibiliteit per toerental: ijking weigeren als dp_schoon > modelbovengrens × 1,15. Ijkdatum en filterteller in het NVS, met een melding als er na een filterwissel niet geijkt is. | Hosttest: ijken met druk ≥ 1,15x de modelbovengrens schoon geeft IJK_ONPLAUSIBEL, en de vorige ijking blijft. | hoog |
| M5 | Major | `Berekeningen.md` §3, §3d; `berekeningen.py:92` | Bij geen enkele stand 0,5 m/s op 20 cm. Handen en het werkstuk zitten in de praktijk vaak 10 tot 25 cm boven het blad, en de vijl slingert fijn stof weg met een snelheid boven 0,5 m/s. Dagstand 70 dB(A) op 0,5 m (model, zonder roostergeluid) is een comfortrisico bij dagelijks gebruik. Of de vangst volstaat, is onzeker. | Werkhoogte als ontwerpvariabele vastleggen (armsteun of kussen die de nagel op ≤ 10 cm houdt). Akoestische demping in de uitblaas doorrekenen. | Rekenblad: v ≥ 0,5 m/s op de vastgelegde werkhoogte op de dagstand met vol filter. Geluidsbudget inclusief roosterterm ≤ projectdoel. | middel |
| M6 | Major | README:9; uitblaas onder het blad | De lucht gaat terug op knie- en vloerhoogte bij medewerker en klant. Submicron stof (50 tot 70 % rendement, onbewezen) en alle monomeer- en oplosmiddeldampen blijven in de ruimte. Er is geen ventilatiedimensionering. | Optionele uitvoering voor een koolstoftrap of afvoer naar buiten (aansluitstuk) uitwerken. Salonventilatie als randvoorwaarde in de documentatie kwantificeren zonder normen te verzinnen. | CAD: aansluitflens of extra filtertrap past binnen de diepte. Rekenblad: werkpunt met de extra weerstand ≥ 190 m³/h. | hoog (feit), middel (gevolg) |
| m1 | Minor | `berekeningen.py:48` | Het etiket "f = 0,35" klopt niet: gerekend wordt met f = 121,1/404 = 0,30. Het getal 34 Pa is intern correct. | Etiket afleiden uit de berekening. | De gegenereerde tekst toont de berekende f. | hoog |
| m2 | Minor | `berekeningen.py:183,180–199` | Het warmtemodel gaat uit van een salon van 25 °C. Bij 35 °C loopt de lucht in de box op tot ≈ 54 °C (+10 K), krap onder de 60 °C-grens. Lokale hotspots van de adapterbehuizing tegen de PETG-wand zijn niet gemodelleerd. Er is geen temperatuursensor en de firmware heeft geen thermische begrenzing. | Rekenen bij 35 °C, afstandhouders adapter–wand (≥ 5 mm). Optioneel NTC + firmware die boost blokkeert bij > 55 °C. | Rekenblad: box ≤ 60 °C bij 35 °C en h = 5. CAD: luchtspleet adapter–wand ≥ 5 mm. | middel |
| m3 | Minor | `regel.h:166`; `module/main.cpp` | STORING_STIL wordt alleen gemeld: de ventilator blijft aangestuurd. Een open PWM-draad in de M8-kabel laat de ventilator waarschijnlijk op vol toerental draaien (gedrag van een 4-draadsventilator, niet geverifieerd voor deze ventilator), en dan werkt UIT alleen via de schakelaar. | Bij stilstand na herhaalde pogingen de PWM naar 0 en een harde storing. PWM-draadbreuk detecteren (toerental > verwacht bij lage PWM). | Hosttest: STIL > 30 s geeft PWM 0 tot een nieuwe opdracht. Toerental > 1,3x doel bij PWM ≤ 30 % geeft een storing. | middel |
| m4 | Minor | Vervangfactor op 75 % = 1,08 (`regel.h`) | De meetmarge is maar +8 % (≈ 13 Pa op ≈ 167 Pa). Een toerentalfout van 2 % geeft ±4 % druk (p ~ n²), dus het risico op vals alarm of een gemiste melding is reëel. | De laagste beschermende stand verhogen of filtering/hysterese aan het alarm koppelen. | Hosttest: ruis ±4 % op dp rond 1,08x geeft geen klapperende melding (hysterese). | middel |
| m5 | Minor | `Vrijgave-en-meetplan.md:86–87` | Knieën vóór de module, onderkant op 618 mm boven de vloer: met een hoge stoel of lange gebruiker botsen de dijen. | Ondiepere module of de module verder naar achter in CAD onderzoeken. | CAD: voorrand van de module ≥ 250 mm van de voorrand van het blad, of onderkant ≥ 640 mm boven de vloer. | middel |
| m6 | Minor | `module/main.cpp:148–153`; `regel.h:330–340` | Drie snelle herstarts (bijvoorbeeld hiccup van de adapter bij overlast of netstoringen) openen het koppelvenster. De LMK gaat onversleuteld mee in de broadcast van KOPPEL en de PMK staat hardgecodeerd. Het praktisch risico is laag. | Handeling koppelen aan een fysieke knop of jumper. Het venster alleen openen als S1 bewust geschakeld is (bijvoorbeeld met een minimale uit-tijd). | Hosttest: drie starts korter dan 1 s (brown-out) openen het venster niet. | middel |

## 5. Verworpen of onbewezen claims

- **"Luchtdicht: het filter wordt in de foam getrokken"** (README): onbewezen. De berekende aandrukkracht (≈ 3,7 N) is veel te klein voor een gedefinieerde indrukking (M1). De 3 mm indrukking in het plenummodel is daarom ook onbewezen.
- **"Storing geen luchtstroom (slangetje of filters)"**: verworpen voor "filter ontbreekt". De grens van 0,25 ligt onder de verhouding zonder filter (0,34 tot 0,54, K1).
- **"Filtermelding komt vóór het debiet onder het minimum zakt"**: alleen waar binnen het model, met ζ_plenum ≤ 0,5, een correcte ijking op een schoon filter en een werkende afdichting (M2, M4, M1).
- **"0,3 µm 50–70 %, vanaf 3 µm > 90 %"**: geen primaire bron voor het CU20013 (M3).
- **"75 % is de laagste beschermende stand"** en **"dagstand 80 %"**: dit zijn modelscenario's, geen toestelresultaten. De claims vallen weg bij ζ_plenum ≥ 1,0 met een ongunstige luchtweg.
- **"Rooster f = 0,35"**: etiketfout, gerekend is 0,30 (m1).
- **"Getest" bij de zachte start en het boosttegoed**: bevestigd in de hosttest. Dat zegt alleen iets over de logica, niets over het werkelijke inschakelgedrag van de ventilator en de elco.
- Een groene testset (22/22) borgt de K1/M4-gevallen niet: daar bestaan geen tests voor.

## 6. Top-5 ontwerpacties

1. **Detectie van filter ontbreekt/lek (K1):** ondergrens per stand plus een optionele aanwezigheidsschakelaar. Acceptatie: nieuwe hosttests voor geen filter en bypass op elke beschermende stand geven een storing; het rekenblad controleert de grens.
2. **Mechanisch gedefinieerde filterafdichting (M1):** klemraam of veer met 25 tot 40 % foamindrukking, foam met CLD-datablad, rand van het filter uit de primaire tekening. Acceptatie: CAD-tolerantiestapel plus krachtenbalans in het rekenblad.
3. **Plenum ≥ 15 mm of diffusor (M2):** acceptatie: ringsnelheid ≤ 6 m/s en de dagstand haalt ≥ 190 m³/h met vol filter bij ζ = 1,5 en luchtweg 1,5x.
4. **Plausibiliteit van de ijking en registratie van de filterwissel (M4):** acceptatie: een ijking boven 1,15x de schone bovengrens wordt geweigerd; "niet geijkt na wissel" wordt getoond.
5. **Primaire filterdata en een herziene werkhoogte/geluidsbudget (M3/M5):** acceptatie: bron per filtergetal in het rekenblad, v ≥ 0,5 m/s op de vastgelegde werkhoogte, geluidsbudget inclusief roosterterm.

### Afsluitend validatieplan (ongescoord, fysiek)

- **Q–Δp-curve** van rooster, filter en plenum met schoon en vol filter, op 75, 80 en 100 %.
- **Rookproef en tracer-lekproef** van de foamafdichting, met en zonder RVS-plaat.
- **Proef zonder filter en met verschoven filter:** wat de firmware meldt.
- **Vangstproef met deeltjesteller** op 10, 15 en 20 cm.
- **Geluid op de oorpositie**, inclusief roosterfluit.
- **4 uur warmte in de box** bij 35 °C omgeving.
- **Inschakelstroom** van de ventilator met de elco.
- **Klauwkracht na kruip** (1 week).
- **Kniebotsing** met de grootste gebruiker.
- **Brown-out-sequentie** en koppelvenster.
