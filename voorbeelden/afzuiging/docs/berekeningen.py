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
A_ROOSTER = 140.669e-4  # m², open oppervlak van de lasersnede in de RVS-plaat (LB-monogram + sleuven)
A_FILTER = 0.170 * 0.190  # m², front van het filter
A_CASBODEM = 56 * 0.018 * 0.018  # m², 7 x 8 vensters van 18 x 18 in de cassettebodem
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
A_IN, A_UIT, H_SCHOORSTEEN = 28.5e-4, 5.5e-4, 0.03  # m², m²; bodemsleuven, achterwandsleuven, hoogteverschil (m)
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
    L += ['', 'Toerental is de fractie van het volle toerental, niet de PWM-waarde: de firmware moet het toerental '
          '(tacho) regelen of de PWM-stand per filter ijken. Het geluid volgt ΔL = 50 log10(n/n_vol) en een vrije puntbron; '
          'roosterfluit, kastresonantie en galm komen erbij (meten: poort G1).', '']

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
    for naam, r in (('40 % toerental', 0.4), ('60 %', 0.6), ('80 %', 0.8), ('100 % (boost, 120 s)', 1.0)):
        p = FAN_W * r ** 3 + p5
        verlies = p * (1 / ADAPTER['eta'] - 1) + sum(P_5V.values()) * (1 / ETA_BUCK - 1) + 0.3  # + zekering en draden
        dts = [box_dt(verlies, h) for h in H_WAND]
        L.append(rij(naam, f1(p), f1(verlies), f'{f0(dts[1])}–{f0(dts[0])}', f'{f0(T_KAMER + dts[1])}–{f0(T_KAMER + dts[0])} °C'))
    L += ['', f'De adapter mag vol vermogen leveren tot {f0(T_ADAPTER_MAX)} °C omgeving. Op de dagstanden (tot 80 % toerental) '
          'blijft de box daar ruim onder; 100 % is alleen boost en duurt 120 s. PETG blijft onder 60 °C. '
          'Model: wanden (h = 5 tot 10 W/m²K) plus de schoorsteenstroom door de bodem- en achterwandsleuven.', '']

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
