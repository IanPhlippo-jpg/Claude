# Robotcel: een industriële robot die deuren, plinten en planken van de band neemt (2026-11-09)

Gevraagd door Ian: een levensgrote robotarm die deuren met zuignappen van een lopende band afneemt en ze in alle
richtingen kan neerleggen. Hij moet ook plinten, kleine planken en andere stukken kunnen nemen, zelf het stuk vinden en
weten hoe hij het pakt. Hij moet snel zijn en volgens de normen van een industriële robot gebouwd zijn, ook qua uitzicht.
De eisen staan in [EISEN.md](EISEN.md).

## Wat er is

| Deel | Wat | Bestand |
|---|---|---|
| Robot | 6 assen, draagvermogen 120 kg, bereik 2700 mm (polsmidden), toolflens ISO 9409-1-A125 | `maak-robotarm.mjs` -> `Robotcel.kcad` |
| Grijper | vlakgrijper: 2 x Schmalz FA-M 1972 x 130 + 1 x FMP-60 1972 x 60, schuim met zelfsluitende ventielen, 3 zones, 5 ejectors | idem |
| Herkennen | camera Basler ace 2 (5 MP) en laser boven de band, fotocel, stopper; de grijpplanner rekent per stuk grijppunt, draaiing en zones | `besturing/greep.py`, [docs/Grijpen.md](docs/Grijpen.md) |
| Cel | rollenbaan, veiligheidshek 2000 hoog met vergrendelde deur, lichtschermen met muting, bedienpaneel met noodstop | `Robotcel.kcad` |
| Kabels | motor- en encoderkabels binnen door de holle assen, slangenpakket over de onderarm, aansluitpaneel op de voet, kabelbrug naar de kast | idem |
| Schakelkast | Rittal VX25 8206.000 (1200 x 2000 x 600) met montageplaat, alle toestellen en de deuren | `kast/maak-kast.mjs` -> `kast/Schakelkast.kcad`, `kast/Schakelkast-open.kcad` |
| HMI | aanraakscherm 15,6" in de kastdeur: overzicht, stukken met camerabeeld, handbediening, statistiek (stuks per uur, cyclustijd, OEE), alarmen, onderhoud, veiligheid | `hmi/index.html`, beelden in `hmi/beelden/` |
| Schema's | 19 bladen zoals EPLAN: voeding, servo's, 24 V, veiligheid, netwerk, I/O, pneumatiek (ISO 1219-1), opstelling kast en deuren, klemmenplannen, stuklijst | `schema/maak-schema.mjs` -> `schema/Schemaset-robotcel.pdf` |
| Berekeningen | koppel per as, reductoren, snelheden, motoren, gewichtscompensatie, vacuüm, perslucht | [docs/Berekeningen.md](docs/Berekeningen.md) |
| Veiligheid | risicobeoordeling, veiligheidsfuncties met PL, validatie | [docs/Veiligheid.md](docs/Veiligheid.md) |
| Besturing | opbouw, toestandsmachine, cyclus, software | [docs/Besturing.md](docs/Besturing.md) |

## De robot

- **Assen en snelheid:** A1 draaivoet 130 °/s, A2 schouder 120 °/s, A3 elleboog 120 °/s, A4/A5 pols 220 °/s, A6 300 °/s
  (zoals een industriële robot van deze klasse). Elke as heeft een servomotor met rem en multiturn-encoder en een
  cycloïdale reductor met holle as (Nabtesco RV-C): RV-320C op A1 tot A3, RV-100C op A4 en A5, RV-50C op A6.
- **De cilinder op de schouder is geen aandrijving.** Het is een hydropneumatische gewichtscompensatie die het
  eigen gewicht van de arm en de helft van de last draagt; zo kan A2 snel bewegen met een motor van 2,9 kW.
- **Maakwijze:** de armdelen zijn lasconstructies uit lasergesneden S355-plaat (zijplaten met de omtrek uit het model,
  een gezette omtrekband), na het lassen spanningsarm gegloeid, de lagerzittingen en flenzen in één opspanning
  nagefreesd, gestraald en gepoedercoat RAL 2004 (armen) en RAL 7016 (voet). Na de eerste weging de massa's in het
  rekenblad bijwerken.
- **Opschriften:** typenaam, asnummers met draairichting, waarschuwingen ISO 7010 (W001, W024) en het typeplaatje
  volgens EN ISO 10218-1.

## Kosten, eerlijk gezegd

Het budget van € 3.000 tot € 12.000 dekt deze robot niet. Alleen de zes reductoren en de zes servo's kosten al meer
dan € 12.000, ook als je goedkope Chinese reductoren koopt. Daar komen nog bij: de gelaste arm, de vlakgrijper, de
camera, de veiligheid, de kast en het hek. Hieronder staat de raming met de bron per regel. **Schatting** betekent dat
ik geen prijs vond en een marktprijs inschat; vraag daarvoor een offerte.

| Groep | Wat | Prijs (excl. btw) | Bron |
|---|---|--:|---|
| Reductoren | 3 x RV-320-klasse, compatibel (Chinees) | 3 x € 830 | [made-in-china, US$ 900](https://yijiaang.en.made-in-china.com/product/aArUgYLoqhWq/China-Durable-320e-RV-Gear-Reducer-with-High-Precision-Technology.html) |
| | 2 x RV-100-klasse, 1 x RV-50-klasse | 3 x € 600 (schatting) | offerte |
| | (origineel Nabtesco RV-C met holle as) | (offerte) | [nabtesco.de RV-C](https://www.nabtesco.de/en/products/series/rv-c) |
| Servoversterkers | Inovance SV660N: 2 x NT017I, 1 x NT021I, 3 x NT5R4I | € 5.282 | [actintime.be](https://actintime.be/en/shop/category/controllers-servo-drives-169) |
| Servomotoren | Inovance MS1H3 met rem: 2 x 2,9 kW, 1 x 4,4 kW, 3 x 1,3 kW | € 6.000 (schatting) | [actintime.be motoren](https://actintime.be/en/shop/category/motoren-servomotoren-129) (850 W kost er € 702) |
| Arm | lasergesneden S355, lassen, nafrezen, lagers, poedercoat, gewichtscompensatie | € 9.000 (schatting) | offerte bij een staalbouwer |
| Grijper | 2 x Schmalz FA-M 1972, 1 x FMP-60 1972 | € 4.500 (schatting) | [Schmalz FA-M](https://www.schmalz.com/en/products/automation-743270/vacuum-grippers-746238/gripping-systems-and-end-of-arm-tooling-eoat-746240/vacuum-area-gripping-systems-fa-x-fa-m-728892), offerte |
| | 5 x ejector SBPL 100 HV | 5 x € 1.000 | [Zoro, US$ 1.083](https://zoro.com/schmalz-multistage-ejector-10020101601/i/G411471243) |
| | vacuümschakelaars, ventielen, profiel 80 x 40 (5 m) | € 900 | [RS ZSE20A € 97](https://ie.rs-online.com/web/p/pressure-vacuum-switches/8435287/), [item € 55,61/m](https://www.klefinghaus.de/container-profile-8-80x40-natural-cutting-41064338-en.html) |
| Camera | Basler ace 2 + lens + 2 ledbalken + laser (dikte) | € 2.400 (schatting) | [Edmund, Basler € 815](https://www.edmundoptics.eu/p/basler-ace2-a2a2448-75umbas-monochrome-usb3-basic-camera/56311) |
| Veiligheid | Pilz PNOZmulti 2 + uitbreiding | € 1.040 | [RS € 737](https://ie.rs-online.com/web/p/safety-automation-controllers/9186594) + schatting |
| | 2 lichtschermen Sick deTec4 (zender + ontvanger) | € 5.800 | [RS ontvanger € 1.611,50](https://ie.rs-online.com/web/p/light-curtains/1363382), zender geschat |
| | deurvergrendeling Schmersal AZM201 | € 585 | [industry-electronics](https://industry-electronics.com/schmersal/103025859-azm201b-st-safety-interlock-lieske_2106497.htm) |
| Kast | Rittal VX25 8206.000, montageplaat, goten, filterventilatoren | € 2.200 (schatting) | offerte Rittal |
| | HMI Advantech FPM-215W-P4BE | € 847 | [DigiKey](https://www.digikey.ie/en/products/detail/advantech-corporation/FPM-215W-P4BE/23579244) |
| | IPC, EtherCAT-I/O, voedingen, beveiligingen, klemmen, kabels | € 3.500 (schatting) | offertes |
| Cel | hek met palen en panelen, stopper, fotocellen, kabelbrug | € 3.300 | [Festo stopper € 580](https://www.sp-spareparts.de/en/p/dfst-50-30-y4-a-g2-festo) + schatting |
| **Totaal** | | **± € 55.000** | |

**Mijn raad:** koop een tweedehands industriële robot van deze klasse met zijn eigen besturing (120 kg, ±2,7 m), voor
± € 15.000 tot € 25.000 (marktschatting, geen bron). Daar komen dan de grijper, de camera, de cel en de kast uit deze
map bij. Dat is goedkoper, sneller in gebruik en de robot is al gekeurd (EN ISO 10218-1). Deze map blijft in beide
gevallen bruikbaar.

## Wat nog moet gebeuren voor hij echt draait

1. Offertes voor de regels met een schatting; dan kiezen tussen zelfbouw en tweedehands.
2. Bij zelfbouw: de werktekeningen van de lasdelen (de zijplaten volgen uit `maak-robotarm.mjs`), FEM van de bovenarm
   en de voet, en de keuze van de lagers.
3. De veiligheid valideren met SISTEMA (EN ISO 13849-1) en de CE-markering met een technisch dossier
   (Machineverordening (EU) 2023/1230, vanaf 20 januari 2027).
4. De camera inleren (kalibratie met een dambordpatroon) en de grijpplanner afstellen op echte stukken.

## Opnieuw maken

```bash
node voorbeelden/robotarm/maak-robotarm.mjs
node voorbeelden/robotarm/kast/maak-kast.mjs
node voorbeelden/robotarm/schema/maak-schema.mjs
python voorbeelden/robotarm/docs/berekeningen.py
python voorbeelden/robotarm/besturing/greep.py
```

Testen: `npx cross-env VOORBEELDEN=1 vitest run src/qa/qaRobotarm.test.ts src/qa/schemaNorm.test.ts`. Beelden:
`node e2e/tools/look-robotarm.mjs`, `node e2e/tools/look-kast.mjs`, `node e2e/tools/hmi-robotarm.mjs`.
