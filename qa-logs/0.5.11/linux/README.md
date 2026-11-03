# Linux-logs 0.5.11 (GitHub Actions, ubuntu-24.04, software-GL)

Per Actions-run een map `<run-id>-<commit>/<shard>/` met het regressielog van die shard (`regression-0.5.11-…txt`,
kop met commit en platform) en, voor een gefaald script, zijn volledige uitvoer (`<script>-output.txt`).

| Run | Commit | Groen | Rood |
|---|---|---|---|
| [41542259973](https://github.com/IanPhlippo-jpg/Claude/actions/runs/41542259973) | c1fc039 | checks, desktop, release-1of3 (33/33), release-2of3 (33/33), release-3of3 (32/32), mesh-3of3 (32/32) | brep 11/12 (multibody), mesh-1of3 32/33 (multibody), mesh-2of3 32/33 (misc7) |
| [41551048560](https://github.com/IanPhlippo-jpg/Claude/actions/runs/41551048560) | 75ceeea | checks, desktop, brep (12/12), mesh-2of3 (33/33), release-1of3 (33/33), release-2of3 (33/33) | mesh-1of3 32/33 (multibody), mesh-3of3 31/32 (features), release-3of3 31/32 (features: scripttimeout 900 s; dezelfde shard deed 829 s op c1fc039) |

| [41600737843](https://github.com/IanPhlippo-jpg/Claude/actions/runs/41600737843) | db0d4b2 | **alles**: checks, desktop, release-1of3..3of3 (33+33+32 = 98/98), mesh-1of3..3of3 (33+33+32 = 98/98), brep (12/12), 0 skips | — |

De run op db0d4b2 is het Linux-bewijs van 0.5.11: elke pass groen op dezelfde commit (227 runnerminuten; `features`
534 s op het releasepad, 229 s mesh, 576 s brep). De twee eerdere runs tonen de rode scripts van onderweg; hun
oorzaken en fixes (772236a, 335405e) staan in `docs/28-qa-0.5.10.md`. De run op 772236a zelf kon niet starten omdat
het Actions-minutenquotum van de toen nog private repo op was; daarna is de repo publiek gemaakt.
