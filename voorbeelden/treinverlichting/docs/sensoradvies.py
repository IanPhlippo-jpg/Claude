"""Advies extra sensoren om bussen en auto's nauwkeurig te volgen, uitgewerkt op het situatieplan.

Draai:  python voorbeelden/treinverlichting/docs/sensoradvies.py
Leest situatieplan/plan.json (rijbanen, wissels, stoppunten, hallsensor in pixels) en schrijft docs/Sensoradvies.png
(de achtergrond met elke voorgestelde sensor) en docs/sensoradvies.json (de lijst, in hetzelfde pixelstelsel, met de
afstand langs de baan, zodat de tv-pagina en de doos ze als meetpunt kunnen gebruiken).

Regels (Ian, 2026-11-15: "Ik moet hierop kunnen zien hoe de bussen of auto's aan het rijden zijn"):
- een sensor bij elk stoppunt (aankomst van de bus: de bus staat er echt), bij elke wissel (net na de wissel op de
  afbuigende tak: bevestigt welke kant de bus nam) en bij elke invoeging (de bus is vertrokken);
- op de lange stukken om de ± 50 cm op de modelbaan (daartussen schat de tv met de gemeten snelheid);
- vlak voor wissel 1 een IR-ontvanger die de bus herkent (zijn code): zo weet de doos welke bus de busbaan op rijdt;
- hallsensoren (SS441A of A3144, magneet onder het voertuig) waar alleen "er reed iets voorbij" nodig is; een
  reflexsensor met fototransistor ("FTR", TCRT5000-module) aan de stoppunten: die ziet ook een stilstaande bus.
AANNAMES: schaal van het plan 1 m = 5 px (situatieplan/README.md) en de modelbaan in H0, 1:87: 50 cm op de baan is dan
43,5 m in het echt = 217,5 px.
"""
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HIER = Path(__file__).resolve().parent
PLAN = HIER.parent / 'situatieplan'
SCHAAL_MODEL = 87.0  # H0 (AANNAME)
STAP_M = 0.50  # om de 50 cm op de modelbaan


def lengtes(pts):
    s = [0.0]
    for a, b in zip(pts, pts[1:]):
        s.append(s[-1] + math.dist(a, b))
    return s


def op(pts, s_cum, d):
    """punt op afstand d langs de polylijn"""
    d = max(0.0, min(d, s_cum[-1]))
    for i in range(1, len(pts)):
        if s_cum[i] >= d:
            t = (d - s_cum[i - 1]) / max(s_cum[i] - s_cum[i - 1], 1e-9)
            return (pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]))
    return tuple(pts[-1])


def maak():
    plan = json.loads((PLAN / 'plan.json').read_text(encoding='utf8'))
    # Fable 5.2 V3: een modelbaan is bijna altijd ingekort. Staat er in plan.json een gemeten "mm_op_de_baan_per_px" (2 punten
    # op de echte baan opgemeten), dan rekent het advies daarmee; anders met de schaal van de foto en H0 (AANNAME)
    if plan.get('mm_op_de_baan_per_px'):
        stap = STAP_M * 1000 / plan['mm_op_de_baan_per_px']
        bron_schaal = f"gemeten: {plan['mm_op_de_baan_per_px']} mm op de baan per px"
    else:
        pxm = plan['schaal']['px_per_m']
        stap = STAP_M * SCHAAL_MODEL * pxm  # px tussen 2 sensoren op een lang stuk
        bron_schaal = f'H0 1:{SCHAAL_MODEL:.0f} = {stap:.0f} px, AANNAME: 2 punten op de baan opmeten (mm_op_de_baan_per_px)'
    banen = {b['id']: b for b in plan['rijbanen']}
    for b in banen.values():
        b['_s'] = lengtes(b['punten'])
    sensoren = []

    def zet(soort, baan, d, waarom, id_=None, bestaand=False):
        b = banen[baan]
        x, y = op(b['punten'], b['_s'], d)
        sensoren.append({'id': id_ or f'{soort.upper()}{len(sensoren) + 1}', 'soort': soort, 'baan': baan,
                         'afstand_px': round(d, 1), 'x': round(x, 1), 'y': round(y, 1), 'waarom': waarom,
                         'bestaat': bestaand})

    # vaste punten: de bestaande hallsensor, de stoppunten, de wissels, de invoegingen en de herkenning voor W1
    for h in plan['hallsensoren']:
        zet('hall', h['baan'], h['afstand_px'], 'bestaat al (hallsensor 1)', h['id'], True)
    w1 = next(w for w in plan['wissels'] if w['id'] == 'W1')
    zet('ir', w1['baan'], w1['afstand_px'] - 60, 'IR-ontvanger voor wissel 1: herkent de bus (zijn code)', 'IRRX1')
    for w in plan['wissels']:
        zet('hall', w['afbuigen'], 40, f'net na {w["id"]} op de afbuigende tak: de bus nam deze kant', f'HW{w["id"][1:]}')
    for s in plan['stoppunten']:
        # Fable 5.2 S2: aan het stoppunt volstaat een doorritsensor (de halte weet dan dat de bus er staat)
        zet('hall', s['baan'], s['afstand_px'] - 12, f'hallsensor aan {s["id"]}: de bus komt aan de halte (aankomstpunt)', f'HS_{s["id"][5:]}')
    for b in banen.values():
        if b['soort'] == 'bus' and (b.get('eind') or {}).get('voegt_in_op'):
            # Fable 5.2 S2: aan de invoeging een sensor die aanwezigheid ziet (een stilstaande auto): reflexsensor
            zet('ftr', b['id'], b['_s'][-1] - 25, 'reflexsensor vlak voor de invoeging: verkeer vrij, de bus is vertrokken', f'FTR_{b["id"][6:]}')
    # de lange stukken: om de 50 cm (model), tussen de vaste punten op dezelfde baan
    for b in banen.values():
        if b['id'].startswith('halte_'):
            continue  # de haltestroken zijn ± 70 cm: stoppunt + invoeging volstaan
        vast = sorted(s['afstand_px'] for s in sensoren if s['baan'] == b['id'])
        if b['id'] == 'busbaan':
            vast = sorted(vast + [0.0] + [w['afstand_px'] for w in plan['wissels'] if w['baan'] == 'busbaan'])
        else:  # de wissels en de invoegingen op deze baan: daar staat al een sensor (op de tak) vlak bij
            vast = sorted(vast + [w['afstand_px'] for w in plan['wissels'] if w['baan'] == b['id']]
                          + [h['eind']['afstand_px'] for h in banen.values() if (h.get('eind') or {}).get('voegt_in_op') == b['id']])
        L = b['_s'][-1]
        rand = vast + ([vast[0] + L] if b.get('gesloten') else [L])
        if not b.get('gesloten'):
            rand = [0.0] + rand
        for a, c in zip(rand, rand[1:]):
            n = int((c - a) / stap)  # zoveel extra sensoren dat geen gat groter is dan de stap
            for k in range(1, n + 1):
                d = (a + k * (c - a) / (n + 1)) % L
                zet('hall', b['id'], d, 'om de ± 50 cm', None)
    # nummeren per soort
    teller = {}
    for s in sensoren:
        if s['id'].startswith('HALL') and not s['bestaat'] and s['waarom'] == 'om de ± 50 cm':
            teller['hall'] = teller.get('hall', 1) + 1
            s['id'] = f'HALL{teller["hall"]}'
    # tekenen
    im = Image.open(PLAN / plan['achtergrond']).convert('RGB')
    f = 2
    im = im.resize((im.width * f, im.height * f), Image.LANCZOS)
    dr = ImageDraw.Draw(im)
    try:
        font = ImageFont.truetype('arialbd.ttf', 22)
        klein = ImageFont.truetype('arial.ttf', 26)
    except OSError:
        font = klein = ImageFont.load_default()
    kleur = {'hall': (255, 196, 0), 'ir': (170, 60, 255), 'ftr': (0, 190, 255)}
    for s in sensoren:
        x, y = s['x'] * f, s['y'] * f
        r = 13 if s['soort'] != 'ir' else 16
        dr.ellipse([x - r, y - r, x + r, y + r], fill=kleur[s['soort']], outline=(0, 0, 0) if not s['bestaat'] else (255, 255, 255), width=4)
        links = x > im.width - 260 or s['id'].startswith('FTR_')
        tx = x - 16 - dr.textlength(s['id'], font=font) if links else x + 16
        dr.text((tx, y - 30), s['id'], font=font, fill=(255, 255, 255), stroke_width=3, stroke_fill=(0, 0, 0))
    n = {k: sum(1 for s in sensoren if s['soort'] == k) for k in kleur}
    nieuw = sum(1 for s in sensoren if not s['bestaat'])
    leg = [f'Sensoradvies: {nieuw} nieuwe sensoren (+ hallsensor 1 die er al is)',
           f'geel = hallsensor omnipolair ({n["hall"]}), blauw = reflexsensor aan de invoeging ({n["ftr"]}), paars = IR-ontvanger ({n["ir"]})',
           f'om de ± 50 cm ({bron_schaal}), bij elke wissel, elk stoppunt en elke invoeging']
    dr.rectangle([20, 20, 1460, 20 + 40 * len(leg) + 16], fill=(255, 255, 255))
    for i, t in enumerate(leg):
        dr.text((36, 30 + 40 * i), t, font=klein, fill=(20, 20, 20))
    im.save(HIER / 'Sensoradvies.png', optimize=True)
    for s in sensoren:
        s.pop('_s', None)
    (HIER / 'sensoradvies.json').write_text(json.dumps({'schaal': bron_schaal, 'stap_px': round(stap, 1),
                                                       'sensoren': sensoren}, ensure_ascii=False, indent=1), encoding='utf8')
    print(f'{len(sensoren)} sensoren ({nieuw} nieuw): {n}; stap {stap:.1f} px')
    for s in sensoren:
        print(f"  {s['id']:<14} {s['soort']:<5} {s['baan']:<17} {s['afstand_px']:>7.1f} px  {s['waarom']}")


if __name__ == '__main__':
    maak()
