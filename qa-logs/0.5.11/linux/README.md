# Linux-logs 0.5.11 (GitHub Actions, ubuntu-24.04, software-GL)

Per Actions-run een map `<run-id>-<commit>/<shard>/` met het regressielog van die shard (`regression-0.5.11-…txt`,
kop met commit en platform) en, voor een gefaald script, zijn volledige uitvoer (`<script>-output.txt`).

| Run | Commit | Groen | Rood |
|---|---|---|---|
| [41542259973](https://github.com/IanPhlippo-jpg/Claude/actions/runs/41542259973) | c1fc039 | checks, desktop, release-1of3 (33/33), release-2of3 (33/33), release-3of3 (32/32), mesh-3of3 (32/32) | brep 11/12 (multibody), mesh-1of3 32/33 (multibody), mesh-2of3 32/33 (misc7) |
| [41551048560](https://github.com/IanPhlippo-jpg/Claude/actions/runs/41551048560) | 75ceeea | checks, desktop, brep (12/12), mesh-2of3 (33/33), release-1of3 (33/33), release-2of3 (33/33) | mesh-1of3 32/33 (multibody), mesh-3of3 31/32 (features), release-3of3 31/32 (features: scripttimeout 900 s; dezelfde shard deed 829 s op c1fc039) |

Samen: de releasepass (B-rep + worker) 98/98 op Linux (c1fc039), de brep-controle 12/12 (75ceeea), de mesh-pass per
shard 33/33 + 32/33 + 32/32 (shards 2 en 3 groen op verschillende commits; shard 1 nog rood op `multibody`). De
oorzaken van de rode scripts en de fixes (772236a) staan in `docs/28-qa-0.5.10.md`. De run op 772236a kon niet
starten: het Actions-minutenquotum van de privérepo was op (±315 runnerminuten per run).
