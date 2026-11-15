// Het model van een fitnesstoestel: een kleine bouwtaal (staaf, plaat, kooponderdeel, kussen, katrol, kabel,
// gewichtstapel, bout, pen) waarmee elk toestel in rekken/banken/kabel/plate.mjs zichzelf opbouwt in mm
// (x = breedte naar rechts, y = diepte naar achter, z = hoogte). Daarna zoekt het model de lassen (stalen delen van
// dezelfde lasgroep die elkaar raken), de open buisuiteinden (eindkap), de buitenmaten, de massa en het zwaartepunt.
// Alle tekeningen, de stuklijst, de berekening en de 3D lezen hetzelfde model. Node en browser.
import { PROFIEL, KOOP, VERSIE, kapVoor } from './onderdelen.mjs';

// ---------------------------------------------------------------- vectoren
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
const r1 = (v) => Math.round(v * 10) / 10;

/** de standaard breedterichting v van een staaf langs u: horizontaal en dwars, of x bij een verticale staaf */
export function standaardV(u) {
  if (Math.abs(u[2]) > 0.999) return X;
  if (Math.abs(u[0]) > 0.999) return Y;
  if (Math.abs(u[1]) > 0.999) return X;
  const h = norm([-u[1], u[0], 0]); // horizontaal, loodrecht op u
  return len(h) > 0.1 ? h : X;
}
/** een balk: van a naar b, doorsnede bw (langs v) x bh (langs w = u x v); rond = cilinder */
export function balk(a, b, v, bw, bh, rond = false, kleur = 'frame', extra = {}) {
  const u = norm(sub(b, a)); let vv = norm(sub(v, mul(u, dot(v, u)))); if (len(sub(v, mul(u, dot(v, u)))) < 1e-6) vv = standaardV(u);
  return { a, b, u, v: vv, w: cross(u, vv), bw, bh, rond, kleur, ...extra };
}
/** de hoekpunten van een balk (een ronde als 12-hoek) */
export function hoeken(g) {
  const pts = [];
  const nz = g.zes ? 6 : 12;
  const doorsnede = g.rond || g.zes ? Array.from({ length: nz }, (_, i) => [Math.cos((i * 2 * Math.PI) / nz) * g.bw / 2, Math.sin((i * 2 * Math.PI) / nz) * g.bh / 2]) : [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([p, q]) => [(p * g.bw) / 2, (q * g.bh) / 2]);
  for (const e of [g.a, g.b]) for (const [p, q] of doorsnede) pts.push(add(e, add(mul(g.v, p), mul(g.w, q))));
  return pts;
}
export function aabb(g) {
  const h = hoeken(g), mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const p of h) for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], p[i]); mx[i] = Math.max(mx[i], p[i]); }
  return [mn, mx];
}
const asRecht = (g) => [g.u, g.v].every((d) => Math.max(...d.map(Math.abs)) > 0.9999);
const doosRaakt = ([a0, a1], [b0, b1], tol = 0.6) => [0, 1, 2].every((i) => a0[i] <= b1[i] + tol && b0[i] <= a1[i] + tol);
const doosSnede = ([a0, a1], [b0, b1]) => [0, 1, 2].map((i) => Math.max(0, Math.min(a1[i], b1[i]) - Math.max(a0[i], b0[i])));
const inDoos = (p, [m0, m1], r) => [0, 1, 2].every((i) => p[i] >= m0[i] - r && p[i] <= m1[i] + r);

/** raken twee balken elkaar? geeft null of { lengte, p } (lengte = geschatte laslengte) */
export function contact(g1, g2, tol = 0.6) {
  const A = aabb(g1), B = aabb(g2);
  if (!doosRaakt(A, B, tol)) return null;
  if (asRecht(g1) && asRecht(g2)) {
    const s = doosSnede([A[0].map((x) => x - tol), A[1].map((x) => x + tol)], [B[0].map((x) => x - tol), B[1].map((x) => x + tol)]).sort((p, q) => q - p);
    const p = [0, 1, 2].map((i) => (Math.max(A[0][i], B[0][i]) + Math.min(A[1][i], B[1][i])) / 2);
    return { lengte: 2 * (s[0] + s[1]) - 8 * tol, p };
  }
  // een schuine balk: eerst de uiteinden, dan punten langs de hartlijn (raakt hij met zijn zijkant een ander stuk)
  for (const [s, o, Bo] of [[g1, g2, B], [g2, g1, A]]) {
    if (asRecht(s) && !asRecht(o)) continue;
    const r = Math.max(s.bw, s.bh) / 2 + tol + 0.5;
    for (const e of [s.a, s.b]) if (inDoos(e, Bo, Math.max(s.bw, s.bh) / 2 + 1.5)) return { lengte: (s.rond ? Math.PI * s.bw : 2 * (s.bw + s.bh)) * 1.15, p: e };
    const L = len(sub(s.b, s.a)), n = Math.max(2, Math.ceil(L / 15));
    // twee schuine balken: punten langs de hartlijn in het lokale assenstelsel van de andere balk
    const inO = asRecht(o) ? (p) => inDoos(p, Bo, r) : (p) => { const c = mul(add(o.a, o.b), 0.5), q = sub(p, c), Lo = len(sub(o.b, o.a)); return Math.abs(dot(q, o.u)) <= Lo / 2 + tol && Math.abs(dot(q, o.v)) <= o.bw / 2 + r && Math.abs(dot(q, o.w)) <= o.bh / 2 + r; };
    for (let i = 1; i < n; i++) { const p = add(s.a, mul(sub(s.b, s.a), i / n)); if (inO(p)) return { lengte: o.rond ? Math.PI * o.bw : 2 * (o.bw + o.bh), p }; }
  }
  return null;
}

// ---------------------------------------------------------------- de bouwer
export function bouwer(V, stand = 0) {
  const o = { stand, V, delen: [], koop: [], kussens: [], katrollen: [], kabels: [], stapels: [], bouten: [], pennen: [], lasten: [], reken: [], toetsen: [], trek: [], spleten: [], toon: [], context: [], gebruiker: null, notities: [], muur: null };
  let groep = 'frame', nr = 0;
  const P = (rol) => PROFIEL[V.P[rol] ?? rol] ?? (() => { throw new Error(`profiel ${rol}`); })();
  const b = {
    V, o, P, stand,
    groep(g) { groep = g; return b; },
    get huidig() { return groep; },
    /** staaf van a naar b (hartlijn); opt: { v, gaten: [{ s, d, as: 'v'|'w', n? }], verstek: [α, β], rol, kap: false } */
    staaf(naam, rol, a, bb, opt = {}) {
      const Pf = P(rol), g = balk(a, bb, opt.v ?? standaardV(norm(sub(bb, a))), Pf.b, Pf.h, Pf.vorm === 'buis' || Pf.vorm === 'rond');
      if (Pf.vorm === 'koker') g.r = Math.min(2 * Pf.t, Math.min(Pf.b, Pf.h) / 4); // buitenhoekradius EN 10219-2 (2t)
      const d = { id: `d${++nr}`, soort: 'staaf', naam, groep: opt.groep ?? groep, prof: Pf.id, P: Pf, a, b: bb, u: g.u, v: g.v, w: g.w, L: len(sub(bb, a)), verstek: opt.verstek ?? [0, 0], gaten: (opt.gaten ?? []).map((x) => ({ as: 'w', door: Pf.vorm === 'koker' || Pf.vorm === 'buis' ? 2 : 1, ...x })), geo: [g], kapNodig: opt.kap ?? true, opm: opt.opm ?? '', in: opt.in ?? null, rol: opt.rol ?? rol, westside: opt.westside ?? null };
      o.delen.push(d); return d;
    },
    /** plaat als doos van p0 tot p1 (een van de drie maten is de dikte); opt: { gaten: [{ p: [x,y,z], d }], rond, vorm, opm } */
    plaat(naam, p0, p1, opt = {}) {
      const mn = [0, 1, 2].map((i) => Math.min(p0[i], p1[i])), mx = [0, 1, 2].map((i) => Math.max(p0[i], p1[i])), dim = [0, 1, 2].map((i) => mx[i] - mn[i]);
      const as = [0, 1, 2].sort((i, j) => dim[i] - dim[j]), [ti, bi, li] = as; // dikte, breedte, lengte
      const c = mn.map((x, i) => (x + mx[i]) / 2), ea = [...c], eb = [...c]; ea[li] = mn[li]; eb[li] = mx[li];
      const vv = [0, 0, 0]; vv[bi] = 1;
      const g = balk(ea, eb, vv, dim[bi], dim[ti], !!opt.rond, opt.kleur ?? 'frame');
      // w van de balk moet langs de dikte liggen: anders draaien we v om
      if (Math.abs(g.w[ti]) < 0.5) { g.v = [0, 0, 0]; g.v[ti] = 1; g.w = cross(g.u, g.v); g.bw = dim[ti]; g.bh = dim[bi]; }
      if (opt.rond) { const ta = [...c], tb = [...c]; ta[ti] = mn[ti]; tb[ti] = mx[ti]; const vv2 = [0, 0, 0]; vv2[bi] = 1; Object.assign(g, balk(ta, tb, vv2, dim[li], dim[bi], true, opt.kleur ?? 'frame')); }
      const gaten = (opt.gaten ?? []).map((x) => ({ d: x.d, p: x.p, x: x.p[li] - mn[li], y: x.p[bi] - mn[bi], sleuf: x.sleuf ?? 0 }));
      const d = { id: `d${++nr}`, soort: 'plaat', naam, groep: opt.groep ?? groep, t: r1(dim[ti]), l: r1(dim[li]), bmaat: r1(dim[bi]), mn, mx, as: { t: ti, b: bi, l: li }, gaten, rond: !!opt.rond, vorm: opt.vorm ?? null, geo: [g], opm: opt.opm ?? '', in: opt.in ?? null, kleur: opt.kleur ?? 'frame', laser: opt.laser ?? true, stapel: !!opt.stapel };
      o.delen.push(d); return d;
    },
    /** kooponderdeel: key uit KOOP, aantal n, vormen (balken) voor de 3D en de tekening */
    koop(key, n, geo = [], opt = {}) {
      if (!KOOP[key]) throw new Error(`kooponderdeel ${key}`);
      const d = { id: `k${++nr}`, soort: 'koop', key, n, naam: opt.naam ?? KOOP[key].naam, groep: opt.groep ?? groep, geo, opm: opt.opm ?? '', meter: opt.meter ?? null, oppervlak: opt.oppervlak ?? null };
      o.koop.push(d); return d;
    },
    /** kussen: onderkant langs a-b (hartlijn), n = de normaal naar de gebruiker; multiplex 18 + schuim + kunstleer */
    kussen(naam, a, bb, n, breedte, dikte = 68, opt = {}) {
      const u = norm(sub(bb, a)), nn = norm(n), v = cross(nn, u), off = mul(nn, dikte / 2);
      const g = balk(add(a, off), add(bb, off), v, breedte, dikte, false, 'leer', { kussen: true }), gm = balk(add(a, mul(nn, 9)), add(bb, mul(nn, 9)), v, breedte - 4, 18, false, 'hout');
      const d = { id: `p${++nr}`, soort: 'kussen', naam, groep: opt.groep ?? groep, a, b: bb, n: nn, L: len(sub(bb, a)), breedte, dikte, mp: 18, schuim: dikte - 18, geo: [g], geoMp: gm, inslag: opt.inslag ?? 4, rol: opt.rol ?? false };
      o.kussens.push(d); return d;
    },
    /** katrol met middelpunt c, as langs 'as', diameter uit de versie; met vingerbescherming (kap) als gevraagd */
    katrol(naam, c, as, opt = {}) {
      const key = opt.key ?? V.katrol, D = KOOP[key].D, ax = norm(as), t = 26;
      // katrol: twee flenzen en een kern met de kabelgroef, as M10 door de beugel met sluitring en borgmoer
      const sv = standaardV(ax), q = (s, e) => [add(c, mul(ax, s)), add(c, mul(ax, e))];
      const geo = [balk(...q(-t / 2, -4), sv, D, D, true, 'katrol'), balk(...q(-4, 4), sv, D - 12, D - 12, true, 'katrol', { groef: true }), balk(...q(4, t / 2), sv, D, D, true, 'katrol'), balk(...q(-t / 2 - 8, t / 2 + 8), sv, 10, 10, true, 'zink'),
        balk(...q(t / 2 + 6, t / 2 + 8), sv, 20, 20, true, 'ring'), balk(...q(t / 2 + 8, t / 2 + 16), sv, 17, 17, false, 'zink', { zes: true }), balk(...q(-t / 2 - 14, -t / 2 - 6), sv, 17, 17, false, 'zink', { zes: true })];
      const k = { id: `r${++nr}`, soort: 'koop', key, n: 1, naam: `${KOOP[key].naam}: ${naam}`, groep, geo, katrol: true, c, as: ax, D, label: naam, kap: opt.kap ?? true, opm: '' };
      o.koop.push(k); o.katrollen.push(k);
      b.koop('boutM10', 1, [], { naam: `As katrol ${naam}: bout M10 + borgmoer`, opm: 'as door de beugel' });
      return k;
    },
    /** kabel langs punten: [{ p } | katrol]; begin = 'stapel'/'anker', einde = 'greep'; last in kg aan de stapel */
    kabel(naam, route, opt = {}) {
      const pts = route.map((x) => (x.katrol ? { p: x.c, katrol: x.id, label: x.label, r: x.D / 2, k: x } : x));
      // de kabel raakt elke katrol aan de buitenkant van de bocht: in- en uitloop-raakpunt
      const lijn = [pts[0].p];
      let L = 0;
      for (let i = 1; i < pts.length - 1; i++) {
        const q = pts[i]; if (!q.katrol) { lijn.push(q.p); continue; }
        const d1 = norm(sub(q.p, pts[i - 1].p)), d2 = norm(sub(pts[i + 1].p, q.p));
        const n1 = sub(d2, mul(d1, dot(d1, d2))), n2 = sub(d1, mul(d2, dot(d1, d2)));
        const tin = len(n1) < 1e-6 ? q.p : sub(q.p, mul(norm(n1), q.r)), tuit = len(n2) < 1e-6 ? q.p : add(q.p, mul(norm(n2), q.r));
        q.in = tin; q.uit = tuit; lijn.push(tin, tuit);
        // een kunststof katrol die te zwaar belast wordt (R = F·|d2 − d1|): de aluminium versie
        const Rk = ((opt.last ?? 0) * 9.81 / (opt.overbrenging ?? 1)) * len(sub(d2, d1));
        if (q.k && !q.k.key.endsWith('pro') && Rk > 0.9 * KOOP[q.k.key].kN * 1000) { const nk = q.k.key === 'katrol90' ? 'katrol90pro' : 'katrol115pro'; q.k.key = nk; q.k.naam = `${KOOP[nk].naam}: ${q.k.label} (zwaar belast)`; }
        L += q.r * Math.acos(Math.max(-1, Math.min(1, dot(d1, d2))));
      }
      lijn.push(pts[pts.length - 1].p);
      for (let i = 1; i < lijn.length; i++) L += len(sub(lijn[i], lijn[i - 1]));
      const key = opt.key ?? V.kabel, dk = KOOP[key].d;
      const k = { naam, route: pts, lijn, L, key, d: dk, overbrenging: opt.overbrenging ?? 1, last: opt.last ?? 0, begin: opt.begin ?? 'stapel', einde: opt.einde ?? 'greep', slag: opt.slag ?? 0 };
      o.kabels.push(k);
      // de kabel zelf (op lengte + 2 x 150 voor de lussen), persklemmen, kous, eindstuk en karabijn
      b.koop(key, 1, lijn.slice(1).map((q, i) => balk(lijn[i], q, standaardV(norm(sub(q, lijn[i]))), dk, dk, true, 'kabel')).filter((g) => len(sub(g.b, g.a)) > 1), { naam: `${KOOP[key].naam}: ${naam}`, meter: Math.ceil((L + 300) / 100) / 10 });
      b.koop(V.kabeleind, 2, [], { naam: 'Geperst eindstuk met oog (kabel op lengte geleverd, met trekproef)' }); b.koop('karabijn', 1); b.koop(V.wartel, 1);
      return k;
    },
    /** gewichtstapel tussen twee geleidestangen (x-afstand 'hoh'), onderkant op z0; geeft { top, stang } */
    stapel(naam, c, z0, opt = {}) {
      const n = opt.n ?? V.stapelN, kg = V.stapelKg, w = 340, dpl = opt.dpl ?? 112, t = 20, hoh = opt.hoh ?? 220, slag = opt.slag ?? 600, H = opt.hoogte ?? 0;
      const dz = (b.stand ?? 0) * slag, mn = [c[0] - w / 2, c[1] - dpl / 2, z0 + 60 + dz];
      const plts = [];
      groep = `stapel ${naam}`;
      // rubberbuffers onder de stapel
      b.koop('buffer', 2, [-1, 1].map((s) => balk([c[0] + s * 80, c[1], z0], [c[0] + s * 80, c[1], z0 + 45], X, 50, 50, true, 'rubber')));
      for (let i = 0; i < n; i++) {
        const z = mn[2] - 15 + i * t;
        plts.push(b.plaat(`Stapelplaat ${kg} kg`, [mn[0], mn[1], z], [mn[0] + w, mn[1] + dpl, z + t], { gaten: [{ p: [c[0] - hoh / 2, c[1], z], d: 32 }, { p: [c[0] + hoh / 2, c[1], z], d: 32 }, { p: [c[0], c[1], z], d: 21 }], kleur: 'stapel', stapel: true, opm: 'gaten Ø32 met een kunststof bus Ø25/32 (geen staal op staal); zijgat Ø11 tot het middengat (selectiepen); kanten r 2' }));
      }
      const top = mn[2] - 15 + n * t;
      // bovenplaat met de stapelstang (Ø20, gat Ø11 om de 20 mm) en de kabelaanslag
      plts.push(b.plaat('Bovenplaat stapel', [mn[0], mn[1] - 10, top], [mn[0] + w, mn[1] + dpl + 10, top + 25], { gaten: [{ p: [c[0] - hoh / 2, c[1], top], d: 40 }, { p: [c[0] + hoh / 2, c[1], top], d: 40 }, { p: [c[0], c[1], top], d: 21 }], kleur: 'stapel', stapel: true, opm: 'lineaire lagers in de gaten Ø27 (of glijbussen); stang erin gelast' }));
      for (const ox of opt.ogen ?? [0]) plts.push(b.plaat('Kabeloog stapel', [c[0] + ox - 5, c[1] - 25, top + 25], [c[0] + ox + 5, c[1] + 25, top + 75], { gaten: [{ p: [c[0] + ox, c[1], top + 55], d: 13 }], stapel: true, kleur: 'stapel', opm: 'oog voor de karabijn van de kabel; op de bovenplaat gelast' }));
      // lagerbus boven op de bovenplaat: het lineaire lager (Ø40 x 58) steunt over zijn hele lengte
      for (const sx of [-1, 1]) { const lb = b.staaf('Lagerbus stapel', 'b48x8', [c[0] + sx * hoh / 2, c[1], top + 25], [c[0] + sx * hoh / 2, c[1], top + 25 + 35], { kap: false, opm: 'buis 48,3x8 uitgedraaid Ø40 H7, rondom op de bovenplaat gelast; LM25UU erin met borgring DIN 472' }); lb.stapel = true; lb.kleur = 'stapel'; plts.push(lb); }
      const stem = b.staaf('Stapelstang (selectie)', 'r20', [c[0], c[1], mn[2] - 15 + 10], [c[0], c[1], top + 25], { gaten: Array.from({ length: n }, (_, i) => ({ s: 10 + i * t, d: 11, as: 'v' })), kap: false, in: 'stapel', opm: `${n} gaten Ø11 om de ${t} mm` });
      b.koop(V.lineair, 2, [], { naam: `${KOOP[V.lineair].naam} in de lagerbussen van de bovenplaat` });
      b.koop('stapelbus', 2 * n, [], { naam: 'Kunststof bus Ø25/32 x 20 in de stapelplaten' });
      b.koop('stapelsticker', n, [], { naam: `Sticker met het gewicht (${kg} kg) op elke stapelplaat` });
      const zs = mn[2] - 15 + 6 * t + 10;
      b.koop(V.selectiepen, 1, [balk([c[0], c[1] - dpl / 2 - 2, zs], [c[0], c[1] + 30, zs], X, 10, 10, true, 'chroom'), balk([c[0], c[1] - dpl / 2 - 30, zs], [c[0], c[1] - dpl / 2 - 2, zs], X, 28, 28, true, 'rubber')]);
      groep = opt.terug ?? 'frame';
      // geleidestangen tot tegen de bovenligger
      const zt = H || top + slag + 120;
      const stang = [-1, 1].map((s) => b.koop('stang25', 1, [balk([c[0] + (s * hoh) / 2, c[1], z0], [c[0] + (s * hoh) / 2, c[1], zt], X, 25, 25, true, 'chroom')], { naam: `Geleidestang Ø25 h6, ${Math.round(zt - z0)} mm`, meter: Math.round(zt - z0) / 1000 }));
      for (const sx of [-1, 1]) for (const [za, zb2, nm] of [[z0, z0 + 10, 'onder']]) b.plaat(`Klemblok geleidestang ${nm}`, [c[0] + sx * hoh / 2 - 40, c[1] - 40, za], [c[0] + sx * hoh / 2 + 40, c[1] + 40, zb2], { gaten: [{ p: [c[0] + sx * hoh / 2, c[1], za], d: 25 }], opm: 'klemblok 80 x 80 x 10: gat Ø25 H7, zaagsnede en klembout M8; op de ligger gelast' });
      b.koop('boutM8', 2, [], { naam: 'Klembout M8 (klemblokken geleidestangen onder)' });
      b.koop('moerM12', 2, [], { naam: 'Boven: draadeind M12 x 30 in de kop van de geleidestang, door de onderwand van de bovenligger (gat Ø14), moer M12 + ring via een montagegat Ø32 in de zijwand' });
      const extraKg = Math.round(((w * dpl * 25 - 2 * Math.PI * 400 - Math.PI * 110) * 7.85e-6 + (n * t + 35) * 2.47e-3 + 2 * 0.35 * 2.0 + 0.5) * 10) / 10;
      const s = { naam, n, kg, extraKg, last: n * kg, c, z0, top: top + 25, oog: (x = 0) => [c[0] + x, c[1], top + 55], slag, dz, hoh, w, dpl, platen: plts, stem, stang, zt, zone: [[mn[0], mn[1], z0], [mn[0] + w, mn[1] + dpl, top + 25 + slag]] };
      o.stapels.push(s); return s;
    },
    /** schijven op een houder, alleen voor de 3D (niet in de stuklijst): n schijven Ø450 x 50 vanaf p langs as */
    schijven(p, as, n = 2, D = 450, dik = 45) {
      const ax = norm(as);
      for (let i = 0; i < n; i++) o.toon.push(balk(add(p, mul(ax, i * (dik + 2))), add(p, mul(ax, i * (dik + 2) + dik)), standaardV(ax), D, D, true, 'schijf'));
    },
    /** een halterstang op de haken (alleen 3D) */
    stang(a, bb) { o.toon.push(balk(a, bb, standaardV(norm(sub(bb, a))), 28, 28, true, 'chroom')); },
    /** bout(en) tussen twee groepen: p = plaats, as = boutrichting, uit = richting om uit elkaar te schuiven */
    bout(naam, ga, gb, p, as, opt = {}) {
      const key = opt.key ?? V.bout, M = KOOP[key].M, n = opt.n ?? 1, ax = norm(as), lang = opt.lengte ?? 100;
      const punten = opt.punten ?? [p], geo = [];
      for (const q of punten) {
        const e0 = add(q, mul(ax, -lang / 2)), e1 = add(q, mul(ax, lang / 2));
        geo.push(balk(e0, e1, standaardV(ax), M, M, true, 'zink'));
        if (key !== 'anker') { geo.push(balk(add(e0, mul(ax, -0.65 * M)), e0, standaardV(ax), 1.8 * M, 1.8 * M, false, 'zink', { zes: true }), balk(add(e1, mul(ax, -0.85 * M - 2)), add(e1, mul(ax, -2)), standaardV(ax), 1.8 * M, 1.8 * M, false, 'zink', { zes: true })); }
        else geo.push(balk(add(e1, mul(ax, -0.8 * M - 4)), add(e1, mul(ax, -4)), standaardV(ax), 1.8 * M, 1.8 * M, false, 'zink', { zes: true }));
      }
      const k = b.koop(key, n * punten.length, geo, { naam: `${KOOP[key].naam}: ${naam}` });
      o.bouten.push({ naam, a: ga, b: gb, p, punten, as: ax, n: n * punten.length, key, M, lengte: lang, uit: opt.uit ?? mul(ax, 1), F: opt.F ?? 0, snedes: opt.snedes ?? 2, koop: k });
      return k;
    },
    /** pen (pull pin of gelaste pen) in een gat: voor de montage en de afschuiving; F in kg (proeflast komt in bereken) */
    pen(naam, p, as, opt = {}) {
      const d = opt.d ?? V.pin, ax = norm(as), lang = opt.lengte ?? 110;
      const geo = [balk(add(p, mul(ax, -lang / 2)), add(p, mul(ax, lang / 2)), standaardV(ax), d, d, true, 'zink')];
      if (opt.key) { const e = add(p, mul(ax, -lang / 2)); geo.push(balk(add(e, mul(ax, -22)), e, standaardV(ax), d + 12, d + 12, true, 'rubber'), balk(add(e, mul(ax, -30)), add(e, mul(ax, -24)), standaardV(ax), d + 34, d + 34, true, 'ring')); }
      if (opt.key) b.koop(opt.key, opt.n ?? 1, geo, { naam: `${KOOP[opt.key].naam}: ${naam}` });
      o.pennen.push({ naam, p, as: ax, d, lengte: lang, lager: opt.lager ?? 0, gelast: opt.gelast ?? null, F: opt.F ?? 0, snedes: opt.snedes ?? 2, key: opt.key ?? null, factor: opt.factor ?? 'extrinsiek', groep: opt.groep ?? groep, a: opt.a ?? null, b: opt.b ?? null, uit: opt.uit ?? null, t: opt.t ?? null, e: opt.e ?? 0, hoh: opt.hoh ?? 0, geleiding: opt.geleiding ?? null, fy: opt.fy ?? null });
    },
    /** belastinggeval voor de stabiliteit: massa (kg) op p */
    last(wat, kg, p, opt = {}) { o.lasten.push({ wat, kg, p, ...opt }); },
    /** sterktecontrole: stuk (deel), type 'ligger' | 'uitkrager' | 'staander' | 'schijfhouder', L, last in kg, soort proeflast */
    reken(wat, stuk, type, L, kg, opt = {}) { o.reken.push({ wat, stuk, type, L, kg, ...opt }); },
    /** een vrije afstand die de norm controleert (knelpunten) */
    spleet(wat, mm, opt = {}) { o.spleten.push({ wat, mm, ...opt }); },
    /** een rechtstreekse toets die de generator zelf uitrekent (evenwicht, as op buiging, plaat ...): benut = Ed/Rd */
    toets(groep, wat, formule, benut, bron, extra = {}) { o.toetsen.push({ groep, wat, formule, benut, bron, ...extra }); },
    /** horizontale trek (kabel, duwen) voor de kantelcontrole: F in N, op punt p, in richting dir */
    trekLast(wat, F, p, dir) { o.trek.push({ wat, F, p, dir }); },
    /** context voor de 3D en de tekening: vloer, muur */
    muur(y) { o.muur = y; },
    noot(t) { o.notities.push(t); },
  };
  return b;
}

// ---------------------------------------------------------------- na het bouwen
/** lassen, eindkappen, maten, massa en zwaartepunt */
export function afwerken(o) {
  const staal = o.delen;
  // lassen: stalen delen in dezelfde lasgroep die elkaar raken (de stapelstang zit in de bovenplaat)
  o.lassen = [];
  for (let i = 0; i < staal.length; i++) for (let j = i + 1; j < staal.length; j++) {
    const A = staal[i], B = staal[j];
    if (A.groep !== B.groep || (A.stapel && B.stapel)) continue;
    if ((A.stapel || B.stapel) && !/Bovenplaat/.test((A.stapel ? A : B).naam)) continue;
    if (A.geenLas || B.geenLas) continue;
    const c = contact(A.geo[0], B.geo[0]);
    if (!c || c.lengte < 5) continue;
    const plaatPlaat = A.soort === 'plaat' && B.soort === 'plaat';
    const tmin = Math.min(dikte(A), dikte(B)), a = Math.min(o.V.las, Math.max(3, Math.floor(0.7 * tmin)), tmin); // keel ≤ dunste wand (P3-01)
    o.lassen.push({ a: A.id, b: B.id, A, B, lengte: Math.round(c.lengte), p: c.p, keel: a, soort: plaatPlaat ? 'hoek2' : 'hoek', rondom: !plaatPlaat && (A.soort === 'staaf' || B.soort === 'staaf'), groep: A.groep });
  }
  // eindkappen: open koker- of buisuiteinden die niets raken
  const alleGeo = [...staal.flatMap((d) => d.geo.map((g) => ({ g, d }))), ...o.koop.flatMap((d) => d.geo.map((g) => ({ g, d }))), ...o.kussens.flatMap((d) => d.geo.map((g) => ({ g, d })))];
  for (const d of staal) {
    if (d.soort !== 'staaf' || !kapVoor(d.P) || d.kapNodig === false) continue;
    d.kappen = [d.a, d.b].map((e, k) => {
      const eg = balk(add(e, mul(d.u, k ? -2 : 2)), add(e, mul(d.u, k ? 1 : -1)), d.v, d.P.b * 0.6, d.P.h * 0.6);
      return !alleGeo.some((x) => x.d !== d && contact(eg, x.g, 1.2));
    });
  }
  const nKap = {};
  for (const d of staal) for (const open of d.kappen ?? []) if (open) { const kk = kapVoor(d.P); nKap[kk] = (nKap[kk] ?? 0) + 1; }
  for (const [kk, n] of Object.entries(nKap)) o.koop.push({ id: `kap-${kk}`, soort: 'koop', key: kk, n, naam: KOOP[kk].naam, groep: 'afwerking', geo: [], opm: 'open uiteinden (EN ISO 20957-1 §5.3.3)' });
  // maten
  const geo = [...staal.flatMap((d) => d.geo), ...o.koop.flatMap((d) => (d.key?.startsWith('kabel') ? [] : d.geo)), ...o.kussens.flatMap((d) => d.geo)];
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const g of geo) { const [a, b] = aabb(g); for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a[i]); mx[i] = Math.max(mx[i], b[i]); } }
  o.box = [mn, mx];
  o.maten = { B: Math.round(mx[0] - mn[0]), D: Math.round(mx[1] - mn[1]), H: Math.round(mx[2] - mn[2]) };
  o.vloer = (o.maten.B * o.maten.D) / 1e6;
  // massa en zwaartepunt van het toestel zelf
  let m = 0; const zw = [0, 0, 0];
  const telBij = (kg, p) => { m += kg; for (let i = 0; i < 3; i++) zw[i] += kg * p[i]; };
  for (const d of staal) telBij(massa(d), midden(d.geo[0]));
  for (const k of o.kussens) telBij(kussenMassa(k), midden(k.geo[0]));
  for (const k of o.koop) if (k.geo.length && !k.key.startsWith('kabel')) telBij(koopMassa(k), midden(k.geo[0]));
  o.massa = m; o.zwaartepunt = zw.map((x) => x / (m || 1));
  return o;
}
export const dikte = (d) => (d.soort === 'plaat' ? d.t : d.P.vorm === 'rond' ? d.P.b / 2 : d.P.t);
export const midden = (g) => mul(add(g.a, g.b), 0.5);
/** massa van een stalen deel (kg) */
export function massa(d) {
  if (d.soort === 'staaf') return (d.P.kgm * lengteStuk(d)) / 1000;
  const A = d.rond ? (Math.PI / 4) * d.l * d.bmaat : d.l * d.bmaat, gat = d.gaten.reduce((t, g) => t + (Math.PI / 4) * g.d ** 2, 0);
  return ((A - gat) * d.t * 7.85e-6);
}
export const kussenMassa = (k) => (k.L * k.breedte * (18 * 0.55e-6 + (k.dikte - 18) * 0.04e-6)) + 0.5;
const KOOPKG = { katrol90: 0.4, katrol115: 0.6, katrol90pro: 0.5, katrol115pro: 0.8, stang25: 3.85, buffer: 0.1, latbar: 3, latbarThuis: 2.5, schuimrol100: 0.4, zwenkwiel50: 0.2, zwenkwiel75: 0.5 };
export const koopMassa = (k) => (KOOPKG[k.key] ?? 0.1) * (k.meter ?? k.n);
/** zaaglengte van een staaf: hart + de verstekken (lange punt) */
export const lengteStuk = (d) => d.L + (d.P.h / 2) * (Math.tan(((d.verstek[0] ?? 0) * Math.PI) / 180) + Math.tan(((d.verstek[1] ?? 0) * Math.PI) / 180));

// ---------------------------------------------------------------- hulpen voor de toestellen
/** gaten om de 'stap' mm van s0 tot s1 (Westside: 25 mm in de bankzone, 50 mm erbuiten) */
export function gatenRij(s0, s1, stap, d, as = 'w') { const uit = []; for (let s = s0; s <= s1 + 0.01; s += stap) uit.push({ s: Math.round(s * 10) / 10, d, as }); return uit; }
export function westside(z0, bank0, bank1, z1, d, as = 'w') {
  const uit = [];
  for (let s = z0; s < bank0 - 0.1; s += 50) uit.push({ s, d, as });
  for (let s = bank0; s < bank1 - 0.1; s += d >= 20 ? 50 : 25) uit.push({ s, d, as }); // Ø26 (pro): 50 mm, anders raken de gaten elkaar
  for (let s = bank1; s <= z1 + 0.01; s += 50) uit.push({ s, d, as });
  return uit;
}
export { X, Y, Z };
