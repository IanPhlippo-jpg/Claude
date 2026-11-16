// DXF (R12, mm) van de platen en de laserdelen: de buitencontour op laag CONTOUR, de gaten als cirkels op laag GATEN,
// het positienummer als tekst op laag TEKST. Eén bestand per positie, rechtstreeks in te lezen door een lasersnijder.
// Node en browser.
import { stuklijst } from './stuklijst.mjs';

const n = (v) => (Math.round(v * 1000) / 1000).toString();
const lijn = (x1, y1, x2, y2) => `0\nLINE\n8\nCONTOUR\n10\n${n(x1)}\n20\n${n(y1)}\n30\n0\n11\n${n(x2)}\n21\n${n(y2)}\n31\n0\n`;
const cirkel = (x, y, r, laag = 'GATEN') => `0\nCIRCLE\n8\n${laag}\n10\n${n(x)}\n20\n${n(y)}\n30\n0\n40\n${n(r)}\n`;
const tekst = (x, y, h, t) => `0\nTEXT\n8\nTEKST\n10\n${n(x)}\n20\n${n(y)}\n30\n0\n40\n${n(h)}\n1\n${String(t).replace(/\n/g, ' ')}\n`;
/** gesloten polylijn met bogen (bulge = tan(θ/4)) */
const polylijn = (pts, laag = 'CONTOUR') => `0
POLYLINE
8
${laag}
66
1
70
1
10
0
20
0
30
0
${pts.map((p) => `0
VERTEX
8
${laag}
10
${n(p.x)}
20
${n(p.y)}
30
0
${p.bulge ? `42
${n(p.bulge)}
` : ''}`).join('')}0
SEQEND
8
${laag}
`;
const omhul = (ent) => `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${ent}0\nENDSEC\n0\nEOF\n`;

// R12-kop zonder $INSUNITS (hoort bij R2000, P2-20); eenheden mm. Zetlijnen (gezette platen, P1-11) op laag ZETLIJN.
const zetlijn = (x1, y1, x2, y2) => `0\nLINE\n8\nZETLIJN\n6\nDASHED\n10\n${n(x1)}\n20\n${n(y1)}\n30\n0\n11\n${n(x2)}\n21\n${n(y2)}\n31\n0\n`;
/** DXF van één plaat (deel uit het model): l langs x, b langs y, gaten op (x, y) */
export function plaatDxf(d, pos = '') {
  const l = d.l, b = d.bmaat;
  let e = '';
  if (d.contour) { const c = d.contour, sh = (p) => ({ x: p.x - c.minx, y: p.y - c.miny, bulge: p.bulge }); e += polylijn(c.segmenten.map(sh)); for (const u of c.uitsparingen) e += polylijn(u.segmenten.map(sh), 'UITSPARING'); }
  else if (d.rond) e += cirkel(l / 2, l / 2, l / 2, 'CONTOUR');
  else if (d.vorm === 'driehoek') e += lijn(0, 0, l, 0) + lijn(l, 0, 0, b) + lijn(0, b, 0, 0);
  else e += lijn(0, 0, l, 0) + lijn(l, 0, l, b) + lijn(l, b, 0, b) + lijn(0, b, 0, 0);
  for (const g of d.gaten) e += cirkel(g.x, g.y, g.d / 2);
  for (const [i, z] of (d.zetlijnen ?? []).entries()) { e += zetlijn(z.a[0], z.a[1], z.b[0], z.b[1]); e += tekst((z.a[0] + z.b[0]) / 2 + 4, (z.a[1] + z.b[1]) / 2 + 4, 4, `Z${i + 1} ${z.richting ?? 'op'} ${Math.round(z.hoek)} gr Ri${Math.round(z.R)}`); }
  for (const u of d.dxfUitsparingen ?? []) e += lijn(u[0], u[1], u[2], u[1]) + lijn(u[2], u[1], u[2], u[3]) + lijn(u[2], u[3], u[0], u[3]) + lijn(u[0], u[3], u[0], u[1]);
  e += tekst(4, -8, 5, `${pos ? `pos ${pos} ` : ''}${d.naam} t=${d.t} mm${d.zetlijnen?.length ? ` uitslag K=${d.K ?? 0.4}, ${d.zetlijnen.length} zettingen (laag ZETLIJN)` : ''}`);
  return omhul(e);
}
/** DXF van een strip (platstaal als staaf): lengte L langs x, breedte h langs y, gaten op het hart */
export function stripDxf(d, L, pos = '') {
  const h = d.P.h;
  let e = lijn(0, 0, L, 0) + lijn(L, 0, L, h) + lijn(L, h, 0, h) + lijn(0, h, 0, 0);
  for (const g of d.gaten) e += cirkel(g.s, h / 2, g.d / 2);
  e += tekst(4, -8, 5, `${pos ? `pos ${pos} ` : ''}${d.naam} t=${d.P.b}`);
  return omhul(e);
}
/**
 * buislaser (P2-19 v6): de 4 wanden van een koker naast elkaar uitgeslagen (lengte L langs x, elke wand zo breed als het
 * vlak), met de gaten op hun wand. Een buislaser leest liefst STEP; deze wand-DXF laat de CAM van de buislaser (of een
 * gewone plaatlaser met een mal) de gaten plaatsen. Volgorde: wand +w, +v, -w, -v (zie de tekst per wand).
 */
export function kokerDxf(d, L, pos = '') {
  const P = d.P, wanden = [['+w', P.b], ['+v', P.h], ['-w', P.b], ['-v', P.h]];
  let e = '', y0 = 0;
  for (const [nm, bw] of wanden) {
    e += lijn(0, y0, L, y0) + lijn(L, y0, L, y0 + bw) + lijn(L, y0 + bw, 0, y0 + bw) + lijn(0, y0 + bw, 0, y0);
    e += tekst(-60, y0 + bw / 2, 4, `wand ${nm}`);
    for (const g of d.gaten) if (g.as === nm.slice(1) && (g.door ?? 2) >= (nm.startsWith('+') ? 1 : 2)) e += cirkel(g.s, y0 + bw / 2 + (g.off ?? 0), g.d / 2);
    y0 += bw + 15;
  }
  e += tekst(4, -8, 5, `${pos ? `pos ${pos} ` : ''}${d.naam} ${P.naam} L=${Math.round(L)} mm: 4 wanden uitgeslagen (buislaser)`);
  return omhul(e);
}
/** alle DXF-bestanden van een toestel: [{ naam, pos, dxf }] (platen en strips; geen kokers of buizen) */
export function dxfBestanden(o) {
  const sl = stuklijst(o), uit = [], vn = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const p of sl.posities) {
    const d = p.voorbeeld;
    if (d.soort === 'plaat' && d.laser !== false) uit.push({ naam: `${o.id}-${o.versie}-pos${p.pos}-${vn(p.naam)}.dxf`, pos: p.pos, n: p.n, dxf: plaatDxf(d, p.pos) });
    else if (d.soort === 'staaf' && d.P?.vorm === 'strip') uit.push({ naam: `${o.id}-${o.versie}-pos${p.pos}-${vn(p.naam)}.dxf`, pos: p.pos, n: p.n, dxf: stripDxf(d, p.L ?? d.L, p.pos) });
    else if (d.soort === 'staaf' && d.P?.vorm === 'koker' && !d.pad && d.gaten.length >= 4) uit.push({ naam: `${o.id}-${o.versie}-pos${p.pos}-${vn(p.naam)}-buislaser-wanden.dxf`, pos: p.pos, n: p.n, dxf: kokerDxf(d, p.L ?? d.L, p.pos), buislaser: true });
  }
  return uit;
}
