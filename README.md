# Phlippo CAD

Parametrische 3D-CAD-webapplicatie voor werktuigbouwkundig ontwerp (TypeScript, React, three.js), met een interface die het
bekende desktop-CAD-pakket volgt (CommandManager, FeatureManager, PropertyManager, Heads-up View toolbar, Confirmation Corner).

![Schets](docs/screenshots/03-sketch-dimension.png)

```
npm install
npm run dev        # ontwikkelserver
npm test           # unit tests (vitest)
npm run build      # productiebuild
npm run preview    # serveer de build op :4173
npm run e2e        # Playwright-scenario's tegen de preview
```

Documentatie:
- `docs/01-research.md` — onderzoek naar workflow en lay-out van parametrische CAD.
- `docs/02-fase1-schetser.md` — architectuur, tests en demo van fase 1 (2D-schetser).
- `docs/03-vergelijking-solidworks.md` — vergelijking met de SOLIDWORKS-handleiding en doorgevoerde aanpassingen.

Status per fase:
1. 2D-schetser met constraint-solver — **gereed**
2. Feature-modelleren op B-rep-kernel — gepland
3. Variabelen, vergelijkingen, ontwerptabellen — gepland
4. Assemblies — gepland
5. 2D-tekeningen — gepland
6. Import/export — gepland
7. Massa-eigenschappen, meten, materialen, rendering — gepland
