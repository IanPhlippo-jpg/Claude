# qa-logs

Het bewijs achter elke claim in README, docs en TASKS (QA 0.5.10 F93/F148/F149, QA 0.5.12 F180): per commit een map met
een `manifest.json` en de volledige logs. `e2e-out/` staat in `.gitignore`; wat een claim onderbouwt, staat hier als kopie.

## Maken

- `npm run bewijs`: de lokale poort (dezelfde commando's als de CI-job "checks": typecheck, unit, mutatie, tekst, build,
  budgetten) → `<versie>/local-<platform>-<commit>/`. Met `-- --voorbeelden` ook de voorbeeldtests, met `-- --e2e` ook
  de regressielogs uit `e2e-out/` die van deze commit zijn (kop `commit <sha>` zonder "uncommitted changes").
- `npm run bewijs -- --ci <run-id>`: een GitHub Actions-run → `<versie>/actions-<run-id>-<commit>/`, met per job het
  volledige joblog (`<job>/job-<job>.txt`), alle artefacten (`artifacts/`) en de run zelf.

Het script geeft exit 0 alleen als alles groen was. Een lokale run met een vuile werkboom heet in het manifest
`ok: false`: die is geen bewijs voor de commit.

## Wat het manifest zegt

- `provenance`: volledige commit, branch, of de werkboom schoon was (en welke bestanden niet), versie, datum, OS, CPU,
  geheugen, Node, npm, git, Playwright.
- `sources`: sha256 van `package-lock.json`, van `git ls-files -s` (alle gevolgde bestanden in één hash) en van elke fixture.
- `steps`: per stap het commando, de exitcode, de duur, het logbestand (stdout en stderr volledig) en de hash ervan.
- `unit`: tellingen uit de JSON van vitest, per overgeslagen test de reden (de `skipIf`-voorwaarde in de bron) en de
  testbestanden die `npm test` bewust uitsluit (`excluded`, met de reden).
- `jobs` (CI): per job de conclusie, de stappen en de DONE-regel van de regressie.
- `files`: sha256 van elk bestand in de map, zodat een kopie (zip) tegen het manifest te controleren is.

## Oudere mappen

Tot 0.5.12 zonder manifest: `<versie>/linux/<run-id>-<commit>/<shard>/` en `<versie>/actions-<run-id>-<commit>/`, met
een README per versie die zegt welke shard op welke commit groen was. De joblogs `checks/` en `desktop/` van 0.5.11 en
0.5.12 waren `.log` en vielen onder `*.log` in `.gitignore`; sinds 0.5.13 staan ze erin (uitzondering voor `qa-logs/`).
