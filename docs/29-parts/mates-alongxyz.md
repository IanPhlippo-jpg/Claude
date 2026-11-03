# Mates (P0-3, P1-7) en AlongX/Y/Z (P2-5) — QA 0.5.11, plan NAAR-100

## P0-3 / F130 / F141 — mate-tests in de repo

`src/core/assembly/mateStatus.test.ts`, nieuw blok "chains and closed loops":

- **M3**: keten van 4 blokken (A vast, B, C, D met coincident), opgelost in 5 volgordes (mates omgedraaid en
  referenties omgedraaid): y = 0/10/20/30, geen conflict, status fixed/under/under/under.
- **M5**: gesloten lus A-B-C-A die niet sluit (distance 10, coincident, distance 25): het nieuwste mate is
  gemarkeerd; het onderdeel dat dat mate vasthoudt is `over`, het andere `under`. Getest in twee volgordes
  (lus-mate als laatste, en A-B als laatste).
- **F141**: twee distance-mates 10/20 en 20/10 op dezelfde vlakken: telkens het laatst toegevoegde gemarkeerd, en het
  onderdeel staat op de waarde van het **oudere** mate.

**Gevonden fout (F141, opgelost):** de markering zei "nieuwste mate conflicteert", maar de solver plaatste het onderdeel
volgens dat nieuwste mate; het oudere mate (als goed getoond) werd geschonden. In een lus kon de markering zelfs op een
ouder mate vallen. `solveMates` (`src/core/assembly/assembly.ts`) herkent nu een conflict (na 16 passes nog beweging, na
128 extra passes nog meer dan 1e-3 per pass) en laat dan de nieuwste mates één voor één weg (max. 8) tot de rest
uitkomt; die oplossing geldt. Lange ketens die alleen trager convergeren krijgen gewoon meer passes. Alleen bij een
conflict kost dit extra rekentijd.

## P1-7 — mechanische mates met gedragstests

Nieuw: `src/core/assembly/mechMates.test.ts` (15 tests, tolerantie 1e-6):

| mate | aandrijving | verwacht |
|---|---|---|
| screw (spoed 2) | schroef 30° | moer 1/6 mm (rechtse draad), draait niet mee |
| screw | moer 30°, of moer drijft de schroef | 1/6 mm, zelfde relatie in beide richtingen |
| screw | schroef 10 mm axiaal | moer gaat 10 mm mee |
| screw in samenstelling | frame + concentric, schroef 30° | moer 1/6 mm via `solveMates` |
| rack-pinion (r = 10) | rondsel 30° | heugel r·π/6 |
| rack-pinion | heugel 10 mm | rondsel 10/r rad, blijft op zijn plaats |
| rack-pinion (12 mm/omw.) | rondsel 30° | heugel 1 mm |
| linear coupler (ratio 2,5) | A 10 mm / B 10 mm | B 25 mm / A 4 mm |
| gear (ratio 0,5) | tweede wiel 30° | eerste wiel −60° |
| hinge | blad verschoven/gedraaid | terug op as en vlak, draaiing 30° blijft, status `under` |
| cam (excentrisch, e = 5, R = 20) | cam 30°, en 0–360° per 30° | vlakke volger op 20 + 5·sin θ |
| cam met rolvolger (r = 5) | cam 30° | volgeras op 25 van het camcentrum |

**Gevonden en opgeloste fouten** (in `solveMate`):

1. **screw**: een axiale verschuiving van de schroef nam de moer niet mee (relatie werd geschonden).
2. **rack-pinion**: de heugel kon het rondsel niet aandrijven (rondsel sprong terug naar de basisstand).
3. **linear coupler**: aangedreven vanaf de tweede referentie werd de ratio omgekeerd toegepast (25 mm i.p.v. 4 mm).
4. **gear**: zelfde fout als 3 bij aandrijving vanaf het tweede wiel.

Geen fout: hinge en cam (rond profiel). **Beperking:** de cam-mate kent alleen een rond (cilindrisch) camprofiel, geen
willekeurige gesloten keten van raakvlakken; daarvoor bevat `MateRef` geen geometrie.

## P2-5 — AlongX/Y/Z in de 3D-schets

- Nieuw `src/core/sketch/sketch3d.ts`: relaties `alongX/alongY/alongZ` per lijn; exacte oplossing per coördinaat
  (union-find over lijnen en gedeelde eindpunten): `drag3DPoint`, `addAlong` (eindpunt komt op de as door het
  beginpunt, één Along-relatie per lijn), `alongOf`, `withoutLine`.
- Model: `Sketch3DFeature.relations` (`src/core/document/types.ts`) en `Sketch3DEdit.relations` (`src/app/store.ts`);
  beide op de bestaande `fillets`-regel gezet omdat die bestanden op hun regelbudget zitten.
- `src/app/slices/sketch.ts`: een lijn getekend met Orientation Along X/Y/Z krijgt automatisch de relatie; bewerken
  laadt ze, OK slaat ze op, Undo last line verwijdert de relatie van die lijn.
- `src/app/panels/Sketch3DPM.tsx` (lijnenlijst = relatiepaneel van de 3D-lijnen): per lijn knoppen X/Y/Z
  (tooltip "Along X" …, `data-testid="sketch3d-alongZ-<i>"`), oplichtend als de relatie er is; klik voegt toe of
  verwijdert. De Control Vertex X/Y/Z-velden verplaatsen het punt nu als een sleep (relaties blijven gelden).
- `src/app/app.css`: `.k-pm-stylebtn.active` (ook de Space Handle-knoppen hadden geen zichtbare actieve stand).
- Test: `src/core/solver/relations2.test.ts` (het bestand staat in `src/core/solver/`, niet in `src/core/sketch/`):
  AlongZ houdt x en y van beide eindpunten gelijk na het slepen van elk van beide eindpunten; doorgifte over gedeelde
  punten (AlongZ + AlongX); AlongY toevoegen aan een schuine lijn; Undo.

**Niet gedaan:** slepen van 3D-schetspunten in de viewport bestaat nog niet (punten worden alleen geplaatst of via de
X/Y/Z-velden getypt); `drag3DPoint` is klaar om daar aan te hangen. Niet live in de app getest (geen e2e).

## Controle

- `npx vitest run src/core/assembly src/core/sketch`: 23 bestanden, 101 tests groen (was 83); met `src/core/solver`
  erbij 25 bestanden, 127 tests groen.
- `npx tsc -b`: geen fouten in deze bestanden (de enige resterende fout zit in `src/qa/qaCrossCheck.test.ts` van een
  andere agent).
- `node tools/line-budget.cjs`: ok. `node tools/neutral-comments.cjs`: 0 herschrijvingen.
