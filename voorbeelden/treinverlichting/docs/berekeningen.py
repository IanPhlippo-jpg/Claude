"""Rekenblad van de kabeldoos (treinverlichting): stroom, zekeringen, MOSFET's, ingangen, warmte, goten, klikken en draden.

Draai:  python voorbeelden/treinverlichting/docs/berekeningen.py  -> schrijft docs/Berekeningen.md opnieuw.
Invoer met bron bovenaan (docs/Maten-en-bronnen.md); aannames heten AANNAME. Het script stopt (assert) als een grens niet
gehaald wordt. Versie 2 (advies Fable 5.2, 2026-11-12): polyfuse per groep met derating, AO3400A, P-MOSFET tegen ompolen,
AC-optocouplers, warmte met de weerstanden van de ingangen en een doos die met de bodem tegen de baan hangt, klemlippen,
de 0 V-retour.
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
ADAPTER = dict(naam='Mean Well GST90A12-P1M', a=6.67)  # 12 V, 6,67 A (datablad)
ZEKERING = dict(a=7.5, r=0.010)  # A; ATO 7,5 A, weerstand AANNAME 10 mΩ
# polyfuses (Bourns, datablad MF-MSMF): houdstroom bij 23, 40 en 50 °C, trip bij 23 °C, R1max
PTC_GROEP = dict(naam='Bourns MF-MSMF050/24X (1812)', hold={23: 0.50, 40: 0.44, 50: 0.40}, trip=1.00, rmin=0.15, r1max=1.3, vmax=24)
PTC_KNOP = dict(naam='Bourns MF-MSMF030 (1812)', hold={23: 0.30, 40: 0.26, 50: 0.22}, trip=0.60, rmin=0.30, r1max=3.0, vmax=30)
PTC_RIJ_OUD = dict(naam='Bourns MF-R110 (versie 1)', hold={23: 1.10, 40: 0.91, 50: 0.85})  # datablad MF-R, derating
T_DOOS = 40  # °C, ongunstigste lucht in de doos (AANNAME: 25 °C in de kamer + de opwarming hieronder, afgerond)
MOSFET = dict(naam='AO3400A (Alpha & Omega)', rds_25v=0.048, rth=125.0, tj_max=150.0, id=5.7)  # Ω max bij 2,5 V (datablad); Rth AANNAME
MOSFET_OUD = dict(naam='IRLD024 (versie 1)', rds_5v=0.10)  # R(on) pas vanaf 4 V gespecificeerd
PFET = dict(naam='IRF4905 (Infineon)', rds=0.020, rth=62.0)  # Ω bij UGS = −10 V (datablad); RθJA 62 K/W (datablad 1997, AANNAME voor de PbF)
BRUG_U = 0.1  # V, meetcriterium: spanning over een MOSFET bij vol licht (meetblad)
ESP_W = 0.6  # W, ESP32-S3 met wifi-hotspot (AANNAME: 120 mA gemiddeld op 5 V)
PCA_W = 0.03
BUCK_ETA = 0.85  # Pololu D24V10F5 bij 12 -> 5 V
OPTO = dict(naam='LTV-844 (Lite-On)', r=2200, u_led=1.2, ctr_min=0.20, r_vermogen=0.25)  # CTR ≥ 20 % bij ±1 mA (datablad); 1206 0,25 W
PULLUP_ESP = 45000  # Ω, interne pull-up ESP32-S3 (typisch)
SENSOREN_MA = 80  # mA, sensoren op +12 V samen (AANNAME: 4 sensoren van 20 mA)
# de doos: 229,8 x 229,8 x 44,4; de bodem hangt tegen de onderkant van de baan (hout): die koelt bijna niet
DOOS = dict(l=0.2298, h=0.0444, alfa=5.0)  # m, W/m²K (AANNAME natuurlijke convectie)
# kabelgoten (goten.mjs, GOOT): tussen twee rijen 5,4 breed tot 5,2 hoog (de voet) en daarboven 5,8 tussen de vingers, tot
# 28 hoog (het deksel); draden LiY 0,25 mm² Ø1,4 en 0,5 mm² Ø1,8 (AANNAME, gangbare buitenmaat); zie maak-kabeldoos.mjs, vulgraad()
GOOT = dict(b=5.4, b_vingers=5.8, voet=5.2, h=28.0, d_led=1.4, d_voeding=1.8, vul_max=0.60)
GOOT_DRADEN = {'gewoon': (48, 8), 'ergst': (96, 8)}  # (leddraden, voedingsdraden) in een doorsnede
# de klik van een gootdeksel (goten.mjs): been 1,2 dik, nok 0,4 voorbij de vinger, 7,0 van de plaat
KLIK = dict(t=1.2, d=0.4, l=7.0)
# klemlip (maten.mjs, M.lip): tong 0,8 x 2,0, haak 0,75 met 0,15 speling, veerlengte 1,8 + 3 + 1,6 + 0,1
LIP = dict(t=0.8, b=2.0, d=0.75 - 0.15, l=1.8 + 3 + 1.6 + 0.1)
PETG = dict(e=2100.0, rek_max=0.02)  # MPa; toelaatbare rek bij herhaald klikken (AANNAME, gangbaar voor PETG)
KOPER = 0.0175  # Ω mm²/m
RETOUR = dict(mm2=0.75, l=0.35)  # 0 V-retour van -X3:17 naar -X1:3 (lengte AANNAME uit het model, met lus)


def rij(*c):
    return '| ' + ' | '.join(str(x) for x in c) + ' |'


def f(x, n=2):
    return f'{x:.{n}f}'.replace('.', ',')


def maak():
    L = ['# Kabeldoos: rekenblad', '', 'Gemaakt door `docs/berekeningen.py`. De metingen bij de ingebruikname beslissen (meetblad TRN-20).', '']
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
    groep_1k = (U - U_LED) / 1000 * LEDS_PER_BORDJE
    L += ['', f'Ongunstigste groep: **{f(groep_max)} A**. Op 12 V geven bordjes van 1K5 maar '
          f'{f((U - U_LED) / 1500 * 1000, 1)} mA per led: zwakker licht (Modelbouwled raadt 1K aan voor 12 V).', '']
    # voeding en zekeringen
    totaal = GROEPEN * groep_max + (ESP_W + PCA_W) / BUCK_ETA / U
    assert totaal <= ADAPTER['a'] * 0.9, 'adapter te klein'
    hold40 = PTC_GROEP['hold'][T_DOOS]
    assert groep_max <= hold40, 'polyfuse per groep te klein bij 40 °C'
    knop = GROEPEN * (U - OPTO['u_led']) / OPTO['r'] + SENSOREN_MA / 1000
    assert knop <= PTC_KNOP['hold'][T_DOOS]
    oud_rij = 3 * groep_max
    L += ['## 2. Voeding en zekeringen', '',
          f'- **Alles aan, ongunstigste bordjes:** {GROEPEN} x {f(groep_max)} A + besturing = **{f(totaal)} A**, '
          f'{f(100 * totaal / ADAPTER["a"], 0)} % van de {ADAPTER["naam"]} ({f(ADAPTER["a"], 2)} A). Met bordjes van 1K: '
          f'{f(GROEPEN * groep_1k + 0.07, 2)} A.',
          f'- **Hoofdzekering {f(ZEKERING["a"], 1)} A** (ATO, 32 V DC) achter de DC-bus: ze is groter dan wat de adapter kan '
          f'leveren ({f(ADAPTER["a"], 2)} A) en **beschermt dus alleen de print en de dikke draden** tegen een kortsluiting '
          'vóór de klemmen (de adapter schakelt bij overbelasting zelf af). Een groep, een rij of een knop beschermt ze niet.',
          f'- **Per groep een polyfuse {PTC_GROEP["naam"]}**, in de − van de groep op de uitgangsprint: houdstroom '
          f'{f(PTC_GROEP["hold"][23])} A bij 23 °C, **{f(hold40)} A bij {T_DOOS} °C** en {f(PTC_GROEP["hold"][50])} A bij 50 °C '
          f'(derating uit het datablad), trip {f(PTC_GROEP["trip"])} A, {PTC_GROEP["vmax"]} V. De ongunstigste groep ({f(groep_max)} A) '
          f'blijft eronder; een kortsluiting op een bordje of zijn draad laat alleen die polyfuse springen (binnen 0,2 s bij 8 A) '
          f'en de MOSFET ({f(MOSFET["id"], 1)} A continu) ziet nooit meer dan de tripstroom.',
          f'- **Waarom niet meer per rij:** de polyfuse van 1,1 A per rij van versie 1 hield bij {T_DOOS} °C nog maar '
          f'{f(PTC_RIJ_OUD["hold"][T_DOOS])} A, minder dan 3 ongunstige bordjes ({f(oud_rij)} A), en een kortsluiting van één groep '
          'ging door de IRLD024 tot 2,2 A voor ze sprong. De + per rij heeft nu geen eigen polyfuse meer: een rij is hoogstens '
          f'{f(oud_rij)} A op draad van 0,5 mm²; een kortsluiting van een + naar 0 V begrenst de adapter.',
          f'- **+12 V voor knoppen en sensoren:** eigen polyfuse {PTC_KNOP["naam"]} op de ingangsprint, {f(PTC_KNOP["hold"][T_DOOS])} A '
          f'bij {T_DOOS} °C. Nodig: {GROEPEN} ingangen x {f((U - OPTO["u_led"]) / OPTO["r"] * 1000, 1)} mA + sensoren '
          f'{SENSOREN_MA} mA (AANNAME) = {f(knop)} A. Een kortgesloten knopdraad legt zo niet de hele doos plat.', '']
    # mosfets
    i = groep_max
    p = i * i * MOSFET['rds_25v']
    tj = T_DOOS + p * MOSFET['rth']
    assert tj < MOSFET['tj_max'] - 50
    assert i * MOSFET['rds_25v'] < BRUG_U
    ppfet = totaal ** 2 * PFET['rds']
    L += ['## 3. Schakelen (MOSFET per groep) en ompoolbeveiliging', '',
          f'{MOSFET["naam"]}: R(on) hoogstens {f(MOSFET["rds_25v"] * 1000, 0)} mΩ bij UGS = 2,5 V (datablad, ID = 3 A); de PCA9685 '
          f'stuurt met 3,3 V, dus is het zeker niet meer. Bij {f(i)} A: {f(p * 1000, 1)} mW en {f(i * MOSFET["rds_25v"] * 1000, 0)} mV '
          f'over de MOSFET; de chip wordt {f(p * MOSFET["rth"], 1)} K warmer dan de lucht (SOT-23, Rth {f(MOSFET["rth"], 0)} K/W, AANNAME). '
          f'Meetcriterium in het meetblad: minder dan {f(BRUG_U, 1)} V over elke MOSFET bij vol licht. '
          f'(De {MOSFET_OUD["naam"]} had alleen een R(on) vanaf 4 V; 0,20 Ω bij 3,3 V was een AANNAME.) '
          'Twee AO3400A zitten op een adapterprintje (DA-SOT23-3-X2) in een IC-voet DIP-8: een kapotte MOSFET wissel je zonder solderen. '
          'PWM 1 kHz: de schakelverliezen zijn verwaarloosbaar.', '',
          f'Ompoolbeveiliging: {PFET["naam"]} in de + (drain aan de ingang, source aan L+, gate met 10 kΩ aan 0 V). Goed aangesloten '
          f'staat UGS op −12 V en geleidt hij met hoogstens {f(PFET["rds"] * 1000, 0)} mΩ: bij {f(totaal)} A is dat {f(ppfet, 2)} W, '
          f'{f(ppfet * PFET["rth"], 0)} K boven de lucht (plat op de print, zonder koelplaat). Verkeerd om: de MOSFET spert en er loopt niets. '
          'De DC-bus houdt de stekker van de adapter (+ in het midden): niets doorknippen, niet verkeerd aan te sluiten met de eigen adapter.', '']
    # ingangen
    i_led = (U - OPTO['u_led']) / OPTO['r']
    i_c = OPTO['ctr_min'] * i_led
    i_pull = 3.3 / PULLUP_ESP
    p_r = (U - OPTO['u_led']) ** 2 / OPTO['r']
    assert i_c > 10 * i_pull and p_r < OPTO['r_vermogen'] / 2
    L += ['## 4. Ingangen (knoppen en sensoren)', '',
          f'Elke ingang: {OPTO["naam"]} met AC-ingang (twee leds tegen elkaar) en {f(OPTO["r"] / 1000, 1)} kΩ in serie. Op 12 V loopt er '
          f'{f(i_led * 1000, 1)} mA door de led; de transistor kan dan minstens {f(i_c * 1000, 2)} mA (CTR ≥ 20 %), de pull-up van '
          f'de ESP vraagt {f(i_pull * 1000, 3)} mA: zeker laag (factor {f(i_c / i_pull, 0)}). De weerstand verbruikt '
          f'{f(p_r * 1000, 0)} mW (1206 van {f(OPTO["r_vermogen"], 2)} W: minder dan de helft).', '',
          'Aansluiten (per 4 ingangen een COM-klem): **contact of PNP-sensor** (schakelt +12 V): COM aan 0 V, de knop tussen +12 V en '
          'IN. **NPN-sensor, hall of reed naar 0 V** (schakelt 0 V): COM aan +12 V, de uitgang van de sensor aan IN. De twee leds '
          'tegen elkaar maken het ook bestand tegen een verkeerd aangesloten draad (de taak van de antiparallelle diode die Fable '
          'vroeg): een led krijgt nooit meer dan 1,2 V in sperrichting.', '']
    # warmte
    a_boven = DOOS['l'] ** 2  # het deksel (onderaan)
    a_zij = 4 * DOOS['h'] * DOOS['l']
    a_eff = a_boven + a_zij  # de bodem tegen de baan telt niet mee
    p_mos = GROEPEN * p
    p_ptc = GROEPEN * groep_max ** 2 * PTC_GROEP['r1max']
    p_ptc_1k = GROEPEN * groep_1k ** 2 * PTC_GROEP['r1max']
    p_in = GROEPEN * p_r
    p_besturing = ESP_W + PCA_W + (ESP_W + PCA_W) * (1 / BUCK_ETA - 1)
    p_zek = totaal ** 2 * ZEKERING['r']
    p_tot = p_mos + p_ptc + p_in + p_besturing + ppfet + p_zek
    dt = p_tot / (DOOS['alfa'] * a_eff)
    p_gewoon = GROEPEN * groep_1k ** 2 * MOSFET['rds_25v'] + p_ptc_1k + 4 * p_r + p_besturing + (GROEPEN * groep_1k) ** 2 * (PFET['rds'] + ZEKERING['r'])
    dt_gewoon = p_gewoon / (DOOS['alfa'] * a_eff)
    assert dt < 15
    L += ['## 5. Warmte: geen verluchting nodig', '', rij('bron', 'ongunstigst', 'gewoon (1K, 4 ingangen actief)'), rij('---', '---:', '---:'),
          rij('16 MOSFET\'s', f'{f(p_mos, 2)} W', f'{f(GROEPEN * groep_1k ** 2 * MOSFET["rds_25v"], 2)} W'),
          rij('16 polyfuses (R1max 1,3 Ω)', f'{f(p_ptc, 2)} W', f'{f(p_ptc_1k, 2)} W'),
          rij('16 weerstanden van de ingangen (53 mW elk)', f'{f(p_in, 2)} W', f'{f(4 * p_r, 2)} W'),
          rij('ESP, PCA9685, regelaar', f'{f(p_besturing, 2)} W', f'{f(p_besturing, 2)} W'),
          rij('P-MOSFET en zekering', f'{f(ppfet + p_zek, 2)} W', f'{f((GROEPEN * groep_1k) ** 2 * (PFET["rds"] + ZEKERING["r"]), 2)} W'),
          rij('**samen**', f'**{f(p_tot, 2)} W**', f'**{f(p_gewoon, 2)} W**'), '',
          f'De bodem hangt tegen de onderkant van de baan (hout): die geeft bijna geen warmte af. Alleen het deksel en de 4 zijwanden '
          f'tellen: {f(a_eff, 3)} m² met {f(DOOS["alfa"], 0)} W/m²K (natuurlijke convectie, AANNAME). Binnen wordt het **{f(dt, 1)} K** '
          f'warmer dan onder de baan in het ongunstigste geval (alle 16 groepen met bordjes van 0 Ω vol aan, alle ingangen actief), '
          f'**{f(dt_gewoon, 1)} K** gewoon. Met 25 °C onder de baan blijft het binnen onder {T_DOOS} °C: daarop zijn de polyfuses '
          'hierboven gerekend. Verluchtingsgaten zijn niet nodig; de netadapter (het warmste deel) hangt buiten de doos.', '']
    # kabelgoten
    a_led, a_vo = math.pi * GOOT['d_led'] ** 2 / 4, math.pi * GOOT['d_voeding'] ** 2 / 4
    binnen = GOOT['b'] * GOOT['voet'] + GOOT['b_vingers'] * (GOOT['h'] - GOOT['voet'])
    L += ['## 6. Kabelgoten: vulgraad', '',
          f'Een goot tussen twee rijen is {f(GOOT["b"], 1)} breed tot {f(GOOT["voet"], 1)} hoog (de voet van de wand) en daarboven '
          f'{f(GOOT["b_vingers"], 1)} tussen de vingers, tot {f(GOOT["h"], 0)} hoog (het deksel): **{f(binnen, 0)} mm²**. Leddraad 0,25 mm² '
          f'(Ø{f(GOOT["d_led"], 1)}, {f(a_led, 2)} mm²), voedingsdraad 0,5 mm² (Ø{f(GOOT["d_voeding"], 1)}, {f(a_vo, 2)} mm²), AANNAME '
          'gangbare buitenmaten. Zo\'n goot krijgt de klemmen van 6 bordjes (3 per rij, 16 leddraden per klemmenrij) en hun voeding.', '',
          rij('doorsnede', 'leddraden', 'voeding', 'draden samen', 'vulgraad'), rij('---', '---:', '---:', '---:', '---:')]
    for naam, (n_led, n_vo) in GOOT_DRADEN.items():
        opp = n_led * a_led + n_vo * a_vo
        if naam == 'gewoon':
            assert opp / binnen <= GOOT['vul_max'], f'goot te vol ({naam})'
        L.append(rij(naam, n_led, n_vo, f'{f(opp, 0)} mm²', f'**{f(100 * opp / binnen, 0)} %**'))
    L += ['', '"Gewoon": de draden van een bordje komen door de sleuf in de bodem onder dat bordje, de helft loopt door een '
          f'doorsnede: onder de {f(100 * GOOT["vul_max"], 0)} % die bij een schakelkast de grens is, het deksel klikt er zonder '
          'knellen op. "Ergst": alle 96 leddraden van de 6 bordjes door één sleuf: dat past niet onder het deksel. Breng de '
          'draden van elk bordje dus binnen door de sleuf onder dat bordje (zo is de doos getekend). De goten langs de zijwanden '
          '(11 breed) en de achterwand (4,8) zijn minder vol. Een goot van 5,4 is te smal voor een vinger: til een gootdeksel op '
          'en trek een draad eruit met de spatel en het haakje van de hulpstukken (print/Hulpstukken.stl).', '']
    # klik van de gootdeksels
    rek_klik = 1.5 * KLIK['t'] * KLIK['d'] / KLIK['l'] ** 2
    assert rek_klik < PETG['rek_max']
    L += ['## 7. Klik van de gootdeksels (PETG, E = 2100 MPa)', '',
          f'Elk been is een uitkragende balk van {f(KLIK["t"], 1)} dik; de nok gaat {f(KLIK["d"], 2)} voorbij de vinger op '
          f'{f(KLIK["l"], 1)} van de plaat. Rek = 1,5 t d / L² = **{f(100 * rek_klik)} %**, onder de {f(100 * PETG["rek_max"], 0)} % die '
          'PETG bij herhaald klikken verdraagt (AANNAME). Een deksel tussen twee rijen klikt op 4 plaatsen (8 nokken), een '
          'randdeksel op 2 plaatsen en met zijn neus over de hele lengte. Nok en groef hebben vlakken van 45°.', '']
    # klemlippen
    rek_lip = 1.5 * LIP['t'] * LIP['d'] / LIP['l'] ** 2
    i_lip = LIP['b'] * LIP['t'] ** 3 / 12
    f_lip = 3 * PETG['e'] * i_lip * LIP['d'] / LIP['l'] ** 3
    assert rek_lip < PETG['rek_max']
    L += ['## 8. Klemlippen van de bordjes (PETG)', '',
          f'Elk bordje zit tussen 4 lippen aan zijn korte kanten. Een lip is een tong van {f(LIP["t"], 1)} x {f(LIP["b"], 1)} die in een '
          f'kuiltje van 1,8 diep in de bodem begint: veerlengte {f(LIP["l"], 1)} tot de haak. Bij het inleggen duwt de print de '
          f'schuine kant (45°) {f(LIP["d"], 2)} opzij. Rek = 1,5 t d / L² = **{f(100 * rek_lip)} %** (onder 2 %). Kracht om een lip open '
          f'te duwen: 3 E I d / L³ = {f(f_lip, 2)} N; de haak grijpt {f(LIP["d"], 2)} mm over de print met een recht vlak eronder: '
          'het bordje (10 g) en de draden eraan blijven zitten met het deksel eraf en de doos ondersteboven. Uitnemen: de twee lippen '
          'aan één kant met de spatel naar buiten duwen en het bordje optillen.', '']
    # draden
    r_retour = KOPER * RETOUR['l'] / RETOUR['mm2']
    L += ['## 9. Draden en de 0 V-retour', '',
          f'De 16 groepen komen samen terug door de sources van de MOSFET\'s: tot {f(totaal)} A. Op de uitgangsprint loopt dat over een '
          'blanke draad Ø1,0 (0,79 mm²) langs de sources naar een eigen klem -X3:17 (5,08, tot 1,5 mm²) en met 0,75 mm² naar -X1:3 op de '
          f'voedingsprint: {f(RETOUR["l"] * 1000, 0)} mm geeft {f(r_retour * 1000, 1)} mΩ en {f(totaal * r_retour * 1000, 0)} mV verlies. '
          'De andere draden tussen de prints (gates, GPIO, I2C) dragen milliampères: 0,14 mm². Interne draadlijst: TRN-14.', '']
    (HIER / 'Berekeningen.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
    print('\n'.join(L))


if __name__ == '__main__':
    maak()
