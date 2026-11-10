# Risicobeoordeling heftafel met lastafel

Ik volg de methode van EN ISO 12100 en de eisen van EN 1570-1 (veiligheidseisen voor heftafels). De machine is een
elektrohydraulische schaarheftafel van 4000 kg met een lastafel van 2400 x 1200 mm. Ze is gemaakt voor lassen en
monteren op werkhoogte, met één bediener aan het voetpedaal.

Deze beoordeling is de basis voor het technisch dossier. Na de bouw worden de maatregelen gecontroleerd met de proeven
uit het bouwplan (stap 10 en 12). Laat het dossier nakijken door een keuringsinstantie of een CE-adviseur voor je de
machine in gebruik neemt of verkoopt.

## 1. Grenzen van de machine

| | |
|---|---|
| Gebruik | lassen, hechten, monteren en richten van stalen werkstukken op de lastafel; werkhoogte 570 tot 1625 mm |
| Niet toegelaten | personen heffen, op de tafel staan tijdens het heffen, rijden of verplaatsen met last, last die buiten de tafel uitsteekt zonder steun, gebruik buiten (regen) |
| Nominale last | 4000 kg inclusief het blad (± 3280 kg op het blad), gelijk verdeeld; op een kwart van het blad: zie Sterkte.md |
| Gebruikers | opgeleide medewerkers van een werkplaats (handleiding gelezen) |
| Omgeving | binnen, vlakke betonvloer, 5 tot 40 °C, lasvonken en spatten op het blad |
| Levensduur | 20 jaar of 100 000 slagen, met jaarlijkse keuring |

## 2. Gevaren en maatregelen

Ernst (E) en kans (K) op een schaal van 1 tot 4, zonder en met de maatregelen.

| Nr | Gevaar | Waar / wanneer | E | K | Maatregel | E | K na |
|---|---|---|--:|--:|---|--:|--:|
| G1 | Knellen en scheren tussen de schaararmen | in de schaar, bij het zakken | 4 | 3 | dodemansbediening met het voetpedaal; de bediener staat aan de kopse kant met zicht op de schaar; zakken ± 30 mm/s; waarschuwing W019/W024 op de zijkant; de schaar zit binnen het bovenframe | 4 | 1 |
| G2 | Knellen van voeten onder het bovenframe | de rand van het bovenframe, in de laagste stand | 3 | 3 | 140 mm vrije ruimte tussen het bovenframe en het onderframe in de laagste stand (≥ 120 mm); het bovenframe steekt niet uit buiten het onderframe | 3 | 1 |
| G3 | Ongewild zakken door een slangbreuk | onder de tafel, tijdens onderhoud | 4 | 2 | leidingbreukventiel in elk aansluitblok; mechanische valbeveiliging (pal in de zaagtand); stalen steunbok verplicht bij werk onder de tafel | 4 | 1 |
| G4 | Overbelasting, vervormen of breken van de schaar | bij te zware of te excentrische last | 4 | 2 | overdrukventiel op 140 bar; armen berekend met veiligheid 1,5 op de vloeigrens (Sterkte.md); typeplaat en sticker "max 4000 kg"; statische proef met 1,25 x de nominale last | 4 | 1 |
| G5 | Kantelen | in de hoogste stand, met last aan de rand of bij het hijsen | 4 | 1 | kantelveiligheid 5 tot 10 (Sterkte.md); vloerankers M16 mogelijk; in de handleiding: niet hijsen met de tafel in de hoogste stand | 4 | 1 |
| G6 | Onverwacht bewegen | bij een fout in de besturing, of als iets op het pedaal valt | 3 | 2 | pedaal met beschermkap; zonder PLC (relaislogica); noodstop op het pedaal via noodstoprelais (PL c); eindschakelaar boven | 3 | 1 |
| G7 | Elektrische schok | bedienkast, motor, kabels | 4 | 1 | EN 60204-1: aarding van alle delen, IP55, hoofdschakelaar afsluitbaar, aardlekschakelaar 30 mA in de werkplaats, 24 V voor de bediening | 4 | 1 |
| G8 | Lasstroom door de lift | lassen op de tafel met de massaklem op de tafel | 2 | 3 | massaklem altijd op het blad of het werkstuk, nooit op het bovenframe of de schaar; de lagers zijn glijlagers (geen kogels die inbranden) | 2 | 1 |
| G9 | Hete olie of oliestraal | slangen en aggregaat | 3 | 1 | slangen 2SN (250 bar) met de juiste koppelingen; overdruk 140 bar; slangen vervangen na 6 jaar (EN ISO 4413) | 3 | 1 |
| G10 | Vonken en spatten op hydrauliek en kabels | onder de tafel tijdens het lassen | 2 | 3 | opvanglade onder het blad; slangen en kabels laag langs de vloer en onder de tafel | 2 | 1 |
| G11 | Vallende delen bij het hijsen van de tafel | plaatsen van het blad (723 kg) | 4 | 2 | 4 ringogen M20 (DIN 580) in de hoekgaten; kraan of heftruck ≥ 1 t; in de handleiding | 4 | 1 |
| G12 | Lawaai | aggregaat | 1 | 2 | < 70 dB(A) op 1 m (opgave van de leverancier) | 1 | 1 |

## 3. Veiligheidsfuncties

| Functie | Onderdelen | Niveau |
|---|---|---|
| Noodstop | -S1 (2 NC) -> -K1 PNOZ s3 -> -Q2 (motor) en -QM1 (zakken) | PL c (EN ISO 13849-1), stopcategorie 0 (EN 60204-1) |
| Dodemansbediening | -S2 / -S3 op het voetpedaal, direct naar -Q2 / -QM1 | PL c |
| Niet verder dan boven | eindschakelaar -B1 (NC, geforceerd openend) | PL c |
| Zakken bij een slangbreuk | leidingbreukventielen -RM2 / -RM3 in de cilinder | mechanisch-hydraulisch, opgave van de leverancier |
| Vasthouden na het zakken | pal in de zaagtand; vrij alleen met -Q12 / -Q13 bij "neer" | mechanisch |

## 4. Proeven voor de ingebruikname

Zie het bouwplan, stap 10 en 12:
- de statische proef met 1,25 x en de dynamische proef met 1,1 x de nominale last;
- de noodstop in beide richtingen;
- de eindschakelaar boven;
- de valbeveiliging;
- de zaksnelheid;
- de metingen volgens EN 60204-1 (aarding en isolatie).

Leg de resultaten vast in een proefverslag met datum, last, stand en handtekening.

## 5. Wat overblijft (in de handleiding)

- Werk niet onder de tafel zonder steunbok, ook al zijn er een valbeveiliging en leidingbreukventielen.
- Kijk naar de schaar zolang je het pedaal indrukt.
- Laat de tafel na het werk in de laagste stand zakken.
