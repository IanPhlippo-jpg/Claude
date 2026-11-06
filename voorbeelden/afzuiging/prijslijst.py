"""Prijslijst (tekeningen/prijslijst.csv) uit de tabellen 'Kopen' en 'Laten lasersnijden' in README.md en het filament:
python voorbeelden/afzuiging/prijslijst.py. Prijzen incl. 21 % btw, zonder verzending (indicatie november 2026)."""
import re
from pathlib import Path

HIER = Path(__file__).parent
t = (HIER / 'README.md').read_text(encoding='utf-8')
getal = lambda s: float(s.replace('€', '').strip().replace('.', '').replace(',', '.'))
fmt = lambda v: f'{v:.2f}'.replace('.', ',')


def tabel(kop):
    i = t.index(kop)
    blok = t[i:t.index('\n\n', t.index('|---', i))]
    rijen = []
    for regel in blok.split('\n')[2:]:
        cel = [c.strip() for c in regel.strip().strip('|').split('|')]
        if cel[0].startswith('**') or len(cel) < 5 or '€' not in cel[-1]:
            continue
        rijen.append(cel)
    return rijen


regels = [['Groep', 'Onderdeel', 'Aantal', 'Type / materiaal', 'Prijs per stuk (EUR, incl. btw)', 'Totaal (EUR, incl. btw)']]
totaal = 0.0
for groep, kop in [('Kopen', '### Kopen'), ('Lasersnijden', '### Laten lasersnijden')]:
    for c in tabel(kop):
        regels.append([groep, c[0].strip('`'), c[1], c[2], fmt(getal(c[3])), fmt(getal(c[4]))])
        totaal += getal(c[4])
for naam, n, w in [('PETG wit, rol 1 kg', 2, 'romp, frame, cassette, platen, box, klauwen, klemmen: ca. 1,1 kg'), ('PETG zwart, rol 1 kg', 1, 'knophouder, deksel, knopklauwen: ca. 55 g')]:
    regels.append(['Printen', naam, str(n), w, fmt(20), fmt(20 * n)])
    totaal += 20 * n
regels.append(['Eindtotaal', '', '', '', '', fmt(totaal)])
q = lambda v: f'"{v.replace(chr(34), chr(34) * 2)}"' if (';' in v or '"' in v) else v
(HIER / 'tekeningen/prijslijst.csv').write_text('﻿' + '\r\n'.join(';'.join(q(c) for c in r) for r in regels) + '\r\n', encoding='utf-8')
print('eindtotaal', fmt(totaal))
