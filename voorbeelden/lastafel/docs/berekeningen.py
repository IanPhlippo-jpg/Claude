# Berekeningen van de schaarheftafel (voorbeelden/lastafel): kinematica, cilinderkracht en druk over de hele slag,
# knik van de stang, pomp en motor, zakken, valbeveiliging, en de tafel. Schrijft docs/Berekeningen.md.
# Maten zoals in maak-lastafel.mjs (M). Gebruik: python voorbeelden/lastafel/docs/berekeningen.py
import math, os

g = 9.81
L, Z0, YB, DT = 2080.0, -1000.0, 75.0, 75.0          # arm, vaste scharnieren, hart onder, hart onder de bovenkant
HMIN, HMAX = 370.0, 1425.0
P0 = (60.0, -850.0)                                   # cilindervoet (y, z)
S, N = 775.0, 90.0                                    # ophangpunt op arm B: s langs de arm, n loodrecht erop
BORING, STANG = 100.0, 56.0
LAST = 4000.0                                          # kg, inclusief het blad (DCT)
TAFEL = 2400 * 1200                                    # mm²

# eigen gewicht van wat meebeweegt (S355, 7850 kg/m³); kokers als holle profielen
def koker(b, h, t, l): return (2 * (b + h) - 4 * t) * t * l * 7.85e-6
bovenframe = koker(110, 50, 5, 2 * 2390) + koker(110, 60, 5, 2 * 1090)
lade = 2390 * 1090 * 3 * 7.85e-6
steun = 6 * 100 * 100 * 10 * 7.85e-6
armen = 4 * koker(138, 45, 5, 2200) + 4 * math.pi * (40**2 - 32**2) * 1000 * 7.85e-6 + math.pi * (45**2 - 36**2) * 900 * 7.85e-6
EIGEN = bovenframe + lade + steun + armen            # kg (armen volledig meegeteld: veilig)

def stand(H):
    sn = (H - YB - DT) / L
    c = math.sqrt(1 - sn * sn)
    z = Z0 + S * c + N * sn
    y = H - DT - S * sn + N * c
    return math.asin(sn), math.hypot(y - P0[0], z - P0[1]), math.atan2(y - P0[0], z - P0[1])

def kracht(H, m):
    # virtuele arbeid: m·g·dH = 2·F·dd  =>  F = m·g / (2 · dd/dH)
    dd = (stand(H + 0.5)[1] - stand(H - 0.5)[1])
    return m * g / (2 * dd)

A = math.pi * BORING**2 / 4                           # mm²
rij = []
for H in [370, 400, 450, 500, 600, 700, 825, 1000, 1200, 1425]:
    th, d, phi = stand(H)
    F = kracht(H, LAST + EIGEN)
    rij.append((H, math.degrees(th), d, math.degrees(phi), F / 1000, F / A * 10))
pmax = max(r[5] for r in rij)
Hs = [HMIN + k for k in range(0, int(HMAX - HMIN) + 1)]
pmax_fijn = max(kracht(H, LAST + EIGEN) / A * 10 for H in Hs)
dmin, dmax = stand(HMIN)[1], stand(HMAX)[1]
slag = dmax - dmin

# knik van de zuigerstang (Euler, beide uiteinden scharnierend, uitgeschoven in de hoogste stand)
E = 210000.0
I = math.pi * STANG**4 / 64
Lk = dmax
Fk = math.pi**2 * E * I / Lk**2
Fhoog = kracht(HMAX, LAST + EIGEN)
Flaag = kracht(HMIN, LAST + EIGEN)

# pomp en motor
V = 2 * A * slag / 1e6                                 # liter per volle slag
Q = 7.0                                                # l/min, tandwielpomp 2,5 cm³ x 2800 /min
t_op = V / Q * 60
eta = 0.75
P_piek = pmax_fijn * 1e5 * Q / 60000 / eta / 1000    # kW
P_motor = 2.2
I_net = P_motor * 1000 / 0.78 / (230 * 0.92)          # A (rendement 78 %, cos φ 0,92 met condensator)
dH_dt = (HMAX - HMIN) / t_op

# zakken: drukgecompenseerde smoorklep; EN 1570-1 laat maximaal 0,15 m/s toe
Q_zak = 9.0
t_zak = V / Q_zak * 60
v_zak = (HMAX - HMIN) / t_zak

# valbeveiliging: tanden steek 30, twee kapzijden van 8 mm S355 en de palplaat
tanden_overlap = lambda H: max(1, int((min(510, 540) - (stand(H)[1] - 600)) // 30))
tau_toel = 355 / math.sqrt(3) / 1.5                  # MPa, veiligheid 1,5 op de vloeigrens
val = []
for H in [370, 825, 1425]:
    F = kracht(H, LAST + EIGEN) * 1.5                  # dynamische stoot bij het invallen
    n = min(tanden_overlap(H), 12)
    opp = n * 2 * 8 * 30                               # mm²: n tanden, 2 zijden, 8 x 30
    val.append((H, F / 1000, n, opp, F / opp))

# lastafel
gaten = 12 * 24 + 11 * 23
blad = (2400 * 1200 - gaten * math.pi * 14**2) * 25
wanden = (2 * 2400 + 2 * 1176) * 12 * 175 - (2 * (24 * 2 + 23) + 2 * (12 * 2 + 11)) * math.pi * 14**2 * 12
ribben = 2 * 2376 * 12 * 175 + 2 * 1176 * 12 * 175
m_tafel = (blad + wanden + ribben) * 7.85e-6
nuttig = LAST - m_tafel

def f(x, n=0): return f"{x:,.{n}f}".replace(',', ' ').replace('.', ',')

md = f"""# Berekeningen heftafel en lastafel

Gemaakt met `docs/berekeningen.py`. De maten komen uit `maak-lastafel.mjs`. Last: {f(LAST)} kg inclusief het blad, zoals DCT
opgeeft. Daarbij komt het eigen gewicht van wat meebeweegt: bovenframe, opvanglade, steunvlakken en armen samen
± {f(EIGEN)} kg. De armen tellen hier volledig mee; in werkelijkheid draagt de cilinder er ongeveer de helft van.

## 1. Schaar

Eén schaar met twee armparen. De scharnierafstand is {f(L)} mm. De vaste scharnieren zitten op z = {f(Z0)}, de rollen
aan de andere kant. De onderste harten liggen {f(YB)} mm boven de vloer, de bovenste {f(DT)} mm onder de bovenkant.
Bovenkant H = {f(YB + DT)} + {f(L)} · sin θ.

| Bovenkant lift H (mm) | Armhoek θ | Cilinder (oog-oog, mm) | Cilinderhoek | Kracht per cilinder (kN) | Druk Ø{f(BORING)} (bar) |
|--:|--:|--:|--:|--:|--:|
""" + "\n".join(f"| {f(r[0])} | {f(r[1],1)}° | {f(r[2])} | {f(r[3],1)}° | {f(r[4],1)} | {f(r[5])} |" for r in rij) + f"""

- **Slag:** {f(slag)} mm (cilinder {f(dmin)} tot {f(dmax)} mm tussen de ogen). Gekozen: 2 x enkelwerkende plunjer- of
  zuigercilinder Ø{f(BORING)}/{f(STANG)}, slag 360, inbouwlengte ≤ {f(dmin)} mm.
- **Hoogste druk:** {f(pmax_fijn)} bar, in de laagste stand. Overdrukventiel op 140 bar; alle onderdelen zijn voor 250 bar.
- **Waarom niet zoals in de video?** Hangt de cilinder aan de as van de arm en staat zijn voet 140 mm hoog, dan wordt hij
  in de laagste stand bijna vlak (8°). De druk loopt dan op tot ± 800 bar (Ø80) of ± 520 bar (Ø100). Met het
  ophangpunt {f(N)} mm boven de arm en de voet op 60 mm start hij onder 21°. Van buiten ziet het er hetzelfde uit.

## 2. Knik van de stang (Euler, scharnierend-scharnierend)

I = π · {f(STANG)}⁴ / 64 = {f(I)} mm⁴; knik­lengte = {f(Lk)} mm (helemaal uitgeschoven):
F<sub>knik</sub> = π² · E · I / L² = {f(Fk/1000)} kN. In de hoogste stand is de kracht {f(Fhoog/1000,1)} kN, dus de
veiligheid is {f(Fk/Fhoog,1)}. In de laagste stand is de kracht {f(Flaag/1000,1)} kN, maar dan is de stang ingeschoven.

## 3. Pomp, motor en aansluiting

- Olie per volle slag (2 cilinders): {f(V,2)} l. Tandwielpomp 2,5 cm³/omw bij 2800 /min = {f(Q,1)} l/min, dus
  helemaal omhoog in **{f(t_op)} s** (gemiddeld {f(dH_dt)} mm/s).
- Vermogen bij de hoogste druk: p · Q / η = {f(P_piek,2)} kW. Gekozen: **2,2 kW, 230 V eenfasig** (DCT: 220 V tot
  2400 x 1200). Stroom ± {f(I_net,1)} A. Aansluiten met een CEE-stekker 230 V 16 A op een groep C16 of D16 (voor de
  aanloopstroom).
- Tank 12 l: dat is meer dan {f(V,1)} l nodig voor de slag, met reserve voor de koeling.

## 4. Zakken

Het zakken gebeurt door het eigen gewicht, via een zitklep 2/2 (stroomloos dicht, lekvrij) en een drukgecompenseerde
smoorklep van {f(Q_zak,0)} l/min. Helemaal omlaag duurt {f(t_zak)} s; de snelheid is ± {f(v_zak)} mm/s. EN 1570-1
laat maximaal 150 mm/s toe. In elke cilinder zit een **leidingbreukventiel**: breekt een slang, dan sluit het bij
± 1,5 x de zakstroom, en de tafel blijft staan.

## 5. Valbeveiliging (gele kap met zaagtand)

Een palplaat op de koker scharniert achteraan. Een veer drukt ze in de tanden van de kap. Bij het zakken trekt de
ontgrendeling ze 15 mm weg. Steek 30 mm: de tafel zakt hooguit één tand (± 30 mm langs de cilinder) voor ze vastzit.
Nazicht met 1,5 x de cilinderkracht (stoot bij het invallen). Afschuiving van de tanden: 2 kapzijden van 8 mm,
tandvoet 30 mm, S355, τ<sub>toel</sub> = 355 / √3 / 1,5 = {f(tau_toel)} MPa.

| H (mm) | 1,5 x F (kN) | Tanden in grip | Oppervlak (mm²) | τ (MPa) |
|--:|--:|--:|--:|--:|
""" + "\n".join(f"| {f(v[0])} | {f(v[1],1)} | {v[2]} | {f(v[3])} | {f(v[4])} {'✓' if v[4] <= tau_toel else '✗'} |" for v in val) + f"""

## 6. De lastafel

- Raster Ø28 op 100 mm, DG: 288 rastergaten en 253 diagonale gaten = **{gaten} gaten** in het blad. Elke zijwand
  heeft 3 rijen gaten (50, 100 en 150 mm onder de bovenkant).
- Massa: blad {f(blad*7.85e-6)} kg + wanden {f(wanden*7.85e-6)} kg + ribben {f(ribben*7.85e-6)} kg ≈ **{f(m_tafel)} kg**.
- Nuttige last op de heftafel met deze tafel: {f(LAST)} - {f(m_tafel)} ≈ **{f(nuttig)} kg**. DCT geeft ± 3 100 kg op
  voor 2400 x 1200 met hun M800-blad.
"""
uit = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Berekeningen.md')
open(uit, 'w', encoding='utf8').write(md)
print('pmax', round(pmax_fijn), 'bar; eigen', round(EIGEN), 'kg; tafel', round(m_tafel), 'kg; op', round(t_op), 's; val', [round(v[4]) for v in val])
