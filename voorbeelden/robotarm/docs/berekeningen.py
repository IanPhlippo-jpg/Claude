"""Rekenblad robotarm (voorbeelden/robotarm): koppel per as, reductorkeuze en de vacuümgrijper.

Gebruik: python voorbeelden/robotarm/docs/berekeningen.py  ->  schrijft docs/Berekeningen.md naast dit bestand.
Maten uit maak-robotarm.mjs (M); massa's van de armdelen zijn aannames voor een gelaste S355-constructie (plaat 8-12 mm),
vergeleken met industriële robots van dezelfde klasse (120 kg / 2,7 m wegen 1000-1100 kg). Na de eerste weging bijwerken.
"""
import math
import os

g = 9.81
# --- maten (mm -> m), uit maak-robotarm.mjs
a1, d1, a2, a3, d4, d6 = 0.350, 0.675, 1.150, 0.120, 1.200, 0.215
# --- lasten
deur = 60.0                      # kg, zware deur (Ian): 2115 x 1015 x 54
grijper = 45.0                   # kg: raam (profiel 80x40), adapter, 2 x FA-M + 1 x FMP-60, 5 ejectors, slangen
tool_z = 0.15                    # m: van de flens tot het zwaartepunt van grijper + deur (langs de flensas)
last = deur + grijper
# --- massa's van de armdelen (aanname) en de plaats van hun zwaartepunt
m_bovenarm, r_bovenarm = 170.0, a2 / 2            # vanaf A2
m_onderarm, r_onderarm = 95.0, 0.55               # elleboog + onderarm, vanaf A3 langs de arm (de polsmotoren achteraan houden hem vooraan licht)
m_pols, r_pols = 25.0, d4                         # polshuis + A5/A6-reductor, in het polsmidden
m_motoren3, r_motoren3 = 3 * 9.0, -0.65           # 3 polsmotoren achter A3 (tegengewicht)

def regel(t):
    return t

# ---------------------------------------------------------------- statisch koppel, arm horizontaal gestrekt (slechtste stand)
r_last_A3 = d4 + d6 + tool_z
r_last_A2 = a2 + r_last_A3
M_A3_stat = g * (last * r_last_A3 + m_pols * r_pols + m_onderarm * r_onderarm + m_motoren3 * r_motoren3)
M_A2_stat = g * (last * r_last_A2 + m_pols * (a2 + r_pols) + m_onderarm * (a2 + r_onderarm) + m_motoren3 * (a2 + r_motoren3) + m_bovenarm * r_bovenarm)
# gewichtscompensatie (hydropneumatisch): ingesteld op het eigen gewicht van de arm plus de helft van de last, zodat het
# statische koppel op A2 met en zonder deur even groot is (de ene keer naar beneden, de andere keer naar boven)
M_arm = g * (m_pols * (a2 + r_pols) + m_onderarm * (a2 + r_onderarm) + m_motoren3 * (a2 + r_motoren3) + m_bovenarm * r_bovenarm)
comp = M_arm + 0.5 * g * last * r_last_A2
M_A2_netto = M_A2_stat - comp
# ---------------------------------------------------------------- dynamisch: versnelling op de as (rad/s²) x traagheid
alfa = {'A1': math.radians(120), 'A2': math.radians(70), 'A3': math.radians(120), 'A4': math.radians(250), 'A5': math.radians(250), 'A6': math.radians(300)}
# traagheid om A2/A3 (puntmassa's + eigen traagheid van de deur om haar zwaartepunt, lengte 2,115)
J_deur = deur * (2.115 ** 2 + 1.015 ** 2) / 12
J_A3 = last * r_last_A3 ** 2 + m_pols * r_pols ** 2 + m_onderarm * (r_onderarm ** 2 + 0.6 ** 2 / 12) + m_motoren3 * r_motoren3 ** 2 + J_deur
J_A2 = last * r_last_A2 ** 2 + m_pols * (a2 + r_pols) ** 2 + m_onderarm * (a2 + r_onderarm) ** 2 + m_motoren3 * (a2 + r_motoren3) ** 2 + m_bovenarm * (a2 ** 2 / 3) + J_deur
r_A1 = a1 + r_last_A2 * 0.9  # de last op 90 % van het bereik
J_A1 = last * r_A1 ** 2 + J_deur + m_bovenarm * (a1 + 0.3) ** 2 + (m_onderarm + m_pols + m_motoren3) * (a1 + 0.9) ** 2 + 180 * 0.35 ** 2
M = {
    'A1': J_A1 * alfa['A1'],
    'A2': M_A2_netto + J_A2 * alfa['A2'],
    'A3': M_A3_stat + J_A3 * alfa['A3'],
    # pols: de last staat 0,20 m voor de flens en 0,215 voor A5; A4/A6 ook met de deur dwars (zwaartepunt 0,10 naast de as)
    'A4': g * last * 0.30 + (J_deur + last * 0.30 ** 2) * alfa['A4'],
    'A5': g * last * (d6 + tool_z) + (J_deur + last * (d6 + tool_z) ** 2) * alfa['A5'],
    'A6': g * last * 0.10 + J_deur * alfa['A6'],
}
# ---------------------------------------------------------------- reductoren (cycloïdaal, RV-type; nominaal / piek start-stop, Nm)
# Nabtesco RV-C (holle as, de kabels erdoor): nominaal / toelaatbaar bij versnellen en remmen (Nm), overbrenging met de
# eigen voortrap (huis-overbrenging x tandwielvoortrap); bron: nabtesco.de, serie RV-C (geraadpleegd 2026-11-09)
RV = {
    'RV-50C': (490, 1225, 32.54 * 4), 'RV-100C': (980, 2450, 36.75 * 4), 'RV-200C': (1961, 4900, 34.86 * 4), 'RV-320C': (3136, 7840, 35.61 * 5),
}
# statisch koppel per as (zonder versnelling): het nominale koppel moet dit dragen
M_stat = {'A1': 0, 'A2': M_A2_netto, 'A3': M_A3_stat, 'A4': g * last * 0.30, 'A5': g * last * (d6 + tool_z), 'A6': g * last * 0.10}
def kies(Mmax, Mst):
    """kleinste reductor waarvan het toelaatbare versnellingskoppel >= 1,3 x het grootste koppel is en het nominale >= het statische"""
    for naam, (nom, piek, i) in RV.items():
        if piek >= 1.3 * Mmax and nom >= Mst:
            return naam, nom, piek, i
    return 'te groot', 0, 0, 1
keuze = {a: kies(M[a], M_stat[a]) for a in M}
# bewust groter dan de regel: A1 draagt via zijn hoofdlager het kantelmoment van de hele robot (stijfheid), de pols
# (A4, A5) vangt de schokken op van een deur van 2,1 m die draait
# A2 krijgt dezelfde RV-320C als A1 en A3: één reservetype en marge voor de compensatie, die niet in elke stand precies
# compenseert
GROTER = {'A1': 'RV-320C', 'A2': 'RV-320C', 'A4': 'RV-100C', 'A5': 'RV-100C'}
for a, n in GROTER.items():
    if RV[n][1] >= RV.get(keuze[a][0], (0, 0))[1]:
        keuze[a] = (n, *RV[n])
# ---------------------------------------------------------------- snelheid, overbrenging en motor
# snelheid zoals een industriële robot van deze klasse (°/s per as); servomotoren met 3000 tpm als hoogste toerental. De
# overbrenging = huis-overbrenging van de RV-C x de eigen tandwielvoortrap, zo gekozen dat de motor bij 3000 tpm de
# gevraagde assnelheid haalt (graden per seconde = tpm x 6 / overbrenging). Koppel aan de motor = M / (i x eta).
eta = 0.8
SNELHEID = {'A1': 130, 'A2': 120, 'A3': 120, 'A4': 220, 'A5': 220, 'A6': 300}
n_max = 3000
huis = {'RV-50C': 32.54, 'RV-100C': 36.75, 'RV-200C': 34.86, 'RV-320C': 35.61}
overbrenging = {a: n_max * 6 / SNELHEID[a] for a in M}
voortrap = {a: overbrenging[a] / huis[keuze[a][0]] for a in M}
Mmot = {a: M[a] / (overbrenging[a] * eta) for a in M}
Mmot_stat = {a: M_stat[a] / (overbrenging[a] * eta) for a in M}
# servomotoren 400 V, 1500 tpm nominaal, 3000 tpm max., piekkoppel 3 x nominaal (Inovance MS1H3-reeks)
MOTOREN = [('1,3 kW', 8.3), ('2,9 kW', 18.6), ('4,4 kW', 28.0), ('5,5 kW', 35.0), ('7,5 kW', 48.0)]
def motor(a):
    """kleinste motor met nominaal >= 1,2 x het statische en piek >= 1,2 x het grootste koppel aan de motoras"""
    for naam, Mn in MOTOREN:
        if Mn >= Mmot_stat[a] * 1.2 and 3 * Mn >= Mmot[a] * 1.2:
            return naam, Mn
    return 'te groot', 0
motor_keuze = {a: motor(a) for a in M}
# ---------------------------------------------------------------- vacuüm: vlakgrijper met 3 balken (Schmalz-rekenwijze)
# 2 x FA-M 1972 x 130 (550 N bij -250 mbar per 442 mm) + 1 x FMP-60 1972 x 60 (433 N bij -250 mbar per 1234 mm); de deur
# bedekt alle drie de balken volledig. Belastinggeval III (de deur rechtop, de kracht langs het vlak) is maatgevend.
F_fam = 550 / 442 * 1972
F_fmp = 433 / 1234 * 1972
F_th = 2 * F_fam + F_fmp
a_max = 4.0     # m/s², versnelling van het stuk (de besturing begrenst de baanversnelling met last)
S = 2.0         # veiligheid (Schmalz: minstens 1,5; 2 bij draaiende bewegingen)
mu = 0.5        # wrijving schuim op HPL/hout
F_I = deur * (g + a_max) * S                 # plat, recht omhoog trekken
F_III = deur * (g + a_max) / mu * S          # rechtop, de kracht langs het vlak (wrijving)
ok_I, ok_III = F_th >= F_I, F_th >= F_III
# perslucht: 5 meertraps-ejectors Schmalz SBPL 100 HV (2 per FA-M, 1 voor de FMP-60), elk 395 l/min lucht bij 870 l/min zuigen
lucht = 5 * 395  # l/min zolang het vacuüm aan staat
uit = []
w = uit.append
w('# Berekeningen robotarm\n')
w('Gemaakt door `berekeningen.py`; de massa\'s van de armdelen zijn aannames (gelaste S355-constructie), na de eerste weging bijwerken.\n')
w('## Lasten\n')
w(f'| Wat | Waarde |\n|---|--:|\n| Deur | {deur:.0f} kg |\n| Grijper (raam, nappen, ejectors, slangen) | {grijper:.0f} kg |\n| Totaal aan de flens | {last:.0f} kg (klasse 120 kg) |\n| Zwaartepunt voor de flens | {tool_z * 1000:.0f} mm |\n| Bereik tot het polsmidden | {(a1 + a2 + d4) * 1000:.0f} mm; tot de flens {(a1 + a2 + d4 + d6) * 1000:.0f} mm |\n')
w('## Koppel per as (slechtste stand: arm horizontaal gestrekt, met versnelling)\n')
w(f'Statisch A2 {M_A2_stat:.0f} Nm, waarvan de gewichtscompensatie {comp:.0f} Nm opvangt; statisch A3 {M_A3_stat:.0f} Nm. '
  f'Traagheid om A1 {J_A1:.0f} kg·m², om A2 {J_A2:.0f} kg·m², om A3 {J_A3:.0f} kg·m².\n')
w('| As | Snelheid | Versnelling | Koppel (Nm) | Reductor | Nominaal / bij versnellen (Nm) | Overbrenging (voortrap) | Motorkoppel max / statisch (Nm) | Servomotor |\n|---|--:|--:|--:|---|--:|--:|--:|---|')
for a in M:
    n, nom, piek, i = keuze[a]
    w(f'| {a} | {SNELHEID[a]} °/s | {math.degrees(alfa[a]):.0f} °/s² | {M[a]:.0f} (statisch {M_stat[a]:.0f}) | {n} | {nom} / {piek} | {overbrenging[a]:.0f} ({voortrap[a]:.2f}) | {Mmot[a]:.1f} / {Mmot_stat[a]:.1f} | {motor_keuze[a][0]} |')
w('\nDe arm beweegt met servomotoren op elke as; de cilinder op de schouder is alleen een gewichtscompensatie (een gasveer die het eigen gewicht draagt), geen aandrijving. Daardoor kan A2 snel bewegen met een kleinere motor.\n')
w('\nRegel: het toelaatbare koppel bij versnellen en remmen minstens 1,3 x het grootste koppel, het nominale minstens het statische koppel (catalogus Nabtesco RV-C).\n')
w('## Vlakgrijper (belastinggevallen volgens de rekenwijze van Schmalz)\n')
w(f'| Wat | Waarde |\n|---|--:|\n| Balken | 2 x Schmalz FA-M 1972 x 130 ({F_fam:.0f} N elk) + 1 x FMP-60 1972 x 60 ({F_fmp:.0f} N), bij -250 mbar |\n| Houdkracht, deur (alle balken bedekt) | {F_th:.0f} N |\n'
  f'| Nodig plat (I), S = {S} | {F_I:.0f} N ({"ok" if ok_I else "TE KLEIN"}) |\n| Nodig rechtop (III, µ = {mu}), S = {S} | {F_III:.0f} N ({"ok" if ok_III else "TE KLEIN"}) |\n'
  f'| Perslucht voor het vacuüm (5 x SBPL 100) | {lucht} l/min = {lucht * 60 / 1000:.0f} m³/h zolang de grijper zuigt |\n')
w('Kleinere stukken (plinten, planken, latten): zie Grijpen.md; de grijpplanner kiest per stuk de balk(en) met de meeste houdkracht en begrenst de versnelling. '
  'Elke balk heeft een terugslagklep en een vacuümschakelaar: bij het uitvallen van de perslucht blijft het vacuüm even staan en stopt de robot (veiligheidscircuit). '
  f'Let op de compressor: {lucht * 60 / 1000:.0f} m³/h vraagt een schroefcompressor van ±15 kW, of kies een elektrische zijkanaalblazer (±4 kW) voor het vacuüm.\n')
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Berekeningen.md'), 'w', encoding='utf-8').write('\n'.join(uit) + '\n')
for a in M:
    print(a, round(M[a]), keuze[a][0], round(Mmot[a], 1))
print('vacuum', round(F_th), round(F_I), round(F_III), ok_I, ok_III)
assert ok_I and ok_III, 'de grijper houdt de deur niet'
assert all(k[0] != 'te groot' for k in keuze.values())
assert all(m[0] != 'te groot' for m in motor_keuze.values()), motor_keuze
print({a: (round(overbrenging[a]), motor_keuze[a][0]) for a in M})
