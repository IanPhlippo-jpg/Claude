// Bouwstenen die veel toestellen delen: staander, ligger tussen twee stukken (gelast of met flenzen gebout), J-hook,
// safety, schijfhouder, voetplaat, kussen op een frame, katrolbeugel, gewichtstoren met afscherming, hefboom met
// draaipunt. Alles in mm, x = breedte, y = diepte (naar achter), z = hoogte. Node en browser.
import { X, Y, Z, add, sub, mul, norm, len, balk, standaardV, aabb, westside } from './model.mjs';
import { PROFIEL } from './onderdelen.mjs';

export { westside };
const r0 = (v) => Math.round(v * 10) / 10;
/** de doos (AABB) van een deel */
export const doos = (d) => aabb(d.geo[0]);
/** verticale staander van z0 tot z1 op (x, y) */
export const staander = (b, naam, rol, x, y, z0, z1, opt = {}) => b.staaf(naam, rol, [x, y, z0], [x, y, z1], opt);
/** voeg een gat toe aan een staaf op de wereldplaats p (de afstand langs de as vanaf a) */
export function gat(d, p, dia, as = 'v') {
  const s = r0((p[0] - d.a[0]) * d.u[0] + (p[1] - d.a[1]) * d.u[1] + (p[2] - d.a[2]) * d.u[2]);
  if (!d.gaten.some((g) => Math.abs(g.s - s) < 0.5 && g.as === as)) d.gaten.push({ s, d: dia, as });
  return s;
}
/** de dichtstbijzijnde Westside-gatpositie (wereld-z) op een verticale staander */
export function gatZ(d, z) {
  const ws = d.gaten.filter((g) => g.as === 'w' && g.d === d.westside?.d);
  if (!ws.length) return z;
  let best = ws[0]; for (const g of ws) if (Math.abs(d.a[2] + g.s - z) < Math.abs(d.a[2] + best.s - z)) best = g;
  return d.a[2] + best.s;
}
/**
 * ligger tussen twee stukken A en B, langs de as waarin ze het verst uit elkaar liggen; 'at' = de andere twee coördinaten
 * van de hartlijn ({ x, y, z }). opt.bout: flenzen aan beide uiteinden en bouten door A en B (eigen groep).
 */
export function ligger(b, naam, rol, A, B, at = {}, opt = {}) {
  const ca = add(A.a, mul(sub(A.b, A.a), 0.5)), cb = add(B.a, mul(sub(B.b, B.a), 0.5)), d = sub(cb, ca);
  const ax = opt.as ?? [0, 1, 2].reduce((m, i) => (Math.abs(d[i]) > Math.abs(d[m]) ? i : m), 0), s = Math.sign(d[ax]) || 1;
  const [a0, a1] = doos(A), [b0, b1] = doos(B);
  const van = s > 0 ? a1[ax] : a0[ax], tot = s > 0 ? b0[ax] : b1[ax];
  const p = [at.x ?? ca[0], at.y ?? ca[1], at.z ?? ca[2]];
  const pa = [...p], pb = [...p]; pa[ax] = van; pb[ax] = tot;
  if (!opt.bout) return b.staaf(naam, rol, pa, pb, opt);
  // gebout: kopplaten (t = V.plaat) aan de uiteinden; 2 bouten boven en onder het profiel (buiten de las), door het stuk A / B
  const oud = b.huidig, g = opt.groep ?? naam, t = b.V.plaat, P = b.P(rol), bFl = Math.max(P.b, ...[A, B].map((q) => q.P?.b ?? P.b));
  const d0 = b.V.bout === 'boutM16' ? 17 : 13, off = d0 / 2 + b.V.las + 4, ef = Math.ceil(1.5 * d0);
  b.groep(g);
  const qa = [...pa], qb = [...pb]; qa[ax] += s * t; qb[ax] -= s * t;
  const st = b.staaf(naam, rol, qa, qb, { ...opt, bout: undefined });
  const dirs = [0, 1, 2].filter((i) => i !== ax), vert = dirs.includes(2);
  const fl = [];
  for (const [e, kant] of [[pa, s], [pb, -s]]) {
    const q0 = [...e], q1 = [...e]; q1[ax] = e[ax] + kant * t;
    for (const i of dirs) { if (i === 2 && vert) continue; q0[i] = e[i] - bFl / 2; q1[i] = e[i] + bFl / 2; }
    if (vert) { q0[2] = e[2] - P.h / 2 - off - ef; q1[2] = e[2] + P.h / 2 + off + ef; }
    fl.push(b.plaat(`Kopplaat ${naam}`, q0, q1, { gaten: [], opm: `2 gaten Ø${d0} boven en onder het profiel` }));
  }
  b.groep(oud);
  const asv = [0, 0, 0]; asv[ax] = 1;
  for (const [F, S, e] of [[fl[0], A, pa], [fl[1], B, pb]]) {
    const zs = vert ? [e[2] + P.h / 2 + off, e[2] - P.h / 2 - off] : [e[2]];
    const Sb = S.P?.b ?? 60, dir = Math.sign(((S.a?.[ax] ?? e[ax]) + (S.b?.[ax] ?? e[ax])) / 2 - e[ax]) || -s;
    const pts = zs.map((z) => { const q = [...e]; if (vert) q[2] = z; return q; });
    for (const q of pts) { F.gaten.push({ d: d0, p: q, x: q[F.as.l] - F.mn[F.as.l], y: q[F.as.b] - F.mn[F.as.b] }); if (S.soort === 'staaf') gat(S, q, d0, Math.abs(S.v[ax]) > 0.5 ? 'v' : 'w'); }
    const mid = pts.map((q) => { const m = [...q]; m[ax] += (dir * (Sb - t)) / 2; return m; });
    b.bout(naam, S.groep, g, mid[0], asv, { punten: mid, lengte: Sb + t + 2 * (d0 - 1), uit: mul(asv, -dir * 120), F: opt.F ?? 0 });
  }
  st.flenzen = fl;
  return st;
}
/** dwarsligger bovenop twee voetbalken (langs y), met 1 verticale bout per kant door de ligger en de voetbalk */
export function dwarsOp(b, naam, rol, A, B, y) {
  const P = b.P(rol), [a0, a1] = doos(A), [b0, b1] = doos(B), z = Math.max(a1[2], b1[2]), oud = b.huidig;
  b.groep(naam);
  const st = b.staaf(naam, rol, [Math.min(a0[0], b0[0]), y, z + P.h / 2], [Math.max(a1[0], b1[0]), y, z + P.h / 2], { v: Y, opm: 'ligt bovenop de voetbalken; 1 bout per kant' });
  b.groep(oud);
  const d0 = b.V.bout === 'boutM16' ? 17 : 13;
  for (const S of [A, B]) {
    const [s0, s1] = doos(S), q = [S.a[0], y, z], Sh = s1[2] - s0[2];
    gat(st, q, d0, Math.abs(st.w[2]) > 0.5 ? 'w' : 'v'); gat(S, q, d0, Math.abs(S.w[2]) > 0.5 ? 'w' : 'v');
    b.bout(naam, S.groep, naam, [q[0], y, z + (P.h - Sh) / 2], Z, { punten: [[q[0], y, z + (P.h - Sh) / 2]], lengte: P.h + Sh + 2 * (d0 - 1), uit: [0, 0, 150] });
  }
  return st;
}
/**
 * J-hook (zelf gemaakt): rugplaat tegen de voorkant van de staander, bodem met UHMW, lip 30 mm, pen in het gat.
 * kant = -1 (haak naar voren, -y) of +1 (naar achter). Geeft de hoogte van de stang (bovenkant UHMW).
 */
export function jhook(b, S, zGat, naam = 'J-hook', kant = -1, gelast = false) {
  const oud = b.huidig, t = b.V.plaat, a = S.P.b, [mn, mx] = doos(S), yf = kant < 0 ? mn[1] : mx[1], x = S.a[0], pin = b.V.pin;
  if (gelast) {
    // vaste haak (bankdrukstation): rugplaat, bodem en lip rechtstreeks op de staander gelast
    const zb = zGat - 10;
    b.plaat('Haak rugplaat', [x - a / 2, yf + kant * t, zb - t - 2], [x + a / 2, yf, zb + 115], { groep: S.groep });
    b.plaat('Haak schoor', [x - t / 2, yf + kant * (t + 70), zb - t - 60], [x + t / 2, yf + kant * t, zb - t], { groep: S.groep, vorm: 'driehoek', opm: 'driehoekig schoorschot onder de bodem' });
    b.plaat('Haak bodem', [x - a / 2, yf + kant * (t + 75), zb - t], [x + a / 2, yf + kant * t, zb], { groep: S.groep });
    b.plaat('Haak lip', [x - a / 2, yf + kant * (t + 75 + t), zb - t], [x + a / 2, yf + kant * (t + 75), zb + 32], { groep: S.groep });
    b.koop('uhmw', 1, [balk([x, yf + kant * t, zb + 5], [x, yf + kant * (t + 75), zb + 5], X, a - 6, 10, false, 'uhmw')], { naam: `UHMW-strip ${a - 6} x 75 x 10 op de haak`, oppervlak: ((a - 6) * 75) / 1e6, groep: S.groep });
    return zb + 10;
  }
  b.groep(naam);
  const z0 = zGat - 50, zb = zGat - 10; // bodem van de haak
  b.plaat('J-hook rugplaat', [x - a / 2, yf + kant * t, z0 - 30], [x + a / 2, yf, zb + 130], { gaten: [{ p: [x, yf, zGat], d: pin + 1 }], opm: `r 2,5 op alle randen; gat Ø${pin + 1} voor de pen (rondom gelast)` });
  b.plaat('J-hook schoor', [x - t / 2, yf + kant * (t + 70), zb - t - 60], [x + t / 2, yf + kant * t, zb - t], { vorm: 'driehoek', opm: 'driehoekig schoorschot onder de bodem' });
  b.plaat('J-hook bodem', [x - a / 2, yf + kant * (t + 75), zb - t], [x + a / 2, yf + kant * t, zb]);
  b.plaat('J-hook lip', [x - a / 2, yf + kant * (t + 75 + t), zb - t], [x + a / 2, yf + kant * (t + 75), zb + 32], { opm: 'lip 32 mm boven de bodem, 22 mm boven de UHMW' });
  b.staaf('J-hook pen', `r${pin}`, [x, yf + kant * t, zGat], [x, yf - kant * (S.P.t + 18), zGat], { in: S.id, kap: false, opm: 'gelast in de rugplaat' });
  b.koop('uhmw', 1, [balk([x, yf + kant * t, zb + 5], [x, yf + kant * (t + 75), zb + 5], X, a - 6, 10, false, 'uhmw')], { naam: `UHMW-strip ${a - 6} x 75 x 10 op de J-hook`, oppervlak: ((a - 6) * 75) / 1e6 });
  b.groep(oud);
  const pl = t + S.P.t + 18;
  b.pen(naam, [x, yf + kant * t - kant * pl / 2, zGat], [0, kant, 0], { d: pin, lengte: pl, F: 0, snedes: 1, factor: 'vanghaak', a: S.groep, b: naam, uit: [0, kant * 140, 0] });
  return zb + 10;
}
/** safety tussen een voorste en een achterste staander (langs y), op de gatenhoogte zGat: koker + kopplaten + pennen */
export function safety(b, Sf, Sb, zGat, naam = 'Safety') {
  const oud = b.huidig, t = b.V.plaat, rol = 'ligger', P = b.P(rol), x = Sf.a[0], [, fmx] = doos(Sf), [bmn] = doos(Sb), pin = b.V.pin;
  b.groep(naam);
  const y0 = fmx[1] + 1, y1 = bmn[1] - 1, zc = zGat;
  b.plaat('Kopplaat safety', [x - P.b / 2, y0, zc - P.h / 2 - 10], [x + P.b / 2, y0 + t, zc + P.h / 2], { gaten: [{ p: [x, y0, zc], d: pin + 1 }] });
  b.plaat('Kopplaat safety', [x - P.b / 2, y1 - t, zc - P.h / 2 - 10], [x + P.b / 2, y1, zc + P.h / 2], { gaten: [{ p: [x, y1, zc], d: pin + 1 }] });
  const s = b.staaf(`${naam} (koker)`, rol, [x, y0 + t, zc - 5], [x, y1 - t, zc - 5]);
  for (const [y, k] of [[y0, -1], [y1, 1]]) b.staaf('Pen safety', `r${pin}`, [x, y - k * t, zc], [x, y + k * ((k < 0 ? Sf : Sb).P.t + 20), zc], { in: (k < 0 ? Sf : Sb).id, kap: false, opm: 'door de kopplaat gelast' });
  b.koop('uhmw', 1, [balk([x, y0 + t, zc + P.h / 2 - 5 + 5], [x, y1 - t, zc + P.h / 2 - 5 + 5], X, P.b - 4, 10, false, 'uhmw')], { naam: `UHMW-strip ${P.b - 4} x ${Math.round(y1 - y0 - 2 * t)} x 10 op de safety`, oppervlak: ((P.b - 4) * (y1 - y0)) / 1e6 });
  b.groep(oud);
  const pl = t + Sf.P.t + 20;
  b.pen(`${naam} voor`, [x, y0 + t - pl / 2, zc], Y, { d: pin, lengte: pl, snedes: 1, factor: 'vanghaak', a: Sf.groep, b: naam, uit: [0, 0, 180] });
  b.pen(`${naam} achter`, [x, y1 - t + pl / 2, zc], Y, { d: pin, lengte: pl, snedes: 1, factor: 'vanghaak', a: Sb.groep, b: naam, uit: [0, 0, 180] });
  return s;
}
/** schijfhouder (sleeve Ø48,3) loodrecht op een staaf, vanaf zijn vlak in richting dir, lengte L; eindkap */
export function hoorn(b, S, p, dir, L = 250, naam = 'Schijfhouder') {
  const [mn, mx] = doos(S), d = norm(dir), ax = [0, 1, 2].reduce((m, i) => (Math.abs(d[i]) > Math.abs(d[m]) ? i : m), 0);
  const q = [...p]; q[ax] = d[ax] > 0 ? mx[ax] : mn[ax];
  const h = b.staaf(naam, 'sleeve', q, add(q, mul(d, L)), { opm: 'voor schijven Ø50; eindkap erop' });
  // kraag (rond 8 mm) aan de voet tegen het afglijden van de schijf naar het frame
  return h;
}
/** voetplaat onder een staander (of tegen een vlak), met n ankergaten Ø14 */
export function voetplaat(b, S, maat = 140, ankers = 2) {
  const [mn, mx] = doos(S), t = b.V.voetplaat, c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2];
  const gaten = ankers === 4 ? [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => ({ p: [c[0] + p * (maat / 2 - 20), c[1] + q * (maat / 2 - 20), mn[2] - t], d: 14 })) : ankers === 2 ? [[-1, 0], [1, 0]].map(([p]) => ({ p: [c[0] + p * (maat / 2 - 20), c[1], mn[2] - t], d: 14 })) : [];
  return b.plaat('Voetplaat', [c[0] - maat / 2, c[1] - maat / 2, mn[2] - t], [c[0] + maat / 2, c[1] + maat / 2, mn[2]], { gaten, opm: `${ankers} ankergaten Ø14 (keilbout M12)` });
}
/** rubber voetjes onder de onderkant van een staaf (n stuks verdeeld) */
export function voetjes(b, S, n = 2) {
  const [mn, mx] = doos(S), uit = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : 0.08 + (0.84 * i) / (n - 1), p = add(S.a, mul(sub(S.b, S.a), t));
    uit.push(balk([p[0], p[1], mn[2] - 12], [p[0], p[1], mn[2] - 5], X, 50, 50, true, 'rubber'), balk([p[0], p[1], mn[2] - 5], [p[0], p[1], mn[2]], X, 17, 17, false, 'zink', { zes: true }));
  }
  b.koop(b.V.voetje, n, uit, { naam: `${b.V.voetje === 'voetThuis' ? 'Stelvoet M10' : 'Rubbervoet M10'} onder ${S.naam.toLowerCase()}` });
  void mx;
}
/** kussen bovenop een horizontaal stuk (of langs een schuin stuk): lengte langs het stuk, gecentreerd */
export function kussenOp(b, naam, S, L, breedte, opt = {}) {
  const [mn, mx] = doos(S), u = S.u, c = add(S.a, mul(sub(S.b, S.a), opt.t ?? 0.5)), n = opt.n ?? (Math.abs(u[2]) > 0.99 ? [0, -1, 0] : Z);
  const top = Math.abs(u[2]) > 0.99 ? null : (Math.abs(u[2]) < 1e-6 ? mx[2] : null);
  let basis;
  if (top !== null) basis = [c[0], c[1], top + (opt.op ?? 0)];
  else basis = add(c, mul(norm(n), (S.P.h / 2) + (opt.op ?? 0)));
  const a = add(basis, mul(u, -L / 2 + (opt.schuif ?? 0))), e = add(basis, mul(u, L / 2 + (opt.schuif ?? 0)));
  return b.kussen(naam, a, e, n, breedte, opt.dikte ?? 68, opt);
}
/** beugel voor een katrol: twee platen (t 6) aan weerszijden van de katrol, gelast aan een stuk; geeft de katrol */
export function katrolBeugel(b, naam, c, as, opt = {}) {
  const k = b.katrol(naam, c, as, opt), D = k.D, ax = norm(as), t = 6, gap = 18;
  const oud = b.huidig;
  if (opt.groep) b.groep(opt.groep);
  for (const s of [-1, 1]) {
    const m = add(c, mul(ax, s * (gap + t / 2)));
    const q0 = [m[0] - (D / 2 + 25), m[1] - (D / 2 + 25), m[2] - (D / 2 + 25)], q1 = [m[0] + (D / 2 + 25), m[1] + (D / 2 + 25), m[2] + (D / 2 + 25)];
    const i = [0, 1, 2].reduce((mm, j) => (Math.abs(ax[j]) > Math.abs(ax[mm]) ? j : mm), 0); q0[i] = m[i] - t / 2; q1[i] = m[i] + t / 2;
    if (opt.tot) { // de beugel loopt door tot het vlak van het dragende stuk (wereld-coördinaat op as 'tot.as')
      const ti = opt.tot.as; if (opt.tot.w > c[ti]) q1[ti] = opt.tot.w; else q0[ti] = opt.tot.w;
    }
    b.plaat(`Katrolbeugel ${naam}`, q0, q1, { gaten: [{ p: c, d: 10.5 }], opm: `gat Ø10,5 voor de as; afstand tot de katrol ≤ 5 mm (kabel kan er niet uit)` });
  }
  if (opt.rug) {
    // rugplaat (t 8) tussen de beugelplaten en het steunvlak: as 'rug.as' (niet de katrolas), tot coördinaat rug.w
    const i = [0, 1, 2].reduce((mm, j) => (Math.abs(ax[j]) > Math.abs(ax[mm]) ? j : mm), 0), ri = opt.rug.as, oi = [0, 1, 2].find((j) => j !== i && j !== ri);
    const q0 = [...c], q1 = [...c]; q0[i] = c[i] - gap - t; q1[i] = c[i] + gap + t;
    const rand = c[ri] + Math.sign(opt.rug.w - c[ri]) * (D / 2 + 25); q0[ri] = Math.min(rand, opt.rug.w) - (opt.rug.w < c[ri] ? 0 : 1); q1[ri] = Math.max(rand, opt.rug.w) + (opt.rug.w < c[ri] ? 1 : 0);
    if (opt.rug.w < c[ri]) { q0[ri] = opt.rug.w; q1[ri] = rand; } else { q0[ri] = rand; q1[ri] = opt.rug.w; }
    q0[oi] = c[oi] - 20; q1[oi] = c[oi] + 20;
    b.plaat(`Rugplaat katrol ${naam}`, q0, q1, { opm: 'verbindt de beugel met het frame' });
  }
  if (opt.kap === 'ligger') k.kapTekst = 'afgeschermd door de bovenligger en de beugelplaten (≤ 5 mm van de groef)';
  if (opt.kap !== false && opt.kap !== 'ligger') {
    // vingerbescherming: gebogen plaat 2 mm rond de onderkant, als dunne plaat op de beugel
    const i = [0, 1, 2].reduce((mm, j) => (Math.abs(ax[j]) > Math.abs(ax[mm]) ? j : mm), 0), q0 = [...c], q1 = [...c];
    for (let j = 0; j < 3; j++) { q0[j] = c[j] - (D / 2 + 25); q1[j] = c[j] + (D / 2 + 25); }
    q0[i] = c[i] - gap; q1[i] = c[i] + gap; const kz = opt.kapKant ?? [0, 0, 1];
    const zi = [0, 1, 2].reduce((mm, j) => (Math.abs(kz[j]) > Math.abs(kz[mm]) ? j : mm), 0);
    if (kz[zi] > 0) { q0[zi] = c[zi] + D / 2 + 20; q1[zi] = c[zi] + D / 2 + 22; } else { q1[zi] = c[zi] - D / 2 - 20; q0[zi] = c[zi] - D / 2 - 22; }
    b.plaat(`Vingerbescherming ${naam}`, q0, q1, { opm: 'plaat 2 mm, gezet; ≤ 5 mm van de kabelgroef (EN ISO 20957-2)' });
  }
  b.groep(oud);
  return k;
}
/** profiel opzoeken (voor de toestellen) */
export const prof = (id) => PROFIEL[id];
export { X, Y, Z, add, sub, mul, norm, len, balk, standaardV };
