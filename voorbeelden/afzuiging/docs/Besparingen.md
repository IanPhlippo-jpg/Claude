# Afzuiging: goedkoper maken (versie 7.1, totaal nu € 546,98)

Twee lijsten. Lijst 1 kan zonder de veiligheid te raken; elk punt heeft wel een nadeel. Lijst 2 is waar je **niet** op
bespaart: daar hangt de veiligheid van af. Prijzen incl. btw, ongeveer; nog niets is aangepast in het model.

## Lijst 1: veilig besparen

| # | Wat | Nu | Goedkoper | Besparing | Nadeel / voorwaarde |
|---|---|---|---|---|---|
| 1 | M8-connectoren binder 718 (bus, stekker en kabel) | € 38 | GX12 4-polig (luchtvaartstekker) met 4-aderige kabel, type met opgegeven 5 A per contact | ± € 30 | minder dicht (IP); alleen in- of uitpluggen met de schakelaar uit; gaten in box en romp aanpassen (Ø12) |
| 2 | Drukmeter SDP810 met slangetje en messingbuisjes | € 36 | weglaten: "filter vol" bepalen uit het toerental van de ventilator (bij een vol filter draait een radiale ventilator sneller bij dezelfde stand); stilstand blijft bewaakt via de tacho | ± € 36 | **afgeraden sinds 7.1:** dan vallen ook "filter ontbreekt of sluit niet af" en de vervangmelding per stand weg (het onderhoudseindpunt van het rekenblad); alleen een trend uit het toerental |
| 3 | Interieurfilter MANN CU 20 013 (2 stuks) | € 28 | hetzelfde formaat van Purflux AH495 of Denso DCF585P (± € 6 tot € 9) | ± € 10 | merkfilter blijven nemen: naamloze interieurfilters vangen in proeven duidelijk minder fijn stof |
| 4 | USB-C-kabel met haakse stekkers | € 9 | gewone rechte USB-C-kabel | ± € 5 | steekt verder uit onder het blad |
| 5 | Knop VIEWE 1,5" AMOLED (ESP32-S3) | € 34 | draaiknop (encoder) met klein OLED-schermpje op een ESP32-C3 | ± € 20 | minder mooi (geen rond kleurenscherm, geen LB-logo in kleur); knophouder en firmware opnieuw |
| 6 | Laser: opstartkost en verzending | € 10 | rooster samen bestellen met ander lasersnijwerk (meerdere stuks) | ± € 5–10 per stuk | alleen bij meer stuks |
| 7 | Ventilator San Ace C175 (32 % van het totaal) | € 160 | een radiale 24 V-ventilator van een ander merk **met** gegevensblad (curve, geluid), PWM, tacho en blokkeerbeveiliging | mogelijk € 50–90 | eerst uitzoeken en narekenen; zonder gegevensblad niet doen (zie lijst 2) |

Samen (1 en 3 tot 6): ongeveer **€ 70 minder** (± € 475). Met een goedkopere ventilator (7) mogelijk ± € 385–425.

## Lijst 2: hier niet op besparen (veiligheid)

| Wat | Waarom het blijft |
|---|---|
| Netadapter Mean Well GST90A24-P1M (€ 33) | Het enige deel met 230 V. Gekeurd, dubbel geïsoleerd, met aarding, kortsluit- en overbelastingsbeveiliging. Een naamloze adapter kan isolatie- of brandproblemen hebben. |
| Netsnoer met randaarde, aan/uit-schakelaar C&K D502 (10 A bij 30 V DC) en zekering Bel 0697W 3,15 A traag (72 V DC) | Samen een tiental euro. Beide met een DC-waarde op het datablad: een schakelaar of zekering met alleen een wisselspanningswaarde kan een gelijkstroomboog niet zeker onderbreken. De zekering is de reserve achter de beveiliging van de adapter; niet weglaten of zwaarder kiezen. |
| Regelaar 24 → 5 V Pololu D24V10F5 (€ 10,50) | Een goedkope buck-module zonder beveiliging kan bij een defect 24 V op de USB naar de knop zetten (knop en kabel kapot, kabel warm). Deze heeft stroombegrenzing en thermische beveiliging. |
| Ventilator zonder gegevensblad (AliExpress) | Onbekende blokkeerbeveiliging (een vastgelopen motor kan heet worden), onbekend debiet en geluid. |
| PETG voor de voedingsbox | PLA wordt zacht rond 55–60 °C; in de box zit de adapter (tot 44 °C in het ongunstigste geval, rekenblad hoofdstuk 5). |
| Draaddikte | Minstens 0,25 mm² voor de ventilator (2,35 A, zie Berekeningen.md), 0,75 mm² van de adapter; niet dunner. |
| Toerentalbewaking (tacho) | Meldt een stilstaande, geblokkeerde of afgeremde ventilator (meer dan 3 % naast het doel); zonder geldig toerental geen filteroordeel. |
| Schakelaar -Q2 en de elco's -C1/-C2 op 50 V (± € 2,50) | -Q2 maakt de ventilator spanningsloos als de besturing wegvalt; -C2 vangt de inschakelpiek aan de regelaar op (Pololu: minstens 33 µF boven 20 V). |
| Afdichtlip (siliconenrubber, € 12) | Zonder lip kan er lucht met stof langs het filter naar de ventilator en terug in de salon; de drukmeter ziet een kleine kier niet. |
| Filter | Een ander merk van hetzelfde formaat mag (lijst 1, punt 3), maar nooit zonder filter en nooit een naamloos filter zonder merk: dan komt vijlsel in de ventilator of fijn stof terug in de salon. |
