# B-rep-kern, STEP en stabiele randen → 0.3.7 (2026-10-26)

Ian: "Maak alles zoals SolidWorks, certificaten wil ik niet te hoeven geven." Daarmee is F49 (code signing) gesloten
zonder certificaat en is de OpenCascade-spike (F51) gestart, met STEP als eerste echte toepassing.

| ID | Status | Wat er veranderd is | Bewijs |
|---|---|---|---|
| F49 | gesloten (besluit Ian) | Geen code signing. Een installer die je zelf bouwt en installeert heeft geen "Mark of the Web", dus Windows SmartScreen meldt niets. Wie de installer via internet of mail krijgt, ziet de eerste keer "Windows heeft uw pc beschermd": *Meer info* → *Toch uitvoeren*. | — |
| F47 | opgelost | Een randverwijzing bewaart nu ook de richting van een rechte rand en de normalen van de twee vlakken die hij scheidt. Vindt de rebuild de rand niet meer op zijn oude plek (een eerdere extrude is dieper, een plaat langer), dan zoekt hij de rand van dezelfde soort met dezelfde richting en dezelfde twee vlakken die het dichtst bij ligt; twee even goede kandidaten worden niet gegokt. Verwijzingen uit oudere bestanden (zonder normalen) werken zoals voorheen. | edgesets.test (plaat 10 → 25 mm, afronding blijft), step.mjs |
| F51 | spike gedaan, eerste toepassing in gebruik | OpenCascade (replicad + opencascade.js, LGPL-2.1) draait in een eigen worker (`src/workers/occt.worker.ts`) en laadt pas bij het eerste gebruik. **File ▸ Open** leest STEP (*.step, *.stp): een nieuwe part met één Imported-body per solid. **Save As ▸ STEP AP214** schrijft elke body als gesloten B-rep-solid; vlakke driehoeken worden samengevoegd tot één vlak (een doos wordt zes vlakken). Meer hieronder. | step.test (3), step.mjs (11 checks), desktop.mjs (STEP in de geïnstalleerde shell) |

## Metingen (Node, deze machine)

`node tools/occt-spike.mjs` en dezelfde bewerkingen in de mesh-kern:

| Bewerking | OpenCascade | Mesh-kern |
|---|---|---|
| Start (WebAssembly laden) | 197 ms, eenmalig | — |
| Extrude 80 × 80 × 10 | 34 ms | 15 ms |
| Afronding R3 op één rand | 57 ms, volume exact (afwijking 7e-12 mm³) | 38 ms, afwijking −2,2 mm³ |
| Gat Ø35 erdoor | 127 ms, volume exact | 105 ms, afwijking +12,3 mm³ (0,02 %) |
| Shell 2 mm | 47 ms, volume exact | — |
| Afronding na dikkere plaat | vindt de rand via een geometrisch filter | sinds F47 ook, via richting en vlaknormalen |
| Topologie | 7 vlakken, 15 randen, echte cilinder | driehoeken; vlakken en randen afgeleid |
| STEP schrijven / lezen | 78 ms / heen en terug zelfde volume | niet mogelijk |
| Grootte | 23 MB WebAssembly (7,3 MB gzip), alleen in de worker | — |

De hoofdbundel blijft 832 kB: OpenCascade zit volledig in de worker-chunks.

## Beveiliging

De Emscripten-code van OpenCascade maakt functies tijdens het draaien (`new Function`). Alleen het workerbestand
`occt.worker-*.js` krijgt daarom `'unsafe-eval'` in zijn Content-Security-Policy; een worker houdt het beleid van zijn
eigen script, dus de pagina blijft strikt (`script-src 'self' 'wasm-unsafe-eval'`). De worker krijgt alleen bestanden die
de gebruiker zelf opent en geeft alleen driehoeken en bytes terug.

## Licentie

replicad is MIT; de OpenCascade-build is LGPL-2.1 met de OCCT-uitzondering. Hij wordt ongewijzigd en als los
vervangbaar bestand meegeleverd (`resources/app.asar.unpacked/dist/assets/replicad_single-*.wasm`); de tekst en de
bronverwijzing staan in THIRD-PARTY-NOTICES.txt.

## Migratiepad naar een volledige B-rep-kern

1. **Nu (0.3.7):** STEP in en uit, mesh-kern blijft de modelleerkern.
2. **Features één voor één:** extrude, revolve, cut, fillet, chamfer, shell, hole en pattern via OpenCascade in de
   worker, het resultaat als B-rep bewaard en voor de viewport getesselleerd. De mesh-kern blijft de terugval per
   feature, zodat elk bestaand model blijft openen. Elke feature krijgt een vergelijkingstest (volume, vlakken).
3. **Topologische naamgeving:** vlakken en randen krijgen namen uit de feature die ze maakt (OpenCascade
   `BRepTools_History`), zodat een afronding aan "de bovenrand van Boss-Extrude1" hangt in plaats van aan een plek.
4. **Rebuild in de worker (F46):** zodra de geometrie in de worker leeft, verhuist de hele rebuild mee; de UI krijgt
   een "rebuilding…"-toestand.
