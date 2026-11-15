# -*- coding: utf-8 -*-
"""Situatieplan Station Turnhout op de achtergrond van Ian (achtergrond.jpg, 1718 x 724).

Meet de rijstroken in het beeld, legt de rijbanen als polylijnen op het hart van elke strook en schrijft:
  plan.json                rijbanen, wissels, stoppunten, IR-leds, hallsensor, verkeerslichten (pixels van het beeld)
  plan.svg                 tv-plaat 3840 x 2160: beeld + vectorlaag + titel, legende, noordpijl, schaal
  plan-3840x2160.png       dezelfde plaat als PNG
  controle-banen.png       de polylijnen dik op het beeld (nakijken)
  tv.html                  krijgt een kopie van plan.json ingebakken (werkt ook via file://)

Gebruik:  python maak-plan.py          Nodig: Python 3, numpy, opencv (cv2), Pillow.
"""
import base64, json, math, os, re
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

HIER = os.path.dirname(os.path.abspath(__file__))
BEELD = os.path.join(HIER, "achtergrond.jpg")
im = cv2.imread(BEELD)
IH, IW = im.shape[:2]
assert (IW, IH) == (1718, 724), (IW, IH)

# ----------------------------------------------------------------------------------------------
# 1. Rijstroken meten: asfalt = neutraal grijs; runs langs scanlijnen -> hart van elke strook
# ----------------------------------------------------------------------------------------------
b_, g_, r_ = [im[..., i].astype(int) for i in range(3)]
ASFALT = (abs(b_ - g_) < 12) & (abs(g_ - r_) < 12) & (g_ > 85) & (g_ < 135)
ASFALT = cv2.morphologyEx(ASFALT.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0


def runs(lijn, a, b, minl=8):
    uit, s = [], None
    for i in range(a, b):
        if lijn[i] and s is None:
            s = i
        if (not lijn[i]) and s is not None:
            if i - s > minl:
                uit.append((s, i - 1))
            s = None
    return uit


def meet():
    m = {}
    # bovenkant van de buslus (tussen gebouw en sporen)
    c = [np.mean(runs(ASFALT[:, x], 300, 365)[0]) for x in range(1100, 1540, 20)]
    m["y_boven"] = float(np.median(c))
    # Stationstraat: twee stroken gescheiden door de middenstreep
    yn, ys = [], []
    for x in range(1100, 1560, 4):
        r = [q for q in runs(ASFALT[:, x], 530, 620) if q[1] - q[0] > 15]
        if len(r) == 2:
            yn.append(np.mean(r[0])); ys.append(np.mean(r[1]))
    m["y_noord"], m["y_zuid"] = float(np.median(yn)), float(np.median(ys))
    # rechterbeen van de buslus
    c = [np.mean(runs(ASFALT[y], 1570, 1680)[0]) for y in range(400, 521, 10)]
    m["x_rechts"] = float(np.median(c))
    # 4 schuine stroken: x = a + b * y
    ys_, xs_ = [], [[] for _ in range(4)]
    for y in range(360, 512, 5):
        r = [q for q in runs(ASFALT[y], 520, 1080) if q[1] - q[0] > 30]
        if len(r) == 4:
            ys_.append(y)
            for k in range(4):
                xs_[k].append(np.mean(r[k]))
    m["stroken"] = []
    for k in range(4):
        bb, aa = np.polyfit(ys_, xs_[k], 1)
        res = np.array(xs_[k]) - (aa + bb * np.array(ys_))
        m["stroken"].append({"a": float(aa), "b": float(bb), "rms": float(np.sqrt((res ** 2).mean()))})
    # rotonde: groen eiland -> middelpunt; buitenrand asfalt langs de horizontale lijn door het middelpunt
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    gr = (hsv[..., 0] > 30) & (hsv[..., 0] < 50) & (hsv[..., 1] > 90)
    sub = np.zeros_like(gr); sub[500:640, 130:260] = gr[500:640, 130:260]
    n, lab, st, cen = cv2.connectedComponentsWithStats(sub.astype(np.uint8))
    i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    cx, cy = cen[i]
    r_eil = math.sqrt(st[i, cv2.CC_STAT_AREA] / math.pi)
    rij = ASFALT[int(round(cy))]
    links = [q for q in runs(rij, 60, int(cx)) if q[1] - q[0] > 15][-1]
    m["rotonde"] = {"x": float(cx), "y": float(cy), "r_eiland": float(r_eil), "r_buiten": float(cx - links[0]),
                    "r_binnen_asfalt": float(cx - links[1])}
    return m


MAAT = meet()
YT, YN, YS, XR = MAAT["y_boven"], MAAT["y_noord"], MAAT["y_zuid"], MAAT["x_rechts"]
STR = MAAT["stroken"]
ROT = MAAT["rotonde"]
R_ROT = (ROT["r_buiten"] + ROT["r_binnen_asfalt"]) / 2          # hart van de rotondebaan
assert 325 < YT < 342 and 552 < YN < 570 and 580 < YS < 596 and 1600 < XR < 1635, MAAT


def strook_x(k, y):
    return STR[k]["a"] + STR[k]["b"] * y


PX_PER_M = 5.0          # AANNAME: hotel ± 100 m lang (gemeten in de Google-foto) = ± 500 px in dit beeld

# ----------------------------------------------------------------------------------------------
# 2. Rijbanen opbouwen (rechte stukken + bogen) en herbemonsteren
# ----------------------------------------------------------------------------------------------
def herbemonster(p, stap, gesloten=False):
    p = np.array(p, float)
    if gesloten:
        p = np.vstack([p, p[:1]])
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]
    n = max(2, int(round(d[-1] / stap)) + 1)
    s = np.linspace(0, d[-1], n)
    q = np.c_[np.interp(s, d, p[:, 0]), np.interp(s, d, p[:, 1])]
    return q[:-1] if gesloten else q


def afronden(hoeken, stralen):
    """Polylijn door 'hoeken' met bogen (straal per binnenhoek)."""
    P = [np.array(h, float) for h in hoeken]
    uit = [P[0]]
    for i in range(1, len(P) - 1):
        u1 = P[i] - P[i - 1]; u1 /= np.linalg.norm(u1)
        u2 = P[i + 1] - P[i]; u2 /= np.linalg.norm(u2)
        th = math.acos(max(-1.0, min(1.0, float(u1 @ u2))))
        r = stralen[i - 1]
        if th < 1e-3 or r <= 0:
            uit.append(P[i]); continue
        d = r * math.tan(th / 2)
        t1 = P[i] - u1 * d
        kruis = u1[0] * u2[1] - u1[1] * u2[0]
        nrm = np.array([-u1[1], u1[0]]) * (1 if kruis > 0 else -1)
        c = t1 + nrm * r
        a0 = math.atan2(t1[1] - c[1], t1[0] - c[0])
        t2 = P[i] + u2 * d
        a1 = math.atan2(t2[1] - c[1], t2[0] - c[0])
        da = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
        for t in np.linspace(0, 1, max(4, int(abs(da) * r / 2))):
            uit.append(c + r * np.array([math.cos(a0 + da * t), math.sin(a0 + da * t)]))
    uit.append(P[-1])
    return herbemonster(uit, 1.0)


def chaikin(pts, n=4):
    p = np.array(pts, float)
    for _ in range(n):
        q = np.roll(p, -1, 0)
        p = np.stack([0.75 * p + 0.25 * q, 0.25 * p + 0.75 * q], 1).reshape(-1, 2)
    return p


def boog(cx, cy, r, a0, a1, n):
    return [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in np.linspace(a0, a1, n)]


# autolus: oostwaarts op de zuidstrook, keren aan de rechterrand, westwaarts op de noordstrook,
# tegen de klok in rond de rotonde (rechts rijden)
XU = IW - 4 - (YS - YN)
YC = (YN + YS) / 2
_ctrl = ([(330, YS), (900, YS), (XU, YS)] + boog(XU, YC, (YS - YN) / 2, 90, -90, 15)
         + [(900, YN), (330, YN), (ROT["x"] + R_ROT + 14, YN - 3)]
         + boog(ROT["x"], ROT["y"], R_ROT, -22, -338, 24) + [(ROT["x"] + R_ROT + 14, YS + 3)])
AUTOLUS = herbemonster(chaikin(_ctrl, 4), 1.0, gesloten=True)

R_BOCHT = 25.0
X_TOP = [strook_x(k, YT) for k in range(4)]
X_BOT = [strook_x(k, YN) for k in range(4)]


def tak_start(k):
    """Punt op de bovenkant waar de boog naar strook k begint (= wissel)."""
    u1 = np.array([-1.0, 0.0])
    u2 = np.array([X_BOT[k] - X_TOP[k], YN - YT]); u2 /= np.linalg.norm(u2)
    th = math.acos(float(u1 @ u2))
    return X_TOP[k] + R_BOCHT * math.tan(th / 2)


def strookbaan(k, met_aanloop=True):
    x0 = tak_start(k)
    eind = X_BOT[k] - 40
    return afronden([(x0, YT), (X_TOP[k], YT), (X_BOT[k], YN), (eind, YN)], [R_BOCHT, R_BOCHT])


W1 = (XR + 30.0, YN)
BUSBAAN = afronden([W1, (XR, YN), (XR, YT), (tak_start(0), YT)], [30.0, 45.0])
NAMEN = ["lijnbus3", "lijnbus2", "lijnbus1", "standmodel"]
TITELS = {"lijnbus3": "Lijnbus 3", "lijnbus2": "Lijnbus 2", "lijnbus1": "Lijnbus 1", "standmodel": "Standmodel"}
STROKEN = {NAMEN[k]: strookbaan(k) for k in range(4)}
WISSELS = {"W1": W1, "W2": (tak_start(3), YT), "W3": (tak_start(2), YT), "W4": (tak_start(1), YT)}
WISSEL_TAK = {"W1": "busbaan", "W2": "halte_standmodel", "W3": "halte_lijnbus1", "W4": "halte_lijnbus2"}
STOP_Y = 468.0
STOPS = {NAMEN[k]: (strook_x(k, STOP_Y), STOP_Y) for k in range(4)}
IR = {"IR5": "lijnbus3", "IR6": "lijnbus2", "IR7": "lijnbus1"}
IR_POS = {k: (STOPS[s][0] - 36, STOP_Y) for k, s in IR.items()}
LICHT_Y = 522.0
LICHTEN = {"VL_" + NAMEN[k]: (strook_x(k, LICHT_Y) + 34, LICHT_Y) for k in range(4)}
HALL = (X_BOT[3] + 75.0, YN)        # net rechts (stroomopwaarts) van de invoegingen


# ----------------------------------------------------------------------------------------------
# 3. plan.json
# ----------------------------------------------------------------------------------------------
def cumul(p, gesloten=False):
    p = np.asarray(p, float)
    if gesloten:
        p = np.vstack([p, p[:1]])
    return np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]


def plaats_op(p, q, gesloten=False):
    p = np.asarray(p, float)
    d = cumul(p, gesloten)
    i = int(np.argmin(np.hypot(*(p - np.asarray(q, float)).T)))
    return float(d[i])


def r1(v):
    return round(float(v), 1)


def baan(id_, naam, soort, p, gesloten, richting, breedte_px, begin=None, eind=None):
    q = herbemonster(p, 2.0, gesloten)
    L = cumul(q, gesloten)[-1]
    return {"id": id_, "naam": naam, "soort": soort, "gesloten": gesloten, "richting": richting,
            "breedte_px": r1(breedte_px), "lengte_px": r1(L), "lengte_m": round(L / PX_PER_M, 2),
            "begin": begin, "eind": eind, "punten": [[r1(x), r1(y)] for x, y in q]}


def maak_json():
    rij = [baan("autolus", "Autoparcours Stationstraat (heen en terug, keerlus aan de rotonde en aan de rechterrand)",
                "auto", AUTOLUS, True,
                "in de volgorde van de punten: oostwaarts op de zuidstrook, keren aan de rechterrand, westwaarts op de "
                "noordstrook, tegen de klok in rond de rotonde", YS - YN)]
    rij.append(baan("busbaan", "Busbaan rond het hotel (alleen bussen)", "bus", BUSBAAN, False,
                    "van begin naar eind: bij wissel 1 van de Stationstraat af, omhoog, naar links tussen gebouw en sporen",
                    30, begin={"van": "autolus", "wissel": "W1", "afstand_px": r1(plaats_op(AUTOLUS, BUSBAAN[0], True))},
                    eind={"gaat_over_in": "halte_lijnbus3"}))
    for k, nm in enumerate(NAMEN):
        p = STROKEN[nm]
        w = {1: "W4", 2: "W3", 3: "W2"}.get(k)
        begin = ({"van": "busbaan", "wissel": w, "afstand_px": r1(plaats_op(BUSBAAN, p[0]))} if w else
                 {"van": "busbaan", "einde": True, "afstand_px": r1(cumul(BUSBAAN)[-1])})
        eind = {"voegt_in_op": "autolus", "afstand_px": r1(plaats_op(AUTOLUS, p[-1], True))}
        rij.append(baan("halte_" + nm, "Haltestrook " + TITELS[nm], "bus", p, False, "van begin (boven) naar eind "
                        "(invoegen op de Stationstraat)", 50, begin, eind))
    banen = {b["id"]: b for b in rij}

    def op(baan_id, q):
        b = banen[baan_id]
        pts = np.array(b["punten"]); d = cumul(pts, b["gesloten"])
        i = int(np.argmin(np.hypot(*(pts - np.asarray(q)).T)))
        return r1(d[i])

    wissels = [{"id": k, "naam": "Wissel " + k[1], "x": r1(x), "y": r1(y),
                "baan": "autolus" if k == "W1" else "busbaan",
                "afstand_px": op("autolus" if k == "W1" else "busbaan", (x, y)),
                "rechtdoor": "autolus" if k == "W1" else "busbaan", "afbuigen": WISSEL_TAK[k]}
               for k, (x, y) in WISSELS.items()]
    stops = [{"id": "STOP_" + nm, "naam": "Stoppunt " + TITELS[nm], "x": r1(x), "y": r1(y), "baan": "halte_" + nm,
              "afstand_px": op("halte_" + nm, (x, y))} for nm, (x, y) in STOPS.items()]
    irs = [{"id": k, "naam": "IR LED " + k[2:], "x": r1(x), "y": r1(y), "stoppunt": "STOP_" + IR[k],
            "baan": "halte_" + IR[k]} for k, (x, y) in IR_POS.items()]
    hall = [{"id": "HALL1", "naam": "Hall sensor 1", "x": r1(HALL[0]), "y": r1(HALL[1]), "baan": "autolus",
             "afstand_px": op("autolus", HALL),
             "opmerking": "op de noordstrook, net stroomopwaarts van de invoegingen: bewaakt het verkeer naar de haltes"}]
    lichten = [{"id": k, "naam": "Verkeerslicht " + TITELS[k[3:]], "x": r1(x), "y": r1(y), "baan": "halte_" + k[3:],
                "afstand_px": op("halte_" + k[3:], (x - 34, y))} for k, (x, y) in LICHTEN.items()]
    plan = {
        "titel": "Situatieplan Station Turnhout - busbaan en autoparcours",
        "versie": 2,
        "achtergrond": "achtergrond.jpg",
        "breedte": IW, "hoogte": IH,
        "coordinaten": "pixels van achtergrond.jpg, oorsprong linksboven, x naar rechts, y naar beneden",
        "schaal": {"px_per_m": PX_PER_M, "aanname": True,
                   "uitleg": "AANNAME: het hotel is in de Google-foto ± 100 m lang (50 m = 243 px) en in dit beeld "
                             "± 500 px; 1 m = 5 px. Nadien te controleren met een gemeten maat van de modelbaan."},
        "noord_graden": 26.8,
        "noord_uitleg": "noord wijst 26,8 graden met de klok mee vanaf 'boven' (sporen liggen horizontaal)",
        "rijbanen": rij,
        "wissels": wissels,
        "stoppunten": stops,
        "ir_leds": irs,
        "hallsensoren": hall,
        "verkeerslichten": lichten,
        "lantaarns": [], "lichtgroepen": [], "speakers": [], "servos": [], "seinen": [],
        "metingen": {k: (round(v, 2) if isinstance(v, float) else v) for k, v in MAAT.items()},
    }
    return plan


PLAN = maak_json()

# ----------------------------------------------------------------------------------------------
# 4. Tekendoek (SVG + PIL met supersampling)
# ----------------------------------------------------------------------------------------------
FONT_R = r"C:\Windows\Fonts\segoeui.ttf"
FONT_B = r"C:\Windows\Fonts\segoeuib.ttf"
_fonts = {}


def font(size, vet=True):
    key = (int(round(size)), vet)
    if key not in _fonts:
        _fonts[key] = ImageFont.truetype(FONT_B if vet else FONT_R, max(1, key[0]))
    return _fonts[key]


def tekstbreedte(s, size, vet=True):
    return font(size * 4, vet).getlength(s) / 4.0


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


class SvgDoek:
    def __init__(self, w, h):
        self.w, self.h, self.el = w, h, []

    @staticmethod
    def _pad(pts, sluit=True):
        return "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + (" Z" if sluit else "")

    def beeld(self, pad, x, y, w, h):
        data = base64.b64encode(open(pad, "rb").read()).decode()
        self.el.append(f'<image x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" '
                       f'preserveAspectRatio="none" href="data:image/jpeg;base64,{data}"/>')

    def poly(self, pts, fill=None, stroke=None, sw=0):
        st = f' stroke="{stroke}" stroke-width="{sw:.2f}" stroke-linejoin="round"' if stroke else ""
        self.el.append(f'<path d="{self._pad(pts)}" fill="{fill or "none"}"{st}/>')

    def lijn(self, pts, kleur, sw, alfa=1.0, cap="round", dash=None):
        a = f' stroke-opacity="{alfa}"' if alfa < 1 else ""
        da = f' stroke-dasharray="{dash[0]:.1f} {dash[1]:.1f}"' if dash else ""
        self.el.append(f'<path d="{self._pad(pts, False)}" fill="none" stroke="{kleur}" stroke-width="{sw:.2f}" '
                       f'stroke-linecap="{cap}" stroke-linejoin="round"{a}{da}/>')

    def cirkel(self, c, r, fill=None, stroke=None, sw=0):
        st = f' stroke="{stroke}" stroke-width="{sw:.2f}"' if stroke else ""
        self.el.append(f'<circle cx="{c[0]:.1f}" cy="{c[1]:.1f}" r="{r:.2f}" fill="{fill or "none"}"{st}/>')

    def rrect(self, x, y, w, h, r, fill=None, stroke=None, sw=0):
        st = f' stroke="{stroke}" stroke-width="{sw:.2f}"' if stroke else ""
        self.el.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r:.1f}" '
                       f'fill="{fill or "none"}"{st}/>')

    def tekst(self, x, y, s, size, kleur="#1d1d1d", vet=True, anker="mm"):
        ta = {"l": "start", "m": "middle", "r": "end"}[anker[0]]
        s = s.replace("&", "&amp;").replace("<", "&lt;")
        self.el.append(f'<text x="{x:.1f}" y="{y:.1f}" font-family="Segoe UI, Arial, sans-serif" font-size="{size:.1f}" '
                       f'font-weight="{700 if vet else 400}" fill="{kleur}" text-anchor="{ta}" '
                       f'dominant-baseline="central">{s}</text>')

    def svg(self):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" viewBox="0 0 {self.w} {self.h}">'
                f'<title>Situatieplan Station Turnhout</title>\n' + "\n".join(self.el) + "\n</svg>\n")


class PilDoek:
    def __init__(self, w, h, k=2, achter="#ffffff"):
        self.w, self.h, self.k = w, h, k
        self.im = Image.new("RGB", (int(w * k), int(h * k)), achter)
        self.d = ImageDraw.Draw(self.im)

    def _p(self, pts):
        return [(x * self.k, y * self.k) for x, y in pts]

    def beeld(self, pad, x, y, w, h):
        b = Image.open(pad).convert("RGB").resize((int(round(w * self.k)), int(round(h * self.k))), Image.LANCZOS)
        self.im.paste(b, (int(round(x * self.k)), int(round(y * self.k))))

    def poly(self, pts, fill=None, stroke=None, sw=0):
        if fill:
            self.d.polygon(self._p(pts), fill=fill)
        if stroke and sw > 0:
            self.d.line(self._p(list(pts) + [pts[0]]), fill=stroke, width=max(1, int(round(sw * self.k))), joint="curve")

    def _worst(self, draw, pp, w, kleur):
        q = herbemonster(np.array(pp), max(1.0, w / 4.0))
        draw.line([tuple(a) for a in q], fill=kleur, width=w)
        r = w / 2.0
        for x, y in q:
            draw.ellipse([x - r, y - r, x + r, y + r], fill=kleur)

    def lijn(self, pts, kleur, sw, alfa=1.0, cap="round", dash=None):
        w = max(1, int(round(sw * self.k)))
        pp = self._p(pts)
        if alfa < 1:
            m = Image.new("L", self.im.size, 0)
            self._worst(ImageDraw.Draw(m), pp, w, 255)
            m = m.point(lambda v: int(v * alfa))
            self.im.paste(Image.new("RGB", self.im.size, kleur), (0, 0), m)
            return
        if dash:
            p = np.array(pp, float); d = cumul(p)
            s = 0.0
            while s < d[-1]:
                e = min(s + dash[0] * self.k, d[-1]); ss = np.linspace(s, e, 6)
                self.d.line(list(zip(np.interp(ss, d, p[:, 0]), np.interp(ss, d, p[:, 1]))), fill=kleur, width=w)
                s = e + dash[1] * self.k
            return
        if w >= 6 and cap == "round":
            self._worst(self.d, pp, w, kleur)
        else:
            self.d.line(pp, fill=kleur, width=w, joint="curve")

    def cirkel(self, c, r, fill=None, stroke=None, sw=0):
        k = self.k
        self.d.ellipse([(c[0] - r) * k, (c[1] - r) * k, (c[0] + r) * k, (c[1] + r) * k], fill=fill, outline=stroke,
                       width=max(1, int(round(sw * k))) if stroke else 0)

    def rrect(self, x, y, w, h, r, fill=None, stroke=None, sw=0):
        k = self.k
        self.d.rounded_rectangle([x * k, y * k, (x + w) * k, (y + h) * k], radius=r * k, fill=fill, outline=stroke,
                                 width=max(1, int(round(sw * k))) if stroke else 0)

    def tekst(self, x, y, s, size, kleur="#1d1d1d", vet=True, anker="mm"):
        self.d.text((x * self.k, y * self.k), s, font=font(size * self.k, vet), fill=kleur, anchor=anker)

    def resultaat(self):
        return self.im.resize((int(self.w), int(self.h)), Image.LANCZOS)


# ----------------------------------------------------------------------------------------------
# 5. Tv-plaat 3840 x 2160: titel boven, beeld (2,37:1, niet vervormd), band met legende onder
# ----------------------------------------------------------------------------------------------
W, H = 3840, 2160
MX, MY = 40, 150
S = (W - 2 * MX) / IW
MH = IH * S
BAND_Y = MY + MH + 22
KL = dict(auto="#d62f2b", bus="#1f9e48", pijl="#ffffff", wissel="#d62f2b", ir="#8e3bc4", hall="#f5c400",
          tekst="#1d1d1d", rand="#2a2a2a")


def T(pts):
    return [(MX + x * S, MY + y * S) for x, y in pts]


def Tp(x, y):
    return (MX + x * S, MY + y * S)


def offset(p, d):
    p = np.asarray(p, float)
    t = np.gradient(p, axis=0)
    t /= np.maximum(np.hypot(t[:, 0], t[:, 1]), 1e-9)[:, None]
    n = np.c_[-t[:, 1], t[:, 0]]
    return p + n * d


def pijlen(d, pts, tussen, maat, kleur, start, rand="#333333"):
    p = np.asarray(pts, float); dd = cumul(p)
    for sa in np.arange(start, dd[-1] - 3, tussen):
        x, y = np.interp(sa, dd, p[:, 0]), np.interp(sa, dd, p[:, 1])
        x2, y2 = np.interp(sa + 2, dd, p[:, 0]), np.interp(sa + 2, dd, p[:, 1])
        ux, uy = x2 - x, y2 - y; L = math.hypot(ux, uy) or 1; ux, uy = ux / L, uy / L
        nx, ny = -uy, ux
        a = (x + ux * maat * 0.6, y + uy * maat * 0.6)
        b = (x - ux * maat * 0.4 + nx * maat * 0.5, y - uy * maat * 0.4 + ny * maat * 0.5)
        c = (x - ux * maat * 0.1, y - uy * maat * 0.1)
        e = (x - ux * maat * 0.4 - nx * maat * 0.5, y - uy * maat * 0.4 - ny * maat * 0.5)
        d.poly(T([a, b, c, e]), fill=kleur, stroke=rand, sw=1.5)


def label(d, x, y, tekst, size, kleur=KL["tekst"], achter="#ffffff", rand=KL["rand"], sw=2.5):
    w = tekstbreedte(tekst, size) + 0.9 * size
    h = size * 1.62
    d.rrect(x - w / 2, y - h / 2, w, h, h * 0.28, fill=achter, stroke=rand, sw=sw)
    d.tekst(x, y - size * 0.05, tekst, size, kleur, True, "mm")


def wijzer(d, a, b, kleur=KL["rand"], sw=3.0):
    d.lijn([a, b], kleur, sw)


def teken_ir(d, c, r, aan=False):
    d.cirkel(c, r, fill="#ffffff" if not aan else "#e9d4f7", stroke=KL["ir"], sw=r * 0.26)
    d.cirkel(c, r * 0.32, fill=KL["ir"])
    for rr in (0.58, 0.8):
        for a0, a1 in ((-50, 50), (130, 230)):
            d.lijn([(c[0] + r * rr * math.cos(math.radians(a)), c[1] + r * rr * math.sin(math.radians(a)))
                    for a in np.linspace(a0, a1, 8)], KL["ir"], r * 0.13)


def teken_licht(d, c, h, rood=True):
    w = h * 0.42
    d.rrect(c[0] - w / 2, c[1] - h / 2, w, h, w * 0.3, fill="#262626", stroke="#111", sw=2)
    d.cirkel((c[0], c[1] - h * 0.22), w * 0.32, fill="#e53935" if rood else "#4a1a1a")
    d.cirkel((c[0], c[1] + h * 0.22), w * 0.32, fill="#2e7d32" if rood else "#43e05a")


def teken_banen(d):
    # doorschijnende vulling (hart + breedte), daarna randen en pijlen
    d.lijn(T(np.vstack([AUTOLUS, AUTOLUS[:1]])), KL["auto"], (YS - YN) * S * 0.96, alfa=0.16)
    for b in [BUSBAAN] + list(STROKEN.values()):
        d.lijn(T(b), KL["bus"], 26 * S, alfa=0.22)
    # rand van het autoparcours: buitenkant van elke rijrichting (rechts in de rijrichting)
    rand = offset(np.vstack([AUTOLUS, AUTOLUS[:1]]), (YS - YN) / 2)
    d.lijn(T(rand), KL["auto"], 3.2 * S)
    for b in [BUSBAAN] + list(STROKEN.values()):
        for sgn in (1, -1):
            d.lijn(T(offset(b, sgn * 13)), KL["bus"], 2.8 * S)
    lus = np.vstack([AUTOLUS, AUTOLUS[:1]])
    pijlen(d, lus, 150, 15, KL["pijl"], 60)
    pijlen(d, BUSBAAN, 160, 15, KL["pijl"], 50)
    for b in STROKEN.values():
        pijlen(d, b, 120, 15, KL["pijl"], 60)


def teken_markeringen(d):
    for k, (x, y) in WISSELS.items():
        c = Tp(x, y)
        d.cirkel(c, 9 * S, fill="#ffffff", stroke=KL["wissel"], sw=2.6 * S)
        d.cirkel(c, 3.6 * S, fill=KL["wissel"])
    for nm, (x, y) in STOPS.items():
        c = Tp(x, y); r = 7.5 * S
        d.cirkel(c, r, fill="#ffffff", stroke=KL["wissel"], sw=2.0 * S)
        q = r * 0.5
        d.lijn([(c[0] - q, c[1] - q), (c[0] + q, c[1] + q)], KL["wissel"], 2.0 * S)
        d.lijn([(c[0] - q, c[1] + q), (c[0] + q, c[1] - q)], KL["wissel"], 2.0 * S)
    for k, (x, y) in IR_POS.items():
        teken_ir(d, Tp(x, y), 8 * S)
    for k, (x, y) in LICHTEN.items():
        teken_licht(d, Tp(x, y), 22 * S)
    d.cirkel(Tp(*HALL), 8 * S, fill=KL["hall"], stroke="#3a3a3a", sw=1.8 * S)


def teken_labels(d):
    fs = 40
    label(d, *Tp(300, 113), "Diksmuidestraat", fs, rand="#555", sw=2)
    label(d, *Tp(1240, 620), "Stationstraat", fs, rand="#555", sw=2)
    label(d, *Tp(330, 470), "Station Turnhout", fs + 2, rand="#7b3122", sw=3)
    label(d, *Tp(1290, 412), "Turnhout City Hotel", fs + 2, rand="#55595f", sw=3)
    for k, nm in enumerate(NAMEN):
        c = Tp(strook_x(k, 405), 405)
        label(d, *c, TITELS[nm], 34)
    for k in ("W4", "W3", "W2"):
        x, y = WISSELS[k]
        a = Tp(x, y - 9); b = Tp(x + 18, 298)
        wijzer(d, (b[0], b[1] + 25), a, KL["wissel"], 4)
        label(d, *b, "Wissel " + k[1], 34, kleur="#ffffff", achter=KL["wissel"], rand="#7a1512")
    x, y = WISSELS["W1"]
    b = Tp(1676, 500)
    wijzer(d, (b[0] - 20, b[1] + 25), Tp(x + 4, y - 8), KL["wissel"], 4)
    label(d, *b, "Wissel 1", 34, kleur="#ffffff", achter=KL["wissel"], rand="#7a1512")
    for k, (x, y) in IR_POS.items():
        label(d, *Tp(x - 2, y + 30), "IR LED " + k[2:], 26, kleur=KL["ir"], rand=KL["ir"], sw=2.5)
    b = Tp(HALL[0] + 6, 640)
    wijzer(d, Tp(HALL[0], HALL[1] + 8), (b[0], b[1] - 25), "#3a3a3a", 4)
    label(d, *b, "Hall sensor 1", 34, achter=KL["hall"], rand="#3a3a3a")


def noordpijl(d, cx, cy, L):
    hk = math.radians(26.8)
    ux, uy = math.sin(hk), -math.cos(hk); nx, ny = -uy, ux
    top = (cx + ux * L / 2, cy + uy * L / 2); voet = (cx - ux * L / 2, cy - uy * L / 2)
    li = (voet[0] + nx * L * 0.22, voet[1] + ny * L * 0.22); re = (voet[0] - nx * L * 0.22, voet[1] - ny * L * 0.22)
    mid = (cx - ux * L * 0.22, cy - uy * L * 0.22)
    d.poly([top, li, mid], fill="#1d1d1d", stroke="#1d1d1d", sw=3)
    d.poly([top, mid, re], fill="#ffffff", stroke="#1d1d1d", sw=3)
    d.tekst(top[0] + ux * 34, top[1] + uy * 34, "N", 46, "#1d1d1d", True, "mm")


def schaalbalk(d, x, y):
    L = 100 * PX_PER_M * S
    for i in range(4):
        d.rrect(x + i * L / 4, y, L / 4, 20, 0, fill="#1d1d1d" if i % 2 == 0 else "#ffffff", stroke="#1d1d1d", sw=2.5)
    for i, t in enumerate(["0", "25", "50", "75", "100 m"]):
        d.tekst(x + i * L / 4 + (22 if i == 4 else 0), y - 26, t, 28, "#1d1d1d", True, "mm")
    return L


def band(d):
    y0 = BAND_Y; h = H - y0 - 30
    d.rrect(MX, y0, W - 2 * MX, h, 18, fill="#ffffff", stroke=KL["rand"], sw=3)
    d.tekst(MX + 34, y0 + 46, "LEGENDE", 40, "#1d1d1d", True, "lm")
    items = [("auto", "autoparcours (auto's en bussen)"), ("bus", "busbaan en haltestroken (alleen bussen)"),
             ("pijl", "rijrichting"), ("wissel", "wissel"), ("stop", "stoppunt"), ("ir", "IR-led (stopcommando)"),
             ("hall", "hallsensor"), ("licht", "verkeerslicht bij het invoegen")]
    kolw = [760, 600, 640]
    for i, (soort, txt) in enumerate(items):
        kol, rij = divmod(i, 3)
        ix = MX + 34 + sum(kolw[:kol]) if kol < 3 else 0
        iy = y0 + 110 + rij * 82
        c = (ix + 60, iy)
        if soort in ("auto", "bus"):
            kl = KL[soort]
            d.lijn([(ix, iy), (ix + 120, iy)], kl, 40, alfa=0.25 if soort == "bus" else 0.18, cap="butt")
            for dy in (-20, 20):
                if soort == "bus" or dy == 20:
                    d.lijn([(ix, iy + dy), (ix + 120, iy + dy)], kl, 6, cap="butt")
        elif soort == "pijl":
            d.lijn([(ix, iy), (ix + 120, iy)], "#6d6d6d", 36, cap="butt")
            for xx in (ix + 35, ix + 90):
                d.poly([(xx + 14, iy), (xx - 10, iy - 14), (xx - 4, iy), (xx - 10, iy + 14)], fill="#ffffff",
                       stroke="#333", sw=1.5)
        elif soort == "wissel":
            d.cirkel(c, 20, fill="#ffffff", stroke=KL["wissel"], sw=6); d.cirkel(c, 8, fill=KL["wissel"])
        elif soort == "stop":
            d.cirkel(c, 17, fill="#ffffff", stroke=KL["wissel"], sw=4.5)
            d.lijn([(c[0] - 8, c[1] - 8), (c[0] + 8, c[1] + 8)], KL["wissel"], 4.5)
            d.lijn([(c[0] - 8, c[1] + 8), (c[0] + 8, c[1] - 8)], KL["wissel"], 4.5)
        elif soort == "ir":
            teken_ir(d, c, 18)
        elif soort == "hall":
            d.cirkel(c, 18, fill=KL["hall"], stroke="#3a3a3a", sw=4)
        elif soort == "licht":
            teken_licht(d, c, 50)
        d.tekst(ix + 146, iy, txt, 30, "#1d1d1d", False, "lm")
    # rechts: noordpijl, schaal, uitleg
    rx = MX + 34 + sum(kolw) + 30
    d.lijn([(rx - 30, y0 + 24), (rx - 30, y0 + h - 24)], "#d0d0d0", 2, cap="butt")
    noordpijl(d, rx + 70, y0 + h / 2 + 6, 130)
    schaalbalk(d, rx + 190, y0 + 92)
    d.tekst(rx + 190, y0 + 150, f"Schaal: 1 m = {PX_PER_M:.0f} px in het beeld (AANNAME, zie README)", 26,
            "#4a4a4a", False, "lm")
    for i, t in enumerate(["Rechts rijden. Auto's rijden alleen op het autoparcours; bussen slaan bij wissel 1 af,",
                           "stoppen in hun haltestrook en voegen weer in op de Stationstraat als hall sensor 1 vrij is.",
                           "Noord: 26,8° gedraaid (de sporen liggen horizontaal)."]):
        d.tekst(rx + 190, y0 + 200 + i * 40, t, 26, "#1d1d1d", False, "lm")


def plaat(d):
    d.rrect(0, 0, W, H, 0, fill="#f4f1ea")
    d.tekst(MX + 2, 62, "SITUATIEPLAN - STATION TURNHOUT", 74, "#1d1d1d", True, "lm")
    d.tekst(MX + 4, 120, "Busbaan en autoparcours voor de modelbaan van Ian  ·  rood = auto's en bussen  ·  "
            "groen = alleen bussen", 32, "#4a4a4a", False, "lm")
    d.beeld(BEELD, MX, MY, IW * S, MH)
    teken_banen(d)
    teken_markeringen(d)
    teken_labels(d)
    d.rrect(MX, MY, IW * S, MH, 0, stroke=KL["rand"], sw=4)
    band(d)


def controle_banen():
    c = im.copy()
    kl = {"auto": (40, 40, 230), "bus": (40, 170, 40)}
    for b in PLAN["rijbanen"]:
        p = np.round(np.array(b["punten"]) * 4).astype(np.int32)
        cv2.polylines(c, [p], b["gesloten"], kl[b["soort"]], 3, cv2.LINE_AA, 2)
        m = p[len(p) // 3] // 4
        cv2.putText(c, b["id"], (int(m[0]) + 6, int(m[1]) - 6), 0, 0.45, (0, 0, 0), 3, cv2.LINE_AA)
        cv2.putText(c, b["id"], (int(m[0]) + 6, int(m[1]) - 6), 0, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
    for lst, kleur in (("wissels", (0, 0, 255)), ("stoppunten", (0, 0, 160)), ("ir_leds", (200, 50, 140)),
                       ("hallsensoren", (0, 200, 255)), ("verkeerslichten", (20, 20, 20))):
        for e in PLAN[lst]:
            cv2.circle(c, (int(round(e["x"])), int(round(e["y"]))), 6, kleur, -1, cv2.LINE_AA)
            cv2.putText(c, e["id"], (int(e["x"]) + 8, int(e["y"]) + 16), 0, 0.4, (0, 0, 0), 3, cv2.LINE_AA)
            cv2.putText(c, e["id"], (int(e["x"]) + 8, int(e["y"]) + 16), 0, 0.4, (255, 255, 255), 1, cv2.LINE_AA)
    c = cv2.resize(c, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    cv2.imwrite(os.path.join(HIER, "controle-banen.png"), c)


def bak_in_tv():
    pad = os.path.join(HIER, "tv.html")
    if not os.path.exists(pad):
        return False
    s = open(pad, encoding="utf-8").read()
    blok = "/*PLAN-BEGIN*/" + json.dumps(PLAN, ensure_ascii=False, separators=(",", ":")) + "/*PLAN-EINDE*/"
    s2 = re.sub(r"/\*PLAN-BEGIN\*/.*?/\*PLAN-EINDE\*/", lambda _: blok, s, flags=re.S)
    open(pad, "w", encoding="utf-8").write(s2)
    return True


if __name__ == "__main__":
    with open(os.path.join(HIER, "plan.json"), "w", encoding="utf-8") as f:
        json.dump(PLAN, f, ensure_ascii=False, indent=1)
    sv = SvgDoek(W, H); plaat(sv)
    with open(os.path.join(HIER, "plan.svg"), "w", encoding="utf-8") as f:
        f.write(sv.svg())
    pd = PilDoek(W, H, 2, "#f4f1ea"); plaat(pd)
    pd.resultaat().save(os.path.join(HIER, "plan-3840x2160.png"))
    controle_banen()
    print("metingen:", json.dumps(PLAN["metingen"]))
    print("rijbanen:", [(b["id"], b["lengte_px"]) for b in PLAN["rijbanen"]])
    print("tv.html bijgewerkt:", bak_in_tv())
