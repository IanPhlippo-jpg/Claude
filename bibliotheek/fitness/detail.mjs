// Afwerkdetails voor de 3D, de miniaturen en de tekeningen (geen stuklijstposities, wel zichtbaar): elk gat als donker
// schijfje op elk wandvlak waar het doorgaat (door 1 of 2 wanden), flensglijlagers in de lageroren, eindkappen op open
// koker- en buisuiteinden en op de schijfhouders, rubber handvatten en kartel op de stangen, naden en het multiplex
// van de kussens, en het typeplaatje (EN ISO 20957-1) op de grootste staander. Node en browser.
import { balk, add, mul, sub, norm, cross, dot, standaardV } from './model.mjs';
import { gaten } from './controle.mjs';

const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];
const neg = (v) => v.map((x) => -x);

/** alle details van een toestel als balken (kleur 'gat', 'rubber', 'naad', 'kartel', 'uhmw', 'hout', 'typeplaat') */
export function details(o) {
  const uit = [];
  // 1. gaten: een donker schijfje (Ø van het gat) op elk wandvlak; bij een koker door 2 wanden aan beide kanten
  for (const g of gaten(o)) {
    if (g.d < 5) continue;
    const pts = g.deel.soort === 'plaat' || g.door !== 1 ? g.punten : [g.punten[0]];
    for (const p of pts) {
      const uitw = norm(sub(p, g.p)), q = len(uitw) > 0.5 ? uitw : g.as;
      const diep = Math.min(6, g.deel.soort === 'plaat' ? g.deel.t / 2 : (g.deel.P?.t ?? 3) + 2);
      uit.push(balk(add(p, mul(q, -diep)), add(p, mul(q, 0.4)), standaardV(q), g.d, g.d, true, 'gat', { gat: true }));
      uit.push(balk(add(p, mul(q, 0.2)), add(p, mul(q, 0.5)), standaardV(q), g.d + 2.5, g.d + 2.5, true, 'gatrand'));
    }
    // flensglijlager in een lageroor: witte kraag rond het gat aan beide kanten
    if (/Lageroor/.test(g.deel.naam)) for (const p of g.punten) { const q = norm(sub(p, g.p)); uit.push(balk(p, add(p, mul(q, 2)), standaardV(q), g.d + 12, g.d + 12, true, 'uhmw')); }
  }
  for (const d of o.delen) {
    if (d.soort !== 'staaf') continue;
    const P = d.P, rond = P.vorm === 'buis' || P.vorm === 'rond';
    // 2. eindkappen op open uiteinden (zwart, 3 mm)
    (d.kappen ?? []).forEach((open, k) => {
      if (!open) return;
      const e = k ? d.b : d.a, r = k ? d.u : neg(d.u);
      uit.push(balk(e, add(e, mul(r, 3)), d.v, P.b + (rond ? 1 : 0.6), P.h + (rond ? 1 : 0.6), rond, 'eindkap', P.ovaal ? { r: P.b / 2 + 0.3 } : P.vorm === 'koker' ? { r: 2 * P.t + 0.3 } : {}));
    });
    // eindkap op de schijfhouder (rubber, met kraag)
    if (/^Schijfhouder/.test(d.naam) && !(d.kappen ?? [])[1]) uit.push(balk(d.b, add(d.b, mul(d.u, 6)), d.v, P.b + 4, P.b + 4, true, 'rubber'));
    // 3. rubber handvat (grip) op de vrije uiteinden van grepen, kartel op de stangen
    if (/^(Greep|Handgreep)/.test(d.naam)) {
      const L = d.L, ends = L > 450 ? [0, 1] : [1];
      // grip (rubber, of de accentkleur op een grendelhendel) met een eindkap op het vrije uiteinde
      const kl = /grendel/i.test(d.naam) ? 'accent' : 'rubber';
      for (const k of ends) { const e = k ? d.b : d.a, r = k ? neg(d.u) : d.u, l = Math.min(130, L * 0.6); uit.push(balk(add(e, mul(r, 4)), add(e, mul(r, 4 + l)), d.v, P.b + 6, P.b + 6, true, kl, { grip: true })); }
      for (const k of ends) { const e = k ? d.b : d.a, r = k ? d.u : neg(d.u); if ((d.kappen ?? [true, true])[k]) uit.push(balk(add(e, mul(r, -2)), add(e, mul(r, 6)), d.v, P.b + 9, P.b + 9, true, 'eindkap')); }
    }
    if (/^(Optrekstang|Dipstang|Halterstang)/.test(d.naam)) {
      const L = d.L, l = Math.min(160, L * 0.2);
      for (const t of [0.25, 0.75]) { const c = add(d.a, mul(d.u, t * L)); uit.push(balk(add(c, mul(d.u, -l / 2)), add(c, mul(d.u, l / 2)), d.v, P.b + 0.6, P.b + 0.6, true, 'kartel')); }
    }
    // 4. draaibus of lagerhuis: flens van het glijlager aan beide uiteinden
    if (/^(Draaibus|Lagerhuis|Kniesteunbus)/.test(d.naam)) for (const [e, r] of [[d.a, neg(d.u)], [d.b, d.u]]) uit.push(balk(e, add(e, mul(r, 2.5)), d.v, P.b + 10, P.b + 10, true, 'uhmw'));
  }
  // 5. kussens: naad rondom 22 mm van de rand en het multiplex dat onderaan zichtbaar is
  for (const k of o.kussens) {
    const g = k.geo[0], u = g.u, v = norm(cross(k.n, u)), n = k.n, L = k.L, B = k.breedte, top = add(g.a, mul(n, k.dikte / 2 + 0.3));
    const s0 = add(top, mul(u, 22)), s1 = add(top, mul(u, L - 22));
    for (const s of [-1, 1]) uit.push(balk(add(s0, mul(v, s * (B / 2 - 22))), add(s1, mul(v, s * (B / 2 - 22))), v, 2, 0.8, false, 'naad'));
    for (const t of [22, L - 22]) { const c = add(top, mul(u, t)); uit.push(balk(add(c, mul(v, -(B / 2 - 22))), add(c, mul(v, B / 2 - 22)), u, 2, 0.8, false, 'naad')); }
    // bies (piping) rondom op de bovenrand: de naad tussen het bovenvlak en de zijkant van het kussen
    const zb = add(g.a, mul(n, k.dikte / 2 - 9)), rb = 4.5;
    if (L > 120 && B > 120) {
      for (const s of [-1, 1]) uit.push(balk(add(add(zb, mul(v, s * (B / 2 - 3.5))), mul(u, 28)), add(add(zb, mul(v, s * (B / 2 - 3.5))), mul(u, L - 28)), v, rb * 2, rb * 2, true, 'bies'));
      for (const t of [3.5, L - 3.5]) { const c = add(zb, mul(u, t)); uit.push(balk(add(c, mul(v, -(B / 2 - 28))), add(c, mul(v, B / 2 - 28)), u, rb * 2, rb * 2, true, 'bies')); }
    }
    const bot = add(g.a, mul(n, -k.dikte / 2 - 0.4));
    // onderkant: het multiplex is bekleed (kunstleer rondom geniet), alleen de rand van de bekleding is zichtbaar
    if (L > 60 && B > 60) uit.push(balk(add(bot, mul(u, 25)), add(bot, mul(u, L - 25)), v, B - 50, 0.8, false, 'eindkap'));
  }
  // 6. assen en pennen zonder eigen kooponderdeel (as van een looprol, hefboomas, gelaste pen niet): verzinkte as met
  // sluitring en borgmoer (of borgveer) aan beide uiteinden, zodat elke as in zijn gat zichtbaar is
  for (const pn of o.pennen) {
    if (pn.key || pn.gelast || !pn.lengte) continue;
    const sv = standaardV(pn.as), e0 = add(pn.p, mul(pn.as, -pn.lengte / 2)), e1 = add(pn.p, mul(pn.as, pn.lengte / 2));
    uit.push(balk(e0, e1, sv, pn.d, pn.d, true, 'zink'));
    for (const [e, r] of [[e0, pn.as], [e1, neg(pn.as)]]) uit.push(balk(add(e, mul(r, 2)), add(e, mul(r, 5)), sv, pn.d + 8, pn.d + 8, true, 'ring'));
  }
  // 7. gatnummers naast de Westside-gaten (gelaserd/gezeefdrukt, zoals bij merkracks): van onder naar boven, op beide vlakken
  for (const d of o.delen) {
    if (d.soort !== 'staaf' || !d.westside || d.P.vorm !== 'koker') continue;
    const ws = d.gaten.filter((g) => g.as === 'w' && g.d === d.westside.d).sort((p, q) => p.s - q.s), vlak = d.P.b / 2 - 2 * d.P.t;
    const op = d.u[2] >= 0 ? d.u : neg(d.u);
    ws.forEach((g, i) => {
      const bw = Math.min(12, vlak - g.d / 2 - 2), dv = (g.d / 2 + vlak) / 2;
      if (bw < 7) return;
      for (const sg of [1, -1]) { const n = mul(d.w, sg), p = add(add(d.a, mul(d.u, g.s)), add(mul(n, d.P.h / 2 + 0.35), mul(d.v, dv))), zij = norm(cross(n, op)); uit.push(balk(add(p, mul(op, -bw / 2)), add(p, mul(op, bw / 2)), zij, bw, 0.3, false, 'nummer', { nr: i + 1 })); }
    });
  }
  // 6. typeplaatje op de buitenkant van de langste staande koker (EN ISO 20957-1 §7)
  const tp = typeplaatPlek(o);
  // instructieplaat (oefeningen en spieren) boven het typeplaatje, als ze niet al op de stapelkap zit
  if (tp && !o.instructieOpKap && tp.deel.soort === 'staaf') {
    const ih = Math.round(tp.w * 2.1), d = tp.deel, z1 = Math.max(d.a[2], d.b[2]), c = add(tp.c, mul(tp.op, tp.h / 2 + 25 + ih / 2));
    if (Math.abs(tp.op[2]) < 0.5 || c[2] + ih / 2 < z1 - 30) { o.instructie = { c, h: ih }; uit.push(balk(add(c, mul(tp.op, -ih / 2)), add(c, mul(tp.op, ih / 2)), tp.zij, tp.w, 1, false, 'instructie')); }
  }
  if (tp) { o.typeplaat = tp; uit.push(balk(add(tp.c, mul(tp.op, -tp.h / 2)), add(tp.c, mul(tp.op, tp.h / 2)), tp.zij, tp.w, 1, false, 'typeplaat'), balk(add(tp.c, mul(tp.op, tp.h / 2 - 14)), add(tp.c, mul(tp.op, tp.h / 2 - 4)), tp.zij, tp.w - 8, 1.4, false, 'naad')); }
  return uit;
}
const len = (v) => Math.hypot(...v);

/** de plek van het typeplaatje: de langste staande koker van het frame, aan de buitenkant, op 0,6-1,3 m */
export function typeplaatPlek(o) {
  const [mn, mx] = o.box, cx = (mn[0] + mx[0]) / 2;
  const kokers = o.delen.filter((d) => d.soort === 'staaf' && d.P.vorm === 'koker' && d.L > 250 && Math.min(d.P.b, d.P.h) >= 40);
  const staand = kokers.filter((d) => Math.abs(d.u[2]) > 0.99).sort((a, b) => (b.groep === 'frame') - (a.groep === 'frame') || b.L - a.L);
  const d = staand[0] ?? kokers.filter((x) => Math.abs(x.u[2]) < 0.3).sort((a, b) => (b.groep === 'frame') - (a.groep === 'frame') || b.L - a.L)[0];
  if (!d) return plaatPlek(o);
  const staat = Math.abs(d.u[2]) > 0.99, op = staat ? Z : d.u;
  const m = mul(add(d.a, d.b), 0.5), buiten = Math.abs(m[0] - cx) > 30 ? Math.sign(m[0] - cx) : 0;
  // de vlakken van de koker: kies het zijvlak dat het meest naar buiten (of naar voren) wijst, niet naar boven of onder
  const wens = buiten ? [buiten, 0, 0] : [0, -1, 0];
  const vl = [d.v, neg(d.v), d.w, neg(d.w)].filter((q) => Math.abs(q[2]) < 0.5).sort((p, q) => dot(q, wens) - dot(p, wens))[0];
  if (!vl) return null;
  const opV = Math.abs(dot(vl, d.v)) > 0.9, half = opV ? d.P.b / 2 : d.P.h / 2, breed = opV ? d.P.h : d.P.b;
  const w = Math.max(40, breed - 8), h = Math.round(w * 1.42);
  let c;
  if (staat) { const z0 = Math.min(d.a[2], d.b[2]), z1 = Math.max(d.a[2], d.b[2]), z = Math.min(z1 - h / 2 - 40, Math.max(z0 + h / 2 + 40, 1000)); c = [m[0], m[1], z]; }
  else c = m;
  c = add(c, mul(vl, half + 0.6));
  return { deel: d, c, n: vl, op, zij: norm(cross(vl, op)), w, h };
}
/** geen koker: op de grootste plaat, tegen de rand (muurplaat, voetplaat) */
function plaatPlek(o) {
  const p = o.delen.filter((d) => d.soort === 'plaat').sort((a, b) => b.l * b.bmaat - a.l * a.bmaat)[0];
  if (!p) return null;
  const n = [0, 0, 0]; n[p.as.t] = p.as.t === 1 ? -1 : 1;
  const op = [0, 0, 0]; op[p.as.l] = 1;
  const zij = [0, 0, 0]; zij[p.as.b] = 1;
  const w = Math.max(40, Math.min(74, p.bmaat - 20)), h = Math.round(w * 1.42);
  const m = p.mn.map((x, i) => (x + p.mx[i]) / 2);
  const c = add(add(m, mul(n, p.t / 2 + 0.6)), mul(op, p.l / 2 - h / 2 - 15));
  return { deel: p, c, n, op, zij: norm(cross(n, op)), w, h };
}
export { X, Y };
