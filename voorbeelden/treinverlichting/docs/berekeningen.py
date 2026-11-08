"""Rekenblad van de kabeldoos (treinverlichting): stroom, zekeringen, MOSFET's, ingangen en warmte.

Draai:  python voorbeelden/treinverlichting/docs/berekeningen.py  -> schrijft docs/Berekeningen.md opnieuw.
Invoer met bron bovenaan; aannames heten AANNAME. Het script stopt (assert) als een grens niet gehaald wordt.
"""
import math
from pathlib import Path

HIER = Path(__file__).resolve().parent

# ---------------------------------------------------------------- invoer
U = 12.0  # V, voeding (Ian: 12 V gelijkspanning, zoals nu)
GROEPEN = 16
LEDS_PER_BORDJE = 16  # Modelbouwled "PCB met ingebouwde weerstand": 16 aansluitingen
U_LED = 2.9  # V, witte led (AANNAME 2,8 tot 3,1)
R_BORDJE = {'1K (voor 12 V)': 1000, '1K5 (voor 20 V)': 1500, '470 Ω (voor 5 V)': 470}
I_LED_EIGEN = 0.020  # A, led met eigen weerstand op een bordje van 0 Ω (AANNAME: 20 mA, gangbaar maximum)
ADAPTER = dict(naam='Mean Well GST90A12-P1M', w=90, a=6.67)  # 12 V, 6,67 A, gekeurd (datablad)
ZEKERING = 7.5  # A, steekzekering ATO (32 V DC)
PTC = dict(naam='polyfuse 1,1 A (bv. Bourns MF-R110)', hold=1.1, trip=2.2, rmax=0.15)  # datablad: hold/trip bij 23 °C
BORDJES_PER_RIJ = 3
MOSFET = dict(naam='IRLD024 (Vishay)', rds_5v=0.10, rds_33v=0.20, rth=120.0, tj_max=150.0)  # Ω; rds bij 3,3 V: AANNAME 2x
ESP_W = 0.6  # W, ESP32-S3 met wifi-hotspot (AANNAME: 120 mA gemiddeld op 5 V)
PCA_W = 0.03
BUCK_ETA = 0.85  # Pololu D24V10F5 bij 12 -> 5 V
OPTO = dict(r=2200, u_led=1.2, ctr_min=0.5)  # PC847: 2,2 kΩ voorschakel, CTR ≥ 50 % (datablad)
PULLUP_ESP = 45000  # Ω, interne pull-up ESP32-S3 (typisch)
DOOS = dict(a=2 * (0.236 * 0.241) + 2 * 0.029 * (0.236 + 0.241), h=5.0)  # m², W/m²K (AANNAME natuurlijke convectie)


def rij(*c):
    return '| ' + ' | '.join(str(x) for x in c) + ' |'


def f(x, n=2):
    return f'{x:.{n}f}'.replace('.', ',')


def maak():
    L = ['# Kabeldoos: rekenblad', '', 'Gemaakt door `docs/berekeningen.py`. De metingen bij de ingebruikname beslissen.', '']
    # stroom per bordje
    L += ['## 1. Stroom per groep (één bordje)', '', rij('bordje', 'stroom per led', '16 leds'), rij('---', '---:', '---:')]
    groep_max = 0.0
    for naam, r in R_BORDJE.items():
        i = (U - U_LED) / r
        L.append(rij(naam, f'{f(i * 1000, 1)} mA', f'{f(i * LEDS_PER_BORDJE, 3)} A'))
        groep_max = max(groep_max, i * LEDS_PER_BORDJE)
    i0 = I_LED_EIGEN * LEDS_PER_BORDJE
    L.append(rij('0 Ω (leds met eigen weerstand, 20 mA)', f'{f(I_LED_EIGEN * 1000, 1)} mA', f'{f(i0, 3)} A'))
    groep_max = max(groep_max, i0)
    L += ['', f'Ongunstigste groep: **{f(groep_max)} A**. Op 12 V geven bordjes van 1K5 maar '
          f'{f((U - U_LED) / 1500 * 1000, 1)} mA per led: zwakker licht (Modelbouwled raadt 1K aan voor 12 V).', '']
    # totaal
    totaal = GROEPEN * groep_max + (ESP_W + PCA_W) / BUCK_ETA / U
    assert totaal <= ADAPTER['a'] * 0.9, 'adapter te klein'
    assert totaal <= ZEKERING, 'zekering te klein'
    L += ['## 2. Voeding en zekeringen', '',
          f'- **Alles aan, ongunstigste bordjes:** {GROEPEN} x {f(groep_max)} A + besturing = **{f(totaal)} A**, '
          f'{f(100 * totaal / ADAPTER["a"], 0)} % van de {ADAPTER["naam"]} ({f(ADAPTER["a"], 1)} A). Met bordjes van 1K: '
          f'{f(GROEPEN * (U - U_LED) / 1000 * LEDS_PER_BORDJE + 0.07, 2)} A.',
          f'- **Hoofdzekering:** steekzekering {f(ZEKERING, 1)} A (32 V DC) in de voedingsprint, achter de klem 12 V in.',
          f'- **Per rij bordjes een {PTC["naam"]}:** een rij is {BORDJES_PER_RIJ} bordjes = {f(BORDJES_PER_RIJ * groep_max)} A '
          f'ongunstigst, onder de houdstroom {f(PTC["hold"], 1)} A ... ',
          ]
    rijstroom = BORDJES_PER_RIJ * groep_max
    if rijstroom > PTC['hold']:
        L[-1] = (f'- **Per rij bordjes een {PTC["naam"]}:** met 3 bordjes van 0 Ω met 20 mA-leds is een rij {f(rijstroom)} A: '
                 'boven de houdstroom. Hang zulke bordjes daarom alleen in rij 6 (één bordje) of verdeel ze over de rijen. Met '
                 f'1K-bordjes is een rij {f(BORDJES_PER_RIJ * (U - U_LED) / 1000 * LEDS_PER_BORDJE)} A: ruim eronder.')
    else:
        L[-1] = L[-1].replace(' ... ', '.')
    L += [f'  Bij een kortsluiting op een bordje springt die polyfuse (vanaf {f(PTC["trip"], 1)} A) en blijven de andere rijen '
          'branden; na het wegnemen van de fout herstelt ze vanzelf.', '']
    # mosfets
    i = groep_max
    p = i * i * MOSFET['rds_33v']
    tj = 40 + p * MOSFET['rth']
    assert tj < MOSFET['tj_max'] - 50
    L += ['## 3. Schakelen (MOSFET per groep)', '',
          f'{MOSFET["naam"]}, logic-level, gestuurd door de PCA9685 met 3,3 V. R(on) bij 3,3 V: AANNAME '
          f'{f(MOSFET["rds_33v"])} Ω (het datablad geeft {f(MOSFET["rds_5v"])} Ω bij 5 V). Bij {f(i)} A: '
          f'{f(p * 1000, 0)} mW, de chip wordt {f(p * MOSFET["rth"], 1)} K warmer dan de lucht (Rth {f(MOSFET["rth"], 0)} K/W): '
          'geen koeling nodig. PWM 1 kHz: de schakelverliezen zijn verwaarloosbaar.', '']
    # ingangen
    i_led = (U - OPTO['u_led']) / OPTO['r']
    i_c = OPTO['ctr_min'] * i_led
    i_pull = 3.3 / PULLUP_ESP
    assert i_c > 10 * i_pull
    L += ['## 4. Ingangen (knoppen en sensoren)', '',
          f'Elke ingang: optocoupler (PC847) met {f(OPTO["r"] / 1000, 1)} kΩ in serie. Op 12 V loopt er {f(i_led * 1000, 1)} mA door de '
          f'led; de transistor kan dan minstens {f(i_c * 1000, 1)} mA, de pull-up van de ESP vraagt {f(i_pull * 1000, 3)} mA: '
          f'zeker laag (factor {f(i_c / i_pull, 0)}). Een knop sluit je aan tussen "+12 V" en de ingang; een sensor met een '
          'uitgang op 12 V (PNP) rechtstreeks op de ingang. De 12 V van de knoppen komt uit de klemmen van de ingangsprint.', '']
    # warmte
    p_tot = GROEPEN * p + ESP_W + PCA_W + (ESP_W + PCA_W) * (1 / BUCK_ETA - 1) + 3 * (BORDJES_PER_RIJ * groep_max) ** 2 * PTC['rmax'] * 2
    dt = p_tot / (DOOS['h'] * DOOS['a'])
    assert dt < 10
    L += ['## 5. Warmte: geen verluchting nodig', '',
          f'Alles samen hoogstens **{f(p_tot)} W** in de doos (MOSFET\'s, ESP, PCA9685, regelaar, polyfuses). De doos heeft '
          f'{f(DOOS["a"], 2)} m² oppervlak; met {f(DOOS["h"], 0)} W/m²K (natuurlijke convectie, AANNAME) wordt het binnen '
          f'**{f(dt, 1)} K** warmer dan onder de baan. Verluchtingsgaten zijn niet nodig; de kabelinvoeren laten ook lucht door. '
          'De netadapter (het warmste deel) hangt buiten de doos.', '']
    (HIER / 'Berekeningen.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
    print('\n'.join(L))


if __name__ == '__main__':
    maak()
