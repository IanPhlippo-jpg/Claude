# Fase 1 — 2D-schetser met constraint-solver

## Architectuurschets

```
┌──────────────────────────────────────────────────────────────────────┐
│ UI (React)                                                           │
│  TitleBar · Ribbon(tabs) · DockColumn[FeatureTree, PropertyManager,  │
│  RelationsPanel] · Viewport(three.js + SVG-overlay, ViewCube, Triad) │
│  · StatusBar · Shortcuts · eigen componentenset (src/ui)             │
└───────────────▲──────────────────────────────┬───────────────────────┘
                │ selectors                    │ acties (commit, drag, undo…)
┌───────────────┴──────────────────────────────▼───────────────────────┐
│ Store (zustand, src/app/store.ts)                                    │
│  Document{sketches, features} · History(undo/redo snapshots)         │
│  · autosave(localStorage) · selectie/tool/panel-layout/thema         │
└───────────────▲──────────────────────────────┬───────────────────────┘
                │ SolveResult                  │ Sketch (immutable JSON)
┌───────────────┴──────────────────────────────▼───────────────────────┐
│ Core (framework-vrij, getest met vitest)                             │
│  sketch/model.ts     – entiteiten, punten, scalars, constraints      │
│  sketch/geometry.ts  – sampling, hit-test, snapping/inference        │
│  sketch/relations.ts – contextgevoelige relatie- en maatkeuze        │
│  solver/equations.ts – constraint → vergelijkingen (residuen)        │
│  solver/solver.ts    – Levenberg-Marquardt, DOF/rang-analyse,        │
│                        redundantie & conflictdetectie, drag-solve    │
│  solver/linalg.ts    – Cholesky, RREF, nulruimte                     │
│  solver/solverClient – sync voor kleine schetsen, web worker daarboven│
│  document/           – Document-type, History, .kcad-formaat         │
└──────────────────────────────────────────────────────────────────────┘
```

### Datamodel
- Een `Sketch` is pure JSON: `points` (x,y-parameters), `scalars` (radii), `entities`
  (point, line, circle, arc, spline), `constraints`. Entiteiten verwijzen naar punt-ids,
  zodat punten gedeeld kunnen worden (lijnketens) én coincident als vergelijking kan bestaan.
- Elke mutatie geeft een nieuw sketch-object terug (structural sharing). Undo/redo bewaart
  document-snapshots; dit is goedkoop en altijd consistent.

### Solver
- Elke constraint wordt vertaald naar één of meer residu-functies `f(x) = 0` met een
  afhankelijkheidslijst (sparse numerieke Jacobiaan).
- Levenberg-Marquardt met `(JᵀJ + λ(diag(JᵀJ)+I)) δ = −Jᵀf`, Cholesky-oplossing, adaptieve λ.
- Analyse na convergentie:
  - `DOF = n − rang(J)` (RREF met relatieve tolerantie).
  - Per parameter "bepaald" ⇔ orthogonaal op de nulruimte → entiteitstatus blauw/zwart.
  - Lineair afhankelijke rijen (RREF van Jᵀ) → **redundante** constraints (rood).
  - Residu > tolerantie → **conflicterende** constraints (rood, foutmelding in statusbalk).
- Slepen: tijdelijke vergelijkingen pinnen het punt aan de cursor; als dat onhaalbaar is,
  wordt opnieuw opgelost zonder de pin zodat de schets geldig blijft. Alleen blauwe
  (vrije) punten zijn sleepbaar — zoals in desktop-CAD.
- Driven (referentie-)maten worden niet opgelost en tellen niet mee.

### Viewport
- three.js `OrthographicCamera` met eigen orbit/pan/zoom-op-cursor (`CadCamera`).
  Schetsvlakken: Voor (XY), Boven (XZ), Rechts (YZ) met vaste basis `u,v,n`.
- Geometrie als `LineSegments` met vertex-kleuren (status), constructie gestippeld,
  punten als `Points`; raster adaptief op zoomniveau.
- Annotaties (maten, relatie-glyphs, snap-markers, selectiekader) in een SVG-overlay
  die dezelfde projectie gebruikt; maatlabels zijn klik- en sleepbaar.
- View cube (CSS-3D) en oriëntatietriade volgen de camera-quaternion.

### UI-conventies (uit onderzoek, docs/01-research.md)
- Ribbon met tabs Sketch / Features / Assembly / Drawing / Evaluate.
- Feature tree links, Property Manager eronder (dockbaar links/rechts/zwevend, breedte sleepbaar).
- Statusbalk: sketch-status met DOF, cursorcoördinaten, solver-tijd, eenheden.
- Kleuren: blauw onderbepaald, zwart volledig, rood over/conflict.
- Sneltoetsen: L/R/C/A/N/P/D, X, Esc, Enter, Del, Ctrl+Z/Y, Ctrl+S/O, F, Ctrl+1…8, spatie, S, ?.

## Tests

| Laag | Bestand | Dekt |
|---|---|---|
| linalg | `src/core/solver/solver.test.ts` | RREF-rang, bepaalde parameters, afhankelijke rijen |
| solver | idem | vrije lijn (4 DOF), volledig bepaalde lijn/rechthoek, 1-DOF-rechthoek, redundantie, conflict, driven, tangent lijn-cirkel & cirkel-cirkel, equal, symmetric, angle/parallel/midpoint/concentric, boogregels, drag-solve |
| geometrie | `src/core/sketch/geometry.test.ts` | hit-test prioriteit, boogafstand, snapping (midpoint, on, horizontaal), sampling |
| relaties | `src/core/sketch/relations.test.ts` | contextgevoelige relatielijst, smart dimension-keuze en meting |
| document | `src/core/document/history.test.ts` | undo/redo, .kcad serialisatie |
| e2e | `e2e/smoke.mjs`, `e2e/relations.mjs` | tekenen, inference, Smart Dimension, undo/redo, dark mode, autosave; relaties via Property Manager, over-/volledig bepaald, tangent, slepen, spline, kaderselectie |

Uitvoeren: `npm test` (vitest, 25 tests) · `npm run build && npm run preview` + `npm run e2e`.

## Demo (± 2 minuten)

1. Start de app; thema volgt het systeem (schakel met de maan/zon-knop of Ctrl+Shift+D).
2. **Features ▸ Schets op voorvlak** — de camera draait "normal to", raster en assen verschijnen.
3. Druk **R**, klik op de oorsprong (vierkant snap-marker) en een hoek: rechthoek met automatische
   H/V-relaties en coincident op de oorsprong. Statusbalk: *Onderbepaald (2 DOF)*; lijnen blauw.
4. Selecteer de onderste en rechter lijn (Ctrl) → Property Manager toont *Parallel/Loodrecht/Gelijk/Collineair*; kies **Gelijk**. 1 DOF.
5. Druk **D**, klik de onderste lijn, klik eronder om te plaatsen, typ `50`, Enter → alles wordt
   zwart: *Volledig bepaald*.
6. Voeg nog een lengtemaat toe op de rechter lijn → rood + melding "redundante relaties"; Ctrl+Z.
7. Teken een cirkel (**C**) en een 3-puntsboog (**A**), selecteer beide → **Tangent**. Sleep het
   cirkelmiddelpunt: de tangentrelatie blijft gelden terwijl je sleept.
8. Dubbelklik een maatlabel om de waarde te wijzigen; sleep het label om het te verplaatsen.
9. Open **Relaties** (ribbon) voor de lijst "weergeven/verwijderen".
10. Schets afsluiten (✓), **Ctrl+7** isometrisch: de schets staat op het voorvlak in 3D.
    Herlaad de pagina: autosave herstelt het document. **Ctrl+S** bewaart een `.kcad`-bestand.

## Bekende beperkingen (fase 1)
- Trim/extend/offset/mirror in de schets volgen in fase 2 samen met feature-mirror/pattern.
- Spline is Catmull-Rom door punten; tangent-/curvatuurrelaties op splines nog niet.
- Rollback-balk verbergt alleen; regenereren komt met de feature-history in fase 2.
- Het solver-pad in de web worker wordt pas boven 300 parameters gebruikt (interactief slepen is altijd synchroon).
