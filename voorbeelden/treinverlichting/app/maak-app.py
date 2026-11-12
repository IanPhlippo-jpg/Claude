"""
Builds the one-page app with every drawing and print file of the cable box (Kabeldoos treinverlichting) into app/uit/:
index.html (from sjabloon.html), the renders cut out of the CAD window, the step pictures of the build plan, the
drawings and the wiring diagram as SVG, the PDFs, the print parts as a compact net for the 3D view, and two zips (the
STL's, and everything). The STL's travel in a zip: a page can only hand over a set list of file types.

Sources: this folder (README, print/, tekeningen/, schema/, firmware/, docs/) and the pictures that
e2e/tools/bouwschema-trein.mjs and the photo run left in e2e-out/ (run those first after a change to the box).
Usage (from the repo root): python voorbeelden/treinverlichting/app/maak-app.py
"""
import base64, html, io, json, re, shutil, struct, subprocess, zipfile
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
BOX = HERE.parent
ROOT = BOX.parent.parent
OUT = HERE / 'uit'
E2E = ROOT / 'e2e-out'

# empty the output folder (the folder itself may be in use by a preview server)
OUT.mkdir(exist_ok=True)
for p in OUT.iterdir():
    shutil.rmtree(p) if p.is_dir() else p.unlink()
for d in ('img', 'svg', 'pdf', 'dl', 'net'):
    (OUT / d).mkdir()

esc = html.escape


def md_inline(s: str) -> str:
    s = esc(s, quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', s)
    return s


README = (BOX / 'README.md').read_text(encoding='utf-8')


def md_section(title: str) -> str:
    m = re.search(r'^## ' + re.escape(title) + r'\n(.*?)(?=^## |\Z)', README, re.S | re.M)
    if not m:
        raise SystemExit('README has no section ' + title)
    return m.group(1).strip()


def md_table(title: str, total_last=False) -> str:
    rows = [l for l in md_section(title).splitlines() if l.startswith('|')]
    head = [c.strip() for c in rows[0].strip('|').split('|')]
    align = [c.strip() for c in rows[1].strip('|').split('|')]
    right = [a.endswith(':') for a in align]
    out = ['<div class="tablebox"><table><thead><tr>']
    out += [f'<th{" class=r" if right[i] else ""}>{md_inline(h)}</th>' for i, h in enumerate(head)]
    out.append('</tr></thead><tbody>')
    body = rows[2:]
    for k, r in enumerate(body):
        cells = [c.strip() for c in r.strip('|').split('|')]
        total = total_last and k == len(body) - 1
        out.append('<tr class="total">' if total else '<tr>')
        out += [f'<td{" class=r" if right[i] else ""}>{md_inline(c)}</td>' for i, c in enumerate(cells)]
        out.append('</tr>')
    out.append('</tbody></table></div>')
    return ''.join(out)


def md_paragraphs(title: str) -> str:
    """the running text of a section (tables and bullet lists left out)"""
    parts = []
    for block in md_section(title).split('\n\n'):
        if block.startswith('|') or block.startswith('- '):
            continue
        parts.append('<p>' + md_inline(' '.join(block.split())) + '</p>')
    return ''.join(parts)


# ---------- files that can be saved ----------
FILES = {}


def add_file(key, src: Path | None, dest: str, naam: str, wat: str, data: bytes | None = None):
    """a file the page can save; a zip cannot be served as such, so it travels as base64 text and the page turns it
    back into the same bytes before saving"""
    if data is None:
        data = src.read_bytes()
    if dest.endswith('.zip'):
        dest += '.b64.txt'
        (OUT / dest).write_text(base64.b64encode(data).decode('ascii'), encoding='ascii')
    else:
        (OUT / dest).write_bytes(data)
    FILES[key] = {'pad': dest, 'naam': naam, 'wat': wat, 'bytes': len(data), **({'b64': True} if dest.endswith('.b64.txt') else {})}


def dots(n: int) -> str:
    return f'{n:,}'.replace(',', '.')


def size(n: int) -> str:
    return f'{n / 1e6:.1f} MB'.replace('.', ',') if n >= 1e6 else f'{round(n / 1e3)} kB'


def zip_bytes(entries: list[tuple[str, Path | bytes]]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, src in entries:
            if isinstance(src, Path):
                z.write(src, name)
            else:
                z.writestr(name, src)
    return buf.getvalue()


PRINT_TXT = """Kabeldoos treinverlichting (versie 3) - printbestanden

Kabeldoos-bak.stl          de bodem op het bed            229,8 x 229,8 x 42,0 mm   PETG zwart, ongeveer 360 g, 14 uur
Kabeldoos-deksel.stl       de buitenkant op het bed       229,8 x 229,8 x 24,7 mm   PETG grijs, ongeveer 190 g, 7 uur
Gootdeksels-plaat.stl      de vlakke kant op het bed      211,0 x 132,4 x 8,9 mm    PETG grijs, ongeveer 70 g, 3 uur
Hulpstukken.stl            plat op het bed                2 werkhaken en de spatel  PETG grijs, ongeveer 15 g, 1 uur

Elegoo Centauri Carbon (bed 256 x 256), PETG, zonder support. Elk deel is hoogstens 230 x 230: leg het in het midden van
het bed, dan blijft de hoek voor het filamentmes (rechtsvoor 10 x 20) vrij, ook met een skirt.
0,2 mm lagen, 4 wanden, 30 % gyroid (zoals bij de afzuiging); de bak met buitenwanden op 40 mm/s (hoge, dunne vingers).
Na het printen: een bordje klikt in zijn 4 klemlippen, een gootdeksel klikt over zijn goot.
"""
STL_NAMEN = ['Kabeldoos-bak.stl', 'Kabeldoos-deksel.stl', 'Gootdeksels-plaat.stl', 'Hulpstukken.stl']
stl = [(n, BOX / 'print' / n) for n in STL_NAMEN]
add_file('stl', None, 'dl/Kabeldoos-printbestanden.zip', 'Kabeldoos-printbestanden.zip',
         'De vier STL\'s (bak, deksel, plaat met 9 gootdeksels, hulpstukken), dicht en manifold, met de printinstellingen', zip_bytes(stl + [('LEESMIJ-printen.txt', PRINT_TXT.encode('utf-8'))]))
add_file('alles-pdf', BOX / 'Kabeldoos-alles-afdrukken.pdf', 'pdf/Kabeldoos-alles-afdrukken.pdf', 'Kabeldoos-alles-afdrukken.pdf',
         'Alles samen om af te drukken: uitleg, bouwschema, tekeningen, schema, dashboard en rekenblad')
add_file('werk-pdf', BOX / 'tekeningen' / 'Werktekeningen-kabeldoos.pdf', 'pdf/Werktekeningen-kabeldoos.pdf', 'Werktekeningen-kabeldoos.pdf',
         'Boormal op ware grootte (TRN-00, A3), bak, deksel, gootdeksel, hulpstukken, opbouw van de 4 gaatjesprints, interne draadlijst, meetblad en invulblad')
add_file('bouw-pdf', BOX / 'tekeningen' / 'Bouwschema-kabeldoos.pdf', 'pdf/Bouwschema-kabeldoos.pdf', 'Bouwschema-kabeldoos.pdf',
         'De bouwstappen met beelden, van printen tot meten')

# everything: the source folder as it is (no build output of the firmware, not this app)
alles = []
for p in sorted(BOX.rglob('*')):
    rel = p.relative_to(BOX).as_posix()
    if p.is_dir() or rel.startswith('app/') or '/.pio/' in '/' + rel or rel.endswith('.gitignore'):
        continue
    alles.append(('Kabeldoos-treinverlichting/' + rel, p))
add_file('alles-zip', None, 'dl/Kabeldoos-treinverlichting-alles.zip', 'Kabeldoos-treinverlichting-alles.zip',
         f'De hele map ({len(alles)} bestanden): STL\'s, PDF\'s, tekeningen, schema, CAD-modellen (.kcad), firmware en rekenblad', zip_bytes(alles))

# ---------- drawings and wiring diagram as SVG ----------
DRAWINGS = [
    ('TRN-00', 'TRN-00-boormal.svg', 'Boormal', '1:1', 'Plak hem onder de baan (van onderen gezien) en boor de 4 kruisjes voor. Druk hem af op A3 op ware grootte (100 %) en meet de controlemaat van 100 mm na.'),
    ('TRN-01', 'TRN-01-bak.svg', 'Bak', '1:2,5', 'De bak met alle maten: de ringen rond de rijen bordjes, de kabelgoten met vingers en sleuven, sleutelgaten, schroefpaaltjes en kabelinvoeren.'),
    ('TRN-02', 'TRN-02-deksel.svg', 'Deksel', '1:2,5', 'Het deksel met de drukribben op de bordjes en de 4 verzonken schroefgaten.'),
    ('TRN-03', 'TRN-03-gootdeksel.svg', 'Gootdeksel', 'vrij', 'Het klikdeksel van een goot, met de lengtes van alle 9 deksels.'),
    ('TRN-04', 'TRN-04-hulpstukken.svg', 'Hulpstukken', 'vrij', 'De 2 werkhaken (de doos op werkhoogte laten hangen) en de spatel met haakje voor de smalle goten en de klemlippen.'),
    ('TRN-10', 'TRN-10-opbouw-uitgang.svg', 'Opbouw uitgangsprint', '2:1', '16 MOSFET\'s op 8 adapterprintjes in voetjes, 16 polyfuses, de klemmen -X3 en de PCA9685 erboven: componentenzijde en koperzijde met alle bruggen.'),
    ('TRN-11', 'TRN-11-opbouw-ingang.svg', 'Opbouw ingangsprint', '2:1', '4 optocouplers LTV-844, 16 weerstanden, de polyfuse van de knoppen en de 24 klemmen -X4 met de COM per 4 ingangen.'),
    ('TRN-12', 'TRN-12-opbouw-voeding.svg', 'Opbouw voedingsprint', '2:1', 'Klem 12 V in, zekering, P-MOSFET tegen ompolen, elco en de klemmen -X2.'),
    ('TRN-13', 'TRN-13-opbouw-drager.svg', 'Opbouw draagprint ESP', '2:1', 'De 2 pinrijen van de ESP, de regelaar 12 -> 5 V eronder en de pull-up van OE.'),
    ('TRN-14', 'TRN-14-draadlijst.svg', 'Interne draadlijst', '—', 'De 44 draden tussen de prints met doorsnede, kleur en lengte; de 0 V-retour met 0,75 mm².'),
    ('TRN-20', 'TRN-20-meetblad.svg', 'Meetblad', 'A4', 'Ingebruikname: spanningen, OE, de stroom en de spanning over de MOSFET per groep, elke ingang.'),
    ('TRN-21', 'TRN-21-invulblad.svg', 'Invulblad', 'A4', 'De namen van de groepen en de ingangen, om bij de baan te hangen.'),
]
for no, f, *_ in DRAWINGS:
    add_file('svg-' + no, BOX / 'tekeningen' / f, 'svg/' + f, f, 'Tekening ' + no + ' als SVG')
SCHEMA_N = len(list((BOX / 'schema').glob('blad-*.svg')))
SCHEMA_TITELS = {}
for n in range(1, SCHEMA_N + 1):
    shutil.copyfile(BOX / 'schema' / f'blad-{n}.svg', OUT / 'svg' / f'schema-blad-{n}.svg')
    svg = (BOX / 'schema' / f'blad-{n}.svg').read_text(encoding='utf-8')
    # de bladbenaming uit het titelblok (vet, 4 mm) en de tweede regel
    t = re.findall(r'<text[^>]*font-size="4"[^>]*>([^<]*)</text>', svg)
    SCHEMA_TITELS[n] = html.unescape(' · '.join(t[:2]))
add_file('schema-pdf', BOX / 'schema' / 'Aansluitschema-kabeldoos.pdf', 'pdf/Aansluitschema-kabeldoos.pdf', 'Aansluitschema-kabeldoos.pdf',
         f'Het aansluitschema in {SCHEMA_N} bladen A3, opgemaakt zoals EPLAN en volgens IEC 61082-1, 60617, 81346 en ISO 7200')
add_file('schema-zip', None, 'dl/Aansluitschema-kabeldoos.zip', 'Aansluitschema-kabeldoos.zip',
         f'Het aansluitschema in {SCHEMA_N} bladen (SVG) en als webpagina',
         zip_bytes([(f'blad-{n}.svg', BOX / 'schema' / f'blad-{n}.svg') for n in range(1, SCHEMA_N + 1)] + [('schema.html', BOX / 'schema' / 'schema.html')]))

# ---------- pictures ----------
def cut_render(name: str, out: str, width=1400):
    """the model window of a Phlippo CAD screenshot, trimmed to the model and its shadow"""
    im = Image.open(E2E / f'{name}.png').convert('RGB')
    a = np.asarray(im).astype(np.int16)
    x0, y0, x1, y1 = 345, 150, 1885, 1025
    win = a[y0:y1, x0:x1]
    bg = np.median(win, axis=1, keepdims=True)
    diff = np.abs(win - bg).sum(axis=2) > 40
    ys, xs = np.nonzero(diff)
    pad = 36
    l = max(0, xs.min() - pad); r = min(win.shape[1], xs.max() + pad)
    t = max(0, ys.min() - pad); b = min(win.shape[0], ys.max() + pad)
    crop = im.crop((x0 + l, y0 + t, x0 + r, y0 + b))
    if crop.width > width:
        crop = crop.resize((width, round(crop.height * width / crop.width)), Image.LANCZOS)
    crop.save(OUT / 'img' / out, 'WEBP', quality=82, method=6)
    return crop.size


def to_webp(src: Path, out: str, width: int):
    im = Image.open(src).convert('RGB')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(OUT / 'img' / out, 'WEBP', quality=82, method=6)
    return im.size


RENDERS = [
    ('trein-doos-open', 'doos-open.webp', 'De bak open met de grijze gootdeksels: 16 bordjes, vooraan voeding, ingangen en de ESP'),
    ('trein-doos-dicht', 'doos-dicht.webp', 'Dicht, met het grijze deksel naar beneden zoals hij onder de baan hangt'),
    ('trein-goten', 'goten.webp', 'Zonder gootdeksels: de goten met vingers en sleuven, elke rij in een ring'),
    ('trein-doos-boven', 'doos-boven.webp', 'Van boven: 5 rijen van 3 bordjes en bordje 16 in rij 6, goten ertussen en langs de wanden'),
    ('trein-kabels', 'kabels.webp', 'Van dichtbij: een sleuf per twee klemmen, de klikvingers en een kabelinvoer in de zijgoot'),
    ('trein-gootdeksel', 'gootdeksel.webp', 'Twee gootdeksels opgetild: de nokken klikken in de groef van de klikvingers'),
    ('trein-plaat-gootdeksels', 'plaat.webp', 'De 9 gootdeksels op hun printplaat'),
    ('trein-doorsnede', 'zijkant.webp', 'Doorsnede: de goten van 28 hoog tussen de rijen, de bordjes in hun ring'),
    ('trein-prints', 'prints.webp', 'De gaatjesprints: voeding, ingangen (optocouplers) en uitgangen (MOSFET\'s)'),
    ('trein-esp', 'esp.webp', 'De ESP32-S3 op zijn draagprint met 2 vrouwelijke pinrijen'),
    ('trein-esp-boven', 'esp-boven.webp', 'ESP32-S3-DevKitC-1 van boven, de 2 USB-poorten rechts'),
    ('trein-bordje', 'bordje.webp', 'Een Modelbouwled-bordje: 61,1 x 20,9, 14 hoog'),
    ('trein-lippen-doorsnede', 'klemlippen.webp', 'Doorsnede door de klemlippen tussen twee bordjes: de haak grijpt 0,6 mm over de print'),
    ('trein-voeding-dcbus', 'dcbus.webp', 'De DC-bus 5,5 x 2,5 (in de linkerwand) boven de voedingsprint met zekering, P-MOSFET en klemmen'),
    ('trein-uitgangsprint', 'uitgangsprint.webp', 'De uitgangsprint: MOSFET\'s in voetjes, polyfuses, klemmen, de PCA9685 erboven'),
]
render_html = {}
for src, out, cap in RENDERS:
    w, h = cut_render(src, out)
    render_html[out] = (w, h, cap)

# the build plan: the step texts straight from the script that drew the PDF
STAPPEN = json.loads(subprocess.check_output(['node', '-e', r"""
const src = require('fs').readFileSync('e2e/tools/bouwschema-trein.mjs', 'utf8');
const a = src.indexOf('const STAPPEN = ['), b = src.indexOf('];', a) + 2;
const G = new Proxy({}, { get: (t, k) => String(k) }), of = (...n) => n, ALLES_OPEN = [], DIR = '';
const beeld = () => ({}), bestand = (f) => ({ bestand: f }), kopie = (f) => ({ kopie: f });
const S = eval(src.slice(a, b).replace('const STAPPEN = ', ''));
process.stdout.write(JSON.stringify(S.map((s) => ({ titel: s.titel, tijd: s.tijd, gereedschap: s.gereedschap, tekst: s.tekst, delen: s.delen, n: s.beelden.length }))));
"""], cwd=ROOT, encoding='utf-8'))
jpgs = sorted((E2E / 'bouwschema-trein').glob('stap-*.jpg'))
k = 0
for i, s in enumerate(STAPPEN):
    s['beelden'] = []
    for _ in range(s['n']):
        if i == len(STAPPEN) - 1:
            to_webp(BOX / 'firmware' / 'ui' / 'beelden' / 'tablet-groepen.png', 'stap-8.webp', 1200)
            s['beelden'].append('stap-8.webp')
            continue
        out = f'stap-{i + 1}-{len(s["beelden"]) + 1}.webp'
        to_webp(jpgs[k], out, 1200)
        k += 1
        s['beelden'].append(out)
assert k == len(jpgs), (k, len(jpgs))

PHONES = [('gsm-groepen', 'Groepen: aan en uit, helderheid, effect'), ('gsm-scenes', 'Scènes: alles in één keer'), ('gsm-functies', 'Functies: een reeks stappen'),
          ('gsm-ingangen', 'Ingangen: knop of sensor start een functie'), ('gsm-instellingen', 'Instellingen: namen en wachtwoord'), ('gsm-donker-groepen', 'Donker thema')]
for f, _ in PHONES:
    to_webp(BOX / 'firmware' / 'ui' / 'beelden' / f'{f}.png', f + '.webp', 520)
to_webp(BOX / 'firmware' / 'ui' / 'beelden' / 'tablet-groepen.png', 'tablet-groepen.webp', 1400)

# ---------- the print parts as a compact net for the 3D view ----------
def read_stl(p: Path):
    b = p.read_bytes()
    n = struct.unpack('<I', b[80:84])[0]
    rec = np.dtype([('n', '<f4', 3), ('v', '<f4', (3, 3)), ('a', '<u2')])
    tri = np.frombuffer(b, rec, n, 84)['v'].reshape(-1, 3)
    key = np.round(tri.astype(np.float64), 3)
    uniq, inv = np.unique(key, axis=0, return_inverse=True)
    return uniq, inv.reshape(-1), n


nets = {}
for name, f, kleur in (('bak', 'Kabeldoos-bak.stl', '#2b2f2e'), ('deksel', 'Kabeldoos-deksel.stl', '#9ea4a6'), ('gootdeksels', 'Gootdeksels-plaat.stl', '#8d939a'), ('hulpstukken', 'Hulpstukken.stl', '#8d939a')):
    v, idx, n = read_stl(BOX / 'print' / f)
    groot = len(v) >= 65536  # dan 32-bit indices (de bak met zijn vingers heeft er meer)
    mn, mx = v.min(axis=0), v.max(axis=0)
    q = np.round((v - mn) / (mx - mn) * 65535).astype('<u2')
    nets[name] = {'kleur': kleur, 'min': mn.round(4).tolist(), 'max': mx.round(4).tolist(), 'driehoeken': int(n), 'i32': groot,
                  'p': base64.b64encode(q.tobytes()).decode(), 'i': base64.b64encode(idx.astype('<u4' if groot else '<u2').tobytes()).decode()}
(OUT / 'net' / 'printdelen.json').write_text(json.dumps(nets, separators=(',', ':')), encoding='utf-8')
FILES['net'] = {'pad': 'net/printdelen.json', 'naam': 'printdelen.json', 'wat': '3D-net', 'bytes': (OUT / 'net' / 'printdelen.json').stat().st_size}

# ---------- the page ----------
ICON_DL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 19h16"/></svg>'


def btn(key, label, primary=False):
    f = FILES[key]
    return f'<button class="btn{" primary" if primary else ""}" type="button" data-file="{key}">{ICON_DL}<span>{esc(label)} <span class="sz">{size(f["bytes"])}</span></span></button>'


def titleblock(no, what, right):
    return f'<div class="titleblock"><div><small>Blad</small><span class="no">{esc(no)}</span></div><div><small>Kabeldoos treinverlichting</small><h2>{esc(what)}</h2></div><div><small>{esc(right[0])}</small><span class="mono">{esc(right[1])}</span></div></div>'


def shot(img, cap, title=None):
    w, h = render_html[img][:2] if img in render_html else (None, None)
    dims = f' width="{w}" height="{h}"' if w else ''
    return f'<button class="shot" type="button" data-zoom="img/{img}" data-title="{esc(title or cap)}"><span class="img"><img src="img/{img}" alt="{esc(cap)}" loading="lazy"{dims}></span><span class="cap">{esc(cap)}</span></button>'


first = README.split('\n## ')[0].split('\n', 1)[1].strip().split('\n\n')[0]
facts = [('230 x 230 x 44', 'mm, deksel inbegrepen'), ('16', 'lichtgroepen, één per bordje'), ('16', 'ingangen voor knoppen en sensoren'),
         ('12 V', 'adapter 6,67 A in een DC-bus, tegen ompolen beveiligd'), ('€ 148,67', 'onderdelen te kopen'), ('± 25 u', 'printen: bak 14 u, deksel 7 u, gootdeksels 3 u, hulpstukken 1 u')]

S = []
S.append(f'''<section class="sheet" id="overzicht">
<div class="hero">
  <div class="stage">{shot("doos-open.webp", render_html["doos-open.webp"][2]).replace('class="shot"', 'class="shot" style="display:block"').replace('<span class="cap">' + esc(render_html["doos-open.webp"][2]) + '</span>', '')}</div>
  <div class="copy">
    <h1>Kabeldoos treinverlichting</h1>
    <p class="lead">{md_inline(" ".join(first.split()))}</p>
    <div class="actions">{btn("alles-zip", "Alles in één zip", True)}{btn("alles-pdf", "Alles afdrukken (PDF)")}{btn("stl", "Printbestanden (STL)")}</div>
    <p class="note">Versie 3 van 12 november 2026: bordjes in klemlippen, DC-bus, een polyfuse per groep, opbouwtekeningen, meetblad, waakhond en bijwerken zonder kabel. Elke knop vraagt eerst of je het bestand wilt bewaren.</p>
  </div>
</div>
<div class="facts">{"".join(f"<div><b>{esc(a)}</b><span>{esc(b)}</span></div>" for a, b in facts)}</div>
<div class="gallery">{"".join(shot(o, render_html[o][2]) for _, o, _ in RENDERS[1:])}</div>
<h3>Opbouw</h3>
{md_table("Opbouw")}
</section>''')

S.append(f'''<section class="sheet" id="printen" hidden>
{titleblock("P", "Printen", ("Printer", "Centauri Carbon"))}
<div class="printgrid">
  <div class="viewer" id="viewer">
    <div class="seg" role="group" aria-label="Printdeel"><button type="button" data-part="bak" aria-pressed="true">Bak</button><button type="button" data-part="deksel" aria-pressed="false">Deksel</button><button type="button" data-part="gootdeksels" aria-pressed="false">Gootdeksels</button><button type="button" data-part="hulpstukken" aria-pressed="false">Hulpstukken</button></div>
    <div class="wait" id="viewer-wait">3D-beeld laden…</div>
    <span class="hint">Slepen draait, scrollen zoomt. Het oranje vierkant is het bed van 256 x 256.</span>
  </div>
  <div class="specs">
    <div id="part-spec"></div>
    <template id="spec-bak"><h3>Bak</h3><dl><dt>Bestand</dt><dd><code>Kabeldoos-bak.stl</code></dd><dt>Stand</dt><dd>de bodem op het bed</dd><dt>Maat</dt><dd class="num">229,8 x 229,8 x 42,0 mm</dd><dt>Filament</dt><dd>PETG zwart, ± 360 g</dd><dt>Tijd</dt><dd>± 14 uur</dd><dt>Driehoeken</dt><dd class="num">{dots(nets["bak"]["driehoeken"])}</dd></dl></template>
    <template id="spec-deksel"><h3>Deksel</h3><dl><dt>Bestand</dt><dd><code>Kabeldoos-deksel.stl</code></dd><dt>Stand</dt><dd>de buitenkant op het bed</dd><dt>Maat</dt><dd class="num">229,8 x 229,8 x 24,7 mm (met de drukribben)</dd><dt>Filament</dt><dd>PETG grijs, ± 190 g</dd><dt>Tijd</dt><dd>± 7 uur</dd><dt>Driehoeken</dt><dd class="num">{dots(nets["deksel"]["driehoeken"])}</dd></dl></template>
    <template id="spec-gootdeksels"><h3>Gootdeksels</h3><dl><dt>Bestand</dt><dd><code>Gootdeksels-plaat.stl</code></dd><dt>Stand</dt><dd>de vlakke kant op het bed, de benen omhoog</dd><dt>Maat</dt><dd class="num">211,0 x 132,4 x 8,9 mm (9 deksels)</dd><dt>Filament</dt><dd>PETG grijs, ± 70 g</dd><dt>Tijd</dt><dd>± 3 uur</dd><dt>Driehoeken</dt><dd class="num">{dots(nets["gootdeksels"]["driehoeken"])}</dd></dl></template>
    <template id="spec-hulpstukken"><h3>Hulpstukken</h3><dl><dt>Bestand</dt><dd><code>Hulpstukken.stl</code></dd><dt>Stand</dt><dd>plat op het bed</dd><dt>Wat</dt><dd>2 werkhaken, spatel met haakje</dd><dt>Filament</dt><dd>PETG grijs, ± 15 g</dd><dt>Tijd</dt><dd>± 1 uur</dd><dt>Driehoeken</dt><dd class="num">{dots(nets["hulpstukken"]["driehoeken"])}</dd></dl></template>
    <div class="actions">{btn("stl", "Printbestanden (STL in zip)", True)}</div>
    <div class="warn">PETG, zonder support. 0,2 mm lagen, 4 wanden, 30 % gyroid. Elk deel is hoogstens 230 x 230: in het midden van het bed blijft de hoek voor het filamentmes vrij, ook met een skirt.</div>
    <p class="note">Na het printen: een bordje klikt in zijn 4 klemlippen, een gootdeksel klikt over zijn goot, het deksel valt met zijn rand in de bak.</p>
  </div>
</div>
</section>''')

dr = []
for no, f, what, scale, txt in DRAWINGS:
    dr.append(f'''<div class="drawing"><button class="paper" type="button" data-zoom="svg/{f}" data-title="{no} {what}"><img src="svg/{f}" alt="Tekening {no}: {what}" loading="lazy"></button>
<div class="meta"><span class="tag">{no} · {'A4' if scale == 'A4' else 'A3 · schaal ' + scale}</span><h3>{what}</h3><p>{esc(txt)}</p>
{'<div class="warn">De boormal alleen afdrukken uit de PDF (A3, 100 %, niet passend maken). Meet de 100 mm na voor je boort.</div>' if no == 'TRN-00' else ''}
<div class="actions">{btn("svg-" + no, "SVG")}</div></div></div>''')
S.append(f'''<section class="sheet" id="tekeningen" hidden>
{titleblock("T", "Werktekeningen", ("Formaat", "A3 liggend, A4"))}
<div class="actions">{btn("werk-pdf", f"Werktekeningen (PDF, {len(DRAWINGS)} bladen)", True)}</div>
<div class="drawings">{"".join(dr)}</div>
</section>''')

steps = []
toc = []
for i, s in enumerate(STAPPEN):
    n = i + 1
    toc.append(f'<li><a href="#stap-{n}"><span class="n">{n}</span><span>{esc(s["titel"])}</span><em>{esc(s["tijd"])}</em></a></li>')
    imgs = ''.join(shot(b, f'Stap {n}: {s["titel"]}') .replace('<span class="cap">' + esc(f'Stap {n}: {s["titel"]}') + '</span>', '') for b in s['beelden'])
    parts = ''.join(f'<span class="tag">{esc(d)}</span>' for d in s['delen'])
    steps.append(f'''<article class="step" id="stap-{n}"><div class="imgs">{imgs}</div>
<div class="txt"><div class="nr">{n}</div><h3>{esc(s["titel"])}</h3>
<div class="kv"><span><b>Tijd</b> {esc(s["tijd"])}</span><span><b>Gereedschap</b> {esc(s["gereedschap"])}</span></div>
<ol>{"".join(f"<li>{esc(t)}</li>" for t in s["tekst"])}</ol>
{f'<div class="parts">{parts}</div>' if parts else ''}</div></article>''')
S.append(f'''<section class="sheet" id="bouwen" hidden>
{titleblock("B", "Bouwschema", ("Stappen", str(len(STAPPEN))))}
<div class="actions">{btn("bouw-pdf", "Bouwschema (PDF)", True)}</div>
<ol class="toc">{"".join(toc)}</ol>
{"".join(steps)}
</section>''')

sch = []
for n in range(1, SCHEMA_N + 1):
    sch.append(f'<button class="shot" type="button" data-zoom="svg/schema-blad-{n}.svg" data-title="Aansluitschema blad {n}: {esc(SCHEMA_TITELS[n])}"><span class="img" style="background:#fff"><img src="svg/schema-blad-{n}.svg" alt="Aansluitschema blad {n}" loading="lazy"></span><span class="cap">Blad {n} · {esc(SCHEMA_TITELS[n])}</span></button>')
S.append(f'''<section class="sheet" id="schema" hidden>
{titleblock("E", "Aansluiten", ("Schema", f"{SCHEMA_N} bladen A3"))}
<p class="lead">Opgemaakt zoals EPLAN Electric P8, volgens IEC/EN 61082-1, 60617 en 81346 (aanduidingen), IEC 61355 (documentsoort per blad) en ISO 7200 (titelblok). Kruisverwijzing /blad.kolom.</p>
<div class="actions">{btn("schema-pdf", f"Aansluitschema (PDF, {SCHEMA_N} bladen)", True)}{btn("schema-zip", "SVG's in een zip")}</div>
<div class="gallery">{"".join(sch)}</div>
<h3>Wat waar komt</h3>
{md_table("Aansluiten")}
{md_paragraphs("Aansluiten")}
<h3>Draden labelen</h3>
{md_paragraphs("Draden labelen")}
{md_table("Draden labelen")}
</section>''')

S.append(f'''<section class="sheet" id="bestellen" hidden>
{titleblock("O", "Bestellijst", ("Totaal", "€ 132,32"))}
{md_table("Bestellijst", total_last=True)}
{md_paragraphs("Bestellijst")}
</section>''')

S.append(f'''<section class="sheet" id="dashboard" hidden>
{titleblock("D", "Dashboard op de gsm", ("Wifi", "Treinbaan"))}
{md_paragraphs("Bediening")}
<div class="phones">{"".join(f'<button class="shot" type="button" data-zoom="img/{f}.webp" data-title="{esc(c)}"><span class="img"><img src="img/{f}.webp" alt="{esc(c)}" loading="lazy" width="520" height="1125"></span><span class="cap">{esc(c)}</span></button>' for f, c in PHONES)}</div>
<button class="shot" type="button" data-zoom="img/tablet-groepen.webp" data-title="Het dashboard op een tablet"><span class="img" style="aspect-ratio:auto"><img src="img/tablet-groepen.webp" alt="Het dashboard op een tablet" loading="lazy"></span><span class="cap">Op een tablet</span></button>
</section>''')

order = ['alles-zip', 'alles-pdf', 'stl', 'werk-pdf', 'bouw-pdf', 'schema-pdf', 'schema-zip'] + ['svg-' + d[0] for d in DRAWINGS]
S.append(f'''<section class="sheet" id="bestanden" hidden>
{titleblock("A", "Alle bestanden", ("Bestanden", str(len(order))))}
<p class="lead">Elke knop vraagt eerst of je het bestand wilt bewaren. De STL's zitten in een zip: pak die uit en open ze in de slicer.</p>
<div class="files">{"".join(f'<div class="file"><div><b>{esc(FILES[k]["naam"])}</b><p>{esc(FILES[k]["wat"])}</p></div>{btn(k, "Bewaren")}</div>' for k in order)}</div>
</section>''')

page = (HERE / 'sjabloon.html').read_text(encoding='utf-8')
page = page.replace('{{SECTIES}}', '\n'.join(S)).replace('{{BESTANDEN}}', json.dumps(FILES, ensure_ascii=False).replace('</', '<\\/'))
(OUT / 'index.html').write_text(page, encoding='utf-8')

total = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
print('app:', OUT, '|', len(list(OUT.rglob('*.*'))), 'bestanden,', size(total))
for k, f in FILES.items():
    print(f'  {k:12} {size(f["bytes"]):>8}  {f["pad"]}')
