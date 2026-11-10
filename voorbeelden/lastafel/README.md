# Lastafel op een schaarheftafel, zoals in de DCT-video (2026-11-09)

Gevraagd door Ian: de lastafel uit zijn video (@DCT_BV) "identiek 100%" namaken. Het is een 3D-lastafel Ø28 van
2400 x 1200 mm op een elektrohydraulische schaarheftafel van 4 ton. De eisen en keuzes staan in [EISEN.md](EISEN.md).

## Bronnen

Alles komt van DCT zelf: de video, de productpagina's en hun 3D-model. Uit dat model heb ik de buitenmaten en de
kleuren gemeten.

| Wat | Bron |
|---|---|
| Heftafel: 370 tot 1425 mm (zonder blad), 4000 kg inclusief blad, voetpedaal en handbediening, noodstop, 6 CNC-gefreesde steunvlakken, opvanglade, 220 V tot 2400 x 1200 | [dctbv.nl/heftafel-schaarlift](https://dctbv.nl/nl/producten/heftafel-schaarlift) |
| Lastafel 2400 x 1200: Ø28, raster 100 h.o.h., DG (diagonale gaten), blad 25-27 mm, S690QL, gasgenitreerd 800 HV | [dctbv.nl/lastafel-2400x1200](https://dctbv.nl/nl/producten/lastafel-2400x1200) |
| Onderframe 1190 x 2390, materialen en kleuren (zwart, verzinkt, RAL 7035, geel, gefreesd) | 3D-model op de productpagina van de heftafel ("Bekijk in 3D") |

## Wat er is

| Deel | Wat | Bestand |
|---|---|---|
| Model | 40 onderdelen; de lift in drie standen (370, 825 en 1425 mm) en zonder tafel | `maak-lastafel.mjs` -> `Lastafel.kcad`, `Lastafel-laag.kcad`, `Lastafel-hoog.kcad`, `Heftafel.kcad` |
| Lastafel | blad met 541 gaten Ø28 (288 op het raster, 253 diagonaal), 2 langswanden met elk 71 gaten, 2 kopwanden met elk 35 gaten, ribben, liniaal, eigen badge | idem |
| Heftafel | onderframe UNP 100 op een vloerplaat, schaar met 2 armparen (koker 116-160 x 45), middenpen M30, 4 rollen Ø90, bovenframe met opvanglade en 6 steunvlakken | idem |
| Hydrauliek | 2 cilinders Ø100/56 met gele valbeveiliging (kap met zaagtand en pal), aggregaat 2,2 kW, slangen | idem, [schema blad 5](schema/Schemaset-heftafel.pdf) |
| Bediening | bedienkast RAL 7035 met wartels; dubbel voetpedaal (op/neer) met kap en noodstop | idem |
| Berekeningen | schaar, cilinderkracht en druk over de hele slag, knik, pomp, motor, zakken, valbeveiliging, massa van de tafel | [docs/Berekeningen.md](docs/Berekeningen.md) |
| Mallen 1:1 | A3 (armwang volledig) en A4 (kop- en middenmal), elk 13 bladen, om af te drukken en op de plaat te plakken: ogen en lippen met asgaten, scharnierbokken, hijsogen, kapzijde en palplaat met zaagtand, kopplaat | `mallen/maak-mallen.mjs` -> `mallen/Mallen-lastafel-A3-1op1.pdf`, `mallen/Mallen-lastafel-A4-1op1.pdf` |
| Bouwplan en materiaal | 12 stappen met foto's; zaaglijst, plaatlijst, normdelen, kooponderdelen, verbruik, wat je moet bestellen | [docs/Bouwplan.md](docs/Bouwplan.md), [docs/Materiaallijst.md](docs/Materiaallijst.md) |
| Sterkte | evenwicht van de schaar per stand en lastgeval, spanning in de armen, pennen, ogen, bovenframe, kantelen | [docs/Sterkte.md](docs/Sterkte.md) |
| CE-dossier | risicobeoordeling (EN ISO 12100 / EN 1570-1), handleiding, EU-conformiteitsverklaring (ontwerp), CE-plaat en stickers op het model | [docs/Risicobeoordeling.md](docs/Risicobeoordeling.md), [docs/Handleiding.md](docs/Handleiding.md), [docs/EU-conformiteitsverklaring.md](docs/EU-conformiteitsverklaring.md) |
| Offertes | 4 aanvragen klaar om te mailen, met DXF per plaatdeel voor de lasersnijder | [docs/Offerteaanvragen.md](docs/Offerteaanvragen.md), `mallen/dxf/` |
| Schema's | 7 bladen zoals EPLAN: titelblad, inhoud, voeding 230 V, besturing 24 V, hydrauliek (ISO 1219-1), klemmenplan, stuklijst | `schema/maak-schema.mjs` -> `schema/Schemaset-heftafel.pdf` |

## Wat anders is dan bij DCT, en waarom

- **Badge:** het DCT-logo neem ik niet over (merkrecht). Op die plaats staat een eigen gele badge.
- **Cilinderophanging:** in de video liggen de cilinders in de laagste stand bijna plat. Met 4 t zou de druk dan oplopen
  tot boven 500 bar. Mijn cilinder hangt 90 mm boven de arm en zijn voet zit laag (60 mm). Zo start hij onder 21°
  en blijft de druk overal ≤ 123 bar. Van buiten ziet het er hetzelfde uit.
- **Valbeveiliging:** de pal zit in hetzelfde vlak als de gele tanden en scharniert achteraan. Bij het zakken trekken
  twee magneten de pallen weg (in het schema -Q12/-Q13).

## Bestellijst (indicatief, excl. btw)

**Schatting** betekent dat ik geen prijs vond; vraag daarvoor een offerte. Kopen bij DCT kost € 3 980 (heftafel 2400 x
1200) + € 4 340 (tafel DG). Dat is waarschijnlijk goedkoper dan zelf bouwen, zeker voor de tafel: het gasnitreren en
het CNC-boren van 750 gaten in S690QL is gespecialiseerd werk.

| Groep | Wat | Prijs | Bron |
|---|---|--:|---|
| Tafel | blad 2400 x 1200 x 25 S690QL + wanden en ribben, gelast, CNC-gefreesd, 750 gaten Ø28, gasgenitreerd | € 4 500 (schatting) | offerte, of kant-en-klaar bij [DCT € 4 340](https://dctbv.nl/nl/producten/lastafel-2400x1200) |
| Lift staal | onderframe, schaar, bovenframe, opvanglade: ± 650 kg S355, laseren, zetten, lassen, nafrezen steunvlakken, poedercoat zwart en geel | € 3 200 (schatting) | offerte staalbouwer |
| Hydrauliek | aggregaat 230 V 2,2 kW, enkelwerkend, met zak- en overdrukventiel | € 700 | [eBay, € 629,95 tot 721,33](https://www.ebay.de/str/hydraulics-shop24), [Hansa-Flex HKK 230V 2.2](https://shop.hansa-flex.de/en_GB/hydraulic-components/hydraulic-power-packs/compact-power-packs/hkk-230v-2-2-210-5-8/p/HKK230V2-2-21058) |
| | 2 cilinders Ø100/56 slag 360 met leidingbreukventiel | 2 x € 650 (schatting) | offerte (op maat) |
| | slangen 2SN DN10, koppelingen, olie HLP 32 (15 l) | € 180 (schatting) | |
| Elektro | noodstoprelais Pilz PNOZ s3 | € 156 | [elektrobode.nl](https://elektrobode.nl/products/pilz-pnozsigma-pnoz-s3-24vdc-relais-vr-veiligheidsstroomcircuits-750103) |
| | dubbel voetpedaal met kap (Steute GFS 2) + noodstop | € 420 (schatting) | [Zoro GFS 2, US$ 407,99](https://www.zoro.com/steute-gfs-2-1os1os-two-pedal-foot-switch-each-with-1nc-1no-contacts-momentary-action-with-shroud-1048842/i/G523330391/) |
| | hoofdschakelaar, motorbeveiliging, magneetschakelaar, voeding 24 V, automaat, lamp, knop, klemmen, kast, kabels, stekker, eindschakelaar, 2 trekmagneten | € 650 (schatting) | stuklijst in het schema (blad 7) |
| **Totaal** | | **± € 11 100** | |

## Wat nog moet gebeuren voor hij gebouwd wordt

1. De offerteaanvragen versturen (docs/Offerteaanvragen.md), of de tafel bij DCT kopen.
2. De sterkte is met de hand berekend (balktheorie, evenwicht per arm; Sterkte.md). Daarom zijn de armen versterkt
   tot 10 mm wanden en 180 hoog in het midden, met lagerbussen. Een FEM van de lasknopen rond de ogen kan een
   ingenieur nog nakijken.
3. Na de bouw: de proeven uit het bouwplan, het proefverslag, en het CE-dossier laten nakijken voor je de
   conformiteitsverklaring ondertekent.

## Opnieuw maken

```bash
node voorbeelden/lastafel/maak-lastafel.mjs
python voorbeelden/lastafel/docs/berekeningen.py
python voorbeelden/lastafel/docs/sterkte.py
node voorbeelden/lastafel/schema/maak-schema.mjs
node voorbeelden/lastafel/docs/materiaal.mjs
node voorbeelden/lastafel/mallen/maak-mallen.mjs
node voorbeelden/lastafel/web/maak-pagina.mjs
```

Testen: `npx cross-env VOORBEELDEN=1 vitest run src/qa/qaLastafel.test.ts` (`SNEL=1` slaat de tafel over). Beelden:
`node e2e/tools/look-lastafel.mjs`.
