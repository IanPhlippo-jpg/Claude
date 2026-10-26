# Features via OpenCascade → 0.3.8 (2026-10-26)

Stap 2 van het migratiepad uit docs/14: de modelleerfeatures bouwen nu met de B-rep-kern (OpenCascade), met de
mesh-kern als terugval per feature. Ian: "Begin eraan".

## Hoe het werkt

- **Eén rebuild, twee kernen.** `rebuildDocument` (src/core/features/rebuild.ts) houdt per body een B-rep-vorm bij zolang
  elke feature die de body verandert een B-rep-versie heeft. De eerste feature zonder B-rep-versie werkt verder op de
  tesselatie in de mesh-kern; de body is vanaf dan mesh. Een model bouwt dus altijd.
- **In de worker.** De pagina heeft geen OpenCascade (strikte CSP). Na elke rebuild bouwt de OpenCascade-worker
  hetzelfde document met de B-rep-kern; de bodies die exact blijven vervangen de mesh-bodies (`src/app/brepRefine.ts`).
  Eerst verschijnt de mesh, een fractie later de exacte versie; een rebuild tussendoor maakt een laat resultaat ongeldig.
- **Selectie blijft kloppen.** Geselecteerde vlakken en randen worden op hun plaats teruggevonden (normaal + zwaartepunt,
  randhandtekening uit F47), niet op hun volgnummer.
- **Assemblies.** Elk onderdeel wordt één keer exact gebouwd (per document) en de assembly daarna opnieuw opgebouwd uit de
  exacte onderdelen. De hele Deurkruk is exact.
- **Vangnet.** Waar de conventies van de twee kernen kunnen verschillen (sweep, shell) wordt het B-rep-resultaat alleen
  gebruikt als het volume binnen 3 % van de mesh-versie ligt; anders bouwt de mesh-kern het.
- **Uitzetten.** Tools ▸ Options ▸ Performance ▸ "Exact geometry (B-rep kernel) for parts". De e2e-builds gebruiken de
  mesh-kern tenzij een test `phlippo.kernel = brep` zet (deterministische regressie).

## Wat nu exact is

| Feature | B-rep | Terugval naar de mesh-kern bij |
|---|---|---|
| Extruded Boss/Base en Cut | prisma van exacte profielen (lijnen, bogen, cirkels als echte curves) | draft, thin, flip side, from offset, up to next/vertex/surface/body, normal cut |
| Revolved Boss/Base en Cut | volledige en gedeeltelijke omwenteling, mid-plane, twee richtingen | thin |
| Swept Boss/Base en Cut | profiel langs een schetspad (lijnen, bogen, splines) | twist, guide curves, circular profile, keep normal, tangency, helix/3D-pad |
| Hole Tool | simple, tap, counterbore, countersink, near side / under head countersink: exacte cilinders en kegels | far side |
| Fillet en Chamfer | constante maat op gekozen randen (OpenCascade volgt raaklijnen) | variabel, asymmetrisch, conisch, gedeeltelijk, setback, keep edge, face/full round, vertex |
| Shell | wand naar binnen of buiten, vlakken open | multi-thickness; of als OpenCascade en de mesh-wand verschillen (vangnet) |
| STEP-export | exacte bodies gaan als B-rep (een plaat met gat: 7 vlakken, `CYLINDRICAL_SURFACE`) | mesh-bodies: genaaide driehoeken |
| Mass Properties | exact volume; massa en traagheden schalen mee | — |

Alle andere features (patronen, mirror, loft, plaatwerk, weldments, …) werken op de mesh-kern, zoals voorheen.

## Bewijs

| Test | Wat |
|---|---|
| `src/core/occt/brep.test.ts` (13) | exacte volumes: plaat met gat, blind en through-all cut, afronding (ook na dikkere plaat), afschuining, revolve (vol, 180°, mid-plane, reverse), sleuf met bogen, gaten (3 soorten), shell, alle 5 Deurkruk-onderdelen exact en binnen 1,5 % van de mesh-kern, STEP uit de B-rep, terugval |
| `e2e/brep.mjs` (9) | in de app: exacte plaat, cilindrisch gat, selectie overleeft de wissel, exacte afronding, Mass Properties, shell, terugval, de hele Deurkruk-assembly exact |
| `e2e/step.mjs` | Save As ▸ STEP schrijft 7 vlakken met een echte cilinder |
| `e2e/desktop.mjs` | een part wordt exact in de Electron-app |
| `e2e/tools/brep-parts.mjs` | hulpmiddel: per Deurkruk-onderdeel exact of niet, volume, screenshot |

## Volgende stappen

1. Linear/circular pattern en mirror via B-rep-transformaties (de patroon-instanties als kopieën van het gereedschap).
2. Loft (ThruSections), draft (DraftAngle), shell naast afrondingen (verschil met de mesh-wand uitzoeken).
3. Topologische namen voor vlakken en randen uit de bouwgeschiedenis van OpenCascade.
4. De hele rebuild in de worker (F46), zodat de mesh-stap overbodig wordt.
