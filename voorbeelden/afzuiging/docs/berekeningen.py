"""Rekenblad van de afzuiging: lucht, filter, vangst, geluid, elektriek, warmte en bevestiging.

Draai:  python voorbeelden/afzuiging/docs/berekeningen.py  -> schrijft docs/Berekeningen.md opnieuw.
Alle invoer staat bovenaan met de bron erbij. Aannames heten AANNAME en hebben een onder- en bovengrens; de uitkomst
wordt voor beide grenzen gegeven. Niets hier vervangt de metingen van docs/Vrijgave-en-meetplan.md.
"""
import json
import math
import re
import sys
from pathlib import Path

RHO = 1.2  # kg/m³, lucht bij 20 °C
HIER = Path(__file__).resolve().parent
REGEL_H = HIER.parent / 'firmware' / 'include' / 'regel.h'


def lees_regel(tekst=None):
    """de firmwaregrenzen rechtstreeks uit regel.h (geen kopie): wie daar een waarde wijzigt, laat dit rekenblad falen
    als ze niet meer klopt met het model"""
    t = tekst if tekst is not None else REGEL_H.read_text(encoding='utf-8')

    def lijst(naam):
        m = re.search(naam + r'\[3\]\s*=\s*\{([^}]*)\}', t)
        return [float(x.strip().rstrip('f')) for x in m.group(1).split(',')]

    def getal(naam):
        m = re.search(r'(?<![A-Za-z_])' + naam + r'\s*=\s*([0-9.]+)f?\s*[;,]', t)
        return float(m.group(1))
    return dict(volfactor=dict(zip([v / 100 for v in lijst('vervangStand')], lijst('vervangFactor'))),
                bescherm=getal('beschermVanaf') / 100, dagmax=getal('dagMaxPct') / 100, storing=getal('storingFactor'),
                lek=getal('lekFactor'), volgmarge=getal('volgMarge'), boost_herstel=getal('boostHerstel'))


FW = lees_regel()

# ---------------------------------------------------------------- invoer: ventilator
# San Ace C175, 9TG24P0S01: 24 V, 2,35 A, 56,4 W, 69 dB(A) op 1 m (fabrikant). Curve bij 100 % PWM, afgelezen uit de
# fabrieksgrafiek (met inlaatnozzle 109-1073), afleesonzekerheid ±15 tot 25 Pa.
FAN = [(0, 609), (240, 430), (360, 340), (480, 225), (540, 160), (600, 103), (696, 0)]  # (m³/h, Pa)
FAN_W, FAN_A, FAN_DBA = 56.4, 2.35, 69.0


FAN_ONZEKER = 20.0  # Pa: afleesonzekerheid van de curve (±), in elk scenario van hoofdstuk 3b


def fan_p(q, r=1.0, d=0.0):
    """statische druk bij debiet q (m³/h) en toerentalfractie r (wetten van de ventilator: Q ~ r, p ~ r²); d = verschuiving
    van de curve bij vol toerental (Pa), voor de afleesonzekerheid"""
    qq = q / r
    if qq >= FAN[-1][0]:
        return 0.0
    for (q0, p0), (q1, p1) in zip(FAN, FAN[1:]):
        if q0 <= qq <= q1:
            return max(0.0, r * r * (p0 + (p1 - p0) * (qq - q0) / (q1 - q0) + d))
    return r * r * (FAN[0][1] + d)


# ---------------------------------------------------------------- invoer: luchtweg (maten uit maak-afzuiging.mjs)
A_OPENING = 0.201 * 0.201  # m², opening van het bovenframe onder de RVS-plaat
# versie 7.2: het open oppervlak komt uit het laserrapport (laser/rooster.loops, geschreven door logo/rooster.py). Boven het
# filter telt het helemaal; de gaten erbuiten tellen voor de helft (AANNAME): hun lucht moet door de spleet van 3 tot 5 mm
# tussen de plaat en de plooien opzij naar het filter.
LASER = json.loads((HIER.parent / 'laser' / 'rooster.loops').read_text(encoding='utf-8'))['rapport']
A_ROOSTER_BOVEN = LASER['open_boven_filter_cm2'] * 1e-4  # m²
A_ROOSTER_BUITEN = (LASER['open_cm2'] - LASER['open_boven_filter_cm2']) * 1e-4  # m²
A_ROOSTER = A_ROOSTER_BOVEN + 0.5 * A_ROOSTER_BUITEN  # m², werkzaam open oppervlak
A_ROOSTER_71 = 121.1e-4  # m², versie 7.1: alleen boven het filter (de plaat lag op de plooien), sleuven 3,5 / stegen 3
# interieurfilter MANN CU 20 013, 195 x 145 x 30: de rand van 6 mm ligt op de foamband, de lucht gaat door 135 x 185
A_FILTER_VOL = 0.145 * 0.195  # m², buitenmaat
A_FILTER = 0.135 * 0.185  # m², vrij front binnen de steunrand
A_INLAAT = math.pi * 0.0635 ** 2  # m², oog Ø127 in de instroomplaat
# versie 7.2: de ronde kuip (maak-afzuiging.mjs, M.kuip): lamellen onder 45° in 12 sectoren van 32 mm breed, 10 rijen,
# banden van 4 mm verticaal (loodrecht op de lamel 4 cos 45° = 2,83 mm), en 4 ringsleuven in de bodem met 6 spaken van 4 mm
KUIP = dict(sectoren=12, breed=0.032, rijen=10, sleuf=0.004, ringen=[(46, 50), (54, 58), (62, 66), (70, 74)], spaken=6, spaak=4)
A_KUIP_LAMELLEN = KUIP['sectoren'] * KUIP['rijen'] * KUIP['breed'] * KUIP['sleuf'] * math.cos(math.radians(45))
A_KUIP_RINGEN = sum(math.pi * (b * b - a * a) - KUIP['spaken'] * KUIP['spaak'] * (b - a) for a, b in KUIP['ringen']) * 1e-6
A_LAMELLEN = A_KUIP_LAMELLEN + A_KUIP_RINGEN  # m², vrije doorgang van de uitblaas
A_LAMELLEN_71 = (0.202 * 0.202 - math.pi * 0.045 ** 2) * 0.6  # m², versie 7.1: de vlakke bodemplaat


def zeta_plaat(f):
    """Idelchik, dunne geperforeerde plaat met scherpe randen; f = open fractie; ζ op de aanstroomsnelheid"""
    return (0.707 * (1 - f) ** 0.375 + 1 - f) ** 2 / f ** 2


# (naam, ζ, oppervlak waarop ζ betrokken is). AANNAME: de werkelijke ζ ligt tussen 0,7x en 1,5x deze waarden.
# vingerrooster in het oog (maak-afzuiging.mjs, M.inlaat.vinger): 10 ribben 1,6 mm langs Z op x = ±6, ±18 .. ±54, een
# dwarsrib langs X en twee ringen (r 24 en 44); de kruisingen tellen één keer
# versie 7.2: 18 ribben op steek 7,2 (spleet 5,6), 12 mm hoog (EN ISO 13857 tabel 4); 7.1: 10 ribben op steek 12, 7 hoog
VINGER = dict(rib=1.6, xs=[3.6 + 7.2 * k for k in range(9)], ringen=[24, 44], r=63.5, h=12.0, spleet=7.2 - 1.6, rotor=2.05)


def f_vinger():
    """open fractie van het oog met het vingerrooster (numeriek, raster van 0,1 mm)"""
    V, n, dicht, tot = VINGER, 0, 0, 0
    st = 0.1
    k = int(V['r'] / st)
    for i in range(-k, k + 1):
        x = i * st
        for j in range(-k, k + 1):
            z = j * st
            rr = math.hypot(x, z)
            if rr > V['r']:
                continue
            tot += 1
            rib = any(abs(abs(x) - xr) <= V['rib'] / 2 for xr in V['xs']) or abs(z) <= V['rib'] / 2 or                 any(abs(rr - rg) <= V['rib'] / 2 for rg in V['ringen'])
            dicht += rib
    return 1 - dicht / tot


F_ROOSTER, F_VINGER = A_ROOSTER / A_OPENING, f_vinger()
VERLIEZEN = [
    (f'RVS-rooster (f = {F_ROOSTER:.2f})'.replace('.', ','), zeta_plaat(F_ROOSTER), A_OPENING),
    (f'vingerrooster in het oog (18 ribben 1,6 mm, een dwarsrib en twee ringen, f = {F_VINGER:.2f})'.replace('.', ','), zeta_plaat(F_VINGER), A_INLAAT),
    ('instroom naar het oog Ø127 (trechter 45°)', 0.5, A_INLAAT),
    ('uitblaas door de lamellen en ringsleuven van de kuip', 2.5, A_LAMELLEN),
]
RUIM = (0.7, 1.5)


def dp_rest(q, k=1.0, dicht=0.0, rho=RHO):
    """de luchtweg zonder filter; dicht = deel van het open rooster dat afgedekt is (een hand), rho = luchtdichtheid"""
    v = q / 3600
    tot = 0.0
    for i, (_, z, a) in enumerate(VERLIEZEN):
        if i == 0 and dicht:
            z, a = zeta_plaat(F_ROOSTER * (1 - dicht)), A_OPENING
        tot += z * 0.5 * rho * (v / a) ** 2
    return k * tot


# ---------------------------------------------------------------- invoer: filters
# dp(v) = dp_ref * (v / v_ref) ** n, v = snelheid over het front van het filter. n = 1 (vezelmedia, laminair) tenzij
# de fabrikant meer punten geeft. eind = aanbevolen einddrukval (vervangen), of 2 x schoon als die er niet is.
FILTERS = {
    # GEKOZEN (Ian, 2026-11-08): interieurfilter MANN CU 20 013 (195 x 145 x 30, geplooid deeltjesfilter; Bosch
    # 1 987 435 066, Valeo 715828, Purflux AH495, Filtron K 1347A). Geen fabrikantcurve. AANNAME: Johansson e.a. (AIVC
    # 1999, Volvo-interieurfilters, front 0,04 m² bij 252 m³/h: 40 tot 80 Pa schoon) geschaald op de frontsnelheid van
    # het hele filter: 55 tot 115 Pa bij 250 m³/h; wij rekenen met 115 Pa (bovengrens) en met het vrije front binnen de
    # steunrand (dus 130 Pa). Vol: 300 Pa (+ 200 Pa, ISO/TS 11155-1-proeven). Vangst bij 0,3 µm 50 tot 70 %, vanaf 3 µm > 90 %.
    'CU': dict(naam='**gekozen:** interieurfilter MANN CU 20 013, 30 mm, geplooid', dp_ref=115, v_ref=250 / 3600 / A_FILTER_VOL,
               n=1.0, eind=300 * 130 / 115, klasse='interieurfilter (ISO/TS 11155), 0,3 µm: 50–70 %', diepte=30),
    # vorige keuze (Ian, 2026-11-07, vervangen 2026-11-08): Rittal SK 3171.100, 173 x 173 x 17, G3, gerekend als een
    # G4-mat van 20 mm (Onninen/General Filter A40: 34 Pa bij 1,5 m/s), op het front van de vroegere cassette (171 x 171)
    'G4': dict(naam='Rittal SK 3171.100 (G3), 17 mm, vroegere cassette 171 x 171', dp_ref=34, v_ref=1.5, a=0.171 * 0.171,
               n=1.0, eind=250, klasse='ISO coarse 50 % (G3)', diepte=17),
    'M5': dict(naam='vlakke mat M5 (ePM10 50 %), 20 mm, referentie Nittmann V400S', dp_ref=47, v_ref=0.5, n=1.0,
               eind=None, klasse='ISO ePM10 50 % (M5)', diepte=20),
    # TROX MFP-PLA minipleat, kunststof frame, 48 mm (plooi 40), maat op aanvraag, vlakke pakking FNU aan de
    # aanstroomzijde. Datasheet: 287 x 287 x 48 bij 565 m³/h (1,9 m/s) -> ePM1 65 %: 100 Pa, ePM1 90 %: 170 Pa;
    # einddruk 450 Pa. Wij vervangen bij 2 x schoon (zoals Camfil: schoon + 100 Pa of 3 x schoon, het laagste).
    # Bron: TROX MFP Mini Pleat Filters (walkairdirect.com, 2026). Lineair geschaald naar ons front: een schatting.
    'F7': dict(naam='minipleat ePM1 65 % (F7), 48 mm, TROX MFP-PLA op maat', dp_ref=100, v_ref=565 / 3600 / 0.287 ** 2,
               n=1.0, eind=None, klasse='ISO ePM1 65 %', diepte=48),
    'F9': dict(naam='minipleat ePM1 90 % (F9), 48 mm, TROX MFP-PLA op maat', dp_ref=170, v_ref=565 / 3600 / 0.287 ** 2,
               n=1.0, eind=None, klasse='ISO ePM1 90 %', diepte=48),
    # Freudenberg SF13 H13, 305 x 305 x 150: 325 m³/h bij 220 Pa (0,97 m/s). Ter vergelijking: past niet in de module.
    'H13': dict(naam='H13 (EN 1822), 150 mm, Freudenberg SF13 (ter vergelijking, past niet)', dp_ref=220,
                v_ref=325 / 3600 / 0.305 ** 2, n=1.0, eind=None, klasse='EN 1822 H13', diepte=150),
}

# ---------------------------------------------------------------- doelen
X_HAND = 0.10  # m, nagel boven het rooster: de WERKHOOGTE (versie 7.2 eerlijk vastgelegd: 15 cm haalt alleen boost)
V_VANG = 0.5  # m/s, gewenste luchtsnelheid op X_HAND (vangsnelheid voor licht stof dat zacht vrijkomt: 0,5 tot 1,0)


def v_vang(q, x=X_HAND):
    """Dalla Valle, opening met flens (het blad): v = Q / (0,75 (10 x² + A))"""
    return (q / 3600) / (0.75 * (10 * x * x + A_OPENING))


def q_voor_vang(v=V_VANG, x=X_HAND):
    return v * 0.75 * (10 * x * x + A_OPENING) * 3600


def werkpunt(dpf, r=1.0, k=1.0, d=0.0):
    """debiet waar de ventilatorcurve de systeemweerstand snijdt (bisectie)"""
    lo, hi = 0.0, FAN[-1][0] * r
    for _ in range(60):
        m = (lo + hi) / 2
        if fan_p(m, r, d) > dpf(m) + dp_rest(m, k):
            lo = m
        else:
            hi = m
    return lo


def r_voor(q, dpf, k=1.0):
    """toerentalfractie waarbij het systeem q haalt (None als 100 % niet volstaat)"""
    if werkpunt(dpf, 1.0, k) < q:
        return None
    lo, hi = 0.05, 1.0
    for _ in range(60):
        m = (lo + hi) / 2
        if werkpunt(dpf, m, k) < q:
            lo = m
        else:
            hi = m
    return hi


def filter_dp(f, belast=False):
    eind = f['eind'] or 2 * f['dp_ref']
    fac = eind / f['dp_ref'] if belast else 1.0
    a = f.get('a', A_FILTER)
    return lambda q: fac * f['dp_ref'] * ((q / 3600 / a) / f['v_ref']) ** f['n']


def db(r, afstand=1.0):
    """69 dB(A) op 1 m bij vol toerental; ΔL = 50 log10(r) (ventilatorwet), vrije puntbron: -20 log10(afstand)"""
    return FAN_DBA + 50 * math.log10(r) - 20 * math.log10(afstand)


# ---------------------------------------------------------------- elektriek
U_DC = 24.0
ADAPTER = dict(naam='Mean Well GST90A24-P1M', w=90, a=3.75, eta=0.88)  # η: datablad 90 % typisch bij vollast; 88 % (Level VI) bij deellast
ZEKERING = 3.15  # A traag: Bel Fuse 0697W3150-01 (TE5, 350 V AC / 72 V DC, I²t 66 A²s, IEC 60127-3 blad 4)
ZEK_TIJD = {1.5: '≥ 60 min', 2.1: '≤ 120 s', 2.75: '0,4 tot 10 s', 4: '0,15 tot 3 s', 10: '20 tot 150 ms'}  # smelttijd per x In (IEC 60127-3 blad 4)
ADAPTER_OVERLAST = (1.10, 1.50)  # Mean Well: overlast vanaf 110 tot 150 % van 90 W, dan hiccup (herstelt vanzelf)
# 5 V-verbruik (W). Gemiddeld: ESP-NOW 4 berichten per seconde, de radio luistert bijna altijd (ESP32-C3: RX 84 mA bij
# 3,3 V; de LDO op het bordje zit op 5 V, dus 5 V x stroom). Piek: zenden 802.11b, ESP32-C3 335 mA, ESP32-S3 340 mA
# (Espressif-datasheets, tabel 5-7), plus het scherm van de knop (AANNAME 0,1 A). De diode -R12 (1N5819) verliest 0,35 V.
P_5V = dict(knop_esp32s3_scherm=1.2, module_esp32c3=5 * 0.090, sdp810=0.02, diode=0.35 * 0.090)  # W, gemiddeld
I_5V_PIEK = dict(knop=0.34 + 0.10, module=0.335, sdp810=0.004)  # A, piek
BUCK_A = 1.0  # Pololu D24V10F5: 1 A uit (kortsluit- en overstroombeveiliging, thermische uitschakeling)
P_IN_BOX = P_5V['module_esp32c3'] + P_5V['sdp810'] + P_5V['diode']  # W: de knop zit in het blad, niet in de box
# boosttegoed in regel.h: 1 s boost kost boostHerstel s afkoelen, het tegoed begint na elke start op 0: hoogstens
# 1 / (1 + boostHerstel) van de tijd op 100 %, ook over herstarts heen
BOOST_DEEL = 1 / (1 + FW['boost_herstel'])


def firmware_factor(r, fw=None):
    """vervangfactor van de firmware bij stand r (lineair tussen de punten van regel.h, zoals factorBij())"""
    vf = (fw or FW)['volfactor']
    ks = sorted(vf)
    if r < ks[0] - 1e-9:
        return None
    for a, b in zip(ks, ks[1:]):
        if r <= b + 1e-9:
            return vf[a] + (vf[b] - vf[a]) * (r - a) / (b - a)
    return vf[ks[-1]]
ETA_BUCK = 0.85  # Pololu D24V10F5 bij 24 -> 5 V, 0,3 A
RHO_CU = 0.0175  # Ω mm²/m bij 20 °C
KABELS = [  # (naam, doorsnede mm², lengte enkel m, stroom A)
    # versie 7.2 gelijkgetrokken: in de box montagedraad 0,5 mm² van -Q2 en M naar -X9; de M8-kabel heeft 4 x 0,25 mm²
    # (binder 718-kabels, gangbare doorsnede; na te kijken op de gekochte kabel); de ventilator zelf heeft AWG 24 (0,2 mm²)
    ('montagedraad in de box, -Q2 en M naar -X9 (0,15 m)', 0.5, 0.15, FAN_A),
    ('M8-kabel -W2 box -> module (0,5 m), 24 V en massa', 0.25, 0.5, FAN_A),
    ('aders van de ventilator (AWG 24, ca. 0,3 m tot -X10)', 0.205, 0.3, FAN_A),
    ('adapter -> box (DC-snoer van de adapter)', 0.75, 1.5, FAN_A + 0.2),
    ('USB-C box -> knop, 5 V', 0.2, 1.0, 0.3),
]

# ---------------------------------------------------------------- warmte in de voedingsbox
BOX_A_WAND = 0.052  # m², bodem en zijwanden (de bovenkant zit tegen het blad)
H_WAND = (5.0, 10.0)  # W/m²K, AANNAME natuurlijke convectie + straling
A_IN, A_UIT, H_SCHOORSTEEN = 28.5e-4, 21 * 2.5e-3 * 12e-3, 0.012  # m², m²; bodemsleuven, 21 sleuven 2,5 x 12 achter (18 tot 30 mm onder het blad), hoogteverschil (m)
T_KAMER = 25.0  # °C
T_KAMER_MAX = 30.0  # °C, warmste salon waarvoor we rekenen (AANNAME)
T_PETG_MAX = 60.0  # °C lucht in de box: Prusament PETG HDT 68 °C bij 0,45 MPa (datablad), 8 K marge


def adapter_tmax(last):
    """Mean Well GST90A24 (datablad): 100 % last tot 40 °C, lineair naar 50 % bij 70 °C (horizontaal); onder 50 % tot 70 °C"""
    return 70.0 if last <= 0.5 else 40.0 + (1.0 - last) / 0.5 * 30.0


def box_dt(p, h):
    """ΔT van de lucht in de box: wandverlies h·A·ΔT plus schoorsteenstroom door in- en uitlaat"""
    lo, hi = 0.0, 80.0
    for _ in range(60):
        dt = (lo + hi) / 2
        a = 1 / math.sqrt(1 / A_IN ** 2 + 1 / A_UIT ** 2)  # in serie
        qv = 0.6 * a * math.sqrt(2 * 9.81 * H_SCHOORSTEEN * dt / (273 + T_KAMER))
        weg = h * BOX_A_WAND * dt + RHO * 1005 * qv * dt
        lo, hi = (dt, hi) if weg < p else (lo, dt)
    return lo


# ---------------------------------------------------------------- bevestiging
# arm = afstand schroefas -> resultante van het rubbercontact (maak-afzuiging.mjs: rubber van 9,5 tot 17 mm, knop 7,5 tot
# 13,5 mm); `zone` = binnen- en buitenrand van het rubber: de resultante ligt ergens daartussen, beide grenzen worden gerekend
KLAUW = dict(b=8.0, h=6.0, arm=13.25, zone=(9.5, 17.0), moer_s=8.0, dak=1.8, spoed=0.8, rubber=dict(t=4.0, b=8.0, l=7.5))
KNOPKLAUW = dict(b=6.0, h=5.0, arm=10.5, zone=(7.5, 13.5), moer_s=7.0, dak=1.6, spoed=0.7, rubber=dict(t=3.0, b=6.0, l=6.0))
SLAG = 0.5  # montage: tot het rubber het blad raakt, dan een halve slag (180°)
T_MAX_KLAUW = 40.0  # °C onder het blad (AANNAME); PETG verliest tot 40 °C ongeveer 10 % stijfheid en sterkte: factor 0,9
# Prusament PETG (technisch datablad, ISO 527-1, geprint): vloeigrens 47 MPa liggend, 30 MPa over de lagen (Z), E 1,5 GPa.
# Kruip: geen gepubliceerde waarde voor PETG (ook niet bij Eastman); AANNAME blijvende spanning = 1/5 van de vloeigrens.
# De klauw ligt plat (de arm buigt in de laag); het dak boven de moer schuift af over de lagen: 0,5 x 30 MPa.
PETG = dict(sigma=47.0, sigma_z=30.0, tau=0.5 * 30.0, kruip=47.0 / 5)  # MPa
K_SCHROEF = 0.2
# rubberkussen op de arm (maak-afzuiging.mjs, M.klauw.rubber): neopreen Shore A 40 ± 5, 4 mm, 7,5 x 8 mm.
# E uit de hardheid (Gent 1958): E = 0,0981 (56 + 7,62 S) / (0,1375 (254 - 2,54 S)) MPa; compressie met de vormfactor
# Sf = A / (omtrek x t): Ec = E (1 + 2 phi Sf²), phi = 0,85 bij Shore 40 (Gent/Lindley). Spoed M5: 0,8 mm per slag.
RUBBER = dict(shore=(35, 40, 45), t=4.0, b=8.0, l=7.5, phi=0.85)
E_PETG = 1500.0  # MPa, Prusament PETG (datablad)
SPOED_M5 = 0.8  # mm


def rubber_veer(shore, R=None):
    R = R or dict(t=RUBBER['t'], b=RUBBER['b'], l=RUBBER['l'])
    E = 0.0981 * (56 + 7.62336 * shore) / (0.137505 * (254 - 2.54 * shore))
    a, o = R['b'] * R['l'], 2 * (R['b'] + R['l'])
    sf = a / (o * R['t'])
    return E * (1 + 2 * RUBBER['phi'] * sf * sf) * a / R['t']  # N/mm


def klauw_slag(K, slagen=1.0, arm=None, warm=1.0):
    """kracht (N) per klauw na `slagen` slag voorbij het eerste contact: rubber en arm in serie, per hardheid (35/40/45),
    met de resultante van het contact op `arm` mm van de schroefas"""
    L = arm or K['arm']
    k_arm = warm * 3 * E_PETG * (K['b'] * K['h'] ** 3 / 12) / L ** 3
    return [slagen * K['spoed'] / (1 / rubber_veer(sh, K['rubber']) + 1 / k_arm) for sh in RUBBER['shore']]


def klauw(K, d, arm=None, warm=1.0):
    """F (N) waarbij de arm de kruipgrens haalt; σ = 6 F L / (b h²)"""
    L = arm or K['arm']
    f_kruip = warm * PETG['kruip'] * K['b'] * K['h'] ** 2 / (6 * L)
    f_dak = warm * PETG['tau'] * 6 * K['moer_s'] / math.sqrt(3) * K['dak']  # afschuiving van het dak rond de moer
    return f_kruip, f_dak, K_SCHROEF * f_kruip * d / 1000


def klauw_band(K):
    """kleinste marge kruipgrens / kracht over de contactzone (binnen- en buitenrand), Shore 35 tot 45, SLAG na contact,
    koud en warm (40 °C): (marge, kracht max, kruipgrens bij die arm)"""
    slechtst = None
    for arm in K['zone']:
        for warm in (1.0, 0.9):
            f = max(klauw_slag(K, SLAG, arm, warm))
            g = klauw(K, 5, arm, warm)[0]
            if slechtst is None or g / f < slechtst[0]:
                slechtst = (g / f, f, g)
    return slechtst



def sensor_dp(q, m=1.0, k=1.0):
    """wat de drukmeter ziet: rooster + filter (m x schoon); het meetpunt zit onder het filter"""
    v = q / 3600
    rooster = k * VERLIEZEN[0][1] * 0.5 * RHO * (v / VERLIEZEN[0][2]) ** 2
    return rooster + m * filter_dp(FILTERS['CU'])(q)


def plenum(hoogte=0.0125 + 0.003):
    """verdeelruimte onder het filter: hoogte, ringdoorsnede bij het oog, deel van het debiet dat er radiaal door moet en de
    bovengrens van het verlies (ζ = 0,5 op de ringsnelheid) bij 250 m³/h. Versie 7.2: steunrand 12,5 mm + de foamband (4 mm,
    hoogstens tot 3 mm ingedrukt) = 15,5 mm; versie 7.1: 3,5 + 3 = 6,5 mm"""
    ring = 2 * math.pi * 0.0665 * hoogte
    buiten = 1 - math.pi * 0.0635 ** 2 / A_FILTER
    v250 = buiten * 250 / 3600 / ring
    return hoogte, ring, buiten, v250, 0.5 * 0.5 * RHO * v250 ** 2


def scenarios():
    """(k luchtweg, verdeelruimte, verschuiving ventilatorcurve, toerental t.o.v. de stand): 3 x 2 x 3 x 2 = 36"""
    boven = plenum()[4]
    return [(k, e, d, t) for k in (RUIM[0], 1.0, RUIM[1]) for e in (0.0, boven) for d in (-FAN_ONZEKER, 0.0, FAN_ONZEKER)
            for t in (1.0 - FW['volgmarge'], 1.0)]


def vervangfactor(r, k, extra=0.0, d=0.0, t=1.0):
    """bij welke verhouding sensordruk/schoon zakt het debiet op stand r tot het minimum voor de vangst?
    extra = verlies van de verdeelruimte bij 250 m³/h (kwadratisch; stroomafwaarts van het meetpunt); d = verschuiving
    van de ventilatorcurve; t = werkelijk toerental / stand (de bewaking laat tot volgMarge te laag toe). De schone
    referentie is op het juiste toerental gemeten (ijking), de grens op het lagere: zo is de grens het ongunstigst."""
    s, qmin = filter_dp(FILTERS['CU']), q_voor_vang()
    pl = lambda q: extra * (q / 250) ** 2
    q0 = werkpunt(lambda q: s(q) + pl(q), r, k, d)
    if werkpunt(lambda q: s(q) + pl(q), r * t, k, d) < qmin:
        return q0, None
    lo, hi = 1.0, 50.0
    for _ in range(60):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if werkpunt(lambda q: m * s(q) + pl(q), r * t, k, d) > qmin else (lo, m)
    return q0, sensor_dp(qmin, lo, k) / sensor_dp(q0, 1.0, k)


def debiet_bij_melding(r, f, k, extra=0.0, d=0.0, t=1.0):
    """het debiet op het moment dat de firmware "filter vervangen" meldt (sensorverhouding f), in één scenario"""
    s = filter_dp(FILTERS['CU'])
    pl = lambda q: extra * (q / 250) ** 2
    ref = sensor_dp(werkpunt(lambda q: s(q) + pl(q), r, k, d), 1.0, k)
    lo, hi = 1.0, 50.0
    for _ in range(60):
        m = (lo + hi) / 2
        q = werkpunt(lambda q: m * s(q) + pl(q), r * t, k, d)
        lo, hi = (m, hi) if sensor_dp(q, m, k) / ref < f else (lo, m)
    return werkpunt(lambda q: lo * s(q) + pl(q), r * t, k, d)


def controle(fw):
    """fouten van de firmwaregrenzen tegen het model (leeg = goed). Regel: de melding komt met 10 % marge op de reserve,
    f_firmware <= 1 + 0,9 (g - 1), in elk van de 36 scenario's; elke stand vanaf beschermVanaf haalt het minimum schoon"""
    fout = []
    for r in STANDEN:
        if r < fw['bescherm'] - 1e-9:
            continue
        g = [vervangfactor(r, k, e, d, t)[1] for k, e, d, t in scenarios()]
        f = firmware_factor(r, fw)
        if f is None or any(x is None for x in g) or f > 1 + 0.9 * (min(g) - 1) + 1e-9:
            fout.append(r)
    return fout


STANDEN = (0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0)


def melding_m(r, f, k=1.0, extra=0.0, d=0.0, t=1.0):
    """vervuilingsfactor m van het filter (dp vol / dp schoon bij hetzelfde debiet) op het moment van de melding"""
    s = filter_dp(FILTERS['CU'])
    pl = lambda q: extra * (q / 250) ** 2
    ref = sensor_dp(werkpunt(lambda q: s(q) + pl(q), r, k, d), 1.0, k)
    lo, hi = 1.0, 50.0
    for _ in range(60):
        m = (lo + hi) / 2
        q = werkpunt(lambda q: m * s(q) + pl(q), r * t, k, d)
        lo, hi = (m, hi) if sensor_dp(q, m, k) / ref < f else (lo, m)
    return lo


def vervangen_en_geluid():
    sc, qmin = scenarios(), q_voor_vang()
    L = ['### 3b. Onderhoudseindpunt: de melding "filter vervangen" per stand', '',
         '**Het eindpunt is de melding van de firmware**, niet de einddruk van de fabrikant (300 Pa): het filter gaat eruit '
         f'zodra de knop "filter vervangen" toont. Tot dat moment moet elke beschermende stand het minimum ({f0(qmin)} m³/h) '
         'halen. De drukmeter ziet rooster + filter. Per stand 36 scenario\'s: luchtweg 0,7x / 1x / 1,5x, verdeelruimte zonder '
         f'en met de bovengrens (3c), ventilatorcurve −{f0(FAN_ONZEKER)} / 0 / +{f0(FAN_ONZEKER)} Pa (afleesonzekerheid) en een '
         f'toerental tot {f0(FW["volgmarge"] * 100)} % te laag (meer laat de bewaking niet toe: daarboven meldt ze "toerental"). '
         'De firmware meldt met 10 % marge op de reserve: f ≤ 1 + 0,9 (g − 1), met g de ongunstigste grens. f komt '
         'rechtstreeks uit `regel.h` (vervangStand, vervangFactor, beschermVanaf).', '',
         rij('stand (toerental)', 'schoon debiet (m³/h)', 'grens g (x schone sensordruk)', 'firmware f (regel.h)',
             'debiet bij de melding, ongunstigst (m³/h)', 'oordeel'),
         rij('---:', '---:', '---:', '---:', '---:', '---')]
    for r in STANDEN:
        res = [vervangfactor(r, k, e, d, t) for k, e, d, t in sc]
        q0s = f'{f0(min(q for q, _ in res))}–{f0(max(q for q, _ in res))}'
        grens = [g for _, g in res]
        fw = firmware_factor(r)
        gtxt = '— (haalt het minimum niet)' if any(g is None for g in grens) else f2(min(grens))
        if r < FW['bescherm'] - 1e-9:
            L.append(rij(f'{r * 100:.0f} %', q0s, gtxt, 'lage stand', '—', '"lage stand": geen bescherming beloofd, geen filteroordeel'))
            continue
        qm = min(debiet_bij_melding(r, fw, k, e, d, t) for k, e, d, t in sc)
        ok = qm >= qmin - 0.5 and fw <= 1 + 0.9 * (min(grens) - 1) + 1e-9
        L.append(rij(f'{r * 100:.0f} %' + (' (boost)' if r == 1 else ''), q0s, gtxt, f2(fw), f0(qm),
                     'melding op tijd' if ok else '**TE LAAT**'))
    fout = controle(FW)
    assert not fout, f'vervangfactoren of beschermVanaf in regel.h kloppen niet met het model: {fout}'
    # mutatieproef: een kopie van regel.h met factoren 9/9/9 moet afgekeurd worden
    mut = re.sub(r'(vervangFactor\[3\]\s*=\s*)\{[^}]*\}', r'\g<1>{9.0f, 9.0f, 9.0f}', REGEL_H.read_text(encoding='utf-8'))
    assert controle(lees_regel(mut)), 'mutatieproef: factoren 9/9/9 in regel.h worden niet afgekeurd'
    L += ['', f'Onder {f0(FW["bescherm"] * 100)} % meldt de firmware "lage stand" (geen bescherming beloofd). '
          f'**{f0(FW["bescherm"] * 100)} % is de laagste beschermende stand** (versie 7.1: 80 %; de opener plaat en de grotere verdeelruimte maken het verschil). '
          f'**Dagstand: {f0(FW["bescherm"] * 100)} tot 80 %**: op {f0(FW["bescherm"] * 100)} % is het {f1(-50 * math.log10(FW["bescherm"] / 0.8))} dB stiller, op 80 % gaat een filter langer mee. '
          f'{f0(FW["bescherm"] * 100 - 5)} % haalt het minimum schoon nog wel, maar met de volle band blijft er geen reserve met marge over (g dicht bij 1).', '',
          '**Koppeling met de firmware:** dit script leest `regel.h` zelf en stopt (exit ≠ 0) als een waarde daar niet meer '
          'klopt. Telkens het draait, keurt het ook een kopie van `regel.h` met de factoren 9/9/9 (mutatieproef): die moet '
          'afgekeurd worden, anders stopt het eveneens.', '']
    L += ['**Hoe lang gaat een filter mee?** Bij de melding mag de drukval van het filter stijgen tot (gewoon scenario):', '',
          rij('stand', 'filter schoon (Pa)', 'filter bij de melding (Pa)', 'stijging (Pa)', f'deel van de stijging tot {f0(FILTERS["CU"]["eind"])} Pa (fabrikant)'),
          rij('---:', '---:', '---:', '---:', '---:')]
    s = filter_dp(FILTERS['CU'])
    eind = FILTERS['CU']['eind']
    for r in (FW['bescherm'], 0.8, 0.9, 1.0):
        q0 = werkpunt(s, r)
        m = melding_m(r, firmware_factor(r))
        qm = werkpunt(lambda q: m * s(q), r)
        a, b = s(q0), m * s(qm)
        L.append(rij(f'{r * 100:.0f} %', f0(a), f0(b), f0(b - a), f'{f0(100 * (b - a) / (eind - a))} %'))
    L += ['', f'Wie op {f0(FW["bescherm"] * 100)} % werkt, vervangt het filter dus vroeg (een klein deel van zijn stofcapaciteit); op 90 % gaat hetzelfde '
          'filter een paar keer zo lang mee, maar is het luider (2,5 dB tegenover 80 %). Een filter kost ongeveer € 7; de knop toont de '
          'drukreserve, zodat je ziet wanneer het zover is. Versie 7.2: de melding komt pas als de druk 5 minuten lang boven de grens '
          'bleef (het minimum over het venster, 3e), en blijft dan staan tot een nieuw filter geijkt is.', '']
    hoogte, ring, buiten, v250, boven = plenum()
    met = lambda q: s(q) + boven * (q / 250) ** 2
    L += ['### 3c. Verdeelruimte tussen filter en instroomplaat', '',
          f'Tussen de onderkant van het filter en de instroomplaat zit {f1(hoogte * 1000)} mm (steunrand 12,5 mm plus de foamband, '
          f'hoogstens tot 3 mm ingedrukt; versie 7.1: 6,5 mm en {f1(plenum(0.0065)[3])} m/s). Als het filter overal even veel lucht doorlaat, moet {f0(buiten * 100)} % van het debiet radiaal naar het oog (Ø127): door '
          f'een ring van {f0(ring * 1e6)} mm² is dat bij 250 m³/h {f1(v250)} m/s. In werkelijkheid gaat meer lucht door het midden '
          'van het filter (boven het oog), waar de weg het kortst is: het filter wordt niet gelijk benut, en de dynamische druk in de '
          'ring is **geen** verlies dat zomaar bij de rest opgeteld mag worden. Daarom twee scenario\'s (geen bewezen grenzen): '
          f'verwaarloosbaar (gelijke benutting) en ζ = 0,5 op de ringsnelheid ({f0(boven)} Pa bij 250 m³/h, kwadratisch met het debiet). '
          'Beide zitten in de 36 scenario\'s van 3b.', '',
          rij('stand', 'debiet zonder (m³/h)', 'debiet met ζ = 0,5 (m³/h)', 'v op 10 cm met ζ = 0,5 (m/s)', 'boven het minimum?'),
          rij('---:', '---:', '---:', '---:', '---')]
    for r in (0.6, 0.7, 0.75, 0.8, 1.0):
        q0, q1 = werkpunt(s, r), werkpunt(met, r)
        L.append(rij(f'{r * 100:.0f} %', f0(q0), f0(q1), f2(v_vang(q1)), 'ja' if q1 >= qmin else '**nee**'))
    L += ['', 'Het filter is een geschat filter (geen fabrikantcurve): 115 Pa bij 250 m³/h op het hele front (bovengrens van '
          'de literatuurband 55 tot 115 Pa). Ligt de echte weerstand lager, dan is er meer reserve; poort L1 meet het (Q–Δp '
          'bij elke stand, schoon en bij de melding).', '']
    # geluid
    G_BUDGET = 1.5  # dB: rooster, kast en galm bovenop de vrije puntbron (projectkeuze; poort G1 meet het)
    L += ['### 3d. Geluid bij het dagwerkpunt', '',
          'Werkpunt: de medewerker zit tegenover de klant, het oor op ± 0,5 m van het rooster. Model: vrije puntbron '
          f'(69 dB(A) op 1 m bij vol toerental, ΔL = 50 log10 n), plus een budget van {f1(G_BUDGET)} dB voor rooster, kast en galm.', '',
          rij('stand', 'debiet (m³/h)', 'dB(A) op 1 m', 'dB(A) op 0,5 m (model)', f'op 0,5 m met budget'), rij('---:', '---:', '---:', '---:', '---:')]
    for r in (FW['bescherm'], 0.8, 0.9, 1.0):
        L.append(rij(f'{r * 100:.0f} %' + (' (boost)' if r == 1 else ''), f0(werkpunt(s, r)), f1(db(r)), f1(db(r, 0.5)), f1(db(r, 0.5) + G_BUDGET)))
    DOEL = 72.0
    assert db(FW['dagmax'], 0.5) + G_BUDGET <= DOEL, 'dagstand luider dan het comfortdoel'
    L += ['', f'**Comfortdoel (projectkeuze, geen norm):** dagstand {f0(FW["dagmax"] * 100)} %: ≤ {f0(DOEL)} dB(A) op de oorpositie, '
          f'budget inbegrepen (model {f1(db(FW["dagmax"], 0.5))} + {f1(G_BUDGET)} = {f1(db(FW["dagmax"], 0.5) + G_BUDGET)}); boost kort luider. '
          'Dit is geen verbetering van het geluid: het vroegere doel van 55 dB(A) is met deze ventilator op een beschermende '
          'stand niet haalbaar en is vervangen door dit doel. Gehoorgrenzen voor werknemers (vanaf 80 dB(A) over 8 uur) '
          f'liggen hoger; het doel gaat over comfort. Op de nieuwe laagste beschermende stand ({f0(FW["bescherm"] * 100)} %) is het model '
          f'{f1(db(FW["bescherm"], 0.5) + G_BUDGET)} dB(A) met budget. Poort G1 meet het, eerst op de proefopstelling (meetplan, stap 0).', '']
    # rubberbuffers: eigenfrequentie
    k_buf, m_fan = 4 * 80e3, 0.75  # N/m (Halder EH 25150.0008: ca. 80 N/mm per buffer), kg (datasheet San Ace C175: 750 g)
    fn = math.sqrt(k_buf / m_fan) / (2 * math.pi)
    f80, f100 = 0.8 * 3900 / 60, 3900 / 60
    L += ['**Ontkoppeling (versie 7.2).** De ventilator staat niet meer star op de bodem maar op 4 rubberbuffers Ø15 x 10 (NR 55 '
          f'Shore A, ca. 80 N/mm per buffer volgens Halder). Met 750 g (datasheet) is de eigenfrequentie ongeveer {f0(fn)} Hz. Trillingen '
          f'boven √2 x {f0(fn)} = {f0(math.sqrt(2) * fn)} Hz (de schoepfrequentie en de tonen van de motor, enkele honderden Hz) worden '
          'gedempt: die gaan niet meer star in de kuip, de romp en het blad (het blad werkt anders als klankbord). De draaifrequentie '
          f'zelf ({f0(f80)} Hz op 80 %, {f0(f100)} Hz op 100 %) ligt onder de eigenfrequentie en wordt niet gedempt (ongeveer x '
          f'{f2(1 / (1 - (f100 / fn) ** 2))} bij 100 %); bij een goed gebalanceerde waaier is die klein. Zachtere buffers (Ø15 x 15, 40 Shore) '
          'zouden ook die dempen: na te gaan als G1 een brom laat horen. Hoeveel dB(A) de ontkoppeling scheelt, rekenen we niet: G1 meet '
          'met en zonder buffers (vier M4-schroeven direct).', '',
          '**Geluidsdemping in de uitblaas (punt e van het advies):** in de ronde kuip is tussen de waaier en de wand 4 mm: daar past '
          'geen akoestisch schuim zonder de luchtweg te vernauwen, en een labyrint kost diepte. Niet gedaan. Wat wel helpt zonder '
          'diepte: de lamellen blazen opzij en naar onder, weg van het oor, onder het blad (dat de rechte weg naar het oor afschermt). '
          'Blijkt G1 te luid: een uitblaaskap met schuim onder de kuip (ca. 30 mm dieper) is de volgende stap.', '']
    return L

# ---------------------------------------------------------------- vingerrooster: rasterberekening (balkrooster)
def vingerrooster_fe(ringen=None, F=10.0, E=1200.0, nu=0.4, stap=2.0):
    """balkrooster (grillage) van het vingerrooster in het oog: ribben langs Z, de dwarsrib langs X en de ringen als
    korte rechte stukjes. Per knoop doorbuiging w en twee hoeken; buiging EI en wringing GJ per element. De uiteinden
    van de ribben op de rand van het oog zijn scharnieren (w = 0, hoeken vrij: ongunstiger dan ingeklemd). De last F
    staat om de beurt op elke knoop (om de ~2 mm); uitkomst: de grootste doorbuiging onder de last (mm).
    E = 1200 MPa: Prusament PETG 1500 MPa, -20 % voor warmte (40 °C) en printrichting (AANNAME)."""
    import numpy as np
    V = VINGER
    ringen = V['ringen'] if ringen is None else ringen
    R, b = V['r'], V['rib']
    G = E / (2 * (1 + nu))
    def sectie(h):
        bb, hh = min(b, h), max(b, h)
        beta = 1 / 3 - 0.21 * bb / hh * (1 - (bb / hh) ** 4 / 12)
        return E * b * h ** 3 / 12, G * beta * hh * bb ** 3
    knopen, idx = [], {}
    def knoop(x, z):
        key = (round(x, 2), round(z, 2))
        if key not in idx:
            idx[key] = len(knopen)
            knopen.append(key)
        return idx[key]
    elementen = []
    def lijn(punten, h):
        """punten langs een lijn (gesorteerd), onderverdeeld tot ~stap mm"""
        ei, gj = sectie(h)
        for (x0, z0), (x1, z1) in zip(punten, punten[1:]):
            L = math.hypot(x1 - x0, z1 - z0)
            n = max(1, int(math.ceil(L / stap)))
            prev = knoop(x0, z0)
            for i in range(1, n + 1):
                cur = knoop(x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n)
                elementen.append((prev, cur, ei, gj))
                prev = cur
    rand = set()
    # ribben langs Z op x = ±xs: kruisingen met de dwarsrib (z = 0) en de ringen
    for xr in V['xs']:
        for x in (xr, -xr):
            zr = math.sqrt(R * R - x * x)
            zs = {-zr, zr, 0.0}
            for rg in ringen:
                if rg > abs(x):
                    zz = math.sqrt(rg * rg - x * x)
                    zs |= {zz, -zz}
            zs = sorted(zs)
            lijn([(x, z) for z in zs], V['h'])
            rand |= {knoop(x, -zr), knoop(x, zr)}
    xs = sorted({-R, R, *[s * xr for xr in V['xs'] for s in (1, -1)], *[s * rg for rg in ringen for s in (1, -1)]})
    lijn([(x, 0.0) for x in xs], V['h'] - 0.1)
    rand |= {knoop(-R, 0.0), knoop(R, 0.0)}
    for rg in ringen:
        hoeken = set()
        for xr in V['xs']:
            for x in (xr, -xr):
                if rg > abs(x):
                    a = math.atan2(math.sqrt(rg * rg - x * x), x)
                    hoeken |= {a % (2 * math.pi), (-a) % (2 * math.pi)}
        hoeken |= {0.0, math.pi}
        hoeken = sorted(hoeken)
        pts = [(rg * math.cos(a), rg * math.sin(a)) for a in hoeken] + [(rg, 0.0)]
        # elk stuk tussen twee kruisingen als boog uit korte rechte stukjes
        ei, gj = sectie(V['h'] - 0.2)
        for a0, a1 in zip(hoeken, hoeken[1:] + [hoeken[0] + 2 * math.pi]):
            n = max(1, int(math.ceil(rg * (a1 - a0) / stap)))
            prev = knoop(rg * math.cos(a0), rg * math.sin(a0))
            for i in range(1, n + 1):
                a = a0 + (a1 - a0) * i / n
                cur = knoop(rg * math.cos(a), rg * math.sin(a))
                elementen.append((prev, cur, ei, gj))
                prev = cur
    n = len(knopen)
    K = np.zeros((3 * n, 3 * n))
    for i, j, ei, gj in elementen:
        (x0, z0), (x1, z1) = knopen[i], knopen[j]
        L = math.hypot(x1 - x0, z1 - z0)
        if L < 1e-6:
            continue
        ex, ez = (x1 - x0) / L, (z1 - z0) / L
        # lokale vrijheidsgraden (w, helling, wringhoek) uit de globale (w, ωx, ωz): helling = ωz ex − ωx ez, wring = ωx ex + ωz ez
        T = np.zeros((6, 6))
        for k in (0, 3):
            T[k, k] = 1
            T[k + 1, k + 1], T[k + 1, k + 2] = -ez, ex
            T[k + 2, k + 1], T[k + 2, k + 2] = ex, ez
        kb = ei / L ** 3 * np.array([[12, 6 * L, -12, 6 * L], [6 * L, 4 * L * L, -6 * L, 2 * L * L],
                                       [-12, -6 * L, 12, -6 * L], [6 * L, 2 * L * L, -6 * L, 4 * L * L]])
        kl = np.zeros((6, 6))
        bi = [0, 1, 3, 4]
        for a in range(4):
            for c in range(4):
                kl[bi[a], bi[c]] = kb[a, c]
        kt = gj / L
        kl[2, 2] += kt; kl[5, 5] += kt; kl[2, 5] -= kt; kl[5, 2] -= kt
        kg = T.T @ kl @ T
        dofs = [3 * i, 3 * i + 1, 3 * i + 2, 3 * j, 3 * j + 1, 3 * j + 2]
        K[np.ix_(dofs, dofs)] += kg
    vrij = [d for d in range(3 * n) if not (d % 3 == 0 and d // 3 in rand)]
    Kf = K[np.ix_(vrij, vrij)]
    lasten = [d for d in vrij if d % 3 == 0]
    pos = {d: k for k, d in enumerate(vrij)}
    B = np.zeros((len(vrij), len(lasten)))
    for c, d in enumerate(lasten):
        B[pos[d], c] = F
    W = np.linalg.solve(Kf, B)
    w = [W[pos[d], c] for c, d in enumerate(lasten)]
    k = int(np.argmax(w))
    return max(w), knopen[lasten[k] // 3], n, len(elementen)


# ---------------------------------------------------------------- 7.2: scenario's voor de filtermelding en de veiligheid
def sensor_dp_x(q, m=1.0, k=1.0, dicht=0.0, rho=RHO):
    """wat de drukmeter ziet met een (deels) afgedekt rooster en een andere luchtdichtheid; het filter is laminair (Δp ~ v,
    hangt van de viscositeit af, niet van de dichtheid), het rooster kwadratisch (~ rho)"""
    v = q / 3600
    f = F_ROOSTER * (1 - dicht)
    rooster = k * zeta_plaat(f) * 0.5 * rho * (v / A_OPENING) ** 2
    return rooster + m * filter_dp(FILTERS['CU'])(q)


def werkpunt_x(dpf, r=1.0, k=1.0, dicht=0.0, rho=RHO):
    """werkpunt met een afgedekt rooster (dicht) en luchtdichtheid rho; de ventilator geeft p ~ rho"""
    lo, hi = 0.0, FAN[-1][0] * r
    for _ in range(60):
        m = (lo + hi) / 2
        if fan_p(m, r) * rho / RHO > dpf(m) + dp_rest(m, k, dicht, rho):
            lo = m
        else:
            hi = m
    return lo


def zonder_filter_verhouding(r, k=1.0):
    """sensordruk zonder filter (de luchtweg is dan lichter: meer debiet) gedeeld door de schone sensordruk, op stand r"""
    s = filter_dp(FILTERS['CU'])
    q0 = werkpunt(s, r, k)
    q1 = werkpunt(lambda q: 0.0, r, k)
    return sensor_dp(q1, 0.0, k) / sensor_dp(q0, 1.0, k)


# ---------------------------------------------------------------- 7.2: tafelblad LAGKAPTEN (sandwich) met de uitsparingen
# IKEA LAGKAPTEN 140 x 60: 34 mm, hardboard, spaanplaat (rand), papieren honingraat (ikea.com, 2026); max. 50 kg verdeeld,
# 15 kg geconcentreerd. Huiden en kern: niet opgegeven -> AANNAME 3 mm vezelplaat (na te meten bij de eerste uitsparing).
BLAD = dict(L=0.680, t=0.003, h=0.034, b=0.600, E=(2500e6, 4000e6), G=(2e6, 6e6))  # m, Pa; E vezelplaat, G papieren kern: AANNAME
GAT = dict(boven=0.212, onder=0.212 + 0.102 + 0.038)  # m weggenomen breedte in de doorsnede x = 0 en x = -0,06 (sleuf 29 x 7)


def doorbuiging(P, E, G, b_boven, b_onder):
    """middenlast P (N) op een vrij opgelegde sandwichbalk (de opening tussen de twee ALEX-kasten, 680 mm), ongunstig: de
    kleinste doorsnede (met de uitsparingen) over de hele lengte. Buiging (huiden) + afschuiving (kern). Geeft mm en MPa."""
    t, d, L = BLAD['t'], BLAD['h'] - BLAD['t'], BLAD['L']
    A1, A2 = b_boven * t, b_onder * t
    EI = E * A1 * A2 / (A1 + A2) * d * d
    wb = P * L ** 3 / (48 * EI)
    ws = P * L / (4 * G * min(b_boven, b_onder) * d)
    sigma = P * L / 4 / (min(A1, A2) * d)
    return wb * 1000, ws * 1000, sigma / 1e6


# ---------------------------------------------------------------- uitvoer
def rij(*c):
    return '| ' + ' | '.join(str(x) for x in c) + ' |'


def f0(x):
    return f'{x:.0f}'


def f1(x):
    return f'{x:.1f}'.replace('.', ',')


def f2(x):
    return f'{x:.2f}'.replace('.', ',')


def maak():
    L = ['# Afzuiging: rekenblad', '',
         'Gemaakt door `docs/berekeningen.py` (niet met de hand aanpassen). Invoer en bronnen staan bovenaan dat script.',
         'Het is een ontwerpberekening: de metingen in `Vrijgave-en-meetplan.md` beslissen.', '']

    L += ['## 1. Doel: hoeveel lucht', '',
          f'Vangst bij de bron: {f1(V_VANG)} m/s op {X_HAND * 100:.0f} cm boven het rooster (Dalla Valle, opening met flens: '
          f'v = Q / (0,75 (10x² + A)), A = {A_OPENING * 1e4:.0f} cm²).', '',
          rij('debiet (m³/h)', 'v op 5 cm', 'v op 10 cm', 'v op 15 cm'), rij('---:', '---:', '---:', '---:')]
    for q in (150, 200, 250, 300, 400):
        L.append(rij(q, f2(v_vang(q, 0.05)), f2(v_vang(q, 0.10)), f2(v_vang(q, 0.15))))
    qmin = q_voor_vang()
    L += ['', f'**Minimum: {f0(qmin)} m³/h** (0,5 m/s op 10 cm), op elke beschermende stand tot de melding "filter vervangen" (het onderhoudseindpunt, 3b). **Ontwerpdebiet: 250 m³/h** met een '
          'schoon filter (0,66 m/s op 10 cm). Meer debiet geeft vooral meer geluid; 500 m³/h is geen doel meer.', '',
          f'**Werkhoogte (versie 7.2, eerlijk vastgelegd): 10 cm boven het rooster.** Daar is de vangst ontworpen en bewaakt. '
          f'Op 15 cm haalt alleen boost 0,5 m/s, en dan alleen met een schoon filter (tabel in hoofdstuk 3: {f2(v_vang(werkpunt(filter_dp(FILTERS["CU"]), 1.0), 0.15))} m/s); '
          f'op de dagstand is het op 15 cm ongeveer {f2(v_vang(werkpunt(filter_dp(FILTERS["CU"]), 0.8), 0.15))} m/s. Wie hoger boven het rooster werkt, vangt dus minder: '
          'leg de hand van de klant op het blad of op de rand van de plaat, met de nagel laag boven het rooster.', '']

    L += ['## 2. Weerstand van de luchtweg zonder filter', '',
          rij('onderdeel', 'ζ', 'oppervlak (cm²)', 'Δp bij 250 m³/h (Pa)'), rij('---', '---:', '---:', '---:')]
    for n, z, a in VERLIEZEN:
        v = 250 / 3600 / a
        L.append(rij(n, f2(z), f0(a * 1e4), f0(z * 0.5 * RHO * v * v)))
    L += [rij('**samen**', '', '', f'**{f0(dp_rest(250))}** ({f0(dp_rest(250, RUIM[0]))} tot {f0(dp_rest(250, RUIM[1]))})'), '',
          'ζ van de platen volgens Idelchik (dunne geperforeerde plaat); de instroom en de lamellen zijn schattingen. '
          'Daarom staat overal een band van 0,7x tot 1,5x.', '',
          f'**Versie 7.2 tegenover 7.1:** het rooster is opener (sleuven 5 mm, stegen 2 mm; laserrapport: {f1(LASER["open_boven_filter_cm2"])} cm² boven het '
          f'filter en {f1(LASER["open_cm2"] - LASER["open_boven_filter_cm2"])} cm² ernaast, die voor de helft meetellen omdat de plaat nu 3 tot 5 mm boven de plooien ligt): '
          f'werkzame open fractie {f2(F_ROOSTER)} (was {f2(A_ROOSTER_71 / A_OPENING)}), verlies bij 250 m³/h {f0(zeta_plaat(F_ROOSTER) * 0.5 * RHO * (250 / 3600 / A_OPENING) ** 2)} Pa '
          f'(was {f0(zeta_plaat(A_ROOSTER_71 / A_OPENING) * 0.5 * RHO * (250 / 3600 / A_OPENING) ** 2)}). Het vingerrooster is dichter (spleten 5,6 mm voor EN ISO 13857, 6b) en '
          f'de uitblaas van de ronde kuip heeft {f0(A_LAMELLEN * 1e4)} cm² vrije doorgang ({f0(A_KUIP_LAMELLEN * 1e4)} cm² lamellen opzij, {f0(A_KUIP_RINGEN * 1e4)} cm² ringsleuven in de bodem; '
          f'de vlakke bodemplaat had {f0(A_LAMELLEN_71 * 1e4)} cm²): samen kosten die twee wat de opener plaat wint. De grote winst zit in de verdeelruimte (3c).', '']

    L += ['## 3. Werkpunt per filter', '',
          'Snijpunt van de ventilatorcurve (100 % en lager toerental, Q ~ n, p ~ n²) met filter plus luchtweg. '
          '"Vol" = de einddrukval van de fabrikant (of 2x schoon als die ontbreekt), alleen ter vergelijking: het gekozen filter wordt eerder vervangen (3b).', '',
          rij('filter', 'Δp filter bij 250 (Pa)', 'max. debiet schoon', 'max. debiet vol', 'toerental voor 250 schoon',
              f'toerental voor {f0(qmin)} vol', 'dB(A) op 1 m / 0,5 m bij 250'),
          rij('---', '---:', '---:', '---:', '---:', '---:', '---:')]
    for k, f in FILTERS.items():
        s, b = filter_dp(f), filter_dp(f, True)
        if k == 'H13':
            L.append(rij(f['naam'], f0(s(250)), f0(werkpunt(s)), f0(werkpunt(b)), '—', '—', '—'))
            continue
        qs = [werkpunt(s, 1, k2) for k2 in RUIM]
        qb = [werkpunt(b, 1, k2) for k2 in RUIM]
        rs = [r_voor(250, s, k2) for k2 in RUIM]
        rb = [r_voor(qmin, b, k2) for k2 in RUIM]
        pct = lambda r: '—' if r is None else f'{r * 100:.0f} %'
        geluid = '—' if rs[1] is None else f'{f0(db(rs[0]))}–{f0(db(rs[1]))} / {f0(db(rs[0], 0.5))}–{f0(db(rs[1], 0.5))}'
        L.append(rij(f['naam'], f0(s(250)), f'{f0(qs[1])}–{f0(qs[0])}', f'{f0(qb[1])}–{f0(qb[0])}',
                     f'{pct(rs[0])}–{pct(rs[1])}', f'{pct(rb[0])}–{pct(rb[1])}', geluid))
    g = filter_dp(FILTERS['CU'])
    L += ['', '**Met het gekozen filter (schoon), per stand:** debiet en luchtsnelheid boven het midden van het rooster.', '',
          rij('toerental', 'debiet (m³/h)', 'op 10 cm', 'op 15 cm', 'op 20 cm', 'dB(A) op 1 m'),
          rij('---:', '---:', '---:', '---:', '---:', '---:')]
    for r in (0.4, 0.6, 0.7, 0.75, 0.8, 1.0):
        q = werkpunt(g, r)
        L.append(rij(f'{r * 100:.0f} %' + (' (boost)' if r == 1 else ''), f0(q), f2(v_vang(q, 0.10)), f2(v_vang(q, 0.15)), f2(v_vang(q, 0.20)), f0(db(r))))
    L += ['', '20 cm boven het rooster haalt geen enkele stand 0,5 m/s: dat vraagt ongeveer 600 m³/h, meer dan deze '
          'ventilator met rooster en filter levert.']
    L += ['', 'De stand is een fractie van het volle **toerental**: de firmware regelt het toerental (ijktabel PWM -> '
          'toerental plus bijregeling op de tacho, regel.h). Debiet, geluid en warmte in dit rekenblad gebruiken dezelfde '
          'grootheid. Het geluid volgt ΔL = 50 log10(n/n_vol) en een vrije puntbron; roosterfluit, kastresonantie en galm '
          'komen erbij (meten: poort G1).', '']
    L += vervangen_en_geluid()

    # ---- 3e filtermelding: hand op het rooster, luchtdichtheid, toerentalband
    s = filter_dp(FILTERS['CU'])
    r0 = 0.8
    f80 = firmware_factor(r0)
    q0 = werkpunt(s, r0)
    ref = sensor_dp(q0)
    L += ['### 3e. Valse meldingen "filter vervangen" (versie 7.2)', '',
          f'Op 80 % meldt de firmware bij {f2(f80)} x de schone sensordruk. Wat verschuift die verhouding zonder dat het filter voller is? '
          'Per geval de verhouding sensordruk / schoon met een schoon filter:', '',
          rij('geval', 'debiet (m³/h)', 'sensordruk / schoon', 'zonder venster', 'met het minimum over 5 min'), rij('---', '---:', '---:', '---', '---')]
    gevallen = [('schoon, gewone lucht', 0.0, RHO, 1.0), ('luchtdichtheid +5 % (koud, hoge luchtdruk)', 0.0, RHO * 1.05, 1.0),
                ('toerental 3 % te hoog (rand van de bewaking)', 0.0, RHO, 1.03), ('beide samen', 0.0, RHO * 1.05, 1.03)]
    gevallen += [(f'hand op het rooster: {f0(d * 100)} % van de gaten dicht', d, RHO, 1.0) for d in (0.25, 0.5, 0.75)]
    for naam, d, rho, rr in gevallen:
        q = werkpunt_x(s, r0 * rr, 1.0, d, rho)
        v = sensor_dp_x(q, 1.0, 1.0, d, rho) / ref
        vals = v >= f80
        venster = 'ook geen melding' if not vals else ('geen melding als de hand niet 5 min onafgebroken ligt' if d else '**zou melden**')
        L.append(rij(naam, f0(q), f2(v), '**valse melding**' if vals else 'geen melding', venster))
        if not d:
            assert v < f80, f'{naam}: valse melding zonder hand'
    L += ['', 'Een hand op het rooster doet de druk onder het filter stijgen (meer onderdruk), net als een vol filter. Daarom beslist '
          'de firmware sinds 7.2 op het **minimum over 5 minuten** werktijd op een te bewaken stand (10 emmers van 30 s): een hand, '
          'een arm of een handdoek die even op het rooster ligt, telt niet. Pas als de druk 5 minuten aan een stuk boven de grens blijft, '
          'komt de melding, en dan blijft ze staan (hysterese, ook na een herstart) tot een nieuw filter geijkt is. Luchtdichtheid en '
          'toerentalband samen blijven onder de grens (tabel; zo getest in test_regel).', '',
          '**Ander merk filter:** een filter van een ander merk kan 15 tot 30 % meer weerstand hebben (de literatuurband is 55 tot 115 Pa). '
          'Vroeger weigerde de box dan de ijking en was de enige uitweg de koppelhandeling op de box. Sinds 7.2 is "ander merk filter" '
          'een eigen handeling op de knop (op "Nieuw filter?" 3 s vasthouden): de eerste ijking vervalt en de nieuwe wordt de referentie. '
          'Een ijking onder 0,70 x de eerste wordt geweigerd (geijkt zonder filter of met een kier).', '']
    # ---- 3f filter ontbreekt: stoppen op elke stand
    L += ['### 3f. Filter ontbreekt of geen luchtstroom: stoppen (versie 7.2)', '',
          f'Zonder filter is de luchtweg lichter: meer debiet, maar de sensor ziet alleen nog het rooster. De verhouding sensordruk / '
          f'schoon (bij hetzelfde toerental) per stand, over de band van de luchtweg (0,7x tot 1,5x); de firmware stopt na 3 s onder '
          f'{f2(FW["lek"])} x:', '',
          rij('stand', 'zonder filter (x schoon)', 'schoon, toerental 3 % te laag (x schoon)', 'onderscheid'), rij('---:', '---:', '---:', '---')]
    for r in (0.3, 0.5, 0.75, 0.8, 1.0):
        zf = max(zonder_filter_verhouding(r, k) for k in RUIM)
        laag = min(sensor_dp(werkpunt(s, r * 0.97, k), 1.0, k) / sensor_dp(werkpunt(s, r, k), 1.0, k) for k in RUIM)
        ok = zf < FW['lek'] < laag
        L.append(rij(f'{r * 100:.0f} %', f2(zf), f2(laag), 'ja' if ok else '**nee**'))
        assert ok, f'stand {r}: filter ontbreekt niet te onderscheiden'
    L += ['', 'Zonder filter ligt de sensordruk op elke stand ver onder de grens, een schoon filter op een iets te laag toerental '
          'ruim erboven: de stop kan op elke stand. De firmware vergelijkt met de schone druk bij het **gemeten** toerental (uit de '
          'ijking) en oordeelt pas als de ventilator opgelopen is: tijdens de zachte start geen valse stop (getest). Daarna start de '
          'ventilator pas weer na UIT en een nieuwe AAN op de knop. Een kleine kier ziet de drukmeter niet (6c): daarom blijft de '
          'controle van de lip bij elke wissel; en het vingerrooster is de vaste afscherming (6b), de stop komt erbovenop.', '']

    L += ['## 4. Elektriek', '']
    p5 = sum(P_5V.values()) / ETA_BUCK  # gemiddeld, op 24 V
    i5 = sum(I_5V_PIEK.values())
    p_max = FAN_W + i5 * 5 / ETA_BUCK
    i_max = p_max / U_DC
    L += [rij('post', 'waarde'), rij('---', '---'),
          rij('ventilator vol toerental', f'{f1(FAN_W)} W, {f2(FAN_A)} A'),
          rij('5 V gemiddeld (knop + module + drukmeter + diode) via de regelaar, η ' + f2(ETA_BUCK), f'{f1(p5)} W'),
          rij('5 V piek (knop en module zenden tegelijk)', f'{f2(i5)} A van de {f1(BUCK_A)} A van de D24V10F5 ({f0(100 * i5 / BUCK_A)} %)'),
          rij('totaal op 24 V (ventilator vol + 5 V-piek)', f'{f1(p_max)} W, {f2(i_max)} A'),
          rij(f'adapter {ADAPTER["naam"]}', f'{ADAPTER["w"]} W, {f2(ADAPTER["a"])} A: {f0(100 * p_max / ADAPTER["w"])} % belast'),
          rij(f'zekering {f2(ZEKERING)} A traag (Bel Fuse 0697W3150-01)', f'{f0(100 * i_max / ZEKERING)} % van de nominale stroom'), '']
    lo, hi = (x * ADAPTER['w'] / U_DC for x in ADAPTER_OVERLAST)
    L += ['**Beveiliging, van de bron naar de last:**', '',
          f'- **Adapter:** overlast vanaf {f0(ADAPTER_OVERLAST[0] * 100)} tot {f0(ADAPTER_OVERLAST[1] * 100)} % van 90 W, dus '
          f'{f1(lo)} tot {f1(hi)} A; dan hiccup (zet telkens even af en herstelt vanzelf). Overspanning en oververhitting: '
          'uit tot de stekker opnieuw in gaat (datablad Mean Well).',
          f'- **Zekering -F1:** Bel Fuse 0697W3150-01, traag, 3,15 A, 350 V AC / **72 V DC**, I²t 66 A²s (IEC 60127-3 blad 4). '
          f'Bij {f1(lo / ZEKERING)} tot {f1(hi / ZEKERING)} x In smelt ze pas na minuten (1,5 x In: {ZEK_TIJD[1.5]}; 2,1 x In: '
          f'{ZEK_TIJD[2.1]}): de adapter schakelt dus eerst af. De zekering is de reserve als de adapter zelf faalt of '
          'als er na de adapter een fout is die hij niet ziet. Inschakelen: de elco van 470 µF laden kost hoogstens '
          'C U² / 2R = 1,4 A²s (R ≥ 0,1 Ω), ver onder 66 A²s. De ventilator start met 50 % per seconde (regel.h, getest).',
          '- **Schakelaar -Q4:** C&K D502J12S215PQA, **10 A bij 30 V DC** (resistief), 10 000 schakelingen; de ventilator '
          f'trekt hoogstens {f2(FAN_A)} A. Volgorde vanaf de adapter: -X1, -Q4, -F1 (de schakelaar zit vóór de zekering). '
          'Uit = ventilator, regelaar en ESP32-C3 spanningsloos.',
          '- **Ingang van de regelaar:** Pololu raadt boven 20 V een elco van minstens 33 µF dicht bij VIN aan (spanningspieken '
          'bij het inschakelen door de kabelinductie). Daarom -C2 47 µF / 50 V vlak bij VIN van -T3; de buffer -C1 is 470 µF / 50 V '
          '(niet 35 V: marge op 24 V plus piek). De regelaar mag tot 36 V aan de ingang.',
          '- **Ventilator spanningsloos zonder besturing:** -Q2 (IRF4905, P-kanaal, 55 V, 20 mΩ) schakelt de 24 V naar de '
          'ventilator; -Q3 (BC547) trekt zijn gate laag via een deler (Vgs ≈ −12 V, binnen ±20 V) zodra GPIO7 van -K1 hoog is. '
          'Een weerstand van 10 kΩ houdt de basis van -Q3 laag: zonder 5 V of 3,3 V, tijdens een reset of bij het flashen staat '
          f'-Q2 open en krijgt de ventilator geen spanning. Verlies in -Q2: {f2(FAN_A) } A² x 0,02 Ω = {f2(FAN_A ** 2 * 0.02)} W (zonder koellichaam).',
          '- **5 V:** de D24V10F5 heeft een kortsluit- en overstroombeveiliging en schakelt af als ze te warm wordt. 1 A is een '
          'typische continue waarde die van de warmte afhangt; de piek van knop en module samen blijft eronder (tabel hierboven).',
          '- **Ompoling (versie 7.2):** de DC-kabel van de adapter wordt ingekort en op -X1 geschroefd: wie de aders verwisselt, zet '
          '-24 V op de elco\'s, de regelaar en de MOSFET. Daarom zit -R13 (Schottky SB560, 5 A / 60 V) in sperrichting over L+ en M, '
          'achter -F1. Juist aangesloten spert ze (geen verlies). Verkeerd om geleidt ze: de spanning blijft op ongeveer -0,5 V, de '
          f'adapter gaat in hiccup ({f1(lo)} tot {f1(hi)} A in korte pulsen) en -F1 smelt na enige tijd. Bovendien: de min van de '
          'adapter heeft de witte streep of de opdruk "-" (nameten met de multimeter vóór het vastschroeven, bouwschema). Een inbouwbus '
          'voor de originele stekker (Ø5,5/2,5, midden +) was het alternatief; die past niet op de volle print van 40 x 50.',
          '- **Tacho (versie 7.2):** de tachodraad loopt 0,5 m naast de PWM van 25 kHz. -R14 (1 kΩ in serie) en -C3 (10 nF naar M) bij '
          'GPIO4: τ = 10 µs, een tachopuls (hoogstens 130 Hz) gaat er ongeschonden door, een stoorpiek van enkele µs niet. In de '
          'software telt een flank pas 1,5 ms na de vorige (ontdendering) en komt het toerental uit de tijd tussen de pulsen '
          '(resolutie 1 µs in plaats van 1 puls per seconde = 3 % bij 900 min-1).',
          '- **Watchdog (versie 7.2):** op de ESP32-C3 en de knop een task-watchdog van 3 s: loopt de lus vast, dan herstart de chip. '
          'Tijdens die herstart is -Q2 open (ventilator spanningsloos) en daarna staat alles UIT.',
          '- **Terugvoeding:** de Schottky-diode -R12 (1N5819) zit tussen de 5 V en de 5V-pin van de ESP32-C3. Het ontwerp hangt '
          'niet af van hoe het bordje intern zijn USB-poort met de 5V-pin verbindt (rechtstreeks of met een eigen diode): -R12 '
          'spert in beide gevallen de weg terug naar de regelaar en de knop. De knop flash je met de kabel uit de box.', '',
          '**Waarheidstabel: wat doet de ventilator bij een fout?** (veilige toestand = stil en spanningsloos)', '',
          rij('toestand', '24 V', '5 V / 3,3 V', '-Q2 (24 V naar de ventilator)', 'PWM', 'ventilator', 'wat de gebruiker ziet'),
          rij('---', '---', '---', '---', '---', '---', '---'),
          rij('normaal UIT', 'ja', 'ja', 'open (GPIO7 laag)', '0 %', 'stil, spanningsloos', 'knop: UIT'),
          rij('normaal AAN', 'ja', 'ja', 'dicht', 'geregeld', 'draait', 'knop: stand, Pa, tpm'),
          rij('5 V of 3,3 V valt weg (24 V blijft)', 'ja', 'nee', 'open (basis laag via 10 kΩ)', 'zwevend', 'stil, spanningsloos', 'knop zwart'),
          rij('reset of flashen van -K1', 'ja', 'ja', 'open (pinnen hoogohmig)', 'zwevend', 'stil', 'knop: UIT? (geen status)'),
          rij('kortsluiting in de USB-C-kabel naar de knop', 'ja', 'zakt (regelaar begrenst)', 'open', 'zwevend', 'stil', 'knop zwart'),
          rij('radio weg, -K1 werkt', 'ja', 'ja', 'dicht', 'laatste gewone stand', 'draait verder (geen boost), na 10 min stil', 'knop: AAN? / UIT?'),
          rij('filter eruit of slang los (7.2)', 'ja', 'ja', 'open na 3 s', '0 %', 'stil na 3 s', 'knop: gestopt, filter ontbreekt'),
          rij('4 uur geen bediening (7.2)', 'ja', 'ja', 'open', '0 %', 'stil', 'knop: 4 uur niets gedaan: uit'),
          rij('firmware loopt vast (7.2)', 'ja', 'ja', 'open (watchdog-herstart)', 'zwevend', 'stil, daarna UIT', 'knop: UIT? / afzuiging herstart'),
          rij('PWM-draad los of gebroken', 'ja', 'ja', 'dicht', 'los', '**vol toerental** (datasheet: open stuurdraad = 100 %)', 'knop: toerental wijkt af; UIT op de knop maakt hem spanningsloos'),
          rij('ventilator te traag of PWM verzadigd', 'ja', 'ja', 'dicht', 'geregeld', 'draait', 'knop: toerental wijkt af (geen filteroordeel)'),
          rij('-Q4 uit of zekering gesmolten', 'nee', 'nee', 'open', '—', 'stil', 'knop zwart'), '',
          'Na elke herstart van -K1 staat de afzuiging UIT tot een nieuwe handeling op de knop (regel.h, getest).', '',
          '- **Terugvoeding:** de Schottky-diode -R12 (1N5819) zit tussen de 5 V en de 5V-pin van de ESP32-C3. Hangt de box '
          'aan een computer om te flashen, dan voedt de computer alleen de ESP32-C3, niet de regelaar en niet de knop. '
          'De knop flash je met de kabel uit de box (in de computer): dan is er geen tweede bron.', '',
          rij('kabel', 'mm²', 'lus (m)', 'I (A)', 'R lus (Ω)', 'ΔU (V)', 'verlies (W)'),
          rij('---', '---:', '---:', '---:', '---:', '---:', '---:')]
    for n, a, l, i in KABELS:
        r = RHO_CU * 2 * l / a
        L.append(rij(n, f2(a), f1(2 * l), f2(i), f2(r) if r >= 0.01 else f'{r:.3f}', f2(i * r), f2(i * i * r)))
    L += ['', 'De M8-connector (binder 718, 4 polen) mag 4 A per contact; de ventilatorstroom loopt over één contact '
          f'heen en één terug. Bij een fout begrenst de adapter op hoogstens {f1(hi)} A (hiccup), ook voor de draad van 0,25 mm². '
          'De spanningsval van 0,1 tot 0,2 V maakt voor de ventilator niets uit. **Versie 7.2, gelijkgetrokken:** in de box '
          'montagedraad 0,5 mm² voor 24 V en M naar -X9; de M8-kabel heeft 4 x 0,25 mm² (zo verkocht, niet te kiezen); de aders van de '
          'ventilator zijn AWG 24 (datasheet). Schema, bestellijst en dit rekenblad zeggen nu hetzelfde.', '']

    L += ['## 5. Warmte in de voedingsbox', '',
          'In de box zit alleen de adapter en de kleine elektronica; de ventilator zit in de module. Verlies van de adapter = '
          'P_uit (1/η − 1). De adapter mag volgens de deratingcurve van Mean Well 100 % last tot 40 °C, lineair dalend naar '
          '50 % bij 70 °C (horizontaal); onder 50 % last tot 70 °C.', '',
          rij('stand', 'P naar de module (W)', 'last adapter', 'verlies in de box (W)', 'ΔT lucht in de box (K)',
              f'lucht in de box bij {f0(T_KAMER)} °C', 'adapter mag tot'),
          rij('---', '---:', '---:', '---:', '---:', '---:', '---:')]
    def boxverlies(r):
        p = FAN_W * r ** 3 + p5
        # adapter, regelaar (over de hele 5 V-last) en wat in de box zelf verbruikt wordt (ESP32-C3, drukmeter, diode), plus zekering en draden
        return p, p * (1 / ADAPTER['eta'] - 1) + sum(P_5V.values()) * (1 / ETA_BUCK - 1) + P_IN_BOX + 0.3
    rijen = [('40 % toerental', 0.4), ('60 %', 0.6), ('75 % (lage stand)', 0.75), ('80 % (dagstand: laagste beschermende en hoogste gewone stand)', 0.8),
             ('100 % (boost)', 1.0)]
    ergst = 0.0
    for naam, r in rijen:
        p, verlies = boxverlies(r)
        dts = [box_dt(verlies, h) for h in H_WAND]
        if r < 1:
            ergst = max(ergst, T_KAMER + dts[0])
        last = p / ADAPTER['w']
        L.append(rij(naam, f1(p), f'{f0(100 * last)} %', f2(verlies), f'{f0(dts[1])}–{f0(dts[0])}',
                     f'{f0(T_KAMER + dts[1])}–{f0(T_KAMER + dts[0])} °C', f'{f0(adapter_tmax(last))} °C'))
    gem = (1 - BOOST_DEEL) * boxverlies(0.8)[1] + BOOST_DEEL * boxverlies(1.0)[1]
    dts = [box_dt(gem, h) for h in H_WAND]
    ergst = max(ergst, T_KAMER + dts[0])
    last_boost = boxverlies(1.0)[0] / ADAPTER['w']
    L.append(rij('80 % met zoveel boost als het tegoed toelaat (1/5 op 100 %, gemiddeld)', '—', '—', f2(gem), f'{f0(dts[1])}–{f0(dts[0])}',
                 f'{f0(T_KAMER + dts[1])}–{f0(T_KAMER + dts[0])} °C', f'{f0(adapter_tmax(last_boost))} °C'))
    assert ergst < T_PETG_MAX and ergst < adapter_tmax(last_boost), 'te warm in de box'
    # foutgeval: de ventilator blijft op 100 % (firmwarefout), de salon op T_KAMER_MAX, slechtste wand
    p100, v100 = boxverlies(1.0)
    t_fout = T_KAMER_MAX + box_dt(v100, H_WAND[0])
    assert t_fout < T_PETG_MAX and t_fout < adapter_tmax(p100 / ADAPTER['w']), 'continu 100 % te warm'
    L += ['', f'In de box: de adapter, de regelaar en {f2(P_IN_BOX)} W van de ESP32-C3, de drukmeter en de diode (de knop zit in het blad). '
          'De warmte in de box bereikt geen evenwicht in de 120 s van één boost; het gemiddelde met het boosttegoed (hoogstens '
          '1/5 van de tijd op 100 %, regel.h, getest) is het geval om op te rekenen.', '',
          f'**Grenzen:** de adapter staat in elke stand op hoogstens {f0(100 * last_boost)} % last en mag dan tot '
          f'{f0(adapter_tmax(last_boost))} °C omgeving (datablad). De strengste grens is het PETG van de box: '
          f'warmtevervormingstemperatuur 68 °C (Prusament, 0,45 MPa); we houden de lucht in de box onder {f0(T_PETG_MAX)} °C. '
          f'Het ongunstigste geval hierboven (h = 5 W/m²K, 25 °C in de salon) is {f0(ergst)} °C. Poort E1 meet het (4 uur, adapter '
          'en box). Model: wanden (h = 5 tot 10 W/m²K) plus de schoorsteenstroom door de bodem- en achterwandsleuven.', '',
          f'**Foutgeval en herstarts:** blijft de ventilator door een fout continu op 100 % in een salon van {f0(T_KAMER_MAX)} °C, '
          f'dan wordt de lucht in de box {f0(t_fout)} °C: onder {f0(T_PETG_MAX)} °C en onder de {f0(adapter_tmax(p100 / ADAPTER["w"]))} °C '
          'van de adapter. De warmte is dus ook zonder boostgrens veilig; het boosttegoed (begint na elke start op 0, ook na een '
          'warme herstart) begrenst vooral het geluid. Valt de besturing weg, dan staat de ventilator stil (hoofdstuk 4).', '']

    L += ['## 6. Bevestiging', '',
          f'Montage van beide klauwtypen: draaien tot het rubberkussen het blad raakt, dan **een halve slag** ({f0(SLAG * 360)}°). '
          'De kracht volgt uit het rubber (Gent: E uit de Shore-hardheid, met de vormfactor) en de arm (PETG) in serie. De '
          'resultante van het contact ligt ergens op het rubber; beide randen worden gerekend, Shore 35 tot 45, koud en warm '
          f'({f0(T_MAX_KLAUW)} °C: stijfheid en sterkte x 0,9, AANNAME). De blijvende spanning is 1/5 van de vloeigrens '
          f'(47 MPa, Prusament PETG): {f1(PETG["kruip"])} MPa. Dat is een AANNAME (er is geen gepubliceerde kruipwaarde voor PETG), '
          'geen datablad.', '',
          rij('klauw', 'arm (mm)', 'rubber', 'veer rubber (N/mm)', 'kracht na een halve slag (N)', 'kruipgrens arm, slechtst (N)', 'marge', 'dak boven de moer (N)'),
          rij('---', '---', '---', '---:', '---:', '---:', '---:', '---:')]
    for naam, K, d in (('module (M5, 8 x 6)', KLAUW, 5), ('knop (M4, 6 x 5)', KNOPKLAUW, 4)):
        marge, fmax, g = klauw_band(K)
        fs = [min(klauw_slag(K, SLAG, a, w)[0] for a in K['zone'] for w in (1.0, 0.9)), fmax]
        assert marge >= 1.5, f'{naam}: te weinig marge op de kruipgrens'
        R = K['rubber']
        L.append(rij(naam, f'{f1(K["zone"][0])} tot {f1(K["zone"][1])}', f'neopreen Shore A 40, {f0(R["t"])} mm, {f1(R["l"])} x {f0(R["b"])}',
                     f'{f0(rubber_veer(35, R))}–{f0(rubber_veer(45, R))}', f'{f0(fs[0])}–{f0(fs[1])}', f0(g), f1(marge),
                     f0(klauw(K, d, K['zone'][1], 0.9)[1])))
    fmin4 = 4 * min(klauw_slag(KLAUW, SLAG, a, w)[0] for a in KLAUW['zone'] for w in (1.0, 0.9))
    L += ['', f'- **Waarom zo weinig genoeg is:** het gewicht van de module en de druk van handen gaan via de rand van het '
          'bovenframe (5 mm rondom) naar het blad, niet via de klauwen. De klauwen houden de module alleen omlaag tegen '
          f'optillen en trillen: samen minstens {f0(fmin4)} N tegen ongeveer 20 N gewicht. De knop weegt 50 g en wordt alleen '
          'gedraaid en ingedrukt.',
          '- **Druk op het blad:** het rubber (7,5 x 8 mm) drukt met hoogstens '
          f'{f2(klauw_band(KLAUW)[1] / 60)} MPa op de onderhuid: ver onder wat vezelplaat verdraagt (enkele MPa).',
          '- **Een halve slag te veel** (dus een hele) geeft tot ' f'{f0(max(klauw_slag(KLAUW, 1.0, KLAUW["zone"][1], 0.9)))} N bij de '
          'buitenrand: rond de kruipgrens. De handleiding zegt daarom "een halve slag" en toont het met de schroefgleuf.',
          '- **Voedingsbox (versie 7.2):** 0,7 kg = 7 N op 4 spaanplaatschroeven 4 x 16 verzonken. Ze draaien nu niet meer alleen in de '
          'onderhuid van 3 mm maar door de huid in een houten lat van 10 x 30 mm die binnen tegen de onderhuid gelijmd is (6d). '
          'Uittrekkracht per schroef in 10 mm naaldhout: AANNAME ≥ 100 N (voorzichtig; in alleen 3 mm vezelplaat was het ≥ 30 N). '
          'Ongunstig geval: gewicht plus 20 N trek aan een kabel op één hoek: hoogstens ongeveer 12 N op één schroef. Poort M1 trekt eraan.',
          '- **Frame op het blad (versie 7.2):** de rand van 5 mm van het bovenframe ligt op de bovenhuid; daaronder zit nu rondom een '
          'lat van 28 x 44 mm tussen de huiden (6d): de last van een leunende arm gaat in hout, niet in 3 mm vezelplaat boven papier.',
          '- **Fanschroeven M4 x 10:** kop 1 mm verzonken in een plaat van 6 mm, dus 5 mm indraaiing (fabrikant: 4 tot 6). '
          'Met plaat ±0,2 en schroeflengte ±0,2 (ISO 4759-1, klasse A): 4,6 tot 5,4 mm.', '']

    # ---- 6b vingerrooster
    w, plek, nk, ne = vingerrooster_fe()
    V = VINGER
    zak = 6 - math.sqrt(36 - (V['spleet'] / 2) ** 2)  # bolle vingertop R6 in een spleet van 10,4
    ruimte = V['rotor'] - 0.3 - max(0.0, zak - V['h'])
    assert w * 2 <= ruimte, 'vingerrooster buigt te ver door'
    w0 = vingerrooster_fe(ringen=[])[0]
    afstand = V['h'] + V['rotor']
    spleet_max = V['spleet'] + 0.2 * 2 / 2 + 0.1  # rib 1,6 +-0,2 en steek +-0,1 (geprint): de spleet hoogstens zoveel
    iso = [(4, 2), (6, 10), (8, 20), (10, 80), (12, 100), (20, 120)]  # EN ISO 13857:2019 tabel 4, sleuf: e (mm) -> s_r (mm)
    nodig = next(sr for e, sr in iso if spleet_max <= e)
    assert afstand >= nodig, 'vingerrooster: te dicht bij de waaier voor EN ISO 13857'
    L += ['## 6b. Vingerrooster in het oog', '',
          f'Versie 7.2: {2 * len(V["xs"])} ribben 1,6 mm breed en {f1(V["h"])} mm hoog op steek 7,2 (spleten {f1(V["spleet"])} mm, met de '
          f'printtolerantie hoogstens {f1(spleet_max)}), een dwarsrib en twee ringen (r {V["ringen"][0]} en {V["ringen"][1]}). De onderkant ligt '
          f'{f2(V["rotor"])} mm boven de waaier, de bovenkant dus {f1(afstand)} mm. Versie 7.1 had spleten van 10,4 tot 10,8 mm op 9 mm: '
          'te weinig volgens de norm hieronder.', '',
          '**EN ISO 13857:2019, tabel 4 (personen vanaf 14 jaar, sleuf):** e ≤ 4 mm: 2 mm afstand; 4 < e ≤ 6: 10 mm; 6 < e ≤ 8: 20 mm; '
          '8 < e ≤ 10: 80 mm; 10 < e ≤ 12: 100 mm (bron: overgenomen in de veiligheidsgids van Troax, p. 6; de norm zelf is niet gratis). '
          f'Hier: e ≤ {f1(spleet_max)} mm, dus nodig {nodig} mm; aanwezig {f1(afstand)} mm: **voldoet**. De plaat en het filter zijn '
          'zonder gereedschap af te nemen en tellen dus niet als afscherming; het vingerrooster is gelijmd (vaste afscherming). De '
          'lamellen van de kuip (banden van 4 mm, loodrecht 2,8 mm) vallen onder e ≤ 4 mm: 2 mm nodig, de waaier zit 7 mm achter de wand.', '',
          f'**Rekenmodel:** balkrooster ({nk} knopen, {ne} balkjes) met buiging en wringing; de uiteinden van de ribben op de rand '
          'van het oog als scharnier (ongunstiger dan ingeklemd); PETG E = 1200 MPa (1500 min 20 % voor warmte en printrichting). '
          f'Een last van **10 N** (projectkeuze, geen normwaarde) staat om de beurt op elke knoop (om de 2 mm). Grootste doorbuiging '
          f'onder de last: **{f2(w)} mm** (bij x = {f0(plek[0])}, z = {f0(plek[1])}); zonder de ringen zou dat {f2(w0)} mm zijn.', '',
          f'**Ruimte tot de waaier:** {f2(V["rotor"])} mm, min 0,3 mm printtolerantie. Een vinger (Ø12, bolle top R6, de '
          f'ongunstigste vorm) zakt {f1(zak)} mm in een spleet: dat blijft binnen de ribhoogte van {f1(V["h"])} mm. Beschikbaar: '
          f'{f2(ruimte)} mm, doorbuiging {f2(w)} mm: **factor {f1(ruimte / w)}**. Het rooster zit vast in de gelijmde '
          'instroomplaat en blijft staan als het filter eruit is. Poort W1 controleert het met een proefvinger, nooit met een '
          'draaiende ventilator (schakelaar UIT).', '']

    # ---- 6c afdichting van het filter
    P = dict(t=0.5, over=2.5, shore=60, spleet=1.0, tol=0.5)
    E_lip = 0.0981 * (56 + 7.62336 * P['shore']) / (0.137505 * (254 - 2.54 * P['shore']))
    reik_min = P['over'] - P['tol'] - P['spleet']  # kleinste filter, helemaal naar de andere kant geschoven
    mu = 1.8e-5
    dp_max = 1.5 * firmware_factor(1.0) * sensor_dp(werkpunt(filter_dp(FILTERS['CU']), 1.0))
    lek = lambda h: 0.68 * h ** 3 * dp_max / (12 * mu * 1e-3) * 3600  # m³/h door een spleet h (m), 1 mm lang, rondom
    L += ['## 6c. Afdichting van het filter', '',
          'Het filter (195 x 145 x 30, maattolerantie AANNAME ±1 mm, hoogte 29 tot 31) ligt los op een zachte foamband in een '
          'geleiderand met 1 mm speling rondom. **De afdichting is een lip** van zelfklevend siliconenrubber (0,5 mm, Shore A 60, '
          f'E ≈ {f1(E_lip)} MPa) op de geleiderand, {f1(P["over"])} mm over de nominale rand van het filter: bij het inleggen buigt het '
          'filter de lip naar onder en ze ligt rondom tegen de zijkant. De lucht boven de lip staat onder hogere druk dan eronder: '
          'de lip wordt in de spleet gedrukt (zelfversterkend). De foamband draagt het filter alleen nog.', '',
          '**Maatketen (min/max):**', '',
          rij('geval', 'waarde', 'gevolg'), rij('---', '---', '---'),
          rij('kleinste filter (194 x 144), naar één kant geschoven', f'spleet tot {f1(P["spleet"] + 2 * P["tol"] + P["spleet"])} mm aan de andere kant',
              f'de lip reikt nog {f1(reik_min)} mm tegen de zijkant: contact rondom'),
          rij('grootste filter (196 x 146), naar één kant geschoven', 'spleet 0 mm aan die kant', 'de lip zit geklemd tussen filter en rand: dicht'),
          rij('filterhoogte 29 tot 31 mm (versie 7.2: 3 mm lager)', 'bovenkant 2,5 tot 0,5 mm onder het blad', '3 tot 5 mm lucht tot de RVS-plaat (onderkant 2,5): ook de gaten naast het filter doen mee; het filter kan hoogstens 3 tot 5 mm opschuiven, de lip (2,5 mm) blijft dan nog over de rand'),
          rij('foamband 0 tot 1 mm ingedrukt (gewicht en onderdruk)', 'verdeelruimte 15,5 tot 16,5 mm', 'boven de ribben van het vingerrooster (12 mm) blijft 6,5 tot 7,5 mm'), '',
          f'**Wat er langs kan:** zou er rondom toch een spleet van 20 µm blijven, dan lekt er bij het grootste drukverschil '
          f'({f0(dp_max)} Pa, boost bij de melding, x 1,5) {f2(lek(20e-6))} m³/h langs het filter (Poiseuille, 1 mm contact): '
          f'verwaarloosbaar. Bij 0,1 mm rondom is het {f1(lek(1e-4))} m³/h: dat sluit de lip juist uit. Ontbreekt het filter of '
          f'ligt het scheef (grote omloop), dan zakt de sensordruk onder {f2(FW["lek"])} x schoon en meldt de knop "filter ontbreekt '
          'of sluit niet af" (regel.h; zonder filter rekent het model 0,27 tot 0,54 x). Een kleine omloop ziet de drukmeter niet: '
          'daarom staat in de onderhoudsstappen "lip rondom tegen het filter?" (zien en voelen).', '']

    # ---- 6d tafelblad
    L += ['## 6d. Tafelblad LAGKAPTEN met de uitsparingen (versie 7.2)', '',
          'LAGKAPTEN is 34 mm dik: twee huiden van vezelplaat (hardboard) op een kern van papieren honingraat, met een rand van '
          'spaanplaat (IKEA). IKEA geeft 50 kg verdeeld en 15 kg geconcentreerd als grens. De dikte van de huiden staat nergens: '
          '**AANNAME 3 mm**, na te meten in de eerste uitsparing. Het blad ligt op twee ALEX-kasten: de vrije overspanning in het '
          'midden is 680 mm, en precies daar zitten de gaten.', '',
          '**Wat er weg is (ongunstigste doorsnede, x = -60 mm):** bovenhuid 212 mm (de uitsparing van de module), onderhuid 212 + 102 '
          '(de voedingsbox) + 38 mm (de sleuf naar de module, 29 x 7, loopt over 38 mm van voor naar achter door die doorsnede). Van '
          f'600 mm blijft {f0((BLAD["b"] - GAT["boven"]) * 1000)} mm bovenhuid en {f0((BLAD["b"] - GAT["onder"]) * 1000)} mm onderhuid.', '',
          '**Rekenmodel:** vrij opgelegde sandwichbalk over 680 mm met een last in het midden, de verzwakte doorsnede over de hele '
          'lengte (ongunstig). Buiging door de huiden (E vezelplaat 2500 tot 4000 MPa, AANNAME), afschuiving door de papieren kern '
          '(G 2 tot 6 MPa, AANNAME: geen fabrikantwaarde). De latten rond de uitsparingen maken de randen stijf maar tellen hier niet mee.', '',
          rij('last in het midden', 'doorbuiging buiging (mm)', 'doorbuiging afschuiving kern (mm)', 'samen (mm)', 'spanning huid (MPa)', 'zelfde blad zonder gaten (mm)'),
          rij('---', '---:', '---:', '---:', '---:', '---:')]
    for P, naam in ((150, '150 N (15 kg: grens van IKEA voor een geconcentreerde last)'), (300, '300 N (iemand leunt met beide ellebogen)'), (500, '500 N (50 kg: zitten op het blad, buiten de grens)')):
        lo = doorbuiging(P, BLAD['E'][1], BLAD['G'][1], BLAD['b'] - GAT['boven'], BLAD['b'] - GAT['onder'])
        hi = doorbuiging(P, BLAD['E'][0], BLAD['G'][0], BLAD['b'] - GAT['boven'], BLAD['b'] - GAT['onder'])
        vol = doorbuiging(P, BLAD['E'][0], BLAD['G'][0], BLAD['b'], BLAD['b'])
        L.append(rij(naam, f'{f1(lo[0])}–{f1(hi[0])}', f'{f1(lo[1])}–{f1(hi[1])}', f'{f1(lo[0] + lo[1])}–{f1(hi[0] + hi[1])}', f1(hi[2]), f1(vol[0] + vol[1])))
    w150 = doorbuiging(150, BLAD['E'][0], BLAD['G'][0], BLAD['b'] - GAT['boven'], BLAD['b'] - GAT['onder'])
    assert w150[2] < 10, 'te veel spanning in de huid'
    L += ['', f'De spanning in de huid blijft klein (vezelplaat breekt bij enkele tientallen MPa). De doorbuiging met 15 kg is '
          f'hoogstens ongeveer {f1(w150[0] + w150[1])} mm, de kern bepaalt het meeste: dat is een AANNAME en daarom meet poort M1 het '
          f'(doorbuigproef met 15 kg op het frame en 50 kg verdeeld). Met de gaten buigt het blad ongeveer {f1((w150[0] + w150[1]) / sum(doorbuiging(150, BLAD["E"][0], BLAD["G"][0], BLAD["b"], BLAD["b"])[:2]))} keer zoveel als zonder (ongunstig gerekend).', '',
          '**Latten tussen de huiden (versie 7.2, werkwijze in de README en tekening AFZ-20):**', '',
          '- **Rond de uitsparing van de module (212 x 212, doorgaand):** vier geschaafde vurenhouten latten 28 x 44 mm, elk 212 mm '
          'lang, in de holte langs elke zijde. Na het frezen de honingraat rondom 45 mm diep wegsnijden (mes, schroevendraaier), de lat '
          'met PU-lijm of houtlijm D3 op beide huiden schuiven, de binnenkant gelijk met de rand van de uitsparing, en klemmen tot de '
          'lijm hard is. De rand van het frame (5 mm) en de klauwen (onder de onderhuid) drukken dan op hout.',
          '- **Rond de uitsparing van de box (212 x 102 x 15, van onderen):** twee latten 10 x 30 mm (multiplex of beuken), 200 mm lang, '
          'voor en achter, tegen de binnenkant van de onderhuid gelijmd (de honingraat 32 mm diep wegsnijden). De 4 schroeven 4 x 16 van '
          'de box draaien door de huid 10 mm in de lat.',
          '- **Kern 28 mm:** dat volgt uit de aanname van 3 mm per huid; is de kern anders, dan de lat op die maat schaven.',
          '- **Alternatief:** een massief blad (multiplex berken 30 mm of massief eiken 26 tot 30 mm): geen latten nodig, de klauwen '
          'werken van 10 tot 50 mm, de schroeven van de box houden zonder meer. Duurder en zwaarder.', '']

    # ---- 7 morsen
    n_plooi = 195 / FILTERS['CU']['diepte'] * 0 + 195 / 4.2
    media = n_plooi * 2 * 0.028 * 0.145
    L += ['## 7. Morsen (begrensd scenario)', '',
          'Scenario: een fles nagellak of remover van 15 ml valt om op het rooster. Een deel loopt door de gaten (ongeveer 25 % '
          'open); in het ongunstigste geval alles. De RVS-plaat en het siliconen van de lip kunnen ertegen; PETG niet tegen '
          f'aceton (docs/Materiaalstaat.md). Het filter heeft ongeveer {f2(media)} m² vlies ({f0(n_plooi)} plooien van 28 mm). '
          f'AANNAME: vlies houdt 100 tot 300 g vloeistof per m² vast, dus {f0(media * 100)} tot {f0(media * 300)} ml: **15 ml blijft in het filter**. '
          'Wat er toch door komt, valt in het oog op de waaier en wordt tegen de wand van de kuip geslingerd en door de lamellen en '
          'ringsleuven naar buiten (onder het blad; de voedingsbox staat erachter, buiten de uitblaas).', '',
          'Daarom na morsen: schakelaar UIT, stilstand, filter in een zak (weg), en dan de inspectie met afkeurgrenzen uit '
          '`onderhoud.mjs` ("Na morsen"). Voor de waaier: schakelaar UIT, de M8-stekker onder het blad los, de vier klauwen los en '
          'de module er van boven uit; dan de kuip met de ventilator los (4 x M3). Niets staat dan onder spanning of draait.', '']
    (HIER / 'Berekeningen.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
    print('\n'.join(L))


if __name__ == '__main__':
    maak()
