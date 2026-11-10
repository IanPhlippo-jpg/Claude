# Sterkteberekening heftafel

Gemaakt met `docs/sterkte.py`. Per kant van de schaar heb ik het evenwicht opgelost: twee armen en het bovenframe, met
9 onbekenden (de scharnieren, de 2 rollen, de middenpen en de cilinderkracht). Dat staat in elke stand, voor 5
lastverdelingen volgens EN 1570-1:
- gelijk verdeeld;
- op de helft van het blad;
- op een kwart van het blad, waarbij één kant 75 % draagt.

De last is 4 000 kg met het blad, plus 462 kg eigen gewicht. Toelaatbaar is de vloeigrens gedeeld door
1.5: S355 dus 237 MPa.

**Arm:** een koker uit 2 wangen en een omtrekband van 10 mm, 45 breed en 116 tot 180 hoog, met een
lagerbus dwars door de koker in elke boring (45 lang).


## 1. Krachten en spanningen per stand en lastgeval

| H (mm) | Last | Cilinder (kN) | Middenpen (kN) | M arm A (kNm) | M arm B (kNm) | σ A (MPa) | σ B (MPa) |
|--:|---|--:|--:|--:|--:|--:|--:|
| 370 | gelijk verdeeld | 96,4 | 95,1 | 10,94 | 8,66 | 96 | 71 ✓ |
| 370 | op de helft naar de rollen | 96,4 | 99,9 | 17,51 | 14,24 | 140 | 115 ✓ |
| 370 | op de helft naar de vaste scharnieren | 96,4 | 91,7 | 4,38 | 13,52 | 52 | 109 ✓ |
| 370 | op een kwart (rolkant, één kant) | 139,6 | 144,7 | 25,36 | 20,62 | 203 | 167 ✓ |
| 370 | op een kwart (vaste kant, één kant) | 139,6 | 132,9 | 6,34 | 19,58 | 75 | 157 ✓ |
| 825 | gelijk verdeeld | 65,6 | 63,5 | 10,94 | 7,84 | 87 | 64 ✓ |
| 825 | op de helft naar de rollen | 65,6 | 72,5 | 17,51 | 13,94 | 132 | 100 ✓ |
| 825 | op de helft naar de vaste scharnieren | 65,6 | 56,2 | 4,38 | 12,70 | 43 | 103 ✓ |
| 825 | op een kwart (rolkant, één kant) | 94,9 | 105,0 | 25,36 | 20,19 | 191 | 144 ✓ |
| 825 | op een kwart (vaste kant, één kant) | 94,9 | 81,4 | 6,34 | 18,39 | 62 | 149 ✓ |
| 1 425 | gelijk verdeeld | 56,3 | 56,3 | 10,94 | 7,08 | 84 | 49 ✓ |
| 1 425 | op de helft naar de rollen | 56,3 | 70,6 | 17,51 | 13,65 | 130 | 95 ✓ |
| 1 425 | op de helft naar de vaste scharnieren | 56,3 | 43,3 | 4,38 | 10,59 | 39 | 85 ✓ |
| 1 425 | op een kwart (rolkant, één kant) | 81,5 | 102,2 | 25,36 | 19,77 | 188 | 137 ✓ |
| 1 425 | op een kwart (vaste kant, één kant) | 81,5 | 62,7 | 6,34 | 15,34 | 57 | 123 ✓ |

**Het zwaarste geval:** op een kwart (rolkant, één kant) op H = 370. Daar is σ = 203 MPa, tegenover
237 MPa toelaatbaar: ✓. De gebruiksgraad is 86 %.

Buiging overheerst. Het grootste moment zit in arm B, net naast het ophangpunt van de cilinder.

## 2. Pennen en ogen

Afschuiving: enkele snede, behalve het stangoog (dubbele snede). Toelaatbaar is 0,58 · 650 / 1.5 MPa
(42CrMo4). Stuik in de ogen: toelaatbaar 1,5 · fy / 1.5 = 355 MPa (EN 1993-1-8, pen in een
gat).

| Scharnier | Kracht (kN) | Pen Ø | τ (MPa) | τ toel. | Plaat t (mm) | Stuik (MPa) | Stuik toel. |
|---|--:|--:|--:|--:|--:|--:|--:|
| A onder (bok) | 135,8 | 40 | 108 | 251 ✓ | 45 | 75 | 355 ✓ |
| B boven (blok) | 25,6 | 40 | 20 | 251 ✓ | 12 | 53 | 355 ✓ |
| middenpen | 144,7 | 31 | 192 | 251 ✓ | 45 | 104 | 355 ✓ |
| cilinder (stangoog) | 139,6 | 40 | 56 | 251 ✓ | 24 | 145 | 355 ✓ |

**Rollen:** de rol A boven draagt hoogstens 30,9 kN, de rol B onder 24,1
kN. Kies een steunrol met een statisch draaggetal C₀ van minstens 1,5 x die kracht, bv. INA NUTR 40 (kijk het
draaggetal na in de catalogus).

## 3. Bovenframe

Elke langsligger (koker 110 x 50 x 5, W = 40 227 mm³) ligt op 2 steunpunten: het scharnier B en de rol A. Hij draagt
3 steunvlakken. Het grootste moment is 3,65 kNm, dus σ = 91 MPa ✓. In de hoogste
stand steekt het steunvlak aan de rolkant ± 500 mm uit.

## 4. Kantelen (EN 1570-1)

De zwaarste stand is de hoogste: werkhoogte 1 625 mm. De last ligt op de helft van het blad, zodat het zwaartepunt
600 mm uit het midden ligt in de lengte en 300 mm in de breedte. Daarbij komt een horizontale kracht van 5 % van het
gewicht, op de werkhoogte.

| Richting | Moment dat hem rechthoudt (kNm) | Kantelmoment (kNm) | Verhouding |
|---|--:|--:|--:|
| lengte | 43,5 | 4,3 | 10,2 ✓ |
| breedte | 21,6 | 4,3 | 5,1 ✓ |

Hij is stabiel zonder verankering. Verankeren (8 x M16) blijft aan te raden als er zwaar met een kraan op en af wordt
geladen.
