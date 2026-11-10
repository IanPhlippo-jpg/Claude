// DXF (R12, mm) van een taatsdeur: de lasergesneden delen (bogen, taatsplaten, greephouders) en de ruiten (voor de
// glasleverancier), elk op ware grootte naast elkaar gelegd met hun naam erbij. Werkt in Node en in de browser.
import { lijsten, kaderVan } from './deuren.mjs';

const n4 = (x) => (Math.round(x * 1e4) / 1e4).toString();
function schrijver() {
  const e = [];
  const ent = (type, laag, kv) => e.push('0', type, '8', laag, ...kv.flatMap(([k, v]) => [String(k), typeof v === 'number' ? n4(v) : v]));
  return {
    lijn: (a, b, laag = 'SNIJDEN') => ent('LINE', laag, [[10, a[0]], [20, a[1]], [11, b[0]], [21, b[1]]]),
    boog: (c, r, g0, g1, laag = 'SNIJDEN') => ent('ARC', laag, [[10, c[0]], [20, c[1]], [40, r], [50, g0], [51, g1]]),
    cirkel: (c, r, laag = 'GATEN') => ent('CIRCLE', laag, [[10, c[0]], [20, c[1]], [40, r]]),
    tekst: (p, h, t, laag = 'TEKST') => ent('TEXT', laag, [[10, p[0]], [20, p[1]], [40, h], [1, String(t).replace(/[^\x20-\x7e]/g, '')]]),
    veelhoek: (pts, laag = 'SNIJDEN') => pts.forEach((a, i) => ent('LINE', laag, [[10, a[0]], [20, a[1]], [11, pts[(i + 1) % pts.length][0]], [21, pts[(i + 1) % pts.length][1]]])),
    tekst2: () => ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', ...e, '0', 'ENDSEC', '0', 'EOF'].join('\r\n') + '\r\n',
  };
}

/** laserdelen: elke boog als ring-sector (straal r op de hartlijn, breedte 'zicht'), platen als rechthoek met gaten */
export function laserDxf(o) {
  const L = lijsten(o), w = schrijver();
  let x = 0;
  for (const r of L.laser) {
    if (r.vorm === 'boog') {
      // de sector met de opening naar onder, middelpunt op (x + R, 0)
      const R1 = r.r + r.zicht / 2, R0 = r.r - r.zicht / 2, g0 = 90 - r.hoek / 2, g1 = 90 + r.hoek / 2, c = [x + R1, 0];
      const P = (rr, g) => [c[0] + rr * Math.cos((g * Math.PI) / 180), c[1] + rr * Math.sin((g * Math.PI) / 180)];
      w.boog(c, R1, g0, g1); w.boog(c, R0, g0, g1); w.lijn(P(R0, g0), P(R1, g0)); w.lijn(P(R0, g1), P(R1, g1));
      w.tekst([x, -40], 12, `${r.wat}: ${r.n} st, plaat ${r.t} mm, R${r.r} hartlijn`);
      x += 2 * R1 + 60;
    } else {
      w.veelhoek([[x, 0], [x + r.l, 0], [x + r.l, r.b], [x, r.b]]);
      if (/paneel/.test(r.wat)) { /* geen gaten */ } else if (/onder/.test(r.wat)) for (const dx of [40, r.l - 40]) w.cirkel([x + dx, r.b / 2], 4.25);
      else if (/boven/.test(r.wat)) w.cirkel([x + 40, r.b / 2], 10);
      else w.cirkel([x + r.l / 2, r.b / 2], 4.25);
      w.tekst([x, -20], 8, `${r.wat}: ${r.n} st, plaat ${r.t} mm`);
      x += r.l + 60;
    }
  }
  return w.tekst2();
}

/** ruiten met een vorm (geen rechthoek) als omtrek op het daglicht + inloop; rechthoeken als maat in de tekst */
export function glasDxf(o) {
  const w = schrijver();
  let x = 0;
  for (const [deel, groep] of [['vleugel', o.vleugels], ['zijlicht', o.vast]]) for (const [i, v] of groep.entries()) for (const [j, p] of v.ruiten.entries()) {
    const [x0, y0, x1, y1] = kaderVan(p);
    w.veelhoek(p.map(([a, b]) => [a - x0 + x, b - y0]), 'DAGLICHT');
    w.tekst([x, -30], 14, `${deel} ${i + 1}, ruit ${j + 1}: daglicht; glasmaat = daglicht + 4 mm rondom (inloop 6, speling 2)`);
    x += x1 - x0 + 120;
  }
  return w.tekst2();
}
