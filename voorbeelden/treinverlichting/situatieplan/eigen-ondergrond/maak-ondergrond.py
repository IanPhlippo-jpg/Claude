# -*- coding: utf-8 -*-
"""CONTROLE / ALTERNATIEF - de tv-achtergrond is nu achtergrond.jpg van Ian (zie ../maak-plan.py).

Eigen hertekende ondergrond uit de Google-satellietfoto, gedraaid zodat de sporen horizontaal liggen.
Dient als controle van de ligging (overlay met de foto en met Ian's schets). Schrijft alles in deze map.

Leest de Google-satellietuitsnede (geometrie), Ian's gedraaide schets (extra bron + zijn lijnen)
en tekent er een schoon plan van: vlakken uit de foto, vereenvoudigd tot polygonen, opnieuw
getekend als SVG-paden en als PNG voor de tv. Daarover komt de busbaan / het autoparcours als vector.

Gebruik:  python maak-plan.py            (schrijft alles naar de map van dit script)
Nodig:    Python 3, numpy, opencv (cv2), Pillow. Niets anders.
"""
import json, math, os, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

HIER = os.path.dirname(os.path.abspath(__file__))
UPL = r"C:\Users\ianph\.claude\uploads\89d8d793-f0ea-4467-813d-a66f7610fca6"
FOTO = os.path.join(UPL, "ed8e1394-image.jpg")      # satellietuitsnede 1290 x 848 (noord boven)
SCHETS = os.path.join(UPL, "2dcf98d6-image.jpg")    # Ian's schets, gedraaid, sporen horizontaal
DEBUG = "--debug" in sys.argv
cv2.setRNGSeed(1)

# ----------------------------------------------------------------------------------------------
# 1. Meten: sporenhoek (Hough op de rails) en registratie van de schets op de foto (SIFT)
# ----------------------------------------------------------------------------------------------
foto = cv2.imread(FOTO)
schets = cv2.imread(SCHETS)
FH, FW = foto.shape[:2]


def meet_sporenhoek(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    e = cv2.Canny(g, 60, 160)
    L = cv2.HoughLinesP(e, 1, np.pi / 720, 80, minLineLength=150, maxLineGap=6)
    a, w = [], []
    for x1, y1, x2, y2 in L.reshape(-1, 4):
        hk = math.degrees(math.atan2(-(y2 - y1), x2 - x1))
        if 15 < hk < 35:                       # alleen lijnen in de richting van de sporen
            a.append(hk); w.append(math.hypot(x2 - x1, y2 - y1))
    a, w = np.array(a), np.array(w)
    return float(np.average(a, weights=w)), len(a), float(np.std(a))


HOEK, N_HOUGH, SD_HOUGH = meet_sporenhoek(foto)

# Gedraaid assenstelsel "R": foto rond haar middelpunt over -HOEK gedraaid (sporen horizontaal),
# verschoven zodat de hele gedraaide foto positieve coordinaten heeft.
A = cv2.getRotationMatrix2D((FW / 2, FH / 2), -HOEK, 1.0)
_hk = np.array([[0, 0, 1], [FW, 0, 1], [FW, FH, 1], [0, FH, 1]], float) @ A.T
A[:, 2] -= _hk.min(0)
A3 = np.vstack([A, [0, 0, 1]])
A3inv = np.linalg.inv(A3)


def registreer_schets():
    s = cv2.SIFT_create(4000)
    k1, d1 = s.detectAndCompute(cv2.cvtColor(foto, cv2.COLOR_BGR2GRAY), None)
    k2, d2 = s.detectAndCompute(cv2.cvtColor(schets, cv2.COLOR_BGR2GRAY), None)
    m = cv2.BFMatcher().knnMatch(d2, d1, k=2)
    goed = [a for a, b in m if a.distance < 0.75 * b.distance]
    src = np.float32([k2[a.queryIdx].pt for a in goed])
    dst = np.float32([k1[a.trainIdx].pt for a in goed])
    M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=4)
    inl = inl[:, 0] == 1
    res = (np.c_[src, np.ones(len(src))] @ M.T - dst)[inl]
    return M, int(inl.sum()), float(np.sqrt((res ** 2).sum(1).mean()))


M_SF, N_INL, RMS_REG = registreer_schets()            # schets-px -> foto-px
S_R = (A3 @ np.vstack([M_SF, [0, 0, 1]]))[:2]          # schets-px -> R

# Uitsnede in R (gekozen: van het ronde plein tot voorbij de oostelijke keerlus,
# van de Diksmuidestraat tot net onder de Stationstraat; binnen foto + schets)
X0, Y0, BW, BH = 56, 428, 1400, 378
Z = 2                                                  # rekenresolutie: 2 px per R-px


def foto_naar_plan(pts):
    p = np.c_[np.asarray(pts, float), np.ones(len(pts))] @ A.T
    return p - [X0, Y0]


def plan_naar_foto(pts):
    p = np.asarray(pts, float) + [X0, Y0]
    return (np.c_[p, np.ones(len(p))] @ A3inv.T)[:, :2]


# ----------------------------------------------------------------------------------------------
# 2. Google-labels, pins en pictogrammen weg (cv2.inpaint)
# ----------------------------------------------------------------------------------------------
# kaders in pixels van de bron; "tekst" = witte letters met donkere rand, "pin" = gekleurde pin
FOTO_LABELS = [
    ("tekst", (232, 315, 612, 370)),    # Turnhout City Hotel
    ("pin", (616, 294, 702, 390)),      # hotelpin (roze)
    ("tekst", (748, 300, 1008, 458)),   # Stationstraat
    ("tekst", (0, 398, 198, 528)),      # ...muidestraat
    ("pin", (176, 508, 264, 630)),      # Station Turnhout (rode pin)
    ("tekst", (266, 526, 592, 618)),    # Station Turnhout / Onlangs bekeken
    ("pin", (16, 718, 104, 808)),       # restaurant (oranje)
    ("tekst", (0, 740, 16, 790)),       # "s"
    ("tekst", (1146, 168, 1290, 222)),  # Juwele...
    ("pin", (1244, 294, 1290, 386)),    # grijze pin rechts
    ("tekst", (616, 740, 900, 845)),    # Biljartpalace - Merodecenter
    ("pin", (906, 746, 990, 836)),      # cafe (oranje)
    ("tekst", (192, 786, 294, 848)),    # De ...
]
SCHETS_LABELS = [
    ("tekst", (0, 0, 296, 46)),         # Diksmuidestraat
    ("pin", (142, 76, 228, 178)),       # rode pin
    ("tekst", (236, 96, 556, 144)),     # Station Turnhout
    ("pin", (0, 150, 58, 230)),         # restaurant
    ("pin", (386, 180, 436, 230)),      # bushalte-icoon
    ("tekst", (574, 212, 830, 258)),    # Stationstraat
]


def label_masker(img, kaders):
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    wit = (hsv[..., 2] > 205) & (hsv[..., 1] < 45)
    m = np.zeros(img.shape[:2], np.uint8)
    for soort, (x0, y0, x1, y1) in kaders:
        sub = np.zeros_like(m)
        if soort == "tekst":
            w = wit[y0:y1, x0:x1].astype(np.uint8)
            sub[y0:y1, x0:x1] = cv2.dilate(w, np.ones((11, 11), np.uint8))    # letters + donkere rand
        else:
            h, s, v = hsv[y0:y1, x0:x1, 0], hsv[y0:y1, x0:x1, 1], hsv[y0:y1, x0:x1, 2]
            kleur = (s > 110) & (v > 120)
            w = (wit[y0:y1, x0:x1] | kleur).astype(np.uint8)
            w = cv2.morphologyEx(w, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
            sub[y0:y1, x0:x1] = cv2.dilate(w, np.ones((7, 7), np.uint8))
        m |= sub
    return m


def ian_lijnen(img):
    """Ian's rode en groene stiftlijnen in de schets."""
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    rood = (((hsv[..., 0] < 10) | (hsv[..., 0] > 170)) & (hsv[..., 1] > 120) & (hsv[..., 2] > 150))
    groen = (hsv[..., 0] > 40) & (hsv[..., 0] < 85) & (hsv[..., 1] > 150) & (hsv[..., 2] > 150)
    return rood.astype(np.uint8), groen.astype(np.uint8)


m_foto = label_masker(foto, FOTO_LABELS)
foto_schoon = cv2.inpaint(foto, m_foto, 7, cv2.INPAINT_TELEA)
rood_s, groen_s = ian_lijnen(schets)
m_schets = label_masker(schets, SCHETS_LABELS) | cv2.dilate(rood_s | groen_s, np.ones((7, 7), np.uint8))
schets_schoon = cv2.inpaint(schets, m_schets, 7, cv2.INPAINT_TELEA)

# ----------------------------------------------------------------------------------------------
# 3. Bronbeeld in de uitsnede: foto waar ze bestaat, anders de schets (kleur aangepast)
# ----------------------------------------------------------------------------------------------
def naar_uitsnede(M2x3, img, interp=cv2.INTER_CUBIC, rand=0):
    T = np.array([[Z, 0, -X0 * Z], [0, Z, -Y0 * Z], [0, 0, 1]], float) @ np.vstack([M2x3, [0, 0, 1]])
    return cv2.warpAffine(img, T[:2], (BW * Z, BH * Z), flags=interp, borderValue=rand)


bron_f = naar_uitsnede(A, foto_schoon)
bron_s = naar_uitsnede(S_R, schets_schoon)
geldig_f = naar_uitsnede(A, np.full((FH, FW), 255, np.uint8), cv2.INTER_NEAREST) > 0
geldig_f = cv2.erode(geldig_f.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
geldig_s = naar_uitsnede(S_R, np.full(schets.shape[:2], 255, np.uint8), cv2.INTER_NEAREST) > 0
# kleuren van de schets afstemmen op de foto (lineaire fit op het gemeenschappelijke deel)
beide = geldig_f & geldig_s
Xs = np.c_[bron_s[beide].astype(float), np.ones(beide.sum())]
coef, *_ = np.linalg.lstsq(Xs, bron_f[beide].astype(float), rcond=None)
bron_s2 = np.clip(np.c_[bron_s.reshape(-1, 3).astype(float), np.ones(bron_s.shape[0] * bron_s.shape[1])] @ coef,
                  0, 255).reshape(bron_s.shape).astype(np.uint8)
bron = np.where(geldig_f[..., None], bron_f, bron_s2)
# zachte naad
naad = cv2.GaussianBlur(geldig_f.astype(np.float32), (0, 0), 3)[..., None]
bron = (bron_f * naad + bron_s2 * (1 - naad)).astype(np.uint8)
UIT_FOTO = float(geldig_f.mean())

if DEBUG:
    os.makedirs(os.path.join(HIER, "_debug"), exist_ok=True)
    cv2.imwrite(os.path.join(HIER, "_debug", "bron.png"), bron)
    cv2.imwrite(os.path.join(HIER, "_debug", "foto_schoon.jpg"), foto_schoon)
    print("hoek", HOEK, N_HOUGH, SD_HOUGH, "reg", N_INL, RMS_REG, "uit foto", UIT_FOTO)


# ----------------------------------------------------------------------------------------------
# 4. Schaal (AANNAME, zie README) en vaste geometrie gemeten in de gedraaide foto (R-coordinaten)
# ----------------------------------------------------------------------------------------------
PX_PER_M = 243.0 / 50.0        # oorspronkelijke screenshot 50 m = 170 px, uitsnede x 1,43
SPOOR_Y = (510.5, 528.5)       # spoorassen (rails bij 507/514 en 524,5/532, gemeten in het profiel)
SPOORBED = (498, 541)          # lichte lijnen = perronranden
PERRON_N = (483, 498)
PERRON_Z = (541, 556)
PERRON_Z_WEST = (108, 500, 576)   # x0, x1, y1: breder perron voor het stationsgebouw

R = lambda *p: [list(map(float, q)) for q in p]

WEGEN = {   # asfalt, R-coordinaten
    "diksmuidestraat": R((56, 437), (1456, 437), (1456, 457), (56, 457)),
    "stationstraat": R((236, 695), (1395, 695), (1418, 704), (1440, 724), (1456, 744), (1456, 806),
                       (1432, 782), (1408, 762), (1392, 753), (236, 753)),
    "zijstraat_oost": R((1377, 556), (1397, 556), (1397, 696), (1377, 696)),
    "plein_noordwest": R((150, 690), (132, 672), (70, 610), (56, 596), (56, 572), (88, 596), (170, 676)),
    "plein_zuidwest": R((128, 750), (150, 768), (100, 806), (70, 806)),
}
PLEIN = (186.0, 722.0, 24.0, 66.0)     # middelpunt x, y, straal eiland, straal buitenrand (rotonde)
GRAS = [
    R((150, 428), (1456, 428), (1456, 437), (150, 437)),                    # berm Diksmuidestraat
    R((1394, 600), (1456, 592), (1456, 684), (1398, 701)),                  # grasveld oost
    R((540, 657), (1180, 657), (1180, 694), (540, 694)),                    # groenstrook Stationstraat
]
GEBOUWEN = {   # met de hand nagetekend en met de overlay gecontroleerd
    "hotel": R((697, 555), (1180, 555), (1180, 642), (697, 642)),
    "station": R((122, 577), (490, 577), (490, 650), (122, 650)),
}
BEBOUWING = [  # zones met aaneengesloten bebouwing: daken worden hier automatisch uit de foto gehaald
    R((330, 757), (868, 757), (868, 806), (330, 806)),
    R((905, 757), (1394, 757), (1394, 806), (905, 806)),
    R((56, 580), (118, 580), (118, 650), (100, 668), (92, 700), (96, 745), (122, 775), (122, 806), (56, 806)),
]
LUIFEL_BANDEN = [(445, 500, 100, 1456), (543, 580, 100, 1456)]   # y0, y1, x0, x1: perronluifels


def naar_plan(pts):
    return [[p[0] - X0, p[1] - Y0] for p in pts]


# ----------------------------------------------------------------------------------------------
# 5. Segmentatie: bomen, daken (in bebouwingszones), perronluifels
# ----------------------------------------------------------------------------------------------
def raster(polys, schaal=Z, shape=(BH * Z, BW * Z)):
    m = np.zeros(shape, np.uint8)
    for p in polys:
        q = np.round((np.array(p) - [X0, Y0]) * schaal * 16).astype(np.int32)
        cv2.fillPoly(m, [q], 1, cv2.LINE_8, 4)
    return m


ms = cv2.pyrMeanShiftFiltering(bron, 7, 18, maxLevel=1)
hsv = cv2.cvtColor(ms, cv2.COLOR_BGR2HSV)
b_, g_, r_ = [ms[..., i].astype(np.int16) for i in range(3)]
exg = 2 * g_ - r_ - b_
V = hsv[..., 2].astype(np.int16)
S = hsv[..., 1].astype(np.int16)
grijs = cv2.cvtColor(bron, cv2.COLOR_BGR2GRAY).astype(np.float32)
mu = cv2.blur(grijs, (7, 7)); sd = np.sqrt(np.maximum(cv2.blur(grijs * grijs, (7, 7)) - mu * mu, 0))

# klassenkaart (Z-resolutie) - gebruikt voor de vectorisatie en het controlebeeld
K_VERH, K_GRAS, K_BOOM, K_DAK, K_LUIFEL, K_SCHADUW = 0, 1, 2, 3, 4, 5
groen = ((exg > 14) & (V < 200)) | ((exg > 8) & (V < 95) & (g_ > r_))
groen = cv2.morphologyEx(groen.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
groen = cv2.morphologyEx(groen, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
spoor_band = np.zeros_like(groen); spoor_band[(PERRON_N[0] - Y0) * Z:(PERRON_Z[1] - Y0) * Z, :] = 1
groen[spoor_band > 0] = 0
geb = raster(list(GEBOUWEN.values()))
groen[geb > 0] = 0
zone_geb = raster(BEBOUWING)
licht_beige = (V > 150) & (S < 50) & (sd < 9)


def kleine_weg(m, min_opp):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= min_opp
    return keep[lab]


dak = (zone_geb > 0) & ~licht_beige & ~(groen > 0)
dak = cv2.morphologyEx(dak.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
dak = cv2.morphologyEx(dak, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
dak = kleine_weg(dak, 160) & (zone_geb > 0)
# gaten (binnenplaatsen) kleiner dan 160 Z-px dichten
dak = ~kleine_weg(~dak & (zone_geb > 0), 160) & (zone_geb > 0)

# dakkleur per perceel: gemiddelde Lab-kleur (zie percelen())
lab = cv2.cvtColor(ms, cv2.COLOR_BGR2Lab)

# perronluifels: heldere rechthoeken in de perronbanden
helder = (V > 185) & (S < 40)
band = np.zeros_like(groen)
for y0, y1, x0, x1 in LUIFEL_BANDEN:
    band[(y0 - Y0) * Z:(y1 - Y0) * Z, (x0 - X0) * Z:(x1 - X0) * Z] = 1
band[(SPOORBED[0] - Y0) * Z - 2:(SPOORBED[1] - Y0) * Z + 3, :] = 0          # witte perronranden niet
helder = cv2.morphologyEx((helder & (band > 0)).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))


def luifels():
    uit = []
    n, labm, st, _ = cv2.connectedComponentsWithStats(helder, 8)
    for i in range(1, n):
        x, y, w, h, a = st[i]
        if a < 350 * Z * Z or min(w, h) < 11 * Z:          # auto's en kleine dingen weg
            continue
        cnt, _ = cv2.findContours((labm == i).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        rect = cv2.minAreaRect(cnt[0])
        box = cv2.boxPoints(rect)
        uit.append([[p[0] / Z + X0, p[1] / Z + Y0] for p in box])
    return uit


LUIFELS = luifels()


# bomen: groene vlekken -> nette ronde symbolen (gretig pakken met de afstandstransformatie)
def bomen():
    g1 = cv2.resize(groen, (BW, BH), interpolation=cv2.INTER_AREA)
    m = (g1 > 0).astype(np.uint8)
    uit = []
    while True:
        dt = cv2.distanceTransform(m, cv2.DIST_L2, 5)
        _, mx, _, (x, y) = cv2.minMaxLoc(dt)
        if mx < 3.2:
            break
        r = float(min(mx + 1.5, 15.0))
        uit.append((x + X0, y + Y0, r))
        cv2.circle(m, (x, y), int(r * 0.85), 0, -1)
    return uit


BOMEN = bomen()


# ----------------------------------------------------------------------------------------------
# 6. Vectoriseren: contouren -> approxPolyDP -> rechte hoeken (langs/haaks op de sporen)
# ----------------------------------------------------------------------------------------------
def haaks(poly, tol=16):
    p = np.array(poly, float)
    n = len(p)
    if n < 4:
        return poly
    lijnen = []
    for i in range(n):
        a, b = p[i], p[(i + 1) % n]
        d = b - a
        L = np.hypot(*d)
        if L < 1e-6:
            continue
        hk = math.degrees(math.atan2(d[1], d[0])) % 180
        for doel in (0, 90, 180):
            if abs(hk - doel) < tol:
                d = np.array([1.0, 0.0]) if doel != 90 else np.array([0.0, 1.0])
                break
        else:
            d = d / L
        lijnen.append(((a + b) / 2, d / np.hypot(*d), a, b))
    uit = []
    m = len(lijnen)
    for i in range(m):
        (c1, d1, a1, b1), (c2, d2, a2, b2) = lijnen[i - 1], lijnen[i]
        crs = d1[0] * d2[1] - d1[1] * d2[0]
        if abs(crs) < 0.2:                       # evenwijdig: kleine trap
            v = b1
            uit.append(c1 + d1 * np.dot(v - c1, d1))
            uit.append(c2 + d2 * np.dot(v - c2, d2))
        else:
            t = ((c2 - c1)[0] * d2[1] - (c2 - c1)[1] * d2[0]) / crs
            uit.append(c1 + d1 * t)
    return [list(q) for q in uit]


def vectoriseer(mask, eps=1.6, min_opp=120, rechthoekig=True):
    """mask in Z-resolutie -> lijst (buiten, [gaten]) in R-coordinaten."""
    cnts, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    uit = []
    if hier is None:
        return uit
    hier = hier[0]
    for i, c in enumerate(cnts):
        if hier[i][3] != -1 or cv2.contourArea(c) < min_opp:
            continue
        def maak(cc):
            a = cv2.approxPolyDP(cc, eps * Z, True)[:, 0, :].astype(float)
            pts = [[x / Z + X0, y / Z + Y0] for x, y in a]
            return haaks(pts) if rechthoekig else pts
        buiten = maak(c)
        gaten = []
        j = hier[i][2]
        while j != -1:
            if cv2.contourArea(cnts[j]) >= min_opp:
                gaten.append(maak(cnts[j]))
            j = hier[j][0]
        uit.append((buiten, gaten))
    return uit


DAKEN = vectoriseer(dak, eps=2.0, min_opp=300)


def knip_x(poly, a, b):
    """Sutherland-Hodgman: polygoon knippen op a <= x <= b."""
    def half(pts, f, snij):
        uit = []
        for i in range(len(pts)):
            p, q = pts[i - 1], pts[i]
            if f(q):
                if not f(p):
                    uit.append(snij(p, q))
                uit.append(q)
            elif f(p):
                uit.append(snij(p, q))
        return uit
    def sx(x0):
        return lambda p, q: [x0, p[1] + (q[1] - p[1]) * (x0 - p[0]) / ((q[0] - p[0]) or 1e-9)]
    r = half(poly, lambda p: p[0] >= a, sx(a))
    return half(r, lambda p: p[0] <= b, sx(b)) if r else []


def percelen():
    """Gevelgrenzen in de huizenrijen: sterke verticale randen in de foto (Sobel-x) -> percelen met eigen dakkleur."""
    gx = np.abs(cv2.Sobel(cv2.GaussianBlur(grijs, (0, 0), 1.0), cv2.CV_32F, 1, 0, ksize=3))
    uit = []
    for zi, zone in enumerate(BEBOUWING):
        xs = [p[0] for p in zone]
        za, zb = min(xs), max(xs)
        if zi < 2:
            m = np.zeros_like(dak); m[(760 - Y0) * Z:(800 - Y0) * Z, :] = True
            prof = (gx * (m & dak)).sum(0) / np.maximum((m & dak).sum(0), 1)
            prof = cv2.GaussianBlur(prof.reshape(1, -1).astype(np.float32), (0, 0), 2.0)[0]
            a0, b0 = int((za - X0) * Z) + 10, int((zb - X0) * Z) - 10
            seg = prof[a0:b0]
            drempel = seg.mean() + 0.9 * seg.std()
            pieken = []
            for i in np.argsort(-seg):
                if seg[i] < drempel:
                    break
                if all(abs(i - j) >= 14 * Z for j in pieken):
                    pieken.append(i)
            grenzen = [za] + sorted((a0 + i) / Z + X0 for i in pieken) + [zb]
        else:
            grenzen = [za, zb]
        for a, b in zip(grenzen[:-1], grenzen[1:]):
            m = np.zeros_like(dak); m[:, int((a - X0) * Z):int((b - X0) * Z)] = True
            m &= dak & (raster([zone]) > 0)
            if m.sum() < 50:
                continue
            L, A_, B_ = [float(v) for v in lab[m].reshape(-1, 3).mean(0)]
            uit.append({"zone": zi, "x": (a, b), "L": L, "warm": (A_ - 128) + (B_ - 128) > 9})
    Ls = np.array([u["L"] for u in uit])
    t1, t2 = np.percentile(Ls, [33, 67])
    for u in uit:
        u["kleur"] = "warm" if u["warm"] else (0 if u["L"] > t2 else (1 if u["L"] > t1 else 2))
    return uit


PERCELEN = percelen()

# ----------------------------------------------------------------------------------------------
# 7. Busbaan en autoparcours (geometrie uit Ian's schets, gelegd op de echte weg) - R-coordinaten
# ----------------------------------------------------------------------------------------------
def chaikin(pts, n=4, gesloten=False):
    p = np.array(pts, float)
    for _ in range(n):
        if gesloten:
            q = np.roll(p, -1, 0)
            p = np.stack([0.75 * p + 0.25 * q, 0.25 * p + 0.75 * q], 1).reshape(-1, 2)
        else:
            q = p[1:]; a = p[:-1]
            mid = np.stack([0.75 * a + 0.25 * q, 0.25 * a + 0.75 * q], 1).reshape(-1, 2)
            p = np.vstack([p[:1], mid, p[-1:]])
    return p


def herbemonster(p, stap, gesloten=False):
    p = np.array(p, float)
    if gesloten:
        p = np.vstack([p, p[:1]])
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    n = max(2, int(d[-1] / stap) + 1)
    s = np.linspace(0, d[-1], n)
    q = np.c_[np.interp(s, d, p[:, 0]), np.interp(s, d, p[:, 1])]
    return q[:-1] if gesloten else q


def boog(cx, cy, r, a0, a1, n):
    return [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
            for a in np.linspace(a0, a1, n)]


LANE_N, LANE_Z = 714.0, 734.0          # rijstrook west (noordkant) en oost (zuidkant)
pcx, pcy = PLEIN[0], PLEIN[1]
auto_ctrl = ([(262, LANE_Z), (700, LANE_Z), (1384, LANE_Z), (1398, 745)]
             + boog(1418, 742, 20, 150, -150, 11)
             + [(1392, 719), (1378, LANE_N), (1000, LANE_N), (600, LANE_N), (262, LANE_N), (236, 709)]
             + boog(pcx, pcy, 44, -25, -335, 13)
             + [(236, 739)])
AUTOLUS = herbemonster(chaikin(auto_ctrl, 4, True), 1.0, True)

STROOK_X = {"lijnbus3": 505.0, "lijnbus2": 550.0, "lijnbus1": 595.0, "standmodel": 640.0}
BUS_Y = 548.0                          # busbaan op het perron tussen de sporen en het hotel
STOP_Y = 645.0
bus_ctrl = [(1386, LANE_N), (1376, 710), (1372, 696), (1372, 640), (1370, 598), (1358, 570),
            (1334, 553), (1290, BUS_Y), (900, BUS_Y), (STROOK_X["lijnbus3"] + 28, BUS_Y)]
BUSBAAN = herbemonster(chaikin(bus_ctrl, 4), 1.0)


def strook(x):
    c = [(x + 28, BUS_Y), (x + 7, BUS_Y + 3), (x, BUS_Y + 20), (x, STOP_Y), (x, 684), (x - 6, 704),
         (x - 26, LANE_N)]
    return herbemonster(chaikin(c, 4), 1.0)


STROKEN = {k: strook(x) for k, x in STROOK_X.items()}
WISSELS = {"W1": (1386.0, LANE_N), "W2": (STROOK_X["standmodel"] + 28, BUS_Y),
           "W3": (STROOK_X["lijnbus1"] + 28, BUS_Y), "W4": (STROOK_X["lijnbus2"] + 28, BUS_Y)}
STOPS = {k: (x, STOP_Y) for k, x in STROOK_X.items()}
IR = {"IR5": ("lijnbus3",), "IR6": ("lijnbus2",), "IR7": ("lijnbus1",)}
HALL_X = STROOK_X["lijnbus3"] - 26 - 15 * PX_PER_M      # 15 m na de laatste invoeging (rijrichting west)
HALL = (HALL_X, LANE_N)
if DEBUG:
    print("bomen", len(BOMEN), "daken", len(DAKEN), "percelen", len(PERCELEN), "luifels", len(LUIFELS))

if __name__ == "__main__" and "--stap1" in sys.argv:
    sys.exit(0)

# ----------------------------------------------------------------------------------------------
# 8. Tekenen: een tekendoek met twee uitvoeren (SVG-paden en PIL met 2x supersampling)
# ----------------------------------------------------------------------------------------------
FONT_R = r"C:\Windows\Fonts\segoeui.ttf"
FONT_B = r"C:\Windows\Fonts\segoeuib.ttf"
_fonts = {}


def font(size, vet=True):
    key = (round(size, 1), vet)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(FONT_B if vet else FONT_R, max(1, int(round(size))))
    return _fonts[key]


def tekstbreedte(s, size, vet=True):
    f = font(size * 4, vet)
    return f.getlength(s) / 4.0


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def strepen(pts, aan, uit):
    """Polylijn opdelen in streepjes (lengtes in dezelfde eenheid als de punten)."""
    p = np.array(pts, float)
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    stukken, s = [], 0.0
    while s < d[-1]:
        e = min(s + aan, d[-1])
        ss = np.linspace(s, e, max(2, int((e - s) / 2) + 2))
        stukken.append(np.c_[np.interp(ss, d, p[:, 0]), np.interp(ss, d, p[:, 1])])
        s = e + uit
    return stukken


class SvgDoek:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.el = []
        self.n_clip = 0

    @staticmethod
    def _pts(pts):
        return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)

    @staticmethod
    def _pad(pts, sluit=True):
        s = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts)
        return s + (" Z" if sluit else "")

    def poly(self, pts, fill=None, stroke=None, sw=0, gaten=(), opacity=1.0):
        d = self._pad(pts) + "".join(" " + self._pad(g) for g in gaten)
        st = f' stroke="{stroke}" stroke-width="{sw:.2f}" stroke-linejoin="round"' if stroke else ""
        op = f' fill-opacity="{opacity}"' if opacity < 1 else ""
        self.el.append(f'<path d="{d}" fill="{fill or "none"}" fill-rule="evenodd"{op}{st}/>')

    def lijn(self, pts, kleur, sw, dash=None, cap="round"):
        da = f' stroke-dasharray="{dash[0]:.1f} {dash[1]:.1f}"' if dash else ""
        self.el.append(f'<path d="{self._pad(pts, False)}" fill="none" stroke="{kleur}" stroke-width="{sw:.2f}" '
                       f'stroke-linecap="{cap}" stroke-linejoin="round"{da}/>')

    def cirkel(self, c, r, fill=None, stroke=None, sw=0):
        st = f' stroke="{stroke}" stroke-width="{sw:.2f}"' if stroke else ""
        self.el.append(f'<circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{r:.2f}" fill="{fill or "none"}"{st}/>')

    def rrect(self, x, y, w, h, r, fill=None, stroke=None, sw=0):
        st = f' stroke="{stroke}" stroke-width="{sw:.2f}"' if stroke else ""
        self.el.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r:.1f}" '
                       f'fill="{fill or "none"}"{st}/>')

    def tekst(self, x, y, s, size, kleur="#222", vet=True, anker="mm", halo=None, halo_w=0, rot=0):
        ta = {"l": "start", "m": "middle", "r": "end"}[anker[0]]
        fw = "700" if vet else "400"
        tr = f' transform="rotate({rot:.1f} {x:.1f} {y:.1f})"' if rot else ""
        h = (f' stroke="{halo}" stroke-width="{halo_w * 2:.1f}" paint-order="stroke" stroke-linejoin="round"'
             if halo else "")
        s = s.replace("&", "&amp;").replace("<", "&lt;")
        self.el.append(f'<text x="{x:.1f}" y="{y:.1f}" font-family="Segoe UI, Arial, sans-serif" font-size="{size:.1f}" '
                       f'font-weight="{fw}" fill="{kleur}" text-anchor="{ta}" dominant-baseline="central"{h}{tr}>{s}</text>')

    def clip_begin(self, x, y, w, h):
        self.n_clip += 1
        cid = f"clip{self.n_clip}"
        self.el.append(f'<clipPath id="{cid}"><rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}"/></clipPath>'
                       f'<g clip-path="url(#{cid})">')

    def clip_eind(self):
        self.el.append("</g>")

    def groep(self, naam):
        self.el.append(f'<g id="{naam}">')

    def groep_eind(self):
        self.el.append("</g>")

    def svg(self, extra_kop=""):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
                f'viewBox="0 0 {self.w} {self.h}">{extra_kop}\n' + "\n".join(self.el) + "\n</svg>\n")


class PilDoek:
    def __init__(self, w, h, k=2, achter="#ffffff"):
        self.w, self.h, self.k = w, h, k
        self.im = Image.new("RGB", (int(w * k), int(h * k)), achter)
        self.d = ImageDraw.Draw(self.im)
        self.clipstack = []

    def _p(self, pts):
        return [(x * self.k, y * self.k) for x, y in pts]

    def poly(self, pts, fill=None, stroke=None, sw=0, gaten=(), opacity=1.0):
        if len(pts) < 3:
            return
        if opacity < 1 and fill:
            laag = Image.new("RGBA", self.im.size, (0, 0, 0, 0))
            ImageDraw.Draw(laag).polygon(self._p(pts), fill=hexrgb(fill) + (int(255 * opacity),))
            self.im.paste(laag, (0, 0), laag)
        elif fill:
            self.d.polygon(self._p(pts), fill=fill)
        for g in gaten:
            if len(g) >= 3 and self.gatkleur:
                self.d.polygon(self._p(g), fill=self.gatkleur)
        if stroke and sw > 0:
            w = max(1, int(round(sw * self.k)))
            self.d.line(self._p(list(pts) + [pts[0]]), fill=stroke, width=w, joint="curve")
            for g in gaten:
                self.d.line(self._p(list(g) + [g[0]]), fill=stroke, width=w, joint="curve")

    gatkleur = None

    def lijn(self, pts, kleur, sw, dash=None, cap="round"):
        w = max(1, int(round(sw * self.k)))
        stukken = strepen(pts, dash[0], dash[1]) if dash else [np.array(pts, float)]
        for st in stukken:
            pp = self._p(st)
            if w >= 8 and not dash and cap == "round":
                # dikke lijn als "worst": segmenten + schijfjes op elk punt (PIL-voegen geven anders strepen)
                q = herbemonster(np.array(pp), max(1.0, w / 4.0))
                self.d.line([tuple(a) for a in q], fill=kleur, width=w)
                r = w / 2.0
                for x, y in q:
                    self.d.ellipse([x - r, y - r, x + r, y + r], fill=kleur)
                continue
            self.d.line(pp, fill=kleur, width=w, joint="curve")
            if cap == "round" and w > 2:
                r = w / 2.0
                for (x, y) in (pp[0], pp[-1]):
                    self.d.ellipse([x - r, y - r, x + r, y + r], fill=kleur)

    def cirkel(self, c, r, fill=None, stroke=None, sw=0):
        k = self.k
        self.d.ellipse([(c[0] - r) * k, (c[1] - r) * k, (c[0] + r) * k, (c[1] + r) * k], fill=fill,
                       outline=stroke, width=max(1, int(round(sw * k))) if stroke else 0)

    def rrect(self, x, y, w, h, r, fill=None, stroke=None, sw=0):
        k = self.k
        self.d.rounded_rectangle([x * k, y * k, (x + w) * k, (y + h) * k], radius=r * k, fill=fill, outline=stroke,
                                 width=max(1, int(round(sw * k))) if stroke else 0)

    def tekst(self, x, y, s, size, kleur="#222", vet=True, anker="mm", halo=None, halo_w=0, rot=0):
        f = font(size * self.k, vet)
        sw = int(round(halo_w * self.k)) if halo else 0
        if not rot:
            self.d.text((x * self.k, y * self.k), s, font=f, fill=kleur, anchor=anker,
                        stroke_width=sw, stroke_fill=halo)
            return
        w = int(f.getlength(s) + 4 * sw + 20); h = int(size * self.k * 1.6 + 4 * sw)
        laag = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(laag).text((w / 2, h / 2), s, font=f, fill=kleur, anchor="mm", stroke_width=sw,
                                  stroke_fill=halo)
        laag = laag.rotate(-rot, expand=True, resample=Image.BICUBIC)
        self.im.paste(laag, (int(x * self.k - laag.width / 2), int(y * self.k - laag.height / 2)), laag)

    def plak(self, ander, x, y):
        self.im.paste(ander.im, (int(x * self.k), int(y * self.k)))

    def beeld(self):
        return self.im.resize((int(self.w), int(self.h)), Image.LANCZOS) if self.k != 1 else self.im


# kleuren (planstijl)
KL = dict(
    verharding="#dedad0", perron="#ebe7dd", perronrand="#ffffff", gras="#b8db8c", groenstrook="#acd480",
    asfalt="#707377", asfaltrand="#55585c", markering="#f2f2f2", spoorbed="#b9b0a2", dwars="#7a6652",
    rail="#4b4b4b", dak=["#d6d6d2", "#c6c7c4", "#b7b9b6"], dakwarm="#d2b9a8", dakrand="#7b7c7a", luifel="#f4f2ec",
    luifelrand="#8d8d89", hotel="#c8ccd2", hotelrand="#6c7178", station="#c4593e", stationrand="#7b3122",
    boom="#5c9648", boomrand="#3b6b2f", boomlicht="#80b964", boomschaduw="#8aa27a",
    auto_rand="#d62f2b", auto_asfalt="#565b60", bus="#a7472d", bus_rand="#1f9e48", pijl="#ffffff",
    wissel="#d62f2b", ir="#8e3bc4", hall="#f5d000", tekst="#1d1d1d",
)


class Zicht:
    """Afbeelding van plan-coordinaten (R - oorsprong) naar doek-coordinaten."""
    def __init__(self, vx0, vy0, s, ox=0.0, oy=0.0):
        self.vx0, self.vy0, self.s, self.ox, self.oy = vx0, vy0, s, ox, oy

    def __call__(self, pts):
        return [((p[0] - X0 - self.vx0) * self.s + self.ox, (p[1] - Y0 - self.vy0) * self.s + self.oy) for p in pts]

    def p(self, x, y):
        return self([(x, y)])[0]


def teken_ondergrond(d, T):
    s = T.s
    d.gatkleur = KL["verharding"]
    a, b = T.p(X0, Y0), T.p(X0 + BW, Y0 + BH)
    d.poly([a, (b[0], a[1]), b, (a[0], b[1])], fill=KL["verharding"])
    for i, g in enumerate(GRAS):
        d.poly(T(g), fill=KL["groenstrook"] if i == 2 else KL["gras"])
    # daken in de bebouwingszones
    for pc in PERCELEN:
        kl = KL["dakwarm"] if pc["kleur"] == "warm" else KL["dak"][pc["kleur"]]
        for buiten, gaten in DAKEN:
            q = knip_x(buiten, *pc["x"])
            if len(q) >= 3:
                d.poly(T(q), fill=kl, stroke=KL["dakrand"], sw=0.35 * s)
    for buiten, gaten in DAKEN:
        d.poly(T(buiten), stroke=KL["dakrand"], sw=0.6 * s, gaten=[T(g) for g in gaten])
    # perrons
    d.poly(T(R((X0, PERRON_N[0]), (X0 + BW, PERRON_N[0]), (X0 + BW, PERRON_N[1]), (X0, PERRON_N[1]))),
           fill=KL["perron"])
    x0w, x1w, y1w = PERRON_Z_WEST
    d.poly(T(R((X0, PERRON_Z[0]), (X0 + BW, PERRON_Z[0]), (X0 + BW, PERRON_Z[1]), (x1w, PERRON_Z[1]),
               (x1w, y1w), (x0w, y1w), (x0w, PERRON_Z[1]), (X0, PERRON_Z[1]))), fill=KL["perron"])
    d.lijn(T([(X0, PERRON_N[0]), (X0 + BW, PERRON_N[0])]), KL["dakrand"], 0.4 * s)
    # spoorbedding, dwarsliggers, rails
    d.poly(T(R((X0, SPOORBED[0]), (X0 + BW, SPOORBED[0]), (X0 + BW, SPOORBED[1]), (X0, SPOORBED[1]))),
           fill=KL["spoorbed"])
    for ys in SPOOR_Y:
        for x in np.arange(X0 + 1.5, X0 + BW, 3.1):
            d.lijn(T([(x, ys - 6.2), (x, ys + 6.2)]), KL["dwars"], 1.05 * s, cap="butt")
        for dy in (-3.6, 3.6):
            d.lijn(T([(X0, ys + dy), (X0 + BW, ys + dy)]), KL["rail"], 0.75 * s, cap="butt")
    for y in (SPOORBED[0], SPOORBED[1]):
        d.lijn(T([(X0, y), (X0 + BW, y)]), KL["perronrand"], 0.9 * s, cap="butt")
    # wegen
    cx, cy, ri, ro = PLEIN
    ring = boog(cx, cy, ro, 0, 360, 120)
    for naam, w in WEGEN.items():
        d.poly(T(w), fill=KL["asfalt"])
    d.poly(T(ring), fill=KL["asfalt"])
    for naam, w in WEGEN.items():
        d.poly(T(w), stroke=KL["asfaltrand"], sw=0.5 * s)
    d.lijn(T(ring + ring[:1]), KL["asfaltrand"], 0.5 * s)
    for naam, w in WEGEN.items():                    # wegen opnieuw zonder rand: naden op het plein weg
        d.poly(T(w), fill=KL["asfalt"])
    d.poly(T(boog(cx, cy, ro - 0.6, 0, 360, 120)), fill=KL["asfalt"])
    d.cirkel(T.p(cx, cy), ri * s, fill=KL["gras"], stroke="#ffffff", sw=0.9 * s)
    # wegmarkering
    d.lijn(T([(X0, 447), (X0 + BW, 447)]), KL["markering"], 0.45 * s, dash=(4 * s, 4 * s), cap="butt")
    d.lijn(T(boog(cx, cy, (ri + ro) / 2, 0, 360, 120)), KL["markering"], 0.45 * s, dash=(4 * s, 4 * s),
           cap="butt")
    # gebouwen
    for b in LUIFELS:
        d.poly(T(b), fill=KL["luifel"], stroke=KL["luifelrand"], sw=0.5 * s)
    d.poly(T(GEBOUWEN["hotel"]), fill=KL["hotel"], stroke=KL["hotelrand"], sw=0.8 * s)
    d.poly(T(GEBOUWEN["station"]), fill=KL["station"], stroke=KL["stationrand"], sw=0.8 * s)
    st = GEBOUWEN["station"]
    for xx in np.arange(st[0][0] + 24, st[1][0] - 10, 24):          # dakvlakken (pannen)
        d.lijn(T([(xx, st[0][1] + 2), (xx, st[2][1] - 2)]), "#a9472f", 0.35 * s, cap="butt")
    d.lijn(T([(st[0][0] + 3, (st[0][1] + st[2][1]) / 2), (st[1][0] - 3, (st[0][1] + st[2][1]) / 2)]),
           KL["stationrand"], 0.5 * s, cap="butt")
    # bomen
    for x, y, r in BOMEN:
        d.cirkel(T.p(x + 0.18 * r, y + 0.22 * r), r * s, fill=KL["boomschaduw"])
    for x, y, r in BOMEN:
        d.cirkel(T.p(x, y), r * s, fill=KL["boom"], stroke=KL["boomrand"], sw=0.45 * s)
        d.cirkel(T.p(x - 0.22 * r, y - 0.24 * r), r * 0.52 * s, fill=KL["boomlicht"])


def pijlen(d, T, pts, tussen, maat, kleur, start=None, vermijd=()):
    p = np.array(pts, float)
    dd = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    for sa in np.arange(start if start is not None else tussen / 2, dd[-1] - 2, tussen):
        x = np.interp(sa, dd, p[:, 0]); y = np.interp(sa, dd, p[:, 1])
        if any(math.hypot(x - vx, y - vy) < vr for vx, vy, vr in vermijd):
            continue
        x2 = np.interp(sa + 1.5, dd, p[:, 0]); y2 = np.interp(sa + 1.5, dd, p[:, 1])
        ux, uy = x2 - x, y2 - y; L = math.hypot(ux, uy) or 1; ux, uy = ux / L, uy / L
        nx, ny = -uy, ux
        a = (x + ux * maat * 0.6, y + uy * maat * 0.6)
        b = (x - ux * maat * 0.4 + nx * maat * 0.5, y - uy * maat * 0.4 + ny * maat * 0.5)
        c = (x - ux * maat * 0.1, y - uy * maat * 0.1)
        e = (x - ux * maat * 0.4 - nx * maat * 0.5, y - uy * maat * 0.4 - ny * maat * 0.5)
        d.poly(T([a, b, c, e]), fill=kleur)


def teken_busbaan(d, T):
    s = T.s
    BREED_A, BREED_B = 20.0, 15.0
    lus = list(map(tuple, AUTOLUS)) + [tuple(AUTOLUS[0])]
    d.lijn(T(lus), KL["auto_rand"], (BREED_A + 3.2) * s)
    d.lijn(T(lus), KL["auto_asfalt"], BREED_A * s)
    d.poly(T(boog(1418, 742, 20, 0, 360, 60)), fill=KL["auto_asfalt"])      # binnenkant oostelijke keerlus
    d.lijn(T([(228, 724), (1418, 724)]), KL["auto_asfalt"], BREED_A * s, cap="butt")   # geen rode naad tussen de stroken
    d.lijn(T([(300, 724), (1360, 724)]), KL["markering"], 0.55 * s, dash=(5 * s, 4 * s), cap="butt")
    # busbaan en haltestroken: roodbruin met groene rand
    banen = [BUSBAAN] + list(STROKEN.values())
    for b in banen:
        d.lijn(T(b), KL["bus_rand"], (BREED_B + 3.2) * s)
    for b in banen:
        d.lijn(T(b), KL["bus"], BREED_B * s)
    # stopstrepen
    for k, (x, y) in STOPS.items():
        d.lijn(T([(x - BREED_B / 2 + 1, y + 7), (x + BREED_B / 2 - 1, y + 7)]), "#ffffff", 0.9 * s, cap="butt")
    # pijlen (rijrichting)
    pijlen(d, T, lus, 95, 7.5, KL["pijl"], start=40, vermijd=[(780, 724, 40), (HALL[0], HALL[1], 12)])
    pijlen(d, T, BUSBAAN, 110, 6.5, KL["pijl"], start=60, vermijd=[(1000, BUS_Y, 36)])
    for b in STROKEN.values():
        pijlen(d, T, b, 200, 6.0, KL["pijl"], start=b.shape[0] - 30)


def teken_symbolen(d, T, schaal_sym=1.0):
    s = T.s * schaal_sym
    for k, (x, y) in WISSELS.items():
        c = T.p(x, y)
        d.cirkel(c, 7.0 * s, fill="#ffffff", stroke=KL["wissel"], sw=2.0 * s)
        d.cirkel(c, 3.0 * s, fill=KL["wissel"])
    for k, (x, y) in STOPS.items():
        c = T.p(x, y)
        d.cirkel(c, 5.2 * s, fill="#ffffff", stroke=KL["wissel"], sw=1.4 * s)
        r = 2.6 * s
        d.lijn([(c[0] - r, c[1] - r), (c[0] + r, c[1] + r)], KL["wissel"], 1.3 * s)
        d.lijn([(c[0] - r, c[1] + r), (c[0] + r, c[1] - r)], KL["wissel"], 1.3 * s)
    for k, (strook_id,) in IR.items():
        x, y = STOPS[strook_id]
        c = T.p(x - 13, y)
        teken_ir(d, c, s)
    c = T.p(*HALL)
    d.cirkel(c, 5.5 * s, fill=KL["hall"], stroke="#3a3a3a", sw=1.0 * s)


def teken_ir(d, c, s):
    d.cirkel(c, 4.6 * s, fill="#ffffff", stroke=KL["ir"], sw=1.2 * s)
    d.cirkel(c, 1.5 * s, fill=KL["ir"])
    for r in (2.7, 3.7):
        for a0, a1 in ((-50, 50), (130, 230)):
            d.lijn([(c[0] + r * s * math.cos(math.radians(a)), c[1] + r * s * math.sin(math.radians(a)))
                    for a in np.linspace(a0, a1, 8)], KL["ir"], 0.6 * s)


def label(d, x, y, tekst, size, kleur=KL["tekst"], achter="#ffffff", rand="#2a2a2a", sw=1.6, pad=(0.45, 0.22),
          vet=True, r=None):
    w = tekstbreedte(tekst, size, vet) + 2 * pad[0] * size
    h = size * 1.25 + 2 * pad[1] * size
    d.rrect(x - w / 2, y - h / 2, w, h, r if r is not None else h * 0.3, fill=achter, stroke=rand, sw=sw)
    d.tekst(x, y - size * 0.06, tekst, size, kleur, vet, "mm")
    return w, h


def wijzer(d, a, b, kleur="#2a2a2a", sw=2.0):
    d.lijn([a, b], kleur, sw)


# ----------------------------------------------------------------------------------------------
# 9. Opmaak 3840 x 2160 (16:9): titel, kaart, onderpaneel met legende, detail, noordpijl, schaal
# ----------------------------------------------------------------------------------------------
W, H = 3840, 2160
MX, MY = 40, 172
MS = (W - 2 * MX) / BW                 # kaartschaal (doek-px per plan-px)
MH = BH * MS
PANEEL_Y = MY + MH + 26
DETAIL = (385, 530, 705, 752)          # R-venster van het detail (x0, y0, x1, y1)


def kaart_labels(d, T, s):
    """Labels op de grote kaart (doek-px)."""
    fs = 30
    # straatnamen
    for tekst, (x, y) in [("Diksmuidestraat", (330, 447)), ("Diksmuidestraat", (1180, 447))]:
        label(d, *T.p(x, y), tekst, fs, achter="#ffffff", rand="#555", sw=1.4)
    label(d, *T.p(1010, 779), "Stationstraat", fs + 2, rand="#555", sw=1.4)
    label(d, *T.p(306, 614), "Station Turnhout", fs + 4, rand=KL["stationrand"], sw=2)
    label(d, *T.p(940, 600), "Turnhout City Hotel", fs + 4, rand=KL["hotelrand"], sw=2)
    label(d, *T.p(110, 720), "Stations-", 24, rand="#555", sw=1.2)
    label(d, *T.p(110, 739), "plein", 24, rand="#555", sw=1.2)
    # wissels: 2, 3, 4 boven (labels over de perronluifels), 1 rechts
    for k, lx in (("W4", 528), ("W3", 604), ("W2", 680)):
        wx, wy = WISSELS[k]
        a = T.p(wx, wy - 7.5); b = T.p(lx, 470)
        wijzer(d, (b[0], b[1] + 16), a, KL["wissel"], 3)
        label(d, b[0], b[1], "Wissel " + k[1], fs, kleur="#ffffff", achter=KL["wissel"], rand="#7a1512", sw=1.5)
    wx, wy = WISSELS["W1"]
    b = T.p(1300, 655)
    wijzer(d, b, T.p(wx - 5, wy - 6), KL["wissel"], 3)
    label(d, b[0], b[1], "Wissel 1", fs, kleur="#ffffff", achter=KL["wissel"], rand="#7a1512", sw=1.5)
    # haltestroken: naam in de strook (gedraaid)
    for k, naam in (("lijnbus3", "LIJNBUS 3"), ("lijnbus2", "LIJNBUS 2"), ("lijnbus1", "LIJNBUS 1"),
                    ("standmodel", "STANDMODEL")):
        x = STROOK_X[k]
        c = T.p(x, 604)
        d.tekst(c[0], c[1], naam, 21, "#ffffff", True, "mm", rot=-90)
        c = T.p(x, 666)
        d.tekst(c[0], c[1], "BUS", 17, "#ffffff", True, "mm")
    # IR en hall
    for k, sid in (("IR LED 5", "lijnbus3"), ("IR LED 6", "lijnbus2"), ("IR LED 7", "lijnbus1")):
        x, y = STOPS[sid]
        c = T.p(x - 13, y - 22)
        d.tekst(c[0], c[1], k, 17, KL["ir"], True, "mm", halo="#ffffff", halo_w=3, rot=-90)
    hx, hy = HALL
    b = T.p(hx - 2, 676)
    wijzer(d, T.p(hx, hy - 6), (b[0], b[1] + 14), "#3a3a3a", 3)
    label(d, b[0], b[1], "Hall sensor 1", fs, achter=KL["hall"], rand="#3a3a3a", sw=1.5)
    # busbaan-opschrift
    c = T.p(1000, BUS_Y)
    d.tekst(c[0], c[1], "BUSBAAN", 22, "#ffffff", True, "mm")
    c = T.p(780, 724)
    label(d, c[0], c[1] - 0.5, "AUTOPARCOURS", 20, kleur="#ffffff", achter=KL["auto_rand"], rand="#ffffff", sw=1.2)


def detail_labels(d, T):
    fs = 26
    for k, naam in (("lijnbus3", "Lijnbus 3"), ("lijnbus2", "Lijnbus 2"), ("lijnbus1", "Lijnbus 1"),
                    ("standmodel", "Standmodel")):
        x = STROOK_X[k]
        c = T.p(x, 600)
        label(d, c[0], c[1], naam, fs - 2, rand="#333", sw=1.5)
        c = T.p(x, 626)
        d.tekst(c[0], c[1], "BUS", 22, "#ffffff", True, "mm")
    for k, lx in (("W4", 560), ("W3", 618), ("W2", 676)):
        wx, wy = WISSELS[k]
        b = T.p(lx, 537)
        label(d, b[0], b[1], "Wissel " + k[1], fs - 2, kleur="#ffffff", achter=KL["wissel"], rand="#7a1512", sw=1.5)
    for nm, sid in (("IR LED 5", "lijnbus3"), ("IR LED 6", "lijnbus2"), ("IR LED 7", "lijnbus1")):
        x, y = STOPS[sid]
        c = T.p(x - 13, y + 17)
        label(d, c[0], c[1], nm, 19, kleur=KL["ir"], rand=KL["ir"], sw=1.5)
    hx, hy = HALL
    c = T.p(hx + 4, 690)
    wijzer(d, T.p(hx, hy - 6), (c[0], c[1] + 14), "#3a3a3a", 2.5)
    label(d, c[0], c[1], "Hall sensor 1", fs - 2, achter=KL["hall"], rand="#3a3a3a", sw=1.5)
    c = T.p(625, 744)
    d.tekst(c[0], c[1], "Stationstraat", 22, "#ffffff", True, "mm")


def noordpijl(d, cx, cy, L):
    hk = math.radians(HOEK)        # noord staat HOEK graden met de klok mee t.o.v. boven
    ux, uy = math.sin(hk), -math.cos(hk)
    nx, ny = -uy, ux
    top = (cx + ux * L * 0.5, cy + uy * L * 0.5)
    voet = (cx - ux * L * 0.5, cy - uy * L * 0.5)
    li = (voet[0] + nx * L * 0.22 - ux * 0.0, voet[1] + ny * L * 0.22)
    re = (voet[0] - nx * L * 0.22, voet[1] - ny * L * 0.22)
    mid = (cx - ux * L * 0.22, cy - uy * L * 0.22)
    d.poly([top, li, mid], fill="#1d1d1d")
    d.poly([top, mid, re], fill="#ffffff", stroke="#1d1d1d", sw=3)
    d.poly([top, li, mid], stroke="#1d1d1d", sw=3)
    d.tekst(top[0] + ux * 38, top[1] + uy * 38, "N", 52, "#1d1d1d", True, "mm")


def schaalbalk(d, x, y):
    L = 100 * PX_PER_M * MS
    for i in range(4):
        d.rrect(x + i * L / 4, y, L / 4, 22, 0, fill="#1d1d1d" if i % 2 == 0 else "#ffffff", stroke="#1d1d1d", sw=2.5)
    for i, t in enumerate(["0", "25", "50", "75", "100 m"]):
        d.lijn([(x + i * L / 4, y - 8), (x + i * L / 4, y)], "#1d1d1d", 2.5)
        d.tekst(x + i * L / 4 + (18 if i == 4 else 0), y - 30, t, 30, "#1d1d1d", True, "mm")
    return L


def legende(d, x, y, w, h):
    d.rrect(x, y, w, h, 18, fill="#ffffff", stroke="#2a2a2a", sw=3)
    d.tekst(x + 34, y + 50, "LEGENDE", 44, "#1d1d1d", True, "lm")
    rij, kol = 0, 0
    items = [
        ("auto", "autoparcours (auto's en bussen)"), ("bus", "busbaan (alleen bussen)"),
        ("halte", "haltestrook bus"), ("pijl", "rijrichting"), ("wissel", "wissel"),
        ("stop", "stoppunt"), ("ir", "IR-led (zender)"), ("hall", "hallsensor"),
        ("spoor", "spoor (rails en dwarsliggers)"), ("perron", "perron / verharding"),
        ("station", "stationsgebouw"), ("dak", "gebouw (dak)"), ("hotel", "hotel"),
        ("asfalt", "rijweg"), ("gras", "gras / groenstrook"), ("boom", "boom"),
    ]
    kolb = 600
    for i, (soort, txt) in enumerate(items):
        kol, rij = divmod(i, 8)
        ix = x + 34 + kol * kolb
        iy = y + 118 + rij * 82
        sx0, sx1 = ix, ix + 120
        if soort == "auto":
            d.lijn([(sx0, iy), (sx1, iy)], KL["auto_rand"], 36, cap="butt")
            d.lijn([(sx0, iy), (sx1, iy)], KL["auto_asfalt"], 30, cap="butt")
        elif soort in ("bus", "halte"):
            d.lijn([(sx0, iy), (sx1, iy)], KL["bus_rand"], 36, cap="butt")
            d.lijn([(sx0, iy), (sx1, iy)], KL["bus"], 30, cap="butt")
            if soort == "halte":
                d.tekst((sx0 + sx1) / 2, iy, "BUS", 22, "#ffffff", True, "mm")
        elif soort == "pijl":
            d.lijn([(sx0, iy), (sx1, iy)], KL["auto_asfalt"], 30, cap="butt")
            Tid = lambda p: p
            Tid.p = lambda a, b: (a, b)
            Tid.s = 1
            pijlen(d, Tid, [(sx0, iy), (sx1, iy)], 60, 22, "#ffffff", start=30)
        elif soort == "wissel":
            c = ((sx0 + sx1) / 2, iy)
            d.cirkel(c, 20, fill="#ffffff", stroke=KL["wissel"], sw=5.5)
            d.cirkel(c, 8, fill=KL["wissel"])
        elif soort == "stop":
            c = ((sx0 + sx1) / 2, iy)
            d.cirkel(c, 16, fill="#ffffff", stroke=KL["wissel"], sw=4)
            d.lijn([(c[0] - 8, c[1] - 8), (c[0] + 8, c[1] + 8)], KL["wissel"], 4)
            d.lijn([(c[0] - 8, c[1] + 8), (c[0] + 8, c[1] - 8)], KL["wissel"], 4)
        elif soort == "ir":
            teken_ir(d, ((sx0 + sx1) / 2, iy), 3.4)
        elif soort == "hall":
            d.cirkel(((sx0 + sx1) / 2, iy), 17, fill=KL["hall"], stroke="#3a3a3a", sw=3)
        elif soort == "spoor":
            d.rrect(sx0, iy - 22, 120, 44, 0, fill=KL["spoorbed"])
            for xx in np.arange(sx0 + 4, sx1, 9):
                d.lijn([(xx, iy - 18), (xx, iy + 18)], KL["dwars"], 3.5, cap="butt")
            for dy in (-10, 10):
                d.lijn([(sx0, iy + dy), (sx1, iy + dy)], KL["rail"], 2.6, cap="butt")
        elif soort == "boom":
            c = ((sx0 + sx1) / 2, iy)
            d.cirkel((c[0] + 4, c[1] + 5), 24, fill=KL["boomschaduw"])
            d.cirkel(c, 24, fill=KL["boom"], stroke=KL["boomrand"], sw=2)
            d.cirkel((c[0] - 6, c[1] - 6), 12, fill=KL["boomlicht"])
        else:
            vul = {"perron": (KL["perron"], "#9a978f"), "station": (KL["station"], KL["stationrand"]),
                   "dak": (KL["dak"][1], KL["dakrand"]), "hotel": (KL["hotel"], KL["hotelrand"]),
                   "asfalt": (KL["asfalt"], KL["asfaltrand"]), "gras": (KL["gras"], "#86a965")}[soort]
            d.rrect(sx0, iy - 22, 120, 44, 6, fill=vul[0], stroke=vul[1], sw=2.5)
        d.tekst(sx1 + 24, iy, txt, 30, "#1d1d1d", False, "lm")


def poster(d):
    d.rrect(0, 0, W, H, 0, fill="#f4f1ea")
    # titel
    d.tekst(MX + 4, 70, "SITUATIEPLAN - STATION TURNHOUT", 78, "#1d1d1d", True, "lm")
    d.tekst(MX + 6, 136, "Busbaan en autoparcours voor de modelbaan  ·  ondergrond hertekend uit de "
            "Google-satellietfoto (ligging 1 op 1), gedraaid zodat de sporen horizontaal liggen",
            32, "#4a4a4a", False, "lm")
    # kaart
    return Zicht(0, 0, MS, MX, MY)


def teken_kaart_vlak(d, T, met_bus=True, labels=None):
    teken_ondergrond(d, T)
    if met_bus:
        teken_busbaan(d, T)
        teken_symbolen(d, T)
    if labels:
        labels(d, T)


def paneel(d):
    y0 = PANEEL_Y
    hh = H - y0 - 34
    lw = 1250
    legende(d, MX, y0, lw, hh)
    # detail
    dx0, dy0, dx1, dy1 = DETAIL
    dw = 1000
    ds = dw / (dx1 - dx0)
    dh = (dy1 - dy0) * ds
    px, py = MX + lw + 30, y0
    titelh = 64
    d.rrect(px, py, dw + 24, dh + titelh + 24, 18, fill="#ffffff", stroke="#2a2a2a", sw=3)
    d.tekst(px + 26, py + 38, "DETAIL HALTESTROKEN", 38, "#1d1d1d", True, "lm")
    return (px + 12, py + titelh, dw, dh, ds), (px + dw + 24 + 30, y0, W - MX - (px + dw + 24 + 30), hh)


def rechterblok(d, box):
    x, y, w, h = box
    d.rrect(x, y, w, h, 18, fill="#ffffff", stroke="#2a2a2a", sw=3)
    noordpijl(d, x + 120, y + 150, 150)
    d.tekst(x + 230, y + 112, "Noord: Google is noord-boven;", 30, "#1d1d1d", False, "lm")
    d.tekst(x + 230, y + 152, f"het plan is {HOEK:.1f}° gedraaid", 30, "#1d1d1d", False, "lm")
    d.tekst(x + 230, y + 192, "(sporen horizontaal).", 30, "#1d1d1d", False, "lm")
    L = schaalbalk(d, x + 34, y + 330)
    d.tekst(x + 40, y + 400, f"Schaal: 50 m = {50 * PX_PER_M:.0f} px in de foto (aanname, zie README)", 28,
            "#4a4a4a", False, "lm")
    regels = [
        "Rijrichting: rechts rijden. Het autoparcours keert",
        "rond het Stationsplein en aan het oosteinde.",
        "Bussen takken af bij wissel 1, rijden achter het",
        "hotel langs de sporen en stoppen in de haltestroken.",
        "Hall sensor 1: ± 15 m na de laatste invoeging.",
    ]
    for i, t in enumerate(regels):
        d.tekst(x + 40, y + 480 + i * 46, t, 29, "#1d1d1d", False, "lm")
    meet = [
        f"Gemeten: sporenhoek {HOEK:.2f}° (HoughLines, {N_HOUGH} raillijnen, spreiding {SD_HOUGH:.2f}°)",
        f"Schets van Ian op de foto gelegd: {N_INL} SIFT-punten, {RMS_REG:.1f} px rms",
        "Vlakken, gebouwen, wegen en bomen liggen op hun plek in de foto",
        "(zie controle-overlay.png en controle-schets.png).",
    ]
    for i, t in enumerate(meet):
        d.tekst(x + 40, y + 740 + i * 40, t, 25, "#5a5a5a", False, "lm")
    return L


def maak_poster(d, is_pil):
    T = poster(d)
    if is_pil:
        sub = PilDoek(BW * MS, MH, d.k, KL["verharding"])
        Tl = Zicht(0, 0, MS, 0, 0)
        teken_kaart_vlak(sub, Tl, True, lambda dd, TT: kaart_labels(dd, TT, MS))
        d.plak(sub, MX, MY)
    else:
        d.clip_begin(MX, MY, BW * MS, MH)
        d.groep("kaart")
        teken_kaart_vlak(d, T, True, lambda dd, TT: kaart_labels(dd, TT, MS))
        d.groep_eind()
        d.clip_eind()
    d.rrect(MX, MY, BW * MS, MH, 0, stroke="#2a2a2a", sw=4)
    (ix, iy, dw, dh, ds), rb = paneel(d)
    dx0, dy0, dx1, dy1 = DETAIL
    if is_pil:
        sub = PilDoek(dw, dh, d.k, KL["verharding"])
        Td = Zicht(dx0 - X0, dy0 - Y0, ds, 0, 0)
        teken_kaart_vlak(sub, Td, True, detail_labels)
        d.plak(sub, ix, iy)
    else:
        Td = Zicht(dx0 - X0, dy0 - Y0, ds, ix, iy)
        d.clip_begin(ix, iy, dw, dh)
        teken_kaart_vlak(d, Td, True, detail_labels)
        d.clip_eind()
    d.rrect(ix, iy, dw, dh, 0, stroke="#2a2a2a", sw=2.5)
    # kader van het detail op de grote kaart
    a = T.p(dx0, dy0); b = T.p(dx1, dy1)
    d.rrect(a[0], a[1], b[0] - a[0], b[1] - a[1], 6, stroke="#1d1d1d", sw=3.5)
    d.tekst(a[0] + 8, a[1] + 22, "detail", 24, "#1d1d1d", True, "lm", halo="#ffffff", halo_w=4)
    rechterblok(d, rb)


# ----------------------------------------------------------------------------------------------
# 10. Uitvoer
# ----------------------------------------------------------------------------------------------
def schrijf_alles():
    # plan.svg
    sv = SvgDoek(W, H)
    maak_poster(sv, False)
    with open(os.path.join(HIER, "plan.svg"), "w", encoding="utf-8") as f:
        f.write(sv.svg("<title>Situatieplan Station Turnhout</title>"))
    # plan-3840x2160.png
    pd = PilDoek(W, H, 2, "#f4f1ea")
    maak_poster(pd, True)
    pd.beeld().save(os.path.join(HIER, "plan-3840x2160.png"))
    # plan-ondergrond.png (3 px per plan-px, zonder busbaan en labels)
    ON = 3
    od = PilDoek(BW * ON, BH * ON, 2, KL["verharding"])
    teken_ondergrond(od, Zicht(0, 0, ON, 0, 0))
    ond = od.beeld()
    ond.save(os.path.join(HIER, "plan-ondergrond.png"))
    # controlebeelden (2 px per plan-px)
    cd = PilDoek(BW * Z, BH * Z, 1, KL["verharding"])
    teken_ondergrond(cd, Zicht(0, 0, Z, 0, 0))
    getekend = cv2.cvtColor(np.array(cd.beeld()), cv2.COLOR_RGB2BGR)
    fotoZ = naar_uitsnede(A, foto)                       # originele foto, met labels
    ov = cv2.addWeighted(getekend, 0.5, fotoZ, 0.5, 0)
    ov[~geldig_f] = (ov[~geldig_f] * 0.6 + np.array([255, 255, 255]) * 0.4).astype(np.uint8)
    cv2.putText(ov, "CONTROLE: getekende ondergrond 50% over de Google-foto (grijs waas = buiten de foto, "
                "aangevuld uit Ian's schets)", (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 3, cv2.LINE_AA)
    cv2.putText(ov, "CONTROLE: getekende ondergrond 50% over de Google-foto (grijs waas = buiten de foto, "
                "aangevuld uit Ian's schets)", (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
    # zijdelings: foto | getekend | overlay
    cv2.imwrite(os.path.join(HIER, "controle-overlay.png"), np.vstack([ov, getekend, fotoZ]))
    # randcontrole: afstand van getekende randen tot fotoranden (zonder bomen: alleen vlakken)
    cd2 = PilDoek(BW * Z, BH * Z, 1, KL["verharding"])
    oud = BOMEN[:]
    BOMEN.clear()
    teken_ondergrond(cd2, Zicht(0, 0, Z, 0, 0))
    BOMEN.extend(oud)
    g2 = cv2.cvtColor(np.array(cd2.beeld()), cv2.COLOR_RGB2GRAY)
    e_plan = cv2.Canny(g2, 30, 90) > 0
    e_foto = cv2.Canny(cv2.GaussianBlur(cv2.cvtColor(bron_f, cv2.COLOR_BGR2GRAY), (5, 5), 1.2), 40, 110)
    dt = cv2.distanceTransform((e_foto == 0).astype(np.uint8), cv2.DIST_L2, 5)
    sel = e_plan & geldig_f & (m_uitsnede_labels() == 0)
    afst = dt[sel] / Z
    # plan + schets
    pl = PilDoek(BW * Z, BH * Z, 2, KL["verharding"])
    teken_kaart_vlak(pl, Zicht(0, 0, Z, 0, 0), True)
    plan_bgr = cv2.cvtColor(np.array(pl.beeld()), cv2.COLOR_RGB2BGR)
    sk = naar_uitsnede(S_R, schets)
    rood = naar_uitsnede(S_R, rood_s * 255, cv2.INTER_LINEAR) > 100
    grn = naar_uitsnede(S_R, groen_s * 255, cv2.INTER_LINEAR) > 100
    cs = cv2.addWeighted(plan_bgr, 0.62, sk, 0.38, 0)
    cs[rood] = (0.35 * cs[rood] + 0.65 * np.array([40, 40, 255])).astype(np.uint8)
    cs[grn] = (0.35 * cs[grn] + 0.65 * np.array([60, 255, 60])).astype(np.uint8)
    cv2.putText(cs, "CONTROLE: plan met Ian's schets (rood/groen = zijn stiftlijnen) erover", (12, 24),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 3, cv2.LINE_AA)
    cv2.putText(cs, "CONTROLE: plan met Ian's schets (rood/groen = zijn stiftlijnen) erover", (12, 24),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
    cv2.imwrite(os.path.join(HIER, "controle-schets.png"), cs)
    # afwijking busbaan t.o.v. Ian's lijnen
    afw = afwijking_schets(rood, grn)
    return afst, afw


def m_uitsnede_labels():
    return naar_uitsnede(A, m_foto, cv2.INTER_NEAREST)


def afwijking_schets(rood, grn):
    """Gemiddelde afstand (m) van onze rijbanen tot Ian's stiftlijnen (skelet niet nodig: afstand tot de streep)."""
    def dist(mask, pts):
        dt = cv2.distanceTransform((~mask).astype(np.uint8), cv2.DIST_L2, 5)
        v = []
        for x, y in pts:
            xi, yi = int((x - X0) * Z), int((y - Y0) * Z)
            if 0 <= xi < BW * Z and 0 <= yi < BH * Z:
                v.append(dt[yi, xi] / Z / PX_PER_M)
        return np.array(v)
    da = dist(rood, AUTOLUS)
    db = dist(grn, np.vstack([BUSBAAN] + list(STROKEN.values())))
    return {"autolus_m": [float(np.median(da)), float(np.percentile(da, 90))],
            "busbaan_m": [float(np.median(db)), float(np.percentile(db, 90))]}


# ----------------------------------------------------------------------------------------------
# 11. plan.json
# ----------------------------------------------------------------------------------------------
def lengte(p):
    p = np.asarray(p, float)
    return float(np.hypot(*np.diff(p, axis=0).T).sum())


def plaats_op(p, q, gesloten=False):
    """Afstand (m) langs polylijn p van het punt dat het dichtst bij q ligt."""
    p = np.asarray(p, float)
    if gesloten:
        p = np.vstack([p, p[:1]])
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    i = int(np.argmin(np.hypot(*(p - q).T)))
    return round(float(d[i] / PX_PER_M), 2)


def pt(x, y):
    px = [round(x - X0, 1), round(y - Y0, 1)]
    f = plan_naar_foto([px])[0]
    return {"px": px, "m": [round(px[0] / PX_PER_M, 2), round(px[1] / PX_PER_M, 2)],
            "foto_px": [round(float(f[0]), 1), round(float(f[1]), 1)]}


def baan(id_, naam, soort, p, gesloten, richting, begin=None, eind=None, breedte_m=3.5):
    p = np.asarray(p, float)
    q = herbemonster(p if not gesloten else p, PX_PER_M * 0.5, gesloten)    # punt om de 0,5 m
    px = [[round(x - X0, 1), round(y - Y0, 1)] for x, y in q]
    L = lengte(np.vstack([q, q[:1]]) if gesloten else q) / PX_PER_M
    return {"id": id_, "naam": naam, "soort": soort, "gesloten": gesloten, "richting": richting,
            "breedte_m": breedte_m, "lengte_m": round(L, 2), "begin": begin, "eind": eind,
            "punten_px": px, "punten_m": [[round(a / PX_PER_M, 2), round(b / PX_PER_M, 2)] for a, b in px]}


def schrijf_json(afst, afw):
    lus = AUTOLUS
    rij = [baan("autolus", "Autoparcours Stationstraat (heen en terug, keerlussen aan beide kanten)", "auto",
                lus, True, "volgorde van de punten (rechts rijden: oostwaarts op de zuidstrook, westwaarts op de "
                "noordstrook, tegen de klok in rond het plein)")]
    rij.append(baan("busbaan", "Busbaan achter het hotel", "bus", BUSBAAN, False, "van begin naar eind",
                    begin={"op": "autolus", "wissel": "W1", "afstand_m": plaats_op(lus, BUSBAAN[0], True)},
                    eind={"gaat_over_in": "halte_lijnbus3"}))
    namen = {"lijnbus3": ("Lijnbus 3", None), "lijnbus2": ("Lijnbus 2", "W4"), "lijnbus1": ("Lijnbus 1", "W3"),
             "standmodel": ("Standmodel", "W2")}
    for k, (nm, w) in namen.items():
        p = STROKEN[k]
        begin = ({"op": "busbaan", "wissel": w, "afstand_m": plaats_op(BUSBAAN, p[0])} if w else
                 {"op": "busbaan", "einde": True, "afstand_m": round(lengte(BUSBAAN) / PX_PER_M, 2)})
        eind = {"voegt_in_op": "autolus", "afstand_m": plaats_op(lus, p[-1], True)}
        rij.append(baan("halte_" + k, "Haltestrook " + nm, "bus", p, False, "van begin naar eind", begin, eind))
    wissels = []
    for k, (x, y) in WISSELS.items():
        op = "autolus" if k == "W1" else "busbaan"
        tak = {"W1": "busbaan", "W2": "halte_standmodel", "W3": "halte_lijnbus1", "W4": "halte_lijnbus2"}[k]
        e = {"id": k, "naam": "Wissel " + k[1], "op": op, "tak": tak,
             "afstand_m": plaats_op(lus if op == "autolus" else BUSBAAN, (x, y), op == "autolus")}
        e.update(pt(x, y)); wissels.append(e)
    stops = []
    for k, (x, y) in STOPS.items():
        e = {"id": "stop_" + k, "naam": "Stoppunt " + namen[k][0], "rijbaan": "halte_" + k,
             "afstand_m": plaats_op(STROKEN[k], (x, y))}
        e.update(pt(x, y)); stops.append(e)
    irs = []
    for i, (k, (sid,)) in enumerate(IR.items()):
        x, y = STOPS[sid]
        e = {"id": k, "naam": f"IR LED {k[2:]}", "bij_stop": "stop_" + sid}
        e.update(pt(x - 13, y)); irs.append(e)
    hall = {"id": "HALL1", "naam": "Hall sensor 1", "rijbaan": "autolus", "afstand_m": plaats_op(lus, HALL, True),
            "opmerking": "15 m na de laatste invoeging (lijnbus 3), in de rijrichting (AANNAME)"}
    hall.update(pt(*HALL))
    meta = {
        "titel": "Situatieplan Station Turnhout - busbaan en autoparcours",
        "versie": 1,
        "coordinaten": {
            "px": "pixels van de kaartuitsnede (1400 x 378), oorsprong linksboven, x naar rechts (langs de sporen, "
                  "naar het oosten), y naar beneden (naar de Stationstraat)",
            "m": "zelfde assen in meter: m = px / px_per_m",
            "foto_px": "pixels in de oorspronkelijke Google-uitsnede ed8e1394 (1290 x 848, noord boven)",
            "px_per_m": round(PX_PER_M, 4),
            "kaart_px": [BW, BH],
            "noord_graden": round(HOEK, 2),
            "noord_uitleg": "noord wijst zoveel graden met de klok mee vanaf 'boven' op de kaart",
            "plan_naar_foto_matrix": [[round(float(v), 6) for v in r] for r in
                                      (A3inv @ np.array([[1, 0, X0], [0, 1, Y0], [0, 0, 1]], float))[:2]],
        },
        "afbeeldingen": {
            "plan-ondergrond.png": {"breedte": BW * 3, "hoogte": BH * 3, "schaal": 3, "x0": 0, "y0": 0,
                                    "uitleg": "doek_px = px * schaal + (x0, y0)"},
            "plan-3840x2160.png": {"breedte": W, "hoogte": H, "schaal": round(MS, 5), "x0": MX, "y0": MY},
        },
        "rijbanen": rij,
        "wissels": wissels,
        "stoppunten": stops,
        "ir_leds": irs,
        "hallsensoren": [hall],
        "lantaarns": [], "lichtgroepen": [], "speakers": [], "servos": [], "seinen": [],
        "metingen": {
            "sporenhoek_graden": round(HOEK, 3), "sporenhoek_spreiding": round(SD_HOUGH, 3),
            "hough_lijnen": N_HOUGH, "schets_registratie_inliers": N_INL,
            "schets_registratie_rms_px": round(RMS_REG, 2),
            "randafstand_plan_foto_px": {"mediaan": round(float(np.median(afst)), 2),
                                          "p80": round(float(np.percentile(afst, 80)), 2)},
            "afstand_tot_ian_lijnen_m": afw,
            "uit_foto_procent": round(100 * UIT_FOTO, 1),
        },
    }
    with open(os.path.join(HIER, "plan.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    return meta


if __name__ == "__main__":
    afst, afw = schrijf_alles()
    meta = schrijf_json(afst, afw)
    print("sporenhoek %.2f graden (%d lijnen, sd %.2f)" % (HOEK, N_HOUGH, SD_HOUGH))
    print("schets op foto: %d inliers, rms %.2f px" % (N_INL, RMS_REG))
    print("randafstand plan-foto: mediaan %.2f px, p80 %.2f px" % (np.median(afst), np.percentile(afst, 80)))
    print("afstand tot Ian's lijnen:", afw)
    print("bomen %d, daken %d, luifels %d" % (len(BOMEN), len(DAKEN), len(LUIFELS)))
