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


PRINT_TXT = """Kabeldoos treinverlichting - printbestanden

Kabeldoos-bak.stl     de bodem op het bed     248,9 x 240,6 x 26,4 mm   PETG zwart, ongeveer 350 g, 14 uur
Kabeldoos-deksel.stl  de buitenkant op het bed 248,9 x 240,6 x 9,1 mm   PETG grijs, ongeveer 120 g, 4 uur

Elegoo Centauri Carbon (bed 256 x 256), PETG, zonder support.
0,2 mm lagen, 4 wanden, 30 % gyroid (zoals bij de afzuiging).
Na het printen: de bordjes vallen zonder kracht in hun uitsparing (0,3 mm speling), het deksel valt met zijn rand in de bak.
"""
stl = [('Kabeldoos-bak.stl', BOX / 'print' / 'Kabeldoos-bak.stl'), ('Kabeldoos-deksel.stl', BOX / 'print' / 'Kabeldoos-deksel.stl')]
add_file('stl', None, 'dl/Kabeldoos-printbestanden.zip', 'Kabeldoos-printbestanden.zip',
         'De twee STL\'s (bak en deksel), dicht en manifold, met de printinstellingen', zip_bytes(stl + [('LEESMIJ-printen.txt', PRINT_TXT.encode('utf-8'))]))
add_file('alles-pdf', BOX / 'Kabeldoos-alles-afdrukken.pdf', 'pdf/Kabeldoos-alles-afdrukken.pdf', 'Kabeldoos-alles-afdrukken.pdf',
         'Alles samen om af te drukken: uitleg, bouwschema, tekeningen, schema, dashboard en rekenblad')
add_file('werk-pdf', BOX / 'tekeningen' / 'Werktekeningen-kabeldoos.pdf', 'pdf/Werktekeningen-kabeldoos.pdf', 'Werktekeningen-kabeldoos.pdf',
         'Boormal op ware grootte (TRN-00, A3), bak (TRN-01) en deksel (TRN-02)')
add_file('bouw-pdf', BOX / 'tekeningen' / 'Bouwschema-kabeldoos.pdf', 'pdf/Bouwschema-kabeldoos.pdf', 'Bouwschema-kabeldoos.pdf',
         'De 8 bouwstappen met beelden, van printen tot aanzetten')

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
    ('TRN-00', 'TRN-00-boormal.svg', 'Boormal', '1:1', 'Plak hem onder de baan en boor de 4 kruisjes voor. Druk hem af op A3 op ware grootte (100 %) en meet de controlemaat van 100 mm na.'),
    ('TRN-01', 'TRN-01-bak.svg', 'Bak', '1:2,5', 'De bak met alle maten: wanden, kaders per rij, kabelgoten, sleutelgaten, schroefpaaltjes en kabelinvoeren.'),
    ('TRN-02', 'TRN-02-deksel.svg', 'Deksel', '1:2,5', 'Het deksel met de drukribben op de bordjes en de 6 verzonken schroefgaten.'),
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
    ('trein-doos-open', 'doos-open.webp', 'De bak open: 16 bordjes in hun kaders, vooraan voeding, ingangen, uitgangen en de ESP'),
    ('trein-doos-dicht', 'doos-dicht.webp', 'Dicht, met het grijze deksel naar beneden zoals hij onder de baan hangt'),
    ('trein-doos-boven', 'doos-boven.webp', 'Van boven: 5 rijen van 3 bordjes en bordje 16 in rij 6'),
    ('trein-kabels', 'kabels.webp', 'Kabelgoten langs de wanden, lippen over de draadgangen en spleten voor de kabelbinders'),
    ('trein-doorsnede', 'zijkant.webp', 'De kabelinvoeren in de wand, open aan de kant van het deksel'),
    ('trein-prints', 'prints.webp', 'De gaatjesprints: voeding, ingangen (optocouplers) en uitgangen (MOSFET\'s)'),
    ('trein-esp', 'esp.webp', 'De ESP32-S3 op zijn draagprint met 2 vrouwelijke pinrijen'),
    ('trein-esp-boven', 'esp-boven.webp', 'ESP32-S3-DevKitC-1 van boven, de 2 USB-poorten rechts'),
    ('trein-bordje', 'bordje.webp', 'Een Modelbouwled-bordje: 61,1 x 20,9, 14 hoog'),
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
const beeld = () => ({}), bestand = (f) => ({ bestand: f });
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
for name, f, kleur in (('bak', 'Kabeldoos-bak.stl', '#2b2f2e'), ('deksel', 'Kabeldoos-deksel.stl', '#9ea4a6')):
    v, idx, n = read_stl(BOX / 'print' / f)
    assert len(v) < 65536, (f, len(v))
    mn, mx = v.min(axis=0), v.max(axis=0)
    q = np.round((v - mn) / (mx - mn) * 65535).astype('<u2')
    nets[name] = {'kleur': kleur, 'min': mn.round(4).tolist(), 'max': mx.round(4).tolist(), 'driehoeken': int(n),
                  'p': base64.b64encode(q.tobytes()).decode(), 'i': base64.b64encode(idx.astype('<u2').tobytes()).decode()}
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
facts = [('249 x 241 x 29', 'mm, deksel inbegrepen'), ('16', 'lichtgroepen, één per bordje'), ('16', 'ingangen voor knoppen en sensoren'),
         ('12 V', 'adapter 6,67 A, hoogstens 1,9 W in de doos'), ('€ 125,28', 'onderdelen te kopen'), ('± 18 u', 'printen: bak 14 u, deksel 4 u')]

S = []
S.append(f'''<section class="sheet" id="overzicht">
<div class="hero">
  <div class="stage">{shot("doos-open.webp", render_html["doos-open.webp"][2]).replace('class="shot"', 'class="shot" style="display:block"').replace('<span class="cap">' + esc(render_html["doos-open.webp"][2]) + '</span>', '')}</div>
  <div class="copy">
    <h1>Kabeldoos treinverlichting</h1>
    <p class="lead">{md_inline(" ".join(first.split()))}</p>
    <div class="actions">{btn("alles-zip", "Alles in één zip", True)}{btn("alles-pdf", "Alles afdrukken (PDF)")}{btn("stl", "Printbestanden (STL)")}</div>
    <p class="note">Versie 1 van 8 november 2026. Elke knop vraagt eerst of je het bestand wilt bewaren.</p>
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
    <div class="seg" role="group" aria-label="Printdeel"><button type="button" data-part="bak" aria-pressed="true">Bak</button><button type="button" data-part="deksel" aria-pressed="false">Deksel</button></div>
    <div class="wait" id="viewer-wait">3D-beeld laden…</div>
    <span class="hint">Slepen draait, scrollen zoomt. Het oranje vierkant is het bed van 256 x 256.</span>
  </div>
  <div class="specs">
    <div id="part-spec"></div>
    <template id="spec-bak"><h3>Bak</h3><dl><dt>Bestand</dt><dd><code>Kabeldoos-bak.stl</code></dd><dt>Stand</dt><dd>de bodem op het bed</dd><dt>Maat</dt><dd class="num">248,9 x 240,6 x 26,4 mm</dd><dt>Filament</dt><dd>PETG zwart, ± 350 g</dd><dt>Tijd</dt><dd>± 14 uur</dd><dt>Driehoeken</dt><dd class="num">{dots(nets["bak"]["driehoeken"])}</dd></dl></template>
    <template id="spec-deksel"><h3>Deksel</h3><dl><dt>Bestand</dt><dd><code>Kabeldoos-deksel.stl</code></dd><dt>Stand</dt><dd>de buitenkant op het bed</dd><dt>Maat</dt><dd class="num">248,9 x 240,6 x 9,1 mm (met de drukribben)</dd><dt>Filament</dt><dd>PETG grijs, ± 120 g</dd><dt>Tijd</dt><dd>± 4 uur</dd><dt>Driehoeken</dt><dd class="num">{dots(nets["deksel"]["driehoeken"])}</dd></dl></template>
    <div class="actions">{btn("stl", "Printbestanden (STL in zip)", True)}</div>
    <div class="warn">PETG, zonder support. 0,2 mm lagen, 4 wanden, 30 % gyroid. Beide delen passen net op het bed van 256 x 256.</div>
    <p class="note">Na het printen: de bordjes vallen zonder kracht in hun uitsparing (0,3 mm speling), het deksel valt met zijn rand in de bak.</p>
  </div>
</div>
</section>''')

dr = []
for no, f, what, scale, txt in DRAWINGS:
    dr.append(f'''<div class="drawing"><button class="paper" type="button" data-zoom="svg/{f}" data-title="{no} {what}"><img src="svg/{f}" alt="Tekening {no}: {what}" loading="lazy"></button>
<div class="meta"><span class="tag">{no} · A3 · schaal {scale}</span><h3>{what}</h3><p>{esc(txt)}</p>
{'<div class="warn">De boormal alleen afdrukken uit de PDF (A3, 100 %, niet passend maken). Meet de 100 mm na voor je boort.</div>' if no == 'TRN-00' else ''}
<div class="actions">{btn("svg-" + no, "SVG")}</div></div></div>''')
S.append(f'''<section class="sheet" id="tekeningen" hidden>
{titleblock("T", "Werktekeningen", ("Formaat", "A3 liggend"))}
<div class="actions">{btn("werk-pdf", "Werktekeningen (PDF, 3 bladen)", True)}</div>
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
{titleblock("O", "Bestellijst", ("Totaal", "€ 125,28"))}
{md_table("Bestellijst", total_last=True)}
{md_paragraphs("Bestellijst")}
</section>''')

S.append(f'''<section class="sheet" id="dashboard" hidden>
{titleblock("D", "Dashboard op de gsm", ("Wifi", "Treinbaan"))}
{md_paragraphs("Bediening")}
<div class="phones">{"".join(f'<button class="shot" type="button" data-zoom="img/{f}.webp" data-title="{esc(c)}"><span class="img"><img src="img/{f}.webp" alt="{esc(c)}" loading="lazy" width="520" height="1125"></span><span class="cap">{esc(c)}</span></button>' for f, c in PHONES)}</div>
<button class="shot" type="button" data-zoom="img/tablet-groepen.webp" data-title="Het dashboard op een tablet"><span class="img" style="aspect-ratio:auto"><img src="img/tablet-groepen.webp" alt="Het dashboard op een tablet" loading="lazy"></span><span class="cap">Op een tablet</span></button>
</section>''')

order = ['alles-zip', 'alles-pdf', 'stl', 'werk-pdf', 'bouw-pdf', 'schema-pdf', 'schema-zip', 'svg-TRN-00', 'svg-TRN-01', 'svg-TRN-02']
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
