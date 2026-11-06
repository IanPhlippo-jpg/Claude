// Freesmallen op ware grootte (1:1) op A4 bij het aansluitschema, apart per doos: node voorbeelden/afzuiging/schema/maak-mallen.mjs
// schrijft per doos mal-<doos>.html (A4 staand, 1 eenheid = 1 mm) en de SVG's; e2e/tools/schema-pdf.mjs maakt er
// Freesmal-<doos>-1op1-A4.pdf van. Alle maten komen uit maak-afzuiging.mjs (M).
//   afzuiging (2 bladen): de uitsparing 212 x 212 (past niet op één A4): links en rechts, met lijmrand en paspunten
//   knop (1 blad): het knopgat Ø44, uitgelijnd in de rechtervoorhoek van de uitsparing
//   voedingsbox (1 blad): de onderkant (blad omgedraaid): de uitsparing van de box en de aanzet van de twee sleuven,
//           uitgelijnd op de achterrand van de uitsparing
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { M } from '../maak-afzuiging.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 210, H = 297;
const { uitsparing: U, dial: D, box: B, sleuven: K } = M;
const f = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---- SVG-hulpjes (mm, y omlaag) ----
const lijn = (a, b, w = 0.25, extra = '') => `<line x1="${a[0].toFixed(2)}" y1="${a[1].toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}" stroke="#111" stroke-width="${w}" ${extra}/>`;
const hart = (a, b) => lijn(a, b, 0.18, 'stroke-dasharray="8 1.5 1.5 1.5"');
const tekst = (p, s, h = 3, anker = 'start', extra = '') => `<text x="${p[0].toFixed(2)}" y="${p[1].toFixed(2)}" font-size="${h}" text-anchor="${anker}" font-family="Arial, Helvetica, sans-serif" ${extra}>${esc(s)}</text>`;
const cirkel = (c, r, w = 0.25, extra = '') => `<circle cx="${c[0].toFixed(2)}" cy="${c[1].toFixed(2)}" r="${r}" fill="none" stroke="#111" stroke-width="${w}" ${extra}/>`;
/** afgeronde rechthoek als pad (x0 < x1, y0 < y1) */
const rr = (x0, y0, x1, y1, r) => `M${x0 + r},${y0} H${x1 - r} A${r},${r} 0 0 1 ${x1},${y0 + r} V${y1 - r} A${r},${r} 0 0 1 ${x1 - r},${y1} H${x0 + r} A${r},${r} 0 0 1 ${x0},${y1 - r} V${y0 + r} A${r},${r} 0 0 1 ${x0 + r},${y0} Z`;
const pad = (d, w = 0.6, extra = '') => `<path d="${d}" fill="none" stroke="#111" stroke-width="${w}" ${extra}/>`;
const kruis = (c, k = 4) => lijn([c[0] - k, c[1]], [c[0] + k, c[1]], 0.2) + lijn([c[0], c[1] - k], [c[0], c[1] + k], 0.2) + cirkel(c, 1.2, 0.2);
const pijl = (a, b) => {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / l, (b[1] - a[1]) / l], n = [-d[1], d[0]];
  const p = (s, t) => `${(b[0] - d[0] * s + n[0] * t).toFixed(2)},${(b[1] - d[1] * s + n[1] * t).toFixed(2)}`;
  return lijn(a, b, 0.25) + `<polygon points="${b[0].toFixed(2)},${b[1].toFixed(2)} ${p(3, 1)} ${p(3, -1)}" fill="#111"/>`;
};
const grijs = (d) => `<path d="${d}" fill="#e7e2dc" stroke="none"/>`;

/** kop, controlemaat van 100 mm en voetregel */
function kader(nr, titel, uitleg) {
  const s = [];
  s.push(tekst([10, 13], `Freesmal 1:1 · ${titel}`, 4.2, 'start', 'font-weight="bold"'));
  s.push(tekst([200, 13], `blad ${nr} / §TOTAAL§`, 3.2, 'end'));
  uitleg.forEach((t, i) => s.push(tekst([10, 20 + i * 4.4], t, 2.9)));
  // controlemaat
  const y = 280;
  s.push(lijn([10, y], [110, y], 0.35));
  for (let i = 0; i <= 10; i++) s.push(lijn([10 + i * 10, y], [10 + i * 10, y - (i % 5 ? 2 : 3.5)], 0.25));
  s.push(tekst([60, y + 4.5], 'controlemaat 100 mm: meet na voor je begint', 2.8, 'middle'));
  s.push(tekst([200, y + 4.5], 'afdrukken op 100 % (ware grootte), niet "passend maken"', 2.6, 'end'));
  s.push(tekst([200, y - 1.5], `Afzuiging Lush Beauty v5 · 2026-11-06 · maten in mm`, 2.4, 'end', 'fill="#666"'));
  return s.join('\n');
}

// ---- blad 1 en 2: de uitsparing van de afzuiging, links en rechts van de hartlijn ----
function uitsparingHelft(kant /* -1 links, 1 rechts */) {
  const cx = kant < 0 ? 150 : 60, cy = 150; // het middelpunt van de uitsparing op het blad
  const hb = U.b / 2, hd = U.d / 2, overlap = 10;
  const xs = (x) => cx + x, ys = (z) => cy - z; // bovenaanzicht: voor (+z) onderaan
  const s = [];
  // zichtbaar stuk: deze helft plus 10 mm over de hartlijn (lijmrand of overlap)
  const lo = kant < 0 ? -hb - 20 : -overlap, hi = kant < 0 ? overlap : hb + 20;
  s.push(`<defs><clipPath id="h${kant}"><rect x="${xs(lo)}" y="${ys(hd + 20)}" width="${hi - lo}" height="${U.d + 40}"/></clipPath></defs>`);
  if (kant < 0) s.push(grijs(`M${xs(0)},${ys(hd + 8)} H${xs(overlap)} V${ys(-hd - 8)} H${xs(0)} Z`));
  s.push(`<g clip-path="url(#h${kant})">`);
  s.push(pad(rr(xs(-hb), ys(hd), xs(hb), ys(-hd), U.r), 0.6));
  // middellijn van een frees Ø10 (5 mm binnen de rand) en voorboorgaten Ø10 in de hoeken
  s.push(pad(rr(xs(-hb + 5), ys(hd - 5), xs(hb - 5), ys(-hd + 5), U.r - 5), 0.18, 'stroke-dasharray="2 1.5"'));
  for (const [x, z] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const c = [xs(x * (hb - 5.3)), ys(z * (hd - 5.3))];
    s.push(cirkel(c, 5, 0.2, 'stroke-dasharray="1 1"'), kruis(c, 2));
  }
  s.push(hart([xs(-hb - 15), ys(0)], [xs(hb + 15), ys(0)]), hart([xs(0), ys(hd + 15)], [xs(0), ys(-hd - 15)]));
  s.push('</g>');
  // paspunten op de hartlijn (komen op beide helften terug)
  for (const z of [70, 0, -70]) s.push(kruis([xs(0), ys(z)], 5));
  if (kant < 0) s.push(tekst([xs(overlap / 2), ys(hd + 11)], 'lijmrand', 2.6, 'middle'), tekst([xs(overlap / 2), ys(-hd - 13)], 'deel 2 hierop', 2.6, 'middle'));
  else s.push(lijn([xs(-overlap), ys(hd + 18)], [xs(-overlap), ys(-hd - 18)], 0.3, 'stroke-dasharray="4 2"'), tekst([xs(-overlap) + 1.5, ys(hd + 15)], 'hier afknippen', 2.6));
  // maten naar de randen van het blad en de richting
  const rand = kant < 0 ? -hb : hb;
  s.push(pijl([xs(rand), ys(-hd + 30)], [xs(rand + kant * 26), ys(-hd + 30)]), tekst([xs(rand + kant * 14), ys(-hd + 30) - 2], `${f(700 - hb)} tot de ${kant < 0 ? 'linkerrand' : 'rechterrand'}`, 2.8, 'middle'));
  s.push(pijl([xs(kant * 40), ys(-hd)], [xs(kant * 40), ys(-hd - 14)]), tekst([xs(kant * 40) + 2, ys(-hd - 9)], `${f(300 - hd)} tot de voorrand`, 2.8));
  s.push(tekst([xs(kant * 52), ys(-hd + 12)], 'VOOR (kant waar je zit)', 3, 'middle', 'font-weight="bold"'));
  s.push(tekst([xs(kant * 52), ys(hd - 12)], 'ACHTER', 3, 'middle', 'font-weight="bold"'));
  s.push(tekst([xs(kant * 52), ys(8)], `uitsparing ${U.b} x ${U.d}, hoeken R${U.r}, doorgaand`, 2.8, 'middle'));
  s.push(tekst([xs(kant * 52), ys(3)], 'dikke lijn = rand van de uitsparing', 2.6, 'middle'));
  s.push(tekst([xs(kant * 52), ys(-2)], 'stippellijn = middellijn frees Ø10', 2.6, 'middle'));
  s.push(tekst([xs(kant * 52), ys(-7)], 'cirkels in de hoeken = voorboren Ø10', 2.6, 'middle'));
  const uitleg = kant < 0
    ? ['Deel 1 (links). Knip deel 2 af langs de stippellijn en leg het op de lijmrand: de drie kruisjes en de hartlijn vallen samen.',
      'Plak de mal met afplaktape op het blad, middelpunt in het midden van het blad (700 van links, 300 van voor).',
      'Teken de rand over of frees met een geleider; boor eerst de hoeken voor met Ø10 (binnen de lijn).']
    : ['Deel 2 (rechts). Knip af langs de stippellijn links en leg het op de lijmrand van deel 1 (kruisjes op elkaar).',
      `Controle: ${f(700 - hb)} mm van de linker- en de rechterrand, ${f(300 - hd)} mm van de voorrand, ${f(300 - hd)} mm van de achterrand.`];
  return kader(kant < 0 ? 1 : 2, `uitsparing afzuiging, deel ${kant < 0 ? '1 (links)' : '2 (rechts)'}`, uitleg) + '\n' + s.join('\n');
}

// ---- blad 3: knopgat, uitgelijnd in de rechtervoorhoek van de uitsparing ----
function knopgat() {
  const hx = 32, hy = 95; // de rechtervoorhoek van de uitsparing op het blad
  const xs = (x) => hx + (x - U.b / 2), ys = (z) => hy + (z - U.d / 2) * 1; // z naar voor = naar onder
  const s = [];
  // het kwart van de uitsparing (wegknippen) en zijn rand
  s.push(grijs(`M10,30 H${hx} V${hy - U.r} A${U.r},${U.r} 0 0 1 ${hx - U.r},${hy} H10 Z`));
  s.push(pad(`M${hx},30 V${hy - U.r} A${U.r},${U.r} 0 0 1 ${hx - U.r},${hy} H10`, 0.6));
  s.push(tekst([20, 50], 'uitsparing', 2.8, 'middle'), tekst([20, 54], 'wegknippen', 2.8, 'middle'));
  s.push(tekst([hx + 2, 40], 'rechterrand van de uitsparing', 2.6), tekst([12, hy + 5], 'voorrand van de uitsparing', 2.6));
  const c = [xs(D.x), ys(D.z)];
  s.push(cirkel(c, D.gat / 2, 0.6), cirkel(c, 3, 0.25), kruis(c, D.gat / 2 + 6));
  s.push(tekst([c[0], c[1] + D.gat / 2 + 8], `gat Ø${D.gat} (gatzaag), doorgaand`, 3, 'middle', 'font-weight="bold"'));
  s.push(tekst([c[0], c[1] + D.gat / 2 + 12.5], 'middelpunt: centreerboor van de gatzaag', 2.8, 'middle'));
  // maten vanaf de hoek
  s.push(pijl([hx, c[1]], [c[0] - D.gat / 2 - 1, c[1]]), pijl([c[0] - D.gat / 2 - 1, c[1]], [hx, c[1]]), tekst([(hx + c[0] - D.gat / 2) / 2, c[1] - 1.5], `${f(D.x - U.b / 2)} tot het middelpunt`, 2.6, 'middle'));
  s.push(lijn([hx, c[1] - 3], [hx, c[1] + 3], 0.25));
  s.push(pijl([c[0], hy], [c[0], c[1] - D.gat / 2 - 1]), pijl([c[0], c[1] - D.gat / 2 - 1], [c[0], hy]), tekst([c[0] + 1.5, (hy + c[1] - D.gat / 2) / 2], `${f(D.z - U.d / 2)}`, 2.6));
  s.push(lijn([hx, hy], [c[0] + 5, hy], 0.15, 'stroke-dasharray="1.5 1.5"'));
  s.push(tekst([105, 250], 'VOOR (kant waar je zit)', 3, 'middle', 'font-weight="bold"'), pijl([105, 255], [105, 268]));
  const uitleg = ['Knip het grijze kwart weg en leg de mal in de rechtervoorhoek van de uitsparing: de dikke lijnen tegen de randen.',
    `Controle: het middelpunt ligt ${f(700 + D.x)} mm van de linkerrand en ${f(300 - D.z)} mm van de voorrand.`,
    'Boor met de gatzaag eerst tot de centreerboor er onder uitkomt, en zaag van onderen af: zo splintert het blad niet.'];
  return kader(1, `knopgat Ø${D.gat}`, uitleg) + '\n' + s.join('\n');
}

// ---- blad 4: de onderkant (blad omgedraaid over de lange rand): voedingsbox en de aanzet van de sleuven ----
function onderkant() {
  // onderaanzicht met de voorkant boven, een kwartslag gedraaid: de voorkant wijst naar rechts, links van het blad naar boven
  const zref = -258, X0 = 14, Y0 = 150;
  const P = (x, z) => [X0 + (z - zref), Y0 + x];
  const F = B.frees, s = [];
  // de uitsparing van de afzuiging (al gefreesd): rand en wegknippen
  const [ux0] = P(0, -U.d / 2);
  s.push(grijs(`M${ux0},${Y0 - U.b / 2} H200 V${Y0 + U.b / 2} H${ux0} Z`));
  const a = P(-U.b / 2, -U.d / 2), b2 = P(U.b / 2, -U.d / 2);
  s.push(lijn([a[0], a[1] - 4], [b2[0], b2[1] + 4], 0.6));
  s.push(tekst([ux0 + 8, Y0 - 30], 'uitsparing afzuiging', 2.8), tekst([ux0 + 8, Y0 - 26], '(al gefreesd): wegknippen', 2.8));
  s.push(tekst([ux0 - 1.5, Y0 + U.b / 2 + 6], 'achterrand uitsparing', 2.6, 'end'));
  // de box: 212 x 102 x 15 diep, R5 (maten uit M.box.frees)
  const b0 = P(B.x - F.b / 2, B.z - F.d / 2), b1 = P(B.x + F.b / 2, B.z + F.d / 2);
  s.push(pad(rr(Math.min(b0[0], b1[0]), Math.min(b0[1], b1[1]), Math.max(b0[0], b1[0]), Math.max(b0[1], b1[1]), F.r), 0.6));
  s.push(pad(rr(Math.min(b0[0], b1[0]) + 5, Math.min(b0[1], b1[1]) + 5, Math.max(b0[0], b1[0]) - 5, Math.max(b0[1], b1[1]) - 5, Math.max(F.r - 5, 0.01)), 0.18, 'stroke-dasharray="2 1.5"'));
  const bc = P(B.x, B.z);
  s.push(tekst([bc[0], bc[1] - 6], 'voedingsbox', 3.2, 'middle', 'font-weight="bold"'), tekst([bc[0], bc[1] - 1.5], `${F.b} x ${F.d}, R${F.r}`, 2.8, 'middle'), tekst([bc[0], bc[1] + 3], `${F.diep} diep (3 gangen)`, 2.8, 'middle'));
  // de 4 gaten Ø8 voor de pluggen voor holle deuren, naast de uitsparing (onder de rand van de box)
  const gx = B.plug.x, gz = B.plug.z;
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([kx, kz]) => { const c = P(B.x + kx * gx, B.z + kz * gz); s.push(cirkel(c, B.plug.gat / 2, 0.4), kruis(c, 3)); });
  s.push(tekst([bc[0], bc[1] + 8], `4 gaten Ø${B.plug.gat} x ${B.plug.diep} voor en achter de uitsparing (pluggen voor holle deuren)`, 2.6, 'middle'));
  // sleuf naar de afzuiging: 29 breed, 7 diep, van de box tot in de uitsparing
  const m0 = P(K.module.x[0], B.z + F.d / 2), m1 = P(K.module.x[1], -U.d / 2);
  s.push(pad(`M${m0[0]},${m0[1]} H${m1[0]} M${m0[0]},${m1[1]} H${m1[0]}`, 0.6));
  s.push(tekst([(m0[0] + m1[0]) / 2, (m0[1] + m1[1]) / 2 + 1], `sleuf ${K.module.x[1] - K.module.x[0]} x ${K.module.diep}`, 2.6, 'middle'));
  // sleuf naar de knop: 5 breed, 5 diep, van de box schuin naar het knopgat
  const s0 = [B.x + F.b / 2 - 2, B.z + K.knop.z], s1 = [D.x, D.z];
  const l = Math.hypot(s1[0] - s0[0], s1[1] - s0[1]), d = [(s1[0] - s0[0]) / l, (s1[1] - s0[1]) / l], n = [-d[1] * K.knop.breed / 2, d[0] * K.knop.breed / 2];
  const t = (H - 42 - Y0 - s0[0]) / d[0]; // tot ruim boven de controlemaat
  const e = [s0[0] + d[0] * t, s0[1] + d[1] * t];
  for (const k of [1, -1]) s.push(lijn(P(s0[0] + k * n[0], s0[1] + k * n[1]), P(e[0] + k * n[0], e[1] + k * n[1]), 0.6));
  const em = P(e[0], e[1]);
  s.push(tekst([em[0] + 4, em[1] - 2], `sleuf ${K.knop.breed} x ${K.knop.diep} naar het knopgat`, 2.6), tekst([em[0] + 4, em[1] + 2], `(nog ${f(l - t - D.gat / 2)} mm, rechte lijn)`, 2.6));
  // hartlijn (midden van het blad) en richtingen
  s.push(hart([X0 - 4, Y0], [200, Y0]));
  s.push(tekst([X0, Y0 - 2], 'hartlijn: midden van het blad', 2.6));
  s.push(tekst([186, 66], 'VOOR', 3, 'middle', 'font-weight="bold"'), pijl([176, 70], [196, 70]));
  s.push(tekst([20, 34], 'links', 2.8, 'middle', 'font-weight="bold"'), pijl([20, 46], [20, 36.5]));
  const uitleg = ['Onderkant: leg het blad met de bovenkant op een deken. Links van het blad wijst naar boven, de voorkant naar rechts.',
    'Knip het grijze deel weg: leg de dikke lijn op de achterrand van de uitsparing en de hartlijn op het midden.',
    `Controle: het midden van de box ligt ${f(700 + B.x)} mm van de linkerrand en ${f(300 - B.z)} mm van de voorrand.`];
  return kader(1, 'voedingsbox en sleuven (onderkant)', uitleg) + '\n' + s.join('\n');
}

// per doos een eigen set bladen met een eigen nummering
export const DOZEN = { afzuiging: [uitsparingHelft(-1), uitsparingHelft(1)], knop: [knopgat()], voedingsbox: [onderkant()] };
const svg = (b) => `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>\n${b}\n</svg>`;
for (const [doos, bladen] of Object.entries(DOZEN)) {
  const genummerd = bladen.map((b) => b.replace('§TOTAAL§', String(bladen.length)));
  writeFileSync(join(HERE, `mal-${doos}.html`), `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Freesmal ${doos} 1:1</title><style>
@page{size:210mm 297mm;margin:0} html,body{margin:0} .blad{width:210mm;height:297mm;page-break-after:always;overflow:hidden} svg{display:block}
</style></head><body>
${genummerd.map((b) => `<div class="blad">${svg(b)}</div>`).join('\n')}
</body></html>`);
  genummerd.forEach((b, i) => writeFileSync(join(HERE, `mal-${doos}-${i + 1}.svg`), `${svg(b)}\n`));
}
console.log('geschreven: mal-afzuiging, mal-knop en mal-voedingsbox (html en svg)');
