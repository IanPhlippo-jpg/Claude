"""Rond rooster voor de ronde vergelijkingsvariant van de afzuiging (2026-11-13): RVS 430, 1,5 mm, Ø228, lasergesneden.

Zelfde stijl als het rooster van 7.3 (logo/rooster.py): het LB-monogram in het midden op een vlak schildje, rondom de
chevronsleuven (sleuf 5, steg 2, overal minstens 1,6 mm staal), bruggetjes naar losse stukken, een rand van 11 mm zonder
gaten. De functies komen uit ../logo/rooster.py; alleen de vorm (rond), de persbouten en de controle zijn hier anders.

Persbouten PEM FH4-M3-6 (Ø3,0): twee tegen de rand van de frameopening (r 101,8, op 30° en 150° vóór), één in het gat van
de nok van het bovenframe (r 99,5, achteraan): de ronde plaat kan alleen in één stand liggen, het logo staat altijd recht.

Schrijft naast dit script (in laser/): rooster-rond.dxf, rooster-rond.loops, rooster-rond-voorbeeld.png en de freesmal
(freesmal-rond-mdf.dxf: MDF 12, 400 x 400, opening Ø223 voor kopieerring Ø17 en frees Ø12 -> uitsparing Ø218).
Gebruik: python voorbeelden/afzuiging/rond/rooster_rond.py"""
import json
import math
import sys
from pathlib import Path

import ezdxf
from PIL import Image, ImageDraw
from shapely.geometry import Point, box

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'logo'))
import rooster as R  # noqa: E402  (de functies van het vierkante rooster)

OUT = HERE / 'laser'
STRAAL = 114.0  # plaat Ø228, even groot als het bovenframe
RAND = 11.0  # gaten alleen binnen r 103 (frameopening r 103,5)
FILTER = (87.5, 60.0)  # ringfilter: buitenstraal, binnenstraal
DEKSEL = 75.0  # het filterdeksel onder het logo (r 75)
# plaatcoördinaten: x = X, y = -Z (vóór = -y)
PERSBOUTEN = [(101.8 * math.cos(math.radians(a)), -101.8 * math.sin(math.radians(a))) for a in (30, 150)] + [(0.0, 99.5)]
UITSPARING, RING, FREES = 218.0, 17.0, 12.0


def maak():
    plaat_vorm = Point(0, 0).buffer(STRAAL, quad_segs=32)
    binnen = Point(0, 0).buffer(STRAAL - RAND, quad_segs=32)
    mono = R.logo_shapes()
    logo = R.scheid_bogen(mono)
    r = R.MIN_STEG / 2
    logo = logo.buffer(r, join_style='mitre').buffer(-r, join_style='mitre')
    logo = logo.buffer(-r, join_style='mitre').buffer(r, join_style='mitre')
    lminx, lminy, lmaxx, lmaxy = mono.bounds
    badge = box(lminx - R.BADGE_MARGE, lminy - R.BADGE_MARGE, lmaxx + R.BADGE_MARGE, lmaxy + R.BADGE_MARGE).buffer(6, quad_segs=8).buffer(-6, quad_segs=8)
    vrij = R.PERSBOUT_VRIJ
    gebied = binnen.difference(badge.buffer(R.STEG)).difference(R.unary_union([Point(p).buffer(vrij) for p in PERSBOUTEN]))
    gaten = R.unary_union([logo, R.chevrons(gebied)])
    rand_ring = plaat_vorm.difference(binnen)
    for _ in range(8):
        gaten = R.bruggen(plaat_vorm, gaten, rand_ring)
        schoon = R.opschonen(plaat_vorm, gaten)
        if schoon.symmetric_difference(gaten).area < 1e-3:
            break
        gaten = schoon
    gaten = R.unary_union([gaten, *[Point(p).buffer(R.PERSBOUT_GAT / 2, quad_segs=8) for p in PERSBOUTEN]])
    plaat = plaat_vorm.difference(gaten).buffer(0)
    return plaat_vorm, plaat, R.to_polys(gaten)


def controle(plaat_vorm, plaat, gaten):
    rand_ring = plaat_vorm.difference(Point(0, 0).buffer(STRAAL - RAND, quad_segs=32))
    vast, los = R.eilanden(plaat, rand_ring)
    r = R.MIN_STEG / 2 - 0.02
    delen = lambda g: len([q for q in R.to_polys(g.buffer(-r)) if q.area > 1.0])
    bout = lambda g: any(g.distance(Point(p)) < 0.01 for p in PERSBOUTEN) and g.area < 10
    lucht = [g for g in gaten if not bout(g)]
    open_cm2 = sum(g.area for g in lucht) / 100
    ring = lambda r0, r1: Point(0, 0).buffer(r1, quad_segs=64).difference(Point(0, 0).buffer(r0, quad_segs=64))
    return {
        'plaat_mm': [2 * STRAAL, 2 * STRAAL, R.DIKTE],
        'stukken_staal': len(vast) + len(los),
        'losse_eilanden': len(los),
        'gaten': len(gaten),
        'open_cm2': round(open_cm2, 1),
        'open_procent': round(100 * open_cm2 * 100 / plaat_vorm.area, 1),
        # boven het deksel (r < 75) gaat de lucht eerst opzij door een spleet van 3,5 mm; daarbuiten recht naar het filter
        'open_boven_deksel_cm2': round(sum(g.intersection(Point(0, 0).buffer(DEKSEL, quad_segs=64)).area for g in lucht) / 100, 1),
        'open_buiten_deksel_cm2': round(sum(g.intersection(ring(DEKSEL, 200)).area for g in lucht) / 100, 1),
        'open_boven_ringspleet_cm2': round(sum(g.intersection(ring(FILTER[0], 200)).area for g in lucht) / 100, 1),
        'persbout_gaten': len(PERSBOUTEN),
        'persbout_hart_tot_gat_mm': round(min(Point(p).distance(g) for p in PERSBOUTEN for g in lucht) + R.PERSBOUT_GAT / 2, 2),
        'min_steg_mm': R.MIN_STEG, 'sleuf_mm': R.SLEUF, 'steg_mm': R.STEG,
        'stukken_staal_met_steg_onder_min': sum(1 for p in R.to_polys(plaat) if delen(p) != 1),
        'sleuven_met_vernauwing_onder_min': sum(1 for g in gaten if delen(g) != 1),
        'massa_g': round(plaat.area * R.DIKTE * 7.7e-3, 0),
    }


def dxf(naam, lussen, graveer=()):
    doc = ezdxf.new('R2010', setup=True)
    doc.units = ezdxf.units.MM
    doc.header['$INSUNITS'] = 4
    doc.layers.add('SNIJDEN', color=1)
    doc.layers.add('GRAVEREN', color=5)
    msp = doc.modelspace()
    for lp in lussen:
        msp.add_lwpolyline(lp, close=True, dxfattribs={'layer': 'SNIJDEN'})
    for a, b in graveer:
        msp.add_line(a, b, dxfattribs={'layer': 'GRAVEREN'})
    doc.saveas(OUT / naam)


def schrijf(plaat_vorm, gaten, rapport):
    OUT.mkdir(exist_ok=True)
    gaten = [g.simplify(0.01, preserve_topology=True) for g in gaten]
    loops = {'outer': R.ring_pts(plaat_vorm.exterior), 'holes': [R.ring_pts(g.exterior) for g in gaten], 'dikte': R.DIKTE, 'rapport': rapport}
    (OUT / 'rooster-rond.loops').write_text(json.dumps(loops))
    dxf('rooster-rond.dxf', [loops['outer'], *loops['holes']])
    # freesmal: MDF 12, 400 x 400, opening = uitsparing + (kopieerring - frees); hartlijnen gegraveerd
    mal = UITSPARING + (RING - FREES)
    cirkel = [(mal / 2 * math.cos(2 * math.pi * k / 360), mal / 2 * math.sin(2 * math.pi * k / 360)) for k in range(360)]
    dxf('freesmal-rond-mdf.dxf', [[(-200, -200), (200, -200), (200, 200), (-200, 200)], cirkel],
        graveer=[((-195, 0), (-mal / 2 - 5, 0)), ((mal / 2 + 5, 0), (195, 0)), ((0, -195), (0, -mal / 2 - 5)), ((0, mal / 2 + 5), (0, 195))])
    k, ss = 8, 4
    W = H = int(2 * STRAAL * k) + 80
    im = Image.new('RGB', (W * ss, H * ss), (40, 40, 44))
    d = ImageDraw.Draw(im)
    to_px = lambda pts: [((W / 2 + x * k) * ss, (H / 2 - y * k) * ss) for x, y in pts]
    d.polygon(to_px(loops['outer']), fill=(196, 199, 203))
    for h in loops['holes']:
        d.polygon(to_px(h), fill=(236, 236, 232))
    im.resize((W, H), Image.LANCZOS).save(OUT / 'rooster-rond-voorbeeld.png')


if __name__ == '__main__':
    plaat_vorm, plaat, gaten = maak()
    rapport = controle(plaat_vorm, plaat, gaten)
    schrijf(plaat_vorm, gaten, rapport)
    print(json.dumps(rapport, indent=1))
