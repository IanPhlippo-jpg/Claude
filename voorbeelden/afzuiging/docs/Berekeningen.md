# Afzuiging: rekenblad

Gemaakt door `docs/berekeningen.py` (niet met de hand aanpassen). Invoer en bronnen staan bovenaan dat script.
Het is een ontwerpberekening: de metingen in `Vrijgave-en-meetplan.md` beslissen.

## 1. Doel: hoeveel lucht

Vangst bij de bron: 0,5 m/s op 10 cm boven het rooster (Dalla Valle, opening met flens: v = Q / (0,75 (10x² + A)), A = 404 cm²).

| debiet (m³/h) | v op 5 cm | v op 10 cm | v op 15 cm |
| ---: | ---: | ---: | ---: |
| 150 | 0,85 | 0,40 | 0,21 |
| 200 | 1,13 | 0,53 | 0,28 |
| 250 | 1,42 | 0,66 | 0,35 |
| 300 | 1,70 | 0,79 | 0,42 |
| 400 | 2,27 | 1,06 | 0,56 |

**Minimum: 190 m³/h** (0,5 m/s op 10 cm), ook met een vol filter. **Ontwerpdebiet: 250 m³/h** met een schoon filter (0,66 m/s op 10 cm). Meer debiet geeft vooral meer geluid; 500 m³/h is geen doel meer.

## 2. Weerstand van de luchtweg zonder filter

| onderdeel | ζ | oppervlak (cm²) | Δp bij 250 m³/h (Pa) |
| --- | ---: | ---: | ---: |
| RVS-rooster (f = 0,35) | 17,59 | 404 | 31 |
| cassettebodem (f = 0,56) | 1,08 | 292 | 4 |
| instroom naar het oog Ø127 (trechter 45°) | 0,50 | 127 | 9 |
| uitblaas door de schuine lamellen | 2,50 | 207 | 17 |
| **samen** |  |  | **61** (43 tot 91) |

ζ van de platen volgens Idelchik (dunne geperforeerde plaat); de instroom en de lamellen zijn schattingen. Daarom staat overal een band van 0,7x tot 1,5x.

## 3. Werkpunt per filter

Snijpunt van de ventilatorcurve (100 % en lager toerental, Q ~ n, p ~ n²) met filter plus luchtweg. Vol filter = de einddrukval van de fabrikant (of 2x schoon als die ontbreekt).

| filter | Δp filter bij 250 (Pa) | max. debiet schoon | max. debiet vol | toerental voor 250 schoon | toerental voor 190 vol | dB(A) op 1 m / 0,5 m bij 250 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| **gekozen:** Rittal SK 3171.100 (G3), 17 mm, gerekend als G4 (veilige kant) | 54 | 392–461 | 229–244 | 59 %–67 % | 86 %–89 % | 57–60 / 64–66 |
| vlakke mat M5 (ePM10 50 %), 20 mm, referentie Nittmann V400S | 223 | 294–327 | 214–227 | 83 %–89 % | 90 %–93 % | 65–66 / 71–72 |
| minipleat ePM1 65 % (F7), 48 mm, TROX MFP-PLA op maat | 125 | 347–397 | 283–311 | 70 %–77 % | 72 %–76 % | 61–63 / 67–69 |
| minipleat ePM1 90 % (F9), 48 mm, TROX MFP-PLA op maat | 212 | 300–334 | 220–234 | 82 %–88 % | 88 %–91 % | 65–66 / 71–72 |
| H13 (EN 1822), 150 mm, Freudenberg SF13 (ter vergelijking, past niet) | 538 | 197 | 118 | — | — | — |

**Met de gekozen mat (schoon), per stand:** debiet en luchtsnelheid boven het midden van het rooster.

| toerental | debiet (m³/h) | op 10 cm | op 15 cm | op 20 cm | dB(A) op 1 m |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 40 % | 148 | 0,39 | 0,21 | 0,12 | 49 |
| 60 % | 241 | 0,63 | 0,34 | 0,20 | 58 |
| 70 % | 288 | 0,76 | 0,40 | 0,24 | 61 |
| 80 % | 335 | 0,88 | 0,47 | 0,28 | 64 |
| 100 % (boost) | 430 | 1,13 | 0,60 | 0,36 | 69 |

Vervangen: de firmware meldt "filter vervangen" bij het dubbele van de schone drukval (ongeveer 100 Pa bij 250 m³/h), ruim vóór de einddrukval van 250 Pa. 20 cm boven het rooster haalt geen enkele stand 0,5 m/s: dat vraagt ongeveer 600 m³/h, meer dan deze ventilator met rooster en filter levert.

Toerental is de fractie van het volle toerental, niet de PWM-waarde: de firmware moet het toerental (tacho) regelen of de PWM-stand per filter ijken. Het geluid volgt ΔL = 50 log10(n/n_vol) en een vrije puntbron; roosterfluit, kastresonantie en galm komen erbij (meten: poort G1).

## 4. Elektriek

| post | waarde |
| --- | --- |
| ventilator vol toerental | 56,4 W, 2,35 A |
| 5 V (knop + module + drukmeter, piek) via buck η 0,85 | 2,0 W |
| totaal op 24 V | 58,4 W, 2,43 A |
| adapter Mean Well GST90A24-P1M | 90 W, 3.75 A: 65 % belast |
| zekering 3.15 A traag (TR5) | 77 % van de nominale stroom |

Zekering: TR5, traag, 3,15 A, met een DC-spanning van minstens 32 V en een afschakelvermogen dat de kortsluitstroom van de adapter dekt (de adapter heeft zelf een stroombegrenzing en kortsluitbeveiliging). Kies een type met een opgegeven DC-waarde op het datablad. De aanloopstroom van de ventilator blijft binnen de traag-curve: de firmware laat de PWM hooguit 50 % per seconde stijgen (regel.h, getest).

| kabel | mm² | lus (m) | I (A) | R lus (Ω) | ΔU (V) | verlies (W) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| M8-kabel -W2 box -> module (0,5 m), 24 V en massa | 0,25 | 1,0 | 2,35 | 0,07 | 0,16 | 0,39 |
| adapter -> box (DC-snoer van de adapter) | 0,75 | 3,0 | 2,55 | 0,07 | 0,18 | 0,46 |
| USB-C box -> knop, 5 V | 0,20 | 2,0 | 0,30 | 0,18 | 0,05 | 0,02 |

De M8-connector (binder 718, 4 polen) mag 4 A per contact; de ventilatorstroom loopt over één contact heen en één terug. De spanningsval van 0,1 tot 0,2 V maakt voor de ventilator niets uit.

## 5. Warmte in de voedingsbox

In de box zit alleen de adapter en de kleine elektronica; de ventilator zit in de module. Verlies van de adapter = P_uit (1/η − 1).

| stand | P naar de module (W) | verlies in de box (W) | ΔT lucht in de box (K) | adapter-omgeving bij 25 °C |
| --- | ---: | ---: | ---: | ---: |
| 40 % toerental | 5,6 | 1,4 | 3–5 | 28–30 °C |
| 60 % | 14,2 | 2,5 | 5–9 | 30–34 °C |
| 70 % (dagstand met F7, hoofdstuk 3) | 21,4 | 3,5 | 6–12 | 31–37 °C |
| 80 % | 30,9 | 4,8 | 9–16 | 34–41 °C |
| 100 % (boost, 120 s) | 58,4 | 8,6 | 15–26 | 40–51 °C |

De adapter mag vol vermogen leveren tot 40 °C omgeving. Tot 70 % toerental blijft de box daar ruim onder. Op 80 % (de hoogste gewone stand) komt het ongunstigste geval (h = 5) net op de grens: dat meet poort E1; wordt het te warm, dan zakt de hoogste gewone stand naar 70 % (`dagMaxPct` in regel.h). 100 % is alleen boost en duurt 120 s. PETG blijft onder 60 °C. Model: wanden (h = 5 tot 10 W/m²K) plus de schoorsteenstroom door de bodem- en achterwandsleuven.

## 6. Bevestiging

- **moduleklauw (M5):** arm 8 x 6 mm, hefboom 10 mm. Kruipgrens PETG (10 MPa) bij **48 N** per klauw; het dak boven de moer (1,8 mm) houdt 1247 N in afschuiving. Aanhaalmoment daarvoor: T = K F d = **0,05 Nm** (aandraaien met twee vingers aan de korte kant van de inbussleutel tot de klauw voelbaar aanligt; niet verder).
- **knopklauw (M4):** arm 6 x 5 mm, hefboom 8 mm. Kruipgrens PETG (10 MPa) bij **31 N** per klauw; het dak boven de moer (1,6 mm) houdt 970 N in afschuiving. Aanhaalmoment daarvoor: T = K F d = **0,03 Nm** (aandraaien met twee vingers aan de korte kant van de inbussleutel tot de klauw voelbaar aanligt; niet verder).
- **Waarom zo weinig genoeg is:** het gewicht van de module en de druk van handen gaan via de rand van het bovenframe (5 mm rondom) naar het blad, niet via de klauwen. De klauwen houden de module alleen omlaag tegen optillen en trillen: 4 x 48 N = 192 N tegen ongeveer 20 N gewicht (factor 10). De klauw is met opzet geen sterke klem: zo kan hij de honingraat van het blad niet indrukken.
- **Voedingsbox:** 0,7 kg = 7 N op 4 pluggen voor holle deuren, dus 2 N per plug. Vraag aan de plug: ≥ 20 N per stuk in de onderhuid van 3 mm (factor 10).
- **Fanschroeven M4 x 10:** kop 1 mm verzonken in een plaat van 6 mm, dus 5 mm indraaiing (fabrikant: 4 tot 6). Met plaat ±0,2 en schroeflengte ±0,2 (ISO 4759-1, klasse A): 4,6 tot 5,4 mm.

