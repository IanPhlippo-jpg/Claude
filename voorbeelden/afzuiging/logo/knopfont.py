"""Lettertypes voor het scherm van de knop: python voorbeelden/afzuiging/logo/knopfont.py

Rendert Inter (fonts/inter-latin-wght-normal.woff2, SIL OFL 1.1) anti-aliased en schrijft firmware/src/knop/fonts.h:
per letter de dekking per pixel (0..255), de maat, de verschuiving t.o.v. de basislijn en de voortgang. De firmware
mengt de dekking met de tekstkleur op de zwarte achtergrond, zoals bij het logo. Maten in pixels van het scherm (466).
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HIER = Path(__file__).parent
FONT = HIER / 'fonts/inter-latin-wght-normal.woff2'
ASCII = ''.join(chr(c) for c in range(32, 127))
# naam, gewicht, grootte (px), tekens
SETS = [
    ('GROOT', 700, 104, '0123456789UIT'),        # de zuigkracht en UIT: vet
    ('PROCENT', 700, 50, '%'),                   # het procentteken, kleiner en bovenaan uitgelijnd
    ('TITEL', 600, 30, ASCII),                   # IJKEN
    ('TEKST', 500, 22, ASCII),                   # meldingen en het drukverschil
]


def maak(naam, gewicht, grootte, tekens):
    f = ImageFont.truetype(str(FONT), grootte)
    f.set_variation_by_axes([gewicht])
    cap = -f.getbbox('H', anchor='ls')[1]
    eerste, laatste = ord(min(tekens)), ord(max(tekens))
    data, glyphs = [], []
    for c in range(eerste, laatste + 1):
        ch = chr(c)
        if ch not in tekens:
            glyphs.append((len(data), 0, 0, 0, 0, 0))
            continue
        adv = round(f.getlength(ch))
        x0, y0, x1, y1 = f.getbbox(ch, anchor='ls')
        w, h = max(0, x1 - x0), max(0, y1 - y0)
        if w and h:
            im = Image.new('L', (w, h), 0)
            ImageDraw.Draw(im).text((-x0, -y0), ch, font=f, fill=255, anchor='ls')
            px = np.asarray(im).flatten().tolist()
        else:
            px = []
        glyphs.append((len(data), w, h, x0, y0, adv))
        data += px
    regels = [f'// {naam}: Inter {gewicht}, {grootte} px, hoofdletterhoogte {cap} px',
              f'const uint8_t {naam}_PIX[] PROGMEM = {{']
    for i in range(0, len(data), 40):
        regels.append('  ' + ', '.join(str(v) for v in data[i:i + 40]) + ',')
    regels.append('};')
    regels.append(f'const Letter {naam}_LETTERS[] PROGMEM = {{')
    for (o, w, h, dx, dy, adv) in glyphs:
        regels.append(f'  {{{o}, {w}, {h}, {dx}, {dy}, {adv}}},')
    regels.append('};')
    regels.append(f'const Lettertype {naam}{{{naam}_PIX, {naam}_LETTERS, {eerste}, {laatste}, {cap}}};\n')
    return '\n'.join(regels), len(data)


uit = ['// Lettertypes voor het scherm van de knop: Inter (SIL OFL 1.1, zie logo/fonts/Inter-OFL.txt), anti-aliased.',
       '// Gemaakt met voorbeelden/afzuiging/logo/knopfont.py; niet met de hand aanpassen.',
       '#pragma once', '#include <Arduino.h>', '',
       '// een letter: begin in de pixeltabel, breedte, hoogte, verschuiving t.o.v. het beginpunt op de basislijn, voortgang',
       'struct Letter { uint32_t begin; uint8_t b, h; int8_t dx, dy; uint8_t voort; };',
       'struct Lettertype { const uint8_t *pix; const Letter *letters; uint8_t eerste, laatste; uint8_t cap; };', '']
totaal = 0
for s in SETS:
    tekst, n = maak(*s)
    uit.append(tekst)
    totaal += n
(HIER.parent / 'firmware/src/knop/fonts.h').write_text('\n'.join(uit), encoding='utf-8', newline='\n')
print(f'fonts.h: {totaal / 1024:.0f} kB pixels')
