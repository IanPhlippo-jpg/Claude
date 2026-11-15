// Plate-loaded machines (FP-01 .. FP-12): een hefboom op een as met glijlagers, of een slede op rails, met
// schijfhouders Ø48,3 voor olympische schijven. Maten in mm: x = breedte, y = diepte (0 = voorkant), z = hoogte.
import { staander, ligger, dwarsOp, voetjes, kussenOp, doos, gat, X, Y, Z, balk, add, mul, sub, norm } from './bouwstenen.mjs';

const pro = (b) => b.V.id === 'pro';
const rad = (g) => (g * Math.PI) / 180;
const kruis = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];

/** basis: twee vloerrails langs y (x = ±w/2) van y0 tot y1, en dwarsliggers op de gegeven y's */
function basis(b, w, y0, y1, dwars = []) {
  const P = b.P('ligger'), a = P.b;
  const r1 = b.staaf('Vloerrail', 'ligger', [-w / 2, y0, a / 2], [-w / 2, y1, a / 2]), r2 = b.staaf('Vloerrail', 'ligger', [w / 2, y0, a / 2], [w / 2, y1, a / 2]);
  voetjes(b, r1, 2); voetjes(b, r2, 2);
  const d = dwars.map((y) => ligger(b, 'Dwarsligger', 'ligger', r1, r2, { y, z: a / 2 }));
  return { r1, r2, d, a };
}
/** lagerbus-maten: flensglijlager (buitenmaat, lengte) en de gelaste lagerbus om het lager */
export const LAGER = { glij25: { D: 28, L: 21, bus: 'b38x5' }, glij30: { D: 34, L: 26, bus: 'b44x5' } };
/** lageroren (2 platen) aan weerszijden van een draaipunt op een stuk; as langs x. Op elk oor een gelaste lagerbus
 *  (buis, uitgedraaid H7 voor het flensglijlager; lengte = lagerlengte), zodat het lager over zijn hele lengte steunt. */
function lagerOren(b, piv, breed, naar, opm = 'gat = buitenmaat flensglijlager (H7)', schild = null) {
  const t = b.V.plaat, Lg = LAGER[b.V.lager];
  for (const s of [-1, 1]) {
    const x = piv[0] + s * (breed / 2 + t / 2);
    if (schild) { lagerSchild(b, x, piv, schild, Lg, opm); const xe0 = piv[0] + s * (breed / 2 + t); b.staaf('Lagerbus', Lg.bus, [xe0, piv[1], piv[2]], [xe0 + s * (Lg.L - t), piv[1], piv[2]], { kap: false, in: 'as ', opm: `buis uitgedraaid Ø${Lg.D} H7 over ${Lg.L} mm (lager + oor); rondom op het oor gelast` }); continue; }
    const q0 = [x - t / 2, piv[1] - 65, piv[2] - 65], q1 = [x + t / 2, piv[1] + 65, piv[2] + 65]; // 65 >= 1,5 x Ø (EN 1993-1-8)
    for (let i = 0; i < 3; i++) if (naar[i]) { if (naar[i] > piv[i]) q1[i] = naar[i]; else q0[i] = naar[i]; }
    b.plaat('Lageroor', q0, q1, { gaten: [{ p: [x, piv[1], piv[2]], d: Lg.D }], opm });
    const xe = piv[0] + s * (breed / 2 + t);
    b.staaf('Lagerbus', Lg.bus, [xe, piv[1], piv[2]], [xe + s * (Lg.L - t), piv[1], piv[2]], { kap: false, in: 'as ', opm: `buis uitgedraaid Ø${Lg.D} H7 over ${Lg.L} mm (lager + oor); rondom op het oor gelast` });
  }
  b.koop(b.V.lager, 2, [], { naam: `${b.V.lager === 'glij25' ? 'Flensglijlager iglidur GFM-2528-21' : 'Flensglijlager iglidur GFM-3034-26'} in oor en lagerbus` });
}
/** lagerschild (pro-vormtaal): gelaserd 8-10 mm, rond om het draaipunt (R65), naar de ligger toe breder uitlopend met
 *  een uitsparing; schild = { d: richting naar de ligger (Y of Z), H: afstand draaipunt-liggervlak } */
function lagerSchild(b, x, piv, { d, H }, Lg, opm) {
  const t = b.V.plaat, e = d[2] ? [0, 1, 0] : [0, 0, 1], W = Math.round(65 + 0.55 * (H - 65));
  const yz = (h, q) => [piv[1] + d[1] * h + e[1] * q, piv[2] + d[2] * h + e[2] * q];
  const mid = Math.min(W, 65 + 0.25 * H);
  const hp = [[...yz(-65, -65), 65], [...yz(H * 0.45, -mid), 40], [...yz(H, -W), 0], [...yz(H, W), 0], [...yz(H * 0.45, mid), 40], [...yz(-65, 65), 65]];
  const uits = H >= 150 ? [[[...yz(65 + 18, -32), 14], [...yz(H - 28, -Math.min(W - 30, 60)), 14], [...yz(H - 28, Math.min(W - 30, 60)), 14], [...yz(65 + 18, 32), 14]]] : [];
  b.contour('Lageroor', [x, 0, 0], [0, 1, 0], [0, 0, 1], t, hp, { gaten: [{ x: piv[1], y: piv[2], d: Lg.D }], uitsparingen: uits, banden: 12, opm: `lagerschild ${t} mm, gelaserd met vrije contour (R65 rond het draaipunt) en uitsparing; ${opm}` });
}
/** voetjes op vrije punten (onder een gebogen voetframe): rubber + verborgen draadeind */
function voetPunten(b, punten, naam) {
  const geo = punten.flatMap(([x, y]) => [balk([x, y, -12], [x, y, -5], X, 50, 50, true, 'rubber'), balk([x, y, -5], [x, y, 0], X, 17, 17, false, 'zink', { zes: true })]);
  b.koop(b.V.voetje, punten.length, geo, { naam: `${b.V.voetje === 'voetThuis' ? 'Stelvoet M10' : 'Rubbervoet M10'} onder ${naam}` });
  b.koop('lasmoerM10', punten.length, [], { naam: `Lasmoer M10 in ${naam} voor de stelvoet` });
}
/** voetframe in vlakovaalbuis: één gesloten lus met 4 bochten (plat liggend), naad achteraan in het midden */
function voetLus(b, w, y0, y1, { staand = false } = {}) {
  const F = b.P('frameO'), z = (staand ? F.h : F.b) / 2, R = 3 * (staand ? F.b : F.h);
  // twee helften (elk 2 bochten, past op een staaf van 6 m), voor en achter in het midden stomp gelast en vlak geslepen
  const lus = [-1, 1].map((sx) => b.buis('Voetframe', 'frameO', [[0, y1, z], [(sx * w) / 2, y1, z], [(sx * w) / 2, y0, z], [0, y0, z]], { kap: false, staand, opm: `halve lus in vlakovaalbuis ${staand ? 'staand (hoogte verticaal)' : 'plat'} (2 bochten R${R}); de twee helften voor en achter in het midden stomp gelast en vlak geslepen` }));
  voetPunten(b, [[-w / 2, y0 + R + 80], [w / 2, y0 + R + 80], [-w / 2, y1 - R - 80], [w / 2, y1 - R - 80]], 'het voetframe');
  return { lus, F, R, z, top: 2 * z };
}
export { voetLus, voetPunten, lagerSchild };
/** lagerbok: twee palen (vanaf de vloer, met voetjes) met de lageroren ertussen; kant = -1 (palen vóór de as) of +1 (achter) */
function lagerBok(b, piv, kant = 1, z0 = 0) {
  const a = b.P('ligger').b, t = b.V.plaat, y = piv[1] + kant * (65 + a / 2), uit = [];
  for (const s of [-1, 1]) { const p = staander(b, 'Lagerpaal', 'ligger', piv[0] + s * (60 + t + a / 2), y, z0, piv[2] + 65); if (!z0) voetjes(b, p, 1); uit.push(p); }
  lagerOren(b, piv, 120, [0, piv[1] + kant * (65 + a), 0]); // oren lopen door tot tegen de binnenkant van de palen
  return uit;
}
/** hefboom: naaf (draaibus met 2 eindschijven) op een as die met een spanstift in de naaf vastzit en in de flensglijlagers
 *  van de lageroren draait; armstukken langs de punten (of meerdere takken), schijfhouder(s), greep. slag (graden) = de
 *  draaihoek bij stand 1 (+ = de voorkant zakt); stand 0 ligt op de beginaanslag, stand 1 op de eindaanslag: een nok op
 *  het asuiteinde buiten het lageroor slaat tegen twee rubberbuffers op strips die op het oor gelast zijn.
 *  Geeft ook rot(p) / rotDir(d) terug om extra delen mee te draaien. */
function hefboom(b, naam, piv, punten, { horen = [], greep = null, breed = 120, F = 0, slag = 0, takken = null, extra = null, prof = 'hefboom', krom = false } = {}) {
  const oud = b.huidig, A = b.P(prof), d = b.P('bus'), H = rad(slag), hoek = H * b.stand, c = Math.cos(hoek), s = Math.sin(hoek);
  const t = b.V.plaat, Pa = b.P('as'), da = Pa.b, Lg = LAGER[b.V.lager], kant = piv[0] < -1 ? -1 : 1;
  const rotDir = (q) => [q[0], q[1] * c - q[2] * s, q[1] * s + q[2] * c];
  const rot = (p) => add(piv, rotDir(sub(p, piv)));
  b.groep(naam);
  const bus = b.staaf(`Draaibus ${naam.toLowerCase()}`, 'bus', [piv[0] - breed / 2, piv[1], piv[2]], [piv[0] + breed / 2, piv[1], piv[2]], { kap: false, opm: 'naaf; 2 eindschijven erin gelast, spanstift Ø8 door naaf en as' });
  const Di = d.b - 2 * d.t;
  for (const e of [-1, 1]) { const x0 = piv[0] + e * (breed / 2 - 2); b.plaat('Eindschijf naaf', [Math.min(x0, x0 - e * 8), piv[1] - Di / 2, piv[2] - Di / 2], [Math.max(x0, x0 - e * 8), piv[1] + Di / 2, piv[2] + Di / 2], { rond: true, in: bus.id, gaten: [{ p: [x0 - e * 4, piv[1], piv[2]], d: da + 0.5 }], opm: `laserschijf Ø${Math.round(Di)} x 8, gat Ø${da} H8; in de naaf gelast` }); }
  // as: door oor, lagerbus, stelring en de aanslagnok aan de kant 'kant'
  const xe = breed / 2 + t, xb = xe + Lg.L - t, xn = xb + 12, La = 2 * (xn + 10 - 0);
  const as = b.staaf(`As ${naam.toLowerCase()}`, 'as', [piv[0] - La / 2, piv[1], piv[2]], [piv[0] + La / 2, piv[1], piv[2]], { kap: false, in: bus.id, opm: `rond Ø${da} h9 C45 (of S355J2), L = ${Math.round(La)}; gat Ø8 voor de spanstift, 2 stelringen DIN 705` });
  const arm = [], segs = [];
  for (const [k, tak] of (takken ?? [punten]).entries()) {
    // pro-vormtaal: de arm als één gebogen ovaalbuis (R = 3 x de hoogte); een rechte arm krijgt een lichte boog (pijl 6 %)
    if (krom) {
      const van = add(piv, mul(norm(sub(tak[0], piv)), d.b / 2 - 0.3)), pts = [van, ...tak];
      if (pts.length === 2) { const u = norm(sub(pts[1], pts[0])), L0 = Math.hypot(...sub(pts[1], pts[0])), q = norm(kruis([1, 0, 0], u)), up = q[2] >= 0 ? q : mul(q, -1); pts.splice(1, 0, add(mul(add(pts[0], pts[1]), 0.5), mul(up, 0.06 * L0))); }
      try {
        const nm = `Hefboomarm ${naam.toLowerCase()}${k ? ` (tak ${k + 1})` : ''}`;
        arm.push(b.buis(nm, prof, pts.map(rot), { R: 3 * A.h, vlak: rotDir([1, 0, 0]), opm: `vlakovaalbuis gebogen (R${3 * A.h}), naaf en schijfhouder erop gelast` }));
        const u0 = norm(sub(pts[1], pts[0]));
        if (breed >= A.b + 30) for (const sx of [-1, 1]) { const q0 = add(van, [sx * (A.b / 2 + 5), 0, 0]); b.staaf(`Schetsplaat ${naam.toLowerCase()}`, 's60x10', rot(q0), rot(add(q0, mul(u0, 140))), { v: X, kap: false, opm: 'schetsplaat 60 x 10 naast de arm, op de naaf en de arm gelast (vermoeiing)' }); }
        let vg = piv; for (const p of tak) { segs.push([vg, p]); vg = p; }
        continue;
      } catch { /* bocht past niet: rechte stukken met verstek */ }
    }
    let vorige = piv;
    for (const [i, p] of tak.entries()) {
      const van = i === 0 ? add(piv, mul(norm(sub(p, piv)), d.b / 2 - 0.3)) : vorige;
      const nm = `Hefboomarm ${naam.toLowerCase()}${k ? ` (tak ${k + 1})` : ''}${i ? ` (deel ${i + 1})` : ''}`;
      arm.push(b.staaf(nm, prof, rot(van), rot(p), { v: X, verstek: [i ? 20 : 0, i < tak.length - 1 ? 20 : 0] }));
      if (i === 0 && breed >= A.b + 30) { const u0 = norm(sub(p, piv)); for (const sx of [-1, 1]) { const q0 = add(van, [sx * (A.b / 2 + 5), 0, 0]); b.staaf(`Schetsplaat ${naam.toLowerCase()}`, 's60x10', rot(q0), rot(add(q0, mul(u0, 140))), { v: X, kap: false, opm: 'schetsplaat 60 x 10 naast de arm, op de naaf en de arm gelast (vermoeiing)' }); } }
      segs.push([vorige, p]); vorige = p;
    }
  }
  const h = [];
  for (const { p, dir, L = 260, vrij = false } of horen) {
    const seg = segs.reduce((m, q) => { const u = norm(sub(q[1], q[0])), tt = Math.max(0, Math.min(Math.hypot(...sub(q[1], q[0])), dot3(sub(p, q[0]), u))), e = Math.hypot(...sub(p, add(q[0], mul(u, tt)))); return e < m.e ? { e, u } : m; }, { e: Infinity, u: [0, 1, 0] }).u;
    const dd = norm(dir), axiaal = Math.abs(dot3(dd, seg)) > 0.7, start = vrij || axiaal ? p : add(p, mul(dd, (Math.abs(dd[0]) > 0.5 ? A.b : A.h) / 2));
    const rd = rotDir(dd), rs = rot(start), q = [1, 1, 1].map((_, i) => 50 * (1 - Math.abs(dd[i])));
    h.push(b.staaf('Schijfhouder', 'sleeve', rs, add(rs, mul(rd, L)), { opm: 'voor schijven Ø50; eindkap' }));
    const kr = b.plaat('Kraag schijfhouder', sub(start, q), add(add(start, mul(dd, 8)), q), { rond: true, opm: 'ronde kraag Ø100 x 8', in: 'schijfhouder' });
    if (hoek) { const g = kr.geo[0]; g.a = rot(g.a); g.b = rot(g.b); g.u = rotDir(g.u); g.v = rotDir(g.v); g.w = rotDir(g.w); }
  }
  let g = null;
  if (greep) g = b.staaf('Greep', 'greep', rot(greep[0]), rot(greep[1]), { opm: 'met rubber handvat (grip)' });
  if (extra) extra(rot, rotDir);
  // aanslagnok op de as (draait mee), radiaal, buiten de lagerbus
  const xN = piv[0] + kant * xn, an = Math.PI / 2, nokDir = rotDir([0, Math.cos(an), Math.sin(an)]);
  b.staaf(`Aanslagnok ${naam.toLowerCase()}`, 's24x8', add([xN, piv[1], piv[2]], mul(nokDir, da / 2 - 0.5)), add([xN, piv[1], piv[2]], mul(nokDir, 56)), { v: X, kap: false, in: as.id, opm: 'laserplaat 8 mm met gat Ø as, op de as gelast (tegen de stelring)' });
  b.groep(oud);
  // twee aanslagstrips met rubberbuffer op het lageroor: begin (stand 0) en einde (stand 1)
  const sg = Math.sign(H) || 1, dl = (22 + 9 + 9 + 2) * Math.PI / 180, xs0 = piv[0] + kant * xe, xs1 = piv[0] + kant * (xn + 6);
  for (const [nm, ang] of [['begin', an - sg * dl], ['einde', an + H + sg * dl]]) {
    const r0 = [0, Math.cos(ang), Math.sin(ang)], tg = [0, -Math.sin(ang), Math.cos(ang)], m = add(piv, mul(r0, 45));
    b.staaf(`Aanslag ${nm} ${naam.toLowerCase()}`, 's30x10', [xs0, m[1], m[2]], [xs1, m[1], m[2]], { v: tg, kap: false, opm: `strip 30 x 10 op het lageroor gelast; rubberbuffer 5 mm naar de nok (${nm}aanslag)` });
    const bf = add(m, mul(tg, (ang < an + H / 2 ? 1 : -1) * sg * 7.5));
    b.koop('buffer', 1, [balk([xs0 + kant * 4, bf[1], bf[2]], [xs1, bf[1], bf[2]], tg, 5, 24, false, 'rubber')], { naam: `Rubberbuffer ${nm}aanslag ${naam.toLowerCase()}` });
  }
  b.koop('spanstift', 1, [], { naam: `Spanstift DIN 1481 Ø8 x ${Math.round(d.b + 10)}: naaf en as ${naam.toLowerCase()}` });
  b.koop(da === 25 ? 'stelring25' : 'stelring30', 2, [-1, 1].map((e) => balk([piv[0] + e * (xb + 1), piv[1], piv[2]], [piv[0] + e * (xb + 11), piv[1], piv[2]], Y, da + 20, da + 20, true, 'zink')), { naam: `Stelring DIN 705 Ø${da}: as ${naam.toLowerCase()}` });
  b.pen(`As ${naam.toLowerCase()}`, piv, X, { d: da, lager: Lg.D, snedes: 2, a: oud, b: naam, uit: [0, -150, 120], F, factor: 'plateLoadedPen', lengte: La, t: Lg.L, gelast: as.naam });
  b.toets('Knelpunten', `Begin- en eindaanslag ${naam.toLowerCase()}`, `nok op de as tegen een rubberbuffer op het lageroor in stand 0 en in stand 1 (slag ${Math.abs(slag)}°): de hefboom valt niet door tot tegen het frame of de gebruiker`, 0, 'EN ISO 20957-2 §5.6 (eindaanslagen)', { oordeel: 'groen' });
  return { arm, h, g, rot, rotDir, as };
}
const dot3 = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
/** slede op twee rails (x = ±w/2) langs d (n = normaal naar boven). Per rail en per rolpositie: een looprol bovenop de
 *  rail en een tegenrol eronder (kogellager 6204 op een as Ø20 tussen twee wangen die met 6 mm speling naast de rail
 *  hangen = zijgeleiding), zodat de slede niet van de rail kan lichten. Eindstoppen met rubberbuffer onderaan (noodstop),
 *  en een veiligheidsgrendel: een getande strip op elke rail en een pal per kant op een grendelas met hendels.
 *  G = schijvenlast (kg) voor de assen en de grendel. */
function slede45(b, { p0, d, n, w, Pr, s0, s0min, Ls, liggers = [], G = 0, grendel = null }) {
  const Pl = b.P('licht'), zr = Pr.h / 2 + 24, zp = zr + 40, zs = zp + 10 + Pl.h / 2, zt = -Pr.h / 2 - 24;
  for (const s of [-1, 1]) {
    const es = add([s * w / 2, p0[1], p0[2]], mul(d, s0min - 58));
    b.staaf('Eindstop', 's80x10', add(es, mul(n, Pr.h / 2)), add(es, mul(n, Pr.h / 2 + 100)), { v: d, kap: false, opm: 'op de rail gelast; rubberbuffer 40x40 erop (M8): noodstop onder de laagste gebruiksstand' });
    const eb = add(es, mul(n, zp + 5));
    b.koop('buffer', 1, [balk(add(eb, mul(d, 5)), add(eb, mul(d, 45)), X, 40, 40, true, 'rubber')], { naam: 'Rubberbuffer eindstop slede' });
    if (grendel) {
      const xg = s * (w / 2 + Pr.b / 2 - 15), g0 = add([xg, p0[1], p0[2]], mul(d, grendel[0])), g1 = add([xg, p0[1], p0[2]], mul(d, grendel[1]));
      b.staaf('Grendelstrip', 's12x8', add(g0, mul(n, Pr.h / 2 + 6)), add(g1, mul(n, Pr.h / 2 + 6)), { v: X, kap: false, opm: 'getande strip 12 x 8 (laser): tand om de 60 mm, 6 mm diep; op de rail gelast aan de buitenrand' });
    }
  }
  const oud = b.huidig;
  b.groep('Slede');
  const P0 = (x, t, off) => add(add(add(p0, [x, 0, 0]), mul(d, s0 + t)), mul(n, off));
  const sl = [], wiel = [], assen = [];
  for (const s of [-1, 1]) {
    b.staaf('Rolplaat', 'pl10x150', P0(s * w / 2, 0, zp + 5), P0(s * w / 2, Ls, zp + 5), { v: n, kap: false, opm: 'draagt de sledebalk; de wangen eronder gelast' });
    sl.push(b.staaf('Sledebalk', 'licht', P0(s * w / 2, 0, zs), P0(s * w / 2, Ls, zs), { v: X }));
    for (const t of [70, Ls - 70]) {
      // één wang per kant van de rail, van onder de rail tot de rolplaat, met het gat van de looprol en van de tegenrol
      for (const k of [-1, 1]) b.staaf('Wang looprol', 's90x10', P0(s * w / 2 + k * (Pr.b / 2 + 11), t, zt - 35), P0(s * w / 2 + k * (Pr.b / 2 + 11), t, zp), { v: X, kap: false, gaten: [{ s: 35, d: 21, as: 'v' }, { s: zr - zt + 35, d: 21, as: 'v' }], opm: 'wang 90 x 10: gat Ø21 voor de tegenrol (onder de rail) en voor de looprol; 6 mm naast de rail (zijgeleiding); onder de rolplaat gelast' });
      for (const z of [zr, zt]) {
        const c = P0(s * w / 2, t, z), bw = z === zr ? 12 : 14; wiel.push(balk(add(c, [-bw, 0, 0]), add(c, [bw, 0, 0]), Y, 47, 47, true, 'katrol')); if (z === zt) wiel.push(null);
        assen.push(b.staaf(z === zr ? 'As looprol' : 'As tegenrol', 'r20', add(c, [-(Pr.b / 2 + 32), 0, 0]), add(c, [Pr.b / 2 + 32, 0, 0]), { kap: false, opm: 'rond Ø20 h9, 2 borgringen DIN 471' }));
      }
    }
  }
  for (const t of liggers) b.staaf('Sledeligger', 'licht', P0(-w / 2 + Pl.b / 2, t, zs), P0(w / 2 - Pl.b / 2, t, zs), { v: d });
  // grendel: pal per kant op een grendelas onder de rolplaat, hendels aan de buitenkant naar de gebruiker toe
  if (grendel) {
    const tg = 300, ng = zp - 27, xa = w / 2 + Pr.b / 2 + 22;
    b.staaf('Grendelas', 'r16', P0(-xa, tg, ng), P0(xa, tg, ng), { kap: false, opm: 'rond Ø16, draait in 4 oren; veer trekt de pallen naar de strip' });
    for (const s of [-1, 1]) {
      const xp = s * (w / 2 + Pr.b / 2 - 15);
      for (const k of [-1, 1]) b.staaf('Grendeloor', 's30x8', P0(xp + k * 12, tg, zp), P0(xp + k * 12, tg, ng - 27), { v: X, kap: false, gaten: [{ s: 27, d: 17, as: 'v' }], opm: 'oor onder de rolplaat, gat Ø17 voor de grendelas' });
      b.staaf('Grendelpal', 's30x8', P0(xp, tg, ng), P0(xp, tg + 10, Pr.h / 2 + 22), { v: X, kap: false, opm: 'pal op de grendelas gelast; valt in de tanden van de strip (6 mm)' });
      b.staaf('Handgreep grendel', 'r16', P0(s * xa, tg, ng), P0(s * xa, tg - 260, ng + 70), { kap: false, opm: 'hendel aan de grendelas gelast; rubber handvat' });
    }
    b.koop('veer', 2, [], { naam: 'Trekveer grendelpal (Ø12 x 60, 20 N)' });
    if (G) {
      const kf = b.V.klasse === 'H' ? 2.5 : 4, F = kf * 1.5 * G * 9.81 * Math.SQRT1_2 / 2, sp = F / (8 * 6);
      b.toets('Evenwicht', 'Veiligheidsgrendel: pal in de getande strip', `proeflast langs de rail ${kf} · 1,5 · ${G} kg · g · sin 45° / 2 pallen = ${(F / 1000).toFixed(2)} kN per pal; contact tand-pal 8 x 6 mm: σ = ${sp.toFixed(0)} N/mm² ≤ 1,5·fy = 352`, sp / 352, 'EN 1993-1-8 (stuik); EN ISO 20957-2 §5.6 (veiligheidsstop)');
    }
  }
  b.groep(oud);
  b.koop('looprolPU', wiel.length, wiel.filter(Boolean), { naam: 'Looprol Ø50 met PU-band op een 6204-2RS (1 als looprol, 2 naast elkaar als tegenrol), as Ø20' });
  b.koop('borgring20', 2 * assen.length, [], { naam: 'Borgring DIN 471 Ø20 (assen van de rollen)' });
  const Fas = G ? (G + 60) / 4 : 0;
  for (const s of [-1, 1]) for (const t of [70, Ls - 70]) for (const z of [zr, zt]) b.pen(`As ${z === zr ? 'looprol' : 'tegenrol'} ${s < 0 ? 'L' : 'R'}`, P0(s * w / 2, t, z), X, { d: 20, lengte: Pr.b + 64, snedes: 2, t: 10, a: 'Slede', b: 'Slede', F: z === zr ? Fas : Fas / 2, gelast: z === zr ? 'As looprol' : 'As tegenrol', factor: 'plateLoadedPen' });
  b.spleet('Slede - rail (wangen)', 6, { uitleg: 'de wangen lopen met 6 mm speling naast de rail, afgedekt door de rolplaat erboven', kap: true });
  return { P0, zs, zr, zt, sl, Pl };
}
/** schijven op een schijfhouder (alleen 3D) */
const schijvenOp = (b, h, n = 2, af = 20) => b.schijven(add(h.a, mul(h.u, af)), h.u, n);

export const PLATE = [
  {
    id: 'FP-01', soort: 'plate', naam: 'Leg press 45°', kort: 'Slede op twee schuine rails, 4 schijfhouders.',
    uitleg: 'Een slede met voetplaat rijdt op 8 kogellagers over twee rails op 45°. Ligstoel met vaste rugleuning (40°), veiligheidsgrendels aan beide kanten en eindstoppen met rubber.',
    spieren: 'quadriceps, bilspieren, hamstrings, kuiten', oefeningen: ['leg press', 'calf press', 'enkelbeens leg press'],
    maxLast: { thuis: 300, pro: 500 },
    markt: { thuis: [1000, 2500], pro: [3490, 8280], bronT: 'Tunturi LP60 € 999, ATX Leg Press 45 € 1299, Primal 3-in-1 ± € 1740, Maxxus € 1800, ATX 4inONE € 2499', bronP: 'Primal ISO Incline ± € 3490, Hammer Strength iso-lateral € 4153, Taurus Sterling € 4990, HS Linear ± € 7883' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, Pr = b.P('breed'), pl = b.P('bankLicht'), w = 640, G = this.maxLast[V.id];
      const d = [0, Math.cos(rad(45)), Math.sin(rad(45))], n = [0, -Math.sin(rad(45)), Math.cos(rad(45))];
      // voetframe: staande vlakovaalbuis als lus met ronde hoeken, een dwarsligger onder de stoel
      const { top: zv, F: Fo } = voetLus(b, w, 0, 2480, { staand: true });
      b.staaf('Dwarsligger', 'frameO', [-w / 2 + Fo.b / 2, 1000, Fo.h / 2], [w / 2 - Fo.b / 2, 1000, Fo.h / 2], { v: Y, opm: 'vlakovaalbuis tussen de zijden van het voetframe' });
      // twee rails op 45°: onderaan op een voorpaal, bovenaan op een achterpaal (vlakovaalbuis, op het voetframe)
      const p0 = [0, 1150, 380], Lr = 1600, rails = [];
      const s0 = 250 + 450 * b.stand, Ls = 650;
      for (const s of [-1, 1]) {
        const ra = [s * w / 2, p0[1], p0[2]];
        rails.push(b.staaf('Rail 45°', 'breed', ra, add(ra, mul(d, Lr)), { v: X, verstek: [45, 45], opm: 'bovenvlak vlak geslepen (looprail)' }));
        const top = add(ra, mul(d, Lr));
        b.staaf('Achterpaal', 'frameO', [s * w / 2, top[1] - Fo.h / 2 - 2, zv], [s * w / 2, top[1] - Fo.h / 2 - 2, top[2] - a / 2], { opm: 'vlakovaalbuis, de smalle kant naar voren' });
        b.staaf('Voorpaal', 'frameO', [s * w / 2, p0[1] + Fo.h / 2, zv], [s * w / 2, p0[1] + Fo.h / 2, p0[2] - a / 2], { opm: 'vlakovaalbuis' });
      }
      // slede met loop- en tegenrollen, noodstop onderaan en een veiligheidsgrendel (tanden van 350 tot 1000 mm)
      const S = slede45(b, { p0, d, n, w, Pr, s0, s0min: 250, Ls, liggers: [80, Ls - 50], G, grendel: [350, 1150] });
      const { P0, zs, zr, Pl, sl } = S;
      b.groep('Slede');
      const fp = b.staaf('Voetplaat', 'pl12x600', P0(-(w / 2 + 60), -6, zs - Pl.h / 2 + 300), P0(w / 2 + 60, -6, zs - Pl.h / 2 + 300), { v: d, kap: false, opm: 'plaat 12 mm haaks op de rails, randen 2 x gezet, antislip; tegen de kopse kant van de sledebalken en de ribben gelast' });
      const ribben = [-1, 1].map((s) => b.staaf('Rib voetplaat', 's140x10', P0(s * w / 2, 70, zs + Pl.h / 2), P0(s * w / 2, 70, zs - Pl.h / 2 + 600), { v: X, kap: false, opm: 'rib 140 x 10 achter de voetplaat, op de sledebalk en tegen de plaat gelast' }));
      const horen = [];
      for (const s of [-1, 1]) for (const t of [200, 520]) {
        const st = add(P0(s * w / 2, t, zs), [s * Pl.b / 2, 0, 0]);
        horen.push(b.staaf('Schijfhouder', 'sleeve', st, add(st, [s * 300, 0, 0]), { opm: 'mee met de slede; eindkap' }));
        b.plaat('Kraag schijfhouder', [st[0] + (s > 0 ? 0 : -8), st[1] - 50, st[2] - 50], [st[0] + (s > 0 ? 8 : 0), st[1] + 50, st[2] + 50], { rond: true, opm: 'ronde kraag Ø100 x 8, de houder erdoor en rondom gelast', in: 'schijfhouder' });
      }
      b.groep('frame');
      // de schijven beginnen voorbij de wangen en de rail (60 mm van de sledebalk)
      for (const h of horen) b.schijven(add(h.a, mul(h.u, 60)), h.u, 2);
      // stoel: zitting op een stoelpaal, rugleuning 40° naar achter op een rugsteun; beide op een middenligger
      b.staaf('Stoelligger', 'ligger', [0, Fo.b / 2, a / 2], [0, 1000 - Fo.b / 2, a / 2], { opm: 'van de voorkant van het voetframe tot de dwarsligger' });
      const zt = 410;
      staander(b, 'Stoelpaal', 'ligger', 0, 780, a, zt - pl.h);
      const zb = b.staaf('Zitbalk', 'bankLicht', [0, 600, zt - pl.h / 2], [0, 960, zt - pl.h / 2]);
      kussenOp(b, 'Zitting', zb, 360, 340, { op: 0 });
      const pb = b.P('bank'), dr = [0, -Math.cos(rad(40)), Math.sin(rad(40))], nr = [0, Math.sin(rad(40)), Math.cos(rad(40))], r0 = [0, 580, zt - pb.h / 2 - 5];
      const rug = b.staaf('Rugleuningbalk', 'bank', r0, add(r0, mul(dr, 650)), { v: X, verstek: [40, 0] });
      b.kussen('Rugleuning', add(add(r0, mul(dr, 110)), mul(nr, pb.h / 2)), add(rug.b, mul(nr, pb.h / 2)), nr, 360, 68);
      const rt = add(r0, mul(dr, 450));
      b.staaf('Rugsteun', 'ligger', [0, rt[1], a], [0, rt[1], rt[2] - pb.h / 2 / Math.cos(rad(40))], { opm: 'van de stoelligger tot onder de rugleuningbalk' });
      for (const s of [-1, 1]) b.buis('Handgreep', 'greep', [[s * (pl.b / 2), 760, zt - 17], [s * 245, 760, zt - 17], [s * 345, 700, zt + 35]], { opm: 'buis Ø32 gebogen: onder de zitting door, dan schuin naar buiten en omhoog (ergonomisch); rubber handvat' });
      void fp;
      b.reken('Rail tussen de palen (slede met schijven, per rail)', rails[0], 'ligger', Lr, 0, { g: G / 2 + 30, proef: 'plateLoaded' });
      b.reken('Schijfhouder', horen[0], 'uitkrager', 300, 0, { g: G / 4, proef: 'schijfhouder', las: true });
      b.reken('Sledebalk (voetplaat tot looprollen)', sl[0], 'ligger', Ls - 140, 0, { gk: V.gebruiker / 2, g: G / 2, proef: 'plateLoaded' });
      {
        const kf = V.klasse === 'H' ? 2.5 : 4, W = kf * 1.5 * G * 9.81 * Math.SQRT1_2, Lp = w, Mp = W * Lp / 8, Wp = 600 * 12 ** 2 / 6, sp = Mp / Wp;
        b.toets('Sterkte', 'Voetplaat tussen de ribben (12 mm, zwakke as)', `proeflast langs de rail ${kf} · 1,5 · ${G} kg · g · sin 45° = ${(W / 1000).toFixed(1)} kN; plaat over 2 ribben, L = ${Lp}: M = F·L/8 = ${(Mp / 1e6).toFixed(2)} kNm; W = 600·12²/6 = ${Wp}: σ = ${sp.toFixed(0)} N/mm² ≤ 235`, sp / 235, 'EN 1993-1-1 §6.2.5; proeflast EN ISO 20957-2');
        b.reken('Rib achter de voetplaat (halve proeflast, uitkragend tot het midden van de plaat)', ribben[0], 'uitkrager', 300, 0, { g: G / 2, proef: 'plateLoaded', las: true });
        // evenwicht van de slede: voetkracht langs de rail op hoogte hf boven de rail; tegenrollen nemen het lichten op
        const hf = zs - Pl.h / 2 + 300, t1 = 70, t2 = Ls - 70, Gn = (G + 60) * 9.81 * Math.SQRT1_2, tcg = 360;
        const Nup = (W * (hf - zr) + Gn * (tcg - t1)) / (t2 - t1), Nlow = Gn - Nup, lichten = Math.max(0, -Nlow), C0 = 2 * 6550;
        b.toets('Evenwicht', 'Slede op de rail: lichten van de onderste rollen', `voetkracht ${(W / 1000).toFixed(1)} kN langs de rail op ${Math.round(hf - zr)} mm boven de rolas; momenten rond de onderste rol: N boven = ${(Nup / 1000).toFixed(1)} kN, N onder = ${(Nlow / 1000).toFixed(1)} kN${lichten ? `: de onderste rollen lichten met ${(lichten / 1000).toFixed(1)} kN, 2 tegenrollen (elk 2 x 6204, C0 = 2 x 6,55 kN) nemen dat op` : ''}`, lichten / 2 / C0, 'evenwicht (statica); SKF 6204 C0r');
        const Mr = W * 350 / 2, rb = b.o.delen.find((x) => x.naam === 'Rugleuningbalk'), sr = Mr / rb.P.W;
        b.toets('Sterkte', 'Rugleuningbalk: reactie op de voetkracht (P2-14)', `de rug duwt bijna loodrecht op de rugleuning: ${(W / 1000).toFixed(1)} kN, verdeeld over 2 steunpunten op 350 mm: M = F·350/2 = ${(Mr / 1e6).toFixed(2)} kNm; ${rb.P.naam}: σ = M/W = ${sr.toFixed(0)} N/mm² ≤ 235`, sr / 235, 'EN 1993-1-1 §6.2.5 (AANNAME lastpunt op 350 mm)');
      }
      b.last('Gebruiker in de stoel', 100, [0, 700, 600], { geval: 'press' }); b.last('Slede met schijven (hoog)', G + 60, add(p0, mul(d, 1000)), { geval: 'press' });
      b.o.veiligheid = 'veiligheidsgrendel: getande strip op elke rail (tand om de 60 mm, van 350 tot 1150 mm) en een pal per kant op een grendelas met 2 hendels; noodstop met rubberbuffer onder de laagste gebruiksstand';
    },
  },
  {
    id: 'FP-02', soort: 'plate', naam: 'Hack squat', kort: 'Slede met rug- en schouderkussens op rails van 45°.',
    uitleg: 'Je staat op een schuine voetplaat met je rug tegen de slede; de slede met schouderkussens loopt op 8 looprollen over twee rails op 45°. Veiligheidshendel en eindstoppen.',
    spieren: 'quadriceps, bilspieren', oefeningen: ['hack squat', 'reverse hack squat', 'calf raise in de machine'],
    maxLast: { thuis: 200, pro: 350 },
    markt: { thuis: [1000, 1800], pro: [3250, 8280], bronT: 'ATX Compact Leg Press/Hack € 999, Taurus Hack-squat IFP € 1499, Maxxus 2-in-1 € 1800', bronP: 'Primal ISO Hack V-Squat ± € 3250, Hammer Strength Plate-Loaded Hack Squat ± € 7883' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, w = 560, G = this.maxLast[V.id], al = rad(45), d = [0, -Math.cos(al), Math.sin(al)], n = [0, Math.sin(al), Math.cos(al)];
      basis(b, w, 0, 1900, [150, 1850]);
      const p0 = [0, 1500, 300], Lr = 1600, rails = [], Ls = 800, s0 = 100 + 400 * b.stand;
      for (const s of [-1, 1]) {
        const ra = [s * w / 2, p0[1], p0[2]];
        rails.push(b.staaf('Rail 45°', 'ligger', ra, add(ra, mul(d, Lr)), { v: X, verstek: [45, 45], opm: 'bovenvlak vlak geslepen (looprail)' }));
        const top = add(ra, mul(d, Lr));
        b.staaf('Voorpaal', 'ligger', [s * w / 2, top[1] + a / 2 + 2, a], [s * w / 2, top[1] + a / 2 + 2, top[2] - a / 2], {});
        b.staaf('Achterpaal', 'ligger', [s * w / 2, p0[1] - a / 2, a], [s * w / 2, p0[1] - a / 2, p0[2] - a / 2], {});
      }
      // voetplaat vast onderaan, op twee steunen
      b.plaat('Voetplaat', [-350, 1550, 230], [350, 1950, 242], { opm: 'traanplaat 12 mm op twee steunen' });
      for (const s of [-1, 1]) b.staaf('Steun voetplaat', 'licht', [s * 250, 1600, a], [s * 250, 1600, 230], {});
      const S = slede45(b, { p0, d, n, w, Pr: P, s0, s0min: 100, Ls, liggers: [200, 760], G, grendel: [200, 1000] });
      const bl = b.P('bankLicht'), rbN = S.zs + S.Pl.h / 2 + bl.h / 2;
      b.groep('Slede');
      const rb = b.staaf('Rugbalk', 'bankLicht', S.P0(0, 80, rbN), S.P0(0, 760, rbN), { v: X, opm: 'op de twee sledeliggers' });
      b.kussen('Rugkussen', S.P0(0, 80, rbN + bl.h / 2), S.P0(0, 600, rbN + bl.h / 2), n, 340, 68);
      // schouderkussens: een dwarsligger bovenop de rugbalk met twee armen naar voren; de kussens wijzen naar beneden (op de schouders)
      const nd = rbN + bl.h;
      b.staaf('Schouderligger', 'bankLicht', S.P0(-200, 720, nd), S.P0(200, 720, nd), { v: d, opm: 'op de rugbalk gelast' });
      for (const s of [-1, 1]) {
        b.staaf('Schouderarm', 'bankLicht', S.P0(s * 130, 720, nd + bl.h / 2), S.P0(s * 130, 720, nd + bl.h / 2 + 200), { v: X, opm: 'op de schouderligger gelast; het kussen eronder (M8 in inslagmoeren)' });
        b.kussen('Schouderkussen', S.P0(s * 130, 720 - bl.h / 2, nd + bl.h / 2 + 60), S.P0(s * 130, 720 - bl.h / 2, nd + bl.h / 2 + 200), mul(d, -1), 120, 68);
      }
      const horen = [];
      for (const s of [-1, 1]) {
        const st = add(S.P0(s * w / 2, 120, S.zs), [s * S.Pl.b / 2, 0, 0]);
        horen.push(b.staaf('Schijfhouder', 'sleeve', st, add(st, [s * 300, 0, 0]), { opm: 'mee met de slede; eindkap' }));
        b.plaat('Kraag schijfhouder', [st[0] + (s > 0 ? 0 : -8), st[1] - 50, st[2] - 50], [st[0] + (s > 0 ? 8 : 0), st[1] + 50, st[2] + 50], { rond: true, opm: 'ronde kraag Ø100 x 8', in: 'schijfhouder' });
      }
      b.groep('frame');
      for (const h of horen) b.schijven(add(h.a, mul(h.u, 60)), h.u, 2);
      void rb;
      b.reken('Rail tussen de palen', rails[0], 'ligger', Lr, 0, { gk: V.gebruiker / 2, g: G / 2, proef: 'plateLoaded' });
      b.reken('Schijfhouder', horen[0], 'uitkrager', 300, 0, { g: G / 2, proef: 'schijfhouder', las: true });
      b.last('Gebruiker op de voetplaat', 100, [0, 1700, 1100], { geval: 'squat' }); b.last('Slede + schijven', G + 50, add(p0, mul(d, 900)), { geval: 'squat' });
      b.o.veiligheid = 'eindstoppen met rubber onderaan de rails (de slede rust erop in de laagste stand); veiligheidsgrendel: getande strip op elke rail en een pal per kant op een grendelas met 2 hendels';
    },
  },
  {
    id: 'FP-03', soort: 'plate', naam: 'Belt squat', kort: 'Hefboom met heupgordel boven een platform.',
    uitleg: 'Je staat op een platform en draagt een heupgordel aan een ketting aan de hefboom: geen druk op de rug. De hefboom draait achteraan; vooraan handgrepen.',
    spieren: 'quadriceps, bilspieren, adductoren', oefeningen: ['belt squat', 'belt squat march', 'deadlift met gordel'],
    maxLast: { thuis: 200, pro: 300 },
    markt: { thuis: [1000, 2200], pro: [2330, 6600], bronT: 'Taurus Belt Squat IFP € 999, ATX Belt Squat € 1580-1990', bronP: 'Primal commercial belt squat ± € 2330, Rogue Monster Rhino € 3046, Hammer Strength PL Belt Squat ± € 5656-6284' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, w = 1000, G = this.maxLast[V.id], A = b.P('hefboom');
      // hefboom draait achteraan laag bij de vloer en loopt tussen de voeten door naar voren; de schijven zitten op een
      // dwarsligger vóór het platform (buiten de benen). Het gordeloog staat in de sleuf van het platform: aanhaken op
      // platformhoogte, 500 mm heupweg.
      const piv = [0, 1650, a + 66], Ah = b.P(pro(b) ? 'k120x80x5' : 'k100x50x4').h;
      const B = basis(b, w, -350, 1850, [-300, piv[1] + 65 + a / 2]);
      for (const s of [-1, 1]) {
        const pl = b.staaf('Platformligger', 'ligger', [s * (45 + a / 2), 150, a / 2], [s * (45 + a / 2), 850, a / 2], { opm: 'langs de sleuf' });
        voetjes(b, pl, 2);
        for (const y of [200, 800]) b.staaf('Platformdwars', 'ligger', [s * (45 + a), y, a / 2], [s * (w / 2 - a / 2), y, a / 2], { opm: 'tussen de vloerrail en de platformligger' });
        b.plaat('Platform', [s * 45, 150, a], [s * (w / 2 - a / 2), 850, a + 8], { opm: 'traanplaat 8 mm; sleuf 90 mm in het midden voor de hefboom en het gordeloog' });
      }
      lagerBok(b, piv, 1, a);
      const ye = 500, Le = piv[1] - ye, eind = [0, -150, 280], Lp = Math.hypot(piv[1] - eind[1], piv[2] - eind[2]), ratio = Lp / Le;
      const hb = hefboom(b, 'Hefboom', piv, [[0, 50, piv[2]], eind], {
        horen: [{ p: [280, eind[1], eind[2]], dir: [1, 0, 0], L: 200, vrij: true }, { p: [-280, eind[1], eind[2]], dir: [-1, 0, 0], L: 200, vrij: true }], breed: 120, F: G * ratio, slag: -26, prof: pro(b) ? 'k120x80x5' : 'k100x50x4',
        extra: (rot, rotDir) => {
          b.staaf('Hoornligger', 'hefboom', rot([-280, eind[1], eind[2]]), rot([280, eind[1], eind[2]]), { v: rotDir(Y), opm: 'dwarsligger aan het einde van de hefboom; de schijfhouders erop' });
          b.staaf('Gordeloog', 's80x15', rot([0, ye, piv[2] + Ah / 2]), rot([0, ye, piv[2] + Ah / 2 + 80]), { v: rotDir(X), kap: false, gaten: [{ s: 45, d: 20, as: 'v' }], opm: 'laserplaat 15 mm, gat Ø20 voor de schakel van de gordelketting; op de hefboom gelast' });
        },
      });
      for (const s of [-1, 1]) { staander(b, 'Handgreeppaal', 'licht', s * (w / 2), 500, a, 980); b.staaf('Handgreep', 'greep', [s * (w / 2 - b.P('licht').b / 2), 500, 950], [s * 330, 500, 950], { opm: 'handgreep naast de heup' }); }
      for (const h of hb.h) schijvenOp(b, h, 2);
      {
        const kf = V.klasse === 'H' ? 2.5 : 4, F = kf * 1.5 * G * ratio * 9.81, An = (80 - 20) * 15, sn = F / An, Fb = 1.5 * 15 * 20 * 235;
        b.toets('Sterkte', 'Gordeloog: netto doorsnede en stuik', `proeflast ${kf} · 1,5 · ${G} kg · ${ratio.toFixed(2)} (hefboom ${Math.round(Lp)}/${Le}) · g = ${(F / 1000).toFixed(1)} kN; netto (80 - 20) · 15 = ${An} mm²: σ = ${sn.toFixed(0)} N/mm² ≤ 235; stuik 1,5·t·d·fy = ${(Fb / 1000).toFixed(1)} kN`, Math.max(sn / 235, F / Fb), 'EN 1993-1-1 §6.2.3; EN 1993-1-8 tabel 3.4');
      }
      b.reken('Hefboomarm (tussen gordeloog en schijven, doorlopend: geen las bij het oog)', hb.arm[0], 'uitkrager', Lp - Le, 0, { g: G, proef: 'plateLoaded' });
      b.reken('Schijfhouder', hb.h[0], 'uitkrager', 260, 0, { g: G / 2, proef: 'schijfhouder', las: true });
      b.last('Gebruiker op het platform', 100, [0, 500, 1000], { geval: 'squat' }); b.last('Schijven', G, [0, eind[1], eind[2]], { geval: 'squat' });
      void B;
    },
  },
  {
    id: 'FP-04', soort: 'plate', naam: 'Chest press iso-lateraal', kort: 'Twee aparte hefbomen met hoge as en greep voor de borst.',
    uitleg: 'Zitting en rugleuning; twee aparte hefbomen hangen aan een as in een portaal boven de gebruiker en komen met de greep voor de borst; de greep loopt naar voren en licht omhoog. Elke arm heeft een schijfhouder tussen as en greep.',
    spieren: 'borst, voorste schouder, triceps', oefeningen: ['chest press', 'enkelarmige chest press'],
    maxLast: { thuis: 160, pro: 250 },
    markt: { thuis: [800, 1600], pro: [2490, 5420], bronT: 'Taurus Seated Chest Press IFP € 799, ATX Chest Press € 1299-1450, Tunturi Platinum Chest Press PL € 1599', bronP: 'Taurus Iso Chest Press Sterling € 2490, Hammer Strength Iso-Lateral Bench Press € 5420' },
    bouw(b) { isoMachine(b, this, 'chest'); },
  },
  {
    id: 'FP-05', soort: 'plate', naam: 'Seated row met borststeun', kort: 'Iso-laterale roeimachine met borstkussen.',
    uitleg: 'Je zit met je borst tegen een kussen en trekt twee aparte hefbomen naar je toe. De as zit vooraan boven; de schijfhouders hangen aan de armen.',
    spieren: 'midden van de rug, brede rugspier, biceps, achterste schouder', oefeningen: ['seated row', 'enkelarmige row'],
    maxLast: { thuis: 160, pro: 250 },
    markt: { thuis: [900, 1500], pro: [2490, 4220], bronT: 'Taurus Seated Row IFP € 899, Steelflex PLSR € 1295, Tunturi Platinum Seated Row PL € 1499', bronP: 'Taurus Iso Low Row Sterling € 2490, Hammer Strength Iso-Lateral Row ± € 4220' },
    bouw(b) { isoMachine(b, this, 'row'); },
  },
  {
    id: 'FP-06', soort: 'plate', naam: 'T-bar row met borststeun', kort: 'Schuin borstkussen, hefboom met dwarsgreep.',
    uitleg: 'Je staat op een voetplaat en ligt met je borst op een schuin kussen. De hefboom draait vooraan bij de vloer en loopt naar achter tot onder het kussen, met een dwarsgreep onder de schouders en de schijven aan het einde.',
    spieren: 'midden van de rug, brede rugspier, biceps', oefeningen: ['chest supported T-bar row'],
    maxLast: { thuis: 150, pro: 220 },
    markt: { thuis: [500, 1200], pro: [1300, 2330], bronT: 'ATX T-Bar Row € 499-677, Taurus T-Bar Row € 699, Tunturi Platinum Adj. T-bar Row € 1199', bronP: 'Taurus Incline Row/T-Bar Sterling € 1299, Primal Club Incline T-Bar Row ± € 2330' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, G = this.maxLast[V.id], w = 480, bl = b.P('bankLicht'), A = b.P('hefboom');
      basis(b, w, 0, 1750, [100, 1300, 1700]);
      // de hefboom draait vooraan bij de vloer en loopt naar achter tot onder het borstkussen; de schijven zitten aan het
      // einde onder het kussen, de dwarsgreep ervoor (onder de schouders); je staat achteraan op de voetplaat
      const piv = [0, 160, a + 80], ho = [0, 1000, 600], yg = 850, sl = (ho[2] - piv[2]) / (ho[1] - piv[1]);
      lagerOren(b, piv, 120, [0, 0, a]);
      const zg = piv[2] + sl * (yg - piv[1]) - (A.h / 2) / Math.cos(Math.atan(sl)) - 15;
      const hb = hefboom(b, 'Hefboom', piv, [ho], { horen: [{ p: ho, dir: [0, 1, sl], L: 225 }], breed: 120, greep: [[-280, yg, zg], [280, yg, zg]], F: G, slag: 12 });
      // borstkussen: twee kussenpalen (x = ±160) met een kussendrager; het kussen loopt 40° op naar voren
      const pa = staander(b, 'Kussenpaal', 'ligger', -160, 1300, a, 820), pb = staander(b, 'Kussenpaal', 'ligger', 160, 1300, a, 820);
      ligger(b, 'Kussendrager', 'ligger', pa, pb, { z: 820 - a / 2 });
      const al = rad(40), dd = [0, -Math.cos(al), Math.sin(al)], n = [0, Math.sin(al), Math.cos(al)];
      const kb = b.staaf('Kussenbalk', 'bankLicht', [0, 1300, 820], add([0, 1300, 820], mul(dd, 450)), { v: X, verstek: [40, 0], opm: 'op de kussendrager gelast' });
      b.kussen('Borstkussen', add(kb.a, mul(n, bl.h / 2)), add(kb.b, mul(n, bl.h / 2)), n, 320, 68);
      b.plaat('Voetplaat', [-250, 1420, a], [250, 1670, a + 8], { opm: 'traanplaat 8 mm op de vloerrails' });
      schijvenOp(b, hb.h[0], 2);
      b.reken('Hefboomarm (de schijven zitten 170 mm voorbij de greep)', hb.arm[0], 'uitkrager', 200, 0, { g: G, proef: 'plateLoaded', las: true });
      b.reken('Schijfhouder', hb.h[0], 'uitkrager', 225, 0, { g: G, proef: 'schijfhouder', las: true });
      b.last('Gebruiker op het kussen', 100, [0, 1200, 1000], { geval: 'row' }); b.last('Schijven', G, [0, 1050, 620], { geval: 'row' });
    },
  },
  {
    id: 'FP-07', soort: 'plate', naam: 'Seated calf raise', kort: 'Kniekussen op een hefboom, voetblok en zitting.',
    uitleg: 'Je zit met je knieën onder een kussen op de hefboom en duwt met de voorvoet op een blok omhoog. De hefboom loopt naast de zitting en draait vooraan; een kniearm steekt over de knieën en de schijfhouder wijst achteraan naar buiten, weg van de gebruiker.',
    spieren: 'kuiten (soleus)', oefeningen: ['seated calf raise', 'tibialis raise (omgekeerd)'],
    maxLast: { thuis: 120, pro: 200 },
    markt: { thuis: [400, 500], pro: [1160, 2470], bronT: 'ATX Seated Calf Raise € 399, Taurus Seated Calf Raise IFP € 499', bronP: 'Primal PL Seated Calf ± € 1160, Hammer Strength PL Seated Calf ± € 2117-2352' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, G = this.maxLast[V.id], w = 760, A = b.P('hefboom');
      // de hefboom loopt links naast de zitting; een kniearm steekt over de knieën met het kniekussen eronder;
      // de schijfhouder zit achteraan op de hefboom en wijst naar buiten (weg van de gebruiker)
      const piv = [-280, 120, 740];
      basis(b, w, 0, 1150, [piv[1] - 65 - a / 2, 490, 700]);
      lagerBok(b, piv, -1, a);
      const hb = hefboom(b, 'Hefboom', piv, [[-280, 950, 740]], { horen: [{ p: [-280, 950, 740], dir: [-1, 0, 0], L: 260 }], breed: 120, F: G, slag: 15 });
      b.groep('Hefboom');
      const ka = b.staaf('Kniearm', 'hefboom', hb.rot([-280 + A.b / 2, 470, 740]), hb.rot([170, 470, 740]), { v: hb.rotDir(Y), opm: 'tegen de hefboom gelast; kniekussen eronder (4 x M8 in inslagmoeren)' });
      b.kussen('Kniekussen', hb.rot([-170, 470, 740 - A.h / 2]), hb.rot([170, 470, 740 - A.h / 2]), hb.rotDir([0, 0, -1]), 120, 60);
      b.groep('frame');
      b.plaat('Voetblok', [-200, 420, a], [200, 560, a + 90], { opm: 'blok: koker 140x90 met antislip bovenop, op de dwarsligger' });
      staander(b, 'Zitpaal', 'ligger', 0, 700, a, 400);
      const zb = b.staaf('Zitbalk', 'bankLicht', [0, 600, 400 + b.P('bankLicht').h / 2], [0, 860, 400 + b.P('bankLicht').h / 2]);
      kussenOp(b, 'Zitting', zb, 300, 320, { op: 0 });
      schijvenOp(b, hb.h[0], 2);
      b.reken('Hefboomarm (van het kniekussen tot de schijven)', hb.arm[0], 'uitkrager', 480, 0, { g: G, proef: 'plateLoaded', las: true });
      b.reken('Kniearm (gebruiker duwt met de knieën)', ka, 'uitkrager', 450, 0, { g: G * 0.42, proef: 'plateLoaded', las: true });
      b.reken('Schijfhouder', hb.h[0], 'uitkrager', 260, 0, { g: G, proef: 'schijfhouder', las: true });
      b.last('Gebruiker', 100, [0, 700, 700], { geval: 'calf' }); b.last('Schijven', G, [-400, 950, 740], { geval: 'calf' });
    },
  },
  {
    id: 'FP-08', soort: 'plate', naam: 'Pulldown iso-lateraal', kort: 'Twee hefbomen boven het hoofd, dijkussen.',
    uitleg: 'Zitting met dijkussen; twee aparte hefbomen draaien op een as achteraan boven. Je trekt de grepen naar beneden; de schijven zitten achter de as.',
    spieren: 'brede rugspier, biceps', oefeningen: ['iso-lateral pulldown', 'enkelarmige pulldown'],
    maxLast: { thuis: 160, pro: 240 },
    markt: { thuis: [1200, 1700], pro: [2490, 4340], bronT: 'Taurus Lat Pulldown IFP € 1199, Tunturi Platinum Wide Lat Pulldown PL € 1699', bronP: 'Taurus Iso Lat-Pulldown Sterling € 2490, Primal ISO Front Pulldown ± € 4190, Hammer Strength ± € 4340' },
    bouw(b) { isoMachine(b, this, 'pulldown'); },
  },
  {
    id: 'FP-09', soort: 'plate', naam: 'Schouderdrukmachine', kort: 'Iso-laterale schouderpers met rechte rugleuning.',
    uitleg: 'Zitting en rugleuning (80°); twee aparte hefbomen draaien op een as achter de rugleuning op schouderhoogte, zodat de grepen bijna recht omhoog gaan. De schijfhouders zitten op de armen vóór de as.',
    spieren: 'schouders, triceps', oefeningen: ['shoulder press', 'enkelarmige press'],
    maxLast: { thuis: 120, pro: 200 },
    markt: { thuis: [1000, 1500], pro: [2290, 4340], bronT: 'Taurus Seated Shoulder Press IFP € 999, Tunturi Platinum Shoulder Press PL € 1499', bronP: 'Taurus Iso Shoulder Press Sterling € 2290, Primal ISO ± € 2330, Hammer Strength ± € 4135' },
    bouw(b) { isoMachine(b, this, 'shoulder'); },
  },
  {
    id: 'FP-10', soort: 'plate', naam: 'Hip thrust machine', kort: 'Rugkussen en een heupkussen op een hefboom.',
    uitleg: 'Je ligt met je bovenrug op een kussen; een hefboom met heupkussen draait vooraan bij de vloer. Schijfhouders aan weerszijden van de hefboom, voetplaat vooraan.',
    spieren: 'bilspieren, hamstrings', oefeningen: ['hip thrust', 'glute bridge'],
    maxLast: { thuis: 200, pro: 300 },
    markt: { thuis: [1000, 1500], pro: [1500, 5150], bronT: 'Taurus Hip Thrust IFP € 999, Tunturi Platinum Hip Thrust PL € 1399-1499', bronP: 'Taurus Iso Hip Thruster Sterling € 1499, Primal Standing Hip Thrust ± € 1980, Hammer Strength Glute Drive ± € 4416-4907' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, G = this.maxLast[V.id], w = 640;
      basis(b, w, 0, 1500, [180 - 65 - a / 2, 1200, 1420]);
      const rb = b.staaf('Rugkussenligger', 'ligger', [-w / 2 + a / 2, 1200, 420], [w / 2 - a / 2, 1200, 420], { v: Y });
      for (const s of [-1, 1]) staander(b, 'Poot rugkussen', 'ligger', s * 200, 1200, a, 420 - P.h / 2);
      kussenOp(b, 'Rugkussen', rb, w - a, 260, { op: 0, n: Z });
      const piv = [0, 180, 300];
      lagerBok(b, piv, -1, a);
      const hb = hefboom(b, 'Hefboom', piv, [[0, 850, 520]], { horen: [{ p: [0, 750, 485], dir: [1, 0, 0] }, { p: [0, 750, 485], dir: [-1, 0, 0] }], breed: 120, F: G, slag: 20 });
      b.groep('Hefboom');
      const nh = norm([0, -0.31, 0.95]), hp = (x) => hb.rot(add([x, 850, 520], mul(nh, b.P('hefboom').h / 2 + 1)));
      b.kussen('Heupkussen', hp(-200), hp(200), hb.rotDir(nh), 160, 80);
      b.groep('frame');
      b.plaat('Voetplaat', [-300, 260, a], [300, 560, a + 8], { opm: 'traanplaat 8 mm, op twee dwarsstrips' });
      for (const y of [290, 530]) b.staaf('Dwarsstrip voetplaat', 's50x8', [-w / 2 + a / 2, y, a / 2], [w / 2 - a / 2, y, a / 2], { v: Z, opm: 'tussen de vloerrails' });
      for (const h of hb.h) schijvenOp(b, h, 2);
      b.reken('Hefboomarm (tussen as en heupkussen, schijven ertussen)', hb.arm[0], 'ligger', 560, 0, { g: G, proef: 'plateLoaded' });
      b.reken('Rugkussenligger', rb, 'ligger', 400, 0, { gk: V.gebruiker * 0.5, proef: 'extrinsiek' });
      b.last('Gebruiker', 100, [0, 900, 600], { geval: 'thrust' }); b.last('Schijven', G, [0, 750, 600], { geval: 'thrust' });
    },
  },
  {
    id: 'FP-11', soort: 'plate', naam: 'Smithmachine', kort: 'Geleide stang op twee stangen Ø25 met lineaire lagers.',
    uitleg: 'Een stalen kader met twee verticale geleidestangen Ø25 h6; de stang rijdt op 4 lineaire lagers. Haken om de stang op te hangen in elke positie (draaien), verstelbare eindstoppen en een optrekstang.',
    spieren: 'benen, borst, schouders', oefeningen: ['smith squat', 'bankdrukken', 'shoulder press', 'calf raise', 'hip thrust'],
    maxLast: { thuis: 160, pro: 250 },
    markt: { thuis: [700, 1500], pro: [3500, 7820], bronT: 'Taurus MS3 Smith € 699, Gorilla Smith met Half Rack € 850, Taurus MS20 Pro € 1499', bronP: 'BodyCraft Jones Commercial € 3499, Taurus Elite € 3999, Hammer Strength Vertical Smith ± € 7442' },
    bouw(b) {
      const V = b.V, S = b.P('staander'), a = S.b, H = 2200, wi = 1300, xs = wi / 2 + a / 2, G = this.maxLast[V.id], st = {};
      for (const [k, x] of [['L', -xs], ['R', xs]]) {
        b.groep('frame');
        const v = b.staaf('Voetbalk', 'voet', [x, 0, a / 2], [x, 1100, a / 2]);
        voetjes(b, v, 2);
        st[k] = { v, f: staander(b, 'Staander voor', 'staander', x, 250, a, H), b: staander(b, 'Staander achter', 'staander', x, 850, a, H) };
        ligger(b, 'Bovenligger zijkant', 'ligger', st[k].f, st[k].b, { z: H - a / 2 });
        ligger(b, 'Onderligger zijkant', 'ligger', st[k].f, st[k].b, { z: a + 40 + a / 2 });
      }
      ligger(b, 'Optrekstang', 'stang', st.L.f, st.R.f, { z: H - 70 }, { bout: true, groep: 'Optrekstang' });
      ligger(b, 'Bovenligger achter', 'ligger', st.L.b, st.R.b, { z: H - a / 2 - 55 }, { bout: true, groep: 'Bovenligger achter' });
      dwarsOp(b, 'Onderligger achter', 'ligger', st.L.v, st.R.v, 1000);
      // geleidestangen Ø25 h6 tussen de onderligger en de bovenligger van elke zijkant, met een klemblok boven en onder
      const yg = 550, xg = xs, rp = pro(b) ? 15 : 12.5, zs = 1250 + rp + 30.5, Lb = b.P('r60'), yb = yg - (24.15 + Lb.b / 2);
      for (const [k, x] of [['L', -xg], ['R', xg]]) {
        b.koop('stang25', 1, [balk([x, yg, 2 * a + 40], [x, yg, H - a], X, 25, 25, true, 'chroom')], { naam: `Geleidestang Ø25 h6, ${H - 3 * a - 40} mm`, meter: (H - 3 * a - 40) / 1000 });
        for (const [z0, z1, nm] of [[2 * a + 40, 2 * a + 48, 'onder'], [H - a - 8, H - a, 'boven']]) b.plaat(`Stangklem ${k} ${nm}`, [x - 40, yg - 40, z0], [x + 40, yg + 40, z1], { gaten: [{ p: [x, yg, z0], d: 25 }], opm: 'klemblok 80 x 80 x 8: gat Ø25 H7, zaagsnede en M8-klembout' });
        b.koop('boutM8', 2, [], { naam: `Klembout M8 stangklemmen ${k}` });
        b.koop('stopring', 2, [600, zs - 260].map((z) => balk([x, yg, z], [x, yg, z + 30], Y, 50, 50, true, 'rubber')), { naam: `Stopring Ø25 met rubber (klembaar) op de geleidestang ${k}` });
        // haakstrip met de haakpennen, in het vlak van de haak (achter de geleidestang)
        const sx = Math.sign(x), xi = x - sx * (a / 2);
        b.plaat(`Haakstrip ${k}`, [Math.min(xi, xi - sx * 10), 590, a + 40 + a], [Math.max(xi, xi - sx * 10), 650, H - a], { opm: 'strip 60 x 10 tegen de binnenkant van de zijliggers gelast' });
        for (let z = 450; z <= 1750; z += 100) b.staaf('Haakpen', pro(b) ? 'r30' : 'r25', [xi - sx * 10, 620, z], [xi - sx * 45, 620, z], { kap: false, opm: 'pen waar de haak op valt, in de haakstrip gelast' });
      }
      b.groep('Slede');
      for (const x of [-xg, xg]) {
        b.staaf('Lagerhuis', 'b48x8', [x, yg, zs - 100], [x, yg, zs + 100], { kap: false, opm: 'buis 48,3x8 uitgedraaid Ø40 H7 voor 2 x LM25UU (Ø40 x 58), borgringen DIN 472' });
        b.staaf('Lagerblok', 'r60', [x - 50, yb, zs], [x + 50, yb, zs], { kap: false, opm: `gedraaid uit rond Ø60, boring Ø${b.P('stang').b + 5} H7 voor 2 flensglijlagers; tegen het lagerhuis gelast` });
      }
      b.groep('Stang smith');
      const D = b.P('stang');
      const sb = b.staaf('Halterstang smith', 'stang', [-(xg + 60), yb, zs], [xg + 60, yb, zs], { in: 'lagerblok', opm: `massief ${D.naam}${pro(b) ? ' S355J2' : ''} met kartel; draait in de lagerblokken` });
      if (pro(b)) sb.P = { ...sb.P, fy: 355, naam: 'rond Ø38 S355J2' };
      const horen = [-1, 1].map((s) => b.staaf('Schijfhouder', 'sleeve', [s * (xg + 60), yb, zs], [s * (xg + 360), yb, zs], { opm: 'op het uiteinde van de stang gelast' }));
      for (const [k, s] of [['L', -1], ['R', 1]]) {
        const xh = s * (xs - a / 2 - 30);
        b.staaf(`Haak smith ${k}`, 's60x10', [xh, yb, zs], [xh, 640, zs], { v: X, kap: false, opm: 'haak 60 x 10 aan de stang gelast; draai de stang een kwartslag en de haak valt op de haakpen' });
      }
      b.groep('frame');
      b.koop(V.lineair, 4, [], { naam: `${V.lineair === 'lm25' ? 'Lineair lager LM25UU' : 'Lineaire glijbus igus RJUM-01-25'} (Ø40 x 58) in de lagerhuizen` });
      b.koop(V.lager === 'glij25' ? 'glij35' : 'glij38', 4, [], { naam: 'Flensglijlager voor de stang in de lagerblokken' });
      for (const s of [-1, 1]) b.schijven([s * (xg + 80), yb, zs], [s, 0, 0], 2);
      b.reken('Halterstang (schijven buiten het lagerblok, per kant)', sb, 'uitkrager', 210, 0, { g: G / 2, proef: 'vanghaak' });
      b.reken('Haak smith (stang hangt aan 2 haken)', b.o.delen.find((d) => d.naam === 'Haak smith L'), 'uitkrager', 640 - yb, 0, { g: G / 2, proef: 'vanghaak', las: true });
      b.reken('Haakpen (stang hangt aan 2 haken)', b.o.delen.find((d) => d.naam === 'Haakpen'), 'uitkrager', 25, 0, { g: G / 2, proef: 'vanghaak', las: true });
      void horen;
      b.last('Gebruiker', 100, [0, 400, 1000], { geval: 'squat' }); b.last('Stang + schijven', G + 20, [0, yg, zs], { geval: 'squat' });
      b.o.veiligheid = 'haken aan de stang die op een haakpen vallen (om de 100 mm, 450-1750 mm); 2 klembare stopringen met rubber op elke geleidestang';
    },
  },
  {
    id: 'FP-12', soort: 'plate', naam: 'Leg extension / leg curl (schijven)', kort: 'Combinatie beenstrekker en -buiger met schijfhouder.',
    uitleg: 'Een zitbank met rugleuning en een hefboom op kniehoogte met twee rollen: met de voorste rol strek je, met de achterste (dijklem op) buig je. De hefboom heeft twee takken op de as: één naar de rollen en één naar voren met de schijfhouder opzij, die bij het strekken omhoog gaat.',
    spieren: 'quadriceps, hamstrings', oefeningen: ['leg extension', 'leg curl zittend'],
    maxLast: { thuis: 80, pro: 120 },
    markt: { thuis: [740, 1170], pro: [2290, 4110], bronT: 'ATX Leg Combo Chair € 736, ATX BCO-680 € 899-1168, Taurus IFP € 799-899', bronP: 'Taurus Iso Leg Extension € 2290, Leg Curl Sterling € 2490, Primal PL ± € 2330, Hammer Strength ± € 3914' },
    bouw(b) {
      const V = b.V, P = b.P('ligger'), a = P.b, G = this.maxLast[V.id], w = 460;
      basis(b, w, 0, 1250, [150, 380 - 65 - a / 2, 650, 900, 1150]);
      const vl = null;
      const zp = staander(b, 'Zitpaal', 'ligger', 0, 650, a, 410);
      const zb = b.staaf('Zitbalk', 'bankLicht', [0, 450, 410 + b.P('bankLicht').h / 2], [0, 820, 410 + b.P('bankLicht').h / 2]);
      kussenOp(b, 'Zitting', zb, 380, 320, { op: 0 });
      const rp = staander(b, 'Rugpaal', 'bank', 0, 900, a, 1050);
      b.kussen('Rugleuning', [0, 900 - b.P('bank').h / 2, 560], [0, 900 - b.P('bank').h / 2, 1050], [0, -1, 0], 320, 68);
      const piv = [0, 380, 560];
      const [lp] = lagerBok(b, piv, -1, a);
      // twee takken op de as: naar beneden naar de rol (scheen), en horizontaal naar voren met de schijfhouder opzij
      // (strekken = de tak met de schijven gaat omhoog); de schijven beginnen voorbij de lagerbok
      const hb = hefboom(b, 'Hefboom', piv, null, { takken: [[[0, 330, 120]], [[0, 100, 560]]], horen: [{ p: [0, 100, 560], dir: [1, 0, 0], L: 300 }], breed: 120, F: G, slag: -80 });
      const rol = hb.rot([0, 330, 120]);
      b.staaf('As rol', 'as', [-200, rol[1], rol[2]], [200, rol[1], rol[2]], { groep: 'Hefboom', kap: false, in: 'hefboom' });
      b.koop(V.schuimrol, 2, [-1, 1].map((s) => balk([s * 30, rol[1], rol[2]], [s * 230, rol[1], rol[2]], X, 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100' });
      for (const s of [-1, 1]) b.staaf('Handgreep', 'greep', [s * (a / 2), 650, 380], [s * 280, 650, 380], {});
      schijvenOp(b, hb.h[0], 2, 160);
      b.reken('Hefboomtak met schijfhouder', hb.arm[1], 'uitkrager', 280, 0, { g: G, proef: 'plateLoaded', las: true });
      void vl; void zp; void rp; void lp; void piv;
      b.reken('Hefboomarm', hb.arm[0], 'uitkrager', 450, 0, { g: G, proef: 'plateLoaded', las: true });
      b.reken('Lagerpaal', lp, 'staanderM', 560, 0, { g: G / 2, proef: 'plateLoaded', e: 100, las: true });
      b.last('Gebruiker', 100, [0, 650, 700], { geval: 'been' }); b.last('Schijven (hoog)', G, [0, 500, 400], { geval: 'been' });
    },
  },
];

/** iso-laterale machines met twee hefbomen: chest, row, pulldown, shoulder. De as zit in lageroren onder een portaal
 *  (portaal 'boven': ligger 80 mm boven de as; 'achter': ligger achter de as op ashoogte, zodat de armen vrij naar voren
 *  draaien). hoek = de slag in graden bij stand 1 (+ = de voorkant zakt). */
function isoMachine(b, def, soort) {
  const V = b.V, P = b.P('ligger'), a = P.b, G = def.maxLast[V.id], w = 900, half = G / 2;
  const cfg = {
    chest: { piv: [0, 750, 1950], zit: [700, 450], rug: [960, 80], greep: [0, 420, 1050], hoorn: [0, 400, 1350], hoek: -25, binnen: 150, portaal: 'boven' },
    row: { piv: [0, 350, 1950], zit: [900, 480], borst: [650, 1000], greep: [0, 560, 1050], hoorn: [0, 700, 1600], hoek: 25, binnen: 180, portaal: 'boven', takken: true },
    pulldown: { piv: [0, 1410, 1740], zit: [600, 480], dijk: [335, 640], greep: [0, 450, 1800], hoorn: [0, 1760, 1500], hoek: 41, binnen: 150, portaal: 'boven', takken: true },
    shoulder: { piv: [0, 1500, 1250], zit: [700, 480], rug: [960, 80], greep: [0, 720, 1300], hoorn: [0, 1100, 1330], hoek: -35, binnen: 150, portaal: 'achter' },
  }[soort];
  const yp = cfg.piv[1], zp = cfg.piv[2], A = b.P('hefboom');
  // voetframe: gesloten lus in vlakovaalbuis met ronde hoeken (pro-vormtaal), middenligger in de lengte
  const Fo = b.P('frameO'), boven = cfg.portaal !== 'achter';
  // portaal boven: de ligger hoog genoeg voor de arm (spleet ≥ 25 mm) en voor een lagerschild met uitsparing (≥ 170)
  const hp = Math.max(80, A.h / 2 + 35, 170), ypt = boven ? yp : yp + 65 + Fo.b / 2, zt = boven ? zp + hp + Fo.h / 2 : zp;
  let y1 = Math.max(1500, ypt + 100, cfg.hoorn[1] + 250);
  let y0 = 0; const Rl = 3 * Fo.h, Rb = 3 * Fo.h, horens = [0, rad(cfg.hoek)].map((ag) => { const dy = cfg.hoorn[1] - yp, dz = cfg.hoorn[2] - zp; return [yp + dy * Math.cos(ag) - dz * Math.sin(ag), zp + dy * Math.sin(ag) + dz * Math.cos(ag)]; });
  // de zijboog blijft uit de buurt van de schijven in beide eindstanden (schijf Ø450 + marge)
  const kant = (ys) => ys >= y0 + Rl + 70 && ys <= y1 - Rl - 70 && Math.abs(ys - ypt) >= Rb + Fo.b && horens.every(([yh, zh]) => Math.abs(ys - yh) >= 380 && ((yh - ys) * (yh - ypt) > 0 || zt - Fo.h / 2 - zh >= 300));
  const vrij = (ys) => Math.abs(ys - ypt) >= Rb + Fo.b && horens.every(([yh, zh]) => Math.abs(ys - yh) >= 380 && ((yh - ys) * (yh - ypt) > 0 || zt - Fo.h / 2 - zh >= 300));
  const kand = [450, -450, 600, -600, 800, -800, 1000].map((dd) => ypt + dd).filter(kant);
  // anders: het voetframe naar voren verlengen (korte boog vóór de as), of als laatste de boog achter de schijven
  const voor = [-450, -600].map((dd) => ypt + dd).filter((q) => q - Rl - 80 >= -650 && vrij(q));
  const ys = kand[0] ?? voor[0] ?? Math.max(ypt + Rb + Fo.b + 30, ...horens.map(([yh]) => yh + 400));
  if (!kand.length && voor.length) y0 = Math.min(0, ys - Rl - 80);
  else if (!kand.length) y1 = Math.max(y1, ys + Rl + 80); // het voetframe langer maken tot de boog op het rechte stuk staat
  voetLus(b, w, y0, y1);
  const vl = b.staaf('Middenligger', 'ligger', [0, y0 + Fo.h / 2, a / 2], [0, y1 - Fo.h / 2, a / 2], { opm: 'tussen de voor- en achterkant van het voetframe; draagt de zitpaal' });
  // portaal: twee gebogen ovaalbuizen (zijboog) die van het voetframe opstijgen en naar de ligger boven de as buigen
  const yEind = ypt + (Math.sign(ys - ypt) * Fo.b) / 2, bogen = [-1, 1].map((sx) => b.buis('Portaalboog', 'frameO', [[(sx * w) / 2, ys, Fo.b], [(sx * w) / 2, ys, zt], [(sx * w) / 2, yEind, zt]], { R: Rb, opm: `vlakovaalbuis, 1 bocht 90° R${Rb}; onderaan op het voetframe gelast, bovenaan tegen de portaalligger` }));
  const pt = b.staaf('Portaalligger', 'frameO', [-w / 2 - Fo.b / 2, ypt, zt], [w / 2 + Fo.b / 2, ypt, zt], { v: Y, opm: 'vlakovaalbuis, hoogte verticaal; de lagerschilden eronder (of ervoor) gelast' });
  // zitting
  // zitting in hoogte verstelbaar (P2-13): binnenkoker met 4 gaten om de 45 mm in de zitpaal, veerpen
  const zTop = cfg.zit[1] - 73 - b.P('bankLicht').h, ro = pro(b) ? 'k100x100x4' : 'k80x80x4', ri = pro(b) ? 'k80x80x4' : 'k60x60x3', zo = zTop - 120;
  const zp1 = staander(b, 'Zitpaal', ro, 0, cfg.zit[0], a, zo, { gaten: [{ s: zo - a - 40, d: V.pin + 1, as: 'v' }] });
  b.groep('Zitting');
  const zb0 = a + 5, s0 = zo - 40 - zb0;
  b.staaf('Zitpaal binnenkoker', ri, [0, cfg.zit[0], zb0], [0, cfg.zit[0], zTop], { in: zp1.id, gaten: Array.from({ length: Math.min(4, Math.floor((zTop - zb0 - 40 - s0) / 45) + 1) }, (_, q) => ({ s: s0 + q * 45, d: V.pin + 1, as: 'v' })), opm: `schuift in de zitpaal; 4 gaten Ø${V.pin + 1} om de 45 mm: zitting in 4 standen (± 70 mm)` });
  const zb = b.staaf('Zitbalk', 'bankLicht', [0, cfg.zit[0] - 200, cfg.zit[1] - 73 - b.P('bankLicht').h / 2], [0, cfg.zit[0] + 200, cfg.zit[1] - 73 - b.P('bankLicht').h / 2]);
  kussenOp(b, 'Zitting', zb, 380, 340, { op: 0 });
  b.groep('frame');
  b.pen('Veerpen zitting', [0, cfg.zit[0], zo - 40], X, { d: V.pin, key: V.pin25, snedes: 2, t: zp1.P.t, a: 'frame', b: 'Zitting', uit: [160, 0, 0], F: V.gebruiker, factor: 'extrinsiekPen', lengte: zp1.P.b + 40 });
  if (cfg.rug) { staander(b, 'Rugpaal', 'bank', 0, cfg.rug[0], a, 1200); b.kussen('Rugleuning', [0, cfg.rug[0] - b.P('bank').h / 2, 560], [0, cfg.rug[0] - b.P('bank').h / 2, 1200], [0, -1, 0], 320, 68); }
  if (cfg.borst) { staander(b, 'Kussenpaal', 'bank', 0, cfg.borst[0], a, cfg.borst[1] + 250); b.kussen('Borstkussen', [0, cfg.borst[0] + b.P('bank').h / 2, cfg.borst[1] - 150], [0, cfg.borst[0] + b.P('bank').h / 2, cfg.borst[1] + 250], [0, 1, 0], 300, 68); }
  if (cfg.dijk) { const dp = staander(b, 'Dijkpaal', 'bank', 0, cfg.dijk[0], a, cfg.dijk[1]); b.staaf('As dijkrollen', 'as', [-200, cfg.dijk[0], cfg.dijk[1] - 20], [200, cfg.dijk[0], cfg.dijk[1] - 20], { kap: false, in: dp.id }); b.koop(V.schuimrol, 2, [-1, 1].map((s) => balk([s * 40, cfg.dijk[0], cfg.dijk[1] - 20], [s * 240, cfg.dijk[0], cfg.dijk[1] - 20], X, 100, 100, true, 'leer')), { naam: 'Schuimrol Ø100 (dijklem)' }); }
  const arms = [];
  for (const [k, s] of [['L', -1], ['R', 1]]) {
    const piv = [s * 260, yp, zp];
    lagerOren(b, piv, 120, boven ? [0, 0, zp + hp] : [0, yp + 65, 0], undefined, boven ? { d: [0, 0, 1], H: hp } : { d: [0, 1, 0], H: 65 });
    const g0 = [s * 260, cfg.greep[1], cfg.greep[2]], ho = [s * 260, cfg.hoorn[1], cfg.hoorn[2]];
    // greep schuin naar binnen en iets naar de gebruiker (± 20°): ergonomische polshoek
    const opt = { horen: [{ p: ho, dir: [s, 0, 0], L: 260 }], breed: 120, greep: [[s * 260 - (s * A.b) / 2, g0[1], g0[2]], [s * cfg.binnen, g0[1] - 30, g0[2] + 40]], F: half, slag: cfg.hoek, krom: true };
    const hb = cfg.takken ? hefboom(b, `Hefboom ${k}`, piv, null, { ...opt, takken: [[g0], [ho]] }) : hefboom(b, `Hefboom ${k}`, piv, [ho, g0], opt);
    arms.push(hb);
    schijvenOp(b, hb.h[0], 2);
  }
  void vl; void zp1;
  b.reken('Portaalboog (gebogen ovaalbuis, x 1,3 aan de binnenkant van de bocht, Winkler R/h = 3)', bogen[0], 'uitkrager', Math.abs(ys - ypt), 0, { g: (G / 2) * 1.3, proef: 'plateLoaded', las: true });
  b.reken('Hefboomarm (moment van de schijven rond de as)', arms[0].arm[cfg.takken ? 1 : 0], 'uitkrager', Math.hypot(cfg.hoorn[1] - yp, cfg.hoorn[2] - zp), 0, { g: half, proef: 'plateLoaded', las: true });
  b.reken('Schijfhouder', arms[0].h[0], 'uitkrager', 260, 0, { g: half, proef: 'schijfhouder', las: true });
  b.reken('Portaalligger (beide hefbomen)', pt, 'ligger', w - a, 0, { g: G, proef: 'plateLoaded' });
  b.last('Gebruiker', 100, [0, cfg.zit[0], 800], { geval: 'iso' }); b.last('Schijven op beide armen', G, [0, cfg.hoorn[1], cfg.hoorn[2]], { geval: 'iso' });
}
export { lagerOren, hefboom, gat, sub, kruis };
