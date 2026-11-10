# Sterkteberekening van de schaar (voorbeelden/lastafel): het evenwicht van de twee armen en het bovenframe per kant,
# voor elke stand en elke lastverdeling; daaruit het moment en de normaalkracht over de arm, de krachten in de pennen,
# de spanningen, de stuik in de ogen, het bovenframe en het kantelen. Schrijft docs/Sterkte.md.
# Maten zoals in maak-lastafel.mjs. Gebruik: python voorbeelden/lastafel/docs/sterkte.py
import math, os
import numpy as np

g = 9.81
L, Z0, YB, DT = 2080.0, -1000.0, 75.0, 75.0
P0 = (-850.0, 60.0)                 # cilindervoet (z, y)
S, N = 775.0, 90.0                  # ophangpunt op arm B
LAST, EIGEN = 4000.0, 462.0         # kg: nominale last met blad, en wat meebeweegt
FY, FU = 355.0, 510.0               # S355
FY_PEN = 650.0                      # 42CrMo4 veredeld
VEILIG = 1.5                        # op de vloeigrens, bij de nominale last (EN 1570-1: berekening met de nominale last)
WAND = float(os.environ.get('WAND', 10))   # wanddikte arm (wang en omtrekband)
NAAF = float(os.environ.get('NAAF', 0))   # extra dikte van een naaf rond elke boring (per wang)
HMID = float(os.environ.get('HMID', 180)) # hoogte van de arm in het midden

def punten(H):
    sn = (H - YB - DT) / L; c = math.sqrt(1 - sn * sn)
    A0 = np.array([Z0, YB]); A1 = np.array([Z0 + L * c, H - DT])
    B0 = np.array([Z0, H - DT]); B1 = np.array([Z0 + L * c, YB])
    C = (A0 + A1) / 2
    K = np.array([Z0 + S * c + N * sn, H - DT - S * sn + N * c])
    return sn, c, A0, A1, B0, B1, C, K

def mom(p, q, f):  # moment om p van kracht f in q (z naar rechts, y omhoog)
    d = q - p
    return d[0] * f[1] - d[1] * f[0]

def oplossen(H, P, zl):
    """per kant: last P (N, op het bovenframe) op z = zl; onbekenden Ax Ay Ra Cx Cy Bx By Rb F"""
    sn, c, A0, A1, B0, B1, C, K = punten(H)
    u = (K - np.array(P0)); u = u / np.linalg.norm(u)
    Mx = np.zeros((9, 9)); r = np.zeros(9)
    ez, ey = np.array([1.0, 0]), np.array([0, 1.0])
    # arm A: (Ax,Ay) in A0, (0,Ra) in A1, (Cx,Cy) in C
    Mx[0, [0, 3]] = 1; Mx[1, [1, 2, 4]] = 1
    Mx[2, 2] = mom(A0, A1, ey); Mx[2, 3] = mom(A0, C, ez); Mx[2, 4] = mom(A0, C, ey)
    # arm B: (Bx,By) in B0, (0,Rb) in B1, (-Cx,-Cy) in C, F·u in K
    Mx[3, [5]] = 1; Mx[3, 3] = -1; Mx[3, 8] = u[0]
    Mx[4, [6, 7]] = 1; Mx[4, 4] = -1; Mx[4, 8] = u[1]
    Mx[5, 7] = mom(B0, B1, ey); Mx[5, 3] = -mom(B0, C, ez); Mx[5, 4] = -mom(B0, C, ey); Mx[5, 8] = mom(B0, K, u)
    # bovenframe: (-Bx,-By) in B0, (0,-Ra) in A1, (0,-P) in zl
    Mx[6, 5] = -1
    Mx[7, 6] = -1; Mx[7, 2] = -1; r[7] = P
    Mx[8, 2] = -mom(B0, A1, ey); r[8] = mom(B0, np.array([zl, H]), np.array([0, -P])) * -1
    x = np.linalg.solve(Mx, r)
    return dict(zip(['Ax', 'Ay', 'Ra', 'Cx', 'Cy', 'Bx', 'By', 'Rb', 'F'], x)), (A0, A1, B0, B1, C, K, u, sn, c)

def sectie(t):
    h = 116 + (HMID - 116) * (1 - abs(t - L / 2) / (L / 2))
    b, w = 45.0, WAND
    I = (b * h ** 3 - (b - 2 * w) * (h - 2 * w) ** 3) / 12
    A = b * h - (b - 2 * w) * (h - 2 * w)
    return h, A, I, I / (h / 2)

def langs(F, start, eind, krachten):
    """moment en normaalkracht in de arm van start naar eind; krachten = [(punt, vector)] op de arm"""
    e = (eind - start) / np.linalg.norm(eind - start)
    uit = []
    for t in np.linspace(0, L, 209):
        p = start + e * t
        M = 0.0; Nn = 0.0
        for q, f in krachten:
            if np.dot(q - start, e) <= t + 1e-9:
                M += mom(p, q, f); Nn += -np.dot(f, e)
        h, A, I, W = sectie(t)
        uit.append((t, M / 1e6, Nn / 1e3, abs(Nn) / A + abs(M) / W))
    return uit

STANDEN = [370, 825, 1425]
LASTGEVALLEN = [  # (naam, deel van de last op de zwaarste kant, z van het zwaartepunt)
    ('gelijk verdeeld', 0.5, 0.0),
    ('op de helft naar de rollen', 0.5, 600.0),
    ('op de helft naar de vaste scharnieren', 0.5, -600.0),
    ('op een kwart (rolkant, één kant)', 0.75, 600.0),
    ('op een kwart (vaste kant, één kant)', 0.75, -600.0),
]
res = []
for H in STANDEN:
    for naam, deel, zl in LASTGEVALLEN:
        P = (LAST * deel + EIGEN / 2) * g
        k, (A0, A1, B0, B1, C, K, u, sn, c) = oplossen(H, P, zl)
        armA = langs(k, A0, A1, [(A0, np.array([k['Ax'], k['Ay']])), (C, np.array([k['Cx'], k['Cy']])), (A1, np.array([0, k['Ra']]))])
        armB = langs(k, B0, B1, [(B0, np.array([k['Bx'], k['By']])), (K, k['F'] * u), (C, -np.array([k['Cx'], k['Cy']])), (B1, np.array([0, k['Rb']]))])
        res.append(dict(H=H, naam=naam, P=P, k=k, armA=armA, armB=armB))

def maxs(arm): return max(arm, key=lambda r: r[3])
ergste = max(res, key=lambda r: max(maxs(r['armA'])[3], maxs(r['armB'])[3]))
s_max = max(maxs(ergste['armA'])[3], maxs(ergste['armB'])[3])
s_toel = FY / VEILIG

# pennen: grootste kracht per scharnier over alle gevallen
def kr(r, a, b): return math.hypot(r['k'][a], r['k'][b]) / 1e3
pen = {
    'A onder (bok)': max(kr(r, 'Ax', 'Ay') for r in res),
    'B boven (blok)': max(kr(r, 'Bx', 'By') for r in res),
    'middenpen': max(kr(r, 'Cx', 'Cy') for r in res),
    'cilinder (stangoog)': max(abs(r['k']['F']) / 1e3 for r in res),
    'rol A (boven)': max(abs(r['k']['Ra']) / 1e3 for r in res),
    'rol B (onder)': max(abs(r['k']['Rb']) / 1e3 for r in res),
}
D = {'A onder (bok)': 40, 'B boven (blok)': 40, 'middenpen': 31, 'cilinder (stangoog)': 40}
t_oog = 45.0 + NAAF          # lagerbus dwars door de koker: de pen draagt over de hele breedte van de arm
penrij = []
for n, f in pen.items():
    if n.startswith('rol'): continue
    d = D[n]
    tau = f * 1e3 / (math.pi * d * d / 4) / (2 if n.startswith('cilinder') else 1)   # stangoog: dubbele snede in de ogen
    t = 24.0 if n.startswith('cilinder') else 12.0 if n.startswith('B') else t_oog
    stuik = f * 1e3 / (d * t)
    penrij.append((n, f, d, tau, 0.58 * FY_PEN / VEILIG, t, stuik, 1.5 * FY / VEILIG))

# bovenframe: langsligger 110 x 50 x 5 op het scharnier B (z -1000) en de rol A; 3 steunvlakken per kant
def ligger(H, P):
    sn, c, A0, A1, *_ = punten(H)
    zr = A1[0]; q = P / 3
    pads = [-1145.0, 0.0, 1145.0]
    # reacties uit evenwicht (twee steunpunten)
    Rr = sum(q * (z - Z0) for z in pads) / (zr - Z0); Rv = 3 * q - Rr
    zs = np.linspace(-1195, 1195, 481)
    M = [sum(q * (zz - z) for z in pads if z <= zz) - (Rv * (zz - Z0) if zz >= Z0 else 0) - (Rr * (zz - zr) if zz >= zr else 0) for zz in zs]
    return max(abs(m) for m in M) / 1e6
I_l = (50 * 110 ** 3 - 40 * 100 ** 3) / 12; W_l = I_l / 55
M_lig = max(ligger(H, (LAST * 0.5 + EIGEN / 2) * g) for H in STANDEN)
s_lig = M_lig * 1e6 / W_l

# kantelen (EN 1570-1): last op de helft van het blad (zwaartepunt 600 uit het midden), horizontale kracht 5 % van
# last + eigen gewicht op werkhoogte, in de lengte en in de breedte
m_lift, m_tafel = 1360.0, 723.0
H_w = 1425 + 200
kant = []
for richting, half, e in [('lengte', 1195.0, 600.0), ('breedte', 595.0, 300.0)]:
    Wst = (m_lift + m_tafel + LAST - m_tafel) * g
    Mst = (m_lift * g) * half + (m_tafel * g) * half + ((LAST - m_tafel) * g) * (half - e)
    Mkant = 0.05 * Wst * H_w
    kant.append((richting, Mst / 1e6, Mkant / 1e6, Mst / Mkant))

f = lambda x, n=0: f"{x:,.{n}f}".replace(',', ' ').replace('.', ',')
ok = lambda a, b: '✓' if a <= b else '✗'
rijen = []
for r in res:
    a, b = maxs(r['armA']), maxs(r['armB'])
    rijen.append(f"| {f(r['H'])} | {r['naam']} | {f(r['k']['F']/1e3,1)} | {f(math.hypot(r['k']['Cx'], r['k']['Cy'])/1e3,1)} | {f(max(abs(x[1]) for x in r['armA']),2)} | {f(max(abs(x[1]) for x in r['armB']),2)} | {f(a[3])} | {f(b[3])} {ok(max(a[3], b[3]), s_toel)} |")

md = f"""# Sterkteberekening heftafel

Gemaakt met `docs/sterkte.py`. Per kant van de schaar heb ik het evenwicht opgelost: twee armen en het bovenframe, met
9 onbekenden (de scharnieren, de 2 rollen, de middenpen en de cilinderkracht). Dat staat in elke stand, voor 5
lastverdelingen volgens EN 1570-1:
- gelijk verdeeld;
- op de helft van het blad;
- op een kwart van het blad, waarbij één kant 75 % draagt.

De last is {f(LAST)} kg met het blad, plus {f(EIGEN)} kg eigen gewicht. Toelaatbaar is de vloeigrens gedeeld door
{VEILIG}: S355 dus {f(s_toel)} MPa.

**Arm:** een koker uit 2 wangen en een omtrekband van {f(WAND)} mm, 45 breed en 116 tot {f(HMID)} hoog, met een
lagerbus dwars door de koker in elke boring (45 lang).
{f"**Naven:** {f(NAAF)} mm extra rond elke boring." if NAAF else ""}

## 1. Krachten en spanningen per stand en lastgeval

| H (mm) | Last | Cilinder (kN) | Middenpen (kN) | M arm A (kNm) | M arm B (kNm) | σ A (MPa) | σ B (MPa) |
|--:|---|--:|--:|--:|--:|--:|--:|
""" + "\n".join(rijen) + f"""

**Het zwaarste geval:** {ergste['naam']} op H = {f(ergste['H'])}. Daar is σ = {f(s_max)} MPa, tegenover
{f(s_toel)} MPa toelaatbaar: {ok(s_max, s_toel)}. De gebruiksgraad is {f(100 * s_max / s_toel)} %.

Buiging overheerst. Het grootste moment zit in arm B, net naast het ophangpunt van de cilinder.

## 2. Pennen en ogen

Afschuiving: enkele snede, behalve het stangoog (dubbele snede). Toelaatbaar is 0,58 · {f(FY_PEN)} / {VEILIG} MPa
(42CrMo4). Stuik in de ogen: toelaatbaar 1,5 · fy / {VEILIG} = {f(1.5 * FY / VEILIG)} MPa (EN 1993-1-8, pen in een
gat).

| Scharnier | Kracht (kN) | Pen Ø | τ (MPa) | τ toel. | Plaat t (mm) | Stuik (MPa) | Stuik toel. |
|---|--:|--:|--:|--:|--:|--:|--:|
""" + "\n".join(f"| {n} | {f(fk,1)} | {d} | {f(t)} | {f(tt)} {ok(t, tt)} | {f(tp)} | {f(st)} | {f(stt)} {ok(st, stt)} |" for n, fk, d, t, tt, tp, st, stt in penrij) + f"""

**Rollen:** de rol A boven draagt hoogstens {f(pen['rol A (boven)'],1)} kN, de rol B onder {f(pen['rol B (onder)'],1)}
kN. Kies een steunrol met een statisch draaggetal C₀ van minstens 1,5 x die kracht, bv. INA NUTR 40 (kijk het
draaggetal na in de catalogus).

## 3. Bovenframe

Elke langsligger (koker 110 x 50 x 5, W = {f(W_l)} mm³) ligt op 2 steunpunten: het scharnier B en de rol A. Hij draagt
3 steunvlakken. Het grootste moment is {f(M_lig,2)} kNm, dus σ = {f(s_lig)} MPa {ok(s_lig, s_toel)}. In de hoogste
stand steekt het steunvlak aan de rolkant ± 500 mm uit.

## 4. Kantelen (EN 1570-1)

De zwaarste stand is de hoogste: werkhoogte {f(H_w)} mm. De last ligt op de helft van het blad, zodat het zwaartepunt
600 mm uit het midden ligt in de lengte en 300 mm in de breedte. Daarbij komt een horizontale kracht van 5 % van het
gewicht, op de werkhoogte.

| Richting | Moment dat hem rechthoudt (kNm) | Kantelmoment (kNm) | Verhouding |
|---|--:|--:|--:|
""" + "\n".join(f"| {r} | {f(a,1)} | {f(b,1)} | {f(c,1)} {'✓' if c >= 1.5 else '✗'} |" for r, a, b, c in kant) + f"""

Hij is stabiel zonder verankering. Verankeren (8 x M16) blijft aan te raden als er zwaar met een kraan op en af wordt
geladen.
"""
uit = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Sterkte.md')
open(uit, 'w', encoding='utf8', newline='\n').write(md)
print(f"wand {WAND} naaf {NAAF}: σmax {s_max:.0f} / {s_toel:.0f} MPa ({ergste['naam']}, H {ergste['H']}); ligger {s_lig:.0f}")
for r in penrij: print(f"  {r[0]}: {r[1]:.1f} kN τ {r[3]:.0f}/{r[4]:.0f} stuik {r[6]:.0f}/{r[7]:.0f}")
print('  rollen', round(pen['rol A (boven)'], 1), round(pen['rol B (onder)'], 1), 'kantelen', [round(k[3], 1) for k in kant])
