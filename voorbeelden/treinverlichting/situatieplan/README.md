# Situatieplan Station Turnhout

Busbaan en autoparcours voor de modelbaan van Ian, op de getekende achtergrond die Ian aanleverde
(`achtergrond.jpg`, 1718 x 724 px, sporen horizontaal). Rood = auto's en bussen, groen = alleen bussen.

| Bestand | Wat |
|---|---|
| `achtergrond.jpg` | Ian's achtergrond, ongewijzigd |
| `maak-plan.py` | meet de rijstroken in het beeld en maakt alles hieronder opnieuw (`python maak-plan.py`) |
| `plan.json` | rijbanen en markeringen in pixels van `achtergrond.jpg` (formaat hieronder) |
| `plan.svg`, `plan-3840x2160.png` | tv-plaat 16:9: titel boven, beeld onvervormd, legende, noordpijl en schaal onder |
| `controle-banen.png` | de polylijnen dik op het beeld, met hun id (nakijken) |
| `tv.html` | tv-pagina met rijdende bussen en auto's (simulatie, later live) |
| `eigen-ondergrond/` | eerdere eigen hertekening uit de Google-foto; nu alleen controle van de ligging |

## Hoe de lijnen gemeten zijn

`maak-plan.py` zoekt het asfalt (neutraal grijs) en legt scanlijnen over het beeld:

- bovenkant van de buslus: y = 333,5;
- Stationstraat: noordstrook y = 562,0 en zuidstrook y = 587,5;
- rechterbeen van de buslus: x = 1617;
- 4 schuine stroken: per strook een rechte `x = a + b*y` (afwijking 0,3 tot 0,6 px);
- rotonde: middelpunt van het groene eiland (193,3 ; 561,4), baan op straal 69,8.

De bochten zijn echte cirkelbogen (straal 25 tot 45 px). De punten liggen om de 2 px.

## plan.json

Alle coördinaten zijn pixels van `achtergrond.jpg`: oorsprong linksboven, x naar rechts, y naar beneden.
`afstand_px` is de afstand langs de polylijn vanaf haar eerste punt.

```jsonc
{
  "achtergrond": "achtergrond.jpg", "breedte": 1718, "hoogte": 724,
  "schaal": { "px_per_m": 7.8, "aanname": true },      // AANNAME, zie onder
  "mm_op_de_baan_per_px": 1.47, "mm_op_de_baan_aanname": true,   // H0 1:87, te meten (sensoradvies)
  "noord_graden": 26.8,                                  // noord = 26,8° met de klok mee vanaf 'boven'
  "rijbanen": [
    { "id": "autolus", "soort": "auto", "gesloten": true,
      "richting": "in de volgorde van de punten ...", "breedte_px": 25.5,
      "lengte_px": 3290.2, "lengte_m": 658.0, "begin": null, "eind": null,
      "punten": [[x, y], ...] },
    { "id": "busbaan", "soort": "bus", "gesloten": false,
      "begin": { "van": "autolus", "wissel": "W1", "afstand_px": 1173.1 },
      "eind":  { "gaat_over_in": "halte_lijnbus3" }, "punten": [...] },
    { "id": "halte_lijnbus2", "soort": "bus",
      "begin": { "van": "busbaan", "wissel": "W4", "afstand_px": ... },
      "eind":  { "voegt_in_op": "autolus", "afstand_px": ... }, "punten": [...] }
    // ook halte_lijnbus3 (begint aan het einde van de busbaan), halte_lijnbus1 (W3), halte_standmodel (W2)
  ],
  "wissels":         [{ "id": "W1", "naam": "Wissel 1", "x": .., "y": .., "baan": "autolus", "afstand_px": ..,
                        "rechtdoor": "autolus", "afbuigen": "busbaan" }, ...],
  "stoppunten":      [{ "id": "STOP_lijnbus3", "baan": "halte_lijnbus3", "afstand_px": .., "x": .., "y": .. }, ...],
  "ir_leds":         [{ "id": "IR5", "naam": "IR LED 5", "stoppunt": "STOP_lijnbus3", "baan": "halte_lijnbus3", "x": .., "y": .. }, ...],
  "hallsensoren":    [{ "id": "HALL1", "baan": "autolus", "afstand_px": .., "x": .., "y": .. },
                    { "id": "HW1", ..., "advies": true, "alleen_bus": true }, ...],   // + het sensoradvies
  "ir_sensoren":     [{ "id": "IRRX1", "sensor": "ir", ... }, { "id": "FTR_lijnbus3", "sensor": "ftr", ... }, ...],
  "verkeerslichten": [{ "id": "VL_lijnbus3", "baan": "halte_lijnbus3", "afstand_px": .., "x": .., "y": .. }, ...],
  "lantaarns": [], "lichtgroepen": [], "speakers": [], "servos": [], "seinen": [],
  "metingen": { ... }                                    // de gemeten maten hierboven
}
```

Regels voor de tv-pagina:

- auto's rijden alleen op `soort: "auto"`; bussen rijden op `"auto"` en `"bus"`;
- de rijrichting is de volgorde van de punten. De autolus rijdt oostwaarts op de zuidstrook, keert aan de rechterrand,
  rijdt westwaarts op de noordstrook en gaat tegen de klok in rond de rotonde (rechts rijden);
- een bus slaat bij `W1` af van de autolus naar `busbaan`;
- `W2`, `W3` en `W4` takken van de busbaan af naar Standmodel, Lijnbus 1 en Lijnbus 2;
- Lijnbus 3 is het verlengde van de busbaan;
- elke haltestrook voegt weer in op de autolus op `eind.afstand_px`;
- `HALL1` ligt op de noordstrook, net rechts (stroomopwaarts) van de invoegingen.

## tv.html

Openen met dubbelklik of via een webserver. `plan.json` staat erin ingebakken, dus `file://` werkt ook.
Via http laadt de pagina het echte `plan.json`. `maak-plan.py` werkt de ingebakken kopie bij.

- Auto's rijden rond op de autolus. Bussen (geel, met lijnnummer) slaan bij Wissel 1 af en rijden naar hun strook.
  Daar stoppen ze aan het stoppunt: de IR-led licht paars op.
- De bus wacht de ingestelde tijd en dan tot het verkeer vrij is:
  - geen auto bij Hall sensor 1;
  - niets op het invoegpunt.
- Het verkeerslicht springt dan op groen en de bus voegt in. Naderende auto's laten de invoegende bus voor.
- Elk voertuig houdt afstand tot zijn voorganger. Op de Standmodel-strook staat een geparkeerde bus ("STAND").
- Wissels tonen hun stand met een streepje naar de gekozen tak. De hallsensor licht geel op bij elke doorrit.
- Rechtsonder staan de klok en "Simulatie" (of "Live").
- Instellingen staan achter het tandwiel linksonder of de toets **S**: snelheid, aantal bussen (0-6), auto's (0-24)
  en wachttijd. Toets **F** geeft volledig scherm, **+ / -** de snelheid.

### Live gegevens koppelen (voor de treinagent)

```js
situatieplan.zetMelding({ sensor: 'HALL1', voertuig: 'bus3', tijd: Date.now() });
// sensor   = id uit plan.json: HALL1, IR5..IR7, STOP_..., W1..W4, VL_...
// voertuig = vrije id; begint ze met "bus" of "lijn", dan tekent de pagina een bus (anders auto),
//            of geef { soort: 'bus' | 'auto' } mee. Een getal achteraan wordt het lijnnummer.
// tijd     = seconden of milliseconden sinds 1970 (optioneel; standaard: nu)
// snelheid = m/s (optioneel)
situatieplan.zetWissel('W3', 'afbuigen');        // of 'rechtdoor'
situatieplan.zetLicht('VL_lijnbus2', 'groen');   // of 'rood'
situatieplan.zetBron('simulatie');               // terug naar de demo
```

- De eerste melding schakelt de pagina naar **Live**: de gesimuleerde voertuigen verdwijnen.
- Bij elke melding staat het voertuig precies op het punt van die sensor.
- De snelheid volgt uit de afstand langs de baan sinds de vorige melding op dezelfde baan, gedeeld door de tijd.
  Wordt `snelheid` meegegeven, dan geldt die.
- Daartussen rijdt het voertuig met die snelheid verder over zijn baan.
- Aan het einde van een baan rijdt het voertuig door op de volgende baan:
  - busbaan → Lijnbus 3;
  - haltestrook → autolus.
- Een melding op een stoppunt of IR-led zet de snelheid op 0 en laat de IR-led oplichten.

## Aannames

- **Schaal** (Fable 5.2 VN2, 2026-11-17): 1 m = 7,8 px. De 2 rijstroken van de Stationstraat liggen 25,5 px uit elkaar
  (y = 562,0 en 587,5); een rijstrook is 3 tot 3,5 m: 25,5 / 3,25 = 7,8. Vroeger 1 m = 5 px (het hotel ± 100 m in de
  Google-foto, ± 500 px in dit beeld): dan was een strook 5,1 m breed. In H0 1:87 is 1 px 1,47 mm op de baan
  (`mm_op_de_baan_per_px`). Te controleren met een echte maat van de modelbaan (de breedte van een rijstrook).
- **Sensoren uit het advies** (VN3): `docs/sensoradvies.py` schrijft `docs/sensoradvies.json`, `maak-plan.py` zet die
  punten in `hallsensoren` en `ir_sensoren` met `"advies": true` (op een busstrook ook `"alleen_bus": true`).
- **Hall sensor 1:** ligt 75 px (± 15 m) rechts van de meest rechtse invoeging, op de noordstrook.
  In de rijrichting komt de sensor dus vóór de invoegingen; zo bewaakt hij het verkeer dat naar de haltes komt.
- **Stoppunten** liggen op y = 468. Verkeerslichten staan rechts naast het einde van elke strook.
- **Wissels:** Wissel 1 ligt op de noordstrook, 30 px rechts van het rechterbeen.
  Wissel 2, 3 en 4 liggen waar de boog naar hun strook begint.
- **Standmodel:** de Standmodel-strook houdt in de demo een geparkeerde bus vast.
- **Voertuigmaten in de demo:** bus 12 x 2,6 m, auto 4,4 x 1,9 m.
- **Snelheden in de demo:** auto 8 m/s, bus 6,5 m/s (4,5 m/s op de busbaan).
