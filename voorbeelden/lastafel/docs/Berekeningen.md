# Berekeningen heftafel en lastafel

Gemaakt met `docs/berekeningen.py`. De maten komen uit `maak-lastafel.mjs`. Last: 4 000 kg inclusief het blad, zoals DCT
opgeeft. Daarbij komt het eigen gewicht van wat meebeweegt: bovenframe, opvanglade, steunvlakken en armen samen
± 342 kg. De armen tellen hier volledig mee; in werkelijkheid draagt de cilinder er ongeveer de helft van.

## 1. Schaar

Eén schaar met twee armparen. De scharnierafstand is 2 080 mm. De vaste scharnieren zitten op z = -1 000, de rollen
aan de andere kant. De onderste harten liggen 75 mm boven de vloer, de bovenste 75 mm onder de bovenkant.
Bovenkant H = 150 + 2 080 · sin θ.

| Bovenkant lift H (mm) | Armhoek θ | Cilinder (oog-oog, mm) | Cilinderhoek | Kracht per cilinder (kN) | Druk Ø100 (bar) |
|--:|--:|--:|--:|--:|--:|
| 370 | 6,1° | 675 | 21,0° | 93,8 | 119 |
| 400 | 6,9° | 682 | 22,5° | 90,1 | 115 |
| 450 | 8,3° | 694 | 24,9° | 84,7 | 108 |
| 500 | 9,7° | 707 | 27,2° | 80,3 | 102 |
| 600 | 12,5° | 735 | 31,6° | 73,4 | 93 |
| 700 | 15,3° | 765 | 35,7° | 68,3 | 87 |
| 825 | 18,9° | 806 | 40,5° | 63,8 | 81 |
| 1 000 | 24,1° | 866 | 46,7° | 59,5 | 76 |
| 1 200 | 30,3° | 940 | 53,1° | 56,6 | 72 |
| 1 425 | 37,8° | 1 026 | 59,7° | 54,8 | 70 |

- **Slag:** 351 mm (cilinder 675 tot 1 026 mm tussen de ogen). Gekozen: 2 x enkelwerkende plunjer- of
  zuigercilinder Ø100/56, slag 360, inbouwlengte ≤ 675 mm.
- **Hoogste druk:** 119 bar, in de laagste stand. Overdrukventiel op 140 bar; alle onderdelen zijn voor 250 bar.
- **Waarom niet zoals in de video?** Hangt de cilinder aan de as van de arm en staat zijn voet 140 mm hoog, dan wordt hij
  in de laagste stand bijna vlak (8°). De druk loopt dan op tot ± 800 bar (Ø80) of ± 520 bar (Ø100). Met het
  ophangpunt 90 mm boven de arm en de voet op 60 mm start hij onder 21°. Van buiten ziet het er hetzelfde uit.

## 2. Knik van de stang (Euler, scharnierend-scharnierend)

I = π · 56⁴ / 64 = 482 750 mm⁴; knik­lengte = 1 026 mm (helemaal uitgeschoven):
F<sub>knik</sub> = π² · E · I / L² = 950 kN. In de hoogste stand is de kracht 54,8 kN, dus de
veiligheid is 17,3. In de laagste stand is de kracht 93,8 kN, maar dan is de stang ingeschoven.

## 3. Pomp, motor en aansluiting

- Olie per volle slag (2 cilinders): 5,51 l. Tandwielpomp 2,5 cm³/omw bij 2800 /min = 7,0 l/min, dus
  helemaal omhoog in **47 s** (gemiddeld 22 mm/s).
- Vermogen bij de hoogste druk: p · Q / η = 1,86 kW. Gekozen: **2,2 kW, 230 V eenfasig** (DCT: 220 V tot
  2400 x 1200). Stroom ± 13,3 A. Aansluiten met een CEE-stekker 230 V 16 A op een groep C16 of D16 (voor de
  aanloopstroom).
- Tank 12 l: dat is meer dan 5,5 l nodig voor de slag, met reserve voor de koeling.

## 4. Zakken

Het zakken gebeurt door het eigen gewicht, via een zitklep 2/2 (stroomloos dicht, lekvrij) en een drukgecompenseerde
smoorklep van 9 l/min. Helemaal omlaag duurt 37 s; de snelheid is ± 29 mm/s. EN 1570-1
laat maximaal 150 mm/s toe. In elke cilinder zit een **leidingbreukventiel**: breekt een slang, dan sluit het bij
± 1,5 x de zakstroom, en de tafel blijft staan.

## 5. Valbeveiliging (gele kap met zaagtand)

Een palplaat op de koker scharniert achteraan. Een veer drukt ze in de tanden van de kap. Bij het zakken trekt de
ontgrendeling ze 15 mm weg. Steek 30 mm: de tafel zakt hooguit één tand (± 30 mm langs de cilinder) voor ze vastzit.
Nazicht met 1,5 x de cilinderkracht (stoot bij het invallen). Afschuiving van de tanden: 2 kapzijden van 8 mm,
tandvoet 30 mm, S355, τ<sub>toel</sub> = 355 / √3 / 1,5 = 137 MPa.

| H (mm) | 1,5 x F (kN) | Tanden in grip | Oppervlak (mm²) | τ (MPa) |
|--:|--:|--:|--:|--:|
| 370 | 140,7 | 12 | 5 760 | 24 ✓ |
| 825 | 95,7 | 10 | 4 800 | 20 ✓ |
| 1 425 | 82,2 | 2 | 960 | 86 ✓ |

## 6. De lastafel

- Raster Ø28 op 100 mm, DG: 288 rastergaten en 253 diagonale gaten = **541 gaten** in het blad. Elke zijwand
  heeft 3 rijen gaten (50, 100 en 150 mm onder de bovenkant).
- Massa: blad 500 kg + wanden 106 kg + ribben 117 kg ≈ **723 kg**.
- Nuttige last op de heftafel met deze tafel: 4 000 - 723 ≈ **3 277 kg**. DCT geeft ± 3 100 kg op
  voor 2400 x 1200 met hun M800-blad.
