"""LB-logo voor het scherm van de knop: python voorbeelden/afzuiging/logo/knoplogo.py

Leest lb-monogram.png (zwart op wit), snijdt het monogram bij, verkleint het anti-aliased tot HOOGTE pixels en schrijft:
- firmware/src/knop/logo.h: de dekking per pixel (0..255) als PROGMEM-tabel; de firmware mengt die met de kleur
  van het logo op de zwarte achtergrond;
- firmware/ui/logo-knop.png: hetzelfde in beige op transparant, voor de voorbeeldpagina.
"""
from pathlib import Path

import numpy as np
from PIL import Image

HIER = Path(__file__).parent
HOOGTE = 56          # pixels op het scherm van 466 x 466 (ca. 29 eenheden van het ontwerp op 240)
BEIGE = (0xDC, 0xCB, 0xB3)

bron = Image.open(HIER / 'lb-monogram.png').convert('RGBA')
a = np.asarray(bron).astype(np.float32)
# dekking: hoe donker de pixel is, maal de alfa van de png
dekking = (1 - a[..., :3].mean(axis=2) / 255) * (a[..., 3] / 255)
ys, xs = np.where(dekking > 0.02)
dek = dekking[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
h0, w0 = dek.shape
breedte = round(w0 * HOOGTE / h0)
klein = Image.fromarray((dek * 255).astype(np.uint8), 'L').resize((breedte, HOOGTE), Image.LANCZOS)
d = np.asarray(klein)

regels = [f'  {", ".join(str(v) for v in d[r])},' for r in range(HOOGTE)]
(HIER.parent / 'firmware/src/knop/logo.h').write_text(
    '// LB-logo voor het scherm van de knop: dekking per pixel (0 = achtergrond, 255 = logo).\n'
    '// Gemaakt met voorbeelden/afzuiging/logo/knoplogo.py uit logo/lb-monogram.png; niet met de hand aanpassen.\n'
    '#pragma once\n#include <Arduino.h>\n\n'
    f'constexpr int LOGO_B = {breedte}, LOGO_H = {HOOGTE};\n'
    f'const uint8_t LOGO_DEKKING[LOGO_B * LOGO_H] PROGMEM = {{\n' + '\n'.join(regels) + '\n};\n',
    encoding='utf-8', newline='\n')

rgba = np.zeros((HOOGTE, breedte, 4), np.uint8)
rgba[..., :3] = BEIGE
rgba[..., 3] = d
(HIER.parent / 'firmware/ui').mkdir(exist_ok=True)
Image.fromarray(rgba, 'RGBA').save(HIER.parent / 'firmware/ui/logo-knop.png')
print(f'logo {breedte} x {HOOGTE} px')
