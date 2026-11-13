// De tekeningen van een balustrade (SVG, mm): overzicht A3 (uitgeslagen vooraanzicht, bovenaanzicht en doorsnede met
// maten), stuklijst A3 (ISO 7573), een A4 per stuk (staaf met zaagsnede en gaten, plaat met ankergaten, glas), lasdetails
// (ISO 2553), boringen (ISO 15786), bestellijst met zaagplan, plaatsingsblad en het berekeningsblad. Eerste hoek
// (ISO 5456-2), ISO 128 lijnen, ISO 129 maten, ISO 2768-m. Node en browser.
import { PROFIEL, KOOP, ANKER, GLASOPBOUW, PATROON, SOORTEN } from './onderdelen.mjs';
import { lengtes, hoogtes } from './model.mjs';
import { stuklijst, zaagplan, ZAAGSNEDE, ROL, schuineKant } from './stuklijst.mjs';
import { berekening } from './bereken.mjs';
import { NORM } from './normen.mjs';
import { A3, A4L, svg, poly, lijn, tk, tabel, maat, titelblok, lasSymbool, eersteHoek, naamVan, maatTekst, g, f, esc } from './blad.mjs';

const SCHALEN = [1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200];
const schaalVoor = (s) => SCHALEN.find((n) => 1 / n <= s) ?? 200;
const KL = { staal: '#3b4046', glas: '#cfe3ea', plaat: '#8b9198', alu: '#c5ccd3', inox: '#b9bfc5', vloer: '#e9e6df' };
const rij = (t, max) => { const w = String(t).split(' '), uit = ['']; for (const x of w) { if ((uit.at(-1) + ' ' + x).length > max) uit.push(x); else uit[uit.length - 1] += (uit.at(-1) ? ' ' : '') + x; } return uit; };

// ---------------------------------------------------------------- projecties
/** uitgeslagen vooraanzicht: (u, z) met u = horizontale afstand langs de lijn */
function uitslag(o) {
  const U = []; let u = 0; for (const s of o.segs) { U.push(u); u += s.Lh; }
  const naar = (p, si) => { const s = o.segs[si]; return [U[si] + (p[0] - s.p0[0]) * s.d[0] + (p[1] - s.p0[1]) * s.d[1], p[2]]; };
  return { U, totaal: u, naar };
}
/** band rond een lijn in het vlak */
function band(a, b, w) { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, n = [(-dy / l) * (w / 2), (dx / l) * (w / 2)]; return [[a[0] + n[0], a[1] + n[1]], [b[0] + n[0], b[1] + n[1]], [b[0] - n[0], b[1] - n[1]], [a[0] - n[0], a[1] - n[1]]]; }
/** band van a naar b (model: u, z in mm) met breedte w, uiteinden op een schuin snijvlak (normaal in het model); papierpunten */
function bandSnij(o, d, a, b, w, P) {
  const s = o.segs[d.seg], du = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(du, dz) || 1, ax = [du / l, dz / l], pp = [-ax[1] * (w / 2), ax[0] * (w / 2)];
  const vlak = (n) => (n ? [n[0] * s.d[0] + n[1] * s.d[1], n[2]] : null), nA = vlak(d.snijA), nB = vlak(d.snijB);
  const op = (c, e, m) => { if (!m) return c; const mx = m[0] * ax[0] + m[1] * ax[1]; if (Math.abs(mx) < 0.05) return c; const lam = -(m[0] * (c[0] - e[0]) + m[1] * (c[1] - e[1])) / mx; return [c[0] + lam * ax[0], c[1] + lam * ax[1]]; };
  return [op([a[0] + pp[0], a[1] + pp[1]], a, nA), op([b[0] + pp[0], b[1] + pp[1]], b, nB), op([b[0] - pp[0], b[1] - pp[1]], b, nB), op([a[0] - pp[0], a[1] - pp[1]], a, nA)].map(P);
}
/** de afschuiningen in het vooraanzicht: het dak (streepstippellijn), het knieschot (gearceerd) en de maten */
function dakLijnen(o, X, Y, U, s, maten, h) {
  const el = [];
  for (const e of o.dak ?? []) {
    if (!e.nodig) continue;
    const sg = o.segs[e.seg], u0 = U[e.seg] + (e.kant === 'begin' ? 0 : sg.Lh), r = e.kant === 'begin' ? 1 : -1;
    const xm = Math.min(sg.Lh, Math.max(e.xs + 300, (o.k.H + 180 - e.muur) / e.tn)), zm = e.muur + xm * e.tn;
    el.push(lijn(X(u0), Y(e.muur), X(u0 + r * xm), Y(zm), 0.35, '#7a5a2e', '4 1.2 0.8 1.2'));
    // knieschot: dikke lijn met arcering aan de buitenkant
    el.push(lijn(X(u0), Y(0), X(u0), Y(e.muur), 0.5, '#555'));
    for (let z = 40; z < e.muur; z += 70) el.push(lijn(X(u0), Y(z), X(u0) - r * 1.6, Y(z - 40), 0.13, '#777'));
    const lx = X(u0 + r * xm * 0.55), lz = Y(e.muur + xm * 0.55 * e.tn) - 1.5;
    el.push(tk(lx, lz, `dak ${g(e.hoek, 0)}°`, h * 0.85, { kleur: '#7a5a2e', anker: 'middle', draai: -r * e.hoek }));
    if (maten) {
      el.push(maat([X(u0), Y(0)], [X(u0), Y(e.muur)], -r * 7, `${e.muur}`, h * 0.85));
      el.push(maat([X(u0), Y(o.k.H)], [X(u0 + r * e.xs), Y(o.k.H)], r * -13, `schuin ${Math.round(e.xs)}`, h * 0.85));
    }
  }
  return el.join('');
}
const breedte = (d) => (d.prof === 'koop' ? (d.koop === 'qrHandregel' ? 42.4 : d.koop === 'handregeldrager' ? 20 : 110) : PROFIEL[d.prof].b);

/** het vooraanzicht in een <g>: ox, oy = papierpunt van (u = 0, z = 0); s = schaal */
export function vooraanzicht(o, s, ox, oy, { maten = true, h = 2.4 } = {}) {
  const { naar, U, totaal } = uitslag(o), X = (u) => ox + u * s, Y = (z) => oy - z * s, P = ([u, z]) => [X(u), Y(z)], el = [];
  // vloer- en traplijn
  for (const sg of o.segs) { const a = P(naar(sg.punt(0), sg.i)), b = P(naar(sg.punt(sg.Lh), sg.i)); el.push(lijn(a[0], a[1], b[0], b[1], 0.5)); for (let t = 0; t < sg.Lh; t += 120) { const q = P(naar(sg.punt(t), sg.i)); el.push(lijn(q[0], q[1], q[0] - 1.2, q[1] + 1.6, 0.13)); } }
  if (o.k.vorm === 'trap') { const sg = o.segs[0], n = o.treden; for (let i = 0; i < n; i++) { const t0 = (sg.Lh * i) / n, t1 = (sg.Lh * (i + 1)) / n, z0 = (t0 * Math.tan(sg.alfa)), z1 = (t1 * Math.tan(sg.alfa)); el.push(`<polyline points="${f(X(U[0] + t0))},${f(Y(z0 - (z1 - z0)))} ${f(X(U[0] + t0))},${f(Y(z0))} ${f(X(U[0] + t1))},${f(Y(z0))}" fill="none" stroke="#777" stroke-width="0.18"/>`); } }
  // panelen (glas, plaat) eerst
  for (const p of o.panelen) el.push(poly(p.pts.map((q) => P(naar(q, p.seg))), p.rol === 'glas' ? KL.glas : p.patroon === 'vlak' || p.rol === 'plint' ? '#9aa0a6' : 'url(#perfo)', 0.15));
  // platen
  for (const p of o.platen) {
    const [u] = naar(p.p, p.seg), pw = p.rol === 'muurplaat' ? p.t : p.w;
    el.push(`<rect x="${f(X(u - pw / 2))}" y="${f(Y(p.z[1]))}" width="${f(pw * s)}" height="${f((p.z[1] - p.z[0]) * s)}" fill="${KL.staal}" stroke="#111" stroke-width="0.12"/>`);
  }
  // staven
  for (const d of o.delen) {
    const a = naar(d.a, d.seg), b = naar(d.b, d.seg), w = breedte(d);
    if (d.rol === 'afstandhouder') continue;
    const kleur = d.prof === 'koop' ? (d.rol === 'uprofiel' ? KL.alu : KL.inox) : PROFIEL[d.prof].koop ? KL.inox : KL.staal;
    el.push(poly(d.snijA || d.snijB ? bandSnij(o, d, a, b, w, P) : band(P(a), P(b), w * s), kleur, 0.12));
  }
  for (const kl of o.klemmen) { const [u, z] = naar(kl.p, kl.seg); el.push(`<rect x="${f(X(u + (kl.d[0] * o.segs[kl.seg].d[0] + kl.d[1] * o.segs[kl.seg].d[1] > 0 ? 0 : -40)))}" y="${f(Y(z + 25))}" width="${f(40 * s)}" height="${f(50 * s)}" fill="${KL.inox}" stroke="#111" stroke-width="0.12"/>`); }
  for (const an of o.ankers) { const [u, z] = naar(an.p, an.seg); if (!an.zij) el.push(lijn(X(u), Y(z), X(u), Y(z - 110), 0.18, '#b42318', '1 0.6')); }
  el.push(dakLijnen(o, X, Y, U, s, maten, h));
  if (maten) {
    const H = o.k.H, z0 = Math.min(0, ...o.delen.map((d) => Math.min(d.a[2], d.b[2])));
    o.segs.forEach((sg, i) => { const a = P(naar(sg.punt(0), i)), b = P(naar(sg.punt(sg.Lh), i)); el.push(maat([a[0], Y(z0) + 2], [b[0], Y(z0) + 2], 5, `${Math.round(sg.Lh)}${sg.alfa ? ` (horizontaal; ${o.treden} treden ${o.k.optrede}/${o.k.aantrede})` : ''}`, h)); });
    if (o.segs.length > 1) el.push(maat([X(0), Y(z0) + 2], [X(totaal), Y(z0) + 2], 14, `${Math.round(totaal)} uitgeslagen`, h));
    const sl = o.segs.at(-1), eB = o.dak?.find((e) => e.nodig && e.kant === 'eind'), top = naar(sl.punt(eB ? sl.Lh - eB.xkE : sl.Lh), sl.i);
    el.push(maat([X(top[0]), Y(top[1])], [X(top[0]), Y(top[1] + H)], 7, `H ${H}`, h));
    // staanderafstand van het eerste veld
    const s0 = o.segs[0];
    if (s0.posten?.length > 1) { let j = 0; for (let i = 1; i < s0.posten.length - 1; i++) if (s0.posten[i + 1] - s0.posten[i] > s0.posten[j + 1] - s0.posten[j] + 0.5) j = i; const a = naar(s0.punt(s0.posten[j]), 0), b = naar(s0.punt(s0.posten[j + 1]), 0); el.push(maat([X(a[0]), Y(a[1] + H)], [X(b[0]), Y(b[1] + H)], -5, `${Math.round((s0.posten[j + 1] - s0.posten[j]) / Math.cos(s0.alfa))} h.o.h.`, h)); }
  }
  return `<defs><pattern id="perfo" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="#9aa0a6"/><circle cx="1" cy="1" r="0.45" fill="#fff"/></pattern></defs>${el.join('')}`;
}

/** bovenaanzicht in een <g>: (ox, oy) = beginpunt, s = schaal */
export function bovenaanzicht(o, s, ox, oy, { maten = true, h = 2.2 } = {}) {
  const X = (p) => [ox + p[0] * s, oy - p[1] * s], el = [];
  // vloerplaat aan de loopkant (-N) en de val-kant (+N) gearceerd
  for (const sg of o.segs) {
    const a = sg.punt(0), b = sg.punt(sg.Lh), rand = o.k.bevestiging === 'zij' ? 0 : 100;
    const ra = [a[0] + sg.N[0] * rand, a[1] + sg.N[1] * rand], rb = [b[0] + sg.N[0] * rand, b[1] + sg.N[1] * rand];
    el.push(lijn(...X(ra), ...X(rb), 0.35, '#555'));
    for (let t = 0; t < sg.Lh; t += 150) { const p = [a[0] + sg.d[0] * t + sg.N[0] * rand, a[1] + sg.d[1] * t + sg.N[1] * rand], q = [p[0] + sg.N[0] * 120 + sg.d[0] * 60, p[1] + sg.N[1] * 120 + sg.d[1] * 60]; el.push(lijn(...X(p), ...X(q), 0.12, '#888')); }
  }
  // de lijn en de staanders
  for (const d of o.delen.filter((x) => x.rol === 'handregel' || x.rol === 'uprofiel')) { const w = d.rol === 'uprofiel' ? 100 : PROFIEL[d.prof]?.h ?? 42; el.push(poly(band(X(d.a), X(d.b), w * s), d.rol === 'uprofiel' ? KL.alu : '#666', 0.15)); }
  for (const p of o.panelen.filter((x) => x.rol === 'glas')) el.push(poly(band(X(p.pts[0]), X(p.pts[1]), p.dikte * s * 1.5), KL.glas, 0.12));
  for (const d of o.delen.filter((x) => x.rol === 'staander')) { const P = PROFIEL[d.prof], c = X(d.a); el.push(P.vorm === 'buis' ? `<circle cx="${f(c[0])}" cy="${f(c[1])}" r="${f((P.b / 2) * s)}" fill="${KL.inox}" stroke="#111" stroke-width="0.15"/>` : `<rect x="${f(c[0] - (P.b / 2) * s)}" y="${f(c[1] - (P.h / 2) * s)}" width="${f(P.b * s)}" height="${f(P.h * s)}" fill="${KL.staal}" transform="rotate(${f((-Math.atan2(o.segs[d.seg].d[1], o.segs[d.seg].d[0]) * 180) / Math.PI)} ${f(c[0])} ${f(c[1])})"/>`); }
  for (const an of o.ankers) { const c = X(an.p); el.push(`<circle cx="${f(c[0])}" cy="${f(c[1])}" r="0.5" fill="#b42318"/>`); }
  for (const e of (o.dak ?? []).filter((x) => x.nodig)) { const sg = o.segs[e.seg], t = e.kant === 'begin' ? 0 : sg.Lh, r = e.kant === 'begin' ? -1 : 1, p = sg.punt(t), a = X([p[0] + sg.N[0] * 600, p[1] + sg.N[1] * 600]), b = X([p[0] - sg.N[0] * 900, p[1] - sg.N[1] * 900]), q = X([p[0] + sg.d[0] * r * 60, p[1] + sg.d[1] * r * 60]); el.push(lijn(a[0], a[1], b[0], b[1], 0.7, '#555'), tk(q[0] + (q[0] - X(p)[0]) * 0.2, q[1] - 2, 'knieschot', h * 0.8, { kleur: '#555', anker: r < 0 ? 'end' : 'start' })); }
  if (maten) {
    o.segs.forEach((sg) => { const a = X(sg.punt(0)), b = X(sg.punt(sg.Lh)); el.push(maat(a, b, 7, `${Math.round(sg.Lh)}`, h)); });
    o.segs.forEach((sg, i) => { if (i && sg.draai) { const c = X(sg.p0); el.push(tk(c[0] + 3, c[1] - 3, `${o.k.hoek}°`, h, { vet: true })); } });
    const sg = o.segs[0], v = X([sg.p0[0] + sg.N[0] * 400 + sg.d[0] * Math.min(800, sg.Lh / 2), sg.p0[1] + sg.N[1] * 400 + sg.d[1] * Math.min(800, sg.Lh / 2)]);
    el.push(tk(v[0], v[1], o.k.vorm === 'trap' ? 'trapgat' : o.k.plaats === 'buiten' ? 'val-kant' : 'vide', h, { kleur: '#555' }));
  }
  return el.join('');
}

/** doorsnede door een staander (of het U-profiel): vloer, bevestiging, staander, handregel, vulling; schaal s */
export function doorsnede(o, s, ox, oy, h = 2.1) {
  const k = o.k, el = [], X = (n) => ox + n * s, Y = (z) => oy - z * s, zij = k.bevestiging === 'zij', hh = hoogtes(k), vd = k.vloerdikte;
  const rect = (n0, n1, z0, z1, vul, sw = 0.15) => el.push(`<rect x="${f(X(Math.min(n0, n1)))}" y="${f(Y(Math.max(z0, z1)))}" width="${f(Math.abs(n1 - n0) * s)}" height="${f(Math.abs(z1 - z0) * s)}" fill="${vul}" stroke="#111" stroke-width="${sw}"/>`);
  // vloer (beton, arcering) rechts van de rand; val-kant links (n < rand)
  const rand = zij ? 0 : 100;
  rect(rand, -260, 0, -vd, '#e3e0d8', 0.3);
  el.push(`<rect x="${f(X(-260))}" y="${f(Y(0))}" width="${f((260 + rand) * s)}" height="${f(vd * s)}" fill="url(#beton)"/>`);
  if (k.soort === 'glasU') {
    const G = GLASOPBOUW[o.glas.opbouw], off = zij ? 45 : 0, gz0 = hh.glasOnder;
    if (zij) rect(0, 90, -170, 30, KL.alu); else rect(-50, 50, 0, 110, KL.alu);
    rect(off - G.dikte / 2 + (zij ? 40 : 0), off + G.dikte / 2 + (zij ? 40 : 0), gz0, hh.glasBoven, KL.glas, 0.12);
    if (k.hr === 'rond') el.push(`<circle cx="${f(X(off + (zij ? 40 : 0)))}" cy="${f(Y(k.H - 21))}" r="${f(21.2 * s)}" fill="${KL.inox}" stroke="#111" stroke-width="0.15"/>`);
    el.push(lijn(X(0), Y(-90), X(0), Y(0), 0.25, '#b42318', '1 0.6'));
    el.push(tk(X(70), Y(55), `Q-railing Easy Glass Smart (${zij ? 'zij' : 'top'}), glas ${o.glas.opbouw}`, h), tk(X(70), Y(-60), `${ANKER[o.ankerType].naam} om de ${o.ankerAfstand} mm`, h));
  } else {
    const P = PROFIEL[o.staander.prof], vp = o.staander.voet, n0 = zij ? 40 : -P.h / 2, n1 = n0 + P.h;
    if (zij) { rect(0, 10, -250, -20, KL.staal); rect(10, 40, -110, -70, KL.staal); rect(10, 40, -180, -140, KL.staal); for (const z of [-60, -190]) el.push(lijn(X(14), Y(z), X(-ANKER[o.ankerType].diep), Y(z), 0.35, '#b42318')); }
    else { rect(-vp.l / 2, vp.l / 2, 0, vp.t, KL.staal); for (const n of [-(vp.l / 2 - 25), vp.l / 2 - 25]) el.push(lijn(X(n), Y(vp.t + 12), X(n), Y(-ANKER[o.ankerType].diep), 0.35, '#b42318')); }
    rect(n0, n1, zij ? -250 : vp.t, hh.staanderTop, KL.staal);
    const nm = (n0 + n1) / 2;
    if (k.hr === 'plat') rect(nm - 25, nm + 25, k.H - 8, k.H, KL.staal); else if (k.soort === 'glasstaal') { rect(nm - 8, nm + 8, hh.staanderTop, hh.staanderTop + 50, KL.inox); el.push(`<circle cx="${f(X(nm))}" cy="${f(Y(k.H - 21.2))}" r="${f(21.2 * s)}" fill="${KL.inox}" stroke="#111" stroke-width="0.15"/>`); } else el.push(`<circle cx="${f(X(nm))}" cy="${f(Y(k.H - 21.2))}" r="${f(21.2 * s)}" fill="${KL.staal}" stroke="#111" stroke-width="0.15"/>`);
    if (k.soort === 'glasstaal') { const G = GLASOPBOUW[o.glas.opbouw]; rect(nm - G.dikte / 2, nm + G.dikte / 2, hh.glasOnder, hh.glasBoven, KL.glas, 0.1); }
    else if (hh.onderregel) { rect(nm - 20, nm + 20, hh.onderregel[0], hh.onderregel[1], '#fff', 0.2); if (hh.bovenregel) rect(nm - 20, nm + 20, ...hh.bovenregel, '#fff', 0.2); }
    el.push(tk(X(Math.max(n1, 80) + 25), Y(k.H - 10), k.hr === 'plat' ? 'handregel plat 50x8' : k.soort === 'glasstaal' ? 'handregel inox Ø42,4 op drager' : 'handregel buis Ø42,4x2,6', h));
    el.push(tk(X(Math.max(n1, 80) + 25), Y(k.H / 2), `staander ${P.naam}`, h));
    el.push(tk(X(Math.max(n1, 80) + 25), Y(zij ? -120 : 30), zij ? `console ${vp.b} x 230 x ${vp.t} + 2 afstandhouders` : `voetplaat ${vp.b} x ${vp.l} x ${vp.t}`, h));
    el.push(tk(X(Math.max(n1, 80) + 25), Y(zij ? -200 : -60), `${ANKER[o.ankerType].naam}${o.k.plaats === 'buiten' ? ' A4' : ''}`, h));
  }
  // maten: H vanaf de vloer, openingen
  el.push(maat([X(-230), Y(0)], [X(-230), Y(k.H)], 6, `H ${k.H}`, h));
  el.push(`<defs><pattern id="beton" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 4 L4 0" stroke="#999" stroke-width="0.2"/><circle cx="1" cy="1" r="0.3" fill="#888"/></pattern></defs>`);
  el.push(tk(X(-260), Y(-vd) + 4, `vloer ${vd} mm`, h * 0.9, { kleur: '#555' }), tk(X(rand + 60), Y(-vd) + 4, 'val-kant', h * 0.9, { kleur: '#555' }));
  return el.join('');
}

// ---------------------------------------------------------------- blad 1: overzicht A3
export function overzichtBlad(o, meta = {}) {
  const [W, H] = A3, el = [], { totaal } = uitslag(o), zMax = Math.max(o.dakKnikken ? o.k.H + 260 : 0, ...o.delen.map((d) => Math.max(d.a[2], d.b[2]))) + 60, zMin = Math.min(0, ...o.delen.map((d) => Math.min(d.a[2], d.b[2]))) - 40;
  const sch = schaalVoor(Math.min(360 / totaal, 108 / (zMax - zMin))), s = 1 / sch;
  el.push(tk(26, 18, `Vooraanzicht, uitgeslagen (schaal 1:${sch}), gezien van de loopkant`, 3, { vet: true }));
  el.push(vooraanzicht(o, s, 36, 30 + zMax * s));
  // bovenaanzicht linksonder
  const pts = o.segs.flatMap((sg) => [sg.punt(0), sg.punt(sg.Lh)]), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const bw = Math.max(...xs) - Math.min(...xs) + 1200, bh = Math.max(...ys) - Math.min(...ys) + 1200, sch2 = schaalVoor(Math.min(175 / bw, 88 / bh)), s2 = 1 / sch2;
  const y0 = 152;
  el.push(tk(26, y0, `Bovenaanzicht (schaal 1:${sch2})`, 3, { vet: true }));
  el.push(bovenaanzicht(o, s2, 36 + (600 - Math.min(...xs)) * s2, y0 + 8 + (Math.max(...ys) + 600) * s2));
  // doorsnede in het midden
  const sch3 = schaalVoor(Math.min(70 / 700, 86 / (o.k.H + 300))), s3 = 1 / sch3;
  el.push(tk(206, y0, `Doorsnede A-A (1:${sch3})`, 3, { vet: true }));
  el.push(doorsnede(o, s3, 206 + 270 * s3, y0 + 8 + (o.k.H + 40) * s3, 1.9));
  // gegevens rechts
  const B = berekening(o), op = o.openingen.filter((x) => !x.klim).map((x) => `${g(x.mm, 0)}`).join(' / ');
  const gegevens = [['Soort', naamVan(o)], ['Plaats', `${o.k.plaats}${o.k.vorm === 'trap' ? ', trap' : ''}, cat. ${o.k.cat}`], ['Bevestiging', o.k.bevestiging === 'zij' ? 'zijmontage (vloerrand)' : 'bovenop de vloer'], ['Staander', o.staander ? `${PROFIEL[o.staander.prof].naam}, ${Math.round(o.afstand)} h.o.h.` : `U-profiel, anker / ${o.ankerAfstand}`], ['Hoogte', `${o.k.H} (norm ≥ ${o.vereist})`], ['Openingen mm', op.slice(0, 40)], ['Berekening', B.oordeel === 'groen' ? 'groen: voldoet' : B.oordeel === 'oranje' ? 'oranje: nakijken' : 'rood: voldoet niet'], ['Afwerking', o.k.plaats === 'buiten' ? 'verzinkt + poedercoat' : o.st?.staander === 'inox' ? 'inox geslepen' : 'poedercoat'], ...(o.dakKnikken ? [['Onder het dak', o.dak.filter((e) => e.nodig).map((e) => `${e.kant === 'begin' ? 'begin' : 'einde'} ${g(e.hoek, 0)}°, muur ${e.muur}, schuin ${Math.round(e.xs)}`).join('; ').slice(0, 52)]] : [])];
  const [tt] = tabel(296, y0 - 2, [['Gegevens', 30], ['', 84]], gegevens, 4.3, 2.0);
  el.push(tt);
  el.push(titelblok(o, A3, { ...meta, titel: `Overzicht balustrade ${naamVan(o)}`, schaal: `1:${sch} / 1:${sch2} / 1:${sch3}` }));
  return svg(A3, el.join(''));
}

// ---------------------------------------------------------------- blad 2: stuklijst A3 (ISO 7573)
export function stuklijstBlad(o, meta = {}) {
  const sl = stuklijst(o), el = [];
  el.push(tk(26, 18, 'Stuklijst (ISO 7573): gemaakte stukken', 3, { vet: true }));
  const rijen = sl.posities.map((p) => [p.pos, p.n, p.naam, p.mat, p.maat, p.soort === 'staaf' || p.soort === 'koopstaaf' ? Math.round(p.L) : '', p.soort === 'staaf' || p.soort === 'koopstaaf' ? p.zaagT : p.soort === 'glas' ? 'glas' : 'laser', g(p.kg * p.n, 1), (p.opm ?? '').slice(0, 44)]);
  const [t1, h1] = tabel(26, 21, [['Pos', 10, 1], ['Aantal', 13, 1], ['Benaming', 52], ['Materiaal', 30], ['Afmeting', 58], ['L mm', 16, 1], ['Zaagsnede', 50], ['kg', 15, 1], ['Opmerking', 140]], rijen.slice(0, 26), 4.3, 2.05);
  el.push(t1);
  const y = 21 + h1 + 8;
  el.push(tk(26, y, 'Kooponderdelen', 3, { vet: true }));
  const [t2] = tabel(26, y + 3, [['Artikel', 48], ['Benaming', 190], ['Aantal', 18, 1], ['Eenheid', 26], ['Winkel', 40], ['€', 22, 1]], sl.koop.slice(0, Math.max(3, Math.floor((297 - 46 - y) / 4.3) - 1)).map((x) => [x.artikel, x.naam.slice(0, 110), x.n, x.eenheid, x.winkel, g(x.bedrag, 0)]), 4.3, 2.05);
  el.push(t2);
  el.push(titelblok(o, A3, { ...meta, titel: 'Stuklijst', schaal: '-' }));
  return svg(A3, el.join(''));
}

// ---------------------------------------------------------------- A4 per stuk
const kader4 = (o, meta, inhoud) => svg(A4L, inhoud + titelblok(o, A4L, meta));
/** tekening van één positie (A4 liggend) */
export function stukBlad(o, p, meta = {}) {
  const el = [], [W] = A4L;
  el.push(`<circle cx="31" cy="20" r="5" fill="#fff" stroke="#111" stroke-width="0.4"/>`, tk(31, 21.4, String(p.pos), 4, { anker: 'middle', vet: true }));
  el.push(tk(39, 18.5, `${p.naam}`, 4, { vet: true }), tk(39, 23.5, `${p.n} stuks · ${p.mat} · ${p.maat}${p.L ? ` · L ${Math.round(p.L)} mm` : ''}`, 2.6, { kleur: '#333' }));
  if (p.soort === 'staaf' || p.soort === 'koopstaaf') el.push(staafTekening(o, p));
  else if (p.soort === 'laser') el.push(plaatTekening(o, p));
  else el.push(glasTekening(o, p));
  // gegevens
  const info = [['Positie', p.pos], ['Aantal', p.n], ['Materiaal', p.mat], ['Maat', p.maat], ...(p.L ? [['Lengte (lange kant)', `${Math.round(p.L)} mm`], ['Lengte op het hart', `${Math.round(p.hart)} mm`], ['Zaagsnede', p.zaagT]] : []), ...(p.dak ? [['Onder het dak', p.dak.horizontaal ? `helling ${g(p.dak.hoek, 1)}°, horizontaal ${p.dak.horizontaal} mm` : p.dak.tegen ? `tegen de handregel op ${g(p.dak.hoek, 1)}°` : `bovenaan schuin ${g(p.dak.hoek, 1)}°`]] : []), ...(p.paneel?.uv ? (() => { const sk = schuineKant(p.paneel); return [['Hoogte links / rechts', `${Math.round(sk.links)} / ${Math.round(sk.rechts)} mm`], ...(sk.schuin ? [['Schuine zijde', `${Math.round(sk.schuin.l)} mm op ${g(sk.schuin.hoek, 1)}°`]] : [])]; })() : []), ['Massa', `${g(p.kg, 2)} kg/st`], ['Toleranties', 'ISO 2768-m; zaaglengte ± 1 mm']];
  const [tt] = tabel(W - 10 - 125, 120, [['Gegevens', 42], ['', 83]], info.map(([a, b]) => [a, String(b).slice(0, 52)]), 4.1, 2.05);
  el.push(tt);
  return kader4(o, { ...meta, titel: `Pos. ${p.pos}: ${p.naam}`, schaal: meta.schaal ?? '' }, el.join(''));
}
function staafTekening(o, p) {
  const el = [], d = p.voorbeeld, P = PROFIEL[p.prof] ?? { b: d.koop === 'qrHandregel' ? 42.4 : 100, h: d.koop === 'qrHandregel' ? 42.4 : 110, t: 2, vorm: d.koop === 'qrHandregel' ? 'buis' : 'koker' };
  const L = p.L, sch = schaalVoor(Math.min(190 / L, 1)), s = 1 / sch, x0 = 32, yM = 62, hb = Math.max(P.b * s, 2.5);
  const [za, zb] = d.zaag ?? [0, 0], [zia, zib] = d.zin ?? [1, 1];
  const e = (fg, zin) => zin * (hb / 2) * Math.tan((fg * Math.PI) / 180) * (P.b * s >= 2.5 ? 1 : (P.b * s) / hb);
  const ea = e(za, zia), eb = e(zb, zib), len = L * s;
  // vooraanzicht: de staaf liggend, links het begin
  // vereenvoudigd: lange kant boven of onder volgens de zin
  const A = Math.abs(ea), Bv = Math.abs(eb);
  const boven = [x0 + (ea < 0 ? 0 : A), x0 + len - (eb < 0 ? 0 : Bv)], onder = [x0 + (ea < 0 ? A : 0), x0 + len - (eb < 0 ? Bv : 0)];
  el.push(poly([[boven[0], yM - hb / 2], [boven[1], yM - hb / 2], [onder[1], yM + hb / 2], [onder[0], yM + hb / 2]], P.koop || d.prof === 'koop' ? '#dde1e4' : '#c9ced3', 0.35));
  if (P.vorm === 'koker' || P.vorm === 'buis') el.push(lijn(x0 + 2, yM - hb / 2 + (P.t ?? 2) * s, x0 + len - 2, yM - hb / 2 + (P.t ?? 2) * s, 0.13, '#111', '1.5 0.8'), lijn(x0 + 2, yM + hb / 2 - (P.t ?? 2) * s, x0 + len - 2, yM + hb / 2 - (P.t ?? 2) * s, 0.13, '#111', '1.5 0.8'));
  el.push(lijn(x0 - 3, yM, x0 + len + 3, yM, 0.13, '#111', '4 0.8 0.6 0.8'));
  el.push(maat([Math.min(boven[0], onder[0]), yM - hb / 2], [Math.max(boven[1], onder[1]), yM - hb / 2], -8, `${Math.round(L)}`, 2.6));
  if (Math.abs(Math.round(p.hart) - Math.round(L)) >= 1) el.push(tk(x0 + len / 2, yM + hb / 2 + 5, `lengte op het hart ${Math.round(p.hart)}`, 2.2, { anker: 'middle', kleur: '#333' }));
  if (za > 0.05) el.push(tk(x0 - 1, yM + hb / 2 + 6, `${g(za, 1)}°`, 2.6, { vet: true }));
  if (zb > 0.05) el.push(tk(x0 + len - 4, yM + hb / 2 + 6, `${g(zb, 1)}°`, 2.6, { vet: true }));
  // gaten (blindklinkmoer M8) vanaf de onderkant (begin)
  const gaten = [...new Set((p.gaten ?? []).map((x) => x.z))].sort((a, b) => a - b);
  for (const z of gaten) { const x = x0 + z * s; el.push(`<circle cx="${f(x)}" cy="${f(yM)}" r="${f(Math.max(0.6, 5.5 * s))}" fill="#fff" stroke="#111" stroke-width="0.25"/>`, lijn(x, yM - hb / 2 - 2, x, yM + hb / 2 + 2, 0.13, '#111', '3 0.6 0.5 0.6')); }
  gaten.forEach((z, i) => el.push(maat([x0, yM + hb / 2], [x0 + z * s, yM + hb / 2], 10 + i * 6, `${z}`, 2.2)));
  if (gaten.length) el.push(tk(x0, yM + hb / 2 + 16 + gaten.length * 6, `${p.gaten.length} x Ø11 doorgaand in één wand, blindklinkmoer M8 (ISO 15786); links en rechts volgens de klemmen`, 2.3));
  // doorsnede (eerste hoek: het linkeraanzicht rechts) 1:2
  const cx = 248, cy = 52, s2 = Math.min(0.5, 36 / Math.max(P.b, P.h));
  el.push(tk(cx, 30, `Doorsnede (1:${Math.round(1 / s2)})`, 2.6, { vet: true, anker: 'middle' }));
  if (P.vorm === 'buis' || P.vorm === 'rond') { el.push(`<circle cx="${cx}" cy="${cy}" r="${f((P.b / 2) * s2)}" fill="#c9ced3" stroke="#111" stroke-width="0.35"/>`); if (P.vorm === 'buis') el.push(`<circle cx="${cx}" cy="${cy}" r="${f((P.b / 2 - P.t) * s2)}" fill="#fff" stroke="#111" stroke-width="0.3"/>`); el.push(tk(cx, cy + (P.b / 2) * s2 + 5, `Ø${g(P.b, 1)}${P.t ? ` x ${g(P.t, 1)}` : ''}`, 2.4, { anker: 'middle' })); }
  else { el.push(`<rect x="${f(cx - (P.h / 2) * s2)}" y="${f(cy - (P.b / 2) * s2)}" width="${f(P.h * s2)}" height="${f(P.b * s2)}" fill="#c9ced3" stroke="#111" stroke-width="0.35"/>`); if (P.vorm === 'koker') el.push(`<rect x="${f(cx - (P.h / 2 - P.t) * s2)}" y="${f(cy - (P.b / 2 - P.t) * s2)}" width="${f((P.h - 2 * P.t) * s2)}" height="${f((P.b - 2 * P.t) * s2)}" fill="#fff" stroke="#111" stroke-width="0.3"/>`); el.push(maat([cx - (P.h / 2) * s2, cy + (P.b / 2) * s2], [cx + (P.h / 2) * s2, cy + (P.b / 2) * s2], 4, g(P.h, 0), 2.2), maat([cx + (P.h / 2) * s2, cy - (P.b / 2) * s2], [cx + (P.h / 2) * s2, cy + (P.b / 2) * s2], -4, g(P.b, 0), 2.2)); }
  el.push(tk(32, 105, `Schaal 1:${sch}. ${P.koop || d.prof === 'koop' ? 'Gekocht profiel, op maat zagen.' : 'Ontbramen; de zaagsnede volgens de hoek, de lange kant gemeten.'}`, 2.3, { kleur: '#333' }));
  if (d.dak?.horizontaal) el.push(tk(32, 110, `Schuin stuk onder het dak: helling ${g(d.dak.hoek, 1)}°, horizontaal ${d.dak.horizontaal} mm. Aan de muur verticaal gezaagd (${g(d.dak.hoek, 1)}°), op de knik verstek ${g(d.dak.hoek / 2, 1)}°.`, 2.3, { vet: true }));
  else if (d.dak) el.push(tk(32, 110, d.dak.tegen ? `Eindigt tegen de schuine handregel: zaag ${g(90 - d.dak.hoek, 1)}° (de snede ligt evenwijdig met de handregel, ${g(d.dak.hoek, 1)}°).` : `Bovenaan schuin ${g(d.dak.hoek, 1)}° onder de schuine handregel.`, 2.3, { vet: true }));
  return el.join('');
}
function plaatTekening(o, p) {
  if (p.paneel?.uv) return vormTekening(o, p, '#c9ced3', `Plaat ${p.t} mm S235JR, lasergesneden (DXF uit deze tekening). Schuin onder het dak: de bovenrand volgt de handregel.`);
  const el = [], w = p.b, h = p.l, sch = schaalVoor(Math.min(150 / w, 80 / h, 1)), s = 1 / sch, x0 = 40, y0 = 40, par = p.paneel?.helling ?? 0, sch2 = Math.tan((par * Math.PI) / 180) * w * s;
  const pts = [[x0, y0 + h * s], [x0 + w * s, y0 + h * s - sch2], [x0 + w * s, y0 - sch2], [x0, y0]];
  el.push(poly(pts, p.patroon && p.patroon !== 'vlak' ? 'url(#perfo4)' : '#c9ced3', 0.35));
  el.push(`<defs><pattern id="perfo4" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#c9ced3"/><circle cx="1.5" cy="1.5" r="${p.patroon === 'cirkel' ? 1.2 : p.patroon === 'lamel' ? 0.6 : 0.5}" fill="#fff"/></pattern></defs>`);
  for (const [gx, gy] of p.gaten ?? []) {
    const cx = p.rol === 'console' ? x0 + (w / 2 + gx) * s : x0 + (w / 2 + gx) * s, cy = p.rol === 'console' ? y0 + (-gy - 20) * s : y0 + (h / 2 - gy) * s, r = (ANKER[o.ankerType]?.plaatgat ?? 14) / 2;
    el.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * s)}" fill="#fff" stroke="#111" stroke-width="0.3"/>`, lijn(cx - r * s - 2, cy, cx + r * s + 2, cy, 0.13, '#111', '3 0.6 0.5 0.6'), lijn(cx, cy - r * s - 2, cx, cy + r * s + 2, 0.13, '#111', '3 0.6 0.5 0.6'));
  }
  el.push(maat([x0, y0 + h * s], [x0 + w * s, y0 + h * s - sch2], 7, `${Math.round(w)}`, 2.6), maat([x0, y0], [x0, y0 + h * s], 7, `${Math.round(h)}`, 2.6));
  if (p.gaten?.length) {
    const [gx0, gy0] = p.gaten[0], cx = x0 + (w / 2 + gx0) * s, cy = p.rol === 'console' ? y0 + (-gy0 - 20) * s : y0 + (h / 2 - gy0) * s;
    el.push(lijn(cx, cy, cx + 14, cy - 12, 0.2), tk(cx + 15, cy - 12.5, `${p.gaten.length} x Ø${ANKER[o.ankerType]?.plaatgat ?? 14} doorgaand`, 2.5, { vet: true }));
    const ex = p.rol === 'console' ? 30 : 25; el.push(tk(x0, y0 + h * s + 18, `Gaten ${ex} mm uit de rand (h.o.h. ${p.rol === 'console' ? `130 verticaal` : `${w - 2 * ex}`} mm); ISO 15786.`, 2.3));
  }
  if (par) el.push(tk(x0, y0 + h * s + 24, `Parallellogram: zijkanten verticaal, boven- en onderkant op ${g(par, 1)}° (helling van de trap).`, 2.3));
  el.push(tk(x0, 112, `Plaat ${p.t} mm S235JR, lasergesneden (DXF uit deze tekening), schaal 1:${sch}. Randen ontbramen.${p.patroon && p.patroon !== 'vlak' ? ` Patroon: ${PATROON[p.patroon].naam}.` : ''}`, 2.3, { kleur: '#333' }));
  return el.join('');
}
/** een paneel met een schuine kant (onder het dak): de omtrek uv met de maten (breedte, hoogte links en rechts, schuine zijde, hoek) */
function vormTekening(o, p, vul, tekst) {
  const el = [], pan = p.paneel, sk = schuineKant(pan), w = pan.w, h = pan.h, sch = schaalVoor(Math.min(140 / w, 62 / h)), s = 1 / sch, x0 = 46, y0 = 36 + h * s;
  const P = ([u, v]) => [x0 + u * s, y0 - v * s];
  el.push(poly(pan.uv.map(P), vul, 0.35));
  el.push(lijn(x0 - 3, y0, x0 + w * s + 3, y0, 0.13, '#111', '4 0.8 0.6 0.8'));
  el.push(maat(P([0, 0]), P([w, 0]), 7, `${Math.round(w)}`, 2.6));
  el.push(maat(P([0, 0]), P([0, sk.links]), -7, `${Math.round(sk.links)}`, 2.6), maat(P([w, 0]), P([w, sk.rechts]), 7, `${Math.round(sk.rechts)}`, 2.6));
  if (sk.schuin) {
    const a = sk.boven.find(([u]) => Math.abs(u - sk.schuin.u1) < 0.01), b = sk.boven.find(([u]) => Math.abs(u - sk.schuin.u2) < 0.01);
    el.push(maat(P(a), P(b), 5, `${Math.round(sk.schuin.l)}`, 2.4));
    const m = P([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    el.push(tk(m[0], m[1] + 9, `${g(sk.schuin.hoek, 1)}°`, 2.6, { vet: true, anker: 'middle' }));
    if (sk.boven.length > 2) { const knik = sk.boven.find(([u]) => u > 0.5 && u < w - 0.5 && !(Math.abs(u - sk.schuin.u1) < 0.01 && Math.abs(u - sk.schuin.u2) < 0.01)); if (knik) el.push(maat(P([0, 0]), P([knik[0], 0]), 13, `${Math.round(knik[0])} (knik)`, 2.2)); }
  }
  rij(`${tekst} Schaal 1:${sch}. Omschreven rechthoek ${Math.round(w)} x ${Math.round(h)}; hoogtes links en rechts verticaal gemeten.`, 92).slice(0, 3).forEach((t, i) => el.push(tk(26, 112 + i * 3.2, t, 2.2, { kleur: '#333' })));
  return el.join('');
}
function glasTekening(o, p) {
  if (p.paneel?.uv) { const G = GLASOPBOUW[p.paneel.opbouw]; return vormTekening(o, p, KL.glas, `${G.naam}, vormglas met schuine kant, kanten geslepen.`) + tk(26, 124, o.k.soort === 'glasU' ? 'U-profiel: 100 mm inklemming, rubbers aan beide kanten; de U-handregel volgt de schuine kant.' : 'Klemmen: 2 per kant, een lage kant (< 360 mm) 1 klem in het midden; geen gaten.', 2.3, { kleur: '#333' }); }
  const el = [], w = p.b, h = p.l, sch = schaalVoor(Math.min(150 / w, 80 / h)), s = 1 / sch, x0 = 40, y0 = 40, par = p.paneel?.helling ?? 0, d = Math.tan((par * Math.PI) / 180) * w * s;
  el.push(poly([[x0, y0 + h * s], [x0 + w * s, y0 + h * s - d], [x0 + w * s, y0 - d], [x0, y0]], KL.glas, 0.35));
  el.push(maat([x0, y0 + h * s], [x0 + w * s, y0 + h * s - d], 7, `${Math.round(w)}`, 2.6), maat([x0, y0], [x0, y0 + h * s], 7, `${Math.round(h)}`, 2.6));
  const G = GLASOPBOUW[p.paneel.opbouw];
  el.push(tk(x0, 112, `${G.naam}: twee bladen thermisch gehard, PVB-folie ${g(G.folie, 2)} mm, kanten geslepen, hoeken gefaceteerd. Schaal 1:${sch}.`, 2.3, { kleur: '#333' }));
  el.push(tk(x0, 117, o.k.soort === 'glasU' ? 'In het U-profiel: 100 mm inklemming volgens Q-railing, rubbers aan beide kanten.' : '4 glasklemmen, 120 mm van boven en onder; geen gaten in het glas.', 2.3, { kleur: '#333' }));
  return el.join('');
}
/** alle stukbladen */
export function stukBladen(o, meta = {}) {
  const P = stuklijst(o).posities;
  return P.map((p, i) => ({ pos: p.pos, p, svg: stukBlad(o, p, { ...meta, nr: `${meta.nr ?? 'BA'}-P${p.pos}`, blad: `${i + 1} / ${P.length}` }) }));
}

// ---------------------------------------------------------------- lasdetails (ISO 2553)
export function lasBlad(o, meta = {}) {
  const k = o.k, el = [], d = [];
  if (k.soort === 'glasU') return null;
  const P = PROFIEL[o.staander.prof], a = Math.min(5, Math.max(3, P.t ?? 4));
  if (k.bevestiging === 'boven') d.push(['Staander op de voetplaat', `hoeklas a${a} rondom; eerst hechten op 4 hoeken, haaks controleren`, (x, y) => [poly([[x - 18, y + 10], [x + 18, y + 10], [x + 18, y + 14], [x - 18, y + 14]], '#c9ced3'), poly([[x - 7, y - 26], [x + 7, y - 26], [x + 7, y + 10], [x - 7, y + 10]], '#c9ced3'), poly([[x + 7, y + 10], [x + 10, y + 10], [x + 7, y + 7]], '#111'), lasSymbool([x + 8.5, y + 8.5], [x + 22, y - 6], { a, rondom: true })]]);
  else d.push(['Staander, afstandhouder en console', 'hoeklas a3 rondom op elke afstandhouder (aan de staander en de console)', (x, y) => [poly([[x - 22, y - 26], [x - 18, y - 26], [x - 18, y + 14], [x - 22, y + 14]], '#c9ced3'), poly([[x - 18, y - 12], [x - 8, y - 12], [x - 8, y - 4], [x - 18, y - 4]], '#c9ced3'), poly([[x - 8, y - 30], [x + 4, y - 30], [x + 4, y + 18], [x - 8, y + 18]], '#c9ced3'), lasSymbool([x - 8, y - 12], [x + 12, y - 22], { a: 3, rondom: true })]]);
  if (o.delen.some((x) => /regel/.test(x.rol) && x.prof === 'koker40x20x2')) d.push(['Regel tegen de staander', 'hoeklas a3 rondom; langs de trap schuin gezaagd', (x, y) => [poly([[x + 2, y - 30], [x + 12, y - 30], [x + 12, y + 14], [x + 2, y + 14]], '#c9ced3'), poly([[x - 26, y - 4], [x + 2, y - 4], [x + 2, y + 4], [x - 26, y + 4]], '#c9ced3'), lasSymbool([x + 2, y - 4], [x + 16, y - 18], { a: 3, rondom: true })]]);
  if (o.delen.some((x) => x.rol === 'spijl')) d.push(['Spijl op de regel', `hoeklas a3 rondom (${PROFIEL[o.st.spijl].naam}), lassen vlak slijpen`, (x, y) => [poly([[x - 24, y + 4], [x + 24, y + 4], [x + 24, y + 12], [x - 24, y + 12]], '#c9ced3'), poly([[x - 2.5, y - 28], [x + 2.5, y - 28], [x + 2.5, y + 4], [x - 2.5, y + 4]], '#c9ced3'), lasSymbool([x + 2.5, y + 3], [x + 16, y - 12], { a: 3, rondom: true })]]);
  if (o.delen.some((x) => x.rol === 'staaf')) d.push(['Horizontale staaf tegen de staander', 'hoeklas a3 rondom', (x, y) => [poly([[x + 2, y - 30], [x + 12, y - 30], [x + 12, y + 14], [x + 2, y + 14]], '#c9ced3'), poly([[x - 26, y - 2.5], [x + 2, y - 2.5], [x + 2, y + 2.5], [x - 26, y + 2.5]], '#c9ced3'), lasSymbool([x + 2, y - 2], [x + 16, y - 18], { a: 3, rondom: true })]]);
  if (o.panelen.some((x) => x.rol !== 'glas')) d.push(['Plaat of plint in het veld', 'onderbroken hoeklas a3, 30 lang om de 150, aan beide kanten (ISO 2553: a3 30(150))', (x, y) => [poly([[x + 4, y - 30], [x + 12, y - 30], [x + 12, y + 14], [x + 4, y + 14]], '#c9ced3'), poly([[x - 26, y - 30], [x + 4, y - 30], [x + 4, y + 14], [x - 26, y + 14]], '#9aa0a6'), lasSymbool([x + 4, y - 10], [x + 16, y - 24], { a: 3, beide: true, lengte: '30(150)' })]]);
  if (k.hr !== 'rond' || k.soort !== 'glasstaal') d.push(['Handregel op de staander', `hoeklas a3 aan beide zijden${o.hoeken + o.knikken ? '; verstek: V-naad doorgelast en vlak geslepen' : ''}`, (x, y) => [poly([[x - 26, y - 22], [x + 26, y - 22], [x + 26, y - 16], [x - 26, y - 16]], '#c9ced3'), poly([[x - 6, y - 16], [x + 6, y - 16], [x + 6, y + 16], [x - 6, y + 16]], '#c9ced3'), lasSymbool([x + 6, y - 16], [x + 18, y - 4], { a: 3, beide: true }), ...(o.hoeken + o.knikken ? [lasSymbool([x - 14, y - 22], [x - 24, y - 34], { soort: 'V', rechts: false })] : [])]]);
  el.push(tk(26, 18, 'Lasdetails (ISO 2553, systeem A): MAG 135, G3Si1 Ø0,8-1,0, Ar/CO₂ 82/18; uitvoeringsklasse EXC2, ISO 5817-C', 3.2, { vet: true }));
  d.slice(0, 6).forEach(([titel, uitleg, teken], i) => {
    const bx = 26 + (i % 3) * 88, by = 26 + Math.floor(i / 3) * 76;
    el.push(`<rect x="${bx}" y="${by}" width="84" height="72" fill="#fafbfb" stroke="#bbb" stroke-width="0.25"/>`, tk(bx + 3, by + 6, `${i + 1}. ${titel}`, 2.8, { vet: true }));
    el.push(...teken(bx + 36, by + 42));
    rij(uitleg, 58).forEach((t, j) => el.push(tk(bx + 3, by + 64 + j * 3, t, 2.1)));
  });
  el.push(tk(26, 186, 'Driehoek = hoeklas, a = keelhoogte (mm); cirkel op de knik = rondom; symbool boven én onder de referentielijn = aan beide zijden.', 2.2, { kleur: '#333' }));
  return kader4(o, { ...meta, titel: 'Lasdetails', schaal: 'zonder schaal' }, el.join(''));
}

// ---------------------------------------------------------------- boringen (ISO 15786)
export function boringBlad(o, meta = {}) {
  const k = o.k, A = ANKER[o.ankerType], sl = stuklijst(o), el = [];
  el.push(tk(26, 18, 'Boringen (ISO 15786): in het staal en in de vloer', 3.2, { vet: true }));
  const rijen = [];
  for (const p of sl.posities) {
    if (p.rol === 'voetplaat' || p.rol === 'console') rijen.push([p.pos, p.naam, `${p.gaten.length} x Ø${A.plaatgat}`, 'doorgaand', `${p.n * p.gaten.length}`, 'lasersnijden (niet boren)']);
    if (p.gaten?.length && p.soort === 'staaf') rijen.push([p.pos, p.naam, `${p.gaten.length} x Ø11`, '1 wand', `${p.n * p.gaten.length}`, 'blindklinkmoer M8 RVS zetten']);
    if (p.rol === 'uprofiel') rijen.push([p.pos, p.naam, `Ø11 om de ${o.ankerAfstand}`, 'bodem', '', 'voorgeboord door Q-railing; bijboren waar nodig']);
  }
  rijen.push(['-', 'Vloer (beton)', `${o.ankers.length} x Ø${A.gat}`, `${A.diep} mm diep`, `${o.ankers.length}`, A.mortel ? 'boren met hamerboor, 2x blazen, 2x borstelen, 2x blazen; mortel vanaf de bodem' : 'boren, uitblazen, anker inslaan tot de ring, aandraaien']);
  const [tt, th] = tabel(26, 22, [['Pos', 12, 1], ['Stuk', 64], ['Gaten', 34], ['Diepte', 26], ['Totaal', 16, 1], ['Hoe', 100]], rijen, 4.4, 2.1);
  el.push(tt);
  // schets van de voetplaat of console met de gaten
  const vp = o.platen[0];
  if (vp) {
    const s = 0.4, x0 = 40, y0 = 40 + th, w = vp.w * s, h = (vp.rol === 'console' ? 230 : vp.h) * s;
    el.push(tk(x0, y0 - 4, `${vp.rol === 'console' ? 'Console' : 'Voetplaat'} ${vp.w} x ${vp.rol === 'console' ? 230 : vp.h} x ${vp.t} (1:2,5)`, 2.6, { vet: true }));
    el.push(`<rect x="${x0}" y="${y0}" width="${f(w)}" height="${f(h)}" fill="#c9ced3" stroke="#111" stroke-width="0.35"/>`);
    for (const [gx, gy] of vp.gaten) { const cx = x0 + (vp.w / 2 + gx) * s, cy = vp.rol === 'console' ? y0 + (-gy - 20) * s : y0 + (vp.h / 2 - gy) * s; el.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f((A.plaatgat / 2) * s)}" fill="#fff" stroke="#111" stroke-width="0.3"/>`); }
    const [gx, gy] = vp.gaten[0], cx = x0 + (vp.w / 2 + gx) * s, cy = vp.rol === 'console' ? y0 + (-gy - 20) * s : y0 + (vp.h / 2 - gy) * s;
    el.push(lijn(cx, cy, cx + 30, cy - 10, 0.2), tk(cx + 31, cy - 10.5, `${vp.gaten.length} x Ø${A.plaatgat}`, 2.6, { vet: true }));
    el.push(maat([x0, y0 + h], [x0 + w, y0 + h], 6, `${vp.w}`, 2.3), maat([x0 + w, y0], [x0 + w, y0 + h], -6, `${vp.rol === 'console' ? 230 : vp.h}`, 2.3));
  }
  // ankergat in de vloer
  const ax = 170, ay = 52 + th, s2 = 0.5;
  el.push(tk(ax, ay - 20, `Ankergat in beton (1:2): ${A.naam}${k.plaats === 'buiten' ? ' A4' : ''}`, 2.6, { vet: true }));
  el.push(`<rect x="${ax}" y="${ay}" width="80" height="${f(A.diep * s2 + 18)}" fill="url(#beton2)" stroke="#111" stroke-width="0.3"/><defs><pattern id="beton2" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#ebe8e1"/><path d="M0 4 L4 0" stroke="#aaa" stroke-width="0.2"/></pattern></defs>`);
  el.push(`<rect x="${f(ax + 40 - (A.gat / 2) * s2)}" y="${ay}" width="${f(A.gat * s2)}" height="${f(A.diep * s2)}" fill="#fff" stroke="#111" stroke-width="0.3"/>`, `<rect x="${f(ax + 40 - (A.d / 2) * s2)}" y="${f(ay - 14)}" width="${f(A.d * s2)}" height="${f(A.hef * s2 + 14)}" fill="#b42318" opacity="0.75"/>`);
  el.push(maat([ax + 40 + (A.gat / 2) * s2, ay], [ax + 40 + (A.gat / 2) * s2, ay + A.diep * s2], -12, `${A.diep}`, 2.3), tk(ax + 2, ay + A.diep * s2 + 24, `Boor Ø${A.gat}, diepte ${A.diep} mm, verankeringsdiepte hef ${A.hef} mm; randafstand ≥ 100 mm (AANNAME, ETA nakijken).`, 2.2));
  return kader4(o, { ...meta, titel: 'Boringen', schaal: '1:2,5 / 1:2' }, el.join(''));
}

// ---------------------------------------------------------------- bestellijst en zaagplan A3
export function bestelBlad(o, meta = {}) {
  const sl = stuklijst(o), z = zaagplan(o), el = [];
  el.push(tk(26, 17, 'Bestellijst: kooponderdelen (excl. btw)', 3, { vet: true }));
  const totaal = sl.koop.reduce((t, x) => t + x.bedrag, 0);
  const [t1, h1] = tabel(26, 20, [['Artikel', 46], ['Benaming', 168], ['Aantal', 16, 1], ['Eenheid', 26], ['Winkel', 36], ['€/st', 20, 1], ['€', 22, 1]], [...sl.koop.map((x) => [x.artikel, x.naam.slice(0, 100), x.n, x.eenheid, x.winkel, g(x.prijs, 2), g(x.bedrag, 0)]), ['', 'Totaal kooponderdelen', '', '', '', '', g(totaal, 0)]], 4.2, 2.05);
  el.push(t1);
  let y = 20 + h1 + 8;
  el.push(tk(26, y, 'Staven en profielen', 3, { vet: true }));
  const [t2, h2] = tabel(26, y + 3, [['Profiel', 110], ['Norm / artikel', 50], ['Bestellen', 36], ['Nodig m', 20, 1], ['Rest m', 18, 1]], z.profielen.map((p) => [p.naam, p.artikel ?? '', `${p.n} x ${g(p.lengte / 1000, 1)} m`, g(p.nodig, 2), g(p.m - p.nodig - (p.stukken.length * ZAAGSNEDE) / 1000, 2)]), 4.2, 2.05);
  el.push(t2); y += h2 + 8;
  const glas = sl.posities.filter((p) => p.soort === 'glas');
  if (glas.length) {
    el.push(tk(26, y, 'Glasbestelling (maten in mm; vormglas: de omschreven rechthoek + hoogte links en rechts + schuine zijde)', 3, { vet: true }));
    const rijen = glas.map((p) => { const sk = schuineKant(p.paneel); return [p.pos, p.n, p.paneel.opbouw, p.paneel.vorm ?? 'rechthoek', Math.round(p.b), sk ? Math.round(sk.links) : Math.round(p.l), sk ? Math.round(sk.rechts) : Math.round(p.l), sk?.schuin ? `${Math.round(sk.schuin.l)} op ${g(sk.schuin.hoek, 1)}°` : '-', g(p.m2 * p.n, 2)]; });
    const [t3, h3] = tabel(26, y + 3, [['Pos', 12, 1], ['Aantal', 14, 1], ['Opbouw', 20], ['Vorm', 28], ['Breedte', 20, 1], ['H links', 20, 1], ['H rechts', 20, 1], ['Schuine zijde', 40], ['m²', 18, 1]], rijen.slice(0, 8), 4.2, 2.05);
    el.push(t3); y += h3 + 10;
  } else y += 4;
  el.push(tk(26, y, `Zaagplan: elke balk is één staaf; de tekst is de rol en de lengte (zaagsnede ${ZAAGSNEDE} mm)`, 3, { vet: true })); y += 4;
  const bw = 330, maxY = 297 - 10 - 36;
  outer: for (const p of z.profielen) {
    if (y + 12 > maxY) break;
    el.push(tk(26, y + 3.5, p.naam, 2.4, { vet: true })); y += 5;
    for (const [i, st] of p.staven.entries()) {
      if (y + 7 > maxY) { el.push(tk(26, y + 3, '… meer staven: zie de CSV-lijst', 2.1, { kleur: '#555' })); break outer; }
      const s = bw / p.lengte; el.push(`<rect x="26" y="${f(y)}" width="${f(p.lengte * s)}" height="5" fill="#f2f3f3" stroke="#111" stroke-width="0.2"/>`);
      let x = 26;
      for (const sk of st.stukken) { const w = sk.l * s; el.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="5" fill="#cfd4d7" stroke="#111" stroke-width="0.2"/>`); if (w > 14) el.push(tk(x + w / 2, y + 3.6, `${(ROL[sk.rol] ?? sk.rol).split(' ')[0]} ${sk.l}`, 1.9, { anker: 'middle' })); else if (w > 4) el.push(tk(x + w / 2, y + 3.6, `${sk.l}`, 1.6, { anker: 'middle' })); x += w + ZAAGSNEDE * s; }
      el.push(tk(26 + bw + 2, y + 3.6, `staaf ${i + 1} · rest ${Math.max(0, Math.round(st.rest))}`, 1.9, { kleur: '#555' })); y += 6.5;
    }
    y += 3;
  }
  el.push(titelblok(o, A3, { ...meta, titel: 'Bestellijst en zaagplan', schaal: '-' }));
  return svg(A3, el.join(''));
}

// ---------------------------------------------------------------- plaatsingsblad A4
export function plaatsingsBlad(o, meta = {}) {
  const k = o.k, A = ANKER[o.ankerType], el = [], zij = k.bevestiging === 'zij';
  el.push(tk(26, 18, 'Plaatsingsblad: uitzetten, boren, verankeren, stellen', 3.2, { vet: true }));
  // uitzetmaten: per segment de staanders vanaf het begin van dat segment
  const rijen = [];
  for (const s of o.segs) rijen.push([`${s.i + 1}`, `${Math.round(s.Lh)}${s.alfa ? ` (trap ${g((s.alfa * 180) / Math.PI, 1)}°)` : ''}`, (k.soort === 'glasU' ? `ankers om de ${o.ankerAfstand}` : (s.posten ?? []).map((t) => Math.round(t)).join(' · ')).slice(0, 70)]);
  const [tt, th] = tabel(26, 22, [['Lijn', 12], ['Lengte mm', 40], [k.soort === 'glasU' ? 'U-profiel' : 'Staanders (hart, mm vanaf het begin van de lijn)', 118]], rijen, 4.4, 2.1);
  el.push(tt);
  const sch = schaalVoor(Math.min(110 / Math.max(...o.segs.map((s) => Math.abs(s.punt(s.Lh)[0])), 1000), 60 / 3000)), s = 1 / sch;
  el.push(tk(26, 34 + th, `Uitzetplan (1:${sch})`, 2.6, { vet: true }));
  el.push(bovenaanzicht(o, s, 40, 34 + th + 10 + Math.max(...o.segs.map((x) => x.punt(x.Lh)[1]), 0) * s + 6, { h: 2 }));
  const Tinst = A.mortel ? (A.d === 12 ? 40 : 20) : A.d === 12 ? 60 : 45;
  const st = [
    `Uitzetten: zet de lijn uit met een slaglijn ${zij ? 'op de vloerrand, 60 en 190 mm onder de vloerpas (hart van de ankers)' : `op ${zij ? 0 : 100} mm van de vloerrand`}; meet de hoeken na (diagonalen) en markeer elk ${k.soort === 'glasU' ? 'ankergat' : 'staanderhart'} volgens de tabel.`,
    `Controleer de ondergrond: beton minstens C20/25, geen wapening in de boorgaten (wapeningsdetector)${zij ? `, vloerrand ≥ 260 mm dik (hier ${k.vloerdikte} mm)` : ''}. Randafstand ≥ 100 mm.`,
    `Boren: ${o.ankers.length} gaten Ø${A.gat} x ${A.diep} mm met de hamerboor. ${A.mortel ? 'Reinigen: 2x blazen, 2x borstelen, 2x blazen. Mortel FIS V Plus vanaf de bodem, stang draaiend inbrengen; uithardtijd volgens de koker (bij 20 °C ± 45 min, bij 5 °C langer).' : 'Uitblazen; keilbout inslaan tot de ring op de plaat staat.'}`,
    `Verankeren: ${k.soort === 'glasU' ? 'profiel op de ankers, ' : 'staander op de ankers, '}uitvulplaatjes onder de ${k.soort === 'glasU' ? 'profielen' : 'voetplaat'} tot alles waterpas en loodrecht staat. Aandraaimoment ${Tinst} Nm (${A.naam}; ETA nakijken).`,
    k.soort === 'glasU' ? 'Glas: rubbers volgens Q-railing in het profiel, glas met 2 personen en zuignappen plaatsen, met de stelsleutel verticaal zetten (0-2°), eindkappen en afdekprofiel. Daarna de U-handregel met de rubber op de glasrand.' : k.soort === 'glasstaal' ? 'Glas: klemmen losjes op de klinkmoeren, glas plaatsen met de rubbertjes, uitlijnen (voeg gelijk) en de klemmen aandraaien (handvast, M8).' : 'Stellen: richt de staanders loodrecht (waterpas op 2 kanten), handregel recht langs een lijn.',
    ...(o.dakKnikken ? [`Onder het dak (eerst meten): ${o.dak.filter((e) => e.nodig).map((e) => `${e.kant === 'begin' ? 'begin' : 'einde'}: helling ${g(e.hoek, 0)}°, hoogte aan de muur ${e.muur} mm, schuin stuk ${Math.round(e.xs)} mm, spleet ${e.spleet} mm`).join('; ')}. Meet de helling met een digitale hellingmeter op de onderkant van het dak (of de hoogte op 2 punten 1 m uit elkaar) en de hoogte onder het dak tegen het knieschot; wijkt het meer dan 1° of 15 mm af, pas de tekening aan vóór het zagen.${o.muurAnkers?.length ? ` Muurplaat: ${o.muurAnkers.length} ankers M10 in het knieschot (eerst nakijken: metselwerk of beton, geen hout).` : ''}`] : []),
    `Controle: hoogte ≥ ${o.vereist} mm overal, geen opening groter dan ${NORM.opening.v} mm (bol), ${o.klim ? 'geen opstap tussen 110 en 450 mm, ' : ''}alle moeren aangedraaid. ${k.plaats === 'buiten' ? 'Buiten: afwatering vrijhouden, geen water in de voetplaat (kitvoeg aan de bovenkant, onderkant open).' : ''}`,
  ];
  let y = 34 + th + 6; const x = 158;
  el.push(tk(x, y, 'Stappen', 2.8, { vet: true })); y += 4;
  st.forEach((t, i) => { const l = rij(t, 66); l.forEach((r, j) => { if (y < 175) el.push(tk(j ? x + 4 : x, y, `${j ? '' : `${i + 1}. `}${r}`, 2.05)); y += 2.75; }); y += 1; });
  return kader4(o, { ...meta, titel: 'Plaatsingsblad', schaal: `1:${sch}` }, el.join(''));
}

// ---------------------------------------------------------------- berekeningsblad A4
const KLEUR = { groen: '#2e7d46', oranje: '#c27c0e', rood: '#b3261e', info: '#59626a' };
export function berekeningBlad(o, meta = {}) {
  const B = berekening(o), el = [];
  el.push(tk(26, 18, `Berekening (vereenvoudigd): oordeel ${B.oordeel.toUpperCase()}`, 3.4, { vet: true, kleur: KLEUR[B.oordeel] }));
  el.push(tk(26, 23, `Categorie ${B.q.naam}: qk ${g(B.q.q, 1)} kN/m, Qk ${g(B.q.Q, 1)} kN, γQ 1,5; S235, E 210 000; groen ≤ 90 % benut, oranje 90-100 % of een aanname om na te kijken, rood > 100 %.`, 2.1, { kleur: '#333' }));
  let y = 30;
  for (const c of B.controles) {
    if (y > 176) { el.push(tk(26, y, '… meer controles: zie de pagina Werkplaats', 2, { kleur: '#555' })); break; }
    el.push(`<circle cx="28" cy="${f(y - 0.9)}" r="1.6" fill="${KLEUR[c.oordeel] ?? '#888'}"/>`, tk(32, y, `${c.groep}: ${c.wat}`, 2.3, { vet: true }));
    if (c.oordeel !== 'info') el.push(tk(270, y, `${Math.round(c.benut * 100)} %`, 2.3, { anker: 'end', vet: true, kleur: KLEUR[c.oordeel] }));
    y += 2.9;
    for (const r of rij(c.formule, 140).slice(0, 2)) { el.push(tk(34, y, r, 1.95)); y += 2.6; }
    el.push(tk(34, y, `Bron: ${c.bron}`.slice(0, 165), 1.6, { kleur: '#666' })); y += 3.6;
  }
  return kader4(o, { ...meta, titel: 'Berekening', schaal: '-' }, el.join(''));
}

/** alle bladen van een balustrade, in volgorde */
export function alleBladen(o, meta = {}) {
  const b = [['overzicht', 'Overzicht', overzichtBlad(o, meta)], ['stuklijst', 'Stuklijst', stuklijstBlad(o, meta)], ['bestel', 'Bestellijst en zaagplan', bestelBlad(o, meta)], ['berekening', 'Berekening', berekeningBlad(o, meta)], ['plaatsing', 'Plaatsingsblad', plaatsingsBlad(o, meta)], ['boringen', 'Boringen', boringBlad(o, meta)]];
  const las = lasBlad(o, meta); if (las) b.push(['lassen', 'Lasdetails', las]);
  return b.map(([id, titel, s]) => ({ id, titel, svg: s }));
}
export { SOORTEN, KOOP, esc };
