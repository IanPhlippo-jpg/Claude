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
  // gebout: flenzen (t = V.plaat) aan de uiteinden, de ligger ertussen in zijn eigen groep
  const oud = b.huidig, g = opt.groep ?? naam, t = b.V.plaat, P = b.P(rol), hFl = Math.max(P.h, opt.flens ?? P.h * 2 + 20), bFl = Math.max(P.b, ...[A, B].map((q) => q.P?.b ?? P.b));
  b.groep(g);
  const qa = [...pa], qb = [...pb]; qa[ax] += s * t; qb[ax] -= s * t;
  const st = b.staaf(naam, rol, qa, qb, { ...opt, bout: undefined });
  const dirs = [0, 1, 2].filter((i) => i !== ax), boven = 2; // de flens loopt naar onder door (ruimte voor 2 bouten)
  const fl = [];
  for (const [e, kant] of [[pa, s], [pb, -s]]) {
    const q0 = [...e], q1 = [...e]; q1[ax] = e[ax] + kant * t;
    for (const i of dirs) { const half = i === boven && dirs.includes(2) ? null : bFl / 2; if (half !== null) { q0[i] = e[i] - half; q1[i] = e[i] + half; } }
    if (dirs.includes(2)) { if (opt.omhoog) { q0[2] = e[2] - P.h / 2; q1[2] = e[2] - P.h / 2 + hFl; } else { q0[2] = e[2] + P.h / 2 - hFl; q1[2] = e[2] + P.h / 2; } }
    fl.push(b.plaat(`Flens ${naam}`, q0, q1, { gaten: [], opm: '2 gaten voor de bouten' }));
  }
  b.groep(oud);
  // bouten door de flens en het stuk A / B (langs de ligger)
  const asv = [0, 0, 0]; asv[ax] = 1;
  for (const [F, S, e] of [[fl[0], A, pa], [fl[1], B, pb]]) {
    const zTop = opt.omhoog ? e[2] - P.h / 2 + hFl : e[2] + P.h / 2;
    const zs = !dirs.includes(2) ? [e[2]] : hFl < 90 ? [zTop - hFl / 2] : [zTop - 22, zTop - hFl + 22];
    const pts = zs.map((z) => { const q = [...e]; if (dirs.includes(2)) q[2] = z; return q; });
    const bd = b.V.bout === 'boutM16' ? 17 : 13;
    for (const q of pts) { F.gaten.push({ d: bd, p: q, x: q[F.as.l] - F.mn[F.as.l], y: q[F.as.b] - F.mn[F.as.b] }); if (S.soort === 'staaf') gat(S, q, bd, Math.abs(S.v[ax]) > 0.5 ? 'v' : 'w'); }
    b.bout(naam, S.groep, g, e, asv, { punten: pts, lengte: (S.P?.b ?? 60) + 2 * t + 30, uit: mul(asv, -s * (S === A ? -1 : 1) * 120), F: opt.F ?? 0 });
  }
  st.flenzen = fl;
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
  b.plaat('J-hook rugplaat', [x - a / 2, yf + kant * t, z0 - 30], [x + a / 2, yf, zb + 130], { opm: 'r 2,5 op alle randen' });
  b.plaat('J-hook schoor', [x - t / 2, yf + kant * (t + 70), zb - t - 60], [x + t / 2, yf + kant * t, zb - t], { vorm: 'driehoek', opm: 'driehoekig schoorschot onder de bodem' });
  b.plaat('J-hook bodem', [x - a / 2, yf + kant * (t + 75), zb - t], [x + a / 2, yf + kant * t, zb]);
  b.plaat('J-hook lip', [x - a / 2, yf + kant * (t + 75 + t), zb - t], [x + a / 2, yf + kant * (t + 75), zb + 32], { opm: 'lip 32 mm boven de bodem, 22 mm boven de UHMW' });
  b.staaf('J-hook pen', `r${pin}`, [x, yf + kant * t, zGat], [x, yf - kant * (S.P.t + 18), zGat], { in: S.id, kap: false, opm: 'gelast in de rugplaat' });
  b.koop('uhmw', 1, [balk([x, yf + kant * t, zb + 5], [x, yf + kant * (t + 75), zb + 5], X, a - 6, 10, false, 'uhmw')], { naam: `UHMW-strip ${a - 6} x 75 x 10 op de J-hook`, oppervlak: ((a - 6) * 75) / 1e6 });
  b.groep(oud);
  b.pen(naam, [x, yf, zGat], [0, kant, 0], { d: pin, F: 0, snedes: 1, factor: 'vanghaak', a: S.groep, b: naam, uit: [0, kant * 140, 0] });
  return zb + 10;
}
/** safety tussen een voorste en een achterste staander (langs y), op de gatenhoogte zGat: koker + kopplaten + pennen */
export function safety(b, Sf, Sb, zGat, naam = 'Safety') {
  const oud = b.huidig, t = b.V.plaat, rol = 'ligger', P = b.P(rol), x = Sf.a[0], [, fmx] = doos(Sf), [bmn] = doos(Sb), pin = b.V.pin;
  b.groep(naam);
  const y0 = fmx[1] + 1, y1 = bmn[1] - 1, zc = zGat;
  b.plaat('Kopplaat safety', [x - P.b / 2, y0, zc - P.h / 2 - 10], [x + P.b / 2, y0 + t, zc + P.h / 2]);
  b.plaat('Kopplaat safety', [x - P.b / 2, y1 - t, zc - P.h / 2 - 10], [x + P.b / 2, y1, zc + P.h / 2]);
  const s = b.staaf(`${naam} (koker)`, rol, [x, y0 + t, zc - 5], [x, y1 - t, zc - 5]);
  for (const [y, k] of [[y0, -1], [y1, 1]]) b.staaf('Pen safety', `r${pin}`, [x, y, zc], [x, y + k * ((k < 0 ? Sf : Sb).P.t + 20), zc], { in: (k < 0 ? Sf : Sb).id, kap: false });
  b.koop('uhmw', 1, [balk([x, y0 + t, zc + P.h / 2 - 5 + 5], [x, y1 - t, zc + P.h / 2 - 5 + 5], X, P.b - 4, 10, false, 'uhmw')], { naam: `UHMW-strip ${P.b - 4} x ${Math.round(y1 - y0 - 2 * t)} x 10 op de safety`, oppervlak: ((P.b - 4) * (y1 - y0)) / 1e6 });
  b.groep(oud);
  b.pen(`${naam} voor`, [x, y0, zc], Y, { d: pin, snedes: 1, factor: 'vanghaak', a: Sf.groep, b: naam, uit: [0, 0, 180] });
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
    uit.push(balk([p[0], p[1], mn[2] - 12], [p[0], p[1], mn[2]], X, 50, 50, true, 'rubber'));
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
