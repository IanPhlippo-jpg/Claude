// Vrije vormen voor het model (v5 A2): gebogen buizen (een hartlijn met rechte benen en bogen met buigradius R) en
// lasersnijplaten met een vrije contour (hoekpunten met afrondingsstraal, uitsparingen). Alles rekent in mm en geeft
// zowel de bemonsterde vorm (3D, botsing, gatcontrole) als de exacte vorm (DXF met bogen, stukblad) terug. Node en browser.

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** v rond de eenheidsas k draaien over hoek a (Rodrigues) */
const draai = (v, k, a) => add(add(mul(v, Math.cos(a)), mul(cross(k, v), Math.sin(a))), mul(k, dot(k, v) * (1 - Math.cos(a))));

/** het vlak van een hartlijn (normaal), of null als alle punten op één lijn liggen */
export function padVlak(pts) {
  for (let i = 1; i < pts.length - 1; i++) { const n = cross(sub(pts[i], pts[i - 1]), sub(pts[i + 1], pts[i])); if (len(n) > 1e-6 * len(sub(pts[i], pts[i - 1])) * len(sub(pts[i + 1], pts[i]))) return norm(n); }
  return null;
}

/**
 * gebogen buis: hoekpunten pts (theoretische snijpunten van de benen), buigradius R (hartlijn). Elke binnenhoek wordt
 * een boog die aan beide benen raakt. Geeft { stalen: [{ p, t, s }], L (gestrekte lengte), bochten: [graden], benen:
 * [rechte lengtes], T: [raaklengte per hoek] }. Gooit een fout als een been te kort is voor de bogen.
 */
export function buigPad(pts, R, stap = 7.5) {
  const n = pts.length, dirs = [];
  for (let i = 0; i < n - 1; i++) dirs.push(norm(sub(pts[i + 1], pts[i])));
  const th = [0], T = [0];
  for (let i = 1; i < n - 1; i++) { const a = Math.acos(Math.max(-1, Math.min(1, dot(dirs[i - 1], dirs[i])))); th.push(a); T.push(a < 1e-6 ? 0 : R * Math.tan(a / 2)); }
  th.push(0); T.push(0);
  const stalen = [], benen = [], bochten = [];
  let s = 0;
  for (let i = 0; i < n - 1; i++) {
    const a = add(pts[i], mul(dirs[i], T[i])), b = sub(pts[i + 1], mul(dirs[i], T[i + 1])), Lr = dot(sub(b, a), dirs[i]);
    if (Lr < -0.5) throw new Error(`been ${i + 1} te kort voor de buigradius R${Math.round(R)} (${Math.round(len(sub(pts[i + 1], pts[i])))} mm < ${Math.round(T[i] + T[i + 1])} mm)`);
    if (i === 0) stalen.push({ p: a, t: dirs[0], s: 0 });
    s += Math.max(0, Lr); stalen.push({ p: b, t: dirs[i], s, recht: true }); benen.push(Math.max(0, Lr));
    const h = th[i + 1];
    if (i < n - 2 && h > 1e-6) {
      const d1 = dirs[i], d2 = dirs[i + 1], k = norm(cross(d1, d2)), C = add(pts[i + 1], mul(norm(sub(d2, d1)), R / Math.cos(h / 2))), r0 = sub(b, C);
      const m = Math.max(2, Math.ceil((h * 180) / Math.PI / stap));
      for (let j = 1; j <= m; j++) { const a2 = (h * j) / m; stalen.push({ p: add(C, draai(r0, k, a2)), t: draai(d1, k, a2), s: s + R * a2, boog: true }); }
      s += R * h; bochten.push((h * 180) / Math.PI);
    }
  }
  return { stalen, L: s, bochten, benen, T, dirs };
}
/** punt en richting op de gestrekte lengte s van een gebogen staaf d (d.pad, d.vlak) */
export function puntOp(d, s) {
  const st = d.pad;
  let i = 1; while (i < st.length - 1 && st[i].s < s) i++;
  const a = st[i - 1], b = st[i], f = b.s > a.s ? Math.max(0, Math.min(1, (s - a.s) / (b.s - a.s))) : 0;
  const p = add(a.p, mul(sub(b.p, a.p), f)), u = norm(add(mul(a.t, 1 - f), mul(b.t, f))), v = d.vlak, w = cross(u, v);
  return { p, u, v, w };
}

// ---------------------------------------------------------------- vrije contour (2D)
/**
 * contour met afrondingen: hoekpunten [[x, y, r?], ...] (tegen de klok in of met de klok mee), r = straal van de
 * afronding in dat hoekpunt. Geeft { punten: bemonsterd, segmenten: [{ x, y, bulge }] (DXF-polylijn: bulge = tan(θ/4)
 * van de boog die in dit punt begint), omtrek }.
 */
export function afronden(hoekpunten, perKwart = 6) {
  const n = hoekpunten.length, P = hoekpunten.map(([x, y]) => [x, y]), segm = [], pts = [];
  const opp = P.reduce((t, p, i) => t + p[0] * P[(i + 1) % n][1] - P[(i + 1) % n][0] * p[1], 0) / 2, ccw = opp > 0;
  for (let i = 0; i < n; i++) {
    const r = hoekpunten[i][2] ?? 0, p = P[i], a = P[(i - 1 + n) % n], c = P[(i + 1) % n];
    const d1 = [p[0] - a[0], p[1] - a[1]], d2 = [c[0] - p[0], c[1] - p[1]], l1 = Math.hypot(...d1), l2 = Math.hypot(...d2);
    const u1 = [d1[0] / l1, d1[1] / l1], u2 = [d2[0] / l2, d2[1] / l2], th = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    if (!r || th < 1e-4) { segm.push({ x: p[0], y: p[1], bulge: 0 }); pts.push(p); continue; }
    const T = Math.min(r * Math.tan(th / 2), l1 / 2, l2 / 2), rr = T / Math.tan(th / 2), t1 = [p[0] - u1[0] * T, p[1] - u1[1] * T], t2 = [p[0] + u2[0] * T, p[1] + u2[1] * T];
    const links = u1[0] * u2[1] - u1[1] * u2[0] > 0; // bocht naar links
    segm.push({ x: t1[0], y: t1[1], bulge: (links ? 1 : -1) * Math.tan(th / 4) }, { x: t2[0], y: t2[1], bulge: 0 });
    const nrm = links ? [-u1[1], u1[0]] : [u1[1], -u1[0]], C = [t1[0] + nrm[0] * rr, t1[1] + nrm[1] * rr], a0 = Math.atan2(t1[1] - C[1], t1[0] - C[0]), m = Math.max(2, Math.ceil(((th * 2) / Math.PI) * perKwart));
    for (let j = 0; j <= m; j++) { const a2 = a0 + (links ? 1 : -1) * th * (j / m); pts.push([C[0] + rr * Math.cos(a2), C[1] + rr * Math.sin(a2)]); }
  }
  let omtrek = 0; for (let i = 0; i < pts.length; i++) { const q = pts[(i + 1) % pts.length]; omtrek += Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]); }
  void ccw;
  return { punten: pts, segmenten: segm, omtrek };
}
/** cirkel als contour (gat of ronde uitsparing) */
export const cirkelPunten = (x, y, r, n = 24) => Array.from({ length: n }, (_, i) => [x + r * Math.cos((i * 2 * Math.PI) / n), y + r * Math.sin((i * 2 * Math.PI) / n)]);
/** ligt punt q binnen de veelhoek? */
export function binnen(q, poly) {
  let in_ = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (yi > q[1] !== yj > q[1] && q[0] < ((xj - xi) * (q[1] - yi)) / (yj - yi) + xi) in_ = !in_; }
  return in_;
}
/** kortste afstand van punt q tot de rand van de veelhoek */
export function randAfstand(q, poly) {
  let m = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], d = [b[0] - a[0], b[1] - a[1]], l2 = d[0] ** 2 + d[1] ** 2, t = l2 ? Math.max(0, Math.min(1, ((q[0] - a[0]) * d[0] + (q[1] - a[1]) * d[1]) / l2)) : 0;
    m = Math.min(m, Math.hypot(q[0] - a[0] - t * d[0], q[1] - a[1] - t * d[1]));
  }
  return m;
}
/** de contour in n banden langs y (voor de botsingscontrole): [{ y0, y1, x0, x1 }] met de breedte van de vorm in de band */
export function banden(poly, n = 10) {
  const ys = poly.map((p) => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys), uit = [];
  for (let i = 0; i < n; i++) {
    const a = y0 + ((y1 - y0) * i) / n, b = y0 + ((y1 - y0) * (i + 1)) / n, xs = [];
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k], q = poly[(k + 1) % poly.length];
      if (p[1] >= a && p[1] <= b) xs.push(p[0]);
      for (const yy of [a, b]) if ((p[1] - yy) * (q[1] - yy) < 0) xs.push(p[0] + ((q[0] - p[0]) * (yy - p[1])) / (q[1] - p[1]));
    }
    if (xs.length >= 2) uit.push({ y0: a, y1: b, x0: Math.min(...xs), x1: Math.max(...xs) });
  }
  return uit;
}
