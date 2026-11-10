// Mallen op ware grootte (1:1) van alle niet-rechte plaatdelen en van alle ogen met een asgat, om op 100 % af te drukken
// op A4, op de plaat te plakken en uit te snijden (plasma, slijper, lintzaag) en te boren. Lange delen (armwang,
// kapzijde, palplaat) lopen over meerdere bladen: een lijmstrook, een doorlopende hartlijn en een liniaal met de
// afstand in mm leggen de bladen juist tegen elkaar. Op elk blad een controlemaat van 100 mm.
// Vormen = maak-lastafel.mjs (armen, ogen, kap, pal). Gebruik: node voorbeelden/lastafel/mallen/maak-mallen.mjs
// -> mallen/MAL-*.svg, mallen/mallen.html en mallen/Mallen-lastafel-1op1.pdf (A4, schaal 1)
import { writeFileSync, readdirSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { M } from '../maak-lastafel.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const g = (v) => (Math.round(v * 10) / 10).toString().replace('.', ',');
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------------------------------------------------------------- de vormen (mm, y omhoog; bogen: ccw = tegen de klok)
const L = M.arm, R = M.ah / 2;
const HM = M.ahMid / 2; // halve hoogte in het midden (90)
const YK = (x) => (x <= L / 2 ? R + ((HM - R) * x) / (L / 2) : R + ((HM - R) * (L - x)) / (L / 2)); // halve hoogte van de wang op x
const VORMEN = [
  {
    id: 'ARM', naam: 'Armwang (volledig)', aantal: 8, mat: 'S355, plaat 10 mm', waar: 'schaararmen A en B, 2 wangen per arm', alleen: 'A3',
    pad: [['M', 0, -R], ['L', L / 2, -HM], ['L', L, -R], ['A', R, 1, L, R], ['L', L / 2, HM], ['L', 0, R], ['A', R, 1, 0, -R], ['Z']],
    gaten: [{ x: 0, y: 0, d: 60, t: 'Ø60 (lagerbus)' }, { x: L / 2, y: 0, d: 50, t: 'Ø50 (lagerbus)' }, { x: L, y: 0, d: 60, t: 'Ø60 (lagerbus)' }],
    maten: [['h', 0, L, -R - 12, `${L} hart-hart`], ['h', 0, L / 2, R + 34, `${L / 2}`], ['v', -R, R, -R - 14, `${2 * R}`], ['v', -HM, HM, L / 2 + 30, `${2 * HM}`]],
    hartlijn: [-R - 8, L + R + 8],
    noot: ['Gaten voor de lagerbussen (Ø60 aan de koppen, Ø50 in het midden); de bus dwars door de koker lassen, daarna de bus op maat boren. Kop R58.'],
  },
  {
    id: 'ARM-KOP', naam: 'Armwang: kopmal', alleen: 'A4', aantal: 16, mat: 'S355, plaat 10 mm (8 wangen, 2 koppen per wang)', waar: 'schaararmen A en B; dezelfde mal voor beide koppen (omdraaien)',
    open: true, pad: [['M', 150, -YK(150)], ['L', 0, -R], ['A', R, 0, 0, R], ['L', 150, YK(150)]],
    hulp: [{ lijn: [[150, -YK(150)], [175, -YK(175)]] }, { lijn: [[150, YK(150)], [175, YK(175)]], t: 'met de lat verder naar het midden' }],
    gaten: [{ x: 0, y: 0, d: 60, t: 'Ø60 (lagerbus)' }],
    maten: [['v', -R, R, -R - 14, '116'], ['h', 0, 150, -78, '150'], ['v', -YK(150), YK(150), 165, g(2 * YK(150))]],
    hartlijn: [-R - 8, 185],
    noot: ['Aftekenen: hartlijn over de hele plaat; boorpunten op 0, 1040 en 2080 (meetlint).', 'Hoogte vanaf de hartlijn: ±58 bij 0 en 2080, ±90 bij 1040. Rechte randen met een lat.', 'Mal op het boorpunt en de hartlijn leggen, R58 aftekenen. Gat Ø60 voor de lagerbus.'],
  },
  {
    id: 'ARM-MID', naam: 'Armwang: middenmal (halve mal, spiegelen over de hartlijn)', alleen: 'A4', aantal: 8, mat: 'S355, plaat 10 mm', waar: 'schaararmen A en B, boring van de middenpen',
    open: true, pad: [['M', 960, YK(960)], ['L', 1040, HM], ['L', 1120, YK(960)], ['M', 960, -12], ['L', 960, -12.01]],
    gaten: [{ x: 1040, y: 0, d: 50, t: 'Ø50 (lagerbus)' }],
    maten: [['v', 0, HM, 1135, `${HM} (helft van ${2 * HM})`], ['h', 960, 1040, 60, '80'], ['h', 1040, 1120, 60, '80']],
    hartlijn: [945, 1135],
    noot: ['Midden van de wang: 1040 van beide koppen; de wang is hier 180 hoog (knik).', 'Mal op de hartlijn en het boorpunt leggen, bovenrand aftekenen, omdraaien voor de onderrand.'],
  },
  {
    id: 'OOG-B', naam: 'Oog cilinder (op de cilinderbuis Ø90)', aantal: 4, mat: 'S355, plaat 12 mm', waar: 'armpaar B, 2 per stangoog',
    pad: [['M', -34, 29.5], ['L', -34, 90], ['A', 34, 0, 34, 90], ['L', 34, 29.5], ['A', 45, 1, -34, 29.5], ['Z']],
    gaten: [{ x: 0, y: 90, d: 40, t: 'Ø40 H8' }],
    maten: [['h', -34, 34, 140, '68'], ['v', 0, 90, -50, '90 tot hart buis'], ['v', 90, 124, 50, 'R34']],
    noot: ['Onderkant = zadel R45: past op de cilinderbuis Ø90.', 'Hart boring 90 boven het hart van de buis.'],
  },
  {
    id: 'LIP', naam: 'Lipplaat cilinderbok', aantal: 4, mat: 'S355, plaat 12 mm', waar: 'cilinderbok, 2 per cilinder',
    pad: [['M', -40, -42.5], ['L', 40, -42.5], ['L', 40, 0], ['L', 28, 28], ['L', 0, 40], ['L', -28, 28], ['L', -40, 0], ['Z']],
    gaten: [{ x: 0, y: 0, d: 40, t: 'Ø40 H8' }],
    maten: [['h', -40, 40, -56, '80'], ['v', -42.5, 0, -54, '42,5'], ['v', -42.5, 40, 54, '82,5']],
    noot: ['Onderkant op de dwarsplaat (8 mm): hart pen 60 boven de vloer.'],
  },
  {
    id: 'BOK-A', naam: 'Scharnierbok armpaar A', aantal: 2, mat: 'S355, plaat 10 mm', waar: 'onderframe, tegen het lijf van de langsligger (z -1000)',
    pad: [['M', -60, 0], ['L', 60, 0], ['L', 60, 130], ['L', -60, 130], ['Z']],
    gaten: [{ x: 0, y: 65, d: 40, t: 'Ø40 H8' }],
    maten: [['h', -60, 60, -14, '120'], ['v', 0, 130, -74, '130'], ['v', 0, 65, 74, '65']],
    noot: ['Onderkant op de vloerplaat. Boring in lijn met de', 'andere bok: as Ø40 erdoor tijdens het lassen.'],
  },
  {
    id: 'BLOK-B', naam: 'Plaat scharnierblok armpaar B', aantal: 6, mat: 'S355, plaat 20 mm', waar: 'bovenframe, 3 platen per blok (z -1000)',
    pad: [['M', -60, 0], ['L', 60, 0], ['L', 60, 127], ['L', -60, 127], ['Z']],
    gaten: [{ x: 0, y: 65, d: 40, t: 'Ø40 H8' }],
    maten: [['h', -60, 60, -14, '120'], ['v', 0, 127, -74, '127'], ['v', 0, 65, 74, '65']],
    noot: ['Bovenkant tegen het bovenframe. 3 platen samen', 'opspannen en in één keer boren.'],
  },
  {
    id: 'HIJS', naam: 'Hijsoog', aantal: 4, mat: 'S355, plaat 16 mm', waar: 'onderframe, op de bovenflens (z ±800)',
    pad: [['M', -40, 0], ['L', 40, 0], ['L', 40, 30.5], ['A', 40, 1, -40, 30.5], ['Z']],
    gaten: [{ x: 0, y: 32.5, d: 30, t: 'Ø30' }],
    maten: [['h', -40, 40, -14, '80'], ['v', 0, 32.5, -54, '32,5'], ['v', 0, 70.5, 54, '70,5']],
    noot: ['Kop R40. Gat Ø30 voor een sluiting of haak.'],
  },
  {
    id: 'KAP', naam: 'Kopplaat valbeveiliging', aantal: 2, mat: 'S355, plaat 6 mm', waar: 'gele kap, doorvoer van de stang Ø56',
    pad: [['M', -81, 0], ['L', 81, 0], ['L', 81, 130], ['L', -81, 130], ['Z']],
    gaten: [{ x: 0, y: 45, d: 57, t: 'Ø57' }],
    maten: [['h', -81, 81, -14, '162'], ['v', 0, 130, -88, '130'], ['v', 0, 45, 88, '45']],
    noot: ['Hart doorvoer = hart van de zuigerstang.'],
  },
];
// kapzijde en palplaat met zaagtand, zoals in maak-lastafel.mjs (kap: d-600 tot d-100, pal: z 150 tot 510 op de koker)
const kapzijde = (() => {
  const p = [['M', 0, 87.5], ['L', 503, 87.5], ['L', 503, -26], ['L', 500, -26]];
  let z = 500; for (; z > 29; z -= 30) p.push(['L', z - 30, -40], ['L', z - 30, -26]);
  if (z !== 0) p.push(['L', 0, -26]);
  p.push(['Z']);
  return p;
})();
const palplaat = (() => {
  const p = [['M', 0, 0], ['L', 0, 26]];
  for (let z = 0; z < 360; z += 30) p.push(['L', z + 30, 38], ['L', z + 30, 26]);
  p.push(['L', 360, 0], ['Z']);
  return p;
})();
VORMEN.push(
  { id: 'KAPZ', naam: 'Kapzijde met zaagtand', aantal: 4, mat: 'S355, plaat 8 mm', waar: 'gele kap, 2 per cilinder (links en rechts gespiegeld)', pad: kapzijde, gaten: [],
    maten: [['v', -40, 87.5, -14, '127,5'], ['v', -40, -26, 517, '14']],
    noot: ['16 tanden, steek 30, diepte 14; de steile kant naar de kopplaat.', 'Rechterzijde: mal omdraaien.'] },
  { id: 'PAL', naam: 'Palplaat valbeveiliging', aantal: 4, mat: 'C45 (tanden gehard) of S355, plaat 8 mm', waar: 'op de koker van de cilinder, 2 per cilinder', pad: palplaat,
    gaten: [{ x: 15, y: 12, d: 16, t: 'Ø16 (scharnier)' }],
    maten: [['h', 0, 360, 58, '360'], ['v', 0, 38, 374, '38'], ['h', 0, 15, 48, '15'], ['v', 0, 12, -14, '12']],
    noot: ['12 tanden, steek 30, hoogte 12. Scharniergat achteraan.'] },
);

// ---------------------------------------------------------------- tekenen
const RAND = 10, KOP = 16, VOET = 18, OVERLAP = 15;
const bbox = (v) => {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const p = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
  let cur = [0, 0];
  for (const s of v.pad) {
    if (s[0] === 'M' || s[0] === 'L') { p(s[1], s[2]); cur = [s[1], s[2]]; }
    if (s[0] === 'A') {
      // korte boog (≤ 180°): het middelpunt ligt links van de koorde bij ccw, rechts bij cw; punten langs de boog
      const [, r, ccw, x, y] = s, dx = x - cur[0], dy = y - cur[1], l = Math.hypot(dx, dy), h = Math.sqrt(Math.max(0, r * r - (l / 2) ** 2));
      const n = ccw ? [-dy / l, dx / l] : [dy / l, -dx / l], c = [(cur[0] + x) / 2 + n[0] * h, (cur[1] + y) / 2 + n[1] * h];
      let a0 = Math.atan2(cur[1] - c[1], cur[0] - c[0]), a1 = Math.atan2(y - c[1], x - c[0]);
      if (ccw && a1 <= a0) a1 += 2 * Math.PI; if (!ccw && a1 >= a0) a1 -= 2 * Math.PI;
      for (let k = 0; k <= 24; k++) { const a = a0 + ((a1 - a0) * k) / 24; p(c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)); }
      cur = [x, y];
    }
  }
  return { x0, x1, y0, y1 };
};
/** een vorm als SVG in een eigen assenstelsel: (x, y) van de vorm -> (X, Y) op het canvas met y omlaag */
function vormSvg(v, T) {
  const { X, Y } = T, e = [];
  const d = v.pad.map((s) => (s[0] === 'Z' ? 'Z' : s[0] === 'A' ? `A${s[1]} ${s[1]} 0 0 ${s[2] ? 0 : 1} ${X(s[3]).toFixed(2)} ${Y(s[4]).toFixed(2)}` : `${s[0]}${X(s[1]).toFixed(2)} ${Y(s[2]).toFixed(2)}`)).join(' ');
  for (const h of v.hulp ?? []) if (h.lijn) { const [[a, b], [c, d2]] = h.lijn; e.push(`<line x1="${X(a)}" y1="${Y(b)}" x2="${X(c)}" y2="${Y(d2)}" stroke="#000" stroke-width="0.4" stroke-dasharray="2 1.5"/>`); if (h.t) e.push(`<text x="${X(c) - 2}" y="${Y(d2) - 2.5}" font-size="3" text-anchor="end" fill="#444">${esc(h.t)}</text>`); }
  for (const h of v.hulp ?? []) if (h.cirkel) { const [cx, cy, r] = h.cirkel; e.push(`<circle cx="${X(cx)}" cy="${Y(cy)}" r="${r}" fill="none" stroke="#777" stroke-width="0.25" stroke-dasharray="3 1.5"/><text x="${X(cx)}" y="${Y(cy) + 4}" font-size="3" text-anchor="middle" fill="#666">${esc(h.t)}</text>`); }
  e.push(`<path d="${d}" fill="${v.open ? 'none' : '#f1f3f4'}" stroke="#000" stroke-width="0.5"/>`);
  if (v.hartlijn) e.push(`<line x1="${X(v.hartlijn[0])}" y1="${Y(0)}" x2="${X(v.hartlijn[1])}" y2="${Y(0)}" stroke="#555" stroke-width="0.25" stroke-dasharray="8 1.5 1.5 1.5"/><text x="${X(v.hartlijn[1])}" y="${Y(0) - 1.5}" font-size="2.8" text-anchor="end" fill="#555">hartlijn</text>`);
  for (const h of v.gaten) {
    const cx = X(h.x), cy = Y(h.y), r = h.d / 2, k = r + 6;
    e.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="#000" stroke-width="0.5"/>`);
    e.push(`<line x1="${cx - k}" y1="${cy}" x2="${cx + k}" y2="${cy}" stroke="#000" stroke-width="0.2"/><line x1="${cx}" y1="${cy - k}" x2="${cx}" y2="${cy + k}" stroke="#000" stroke-width="0.2"/>`);
    e.push(`<circle cx="${cx}" cy="${cy}" r="0.9" fill="#000"/><text x="${cx + r * 0.72 + 1}" y="${cy - r * 0.72 - 1}" font-size="3.4" font-weight="700">${esc(h.t)}</text>`);
  }
  for (const [s, a, b, c, t] of v.maten) {
    if (s === 'h') {
      const y = Y(c), x1 = X(a), x2 = X(b);
      e.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#000" stroke-width="0.18"/>`, pijl(x1, y, 1, 0), pijl(x2, y, -1, 0));
      e.push(`<text x="${(x1 + x2) / 2}" y="${y - 1.2}" font-size="3.4" text-anchor="middle">${esc(t)}</text>`);
    } else {
      const x = X(c), y1 = Y(a), y2 = Y(b);
      e.push(`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#000" stroke-width="0.18"/>`, pijl(x, y1, 0, -1), pijl(x, y2, 0, 1));
      e.push(`<text x="${x - 1.2}" y="${(y1 + y2) / 2}" font-size="3.4" text-anchor="middle" transform="rotate(-90 ${x - 1.2} ${(y1 + y2) / 2})">${esc(t)}</text>`);
    }
  }
  return e.join('\n');
}
const pijl = (x, y, dx, dy) => { const n = [-dy, dx]; return `<polygon points="${x},${y} ${x + dx * 2.5 + n[0] * 0.6},${y + dy * 2.5 + n[1] * 0.6} ${x + dx * 2.5 - n[0] * 0.6},${y + dy * 2.5 - n[1] * 0.6}" fill="#000"/>`; };
/** kop en voet van elk blad: titel, bladnummer, afdrukwaarschuwing, controlemaat 100 mm */
function rand(pag, nr, totaal, titel, fmt) {
  const { w, h } = pag;
  const cy = h - RAND - 6;
  return [
    `<rect x="${RAND}" y="${RAND}" width="${w - 2 * RAND}" height="${h - 2 * RAND}" fill="none" stroke="#000" stroke-width="0.35"/>`,
    `<text x="${RAND + 3}" y="${RAND + 6}" font-size="4.2" font-weight="700">${esc(titel)}</text>`,
    `<text x="${w - RAND - 3}" y="${RAND + 6}" font-size="3.4" text-anchor="end">Lastafel op heftafel · mallen 1:1 · ${fmt} · blad ${nr} / ${totaal}</text>`,
    `<text x="${RAND + 3}" y="${RAND + 11.5}" font-size="3" fill="#a00">Afdrukken op 100 % (werkelijke grootte), niet 'passend maken'. Meet eerst de controlemaat.</text>`,
    `<line x1="${RAND + 4}" y1="${cy}" x2="${RAND + 104}" y2="${cy}" stroke="#000" stroke-width="0.5"/>`,
    ...[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((k) => `<line x1="${RAND + 4 + k}" y1="${cy}" x2="${RAND + 4 + k}" y2="${cy - (k % 50 ? 1.6 : 3)}" stroke="#000" stroke-width="0.3"/>`),
    `<text x="${RAND + 54}" y="${cy + 4.4}" font-size="3" text-anchor="middle">controle: 100 mm</text>`,
    `<line x1="${w - RAND - 4}" y1="${cy}" x2="${w - RAND - 4}" y2="${cy - 50}" stroke="#000" stroke-width="0.5"/><text x="${w - RAND - 6}" y="${cy - 25}" font-size="3" text-anchor="middle" transform="rotate(-90 ${w - RAND - 6} ${cy - 25})">50 mm</text>`,
  ].join('\n');
}
const blok = (v, x, y) => [`<text x="${x}" y="${y}" font-size="4.6" font-weight="700">${esc(v.id)} · ${esc(v.naam)}</text>`, `<text x="${x}" y="${y + 5.2}" font-size="3.4">${v.aantal} x · ${esc(v.mat)} · ${esc(v.waar)}</text>`, ...(v.noot ?? []).map((t, i) => `<text x="${x}" y="${y + 10.4 + i * 4.4}" font-size="3.2" fill="#333">${esc(t)}</text>`)].join('\n');
const svg = (pag, inhoud) => `<svg xmlns="http://www.w3.org/2000/svg" width="${pag.w}mm" height="${pag.h}mm" viewBox="0 0 ${pag.w} ${pag.h}" font-family="Arial, Helvetica, sans-serif"><rect width="${pag.w}" height="${pag.h}" fill="#fff"/>${inhoud}</svg>`;

// ---------------------------------------------------------------- bladen per papierformaat: lange delen in stroken (liggend), kleine delen samen (staand)
const FORMATEN = { A4: { P: { w: 210, h: 297 }, L: { w: 297, h: 210 } }, A3: { P: { w: 297, h: 420 }, L: { w: 420, h: 297 } } };
const LANG = ['ARM', 'ARM-KOP', 'ARM-MID', 'KAPZ', 'PAL'];
const MARGE = { l: 26, r: 26, o: 30, b: 26 }; // ruimte rond een vorm voor maten en tekst
function bladenVoor(fmt) {
  const F = FORMATEN[fmt], bladen = [], hier = VORMEN.filter((v) => !v.alleen || v.alleen === fmt);
  for (const v of hier.filter((x) => LANG.includes(x.id))) {
    const pag = F.L, b = bbox(v), W = b.x1 - b.x0 + MARGE.l + MARGE.r, Hh = b.y1 - b.y0;
    const vrijB = pag.w - 2 * RAND, stap = vrijB - OVERLAP, n = Math.max(1, Math.ceil((W - vrijB) / stap) + 1);
    const info = 6 + 4.2 * (v.noot?.length ?? 0), top = RAND + KOP + info + 6 + Math.max(0, (pag.h - 2 * RAND - KOP - VOET - info - 30 - Hh) / 2);
    for (let k = 0; k < n; k++) {
      const sx = RAND - k * stap; // het canvas schuift per strook
      const X = (x) => sx + MARGE.l + (x - b.x0), Y = (y) => top + (b.y1 - y);
      const clip = `c${fmt}${v.id}${k}`;
      const lineaal = [];
      for (let m = Math.ceil((b.x0 - MARGE.l) / 10) * 10; m <= b.x1 + MARGE.r; m += 10) {
        const xx = X(m), yy = Y(b.y0) + 7;
        lineaal.push(`<line x1="${xx}" y1="${yy}" x2="${xx}" y2="${yy + (m % 50 ? 1.5 : 3)}" stroke="#000" stroke-width="0.25"/>`);
        if (m % 50 === 0) lineaal.push(`<text x="${xx}" y="${yy + 6.4}" font-size="2.8" text-anchor="middle">${m}</text>`, `<line x1="${xx - 2}" y1="${Y(0) - 2}" x2="${xx + 2}" y2="${Y(0) + 2}" stroke="#c00" stroke-width="0.2"/><line x1="${xx - 2}" y1="${Y(0) + 2}" x2="${xx + 2}" y2="${Y(0) - 2}" stroke="#c00" stroke-width="0.2"/>`);
      }
      const lijm = k ? `<rect x="${RAND}" y="${RAND + KOP}" width="${OVERLAP}" height="${pag.h - 2 * RAND - KOP - VOET}" fill="#ffe9a8" opacity="0.55"/><text x="${RAND + OVERLAP / 2}" y="${pag.h / 2}" font-size="3" text-anchor="middle" transform="rotate(-90 ${RAND + OVERLAP / 2} ${pag.h / 2})">lijmstrook: blad ${k} hieronder, liniaal en kruisjes op elkaar</text>` : '';
      const inhoud = [
        `<defs><clipPath id="${clip}"><rect x="${RAND}" y="${RAND + KOP}" width="${vrijB}" height="${pag.h - 2 * RAND - KOP - VOET}"/></clipPath></defs>`,
        `<g clip-path="url(#${clip})">${lijm}${vormSvg(v, { X, Y })}${lineaal.join('')}</g>`,
        `<g>${[`<text x="${RAND + 4}" y="${RAND + KOP + 2}" font-size="3.4">${v.aantal} x · ${esc(v.mat)} · ${esc(v.waar)}</text>`, ...(v.noot ?? []).map((t, i) => `<text x="${RAND + 4}" y="${RAND + KOP + 6.4 + i * 4.2}" font-size="3.1" fill="#333">${esc(t)}</text>`)].join('')}</g>`,
      ].join('\n');
      bladen.push({ pag, ids: [v.id], titel: n > 1 ? `${v.id} ${v.naam} — strook ${k + 1} van ${n}` : `${v.id} ${v.naam}`, inhoud });
    }
  }
  // kleine delen: rijen van links naar rechts, zoveel als er op een staand blad passen
  const pagP = F.P, maxY = pagP.h - RAND - VOET;
  let rij = [], hoogte = RAND + KOP + 4, xpos = RAND + 4, rijH = 0;
  const sluit = () => { if (rij.length) bladen.push({ pag: pagP, ids: rij.map((r) => r.v.id), titel: `Ogen en kleine delen: ${rij.map((r) => r.v.id).join(', ')}`, inhoud: rij.map((r) => r.html).join('\n') }); rij = []; hoogte = RAND + KOP + 4; xpos = RAND + 4; rijH = 0; };
  for (const v of hier.filter((x) => !LANG.includes(x.id))) {
    const b = bbox(v), w = Math.max(b.x1 - b.x0 + 2 * 24, 84), h = b.y1 - b.y0 + 30 + 4.4 * (v.noot?.length ?? 0) + 20;
    if (xpos + w > pagP.w - RAND) { hoogte += rijH; xpos = RAND + 4; rijH = 0; }
    if (hoogte + h > maxY) sluit();
    const X = (x) => xpos + 24 + (x - b.x0), Y = (y) => hoogte + 26 + 4.4 * (v.noot?.length ?? 0) + (b.y1 - y) + 4;
    rij.push({ v, html: `<g>${blok(v, xpos, hoogte + 4)}${vormSvg(v, { X, Y })}</g>` });
    xpos += w + 4; rijH = Math.max(rijH, h);
  }
  sluit();
  return bladen;
}

// ---------------------------------------------------------------- schrijven: svg per blad, html en pdf per formaat
for (const f of readdirSync(HERE)) if (/^MAL-(A[34]-)?\d+\.svg$/.test(f) || f === 'mallen.html' || f === 'Mallen-lastafel-1op1.pdf') unlinkSync(join(HERE, f));
const { chromium } = await import(pathToFileURL(join(HERE, '../../../node_modules/playwright/index.mjs')).href);
const browser = await chromium.launch(process.platform === 'win32' ? { channel: process.env.PW_CHANNEL ?? 'msedge' } : {});
const overzicht = VORMEN.map((v) => ({ id: v.id, naam: v.naam, aantal: v.aantal, mat: v.mat, waar: v.waar, alleen: v.alleen ?? '', bladen: {} }));
for (const fmt of Object.keys(FORMATEN)) {
  const F = FORMATEN[fmt], bladen = bladenVoor(fmt);
  const svgs = bladen.map((b, i) => svg(b.pag, `${rand(b.pag, i + 1, bladen.length, b.titel, fmt)}\n${b.inhoud}`));
  svgs.forEach((s, i) => writeFileSync(join(HERE, `MAL-${fmt}-${String(i + 1).padStart(2, '0')}.svg`), s));
  const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8"><title>Mallen lastafel 1:1 (${fmt})</title><style>
@page staand { size: ${F.P.w}mm ${F.P.h}mm; margin: 0 } @page liggend { size: ${F.L.w}mm ${F.L.h}mm; margin: 0 }
html, body { margin: 0 } .b { overflow: hidden; page-break-after: always } .b svg { display: block }
.P { page: staand; width: ${F.P.w}mm; height: ${F.P.h}mm } .L { page: liggend; width: ${F.L.w}mm; height: ${F.L.h}mm }
</style></head><body>${bladen.map((b, i) => `<div class="b ${b.pag === F.P ? 'P' : 'L'}">${svgs[i]}</div>`).join('\n')}</body></html>`;
  writeFileSync(join(HERE, `mallen-${fmt}.html`), html);
  for (const o of overzicht) o.bladen[fmt] = bladen.map((b, i) => (b.ids.includes(o.id) ? i + 1 : 0)).filter(Boolean);
  const page = await browser.newPage();
  await page.goto(pathToFileURL(join(HERE, `mallen-${fmt}.html`)).href);
  await page.pdf({ path: join(HERE, `Mallen-lastafel-${fmt}-1op1.pdf`), preferCSSPageSize: true, printBackground: true });
  for (let i = 0; i < svgs.length; i++) await page.locator('.b').nth(i).screenshot({ path: join(HERE, '../../../e2e-out', `mal-${fmt}-${i + 1}.png`) });
  await page.close();
  console.log(`mallen ${fmt}:`, bladen.length, 'bladen;', bladen.map((b) => b.titel.split(' —')[0].split(':')[0]).join(' | '));
}
writeFileSync(join(HERE, 'overzicht.json'), JSON.stringify(overzicht, null, 1) + '\n');

// ---------------------------------------------------------------- DXF (R12, mm) per plaatdeel voor de lasersnijder
// omtrek als LINE en ARC (laag SNIJDEN), gaten als CIRCLE (laag GATEN); de A4-hulpmallen (open vormen) niet
mkdirSync(join(HERE, 'dxf'), { recursive: true });
for (const f of readdirSync(join(HERE, 'dxf'))) unlinkSync(join(HERE, 'dxf', f));
const n6 = (x) => (Math.round(x * 1e4) / 1e4).toString();
for (const v of VORMEN.filter((x) => !x.open)) {
  const e = [], ent = (type, laag, kv) => e.push('0', type, '8', laag, ...kv.flatMap(([k, w]) => [String(k), n6(w)]));
  let cur = [0, 0], start = [0, 0];
  for (const s of v.pad) {
    if (s[0] === 'M') { cur = [s[1], s[2]]; start = cur; }
    else if (s[0] === 'L') { ent('LINE', 'SNIJDEN', [[10, cur[0]], [20, cur[1]], [11, s[1]], [21, s[2]]]); cur = [s[1], s[2]]; }
    else if (s[0] === 'A') {
      const [, r, ccw, x, y] = s, dx = x - cur[0], dy = y - cur[1], l = Math.hypot(dx, dy), h = Math.sqrt(Math.max(0, r * r - (l / 2) ** 2));
      const n = ccw ? [-dy / l, dx / l] : [dy / l, -dx / l], c = [(cur[0] + x) / 2 + n[0] * h, (cur[1] + y) / 2 + n[1] * h];
      const a0 = (Math.atan2(cur[1] - c[1], cur[0] - c[0]) * 180) / Math.PI, a1 = (Math.atan2(y - c[1], x - c[0]) * 180) / Math.PI;
      ent('ARC', 'SNIJDEN', [[10, c[0]], [20, c[1]], [40, r], [50, ccw ? a0 : a1], [51, ccw ? a1 : a0]]);
      cur = [x, y];
    } else if (s[0] === 'Z' && (cur[0] !== start[0] || cur[1] !== start[1])) { ent('LINE', 'SNIJDEN', [[10, cur[0]], [20, cur[1]], [11, start[0]], [21, start[1]]]); cur = start; }
  }
  for (const h of v.gaten) ent('CIRCLE', 'GATEN', [[10, h.x], [20, h.y], [40, h.d / 2]]);
  const dikte = /plaat (\d+) mm/.exec(v.mat)?.[1] ?? 'x';
  const dxf = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES', ...e, '0', 'ENDSEC', '0', 'EOF'].join('\r\n') + '\r\n';
  writeFileSync(join(HERE, 'dxf', `${v.id}_${dikte}mm_${v.aantal}st.dxf`), dxf);
}
console.log('dxf:', readdirSync(join(HERE, 'dxf')).join(', '));
await browser.close();
