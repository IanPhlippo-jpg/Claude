"""Grijpplanner: van wat de camera ziet naar hoe de robot het stuk pakt.

De camera boven de band geeft per stuk een rechthoek (lengte, breedte, middelpunt op de band, draaiing) en de dikte (de
afstand tot de bovenkant). Daaruit rekent deze module:
  1. de draaiing van A6: de lange kant van de vlakgrijper langs de lange kant van het stuk (binnen ±90°, de pols draait zo
     weinig mogelijk);
  2. het grijppunt: het midden van het stuk; is het stuk korter dan de grijper, dan schuift de grijper zo dat het stuk
     onder zo weinig mogelijk zones ligt (minder lek door de zelfsluitende ventielen van de onbedekte openingen);
  3. welke zones aan moeten (elke zone met bedekking boven de drempel) en de houdkracht die dat geeft;
  4. de grootste toegelaten versnelling met veiligheid S, plat en rechtop neergelegd; is die te klein, dan weigert hij het
     stuk (de operator krijgt een melding).

Gebruik: python voorbeelden/robotarm/besturing/greep.py  (rekent de voorbeelden na en schrijft docs/Grijpen.md)
De maten van de vlakgrijper staan in GRIJPER; de besturing (LinuxCNC/EtherCAT) roept plan() aan per stuk.
"""
from dataclasses import dataclass
import math
import os

g = 9.81


@dataclass
class Balk:
    naam: str
    v: float            # mm, hart van de balk dwars op de lengte (grijperassen)
    b: float            # mm, breedte van het zuigvlak
    n_per_mm: float     # N houdkracht per mm volledig bedekte lengte bij -250 mbar (catalogus Schmalz)


@dataclass
class Grijper:
    lengte: float = 1972.0       # mm, zuigvlak van de balken
    balken: tuple = (
        Balk('FA-M 1972 x 130 (zone 1)', -185, 130, 550 / 442),   # 550 N bij -250 mbar voor 442 mm (Schmalz FA-M)
        Balk('FMP-60 1972 x 60 (zone 2)', 0, 60, 433 / 1234),     # 433 N bij -250 mbar voor 1234 mm (Schmalz FMP-60)
        Balk('FA-M 1972 x 130 (zone 3)', 185, 130, 550 / 442),
    )
    drempel: float = 0.10        # een balk gaat aan vanaf 10 % bedekking van zijn zuigvlak
    S: float = 2.0               # veiligheid (Schmalz: 2 bij draaiende bewegingen)
    mu: float = 0.5              # wrijving schuim op hout/HPL (rechtop: de kracht langs het vlak)
    a_nominaal: float = 4.0      # m/s², gewenste baanversnelling
    massa: float = 45.0          # kg, de grijper (raam, 3 balken, ejectors, slangen)
    draagvermogen: float = 120.0 # kg aan de flens (robot PR 120)

    @property
    def breedte(self):
        return max(abs(k.v) + k.b / 2 for k in self.balken) * 2


GRIJPER = Grijper()


@dataclass
class Stuk:
    naam: str
    lengte: float      # mm
    breedte: float     # mm
    dikte: float       # mm
    x: float           # mm, middelpunt op de band (robotassen)
    z: float
    hoek: float        # graden om de verticale as, lange kant t.o.v. de X-as
    dichtheid: float = 650.0  # kg/m³ (spaanplaat/MDF ±650, massief eiken ±700, tubespaandeur ±450)

    @property
    def massa(self):
        return self.lengte * self.breedte * self.dikte * 1e-9 * self.dichtheid


def _overlap(a0, a1, b0, b1):
    return max(0.0, min(a1, b1) - max(a0, b0))


def plan(stuk: Stuk, G: Grijper = GRIJPER):
    """geeft een dict met de pose voor de robot, de zones, de houdkracht en de toegelaten versnelling (of weigering)"""
    # 1. lange kant van het stuk langs de grijper; draaiing binnen ±90°
    hoek = stuk.hoek
    L, B = stuk.lengte, stuk.breedte
    if B > L:
        L, B, hoek = B, L, hoek + 90
    while hoek > 90:
        hoek -= 180
    while hoek <= -90:
        hoek += 180
    # 2. grijppunt: in de grijperassen (u langs de lengte, v dwars) ligt het stuk van -L/2..L/2 om zijn midden. Schuif de
    #    grijper (u binnen de randen van het stuk, v over de balken) zodat de houdkracht het grootst is bij zo weinig
    #    mogelijk half bedekte balken (lek door de zelfsluitende ventielen is klein, maar niet nul).
    beste = None
    us = [0.0] if L >= G.lengte else [i * 10.0 for i in range(-int((G.lengte - L) / 20), int((G.lengte - L) / 20) + 1)]
    vs = [0.0] if B >= G.breedte else [k.v + d for k in G.balken for d in (-20.0, 0.0, 20.0)]
    for du in us:
        for dv in vs:
            zones, F = [], 0.0
            for i, k in enumerate(G.balken):
                lu = _overlap(-G.lengte / 2, G.lengte / 2, du - L / 2, du + L / 2)
                lv = _overlap(k.v - k.b / 2, k.v + k.b / 2, dv - B / 2, dv + B / 2)
                if lu * lv >= G.drempel * G.lengte * k.b:
                    zones.append(i)
                    F += k.n_per_mm * lu * lv / k.b
            if not zones:
                continue
            kost = (-round(F, 1), len(zones), abs(du) + abs(dv))
            if beste is None or kost < beste[0]:
                beste = (kost, du, dv, zones, F)
    if beste is None:
        return {'stuk': stuk.naam, 'pakbaar': False, 'reden': 'geen zone voldoende bedekt (stuk te klein of te smal)'}
    _, du, dv, zones, F = beste
    m = stuk.massa
    a_plat = F / (m * G.S) - g                           # m/s², plat dragen
    a_recht = F * G.mu / (m * G.S) - g                    # m/s², rechtop (de kracht langs het vlak)
    a_toe = min(G.a_nominaal, a_plat, a_recht)
    te_zwaar = m + G.massa > G.draagvermogen
    pakbaar = a_toe >= 1.0 and not te_zwaar
    # pose: het grijppunt = middelpunt van het stuk min de verschuiving (in bandassen, gedraaid met de hoek)
    c, s = math.cos(math.radians(hoek)), math.sin(math.radians(hoek))
    gx, gz = stuk.x - (du * c - dv * s), stuk.z - (du * s + dv * c)
    return {
        'stuk': stuk.naam, 'pakbaar': pakbaar, 'massa': m, 'A6': hoek, 'grijppunt': (gx, gz), 'hoogte': stuk.dikte,
        'zones': zones, 'houdkracht': F, 'a_plat': a_plat, 'a_rechtop': a_recht, 'a_toegelaten': a_toe,
        'reden': '' if pakbaar else (f'te zwaar: {m:.0f} kg + grijper {G.massa:.0f} kg > {G.draagvermogen:.0f} kg' if te_zwaar else 'houdkracht te klein voor veilig bewegen'),
    }


VOORBEELDEN = [
    Stuk('Deur 2115 x 1015 x 54 (60 kg)', 2115, 1015, 54, 1950, 0, 0, dichtheid=60 / (2.115 * 1.015 * 0.054)),
    Stuk('Plint 2400 x 70 x 12 (eik)', 2400, 70, 12, 1900, 150, 12, dichtheid=700),
    Stuk('Plint 1200 x 90 x 15 (MDF), dwars', 90, 1200, 15, 2000, -300, 0, dichtheid=750),
    Stuk('Plank 600 x 300 x 18 (spaanplaat)', 600, 300, 18, 1800, 400, -30, dichtheid=650),
    Stuk('Plankje 200 x 100 x 18', 200, 100, 18, 2100, 0, 45, dichtheid=650),
    Stuk('Paneel 2500 x 1250 x 38 (zwaar)', 2500, 1250, 38, 1950, 0, 0, dichtheid=700),
    Stuk('Latje 1000 x 30 x 20', 1000, 30, 20, 1950, 0, 0, dichtheid=700),
]

if __name__ == '__main__':
    rij = []
    for st in VOORBEELDEN:
        p = plan(st)
        rij.append(p)
        print(f"{st.naam:38s} {'ok ' if p['pakbaar'] else 'NEE'} m={p.get('massa', 0):5.1f} kg zones={len(p.get('zones', []))} F={p.get('houdkracht', 0):6.0f} N a={p.get('a_toegelaten', 0):4.1f} A6={p.get('A6', 0):5.1f}")
    # controles
    deur = rij[0]
    assert deur['pakbaar'] and len(deur['zones']) == 3 and deur['a_toegelaten'] >= 4.0
    plint = rij[1]
    assert plint['pakbaar'] and abs(plint['A6'] - 12) < 1e-9 and len(plint['zones']) == 1, plint['zones']  # één balk: de planner kiest die met de meeste houdkracht
    dwars = rij[2]
    assert dwars['pakbaar'] and abs(dwars['A6'] - 90) < 1e-9, dwars['A6']
    klein = rij[4]
    assert klein['pakbaar'] and len(klein['zones']) == 1, klein['zones']
    assert rij[5]['pakbaar'] is False and 'te zwaar' in rij[5]['reden']
    # te smal latje: de besturing moet het weigeren of het moet in één zone passen; nooit zonder zone pakken
    assert rij[6]['pakbaar'] is False or len(rij[6]['zones']) >= 1
    # md voor het boek
    uit = ['# Grijpen: welke stukken en hoe\n', 'Gemaakt door `besturing/greep.py`. De camera meet elk stuk; de planner kiest de draaiing van A6, het grijppunt en de zones, en rekent de toegelaten versnelling (veiligheid 2, plat en rechtop).\n',
           f'Vlakgrijper {GRIJPER.lengte:.0f} x {GRIJPER.breedte:.0f} mm: ' + ', '.join(k.naam for k in GRIJPER.balken) + '; houdkracht volgens Schmalz bij -250 mbar. Zone = balk (0, 1, 2).\n',
           '| Stuk | Massa | Pakbaar | Zones aan | Houdkracht | Versnelling plat / rechtop / toegelaten | A6 |', '|---|--:|---|--:|--:|--:|--:|']
    for p in rij:
        if 'massa' not in p:
            uit.append(f"| {p['stuk']} | | nee: {p['reden']} | | | | |")
            continue
        uit.append(f"| {p['stuk']} | {p['massa']:.1f} kg | {'ja' if p['pakbaar'] else 'nee: ' + p['reden']} | {len(p['zones'])} | {p['houdkracht']:.0f} N | {p['a_plat']:.1f} / {p['a_rechtop']:.1f} / {p['a_toegelaten']:.1f} m/s² | {p['A6']:.0f}° |")
    open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'Grijpen.md'), 'w', encoding='utf-8').write('\n'.join(uit) + '\n')
    print('alle controles ok')
