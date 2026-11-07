"""Rekenblad van de afzuiging: lucht, filter, vangst, geluid, elektriek, warmte en bevestiging.

Draai:  python voorbeelden/afzuiging/docs/berekeningen.py  -> schrijft docs/Berekeningen.md opnieuw.
Alle invoer staat bovenaan met de bron erbij. Aannames heten AANNAME en hebben een onder- en bovengrens; de uitkomst
wordt voor beide grenzen gegeven. Niets hier vervangt de metingen van docs/Vrijgave-en-meetplan.md.
"""
import math
from pathlib import Path

RHO = 1.2  # kg/m³, lucht bij 20 °C
HIER = Path(__file__).resolve().parent

# ---------------------------------------------------------------- invoer: ventilator
# San Ace C175, 9TG24P0S01: 24 V, 2,35 A, 56,4 W, 69 dB(A) op 1 m (fabrikant). Curve bij 100 % PWM, afgelezen uit de
# fabrieksgrafiek (met inlaatnozzle 109-1073), afleesonzekerheid ±15 tot 25 Pa.
FAN = [(0, 609), (240, 430), (360, 340), (480, 225), (540, 160), (600, 103), (696, 0)]  # (m³/h, Pa)
FAN_W, FAN_A, FAN_DBA = 56.4, 2.35, 69.0


def fan_p(q, r=1.0):
    """statische druk bij debiet q (m³/h) en toerentalfractie r (wetten van de ventilator: Q ~ r, p ~ r²)"""
    qq = q / r
    if qq >= FAN[-1][0]:
        return 0.0
    for (q0, p0), (q1, p1) in zip(FAN, FAN[1:]):
        if q0 <= qq <= q1:
            return r * r * (p0 + (p1 - p0) * (qq - q0) / (q1 - q0))
    return r * r * FAN[0][1]


# ---------------------------------------------------------------- invoer: luchtweg (maten uit maak-afzuiging.mjs)
A_OPENING = 0.201 * 0.201  # m², opening van het bovenframe onder de RVS-plaat
A_ROOSTER = 125.6e-4  # m², open oppervlak van de lasersnede boven het vak van de cassette (laser-rapport, 171 x 171)
A_FILTER = 0.171 * 0.171  # m², front van de filtermat in het vak (Rittal SK 3171.100, 173 x 173 x 17)
A_CASBODEM = 64 * 0.018 * 0.018  # m², 8 x 8 vensters van 18 x 18 in de cassettebodem
A_INLAAT = math.pi * 0.0635 ** 2  # m², oog Ø127 in de instroomplaat
A_LAMELLEN = (0.202 * 0.202 - math.pi * 0.045 ** 2) * 0.6  # m², vrije doorgang van de schuine lamellen (60 %)


def zeta_plaat(f):
    """Idelchik, dunne geperforeerde plaat met scherpe randen; f = open fractie; ζ op de aanstroomsnelheid"""
    return (0.707 * (1 - f) ** 0.375 + 1 - f) ** 2 / f ** 2


# (naam, ζ, oppervlak waarop ζ betrokken is). AANNAME: de werkelijke ζ ligt tussen 0,7x en 1,5x deze waarden.
VERLIEZEN = [
    ('RVS-rooster (f = 0,35)', zeta_plaat(A_ROOSTER / A_OPENING), A_OPENING),
    ('cassettebodem (f = 0,56)', zeta_plaat(A_CASBODEM / A_FILTER), A_FILTER),
    ('instroom naar het oog Ø127 (trechter 45°)', 0.5, A_INLAAT),
    ('uitblaas door de schuine lamellen', 2.5, A_LAMELLEN),
]
RUIM = (0.7, 1.5)


def dp_rest(q, k=1.0):
    v = q / 3600
    return k * sum(z * 0.5 * RHO * (v / a) ** 2 for _, z, a in VERLIEZEN)


# ---------------------------------------------------------------- invoer: filters
# dp(v) = dp_ref * (v / v_ref) ** n, v = snelheid over het front van het filter. n = 1 (vezelmedia, laminair) tenzij
# de fabrikant meer punten geeft. eind = aanbevolen einddrukval (vervangen), of 2 x schoon als die er niet is.
FILTERS = {
    # GEKOZEN (Ian, 2026-11-07): Rittal SK 3171.100, 173 x 173 x 17, G3 / ISO coarse 50 %. Rittal geeft geen drukval;
    # AANNAME aan de veilige kant: zoals een G4-mat van 20 mm (Onninen/General Filter A40: 34 Pa bij 1,5 m/s; RS PRO
    # 827-9529: 35 Pa; Camfil: 50 Pa), einddrukval 250 Pa. Een G3-mat van 17 mm heeft minder weerstand.
    'G4': dict(naam='**gekozen:** Rittal SK 3171.100 (G3), 17 mm, gerekend als G4 (veilige kant)', dp_ref=34, v_ref=1.5,
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
X_HAND = 0.10  # m, nagel boven het rooster
V_VANG = 0.5  # m/s, gewenste luchtsnelheid op X_HAND (vangsnelheid voor licht stof dat zacht vrijkomt: 0,5 tot 1,0)


def v_vang(q, x=X_HAND):
    """Dalla Valle, opening met flens (het blad): v = Q / (0,75 (10 x² + A))"""
    return (q / 3600) / (0.75 * (10 * x * x + A_OPENING))


def q_voor_vang(v=V_VANG, x=X_HAND):
    return v * 0.75 * (10 * x * x + A_OPENING) * 3600


def werkpunt(dpf, r=1.0, k=1.0):
    """debiet waar de ventilatorcurve de systeemweerstand snijdt (bisectie)"""
    lo, hi = 0.0, FAN[-1][0] * r
    for _ in range(60):
        m = (lo + hi) / 2
        if fan_p(m, r) > dpf(m) + dp_rest(m, k):
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
    return lambda q: fac * f['dp_ref'] * ((q / 3600 / A_FILTER) / f['v_ref']) ** f['n']


def db(r, afstand=1.0):
    """69 dB(A) op 1 m bij vol toerental; ΔL = 50 log10(r) (ventilatorwet), vrije puntbron: -20 log10(afstand)"""
    return FAN_DBA + 50 * math.log10(r) - 20 * math.log10(afstand)


# ---------------------------------------------------------------- elektriek
U_DC = 24.0
ADAPTER = dict(naam='Mean Well GST90A24-P1M', w=90, a=3.75, eta=0.88)  # η: gemiddeld, Level VI (≥ 88 %)
ZEKERING = 3.15  # A traag, TR5
P_5V = dict(knop_esp32s3_scherm=1.2, module_esp32c3=0.5, sdp810=0.02)  # W, piek (radio aan), AANNAME uit datasheets
P_IN_BOX = P_5V['module_esp32c3'] + P_5V['sdp810']  # W: de knop zit in het blad, niet in de box
BOOST_DEEL = 1 / 5  # hoogstens 1/5 van de tijd op 100 % (boosttegoed in regel.h: 1 s boost = 4 s afkoelen)
# vervangfactoren in de firmware (regel.h, Instellingen::vervangStand/vervangFactor): moeten onder 0,9 x de berekende
# grens liggen (hoofdstuk 3b); vervangen_en_geluid() controleert dat, ook tussen de punten
FIRMWARE_VOLFACTOR = {0.7: 1.10, 0.8: 1.58, 1.0: 1.88}


def firmware_factor(r):
    ks = sorted(FIRMWARE_VOLFACTOR)
    if r < ks[0]:
        return None
    for a, b in zip(ks, ks[1:]):
        if r <= b:
            return FIRMWARE_VOLFACTOR[a] + (FIRMWARE_VOLFACTOR[b] - FIRMWARE_VOLFACTOR[a]) * (r - a) / (b - a)
    return FIRMWARE_VOLFACTOR[ks[-1]]
FIRMWARE_BESCHERM_VANAF = 0.7
ETA_BUCK = 0.85  # Pololu D24V10F5 bij 24 -> 5 V, 0,3 A
RHO_CU = 0.0175  # Ω mm²/m bij 20 °C
KABELS = [  # (naam, doorsnede mm², lengte enkel m, stroom A)
    ('M8-kabel -W2 box -> module (0,5 m), 24 V en massa', 0.25, 0.5, FAN_A),
    ('adapter -> box (DC-snoer van de adapter)', 0.75, 1.5, FAN_A + 0.2),
    ('USB-C box -> knop, 5 V', 0.2, 1.0, 0.3),
]

# ---------------------------------------------------------------- warmte in de voedingsbox
BOX_A_WAND = 0.052  # m², bodem en zijwanden (de bovenkant zit tegen het blad)
H_WAND = (5.0, 10.0)  # W/m²K, AANNAME natuurlijke convectie + straling
A_IN, A_UIT, H_SCHOORSTEEN = 28.5e-4, 21 * 2.5e-3 * 12e-3, 0.012  # m², m²; bodemsleuven, 21 sleuven 2,5 x 12 achter (18 tot 30 mm onder het blad), hoogteverschil (m)
T_KAMER, T_ADAPTER_MAX = 25.0, 40.0  # °C; adapter vol vermogen tot 40 °C omgeving (fabrikant, daarboven derating)


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
KLAUW = dict(b=8.0, h=6.0, arm=10.0, moer_s=8.0, dak=1.8)  # mm; arm = afstand schroefas -> contact onder het blad
KNOPKLAUW = dict(b=6.0, h=5.0, arm=8.0, moer_s=7.0, dak=1.6)
PETG = dict(sigma=50.0, tau=25.0, kruip=10.0)  # MPa: trek (in de laag), afschuiving tussen lagen, blijvend (kruip)
K_SCHROEF = 0.2


def klauw(K, d):
    """F (N) waarbij de arm de kruipgrens haalt; σ = 6 F L / (b h²)"""
    f_kruip = PETG['kruip'] * K['b'] * K['h'] ** 2 / (6 * K['arm'])
    f_dak = PETG['tau'] * 6 * K['moer_s'] / math.sqrt(3) * K['dak']  # afschuiving van het dak rond de moer
    return f_kruip, f_dak, K_SCHROEF * f_kruip * d / 1000



def sensor_dp(q, m=1.0, k=1.0):
    """wat de drukmeter ziet: rooster + mat (m x schoon) + cassettebodem (het meetpunt zit onder de mat)"""
    f, v = FILTERS['G4'], q / 3600
    rooster = k * VERLIEZEN[0][1] * 0.5 * RHO * (v / VERLIEZEN[0][2]) ** 2
    bodem = k * VERLIEZEN[1][1] * 0.5 * RHO * (v / VERLIEZEN[1][2]) ** 2
    return rooster + bodem + m * f['dp_ref'] * ((v / A_FILTER) / f['v_ref']) ** f['n']


def plenum():
    """verdeelruimte onder de mat: hoogte, ringdoorsnede bij het oog, deel van het debiet dat er radiaal door moet en de
    bovengrens van het verlies (ζ = 0,5 op de ringsnelheid) bij 250 m³/h"""
    hoogte = 0.003 + 0.002 * 0.64  # 3 mm vrij onder de roosterbodem + de bodem van 2 mm (64 % open)
    ring = 2 * math.pi * 0.0665 * hoogte
    buiten = 1 - math.pi * 0.0635 ** 2 / A_FILTER
    v250 = buiten * 250 / 3600 / ring
    return hoogte, ring, buiten, v250, 0.5 * 0.5 * RHO * v250 ** 2


def vervangfactor(r, k, extra=0.0):
    """bij welke verhouding sensordruk/schoon zakt het debiet op stand r tot het minimum voor de vangst?
    extra = verlies van de verdeelruimte bij 250 m³/h (kwadratisch; stroomafwaarts van het meetpunt)"""
    s, qmin = filter_dp(FILTERS['G4']), q_voor_vang()
    pl = lambda q: extra * (q / 250) ** 2
    q0 = werkpunt(lambda q: s(q) + pl(q), r, k)
    if q0 < qmin:
        return q0, None
    lo, hi = 1.0, 50.0
    for _ in range(60):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if werkpunt(lambda q: m * s(q) + pl(q), r, k) > qmin else (lo, m)
    return q0, sensor_dp(qmin, lo, k) / sensor_dp(q0, 1.0, k)


def vervangen_en_geluid():
    boven = plenum()[4]
    scen = [(k, e) for e in (0.0, boven) for k in (RUIM[0], 1.0, RUIM[1])]
    L = ['### 3b. Melding "filter vervangen" per stand', '',
         'De drukmeter ziet rooster + mat + cassettebodem. Bij een vollere mat zakt het debiet; de melding moet komen vóór '
         f'het debiet onder het minimum voor de vangst ({f0(q_voor_vang())} m³/h) zakt. Zes scenario\'s per stand: de verliesband '
         '0,7x / 1x / 1,5x, telkens zonder en met de bovengrens van de verdeelruimte (hoofdstuk 3c). De firmware neemt het '
         'ongunstigste scenario met 10 % marge.', '',
         rij('stand (toerental)', 'schoon debiet (m³/h)', 'grens: x de schone sensordruk (laagste)', 'firmware (regel.h)', 'oordeel'),
         rij('---:', '---:', '---:', '---:', '---')]
    fout = []
    for r in (0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1.0):
        res = [vervangfactor(r, k, e) for k, e in scen]
        q0s = f'{f0(min(q for q, _ in res))}–{f0(max(q for q, _ in res))}'
        grens = [g for _, g in res]
        fw = firmware_factor(r)
        if r < FIRMWARE_BESCHERM_VANAF - 1e-9:
            L.append(rij(f'{r * 100:.0f} %', q0s, '—', 'lage stand', '"lage stand": geen bescherming beloofd, geen filteroordeel'))
            continue
        if any(g is None for g in grens):
            fout.append(r)
            L.append(rij(f'{r * 100:.0f} %', q0s, '—', f2(fw) if fw else '—', '**haalt het minimum niet: FOUT**'))
            continue
        gmin = min(grens)
        ok = fw is not None and fw <= 0.9 * gmin + 1e-9
        if not ok:
            fout.append(r)
        L.append(rij(f'{r * 100:.0f} %', q0s, f2(gmin), f2(fw) if fw else '—', 'melding op tijd (marge ≥ 10 %)' if ok else '**TE LAAT**'))
    assert not fout, f'vervangfactoren of beschermVanaf in regel.h kloppen niet met het model: {fout}'
    L += ['', f'De firmware meldt onder {f0(FIRMWARE_BESCHERM_VANAF * 100)} % "lage stand" (geen bescherming beloofd). '
          'Dit rekenblad faalt als de waarden in regel.h niet meer kloppen met het model. Poort L1 (Q–Δp gemeten) mag de '
          'grenzen later verruimen; tot dan gelden deze.', '']
    hoogte, ring, buiten, v250, boven = plenum()
    s = filter_dp(FILTERS['G4'])
    met = lambda q: s(q) + boven * (q / 250) ** 2
    L += ['### 3c. Verdeelruimte tussen mat en instroomplaat', '',
          f'Tussen de onderkant van de mat en de instroomplaat zit {f1(hoogte * 1000)} mm (3 mm vrij plus de open roosterbodem). '
          f'Als de mat overal even veel lucht doorlaat, moet {f0(buiten * 100)} % van het debiet radiaal naar het oog (Ø127): door '
          f'een ring van {f0(ring * 1e6)} mm² is dat bij 250 m³/h {f1(v250)} m/s. In werkelijkheid gaat meer lucht door het midden '
          'van de mat (boven het oog), waar de weg het kortst is: de mat wordt niet gelijk benut, en de dynamische druk in de '
          'ring is **geen** verlies dat zomaar bij de rest opgeteld mag worden. Daarom twee grenzen: verwaarloosbaar (gelijke '
          f'benutting) en een bovengrens van ζ = 0,5 op de ringsnelheid ({f0(boven)} Pa bij 250 m³/h, kwadratisch met het debiet).', '',
          rij('stand', 'debiet zonder (m³/h)', 'debiet met de bovengrens (m³/h)', 'v op 10 cm met de bovengrens (m/s)', 'boven het minimum?'),
          rij('---:', '---:', '---:', '---:', '---')]
    for r in (0.6, 0.7, 0.8, 1.0):
        q0, q1 = werkpunt(s, r), werkpunt(met, r)
        L.append(rij(f'{r * 100:.0f} %', f0(q0), f0(q1), f2(v_vang(q1)), 'ja' if q1 >= q_voor_vang() else '**nee**'))
    L += ['', 'Met de bovengrens haalt 60 % het minimum niet: daarom is **70 % de laagste beschermende stand** (`beschermVanaf` '
          'in regel.h) en houdt de melding "filter vervangen" rekening met de bovengrens (hoofdstuk 3b). Wat het echt is, meet '
          'poort L1 (Q–Δp bij elke stand, met en zonder mat); blijkt het verlies klein, dan mag 60 % weer meetellen. Een '
          'hogere verdeelruimte (de instroomplaat lager) kost diepte onder het blad: niet gekozen.', '']
    # geluid
    L += ['### 3d. Geluidsdoel bij het dagwerkpunt', '',
          'Werkpunt: de medewerker zit tegenover de klant, het oor op ± 0,5 m van het rooster (vrije puntbron, zonder '
          'roosterfluit of galm). Dagstand: 70 %, de laagste beschermende stand.', '',
          rij('stand', 'debiet (m³/h)', 'dB(A) op 1 m', 'dB(A) op 0,5 m (oor)'), rij('---:', '---:', '---:', '---:')]
    g = filter_dp(FILTERS['G4'])
    for r in (0.7, 0.8, 1.0):
        L.append(rij(f'{r * 100:.0f} %' + (' (boost)' if r == 1 else ''), f0(werkpunt(g, r)), f0(db(r)), f0(db(r, 0.5))))
    L += ['', '**Doel (projectdoel, geen norm):** dagstand 70 %: ≤ 67 dB(A) op de oorpositie (model 67); 80 %: ≤ 70 dB(A); '
          'boost kort luider. Het vroegere doel van 55 dB(A) op het oor is met deze ventilator op een beschermende stand niet '
          'haalbaar en is geschrapt. Stiller kan alleen met een grotere, langzamere ventilator of geluiddemping in de uitblaas '
          '(niet gekozen: dieper en duurder). Alle gehoorgrenzen voor werknemers (vanaf 80 dB(A) gemiddeld over 8 uur) liggen '
          'ver boven deze waarden; het doel gaat over comfort. Poort G1 meet het.', '']
    return L

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
    L += ['', f'**Minimum: {f0(qmin)} m³/h** (0,5 m/s op 10 cm), ook met een vol filter. **Ontwerpdebiet: 250 m³/h** met een '
          'schoon filter (0,66 m/s op 10 cm). Meer debiet geeft vooral meer geluid; 500 m³/h is geen doel meer.', '']

    L += ['## 2. Weerstand van de luchtweg zonder filter', '',
          rij('onderdeel', 'ζ', 'oppervlak (cm²)', 'Δp bij 250 m³/h (Pa)'), rij('---', '---:', '---:', '---:')]
    for n, z, a in VERLIEZEN:
        v = 250 / 3600 / a
        L.append(rij(n, f2(z), f0(a * 1e4), f0(z * 0.5 * RHO * v * v)))
    L += [rij('**samen**', '', '', f'**{f0(dp_rest(250))}** ({f0(dp_rest(250, RUIM[0]))} tot {f0(dp_rest(250, RUIM[1]))})'), '',
          'ζ van de platen volgens Idelchik (dunne geperforeerde plaat); de instroom en de lamellen zijn schattingen. '
          'Daarom staat overal een band van 0,7x tot 1,5x.', '']

    L += ['## 3. Werkpunt per filter', '',
          'Snijpunt van de ventilatorcurve (100 % en lager toerental, Q ~ n, p ~ n²) met filter plus luchtweg. '
          'Vol filter = de einddrukval van de fabrikant (of 2x schoon als die ontbreekt).', '',
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
    g = filter_dp(FILTERS['G4'])
    L += ['', '**Met de gekozen mat (schoon), per stand:** debiet en luchtsnelheid boven het midden van het rooster.', '',
          rij('toerental', 'debiet (m³/h)', 'op 10 cm', 'op 15 cm', 'op 20 cm', 'dB(A) op 1 m'),
          rij('---:', '---:', '---:', '---:', '---:', '---:')]
    for r in (0.4, 0.6, 0.7, 0.8, 1.0):
        q = werkpunt(g, r)
        L.append(rij(f'{r * 100:.0f} %' + (' (boost)' if r == 1 else ''), f0(q), f2(v_vang(q, 0.10)), f2(v_vang(q, 0.15)), f2(v_vang(q, 0.20)), f0(db(r))))
    L += ['', '20 cm boven het rooster haalt geen enkele stand 0,5 m/s: dat vraagt ongeveer 600 m³/h, meer dan deze '
          'ventilator met rooster en filter levert.']
    L += ['', 'De stand is een fractie van het volle **toerental**: de firmware regelt het toerental (ijktabel PWM -> '
          'toerental plus bijregeling op de tacho, regel.h). Debiet, geluid en warmte in dit rekenblad gebruiken dezelfde '
          'grootheid. Het geluid volgt ΔL = 50 log10(n/n_vol) en een vrije puntbron; roosterfluit, kastresonantie en galm '
          'komen erbij (meten: poort G1).', '']
    L += vervangen_en_geluid()

    L += ['## 4. Elektriek', '']
    p5 = sum(P_5V.values()) / ETA_BUCK
    p_max = FAN_W + p5
    i_max = p_max / U_DC
    L += [rij('post', 'waarde'), rij('---', '---'),
          rij('ventilator vol toerental', f'{f1(FAN_W)} W, {f2(FAN_A)} A'),
          rij('5 V (knop + module + drukmeter, piek) via buck η ' + f2(ETA_BUCK), f'{f1(p5)} W'),
          rij('totaal op 24 V', f'{f1(p_max)} W, {f2(i_max)} A'),
          rij(f'adapter {ADAPTER["naam"]}', f'{ADAPTER["w"]} W, {ADAPTER["a"]} A: {f0(100 * p_max / ADAPTER["w"])} % belast'),
          rij(f'zekering {ZEKERING} A traag (TR5)', f'{f0(100 * i_max / ZEKERING)} % van de nominale stroom'), '']
    L += ['Zekering: TR5, traag, 3,15 A, met een DC-spanning van minstens 32 V en een afschakelvermogen dat de '
          'kortsluitstroom van de adapter dekt (de adapter heeft zelf een stroombegrenzing en kortsluitbeveiliging). '
          'Kies een type met een opgegeven DC-waarde op het datablad. De aanloopstroom van de ventilator blijft binnen de '
          'traag-curve: de firmware laat de PWM hooguit 50 % per seconde stijgen (regel.h, getest).', '',
          rij('kabel', 'mm²', 'lus (m)', 'I (A)', 'R lus (Ω)', 'ΔU (V)', 'verlies (W)'),
          rij('---', '---:', '---:', '---:', '---:', '---:', '---:')]
    for n, a, l, i in KABELS:
        r = RHO_CU * 2 * l / a
        L.append(rij(n, f2(a), f1(2 * l), f2(i), f2(r) if r >= 0.01 else f'{r:.3f}', f2(i * r), f2(i * i * r)))
    L += ['', 'De M8-connector (binder 718, 4 polen) mag 4 A per contact; de ventilatorstroom loopt over één contact '
          'heen en één terug. De spanningsval van 0,1 tot 0,2 V maakt voor de ventilator niets uit.', '']

    L += ['## 5. Warmte in de voedingsbox', '',
          'In de box zit alleen de adapter en de kleine elektronica; de ventilator zit in de module. Verlies van de adapter = '
          'P_uit (1/η − 1).', '',
          rij('stand', 'P naar de module (W)', 'verlies in de box (W)', 'ΔT lucht in de box (K)', f'adapter-omgeving bij {f0(T_KAMER)} °C'),
          rij('---', '---:', '---:', '---:', '---:')]
    def boxverlies(r):
        p = FAN_W * r ** 3 + p5
        # adapter, buck (over de hele 5 V-last) en wat in de box zelf verbruikt wordt (ESP32-C3 + drukmeter), plus zekering en draden
        return p, p * (1 / ADAPTER['eta'] - 1) + sum(P_5V.values()) * (1 / ETA_BUCK - 1) + P_IN_BOX + 0.3
    rijen = [('40 % toerental', 0.4), ('60 %', 0.6), ('70 % (dagstand, laagste beschermende stand)', 0.7), ('80 % (hoogste gewone stand)', 0.8),
             ('100 % (boost)', 1.0)]
    for naam, r in rijen:
        p, verlies = boxverlies(r)
        dts = [box_dt(verlies, h) for h in H_WAND]
        L.append(rij(naam, f1(p), f2(verlies), f'{f0(dts[1])}–{f0(dts[0])}', f'{f0(T_KAMER + dts[1])}–{f0(T_KAMER + dts[0])} °C'))
    gem = (1 - BOOST_DEEL) * boxverlies(0.8)[1] + BOOST_DEEL * boxverlies(1.0)[1]
    dts = [box_dt(gem, h) for h in H_WAND]
    L.append(rij('80 % met zoveel boost als het tegoed toelaat (1/5 op 100 %, gemiddeld)', '—', f2(gem), f'{f0(dts[1])}–{f0(dts[0])}',
                 f'{f0(T_KAMER + dts[1])}–{f0(T_KAMER + dts[0])} °C'))
    L += ['', f'In de box: de adapter, de regelaar en {f2(P_IN_BOX)} W van de ESP32-C3 en de drukmeter (de knop zit in het blad). '
          'De warmte in de box bereikt geen evenwicht in de 120 s van één boost; het gemiddelde met het boosttegoed (hoogstens '
          '1/5 van de tijd op 100 %, regel.h, getest) is het geval om op te rekenen.', '',
          f'**Grens:** de adapter levert vol vermogen tot {f0(T_ADAPTER_MAX)} °C omgeving; bij minder last laat de fabrikant volgens '
          'de deratingcurve meer toe, maar die cijfers zijn hier niet overgenomen: we rekenen met 40 °C als grens (veilige kant). '
          'Tot 70 % blijft de box daar onder. Op 80 % met boost komt het ongunstigste geval (h = 5 W/m²K) er 1 à 3 K boven: '
          'poort E1 meet het (4 uur, adapter en box); is het te warm, dan wordt `dagMaxPct` in regel.h 70 % en daalt het boosttegoed. '
          'PETG blijft ruim onder zijn verwekingstemperatuur (± 70 °C). Model: wanden (h = 5 tot 10 W/m²K) plus de '
          'schoorsteenstroom door de bodem- en achterwandsleuven.', '']

    L += ['## 6. Bevestiging', '']
    for naam, K, d in (('moduleklauw (M5)', KLAUW, 5), ('knopklauw (M4)', KNOPKLAUW, 4)):
        fk, fd, t = klauw(K, d)
        L.append(f'- **{naam}:** arm {f0(K["b"])} x {f0(K["h"])} mm, hefboom {f0(K["arm"])} mm. Kruipgrens PETG '
                 f'({f0(PETG["kruip"])} MPa) bij **{f0(fk)} N** per klauw; het dak boven de moer ({f1(K["dak"])} mm) houdt '
                 f'{f0(fd)} N in afschuiving. Aanhaalmoment daarvoor: T = K F d = **{f2(t)} Nm** '
                 f'(aandraaien met twee vingers aan de korte kant van de inbussleutel tot de klauw voelbaar aanligt; niet verder).')
    L += ['- **Waarom zo weinig genoeg is:** het gewicht van de module en de druk van handen gaan via de rand van het '
          'bovenframe (5 mm rondom) naar het blad, niet via de klauwen. De klauwen houden de module alleen omlaag tegen '
          f'optillen en trillen: 4 x {f0(klauw(KLAUW, 5)[0])} N = {f0(4 * klauw(KLAUW, 5)[0])} N tegen ongeveer 20 N gewicht (factor 10). '
          'De klauw is met opzet geen sterke klem: zo kan hij de honingraat van het blad niet indrukken.',
          '- **Voedingsbox:** 0,7 kg = 7 N op 4 pluggen voor holle deuren, dus 2 N per plug. Vraag aan de plug: ≥ 20 N '
          'per stuk in de onderhuid van 3 mm (factor 10).',
          '- **Fanschroeven M4 x 10:** kop 1 mm verzonken in een plaat van 6 mm, dus 5 mm indraaiing (fabrikant: 4 tot 6). '
          'Met plaat ±0,2 en schroeflengte ±0,2 (ISO 4759-1, klasse A): 4,6 tot 5,4 mm.', '']
    (HIER / 'Berekeningen.md').write_text('\n'.join(L) + '\n', encoding='utf-8')
    print('\n'.join(L))


if __name__ == '__main__':
    maak()
