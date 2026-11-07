"""Ventilatierooster voor de inbouwafzuiging, lasergesneden uit RVS 430 van 1,5 mm (magnetisch: het klikt op 4 magneten
in het bovenframe), 2026-11-05.

In het midden het LB-monogram van Lush Beauty (zonder de tekst, op vraag van Ian), rondom een patroon van
chevronsleuven zoals bij ingebouwde nagelstofafzuigers.

Maakbaar met een laser:
- geen losse eilanden: elk stuk staal dat los zou vallen krijgt automatisch bruggetjes naar de rest van de plaat;
- geen stegen en geen sleuven smaller dan MIN_STEG (1,5 mm = de plaatdikte);
- een rand van RAND mm zonder gaten, zodat de plaat stevig op de bak ligt.

Schrijft naast dit script (in ../laser/):
- rooster.dxf: contouren in mm voor de lasersnijder (laag SNIJDEN), oorsprong in het midden van de plaat;
- rooster.loops: dezelfde contouren voor de Phlippo CAD-generator;
- rooster-voorbeeld.png: hoe het eruitziet met een witte filtermat eronder.
Gebruik: python voorbeelden/afzuiging/logo/rooster.py  (eerst logo/trace.py)"""
import json
import math
from pathlib import Path

import ezdxf
import numpy as np
from PIL import Image, ImageDraw
from shapely import affinity
from shapely.geometry import LineString, Polygon, box
from shapely.ops import nearest_points, unary_union

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / 'laser'

BREEDTE, HOOGTE, HOEK = 222.0, 222.0, 6.0  # plaat (mm): even groot als het bovenframe, dat ze volledig bedekt
DIKTE = 1.5
RAND = 11.0  # rand zonder gaten: de gaten liggen alleen boven de opening van het frame
CASSETTE = (85.5, 85.5)  # binnenmaat (Rittal SK 3171.100, vak 171 x 171) van de filtercassette (halve breedte, halve diepte): daar gaat de lucht door
LOGO_HOOGTE = 75.0
BADGE_MARGE = 5.0  # vlak staal rond het logo
MIN_STEG = 1.5
SLEUF, STEG = 3.5, 3.0  # chevronsleuven en de stegen ertussen (loodrecht gemeten)
BRUG, BRUG_AFSTAND = 2.5, 38.0  # bruggetjes die de chevrons in stukken knippen
LOGO_BRUG = 1.8  # breedte van de bruggetjes naar losse letterdelen


def rounded_rect(w, h, r):
    return box(-w / 2 + r, -h / 2 + r, w / 2 - r, h / 2 - r).buffer(r, quad_segs=8)


def to_polys(geom):
    if geom.is_empty:
        return []
    return list(geom.geoms) if hasattr(geom, 'geoms') else [geom]


def logo_shapes():
    """het LB-monogram in mm, LOGO_HOOGTE hoog, midden op 0 (y omhoog)"""
    data = json.loads((HERE / 'logo-px.loops').read_text())
    mono = unary_union([Polygon(it['outer'], [h for h in it['holes'] if len(h) >= 3]).buffer(0) for it in data['monogram']])
    minx, miny, maxx, maxy = mono.bounds
    s = LOGO_HOOGTE / (maxy - miny)
    mono = affinity.translate(mono, -(minx + maxx) / 2, -(miny + maxy) / 2)
    return affinity.scale(mono, s, -s, origin=(0, 0))


def chevrons(gebied):
    """concentrische ruiten |x| + |y| = c: links '<', rechts '>' — in stukken geknipt door bruggetjes"""
    pitch = (SLEUF + STEG) * math.sqrt(2)
    sleuf_g = SLEUF * math.sqrt(2)
    banden = []
    c = pitch * 0.5
    while c < BREEDTE:
        ring = rounded_diamond(c + sleuf_g).difference(rounded_diamond(c))
        banden.append(ring)
        c += pitch
    patroon = unary_union(banden).intersection(gebied)
    # bruggetjes: stroken langs de andere diagonaal (|x| - |y| = k * BRUG_AFSTAND), en horizontaal door het midden
    bruggen = [box(-BREEDTE, -BRUG / 2, BREEDTE, BRUG / 2)]
    for k in np.arange(-6, 7) * BRUG_AFSTAND + BRUG_AFSTAND / 2:
        for sx in (1, -1):
            for sy in (1, -1):
                # lijn |x| - |y| = k in kwadrant (sx, sy): x = sx (k + t), y = sy t met t >= max(0, -k)
                t0 = max(0.0, -k)
                pts = [(sx * (k + t), sy * t) for t in (t0, t0 + 300)]
                bruggen.append(LineString(pts).buffer(BRUG / 2, cap_style='flat'))
    patroon = patroon.difference(unary_union(bruggen))
    # te kleine of te smalle stukjes (aan de randen afgeknipt) vallen weg
    stukken = [p for p in to_polys(patroon) if p.area > 12 and not p.buffer(-SLEUF * 0.4).is_empty]
    return unary_union(stukken)


def rounded_diamond(c):
    return Polygon([(c, 0), (0, c), (-c, 0), (0, -c)])


def eilanden(plaat, rand):
    vast, los = [], []
    for p in to_polys(plaat):
        (vast if p.intersects(rand) else los).append(p)
    return vast, los


def brug(a, b, breedte):
    """een strook van a naar b, aan beide kanten 0,6 mm in het staal"""
    v = np.array(b) - np.array(a)
    n = np.linalg.norm(v)
    if n < 1e-9:
        return Polygon()
    u = v / n
    a2, b2 = np.array(a) - u * 0.6, np.array(b) + u * 0.6
    return LineString([tuple(a2), tuple(b2)]).buffer(breedte / 2, cap_style='flat')


def scheid_bogen(mono):
    """De twee halve manen van de B lopen links samen in één punt; van rechts komt een dunne wig staal tussen hen.
    Een opening mag geen vernauwing hebben en staal niet dunner zijn dan MIN_STEG, dus: langs de middellijn van de
    samengesmolten punt en van de wig komt een strook staal van MIN_STEG + 0,1 mm. Elke halve maan houdt zo een
    spitse punt; haar rand naast de wig schuift hooguit een halve strookbreedte op."""
    delen = sorted(to_polys(mono), key=lambda p: p.bounds[2])
    bogen = delen[-1]
    minx, miny, maxx, maxy = bogen.bounds
    breed = MIN_STEG + 0.1
    # de knik: het meest linkse punt van de B in het middelste deel van de hoogte
    h = maxy - miny
    midden = bogen.intersection(box(minx - 1, miny + 0.3 * h, maxx + 1, miny + 0.7 * h))
    pts = [q for g in to_polys(midden) for q in g.exterior.coords]
    tx, ty = min(pts, key=lambda q: q[0])

    def stukken(x):
        snede = bogen.intersection(LineString([(x, ty - 8), (x, ty + 8)]))
        return sorted([(g.bounds[1], g.bounds[3]) for g in getattr(snede, 'geoms', [snede]) if not g.is_empty and g.length > 1e-6])

    mid = [(tx, ty)]
    y = ty
    x = tx + 0.05
    while x < maxx:
        iv = stukken(x)
        gaten = [(iv[i][1], iv[i + 1][0]) for i in range(len(iv) - 1)]
        if gaten:  # in de wig: het gat het dichtst bij het vorige midden
            g = min(gaten, key=lambda g: abs((g[0] + g[1]) / 2 - y))
            y = (g[0] + g[1]) / 2
            mid.append((x, y))
            if g[1] - g[0] > breed + 0.6:
                break
        elif iv:  # nog in de samengesmolten punt: het stuk rond het vorige midden
            st = min(iv, key=lambda v: 0 if v[0] <= y <= v[1] else min(abs(v[0] - y), abs(v[1] - y)))
            y = (st[0] + st[1]) / 2
            mid.append((x, y))
        x += 0.05
    # de middellijn glad (lopend gemiddelde over ~1 mm), zodat de randen naast de strook vloeiend blijven
    ys = np.array([q[1] for q in mid])
    k = 21
    ys = np.convolve(np.pad(ys, k // 2, mode='edge'), np.ones(k) / k, 'valid')
    mid = [(q[0], yy) for q, yy in zip(mid, ys)]
    lijn = LineString([(tx - 1.0, mid[0][1]), *mid])
    strook = lijn.buffer(breed / 2, cap_style='flat', join_style='round').simplify(0.005)
    return unary_union([*delen[:-1], *[p for p in to_polys(bogen.difference(strook)) if p.area > 2.0]])


def bruggen(plaat_vorm, gaten, rand_ring):
    """bruggetjes tot er geen los staal meer is: telkens het grootste losse stuk aan het dichtstbijzijnde vaste staal"""
    for _ in range(200):
        plaat = plaat_vorm.difference(gaten)
        vast, los = eilanden(plaat, rand_ring)
        if not los:
            break
        land = unary_union(vast)
        los.sort(key=lambda p: -p.area)
        eiland = los[0]
        a, b = nearest_points(eiland, land)
        nieuw = [brug((a.x, a.y), (b.x, b.y), LOGO_BRUG)]
        if eiland.area > 15:
            # tweede brug aan de overkant van het eiland, zodat het niet kan doorbuigen
            ver = max(eiland.exterior.coords, key=lambda q: math.dist(q, (a.x, a.y)))
            a2, b2 = nearest_points(Polygon(eiland.exterior).buffer(0).intersection(
                box(ver[0] - 4, ver[1] - 4, ver[0] + 4, ver[1] + 4)), land)
            if math.dist((a2.x, a2.y), (a.x, a.y)) > 4:
                nieuw.append(brug((a2.x, a2.y), (b2.x, b2.y), LOGO_BRUG))
        gaten = gaten.difference(unary_union(nieuw))
    return gaten


def opschonen(plaat_vorm, gaten):
    """Alleen waar het moet: een opening met een vernauwing smaller dan MIN_STEG (ze valt uiteen als je haar r naar
    binnen schuift) wordt op die plek dichtgezet; alle andere hoeken blijven scherp zoals getekend (de laser snijdt
    de hoeken van een opening scherp). Staal dunner dan MIN_STEG tussen twee openingen wordt open gesneden."""
    r_gat, r_staal = MIN_STEG / 2 + 0.06, MIN_STEG / 2 + 0.02
    uit = []
    for g in to_polys(gaten):
        if len([q for q in to_polys(g.buffer(-r_gat)) if q.area > 1.0]) > 1:  # snippers aan een punt tellen niet
            g = g.buffer(-r_gat, join_style='mitre').buffer(r_gat, join_style='mitre')
        uit.extend(p for p in to_polys(g) if p.area > 2.0)
    gaten = unary_union(uit)
    plaat = plaat_vorm.difference(gaten)
    if any(len([q for q in to_polys(p.buffer(-r_staal)) if q.area > 1.0]) != 1 for p in to_polys(plaat)):
        plaat = plaat.buffer(-r_staal, join_style='mitre').buffer(r_staal, join_style='mitre').intersection(plaat_vorm)
        return unary_union([p for p in to_polys(plaat_vorm.difference(plaat)) if p.area > 2.0])
    return gaten


def maak():
    plaat_vorm = rounded_rect(BREEDTE, HOOGTE, HOEK)
    binnen = rounded_rect(BREEDTE - 2 * RAND, HOOGTE - 2 * RAND, max(HOEK, 2.0))
    mono = logo_shapes()
    logo = scheid_bogen(mono)
    # laserregels in het logo: sleufjes smaller dan MIN_STEG dicht, stegen smaller dan MIN_STEG open
    r = MIN_STEG / 2
    logo = logo.buffer(r, join_style='mitre').buffer(-r, join_style='mitre')  # dunne stegen weg
    logo = logo.buffer(-r, join_style='mitre').buffer(r, join_style='mitre')  # dunne sleufjes weg
    lminx, lminy, lmaxx, lmaxy = mono.bounds
    badge = box(lminx - BADGE_MARGE, lminy - BADGE_MARGE, lmaxx + BADGE_MARGE, lmaxy + BADGE_MARGE).buffer(6, quad_segs=8)
    badge = badge.buffer(-6, quad_segs=8)
    gebied = binnen.difference(badge.buffer(STEG))
    gaten = unary_union([logo, chevrons(gebied)])

    rand_ring = plaat_vorm.difference(binnen)
    for _ in range(8):
        gaten = bruggen(plaat_vorm, gaten, rand_ring)
        schoon = opschonen(plaat_vorm, gaten)
        if schoon.symmetric_difference(gaten).area < 1e-3:
            break
        gaten = schoon
    plaat = plaat_vorm.difference(gaten).buffer(0)
    gaten = to_polys(gaten)
    return plaat_vorm, plaat, gaten, mono


def controle(plaat_vorm, plaat, gaten):
    rand_ring = plaat_vorm.difference(rounded_rect(BREEDTE - 2 * RAND, HOOGTE - 2 * RAND, 2.0))
    vast, los = eilanden(plaat, rand_ring)
    r = MIN_STEG / 2 - 0.02
    # een vernauwing smaller dan MIN_STEG: het stuk valt uiteen (of verdwijnt) als je het r naar binnen verschuift
    delen = lambda g: len([q for q in to_polys(g.buffer(-r)) if q.area > 1.0])  # snippers aan een punt tellen niet
    smalle_stegen = sum(1 for p in to_polys(plaat) if delen(p) != 1)
    smalle_sleuven = sum(1 for g in gaten if delen(g) != 1)
    open_cm2 = sum(g.area for g in gaten) / 100
    return {
        'plaat_mm': [BREEDTE, HOOGTE, DIKTE],
        'stukken_staal': len(vast) + len(los),
        'losse_eilanden': len(los),
        'gaten': len(gaten),
        'open_cm2': round(open_cm2, 1),
        'open_procent': round(100 * open_cm2 * 100 / plaat_vorm.area, 1),
        'open_boven_cassette_cm2': round(sum(g.intersection(box(-CASSETTE[0], -CASSETTE[1], CASSETTE[0], CASSETTE[1])).area for g in gaten) / 100, 1),
        'stukken_staal_met_steg_onder_min': smalle_stegen,
        'sleuven_met_vernauwing_onder_min': smalle_sleuven,
        'massa_g': round(plaat.area * DIKTE * 8.0e-3, 0),
    }


def ring_pts(ring):
    pts = [(round(x, 3), round(y, 3)) for x, y in ring.coords]
    if pts[0] == pts[-1]:
        pts = pts[:-1]
    out = []
    for p in pts:  # dubbele punten weg
        if not out or math.dist(p, out[-1]) > 0.02:
            out.append(p)
    return out


def klauw_vorm(naaf, arm, breed, gat):
    w = breed / 2
    punt = lambda x, r: LineString([(x, 0), (x, 0.001)]).buffer(r, quad_segs=48)
    vorm = unary_union([Polygon([(0, -w), (arm - w, -w), (arm - w, w), (0, w)]), punt(arm - w, w), punt(0, naaf)])
    return vorm, punt(0, gat / 2)


def klauw_dxf():
    """stalen klauwen, lasergesneden: 4 voor de module (RVS 304, 4 mm, naaf R6,5, arm 8 x 18, gat Ø4,2 tappen M5) en
    2 voor de draaiknop (RVS 304, 3 mm, naaf R4,5, arm 6 x 15, gat Ø2,5 tappen M3)"""
    for naam, (naaf, arm, breed, gat), n, stap in (('klauwen-4x-RVS304-4mm.dxf', (6.5, 18.0, 8.0, 4.2), 4, 32),
                                                   ('dialklauwen-2x-RVS304-3mm.dxf', (4.5, 15.0, 6.0, 2.5), 2, 26)):
        vorm, gatv = klauw_vorm(naaf, arm, breed, gat)
        doc = ezdxf.new('R2010', setup=True)
        doc.units = ezdxf.units.MM
        doc.header['$INSUNITS'] = 4
        doc.layers.add('SNIJDEN', color=1)
        msp = doc.modelspace()
        for k in range(n):
            for ring in (vorm.exterior, gatv.exterior):
                msp.add_lwpolyline([(x + k * stap, y) for x, y in ring.coords], close=True, dxfattribs={'layer': 'SNIJDEN'})
        doc.saveas(OUT / naam)


def schrijf(plaat_vorm, plaat, gaten, rapport):
    OUT.mkdir(exist_ok=True)
    gaten = [g.simplify(0.01, preserve_topology=True) for g in gaten]
    loops = {'outer': ring_pts(plaat_vorm.exterior), 'holes': [ring_pts(g.exterior) for g in gaten], 'dikte': DIKTE, 'rapport': rapport}
    (OUT / 'rooster.loops').write_text(json.dumps(loops))
    doc = ezdxf.new('R2010', setup=True)
    doc.units = ezdxf.units.MM
    doc.header['$INSUNITS'] = 4
    doc.layers.add('SNIJDEN', color=1)
    msp = doc.modelspace()
    for lp in [loops['outer'], *loops['holes']]:
        msp.add_lwpolyline(lp, close=True, dxfattribs={'layer': 'SNIJDEN'})
    doc.saveas(OUT / 'rooster.dxf')
    # de stalen klauwen (klauw_dxf) zijn vervangen door geprinte PETG-klauwen: geen laserbestanden meer
    # voorbeeld: staal op een witte filtermat, 8 px per mm, 4x groter getekend en verkleind (scherpe randen)
    k, ss = 8, 4
    W, H = int(BREEDTE * k) + 80, int(HOOGTE * k) + 80
    im = Image.new('RGB', (W * ss, H * ss), (40, 40, 44))
    d = ImageDraw.Draw(im)
    to_px = lambda pts: [((W / 2 + x * k) * ss, (H / 2 - y * k) * ss) for x, y in pts]
    d.polygon(to_px(loops['outer']), fill=(196, 199, 203))
    for h in loops['holes']:
        d.polygon(to_px(h), fill=(236, 236, 232))
    im = im.resize((W, H), Image.LANCZOS)
    im.save(OUT / 'rooster-voorbeeld.png')


if __name__ == '__main__':
    plaat_vorm, plaat, gaten, mono = maak()
    rapport = controle(plaat_vorm, plaat, gaten)
    schrijf(plaat_vorm, plaat, gaten, rapport)
    print(json.dumps(rapport, indent=1))
