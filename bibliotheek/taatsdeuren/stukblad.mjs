// Bladen A3 met de stuklijst van een deur: blad "Stuklijst" met de samenstelling en positieballonnen (ISO 6433) en
// de stuklijst (ISO 7573), en bladen "Onderdelen" met een schets per positie: staven in hun echte vorm (verstek, schuin
// volgens de boog) met lengte en doorsnede, bogen met stralen, platen en panelen met gaten, ruiten met hun vorm.
// Werkt in Node (PDF) en in de browser.
import { vooraanzicht } from './teken.mjs';
import { STAAF } from './prijzen.mjs';
import { stuklijst } from './stuklijst.mjs';
import { W, H, T, L, g, tabel, titelblok, esc } from './blad.mjs';

const f = (v) => (Math.round(v * 100) / 100).toString();
const svg = (inhoud) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}mm" height="${H}mm" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/><rect x="20" y="10" width="${W - 30}" height="${H - 20}" fill="none" stroke="#111" stroke-width="0.7"/>${inhoud}</svg>`;
const pijl = (x, y, dx) => `<polygon points="${f(x)},${f(y)} ${f(x + dx * 2)},${f(y - 0.6)} ${f(x + dx * 2)},${f(y + 0.6)}" fill="#111"/>`;
/** maatlijn horizontaal van x1 tot x2 op hoogte y met de tekst erboven */
const maatH = (x1, x2, y, t) => [L(x1, y, x2, y, 0.18), pijl(x1, y, 1), pijl(x2, y, -1), T((x1 + x2) / 2, y - 0.8, t, 2.2, { anker: 'middle' })].join('');
const maatV = (y1, y2, x, t) => [L(x, y1, x, y2, 0.18), `<polygon points="${f(x)},${f(y1)} ${f(x - 0.6)},${f(y1 + 2)} ${f(x + 0.6)},${f(y1 + 2)}" fill="#111"/>`, `<polygon points="${f(x)},${f(y2)} ${f(x - 0.6)},${f(y2 - 2)} ${f(x + 0.6)},${f(y2 - 2)}" fill="#111"/>`, `<text x="${f(x - 0.8)}" y="${f((y1 + y2) / 2)}" font-size="2.2" text-anchor="middle" transform="rotate(-90 ${f(x - 0.8)} ${f((y1 + y2) / 2)})">${esc(t)}</text>`].join('');
const poly = (pts, vul = '#d7dadc', sw = 0.25) => `<polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}" fill="${vul}" stroke="#111" stroke-width="${sw}" stroke-linejoin="round"/>`;

/** een convexe veelhoek knippen op u0 <= u <= u1 */
function knipU(p, u0, u1) {
  const knip = (pts, keep, grens) => { const uit = []; pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length], ia = keep(a), ib = keep(b); if (ia) uit.push(a); if (ia !== ib) { const t = (grens - a[0]) / (b[0] - a[0]); uit.push([grens, a[1] + t * (b[1] - a[1])]); } }); return uit; };
  return knip(knip(p, (q) => q[0] >= u0 - 1e-9, u0), (q) => q[0] <= u1 + 1e-9, u1);
}
/** doorsnede van een staaf uit zijn naam (koker AxBxT, platstaal AxB, rond ØD) in een vak van ongeveer 16 mm */
function doorsnede(prof, x, y) {
  const n = STAAF[prof]?.naam ?? prof, el = [];
  let m;
  if ((m = n.match(/koker (\d+)x(\d+)x(\d+)/))) {
    const [a, b, t] = m.slice(1).map(Number), s = 15 / Math.max(a, b);
    el.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(a * s)}" height="${f(b * s)}" fill="#555" stroke="#111" stroke-width="0.2"/><rect x="${f(x + t * s)}" y="${f(y + t * s)}" width="${f((a - 2 * t) * s)}" height="${f((b - 2 * t) * s)}" fill="#fff" stroke="#111" stroke-width="0.15"/>`);
  } else if ((m = n.match(/platstaal (\d+)x(\d+)/))) {
    const [a, b] = m.slice(1).map(Number), s = Math.min(15 / a, 8 / b);
    el.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(a * s)}" height="${f(b * s)}" fill="#555" stroke="#111" stroke-width="0.2"/>`);
  } else if ((m = n.match(/rond Ø(\d+)/))) el.push(`<circle cx="${f(x + 7)}" cy="${f(y + 7)}" r="7" fill="#555" stroke="#111" stroke-width="0.2"/>`);
  else el.push(`<rect x="${f(x)}" y="${f(y)}" width="15" height="15" fill="#777" stroke="#111" stroke-width="0.2"/>`);
  el.push(T(x, y + 19.5, n.replace(/^Jansen Economy 50, /, 'Jansen '), 1.8));
  return el.join('');
}

/** schets van een staaf: de echte vorm; lange staven met een onderbreking (beide uiteinden ware vorm) */
function schetsStaaf(p, x, y, w) {
  const { pts, L: lengte, V } = p.vorm, el = [], dw = w - 24, hoogte = Math.min(20, V * 0.5 + 6);
  let s = Math.min(hoogte / V, dw / lengte);
  const yc = y + 4;
  if (lengte * s >= dw - 0.5 && lengte > 320) {
    // onderbroken: 150 mm aan elke kant
    const e = Math.max(V + 40, 90); s = Math.min(hoogte / V, (dw - 8) / (2 * e));
    const links = knipU(pts, 0, e).map(([u, v]) => [x + u * s, yc + v * s]), rechts = knipU(pts, lengte - e, lengte).map(([u, v]) => [x + (u - (lengte - 2 * e)) * s + 8, yc + v * s]);
    el.push(poly(links), poly(rechts));
    const zz = (xx) => `<polyline points="${f(xx)},${f(yc - 1.5)} ${f(xx + 1)},${f(yc + (V * s) * 0.35)} ${f(xx - 1)},${f(yc + (V * s) * 0.65)} ${f(xx)},${f(yc + V * s + 1.5)}" fill="none" stroke="#111" stroke-width="0.2"/>`;
    el.push(zz(x + e * s), zz(x + e * s + 8));
    el.push(maatH(x, x + 2 * e * s + 8, yc + V * s + 5, `${Math.round(lengte)}`));
    // gaten (greep): op hun afstand vanaf het dichtste uiteinde
    for (const u of p.vorm.gaten ?? []) { const xx = u < lengte / 2 ? x + u * s : x + (u - (lengte - 2 * e)) * s + 8; el.push(`<circle cx="${f(xx)}" cy="${f(yc + V * s / 2)}" r="1.2" fill="#fff" stroke="#111" stroke-width="0.2"/>`, T(xx, yc - 1.2, 'M8', 1.8, { anker: 'middle' })); }
    if (p.vorm.gaten) el.push(maatH(x, x + 80 * s, yc + V * s + 9.5, '80'));
  } else {
    el.push(poly(pts.map(([u, v]) => [x + u * s, yc + v * s])));
    el.push(maatH(x, x + lengte * s, yc + V * s + 5, `${Math.round(lengte)}`));
  }
  // hoek van de uiteinden bij de tekening
  const hk = /verstek|schuin/.test(p.opm) ? p.opm.split(';')[0].split(' · ') : [];
  if (hk[0] && hk[0] !== 'recht') el.push(T(x, yc - 1, hk[0], 1.8));
  if (hk[1] && hk[1] !== 'recht') el.push(T(x + dw - 1, yc - 1, hk[1].replace(' (volgens de boog)', ''), 1.8, { anker: 'end' }));
  el.push(doorsnede(p.prof, x + dw + 5, y));
  return el.join('');
}
/** schets van een boog (ringsector, symmetrisch rond de verticale as) met de stralen */
function schetsBoog(p, x, y, w, h) {
  const { r, zicht, hoek } = p.vorm, R1 = r + zicht / 2, R0 = r - zicht / 2, a = (Math.min(hoek, 359) * Math.PI) / 360;
  const bw = hoek >= 180 ? 2 * R1 : 2 * R1 * Math.sin(a), bh = R1 - Math.min(R0 * Math.cos(a), R1 * Math.cos(a));
  const s = Math.min((w - 6) / bw, (h - 8) / bh), cx = x + w / 2, cy = y + 2 + R1 * s;
  const P = (rr, t) => [cx + rr * s * Math.sin(t), cy - rr * s * Math.cos(t)];
  const [a1, a2, b1, b2] = [P(R1, -a), P(R1, a), P(R0, a), P(R0, -a)], groot = hoek > 180 ? 1 : 0;
  const el = [`<path d="M${f(a1[0])},${f(a1[1])} A${f(R1 * s)},${f(R1 * s)} 0 ${groot} 1 ${f(a2[0])},${f(a2[1])} L${f(b1[0])},${f(b1[1])} A${f(R0 * s)},${f(R0 * s)} 0 ${groot} 0 ${f(b2[0])},${f(b2[1])} Z" fill="#d7dadc" stroke="#111" stroke-width="0.25"/>`];
  // middelpunt, straal op de hartlijn
  const m = P(r, 0.35);
  el.push(`<line x1="${f(cx - 1.5)}" y1="${f(cy)}" x2="${f(cx + 1.5)}" y2="${f(cy)}" stroke="#111" stroke-width="0.15"/><line x1="${f(cx)}" y1="${f(cy - 1.5)}" x2="${f(cx)}" y2="${f(cy + 1.5)}" stroke="#111" stroke-width="0.15"/>`);
  if (cy < y + h + 10) el.push(`<line x1="${f(cx)}" y1="${f(cy)}" x2="${f(m[0])}" y2="${f(m[1])}" stroke="#111" stroke-width="0.15" stroke-dasharray="2 0.8"/>`);
  el.push(T(x + 1, y + h - 1, `R hart ${g(r, 1)} · binnen ${g(R0, 1)} · buiten ${g(R1, 1)} · ${g(hoek, 1)}° · koorde ${Math.round(2 * R1 * Math.sin(Math.min(a, Math.PI / 2)))}`, 1.8));
  return el.join('');
}
/** schets van een plaat of paneel (l horizontaal, b verticaal) met gaten */
function schetsPlaat(p, x, y, w, h) {
  const { b, l, gaten = [] } = p.vorm, s = Math.min((w - 16) / l, (h - 10) / b), el = [];
  el.push(`<rect x="${f(x + 8)}" y="${f(y + 2)}" width="${f(l * s)}" height="${f(b * s)}" fill="#d7dadc" stroke="#111" stroke-width="0.25"/>`);
  for (const [gx, gy, d] of gaten) el.push(`<circle cx="${f(x + 8 + gx * s)}" cy="${f(y + 2 + gy * s)}" r="${f(Math.max(0.5, (d / 2) * s))}" fill="#fff" stroke="#111" stroke-width="0.2"/>`, T(x + 8 + gx * s, y + 1.2, `Ø${g(d, 1)}`, 1.8, { anker: 'middle' }));
  el.push(maatH(x + 8, x + 8 + l * s, y + 2 + b * s + 4.5, `${l}`), maatV(y + 2, y + 2 + b * s, x + 5, `${b}`));
  if (gaten.length) el.push(maatH(x + 8, x + 8 + gaten[0][0] * s, y + 2 + b * s + 8.5, `${gaten[0][0]}`));
  return el.join('');
}
/** schets van een ruit: de vorm van het daglicht en de glasmaat */
function schetsGlas(p, x, y, w, h) {
  const { pts, b, hh = p.vorm.h } = p.vorm, s = Math.min((w - 14) / b, (h - 8) / hh), el = [];
  el.push(poly(pts.map(([u, v]) => [x + 8 + u * s, y + 2 + (hh - v) * s]), '#d6e4e9', 0.25));
  const [gb, gh] = p.maat.split(' x ');
  el.push(maatH(x + 8, x + 8 + b * s, y + 2 + hh * s + 4.5, gb), maatV(y + 2, y + 2 + hh * s, x + 5, gh));
  return el.join('');
}

/** één kaart met een positie: kop, schets, opmerking */
function kaart(p, x, y, w, h) {
  const el = [`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="none" stroke="#111" stroke-width="0.3"/>`];
  el.push(`<circle cx="${f(x + 6)}" cy="${f(y + 6)}" r="4" fill="#fff" stroke="#111" stroke-width="0.35"/>`, T(x + 6, y + 7.2, String(p.pos), 3.2, { anker: 'middle', vet: true }));
  el.push(T(x + 12, y + 5, `${p.n} x ${p.naam}`, 2.6, { vet: true }), T(x + 12, y + 9, `${p.mat} · ${p.maat}`, 2));
  const zx = x + 4, zy = y + 15, zw = w - 8, zh = h - 26;
  if (p.soort === 'staaf') el.push(schetsStaaf(p, zx, zy + zh / 2 - 10, zw));
  else if (p.vorm?.r) el.push(schetsBoog(p, zx, zy, zw, zh));
  else if (p.soort === 'glas') el.push(schetsGlas(p, zx, zy, zw, zh));
  else if (p.vorm?.l) el.push(schetsPlaat(p, zx, zy, zw, zh));
  // opmerking, desnoods op 2 regels
  const opm = p.opm, n = Math.floor(w / 1.05);
  const r1 = opm.length > n ? opm.slice(0, opm.lastIndexOf(' ', n)) : opm, r2 = opm.length > n ? opm.slice(r1.length + 1) : '';
  el.push(T(x + 2, y + h - 6, r1, 1.9, { kleur: '#333' }));
  if (r2) el.push(T(x + 2, y + h - 2.6, r2.length > n ? `${r2.slice(0, n - 1)}…` : r2, 1.9, { kleur: '#333' }));
  el.push(T(x + w - 2, y + 5, `${g(p.kg, 2)} kg/st`, 1.9, { anker: 'end', kleur: '#555' }));
  return el.join('');
}

/** de bladen: [stuklijst, onderdelen 1, onderdelen 2, ...] als SVG; meta: { nr, datum, bladStart, bladTotaal } */
export function stukBladen(o, keuzes = {}, meta = {}) {
  const { posities } = stuklijst(o, keuzes), bladen = [];
  const kaarten = posities.filter((p) => p.soort !== 'inkoop'), perBlad = 14, nKaart = Math.ceil(kaarten.length / perBlad);
  const max = Math.floor((250 - 24) / 3.9) - 1, vervolg = posities.length > max ? 1 : 0;
  const start = meta.bladStart ?? 1, totaal = meta.bladTotaal ?? start + vervolg + nKaart, blad = (i) => `${start + i} / ${totaal}`;
  // ---- blad 1: samenstelling met ballonnen en de stuklijst
  const el = [];
  const KB = o.kozijn.B, KH = o.kozijn.H, s = Math.min(130 / KB, 228 / KH), ox = 40 + (130 - KB * s) / 2, oy = 252;
  el.push(T(26, 17, 'Samenstelling (vooraanzicht van de kant met de greep)', 3, { vet: true }));
  el.push(vooraanzicht(o, s, ox, oy, { maten: false, assen: true }));
  // ballonnen links en rechts van de deur, met een lijn naar het stuk (ISO 6433)
  const X = (x) => ox + x * s, Y = (y) => oy - y * s, midX = ox + (KB * s) / 2;
  const kant = { l: [], r: [] };
  // per positie de plaats aan de kant met de minste ballonnen (een stuk zit vaak links en rechts)
  for (const p of posities) {
    if (!p.plaatsen?.length) continue;
    const opties = p.plaatsen.map(([x, y]) => ({ px: X(x), py: Y(y) })), l = opties.filter((q) => q.px < midX), r = opties.filter((q) => q.px >= midX);
    const k = !r.length ? 'l' : !l.length ? 'r' : kant.l.length <= kant.r.length ? 'l' : 'r', q = (k === 'l' ? l : r).sort((a, b) => (k === 'l' ? a.px - b.px : b.px - a.px))[0];
    kant[k].push({ p, ...q });
  }
  for (const [k, lijst] of Object.entries(kant)) {
    lijst.sort((a, b) => a.py - b.py);
    let yy = 24;
    const stap = Math.min(7, (oy - 24) / Math.max(1, lijst.length));
    for (const b of lijst) { b.by = Math.max(yy, Math.min(oy, b.py)); yy = b.by + stap; }
    // van onder terug naar boven schuiven als ze onder de vloer zouden vallen
    for (let i = lijst.length - 1, onder = oy + 2; i >= 0; i--) { lijst[i].by = Math.min(lijst[i].by, onder); onder = lijst[i].by - stap; }
    const bx = k === 'l' ? ox - 12 : ox + KB * s + 12;
    for (const b of lijst) el.push(`<circle cx="${f(b.px)}" cy="${f(b.py)}" r="0.6" fill="#111"/>`, L(b.px, b.py, bx + (k === 'l' ? 3 : -3), b.by, 0.15), `<circle cx="${f(bx)}" cy="${f(b.by)}" r="3" fill="#fff" stroke="#111" stroke-width="0.3"/>`, T(bx, b.by + 1, String(b.p.pos), 2.6, { anker: 'middle', vet: true }));
  }
  // de stuklijst rechts
  const kol = [['Pos', 9, 1], ['n', 9, 1], ['Benaming', 60], ['Materiaal, profiel', 54], ['Maat', 30], ['Zagen', 18], ['kg/st', 13, 1], ['kg', 14, 1]];
  const rijen = posities.map((p) => [p.pos, p.n, p.naam, p.mat, p.maat, p.zagen ?? '', p.kg ? g(p.kg, 2) : '', p.kg ? g(p.kg * p.n, 1) : '']);
  const totKg = posities.reduce((t, p) => t + p.kg * p.n, 0);
  const deel1 = rijen.slice(0, max);
  const [tt] = tabel(203, 20, kol, [...deel1, ...(rijen.length <= max ? [['', '', 'Totaal staal en glas', '', '', '', '', g(totKg, 1)]] : [])], 3.9, 2.0);
  el.push(T(203, 17, 'Stuklijst (ISO 7573) · Zagen: hoek van beide uiteinden tegen de as (90° = recht, 45° = verstek)', 3, { vet: true }), tt);
  el.push(titelblok(o, { ...meta, titel: `Stuklijst ${o.stijl.naam} · opening ${o.B} x ${o.H}`, schaal: `1:${Math.round(1 / s)} (A3)`, blad: blad(0) }));
  bladen.push(svg(el.join('\n')));
  if (vervolg) {
    const [t2] = tabel(26, 20, kol, [...rijen.slice(max), ['', '', 'Totaal staal en glas', '', '', '', '', g(totKg, 1)]], 3.9, 2.0);
    bladen.push(svg([T(26, 17, 'Stuklijst (vervolg)', 3, { vet: true }), t2, titelblok(o, { ...meta, titel: `Stuklijst ${o.stijl.naam} (vervolg)`, schaal: '', blad: blad(1) })].join('')));
  }
  // ---- onderdelen: 4 x 3 kaarten per blad
  for (let i = 0; i < nKaart; i++) {
    const e = [T(26, 17, `Onderdelen (schetsen, niet op schaal; maten in mm)${i ? ` (vervolg ${i + 1})` : ''}`, 3, { vet: true })];
    // 4 rijen van 4 kaarten; rechtsonder 2 plaatsen vrij voor het titelblok
    const cw = 96, ch = 56, x0 = 21.5, y0 = 21, plek = [...Array(14)].map((_, j) => [j % 4, Math.floor(j / 4)]);
    const deze = kaarten.slice(i * perBlad, (i + 1) * perBlad);
    deze.forEach((p, j) => { const [c, r] = plek[j]; e.push(kaart(p, x0 + c * (cw + 1.5), y0 + r * (ch + 1.5), cw, ch)); });
    e.push(titelblok(o, { ...meta, titel: `Onderdelen ${o.stijl.naam} · opening ${o.B} x ${o.H}`, schaal: 'schetsen', blad: blad(1 + vervolg + i) }));
    bladen.push(svg(e.join('\n')));
  }
  return { bladen, posities };
}
