# Mutatietests, herhaalde e2e-runs en .kcad-compatibiliteit met 0.5.10 (P0-8, P1-10) — QA 0.5.11, plan NAAR-100

## P0-8 / F184 — mutatietests: vangen de QA-tests een fout?

`tools/mutation-check.cjs` plant telkens één bekende fout en draait de tests die ze moeten vangen. Die moeten **rood**
worden; een mutatie die erdoor glipt is `MISSED` en het script eindigt met exit 1.

| # | mutatie | bestand | moet falen | resultaat (lokaal, Windows) |
|---|---|---|---|---|
| a | `matchEdges` geeft van een gesplitste rand alleen het eerste stuk (`pieces.slice(0, 1)`) | `src/core/features/edgesets.ts` | `qaTeam`, `qaStrict` | caught (10 tests rood in beide bestanden) |
| b | `SHAPE_MISMATCH_MM` × 10 (0,1 → 1,0 mm) | `src/core/features/volumeCheck.ts` | `qaCrossCheck` | caught (5 tests) |
| c | elke filletstraal × 1,01 in `roundTools` (mesh-kernel) | `src/core/features/round.ts` | `qaStrict` | caught (11 tests) |
| d | ratio van de linear coupler omgedraaid | `src/core/assembly/assembly.ts` (`solveMate`) | `mechMates` | caught (6 tests) |

De tellingen zijn wat vitest als mislukte taken telt (tests plus hun describe-blokken).

**Hoe:** de werkboom wordt nooit beschreven. Per mutatie start het script een kindproces dat vitest draait via de
Node-API (`startVitest`) met een plugin waarvan de `load`-hook voor dat ene bestand de gemuteerde tekst teruggeeft in
plaats van het bestand op schijf. Gevolgen:

- andere runs op dezelfde boom (mensen of agenten die tegelijk `vitest` draaien) zien de fout nooit;
- er hoeft niets teruggezet te worden, ook niet na Ctrl+C of een crash;
- het script bewijst het toch: de sha256 van de vier bestanden en `git diff --quiet` op elk ervan zijn na afloop wat
  ze bij de start waren (`tree unchanged: yes` in de DONE-regel).

Valkuil die we zo vonden: vitest 5 heeft standaard een **transform-cache op schijf** (`node_modules/.vitest-cache`,
sleutel = bestandsinhoud + pluginnamen). Zonder maatregel kreeg mutatie a een gecachte, *niet*-gemuteerde
`edgesets.ts` uit de run van mutatie d (zelfde pluginnaam) en draaide ze groen. Nu: `fsModuleCache: false` in het
kindproces én een pluginnaam per mutatie (hash van bestand + code). Het script telt bovendien hoe vaak de plugin het
bestand echt leverde; 0 keer geeft `NOT-LOADED` (telt als niet gevangen) in plaats van een vals groen.

Verder: elke mutatie zoekt zijn tekst en eist dat die **precies één keer** voorkomt; verschuift de code door een
refactor, dan faalt het script luid in plaats van niets te testen. Vooraf draait een **baseline**: dezelfde tests
zonder mutatie moeten groen zijn, anders bewijst rood niets (`--no-baseline` slaat die over, `--only a,c` kiest
mutaties).

Duur lokaal: ~45 s (baseline 4 bestanden + 4 mutaties). In CI staat het als stap `mutation` in de `checks`-job, na
`unit`, met `continue-on-error` en meegenomen in de eindcontrole ("all checks passed").

Opmerking bij c: `qaBrep` vangt een straalfout in `round.ts` niet en kan dat ook niet: de B-rep-fillet loopt via
OpenCascade (`occt/brep.ts`), niet via `round.ts`. De opdracht beperkt de mutaties tot de vier genoemde bestanden; een
mutatie van de B-rep-straal is een mogelijke vijfde.

## P0-8 — herhaalde e2e-runs (flakiness)

`e2e/run-regression.mjs` kent nu `E2E_REPEAT=N` (standaard 1):

- elk script draait N keer na elkaar;
- de logregel per script zegt hoeveel runs groen waren en de exitcode van elke run, bv.
  `flip: 2/3 green exit=0,1,0 …`; de rest van de regel citeert de eerste mislukte run;
- een script telt in DONE alleen als groen als **alle** N runs groen waren; scripts met 0 < groen < N staan apart als
  `flaky: <script> (k/N)`;
- de uitvoer van elke mislukte run gaat naar `e2e-out/<script>-run<i>-output.txt` (bij N = 1 ongewijzigd
  `<script>-output.txt`); het log heet `regression-<versie>-…-repeatN.txt`, zodat een herhaalrun het gewone log niet
  overschrijft; de kop vermeldt `each N times`.
- een ongeldige waarde (0, 1.5, tekst) stopt de run met een foutmelding.

Getest met drie stub-scripts (altijd groen, één keer op drie rood, één toegestane skip): `DONE 2/3 green (all 3 runs) …
— failed: flip — flaky: flip (2/3)`, exit 1; met N = 1 is de uitvoer zoals voorheen.

**CI:** `ci.yml` heeft een `workflow_dispatch`-input `repeat` (getal, standaard 1) die als `E2E_REPEAT` naar de
regressiejobs gaat, op Linux (`regression`) én Windows (`regression-windows`). Bij een push is de input leeg en geldt 1;
een herhaalrun gaat dus nooit vanzelf. Starten:

```
gh workflow run ci -f repeat=10
gh workflow run ci -f repeat=10 --ref <branch>
```

Bij `repeat > 1` krijgen de regressiejobs de maximale jobduur van 6 uur (`timeout-minutes` 360 i.p.v. 90/120). Let op:
een release-shard duurt op een runner 25–35 min, dus 10× past krap of niet in 6 uur. Voor een volledige N = 10 is
lokaal draaien op een deel van de scripts realistischer, bv.
`E2E_REPEAT=10 node e2e/run-regression.mjs features filletopts qa2`.

## P1-10 — .kcad-compatibiliteit met 0.5.10

Fixtures in `src/core/document/fixtures-0.5.10/`, allemaal uit de release-commit van 0.5.10 (`a4b1e92`):

| bestand | soort | herkomst |
|---|---|---|
| `Kruk.kcad` | part: revolve, cut, sweep, revolve | `git show a4b1e92:voorbeelden/deurkruk/Kruk.kcad`, ongewijzigd |
| `Deurkruk.kcad` | assembly: 12 componenten, 23 mates, ingebedde parts (o.a. 4 normdelen) | idem `Deurkruk.kcad` |
| `Kruk-tekening.kcad` | tekening: 6 aanzichten (projectie, doorsnede, detail) | idem `Kruk-tekening.kcad` |
| `user-part1.kcad` | part: extrude + fillet | `a4b1e92:e2e/fixtures/user-part1.json` (ruw autosave-document), opgeslagen met de 0.5.10-serializer |
| `plaat-patroon-fillet.kcad` | part: plaat 80×40×10, gat Ø6, lineair patroon ×4, fillet R2 op 4 hoekranden | gebouwd en opgeslagen met de 0.5.10-bronnen |
| `plaatwerk.kcad` | plaatwerk: tab 60×40 (t 2, R 3), edge flange 90°/20, closed hem | idem |
| `configuraties.kcad` | 3 configuraties: Default, Dik (D1 = 20), Zonder gat (cut onderdrukt) | idem |

De 0.5.10-documenten zijn gemaakt met `git archive a4b1e92 src`, een bouwscript tegen die bronnen (zelfde
modelfuncties als de 0.5.10-unit-tests: `createSketch`, `addLine`, `edgeRef`, `addConfiguration`, …), gebundeld met
esbuild en gedraaid met Node; opslaan met de 0.5.10-`serializeDocument`, en 0.5.10 opende elk bestand weer met zijn
eigen `parseDocument`. Hetzelfde script gaf de 0.5.10-volumes (mesh-kernel). De e2e-builders van toen bouwen via de UI
(Playwright) en schrijven geen bestand; daarom deze weg.

`src/core/document/compat0510.test.ts` (7 tests): elk bestand opent met `parseDocument`; de featurelijst (type:naam)
is dezelfde als in het bestand en als een vastgelegde lijst (ook per assembly-component en per tekeningaanzicht); de
rebuild op de mesh-kernel geeft het vastgelegde volume tot op een miljoenste, en ligt binnen 0,5 % van het
0.5.10-volume en van het exacte (B-rep) volume.

Volumes (mm³):

| fixture | nu (mesh) | 0.5.10 (mesh) | exact (B-rep, nu) | controle |
|---|---|---|---|---|
| Kruk (ook in Deurkruk ×2 en 4 tekeningaanzichten) | 39274,974 | 39282,354 | 39357,325 | −0,21 % t.o.v. exact (gefacetteerde sweep/revolve) |
| user-part1 | 2478265,796 | idem | 2478539,816 | −0,011 % |
| plaat-patroon-fillet | 30836,088 | 30841,866 | 30834,690 | gesloten vorm 32000 − 4·π·9·10 − 4·(4 − π)·10 = 30834,690 |
| plaatwerk | 8687,057 | idem | 8693,543 | −0,075 % (gefacetteerde bochten) |
| configuraties Default | 46863,451 | idem | 46858,407 | 100·50·10 − π·10²·10 |
| configuraties Dik | 93726,901 | idem | 93716,815 | dubbel zo dik |
| configuraties Zonder gat | 100000 | idem | 100000 | 100·50·20 (kopie van Dik, cut onderdrukt) |
| Deur | 7177291,389 | idem | 7177254,869 | |
| Rozet (×2) | 13419,749 | 13467,145 | 13432,433 | nu −0,09 %, 0.5.10 +0,26 % |
| Vierkantstift | 6400 | idem | 6400 | 8·8·100 |
| Sleutelrozet (×2) | 7739,129 | 7769,296 | 7749,474 | nu −0,13 %, 0.5.10 +0,26 % |
| ISO 10642 M4 x 16 (×4) | 219,229 | idem | 219,604 | |

Verschil met 0.5.10 alleen bij onderdelen met revolve/gaten (Rozet −0,35 %, Sleutelrozet −0,39 %, Kruk −0,02 %,
plaat-patroon-fillet −0,02 %): 0.5.11 facetteert fijner, de nieuwe waarde ligt telkens dichter bij het exacte volume.
Featurelijsten en documentstructuur zijn ongewijzigd. Het plaatwerkvolume hangt af van `sheetmetal*.ts`; verandert
dat bewust, dan moet de vastgelegde waarde mee (en de reden hier).

AutoRecover van 0.5.10 (tweede deel van P1-10) was al gedaan: `electron/recover.cjs` `adoptLegacyCopies`, test in
`src/app/recover.test.ts`.
