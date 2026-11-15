"""Rekenblad van de kabeldoos (treinverlichting): stroom, zekeringen, MOSFET's, ingangen, warmte, klemlippen, draden en de naad.

Draai:  python voorbeelden/treinverlichting/docs/berekeningen.py  -> schrijft docs/Berekeningen.md opnieuw.
Invoer met bron bovenaan (docs/Maten-en-bronnen.md); aannames heten AANNAME. Het script stopt (assert) als een grens niet
gehaald wordt. Versie 2 (advies Fable 5.2, 2026-11-12): polyfuse per groep met derating, warmte met een doos die met de
bodem tegen de baan hangt, klemlippen, de 0 V-retour. Versie 4 (2026-11-13, kant-en-klare modules): MOSFET-modules met
optocouplers, optocouplerprints PC817, radiale polyfuses MF-R050, Schottkydiode als ompoolbeveiliging, de regelaar
SBC-Buck02, een hogere doos. Versie 5 (2026-11-15): één langwerpige doos op één laag in 2 helften die in elkaar klikken
(de klik van de haken en van de lip van het deksel), groepen alleen aan/uit (firmware 1.3.0, geen dimmers), hallsensoren
op de ingangen; geen kabelgoten meer (Ian: "Kabel goten mogen weg").
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
ZEKERING = dict(a=7.5, r=0.010)  # A; ATO 7,5 A in een houder met draden, weerstand AANNAME 10 mΩ
# polyfuses Bourns MF-R050 (radiaal, datablad MF-R): houdstroom bij 23, 40 en 50 °C, trip bij 23 °C, R min en R1max, tijd
# tot trip bij 2,5 A; één per groep (-F2..-F17) en één voor de ingangen en sensoren (-F18)
PTC_GROEP = dict(naam='Bourns MF-R050 (radiaal)', hold={23: 0.50, 40: 0.41, 50: 0.36}, trip=1.00, rmin=0.41, r1max=1.17, vmax=60, t_trip=4.0, i_trip_test=2.5)
PTC_IN = PTC_GROEP
PTC_RIJ_OUD = dict(naam='Bourns MF-R110 (versie 1)', hold={23: 1.10, 40: 0.91, 50: 0.85})  # datablad MF-R, derating
T_DOOS = 40  # °C, ongunstigste lucht in de doos (AANNAME: 25 °C in de kamer + de opwarming hieronder, afgerond)
# de MOSFET-module (8 kanalen, optocouplers, 3,3 V-versie): het type MOSFET staat niet in de beschrijving van de verkoper;
# AANNAME: een logic-level N-MOSFET in DPAK (zoals AOD4184 of LR7843) met R(on) ≤ 20 mΩ bij de gatespanning van de module
# (de optocoupler zet de gate op een deel van VIN), ten minste 2 A per kanaal (verkoper: 2 A continu, 3 A max)
MOSFET = dict(naam='MOSFET van de module (AANNAME: DPAK, ≤ 20 mΩ)', rds=0.020, rth=50.0, tj_max=150.0, id=2.0)
OPTO_UIT = dict(naam='PC817', tr=4e-6, tf=3e-6, traag=50e-6)  # s; tr/tf datablad PC817 (RL 100 Ω); "traag": AANNAME met de weerstanden van de module
BRUG_U = 0.1  # V, meetcriterium: spanning n− tot VIN− (over de MOSFET) bij vol licht (meetblad)
ESP_W = 0.6  # W, ESP32-S3 met wifi-hotspot (AANNAME: 120 mA gemiddeld op 5 V)
PCA_W = 0.03
BUCK_ETA = 0.85  # Joy-IT SBC-Buck02 bij 12 -> 5 V en 0,15 A (AANNAME: niet in het datablad)
DIODE = dict(naam='SB560', vf=0.70, ifsm=150.0, if_av=5.0)  # V bij 5 A, A piek, A (datablad SB5x0-reeks; na te kijken)
# de optocouplerprint PC817 8 kanalen (3,6-24 V): de weerstand in serie met de led staat niet in de beschrijving
OPTO = dict(naam='PC817 (optocouplerprint 8 kanalen)', r=1000, u_led=1.2, ctr_min=0.50, if_max=0.050, vr=6.0, r_vermogen=0.125)  # R AANNAME 1 kΩ (0805); CTR ≥ 50 % bij 5 mA, IF max 50 mA, VR 6 V (datablad PC817)
PULLUP_OUT = 10000  # Ω, pull-up op de uitgangskant van de print (AANNAME)
# hallsensor (Ian, 2026-11-15: "Zorg ook dat er hallsensoren binnen gelezen kunnen worden"): Honeywell SS441A, unipolair,
# open collector (NPN, sinkt), 3,8-30 V, voeding hoogstens 10 mA, uitgang hoogstens 20 mA, verzadiging hoogstens 0,40 V
# bij 20 mA, lek hoogstens 10 µA, schakelt in een paar µs (datablad Honeywell SS400-reeks, na te kijken); een kloon van de
# Allegro A3144 (4,5-24 V, 25 mA, 0,4 V) werkt op dezelfde manier
HALL = dict(naam='Honeywell SS441A', vs_min=3.8, vs_max=30.0, i_vs=0.010, i_sink=0.020, vsat=0.40, lek=10e-6)
HALL_MAGNEET = dict(zone=0.010, v_max=0.6, v_traag=0.05)  # m (veld boven de schakeldrempel), m/s (H0 tot ± 190 km/h op schaal; stapvoets)
HALL_LEES = dict(min_ms=1.0, vast_s=0.3)  # firmware 1.3.0: een puls vanaf 1 ms (interrupt per ingang), 0,3 s vasthouden
SENSOREN = 16  # hallsensoren of andere sensoren op +12 V samen (één per ingang, AANNAME)
SENSOREN_MA = SENSOREN * HALL['i_vs'] * 1000  # mA
# de doos (versie 5): 440,9 x 229,8 x 52,6 met het deksel; de bodem hangt tegen de onderkant van de baan (hout): die koelt
# bijna niet
DOOS = dict(lx=0.4409, lz=0.2298, h=0.0526, alfa=5.0)  # m, W/m²K (AANNAME natuurlijke convectie)
# de naad (maten.mjs, M.naad): klikhaak 14 lang, 1,6 dik, hoogte 11,8 aan de punt tot 25,8 aan de voet (45°-onderkant),
# nok 0,6 met een schuine kant over 1,2; de lip van het deksel: 4 vingers van 54 breed, 1,4 dik, 12 lang, nok 0,5 in een
# spleet van 0,2 (doorbuiging 0,3)
HAAK = dict(l=14.0, t=1.6, b0=11.8, d=0.6, ramp=1.2)
DEKSELLIP = dict(t=1.4, l=12.0, d=0.3, b=[54.0, 54.0, 54.0, 54.0], h=0.5, ramp=1.2)
MU = 0.3  # wrijving PETG op PETG (AANNAME)
# klemlip (maten.mjs, M.lip): tong 0,8 x 2,0, haak 0,75 met 0,15 speling, veerlengte 1,8 + 3 + 1,6 + 0,1
LIP = dict(t=0.8, b=2.0, d=0.75 - 0.15, l=1.8 + 3 + 1.6 + 0.1)
PETG = dict(e=2100.0, rek_max=0.02)  # MPa; toelaatbare rek bij herhaald klikken (AANNAME, gangbaar voor PETG)
KOPER = 0.0175  # Ω mm²/m
RETOUR = dict(mm2=0.75, l=0.25)  # 0 V-retour van VIN− van een MOSFET-module naar -X2 (lengte uit TRN-14, met lus)


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
    i_in = (U - OPTO['u_led']) / OPTO['r']
    knop = GROEPEN * i_in + SENSOREN_MA / 1000
    totaal = GROEPEN * groep_max + (ESP_W + PCA_W) / BUCK_ETA / U + knop
    assert totaal <= ADAPTER['a'] * 0.9, 'adapter te klein'
    hold40 = PTC_GROEP['hold'][T_DOOS]
    assert groep_max <= hold40, 'polyfuse per groep te klein bij 40 °C'
    assert knop <= PTC_IN['hold'][T_DOOS], 'polyfuse van de ingangen te klein'
    oud_rij = 3 * groep_max
    L += ['## 2. Voeding en zekeringen', '',
          f'- **Alles aan, ongunstigste bordjes, alle ingangen actief:** {GROEPEN} x {f(groep_max)} A + besturing + ingangen = '
          f'**{f(totaal)} A**, {f(100 * totaal / ADAPTER["a"], 0)} % van de {ADAPTER["naam"]} ({f(ADAPTER["a"], 2)} A). Met bordjes '
          f'van 1K en 4 ingangen actief: {f(GROEPEN * groep_1k + 0.07 + 4 * i_in, 2)} A.',
          f'- **Hoofdzekering {f(ZEKERING["a"], 1)} A** (ATO in een houder met draden, 32 V DC) achter de DC-bus: ze is groter dan '
          f'wat de adapter kan leveren ({f(ADAPTER["a"], 2)} A) en **beschermt de draden tot de verdeelklemmen** en de '
          'ompoolbeveiliging (hieronder) tegen een andere adapter zonder eigen beveiliging. Een groep of een knop beschermt ze niet.',
          f'- **Per groep een polyfuse {PTC_GROEP["naam"]}** (-F2..-F17), met één pootje in de klem n− van de MOSFET-module en het '
          'andere in een WAGO 221-2411 samen met de − van het bordje (geen solderen): houdstroom '
          f'{f(PTC_GROEP["hold"][23])} A bij 23 °C, **{f(hold40)} A bij {T_DOOS} °C** en {f(PTC_GROEP["hold"][50])} A bij 50 °C '
          f'(derating uit het datablad), trip {f(PTC_GROEP["trip"])} A, {PTC_GROEP["vmax"]} V. De ongunstigste groep ({f(groep_max)} A) '
          f'blijft eronder; een kortsluiting op een bordje of zijn draad laat alleen die polyfuse springen ({f(PTC_GROEP["t_trip"], 1)} s '
          f'bij {f(PTC_GROEP["i_trip_test"], 1)} A, sneller bij meer) en het kanaal van de module ({f(MOSFET["id"], 1)} A, AANNAME) '
          'ziet nooit meer dan een paar ampère gedurende die tijd. De pootjes zijn 0,51 mm (0,20 mm²): de kleinste draad die '
          'een WAGO 221 neemt; een schroefklem neemt ze altijd.',
          f'- **Waarom niet meer per rij:** de polyfuse van 1,1 A per rij van versie 1 hield bij {T_DOOS} °C nog maar '
          f'{f(PTC_RIJ_OUD["hold"][T_DOOS])} A, minder dan 3 ongunstige bordjes ({f(oud_rij)} A). Elk bordje krijgt nu zijn + uit de '
          'klem n+ van zijn module en zijn − door zijn eigen polyfuse.',
          f'- **+12 V voor de ingangen en de sensoren (S12):** eigen polyfuse -F18 ({PTC_IN["naam"]}), {f(PTC_IN["hold"][T_DOOS])} A '
          f'bij {T_DOOS} °C. Nodig: {GROEPEN} ingangen x {f(i_in * 1000, 1)} mA + sensoren {SENSOREN_MA} mA (AANNAME) = {f(knop)} A. '
          'Een kortgesloten sensordraad legt zo niet de hele doos plat.', '']
    # mosfets
    i = groep_max
    p = i * i * MOSFET['rds']
    tj = T_DOOS + p * MOSFET['rth']
    assert tj < MOSFET['tj_max'] - 50
    assert i * MOSFET['rds'] < BRUG_U
    L += ['## 3. Schakelen (MOSFET-modules) en ompoolbeveiliging', '',
          f'Elke groep schakelt de − van zijn bordje met een kanaal van een 8-kanaals MOSFET-module met optocouplers (versie 4: '
          f'kant-en-klaar). Het type MOSFET staat niet bij de verkoper: AANNAME {f(MOSFET["rds"] * 1000, 0)} mΩ en {f(MOSFET["id"], 1)} A '
          f'per kanaal. Bij {f(i)} A: {f(p * 1000, 1)} mW en {f(i * MOSFET["rds"] * 1000, 0)} mV over de MOSFET, '
          f'{f(p * MOSFET["rth"], 1)} K warmer dan de lucht. Meetcriterium in het meetblad: minder dan {f(BRUG_U, 1)} V tussen n− en VIN− '
          f'bij vol licht (ook bij {f(BRUG_U / i, 2)} Ω in plaats van {f(MOSFET["rds"], 3)} Ω nog geen warmteprobleem: {f(i * BRUG_U, 2)} W).', '',
          'Alleen aan/uit (Ian, 2026-11-15: "Dimmers zijn niet nodig"; firmware 1.3.0): de PCA9685 zet elk kanaal met zijn '
          'full-on- of full-off-bit volledig aan of uit, zonder PWM. De optocoupler van de module schakelt in '
          f'{f(OPTO_UIT["tr"] * 1e6, 0)} tot {f(OPTO_UIT["traag"] * 1e6, 0)} µs (datablad PC817, AANNAME met de weerstanden van de module): '
          'voor aan/uit en de knipper-effecten (knipperen, overweg, lasvlam, tl) speelt dat geen rol.', '',
          f'Ompoolbeveiliging zonder solderen: een Schottkydiode {DIODE["naam"]} (-R2) met haar pootjes in de verdeelklemmen, de kathode '
          f'aan L+ en de anode aan 0 V, achter de hoofdzekering. Goed aangesloten spert ze: geen verlies. Verkeerd om (een andere adapter '
          f'met de + buiten): de diode geleidt, de modules zien hoogstens −{f(DIODE["vf"], 1)} V, en de adapter schakelt af (de GST90A '
          f'heeft een kortsluitbeveiliging) of de zekering van {f(ZEKERING["a"], 1)} A smelt; de diode verdraagt {f(DIODE["ifsm"], 0)} A piek '
          '(datablad). De DC-bus houdt de stekker van de eigen adapter (+ in het midden): niets doorknippen, niet verkeerd aan te sluiten. '
          '(Versie 3 had een P-MOSFET IRF4905 op een gaatjesprint; die bestaat niet als kant-en-klare module met schroefklemmen.)', '']
    # ingangen
    i_c = OPTO['ctr_min'] * i_in
    i_pull = 3.3 / PULLUP_OUT
    p_r = (U - OPTO['u_led']) ** 2 / OPTO['r']
    assert i_c > 10 * i_pull and i_in < OPTO['if_max'] / 2
    u_ac_max = OPTO['vr'] + U  # piekspanning op IN die de led in sperrichting nog verdraagt
    L += ['## 4. Ingangen (knoppen en sensoren)', '',
          f'Elke ingang: een kanaal van een {OPTO["naam"]}: VCC (S12, +12 V) door een weerstand ({f(OPTO["r"] / 1000, 1)} kΩ, AANNAME: na '
          f'te meten) en de led naar IN; de knop of sensor trekt IN naar 0 V. Op 12 V loopt er {f(i_in * 1000, 1)} mA door de led '
          f'(hoogstens {f(OPTO["if_max"] * 1000, 0)} mA); de transistor kan dan minstens {f(i_c * 1000, 1)} mA (CTR ≥ {f(100 * OPTO["ctr_min"], 0)} %), '
          f'de pull-up van de uitgang (AANNAME {f(PULLUP_OUT / 1000, 0)} kΩ naar 3,3 V) vraagt {f(i_pull * 1000, 2)} mA: zeker laag (factor '
          f'{f(i_c / i_pull, 0)}). De weerstand verbruikt {f(p_r * 1000, 0)} mW zolang de ingang actief is.', '',
          'Aansluiten: **contact, schakelaar, reed** tussen IN en 0 V (-X2); **NPN-sensor of hall (open collector)**: + aan +12 V (-X3), '
          '− aan 0 V, de uitgang aan IN. Een **sensor met een 12 V-uitgang (PNP)** werkt niet rechtstreeks met deze print (de led zit '
          'tussen +12 V en IN): kies er een met NPN-uitgang, of laat de PNP-sensor een klein relais schakelen waarvan het contact aan IN hangt. '
          f'Bestand tegen fouten: +12 V op IN zet 0 V over de led (niets aan de hand); wisselspanning tot {f(u_ac_max, 0)} V piek '
          f'verdraagt de led ({f(OPTO["vr"], 0)} V in sperrichting, datablad PC817); de wisselspanning van een trafo van de baan '
          '(16 V, 22,6 V piek) dus niet: een ingang krijgt een contact, geen trafo.', '']
    # hallsensoren
    i_hall = (U - OPTO['u_led'] - HALL['vsat'] * 0.5) / OPTO['r']
    r_min = (U - OPTO['u_led']) / HALL['i_sink']
    assert HALL['vs_min'] <= U <= HALL['vs_max'] and i_hall < HALL['i_sink'] * 0.8
    i_lek_c = HALL['lek'] * OPTO['ctr_min'] * 4  # ongunstig: CTR tot 200 % bij kleine stroom, hier ruim gerekend
    t_snel = HALL_MAGNEET['zone'] / HALL_MAGNEET['v_max'] * 1000
    n_max = int((PTC_IN['hold'][T_DOOS] * 0.9 - GROEPEN * i_in) / HALL['i_vs'])
    assert SENSOREN <= n_max
    L += ['### Hallsensoren (Ian, 2026-11-15)', '',
          f'Een hallsensor onder of naast het spoor ziet de magneet onder een loc of wagen. Gekozen: de **{HALL["naam"]}** (unipolair, '
          f'open collector, {f(HALL["vs_min"], 1)} tot {f(HALL["vs_max"], 0)} V): hij werkt **rechtstreeks op 12 V** (+ aan -X3, − aan -X2, de '
          f'uitgang aan IN n). Met de magneet trekt de uitgang IN naar 0 V: door de led van de PC817 loopt dan '
          f'**{f(i_hall * 1000, 1)} mA**, de sensor mag {f(HALL["i_sink"] * 1000, 0)} mA zinken en blijft verzadigd (hoogstens '
          f'{f(HALL["vsat"], 2)} V): de PC817 schakelt zeker. Zou de weerstand op de print kleiner zijn dan {f(r_min, 0)} Ω (stroom in IN '
          f'boven {f(HALL["i_sink"] * 1000, 0)} mA, meetblad), zet dan 1 kΩ in serie met de uitgang. Zonder magneet lekt de uitgang '
          f'hoogstens {f(HALL["lek"] * 1e6, 0)} µA: de PC817 blijft uit (de uitgang van de print geeft hoogstens {f(i_lek_c * 1e6, 0)} µA '
          f'tegen {f(i_pull * 1000, 2)} mA van de pull-up). Een kloon van de Allegro **A3144** (4,5-24 V, 25 mA) werkt net zo.', '',
          '**Niet gebruiken:** een kant-en-klare hallmodule voor Arduino (KY-003 en gelijk) met een pull-up en een lampje naar zijn eigen '
          'VCC: op 5 V gevoed duwt de pull-up stroom door de led van de PC817 (12 V tegen 5 V) en de ingang blijft half aan; op 12 V '
          'gevoed loopt er stroom door het lampje van de module (gemaakt voor 5 V). Een sensor met een 12 V-uitgang (PNP) werkt niet '
          '(zie hierboven).', '',
          f'**Meer sensoren op één ingang:** open collectors mogen parallel (wired-OR): elke sensor trekt IN naar 0 V, de lekstromen '
          f'tellen op ({f(HALL["lek"] * 1e6, 0)} µA per sensor). **Voeding:** elke sensor vraagt hoogstens {f(HALL["i_vs"] * 1000, 0)} mA uit S12; '
          f'met {GROEPEN} ingangen actief ({f(GROEPEN * i_in * 1000, 0)} mA) laat -F18 ({f(PTC_IN["hold"][T_DOOS], 2)} A bij {T_DOOS} °C, 90 %) '
          f'plaats voor **{n_max} sensoren**; gerekend met {SENSOREN} (één per ingang).', '',
          f'**Korte puls:** een magneetzone van {f(HALL_MAGNEET["zone"] * 1000, 0)} mm bij {f(HALL_MAGNEET["v_max"], 1)} m/s geeft '
          f'{f(t_snel, 0)} ms (stapvoets {f(HALL_MAGNEET["zone"] / HALL_MAGNEET["v_traag"], 1)} s). De firmware (1.3.0) leest een ingang van de soort '
          f'"puls" met een interrupt en ziet zo elke puls vanaf **{f(HALL_LEES["min_ms"], 0)} ms** (de PC817 voegt '
          f'hoogstens {f(OPTO_UIT["traag"] * 1e6, 0)} µs toe) en houdt ze {f(HALL_LEES["vast_s"], 1)} s vast; een knop houdt zijn '
          'ontdendering van 30 ms.', '']
    # warmte
    a_boven = DOOS['lx'] * DOOS['lz']  # het deksel (onderaan)
    a_zij = 2 * DOOS['h'] * (DOOS['lx'] + DOOS['lz'])
    a_eff = a_boven + a_zij  # de bodem tegen de baan telt niet mee
    p_mos = GROEPEN * p
    p_ptc = GROEPEN * groep_max ** 2 * PTC_GROEP['r1max']
    p_ptc_1k = GROEPEN * groep_1k ** 2 * PTC_GROEP['r1max']
    p_in = GROEPEN * p_r
    p_besturing = ESP_W + PCA_W + (ESP_W + PCA_W) * (1 / BUCK_ETA - 1)
    p_zek = totaal ** 2 * ZEKERING['r'] + knop ** 2 * PTC_IN['r1max']
    p_tot = p_mos + p_ptc + p_in + p_besturing + p_zek
    dt = p_tot / (DOOS['alfa'] * a_eff)
    p_gewoon = GROEPEN * groep_1k ** 2 * MOSFET['rds'] + p_ptc_1k + 4 * p_r + p_besturing + (GROEPEN * groep_1k) ** 2 * ZEKERING['r']
    dt_gewoon = p_gewoon / (DOOS['alfa'] * a_eff)
    assert dt < 15
    L += ['## 5. Warmte: geen verluchting nodig', '', rij('bron', 'ongunstigst', 'gewoon (1K, 4 ingangen actief)'), rij('---', '---:', '---:'),
          rij('16 kanalen van de MOSFET-modules', f'{f(p_mos, 2)} W', f'{f(GROEPEN * groep_1k ** 2 * MOSFET["rds"], 2)} W'),
          rij(f'16 polyfuses (R1max {f(PTC_GROEP["r1max"], 2)} Ω)', f'{f(p_ptc, 2)} W', f'{f(p_ptc_1k, 2)} W'),
          rij(f'16 ingangen (weerstand en led, {f(p_r * 1000, 0)} mW elk)', f'{f(p_in, 2)} W', f'{f(4 * p_r, 2)} W'),
          rij('ESP, PCA9685, regelaar', f'{f(p_besturing, 2)} W', f'{f(p_besturing, 2)} W'),
          rij('hoofdzekering en -F18', f'{f(p_zek, 2)} W', f'{f((GROEPEN * groep_1k) ** 2 * ZEKERING["r"], 2)} W'),
          rij('**samen**', f'**{f(p_tot, 2)} W**', f'**{f(p_gewoon, 2)} W**'), '',
          f'De bodem hangt tegen de onderkant van de baan (hout): die geeft bijna geen warmte af. Alleen het deksel en de 4 zijwanden '
          f'tellen (de doos is nu {f(DOOS["h"] * 1000, 1)} hoog): {f(a_eff, 3)} m² met {f(DOOS["alfa"], 0)} W/m²K (natuurlijke convectie, '
          f'AANNAME). Binnen wordt het **{f(dt, 1)} K** warmer dan onder de baan in het ongunstigste geval (alle 16 groepen met bordjes '
          f'van 0 Ω vol aan, alle ingangen actief), **{f(dt_gewoon, 1)} K** gewoon. Met 25 °C onder de baan blijft het binnen onder '
          f'{T_DOOS} °C: daarop zijn de polyfuses hierboven gerekend. Verluchtingsgaten zijn niet nodig; de netadapter (het warmste deel) '
          'hangt buiten de doos. De modules staan in de rechterhelft op de bodem (één laag): de regelaar ('
          f'{f((ESP_W + PCA_W) * (1 / BUCK_ETA - 1), 2)} W) wordt nauwelijks warm.', '']
    # klemlippen
    rek_lip = 1.5 * LIP['t'] * LIP['d'] / LIP['l'] ** 2
    i_lip = LIP['b'] * LIP['t'] ** 3 / 12
    f_lip = 3 * PETG['e'] * i_lip * LIP['d'] / LIP['l'] ** 3
    assert rek_lip < PETG['rek_max']
    L += ['## 6. Klemlippen van de bordjes (PETG)', '',
          f'Elk bordje zit tussen 4 lippen aan zijn korte kanten. Een lip is een tong van {f(LIP["t"], 1)} x {f(LIP["b"], 1)} die in een '
          f'kuiltje van 1,8 diep in de bodem begint: veerlengte {f(LIP["l"], 1)} tot de haak. Bij het inleggen duwt de print de '
          f'schuine kant (45°) {f(LIP["d"], 2)} opzij. Rek = 1,5 t d / L² = **{f(100 * rek_lip)} %** (onder 2 %). Kracht om een lip open '
          f'te duwen: 3 E I d / L³ = {f(f_lip, 2)} N; de haak grijpt {f(LIP["d"], 2)} mm over de print met een recht vlak eronder: '
          'het bordje (10 g) en de draden eraan blijven zitten met het deksel eraf en de doos ondersteboven. Uitnemen: de twee lippen '
          'aan één kant met de spatel naar buiten duwen en het bordje optillen.', '']
    # draden
    r_retour = KOPER * RETOUR['l'] / RETOUR['mm2']
    i_mod = 8 * groep_max
    L += ['## 7. Draden en de 0 V-retour', '',
          f'De 16 groepen komen terug door de MOSFET-modules: per module tot {f(i_mod)} A over zijn klem VIN− en een draad van '
          f'{f(RETOUR["mm2"], 2)} mm² naar de verdeelklem -X2 (WAGO 221-415, 32 A): {f(RETOUR["l"] * 1000, 0)} mm geeft '
          f'{f(r_retour * 1000, 1)} mΩ en {f(i_mod * r_retour * 1000, 0)} mV verlies. Samen {f(totaal)} A door de 2 WAGO-klemmen van -X1 en '
          '-X2 en de draden van 0,75 mm² van de DC-bus. De andere draden (PWM, GPIO, I2C, 3,3 V) dragen milliampères: 0,14 mm² '
          'of dupontkabels. Interne draadlijst: TRN-14.', '']
    # de naad
    J = HAAK['l'] ** 2 / 2 - HAAK['b0'] * HAAK['l'] + HAAK['b0'] ** 2 * math.log((HAAK['b0'] + HAAK['l']) / HAAK['b0'])
    F_h = HAAK['d'] * PETG['e'] * HAAK['t'] ** 3 / (12 * J)
    rek_h = 6 * F_h * HAAK['l'] / ((HAAK['b0'] + HAAK['l']) * HAAK['t'] ** 2 * PETG['e'])
    rek_recht = 1.5 * HAAK['t'] * HAAK['d'] / HAAK['l'] ** 2
    ta = HAAK['d'] / HAAK['ramp']
    P_h = F_h * (MU + ta) / (1 - MU * ta)
    rek_d = 1.5 * DEKSELLIP['t'] * DEKSELLIP['d'] / DEKSELLIP['l'] ** 2
    F_d = sum(3 * PETG['e'] * (b * DEKSELLIP['t'] ** 3 / 12) * DEKSELLIP['d'] / DEKSELLIP['l'] ** 3 for b in DEKSELLIP['b'])
    td = DEKSELLIP['h'] / DEKSELLIP['ramp']
    P_d = F_d * (MU + td) / (1 - MU * td)
    assert rek_h < PETG['rek_max'] and rek_d < PETG['rek_max']
    L += ['## 8. De naad: klikhaken en de lip van het deksel (PETG)', '',
          'Ian, 2026-11-15: "De doos moet in elkaar kunnen klikken en nog kunnen lijmen." De 2 helften klikken met 2 haken (achter en '
          'voor) van de rechterhelft in een kuiltje in de wand van de linkerhelft; 5 bodemlippen lijnen uit; overal 0,2 lijmspleet.', '',
          f'Een haak is een uitkragende balk van {f(HAAK["l"], 0)} lang en {f(HAAK["t"], 1)} dik. Door de onderkant van 45° (zo print hij '
          f'zonder support) groeit zijn hoogte van {f(HAAK["b0"], 1)} aan de punt tot {f(HAAK["b0"] + HAAK["l"], 1)} aan de voet. Met '
          f'J = ∫ x² / (b0 + x) dx = {f(J, 1)} mm² is de kracht om de punt {f(HAAK["d"], 1)} opzij te duwen F = d E t³ / (12 J) = '
          f'**{f(F_h, 1)} N**, de rek aan de voet 6 F l / (b t² E) = **{f(100 * rek_h)} %** (een rechte balk van {f(HAAK["b0"], 1)} hoog: '
          f'{f(100 * rek_recht)} %), onder de {f(100 * PETG["rek_max"], 0)} %. De nok loopt op over {f(math.degrees(math.atan(ta)), 0)}° (wrijving '
          f'{f(MU, 1)}): inklikken **{f(P_h, 1)} N per haak**, samen {f(2 * P_h, 0)} N. Met het rechte vlak achter de nok kan de haak er niet '
          'meer uit tot je de punt met een kleine schroevendraaier van de wand weg trekt (van binnen, bovenaan bereikbaar).', '',
          f'Het deksel: de rechterhelft schuift met een lip van {f(DEKSELLIP["l"], 0)} x {f(DEKSELLIP["t"], 1)} onder de linkerhelft; de lip is in '
          f'4 vingers gesneden met elk een nok van {f(DEKSELLIP["h"], 1)} die {f(DEKSELLIP["d"], 1)} opzij moet (de lijmspleet is 0,2). Rek = 1,5 t d / L² '
          f'= **{f(100 * rek_d)} %**; inklikken samen **{f(P_d, 0)} N**.', '']
    (HIER / 'Berekeningen.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
    print('\n'.join(L))


if __name__ == '__main__':
    maak()
