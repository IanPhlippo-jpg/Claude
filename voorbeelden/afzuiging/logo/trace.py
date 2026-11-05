"""Trekt het LB-monogram van Lush Beauty over (2026-11-05, beelden van Ian).
- lb-monogram.png: het hele monogram (L en B), zwart op wit, maar klein (de B is ~240 px hoog);
- b-detail.png: alleen de B, ~700 px hoog: de dunne wig tussen de twee halve manen is daar goed te zien.
De L komt uit het eerste beeld, de B uit het tweede, geschaald en verschoven op de plaats van de B in het eerste.
Schrijft logo/logo-px.loops: {"monogram": [{"outer": [[x,y],...], "holes": [...]}, ...]} in px van lb-monogram.png.
Gebruik: python voorbeelden/afzuiging/logo/trace.py"""
import json
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
SCHAAL = 4  # vloeiend vergroten voor het afsnijden op half grijs: een rand tot op een kwart pixel


def zwart(naam, crop_rand=0):
    im = cv2.imread(str(HERE / naam), cv2.IMREAD_GRAYSCALE)
    if crop_rand:  # schermafdruk: de zwarte balken boven en onder weg
        im = im.copy()
        im[:crop_rand, :] = 255
        im[-crop_rand:, :] = 255
    groot = cv2.resize(im, None, fx=SCHAAL, fy=SCHAAL, interpolation=cv2.INTER_CUBIC)
    return (groot < 128).astype(np.uint8)


def glad(c, venster):
    """lopend gemiddelde langs de omtrek (gesloten contour): haalt het golven van een vergrote schermafdruk weg"""
    pts = c[:, 0, :].astype(np.float64)
    k = np.ones(venster) / venster
    rond = np.concatenate([pts[-venster:], pts, pts[:venster]])
    gem = np.stack([np.convolve(rond[:, i], k, 'same')[venster:-venster] for i in (0, 1)], axis=1)
    return gem[:, None, :].astype(np.float32)


def vloeiend(seg, graad=7, n=160):
    """een rand als vloeiende kromme: veelterm in de booglengte door de randpunten, met de eindpunten vast"""
    seg = np.asarray(seg, float)
    t = np.r_[0, np.cumsum(np.hypot(*np.diff(seg, axis=0).T))]
    t /= t[-1]
    uit = []
    for i in (0, 1):
        c = np.polyfit(t, seg[:, i], graad)
        f = np.polyval(c, t)
        a, b = seg[0, i] - f[0], seg[-1, i] - f[-1]  # lineaire correctie zodat de eindpunten exact blijven
        tt = np.linspace(0, 1, n)
        uit.append(np.polyval(c, tt) + a + (b - a) * tt)
    return np.stack(uit, axis=1)


def manen_vloeiend(c):
    """De twee halve manen (één contour, samen in de knik) opnieuw als vier vloeiende randen:
    bovenpunt -> buitenrand boven -> top van de wig -> buitenrand onder -> onderpunt -> binnenrand onder -> knik ->
    binnenrand boven -> bovenpunt. De punten, de knik en de top van de wig blijven exact."""
    pts = c[:, 0, :].astype(float)
    ys = pts[:, 1]
    y0, y1 = ys.min(), ys.max()
    i_top, i_bot = int(np.argmin(ys)), int(np.argmax(ys))
    band = np.where((ys > y0 + 0.3 * (y1 - y0)) & (ys < y0 + 0.7 * (y1 - y0)))[0]
    i_knik = int(band[np.argmin(pts[band, 0])])
    n = len(pts)
    # de twee paden tussen boven- en onderpunt: de knik ligt op het binnenste, de top van de wig op het buitenste
    pad1 = [(i_top + k) % n for k in range(((i_bot - i_top) % n) + 1)]
    pad2 = [(i_bot + k) % n for k in range(((i_top - i_bot) % n) + 1)]
    buiten = pad2 if i_knik in set(pad1) else pad1
    midden = [i for i in buiten if y0 + 0.3 * (y1 - y0) < pts[i, 1] < y0 + 0.7 * (y1 - y0)]
    i_wig = int(min(midden, key=lambda i: pts[i, 0]))
    # looprichting: van de bovenpunt eerst langs de buitenkant (naar de wig); anders de contour omkeren
    if buiten is pad2:
        pts = pts[::-1].copy()
        i_top, i_bot, i_knik, i_wig = n - 1 - i_top, n - 1 - i_bot, n - 1 - i_knik, n - 1 - i_wig
    def stuk(a, b):
        idx = [(a + k) % n for k in range(((b - a) % n) + 1)]
        return pts[idx]
    randen = [stuk(i_top, i_wig), stuk(i_wig, i_bot), stuk(i_bot, i_knik), stuk(i_knik, i_top)]
    lus = np.vstack([vloeiend(r)[:-1] for r in randen])
    return lus[:, None, :].astype(np.float32)


def vormen(m, approx=0.6, venster=0):
    cs, hier = cv2.findContours(m * 255, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    keep = [c for i, c in enumerate(cs) if hier[0][i][3] == -1 and cv2.contourArea(c) >= 30 * SCHAAL * SCHAAL]
    rechts = max(range(len(keep)), key=lambda i: keep[i][:, 0, 0].max()) if keep else -1
    for i, c in enumerate(keep):
        if venster and i == rechts:  # alleen de halve manen: vloeiende randen; de stam houdt haar scherpe hoeken
            c = manen_vloeiend(c)
        pts = cv2.approxPolyDP(c, approx, True)[:, 0, :].astype(float) / SCHAAL
        out.append(pts)
    return sorted(out, key=lambda p: p[:, 0].min())


lb = vormen(zwart('lb-monogram.png'))
b = vormen(zwart('b-detail.png', crop_rand=150), venster=61)  # ~0,9 mm op het rooster
assert len(lb) == 3, f'verwacht L, B-stam en halve manen in lb-monogram.png, kreeg {len(lb)}'
assert len(b) == 2, f'verwacht B-stam en halve manen in b-detail.png, kreeg {len(b)}'

# de B uit het detailbeeld op de plaats van de B in het monogram: zelfde hoogte en zelfde rechteronderhoek van de stam
def bbox(ps):
    a = np.vstack(ps)
    return a[:, 0].min(), a[:, 1].min(), a[:, 0].max(), a[:, 1].max()

x0, y0, x1, y1 = bbox(lb[1:])
u0, v0, u1, v1 = bbox(b)
s = (y1 - y0) / (v1 - v0)
stam_lb = lb[1][:, 0].max()
stam_b = b[0][:, 0].max()
dx = stam_lb - stam_b * s
dy = y0 - v0 * s
b_in_lb = [np.c_[p[:, 0] * s + dx, p[:, 1] * s + dy] for p in b]

res = {'monogram': [{'outer': lb[0].round(4).tolist(), 'holes': []}] + [{'outer': p.round(4).tolist(), 'holes': []} for p in b_in_lb]}
(HERE / 'logo-px.loops').write_text(json.dumps(res))
print('L uit lb-monogram.png, B uit b-detail.png (schaal %.3f); breedte B %.1f px tegen %.1f px in het monogram' % (s, bbox(b_in_lb)[2] - bbox(b_in_lb)[0], x1 - x0))
