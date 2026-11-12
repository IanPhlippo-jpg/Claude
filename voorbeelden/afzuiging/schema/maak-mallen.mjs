// Freesmallen op ware grootte (1:1) op A4 bij het aansluitschema, apart per doos: node voorbeelden/afzuiging/schema/maak-mallen.mjs
// schrijft per doos mal-<doos>.html (A4 staand, 1 eenheid = 1 mm) en de SVG's; e2e/tools/schema-pdf.mjs maakt er
// Freesmal-<doos>-1op1-A4.pdf van. Alle maten komen uit maak-afzuiging.mjs (M).
//   afzuiging (2 bladen): de uitsparing 212 x 212 (past niet op één A4): links en rechts, met lijmrand en paspunten
//   knop (1 blad): het knopgat Ø44, uitgelijnd in de rechtervoorhoek van de uitsparing
//   voedingsbox (1 blad): de onderkant (blad omgedraaid): de uitsparing van de box en de aanzet van de twee sleuven,
//           uitgelijnd op de achterrand van de uitsparing
// Versie 7.2 (advies Fable 5.2): de papieren mal is te slap om met 1 mm speling langs te frezen. Daarom ook een stijve
// freesmal uit MDF 12 mm voor een bovenfrees met kopieerring Ø17 (Bosch 2 609 200 139 of gelijk) en een frees Ø12:
// de opening in de mal is (17 - 12) / 2 = 2,5 mm groter rondom (Bosch: afstand = (ring - frees) / 2), de hoeken R6 + 2,5.
// laser/freesmal-mdf.dxf (laag SNIJDEN en GRAVEREN) laat je samen met het rooster lasersnijden; tekening AFZ-21.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { M } from '../maak-afzuiging.mjs';
import { REVISIE_TEKST } from '../revisie.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 210, H = 297;
const { uitsparing: U, dial: D, box: B, sleuven: K, filter: FI } = M;
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

/**
 * kader volgens ISO 5457 (A4 staand: archiefrand 20 mm links, 10 mm rondom, centreermerken), kop met uitleg,
 * controlemaat van 100 mm en een smal titelblok rechtsonder met de velden van ISO 7200 (de mal staat op ware grootte en
 * neemt bijna het hele blad, daarom twee regels)
 */
function kader(nr, titel, uitleg, soort = 'Freesmal') {
  const s = [];
  s.push(`<rect x="20" y="10" width="180" height="277" fill="none" stroke="#111" stroke-width="0.5"/>`);
  s.push(lijn([W / 2, 0], [W / 2, 15], 0.5), lijn([W / 2, H], [W / 2, H - 15], 0.5), lijn([0, H / 2], [25, H / 2], 0.5), lijn([W, H / 2], [W - 15, H / 2], 0.5));
  s.push(tekst([23, 16], `${soort} 1:1 · ${titel}`, 4.2, 'start', 'font-weight="bold"'));
  uitleg.forEach((t, i) => s.push(tekst([23, 22 + i * 4.4], t, 2.9)));
  // controlemaat
  const y = 266;
  s.push(lijn([23, y], [123, y], 0.35));
  for (let i = 0; i <= 10; i++) s.push(lijn([23 + i * 10, y], [23 + i * 10, y - (i % 5 ? 2 : 3.5)], 0.25));
  s.push(tekst([73, y + 4.5], 'controlemaat 100 mm: meet na voor je begint', 2.6, 'middle'));
  s.push(tekst([23, y + 9], 'afdrukken op 100 % (ware grootte), niet "passend maken"', 2.4));
  // titelblok (ISO 7200): titel, tekeningnummer, blad; eigenaar, revisie en datum, schaal, documentsoort
  const x0 = 110, y0 = 271, rh = 8;
  s.push(`<rect x="${x0}" y="${y0}" width="90" height="16" fill="none" stroke="#111" stroke-width="0.5"/>`, lijn([x0, y0 + rh], [200, y0 + rh], 0.25));
  const veld = (x, rij, label, waarde, h = 2.4, vet = false) => {
    const yy = y0 + rij * rh;
    if (x > x0) s.push(lijn([x, yy], [x, yy + rh], 0.25));
    s.push(tekst([x + 1, yy + 2.4], label, 1.6, 'start', 'fill="#555"'), tekst([x + 1, yy + 6.6], waarde, h, 'start', vet ? 'font-weight="bold"' : ''));
  };
  veld(x0, 0, 'Titel', `${soort} ${titel.split(' (')[0]}`.slice(0, 34), 2.2, true);
  veld(x0 + 56, 0, 'Tekeningnr.', '§NR§', 2.4, true);
  veld(x0 + 77, 0, 'Blad', `${nr}/§TOTAAL§`, 2.2);
  veld(x0, 1, 'Eigenaar', 'Phlippo CAD · Ian', 2.1);
  veld(x0 + 30, 1, 'Rev. / uitgifte', REVISIE_TEKST.replace('versie ', ''), 1.9);
  veld(x0 + 56, 1, 'Schaal', '1:1', 2.1);
  veld(x0 + 69, 1, 'Soort / taal', 'mal · nl', 2.0);
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
  // middellijn van een frees Ø12 (6 mm binnen de rand) en voorboorgaten Ø10 in de hoeken
  s.push(pad(rr(xs(-hb + 6), ys(hd - 6), xs(hb - 6), ys(-hd + 6), Math.max(U.r - 6, 0.01)), 0.18, 'stroke-dasharray="2 1.5"'));
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
  s.push(tekst([xs(kant * 52), ys(-2)], 'stippellijn = middellijn frees Ø12', 2.6, 'middle'));
  s.push(tekst([xs(kant * 52), ys(-7)], 'cirkels in de hoeken = voorboren Ø10', 2.6, 'middle'));
  const uitleg = kant < 0
    ? ['Deel 1 (links). Knip deel 2 af langs de stippellijn en leg het op de lijmrand: de drie kruisjes en de hartlijn vallen samen.',
      'Plak de mal met afplaktape op het blad, middelpunt in het midden van het blad (700 van links, 300 van voor).',
      'Alleen om af te tekenen en na te meten: frezen langs de MDF-mal (AFZ-21) met kopieerring Ø17 en frees Ø12.']
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
  s.push(tekst([197, c[1] + D.gat / 2 + 12.5], 'middelpunt: centreerboor van de gatzaag', 2.8, 'end'));
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
  s.push(tekst([ux0 + 3, Y0 - 34], 'uitsparing', 2.8), tekst([ux0 + 3, Y0 - 30], 'afzuiging', 2.8), tekst([ux0 + 3, Y0 - 26], '(gefreesd):', 2.8), tekst([ux0 + 3, Y0 - 22], 'wegknippen', 2.8));
  s.push(tekst([ux0 - 1.5, Y0 + U.b / 2 + 6], 'achterrand uitsparing', 2.6, 'end'));
  // de box: 212 x 102 x 15 diep, R5 (maten uit M.box.frees)
  const b0 = P(B.x - F.b / 2, B.z - F.d / 2), b1 = P(B.x + F.b / 2, B.z + F.d / 2);
  s.push(pad(rr(Math.min(b0[0], b1[0]), Math.min(b0[1], b1[1]), Math.max(b0[0], b1[0]), Math.max(b0[1], b1[1]), F.r), 0.6));
  s.push(pad(rr(Math.min(b0[0], b1[0]) + 5, Math.min(b0[1], b1[1]) + 5, Math.max(b0[0], b1[0]) - 5, Math.max(b0[1], b1[1]) - 5, Math.max(F.r - 5, 0.01)), 0.18, 'stroke-dasharray="2 1.5"'));
  const bc = P(B.x, B.z);
  s.push(tekst([bc[0], bc[1] - 6], 'voedingsbox', 3.2, 'middle', 'font-weight="bold"'), tekst([bc[0], bc[1] - 1.5], `${F.b} x ${F.d}, R${F.r}`, 2.8, 'middle'), tekst([bc[0], bc[1] + 3], `${F.diep} diep (3 gangen)`, 2.8, 'middle'));
  // de 4 voorboorgaten voor de schroeven van de rand van de box, naast de uitsparing
  const gx = B.plug.x, gz = B.plug.z;
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([kx, kz]) => { const c = P(B.x + kx * gx, B.z + kz * gz); s.push(cirkel(c, B.plug.gat / 2, 0.4), kruis(c, 3)); });
  s.push(tekst([bc[0], bc[1] + 8], `4 voorboorgaten Ø${f(B.plug.gat)} x ${B.plug.diep} voor en achter de uitsparing (schroeven 4 x 16)`, 2.6, 'middle'));
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

// ---- snijmal voor de afdichtlip (siliconenrubber 0,5 mm): buitenmaat = buitenkant van de geleiderand, binnenmaat 2,5 mm
// binnen de nominale rand van het filter (maak-afzuiging.mjs, M.filter.lip) ----
function snijmalLip() {
  const xg = FI.x + FI.speling + FI.gids.dik, zg = FI.z + FI.speling + FI.gids.dik, xi = FI.x - FI.lip.over, zi = FI.z - FI.lip.over;
  const cx = 105, cy = 152, s = [];
  s.push(`<path d="${rr(cx - xg, cy - zg, cx + xg, cy + zg, 2 + FI.gids.dik)} ${rr(cx - xi, cy - zi, cx + xi, cy + zi, 1)}" fill="#e7e2dc" fill-rule="evenodd" stroke="none"/>`);
  s.push(pad(rr(cx - xg, cy - zg, cx + xg, cy + zg, 2 + FI.gids.dik), 0.5), pad(rr(cx - xi, cy - zi, cx + xi, cy + zi, 1), 0.5));
  s.push(tekst([cx, cy - 6], 'binnenstuk: weg', 3, 'middle'), tekst([cx, cy - 1.5], `${f(2 * xi)} x ${f(2 * zi)}`, 2.8, 'middle'));
  s.push(tekst([cx, cy - zg - 2], `buitenmaat ${f(2 * xg)} x ${f(2 * zg)} (= buitenkant van de geleiderand)`, 2.6, 'middle'));
  s.push(tekst([cx, cy + zg + 5], `lip ${f(xg - xi)} mm breed: ${f(FI.gids.dik)} op de rand, ${f(xg - xi - FI.gids.dik)} steekt naar binnen uit`, 2.6, 'middle'));
  const uitleg = ['Leg de mal op de zelfklevende siliconenplaat (0,5 mm, kleeflaag onder) en snij met een scherp mes en een lat langs',
    'beide dikke lijnen: één stuk rondom, zonder naad. Het grijze kader is de lip.',
    'Trek de beschermfolie af en kleef de lip op de geleiderand van de instroomplaat, de buitenrand gelijk met de buitenkant van de rand.'];
  return `${kader(1, 'afdichtlip (siliconenrubber 0,5 mm)', uitleg, 'Snijmal')}\n${s.join('\n')}`;
}

// ---- versie 7.2: freesmal uit MDF 12 mm (laser) voor een kopieerring ----
export const MDF = M.mdf;
export const MDF_OFFSET = (MDF.ring - MDF.frees) / 2;
/** de twee mallen: buitenmaat, opening (met de offset van de kopieerring), boorgaatjes en hartlijnen; maten in mm, midden 0 */
export function mdfMallen() {
  const o = MDF_OFFSET;
  return [
    { naam: 'afzuiging', plaat: MDF.plaat.afzuiging, open: [U.b + 2 * o, U.d + 2 * o], r: U.r + o, gaatjes: [], uit: [U.b, U.d, U.r] },
    { naam: 'voedingsbox', plaat: MDF.plaat.voedingsbox, open: [B.frees.b + 2 * o, B.frees.d + 2 * o], r: B.frees.r + o,
      gaatjes: [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => [a * B.plug.x, b * B.plug.z]), uit: [B.frees.b, B.frees.d, B.frees.r] },
  ];
}
/** DXF (R12, mm): per mal de buitenrand en de opening (SNIJDEN), de boorgaatjes Ø3 (SNIJDEN) en de hartlijnen (GRAVEREN) */
function dxf() {
  const e = [];
  const lijn = (l, a, b) => e.push(`0\nLINE\n8\n${l}\n10\n${a[0].toFixed(3)}\n20\n${a[1].toFixed(3)}\n11\n${b[0].toFixed(3)}\n21\n${b[1].toFixed(3)}`);
  const boog = (l, c, r, a0, a1) => e.push(`0\nARC\n8\n${l}\n10\n${c[0].toFixed(3)}\n20\n${c[1].toFixed(3)}\n40\n${r.toFixed(3)}\n50\n${a0}\n51\n${a1}`);
  const cirkel = (l, c, r) => e.push(`0\nCIRCLE\n8\n${l}\n10\n${c[0].toFixed(3)}\n20\n${c[1].toFixed(3)}\n40\n${r.toFixed(3)}`);
  const rrDxf = (l, cx, cy, w, h, r) => {
    const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
    lijn(l, [x0 + r, y0], [x1 - r, y0]); lijn(l, [x1, y0 + r], [x1, y1 - r]); lijn(l, [x1 - r, y1], [x0 + r, y1]); lijn(l, [x0, y1 - r], [x0, y0 + r]);
    if (r > 0) { boog(l, [x1 - r, y0 + r], r, 270, 360); boog(l, [x1 - r, y1 - r], r, 0, 90); boog(l, [x0 + r, y1 - r], r, 90, 180); boog(l, [x0 + r, y0 + r], r, 180, 270); }
  };
  let cx = 0;
  for (const m of mdfMallen()) {
    const [pw, ph] = m.plaat;
    cx += pw / 2;
    rrDxf('SNIJDEN', cx, 0, pw, ph, 10);
    rrDxf('SNIJDEN', cx, 0, m.open[0], m.open[1], m.r);
    for (const [x, z] of m.gaatjes) cirkel('SNIJDEN', [cx + x, -z], 1.5);
    // hartlijnen (graveren) tot 15 mm van de opening, en een V-inkeping in de rand op de hartlijnen
    lijn('GRAVEREN', [cx - pw / 2 + 5, 0], [cx - m.open[0] / 2 - 15, 0]); lijn('GRAVEREN', [cx + m.open[0] / 2 + 15, 0], [cx + pw / 2 - 5, 0]);
    lijn('GRAVEREN', [cx, -ph / 2 + 5], [cx, -m.open[1] / 2 - 15]); lijn('GRAVEREN', [cx, m.open[1] / 2 + 15], [cx, ph / 2 - 5]);
    cx += pw / 2 + 20;
  }
  return `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${e.join('\n')}\n0\nENDSEC\n0\nEOF\n`;
}

// per doos een eigen set bladen met een eigen nummering
export const DOZEN = { afzuiging: [uitsparingHelft(-1), uitsparingHelft(1)], knop: [knopgat()], voedingsbox: [onderkant()], afdichtlip: [snijmalLip()] };
const svg = (b) => `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>\n${b}\n</svg>`;
for (const [doos, bladen] of Object.entries(DOZEN)) {
  const nr = { afzuiging: 'AFZ-M1', knop: 'AFZ-M2', voedingsbox: 'AFZ-M3', afdichtlip: 'AFZ-M4' }[doos];
  const genummerd = bladen.map((b) => b.replace('§TOTAAL§', String(bladen.length)).replace('§NR§', nr));
  writeFileSync(join(HERE, `mal-${doos}.html`), `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Freesmal ${doos} 1:1</title><style>
@page{size:210mm 297mm;margin:0} html,body{margin:0} .blad{width:210mm;height:297mm;page-break-after:always;overflow:hidden} svg{display:block}
</style></head><body>
${genummerd.map((b) => `<div class="blad">${svg(b)}</div>`).join('\n')}
</body></html>`);
  genummerd.forEach((b, i) => writeFileSync(join(HERE, `mal-${doos}-${i + 1}.svg`), `${svg(b)}\n`));
}
mkdirSync(join(HERE, '..', 'laser'), { recursive: true });
writeFileSync(join(HERE, '..', 'laser', 'freesmal-mdf.dxf'), dxf());
console.log('geschreven: mal-afzuiging, mal-knop, mal-voedingsbox en mal-afdichtlip (html en svg), laser/freesmal-mdf.dxf');
